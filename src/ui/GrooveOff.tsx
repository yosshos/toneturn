// Groove-off (DRUMS_NICHE_PLAN §3, P2): the asynchronous drum duel. The drum level from the ladder sets the tier; the
// same seeded three grooves for both players, each a measured take (DrillTake → analyzeDrumTake). With a signed-in
// friend and the server's groove duels it is a friend duel; otherwise a local challenge code carries the seed and the
// points (the friend plays the code and sends a reply code). Fits one phone screen per phase.
import '../drumGames.css';
import { useEffect, useMemo, useState } from 'react';
import type { DrillCalibration, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { decodeGrooveCode, drumLevel, encodeGrooveCode, grooveOffRounds, grooveRunDetail, grooveWinner, newGrooveSeed, scoreGrooveRound, tempoReached, type GrooveScore } from '../engine/grooveOff';
import { seedTier } from '../engine/gameTiers';
import { inputLatency } from '../engine/latency';
import type { Settings } from '../storage/progress';
import type { ItemState } from '../engine/drills/types';
import { midi } from '../speech/midi';
import { createGrooveDuel, myGrooveDuels, submitGrooveDuel, type GrooveDuelRow } from '../cloud/grooveOff';
import { listFriends } from '../cloud/social';
import { DrillTake } from './DrillTake';
import { DEFAULT_CAL, DrillScore, drillSettingsOf } from './Drills';

type Lang = 'he' | 'en';
type Bi = { en: string; he: string };
const TX = {
  title: { en: 'Groove-off', he: 'קרב גרובים' },
  back: { en: 'Back', he: 'חזרה' },
  blurb: { en: 'Three grooves, the same for you and a friend. Each take is measured: the verdict, every limb’s time, the tempo.', he: 'שלושה גרובים, אותם לכם ולחבר. כל טייק נמדד: התוצאה, הזמן של כל גפה, הטמפו.' },
  level: { en: 'Your drum level', he: 'רמת התופים שלכם' },
  done: { en: 'groove levels done', he: 'שלבי גרוב שהושלמו' },
  toNext: { en: 'to the next', he: 'עד הבאה' },
  newCode: { en: 'New challenge (code)', he: 'אתגר חדש (קוד)' },
  enter: { en: 'Play a friend’s code', he: 'לנגן קוד של חבר' },
  code: { en: 'Challenge code', he: 'קוד אתגר' },
  go: { en: 'Play', he: 'לנגן' },
  bad: { en: 'Not a Groove-off code.', he: 'זה לא קוד של קרב גרובים.' },
  challenge: { en: 'Challenge', he: 'לאתגר' },
  round: { en: 'Round', he: 'סבב' },
  next: { en: 'Next round', he: 'לסבב הבא' },
  finish: { en: 'See the result', he: 'לתוצאה' },
  you: { en: 'You', he: 'אתם' },
  them: { en: 'Them', he: 'הם' },
  win: { en: 'You win', he: 'ניצחתם' },
  lose: { en: 'They win', he: 'הם ניצחו' },
  tie: { en: 'A tie', he: 'תיקו' },
  send: { en: 'Send this code to your friend', he: 'שלחו את הקוד לחבר' },
  reply: { en: 'Send this reply code back', he: 'שלחו את קוד התשובה בחזרה' },
  sent: { en: 'Sent to your friend’s duels.', he: 'נשלח לדו־קרבות של החבר.' },
  copy: { en: 'Copy', he: 'להעתיק' },
  copied: { en: 'Copied', he: 'הועתק' },
  tempo: { en: 'tempo reached', he: 'טמפו שהושג' },
  again: { en: 'Done', he: 'סיום' },
  duels: { en: 'Groove duels', he: 'דו־קרבות גרוב' },
  wait: { en: 'waiting', he: 'ממתין' },
};
const LIMB: Record<string, Bi> = { RH: { en: 'RH', he: 'י״י' }, LH: { en: 'LH', he: 'י״ש' }, RF: { en: 'kick', he: 'קיק' }, LF: { en: 'hat foot', he: 'רגל' } };

type Play = { seed: number; duelId?: string; theirs?: number[]; theirsTotal?: number | null; reply: boolean };

export function GrooveOff({ lang, settings, items, signedIn, onExit, onResult }: { lang: Lang; settings: Settings; items: Record<string, ItemState>; signedIn: boolean; onExit: () => void; onResult: (r: { score: number; detail: Record<string, unknown> }) => void }) {
  const tx = (o: Bi) => o[lang];
  const ds = useMemo(() => ({ ...drillSettingsOf(settings), instrument: 'drums' as const }), [settings]);
  const level = useMemo(() => drumLevel(items, ds.keyOrder), [items, ds.keyOrder]);
  const cal: DrillCalibration = { ...DEFAULT_CAL, ...(settings.drillCal ?? {}), latencyMs: inputLatency(settings, midi.devices.length ? 'midi' : 'mic') };
  const [play, setPlay] = useState<Play | null>(null);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<GrooveScore[]>([]);
  const [res, setRes] = useState<{ m: TakeMetrics; s: GrooveScore } | null>(null);
  const [beat, setBeat] = useState(-1);
  const [ended, setEnded] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phones, setPhones] = useState<boolean | undefined>(settings.headphones);
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<GrooveDuelRow[]>([]);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!signedIn) return;
    void listFriends()
      .then((fs) => setFriends(fs.filter((f) => f.relation === 'friend').map((f) => ({ id: f.user_id, name: f.name }))))
      .catch(() => undefined);
    void myGrooveDuels().then(setRows);
  }, [signedIn, ended]);
  const rounds = useMemo(() => (play ? grooveOffRounds(play.seed) : []), [play]);
  const g = rounds[round];

  const begin = (p: Play) => {
    setPlay(p);
    setRound(0);
    setScores([]);
    setRes(null);
    setEnded(false);
    setSent(false);
    setCopied(false);
  };
  const challenge = async (friend: string) => {
    const seed = newGrooveSeed(level.tier);
    const d = await createGrooveDuel(friend, seed).catch(() => null);
    // No server groove duels yet: the same challenge as a local code.
    begin(d ? { seed: d.seed, duelId: d.id, reply: false } : { seed, reply: false });
  };
  const done = (m: TakeMetrics, _p: PlayedNote[]) => {
    setBeat(-1);
    const s = scoreGrooveRound(g, m);
    setRes({ m, s });
    setScores((xs) => [...xs, s]);
  };
  const next = () => {
    setRes(null);
    if (round + 1 < rounds.length) return setRound((x) => x + 1);
    const sum = grooveRunDetail(play!.seed, scores);
    onResult(sum);
    if (play?.duelId) void submitGrooveDuel(play.duelId, scores.map((s) => s.points)).then((x) => setSent(x !== null));
    setEnded(true);
  };
  const head = (
    <header className="screen-head">
      <button className="icon-btn" onClick={play && !ended ? () => setPlay(null) : onExit} aria-label={tx(TX.back)}>
        <span className="flip-rtl">←</span>
      </button>
      <h1>{tx(TX.title)}</h1>
    </header>
  );

  if (play && ended) {
    const mine = scores.map((s) => s.points);
    const total = mine.reduce((a, b) => a + b, 0);
    const theirs = play.theirs;
    const w = theirs ? grooveWinner(mine, theirs, rounds) : null;
    const tempo = tempoReached(rounds, scores);
    const shareCode = encodeGrooveCode({ seed: play.seed, points: mine });
    return (
      <main className="panel-screen dg-screen go-screen" data-groove-off="end">
        {head}
        <section className="set-card dg-end" data-go-total={total}>
          {theirs ? (
            <>
              <p className="dg-big" dir="ltr">
                {total} : {theirs.reduce((a, b) => a + b, 0)}
              </p>
              <p className="go-verdict" data-go-winner={w}>
                {w === 1 ? tx(TX.win) : w === -1 ? tx(TX.lose) : tx(TX.tie)}
              </p>
            </>
          ) : (
            <p className="dg-big" dir="ltr">
              {total}
            </p>
          )}
          <p className="field-hint">
            <i className="dyn">{seedTier(play.seed)}</i> · {tx(TX.tempo)} <bdi dir="ltr">{tempo ? `♩${tempo}` : '—'}</bdi>
          </p>
          {play.duelId ? (
            <p className="field-hint">{sent ? tx(TX.sent) : '…'}</p>
          ) : (
            (
              <div className="go-code">
                <small className="field-hint">{play.reply ? tx(TX.reply) : tx(TX.send)}</small>
                <div className="go-code-row">
                  <code dir="ltr" data-go-code={shareCode}>
                    {shareCode}
                  </code>
                  <button
                    className="btn small ghost"
                    onClick={() => {
                      void navigator.clipboard?.writeText(shareCode).then(() => setCopied(true), () => undefined);
                    }}
                  >
                    {copied ? tx(TX.copied) : tx(TX.copy)}
                  </button>
                </div>
              </div>
            )
          )}
          <div className="dg-actions">
            <button className="btn primary" onClick={() => setPlay(null)}>
              {tx(TX.again)}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (play && g) {
    return (
      <main className="panel-screen dg-screen dg-play go-screen" data-groove-off="play" data-dg-round={round + 1}>
        {head}
        <p className="drill-goal dg-status">
          {tx(TX.round)} {round + 1}/{rounds.length} · <i className="dyn">{seedTier(play.seed)}</i> · <span dir="ltr">♩ {g.bpm}</span>
        </p>
        <p className="dg-cue">{tx(g.drill.title)}</p>
        <div className="dg-score">
          <DrillScore drill={g.drill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} />
        </div>
        {!res && <DrillTake key={`${play.seed}:${round}`} drill={g.drill} bpm={g.bpm} lang={lang} cal={cal} onDone={done} onBeat={setBeat} drumsOk={phones} onDrums={setPhones} kit={settings.drumKit} />}
        {res && (
          <div className={`dg-result ${res.s.ok ? 'ok' : 'bad'}`} data-dg-ok={res.s.ok ? '1' : '0'}>
            <p className="dg-line">{tx(res.s.line)}</p>
            <p className="go-limbs" dir="ltr" data-go-limbs="1">
              {res.s.limbs
                .filter((l) => l.mark !== 'none')
                .map((l) => `${LIMB[l.limb][lang]} ${l.mark === 'ok' ? '✓' : '~'}`)
                .join(' · ')}
            </p>
            <button className="btn primary" onClick={next} data-dg-next="1">
              {round + 1 >= rounds.length ? tx(TX.finish) : tx(TX.next)}
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="panel-screen dg-screen go-screen" data-groove-off="home">
      {head}
      <section className="set-card">
        <p className="field-hint">{tx(TX.blurb)}</p>
        <p className="go-level" data-go-level={level.tier}>
          {tx(TX.level)} <i className="dyn">{level.tier}</i> · <bdi dir="ltr">{level.done}</bdi> {tx(TX.done)}
          {level.toNext > 0 && (
            <small className="field-hint">
              {' '}
              · <bdi dir="ltr">{level.toNext}</bdi> {tx(TX.toNext)}
            </small>
          )}
        </p>
        <button className="btn primary" data-go-new="1" onClick={() => begin({ seed: newGrooveSeed(level.tier), reply: false })}>
          {tx(TX.newCode)}
        </button>
        <form
          className="go-enter"
          onSubmit={(e) => {
            e.preventDefault();
            const c = decodeGrooveCode(code);
            if (!c) return setErr(true);
            setErr(false);
            begin({ seed: c.seed, theirs: c.points, reply: true });
          }}
        >
          <label className="field-hint" htmlFor="go-code">
            {tx(TX.enter)}
          </label>
          <div className="go-code-row">
            <input id="go-code" dir="ltr" value={code} placeholder="GO1-…" autoComplete="off" spellCheck={false} onChange={(e) => setCode(e.target.value)} />
            <button className="btn small ghost" type="submit">
              {tx(TX.go)}
            </button>
          </div>
          {err && <p className="form-error">{tx(TX.bad)}</p>}
        </form>
        {friends.length > 0 && (
          <ul className="duel-friends">
            {friends.slice(0, 4).map((f) => (
              <li key={f.id}>
                <span>{f.name}</span>
                <button className="btn small primary" onClick={() => void challenge(f.id)}>
                  {tx(TX.challenge)}
                </button>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <ul className="duel-list" aria-label={tx(TX.duels)}>
            {rows.slice(0, 4).map((d) => (
              <li key={d.id}>
                <span>
                  {d.iChallenged ? '→' : '←'} {d.other} · <i className="dyn">{seedTier(d.seed)}</i>
                </span>
                {d.myPoints === null ? (
                  <button className="btn small primary" onClick={() => begin({ seed: d.seed, duelId: d.id, reply: true })}>
                    {tx(TX.go)}
                  </button>
                ) : (
                  <span dir="ltr">
                    {d.myPoints} : {d.theirPoints ?? tx(TX.wait)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// Drum games P1 (DRUMS_NICHE_PLAN §3): Land It, Groove Echo and Odd-meter Echo in one shell. Setup (tier chips), five
// rounds — each a measured take on the kit through DrillTake (same analysis as the technique drills) — a one-line
// verdict per round, a streak, and the run's result for the game tiers, XP and the path. Fits one phone screen.
import '../drumGames.css';
import { useMemo, useState } from 'react';
import type { DrillCalibration, PlayedNote, TakeMetrics } from '../engine/drills/types';
import { DRUM_GAME_BLURB, DRUM_GAME_NAME, DRUM_GAME_ROUNDS, drumRound, landCue, runSummary, scoreRound, type DrumGameId, type RoundScore } from '../engine/drumGames';
import { startTier, type DynName, type TierInfo } from '../engine/gameTiers';
import { inputLatency } from '../engine/latency';
import type { Settings } from '../storage/progress';
import { midi } from '../speech/midi';
import { DrillTake } from './DrillTake';
import { DEFAULT_CAL, DrillScore, drillSettingsOf } from './Drills';
import { TierChips } from './TierChips';
import { kitKind, type KitProfile } from '../engine/drumKit';
import { ZONE_NAME, zonesFor, zonesOf, type StickZones } from '../engine/rudimentRush';
import { rushTopBpm } from '../engine/drumRecords';

type Lang = 'he' | 'en';
const TX = {
  back: { en: 'Back', he: 'חזרה' },
  start: { en: 'Start', he: 'להתחיל' },
  round: { en: 'Round', he: 'סבב' },
  next: { en: 'Next round', he: 'לסבב הבא' },
  again: { en: 'Play again', he: 'שוב' },
  done: { en: 'Done', he: 'סיום' },
  streak: { en: 'streak', he: 'רצף' },
  best: { en: 'best', he: 'שיא' },
  bestTempo: { en: 'best tempo', he: 'טמפו שיא' },
  newRecord: { en: 'a new personal record', he: 'שיא אישי חדש' },
  passed: { en: 'rounds passed', he: 'סבבים שעברו' },
  zones: { en: 'Sticking zones', he: 'אזורי סטיקינג' },
  rimNote: { en: 'Your kit must send the rim as its own note.', he: 'המערכת צריכה לשלוח את השפה כתו נפרד.' },
  kit: { en: 'Played on the kit: an e-kit by MIDI, or a pad by microphone where the round allows it.', he: 'מנגנים על המערכת: תופים אלקטרוניים ב-MIDI, או פד במיקרופון כשהסבב מאפשר.' },
};

const ZONE_SHORT: Record<StickZones, { en: string; he: string }> = {
  'hat-snare': { en: 'Hat · snare', he: 'היי־האט · סנר' },
  'tom-snare': { en: 'Tom · snare', he: 'טום · סנר' },
  'head-rim': { en: 'Head · rim', he: 'עור · שפה' },
  pad: { en: 'One pad', he: 'פד אחד' },
};

export function DrumGame({ game, lang, settings, onExit, onResult, best, tier: tierInfo, onKit, bestBpm }: { onKit?: (k: KitProfile) => void; game: DrumGameId; lang: Lang; settings: Settings; saved?: unknown | null; onSave?: (s: unknown | null) => void; onExit: () => void; onResult: (r: { score: number; detail?: unknown }) => void; best?: number; tier?: TierInfo; /** Rudiment Rush: the best tempo of a passed round (counts.rushBpm). */ bestBpm?: number }) {
  const tx = (o: { en: string; he: string }) => o[lang];
  const [tier, setTier] = useState<DynName>(() => (tierInfo ? startTier(tierInfo) : 'pp'));
  const [phase, setPhase] = useState<'setup' | 'play' | 'end'>('setup');
  const [seed, setSeed] = useState(() => (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<RoundScore[]>([]);
  const [res, setRes] = useState<{ m: TakeMetrics; s: RoundScore } | null>(null);
  const [beat, setBeat] = useState(-1);
  const [take, setTake] = useState(0);
  const [phones, setPhones] = useState<boolean | undefined>(settings.headphones);
  // Rudiment Rush: the two-zone sticking mode this kit can measure, and the tempo rising with every round passed.
  const kind = kitKind(settings.drumKit);
  const [zones, setZones] = useState<StickZones>(() => zonesOf(settings.drumKit, kind));
  const ups = scores.filter((x) => x.ok).length - (res?.s.ok ? 1 : 0);
  const r = useMemo(() => drumRound(game, tier, round, seed, game === 'rudiment-rush' ? { ups, zones } : {}), [game, tier, round, seed, ups, zones]);
  const ds = useMemo(() => ({ ...drillSettingsOf(settings), instrument: 'drums' as const }), [settings]);
  const cal: DrillCalibration = { ...DEFAULT_CAL, ...(settings.drillCal ?? {}), latencyMs: inputLatency(settings, midi.devices.length ? 'midi' : 'mic') };
  const streak = (() => {
    let n = 0;
    for (let i = scores.length - 1; i >= 0 && scores[i].ok; i--) n++;
    return n;
  })();
  // Rudiment Rush: the tempo of every round played, for the run's best tempo (drumRecords.ts).
  const [rushBpms, setRushBpms] = useState<{ ok: boolean; bpm: number }[]>([]);
  // The record before this run (the prop updates once the run is stored).
  const [bestBpmAtStart, setBestBpmAtStart] = useState(bestBpm);
  const finishRun = (all: RoundScore[]) => {
    const sum = runSummary(tier, all);
    const topBpm = game === 'rudiment-rush' ? rushTopBpm(rushBpms) : 0;
    onResult({ score: sum.score, detail: topBpm ? { ...sum.detail, topBpm } : sum.detail });
    setPhase('end');
  };
  const done = (m: TakeMetrics, _p: PlayedNote[]) => {
    setBeat(-1);
    const s = scoreRound(r, m);
    setRes({ m, s });
    setScores((xs) => [...xs, s]);
    if (game === 'rudiment-rush') setRushBpms((xs) => [...xs, { ok: s.ok, bpm: r.bpm }]);
  };
  const next = () => {
    const all = scores;
    setRes(null);
    if (all.length >= DRUM_GAME_ROUNDS) return finishRun(all);
    setRound((x) => x + 1);
    setTake((x) => x + 1);
  };
  const restart = () => {
    setSeed((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    setRound(0);
    setScores([]);
    setRushBpms([]);
    setBestBpmAtStart(bestBpm);
    setRes(null);
    setPhase('setup');
  };
  const cue = game === 'land' && !res ? landCue(r, beat) : null;
  if (phase === 'setup')
    return (
      <main className="panel-screen dg-screen" data-drum-game={game}>
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={tx(TX.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx(DRUM_GAME_NAME[game])}</h1>
        </header>
        <section className="set-card">
          <p className="field-hint">{tx(DRUM_GAME_BLURB[game])}</p>
          {tierInfo && <TierChips lang={lang} info={tierInfo} value={tier} onChange={setTier} game={game} />}
          {game === 'rudiment-rush' && (
            <div className="dg-zones" data-dg-zones={zones}>
              <div className="seg small" role="radiogroup" aria-label={tx(TX.zones)}>
                {zonesFor(kind, !!settings.drumKit?.acoustic?.tpl.tom).map((z) => (
                  <button
                    key={z}
                    type="button"
                    role="radio"
                    aria-checked={zones === z}
                    className={zones === z ? 'on' : ''}
                    data-zone={z}
                    onClick={() => {
                      setZones(z);
                      onKit?.({ ...(settings.drumKit ?? { preset: 'gm', map: {} }), zones: z });
                    }}
                  >
                    {tx(ZONE_SHORT[z])}
                  </button>
                ))}
              </div>
              <p className="field-hint">
                {tx(ZONE_NAME[zones])}
                {zones === 'head-rim' ? ` ${tx(TX.rimNote)}` : ''}
              </p>
            </div>
          )}
          <p className="field-hint">{tx(TX.kit)}</p>
          {best !== undefined && (
            <p className="field-hint">
              {tx(TX.best)} <bdi dir="ltr">{best}</bdi>
              {game === 'rudiment-rush' && bestBpm ? (
                <>
                  {' · '}
                  {tx(TX.bestTempo)} <bdi dir="ltr" data-rush-best={bestBpm}>♩{bestBpm}</bdi>
                </>
              ) : null}
            </p>
          )}
          <button className="btn primary" onClick={() => setPhase('play')} data-dg-start="1">
            {tx(TX.start)}
          </button>
        </section>
      </main>
    );
  if (phase === 'end') {
    const sum = runSummary(tier, scores);
    return (
      <main className="panel-screen dg-screen" data-drum-game={game}>
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={tx(TX.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx(DRUM_GAME_NAME[game])}</h1>
        </header>
        <section className="set-card dg-end" data-dg-score={sum.score}>
          <p className="dg-big" dir="ltr">
            {sum.detail.right}/{sum.detail.rounds}
          </p>
          <p className="field-hint">
            {tx(TX.passed)} · <i className="dyn">{tier}</i> · <bdi dir="ltr">{sum.score}</bdi>
          </p>
          {game === 'rudiment-rush' && rushTopBpm(rushBpms) > 0 && (
            <p className="field-hint" data-rush-top={rushTopBpm(rushBpms)}>
              {tx(TX.bestTempo)} <bdi dir="ltr">♩{rushTopBpm(rushBpms)}</bdi>
              {rushTopBpm(rushBpms) > (bestBpmAtStart ?? 0) ? ` · ${tx(TX.newRecord)}` : ''}
            </p>
          )}
          <div className="dg-actions">
            <button className="btn primary" onClick={restart}>
              {tx(TX.again)}
            </button>
            <button className="btn ghost" onClick={onExit}>
              {tx(TX.done)}
            </button>
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className="panel-screen dg-screen dg-play" data-drum-game={game} data-dg-round={round + 1}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onExit} aria-label={tx(TX.back)}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx(DRUM_GAME_NAME[game])}</h1>
      </header>
      <p className="drill-goal dg-status">
        {tx(TX.round)} {Math.min(DRUM_GAME_ROUNDS, round + 1)}/{DRUM_GAME_ROUNDS} · <i className="dyn">{tier}</i> · <span dir="ltr">{r.drill.pulse === 8 ? '♪' : '♩'} {r.bpm}</span>
        {streak > 1 && (
          <>
            {' · '}
            {tx(TX.streak)} <b dir="ltr">{streak}</b>
          </>
        )}
      </p>
      <p className="dg-cue" aria-live="polite" data-dg-cue={cue ? '1' : '0'}>
        {cue ? tx(cue) : tx(r.drill.title)}
      </p>
      <div className="dg-score">
        <DrillScore drill={r.drill} ds={ds} result={res?.m} beat={res ? -1 : beat} lang={lang} />
      </div>
      {!res && <DrillTake key={`${r.drill.itemId}:${take}`} drill={r.drill} bpm={r.bpm} lang={lang} cal={cal} onDone={done} onBeat={setBeat} drumsOk={phones} onDrums={setPhones} kit={settings.drumKit} />}
      {res && (
        <div className={`dg-result ${res.s.ok ? 'ok' : 'bad'}`} data-dg-ok={res.s.ok ? '1' : '0'}>
          <p className="dg-line">{tx(res.s.line)}</p>
          <button className="btn primary" onClick={next} data-dg-next="1">
            {scores.length >= DRUM_GAME_ROUNDS ? tx(TX.done) : tx(TX.next)}
          </button>
        </div>
      )}
    </main>
  );
}

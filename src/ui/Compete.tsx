// Weekly league card, asynchronous friend duels and "players at your level" lines (spec S.7, S.8, L.5).

import { Toni } from './Toni';
import { LeagueBadge, LeagueLadder } from './LeagueBadge';
import { LADDER, tierOf, TOP_TIER } from '../engine/league';
import { piano } from './services';
import { useCallback, useEffect, useState } from 'react';
import { seedTier, tierSeed, type DynName } from '../engine/gameTiers';
import { createDuel, leagueZone, myDuels, myLeague, submitDuel, type DuelKind, type DuelRow, type League } from '../cloud/compete';
import { tournamentSet } from '../engine/tournament';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { TournamentPlay } from './Tournament';
import { CourseXpLine } from './CourseLevels';
import { courseSetKinds, type ResultLike } from '../engine/courseSocial';
import { DuelLinkButton, PlayerSafety, QuickMessages } from './Community';
import { effectivePrivacy } from '../engine/privacy';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export function LeagueCard({ t, lang, onBestTier, lastSeen, onSeen, history }: { t: Strings; lang: 'he' | 'en'; onBestTier?: (tier: number) => void; /** League shown last time (spec Y.5). */ lastSeen?: number; onSeen?: (tier: number) => void; /** My results: this week's XP per course (the league stays one across courses). */ history?: ResultLike[] }) {
  const [league, setLeague] = useState<League | null>(null);
  const [move, setMove] = useState<{ from: number; to: number } | null>(null);
  useEffect(() => {
    void myLeague().then((l) => {
      setLeague(l);
      if (!l) return;
      onBestTier?.(Math.max(l.tier, l.bestTier ?? 0));
      if (lastSeen && lastSeen !== l.tier) setMove({ from: lastSeen, to: l.tier });
      if (lastSeen !== l.tier) onSeen?.(l.tier);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!league) return null;
  const days = Math.max(0, Math.ceil((new Date(league.endsAt).getTime() - Date.now()) / 86_400_000));
  const n = league.members.length;
  return (
    <>
    {move && <LeagueMove t={t} from={move.from} to={move.to} onClose={() => setMove(null)} />}
    <section className={`set-card league-card tier-${league.tier}`} aria-label={t.leagueTitle} style={{ ['--tier-color' as string]: tierOf(league.tier).color }}>
      <div className="league-head">
        <LeagueBadge tier={league.tier} size={78} ghostNext title={t.leagueTiers[league.tier - 1]} />
        <div>
          <small className="league-kicker">{t.leagueTitle}</small>
          <h2 data-league-tier={league.tier}>{t.leagueTiers[league.tier - 1]}</h2>
          <p className="field-hint">{fill(t.leagueEnds, { d: days })}</p>
          {history && <CourseXpLine history={history} endsAt={league.endsAt} lang={lang} />}
          <p className="league-goal">{league.tier < TOP_TIER ? fill(tierOf(league.tier).minXp > 1 ? t.leagueGoalXp : t.leagueGoal, { n: tierOf(league.tier).promote, xp: tierOf(league.tier).minXp, next: t.leagueTiers[league.tier] }) : t.leagueTop}</p>
        </div>
      </div>
      <LeagueLadder tier={league.tier} names={t.leagueTiers} />
      <ol className="board league-board">
        {league.members.map((m, i) => {
          // Ties share a rank, as on the server (1 + players with more XP).
          const rank = 1 + league.members.filter((x) => x.xp > m.xp).length;
          const zone = leagueZone(rank, n, league.tier, m.xp);
          return (
            <li key={i} className={`${m.me ? 'me' : ''} zone-${zone}`}>
              <span className="rank">{i + 1}</span>
              <span className="pname">
                {m.me ? `${m.name} (${t.you})` : m.name} {zone === 'up' ? '▲' : zone === 'up-needs-xp' ? '△' : zone === 'down' ? '▼' : ''}
              </span>
              <span className="pbest" dir="ltr">
                {m.xp.toLocaleString(lang)} XP
              </span>
            </li>
          );
        })}
      </ol>
      <p className="field-hint">{t.leagueRules}</p>
    </section>
    </>
  );
}

const DUEL_KINDS: DuelKind[] = ['mixed', 'modes', 'wrong-notes', 'truefalse', 'chords', 'intervals', 'jazz'];

export function DuelsSection({ t, settings, friends, onPlaying, tier = 'pp' }: { t: Strings; settings: Settings; friends: { id: string; name: string }[]; onPlaying: (on: boolean) => void; /** The challenger's level tier (GAMES_TIERS_PLAN §5.1): rides in the duel's seed. */ tier?: DynName }) {
  const [rows, setRows] = useState<DuelRow[]>([]);
  // Per course (owner 2026-11-09): the active course's question sets only.
  const kinds = courseSetKinds(settings.activeCourse ?? 'ear', DUEL_KINDS);
  const [kind, setKind] = useState<DuelKind>(kinds.includes('mixed') ? 'mixed' : kinds[0]);
  const [play, setPlay] = useState<{ id: string; kind: DuelKind; seed: number; rounds: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  /** The duel row whose quick messages / report menu is open. */
  const [openRow, setOpenRow] = useState<string | null>(null);
  const priv = effectivePrivacy(settings.privacy, settings.birthYear);
  const load = useCallback(() => void myDuels().then(setRows), []);
  useEffect(load, [load]);
  const names: Record<string, string> = { mixed: t.setMixed, modes: t.skillNames.modes, 'wrong-notes': t.wrongNotesTitle, truefalse: t.trueFalse, chords: t.skillNames.chords, intervals: t.skillNames.intervals, degrees: t.skillNames.degrees, beat: t.skillNames['rhythm-dictation'], jazz: settings.uiLang === 'he' ? 'הרמוניית ג׳אז' : 'Jazz harmony' };

  if (play) {
    const items = tournamentSet(play.kind, play.rounds, play.seed);
    return (
      <TournamentPlay
        t={t}
        settings={settings}
        items={items}
        players={[t.you]}
        onExit={() => {
          setPlay(null);
          onPlaying(false);
          load();
        }}
        onOver={(v) => {
          const answers = v.results.map((r) => (r.answers[0].answer === null ? null : String(r.answers[0].answer)));
          const times = v.results.map((r) => r.answers[0].timeMs);
          void submitDuel(play.id, answers, times).then(load, () => setMsg(t.roomError));
        }}
      />
    );
  }
  const start = async (opponent: string) => {
    try {
      const d = await createDuel(opponent, kind, tierSeed((Math.random() * 2 ** 32) >>> 0, tier));
      if (!d) return;
      onPlaying(true);
      setPlay({ id: d.id, kind, seed: d.seed, rounds: 3 });
    } catch {
      setMsg(t.roomError);
    }
  };
  return (
    <section className="set-card duels" aria-label={t.duelsTitle}>
      <h2>{t.duelsTitle}</h2>
      <p className="field-hint">{t.duelsHint}</p>
      {friends.length > 0 && (
        <>
          <div className="seg small" role="radiogroup" aria-label={t.questionsOn}>
            {kinds.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                {names[k]}
              </button>
            ))}
          </div>
          <ul className="duel-friends">
            {friends.map((f) => (
              <li key={f.id}>
                <span>{f.name}</span>
                <button className="btn small primary" onClick={() => void start(f.id)}>
                  {t.challenge}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <DuelLinkButton
        lang={settings.uiLang}
        canShare={priv.canShareOutside}
        make={() => {
          const seed = tierSeed((Math.random() * 2 ** 32) >>> 0, tier);
          return { duelKind: kind, seed, keys: tournamentSet(kind, 3, seed).map((q) => String(q.answer)) };
        }}
      />
      {rows.length > 0 && (
        <ul className="duel-list">
          {rows.map((d) => (
            <li key={d.id}>
              <span>
                {d.iChallenged ? '→' : '←'} {d.other} · {names[d.kind]} · <i className="dyn">{seedTier(d.seed)}</i>
              </span>
              {d.otherId && (
                <button type="button" className="icon-btn cm-more" aria-expanded={openRow === d.id} aria-label={settings.uiLang === 'he' ? 'הודעות' : 'Messages'} onClick={() => setOpenRow(openRow === d.id ? null : d.id)} data-duel-more={d.id}>
                  …
                </button>
              )}
              {d.myPoints === null ? (
                <button
                  className="btn small primary"
                  onClick={() => {
                    onPlaying(true);
                    setPlay({ id: d.id, kind: d.kind, seed: d.seed, rounds: d.rounds });
                  }}
                >
                  {t.play}
                </button>
              ) : (
                <span dir="ltr">
                  {d.myPoints} : {d.theirPoints ?? '…'} {d.theirPoints !== null && (d.myPoints > d.theirPoints ? '✓' : d.myPoints < d.theirPoints ? '' : '=')}
                </span>
              )}
              {openRow === d.id && d.otherId && (
                <div className="duel-social" data-duel-social={d.id}>
                  <QuickMessages lang={settings.uiLang} ctx="duel" id={d.id} stage={d.myPoints === null ? 'before' : 'after'} canMessage={priv.canMessage} compact />
                  <PlayerSafety lang={settings.uiLang} user={{ id: d.otherId, name: d.other }} onBlocked={load} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="form-error">{msg}</p>}
    </section>
  );
}


/**
 * A league move (spec Y.5). Up: the new note drops onto the staff while the chord plays up to it.
 * Down: the top note falls off the staff while it sounds, sliding an octave down.
 */
export function LeagueMove({ t, from, to, onClose }: { t: Strings; from: number; to: number; onClose: () => void }) {
  const up = to > from;
  useEffect(() => {
    const c = new AbortController();
    void piano.unlock().then(() => {
      const chord = LADDER.slice(0, up ? to : from).map((n) => n.midi);
      const ev = up
        ? chord.map((m, i) => ({ midi: m, start: 0.5 + i * 0.16, duration: i === chord.length - 1 ? 1.8 : 1.4, velocity: i === chord.length - 1 ? 0.8 : 0.5 }))
        : [
            ...chord.map((m) => ({ midi: m, start: 0, duration: 0.9, velocity: 0.45 })),
            { midi: tierOf(from).midi, start: 0.8, duration: 0.35, velocity: 0.6 },
            { midi: tierOf(from).midi - 12, start: 1.3, duration: 0.9, velocity: 0.4 },
          ];
      return piano.play(ev, 3, c.signal);
    }).catch(() => {});
    return () => c.abort();
  }, [up, from, to]);
  const name = t.leagueTiers[to - 1];
  const title = up ? (to === TOP_TIER ? t.leagueUpTop : fill(t.leagueUpTitle, { name })) : fill(t.leagueDownTitle, { name });
  return (
    <div className="mini-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`mini-celebrate league-move ${up ? 'up' : 'down'}`} data-league-move={up ? 'up' : 'down'} style={{ ['--tier-color' as string]: tierOf(to).color }}>
        {up && (
          <div className="mini-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, k) => (
              <span key={k} style={{ ['--k' as string]: k }} />
            ))}
          </div>
        )}
        <span className="cele-toni">
          <Toni state={up ? 'streak' : 'close'} size={84} />
        </span>
        <LeagueBadge tier={to} size={150} arrive={up} falling={up ? [] : LADDER.slice(to, from).map((n) => n.tier)} title={name} />
        <h2>{title}</h2>
        <p className="mini-takeaway">{up ? fill(t.leagueUpHint, { note: tierOf(to).symbol }) : t.leagueDownHint}</p>
        <button className="btn primary" data-league-move-ok="1" onClick={onClose}>
          {t.leagueMoveGo}
        </button>
      </div>
    </div>
  );
}

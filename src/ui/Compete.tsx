// Weekly league card, asynchronous friend duels and "players at your level" lines (spec S.7, S.8, L.5).

import { LeagueBadge, LeagueLadder } from './LeagueBadge';
import { tierOf, TOP_TIER } from '../engine/league';
import { useCallback, useEffect, useState } from 'react';
import { createDuel, leagueZone, myDuels, myLeague, submitDuel, type DuelKind, type DuelRow, type League } from '../cloud/compete';
import { tournamentSet } from '../engine/tournament';
import type { Strings } from '../i18n/strings';
import type { Settings } from '../storage/progress';
import { TournamentPlay } from './Tournament';

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((a, [k, x]) => a.replaceAll(`{${k}}`, String(x)), s);

export function LeagueCard({ t, lang, onBestTier }: { t: Strings; lang: 'he' | 'en'; onBestTier?: (tier: number) => void }) {
  const [league, setLeague] = useState<League | null>(null);
  useEffect(() => {
    void myLeague().then((l) => {
      setLeague(l);
      if (l) onBestTier?.(Math.max(l.tier, l.bestTier ?? 0));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!league) return null;
  const days = Math.max(0, Math.ceil((new Date(league.endsAt).getTime() - Date.now()) / 86_400_000));
  const n = league.members.length;
  return (
    <section className={`set-card league-card tier-${league.tier}`} aria-label={t.leagueTitle} style={{ ['--tier-color' as string]: tierOf(league.tier).color }}>
      <div className="league-head">
        <LeagueBadge tier={league.tier} size={78} ghostNext title={t.leagueTiers[league.tier - 1]} />
        <div>
          <small className="league-kicker">{t.leagueTitle}</small>
          <h2 data-league-tier={league.tier}>{t.leagueTiers[league.tier - 1]}</h2>
          <p className="field-hint">{fill(t.leagueEnds, { d: days })}</p>
          <p className="league-goal">{league.tier < TOP_TIER ? fill(tierOf(league.tier).minXp > 1 ? t.leagueGoalXp : t.leagueGoal, { n: tierOf(league.tier).promote, xp: tierOf(league.tier).minXp, next: t.leagueTiers[league.tier] }) : t.leagueTop}</p>
        </div>
      </div>
      <LeagueLadder tier={league.tier} names={t.leagueTiers} />
      <ol className="board league-board">
        {league.members.map((m, i) => {
          const zone = leagueZone(i + 1, n, league.tier, m.xp);
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
  );
}

const DUEL_KINDS: DuelKind[] = ['mixed', 'modes', 'wrong-notes', 'truefalse', 'chords', 'intervals'];

export function DuelsSection({ t, settings, friends, onPlaying }: { t: Strings; settings: Settings; friends: { id: string; name: string }[]; onPlaying: (on: boolean) => void }) {
  const [rows, setRows] = useState<DuelRow[]>([]);
  const [kind, setKind] = useState<DuelKind>('mixed');
  const [play, setPlay] = useState<{ id: string; kind: DuelKind; seed: number; rounds: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => void myDuels().then(setRows), []);
  useEffect(load, [load]);
  const names: Record<string, string> = { mixed: t.setMixed, modes: t.skillNames.modes, 'wrong-notes': t.wrongNotesTitle, truefalse: t.trueFalse, chords: t.skillNames.chords, intervals: t.skillNames.intervals, degrees: t.skillNames.degrees, beat: t.skillNames['rhythm-dictation'] };

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
      const d = await createDuel(opponent, kind);
      if (!d) return;
      onPlaying(true);
      setPlay({ id: d.id, kind, seed: d.seed, rounds: 3 });
    } catch {
      setMsg(t.roomError);
    }
  };
  return (
    <section className="set-card duels" aria-label={t.duelsTitle}>
      <h2>⚔ {t.duelsTitle}</h2>
      <p className="field-hint">{t.duelsHint}</p>
      {friends.length > 0 && (
        <>
          <div className="seg small" role="radiogroup" aria-label={t.questionsOn}>
            {DUEL_KINDS.map((k) => (
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
                  ⚔ {t.challenge}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {rows.length > 0 && (
        <ul className="duel-list">
          {rows.map((d) => (
            <li key={d.id}>
              <span>
                {d.iChallenged ? '→' : '←'} {d.other} · {names[d.kind]}
              </span>
              {d.myPoints === null ? (
                <button
                  className="btn small primary"
                  onClick={() => {
                    onPlaying(true);
                    setPlay({ id: d.id, kind: d.kind, seed: d.seed, rounds: d.rounds });
                  }}
                >
                  ▶ {t.play}
                </button>
              ) : (
                <span dir="ltr">
                  {d.myPoints} : {d.theirPoints ?? '…'} {d.theirPoints !== null && (d.myPoints > d.theirPoints ? '🏆' : d.myPoints < d.theirPoints ? '' : '🤝')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="form-error">{msg}</p>}
    </section>
  );
}


import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dailyBoard, submitDaily, type DailyBoard } from '../cloud/daily';
import type { CloudUser } from '../cloud/cloud';
import { dailySet, shareText, tournamentSet, type SetKind } from '../engine/tournament';
import type { Question } from '../engine/lesson';
import { TournamentController, type TournamentView } from '../game/tournamentController';
import { askTemplate, choiceLabel } from '../game/content';
import type { Strings } from '../i18n/strings';
import { localDay, namingFor, type GhostRun, type Progress, type Settings } from '../storage/progress';
import { displayNote } from '../engine/pitch';
import { withNote } from './bits';
import { piano, store, tts } from './services';
import { realClock } from '../game/adapters';
import { PLAYER_COLORS } from '../engine/match';

// ======================================================================= Daily challenge

export function DailyScreen({
  t,
  settings,
  progress,
  user,
  onBack,
  onProgress,
}: {
  t: Strings;
  settings: Settings;
  progress: Progress;
  user: CloudUser | null;
  onBack: () => void;
  onProgress: (p: Progress) => void;
}) {
  const day = localDay(new Date());
  const done = progress.daily?.[day];
  const [playing, setPlaying] = useState(false);
  const [practice, setPractice] = useState(false);
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [boardErr, setBoardErr] = useState(false);
  const items = useMemo(() => dailySet(day), [day]);

  // Upload the first play once signed in (also after playing signed out), then show the board.
  useEffect(() => {
    if (!user || playing) return;
    let live = true;
    const go = async () => {
      try {
        let b: DailyBoard | null;
        if (done && !done.submitted && done.answers && done.times) {
          b = await submitDaily(day, done.answers, done.times);
          onProgress(await store.markDailySubmitted(day));
        } else b = await dailyBoard(day);
        if (live) {
          setBoard(b);
          setBoardErr(false);
        }
      } catch {
        if (live) setBoardErr(true);
      }
    };
    void go();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, playing, done?.submitted, done?.points, day]);

  if (playing) {
    return (
      <TournamentPlay
        t={t}
        settings={settings}
        items={items}
        players={[t.you]}
        onExit={onBack}
        onOver={(v) => {
          const points = v.standings[0].points;
          const text = shareText(day, v.results, points, settings.uiLang);
          // Only the first play of the day counts; later plays are practice.
          const answers = v.results.map((r) => (r.answers[0].answer === null ? null : String(r.answers[0].answer)));
          const times = v.results.map((r) => r.answers[0].timeMs);
          if (!practice) void store.recordDaily(day, points, text, { answers, times }).then(onProgress);
        }}
        shareDay={day}
      />
    );
  }
  return (
    <main className="panel-screen daily">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.dailyChallenge}</h1>
      </header>
      <section className="set-card">
        <p className="field-hint">{t.dailyHint}</p>
        <p className="daily-date" dir="ltr">
          {day}
        </p>
        {done ? (
          <>
            <pre className="share-card" dir="ltr">
              {done.text}
            </pre>
            <ShareButton t={t} text={done.text} />
            <button
              className="btn ghost"
              onClick={() => {
                setPractice(true);
                setPlaying(true);
              }}
            >
              {t.practiceAgain}
            </button>
          </>
        ) : (
          <button
            className="btn mega"
            onClick={() => {
              void piano.unlock();
              setPractice(false);
              setPlaying(true);
            }}
          >
            ▶ {t.play}
          </button>
        )}
      </section>
      <DailyBoardCard t={t} board={board} signedIn={!!user} error={boardErr} lang={settings.uiLang} />
    </main>
  );
}

const fmtS = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

export function DailyBoardCard({ t, board, signedIn, error, lang }: { t: Strings; board: DailyBoard | null; signedIn: boolean; error: boolean; lang: 'he' | 'en' }) {
  if (!signedIn) return <p className="field-hint daily-board-hint">{t.signInForBoard}</p>;
  if (error) return <p className="field-hint daily-board-hint">{t.boardError}</p>;
  if (!board) return null;
  return (
    <section className="set-card daily-board" aria-label={t.friendsToday}>
      <p className="daily-stats">
        <b>{fmtS(t.todayPlayers, { n: board.players.toLocaleString(lang) })}</b>
        {board.me && <span>{fmtS(t.yourRank, { r: board.me.rank, p: board.me.topPercent })}</span>}
      </p>
      <h2>{t.friendsToday}</h2>
      {board.friends.filter((f) => !f.me).length === 0 && <p className="field-hint">{t.noFriendsToday}</p>}
      <ol className="board">
        {board.friends.map((f, i) => (
          <li key={i} className={f.me ? 'me' : ''}>
            <span className="rank">{i + 1}</span>
            <span className="pname">{f.me ? t.you : f.name}</span>
            <span className="squares" dir="ltr">
              {f.squares}
            </span>
            <span className="pbest" dir="ltr">
              {f.points.toLocaleString(lang)} <small>{t.points}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ShareButton({ t, text }: { t: Strings; text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className="btn primary"
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ text });
          else await navigator.clipboard.writeText(text);
          setOk(true);
        } catch {
          /* cancelled */
        }
      }}
    >
      {ok ? `✓ ${t.copied}` : t.share}
    </button>
  );
}

// ======================================================================= Duel setup

export function DuelSetup({ t, onBack, onStart }: { t: Strings; onBack: () => void; onStart: (names: string[], kind: SetKind, rounds: number) => void }) {
  const [names, setNames] = useState([`${t.playerN} 1`, `${t.playerN} 2`]);
  const [kind, setKind] = useState<SetKind>('mixed');
  const [rounds, setRounds] = useState(10);
  const kinds: [SetKind, string][] = [
    ['mixed', t.setMixed],
    ['degrees', t.skillNames.degrees],
    ['chords', t.skillNames.chords],
    ['intervals', t.skillNames.intervals],
  ];
  return (
    <main className="panel-screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.duel}</h1>
      </header>
      <p className="field-hint">{t.duelHint}</p>
      <section className="set-card">
        <div className="name-list">
          {names.map((n, i) => (
            <label key={i} className="name-row" style={{ ['--pc' as string]: PLAYER_COLORS[i] }}>
              <span className="dot" aria-hidden="true" />
              <input value={n} maxLength={16} aria-label={`${t.playerN} ${i + 1}`} onChange={(e) => setNames((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} />
            </label>
          ))}
        </div>
        <fieldset className="seg-field">
          <legend>{t.questionsOn}</legend>
          <div className="seg" role="radiogroup" aria-label={t.questionsOn}>
            {kinds.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={kind === v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="seg-field">
          <legend>{t.roundsLabel}</legend>
          <div className="seg" role="radiogroup" aria-label={t.roundsLabel}>
            {[5, 10, 15].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rounds === n} className={rounds === n ? 'on' : ''} onClick={() => setRounds(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
      </section>
      <button
        className="btn mega"
        onClick={() => {
          void piano.unlock();
          onStart(
            names.map((n, i) => n.trim() || `${t.playerN} ${i + 1}`),
            kind,
            rounds,
          );
        }}
      >
        ▶ {t.play}
      </button>
    </main>
  );
}

export function DuelScreen({ t, settings, names, kind, rounds, onExit, onRematch }: { t: Strings; settings: Settings; names: string[]; kind: SetKind; rounds: number; onExit: () => void; onRematch: () => void }) {
  const seed = useMemo(() => (Date.now() ^ (Math.random() * 1e9)) >>> 0, []);
  const items = useMemo(() => tournamentSet(kind, rounds, seed), [kind, rounds, seed]);
  return <TournamentPlay t={t} settings={settings} items={items} players={names} onExit={onExit} onRematch={onRematch} />;
}

// ======================================================================= Ghost race

const ghostKey = (kind: SetKind, rounds: number) => `${kind}:${rounds}`;

export function GhostScreen({ t, settings, progress, onBack, onProgress }: { t: Strings; settings: Settings; progress: Progress; onBack: () => void; onProgress: (p: Progress) => void }) {
  const [kind, setKind] = useState<SetKind>('mixed');
  const [rounds, setRounds] = useState(5);
  const [run, setRun] = useState<{ key: number; seed: number; ghost?: GhostRun } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ghost = progress.ghosts?.[ghostKey(kind, rounds)];
  const kinds: [SetKind, string][] = [
    ['mixed', t.setMixed],
    ['degrees', t.skillNames.degrees],
    ['chords', t.skillNames.chords],
    ['intervals', t.skillNames.intervals],
  ];
  if (run) {
    const items = tournamentSet(kind, rounds, run.seed);
    return (
      <TournamentPlay
        key={run.key}
        t={t}
        settings={settings}
        items={items}
        players={run.ghost ? [t.you, t.ghostName] : [t.you]}
        ghost={run.ghost}
        overNote={note}
        onExit={() => {
          setRun(null);
          setNote(null);
        }}
        onRematch={() => {
          setNote(null);
          const g = progress.ghosts?.[ghostKey(kind, rounds)];
          setRun({ key: run.key + 1, seed: g?.seed ?? run.seed, ghost: g });
        }}
        onOver={(v) => {
          const me = v.standings.find((s) => s.player === 0)!;
          const answers = v.results.map((r) => ({ answer: r.answers[0].answer, timeMs: r.answers[0].timeMs }));
          void store.recordGhost(ghostKey(kind, rounds), { seed: run.seed, points: me.points, answers, at: new Date().toISOString() }).then(({ progress: p, kept }) => {
            onProgress(p);
            setNote(!run.ghost ? t.ghostSet : kept ? t.ghostBeaten : t.ghostNotBeaten);
          });
        }}
      />
    );
  }
  return (
    <main className="panel-screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.ghostRace}</h1>
      </header>
      <p className="field-hint">{t.ghostHint}</p>
      <section className="set-card">
        <fieldset className="seg-field">
          <legend>{t.questionsOn}</legend>
          <div className="seg" role="radiogroup" aria-label={t.questionsOn}>
            {kinds.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={kind === v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="seg-field">
          <legend>{t.roundsLabel}</legend>
          <div className="seg" role="radiogroup" aria-label={t.roundsLabel}>
            {[5, 10].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rounds === n} className={rounds === n ? 'on' : ''} onClick={() => setRounds(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="ghost-best" dir="auto">
          {ghost ? `👻 ${t.ghostBest}: ${ghost.points.toLocaleString(settings.uiLang)} ${t.points}` : t.ghostNone}
        </p>
      </section>
      <button
        className="btn mega"
        onClick={() => {
          void piano.unlock();
          setRun({ key: 1, seed: ghost?.seed ?? (Date.now() ^ (Math.random() * 1e9)) >>> 0, ghost });
        }}
      >
        ▶ {ghost ? t.raceGhost : t.setGhost}
      </button>
    </main>
  );
}

// ======================================================================= Play (1 or 2 players)

function TournamentPlay({
  t,
  settings,
  items,
  players,
  onExit,
  onOver,
  onRematch,
  shareDay,
  ghost,
  overNote,
}: {
  t: Strings;
  settings: Settings;
  items: Question[];
  players: string[];
  onExit: () => void;
  onOver?: (v: TournamentView) => void;
  onRematch?: () => void;
  shareDay?: string;
  /** Ghost race: player 2 replays these answers at their recorded times. */
  ghost?: GhostRun;
  overNote?: string | null;
}) {
  const ref = useRef<TournamentController | null>(null);
  if (!ref.current) {
    let c: TournamentController | null = null;
    c = new TournamentController(items, players, { audio: piano, tts, clock: realClock }, { onOver: () => c && onOver?.(c.getView()) });
    ref.current = c;
  }
  const c = ref.current;
  const v = useSyncExternalStore(c.subscribe, c.getView);
  useEffect(() => {
    void c.start();
    return () => c.dispose();
  }, [c]);

  // The ghost answers each round at its recorded time after the sound ends.
  useEffect(() => {
    if (!ghost || v.stage !== 'answering') return;
    const g = ghost.answers[v.round];
    if (!g || g.timeMs === null || g.answer === null) return;
    const timer = setTimeout(() => c.answer(1, g.answer as string | number), g.timeMs);
    return () => clearTimeout(timer);
  }, [ghost, v.stage, v.round, c]);

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const duel = players.length === 2;
  const split = duel && !ghost;
  const q = v.item;
  const target = q.kind === 'degree' ? displayNote(q.target, nm, lang) : '';

  if (v.stage === 'over') {
    const winner = v.standings[0];
    const tie = duel && v.standings[0].points === v.standings[1].points && v.standings[0].totalTimeMs === v.standings[1].totalTimeMs;
    const text = shareDay ? shareText(shareDay, v.results, winner.points, lang) : '';
    return (
      <main className="recap scoreboard">
        <p className="eyebrow">{ghost ? t.ghostRace : duel ? t.duel : t.dailyChallenge}</p>
        <h1>{duel ? (tie ? t.tie : `🏆 ${players[winner.player]}`) : t.gameOver}</h1>
        {overNote && <p className="ghost-note">{overNote}</p>}
        {duel ? (
          <ol className="board">
            {v.standings.map((s, k) => (
              <li key={s.player} className={k === 0 && !tie ? 'win' : ''} style={{ ['--pc' as string]: PLAYER_COLORS[s.player] }}>
                <span className="rank">{k + 1}</span>
                <span className="dot" aria-hidden="true" />
                <span className="pname">{players[s.player]}</span>
                <span className="pbest" dir="ltr">
                  {s.points.toLocaleString(lang)} <small>{t.points}</small>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <p className="big-score">
              <b dir="ltr">{winner.points.toLocaleString(lang)}</b>
              <small>
                {winner.correct}/{v.rounds} · {t.points}
              </small>
            </p>
            {text && (
              <>
                <pre className="share-card" dir="ltr">
                  {text}
                </pre>
                <ShareButton t={t} text={text} />
              </>
            )}
          </>
        )}
        <div className="recap-actions">
          {onRematch && (
            <button className="btn mega" onClick={onRematch}>
              ↻ {t.rematch}
            </button>
          )}
          <button className="btn ghost" onClick={onExit}>
            {t.home}
          </button>
        </div>
      </main>
    );
  }

  const half = (p: number) => {
    const locked = v.locked[p];
    const res = v.last?.answers.find((a) => a.player === p);
    const st = v.standings.find((s) => s.player === p)!;
    return (
      <section className={`duel-half p${p} ${split && p === 0 ? 'flip' : ''}`} style={{ ['--pc' as string]: PLAYER_COLORS[p] }}>
        <div className="half-head">
          <span className="dot" aria-hidden="true" />
          <b>{players[p]}</b>
          <span className="half-score" dir="ltr">
            {st.points.toLocaleString(lang)}
          </span>
        </div>
        {split && v.stage !== 'countdown' && <p className="half-ask">{withNote(askTemplate(q, lang, nm), target)}</p>}
        <div className={`answers n-${q.choices.length}`}>
          {q.choices.map((ch) => {
            const lb = choiceLabel(q, ch, lang, nm);
            const mine = locked === ch;
            const reveal = v.stage === 'reveal';
            const cls = reveal ? (ch === q.answer ? 'right' : mine ? 'wrongpick' : '') : mine ? 'locked' : '';
            return (
              <button
                key={String(ch)}
                className={`answer tone-${lb.tone} ${cls}`}
                disabled={v.stage !== 'answering' || locked !== undefined}
                onPointerDown={(e) => {
                  e.preventDefault();
                  c.answer(p, ch);
                }}
                data-player={p}
                data-answer={String(ch)}
              >
                <b>{lb.big}</b>
                <small>{lb.small}</small>
              </button>
            );
          })}
        </div>
        {v.stage === 'reveal' && res && (
          <p className={`half-result ${res.correct ? 'good' : ''}`} dir="ltr">
            {res.correct ? `+${res.points}` : res.answer === null ? t.timeUp : '0'}
            {res.correct && res.timeMs !== null && ` · ${(res.timeMs / 1000).toFixed(2)}s`}
            {v.last?.fastest === p && duel ? ' ⚡' : ''}
          </p>
        )}
      </section>
    );
  };

  return (
    <main className={`tournament ${split ? 'duel' : 'single'} stage-${v.stage}`}>
      {split && half(0)}
      <section className="t-center">
        <div className="t-top">
          <button className="icon-btn" onClick={onExit} aria-label={t.exit}>
            ✕
          </button>
          <span className="t-round" dir="ltr">
            {v.round + 1}/{v.rounds}
          </span>
        </div>
        {v.stage === 'countdown' ? (
          <div className="t-countdown" key={v.countdown}>
            {v.countdown}
          </div>
        ) : (
          <h2 className="ask">{withNote(askTemplate(q, lang, nm), target)}</h2>
        )}
        <TimeBar endsAt={v.stage === 'answering' ? v.windowEndsAt : null} />
      </section>
      {ghost && (
        <div className={`ghost-bar ${v.locked[1] !== undefined ? 'in' : ''}`} dir="ltr">
          <span>👻 {players[1]}</span>
          <b>{(v.standings.find((s) => s.player === 1)?.points ?? 0).toLocaleString(lang)}</b>
          <span className="ghost-state">{v.locked[1] !== undefined ? '✓' : '…'}</span>
          <span className="ghost-me">
            {t.you}: <b>{(v.standings.find((s) => s.player === 0)?.points ?? 0).toLocaleString(lang)}</b>
          </span>
        </div>
      )}
      {half(split ? 1 : 0)}
    </main>
  );
}

export function TimeBar({ endsAt }: { endsAt: number | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (endsAt === null) return;
    let raf = 0;
    const loop = () => {
      force((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [endsAt]);
  const left = endsAt === null ? 0 : Math.max(0, Math.min(1, (endsAt - performance.now()) / 10_000));
  return (
    <div className="time-bar" aria-hidden="true">
      <span style={{ width: `${left * 100}%` }} />
    </div>
  );
}

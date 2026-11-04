import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { dailySet, shareText, tournamentSet, type SetKind } from '../engine/tournament';
import type { Question } from '../engine/lesson';
import { TournamentController, type TournamentView } from '../game/tournamentController';
import { askTemplate, choiceLabel } from '../game/content';
import type { Strings } from '../i18n/strings';
import { localDay, namingFor, type Progress, type Settings } from '../storage/progress';
import { displayNote } from '../engine/pitch';
import { withNote } from './bits';
import { piano, store, tts } from './services';
import { realClock } from '../game/adapters';
import { PLAYER_COLORS } from '../engine/match';

// ======================================================================= Daily challenge

export function DailyScreen({ t, settings, progress, onBack, onProgress }: { t: Strings; settings: Settings; progress: Progress; onBack: () => void; onProgress: (p: Progress) => void }) {
  const day = localDay(new Date());
  const done = progress.daily?.[day];
  const [playing, setPlaying] = useState(false);
  const [practice, setPractice] = useState(false);
  const items = useMemo(() => dailySet(day), [day]);

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
          if (!practice) void store.recordDaily(day, points, text).then(onProgress);
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
    </main>
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
}: {
  t: Strings;
  settings: Settings;
  items: Question[];
  players: string[];
  onExit: () => void;
  onOver?: (v: TournamentView) => void;
  onRematch?: () => void;
  shareDay?: string;
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

  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const duel = players.length === 2;
  const q = v.item;
  const target = q.kind === 'degree' ? displayNote(q.target, nm, lang) : '';

  if (v.stage === 'over') {
    const winner = v.standings[0];
    const tie = duel && v.standings[0].points === v.standings[1].points && v.standings[0].totalTimeMs === v.standings[1].totalTimeMs;
    const text = shareDay ? shareText(shareDay, v.results, winner.points, lang) : '';
    return (
      <main className="recap scoreboard">
        <p className="eyebrow">{duel ? t.duel : t.dailyChallenge}</p>
        <h1>{duel ? (tie ? t.tie : `🏆 ${players[winner.player]}`) : t.gameOver}</h1>
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
      <section className={`duel-half p${p} ${duel && p === 0 ? 'flip' : ''}`} style={{ ['--pc' as string]: PLAYER_COLORS[p] }}>
        <div className="half-head">
          <span className="dot" aria-hidden="true" />
          <b>{players[p]}</b>
          <span className="half-score" dir="ltr">
            {st.points.toLocaleString(lang)}
          </span>
        </div>
        {duel && v.stage !== 'countdown' && <p className="half-ask">{withNote(askTemplate(q, lang), target)}</p>}
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
    <main className={`tournament ${duel ? 'duel' : 'single'} stage-${v.stage}`}>
      {duel && half(0)}
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
          <h2 className="ask">{withNote(askTemplate(q, lang), target)}</h2>
        )}
        <TimeBar endsAt={v.stage === 'answering' ? v.windowEndsAt : null} />
      </section>
      {half(duel ? 1 : 0)}
    </main>
  );
}

function TimeBar({ endsAt }: { endsAt: number | null }) {
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

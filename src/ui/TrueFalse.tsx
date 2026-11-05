// "True or false?" (spec addendum O): are both interval labels right? Solo 60-second run, or a duel on
// one device. Levels: clear intervals → all → Do-Re-Mi names → by ear (names hidden, the notes play).

import { useEffect, useMemo, useRef, useState } from 'react';
import { tfDifficulty, tfItem, tfPoints, TF_PENALTY_MS, TF_RUN_MS, type TFItem, type TFLevel } from '../engine/truefalse';
import { mulberry32 } from '../engine/lesson';
import { displayNote, type Naming } from '../engine/pitch';
import type { RatingEvent } from '../engine/rating';
import type { Strings } from '../i18n/strings';
import { namingFor, type Progress, type Settings } from '../storage/progress';
import { piano, store } from './services';
import { TrioArt } from './TrioArt';
import { PLAYER_COLORS } from '../engine/match';

type Mode = 'solo' | 'duel';

function useItems(level: TFLevel, seed: number) {
  const rnd = useMemo(() => mulberry32(seed), [seed]);
  const [n, setN] = useState(0);
  const [item, setItem] = useState<TFItem>(() => tfItem(level, rnd));
  const next = () => {
    setItem(tfItem(level, rnd));
    setN((x) => x + 1);
  };
  return { item, n, next };
}

function playItem(item: TFItem) {
  const events = item.midis.map((m, i) => ({ midi: m, start: i * 0.6, duration: 0.55, velocity: 0.7 }));
  void piano.play(events, 2.1, new AbortController().signal).catch(() => {});
}

function Art({ item, n, nm, lang }: { item: TFItem; n: number; nm: Naming; lang: 'he' | 'en' }) {
  const ear = item.level === 4;
  const name = (p: TFItem['trio']['left']) => (ear ? '?' : displayNote(p, item.level === 3 ? 'solfege' : nm, lang));
  return <TrioArt n={n} left={name(item.trio.left)} mid={name(item.trio.mid)} right={name(item.trio.right)} intervalLeft={item.shownLeft} intervalRight={item.shownRight} className="tf-art" />;
}

export function TrueFalseScreen({ t, settings, progress, onBack, onProgress }: { t: Strings; settings: Settings; progress: Progress; onBack: () => void; onProgress: (p: Progress) => void }) {
  const [mode, setMode] = useState<Mode>('solo');
  const [level, setLevel] = useState<TFLevel>(1);
  const [run, setRun] = useState<number | null>(null);
  const levels: [TFLevel, string][] = [
    [1, t.tfLevel1],
    [2, t.tfLevel2],
    [3, t.tfLevel3],
    [4, t.tfLevel4],
  ];
  if (run !== null)
    return mode === 'solo' ? (
      <SoloRun key={run} t={t} settings={settings} level={level} best={progress.tfBest?.[level] ?? 0} onProgress={onProgress} onExit={() => setRun(null)} onAgain={() => setRun((r) => (r ?? 0) + 1)} />
    ) : (
      <DuelRun key={run} t={t} settings={settings} level={level} onExit={() => setRun(null)} onAgain={() => setRun((r) => (r ?? 0) + 1)} />
    );
  return (
    <main className="panel-screen">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.trueFalse}</h1>
      </header>
      <p className="field-hint">{t.tfHint}</p>
      <section className="set-card">
        <fieldset className="seg-field">
          <legend>{t.players}</legend>
          <div className="seg" role="radiogroup" aria-label={t.players}>
            {(['solo', 'duel'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {m === 'solo' ? t.tfSolo : t.tfDuel}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="seg-field">
          <legend>{t.tfLevelLabel}</legend>
          <div className="seg" role="radiogroup" aria-label={t.tfLevelLabel}>
            {levels.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'on' : ''} onClick={() => setLevel(v)}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        {mode === 'solo' && <p className="field-hint">{progress.tfBest?.[level] ? `${t.personalBest}: ${progress.tfBest[level]}` : t.tfNoBest}</p>}
      </section>
      <button
        className="btn mega"
        onClick={() => {
          void piano.unlock();
          setRun(Date.now());
        }}
      >
        ▶ {t.play}
      </button>
    </main>
  );
}

function SoloRun({ t, settings, level, best, onProgress, onExit, onAgain }: { t: Strings; settings: Settings; level: TFLevel; best: number; onProgress: (p: Progress) => void; onExit: () => void; onAgain: () => void }) {
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const seed = useMemo(() => (Date.now() ^ (Math.random() * 1e9)) >>> 0, []);
  const { item, n, next } = useItems(level, seed);
  const [deadline, setDeadline] = useState(() => performance.now() + TF_RUN_MS);
  const [now, setNow] = useState(performance.now());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<null | { ok: boolean; truth: boolean }>(null);
  const [over, setOver] = useState<null | { best: boolean }>(null);
  const shownAt = useRef(performance.now());
  const events = useRef<RatingEvent[]>([]);
  const answered = useRef(0);

  useEffect(() => {
    if (over) return;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [over]);
  useEffect(() => {
    shownAt.current = performance.now();
    if (level === 4) playItem(item);
  }, [n, item, level]);
  const left = Math.max(0, deadline - now);
  useEffect(() => {
    if (left > 0 || over) return;
    void store.recordTrueFalse(level, score, events.current).then(({ progress, best: isBest }) => {
      onProgress(progress);
      setOver({ best: isBest });
      piano.cue('complete');
    });
  }, [left, over, level, score, onProgress]);

  const answer = (said: boolean) => {
    if (flash || over || left <= 0) return;
    const ok = said === item.truth;
    const timeMs = Math.round(performance.now() - shownAt.current);
    events.current.push({ id: `g:tf:${seed}:${answered.current++}`, skill: 'intervals', difficulty: tfDifficulty(level), correct: ok, at: new Date().toISOString() });
    if (ok) {
      setScore((s) => s + tfPoints(streak));
      setStreak((s) => s + 1);
      piano.cue('correct');
    } else {
      setStreak(0);
      setDeadline((d) => d - TF_PENALTY_MS);
      piano.cue('wrong');
    }
    void timeMs;
    setFlash({ ok, truth: item.truth });
    window.setTimeout(
      () => {
        setFlash(null);
        next();
      },
      ok ? 350 : 1100,
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 't') answer(true);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'f') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (over)
    return (
      <main className="recap scoreboard">
        <p className="eyebrow">{t.trueFalse}</p>
        <h1>{t.gameOver}</h1>
        <p className="big-score">
          <b dir="ltr">{score}</b>
          <small>{over.best ? `🏆 ${t.newPeak}` : `${t.personalBest}: ${Math.max(best, score)}`}</small>
        </p>
        <div className="recap-actions">
          <button className="btn mega" onClick={onAgain}>
            ↻ {t.rematch}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t.home}
          </button>
        </div>
      </main>
    );

  return (
    <main className={`tf-play ${flash ? (flash.ok ? 'flash-ok' : 'flash-no') : ''}`}>
      <div className="tf-top">
        <button className="icon-btn" onClick={onExit} aria-label={t.exit}>
          ✕
        </button>
        <span className="tf-score" dir="ltr">
          {score}
          {streak >= 5 && <small> ×{tfPoints(streak)}</small>}
        </span>
        <span className="tf-time" dir="ltr">
          {Math.ceil(left / 1000)}s
        </span>
      </div>
      <div className="time-bar" aria-hidden="true">
        <span style={{ width: `${(left / TF_RUN_MS) * 100}%` }} />
      </div>
      <Art item={item} n={n} nm={nm} lang={lang} />
      <p className="tf-ask">{t.tfAsk}</p>
      {flash && !flash.ok && (
        <p className="tf-why" dir="ltr">
          {flash.truth ? t.tfWasTrue : `${t.tfWasFalse}: ${item.trio.intervalLeft} · ${item.trio.intervalRight}`}
        </p>
      )}
      <div className="tf-buttons">
        <button className="answer tone-mint tf-true" onPointerDown={(e) => (e.preventDefault(), answer(true))} disabled={!!flash}>
          <b>✓</b>
          <small>{t.tfTrue}</small>
        </button>
        <button className="answer tone-coral tf-false" onPointerDown={(e) => (e.preventDefault(), answer(false))} disabled={!!flash}>
          <b>✗</b>
          <small>{t.tfFalse}</small>
        </button>
      </div>
      {level === 4 && (
        <button className="btn small" onClick={() => playItem(item)}>
          ↻ {t.repeat}
        </button>
      )}
    </main>
  );
}

const DUEL_ROUNDS = 10;

function DuelRun({ t, settings, level, onExit, onAgain }: { t: Strings; settings: Settings; level: TFLevel; onExit: () => void; onAgain: () => void }) {
  const lang = settings.uiLang;
  const nm = namingFor(settings.naming, lang);
  const seed = useMemo(() => (Date.now() ^ (Math.random() * 1e9)) >>> 0, []);
  const { item, n, next } = useItems(level, seed);
  const [scores, setScores] = useState([0, 0]);
  const [locked, setLocked] = useState<[boolean, boolean]>([false, false]);
  const [winner, setWinner] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (level === 4) playItem(item);
  }, [n, item, level]);
  const nextRound = () => {
    window.setTimeout(() => {
      setWinner(null);
      setLocked([false, false]);
      setRound((r) => r + 1);
      next();
    }, 1300);
  };
  const answer = (p: number, said: boolean) => {
    if (winner !== null || locked[p] || round >= DUEL_ROUNDS) return;
    if (said === item.truth) {
      setWinner(p);
      setScores((s) => s.map((x, i) => (i === p ? x + 1 : x)));
      piano.cue('correct');
      nextRound();
    } else {
      const l: [boolean, boolean] = [...locked] as [boolean, boolean];
      l[p] = true;
      setLocked(l);
      piano.cue('wrong');
      if (l[0] && l[1]) {
        setWinner(-1);
        nextRound();
      }
    }
  };
  const names = [`${t.playerN} 1`, `${t.playerN} 2`];
  if (round >= DUEL_ROUNDS) {
    const w = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    return (
      <main className="recap scoreboard">
        <p className="eyebrow">{t.trueFalse}</p>
        <h1>{w === null ? t.tie : `🏆 ${names[w]}`}</h1>
        <ol className="board">
          {[0, 1].map((p) => (
            <li key={p} style={{ ['--pc' as string]: PLAYER_COLORS[p] }}>
              <span className="dot" aria-hidden="true" />
              <span className="pname">{names[p]}</span>
              <span className="pbest" dir="ltr">
                {scores[p]}
              </span>
            </li>
          ))}
        </ol>
        <div className="recap-actions">
          <button className="btn mega" onClick={onAgain}>
            ↻ {t.rematch}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t.home}
          </button>
        </div>
      </main>
    );
  }
  const half = (p: number) => (
    <section className={`duel-half p${p} ${p === 0 ? 'flip' : ''} ${winner === p ? 'won' : ''}`} style={{ ['--pc' as string]: PLAYER_COLORS[p] }}>
      <div className="half-head">
        <span className="dot" aria-hidden="true" />
        <b>{names[p]}</b>
        <span className="half-score" dir="ltr">
          {scores[p]}
        </span>
      </div>
      <div className="tf-buttons">
        <button className="answer tone-mint" data-player={p} data-answer="true" disabled={locked[p] || winner !== null} onPointerDown={(e) => (e.preventDefault(), answer(p, true))}>
          <b>✓</b>
          <small>{t.tfTrue}</small>
        </button>
        <button className="answer tone-coral" data-player={p} data-answer="false" disabled={locked[p] || winner !== null} onPointerDown={(e) => (e.preventDefault(), answer(p, false))}>
          <b>✗</b>
          <small>{t.tfFalse}</small>
        </button>
      </div>
    </section>
  );
  return (
    <main className="tournament duel tf-duel">
      {half(0)}
      <section className="t-center">
        <div className="t-top">
          <button className="icon-btn" onClick={onExit} aria-label={t.exit}>
            ✕
          </button>
          <span className="t-round" dir="ltr">
            {round + 1}/{DUEL_ROUNDS}
          </span>
        </div>
        <Art item={item} n={n} nm={nm} lang={lang} />
        {winner !== null && (
          <p className="tf-why" dir="ltr">
            {item.truth ? t.tfWasTrue : `${t.tfWasFalse}: ${item.trio.intervalLeft} · ${item.trio.intervalRight}`}
          </p>
        )}
      </section>
      {half(1)}
    </main>
  );
}

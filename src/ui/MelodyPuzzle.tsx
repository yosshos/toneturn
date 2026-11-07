// Melody Puzzle (spec AE §8): hear a melody (cadence first), put note tiles into slots — drag, tap-to-place or
// keyboard. Replays cost points. Solo game: the host app persists `saved` (the current puzzle) and results.

import '../games3.css';
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import {
  answerEvents,
  checkPuzzle,
  MAX_PUZZLE_LEVEL,
  nextLevel,
  puzzleAt,
  puzzleEvents,
  puzzlePoints,
  PUZZLES_PER_RUN,
  tileLabel,
  type PuzzleLevel,
  type TileNaming,
} from '../engine/melodyPuzzle';
import { displayNote } from '../engine/pitch';
import { namingFor, type Settings } from '../storage/progress';
import { piano } from './services';

type Lang = 'he' | 'en';
type Text = { en: string; he: string };

export interface PuzzleSaved {
  v: 1;
  game: 'melody-puzzle';
  runSeed: number;
  level: PuzzleLevel;
  index: number;
  score: number;
  streak: number;
  labels: 'degrees' | 'names';
  placed: (string | null)[];
  /** Hearings so far (the first is free). */
  plays: number;
  checks: number;
  elapsedMs: number;
  solved: boolean;
  revealed: boolean;
  wrong: boolean[] | null;
  /** Level → highest reached (for the result). */
  topLevel: PuzzleLevel;
}

export function isPuzzleSaved(x: unknown): x is PuzzleSaved {
  const s = x as PuzzleSaved | null;
  return !!s && s.v === 1 && s.game === 'melody-puzzle' && Array.isArray(s.placed) && typeof s.level === 'number';
}

const T = {
  title: { en: 'Melody Puzzle', he: 'פאזל מנגינה' },
  back: { en: 'Back', he: 'חזרה' },
  level: { en: 'Start level', he: 'רמת פתיחה' },
  labels: { en: 'Tiles show', he: 'על האריחים' },
  degrees: { en: 'Degrees', he: 'דרגות' },
  names: { en: 'Note names', he: 'שמות תווים' },
  start: { en: 'Start', he: 'מתחילים' },
  cont: { en: 'Continue puzzle', he: 'להמשיך את הפאזל' },
  listen: { en: 'Listen', he: 'האזינו' },
  again: { en: 'Again', he: 'שוב' },
  mine: { en: 'Hear my answer', he: 'השמיעו את התשובה שלי' },
  check: { en: 'Check', he: 'בדיקה' },
  reveal: { en: 'Show answer', he: 'הראו תשובה' },
  next: { en: 'Next puzzle', he: 'הפאזל הבא' },
  finish: { en: 'Finish', he: 'סיום' },
  solved: { en: 'Solved!', he: 'נפתר!' },
  notYet: { en: 'Not yet — the red slots are wrong.', he: 'עוד לא — המשבצות האדומות שגויות.' },
  revealed: { en: 'Here is the melody.', he: 'הנה המנגינה.' },
  listenFirst: { en: 'Listen first: the key, then the melody.', he: 'קודם מאזינים: הסולם, ואז המנגינה.' },
  howTo: {
    en: 'Drag a tile into a slot, or tap a tile to put it in the next empty slot. Tap a filled slot to take it back.',
    he: 'גררו אריח למשבצת, או הקישו על אריח כדי לשים אותו במשבצת הפנויה הבאה. הקשה על משבצת מלאה מחזירה אותו.',
  },
  decoyNote: { en: 'One or two tiles are not in the melody.', he: 'אריח או שניים אינם במנגינה.' },
  puzzle: { en: 'Puzzle', he: 'פאזל' },
  score: { en: 'Score', he: 'ניקוד' },
  major: { en: 'major', he: 'מז׳ור' },
  minor: { en: 'minor', he: 'מינור' },
  slot: { en: 'Slot', he: 'משבצת' },
  empty: { en: 'empty', he: 'ריקה' },
  tray: { en: 'Tiles', he: 'אריחים' },
  over: { en: 'Puzzles done', he: 'הפאזלים הושלמו' },
  reached: { en: 'Level reached', he: 'רמה שהושגה' },
  playAgain: { en: 'Play again', he: 'שוב' },
  exit: { en: 'Exit', he: 'יציאה' },
  points: { en: 'points', he: 'נקודות' },
  cost: { en: '−10', he: '‎−10' },
} satisfies Record<string, Text>;

const LEVEL_BLURB: Record<PuzzleLevel, Text> = {
  1: { en: '3 notes, by step', he: '3 תווים, בצעדים' },
  2: { en: '4 notes, by step', he: '4 תווים, בצעדים' },
  3: { en: '5 notes, steps and thirds', he: '5 תווים, צעדים וטרצות' },
  4: { en: '5 notes, leaps', he: '5 תווים, קפיצות' },
  5: { en: '6 notes, leaps', he: '6 תווים, קפיצות' },
  6: { en: '6 notes, minor', he: '6 תווים, מינור' },
  7: { en: '7 notes, big leaps, major or minor', he: '7 תווים, קפיצות גדולות, מז׳ור או מינור' },
  8: { en: '8 notes, chromatic', he: '8 תווים, כרומטי' },
};

const fresh = (runSeed: number, level: PuzzleLevel, labels: 'degrees' | 'names'): PuzzleSaved => {
  const p = puzzleAt(level, runSeed);
  return { v: 1, game: 'melody-puzzle', runSeed, level, index: 0, score: 0, streak: 0, labels, placed: p.answer.map(() => null), plays: 0, checks: 0, elapsedMs: 0, solved: false, revealed: false, wrong: null, topLevel: level };
};
const puzzleSeed = (st: PuzzleSaved) => (st.runSeed + st.index * 7919) >>> 0;

export function MelodyPuzzle({
  lang,
  settings,
  saved,
  onSave,
  onExit,
  onResult,
}: {
  lang: Lang;
  settings: Settings;
  saved: unknown | null;
  onSave: (state: unknown | null) => void;
  onExit: () => void;
  onResult: (r: { game: 'highway' | 'melody-puzzle'; score: number; detail?: unknown }) => void;
}) {
  const tx = (o: Text) => o[lang];
  const resumable = isPuzzleSaved(saved) ? saved : null;
  const [stage, setStage] = useState<'intro' | 'play' | 'done'>('intro');
  const [startLevel, setStartLevel] = useState<PuzzleLevel>(resumable?.level ?? 1);
  const [labels, setLabels] = useState<'degrees' | 'names'>(resumable?.labels ?? 'degrees');
  const [st, setSt] = useState<PuzzleSaved | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const sinceRef = useRef(0); // performance.now() when this screen began timing the current puzzle
  const dragRef = useRef<{ id: string; x0: number; y0: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const puzzle = useMemo(() => (st ? puzzleAt(st.level, puzzleSeed(st)) : null), [st?.level, st?.runSeed, st?.index]);
  const naming: TileNaming = labels === 'degrees' ? 'degrees' : namingFor(settings.naming, lang);

  useEffect(() => () => acRef.current?.abort(), []);

  const elapsed = (s: PuzzleSaved) => s.elapsedMs + (sinceRef.current ? performance.now() - sinceRef.current : 0);
  const commit = (s: PuzzleSaved) => {
    setSt(s);
    onSave({ ...s, elapsedMs: Math.round(elapsed(s)) });
  };

  const begin = (s: PuzzleSaved) => {
    sinceRef.current = performance.now();
    setActiveSlot(null);
    setLastPoints(null);
    setSt(s);
    setStage('play');
  };

  const play = async (what: 'puzzle' | 'answer') => {
    if (!st || !puzzle) return;
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      await piano.unlock();
    } catch {
      /* try anyway */
    }
    if (what === 'puzzle') commit({ ...st, plays: st.plays + 1 });
    const { events, length } = what === 'puzzle' ? puzzleEvents(puzzle, 92, true) : answerEvents(puzzle, st.placed);
    setPlaying(true);
    try {
      await piano.play(events, length, ac.signal);
    } catch {
      /* stopped */
    }
    if (acRef.current === ac) setPlaying(false);
  };

  const place = (id: string, slot?: number) => {
    if (!st || st.solved || st.revealed) return;
    const placed = st.placed.map((x) => (x === id ? null : x));
    const target = slot ?? activeSlot ?? placed.findIndex((x) => x === null);
    if (target < 0 || target >= placed.length) return;
    placed[target] = id;
    const wrong = st.wrong ? st.wrong.map((w, i) => (i === target ? false : w)) : null;
    commit({ ...st, placed, wrong });
    const nextEmpty = placed.findIndex((x, i) => x === null && i > target);
    setActiveSlot(nextEmpty >= 0 ? nextEmpty : placed.findIndex((x) => x === null) >= 0 ? placed.findIndex((x) => x === null) : null);
  };

  const tapSlot = (i: number) => {
    if (!st || st.solved || st.revealed) return;
    if (st.placed[i]) {
      const placed = st.placed.slice();
      placed[i] = null;
      commit({ ...st, placed, wrong: st.wrong ? st.wrong.map((w, k) => (k === i ? false : w)) : null });
      setActiveSlot(i);
    } else setActiveSlot((a) => (a === i ? null : i));
  };

  const check = () => {
    if (!st || !puzzle) return;
    const r = checkPuzzle(puzzle, st.placed);
    const checks = st.checks + 1;
    if (r.solved) {
      const pts = puzzlePoints({ notes: puzzle.answer.length, replays: Math.max(0, st.plays - 1), checks, ms: elapsed(st) });
      setLastPoints(pts);
      piano.cue('correct');
      commit({ ...st, checks, solved: true, wrong: null, score: st.score + pts, streak: checks === 1 ? st.streak + 1 : 0 });
    } else {
      piano.cue('wrong');
      commit({ ...st, checks, wrong: r.correct.map((c) => !c) });
    }
  };

  const reveal = () => {
    if (!st || !puzzle) return;
    const pool = puzzle.tiles.filter((t) => !t.decoy);
    const used = new Set<string>();
    const placed = puzzle.answer.map((s) => {
      const t = pool.find((x) => x.semis === s && !used.has(x.id))!;
      used.add(t.id);
      return t.id;
    });
    setLastPoints(0);
    commit({ ...st, placed, revealed: true, wrong: null, streak: 0 });
    void play('answer');
  };

  const next = () => {
    if (!st) return;
    acRef.current?.abort();
    const index = st.index + 1;
    if (index >= PUZZLES_PER_RUN) {
      setStage('done');
      onSave(null);
      onResult({ game: 'melody-puzzle', score: st.score, detail: { puzzles: PUZZLES_PER_RUN, startLevel, topLevel: st.topLevel, labels: st.labels } });
      return;
    }
    const nl = nextLevel(st.level, st.streak);
    const base: PuzzleSaved = { ...st, index, level: nl.level, streak: nl.streak, topLevel: Math.max(st.topLevel, nl.level) as PuzzleLevel, plays: 0, checks: 0, elapsedMs: 0, solved: false, revealed: false, wrong: null, placed: [] };
    const p = puzzleAt(base.level, puzzleSeed(base));
    const s2 = { ...base, placed: p.answer.map(() => null) };
    sinceRef.current = performance.now();
    setActiveSlot(null);
    setLastPoints(null);
    commit(s2);
  };

  // Pointer drag (works with touch); a click without movement is tap-to-place.
  const onTileDown = (e: RPointerEvent, id: string) => {
    if (!st || st.solved || st.revealed) return;
    dragRef.current = { id, x0: e.clientX, y0: e.clientY, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onTileMove = (e: RPointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 8) d.moved = true;
    if (d.moved) setDrag({ id: d.id, x: e.clientX, y: e.clientY });
  };
  const onTileUp = (e: RPointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d?.moved) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null;
    if (el) place(d.id, Number(el.dataset.slot));
  };

  // Keyboard: digits 1–9 pick the nth tile in the tray; Backspace clears the active / last slot.
  useEffect(() => {
    if (stage !== 'play' || !st || !puzzle) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (/^Digit[1-9]$/.test(e.code)) {
        const tray = puzzle.tiles.filter((t) => !st.placed.includes(t.id));
        const t = tray[Number(e.code.slice(5)) - 1];
        if (t) {
          e.preventDefault();
          place(t.id);
        }
      } else if (e.code === 'Backspace') {
        const i = activeSlot !== null && st.placed[activeSlot] ? activeSlot : st.placed.map((x, k) => (x ? k : -1)).filter((k) => k >= 0).pop();
        if (i !== undefined && i >= 0) {
          e.preventDefault();
          tapSlot(i);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ------------------------------------------------------------- intro
  if (stage === 'intro') {
    return (
      <main className="panel-screen g3 mp-intro">
        <header className="screen-head">
          <button className="icon-btn" onClick={onExit} aria-label={tx(T.back)}>
            <span className="flip-rtl">←</span>
          </button>
          <h1>{tx(T.title)}</h1>
        </header>
        <section className="set-card">
          <fieldset className="seg-field">
            <legend>{tx(T.labels)}</legend>
            <div className="seg" role="radiogroup" aria-label={tx(T.labels)}>
              {(['degrees', 'names'] as const).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={labels === l} className={labels === l ? 'on' : ''} onClick={() => setLabels(l)}>
                  {tx(l === 'degrees' ? T.degrees : T.names)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="seg-field">
            <legend>{tx(T.level)}</legend>
            <div className="mp-levels" role="radiogroup" aria-label={tx(T.level)}>
              {Array.from({ length: MAX_PUZZLE_LEVEL }, (_, i) => (i + 1) as PuzzleLevel).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={startLevel === l} className={`g3-chip wide ${startLevel === l ? 'on' : ''}`} onClick={() => setStartLevel(l)}>
                  <b dir="ltr">{l}</b>
                  <small>{tx(LEVEL_BLURB[l])}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <p className="field-hint">{tx(T.howTo)}</p>
        </section>
        {resumable && (
          <button className="btn primary mega" data-resume-puzzle="1" onClick={() => {
            setLabels(resumable.labels);
            begin(resumable);
          }}>
            {tx(T.cont)}{' '}
            <bdi dir="ltr">
              {resumable.index + 1}/{PUZZLES_PER_RUN}
            </bdi>
          </button>
        )}
        <button
          className={`btn ${resumable ? 'ghost' : 'primary mega'}`}
          data-start-puzzle="1"
          onClick={() => {
            const s = fresh((Date.now() ^ (Math.random() * 1e9)) >>> 0, startLevel, labels);
            begin(s);
            onSave(s);
          }}
        >
          {tx(T.start)}
        </button>
      </main>
    );
  }

  // ------------------------------------------------------------- done
  if (stage === 'done' && st) {
    return (
      <main className="recap g3 mp-done">
        <p className="eyebrow">{tx(T.title)}</p>
        <h1>{tx(T.over)}</h1>
        <p className="big-score">
          <small>{tx(T.score)}</small>
          <b dir="ltr">{st.score}</b>
          <small>{tx(T.points)}</small>
        </p>
        <p className="field-hint">
          {tx(T.reached)} <bdi dir="ltr">{st.topLevel}</bdi> · {tx(LEVEL_BLURB[st.topLevel])}
        </p>
        <div className="recap-actions">
          <button
            className="btn primary mega"
            onClick={() => {
              const s = fresh((Date.now() ^ (Math.random() * 1e9)) >>> 0, st.topLevel, labels);
              begin(s);
              onSave(s);
            }}
          >
            {tx(T.playAgain)}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {tx(T.exit)}
          </button>
        </div>
      </main>
    );
  }

  if (!st || !puzzle) return null;

  // ------------------------------------------------------------- play
  const byId = new Map(puzzle.tiles.map((t) => [t.id, t]));
  const tray = puzzle.tiles.filter((t) => !st.placed.includes(t.id));
  const full = st.placed.every(Boolean);
  const finished = st.solved || st.revealed;
  const keyName = displayNote(puzzle.key, namingFor(settings.naming, lang), lang);
  const dragTile = drag ? byId.get(drag.id) : null;

  return (
    <main className="g3 mp-play">
      <header className="lesson-top mp-top">
        <button className="icon-btn" onClick={onExit} aria-label={tx(T.exit)}>
          ✕
        </button>
        <div className="hw-stat">
          <small>{tx(T.puzzle)}</small>
          <b dir="ltr">
            {st.index + 1}/{PUZZLES_PER_RUN}
          </b>
        </div>
        <div className="hw-stat">
          <small>{tx(T.score)}</small>
          <b dir="ltr">{st.score}</b>
        </div>
        <div className="mp-key">
          <bdi dir="ltr">{keyName}</bdi> {tx(puzzle.minor ? T.minor : T.major)} · <bdi dir="ltr">L{st.level}</bdi>
        </div>
      </header>

      <div className="mp-listen">
        <button className="btn mega" onClick={() => void play('puzzle')} disabled={playing} data-listen="1">
          ▶ {st.plays === 0 ? tx(T.listen) : tx(T.again)}
          {st.plays > 0 && !finished && <small className="mp-cost" dir="ltr">−10</small>}
        </button>
        {st.plays === 0 && <p className="field-hint">{tx(T.listenFirst)}</p>}
      </div>

      <ol className="mp-slots" dir="ltr" aria-label={tx(T.slot)}>
        {st.placed.map((id, i) => {
          const t = id ? byId.get(id) : null;
          const cls = [
            'mp-slot',
            t ? 'filled' : '',
            activeSlot === i && !finished ? 'active' : '',
            st.wrong?.[i] ? 'wrong' : '',
            finished ? 'right' : '',
          ].join(' ');
          return (
            <li key={i}>
              <button
                type="button"
                className={cls}
                data-slot={i}
                onClick={() => tapSlot(i)}
                aria-label={`${tx(T.slot)} ${i + 1}: ${t ? tileLabel(t, naming, lang) : tx(T.empty)}`}
                aria-pressed={activeSlot === i}
                disabled={finished}
              >
                <span className="mp-n">{i + 1}</span>
                {t && <span className="mp-tile-face">{tileLabel(t, naming, lang)}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      {!finished && (
        <div className="mp-tray" dir="ltr" role="group" aria-label={tx(T.tray)}>
          {tray.map((t, k) => (
            <button
              key={t.id}
              type="button"
              className={`mp-tile ${drag?.id === t.id ? 'lifting' : ''}`}
              data-tile={t.id}
              onPointerDown={(e) => onTileDown(e, t.id)}
              onPointerMove={onTileMove}
              onPointerUp={onTileUp}
              onPointerCancel={() => {
                dragRef.current = null;
                setDrag(null);
              }}
              onClick={() => {
                if (suppressClick.current) return;
                place(t.id);
              }}
              aria-keyshortcuts={k < 9 ? String(k + 1) : undefined}
            >
              {tileLabel(t, naming, lang)}
            </button>
          ))}
        </div>
      )}
      {!finished && <p className="hint">{tx(T.decoyNote)}</p>}

      {dragTile && drag && (
        <div className="mp-tile mp-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {tileLabel(dragTile, naming, lang)}
        </div>
      )}

      <div className={`feedback ${st.solved ? 'correct' : st.revealed ? 'unclear' : st.wrong ? 'retry' : 'empty'}`} aria-live="assertive">
        {st.solved ? (
          <b>
            {tx(T.solved)} <bdi dir="ltr">+{lastPoints ?? 0}</bdi>
          </b>
        ) : st.revealed ? (
          <b>{tx(T.revealed)}</b>
        ) : st.wrong ? (
          <b>{tx(T.notYet)}</b>
        ) : null}
      </div>

      <div className="mp-actions">
        {!finished ? (
          <>
            <button className="btn mega" onClick={check} disabled={!full}>
              ✓ {tx(T.check)}
            </button>
            <button className="btn" onClick={() => void play('answer')} disabled={playing || !st.placed.some(Boolean)}>
              {tx(T.mine)}
            </button>
            {st.checks >= 2 && (
              <button className="btn ghost" onClick={reveal}>
                {tx(T.reveal)}
              </button>
            )}
          </>
        ) : (
          <>
            <button className="btn mega" onClick={next} data-next-puzzle="1">
              {st.index + 1 >= PUZZLES_PER_RUN ? tx(T.finish) : tx(T.next)} <span className="flip-rtl">→</span>
            </button>
            <button className="btn" onClick={() => void play('puzzle')} disabled={playing}>
              ▶ {tx(T.listen)}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

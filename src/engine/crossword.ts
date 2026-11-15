// Changes Crossword (AUDIT-GAMES §4.2 #4): grid dictation as a puzzle. Hear 4 bars (8 at ff); fill each bar's root,
// quality and (mp–f) bass. "Check" locks every part that is right — the letters of a crossword lock one by one — and
// the wrong parts get one more try (only those bars replayed); the credit is the first try plus half of what the fix
// recovers (progGrid.gridCredit). Partial credit per part: root 0.5, quality 0.3, bass 0.2 (progGrid.GRID_W).
//
// Tiers: pp I / IV / V (and vi) triads · p ii–V with sevenths · mp secondary dominants (+ a passing inversion) ·
// mf borrowed chords (iv, ♭VI, ♭VII7, iiø–V in major, the backdoor) · f tritone subs · ff a standard's A section
// (8 bars). Spelled for the key (progGrid.realize); root chips are pitch classes, so enharmonics are the same note.
// All 12 keys (cycle of 4ths across a run). Pure.

import { GQ_IV, bassPcOf, gradeGridCells, gridCredit, realize, rootChips, suffixOf, GX_LABEL, type DChord, type GChord, type GQ, type GX, type GridCell, type GridGrade, type GridVoicing } from './progGrid';
import { cycleKey, itemSeed, pc, pickOf, rng } from './newGamesKit';
import type { DynName } from './courseSocial';

const C = (deg: string, q: GQ, x: GX = 'none'): DChord => ({ deg, q, x, beats: 4 });
export const CW_PUZZLES = 5;
export const cwLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

const TRIADS: Record<string, GQ> = { '1': 'maj', '4': 'maj', '5': 'maj', '6': 'm' };
/** The templates per level (degrees of the major tonic). */
export const CW_TEMPLATES: Record<number, DChord[][]> = {
  2: [
    [C('1', 'maj7'), C('6', 'm7'), C('2', 'm7'), C('5', '7')],
    [C('2', 'm7'), C('5', '7'), C('1', 'maj7'), C('6', 'm7')],
    [C('3', 'm7'), C('6', 'm7'), C('2', 'm7'), C('5', '7')],
    [C('1', 'maj7'), C('4', 'maj7'), C('2', 'm7'), C('5', '7')],
    [C('2', 'm7'), C('5', '7'), C('3', 'm7'), C('6', 'm7')],
  ],
  // Secondary dominants: each resolves down a 5th to the next bar (V/ii, V/IV, V/vi, V/V, ii–V of vi).
  3: [
    [C('1', 'maj7'), C('6', '7'), C('2', 'm7'), C('5', '7')],
    [C('1', 'maj7'), C('1', '7'), C('4', 'maj7'), C('5', '7')],
    [C('1', 'maj7'), C('3', '7'), C('6', 'm7'), C('5', '7')],
    [C('6', 'm7'), C('2', '7'), C('5', '7'), C('1', 'maj7')],
    [C('1', 'maj7'), C('7', 'm7b5'), C('3', '7'), C('6', 'm7')],
  ],
  // Borrowed from the parallel minor: the minor plagal iv, ♭VI–♭VII–I, iiø–V in major, the backdoor iv7–♭VII7–I.
  4: [
    [C('1', 'maj7'), C('4', 'maj7'), C('4', 'm6'), C('1', 'maj7')],
    [C('1', 'maj7'), C('b6', 'maj7'), C('b7', '7'), C('1', 'maj7')],
    [C('1', 'maj7'), C('2', 'm7b5'), C('5', '7'), C('1', 'maj7')],
    [C('1', 'maj7'), C('4', 'm7'), C('b7', '7'), C('1', 'maj7')],
    [C('6', 'm7'), C('4', 'm6'), C('1', 'maj7'), C('5', '7')],
  ],
  // Tritone subs: ♭II7 for V7, ♭VI7 for II7 (V/V), ♭III7 for VI7 (V/ii), ♭VII7 for III7 (V/vi).
  5: [
    [C('1', 'maj7'), C('6', 'm7'), C('2', 'm7'), C('b2', '7')],
    [C('2', 'm7'), C('b2', '7'), C('1', 'maj7'), C('6', 'm7')],
    [C('6', 'm7'), C('b6', '7'), C('5', '7'), C('1', 'maj7')],
    [C('3', 'm7'), C('b3', '7'), C('2', 'm7'), C('b2', '7')],
    [C('1', 'maj7'), C('b7', '7'), C('6', 'm7'), C('5', '7')],
  ],
  // A sections, one chord a bar (chord charts only): a falling-5ths minor A, a minor bossa A, ii–V–I's down a step.
  6: [
    [C('2', 'm7'), C('5', '7'), C('1', 'maj7'), C('4', 'maj7'), C('7', 'm7b5'), C('3', '7'), C('6', 'm6'), C('6', 'm6')],
    [C('6', 'm7'), C('6', 'm7'), C('2', 'm7'), C('2', 'm7'), C('7', 'm7b5'), C('3', '7'), C('6', 'm7'), C('6', 'm7')],
    [C('2', 'm7'), C('5', '7'), C('1', 'maj7'), C('1', 'maj7'), C('1', 'm7'), C('4', '7'), C('b7', 'maj7'), C('b7', 'maj7')],
  ],
};
export const CW_QUALITIES: Record<number, GQ[]> = { 1: ['maj', 'm'], 2: ['maj7', 'm7', '7'], 3: ['maj7', 'm7', '7', 'm7b5'], 4: ['maj7', 'm7', '7', 'm7b5', 'm6'], 5: ['maj7', 'm7', '7', 'm7b5'], 6: ['maj7', 'm7', '7', 'm7b5', 'm6'] };
/** The bass row (which chord tone is in the bass): mp–f. */
export const CW_BASS: GX[] = ['none', '/3', '/5', '/7'];
export const cwAsksBass = (level: number): boolean => level >= 3 && level <= 5;
const VOICING: Record<number, GridVoicing> = { 1: 'close', 2: 'close', 3: 'close', 4: 'shell', 5: 'shell', 6: 'rootless' };
const BPM: Record<number, number> = { 1: 84, 2: 88, 3: 92, 4: 92, 5: 96, 6: 108 };

export interface CwPuzzle {
  level: number;
  key: number;
  cells: GChord[];
  qualities: GQ[];
  /** Bass options ([] = the bass is not asked). */
  extras: GX[];
  /** Root chip names by pitch class (spelled for the key). */
  spell: string[];
  bpm: number;
  voicing: GridVoicing;
}

/** One passing inversion (mp–f): a middle bar whose 3rd / 5th / 7th in the bass makes a step from the bar before and to the bar after. */
export function passingInversion(rnd: () => number, cs: DChord[], key: number): DChord[] {
  const out = cs.map((c) => ({ ...c }));
  const bassOf = (c: DChord) => bassPcOf(realize(key, c));
  const cands: { i: number; x: GX }[] = [];
  for (let i = 1; i < out.length - 1; i++)
    for (const x of ['/3', '/5', '/7'] as GX[]) {
      if (x === '/7' && GQ_IV[out[i].q].length < 4) continue;
      const b = bassOf({ ...out[i], x });
      const step = (a: number, z: number) => {
        const d = Math.abs(pc(a - z));
        return Math.min(d, 12 - d) <= 2 && a !== z;
      };
      if (step(b, bassOf(out[i - 1])) && step(b, bassOf(out[i + 1]))) cands.push({ i, x });
    }
  if (cands.length && rnd() < 0.75) {
    const c = pickOf(rnd, cands);
    out[c.i].x = c.x;
  }
  return out;
}

/** Puzzle i of a run (seeded). */
export function cwPuzzle(seed: number, level: number, i: number): CwPuzzle {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const rnd = rng(itemSeed(seed, i) ^ 0xc805);
  const key = cycleKey(seed, i);
  let ds: DChord[];
  if (lv === 1) {
    const degs: string[] = ['1'];
    while (degs.length < 4) {
      const nx = pickOf(rnd, ['4', '5', '6', '1'].filter((d) => d !== degs[degs.length - 1]));
      degs.push(nx);
    }
    if (!degs.includes('4') && !degs.includes('5')) degs[2] = '5';
    ds = degs.map((d) => C(d, TRIADS[d]));
  } else ds = pickOf(rnd, CW_TEMPLATES[lv]).map((c) => ({ ...c }));
  if (cwAsksBass(lv)) ds = passingInversion(rnd, ds, key);
  const cells = ds.map((d) => realize(key, d));
  return { level: lv, key, cells, qualities: CW_QUALITIES[lv], extras: cwAsksBass(lv) ? CW_BASS : [], spell: rootChips(key, ds), bpm: BPM[lv], voicing: VOICING[lv] };
}

/** One bar of the player's answer (null = not filled yet). */
export interface CwCell {
  root: number | null;
  q: GQ | null;
  x: GX | null;
}
export const emptyCells = (n: number): CwCell[] => Array.from({ length: n }, () => ({ root: null, q: null, x: null }));
/** Is every asked part of every bar filled? */
export const cwFilled = (p: CwPuzzle, cells: CwCell[]): boolean => cells.every((c) => c.root !== null && c.q !== null && (!p.extras.length || c.x !== null));

/** Grade an answer (a part left empty is wrong). */
export function cwGrade(p: CwPuzzle, cells: CwCell[]): GridGrade {
  const asked = p.extras.length > 0;
  const want: GridCell[] = p.cells.map((c) => ({ root: c.root, q: c.q, x: asked ? c.x : 'none' }));
  // An empty part never matches (NaN root, an unknown quality / bass).
  const got: GridCell[] = cells.map((c) => ({ root: c.root ?? NaN, q: c.q ?? ('__' as GQ), x: asked ? (c.x ?? ('__' as GX)) : 'none' }));
  return gradeGridCells(want, got, asked);
}
/** The parts that lock after a check (right ones). */
export interface CwLocks {
  root: boolean[];
  q: boolean[];
  x: boolean[];
}
export const locksOf = (g: GridGrade): CwLocks => ({ root: g.marks.map((m) => m.root), q: g.marks.map((m) => m.quality), x: g.marks.map((m) => m.extra) });
/** The bars to replay in the fix pass (any part wrong). */
export const fixBars = (g: GridGrade): number[] => g.marks.flatMap((m, i) => (m.ok ? [] : [i]));
/** A puzzle's credit (0..1) and its points. */
export const cwCredit = (first: number, fixed: number | null): number => gridCredit(first, fixed);
export const cwPoints = (credit: number, level: number): number => Math.round(credit * 100 * (1 + 0.1 * (level - 1)));

/** A bar's symbol as the key writes it (with its slash bass name where asked). */
export const cellText = (p: CwPuzzle, i: number): string => {
  const c = p.cells[i];
  return p.extras.length ? c.sym : `${p.spell[c.root]}${suffixOf(c.q, 'none')}`;
};

/** "Why?" (wrong answers only): the first wrong bar, what it was, the part missed. */
export function cwWhy(p: CwPuzzle, g: GridGrade, lang: 'en' | 'he'): string | null {
  const i = g.marks.findIndex((m) => !m.ok);
  if (i < 0) return null;
  const m = g.marks[i];
  const w = p.cells[i];
  const he = lang === 'he';
  const part = !m.root ? (he ? 'שמעו את הבס: לאן היסוד זז' : 'follow the bass: where the root moves') : !m.quality ? (he ? 'שמעו את הטרצה ואת הספטימה' : 'listen for the 3rd and the 7th') : he ? `בבס: ${w.x === 'none' ? 'השורש' : GX_LABEL[w.x]}` : `in the bass: ${w.x === 'none' ? 'the root' : GX_LABEL[w.x]}`;
  return he ? `תיבה ${i + 1}: ${cellText(p, i)} — ${part}.` : `Bar ${i + 1}: ${cellText(p, i)} — ${part}.`;
}

// ---------------------------------------------------------------- the run

export interface CwSave {
  v: 1;
  game: 'crossword';
  seed: number;
  tier?: DynName;
  level: number;
  /** Credits of the finished puzzles (0..1). */
  credits: number[];
  score: number;
}
export const newCwSave = (seed: number, level: number, tier?: DynName): CwSave => ({ v: 1, game: 'crossword', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), credits: [], score: 0, ...(tier ? { tier } : {}) });
export function isCwSave(x: unknown): x is CwSave {
  const s = x as CwSave | null;
  return !!s && s.v === 1 && s.game === 'crossword' && typeof s.seed === 'number' && Array.isArray(s.credits) && s.credits.length < CW_PUZZLES;
}
export const cwAdd = (s: CwSave, credit: number): CwSave => ({ ...s, credits: [...s.credits, credit], score: s.score + cwPoints(credit, s.level) });
export const cwOver = (s: CwSave): boolean => s.credits.length >= CW_PUZZLES;
/** The finished run: right = puzzles at ≥ 90 % credit. */
export function cwResult(s: CwSave) {
  const right = s.credits.filter((c) => c >= 0.9).length;
  const accuracy = Math.round((100 * s.credits.reduce((a, b) => a + b, 0)) / Math.max(1, s.credits.length));
  return { game: 'crossword' as const, score: s.score, detail: { right, wrong: s.credits.length - right, accuracy, puzzles: s.credits.length, level: s.level, ...(s.tier ? { tier: s.tier } : {}) } };
}

// Euclidean rhythms (Godfried Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms", 2005):
// E(k, n) spreads k onsets as evenly as possible over n pulses, built by Bjorklund's algorithm. Some traditional
// rhythms are E(k, n) itself, others a rotation of it (started on another onset). The theory and the Euclid game
// (אוקלידס): a circle of n pulses loops with a click; set the onsets on the circle to match a rhythm you heard (or spread
// k evenly), later tap it back on the pad in time. Pure.

import { itemSeed, pickOf, rng } from './newGamesKit';
import type { DynName } from './courseSocial';

/** A rhythm as a string of pulses: 'x' an onset, '.' a rest. */
export type Pattern = string;

/**
 * Bjorklund's algorithm as Toussaint describes it: k sequences [x] and n − k sequences [.]; repeatedly append one
 * remainder sequence to each leading sequence, until at most one remainder sequence is left (at least one round).
 */
export function bjorklund(k: number, n: number): Pattern {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n < 1 || k < 0 || k > n) throw new Error(`E(${k},${n})`);
  if (k === 0) return '.'.repeat(n);
  if (k === n) return 'x'.repeat(n);
  let a: string[] = Array.from({ length: k }, () => 'x');
  let b: string[] = Array.from({ length: n - k }, () => '.');
  do {
    const m = Math.min(a.length, b.length);
    const joined = a.slice(0, m).map((s, i) => s + b[i]);
    const rest = a.length > m ? a.slice(m) : b.slice(m);
    a = joined;
    b = rest;
  } while (b.length > 1);
  return a.join('') + b.join('');
}

export const onsetsOf = (p: Pattern): number[] => [...p].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0);
export const countOnsets = (p: Pattern): number => onsetsOf(p).length;
/** The pattern started `r` pulses later in the cycle (pulse r becomes pulse 0). */
export const rotate = (p: Pattern, r: number): Pattern => {
  const n = p.length;
  const s = ((r % n) + n) % n;
  return p.slice(s) + p.slice(0, s);
};
export const isRotation = (a: Pattern, b: Pattern): boolean => a.length === b.length && (a + a).includes(b);
/** One name for all rotations of a pattern: its greatest rotation ('x' sorts after '.'). */
export function necklaceKey(p: Pattern): Pattern {
  let best = p;
  for (let r = 1; r < p.length; r++) {
    const q = rotate(p, r);
    if (q > best) best = q;
  }
  return best;
}
/** The gaps between onsets around the circle (E(3,8): 3 3 2). */
export function gapsOf(p: Pattern): number[] {
  const on = onsetsOf(p);
  return on.map((o, i) => (i + 1 < on.length ? on[i + 1] : on[0] + p.length) - o);
}
/** The pattern as pulses from a set of onset slots. */
export const patternFrom = (n: number, slots: Iterable<number>): Pattern => {
  const s = new Set(slots);
  return Array.from({ length: n }, (_, i) => (s.has(i) ? 'x' : '.')).join('');
};

/**
 * The examples encoded from Toussaint (2005), exactly as E(k, n) comes out of the algorithm. A cultural label only where
 * the paper names it in those words; `rotation` = the traditional rhythm is a rotation of E(k, n), not E(k, n) itself.
 */
export const TOUSSAINT: { k: number; n: number; pattern: Pattern; label?: { en: string; he: string }; rotation?: { pattern: Pattern; en: string; he: string } }[] = [
  { k: 3, n: 8, pattern: 'x..x..x.', label: { en: 'the Cuban tresillo', he: 'הטרסיו הקובני' } },
  { k: 5, n: 8, pattern: 'x.xx.xx.', label: { en: 'the Cuban cinquillo', he: 'הסינקיו הקובני' } },
  { k: 2, n: 5, pattern: 'x.x..' },
  { k: 3, n: 4, pattern: 'x.xx' },
  { k: 4, n: 9, pattern: 'x.x.x.x..', label: { en: 'the Turkish aksak', he: 'האקסאק הטורקי' } },
  { k: 5, n: 12, pattern: 'x..x.x..x.x.' },
  { k: 7, n: 12, pattern: 'x.xx.x.xx.x.', label: { en: 'a West African bell pattern', he: 'דפוס פעמון ממערב אפריקה' } },
  { k: 5, n: 16, pattern: 'x..x..x..x..x...', rotation: { pattern: 'x..x..x...x..x..', en: 'the bossa nova rhythm is a rotation of it', he: 'מקצב הבוסה נובה הוא רוטציה שלו' } },
];

// ---------------------------------------------------------------- the game

export const EUCLID_ITEMS = 8;
/** Count-in clicks (woodblock), two pulses apart. */
export const EUCLID_COUNT_IN = 4;
/** Cycles heard (listen) and tapped (tap). */
export const EUCLID_CYCLES = 2;
export const euclidLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
/** Pulses per minute per level. */
export const euclidPpm = (level: number): number => [220, 240, 260, 260, 300, 240][Math.max(1, Math.min(6, level)) - 1];

export type EuclidMode = 'match' | 'spread' | 'tap';
export interface EuclidItem {
  k: number;
  n: number;
  /** Pulses the target is rotated by (0 = E(k, n) itself). */
  rot: number;
  /** The target pattern (rotated). */
  pattern: Pattern;
  mode: EuclidMode;
}
type KN = [number, number];
const POOLS: Record<number, KN[]> = {
  1: [[2, 5], [3, 4], [3, 8], [5, 8], [2, 8]],
  2: [[3, 8], [5, 8], [4, 9], [3, 7], [2, 5]],
  3: [[5, 12], [7, 12], [4, 9], [5, 9], [4, 12]],
  4: [[3, 8], [5, 8], [4, 9], [5, 12], [7, 12]],
  5: [[5, 16], [7, 16], [3, 8], [7, 12], [5, 12]],
  6: [[3, 8], [5, 8], [4, 9], [5, 12], [7, 12]],
};

/** Item i of a run: (k, n) from the level's pool, the mode, and a rotation from level 4 on. */
export function euclidItem(seed: number, level: number, i: number): EuclidItem {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const rnd = rng(itemSeed(seed, i) ^ 0xe0c1d);
  const [k, n] = pickOf(rnd, POOLS[lv]);
  const base = bjorklund(k, n);
  const mode: EuclidMode = lv === 6 ? 'tap' : lv >= 2 && lv <= 3 && i % 3 === 2 ? 'spread' : 'match';
  let rot = 0;
  if ((lv === 4 || lv === 5 || lv === 6) && rnd() < (lv === 6 ? 0.5 : 0.8)) {
    // a rotation that really sounds different (not the same pattern again)
    const cands = Array.from({ length: n - 1 }, (_, r) => r + 1).filter((r) => rotate(base, r) !== base && rotate(base, r)[0] === 'x');
    if (cands.length) rot = pickOf(rnd, cands);
  }
  return { k, n, rot, pattern: rotate(base, rot), mode };
}

/** Points for an exact answer: 10, a speed bonus up to 10 (gone after 20 s), more at higher levels. */
export const euclidPoints = (seconds: number, level: number): number => Math.round((10 + Math.max(0, 10 - seconds / 2)) * (1 + 0.1 * (level - 1)));

/** A set of slots judged: exact (for "spread": any rotation of E(k, n)), and the share of onsets right. */
export function judgeSlots(item: EuclidItem, picked: Pattern): { exact: boolean; accuracy: number } {
  const target = item.mode === 'spread' ? bestRotation(bjorklund(item.k, item.n), picked) : item.pattern;
  const t = new Set(onsetsOf(target));
  const p = onsetsOf(picked);
  const hits = p.filter((x) => t.has(x)).length;
  const exact = item.mode === 'spread' ? isRotation(bjorklund(item.k, item.n), picked) : picked === item.pattern;
  return { exact, accuracy: hits / Math.max(t.size, p.length, 1) };
}
/** The rotation of `p` closest to `picked` (most shared onsets). */
function bestRotation(p: Pattern, picked: Pattern): Pattern {
  let best = p;
  let score = -1;
  for (let r = 0; r < p.length; r++) {
    const q = rotate(p, r);
    const s = [...q].filter((c, i) => c === 'x' && picked[i] === 'x').length;
    if (s > score) {
      score = s;
      best = q;
    }
  }
  return best;
}

/**
 * Taps judged against the target over EUCLID_CYCLES cycles: tap times in pulses from the first downbeat. A tap within
 * 0.4 pulse of an onset hits it (each onset once); the rest are extras. Exact = every onset hit, at most one extra.
 */
export function judgeTaps(item: EuclidItem, taps: number[]): { hits: number; extras: number; total: number; accuracy: number; exact: boolean; marks: boolean[] } {
  const on = onsetsOf(item.pattern);
  const targets: number[] = [];
  for (let c = 0; c < EUCLID_CYCLES; c++) for (const o of on) targets.push(c * item.n + o);
  const used = new Set<number>();
  let extras = 0;
  for (const t of taps) {
    let best = -1;
    let d = Infinity;
    targets.forEach((x, j) => {
      if (used.has(j)) return;
      const e = Math.abs(t - x);
      if (e < d) {
        d = e;
        best = j;
      }
    });
    if (best >= 0 && d <= 0.4) used.add(best);
    else extras++;
  }
  const hits = used.size;
  const accuracy = hits / (targets.length + extras);
  return { hits, extras, total: targets.length, accuracy, exact: hits === targets.length && extras <= 1, marks: targets.map((_, j) => used.has(j)) };
}

/** One line on a wrong answer ("Why?"): the gaps of the right pattern. */
export function euclidWhy(item: EuclidItem, lang: 'en' | 'he'): string {
  const g = gapsOf(item.mode === 'spread' ? bjorklund(item.k, item.n) : item.pattern).join('+');
  if (item.mode === 'spread') return lang === 'he' ? `E(${item.k},${item.n}): המרווחים ${g} — כמעט שווים.` : `E(${item.k},${item.n}): gaps ${g}, as even as they get.`;
  return lang === 'he' ? `המרווחים בין המכות: ${g}.` : `The gaps between the hits: ${g}.`;
}

export interface EuclidSave {
  v: 1;
  game: 'euclid';
  seed: number;
  tier?: DynName;
  level: number;
  i: number;
  right: number;
  wrong: number;
  score: number;
}
export const newEuclidSave = (seed: number, level: number, tier?: DynName): EuclidSave => ({ v: 1, game: 'euclid', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), i: 0, right: 0, wrong: 0, score: 0, ...(tier ? { tier } : {}) });
export function isEuclidSave(x: unknown): x is EuclidSave {
  const s = x as EuclidSave | null;
  return !!s && s.v === 1 && s.game === 'euclid' && typeof s.seed === 'number' && typeof s.i === 'number' && s.i < EUCLID_ITEMS;
}
export const euclidOver = (s: EuclidSave): boolean => s.i >= EUCLID_ITEMS;

/** Answer the current item: exact → right and points (speed bonus); else wrong. */
export function euclidAnswer(s: EuclidSave, exact: boolean, seconds: number): { save: EuclidSave; gained: number } {
  const gained = exact ? euclidPoints(seconds, s.level) : 0;
  return { save: { ...s, i: s.i + 1, right: s.right + (exact ? 1 : 0), wrong: s.wrong + (exact ? 0 : 1), score: s.score + gained }, gained };
}
export function euclidResult(s: EuclidSave) {
  return { game: 'euclid' as const, score: s.score, detail: { right: s.right, wrong: s.wrong, level: s.level, items: s.i, ppm: euclidPpm(s.level), ...(s.tier ? { tier: s.tier } : {}) } };
}

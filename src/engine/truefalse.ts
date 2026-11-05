// "True or false?" (spec addendum O): three notes, two interval labels — are both right?
// Lies are near misses (m3 ↔ M3, P4 ↔ ♯4, ♭5 ↔ P5 …), never absurd. Pure and seedable.

import { pcValue } from './pitch';
import { spellUp, type Trio } from './heroTrio';
import type { PitchClass } from './pitch';

export type TFLevel = 1 | 2 | 3 | 4;
export const TF_LEVELS: TFLevel[] = [1, 2, 3, 4];

/** [label, generic size, semitones] */
const INTERVALS: [string, number, number][] = [
  ['m2', 2, 1],
  ['M2', 2, 2],
  ['m3', 3, 3],
  ['M3', 3, 4],
  ['P4', 4, 5],
  ['♯4', 4, 6],
  ['♭5', 5, 6],
  ['P5', 5, 7],
  ['m6', 6, 8],
  ['M6', 6, 9],
  ['m7', 7, 10],
  ['M7', 7, 11],
];
/** Level 1 uses only the clearest intervals. */
const EASY = ['M3', 'P4', 'P5'];

/** The near miss for each label (same size, other quality). */
export const NEAR_MISS: Record<string, string> = { m2: 'M2', M2: 'm2', m3: 'M3', M3: 'm3', P4: '♯4', '♯4': 'P4', '♭5': 'P5', P5: '♭5', m6: 'M6', M6: 'm6', m7: 'M7', M7: 'm7' };

const STARTS: PitchClass[] = [
  { letter: 'C', acc: 0 },
  { letter: 'D', acc: 0 },
  { letter: 'E', acc: 0 },
  { letter: 'F', acc: 0 },
  { letter: 'G', acc: 0 },
  { letter: 'A', acc: 0 },
  { letter: 'B', acc: 0 },
  { letter: 'B', acc: -1 },
  { letter: 'E', acc: -1 },
  { letter: 'A', acc: -1 },
  { letter: 'F', acc: 1 },
];

export interface TFItem {
  trio: Trio;
  /** Labels as shown (one may be a lie). */
  shownLeft: string;
  shownRight: string;
  truth: boolean;
  /** For ear mode: the three notes, ascending (MIDI). */
  midis: [number, number, number];
  level: TFLevel;
}

export function tfItem(level: TFLevel, rnd: () => number): TFItem {
  const pool = level === 1 ? INTERVALS.filter(([l]) => EASY.includes(l)) : INTERVALS;
  for (let tries = 0; tries < 300; tries++) {
    const left = STARTS[Math.floor(rnd() * STARTS.length)];
    const a = pool[Math.floor(rnd() * pool.length)];
    const b = pool[Math.floor(rnd() * pool.length)];
    const mid = spellUp(left, a[1], a[2]);
    if (!mid) continue;
    const right = spellUp(mid, b[1], b[2]);
    if (!right) continue;
    const trio: Trio = { left, mid, right, intervalLeft: a[0], intervalRight: b[0] };
    const truth = rnd() < 0.5;
    let shownLeft = a[0];
    let shownRight = b[0];
    if (!truth) {
      if (rnd() < 0.5) shownLeft = NEAR_MISS[a[0]];
      else shownRight = NEAR_MISS[b[0]];
    }
    const lo = 55 + ((pcValue(left) - 7 + 12) % 12); // left note between G3 and F♯4
    const m1 = lo + a[2];
    return { trio, shownLeft, shownRight, truth, midis: [lo, m1, m1 + b[2]], level };
  }
  throw new Error('no item');
}

/** Rating difficulty of an item (fed to the Intervals skill). */
export const tfDifficulty = (level: TFLevel) => [0, 950, 1100, 1200, 1350][level];

/** Solo run: 60 s; +1 per right answer × a streak bonus; a wrong answer costs 2 s. */
export const TF_RUN_MS = 60_000;
export const TF_PENALTY_MS = 2_000;
export const tfPoints = (streak: number) => 1 + Math.floor(streak / 5) * 0.5;

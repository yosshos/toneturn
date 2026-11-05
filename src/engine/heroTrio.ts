// Home-screen art: three notes on the keyboard — left home, the note in the middle, right home — and the
// two intervals between them, correctly spelled (B → F is a ♭5, F → A♭ is a minor 3rd).

import { pcValue, type PitchClass } from './pitch';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Interval qualities allowed per generic size (2nd … 7th): [label, semitones]. */
const QUALITIES: Record<number, [string, number][]> = {
  2: [
    ['m2', 1],
    ['M2', 2],
  ],
  3: [
    ['m3', 3],
    ['M3', 4],
  ],
  4: [
    ['P4', 5],
    ['♯4', 6],
  ],
  5: [
    ['♭5', 6],
    ['P5', 7],
  ],
  6: [
    ['m6', 8],
    ['M6', 9],
  ],
  7: [
    ['m7', 10],
    ['M7', 11],
  ],
};

const STARTS: PitchClass[] = [
  ...['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((l): PitchClass => ({ letter: l as PitchClass['letter'], acc: 0 })),
  { letter: 'B', acc: -1 },
  { letter: 'E', acc: -1 },
  { letter: 'A', acc: -1 },
  { letter: 'F', acc: 1 },
];

/** The note `size` letters up from `from` that is `semis` semitones higher, or null if it needs a double accidental. */
export function spellUp(from: PitchClass, size: number, semis: number): PitchClass | null {
  const li = LETTERS.indexOf(from.letter);
  const letter = LETTERS[(li + size - 1) % 7];
  const target = (pcValue(from) + semis) % 12;
  let acc = target - NATURAL[letter];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  if (acc < -1 || acc > 1) return null;
  return { letter, acc: acc as PitchClass['acc'] };
}

export interface Trio {
  left: PitchClass;
  mid: PitchClass;
  right: PitchClass;
  /** Interval left → middle and middle → right (ascending). */
  intervalLeft: string;
  intervalRight: string;
}

export function randomTrio(rnd: () => number = Math.random): Trio {
  for (let tries = 0; tries < 200; tries++) {
    const left = STARTS[Math.floor(rnd() * STARTS.length)];
    const s1 = 2 + Math.floor(rnd() * 6);
    const s2 = 2 + Math.floor(rnd() * 6);
    const q1 = QUALITIES[s1][Math.floor(rnd() * 2)];
    const q2 = QUALITIES[s2][Math.floor(rnd() * 2)];
    const mid = spellUp(left, s1, q1[1]);
    if (!mid) continue;
    const right = spellUp(mid, s2, q2[1]);
    if (!right || (right.letter === left.letter && right.acc === left.acc)) continue;
    return { left, mid, right, intervalLeft: q1[0], intervalRight: q2[0] };
  }
  return { left: { letter: 'B', acc: 0 }, mid: { letter: 'F', acc: 0 }, right: { letter: 'A', acc: -1 }, intervalLeft: '♭5', intervalRight: 'm3' };
}

/** The example from user testing: B — F — A♭ (♭5, then a minor 3rd). */
export const FIRST_TRIO: Trio = { left: { letter: 'B', acc: 0 }, mid: { letter: 'F', acc: 0 }, right: { letter: 'A', acc: -1 }, intervalLeft: '♭5', intervalRight: 'm3' };

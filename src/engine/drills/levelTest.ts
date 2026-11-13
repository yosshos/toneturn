// The playing level test (docs/SPEC-LEVEL-TEST.md, owner 2026-11-13): sections ("strands") of real levels in rising
// difficulty, one take per step at the level's own tempo. A clean step jumps ahead, a miss brackets the level and the
// section ends — the test never insists on one item, and a mistake simply moves it on. Pure.

import type { DrillSettings, FamilyId } from './types';
type T2 = { en: string; he: string };
import { families } from './plan';

export type StrandId = 'hands' | 'chords' | 'comp' | 'reading' | 'ear' | 'lines';
export type Verdict = 'clean' | 'almost' | 'not';

/** One step of a section: a level of the catalogue, in a chosen key, and the start levels it proves when passed. */
export interface Rung {
  level: string;
  key: number;
  /** Start level per family when this step is clean (the level after the one beaten). */
  places: Partial<Record<FamilyId, number>>;
}

export interface Strand {
  id: StrandId;
  title: T2;
  rungs: Rung[];
}

export const STRAND_TITLE: Record<StrandId, T2> = {
  hands: { en: 'Hands', he: 'ידיים' },
  chords: { en: 'Chords', he: 'אקורדים' },
  comp: { en: 'Comping', he: 'ליווי' },
  reading: { en: 'Reading', he: 'קריאה' },
  ear: { en: 'Ear at the keys', he: 'אוזן על הקלידים' },
  lines: { en: 'Jazz lines', he: 'קווי ג׳אז' },
};

const r = (level: string, key: number, places: Rung['places']): Rung => ({ level, key, places });

// Keys move from step to step (owner: "it only tested me in C").
const HANDS: Rung[] = [
  r('scales-1', 7, { scales: 2, fingers: 1, arpeggios: 1, control: 1 }),
  r('scales-3', 2, { scales: 4, fingers: 2, arpeggios: 2, control: 2 }),
  r('arpeggios-3', 5, { scales: 5, fingers: 3, arpeggios: 4, control: 3 }),
  r('scales-5', 9, { scales: 6, fingers: 5, arpeggios: 5, control: 5, advanced: 1 }),
  r('fingers-6', 10, { scales: 8, fingers: 7, arpeggios: 7, control: 7, advanced: 3 }),
];
const CHORDS_JAZZ: Rung[] = [
  r('cadences-1', 7, { cadences: 2, voicings: 1 }),
  r('voicings-2', 5, { cadences: 2, voicings: 3 }),
  r('voicings-3', 10, { cadences: 3, voicings: 4, 'k-sixdim': 1 }),
  r('voicings-4', 3, { cadences: 4, voicings: 5, 'k-sixdim': 2, 'k-reharm': 1 }),
  r('voicings-9', 2, { cadences: 5, voicings: 10, 'k-sixdim': 4, 'k-reharm': 3 }),
];
const CHORDS_CLASSICAL: Rung[] = [
  r('cadences-1', 7, { cadences: 2 }),
  r('cadences-2', 2, { cadences: 3 }),
  r('cadences-4', 5, { cadences: 5 }),
  r('cadences-5', 9, { cadences: 6 }),
];
const COMP_JAZZ: Rung[] = [
  r('accomp-1', 0, { accomp: 2 }),
  r('voicings-6', 5, { accomp: 3, voicings: 7 }),
  r('voicings-11', 10, { accomp: 4, voicings: 12 }),
  r('accomp-3', 7, { accomp: 5 }),
  r('voicings-14', 7, { accomp: 9, voicings: 15 }),
];
const COMP_CLASSICAL: Rung[] = [
  r('accomp-1', 0, { accomp: 2, control: 4 }),
  r('control-7', 7, { accomp: 3, control: 8 }),
  r('accomp-3', 5, { accomp: 5, control: 9 }),
];
// Sight-reading below the playing level is normal (placement auditions read about two grades lower); the takes feed the
// reading skill, and a clean read opens the reading levels of Control.
const READING: Rung[] = [r('control-11', 0, {}), r('control-12', 7, {})];
const EAR: Rung[] = [
  r('k-ear-1', 0, { 'k-ear': 2 }),
  r('k-ear-2', 7, { 'k-ear': 3 }),
  r('k-ear-4', 5, { 'k-ear': 5 }),
  r('k-ear-5', 0, { 'k-ear': 6 }),
  r('k-ear-6', 7, { 'k-ear': 7 }),
];
const LINES: Rung[] = [
  r('harris-1', 0, { harris: 2, jazz: 1 }),
  r('harris-7', 5, { harris: 8, jazz: 2 }),
  r('k-bebop-1', 10, { harris: 10, jazz: 4, 'k-bebop': 2 }),
  r('k-bebop-4', 0, { harris: 12, jazz: 6, 'k-bebop': 5 }),
];

/** The piano test by emphasis: hands, chords, comping, reading, ear (all), and jazz lines (jazz / both). */
export function pianoStrands(emphasis: DrillSettings['emphasis']): Strand[] {
  const jazz = emphasis !== 'classical';
  const out: Strand[] = [
    { id: 'hands', title: STRAND_TITLE.hands, rungs: HANDS },
    { id: 'chords', title: STRAND_TITLE.chords, rungs: jazz ? CHORDS_JAZZ : CHORDS_CLASSICAL },
    { id: 'comp', title: STRAND_TITLE.comp, rungs: jazz ? COMP_JAZZ : COMP_CLASSICAL },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: READING },
    { id: 'ear', title: STRAND_TITLE.ear, rungs: EAR },
  ];
  if (jazz) out.push({ id: 'lines', title: STRAND_TITLE.lines, rungs: LINES });
  return out;
}

/** The search through one section. lo = the hardest clean step (−1: none), hi = the easiest missed one (n: none). */
export interface StrandState {
  at: number;
  lo: number;
  hi: number;
  /** A step played "almost" twice: the level sits there. */
  edge: number | null;
  takes: number;
  retried: number[];
  last: Verdict | null;
}

/** At most this many takes per section (a section is usually 2–3). */
export const STRAND_TAKES = 4;

/** Where a section starts: its second step when it has four or more (one take saved for most players), else the first. */
export function startState(n: number, prior?: number): StrandState {
  const at = Math.max(0, Math.min(n - 1, prior ?? (n >= 4 ? 1 : 0)));
  return { at, lo: -1, hi: n, edge: null, takes: 0, retried: [], last: null };
}

/** Record one take of the current step. */
export function recordTake(s: StrandState, v: Verdict): StrandState {
  const takes = s.takes + 1;
  if (v === 'clean') return { ...s, takes, lo: Math.max(s.lo, s.at), last: v };
  // "Almost": one more take of the same step, never more; a second "almost" sets the level at that step.
  if (v === 'almost' && !s.retried.includes(s.at)) return { ...s, takes, retried: [...s.retried, s.at], last: v };
  if (v === 'almost') return { ...s, takes, hi: Math.min(s.hi, s.at), edge: s.at, last: v };
  return { ...s, takes, hi: Math.min(s.hi, s.at), last: v };
}

/** The next step of the section, or null when its level is known (bracketed, an edge, or out of takes). */
export function nextStep(s: StrandState, n: number): number | null {
  if (s.edge !== null || s.takes >= STRAND_TAKES) return null;
  if (s.last === 'almost' && s.retried.includes(s.at) && s.hi > s.at) return s.at;
  if (s.hi - s.lo <= 1) return null;
  // Clean and nothing missed yet: jump two steps (adaptive tests climb fast); else bisect the bracket.
  if (s.last === 'clean' && s.hi === n) return Math.min(n - 1, s.lo + 2);
  return Math.floor((s.lo + s.hi) / 2);
}

/** Move a state to its next step (or mark it finished with at = −1). */
export function advance(s: StrandState, n: number): StrandState {
  const at = nextStep(s, n);
  return { ...s, at: at ?? -1 };
}

/** The start levels a finished section proves: the hardest clean step's, or one lower at an "almost" edge. */
export function strandPlaces(strand: Strand, s: StrandState): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  const put = (p: Rung['places'], minus: number) => {
    for (const [k, v] of Object.entries(p) as [FamilyId, number][]) out[k] = Math.max(out[k] ?? 1, v - minus);
  };
  if (s.lo >= 0) put(strand.rungs[s.lo].places, 0);
  if (s.edge !== null && s.edge > s.lo) put(strand.rungs[s.edge].places, 1);
  return out;
}

/** Every family of the instrument gets a start level: what the sections proved, else level 1 (capped to the family). */
export function testStart(instrument: NonNullable<DrillSettings['instrument']>, placed: Partial<Record<FamilyId, number>>): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  for (const f of families(instrument)) out[f.id] = Math.max(1, Math.min(f.levels.length, Math.round(placed[f.id] ?? 1)));
  return out;
}

/** Merge the places of several sections (the higher start wins). */
export function mergePlaces(...ps: Partial<Record<FamilyId, number>>[]): Partial<Record<FamilyId, number>> {
  const out: Partial<Record<FamilyId, number>> = {};
  for (const p of ps) for (const [k, v] of Object.entries(p) as [FamilyId, number][]) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

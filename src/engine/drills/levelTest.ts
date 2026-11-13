// The playing level test (docs/SPEC-LEVEL-TEST.md, owner 2026-11-13): sections ("strands") of real levels in rising
// difficulty, one take per step at the level's own tempo. A clean step jumps ahead, a miss brackets the level and the
// section ends — the test never insists on one item, and a mistake simply moves it on. Pure.

import type { DrillSettings, FamilyId } from './types';
type T2 = { en: string; he: string };
import { families } from './plan';

export type StrandId = 'hands' | 'chords' | 'comp' | 'reading' | 'ear' | 'lines' | 'rhythm' | 'lead' | 'jazz' | 'time' | 'walk' | 'grooves' | 'fills' | 'indep';
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
  rhythm: { en: 'Rhythm playing', he: 'נגינה קצבית' },
  lead: { en: 'Lead', he: 'סולו' },
  jazz: { en: 'Jazz comping', he: 'ליווי ג׳אז' },
  time: { en: 'Time and pocket', he: 'זמן וכיס' },
  walk: { en: 'Walking bass', he: 'ליווי הליכה' },
  grooves: { en: 'Grooves', he: 'גרוב' },
  fills: { en: 'Fills', he: 'מילויים' },
  indep: { en: 'Independence', he: 'עצמאות גפיים' },
};
const EAR_T: T2 = { en: 'Ear', he: 'אוזן' };

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

// ------------------------------------------------------------------ guitar (0.81)
const G_HANDS: Rung[] = [
  r('g-fretting-1', 9, { 'g-fretting': 2, 'g-picking': 1, 'g-scales': 1 }),
  r('g-scales-1', 9, { 'g-fretting': 2, 'g-picking': 2, 'g-scales': 2, 'g-arps': 1, 'g-legato': 1 }),
  r('g-picking-3', 7, { 'g-fretting': 4, 'g-picking': 4, 'g-scales': 4, 'g-arps': 2, 'g-legato': 2 }),
  r('g-scales-5', 2, { 'g-fretting': 5, 'g-picking': 5, 'g-scales': 6, 'g-arps': 4, 'g-legato': 3 }),
  r('g-picking-6', 9, { 'g-fretting': 6, 'g-picking': 7, 'g-scales': 8, 'g-arps': 6, 'g-legato': 5 }),
];
const G_CHORDS: Rung[] = [
  r('g-chords-1', 7, { 'g-chords': 2 }),
  r('g-chords-3', 7, { 'g-chords': 4 }),
  r('g-chords-5', 9, { 'g-chords': 6 }),
  r('g-chords-6', 2, { 'g-chords': 7 }),
];
const G_RHYTHM: Rung[] = [
  r('g-rhythm-1', 7, { 'g-rhythm': 2 }),
  r('g-rhythm-2', 0, { 'g-rhythm': 3 }),
  r('g-rhythm-3', 9, { 'g-rhythm': 4 }),
  r('g-rhythm-5', 4, { 'g-rhythm': 6 }),
  r('g-rhythm-6', 0, { 'g-rhythm': 7 }),
];
const G_LEAD: Rung[] = [
  r('g-lead-1', 9, { 'g-lead': 2, 'g-impro': 1 }),
  r('g-lead-3', 4, { 'g-lead': 4, 'g-impro': 1 }),
  r('g-lead-5', 2, { 'g-lead': 6, 'g-impro': 2 }),
  r('g-lead-8', 7, { 'g-lead': 9, 'g-impro': 3 }),
];
const G_READING: Rung[] = [
  r('g-reading-1', 0, { 'g-reading': 2 }),
  r('g-reading-2', 7, { 'g-reading': 3 }),
  r('g-reading-4', 2, { 'g-reading': 5 }),
  r('g-reading-6', 7, { 'g-reading': 7 }),
];
const G_EAR: Rung[] = [
  r('g-ear-2', 9, { 'g-ear': 3 }),
  r('g-ear-3', 4, { 'g-ear': 4 }),
  r('g-ear-5', 7, { 'g-ear': 6 }),
  r('g-ear-6', 2, { 'g-ear': 7 }),
  r('g-ear-8', 0, { 'g-ear': 9 }),
];
const G_JAZZ: Rung[] = [
  r('g-jazz-1', 0, { 'g-jazz': 2, 'g-harris': 1 }),
  r('g-jazz-2', 5, { 'g-jazz': 3, 'g-harris': 2 }),
  r('g-jazz-4', 10, { 'g-jazz': 5, 'g-harris': 3 }),
  r('g-jazz-8', 3, { 'g-jazz': 9, 'g-harris': 5 }),
];

/** The guitar test: hands, chords, rhythm, lead, reading, ear; jazz comping only with the jazz add-on (shown levels). */
export function guitarStrands(): Strand[] {
  return [
    { id: 'hands', title: STRAND_TITLE.hands, rungs: G_HANDS },
    { id: 'chords', title: STRAND_TITLE.chords, rungs: G_CHORDS },
    { id: 'rhythm', title: STRAND_TITLE.rhythm, rungs: G_RHYTHM },
    { id: 'lead', title: STRAND_TITLE.lead, rungs: G_LEAD },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: G_READING },
    { id: 'ear', title: EAR_T, rungs: G_EAR },
    { id: 'jazz', title: STRAND_TITLE.jazz, rungs: G_JAZZ },
  ];
}

// ------------------------------------------------------------------ bass (0.81)
const B_HANDS: Rung[] = [
  r('b-pluck-1', 4, { 'b-pluck': 2, 'b-fret': 1, 'b-scale': 1, 'b-length': 1 }),
  r('b-fret-1', 4, { 'b-pluck': 2, 'b-fret': 2, 'b-scale': 1, 'b-length': 1 }),
  r('b-pluck-3', 9, { 'b-pluck': 4, 'b-fret': 3, 'b-scale': 2, 'b-length': 2 }),
  r('b-fret-5', 7, { 'b-pluck': 5, 'b-fret': 6, 'b-scale': 4, 'b-length': 3 }),
  r('b-pluck-5', 2, { 'b-pluck': 7, 'b-fret': 7, 'b-scale': 6, 'b-length': 4 }),
];
const B_TIME: Rung[] = [
  r('b-time-1', 4, { 'b-time': 2, 'b-pocket': 1 }),
  r('b-pocket-1', 9, { 'b-time': 3, 'b-pocket': 2, 'b-styles': 1 }),
  r('b-time-4', 7, { 'b-time': 5, 'b-pocket': 3, 'b-styles': 3 }),
  r('b-pocket-4', 4, { 'b-time': 6, 'b-pocket': 5, 'b-styles': 5, 'b-ghost': 2 }),
  r('b-time-7', 9, { 'b-time': 8, 'b-pocket': 7, 'b-styles': 7, 'b-ghost': 3 }),
];
const B_CHORDS: Rung[] = [
  r('b-chord-1', 4, { 'b-chord': 2 }),
  r('b-chord-3', 9, { 'b-chord': 4, 'b-scale': 2 }),
  r('b-chord-6', 7, { 'b-chord': 7, 'b-scale': 3 }),
  r('b-chord-8', 2, { 'b-chord': 9, 'b-scale': 5 }),
  r('b-chord-11', 5, { 'b-chord': 12, 'b-scale': 7 }),
];
const B_WALK: Rung[] = [
  r('b-walk-1', 5, { 'b-walk': 2, 'b-swing': 1 }),
  r('b-walk-3', 10, { 'b-walk': 4, 'b-swing': 2 }),
  r('b-walk-5', 3, { 'b-walk': 6, 'b-swing': 2, 'b-barry': 1 }),
  r('b-walk-7', 7, { 'b-walk': 8, 'b-swing': 3, 'b-barry': 2 }),
  r('b-walk-9', 0, { 'b-walk': 10, 'b-swing': 4, 'b-barry': 3 }),
];
const B_READING: Rung[] = [
  r('b-read-2', 4, { 'b-read': 3, 'b-posread': 1 }),
  r('b-read-3', 0, { 'b-read': 4, 'b-posread': 1 }),
  r('b-read-6', 7, { 'b-read': 7, 'b-posread': 2 }),
  r('b-read-8', 9, { 'b-read': 9, 'b-posread': 3 }),
];
const B_EAR: Rung[] = [
  r('b-ear-2', 4, { 'b-ear': 3 }),
  r('b-ear-3', 9, { 'b-ear': 4 }),
  r('b-ear-5', 7, { 'b-ear': 6 }),
  r('b-ear-6', 2, { 'b-ear': 7 }),
  r('b-ear-9', 5, { 'b-ear': 10 }),
];

/** The bass test: hands, time and pocket, chord tones, walking (by the bass track), reading, ear. */
export function bassStrands(): Strand[] {
  return [
    { id: 'hands', title: STRAND_TITLE.hands, rungs: B_HANDS },
    { id: 'time', title: STRAND_TITLE.time, rungs: B_TIME },
    { id: 'chords', title: STRAND_TITLE.chords, rungs: B_CHORDS },
    { id: 'walk', title: STRAND_TITLE.walk, rungs: B_WALK },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: B_READING },
    { id: 'ear', title: EAR_T, rungs: B_EAR },
  ];
}

// ------------------------------------------------------------------ drums (0.81; drum items have no key)
const D_HANDS: Rung[] = [
  r('d-strokes-1', 0, { 'd-strokes': 2, 'd-rolls': 1, 'd-time': 1 }),
  r('d-rolls-1', 0, { 'd-strokes': 2, 'd-rolls': 2, 'd-time': 2 }),
  r('d-rolls-3', 0, { 'd-strokes': 4, 'd-rolls': 4, 'd-diddles': 2, 'd-time': 3 }),
  r('d-rolls-4', 0, { 'd-strokes': 5, 'd-rolls': 5, 'd-diddles': 3, 'd-time': 4 }),
  r('d-rolls-7', 0, { 'd-strokes': 6, 'd-rolls': 8, 'd-diddles': 5, 'd-time': 6 }),
];
const D_GROOVES: Rung[] = [
  r('d-rock-1', 0, { 'd-rock': 2, 'd-feet': 1, 'd-time': 2 }),
  r('d-rock-3', 0, { 'd-rock': 4, 'd-feet': 2, 'd-shuffle': 1 }),
  r('d-rock-5', 0, { 'd-rock': 6, 'd-feet': 3, 'd-shuffle': 2, 'd-funk': 1 }),
  r('d-funk-2', 0, { 'd-rock': 7, 'd-feet': 4, 'd-shuffle': 3, 'd-funk': 3 }),
  r('d-funk-4', 0, { 'd-rock': 8, 'd-feet': 5, 'd-shuffle': 4, 'd-funk': 5, 'd-jazz': 1 }),
];
const D_FILLS: Rung[] = [
  r('d-fills-1', 0, { 'd-fills': 2 }),
  r('d-fills-2', 0, { 'd-fills': 3 }),
  r('d-fills-3', 0, { 'd-fills': 4 }),
  r('d-fills-5', 0, { 'd-fills': 6 }),
];
const D_READING: Rung[] = [
  r('d-read-1', 0, { 'd-read': 2, 'd-notation': 1 }),
  r('d-read-2', 0, { 'd-read': 3, 'd-notation': 2 }),
  r('d-read-3', 0, { 'd-read': 4, 'd-notation': 3 }),
  r('d-read-5', 0, { 'd-read': 6, 'd-notation': 4 }),
  r('d-read-7', 0, { 'd-read': 8, 'd-notation': 5 }),
];
const D_INDEP: Rung[] = [
  r('d-indep-1', 0, { 'd-indep': 2 }),
  r('d-indep-2', 0, { 'd-indep': 3 }),
  r('d-indep-3', 0, { 'd-indep': 4 }),
  r('d-indep-5', 0, { 'd-indep': 6 }),
];
const D_EAR: Rung[] = [
  r('d-ear-1', 0, { 'd-ear': 2 }),
  r('d-ear-2', 0, { 'd-ear': 3 }),
  r('d-ear-4', 0, { 'd-ear': 5 }),
  r('d-ear-5', 0, { 'd-ear': 6 }),
];

/** The drums test: hands, grooves, fills, reading, independence, ear (by microphone only the steps it can measure). */
export function drumStrands(): Strand[] {
  return [
    { id: 'hands', title: STRAND_TITLE.hands, rungs: D_HANDS },
    { id: 'grooves', title: STRAND_TITLE.grooves, rungs: D_GROOVES },
    { id: 'fills', title: STRAND_TITLE.fills, rungs: D_FILLS },
    { id: 'reading', title: STRAND_TITLE.reading, rungs: D_READING },
    { id: 'indep', title: STRAND_TITLE.indep, rungs: D_INDEP },
    { id: 'ear', title: EAR_T, rungs: D_EAR },
  ];
}

/** The sections of an instrument's test. */
export function strandsFor(instrument: NonNullable<DrillSettings['instrument']>, emphasis: DrillSettings['emphasis']): Strand[] {
  return instrument === 'guitar' ? guitarStrands() : instrument === 'bass' ? bassStrands() : instrument === 'drums' ? drumStrands() : pianoStrands(emphasis);
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

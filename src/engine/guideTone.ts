// Guide-Tone Runner (AUDIT-GAMES §4.2 #1): the changes roll by with the band and the click; on every change play a
// guide tone of the new chord — its 3rd or its 7th (the 6th of a 6 / m6 tonic, the °7 of a diminished chord) — in
// time. One wrong or missing guide tone ends the run; every clean lap round the changes goes on a little faster.
//
// Tiers (pp → ff): ii–V–I in one key → ii–V–I round the cycle of 4ths → minor ii–V–i → the jazz blues → rhythm changes
// A (two chords a bar) → standards' A sections, faster. Every key-relative lap moves a 4th (all 12 keys from a random
// start). Guide tones from docs/BARRY-HARRIS-THEORY.md / the usual jazz-theory reading: 3rd and 7th carry the quality;
// a 7th falls a half or whole step to the next 3rd. Charts are generated in scale degrees and spelled for the key
// (progGrid.realize: ♭II7 is D♭7 in C, ♯iv°7 is F♯°7). Pure.

import { GQ_IV, realize, type DChord, type GChord } from './progGrid';
import { onLetter, letterOf } from './commonTone';
import { cycleKey, pc, pickOf, rng } from './newGamesKit';
import type { DynName } from './courseSocial';

const C = (deg: string, q: DChord['q'], beats = 4, x: DChord['x'] = 'none'): DChord => ({ deg, q, x, beats });

/** The six levels' charts, in degrees of the (major) tonic the chords are spelled from. */
const II_V_I: DChord[] = [C('2', 'm7'), C('5', '7'), C('1', 'maj7', 8)];
const MINOR_II_V_I: DChord[] = [C('2', 'm7b5'), C('5', '7', 4, 'b9'), C('1', 'm6', 8)];
const BLUES: DChord[] = [C('1', '7'), C('4', '7'), C('1', '7', 8), C('4', '7', 8), C('1', '7'), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7'), C('1', '7'), C('5', '7')];
const RHYTHM_A: DChord[] = [
  ...[0, 1].flatMap(() => [C('1', 'maj7', 2), C('6', '7', 2), C('2', 'm7', 2), C('5', '7', 2)]),
  C('1', 'maj7', 2), C('1', '7', 2), C('4', 'maj7', 2), C('#4', 'dim7', 2), C('1', 'maj7', 2), C('6', '7', 2), C('2', 'm7', 2), C('5', '7', 2),
];
/** Standards' A sections (chord charts only, typed from the standard changes): a falling-5ths minor A, a ii–V–I chain down by whole steps, a minor bossa A. */
export const GT_STANDARDS: { id: string; chords: DChord[] }[] = [
  { id: 'fifths', chords: [C('2', 'm7'), C('5', '7'), C('1', 'maj7'), C('4', 'maj7'), C('7', 'm7b5'), C('3', '7', 4, 'b9'), C('6', 'm6', 8)] },
  { id: 'chain', chords: [C('2', 'm7'), C('5', '7'), C('1', 'maj7', 8), C('1', 'm7'), C('4', '7'), C('b7', 'maj7', 8), C('b7', 'm7'), C('b3', '7'), C('b6', 'maj7', 8)] },
  { id: 'bossa', chords: [C('1', 'm7', 8), C('4', 'm7', 8), C('2', 'm7b5'), C('5', '7', 4, 'b9'), C('1', 'm7', 8)] },
];

export const GT_LEVELS = 6;
export const gtLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
/** Tempo of a level's first lap; every clean lap adds GT_LAP_BPM (up to +40). */
export const GT_BPM: Record<number, number> = { 1: 80, 2: 88, 3: 88, 4: 100, 5: 96, 6: 120 };
export const GT_LAP_BPM = 4;
export const lapBpm = (level: number, lap: number, bpm0 = GT_BPM[level] ?? 90): number => bpm0 + Math.min(40, GT_LAP_BPM * lap);
/** Beats of count-in before each lap. */
export const GT_COUNT_IN = 4;

export interface GtLap {
  level: number;
  lap: number;
  /** The tonic the chords are spelled from (the key of the lap's first ii–V–I). */
  key: number;
  chords: GChord[];
  /** Beat each chord starts on (from 0 = the first beat after the count-in). */
  starts: number[];
  beats: number;
}

/** The lap `lap` of a run (seeded): its key moves a 4th each lap from a random start (level 1 stays in its key). */
export function gtLap(seed: number, level: number, lap: number): GtLap {
  const lv = Math.max(1, Math.min(GT_LEVELS, Math.round(level)));
  const key = lv === 1 ? cycleKey(seed, 0) : cycleKey(seed, lv === 2 ? 2 * lap : lap);
  let ds: { key: number; d: DChord }[];
  if (lv === 1) ds = II_V_I.map((d) => ({ key, d }));
  else if (lv === 2) ds = [key, pc(key + 5)].flatMap((k) => II_V_I.map((d) => ({ key: k, d })));
  else if (lv === 3) ds = MINOR_II_V_I.map((d) => ({ key, d }));
  else if (lv === 4) ds = BLUES.map((d) => ({ key, d }));
  else if (lv === 5) ds = RHYTHM_A.map((d) => ({ key, d }));
  else ds = pickOf(rng(seed ^ (lap * 0x2545f491)), GT_STANDARDS).chords.map((d) => ({ key, d }));
  const chords = ds.map(({ key: k, d }) => realize(k, d));
  const starts: number[] = [];
  let at = 0;
  for (const c of chords) {
    starts.push(at);
    at += c.beats;
  }
  return { level: lv, lap, key, chords, starts, beats: at };
}

/** The guide tones of a chord as pitch classes: [3rd, 7th] (6th of a 6 / m6, °7 of a dim7). */
export function guidePcs(c: Pick<GChord, 'root' | 'q'>): [number, number] {
  const iv = GQ_IV[c.q];
  return [pc(c.root + iv[1]), pc(c.root + (iv[3] ?? iv[2]))];
}
/** The guide tones spelled on the chord's letters (3rd two letters up, 7th six, 6th five): Dm7 → F, C; B7 → D♯, A; F♯°7 → A, E♭; Cm6 → E♭, A. */
export function guideNames(c: Pick<GChord, 'root' | 'q' | 'sym'>): [string, string] {
  const l = letterOf(c.sym);
  const [a, b] = guidePcs(c);
  // the 6th of a 6 / m6 chord sits five letters up; a 7th (°7 included) six
  const up = c.q === '6' || c.q === 'm6' ? 5 : 6;
  return [onLetter(a, l + 2) ?? '', onLetter(b, l + up) ?? ''];
}

/** The window (in beats around a change) a guide tone counts in: half a beat early, then up to `late` beats. */
export function gtWindow(level: number): { early: number; late: number } {
  return { early: 0.5, late: level <= 2 ? 1 : level <= 4 ? 0.75 : 0.5 };
}
/** Show the guide-tone names on the chart (the first two tiers; above, they show after a miss). */
export const gtHints = (level: number): boolean => level <= 2;

export type GtVerdict = { kind: 'free' } | { kind: 'dup'; i: number } | { kind: 'hit'; i: number } | { kind: 'wrong'; i: number };

/**
 * Judge one played note: `ms` after the lap's beat 0 (latency removed). The first note in a change's window decides it:
 * a guide tone of that chord → hit, anything else → wrong. Notes outside every window (lines between) are free.
 */
export function gtJudge(lap: GtLap, bpm: number, ms: number, midi: number, caught: boolean[]): GtVerdict {
  const beat = 60000 / bpm;
  const w = gtWindow(lap.level);
  for (let i = 0; i < lap.chords.length; i++) {
    const t = lap.starts[i] * beat;
    if (ms < t - w.early * beat || ms > t + w.late * beat) continue;
    if (caught[i]) return { kind: 'dup', i };
    return guidePcs(lap.chords[i]).includes(pc(midi)) ? { kind: 'hit', i } : { kind: 'wrong', i };
  }
  return { kind: 'free' };
}
/** The first change whose window has closed by `ms` without a guide tone (or −1). */
export function gtMissed(lap: GtLap, bpm: number, ms: number, caught: boolean[]): number {
  const beat = 60000 / bpm;
  const w = gtWindow(lap.level);
  for (let i = 0; i < lap.chords.length; i++) if (!caught[i] && ms > (lap.starts[i] + w.late) * beat) return i;
  return -1;
}

// ---------------------------------------------------------------- the run

export interface GtSave {
  v: 1;
  game: 'guidetone';
  seed: number;
  tier?: DynName;
  level: number;
  /** Laps finished clean (the next lap to play). */
  lap: number;
  /** Changes caught so far in the run. */
  caught: number;
  input: 'mic' | 'midi';
  /** Clean laps: their keys (key mastery). */
  keys: number[];
}
export const newGtSave = (seed: number, level: number, input: 'mic' | 'midi', tier?: DynName): GtSave => ({ v: 1, game: 'guidetone', seed: seed >>> 0, level: Math.max(1, Math.min(GT_LEVELS, level)), lap: 0, caught: 0, input, keys: [], ...(tier ? { tier } : {}) });
export function isGtSave(x: unknown): x is GtSave {
  const s = x as GtSave | null;
  return !!s && s.v === 1 && s.game === 'guidetone' && typeof s.seed === 'number' && typeof s.lap === 'number' && Array.isArray(s.keys);
}
/** A clean lap: the run goes on (saved), a lap faster. */
export const gtLapDone = (s: GtSave, lap: GtLap): GtSave => ({ ...s, lap: s.lap + 1, caught: s.caught + lap.chords.length, keys: [...s.keys, lap.key] });
/** Points per change caught (harder tiers more). */
export const gtPoints = (level: number): number => 5 + level;

/** The finished run (ended by a wrong or missed change after `caughtInLap` changes of the lap). */
export function gtResult(s: GtSave, lap: GtLap, caughtInLap: number) {
  const caught = s.caught + caughtInLap;
  const bpm = lapBpm(s.level, s.lap);
  const keyTakes = [...s.keys.map((key, i) => ({ key, acc: 100, bpm: lapBpm(s.level, i) })), { key: lap.key, acc: Math.round((100 * caughtInLap) / Math.max(1, lap.chords.length)), bpm }];
  return {
    game: 'guidetone' as const,
    score: caught * gtPoints(s.level),
    detail: { right: caught, wrong: 1, best: caught, laps: s.lap, bpm, level: s.level, input: s.input, rounds: Math.max(1, s.lap + 1), ...(s.tier ? { tier: s.tier } : {}), keyTakes },
  };
}

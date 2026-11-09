// Bass measures (BASS_CURRICULUM §4, §10.3): small pure functions on what the take analysis already has — onset
// times, per-note timing offsets, strings, loudness peaks and RMS frames. Each one feeds a pass rule in BassGoal and
// can only lower a verdict (guitarAnalyze.ts). Thresholds marked ⚙ are research starting points to calibrate.

import type { GFrame } from './guitarAnalyze';

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const db = (x: number): number => 20 * Math.log10(Math.max(1e-6, x));

/**
 * Odd / even asymmetry (stand-in for finger or pick alternation): the mean IOI after odd vs after even notes, and the
 * mean loudness of odd vs even notes. Long gaps (> 1.5 × the median IOI: rests, the last note) are left out.
 * Null with fewer than 6 notes.
 */
export function oddEvenAsym(onsets: number[], loud?: number[]): { ms: number; db: number | null } | null {
  if (onsets.length < 6) return null;
  const iois = onsets.slice(1).map((t, i) => t - onsets[i]);
  const med = median(iois);
  const ev: number[] = [];
  const od: number[] = [];
  iois.forEach((x, i) => {
    if (x <= 0 || x > 1.5 * med) return;
    (i % 2 ? od : ev).push(x);
  });
  if (ev.length < 2 || od.length < 2) return null;
  let d: number | null = null;
  if (loud && loud.length === onsets.length && loud.every((x) => x > 0)) {
    const le = loud.filter((_, i) => i % 2 === 0).map(db);
    const lo = loud.filter((_, i) => i % 2 === 1).map(db);
    if (le.length && lo.length) d = Math.abs(mean(le) - mean(lo));
  }
  return { ms: Math.abs(mean(ev) - mean(od)), db: d };
}

/** Loudness spread in dB (SD of the per-note peak level); null with fewer than 4 notes. */
export function loudSdDb(loud: number[]): number | null {
  const xs = loud.filter((x) => x > 0).map(db);
  if (xs.length < 4) return null;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/**
 * String-crossing penalty: mean |timing offset| on notes that change string minus the same on notes that stay on
 * the string (an inefficient plucking hand shows up as late / early crossings). Null when either group is empty.
 */
export function crossingPenalty(devs: (number | null)[], strings: (number | undefined)[]): number | null {
  const cross: number[] = [];
  const same: number[] = [];
  devs.forEach((d, i) => {
    if (i === 0 || d === null || strings[i] === undefined || strings[i - 1] === undefined) return;
    (strings[i] !== strings[i - 1] ? cross : same).push(Math.abs(d));
  });
  if (!cross.length || !same.length) return null;
  return mean(cross) - mean(same);
}

/**
 * Lock with the kick: the share of kick hits with a bass onset within ±tol ms, and the bass onsets near no kick
 * (stray notes). Both lists in ms.
 */
export function kickLock(kicks: number[], onsets: number[], tolMs = 25): { lock: number; stray: number } {
  if (!kicks.length) return { lock: 0, stray: onsets.length };
  const near = (t: number, xs: number[]) => xs.some((x) => Math.abs(x - t) <= tolMs);
  const lock = kicks.filter((k) => near(k, onsets)).length / kicks.length;
  const stray = onsets.filter((o) => !near(o, kicks)).length;
  return { lock, stray };
}

/** When a note stops: the first frame after the onset whose RMS falls under `floor` × the note's peak (else `until`). */
export function releaseTime(frames: GFrame[], onMs: number, untilMs: number, floor = 0.2): number {
  const win = frames.filter((f) => f.t >= onMs && f.t <= untilMs);
  if (!win.length) return untilMs - onMs;
  const pk = Math.max(...win.filter((f) => f.t <= onMs + 60).map((f) => f.rms), 0);
  if (pk <= 0) return 0;
  const end = win.find((f) => f.t > onMs + 30 && f.rms < floor * pk);
  return (end ? end.t : untilMs) - onMs;
}

/** A written note's length class: short (staccato / clipped: under 60 % of the time to the next note) or full. */
export const lengthClass = (durBeats: number, gapBeats: number): 'short' | 'full' => (durBeats < 0.6 * gapBeats ? 'short' : 'full');

/**
 * Share of notes whose sounded length (release ÷ time to the next note) is in the written class: ⚙ short ≤ 0.6,
 * full ≥ 0.75. Null when nothing could be measured.
 */
export function lengthMatch(notes: { want: 'short' | 'full'; ratio: number }[]): number | null {
  if (!notes.length) return null;
  return notes.filter((n) => (n.want === 'short' ? n.ratio <= 0.6 : n.ratio >= 0.75)).length / notes.length;
}

/** How much quieter the ghost notes are than the pitched ones (dB, median vs median); null without both. */
export function ghostGapDb(ghost: number[], pitched: number[]): number | null {
  const g = ghost.filter((x) => x > 0);
  const p = pitched.filter((x) => x > 0);
  if (!g.length || !p.length) return null;
  return db(median(p)) - db(median(g));
}

// ───────────────────────────── walking-bass rules ─────────────────────────────

export type WalkLabel = 'R' | '3' | '5' | '7' | 'tension' | 'chromatic' | 'dominant' | 'scale' | 'other';
export interface WalkChord {
  /** Root pitch class. */
  root: number;
  /** Intervals above the root. */
  iv: number[];
}
export interface WalkReport {
  labels: WalkLabel[];
  /** Share of chord changes (beat 1 of a new chord) on a chord tone. */
  beat1Ct: number;
  /** Share of last beats before a change that approach the next root (chromatic, dominant or scale step). */
  approach: number;
  /** Share of notes repeating the note before. */
  repeats: number;
  /** Lowest to highest note (semitones). */
  range: number;
  /** Index of the first beat-1 that is not a chord tone (−1 = none): the "Why?" pointer. */
  worst: number;
}

/**
 * Label a walking line beat by beat (one note a beat) against the chords: chord tones R/3/5/7, approaches on the
 * beat before a change (chromatic ±1 to the next root, its 5th = dominant, ±2 = scale step), tensions, other.
 */
export function walkRules(line: number[], chordAt: (beat: number) => WalkChord): WalkReport {
  const pc = (n: number) => ((n % 12) + 12) % 12;
  const labels: WalkLabel[] = [];
  let changes = 0;
  let ctAtChange = 0;
  let pre = 0;
  let approaches = 0;
  let worst = -1;
  line.forEach((m, b) => {
    const c = chordAt(b);
    const nx = chordAt(b + 1);
    const rel = pc(m - c.root);
    const isNew = b === 0 || chordAt(b - 1) !== c;
    const beforeChange = b < line.length - 1 && nx !== c;
    let lab: WalkLabel = 'other';
    const ct = c.iv.map((x) => pc(x));
    if (rel === 0) lab = 'R';
    else if (ct.includes(rel)) lab = rel === 3 || rel === 4 ? '3' : rel === 6 || rel === 7 || rel === 8 ? '5' : rel === 9 || rel === 10 || rel === 11 ? '7' : 'tension';
    else if ([2, 5, 9].includes(rel)) lab = 'tension';
    if (beforeChange) {
      const d = pc(m - nx.root);
      const ap: WalkLabel | null = d === 1 || d === 11 ? 'chromatic' : d === 7 ? 'dominant' : d === 2 || d === 10 ? 'scale' : null;
      pre++;
      if (ap) {
        approaches++;
        if (lab === 'other' || lab === 'tension') lab = ap;
      }
    }
    if (isNew) {
      changes++;
      if (ct.includes(rel)) ctAtChange++;
      else if (worst < 0) worst = b;
    }
    labels.push(lab);
  });
  const repeats = line.length > 1 ? line.slice(1).filter((m, i) => m === line[i]).length / (line.length - 1) : 0;
  return {
    labels,
    beat1Ct: changes ? ctAtChange / changes : 1,
    approach: pre ? approaches / pre : 1,
    repeats,
    range: line.length ? Math.max(...line) - Math.min(...line) : 0,
    worst,
  };
}

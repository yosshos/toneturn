// Owner 2026-11-13: a sung melody in a lesson had no click and no "now" — "the most important part is timing", and
// pitch shouldn't stop a beginner over a few cents. A sung sequence gets the grid it was played on (count-in, click,
// the now-chip), and its onsets are graded loosely against that grid.

import type { SingRunQuestion, SingSeqQuestion } from './lesson';
import { segmentNotes } from './memory';
import type { SungFrame } from './sing';

/** Same shape as the UI's Pulse (PulseNotes.tsx): s from beat 1. */
export interface SeqPulse {
  beat: number;
  onsets: number[];
  countIn: number;
  length: number;
}

/** A single sung note passes within this many cents (the status says sharp / flat, the take still counts). */
export const SING_PASS_CENTS = 60;
/** Sung sequences: a note counts as that note within this many cents (was 50). */
export const SEQ_TOL_CENTS = 65;

/** The grid a sung sequence is sung on: the reference's own rhythm, or an even pace. */
export function seqPulse(q: SingSeqQuestion | SingRunQuestion): SeqPulse | null {
  const n = q.midis.length;
  if (n < 2) return null;
  if (q.kind === 'sing-run') {
    const d = 1 / q.run.nps;
    const beat = d * Math.max(1, Math.round(0.6 / d));
    return { beat, onsets: q.midis.map((_, i) => i * d), countIn: 4, length: n * d };
  }
  if (q.tapBeat) return null; // the player taps the beat themselves
  for (let k = q.stimulus.length - 1; k >= 0; k--) {
    const s = q.stimulus[k];
    if (s.kind === 'melody' && s.midis.length === n && s.beats.length === n) {
      const beat = 60 / s.bpm;
      const onsets = s.beats.map((_, i) => s.beats.slice(0, i).reduce((a, b) => a + b, 0) * beat);
      return { beat, onsets, countIn: 4, length: s.beats.reduce((a, b) => a + b, 0) * beat };
    }
    if (s.kind === 'notes' && s.midis.length === n) {
      const d = Math.max(0.35, s.each);
      return { beat: d < 0.45 ? 2 * d : d, onsets: s.midis.map((_, i) => i * d), countIn: 4, length: n * d };
    }
  }
  const d = 0.75;
  return { beat: d, onsets: q.midis.map((_, i) => i * d), countIn: 4, length: n * d };
}

export interface SeqTiming {
  /** Notes started within the window of their beat. */
  inTime: number;
  total: number;
  /** Mean |offset| of the notes found (ms). */
  meanMs: number;
}

/**
 * Onsets against the grid. `zero` = beat 1 in the frames' clock (s). Loose on purpose: a note counts in time within
 * a third of a beat (at least 120 ms), so a beginner is judged on landing with the pulse, not on milliseconds.
 */
export function seqTiming(frames: SungFrame[], pulse: SeqPulse, zero: number): SeqTiming | null {
  const segs = segmentNotes(frames).filter((s) => s.start >= zero - pulse.beat * 0.6);
  if (!segs.length) return null;
  const win = Math.max(0.12, pulse.beat / 3);
  let used = 0;
  let inTime = 0;
  const offs: number[] = [];
  for (const o of pulse.onsets) {
    const at = zero + o;
    let best = -1;
    let bestD = Infinity;
    for (let k = used; k < segs.length; k++) {
      const d = Math.abs(segs[k].start - at);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
      if (segs[k].start > at + pulse.beat) break;
    }
    if (best < 0 || bestD > pulse.beat * 0.75) continue;
    used = best + 1;
    offs.push(bestD);
    if (bestD <= win) inTime++;
  }
  return { inTime, total: pulse.onsets.length, meanMs: offs.length ? Math.round((offs.reduce((a, b) => a + b, 0) / offs.length) * 1000) : 0 };
}

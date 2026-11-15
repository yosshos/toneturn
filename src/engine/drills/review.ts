// The review after a take (COURSE-FEEDBACK-UI §4.1, slice 2): what the TakeReview card says, from the take's own
// numbers — one verdict, three chips (Notes, Time, Even), one suggestion. A weak take shows only the total and the
// suggestion (Fender's soft failure). Pure: the marks on the score and these counts come from the same perNote.

import type { TakeMetrics } from './types';

export type Tendency = 'early' | 'late' | 'even';
export type Suggestion = 'wait' | 'slower' | 'free' | null;

export interface Review {
  verdict: TakeMetrics['verdict'];
  /** Notes right of notes written (perNote), or the accuracy share when there is no per-note list. */
  notes: { ok: number; total: number; share: number };
  /** Timing: the mean offset (− early, + late) and the spread in ms; null in free time or with no timed notes. */
  time: { mean: number; sd: number | null; tendency: Tendency } | null;
  /** Evenness 1–5 (the waveform bars) from the worse hand's spread of intervals; null when not measured. */
  even: number | null;
  /** Very weak take: only the total and the suggestion. */
  soft: boolean;
  suggestion: Suggestion;
}

/** Below this share of notes right the review is "soft": no numbers wall, just the total and one way forward. */
export const SOFT_BELOW = 0.4;
/** Below this share (and not rushing), the suggestion is a slower take. */
export const SLOWER_BELOW = 0.6;
/** Ahead of the click on average by more than this (ms): the fix is waiting for the beat, not a slower tempo. */
export const RUSH_MS = 30;
/** A mean offset inside ± this (ms) reads as "on time". */
export const EVEN_MS = 15;

/** The evenness grade (1–5) of a coefficient of variation of the intervals (0.142 = 14.2 %). */
export function evenGrade(cv: number | null): number | null {
  if (cv === null || !Number.isFinite(cv)) return null;
  return cv < 0.04 ? 5 : cv < 0.06 ? 4 : cv < 0.09 ? 3 : cv < 0.13 ? 2 : 1;
}

export function reviewOf(m: TakeMetrics, opts: { free?: boolean; canFree?: boolean } = {}): Review {
  const total = m.perNote.length;
  const ok = m.perNote.filter((r) => r.ok).length;
  const share = total ? ok / total : m.accuracy;
  const timed = !opts.free && m.timingMean !== null && Number.isFinite(m.timingMean);
  const mean = timed ? m.timingMean! : 0;
  const tendency: Tendency = mean < -EVEN_MS ? 'early' : mean > EVEN_MS ? 'late' : 'even';
  const cvs = [m.cvR, m.cvL].filter((x): x is number => x !== null && Number.isFinite(x));
  const even = opts.free ? null : evenGrade(cvs.length ? Math.max(...cvs) : null);
  const rushing = timed && mean < -RUSH_MS;
  const clean = m.verdict === 'clean';
  const suggestion: Suggestion = clean ? null : rushing ? 'wait' : opts.free ? null : share < SOFT_BELOW && opts.canFree ? 'free' : share < SLOWER_BELOW || m.verdict === 'not' ? 'slower' : null;
  return {
    verdict: m.verdict,
    notes: { ok: total ? ok : Math.round(m.accuracy * 100), total: total || 100, share },
    time: timed ? { mean, sd: m.timingSD, tendency } : null,
    even,
    soft: !clean && share < SOFT_BELOW,
    suggestion,
  };
}

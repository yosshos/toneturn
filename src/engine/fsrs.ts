// A small FSRS-4.5 scheduler (TECH_AND_FEATURE_IDEAS #7), no dependency. Pure.
//
// FSRS models each item by two numbers: stability S (days until recall probability falls to 90 %) and difficulty
// D (1–10). After every review the grade (1 again · 2 hard · 3 good · 4 easy) and the recall probability at that
// moment update both; the next interval is the time at which recall is predicted to fall to the target retention.
// Default parameters are FSRS-4.5's published defaults (trained on ~20k Anki collections).
//
// Old Leitner state migrates without loss: a box's interval becomes the initial stability (at 90 % retention the FSRS
// interval equals S, so the next due date is what the box promised), difficulty starts at the default for "good".

export type Grade = 1 | 2 | 3 | 4;

export interface FsrsCard {
  /** Stability, days. */
  s: number;
  /** Difficulty 1–10. */
  d: number;
  /** ISO time of the last review. */
  last: string;
  /** Successful reviews / lapses (for display and tests). */
  reps: number;
  lapses: number;
}

export const FSRS_W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755] as const;
const DECAY = -0.5;
const FACTOR = 19 / 81; // 0.9 ** (1 / DECAY) - 1
/** Target recall probability at the due date. */
export const FSRS_RETENTION = 0.9;
const DAY = 86400000;

const clampD = (d: number) => Math.min(10, Math.max(1, d));
const w = FSRS_W;

/** Probability of recall after `t` days at stability `s`. */
export const retrievability = (t: number, s: number): number => Math.pow(1 + (FACTOR * Math.max(0, t)) / Math.max(0.01, s), DECAY);

/** Days until recall is predicted to fall to `r` (the FSRS interval), at least 1 day, at most `max`. */
export function nextInterval(s: number, r = FSRS_RETENTION, max = 365): number {
  const i = (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  return Math.min(max, Math.max(1, Math.round(i)));
}

const initD = (g: Grade) => clampD(w[4] - (g - 3) * w[5]);

/** A new card after its first rating. */
export function fsrsInit(g: Grade, now: Date | string): FsrsCard {
  return { s: w[g - 1], d: initD(g), last: iso(now), reps: g > 1 ? 1 : 0, lapses: g === 1 ? 1 : 0 };
}

/** The card after a review graded `g` at `now`. */
export function fsrsReview(c: FsrsCard, g: Grade, now: Date | string): FsrsCard {
  const t = Math.max(0, (new Date(iso(now)).getTime() - new Date(c.last).getTime()) / DAY);
  const r = retrievability(t, c.s);
  // difficulty: move with the grade, then revert a little towards the default
  const d1 = c.d - w[6] * (g - 3);
  const d = clampD(w[7] * initD(3) + (1 - w[7]) * d1);
  let s: number;
  if (g === 1) {
    s = w[11] * Math.pow(d, -w[12]) * (Math.pow(c.s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
    s = Math.min(s, c.s); // a lapse never raises stability
  } else {
    const hard = g === 2 ? w[15] : 1;
    const easy = g === 4 ? w[16] : 1;
    s = c.s * (Math.exp(w[8]) * (11 - d) * Math.pow(c.s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hard * easy + 1);
  }
  return { s: Math.max(0.1, s), d, last: iso(now), reps: c.reps + (g > 1 ? 1 : 0), lapses: c.lapses + (g === 1 ? 1 : 0) };
}

/** A Leitner box's state as an FSRS card: the box interval becomes the stability (nothing is lost on migration). */
export function fromLeitner(intervalDays: number, last: Date | string, box = 0): FsrsCard {
  return { s: Math.max(w[0], intervalDays), d: initD(3), last: iso(last), reps: Math.max(0, box), lapses: 0 };
}

/** The due time of a card (ISO), `nextInterval` days after its last review. */
export function fsrsDue(c: FsrsCard, r = FSRS_RETENTION, max = 365): string {
  return new Date(new Date(c.last).getTime() + nextInterval(c.s, r, max) * DAY).toISOString();
}

function iso(d: Date | string): string {
  return typeof d === 'string' ? (d.length === 10 ? new Date(`${d}T12:00:00`).toISOString() : d) : d.toISOString();
}

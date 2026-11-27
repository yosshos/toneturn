// The reading and transfer pass test (SPEC-HOLISTIC-2 §1.6). Pure.
//
//   A posterior over recency-discounted counts of the tier's cold attempts: half-life 10 attempts, every attempt kept in
//   order; the counts corrected with the §1.7 day-clustering n_eff; pass when P(p ≥ 0.6) ≥ 0.95 with ≥ 8 attempts on
//   ≥ 3 days.

import { betaPost, designEffect, pAtLeast, pBelow, RHO_CELL, RHO_DAY, type BetaPost } from './stats';

/** One cold attempt at the tier (each a distinct unseen item for reading and transfer). */
export interface Attempt {
  day: number;
  clean: boolean;
  /** The cell; omitted = a distinct item per attempt (reading, transfer), so m_c = 1. */
  cell?: string;
}

export interface ReadingPassOpts {
  halfLife: number;
  rhoD: number;
  rhoC: number;
  /** The p the posterior must exceed (0.6). */
  bar: number;
  /** The posterior probability needed (0.95). */
  conf: number;
  minAttempts: number;
  minDays: number;
}

export const READING_PASS: ReadingPassOpts = { halfLife: 10, rhoD: RHO_DAY, rhoC: RHO_CELL, bar: 0.6, conf: 0.95, minAttempts: 8, minDays: 3 };

export interface ReadingPosterior {
  post: BetaPost;
  n: number;
  days: number;
  deff: number;
  /** Discounted weight sum (before the design effect). */
  w: number;
}

/**
 * The recency-discounted, n_eff-corrected posterior over the attempts (§1.6). Weights 0.5^(age / halfLife), newest
 * age 0. The design effect uses the raw counts (m_d = n / distinct days, m_c = n / distinct cells): see report.
 */
export function readingPosterior(attempts: Attempt[], o: ReadingPassOpts = READING_PASS): ReadingPosterior {
  const n = attempts.length;
  const days = new Set(attempts.map((a) => a.day)).size;
  const cells = attempts.some((a) => a.cell !== undefined) ? new Set(attempts.map((a, i) => a.cell ?? `#${i}`)).size : n;
  const deff = designEffect(n, days, cells, o.rhoD, o.rhoC);
  let s = 0;
  let f = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(0.5, (n - 1 - i) / o.halfLife);
    if (attempts[i].clean) s += w;
    else f += w;
  }
  return { post: betaPost(s / deff, f / deff), n, days, deff, w: s + f };
}

/** §1.6: the reading / transfer tier passes on these attempts. */
export function readingPassed(attempts: Attempt[], o: ReadingPassOpts = READING_PASS): boolean {
  const r = readingPosterior(attempts, o);
  return r.n >= o.minAttempts && r.days >= o.minDays && pAtLeast(r.post, o.bar) >= o.conf;
}

/** The sequential test as the app runs it (checked after every attempt): the index of the passing attempt, or −1. */
export function readingPassIndex(attempts: Attempt[], o: ReadingPassOpts = READING_PASS): number {
  for (let i = 0; i < attempts.length; i++) if (readingPassed(attempts.slice(0, i + 1), o)) return i;
  return -1;
}

/** §1.3 non-tempo placement correction input: P(p < 0.4) on the same posterior. */
export function readingPBelow(attempts: Attempt[], x = 0.4, o: ReadingPassOpts = READING_PASS): number {
  return pBelow(readingPosterior(attempts, o).post, x);
}

// Per-skill ratings: a simple, explainable Elo-style model (spec: "Progression, placement and Skill Map").
//
//   expected  E = 1 / (1 + 10^((D − R) / 400))        D = item difficulty, R = player rating
//   update    R' = R + K · (S − E),  |ΔR| ≤ MAX_STEP   S = 1 correct on first attempt, 0 otherwise
//   K         = 64 while provisional (< 8 rated items), then 24
//
// Only first musical attempts are rated. Silence, unclear speech, permission failures and skipped
// questions are never rated. Each item can be rated once (event ids) → no replay farming / double updates.

import type { SkillId } from './lesson';

export const START_RATING = 1000;
export const PROVISIONAL_UNTIL = 8;
export const MAX_STEP = 60;
export const K_PROVISIONAL = 64;
export const K_ESTABLISHED = 24;

/** Rating band used to normalise the Skill Map (documented in docs/ARCHITECTURE.md). */
export const BAND_MIN = 600;
export const BAND_MAX = 1600;

export const SKILLS: SkillId[] = ['degrees', 'chords', 'cadences', 'singing', 'sequences', 'rhythm', 'intervals'];
/** Axes on the Skill Map that have no content yet — always shown as unmeasured. */
export const PLANNED_SKILLS = [] as const;

export interface RatingEvent {
  id: string; // unique per rated item, e.g. `${sessionId}:${questionId}`
  skill: SkillId;
  difficulty: number;
  correct: boolean;
  at: string; // ISO
}

export interface SkillRating {
  r: number;
  n: number; // rated items
  correct: number;
  /** Last few updates, newest last (for the diagnosis panel). */
  recent: { d: number; s: 0 | 1; delta: number; at: string }[];
}

export type Ratings = Partial<Record<SkillId, SkillRating>>;

export const expected = (rating: number, difficulty: number) => 1 / (1 + Math.pow(10, (difficulty - rating) / 400));

export function rate(cur: SkillRating | undefined, e: Pick<RatingEvent, 'difficulty' | 'correct' | 'at'>): SkillRating {
  const base = cur ?? { r: START_RATING, n: 0, correct: 0, recent: [] };
  const k = base.n < PROVISIONAL_UNTIL ? K_PROVISIONAL : K_ESTABLISHED;
  const s: 0 | 1 = e.correct ? 1 : 0;
  const raw = k * (s - expected(base.r, e.difficulty));
  const delta = Math.round(Math.max(-MAX_STEP, Math.min(MAX_STEP, raw)));
  return {
    r: base.r + delta,
    n: base.n + 1,
    correct: base.correct + s,
    recent: [...base.recent, { d: e.difficulty, s, delta, at: e.at }].slice(-10),
  };
}

/** Fold events (deduplicated by id, in time order) into ratings. Pure and order-stable. */
export function foldRatings(events: RatingEvent[]): Ratings {
  const seen = new Set<string>();
  const out: Ratings = {};
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out[e.skill] = rate(out[e.skill], e);
  }
  return out;
}

export type Evidence = 'unmeasured' | 'provisional' | 'measured';
export const evidence = (s: SkillRating | undefined): Evidence => (!s || s.n === 0 ? 'unmeasured' : s.n < PROVISIONAL_UNTIL ? 'provisional' : 'measured');

/** 0..1 position on the Skill Map (null = unmeasured: never drawn as zero). */
export function normalised(s: SkillRating | undefined): number | null {
  if (!s || s.n === 0) return null;
  return Math.max(0, Math.min(1, (s.r - BAND_MIN) / (BAND_MAX - BAND_MIN)));
}

export type Band = 'beginner' | 'developing' | 'solid' | 'advanced';
export function band(r: number): Band {
  if (r < 900) return 'beginner';
  if (r < 1100) return 'developing';
  if (r < 1300) return 'solid';
  return 'advanced';
}

/** Weakest measured skill, else the first unmeasured one — the single recommendation. */
export function weakestSkill(ratings: Ratings, available: SkillId[] = SKILLS): SkillId {
  const measured = available.filter((k) => (ratings[k]?.n ?? 0) > 0);
  const unmeasured = available.filter((k) => !(ratings[k]?.n ?? 0));
  if (measured.length) {
    const worst = measured.reduce((a, b) => (ratings[a]!.r <= ratings[b]!.r ? a : b));
    // Prefer measuring something new once everything measured is above "developing".
    if (ratings[worst]!.r >= 1100 && unmeasured.length) return unmeasured[0];
    return worst;
  }
  return unmeasured[0] ?? available[0];
}

/** Placement ladder step: up after a first-try correct, down after a miss, clamped to [0, max]. */
export const nextLevel = (level: number, correct: boolean, max = 2) => Math.max(0, Math.min(max, level + (correct ? 1 : -1)));

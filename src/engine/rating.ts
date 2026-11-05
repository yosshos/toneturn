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

/** Skill Map axis order: listening skills, then performance/memory pairs (pitch: in tune + memory; rhythm: memory + precision). */
/** Grouped as in spec G.8: listening → performance → memory → precision. */
export const SKILLS: SkillId[] = ['degrees', 'notes', 'intervals', 'chords', 'cadences', 'rhythm-dictation', 'singing', 'rhythm-reading', 'sequences', 'agility', 'technique', 'rhythm', 'timing'];
/** Axes on the Skill Map that have no content yet — always shown as unmeasured. */
export const PLANNED_SKILLS = [] as const;

export interface RatingEvent {
  id: string; // unique per rated item, e.g. `${sessionId}:${questionId}`
  skill: SkillId;
  difficulty: number;
  correct: boolean;
  /** Graded result 0..1 (e.g. rhythmic precision). Overrides `correct` when present. */
  score?: number;
  at: string; // ISO
}

export interface SkillRating {
  r: number;
  n: number; // rated items
  correct: number;
  /** Last few updates, newest last (for the diagnosis panel). */
  recent: { d: number; s: number; delta: number; at: string }[];
}

export type Ratings = Partial<Record<SkillId, SkillRating>>;

export const expected = (rating: number, difficulty: number) => 1 / (1 + Math.pow(10, (difficulty - rating) / 400));

export function rate(cur: SkillRating | undefined, e: Pick<RatingEvent, 'difficulty' | 'correct' | 'at' | 'score'>): SkillRating {
  const base = cur ?? { r: START_RATING, n: 0, correct: 0, recent: [] };
  const k = base.n < PROVISIONAL_UNTIL ? K_PROVISIONAL : K_ESTABLISHED;
  const s = e.score !== undefined ? Math.max(0, Math.min(1, e.score)) : e.correct ? 1 : 0;
  const raw = k * (s - expected(base.r, e.difficulty));
  const delta = Math.round(Math.max(-MAX_STEP, Math.min(MAX_STEP, raw)));
  return {
    r: base.r + delta,
    n: base.n + 1,
    correct: base.correct + (s >= 0.5 ? 1 : 0),
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

/** A skill's rating over time: one point per local day (the rating after that day's last answer). */
export interface TrendPoint {
  day: string; // YYYY-MM-DD (local)
  r: number;
  n: number;
}
export function ratingHistory(events: RatingEvent[], skill: SkillId, dayOf: (iso: string) => string = (iso) => iso.slice(0, 10)): TrendPoint[] {
  const seen = new Set<string>();
  let cur: SkillRating | undefined;
  const out: TrendPoint[] = [];
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    if (e.skill !== skill || seen.has(e.id)) continue;
    seen.add(e.id);
    cur = rate(cur, e);
    const day = dayOf(e.at);
    const last = out[out.length - 1];
    if (last && last.day === day) {
      last.r = cur.r;
      last.n = cur.n;
    } else out.push({ day, r: cur.r, n: cur.n });
  }
  return out;
}

/** Change over a trend: last minus first point (null with fewer than two days). */
export const trendDelta = (pts: TrendPoint[]) => (pts.length >= 2 ? pts[pts.length - 1].r - pts[0].r : null);

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

// ======================================================================= overall rating (spec L)

/** Importance per skill in the overall rating; game-only axes count half. */
export const OVERALL_WEIGHT: Partial<Record<SkillId, number>> = { rhythm: 0.5, timing: 0.5 };
const CONFIDENT_AT = 12;
export const OVERALL_PROVISIONAL = { skills: 4, answers: 30 };

export interface Overall {
  r: number;
  provisional: boolean;
  /** Measured skills and rated answers behind the number. */
  skills: number;
  n: number;
}

/**
 * Overall rating: confidence-weighted mean of the measured skills. A skill's rating is shrunk toward
 * the start in proportion to how little it is measured, so two lucky answers barely move the overall.
 */
export function overallRating(ratings: Ratings): Overall | null {
  let num = 0;
  let den = 0;
  let skills = 0;
  let n = 0;
  for (const k of SKILLS) {
    const s = ratings[k];
    if (!s || s.n === 0) continue;
    const c = Math.min(1, s.n / CONFIDENT_AT);
    const w = (OVERALL_WEIGHT[k] ?? 1) * c;
    num += w * (START_RATING + c * (s.r - START_RATING));
    den += w;
    skills++;
    n += s.n;
  }
  if (!den) return null;
  return { r: Math.round(num / den), provisional: skills < OVERALL_PROVISIONAL.skills || n < OVERALL_PROVISIONAL.answers, skills, n };
}

/** Overall rating over time, one point per local day. */
export function overallHistory(events: RatingEvent[], dayOf: (iso: string) => string = (iso) => iso.slice(0, 10)): TrendPoint[] {
  const seen = new Set<string>();
  const cur: Ratings = {};
  const out: TrendPoint[] = [];
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    cur[e.skill] = rate(cur[e.skill], e);
    const o = overallRating(cur)!;
    const day = dayOf(e.at);
    const last = out[out.length - 1];
    if (last && last.day === day) {
      last.r = o.r;
      last.n = o.n;
    } else out.push({ day, r: o.r, n: o.n });
  }
  return out;
}

export const peakOf = (h: TrendPoint[]) => (h.length ? Math.max(...h.map((p) => p.r)) : null);

export interface RatingChange {
  overall: { from: number | null; to: number; provisional: boolean } | null;
  /** Skills this session rated, with their change. */
  skills: { skill: SkillId; from: number | null; to: number; answers: number }[];
  /** Bands reached in this session ("You reached Solid in Chords"). */
  bandsReached: { skill: SkillId; band: Band }[];
}

export function ratingChange(before: Ratings, after: Ratings): RatingChange {
  const skills = SKILLS.filter((k) => (after[k]?.n ?? 0) > (before[k]?.n ?? 0)).map((k) => ({
    skill: k,
    from: before[k]?.n ? before[k]!.r : null,
    to: after[k]!.r,
    answers: after[k]!.n - (before[k]?.n ?? 0),
  }));
  const ob = overallRating(before);
  const oa = overallRating(after);
  const order: Band[] = ['beginner', 'developing', 'solid', 'advanced'];
  const bandsReached = skills
    .filter((s) => s.from !== null && order.indexOf(band(s.to)) > order.indexOf(band(s.from)))
    .map((s) => ({ skill: s.skill, band: band(s.to) }));
  return { overall: oa ? { from: ob ? ob.r : null, to: oa.r, provisional: oa.provisional } : null, skills, bandsReached };
}

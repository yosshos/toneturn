// Per-skill ratings: a simple, explainable Elo-style model (spec: "Progression, placement and Skill Map").
//
//   expected  E = 1 / (1 + 10^((D − R) / 400))        D = item difficulty, R = player rating
//   update    R' = R + K · (S − E),  |ΔR| ≤ MAX_STEP   S = graded score 0..1 (scoring.ts: accuracy × attempt
//             credit × time × replays), or 1 / 0 for events without a graded score
//   K         = 64 while provisional (< 8 rated items), then 24
//
// Each item is rated once (its best attempt, with guess-corrected retry credit). Silence, unclear speech, permission failures and skipped
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
export const SKILLS: SkillId[] = ['degrees', 'intervals', 'chords', 'cadences', 'modes', 'pitch', 'absolute', 'rhythm-dictation', 'rhythm-reading', 'timing', 'tempo', 'meter', 'sequences', 'rhythm', 'form', 'singing', 'technique', 'agility', 'notes', 'theory', 'sight', 'dictation', 'improv', 'transpose', 'expression', 'instrument', 'timbre'];

/** The Skill Map's six domains (product owner, spec AD): skills grouped by how closely the concepts are related. */
export type DomainId = 'pitch' | 'time' | 'memory' | 'voice' | 'reading' | 'creative' | 'instrument';
export const DOMAINS: { id: DomainId; skills: SkillId[] }[] = [
  { id: 'pitch', skills: ['degrees', 'intervals', 'chords', 'cadences', 'modes', 'pitch', 'absolute'] },
  { id: 'time', skills: ['rhythm-dictation', 'rhythm-reading', 'timing', 'tempo', 'meter'] },
  { id: 'memory', skills: ['sequences', 'rhythm', 'form'] },
  { id: 'voice', skills: ['singing', 'technique', 'agility'] },
  { id: 'reading', skills: ['notes', 'theory', 'sight', 'dictation'] },
  { id: 'creative', skills: ['improv', 'transpose', 'expression'] },
  { id: 'instrument', skills: ['instrument', 'timbre'] },
];
export const domainOf = (k: SkillId): DomainId => DOMAINS.find((d) => d.skills.includes(k))?.id ?? 'pitch';
/** Axes on the Skill Map that have no content yet — always shown as unmeasured. */
export const PLANNED_SKILLS = [] as const;

export interface RatingEvent {
  id: string; // unique per rated item, e.g. `${sessionId}:${questionId}`
  skill: SkillId;
  difficulty: number;
  correct: boolean;
  /** Graded result 0..1 (e.g. rhythmic precision). Overrides `correct` when present. */
  score?: number;
  /** Placement (Find my level): set the rating to this value instead of an Elo step. */
  set?: number;
  /** With `set` only: evidence credited (default PROVISIONAL_UNTIL − 2; never lowers what the skill already has). */
  setN?: number;
  /** With `set` only (SPEC-PLACEMENT §5): the next `fast` answers in this skill use K_PROVISIONAL, so practice
   *  corrects a short placement quickly. Absent = no change from the classic rule. */
  fast?: number;
  /** Spec AD: the item trains several skills — (skill, sub-skill, weight), Σw = 1, primary = `skill`. */
  tags?: { skill: SkillId; sub?: string; w: number }[];
  at: string; // ISO
}

export interface SkillRating {
  r: number;
  n: number; // rated items
  correct: number;
  /** Last few updates, newest last (for the diagnosis panel). */
  recent: { d: number; s: number; delta: number; at: string }[];
  /** Answers left at the fast (provisional) K after a placement set (SPEC-PLACEMENT §5). */
  fast?: number;
}

/** K for the next answer: provisional while young or inside a post-placement fast window. */
const kFor = (b: SkillRating) => (b.n < PROVISIONAL_UNTIL || (b.fast ?? 0) > 0 ? K_PROVISIONAL : K_ESTABLISHED);
/** The fast window shrinks by one per rated answer (the field disappears at 0). */
const tick = (b: SkillRating): { fast?: number } => ((b.fast ?? 0) > 1 ? { fast: b.fast! - 1 } : {});

export type Ratings = Partial<Record<SkillId, SkillRating>>;

export const expected = (rating: number, difficulty: number) => 1 / (1 + Math.pow(10, (difficulty - rating) / 400));

export function rate(cur: SkillRating | undefined, e: Pick<RatingEvent, 'difficulty' | 'correct' | 'at' | 'score' | 'set' | 'setN' | 'fast'>): SkillRating {
  const base = cur ?? { r: START_RATING, n: 0, correct: 0, recent: [] };
  if (e.set !== undefined) {
    // A staircase to failure measures the skill: set it, and count it as several answers of evidence.
    const n = Math.max(base.n, e.setN ?? PROVISIONAL_UNTIL - 2);
    return { r: Math.round(e.set), n, correct: base.correct, recent: [...base.recent, { d: e.difficulty, s: 1, delta: Math.round(e.set) - base.r, at: e.at }].slice(-10), ...(e.fast ? { fast: e.fast } : {}) };
  }
  const k = kFor(base);
  const s = e.score !== undefined ? Math.max(0, Math.min(1, e.score)) : e.correct ? 1 : 0;
  const raw = k * (s - expected(base.r, e.difficulty));
  const delta = Math.round(Math.max(-MAX_STEP, Math.min(MAX_STEP, raw)));
  return {
    r: base.r + delta,
    n: base.n + 1,
    correct: base.correct + (s >= 0.5 ? 1 : 0),
    recent: [...base.recent, { d: e.difficulty, s, delta, at: e.at }].slice(-10),
    ...tick(base),
  };
}

// ---------------------------------------------------------------- multi-skill credit (spec AD §3.2)
//
// An item tagged with several skills is expected against the weighted composite of their ratings,
// Rc = Σ wₛ·Rₛ, and each skill with wₛ ≥ MIN_UPDATE_W moves by K·shareₛ·(S − E). On a success the
// share is the weight; on a miss the blame leans toward the skills that are weaker than the composite
// (wₛ·(1 + λ·zₛ), renormalised), so a player who knows degrees but not key names loses in note naming.
// A single tag (or none) is exactly the classic one-skill update.

export const MIN_UPDATE_W = 0.15;
export const BLAME_LAMBDA = 0.5;

/** Apply one event to a ratings map (returns the skills it changed). Mutates `out`. */
export function applyEvent(out: Ratings, e: RatingEvent): SkillId[] {
  const tags = (e.tags ?? []).filter((t) => t.w > 0);
  if (e.set !== undefined || tags.length <= 1) {
    out[e.skill] = rate(out[e.skill], e);
    return [e.skill];
  }
  const cur = (k: SkillId) => out[k] ?? { r: START_RATING, n: 0, correct: 0, recent: [] };
  const rc = tags.reduce((a, t) => a + t.w * cur(t.skill).r, 0) / tags.reduce((a, t) => a + t.w, 0);
  const s = e.score !== undefined ? Math.max(0, Math.min(1, e.score)) : e.correct ? 1 : 0;
  const err = s - expected(rc, e.difficulty);
  const upd = tags.filter((t) => t.w >= MIN_UPDATE_W || t.skill === e.skill);
  const wSum = upd.reduce((a, t) => a + t.w, 0);
  const raw = upd.map((t) => (err >= 0 ? t.w : t.w * (1 + BLAME_LAMBDA * Math.max(0, (rc - cur(t.skill).r) / 200))));
  const rawSum = raw.reduce((a, x) => a + x, 0) || 1;
  upd.forEach((t, i) => {
    const base = cur(t.skill);
    const share = (raw[i] / rawSum) * wSum;
    const k = kFor(base);
    const delta = Math.round(Math.max(-MAX_STEP, Math.min(MAX_STEP, k * share * err)));
    out[t.skill] = { r: base.r + delta, n: base.n + 1, correct: base.correct + (s >= 0.5 ? 1 : 0), recent: [...base.recent, { d: e.difficulty, s, delta, at: e.at }].slice(-10), ...tick(base) };
  });
  return upd.map((t) => t.skill);
}

const byTime = (events: RatingEvent[]) => [...events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));

/** Fold events (deduplicated by id, in time order) into ratings. Pure and order-stable. */
export function foldRatings(events: RatingEvent[]): Ratings {
  const seen = new Set<string>();
  const out: Ratings = {};
  for (const e of byTime(events)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    applyEvent(out, e);
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
  const all: Ratings = {};
  const out: TrendPoint[] = [];
  for (const e of byTime(events)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    if (!applyEvent(all, e).includes(skill)) continue;
    const cur = all[skill]!;
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
// Core listening and musicianship count fully; supporting skills ¾; voice-specific and creative skills ½
// (they count only once measured, so a non-singer is never pulled down); absolute pitch is tracked apart.
export const OVERALL_WEIGHT: Partial<Record<SkillId, number>> = {
  notes: 0.75, modes: 0.75, theory: 0.75, pitch: 0.75, sight: 0.75, timing: 0.75, rhythm: 0.75, transpose: 0.75, meter: 0.75, form: 0.75,
  technique: 0.5, agility: 0.5, improv: 0.5, expression: 0.5,
  absolute: 0,
};

/** A domain's place on the map: the confidence-weighted mean of its measured skills (null = none measured). */
export function domainValue(ratings: Ratings, d: DomainId): { v: number; n: number } | null {
  let num = 0;
  let den = 0;
  let n = 0;
  for (const k of DOMAINS.find((x) => x.id === d)!.skills) {
    const s = ratings[k];
    if (!s || s.n === 0 || k === 'absolute') continue;
    const w = Math.min(1, s.n / CONFIDENT_AT);
    num += w * Math.max(0, Math.min(1, (s.r - BAND_MIN) / (BAND_MAX - BAND_MIN)));
    den += w;
    n += s.n;
  }
  return den ? { v: num / den, n } : null;
}
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
    if (!s || s.n === 0 || OVERALL_WEIGHT[k] === 0) continue; // absolute pitch is tracked apart (spec S.11)
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
  for (const e of byTime(events)) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    applyEvent(cur, e);
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

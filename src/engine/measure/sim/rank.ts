// Rank by passed exercises (owner decision H8, SPEC-HOLISTIC-2 §1.7) and the entry ceiling (§1.3). Pure.

import { betaCdf, designEffect } from './stats';

/** An exercise (§1.7 `exerciseId`: spec template + level/option (+ nps rung), without key or hand). */
export interface Exercise {
  id: string;
  /** Content tier (§1.2). */
  tier: number;
  /** Keys it can be played in (12 for keyed technique; 0 = keyless area). */
  keys: number;
  /** The actual key set when it is not 0 … keys − 1 (e.g. a 1-key exercise in E♭). §1.7 step 4 takes the union. */
  keySet?: number[];
  /** False for "needs MIDI", "teacher or recording needed", region-denied, small-hands-replaced (§1.7). */
  available: boolean;
}

/** A stored `passedAt` record (§1.7, §1.15): one per passed cell (exercise × key). */
export interface PassRecord {
  exerciseId: string;
  /** Content tier stored at pass time (re-tiering never rewrites it). */
  tier: number;
  /** The key of the passing cell; null for keyless. */
  key: number | null;
  at: number;
  /** §1.7 teacher targets / voice bands: false = coverage only (never counts for rank). Default true. */
  countsForRank?: boolean;
}

/** A counting cold check of a working cell (§1.6), logged for the rank tier guard. */
export interface CountingCheck {
  tier: number;
  day: number;
  cell: string;
  clean: boolean;
  /** Hours since the origin (orders a merged record; optional for hand-built records, which are already in order). */
  at?: number;
  /**
   * What the entry is (v15): 'check' = a counting cold check of a working cell (§1.6); 'look' = a probe-band cold look of
   * a passed cell (confirmation slot, FSRS review or guard probe), read only at a tier with no fresh cell left (§1.7 step
   * 6); 'skip' = a skipped due check (the cell was sounded that day before, or without, its due cold check): a miss.
   */
  kind?: 'check' | 'look' | 'skip';
  /**
   * False = never read by the guard: a check at a lowered teacher target, at a looser voice cents band than the tier
   * requires, or from a not-comparable input (a mic take on a keys item that expects MIDI; SPEC-INPUT-SOURCE R5).
   */
  countsForRank?: boolean;
}

/**
 * The rank tier guard G (§1.7 step 6; owner 2026-11-28: the default): rank at t also needs the pooled record of EVERY
 * counting cold check at tiers lo … t (all exercises, keys and shelved cells; recency-weighted, half-life `halfLife`
 * checks; n_eff with the §1.7 day and cell design effect) to give P(p ≥ bar) ≥ conf, with ≥ minChecks checks. Passes
 * alone can be cherry-picked from the easiest of many cells; this record cannot.
 */
export interface TierGuard {
  bar: number;
  conf: number;
  halfLife: number;
  minChecks: number;
  /** Candidate (v15 owner question): the record must span >= minDays distinct days (default: no such rule). */
  minDays?: number;
  /**
   * Candidate (v15 owner question), a sequential-testing correction: the guard must also hold on the record without its
   * newest `persist` entries, so one lucky run at the end of a long, repeatedly tested record is not enough (default 0).
   */
  persist?: number;
}
/** The guard approved 2026-11-28 (bar 0.5, 80 %, half-life 24 checks, >= 6 checks). */
export const TIER_GUARD: TierGuard = { bar: 0.5, conf: 0.8, halfLife: 24, minChecks: 6 };
/** H8 with the tier guard (and the fresh-check re-offer it needs in the planner). The default rank rule. */
export const RANK_GUARDED: RankOpts = { minTwoExercises: true, keysUnion: true, tierGuard: TIER_GUARD };

/** Does the pooled counting-check record at tiers lo … t pass the guard? */
export function tierGuardOk(checks: CountingCheck[], lo: number, t: number, g: TierGuard): boolean {
  const w = checks.filter((c) => c.tier >= lo && c.tier <= t && c.countsForRank !== false);
  if (!guardRecordOk(w, g)) return false;
  return !g.persist || guardRecordOk(w.slice(0, Math.max(0, w.length - g.persist)), g);
}

/** The guard's posterior test on one record (already restricted to the range, in time order). */
function guardRecordOk(w: CountingCheck[], g: TierGuard): boolean {
  if (w.length < g.minChecks) return false;
  if (g.minDays && new Set(w.map((c) => c.day)).size < g.minDays) return false;
  let s = 0;
  let f = 0;
  w.forEach((c, i) => {
    const wt = Math.pow(0.5, (w.length - 1 - i) / g.halfLife);
    if (c.clean) s += wt;
    else f += wt;
  });
  const deff = designEffect(w.length, new Set(w.map((c) => c.day)).size, new Set(w.map((c) => c.cell)).size);
  return 1 - betaCdf(g.bar, 1 + s / deff, 1 + f / deff) >= g.conf;
}

/** Tiers that have ≥ 1 available exercise, ascending (§1.3 "non-empty tiers"; §1.7 empty tiers are skipped). */
export function nonEmptyTiers(ex: Exercise[]): number[] {
  return [...new Set(ex.filter((e) => e.available).map((e) => e.tier))].sort((a, b) => a - b);
}

/** Exercise ids with at least one counting pass. */
export function passedExerciseIds(passes: PassRecord[]): Set<string> {
  return new Set(passes.filter((p) => p.countsForRank !== false).map((p) => p.exerciseId));
}

/**
 * §1.3 the entry ceiling: with base = max(placedTier, rankHW), entry = the next non-empty tier above the base; it opens
 * the non-empty tier after that once every available exercise at the +1 tier is passed (the t + 2 opening). Computed
 * from the stored rankHW, never the derived rank. With no non-empty tier above the base, the ceiling is the top tier.
 */
export function entryCeiling(ex: Exercise[], placedTier: number, rankHW: number | null, passed: Set<string>): number {
  const tiers = nonEmptyTiers(ex);
  if (!tiers.length) return placedTier;
  const base = Math.max(placedTier, rankHW ?? -Infinity);
  const i1 = tiers.findIndex((t) => t > base);
  if (i1 < 0) return Math.max(base, tiers[tiers.length - 1]);
  const t1 = tiers[i1];
  const allPassed = ex.filter((e) => e.available && e.tier === t1).every((e) => passed.has(e.id));
  return allPassed && i1 + 1 < tiers.length ? tiers[i1 + 1] : t1;
}

/**
 * §1.7 rank (H8), derived: the highest non-empty tier t such that
 *   ≥ min(3, available exercises in tiers t … the entry ceiling) distinct exercises are passed at tiers ≥ t,
 *   in ≥ min(2, available keys) keys (union over those exercises), with ≥ 1 pass at tier t itself.
 * A tier above the ceiling (a manual pass) uses the available exercises at tiers t … t (see report). Null = none.
 */
/** §1.7 steps 1–2: the range R of tier t (lo … top after grouping), its available exercises, and whether it grew downward. */
export interface RankRange {
  lo: number;
  top: number;
  avail: Exercise[];
  downward: boolean;
}

/** §1.7 steps 1–2 for tier t under the given entry ceiling; null when fix 1 cannot reach 2 exercises at all. */
export function rankRange(ex: Exercise[], t: number, ceiling: number, o: RankOpts = DEFAULT_RANK): RankRange | null {
  const tiers = nonEmptyTiers(ex);
  let top = Math.max(t, ceiling);
  let lo = t;
  let avail = ex.filter((e) => e.available && e.tier >= lo && e.tier <= top);
  let downward = false;
  if (o.minTwoExercises) {
    // Fix 1 (coordinator 2026-11-27): rank needs ≥ 2 distinct exercises; a range with < 2 available exercises is
    // grouped with the next non-empty tier above (repeatedly). With nothing above (a 1-exercise top tier), it is
    // grouped with the next non-empty tier below: ≥ 2 distinct exercises across the two, ≥ 1 at the top tier.
    while (avail.length < 2) {
      const up = tiers.find((x) => x > top);
      if (up === undefined) break;
      top = up;
      avail = ex.filter((e) => e.available && e.tier >= lo && e.tier <= top);
    }
    while (avail.length < 2) {
      const down = [...tiers].reverse().find((x) => x < lo);
      if (down === undefined) break;
      lo = down;
      downward = true;
      avail = ex.filter((e) => e.available && e.tier >= lo && e.tier <= top);
    }
    if (avail.length < 2) return null;
  }
  return { lo, top, avail, downward };
}

/** The lowest tier of the guard's range for tier t (step 6: lo = the lowest tier of R when R grew downward, else t). */
export function guardLo(ex: Exercise[], t: number, ceiling: number, o: RankOpts = DEFAULT_RANK): number {
  const r = rankRange(ex, t, ceiling, o);
  return r && r.downward ? r.lo : t;
}

export function deriveRank(ex: Exercise[], passes: PassRecord[], ceiling: number, o: RankOpts = DEFAULT_RANK, checks?: CountingCheck[]): number | null {
  const counting = passes.filter((p) => p.countsForRank !== false);
  const tiers = nonEmptyTiers(ex);
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    const rr = rankRange(ex, t, ceiling, o);
    if (!rr) continue;
    const { lo, avail, downward } = rr;
    const need = o.minTwoExercises ? (downward ? 2 : Math.max(2, Math.min(3, avail.length))) : Math.min(3, avail.length);
    const keysAvail = o.keysUnion ? keyUnion(avail).size : avail.reduce((m, e) => Math.max(m, e.keys), 0);
    const needKeys = Math.min(2, keysAvail);
    const above = counting.filter((p) => p.tier >= lo);
    const exIds = new Set(above.map((p) => p.exerciseId));
    if (exIds.size < Math.max(1, need)) continue;
    if (!above.some((p) => p.tier === t)) continue;
    const keys = new Set(above.filter((p) => p.key !== null).map((p) => p.key));
    if (keys.size < needKeys) continue;
    if (o.tierGuard && checks && !tierGuardOk(checks, lo, t, o.tierGuard)) continue;
    return t;
  }
  return null;
}

/**
 * Tiers rank can ever reach: every non-empty tier (a 1-exercise top tier is grouped downward), except in a catalogue
 * with a single available exercise in all, which fix 1 can never rank.
 */
export function rankableTiers(ex: Exercise[], o: RankOpts = DEFAULT_RANK): number[] {
  const tiers = nonEmptyTiers(ex);
  return o.minTwoExercises && ex.filter((e) => e.available).length < 2 ? [] : tiers;
}

/** The keys an exercise can be played in. */
export const keysOf = (e: Exercise): number[] => e.keySet ?? Array.from({ length: e.keys }, (_, k) => k);
/** §1.7 step 4: the union of the available exercises' keys. */
export const keyUnion = (ex: Exercise[]): Set<number> => new Set(ex.flatMap(keysOf));

/**
 * Rank options. `minTwoExercises` = fix 1 (on by default); false = v12 as written. `keysUnion` = §1.7 step 4 "available
 * keys = the union of the keys of the available exercises in R" (default, round 17); false = the earlier max of the
 * exercises' key counts (differs only when key sets differ, e.g. two 1-key exercises in different keys).
 */
export interface RankOpts {
  minTwoExercises: boolean;
  keysUnion?: boolean;
  /** The rank tier guard (round 17 proposal; off = H8 as approved). */
  tierGuard?: TierGuard;
}
/** Ungated H8 (fix 1 + keys union, no tier guard): selectable variant since 2026-11-28. */
export const RANK_FIX: RankOpts = { minTwoExercises: true, keysUnion: true };
export const RANK_V12: RankOpts = { minTwoExercises: false, keysUnion: false };
/**
 * The default rank rule (owner 2026-11-28): H8 + the tier guard. The pure helpers apply the guard only when a check log
 * is passed (`checks`); the simulator always passes one.
 */
export const DEFAULT_RANK: RankOpts = RANK_GUARDED;

/** §1.7 rank = max(rankHW, derived): never falls. Returns the new high-water. */
export function updateRankHW(ex: Exercise[], passes: PassRecord[], placedTier: number, rankHW: number | null, o: RankOpts = DEFAULT_RANK, checks?: CountingCheck[]): number | null {
  const ceiling = entryCeiling(ex, placedTier, rankHW, passedExerciseIds(passes));
  const d = deriveRank(ex, passes, ceiling, o, checks);
  if (d === null) return rankHW;
  return rankHW === null ? d : Math.max(rankHW, d);
}

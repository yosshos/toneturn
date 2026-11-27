// Rank by passed exercises (owner decision H8, SPEC-HOLISTIC-2 §1.7) and the entry ceiling (§1.3). Pure.

/** An exercise (§1.7 `exerciseId`: spec template + level/option (+ nps rung), without key or hand). */
export interface Exercise {
  id: string;
  /** Content tier (§1.2). */
  tier: number;
  /** Keys it can be played in (12 for keyed technique; 0 = keyless area). */
  keys: number;
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
export function deriveRank(ex: Exercise[], passes: PassRecord[], ceiling: number, o: RankOpts = RANK_FIX): number | null {
  const counting = passes.filter((p) => p.countsForRank !== false);
  const tiers = nonEmptyTiers(ex);
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    let top = Math.max(t, ceiling);
    let avail = ex.filter((e) => e.available && e.tier >= t && e.tier <= top);
    if (o.minTwoExercises) {
      // Fix 1 (coordinator 2026-11-27): rank needs ≥ 2 distinct exercises; a range with < 2 available exercises is
      // grouped with the next non-empty tier above (repeatedly). With nothing above, the tier cannot be ranked.
      while (avail.length < 2) {
        const up = tiers.find((x) => x > top);
        if (up === undefined) break;
        top = up;
        avail = ex.filter((e) => e.available && e.tier >= t && e.tier <= top);
      }
      if (avail.length < 2) continue;
    }
    const need = o.minTwoExercises ? Math.max(2, Math.min(3, avail.length)) : Math.min(3, avail.length);
    const keysAvail = avail.reduce((m, e) => Math.max(m, e.keys), 0);
    const needKeys = Math.min(2, keysAvail);
    const above = counting.filter((p) => p.tier >= t);
    const exIds = new Set(above.map((p) => p.exerciseId));
    if (exIds.size < Math.max(1, need)) continue;
    if (!above.some((p) => p.tier === t)) continue;
    const keys = new Set(above.filter((p) => p.key !== null).map((p) => p.key));
    if (keys.size < needKeys) continue;
    return t;
  }
  return null;
}

/**
 * Tiers rank can ever reach: under fix 1, a non-empty tier with fewer than 2 available exercises at it and above
 * (a 1-exercise top tier) can never be ranked. Under v12, every non-empty tier.
 */
export function rankableTiers(ex: Exercise[], o: RankOpts = RANK_FIX): number[] {
  return nonEmptyTiers(ex).filter((t) => !o.minTwoExercises || ex.filter((e) => e.available && e.tier >= t).length >= 2);
}

/** Rank options. `minTwoExercises` = fix 1 (on by default); false = v12 as written. */
export interface RankOpts {
  minTwoExercises: boolean;
}
export const RANK_FIX: RankOpts = { minTwoExercises: true };
export const RANK_V12: RankOpts = { minTwoExercises: false };

/** §1.7 rank = max(rankHW, derived): never falls. Returns the new high-water. */
export function updateRankHW(ex: Exercise[], passes: PassRecord[], placedTier: number, rankHW: number | null, o: RankOpts = RANK_FIX): number | null {
  const ceiling = entryCeiling(ex, placedTier, rankHW, passedExerciseIds(passes));
  const d = deriveRank(ex, passes, ceiling, o);
  if (d === null) return rankHW;
  return rankHW === null ? d : Math.max(rankHW, d);
}

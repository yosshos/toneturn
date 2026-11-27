// Over-placement correction by the expected trajectory (SPEC-HOLISTIC-2 §1.3, with the coordinator's fixes of
// 2026-11-27). Pure. Rank is never touched.
//
//   Tempo areas: placedTier drops one tier if the cold scale benchmark (paceTier) is ≥ 2 tiers below placedTier on ≥ 5
//   offered days.
//   Non-tempo areas (fix 3, replaces the posterior rule P(p < 0.4) ≥ 0.9): placedTier drops one tier when, at
//   placedTier, there are ≥ 8 attempts on ≥ 3 offered days with a clean share < 35 %.
//   The count restarts at each drop; it counts only offered days (items at placedTier offered). Applies only while
//   placed (rank = none or below placedTier).
//   Fix 2: placedTier always sits on a non-empty tier: a placement (or a drop) onto an empty tier snaps down to the
//   nearest non-empty tier (or up to the lowest non-empty tier when none is below).

export interface PlacementState {
  placedTier: number;
  /** Offered days counted since the last drop (tempo: days ≥ 2 below; non-tempo: offered days with attempts). */
  count: number;
  /** Non-tempo: attempts and clean attempts at placedTier since the last drop. */
  attempts: number;
  cleans: number;
  drops: number;
}

/** Fix 2: the nearest non-empty tier at or below t (else the lowest non-empty tier). */
export function snapToNonEmpty(t: number, nonEmpty: number[]): number {
  if (!nonEmpty.length) return t;
  const below = nonEmpty.filter((x) => x <= t);
  return below.length ? below[below.length - 1] : nonEmpty[0];
}

/** A new placement state; with `nonEmpty` given, the placed tier snaps to a non-empty tier (fix 2). */
export const initPlacement = (placedTier: number, nonEmpty?: number[]): PlacementState => ({ placedTier: nonEmpty ? snapToNonEmpty(placedTier, nonEmpty) : placedTier, count: 0, attempts: 0, cleans: 0, drops: 0 });

/** True while placed (§1.3): rank none or below placedTier. */
export const isPlaced = (s: PlacementState, rank: number | null): boolean => rank === null || rank < s.placedTier;

const dropped = (s: PlacementState, nonEmpty?: number[]): PlacementState => {
  const to = s.placedTier - 1;
  return { placedTier: nonEmpty ? snapToNonEmpty(to, nonEmpty) : to, count: 0, attempts: 0, cleans: 0, drops: s.drops + 1 };
};

/** §1.3 tempo areas, one offered day. Returns the next state (a drop restarts the count). */
export function tempoPlacementDay(s: PlacementState, paceTier: number, nonEmpty?: number[]): PlacementState {
  if (s.placedTier <= 0) return s;
  const count = paceTier <= s.placedTier - 2 ? s.count + 1 : s.count;
  if (count >= 5) return dropped(s, nonEmpty);
  return { ...s, count };
}

/** Fix 3, non-tempo areas: one offered day with today's attempts at placedTier (clean flags). */
export function nonTempoPlacementDay(s: PlacementState, todayAtPlaced: boolean[], nonEmpty?: number[]): PlacementState {
  if (s.placedTier <= 0 || !todayAtPlaced.length) return s;
  const attempts = s.attempts + todayAtPlaced.length;
  const cleans = s.cleans + todayAtPlaced.filter(Boolean).length;
  const count = s.count + 1;
  if (attempts >= 8 && count >= 3 && cleans / attempts < 0.35) return dropped(s, nonEmpty);
  return { ...s, count, attempts, cleans };
}

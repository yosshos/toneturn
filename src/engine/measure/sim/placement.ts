// Over-placement correction by the expected trajectory (SPEC-HOLISTIC-2 §1.3). Pure. Rank is never touched.
//
//   Tempo areas: placedTier drops one tier if the cold scale benchmark (paceTier) is ≥ 2 tiers below placedTier on ≥ 5
//   offered days.
//   Non-tempo areas: placedTier drops one tier if no non-provisional threshold estimate or rung pass appears at
//   placedTier within 20 offered days, and the transfer / reading posterior at placedTier is P(p < 0.4) ≥ 0.9.
//   The count restarts at each drop; it counts only offered days (items at placedTier offered). Applies only while
//   placed (rank = none or below placedTier).

export interface PlacementState {
  placedTier: number;
  /** Offered days counted since the last drop (tempo: days ≥ 2 below; non-tempo: all offered days). */
  count: number;
  /** Non-tempo: a non-provisional threshold estimate or rung pass at placedTier appeared since the last drop. */
  evidence: boolean;
  drops: number;
}

export const initPlacement = (placedTier: number): PlacementState => ({ placedTier, count: 0, evidence: false, drops: 0 });

/** True while placed (§1.3): rank none or below placedTier. */
export const isPlaced = (s: PlacementState, rank: number | null): boolean => rank === null || rank < s.placedTier;

/** §1.3 tempo areas, one offered day. Returns the next state (a drop restarts the count). */
export function tempoPlacementDay(s: PlacementState, paceTier: number): PlacementState {
  if (s.placedTier <= 0) return s;
  const count = paceTier <= s.placedTier - 2 ? s.count + 1 : s.count;
  if (count >= 5) return { placedTier: s.placedTier - 1, count: 0, evidence: false, drops: s.drops + 1 };
  return { ...s, count };
}

/**
 * §1.3 non-tempo areas, one offered day. `evidenceToday` = a non-provisional threshold estimate or rung pass at
 * placedTier today; `pBelow04` = P(p < 0.4) of the reading / transfer posterior at placedTier.
 */
export function nonTempoPlacementDay(s: PlacementState, evidenceToday: boolean, pBelow04: number): PlacementState {
  if (s.placedTier <= 0) return s;
  const evidence = s.evidence || evidenceToday;
  const count = s.count + 1;
  if (count >= 20 && !evidence && pBelow04 >= 0.9) return { placedTier: s.placedTier - 1, count: 0, evidence: false, drops: s.drops + 1 };
  return { ...s, count, evidence };
}

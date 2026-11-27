// Over-placement correction by the expected trajectory (SPEC-HOLISTIC-2 §1.3, with the coordinator's fixes of
// 2026-11-27). Pure. Rank is never touched.
//
//   Tempo areas: placedTier drops one tier if the cold scale benchmark (paceTier) is ≥ 2 tiers below placedTier on ≥ 5
//   offered days.
//   Non-tempo areas (replaces the posterior rule P(p < 0.4) ≥ 0.9), by mode — attempts at placedTier since the last drop:
//     N0: ≥ 8 attempts on ≥ 3 offered days, clean share < 35 % (fix 3, first try);
//     N1: ≥ 12 attempts on ≥ 4 offered days, clean share < 30 %;
//     N2: after ≥ 12 attempts in all, the last 10 attempts span ≥ 3 days with a clean share < 30 %;
//     N3: N1, and no improvement: the clean share of the last 6 attempts ≤ that of the first 6.
//   The count restarts at each drop; it counts only offered days (items at placedTier offered). Applies only while
//   placed (rank = none or below placedTier).
//   Fix 2: placedTier always sits on a non-empty tier: a placement (or a drop) onto an empty tier snaps down to the
//   nearest non-empty tier (or up to the lowest non-empty tier when none is below).

export type NonTempoMode = 'N0' | 'N1' | 'N2' | 'N3';
export const NON_TEMPO_MODES: NonTempoMode[] = ['N0', 'N1', 'N2', 'N3'];
/**
 * The default non-tempo rule, chosen by the harness (2026-11-27, 400 learners per cell): N1 and N3 both had 0 / 800
 * false corrections of correctly placed learners (N0 1.3–1.8 %, N2 3.8 %); N1 corrects more +2 learners (85.5 % vs
 * 82.3 %) and sooner (median day 25 vs 30).
 */
export const DEFAULT_NON_TEMPO: NonTempoMode = 'N1';

export interface PlacementState {
  placedTier: number;
  /** Offered days counted since the last drop (tempo: days ≥ 2 below; non-tempo: offered days with attempts). */
  count: number;
  /** Non-tempo: the attempts at placedTier since the last drop, in order. */
  hist: { day: number; clean: boolean }[];
  drops: number;
}

/** Fix 2: the nearest non-empty tier at or below t (else the lowest non-empty tier). */
export function snapToNonEmpty(t: number, nonEmpty: number[]): number {
  if (!nonEmpty.length) return t;
  const below = nonEmpty.filter((x) => x <= t);
  return below.length ? below[below.length - 1] : nonEmpty[0];
}

/** A new placement state; with `nonEmpty` given, the placed tier snaps to a non-empty tier (fix 2). */
export const initPlacement = (placedTier: number, nonEmpty?: number[]): PlacementState => ({ placedTier: nonEmpty ? snapToNonEmpty(placedTier, nonEmpty) : placedTier, count: 0, hist: [], drops: 0 });

/** True while placed (§1.3): rank none or below placedTier. */
export const isPlaced = (s: PlacementState, rank: number | null): boolean => rank === null || rank < s.placedTier;

const dropped = (s: PlacementState, nonEmpty?: number[]): PlacementState => {
  const to = s.placedTier - 1;
  return { placedTier: nonEmpty ? snapToNonEmpty(to, nonEmpty) : to, count: 0, hist: [], drops: s.drops + 1 };
};

/** §1.3 tempo areas, one offered day. Returns the next state (a drop restarts the count). */
export function tempoPlacementDay(s: PlacementState, paceTier: number, nonEmpty?: number[]): PlacementState {
  if (s.placedTier <= 0) return s;
  const count = paceTier <= s.placedTier - 2 ? s.count + 1 : s.count;
  if (count >= 5) return dropped(s, nonEmpty);
  return { ...s, count };
}

const share = (h: { clean: boolean }[]): number => (h.length ? h.filter((x) => x.clean).length / h.length : 1);

/** Does the non-tempo rule fire on these attempts (since the last drop) over `days` offered days? */
export function nonTempoFires(hist: { day: number; clean: boolean }[], days: number, mode: NonTempoMode): boolean {
  const n = hist.length;
  switch (mode) {
    case 'N0':
      return n >= 8 && days >= 3 && share(hist) < 0.35;
    case 'N1':
      return n >= 12 && days >= 4 && share(hist) < 0.3;
    case 'N2': {
      if (n < 12) return false;
      const w = hist.slice(n - 10);
      return new Set(w.map((x) => x.day)).size >= 3 && share(w) < 0.3;
    }
    case 'N3':
      return n >= 12 && days >= 4 && share(hist) < 0.3 && share(hist.slice(n - 6)) <= share(hist.slice(0, 6));
  }
}

/** Non-tempo areas: one offered day with today's attempts at placedTier (clean flags). */
export function nonTempoPlacementDay(s: PlacementState, todayAtPlaced: boolean[], nonEmpty?: number[], mode: NonTempoMode = DEFAULT_NON_TEMPO, day = s.count): PlacementState {
  if (s.placedTier <= 0 || !todayAtPlaced.length) return s;
  const hist = [...s.hist, ...todayAtPlaced.map((clean) => ({ day, clean }))];
  const count = s.count + 1;
  if (nonTempoFires(hist, count, mode)) return dropped(s, nonEmpty);
  return { ...s, count, hist };
}

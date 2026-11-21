// The tier of a speed (SPEC-COACH-2 §1): upper bounds in notes per second of T0 … T7; above the last is T8 (ABRSM
// grade scale speeds 1.8 / 2.0 / 2.2–2.7 / 3.3 / 4.0 / 4.8 / 5.3 / 5.9). Its own module: analyze.ts and tiers.ts share it.
const BOUNDS = [1.9, 2.1, 2.8, 3.6, 4.4, 5.0, 5.6, 6.5];

export function tierOfNps(nps: number): number {
  const i = BOUNDS.findIndex((b) => nps < b);
  return i < 0 ? 8 : i;
}

/**
 * Timing limits by the player's tier (SPEC-COACH-2 §5): the onset SD and the IOI CV as shares of the gap between notes
 * — a beginner gets room at slow tempos, an advanced player is held to what a good pianist plays at speed.
 */
export function tierTiming(tier: number): { sd: number; cv: number } {
  if (tier <= 1) return { sd: 0.12, cv: 0.15 };
  if (tier <= 3) return { sd: 0.09, cv: 0.11 };
  if (tier <= 5) return { sd: 0.07, cv: 0.08 };
  return { sd: 0.055, cv: 0.06 };
}

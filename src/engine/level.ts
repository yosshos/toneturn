// Player level from total XP (0.37). Level n → n+1 costs 100 + 50·(n−1) XP, so early levels come quickly
// and later ones stay within reach of a few days' practice.

export const levelCost = (n: number) => 100 + 50 * (n - 1);

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level costs. */
  need: number;
  /** 0..1 */
  pct: number;
}

export function levelOf(xp: number): LevelInfo {
  let level = 1;
  let left = Math.max(0, Math.floor(xp));
  while (left >= levelCost(level)) {
    left -= levelCost(level);
    level++;
  }
  const need = levelCost(level);
  return { level, into: left, need, pct: left / need };
}

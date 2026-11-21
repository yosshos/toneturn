// Technique tiers (SPEC-COACH-2 §1, owner 2026-11-21): a rung of tempo, from the ABRSM / RCM scale tables — T0 pre-grade
// (≈1.8 notes/s) to T8 diploma (7–8 notes/s). An item's tier comes from its target tempo in notes per second; the
// player's tier in a skill is the highest tier whose items they play clean at the target in two keys or more. The
// tier then sets the timing tolerance (analyze.ts, §5) and tells the coach the player is past the basics (T2+).

import type { Drill, ItemState } from './types';
import { itemTargetBpm } from './plan';
import { notesPerBeat } from './analyze';
import { tierOfNps } from './tierBounds';

export { tierOfNps };

export const TIER_NAME: { en: string; he: string }[] = [
  { en: 'First steps', he: 'צעדים ראשונים' },
  { en: 'Grade 1', he: 'כיתה 1' },
  { en: 'Grades 2–3', he: 'כיתות 2–3' },
  { en: 'Grade 4', he: 'כיתה 4' },
  { en: 'Grade 5', he: 'כיתה 5' },
  { en: 'Grade 6', he: 'כיתה 6' },
  { en: 'Grade 7', he: 'כיתה 7' },
  { en: 'Grade 8', he: 'כיתה 8' },
  { en: 'Diploma', he: 'דיפלומה' },
];

/** An item's tier: its target tempo in notes per second. */
export function itemTier(d: Drill): number {
  if (d.untimed) return 0;
  return tierOfNps((itemTargetBpm(d) * notesPerBeat(d)) / 60);
}

/**
 * The player's tier over a set of drills: the highest tier with items clean at their target (or within 3 %) in at
 * least two keys. −1 when nothing is passed yet (unknown — grading stays as it was).
 */
export function playerTier(drills: Drill[], items: Record<string, ItemState>): number {
  const keysAt = new Map<number, Set<number>>();
  for (const d of drills) {
    const st = items[d.itemId];
    if (!st || st.cleanBpm <= 0) continue;
    if (st.cleanBpm < itemTargetBpm(d) * 0.97) continue;
    const t = itemTier(d);
    const ks = keysAt.get(t) ?? new Set<number>();
    ks.add(d.tonic ? d.tonic.key : d.spec.key);
    keysAt.set(t, ks);
  }
  let best = -1;
  for (const [t, ks] of keysAt) if (ks.size >= 2 && t > best) best = t;
  return best;
}

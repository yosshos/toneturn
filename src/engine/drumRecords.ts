// Personal speed records on the kit (DRUMS_NICHE_PLAN "Not built"): the best clean tempo of a drum level — the fastest
// clean take of any of its variants (ItemState.cleanBpm, measured takes only) — and the day it was set; plus Rudiment
// Rush's best: the fastest round passed (clean or almost, sticking right), kept as counts.rushBpm. Pure.

import type { Drill, ItemState } from './drills/types';

export interface LevelRecord {
  /** Best clean tempo (♩) over the level's variants. */
  bpm: number;
  /** 1-based variant that holds it. */
  variant: number;
  /** The level's tempo (♩) of that variant: the record against it. */
  target: number;
  /** Local day "YYYY-MM-DD" the record was set (from the item's tempo history), if known. */
  day?: string;
}

/** The level's record from its variants' item states; null before any clean take. */
export function levelRecord(row: Drill[], items: Record<string, ItemState | undefined>, targetOf: (d: Drill) => number): LevelRecord | null {
  let best: LevelRecord | null = null;
  row.forEach((d, i) => {
    const st = items[d.itemId];
    if (!st || !(st.cleanBpm > 0)) return;
    if (best && st.cleanBpm <= best.bpm) return;
    const hit = [...(st.history ?? [])].reverse().find((h) => h.bpm >= st.cleanBpm);
    best = { bpm: st.cleanBpm, variant: i + 1, target: targetOf(d), ...(hit ? { day: hit.at.slice(0, 10) } : {}) };
  });
  return best;
}

/** Rudiment Rush: the fastest tempo of a passed round in a run (0 = none passed). */
export function rushTopBpm(rounds: { ok: boolean; bpm: number }[]): number {
  return Math.max(0, ...rounds.filter((r) => r.ok).map((r) => r.bpm));
}

// BASS_VALIDATION (second round) fixes: each test is a [run]-style check of one finding (N1 … N13).
import { describe, expect, it } from 'vitest';
import { applyTake, itemPass, newItem } from '../src/engine/drills/ladder';
import { itemTargetBpm, levelDrills, levelOfDrill, levelStars } from '../src/engine/drills/plan';
import { guitarCatalog, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { DEFAULT_DRILL_SETTINGS, type Drill, type ItemState, type TakeMetrics } from '../src/engine/drills/types';

const take = (verdict: TakeMetrics['verdict']): TakeMetrics => ({ verdict, accuracy: 1, cvR: 0.02, cvL: null, timingSD: 10, velSD: null, handsAbs: null } as unknown as TakeMetrics);
const order = DEFAULT_DRILL_SETTINGS.keyOrder;
const BASS = guitarCatalog().filter((f) => f.id.startsWith('b-'));
const levelById = (id: string) => BASS.flatMap((f) => f.levels).find((l) => l.id === id) as GuitarLevelDef;

/** An honest climb: clean takes at the ladder's goal, 6 a day, until the item passes at its target (or gives up). */
function climb(d: Drill, maxTakes = 2000): { st: ItemState; takes: number } {
  const t = itemTargetBpm(d);
  let st: ItemState = newItem(d);
  for (let k = 0; k < maxTakes; k++) {
    const at = new Date(Date.UTC(2026, 0, 1 + Math.floor(k / 6), 10, k % 6)).toISOString();
    st = applyTake(st, take('clean'), st.goalBpm, at, DEFAULT_DRILL_SETTINGS, { targetBpm: t }).state;
    if (itemPass(st, d.startBpm, t).target) return { st, takes: k + 1 };
  }
  return { st, takes: maxTakes };
}

describe('N1 levelOfDrill: every item maps back to its own level', () => {
  it('every bass level, every item', () => {
    const wrong: string[] = [];
    for (const f of BASS) for (const lv of f.levels) for (const d of levelDrills(lv, order)) if (levelOfDrill(d)?.id !== lv.id) wrong.push(`${d.itemId} → ${levelOfDrill(d)?.id} (want ${lv.id})`);
    expect(wrong).toEqual([]);
  });

  it.each(['b-pluck-2', 'b-up-pizz-2', 'b-up-pizz-3', 'b-up-scales-3'])('%s: an honest climb, then 3 clean takes at the target on 2 days, passes every item', (id) => {
    const lv = levelById(id);
    expect(lv).toBeTruthy();
    const items: Record<string, ItemState> = {};
    for (const d of levelDrills(lv, order)) {
      expect(itemTargetBpm(d)).toBe(Math.max(d.startBpm, lv.tempo![1]));
      const { st } = climb(d);
      expect(itemPass(st, d.startBpm, itemTargetBpm(d)).target).toBe(true);
      items[d.itemId] = st;
    }
    expect(levelStars(lv, items, order)).toBe(3);
  });
});

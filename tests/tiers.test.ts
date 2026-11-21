import { afterEach, describe, expect, it } from 'vitest';
import { itemTier, playerTier, tierOfNps } from '../src/engine/drills/tiers';
import { getGradeTier, setGradeTier } from '../src/engine/drills/analyze';
import { tierTiming } from '../src/engine/drills/tierBounds';
import { familyById, levelDrills } from '../src/engine/drills/plan';
import { itemTargetBpm } from '../src/engine/drills/plan';
import type { ItemState } from '../src/engine/drills/types';

describe('technique tiers (SPEC-COACH-2 §1, §5)', () => {
  afterEach(() => setGradeTier(-1));
  it('ABRSM grade speeds map to their tiers', () => {
    expect(tierOfNps(1.8)).toBe(0);
    expect(tierOfNps(2.0)).toBe(1);
    expect(tierOfNps(2.2)).toBe(2);
    expect(tierOfNps(3.3)).toBe(3);
    expect(tierOfNps(4.0)).toBe(4);
    expect(tierOfNps(5.9)).toBe(7);
    expect(tierOfNps(8)).toBe(8);
  });
  it('the player tier needs two keys clean at the target; unknown is −1', () => {
    const ds = levelDrills(familyById('scales')!.levels[2], 'fifths-up');
    expect(playerTier(ds, {})).toBe(-1);
    const items: Record<string, ItemState> = {};
    const two = ds.filter((d, i, a) => a.findIndex((x) => x.spec.key === d.spec.key) === i).slice(0, 2);
    for (const d of two) items[d.itemId] = { cleanBpm: itemTargetBpm(d), takes: 3 } as ItemState;
    expect(playerTier(ds, items)).toBe(itemTier(two[0]));
    expect(playerTier(ds, { [two[0].itemId]: items[two[0].itemId] })).toBe(-1);
  });
  it('timing limits loosen for beginners and tighten for advanced players, as shares of the gap', () => {
    expect(tierTiming(0).sd).toBeGreaterThan(tierTiming(4).sd);
    expect(tierTiming(4).sd).toBeGreaterThan(tierTiming(7).sd);
    setGradeTier(3);
    expect(getGradeTier()).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { canBuyCosmetic, COSMETICS, gemsSpent, ownsCosmetic, streakState, type Purchase } from '../src/engine/streak';

describe('gem cosmetics', () => {
  const bought: Purchase[] = [{ id: 'a', kind: 'cosmetic', item: 'theme-ocean', day: '2026-11-01' }];
  it('a theme costs its price, is owned after buying, cannot be bought twice', () => {
    expect(gemsSpent(bought)).toBe(COSMETICS['theme-ocean']);
    expect(ownsCosmetic(bought, 'theme-ocean')).toBe(true);
    expect(ownsCosmetic([], 'theme-violet')).toBe(true);
    expect(canBuyCosmetic('theme-ocean', 9999, bought)).toBe(false);
    expect(canBuyCosmetic('theme-forest', 299, bought)).toBe(false);
    expect(canBuyCosmetic('theme-forest', 300, bought)).toBe(true);
    expect(canBuyCosmetic('theme-nope', 9999, [])).toBe(false);
  });
  it('cosmetics never touch the streak', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03'];
    expect(streakState(days, bought, '2026-11-03')).toEqual(streakState(days, [], '2026-11-03'));
  });
});

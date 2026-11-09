import { describe, expect, it } from 'vitest';
import { canBuyCosmetic, COSMETICS, gemsSpent, ownsCosmetic, streakState, type Purchase } from '../src/engine/streak';

describe('gem cosmetics', () => {
  const bought: Purchase[] = [{ id: 'a', kind: 'cosmetic', item: 'frame-gold', day: '2026-11-01' }];
  it('a frame costs its price, is owned after buying, cannot be bought twice', () => {
    expect(gemsSpent(bought)).toBe(COSMETICS['frame-gold']);
    expect(ownsCosmetic(bought, 'frame-gold')).toBe(true);
    expect(ownsCosmetic([], 'frame-gold')).toBe(false);
    expect(canBuyCosmetic('frame-gold', 9999, bought)).toBe(false);
    expect(canBuyCosmetic('frame-staff', 299, bought)).toBe(false);
    expect(canBuyCosmetic('frame-staff', 300, bought)).toBe(true);
    expect(canBuyCosmetic('frame-nope', 9999, [])).toBe(false);
  });
  it('retired colour themes are refunded (cost 0) and can no longer be bought (0.61)', () => {
    const old: Purchase[] = [
      { id: 'o', kind: 'cosmetic', item: 'theme-ocean', day: '2026-10-01' },
      { id: 'm', kind: 'cosmetic', item: 'theme-midnight', day: '2026-10-02' },
    ];
    expect(gemsSpent(old)).toBe(0);
    expect(canBuyCosmetic('theme-forest', 9999, [])).toBe(false);
  });
  it('cosmetics never touch the streak', () => {
    const days = ['2026-11-01', '2026-11-02', '2026-11-03'];
    expect(streakState(days, bought, '2026-11-03')).toEqual(streakState(days, [], '2026-11-03'));
  });
});

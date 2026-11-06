// Avatar studio: parts that only fit together never leave a gap (her punk trousers end at the knee).
import { describe, expect, it } from 'vitest';
import { DEFAULT_PAIR, pairUp, type AvatarLook } from '../src/ui/AvatarStudio';

const look = (legs: string, feet: string): AvatarLook => ({ outfit: { head: 'Casual', body: 'Casual', legs, feet }, items: [] });

describe('avatar part pairing', () => {
  it('punk trousers bring the punk boots, and the boots bring the trousers', () => {
    expect(pairUp('b', look('Punk', 'Casual'), 'legs').outfit.feet).toBe('Punk');
    expect(pairUp('b', look('Casual', 'Punk'), 'feet').outfit.legs).toBe('Punk');
  });
  it('leaving the pair moves the partner to a part that fits anything', () => {
    expect(pairUp('b', look('Punk', 'Suit'), 'feet').outfit).toMatchObject({ legs: 'Suit', feet: 'Suit' });
    expect(pairUp('b', look('Casual', 'Punk'), 'legs').outfit).toMatchObject({ legs: 'Casual', feet: 'Casual' });
  });
  it('his parts all fit together; the default looks are valid', () => {
    expect(pairUp('a', { outfit: { head: 'Punk', body: 'Suit', legs: 'Punk', feet: 'Casual_2' }, items: [] }, 'legs').outfit.feet).toBe('Casual_2');
    for (const k of ['a', 'b'] as const) expect(pairUp(k, DEFAULT_PAIR[k], 'legs')).toEqual(DEFAULT_PAIR[k]);
  });
});

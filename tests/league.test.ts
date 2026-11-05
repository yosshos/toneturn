import { describe, expect, it } from 'vitest';
import { chordTierForRating, firstTier, LADDER, leagueMove, leagueZone, NINTH_TIER, TOP_TIER } from '../src/engine/league';

describe('league ladder as a chord (spec Y)', () => {
  it('seven tiers stack C13♯11 in thirds from middle C', () => {
    expect(LADDER.map((t) => t.midi)).toEqual([60, 64, 67, 70, 74, 78, 81]); // C E G B♭ D F♯ A
    expect(TOP_TIER).toBe(7);
    expect(LADDER[NINTH_TIER - 1].symbol).toBe('9');
  });
  it('the higher you go, the fewer move up — the Ninth and ♯11 also need weekly XP', () => {
    expect(leagueMove(1, 5, 30, 50)).toBe(1);
    expect(leagueMove(4, 5, 30, 999)).toBe(0); // Seventh: top 4 only
    expect(leagueMove(5, 3, 30, 499)).toBe(0); // Ninth: needs 500 XP
    expect(leagueMove(5, 3, 30, 500)).toBe(1);
    expect(leagueMove(6, 2, 30, 5000)).toBe(0); // ♯11: only first place
    expect(leagueMove(6, 1, 30, 899)).toBe(0);
    expect(leagueMove(6, 1, 30, 900)).toBe(1);
    expect(leagueMove(7, 1, 30, 9999)).toBe(0); // nothing above 13
  });
  it('relegation grows at the top; small cohorts never relegate', () => {
    expect(leagueMove(3, 26, 30, 10)).toBe(-1);
    expect(leagueMove(3, 25, 30, 10)).toBe(0);
    expect(leagueMove(7, 23, 30, 10)).toBe(-1); // 13: bottom 8
    expect(leagueMove(6, 25, 30, 10)).toBe(-1); // ♯11: bottom 6
    expect(leagueMove(5, 9, 9, 0)).toBe(0);
    expect(leagueMove(1, 30, 30, 0)).toBe(0);
  });
  it('no XP, no promotion; the live table marks places that still need XP', () => {
    expect(leagueMove(2, 1, 30, 0)).toBe(0);
    expect(leagueZone(2, 30, 5, 300)).toBe('up-needs-xp');
    expect(leagueZone(2, 30, 5, 700)).toBe('up');
    expect(leagueZone(29, 30, 7)).toBe('down');
  });
  it('first placement never above the Seventh; the ear chord follows the rating', () => {
    expect(firstTier(2000)).toBe(4);
    expect(firstTier(null)).toBe(1);
    expect(chordTierForRating(700)).toBe(1);
    expect(chordTierForRating(1300)).toBe(5);
    expect(chordTierForRating(1700)).toBe(7);
  });
});

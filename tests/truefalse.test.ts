import { describe, expect, it } from 'vitest';
import { NEAR_MISS, tfDifficulty, tfItem, tfPoints } from '../src/engine/truefalse';
import { mulberry32 } from '../src/engine/lesson';
import { pcValue } from '../src/engine/pitch';

const SEMIS: Record<string, number> = { m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, '♯4': 6, '♭5': 6, P5: 7, m6: 8, M6: 9, m7: 10, M7: 11 };

describe('True or false? (spec O)', () => {
  it('true items show the real intervals; false items change exactly one label to its near miss', () => {
    const rnd = mulberry32(3);
    let t = 0;
    let f = 0;
    for (let i = 0; i < 400; i++) {
      const it = tfItem(2, rnd);
      const realL = it.trio.intervalLeft;
      const realR = it.trio.intervalRight;
      expect((pcValue(it.trio.mid) - pcValue(it.trio.left) + 12) % 12).toBe(SEMIS[realL]);
      if (it.truth) {
        t++;
        expect([it.shownLeft, it.shownRight]).toEqual([realL, realR]);
      } else {
        f++;
        const changed = [it.shownLeft !== realL, it.shownRight !== realR].filter(Boolean).length;
        expect(changed).toBe(1);
        if (it.shownLeft !== realL) expect(it.shownLeft).toBe(NEAR_MISS[realL]);
        else expect(it.shownRight).toBe(NEAR_MISS[realR]);
      }
      expect(it.midis[1] - it.midis[0]).toBe(SEMIS[realL]);
      expect(it.midis[2] - it.midis[1]).toBe(SEMIS[realR]);
    }
    expect(t).toBeGreaterThan(150);
    expect(f).toBeGreaterThan(150);
  });
  it('level 1 uses only M3, P4 and P5 (and their near misses as lies)', () => {
    const rnd = mulberry32(9);
    for (let i = 0; i < 200; i++) {
      const it = tfItem(1, rnd);
      expect(['M3', 'P4', 'P5']).toContain(it.trio.intervalLeft);
      expect(['M3', 'P4', 'P5']).toContain(it.trio.intervalRight);
    }
  });
  it('harder levels are rated harder; streaks pay more', () => {
    expect(tfDifficulty(4)).toBeGreaterThan(tfDifficulty(1));
    expect(tfPoints(0)).toBe(1);
    expect(tfPoints(10)).toBe(2);
  });
});

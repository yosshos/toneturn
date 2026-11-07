import { describe, expect, it } from 'vitest';
import { levelCost, levelOf } from '../src/engine/level';

describe('player level', () => {
  it('starts at level 1', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 100, pct: 0 });
  });
  it('costs grow by 50 per level', () => {
    expect([1, 2, 3].map(levelCost)).toEqual([100, 150, 200]);
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100)).toMatchObject({ level: 2, into: 0, need: 150 });
    expect(levelOf(250)).toMatchObject({ level: 3, into: 0 });
    expect(levelOf(300)).toMatchObject({ level: 3, into: 50, need: 200, pct: 0.25 });
  });
  it('ignores negative and fractional xp', () => {
    expect(levelOf(-5).level).toBe(1);
    expect(levelOf(100.9).level).toBe(2);
  });
});

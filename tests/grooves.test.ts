import { describe, expect, it } from 'vitest';
import { defaultAccents, GROOVES, grooveHits, grooveSteps, STYLE_NAME, tapBpm, tempoName } from '../src/engine/grooves';

describe('metronome groove bank', () => {
  it('every lane fits the bar exactly and uses x . o only', () => {
    for (const g of GROOVES) {
      const n = grooveSteps(g);
      for (const lane of [g.k, g.s, g.h, g.r]) {
        if (lane === undefined) continue;
        expect(lane, `${g.id}`).toMatch(/^[xo.]*$/);
        expect(lane.length, `${g.id} lane length`).toBe(n);
      }
      expect(grooveHits(g).length, g.id).toBeGreaterThan(0);
      expect(STYLE_NAME[g.style]).toBeTruthy();
    }
  });
  it('ids are unique', () => {
    expect(new Set(GROOVES.map((g) => g.id)).size).toBe(GROOVES.length);
  });
  it('accents, tempo names, tap tempo', () => {
    expect(defaultAccents(4, 4)).toEqual([2, 1, 1, 1]);
    expect(defaultAccents(6, 8)).toEqual([2, 1, 1, 2, 1, 1]);
    expect(tempoName(60)).toBe('Adagio');
    expect(tapBpm([0, 500, 1000, 1500])).toBe(120);
    expect(tapBpm([0])).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { defaultAccents, GROOVES, grooveHits, grooveSteps, STYLE_NAME, tapBpm, tempoName, DRUM_KITS, KIT_FILES, KIT_NAME } from '../src/engine/grooves';
import { existsSync } from 'node:fs';

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

describe('drum kits', () => {
  it('every kit has a name and every listed one-shot exists', () => {
    for (const k of DRUM_KITS) {
      expect(KIT_NAME[k].en && KIT_NAME[k].he).toBeTruthy();
      for (const id of KIT_FILES[k] ?? []) expect(existsSync(`public/samples/kits/${k}/${id}.wav`), `${k}/${id}`).toBe(true);
    }
  });
});

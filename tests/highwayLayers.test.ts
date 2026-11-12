import { describe, expect, it } from 'vitest';
import { highwaySong, kitLayers, songId } from '../src/engine/highway';
import { clearsRun } from '../src/engine/gameTiers';

const base = { mode: 'kit' as const, level: 2 as const, song: 1, bpm: 85 };
const lanesOf = (layer?: number) => new Set(highwaySong({ ...base, kitLayer: layer }).notes.map((n) => n.lane));

describe('kit build-up layers', () => {
  it('beginner levels have layers, later ones none', () => {
    expect(kitLayers(1)).toBe(3);
    expect(kitLayers(3)).toBe(4);
    expect(kitLayers(4)).toBe(0);
  });
  it('adds one drum per layer: kick, + snare, + hi-hat, then the whole song', () => {
    expect([...lanesOf(1)]).toEqual([2]);
    expect([...lanesOf(2)].sort()).toEqual([1, 2]);
    expect([...lanesOf(3)].sort()).toEqual([0, 1, 2]);
    expect(lanesOf(4).has(4)).toBe(true); // crash / fills in the whole song
    expect(highwaySong({ ...base, kitLayer: 4 }).notes.length).toBe(highwaySong(base).notes.length);
  });
  it('keeps the same kick pattern across layers', () => {
    const kicks = (l: number) => highwaySong({ ...base, kitLayer: l }).notes.filter((n) => n.lane === 2 && n.bar % 2 === 0).map((n) => n.beat);
    expect(kicks(1)).toEqual(kicks(3));
  });
  it('each layer has its own song id; the whole song keeps the old id', () => {
    expect(songId({ ...base, kitLayer: 1 })).toBe('k-R2-1-L1');
    expect(songId({ ...base, kitLayer: 4 })).toBe(songId(base));
  });
  it('a layer is practice: only the whole song clears the tier', () => {
    expect(clearsRun('highway', 'p', 95, { accuracy: 95, layer: 2, layers: 4 })).toBe(false);
    expect(clearsRun('highway', 'p', 95, { accuracy: 95, layer: 4, layers: 4 })).toBe(true);
  });
});

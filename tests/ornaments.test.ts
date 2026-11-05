import { describe, expect, it } from 'vitest';
import { ORNAMENT_LEVELS, gradeOrnament, gradeDynamic, synthOrnament, synthDynamic, synthHold, type VocalItem } from '../src/engine/vocal';

const T = 62;
const items = ORNAMENT_LEVELS.flatMap((l) => l.items);
const orn = (o: VocalItem['orn']) => items.find((i) => i.orn === o)!;

describe('ornaments and dynamics (spec V.2)', () => {
  for (const item of items.filter((i) => i.kind === 'ornament'))
    it(`${item.orn} (${item.upper}/${item.lower}) sung right scores high`, () => {
      const g = gradeOrnament(item, synthOrnament(item, T), T);
      expect(g.unclear).toBe(false);
      expect(g.score).toBeGreaterThan(0.85);
    });

  it('a plain held note is not a mordent / turn / trill', () => {
    for (const o of ['mordent', 'turn', 'trill'] as const) {
      const g = gradeOrnament(orn(o), synthHold(T, { seconds: 3 }), T);
      expect(g.score).toBeLessThan(0.5);
    }
  });

  it('a turn sung as a mordent loses the shape', () => {
    const g = gradeOrnament(orn('turn'), synthOrnament(orn('mordent'), T), T);
    expect(g.metrics.find((m) => m.key === 'ornament')!.score).toBeLessThan(0.8);
  });

  it('an ornament sung 40¢ flat loses intonation', () => {
    const g = gradeOrnament(orn('mordent'), synthOrnament(orn('mordent'), T, { cents: -40 }), T);
    expect(g.metrics.find((m) => m.key === 'intonation')!.score).toBeLessThan(0.6);
  });

  it('dynamics follow the asked curve', () => {
    const cresc = items.find((i) => i.curve === 'cresc')!;
    expect(gradeDynamic(cresc, synthDynamic('cresc', T), T).score).toBeGreaterThan(0.85);
    expect(gradeDynamic(cresc, synthDynamic('decresc', T), T).score).toBeLessThan(0.5);
    const swell = items.find((i) => i.curve === 'swell')!;
    expect(gradeDynamic(swell, synthDynamic('swell', T, 6), T).score).toBeGreaterThan(0.85);
    expect(gradeDynamic(swell, synthDynamic('cresc', T, 6), T).score).toBeLessThan(0.6);
  });
});

import { tournamentSet, CHOIR_SEED, isChoirSeed } from '../src/engine/tournament';

describe('choir rooms (spec V.3)', () => {
  it('a choir seed gives chords to split into parts; normal seeds stay single notes', () => {
    expect(isChoirSeed(CHOIR_SEED + 5)).toBe(true);
    expect(isChoirSeed(2 ** 32 - 1)).toBe(false);
    const set = tournamentSet('vocal-hold', 6, CHOIR_SEED + 12345);
    for (const q of set) expect(q.stimulus[0].kind === 'chord' && q.stimulus[0].midis.length >= 3).toBe(true);
    expect(set.map((q) => q.stimulus[0])).toEqual(tournamentSet('vocal-hold', 6, CHOIR_SEED + 12345).map((q) => q.stimulus[0]));
    const solo = tournamentSet('vocal-hold', 3, 12345);
    expect(solo[0].stimulus[0].kind).toBe('note');
  });
});

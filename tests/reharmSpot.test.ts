import { describe, expect, it } from 'vitest';
import { answerCase, casePoints, flatBars, isReharmSave, LEVEL_SUBS, newReharm, reharmCase, reharmResult, spanOf, speedFactor, SUB_NAMES, tierBars, tierLevel } from '../src/engine/reharmSpot';
import { clearsRun, tierDef, tierInfo } from '../src/engine/gameTiers';
import { jazzProgStim } from '../src/engine/topicsJazzEar';

const beats = (b: [number, string, number][]) => b.reduce((a, c) => a + c[2], 0);

describe('Reharm Spotter', () => {
  it('every level makes valid cases: the reharm differs in exactly the marked bars, every bar is 4 beats', () => {
    for (let lv = 1; lv <= 4; lv++)
      for (const bars of [4, 8])
        for (let i = 0; i < 40; i++) {
          const c = reharmCase(1234 + lv, i, lv, bars);
          expect(c.bars.length).toBe(bars);
          expect(c.reharm.length).toBe(bars);
          expect(c.changed.length).toBe(spanOf(lv));
          expect(LEVEL_SUBS[lv - 1]).toContain(c.kind);
          expect(new Set(c.options)).toEqual(new Set(LEVEL_SUBS[lv - 1]));
          c.bars.forEach((b, k) => {
            expect(beats(b)).toBe(4);
            expect(beats(c.reharm[k])).toBe(4);
            const same = JSON.stringify(b) === JSON.stringify(c.reharm[k]);
            expect(same).toBe(!c.changed.includes(k));
          });
          if (spanOf(lv) === 2) expect(c.changed[1]).toBe(c.changed[0] + 1);
        }
  });
  it('is seeded and every level uses all its substitutions', () => {
    expect(reharmCase(7, 3, 2, 4)).toEqual(reharmCase(7, 3, 2, 4));
    for (let lv = 1; lv <= 4; lv++) {
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) seen.add(reharmCase(99, i, lv, lv >= 3 ? 8 : 4).kind);
      expect(seen.size).toBe(4);
    }
    for (const k of Object.keys(SUB_NAMES)) expect(SUB_NAMES[k as keyof typeof SUB_NAMES].he.length).toBeGreaterThan(0);
  });
  it('the progressions render as sound', () => {
    const c = reharmCase(5, 0, 4, 8);
    const s = jazzProgStim(c.key, flatBars(c.reharm), 160);
    expect(s.kind).toBe('events');
  });
  it('scores the bar and the name, faster scores more; a wrong case costs a life', () => {
    expect(casePoints(true, true, 0)).toBe(23);
    expect(casePoints(true, true, 60_000)).toBe(15);
    expect(casePoints(true, false, 60_000)).toBe(5);
    expect(casePoints(false, false, 0)).toBe(0);
    expect(speedFactor(1000)).toBeCloseTo(1.5);
    let s = newReharm(42, 'mf');
    expect(s.level).toBe(2);
    expect(s.bars).toBe(4);
    const c = reharmCase(s.seed, 0, s.level, s.bars);
    const r = answerCase(s, c.changed[0], c.kind, 1000);
    expect(r.barRight && r.nameRight).toBe(true);
    expect(r.save.right).toBe(1);
    expect(r.save.lives).toBe(3);
    s = r.save;
    for (let k = 0; k < 3; k++) {
      const cc = reharmCase(s.seed, s.i, s.level, s.bars);
      s = answerCase(s, (cc.changed[0] + 1) % s.bars, cc.kind, 1000).save;
    }
    expect(s.lives).toBe(0);
    expect(s.over).toBe(true);
    expect(isReharmSave(s)).toBe(false);
    expect(reharmResult(s).detail).toEqual({ tier: 'mf', right: 1, wrong: 3, level: 2 });
  });
  it('tiers: open at mp, 4 bars below f, clear by cases solved', () => {
    expect(tierBars('mf')).toBe(4);
    expect(tierBars('f')).toBe(8);
    expect(tierLevel('ff')).toBe(4);
    expect(tierInfo('reharm', {}, undefined, 'jazz').open).toBe('mp');
    const cases = Number(tierDef('reharm', 'f')?.params?.cases);
    expect(clearsRun('reharm', 'f', 100, { right: cases })).toBe(true);
    expect(clearsRun('reharm', 'f', 100, { right: cases - 1 })).toBe(false);
  });
});

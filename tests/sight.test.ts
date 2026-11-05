import { describe, expect, it } from 'vitest';
import { SIGHT_LEVELS, gradeTake, synthMelody, itemTargets } from '../src/engine/vocal';

const range = { low: 48, high: 72 };

describe('sight-singing (spec V.1)', () => {
  it('every melody starts on the tonic, ends on 1 or 5, and its rhythm stays on the beat grid', () => {
    for (const lv of SIGHT_LEVELS)
      for (const it of lv.items) {
        expect(it.kind).toBe('sight');
        expect(it.steps![0]).toBe(0);
        expect([0, 7]).toContain(it.steps![it.steps!.length - 1]);
        expect(it.durs!.length).toBe(it.steps!.length);
        const total = it.durs!.reduce((a, b) => a + b, 0);
        expect(total * 2).toBe(Math.round(total * 2));
      }
  });

  it('sung in the written rhythm scores high; sung evenly (ignoring the rhythm) loses on timing', () => {
    const item = SIGHT_LEVELS[4].items[0];
    const targets = itemTargets(item, range);
    const beat = 60 / item.bpm!;
    const right = gradeTake(item, synthMelody(targets, 0.5, { noteSecs: item.durs!.map((d) => d * beat) }), range);
    const even = gradeTake(item, synthMelody(targets, beat), range);
    expect(right.score).toBeGreaterThan(0.85);
    const tRight = right.metrics.find((m) => m.key === 'timing')!;
    const tEven = even.metrics.find((m) => m.key === 'timing')!;
    expect(tRight.value).toBeLessThan(tEven.value);
  });

  it('wrong notes lose the hit metric', () => {
    const item = SIGHT_LEVELS[0].items[0];
    const targets = itemTargets(item, range);
    const g = gradeTake(item, synthMelody(targets.map((m) => m + 3), 0.8), range);
    expect(g.score).toBeLessThan(0.5);
  });
});

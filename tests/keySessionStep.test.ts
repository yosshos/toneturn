// The tempo step (owner 2026-11-27): weighed by how clean the take was AND the speed it started from — "clean at 60, up
// 20 %; clean at 100, not straight 20 %" — continuous in both, on the Maelzel marks.
import { describe, expect, it } from 'vitest';
import { MAELZEL, stepCap } from '../src/engine/drills/stages';
import { chalTarget, gradedUp, stepQuality } from '../src/engine/drills/keyCoach';
import { generate } from '../src/engine/drills/generate';
import type { DrillSpec, TakeMetrics } from '../src/engine/drills/types';

const bpmOf = (nps: number, per: number) => Math.round((nps * 60) / per);

describe('stepCap: the largest step falls with the speed', () => {
  it('20 % at 60 (quarters or eighths), less at 100 eighths, little at fast sixteenths', () => {
    expect(stepCap(1)).toBeCloseTo(0.2); // ♩60 quarters
    expect(stepCap(2)).toBeCloseTo(0.2); // ♩60 eighths
    expect(stepCap(100 * 2 / 60)).toBeLessThan(0.13); // ♩100 eighths ≈ 11 %
    expect(stepCap(100 * 2 / 60)).toBeGreaterThan(0.09);
    expect(stepCap(100 * 4 / 60)).toBeLessThan(0.06); // ♩100 sixteenths ≈ 5 %
    expect(stepCap(12)).toBe(0.035);
    for (let n = 1; n < 10; n += 0.5) expect(stepCap(n + 0.5)).toBeLessThanOrEqual(stepCap(n));
  });
});

describe('gradedUp: quality × starting speed', () => {
  it('a perfect take at ♩60 eighths climbs ~20 %; the same take at ♩100 eighths ~11 %', () => {
    const slow = gradedUp(2, 2, 1, {});
    const fast = gradedUp(100 * 2 / 60, 2, 1, {});
    expect(slow / 2).toBeGreaterThan(1.15);
    expect(slow / 2).toBeLessThanOrEqual(1.2 + 1e-6);
    expect(fast / (100 * 2 / 60)).toBeLessThan(1.13);
    expect(MAELZEL).toContain(bpmOf(slow, 2));
    expect(MAELZEL).toContain(bpmOf(fast, 2));
  });
  it('the cleaner the take, the bigger the step — continuously; a barely-clean take still one mark', () => {
    const at = 2;
    const steps = [0.15, 0.4, 0.7, 1].map((q) => gradedUp(at, 2, q, {}));
    for (let k = 1; k < steps.length; k++) expect(steps[k]).toBeGreaterThanOrEqual(steps[k - 1]);
    expect(steps[3]).toBeGreaterThan(steps[0]);
    expect(bpmOf(steps[0], 2)).toBe(63);
  });
  it('slower near the best, a ceiling, the target; never past the target', () => {
    const free = gradedUp(2, 2, 1, {});
    expect(gradedUp(2, 2, 1, { best: 2.35 })).toBeLessThan(free);
    expect(gradedUp(2, 2, 1, { ceil: 2.35 })).toBeLessThan(free);
    expect(gradedUp(2, 2, 1, { target: 2.1 })).toBeCloseTo(2.1);
  });
});

describe('stepQuality: continuous in the timing, the evenness and the hands', () => {
  const d = generate({ family: 'scales', kind: 'scale', key: 0, hands: 'RL', octaves: 2 } as DrillSpec);
  const m = (sd: number, extra: Partial<TakeMetrics> = {}) => ({ verdict: 'clean', bpm: 80, timingSD: sd, handsAbs: null, cvR: null, cvL: null, wrong: 0, hesitations: 0, ...extra }) as unknown as TakeMetrics;
  it('tight → 1, at the limit → 0.15, in between in order; the weakest measure counts', () => {
    const q = [5, 12, 18, 24, 29].map((sd) => stepQuality(m(sd), d));
    expect(q[0]).toBe(1);
    for (let k = 1; k < q.length; k++) expect(q[k]).toBeLessThanOrEqual(q[k - 1]);
    expect(q[4]).toBeGreaterThanOrEqual(0.15);
    expect(stepQuality(m(5, { handsAbs: 28 }), d)).toBeLessThan(0.4);
    expect(stepQuality({ ...m(5), verdict: 'almost' } as TakeMetrics, d)).toBe(0);
  });
});

describe('the challenge goes beyond the largest normal step at every speed', () => {
  it('chalTarget > gradedUp(perfect) and scales with the speed', () => {
    for (const at of [1.5, 2, 3, 5, 8]) expect(chalTarget(at, 0)).toBeGreaterThan(at * (1 + stepCap(at)));
    expect(chalTarget(2, 0) / 2).toBeGreaterThan(chalTarget(8, 0) / 8);
  });
});

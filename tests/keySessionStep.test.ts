// The speed stage's tempo step (owner 2026-11-25): quality × height × near-best, on the Maelzel marks.
import { describe, expect, it } from 'vitest';
import { heightFactor, MAELZEL, speedStep } from '../src/engine/drills/stages';

const bpmOf = (nps: number, per: number) => Math.round((nps * 60) / per);

describe('speedStep', () => {
  it('the height factor: whole below 3 nps, ¾ from 3 to 5, ½ above 5', () => {
    expect(heightFactor(2)).toBe(1);
    expect(heightFactor(4)).toBe(0.75);
    expect(heightFactor(6)).toBe(0.5);
  });
  it('slow: a near-perfect take climbs up to 10 % to a Maelzel mark', () => {
    const at = (100 * 1) / 60; // quarters ♩100
    const n = speedStep(at, 1.1, { per: 1, target: 5 });
    expect(MAELZEL).toContain(bpmOf(n, 1));
    expect(bpmOf(n, 1)).toBe(108);
    expect(n / at).toBeLessThanOrEqual(1.1);
  });
  it('fast: the same take climbs less (eighths ♩144 = 4.8 nps → one mark)', () => {
    const at = (144 * 2) / 60;
    const n = speedStep(at, 1.1, { per: 2, target: 9 });
    expect(bpmOf(n, 2)).toBe(152);
    expect(n / at).toBeLessThanOrEqual(1 + 0.1 * 0.75 + 1e-9);
  });
  it('near the best: the step halves (but still at least one mark up)', () => {
    const at = 100 / 60;
    const far = speedStep(at, 1.1, { per: 1, target: 9 });
    const near = speedStep(at, 1.1, { per: 1, target: 9, best: 110 / 60 });
    expect(bpmOf(far, 1)).toBe(108);
    expect(bpmOf(near, 1)).toBe(104);
  });
  it('a loose take still moves one mark; never past the target; hold = no move', () => {
    const at = (96 * 2) / 60;
    expect(bpmOf(speedStep(at, 1.03, { per: 2, target: 9 }), 2)).toBe(100);
    expect(speedStep(at, 1.1, { per: 2, target: at * 1.02 })).toBeCloseTo(at * 1.02, 6);
    expect(speedStep(at, 1, { per: 2, target: 9 })).toBe(at);
  });
  it('triplets: the ♩ sits on a mark too', () => {
    const at = (66 * 3) / 60;
    expect(MAELZEL).toContain(bpmOf(speedStep(at, 1.06, { per: 3, target: 9 }), 3));
  });
});

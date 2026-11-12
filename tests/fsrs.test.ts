import { describe, expect, it } from 'vitest';
import { FSRS_W, fromLeitner, fsrsDue, fsrsInit, fsrsReview, nextInterval, retrievability } from '../src/engine/fsrs';

const at = (d: number) => new Date(Date.UTC(2026, 10, 1 + d, 12)).toISOString();

describe('FSRS-4.5 scheduler', () => {
  it('retrievability is 90 % after S days, and the interval at 90 % equals S', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(retrievability(0, 3)).toBe(1);
    expect(nextInterval(10)).toBe(10);
    expect(nextInterval(10, 0.8)).toBeGreaterThan(10);
    expect(nextInterval(0.2)).toBe(1);
    expect(nextInterval(9999, 0.9, 120)).toBe(120);
  });
  it('first ratings use the default initial stabilities; difficulty falls with the grade', () => {
    for (const g of [1, 2, 3, 4] as const) expect(fsrsInit(g, at(0)).s).toBe(FSRS_W[g - 1]);
    expect(fsrsInit(1, at(0)).d).toBeGreaterThan(fsrsInit(4, at(0)).d);
    expect(fsrsInit(3, at(0)).d).toBeCloseTo(FSRS_W[4], 5);
  });
  it('a good review on time grows stability; easy grows more, hard less', () => {
    const c = fsrsInit(3, at(0));
    const t = at(4);
    const good = fsrsReview(c, 3, t);
    expect(good.s).toBeGreaterThan(c.s);
    expect(fsrsReview(c, 4, t).s).toBeGreaterThan(good.s);
    expect(fsrsReview(c, 2, t).s).toBeLessThan(good.s);
    expect(good.reps).toBe(2);
  });
  it('a lapse lowers stability and raises difficulty', () => {
    const c = fsrsReview(fsrsInit(3, at(0)), 3, at(4));
    const f = fsrsReview(c, 1, at(20));
    expect(f.s).toBeLessThan(c.s);
    expect(f.d).toBeGreaterThan(c.d);
    expect(f.lapses).toBe(1);
  });
  it('a review long overdue (low recall) earns a bigger gain than one on the same day', () => {
    const c = fsrsInit(3, at(0));
    expect(fsrsReview(c, 3, at(0)).s).toBeCloseTo(c.s, 5);
    expect(fsrsReview(c, 3, at(10)).s).toBeGreaterThan(fsrsReview(c, 3, at(2)).s);
  });
  it('Leitner migration: the box interval becomes the stability, so the due date stays where the box put it', () => {
    const c = fromLeitner(14, at(0), 4);
    expect(c.s).toBe(14);
    expect(fsrsDue(c)).toBe(at(14));
    expect(fromLeitner(0, at(0)).s).toBe(FSRS_W[0]);
  });
  it('is deterministic', () => {
    const run = () => [3, 3, 1, 3, 4].reduce((c, g, i) => fsrsReview(c, g as 1 | 2 | 3 | 4, at(5 * (i + 1))), fsrsInit(3, at(0)));
    expect(run()).toEqual(run());
  });
});

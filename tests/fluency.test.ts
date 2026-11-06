import { describe, expect, it } from 'vitest';
import { FLUENCY, itemPoints, paceFloor, paceKey, paceTarget, sectionScore, speedCredit, updatePace, type FluencyRecord } from '../src/engine/fluency';
import { makeLesson } from '../src/engine/lesson';
import { referenceTime } from '../src/engine/scoring';

const lesson = makeLesson('major-minor', 7);
const q = lesson.questions[0];
const ref = referenceTime(q, 'buttons');
const rec = (timeMs: number | null, extra: Partial<FluencyRecord> = {}): FluencyRecord => ({ outcome: 'correct', attempts: [{ correct: true, timeMs, modality: 'buttons' }], ...extra });

describe('fluency score', () => {
  it('scores 100 only when right, on pace and without replays', () => {
    const goal = paceTarget(q, 'buttons', {});
    expect(itemPoints(q, rec(goal - 100), {}, true)).toBe(100);
    expect(itemPoints(q, rec(goal * 1.6), {}, true)).toBeLessThan(100);
    expect(itemPoints(q, rec(goal * 5), {}, true)).toBe(FLUENCY.base);
    expect(itemPoints(q, rec(goal - 100, { replays: 1 }), {}, true)).toBe(90);
    expect(itemPoints(q, rec(goal - 100, { replays: 9 }), {}, true)).toBe(FLUENCY.minFirstTry);
  });

  it('a second try and a reveal are worth less; turning timing off removes only the speed part', () => {
    expect(itemPoints(q, { outcome: 'correct-retry', attempts: [{ correct: false }, { correct: true }] }, {}, true)).toBe(FLUENCY.retry);
    expect(itemPoints(q, { outcome: 'revealed', attempts: [{ correct: false, accuracy: 0 }, { correct: false, accuracy: 0 }] }, {}, true)).toBe(0);
    expect(itemPoints(q, rec(60000), {}, false)).toBe(100);
    expect(itemPoints(q, rec(60000, { replays: 2 }), {}, false)).toBe(80);
  });

  it('unmeasured time is not punished', () => {
    expect(speedCredit(null, 1000)).toBe(1);
    expect(speedCredit(1000 * FLUENCY.slowAt, 1000)).toBeCloseTo(0);
  });

  it('section stars follow the score: slow but all right = 2 stars, not 3', () => {
    const qs = lesson.questions.slice(0, 4);
    const slow = sectionScore(qs, qs.map(() => rec(30000)), {}, true);
    expect(slow.score).toBe(70);
    expect(slow.stars).toBe(2);
    const fast = sectionScore(qs, qs.map(() => rec(300)), {}, true);
    expect(fast.score).toBe(100);
    expect(fast.stars).toBe(3);
    expect(fast.onPace).toBe(4);
  });
});

describe('pace goal', () => {
  it('never goes below the choice-reaction floor', () => {
    expect(paceTarget(q, 'buttons', { [paceKey(q, 'buttons')]: { r: 0.01, samples: [], at: null } })).toBe(paceFloor(q, 'buttons'));
    expect(paceFloor(q, 'voice')).toBeGreaterThan(paceFloor(q, 'buttons'));
  });

  it('tightens toward your own median, at most ~5% a week', () => {
    const qs = Array.from({ length: 6 }, () => q);
    const now = new Date('2026-11-07T10:00:00Z');
    const fast = qs.map(() => rec(ref * 0.5));
    const p1 = updatePace({}, qs, fast, now);
    const r1 = p1[paceKey(q, 'buttons')].r;
    expect(r1).toBeCloseTo(0.95, 2); // first week: one full step
    const p2 = updatePace(p1, qs, fast, new Date('2026-11-07T12:00:00Z'));
    expect(p2[paceKey(q, 'buttons')].r).toBeGreaterThanOrEqual(r1 * (1 - FLUENCY.pace.minStep) - 1e-9);
    const p3 = updatePace(p2, qs, fast, new Date('2026-11-14T12:00:00Z'));
    expect(p3[paceKey(q, 'buttons')].r).toBeLessThan(p2[paceKey(q, 'buttons')].r);
  });

  it('ignores replayed and wrong answers, and loosens at most 5% after a slow day', () => {
    const qs = Array.from({ length: 6 }, () => q);
    const now = new Date('2026-11-07T10:00:00Z');
    expect(updatePace({}, qs, qs.map(() => rec(100, { replays: 1 })), now)).toEqual({});
    const start = { [paceKey(q, 'buttons')]: { r: 0.7, samples: [], at: null } };
    const p = updatePace(start, qs, qs.map(() => rec(ref * 3)), now);
    expect(p[paceKey(q, 'buttons')].r).toBeCloseTo(0.735, 3);
  });
});

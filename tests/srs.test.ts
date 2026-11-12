import { describe, expect, it } from 'vitest';
import { dueReviews, REVIEW_GRADUATE_DAYS, REVIEW_INTERVAL_DAYS, reviewCard, scheduleReview, type ReviewEntry } from '../src/storage/progress';
import { reviewLesson } from '../src/engine/adaptive';

const day = (d: number) => new Date(Date.UTC(2026, 10, 1 + d, 12)).toISOString();
const miss = (key: string, at: string): ReviewEntry => ({ questionId: 'q', key, answer: 'x', addedAt: at });

describe('spaced repetition for the review queue', () => {
  it('FSRS: each on-time correct recall waits longer, and the tag leaves the queue once the gap passes 35 days', () => {
    let items = scheduleReview([], new Set(), [miss('cadence:open', day(0))], day(0));
    expect(items[0]).toMatchObject({ box: 0, due: day(0) });
    expect(items[0].s).toBeGreaterThan(0);
    let t = 0;
    let gap = 0;
    for (let b = 1; b < 30 && items.length; b++) {
      items = scheduleReview(items, new Set(['cadence:open']), [], day(t));
      if (!items.length) break;
      expect(items[0].box).toBe(b);
      const g = Math.round((new Date(items[0].due!).getTime() - new Date(day(t)).getTime()) / 86400000);
      expect(g).toBeGreaterThanOrEqual(gap);
      expect(g).toBeLessThanOrEqual(REVIEW_GRADUATE_DAYS);
      gap = g;
      t += g;
    }
    expect(items).toHaveLength(0);
    expect(gap).toBeGreaterThan(7);
  });
  it('an old box-only entry migrates: its box interval becomes the stability, nothing is lost', () => {
    const old: ReviewEntry = { ...miss('quality:min', day(0)), box: 3, due: day(7) };
    expect(reviewCard(old).s).toBe(REVIEW_INTERVAL_DAYS[3]);
    const items = scheduleReview([old], new Set(['quality:min']), [], day(7));
    expect(items[0].box).toBe(4);
    expect(new Date(items[0].due!).getTime()).toBeGreaterThan(new Date(day(14)).getTime());
  });
  it('an early correct answer does not skip a box; a miss sends it back to box 0', () => {
    let items = scheduleReview([], new Set(), [miss('k', day(0))], day(0));
    items = scheduleReview(items, new Set(['k']), [], day(0)); // box 1, due day 1
    items = scheduleReview(items, new Set(['k']), [], day(0)); // not due yet: unchanged
    expect(items[0].box).toBe(1);
    items = scheduleReview(items, new Set(), [miss('k', day(1))], day(1));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ box: 0, due: day(1) });
  });
  it('the review session takes due items only, fresh misses first', () => {
    const items: ReviewEntry[] = [
      { ...miss('cadence:open', day(0)), box: 2, due: day(3) },
      { ...miss('cadence:resolved', day(2)), box: 0, due: day(2) },
      { ...miss('quality:min', day(0)), box: 1, due: day(1) },
    ];
    const now = new Date(day(2));
    expect(dueReviews(items, now).map((x) => x.key)).toEqual(['cadence:resolved', 'quality:min']);
    const l = reviewLesson(items, 1, 5, now)!;
    expect(l.questions.map((q) => q.answer)).toEqual(['resolved', 'min']);
  });
});

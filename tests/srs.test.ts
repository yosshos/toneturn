import { describe, expect, it } from 'vitest';
import { dueReviews, REVIEW_INTERVAL_DAYS, scheduleReview, type ReviewEntry } from '../src/storage/progress';
import { reviewLesson } from '../src/engine/adaptive';

const day = (d: number) => new Date(Date.UTC(2026, 10, 1 + d, 12)).toISOString();
const miss = (key: string, at: string): ReviewEntry => ({ questionId: 'q', key, answer: 'x', addedAt: at });

describe('spaced repetition for the review queue', () => {
  it('climbs the boxes 1 → 3 → 7 → 16 → 35 days and then leaves the queue', () => {
    let items = scheduleReview([], new Set(), [miss('cadence:open', day(0))], day(0));
    expect(items[0]).toMatchObject({ box: 0, due: day(0) });
    let t = 0;
    for (let b = 1; b < REVIEW_INTERVAL_DAYS.length; b++) {
      items = scheduleReview(items, new Set(['cadence:open']), [], day(t));
      expect(items[0].box).toBe(b);
      t += REVIEW_INTERVAL_DAYS[b];
      expect(items[0].due).toBe(day(t));
    }
    items = scheduleReview(items, new Set(['cadence:open']), [], day(t));
    expect(items).toHaveLength(0);
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

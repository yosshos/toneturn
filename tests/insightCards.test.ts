import { describe, expect, it } from 'vitest';
import { insightCardsFor, showsInsight } from '../src/engine/analysis/insightCards';
import { COURSES } from '../src/engine/courses';

describe('Insights cards per course (GUITAR_AUDIT P2)', () => {
  it('ear cards stay out of the guitar course', () => {
    expect(showsInsight('ear-index', 'guitar')).toBe(false);
    expect(showsInsight('confusions', 'guitar')).toBe(false);
    expect(insightCardsFor('guitar')).toEqual(expect.arrayContaining(['technique', 'key-map', 'groove']));
  });
  it('the ear course keeps its ear cards and drops the hand map', () => {
    expect(insightCardsFor('ear')).toEqual(expect.arrayContaining(['ear-index', 'confusions']));
    expect(showsInsight('hand-map', 'ear')).toBe(false);
  });
  it('every course has at least one card', () => {
    for (const c of COURSES) expect(insightCardsFor(c.id).length, c.id).toBeGreaterThan(0);
  });
});

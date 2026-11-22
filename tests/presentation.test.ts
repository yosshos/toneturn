import { describe, expect, it } from 'vitest';
import { nextChannel, presentation, START_MIX, strongOf, targetMix, weeklyMix } from '../src/engine/presentation';

describe('presentation by mastery (SPEC-EAR-AND-READING §8a)', () => {
  it('new → the strong channel; closed in this key → rhythm and name; the pattern closed in 3 keys → name only; memory → nothing', () => {
    expect(presentation({ status: 'new', patternKeys: 0, strong: 'ear' })).toEqual({ fade: 'full', byEar: true });
    expect(presentation({ status: 'new', patternKeys: 0, strong: 'page' })).toEqual({ fade: 'full', byEar: false });
    expect(presentation({ status: 'learning', patternKeys: 1, strong: 'ear' }).fade).toBe('full');
    expect(presentation({ status: 'closed', patternKeys: 1, strong: 'page' }).fade).toBe('rhythm');
    expect(presentation({ status: 'new', patternKeys: 3, strong: 'page' }).fade).toBe('name');
    expect(presentation({ status: 'closed', patternKeys: 5, strong: 'page', memoryPassed: true }).fade).toBe('none');
    expect(presentation({ status: 'closed', patternKeys: 5, strong: 'page', memoryPassed: true, missedLast: true }).fade).toBe('name');
  });
});

describe('the weekly mix (owner: 70/20/10 to start, adapts to the gap and to memory)', () => {
  it('starts at 70/20/10; a large gap moves the weak channel toward ~35 %, at most 5 points a week', () => {
    const t = targetMix({ ear: 0.9, reading: 0.3 }, 0);
    expect(t.weak).toBeCloseTo(0.35);
    const w1 = weeklyMix(null, t);
    expect(w1.weak).toBeCloseTo(0.25);
    const w2 = weeklyMix(w1, t);
    expect(w2.weak).toBeCloseTo(0.3);
    expect(w2.strong + w2.weak + w2.memory).toBeCloseTo(1);
  });
  it('balanced channels → about 45/45/10; memory grows with what is in the fingers', () => {
    const b = targetMix({ ear: 0.6, reading: 0.6 }, 0);
    expect(b.weak).toBeCloseTo(0.45);
    expect(b.strong).toBeCloseTo(0.45);
    expect(targetMix({ ear: 0.6, reading: 0.6 }, 1).memory).toBeCloseTo(0.25);
    expect(START_MIX).toEqual({ strong: 0.7, weak: 0.2, memory: 0.1 });
  });
  it('the strong channel and the next take', () => {
    expect(strongOf({ ear: 0.9, reading: 0.4 })).toBe('ear');
    expect(strongOf({ ear: null, reading: null })).toBe('page');
    expect(nextChannel(START_MIX, 'ear', 0.05)).toBe('memory');
    expect(nextChannel(START_MIX, 'ear', 0.2)).toBe('page');
    expect(nextChannel(START_MIX, 'ear', 0.8)).toBe('ear');
  });
});

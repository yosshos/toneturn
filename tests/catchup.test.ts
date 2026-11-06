import { describe, expect, it } from 'vitest';
import { catchUp, hasCatchUp } from '../src/engine/catchup';
import { AREAS, type Intake } from '../src/engine/intake';
import { placementLesson, placementSkills } from '../src/engine/placement';
import type { RatingEvent } from '../src/engine/rating';

const intake = (priorities: Intake['priorities']): Intake => ({ v: 1, at: '2026-11-01', music: 1, singing: 1, theory: 1, reading: 1, plays: [], priorities, motivation: 'learn', minutes: 10 });
const set = (skill: RatingEvent['skill']): RatingEvent => ({ id: `p:${skill}`, skill, difficulty: 1000, correct: true, set: 1100, at: '2026-11-01T10:00:00Z' });

describe('catch-up for players who started before the current first-run flow', () => {
  it('an old player with no intake and an older placement is offered both', () => {
    const c = catchUp({ mode: 'buttons' }, { ratingEvents: [set('degrees'), set('intervals')], lessons: { placement: { completions: 1 } } });
    expect(c.intake).toBe('missing');
    expect(c.unmeasured).not.toContain('degrees');
    expect(c.unmeasured).toContain('meter');
    expect(c.unmeasured).toContain('transpose');
    expect(c.unmeasured).not.toContain('singing'); // buttons mode: no sung sections
    expect(c.neverPlaced).toBe(false);
    expect(hasCatchUp(c)).toBe(true);
  });

  it('"later" and an intake missing a newer area still count; a full one does not', () => {
    expect(catchUp({ intake: null }, { lessons: {} }).intake).toBe('later');
    expect(catchUp({ intake: intake(AREAS.filter((a) => a !== 'creative')) }, { lessons: {} }).intake).toBe('outdated');
    expect(catchUp({ intake: intake([...AREAS]) }, { lessons: {} }).intake).toBe(null);
    expect(catchUp({ intake: intake(null) }, { lessons: {} }).intake).toBe(null); // "everything mixed"
  });

  it('everything measured and intake done → nothing to show; the key changes with what is offered', () => {
    const all = placementSkills({ singing: true }).map(set);
    const c = catchUp({ intake: intake([...AREAS]), mode: 'voice' }, { ratingEvents: all, lessons: { placement: { completions: 1 } } });
    expect(hasCatchUp(c)).toBe(false);
    const a = catchUp({}, { lessons: {} }).key;
    const b = catchUp({}, { ratingEvents: [set('degrees')], lessons: {} }).key;
    expect(a).not.toBe(b);
  });

  it('enough practice counts as measured', () => {
    const ev = Array.from({ length: 12 }, (_, i): RatingEvent => ({ id: `x${i}`, skill: 'meter', difficulty: 1000, correct: true, at: `2026-11-0${1 + (i % 5)}T10:00:00Z` }));
    expect(catchUp({}, { ratingEvents: ev, lessons: {} }).unmeasured).not.toContain('meter');
  });

  it('the catch-up placement runs only the unmeasured sections', () => {
    const l = placementLesson(7, { only: ['meter', 'form'] });
    expect(l.placementSkills).toEqual(['meter', 'form']);
    expect(placementLesson(7, { only: [] }).placementSkills!.length).toBeGreaterThan(10);
  });
});

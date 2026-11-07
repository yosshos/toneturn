import { describe, expect, it } from 'vitest';
import { CEIL_MARGIN, capGain, foldRatings, type RatingEvent } from '../src/engine/rating';
import { areaProgress, divFloor, MASTER_DIV, techniqueProgress } from '../src/engine/ranks';

const ev = (i: number, difficulty: number, correct = true, skill: RatingEvent['skill'] = 'intervals'): RatingEvent => ({ id: `e${i}`, skill, difficulty, correct, at: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString() });

describe('success ceiling', () => {
  it('never lifts a rating more than CEIL_MARGIN above the item that earned it', () => {
    expect(capGain(1000, 1200, 20)).toBe(20);
    expect(capGain(1240, 1200, 20)).toBe(10);
    expect(capGain(1300, 1200, 20)).toBe(0);
    expect(capGain(1400, 1200, -15)).toBe(-15);
  });
  it('a long run of easy successes stops near the items, not at the top of the bar', () => {
    const evs = Array.from({ length: 300 }, (_, i) => ev(i, 1200));
    const r = foldRatings(evs).intervals!.r;
    expect(r).toBeLessThanOrEqual(1200 + CEIL_MARGIN);
    expect(r).toBeGreaterThan(1200);
  });
  it('hard items still lift the rating high', () => {
    const evs = Array.from({ length: 300 }, (_, i) => ev(i, 1550));
    expect(foldRatings(evs).intervals!.r).toBeGreaterThan(1550);
  });
});

describe('rank progress (promotion bar)', () => {
  const skills: RatingEvent['skill'][] = ['intervals', 'chords', 'degrees', 'cadences'];
  const evs = skills.flatMap((k, j) => Array.from({ length: 15 }, (_, i) => ev(j * 100 + i, 1150, true, k)));
  const ratings = foldRatings(evs);
  it('ranked: a bar inside the division, never full below Master, with the evidence lock', () => {
    const p = areaProgress(ratings, evs, 'pitch');
    expect(p.div).not.toBeNull();
    expect(p.frac).toBeGreaterThanOrEqual(0);
    expect(p.frac).toBeLessThan(1);
    expect(p.next).toBe(p.div! + 1);
  });
  it('the held (stored) division wins and Master is the only full bar', () => {
    expect(areaProgress(ratings, evs, 'pitch', { div: MASTER_DIV, since: '2026-11-01', best: MASTER_DIV }).frac).toBe(1);
    const held = areaProgress(ratings, evs, 'pitch', { div: 3, since: '2026-11-01', best: 3 });
    expect(held.div).toBe(3);
    expect(divFloor(4)).toBe(840);
  });
  it('unranked: progress toward the first rank in answers', () => {
    const few = evs.slice(0, 5);
    const p = areaProgress(foldRatings(few), few, 'pitch');
    expect(p.div).toBeNull();
    expect(p.toFirst).toEqual({ answers: 5, need: 20 });
  });
  it('technique: level 2.5 → division 5, half-way to 6', () => {
    const p = techniqueProgress({ levels: { scales: 3, fingers: 2, harris: 2.5 }, takes: 60 });
    expect(p.div).toBe(5);
    expect(p.frac).toBeCloseTo(0, 5);
  });
});

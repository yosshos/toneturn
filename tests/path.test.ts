import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { buildPath, checkStep, stepCatalogue, unitShares, recordStep, stepStars, type PathInput } from '../src/engine/path';
import { foldRatings, type RatingEvent } from '../src/engine/rating';
import type { DomainId } from '../src/engine/rating';

const now = new Date('2026-11-07T12:00:00Z');
const base = (over: Partial<PathInput> = {}): PathInput => ({
  track: 'hobby',
  goal: 'general',
  hidden: [],
  noSing: false,
  noMic: false,
  priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'],
  leaveOut: [],
  packs: [],
  plays: ['guitar'],
  minutes: 10,
  ratings: {},
  events: [],
  facts: {},
  keep: [],
  reviewDue: 0,
  now,
  ...over,
});

function placementEvents(skills: string[], r: number): RatingEvent[] {
  return skills.map((k, i) => ({ id: `p1:${i}`, skill: k as RatingEvent['skill'], difficulty: r, correct: true, set: r, at: '2026-11-06T10:00:00Z' }));
}

describe('learning path (spec AF)', () => {
  it('has a catalogue of topic levels and lessons', () => {
    const c = stepCatalogue();
    expect(c.filter((s) => s.kind === 'topic').length).toBeGreaterThan(200);
    expect(c.filter((s) => s.kind === 'lesson').length).toBeGreaterThan(20);
  });

  it('a new player gets a current unit ending in a checkpoint, from several areas, then two projected', () => {
    const v = buildPath(base());
    const cur = v.units.find((u) => u.status === 'current')!;
    expect(cur).toBeTruthy();
    expect(cur.steps.length).toBeLessThanOrEqual(9); // 8 + a game step (0.38)
    expect(cur.steps.some((s) => s.step.kind === 'game')).toBe(true);
    expect(cur.steps[cur.steps.length - 1].step.kind).toBe('check');
    expect(new Set(cur.steps.map((s) => s.step.domain)).size).toBeGreaterThanOrEqual(3);
    expect(v.units.filter((u) => u.status === 'projected').length).toBe(2);
    expect(v.current).toBeTruthy();
    expect(v.freeze).toBeTruthy();
  });

  it('is deterministic', () => {
    expect(JSON.stringify(buildPath(base()).units.map((u) => u.steps.map((s) => s.step.id)))).toBe(JSON.stringify(buildPath(base()).units.map((u) => u.steps.map((s) => s.step.id))));
  });

  it('left-out areas and no-singing never appear', () => {
    const v = buildPath(base({ leaveOut: ['voice', 'creative'], noSing: true }));
    const steps = v.units.flatMap((u) => u.steps.map((s) => s.step)).filter((s) => s.kind !== 'check');
    expect(steps.some((s) => s.domain === 'voice' || s.domain === 'creative')).toBe(false);
    expect(steps.some((s) => s.sung)).toBe(false);
  });

  it('shares follow the rank, and small units rotate the lowest areas', () => {
    const w = new Map<DomainId, number>([['time', 5], ['pitch', 4], ['memory', 3], ['reading', 2], ['voice', 2], ['creative', 1], ['instrument', 1]]);
    const all: DomainId[] = [...w.keys()];
    const s1 = unitShares(w, all, 7, 1);
    expect([...s1.values()].reduce((a, b) => a + b, 0)).toBe(7);
    expect(s1.get('time')!).toBeGreaterThanOrEqual(s1.get('pitch') ?? 0);
    const small1 = unitShares(w, all, 5, 1);
    const small2 = unitShares(w, all, 5, 2);
    expect([...small1.values()].reduce((a, b) => a + b, 0)).toBe(5);
    expect([...small2.values()].reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('no ✓ without evidence; a strong level test moves the start and marks easy steps ✓ (or quick check)', () => {
    const fresh = buildPath(base());
    const freshD = fresh.units.find((u) => u.status === 'current')!.difficulty;
    expect(fresh.progress.checked).toBe(0);
    // A strong player: placement 1500 in many skills + right answers in the sub-skills.
    const skills = ['degrees', 'intervals', 'chords', 'cadences', 'rhythm-reading', 'rhythm-dictation', 'meter', 'tempo', 'sequences', 'notes', 'theory'];
    const ev: RatingEvent[] = [...placementEvents(skills, 1500)];
    let k = 0;
    for (const s of stepCatalogue().filter((x) => skills.includes(x.skill) && x.difficulty < 1300)) {
      for (const day of ['2026-11-01', '2026-11-05']) ev.push({ id: `s${day}:${k++}`, skill: s.skill, difficulty: s.difficulty, correct: true, tags: [{ skill: s.skill, sub: s.sub, w: 1 }], at: `${day}T10:00:00Z` });
    }
    const strong = buildPath(base({ ratings: foldRatings(ev), events: ev, track: 'student' }));
    const strongD = strong.units.find((u) => u.status === 'current')!.difficulty;
    expect(strong.progress.checked).toBeGreaterThan(10);
    expect(strongD).toBeGreaterThan(freshD);
  });

  it('✓ needs every factor: one lucky answer is not enough', () => {
    const s = stepCatalogue().find((x) => x.skill === 'intervals' && x.kind === 'topic')!;
    const ev: RatingEvent[] = [{ id: 'a:1', skill: 'intervals', difficulty: s.difficulty, correct: true, tags: [{ skill: 'intervals', sub: s.sub, w: 1 }], at: '2026-11-06T10:00:00Z' }];
    const inp = base({ ratings: { intervals: { r: 1600, n: 20, correct: 20, recent: [] } }, events: ev });
    expect(checkStep(s, inp, new Map()).state).not.toBe('tested');
  });

  it('done steps stay; a finished unit becomes past and the next one is built', () => {
    const v1 = buildPath(base());
    const f = v1.freeze!;
    let facts = { units: [{ ...f, at: now.toISOString() }] } as PathInput['facts'];
    for (const id of f.steps) facts = recordStep(facts, id, 2, now.toISOString());
    const v2 = buildPath(base({ facts }));
    expect(v2.units[0].status).toBe('past');
    expect(v2.units.find((u) => u.status === 'current')!.id).toBe('u2');
    expect(v2.freeze?.id).toBe('u2');
  });

  it('stars: 4/6 = 1, 5/6 = 2, 6/6 = 3; checkpoint 75 %', () => {
    expect(stepStars('topic', 3, 6)).toBe(0);
    expect(stepStars('topic', 4, 6)).toBe(1);
    expect(stepStars('topic', 5, 6)).toBe(2);
    expect(stepStars('topic', 6, 6)).toBe(3);
    expect(stepStars('check', 6, 8)).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { exerciseFor, subPriorities } from '../src/engine/scheduler';
import { planWorkout } from '../src/engine/workout';
import { SUB_SKILLS } from '../src/engine/taxonomy';
import { SKILLS, type Ratings } from '../src/engine/rating';

const now = new Date('2026-11-06T12:00:00');
const all = (r: number): Ratings => Object.fromEntries(SKILLS.map((k) => [k, { r, n: 20, correct: 15, recent: [] }]));

describe('priority scheduler (spec AD §5)', () => {
  it('an explorer starts with ear basics and expression; a pro does not', () => {
    const ex = subPriorities({ ratings: {}, subs: {}, track: 'explorer', voice: false, now }).slice(0, 6).map((p) => p.skill);
    expect(ex.some((k) => k === 'expression' || k === 'pitch' || k === 'timing')).toBe(true);
    expect(ex).not.toContain('theory');
    const pro = subPriorities({ ratings: {}, subs: {}, track: 'pro', voice: false, now }).slice(0, 8).map((p) => p.skill);
    expect(pro).not.toContain('expression');
  });
  it('prerequisites hold sub-skills back until they are on their way', () => {
    const fresh = subPriorities({ ratings: {}, subs: {}, track: 'student', voice: false, now }).map((p) => p.sub);
    expect(fresh).not.toContain('transpose/pitch');
    expect(fresh).not.toContain('cadences/modulation');
    const ready = subPriorities({ ratings: {}, subs: { 'degrees/diatonic': { ewma: 0.8, n: 6, last: now.toISOString() } }, track: 'student', voice: false, now }).map((p) => p.sub);
    expect(ready).toContain('transpose/pitch');
  });
  it('the weaker sub-skill of a skill comes first; long-unpractised ones rise', () => {
    const subs = { 'meter/count': { ewma: 0.95, n: 10, last: now.toISOString() }, 'meter/downbeat': { ewma: 0.3, n: 10, last: now.toISOString() } };
    const pr = subPriorities({ ratings: { meter: { r: 1100, n: 20, correct: 10, recent: [] } }, subs, track: 'hobby', voice: false, now });
    expect(pr.findIndex((p) => p.sub === 'meter/downbeat')).toBeLessThan(pr.findIndex((p) => p.sub === 'meter/count'));
    const old = { ...subs, 'meter/count': { ewma: 0.95, n: 10, last: '2026-10-01T12:00:00Z' } };
    const pr2 = subPriorities({ ratings: { meter: { r: 1100, n: 20, correct: 10, recent: [] } }, subs: old, track: 'hobby', voice: false, now });
    expect(pr2.find((p) => p.sub === 'meter/count')!.why).toBe('review');
    expect(pr2.find((p) => p.sub === 'meter/count')!.score).toBeGreaterThan(pr.find((p) => p.sub === 'meter/count')!.score);
  });
  it('the exercise level follows the rating', () => {
    const low = exerciseFor('expression/dynamics', { expression: { r: 700, n: 10, correct: 5, recent: [] } })!;
    const high = exerciseFor('expression/dynamics', { expression: { r: 1300, n: 10, correct: 5, recent: [] } })!;
    expect(low.topic).toBe('dynamics');
    expect(high.level).toBeGreaterThan(low.level);
  });
  it('no starvation: with everything measured, every practisable sub-skill can be scheduled', () => {
    const pr = new Set(subPriorities({ ratings: all(1300), subs: {}, track: 'pro', voice: true, now }).map((p) => p.sub));
    const practisable = SUB_SKILLS.filter((s) => s.skill !== 'absolute' && exerciseFor(s.id, all(1300)));
    for (const s of practisable) expect(pr.has(s.id), s.id).toBe(true);
  });
  it('Today\'s plan uses the scheduler: topic steps carry their sub-skill and reason, one per skill', () => {
    const plan = planWorkout({ minutes: 20, ratings: {}, reviewsDue: 0, voice: false, mastered: () => true, day: '2026-11-06', subs: {}, track: 'explorer' });
    const topics = plan.filter((s) => s.kind === 'topic');
    expect(topics.length).toBeGreaterThan(0);
    for (const s of topics) if (s.kind === 'topic') expect(s.sub.startsWith(`${s.skill}/`)).toBe(true);
    const skills = plan.flatMap((s) => (s.kind === 'topic' || s.kind === 'lesson' ? [s.skill] : []));
    expect(new Set(skills).size).toBe(skills.length);
  });
});

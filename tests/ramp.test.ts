// The gentle ramp (owner + tester 2026-11-18): a run at each level before the next, one idea per beginner lesson, and
// the path's beginner steps after the lessons they build on.
import { describe, expect, it } from 'vitest';
import { BEGINNER_BELOW, isGentle, rampLevels, rampNeed } from '../src/engine/ramp';
import { TASTES } from '../src/engine/courseStart';
import { tasteLesson } from '../src/engine/tasteLessons';
import { basicsBeat, basicsPitch, basicsShape, rhythmShiftLesson, transposeLesson } from '../src/engine/basics';
import { courseInput } from '../src/engine/courses';
import { buildPath, EARLY_PREREQ_BELOW, STEP_PREREQ, type PathFacts, type PathInput } from '../src/engine/path';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import type { Question } from '../src/engine/lesson';
import '../src/engine/topics';

const easy = () => BEGINNER_BELOW - 100;
const hard = () => BEGINNER_BELOW + 100;
const seq = (...xs: [string, number][]) => xs.map(([topic, level]) => ({ topic, level }));
/** The topic levels of a lesson's topic items, in order. */
const topicLevels = (qs: Question[]) => qs.flatMap((q) => ('topic' in q && typeof q.topic === 'string' && 'level' in q ? [{ topic: q.topic, level: Number(q.level) }] : []));

describe('rampLevels', () => {
  it('needs 3 at a beginner level and 2 higher up', () => {
    expect(rampNeed(BEGINNER_BELOW - 1)).toBe(3);
    expect(rampNeed(BEGINNER_BELOW)).toBe(2);
  });

  it('holds a topic at its level until the run is done, then climbs one level at a time', () => {
    expect(rampLevels(seq(['a', 1], ['a', 2], ['a', 3]), easy)).toEqual([1, 1, 1]);
    expect(rampLevels(seq(['a', 1], ['a', 1], ['a', 1], ['a', 3], ['a', 3]), easy)).toEqual([1, 1, 1, 2, 2]);
    expect(rampLevels(seq(['a', 1], ['a', 2], ['a', 3], ['a', 3]), hard)).toEqual([1, 1, 2, 2]);
  });

  it('keeps each topic apart, steps back as asked, and starts a topic where it is first asked', () => {
    expect(rampLevels(seq(['a', 2], ['b', 1], ['a', 3], ['b', 2], ['a', 3], ['a', 1]), hard)).toEqual([2, 1, 2, 1, 3, 1]);
    expect(isGentle(seq(['a', 1], ['a', 1], ['a', 1], ['a', 2]), easy)).toBe(true);
    expect(isGentle(seq(['a', 1], ['a', 2]), easy)).toBe(false);
  });
});

describe('sessions on the ramp', () => {
  it('the beginner ear taste: high / low three times, the home note, then high / low a level up — no beat, no top level', () => {
    const l = tasteLesson(TASTES.ear.new, 7);
    expect(topicLevels(l.questions).map((x) => `${x.topic}:${x.level}`)).toEqual([
      'basics-highlow:1', 'basics-highlow:1', 'basics-highlow:1', 'find-tonic:1', 'find-tonic:1', 'basics-highlow:2', 'basics-highlow:2',
    ]);
    expect(l.questions.length).toBeLessThanOrEqual(8);
  });

  it('every question taste and every hand-built ramped lesson already follows the ramp', () => {
    for (const c of Object.values(TASTES))
      for (const t of Object.values(c)) if (t.run.kind === 'lesson') expect(isGentle(topicLevels(tasteLesson(t, 11).questions)), t.id).toBe(true);
    for (const make of [basicsPitch, basicsShape, basicsBeat, transposeLesson, rhythmShiftLesson])
      for (const seed of [1, 2, 3]) expect(isGentle(topicLevels(make(seed).questions)), make.name).toBe(true);
  });

  it('a level repeated in a session is a new item each time (another seed)', () => {
    const qs = basicsPitch(5).questions.slice(0, 3).map((q) => JSON.stringify({ ...q, id: '' }));
    expect(new Set(qs).size).toBeGreaterThan(1);
  });

  it('the basics teach one idea each: pitch, shape, pulse', () => {
    expect(new Set(topicLevels(basicsPitch(1).questions).map((x) => x.topic))).toEqual(new Set(['basics-highlow']));
    expect(new Set(topicLevels(basicsShape(1).questions).map((x) => x.topic))).toEqual(new Set(['basics-contour']));
    // The pulse lesson: hear it (steady or wobbly) and tap it — no tempo, no meter.
    const beat = basicsBeat(1).questions;
    expect(new Set(topicLevels(beat).map((x) => x.topic))).toEqual(new Set(['basics-beat']));
    expect(beat.every((q) => q.kind === 'choice' || q.kind === 'rhythm-read')).toBe(true);
  });
});

describe('the beginner path: what a step builds on comes first, in an earlier unit', () => {
  const base: PathInput = { track: 'explorer', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-18T10:00:00Z') };
  function walk(n: number): string[][] {
    let facts: PathFacts = {};
    const out: string[][] = [];
    for (let u = 0; u < n; u++) {
      const v = buildPath({ ...courseInput(base, 'ear'), ladderFamilies: ladderFamiliesFor('ear', DEFAULT_DRILL_SETTINGS), ladderHidden: ladderHiddenFor('ear', undefined, undefined, false, DEFAULT_DRILL_SETTINGS), facts });
      const cur = v.units.find((x) => x.status === 'current');
      if (!cur) break;
      out.push(cur.steps.map((x) => x.step.id));
      const steps = { ...(facts.steps ?? {}) };
      for (const x of cur.steps) steps[x.step.id] = { stars: 3, at: '2026-11-18T10:00:00Z' };
      facts = { ...facts, steps, units: [...(facts.units ?? []), ...(v.freeze ? [{ ...v.freeze, at: '2026-11-18T10:00:00Z' }] : [])] };
    }
    return out;
  }
  // Curriculum flow (one new idea per unit): units are shorter, so the beginner window is ten units now.
  const units = walk(10);
  const unitOf = (id: string) => units.findIndex((u) => u.includes(id));

  it('same note in two homes after the degrees lesson; meter and articulation after the pulse lesson', () => {
    expect(EARLY_PREREQ_BELOW).toBeGreaterThan(1000);
    for (const [id, pre] of Object.entries(STEP_PREREQ)) {
      const a = unitOf(id);
      if (a < 0) continue;
      for (const p of pre) {
        const b = unitOf(p);
        // Early steps: the prerequisite sits in an earlier unit (it was done before, or it is in the history).
        expect(b, `${id} after ${p}`).toBeLessThan(a);
        expect(b, `${id} after ${p}`).toBeGreaterThanOrEqual(0);
      }
    }
    // 2026-11-18 (round 2): degrees 1-3-5 now waits for high / low, so two homes may fall past these five units.
    expect(unitOf('lesson:degrees-135')).toBeGreaterThanOrEqual(0);
    const twoHomes = unitOf('lesson:bflat-two-homes');
    expect(twoHomes === -1 || twoHomes > unitOf('lesson:degrees-135')).toBe(true);
  });

  it('inside a unit no step comes before a step it builds on', () => {
    for (const u of units)
      for (const [id, pre] of Object.entries(STEP_PREREQ)) {
        const i = u.indexOf(id);
        for (const p of pre) if (i >= 0 && u.includes(p)) expect(u.indexOf(p), `${p} before ${id}`).toBeLessThan(i);
      }
  });
});

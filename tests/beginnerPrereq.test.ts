// Tester 2026-11-18 (Ear, beginner), the second round: a unit's game waits for the step that teaches its concept;
// "What is a chord?" comes before major / minor and every chord step; high / low comes before the scale degrees.
import { describe, expect, it } from 'vitest';
import { courseInput, type CourseId } from '../src/engine/courses';
import { BEGINNER_PREREQ, buildPath, eligible, GAME_PREREQ, gameForArea, STEP_PREREQ, stepCatalogue, type PathFacts, type PathInput } from '../src/engine/path';
import { ladderFamiliesFor, ladderHiddenFor } from '../src/engine/ladderFacts';
import { DEFAULT_DRILL_SETTINGS } from '../src/engine/drills/types';
import { makeLesson } from '../src/engine/lesson';
import { isGentle } from '../src/engine/ramp';
import { MINI_LESSONS } from '../src/content/minilessons';
import { UNIT_LESSON } from '../src/content/units';
import '../src/engine/topics';

const base: PathInput = { track: 'explorer', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {} as PathInput['ratings'], events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-18T10:00:00Z') };
/** A new player passing every step of each current unit: the units' step ids, in order. */
function walk(n: number, course: CourseId = 'ear', track: PathInput['track'] = 'explorer'): string[][] {
  let facts: PathFacts = {};
  const out: string[][] = [];
  for (let u = 0; u < n; u++) {
    const v = buildPath({ ...courseInput({ ...base, track }, course), ladderFamilies: ladderFamiliesFor(course, DEFAULT_DRILL_SETTINGS), ladderHidden: ladderHiddenFor(course, undefined, undefined, false, DEFAULT_DRILL_SETTINGS), facts });
    const cur = v.units.find((x) => x.status === 'current');
    if (!cur) break;
    out.push(cur.steps.map((x) => x.step.id));
    const steps = { ...(facts.steps ?? {}) };
    for (const x of cur.steps) steps[x.step.id] = { stars: 3, at: '2026-11-18T10:00:00Z' };
    facts = { ...facts, steps, units: [...(facts.units ?? []), ...(v.freeze ? [{ ...v.freeze, at: '2026-11-18T10:00:00Z' }] : [])] };
  }
  return out;
}

const tracks = ['explorer', 'hobby', 'student'] as const;
const walks = Object.fromEntries(tracks.map((t) => [t, walk(12, 'ear', t)])) as Record<(typeof tracks)[number], string[][]>;
const unitOf = (units: string[][], id: string) => units.findIndex((u) => u.includes(id));

describe('a unit game waits for the step that teaches its concept', () => {
  it('every game in the first Ear units comes after its concept step, in an earlier unit', () => {
    for (const t of tracks)
      walks[t].forEach((u, i) => {
        for (const id of u.filter((x) => x.startsWith('game:'))) {
          const g = id.split(':')[2];
          for (const pid of GAME_PREREQ[g] ?? []) {
            const at = unitOf(walks[t], pid);
            // On this player's path at all: then it was passed in an earlier unit.
            const step = stepCatalogue().find((s) => s.id === pid);
            if (step && eligible(step, courseInput({ ...base, track: t }, 'ear'))) expect(at, `${t} unit ${i + 1}: ${g} before ${pid}`).toBeGreaterThanOrEqual(0);
            if (at >= 0) expect(at, `${t} unit ${i + 1}: ${g} after ${pid}`).toBeLessThan(i);
          }
        }
      });
  });

  it('the beginner Ear unit 1 has no Chord Rush (no chord taught yet)', () => {
    for (const t of tracks) expect(walks[t][0].some((x) => x.startsWith('game:') && x.endsWith(':rush-chord')), t).toBe(false);
    expect(walks.explorer[0].some((x) => x.startsWith('game:'))).toBe(true);
  });

  it('gameForArea skips a game whose concept is not ready, and keeps it once it is', () => {
    const inp = { noMic: false, noSing: false, plays: [], packs: [], course: 'ear' as CourseId };
    const all = Array.from({ length: 6 }, (_, n) => gameForArea('pitch', n, inp, 900));
    expect(all).toContain('rush-chord');
    const ready = (g: string) => g !== 'rush-chord';
    for (let n = 0; n < 6; n++) expect(gameForArea('pitch', n, inp, 900, ready)).not.toBe('rush-chord');
    expect(gameForArea('pitch', 1, inp, 900, () => false)).toBeNull();
  });
});

describe('"What is a chord?" opens the chord steps', () => {
  it('is a path lesson with its short mini-lesson, and its practice is gentle and in the chords skill', () => {
    expect(UNIT_LESSON['chord-intro']).toBe('chord-intro');
    const m = MINI_LESSONS['chord-intro'];
    expect(m.steps.length).toBeGreaterThanOrEqual(3);
    expect(m.steps.length).toBeLessThanOrEqual(5);
    const L = makeLesson('chord-intro', 3);
    expect(L.questions.length).toBeGreaterThanOrEqual(3);
    expect(L.questions[0].kind).toBe('quality');
    expect(isGentle(L.questions.flatMap((q) => ('topic' in q && typeof q.topic === 'string' ? [{ topic: q.topic, level: Number((q as { level?: number }).level ?? 1) }] : [])))).toBe(true);
    const step = stepCatalogue().find((s) => s.id === 'lesson:chord-intro')!;
    expect(step.skill).toBe('chords');
    expect(step.sub).toBe('chords/quality');
    expect(step.difficulty).toBeLessThan(stepCatalogue().find((s) => s.id === 'lesson:major-minor')!.difficulty);
    expect(STEP_PREREQ['lesson:major-minor']).toContain('lesson:chord-intro');
  });

  it('comes before major / minor and every chord step, in an earlier unit', () => {
    const byId = new Map(stepCatalogue().map((s) => [s.id, s] as const));
    for (const t of tracks) {
      const at = unitOf(walks[t], 'lesson:chord-intro');
      expect(at, t).toBeGreaterThanOrEqual(0);
      expect(unitOf(walks[t], 'lesson:major-minor'), t).toBeGreaterThan(at);
      walks[t].forEach((u, i) => {
        for (const id of u) {
          const s = byId.get(id);
          if (!s || id === 'lesson:chord-intro' || s.kind === 'game' || s.kind === 'check') continue;
          if (s.skill === 'chords') expect(i, `${t}: ${id} before the chord intro`).toBeGreaterThan(at);
        }
      });
    }
  });
});

describe('high / low before the scale degrees for a new Ear player', () => {
  it('the high / low lesson is the first or second step, and degrees 1-3-5 comes in a later unit', () => {
    for (const t of ['explorer', 'hobby'] as const) {
      expect(walks[t][0].indexOf('lesson:basics-pitch'), t).toBeGreaterThanOrEqual(0);
      expect(walks[t][0].indexOf('lesson:basics-pitch'), t).toBeLessThanOrEqual(1);
      expect(unitOf(walks[t], 'lesson:degrees-135'), t).toBeGreaterThan(0);
    }
    expect(BEGINNER_PREREQ['lesson:degrees-135']).toContain('lesson:basics-pitch');
  });

  it('a student (past the beginner section) is not sent back to high / low', () => {
    expect(walks.student[0]).not.toContain('lesson:basics-pitch');
    expect(unitOf(walks.student, 'lesson:degrees-135')).toBeGreaterThanOrEqual(0);
  });

  it('the instrument and voice courses keep their first units (the rules touch only steps with a prerequisite)', () => {
    // Their first steps are their own first-steps ladders; nothing here leans on an Ear lesson.
    expect(walk(1, 'keys')[0][0]).toBe('tech:k-first-1');
    expect(walk(1, 'guitar')[0][0]).toBe('tech:g-first-1');
    expect(walk(1, 'bass')[0][0]).toBe('tech:b-first-1');
  });
});

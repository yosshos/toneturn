import { describe, expect, it } from 'vitest';
import { courseInput, coursesFromProfile, inCourse, JAZZ_LADDER_FAMILIES, switchCourse, VOICE_SHARED_LESSONS, THEORY_SHARED_LESSONS, type CourseId } from '../src/engine/courses';
import { eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { migrateSettings, DEFAULT_SETTINGS } from '../src/storage/progress';

const base: PathInput = {
  track: 'hobby',
  goal: 'general',
  hidden: [],
  noSing: false,
  noMic: false,
  priorities: null,
  leaveOut: [],
  packs: ['jazz'],
  plays: [],
  minutes: 10,
  ratings: {} as PathInput['ratings'],
  events: [],
  facts: {},
  keep: [],
  reviewDue: 0,
  now: new Date('2026-11-09T10:00:00Z'),
};

describe('courses (SPEC-COURSES)', () => {
  const all = stepCatalogue();
  it('every course has steps of its own', () => {
    for (const c of ['ear', 'voice', 'keys', 'guitar', 'bass', 'drums'] as CourseId[]) {
      const inp = courseInput(base, c);
      const n = all.filter((s) => eligible(s, inp)).length;
      expect(n, c).toBeGreaterThan(0);
    }
  });
  // The one shared exception (AUDIT-CONTENT-THEORY §ב.1): the keyboard map key-notes 1–3 is in Piano and in Ear.
  it('a step never sits in two courses (instrument steps may serve several instruments)', () => {
    for (const s of all) {
      if (s.topic === 'key-notes' && (s.level ?? 9) <= 3) {
        expect(inCourse(s, 'ear') && inCourse(s, 'keys'), s.id).toBe(true);
        continue;
      }
      // Curriculum audit R3(a): the Ear lessons the voice course builds on are shared with it.
      if (s.kind === 'lesson' && VOICE_SHARED_LESSONS.includes(s.lesson!)) {
        expect(inCourse(s, 'ear') && inCourse(s, 'voice'), s.id).toBe(true);
        continue;
      }
      // 2026-11-19: the shared theory lessons (chords of the key, 7ths, scales, modes) are in Ear and the instrument courses.
      if (s.kind === 'lesson' && Object.values(THEORY_SHARED_LESSONS).some((ls) => ls!.includes(s.lesson!))) {
        expect(inCourse(s, 'ear') && (['keys', 'guitar', 'bass'] as CourseId[]).every((c) => !THEORY_SHARED_LESSONS[c]?.includes(s.lesson!) || inCourse(s, c)), s.id).toBe(true);
        continue;
      }
      const instr = (['keys', 'guitar', 'bass'] as CourseId[]).some((c) => inCourse(s, c));
      // SPEC-JAZZ-FOLD: no Jazz course — the performed jazz families live only in their instrument course (or voice).
      const owners = (['ear', 'voice'] as CourseId[]).filter((c) => inCourse(s, c)).length + (instr ? 1 : 0);
      expect(owners, s.id).toBeLessThanOrEqual(1);
      if (!!s.ladder && JAZZ_LADDER_FAMILIES.includes(s.ladder.family)) expect(inCourse(s, 'ear'), s.id).toBe(false);
    }
  });
  it('sung steps live in the voice course, never in ear', () => {
    const sung = all.filter((s) => s.sung);
    expect(sung.length).toBeGreaterThan(0);
    for (const s of sung) {
      expect(inCourse(s, 'ear')).toBe(false);
      if (!s.forPlays?.length) expect(inCourse(s, 'voice')).toBe(true);
    }
  });
  it('SPEC-JAZZ-FOLD: the jazz pack follows the player, not a course; jazz focus opens it in any course', () => {
    expect(courseInput({ ...base, packs: [] }, 'ear').packs).not.toContain('jazz');
    expect(courseInput({ ...base, packs: ['jazz'] }, 'ear').packs).toContain('jazz');
    expect(courseInput({ ...base, packs: ['jazz'] }, 'keys').packs).toContain('jazz');
    expect(courseInput({ ...base, packs: [] }, 'keys', false, true).packs).toContain('jazz');
    expect(courseInput(base, 'ear', false, true).goal).toBe('jazz');
    expect(courseInput(base, 'ear', true, true).goal).toBe('exam');
  });
  it('choosing the voice course undoes "leave singing out"', () => {
    const inp = courseInput({ ...base, leaveOut: ['voice'], noSing: true }, 'voice');
    expect(inp.leaveOut).not.toContain('voice');
    expect(inp.noSing).toBe(false);
  });
  it('switching parks the current course and restores the other, losing nothing', () => {
    const earFacts = { steps: { 'topic:intervals:1': { stars: 3, at: '2026-11-01' } } };
    let s = switchCourse({ courses: ['ear', 'keys'], activeCourse: 'ear', pathFacts: earFacts, pathKeep: ['x'] }, 'keys');
    expect(s.activeCourse).toBe('keys');
    expect(s.pathFacts).toEqual({});
    expect(s.pathFactsBy?.ear).toEqual(earFacts);
    s = switchCourse({ ...s, pathFacts: { tests: { a: '2026-11-02' } } }, 'ear');
    expect(s.pathFacts).toEqual(earFacts);
    expect(s.pathKeep).toEqual(['x']);
    expect(s.pathFactsBy?.keys).toEqual({ tests: { a: '2026-11-02' } });
  });
  it('switching to a new course adds it', () => {
    const s = switchCourse({ courses: ['ear'], activeCourse: 'ear' }, 'bass');
    expect(s.courses).toEqual(['ear', 'bass']);
  });
  it('players from before courses get courses from their goal and instruments', () => {
    expect(coursesFromProfile('general', [])).toEqual({ courses: ['ear'], active: 'ear', examPrep: false, jazzFocus: false });
    expect(coursesFromProfile('sing', ['keys'])).toEqual({ courses: ['ear', 'keys', 'voice'], active: 'voice', examPrep: false, jazzFocus: false });
    // SPEC-JAZZ-FOLD: the jazz goal is the Ear course in jazz focus.
    expect(coursesFromProfile('jazz', ['guitar'])).toEqual({ courses: ['ear', 'guitar'], active: 'ear', examPrep: false, jazzFocus: true });
    // 0.67: the exam goal is the Ear course in exam-prep mode.
    const m = migrateSettings({ ...DEFAULT_SETTINGS, goal: 'exam', pathFacts: { steps: { a: { stars: 1, at: 'x' } } } });
    expect(m.courses).toEqual(['ear']);
    expect(m.activeCourse).toBe('ear');
    expect(m.examPrep).toBe(true);
    expect(m.pathFacts?.steps?.a).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';
import { COURSE_IDS, COURSES, courseGoal, courseInput, mergeFacts, migrateExamCourse, normCourse, switchCourse, type CourseId } from '../src/engine/courses';
import { buildPath, stepCatalogue, type PathInput } from '../src/engine/path';
import { DEFAULT_SETTINGS, migrateSettings, type Settings } from '../src/storage/progress';
import { courseLevels, friendsInCourse, weeklyCourseXp } from '../src/engine/courseSocial';
import { dailyQuests } from '../src/engine/quests';
import { examCard, mockSittings } from '../src/engine/examPrep';
import { EXAMS } from '../src/content/bagrut';
import { mockExamLesson } from '../src/ui/Exams';
import { COURSE_GAMES, COURSE_ROWS, courseRows } from '../src/ui/courseRows';
import type { RatingEvent } from '../src/engine/rating';

const base: PathInput = {
  track: 'hobby',
  goal: 'general',
  hidden: [],
  noSing: false,
  noMic: false,
  priorities: null,
  leaveOut: [],
  packs: [],
  plays: [],
  minutes: 10,
  ratings: {},
  events: [],
  facts: {},
  keep: [],
  reviewDue: 0,
  now: new Date('2026-11-10T10:00:00Z'),
};
const st = (stars: number, at: string, o: object = {}) => ({ stars, at, ...o });
/** Old data still says 'exam'. */
const legacy = (o: Record<string, unknown>): Partial<Settings> => ({ ...DEFAULT_SETTINGS, ...o }) as Partial<Settings>;

describe('no Exams course anywhere selectable (0.67)', () => {
  it('the course list, ids and per-course tables have no exam', () => {
    expect(COURSE_IDS as string[]).not.toContain('exam');
    expect(COURSES.map((c) => c.id) as string[]).not.toContain('exam');
    expect(Object.keys(COURSE_ROWS)).not.toContain('exam');
    expect(Object.keys(COURSE_GAMES)).not.toContain('exam');
  });
  it('old ids read as live ones', () => {
    expect(normCourse('exam')).toBe('ear');
    expect(normCourse('bass')).toBe('bass');
    expect(normCourse('nope')).toBeNull();
  });
});

describe('exam prep: what the mode changes', () => {
  it('the ear path uses the exam goal; other courses ignore the mode', () => {
    expect(courseGoal('ear', true)).toBe('exam');
    expect(courseGoal('ear', false)).toBe('general');
    expect(courseGoal('jazz', true)).toBe('jazz');
    expect(courseInput(base, 'ear', true).goal).toBe('exam');
    expect(courseInput(base, 'ear').goal).toBe('general');
    expect(courseInput(base, 'voice', true).goal).toBe('sing');
  });
  it('the same ear steps, exam topics weighed higher', () => {
    const on = buildPath(courseInput(base, 'ear', true));
    const off = buildPath(courseInput(base, 'ear', false));
    const ids = (v: typeof on) => v.units.flatMap((u) => u.steps.map((x) => x.step.id));
    const cat = new Map(stepCatalogue().map((s) => [s.id, s]));
    for (const id of ids(on)) expect(cat.get(id)?.forPlays?.length ?? 0, id).toBe(0);
    expect(ids(on).length).toBeGreaterThan(0);
    // Reading & theory (what the Bagrut tests most) come up far more in exam prep.
    const reading = (v: typeof on) => v.units.flatMap((u) => u.steps).filter((x) => x.step.domain === 'reading').length;
    expect(reading(on)).toBeGreaterThan(reading(off) * 2);
  });
  it('Practice puts the mock exams first in the ear course only', () => {
    expect(courseRows('ear', true)[0]).toBe('exams');
    expect(courseRows('ear', true)).toEqual(['exams', 'lessons', 'puzzle', 'games']);
    expect(courseRows('ear', false)).toEqual(COURSE_ROWS.ear);
    expect(courseRows('voice', true)).toEqual(COURSE_ROWS.voice);
  });
  it('quests: the exam-topic quest every day in exam prep', () => {
    const ev = (skill: string, i: number): RatingEvent => ({ skill, at: `2026-11-10T10:0${i}:00`, correct: true }) as unknown as RatingEvent;
    const day = { day: '2026-11-10', course: 'ear' as CourseId, events: [0, 1, 2].map((i) => ev('theory', i)), sessions: [], stepsToday: 0, minutesToday: 0 };
    const q = dailyQuests({ ...day, examPrep: true });
    expect(q[0].id).toBe('theory5');
    expect(q[0].now).toBe(3);
    expect(q[1].id).not.toBe('theory5');
    expect(dailyQuests(day).map((x) => x.id)).not.toContain('theory5');
    expect(dailyQuests({ ...day, course: 'voice', examPrep: true }).map((x) => x.id)).not.toContain('theory5');
  });
});

describe('migration: the old Exams course → Ear with exam prep on', () => {
  it('exam was active: ear active, exam prep on, the exam path becomes ear’s, parked ear facts merged', () => {
    const m = migrateSettings(
      legacy({
        courses: ['ear', 'exam', 'keys'],
        activeCourse: 'exam',
        pathFacts: { steps: { a: st(2, '2026-11-05'), b: st(1, '2026-11-06') }, units: [{ id: 'u-exam', n: 1, steps: ['a', 'b'], checked: [], at: '2026-11-05' }] },
        pathKeep: ['a'],
        pathFactsBy: { ear: { steps: { a: st(3, '2026-11-01'), c: st(1, '2026-11-02') }, tests: { t: '2026-11-01' } }, keys: { steps: { k: st(1, 'x') } } },
        pathKeepBy: { ear: ['c'], keys: ['k'] },
      }),
    );
    expect(m.courses).toEqual(['ear', 'keys']);
    expect(m.activeCourse).toBe('ear');
    expect(m.examPrep).toBe(true);
    expect(m.pathFacts?.steps?.a.stars).toBe(3);
    expect(m.pathFacts?.steps?.a.firstAt).toBe('2026-11-01');
    expect(m.pathFacts?.steps?.b).toBeTruthy();
    expect(m.pathFacts?.steps?.c).toBeTruthy();
    expect(m.pathFacts?.tests?.t).toBe('2026-11-01');
    expect(m.pathFacts?.units?.[0].id).toBe('u-exam');
    expect(new Set(m.pathKeep)).toEqual(new Set(['a', 'c']));
    expect(Object.keys(m.pathFactsBy ?? {})).toEqual(['keys']);
    expect(m.pathFactsBy?.keys?.steps?.k).toBeTruthy();
    expect(Object.keys(m.pathKeepBy ?? {})).toEqual(['keys']);
  });
  it('exam parked, ear active: exam facts merge into the live ear path', () => {
    const m = migrateSettings(legacy({ courses: ['ear', 'exam'], activeCourse: 'ear', pathFacts: { steps: { a: st(1, '2026-11-03') } }, pathFactsBy: { exam: { steps: { a: st(2, '2026-11-04'), z: st(1, '2026-11-04') } } }, pathKeepBy: { exam: ['z'] } }));
    expect(m.courses).toEqual(['ear']);
    expect(m.activeCourse).toBe('ear');
    expect(m.examPrep).toBe(true);
    expect(m.pathFacts?.steps?.a.stars).toBe(2);
    expect(m.pathFacts?.steps?.z).toBeTruthy();
    expect(m.pathKeep).toEqual(['z']);
    expect(m.pathFactsBy?.['exam' as CourseId]).toBeUndefined();
  });
  it('exam parked, another course active: ear (added) waits parked with the exam facts', () => {
    const m = migrateSettings(legacy({ courses: ['exam', 'guitar'], activeCourse: 'guitar', pathFacts: { steps: { g: st(1, 'x') } }, pathFactsBy: { exam: { steps: { e: st(3, '2026-11-01') } } } }));
    expect(m.courses).toEqual(['ear', 'guitar']);
    expect(m.activeCourse).toBe('guitar');
    expect(m.examPrep).toBe(true);
    expect(m.pathFacts?.steps?.g).toBeTruthy();
    expect(m.pathFactsBy?.ear?.steps?.e.stars).toBe(3);
    // Switching to ear then restores them.
    const sw = switchCourse(m, 'ear');
    expect(sw.pathFacts?.steps?.e.stars).toBe(3);
  });
  it('players without the exam course are untouched; migration is idempotent', () => {
    const plain = migrateSettings(legacy({ courses: ['ear', 'voice'], activeCourse: 'voice' }));
    expect(plain.examPrep).toBeUndefined();
    const once = migrateSettings(legacy({ courses: ['exam'], activeCourse: 'exam', pathFacts: { steps: { a: st(1, 'x') } } }));
    const twice = migrateSettings(once);
    expect(twice).toEqual(once);
    expect(once.courses).toEqual(['ear']);
  });
  it('exam prep switched off later stays off', () => {
    const m = migrateSettings({ ...migrateSettings(legacy({ courses: ['exam'], activeCourse: 'exam' })), examPrep: false });
    expect(m.examPrep).toBe(false);
  });
  it('re-picking the active course with no stored list never lists it twice', () => {
    expect(switchCourse({}, 'ear').courses).toEqual(['ear']);
    expect(switchCourse({ activeCourse: 'voice' }, 'jazz').courses).toEqual(['voice', 'jazz']);
  });
  it('mergeFacts keeps the best of both', () => {
    expect(mergeFacts(undefined, { tests: { a: 'x' } })).toEqual({ tests: { a: 'x' } });
    expect(mergeFacts({ steps: { a: st(1, '2026-11-02', { times: 4 }) } }, { steps: { a: st(2, '2026-11-01', { times: 1 }) } }).steps?.a).toEqual({ stars: 2, at: '2026-11-01', firstAt: '2026-11-01', times: 4 });
    expect(migrateExamCourse({ courses: ['ear'], activeCourse: 'ear' })).toEqual({ courses: ['ear'], activeCourse: 'ear' });
  });
});

describe('per-course XP, levels and friends: exam merges into ear', () => {
  it('this week’s XP stored under exam counts for ear', () => {
    const h = [
      { lessonId: 'practice-log', completedAt: '2026-11-09T10:00:00Z', xp: 30, course: 'exam' as const },
      { lessonId: 'practice-log', completedAt: '2026-11-09T11:00:00Z', xp: 20, course: 'ear' as const },
    ];
    expect(weeklyCourseXp(h, new Date('2026-11-08'), new Date('2026-11-11'))).toEqual([{ course: 'ear', xp: 50 }]);
  });
  it('the levels I send have no exam; a friend’s old exam level reads as ear', () => {
    const lv = courseLevels(migrateSettings(legacy({ courses: ['ear', 'exam'], activeCourse: 'exam' })).courses!, { pitch: { r: 1200, rd: 80, n: 30 } } as never);
    expect(Object.keys(lv)).not.toContain('exam');
    const v = friendsInCourse([{ name: 'Me', relation: 'me' as const, course_levels: {} }, { name: 'Old', relation: 'friend' as const, course_levels: { exam: 'mf' } }], 'ear', 'p');
    expect(v.rows.map((r) => [r.name, r.level])).toEqual([
      ['Old', 'mf'],
      ['Me', 'p'],
    ]);
    expect(friendsInCourse([{ name: 'Old', relation: 'friend' as const, course_levels: { exam: 'mf' } }], 'jazz', null).rows).toEqual([]);
  });
});

describe('Today’s exam card', () => {
  const exam = EXAMS[0];
  const sitting = (at: string, wrongSection: string) => {
    const def = mockExamLesson(exam, 7);
    return { completedAt: at, items: def.questions.map((q) => ({ id: q.id, correct: !q.id.startsWith(`${exam.id}-${wrongSection}-`) })) };
  };
  it('no mock yet: the first Bagrut, nothing weak', () => {
    const c = examCard([]);
    expect(c.exam.kind).toBe('bagrut');
    expect(c.lastAt).toBeUndefined();
    expect(c.weak).toEqual([]);
    expect(c.minutes).toBeGreaterThan(0);
  });
  it('after a mock: the same exam again, its weakest section first', () => {
    const sec = exam.sections[2].id;
    const h = [{ completedAt: '2026-11-08T10:00:00Z', items: [{ id: 'intervals-1', correct: true }] }, sitting('2026-11-09T10:00:00Z', sec)];
    expect(mockSittings(h)).toHaveLength(1);
    const c = examCard(h);
    expect(c.exam.id).toBe(exam.id);
    expect(c.lastAt).toBe('2026-11-09T10:00:00Z');
    expect(c.weak.map((w) => w.section.id)).toEqual([sec]);
  });
  it('exam ids that prefix each other are told apart', () => {
    const jj = EXAMS.find((e) => e.id === 'jamd-jazz');
    if (!jj) return;
    const def = mockExamLesson(jj, 3);
    expect(mockSittings([{ completedAt: 'x', items: def.questions.map((q) => ({ id: q.id, correct: true })) }])[0].exam.id).toBe('jamd-jazz');
  });
});

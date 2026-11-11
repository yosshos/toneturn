import { describe, expect, it } from 'vitest';
import { COURSE_IDS, type CourseId } from '../src/engine/courses';
import {
  courseHasProgress,
  firstWeekDay,
  goalProgress,
  LADDER,
  levelTested,
  markSetup,
  markTasteDone,
  markTasteOpened,
  markWinSeen,
  migrateCourseStart,
  offerDue,
  PERSONAL_GOALS,
  pickProbes,
  PROMISE,
  reportCourse,
  SELF_REPORTS,
  sessionsSince,
  setupNeeded,
  snoozeOffer,
  stageOf,
  TASTES,
  type CourseStartMap,
  type ProgressFacts,
} from '../src/engine/courseStart';
import { melodyDrill, tasteDrills, tasteLesson } from '../src/engine/tasteLessons';
import { drillBandHits } from '../src/engine/drills/bandTimeline';
import type { PathUnit } from '../src/engine/path';

const NOW = '2026-11-11T10:00:00.000Z';
const empty: ProgressFacts = { history: [] };

describe('course start: the stage machine', () => {
  it('welcome → setup → taste → win → done', () => {
    let m: CourseStartMap | undefined;
    expect(stageOf(m?.keys, true)).toBe('welcome');
    m = reportCourse(m, 'keys', 'bit', NOW);
    expect(stageOf(m.keys, true)).toBe('setup');
    expect(stageOf(m.keys, false)).toBe('taste'); // already checked in another course
    m = markSetup(m, 'keys', NOW);
    expect(stageOf(m.keys, true)).toBe('taste');
    m = markTasteOpened(m, 'keys', NOW);
    expect(stageOf(m.keys, true)).toBe('taste'); // an abandoned taste stays "continue"
    m = markTasteDone(m, 'keys', { kind: 'drills', takes: 3, clean: 2, acc: 0.9, bars: 6, xp: 12 }, NOW);
    expect(stageOf(m.keys, true)).toBe('win');
    m = markWinSeen(m, 'keys', NOW);
    expect(stageOf(m.keys, true)).toBe('done');
    // Other courses are untouched.
    expect(stageOf(m.ear, false)).toBe('welcome');
  });

  it('a skipped setup counts as done; the first win is never overwritten by a replay', () => {
    let m = markSetup(reportCourse(undefined, 'guitar', 'new', NOW), 'guitar', NOW, true);
    expect(m.guitar?.setupSkipped).toBe(true);
    m = markTasteDone(m, 'guitar', { kind: 'drills', takes: 2, clean: 1, xp: 5 }, NOW);
    m = markTasteDone(m, 'guitar', { kind: 'drills', takes: 9, clean: 9, xp: 50 }, '2026-11-12T10:00:00.000Z');
    expect(m.guitar?.win?.takes).toBe(2);
  });

  it('a reported welcome stays reported when the report changes', () => {
    const m = reportCourse(reportCourse(undefined, 'ear', 'new', NOW), 'ear', 'well', '2026-11-12T00:00:00.000Z');
    expect(m.ear?.report).toBe('well');
    expect(m.ear?.welcomeAt).toBe(NOW);
  });

  it('legacy players are done whatever else is set', () => {
    expect(stageOf({ legacy: true }, true)).toBe('done');
  });

  it('setup is skipped when the instrument was already checked', () => {
    expect(setupNeeded('keys', {})).toBe(true);
    expect(setupNeeded('keys', { midiInput: true })).toBe(false);
    expect(setupNeeded('drums', { drumKit: { done: true } })).toBe(false);
    expect(setupNeeded('voice', { voiceRange: { lo: 50, hi: 70 } })).toBe(false);
    expect(setupNeeded('ear', { headphones: false })).toBe(false);
    // One listening check serves ear and jazz.
    expect(setupNeeded('jazz', { courseStart: { ear: { setupAt: NOW } } })).toBe(false);
    // Guitar and bass check their own strings.
    expect(setupNeeded('bass', { courseStart: { guitar: { setupAt: NOW } } })).toBe(true);
  });
});

describe('course start: migration of existing players', () => {
  it('a course with path facts, results or technique counts as started (legacy)', () => {
    const p: ProgressFacts = {
      activeCourse: 'keys',
      pathFacts: { steps: { 'k-1': { stars: 2, at: NOW } } },
      pathFactsBy: { voice: { tests: { u1: NOW } } },
      history: [{ lessonId: 'topic', completedAt: NOW, course: 'jazz' }],
      drillFamilies: ['d-rock'],
    };
    const m = migrateCourseStart(undefined, ['ear', 'keys', 'voice', 'jazz', 'drums', 'guitar'], p);
    expect(m?.keys).toEqual({ legacy: true });
    expect(m?.voice).toEqual({ legacy: true });
    expect(m?.jazz).toEqual({ legacy: true });
    expect(m?.drums).toEqual({ legacy: true });
    expect(m?.guitar).toBeUndefined();
    expect(m?.ear).toBeUndefined();
  });

  it('results from before courses belong to the ear course', () => {
    expect(courseHasProgress('ear', { history: [{ lessonId: 'bflat-two-homes', completedAt: NOW }] })).toBe(true);
    expect(courseHasProgress('ear', { history: [], lessonsDone: 1 })).toBe(true);
    expect(courseHasProgress('keys', { history: [{ lessonId: 'bflat-two-homes', completedAt: NOW }] })).toBe(false);
  });

  it('a new player has nothing to migrate, and a started course is never touched', () => {
    expect(migrateCourseStart(undefined, ['ear'], empty)).toBeUndefined();
    const m0: CourseStartMap = { ear: { report: 'new', tasteAt: NOW } };
    const p: ProgressFacts = { history: [{ lessonId: 'topic', completedAt: NOW, course: 'ear' }] };
    expect(migrateCourseStart(m0, ['ear'], p)).toBe(m0);
  });

  it('piano technique counts for keys, not for guitar', () => {
    expect(courseHasProgress('keys', { history: [], drillFamilies: ['scales'] })).toBe(true);
    expect(courseHasProgress('guitar', { history: [], drillFamilies: ['scales'] })).toBe(false);
  });
});

describe('course start: timing', () => {
  const done = { report: 'new' as const, tasteDoneAt: NOW, winSeenAt: NOW };
  it('counts sessions of the course after the taste', () => {
    const h = [
      { lessonId: 'topic', completedAt: NOW, course: 'ear', sessionId: 'taste' },
      { lessonId: 'topic', completedAt: '2026-11-12T10:00:00.000Z', course: 'ear', sessionId: 'a' },
      { lessonId: 'topic', completedAt: '2026-11-12T11:00:00.000Z', course: 'keys', sessionId: 'b' },
      { lessonId: 'topic', completedAt: '2026-11-13T10:00:00.000Z', course: 'ear', sessionId: 'c' },
    ];
    expect(sessionsSince(h, 'ear', NOW)).toBe(2);
    expect(sessionsSince(h, 'keys', NOW)).toBe(1);
    expect(sessionsSince(h, 'ear', undefined)).toBe(0);
  });

  it('offers the level test after the first session for "well", after session 3 for the rest', () => {
    expect(offerDue({ ...done, report: 'well' }, 0, false, '2026-11-11')).toBe(true);
    expect(offerDue(done, 0, false, '2026-11-11')).toBe(false);
    expect(offerDue(done, 1, false, '2026-11-11')).toBe(false);
    expect(offerDue(done, 2, false, '2026-11-11')).toBe(true);
    expect(offerDue({ ...done, report: 'bit' }, 2, true, '2026-11-11')).toBe(false); // taken
    expect(offerDue({ legacy: true }, 9, false, '2026-11-11')).toBe(false);
    expect(offerDue({ report: 'well', tasteDoneAt: NOW }, 0, false, '2026-11-11')).toBe(false); // win not seen yet
    const snoozed = snoozeOffer({ ear: { ...done, report: 'well' } }, 'ear', '2026-11-11');
    expect(snoozed.ear?.offerSnoozeUntil).toBe('2026-11-14');
    expect(offerDue(snoozed.ear, 0, false, '2026-11-13')).toBe(false);
    expect(offerDue(snoozed.ear, 0, false, '2026-11-15')).toBe(true);
  });

  it('the course level test: placement or playing test results, or technique start levels of the course', () => {
    expect(levelTested('ear', [{ lessonId: 'placement', completedAt: NOW, course: 'ear' }])).toBe(true);
    expect(levelTested('keys', [{ lessonId: 'placement', completedAt: NOW, course: 'ear' }])).toBe(false);
    expect(levelTested('guitar', [], ['g-chords'])).toBe(true);
    expect(levelTested('bass', [], ['g-chords'])).toBe(false);
  });

  it('sessions 2 and 3 are the first week; then the card goes', () => {
    expect(firstWeekDay(done, 0)).toBe(2);
    expect(firstWeekDay(done, 1)).toBe(3);
    expect(firstWeekDay(done, 2)).toBeNull();
    expect(firstWeekDay({ legacy: true }, 0)).toBeNull();
  });

  it('weaves the unit’s probe steps, one per skill', () => {
    const st = (id: string, skill: string, probe: boolean, state: 'current' | 'open' | 'done') => ({ step: { id, skill, title: { en: id, he: id } }, state, probe }) as never;
    const u = { id: 'u1', status: 'current', steps: [st('a', 'chords', true, 'current'), st('b', 'chords', true, 'open'), st('c', 'degrees', false, 'open'), st('d', 'meter', true, 'open'), st('e', 'tempo', true, 'done')] } as unknown as PathUnit;
    expect(pickProbes([u]).map((p) => p.x.step.id)).toEqual(['a', 'd']);
    const u2 = { ...u, steps: [st('c', 'degrees', false, 'current')] } as PathUnit;
    expect(pickProbes([u2]).map((p) => p.x.step.id)).toEqual(['c']);
  });

  it('personal goal progress counts steps first finished since it was set', () => {
    const g = { id: 'keys-blues', at: NOW, weeks: 6, steps: 36 };
    const facts = { steps: { a: { stars: 2, at: '2026-11-12T00:00:00.000Z' }, b: { stars: 3, at: '2026-11-12T00:00:00.000Z', firstAt: '2026-10-01T00:00:00.000Z' }, c: { stars: 0, at: '2026-11-12T00:00:00.000Z' } } };
    expect(goalProgress(g, facts, new Date('2026-11-26T10:00:00.000Z'))).toEqual({ done: 1, total: 36, weeksLeft: 4 });
  });
});

describe('course start: content', () => {
  it('every course has a promise, a 4-rung ladder, goals and a taste per self-report (he + en)', () => {
    for (const c of COURSE_IDS as CourseId[]) {
      expect(PROMISE[c].en && PROMISE[c].he).toBeTruthy();
      expect(LADDER[c]).toHaveLength(4);
      expect(PERSONAL_GOALS[c].length).toBeGreaterThanOrEqual(2);
      for (const r of SELF_REPORTS) {
        const t = TASTES[c][r];
        expect(t.title.en && t.title.he && t.blurb.en && t.blurb.he).toBeTruthy();
        // Mature copy: no emoji.
        expect(/\p{Extended_Pictographic}/u.test(JSON.stringify([t.title, t.blurb, PROMISE[c], LADDER[c], PERSONAL_GOALS[c]]))).toBe(false);
      }
    }
  });

  it('every question taste builds a short session of real items', () => {
    for (const c of COURSE_IDS as CourseId[])
      for (const r of SELF_REPORTS) {
        const t = TASTES[c][r];
        if (t.run.kind !== 'lesson') continue;
        const l = tasteLesson(t, 42);
        expect(l.questions.length, t.id).toBeGreaterThanOrEqual(4);
        expect(l.questions.length, t.id).toBeLessThanOrEqual(8);
        expect(new Set(l.questions.map((q) => q.id)).size).toBe(l.questions.length);
      }
  });

  it('every playing taste builds drills, with the band under them', () => {
    for (const c of COURSE_IDS as CourseId[])
      for (const r of SELF_REPORTS) {
        const t = TASTES[c][r];
        if (t.run.kind === 'lesson') continue;
        const ds = tasteDrills(t);
        expect(ds.length, t.id).toBeGreaterThanOrEqual(1);
        for (const d of ds) {
          expect(d.band, `${t.id} ${d.itemId}`).toBeTruthy();
          expect(drillBandHits(d).length, `${t.id} ${d.itemId}`).toBeGreaterThan(0);
        }
      }
  });

  it('the newcomer melody is C D E G on the keys, four bars', () => {
    const d = melodyDrill();
    expect(new Set(d.notes.map((n) => n.pitch))).toEqual(new Set([60, 62, 64, 67]));
    expect(d.beats).toBe(16);
    expect(Math.max(...d.notes.map((n) => n.beat + n.dur))).toBe(16);
  });

  it('the F blues chart matches the shells (root of each bar)', () => {
    const [d] = tasteDrills(TASTES.keys.well);
    expect(d.title.en).toContain('in F');
    const roots = Array.from({ length: 12 }, (_, b) => Math.min(...d.notes.filter((n) => n.beat >= b * 4 && n.beat < b * 4 + 4).map((n) => n.pitch)) % 12);
    const want = (d.chart ?? []).map((x) => ({ F: 5, Bb: 10, D: 2, G: 7, C: 0 })[x.replace(/m?7$/, '')]);
    expect(roots).toEqual(want);
  });

  it('a practice pad gets single-surface drums', () => {
    const ds = tasteDrills(TASTES.drums.new, { drumPad: true });
    expect(ds.every((d) => d.drum?.mic)).toBe(true);
  });
});

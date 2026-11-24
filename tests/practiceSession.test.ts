import { describe, expect, it } from 'vitest';
import {
  KEEP_SESSIONS,
  addSessionRecord,
  clampDaily,
  dailyMinutesOf,
  legacyRunSlotKey,
  mergeSessionTotals,
  mergeSessions,
  pickRun,
  practiceDaysOf,
  runSlotKey,
  sessionRecordOf,
  todayEditsFor,
  todayFocusFor,
  weeklyGoalMin,
  withTodayEdits,
  workoutDaysOf,
  type SessionRecord,
} from '../src/engine/practiceSession';
import { averageSession, bookTime, emptyLedger, monthTotals, yearTotal } from '../src/engine/practiceTime';
import { addSession, focusAreas, focusBlocks, nextBlock, startRun, total, type Block } from '../src/engine/workout2';
import { DEFAULT_SETTINGS, emptyProgress, migrateSettings, practiceDays, withSessionRecord } from '../src/storage/progress';
import { rebuildProgress } from '../src/storage/sync';
import { badgeInputOf } from '../src/engine/rankBadges';
import { earnedBadges } from '../src/engine/badges';
import { COURSE_AREAS } from '../src/engine/courses';
import { unitLenOf } from '../src/engine/path';

const rec = (day: string, activeMs: number, over: Partial<SessionRecord> = {}): SessionRecord => ({ id: `${day}:${activeMs}`, day, course: 'keys', focus: 'plan', plannedMin: 30, activeMs, blocks: [], finished: true, ...over });
const blocks: Block[] = [
  { id: 'warmup-1', target: { kind: 'warmup' }, minutes: 3 },
  { id: 'keys-1', target: { kind: 'keys' }, minutes: 18 },
  { id: 'improv-1', target: { kind: 'improv', mode: 'improv' }, minutes: 9 },
];

describe('settings defaults (§7)', () => {
  it('daily practice: 30 by default, 5–180 in steps of 5', () => {
    expect(dailyMinutesOf({})).toBe(30);
    expect(dailyMinutesOf(DEFAULT_SETTINGS)).toBe(30);
    expect(dailyMinutesOf(migrateSettings({ version: 2, dailyMinutes: 45 } as never))).toBe(45);
    expect(clampDaily(2)).toBe(5);
    expect(clampDaily(500)).toBe(180);
    expect(clampDaily(33)).toBe(35);
    expect(clampDaily(Number.NaN)).toBe(30);
  });
  it('practice days a week: 5 by default, 3–7; the weekly goal multiplies', () => {
    expect(practiceDaysOf({})).toBe(5);
    expect(practiceDaysOf({ practiceDays: 1 })).toBe(3);
    expect(practiceDaysOf({ practiceDays: 9 })).toBe(7);
    expect(weeklyGoalMin({})).toBe(150);
    expect(weeklyGoalMin({ dailyMinutes: 45, practiceDays: 4 })).toBe(180);
  });
  it('the path keeps its unit length for the old answers and caps the new ones', () => {
    expect([5, 10, 20, 30, 45, 60].map(unitLenOf)).toEqual([6, 8, 10, 10, 10, 10]);
  });
});

describe('session records (§8)', () => {
  it('a run becomes its record: course, focus, planned minutes, active ms per block', () => {
    let r = startRun('2026-11-24', blocks, { id: 's1', course: 'keys', focus: 'instrument' });
    expect(r.planned).toBe(30);
    r = addSession(r, 120000, 4, 3);
    r = { ...nextBlock(r), finished: true };
    const x = sessionRecordOf(r, { course: 'ear' });
    expect(x).toMatchObject({ id: 's1', day: '2026-11-24', course: 'keys', focus: 'instrument', plannedMin: 30, activeMs: 120000, finished: true });
    expect(x.blocks[0]).toEqual({ kind: 'warmup', ms: 120000, items: 4, correct: 3 });
    expect(x.blocks.map((b) => b.kind)).toEqual(['warmup', 'keys', 'improv']);
  });
  it('an old run without meta falls back to the given course and "plan"', () => {
    const x = sessionRecordOf({ ...startRun('2026-11-24', blocks), finished: true }, { course: 'ear', id: 'x' });
    expect(x).toMatchObject({ id: 'x', course: 'ear', focus: 'plan', plannedMin: 30, activeMs: 0 });
  });
  it('totals and records from the start; once per id; the last 500 kept', () => {
    let s = addSessionRecord(undefined, undefined, rec('2026-11-23', 20 * 60000));
    s = addSessionRecord(s.sessions, s.totals, rec('2026-11-24', 35 * 60000));
    s = addSessionRecord(s.sessions, s.totals, rec('2026-11-24', 35 * 60000)); // same id
    s = addSessionRecord(s.sessions, s.totals, rec('2026-11-25', 5 * 60000, { finished: false }));
    expect(s.sessions).toHaveLength(3);
    expect(s.totals.finished).toBe(2);
    expect(s.totals.totalMs).toBe(60 * 60000);
    expect(s.totals.longestMs).toBe(35 * 60000);
    expect(s.totals.bestWeek).toEqual({ week: '2026-11-23', ms: 60 * 60000 });
    expect(s.totals.bestMonth).toEqual({ month: '2026-11', ms: 60 * 60000 });
    let big = { sessions: [] as SessionRecord[], totals: s.totals };
    for (let i = 0; i < KEEP_SESSIONS + 20; i++) big = addSessionRecord(big.sessions, big.totals, rec('2026-12-01', 1000, { id: `b${i}` }));
    expect(big.sessions).toHaveLength(KEEP_SESSIONS);
    expect(big.sessions[0].id).toBe('b20');
    expect(big.totals.finished).toBe(2 + KEEP_SESSIONS + 20);
    expect(big.totals.bestWeek?.week).toBe('2026-11-23');
  });
  it('a finished session counts its day for the streak; recorded once', () => {
    const p0 = emptyProgress();
    const p1 = withSessionRecord(p0, rec('2026-11-24', 60000));
    expect(practiceDays(p1).has('2026-11-24')).toBe(true);
    expect(p1.sessions).toHaveLength(1);
    expect(p1.sessionTotals?.finished).toBe(1);
    expect(withSessionRecord(p1, rec('2026-11-24', 60000))).toBe(p1);
    const p2 = withSessionRecord(p0, rec('2026-11-20', 60000, { finished: false }));
    expect(practiceDays(p2).has('2026-11-20')).toBe(false);
  });
  it('a rebuild from the server keeps the device records (union by id, totals by max)', () => {
    const local = withSessionRecord(withSessionRecord(emptyProgress(), rec('2026-11-23', 1000)), rec('2026-11-24', 2000));
    const out = rebuildProgress([], local);
    expect(out.sessions?.map((x) => x.id)).toEqual(['2026-11-23:1000', '2026-11-24:2000']);
    expect(out.sessionTotals?.finished).toBe(2);
    expect(mergeSessions([rec('2026-11-24', 1)], [rec('2026-11-23', 1), rec('2026-11-24', 1)])?.map((x) => x.day)).toEqual(['2026-11-23', '2026-11-24']);
    expect(mergeSessionTotals({ finished: 3, totalMs: 10, longestMs: 5 }, { finished: 2, totalMs: 20, longestMs: 4, bestWeek: { week: 'w', ms: 9 } })).toEqual({ finished: 3, totalMs: 20, longestMs: 5, bestWeek: { week: 'w', ms: 9 } });
  });
  it('workoutDays come from finished sessions, so "weekly-ritual" can be earned', () => {
    expect(workoutDaysOf([rec('2026-11-02', 1), rec('2026-11-01', 1), rec('2026-11-01', 2), rec('2026-11-03', 1, { finished: false })])).toEqual(['2026-11-01', '2026-11-02']);
    let p = emptyProgress();
    for (let d = 1; d <= 7; d++) p = withSessionRecord(p, rec(`2026-11-0${d}`, 60000));
    const input = badgeInputOf(p, new Date('2026-11-07T12:00:00'));
    expect(input.workoutDays).toHaveLength(7);
    const got = new Set(earnedBadges(input).map((b) => b.id));
    expect(got.has('special:weekly-ritual')).toBe(true);
    expect(got.has('special:iron-routine')).toBe(false);
  });
});

describe('time helpers (§8)', () => {
  const l = [
    ['2026-10-30', 10],
    ['2026-11-02', 20],
    ['2026-11-24', 30],
    ['2025-12-31', 40],
  ].reduce((acc, [d, m]) => bookTime(acc, d as string, { course: 'keys', kind: 'technique', q: 'edge' }, (m as number) * 60000), emptyLedger('2025-12-01'));
  it('month totals, newest last, across a year end', () => {
    const ms = monthTotals(l, '2026-11-24', 3);
    expect(ms.map((x) => x.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(ms.map((x) => x.ms / 60000)).toEqual([0, 10, 50]);
    expect(monthTotals(l, '2026-01-10', 2).map((x) => [x.month, x.ms / 60000])).toEqual([
      ['2025-12', 40],
      ['2026-01', 0],
    ]);
    expect(monthTotals(l, '2026-11-24', 1, 'ear')[0].ms).toBe(0);
  });
  it('year total of the calendar year', () => {
    expect(yearTotal(l, '2026-11-24')).toMatchObject({ year: '2026', ms: 60 * 60000 });
    expect(yearTotal(l, '2025-12-31').ms).toBe(40 * 60000);
  });
  it('average finished session per week', () => {
    const ss = [rec('2026-11-17', 20 * 60000), rec('2026-11-23', 30 * 60000), rec('2026-11-24', 20 * 60000), rec('2026-11-24', 90 * 60000, { id: 'u', finished: false })];
    expect(averageSession(ss, '2026-11-24', 3)).toEqual([
      { week: '2026-11-09', avgMs: 0, count: 0 },
      { week: '2026-11-16', avgMs: 20 * 60000, count: 1 },
      { week: '2026-11-23', avgMs: 25 * 60000, count: 2 },
    ]);
  });
});

describe('today by day + course (§2)', () => {
  const a: Block[] = [{ id: 'path-1', target: { kind: 'path' }, minutes: 10 }];
  const b: Block[] = [{ id: 'keys-1', target: { kind: 'keys' }, minutes: 20 }];
  it('each course keeps its own edits and focus today', () => {
    let wt = withTodayEdits(undefined, '2026-11-24', 'ear', a);
    wt = withTodayEdits(wt, '2026-11-24', 'keys', b, 'instrument');
    expect(todayEditsFor(wt, '2026-11-24', 'ear')).toEqual(a);
    expect(todayEditsFor(wt, '2026-11-24', 'keys')).toEqual(b);
    expect(todayEditsFor(wt, '2026-11-24', 'guitar')).toBeNull();
    expect(todayFocusFor(wt, '2026-11-24', 'keys')).toBe('instrument');
    expect(todayFocusFor(wt, '2026-11-24', 'ear')).toBe('plan');
    wt = withTodayEdits(wt, '2026-11-24', 'keys', null, 'plan');
    expect(todayEditsFor(wt, '2026-11-24', 'keys')).toBeNull();
    expect(todayFocusFor(wt, '2026-11-24', 'keys')).toBe('plan');
    expect(todayEditsFor(wt, '2026-11-24', 'ear')).toEqual(a);
    expect(withTodayEdits(wt, '2026-11-24', 'ear', null)).toBeUndefined();
  });
  it("yesterday's edits are not today's; a new day starts clean", () => {
    const wt = withTodayEdits(undefined, '2026-11-23', 'ear', a);
    expect(todayEditsFor(wt, '2026-11-24', 'ear')).toBeNull();
    expect(withTodayEdits(wt, '2026-11-24', 'keys', b)).toEqual({ day: '2026-11-24', byCourse: { keys: b } });
  });
  it('old edits without a course stay the active course’s, and move under it on the next write', () => {
    const old = { day: '2026-11-24', blocks: a };
    expect(todayEditsFor(old, '2026-11-24', 'ear')).toEqual(a);
    const wt = withTodayEdits(old, '2026-11-24', 'ear', null, 'pitch');
    expect(wt).toEqual({ day: '2026-11-24', byCourse: {}, focus: { ear: 'pitch' } });
  });
  it('the resume slot is keyed by day and course; an old day-only run is the active course’s', () => {
    expect(runSlotKey('2026-11-24', 'keys')).toBe('workout:2026-11-24:keys');
    expect(legacyRunSlotKey('2026-11-24')).toBe('workout:2026-11-24');
    const keys = startRun('2026-11-24', b, { course: 'keys' });
    const old = startRun('2026-11-24', a);
    expect(pickRun(keys, old, 'keys')).toBe(keys);
    expect(pickRun(null, old, 'ear')).toEqual({ ...old, course: 'ear' });
    expect(pickRun(null, startRun('2026-11-24', a, { course: 'keys' }), 'ear')).toBeNull();
    expect(pickRun(null, null, 'ear')).toBeNull();
  });
});

describe('the focus picker (§2)', () => {
  it('offers only the active course’s areas that have a preset', () => {
    expect(focusAreas(COURSE_AREAS.ear)).toEqual(['pitch', 'time', 'reading']);
    expect(focusAreas(COURSE_AREAS.keys)).toEqual(['instrument']);
    expect(focusAreas(COURSE_AREAS.drums)).toEqual(['instrument', 'time']);
    expect(focusAreas(COURSE_AREAS.voice)).toEqual(['voice']);
  });
  it('an instrument focus keeps technique and improvisation at the chosen length', () => {
    const sug: Block[] = [{ id: 'path-1', target: { kind: 'path' }, minutes: 6 }, ...blocks];
    const out = focusBlocks('instrument', 45, sug, COURSE_AREAS.keys);
    expect(total(out)).toBe(45);
    expect(out.map((x) => x.target.kind)).toEqual(['warmup', 'keys', 'improv']);
  });
  it('an area preset stays inside the course and keeps the total', () => {
    for (const T of [10, 20, 30, 60, 180]) {
      const out = focusBlocks('time', T, blocks, COURSE_AREAS.drums);
      expect(total(out), String(T)).toBe(T);
      for (const x of out) if (x.target.kind === 'area') expect(COURSE_AREAS.drums).toContain(x.target.area);
    }
    const ear = focusBlocks('pitch', 30, blocks, COURSE_AREAS.ear);
    expect(total(ear)).toBe(30);
    expect(ear.some((x) => x.target.kind === 'area' && x.target.area === 'pitch')).toBe(true);
  });
});

// SPEC-PRACTICE-SESSION §4, §6, §11: the rewards wired into progress, the run, the lessons and the month review.
import { describe, expect, it } from 'vitest';
import { drillGains, emptyProgress, mergeRewards, momentumOf, practiceWeeks, weeklyBonuses, withBonuses, withSessionRecord, withWeekGains, type Progress } from '../src/storage/progress';
import { plusFive, plusFiveOffer, startRun, nextBlock, type Block } from '../src/engine/workout2';
import { sessionRecordOf, type SessionRecord } from '../src/engine/practiceSession';
import { bookTime, emptyLedger } from '../src/engine/practiceTime';
import { cellBonus, recordBonus, sessionBonus } from '../src/engine/momentum';
import { stretchBase } from '../src/engine/session';
import { monthPractice } from '../src/engine/stats';
import type { ItemState } from '../src/engine/drills/types';
import type { Question } from '../src/engine/lesson';

const item = (o: Partial<ItemState>): ItemState => ({ itemId: 'x', family: 'scales' as ItemState['family'], key: 0, hands: 'R', cleanBpm: 0, goalBpm: 60, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 }, takes: 0, last: '2026-11-20T10:00:00Z', history: [], ...o });
const rec = (o: Partial<SessionRecord>): SessionRecord => ({ id: 's1', day: '2026-11-24', course: 'keys', focus: 'plan', plannedMin: 30, activeMs: 30 * 60000, blocks: [], finished: true, ...o });

describe('§11.4 weekly gains from a drill take', () => {
  it('a new clean best is a record; a step up the status ladder is a status up', () => {
    const prev = item({ cleanBpm: 80, takes: 3, targetBpm: 120, history: [{ at: '2026-11-20T10:00:00Z', bpm: 80, cv: 0 }] });
    const next = item({ cleanBpm: 118, takes: 4, targetBpm: 120, history: [...prev.history, { at: '2026-11-24T10:00:00Z', bpm: 118, cv: 0 }] });
    expect(drillGains(prev, next)).toEqual({ records: 1, statusUps: 1 }); // learning → almost (near the target)
    expect(drillGains(undefined, item({ takes: 1, targetBpm: 120 }))).toEqual({ records: 0, statusUps: 1 }); // new → learning
  });
  it('adds into the week of the day (Monday key), skipping zeros', () => {
    let p = withWeekGains(emptyProgress(), '2026-11-26', { records: 1, cells: 0 });
    p = withWeekGains(p, '2026-11-24', { records: 2, cells: 1 });
    expect(p.weekGains).toEqual({ '2026-11-23': { records: 3, cells: 1 } });
    expect(withWeekGains(p, '2026-11-24', { records: 0 })).toBe(p);
  });
});

describe('§11.4 bonuses in progress', () => {
  it('each key once, the weekly limit per kind', () => {
    const w = '2026-11-23';
    const a = withBonuses(emptyProgress(), [recordBonus('x', 100, w), cellBonus('major:0:scales-1', w)]);
    expect(a.xp).toBe(25);
    const b = withBonuses(a.p, [recordBonus('x', 100, w)]);
    expect(b.xp).toBe(0);
    expect(b.p).toBe(a.p);
  });
  it('a session at its planned length pays +10, a shorter one nothing', () => {
    expect(sessionBonus(rec({}), '2026-11-23')?.xp).toBe(10);
    expect(sessionBonus(rec({ activeMs: 20 * 60000 }), '2026-11-23')).toBeNull();
  });
  it('merge on a sync rebuild: paid by key, gains and Momentum by the larger', () => {
    const local: Progress = { ...emptyProgress(), paidBonuses: [recordBonus('x', 90, '2026-11-23')], weekGains: { '2026-11-23': { records: 2 } }, momentumWeeks: { '2026-11-16': 70 }, raiseAskedOn: '2026-11-01' };
    const rebuilt: Progress = { ...emptyProgress(), paidBonuses: [cellBonus('c', '2026-11-23')], weekGains: { '2026-11-23': { records: 1, cells: 1 } }, momentumWeeks: { '2026-11-16': 80 } };
    const m = mergeRewards(local, rebuilt);
    expect(m.paidBonuses?.map((b) => b.key).sort()).toEqual(['cell:c', 'record:x@90']);
    expect(m.weekGains).toEqual({ '2026-11-23': { records: 2, cells: 1 } });
    expect(m.momentumWeeks).toEqual({ '2026-11-16': 80 });
    expect(m.raiseAskedOn).toBe('2026-11-01');
  });
});

describe('§11.4 Momentum from progress and the ledger', () => {
  it('days and minutes per week; last week scored for the boost; the weekly goal bonus when both are met', () => {
    let l = emptyLedger('2026-11-01');
    const days = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-23', '2026-11-24'];
    for (const d of days) l = bookTime(l, d, { kind: 'technique', q: 'edge' }, 30 * 60000);
    const p: Progress = { ...emptyProgress(), stats: { days, goodSessions: 0, xpByDay: {} } };
    const w = practiceWeeks(p, l, '2026-11-24', 2);
    expect(w).toEqual([
      { week: '2026-11-16', days: 5, ms: 150 * 60000 },
      { week: '2026-11-23', days: 2, ms: 60 * 60000 },
    ]);
    const goals = { daysGoal: 5, minutesGoal: 150 };
    const mo = momentumOf(p, l, goals, '2026-11-24');
    expect(mo.now.persistence).toBeCloseTo(25 * (2 / 5) + 25 * (60 / 150), 1);
    expect(mo.last).toBeGreaterThanOrEqual(50); // last week: days and minutes met
    expect(weeklyBonuses(w, goals)[0]).toBeNull();
    const lastWeek = practiceWeeks(p, l, '2026-11-22', 1);
    expect(weeklyBonuses(lastWeek, goals)[0]?.key).toBe('weekGoal:2026-11-16');
  });
});

describe('§4 +5 min at the end and the session record', () => {
  const blocks: Block[] = [
    { id: 'w', target: { kind: 'warmup' }, minutes: 3 },
    { id: 't', target: { kind: 'keys' }, minutes: 15 },
    { id: 'i', target: { kind: 'improv' }, minutes: 8 },
  ];
  it('offered when the last block ran out on its own, once; adds the largest working block for 5 minutes', () => {
    const r0 = { ...startRun('2026-11-24', blocks, { id: 'run1', course: 'keys' }), at: 2 };
    const done = { ...nextBlock(r0), between: 'i' };
    expect(plusFiveOffer(done)).toBe(true);
    expect(plusFiveOffer({ ...done, between: undefined })).toBe(false); // "End" early: straight to the end screen
    const more = plusFive(done);
    expect(more.finished).toBe(false);
    expect(more.at).toBe(3);
    expect(more.blocks[3]).toEqual({ id: 't+5', target: { kind: 'keys' }, minutes: 5 });
    expect(more.between).toBeUndefined();
    expect(plusFiveOffer({ ...nextBlock(more), between: 't+5' })).toBe(false);
  });
  it('the same session again after +5 replaces its record; the totals move by the difference; the before stays', () => {
    const p1 = withSessionRecord(emptyProgress(), rec({ activeMs: 30 * 60000 }));
    expect(p1.sessionEnd).toEqual({ id: 's1' });
    const p2 = withSessionRecord(p1, rec({ activeMs: 35 * 60000 }));
    expect(p2.sessions).toHaveLength(1);
    expect(p2.sessionTotals).toMatchObject({ finished: 1, totalMs: 35 * 60000, longestMs: 35 * 60000 });
    expect(p2.sessionEnd).toEqual({ id: 's1' });
    expect(withSessionRecord(p2, rec({ activeMs: 20 * 60000 }))).toBe(p2);
  });
  it('the record carries the stretch minutes of the run', () => {
    const r = { ...startRun('2026-11-24', blocks, { id: 'run1', course: 'keys' }), used: { t: 600000 }, bandMs: { stretch: 240000, work: 300000, comfort: 60000 }, finished: true };
    expect(sessionRecordOf(r, { course: 'keys' }).stretchMs).toBe(240000);
  });
});

describe('§11.3 an answer by the Elo expected score', () => {
  const q = { kind: 'interval', difficulty: 1000 } as unknown as Question;
  it('expected ≥ 95 % pays ×0.5, under 60 % ×1.3, no rating: as before', () => {
    expect(stretchBase({ ratings: { intervals: 1600 } }, { ...q, skillAs: 'intervals' } as Question, 10)).toBe(5);
    expect(stretchBase({ ratings: { intervals: 800 } }, { ...q, skillAs: 'intervals' } as Question, 10)).toBe(13);
    expect(stretchBase({ ratings: { intervals: 1200 } }, { ...q, skillAs: 'intervals' } as Question, 10)).toBe(10);
    expect(stretchBase({}, q, 10)).toBe(10);
  });
});

describe('§6 the month review: minutes, average and longest session', () => {
  it('with the change from last month', () => {
    const d = (ms: number) => ({ items: 1, correct: 1, ms, xp: 0, sessions: 1, byArea: {}, bySkill: {} });
    const days = { '2026-10-03': d(40 * 60000), '2026-11-02': d(50 * 60000), '2026-11-09': d(30 * 60000) } as never;
    const sessions = [rec({ day: '2026-10-03', activeMs: 20 * 60000 }), rec({ day: '2026-11-02', activeMs: 30 * 60000 }), rec({ day: '2026-11-09', activeMs: 40 * 60000 }), rec({ day: '2026-11-10', activeMs: 50 * 60000, finished: false })];
    const m = monthPractice(days, sessions, '2026-11');
    expect(m).toEqual({ minutes: 80, prevMinutes: 40, avgMin: 35, prevAvgMin: 20, longestMin: 40, prevLongestMin: 20 });
    expect(monthPractice(days, [], '2026-10')).toMatchObject({ prevMinutes: null, avgMin: null });
  });
});

// SPEC-PRACTICE-SESSION §11.4: Momentum (persistence + progress against the player's own pace) and its bonuses, paid once.
import { describe, expect, it } from 'vitest';
import { boostFor, cellBonus, DEFAULT_PACE, fourWeeksBonus, gainPoints, keyBonus, mergePaid, MIN_PACE, momentum, ownPace, payBonuses, promotionBonus, recordBonus, sessionBonus, weekGoalBonus, WEEKLY_LIMIT } from '../src/engine/momentum';

const W = '2026-11-23';

describe('momentum', () => {
  it('persistence: days and minutes, 25 each', () => {
    const m = momentum({ days: 5, daysGoal: 5, minutes: 150, minutesGoal: 150, gains: {}, trailing: [] });
    expect(m.persistence).toBe(50);
    expect(m.progress).toBe(0);
    expect(m.score).toBe(50);
    expect(momentum({ days: 2, daysGoal: 4, minutes: 75, minutesGoal: 150, gains: {}, trailing: [] }).persistence).toBe(25);
  });
  it('progress is measured against the player own pace: a beginner and a pro can both fill it', () => {
    const beginner = momentum({ days: 5, daysGoal: 5, minutes: 150, minutesGoal: 150, gains: { records: 3, statusUps: 2 }, trailing: [{ gains: { records: 2, statusUps: 2 }, practised: true }] });
    const pro = momentum({ days: 5, daysGoal: 5, minutes: 150, minutesGoal: 150, gains: { cells: 10, records: 20 }, trailing: [{ gains: { cells: 10, records: 20 }, practised: true }] });
    expect(beginner.score).toBe(100);
    expect(pro.score).toBe(100);
    // the pro at the beginner's numbers is far from full
    expect(momentum({ days: 5, daysGoal: 5, minutes: 150, minutesGoal: 150, gains: { records: 3, statusUps: 2 }, trailing: [{ gains: { cells: 10, records: 20 }, practised: true }] }).progress).toBeLessThan(10);
  });
  it('the pace: default without history, weeks without practice skipped, a floor', () => {
    expect(ownPace([])).toBe(DEFAULT_PACE);
    expect(ownPace([{ gains: {}, practised: false }])).toBe(DEFAULT_PACE);
    expect(ownPace([{ gains: { records: 1 }, practised: true }])).toBe(MIN_PACE);
    expect(ownPace([{ gains: { cells: 4 }, practised: true }, { gains: {}, practised: false }, { gains: { cells: 2 }, practised: true }])).toBe(9);
    expect(gainPoints({ records: 1, cells: 1, keys: 1, statusUps: 1, rating: 10, promotions: 1 })).toBe(1 + 3 + 6 + 1 + 1 + 8);
    expect(gainPoints({ rating: -50 })).toBe(0);
  });
  it('clamped to 0–100', () => {
    const m = momentum({ days: 9, daysGoal: 5, minutes: 999, minutesGoal: 150, gains: { keys: 50 }, trailing: [] });
    expect(m.score).toBe(100);
    expect(momentum({ days: 0, daysGoal: 5, minutes: 0, minutesGoal: 150, gains: {}, trailing: [] }).score).toBe(0);
  });
  it('the boost: +10 % after a week at ≥ 80, read from last week only (never compounding)', () => {
    expect(boostFor(80)).toBe(0.1);
    expect(boostFor(79)).toBe(0);
    expect(boostFor(null)).toBe(0);
    expect(boostFor(100)).toBe(0.1);
  });
});

describe('bonuses', () => {
  const rec = { day: '2026-11-24', course: 'keys', plannedMin: 30, activeMs: 30 * 60000, finished: true };
  it('a session at its planned length: +10; shorter or unfinished: nothing', () => {
    expect(sessionBonus(rec, W)).toMatchObject({ xp: 10, key: 'session:2026-11-24:keys' });
    expect(sessionBonus({ ...rec, activeMs: 29 * 60000 }, W)).toBeNull();
    expect(sessionBonus({ ...rec, finished: false }, W)).toBeNull();
  });
  it('the weekly goal: days AND minutes', () => {
    expect(weekGoalBonus(W, { days: 5, daysGoal: 5, minutes: 150, minutesGoal: 150 })?.xp).toBe(100);
    expect(weekGoalBonus(W, { days: 4, daysGoal: 5, minutes: 300, minutesGoal: 150 })).toBeNull();
    expect(weekGoalBonus(W, { days: 5, daysGoal: 5, minutes: 149, minutesGoal: 150 })).toBeNull();
  });
  it('four full weeks in a row: +200, once per 4 weeks', () => {
    const wk = (i: number, days: number) => ({ week: `w${i}`, days, daysGoal: 5 });
    expect(fourWeeksBonus([wk(1, 5), wk(2, 5), wk(3, 5)])).toBeNull();
    expect(fourWeeksBonus([wk(1, 5), wk(2, 5), wk(3, 5), wk(4, 6)])?.xp).toBe(200);
    expect(fourWeeksBonus([wk(1, 5), wk(2, 5), wk(3, 5), wk(4, 5), wk(5, 5)])).toBeNull();
    expect(fourWeeksBonus([wk(1, 5), wk(2, 5), wk(3, 5), wk(4, 5), wk(5, 5), wk(6, 5), wk(7, 5), wk(8, 5)])?.key).toBe('fourWeeks:w8');
    expect(fourWeeksBonus([wk(1, 5), wk(2, 4), wk(3, 5), wk(4, 5), wk(5, 5)])).toBeNull();
  });
  it('the fixed amounts', () => {
    expect(recordBonus('i', 96, W).xp).toBe(5);
    expect(cellBonus('major:0:triads', W).xp).toBe(20);
    expect(keyBonus('major:0', W).xp).toBe(50);
    expect(promotionBonus('keys', 'r3', W).xp).toBe(100);
  });
  it('idempotent: a key is paid once, also across calls', () => {
    const a = payBonuses([], [sessionBonus(rec, W), sessionBonus(rec, W), cellBonus('c1', W)]);
    expect(a.xp).toBe(30);
    expect(a.now).toHaveLength(2);
    const b = payBonuses(a.paid, [sessionBonus(rec, W), cellBonus('c1', W), cellBonus('c2', W), null]);
    expect(b.xp).toBe(20);
    expect(b.paid).toHaveLength(3);
  });
  it('weekly limits per kind', () => {
    const many = Array.from({ length: 30 }, (_, i) => recordBonus(`i${i}`, 100, W));
    const r = payBonuses([], many);
    expect(r.now).toHaveLength(WEEKLY_LIMIT.record);
    expect(r.xp).toBe(WEEKLY_LIMIT.record * 5);
    // a new week has its own limit
    const next = payBonuses(r.paid, [recordBonus('x', 100, '2026-11-30')]);
    expect(next.xp).toBe(5);
  });
  it('mergePaid: union by key', () => {
    const a = payBonuses([], [cellBonus('c1', W)]).paid;
    const b = payBonuses([], [cellBonus('c1', W), cellBonus('c2', W)]).paid;
    expect(mergePaid(a, b).map((p) => p.key).sort()).toEqual(['cell:c1', 'cell:c2']);
  });
});

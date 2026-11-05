import { describe, expect, it } from 'vitest';
import { addDays, canBuy, gemsEarned, gemsSpent, MILESTONES, streakState, type Purchase } from '../src/engine/streak';

const run = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));
// 2026-11-02 is a Monday.
const MON = '2026-11-02';

describe('streak 2.0', () => {
  it('counts consecutive practice days; today unpractised does not break it yet', () => {
    const st = streakState(run(MON, 3), [], addDays(MON, 3));
    expect(st.count).toBe(3);
    expect(st.practicedToday).toBe(false);
    expect(streakState(run(MON, 4), [], addDays(MON, 3)).practicedToday).toBe(true);
  });
  it('a weekly free freeze covers one missed day; two missed days break the streak', () => {
    // Mon–Wed practised, Thu missed, Fri practised (today Fri).
    const days = [...run(MON, 3), addDays(MON, 4)];
    const st = streakState(days, [], addDays(MON, 4));
    expect(st.count).toBe(4);
    expect(st.freezeDays).toEqual([addDays(MON, 3)]);
    expect(st.freezes).toBe(0);
    const broken = streakState([...run(MON, 3), addDays(MON, 5)], [], addDays(MON, 5));
    expect(broken.count).toBe(1);
  });
  it('a free freeze arrives every Monday, up to two equipped', () => {
    const st = streakState(run(MON, 15), [], addDays(MON, 14));
    expect(st.freezes).toBe(2); // weeks 1, 2 and 3 → capped at 2
  });
  it('a bought freeze adds to the free one (max two)', () => {
    const p: Purchase[] = [{ id: 'a', kind: 'freeze', day: addDays(MON, 1) }];
    const days = [...run(MON, 3), addDays(MON, 6)]; // Thu + Fri + Sat missed? no: Thu, Fri, Sat missed (3) — two freezes cover two
    const st = streakState(days, p, addDays(MON, 6));
    expect(st.freezeDays).toHaveLength(2);
    expect(st.count).toBe(1); // the third missed day broke it
  });
  it('repair within 48 h restores the lost streak; later it is too late', () => {
    // 10 days practised (two Mondays → two free freezes), then 3 missed: two covered, the third breaks it.
    const days = run(MON, 10);
    const today = addDays(MON, 13);
    const before = streakState(days, [], today);
    expect(before.count).toBe(0);
    expect(before.freezeDays).toEqual([addDays(MON, 10), addDays(MON, 11)]);
    expect(before.repairable).toEqual({ lost: 10, brokeOn: addDays(MON, 12) });
    const after = streakState([...days, today], [{ id: 'r', kind: 'repair', day: today }], today);
    expect(after.count).toBe(11);
    expect(after.repairedDays).toContain(addDays(MON, 12));
    expect(streakState(days, [], addDays(MON, 16)).repairable).toBeNull();
  });
  it('milestones and the next one', () => {
    const st = streakState(run(MON, 8), [], addDays(MON, 7));
    expect(st.milestones.map((m) => m.days)).toEqual([3, 7]);
    expect(st.next).toEqual({ days: 14, left: 6 });
    expect(MILESTONES[0]).toBe(3);
  });
  it('gems: earned from effort, spent on freezes and repairs; purchases are checked', () => {
    const earned = gemsEarned({ goodSessions: 10, goalDays: 3, puzzleGold: 1, puzzleSilver: 1, dailyPlays: 2, milestones: [3, 7] });
    expect(earned).toBe(50 + 30 + 20 + 10 + 10 + 50);
    expect(gemsSpent([{ id: 'a', kind: 'freeze', day: MON }])).toBe(200);
    const st = streakState(run(MON, 2), [], addDays(MON, 1));
    expect(canBuy('freeze', 199, st)).toBe(false);
    expect(canBuy('freeze', 200, st)).toBe(true);
    expect(canBuy('repair', 1000, st)).toBe(false);
  });
});

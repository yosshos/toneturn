// SPEC-PRACTICE-SESSION §5 / §6: the end screen's content — milestones (one big, two small, only what was reached), the
// ring and totals, the stretch split, the ONE graph by priority (never a falling line), the raise-the-goal question; and
// the SessionEnd component rendered from it.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { bookTime, emptyLedger, type PracticeLedger } from '../src/engine/practiceTime';
import type { SessionRecord, SessionTotals } from '../src/engine/practiceSession';
import { chooseGraph, headlineLine, milestonesOf, milestoneText, pickMilestones, raiseGoalAsk, risingTail, runningBest, sessionReward, tomorrowText, type Milestone, type RewardInput } from '../src/engine/sessionReward';
import { streakState } from '../src/engine/streak';
import { momentum } from '../src/engine/momentum';
import { SessionEnd } from '../src/ui/SessionEnd';

const TODAY = '2026-11-24'; // a Tuesday; the week starts 2026-11-23
const M = 60000;

const ledgerOf = (days: Record<string, number>): PracticeLedger => {
  let l = emptyLedger('2026-01-01');
  for (const [d, min] of Object.entries(days)) l = bookTime(l, d, { course: 'keys', kind: 'technique', q: 'edge' }, min * M);
  return l;
};
const rec = (day: string, min: number, x: Partial<SessionRecord> = {}): SessionRecord => ({ id: `${day}:${min}:${Math.random()}`, day, course: 'keys', focus: 'plan', plannedMin: 30, activeMs: min * M, blocks: [], finished: true, ...x });

function input(x: Partial<RewardInput> = {}): RewardInput {
  const r = x.rec ?? rec(TODAY, 30);
  const before: SessionTotals = { finished: 5, totalMs: 3 * 3600000, longestMs: 40 * M, bestWeek: { week: '2026-11-02', ms: 500 * M }, bestMonth: { month: '2026-10', ms: 2000 * M } };
  return {
    today: TODAY,
    rec: r,
    sessions: [r],
    totalsBefore: before,
    totalsAfter: { ...before, finished: before.finished + 1, totalMs: before.totalMs + r.activeMs },
    ledger: ledgerOf({ [TODAY]: 30 }),
    weeklyGoalMin: 150,
    dailyMin: 30,
    ...x,
  };
}

describe('milestones', () => {
  it('nothing reached: no milestone at all', () => {
    const m = milestonesOf(input());
    expect(m).toEqual([]);
    expect(pickMilestones(m)).toEqual({ big: null, small: [] });
  });
  it('total time: the threshold crossed (5 h is big, 1 h small)', () => {
    const r = rec(TODAY, 30);
    const m = milestonesOf(input({ rec: r, totalsBefore: { finished: 3, totalMs: 4.8 * 3600000, longestMs: 60 * M }, totalsAfter: { finished: 4, totalMs: 5.3 * 3600000, longestMs: 60 * M } }));
    expect(m[0]).toMatchObject({ kind: 'hours', value: 5, big: true });
    const one = milestonesOf(input({ totalsBefore: { finished: 1, totalMs: 40 * M, longestMs: 40 * M }, totalsAfter: { finished: 2, totalMs: 70 * M, longestMs: 40 * M } }));
    expect(one.find((x) => x.kind === 'hours')).toMatchObject({ value: 1, big: false });
  });
  it('sessions: the first is big; 10 small; 25 big', () => {
    expect(milestonesOf(input({ totalsBefore: undefined, totalsAfter: { finished: 1, totalMs: 30 * M, longestMs: 30 * M } })).find((x) => x.kind === 'sessions')).toMatchObject({ value: 1, big: true });
    expect(milestonesOf(input({ totalsBefore: { finished: 9, totalMs: 0, longestMs: 40 * M }, totalsAfter: { finished: 10, totalMs: 30 * M, longestMs: 40 * M } })).find((x) => x.kind === 'sessions')).toMatchObject({ value: 10, big: false });
    expect(milestonesOf(input({ totalsBefore: { finished: 24, totalMs: 0, longestMs: 40 * M }, totalsAfter: { finished: 25, totalMs: 30 * M, longestMs: 40 * M } })).find((x) => x.kind === 'sessions')?.big).toBe(true);
  });
  it('the streak milestone reached today (streak.ts)', () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-11-${18 + i}`);
    const st = streakState(days, [], TODAY);
    expect(milestonesOf(input({ streak: st })).find((x) => x.kind === 'streak')).toMatchObject({ value: 7, big: true });
    const st8 = streakState(['2026-11-17', ...days], [], TODAY);
    expect(milestonesOf(input({ streak: st8 })).find((x) => x.kind === 'streak')).toBeUndefined();
  });
  it('records: longest session, best week, best month — only against an earlier record', () => {
    const r = rec(TODAY, 45);
    const m = milestonesOf(input({ rec: r, totalsAfter: { finished: 6, totalMs: 0, longestMs: 45 * M, bestWeek: { week: '2026-11-23', ms: 600 * M }, bestMonth: { month: '2026-11', ms: 2100 * M } } }));
    expect(m.map((x) => x.kind)).toEqual(expect.arrayContaining(['longest', 'bestWeek', 'bestMonth']));
    // already this week's record before this session: not again
    const again = milestonesOf(input({ rec: r, totalsBefore: { finished: 6, totalMs: 0, longestMs: 50 * M, bestWeek: { week: '2026-11-23', ms: 500 * M } }, totalsAfter: { finished: 7, totalMs: 0, longestMs: 50 * M, bestWeek: { week: '2026-11-23', ms: 545 * M } } }));
    expect(again).toEqual([]);
    // the first session is never a "record"
    expect(milestonesOf(input({ totalsBefore: undefined, totalsAfter: { finished: 1, totalMs: 30 * M, longestMs: 30 * M, bestWeek: { week: '2026-11-23', ms: 30 * M } } })).map((x) => x.kind)).toEqual(['sessions']);
  });
  it('the average session: shown only when up ≥ 2 min on last week', () => {
    const r = rec(TODAY, 30);
    const last = [rec('2026-11-17', 25), rec('2026-11-18', 27)];
    const up = milestonesOf(input({ rec: r, sessions: [...last, r] }));
    expect(up.find((x) => x.kind === 'average')).toMatchObject({ value: 30, from: 26 });
    const flat = milestonesOf(input({ rec: r, sessions: [rec('2026-11-17', 29), r] }));
    expect(flat.find((x) => x.kind === 'average')).toBeUndefined();
  });
  it('the weekly goal reached by this session', () => {
    const r = rec(TODAY, 30);
    const m = milestonesOf(input({ rec: r, ledger: ledgerOf({ '2026-11-23': 130, [TODAY]: 30 }) }));
    expect(m.find((x) => x.kind === 'weekGoal')).toBeTruthy();
    // reached before this session: not again
    expect(milestonesOf(input({ rec: r, ledger: ledgerOf({ '2026-11-23': 160, [TODAY]: 30 }) })).find((x) => x.kind === 'weekGoal')).toBeUndefined();
  });
  it('skill: a key filled is big, an item closed is a chip', () => {
    const m = milestonesOf(input({ keysFilledToday: [{ he: 'מי במול מז׳ור', en: 'E♭ major' }], closedToday: [{ he: 'משולשים', en: 'Triads' }] }));
    const p = pickMilestones(m);
    expect(p.big?.kind).toBe('keyFilled');
    expect(p.small.map((x) => x.kind)).toEqual(['itemClosed']);
  });
  it('at most one big and two small', () => {
    const all: Milestone[] = [
      { kind: 'keyFilled', value: 1, rank: 90, big: true },
      { kind: 'hours', value: 10, rank: 71, big: true },
      { kind: 'streak', value: 30, rank: 67, big: true },
      { kind: 'weekGoal', value: 150, rank: 40, big: false },
    ];
    const p = pickMilestones(all);
    expect(p.big?.kind).toBe('keyFilled');
    expect(p.small.map((x) => x.kind)).toEqual(['hours', 'streak']);
    // no big-capable milestone: chips only
    expect(pickMilestones([{ kind: 'average', value: 30, from: 25, rank: 30, big: false }])).toMatchObject({ big: null, small: [{ kind: 'average' }] });
  });
  it('every milestone has a calm line in both languages', () => {
    const kinds: Milestone[] = (['hours', 'sessions', 'streak', 'longest', 'bestWeek', 'bestMonth', 'average', 'weekGoal', 'itemClosed', 'keyFilled'] as const).map((k) => ({ kind: k, value: 5, from: 3, name: { he: 'א', en: 'A' }, rank: 0, big: false }));
    for (const m of kinds) {
      const t = milestoneText(m);
      expect(t.he.length).toBeGreaterThan(2);
      expect(t.en.length).toBeGreaterThan(2);
      expect(t.he + t.en).not.toMatch(/!/);
    }
  });
});

describe('the one graph: priority, never falling', () => {
  const pts = (vs: number[], days?: string[]) => vs.map((v, i) => ({ day: days?.[i] ?? `2026-11-${String(10 + i).padStart(2, '0')}`, v }));
  it('1. improvement today: the running best, today raised it', () => {
    const g = chooseGraph({ ...input(), improvement: { name: { he: 'משולשים', en: 'Triads' }, unit: 'bpm', pts: pts([72, 70, 76, 74, 88], ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-22', TODAY]) } });
    expect(g.kind).toBe('improvement');
    if (g.kind !== 'improvement') return;
    expect(g.pts.map((p) => p.v)).toEqual([72, 72, 76, 76, 88]);
    expect([g.from, g.to]).toEqual([72, 88]);
  });
  it('improvement not raised today falls through', () => {
    const g = chooseGraph({ ...input(), improvement: { name: { he: 'א', en: 'A' }, unit: 'bpm', pts: pts([72, 88, 80], ['2026-11-18', '2026-11-19', TODAY]) } });
    expect(g.kind).not.toBe('improvement');
  });
  it('2. minutes up: this week through today above last week through the same weekday', () => {
    const g = chooseGraph({ ...input(), ledger: ledgerOf({ '2026-11-16': 10, '2026-11-17': 10, '2026-11-20': 60, '2026-11-23': 20, [TODAY]: 30 }) });
    expect(g.kind).toBe('minutes');
    if (g.kind !== 'minutes') return;
    expect(g.days).toHaveLength(7);
    expect(g.days[1]).toEqual({ day: TODAY, min: 30 });
    expect(g.lastWeekAvgMin).toBe(11);
  });
  it('3. average session up: the rising tail only', () => {
    const sessions = [rec('2026-11-03', 30), rec('2026-11-10', 20), rec('2026-11-17', 24), rec(TODAY, 28)];
    const g = chooseGraph({ ...input(), sessions, ledger: ledgerOf({ '2026-11-16': 60, '2026-11-17': 60, [TODAY]: 28 }) });
    expect(g.kind).toBe('average');
    if (g.kind !== 'average') return;
    expect(g.pts.map((p) => p.v)).toEqual([20, 24, 28]);
  });
  it('4. otherwise the streak calendar (5 weeks)', () => {
    const g = chooseGraph({ ...input(), ledger: ledgerOf({ '2026-11-16': 60, '2026-11-17': 60, [TODAY]: 20, '2026-10-01': 30 }) });
    expect(g).toMatchObject({ kind: 'calendar', weeks: 5 });
    if (g.kind !== 'calendar') return;
    expect(Object.keys(g.days).sort()).toEqual(['2026-11-16', '2026-11-17', TODAY]);
  });
  it('never a falling line: every line graph is non-decreasing', () => {
    for (let s = 0; s < 200; s++) {
      const vs = Array.from({ length: 10 }, (_, i) => 60 + ((s * 7 + i * 13) % 31));
      const days = vs.map((_, i) => (i === 9 ? TODAY : `2026-11-${String(10 + i).padStart(2, '0')}`));
      const sessions = vs.slice(0, 8).map((v, i) => rec(`2026-${i < 4 ? '10' : '11'}-${String(5 + (i % 4) * 7).padStart(2, '0')}`, v / 3));
      const g = chooseGraph({ ...input(), sessions: [...sessions, rec(TODAY, (s % 40) + 1)], improvement: { name: { he: 'א', en: 'A' }, unit: 'bpm', pts: pts(vs, days) } });
      if (g.kind === 'improvement' || g.kind === 'average') for (let i = 1; i < g.pts.length; i++) expect(g.pts[i].v).toBeGreaterThanOrEqual(g.pts[i - 1].v);
    }
    expect(risingTail(pts([5, 4, 3]))).toBeNull();
    expect(risingTail(pts([5, 3, 4, 6]))?.map((p) => p.v)).toEqual([3, 4, 6]);
    expect(runningBest(pts([3, 1, 4, 2])).map((p) => p.v)).toEqual([3, 3, 4, 4]);
  });
});

describe('the reward', () => {
  it('ring, totals, stretch split, tomorrow', () => {
    const r = rec(TODAY, 32);
    const out = sessionReward(input({ rec: r, ledger: ledgerOf({ '2026-11-10': 40, '2026-11-17': 20, '2026-11-23': 30, [TODAY]: 32, '2026-02-01': 60 }), stretchMs: 18 * M, tomorrow: { minutes: 30, first: { he: 'סולם לה במול מז׳ור', en: 'the A♭ major scale' } }, parts: [{ he: 'טכניקה', en: 'technique' }] }));
    expect(out.minutes).toBe(32);
    expect(out.ring).toEqual({ nowMin: 62, goalMin: 150, lastWeekMin: 20, upMin: 42 });
    expect(Math.round(out.totals.weekMs / M)).toBe(62);
    expect(Math.round(out.totals.monthMs / M)).toBe(122);
    expect(Math.round(out.totals.yearMs / M)).toBe(182);
    expect(out.stretch).toEqual({ stretchMin: 18, totalMin: 32 });
    expect(tomorrowText(out.tomorrow!).en).toBe('Tomorrow: 30 min · starts with the A♭ major scale');
    expect(headlineLine(out.parts).en).toBe('Practice done: technique');
  });
  it('the ring shows ▲ only when up', () => {
    const out = sessionReward(input({ ledger: ledgerOf({ '2026-11-17': 200, [TODAY]: 30 }) }));
    expect(out.ring.upMin).toBeNull();
  });
  it('§6 raise the goal: 3 full weeks in a row, then not again for 3 weeks', () => {
    const wk = (ms: number[]) => ms.map((m, i) => ({ week: `w${i}`, ms: m * M }));
    expect(raiseGoalAsk(wk([150, 160, 151]), 150, 30, TODAY)).toEqual({ to: 35 });
    expect(raiseGoalAsk(wk([150, 140, 151]), 150, 30, TODAY)).toBeNull();
    expect(raiseGoalAsk(wk([160, 151]), 150, 30, TODAY)).toBeNull();
    expect(raiseGoalAsk(wk([150, 160, 151]), 150, 30, TODAY, '2026-11-10')).toBeNull();
    expect(raiseGoalAsk(wk([150, 160, 151]), 150, 30, TODAY, '2026-11-01')).toEqual({ to: 35 });
    expect(raiseGoalAsk(wk([999, 999, 999]), 150, 180, TODAY)).toBeNull();
    const l = ledgerOf({ '2026-11-02': 150, '2026-11-09': 150, '2026-11-16': 150, [TODAY]: 30 });
    expect(sessionReward(input({ ledger: l })).raiseGoal).toEqual({ to: 35 });
  });
});

describe('SessionEnd renders', () => {
  const reward = sessionReward(
    input({
      totalsBefore: { finished: 9, totalMs: 4.9 * 3600000, longestMs: 40 * M },
      totalsAfter: { finished: 10, totalMs: 5.4 * 3600000, longestMs: 40 * M },
      stretchMs: 12 * M,
      tomorrow: { minutes: 30 },
      parts: [{ he: 'טכניקה', en: 'technique' }, { he: 'אלתור', en: 'improv' }],
      ledger: ledgerOf({ '2026-11-17': 10, [TODAY]: 30 }),
    }),
  );
  const mo = momentum({ days: 2, daysGoal: 5, minutes: 40, minutesGoal: 150, gains: { records: 2 }, trailing: [] });
  for (const lang of ['he', 'en'] as const) {
    it(`in ${lang}: headline, milestone, rings, totals, graph, actions; no emoji, no "!"`, () => {
      const html = renderToStaticMarkup(h(SessionEnd, { lang, reward, momentum: mo, onShare: () => {}, onDone: () => {}, feedback: h('div', { className: 'fb' }, 'fb') }));
      expect(html).toContain('data-session-end="30"');
      expect(html).toContain('>30</b>'); // the minutes, final at once on the server
      expect(html).toContain('data-milestone="hours"');
      expect(html).toContain('data-milestone="sessions"');
      expect(html).toContain('data-week-ring="30/150"');
      expect(html).toContain(`data-momentum="${mo.score}"`);
      expect(html).toContain('data-graph-kind="minutes"');
      expect(html).toContain('class="fb"');
      expect(html).toContain(lang === 'he' ? 'מחוץ לאזור הנוחות' : 'outside your comfort zone');
      expect(html).toContain(lang === 'he' ? 'סיום' : 'Done');
      const text = html.replace(/<[^>]+>/g, ' ');
      expect(text).not.toMatch(/!/);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    });
  }
});

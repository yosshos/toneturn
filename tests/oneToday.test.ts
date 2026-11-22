// BUILD-PLAN-2026-11 phase 2 ("one today"): the daily workout is the single plan (D2), its technique block draws from
// the key × exercise matrix (D3), the coach runs as long as the block, the plateau cooldown, the 180-minute window, the
// "why today" reasons, the teacher's section (added, spread or all today) and counting practice from anywhere.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { buildPath, type PathInput } from '../src/engine/path';
import { families, itemTargetBpm, specDrills, familyById } from '../src/engine/drills/plan';
import { newItem } from '../src/engine/drills/ladder';
import type { ItemState, TakeMetrics } from '../src/engine/drills/types';
import { cellItemIds, cellKey, fillMinutes, keyMatrix, matrixOrder, matrixSummary, type MatrixCell } from '../src/engine/drills/keyMatrix';
import { freezePlan, planFamily, thawPlan, todayTechPlan, weekKeyFromMatrix, whyCounts, MAINT_SHARE } from '../src/engine/drills/todayPlan';
import { COOLDOWN_DAYS, coolingDown, withCeiling } from '../src/engine/drills/itemStatus';
import { coachAfter, coachStart, coachTake, PLATEAU_TAKES, SESSION_MIN } from '../src/engine/drills/coach';
import { ASSIGN_MIN, creditBlock, DAY_SHARES, improvMode, LIMITS, rescale, startRun, suggestWorkout, teacherToday, techBlockOf, total, whyOf, withTeacher, type Block } from '../src/engine/workout2';

const fams = families('piano');
const DAY = '2026-11-22';
const closeCell = (c: MatrixCell, items: Record<string, ItemState>, last = '2026-11-20') => {
  for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 6, cleanBpm: itemTargetBpm(d), last, passLog: ['2026-11-19', '2026-11-20', '2026-11-20'].map((at) => ({ at, bpm: itemTargetBpm(d) })) };
};
const playCell = (c: MatrixCell, items: Record<string, ItemState>, ceiling?: { bpm: number; until: string }) => {
  for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 4, cleanBpm: d.startBpm, last: '2026-11-21', ...(ceiling ? { ceiling } : {}) };
};

describe('the plateau cooldown (BUILD-PLAN §0.2)', () => {
  it('a ceiling rests the item COOLDOWN_DAYS days, unless it was beaten since', () => {
    const st = { ...newItem(specDrills(fams[0].levels[0], 0, 'fifths-up')[0]), cleanBpm: 80, takes: 5 };
    const c = withCeiling(st, 80.4, DAY);
    expect(c.ceiling).toEqual({ bpm: 80, until: '2026-11-25' });
    expect(COOLDOWN_DAYS).toBe(3);
    expect(coolingDown(c, DAY)).toBe(true);
    expect(coolingDown(c, '2026-11-24')).toBe(true);
    expect(coolingDown(c, '2026-11-25')).toBe(false);
    expect(coolingDown({ ...c, cleanBpm: 88 }, DAY)).toBe(false);
    expect(coolingDown(st, DAY)).toBe(false);
  });
  it('a cell whose open items all rest is skipped by the views and fill, and the projection ignores it', () => {
    const items: Record<string, ItemState> = {};
    const cells0 = keyMatrix(fams, 3, items, { day: DAY });
    const target = matrixOrder(cells0, 'weak')[0];
    playCell(target, items, { bpm: 400, until: '2026-11-24' });
    const cells = keyMatrix(fams, 3, items, { day: DAY });
    const c = cells.find((x) => cellKey(x) === cellKey(target))!;
    expect(c.need.cool).toBe(true);
    for (const v of ['weak', 'key', 'exercise'] as const) expect(matrixOrder(cells, v).some((x) => cellKey(x) === cellKey(c))).toBe(false);
    expect(fillMinutes([c, ...matrixOrder(cells, 'weak')], 20).some((x) => cellKey(x) === cellKey(c))).toBe(false);
    const sumWith = matrixSummary(keyMatrix(fams, 3, items, { day: '2026-11-26' })).minutesLeft;
    expect(matrixSummary(cells).minutesLeft).toBeLessThan(sumWith);
    // after the cooldown it is back
    expect(keyMatrix(fams, 3, items, { day: '2026-11-26' }).find((x) => cellKey(x) === cellKey(target))!.need.cool).toBeUndefined();
  });
});

describe("today's technique plan from the matrix (D3)", () => {
  it('about half from the key of the week (teaching order), the rest weakest first, filled to the block', () => {
    const cells = keyMatrix(fams, 3, {}, { day: DAY });
    const plan = todayTechPlan(cells, { minutes: 30, weekRoot: 3 });
    const week = plan.filter((p) => p.why === 'week');
    const rest = plan.filter((p) => p.why === 'strengthen');
    expect(week.length).toBeGreaterThan(0);
    expect(rest.length).toBeGreaterThan(0);
    expect(week.every((p) => p.cell.root === 3 && p.cell.group === 'major')).toBe(true);
    expect(week.map((p) => p.cell.i)).toEqual([...week.map((p) => p.cell.i)].sort((a, b) => a - b));
    const wm = week.reduce((n, p) => n + p.cell.minutes, 0);
    const all = plan.reduce((n, p) => n + p.cell.minutes, 0);
    expect(wm).toBeLessThanOrEqual(15 + week[0].cell.minutes);
    expect(all).toBeLessThanOrEqual(30 + Math.max(...plan.map((p) => p.cell.minutes)));
    expect(new Set(plan.map((p) => cellKey(p.cell))).size).toBe(plan.length);
    // no review cells while nothing is closed
    expect(whyCounts(plan).review).toBe(0);
  });
  it('maintenance: closed cells revisited inside the block, the longest since played first', () => {
    const items: Record<string, ItemState> = {};
    const cells0 = keyMatrix(fams, 3, items, { day: DAY });
    const a = cells0.find((c) => c.root === 0 && c.rung === 'k-sharm-3')!;
    const b = cells0.find((c) => c.root === 7 && c.rung === 'k-sharm-3')!;
    closeCell(a, items, '2026-11-01');
    closeCell(b, items, '2026-11-20');
    const cells = keyMatrix(fams, 3, items, { day: DAY });
    const plan = todayTechPlan(cells, { minutes: 40, weekRoot: 5 });
    const rev = plan.filter((p) => p.why === 'review');
    expect(rev.length).toBeGreaterThan(0);
    expect(rev[0].cell.root).toBe(0);
    expect(plan[0].why).toBe('review');
    expect(rev.reduce((n, p) => n + p.cell.minutes, 0)).toBeLessThanOrEqual(40 * MAINT_SHARE);
  });
  it('the key of the week from the matrix: the weakest key; a frozen plan thaws to the same cells; the coach family', () => {
    const items: Record<string, ItemState> = {};
    const cells0 = keyMatrix(fams, 1, items, { day: DAY });
    // every key but D played a little → D (never played) is the weakest
    for (const c of cells0.filter((x) => x.root !== 2 && x.i <= 1)) playCell(c, items);
    const cells = keyMatrix(fams, 1, items, { day: DAY });
    expect(weekKeyFromMatrix(cells, 'major')).toBe(2);
    const plan = todayTechPlan(cells, { minutes: 20, weekRoot: 2 });
    const f = freezePlan(plan, DAY, 20);
    expect(f.items.length).toBeGreaterThan(0);
    expect(f.items).toEqual(expect.arrayContaining(cellItemIds(plan[0].cell)));
    expect(thawPlan(f, cells).map((p) => cellKey(p.cell))).toEqual(plan.map((p) => cellKey(p.cell)));
    const fam = planFamily(plan);
    expect(fam.levels.map((l) => l.level)).toEqual(plan.map((_, k) => k + 1));
  });
});

describe('the coach as long as the block, walking the plan, the ceiling (phase 2)', () => {
  const fam = familyById('scales')!;
  const order = 'fifths-up' as const;
  const mk = (v: 'clean' | 'not', bpm: number): TakeMetrics => ({ verdict: v, wrong: v === 'not' ? 2 : 0, missing: 0, hesitations: 0, accuracy: v === 'not' ? 0.8 : 1, bpm, timingSD: 28, handsAbs: null }) as unknown as TakeMetrics;
  it("the session's length is the block's minutes (default SESSION_MIN)", () => {
    const c = coachStart(fam, {}, order, 0, { noProbe: true, minutes: 40 });
    const t = coachTake(fam, c, {}, order);
    expect(coachAfter(fam, c, t, mk('clean', t.bpm), {}, order, (SESSION_MIN + 1) * 60_000).end).toBe(false);
    expect(coachAfter(fam, c, t, mk('clean', t.bpm), {}, order, 41 * 60_000).end).toBe(true);
    const d = coachStart(fam, {}, order, 0, { noProbe: true });
    expect(coachAfter(fam, d, coachTake(fam, d, {}, order), mk('clean', 60), {}, order, (SESSION_MIN + 1) * 60_000).end).toBe(true);
  });
  it('walk: today’s plan starts at the cell reached (resume), solid or not', () => {
    const cells = keyMatrix(fams, 3, {}, { day: DAY });
    const plan = todayTechPlan(cells, { minutes: 30, weekRoot: 0 });
    const pf = planFamily(plan);
    expect(coachStart(pf, {}, order, 0, { noProbe: true, walk: true, resumeAt: 2 }).step).toBe(Math.min(2, plan.length - 1));
    expect(coachStart(pf, {}, order, 0, { noProbe: true, walk: true }).step).toBe(0);
  });
  it('the limit rule hands back "a ceiling for now" on the item', () => {
    let c = coachStart(fam, {}, order, 0, { skilled: true, noProbe: true });
    const first = coachTake(fam, c, {}, order);
    let nx = coachAfter(fam, c, first, mk('clean', first.bpm), {}, order, 0);
    expect(nx.ceiling).toBeUndefined();
    c = nx.state;
    for (let k = 0; k < PLATEAU_TAKES; k++) {
      const t = coachTake(fam, c, {}, order);
      nx = coachAfter(fam, c, t, mk('not', t.bpm), {}, order, 0);
      c = nx.state;
      if (nx.ceiling) break;
    }
    expect(nx.ceiling).toEqual({ itemId: first.drill.itemId, bpm: Math.round(first.bpm) });
  });
});

const now = new Date('2026-11-22T12:00:00Z');
const pin: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now };
const view = buildPath(pin);
const sugg = (t: number, extra: Partial<Parameters<typeof suggestWorkout>[0]> = {}) => suggestWorkout({ total: t, goal: 'general', priorities: pin.priorities, leaveOut: [], reviewsDue: 0, singer: false, view, opened: 5, technique: true, course: 'keys', day: DAY, ...extra });
const mins = (bs: Block[], k: string) => bs.filter((b) => b.target.kind === k).reduce((a, b) => a + b.minutes, 0);

describe('the daily workout is the single plan (D2)', () => {
  it('path ~20 %, then technique / improvisation 70/30; sums to the window', () => {
    for (const T of [10, 20, 30, 45, 60, 90, 120, 180]) {
      const bs = sugg(T);
      expect(total(bs)).toBe(T);
      const path = mins(bs, 'path');
      const tech = mins(bs, 'keys');
      const imp = mins(bs, 'improv');
      expect(Math.abs(path - T * DAY_SHARES.path)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(tech / (tech + imp) - 0.7)).toBeLessThan(0.08);
      // order: path → technique → improvisation
      const kinds = bs.map((b) => b.target.kind);
      expect(kinds.indexOf('path')).toBeLessThan(kinds.indexOf('keys'));
      expect(kinds.indexOf('keys')).toBeLessThan(kinds.indexOf('improv'));
    }
  });
  it('a beginner (tier ≤ 1) splits 85/15; classical plays repertoire; drums grooves; the ear course is unchanged', () => {
    const b = sugg(40, { techTier: 1 });
    const tech = mins(b, 'keys');
    const imp = mins(b, 'improv');
    expect(Math.abs(tech / (tech + imp) - 0.85)).toBeLessThan(0.06);
    expect(sugg(30, { emphasis: 'classical' }).find((x) => x.target.kind === 'improv')!.target).toEqual({ kind: 'improv', mode: 'repertoire' });
    expect(sugg(30, { course: 'drums' }).find((x) => x.target.kind === 'improv')!.target).toEqual({ kind: 'improv', mode: 'grooves' });
    expect(improvMode('guitar', 'jazz')).toBe('improv');
    const ear = suggestWorkout({ total: 20, goal: 'general', priorities: pin.priorities, leaveOut: [], reviewsDue: 0, singer: false, view, opened: 5, course: 'ear', day: DAY });
    expect(ear.some((x) => x.target.kind === 'keys' || x.target.kind === 'improv')).toBe(false);
    expect(ear.some((x) => x.target.kind === 'strengthen')).toBe(true);
  });
  it('maintenance and lick reviews live inside the technique share; a new player: the path takes it; "I choose": no path', () => {
    const plain = sugg(40);
    const withRev = sugg(40, { reviewsDue: 4, licksDue: 2 });
    expect(mins(withRev, 'warmup')).toBeGreaterThan(0);
    expect(mins(withRev, 'path')).toBe(mins(plain, 'path'));
    expect(mins(withRev, 'improv')).toBe(mins(plain, 'improv'));
    expect(mins(withRev, 'keys')).toBeLessThan(mins(plain, 'keys'));
    expect(withRev.some((x) => x.target.kind === 'game' && x.target.game === 'licks')).toBe(true);
    const fresh = sugg(30, { opened: 0 });
    expect(mins(fresh, 'keys')).toBe(0);
    expect(mins(fresh, 'path')).toBeGreaterThan(mins(sugg(30), 'path'));
    expect(mins(sugg(30, { pathMode: 'choose' }), 'path')).toBe(0);
  });
  it('the window: 180 minutes, a block up to 90; rescale keeps working', () => {
    expect(LIMITS.maxTotal).toBe(180);
    expect(LIMITS.maxBlock).toBe(90);
    expect(total(sugg(180))).toBe(180);
    expect(total(sugg(400))).toBe(180);
    const bs = sugg(30);
    expect(total(rescale(bs, 150))).toBe(150);
    // a block that would pass 90 hands its excess to the others (the editor's 180 chip keeps its total)
    const three: Block[] = [{ id: 'a', target: { kind: 'path' }, minutes: 6 }, { id: 'b', target: { kind: 'keys' }, minutes: 17 }, { id: 'c', target: { kind: 'improv' }, minutes: 7 }];
    const big = rescale(three, 180);
    expect(total(big)).toBe(180);
    expect(Math.max(...big.map((b) => b.minutes))).toBeLessThanOrEqual(90);
  });
  it('why today: every planned block carries a reason', () => {
    const bs = sugg(40, { reviewsDue: 2 });
    expect(bs.map((b) => whyOf(b.target))).toEqual(bs.map((b) => (b.target.kind === 'path' ? 'path' : b.target.kind === 'warmup' ? 'review' : b.target.kind === 'keys' ? 'strengthen' : 'week')));
    expect(whyOf({ kind: 'teacher' })).toBe('teacher');
    expect(whyOf({ kind: 'improv', mode: 'repertoire' })).toBeNull();
    expect(whyOf({ kind: 'game', game: 'licks' })).toBe('review');
    expect(whyOf({ kind: 'vocal' })).toBeNull();
  });
});

describe("the teacher's section (SPEC-PATH-TODAY-PRACTICE §5.1)", () => {
  it('fits: all of it today, inside the window', () => {
    const tp = teacherToday([{ id: 'a', dueOn: '2026-11-25' }, { id: 'b', dueOn: null }], DAY, 30)!;
    expect(tp).toEqual({ minutes: 2 * ASSIGN_MIN, extend: 0, ids: ['a', 'b'] });
    expect(teacherToday([], DAY, 30)).toBeNull();
  });
  it("too much: spread until the due date (default) never grows the window; 'all today' extends it", () => {
    const spread = teacherToday([{ id: 'a', dueOn: '2026-11-25', minutes: 40 }], DAY, 20)!;
    expect(spread.extend).toBe(0);
    expect(spread.minutes).toBe(10); // 40 over 4 days, within half the window
    const all = teacherToday([{ id: 'a', dueOn: '2026-11-25', minutes: 40, ifShort: 'today' }], DAY, 20)!;
    expect(all.minutes).toBe(40);
    expect(all.extend).toBe(30);
  });
  it('added first, never replacing: the rest keeps its shape; an extend grows today', () => {
    const base = sugg(30);
    const withT = sugg(30, { teacher: { minutes: 6, extend: 0, ids: ['x'] } });
    expect(withT[0].target).toEqual({ kind: 'teacher', ids: ['x'] });
    expect(total(withT)).toBe(30);
    expect(withT.slice(1).map((b) => b.target.kind)).toEqual(base.map((b) => b.target.kind));
    const ext = sugg(30, { teacher: { minutes: 40, extend: 25, ids: ['x'] } });
    expect(total(ext)).toBe(55);
    // today's edits keep (or gain) the teacher's block; no assignments: it leaves
    const edited: Block[] = [{ id: 'k', target: { kind: 'keys' }, minutes: 20 }];
    expect(withTeacher(edited, { minutes: 5, extend: 0, ids: ['y'] })[0].target.kind).toBe('teacher');
    expect(withTeacher(withTeacher(edited, { minutes: 5, extend: 0, ids: ['y'] }), null)).toEqual(edited);
  });
});

describe('counting from anywhere (§3.4)', () => {
  it("time on today's technique cells goes to the technique block; the block in progress moves on when used", () => {
    const bs: Block[] = [{ id: 'path-1', target: { kind: 'path' }, minutes: 4 }, { id: 'keys-1', target: { kind: 'keys' }, minutes: 10 }, { id: 'improv-1', target: { kind: 'improv' }, minutes: 4 }];
    let r = startRun(DAY, bs);
    expect(techBlockOf(r)!.id).toBe('keys-1');
    r = creditBlock(r, 'keys-1', 4 * 60000);
    expect(r.used['keys-1']).toBe(4 * 60000);
    expect(r.at).toBe(0); // the path block is still in progress
    r = { ...r, at: 1 };
    r = creditBlock(r, 'keys-1', 6 * 60000);
    expect(r.at).toBe(2);
    expect(techBlockOf(r)).toBeNull();
    expect(creditBlock(r, 'nope', 1000)).toBe(r);
  });
});

// Spec-audit gaps in the daily workout / Today flow (2026-11-23): one today on the guitar and bass, active time (W3),
// the run between blocks (§5, W20), the key of the week's minor rows (D3), measured minutes and the "+N opened" line
// (§2, §5), FSRS maintenance (§4), the teacher's options on the student's side (§5.2) and the SPEC-WORKOUT leftovers.
import { afterEach, describe, expect, it } from 'vitest';
import { families, itemTargetBpm, specDrills } from '../src/engine/drills/plan';
import { newItem } from '../src/engine/drills/ladder';
import type { ItemState } from '../src/engine/drills/types';
import { cellDue, cellKey, keyMatrix, measuredWeight, takeSeconds, type MatrixCell } from '../src/engine/drills/keyMatrix';
import { dueClosed, openedByTier, rungMinutes, todayTechPlan, weekGroupFor } from '../src/engine/drills/todayPlan';
import { activeSpan, IDLE_MS, InputLog } from '../src/engine/activeTime';
import { addSession, areaMinutes, blockSummary, clearBetween, contextSwap, creditBlock, extendLast, feedbackNudge, markServed, nextBlock, nudgedRatings, startRun, teacherToday, templateStale, unserved, waitingArea, type Block } from '../src/engine/workout2';
import { meetsChannel, takeChannel, tallyTake, emptyTally } from '../src/engine/assignChannel';
import { classesFromRaw, myClasses, openAssignments, withAssignOpts } from '../src/cloud/classes';
import { assignOptsFor, setTeacherBackend } from '../src/cloud/teacher';
import { techBlockRuns, matrixInst } from '../src/ui/todayTech';

const DAY = '2026-11-23';

describe('1. guitar and bass run their matrix ladders in the workout (one today)', () => {
  it('the technique block runs the matrix on the piano, the guitar and the bass; the drums keep their drills', () => {
    expect(techBlockRuns('keys', 'piano')).toBe('matrix');
    expect(techBlockRuns('guitar', 'guitar')).toBe('matrix');
    expect(techBlockRuns('bass', 'bass')).toBe('matrix');
    expect(techBlockRuns('drums', 'drums')).toBe('drills');
    expect(techBlockRuns('guitar', 'piano')).toBe('drills');
    expect(matrixInst('drums')).toBeNull();
  });
  it('the guitar and bass plans come from their own ladders (no piano rungs), half from the key of the week', () => {
    for (const inst of ['guitar', 'bass'] as const) {
      const cells = keyMatrix(families(inst), 2, {}, { day: DAY, instrument: inst });
      expect(cells.length).toBeGreaterThan(0);
      const plan = todayTechPlan(cells, { minutes: 20, weekRoot: 5, day: DAY });
      expect(plan.length).toBeGreaterThan(0);
      expect(plan.some((p) => p.why === 'week' && p.cell.root === 5)).toBe(true);
      const piano = new Set(keyMatrix(families('piano'), 2, {}, { day: DAY }).map((c) => c.rung));
      expect(plan.every((p) => !piano.has(p.cell.rung) || p.cell.rung.startsWith(inst[0]))).toBe(true);
    }
    }, 180_000);
});

describe('3. active time (W3)', () => {
  it('gaps up to 15 s count; a longer pause counts 15 s; no input at all counts only the first 15 s', () => {
    expect(IDLE_MS).toBe(15000);
    expect(activeSpan([5000, 10000], 0, 20000)).toBe(20000);
    expect(activeSpan([5000], 0, 120000)).toBe(5000 + 15000);
    expect(activeSpan([], 0, 600000)).toBe(15000);
    expect(activeSpan([1, 2, 3], 10, 5)).toBe(0);
    const log = new InputLog(10, 200);
    for (let t = 0; t <= 60000; t += 100) log.note(t);
    expect(log.lastAt()).toBeGreaterThan(59000);
    expect(log.activeSince(55000, 70000)).toBe(15000);
  });
  it('a block on its own screen is credited with what was played, not in full on entry', () => {
    const blocks: Block[] = [{ id: 'improv-1', target: { kind: 'improv', mode: 'improv' }, minutes: 10 }, { id: 'path-1', target: { kind: 'path' }, minutes: 5 }];
    let r = startRun(DAY, blocks);
    r = creditBlock(r, 'improv-1', activeSpan([1000, 4000, 9000], 0, 60000));
    expect(r.at).toBe(0);
    expect(r.used['improv-1']).toBe(9000 + 15000);
  });
});

describe('4. the run between blocks (§5, W20)', () => {
  const blocks: Block[] = [{ id: 'a', target: { kind: 'path' }, minutes: 2 }, { id: 'b', target: { kind: 'keys' }, minutes: 5 }];
  it('a block whose time runs out leaves its summary for the countdown; Next now clears it', () => {
    const r = addSession(startRun(DAY, blocks), 130000, 6, 5);
    expect(r.at).toBe(1);
    expect(r.between).toBe('a');
    expect(blockSummary(r, 'a')).toEqual({ minutes: 2, items: 6, right: 5 });
    expect(clearBetween(r).between).toBeUndefined();
    expect(creditBlock(startRun(DAY, blocks), 'a', 200000).between).toBe('a');
    // a manual skip shows no summary
    expect(nextBlock(startRun(DAY, blocks)).between).toBeUndefined();
  });
  it('"+2 min" goes back to the block that ended, two minutes longer', () => {
    const r = extendLast(addSession(startRun(DAY, blocks), 130000, 6, 5));
    expect(r.at).toBe(0);
    expect(r.between).toBeUndefined();
    expect(r.blocks[0].minutes).toBe(4);
    // the last block ending finishes the run; +2 reopens it
    const end = creditBlock({ ...startRun(DAY, blocks), at: 1 }, 'b', 400000);
    expect(end.finished).toBe(true);
    const more = extendLast(end);
    expect(more.finished).toBe(false);
    expect(more.at).toBe(1);
    expect(more.blocks[1].minutes).toBe(7);
  });
});

const fams = families('piano');
const closeCell = (c: MatrixCell, items: Record<string, ItemState>, days: string[]) => {
  for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 6, cleanBpm: itemTargetBpm(d), last: days[days.length - 1], passLog: days.map((at) => ({ at, bpm: itemTargetBpm(d) })) };
};

describe('5. the key of the week: minor rows (D3)', () => {
  it('with minor rows open the group alternates week by week; without them it stays major', () => {
    const t2 = keyMatrix(fams, 2, {}, { day: DAY });
    const groups = ['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07'].map((w) => weekGroupFor(t2, w));
    expect(new Set(groups)).toEqual(new Set(['major', 'minor']));
    expect(groups[0]).not.toBe(groups[1]);
    expect(groups[0]).toBe(groups[2]);
    const t1 = keyMatrix(fams, 1, {}, { day: DAY });
    expect(['2026-11-16', '2026-11-23'].map((w) => weekGroupFor(t1, w))).toEqual(['major', 'major']);
  });
  it('a minor week key fills the week share from the minor rows', () => {
    const cells = keyMatrix(fams, 2, {}, { day: DAY });
    const plan = todayTechPlan(cells, { minutes: 30, weekRoot: 9, weekGroup: 'minor', day: DAY });
    const wk = plan.filter((p) => p.why === 'week');
    expect(wk.length).toBeGreaterThan(0);
    expect(wk.every((p) => p.cell.group === 'minor' && p.cell.root === 9)).toBe(true);
  });
});

describe('7. measured minutes, "+N opened", 12 keys ≈ N min (§2, §5)', () => {
  it('the estimate moves toward the measured time with every take', () => {
    expect(measuredWeight(0)).toBe(0);
    expect(measuredWeight(4)).toBe(0.5);
    expect(measuredWeight(100)).toBe(0.8);
    const model = takeSeconds(16, 60);
    expect(model).toBe(16);
    const slow = takeSeconds(16, 60, { takes: 4, activeMs: 4 * 40000 });
    expect(slow).toBeCloseTo(0.5 * 16 + 0.5 * 40);
    expect(takeSeconds(16, 60, { takes: 12, activeMs: 12 * 40000 })).toBeGreaterThan(slow);
    // in the matrix: a cell played slowly takes longer than the same cell played at the model's pace
    const c0 = keyMatrix(fams, 1, {}, { day: DAY })[3];
    const items: Record<string, ItemState> = {};
    const fast: Record<string, ItemState> = {};
    for (let k = 0; k < c0.level.specs.length; k++)
      for (const d of specDrills(c0.level, k, 'fifths-up')) {
        items[d.itemId] = { ...newItem(d), takes: 8, cleanBpm: d.startBpm, last: DAY, activeMs: 8 * 120000 };
        fast[d.itemId] = { ...newItem(d), takes: 8, cleanBpm: d.startBpm, last: DAY };
      }
    const slowCell = keyMatrix(fams, 1, items, { day: DAY }).find((c) => cellKey(c) === cellKey(c0))!;
    const modelCell = keyMatrix(fams, 1, fast, { day: DAY }).find((c) => cellKey(c) === cellKey(c0))!;
    expect(slowCell.minutes).toBeGreaterThan(modelCell.minutes);
  });
  it('"+N new exercises opened" only when the tier rises', () => {
    expect(openedByTier(null, 2, 300)).toBe(0);
    expect(openedByTier({ tier: 1, n: 200 }, 1, 260)).toBe(0);
    expect(openedByTier({ tier: 1, n: 200 }, 2, 238)).toBe(38);
    const t1 = keyMatrix(fams, 1, {}, { day: DAY }).length;
    const t2 = keyMatrix(fams, 2, {}, { day: DAY }).length;
    expect(openedByTier({ tier: 1, n: t1 }, 2, t2)).toBe(t2 - t1);
  });
  it('an exercise through the 12 keys ≈ the sum of its cells', () => {
    const cells = keyMatrix(fams, 1, {}, { day: DAY });
    const rung = cells[2].rung;
    const sum = rungMinutes(cells, rung, 'major');
    expect(cells.filter((c) => c.rung === rung && c.group === 'major').length).toBe(12);
    expect(sum).toBeCloseTo(cells.filter((c) => c.rung === rung && c.group === 'major').reduce((n, c) => n + c.minutes, 0));
  });
});

describe('8. maintenance at growing intervals (FSRS, §4)', () => {
  it('a cell held on more days is due later; only the due ones are reviewed, the most overdue first', () => {
    const items: Record<string, ItemState> = {};
    const cells0 = keyMatrix(fams, 3, items, { day: DAY });
    const a = cells0.find((c) => c.root === 0 && c.rung === 'k-sharm-3')!;
    const b = cells0.find((c) => c.root === 7 && c.rung === 'k-sharm-3')!;
    const c = cells0.find((x) => x.root === 2 && x.rung === 'k-sharm-3')!;
    closeCell(a, items, ['2026-11-01', '2026-11-02', '2026-11-02']);
    closeCell(b, items, ['2026-11-21', '2026-11-22', '2026-11-22']);
    closeCell(c, items, ['2026-09-01', '2026-09-10', '2026-10-01', '2026-10-20', '2026-10-20']);
    const cells = keyMatrix(fams, 3, items, { day: DAY });
    const get = (x: MatrixCell) => cells.find((y) => cellKey(y) === cellKey(x))!;
    // growing intervals: c (held over five days) has a longer interval than a (two days)
    const gap = (x: MatrixCell, last: string) => Date.parse(get(x).need.due!) - Date.parse(`${last}T12:00:00`);
    expect(gap(c, '2026-10-20')).toBeGreaterThan(gap(a, '2026-11-02'));
    const due = dueClosed(cells, DAY).map(cellKey);
    expect(due).toContain(cellKey(a));
    expect(due).not.toContain(cellKey(b)); // passed yesterday: not due yet
    const plan = todayTechPlan(cells, { minutes: 60, weekRoot: 5, day: DAY });
    const rev = plan.filter((p) => p.why === 'review').map((p) => cellKey(p.cell));
    expect(rev).toContain(cellKey(a));
    expect(rev).not.toContain(cellKey(b));
    expect(cellDue([], {}, '2026-11-20').slice(0, 10) >= '2026-11-20').toBe(true);
  });
});

describe('9. the teacher’s options reach the student (§5.2)', () => {
  afterEach(() => setTeacherBackend(null));
  it('classesFromRaw keeps minutes / spread or today / channel; options merge in', () => {
    const c = classesFromRaw({ teaching: [], member_of: [{ id: 'k', name: 'Jazz 1', teacher: 'T', assignments: [{ id: 'x1', lesson_id: 'runs', due_on: '2026-11-30', created_at: DAY, done: false, minutes: 30, if_short: 'today', channel: 'ear', per_day: 10 }] }] });
    expect(c.memberOf[0].assignments[0]).toMatchObject({ minutes: 30, ifShort: 'today', channel: 'ear', perDay: 10 });
    const merged = withAssignOpts(openAssignments(c), { x1: { channel: 'memory', minutes: 15, ifShort: 'spread' } });
    expect(merged[0]).toMatchObject({ channel: 'memory', perDay: 15, ifShort: 'spread' });
  });
  it('with the backend mock: assignOptsFor answers once synced, and the classes go through the same backend', async () => {
    const calls: string[] = [];
    setTeacherBackend(async (fn, args) => {
      calls.push(fn);
      if (fn === 'toneturn_assignment_opts_for') return (args.p_ids as string[]).map((id) => ({ assignment_id: id, channel: 'ear', minutes: 12, if_short: 'today' }));
      if (fn === 'toneturn_my_classes') return { teaching: [], member_of: [{ id: 'k', name: 'Jazz 1', teacher: 'T', assignments: [{ id: 'x1', lesson_id: 'runs', due_on: null, created_at: DAY, done: false }] }] };
      throw new Error(fn);
    });
    // the migration isn't applied: the flag keeps the call off
    expect(await assignOptsFor(['x1'])).toEqual({});
    expect(calls).toEqual([]);
    const opts = await assignOptsFor(['x1'], true);
    expect(opts.x1).toEqual({ channel: 'ear', minutes: 12, ifShort: 'today' });
    const open = withAssignOpts(openAssignments(await myClasses()), opts);
    expect(open[0]).toMatchObject({ lessonId: 'runs', channel: 'ear', perDay: 12, ifShort: 'today' });
  });
  it('minutes a day and spread / all today drive the teacher block', () => {
    // fits: the minutes a day are today's work
    expect(teacherToday([{ id: 'a', dueOn: '2026-11-30', minutes: 60, perDay: 6 }], DAY, 30)?.minutes).toBe(6);
    // doesn't fit: spread keeps to the room (half the window), all today grows the window
    const spread = teacherToday([{ id: 'a', dueOn: '2026-11-30', minutes: 60, perDay: 25 }], DAY, 30)!;
    expect(spread.extend).toBe(0);
    expect(spread.minutes).toBe(15);
    const all = teacherToday([{ id: 'a', dueOn: '2026-11-30', minutes: 60, perDay: 25, ifShort: 'today' }], DAY, 30)!;
    expect(all.minutes).toBe(25);
    expect(all.extend).toBe(10);
  });
  it('the required channel is graded: a take in another channel does not count', () => {
    const prev = { channels: { 'page-sight': { n: 2, clean: 1, best: 80 } } } as Pick<ItemState, 'channels'>;
    const byEar = { channels: { ...prev.channels, 'ear-fresh': { n: 1, clean: 1, best: 80 } } } as Pick<ItemState, 'channels'>;
    const fromPage = { channels: { 'page-sight': { n: 3, clean: 2, best: 80 } } } as Pick<ItemState, 'channels'>;
    expect(takeChannel(prev, byEar)).toBe('ear-fresh');
    expect(takeChannel(prev, fromPage)).toBe('page-sight');
    expect(meetsChannel('ear', 'ear-fresh')).toBe(true);
    expect(meetsChannel('ear', 'page-sight')).toBe(false);
    expect(meetsChannel('free', null)).toBe(true);
    expect(meetsChannel('memory', 'unaided')).toBe(true);
    let t = emptyTally();
    t = tallyTake(t, 'ear', 'page-sight', true);
    t = tallyTake(t, 'ear', 'ear-fresh', true);
    t = tallyTake(t, 'ear', 'ear-known', false);
    expect(t).toEqual({ takes: 2, clean: 1, other: 1 });
  });
});

describe('10. SPEC-WORKOUT leftovers', () => {
  it('§9.4: an area cut under a minute on 3 of the last 5 days keeps waiting (asked once, dismissible)', () => {
    const log = { '2026-11-19': { time: 0 }, '2026-11-20': { time: 0.5, pitch: 4 }, '2026-11-21': { time: 3 }, '2026-11-22': { time: 0 }, '2026-11-10': { time: 0 } };
    expect(waitingArea(log, ['pitch', 'time'], DAY)).toBe('time');
    expect(waitingArea(log, ['time'], DAY, { time: '2026-12-07' })).toBeNull();
    expect(waitingArea({ '2026-11-22': { time: 0 }, '2026-11-10': { time: 0 }, '2026-11-11': { time: 0 } }, ['time'], DAY)).toBeNull();
    const r = { ...startRun(DAY, [{ id: 'a', target: { kind: 'area', area: 'time' }, minutes: 3 }, { id: 'b', target: { kind: 'area', area: 'pitch' }, minutes: 4 }] as Block[]), at: 1, used: { a: 30000 } };
    expect(areaMinutes(r, ['time', 'pitch', 'reading'])).toEqual({ time: 0.5, pitch: 4, reading: 0 });
  });
  it('W6: a default older than 30 days asks to be refreshed', () => {
    expect(templateStale('2026-10-20', DAY)).toBe(true);
    expect(templateStale('2026-11-01', DAY)).toBe(false);
    expect(templateStale(undefined, DAY)).toBe(false);
  });
  it('W16: sub-skills served by an earlier block are skipped later (unless all were)', () => {
    let r = startRun(DAY, []);
    r = markServed(markServed(r, 'intervals'), 'intervals');
    expect(r.served).toEqual(['intervals']);
    expect(unserved(['intervals', 'chords'], r.served)).toEqual(['chords']);
    expect(unserved(['intervals'], r.served)).toEqual(['intervals']);
  });
  it('W10: no instrument swaps the technique and improvisation blocks for buttons-only content', () => {
    const bs: Block[] = [{ id: 'k', target: { kind: 'keys' }, minutes: 10 }, { id: 'i', target: { kind: 'improv', mode: 'improv' }, minutes: 5 }, { id: 'p', target: { kind: 'practice' }, minutes: 5 }, { id: 'v', target: { kind: 'vocal' }, minutes: 3 }];
    const out = contextSwap(bs, { nomic: false, quiet: false, noinst: true });
    expect(out.map((b) => b.target)).toEqual([{ kind: 'area', area: 'reading' }, { kind: 'area', area: 'creative' }, { kind: 'vocal' }]);
    expect(contextSwap(bs, { nomic: true, quiet: false, noinst: false }).find((b) => b.id === 'v')!.target).toEqual({ kind: 'warmup' });
    expect(contextSwap(bs, { nomic: false, quiet: false, noinst: false })).toEqual(bs);
  });
  it('W11: the feedback nudges the total ±5 and the step window ±50 rating', () => {
    expect(feedbackNudge('easy')).toEqual({ delta: 5, rating: 50 });
    expect(feedbackNudge('hard')).toEqual({ delta: 0, rating: -50 });
    expect(feedbackNudge('long')).toEqual({ delta: -5, rating: 0 });
    expect(nudgedRatings({ intervals: { r: 1200, n: 3 } }, -50)).toEqual({ intervals: { r: 1150, n: 3 } });
  });
});

// Piece coach maintenance (SPEC-PIECE §2.10): a learned piece comes back for spaced review runs.
import { describe, expect, it } from 'vitest';
import { initPlan, MAINT_DAYS, maintOf, nextTask, recordRep, reviewDue, startDay, type PlanState } from '../src/engine/piece/coach';
import type { Piece } from '../src/engine/piece/score';

function piece(bars = 8): Piece {
  return {
    title: 'T',
    tempo: 100,
    bars: Array.from({ length: bars }, (_, i) => ({ number: String(i + 1), start: i * 4, beats: 4 })),
    notes: Array.from({ length: bars * 4 }, (_, i) => ({ midi: 60 + (i % 12), start: i, dur: 1, hand: 'R' })),
  } as unknown as Piece;
}
const learned = (extra: Partial<PlanState> = {}): PlanState => ({ ...initPlan(piece(), { target: 100 }, '2026-11-11'), done: true, fullRuns: ['2026-11-10', '2026-11-11'], maint: { step: 0, due: '2026-11-12', runs: 0 }, ...extra });
const clean = { acc: 1, timingOk: true };
const broke = { acc: 0.7, timingOk: false, errorBar: 3 };

describe('piece maintenance', () => {
  it('nothing to do on the day it was learned; a full run at target is due the next day', () => {
    const s = learned();
    expect(reviewDue(s, '2026-11-11')).toBe(false);
    expect(nextTask(s)).toBeNull();
    const d1 = startDay(s, '2026-11-12');
    const t = nextTask(d1)!;
    expect(t).toMatchObject({ kind: 'review', from: 0, to: 7, tempo: 100 });
  });
  it('clean runs space out (1 → 3 → 7 → 14 … days), a run that breaks down comes back tomorrow, one step lower', () => {
    let s = startDay(learned(), '2026-11-12');
    let r = recordRep(s, nextTask(s)!, clean, new Date());
    expect(r.events).toContainEqual({ k: 'reviewRun', clean: true, days: MAINT_DAYS[1] });
    expect(r.state.maint).toMatchObject({ step: 1, due: '2026-11-15' });
    expect(nextTask(r.state)).toBeNull();
    s = startDay(r.state, '2026-11-15');
    r = recordRep(s, nextTask(s)!, clean, new Date());
    expect(r.state.maint).toMatchObject({ step: 2, due: '2026-11-22' });
    s = startDay(r.state, '2026-11-22');
    r = recordRep(s, nextTask(s)!, broke, new Date());
    expect(r.events).toContainEqual({ k: 'reviewRun', clean: false, days: 1 });
    expect(r.state.maint).toMatchObject({ step: 1, due: '2026-11-23' });
    expect(r.state.trouble?.[3]?.fails).toBe(1);
  });
  it('a review day starts with the weak bars, then the full run', () => {
    const s = startDay(learned({ trouble: { 5: { fails: 3, clean: 0, days: ['2026-11-09', '2026-11-11'] } } }), '2026-11-12');
    expect(nextTask(s)).toMatchObject({ kind: 'trouble', to: 5 });
  });
  it('a plan learned before maintenance existed is due the day after its last full run', () => {
    const old = learned({ maint: undefined });
    expect(maintOf(old)).toMatchObject({ step: 0, due: '2026-11-12' });
    expect(reviewDue(old, '2026-11-12')).toBe(true);
  });
  it('the step stops at the longest gap', () => {
    let s = learned({ maint: { step: MAINT_DAYS.length - 1, due: '2026-11-12', runs: 9 } });
    s = startDay(s, '2026-11-12');
    const r = recordRep(s, nextTask(s)!, clean, new Date());
    expect(r.state.maint?.step).toBe(MAINT_DAYS.length - 1);
  });
});

describe('piece review in the workout', () => {
  it('a due piece adds a short piece-review block, the total stays the same', async () => {
    await import('../src/engine/topics');
    const { buildPath } = await import('../src/engine/path');
    const { suggestWorkout, total } = await import('../src/engine/workout2');
    const view = buildPath({ track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 20, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-12T12:00:00Z') });
    const base = { total: 15, goal: 'general' as const, priorities: null, leaveOut: [], reviewsDue: 0, singer: false, view };
    const without = suggestWorkout(base);
    const withP = suggestWorkout({ ...base, piecesDue: 1 });
    expect(without.some((b) => b.target.kind === 'game' && b.target.game === 'pieces')).toBe(false);
    const blk = withP.find((b) => b.target.kind === 'game' && b.target.game === 'pieces');
    expect(blk?.minutes).toBe(3);
    expect(total(withP)).toBe(total(without));
  });
});

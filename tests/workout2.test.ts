import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { buildPath, type PathInput } from '../src/engine/path';
import { add, addSession, canRescale, coverage, LIMITS, move, nextForBlock, preset, remove, rescale, setMinutes, startRun, suggestWorkout, total, validateTemplate, type Block } from '../src/engine/workout2';

const now = new Date('2026-11-07T12:00:00Z');
const pin: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now };
const view = buildPath(pin);
const sugg = (t: number, extra: Partial<Parameters<typeof suggestWorkout>[0]> = {}) => suggestWorkout({ total: t, goal: 'general', priorities: pin.priorities, leaveOut: [], reviewsDue: 0, singer: false, view, ...extra });

describe("today's workout (spec AH)", () => {
  it('suggestions have the exact shapes and sum to the total (W4)', () => {
    for (const t of [5, 10, 15, 20, 30, 45, 60]) {
      const bs = sugg(t);
      expect(total(bs), `total ${t}`).toBe(t);
      expect(bs.every((b) => b.minutes >= LIMITS.minBlock), `min ${t}`).toBe(true);
      expect(bs.some((b) => b.target.kind === 'path'), `path ${t}`).toBe(true);
    }
    const ten = sugg(10);
    expect(ten.map((b) => b.target.kind)).toEqual(['warmup', 'path', 'area', 'area']);
    expect(sugg(15).at(-1)!.target.kind).toBe('game');
  });
  it('left-out areas are never suggested', () => {
    const bs = sugg(20, { leaveOut: ['time', 'pitch'] });
    expect(bs.some((b) => b.target.kind === 'area' && (b.target.area === 'time' || b.target.area === 'pitch'))).toBe(false);
  });
  it('rescale keeps locked blocks, ≥ 2 each, sums exactly; refuses what cannot fit (W5)', () => {
    const bs: Block[] = sugg(20).map((b, i) => (i === 1 ? { ...b, locked: true } : b));
    for (const t of [10, 15, 30, 60]) {
      const r = rescale(bs, t);
      if (canRescale(bs, t)) {
        expect(total(r)).toBe(t);
        expect(r[1].minutes).toBe(bs[1].minutes);
        expect(r.every((b) => b.minutes >= 2)).toBe(true);
      }
    }
    expect(canRescale([{ id: 'a', target: { kind: 'path' }, minutes: 10, locked: true }, { id: 'b', target: { kind: 'warmup' }, minutes: 2 }], 5)).toBe(false);
  });
  it('edits: minutes, move, remove (never the last), add', () => {
    let bs = sugg(10);
    bs = setMinutes(bs, bs[0].id, 5);
    expect(bs[0].minutes).toBe(5);
    expect(total(bs)).toBe(13);
    const first = bs[0].id;
    bs = move(bs, first, 1);
    expect(bs[1].id).toBe(first);
    bs = add(bs, { kind: 'topic', topic: 'intervals-all' }, 3);
    expect(bs.at(-1)!.target).toEqual({ kind: 'topic', topic: 'intervals-all' });
    let one: Block[] = [bs[0]];
    one = remove(one, one[0].id);
    expect(one).toHaveLength(1);
  });
  it('presets keep the total', () => {
    for (const p of ['ear', 'rhythm', 'reading', 'voice', 'instrument', 'mistakes', 'suggested'] as const) expect(total(preset(p, 15, sugg(15)))).toBe(15);
    expect(total(preset('quick5', 15, sugg(15)))).toBe(5);
  });
  it('blocks serve path steps of the current unit first (§9.1), the Path block in order', () => {
    const cur = view.units.find((u) => u.status === 'current')!;
    const area = cur.steps.find((x) => x.step.kind !== 'check')!.step.domain;
    const got = nextForBlock({ id: 'x', target: { kind: 'area', area }, minutes: 3 }, view, new Set());
    expect(got && 'step' in got && got.unitId).toBe(cur.id);
    expect(got && 'step' in got && got.step.step.domain).toBe(area);
    const pathNext = nextForBlock({ id: 'p', target: { kind: 'path' }, minutes: 3 }, view, new Set());
    expect(pathNext && 'step' in pathNext && pathNext.step.step.id).toBe(cur.steps[0].step.id);
  });
  it('coverage: the suggestion covers a good part of the current unit', () => {
    const c = coverage(sugg(20), view);
    expect(c.unitN).toBe(1);
    expect(c.covered).toBeGreaterThan(0);
    expect(c.covered).toBeLessThanOrEqual(c.open);
  });
  it('the run: time-boxed blocks, active time capped per item', () => {
    let r = startRun('2026-11-07', [{ id: 'a', target: { kind: 'path' }, minutes: 2 }, { id: 'b', target: { kind: 'warmup' }, minutes: 2 }]);
    r = addSession(r, 30 * 60000, 1, 1); // a long idle session counts at most 60 s per item
    expect(r.at).toBe(0);
    r = addSession(r, 90000, 6, 5);
    expect(r.at).toBe(1);
    r = addSession(r, 200000, 6, 6);
    expect(r.finished).toBe(true);
  });
  it('template validation drops what no longer exists (W6)', () => {
    const t: Block[] = [{ id: 'a', target: { kind: 'area', area: 'voice' }, minutes: 3 }, { id: 'b', target: { kind: 'topic', topic: 'gone' }, minutes: 3 }, { id: 'c', target: { kind: 'path' }, minutes: 4 }];
    expect(validateTemplate(t, { leaveOut: ['voice'], topics: new Set(['intervals-all']), hidden: [], games: new Set() }).map((b) => b.id)).toEqual(['c']);
  });
});

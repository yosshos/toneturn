import { beforeEach, describe, expect, it } from 'vitest';
import { areaOf, backfillSnapshots, closedOn, daySnapshot, pruneSnapshots } from '../src/engine/snapshot';
import { loadSnapshots, recordSnapshot, resetSnapshotStore } from '../src/storage/snapshots';
import type { ItemState } from '../src/engine/drills/types';

const item = (id: string, family: string, key: number, target: number, log: [string, number][], extra: Partial<ItemState> = {}): ItemState =>
  ({
    itemId: id,
    family,
    key,
    hands: 'R',
    cleanBpm: Math.max(0, ...log.map((x) => x[1])),
    goalBpm: target,
    streak: 0,
    fails: 0,
    ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 },
    takes: log.length,
    last: log.at(-1)?.[0] ?? '',
    history: log.map(([at, bpm]) => ({ at, bpm, cv: 0 })),
    passLog: log.map(([at, bpm]) => ({ at, bpm })),
    targetBpm: target,
    ...extra,
  }) as ItemState;

const closedItem = item('a', 'scales', 0, 80, [['2026-11-10T10:00:00Z', 80], ['2026-11-10T10:05:00Z', 80], ['2026-11-12T09:00:00Z', 80]]);
const learning = item('b', 'k-sharm', 2, 90, [['2026-11-11T10:00:00Z', 60]]);
const guitar = item('c', 'g-chords', 7, 70, [['2026-11-12T10:00:00Z', 68]]);

describe('daily snapshots (SPEC-PROGRESS-CHARTS §1)', () => {
  it('areas come from the course sections; licks are their own area', () => {
    expect(areaOf(closedItem)).toBe('keys:technique');
    expect(areaOf(learning)).toBe('keys:harmony');
    expect(areaOf(guitar)).toBe('guitar:harmony');
    expect(areaOf({ itemId: 'lick:maj-arp:0', family: 'licks' } as ItemState)).toBe('lick');
  });
  it("today's snapshot: statuses by the one rule, the tempo index of open items, minutes, keys", () => {
    const s = daySnapshot('2026-11-12', { a: closedItem, b: learning, c: guitar }, { 'keys|technique|scales|0|run': 600000, '|ear|intervals||run': 120000 });
    expect(s.status['keys:technique']).toEqual({ closed: 1 });
    expect(s.status['keys:harmony']).toEqual({ learning: 1 });
    expect(s.status['guitar:harmony']).toEqual({ almost: 1 });
    expect(s.tempo['keys:harmony']).toBeCloseTo(60 / 90, 3);
    expect(s.minutes).toEqual({ technique: 10, ear: 2 });
    expect(s.keys[0]).toBe(1);
    expect(s.keys[2]).toBe(0);
    expect(s.practised).toBe(true);
  });
  it('an item closes on the day its third qualifying take lands on a second day', () => {
    expect(closedOn(closedItem)).toBe('2026-11-12');
    expect(closedOn(learning)).toBeNull();
  });
  it('back-fill: each past day as it stood (an item counts from its first day, closed from the day it closed)', () => {
    const days = backfillSnapshots({ a: closedItem, b: learning }, { '2026-11-10': { 'keys|technique|scales|0|run': 300000 } }, '2026-11-13');
    expect(Object.keys(days).sort()).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(days['2026-11-10'].status['keys:technique']).toEqual({ almost: 1 });
    expect(days['2026-11-10'].status['keys:harmony']).toBeUndefined();
    expect(days['2026-11-11'].status['keys:harmony']).toEqual({ learning: 1 });
    expect(days['2026-11-12'].status['keys:technique']).toEqual({ closed: 1 });
    expect(days['2026-11-10'].minutes).toEqual({ technique: 5 });
  });
  it('keeps a year daily and one per week before that', () => {
    const all: Record<string, ReturnType<typeof daySnapshot>> = {};
    for (let i = 0; i < 500; i++) {
      const d = new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      all[d] = daySnapshot(d, {});
    }
    const kept = pruneSnapshots(all, '2026-05-15');
    const old = Object.keys(kept).filter((d) => d < '2025-04-10');
    expect(old.length).toBeLessThan(16);
    expect(Object.keys(kept).filter((d) => d >= '2025-04-11').length).toBeGreaterThan(390);
  });
});

describe('the snapshot store', () => {
  beforeEach(() => resetSnapshotStore());
  it('back-fills once, then rewrites today', async () => {
    await recordSnapshot('2026-11-13', { a: closedItem, b: learning }, { '2026-11-13': { 'keys|technique|scales|0|run': 60000 } });
    let all = await loadSnapshots();
    expect(Object.keys(all).sort()).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    await recordSnapshot('2026-11-13', { a: closedItem, b: learning, c: guitar }, { '2026-11-13': { 'keys|technique|scales|0|run': 120000 } });
    all = await loadSnapshots();
    expect(all['2026-11-13'].minutes).toEqual({ technique: 2 });
    expect(all['2026-11-13'].status['guitar:harmony']).toEqual({ almost: 1 });
  });
});

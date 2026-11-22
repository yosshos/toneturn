import { describe, expect, it } from 'vitest';
import { families, itemTargetBpm, specDrills } from '../src/engine/drills/plan';
import { newItem } from '../src/engine/drills/ladder';
import type { ItemState } from '../src/engine/drills/types';
import { cellMinutes, fillMinutes, keyMatrix, matrixOrder, matrixSummary, projectionDays, type MatrixCell } from '../src/engine/drills/keyMatrix';

const fams = families('piano');
const close = (c: MatrixCell, items: Record<string, ItemState>) => {
  for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 6, cleanBpm: itemTargetBpm(d), last: '2026-11-20' };
};

describe('the key × exercise matrix (SPEC-DAILY-WORKOUT)', () => {
  it('every open rung in every key: 12 major keys below T2, harmonic minor rows from T2; the full set, not a pick', () => {
    const t1 = keyMatrix(fams, 1, {});
    expect(new Set(t1.map((c) => c.root)).size).toBe(12);
    expect(t1.every((c) => c.group === 'major')).toBe(true);
    const t3 = keyMatrix(fams, 3, {});
    expect(t3.some((c) => c.group === 'minor')).toBe(true);
    // more cells per key than a session picks (the key session caps blocks; the matrix holds them all)
    const d = t3.filter((c) => c.root === 2 && c.group === 'major');
    expect(d.length).toBeGreaterThan(14);
    expect(new Set(d.map((c) => c.rung)).size).toBe(d.length);
    // every cell is in its key only
    for (const c of d) expect(c.level.keys).toEqual([2]);
  });
  it('minutes: a never-played cell costs more than one below target, which costs more than a closed one', () => {
    const c = keyMatrix(fams, 3, {}).find((x) => x.rung === 'k-sharm-7' && x.root === 0)!;
    const fresh = cellMinutes(c.level, {});
    const items: Record<string, ItemState> = {};
    for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 3, cleanBpm: d.startBpm, last: '2026-11-20' };
    const below = cellMinutes(c.level, items);
    close(c, items);
    const done = cellMinutes(c.level, items);
    expect(fresh).toBeGreaterThan(below);
    expect(below).toBeGreaterThan(done);
    expect(fresh).toBeGreaterThan(0.5);
    expect(fresh).toBeLessThan(30);
  });
  it('views: weak first puts the never-played first and closed cells last; by key keeps one key together in teaching order; by exercise interleaves three keys at a time', () => {
    const items: Record<string, ItemState> = {};
    const cells0 = keyMatrix(fams, 3, items);
    close(cells0.find((c) => c.root === 0 && c.rung === 'k-sharm-3')!, items);
    const cells = keyMatrix(fams, 3, items);
    const weak = matrixOrder(cells, 'weak');
    expect(weak[0].need.s).toBe(0);
    expect(weak.at(-1)!.need.s).toBe(2);
    const byKey = matrixOrder(cells, 'key');
    const first = byKey.slice(0, 10);
    expect(new Set(first.map((c) => `${c.group}${c.root}`)).size).toBe(1);
    expect(first.map((c) => c.i)).toEqual([...first.map((c) => c.i)].sort((a, b) => a - b));
    const byEx = matrixOrder(cells, 'exercise');
    expect(new Set(byEx.slice(0, 3).map((c) => c.rung)).size).toBe(1);
    expect(byEx[3].rung).not.toBe(byEx[0].rung);
  });
  it('fill today’s minutes, the summary and the projection', () => {
    const cells = keyMatrix(fams, 3, {});
    const today = fillMinutes(matrixOrder(cells, 'key'), 30);
    const m = today.reduce((n, c) => n + c.minutes, 0);
    expect(today.length).toBeGreaterThan(0);
    expect(m).toBeLessThanOrEqual(30 + today[0].minutes);
    const sum = matrixSummary(cells);
    expect(sum.cells).toBe(cells.length);
    expect(sum.closed).toBe(0);
    expect(sum.byKey.length).toBe(24);
    const days30 = projectionDays(sum, 30)!;
    const days90 = projectionDays(sum, 90)!;
    expect(days30).toBeGreaterThan(days90);
    expect(projectionDays(sum, 0)).toBeNull();
  });
});

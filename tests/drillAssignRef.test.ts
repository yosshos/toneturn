import { describe, expect, it } from 'vitest';
import { assignmentFor, drillRef, itemOfAssign, parseDrillRef } from '../src/engine/itemAssign';

describe('technique assignment ref: key and minutes', () => {
  it('reads the plain ref as before', () => {
    expect(parseDrillRef('drill:scales-3')).toEqual({ id: 'scales-3', key: null, minutes: null, exact: false });
    expect(itemOfAssign({ kind: 'drill', ref: 'drill:scales-3' })).toEqual({ k: 'level', id: 'scales-3' });
  });
  it('round-trips a key and minutes', () => {
    expect(drillRef('scales-3', 7, 10)).toBe('drill:scales-3@7/10');
    expect(parseDrillRef('drill:scales-3@7/10')).toEqual({ id: 'scales-3', key: 7, minutes: 10, exact: false });
    expect(parseDrillRef(drillRef('arpeggios-3', 10))).toEqual({ id: 'arpeggios-3', key: 10, minutes: null, exact: false });
    expect(itemOfAssign({ kind: 'drill', ref: 'drill:scales-3@7/10' })).toEqual({ k: 'level', id: 'scales-3' });
  });
  it('rejects out-of-range values', () => {
    // owner 2026-11-27: '!' = exactly this exercise (no scale forms after the target)
    expect(parseDrillRef('drill:scales-3@3/10!')).toEqual({ id: 'scales-3', key: 3, minutes: 10, exact: true });
    expect(drillRef('scales-3', 3, 10, true)).toBe('drill:scales-3@3/10!');
    expect(parseDrillRef('drill:scales-3@14/500')).toEqual({ id: 'scales-3', key: null, minutes: null, exact: false });
  });
  it("matches a key page's rung only for its key (or a key-free assignment)", () => {
    const as = [
      { id: 'g', kind: 'drill', ref: 'drill:scales-3@7/10', dueOn: null, createdAt: '2026-11-26T10:00:00Z' },
      { id: 'bb', kind: 'drill', ref: 'drill:scales-3@10/10', dueOn: null, createdAt: '2026-11-26T10:01:00Z' },
    ];
    const r = { k: 'level' as const, id: 'scales-3' };
    expect(assignmentFor(as, r, '2026-11-26', 7)?.id).toBe('g');
    expect(assignmentFor(as, r, '2026-11-26', 10)?.id).toBe('bb');
    expect(assignmentFor(as, r, '2026-11-26', 0)).toBeNull();
    expect(assignmentFor(as, r, '2026-11-26')?.id).toBe('bb');
    const free = [...as, { id: 'any', kind: 'drill', ref: 'drill:scales-3', dueOn: null, createdAt: '2026-11-26T09:00:00Z' }];
    expect(assignmentFor(free, r, '2026-11-26', 0)?.id).toBe('any');
  });
});

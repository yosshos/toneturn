import { describe, expect, it } from 'vitest';
import { rowCounts } from '../src/cloud/cloud';

describe('result rows fit the server checks', () => {
  it('a long technique session (72 takes) is sent within total <= 50, first_try <= total, xp <= total * 20', () => {
    const r = rowCounts({ total: 72, firstTry: 60, xp: 400 });
    expect(r.total).toBe(50);
    expect(r.first_try).toBeLessThanOrEqual(r.total);
    expect(r.first_try).toBe(42);
    expect(r.xp).toBeLessThanOrEqual(r.total * 20);
  });
  it('a normal result is unchanged', () => {
    expect(rowCounts({ total: 12, firstTry: 9, xp: 120 })).toEqual({ total: 12, first_try: 9, xp: 120 });
  });
  it('never a zero total', () => {
    expect(rowCounts({ total: 0, firstTry: 0, xp: 5 }).total).toBe(1);
  });
});

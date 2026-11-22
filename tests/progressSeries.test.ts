import { describe, expect, it } from 'vitest';
import { areasOf, closedSeries, defaultFrame, framesFor, inFrame, insights, minutesByWeek, statusByWeek, tenureDays, weekTiles } from '../src/engine/progressSeries';
import type { Snapshot } from '../src/engine/snapshot';

const snap = (day: string, closed: number, reading: number | null, minutes = 20, learning = 5): Snapshot => ({
  day,
  status: { 'keys:technique': { closed, learning }, 'keys:harmony': { learning: 3 } },
  tempo: { 'keys:technique': 0.8 },
  minutes: { technique: minutes },
  channels: { ear: 0.8, reading },
  keys: { 0: 0.5 },
  vocab: { played: 0, closed: 0 },
  practised: minutes > 0,
});
const days = (n: number, start = '2026-10-01') => Array.from({ length: n }, (_, i) => new Date(new Date(start + 'T00:00:00Z').getTime() + i * 86400000).toISOString().slice(0, 10));

describe('time frames open with tenure (owner 2026-11-22)', () => {
  it('7 days at first, 30 from two weeks (the default), 90 from two months, a year from six, all from a year', () => {
    expect(framesFor(3)).toEqual(['7d']);
    expect(framesFor(20)).toEqual(['7d', '30d']);
    expect(framesFor(70)).toEqual(['7d', '30d', '90d']);
    expect(framesFor(400)).toEqual(['7d', '30d', '90d', '1y', 'all']);
    expect(defaultFrame(3)).toBe('7d');
    expect(defaultFrame(100)).toBe('30d');
  });
});

describe('series from the daily snapshots', () => {
  const all = Object.fromEntries(days(30).map((d, i) => [d, snap(d, Math.floor(i / 3), 0.3 + i * 0.01, i % 7 === 6 ? 0 : 20)]));
  const today = days(30).at(-1)!;
  it('tenure, frames, closed per area, the status per week, minutes per week', () => {
    expect(tenureDays(all, today)).toBe(29);
    const f = inFrame(all, '7d', today);
    expect(f).toHaveLength(7);
    expect(areasOf(f)[0]).toBe('keys:technique');
    expect(closedSeries(f, 'keys:technique').at(-1)!.v).toBe(9);
    const wk = statusByWeek(inFrame(all, '30d', today));
    expect(wk.at(-1)!.counts.learning).toBe(8);
    expect(minutesByWeek(inFrame(all, '30d', today)).length).toBeGreaterThanOrEqual(4);
  });
  it('this week vs last week', () => {
    const t = weekTiles(all, today);
    expect(t.find((x) => x.id === 'days')!.now).toBe(6);
    expect(t.find((x) => x.id === 'closed')!.now).toBeGreaterThan(0);
    expect(t.find((x) => x.id === 'tempo')!.now).toBe(80);
  });
  it('insights only for a real change', () => {
    const s = inFrame(all, '30d', today);
    expect(insights(s, (a) => a, 'en')[0]).toMatch(/Reading rose \d+ points/);
    const flat = Object.fromEntries(days(30).map((d) => [d, snap(d, 2, 0.5)]));
    expect(insights(inFrame(flat, '30d', today), (a) => a, 'en')).toEqual([]);
  });
});

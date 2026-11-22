// Series for the over-time charts (docs/SPEC-PROGRESS-CHARTS.md §2, §8; owner 2026-11-22), built from the daily
// snapshots (snapshot.ts). Pure: the screens draw what these return.
// - the time frames a player may pick open with tenure (7 days → + 30 → + 90 → + a year → + all), default 30 days;
// - per area: closed (cumulative) over time; the status ladder per week; the tempo index; minutes per week by bucket;
//   the keys filling up; the two channel numbers;
// - "this week vs last week" tiles, and insight sentences only for a real change (not noise).

import type { Snapshot } from './snapshot';
import type { ItemStatus } from './drills/itemStatus';

export type Frame = '7d' | '30d' | '90d' | '1y' | 'all';
const FRAME_DAYS: Record<Frame, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, all: 100000 };

/** The frames offered for a tenure (days since the first snapshot) — only frames with data behind them (owner). */
export function framesFor(tenureDays: number): Frame[] {
  const out: Frame[] = ['7d'];
  if (tenureDays >= 14) out.push('30d');
  if (tenureDays >= 60) out.push('90d');
  if (tenureDays >= 182) out.push('1y');
  if (tenureDays >= 365) out.push('all');
  return out;
}
/** The default frame: 30 days once it is offered (owner), else the longest offered. */
export const defaultFrame = (tenureDays: number): Frame => (framesFor(tenureDays).includes('30d') ? '30d' : framesFor(tenureDays).at(-1)!);

const sorted = (all: Record<string, Snapshot>): Snapshot[] => Object.values(all).sort((a, b) => a.day.localeCompare(b.day));
const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

export function tenureDays(all: Record<string, Snapshot>, today: string): number {
  const s = sorted(all);
  if (!s.length) return 0;
  return Math.round((new Date(today + 'T00:00:00Z').getTime() - new Date(s[0].day + 'T00:00:00Z').getTime()) / 86400000);
}

export function inFrame(all: Record<string, Snapshot>, frame: Frame, today: string): Snapshot[] {
  const from = addDays(today, -FRAME_DAYS[frame] + 1);
  return sorted(all).filter((s) => s.day >= from && s.day <= today);
}

export interface Point {
  day: string;
  v: number;
}

/** Closed items per area over the frame (each snapshot already counts the cumulative state of that day). */
export function closedSeries(snaps: Snapshot[], area: string): Point[] {
  return snaps.map((s) => ({ day: s.day, v: s.status[area]?.closed ?? 0 }));
}

/** Areas that appear in the frame, ordered by how much they hold. */
export function areasOf(snaps: Snapshot[]): string[] {
  const n: Record<string, number> = {};
  for (const s of snaps) for (const [a, st] of Object.entries(s.status)) n[a] = Math.max(n[a] ?? 0, Object.values(st).reduce((x, y) => x + (y ?? 0), 0));
  return Object.keys(n).sort((a, b) => n[b] - n[a]);
}

const weekOf = (day: string) => {
  const d = new Date(day + 'T00:00:00Z');
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
};

/** The status ladder per week (the week's last snapshot), summed over areas (or one area). */
export function statusByWeek(snaps: Snapshot[], area?: string): { week: string; counts: Partial<Record<ItemStatus, number>> }[] {
  const last = new Map<string, Snapshot>();
  for (const s of snaps) last.set(weekOf(s.day), s);
  return [...last.entries()].map(([week, s]) => {
    const counts: Partial<Record<ItemStatus, number>> = {};
    for (const [a, st] of Object.entries(s.status)) {
      if (area && a !== area) continue;
      for (const [k, v] of Object.entries(st)) counts[k as ItemStatus] = (counts[k as ItemStatus] ?? 0) + (v ?? 0);
    }
    return { week, counts };
  });
}

export const tempoSeries = (snaps: Snapshot[], area: string): Point[] => snaps.filter((s) => s.tempo[area] !== undefined).map((s) => ({ day: s.day, v: s.tempo[area] }));

/** Minutes per week by bucket (≤ 6 named buckets + "other"). */
export function minutesByWeek(snaps: Snapshot[], keep = 6): { week: string; by: Record<string, number> }[] {
  const tot: Record<string, number> = {};
  for (const s of snaps) for (const [b, m] of Object.entries(s.minutes)) tot[b] = (tot[b] ?? 0) + m;
  const named = new Set(Object.keys(tot).sort((a, b) => tot[b] - tot[a]).slice(0, keep));
  const weeks = new Map<string, Record<string, number>>();
  for (const s of snaps) {
    const w = weeks.get(weekOf(s.day)) ?? {};
    for (const [b, m] of Object.entries(s.minutes)) {
      const k = named.has(b) ? b : 'other';
      w[k] = Math.round(((w[k] ?? 0) + m) * 10) / 10;
    }
    weeks.set(weekOf(s.day), w);
  }
  return [...weeks.entries()].map(([week, by]) => ({ week, by }));
}

/** The keys filling up: key → share closed, per week (the week's last snapshot with key data). */
export function keysByWeek(snaps: Snapshot[]): { week: string; keys: Record<number, number> }[] {
  const last = new Map<string, Snapshot>();
  for (const s of snaps) if (Object.keys(s.keys).length) last.set(weekOf(s.day), s);
  return [...last.entries()].map(([week, s]) => ({ week, keys: s.keys }));
}

export const channelSeries = (snaps: Snapshot[], which: 'ear' | 'reading'): Point[] => snaps.filter((s) => s.channels[which] !== null).map((s) => ({ day: s.day, v: s.channels[which] as number }));

export interface Tile {
  id: 'minutes' | 'closed' | 'days' | 'tempo';
  now: number;
  prev: number;
}

/** This week vs last week: minutes, items closed during the week, practice days, the median tempo index. */
export function weekTiles(all: Record<string, Snapshot>, today: string): Tile[] {
  const s = sorted(all);
  const week = (from: string, to: string) => s.filter((x) => x.day >= from && x.day <= to);
  const thisW = week(addDays(today, -6), today);
  const lastW = week(addDays(today, -13), addDays(today, -7));
  const mins = (xs: Snapshot[]) => Math.round(xs.reduce((n, x) => n + Object.values(x.minutes).reduce((a, b) => a + b, 0), 0));
  const closedAt = (x?: Snapshot) => (x ? Object.values(x.status).reduce((n, st) => n + (st.closed ?? 0), 0) : 0);
  const closedIn = (xs: Snapshot[], before?: Snapshot) => Math.max(0, closedAt(xs.at(-1)) - closedAt(before ?? xs[0]));
  const beforeThis = s.filter((x) => x.day < addDays(today, -6)).at(-1);
  const beforeLast = s.filter((x) => x.day < addDays(today, -13)).at(-1);
  const tempo = (x?: Snapshot) => {
    const v = x ? Object.values(x.tempo) : [];
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) : 0;
  };
  return [
    { id: 'minutes', now: mins(thisW), prev: mins(lastW) },
    { id: 'closed', now: closedIn(thisW, beforeThis), prev: closedIn(lastW, beforeLast) },
    { id: 'days', now: thisW.filter((x) => x.practised).length, prev: lastW.filter((x) => x.practised).length },
    { id: 'tempo', now: tempo(thisW.at(-1)), prev: tempo(lastW.at(-1)) },
  ];
}

/**
 * Insight sentences — only facts from the data, and only a real change: a series that moved at least `minDelta` (an
 * absolute share, e.g. 10 points) between the frame's first and last weeks, over at least 3 weeks of data; or an area
 * whose closed count stood still for two weeks while another moved.
 */
export function insights(snaps: Snapshot[], areaName: (a: string) => string, lang: 'he' | 'en', minDelta = 0.1): string[] {
  const out: string[] = [];
  if (snaps.length < 14) return out;
  const first = snaps.slice(0, 7), last = snaps.slice(-7);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  for (const which of ['reading', 'ear'] as const) {
    const a = avg(first.map((s) => s.channels[which]).filter((x): x is number => x !== null));
    const b = avg(last.map((s) => s.channels[which]).filter((x): x is number => x !== null));
    if (a !== null && b !== null && Math.abs(b - a) >= minDelta) {
      const d = Math.round((b - a) * 100);
      const name = which === 'reading' ? (lang === 'he' ? 'הקריאה' : 'Reading') : lang === 'he' ? 'השמיעה' : 'Playing by ear';
      out.push(lang === 'he' ? `${name} ${d > 0 ? 'עלתה' : 'ירדה'} ${Math.abs(d)} נקודות בתקופה הזו.` : `${name} ${d > 0 ? 'rose' : 'fell'} ${Math.abs(d)} points in this period.`);
    }
  }
  const twoWeeks = snaps.slice(-14);
  const moved = (a: string) => (twoWeeks.at(-1)!.status[a]?.closed ?? 0) - (twoWeeks[0].status[a]?.closed ?? 0);
  const areas = areasOf(snaps);
  const still = areas.filter((a) => moved(a) === 0 && (twoWeeks.at(-1)!.status[a] ? Object.values(twoWeeks.at(-1)!.status[a]).reduce((x, y) => x + (y ?? 0), 0) : 0) > 0);
  const fast = areas.filter((a) => moved(a) >= 3);
  if (still.length && fast.length)
    out.push(lang === 'he' ? `${areaName(fast[0])} מתקדם; ${areaName(still[0])} עומד כבר שבועיים.` : `${areaName(fast[0])} is moving; ${areaName(still[0])} has stood still for two weeks.`);
  return out.slice(0, 2);
}

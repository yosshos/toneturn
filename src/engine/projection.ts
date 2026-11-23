// Measured time and the projection (BUILD-PLAN-2026-11 phase 8, D5: shown on the Progress page only;
// SPEC-DAILY-WORKOUT §5). How long until a key, or the whole key × exercise matrix at the player's tier, is closed —
// at the minutes the player REALLY practises (the daily snapshots' measured active minutes), not the minutes they said
// at the start. Also the time already measured per key (the items' active milliseconds, the take event's activeMs).
//
// Conservative readings (the spec leaves them open):
// - the pace is the mean over the last 14 calendar days (days without practice count as 0), or over the days since the
//   first snapshot when that is shorter — a projection should not promise a pace the player keeps only on good days;
// - only the technique minutes move the matrix (the minutes chart's "technique" kind); maintenance of closed cells
//   (15 %, SPEC-DAILY-WORKOUT §5) is taken off them, as in projectionDays;
// - no projection without at least 3 practice days in the window (too little to call it a pace).
// Pure.

import type { Snapshot } from './snapshot';
import type { ItemState } from './drills/types';
import { cellItemIds, type MatrixCell, type MatrixGroup } from './drills/keyMatrix';

export const PACE_WINDOW = 14;
export const MIN_PACE_DAYS = 3;
/** The share of technique time spent revisiting closed cells (SPEC-DAILY-WORKOUT §5). */
export const MAINTENANCE = 0.15;

export interface Pace {
  /** Mean measured minutes a day over the window (all practice). */
  perDay: number;
  /** Mean measured technique minutes a day over the window. */
  techPerDay: number;
  /** Days in the window (≤ PACE_WINDOW) and how many of them had practice. */
  days: number;
  practiceDays: number;
}

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);

/** The player's measured pace from the daily snapshots (null with no snapshot in the window). */
export function measuredPace(all: Record<string, Snapshot>, today: string, window = PACE_WINDOW): Pace | null {
  const days = Object.values(all).sort((a, b) => a.day.localeCompare(b.day));
  if (!days.length) return null;
  const span = Math.max(1, Math.min(window, dayDiff(days[0].day, today) + 1));
  const from = addDays(today, -span + 1);
  const inW = days.filter((s) => s.day >= from && s.day <= today);
  if (!inW.length) return null;
  const tot = inW.reduce((n, s) => n + Object.values(s.minutes).reduce((a, b) => a + b, 0), 0);
  const tech = inW.reduce((n, s) => n + (s.minutes.technique ?? 0), 0);
  return { perDay: Math.round((tot / span) * 10) / 10, techPerDay: Math.round((tech / span) * 10) / 10, days: span, practiceDays: inW.filter((s) => s.practised).length };
}

/** Days to work `minutesLeft` at the measured technique pace (less maintenance); null when there is no pace yet. */
export function daysAt(minutesLeft: number, pace: Pace | null): number | null {
  if (!pace || pace.practiceDays < MIN_PACE_DAYS) return null;
  const perDay = pace.techPerDay * (1 - MAINTENANCE);
  if (perDay <= 0.5) return null;
  return Math.max(minutesLeft > 0 ? 1 : 0, Math.ceil(minutesLeft / perDay));
}

export interface KeyTime {
  root: number;
  group: MatrixGroup;
  cells: number;
  closed: number;
  /** Estimated minutes of work left in the key's open cells (cells resting after a plateau are skipped). */
  left: number;
  /** Minutes already measured on the key's items (their active time). */
  measured: number;
}

/** Per key: cells, closed, the estimated minutes left and the minutes measured so far. */
export function keyTimes(cells: MatrixCell[], items: Record<string, ItemState>): KeyTime[] {
  const rows = new Map<string, KeyTime>();
  // the focus's "rest" style cells are exposure, not a goal (matrixSummary does the same)
  for (const c of cells.filter((x) => x.tier !== 'rest')) {
    const k = `${c.group}-${c.root}`;
    const r = rows.get(k) ?? { root: c.root, group: c.group, cells: 0, closed: 0, left: 0, measured: 0 };
    r.cells++;
    if (c.need.s === 2) r.closed++;
    else if (!c.need.cool) r.left += c.minutes;
    for (const id of cellItemIds(c)) r.measured += (items[id]?.activeMs ?? 0) / 60000;
    rows.set(k, r);
  }
  return [...rows.values()].map((r) => ({ ...r, left: Math.round(r.left * 10) / 10, measured: Math.round(r.measured * 10) / 10 }));
}

export interface Projection {
  pace: Pace | null;
  keys: KeyTime[];
  /** The whole matrix: cells, closed, minutes left, days at the measured pace. */
  all: { cells: number; closed: number; left: number; measured: number; days: number | null };
  /** The key of the week, if known. */
  week: (KeyTime & { days: number | null }) | null;
}

export function projection(cells: MatrixCell[], items: Record<string, ItemState>, snaps: Record<string, Snapshot>, today: string, weekRoot: number | null = null, group: MatrixGroup = 'major'): Projection {
  const pace = measuredPace(snaps, today);
  const keys = keyTimes(cells, items);
  const sum = (f: (k: KeyTime) => number) => Math.round(keys.reduce((n, k) => n + f(k), 0) * 10) / 10;
  const left = sum((k) => k.left);
  const wk = weekRoot === null ? null : keys.find((k) => k.root === weekRoot && k.group === group) ?? null;
  return {
    pace,
    keys,
    all: { cells: sum((k) => k.cells), closed: sum((k) => k.closed), left, measured: sum((k) => k.measured), days: daysAt(left, pace) },
    week: wk ? { ...wk, days: daysAt(wk.left, pace) } : null,
  };
}

/** A span of days in words (days up to two weeks, then weeks, then months). */
export function spanWords(d: number, lang: 'he' | 'en'): string {
  const he = lang === 'he';
  if (d <= 14) return he ? (d === 1 ? 'יום אחד' : `${d} ימים`) : d === 1 ? '1 day' : `${d} days`;
  if (d <= 90) return he ? `${Math.round(d / 7)} שבועות` : `${Math.round(d / 7)} weeks`;
  return he ? `${Math.round(d / 30)} חודשים` : `${Math.round(d / 30)} months`;
}

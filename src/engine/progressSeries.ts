// Series for the over-time charts (docs/SPEC-PROGRESS-CHARTS.md §2, §8; owner 2026-11-22), built from the daily
// snapshots (snapshot.ts). Pure: the screens draw what these return.
// - the time frames a player may pick open with tenure (7 days → + 30 → + 90 → + a year → + all), default 30 days;
// - per area: closed (cumulative) over time; the status ladder per week; the tempo index; minutes per week by bucket;
//   the keys filling up; the two channel numbers;
// - "this week vs last week" tiles, and insight sentences only for a real change (not noise).

import { UPPER_STEPS, type Snapshot, type UpperStep } from './snapshot';
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
/** An area, or a test on the area (a course's own areas, ProgressOverTime.ownArea). */
export type AreaSel = string | ((area: string) => boolean);
const inSel = (sel: AreaSel | undefined, a: string): boolean => (sel === undefined ? true : typeof sel === 'string' ? a === sel : sel(a));

export function statusByWeek(snaps: Snapshot[], area?: AreaSel): { week: string; counts: Partial<Record<ItemStatus, number>> }[] {
  const last = new Map<string, Snapshot>();
  for (const s of snaps) last.set(weekOf(s.day), s);
  return [...last.entries()].map(([week, s]) => {
    const counts: Partial<Record<ItemStatus, number>> = {};
    for (const [a, st] of Object.entries(s.status)) {
      if (!inSel(area, a)) continue;
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

/**
 * This week vs last week: minutes, items closed during the week, practice days, the median tempo index. A course's page
 * counts only its own areas (`area`) and its own kinds of minutes (`minuteKinds`: the Ear course's ear and games).
 */
export function weekTiles(all: Record<string, Snapshot>, today: string, area?: AreaSel, minuteKinds?: string[]): Tile[] {
  const s = sorted(all);
  const week = (from: string, to: string) => s.filter((x) => x.day >= from && x.day <= to);
  const thisW = week(addDays(today, -6), today);
  const lastW = week(addDays(today, -13), addDays(today, -7));
  const mins = (xs: Snapshot[]) => Math.round(xs.reduce((n, x) => n + Object.entries(x.minutes).reduce((a, [k, b]) => a + (!minuteKinds || minuteKinds.includes(k) ? b : 0), 0), 0));
  const closedAt = (x?: Snapshot) => (x ? Object.entries(x.status).reduce((n, [a, st]) => n + (inSel(area, a) ? st.closed ?? 0 : 0), 0) : 0);
  const closedIn = (xs: Snapshot[], before?: Snapshot) => Math.max(0, closedAt(xs.at(-1)) - closedAt(before ?? xs[0]));
  const beforeThis = s.filter((x) => x.day < addDays(today, -6)).at(-1);
  const beforeLast = s.filter((x) => x.day < addDays(today, -13)).at(-1);
  const tempo = (x?: Snapshot) => {
    const v = x ? Object.entries(x.tempo).filter(([a]) => inSel(area, a)).map(([, t]) => t) : [];
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

// ---------------------------------------------------------------- the full ladder, channels, language, improvisation

/** The ladder's steps as the stacked chart draws them (one hue, light → dark): new is left out (nothing played). */
export type LadderStep = Exclude<ItemStatus, 'new'> | UpperStep;
export const LADDER_STEPS: LadderStep[] = ['learning', 'almost', 'closed', ...UPPER_STEPS];

/** The full ladder per week (the week's last snapshot): "closed" split into closed only and the steps above it. */
export function ladderByWeek(snaps: Snapshot[], area?: AreaSel): { week: string; by: Record<LadderStep, number> }[] {
  return statusByWeek(snaps, area).map(({ week, counts }) => {
    const s = [...snaps].reverse().find((x) => weekOf(x.day) === week);
    const up: Record<UpperStep, number> = { keys12: 0, language: 0, fingers: 0 };
    for (const [a, l] of Object.entries(s?.ladder ?? {})) if (inSel(area, a)) for (const k of UPPER_STEPS) up[k] += l[k] ?? 0;
    const closed = counts.closed ?? 0;
    const above = Math.min(closed, up.keys12 + up.language + up.fingers);
    return { week, by: { learning: counts.learning ?? 0, almost: counts.almost ?? 0, closed: closed - above, ...up } };
  });
}

export type MixShares = { ear: number; page: number; memory: number };
/** Chart 6's bar: the latest week's actual channel mix and the target (null until a snapshot carries either). */
export function weekMix(snaps: Snapshot[]): { actual: MixShares | null; target: MixShares | null } | null {
  const s = [...snaps].reverse().find((x) => x.mix !== undefined || x.mixTarget);
  if (!s) return null;
  return { actual: s.mix ?? null, target: s.mixTarget ?? null };
}

/** BUILD-PLAN D2 (workout2.DAY_SHARES): the planned split — about 20 % path, the rest technique / improvisation 70 / 30. */
export const PLANNED_SPLIT = { path: 0.2, technique: 0.56, improv: 0.24 } as const;
/** The frame's actual split on the same three parts (path = lessons, ear topics and games; the rest is "other"). */
export function minutesSplit(snaps: Snapshot[]): { path: number; technique: number; improv: number; other: number; total: number } {
  const t = { path: 0, technique: 0, improv: 0, other: 0 };
  for (const s of snaps)
    for (const [k, m] of Object.entries(s.minutes)) {
      if (k === 'technique') t.technique += m;
      else if (k === 'improv') t.improv += m;
      else if (k === 'ear' || k === 'games') t.path += m;
      else t.other += m;
    }
  const total = t.path + t.technique + t.improv + t.other;
  const sh = (x: number) => (total ? Math.round((x / total) * 1000) / 1000 : 0);
  return { path: sh(t.path), technique: sh(t.technique), improv: sh(t.improv), other: sh(t.other), total: Math.round(total) };
}

/** Chart 8: licks learned (closed in a key) and in my language, over time (snapshots that carry them). */
export function languageSeries(snaps: Snapshot[]): { learned: Point[]; language: Point[] } {
  const xs = snaps.filter((s) => s.vocab.learned !== undefined);
  return { learned: xs.map((s) => ({ day: s.day, v: s.vocab.learned ?? 0 })), language: xs.map((s) => ({ day: s.day, v: s.vocab.language ?? 0 })) };
}

/** Chart 9: colour coverage or the in-scale rate over time (only days that measured it). */
export const improvSeries = (snaps: Snapshot[], which: 'cov' | 'inScale'): Point[] =>
  snaps.filter((s) => s.improv && s.improv[which] !== null && s.improv[which] !== undefined).map((s) => ({ day: s.day, v: s.improv![which] as number }));

/** Chart 9's heat map: the latest mode × function map — functions (rows) × modes (columns), shade = colour coverage. */
export function modeFunctionGrid(snaps: Snapshot[]): { fns: string[]; modes: string[]; cell: (fn: string, mode: string) => number | null } | null {
  const s = [...snaps].reverse().find((x) => x.improv && Object.keys(x.improv.map).length);
  if (!s) return null;
  const keys = Object.keys(s.improv!.map).map((k) => k.split('|') as [string, string]);
  const fns = [...new Set(keys.map((k) => k[0]))];
  const modes = [...new Set(keys.map((k) => k[1]))];
  return { fns, modes, cell: (fn, mode) => s.improv!.map[`${fn}|${mode}`] ?? null };
}

/** The Ear course: an area's level over time (0..1). */
export const levelSeries = (snaps: Snapshot[], area: string): Point[] => snaps.filter((s) => s.level?.[area] !== undefined).map((s) => ({ day: s.day, v: s.level![area] }));

// ---------------------------------------------------------------- the weekly summary (§5)

export interface WeeklyChange {
  kind: 'minutes' | 'closed' | 'tempo';
  area: string;
  now: number;
  prev: number;
  pts: Point[];
}
export interface WeeklySummary {
  tiles: Tile[];
  /** The one series where the change was largest this week, with its last 14 days. */
  change: WeeklyChange | null;
  sentence: string;
}

/**
 * The weekly summary (SPEC-PROGRESS-CHARTS §5): the 4 tiles, the chart where the change was largest (minutes per kind,
 * closed per area, the tempo index per area — the biggest relative move of a real size), and one sentence of fact.
 */
export function weeklySummary(all: Record<string, Snapshot>, today: string, areaName: (a: string) => string, lang: 'he' | 'en'): WeeklySummary {
  const tiles = weekTiles(all, today);
  const s = sorted(all);
  const last14 = s.filter((x) => x.day > addDays(today, -14) && x.day <= today);
  const thisW = s.filter((x) => x.day > addDays(today, -7) && x.day <= today);
  const lastW = s.filter((x) => x.day > addDays(today, -14) && x.day <= addDays(today, -7));
  const before = (d: string) => s.filter((x) => x.day <= d).at(-1);
  const cands: (WeeklyChange & { score: number })[] = [];
  for (const k of new Set(last14.flatMap((x) => Object.keys(x.minutes)))) {
    const sum = (xs: Snapshot[]) => Math.round(xs.reduce((n, x) => n + (x.minutes[k] ?? 0), 0));
    const now = sum(thisW), prev = sum(lastW);
    if (Math.abs(now - prev) >= 10) cands.push({ kind: 'minutes', area: k, now, prev, pts: last14.map((x) => ({ day: x.day, v: x.minutes[k] ?? 0 })), score: Math.abs(now - prev) / Math.max(10, prev) });
  }
  for (const a of new Set(last14.flatMap((x) => Object.keys(x.status)))) {
    const c = (x?: Snapshot) => x?.status[a]?.closed ?? 0;
    const now = c(thisW.at(-1)) - c(before(addDays(today, -7)));
    const prev = c(before(addDays(today, -7))) - c(before(addDays(today, -14)));
    if (Math.abs(now - prev) >= 2) cands.push({ kind: 'closed', area: a, now, prev, pts: last14.map((x) => ({ day: x.day, v: c(x) })), score: Math.abs(now - prev) / Math.max(2, prev) });
    const tn = thisW.at(-1)?.tempo[a], tp = lastW.at(-1)?.tempo[a];
    if (tn !== undefined && tp !== undefined && Math.abs(tn - tp) >= 0.05)
      cands.push({ kind: 'tempo', area: a, now: Math.round(tn * 100), prev: Math.round(tp * 100), pts: last14.filter((x) => x.tempo[a] !== undefined).map((x) => ({ day: x.day, v: x.tempo[a] })), score: Math.abs(tn - tp) / Math.max(0.1, tp) });
  }
  cands.sort((x, y) => y.score - x.score);
  const change = cands[0] ? (({ score: _s, ...c }) => c)(cands[0]) : null;
  const he = lang === 'he';
  const mins = tiles.find((x) => x.id === 'minutes')!.now;
  const days = tiles.find((x) => x.id === 'days')!.now;
  let sentence: string;
  if (!change) sentence = he ? `השבוע ${mins} דקות ב־${days} ימי אימון.` : `This week: ${mins} minutes on ${days} practice days.`;
  else {
    const name = areaName(change.area);
    const up = change.now > change.prev;
    if (change.kind === 'minutes') sentence = he ? `${name}: ${change.now} דקות השבוע, ${up ? 'יותר' : 'פחות'} מ־${change.prev} בשבוע שעבר.` : `${name}: ${change.now} minutes this week, ${up ? 'up' : 'down'} from ${change.prev}.`;
    else if (change.kind === 'closed') sentence = he ? `${name}: ${change.now} נסגרו השבוע, לעומת ${change.prev} בשבוע שעבר.` : `${name}: ${change.now} closed this week, against ${change.prev} last week.`;
    else sentence = he ? `${name}: ${change.now}% מטמפו היעד, לעומת ${change.prev}% לפני שבוע.` : `${name}: ${change.now}% of the target tempo, from ${change.prev}% a week ago.`;
  }
  return { tiles, change, sentence };
}

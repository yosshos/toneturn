// The teacher's class charts (docs/SPEC-PROGRESS-CHARTS.md §4), from the students' synced daily snapshots and the
// class's assignments. Pure: the screens draw what these return.
// - the class median per day (tempo index and minutes): the grey reference line on a student's charts (§4.1);
// - minutes a day against what the teacher asked (§4.1);
// - one assignment across the class: the median and the quartile band, students below the band named (§4.2);
// - the tempo spread on an assignment: one dot per student, % of the target (§4.2);
// - the areas of the class: the average per area beside the change this month (§4.2);
// - the parent digest's simple version: the week tiles, the calendar, the week's minutes (§4.2).

import type { Snapshot } from './snapshot';
import { burnup, type BurnAssign } from './burnup';

export interface StudentSnapsLike {
  id: string;
  name: string;
  snaps: Record<string, Snapshot>;
}

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const mins = (s: Snapshot) => Object.values(s.minutes).reduce((a, b) => a + b, 0);
const tempoMean = (s: Snapshot) => {
  const v = Object.values(s.tempo);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** The q-quantile of a list (linear interpolation; q in 0..1). */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** The class median per day from `from` (students with a snapshot that day): the mean tempo index and the minutes. */
export function classMedianOf(students: StudentSnapsLike[], from: string, today: string): { day: string; tempo: number; minutes: number }[] {
  const out: { day: string; tempo: number; minutes: number }[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const day = students.map((s) => s.snaps[d]).filter((x): x is Snapshot => !!x);
    if (day.length < 2) continue;
    const t = day.map(tempoMean).filter((x): x is number => x !== null);
    out.push({ day: d, tempo: Math.round(quantile(t, 0.5) * 1000) / 1000, minutes: Math.round(quantile(day.map(mins), 0.5) * 10) / 10 });
  }
  return out;
}

/** A student's minutes per day over the last `n` days (0 for a day without a snapshot), oldest first. */
export function minutesPerDay(snaps: Record<string, Snapshot>, today: string, n = 14): { day: string; v: number }[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1)).map((day) => ({ day, v: snaps[day] ? Math.round(mins(snaps[day])) : 0 }));
}

/** What the teacher asked per day: the largest "minutes a day" among the open assignments (null when none asked). */
export function askedMinutes(opts: Record<string, { minutes: number | null } | undefined>, assignments: { id: string; dueOn: string | null }[], today: string): number | null {
  const xs = assignments.filter((a) => !a.dueOn || a.dueOn >= today).map((a) => opts[a.id]?.minutes ?? null).filter((x): x is number => x !== null && x > 0);
  return xs.length ? Math.max(...xs) : null;
}

export interface AssignSpread {
  days: string[];
  median: number[];
  q1: number[];
  q3: number[];
  /** Students below the lower quartile on the last day (named beside the chart). */
  outside: string[];
}

/** One assignment across the class (§4.2): each student's share closed per day → the median and the quartile band. */
export function assignmentSpread(a: BurnAssign, students: { id: string; name: string }[], today: string): AssignSpread | null {
  if (students.length < 2) return null;
  const per = students.map((s) => ({ s, b: burnup(a, today, s.id) }));
  const days = per[0].b.pts.map((p) => p.day).filter((d) => d <= today);
  if (days.length < 2) return null;
  const share = (b: ReturnType<typeof burnup>, d: string) => (b.pts.find((p) => p.day === d)?.v ?? 0) / Math.max(1, b.total);
  const median: number[] = [], q1: number[] = [], q3: number[] = [];
  for (const d of days) {
    const xs = per.map((x) => share(x.b, d));
    median.push(quantile(xs, 0.5));
    q1.push(quantile(xs, 0.25));
    q3.push(quantile(xs, 0.75));
  }
  const last = days[days.length - 1];
  const lo = q1[q1.length - 1];
  const outside = per.filter((x) => share(x.b, last) < lo - 1e-9).map((x) => x.s.name);
  return { days, median, q1, q3, outside };
}

/** The tempo spread on an assignment (§4.2): per student the best submitted tempo ÷ the target (else the best score). */
export function tempoSpread(a: BurnAssign & { targetBpm?: number | null }, students: { id: string; name: string }[]): { id: string; name: string; v: number }[] {
  const out: { id: string; name: string; v: number }[] = [];
  for (const s of students) {
    const subs = a.submissions.filter((x) => x.userId === s.id);
    if (!subs.length) continue;
    const bpm = Math.max(0, ...subs.map((x) => Number((x.metrics as { bpm?: unknown } | undefined)?.bpm ?? 0)).filter((x) => Number.isFinite(x)));
    const v = a.targetBpm && bpm > 0 ? bpm / a.targetBpm : Math.max(0, ...subs.map((x) => x.score ?? 0));
    out.push({ id: s.id, name: s.name, v: Math.round(v * 1000) / 1000 });
  }
  return out;
}

/** The share closed in an area of one snapshot (closed ÷ every item counted there). */
const closedShare = (s: Snapshot | undefined, area: string): number | null => {
  const st = s?.status[area];
  if (!st) return null;
  const n = Object.values(st).reduce((a, b) => a + (b ?? 0), 0);
  return n ? (st.closed ?? 0) / n : null;
};

/**
 * The areas of the class (§4.2): per area the class average of the share closed in each student's latest snapshot,
 * and the change this month (against each student's snapshot from 30 days before, or their first). At most 8 areas,
 * the most common first.
 */
export function classAreas(students: StudentSnapsLike[], today: string): { id: string; v: number; change: number | null }[] {
  const latest = students.map((s) => Object.values(s.snaps).filter((x) => x.day <= today).sort((a, b) => a.day.localeCompare(b.day)));
  const count = new Map<string, number>();
  for (const xs of latest) for (const a of Object.keys(xs.at(-1)?.status ?? {})) count.set(a, (count.get(a) ?? 0) + 1);
  const areas = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a]) => a);
  const cut = addDays(today, -30);
  return areas.map((area) => {
    const now: number[] = [], then: number[] = [];
    for (const xs of latest) {
      const n = closedShare(xs.at(-1), area);
      if (n === null) continue;
      now.push(n);
      const before = xs.filter((x) => x.day <= cut).at(-1) ?? xs[0];
      const t = before && before !== xs.at(-1) ? closedShare(before, area) : null;
      if (t !== null) then.push(t);
    }
    const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    return { id: area, v: now.length ? Math.round(avg(now) * 1000) / 1000 : 0, change: then.length ? Math.round((avg(now) - avg(then)) * 1000) / 1000 : null };
  });
}

/** The parent digest's calendar: minutes per day from the snapshots. */
export const minutesByDay = (snaps: Record<string, Snapshot>): Record<string, number> => Object.fromEntries(Object.values(snaps).map((s) => [s.day, Math.round(mins(s))]));

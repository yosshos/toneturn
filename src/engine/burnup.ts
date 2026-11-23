// The assignment burn-up and the teacher's alerts (docs/SPEC-PROGRESS-CHARTS.md §3, §4.1; BUILD-PLAN-2026-11 phase 8).
//
// Burn-up (§3, §4.1): per assignment, items closed out of the assignment's items, over time, against a due-date
// marker. Conservative reading of "the assignment's items" (the spec leaves it open): a phrase assignment's items are
// its required keys (each key passed at the assignment's strictness is one item, its first passing submission the day
// it closed); every other kind is one item, closed by its first passing submission.
//
// Alerts (§4.1), each with its small chart:
// - "practised N days out of 14" when N ≤ 3 — the minutes line of the last 14 days;
// - "stuck at the limit for 3 sessions" — the item's tempo line with its ceiling (snapshot.stuck).
// Pure.

import type { Snapshot, StuckItem } from './snapshot';
import { decodePhraseRef, submissionKey } from './encore/assign';

export type Strictness = 'lenient' | 'moderate' | 'strict';
/** The pass share per strictness (cloud/teacher.ts PASS — repeated here so the engine stays free of the cloud client). */
export const PASS_AT: Record<Strictness, number> = { lenient: 0.6, moderate: 0.75, strict: 0.9 };

export interface BurnSub {
  userId?: string;
  createdAt: string;
  score: number | null;
  metrics?: Record<string, unknown>;
}
export interface BurnAssign {
  id: string;
  kind: string;
  ref: string | null;
  dueOn: string | null;
  strictness: Strictness;
  createdAt: string;
  submissions: BurnSub[];
}

export interface Burnup {
  /** The assignment's items (a phrase: its required keys; otherwise 1). */
  total: number;
  /** Closed so far. */
  done: number;
  /** The first day (the assignment's day), the due day (null = none), and the last day of the axis. */
  start: string;
  due: string | null;
  end: string;
  /** Cumulative items closed per day, from start to end (one point a day). */
  pts: { day: string; v: number }[];
}

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

/** One student's burn-up on one assignment (`userId` filters the submissions; omit for a student's own list). */
export function burnup(a: BurnAssign, today: string, userId?: string): Burnup {
  const subs = a.submissions.filter((s) => !userId || s.userId === userId);
  const pass = PASS_AT[a.strictness] ?? PASS_AT.moderate;
  const phrase = a.kind === 'phrase' ? decodePhraseRef(a.ref) : null;
  const req = phrase ? (phrase.plan.keys === 'all' ? Array.from({ length: 12 }, (_, k) => k) : phrase.plan.keys) : null;
  // the day each item closed
  const closedOn: string[] = [];
  if (req) {
    const first = new Map<number, string>();
    for (const s of [...subs].sort((x, y) => x.createdAt.localeCompare(y.createdAt))) {
      const k = submissionKey(s.metrics);
      if (!k || s.score === null || s.score < pass || !req.includes(k.key) || first.has(k.key)) continue;
      first.set(k.key, s.createdAt.slice(0, 10));
    }
    closedOn.push(...first.values());
  } else {
    const ok = subs.filter((s) => s.score !== null && s.score >= pass).map((s) => s.createdAt.slice(0, 10)).sort();
    if (ok.length) closedOn.push(ok[0]);
  }
  const total = req ? req.length : 1;
  const start = a.createdAt.slice(0, 10);
  const due = a.dueOn ? a.dueOn.slice(0, 10) : null;
  const end = [today, due ?? today, ...closedOn].sort().at(-1)!;
  const pts: { day: string; v: number }[] = [];
  for (let d = start, guard = 0; d <= end && guard < 400; d = addDays(d, 1), guard++) pts.push({ day: d, v: closedOn.filter((c) => c <= d).length });
  return { total, done: closedOn.length, start, due, end, pts };
}

export type Alert =
  | { kind: 'few-days'; days: number; of: number; pts: { day: string; v: number }[] }
  | { kind: 'stuck'; item: StuckItem };

/** At most this many practice days in the last 14 raises the alert (the spec's example: 3 out of 14). */
export const FEW_DAYS = 3;
export const ALERT_WINDOW = 14;

/** A student's alerts from their snapshots (the teacher's page). Nothing for a student with no snapshot at all. */
export function alertsOf(snaps: Record<string, Snapshot>, today: string): Alert[] {
  const all = Object.values(snaps).sort((a, b) => a.day.localeCompare(b.day));
  if (!all.length) return [];
  const from = addDays(today, -ALERT_WINDOW + 1);
  const byDay = new Map(all.map((s) => [s.day, s]));
  const pts: { day: string; v: number }[] = [];
  let days = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const s = byDay.get(d);
    const m = s ? Math.round(Object.values(s.minutes).reduce((a, b) => a + b, 0)) : 0;
    if (s?.practised) days++;
    pts.push({ day: d, v: m });
  }
  const out: Alert[] = [];
  // a student who joined less than two weeks ago is not "behind" on days that came before them
  const joinedInWindow = all[0].day > from;
  if (days <= FEW_DAYS && !joinedInWindow) out.push({ kind: 'few-days', days, of: ALERT_WINDOW, pts });
  const last = all.filter((s) => s.day <= today).at(-1);
  for (const item of last?.stuck ?? []) out.push({ kind: 'stuck', item });
  return out;
}

/** The alert's one line (the teacher reads it beside the student's name). */
export function alertLine(a: Alert, lang: 'he' | 'en', itemName: (id: string) => string = (id) => id): string {
  const he = lang === 'he';
  if (a.kind === 'few-days') return he ? `התאמנ/ה ${a.days} ימים מתוך ${a.of}` : `Practised ${a.days} days out of ${a.of}`;
  return he ? `תקוע/ה בגבול כבר 3 אימונים: ${itemName(a.item.id)}` : `Stuck at the limit for 3 sessions: ${itemName(a.item.id)}`;
}

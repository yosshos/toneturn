// The daily practice session (docs/SPEC-PRACTICE-SESSION.md §2, §7, §8). Pure.
//
// - The session record: one per workout that reached its end (or was ended early), the last 500 kept, with all-time
//   totals and records beside them (Progress.sessions / Progress.sessionTotals).
// - The daily length and practice days a week (settings), and the weekly goal they make.
// - Today's run and today's edits belong to the day AND the course: switching course mid-day keeps each apart.

import type { CourseId } from './courses';
import type { DomainId } from './rating';
import type { Block, BlockTarget, WorkoutRun } from './workout2';
import { weekStart } from './practiceTime';

/** 'plan', one of the course's areas, or (§12) a key, an exercise, an item, a family or the course's other share
 *  (improvise / repertoire / grooves / licks) — workout2.parseFocus. */
export type SessionFocus = 'plan' | DomainId | `${'key' | 'rung' | 'item' | 'family' | 'mode'}:${string}`;

export interface SessionRecord {
  id: string;
  /** The practice day (the run's day: until 04:00 yesterday's unfinished run continues). */
  day: string;
  course: CourseId;
  focus: SessionFocus;
  plannedMin: number;
  /** Active time only (the run's per-block active ms). */
  activeMs: number;
  blocks: { kind: string; ms: number; items: number; correct: number }[];
  /** Reached the end screen (also "End" early). */
  finished: boolean;
  /** §11.6: active ms of the takes in the stretch band ("18 of them outside your comfort zone"). */
  stretchMs?: number;
}

export interface SessionTotals {
  /** Sessions finished since the start. */
  finished: number;
  totalMs: number;
  longestMs: number;
  bestWeek?: { week: string; ms: number };
  bestMonth?: { month: string; ms: number };
}

export const KEEP_SESSIONS = 500;

// ---------------------------------------------------------------- settings (§7)

export const DAILY = { def: 30, min: 5, max: 180, step: 5 } as const;
export const WEEK_DAYS = { def: 5, min: 3, max: 7 } as const;
/** The card's length chips (§2); "…" opens a 5–180 stepper. */
export const LENGTH_CHIPS = [10, 20, 30, 45, 60, 90] as const;
/** The intake's question (§7). */
export const INTAKE_MINUTES = [10, 20, 30, 45, 60] as const;

/** Any number → a daily length: 5–180 in steps of 5. */
export const clampDaily = (n: number): number => (Number.isFinite(n) ? Math.max(DAILY.min, Math.min(DAILY.max, Math.round(n / DAILY.step) * DAILY.step)) : DAILY.def);
export const dailyMinutesOf = (s: { dailyMinutes?: number }): number => clampDaily(s.dailyMinutes ?? DAILY.def);
export const practiceDaysOf = (s: { practiceDays?: number }): number => {
  const n = Math.round(s.practiceDays ?? WEEK_DAYS.def);
  return Number.isFinite(n) ? Math.max(WEEK_DAYS.min, Math.min(WEEK_DAYS.max, n)) : WEEK_DAYS.def;
};
/** §6: minutes a week = daily length × practice days a week. */
export const weeklyGoalMin = (s: { dailyMinutes?: number; practiceDays?: number }): number => dailyMinutesOf(s) * practiceDaysOf(s);

// ---------------------------------------------------------------- the record (§8)

// (workout2's targetKey, kept here so progress.ts does not load the workout engine)
const kindOf = (t: BlockTarget): string =>
  t.kind === 'area' ? `area:${t.area}` : t.kind === 'skill' ? `skill:${t.skill}` : t.kind === 'topic' ? `topic:${t.topic}` : t.kind === 'game' ? `game:${t.game}` : t.kind === 'key' ? `key:${t.root}:${t.group}` : t.kind === 'rung' ? `rung:${t.group}:${t.rung}` : t.kind === 'item' ? `item:${t.id}` : t.kind === 'family' ? `family:${t.family}` : t.kind;

/** A run → its record (the course and focus from the run, else the given ones). */
export function sessionRecordOf(r: WorkoutRun, fallback: { course: CourseId; id?: string }): SessionRecord {
  const blocks = r.blocks.map((b) => {
    const [items, correct] = r.items[b.id] ?? [0, 0];
    return { kind: kindOf(b.target), ms: Math.round(r.used[b.id] ?? 0), items, correct };
  });
  const course = r.course ?? fallback.course;
  return {
    id: r.id ?? fallback.id ?? `${r.day}:${course}`,
    day: r.day,
    course,
    focus: (r.focus ?? 'plan') as SessionFocus,
    plannedMin: r.planned ?? r.blocks.reduce((a, b) => a + b.minutes, 0),
    activeMs: blocks.reduce((a, b) => a + b.ms, 0),
    blocks,
    finished: !!r.finished,
    ...(r.bandMs ? { stretchMs: Math.round(r.bandMs.stretch) } : {}),
  };
}

/** Add a record (once per id): the last 500 kept; the totals and records from the start. */
export function addSessionRecord(sessions: readonly SessionRecord[] | undefined, totals: SessionTotals | undefined, rec: SessionRecord): { sessions: SessionRecord[]; totals: SessionTotals } {
  const list = sessions ?? [];
  const t0: SessionTotals = totals ?? { finished: 0, totalMs: 0, longestMs: 0 };
  if (list.some((x) => x.id === rec.id)) return { sessions: [...list], totals: t0 };
  const next = [...list, rec].slice(-KEEP_SESSIONS);
  const week = weekStart(rec.day);
  const month = rec.day.slice(0, 7);
  const weekMs = next.filter((x) => weekStart(x.day) === week).reduce((a, x) => a + x.activeMs, 0);
  const monthMs = next.filter((x) => x.day.startsWith(month)).reduce((a, x) => a + x.activeMs, 0);
  const t: SessionTotals = {
    finished: t0.finished + (rec.finished ? 1 : 0),
    totalMs: t0.totalMs + rec.activeMs,
    longestMs: Math.max(t0.longestMs, rec.finished ? rec.activeMs : 0),
    ...(t0.bestWeek || weekMs > 0 ? { bestWeek: t0.bestWeek && t0.bestWeek.ms >= weekMs ? t0.bestWeek : { week, ms: weekMs } } : {}),
    ...(t0.bestMonth || monthMs > 0 ? { bestMonth: t0.bestMonth && t0.bestMonth.ms >= monthMs ? t0.bestMonth : { month, ms: monthMs } } : {}),
  };
  return { sessions: next, totals: t };
}

/** Totals from two devices / a rebuild: the larger of each (never added twice). */
export function mergeSessionTotals(a: SessionTotals | undefined, b: SessionTotals | undefined): SessionTotals | undefined {
  if (!a || !b) return a ?? b;
  const best = <T extends { ms: number }>(x?: T, y?: T) => (!x ? y : !y ? x : x.ms >= y.ms ? x : y);
  const bw = best(a.bestWeek, b.bestWeek);
  const bm = best(a.bestMonth, b.bestMonth);
  return { finished: Math.max(a.finished, b.finished), totalMs: Math.max(a.totalMs, b.totalMs), longestMs: Math.max(a.longestMs, b.longestMs), ...(bw ? { bestWeek: bw } : {}), ...(bm ? { bestMonth: bm } : {}) };
}

/** Two session lists: union by id, oldest first, the last 500. */
export function mergeSessions(a: readonly SessionRecord[] | undefined, b: readonly SessionRecord[] | undefined): SessionRecord[] | undefined {
  if (!a?.length || !b?.length) return a?.length ? [...a] : b?.length ? [...b] : undefined;
  const byId = new Map<string, SessionRecord>();
  for (const x of [...b, ...a]) byId.set(x.id, x);
  return [...byId.values()].sort((x, y) => x.day.localeCompare(y.day)).slice(-KEEP_SESSIONS);
}

/** Days a session was finished (the badges' workoutDays: "weekly-ritual", "iron-routine"). */
export const workoutDaysOf = (sessions: readonly SessionRecord[] | undefined): string[] => [...new Set((sessions ?? []).filter((x) => x.finished).map((x) => x.day))].sort();

// ---------------------------------------------------------------- today, by course (§2)

/** Today's own edits (Settings.workoutToday): the blocks per course; `blocks` is the shape before 0.131 (no course). */
export interface TodayEdits {
  day: string;
  /** Before the per-course key: one list for the day (read as the active course's). */
  blocks?: Block[];
  byCourse?: Partial<Record<CourseId, Block[]>>;
  /** The card's focus per course today (absent = my plan). */
  focus?: Partial<Record<CourseId, SessionFocus>>;
}

/** The course's own edits today, or null. */
export function todayEditsFor(wt: TodayEdits | undefined, day: string, course: CourseId): Block[] | null {
  if (!wt || wt.day !== day) return null;
  if (wt.byCourse) return wt.byCourse[course] ?? null;
  return wt.blocks ?? null;
}
export const todayFocusFor = (wt: TodayEdits | undefined, day: string, course: CourseId): SessionFocus => (wt && wt.day === day ? (wt.focus?.[course] ?? 'plan') : 'plan');

/**
 * Write (or clear, with null) one course's edits for today; the other courses' edits today are kept. An old list
 * without a course is taken as this course's (it was written in the course that is active now). `focus` undefined keeps
 * the course's focus; 'plan' clears it.
 */
export function withTodayEdits(wt: TodayEdits | undefined, day: string, course: CourseId, blocks: Block[] | null, focus?: SessionFocus): TodayEdits | undefined {
  const same = wt && wt.day === day ? wt : undefined;
  const byCourse: Partial<Record<CourseId, Block[]>> = { ...(same?.byCourse ?? (same?.blocks ? { [course]: same.blocks } : {})) };
  if (blocks) byCourse[course] = blocks;
  else delete byCourse[course];
  const fo: Partial<Record<CourseId, SessionFocus>> = { ...(same?.focus ?? {}) };
  if (focus === 'plan') delete fo[course];
  else if (focus) fo[course] = focus;
  if (!Object.keys(byCourse).length && !Object.keys(fo).length) return undefined;
  return { day, byCourse, ...(Object.keys(fo).length ? { focus: fo } : {}) };
}

/** The resume slot of today's run in a course. */
export const runSlotKey = (day: string, course: CourseId): string => `workout:${day}:${course}`;
/** The day-only slot before 0.131. */
export const legacyRunSlotKey = (day: string): string => `workout:${day}`;
/**
 * Today's run in a course from its keyed slot, else from the old day-only slot when that run was the course's (an old
 * run without a course is the active course's: it was started there).
 */
export function pickRun(keyed: WorkoutRun | null | undefined, legacy: WorkoutRun | null | undefined, course: CourseId): WorkoutRun | null {
  if (keyed && (!keyed.course || keyed.course === course)) return keyed;
  if (legacy && (!legacy.course || legacy.course === course)) return { ...legacy, course };
  return null;
}

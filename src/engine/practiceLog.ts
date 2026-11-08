// Practice log (SPEC-0.48 §P1): practice done away from the app (a piece, technique, a band rehearsal …) counts
// toward the streak, practice time and — a little — XP. Stored as an ordinary lesson result so it syncs like
// everything else: lessonId "log:<kind>", total = minutes, no rated items. Pure.

import type { LessonResult } from '../storage/progress';

export const LOG_KINDS = ['piece', 'technique', 'reading', 'improv', 'ear', 'rehearsal', 'other'] as const;
export type LogKind = (typeof LOG_KINDS)[number];

export const LOG_NAME: Record<LogKind, { en: string; he: string }> = {
  piece: { en: 'A piece / song', he: 'יצירה / שיר' },
  technique: { en: 'Technique', he: 'טכניקה' },
  reading: { en: 'Sight-reading', he: 'קריאה מדף' },
  improv: { en: 'Improvising', he: 'אלתור' },
  ear: { en: 'Ear training', he: 'פיתוח שמיעה' },
  rehearsal: { en: 'Rehearsal / lesson', he: 'חזרה / שיעור' },
  other: { en: 'Other', he: 'אחר' },
};

export const LOG_MINUTES = [10, 15, 20, 30, 45, 60, 90] as const;
/** ⚙ 1 XP per 2 minutes, at most 20 XP a day from the log (self-reported, so it stays small next to graded play). */
export const LOG_XP_PER_DAY = 20;

export const isLog = (lessonId: string) => lessonId.startsWith('log:');
export const logKind = (lessonId: string): LogKind | null => (isLog(lessonId) ? ((LOG_KINDS as readonly string[]).includes(lessonId.slice(4)) ? (lessonId.slice(4) as LogKind) : 'other') : null);
/** Minutes of a log result (0 for anything else). */
export const logMinutes = (r: Pick<LessonResult, 'lessonId' | 'total'>) => (isLog(r.lessonId) ? Math.max(0, Math.min(600, r.total)) : 0);

/** XP for a new entry, given the log XP already earned on that local day. */
export const logXp = (minutes: number, xpToday: number) => Math.max(0, Math.min(Math.floor(minutes / 2), LOG_XP_PER_DAY - xpToday));

export function makeLogResult(kind: LogKind, minutes: number, xpToday: number, now: Date, id: string): LessonResult & { durationMs: number } {
  const m = Math.max(1, Math.min(600, Math.round(minutes)));
  return {
    lessonId: `log:${kind}`,
    lessonVersion: 1,
    sessionId: `log-${id}`,
    completedAt: now.toISOString(),
    firstTry: 0,
    total: m,
    xp: logXp(m, xpToday),
    missed: [],
    durationMs: m * 60000,
  };
}

/** Log XP already earned on a local day (from the history). */
export function logXpOn(history: LessonResult[], day: string, dayOf: (iso: string) => string): number {
  return history.filter((h) => isLog(h.lessonId) && dayOf(h.completedAt) === day).reduce((a, h) => a + h.xp, 0);
}

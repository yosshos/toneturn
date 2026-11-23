// Small per-device logs the workout keeps (SPEC-WORKOUT §9.4): the minutes each area with waiting path steps got per
// day (for "Rhythm keeps waiting" — 3 of the last 5 days), when that question was dismissed, and which path steps were
// finished inside a workout (the path's "in workout" note). localStorage only; a blocked storage just shows nothing.

import type { DomainId } from '../engine/rating';
import type { AreaDayLog } from '../engine/workout2';

const get = <T,>(k: string, dflt: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : dflt;
  } catch {
    return dflt;
  }
};
const set = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode */
  }
};

const AREA_KEY = 'toneturn.workoutAreaDays';
export const readAreaLog = (): AreaDayLog => get<AreaDayLog>(AREA_KEY, {});
/** Today's minutes per waiting area (the last write of the day wins; 10 days kept). */
export function logAreaDay(day: string, mins: Partial<Record<DomainId, number>>): void {
  const log = readAreaLog();
  const prev = JSON.stringify(log[day] ?? null);
  const next = Object.fromEntries(Object.entries(mins).map(([a, m]) => [a, Math.round((m ?? 0) * 10) / 10]));
  if (prev === JSON.stringify(next)) return;
  log[day] = next;
  const keep = Object.keys(log).sort().slice(-10);
  set(AREA_KEY, Object.fromEntries(keep.map((d) => [d, log[d]])));
}

/** W10: today's context (no mic / quiet place / no instrument), kept for the day — a reload keeps it. */
const CTX_KEY = 'toneturn.workoutCtx';
export type DayCtx = { nomic: boolean; quiet: boolean; noinst: boolean };
export function readDayCtx(day: string, dflt: DayCtx): DayCtx {
  const v = get<(DayCtx & { day?: string }) | null>(CTX_KEY, null);
  return v && v.day === day ? { nomic: !!v.nomic, quiet: !!v.quiet, noinst: !!v.noinst } : dflt;
}
export const saveDayCtx = (day: string, c: DayCtx) => set(CTX_KEY, { ...c, day });

const ASK_KEY = 'toneturn.waitAsked';
/** Areas whose "keeps waiting" question is dismissed, until a day. */
export const waitAsked = (): Partial<Record<DomainId, string>> => get(ASK_KEY, {});
export const setWaitAsked = (a: DomainId, until: string) => set(ASK_KEY, { ...waitAsked(), [a]: until });

const STEPS_KEY = 'toneturn.stepsInWorkout';
/** A path step finished inside a workout (kept for the path's "in workout" note; at most 400 ids). */
export function noteStepInWorkout(id: string): void {
  const ids = get<string[]>(STEPS_KEY, []);
  if (ids.includes(id)) return;
  set(STEPS_KEY, [...ids, id].slice(-400));
}
let stepsCache: { at: number; ids: Set<string> } | null = null;
/** The steps finished in a workout (read at most once a second: the path asks per node). */
export function stepsInWorkout(): Set<string> {
  const now = Date.now();
  if (!stepsCache || now - stepsCache.at > 1000) stepsCache = { at: now, ids: new Set(get<string[]>(STEPS_KEY, [])) };
  return stepsCache.ids;
}

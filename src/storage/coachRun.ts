// Practice resumes where it stopped (owner 2026-11-25: "a player can stop in the middle and the system continues the same
// day from where they stopped"). Every continuous run — a family's coach, a key session, today's technique, a block of the
// daily session — keeps its coach state here after each take (and when the screen closes): the ladder it walks (the
// family as it was built, so a ladder rebuilt from newer items can't shift its steps), the coach's state (step, stage,
// tempo, note value, passed stages, the closing), the session's XP, takes and new bests. Opening the same run again the
// same day continues it; a run from another day is dropped (the stages passed stay on their items, per key). A list run
// (a level, an item and its keys) keeps its place in the list the same way.
import type { FamilyDef } from '../engine/drills/generate';
import { coachTake, type CoachState } from '../engine/drills/coach';
import { specDrills } from '../engine/drills/plan';
import type { DrillSettings, ItemState } from '../engine/drills/types';
import { APP_VERSION } from '../version';

const KEY = 'toneturn.coachRun.v1';
const QKEY = 'toneturn.queueRun.v1';
/** At most this many runs are kept (the oldest goes first). */
const MAX_RUNS = 6;
const MAX_QUEUES = 12;

export interface CoachSave {
  /** Which run: `fam:<inst>:<family>`, `key:<inst>:<group>:<root>`, `today:<inst>`, `block:<session>:<block>`. */
  key: string;
  /** The local day it belongs to ('YYYY-MM-DD'). */
  day: string;
  /** When it was saved (ms): the time away is not counted against the session's length. */
  savedAt: number;
  /** The app version that saved it: after an update (its ladders may have changed) a run is not continued. */
  ver?: string;
  fam: FamilyDef;
  state: CoachState;
  xp: number;
  takes: number;
  clean: number;
  bests: { title: string; bpm: number; unit: string }[];
  /** SPEC-PRACTICE-INTELLIGENCE P1: the session's take traces so far (its end line pools them; never lost on a reload). */
  traces?: import('../engine/drills/tendency').TakeTrace[];
}

const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

/** The local day ('YYYY-MM-DD'). */
export const localDayOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readRuns(day: string): CoachSave[] {
  try {
    const list = JSON.parse(ls()?.getItem(KEY) ?? '[]') as CoachSave[];
    return (Array.isArray(list) ? list : []).filter((v) => v && typeof v.key === 'string' && v.day === day && v.ver === APP_VERSION && v.fam?.levels?.length && v.state && Array.isArray(v.state.steps));
  } catch {
    return [];
  }
}
function writeRuns(list: CoachSave[]): void {
  try {
    ls()?.setItem(KEY, JSON.stringify(list.slice(0, MAX_RUNS)));
  } catch {
    // storage full: keep the newest only
    try {
      ls()?.setItem(KEY, JSON.stringify(list.slice(0, 1)));
    } catch {
      /* blocked: nothing to resume, no harm */
    }
  }
}

/** Keep a run (merge-safe: read, replace this key, write; other days drop out). */
export function saveCoachRun(v: Omit<CoachSave, 'savedAt' | 'ver'>, now = Date.now()): void {
  writeRuns([{ ...v, savedAt: now, ver: APP_VERSION }, ...readRuns(v.day).filter((x) => x.key !== v.key)]);
}
/** Today's saved run of this key, or null (another day's never comes back). */
export function loadCoachRun(key: string, day = localDayOf()): CoachSave | null {
  return readRuns(day).find((x) => x.key === key) ?? null;
}
export const hasCoachRun = (key: string, day = localDayOf()): boolean => !!loadCoachRun(key, day);
export function clearCoachRun(key: string, day = localDayOf()): void {
  const all = readRuns(day);
  if (all.some((x) => x.key === key)) writeRuns(all.filter((x) => x.key !== key));
}

/**
 * The coach state to continue with: the session's clocks moved on by the time away (its length, the visit's budget and
 * the closing count the time played, not the pause). A copy — the saved one is left as it is.
 */
export function resumedState(v: CoachSave, now = Date.now()): CoachState {
  const away = Math.max(0, now - v.savedAt);
  const s = JSON.parse(JSON.stringify(v.state)) as CoachState;
  s.startedAt += away;
  if (s.ks) s.ks.visitAt += away;
  return s;
}

/** Can this saved run still be played (every level of its ladder builds, and the take it asks for)? A run saved before a
 *  content change may not: it is dropped and a fresh session starts — never a blank screen. */
export function coachRunPlayable(v: CoachSave, items: Record<string, ItemState>, order: DrillSettings['keyOrder']): boolean {
  try {
    const ids = new Set(v.fam.levels.map((l) => l.id));
    if (!v.state.steps.every((id) => ids.has(id))) return false;
    for (const l of v.fam.levels) l.specs.forEach((_, k) => specDrills(l, k, order));
    const t = coachTake(v.fam, resumedState(v), items, order);
    return !!t?.drill?.notes;
  } catch {
    return false;
  }
}

// ---- list runs (a level, an item and its keys): the place in the list ----
interface QueueSave {
  key: string;
  day: string;
  i: number;
  /** The list itself (its items): a list rebuilt differently later can't move the place, and a block's list comes back as it was. */
  ids?: string[];
}
function readQueues(day: string): QueueSave[] {
  try {
    const list = JSON.parse(ls()?.getItem(QKEY) ?? '[]') as QueueSave[];
    return (Array.isArray(list) ? list : []).filter((v) => v && typeof v.key === 'string' && v.day === day && Number.isInteger(v.i) && v.i >= 0);
  } catch {
    return [];
  }
}
function writeQueues(list: QueueSave[]): void {
  try {
    ls()?.setItem(QKEY, JSON.stringify(list.slice(0, MAX_QUEUES)));
  } catch {
    /* blocked */
  }
}
/** A list run's key: the instrument and its items (the same list opened again is the same run). */
export function queueRunKey(inst: string, itemIds: string[]): string {
  let h = 0;
  const s = itemIds.join('|');
  for (let k = 0; k < s.length; k++) h = (Math.imul(h, 31) + s.charCodeAt(k)) | 0;
  return `q:${inst}:${itemIds.length}:${(h >>> 0).toString(36)}`;
}
export function saveQueueAt(key: string, i: number, day = localDayOf(), ids?: string[]): void {
  writeQueues([{ key, day, i, ...(ids ? { ids } : {}) }, ...readQueues(day).filter((x) => x.key !== key)]);
}
/** Today's place in this list — only for the same list (when `ids` are given and the save holds its list). */
export function loadQueueAt(key: string, day = localDayOf(), ids?: string[]): number | null {
  const v = readQueues(day).find((x) => x.key === key);
  if (!v) return null;
  if (ids && v.ids && (v.ids.length !== ids.length || v.ids.some((x, k) => x !== ids[k]))) return null;
  return v.i;
}
/** Today's saved list of a block (its items, in order), or null. */
export function loadQueueIds(key: string, day = localDayOf()): string[] | null {
  return readQueues(day).find((x) => x.key === key)?.ids ?? null;
}
export function clearQueueAt(key: string, day = localDayOf()): void {
  const all = readQueues(day);
  if (all.some((x) => x.key === key)) writeQueues(all.filter((x) => x.key !== key));
}

// ---- the run that was open on the technique screen (a reload lands back on it) ----
const OPEN_KEY = 'toneturn.drillsOpen.v1';
export interface OpenRun {
  key: string;
  day: string;
  ladder?: boolean;
  /** A run of today's session (a block, today's technique): it reopens through the session, not on its own. */
  session?: boolean;
  /** Where Back goes after the reload: the key page it was opened from (its root). */
  backKey?: number;
  /** Today's technique opened from the technique screen (not from the session): it reopens there. */
  today?: boolean;
}
export function saveOpenRun(v: Omit<OpenRun, 'day'>, day = localDayOf()): void {
  try {
    ls()?.setItem(OPEN_KEY, JSON.stringify({ ...v, day }));
  } catch {
    /* blocked */
  }
}
export function loadOpenRun(day = localDayOf()): OpenRun | null {
  try {
    const v = JSON.parse(ls()?.getItem(OPEN_KEY) ?? 'null') as OpenRun | null;
    return v && v.day === day && typeof v.key === 'string' ? v : null;
  } catch {
    return null;
  }
}
export function clearOpenRun(): void {
  try {
    ls()?.removeItem(OPEN_KEY);
  } catch {
    /* blocked */
  }
}

/** The stores a fresh start clears (freshStart.ts). */
export const COACH_RUN_KEYS = [KEY, QKEY, OPEN_KEY] as const;

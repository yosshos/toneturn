// Saved places (playtesting, 0.35.2): the back button, a swipe back, a reload or closing the app used to throw a
// lesson away — Find my level included. After every answer the session is kept here, one slot per lesson / topic /
// level; opening the same thing again continues it, and the home screen offers the latest unfinished one.
import type { LessonDef } from '../engine/lesson';
import type { SessionState } from '../engine/session';

const KEY = 'toneturn.resume.v2';
const OLD_PLACEMENT_KEY = 'toneturn.placement.resume.v1';
/** Older than this, a saved session starts over (levels may have moved on). */
const MAX_AGE_MS = 14 * 24 * 3600 * 1000;
/** At most this many unfinished sessions are kept (the oldest goes first). */
const MAX_SLOTS = 8;
export const PLACEMENT_KEY = 'placement';

export interface SavedSession {
  key: string;
  /** What it is, in the player's language, for the "continue" card. */
  title: string;
  /** Find my level's seed (its staircase regenerates from it). */
  seed?: number;
  lesson: LessonDef;
  records: SessionState['records'];
  index: number;
  xp: number;
  savedAt: string;
}
/** Kept for the placement callers. */
export type SavedPlacement = SavedSession;

const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

function readAll(now = Date.now()): SavedSession[] {
  try {
    const list = JSON.parse(ls()?.getItem(KEY) ?? '[]') as SavedSession[];
    return (Array.isArray(list) ? list : []).filter(
      (v) => v?.lesson?.questions?.length && v.records?.length === v.lesson.questions.length && now - new Date(v.savedAt).getTime() <= MAX_AGE_MS,
    );
  } catch {
    return [];
  }
}
function writeAll(list: SavedSession[]) {
  try {
    ls()?.setItem(KEY, JSON.stringify(list.slice(0, MAX_SLOTS)));
  } catch {
    // Storage full: keep fewer.
    try {
      ls()?.setItem(KEY, JSON.stringify(list.slice(0, 2)));
    } catch {
      /* blocked: nothing to resume, no harm */
    }
  }
}

export function saveSession(key: string, title: string, s: SessionState, seed?: number): void {
  // Nothing answered yet: nothing worth keeping.
  if (!s.records.some((r) => r.outcome !== 'pending' || r.attempts.length)) return;
  const v: SavedSession = { key, title, ...(seed !== undefined ? { seed } : {}), lesson: s.lesson, records: s.records, index: s.index, xp: s.xp, savedAt: new Date().toISOString() };
  writeAll([v, ...readAll().filter((x) => x.key !== key)]);
}
export function loadSession(key: string, now = Date.now()): SavedSession | null {
  return readAll(now).find((x) => x.key === key) ?? null;
}
export function clearSession(key: string): void {
  writeAll(readAll().filter((x) => x.key !== key));
}
/** The most recent unfinished session other than these keys (for the home card). */
export function latestSession(except: string[] = []): SavedSession | null {
  return readAll().find((x) => !except.includes(x.key)) ?? null;
}

// ---- Find my level (its own card) ----
export function savePlacement(seed: number, s: SessionState, title = 'Find my level'): void {
  saveSession(PLACEMENT_KEY, title, s, seed);
}
export function loadPlacement(now = Date.now()): SavedSession | null {
  migrateOld();
  const v = loadSession(PLACEMENT_KEY, now);
  return v && v.seed !== undefined ? v : null;
}
export const clearPlacement = () => clearSession(PLACEMENT_KEY);

/** 0.35.2 first stored the placement on its own key. */
function migrateOld() {
  try {
    const raw = ls()?.getItem(OLD_PLACEMENT_KEY);
    if (!raw) return;
    ls()?.removeItem(OLD_PLACEMENT_KEY);
    const v = JSON.parse(raw) as Omit<SavedSession, 'key' | 'title'>;
    if (v?.lesson?.questions?.length && !readAll().some((x) => x.key === PLACEMENT_KEY)) writeAll([{ ...v, key: PLACEMENT_KEY, title: 'Find my level' }, ...readAll()]);
  } catch {
    /* ignore */
  }
}

/** How far a session got: answered of all questions (placement: sections done of all). */
export function sessionProgressOf(v: SavedSession): { answered: number; total: number } {
  return { answered: v.records.filter((r) => r.outcome !== 'pending').length, total: v.lesson.questions.length };
}
export function placementProgressOf(v: SavedSession): { answered: number; sections: number; doneSections: number } {
  const answered = v.records.filter((r) => r.outcome !== 'pending').length;
  const sections = (v.lesson.placementSkills ?? []).filter((k) => !(v.lesson.placementSkipped ?? []).includes(k));
  const seen = new Set<string>();
  v.lesson.questions.forEach((q, i) => {
    const m = /^p:([a-z-]+):/.exec(q.id);
    if (m && v.records[i]?.outcome !== 'pending') seen.add(m[1]);
  });
  // The section in progress is not done yet.
  const cur = /^p:([a-z-]+):/.exec(v.lesson.questions[v.index]?.id ?? '')?.[1];
  const doneSections = [...seen].filter((k) => k !== cur && sections.includes(k as never)).length;
  return { answered, sections: sections.length, doneSections };
}

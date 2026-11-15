// The practice clock and ledger on this device (AUDIT-5 §4 #1–#3): engine/practiceTime.ts measures, this keeps it.
//
// - The clock runs while a practice screen is open and visible, and pauses 60 s after the last input (taps, keys,
//   MIDI notes, notes heard by the microphone — the input bus in engine/inputCheck.ts).
// - What it measured is booked when a take, a lesson or a game run is recorded (ProgressStore calls the hooks below),
//   so the time lands on that item, key and quality class; time left on a screen without a take goes to the screen's
//   kind when the player leaves it.
// - Never lose progress: the ledger is written at every booking, and the time not yet booked every few seconds, so a
//   reload or a closed tab loses at most a few seconds.
// The ledger is local (localStorage). Result durations and notes ride on the lesson results (see sync.ts).

import { onInput } from '../engine/inputCheck';
import type { CourseId } from '../engine/courses';
import {
  addNote,
  bookItem,
  bookTime,
  clockInput,
  clockLap,
  clockTick,
  defaultQuality,
  drillTakeQuality,
  kindOfRoute,
  lessonQuality,
  markBooked,
  measuredMsOn,
  migrateLedger,
  newClock,
  removeNote,
  STREAK_MIN_MS,
  type BucketParts,
  type Clock,
  type PlateauTry,
  type PracticeKind,
  type PracticeLedger,
  type Quality,
} from '../engine/practiceTime';
import { isLog, logMinutes } from '../engine/practiceLog';
import type { ItemState } from '../engine/drills/types';

const KEY = 'toneturn.practice.v1';
const PENDING_KEY = 'toneturn.practice.pending';
/** A segment left on a screen waits this long for a take recorded just after leaving it (a lesson's last answer). */
const TAIL_MS = 6000;

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ls = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

let ledger: PracticeLedger | null = null;
let clock: Clock = newClock(Date.now());
let course: CourseId | '' = '';
let route: string | null = null;
/** The last screen's unbooked time, kept a few seconds for a take recorded right after leaving it. */
let tail: { kind: PracticeKind; course: CourseId | ''; ms: number; timer: ReturnType<typeof setTimeout> | null } | null = null;
const listeners = new Set<() => void>();
const dayListeners = new Set<(day: string) => void>();
let notifiedDay = '';

export function loadLedger(): PracticeLedger {
  if (ledger) return ledger;
  let raw: unknown = null;
  try {
    raw = JSON.parse(ls()?.getItem(KEY) ?? 'null');
  } catch {
    raw = null;
  }
  ledger = migrateLedger(raw, localDay(new Date()));
  return ledger;
}

function commit(next: PracticeLedger) {
  ledger = next;
  try {
    ls()?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or private mode: the ledger lives for this run */
  }
  listeners.forEach((l) => l());
  const today = localDay(new Date());
  if (notifiedDay !== today && measuredMsOn(next, today) >= STREAK_MIN_MS) {
    notifiedDay = today;
    dayListeners.forEach((l) => l(today));
  }
}

/** Re-render on any change (the diary, the activity tiles). */
export function subscribePractice(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
/** Today reached the measured minutes that make it a practice day (the app marks the streak day). */
export function onMeasuredDay(cb: (day: string) => void): () => void {
  dayListeners.add(cb);
  return () => void dayListeners.delete(cb);
}

/** Pending time (not yet booked) → storage, so a reload books it. */
function persistPending() {
  const ms = clock.pending + (tail?.ms ?? 0);
  const kind = clock.kind ?? tail?.kind ?? null;
  try {
    if (ms > 0 && kind) ls()?.setItem(PENDING_KEY, JSON.stringify({ kind, course: clock.kind ? course : (tail?.course ?? course), ms: Math.round(ms), day: localDay(new Date()) }));
    else ls()?.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function bookDefault(kind: PracticeKind, c: CourseId | '', ms: number, day = localDay(new Date())) {
  if (ms <= 0) return;
  commit(bookTime(loadLedger(), day, { course: c, kind, q: defaultQuality(kind) }, ms));
}

function flushTail() {
  if (!tail) return;
  if (tail.timer) clearTimeout(tail.timer);
  const t = tail;
  tail = null;
  bookDefault(t.kind, t.course, t.ms);
  persistPending();
}

/** The open screen and course (App calls this on every route / course change). */
export function setPracticeContext(nextRoute: string, nextCourse: CourseId | undefined | null) {
  const kind = kindOfRoute(nextRoute);
  if (nextRoute === route && (nextCourse ?? '') === course) return;
  // Leaving a practice screen: its unbooked time waits a moment for a late take, then goes to the screen's kind.
  if (nextRoute !== route && clock.kind && clock.pending > 0) {
    flushTail();
    const [c, ms] = clockLap(clock);
    clock = c;
    tail = { kind: clock.kind!, course, ms, timer: setTimeout(flushTail, TAIL_MS) };
  }
  route = nextRoute;
  course = nextCourse ?? '';
  clock = { ...clock, kind };
  persistPending();
}

/** What was measured since the last booking (and the last screen's tail, if a take claims it now). */
export function lapPractice(): { ms: number; kind: PracticeKind | null; course: CourseId | '' } {
  const [c, ms] = clockLap(clock);
  clock = c;
  let extra = 0;
  let kind = clock.kind;
  if (tail) {
    if (tail.timer) clearTimeout(tail.timer);
    extra = tail.ms;
    kind = kind ?? tail.kind;
    tail = null;
  }
  persistPending();
  return { ms: ms + extra, kind, course };
}

let installed = false;
/** Start the clock (once, from the app). Returns a stop function (tests). */
export function installPracticeClock(): () => void {
  if (installed || typeof window === 'undefined') return () => {};
  installed = true;
  loadLedger();
  // A reload or a closed tab: book the time measured before it.
  try {
    const p = JSON.parse(ls()?.getItem(PENDING_KEY) ?? 'null') as { kind: PracticeKind; course: CourseId | ''; ms: number; day: string } | null;
    if (p && p.ms > 0 && p.kind) bookDefault(p.kind, p.course ?? '', Math.min(p.ms, 4 * 3600_000), p.day);
    ls()?.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
  clock = { ...newClock(Date.now()), kind: clock.kind };
  const poke = () => (clock = clockInput(clock, Date.now()));
  const evs = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
  evs.forEach((e) => window.addEventListener(e, poke, { passive: true, capture: true }));
  const offInput = onInput(() => poke());
  let n = 0;
  const id = window.setInterval(() => {
    clock = clockTick(clock, Date.now(), typeof document === 'undefined' || document.visibilityState === 'visible');
    if (++n % 5 === 0) persistPending();
  }, 1000);
  const hide = () => {
    clock = clockTick(clock, Date.now(), true);
    persistPending();
  };
  const vis = () => {
    if (document.visibilityState === 'hidden') hide();
    // Coming back: the time away is not practice.
    else clock = { ...clock, lastTick: Date.now() };
  };
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('pagehide', hide);
  return () => {
    installed = false;
    clearInterval(id);
    evs.forEach((e) => window.removeEventListener(e, poke, { capture: true }));
    offInput();
    document.removeEventListener('visibilitychange', vis);
    window.removeEventListener('pagehide', hide);
  };
}

// ------------------------------------------------------------------ hooks (ProgressStore)

const today = () => localDay(new Date());
function book(parts: Omit<BucketParts, 'course' | 'kind'> & { kind?: PracticeKind }, item?: { id: string; c: number; of?: number; n?: number; bpm?: number }): number {
  const lap = lapPractice();
  const kind = parts.kind ?? lap.kind ?? 'game';
  let l = loadLedger();
  const d = today();
  if (lap.ms > 0) l = bookTime(l, d, { course: lap.course, kind, skill: parts.skill, key: parts.key, q: parts.q }, lap.ms);
  if (item) l = bookItem(l, item.id, d, { c: item.c, of: item.of, n: item.n, bpm: item.bpm, ms: lap.ms });
  commit(l);
  return lap.ms;
}

/** A drill take (recordDrill): time and cleanness on the item, its family and key. */
export function bookDrillTake(state: ItemState, prev: ItemState | undefined, verdict: string | undefined) {
  const clean = verdict === 'clean';
  const d = today();
  const last = state.history[state.history.length - 1];
  const bpm = clean && last && localDay(new Date(last.at)) === d ? last.bpm : undefined;
  const q: Quality = drillTakeQuality(state, clean, prev?.goalBpm ?? state.goalBpm);
  book({ kind: 'technique', skill: state.family, key: state.key, q }, { id: `d:${state.itemId}`, c: clean ? 1 : 0, bpm });
}

type ResultLike = { sessionId: string; lessonId: string; firstTry: number; total: number; durationMs?: number; note?: string; course?: CourseId; items?: { skill: string }[] };

/** A finished lesson / vocal session / practice-log entry. Returns the result with its measured duration. */
export function bookResult<R extends ResultLike>(r: R, masteredBefore: boolean): R {
  let l = loadLedger();
  if (l.booked.includes(r.sessionId)) return r;
  if (isLog(r.lessonId)) {
    // Off-app minutes (the practice log, the workout's off-app block). The piece coach's minutes were measured by
    // the clock on its own screen, so they are not booked twice.
    if (!r.sessionId.startsWith('piece-')) l = bookTime(l, today(), { course: r.course ?? course, kind: 'offapp', skill: r.lessonId.slice(4), q: 'offapp' }, logMinutes(r) * 60000);
    if (r.note) l = addNote(l, { id: `r:${r.sessionId}`, at: new Date().toISOString(), day: today(), text: r.note, src: r.sessionId.startsWith('wk-') ? 'workout' : 'log', ...(r.course ? { course: r.course } : {}) });
    commit(markBooked(l, r.sessionId));
    return r;
  }
  const skills = new Map<string, number>();
  for (const it of r.items ?? []) skills.set(it.skill, (skills.get(it.skill) ?? 0) + 1);
  const skill = [...skills.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const ms = book({ kind: r.lessonId.startsWith('vocal') ? 'vocal' : 'lesson', skill, q: lessonQuality(r, masteredBefore) }, { id: `l:${r.lessonId}`, c: r.firstTry, of: Math.max(1, r.total) });
  commit(markBooked(loadLedger(), r.sessionId));
  return ms > 0 && !r.durationMs ? { ...r, durationMs: ms } : r;
}

/** A game run: time on the game; a run at a tier not yet cleared is edge work. */
export function bookGameRun(game: string, x: { right?: number; of?: number; pass?: boolean; edge?: boolean }) {
  const of = x.of && x.of > 0 ? x.of : 1;
  const c = x.right !== undefined ? x.right : x.pass ? 1 : 0;
  book({ kind: 'game', skill: game, q: x.edge ? 'edge' : 'run' }, { id: `g:${game}`, c: Math.min(c, of), of });
}

// ------------------------------------------------------------------ the journal

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
export function addJournalNote(text: string, opts: { next?: boolean; course?: CourseId | null; day?: string } = {}): PracticeLedger {
  const d = opts.day ?? today();
  commit(addNote(loadLedger(), { id: newId(), at: new Date().toISOString(), day: d, text, src: 'diary', ...(opts.next ? { next: true } : {}), ...(opts.course ? { course: opts.course } : {}) }));
  return loadLedger();
}
export function deleteJournalNote(id: string): PracticeLedger {
  commit(removeNote(loadLedger(), id));
  return loadLedger();
}
/** The player took a plateau suggestion (the next one rotates; a later gain shows as "broke through"). */
export function recordPlateauTry(t: Omit<PlateauTry, 'at'>) {
  const l = loadLedger();
  commit({ ...l, tries: [...(l.tries ?? []), { ...t, at: new Date().toISOString() }].slice(-100) });
}

/** Tests: reset the module state. */
export function _resetPractice(l?: PracticeLedger) {
  ledger = l ?? null;
  clock = newClock(Date.now());
  route = null;
  course = '';
  if (tail?.timer) clearTimeout(tail.timer);
  tail = null;
  notifiedDay = '';
}
/** Tests: add measured time to the clock as if the player had been active. */
export function _addPending(ms: number, kind: PracticeKind = 'technique') {
  clock = { ...clock, kind, pending: clock.pending + ms };
}

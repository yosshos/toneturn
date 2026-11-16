// Practice time and quality ledger (AUDIT-5 §4 #1–#2). Pure.
//
// Time: an active clock runs only while a practice screen is open and visible, and pauses 60 s after the last input
// (a tap, a key, a MIDI note, a sung or played note on the microphone). What it measures is booked into a ledger by
// day × bucket, where a bucket names the course, the kind of practice, the skill (drill family / skill / game), the
// key (drills) and the quality class of that time.
//
// Quality (AUDIT-5 #2), from data the app already has:
//   edge          an item below its goal, with errors being fixed (a take below the level tempo, a lesson not yet
//                 mastered, a tier not yet cleared);
//   consolidation clean reps at the goal (a clean take at the level tempo, a mastered lesson done again cleanly);
//   run           run-throughs (play-alongs, free play, games at a cleared tier, tools);
//   review        spaced review (the review queue, refreshing a faded item);
//   offapp        minutes logged away from the app (self-reported or timed by the workout's off-app block) — never
//                 "measured practice" for the streak.
//
// The ledger also keeps, per item and day, how clean the takes were (the quality ledger), and the player's notes.

import type { CourseId } from './courses';

export const IDLE_MS = 60_000;
/** A tick never adds more than this (a throttled background timer must not book a long gap). */
export const MAX_STEP_MS = 2_000;
/** A day counts as a practice day (streak) with this much measured in-app time, even without a recorded take. */
export const STREAK_MIN_MS = 5 * 60_000;
/** Days kept in the time ledger and the item ledger. */
export const KEEP_DAYS = 400;
export const KEEP_ITEM_DAYS = 90;
export const KEEP_ITEMS = 400;
export const KEEP_NOTES = 600;
export const NOTE_MAX = 500;

export const QUALITIES = ['edge', 'consolidation', 'review', 'run', 'offapp'] as const;
export type Quality = (typeof QUALITIES)[number];
export const KINDS = ['lesson', 'technique', 'game', 'ear', 'vocal', 'song', 'chart', 'piece', 'improv', 'tool', 'offapp'] as const;
export type PracticeKind = (typeof KINDS)[number];

/** Quality minutes = edge + consolidation (deliberate practice). */
export const isQuality = (q: Quality) => q === 'edge' || q === 'consolidation';

// ------------------------------------------------------------------ routes → kinds

/** Screens that are not practice (menus, lists, settings, reading, the tuner). Anything else counts as a game. */
const NOT_PRACTICE = new Set([
  'intake', 'studio', 'home', 'path', 'arcade', 'settings', 'diagnostics', 'games', 'friends', 'skills', 'achievements', 'learned',
  'repertoire', 'workout', 'workoutrun', 'insights', 'welcome', 'coursestart', 'plans', 'admin', 'land', 'tuner', 'mixer', 'classes', 'exams',
  'depth', 'chordfinder', 'duel', 'diary', 'recordings',
  // Encore v2: the teacher's phrase sheet and the student's assignment page (the practice itself runs in Encore)
  'teach',
]);
const ROUTE_KIND: Record<string, PracticeKind> = {
  lesson: 'lesson', daily: 'lesson', puzzle: 'lesson',
  drills: 'technique', licks: 'technique',
  vocal: 'vocal', singalong: 'vocal', perform: 'vocal', singinterval: 'vocal', holdnote: 'vocal',
  mysong: 'song', playback: 'song', slowdown: 'song', songs: 'song',
  charts: 'chart', pieces: 'piece', improv: 'improv',
  transcribe: 'ear', 'transcribe-coach': 'ear',
  metronome: 'tool', drone: 'tool', chordbuilder: 'tool',
};
/** The kind of practice a screen is, or null when the screen is not practice (the clock does not run there). */
export function kindOfRoute(route: string | null | undefined): PracticeKind | null {
  if (!route || NOT_PRACTICE.has(route)) return null;
  return ROUTE_KIND[route] ?? 'game';
}
/** Time left on a screen without a recorded take: its usual quality. */
export const defaultQuality = (k: PracticeKind): Quality => (k === 'offapp' ? 'offapp' : k === 'lesson' || k === 'technique' || k === 'ear' || k === 'vocal' ? 'edge' : 'run');

// ------------------------------------------------------------------ the active clock

export interface Clock {
  /** The practice kind of the open screen (null = not a practice screen). */
  kind: PracticeKind | null;
  /** Measured, not yet booked. */
  pending: number;
  lastTick: number;
  lastInput: number;
}
export const newClock = (now: number): Clock => ({ kind: null, pending: 0, lastTick: now, lastInput: now });
/** One tick: adds the time since the last tick while a practice screen is visible and the player is active. */
export function clockTick(c: Clock, now: number, visible: boolean): Clock {
  const step = Math.max(0, Math.min(MAX_STEP_MS, now - c.lastTick));
  const active = visible && c.kind !== null && now - c.lastInput <= IDLE_MS;
  return { ...c, lastTick: now, pending: c.pending + (active ? step : 0) };
}
/** Any input (a tap, a key, a MIDI note, a mic frame with a note). Back from idle, the clock restarts at the input. */
export const clockInput = (c: Clock, now: number): Clock => ({ ...c, lastInput: now, ...(now - c.lastInput > IDLE_MS ? { lastTick: now } : {}) });
/** Take what was measured (to book it); the clock keeps running. */
export const clockLap = (c: Clock): [Clock, number] => [{ ...c, pending: 0 }, Math.round(c.pending)];

// ------------------------------------------------------------------ buckets

export interface BucketParts {
  course?: CourseId | '';
  kind: PracticeKind;
  /** Drill family, rating skill, game id or lesson id's area — whatever names the skill. */
  skill?: string;
  /** Key (pitch class 0–11) for drills. */
  key?: number | null;
  q: Quality;
}
export const bucketKey = (b: BucketParts) => [b.course ?? '', b.kind, (b.skill ?? '').replace(/\|/g, '/'), b.key === null || b.key === undefined ? '' : String(((b.key % 12) + 12) % 12), b.q].join('|');
export function parseBucket(k: string): BucketParts & { course: CourseId | '' } {
  const [course, kind, skill, key, q] = k.split('|');
  return { course: (course || '') as CourseId | '', kind: (kind || 'game') as PracticeKind, skill: skill || undefined, key: key === '' || key === undefined ? null : Number(key), q: (q || 'run') as Quality };
}

// ------------------------------------------------------------------ the ledger

/** How clean an item's takes were on one day (the quality ledger). */
export interface ItemDay {
  d: string;
  /** Takes / sessions / runs. */
  n: number;
  /** Clean takes (drills), correct first tries (lessons), passed runs (games). */
  c: number;
  /** Out of (lessons: questions; drills and games: = n). */
  of: number;
  /** Best clean tempo that day (drills). */
  b?: number;
  /** Active time on the item that day. */
  ms: number;
}

export interface JournalNote {
  id: string;
  /** ISO time written. */
  at: string;
  /** The local day it belongs to. */
  day: string;
  text: string;
  /** "What next" — the line the player writes for the next session. */
  next?: boolean;
  /** Where it came from: the diary, the workout's off-app block, the practice log. */
  src?: 'diary' | 'workout' | 'log';
  course?: CourseId;
}

/** A suggestion the player took on a plateau (the next one rotates; a later gain shows as "broke through"). */
export interface PlateauTry {
  id: string;
  at: string;
  how: string;
  /** The measure when tried (clean tempo, rating). */
  base: number;
}

export interface PracticeLedger {
  v: 1;
  /** First day the clock ran on this device (days before it keep the old streak rule). */
  since: string;
  /** day → bucket → ms */
  days: Record<string, Record<string, number>>;
  /** item id ("d:<drill item>", "l:<lesson>", "g:<game>") → recent days, oldest first. */
  items: Record<string, ItemDay[]>;
  notes: JournalNote[];
  /** Result session ids already booked (idempotent). */
  booked: string[];
  tries?: PlateauTry[];
}

export const emptyLedger = (today: string): PracticeLedger => ({ v: 1, since: today, days: {}, items: {}, notes: [], booked: [] });

/** Any stored value → a valid ledger (older shapes, a corrupt store). */
export function migrateLedger(raw: unknown, today: string): PracticeLedger {
  if (!raw || typeof raw !== 'object') return emptyLedger(today);
  const r = raw as Partial<PracticeLedger>;
  return {
    v: 1,
    since: typeof r.since === 'string' ? r.since : today,
    days: r.days && typeof r.days === 'object' ? r.days : {},
    items: r.items && typeof r.items === 'object' ? r.items : {},
    notes: Array.isArray(r.notes) ? r.notes : [],
    booked: Array.isArray(r.booked) ? r.booked : [],
    ...(Array.isArray(r.tries) ? { tries: r.tries } : {}),
  };
}

const trimDays = <T>(o: Record<string, T>, keep: number): Record<string, T> => {
  const ks = Object.keys(o).sort();
  if (ks.length <= keep) return o;
  const out = { ...o };
  for (const k of ks.slice(0, ks.length - keep)) delete out[k];
  return out;
};

export function bookTime(l: PracticeLedger, day: string, b: BucketParts, ms: number): PracticeLedger {
  if (!(ms > 0)) return l;
  const k = bucketKey(b);
  const d = { ...(l.days[day] ?? {}) };
  d[k] = (d[k] ?? 0) + Math.round(ms);
  return { ...l, days: trimDays({ ...l.days, [day]: d }, KEEP_DAYS) };
}

/** One take / session / run on an item: its cleanness that day. */
export function bookItem(l: PracticeLedger, id: string, day: string, x: { n?: number; c: number; of?: number; bpm?: number; ms?: number }): PracticeLedger {
  const prev = l.items[id] ?? [];
  const last = prev[prev.length - 1];
  const n = x.n ?? 1;
  const of = x.of ?? n;
  const add = (e: ItemDay): ItemDay => ({ d: day, n: e.n + n, c: e.c + x.c, of: e.of + of, ms: e.ms + Math.max(0, Math.round(x.ms ?? 0)), ...(x.bpm || e.b ? { b: Math.max(e.b ?? 0, x.bpm ?? 0) } : {}) });
  const row = last && last.d === day ? add(last) : add({ d: day, n: 0, c: 0, of: 0, ms: 0 });
  const list = (last && last.d === day ? [...prev.slice(0, -1), row] : [...prev, row]).slice(-KEEP_ITEM_DAYS);
  let items = { ...l.items, [id]: list };
  const ids = Object.keys(items);
  if (ids.length > KEEP_ITEMS) {
    // Keep the most recently practised items.
    const drop = ids.sort((a, b) => (items[a][items[a].length - 1]?.d ?? '').localeCompare(items[b][items[b].length - 1]?.d ?? '')).slice(0, ids.length - KEEP_ITEMS);
    items = { ...items };
    for (const k of drop) delete items[k];
  }
  return { ...l, items };
}

export function markBooked(l: PracticeLedger, sessionId: string): PracticeLedger {
  return { ...l, booked: [...l.booked, sessionId].slice(-400) };
}

export function addNote(l: PracticeLedger, n: Omit<JournalNote, 'text'> & { text: string }): PracticeLedger {
  const text = n.text.trim().slice(0, NOTE_MAX);
  if (!text || l.notes.some((x) => x.id === n.id)) return l;
  return { ...l, notes: [...l.notes, { ...n, text }].slice(-KEEP_NOTES) };
}
export const removeNote = (l: PracticeLedger, id: string): PracticeLedger => ({ ...l, notes: l.notes.filter((n) => n.id !== id) });

// ------------------------------------------------------------------ classification

/** A drill take's quality: below the level tempo (or not clean) = edge; clean at the level tempo = consolidation. */
export function drillTakeQuality(st: { cleanBpm: number; goalBpm: number; targetBpm?: number }, clean: boolean, bpm?: number): Quality {
  const target = st.targetBpm ?? 0;
  const at = bpm ?? st.goalBpm;
  if (clean && target > 0 && at >= 0.95 * target) return 'consolidation';
  return 'edge';
}

/** A finished lesson's quality: review sessions = review; a lesson already mastered and done cleanly = consolidation. */
export function lessonQuality(r: { lessonId: string; firstTry: number; total: number }, masteredBefore: boolean): Quality {
  if (/^review|review$|^refresh/.test(r.lessonId)) return 'review';
  if (r.lessonId === 'weekly-puzzle' || r.lessonId.startsWith('daily')) return 'run';
  const clean = r.total > 0 && r.firstTry / r.total >= 0.9;
  return masteredBefore && clean ? 'consolidation' : 'edge';
}

// ------------------------------------------------------------------ summaries

export interface TimeSummary {
  ms: number;
  /** In-app measured (everything but off-app). */
  inApp: number;
  offApp: number;
  quality: number;
  byQuality: Record<Quality, number>;
  byKind: Partial<Record<PracticeKind, number>>;
  byCourse: Partial<Record<CourseId | '', number>>;
  bySkill: Record<string, number>;
  /** "skill|key" → ms (drills only). */
  byKey: Record<string, number>;
  days: number;
}

export function summarize(l: PracticeLedger, from: string, to: string, course?: CourseId): TimeSummary {
  const s: TimeSummary = { ms: 0, inApp: 0, offApp: 0, quality: 0, byQuality: { edge: 0, consolidation: 0, review: 0, run: 0, offapp: 0 }, byKind: {}, byCourse: {}, bySkill: {}, byKey: {}, days: 0 };
  for (const [day, bs] of Object.entries(l.days)) {
    if (day < from || day > to) continue;
    let any = false;
    for (const [k, ms] of Object.entries(bs)) {
      const b = parseBucket(k);
      if (course && b.course && b.course !== course) continue;
      any = any || ms > 0;
      s.ms += ms;
      s.byQuality[b.q] += ms;
      if (b.q === 'offapp') s.offApp += ms;
      else s.inApp += ms;
      if (isQuality(b.q)) s.quality += ms;
      s.byKind[b.kind] = (s.byKind[b.kind] ?? 0) + ms;
      s.byCourse[b.course] = (s.byCourse[b.course] ?? 0) + ms;
      if (b.skill) s.bySkill[b.skill] = (s.bySkill[b.skill] ?? 0) + ms;
      if (b.skill && b.key !== null && b.key !== undefined) s.byKey[`${b.skill}|${b.key}`] = (s.byKey[`${b.skill}|${b.key}`] ?? 0) + ms;
    }
    if (any) s.days++;
  }
  return s;
}

/** Share of in-app time that was deliberate (edge + consolidation); null with under a minute measured. */
export const qualityRatio = (s: TimeSummary): number | null => (s.inApp >= 60_000 ? s.quality / s.inApp : null);

/** Total ms per day (in-app + off-app), for the activity numbers. */
export function msByDay(l: PracticeLedger): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [day, bs] of Object.entries(l.days)) out[day] = Object.values(bs).reduce((a, x) => a + x, 0);
  return out;
}

/** Measured in-app ms on a day, not counting tools (the metronome, the drone) — the streak's "measured minutes". */
export function measuredMsOn(l: PracticeLedger, day: string): number {
  let ms = 0;
  for (const [k, v] of Object.entries(l.days[day] ?? {})) {
    const b = parseBucket(k);
    if (b.q !== 'offapp' && b.kind !== 'tool') ms += v;
  }
  return ms;
}

/** Days with enough measured in-app time to count for the streak (AUDIT-5 #4). */
export const measuredDays = (l: PracticeLedger): string[] => Object.keys(l.days).filter((d) => measuredMsOn(l, d) >= STREAK_MIN_MS);

/** Monday of a local day's week (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * 86400000).toISOString().slice(0, 10);
}
export const addDay = (day: string, n: number): string => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10);
};

/** Week totals (Monday-based), newest last, for the last `n` weeks up to `today`. */
export function weekTotals(l: PracticeLedger, today: string, n: number, course?: CourseId): { week: string; ms: number; quality: number; inApp: number }[] {
  const out: { week: string; ms: number; quality: number; inApp: number }[] = [];
  const w0 = weekStart(today);
  for (let i = n - 1; i >= 0; i--) {
    const w = addDay(w0, -7 * i);
    const s = summarize(l, w, addDay(w, 6), course);
    out.push({ week: w, ms: s.ms, quality: s.quality, inApp: s.inApp });
  }
  return out;
}

/** A compact line for the AI weekly summary (measured data only). */
export function practiceDigest(l: PracticeLedger, today: string): { minutes: number; qualityMinutes: number; offAppMinutes: number; qualityShare: number | null; topSkills: string[]; lastWeekMinutes: number } {
  const w = weekStart(today);
  const s = summarize(l, w, today);
  const p = summarize(l, addDay(w, -7), addDay(w, -1));
  return {
    minutes: Math.round(s.ms / 60000),
    qualityMinutes: Math.round(s.quality / 60000),
    offAppMinutes: Math.round(s.offApp / 60000),
    qualityShare: qualityRatio(s) === null ? null : Math.round(qualityRatio(s)! * 100) / 100,
    topSkills: Object.entries(s.bySkill).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k),
    lastWeekMinutes: Math.round(p.ms / 60000),
  };
}

/** Stats days with the ledger's measured time (AUDIT-5 #1): per day the larger of the results' durations and the
 * ledger's total, so the "Practice time" tiles count lessons, technique, games, songs — not only logged minutes. */
export function withLedgerMs<T extends { ms: number }>(days: Record<string, T> | undefined, ledgerMs: Record<string, number>, blank: () => T): Record<string, T> | undefined {
  const keys = Object.keys(ledgerMs).filter((d) => ledgerMs[d] > (days?.[d]?.ms ?? 0));
  if (!keys.length) return days;
  const out: Record<string, T> = { ...(days ?? {}) };
  for (const d of keys) out[d] = { ...(out[d] ?? blank()), ms: ledgerMs[d] };
  return out;
}

// Local progress + settings. XP and completion writes are idempotent by event id,
// so a repeated callback or an app resume can never award points twice.

import type { InputMode, SessionState } from '../engine/session';
import { questionTag, type Answer } from '../engine/lesson';
import type { Naming } from '../engine/pitch';
import type { KV } from './kv';

export const PROGRESS_VERSION = 1;

export interface LessonResult {
  lessonId: string;
  lessonVersion: number;
  sessionId: string;
  completedAt: string; // ISO
  firstTry: number;
  total: number;
  xp: number;
  /** Question keys that were missed / revealed — feeds the review queue. */
  missed: { questionId: string; key: string; answer: Answer; given: Answer[] }[];
}

export interface Progress {
  version: number;
  xp: number;
  /** Event ids already applied (completion + per-question awards). */
  applied: string[];
  lessons: Record<string, { best: number; completions: number; lastAt: string }>;
  history: LessonResult[];
  streak: { count: number; lastDay: string | null };
  review: { lessonId?: string; questionId: string; key: string; answer: Answer; addedAt: string }[];
  /** Longest chains on this device in the memory games. */
  games?: { melody: number; rhythm: number };
}

export type NamingPref = 'auto' | Naming;
export type VoiceGender = 'any' | 'female' | 'male';

export interface Settings {
  version: number;
  mode: InputMode;
  uiLang: 'he' | 'en';
  inputLang: 'he' | 'en';
  outputLang: 'he' | 'en';
  /** auto = Hebrew → Do-Re-Mi, English → letters (per channel language). */
  naming: NamingPref;
  /** Preferred narration voice gender, used when no specific voice is chosen or it is missing. */
  voiceGender: VoiceGender;
  /** Chosen speechSynthesis voiceURI per narration language (null = automatic). */
  voices: { he: string | null; en: string | null };
  reducedMotion: boolean | null; // null = follow OS
  voiceConsent: boolean;
  /** Local hour for the streak reminder push. */
  reminderHour: number;
  /** Last app version whose changelog the player has seen. */
  seenVersion: string | null;
}

export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  mode: 'voice',
  uiLang: 'en',
  inputLang: 'en',
  outputLang: 'en',
  naming: 'auto',
  voiceGender: 'any',
  voices: { he: null, en: null },
  reducedMotion: null,
  voiceConsent: false,
  reminderHour: 19,
  seenVersion: null,
};

/** Effective note naming for a channel in a given language. */
export function namingFor(pref: NamingPref, lang: 'he' | 'en'): Naming {
  if (pref !== 'auto') return pref;
  return lang === 'he' ? 'solfege' : 'letter';
}

/** v1 stored only first-run defaults (Hebrew + letters); move them to the v2 defaults. */
export function migrateSettings(raw: Partial<Settings> | undefined): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  if (!raw.version || raw.version < 2) {
    return { ...DEFAULT_SETTINGS, mode: raw.mode ?? DEFAULT_SETTINGS.mode, voiceConsent: raw.voiceConsent ?? false, reducedMotion: raw.reducedMotion ?? null };
  }
  return { ...DEFAULT_SETTINGS, ...raw, voices: { ...DEFAULT_SETTINGS.voices, ...(raw.voices ?? {}) } };
}

export const emptyProgress = (): Progress => ({
  version: PROGRESS_VERSION,
  xp: 0,
  applied: [],
  lessons: {},
  history: [],
  streak: { count: 0, lastDay: null },
  review: [],
});

/** Local calendar day, YYYY-MM-DD (streaks follow the player's local midnight). */
export function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function bumpStreak(streak: Progress['streak'], now: Date): Progress['streak'] {
  const today = localDay(now);
  if (!streak.lastDay) return { count: 1, lastDay: today };
  const diff = dayDiff(streak.lastDay, today);
  if (diff <= 0) return streak; // same day (or clock went backwards)
  if (diff === 1) return { count: streak.count + 1, lastDay: today };
  return { count: 1, lastDay: today };
}

/** Streak as shown today: broken if the last practice day was before yesterday. */
export function visibleStreak(streak: Progress['streak'], now: Date): number {
  if (!streak.lastDay) return 0;
  return dayDiff(streak.lastDay, localDay(now)) <= 1 ? streak.count : 0;
}

export function resultFromSession(s: SessionState, sessionId: string, now: Date): LessonResult {
  const missed = s.records
    .map((r, i) => ({ r, q: s.lesson.questions[i] }))
    .filter(({ r }) => r.outcome === 'revealed' || r.outcome === 'correct-retry')
    .map(({ r, q }) => ({ questionId: q.id, key: questionTag(q), answer: q.answer, given: r.attempts.map((a) => a.answer) }));
  return {
    lessonId: s.lesson.id,
    lessonVersion: s.lesson.version,
    sessionId,
    completedAt: now.toISOString(),
    firstTry: s.records.filter((r) => r.outcome === 'correct').length,
    total: s.records.length,
    xp: s.xp,
    missed,
  };
}

/** Pure, idempotent application of a completed lesson. */
export function applyResult(p: Progress, r: LessonResult, now: Date): Progress {
  const eventId = `complete:${r.sessionId}`;
  if (p.applied.includes(eventId)) return p;
  const prev = p.lessons[r.lessonId];
  return {
    ...p,
    xp: p.xp + r.xp,
    applied: [...p.applied, eventId].slice(-500),
    lessons: {
      ...p.lessons,
      [r.lessonId]: {
        best: Math.max(prev?.best ?? 0, r.firstTry),
        completions: (prev?.completions ?? 0) + 1,
        lastAt: r.completedAt,
      },
    },
    history: [...p.history, r].slice(-100),
    streak: bumpStreak(p.streak, now),
    review: [
      ...p.review.filter((x) => !r.missed.some((m) => m.key === x.key && m.answer === x.answer)),
      ...r.missed.map((m) => ({ lessonId: r.lessonId, questionId: m.questionId, key: m.key, answer: m.answer, addedAt: r.completedAt })),
    ].slice(-50),
  };
}

export class ProgressStore {
  constructor(private kv: KV) {}

  async loadProgress(): Promise<Progress> {
    const p = await this.kv.get<Progress>('progress');
    return p && p.version === PROGRESS_VERSION ? p : emptyProgress();
  }

  async loadSettings(): Promise<Settings> {
    return migrateSettings(await this.kv.get<Partial<Settings>>('settings'));
  }

  /** Keep the longest chain per game (local only). */
  async recordGameBest(kind: 'melody' | 'rhythm', best: number): Promise<Progress> {
    const p = await this.loadProgress();
    const games = { melody: 0, rhythm: 0, ...(p.games ?? {}) };
    if (best <= games[kind]) return p;
    const next = { ...p, games: { ...games, [kind]: best } };
    await this.kv.set('progress', next);
    return next;
  }

  async saveProgress(p: Progress) {
    await this.kv.set('progress', p);
  }

  async saveSettings(s: Settings) {
    await this.kv.set('settings', s);
  }

  /** Read-modify-write; safe to call repeatedly for the same session. */
  async recordCompletion(r: LessonResult, now = new Date()): Promise<Progress> {
    const p = await this.loadProgress();
    const next = applyResult(p, r, now);
    if (next !== p) await this.kv.set('progress', next);
    return next;
  }
}

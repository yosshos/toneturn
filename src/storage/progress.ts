// Local progress + settings. XP and completion writes are idempotent by event id,
// so a repeated callback or an app resume can never award points twice.

import { outcomeOf, type InputMode, type SessionState } from '../engine/session';
import { ratingScore } from '../engine/scoring';
import { questionSkill, questionTag, type Answer } from '../engine/lesson';
import { foldRatings, SKILLS, type RatingEvent, type Ratings } from '../engine/rating';
import { medalFor, weekId, type Medal } from '../engine/adaptive';
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
  /** First-attempt results per rated item (ratings + review clearing). Absent on old results. */
  items?: { id: string; skill: RatingEvent['skill']; difficulty: number; correct: boolean; tag: string; score?: number; timeMs?: number | null }[];
  /** Weekly puzzle outcome (only for lessonId "weekly-puzzle"). */
  puzzle?: { week: string; band: string; medal: Medal };
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
  /** Rated first attempts (lessons) and solo game rounds (ids starting "g:"). */
  ratingEvents?: RatingEvent[];
  /** One Skill Map snapshot per week (normalised later), newest last. */
  snapshots?: { week: string; ratings: Partial<Record<RatingEvent['skill'], number>> }[];
  /** Weekly puzzle results, separate from lesson retries and XP. */
  puzzles?: Record<string, { band: string; medal: Medal; completedAt: string }>;
  /** Daily challenge: the first play of each local day (later plays are practice). */
  daily?: Record<string, { points: number; text: string }>;
}

export const ratingsOf = (p: Progress): Ratings => foldRatings(p.ratingEvents ?? []);

function snapshot(p: Progress, now: Date): Progress['snapshots'] {
  const r = ratingsOf(p);
  const week = weekId(now);
  const ratings: Partial<Record<RatingEvent['skill'], number>> = {};
  for (const k of SKILLS) if (r[k]?.n) ratings[k] = r[k]!.r;
  const rest = (p.snapshots ?? []).filter((s) => s.week !== week);
  return [...rest, { week, ratings }].slice(-26);
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
  /** Measured tap delay for Beat Echo, ms (positive = taps land late). */
  tapLatencyMs: number;
  /** Response time affects scores. null = automatic (untimed for the first days). */
  timedScoring: boolean | null;
  /** First time the app was used on this device (ISO). */
  firstUseAt: string | null;
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
  tapLatencyMs: 0,
  timedScoring: null,
  firstUseAt: null,
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
  const items = s.records
    .map((r, i) => ({ r, q: s.lesson.questions[i] }))
    .filter(({ r }) => r.attempts.length > 0) // skipped / never answered → not rated
    .map(({ r, q }) => {
      const o = outcomeOf(r, s.timed ?? false);
      const k = o.correctOn ?? 1;
      return {
        id: `${sessionId}:${q.id}`,
        skill: questionSkill(q),
        difficulty: q.difficulty,
        correct: r.attempts[0].correct,
        tag: questionTag(q),
        // Graded rating score: accuracy × attempts (guess-corrected) × time × replays (spec J.6).
        score: Math.round(ratingScore(q, o) * 1000) / 1000,
        timeMs: o.attempts[k - 1]?.timeMs ?? null,
      };
    })
    // Rhythm reading also measures rhythmic precision (spec G.1), on attempts whose pattern was right.
    .concat(
      s.records
        .map((r, i) => ({ r, q: s.lesson.questions[i] }))
        .filter(({ r, q }) => q.kind === 'rhythm-read' && r.attempts[0]?.correct && r.attempts[0].precision !== undefined)
        .map(({ r, q }) => ({
          id: `${sessionId}:${q.id}:timing`,
          skill: 'timing' as const,
          difficulty: q.difficulty,
          correct: (r.attempts[0].precision ?? 0) >= 0.5,
          tag: questionTag(q),
          score: Math.round((r.attempts[0].precision ?? 0) * 1000) / 1000,
          timeMs: null,
        })),
    );
  const result: LessonResult = {
    lessonId: s.lesson.id,
    lessonVersion: s.lesson.version,
    sessionId,
    completedAt: now.toISOString(),
    firstTry: s.records.filter((r) => r.outcome === 'correct').length,
    total: s.records.length,
    xp: s.xp,
    missed,
    items,
  };
  if (s.lesson.id === 'weekly-puzzle') {
    const qid = s.lesson.questions[0].id; // "<week>-<band>"
    const cut = qid.lastIndexOf('-');
    result.puzzle = { week: qid.slice(0, cut), band: qid.slice(cut + 1), medal: medalFor(s.records[0].outcome) };
  }
  return result;
}

/** Pure, idempotent application of a completed lesson. */
export function applyResult(p: Progress, r: LessonResult, now: Date): Progress {
  const eventId = `complete:${r.sessionId}`;
  if (p.applied.includes(eventId)) return p;
  const prev = p.lessons[r.lessonId];
  const at = r.completedAt;
  const newEvents: RatingEvent[] = (r.items ?? []).map((it) => ({ id: it.id, skill: it.skill, difficulty: it.difficulty, correct: it.correct, score: it.score, at }));
  const cleared = new Set((r.items ?? []).filter((it) => it.correct).map((it) => it.tag));
  const puzzles = { ...(p.puzzles ?? {}) };
  // Only the first scored try at a week's puzzle counts; later plays are practice.
  if (r.puzzle && !puzzles[r.puzzle.week]) puzzles[r.puzzle.week] = { band: r.puzzle.band, medal: r.puzzle.medal, completedAt: at };
  const withEvents: Progress = { ...p, ratingEvents: [...(p.ratingEvents ?? []), ...newEvents].slice(-3000), puzzles };
  return {
    ...withEvents,
    snapshots: snapshot(withEvents, now),
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
      // A tag answered right on the first try leaves the queue; a new miss replaces the old entry.
      ...p.review.filter((x) => !cleared.has(x.key) && !r.missed.some((m) => m.key === x.key && m.answer === x.answer)),
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

  /** Rate solo memory-game rounds (local; ids "g:<seed>:<turn>" so each round counts once). */
  async recordGameRounds(
    kind: 'melody' | 'rhythm',
    seed: number,
    log: { length: number; pass: boolean; memoryPass?: boolean; precision?: number | null; timingDifficulty?: number }[],
    now = new Date(),
  ): Promise<Progress> {
    const p = await this.loadProgress();
    const at = now.toISOString();
    const events: RatingEvent[] = [];
    log.forEach((x, i) => {
      // Memory: melodic → 'sequences'; rhythmic → 'rhythm' (judged with a lenient timing window).
      events.push({
        id: `g:${kind}:${seed}:${i}`,
        skill: kind === 'melody' ? 'sequences' : 'rhythm',
        difficulty: 760 + 70 * x.length,
        correct: kind === 'rhythm' && x.memoryPass !== undefined ? x.memoryPass : x.pass,
        at,
      });
      // Precision: only on rhythm rounds whose pattern was remembered, graded 0..1.
      if (kind === 'rhythm' && x.precision !== undefined && x.precision !== null) {
        events.push({ id: `g:timing:${seed}:${i}`, skill: 'timing', difficulty: x.timingDifficulty ?? 1000, correct: x.precision >= 0.5, score: x.precision, at });
      }
    });
    const have = new Set((p.ratingEvents ?? []).map((e) => e.id));
    const fresh = events.filter((e) => !have.has(e.id));
    if (!fresh.length) return p;
    const next: Progress = { ...p, ratingEvents: [...(p.ratingEvents ?? []), ...fresh].slice(-3000) };
    next.snapshots = snapshot(next, now);
    await this.kv.set('progress', next);
    return next;
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

  /** Store the daily challenge result; only the first play of a day counts. */
  async recordDaily(day: string, points: number, text: string): Promise<Progress> {
    const p = await this.loadProgress();
    if (p.daily?.[day]) return p;
    const daily = Object.fromEntries(Object.entries({ ...(p.daily ?? {}), [day]: { points, text } }).slice(-120));
    const next = { ...p, daily };
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

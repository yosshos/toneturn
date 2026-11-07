// Local progress + settings. XP and completion writes are idempotent by event id,
// so a repeated callback or an app resume can never award points twice.

import { placementResults } from '../engine/placement';
import type { MetricKey, VibratoStyle, VoiceRange } from '../engine/vocal';
import { memoryFactor } from '../engine/vocal';
import type { AidMode, NoteView } from '../engine/aids';
import { gemsEarned, gemsSpent, streakState, type Purchase, type StreakState } from '../engine/streak';
import { placementUnlocks } from '../engine/recommend';
import { outcomeOf, type InputMode, type SessionState } from '../engine/session';
import { ratingScore } from '../engine/scoring';
import { questionSkill, questionTag, type Answer } from '../engine/lesson';
import { questionTags, type Tag } from '../engine/taxonomy';

/** Items carry their tag vector (spec AD) so ratings and sub-skills can credit every skill they train. */
export const compactTags = (tags: Tag[]): Tag[] | undefined => (tags.length ? tags : undefined);
import { SKILLS, type RatingEvent, type Ratings } from '../engine/rating';
import { bumpCount, foldFromMemo, statsAfterEvents, statsAfterResult, trimIntoBase } from '../engine/stats';
import { gameEvents } from '../engine/gameRating';
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
  items?: { id: string; skill: RatingEvent['skill']; difficulty: number; correct: boolean; tag: string; score?: number; /** Spec AD: the skills this item trains, with weights. */ tags?: RatingEvent['tags']; timeMs?: number | null; /** Placement: the measured rating. */ set?: number; /** Placement 3.0: evidence the set counts as, and fast-converging answers after it. */ setN?: number; fast?: number; /** Vocal technique: the take's metric values (teacher view). */ m?: Partial<Record<MetricKey, number>> }[];
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
  review: ReviewEntry[];
  /** Longest chains on this device in the memory games. */
  games?: { melody: number; rhythm: number };
  /** Rated first attempts (lessons) and solo game rounds (ids starting "g:"). */
  ratingEvents?: RatingEvent[];
  /** One Skill Map snapshot per week (normalised later), newest last. */
  snapshots?: { week: string; ratings: Partial<Record<RatingEvent['skill'], number>> }[];
  /** Weekly puzzle results, separate from lesson retries and XP. */
  puzzles?: Record<string, { band: string; medal: Medal; completedAt: string }>;
  /** Daily challenge: the first play of each local day (later plays are practice). */
  daily?: Record<string, DailyRecord>;
  /** Streak 2.0 / gems facts kept beyond the 100-result history (spec N). */
  stats?: { days: string[]; goodSessions: number; xpByDay: Record<string, number> };
  /** Path lessons opened by "Find my level" (everything below the player's level, per skill). */
  placementUnlocks?: string[];
  /** "True or false?": best solo score per level (spec O). */
  tfBest?: Record<string, number>;
  /** Ghost race: your best run per set ("kind:rounds"), replayed as an opponent. */
  ghosts?: Record<string, GhostRun>;
  /** Vocal technique (spec P): best score per item, passed levels and a short per-metric history (local only). */
  vocal?: VocalProgress;
  // ---- stats (spec AG): long-lived aggregates and counters, merged by max on sync (S1–S3) ----
  statsDays?: import('../engine/stats').StatsDays;
  statsHours?: import('../engine/stats').StatsHours;
  peaks?: import('../engine/stats').Peaks;
  counts?: import('../engine/stats').Counts;
  records?: import('../engine/stats').PersonalRecords;
  awards?: import('../engine/stats').Awards;
  /** Area ranks (spec AG §9): division per area + technique, with the 7-day no-demotion floor. */
  ranks?: import('../engine/ranks').Ranks;
  /** Badges earned: id → when (spec AG §9). */
  badges?: import('../engine/badges').BadgeLog;
  /** Ratings folded from events dropped by the 3000 cap (S1). */
  ratingBase?: import('../engine/stats').RatingBase;
  /** Best per new game (spec AE §8). */
  bests?: Record<string, number>;
  /** Pitch Memory log (spec AE §8). */
  pitchMemory?: { day: string; cents: number; note: number }[];
  /** Technique drills: progress per item (spec AI §10). */
  drillItems?: Record<string, import('../engine/drills/types').ItemState>;
}

export interface VocalTake {
  at: string;
  item: string;
  level: number;
  score: number;
  /** Raw metric values of the take (for the per-metric trends). */
  m: Partial<Record<MetricKey, number>>;
}

export interface VocalProgress {
  best: Record<string, number>;
  passed: number[];
  takes: VocalTake[];
  /** Range map: latest score per range note (MIDI → 0..1). */
  rangeMap?: Record<string, number>;
}

export interface GhostRun {
  seed: number;
  points: number;
  answers: { answer: string | number | null; timeMs: number | null }[];
  at: string;
}

export const ratingsOf = (p: Progress): Ratings => foldFromMemo(p.ratingBase, p.ratingEvents ?? []);
/** Append rating events, folding the oldest beyond the cap into the base (S1). */
function withEvents(p: Progress, fresh: RatingEvent[]): Pick<Progress, 'ratingEvents' | 'ratingBase'> {
  const t = trimIntoBase(p.ratingBase, [...(p.ratingEvents ?? []), ...fresh], 3000);
  return { ratingEvents: t.events, ratingBase: t.base };
}

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
  /** Calibrated delay of a MIDI keyboard (ms; absent = 0) — removed from timing (owner, 2026-11-07). */
  midiLatencyMs?: number;
  /** Calibrated delay of the microphone pipeline (ms; absent = the built-in 70). */
  micLatencyMs?: number;
  /** Response time affects scores. null = automatic (untimed for the first days). */
  timedScoring: boolean | null;
  /** First time the app was used on this device (ISO). */
  firstUseAt: string | null;
  /** Answer and "sing" with a MIDI keyboard instead of the voice. */
  midiInput?: boolean;
  /** Settings audit (0.41): MIDI device (null = all), octave shift for small keyboards, inverted sustain pedal. */
  midiDevice?: string | null;
  midiOctave?: number;
  midiPedalInvert?: boolean;
  /** Microphone chosen in Settings (deviceId; null = system default). */
  micDeviceId?: string | null;
  /** Master volume 0..1, right/wrong chimes, narration speed, vibration. */
  volume?: number;
  cues?: boolean;
  ttsRate?: number;
  haptics?: boolean;
  /** Display (0.41): text size (root scale) and colour-blind friendly feedback colours. */
  textScale?: number;
  cvd?: boolean;
  /** Daily XP goal (Today ring): 10 / 20 / 30 / 50. */
  dailyGoal?: number;
  /** Gem purchases (streak freezes, repairs) — append-only, synced with the profile settings (spec N.4). */
  purchases?: Purchase[];
  /** Last freeze day the player was told about (freeze-used toast). */
  seenFreezeDay?: string | null;
  /** Mini-lessons heard to the end (spec X): lesson id → ISO date. */
  learned?: Record<string, string>;
  /** Quick lessons the player skipped: they don't open again before practice (spec AC). They stay in "Topics I learned". */
  miniSeen?: Record<string, string>;
  /** Start every unit with its mini-lesson until it is learned (default on). */
  miniLessons?: boolean;
  /** Highest weekly league ever reached (spec Y), as last seen. */
  bestLeague?: number;
  /** The league shown last time — a change plays the move animation once (spec Y.5). */
  leagueSeen?: number;
  /** Rhythm reading in voice mode also counts "ta" / knocks from the microphone (default off: the tap pad is more precise). */
  rhythmByVoice?: boolean;
  /** Which note views to show for non-rhythm exercises (spec M.1). Default keyboard + staff. */
  noteViews?: NoteView[];
  /** Visual aids while answering (spec M.3). Default auto. */
  aids?: AidMode;
  /** Comfortable singing range (spec P.0); null = not calibrated (a conservative default is used). */
  voiceRange?: VoiceRange | null;
  /** Echo Chain: sung-note tolerance in cents (playtest; default 80). */
  echoTolerance?: number;
  /** Instrument mode (spec S.12): answer on an acoustic instrument; written-pitch names for transposing ones. */
  instrument?: 'voice' | 'C' | 'Bb' | 'Eb' | 'F' | 'guitar' | 'bass' | 'keys' | 'strings';
  /** Where notes are entered in "place" exercises (spec AE §3.3): automatic = the first chosen note view. */
  answerSurface?: 'auto' | 'keys' | 'neck' | 'staff';
  /** Draw the neck and chord boxes for a left-handed player. */
  leftHanded?: boolean;
  /** Guitar / bass tuning id (src/engine/fretboard.ts). */
  tuning?: string;
  /** Tuner calibration, Hz (430–450). */
  a4?: number;
  /** The player confirmed headphones for low-frequency / stereo sound exercises (spec AE R2). */
  headphones?: boolean;
  /** Tuner preset last used. */
  tunerPreset?: string;
  // ---- the learning path (spec AF): choices and facts; synced with the settings (P9) ----
  /** The questionnaire goal. */
  goal?: import('../engine/path').Goal;
  /** Areas left out of the path. */
  pathLeaveOut?: import('../engine/rating').DomainId[];
  /** Optional content packs on (null/absent = defaults from track, plays and goal). */
  pathPacks?: import('../engine/path').Pack[];
  /** Topics hidden from the path. */
  pathHidden?: string[];
  /** Modes left out. */
  noSing?: boolean;
  noMic?: boolean;
  /** ✓ steps the player keeps on the path. */
  pathKeep?: string[];
  /** Facts: finished steps, frozen units, test-outs. */
  pathFacts?: import('../engine/path').PathFacts;
  /** The next step ids last shown (to tell the player when a rebuild changed them). */
  pathSeen?: string[];
  // ---- stats (spec AG) ----
  /** Share my stats with friends (S9). */
  shareStats?: import('../engine/stats').ShareStats;
  /** Trophy case: up to 3 pinned awards. */
  trophies?: string[];
  monthReviewSeen?: string;
  awardsInit?: boolean;
  // ---- today's workout (spec AH) ----
  /** Saved defaults: "all" days, or a weekday "0".."6" (W13). */
  workoutTemplates?: Record<string, import('../engine/workout2').Block[]>;
  /** Today's own edits (W18). */
  workoutToday?: { day: string; blocks: import('../engine/workout2').Block[] };
  /** After-workout feedback (W11): tomorrow's suggested total moves by delta until this day. */
  workoutNudge?: { until: string; delta: number };
  // ---- technique drills (spec AI) ----
  drills?: import('../engine/drills/types').DrillSettings;
  /** Per-device: latency and the player's velocity range. */
  drillCal?: import('../engine/drills/types').DrillCalibration;
  /** The player's own drills (drill creator). */
  customDrills?: import('../engine/drills/types').CustomDrill[];
  /** Level test (technique section): the start level per family (spec AI §13). */
  drillStart?: Partial<Record<import('../engine/drills/types').FamilyId, number>>;
  /** Re-calibration offers declined (skill or area → ISO day): not offered again for 7 days (SPEC-PLACEMENT §6). */
  recalSnooze?: Record<string, string>;
  /** Keep one vocal take per exercise per week on this device for "then vs. now" (spec S.2). */
  keepTakes?: boolean;
  /** Instrument sound for every exercise (spec Q): 'classic' (synth) or a sample set id. */
  sound?: string;
  /** Drone sound: 'soft' (synthesised, default) or a sustained recorded set ('organ'). */
  droneSound?: string;
  /** Colour theme (cosmetic, bought with gems). */
  theme?: string;
  /** Intake questionnaire answers (src/engine/intake.ts); null/absent = not taken. */
  intake?: import('../engine/intake').Intake | null;
  /** The catch-up card's key when the player chose "Not now" (it comes back when what it offers changes). */
  catchUpHidden?: string;
  /** The track the intake chose. */
  track?: import('../engine/intake').Track;
  /** Learning-first players: no reward nudges (avatar card, unlock toasts). */
  cleanView?: boolean;
  /** Avatar studio (phase 1 showcase): the two avatars' looks. */
  avatars?: unknown;
  /** Vibrato target style (spec P.1). */
  vibratoStyle?: VibratoStyle;
}

export const SETTINGS_VERSION = 2;

/** The instrument when the player never chose one: the recorded grand (the synth piano plays until it loads). */
export const DEFAULT_SOUND = 'grand';

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
export interface DailyRecord {
  points: number;
  text: string;
  /** What was answered (for the server leaderboard; uploaded once signed in). */
  answers?: (string | null)[];
  times?: (number | null)[];
  submitted?: boolean;
}

/** A review-queue item with a Leitner box: due again after 0, 1, 3, 7, 16, 35 days (spaced repetition). */
export interface ReviewEntry {
  lessonId?: string;
  questionId: string;
  key: string;
  answer: Answer;
  addedAt: string;
  /** 0 = just missed (due now). Absent on old data = 0. */
  box?: number;
  /** ISO time it is due again. Absent = addedAt. */
  due?: string;
}
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
export const reviewDue = (e: ReviewEntry) => e.due ?? e.addedAt;
export const dueReviews = (items: ReviewEntry[], now: Date) => items.filter((e) => new Date(reviewDue(e)).getTime() <= now.getTime());

/** Spaced repetition: a first-try correct recall moves a tag up a box (or out of the queue after the last box). */
export function scheduleReview(items: ReviewEntry[], correctTags: Set<string>, missed: ReviewEntry[], at: string): ReviewEntry[] {
  const missedKeys = new Set(missed.map((m) => m.key));
  const out: ReviewEntry[] = [];
  for (const e of items) {
    if (missedKeys.has(e.key)) continue; // replaced by the new miss below
    if (!correctTags.has(e.key)) {
      out.push(e);
      continue;
    }
    // Only promote when it was due (an early correct answer does not skip a box).
    if (new Date(reviewDue(e)).getTime() > new Date(at).getTime()) {
      out.push(e);
      continue;
    }
    const box = (e.box ?? 0) + 1;
    if (box >= REVIEW_INTERVAL_DAYS.length) continue; // learned
    out.push({ ...e, box, due: new Date(new Date(at).getTime() + REVIEW_INTERVAL_DAYS[box] * 86400000).toISOString() });
  }
  return [...out, ...missed.map((m) => ({ ...m, box: 0, due: at }))].slice(-80);
}

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
        tags: compactTags(questionTags(q)),
        // Graded rating score: accuracy × attempts (guess-corrected) × time × replays (spec J.6).
        score: Math.round(ratingScore(q, o) * 1000) / 1000,
        timeMs: o.attempts[k - 1]?.timeMs ?? null,
      };
    })
    // Sung passages from memory also measure melodic memory (spec P.9): the right notes, less for every
    // extra listen to the reference (replays).
    .concat(
      s.records
        .map((r, i) => ({ r, q: s.lesson.questions[i] }))
        .filter(({ r, q }) => (q.kind === 'sing-seq' || q.kind === 'sing-run') && r.attempts.length > 0)
        .map(({ r, q }) => {
          const o = outcomeOf(r, s.timed ?? false);
          const acc = Math.max(0, ...o.attempts.map((a) => a.accuracy));
          const score = Math.round(acc * memoryFactor(o.replays) * 1000) / 1000;
          return { id: `${sessionId}:${q.id}:mem`, skill: 'sequences' as const, difficulty: q.difficulty, correct: score >= 0.6, tag: questionTag(q), score, timeMs: null, tags: undefined };
        }),
    )
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
          tags: undefined,
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
  // Find my level: each skill's rating is SET from where the player failed (staircase to failure).
  if (s.lesson.id === 'placement' && s.lesson.version >= 3) {
    const sets = placementResults(s).map((x) => ({ id: `${sessionId}:place:${x.skill}`, skill: x.skill, difficulty: x.rating, correct: x.passed > 0, tag: `place:${x.skill}`, set: x.rating, ...(x.n !== undefined ? { setN: x.n } : {}), ...(x.fast ? { fast: x.fast } : {}) }));
    result.items = [...(result.items ?? []), ...sets];
  }
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
  const setAt = new Date(new Date(at).getTime() + 1).toISOString();
  const newEvents: RatingEvent[] = (r.items ?? []).map((it) => (it.set !== undefined ? { id: it.id, skill: it.skill, difficulty: it.difficulty, correct: it.correct, set: it.set, ...(it.setN !== undefined ? { setN: it.setN } : {}), ...(it.fast ? { fast: it.fast } : {}), ...(it.tags ? { tags: it.tags } : {}), at: setAt } : { id: it.id, skill: it.skill, difficulty: it.difficulty, correct: it.correct, score: it.score, ...(it.tags ? { tags: it.tags } : {}), at }));
  const cleared = new Set((r.items ?? []).filter((it) => it.correct).map((it) => it.tag));
  const puzzles = { ...(p.puzzles ?? {}) };
  // Only the first scored try at a week's puzzle counts; later plays are practice.
  if (r.puzzle && !puzzles[r.puzzle.week]) puzzles[r.puzzle.week] = { band: r.puzzle.band, medal: r.puzzle.medal, completedAt: at };
  const withEv: Progress = { ...p, ...withEvents(p, newEvents), puzzles };
  const st = statsAfterResult(p, r, ratingsOf(withEv));
  const withEvents2: Progress = { ...withEv, ...st };
  const unlocks = r.lessonId === 'placement' ? [...new Set([...(p.placementUnlocks ?? []), ...placementUnlocks(ratingsOf(withEvents2))])] : p.placementUnlocks;
  return {
    ...withEvents2,
    ...(unlocks ? { placementUnlocks: unlocks } : {}),
    snapshots: snapshot(withEvents2, now),
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
    stats: addSessionStats(p.stats, r),
    // Spaced repetition: right first try → next box; a miss → box 0, due now.
    review: scheduleReview(
      p.review,
      cleared,
      r.missed.map((m) => ({ lessonId: r.lessonId, questionId: m.questionId, key: m.key, answer: m.answer, addedAt: r.completedAt })),
      r.completedAt,
    ),
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
    const next0: Progress = { ...p, ...withEvents(p, fresh) };
    const next: Progress = { ...next0, ...statsAfterEvents(p, fresh, ratingsOf(next0)) };
    next.snapshots = snapshot(next, now);
    await this.kv.set('progress', next);
    return next;
  }

  /** Best score of a 0.38 game (spec AE §8), plus Pitch Memory log entries. */
  /** A drill take's item state (spec AI); returns the new progress. */
  async recordDrill(state: import('../engine/drills/types').ItemState, evs: RatingEvent[] = [], xp = 0, m?: { verdict: string; hands: string; cv: number | null }): Promise<Progress> {
    const p = await this.loadProgress();
    // Badge counters (spec AG §9): clean takes, tempo records, the best hands-together evenness.
    let counts = p.counts;
    const prev = p.drillItems?.[state.itemId];
    if (m?.verdict === 'clean') counts = bumpCount(counts, 'drillClean', 1);
    if (prev && prev.cleanBpm > 0 && state.cleanBpm > prev.cleanBpm) counts = bumpCount(counts, 'tempoRecords', 1);
    if (m?.verdict === 'clean' && m.hands === 'RL' && m.cv !== null) counts = bumpCount(counts, 'evenCv', m.cv, 'min');
    const day = localDay(new Date());
    const s0 = p.stats ?? { days: [], goodSessions: 0, xpByDay: {} };
    const stats = xp ? { ...s0, days: s0.days.includes(day) ? s0.days : [...s0.days, day].slice(-800), xpByDay: { ...s0.xpByDay, [day]: (s0.xpByDay[day] ?? 0) + xp } } : p.stats;
    const fresh = evs.filter((e) => !(p.ratingEvents ?? []).some((x) => x.id === e.id));
    const base: Progress = { ...p, xp: p.xp + xp, ...(stats ? { stats } : {}), ...(counts ? { counts } : {}), drillItems: { ...(p.drillItems ?? {}), [state.itemId]: state } };
    const next0: Progress = fresh.length ? { ...base, ...withEvents(p, fresh) } : base;
    const next: Progress = fresh.length ? { ...next0, ...statsAfterEvents(base, fresh, ratingsOf(next0)) } : next0;
    if (fresh.length) next.snapshots = snapshot(next, new Date());
    await this.kv.set('progress', next);
    return next;
  }

  async recordGame2(game: string, score: number, memory?: { day: string; cents: number; note: number }, detail?: Record<string, unknown>): Promise<Progress> {
    const p = await this.loadProgress();
    const bests = { ...(p.bests ?? {}), [game]: Math.max(p.bests?.[game] ?? 0, score) };
    const pitchMemory = memory ? [...(p.pitchMemory ?? []).filter((x) => x.day !== memory.day), memory].slice(-400) : p.pitchMemory;
    // Achievement counters (spec AG S2, S14).
    let counts = p.counts;
    const d = detail ?? {};
    if (game === 'flight' && d.input !== 'touch' && typeof d.gates === 'number') counts = bumpCount(counts, 'gates', d.gates);
    if (game === 'tuneup') {
      counts = bumpCount(counts, 'tuneUps', 1);
      if (typeof d.meanCents === 'number') counts = bumpCount(counts, 'tuneUpCents', d.meanCents, 'min');
    }
    if (game === 'highway' && d.fullCombo === true) counts = bumpCount(counts, 'highwayFC', 1);
    if (game === 'nametune') counts = bumpCount(counts, 'nameTuneBest', score, 'max');
    if (memory) {
      if (!(p.pitchMemory ?? []).some((x) => x.day === memory.day)) counts = bumpCount(counts, 'pitchMemoryDays', 1);
      counts = bumpCount(counts, 'pitchMemoryCents', Math.abs(memory.cents), 'min');
    }
    // Single-player games count (0.38): rated answers in the skills they train → ratings, stats, and the path's evidence.
    const at = new Date().toISOString();
    const evs = gameEvents(game, score, memory ? { ...(detail ?? {}), cents: memory.cents } : detail, at, Date.now().toString(36)).filter((e) => !(p.ratingEvents ?? []).some((x) => x.id === e.id));
    const base: Progress = { ...p, bests, ...(pitchMemory ? { pitchMemory } : {}), ...(counts ? { counts } : {}) };
    const next0: Progress = evs.length ? { ...base, ...withEvents(p, evs) } : base;
    const next: Progress = evs.length ? { ...next0, ...statsAfterEvents(base, evs, ratingsOf(next0)) } : next0;
    if (evs.length) next.snapshots = snapshot(next, new Date());
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
  async recordDaily(day: string, points: number, text: string, extra: Omit<DailyRecord, 'points' | 'text'> = {}): Promise<Progress> {
    const p = await this.loadProgress();
    if (p.daily?.[day]) return p;
    const daily = Object.fromEntries(Object.entries({ ...(p.daily ?? {}), [day]: { points, text, ...extra } }).slice(-120));
    const next = { ...p, daily };
    await this.kv.set('progress', next);
    return next;
  }

  /** Keep a ghost run if it is the first or beats the stored one. Returns whether it was kept. */
  async recordGhost(key: string, run: GhostRun): Promise<{ progress: Progress; kept: boolean }> {
    const p = await this.loadProgress();
    const old = p.ghosts?.[key];
    if (old && run.points <= old.points) return { progress: p, kept: false };
    const next = { ...p, ghosts: { ...(p.ghosts ?? {}), [key]: run } };
    await this.kv.set('progress', next);
    return { progress: next, kept: true };
  }

  /** "True or false?" run: rating events for the Intervals skill (first answers) + best score per level. */
  /** Rating events from drills outside lessons (inner clock, improvisation, guitar from tab). Idempotent by id. */
  async recordRatingEvents(events: RatingEvent[], now = new Date()): Promise<Progress> {
    const p = await this.loadProgress();
    const have = new Set((p.ratingEvents ?? []).map((e) => e.id));
    const fresh = events.filter((e) => !have.has(e.id));
    if (!fresh.length) return p;
    const next0: Progress = { ...p, ...withEvents(p, fresh) };
    const next: Progress = { ...next0, ...statsAfterEvents(p, fresh, ratingsOf(next0)) };
    next.snapshots = snapshot(next, now);
    await this.kv.set('progress', next);
    return next;
  }

  async recordTrueFalse(level: number | string, score: number, events: RatingEvent[], now = new Date()): Promise<{ progress: Progress; best: boolean }> {
    const p = await this.loadProgress();
    const have = new Set((p.ratingEvents ?? []).map((e) => e.id));
    const fresh = events.filter((e) => !have.has(e.id));
    const prevBest = p.tfBest?.[level] ?? 0;
    const next0: Progress = {
      ...p,
      ...withEvents(p, fresh),
      tfBest: { ...(p.tfBest ?? {}), [level]: Math.max(prevBest, score) },
    };
    const next: Progress = { ...next0, ...statsAfterEvents(p, fresh, ratingsOf(next0)) };
    next.snapshots = snapshot(next, now);
    await this.kv.set('progress', next);
    return { progress: next, best: score > prevBest };
  }

  /**
   * Vocal technique session (spec P): the result (XP, streak, Vocal technique ratings) plus the local
   * per-item bests, passed level and per-metric history. Idempotent per session id.
   */
  async recordVocal(r: LessonResult, takes: VocalTake[], opts: { passedLevel?: number | null; rangeMap?: Record<string, number> } = {}, now = new Date()): Promise<Progress> {
    const p = await this.loadProgress();
    if (p.applied.includes(`complete:${r.sessionId}`)) return p;
    const next = applyResult(p, r, now);
    const v: VocalProgress = next.vocal ?? { best: {}, passed: [], takes: [] };
    const best = { ...v.best };
    for (const t of takes) best[t.item] = Math.max(best[t.item] ?? 0, t.score);
    const passed = opts.passedLevel && !v.passed.includes(opts.passedLevel) ? [...v.passed, opts.passedLevel].sort((a, b) => a - b) : v.passed;
    next.vocal = { best, passed, takes: [...v.takes, ...takes].slice(-400), rangeMap: opts.rangeMap ? { ...(v.rangeMap ?? {}), ...opts.rangeMap } : v.rangeMap };
    await this.kv.set('progress', next);
    return next;
  }

  /** Mark a day's result as uploaded to the leaderboard. */
  async markDailySubmitted(day: string): Promise<Progress> {
    const p = await this.loadProgress();
    const d = p.daily?.[day];
    if (!d || d.submitted) return p;
    const next = { ...p, daily: { ...p.daily, [day]: { ...d, submitted: true } } };
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

/** Done at least once with at least 80 % first-try correct (the latest result's total). */
export function lessonMastered(p: Progress, id: string): boolean {
  const l = p.lessons[id];
  if (!l?.completions) return false;
  const last = [...p.history].reverse().find((h) => h.lessonId === id);
  return !!last && l.best >= Math.ceil(0.8 * last.total);
}

// ======================================================================= streak 2.0 & gems (spec N)

/** Fold one completed session into the long-lived stats (days practised, ≥80 % sessions, XP per day). */
export function addSessionStats(stats: Progress['stats'], r: LessonResult): NonNullable<Progress['stats']> {
  const day = localDay(new Date(r.completedAt));
  const s = stats ?? { days: [], goodSessions: 0, xpByDay: {} };
  const good = r.lessonId !== 'weekly-puzzle' && r.total > 0 && r.firstTry / r.total >= 0.8;
  const xpByDay = { ...s.xpByDay, [day]: (s.xpByDay[day] ?? 0) + r.xp };
  const keys = Object.keys(xpByDay).sort();
  if (keys.length > 800) for (const k of keys.slice(0, keys.length - 800)) delete xpByDay[k];
  return { days: s.days.includes(day) ? s.days : [...s.days, day].slice(-800), goodSessions: s.goodSessions + (good ? 1 : 0), xpByDay };
}

/** Every local day with qualifying practice: sessions, daily challenge first plays, memory games. */
export function practiceDays(p: Progress): Set<string> {
  const out = new Set<string>(p.stats?.days ?? []);
  for (const h of p.history) out.add(localDay(new Date(h.completedAt)));
  for (const d of Object.keys(p.daily ?? {})) out.add(d);
  for (const e of p.ratingEvents ?? []) if (e.id.startsWith('g:')) out.add(localDay(new Date(e.at)));
  return out;
}

export function streakOf(p: Progress, purchases: Purchase[], now = new Date()): StreakState {
  return streakState(practiceDays(p), purchases, localDay(now));
}

export function gemsOf(p: Progress, purchases: Purchase[], now = new Date()) {
  const st = streakOf(p, purchases, now);
  // Older data (before stats existed) still counts from the history.
  const goodFromHistory = p.history.filter((h) => h.lessonId !== 'weekly-puzzle' && h.total > 0 && h.firstTry / h.total >= 0.8).length;
  const xpByDay: Record<string, number> = { ...(p.stats?.xpByDay ?? {}) };
  if (!p.stats) for (const h of p.history) xpByDay[localDay(new Date(h.completedAt))] = (xpByDay[localDay(new Date(h.completedAt))] ?? 0) + h.xp;
  const medals = Object.values(p.puzzles ?? {});
  const earned = gemsEarned({
    goodSessions: Math.max(p.stats?.goodSessions ?? 0, goodFromHistory),
    goalDays: Object.values(xpByDay).filter((x) => x >= 30).length,
    puzzleGold: medals.filter((m) => m.medal === 'gold').length,
    puzzleSilver: medals.filter((m) => m.medal === 'silver').length,
    dailyPlays: Object.keys(p.daily ?? {}).length,
    milestones: st.milestones.map((m) => m.days),
  });
  return { earned, spent: gemsSpent(purchases), balance: Math.max(0, earned - gemsSpent(purchases)), streak: st };
}

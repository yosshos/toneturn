// Local progress + settings. XP and completion writes are idempotent by event id,
// so a repeated callback or an app resume can never award points twice.

import { activeLocale } from '../i18n/translate';
import { localeInfo } from '../i18n/locales';
import { addGameKeyTakes, isKeyGame, keyTakesOf } from '../engine/gameKeys';
import { coursesFromProfile, migrateExamCourse, migrateJazzCourse } from '../engine/courses';
import { placementResults } from '../engine/placement';
import { isLog, logMinutes } from '../engine/practiceLog';
import type { MetricKey, VibratoStyle, VoiceRange } from '../engine/vocal';
import { memoryFactor } from '../engine/vocal';
import type { AidMode, NoteView } from '../engine/aids';
import { gemsEarned, gemsSpent, streakState, type Purchase, type StreakState } from '../engine/streak';
import { addSessionRecord, type SessionRecord } from '../engine/practiceSession';
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
import { afterRun, clearsRun, gameXp, gameXpLeft, isTier, TIERS, tierDifficulty, tierKey, tierSpec, type DailyBand, type DynName, type GameTiers } from '../engine/gameTiers';
import { medalFor, weekId, type Medal } from '../engine/adaptive';
import type { Naming } from '../engine/pitch';
import type { KV } from './kv';
import { fromLeitner, fsrsInit, fsrsReview, nextInterval, type FsrsCard } from '../engine/fsrs';
import { bookDrillTake, bookGameRun, bookResult } from './practice';
import { SHARER_RESULT_ID } from '../engine/encore/sharerBonus';
import { fourWeeksBonus, mergePaid, momentum, payBonuses, weekGoalBonus, type Bonus, type Momentum, type PaidBonus, type WeekGains } from '../engine/momentum';
import type { TakeCounts } from '../engine/stretch';
import { addDay, msByDay, weekStart, type PracticeLedger } from '../engine/practiceTime';
import { itemStatus, STATUS_ORDER } from '../engine/drills/itemStatus';

/** SPEC-PRACTICE-SESSION §11.4: the lesson id Momentum's XP bonuses ride on (XP for the league, never a practice day). */
export const BONUS_RESULT_ID = 'momentum-bonus';
/** Results that carry XP only: not a practice day, not a "good session". */
const xpOnly = (id: string) => id === SHARER_RESULT_ID || id === BONUS_RESULT_ID;

/** AUDIT-5 #4: from this day on, only measured practice makes a streak day — minutes logged away from the app (the
 * practice log, the workout's off-app block) still count as practice time, but no longer as a streak day. Days before
 * it keep the rule they were earned under. */
export const MEASURED_STREAK_FROM = '2026-11-15';
/** Practice bookkeeping must never stop a result from being saved. */
const safe = <T,>(f: () => T, fallback: T): T => {
  try {
    return f();
  } catch {
    return fallback;
  }
};

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
  /** 0.61: the XP was already added take by take on this device (a technique session); the result carries it for
   * the server (teacher, league), and a rebuild from the server counts it once. Never uploaded. */
  xpCounted?: boolean;
  /** 0.65: the course the player was in (settings.activeCourse) — the league card's XP per course reads it where the
   * content alone can't tell (generic technique, a practice log, ear topics shared by Ear and Exams). Local only. */
  course?: import('../engine/courses').CourseId;
  /** Weekly puzzle outcome (only for lessonId "weekly-puzzle"). */
  puzzle?: { week: string; band: string; medal: Medal };
  /** AUDIT-5: the player's own note on an off-app practice block ("What did you work on?") or a log entry. */
  note?: string;
  /** AUDIT-5 #1: active practice time of the session (idle-trimmed, storage/practice.ts); logs: their minutes. */
  durationMs?: number;
}

export interface Progress {
  version: number;
  xp: number;
  /** Personal bonus XP already granted, by key (gifts: "ded:<gift>:to|from" → the XP). Never posted as a result, so
   *  the weekly league does not count it (engine/encore/gifts.ts). */
  granted?: Record<string, number>;
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
  /** AUDIT-GAMES §1: key cells of the key-relative games (gameKeys.ts), read with the drill items for key mastery. */
  gameKeys?: Record<string, import('../engine/drills/types').ItemState>;
  /** Game tiers (GAMES_TIERS_PLAN): cleared tier, last runs and bests per tier, per game. */
  gameTiers?: GameTiers;
  /** XP games gave per local day (the 100-a-day cap). */
  gameXpDays?: Record<string, number>;
  /** The last tier a run cleared (the one-line message on the next screen). */
  lastTierClear?: { game: string; tier: DynName; at: string };
  /** Recent tiered runs (quests read today's; badges read the cleared state). */
  tierRuns?: { game: string; tier: DynName; pass: boolean; cleared?: boolean; at: string }[];
  /** SPEC-PRACTICE-SESSION §8: the last 500 daily practice sessions (finished or ended early), oldest first. */
  sessions?: import('../engine/practiceSession').SessionRecord[];
  /** Sessions finished, total time and the records (longest session, best week, best month) from the start. */
  sessionTotals?: import('../engine/practiceSession').SessionTotals;
  // ---- SPEC-PRACTICE-SESSION §11 (rewards), device-local like the sessions, merged on a sync rebuild ----
  /** §11.4: the Momentum bonuses paid (each key once; weekly limits per kind). */
  paidBonuses?: PaidBonus[];
  /** §11.3: takes per item today (the daily cap: full for 6, half to 15, then nothing). */
  takeCounts?: TakeCounts;
  /** §11.4: this player's real gains per week (the Monday), for Momentum's progress half and their own pace. */
  weekGains?: Record<string, Partial<WeekGains>>;
  /** §11.4: Momentum per week (the Monday), the last score seen (the next week's boost reads it). */
  momentumWeeks?: Record<string, number>;
  /** §6: the day "Make it N minutes a day?" was last asked. */
  raiseAskedOn?: string;
  /** §5: the session whose end screen is showing, and the totals before it (its milestones compare against them). */
  sessionEnd?: { id: string; before?: import('../engine/practiceSession').SessionTotals };
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
  /** The screen's language when it is one of the translated ones (docs/SPEC-I18N.md); uiLang is then 'en' (the text
   *  the translation starts from). Undefined = uiLang. */
  locale?: import('../i18n/locales').LocaleCode;
  inputLang: 'he' | 'en';
  outputLang: 'he' | 'en';
  /** Keep the screen on while the app is open (Screen Wake Lock); undefined = on. */
  keepAwake?: boolean;
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
  /** MEASUREMENT-AUDIT B6: the player's own early (−) / late (+) habit against a click on MIDI (ms), reported, never removed. */
  midiBiasMs?: number;
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
  /** GUITAR-AUDIT B7: a MIDI guitar's strings by channel (auto: decided from what it sends) and its pitch-bend range (semitones). */
  midiGuitarChannels?: 'auto' | '1-6' | '2-7' | 'off';
  midiBendRange?: number;
  /** Sound the keys through the app (on unless turned off: most MIDI keyboards have no speakers). */
  midiSound?: boolean;
  /** The one-time "does your keyboard make its own sound?" question was answered (owner 2026-11-20). */
  midiSoundAsked?: boolean;
  /** Volume of your own keys (0–1.5), apart from the app's playback. */
  midiVolume?: number;
  /** Touch response of the keys. */
  midiCurve?: 'light' | 'normal' | 'heavy' | 'fixed';
  /** Audio output device id (null = the system default). */
  audioOutput?: string | null;
  /** The daily progression puzzle: the guesses per local day. */
  progPuzzle?: Record<string, { rows: string[][] }>;
  /** Chords the player knows (songbook by known chords). */
  knownChords?: string[];
  /** The computer keyboard plays notes (A W S E D F T G Y H U J K; Z / X octave). */
  computerKeys?: boolean;
  /** Microphone chosen in Settings (deviceId; null = system default). */
  micDeviceId?: string | null;
  /** Master volume 0..1, right/wrong chimes, narration speed, vibration. */
  volume?: number;
  cues?: boolean;
  ttsRate?: number;
  haptics?: boolean;
  /** Display (0.41): text size (root scale). The colour-blind opt-in was removed: the v2 mark palette (teal / pink heads,
   *  tangerine / purple ticks, each with a shape twin) is the safe one for everybody (COURSE-FEEDBACK-UI §4.1). */
  textScale?: number;
  /** Profile (SPEC-SOCIAL §1): nickname, country flag, picture (instrument icon + colour, or a cropped photo). */
  nickname?: string;
  /** Today's "choose a nickname" row was dismissed. */
  hideNickPrompt?: boolean;
  /** The metronome tool's last settings (tempo, meter, accents, sound, groove, speed trainer). */
  metronome?: import('../engine/grooves').MetroSettings;
  /** ISO 3166 alpha-2; null = no flag. */
  country?: string | null;
  avatarIcon?: string;
  avatarColor?: string;
  /** The cropped circle (256 px WebP data URL), kept on the device until the server stores it. */
  avatarPhoto?: string | null;
  /** Privacy & friends (SPEC-SOCIAL §2, §8): a preset plus advanced overrides. */
  privacy?: import('../engine/privacy').Privacy;
  /** Year of birth (age gate, SPEC-SOCIAL §8): under 13 → young-player mode. */
  birthYear?: number | null;
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
  /** Guitar tuning id (src/engine/fretboard.ts). Before 0.64 it also held the bass tuning (moved to bassTuning). */
  tuning?: string;
  /** Bass tuning id (0.64, B12): 4- / 5- / 6-string, drop D, fretless, upright — the bass-course drills follow it. */
  bassTuning?: string;
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
  /** Courses (0.61, SPEC-COURSES): the player's courses and the active one. pathFacts / pathKeep hold the ACTIVE
   *  course's path; the other courses wait in pathFactsBy / pathKeepBy and swap in on a switch (engine/courses.ts). */
  courses?: import('../engine/courses').CourseId[];
  activeCourse?: import('../engine/courses').CourseId;
  pathFactsBy?: Partial<Record<import('../engine/courses').CourseId, import('../engine/path').PathFacts>>;
  pathKeepBy?: Partial<Record<import('../engine/courses').CourseId, string[]>>;
  /** SPEC-COURSE-START (2026-11-11): how each course started — welcome and self-report, setup, taste, first win,
   *  level-test offer, personal goal (engine/courseStart.ts). Existing players' courses are migrated as legacy. */
  courseStart?: import('../engine/courseStart').CourseStartMap;
  /** BUILD-PLAN-2026-11 phase 6 (SPEC-EAR-AND-READING §8.3): per instrument course, the two 1–5 self-ratings asked at
   *  its start — playing by ear, playing from notes. They seed the channel profile (channelProfile's prior). */
  channelSelf?: Partial<Record<import('../engine/courses').CourseId, import('../engine/channelPlan').ChannelSelf>>;
  /** Phase 6 (§8.1): this week's channel mix (strong / weak / memory), moved ≤ 5 points a week toward the profile's target. */
  channelMix?: import('../engine/channelPlan').StoredMix;
  /** SPEC-EAR-AND-READING §5: this week's takes per channel (every place), for the weekly balance's measured shares. */
  channelWeek?: import('../engine/channelPlan').ChannelWeek;
  /** Phase 6 (§3.1): today's sight dose (kept for the day so it stays the same item). */
  sightDose?: import('../engine/channelPlan').StoredSight;
  /** Course and unit openers seen (content/openers.ts): each plays once on its own, then only from its replay button. */
  openers?: import('../content/openers').OpenersSeen;
  /** 0.67 (owner 2026-11-10): the Ear course's exam-prep mode (was the separate "Exams" course): exam-weighted path
   *  and workout, mock exams first on Practice, an exam card on Today. */
  examPrep?: boolean;
  /** SPEC-JAZZ-FOLD (owner 2026-11-19): the courses in "jazz focus" (מיקוד ג׳אז, was the separate Jazz course): the jazz
   *  pack open whatever the background, jazz steps earlier and weighted more (path, workout, Practice). */
  jazzFocus?: import('../engine/courses').CourseId[];
  /** SPEC-JAZZ-FOLD §3: the courses where climbing to mf opened the jazz pack by itself (never closed again). */
  jazzOpen?: import('../engine/courses').CourseId[];
  /** SPEC-JAZZ-FOLD: a one-time notice still to show — 'fold' (the Jazz course is now jazz focus) or the course whose jazz just opened. */
  jazzNotice?: 'fold' | import('../engine/courses').CourseId;
  /** SPEC-STYLE-FOCUS (owner 2026-11-22): per course, the main style and up to 2 more — one setting instead of jazzFocus,
   *  the piano emphasis, the guitar add-ons / style and the bass track (those stay read-only for one version). Focus
   *  changes weights (workout, path, defaults), never access: every style is open from day one. */
  styleFocus?: import('../engine/styleFocus').StyleFocusMap;
  /** SPEC-STYLE-FOCUS §9: the exposure service — tastes, answers, "don't offer" until, the 6-month look. */
  styleTaste?: import('../engine/styleFocus').StyleTaste;
  /** §9.4: minutes per style per day (improvisation, repertoire, tastes), kept 200 days. */
  styleMinutes?: import('../engine/styleFocus').StyleMinutes[];
  /** §3: a teacher's focus suggestion waiting for the student's yes (the assignment id it came from). */
  styleSuggest?: { id: string; course: import('../engine/courses').CourseId; focus: import('../engine/styleFocus').StyleFocus; from?: string } | null;
  /** §3: teacher suggestions already answered (assignment ids), so a suggestion is asked once. */
  styleSuggestSeen?: string[];
  /** The next step ids last shown (to tell the player when a rebuild changed them). */
  pathSeen?: string[];
  /** SPEC-PATH-ROLE §6 Q3: "guide me" (default) — the workout has a New block from the path; "I choose" — no New
   *  block (strengthen + review), the path fills in from what the player does. */
  pathMode?: import('../engine/workout2').PathMode;
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
  /** When a default was last saved or kept (W6: older than 30 days asks "refresh my default?"). */
  workoutTemplateAt?: string;
  /** Today's own edits (W18), per course (SPEC-PRACTICE-SESSION §2). */
  workoutToday?: import('../engine/practiceSession').TodayEdits;
  /** SPEC-PRACTICE-SESSION §7: the daily practice length in minutes (5–180, steps of 5; absent = 30). */
  dailyMinutes?: number;
  /** §6–§7: practice days a week for the weekly minutes goal (3–7; absent = 5). */
  practiceDays?: number;
  /** After-workout feedback (W11): tomorrow's suggested total moves by delta, and the step window by rating (±50), until this day. */
  workoutNudge?: { until: string; delta: number; rating?: number };
  /** SPEC-WORKOUT §9.4 "Less room": areas whose weight in each unit halves. */
  pathLessRoom?: import('../engine/rating').DomainId[];
  // ---- technique drills (spec AI) ----
  drills?: import('../engine/drills/types').DrillSettings;
  /** Per-device: latency and the player's velocity range. */
  drillCal?: import('../engine/drills/types').DrillCalibration;
  /** The player's own drills (drill creator). */
  customDrills?: import('../engine/drills/types').CustomDrill[];
  /** "I use a different fingering": per drill item, the player's own finger numbers (0 = not entered; [] = no numbers). */
  ownFingering?: import('../engine/drills/ownFingering').OwnFingerings;
  /** Licks (SPEC-LICKS-TRANSCRIPTION): my licks, own licks from transcriptions, the spaced review, "Use it" passes. */
  lickBook?: import('../engine/licks').LickBook;
  /** Level test (technique section): the start level per family (spec AI §13). */
  drillStart?: Partial<Record<import('../engine/drills/types').FamilyId, number>>;
  /** Drums course (0.65): the e-kit's learned map, hi-hat pedal range, per-pad velocity, or practice-pad (mic) mode. */
  drumKit?: import('../engine/drumKit').KitProfile;
  /** Re-calibration offers declined (skill or area → ISO day): not offered again for 7 days (SPEC-PLACEMENT §6). */
  recalSnooze?: Record<string, string>;
  /** My recordings (SPEC-PHRASE-STUDIO §6.1, owner 2026-11-16): keep the audio of every microphone take on this device.
   *  Default on (undefined = on); false = notes only. Before 0.99 it meant "one vocal take a week" (opt-in). */
  keepTakes?: boolean;
  /** My recordings: keep the notes of every measured take (default on; false = only starred / Encore takes). */
  keepTakeNotes?: boolean;
  /** My recordings (§6.2): sync the NOTES (never audio) of starred / foldered / phrase takes to my other devices.
   *  Default off; needs the cloud flag too (src/cloud/takeNotes.ts). */
  syncTakeNotes?: boolean;
  /** My charts (SPEC-0.48 §P2): typed chord charts for backing tracks. */
  myCharts?: import('../ui/Charts').MyChart[];
  /** Improvisation levels: best rules score (0..1) per level id. */
  improvBest?: Record<string, number>;
  /** Best compliance per improvisation challenge (0.58). */
  challengeBest?: Record<string, number>;
  /** Scale rotation (SPEC-RBI-ROTATION §3, phase 5): measured use per (function, scale) — takes, mean colour coverage,
   *  last played; the rotation picks by need from it, and the profile reads it. */
  rotationStats?: import('../engine/rotation').ModeStats;
  /** The rotation tier the player chose (1–3 in the first version; absent = from the technique tier). */
  rotationTier?: 1 | 2 | 3;
  /** Phase 8 (the Barry Harris way, RBI track B): the tier the player chose (H-1…H-5). */
  harrisTier?: 1 | 2 | 3 | 4 | 5;
  /** Phase 8, the coach's tilt (aiTilt.ts): this week's proposal and the player's answer (the plan uses it only on yes). */
  aiTilt?: import('../engine/aiTilt').TiltAnswer;
  /** The mixer: levels, EQ and effects per channel (absent = the default mix). */
  mixer?: Partial<import('../audio/mixer').MixerSettings>;
  /** Instrument sound for every exercise (spec Q): 'classic' (synth) or a sample set id. */
  sound?: string;
  /** GUITAR_DEEPENING §8: the guitar course's voice — auto (by the add-ons: prog / jazz → clean electric, fingerstyle / flamenco → nylon, else steel) or a fixed one. */
  guitarVoice?: 'auto' | 'steel' | 'nylon' | 'electric';
  /** The concert grand's detail (0.54): 'auto' = all 16 layers on a computer, 8 on a light phone. */
  pianoDetail?: 'auto' | 'full' | 'light';
  /** Sound quality (0.69): how much decoded audio a session may hold — 'auto' picks by device (Standard on iPhone/iPad). */
  soundQuality?: import('../audio/quality').SoundQuality;
  /** Live play latency (0.69): 'low' asks the browser for its smallest output buffer (applies after a reload). */
  audioLatency?: import('../audio/quality').LatencyMode;
  /** The tonewheel organ (0.55): registration and rotating-speaker speed; the tine piano's tremolo (0–1); the band's drums. */
  organReg?: string;
  organFast?: boolean;
  epTremolo?: number;
  bandDrums?: 'jazz' | 'classic';
  /** Drone sound: 'soft' (synthesised, default) or a sustained recorded set ('organ'). */
  droneSound?: string;
  /** Appearance: 'auto' | 'light' | 'dark' | 'contrast' (older colour-theme ids map to a mode, see ui/themes.ts). */
  theme?: string;
  /** Avatar frame bought with gems ('gold' | 'staff' | 'notes'); none = plain. */
  avatarFrame?: string | null;
  /** Intake questionnaire answers (src/engine/intake.ts); null/absent = not taken. */
  intake?: import('../engine/intake').Intake | null;
  /** The catch-up card's key when the player chose "Not now" (it comes back when what it offers changes). */
  catchUpHidden?: string;
  /** The track the intake chose. */
  track?: import('../engine/intake').Track;
  /** Learning-first players: no reward nudges (avatar card, unlock toasts). */
  cleanView?: boolean;
  /** Vibrato target style (spec P.1). */
  vibratoStyle?: VibratoStyle;
  /** AUDIT-5 #4: weekly-target streak — practice days a week (3–6); absent / 0 = every day. */
  streakWeekly?: number;
  /** The fresh-start epoch these settings belong to (storage/freshStart.ts). */
  progressEpoch?: string;
}

export const SETTINGS_VERSION = 2;

/** The instrument when the player never chose one: the recorded grand (the synth piano plays until it loads). */
export const DEFAULT_SOUND = 'grand';

/** Bumped when every tester starts over (storage/freshStart.ts). */
export const PROGRESS_EPOCH = '2026-11-19';

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  progressEpoch: PROGRESS_EPOCH,
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
  if (lang === 'he') return 'solfege';
  // a translated locale runs on English: "auto" follows the locale (es, pt, fr, it: Do Re Mi; docs/SPEC-I18N.md §3)
  return localeInfo(activeLocale()).naming === 'solfege' && activeLocale() ? 'solfege' : 'letter';
}

/** The phone's / browser's language: Hebrew when any preferred language is Hebrew (he, or the old code iw), else English. */
export function browserLang(nav: { languages?: readonly string[]; language?: string } | undefined = typeof navigator !== 'undefined' ? navigator : undefined): 'he' | 'en' {
  const ls = [...(nav?.languages ?? []), nav?.language ?? ''];
  return ls.some((l) => /^(he|iw)(-|_|$)/i.test(l)) ? 'he' : 'en';
}

/** v1 stored only first-run defaults (Hebrew + letters); move them to the v2 defaults. */
export function migrateSettings(raw: Partial<Settings> | undefined): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  if (!raw.version || raw.version < 2) {
    return { ...DEFAULT_SETTINGS, mode: raw.mode ?? DEFAULT_SETTINGS.mode, voiceConsent: raw.voiceConsent ?? false, reducedMotion: raw.reducedMotion ?? null };
  }
  return migrateBassTuning({ ...withCourses({ ...DEFAULT_SETTINGS, ...raw, voices: { ...DEFAULT_SETTINGS.voices, ...(raw.voices ?? {}) } }) });
}

/** Is this a bass tuning id (fretboard.ts: bass, bass5, bass6, bass-dropd, bass-fretless, upright)? */
const isBassTuningId = (id: string | undefined): boolean => !!id && (id === 'upright' || id === 'bass' || id.startsWith('bass'));

/** 0.64 (B12): a bass tuning saved in the shared 	uning key moves to assTuning; the guitar keeps its own. */
export function migrateBassTuning(s: Settings): Settings {
  if (!isBassTuningId(s.tuning)) return s;
  const { tuning, ...rest } = s;
  return { ...rest, bassTuning: s.bassTuning ?? tuning };
}

/** The player's bass tuning (the new key, else an old bass value still in 	uning). */
export function bassTuningOf(s: Pick<Settings, 'bassTuning' | 'tuning'>): string | undefined {
  return s.bassTuning ?? (isBassTuningId(s.tuning) ? s.tuning : undefined);
}

/** The neck games and pictures draw (final bass check): the bass course → the player's bass tuning, else the guitar's. */
export function neckTuningOf(s: Pick<Settings, 'bassTuning' | 'tuning' | 'activeCourse'>): string | undefined {
  return s.activeCourse === 'bass' ? (bassTuningOf(s) ?? 'bass') : s.tuning;
}

/** The instrument the screens assume: an instrument course decides (keys / guitar / bass), else the profile's. */
export function courseInstrumentOf(s: Pick<Settings, 'instrument' | 'activeCourse'>): Settings['instrument'] {
  const c = s.activeCourse;
  return c === 'bass' || c === 'guitar' || c === 'keys' ? c : s.instrument;
}

/** 0.61 (SPEC-COURSES): a player from before courses gets them from the goal and instruments they chose; the mixed
 *  path's facts stay with the course that matches the goal (the active one). Nothing is lost. */
export function withCourses(s0: Settings): Settings {
  // 0.67: the old "Exams" course → the Ear course with exam prep on (engine/courses.ts migrateExamCourse).
  // SPEC-JAZZ-FOLD: the old "Jazz & improv" course → Ear (and the instrument courses) in jazz focus, progress merged.
  const s = migrateExamCourse(migrateJazzCourse(s0));
  if (s.courses?.length && s.activeCourse) return s;
  const plays = [...((s.intake as { plays?: string[] } | null | undefined)?.plays ?? []), ...(s.instrument && !['voice', 'C', 'Bb', 'Eb', 'F'].includes(s.instrument) ? [s.instrument] : [])];
  const { courses, active, examPrep, jazzFocus } = coursesFromProfile(s.goal, plays);
  return { ...s, courses: s.courses?.length ? s.courses : courses, activeCourse: s.activeCourse ?? active, ...(examPrep && s.examPrep === undefined ? { examPrep } : {}), ...(jazzFocus && s.jazzFocus === undefined ? { jazzFocus: ['ear' as const] } : {}) };
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
  /** The daily band played (absent = soft, the set from before bands). */
  band?: DailyBand;
}

/** A review-queue item with a Leitner box: due again after 0, 1, 3, 7, 16, 35 days (spaced repetition). */
export interface ReviewEntry {
  lessonId?: string;
  questionId: string;
  key: string;
  answer: Answer;
  addedAt: string;
  /** On-time correct recalls since the last miss (0 = just missed, due now). Absent on old data = 0. */
  box?: number;
  /** ISO time it is due again. Absent = addedAt. */
  due?: string;
  /** FSRS memory (src/engine/fsrs.ts): stability (days), difficulty, last review. Absent on old (Leitner) entries. */
  s?: number;
  d?: number;
  last?: string;
  lapses?: number;
}
/** The old Leitner intervals: now only used to migrate a box-only entry (its box interval becomes the stability). */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
/** An item leaves the queue once its next FSRS gap would pass this many days (learned). */
export const REVIEW_GRADUATE_DAYS = 35;
/** A review entry as an FSRS card; a box-only entry migrates (its box interval becomes the stability). */
export function reviewCard(e: ReviewEntry): FsrsCard {
  if (typeof e.s === 'number' && typeof e.d === 'number') return { s: e.s, d: e.d, last: e.last ?? e.addedAt, reps: e.box ?? 0, lapses: e.lapses ?? 0 };
  const box = Math.max(0, Math.min(REVIEW_INTERVAL_DAYS.length - 1, e.box ?? 0));
  const iv = REVIEW_INTERVAL_DAYS[box];
  const last = e.due ? new Date(new Date(e.due).getTime() - iv * 86400000).toISOString() : e.addedAt;
  return fromLeitner(iv, last, box);
}
const cardFields = (c: FsrsCard) => ({ s: Math.round(c.s * 1000) / 1000, d: Math.round(c.d * 1000) / 1000, last: c.last, lapses: c.lapses });
export const reviewDue = (e: ReviewEntry) => e.due ?? e.addedAt;
export const dueReviews = (items: ReviewEntry[], now: Date) => items.filter((e) => new Date(reviewDue(e)).getTime() <= now.getTime());

/**
 * Spaced repetition (FSRS since 2026-11-12): a first-try correct recall when due is graded "good" and waits until recall
 * is predicted to fall to 90 %; once that gap passes REVIEW_GRADUATE_DAYS the tag leaves the queue. A miss is graded
 * "again" (its memory lapses, it is due now).
 */
export function scheduleReview(items: ReviewEntry[], correctTags: Set<string>, missed: ReviewEntry[], at: string): ReviewEntry[] {
  const missedKeys = new Set(missed.map((m) => m.key));
  const prevByKey = new Map(items.map((e) => [e.key, e]));
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
    const c = fsrsReview(reviewCard(e), 3, at);
    const days = nextInterval(c.s, undefined, 3650);
    if (days > REVIEW_GRADUATE_DAYS) continue; // learned
    out.push({ ...e, box: (e.box ?? 0) + 1, due: new Date(new Date(at).getTime() + days * 86400000).toISOString(), ...cardFields(c) });
  }
  const lapsed = missed.map((m) => {
    const prev = prevByKey.get(m.key);
    const c = prev ? fsrsReview(reviewCard(prev), 1, at) : fsrsInit(1, at);
    return { ...m, box: 0, due: at, ...cardFields(c) };
  });
  return [...out, ...lapsed].slice(-80);
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
  // Practice log (SPEC-0.48 §P1): its minutes are its duration — also after a cloud rebuild, which has no duration column.
  const rd = isLog(r.lessonId) ? { ...r, durationMs: logMinutes(r) * 60000 } : r;
  const st = statsAfterResult(p, rd, ratingsOf(withEv));
  const withEvents2: Progress = { ...withEv, ...st };
  const unlocks = r.lessonId === 'placement' ? [...new Set([...(p.placementUnlocks ?? []), ...placementUnlocks(ratingsOf(withEvents2))])] : p.placementUnlocks;
  return {
    ...withEvents2,
    ...(unlocks ? { placementUnlocks: unlocks } : {}),
    snapshots: snapshot(withEvents2, now),
    xp: p.xp + (r.xpCounted ? 0 : r.xp),
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

/** Lesson ids of game results (they carry a game's XP to the league, the daily goal and the course split). */
export const GAME_RESULT_PREFIX = 'game-';
export const isGameResult = (lessonId: string) => lessonId.startsWith(GAME_RESULT_PREFIX);

/**
 * A finished game at a tier (GAMES_TIERS_PLAN P1): the tier state moves (2 of the last 3 runs clear it, no
 * demotion), and the game's XP (× tier, at most 25, at most 100 a day from games) is recorded as a result with the
 * course, so the weekly league, the daily goal ring and the per-course split see games. Pure and idempotent by `runId`.
 */
export function applyGameRun(
  p: Progress,
  run: { game: string; tier: DynName; score: number; detail?: unknown; runId: string; course?: import('../engine/courses').CourseId; pass?: boolean },
  now = new Date(),
): { progress: Progress; xp: number; cleared: DynName | null; pass: boolean } {
  const key = tierKey(run.game);
  const eventId = `complete:game:${run.runId}`;
  if (p.applied.includes(eventId)) return { progress: p, xp: 0, cleared: null, pass: false };
  const pass = run.pass ?? clearsRun(run.game, run.tier, run.score, run.detail);
  const at = now.toISOString();
  const runPart = run.detail && typeof run.detail === 'object' && typeof (run.detail as { part?: unknown }).part === 'string' ? (run.detail as { part: string }).part : undefined;
  const { state, newlyCleared } = afterRun(p.gameTiers?.[key], run.tier, pass, run.score, at, { part: runPart, needParts: tierSpec(run.game)?.tiers[run.tier]?.distinctParts });
  const day = localDay(now);
  const today = p.gameXpDays?.[day] ?? 0;
  const xp = Math.min(gameXp(run.game, run.tier, run.score, run.detail), gameXpLeft(today));
  const days = { ...(p.gameXpDays ?? {}), [day]: today + xp };
  for (const k of Object.keys(days).sort().slice(0, -60)) delete days[k];
  const tierRuns = [...(p.tierRuns ?? []), { game: key, tier: run.tier, pass, ...(newlyCleared ? { cleared: true } : {}), at }].slice(-60);
  let next: Progress = { ...p, gameTiers: { ...(p.gameTiers ?? {}), [key]: state }, gameXpDays: days, tierRuns, ...(newlyCleared ? { lastTierClear: { game: key, tier: newlyCleared, at } } : {}) };
  if (xp > 0) {
    const d = (run.detail && typeof run.detail === 'object' ? run.detail : {}) as Record<string, unknown>;
    const answered = (typeof d.right === 'number' ? d.right : 0) + (typeof d.wrong === 'number' ? d.wrong : 0);
    // The server's plausibility checks: 1 ≤ total ≤ 50, xp ≤ 20 × total; first_try 0 keeps games out of "good
    // sessions" and perfect counts. The id matches the server's lesson-id pattern (lowercase words and dashes).
    const r: LessonResult = { lessonId: `${GAME_RESULT_PREFIX}${key}`, lessonVersion: 1, sessionId: `game:${run.runId}`.slice(0, 64), completedAt: at, firstTry: 0, total: Math.max(2, Math.min(50, answered || 2)), xp, missed: [], ...(run.course ? { course: run.course } : {}) };
    next = applyResult(next, r, now);
  }
  if (!next.applied.includes(eventId)) next = { ...next, applied: [...next.applied, eventId].slice(-500) };
  return { progress: next, xp, cleared: newlyCleared, pass };
}

export class ProgressStore {
  constructor(private kv: KV) {}

  async loadProgress(): Promise<Progress> {
    const p = await this.kv.get<Progress>('progress');
    return p && p.version === PROGRESS_VERSION ? p : emptyProgress();
  }

  async loadSettings(): Promise<Settings> {
    const raw = await this.kv.get<Partial<Settings>>('settings');
    // A first visit opens in the phone's language (owner 2026-11-19: most testers speak Hebrew).
    if (!raw) { const l = browserLang(); return { ...DEFAULT_SETTINGS, uiLang: l, inputLang: l, outputLang: l }; }
    return migrateSettings(raw);
  }

  /** Rate solo memory-game rounds (local; ids "g:<seed>:<turn>" so each round counts once). */
  async recordGameRounds(
    kind: 'melody' | 'rhythm',
    seed: number,
    log: { length: number; pass: boolean; memoryPass?: boolean; precision?: number | null; timingDifficulty?: number }[],
    now = new Date(),
    tier?: DynName,
  ): Promise<Progress> {
    const p = await this.loadProgress();
    const at = now.toISOString();
    const events: RatingEvent[] = [];
    log.forEach((x, i) => {
      // Memory: melodic → 'sequences'; rhythmic → 'rhythm' (judged with a lenient timing window).
      // A tiered run (GAMES_TIERS_PLAN): the tier's band, rising with the chain length inside it.
      events.push({
        id: `g:${kind}:${seed}:${i}`,
        skill: kind === 'melody' ? 'sequences' : 'rhythm',
        difficulty: tier ? tierDifficulty(tier, Math.max(0, x.length - 3), 6) : 760 + 70 * x.length,
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
    let next: Progress = { ...next0, ...statsAfterEvents(p, fresh, ratingsOf(next0)) };
    next.snapshots = snapshot(next, now);
    if (tier) {
      // The chain the player reached (the longest round remembered) is the tier rule's measure.
      const best = log.reduce((a, x) => ((kind === 'rhythm' && x.memoryPass !== undefined ? x.memoryPass : x.pass) ? Math.max(a, x.length) : a), 0);
      next = applyGameRun(next, { game: kind, tier, score: best, detail: { best, rounds: log.length }, runId: `${kind}-${seed}`, course: await this.course() }, now).progress;
    }
    await this.kv.set('progress', next);
    safe(() => bookGameRun(kind, { right: log.filter((x) => x.pass).length, of: log.length, edge: !!tier }), undefined);
    return next;
  }

  /** The course the player is in (results and game XP carry it). */
  private async course(): Promise<import('../engine/courses').CourseId | undefined> {
    return (await this.loadSettings()).activeCourse;
  }

  /** Best score of a 0.38 game (spec AE §8), plus Pitch Memory log entries. */
  /** A drill take's item state (spec AI); returns the new progress. */
  async recordDrill(state: import('../engine/drills/types').ItemState, evs: RatingEvent[] = [], xp = 0, m?: { verdict: string; hands: string; cv: number | null }, extra?: { takeCounts?: TakeCounts }): Promise<Progress> {
    const p0 = await this.loadProgress();
    // SPEC-PRACTICE-SESSION §11: today's take counts (the daily cap) and the week's gains (a record, a status step up)
    const p = withDrillGains({ ...p0, ...(extra?.takeCounts ? { takeCounts: extra.takeCounts } : {}) }, p0.drillItems?.[state.itemId], state, localDay(new Date()));
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
    safe(() => bookDrillTake(state, prev, m?.verdict), undefined);
    return next;
  }

  /**
   * SPEC-PRACTICE-SESSION §11.4: pay Momentum bonuses (each key once, the weekly limits). Their XP is one result
   * (BONUS_RESULT_ID): the total, the daily goal and the league count it; it is never a practice day.
   */
  async payBonuses(offered: readonly (Bonus | null | undefined)[], course?: string, now = new Date()): Promise<{ progress: Progress; xp: number; now: Bonus[] }> {
    const p = await this.loadProgress();
    const r = withBonuses(p, offered);
    if (!r.now.length) return { progress: p, xp: 0, now: [] };
    await this.kv.set('progress', r.p);
    // xp ≤ total × 20 (the server's plausibility rule): one "item" per 20 XP
    const total = Math.max(1, Math.min(50, Math.ceil(r.xp / 20)));
    let h = 0;
    for (const ch of r.now.map((b) => b.key).join('|')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const res: LessonResult = { lessonId: BONUS_RESULT_ID, lessonVersion: 1, sessionId: `bonus-${h.toString(36)}-${now.getTime().toString(36)}`, completedAt: now.toISOString(), firstTry: 0, total, xp: r.xp, missed: [], items: [], ...(course ? { course: course as LessonResult['course'] } : {}) };
    const next = await this.recordCompletion(res, now);
    return { progress: next, xp: r.xp, now: r.now };
  }

  /** SPEC-PRACTICE-SESSION §11.4 / §6: small reward bookkeeping (gains from other places, Momentum's weekly score, the
   *  "raise the goal" day). */
  async patchRewards(f: (p: Progress) => Progress): Promise<Progress> {
    const p = await this.loadProgress();
    const next = f(p);
    if (next !== p) await this.kv.set('progress', next);
    return next;
  }

  /** Personal bonus XP (a completed dedication, engine/encore/gifts.ts), once per key: the total and the day's goal ring
   *  rise; no rating events, no lesson result, so leagues and ratings are untouched. */
  async recordBonusXp(key: string, xp: number, now = new Date()): Promise<Progress> {
    const p = await this.loadProgress();
    if (!key || xp <= 0 || p.granted?.[key] !== undefined) return p;
    const day = localDay(now);
    const s0 = p.stats ?? { days: [], goodSessions: 0, xpByDay: {} };
    const next: Progress = { ...p, xp: p.xp + xp, granted: { ...(p.granted ?? {}), [key]: xp }, stats: { ...s0, xpByDay: { ...s0.xpByDay, [day]: (s0.xpByDay[day] ?? 0) + xp } } };
    await this.kv.set('progress', next);
    return next;
  }

  /** Replace a drill item's state without counting a take (AUDIT-5 #5: a plateau's step back on the tempo ladder). */
  async setDrillItem(state: import('../engine/drills/types').ItemState): Promise<Progress> {
    const p = await this.loadProgress();
    const next: Progress = { ...p, drillItems: { ...(p.drillItems ?? {}), [state.itemId]: state } };
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
    // Rudiment Rush's best tempo (drumRecords.ts): the fastest round passed in the run.
    if (game === 'rudiment-rush' && typeof d.topBpm === 'number' && d.topBpm > 0) counts = bumpCount(counts, 'rushBpm', d.topBpm, 'max');
    if (memory) {
      if (!(p.pitchMemory ?? []).some((x) => x.day === memory.day)) counts = bumpCount(counts, 'pitchMemoryDays', 1);
      counts = bumpCount(counts, 'pitchMemoryCents', Math.abs(memory.cents), 'min');
    }
    // Single-player games count (0.38): rated answers in the skills they train → ratings, stats, and the path's evidence.
    const at = new Date().toISOString();
    const evs = gameEvents(game, score, memory ? { ...(detail ?? {}), cents: memory.cents } : detail, at, Date.now().toString(36)).filter((e) => !(p.ratingEvents ?? []).some((x) => x.id === e.id));
    // AUDIT-GAMES §1: a key-relative game's takes write key cells (key mastery), like drill takes.
    const kt = isKeyGame(game) ? keyTakesOf(d) : null;
    const gameKeys = kt ? addGameKeyTakes(p.gameKeys, game, kt.inst, kt.takes, at) : p.gameKeys;
    const base: Progress = { ...p, bests, ...(pitchMemory ? { pitchMemory } : {}), ...(counts ? { counts } : {}), ...(gameKeys ? { gameKeys } : {}) };
    const next0: Progress = evs.length ? { ...base, ...withEvents(p, evs) } : base;
    let next: Progress = evs.length ? { ...next0, ...statsAfterEvents(base, evs, ratingsOf(next0)) } : next0;
    if (evs.length) next.snapshots = snapshot(next, new Date());
    // A tiered run (GAMES_TIERS_PLAN P1): the tier state, and the game's XP with the course.
    if (isTier(d.tier)) next = applyGameRun(next, { game, tier: d.tier, score, detail: d, runId: `${game}-${typeof d.runId === 'string' ? d.runId : Date.now().toString(36)}`, course: await this.course() }).progress;
    await this.kv.set('progress', next);
    const right = typeof d.right === 'number' ? d.right : undefined;
    const of = right !== undefined ? right + (typeof d.wrong === 'number' ? d.wrong : 0) : undefined;
    safe(() => bookGameRun(game, { right, of, pass: score > 0, edge: isTier(d.tier) && TIERS.indexOf(d.tier as DynName) > TIERS.indexOf(p.gameTiers?.[tierKey(game)]?.cleared ?? (null as unknown as DynName)) }), undefined);
    return next;
  }

  /** Mark the last tier-cleared message as shown. */
  async consumeTierClear(): Promise<Progress> {
    const p = await this.loadProgress();
    if (!p.lastTierClear) return p;
    const next = { ...p };
    delete next.lastTierClear;
    await this.kv.set('progress', next);
    return next;
  }

  /** A tiered run of a game that keeps no score of its own here (Truth or Bluff, ghost, daily). */
  async recordTierRun(game: string, tier: DynName, score: number, detail: Record<string, unknown>, runId: string, now = new Date()): Promise<Progress> {
    const p = await this.loadProgress();
    const next = applyGameRun(p, { game, tier, score, detail, runId: `${game}-${runId}`, course: await this.course() }, now).progress;
    if (next !== p) {
      await this.kv.set('progress', next);
      safe(() => bookGameRun(game, { pass: score > 0, edge: true }), undefined);
    }
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
    const r1 = await this.withCourse(r);
    const next = applyResult(p, safe(() => bookResult(r1, lessonMastered(p, r.lessonId)), r1), now);
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

  /**
   * Today counts as a practice day (the streak) once a session has some answers, finished or not (0.50.2): leaving
   * Find my level half-way — or the phone closing the tab — no longer leaves the day empty.
   */
  async markPracticeDay(now = new Date()): Promise<Progress> {
    // (the streak celebration at the end still treats this day as new: see provisionalDays)
    const p = await this.loadProgress();
    const day = localDay(now);
    const st = p.stats ?? { days: [], goodSessions: 0, xpByDay: {} };
    if (practiceDays(p).has(day)) return p;
    provisionalDays.add(day);
    const next = { ...p, stats: { ...st, days: [...st.days, day].slice(-800) } };
    await this.kv.set('progress', next);
    return next;
  }

  /**
   * SPEC-PRACTICE-SESSION §8: a daily practice session reached its end (or was ended early) — its record, the totals and
   * records; a finished session counts its day for the streak (§4, SPEC-WORKOUT W15). Once per session id.
   */
  async recordSession(rec: import('../engine/practiceSession').SessionRecord): Promise<Progress> {
    const p = await this.loadProgress();
    const next = withSessionRecord(p, rec);
    if (next !== p) await this.kv.set('progress', next);
    return next;
  }

  /** Every recorded result carries the course the player was in (0.65, community per course). */
  private async withCourse(r: LessonResult): Promise<LessonResult> {
    if (r.course) return r;
    const c = (await this.loadSettings()).activeCourse;
    return c ? { ...r, course: c } : r;
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
    if (p.applied.includes(`complete:${r.sessionId}`)) return p;
    const r1 = await this.withCourse(r);
    // AUDIT-5 #1: the session's measured time rides on the result (durationMs); logs book their minutes off-app.
    const next = applyResult(p, safe(() => bookResult(r1, lessonMastered(p, r.lessonId)), r1), now);
    if (next !== p) await this.kv.set('progress', next);
    return next;
  }
}

/** A session record into progress (pure; the same progress back when the id is already there). A finished session
 *  marks its day as a practice day (provisional, like markPracticeDay: the streak celebration still treats it as new). */
export function withSessionRecord(p: Progress, rec: SessionRecord): Progress {
  const old = (p.sessions ?? []).find((x) => x.id === rec.id);
  if (old) {
    // §4: the same session again after "+5 min" — the longer record replaces it (the totals move by the difference;
    // the end screen still compares against the totals from before the session)
    if (!(rec.activeMs > old.activeMs)) return p;
    const t0 = p.sessionTotals ?? { finished: 0, totalMs: 0, longestMs: 0 };
    const back = { ...t0, finished: Math.max(0, t0.finished - (old.finished ? 1 : 0)), totalMs: Math.max(0, t0.totalMs - old.activeMs) };
    const r = addSessionRecord(p.sessions!.filter((x) => x.id !== rec.id), back, rec);
    return { ...p, sessions: r.sessions, sessionTotals: r.totals, ...(p.sessionEnd?.id === rec.id ? {} : { sessionEnd: { id: rec.id, ...(p.sessionTotals ? { before: p.sessionTotals } : {}) } }) };
  }
  const { sessions, totals } = addSessionRecord(p.sessions, p.sessionTotals, rec);
  let stats = p.stats;
  if (rec.finished && !practiceDays(p).has(rec.day)) {
    const st = p.stats ?? { days: [], goodSessions: 0, xpByDay: {} };
    provisionalDays.add(rec.day);
    stats = { ...st, days: [...st.days, rec.day].slice(-800) };
  }
  return { ...p, sessions, sessionTotals: totals, sessionEnd: { id: rec.id, ...(p.sessionTotals ? { before: p.sessionTotals } : {}) }, ...(stats ? { stats } : {}) };
}

/** §11.4: a week's gains, added (the week of `day`; the last 60 weeks kept). Pure. */
export function withWeekGains(p: Progress, day: string, g: Partial<WeekGains>): Progress {
  const wk = weekStart(day);
  const cur = p.weekGains?.[wk] ?? {};
  const next: Partial<WeekGains> = { ...cur };
  let any = false;
  for (const [k, v] of Object.entries(g) as [keyof WeekGains, number][]) {
    if (!(v > 0)) continue;
    next[k] = (next[k] ?? 0) + v;
    any = true;
  }
  if (!any) return p;
  const all = { ...(p.weekGains ?? {}), [wk]: next };
  const keys = Object.keys(all).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete all[k];
  return { ...p, weekGains: all };
}

/** §11.4: what one drill take gained — a new clean tempo record, steps up the status ladder (new → learning → almost →
 *  closed, against the item's target tempo). Pure. */
export function drillGains(prev: import('../engine/drills/types').ItemState | undefined, next: import('../engine/drills/types').ItemState): Partial<WeekGains> {
  const records = prev && prev.cleanBpm > 0 && next.cleanBpm > prev.cleanBpm ? 1 : 0;
  const target = next.targetBpm ?? prev?.targetBpm ?? 0;
  const up = target > 0 ? STATUS_ORDER.indexOf(itemStatus(next, 0, target)) - STATUS_ORDER.indexOf(itemStatus(prev, 0, target)) : 0;
  return { records, statusUps: Math.max(0, up) };
}

const withDrillGains = (p: Progress, prev: import('../engine/drills/types').ItemState | undefined, next: import('../engine/drills/types').ItemState, day: string): Progress => withWeekGains(p, day, drillGains(prev, next));

/** §11.4: pay Momentum bonuses into progress (each key once, the weekly limits). Pure: the XP itself goes through a
 *  result (BONUS_RESULT_ID) so the league counts it. */
export function withBonuses(p: Progress, offered: readonly (Bonus | null | undefined)[]): { p: Progress; xp: number; now: Bonus[] } {
  const r = payBonuses(p.paidBonuses, offered);
  return r.now.length ? { p: { ...p, paidBonuses: r.paid }, xp: r.xp, now: r.now } : { p, xp: 0, now: [] };
}

/** One week's practice: practice days (the streak's days) and active ms (the ledger). */
export interface WeekPractice {
  week: string;
  days: number;
  ms: number;
}

/** The last `n` weeks of practice (oldest first, the week of `today` last). Pure. */
export function practiceWeeks(p: Progress, ledger: PracticeLedger, today: string, n: number): WeekPractice[] {
  const days = practiceDays(p);
  const byDay = msByDay(ledger);
  const w0 = weekStart(today);
  return Array.from({ length: n }, (_, i) => {
    const week = addDay(w0, -7 * (n - 1 - i));
    let d = 0;
    let ms = 0;
    for (let k = 0; k < 7; k++) {
      const day = addDay(week, k);
      if (day > today) break;
      if (days.has(day)) d++;
      ms += byDay[day] ?? 0;
    }
    return { week, days: d, ms };
  });
}

/**
 * SPEC-PRACTICE-SESSION §11.4: this week's Momentum, last week's score (the boost reads it: the stored score, else
 * computed now) and the weeks behind them. Pure.
 */
export function momentumOf(p: Progress, ledger: PracticeLedger, goals: { daysGoal: number; minutesGoal: number }, today: string): { now: Momentum; last: number; weeks: WeekPractice[] } {
  const weeks = practiceWeeks(p, ledger, today, 10);
  const at = (i: number) => {
    const w = weeks[i];
    const trailing = weeks.slice(0, i).map((x) => ({ gains: p.weekGains?.[x.week] ?? {}, practised: x.days > 0 || x.ms > 0 }));
    return momentum({ days: w.days, daysGoal: goals.daysGoal, minutes: Math.round(w.ms / 60000), minutesGoal: goals.minutesGoal, gains: p.weekGains?.[w.week] ?? {}, trailing });
  };
  const n = weeks.length;
  const last = p.momentumWeeks?.[weeks[n - 2].week] ?? at(n - 2).score;
  return { now: at(n - 1), last, weeks };
}

/** §11.4: the weekly bonuses this week has earned (the weekly goal; four full weeks in a row). */
export function weeklyBonuses(weeks: readonly WeekPractice[], goals: { daysGoal: number; minutesGoal: number }): (Bonus | null)[] {
  const now = weeks[weeks.length - 1];
  if (!now) return [];
  return [weekGoalBonus(now.week, { days: now.days, daysGoal: goals.daysGoal, minutes: Math.round(now.ms / 60000), minutesGoal: goals.minutesGoal }), fourWeeksBonus(weeks.map((w) => ({ week: w.week, days: w.days, daysGoal: goals.daysGoal })))];
}

/** Two devices' reward data (a sync rebuild): paid bonuses by key, gains and Momentum by the larger per week. */
export function mergeRewards(local: Progress, rebuilt: Progress): Pick<Progress, 'paidBonuses' | 'takeCounts' | 'weekGains' | 'momentumWeeks' | 'raiseAskedOn' | 'sessionEnd'> {
  const maxRec = <T extends Record<string, number>>(a?: Record<string, T>, b?: Record<string, T>): Record<string, T> | undefined => {
    if (!a || !b) return a ?? b;
    const out: Record<string, T> = { ...b };
    for (const [w, x] of Object.entries(a)) {
      const y = out[w];
      if (!y) out[w] = x;
      else out[w] = Object.fromEntries([...new Set([...Object.keys(x), ...Object.keys(y)])].map((k) => [k, Math.max(x[k] ?? 0, y[k] ?? 0)])) as T;
    }
    return out;
  };
  const mw = local.momentumWeeks && rebuilt.momentumWeeks ? Object.fromEntries([...new Set([...Object.keys(local.momentumWeeks), ...Object.keys(rebuilt.momentumWeeks)])].map((w) => [w, Math.max(local.momentumWeeks?.[w] ?? 0, rebuilt.momentumWeeks?.[w] ?? 0)])) : (local.momentumWeeks ?? rebuilt.momentumWeeks);
  const paid = local.paidBonuses || rebuilt.paidBonuses ? mergePaid(local.paidBonuses, rebuilt.paidBonuses) : undefined;
  const asked = [local.raiseAskedOn, rebuilt.raiseAskedOn].filter((x): x is string => !!x).sort().pop();
  const out: Pick<Progress, 'paidBonuses' | 'takeCounts' | 'weekGains' | 'momentumWeeks' | 'raiseAskedOn' | 'sessionEnd'> = {};
  if (paid) out.paidBonuses = paid;
  const tc = local.takeCounts ?? rebuilt.takeCounts;
  if (tc) out.takeCounts = tc;
  const wg = maxRec(local.weekGains as Record<string, Record<string, number>> | undefined, rebuilt.weekGains as Record<string, Record<string, number>> | undefined);
  if (wg) out.weekGains = wg as Progress['weekGains'];
  if (mw) out.momentumWeeks = mw;
  if (asked) out.raiseAskedOn = asked;
  const se = local.sessionEnd ?? rebuilt.sessionEnd;
  if (se) out.sessionEnd = se;
  return out;
}

/** Done at least once with at least 80 % first-try correct (the latest result's total). */
export function lessonMastered(p: Progress, id: string): boolean {
  const l = p.lessons[id];
  if (!l?.completions) return false;
  const last = [...p.history].reverse().find((h) => h.lessonId === id);
  return !!last && l.best >= Math.ceil(0.8 * last.total);
}

// ======================================================================= streak 2.0 & gems (spec N)

/** Fold one completed session into the long-lived stats (days practiced, ≥80 % sessions, XP per day). */
export function addSessionStats(stats: Progress['stats'], r: LessonResult): NonNullable<Progress['stats']> {
  const day = localDay(new Date(r.completedAt));
  const s = stats ?? { days: [], goodSessions: 0, xpByDay: {} };
  const good = r.lessonId !== 'weekly-puzzle' && !xpOnly(r.lessonId) && r.total > 0 && r.firstTry / r.total >= 0.8;
  // AUDIT-5 #4: logged minutes are practice time, not a measured practice day.
  // a friend's mastery of my phrase (the sharer's bonus) is XP, not a day I practiced
  const counts = !(isLog(r.lessonId) && day >= MEASURED_STREAK_FROM) && !xpOnly(r.lessonId);
  const xpByDay = { ...s.xpByDay, [day]: (s.xpByDay[day] ?? 0) + (r.xpCounted ? 0 : r.xp) };
  const keys = Object.keys(xpByDay).sort();
  if (keys.length > 800) for (const k of keys.slice(0, keys.length - 800)) delete xpByDay[k];
  return { days: s.days.includes(day) || !counts ? s.days : [...s.days, day].slice(-800), goodSessions: s.goodSessions + (good ? 1 : 0), xpByDay };
}

/** Days counted early by markPracticeDay (five answers in) in this run: the first finished session still celebrates them. */
export const provisionalDays = new Set<string>();

/** Every local day with qualifying practice: sessions, daily challenge first plays, memory games, and (AUDIT-5 #4)
 * days with enough measured minutes (the app marks those with markPracticeDay). From MEASURED_STREAK_FROM on, minutes
 * logged away from the app no longer make a day on their own. */
export function practiceDays(p: Progress): Set<string> {
  const out = new Set<string>(p.stats?.days ?? []);
  for (const h of p.history) {
    const d = localDay(new Date(h.completedAt));
    if ((isLog(h.lessonId) && d >= MEASURED_STREAK_FROM) || xpOnly(h.lessonId)) continue;
    out.add(d);
  }
  for (const d of Object.keys(p.daily ?? {})) out.add(d);
  for (const e of p.ratingEvents ?? []) if (e.id.startsWith('g:')) out.add(localDay(new Date(e.at)));
  return out;
}

export function streakOf(p: Progress, purchases: Purchase[], now = new Date(), weeklyTarget?: number): StreakState {
  return streakState(practiceDays(p), purchases, localDay(now), weeklyTarget ? { weeklyTarget } : {});
}

export function gemsOf(p: Progress, purchases: Purchase[], now = new Date(), weeklyTarget?: number) {
  const st = streakOf(p, purchases, now, weeklyTarget);
  // Older data (before stats existed) still counts from the history.
  const goodFromHistory = p.history.filter((h) => h.lessonId !== 'weekly-puzzle' && !xpOnly(h.lessonId) && h.total > 0 && h.firstTry / h.total >= 0.8).length;
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

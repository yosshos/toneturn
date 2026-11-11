// How a course starts (docs/SPEC-COURSE-START.md, owner-approved 2026-11-11). Music before any test: a welcome card
// (what the course gets you, the destination ladder, "Where are you?"), the instrument check as a musical moment, a
// short taste lesson at the self-reported level with the band, a measured first win — then the three next choices
// (continue the path / find my level / a daily goal). The level test is offered after the first session for "I play
// well" and after session 3 for the rest; sessions 2–3 weave in the path's own probe steps.
//
// Pure: the per-course state, the stage machine, the migration for existing players, the timing rules, and the
// content tables (taste lessons, ladders, personal goals). The runnable taste sessions are built in tasteLessons.ts.
import type { CourseId } from './courses';
import type { PathFacts, PathUnit, UnitStep } from './path';

export type SelfReport = 'new' | 'bit' | 'well';
export const SELF_REPORTS: SelfReport[] = ['new', 'bit', 'well'];
type T2 = { en: string; he: string };

/** The measured first win of a course (what the taste session actually did). */
export interface FirstWin {
  kind: 'lesson' | 'drills';
  /** Questions: right first time / total. */
  right?: number;
  total?: number;
  /** Playing: takes, clean takes, best note accuracy (0..1), bars played with the band. */
  takes?: number;
  clean?: number;
  acc?: number;
  bars?: number;
  xp: number;
}

/** A personal goal (optional, one tap): N path steps of this course in W weeks, counted from when it was set. */
export interface PersonalGoal {
  id: string;
  at: string;
  weeks: number;
  steps: number;
}

/** Settings.courseStart[course]. Every field is a fact with its time; absent = not yet. */
export interface CourseStartState {
  /** Existing player (progress in the course before this flow existed, or before it was added): never the welcome. */
  legacy?: boolean;
  /** The first course chosen in onboarding: its self-report also sets the quick questionnaire's level. */
  fromOnboarding?: boolean;
  welcomeAt?: string;
  report?: SelfReport;
  /** The instrument check was done (or skipped) for this course. */
  setupAt?: string;
  setupSkipped?: boolean;
  /** The taste session was opened (an abandoned one resumes from Home / Path). */
  tasteAt?: string;
  tasteDoneAt?: string;
  win?: FirstWin;
  winSeenAt?: string;
  /** "Not now" on the level-test offer: hidden until this local day (inclusive). */
  offerSnoozeUntil?: string;
  goal?: PersonalGoal;
}
export type CourseStartMap = Partial<Record<CourseId, CourseStartState>>;

export type Stage = 'welcome' | 'setup' | 'taste' | 'win' | 'done';

/** Where the course's start stands. `needsSetup`: the instrument has not been checked yet (setupNeeded). */
export function stageOf(cs: CourseStartState | undefined, needsSetup: boolean): Stage {
  if (!cs) return 'welcome';
  if (cs.legacy) return 'done';
  if (!cs.report) return 'welcome';
  if (!cs.tasteDoneAt) return needsSetup && !cs.setupAt ? 'setup' : 'taste';
  if (!cs.winSeenAt) return 'win';
  return 'done';
}

/** The setup facts setupNeeded reads (a slice of Settings). */
export interface SetupFacts {
  midiInput?: boolean;
  drumKit?: { done?: boolean } | null;
  voiceRange?: unknown;
  headphones?: boolean;
  courseStart?: CourseStartMap;
}

/** Has this course's instrument still to be checked? Skipped when it already was (here or in another course). */
export function setupNeeded(c: CourseId, s: SetupFacts): boolean {
  const done = (k: CourseId) => !!s.courseStart?.[k]?.setupAt;
  switch (c) {
    case 'keys':
      return !s.midiInput && !done('keys');
    case 'guitar':
      return !done('guitar');
    case 'bass':
      return !done('bass');
    case 'drums':
      return !s.drumKit?.done && !done('drums');
    case 'voice':
      return !s.voiceRange && !done('voice');
    case 'ear':
    case 'jazz':
      // One headphones / volume check serves both listening courses.
      return s.headphones === undefined && !done('ear') && !done('jazz');
  }
}

// ---------------------------------------------------------------- transitions (pure: map in, map out)

const put = (m: CourseStartMap | undefined, c: CourseId, patch: Partial<CourseStartState>): CourseStartMap => ({ ...(m ?? {}), [c]: { ...(m?.[c] ?? {}), ...patch } });

export const reportCourse = (m: CourseStartMap | undefined, c: CourseId, report: SelfReport, now: string): CourseStartMap => put(m, c, { report, welcomeAt: m?.[c]?.welcomeAt ?? now });
export const markSetup = (m: CourseStartMap | undefined, c: CourseId, now: string, skipped = false): CourseStartMap => put(m, c, { setupAt: now, ...(skipped ? { setupSkipped: true } : {}) });
export const markTasteOpened = (m: CourseStartMap | undefined, c: CourseId, now: string): CourseStartMap => (m?.[c]?.tasteAt ? (m ?? {}) : put(m, c, { tasteAt: now }));
/** The taste finished: the first win is kept once (a replay never overwrites it). */
export const markTasteDone = (m: CourseStartMap | undefined, c: CourseId, win: FirstWin, now: string): CourseStartMap => (m?.[c]?.tasteDoneAt ? (m ?? {}) : put(m, c, { tasteDoneAt: now, win, tasteAt: m?.[c]?.tasteAt ?? now }));
export const markWinSeen = (m: CourseStartMap | undefined, c: CourseId, now: string): CourseStartMap => (m?.[c]?.winSeenAt ? (m ?? {}) : put(m, c, { winSeenAt: now }));
export const snoozeOffer = (m: CourseStartMap | undefined, c: CourseId, today: string, days = 3): CourseStartMap => put(m, c, { offerSnoozeUntil: addDays(today, days) });
export const setPersonalGoal = (m: CourseStartMap | undefined, c: CourseId, g: PersonalGoal | null): CourseStartMap => {
  const cur = { ...(m?.[c] ?? {}) };
  if (g) cur.goal = g;
  else delete cur.goal;
  return { ...(m ?? {}), [c]: cur };
};

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- migration (existing players)

/** A slice of one recorded session (Progress.history). */
export interface HistoryLite {
  lessonId: string;
  completedAt: string;
  course?: CourseId | string;
  sessionId?: string;
}

/** What says a course was already played before this flow (Settings + Progress slices). */
export interface ProgressFacts {
  /** The active course's path facts and the parked ones. */
  activeCourse?: CourseId;
  pathFacts?: PathFacts;
  pathFactsBy?: Partial<Record<CourseId, PathFacts>>;
  history: HistoryLite[];
  /** Lesson completions (Progress.lessons): any = the ear course was played (results from before courses carry no course). */
  lessonsDone?: number;
  /** Technique items played per instrument family prefix ('' = piano families). */
  drillFamilies?: string[];
  /** Vocal technique levels passed (the voice course). */
  vocalPassed?: number;
}

const factsOf = (c: CourseId, p: ProgressFacts): PathFacts | undefined => ((p.activeCourse ?? 'ear') === c ? p.pathFacts : p.pathFactsBy?.[c]);
const DRILL_PREFIX: Partial<Record<CourseId, (fam: string) => boolean>> = {
  keys: (f) => !/^(g|b|d)-/.test(f) && f !== 'custom',
  guitar: (f) => f.startsWith('g-'),
  bass: (f) => f.startsWith('b-'),
  drums: (f) => f.startsWith('d-'),
};

/** Did the player already make progress in this course (any measured step, session or technique item)? */
export function courseHasProgress(c: CourseId, p: ProgressFacts): boolean {
  const f = factsOf(c, p);
  if (Object.keys(f?.steps ?? {}).length || Object.keys(f?.tests ?? {}).length) return true;
  if (p.history.some((h) => h.course === c)) return true;
  // Results from before courses (0.61) carry no course: they were the one mixed path = the ear course.
  if (c === 'ear' && (p.history.some((h) => !h.course) || (p.lessonsDone ?? 0) > 0)) return true;
  const fam = DRILL_PREFIX[c];
  if (fam && p.drillFamilies?.some(fam)) return true;
  if (c === 'voice' && (p.vocalPassed ?? 0) > 0) return true;
  return false;
}

/**
 * Existing players: every course of theirs with progress and no start state counts as started (legacy) — they never
 * see the welcome. A course with a start state is never touched (a new player's taste records history too).
 * Returns the same object when nothing changes.
 */
export function migrateCourseStart(m: CourseStartMap | undefined, courses: CourseId[], p: ProgressFacts): CourseStartMap | undefined {
  let out = m;
  for (const c of courses) {
    if (out?.[c] || !courseHasProgress(c, p)) continue;
    out = { ...(out ?? {}), [c]: { legacy: true } };
  }
  return out;
}

// ---------------------------------------------------------------- sessions, the level-test offer, the first week

/** Sessions of this course finished after `since` (its taste counts as session 1 and is at `since`). */
export function sessionsSince(history: HistoryLite[], c: CourseId, since: string | undefined): number {
  if (!since) return 0;
  const t = new Date(since).getTime();
  const ids = new Set<string>();
  for (const h of history) if (h.course === c && new Date(h.completedAt).getTime() > t + 1000) ids.add(h.sessionId ?? h.completedAt);
  return ids.size;
}

/** Was the course's own level test taken (ear / jazz / voice: the placement; instruments: the playing test)? */
export function levelTested(c: CourseId, history: HistoryLite[], drillStartFamilies: string[] = []): boolean {
  if (history.some((h) => h.course === c && (h.lessonId === 'placement' || h.lessonId === 'technique-test'))) return true;
  const fam = DRILL_PREFIX[c];
  return !!fam && drillStartFamilies.some(fam);
}

/**
 * Offer the explicit level test (path card and Home)? After the first session (the taste) for "I play well", after
 * session 3 for the rest (the taste + 2), never for a migrated player (they have their own Find my level), never
 * once taken, and not while snoozed.
 */
export function offerDue(cs: CourseStartState | undefined, sessionsAfterTaste: number, tested: boolean, today: string): boolean {
  if (!cs || cs.legacy || tested || !cs.tasteDoneAt || !cs.winSeenAt) return false;
  if (cs.offerSnoozeUntil && cs.offerSnoozeUntil >= today) return false;
  return cs.report === 'well' || sessionsAfterTaste >= 2;
}

/** Sessions 2–3 of a new course: Home shows the first-week card with the path's probe steps (null = not now). */
export function firstWeekDay(cs: CourseStartState | undefined, sessionsAfterTaste: number): 2 | 3 | null {
  if (!cs || cs.legacy || !cs.winSeenAt) return null;
  return sessionsAfterTaste === 0 ? 2 : sessionsAfterTaste === 1 ? 3 : null;
}

/**
 * The placement woven into sessions 2–3: the current unit's probe steps (first step of a skill never measured), one
 * per skill, at most `n`; when the unit has none, its current step. The player sees normal steps.
 */
export function pickProbes(units: PathUnit[], n = 2): { x: UnitStep; unit: PathUnit }[] {
  const unit = units.find((u) => u.status === 'current');
  if (!unit) return [];
  const live = unit.steps.filter((x) => x.state === 'current' || x.state === 'open' || x.state === 'quick');
  const out: { x: UnitStep; unit: PathUnit }[] = [];
  const skills = new Set<string>();
  for (const x of live) {
    if (!x.probe || skills.has(x.step.skill)) continue;
    skills.add(x.step.skill);
    out.push({ x, unit });
    if (out.length >= n) break;
  }
  if (!out.length) {
    const cur = live.find((x) => x.state === 'current') ?? live[0];
    if (cur) out.push({ x: cur, unit });
  }
  return out;
}

// ---------------------------------------------------------------- content: promises, ladders, personal goals

/** One line on the welcome card: what this course gets you. */
export const PROMISE: Record<CourseId, T2> = {
  ear: { en: 'Hear what is going on in the music: chords, keys and the moves of jazz harmony.', he: 'לשמוע מה קורה במוזיקה: אקורדים, סולמות והמהלכים של ההרמוניה בג׳אז.' },
  keys: { en: 'Comp a jazz blues by ear and hand, then play standards with the band.', he: 'ללוות בלוז ג׳אז מהאוזן ומהיד, ואז לנגן סטנדרטים עם הלהקה.' },
  guitar: { en: 'Play in time with a band: chords and riffs first, then jazz comping.', he: 'לנגן בזמן עם להקה: אקורדים וריפים קודם, ואחר כך ליווי ג׳אז.' },
  bass: { en: 'Lock with the drummer, then walk a blues and the standards.', he: 'להינעל עם המתופף, ואז ללכת בבלוז ובסטנדרטים.' },
  drums: { en: 'Hold a groove with the band, then fills, feels and odd meters.', he: 'להחזיק גרוב עם הלהקה, ואז מילויים, תחושות ומשקלים אי־זוגיים.' },
  voice: { en: 'Sing in tune with the band, from simple songs to standards and scat.', he: 'לשיר מדויק עם הלהקה, משירים פשוטים ועד סטנדרטים וסקאט.' },
  jazz: { en: 'Swing, hear the changes and improvise over a blues and the standards.', he: 'לסווינג, לשמוע את המהלכים ולאלתר על בלוז ועל סטנדרטים.' },
};

/** The destination ladder (4 rungs): simple first material reads as the first step, not the point. */
export const LADDER: Record<CourseId, T2[]> = {
  ear: [
    { en: 'Foundations', he: 'יסודות' },
    { en: 'Chords & keys', he: 'אקורדים וסולמות' },
    { en: 'Harmony by ear', he: 'הרמוניה מהאוזן' },
    { en: 'Jazz harmony', he: 'הרמוניה של ג׳אז' },
  ],
  keys: [
    { en: 'Foundations', he: 'יסודות' },
    { en: 'Blues', he: 'בלוז' },
    { en: 'Standards', he: 'סטנדרטים' },
    { en: 'Advanced jazz piano', he: 'פסנתר ג׳אז מתקדם' },
  ],
  guitar: [
    { en: 'Chords & strumming', he: 'אקורדים ופריטה' },
    { en: 'Riffs & blues', he: 'ריפים ובלוז' },
    { en: 'Jazz comping', he: 'ליווי ג׳אז' },
    { en: 'Advanced', he: 'מתקדמים' },
  ],
  bass: [
    { en: 'Roots & pocket', he: 'שורשים וכיס' },
    { en: 'Grooves & blues', he: 'גרובים ובלוז' },
    { en: 'Walking', he: 'ווקינג' },
    { en: 'Advanced', he: 'מתקדמים' },
  ],
  drums: [
    { en: 'Grooves', he: 'גרובים' },
    { en: 'Fills & feels', he: 'מילויים ותחושות' },
    { en: 'Odd meters', he: 'משקלים אי־זוגיים' },
    { en: 'Advanced', he: 'מתקדמים' },
  ],
  voice: [
    { en: 'In tune', he: 'מדויק' },
    { en: 'Songs', he: 'שירים' },
    { en: 'Standards & harmony', he: 'סטנדרטים והרמוניה' },
    { en: 'Scat & improvisation', he: 'סקאט ואלתור' },
  ],
  jazz: [
    { en: 'Swing feel', he: 'תחושת סווינג' },
    { en: 'Blues', he: 'בלוז' },
    { en: 'Standards', he: 'סטנדרטים' },
    { en: 'Advanced harmony', he: 'הרמוניה מתקדמת' },
  ],
};

/** The rung the path's current section stands on. */
export const rungOf = (section: string | undefined): number => Math.max(0, ['beginner', 'developing', 'solid', 'advanced'].indexOf(section ?? 'beginner'));

/** Personal goals (optional, one tap): concrete, measurable as path steps of the course in a few weeks. */
export const PERSONAL_GOALS: Record<CourseId, { id: string; title: T2; weeks: number; steps: number }[]> = {
  ear: [
    { id: 'ear-chords', title: { en: 'Name chord qualities by ear in 4 weeks', he: 'לזהות סוגי אקורדים מהאוזן בתוך 4 שבועות' }, weeks: 4, steps: 24 },
    { id: 'ear-iivi', title: { en: 'Hear a ii–V–I in any key in 8 weeks', he: 'לשמוע ii–V–I בכל סולם בתוך 8 שבועות' }, weeks: 8, steps: 48 },
  ],
  keys: [
    { id: 'keys-blues', title: { en: 'Comp a jazz blues in F in 6 weeks', he: 'ללוות בלוז ג׳אז בפה בתוך 6 שבועות' }, weeks: 6, steps: 36 },
    { id: 'keys-standard', title: { en: 'Play your first standard with the band in 10 weeks', he: 'לנגן את הסטנדרט הראשון עם הלהקה בתוך 10 שבועות' }, weeks: 10, steps: 60 },
  ],
  guitar: [
    { id: 'guitar-changes', title: { en: 'Change chords in time with the band in 4 weeks', he: 'להחליף אקורדים בזמן עם הלהקה בתוך 4 שבועות' }, weeks: 4, steps: 24 },
    { id: 'guitar-comp', title: { en: 'Comp a ii–V–I with jazz voicings in 8 weeks', he: 'ללוות ii–V–I בקולות ג׳אז בתוך 8 שבועות' }, weeks: 8, steps: 48 },
  ],
  bass: [
    { id: 'bass-pocket', title: { en: 'Hold the pocket with the drummer in 4 weeks', he: 'להחזיק את הכיס עם המתופף בתוך 4 שבועות' }, weeks: 4, steps: 24 },
    { id: 'bass-walk', title: { en: 'Walk a full blues chorus in 8 weeks', he: 'ללכת סבב בלוז שלם בתוך 8 שבועות' }, weeks: 8, steps: 48 },
  ],
  drums: [
    { id: 'drums-groove', title: { en: 'Hold a groove for a whole song in 4 weeks', he: 'להחזיק גרוב לאורך שיר שלם בתוך 4 שבועות' }, weeks: 4, steps: 24 },
    { id: 'drums-odd', title: { en: 'Play a groove in 7/8 in 10 weeks', he: 'לנגן גרוב ב־7/8 בתוך 10 שבועות' }, weeks: 10, steps: 60 },
  ],
  voice: [
    { id: 'voice-tune', title: { en: 'Sing a song in tune from start to end in 4 weeks', he: 'לשיר שיר מדויק מתחילתו ועד סופו בתוך 4 שבועות' }, weeks: 4, steps: 24 },
    { id: 'voice-standard', title: { en: 'Sing a standard with the band in 10 weeks', he: 'לשיר סטנדרט עם הלהקה בתוך 10 שבועות' }, weeks: 10, steps: 60 },
  ],
  jazz: [
    { id: 'jazz-blues', title: { en: 'Improvise a chorus over a blues in 6 weeks', he: 'לאלתר סבב על בלוז בתוך 6 שבועות' }, weeks: 6, steps: 36 },
    { id: 'jazz-changes', title: { en: 'Hear the changes of a standard in 10 weeks', he: 'לשמוע את המהלכים של סטנדרט בתוך 10 שבועות' }, weeks: 10, steps: 60 },
  ],
};

export const goalById = (c: CourseId, id: string) => PERSONAL_GOALS[c].find((g) => g.id === id);

/** Progress toward the personal goal: path steps of the course first finished since it was set, and the weeks left. */
export function goalProgress(g: PersonalGoal, facts: PathFacts | undefined, now: Date): { done: number; total: number; weeksLeft: number } {
  const t0 = new Date(g.at).getTime();
  let done = 0;
  for (const st of Object.values(facts?.steps ?? {})) {
    const first = new Date(st.firstAt ?? st.at).getTime();
    if (st.stars >= 1 && first >= t0) done++;
  }
  const left = g.weeks - Math.floor((now.getTime() - t0) / (7 * 86400000));
  return { done: Math.min(done, g.steps), total: g.steps, weeksLeft: Math.max(0, left) };
}

// ---------------------------------------------------------------- the taste lessons (course × self-report)

/** One item of a question taste: a topic level, or a built-in moment (tap over a groove, echo a note / a phrase). */
export type TasteItem = { topic: string; level: number; n: number } | { beat: { bpm: number; bars: number } } | { echoNote: number } | { echoPhrase: number[][] };

/** A playing taste: technique levels (the first items of each, in the drill engine), with the band under them. */
export interface TasteDrillPick {
  level: string;
  /** Which items of the level (indices in key order 'difficulty'), or an item id fragment (e.g. ':5:' = in F). */
  items?: number[];
  match?: string;
  /** The band under the take (when the drill has none): style and the chart (bar by bar). */
  band?: { style: 'pop' | 'rock' | 'swing' | 'shuffle' | 'funk'; chart: string[]; bass?: boolean; drums?: string };
}

export type TasteRun = { kind: 'lesson'; items: TasteItem[] } | { kind: 'drills'; picks: TasteDrillPick[] } | { kind: 'melody' };

export interface TasteDef {
  id: string;
  course: CourseId;
  report: SelfReport;
  /** The button: "Start: <title>". */
  title: T2;
  /** One line under it: what you will do. */
  blurb: T2;
  run: TasteRun;
}

const T = (course: CourseId, report: SelfReport, en: string, he: string, ben: string, bhe: string, run: TasteRun): TasteDef => ({ id: `${course}-${report}`, course, report, title: { en, he }, blurb: { en: ben, he: bhe }, run });
const ROCK_A = ['A', 'D', 'E', 'A', 'A', 'D', 'E', 'A'];

/** Own material and generated items only (topics, drills, the band engine); songs are public-domain (songbook). */
export const TASTES: Record<CourseId, Record<SelfReport, TasteDef>> = {
  ear: {
    new: T('ear', 'new', 'High, low and home', 'גבוה, נמוך ובית', 'Hear which note is higher, find the home note, then tap with a groove.', 'לשמוע איזה צליל גבוה יותר, למצוא את צליל הבית, ואז לתופף עם גרוב.', {
      kind: 'lesson',
      items: [{ topic: 'basics-highlow', level: 1, n: 1 }, { topic: 'find-tonic', level: 1, n: 1 }, { topic: 'basics-highlow', level: 2, n: 1 }, { beat: { bpm: 76, bars: 2 } }, { topic: 'find-tonic', level: 1, n: 1 }, { topic: 'basics-highlow', level: 3, n: 1 }],
    }),
    bit: T('ear', 'bit', 'Major or minor', 'מז׳ור או מינור', 'Hear chords as bright or dark, then in a band progression.', 'לשמוע אקורדים בהירים או כהים, ואז בתוך מהלך של להקה.', {
      kind: 'lesson',
      items: [{ topic: 'triads', level: 1, n: 4 }, { topic: 'progressions', level: 1, n: 2 }],
    }),
    well: T('ear', 'well', 'ii–V–I by ear', 'ii–V–I מהאוזן', 'Name seventh-chord qualities, then what the changes do.', 'לזהות סוגי אקורדי ספטים, ואז מה המהלכים עושים.', {
      kind: 'lesson',
      items: [{ topic: 'seventh-chords', level: 1, n: 3 }, { topic: 'jazz-changes', level: 1, n: 3 }],
    }),
  },
  keys: {
    new: T('keys', 'new', 'Your first melody', 'המנגינה הראשונה שלכם', 'Four notes, C D E G, over a soft band. The keys light up.', 'ארבעה צלילים, דו רה מי סול, מעל להקה רכה. הקלידים נדלקים.', { kind: 'melody' }),
    bit: T('keys', 'bit', 'I–IV–V with both hands', 'I–IV–V בשתי ידיים', 'Left-hand roots, right-hand triads, three top notes, with the band.', 'שורשים ביד שמאל, משולשים ביד ימין, שלושה צלילים עליונים, עם הלהקה.', {
      kind: 'drills',
      picks: [{ level: 'cadences-1', items: [0, 1, 2], band: { style: 'pop', chart: ['C F', 'G C'] } }],
    }),
    well: T('keys', 'well', 'Shells on a blues in F', 'שלדים על בלוז בפה', 'Left-hand shell voicings through a 12-bar blues with the band.', 'קולות שלד ביד שמאל לאורך בלוז של 12 תיבות עם הלהקה.', {
      kind: 'drills',
      picks: [{ level: 'voicings-6', match: ':5:', band: { style: 'swing', chart: ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'D7', 'Gm7', 'C7', 'F7', 'C7'], bass: true, drums: 'swing' } }],
    }),
  },
  guitar: {
    new: T('guitar', 'new', 'Two chords with the band', 'שני אקורדים עם הלהקה', 'A and D, one strum a bar, in time with the band.', 'לה ורה, פריטה אחת בתיבה, בזמן עם הלהקה.', {
      kind: 'drills',
      picks: [{ level: 'g-chords-2', items: [0], band: { style: 'pop', chart: ['A', 'D', 'A', 'D', 'A', 'D', 'A', 'D'], bass: true, drums: 'rock-8' } }],
    }),
    bit: T('guitar', 'bit', 'Power chords in time', 'אקורדי פאוור בזמן', 'A palm-muted riff, I–♭VII–IV, over a rock band.', 'ריף עם השתקת כף יד, I–♭VII–IV, מעל להקת רוק.', {
      kind: 'drills',
      picks: [{ level: 'g-chords-4', items: [0], band: { style: 'rock', chart: ['E', 'D', 'A', 'E'], bass: true, drums: 'rock-8' } }],
    }),
    well: T('guitar', 'well', 'Drop-2 on a ii–V–I', 'דרופ 2 על ii–V–I', 'Voice-led drop-2 voicings over a swinging band.', 'קולות דרופ 2 בהובלת קולות מעל להקה בסווינג.', {
      kind: 'drills',
      picks: [{ level: 'g-jazz-4', items: [0], band: { style: 'swing', chart: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], bass: true, drums: 'swing' } }],
    }),
  },
  bass: {
    new: T('bass', 'new', 'Roots with the drummer', 'שורשים עם המתופף', 'One note a beat, locked with the kick.', 'צליל אחד בכל פעמה, נעול עם הבס־דראם.', { kind: 'drills', picks: [{ level: 'b-time-1', items: [0] }] }),
    bit: T('bass', 'bit', 'Root and fifth', 'שורש וקווינטה', 'Root–5th over a progression, with the band.', 'שורש–קווינטה על מהלך אקורדים, עם הלהקה.', {
      kind: 'drills',
      picks: [{ level: 'b-chord-2', items: [0], band: { style: 'rock', chart: ['C', 'Am', 'F', 'G'], drums: 'rock-8' } }],
    }),
    well: T('bass', 'well', 'Walk a blues', 'ללכת בבלוז', 'An arpeggio walk through a blues in C, with the band.', 'הליכה בארפג׳ים לאורך בלוז בדו, עם הלהקה.', {
      kind: 'drills',
      picks: [{ level: 'b-walk-3', items: [0], band: { style: 'swing', chart: ['C7', 'F7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'], drums: 'swing' } }],
    }),
  },
  drums: {
    new: T('drums', 'new', 'Your first rock groove', 'גרוב הרוק הראשון שלכם', 'Hi-hat, snare on 2 and 4, kick on 1 and 3: eight bars with the band.', 'היי־האט, סנר ב־2 וב־4, בס־דראם ב־1 וב־3: שמונה תיבות עם הלהקה.', {
      kind: 'drills',
      picks: [{ level: 'd-rock-1', items: [0], band: { style: 'rock', chart: ROCK_A, bass: true } }],
    }),
    bit: T('drums', 'bit', 'Groove and a fill', 'גרוב ומילוי', 'Hold the groove, play a one-beat fill and land on 1.', 'להחזיק את הגרוב, לנגן מילוי של פעמה ולנחות על 1.', {
      kind: 'drills',
      picks: [{ level: 'd-rock-1', items: [0], band: { style: 'rock', chart: ROCK_A, bass: true } }, { level: 'd-fills-1', items: [0], band: { style: 'rock', chart: [...ROCK_A, 'A'], bass: true } }],
    }),
    well: T('drums', 'well', 'Shuffle and funk', 'שאפל ופאנק', 'A shuffle, then funk with ghost notes, with the band.', 'שאפל, ואז פאנק עם תווי רפאים, עם הלהקה.', { kind: 'drills', picks: [{ level: 'd-shuffle-2', items: [0] }, { level: 'd-funk-2', items: [0] }] }),
  },
  voice: {
    new: T('voice', 'new', 'Sing it back', 'לשיר בחזרה', 'Hear a note, then a three-note phrase, and sing it back.', 'לשמוע צליל, ואז משפט של שלושה צלילים, ולשיר אותו בחזרה.', {
      kind: 'lesson',
      items: [{ echoNote: 1 }, { echoNote: 5 }, { echoPhrase: [[1, 2, 3], [3, 2, 1], [1, 3, 5]] }],
    }),
    bit: T('voice', 'bit', 'Sing a folk tune', 'לשיר שיר עם', 'The opening of a public-domain song, in your range.', 'הפתיחה של שיר עם (נחלת הכלל), במנעד שלכם.', {
      kind: 'lesson',
      items: [{ topic: 'song-sing', level: 1, n: 3 }, { topic: 'song-sing', level: 2, n: 1 }],
    }),
    well: T('voice', 'well', 'Phrases and chord tones', 'משפטים וצלילי אקורד', 'A whole phrase of a public-domain song, then sing a chord’s arpeggio.', 'משפט שלם משיר בנחלת הכלל, ואז לשיר ארפג׳ של אקורד.', {
      kind: 'lesson',
      items: [{ topic: 'song-sing', level: 3, n: 2 }, { topic: 'sing-intervals', level: 5, n: 2 }],
    }),
  },
  jazz: {
    new: T('jazz', 'new', 'Swing or straight', 'סווינג או ישר', 'Hear the swing feel, then keep the beat with the band.', 'לשמוע את תחושת הסווינג, ואז לשמור על הפעמה עם הלהקה.', {
      kind: 'lesson',
      items: [{ topic: 'swing-ratio', level: 1, n: 3 }, { beat: { bpm: 96, bars: 2 } }, { topic: 'swing-ratio', level: 1, n: 2 }],
    }),
    bit: T('jazz', 'bit', 'Guide tones on a blues', 'צלילים מובילים על בלוז', 'Hear the 3rds and 7ths that carry the changes, and the comping.', 'לשמוע את הטרצות והספטימות שנושאות את המהלכים, ואת הליווי.', {
      kind: 'lesson',
      items: [{ topic: 'guide-tones', level: 1, n: 3 }, { topic: 'comping', level: 1, n: 3 }],
    }),
    well: T('jazz', 'well', 'Hear the changes', 'לשמוע את המהלכים', 'ii–Vs, tritone subs and the blues forms, at band tempo.', 'ii–V, תחליפי טריטון וצורות הבלוז, בקצב של להקה.', {
      kind: 'lesson',
      items: [{ topic: 'jazz-changes', level: 2, n: 3 }, { topic: 'jazz-form', level: 1, n: 3 }],
    }),
  },
};

export const tasteFor = (c: CourseId, r: SelfReport | undefined): TasteDef => TASTES[c][r ?? 'new'];
/** The quick questionnaire's music level for a self-report (onboarding's first course). */
export const levelOfReport = (r: SelfReport): 0 | 1 | 2 => (r === 'new' ? 0 : r === 'bit' ? 1 : 2);

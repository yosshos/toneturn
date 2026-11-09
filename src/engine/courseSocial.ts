// Community and achievements per course (owner 2026-11-09). Pure: which course a result belongs to, this week's XP
// per course (the league stays one across courses, its card shows the split), the level of a course (pp … ff, the
// same scale as Progress → Overview), friends who take a course, and the duel / room question sets of a course.
import { COURSE_AREAS, COURSE_IDS, inCourse, type CourseId } from './courses';
import { stepCatalogue, type PathStep } from './path';
import { domainValue, overallRating, type Ratings } from './rating';
import type { SetKind } from './tournament';

/** The fields of a result this module reads (LessonResult without the storage import cycle). */
export interface ResultLike {
  lessonId: string;
  completedAt: string;
  xp: number;
  /** The course the player was in when the result was recorded (0.65+). */
  course?: CourseId;
  items?: { tag: string; skill?: string }[];
}

let STEP_BY_ID: Map<string, PathStep> | null = null;
let STEP_SRC: PathStep[] | null = null;
function stepById(id: string): PathStep | undefined {
  const cat = stepCatalogue();
  if (!STEP_BY_ID || STEP_SRC !== cat) {
    STEP_BY_ID = new Map(cat.map((s) => [s.id, s]));
    STEP_SRC = cat;
  }
  return STEP_BY_ID.get(id);
}
const coursesOfStep = (s: PathStep): CourseId[] => COURSE_IDS.filter((c) => inCourse(s, c));

const VOICE_SKILLS = ['singing', 'technique', 'agility'];

/** The courses a result's content belongs to (may be several, e.g. ear and exam share topics), [] when unknown. */
function candidates(r: ResultLike): CourseId[] {
  const id = r.lessonId;
  if (id.startsWith('tech:') || id.startsWith('vocal:')) {
    const s = stepById(id);
    return s ? coursesOfStep(s) : id.startsWith('vocal:') ? ['voice'] : [];
  }
  if (id.startsWith('vocal') || id === 'singalong') return ['voice'];
  if (id.startsWith('topic:') || id.startsWith('lesson:')) {
    const s = stepById(id.split(':').length > 3 ? id.split(':').slice(0, 3).join(':') : id);
    return s ? coursesOfStep(s) : [];
  }
  // A generated topic session ("topic", checkpoints): its items carry "topic:<id>:<level>:<seed>".
  if (id === 'topic' || id === 'review' || id === 'workout') {
    const tag = r.items?.find((it) => it.tag?.startsWith('topic:'))?.tag;
    if (tag) {
      const s = stepById(tag.split(':').slice(0, 3).join(':'));
      if (s) return coursesOfStep(s);
    }
    if (r.items?.length && r.items.every((it) => it.skill && VOICE_SKILLS.includes(it.skill))) return ['voice'];
    return [];
  }
  // A static lesson id (e.g. "intervals-1").
  const s = stepById(`lesson:${id}`);
  if (s) return coursesOfStep(s);
  if (r.items?.length && r.items.every((it) => it.skill && VOICE_SKILLS.includes(it.skill))) return ['voice'];
  return [];
}

/**
 * The course a result counts for. The content decides when it is clear (a guitar technique level is guitar, a sung
 * exercise is voice); where several courses share it (ear and exam topics) or it is generic ("technique", a practice
 * log, a game), the course the player was in (stored on the result) decides; else 'ear'.
 */
export function courseOfResult(r: ResultLike): CourseId {
  const c = candidates(r);
  if (r.course && (!c.length || c.includes(r.course))) return r.course;
  return c[0] ?? r.course ?? 'ear';
}

/** XP per course between two instants (the league week), biggest first, courses with 0 left out. */
export function weeklyCourseXp(history: ResultLike[], from: Date, to: Date): { course: CourseId; xp: number }[] {
  const a = from.getTime();
  const b = to.getTime();
  const sum = new Map<CourseId, number>();
  for (const r of history) {
    const t = new Date(r.completedAt).getTime();
    if (!(t >= a && t < b) || !(r.xp > 0)) continue;
    const c = courseOfResult(r);
    sum.set(c, (sum.get(c) ?? 0) + r.xp);
  }
  return [...sum.entries()].map(([course, xp]) => ({ course, xp })).sort((x, y) => y.xp - x.xp || COURSE_IDS.indexOf(x.course) - COURSE_IDS.indexOf(y.course));
}

/** The league week: seven days ending at the league's endsAt. */
export function leagueWeekBounds(endsAt: string): { from: Date; to: Date } {
  const to = new Date(endsAt);
  return { from: new Date(to.getTime() - 7 * 86_400_000), to };
}

// ---------------------------------------------------------------- level of a course (pp … ff)

/** Dynamics as the level (0.63, design board ProgressPhone): from the course's rating. */
export const DYN = [
  { name: 'pp', from: 0 },
  { name: 'p', from: 800 },
  { name: 'mp', from: 950 },
  { name: 'mf', from: 1100 },
  { name: 'f', from: 1250 },
  { name: 'ff', from: 1400 },
] as const;
export type DynName = (typeof DYN)[number]['name'];
export const DYN_NAMES: DynName[] = DYN.map((d) => d.name);

export interface CourseLevel {
  /** The course's rating (null = not measured yet). */
  r: number | null;
  /** Index into DYN, -1 when not measured. */
  i: number;
  name: DynName | null;
  next: (typeof DYN)[number] | null;
  /** 0..1 of the way to the next level (1 at the top). */
  into: number;
}

/** A course's level: ear & exam → the overall rating; the others → their area (voice, instrument, creative). */
export function courseLevel(course: CourseId, ratings: Ratings): CourseLevel {
  const asR = (v: number | undefined) => (v === undefined ? null : Math.round(600 + v * 1000));
  const r = course === 'ear' || course === 'exam' ? (overallRating(ratings)?.r ?? null) : asR(domainValue(ratings, COURSE_AREAS[course][0])?.v);
  const i = r === null ? -1 : DYN.reduce((a, d, k) => (r >= d.from ? k : a), 0);
  const next = i >= 0 && i < DYN.length - 1 ? DYN[i + 1] : null;
  const span = next && i >= 0 ? next.from - DYN[i].from : 1;
  const into = next && r !== null && i >= 0 ? Math.max(0, Math.min(1, (r - DYN[i].from) / span)) : 1;
  return { r, i, name: i >= 0 ? DYN[i].name : null, next, into };
}

/** The level name of each of my courses (measured ones only) — what friends see ({"bass":"mf","ear":"f"}). */
export function courseLevels(courses: CourseId[], ratings: Ratings): Partial<Record<CourseId, DynName>> {
  const out: Partial<Record<CourseId, DynName>> = {};
  for (const c of courses) {
    const n = courseLevel(c, ratings).name;
    if (n) out[c] = n;
  }
  return out;
}

// ---------------------------------------------------------------- friends in a course

export interface CourseFriendRow {
  relation: 'me' | 'friend' | 'incoming' | 'outgoing';
  name: string;
  /** Absent: the server is older than the course-levels migration. null / {}: the player has not sent levels yet. */
  course_levels?: Record<string, string> | null;
}

/**
 * Me and my friends who take this course, highest level first. `known` is false when no friend's levels have
 * reached the server yet (an older server, or friends on an older app) — the view says so instead of an empty board.
 */
export function friendsInCourse<T extends CourseFriendRow>(rows: T[], course: CourseId, myLevel: DynName | null): { rows: (T & { level: DynName | null })[]; known: boolean } {
  const rank = (n: DynName | null | undefined) => (n ? DYN_NAMES.indexOf(n) : -1);
  const friends = rows.filter((r) => r.relation === 'friend');
  const known = friends.some((r) => r.course_levels && Object.keys(r.course_levels).length > 0);
  const out = rows
    .filter((r) => r.relation === 'me' || (r.relation === 'friend' && !!r.course_levels && course in r.course_levels))
    .map((r) => {
      const raw = r.relation === 'me' ? myLevel : (r.course_levels?.[course] as DynName | undefined);
      return { ...r, level: raw && DYN_NAMES.includes(raw) ? raw : null };
    })
    .sort((a, b) => rank(b.level) - rank(a.level) || a.name.localeCompare(b.name));
  return { rows: out, known };
}

// ---------------------------------------------------------------- duels and rooms

/** The question sets that train a course (null = the course has no sets of its own: everything stays offered). */
const COURSE_SETS: Partial<Record<CourseId, (SetKind | 'choir')[]>> = {
  ear: ['mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'echo', 'beat'],
  exam: ['mixed', 'degrees', 'chords', 'intervals', 'modes', 'wrong-notes', 'truefalse', 'echo', 'beat'],
  voice: ['vocal-hold', 'choir', 'echo', 'intervals', 'degrees'],
  jazz: ['chords', 'modes', 'degrees', 'wrong-notes', 'mixed'],
};

/** Keep a screen's set list to the course's (in the screen's order); an instrument course keeps them all. */
export function courseSetKinds<K extends SetKind | 'choir'>(course: CourseId, kinds: K[]): K[] {
  const mine = COURSE_SETS[course];
  if (!mine) return kinds;
  const out = kinds.filter((k) => mine.includes(k));
  return out.length ? out : kinds;
}

/** A screen's labelled set list kept to the course's sets (owner 2026-11-09: duels and rooms use the course's content). */
export function forCourse<K extends SetKind | 'choir'>(course: CourseId, all: [K, string][]): [K, string][] {
  const ok = courseSetKinds(course, all.map(([k]) => k));
  return all.filter(([k]) => ok.includes(k));
}
/** The default set: mixed when the course has it, else its first. */
export const firstKind = <K extends SetKind | 'choir'>(kinds: [K, string][]): K => kinds.find(([k]) => k === 'mixed')?.[0] ?? kinds[0][0];

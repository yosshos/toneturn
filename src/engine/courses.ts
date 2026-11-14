// Courses (0.61, docs/SPEC-COURSES.md, owner 2026-11-09). The app is split into separate courses — each with its
// own path, daily workout and practice — instead of one mixed path. Pure: which step belongs to which course, the
// path input of a course, the courses a player starts with, and switching (the active course's path facts live in
// Settings.pathFacts so every existing caller keeps working; the others wait in pathFactsBy).
import type { Goal, PathInput, PathStep, PathFacts, Pack } from './path';
import type { DomainId } from './rating';

export type CourseId = 'ear' | 'voice' | 'keys' | 'guitar' | 'bass' | 'jazz' | 'drums';

/** 0.67 (owner 2026-11-10): "Exams" is no longer a course but the Ear course's exam-prep mode (Settings.examPrep).
 *  Old data may still say 'exam' (courses, activeCourse, pathFactsBy, results, friends' course_levels): read it as 'ear'. */
export const LEGACY_EXAM = 'exam';
/** A stored course id as a live one: the old 'exam' course is the Ear course; unknown ids are dropped (null). */
export function normCourse(id: string | null | undefined): CourseId | null {
  if (id === LEGACY_EXAM) return 'ear';
  return COURSES.some((c) => c.id === id) ? (id as CourseId) : null;
}

export interface CourseDef {
  id: CourseId;
  name: { he: string; en: string };
  short: { he: string; en: string };
  /** Domain colour (v2 palette) and the note-head glyph. */
  color: string;
  glyph: 'ear' | 'intervals' | 'sing' | 'keys' | 'guitar' | 'bass' | 'prog' | 'theory' | 'drums';
  /** The path goal used inside the course (area weights and boosts). */
  goal: Goal;
  /** What the course plays on (instrument-only steps). */
  plays: string[];
  /** Still being built (0.61: bass was beta until its curriculum was deepened, out of beta in 0.66; drums still beta). */
  beta?: boolean;
  /** A short line on the course card (onboarding, course switcher): what the course needs. */
  note?: { he: string; en: string };
}

export const COURSES: CourseDef[] = [
  { id: 'ear', name: { he: 'שמיעה ותיאוריה', en: 'Ear & theory' }, short: { he: 'שמיעה', en: 'Ear' }, color: '#3AB8FF', glyph: 'ear', goal: 'general', plays: [] },
  { id: 'voice', name: { he: 'שירה', en: 'Singing' }, short: { he: 'שירה', en: 'Voice' }, color: '#12C9B4', glyph: 'sing', goal: 'sing', plays: ['voice'] },
  { id: 'keys', name: { he: 'פסנתר וקלידים', en: 'Piano & keys' }, short: { he: 'פסנתר', en: 'Piano' }, color: '#FFD43B', glyph: 'keys', goal: 'general', plays: ['keys'] },
  { id: 'guitar', name: { he: 'גיטרה', en: 'Guitar' }, short: { he: 'גיטרה', en: 'Guitar' }, color: '#FFD43B', glyph: 'guitar', goal: 'guitar', plays: ['guitar'] },
  { id: 'bass', name: { he: 'בס', en: 'Bass' }, short: { he: 'בס', en: 'Bass' }, color: '#FF5FA2', glyph: 'bass', goal: 'guitar', plays: ['bass'] },
  // 0.65 (DRUMS_CURRICULUM): measured on a MIDI e-kit, or a practice pad by microphone (single-surface items only).
  { id: 'drums', name: { he: 'תופים', en: 'Drums' }, short: { he: 'תופים', en: 'Drums' }, color: '#4CD07D', glyph: 'drums', goal: 'general', plays: ['drums'], beta: true, note: { en: 'Best with an e-kit by MIDI', he: 'הכי טוב עם תופים אלקטרוניים ב-MIDI' } },
  { id: 'jazz', name: { he: 'ג׳אז ואלתור', en: 'Jazz & improv' }, short: { he: 'ג׳אז', en: 'Jazz' }, color: '#A78BFA', glyph: 'prog', goal: 'jazz', plays: [] },
];
export const COURSE_IDS = COURSES.map((c) => c.id);
export const courseOf = (id: string | null | undefined): CourseDef => COURSES.find((c) => c.id === id) ?? COURSES[0];

/** The areas a course's workout may draw "area" blocks from (the path itself is already the course's). */
export const COURSE_AREAS: Record<CourseId, DomainId[]> = {
  ear: ['pitch', 'time', 'memory', 'reading'],
  voice: ['voice'],
  keys: ['instrument'],
  guitar: ['instrument'],
  bass: ['instrument'],
  jazz: ['creative'],
  drums: ['instrument', 'time'],
};

const INSTR: Record<string, CourseId> = { keys: 'keys', piano: 'keys', guitar: 'guitar', bass: 'bass', drums: 'drums' };

/** The keyboard map 1–3 (key-notes): offered to every player and in the Ear course too (AUDIT-CONTENT-THEORY §ב.1). */
export const isKeysForAll = (s: Partial<Pick<PathStep, 'topic' | 'level'>>): boolean => s.topic === 'key-notes' && (s.level ?? 9) <= 3;

/** Does this path step belong to the course? Courses are (almost) disjoint, so progress never shows twice. */
export function inCourse(s: Pick<PathStep, 'domain' | 'sung' | 'forPlays' | 'pack'> & Partial<Pick<PathStep, 'topic' | 'level'>>, c: CourseId): boolean {
  // AUDIT-CONTENT-THEORY §ב.1: note names on the keyboard (key-notes 1–3) are the theory picture every beginner needs,
  // so they belong to the Ear course too (the one shared exception).
  if (c === 'ear' && isKeysForAll(s)) return true;
  const voiceish = !!s.sung || s.domain === 'voice';
  const instr = s.forPlays?.map((p) => INSTR[p]).filter(Boolean) as CourseId[] | undefined;
  const jazzish = s.pack === 'jazz' || s.domain === 'creative';
  switch (c) {
    case 'voice':
      return voiceish && !instr?.length;
    case 'keys':
    case 'guitar':
    case 'bass':
    case 'drums':
      return !!instr?.includes(c);
    case 'jazz':
      return jazzish && !voiceish && !instr?.length;
    case 'ear':
      return !voiceish && !instr?.length && !jazzish;
  }
}

/** The goal a course's path and workout use: the Ear course in exam-prep mode weighs what the exams test. */
export const courseGoal = (c: CourseId, examPrep = false): Goal => (c === 'ear' && examPrep ? 'exam' : courseOf(c).goal);

/** The path input of a course: same player, same evidence, but the course's goal, instrument and packs. */
export function courseInput(base: PathInput, c: CourseId, examPrep = false): PathInput {
  const def = courseOf(c);
  const packs: Pack[] = c === 'jazz' ? Array.from(new Set<Pack>(['jazz', ...base.packs])) : base.packs.filter((p) => p !== 'jazz');
  return {
    ...base,
    course: c,
    goal: courseGoal(c, examPrep),
    plays: def.plays.length ? def.plays : base.plays,
    packs,
    // Choosing a course is choosing to do it: its own area is never "left out".
    leaveOut: base.leaveOut.filter((d) => !(c === 'voice' && d === 'voice') && !(c === 'jazz' && d === 'creative') && !(INSTR[def.plays[0] ?? ''] && d === 'instrument')),
    noSing: c === 'voice' ? false : base.noSing,
  };
}

/** The courses a player starts with, from the old questionnaire answers (migration and quick onboarding). */
export function coursesFromProfile(goal: Goal | undefined, plays: string[]): { courses: CourseId[]; active: CourseId; examPrep: boolean } {
  const out: CourseId[] = ['ear'];
  const add = (c: CourseId) => !out.includes(c) && out.push(c);
  for (const p of plays) if (INSTR[p]) add(INSTR[p]);
  if (goal === 'sing' || plays.includes('voice')) add('voice');
  if (goal === 'guitar') add('guitar');
  if (goal === 'jazz') add('jazz');
  // "Exam prep" is the Ear course in exam-prep mode (0.67).
  const byGoal: Partial<Record<Goal, CourseId>> = { sing: 'voice', guitar: 'guitar', jazz: 'jazz', exam: 'ear' };
  const active = (goal && byGoal[goal]) || 'ear';
  return { courses: out, active, examPrep: goal === 'exam' };
}

/** Merge two path-fact records of the same steps (the old exam course into ear): best stars, earliest first time,
 *  most plays, every test-out; the frozen units of the preferred record (they follow its order). */
export function mergeFacts(keep: PathFacts | undefined, other: PathFacts | undefined): PathFacts {
  if (!other) return keep ?? {};
  if (!keep) return other;
  const steps = { ...(other.steps ?? {}) };
  for (const [id, st] of Object.entries(keep.steps ?? {})) {
    const o = steps[id];
    if (!o) steps[id] = st;
    else {
      const best = st.stars >= o.stars ? st : o;
      const firstAt = [st.firstAt ?? st.at, o.firstAt ?? o.at].sort()[0];
      const times = Math.max(st.times ?? 0, o.times ?? 0) || undefined;
      steps[id] = { ...best, ...(firstAt ? { firstAt } : {}), ...(times ? { times } : {}) };
    }
  }
  const tests = { ...(other.tests ?? {}), ...(keep.tests ?? {}) };
  const units = keep.units?.length ? keep.units : other.units;
  return { ...(Object.keys(steps).length ? { steps } : {}), ...(units?.length ? { units } : {}), ...(Object.keys(tests).length ? { tests } : {}) };
}

/** Settings fields that move when the active course changes. */
export interface CourseState {
  courses?: CourseId[];
  activeCourse?: CourseId;
  pathFacts?: PathFacts;
  pathFactsBy?: Partial<Record<CourseId, PathFacts>>;
  pathKeep?: string[];
  pathKeepBy?: Partial<Record<CourseId, string[]>>;
  examPrep?: boolean;
}

/** 0.67: a player who had the old 'exam' course keeps the Ear course (added if missing) with exam prep on; the exam
 *  path's facts and kept steps merge into ear's (the same steps), and 'exam' disappears from every list. */
export function migrateExamCourse<T extends CourseState>(s: T): T {
  const raw = s as unknown as { courses?: string[]; activeCourse?: string; pathFactsBy?: Record<string, PathFacts>; pathKeepBy?: Record<string, string[]> };
  const had = raw.activeCourse === LEGACY_EXAM || !!raw.courses?.includes(LEGACY_EXAM) || !!raw.pathFactsBy?.[LEGACY_EXAM] || !!raw.pathKeepBy?.[LEGACY_EXAM];
  if (!had) return s;
  const wasActive = raw.activeCourse === LEGACY_EXAM;
  const courses: CourseId[] = [];
  for (const c of raw.courses ?? []) {
    const n = normCourse(c);
    if (n && !courses.includes(n)) courses.push(n);
  }
  if (!courses.includes('ear')) courses.unshift('ear');
  const factsBy = { ...(raw.pathFactsBy ?? {}) };
  const keepBy = { ...(raw.pathKeepBy ?? {}) };
  const examFacts = wasActive ? s.pathFacts : factsBy[LEGACY_EXAM];
  const examKeep = wasActive ? s.pathKeep : keepBy[LEGACY_EXAM];
  delete factsBy[LEGACY_EXAM];
  delete keepBy[LEGACY_EXAM];
  const union = (a?: string[], b?: string[]) => Array.from(new Set([...(a ?? []), ...(b ?? [])]));
  const out: CourseState = { ...s, courses, examPrep: true, pathFactsBy: factsBy as CourseState['pathFactsBy'], pathKeepBy: keepBy as CourseState['pathKeepBy'] };
  if (wasActive) {
    // The exam path was the live one: it becomes ear's (its units first), with any parked ear facts merged in.
    out.activeCourse = 'ear';
    out.pathFacts = mergeFacts(examFacts, factsBy.ear);
    out.pathKeep = union(examKeep, keepBy.ear);
    delete factsBy.ear;
    delete keepBy.ear;
  } else if (raw.activeCourse === 'ear' || !raw.activeCourse) {
    out.activeCourse = 'ear';
    out.pathFacts = mergeFacts(s.pathFacts, examFacts);
    out.pathKeep = union(s.pathKeep, examKeep);
  } else {
    // Another course is active: ear waits parked, with the exam facts merged in.
    if (examFacts || factsBy.ear) factsBy.ear = mergeFacts(factsBy.ear, examFacts);
    if (examKeep || keepBy.ear) keepBy.ear = union(keepBy.ear, examKeep);
  }
  return out as T;
}

/** Switch (or add and switch) to a course: park the current course's facts, load the new one's. */
export function switchCourse(s: CourseState, to: CourseId): CourseState {
  const from = s.activeCourse ?? 'ear';
  // (0.67 fix: with no stored list, re-picking the active course no longer lists it twice.)
  const mine = s.courses?.length ? s.courses : [from];
  const courses = mine.includes(to) ? mine : [...mine, to];
  if (from === to) return { courses };
  const factsBy = { ...(s.pathFactsBy ?? {}), [from]: s.pathFacts ?? {} };
  const keepBy = { ...(s.pathKeepBy ?? {}), [from]: s.pathKeep ?? [] };
  return {
    courses,
    activeCourse: to,
    pathFacts: factsBy[to] ?? {},
    pathFactsBy: factsBy,
    pathKeep: keepBy[to] ?? [],
    pathKeepBy: keepBy,
  };
}

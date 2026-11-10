// Courses (0.61, docs/SPEC-COURSES.md, owner 2026-11-09). The app is split into separate courses — each with its
// own path, daily workout and practice — instead of one mixed path. Pure: which step belongs to which course, the
// path input of a course, the courses a player starts with, and switching (the active course's path facts live in
// Settings.pathFacts so every existing caller keeps working; the others wait in pathFactsBy).
import type { Goal, PathInput, PathStep, PathFacts, Pack } from './path';
import type { DomainId } from './rating';

export type CourseId = 'ear' | 'voice' | 'keys' | 'guitar' | 'bass' | 'jazz' | 'exam' | 'drums';

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
  /** Still being built (0.61, owner: bass is beta until its curriculum is deepened). */
  beta?: boolean;
  /** A short line on the course card (onboarding, course switcher): what the course needs. */
  note?: { he: string; en: string };
}

export const COURSES: CourseDef[] = [
  { id: 'ear', name: { he: 'שמיעה ותיאוריה', en: 'Ear & theory' }, short: { he: 'שמיעה', en: 'Ear' }, color: '#3AB8FF', glyph: 'ear', goal: 'general', plays: [] },
  { id: 'voice', name: { he: 'שירה', en: 'Singing' }, short: { he: 'שירה', en: 'Voice' }, color: '#12C9B4', glyph: 'sing', goal: 'sing', plays: ['voice'] },
  { id: 'keys', name: { he: 'פסנתר וקלידים', en: 'Piano & keys' }, short: { he: 'פסנתר', en: 'Piano' }, color: '#FFD43B', glyph: 'keys', goal: 'general', plays: ['keys'] },
  { id: 'guitar', name: { he: 'גיטרה', en: 'Guitar' }, short: { he: 'גיטרה', en: 'Guitar' }, color: '#FFD43B', glyph: 'guitar', goal: 'guitar', plays: ['guitar'] },
  { id: 'bass', name: { he: 'בס', en: 'Bass' }, short: { he: 'בס', en: 'Bass' }, color: '#FF5FA2', glyph: 'bass', goal: 'guitar', plays: ['bass'], beta: true },
  // 0.65 (DRUMS_CURRICULUM): measured on a MIDI e-kit, or a practice pad by microphone (single-surface items only).
  { id: 'drums', name: { he: 'תופים', en: 'Drums' }, short: { he: 'תופים', en: 'Drums' }, color: '#4CD07D', glyph: 'drums', goal: 'general', plays: ['drums'], beta: true, note: { en: 'Best with an e-kit by MIDI', he: 'הכי טוב עם תופים אלקטרוניים ב-MIDI' } },
  { id: 'jazz', name: { he: 'ג׳אז ואלתור', en: 'Jazz & improv' }, short: { he: 'ג׳אז', en: 'Jazz' }, color: '#A78BFA', glyph: 'prog', goal: 'jazz', plays: [] },
  { id: 'exam', name: { he: 'בגרות ומבחנים', en: 'Exams' }, short: { he: 'בגרות', en: 'Exams' }, color: '#FF8A3D', glyph: 'theory', goal: 'exam', plays: [] },
];
export const COURSE_IDS = COURSES.map((c) => c.id);
export const courseOf = (id: string | null | undefined): CourseDef => COURSES.find((c) => c.id === id) ?? COURSES[0];

/** The areas a course's workout may draw "area" blocks from (the path itself is already the course's). */
export const COURSE_AREAS: Record<CourseId, DomainId[]> = {
  ear: ['pitch', 'time', 'memory', 'reading'],
  exam: ['pitch', 'time', 'memory', 'reading'],
  voice: ['voice'],
  keys: ['instrument'],
  guitar: ['instrument'],
  bass: ['instrument'],
  jazz: ['creative'],
  drums: ['instrument', 'time'],
};

const INSTR: Record<string, CourseId> = { keys: 'keys', piano: 'keys', guitar: 'guitar', bass: 'bass', drums: 'drums' };

/** Does this path step belong to the course? Courses are (almost) disjoint, so progress never shows twice. */
export function inCourse(s: Pick<PathStep, 'domain' | 'sung' | 'forPlays' | 'pack'>, c: CourseId): boolean {
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
    case 'exam':
      return !voiceish && !instr?.length && !jazzish;
  }
}

/** The path input of a course: same player, same evidence, but the course's goal, instrument and packs. */
export function courseInput(base: PathInput, c: CourseId): PathInput {
  const def = courseOf(c);
  const packs: Pack[] = c === 'jazz' ? Array.from(new Set<Pack>(['jazz', ...base.packs])) : base.packs.filter((p) => p !== 'jazz');
  return {
    ...base,
    course: c,
    goal: def.goal,
    plays: def.plays.length ? def.plays : base.plays,
    packs,
    // Choosing a course is choosing to do it: its own area is never "left out".
    leaveOut: base.leaveOut.filter((d) => !(c === 'voice' && d === 'voice') && !(c === 'jazz' && d === 'creative') && !(INSTR[def.plays[0] ?? ''] && d === 'instrument')),
    noSing: c === 'voice' ? false : base.noSing,
  };
}

/** The courses a player starts with, from the old questionnaire answers (migration and quick onboarding). */
export function coursesFromProfile(goal: Goal | undefined, plays: string[]): { courses: CourseId[]; active: CourseId } {
  const out: CourseId[] = ['ear'];
  const add = (c: CourseId) => !out.includes(c) && out.push(c);
  for (const p of plays) if (INSTR[p]) add(INSTR[p]);
  if (goal === 'sing' || plays.includes('voice')) add('voice');
  if (goal === 'guitar') add('guitar');
  if (goal === 'jazz') add('jazz');
  if (goal === 'exam') add('exam');
  const byGoal: Partial<Record<Goal, CourseId>> = { sing: 'voice', guitar: 'guitar', jazz: 'jazz', exam: 'exam' };
  const active = (goal && byGoal[goal]) || 'ear';
  return { courses: out, active };
}

/** Settings fields that move when the active course changes. */
export interface CourseState {
  courses?: CourseId[];
  activeCourse?: CourseId;
  pathFacts?: PathFacts;
  pathFactsBy?: Partial<Record<CourseId, PathFacts>>;
  pathKeep?: string[];
  pathKeepBy?: Partial<Record<CourseId, string[]>>;
}

/** Switch (or add and switch) to a course: park the current course's facts, load the new one's. */
export function switchCourse(s: CourseState, to: CourseId): CourseState {
  const from = s.activeCourse ?? 'ear';
  const courses = s.courses?.includes(to) ? s.courses : [...(s.courses ?? [from]), to];
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

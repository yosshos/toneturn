// Courses (0.61, docs/SPEC-COURSES.md, owner 2026-11-09). The app is split into separate courses — each with its
// own path, daily workout and practice — instead of one mixed path. Pure: which step belongs to which course, the
// path input of a course, the courses a player starts with, and switching (the active course's path facts live in
// Settings.pathFacts so every existing caller keeps working; the others wait in pathFactsBy).
import type { Goal, PathInput, PathStep, PathFacts, Pack } from './path';
import type { DomainId } from './rating';
import type { SkillId } from './lesson';

export type CourseId = 'ear' | 'voice' | 'keys' | 'guitar' | 'bass' | 'drums';

/** 0.67 (owner 2026-11-10): "Exams" is no longer a course but the Ear course's exam-prep mode (Settings.examPrep).
 *  Old data may still say 'exam' (courses, activeCourse, pathFactsBy, results, friends' course_levels): read it as 'ear'. */
export const LEGACY_EXAM = 'exam';
/** 2026-11-19 (owner, docs/SPEC-JAZZ-FOLD.md): "Jazz & improv" is no longer a course. Its ear and theory are the top
 *  levels of the Ear course, its playing lives in the instrument courses, and "jazz focus" is a mode of each course.
 *  Old data may still say 'jazz' (courses, activeCourse, pathFactsBy, results, friends' course_levels): read it as 'ear'. */
export const LEGACY_JAZZ = 'jazz';
/** A stored course id as a live one: the old 'exam' and 'jazz' courses are the Ear course; unknown ids are dropped (null). */
export function normCourse(id: string | null | undefined): CourseId | null {
  if (id === LEGACY_EXAM || id === LEGACY_JAZZ) return 'ear';
  return COURSES.some((c) => c.id === id) ? (id as CourseId) : null;
}

export interface CourseDef {
  id: CourseId;
  name: { he: string; en: string };
  short: { he: string; en: string };
  /** Domain colour (v2 palette) and the note-head glyph. */
  color: string;
  glyph: 'ear' | 'intervals' | 'sing' | 'keys' | 'guitar' | 'bass' | 'prog' | 'theory' | 'drums' | 'jazz';
  /** The path goal used inside the course (area weights and boosts). */
  goal: Goal;
  /** What the course plays on (instrument-only steps). */
  plays: string[];
  /** Still being built (0.61: bass was beta until its curriculum was deepened, out of beta in 0.66; drums out of beta in 0.96). */
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
  { id: 'drums', name: { he: 'תופים', en: 'Drums' }, short: { he: 'תופים', en: 'Drums' }, color: '#4CD07D', glyph: 'drums', goal: 'general', plays: ['drums'], note: { en: 'Best with an e-kit by MIDI', he: 'הכי טוב עם תופים אלקטרוניים ב-MIDI' } },
];
export const COURSE_IDS = COURSES.map((c) => c.id);
export const courseOf = (id: string | null | undefined): CourseDef => COURSES.find((c) => c.id === normCourse(id)) ?? COURSES[0];

/** The areas a course's workout may draw "area" blocks from (the path itself is already the course's). */
export const COURSE_AREAS: Record<CourseId, DomainId[]> = {
  ear: ['pitch', 'time', 'memory', 'reading'],
  voice: ['voice'],
  keys: ['instrument'],
  guitar: ['instrument'],
  bass: ['instrument'],
  drums: ['instrument', 'time'],
};

/**
 * Owner 2026-11-19: "the level test must check everything the course covers". The skills a course's own Find my level
 * measures (null = the course has its own sectioned test): Ear & theory = hearing, harmony, rhythm, memory, reading and
 * theory, transposing and expression. SPEC-JAZZ-FOLD: the Jazz course's test (improvising, chords, changes, modes,
 * swing, forms) folded into Ear's — with the jazz pack open, Ear's test adds the theory of improvising (call and response
 * by ear) and its ladders keep their jazz rungs (coursePlacementSkills, placement.ts noJazz).
 */
export const COURSE_PLACEMENT_SKILLS: Record<CourseId, SkillId[] | null> = {
  ear: ['degrees', 'intervals', 'pitch', 'absolute', 'chords', 'cadences', 'modes', 'rhythm-dictation', 'rhythm-reading', 'tempo', 'meter', 'sequences', 'rhythm', 'form', 'notes', 'theory', 'sight', 'dictation', 'transpose', 'expression'],
  voice: null,
  keys: null,
  guitar: null,
  bass: null,
  drums: null,
};

/** The skills a course's Find my level measures, with the jazz pack open or closed (SPEC-JAZZ-FOLD §2). */
export function coursePlacementSkills(c: CourseId, jazz: boolean): SkillId[] | null {
  const base = COURSE_PLACEMENT_SKILLS[c];
  return base && c === 'ear' && jazz ? [...base, 'improv'] : base;
}

const INSTR: Record<string, CourseId> = { keys: 'keys', piano: 'keys', guitar: 'guitar', bass: 'bass', drums: 'drums' };

/** The keyboard map 1–3 (key-notes): offered to every player and in the Ear course too (AUDIT-CONTENT-THEORY §ב.1). */
export const isKeysForAll = (s: Partial<Pick<PathStep, 'topic' | 'level'>>): boolean => s.topic === 'key-notes' && (s.level ?? 9) <= 3;

/**
 * Curriculum audit 2026-11-19 (VOICE-DRUMS R3a, owner's choice "share the lessons"): the Ear lessons the voice lessons
 * build on — scale degrees and note names (sing-names, sing-home-five, transcription), what a chord is and major /
 * minor (runs, chord-tones, the blues and pop entries) — are in the voice course too. Same step id, shared credit, as
 * with key-notes 1–3.
 */
export const VOICE_SHARED_LESSONS: string[] = ['degrees-135', 'notes-degrees', 'chord-intro', 'major-minor'];
/**
 * Curriculum audit 2026-11-19 (INSTRUMENTS L1, L2, L4, D2): the shared theory lessons the instrument courses use — chords
 * of the key (cadences, root finders, I–IV–V), seventh chords (7th arpeggios, voicings, shells), the scales (minor
 * scales on keys and guitar) and the modes (Dorian levels, modal improvising). Same step id as in Ear, shared credit.
 * The technique level that first uses one also opens with its short lesson (mini/theoryCore.ts UNITS).
 */
export const THEORY_SHARED_LESSONS: Partial<Record<CourseId, string[]>> = {
  keys: ['chord-numbers', 'sevenths', 'scales-mm', 'mode-colours'],
  guitar: ['chord-numbers', 'sevenths', 'scales-mm', 'mode-colours'],
  bass: ['chord-numbers', 'sevenths', 'mode-colours'],
};

/**
 * AUDIT-6 J-W2: the performed jazz families — improvising, comping, walking, scat — that the old Jazz course path also
 * taught. Since SPEC-JAZZ-FOLD they live only in their instrument / voice course (the step's forPlays decides).
 */
export const JAZZ_LADDER_FAMILIES: string[] = [
  // piano: improvisation habits (a one-note / two-note solo over a blues), the solo left hand (shells), LH voicings,
  // jazz lines (guide tones), comping vocabulary, improvising by the rules
  'k-impro', 'k-lh', 'voicings', 'jazz', 'k-comp', 'k-solo',
  // guitar: target-note improvising, jazz comping, improvising by the rules
  'g-impro', 'g-jazz', 'g-solo',
  // AUDIT-7 #2: the guitarist's jazz entry over the blues (head, shells, guide tones, the Charleston) below 1000.
  'g-jblues',
  // bass: walking, fills and target notes, swing time
  'b-walk', 'b-impro', 'b-swing',
  // drums: the jazz ride, comping and trading
  'd-jazz',
  // voice: scat and standards
  'v-scat', 'v-standards',
  // AUDIT-7 #2: the singer's jazz entry (a blues head, scat calls, guide tones on a blues) below 1000.
  'v-jazz1',
];

/**
 * SPEC-JAZZ-FOLD §2: the technique families / vocal programs that are jazz content — closed in an instrument or voice
 * course while the jazz pack is closed there. Piano: the families of style 'jazz' (drills catalog) except the
 * accompaniment family (Alberti, pop, boogie hands); guitar: the jazz add-on families; bass: the jazz-track families
 * (bassNiche BASS_TRACK) with walking and swing time; drums: the jazz ride, brushes, trading; voice: scat, standards, the
 * jazz entry, Barry Harris. Generic improvising habits (k-impro, g-impro, b-impro) stay open for everyone.
 * tests/jazzFold.test.ts checks this list against the catalogues.
 */
export const JAZZ_FAMILIES: string[] = [
  // piano
  'harris', 'k-sixdim', 'k-dimcol', 'voicings', 'k-reharm', 'k-theory', 'jazz', 'k-bebop', 'k-keys', 'k-vocab', 'k-phrase', 'k-harm', 'k-tune', 'k-solo', 'k-ctx', 'k-harrisline', 'k-ctone', 'k-mediant', 'k-organ', 'k-tpair', 'k-lh', 'k-tex', 'k-comp', 'k-gig', 'k-mmhm',
  // guitar
  'g-jazz', 'g-jblues', 'g-theory', 'g-harris', 'g-harrisline', 'g-ctone', 'g-color', 'g-tpair', 'g-keys', 'g-bebop', 'g-phrase', 'g-cmel', 'g-tune', 'g-ctx', 'g-solo', 'g-gig', 'g-cmarr', 'g-solojazz', 'g-hlfast',
  // bass
  'b-walk', 'b-swing', 'b-barry', 'b-harrisline', 'b-counter', 'b-tpair', 'b-jform', 'b-latin', 'b-std', 'b-keys', 'b-tune', 'b-bebop', 'b-phrase', 'b-ctx', 'b-solo', 'b-gig',
  // drums
  'd-jazz', 'd-brush', 'd-trade',
  // voice
  'v-scat', 'v-standards', 'v-jazz1', 'v-barry',
];
/** Levels of a jazz family that every player gets: triads and root-position 7th chords (voicings 1–2). */
export const JAZZ_FREE_LEVELS: string[] = ['voicings-1', 'voicings-2'];

/**
 * SPEC-JAZZ-FOLD §2: is this step jazz content (shown only while the jazz pack is open in the course)? The jazz pack's
 * topics, levels and lessons; the creative area's improvising skill (licks, call and response, improv theory); and the
 * levels of the jazz technique families.
 */
export function isJazzStep(s: Partial<Pick<PathStep, 'pack' | 'domain' | 'skill' | 'ladder'>>): boolean {
  if (s.pack === 'jazz') return true;
  if (s.domain === 'creative' && (s.skill === undefined || s.skill === 'improv')) return true;
  return !!s.ladder && JAZZ_FAMILIES.includes(s.ladder.family) && !JAZZ_FREE_LEVELS.includes(s.ladder.ref);
}

/**
 * SPEC-JAZZ-FOLD §2: the games that are jazz content (voicing types, reharm, standards, Barry Harris's brothers,
 * comping, guide tones, bebop enclosures and 5-4-3-2, one note many chords, triad pairs, negative harmony, Harris in
 * time). Shown in Practice, the path's units and the workout only while the jazz pack is open in the course.
 */
export const JAZZ_GAMES: string[] = ['rush-voicing', 'reharm', 'rush-standard', 'whichbrother', 'compcaller', 'guidetone', 'call5432', 'enclosure', 'holdnote', 'whichpair', 'mirror', 'bhtime'];

/**
 * AUDIT-7 #2: jazz topics about the pianist's hands (the solo left hand, solo-piano textures by ear) — shown only
 * to a player whose instruments include the keys; a guitarist, bassist or singer gets the jazz ear without them.
 */
export const PIANO_ONLY_JAZZ_TOPICS: string[] = ['lh-tex-ear', 'solo-tex-ear'];
export const playsKeys = (plays: string[]): boolean => plays.includes('keys') || plays.includes('piano');

/**
 * Does this path step belong to the course? Courses are (almost) disjoint, so progress never shows twice.
 *
 * COURSE MEMBERSHIP RULE (AUDIT-6 §3 + SPEC-JAZZ-FOLD, docs/SPEC-COURSES.md "Course membership"):
 * - An instrument step (forPlays) belongs to its instrument course; a sung step to Voice — the jazz ones included
 *   (comping, walking, Harris on the keys, scat …), gated by the jazz pack in eligible().
 * - Ear = everything else that is heard, read or written — including expression, Nashville numbers, transposition,
 *   and, as its top levels, the jazz pack (swing, the blues on-ramp, shells and guide tones, rootless and upper-structure
 *   voicings, the jazz grids, bebop scales, ii–V chains, Barry Harris, reharm and colour, jazz forms and dictation) and
 *   the theory of improvising (licks, call and response, jazz repertoire) — gated by the jazz pack.
 */
export function inCourse(s: Pick<PathStep, 'domain' | 'sung' | 'forPlays' | 'pack'> & Partial<Pick<PathStep, 'topic' | 'level' | 'skill' | 'ladder' | 'kind' | 'lesson'>>, c: CourseId): boolean {
  // AUDIT-CONTENT-THEORY §ב.1: note names on the keyboard (key-notes 1–3) are the theory picture every beginner needs,
  // so they belong to the Ear course too (the one shared exception).
  if (c === 'ear' && isKeysForAll(s)) return true;
  if (c === 'voice' && s.kind === 'lesson' && !!s.lesson && VOICE_SHARED_LESSONS.includes(s.lesson)) return true;
  if (s.kind === 'lesson' && !!s.lesson && THEORY_SHARED_LESSONS[c]?.includes(s.lesson)) return true;
  const voiceish = !!s.sung || s.domain === 'voice';
  const instr = s.forPlays?.map((p) => INSTR[p]).filter(Boolean) as CourseId[] | undefined;
  switch (c) {
    case 'voice':
      return voiceish && !instr?.length;
    case 'keys':
    case 'guitar':
    case 'bass':
    case 'drums':
      return !!instr?.includes(c);
    case 'ear':
      return !voiceish && !instr?.length;
  }
}

/** The goal a course's path and workout use: the Ear course in exam-prep mode weighs what the exams test; in jazz
 *  focus (SPEC-JAZZ-FOLD §4), what jazz harmony leans on (chords, cadences, modes). Exam prep wins when both are on. */
export const courseGoal = (c: CourseId, examPrep = false, jazzFocus = false): Goal => (c === 'ear' && examPrep ? 'exam' : c === 'ear' && jazzFocus ? 'jazz' : courseOf(c).goal);

/**
 * The path input of a course: same player, same evidence, but the course's goal, instrument and packs. The jazz pack
 * stays as the caller's packs say (background, auto-open — jazzFold.ts); jazz focus opens it and prefers jazz steps.
 */
export function courseInput(base: PathInput, c: CourseId, examPrep = false, jazzFocus = false): PathInput {
  const def = courseOf(c);
  const packs: Pack[] = jazzFocus ? Array.from(new Set<Pack>([...base.packs, 'jazz'])) : base.packs;
  return {
    ...base,
    course: c,
    goal: courseGoal(c, examPrep, jazzFocus),
    plays: def.plays.length ? def.plays : base.plays,
    packs,
    ...(jazzFocus ? { jazzFocus: true } : {}),
    // Choosing a course is choosing to do it: its own area is never "left out" (nor improvising, in jazz focus).
    leaveOut: base.leaveOut.filter((d) => !(c === 'voice' && d === 'voice') && !(jazzFocus && d === 'creative') && !(INSTR[def.plays[0] ?? ''] && d === 'instrument')),
    noSing: c === 'voice' ? false : base.noSing,
  };
}

/** The courses a player starts with, from the old questionnaire answers (migration and quick onboarding). The goal
 *  "an ear for jazz" is the Ear course in jazz focus (SPEC-JAZZ-FOLD), "exam prep" the Ear course in exam prep (0.67). */
export function coursesFromProfile(goal: Goal | undefined, plays: string[]): { courses: CourseId[]; active: CourseId; examPrep: boolean; jazzFocus: boolean } {
  const out: CourseId[] = ['ear'];
  const add = (c: CourseId) => !out.includes(c) && out.push(c);
  for (const p of plays) if (INSTR[p]) add(INSTR[p]);
  if (goal === 'sing' || plays.includes('voice')) add('voice');
  if (goal === 'guitar') add('guitar');
  const byGoal: Partial<Record<Goal, CourseId>> = { sing: 'voice', guitar: 'guitar', jazz: 'ear', exam: 'ear' };
  const active = (goal && byGoal[goal]) || 'ear';
  return { courses: out, active, examPrep: goal === 'exam', jazzFocus: goal === 'jazz' };
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
  // SPEC-PATH-ROLE: technique checked in keys at a checkpoint, and sealed units, are kept from both.
  const keysChecked = { ...(other.keysChecked ?? {}), ...(keep.keysChecked ?? {}) };
  const sealed = { ...(other.sealed ?? {}), ...(keep.sealed ?? {}) };
  return { ...(Object.keys(steps).length ? { steps } : {}), ...(units?.length ? { units } : {}), ...(Object.keys(tests).length ? { tests } : {}), ...(Object.keys(keysChecked).length ? { keysChecked } : {}), ...(Object.keys(sealed).length ? { sealed } : {}) };
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
  /** SPEC-JAZZ-FOLD §4: the courses in jazz focus. */
  jazzFocus?: CourseId[];
  /** SPEC-JAZZ-FOLD §3: the courses where climbing opened the jazz pack. */
  jazzOpen?: CourseId[];
  /** A one-time notice still to show: the course whose jazz just opened by climbing (owner 2026-11-19: no notice for
   *  the fold itself — the app has no users yet). 'fold' is a leftover value, cleared silently. */
  jazzNotice?: 'fold' | CourseId;
  /** Per-course records keyed by course id that move with the course (courseStart, openers.course). */
  courseStart?: Partial<Record<CourseId, unknown>>;
  openers?: { course?: Partial<Record<CourseId, string>>; unit?: Record<string, string> };
}

/** The courses that can be in jazz focus (every course: Ear and each instrument / voice course). */
export const JAZZ_FOCUS_COURSES: CourseId[] = ['ear', 'keys', 'guitar', 'bass', 'drums', 'voice'];

/**
 * SPEC-JAZZ-FOLD §5: a player who had the old 'jazz' course keeps the Ear course (added if missing) and their
 * instrument courses, with jazz focus on (and the jazz pack kept open) in all of them; the jazz path's facts and kept steps merge into Ear's (the same
 * step ids: the jazz ear, licks, bonus games and repertoire are Ear steps now; the jazz technique levels' facts come from
 * the measured takes and stay with their instrument). The course start and the opener seen move to Ear when Ear has
 * none, and a one-time notice explains the change. 'jazz' disappears from every list. Idempotent.
 */
export function migrateJazzCourse<T extends CourseState>(s: T): T {
  const raw = s as unknown as { courses?: string[]; activeCourse?: string; pathFactsBy?: Record<string, PathFacts>; pathKeepBy?: Record<string, string[]>; courseStart?: Record<string, unknown>; openers?: { course?: Record<string, string>; unit?: Record<string, string> } };
  const had = raw.activeCourse === LEGACY_JAZZ || !!raw.courses?.includes(LEGACY_JAZZ) || !!raw.pathFactsBy?.[LEGACY_JAZZ] || !!raw.pathKeepBy?.[LEGACY_JAZZ];
  if (!had) return s;
  const wasActive = raw.activeCourse === LEGACY_JAZZ;
  const courses: CourseId[] = [];
  for (const c of raw.courses ?? []) {
    const n = c === LEGACY_JAZZ ? 'ear' : normCourse(c);
    if (n && !courses.includes(n)) courses.push(n);
  }
  if (!courses.includes('ear')) courses.unshift('ear');
  const factsBy = { ...(raw.pathFactsBy ?? {}) };
  const keepBy = { ...(raw.pathKeepBy ?? {}) };
  const jazzFacts = wasActive ? s.pathFacts : factsBy[LEGACY_JAZZ];
  const jazzKeep = wasActive ? s.pathKeep : keepBy[LEGACY_JAZZ];
  delete factsBy[LEGACY_JAZZ];
  delete keepBy[LEGACY_JAZZ];
  const union = (a?: string[], b?: string[]) => Array.from(new Set([...(a ?? []), ...(b ?? [])]));
  const focus = Array.from(new Set<CourseId>([...(s.jazzFocus ?? []), ...courses.filter((c) => JAZZ_FOCUS_COURSES.includes(c))]));
  // The jazz pack stays open there too (jazzOpen), so switching jazz focus off later never hides what they did.
  const open = Array.from(new Set<CourseId>([...(s.jazzOpen ?? []), ...focus]));
  const out: CourseState = { ...s, courses, jazzFocus: focus, jazzOpen: open, pathFactsBy: factsBy as CourseState['pathFactsBy'], pathKeepBy: keepBy as CourseState['pathKeepBy'] };
  if (wasActive) {
    // The jazz path was the live one: Ear becomes the live course, the jazz facts merged with Ear's parked ones (Ear's
    // own units order first, so its path does not jump).
    out.activeCourse = 'ear';
    out.pathFacts = mergeFacts(factsBy.ear, jazzFacts);
    out.pathKeep = union(keepBy.ear, jazzKeep);
    delete factsBy.ear;
    delete keepBy.ear;
  } else if (raw.activeCourse === 'ear' || !raw.activeCourse) {
    out.activeCourse = 'ear';
    out.pathFacts = mergeFacts(s.pathFacts, jazzFacts);
    out.pathKeep = union(s.pathKeep, jazzKeep);
  } else {
    // Another course is active: Ear waits parked, with the jazz facts merged in.
    if (jazzFacts || factsBy.ear) factsBy.ear = mergeFacts(factsBy.ear, jazzFacts);
    if (jazzKeep || keepBy.ear) keepBy.ear = union(keepBy.ear, jazzKeep);
  }
  // Per-course records: Ear inherits the jazz course's start / opener when it has none of its own.
  if (raw.courseStart && LEGACY_JAZZ in raw.courseStart) {
    const cs = { ...raw.courseStart };
    if (cs.ear === undefined) cs.ear = cs[LEGACY_JAZZ];
    delete cs[LEGACY_JAZZ];
    out.courseStart = cs as CourseState['courseStart'];
  }
  if (raw.openers?.course && LEGACY_JAZZ in raw.openers.course) {
    const oc = { ...raw.openers.course };
    if (oc.ear === undefined) oc.ear = oc[LEGACY_JAZZ];
    delete oc[LEGACY_JAZZ];
    out.openers = { ...raw.openers, course: oc };
  }
  return out as T;
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
export function switchCourse(s: CourseState, to: CourseId): Pick<CourseState, 'courses' | 'activeCourse' | 'pathFacts' | 'pathFactsBy' | 'pathKeep' | 'pathKeepBy'> {
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

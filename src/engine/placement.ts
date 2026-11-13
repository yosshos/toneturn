// "Find my level" 3.0 (product owner, 2026-11-07; docs/SPEC-PLACEMENT.md): a RANGE per skill, fast. Each skill
// is found by an accelerating search on its difficulty ladder — climb 1, 2, 4 rungs while right, bisect once
// missed — inside a small budget; the first skill of an area is searched fully, the next ones start where the
// area points, and once two skills of an area agree the rest of it is inferred. The rating is SET at the
// lower-middle of the range, and a fast-K window after it lets practice finish the job. Pure.

import type { LessonDef, Question, SkillId } from './lesson';
import { absNoteQuestion, cadenceQuestion, degreeQuestion, singRunQuestion, singSeqQuestion, degreeSeqQuestion, DEGREE_KEYS, intervalQuestion, modesLesson, noteNameQuestion, progressionQuestion, qualityQuestion, rhythmDictQuestion, rhythmReadQuestion, seventhQuestion, singQuestion, mulberry32, ROOT_NAMES, type Quality, type Roman } from './lesson';
import type { RhythmLevel } from './rhythm';
import { TOPIC_GEN } from './topics';
import { genTopic } from './topicKit';
import { pc } from './pitch';
import { transposeNamesQuestion } from './basics';
import { SEVENTHS, type ProgressionId } from './jazz';
import type { SessionState } from './session';
import { runAt } from './runs';
import { DOMAINS, domainOf, expected, rate, START_RATING, type DomainId, type RatingEvent, type Ratings, type SkillRating } from './rating';

const pick = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
type Make = (seed: number, id: string) => Question;
const at = (q: Question, difficulty: number): Question => ({ ...q, difficulty });
const topic = (t: string, level: number): ((seed: number, id: string) => Question) => (seed, id) => genTopic(t, seed, level, id);

const CAD: Record<'resolved' | 'open', Roman[]>[] = [
  { resolved: ['I', 'IV', 'V7', 'I'], open: ['I', 'vi', 'IV', 'V'] },
  { resolved: ['I', 'vi', 'ii', 'V7', 'I'], open: ['I', 'IV', 'ii', 'V'] },
  { resolved: ['vi', 'IV', 'V7', 'I'], open: ['I', 'iii', 'vi', 'V'] },
];
const NAME_KEYS = [['C'], ['G', 'F'], ['D', 'Bb'], ['Eb', 'A', 'E'], ['B', 'Db', 'Ab']];

function seq(rnd: () => number, pool: number[], n: number): number[] {
  const ds: number[] = [];
  while (ds.length < n) {
    const d = pick(rnd, pool);
    if (d !== ds[ds.length - 1]) ds.push(d);
  }
  return ds;
}

/** Each skill's ladder, easy → hard; difficulties rise on the rating scale. */
export const LADDERS: Partial<Record<SkillId, { difficulty: number; make: Make }[]>> = {
  degrees: [
    { difficulty: 850, make: (s, id) => degreeQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), [1, 5]), [1, 5], 850) },
    { difficulty: 950, make: (s, id) => degreeQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), [1, 3, 5]), [1, 3, 5], 950) },
    { difficulty: 1080, make: (s, id) => degreeQuestion(id, pc(pick(mulberry32(s), ['C', 'G', 'F'])), 1 + Math.floor(mulberry32(s + 1)() * 7), [1, 2, 3, 4, 5, 6, 7], 1080) },
    { difficulty: 1200, make: (s, id) => degreeQuestion(id, pick(mulberry32(s), DEGREE_KEYS), 1 + Math.floor(mulberry32(s + 1)() * 7), [1, 2, 3, 4, 5, 6, 7], 1200) },
    { difficulty: 1330, make: (s, id) => degreeQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), [2, 4, 6, 7]), [1, 2, 3, 4, 5, 6, 7], 1330) },
    { difficulty: 1460, make: (s, id) => at(topic('degrees-ext', 1)(s, id), 1460) },
    { difficulty: 1600, make: (s, id) => at(topic('degrees-ext', 2)(s, id), 1600) },
  ],
  notes: [0, 1, 2, 3, 4].map((lv) => ({
    difficulty: [920, 1060, 1200, 1340, 1480][lv],
    make: (s: number, id: string) => {
      const rnd = mulberry32(s);
      const k = pc(pick(rnd, NAME_KEYS[lv]));
      const d = lv === 0 ? pick(rnd, [1, 3, 5]) : 1 + Math.floor(rnd() * 7);
      return noteNameQuestion(id, k, d, true, [920, 1060, 1200, 1340, 1480][lv]);
    },
  })),
  intervals: [
    { difficulty: 850, make: (s, id) => intervalQuestion(id, 53 + Math.floor(mulberry32(s)() * 10), pick(mulberry32(s + 1), ['P5', 'P8'] as const), 'melodic', 850) },
    { difficulty: 960, make: (s, id) => intervalQuestion(id, 53 + Math.floor(mulberry32(s)() * 10), pick(mulberry32(s + 1), ['M3', 'P5', 'P8'] as const), 'melodic', 960) },
    { difficulty: 1100, make: (s, id) => intervalQuestion(id, 53 + Math.floor(mulberry32(s)() * 10), pick(mulberry32(s + 1), ['M3', 'P5', 'P8'] as const), 'harmonic', 1100) },
    { difficulty: 1250, make: (s, id) => at(topic('intervals-all', 2)(s, id), 1250) },
    { difficulty: 1380, make: (s, id) => at(topic('intervals-all', 3)(s, id), 1380) },
    { difficulty: 1460, make: (s, id) => at(topic('intervals-all', 4)(s, id), 1460) },
    { difficulty: 1600, make: (s, id) => at(TOPIC_GEN['set-classes'].gen(s, 2, id), 1600) },
  ],
  chords: [
    { difficulty: 850, make: (s, id) => qualityQuestion(id, pc(pick(mulberry32(s), ROOT_NAMES)), pick(mulberry32(s + 1), ['maj', 'min'] as Quality[]), ['maj', 'min'], true, 850) },
    { difficulty: 960, make: (s, id) => qualityQuestion(id, pc(pick(mulberry32(s), ROOT_NAMES)), pick(mulberry32(s + 1), ['maj', 'min'] as Quality[]), ['maj', 'min'], false, 960) },
    { difficulty: 1150, make: (s, id) => qualityQuestion(id, pc(pick(mulberry32(s), ROOT_NAMES)), pick(mulberry32(s + 1), ['maj', 'min', 'dim', 'aug'] as Quality[]), ['maj', 'min', 'dim', 'aug'], false, 1150) },
    { difficulty: 1300, make: (s, id) => at(seventhQuestion(id, pc(pick(mulberry32(s), ROOT_NAMES)), pick(mulberry32(s + 1), SEVENTHS), SEVENTHS), 1300) },
    { difficulty: 1420, make: (s, id) => at(topic('extensions', 1)(s, id), 1420) },
    { difficulty: 1540, make: (s, id) => at(topic('extensions', 2)(s, id), 1540) },
    { difficulty: 1660, make: (s, id) => at(topic('voicings', 3)(s, id), 1660) },
    // EAR_THEORY_AUDIT: the jazz-level top — dominants by name.
    { difficulty: 1800, make: (s, id) => at(topic('extensions', 6)(s, id), 1800) },
  ],
  cadences: [
    { difficulty: 900, make: (s, id) => cadenceQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['resolved', 'open'] as const), CAD[0], 900) },
    { difficulty: 1040, make: (s, id) => cadenceQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['resolved', 'open'] as const), CAD[1], 1040) },
    { difficulty: 1160, make: (s, id) => cadenceQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['resolved', 'open'] as const), CAD[2], 1160) },
    { difficulty: 1300, make: (s, id) => at(progressionQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['ii-V-I', 'V-I', 'I-vi-ii-V'] as ProgressionId[]), ['ii-V-I', 'V-I', 'I-vi-ii-V']), 1300) },
    { difficulty: 1440, make: (s, id) => at(topic('progressions', 2)(s, id), 1440) },
    { difficulty: 1590, make: (s, id) => at(topic('progressions', 3)(s, id), 1590) },
    { difficulty: 1700, make: (s, id) => at(topic('jazz-changes', 2)(s, id), 1700) },
  ],
  modes: [1, 2, 3, 4, 5, 6].map((lv) => ({
    difficulty: 980 + (lv - 1) * 130,
    make: (s: number, id: string) => at({ ...modesLesson(lv, s).questions[0], id }, 980 + (lv - 1) * 130),
  })),
  theory: [
    { difficulty: 1000, make: (s, id) => at(topic('time-signatures', 1)(s, id), 1000) },
    { difficulty: 1110, make: (s, id) => at(topic('key-signatures', 1)(s, id), 1110) },
    { difficulty: 1230, make: (s, id) => at(topic('interval-spelling', 1)(s, id), 1230) },
    { difficulty: 1350, make: (s, id) => at(topic('roman-numerals', 1)(s, id), 1350) },
    { difficulty: 1470, make: (s, id) => at(topic('chord-spelling', 2)(s, id), 1470) },
    { difficulty: 1590, make: (s, id) => at(topic('interval-spelling', 3)(s, id), 1590) },
    { difficulty: 1700, make: (s, id) => at(topic('chord-scale', 2)(s, id), 1700) },
  ],
  sequences: [
    [[1, 3, 5], 2],
    [[1, 2, 3, 4, 5], 3],
    [[1, 2, 3, 4, 5, 6, 7], 3],
    [[1, 2, 3, 4, 5, 6, 7], 4],
    [[1, 2, 3, 4, 5, 6, 7], 5],
    [[1, 2, 3, 4, 5, 6, 7], 6],
  ].map(([pool, n], i) => ({
    difficulty: 900 + i * 140,
    make: (s: number, id: string) => degreeSeqQuestion(id, pick(mulberry32(s), DEGREE_KEYS), seq(mulberry32(s + 3), pool as number[], n as number), 900 + i * 140),
  })),
  'rhythm-dictation': [1, 2, 3, 4, 5, 6, 7, 8].map((lv) => ({
    difficulty: 950 + 110 * (lv - 1),
    make: (s: number, id: string) => rhythmDictQuestion(id, lv as RhythmLevel, 1, s % 100000),
  })),
  'rhythm-reading': [1, 2, 3, 4, 5, 6, 7, 8].map((lv) => ({
    difficulty: 900 + 110 * (lv - 1),
    make: (s: number, id: string) => rhythmReadQuestion(id, lv as RhythmLevel, 1, s % 100000, 'notation'),
  })),
  pitch: [
    ['fine-pitch', 1, 1000],
    ['in-tune', 1, 1150],
    ['fine-pitch', 2, 1300],
    ['in-tune', 2, 1420],
    ['fine-pitch', 3, 1540],
    ['in-tune', 4, 1680],
    ['in-tune', 5, 1820],
  ].map(([tp, lv, d]) => ({ difficulty: d as number, make: (s: number, id: string) => at(topic(tp as string, lv as number)(s, id), d as number) })),
  tempo: [
    [1, 1000],
    [2, 1150],
    [3, 1260],
    [4, 1420],
    [5, 1520],
    [6, 1680],
  ].map(([lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic('tempo', lv)(s, id), d) })),
  sight: [
    [1, 1100],
    [2, 1300],
    [4, 1420],
    [3, 1500],
    [5, 1560],
    [6, 1680],
  ].map(([lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic('sight-read', lv)(s, id), d) })),
  transpose: [
    { difficulty: 1050, make: (s, id) => at(topic('transpose', 1)(s, id), 1050) },
    { difficulty: 1150, make: (s, id) => at(transposeNamesQuestion(id, pc(pick(mulberry32(s), ['C', 'G', 'F'])), pc(pick(mulberry32(s + 1), ['D', 'G', 'F', 'C'])), [1, 2, 3], 1150), 1150) },
    { difficulty: 1200, make: (s, id) => at(topic('transpose', 2)(s, id), 1200) },
    { difficulty: 1260, make: (s, id) => at(topic('transpose', 3)(s, id), 1260) },
    { difficulty: 1330, make: (s, id) => at(topic('transpose', 4)(s, id), 1330) },
    { difficulty: 1420, make: (s, id) => at(transposeNamesQuestion(id, pc(pick(mulberry32(s), ['Bb', 'D', 'A'])), pc(pick(mulberry32(s + 1), ['Eb', 'E', 'F'])), [1, 3, 5, 4, 2], 1420), 1420) },
  ],
  'rhythm': [1, 2, 3, 4, 5].map((lv) => ({
    difficulty: [1000, 1200, 1380, 1580, 1720][lv - 1],
    make: (s: number, id: string) => at(topic('rhythm-memory', lv)(s, id), [1000, 1200, 1380, 1580, 1720][lv - 1]),
  })),
  improv: [1, 2, 3, 4].map((lv) => ({
    difficulty: [1050, 1250, 1400, 1560][lv - 1],
    make: (s: number, id: string) => at(topic('call-response', lv)(s, id), [1050, 1250, 1400, 1560][lv - 1]),
  })),
  absolute: [
    [['C', 'E', 'G', 'A'], false, 1150],
    [['C', 'D', 'E', 'F', 'G', 'A', 'B'], false, 1300],
    [['C', 'D', 'E', 'F', 'G', 'A', 'B'], true, 1420],
    [['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], false, 1560],
    [['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], true, 1700],
  ].map(([pool, wide, d]) => ({
    difficulty: d as number,
    make: (s: number, id: string) => {
      const rnd = mulberry32(s);
      return absNoteQuestion(id, pick(rnd, pool as string[]), rnd, pool as string[], d as number, wide as boolean);
    },
  })),
  singing: [1, 5, 3, 6, 2, 7, 4].map((d, i) => ({
    difficulty: 900 + i * 110,
    make: (s: number, id: string) => at(singQuestion(id, pick(mulberry32(s), DEGREE_KEYS), d), 900 + i * 110),
  })),
  // Vocal technique: control across leaps — steps, then thirds, fifths, sixths and sevenths, longer lines.
  technique: [
    [[1, 2, 3], 950],
    [[1, 3, 5, 3], 1080],
    [[1, 5, 3, 1], 1200],
    [[1, 6, 4, 2], 1320],
    [[5, 1, 6, 2, 7], 1450],
    [[1, 7, 3, 6, 2, 5], 1600],
  ].map(([ds, d]) => ({
    difficulty: d as number,
    make: (s: number, id: string) => singSeqQuestion(id, pick(mulberry32(s), DEGREE_KEYS), ds as number[], d as number),
  })),
  // Spec AD: meter, form & texture, expression — measured from their topics.
  meter: ([['meter-feel', 1, 800], ['meter-feel', 2, 950], ['downbeat', 1, 1050], ['downbeat', 2, 1200], ['meter-feel', 3, 1300], ['odd-meter', 1, 1420], ['meter-feel', 4, 1560], ['odd-meter', 3, 1720], ['prog-meter', 2, 1820]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
  form: ([['voice-count', 1, 900], ['form', 1, 1100], ['voice-count', 2, 1200], ['two-voice', 1, 1320], ['voice-count', 3, 1400], ['form', 2, 1480], ['two-voice', 2, 1650]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
  // 0.38 (spec AE): written dictation, your instrument (the keyboard map: the theory picture), sound & production.
  dictation: ([['staff-dictation',1,1000],['rhythm-build',2,1080],['staff-dictation',2,1150],['staff-dictation',3,1260],['rhythm-build',4,1340],['staff-dictation',4,1420],['two-part',1,1500],['staff-dictation',6,1600]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
  instrument: ([['key-notes',1,800],['key-notes',2,900],['key-notes',3,1020],['key-notes',4,1150],['key-notes',5,1300]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
  timbre: ([['eq-ear',1,900],['dyn-ear',1,950],['space-ear',2,1100],['filter-ear',2,1200],['dyn-ear',4,1300],['eq-ear',6,1550]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
  expression: ([['mood', 1, 650], ['dynamics', 1, 720], ['articulation', 1, 800], ['dynamics', 2, 880], ['mood', 2, 940], ['articulation', 2, 1000], ['dynamics', 3, 1060], ['articulation', 3, 1120]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
  // Vocal agility: runs sung back, faster and longer.
  agility: [1, 2, 3, 4, 6, 8].map((lv, i) => ({
    difficulty: 950 + i * 130,
    make: (s: number, id: string) => at(singRunQuestion(id, pick(mulberry32(s), DEGREE_KEYS), runAt(lv, s), 'echo'), 950 + i * 130),
  })),
};

/** (transposition ladder is defined below with the other topic ladders) */
/** Skills that need the microphone (sung). */
export const SUNG_SKILLS: SkillId[] = ['singing', 'technique', 'agility'];
// By domain (pitch, time, memory, reading, creative), the sung skills last. Every skill on the map is measured: rhythmic
// precision is not a section of its own — it is read from how precisely the rhythm-reading taps landed.
export const PLACEMENT_ORDER: SkillId[] = [
  'degrees', 'intervals', 'chords', 'cadences', 'modes', 'pitch', 'absolute',
  'rhythm-dictation', 'rhythm-reading', 'tempo', 'meter',
  'sequences', 'rhythm', 'form',
  'notes', 'theory', 'sight', 'dictation',
  'improv', 'transpose', 'expression',
  'instrument', 'timbre',
  'singing', 'technique', 'agility',
];
/** Skills measured inside another section (not a section of their own). */
export const PLACEMENT_DERIVED: Partial<Record<SkillId, SkillId>> = { timing: 'rhythm-reading' };

/** The sections of a placement: all skills, or one domain's; sung skills only with the microphone. */
/** `areas`: only these areas — a course's own level test (owner: every course has its own Find my level). */
/** A saved level test, kept only when it belongs to the course with these areas ([] = the course has its own test). */
export function placementOfCourse<T extends { lesson: { placementSkills?: SkillId[]; placementDomain?: DomainId | null } }>(saved: T | null, areas: DomainId[]): T | null {
  if (!saved || !areas.length) return null;
  const d = saved.lesson.placementDomain ?? null;
  if (d) return areas.includes(d) ? saved : null;
  const ok = placementSkills({ singing: true, areas });
  return (saved.lesson.placementSkills ?? []).every((k) => ok.includes(k)) ? saved : null;
}

export function placementSkills(opts: { singing?: boolean; domain?: DomainId | null; priorities?: DomainId[] | null; areas?: DomainId[] | null } = {}): SkillId[] {
  const dom = opts.domain ? DOMAINS.find((d) => d.id === opts.domain)!.skills : null;
  const inAreas = (k: SkillId) => !opts.areas?.length || opts.areas.includes(k === 'rhythm-reading' ? 'time' : domainOf(k));
  const list = PLACEMENT_ORDER.filter((k) => (opts.singing || !SUNG_SKILLS.includes(k)) && inAreas(k) && (!dom || dom.includes(k) || (k === 'rhythm-reading' && dom.includes('timing'))));
  const pr = opts.priorities;
  if (!pr?.length) return list;
  // The player's most important areas are measured first (stable within an area).
  const rank = (k: SkillId) => {
    const d = DOMAINS.find((x) => x.skills.includes(k) || (k === 'rhythm-reading' && x.skills.includes('timing')))?.id;
    const i = d ? pr.indexOf(d) : -1;
    return i < 0 ? pr.length : i;
  };
  return list.map((k, i) => ({ k, i })).sort((a, b) => rank(a.k) - rank(b.k) || a.i - b.i).map((x) => x.k);
}

const ID = /^p:([a-z-]+):(\d+):(\d+)$/;
const parse = (q: Question) => {
  const m = ID.exec(q.id);
  return m ? { skill: m[1] as SkillId, level: Number(m[2]), n: Number(m[3]) } : null;
};

// ======================================================================= the accelerating search (SPEC-PLACEMENT §3)

/** Item budgets (SPEC-PLACEMENT §3.3). */
export const PLACEMENT_BUDGET = {
  /** The first skill measured in an area (gallop 1 → 2 → 4 rungs, then bisect). */
  anchor: 4,
  /** A later skill of an area: starts where the area points, one step up or down. */
  follow: 2,
  /** Skills never inferred from their area (absolute pitch; rhythm reading, which also feeds timing). */
  own: 2,
  /** One area, all its skills together. */
  area: 8,
  /** A full test without / with the sung area. */
  test: 34,
  testSung: 40,
} as const;
/** Two measured skills of an area within this many points agree → the rest of the area is inferred (§3.5). */
export const AGREE = 150;
/** An inferred skill is set this far below its area (a bit lower is fine); its range is 2 × DERIVE_HALF wide. */
export const DERIVE_DISCOUNT = 50;
export const DERIVE_HALF = 150;
/** The virtual rungs below the first and above the last (the open ends of a range). */
export const EDGE = 150;
/** Where in its range a skill is set: 0 = low, 1 = high (lower-middle). */
export const SET_AT = 0.4;
/** The first skill's starting point (low-mid); a new area starts this far below the test so far. */
export const FIRST_PRIOR = 950;
export const CROSS_AREA_DISCOUNT = 100;
/** Skills never inferred from their area. */
export const NOT_DERIVED: SkillId[] = ['absolute', 'rhythm-reading'];
/** Fixed starting priors (absolute pitch is unrelated to the other pitch skills). */
const OWN_PRIOR: Partial<Record<SkillId, number>> = { absolute: 1000 };
/** Evidence credited to a set rating (rating.ts `setN`) and the fast-K window after it (rating.ts `fast`), §5. */
export const PLACEMENT_EVIDENCE = { anchor: 6, follow: 4, own: 4, derived: 2, fast: 8 } as const;

export type PlacementRole = 'anchor' | 'follow' | 'own' | 'derived' | 'skipped' | 'unmeasured';
export interface PlacementAnswer {
  skill: SkillId;
  level: number;
  outcome: 'correct' | 'wrong' | 'skipped';
}
export interface SkillPlan {
  skill: SkillId;
  role: PlacementRole;
  /** First rung asked (1-based; 0 = not asked), the skill's item budget, items asked. */
  start: number;
  budget: number;
  asked: number;
  /** Highest rung passed (0 = none) and lowest rung failed (ladder length + 1 = none). */
  lo: number;
  hi: number;
  misses: number;
  done: boolean;
  /** Next rung to ask (null when done). */
  next: number | null;
  /** The range the player is in and the rating set from it (lower-middle). Null = not measured. */
  low: number | null;
  high: number | null;
  rating: number | null;
}
export interface PlacementPlan {
  skills: SkillPlan[];
  /** The next item (null = the test is over). */
  next: { skill: SkillId; level: number } | null;
  /** Items answered so far. */
  items: number;
}

/** A rung's difficulty, with virtual rungs 0 and M+1 at the open ends. */
export function rungDifficulty(skill: SkillId, rung: number): number {
  const L = LADDERS[skill]!;
  if (rung <= 0) return L[0].difficulty - EDGE;
  if (rung > L.length) return L[L.length - 1].difficulty + EDGE;
  return L[rung - 1].difficulty;
}
/** The highest rung at or below a rating (rung 1 when none is). */
export function rungAt(skill: SkillId, rating: number): number {
  let r = 1;
  LADDERS[skill]!.forEach((x, i) => {
    if (x.difficulty <= rating) r = i + 1;
  });
  return r;
}

export interface SearchState {
  lo: number;
  hi: number;
  /** The next gallop step up / down (1 → 2 → 4 …). */
  up: number;
  down: number;
  asked: number;
  misses: number;
  done: boolean;
  next: number;
}

/**
 * One skill's search (§3.2): start at `start`; while nothing has been missed, a right answer climbs 1, then 2,
 * then 4 rungs (galloping); while nothing has been passed, a miss descends the same way; once a pass sits under
 * a miss, bisect. Stop when the bracket is one rung wide, at the top or the bottom, after a skip, or at the budget.
 */
export function searchSkill(M: number, start: number, budget: number, answers: { level: number; outcome: PlacementAnswer['outcome'] }[]): SearchState {
  const s: SearchState = { lo: 0, hi: M + 1, up: 1, down: 1, asked: 0, misses: 0, done: budget <= 0, next: Math.max(1, Math.min(M, start)) };
  for (const a of answers) {
    if (s.done) break;
    s.asked++;
    if (a.outcome === 'correct') s.lo = Math.max(s.lo, a.level);
    else {
      s.misses++;
      s.hi = Math.min(s.hi, a.level);
    }
    if (s.lo >= s.hi) s.lo = s.hi - 1; // a noisy pass above a miss: trust the miss (a bit lower is fine)
    if (a.outcome === 'skipped' || s.lo >= M || s.hi <= 1 || s.hi - s.lo <= 1 || s.asked >= budget) {
      s.done = true;
      break;
    }
    if (s.hi > M) {
      s.next = Math.min(M, s.lo + s.up);
      s.up *= 2;
    } else if (s.lo === 0) {
      s.next = Math.max(1, s.hi - s.down);
      s.down *= 2;
    } else s.next = Math.floor((s.lo + s.hi) / 2);
  }
  return s;
}

/** The range a finished (or cut) search stands for, and the rating set from it (§3.4). */
export function searchRange(skill: SkillId, s: Pick<SearchState, 'lo' | 'hi' | 'up'>): { low: number; high: number; rating: number } {
  const M = LADDERS[skill]!.length;
  // Open ends: below, down to the virtual bottom rung (a bit lower is fine); above, as far as the next gallop
  // step would have gone (an over-estimate costs more than an under-estimate).
  const low = rungDifficulty(skill, s.lo >= 1 ? s.lo : 0);
  const high = rungDifficulty(skill, s.hi <= M ? s.hi : Math.min(M + 1, s.lo + s.up));
  return { low, high, rating: Math.round(low + SET_AT * (high - low)) };
}

const areaOf = (k: SkillId): DomainId => (k === 'rhythm-reading' ? 'time' : domainOf(k));
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

/**
 * The whole test, replayed from the answers (pure, deterministic): which skills are measured, inferred or
 * left, each skill's search, and the next item. `order` = every section in test order; `skipped` = sections
 * the player skipped (their answers still count toward the budgets).
 */
export function planPlacement(
  answers: PlacementAnswer[],
  order: SkillId[],
  opts: { skipped?: SkillId[]; sung?: boolean; priors?: Partial<Record<SkillId, number>> } = {},
): PlacementPlan {
  const skipped = new Set(opts.skipped ?? []);
  const testBudget = opts.sung || order.some((k) => SUNG_SKILLS.includes(k)) ? PLACEMENT_BUDGET.testSung : PLACEMENT_BUDGET.test;
  const by = new Map<SkillId, PlacementAnswer[]>();
  for (const a of answers) by.set(a.skill, [...(by.get(a.skill) ?? []), a]);
  const out: SkillPlan[] = [];
  let usedTest = 0;
  const usedArea = new Map<DomainId, number>();
  const spend = (k: SkillId, n: number) => {
    usedTest += n;
    usedArea.set(areaOf(k), (usedArea.get(areaOf(k)) ?? 0) + n);
  };
  const measured = (d?: DomainId) => out.filter((p) => p.rating !== null && p.role !== 'derived' && (!d || areaOf(p.skill) === d));
  let next: PlacementPlan['next'] = null;
  for (let i = 0; i < order.length; i++) {
    const k = order[i];
    const mine = by.get(k) ?? [];
    const M = LADDERS[k]!.length;
    const blank: SkillPlan = { skill: k, role: 'unmeasured', start: 0, budget: 0, asked: mine.length, lo: 0, hi: M + 1, misses: 0, done: true, next: null, low: null, high: null, rating: null };
    if (skipped.has(k)) {
      spend(k, mine.length);
      out.push({ ...blank, role: 'skipped' });
      continue;
    }
    const d = areaOf(k);
    const inArea = measured(d);
    const own = NOT_DERIVED.includes(k);
    const role: 'anchor' | 'follow' | 'own' = own ? 'own' : inArea.length ? 'follow' : 'anchor';
    // Inferred when the area's last two measured skills agree (§3.5).
    const agreed = inArea.length >= 2 && Math.abs(inArea[inArea.length - 1].rating! - inArea[inArea.length - 2].rating!) <= AGREE;
    // Budget: the skill's own, within what the area (keeping room for its never-inferred skills) and the test have left.
    const reserve = own ? 0 : order.slice(i + 1).filter((x) => !skipped.has(x) && areaOf(x) === d && NOT_DERIVED.includes(x)).length * PLACEMENT_BUDGET.own;
    const left = Math.min(PLACEMENT_BUDGET.area - (usedArea.get(d) ?? 0) - reserve, testBudget - usedTest);
    const budget = Math.max(mine.length, Math.min(PLACEMENT_BUDGET[role], left));
    if (!mine.length && (budget <= 0 || (agreed && !own))) {
      // Not asked: inferred from the area (else from the test so far), or left unmeasured (§3.5).
      const src = own ? [] : inArea.length ? inArea : measured();
      if (!src.length) {
        out.push(blank);
        continue;
      }
      const est = mean(src.map((p) => p.rating!)) - DERIVE_DISCOUNT - (inArea.length ? 0 : CROSS_AREA_DISCOUNT);
      const clamp = (x: number) => Math.round(Math.max(rungDifficulty(k, 0), Math.min(rungDifficulty(k, M + 1), x)));
      // The same shape as a measured range: `est` sits at SET_AT of a 2·DERIVE_HALF-wide range.
      const low = clamp(est - 2 * DERIVE_HALF * SET_AT);
      const high = clamp(est + 2 * DERIVE_HALF * (1 - SET_AT));
      out.push({ ...blank, role: 'derived', low, high, rating: Math.round(low + SET_AT * (high - low)) });
      continue;
    }
    const all = measured();
    const prior = opts.priors?.[k] ?? OWN_PRIOR[k] ?? (inArea.length ? mean(inArea.map((p) => p.rating!)) : all.length ? mean(all.map((p) => p.rating!)) - CROSS_AREA_DISCOUNT : FIRST_PRIOR);
    const start = rungAt(k, prior);
    let eff = budget;
    let s = searchSkill(M, start, eff, mine);
    // A later skill that disagrees with its area (both items the same way, no bracket) earns the anchor's budget.
    const open = s.done && s.asked >= eff && (s.lo === 0 || s.hi > M) && s.lo < M && s.hi > 1;
    const wider = Math.max(mine.length, Math.min(PLACEMENT_BUDGET.anchor, left));
    if (role === 'follow' && open && wider > eff) s = searchSkill(M, start, (eff = wider), mine);
    spend(k, mine.length);
    const r = s.asked ? searchRange(k, s) : { low: null, high: null, rating: null };
    out.push({ skill: k, role, start, budget: eff, asked: s.asked, lo: s.lo, hi: s.hi, misses: s.misses, done: s.done, next: s.done ? null : s.next, ...r });
    if (!s.done) {
      next = { skill: k, level: s.next };
      break;
    }
  }
  return { skills: out, next, items: answers.length };
}

const answersOf = (s: SessionState): PlacementAnswer[] =>
  s.lesson.questions.flatMap((q, i) => {
    const r = s.records[i];
    const p = parse(q);
    if (!p || !r || r.outcome === 'pending') return [];
    return [{ skill: p.skill, level: p.level, outcome: r.outcome === 'correct' ? ('correct' as const) : r.outcome === 'skipped' ? ('skipped' as const) : ('wrong' as const) }];
  });

/** Optional per-skill starting ratings carried on the lesson (a re-test starts at the player's ratings, §4.4). */
export type PlacementLessonDef = LessonDef & { placementPriors?: Partial<Record<SkillId, number>> };
const planOf = (s: SessionState): PlacementPlan => {
  const l = s.lesson as PlacementLessonDef;
  return planPlacement(answersOf(s), lessonSections(l), { skipped: l.placementSkipped, sung: !!l.placementSinging, priors: l.placementPriors });
};
/** The plan of a placement session (for the result screen: roles, ranges). */
export const placementPlanOf = planOf;

export interface SkillProgress {
  skill: SkillId;
  /** Highest level answered right (0 = none). */
  passed: number;
  misses: number;
  done: boolean;
  next: number;
  asked: number;
}

/** Where each skill stands, from the answered questions (`skills` = the sections still measured). */
export function placementState(s: SessionState, skills: SkillId[]): SkillProgress[] {
  const l = s.lesson as PlacementLessonDef;
  const order = l.placementSkills ?? skills;
  const plan = planPlacement(answersOf(s), order, { skipped: order.filter((k) => !skills.includes(k)), sung: !!l.placementSinging, priors: l.placementPriors });
  return skills.map((k) => {
    const p = plan.skills.find((x) => x.skill === k);
    if (!p) return { skill: k, passed: 0, misses: 0, done: false, next: 1, asked: 0 };
    return { skill: k, passed: p.lo, misses: p.misses, done: p.done, next: p.next ?? Math.max(1, p.start), asked: p.asked };
  });
}

/** The midpoint between a passed rung and the next one (the 2.0 estimate; kept for callers and comparisons). */
export function placementEstimate(skill: SkillId, passed: number): number {
  const L = LADDERS[skill]!;
  if (passed <= 0) return L[0].difficulty - 120;
  if (passed >= L.length) return L[L.length - 1].difficulty + 90;
  return Math.round((L[passed - 1].difficulty + L[passed].difficulty) / 2);
}

/** The sections this placement measures (as chosen at the start), minus the sections the player skipped. */
export const lessonSections = (l: LessonDef): SkillId[] => l.placementSkills ?? placementSkills({ singing: !!l.placementSinging });
const skillsFor = (l: LessonDef): SkillId[] => lessonSections(l).filter((k) => !(l.placementSkipped ?? []).includes(k));

const makeItem = (skill: SkillId, level: number, seed: number, n: number): Question => LADDERS[skill]![level - 1].make(n > 1 ? seed + n * 7919 : seed, `p:${skill}:${level}:${n}`);

export function placementLesson(
  seed: number,
  opts: { singing?: boolean; domain?: DomainId | null; priorities?: DomainId[] | null; areas?: DomainId[] | null; only?: SkillId[]; priors?: Partial<Record<SkillId, number>> } = {},
): LessonDef {
  // `only`: just these sections (catching up on skills measured since the player's last placement).
  const all = placementSkills(opts);
  const only = opts.only?.length ? all.filter((k) => opts.only!.includes(k)) : [];
  const skills = only.length ? only : all;
  const priors = opts.priors && Object.keys(opts.priors).length ? opts.priors : undefined;
  const first = planPlacement([], skills, { sung: !!opts.singing, priors }).next!;
  const def: PlacementLessonDef = {
    id: 'placement', version: 3, skill: 'degrees', scoring: { xpPerCorrect: 5, attemptLimit: 1 }, intro: [], questions: [makeItem(first.skill, first.level, seed, 1)],
    placementSinging: !!opts.singing, placementSkills: skills, ...(opts.domain ? { placementDomain: opts.domain } : {}), ...(priors ? { placementPriors: priors } : {}),
  };
  return def;
}

/** After each answer: the answered questions, plus the next one (none = the placement is over). */
export function adaptPlacement(s: SessionState, seed: number): Question[] {
  const answered = s.lesson.questions.slice(0, s.index + 1);
  const plan = planOf({ ...s, lesson: { ...s.lesson, questions: answered } });
  if (!plan.next) return answered;
  return [...answered, makeItem(plan.next.skill, plan.next.level, seed, answered.length + 1)];
}

export interface PlacementResult {
  skill: SkillId;
  /** The rating to SET: the lower-middle of the range. */
  rating: number;
  /** Highest rung passed (0 = none; inferred skills: 0). */
  passed: number;
  /** Items asked in this skill (0 = inferred from its area). */
  asked: number;
  /** The range the player is in (§3.4). */
  low: number;
  high: number;
  /** Inferred from the area, not asked (§3.5). */
  derived: boolean;
  /** Evidence to credit (RatingEvent `setN`) and answers at the fast K after it (RatingEvent `fast`), §5. */
  n: number;
  fast: number;
}

/** The skills' ratings to set at the end (spec: placement sets, it does not nudge) — with their ranges. */
export function placementResults(s: SessionState): PlacementResult[] {
  const plan = planOf(s);
  const out: PlacementResult[] = plan.skills
    .filter((p) => p.rating !== null && p.role !== 'skipped' && p.role !== 'unmeasured')
    .map((p) => ({
      skill: p.skill, rating: p.rating!, passed: p.lo, asked: p.asked, low: p.low!, high: p.high!, derived: p.role === 'derived',
      n: PLACEMENT_EVIDENCE[p.role as 'anchor' | 'follow' | 'own' | 'derived'], fast: PLACEMENT_EVIDENCE.fast,
    }));
  // Rhythmic precision, from the rhythm-reading taps (patterns played right): a steadier hand at a higher
  // reading level rates higher.
  const taps = s.lesson.questions
    .map((q, i) => ({ q, a: s.records[i]?.attempts[0] }))
    .filter(({ q, a }) => q.kind === 'rhythm-read' && /^p:rhythm-reading:/.test(q.id) && a?.correct && a.precision !== undefined);
  if (taps.length && skillsFor(s.lesson).includes('rhythm-reading')) {
    const p = taps.reduce((acc, x) => acc + (x.a!.precision ?? 0), 0) / taps.length;
    const top = Math.max(...taps.map((x) => x.q.difficulty));
    const r = Math.round(Math.max(800, Math.min(1800, 700 + 700 * p + 0.25 * (top - 900))));
    out.push({ skill: 'timing', rating: r, passed: taps.length, asked: taps.length, low: r - DERIVE_HALF, high: r + DERIVE_HALF, derived: false, n: PLACEMENT_EVIDENCE.own, fast: PLACEMENT_EVIDENCE.fast });
  }
  return out;
}

// ======================================================================= re-calibration (SPEC-PLACEMENT §6)

/** Thresholds for re-planning after a short placement (§6). */
export const RECAL = {
  /** A skill of the current (frozen) unit moved this far since the unit was frozen → rebuild its unplayed steps. */
  unitDrift: 100,
  /** A skill moved this far from its placement → the projected units are redrawn (P5 uses 75 for frontiers). */
  placementDrift: 100,
  /** Answers since the placement before drift counts. */
  minAnswers: 6,
  /** The last `window` answers of a skill … */
  window: 8,
  /** … beat the expected score by this much, with ≥ `promoteRight` right → "you seem above this — test out?" */
  promoteGap: 0.15,
  promoteRight: 7,
  /** … fall short by this much, with ≤ `demoteRight` right → "this seems hard — easier steps?" */
  demoteGap: -0.2,
  demoteRight: 4,
  /** An area whose placement is older than this, or with ≥ 2 skills drifted ≥ `retestDrift`, is offered its area test. */
  retestDays: 30,
  retestDrift: 150,
  /** A prompt declined is not shown again for this skill for this many days. */
  snoozeDays: 7,
} as const;

/** Skills of `skills` whose rating moved at least `min` between two snapshots (e.g. unit frozen → now). */
export function ratingDrift(before: Ratings, now: Ratings, skills: SkillId[], min: number = RECAL.unitDrift): { skill: SkillId; from: number; to: number; drift: number }[] {
  return skills
    .filter((k) => now[k] && before[k])
    .map((k) => ({ skill: k, from: before[k]!.r, to: now[k]!.r, drift: now[k]!.r - before[k]!.r }))
    .filter((x) => Math.abs(x.drift) >= min);
}

const touches = (e: RatingEvent, k: SkillId) => e.skill === k || (e.tags ?? []).some((t) => t.skill === k && t.w >= 0.5);

/**
 * A skill since its last placement: the placed value, answers since, and how the last `window` answers compare
 * with what the rating expected at the time (replayed for this skill alone — an approximation for multi-skill items).
 */
export function skillForm(events: RatingEvent[], skill: SkillId, window: number = RECAL.window): { placed: number | null; placedAt: string | null; since: number; n: number; right: number; gap: number } {
  const mine = [...events].filter((e) => touches(e, skill)).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  let cur: SkillRating | undefined;
  let placed: number | null = null;
  let placedAt: string | null = null;
  let since = 0;
  const seen = new Set<string>();
  const last: { s: number; e: number }[] = [];
  for (const e of mine) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    if (e.set !== undefined) {
      placed = e.set;
      placedAt = e.at;
      since = 0;
    } else {
      since++;
      const s = e.score !== undefined ? Math.max(0, Math.min(1, e.score)) : e.correct ? 1 : 0;
      last.push({ s, e: expected(cur?.r ?? START_RATING, e.difficulty) });
      if (last.length > window) last.shift();
    }
    cur = rate(cur, e);
  }
  const n = last.length;
  return { placed, placedAt, since, n, right: last.filter((x) => x.s >= 0.5).length, gap: n ? last.reduce((a, x) => a + x.s - x.e, 0) / n : 0 };
}

export interface Recalibration {
  /** Skills that moved ≥ RECAL.placementDrift from their placement (after ≥ RECAL.minAnswers answers). */
  drifted: { skill: SkillId; placed: number; now: number; drift: number }[];
  /** Redraw the projected units now (not only at the unit boundary). */
  redrawProjected: boolean;
  /** "You seem above this — test out?" (offer the unit's Jump-ahead test, P16). */
  promote: SkillId[];
  /** "This seems hard — easier steps?" (rebuild the current unit's unplayed steps from the new frontier). */
  demote: SkillId[];
  /** Areas to offer a short re-test (the 8-item area placement). */
  retest: DomainId[];
}

/** What to re-plan after a session (§6.2). Pure; `now` for the age of placements; `snoozed` = skills declined recently. */
export function recalibration(events: RatingEvent[], ratings: Ratings, now: Date, skills: SkillId[] = PLACEMENT_ORDER, snoozed: SkillId[] = []): Recalibration {
  const drifted: Recalibration['drifted'] = [];
  const promote: SkillId[] = [];
  const demote: SkillId[] = [];
  const old = new Map<DomainId, number>();
  const moved = new Map<DomainId, number>();
  for (const k of skills) {
    const f = skillForm(events, k);
    const r = ratings[k]?.r;
    if (f.placed !== null && r !== undefined && f.since >= RECAL.minAnswers && Math.abs(r - f.placed) >= RECAL.placementDrift) drifted.push({ skill: k, placed: f.placed, now: r, drift: r - f.placed });
    if (f.placed !== null && r !== undefined && Math.abs(r - f.placed) >= RECAL.retestDrift) moved.set(areaOf(k), (moved.get(areaOf(k)) ?? 0) + 1);
    if (f.placedAt) {
      const days = (now.getTime() - new Date(f.placedAt).getTime()) / 864e5;
      old.set(areaOf(k), Math.max(old.get(areaOf(k)) ?? 0, days));
    }
    if (snoozed.includes(k) || f.n < RECAL.window) continue;
    if (f.gap >= RECAL.promoteGap && f.right >= RECAL.promoteRight) promote.push(k);
    else if (f.gap <= RECAL.demoteGap && f.right <= RECAL.demoteRight) demote.push(k);
  }
  const retest = DOMAINS.map((d) => d.id).filter((d) => (moved.get(d) ?? 0) >= 2 || (old.has(d) && old.get(d)! >= RECAL.retestDays && [...drifted, ...promote.map((skill) => ({ skill }))].some((x) => areaOf(x.skill) === d)));
  return { drifted, redrawProjected: drifted.length > 0, promote, demote, retest };
}

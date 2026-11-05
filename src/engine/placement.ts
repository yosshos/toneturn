// "Find my level" 2.0 (product owner): EVERY skill is measured on its own difficulty ladder, climbing until
// the player fails, then the next skill — until all are covered. The skill's rating is then SET from where
// the player failed (not nudged by a few easy answers). Pure.
//
// Climb: start at level 1. While there has been no miss, a right answer jumps two levels. After the first
// miss, step back to the level that was skipped (or retry the same level once); then one level at a time.
// A second miss ends the skill. Passing the top level ends it too.

import type { LessonDef, Question, SkillId } from './lesson';
import { cadenceQuestion, degreeQuestion, degreeSeqQuestion, DEGREE_KEYS, intervalQuestion, modesLesson, noteNameQuestion, progressionQuestion, qualityQuestion, rhythmDictQuestion, rhythmReadQuestion, seventhQuestion, singQuestion, mulberry32, ROOT_NAMES, type Quality, type Roman } from './lesson';
import type { RhythmLevel } from './rhythm';
import { TOPIC_GEN } from './topics';
import { pc } from './pitch';
import { SEVENTHS, type ProgressionId } from './jazz';
import type { SessionState } from './session';

const pick = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
type Make = (seed: number, id: string) => Question;
const at = (q: Question, difficulty: number): Question => ({ ...q, difficulty });
const topic = (t: string, level: number): ((seed: number, id: string) => Question) => (seed, id) => TOPIC_GEN[t].gen(seed, level, id);

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
  ],
  cadences: [
    { difficulty: 900, make: (s, id) => cadenceQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['resolved', 'open'] as const), CAD[0], 900) },
    { difficulty: 1040, make: (s, id) => cadenceQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['resolved', 'open'] as const), CAD[1], 1040) },
    { difficulty: 1160, make: (s, id) => cadenceQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['resolved', 'open'] as const), CAD[2], 1160) },
    { difficulty: 1300, make: (s, id) => at(progressionQuestion(id, pick(mulberry32(s), DEGREE_KEYS), pick(mulberry32(s + 1), ['ii-V-I', 'V-I', 'I-vi-ii-V'] as ProgressionId[]), ['ii-V-I', 'V-I', 'I-vi-ii-V']), 1300) },
    { difficulty: 1440, make: (s, id) => at(topic('progressions', 2)(s, id), 1440) },
    { difficulty: 1590, make: (s, id) => at(topic('progressions', 3)(s, id), 1590) },
  ],
  modes: [1, 2, 3, 4, 5, 6].map((lv) => ({
    difficulty: 980 + (lv - 1) * 130,
    make: (s: number, id: string) => at({ ...modesLesson(lv, s).questions[0], id }, 980 + (lv - 1) * 130),
  })),
  theory: [
    { difficulty: 1000, make: (s, id) => at(topic('note-reading', 1)(s, id), 1000) },
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
    [3, 1500],
  ].map(([lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic('sight-read', lv)(s, id), d) })),
  singing: [1, 5, 3, 6, 2, 7, 4].map((d, i) => ({
    difficulty: 900 + i * 110,
    make: (s: number, id: string) => at(singQuestion(id, pick(mulberry32(s), DEGREE_KEYS), d), 900 + i * 110),
  })),
};

/** The order skills are measured in (singing only when the microphone is used). */
export const PLACEMENT_ORDER: SkillId[] = ['degrees', 'intervals', 'chords', 'cadences', 'modes', 'pitch', 'notes', 'sequences', 'rhythm-dictation', 'rhythm-reading', 'tempo', 'theory', 'sight', 'singing'];
/** Skills the placement does not measure (measured in their own areas). */
export const PLACEMENT_ELSEWHERE: SkillId[] = ['technique', 'agility', 'rhythm', 'absolute', 'improv'];

const ID = /^p:([a-z-]+):(\d+):(\d+)$/;
const parse = (q: Question) => {
  const m = ID.exec(q.id);
  return m ? { skill: m[1] as SkillId, level: Number(m[2]), n: Number(m[3]) } : null;
};

export interface SkillProgress {
  skill: SkillId;
  /** Highest level answered right (0 = none). */
  passed: number;
  misses: number;
  done: boolean;
  next: number;
  asked: number;
}

/** Where each skill stands, from the answered questions. */
export function placementState(s: SessionState, skills: SkillId[]): SkillProgress[] {
  const st = new Map<SkillId, SkillProgress & { climbing: boolean }>(skills.map((k) => [k, { skill: k, passed: 0, misses: 0, done: false, next: 1, asked: 0, climbing: true }]));
  s.lesson.questions.forEach((q, i) => {
    const r = s.records[i];
    const p = parse(q);
    if (!p || !r || r.outcome === 'pending') return;
    const x = st.get(p.skill);
    if (!x || x.done) return;
    const max = LADDERS[p.skill]!.length;
    x.asked++;
    const right = r.outcome === 'correct';
    if (right) {
      x.passed = Math.max(x.passed, p.level);
      if (p.level >= max) x.done = true;
      else x.next = x.climbing ? Math.min(max, p.level + 2) : p.level + 1;
    } else {
      x.misses++;
      x.climbing = false;
      if (x.misses >= 2 || r.outcome === 'skipped') x.done = true;
      else x.next = p.level - 1 > x.passed ? p.level - 1 : p.level;
    }
  });
  return skills.map((k) => {
    const { climbing: _c, ...rest } = st.get(k)!;
    void _c;
    return rest;
  });
}

/** The rating a skill is set to: between the last level passed and the one failed. */
export function placementEstimate(skill: SkillId, passed: number): number {
  const L = LADDERS[skill]!;
  if (passed <= 0) return L[0].difficulty - 120;
  if (passed >= L.length) return L[L.length - 1].difficulty + 90;
  return Math.round((L[passed - 1].difficulty + L[passed].difficulty) / 2);
}

const skillsFor = (singing: boolean) => PLACEMENT_ORDER.filter((k) => singing || k !== 'singing');

function nextQuestion(s: SessionState, seed: number, skills: SkillId[]): Question | null {
  const st = placementState(s, skills);
  const cur = st.find((x) => !x.done);
  if (!cur) return null;
  const n = s.lesson.questions.length + 1;
  return LADDERS[cur.skill]![cur.next - 1].make(seed + n * 7919, `p:${cur.skill}:${cur.next}:${n}`);
}

export function placementLesson(seed: number, opts: { singing?: boolean } = {}): LessonDef {
  const skills = skillsFor(!!opts.singing);
  const first = LADDERS[skills[0]]![0].make(seed, `p:${skills[0]}:1:1`);
  return { id: 'placement', version: 3, skill: 'degrees', scoring: { xpPerCorrect: 5, attemptLimit: 1 }, intro: [], questions: [first], placementSinging: !!opts.singing };
}

/** After each answer: the answered questions, plus the next one (none = the placement is over). */
export function adaptPlacement(s: SessionState, seed: number): Question[] {
  const skills = skillsFor(!!s.lesson.placementSinging);
  const answered = s.lesson.questions.slice(0, s.index + 1);
  const next = nextQuestion({ ...s, lesson: { ...s.lesson, questions: answered } }, seed, skills);
  return next ? [...answered, next] : answered;
}

/** The skills' ratings to set at the end (spec: placement sets, it does not nudge). */
export function placementResults(s: SessionState, singing: boolean): { skill: SkillId; rating: number; passed: number; asked: number }[] {
  return placementState(s, skillsFor(singing))
    .filter((x) => x.asked > 0)
    .map((x) => ({ skill: x.skill, rating: placementEstimate(x.skill, x.passed), passed: x.passed, asked: x.asked }));
}

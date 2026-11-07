// "Find my level" 2.0 (product owner): EVERY skill is measured on its own difficulty ladder, climbing until
// the player fails, then the next skill — until all are covered. The skill's rating is then SET from where
// the player failed (not nudged by a few easy answers). Pure.
//
// Climb: start at level 1. While there has been no miss, a right answer jumps two levels. After the first
// miss, step back to the level that was skipped (or retry the same level once); then one level at a time.
// A second miss ends the skill. Passing the top level ends it too.

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
import { DOMAINS, type DomainId } from './rating';

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
  meter: ([['meter-feel', 1, 800], ['meter-feel', 2, 950], ['downbeat', 1, 1050], ['downbeat', 2, 1200], ['meter-feel', 3, 1300], ['odd-meter', 1, 1420], ['meter-feel', 4, 1560], ['odd-meter', 3, 1720]] as [string, number, number][]).map(([tp, lv, d]) => ({ difficulty: d, make: (s: number, id: string) => at(topic(tp, lv)(s, id), d) })),
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
export function placementSkills(opts: { singing?: boolean; domain?: DomainId | null; priorities?: DomainId[] | null } = {}): SkillId[] {
  const dom = opts.domain ? DOMAINS.find((d) => d.id === opts.domain)!.skills : null;
  const list = PLACEMENT_ORDER.filter((k) => (opts.singing || !SUNG_SKILLS.includes(k)) && (!dom || dom.includes(k) || (k === 'rhythm-reading' && dom.includes('timing'))));
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

/** The sections this placement measures (as chosen at the start), minus the sections the player skipped. */
export const lessonSections = (l: LessonDef): SkillId[] => l.placementSkills ?? placementSkills({ singing: !!l.placementSinging });
const skillsFor = (l: LessonDef): SkillId[] => lessonSections(l).filter((k) => !(l.placementSkipped ?? []).includes(k));

function nextQuestion(s: SessionState, seed: number, skills: SkillId[]): Question | null {
  const st = placementState(s, skills);
  const cur = st.find((x) => !x.done);
  if (!cur) return null;
  const n = s.lesson.questions.length + 1;
  return LADDERS[cur.skill]![cur.next - 1].make(seed + n * 7919, `p:${cur.skill}:${cur.next}:${n}`);
}

export function placementLesson(seed: number, opts: { singing?: boolean; domain?: DomainId | null; priorities?: DomainId[] | null; only?: SkillId[] } = {}): LessonDef {
  // `only`: just these sections (catching up on skills measured since the player's last placement).
  const all = placementSkills(opts);
  const only = opts.only?.length ? all.filter((k) => opts.only!.includes(k)) : [];
  const skills = only.length ? only : all;
  const first = LADDERS[skills[0]]![0].make(seed, `p:${skills[0]}:1:1`);
  return {
    id: 'placement', version: 3, skill: 'degrees', scoring: { xpPerCorrect: 5, attemptLimit: 1 }, intro: [], questions: [first],
    placementSinging: !!opts.singing, placementSkills: skills, ...(opts.domain ? { placementDomain: opts.domain } : {}),
  };
}

/** After each answer: the answered questions, plus the next one (none = the placement is over). */
export function adaptPlacement(s: SessionState, seed: number): Question[] {
  const skills = skillsFor(s.lesson);
  const answered = s.lesson.questions.slice(0, s.index + 1);
  const next = nextQuestion({ ...s, lesson: { ...s.lesson, questions: answered } }, seed, skills);
  return next ? [...answered, next] : answered;
}

/** The skills' ratings to set at the end (spec: placement sets, it does not nudge). */
export function placementResults(s: SessionState): { skill: SkillId; rating: number; passed: number; asked: number }[] {
  const out = placementState(s, skillsFor(s.lesson))
    .filter((x) => x.asked > 0)
    .map((x) => ({ skill: x.skill, rating: placementEstimate(x.skill, x.passed), passed: x.passed, asked: x.asked }));
  // Rhythmic precision, from the rhythm-reading taps (patterns played right): a steadier hand at a higher
  // reading level rates higher.
  const taps = s.lesson.questions
    .map((q, i) => ({ q, a: s.records[i]?.attempts[0] }))
    .filter(({ q, a }) => q.kind === 'rhythm-read' && /^p:rhythm-reading:/.test(q.id) && a?.correct && a.precision !== undefined);
  if (taps.length && skillsFor(s.lesson).includes('rhythm-reading')) {
    const p = taps.reduce((acc, x) => acc + (x.a!.precision ?? 0), 0) / taps.length;
    const top = Math.max(...taps.map((x) => x.q.difficulty));
    out.push({ skill: 'timing', rating: Math.round(Math.max(800, Math.min(1800, 700 + 700 * p + 0.25 * (top - 900)))), passed: taps.length, asked: taps.length });
  }
  return out;
}

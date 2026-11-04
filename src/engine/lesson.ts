// Versioned lesson content. Prompts, stimulus, scoring policy and explanations are kept separate.
// Pure: no browser APIs. Text for narration / UI lives in src/game/content.ts.

import { majorScale, pc, pcValue, voiceChord, type ChordQuality, type PitchClass } from './pitch';

export const CONTENT_SCHEMA_VERSION = 2;

export type Answer = number | string;
export type SkillId = 'degrees' | 'chords' | 'cadences' | 'singing' | 'sequences' | 'rhythm' | 'intervals';
export type IntervalName = 'M3' | 'P5' | 'P8';
export type BassRole = 'root' | 'third' | 'fifth';
export type Quality = 'maj' | 'min' | 'dim' | 'aug';
export type Roman = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'V7' | 'vi';

export type Stimulus =
  | { kind: 'cadence'; key: PitchClass }
  | { kind: 'note'; midi: number; duration: number }
  | { kind: 'notes'; midis: number[]; each: number } // melodic sequence
  | { kind: 'resolve'; fromMidi: number; toMidi: number }
  | { kind: 'chord'; midis: number[]; duration: number; arpeggio?: boolean }
  | { kind: 'phrase'; key: PitchClass; chords: Roman[] }
  | { kind: 'rest'; duration: number };

interface QBase {
  id: string;
  stimulus: Stimulus[];
  answer: Answer;
  /** Answers offered as buttons and accepted by the voice grammar. Empty for singing. */
  choices: Answer[];
  /** Elo-style item difficulty (used by later placement work). */
  difficulty: number;
}

export interface DegreeQuestion extends QBase {
  kind: 'degree';
  direction: 'heard-pitch→degree';
  key: PitchClass; // major key, stated in the prompt and established by ear
  target: PitchClass;
  targetMidi: number;
  answer: number;
}

export interface QualityQuestion extends QBase {
  kind: 'quality';
  rootMidi: number;
  root: PitchClass;
  answer: Quality;
}

export interface CadenceQuestion extends QBase {
  kind: 'cadence';
  key: PitchClass;
  answer: 'resolved' | 'open';
}

export interface SingQuestion extends QBase {
  kind: 'sing';
  key: PitchClass;
  degree: number;
  target: PitchClass;
  /** Reference pitch of the target; scoring is octave-insensitive for this exercise. */
  targetMidi: number;
  answer: 'accurate';
}

/** Hear the key, then a short melody; name its degrees in order ("one three five"). */
export interface DegreeSeqQuestion extends QBase {
  kind: 'degree-seq';
  key: PitchClass;
  degrees: number[];
  midis: number[];
  /** Canonical answer: degrees joined with '-', e.g. "1-3-5". */
  answer: string;
}

/** Two notes, one after the other (melodic) or together (harmonic); name the distance. */
export interface IntervalQuestion extends QBase {
  kind: 'interval';
  lowMidi: number;
  mode: 'melodic' | 'harmonic';
  answer: IntervalName;
}

/** A major triad with the root, third or fifth in the bass (C, C/E, C/G). */
export interface InversionQuestion extends QBase {
  kind: 'inversion';
  root: PitchClass;
  answer: BassRole;
}

export type Question = DegreeQuestion | QualityQuestion | CadenceQuestion | SingQuestion | DegreeSeqQuestion | IntervalQuestion | InversionQuestion;

export const INTERVAL_SEMITONES: Record<IntervalName, number> = { M3: 4, P5: 7, P8: 12 };

/** Which skill a question measures (for ratings). */
export function questionSkill(q: Question): SkillId {
  switch (q.kind) {
    case 'degree':
      return 'degrees';
    case 'quality':
      return 'chords';
    case 'cadence':
      return 'cadences';
    case 'sing':
      return 'singing';
    case 'degree-seq':
      return 'sequences';
    case 'interval':
      return 'intervals';
    case 'inversion':
      return 'chords';
  }
}

export interface ScoringPolicy {
  xpPerCorrect: number; // awarded only for a first-attempt correct answer
  attemptLimit: number; // musical attempts before the answer is revealed
}

export type IntroCard =
  | { kind: 'key-degree'; key: PitchClass; note: PitchClass; degree: number }
  | { kind: 'degrees'; key: PitchClass; degrees: number[] }
  | { kind: 'quality'; root: PitchClass; quality: 'maj' | 'min' }
  | { kind: 'cadence'; key: PitchClass; ending: 'resolved' | 'open' }
  | { kind: 'sing'; key: PitchClass; degree: number }
  | { kind: 'interval'; name: IntervalName }
  | { kind: 'inversion'; root: PitchClass; bass: BassRole };

export interface IntroStep {
  id: string;
  card: IntroCard;
  stimulus: Stimulus[];
}

export interface LessonDef {
  id: LessonId;
  version: number;
  skill: SkillId;
  scoring: ScoringPolicy;
  intro: IntroStep[];
  questions: Question[];
}

export type LessonId =
  | 'bflat-two-homes'
  | 'degrees-135'
  | 'major-minor'
  | 'cadences'
  | 'sing-home-five'
  | 'intervals'
  | 'inversions'
  | 'placement'
  | 'review'
  | 'weekly-puzzle';

/** Small deterministic PRNG for seeded generation in tests and replays. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
export function shuffle<T>(rnd: () => number, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** n items drawn from `pool` such that every pool value appears at least once (n ≥ pool.length). */
function covering<T>(rnd: () => number, pool: readonly T[], n: number): T[] {
  const out = [...pool];
  while (out.length < n) out.push(pick(rnd, pool));
  return shuffle(rnd, out);
}

/** Place a pitch class in [lo, hi] (first fit from lo). */
export function placeInRange(pcv: number, lo: number, hi: number): number {
  let m = lo + ((((pcv - lo) % 12) + 12) % 12);
  if (m > hi) m -= 12;
  return m;
}

function nearestTonicMidi(key: PitchClass, atOrBelow: number): number {
  let m = atOrBelow;
  while (((m % 12) + 12) % 12 !== pcValue(key)) m--;
  return m;
}

const B_FLAT = pc('Bb');
const E_FLAT = pc('Eb');
/** The same B♭ (B♭4, MIDI 70) in every example: same pitch, same timbre. */
export const SAME_BFLAT_MIDI = 70;

// ---------------------------------------------------------------- Lesson 1
function bflatQuestion(id: string, key: PitchClass): DegreeQuestion {
  const answer = pcValue(key) === pcValue(B_FLAT) ? 1 : 5;
  return {
    id,
    kind: 'degree',
    direction: 'heard-pitch→degree',
    key,
    target: B_FLAT,
    targetMidi: SAME_BFLAT_MIDI,
    choices: [1, 5],
    answer,
    stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: SAME_BFLAT_MIDI, duration: 1.6 }],
    difficulty: 900,
  };
}

/** Lesson 1 — "Same B♭, two homes". Three scored questions; both keys always appear. */
export function bflatTwoHomes(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffle(rnd, [B_FLAT, E_FLAT, rnd() < 0.5 ? B_FLAT : E_FLAT]);
  return {
    id: 'bflat-two-homes',
    version: 1,
    skill: 'degrees',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [
      {
        id: 'intro-bb',
        card: { kind: 'key-degree', key: B_FLAT, note: B_FLAT, degree: 1 },
        stimulus: [{ kind: 'cadence', key: B_FLAT }, { kind: 'note', midi: SAME_BFLAT_MIDI, duration: 1.8 }],
      },
      {
        id: 'intro-eb',
        card: { kind: 'key-degree', key: E_FLAT, note: B_FLAT, degree: 5 },
        stimulus: [
          { kind: 'cadence', key: E_FLAT },
          { kind: 'note', midi: SAME_BFLAT_MIDI, duration: 1.6 },
          { kind: 'resolve', fromMidi: SAME_BFLAT_MIDI, toMidi: nearestTonicMidi(E_FLAT, SAME_BFLAT_MIDI) },
        ],
      },
    ],
    questions: keys.map((k, i) => bflatQuestion(`q${i + 1}`, k)),
  };
}

// ---------------------------------------------------------------- Lesson 2
export const DEGREE_KEYS = ['C', 'F', 'G', 'D', 'Bb', 'Eb', 'A'].map(pc);

export function degreeQuestion(id: string, key: PitchClass, degree: number, choices: number[], difficulty = 1000): DegreeQuestion {
  const target = majorScale(key)[degree - 1];
  const targetMidi = placeInRange(pcValue(target), 62, 73);
  return {
    id,
    kind: 'degree',
    direction: 'heard-pitch→degree',
    key,
    target,
    targetMidi,
    choices,
    answer: degree,
    stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: targetMidi, duration: 1.5 }],
    difficulty,
  };
}

/** Lesson 2 — "Home, third, fifth": degrees 1 / 3 / 5 in changing keys. */
export function degrees135(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const degrees = covering(rnd, [1, 3, 5] as const, 5);
  const C = pc('C');
  const cMid = (d: number) => placeInRange(pcValue(majorScale(C)[d - 1]), 60, 71);
  return {
    id: 'degrees-135',
    version: 1,
    skill: 'degrees',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [
      {
        id: 'intro-135',
        card: { kind: 'degrees', key: C, degrees: [1, 3, 5] },
        stimulus: [{ kind: 'cadence', key: C }, { kind: 'notes', midis: [cMid(1), cMid(3), cMid(5)], each: 0.9 }],
      },
    ],
    questions: degrees.map((d, i) => degreeQuestion(`q${i + 1}`, pick(rnd, DEGREE_KEYS), d, [1, 3, 5])),
  };
}

// ---------------------------------------------------------------- Lesson 3
export const ROOT_NAMES = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'];

const QUALITY_STEPS: Record<Quality, [number, number]> = { maj: [4, 7], min: [3, 7], dim: [3, 6], aug: [4, 8] };

export function qualityQuestion(id: string, root: PitchClass, quality: Quality, choices: Quality[] = ['maj', 'min'], arpeggio = true, difficulty = 1000): QualityQuestion {
  const rootMidi = placeInRange(pcValue(root), 55, 66);
  const [third, fifth] = QUALITY_STEPS[quality];
  const chord = [rootMidi, rootMidi + third, rootMidi + fifth];
  const block: Stimulus = { kind: 'chord', midis: [rootMidi - 12, ...chord], duration: 1.6 };
  return {
    id,
    kind: 'quality',
    root,
    rootMidi,
    choices,
    answer: quality,
    stimulus: arpeggio ? [{ kind: 'chord', midis: chord, duration: 1.6, arpeggio: true }, { kind: 'rest', duration: 0.2 }, block] : [block],
    difficulty,
  };
}

/** Lesson 3 — "Major or minor?": triad quality, same register, changing roots. */
export function majorMinor(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const qs = covering(rnd, ['maj', 'min'] as const, 5);
  const C = pc('C');
  const c = placeInRange(0, 55, 66);
  return {
    id: 'major-minor',
    version: 1,
    skill: 'chords',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [
      { id: 'intro-maj', card: { kind: 'quality', root: C, quality: 'maj' }, stimulus: [{ kind: 'chord', midis: [c, c + 4, c + 7], duration: 1.4, arpeggio: true }, { kind: 'chord', midis: [c - 12, c, c + 4, c + 7], duration: 1.6 }] },
      { id: 'intro-min', card: { kind: 'quality', root: C, quality: 'min' }, stimulus: [{ kind: 'chord', midis: [c, c + 3, c + 7], duration: 1.4, arpeggio: true }, { kind: 'chord', midis: [c - 12, c, c + 3, c + 7], duration: 1.6 }] },
    ],
    questions: qs.map((q, i) => qualityQuestion(`q${i + 1}`, pc(pick(rnd, ROOT_NAMES)), q)),
  };
}

// ---------------------------------------------------------------- Lesson 4
export const PHRASES: Record<'resolved' | 'open', Roman[]> = {
  resolved: ['I', 'IV', 'V7', 'I'],
  open: ['I', 'vi', 'IV', 'V'],
};

export function cadenceQuestion(id: string, key: PitchClass, ending: 'resolved' | 'open', phrases = PHRASES, difficulty = 1050): CadenceQuestion {
  return {
    id,
    kind: 'cadence',
    key,
    choices: ['resolved', 'open'],
    answer: ending,
    stimulus: [{ kind: 'phrase', key, chords: phrases[ending] }],
    difficulty,
  };
}

/** Degree-sequence item: notes of `degrees` in `key`, kept within an octave above the tonic. */
export function degreeSeqQuestion(id: string, key: PitchClass, degrees: number[], difficulty = 1150): DegreeSeqQuestion {
  const tonic = placeInRange(pcValue(key), 57, 68);
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const midis = degrees.map((d) => tonic + steps[d - 1]);
  return {
    id,
    kind: 'degree-seq',
    key,
    degrees,
    midis,
    choices: [1, 2, 3, 4, 5, 6, 7],
    answer: degrees.join('-'),
    stimulus: [{ kind: 'cadence', key }, { kind: 'notes', midis, each: 0.7 }],
    difficulty,
  };
}

/** Lesson 4 — "Cadence detective": does the phrase come home (V–I) or stop open on V? */
export function cadences(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const endings = covering(rnd, ['resolved', 'open'] as const, 4);
  const C = pc('C');
  return {
    id: 'cadences',
    version: 1,
    skill: 'cadences',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [
      { id: 'intro-res', card: { kind: 'cadence', key: C, ending: 'resolved' }, stimulus: [{ kind: 'phrase', key: C, chords: PHRASES.resolved }] },
      { id: 'intro-open', card: { kind: 'cadence', key: C, ending: 'open' }, stimulus: [{ kind: 'phrase', key: C, chords: PHRASES.open }] },
    ],
    questions: endings.map((e, i) => cadenceQuestion(`q${i + 1}`, pick(rnd, DEGREE_KEYS), e)),
  };
}

// ---------------------------------------------------------------- Lesson 5
const SING_KEYS = ['C', 'D', 'Eb', 'F', 'G'].map(pc);

export function singQuestion(id: string, key: PitchClass, degree: number): SingQuestion {
  const tonicMidi = placeInRange(pcValue(key), 55, 66);
  const target = majorScale(key)[degree - 1];
  const targetMidi = tonicMidi + [0, 2, 4, 5, 7, 9, 11][degree - 1];
  return {
    id,
    kind: 'sing',
    key,
    degree,
    target,
    targetMidi,
    choices: [],
    answer: 'accurate',
    stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: tonicMidi, duration: 1.4 }],
    difficulty: 1100,
  };
}

/** Lesson 5 — "Sing home & five": hear the key and its home note, then sing. */
export function singHomeFive(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffle(rnd, SING_KEYS).slice(0, 3);
  const C = pc('C');
  const c = placeInRange(0, 55, 66);
  return {
    id: 'sing-home-five',
    version: 1,
    skill: 'singing',
    scoring: { xpPerCorrect: 15, attemptLimit: 3 },
    intro: [
      { id: 'intro-sing', card: { kind: 'sing', key: C, degree: 5 }, stimulus: [{ kind: 'cadence', key: C }, { kind: 'notes', midis: [c, c + 7], each: 1.1 }] },
    ],
    questions: [singQuestion('q1', keys[0], 1), singQuestion('q2', keys[1], 5), singQuestion('q3', keys[2], 5)],
  };
}

// ---------------------------------------------------------------- Lesson 6
export function intervalQuestion(id: string, lowMidi: number, name: IntervalName, mode: 'melodic' | 'harmonic', difficulty = mode === 'melodic' ? 1000 : 1100): IntervalQuestion {
  const hi = lowMidi + INTERVAL_SEMITONES[name];
  const stimulus: Stimulus[] =
    mode === 'melodic'
      ? [{ kind: 'notes', midis: [lowMidi, hi], each: 0.9 }]
      : [{ kind: 'chord', midis: [lowMidi, hi], duration: 1.8 }];
  return { id, kind: 'interval', lowMidi, mode, choices: ['M3', 'P5', 'P8'], answer: name, stimulus, difficulty };
}

/** Lesson 6 — "Thirds, fifths, octaves": first one after the other, then together. */
export function intervalsLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const names = covering(rnd, ['M3', 'P5', 'P8'] as const, 6);
  const c = 60;
  return {
    id: 'intervals',
    version: 1,
    skill: 'intervals',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: (['M3', 'P5', 'P8'] as const).map((n) => ({
      id: `intro-${n}`,
      card: { kind: 'interval', name: n },
      stimulus: [
        { kind: 'notes', midis: [c, c + INTERVAL_SEMITONES[n]], each: 0.8 },
        { kind: 'chord', midis: [c, c + INTERVAL_SEMITONES[n]], duration: 1.4 },
      ],
    })),
    questions: names.map((n, i) => intervalQuestion(`q${i + 1}`, 53 + Math.floor(rnd() * 10), n, i < 3 ? 'melodic' : 'harmonic')),
  };
}

// ---------------------------------------------------------------- Lesson 7
const BASS_STEP: Record<BassRole, number> = { root: 0, third: 4, fifth: 7 };

export function inversionQuestion(id: string, root: PitchClass, bass: BassRole, difficulty = 1150): InversionQuestion {
  const r = placeInRange(pcValue(root), 60, 71);
  const triad = [r, r + 4, r + 7];
  const bassMidi = placeInRange((pcValue(root) + BASS_STEP[bass]) % 12, 40, 51);
  return {
    id,
    kind: 'inversion',
    root,
    choices: ['root', 'third', 'fifth'],
    answer: bass,
    stimulus: [
      // the bass alone first, so it is clearly audible, then the full chord
      { kind: 'note', midi: bassMidi, duration: 0.8 },
      { kind: 'chord', midis: [bassMidi, ...triad], duration: 1.8 },
    ],
    difficulty,
  };
}

/** Lesson 7 — "Which note is in the bass?": C, C/E and C/G. */
export function inversionsLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const roles = covering(rnd, ['root', 'third', 'fifth'] as const, 5);
  const C = pc('C');
  return {
    id: 'inversions',
    version: 1,
    skill: 'chords',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: (['root', 'third', 'fifth'] as const).map((b) => ({ id: `intro-${b}`, card: { kind: 'inversion', root: C, bass: b }, stimulus: inversionQuestion('x', C, b).stimulus })),
    questions: roles.map((b, i) => inversionQuestion(`q${i + 1}`, pc(pick(rnd, ['C', 'D', 'F', 'G', 'A', 'Bb'])), b)),
  };
}

// ---------------------------------------------------------------- Registry
export const LESSON_ORDER: LessonId[] = ['bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five', 'intervals', 'inversions'];

export function makeLesson(id: LessonId, seed = Date.now()): LessonDef {
  switch (id) {
    case 'placement':
    case 'review':
    case 'weekly-puzzle':
      throw new Error(`${id} is built by src/engine/adaptive.ts`);
    case 'bflat-two-homes':
      return bflatTwoHomes(seed);
    case 'degrees-135':
      return degrees135(seed);
    case 'major-minor':
      return majorMinor(seed);
    case 'cadences':
      return cadences(seed);
    case 'sing-home-five':
      return singHomeFive(seed);
    case 'intervals':
      return intervalsLesson(seed);
    case 'inversions':
      return inversionsLesson(seed);
  }
}

/** Teaching gesture after a revealed answer. */
export function explainStimulus(q: Question): Stimulus[] {
  switch (q.kind) {
    case 'degree': {
      const s: Stimulus[] = [{ kind: 'note', midi: q.targetMidi, duration: 1.0 }];
      if (q.answer !== 1) s.push({ kind: 'resolve', fromMidi: q.targetMidi, toMidi: nearestTonicMidi(q.key, q.targetMidi) });
      return s;
    }
    case 'quality':
      return q.stimulus;
    case 'cadence':
      return q.stimulus.slice(-1);
    case 'sing':
      return [{ kind: 'note', midi: q.targetMidi, duration: 1.6 }];
    case 'degree-seq':
      return [{ kind: 'notes', midis: q.midis, each: 0.7 }];
    case 'interval':
    case 'inversion':
      return q.stimulus;
  }
}

/**
 * "Hear your answer next to the correct one": the player's choice, a breath, then the right answer.
 * Null when the given answer can't be played back meaningfully.
 */
export function compareStimulus(q: Question, given: Answer): Stimulus[] | null {
  switch (q.kind) {
    case 'degree': {
      if (typeof given !== 'number' || given < 1 || given > 7) return null;
      const steps = [0, 2, 4, 5, 7, 9, 11];
      const tonic = q.targetMidi - steps[q.answer - 1];
      return [
        { kind: 'note', midi: tonic + steps[given - 1], duration: 1.0 },
        { kind: 'rest', duration: 0.35 },
        { kind: 'note', midi: q.targetMidi, duration: 1.2 },
      ];
    }
    case 'quality': {
      if (typeof given !== 'string' || !(given in QUALITY_STEPS)) return null;
      const chord = (k: Quality) => [q.rootMidi - 12, q.rootMidi, q.rootMidi + QUALITY_STEPS[k][0], q.rootMidi + QUALITY_STEPS[k][1]];
      return [
        { kind: 'chord', midis: chord(given as Quality), duration: 1.2 },
        { kind: 'rest', duration: 0.35 },
        { kind: 'chord', midis: chord(q.answer), duration: 1.4 },
      ];
    }
    case 'cadence': {
      if (given !== 'resolved' && given !== 'open') return null;
      return [{ kind: 'phrase', key: q.key, chords: PHRASES[given] }, { kind: 'rest', duration: 0.4 }, { kind: 'phrase', key: q.key, chords: PHRASES[q.answer] }];
    }
    case 'degree-seq': {
      if (typeof given !== 'string') return null;
      const ds = given.split('-').map(Number).filter((d) => d >= 1 && d <= 7);
      if (!ds.length) return null;
      const steps = [0, 2, 4, 5, 7, 9, 11];
      const tonic = q.midis[0] - steps[q.degrees[0] - 1];
      return [{ kind: 'notes', midis: ds.map((d) => tonic + steps[d - 1]), each: 0.6 }, { kind: 'rest', duration: 0.4 }, { kind: 'notes', midis: q.midis, each: 0.6 }];
    }
    case 'interval': {
      if (typeof given !== 'string' || !(given in INTERVAL_SEMITONES)) return null;
      const two = (n: IntervalName): Stimulus => ({ kind: 'chord', midis: [q.lowMidi, q.lowMidi + INTERVAL_SEMITONES[n]], duration: 1.2 });
      return [two(given as IntervalName), { kind: 'rest', duration: 0.35 }, two(q.answer)];
    }
    case 'inversion': {
      if (given !== 'root' && given !== 'third' && given !== 'fifth') return null;
      return [...inversionQuestion('x', q.root, given).stimulus, { kind: 'rest', duration: 0.35 }, ...q.stimulus];
    }
    case 'sing':
      return null;
  }
}

export interface NoteEvent {
  midi: number;
  start: number; // seconds, relative to sequence start
  duration: number;
  velocity: number; // 0..1
}

const ROMAN: Record<Roman, { deg: number; q: ChordQuality }> = {
  I: { deg: 0, q: 'maj' },
  ii: { deg: 2, q: 'min' },
  iii: { deg: 4, q: 'min' },
  IV: { deg: 5, q: 'maj' },
  V: { deg: 7, q: 'maj' },
  V7: { deg: 7, q: 'dom7' },
  vi: { deg: 9, q: 'min' },
};

/** Render stimulus to a flat timed note list (pure; the audio engine plays it). */
export function renderStimulus(stimulus: Stimulus[]): { events: NoteEvent[]; length: number } {
  const events: NoteEvent[] = [];
  let t = 0;
  const block = (chord: number[], dur: number) => chord.forEach((m, j) => events.push({ midi: m, start: t, duration: dur, velocity: j === 0 ? 0.55 : 0.45 }));
  for (const s of stimulus) {
    switch (s.kind) {
      case 'cadence':
      case 'phrase': {
        const t0 = pcValue(s.key);
        const romans: Roman[] = s.kind === 'cadence' ? ['I', 'IV', 'V7', 'I'] : s.chords;
        let prev: number[] | undefined;
        romans.forEach((r, i) => {
          const chord = voiceChord(t0 + ROMAN[r].deg, ROMAN[r].q, prev);
          prev = chord.slice(1);
          const dur = i === romans.length - 1 ? 1.3 : 0.75;
          block(chord, dur);
          t += dur;
        });
        t += s.kind === 'cadence' ? 0.45 : 0.3;
        break;
      }
      case 'note':
        events.push({ midi: s.midi, start: t, duration: s.duration, velocity: 0.72 });
        t += s.duration + 0.15;
        break;
      case 'notes':
        s.midis.forEach((m) => {
          events.push({ midi: m, start: t, duration: s.each * 0.95, velocity: 0.68 });
          t += s.each;
        });
        t += 0.15;
        break;
      case 'resolve':
        events.push({ midi: s.fromMidi, start: t, duration: 0.6, velocity: 0.6 });
        events.push({ midi: s.toMidi, start: t + 0.6, duration: 1.3, velocity: 0.62 });
        t += 2.05;
        break;
      case 'chord':
        if (s.arpeggio) {
          s.midis.forEach((m, i) => events.push({ midi: m, start: t + i * 0.28, duration: s.duration - i * 0.28, velocity: 0.55 }));
        } else block(s.midis, s.duration);
        t += s.duration + 0.1;
        break;
      case 'rest':
        t += s.duration;
        break;
    }
  }
  return { events, length: t };
}

/** Stable description of what a question tests (review-queue key). */
export function questionTag(q: Question): string {
  const k = (p: PitchClass) => `${p.letter}${p.acc}`;
  switch (q.kind) {
    case 'degree':
      return `degree:${k(q.key)}:${q.answer}`;
    case 'quality':
      return `quality:${q.answer}`;
    case 'cadence':
      return `cadence:${q.answer}`;
    case 'sing':
      return `sing:${q.degree}`;
    case 'degree-seq':
      return `seq:${k(q.key)}:${q.answer}`;
    case 'interval':
      return `interval:${q.answer}:${q.mode}`;
    case 'inversion':
      return `inversion:${q.answer}`;
  }
}

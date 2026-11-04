// Versioned lesson content. Prompts, stimulus, scoring policy and explanations are kept separate.
// Pure: no browser APIs. Text for narration / UI lives in src/game/content.ts.

import { majorScale, pc, pcValue, voiceChord, type ChordQuality, type PitchClass } from './pitch';

export const CONTENT_SCHEMA_VERSION = 2;

export type Answer = number | string;
export type SkillId = 'degrees' | 'chords' | 'cadences' | 'singing';
export type Roman = 'I' | 'ii' | 'IV' | 'V' | 'V7' | 'vi';

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
  answer: 'maj' | 'min';
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

export type Question = DegreeQuestion | QualityQuestion | CadenceQuestion | SingQuestion;

export interface ScoringPolicy {
  xpPerCorrect: number; // awarded only for a first-attempt correct answer
  attemptLimit: number; // musical attempts before the answer is revealed
}

export type IntroCard =
  | { kind: 'key-degree'; key: PitchClass; note: PitchClass; degree: number }
  | { kind: 'degrees'; key: PitchClass; degrees: number[] }
  | { kind: 'quality'; root: PitchClass; quality: 'maj' | 'min' }
  | { kind: 'cadence'; key: PitchClass; ending: 'resolved' | 'open' }
  | { kind: 'sing'; key: PitchClass; degree: number };

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

export type LessonId = 'bflat-two-homes' | 'degrees-135' | 'major-minor' | 'cadences' | 'sing-home-five';

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
const pick = <T,>(rnd: () => number, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
function shuffle<T>(rnd: () => number, xs: T[]): T[] {
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
const DEGREE_KEYS = ['C', 'F', 'G', 'D', 'Bb', 'Eb', 'A'].map(pc);

export function degreeQuestion(id: string, key: PitchClass, degree: number, choices: number[]): DegreeQuestion {
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
    difficulty: 1000,
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
const ROOT_NAMES = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'];

function qualityQuestion(id: string, root: PitchClass, quality: 'maj' | 'min'): QualityQuestion {
  const rootMidi = placeInRange(pcValue(root), 55, 66);
  const chord = [rootMidi, rootMidi + (quality === 'maj' ? 4 : 3), rootMidi + 7];
  return {
    id,
    kind: 'quality',
    root,
    rootMidi,
    choices: ['maj', 'min'],
    answer: quality,
    stimulus: [
      { kind: 'chord', midis: chord, duration: 1.6, arpeggio: true },
      { kind: 'rest', duration: 0.2 },
      { kind: 'chord', midis: [rootMidi - 12, ...chord], duration: 1.6 },
    ],
    difficulty: 1000,
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
const PHRASES: Record<'resolved' | 'open', Roman[]> = {
  resolved: ['I', 'IV', 'V7', 'I'],
  open: ['I', 'vi', 'IV', 'V'],
};

function cadenceQuestion(id: string, key: PitchClass, ending: 'resolved' | 'open'): CadenceQuestion {
  return {
    id,
    kind: 'cadence',
    key,
    choices: ['resolved', 'open'],
    answer: ending,
    stimulus: [{ kind: 'phrase', key, chords: PHRASES[ending] }],
    difficulty: 1050,
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

// ---------------------------------------------------------------- Registry
export const LESSON_ORDER: LessonId[] = ['bflat-two-homes', 'degrees-135', 'major-minor', 'cadences', 'sing-home-five'];

export function makeLesson(id: LessonId, seed = Date.now()): LessonDef {
  switch (id) {
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
  }
}

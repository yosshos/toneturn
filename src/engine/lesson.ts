// Versioned lesson content. Prompts, stimulus, scoring policy and explanations are kept separate.

import { majorCadence, pc, pcValue, type PitchClass } from './pitch';

export const CONTENT_SCHEMA_VERSION = 1;

export type Stimulus =
  | { kind: 'cadence'; key: PitchClass }
  | { kind: 'note'; midi: number; duration: number }
  | { kind: 'resolve'; fromMidi: number; toMidi: number };

export interface DegreeQuestion {
  id: string;
  direction: 'heard-pitch→degree';
  key: PitchClass; // major key, stated in the prompt and established by ear
  target: PitchClass;
  targetMidi: number;
  choices: number[]; // degrees offered as buttons / accepted by voice grammar
  answer: number;
  stimulus: Stimulus[];
  /** Elo-style item difficulty (used by later placement work). */
  difficulty: number;
}

export interface ScoringPolicy {
  xpPerCorrect: number; // awarded only for a first-attempt correct answer
  attemptLimit: number; // musical attempts before the answer is revealed
}

export interface IntroStep {
  id: string;
  key: PitchClass;
  degree: number;
  stimulus: Stimulus[];
}

export interface LessonDef {
  id: string;
  version: number;
  skill: 'degrees';
  scoring: ScoringPolicy;
  intro: IntroStep[];
  questions: DegreeQuestion[];
}

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

const B_FLAT = pc('Bb');
const E_FLAT = pc('Eb');
/** The same B♭ (B♭4, MIDI 70) in every example: same pitch, same timbre. */
export const SAME_BFLAT_MIDI = 70;

function nearestTonicMidi(key: PitchClass, below: number): number {
  // Tonic at or just below the target, for the resolution gesture.
  let m = below;
  while (((m % 12) + 12) % 12 !== pcValue(key)) m--;
  return m;
}

function degreeQuestion(id: string, key: PitchClass): DegreeQuestion {
  const answer = pcValue(key) === pcValue(B_FLAT) ? 1 : 5;
  return {
    id,
    direction: 'heard-pitch→degree',
    key,
    target: B_FLAT,
    targetMidi: SAME_BFLAT_MIDI,
    choices: [1, 5],
    answer,
    stimulus: [
      { kind: 'cadence', key },
      { kind: 'note', midi: SAME_BFLAT_MIDI, duration: 1.6 },
    ],
    difficulty: 900,
  };
}

/**
 * Lesson 1 — "Same B♭, two homes".
 * Three scored questions; both keys always appear, order is seeded.
 */
export function bflatTwoHomes(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = [B_FLAT, E_FLAT, rnd() < 0.5 ? B_FLAT : E_FLAT];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return {
    id: 'bflat-two-homes',
    version: 1,
    skill: 'degrees',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [
      {
        id: 'intro-bb',
        key: B_FLAT,
        degree: 1,
        stimulus: [{ kind: 'cadence', key: B_FLAT }, { kind: 'note', midi: SAME_BFLAT_MIDI, duration: 1.8 }],
      },
      {
        id: 'intro-eb',
        key: E_FLAT,
        degree: 5,
        stimulus: [
          { kind: 'cadence', key: E_FLAT },
          { kind: 'note', midi: SAME_BFLAT_MIDI, duration: 1.6 },
          { kind: 'resolve', fromMidi: SAME_BFLAT_MIDI, toMidi: nearestTonicMidi(E_FLAT, SAME_BFLAT_MIDI) },
        ],
      },
    ],
    questions: keys.map((k, i) => degreeQuestion(`q${i + 1}`, k)),
  };
}

/** Teaching gesture after a revealed/wrong answer: target then its resolution to the tonic. */
export function explainStimulus(q: DegreeQuestion): Stimulus[] {
  const s: Stimulus[] = [{ kind: 'note', midi: q.targetMidi, duration: 1.0 }];
  if (q.answer !== 1) s.push({ kind: 'resolve', fromMidi: q.targetMidi, toMidi: nearestTonicMidi(q.key, q.targetMidi) });
  return s;
}

export interface NoteEvent {
  midi: number;
  start: number; // seconds, relative to sequence start
  duration: number;
  velocity: number; // 0..1
}

/** Render stimulus to a flat timed note list (pure; the audio engine plays it). */
export function renderStimulus(stimulus: Stimulus[]): { events: NoteEvent[]; length: number } {
  const events: NoteEvent[] = [];
  let t = 0;
  for (const s of stimulus) {
    if (s.kind === 'cadence') {
      const chords = majorCadence(s.key);
      chords.forEach((chord, i) => {
        const dur = i === chords.length - 1 ? 1.3 : 0.75;
        chord.forEach((m, j) => events.push({ midi: m, start: t, duration: dur, velocity: j === 0 ? 0.55 : 0.45 }));
        t += dur;
      });
      t += 0.45; // breath before the target
    } else if (s.kind === 'note') {
      events.push({ midi: s.midi, start: t, duration: s.duration, velocity: 0.72 });
      t += s.duration + 0.15;
    } else {
      events.push({ midi: s.fromMidi, start: t, duration: 0.6, velocity: 0.6 });
      events.push({ midi: s.toMidi, start: t + 0.6, duration: 1.3, velocity: 0.62 });
      t += 2.05;
    }
  }
  return { events, length: t };
}

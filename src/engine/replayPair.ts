// COURSE-FEEDBACK-UI §4.6 (slice 7): after a miss, "Yours ▶" and "Right ▶" replay the real thing — the answer the
// player picked and the target — through the question's own sound, plus "the why as a sound":
//   degree   → the note walks stepwise to the tonic (Functional Ear Trainer);
//   quality  → the chord, then its arpeggio (also seventh chords);
//   interval → melodic, then harmonic.
// "Yours" is null whenever the given answer can't be played as what the player did (a position pick, true/false, a
// grid, a sung take): never replay something other than the player's own answer. Pure.
import { compareStimulus, explainStimulus, INTERVAL_SEMITONES, type Answer, type IntervalName, type Quality, type Question, type Stimulus } from './lesson';
import { jazzVoicing, SEVENTHS, type SeventhQuality } from './jazz';
import { pcValue } from './pitch';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const QUALITY_STEPS: Record<Quality, [number, number]> = { maj: [4, 7], min: [3, 7], dim: [3, 6], aug: [4, 8] };

export interface ReplayPair {
  /** The player's answer as sound; null when it can't be played honestly. */
  yours: Stimulus[] | null;
  /** The target, with its why-sound where the kind has one. */
  right: Stimulus[];
}

/** Degree d of the major scale on `tonic`, walked stepwise to the nearest tonic (2–5 down to 1, 6–7 up to 8). */
export function stepwiseToTonic(tonic: number, d: number): number[] {
  if (d < 1 || d > 7) return [];
  if (d === 1) return [tonic];
  if (d <= 5) return MAJOR.slice(0, d).reverse().map((s) => tonic + s);
  return [...MAJOR.slice(d - 1).map((s) => tonic + s), tonic + 12];
}

function resolveStim(path: number[]): Stimulus[] {
  if (path.length <= 1) return [{ kind: 'note', midi: path[0], duration: 1.1 }];
  const out: Stimulus[] = [{ kind: 'note', midi: path[0], duration: 0.9 }];
  const mid = path.slice(1, -1);
  if (mid.length) out.push({ kind: 'notes', midis: mid, each: 0.42 });
  out.push({ kind: 'note', midi: path[path.length - 1], duration: 1.1 });
  return out;
}

const chordThenArp = (midis: number[]): Stimulus[] => [
  { kind: 'chord', midis, duration: 1.2 },
  { kind: 'rest', duration: 0.25 },
  { kind: 'chord', midis, duration: 1.6, arpeggio: true },
];

const melodicThenHarmonic = (lo: number, hi: number): Stimulus[] => [
  { kind: 'notes', midis: [lo, hi], each: 0.6 },
  { kind: 'rest', duration: 0.25 },
  { kind: 'chord', midis: [lo, hi], duration: 1.2 },
];

/** Kinds whose compareStimulus is exactly [yours (no top-level rest), rest, right…]: split at the first rest. */
const SPLIT_KINDS = new Set<Question['kind']>(['abs-note', 'slash', 'mode-id', 'cadence', 'degree-seq', 'inversion', 'note-name', 'rhythm-dict', 'progression', 'name-seq', 'run-id', 'place']);

/** The Yours / Right pair for a missed question; null when the given answer is right or missing. */
export function replayPair(q: Question, given: Answer | undefined): ReplayPair | null {
  if (given === undefined || given === null || String(given) === String(q.answer)) return null;
  switch (q.kind) {
    case 'degree': {
      if (typeof given !== 'number' || given < 1 || given > 7) return { yours: null, right: explainStimulus(q) };
      const tonic = q.targetMidi - MAJOR[q.answer - 1];
      return { yours: resolveStim(stepwiseToTonic(tonic, given)), right: resolveStim(stepwiseToTonic(tonic, q.answer)) };
    }
    case 'quality': {
      const chord = (k: Quality) => [q.rootMidi, q.rootMidi + QUALITY_STEPS[k][0], q.rootMidi + QUALITY_STEPS[k][1]];
      const ok = typeof given === 'string' && given in QUALITY_STEPS;
      return { yours: ok ? chordThenArp(chord(given as Quality)) : null, right: chordThenArp(chord(q.answer)) };
    }
    case 'seventh': {
      const root = pcValue(q.root);
      const ok = typeof given === 'string' && SEVENTHS.includes(given as SeventhQuality);
      return { yours: ok ? chordThenArp(jazzVoicing(root, given as SeventhQuality)) : null, right: chordThenArp(jazzVoicing(root, q.answer)) };
    }
    case 'interval': {
      const ok = typeof given === 'string' && given in INTERVAL_SEMITONES;
      return {
        yours: ok ? melodicThenHarmonic(q.lowMidi, q.lowMidi + INTERVAL_SEMITONES[given as IntervalName]) : null,
        right: melodicThenHarmonic(q.lowMidi, q.lowMidi + INTERVAL_SEMITONES[q.answer]),
      };
    }
    case 'choice': {
      const a = typeof given === 'string' ? q.choiceStim?.[given] : undefined;
      const b = q.choiceStim?.[q.answer] ?? explainStimulus(q);
      return { yours: a ?? null, right: b };
    }
    default: {
      const right = explainStimulus(q);
      if (!SPLIT_KINDS.has(q.kind)) return right.length ? { yours: null, right } : null;
      const cmp = compareStimulus(q, given);
      const cut = cmp ? cmp.findIndex((s) => s.kind === 'rest') : -1;
      if (!cmp || cut <= 0) return right.length ? { yours: null, right } : null;
      return { yours: cmp.slice(0, cut), right: cmp.slice(cut + 1) };
    }
  }
}

// Versioned lesson content. Prompts, stimulus, scoring policy and explanations are kept separate.
// Pure: no browser APIs. Text for narration / UI lives in src/game/content.ts.

import { events as rhythmEvents, TPQ as RTPQ } from './rhythm';
import { MODE_FAMILY, MODE_STEPS, modeDistance, type ModeId } from './modes';
import { jazzVoicing, PROGRESSIONS, SEVENTHS, voiceProgression, type JazzChord, type ProgressionId, type SeventhQuality } from './jazz';
import { opening, SONGS, type SongOpening } from './songs';
import { atTempo, buildRun, MAX_RUN_LEVEL, runAt, runDifficulty, type RunMaterial, type RunShape, type RunSpec } from './runs';
import { majorScale, pc, pcValue, voiceChord, type ChordQuality, type PitchClass } from './pitch';
import { basicsBeat, basicsPitch, basicsShape, basicsVoice, chordTonesLesson, rhythmShiftLesson, transposeLesson } from './basics';
import { options as rhythmOptions, rhythmAt, rhythmFromKey, rhythmKey, rhythmSound, type Rhythm, type RhythmLevel } from './rhythm';

export const CONTENT_SCHEMA_VERSION = 2;

export type Answer = number | string;
/** 'rhythm' = rhythmic memory, 'timing' = rhythmic precision (mirrors 'sequences' / 'singing' for pitch). */
export type SkillId =
  /** Meter by ear: in 2/3/4, simple or compound, odd meters, downbeat (spec AD). */
  | 'meter'
  /** Form & texture: phrase form, voices (spec AD). */
  | 'form'
  /** Expression: dynamics, articulation, mood (spec AD). */
  | 'expression'
  | 'degrees'
  | 'notes'
  | 'chords'
  | 'cadences'
  | 'singing'
  | 'sequences'
  | 'rhythm'
  | 'timing'
  | 'intervals'
  | 'rhythm-reading'
  | 'rhythm-dictation'
  | 'agility'
  | 'technique'
  | 'modes'
  | 'absolute'
  | 'theory'
  /** Tempo & pulse: estimate tempo by ear, hear it drift, keep it alone (product owner). */
  | 'tempo'
  /** Fine pitch perception: cents, in tune or not. */
  | 'pitch'
  /** Sight-singing / sight-reading. */
  | 'sight'
  /** Improvisation (from the improvisation report). */
  | 'improv'
  /** Transposition: the same tune in another key or moved by an interval — named, recognised or sung. */
  | 'transpose';
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
  | { kind: 'rest'; duration: number }
  /** A melody with its rhythm (song openings). */
  | { kind: 'melody'; midis: number[]; beats: number[]; bpm: number }
  /** Jazz seventh chords in a key (shell voicings, smooth voice leading). */
  | { kind: 'jazz'; key: PitchClass; chords: JazzChord[]; each: number }
  | { kind: 'rhythm'; rhythm: string; bars: number; bpm: number }
  /** Free timed notes (polyrhythms, Middle-Eastern rhythms, quarter tones: midi may be fractional). */
  | { kind: 'events'; events: NoteEvent[]; length: number }
  /** "Option n comes next": a bell struck n times. Never a piano note, so it can't be mistaken for the music. */
  | { kind: 'marker'; n: number };

/** The option marker before version n (1-based). */
export const marker = (n: number): Stimulus => ({ kind: 'marker', n });

interface QBase {
  id: string;
  stimulus: Stimulus[];
  answer: Answer;
  /** Answers offered as buttons and accepted by the voice grammar. Empty for singing. */
  choices: Answer[];
  /** Elo-style item difficulty (used by later placement work). */
  difficulty: number;
  /** A visual aid is shown while answering (spec M.3): difficulty already lowered, XP × 0.8. */
  aid?: 'keymap' | 'target' | 'lookup';
  /** Rated as this skill instead of the one its kind implies (e.g. naming notes in a new key = transposition). */
  skillAs?: SkillId;
}

export interface DegreeQuestion extends QBase {
  kind: 'degree';
  /** heard-pitch→degree (matrix #1) or name→degree (matrix #5, symbolic: no playback). */
  direction: 'heard-pitch→degree' | 'name→degree';
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
  /** degree→sing (#3), name→sing (#4, after a reference), echo a heard note (#7), a tone of the heard chord, or the note that finishes the heard phrase (spec AD). */
  promptBy?: 'degree' | 'name' | 'echo' | 'chord' | 'finish';
  /** promptBy 'chord': which chord tone (1 = root, 3, 5), and the chord's quality. */
  chordTone?: { tone: 1 | 3 | 5; minor: boolean };
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
  /** #5 sequence: the prompt is note names (symbolic, no sound) instead of a heard melody. */
  given?: 'names';
  /** Opening of a known melody (revealed after the answer). */
  song?: string;
  names?: string[];
  /** Bass-line dictation: the degrees are the bass notes under a chord progression. */
  bassLine?: boolean;
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

/** Answer is a note name (canonical "B-1"): heard after a reference (#2) or converted from a degree (#6). */
export interface NoteNameQuestion extends QBase {
  kind: 'note-name';
  direction: 'heard-pitch→name' | 'degree→name';
  key: PitchClass;
  degree: number;
  target: PitchClass;
  targetMidi: number;
  answer: string;
}

/** Given degrees ("five two"), sing the notes in order (#3, sequence). */
export interface SingSeqQuestion extends QBase {
  kind: 'sing-seq';
  key: PitchClass;
  degrees: number[];
  midis: number[];
  /** #4 sequence: asked by note names instead of degrees. */
  promptBy?: 'name';
  /** Opening of a known melody (revealed after the answer). */
  song?: string;
  names?: string[];
  /** Transposition: the melody was played in this key; sing it in `key`. */
  fromKey?: PitchClass;
  answer: 'accurate';
}

/** Perform a rhythm shown as notation or described in words (spec G, rhythm reading). */
export interface RhythmReadQuestion extends QBase {
  kind: 'rhythm-read';
  level: RhythmLevel;
  rhythm: Rhythm;
  bpm: number;
  show: 'notation' | 'words';
  /** Drawn instead of `rhythm` (spec AD: show the pattern, perform it displaced). */
  shown?: Rhythm;
  /** The clicks stop after this many bars of the passage: keep the beat inside (spec AD). */
  silentAfterBars?: number;
  /** An instruction replacing the default "Read and tap". */
  prompt?: { en: string; he: string };
  answer: 'accurate';
}

/** Hear a rhythm, choose its notation or say it (spec G, rhythm dictation). Answer = rhythm key. */
export interface RhythmDictQuestion extends QBase {
  kind: 'rhythm-dict';
  level: RhythmLevel;
  rhythm: Rhythm;
  bpm: number;
  /** Choose among notated options (default) or build the bar from rhythm blocks (spec G.6). */
  mode?: 'choose' | 'build';
  answer: string;
}

/** Sing a run / riff back after hearing it, or from a description (spec K). */
export interface SingRunQuestion extends QBase {
  kind: 'sing-run';
  key: PitchClass;
  run: RunSpec;
  midis: number[];
  prompt: 'echo' | 'told';
  answer: 'accurate';
}

/** Hear a run and name its scale material or its shape (spec K.1, recognition). */
export interface RunIdQuestion extends QBase {
  kind: 'run-id';
  key: PitchClass;
  run: RunSpec;
  midis: number[];
  aspect: 'material' | 'shape';
  answer: string;
}

/**
 * A generic multiple-choice item produced by a topic generator (spec T–V): Barry Harris, extensions,
 * voicings, progressions, form, maqamat, rhythms, written theory … Deterministic from (topic, level, seed),
 * so review rebuilds it from its tag.
 */
export interface ChoiceQuestion extends QBase {
  kind: 'choice';
  topic: string;
  level: number;
  seed: number;
  skill: SkillId;
  ask: { en: string; he: string };
  names: Record<string, { en: string; he: string; say?: string[] }>;
  answer: string;
  choices: string[];
  /** The sound of each choice (compare: your answer, then the right one). */
  choiceStim?: Record<string, Stimulus[]>;
  /** Notes to show (written theory, sight-reading): drawn as notation. */
  show?: { midis: number[]; clef?: 'treble' | 'bass' | 'alto' | 'tenor'; chord?: boolean; key?: PitchClass | null };
  /** Text to show with the question (written theory). */
  text?: { en: string; he: string };
}

/** Absolute pitch (spec S.11, optional): a note with no reference — name it. Answer: the note key. */
export interface AbsNoteQuestion extends QBase {
  kind: 'abs-note';
  target: PitchClass;
  midi: number;
  answer: string;
  choices: string[];
}

/** Slash chords (spec: inversions and slash chords): which note is in the bass under a major triad —
 *  a chord tone (C, C/E, C/G) or a note outside the chord (C/D, C/F, C/B♭). Answer: the bass note key. */
export interface SlashQuestion extends QBase {
  kind: 'slash';
  /** The chord root (named; "key" so the {k} placeholder shows it). */
  key: PitchClass;
  bass: PitchClass;
  role: 'root' | 'third' | 'fifth' | 'other';
  midis: number[];
  answer: string;
  choices: string[];
}

/** "True or false?" as a question (rooms / duels): three notes, two interval labels — both right? */
export interface TFQuestion extends QBase {
  kind: 'tf';
  names: [PitchClass, PitchClass, PitchClass];
  shownLeft: string;
  shownRight: string;
  midis: number[];
  /** Hear the notes instead of reading their names. */
  ear: boolean;
  answer: 'true' | 'false';
  choices: ['true', 'false'];
}

/** Hear a scale with one wrong note and say which note (its position, 2 … n−1) was wrong. */
export interface WrongNoteQuestion extends QBase {
  kind: 'wrong-note';
  key: PitchClass;
  mode: ModeId;
  /** What is played (one note moved by a semitone). */
  midis: number[];
  /** The scale as it should be. */
  correct: number[];
  /** 1-based position of the wrong note; also the answer. */
  position: number;
  alt: 1 | -1;
  each: number;
  answer: number;
  choices: number[];
}

/** Hear a scale from a tonic and name its mode (major, melodic-minor and harmonic-minor modes, symmetric scales). */
export interface ModeIdQuestion extends QBase {
  kind: 'mode-id';
  key: PitchClass;
  mode: ModeId;
  midis: number[];
  /** Up only, or up and back down. */
  dir: 'up' | 'updown';
  /** Seconds per note. */
  each: number;
  answer: ModeId;
  choices: ModeId[];
}

/** Name a sequence of notes: heard after the key (#2) or converted from degrees (#6). Answer "B-1.F0". */
export interface NameSeqQuestion extends QBase {
  kind: 'name-seq';
  key: PitchClass;
  degrees: number[];
  names: string[];
  midis: number[];
  given: 'sound' | 'degrees';
  /** Transposition: the same melody as given in another key (note keys like 'C0'). */
  from?: { key: PitchClass; names: string[] };
  answer: string;
}

/** Jazz: which seventh chord colour (maj7, dominant 7, m7, half-diminished)? */
export interface SeventhQuestion extends QBase {
  kind: 'seventh';
  root: PitchClass;
  answer: SeventhQuality;
}

/** Jazz: which progression (ii–V–I, V–I, I–vi–ii–V, iii–vi–ii–V)? */
export interface ProgressionQuestion extends QBase {
  kind: 'progression';
  key: PitchClass;
  answer: ProgressionId;
}

export type Question =
  | ModeIdQuestion
  | ChoiceQuestion
  | AbsNoteQuestion
  | SlashQuestion
  | TFQuestion
  | WrongNoteQuestion
  | SeventhQuestion
  | ProgressionQuestion
  | NameSeqQuestion
  | SingRunQuestion
  | RunIdQuestion
  | RhythmReadQuestion
  | RhythmDictQuestion
  | DegreeQuestion
  | QualityQuestion
  | CadenceQuestion
  | SingQuestion
  | DegreeSeqQuestion
  | IntervalQuestion
  | InversionQuestion
  | NoteNameQuestion
  | SingSeqQuestion;

/** Canonical note-name answer: "B-1" (letter + accidental). */
export const pcKey = (p: PitchClass) => `${p.letter}${p.acc}`;
export function pcFromKey(k: string): PitchClass | null {
  const m = /^([A-G])(-?\d)$/.exec(k);
  return m ? { letter: m[1] as PitchClass['letter'], acc: Number(m[2]) as PitchClass['acc'] } : null;
}

export const INTERVAL_SEMITONES: Record<IntervalName, number> = { M3: 4, P5: 7, P8: 12 };

/** Which skill a question measures (for ratings). */
export function questionSkill(q: Question): SkillId {
  if (q.skillAs) return q.skillAs;
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
    case 'note-name':
      return q.direction === 'heard-pitch→name' ? 'notes' : 'degrees';
    case 'sing-seq':
      return 'singing';
    case 'rhythm-read':
      return 'rhythm-reading';
    case 'rhythm-dict':
      return 'rhythm-dictation';
    case 'sing-run':
    case 'run-id':
      return 'agility';
    case 'mode-id':
    case 'wrong-note':
      return 'modes';
    case 'tf':
      return 'intervals';
    case 'slash':
      return 'chords';
    case 'abs-note':
      return 'absolute';
    case 'choice':
      return q.skill;
    case 'name-seq':
      return q.given === 'sound' ? 'notes' : 'degrees';
    case 'seventh':
      return 'chords';
    case 'progression':
      return 'cadences';
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
  | { kind: 'inversion'; root: PitchClass; bass: BassRole }
  | { kind: 'rhythm'; rhythm: string }
  | { kind: 'seventh'; quality: SeventhQuality }
  | { kind: 'song'; song: string }
  /** Lesson-specific explanation (text from content), with a row of scale degrees or step names. */
  | { kind: 'explain'; topic: 'melodic-minor' | 'bass-line' | 'dictation' | 'swing-lick'; steps: string[] };

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
  /** Find my level: also measure singing (voice mode). */
  placementSinging?: boolean;
  /** Find my level: the sections to measure (all skills, or one domain's). */
  placementSkills?: SkillId[];
  /** Find my level: sections the player chose to skip (not measured, not rated). */
  placementSkipped?: SkillId[];
  /** Find my level by domain: which one. */
  placementDomain?: 'pitch' | 'time' | 'memory' | 'voice' | 'reading' | 'creative';
}

export type LessonId =
  | 'bflat-two-homes'
  | 'degrees-135'
  | 'major-minor'
  | 'cadences'
  | 'sing-home-five'
  | 'intervals'
  | 'inversions'
  | 'notes-degrees'
  | 'sing-names'
  | 'sing-degrees'
  | 'rhythm-r1'
  | 'rhythm-r2'
  | 'rhythm-r3'
  | 'rhythm-r4'
  | 'rhythm-r5'
  | 'rhythm-r6'
  | 'rhythm-r7'
  | 'rhythm-r8'
  | 'runs'
  | 'note-sequences'
  | 'jazz-1'
  | 'songs'
  | 'runs-workshop'
  | 'topic'
  | 'absolute-pitch'
  | 'slash-chords'
  | 'dictation'
  | 'jazz-2'
  | 'modes'
  | 'wrong-notes'
  | 'placement'
  | 'review'
  | 'weekly-puzzle'
  | 'basics-pitch'
  | 'basics-shape'
  | 'basics-beat'
  | 'basics-voice'
  | 'transpose'
  | 'rhythm-shift'
  | 'chord-tones';

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

// ---------------------------------------------------------------- Lessons 8–10: the full melodic matrix (spec H)
const NAME_KEYS = ['C', 'G', 'F', 'D', 'Bb', 'Eb'].map(pc);

/** Name the note of a degree. heard = play the key + note (#2); otherwise symbolic (#6). */
export function noteNameQuestion(id: string, key: PitchClass, degree: number, heard: boolean, difficulty = heard ? 1150 : 1000): NoteNameQuestion {
  const scale = majorScale(key);
  const target = scale[degree - 1];
  const targetMidi = placeInRange(pcValue(target), 62, 73);
  return {
    id,
    kind: 'note-name',
    direction: heard ? 'heard-pitch→name' : 'degree→name',
    key,
    degree,
    target,
    targetMidi,
    choices: scale.map(pcKey),
    answer: pcKey(target),
    stimulus: heard ? [{ kind: 'cadence', key }, { kind: 'note', midi: targetMidi, duration: 1.5 }] : [],
    difficulty,
  };
}

/** "Which degree is B♭ in E♭ major?" — symbolic, no playback (#5). */
export function nameToDegreeQuestion(id: string, key: PitchClass, degree: number): DegreeQuestion {
  const q = degreeQuestion(id, key, degree, [1, 2, 3, 4, 5, 6, 7], 950);
  return { ...q, direction: 'name→degree', stimulus: [] };
}

/** Lesson 8 — "Notes and degrees": hear → name, name → degree, degree → name. */
export function notesDegrees(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const qs: Question[] = [];
  for (let i = 0; i < 6; i++) {
    const key = pick(rnd, NAME_KEYS);
    const d = 1 + Math.floor(rnd() * 7);
    const kind = i % 3;
    qs.push(kind === 0 ? noteNameQuestion(`q${i + 1}`, key, d, true) : kind === 1 ? nameToDegreeQuestion(`q${i + 1}`, key, d) : noteNameQuestion(`q${i + 1}`, key, d, false));
  }
  const C = pc('C');
  return {
    id: 'notes-degrees',
    version: 1,
    skill: 'notes',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [{ id: 'intro-names', card: { kind: 'degrees', key: C, degrees: [1, 2, 3, 4, 5, 6, 7] }, stimulus: [{ kind: 'cadence', key: C }, { kind: 'notes', midis: [60, 62, 64, 65, 67, 69, 71], each: 0.45 }] }],
    questions: shuffle(rnd, qs).map((q, i) => ({ ...q, id: `q${i + 1}` })),
  };
}

/** Sing a named note after a reference (#4) or echo a heard note (#7). */
export function singByQuestion(id: string, key: PitchClass, degree: number, promptBy: 'name' | 'echo'): SingQuestion {
  const base = singQuestion(id, key, degree);
  if (promptBy === 'echo') {
    // Hear exactly the note, then sing it back — no key needed.
    return { ...base, promptBy, stimulus: [{ kind: 'note', midi: base.targetMidi, duration: 1.4 }], difficulty: 950 };
  }
  return { ...base, promptBy, difficulty: 1150 };
}

/** Lesson 9 — "Sing it by name": echo a note, then sing notes named after a reference. */
export function singNames(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffle(rnd, SING_KEYS);
  const C = pc('C');
  return {
    id: 'sing-names',
    version: 1,
    skill: 'singing',
    scoring: { xpPerCorrect: 15, attemptLimit: 3 },
    intro: [{ id: 'intro-echo', card: { kind: 'sing', key: C, degree: 1 }, stimulus: [{ kind: 'note', midi: 60, duration: 1.2 }] }],
    questions: [
      singByQuestion('q1', keys[0], 1, 'echo'),
      singByQuestion('q2', keys[1], 5, 'echo'),
      singByQuestion('q3', keys[2], 3, 'name'),
      singByQuestion('q4', keys[3], 5, 'name'),
    ],
  };
}

export function singSeqQuestion(id: string, key: PitchClass, degrees: number[], difficulty = 1150 + 40 * degrees.length): SingSeqQuestion {
  const tonic = placeInRange(pcValue(key), 55, 66);
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const midis = degrees.map((d) => tonic + steps[d - 1]);
  return {
    id,
    kind: 'sing-seq',
    key,
    degrees,
    midis,
    choices: [],
    answer: 'accurate',
    stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: tonic, duration: 1.2 }],
    difficulty,
  };
}

/** Lesson 10 — "Sing the degrees": given "five two", sing the notes in order (#3, sequences). */
export function singDegrees(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const shapes = [
    [1, 3, 5],
    [5, 3, 1],
    [1, 2, 3],
    [5, 6, 5],
    [3, 2, 1],
    [1, 5, 3],
  ];
  const picked = shuffle(rnd, shapes).slice(0, 3);
  const keys = shuffle(rnd, SING_KEYS);
  return {
    id: 'sing-degrees',
    version: 1,
    skill: 'singing',
    scoring: { xpPerCorrect: 15, attemptLimit: 3 },
    intro: [
      {
        id: 'intro-sing-seq',
        card: { kind: 'degrees', key: pc('C'), degrees: [1, 3, 5] },
        stimulus: [{ kind: 'cadence', key: pc('C') }, { kind: 'notes', midis: [60, 64, 67], each: 0.8 }],
      },
    ],
    questions: picked.map((d, i) => singSeqQuestion(`q${i + 1}`, keys[i], d)),
  };
}

// ---------------------------------------------------------------- Rhythm lessons R1–R3 (spec G)
/** Quarter-note tempo per level (6/8 at R7: dotted-quarter pulse = 2/3 of this; R8 swing). */
export const RHYTHM_BPM: Record<RhythmLevel, number> = { 1: 70, 2: 76, 3: 80, 4: 66, 5: 84, 6: 72, 7: 84, 8: 116 };

export function rhythmReadQuestion(id: string, level: RhythmLevel, bars: number, seed: number, show: 'notation' | 'words'): RhythmReadQuestion {
  const rhythm = rhythmAt(level, bars, seed);
  return {
    id,
    kind: 'rhythm-read',
    level,
    rhythm,
    bpm: RHYTHM_BPM[level],
    show,
    choices: [],
    answer: 'accurate',
    stimulus: [], // the count-in and metronome are played by the performance timeline
    difficulty: 900 + 110 * (level - 1) + 50 * (bars - 1) + (show === 'words' ? 40 : 0),
  };
}

export function rhythmDictQuestion(id: string, level: RhythmLevel, bars: number, seed: number, mode: 'choose' | 'build' = 'choose'): RhythmDictQuestion {
  const rhythm = rhythmAt(level, bars, seed);
  const bpm = RHYTHM_BPM[level];
  const opts = mode === 'build' ? [] : rhythmOptions(rhythm, level, 4, seed);
  return {
    id,
    kind: 'rhythm-dict',
    level,
    rhythm,
    bpm,
    ...(mode === 'build' ? { mode } : {}),
    choices: opts.map(rhythmKey),
    answer: rhythmKey(rhythm),
    stimulus: [{ kind: 'rhythm', rhythm: rhythmKey(rhythm), bars, bpm }],
    difficulty: 950 + 110 * (level - 1) + 60 * (bars - 1) + (mode === 'build' ? 60 : 0),
  };
}

/** Rhythm lesson at a level: read from notation ×2, read from words, dictation ×2 (the second one built from blocks from R4 on). */
export function rhythmLesson(level: RhythmLevel, seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const bars2 = level >= 2 ? 2 : 1;
  const example = rhythmAt(level, 1, 11);
  return {
    id: `rhythm-r${level}` as LessonId,
    version: 1,
    skill: 'rhythm-reading',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [{ id: `intro-r${level}`, card: { kind: 'rhythm', rhythm: rhythmKey(example) }, stimulus: [{ kind: 'rhythm', rhythm: rhythmKey(example), bars: 1, bpm: RHYTHM_BPM[level] }] }],
    questions: [
      rhythmReadQuestion('q1', level, 1, s(), 'notation'),
      rhythmDictQuestion('q2', level, 1, s()),
      rhythmReadQuestion('q3', level, bars2, s(), 'notation'),
      rhythmReadQuestion('q4', level, 1, s(), 'words'),
      rhythmDictQuestion('q5', level, bars2, s(), level >= 4 ? 'build' : 'choose'),
    ],
  };
}

// ---------------------------------------------------------------- Melodic matrix, sequences (spec H #2 #4 #5 #6)
export function nameSeqQuestion(id: string, key: PitchClass, degrees: number[], given: 'sound' | 'degrees'): NameSeqQuestion {
  const scale = majorScale(key);
  const names = degrees.map((d) => pcKey(scale[d - 1]));
  const tonic = placeInRange(pcValue(key), 57, 68);
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const midis = degrees.map((d) => tonic + steps[d - 1]);
  return {
    id,
    kind: 'name-seq',
    key,
    degrees,
    names,
    midis,
    given,
    choices: scale.map(pcKey),
    answer: names.join('.'),
    stimulus: given === 'sound' ? [{ kind: 'cadence', key }, { kind: 'notes', midis, each: 0.75 }] : [],
    difficulty: (given === 'sound' ? 1250 : 1050) + 40 * degrees.length,
  };
}

/** #5 sequence: "B-flat F" → "five two" (symbolic). */
export function namesToDegreesQuestion(id: string, key: PitchClass, degrees: number[]): DegreeSeqQuestion {
  const q = degreeSeqQuestion(id, key, degrees, 1000 + 40 * degrees.length);
  const scale = majorScale(key);
  return { ...q, given: 'names', names: degrees.map((d) => pcKey(scale[d - 1])), stimulus: [] };
}

/** #4 sequence: "B-flat F" → sing them (after the key is heard). */
export function singNamesSeqQuestion(id: string, key: PitchClass, degrees: number[]): SingSeqQuestion {
  const q = singSeqQuestion(id, key, degrees, 1200 + 40 * degrees.length);
  const scale = majorScale(key);
  return { ...q, promptBy: 'name', names: degrees.map((d) => pcKey(scale[d - 1])) };
}

/** Lesson 20 — "Note sequences": the matrix in sequences — hear → names, names ↔ degrees, names → sing. */
export function noteSequences(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffle(rnd, NAME_KEYS.slice());
  const shapes2 = [[5, 2], [1, 5], [3, 1], [5, 1], [1, 4], [6, 5]];
  const shapes3 = [[1, 3, 5], [5, 4, 3], [1, 2, 3], [5, 6, 5], [3, 2, 1], [1, 5, 3], [6, 4, 2]];
  const singShapes = [[1, 3, 5], [5, 3, 1], [1, 2, 3], [3, 2, 1]];
  return {
    id: 'note-sequences',
    version: 1,
    skill: 'notes',
    scoring: { xpPerCorrect: 15, attemptLimit: 3 },
    intro: [
      {
        id: 'intro-note-seq',
        card: { kind: 'degrees', key: keys[0], degrees: [5, 2] },
        stimulus: [{ kind: 'cadence', key: keys[0] }, { kind: 'notes', midis: nameSeqQuestion('x', keys[0], [5, 2], 'sound').midis, each: 0.8 }],
      },
    ],
    questions: [
      nameSeqQuestion('q1', keys[0], pick(rnd, shapes2), 'sound'),
      namesToDegreesQuestion('q2', keys[1], pick(rnd, shapes3)),
      nameSeqQuestion('q3', keys[2], pick(rnd, shapes3), 'degrees'),
      singNamesSeqQuestion('q4', pick(rnd, SING_KEYS), pick(rnd, singShapes)),
      nameSeqQuestion('q5', keys[3], pick(rnd, shapes3), 'sound'),
    ],
  };
}

// ---------------------------------------------------------------- Songs you know (public-domain openings)
const SONG_BPM = 96;

/** Hear the opening of a known melody (with its rhythm) → name the degrees; the title is revealed after. */
export function songDegreesQuestion(id: string, key: PitchClass, song: SongOpening, n = song.degrees.length): DegreeSeqQuestion {
  const o = opening(song, n);
  const q = degreeSeqQuestion(id, key, o.degrees, 1100 + 35 * o.degrees.length);
  return { ...q, song: song.id, stimulus: [{ kind: 'cadence', key }, { kind: 'melody', midis: q.midis, beats: o.beats, bpm: SONG_BPM }] };
}

/** Sing the opening of a known melody from its degrees. */
export function singSongQuestion(id: string, key: PitchClass, song: SongOpening, n = Math.min(5, song.degrees.length)): SingSeqQuestion {
  const o = opening(song, n);
  return { ...singSeqQuestion(id, key, o.degrees, 1150 + 40 * o.degrees.length), song: song.id };
}

/** Lesson 22 — "Songs you know": hear famous openings and name their degrees; sing one from its degrees. */
export function songsLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const songs = shuffle(rnd, SONGS.slice());
  const keys = shuffle(rnd, ['C', 'D', 'F', 'G', 'Bb'].map((k) => pc(k)));
  const short = (s: SongOpening) => Math.min(s.degrees.length, 5);
  return {
    id: 'songs',
    version: 1,
    skill: 'sequences',
    scoring: { xpPerCorrect: 15, attemptLimit: 3 },
    intro: [
      {
        id: 'intro-songs',
        card: { kind: 'song', song: 'twinkle' },
        stimulus: [{ kind: 'cadence', key: pc('C') }, { kind: 'melody', midis: [60, 60, 67, 67, 69, 69, 67], beats: [1, 1, 1, 1, 1, 1, 2], bpm: SONG_BPM }],
      },
    ],
    questions: [
      songDegreesQuestion('q1', keys[0], songs[0], short(songs[0])),
      songDegreesQuestion('q2', keys[1], songs[1], short(songs[1])),
      songDegreesQuestion('q3', keys[2], songs[2], short(songs[2])),
      singSongQuestion('q4', pick(rnd, SING_KEYS), songs[3]),
      songDegreesQuestion('q5', keys[3], songs[4], songs[4].degrees.length),
    ],
  };
}

// ---------------------------------------------------------------- Jazz 1: sevenths and ii–V–I
export function seventhQuestion(id: string, root: PitchClass, answer: SeventhQuality, choices: SeventhQuality[] = SEVENTHS): SeventhQuestion {
  return {
    id,
    kind: 'seventh',
    root,
    answer,
    choices,
    stimulus: [{ kind: 'chord', midis: jazzVoicing(pcValue(root), answer), duration: 1.8 }],
    difficulty: 1050 + 70 * (choices.length - 2) + (answer === 'm7b5' ? 60 : 0),
  };
}

export function progressionQuestion(id: string, key: PitchClass, answer: ProgressionId, choices: ProgressionId[]): ProgressionQuestion {
  return {
    id,
    kind: 'progression',
    key,
    answer,
    choices,
    stimulus: [{ kind: 'jazz', key, chords: PROGRESSIONS[answer], each: 1 }],
    difficulty: 1100 + 60 * (choices.length - 2),
  };
}

/** Lesson 21 — "Jazz 1": hear seventh-chord colours, then the ii–V–I family. */
export function jazzLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const roots = shuffle(rnd, ['C', 'D', 'F', 'G', 'A', 'Bb'].map((k) => pc(k)));
  const two = covering(rnd, ['maj7', '7'] as const, 2);
  const three = pick(rnd, ['maj7', '7', 'm7'] as const);
  const four = pick(rnd, SEVENTHS);
  const progs: ProgressionId[] = ['ii-V-I', 'V-I', 'I-vi-ii-V'];
  const p1 = covering(rnd, progs, 2);
  return {
    id: 'jazz-1',
    version: 1,
    skill: 'chords',
    scoring: { xpPerCorrect: 15, attemptLimit: 2 },
    intro: [
      { id: 'intro-maj7', card: { kind: 'seventh', quality: 'maj7' }, stimulus: [{ kind: 'chord', midis: jazzVoicing(0, 'maj7'), duration: 1.8 }] },
      { id: 'intro-dom7', card: { kind: 'seventh', quality: '7' }, stimulus: [{ kind: 'chord', midis: jazzVoicing(0, '7'), duration: 1.8 }] },
      { id: 'intro-251', card: { kind: 'seventh', quality: 'm7' }, stimulus: [{ kind: 'jazz', key: pc('C'), chords: PROGRESSIONS['ii-V-I'], each: 1 }] },
    ],
    questions: [
      seventhQuestion('q1', roots[0], two[0], ['maj7', '7']),
      seventhQuestion('q2', roots[1], three, ['maj7', '7', 'm7']),
      progressionQuestion('q3', roots[2], p1[0], progs),
      seventhQuestion('q4', roots[3], four),
      progressionQuestion('q5', roots[4], p1[1], progs),
    ],
  };
}

// ---------------------------------------------------------------- Riffs & runs (spec K)
const RUN_KEYS = ['C', 'D', 'F', 'G', 'A'] as const;

function runMidis(key: PitchClass, run: RunSpec): number[] {
  // Keep the whole run in a comfortable range (it is graded octave-free).
  const lo = Math.min(...run.offsets);
  const hi = Math.max(...run.offsets);
  const tonic = placeInRange(pcValue(key), 57 - lo, Math.max(57 - lo, 74 - hi));
  return run.offsets.map((o) => tonic + o);
}

export function singRunQuestion(id: string, key: PitchClass, run: RunSpec, prompt: 'echo' | 'told'): SingRunQuestion {
  const midis = runMidis(key, run);
  const tonic = midis[0] - run.offsets[0];
  return {
    id,
    kind: 'sing-run',
    key,
    run,
    midis,
    prompt,
    choices: [],
    answer: 'accurate',
    stimulus:
      prompt === 'echo'
        ? [{ kind: 'cadence', key }, { kind: 'rest', duration: 0.3 }, { kind: 'notes', midis, each: 1 / run.nps }]
        : [{ kind: 'cadence', key }, { kind: 'note', midi: tonic, duration: 1.0 }],
    difficulty: runDifficulty(run) + (prompt === 'told' ? 80 : 0),
  };
}

export function runIdQuestion(id: string, key: PitchClass, run: RunSpec, aspect: 'material' | 'shape'): RunIdQuestion {
  const midis = runMidis(key, run);
  const choices = aspect === 'material' ? ['major', 'min-penta', 'blues'] : ['up', 'down', 'turn'];
  return {
    id,
    kind: 'run-id',
    key,
    run,
    midis,
    aspect,
    choices,
    answer: aspect === 'material' ? run.material : run.shape,
    stimulus: [{ kind: 'cadence', key }, { kind: 'rest', duration: 0.3 }, { kind: 'notes', midis, each: 1 / run.nps }],
    difficulty: 1000 + (aspect === 'material' ? 120 : 0),
  };
}

/** Lesson 14 — "Riffs & runs": name what you hear, then sing short runs back (spec K). */
export function runsLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffle(rnd, [...RUN_KEYS]).map((k) => pc(k));
  const mat = pick(rnd, ['major', 'min-penta', 'blues'] as const);
  const matRun: RunSpec = { offsets: buildRun(mat, 'up', 6, 'tonic'), nps: 3, material: mat, shape: 'up', level: 3 };
  const shape = pick(rnd, ['up', 'down', 'turn'] as const);
  const shapeRun: RunSpec = { offsets: buildRun('major', shape, 5, shape === 'down' ? 'fifth' : 'tonic'), nps: 2.7, material: 'major', shape, level: 2 };
  return {
    id: 'runs',
    version: 1,
    skill: 'agility',
    scoring: { xpPerCorrect: 15, attemptLimit: 3 },
    intro: [
      {
        id: 'intro-runs',
        card: { kind: 'degrees', key: pc('C'), degrees: [1, 2, 3, 4, 5] },
        stimulus: [{ kind: 'cadence', key: pc('C') }, { kind: 'notes', midis: [60, 62, 64, 65, 67], each: 0.3 }],
      },
    ],
    questions: [
      runIdQuestion('q1', keys[0], matRun, 'material'),
      runIdQuestion('q2', keys[1], shapeRun, 'shape'),
      singRunQuestion('q3', keys[2], runAt(1, Math.floor(rnd() * 1e9)), 'echo'),
      singRunQuestion('q4', keys[3], runAt(2, Math.floor(rnd() * 1e9)), 'echo'),
      singRunQuestion('q5', keys[4], runAt(2, Math.floor(rnd() * 1e9)), 'told'),
    ],
  };
}

/** Runs workshop (practice tool): two runs at a level, each at 60 % → 80 % → 100 % tempo (spec K.6). */
export function runsWorkshop(level: number, seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffle(rnd, [...RUN_KEYS]).map((k) => pc(k));
  const qs: Question[] = [];
  for (let r = 0; r < 2; r++) {
    const run = runAt(level, Math.floor(rnd() * 1e9));
    [0.6, 0.8, 1].forEach((f, i) => qs.push(singRunQuestion(`q${r * 3 + i + 1}`, keys[r], f === 1 ? run : atTempo(run, f), 'echo')));
  }
  return { id: 'runs-workshop', version: 1, skill: 'agility', scoring: { xpPerCorrect: 12, attemptLimit: 3 }, intro: [], questions: qs };
}

/** Agility rating → workshop level 1–8. */
export const runLevelFor = (rating: number | null) => (rating === null ? 1 : Math.max(1, Math.min(MAX_RUN_LEVEL, Math.round((rating - 900) / 80) + 1)));

/** The answer a played MIDI note gives for a question, or null when it does not apply. */
export function answerFromMidi(q: Question, m: number): Answer | null {
  const pcOfMidi = ((m % 12) + 12) % 12;
  if (q.kind === 'degree' || q.kind === 'note-name') {
    const scale = majorScale(q.key);
    const i = scale.findIndex((p) => pcValue(p) === pcOfMidi);
    if (i < 0) return null;
    const a: Answer = q.kind === 'degree' ? i + 1 : pcKey(scale[i]);
    return q.choices.includes(a) ? a : null;
  }
  return null;
}

// ---------------------------------------------------------------- Registry
export const LESSON_ORDER: LessonId[] = [
  'bflat-two-homes',
  'degrees-135',
  'major-minor',
  'cadences',
  'sing-home-five',
  'intervals',
  'inversions',
  'notes-degrees',
  'sing-names',
  'sing-degrees',
  'chord-tones',
  'rhythm-r1',
  'rhythm-r2',
  'rhythm-r3',
  'runs',
  'rhythm-r4',
  'rhythm-r5',
  'rhythm-shift',
  'rhythm-r6',
  'rhythm-r7',
  'rhythm-r8',
  'note-sequences',
  'transpose',
  'jazz-1',
  'songs',
  'slash-chords',
  'dictation',
  'jazz-2',
];

export function makeLesson(id: LessonId, seed = Date.now()): LessonDef {
  switch (id) {
    case 'basics-pitch':
      return basicsPitch(seed);
    case 'basics-shape':
      return basicsShape(seed);
    case 'basics-beat':
      return basicsBeat(seed);
    case 'basics-voice':
      return basicsVoice(seed);
    case 'transpose':
      return transposeLesson(seed);
    case 'rhythm-shift':
      return rhythmShiftLesson(seed);
    case 'chord-tones':
      return chordTonesLesson(seed);
    case 'modes':
      return modesLesson(1, seed);
    case 'slash-chords':
      return slashLesson(seed);
    case 'absolute-pitch':
      return absoluteLesson(1, seed);
    case 'topic':
      return absoluteLesson(1, seed); // generated lessons are opened with their own generator
    case 'dictation':
      return dictationLesson(seed);
    case 'jazz-2':
      return jazz2Lesson(seed);
    case 'wrong-notes':
      return wrongNotesLesson(1, seed);
    case 'runs':
      return runsLesson(seed);
    case 'note-sequences':
      return noteSequences(seed);
    case 'jazz-1':
      return jazzLesson(seed);
    case 'songs':
      return songsLesson(seed);
    case 'runs-workshop':
      return runsWorkshop(3, seed);
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
    case 'notes-degrees':
      return notesDegrees(seed);
    case 'sing-names':
      return singNames(seed);
    case 'sing-degrees':
      return singDegrees(seed);
    case 'rhythm-r1':
      return rhythmLesson(1, seed);
    case 'rhythm-r4':
      return rhythmLesson(4, seed);
    case 'rhythm-r5':
      return rhythmLesson(5, seed);
    case 'rhythm-r6':
      return rhythmLesson(6, seed);
    case 'rhythm-r7':
      return rhythmLesson(7, seed);
    case 'rhythm-r8':
      return rhythmLesson(8, seed);
    case 'rhythm-r2':
      return rhythmLesson(2, seed);
    case 'rhythm-r3':
      return rhythmLesson(3, seed);
  }
}

/** Teaching gesture after a revealed answer. */
export function explainStimulus(q: Question): Stimulus[] {
  switch (q.kind) {
    case 'mode-id':
      return [{ kind: 'notes', midis: q.midis, each: q.each * 1.4 }];
    case 'wrong-note':
      return [{ kind: 'notes', midis: q.correct, each: q.each * 1.3 }];
    case 'tf':
      return [{ kind: 'notes', midis: q.midis, each: 0.6 }];
    case 'slash':
      return [{ kind: 'note', midi: q.midis[0], duration: 1.0 }, { kind: 'chord', midis: q.midis, duration: 1.6 }];
    case 'abs-note':
      return [{ kind: 'note', midi: q.midi, duration: 1.2 }];
    case 'choice':
      return q.choiceStim?.[q.answer] ?? q.stimulus;
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
    case 'note-name':
      return [{ kind: 'cadence', key: q.key }, { kind: 'note', midi: q.targetMidi, duration: 1.2 }];
    case 'sing-seq':
      return [{ kind: 'notes', midis: q.midis, each: 0.8 }];
    case 'rhythm-read':
      return [{ kind: 'rhythm', rhythm: rhythmKey(q.rhythm), bars: q.rhythm.bars, bpm: q.bpm }];
    case 'rhythm-dict':
      return q.stimulus;
    case 'name-seq':
      return [{ kind: 'cadence', key: q.key }, { kind: 'notes', midis: q.midis, each: 0.75 }];
    case 'seventh': {
      const v = jazzVoicing(pcValue(q.root), q.answer);
      return [{ kind: 'chord', midis: v, duration: 2.2, arpeggio: true }, { kind: 'chord', midis: v, duration: 1.6 }];
    }
    case 'progression':
      return q.stimulus;
    case 'sing-run':
    case 'run-id':
      // The model at half speed, then at tempo (spec K.6).
      return [
        { kind: 'notes', midis: q.midis, each: 2 / q.run.nps },
        { kind: 'rest', duration: 0.4 },
        { kind: 'notes', midis: q.midis, each: 1 / q.run.nps },
      ];
  }
}

/**
 * "Hear your answer next to the correct one": the player's choice, a breath, then the right answer.
 * Null when the given answer can't be played back meaningfully.
 */
export function compareStimulus(q: Question, given: Answer): Stimulus[] | null {
  switch (q.kind) {
    case 'tf':
      return null;
    case 'choice': {
      if (typeof given !== 'string' || given === q.answer) return null;
      const a = q.choiceStim?.[given];
      const b = q.choiceStim?.[q.answer];
      return a && b ? [...a, { kind: 'rest', duration: 0.6 }, ...b] : null;
    }
    case 'abs-note': {
      const g = typeof given === 'string' ? pcFromKey(given) : null;
      if (!g || given === q.answer) return null;
      return [{ kind: 'note', midi: placeInRange(pcValue(g), q.midi - 6, q.midi + 5), duration: 1.0 }, { kind: 'rest', duration: 0.4 }, { kind: 'note', midi: q.midi, duration: 1.0 }];
    }
    case 'slash': {
      if (typeof given !== 'string' || given === q.answer) return null;
      const g = pcFromKey(given);
      if (!g) return null;
      const other = [placeInRange(pcValue(g), 40, 51), ...q.midis.slice(1)];
      return [{ kind: 'chord', midis: other, duration: 1.4 }, { kind: 'rest', duration: 0.5 }, { kind: 'chord', midis: q.midis, duration: 1.4 }];
    }
    case 'wrong-note':
      // What you heard, then the scale as it should be.
      return [{ kind: 'notes', midis: q.midis, each: q.each }, { kind: 'rest', duration: 0.6 }, { kind: 'notes', midis: q.correct, each: q.each }];
    case 'mode-id': {
      if (typeof given !== 'string' || given === q.answer || !(given in MODE_STEPS)) return null;
      const other = modeMidis(q.midis[0], given as ModeId, q.dir);
      return [{ kind: 'notes', midis: other, each: q.each }, { kind: 'rest', duration: 0.6 }, { kind: 'notes', midis: q.midis, each: q.each }];
    }
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
    case 'note-name': {
      const g = typeof given === 'string' ? pcFromKey(given) : null;
      if (!g) return null;
      const gm = placeInRange(pcValue(g), 62, 73);
      return [{ kind: 'note', midi: gm, duration: 1.0 }, { kind: 'rest', duration: 0.35 }, { kind: 'note', midi: q.targetMidi, duration: 1.2 }];
    }
    case 'rhythm-dict': {
      if (typeof given !== 'string' || given === q.answer) return null;
      const g = rhythmFromKey(given, q.rhythm.bars);
      return [{ kind: 'rhythm', rhythm: rhythmKey(g), bars: g.bars, bpm: q.bpm }, { kind: 'rest', duration: 0.5 }, ...q.stimulus];
    }
    case 'seventh': {
      if (typeof given !== 'string' || given === q.answer || !SEVENTHS.includes(given as SeventhQuality)) return null;
      return [{ kind: 'chord', midis: jazzVoicing(pcValue(q.root), given as SeventhQuality), duration: 1.4 }, { kind: 'rest', duration: 0.35 }, ...q.stimulus];
    }
    case 'progression': {
      if (typeof given !== 'string' || given === q.answer || !(given in PROGRESSIONS)) return null;
      return [{ kind: 'jazz', key: q.key, chords: PROGRESSIONS[given as ProgressionId], each: 1 }, { kind: 'rest', duration: 0.5 }, ...q.stimulus];
    }
    case 'name-seq': {
      if (typeof given !== 'string' || given === q.answer) return null;
      const ks = given.split('.').map(pcFromKey);
      if (ks.some((k) => !k)) return null;
      const lo = Math.min(...q.midis) - 2;
      const gm = ks.map((k) => placeInRange(pcValue(k!), lo, lo + 11));
      return [{ kind: 'notes', midis: gm, each: 0.6 }, { kind: 'rest', duration: 0.4 }, { kind: 'notes', midis: q.midis, each: 0.6 }];
    }
    case 'run-id': {
      if (typeof given !== 'string' || given === q.answer) return null;
      const other = q.aspect === 'material' ? { ...q.run, material: given as RunMaterial } : { ...q.run, shape: given as RunShape };
      const offs = buildRun(other.material, other.shape, q.run.offsets.length, q.run.offsets[0] === 0 ? 'tonic' : q.run.offsets[0] === 7 ? 'fifth' : 'top');
      const tonic = q.midis[0] - q.run.offsets[0];
      return [{ kind: 'notes', midis: offs.map((o) => tonic + o), each: 1 / q.run.nps }, { kind: 'rest', duration: 0.5 }, { kind: 'notes', midis: q.midis, each: 1 / q.run.nps }];
    }
    case 'sing':
    case 'sing-seq':
    case 'sing-run':
    case 'rhythm-read':
      return null;
  }
}

export interface NoteEvent {
  midi: number;
  start: number; // seconds, relative to sequence start
  duration: number;
  velocity: number; // 0..1
  /** Percussion instead of piano (metronome click / accent / woodblock / drum kit / the option bell). */
  perc?: PercKind;
}

export type PercKind = 'click' | 'accent' | 'wood' | 'kick' | 'snare' | 'snare-soft' | 'hat' | 'bell';

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
      case 'melody': {
        const beat = 60 / s.bpm;
        s.midis.forEach((m, i) => {
          const d = (s.beats[i] ?? 1) * beat;
          events.push({ midi: m, start: t, duration: d * 0.92, velocity: 0.7 });
          t += d;
        });
        t += 0.2;
        break;
      }
      case 'jazz': {
        const vs = voiceProgression(pcValue(s.key), s.chords);
        vs.forEach((v, i) => {
          const dur = i === vs.length - 1 ? s.each * 1.6 : s.each;
          block(v, dur);
          t += dur;
        });
        t += 0.2;
        break;
      }
      case 'events':
        for (const e of s.events) events.push({ ...e, start: t + e.start });
        t += s.length;
        break;
      case 'marker':
        for (let k = 0; k < s.n; k++) events.push({ midi: 96, start: t + k * 0.2, duration: 0.05, velocity: 0.7, perc: 'bell' });
        t += 0.2 * (s.n - 1) + 0.6;
        break;
      case 'rhythm': {
        const snd = rhythmSound(rhythmFromKey(s.rhythm, s.bars), s.bpm);
        for (const e of snd.events) events.push({ ...e, start: t + e.start });
        t += snd.length;
        break;
      }
    }
  }
  return { events, length: t };
}

/** Stable description of what a question tests (review-queue key). */
export function questionTag(q: Question): string {
  const k = (p: PitchClass) => `${p.letter}${p.acc}`;
  switch (q.kind) {
    case 'abs-note':
      return `abs:${k(q.target)}`;
    case 'choice':
      return `choice:${q.topic}:${q.level}:${q.seed}`;
    case 'slash':
      return `slash:${k(q.key)}:${k(q.bass)}`;
    case 'tf':
      return `tf:${q.names.map(k).join('.')}:${q.shownLeft}:${q.shownRight}:${q.midis.join('.')}:${q.ear ? 1 : 0}`;
    case 'wrong-note':
      return `wrongnote:${k(q.key)}:${q.mode}:${q.position}:${q.alt}:${q.each}`;
    case 'mode-id':
      return `modeid:${k(q.key)}:${q.mode}:${q.choices.join(',')}:${q.dir}:${q.each}`;
    case 'degree':
      return `degree:${k(q.key)}:${q.answer}`;
    case 'quality':
      return `quality:${q.answer}`;
    case 'cadence':
      return `cadence:${q.answer}`;
    case 'sing':
      return `sing:${q.degree}`;
    case 'degree-seq':
      if (q.song) return `song:${k(q.key)}:${q.song}:${q.degrees.length}`;
      return `seq:${k(q.key)}:${q.answer}${q.given === 'names' ? ':names' : ''}`;
    case 'interval':
      return `interval:${q.answer}:${q.mode}`;
    case 'inversion':
      return `inversion:${q.answer}`;
    case 'note-name':
      return `name:${k(q.key)}:${q.degree}:${q.direction === 'heard-pitch→name' ? 'heard' : 'degree'}`;
    case 'sing-seq':
      if (q.song) return `singsong:${k(q.key)}:${q.song}:${q.degrees.length}`;
      return `singseq:${k(q.key)}:${q.degrees.join('-')}${q.promptBy === 'name' ? ':name' : ''}`;
    case 'rhythm-read':
      return `rread:${q.level}:${q.rhythm.bars}:${q.show}:${rhythmKey(q.rhythm)}`;
    case 'rhythm-dict':
      return `rdict:${q.level}:${q.rhythm.bars}:${q.answer}`;
    case 'seventh':
      return `seventh:${q.answer}:${q.choices.length}`;
    case 'progression':
      return `prog:${q.answer}:${q.choices.length}`;
    case 'name-seq':
      return `nameseq:${k(q.key)}:${q.degrees.join('-')}:${q.given}`;
    case 'sing-run':
      return `srun:${k(q.key)}:${q.run.level}:${q.run.material}:${q.run.shape}:${q.run.nps}:${q.prompt}`;
    case 'run-id':
      return `runid:${k(q.key)}:${q.run.level}:${q.run.material}:${q.run.shape}:${q.aspect}`;
  }
}


// ======================================================================= modes by ear

/** The notes of a mode from a tonic: up to the octave, or up and back down. */
export function modeMidis(tonicMidi: number, mode: ModeId, dir: 'up' | 'updown'): number[] {
  const up = MODE_STEPS[mode].map((s) => tonicMidi + s);
  return dir === 'up' ? up : [...up, ...up.slice(0, -1).reverse()];
}

export function modeIdQuestion(id: string, key: PitchClass, mode: ModeId, choices: ModeId[], dir: 'up' | 'updown', each: number, difficulty: number): ModeIdQuestion {
  const tonic = placeInRange(pcValue(key), 55, 66);
  const midis = modeMidis(tonic, mode, dir);
  return {
    id,
    kind: 'mode-id',
    key,
    mode,
    midis,
    dir,
    each,
    answer: mode,
    choices,
    stimulus: [{ kind: 'note', midi: tonic, duration: 0.9 }, { kind: 'rest', duration: 0.3 }, { kind: 'notes', midis, each }],
    difficulty,
  };
}

/** Pools per level: easiest = Ionian vs Aeolian; hardest = every mode of all three families + symmetric scales. */
export const MODE_ID_LEVELS: { pool: ModeId[]; choices: number; dir: 'up' | 'updown'; each: number; base: number }[] = [
  { pool: ['ionian', 'aeolian'], choices: 2, dir: 'updown', each: 0.42, base: 900 },
  { pool: ['ionian', 'dorian', 'mixolydian', 'aeolian'], choices: 3, dir: 'updown', each: 0.4, base: 1050 },
  { pool: ['major-pentatonic', 'minor-pentatonic', 'blues', 'major-blues', 'ionian', 'aeolian'], choices: 4, dir: 'updown', each: 0.38, base: 1150 },
  { pool: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'], choices: 4, dir: 'updown', each: 0.36, base: 1200 },
  { pool: ['aeolian', 'harmonic-minor', 'melodic-minor', 'dorian', 'phrygian-dominant', 'phrygian', 'lydian-dominant', 'mixolydian'], choices: 4, dir: 'updown', each: 0.34, base: 1300 },
  { pool: ['melodic-minor', 'dorian-b2', 'lydian-augmented', 'lydian-dominant', 'mixolydian-b6', 'locrian-sharp2', 'altered', 'harmonic-minor', 'locrian-nat6', 'ionian-sharp5', 'dorian-sharp4', 'phrygian-dominant', 'lydian-sharp2', 'ultralocrian'], choices: 4, dir: 'updown', each: 0.32, base: 1450 },
  { pool: ['bebop-dominant', 'bebop-major', 'mixolydian', 'ionian', 'double-harmonic', 'phrygian-dominant', 'hungarian-minor', 'harmonic-minor', 'hirajoshi', 'in-sen', 'augmented', 'whole-tone', 'blues', 'major-blues'], choices: 4, dir: 'updown', each: 0.3, base: 1550 },
  { pool: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'melodic-minor', 'dorian-b2', 'lydian-augmented', 'lydian-dominant', 'mixolydian-b6', 'locrian-sharp2', 'altered', 'harmonic-minor', 'locrian-nat6', 'ionian-sharp5', 'dorian-sharp4', 'phrygian-dominant', 'lydian-sharp2', 'ultralocrian', 'whole-tone', 'diminished'], choices: 4, dir: 'up', each: 0.26, base: 1600 },
];

const MODE_KEYS = ['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'];

/** Choices for a mode: the answer plus its nearest neighbours in the pool (one or two notes apart). */
export function modeChoices(answer: ModeId, pool: ModeId[], n: number, rnd: () => number): ModeId[] {
  const others = shuffle(rnd, pool.filter((m) => m !== answer)).sort((a, b) => modeDistance(answer, a) - modeDistance(answer, b));
  return shuffle(rnd, [answer, ...others.slice(0, n - 1)]);
}

/** "Modes by ear", level 1–6: 6 questions. */
export function modesLesson(level: number, seed = Date.now()): LessonDef {
  const L = MODE_ID_LEVELS[Math.max(0, Math.min(MODE_ID_LEVELS.length - 1, level - 1))];
  const rnd = mulberry32(seed);
  const answers = Array.from({ length: 6 }, (_, i) => shuffle(rnd, [...L.pool])[i % L.pool.length]);
  const questions = answers.map((mode, i) => {
    const key = pc(MODE_KEYS[Math.floor(rnd() * MODE_KEYS.length)]);
    const fam = MODE_FAMILY[mode];
    const difficulty = L.base + (fam === 'harmonic' ? 60 : fam === 'melodic' ? 40 : 0) + (L.choices - 2) * 30;
    return modeIdQuestion(`mode${i + 1}`, key, mode, modeChoices(mode, L.pool, L.choices, rnd), L.dir, L.each, difficulty);
  });
  return { id: 'modes', version: 1, skill: 'modes', scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions };
}


// ======================================================================= spot the wrong note

/** The scale up from the tonic with the note at `position` (1-based) moved by `alt`, or null when that
 *  would land on another note of the scale (ambiguous). */
export function wrongNoteMidis(tonicMidi: number, mode: ModeId, position: number, alt: 1 | -1): { heard: number[]; correct: number[] } | null {
  const correct = MODE_STEPS[mode].map((s) => tonicMidi + s);
  if (position < 2 || position > correct.length - 1) return null;
  const moved = correct[position - 1] + alt;
  if (correct.includes(moved)) return null;
  const heard = correct.slice();
  heard[position - 1] = moved;
  return { heard, correct };
}

export function wrongNoteQuestion(id: string, key: PitchClass, mode: ModeId, position: number, alt: 1 | -1, each: number, difficulty: number): WrongNoteQuestion | null {
  const tonic = placeInRange(pcValue(key), 55, 66);
  const w = wrongNoteMidis(tonic, mode, position, alt);
  if (!w) return null;
  const n = w.correct.length;
  return {
    id,
    kind: 'wrong-note',
    key,
    mode,
    midis: w.heard,
    correct: w.correct,
    position,
    alt,
    each,
    answer: position,
    choices: Array.from({ length: n - 2 }, (_, i) => i + 2),
    stimulus: [{ kind: 'note', midi: tonic, duration: 0.9 }, { kind: 'rest', duration: 0.3 }, { kind: 'notes', midis: w.heard, each }],
    difficulty,
  };
}

export const WRONG_NOTE_LEVELS: { pool: ModeId[]; each: number; base: number }[] = [
  { pool: ['ionian'], each: 0.5, base: 900 },
  { pool: ['ionian', 'aeolian', 'major-pentatonic', 'minor-pentatonic'], each: 0.45, base: 1050 },
  { pool: ['major-pentatonic', 'minor-pentatonic', 'blues', 'major-blues'], each: 0.42, base: 1150 },
  { pool: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'], each: 0.4, base: 1250 },
  { pool: ['harmonic-minor', 'melodic-minor', 'phrygian-dominant', 'lydian-dominant', 'altered', 'dorian-sharp4', 'mixolydian-b6', 'locrian-sharp2'], each: 0.36, base: 1400 },
  { pool: ['bebop-dominant', 'bebop-major', 'double-harmonic', 'hungarian-minor', 'hirajoshi', 'in-sen', 'whole-tone', 'diminished', 'lydian-augmented', 'ultralocrian'], each: 0.3, base: 1550 },
];

/** "Spot the wrong note", level 1–6: 6 questions. */
export function wrongNotesLesson(level: number, seed = Date.now()): LessonDef {
  const L = WRONG_NOTE_LEVELS[Math.max(0, Math.min(WRONG_NOTE_LEVELS.length - 1, level - 1))];
  const rnd = mulberry32(seed);
  const questions: Question[] = [];
  for (let tries = 0; questions.length < 6 && tries < 200; tries++) {
    const mode = L.pool[Math.floor(rnd() * L.pool.length)];
    const n = MODE_STEPS[mode].length;
    const position = 2 + Math.floor(rnd() * (n - 2));
    const alt: 1 | -1 = rnd() < 0.5 ? 1 : -1;
    const key = pc(MODE_KEYS[Math.floor(rnd() * MODE_KEYS.length)]);
    const q = wrongNoteQuestion(`wn${questions.length + 1}`, key, mode, position, alt, L.each, L.base + (n > 8 ? 60 : 0));
    if (q) questions.push(q);
  }
  return { id: 'wrong-notes', version: 1, skill: 'modes', scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions };
}


// ======================================================================= true or false (as a question)

export function tfQuestion(id: string, item: { trio: { left: PitchClass; mid: PitchClass; right: PitchClass }; shownLeft: string; shownRight: string; truth: boolean; midis: [number, number, number] }, ear: boolean, difficulty = 1100): TFQuestion {
  return {
    id,
    kind: 'tf',
    names: [item.trio.left, item.trio.mid, item.trio.right],
    shownLeft: item.shownLeft,
    shownRight: item.shownRight,
    midis: item.midis,
    ear,
    answer: item.truth ? 'true' : 'false',
    choices: ['true', 'false'],
    stimulus: ear ? [{ kind: 'notes', midis: item.midis, each: 0.6 }] : [],
    difficulty,
  };
}


// ======================================================================= slash chords and bass lines

const SLASH_OTHER = [2, 5, 10]; // D, F, B♭ under C: a 9th, an 11th (sus), a ♭7 in the bass

export function slashQuestion(id: string, root: PitchClass, role: SlashQuestion['role'], otherStep = 2, difficulty = 1200): SlashQuestion {
  const r = placeInRange(pcValue(root), 60, 71);
  const triad = [r, r + 4, r + 7];
  const step = role === 'root' ? 0 : role === 'third' ? 4 : role === 'fifth' ? 7 : otherStep;
  const bassMidi = placeInRange((pcValue(root) + step) % 12, 40, 51);
  const spell = (st: number): PitchClass => {
    // Spell bass notes from the root's major scale (♭7 as a flat).
    const scale = majorScale(root);
    const idx = [0, 2, 4, 5, 7, 9, 11].indexOf(st);
    if (idx >= 0) return scale[idx];
    const seventh = scale[6];
    return { letter: seventh.letter, acc: (seventh.acc - 1) as PitchClass['acc'] };
  };
  const bass = spell(step);
  const options = [0, 4, 7, role === 'other' ? otherStep : SLASH_OTHER[pcValue(root) % SLASH_OTHER.length]].map(spell);
  return {
    id,
    kind: 'slash',
    key: root,
    bass,
    role,
    midis: [bassMidi, ...triad],
    answer: pcKey(bass),
    choices: options.map(pcKey),
    stimulus: [
      { kind: 'note', midi: bassMidi, duration: 0.8 },
      { kind: 'chord', midis: [bassMidi, ...triad], duration: 1.8 },
    ],
    difficulty: difficulty + (role === 'other' ? 80 : 0),
  };
}

/** Bass under a diatonic triad: the chord whose root or third is this bass degree. */
const BASS_CHORD_ROOT: Record<number, number> = { 1: 1, 2: 5, 3: 1, 4: 4, 5: 5, 6: 6, 7: 5 };
export const BASS_LINES: number[][] = [
  [1, 4, 5, 1],
  [1, 6, 4, 5],
  [1, 3, 4, 5],
  [1, 5, 6, 4],
  [1, 7, 6, 5],
  [1, 2, 3, 4, 5],
  [6, 4, 1, 5],
];

/** Hear a progression; name the bass line as degrees (e.g. 1 7 6 5 = I – V6 – vi – V). */
export function bassLineQuestion(id: string, key: PitchClass, degrees: number[], difficulty = 1250): DegreeSeqQuestion {
  const tonic = placeInRange(pcValue(key), 60, 71);
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const scaleMidi = (deg: number, base: number) => base + steps[(deg - 1) % 7] + 12 * Math.floor((deg - 1) / 7);
  const bassBase = tonic - 24;
  const chords = degrees.map((d) => {
    const root = BASS_CHORD_ROOT[d];
    const triad = [root, root + 2, root + 4].map((x) => scaleMidi(x, tonic - 12)).map((m) => (m < tonic - 5 ? m + 12 : m));
    return [scaleMidi(d, bassBase), ...triad];
  });
  return {
    id,
    kind: 'degree-seq',
    key,
    degrees,
    midis: degrees.map((d) => scaleMidi(d, bassBase)),
    bassLine: true,
    choices: [1, 2, 3, 4, 5, 6, 7],
    answer: degrees.join('-'),
    stimulus: [{ kind: 'cadence', key }, ...chords.map((c) => ({ kind: 'chord' as const, midis: c, duration: 1.1 }))],
    difficulty: difficulty + 30 * degrees.length,
  };
}

/** Lesson 23 — slash chords and bass lines: C/E vs C/G vs C/D, then the bass line of a progression. */
export function slashLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const roots = ['C', 'F', 'G', 'D', 'Bb'];
  const roles = shuffle(rnd, ['third', 'fifth', 'other', 'other'] as SlashQuestion['role'][]);
  const qs: Question[] = roles.map((role, i) => slashQuestion(`s${i + 1}`, pc(roots[Math.floor(rnd() * roots.length)]), role, SLASH_OTHER[Math.floor(rnd() * SLASH_OTHER.length)]));
  const lines = shuffle(rnd, [...BASS_LINES]).slice(0, 2);
  lines.forEach((l, i) => qs.push(bassLineQuestion(`b${i + 1}`, pc(['C', 'F', 'G'][i % 3]), l)));
  const C = pc('C');
  const intro: IntroStep[] = [
    ...(['root', 'third', 'fifth'] as const).map((b) => ({ id: `intro-${b}`, card: { kind: 'inversion' as const, root: C, bass: b }, stimulus: inversionQuestion('x', C, b).stimulus })),
    { id: 'intro-bass-line', card: { kind: 'explain', topic: 'bass-line', steps: ['1', '7', '6', '5'] }, stimulus: bassLineQuestion('x', C, [1, 7, 6, 5]).stimulus },
  ];
  return { id: 'slash-chords', version: 1, skill: 'chords', scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro, questions: qs };
}


// ======================================================================= combined dictation (spec S.4)

/** A one-bar melody with a rest-free rhythm at a level: degrees by small steps, rhythm from the rhythm track. */
export function dictationMelody(level: RhythmLevel, seed: number): { degrees: number[]; beats: number[]; rhythmSeed: number } {
  const rnd = mulberry32(seed);
  for (let k = 0; k < 60; k++) {
    const rs = (seed + k * 7919) >>> 0;
    const r = rhythmAt(level, 1, rs);
    const ev = rhythmEvents(r);
    if (ev.some((e) => e.rest) || ev.length < 3 || ev.length > 7) continue;
    let d = pick(rnd, [1, 3, 5]);
    const degrees = ev.map((_, i) => {
      if (i > 0) d = Math.max(1, Math.min(6, d + pick(rnd, [-2, -1, -1, 1, 1, 2])));
      return d;
    });
    const beats = ev.map((e, i) => ((ev[i + 1]?.start ?? r.beatsPerBar * RTPQ) - e.start) / RTPQ);
    return { degrees, beats, rhythmSeed: rs };
  }
  return { degrees: [1, 2, 3, 1], beats: [1, 1, 1, 1], rhythmSeed: seed };
}

/** Lesson 24 — hear a short melody with its rhythm; write its notes (degrees), then its rhythm. */
export function dictationLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = ['C', 'F', 'G'].map(pc);
  const qs: Question[] = [];
  ([1, 2, 3] as RhythmLevel[]).forEach((level, i) => {
    const m = dictationMelody(level, Math.floor(rnd() * 1e9));
    const key = keys[i % keys.length];
    const tonic = placeInRange(pcValue(key), 57, 68);
    const midis = m.degrees.map((d) => tonic + [0, 2, 4, 5, 7, 9, 11][d - 1]);
    const bpm = RHYTHM_BPM[level];
    const melody: Stimulus = { kind: 'melody', midis, beats: m.beats, bpm };
    const pitches = degreeSeqQuestion(`d${i + 1}a`, key, m.degrees, 1150 + 50 * level);
    qs.push({ ...pitches, stimulus: [{ kind: 'cadence', key }, { kind: 'rest', duration: 0.3 }, melody] });
    const rhythm = rhythmDictQuestion(`d${i + 1}b`, level, 1, m.rhythmSeed);
    qs.push({ ...rhythm, stimulus: [melody] });
  });
  const first = qs[0] as DegreeSeqQuestion;
  return {
    id: 'dictation',
    version: 1,
    skill: 'sequences',
    scoring: { xpPerCorrect: 10, attemptLimit: 2 },
    intro: [{ id: 'intro-dictation', card: { kind: 'explain', topic: 'dictation', steps: first.degrees.map(String) }, stimulus: first.stimulus }],
    questions: qs,
  };
}


// ======================================================================= Jazz 2 (licks, swing, melodic minor)

/** Short jazz licks in scale degrees (diatonic), played swung (long–short eighths). */
export const LICKS: { id: string; degrees: number[] }[] = [
  { id: 'scale-up', degrees: [1, 2, 3, 5, 6, 5] },
  { id: 'arpeggio', degrees: [1, 3, 5, 7, 6, 5] },
  { id: 'enclosure', degrees: [4, 2, 3, 1] },
  { id: 'ii-v', degrees: [2, 4, 6, 1, 7, 5] },
  { id: 'turn', degrees: [5, 6, 5, 4, 3, 2, 1] },
  { id: 'approach', degrees: [3, 2, 1, 7, 1] },
];

/** A swung eighth-note line (2:1) as a melody stimulus. */
export function swingMelody(midis: number[], bpm = 132): Stimulus {
  const beats = midis.map((_, i) => (i === midis.length - 1 ? 1 : i % 2 === 0 ? 2 / 3 : 1 / 3));
  return { kind: 'melody', midis, beats, bpm };
}

/** Lesson 25 — Jazz 2: melodic minor by ear, swung licks to write and to sing back. */
export function jazz2Lesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = ['C', 'F', 'Bb', 'G'].map(pc);
  const licks = shuffle(rnd, [...LICKS]);
  const qs: Question[] = [];
  // 1–2: melodic minor vs natural minor vs dorian (the raised 6th and 7th).
  const pool: ModeId[] = ['melodic-minor', 'aeolian', 'dorian'];
  for (let i = 0; i < 2; i++) {
    const mode = i === 0 ? 'melodic-minor' : pick(rnd, pool);
    qs.push(modeIdQuestion(`j${i + 1}`, pick(rnd, keys), mode, shuffle(rnd, [...pool]), 'updown', 0.34, 1300));
  }
  // 3–4: write a swung lick in degrees.
  for (let i = 0; i < 2; i++) {
    const key = keys[i];
    const q = degreeSeqQuestion(`j${i + 3}`, key, licks[i].degrees, 1300 + 30 * licks[i].degrees.length);
    qs.push({ ...q, stimulus: [{ kind: 'cadence', key }, { kind: 'rest', duration: 0.3 }, swingMelody(q.midis)] });
  }
  // 5: sing a swung lick back.
  const key = keys[2];
  const sq = singSeqQuestion('j5', key, licks[2].degrees.slice(0, 5));
  qs.push({ ...sq, stimulus: [{ kind: 'cadence', key }, { kind: 'rest', duration: 0.3 }, swingMelody(sq.midis, 112)] });
  const C = pc('C');
  const tonic = placeInRange(pcValue(C), 57, 68);
  const nat = MODE_STEPS.aeolian.map((x) => tonic + x);
  const mel = MODE_STEPS['melodic-minor'].map((x) => tonic + x);
  return {
    id: 'jazz-2',
    version: 1,
    skill: 'modes',
    scoring: { xpPerCorrect: 12, attemptLimit: 2 },
    intro: [
      { id: 'intro-mm', card: { kind: 'explain', topic: 'melodic-minor', steps: ['1', '2', '♭3', '4', '5', '6', '7'] }, stimulus: [{ kind: 'notes', midis: nat, each: 0.32 }, { kind: 'rest', duration: 0.5 }, { kind: 'notes', midis: mel, each: 0.32 }] },
      { id: 'intro-swing', card: { kind: 'explain', topic: 'swing-lick', steps: LICKS[1].degrees.map(String) }, stimulus: [swingMelody(LICKS[1].degrees.map((d) => tonic + [0, 2, 4, 5, 7, 9, 11][d - 1]))] },
    ],
    questions: qs,
  };
}


// ======================================================================= absolute pitch corner (spec S.11)

const ABS_NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ABS_ALL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A random cluster that wipes the previous note from short-term memory (no relative cue). */
function palateCleanser(rnd: () => number): Stimulus[] {
  const base = 48 + Math.floor(rnd() * 24);
  return [{ kind: 'chord', midis: [base, base + 1, base + 6, base + 11, base + 13], duration: 0.5 }, { kind: 'rest', duration: 0.9 }];
}

export function absNoteQuestion(id: string, name: string, rnd: () => number, pool: string[], difficulty: number, wide = false): AbsNoteQuestion {
  const target = pc(name);
  const lo = wide ? 40 + Math.floor(rnd() * 30) : 52 + Math.floor(rnd() * 8);
  const midi = placeInRange(pcValue(target), lo, lo + 11);
  const others = shuffle(rnd, pool.filter((n) => n !== name)).slice(0, 3);
  const choices = shuffle(rnd, [name, ...others]).map((n) => pcKey(pc(n)));
  return { id, kind: 'abs-note', target, midi, answer: pcKey(target), choices, stimulus: [...palateCleanser(rnd), { kind: 'note', midi, duration: 1.3 }], difficulty };
}

/** Optional absolute-pitch practice: 1 = white keys, 2 = all twelve, 3 = all twelve in any octave, faster. */
export function absoluteLesson(level: number, seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const pool = level === 1 ? ABS_NATURALS : ABS_ALL;
  const qs = Array.from({ length: 6 }, (_, i) => absNoteQuestion(`a${i + 1}`, pick(rnd, pool), rnd, pool, 1200 + 150 * level, level >= 3));
  return { id: 'absolute-pitch', version: 1, skill: 'absolute', scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions: qs };
}

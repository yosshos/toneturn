// Technique drills (spec AI, docs/SPEC-TECHNIQUE.md): the contract between the drill engine and the screens.
// Pure types. Times are in ms; beats are quarter-note beats from the first note (beat 0).

export type Hand = 'R' | 'L';
export type FamilyId =
  | 'scales' // S
  | 'arpeggios' // A
  | 'cadences' // C
  | 'fingers' // F (five-finger, Hanon, trills, repeated notes)
  | 'control' // K (articulation, dynamics, voicing)
  | 'advanced' // X (octaves, double notes, leaps, polyrhythm)
  | 'harris' // H (Barry Harris)
  | 'jazz' // J (shells, rootless, guide tones, patterns)
  | 'voicings' // V (LH voicings and changes)
  | 'accomp' // M (stride, walking, boogie, Alberti)
  | 'custom' // the player's own drills
  // Guitar (docs/SPEC-GUITAR-TECHNIQUE.md): pitches are SOUNDING MIDI; notes carry string / fret.
  | 'g-fretting' // spider / chromatic permutations, stretches, shifts
  | 'g-picking' // alternate, string changes, skipping, tremolo, sweep, hybrid
  | 'g-legato' // hammer-ons, pull-offs, trills, 3NPS legato, tapping
  | 'g-scales' // pentatonic boxes, CAGED positions, 3NPS, modes, one-string, sequences
  | 'g-arps' // triad / 7th arpeggios, CAGED shapes, string-set inversions
  | 'g-chords' // open / barre / power chords, one-minute changes
  | 'g-rhythm' // strumming and rhythm guitar by genre
  | 'g-lead' // slides, bends, vibrato, double stops, harmonics
  | 'g-fingerstyle' // PIMA, Travis, Giuliani, rest / free stroke, tremolo
  | 'g-flamenco' // rasgueado, picado, alzapúa, compás
  | 'g-jazz' // shells, drop 2 / 3, ii–V–I comping, guide tones, walking bass
  | 'g-reading' // reading by position
  | 'g-impro' // target notes over forms
  | 'g-bass'; // bass guitar subset

export type Dyn = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
export type Articulation = 'legato' | 'staccato' | 'portato';
export type DynamicsGoal = 'even-mf' | 'even-p' | 'even-f' | 'even-pp' | 'even-ff' | 'cresc' | 'accent3' | 'accent4' | 'voicing';
export type Variant = 'even' | 'dotted' | 'rev-dotted' | 'groups3' | 'groups4' | 'accent-shift';
export type Motion = 'parallel' | 'contrary' | 'third' | 'sixth' | 'tenth' | 'formula';
export type ScaleType = 'major' | 'harmonic' | 'melodic' | 'natural' | 'chromatic' | 'mixolydian' | 'bebop-dom' | 'six-dim' | 'blues' | 'pentatonic';
export type KeyOrder = 'chromatic-up' | 'chromatic-down' | 'fifths-up' | 'fifths-down' | 'difficulty';

/** One expected note of a drill. */
export interface ExpNote {
  pitch: number;
  /** Onset in beats from the start (beat 0 = first note). */
  beat: number;
  /** Written length in beats. */
  dur: number;
  hand: Hand;
  /** Suggested finger 1–5 (help only, never graded). */
  finger?: number;
  /** Notes sharing a chordId sound together (blocked chords, octaves, hands together). */
  chordId?: number;
  /** Louder than its neighbours (accent / melody / voicing top note). */
  accent?: boolean;
  /** Chord tone of the current harmony (Barry Harris, improvisation checks). */
  chordTone?: boolean;
  /** Guitar / bass: string (1 = highest-sounding) and fret (0 = open). */
  string?: number;
  fret?: number;
  /** Guitar: index-finger fret of the hand position this note is played in (fingering help). */
  pos?: number;
  /** Guitar: how the note is produced (help + analysis hints; pick direction is never graded). */
  technique?:
    | 'pick'
    | 'hammer'
    | 'pull'
    | 'slide'
    | 'bend'
    | 'prebend'
    | 'release'
    | 'vibrato'
    | 'tap'
    | 'harmonic'
    | 'mute'
    | 'dead'
    | 'strum-down'
    | 'strum-up'
    | 'rest-stroke'
    | 'free-stroke'
    | 'rasgueado';
  /** Guitar: bend / pre-bend amount above the fretted pitch (cents: 100 = half step, 200 = whole step). */
  bendCents?: number;
  /** Guitar: picking-hand stroke (help only): pick down / up, or the finger p i m a c (c = little finger / pick+fingers). */
  stroke?: 'D' | 'U' | 'p' | 'i' | 'm' | 'a' | 'c';
}

/** What a drill is: everything needed to generate its notes. */
export interface DrillSpec {
  family: FamilyId;
  /** Stable id of the drill kind inside the family, e.g. "scale", "hanon-1", "h2-dominant-from-3", "custom:abc". */
  kind: string;
  /** Tonic pitch class 0–11. */
  key: number;
  scale?: ScaleType;
  minor?: boolean;
  hands: 'R' | 'L' | 'RL';
  motion?: Motion;
  octaves?: 1 | 2 | 3 | 4;
  articulation?: Articulation;
  dynamics?: DynamicsGoal;
  variant?: Variant;
  /** Notes per beat (2 = eighths, 4 = sixteenths, 3 = triplets). */
  perBeat?: number;
  /** Swing the eighths (jazz families). */
  swing?: boolean;
  /** Inversion / chord tone to start from / level-specific option. */
  option?: number;
  /** Instrument of the drill (default piano; guitar families imply guitar / bass). */
  instrument?: 'piano' | 'guitar' | 'bass';
  /** Guitar: tuning id from fretboard.ts TUNINGS (default 'standard' / 'bass'). */
  tuning?: string;
  /** Guitar: position / shape option (e.g. pentatonic box 1–5, CAGED shape 0–4, 3NPS pattern 0–6). */
  position?: number;
  /** Guitar: the drill needs a stretch wider than one finger per fret. */
  stretch?: boolean;
}

/** A generated drill: the notes to play and how it is judged. */
export interface Drill {
  /** Songs (songDrills.ts): chord names per bar, shown above the staff as a chart. */
  chart?: string[];
  spec: DrillSpec;
  /** Stable id of this item (family + kind + key + hands + motion + options): progress is stored per item. */
  itemId: string;
  title: { en: string; he: string };
  notes: ExpNote[];
  /** Length in beats (the take ends one beat after). */
  beats: number;
  /** Beats per bar (count-in = one bar). */
  meter: number;
  /** Key signature for the staff (major-key tonic name like 'Eb', or 'C' for none). */
  keySig: string;
  /** What "good" means for this drill. */
  goal: DrillGoal;
  /** Suggested starting tempo (♩ bpm) when the item is new. */
  startBpm: number;
}

export interface DrillGoal {
  /** Evenness matters (scales, patterns). */
  evenness: boolean;
  /** Hands together matter (HT). */
  hands: boolean;
  /** Target dynamics (velocity band / shape), if any. */
  dynamics?: DynamicsGoal;
  articulation?: Articulation;
  /** Chord tones must land on the beats (Barry Harris family). */
  chordTonesOnBeats?: boolean;
  /** Voicing / chord correctness instead of exact pitches (voicing families): allowed pitch classes per chordId. */
  chordSets?: { chordId: number; required: number[]; allowed: number[] }[];
  /**
   * Pedalling drills (spec AI §5.6): the sustain-pedal plan, for the CC64 analysis. `changes` = beats where the harmony
   * changes. Direct pedal: down with the chord, up before the next; legato (syncopated): up at the change, down just after.
   */
  pedal?: { style: 'direct' | 'legato'; changes: number[] };
}

/** A note the player played (latency already removed; times relative to beat 0 of the drill). */
export interface PlayedNote {
  pitch: number;
  on: number;
  off: number | null;
  vel: number;
}

/** Per-device calibration (spec AI §2): latency and the player's velocity range. */
export interface DrillCalibration {
  latencyMs: number;
  velMin: number;
  velMax: number;
}

export type Verdict = 'clean' | 'almost' | 'not';

export interface NoteResult {
  exp: ExpNote;
  played: PlayedNote | null;
  /** Onset deviation vs the click (ms), + = late. */
  dev: number | null;
  /** IOI ratio to the hand's median IOI (glitch when > 1.15). */
  ioiRatio?: number;
  ok: boolean;
}

/** Everything measured in one take (spec AI §6). Missing metrics are null (not applicable to the drill). */
export interface TakeMetrics {
  bpm: number;
  nps: number;
  accuracy: number;
  wrong: number;
  missing: number;
  timingMean: number | null;
  timingSD: number | null;
  /** IOI CV per hand (0..1). */
  cvR: number | null;
  cvL: number | null;
  /** Hands together: mean signed Δ (RH − LH) and mean |Δ| in ms. */
  handsMean: number | null;
  handsAbs: number | null;
  /** Max onset spread inside chords (ms). */
  chordSpread: number | null;
  velSD: number | null;
  velMean: number | null;
  /** Share of notes inside the target band (0..1). */
  bandHit: number | null;
  /** Crescendo: velocity slope per note and R². */
  slope: number | null;
  r2: number | null;
  /** Accented − other velocity (accents / voicing). */
  accentGap: number | null;
  /** Legato key overlap (ms, median) and duration ratio (median). */
  kot: number | null;
  kdr: number | null;
  hesitations: number;
  /** Indices (into notes) of thumb-passage / crossing glitches. */
  glitches: number[];
  /** Share of beats with a chord tone where required. */
  chordToneOnBeats: number | null;
  /** Voice-leading distance (voicing families). */
  voiceLeading: number | null;
  perNote: NoteResult[];
  verdict: Verdict;
  /** The one-line reason (worst factor), EN / HE. */
  why: { en: string; he: string };
  /** Pedalling drills (MIDI CC64): changes done right / total. */
  pedal?: { ok: number; total: number; pass: boolean };
}

/** Progress of one item (synced, small). */
export interface ItemState {
  itemId: string;
  family: FamilyId;
  key: number;
  hands: 'R' | 'L' | 'RL';
  /** Highest tempo (♩) of a clean take. */
  cleanBpm: number;
  /** Today's goal tempo. */
  goalBpm: number;
  /** Clean takes in a row at the goal. */
  streak: number;
  /** Failed sets in a row. */
  fails: number;
  /** Smoothed metrics. */
  ewma: { cv: number; sd: number; vsd: number; hands: number; acc: number };
  takes: number;
  last: string;
  /** Tempo history (date, clean bpm) for the trends. */
  history: { at: string; bpm: number; cv: number }[];
}

/** The player's own drill (spec AI §12 owner request): a pattern in scale degrees, run through every key. */
export interface CustomDrill {
  id: string;
  name: string;
  /** Scale the degrees refer to. */
  scale: ScaleType;
  /** The pattern: scale degree (1 = tonic; 8 = tonic an octave up; may be negative for below), length in beats, hand; chromatic alteration −1/0/+1. */
  pattern: { deg: number; alt?: -1 | 0 | 1; dur: number; hand: Hand }[];
  /** Repeat the pattern moving up the scale by step this many times (a sequence, like Hanon), then back down. */
  sequenceSteps: number;
  hands: 'R' | 'L' | 'RL';
  createdAt: string;
  // ── v2 (drill creator 2, custom.ts). All optional: a drill without them runs exactly as before. ──
  /** Shape version: 2 = the fields below may be present. */
  v?: 2;
  /** Per-note extras, parallel to `pattern` (same index; null = none): rest, accent, staccato, guitar technique / bend. */
  marks?: ({ rest?: boolean; acc?: boolean; stac?: boolean; tech?: ExpNote['technique']; bend?: number } | null)[];
  /** Independent left-hand pattern (handsMode 'independent'), in degrees from the LH tonic an octave below. */
  lh?: CustomDrill['pattern'];
  lhMarks?: CustomDrill['marks'];
  /** How the hands play (overrides `hands` + mixed-hand patterns): one hand, both in octaves, contrary motion, or an independent LH row. */
  handsMode?: 'R' | 'L' | 'octaves' | 'contrary' | 'independent';
  /** Sequence direction (default up-and-down), step in scale steps (1 = by step, 2 = by 3rd, 3 = by 4th), octaves 1–4. */
  direction?: 'up' | 'down' | 'updown';
  step?: 1 | 2 | 3;
  octaves?: 1 | 2 | 3 | 4;
  /** Only these tonics (0–11); absent = all 12 in the player's key order. */
  keys?: number[];
  /** Minor tonality (key names / order from A). */
  minor?: boolean;
  /** A scale beyond ScaleType (overrides `scale` for the pitches; `scale` stays as a fallback for old readers). */
  mode?: 'dorian' | 'phrygian' | 'lydian' | 'locrian' | 'altered' | 'whole-tone' | 'dim-hw' | 'dim-wh' | 'harmonic-major';
  /** Start tempo (♩) and the goal tempo the ladder climbs toward. */
  startBpm?: number;
  goalBpm?: number;
  dynamics?: DynamicsGoal;
  /** What is graded (absent = evenness on, hands when two hands, dynamics when a dynamics goal is set). */
  grade?: { evenness?: boolean; hands?: boolean; dynamics?: boolean };
  /** Include in Today / the daily workout / the path (absent = yes). */
  inToday?: boolean;
  inWorkout?: boolean;
  inPath?: boolean;
  /** Guitar / bass: the pattern on the neck. Tonic on `rootString` (default 6 guitar / 4 bass), allowed strings, wide stretch. */
  instrument?: 'piano' | 'guitar' | 'bass';
  tuning?: string;
  rootString?: number;
  strings?: number[];
  stretch?: boolean;
  /** Copied from a built-in drill (its kind), for reference. */
  from?: string;
}

/** Drills settings (spec AI, owner Q2 / Q5 / Q6 / Q7). */
export interface DrillSettings {
  showFingering: boolean;
  keyOrder: KeyOrder;
  /** Continuous practice: after a clean take raise the tempo (auto) or move on to the next key / drill. */
  continuous: 'off' | 'raise-tempo' | 'next-key' | 'next-drill';
  /** Accuracy (0..1) and evenness needed for the continuous step. */
  continuousAccuracy: number;
  emphasis: 'both' | 'classical' | 'jazz';
  inPath: boolean;
  inWorkout: boolean;
  /** Instrument of the Drills hub (default piano). */
  instrument?: 'piano' | 'guitar' | 'bass';
  /** Guitar: genre filter (like the piano emphasis); 'all' or absent = every family. */
  guitarStyle?: 'all' | 'rock' | 'blues' | 'metal' | 'pop' | 'funk' | 'country' | 'jazz' | 'classical' | 'fingerstyle' | 'flamenco' | 'reggae' | 'latin';
  /** Guitar: what the drill shows — tab, notation, or both (default tab). */
  guitarView?: 'tab' | 'staff' | 'both';
  /** Guitar: show the picking-hand strokes (↓ ↑, p i m a) under the tab instead of the fretting fingers. */
  showPicking?: boolean;
}
export const DEFAULT_DRILL_SETTINGS: DrillSettings = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true };

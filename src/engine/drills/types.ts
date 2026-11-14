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
  | 'k-ear' // the pianist's ear: hear it, play it back on the keys (PIANO_AUDIT §3)
  // PIANO_JAZZ (2026-11-10): Barry Harris harmony (6th-diminished), bebop lines over forms and trading, jazz-piano harmony.
  | 'k-sixdim'
  | 'k-bebop'
  | 'k-reharm'
  // AUDIT-CONTENT-THEORY §ז.2: first steps at the piano — posture, finger numbers, C position, the thumb passing under.
  | 'k-first'
  | 'custom' // the player's own drills
  // Licks & transcription (docs/SPEC-LICKS-TRANSCRIPTION.md): lick items per key / instrument, transcribed phrases.
  | 'licks'
  | 'transcribe'
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
  // GUITAR_DEEPENING (2026-11-11): the guitarist's ear, Barry Harris on the neck, prog / fusion.
  | 'g-ear' // call and response, answered on the guitar
  | 'g-harris' // Barry Harris applied to guitar (barry.ts)
  | 'g-prog' // odd meters, polyrhythm, metric modulation, fusion lines, unisons (prog engine)
  | 'g-bass' // bass guitar subset (the 0.4x starter family; kept so old progress ids stay valid)
  // Bass course (docs/research/BASS_CURRICULUM.md §5, F1–F14): instrument bass, pitches SOUNDING MIDI.
  | BassFamilyId
  // Drums course (docs/research/DRUMS_CURRICULUM.md §4, v1 = F1–F5, F9, F14): pitches are the GM drum notes of the voices.
  | DrumFamilyId;

export type DrumFamilyId = 'd-strokes' | 'd-rolls' | 'd-diddles' | 'd-time' | 'd-rock' | 'd-fills' | 'd-read' | 'd-funk' | 'd-shuffle' | 'd-indep' | 'd-mideast' | 'd-feet' | 'd-ear' | 'd-jazz' | 'd-latin'
  // DRUMS_NICHE_PLAN (P1): songs and song forms, prog / fusion, and reading / theory played on the kit.
  | 'd-song' | 'd-prog' | 'd-count' | 'd-notation' | 'd-form';
/** A drum voice (DRUMS_CURRICULUM §3): what a hit is, whatever note the kit sends for it. */
export type DrumVoice = 'kick' | 'snare' | 'rim' | 'hihat' | 'hhOpen' | 'hhPedal' | 'ride' | 'crash' | 'tom1' | 'tom2' | 'tom3';
/** The limb that plays a drum note (sticking R / L stays in `hand`; feet are RF / LF). */
export type Limb = 'RH' | 'LH' | 'RF' | 'LF';

export type BassFamilyId =
  | 'b-pluck'
  | 'b-fret'
  | 'b-length'
  | 'b-time'
  | 'b-pocket'
  | 'b-ghost'
  | 'b-chord'
  | 'b-scale'
  | 'b-walk'
  | 'b-slap'
  | 'b-legato'
  | 'b-pick'
  | 'b-read'
  | 'b-styles'
  // 0.66: reading in positions (electric) and fills / solos on target notes.
  | 'b-posread'
  | 'b-impro'
  // BASS_NICHE_PLAN P1: the jazz track (swing time, Barry Harris, form, Afro-Cuban) and the prog track (odd meters,
  // riffs and unisons, polymeter and metric modulation).
  | 'b-swing'
  | 'b-barry'
  | 'b-jform'
  | 'b-latin'
  | 'b-odd'
  | 'b-prog'
  | 'b-poly'
  // BASS_NICHE_PLAN P2: the graded standards ladder (jazz track) and extended techniques (both tracks).
  | 'b-std'
  | 'b-ext'
  // 0.64 (track B): the bass-ear family F15 and the upright / double-bass track (BASS_CURRICULUM §5, §5.1).
  | 'b-ear'
  | 'b-up-pos'
  | 'b-up-arco'
  | 'b-up-scales'
  | 'b-up-pizz'
  | 'b-up-walk'
  | 'b-up-read';

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
  /**
   * PIANO_JAZZ (trading fours): a landing inside the player's free bars — any of these pitch classes (the chord's tones),
   * any octave, near this beat. The written pitch is only the model line's note.
   */
  land?: number[];
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
  // ---- drums (0.65): pitch = the voice's GM note; `hand` = the sticking (R / L) ----
  /** Drums: the voice to hit. */
  voice?: DrumVoice;
  /** Drums: the limb (help + per-limb timing). */
  limb?: Limb;
  /** Drums: a ghost note (soft, in the player's ghost band). */
  ghost?: boolean;
  /** Drums: the dynamic of this stroke (three-level drills). */
  dyn?: 'p' | 'mf' | 'f';
  /** Drums: first / second stroke of a double (the second must be ≥ goal.drum.ratio × the first). */
  dbl?: 1 | 2;
  /** Drums: grace notes before this stroke by the other hand — 1 = flam, 2 = drag (ruff). Not separate notes: the take's grace hits are measured against this one (goal.drum.flam). */
  grace?: 1 | 2;
  /** Drums: a swung skip note (jazz ride): judged by the swing ratio (goal.drum.swing), not against the triplet grid. */
  swing?: boolean;
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
  /** Instrument of the drill (default piano; guitar families imply guitar / bass; 'd-' families drums). */
  instrument?: 'piano' | 'guitar' | 'bass' | 'drums';
  /** Guitar: tuning id from fretboard.ts TUNINGS (default 'standard' / 'bass'). */
  tuning?: string;
  /** Guitar: position / shape option (e.g. pentatonic box 1–5, CAGED shape 0–4, 3NPS pattern 0–6). */
  position?: number;
  /** Guitar: the drill needs a stretch wider than one finger per fret. */
  stretch?: boolean;
  /** Suggested start tempo (♩) for a new item (bass levels: the level's start tempo). Not part of the item id. */
  tempo?: number;
  /**
   * GUITAR_DEEPENING §2.2: this item's own target tempo (♩), preferred over the level's range — items of one level whose
   * natural tempo differs (reggae / ska, the flamenco palos). Equal to `tempo` = off the ladder (an untimed ring check,
   * harmonics, vibrato): it passes on 3 clean takes on 2 days at its start. Not part of the item id.
   */
  target?: number;
}

/** A generated drill: the notes to play and how it is judged. */
export interface Drill {
  /** Sung, not played (licks on the voice course): the microphone hears a voice, graded with the voice's timing tolerance (VOICE_TIMING). */
  sung?: boolean;
  /** Songs (songDrills.ts): chord names per bar, shown above the staff as a chart. */
  chart?: string[];
  /** Chart drills, improv mode (owner 2026-11-08): notes at or above this pitch are the free right hand — not graded. */
  freeAbove?: number;
  spec: DrillSpec;
  /** Stable id of this item (family + kind + key + hands + motion + options): progress is stored per item. */
  itemId: string;
  title: { en: string; he: string };
  notes: ExpNote[];
  /** Length in beats (the take ends one beat after). */
  beats: number;
  /** Metronome after the count-in (bass time drills): every beat (default), only 2 and 4, only the off-beats, only beat 1, or a click that fades out. */
  click?: 'all' | '24' | 'and' | 'one' | 'fade' | 'gap';
  /** Drums time drills (click 'gap'): bars with the click, then bars without, repeating (e.g. [2, 2], [1, 3]). */
  gap?: [number, number];
  /** Beats per bar (count-in = one bar). */
  meter: number;
  /** Key signature for the staff (major-key tonic name like 'Eb', or 'C' for none). */
  keySig: string;
  /** What "good" means for this drill. */
  goal: DrillGoal;
  /** Suggested starting tempo (♩ bpm) when the item is new. */
  startBpm: number;
  // ---- added by the bass content track (B), 0.64: all optional, a drill without them runs as before ----
  /** B5: drums under the take (a GROOVES id), heard only with headphones / line-in / MIDI (else the click); bars in `fills` get a drum fill. */
  drums?: {
    groove: string;
    fills?: number[];
    /** Feel changes (pocket L7): from bar `bar` (0-based) on, the drums play `groove` (e.g. 8 bars in time, then 8 half-time). */
    sections?: { bar: number; groove: string }[];
  };
  /**
   * The harmony band under the take (bassBand.ts): the band engine's comping over `chart` in `style`, on the take's
   * clock. Like the drums it plays only with headphones / line-in / MIDI (else the click); it never changes the measure.
   */
  band?: { style: import('../band').BandStyle; /** Drums course: a bass line under the comping too (roots on the groove's kick, a walking line in swing). */ bass?: boolean; /** Beat ranges where the band lays out (a drum solo while trading 4s). */ rests?: [number, number][]; /** Road map: from bar `bar` (the band's bars) on, the band plays `style` ('tacet' = lays out, e.g. a drum solo; 'stop' = stop-time: one short hit on each 1). */ sections?: { bar: number; style: import('../band').BandStyle | 'tacet' | 'stop' }[] };
  /** Quick Study Piece (RSL): seconds to study the score before Play opens (the player may start sooner). */
  prep?: number;
  /** Written transcription after the take (ear L7): the line's sounding pitches, entered on the neck and graded note for note. */
  write?: { pitches: number[] };
  /**
   * B11 ear drills: what the band plays inside the take (beats from beat 0). The player answers in the other bars;
   * onsets inside `windows` (the band's bars) are ignored, so a speaker's sound is never taken for the answer.
   */
  listen?: { notes: { beat: number; dur: number; midi: number[]; inst?: 'bass' | 'piano'; perc?: import('../lesson').PercKind; vel?: number }[]; windows: [number, number][]; ask: { en: string; he: string } };
  /**
   * Drums ear (d-ear): after the take, write what was heard — a step grid per voice (dictation), or pick the style's
   * name. Graded like the bass transcription (withWritten): it can only lower the take's verdict.
   */
  drumWrite?: { kind: 'grid'; sub: number; beats: number; lanes: { voice: DrumVoice; steps: boolean[] }[] } | { kind: 'pick'; options: { en: string; he: string }[]; answer: number };
  /** Eighth-pulse meters (pulse 8): the beat groups of a bar in eighths (9/8 = 2+2+2+3); the click sounds on each group's first eighth and the staff beams by group. */
  groups?: number[];
  /** B3 / B10 / B11: what the score shows — notation only (reading), only the chord chart (free choice; a model line is opt-in), or nothing until the result (ear). */
  show?: 'staff' | 'chart' | 'none';
  /** B3: with show 'chart', the notes before this beat are written out (written bars, then free bars). */
  freeFrom?: number;
  /** B7: eighth-note meters (7/8, 10/8): one drill beat is an eighth and the tempo counts eighths (♪ = bpm). */
  pulse?: 8;
  /** B10: untimed note naming — one note at a time, each answered within maxMs. */
  untimed?: { maxMs: number };
  /** B16 upright track: bowed (arco) or plucked (pizz). */
  bow?: 'arco' | 'pizz';
  /** Drums: what the drill needs and how it is shown (DRUMS_CURRICULUM §3.8, §4.1). */
  drum?: DrumDrillInfo;
  // ---- the prog / band engine (docs/research/PROG_ENGINE.md): all optional; a drill without them runs as before ----
  /**
   * Meter per bar (mixed meters, groupings): from each change's bar on, bars are in its meter. `meter` stays the
   * FIRST bar's length in drill beats (the count-in). Build with timeline.ts `withBarPlan`.
   */
  meters?: import('./timeline').MeterChange[];
  /** Tempo map (metric modulation): from each change's bar on, tempo = the tempo before × ratio. The take's bpm is the first bar's. */
  tempoMap?: import('./timeline').TempoChange[];
  /** Polymeter: the band (drums + comping) counts its own bars in this meter (e.g. band in 4/4, the riff in 7/8); same beat clock. */
  bandMeter?: import('./timeline').MeterSpec;
  /** The band doubles a written line with the player (a unison riff), separate from the comping. */
  unison?: UnisonPart;
  /** A road map: named sections driving the band (style, feel, stops), measured per section (roadmap.ts). */
  form?: import('./roadmap').FormPlan;
  /**
   * GUITAR_DEEPENING §6 (closed-set chord recognizer): per chord of the drill, in order, the candidates the player may
   * have strummed and the index of the right one. The microphone's chroma names the chord among them (any voicing);
   * a wrong chord is "not", an unclear one asks to play it again. Without chroma it is not measured.
   */
  recognize?: { candidates: { root: number; quality: import('../chordRecognize').ChordQuality; bass?: number }[]; answer: number }[];
}

/** A unison part: the band's bass / guitar / keys play `line` (or the drill's own notes moved by `transpose`). */
export interface UnisonPart {
  inst: 'bass' | 'guitar' | 'keys';
  /** The written line (drill beats); absent = the drill's notes. */
  line?: { beat: number; dur: number; midi: number }[];
  /** Semitones added to the line (−12 = an octave below, −5 = a 5th below for 5th-below unisons). */
  transpose?: number;
  /** Velocity 0..1 (default 0.7). */
  vel?: number;
}

/** Drums: per-drill facts — the verdict tier, whether one surface (a practice pad by microphone) can play it. */
export interface DrumDrillInfo {
  /** Verdict tier (§4.1): 1 = beginner (L1–3), 2 = intermediate (L4–7), 3 = advanced (L8+). */
  tier: 1 | 2 | 3;
  /** One surface only (snare / pad): the microphone can measure it. Grooves and fills need MIDI. */
  mic: boolean;
  /** Show the sticking under the staff (tom fills with sticking marks); shown only, never graded. */
  sticking?: boolean;
  /** Our own transcription of a traditional pattern not yet checked by a teacher (mambo, songo, Mozambique): a note on the take. */
  teacherCheck?: boolean;
  /** An acoustic kit by microphone can measure this drill (games outside ACOUSTIC_LEVELS: drums told apart by sound). */
  acousticOk?: boolean;
  /** Swung skip notes (written on the triplet) are drawn as straight 8ths under a "Swing" marking. */
  swing8?: boolean;
  /**
   * Road map above the score (drill.form): 'live' lights the current section and cues the next one bar ahead;
   * 'written' shows the chart's signs (repeats, endings, D.S. al coda) and the bar count only — the player follows them.
   */
  roadmap?: 'live' | 'written';
  /** The written chart for 'written' road maps: one label per written block, in reading order ("‖: Verse", "1.", "D.S. al Coda"). */
  chartSigns?: string[];
  /** Tremolo slashes (reading): written as one head with `slashes` strokes over [beat, beat + dur); the notes are the strokes played. */
  trem?: { beat: number; dur: number; slashes: 1 | 2 | 3 }[];
  /** Repeat-bar signs (bar indices drawn as %) and multi-bar rests (first bar, number of bars) in the notation. */
  repeatBars?: number[];
  mbRests?: { bar: number; n: number }[];
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
  /** Bass measures on top of pitch + timing (bassAnalyze.ts); each can only lower the verdict. */
  bass?: BassGoal;
  /** Drum measures on top of per-limb timing (drumAnalyze.ts); each can only lower the verdict. */
  drum?: DrumGoal;
  /**
   * PIANO_JAZZ: free bars (trading fours with the band). Inside `windows` (beats) the player plays their own line: it
   * is not matched note for note. The written notes there are landings (ExpNote.land); the other notes played must sit
   * in the chord's scale or approach the next note by a half step (`scale`, pitch classes per stretch of beats), and
   * there must be at least `minPerBar` notes a bar. `model` is a line that passes (the band's style; tests play it).
   */
  /** The prog engine's measures (progAnalyze.ts `withProg`); each can only lower the verdict. */
  prog?: ProgGoal;
  free?: { windows: [number, number][]; scale: { from: number; to: number; pcs: number[] }[]; minPerBar: number; model: { beat: number; dur: number; pitch: number; /** Guitar: where the model's note sits (tab). */ string?: number; fret?: number }[] };
}

/** Prog pass rules (PROG_ENGINE.md): metric modulation, unison lock, the road map. Absent fields are not checked. */
export interface ProgGoal {
  /** Tempo changes: the played tempo ratio within this share of the written one (0.02 = ±2 %), and the new 1 within ±landMs. */
  tempoRatio?: { tol: number; landMs?: number };
  /** Unison with the band: |mean offset| ≤ mean ms and SD ≤ sd ms against the band's line (12 / 18). */
  unison?: { mean: number; sd: number };
  /** Road map: lost bars allowed (0), the section starts landed within ±landMs, tempo drift across the form ≤ drift (0.02). */
  form?: { lost?: number; landMs?: number; drift?: number };
  /** Accent on the group starts (odd meters): the group-start notes louder than the others by ≥ this share of the velocity range. */
  groupAccent?: number;
}

/** Drum pass rules (DRUMS_CURRICULUM §4.2): absent = the tier's timing / hit-rate / wrong-voice rules only. */
export interface DrumGoal {
  /** Velocity CV across the take ≤ this (even strokes, e.g. 0.15). */
  velCv?: number;
  /** R / L velocity balance: |mean R − mean L| / mean ≤ this (e.g. 0.1). */
  balance?: number;
  /** Notes marked `dyn` land in their band (p / mf / f, from the calibration): share ≥ this. */
  levels?: number;
  /** Accent gap ≥ this share of the player's soft → loud range (e.g. 0.35). */
  accentGap?: number;
  /** Taps (unaccented) velocity CV ≤ this. */
  tapCv?: number;
  /** Accents on the right notes (and only there): share ≥ this. */
  accentPos?: number;
  /** Ghost notes inside the ghost band: share ≥ this. */
  ghost?: number;
  /** Doubles: the second stroke ≥ this × the first (share of doubles ≥ 0.85). */
  ratio?: number;
  /** Hi-hat open / closed on the right steps (open-hat notes open, the others closed). */
  hat?: boolean;
  /** Landing after fills: the crash + kick on these beats within ±ms. */
  landing?: { beats: number[]; ms: number };
  /** Gap-click bars: the mean offset of the hits in the silent bars within ±ms. */
  gapMs?: number;
  /**
   * Flams and drags (MIDI only): share of grace-note strokes in spec ≥ this — the grace hit(s) of the same drum 15–40 ms
   * before the main stroke (a drag's two graces inside 80 ms) and softer than it; the flam gaps' SD ≤ 8 ms.
   */
  flam?: number;
  /** Swing (jazz ride): the skip note's place inside the beat (0.5 straight … 0.75 dotted) has a median in [lo, hi] and an SD ≤ 0.07. */
  swing?: { lo: number; hi: number };
  // ---- DRUMS_NICHE_PLAN P1 (d-prog, d-song): the drum rules the prog engine left open ----
  /**
   * Linear grooves (d-prog 7): no two limbs together. Two played hits of different drums within `ms` of each other where
   * the part writes a single note count as a coincidence; their share of the hits must stay ≤ `max` (⚙ 15 ms, 0).
   */
  linear?: { ms: number; max: number };
  /** Accent positions judged on these voices only (an accented hi-hat line over kick and snare: d-prog 2–3). */
  accentVoices?: DrumVoice[];
  /**
   * Polyrhythm between limbs (d-prog 5): the played tempo of lane `a` against lane `b` (median played ÷ written IOI of
   * each lane) must match within `tol` (the written ratio is built in: 3:2 played as 3:2 gives 1).
   */
  poly?: { a: DrumVoice[]; b: DrumVoice[]; tol: number };
  /**
   * Songs (d-song, d-form): every section of `drill.form` with ≥ `section` of its notes on time; the fill zones
   * (beat ranges before section starts) with ≥ `fill` of their notes played; the dynamics arc — the median velocity of
   * the `hi` beat ranges ≥ `ratio` × that of the `lo` ranges (⚙ 1.15).
   */
  song?: { section: number; fills?: [number, number][]; fill?: number; arc?: { lo: [number, number][]; hi: [number, number][]; ratio: number }[]; /** Tempo drift per section (least-squares, sections of ≥ 2 bars) ≤ this (⚙ 0.02). */ drift?: number };
  /** Metric modulation (d-prog 6, 10): at each change of the tempo map, the played ratio (two bars each side, least squares) within ±tol of the written one. */
  modulation?: { tol: number };
  // ---- DRUMS_NICHE_PLAN P2 (the rest of the curriculum, §6.3) ----
  /**
   * Crescendo / decrescendo (d-strokes 7): in each zone of beats [from, to) the velocity's least-squares line rises
   * (dir 1) or falls (dir −1), with R² ≥ `r2` and a rise over the zone ≥ `range` × the soft → loud span (⚙ 0.8, 0.5).
   */
  swell?: { zones: { from: number; to: number; dir: 1 | -1 }[]; r2: number; range: number };
  /**
   * The pocket (d-time 8, d-funk 8): notes expected `ms` off the grid (+ = behind the beat) — per zone of beats, or only
   * on some voices (the lazy snare), else every note. The share of those notes within ±`tol` ms of their target must
   * be ≥ `share` (⚙ 8 ms, 0.7); the other timing rules are judged against the target too.
   */
  pocket?: { ms?: number; voices?: DrumVoice[]; zones?: { from: number; to: number; ms: number }[]; tol: number; share: number };
  /** Endurance (d-rolls 9, d-rock 9, d-feet 7): the timing SD of the last third ≤ (1 + rise) × the first third's, and the tempo over the take (least squares) within ±drift. */
  endure?: { rise: number; drift: number };
  /**
   * Two feet on one pad (double pedal, d-feet 6–8): the notes of `voices` alternate feet, which the kit can't tell apart
   * — so odd against even strokes: |Δ mean velocity| / mean ≤ `vel`, and the CV of their gaps (played ÷ written) ≤ `cv`.
   */
  alt?: { voices: DrumVoice[]; vel: number; cv: number };
  /** Improvised zones (d-fills 9): beat ranges with nothing written, where at least `min` hits (any drums) must be played. */
  impro?: { zones: [number, number][]; min: number };
  /**
   * Crash chokes (drumChoke.ts): each crash at these beats grabbed before `by` beats pass. Measured only when the kit
   * sends chokes (polyphonic aftertouch, 0xA0 — Roland and others); a kit that sends none is never failed for it.
   */
  choke?: { beats: number[]; by: number };
  /**
   * The foot splash, not a chick (drumSplash.ts, d-feet 5): the written pedal notes (`beats`, else every hi-hat pedal
   * note) played as a splash on ≥ `share` of them. MIDI only; measured when the kit sends a splash note or CC4.
   */
  splash?: { beats?: number[]; share: number };
}

/** Bass-specific pass rules (BASS_CURRICULUM §4–§5). Absent = the default pitch + timing rule only. */
export interface BassGoal {
  /** Even fingers / strokes: odd vs even notes, |Δ IOI| ≤ ms and |Δ loudness| ≤ dB. */
  asym?: { ms: number; db: number };
  /** Loudness SD across the take ≤ dB (even plucking). */
  loudSd?: number;
  /** String-crossing penalty ≤ ms (mean |offset| on crossing notes − on same-string notes). */
  crossing?: number;
  /** Every note must line up with the kick (the line is the kick lane): ±ms window, share ≥ 0.9. */
  kick?: number;
  /** Note lengths: each note's release must match its written class (short / full), share ≥ 0.85. */
  lengths?: boolean;
  /** Ghost notes ≥ dB quieter than the pitched notes. */
  ghostDb?: number;
  // ---- 0.64 (BASS_AUDIT §5): shared contract between the measurement track (A) and the content track (B) ----
  /** Expected dead notes must be unpitched/short and pitched notes pitched: share ≥ this (e.g. 0.9). */
  ghostClass?: number;
  /**
   * Free-choice line judged by rules instead of note for note (A5); the chart the rules read. target (0.66): scale
   * tones anywhere, and on every chord change a landing note — one of `land` (intervals above the root) when given,
   * else a chord tone (`tones` then holds the chord scale).
   */
  rules?: {
    kind: 'walk' | 'chordTones' | 'nearest' | 'target' | 'downbeatCt';
    chart: { chord: string; root: number; tones: number[]; beats: number; land?: number[] }[];
    maxRepeat?: number;
    maxMove?: number;
    /** downbeatCt (Barry Harris): the downbeats are every `every` beats (1 = each beat in an 8th line, 2 = beats 1 and 3 of a quarter walk). */
    every?: number;
    /** target: each chord's landing sounds this many beats EARLY (0.5 = an 8th: the anticipated "and" of 4 in a tumbao). */
    anticipate?: number;
    /** target: a note outside the scale passes when the next note is at most this many semitones away (enclosures, chromatic passing). */
    passing?: number;
  };
  /** Walking swing (b-swing): long quarters (each ≥ `long` × the beat, e.g. 0.85), placement vs the ride (ms, + = behind) in [lo, hi], drift over choruses ≤ `drift` (tempo share, e.g. 0.02). */
  swingWalk?: { long?: number; ride?: [number, number]; drift?: number; chorusBeats?: number };
  /** Double-stops / shells by chroma (b-ext 6–7): share of chords ringing all their notes ≥ this (e.g. 0.8). */
  doubleStops?: number;
  /** Pocket on purpose (A6): target offset per section in ms (+ = behind), share within ±12 ms ≥ 0.7. */
  pocket?: number[];
  /** Mean offset |timingMean| ≤ ms (no consistent rush/drag). */
  meanMs?: number;
  /** Silence before a shifted note ≤ ms (A8). */
  shiftGap?: number;
  /** IOI CV drift first vs last 2 bars ≤ ratio (stamina, A8). */
  drift?: number;
  /** Tempo drift with a sparse click (time L6): |offset slope| ≤ ms per bar (A8). */
  barDrift?: number;
  /** Landing after the drummer's fills (pocket L8): the downbeat after each fill bar within ±ms (B5). */
  landing?: number;
  /** Swing ratio target and tolerance (A8), 8ths or 16ths. */
  swing?: { ratio: number; tol: number; sub: 8 | 16 };
  /** Per-subdivision bias |mean| ≤ ms for each of these positions (A8). */
  subBias?: number;
  /** Note-length suite (A9): ring-through on rests allowed per 8 bars, release ±ms, overlap ≤ ms. */
  release?: { ms: number };
  ringThrough?: number;
  overlap?: number;
  /** Intonation (fretless / upright, B16): |cents| ≤ this on ≥ 85 % of notes. */
  cents?: number;
  /** Advice only, never gates: slap/pop class shown to the player (A13). */
  slapAdvice?: boolean;
  // ---- added by track A (A12) ----
  /** Plucking zone (A12): the second half (bridge) must be brighter than the first (neck): centroid ratio ≥ this (e.g. 1.2). */
  zone?: number;
  // ---- added by the content track (B), 0.64 ----
  /**
   * B5: the drum kick lane under the take, as beats from beat 0 of the drill (the drums play only with headphones /
   * line-in / MIDI; the lane is the same either way). Kick lock compares bass onsets with THESE, not with the written notes.
   */
  kickLane?: number[];
}

/** Free-choice rule verdict (A5), per slot of the model line (TakeMetrics.rules). */
export interface TakeRules {
  kind: 'walk' | 'chordTones' | 'nearest' | 'target' | 'downbeatCt';
  /** downbeatCt: share of the downbeats played on a chord tone. */
  downbeat?: number;
  /** target with `anticipate`: share of chord changes whose landing came early (on the anticipation). */
  anticipated?: number;
  /** Per slot: R / 3 / 5 / 7 / tension / chromatic / dominant / scale / other, or '-' when nothing was played. */
  labels: string[];
  /** Per slot: the note is allowed by the rules (false for a missing note). */
  valid: boolean[];
  /** Valid share of the played slots (0..1). */
  validShare: number;
  /** Chord changes that land on a chord tone (0..1). */
  beat1Ct: number;
  /** Share of notes repeating the note before (0..1). */
  repeats: number;
  /** N6: share of neighbours with the same pitch class (octave jumps included), and of played notes that aren't the root. */
  pcRepeats?: number;
  nonRoot?: number;
  /** Moves ≤ maxMove semitones (nearest), else null. */
  moves: number | null;
  /** The bar with the most invalid notes and its first invalid slot: the one-line "Why?" pointer (bar 0-based). */
  worst: { slot: number; bar: number; beatInBar: number; chord: string; label: string } | null;
}

/** Level meta for bass (0.64): exam / bagrut mapping shown on the level and used by badges (B14). */
export interface LevelExamTag {
  board: 'RSL' | 'Trinity' | 'ABRSM' | 'Bagrut' | 'Berklee';
  grade: string;
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
  /** Piano by microphone (PIANO_AUDIT A2): what the goal needs that the mic can't measure — the take doesn't count. */
  unmeasured?: ('dynamics' | 'articulation' | 'pedal')[];
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
  /** Most notes were played exactly this many semitones off (±12, ±24): the keyboard is shifted by octaves. */
  octaveShift?: number;
  /** Pedalling drills (MIDI CC64): changes done right / total. */
  pedal?: { ok: number; total: number; pass: boolean };
  /** Free-choice drills (goal.bass.rules, A5): per-slot labels and the worst bar for the "Why?" line. */
  rules?: TakeRules;
  /** Written transcription (ear L7): notes written right / total. */
  written?: { ok: number; total: number };
  /** Drums (drumAnalyze.ts): per-limb timing, wrong voices, dynamics, hat, landing. */
  drum?: DrumMetrics;
  /** The prog engine (progAnalyze.ts): tempo-ratio checks, unison lock, the road-map report. */
  prog?: import('./progAnalyze').ProgMetrics;
}

/** What a drum take measured (DRUMS_CURRICULUM §3.6). */
export interface DrumMetrics {
  /** Per limb: mean signed offset (+ = late), SD, notes matched / expected. */
  limbs: { limb: Limb; mean: number | null; sd: number | null; n: number; of: number }[];
  /** Per voice: mean offset and notes matched / expected (for the one-line feedback). */
  voices: { voice: DrumVoice; mean: number | null; n: number; of: number }[];
  /** Hits inside the window / expected notes. */
  hitRate: number;
  /** Hits on another voice where a note was due (share of expected notes). */
  wrongVoice: number;
  /** Extra hits (no note due). */
  extra: number;
  /** The tier's window (ms) used for this take. */
  windowMs: number;
  velCv: number | null;
  balance: number | null;
  levels: number | null;
  accentGap: number | null;
  tapCv: number | null;
  accentPos: number | null;
  ghost: number | null;
  ratio: number | null;
  /** Open-hat steps played open, closed steps played closed (shares). */
  hatOpen: number | null;
  hatClosed: number | null;
  /** Landing offsets after each fill (ms, null = no crash / kick there). */
  landing: (number | null)[];
  /** Mean offset in the silent click bars. */
  gapMean: number | null;
  /** Flams / drags in spec (share), the flam gap mean and SD (ms). */
  flam?: number | null;
  flamGap?: number | null;
  flamSd?: number | null;
  /** Swing: median skip-note place in the beat and its SD. */
  swing?: number | null;
  swingSd?: number | null;
  /** The rules missed (ids), for the "Why?" expander. */
  missed: string[];
  /** Acoustic kit by microphone: share of the matched notes whose drum was not told apart (absent otherwise). */
  unsure?: number;
  /** Linear grooves: coincidences (two limbs together where one note is written) as a share of the hits. */
  coincide?: number | null;
  /** Polyrhythm: |played lane ratio ÷ written − 1|. */
  polyErr?: number | null;
  /** Songs: per section (play order) the share on time and the median velocity; fill zones played; arc ratios. */
  song?: { sections: { name: string; hit: number; vel: number | null; /** Played ÷ written tempo (> 1 = rushing). */ tempo?: number }[]; fills: number | null; arc: (number | null)[] };
  /** Metric modulation: per tempo change, played ratio ÷ written − 1 (> 0 = the new tempo too fast; 9 = not measured). */
  modErr?: number[];
  /** Swell zones: R² of the velocity line and its rise over the zone (share of the soft → loud span, signed by the zone's direction). */
  swell?: { r2: number | null; rise: number | null }[];
  /** Pocket: share of the pocket notes within ±tol of their target, and their mean offset from the grid (ms). */
  pocket?: number | null;
  pocketMean?: number | null;
  /** Endurance: SD rise last third ÷ first third − 1, and the played ÷ written tempo over the take. */
  endure?: { rise: number | null; tempo: number | null };
  /** Double pedal: odd / even velocity gap (share of the mean) and the gaps' CV. */
  alt?: { vel: number | null; cv: number | null };
  /** Improvised zones: hits played in each. */
  impro?: number[];
  /** Crash chokes: grabbed in time / asked; measured false = the kit sent no choke at all. */
  choke?: { ok: number; of: number; measured: boolean };
  /** Foot splashes played as splashes / written; measured false = the kit sent no splash note and no CC4. */
  splash?: { ok: number; of: number; measured: boolean };
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
  // ---- 0.64 level pass (BASS_AUDIT A4); absent on older items ----
  /** The level's target tempo for this item (♩); the ladder's goal stops here ("level tempo reached"). */
  targetBpm?: number;
  /** Clean takes that count toward the level (at or above the goal, never after "Slower"): time and tempo, newest last. */
  passLog?: { at: string; bpm: number }[];
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
  instrument?: 'piano' | 'guitar' | 'bass' | 'drums';
  /** Drums: notation (percussion staff) or lanes (default notation). */
  drumView?: 'staff' | 'lanes';
  /** Guitar: genre filter (like the piano emphasis); 'all' or absent = every family. */
  /** Piano by microphone only (0.67, owner): levels that need MIDI (loudness, release, pedal) are hidden. */
  pianoMicOnly?: boolean;
  /** Bass (BASS_NICHE_PLAN): the track the jazz / prog families open by — jazz, prog or both (absent = both). */
  bassTrack?: 'jazz' | 'prog' | 'both';
  guitarStyle?: 'all' | 'rock' | 'blues' | 'metal' | 'pop' | 'funk' | 'country' | 'jazz' | 'classical' | 'fingerstyle' | 'flamenco' | 'reggae' | 'latin';
  /** Guitar: what the drill shows — tab, notation, or both (default tab). */
  guitarView?: 'tab' | 'staff' | 'both';
  /** Guitar: show the picking-hand strokes (↓ ↑, p i m a) under the tab instead of the fretting fingers. */
  showPicking?: boolean;
  /**
   * Guitar (GUITAR_DEEPENING §5, owner 2026-11-11): the core path is always on; these add-ons add their families and
   * levels. Absent = migrated from the old `guitarStyle` (guitar.ts guitarAddOnsOf). The bass course still reads guitarStyle.
   */
  guitarAddOns?: GuitarAddOn[];
}
/** Guitar add-ons (tick boxes): jazz (g-jazz, g-harris, impro 5–6, bossa / Freddie Green), flamenco, fingerstyle / classical, prog / fusion. */
export type GuitarAddOn = 'jazz' | 'flamenco' | 'fingerstyle' | 'prog';
export const DEFAULT_DRILL_SETTINGS: DrillSettings = { showFingering: true, keyOrder: 'fifths-up', continuous: 'off', continuousAccuracy: 0.95, emphasis: 'both', inPath: true, inWorkout: true };

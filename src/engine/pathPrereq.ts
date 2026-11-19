// Curriculum-flow prerequisite tables (owner 2026-11-19: no step uses a concept that no earlier step taught; one new
// idea at a time). Merged from the three audits (docs/research/CURRICULUM-AUDIT-EAR-JAZZ.md R2/R5,
// CURRICULUM-AUDIT-INSTRUMENTS.md R5/R6/R9, CURRICULUM-AUDIT-VOICE-DRUMS.md R4/R5/R6/R10). Pure data; path.ts reads it.
//
// Semantics (path.ts): a prerequisite on the player's path must be passed first (below EARLY_PREREQ_BELOW in an
// earlier unit). A prerequisite that lives in another course is scheduled in this course as a bridge step (same step
// id); one that no course of this player can offer never blocks.

/** Ear: harmony on numerals, chords, scales / modes / keys, rhythm notation (Ear audit R2). */
const EAR: Record<string, string[]> = {
  // Harmony on numerals: the cadence lesson ("V7 → I", "I – vi – IV – V") after the degrees and the chord qualities.
  'lesson:cadences': ['lesson:degrees-135', 'lesson:major-minor'],
  'topic:where-home:1': ['lesson:cadences'],
  'topic:cadence-types:1': ['lesson:cadences'],
  'topic:function-ear:1': ['lesson:cadences'],
  'topic:harmonize:1': ['topic:function-ear:1'],
  'topic:nashville:1': ['lesson:cadences'],
  'topic:grid-dictation:1': ['topic:triads:1', 'lesson:cadences'],
  'topic:bass-dictation:1': ['lesson:cadences'],
  'topic:harmonic-dictation:1': ['topic:function-ear:1'],
  'topic:next-chord:1': ['topic:function-ear:1'],
  'topic:roman-numerals:1': ['lesson:cadences'],
  'topic:figured-bass:1': ['lesson:inversions', 'topic:roman-numerals:1'],
  'topic:voice-leading:1': ['topic:roman-numerals:1'],
  'topic:chorale-rn:1': ['topic:roman-numerals:1'],
  // Chords: the diminished triad before the m7♭5 / dim7; inversions before the steps that name them.
  'topic:seventh-chords:1': ['topic:triads:1'],
  'topic:chord-member:2': ['lesson:inversions'],
  'topic:triads:4': ['lesson:inversions'],
  'topic:seventh-chords:4': ['lesson:inversions'],
  'topic:chord-read:4': ['lesson:slash-chords'],
  'topic:extensions:1': ['topic:seventh-chords:1'],
  'topic:voicings:1': ['lesson:inversions', 'topic:seventh-chords:1'],
  'topic:borrowed-ext:1': ['topic:progressions:3', 'topic:seventh-chords:1'],
  // Scales, modes, keys.
  'topic:degrees-ext:1': ['topic:scale-types:1'],
  'topic:modal-cadence:1': ['topic:modes-ear:2'],
  'topic:degrees-ext:3': ['topic:modes-ear:1'],
  'topic:melodic-transform:4': ['topic:modes-ear:1'],
  'topic:scale-spelling:5': ['topic:modes-ear:1'],
  'topic:modulation:3': ['topic:key-signatures:1'],
  'topic:key-centres:1': ['topic:modulation:2'],
  'topic:modulation-means:1': ['topic:modulation:1'],
  'topic:interval-spelling:1': ['topic:interval-number:1'],
  'topic:sight-read:1': ['topic:note-reading:1'],
  'topic:figure-out:1': ['lesson:degrees-135'],
  // Rhythm notation: each rhythm-building level after the lesson that teaches its rhythms.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`topic:rhythm-build:${n}`, [`lesson:rhythm-r${n}`]])),
  'topic:rhythm-errors:1': ['lesson:rhythm-r1'],
  'topic:rhythm-transform:1': ['lesson:rhythm-r2'],
  'topic:displacement:2': ['lesson:rhythm-r3'],
  'topic:time-signatures:1': ['topic:note-values:1'],
  'topic:odd-meter:1': ['topic:time-signatures:1'],
  'topic:prog-meter:1': ['topic:odd-meter:1'],
  'topic:metric-tap:1': ['topic:click-subdivide:2'],
};

/**
 * Jazz: the entry gate — 7th-chord colours and ii–V–I (lesson:jazz-1) before the topics built on them. The on-ramp
 * (blues-ear, swing-ratio, call-response, comping 1–2, comp-rhythm-ear) stays open before it.
 */
const JAZZ_GATED = ['guide-tones', 'guide-line', 'voicing-type', 'chart-analysis', 'jazz-changes', 'chord-scale', 'ct-degree', 'bh-family', 'bh-three-dim', 'bh-pivot-arp', 'chromatic-added', 'modal-mix', 'pedal-ear', 'jazz-phrase', 'jazz-form', 'turnarounds'];
const JAZZ: Record<string, string[]> = {
  ...Object.fromEntries(JAZZ_GATED.map((t) => [`topic:${t}:1`, ['lesson:jazz-1']])),
  'topic:comping:3': ['lesson:jazz-1'],
  // Barry Harris, in the order of docs/BARRY-HARRIS-THEORY.md: §1 the three diminished chords → §2 the brothers and
  // §3 the m6 family → §6 the ladder: the scales → harmonization (6 or dim?, blocks) → borrowing → the eight
  // expressions of one dominant (the 4 brothers + the 4 m6s). §8–§9 line devices run on the scale; §10 moves after the
  // diminished conversions.
  'topic:bh-convert:1': ['topic:bh-three-dim:1'],
  'topic:bh-convert-2:1': ['topic:bh-convert:1'],
  'topic:bh-brothers:1': ['topic:bh-convert:1'],
  'topic:bh-keys:1': ['topic:bh-brothers:1'],
  'topic:bh-dim-roles:1': ['topic:bh-convert:1'],
  'topic:bh-family:1': ['topic:bh-three-dim:1'],
  'topic:bh-m6-bass:1': ['topic:bh-family:1'],
  'topic:bh-six-over:1': ['topic:bh-family:1'],
  'topic:bh-scale:1': ['topic:bh-brothers:1', 'topic:bh-family:1'],
  'topic:bh-tone:1': ['topic:bh-scale:1'],
  'topic:bh-block:1': ['topic:bh-tone:1'],
  'topic:bh-borrow:1': ['topic:bh-block:2'],
  'topic:bh-sixfive:1': ['topic:bh-brothers:1', 'topic:bh-m6-bass:1', 'topic:bh-borrow:1'],
  'topic:bh-lines:1': ['topic:bh-scale:1'],
  'topic:bh-line-ear:1': ['topic:bh-scale:1'],
  'topic:bh-pivot:1': ['topic:bh-scale:1'],
  'topic:bh-moves:1': ['topic:bh-convert-2:1'],
  'topic:bh-tesseract:1': ['topic:bh-moves:1'],
  // Substitutions and colours: the tritone sub and the backdoor (jazz-changes 2) before the steps that ask for them.
  'topic:jazz-chains:1': ['topic:jazz-changes:2'],
  'topic:reharm-spot:1': ['topic:jazz-changes:2'],
  'topic:reharm-own:1': ['topic:reharm-spot:1'],
  'topic:jazz-dictation:1': ['topic:jazz-changes:1'],
  'topic:pent-super:1': ['topic:chord-scale:1'],
  'topic:triad-pairs:1': ['topic:chord-scale:1'],
  'topic:chord-scale:3': ['lesson:jazz-2'],
  'topic:upper-rootless:1': ['topic:voicing-type:3'],
  'topic:polychords:1': ['topic:extensions:2'],
  // Licks and transcription (measured steps): the ii–V–I vocabulary after the lesson that names it.
  'licks:jazz:1': ['lesson:jazz-1'],
  'transcribe:jazz:4': ['lesson:jazz-1'],
};

/** Keys, guitar, bass: measured steps after the levels that teach their concepts (Instruments audit R5). */
const INSTRUMENTS: Record<string, string[]> = {
  'licks:keys:1': ['tech:jazz-1'],
  'licks:guitar:1': ['tech:g-jblues-3'],
  'licks:bass:1': ['tech:b-impro-6'],
  'transcribe:keys:6': ['tech:k-vocab-2'],
  'transcribe:keys:9': ['tech:voicings-3'],
  'transcribe:guitar:6': ['tech:g-bebop-2'],
  'transcribe:bass:6': ['tech:b-bebop-1'],
};

/** Voice and drums (Voice-Drums audit R4). Ladder-to-ladder waits live in LADDER_WAITS below. */
const VOICE_DRUMS: Record<string, string[]> = {
  'lesson:sing-names': ['lesson:basics-voice'],
  'topic:sight-tap:1': ['vocal:401'],
  'licks:voice:1': ['vocal:2304', 'vocal:1101'],
  'transcribe:voice:1': ['vocal:1203', 'lesson:sing-home-five'],
  'topic:drum-read:1': ['tech:d-notation-2', 'tech:d-rock-2'],
  'topic:drum-style:1': ['tech:d-jazz-1', 'tech:d-latin-1'],
};

export const FLOW_PREREQ: Record<string, string[]> = { ...EAR, ...JAZZ, ...INSTRUMENTS, ...VOICE_DRUMS };

/**
 * Ladder levels that wait for a level of another family (path.ts LADDER_AFTER): never a later level of the same
 * family (ladderPrev would deadlock, Voice-Drums audit R10).
 */
export const LADDER_WAITS: Record<string, string[]> = {
  // Keys (Instruments audit R9, K1, K3, K4, K8, K9): sight-reading after the first reading level; the four Harris
  // diminished scales after the 6th-diminished scale; guide-tone lines after the voice-leading guide tones; 7th-chord
  // voicings and shells after the maj7 / m7 / ø7 arpeggios. (The walking-bass LH, accomp-2, no longer waits for
  // k-vocab-2: it opens with its own lesson on approach notes, walk-approach, since 2026-11-19.)
  'tech:control-11': ['tech:k-read-1'],
  'tech:k-sharm-2': ['tech:harris-1'],
  'tech:jazz-1': ['tech:k-vl-3'],
  'tech:voicings-2': ['tech:arpeggios-7'],
  'tech:k-lh-4': ['tech:arpeggios-7'],
  // Guitar (G3): target-note improvising over forms after the jazz-blues comping. Reading by position (G5, L6) after
  // the first rhythm reading, which opens with the rhythm lesson (first-rhythms).
  'tech:g-impro-1': ['tech:g-jblues-4'],
  'tech:g-reading-1': ['tech:g-first-8'],
  // Bass (B3, L6): the bass clef after the first rhythm reading from the staff (first-rhythms).
  'tech:b-read-1': ['tech:b-first-8'],
  // Voice (Voice-Drums audit R4): the blues / scat and pop improvising after "on the click" (and the pitch basics);
  // Barry Harris lines after standards and scat have begun (VOICE_LATER intent).
  'vocal:2301': ['vocal:1101'],
  'vocal:2311': ['vocal:1101', 'vocal:7'],
  'vocal:301': ['vocal:1401', 'vocal:1501'],
  // Drums (R4, R10): snare dictation after reading quarters / 8ths / rests; the four new symbols after flams; the rock
  // family after the first-steps rock beat (the same groove, not twice in a row).
  'tech:d-ear-3': ['tech:d-read-1'],
  'tech:d-notation-3': ['tech:d-diddles-5'],
  'tech:d-rock-1': ['tech:d-first-5'],
};

/** Unit games and bonus games: the step that teaches the game's concept first (every course). */
export const FLOW_GAME_PREREQ: Record<string, string[]> = {
  // Instruments (R6): the alternatives are per instrument; ids off the player's path are ignored.
  whichbrother: ['tech:harris-8', 'topic:bh-brothers:1'],
  elevator: ['tech:harris-13', 'tech:g-harris-2'],
  compcaller: ['tech:k-comp-1', 'tech:g-jblues-4', 'topic:comping:1'],
  voicingsprint: ['tech:voicings-3'],
  guidetone: ['tech:jazz-1', 'tech:g-jblues-3', 'tech:b-impro-6', 'topic:guide-tones:1'],
  enclosure: ['tech:k-vocab-2', 'tech:g-bebop-2', 'tech:b-bebop-1', 'topic:jazz-phrase:3'],
  staffrunner: ['topic:key-read:1'],
  walkchanges: ['tech:b-walk-4'],
  rootsear: ['tech:g-ear-6', 'tech:b-ear-3'],
  // Voice and drums (Voice-Drums audit R5).
  harmonyhold: ['vocal:201'],
  singinterval: ['topic:sing-intervals:1'],
  runcatcher: ['lesson:runs'],
  'odd-echo': ['tech:d-count-3'],
  namegroove: ['tech:d-shuffle-2', 'tech:d-funk-1', 'tech:d-latin-1'],
  'ghost-control': ['tech:d-funk-1'],
  'rudiment-rush': ['tech:d-diddles-1'],
  kitread: ['tech:d-notation-2'],
  land: ['tech:d-fills-1'],
  'groove-echo': ['tech:d-ear-4'],
  // Jazz bonus games (Ear-Jazz audit R5).
  reharm: ['topic:reharm-spot:1'],
  'rush-voicing': ['topic:voicing-type:1'],
  'rush-standard': ['lesson:jazz-1'],
  call5432: ['lesson:jazz-1'],
  // The keys bonus: Barry Harris in time after the 6th-diminished scale; polyrhythms after the drums' polyrhythm level.
  bhtime: ['tech:harris-1'],
  polylock: ['tech:d-prog-5', 'tech:advanced-2'],
  riffecho: [],
  'rush-scale': ['topic:scale-types:1'],
};

/** Repertoire steps: the concept they play first (Voice-Drums audit R6); the item's own topic ways are added in path.ts. */
export const REP_PREREQ: Record<string, string[]> = {
  'rep:drums:shuffle': ['tech:d-shuffle-2'],
  'rep:drums:slow-blues': ['tech:d-shuffle-3'],
  'rep:drums:swing-ride': ['tech:d-jazz-1'],
  'rep:drums:swing-standard': ['tech:d-jazz-2', 'tech:d-form-4'],
  'rep:drums:bossa': ['tech:d-latin-1'],
  'rep:drums:jazz-waltz': ['tech:d-jazz-6'],
  'rep:drums:samba': ['tech:d-latin-2'],
  'rep:drums:up-tempo': ['tech:d-jazz-7'],
  'rep:drums:trading': ['tech:d-jazz-8'],
  'rep:drums:odd-9': ['tech:d-mideast-7'],
  'rep:drums:odd-7': ['tech:d-count-3'],
  'rep:voice:guide-tones': ['vocal:1502'],
  'rep:voice:saints-jazz': ['vocal:1104'],
  'rep:voice:swing-low-jazz': ['vocal:1104'],
  'rep:voice:scat-landing': ['vocal:1503'],
};

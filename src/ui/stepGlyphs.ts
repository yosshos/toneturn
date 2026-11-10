// The symbol of every path step (moved out of Path.tsx in the final bass check so tests can read it): technique and
// vocal families, instrument topics and the games that sit in a unit.
import type { GlyphKind } from './Glyph';

/** A ladder level's symbol (0.64, owner: every technique / vocal family its own, like the ear course's steps). */
export const FAMILY_GLYPH: Record<string, GlyphKind> = {
  scales: 'scales', arpeggios: 'chords', cadences: 'prog', fingers: 'keys', control: 'tempo', advanced: 'scales', harris: 'improv', voicings: 'chords', jazz: 'prog', accomp: 'rhythm',
  'g-fretting': 'fingers1234', 'g-picking': 'pick', 'g-legato': 'slur', 'g-scales': 'box', 'g-arps': 'arp', 'g-chords': 'chordbox', 'g-rhythm': 'strum', 'g-lead': 'bend', 'g-fingerstyle': 'pima', 'g-flamenco': 'fan', 'g-jazz': 'prog', 'g-reading': 'sight', 'g-impro': 'improv', 'g-bass': 'bass',
  // Bass (final check): 21 families, 21 symbols — the electric and the upright track share one path on an upright.
  'b-pluck': 'pluck', 'b-time': 'tempo', 'b-fret': 'fingers', 'b-chord': 'chords', 'b-scale': 'scales', 'b-length': 'mute', 'b-pocket': 'groove', 'b-read': 'bass', 'b-styles': 'record', 'b-ghost': 'ghost', 'b-walk': 'walk', 'b-legato': 'slur', 'b-pick': 'pick', 'b-slap': 'slap', 'b-ear': 'ear', 'b-up-pos': 'shift', 'b-up-arco': 'bow', 'b-up-scales': 'ladder', 'b-up-pizz': 'pizz', 'b-up-walk': 'improv', 'b-up-read': 'sight',
  'd-strokes': 'sticks', 'd-rolls': 'rudiment', 'd-diddles': 'paradiddle', 'd-time': 'pulse', 'd-rock': 'hihat', 'd-fills': 'fill', 'd-read': 'drumread',
  'd-funk': 'ghost', 'd-shuffle': 'shuffle', 'd-indep': 'limbs', 'd-mideast': 'darbuka', 'd-feet': 'kick',
  'd-ear': 'drumear', 'd-jazz': 'ride', 'd-latin': 'clave',
  'v-ladder': 'sing', 'v-modes': 'scales', 'v-sight': 'sight', 'v-harmony': 'chords', 'v-ornament': 'contour', 'v-barry': 'improv',
};
/** Instrument topics (they all used to share one chord icon). */
export const TOPIC_GLYPH: Record<string, GlyphKind> = {
  'key-notes': 'keys', 'fret-notes': 'guitar', 'string-notes': 'guitar', 'fret-chords': 'chords', 'play-back': 'echo', 'fret-intervals': 'intervals', 'fret-scales': 'scales', 'song-play': 'contour',
  // Drums (DRUMS_AUDIT I4): kit reading on the drums path.
  'drum-read': 'drumread',
  'pan-ear': 'mixer', 'space-ear': 'echo', 'eq-ear': 'eq', 'filter-ear': 'eq', 'dyn-ear': 'tempo', 'tone-hz': 'tune', 'width-ear': 'mixer',
  'bass-notes': 'name', 'bass-shapes': 'intervals',
};
/** Games sitting in a unit (they all used to be one puzzle piece). */
export const GAME_STEP_GLYPH: Record<string, GlyphKind> = {
  'rush-interval': 'intervals', 'rush-chord': 'chords', 'rush-progression': 'prog', highway: 'rhythm', melodypuzzle: 'puzzle', nametune: 'name', flight: 'sing', 'rush-note': 'sight', 'rush-keysig': 'theory', 'rush-fretboard': 'fretboard', peakhunter: 'eq', drills: 'scales',
};

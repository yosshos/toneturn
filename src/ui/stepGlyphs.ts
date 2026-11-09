// Path step symbols (0.64, owner: every step in every course its own glyph). Pure data, shared by the path and tests.
import type { GlyphKind } from './Glyph';

/** A ladder level's symbol (0.64, owner: every technique / vocal family its own, like the ear course's steps). */
export const FAMILY_GLYPH: Record<string, GlyphKind> = {
  scales: 'scales', arpeggios: 'chords', cadences: 'prog', fingers: 'keys', control: 'tempo', advanced: 'scales', harris: 'improv', voicings: 'chords', jazz: 'prog', accomp: 'rhythm',
  'g-fretting': 'fingers1234', 'g-picking': 'pick', 'g-legato': 'slur', 'g-scales': 'box', 'g-arps': 'arp', 'g-chords': 'chordbox', 'g-rhythm': 'strum', 'g-lead': 'bend', 'g-fingerstyle': 'pima', 'g-flamenco': 'fan', 'g-jazz': 'prog', 'g-reading': 'sight', 'g-impro': 'improv', 'g-bass': 'bass',
  'b-pluck': 'bass', 'b-time': 'tempo', 'b-fret': 'scales', 'b-chord': 'chords', 'b-scale': 'scales', 'b-length': 'rhythm', 'b-pocket': 'groove', 'b-read': 'sight', 'b-styles': 'groove', 'b-ghost': 'ghost', 'b-walk': 'contour', 'b-legato': 'contour', 'b-pick': 'tempo', 'b-slap': 'rhythm', 'b-ear': 'intervals', 'b-up-pos': 'scales', 'b-up-arco': 'sing', 'b-up-scales': 'scales', 'b-up-pizz': 'bass', 'b-up-walk': 'contour', 'b-up-read': 'sight',
  'd-strokes': 'sticks', 'd-rolls': 'rudiment', 'd-diddles': 'paradiddle', 'd-time': 'pulse', 'd-rock': 'hihat', 'd-fills': 'fill', 'd-read': 'drumread',
  'd-funk': 'ghost', 'd-shuffle': 'shuffle', 'd-indep': 'limbs', 'd-mideast': 'darbuka', 'd-feet': 'kick',
  'v-ladder': 'sing', 'v-modes': 'scales', 'v-sight': 'sight', 'v-harmony': 'chords', 'v-ornament': 'contour', 'v-barry': 'improv',
};
/** Instrument topics (they all used to share one chord icon). */
export const TOPIC_GLYPH: Record<string, GlyphKind> = {
  'key-notes': 'keys', 'fret-notes': 'guitar', 'string-notes': 'guitar', 'fret-chords': 'chords', 'play-back': 'echo', 'fret-intervals': 'intervals', 'fret-scales': 'scales', 'song-play': 'contour',
  // Drums (DRUMS_AUDIT I4): kit reading on the drums path.
  'drum-read': 'drumread',
  'pan-ear': 'mixer', 'space-ear': 'echo', 'eq-ear': 'eq', 'filter-ear': 'eq', 'dyn-ear': 'tempo', 'tone-hz': 'tune', 'width-ear': 'mixer',
};

// Curriculum audit 2026-11-19 (CURRICULUM-AUDIT-INSTRUMENTS R7, -VOICE-DRUMS R2, -EAR-JAZZ F13/F25): every path step
// opens with its teaching screen where one exists. Existing, verified lessons only — nothing new is written here; this
// file only says which lesson opens which step. A level key ("tech:<level>") opens at that level; a family key
// ("tech:<family>") opens at the first level of the family the player meets. Keys that another file already maps win
// (this map is spread first in units.ts), so nothing that was wired before changes.

import { FAMILY_LESSON } from './guitar';
import { VL_LEVEL_LESSON } from './voiceLead';

export const UNITS: Record<string, string> = {
  // The guitar (and key-change, heads) family lessons used to open only from the family page in Technique.
  ...Object.fromEntries(Object.entries(FAMILY_LESSON).map(([f, id]) => [`tech:${f}`, id])),
  // Voice leading as a performed skill: one lesson per stage of k-vl / g-vl.
  ...Object.fromEntries(Object.entries(VL_LEVEL_LESSON).map(([lv, id]) => [`tech:${lv}`, id])),

  // ---- Keys
  'tech:scales': 'key-scales', // the major-scale pattern, sharps one by one
  'tech:scales-19': 'modes', // Dorian: the first mode on the scale ladder
  'tech:arpeggios': 'key-shapes', // triads, inversions as shapes
  'tech:arpeggios-4': 'seventh-types', // dominant 7th
  'tech:arpeggios-5': 'seventh-types', // diminished 7th
  'tech:cadences': 'roman-numerals', // I–IV–V–I named by step
  'tech:cadences-2': 'cadences', // V7 → I, the full stop
  'tech:control-11': 'keys-sight-reading', // the first sight-reading level of the control family
  'tech:k-ear': 'degrees-135', // one note in the key: home, 3rd, 5th
  'tech:k-ear-3': 'intervals',
  'tech:k-ear-7': 'roman-numerals', // harmonise with I, IV, V
  'tech:voicings': 'vl-triads', // triads I–IV–V, smooth
  'tech:voicings-2': 'seventh-types',
  'tech:voicings-3': 'guide-tones', // shells ii–V–I: the 3rd and 7th
  'tech:voicings-4': 'upper-rootless', // rootless A / B
  'tech:jazz': 'guide-tones', // jazz lines open on guide tones ii–V–I
  'tech:harris': 'bh-scale', // the 6th-diminished scale
  'tech:k-pop': 'first-chord-symbols', // block chords from symbols, the pop LH
  'tech:k-bebop': 'vocab-lines',
  'tech:k-sixdim': 'key-sixdim',
  'tech:accomp-2': 'bass-blues-walk', // walking bass: roots, chord tones, approach

  // ---- Guitar
  'tech:g-chords': 'fret-chords', // chord boxes, open shapes
  'tech:g-chords-3': 'seventh-types',
  'tech:g-rhythm': 'first-strum',
  'tech:g-scales': 'fret-scales', // the box, the position
  'tech:g-scales-14': 'modes',
  'tech:g-ear-6': 'roman-numerals',
  'tech:g-impro': 'progressions', // blues and ii–V–I named by numerals
  'tech:g-arps': 'triad-types',
  'tech:g-reading': 'note-reading',

  // ---- Bass
  'tech:b-chord': 'chord-members', // root, 3rd and 5th
  'tech:b-chord-6': 'seventh-types',
  'tech:b-scale': 'bass-scales',
  'tech:b-scale-4': 'modes',
  'tech:b-ear': 'basics-pitch', // higher or lower
  'tech:b-ear-3': 'roman-numerals',
  'tech:b-pocket-3': 'swing-ratio', // the shuffle feel
  'tech:b-time': 'note-values',
  'tech:b-riff': 'first-riff',
  'tech:b-walk': 'bass-blues-walk',
  'tech:b-up-walk': 'bass-blues-walk',
  'tech:b-read': 'note-reading', // the bass clef
  'tech:b-posread': 'note-reading',
  'tech:b-up-read': 'note-reading',

  // ---- Drums (CURRICULUM-AUDIT-VOICE-DRUMS R2)
  'tech:d-time': 'first-sticks', // counting 1 e & a
  'tech:d-rock': 'first-rock',
  'tech:d-diddles': 'drum-paradiddle',
  'tech:d-feet': 'drum-feet',
  'tech:d-pas-1': 'drum-buzz',
  'tech:d-read': 'note-values', // quarters, 8ths, rests
  'tech:d-shuffle': 'rhythm-r6', // triplets
  'tech:d-jazz': 'swing-ratio', // the swung ride
  'tech:d-mideast': 'eastern-rhythm', // dum and tak, maqsum, malfuf

  // ---- Topics with no mini-lesson of their own (EAR-JAZZ F25): voicing-type, chart-analysis, jazz-chains, chorale-rn and
  // blues-ear now have their own (mini/theoryCore.ts UNITS, which also wins for the 7th-chord, numeral and mode levels).
  'topic:song-sing': 'songs',
  'topic:song-play': 'songs',
};

/** The vocal families whose first level number points at another family's lesson (vocalUnit is by number). */
export const VOCAL_FAMILY_UNIT: Record<string, string> = { 'v-breath': 'vocal:breath' };

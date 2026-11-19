// Curriculum audit 2026-11-19 (CURRICULUM-AUDIT-INSTRUMENTS R7, -VOICE-DRUMS R2, -EAR-JAZZ F13/F25): every path step
// opens with its teaching screen where one exists. This file only says which lesson opens which step (the instrument
// lessons written for it on 2026-11-19 live in instrumentCore.ts, familyKeysGuitar.ts and familyBass.ts). A level key ("tech:<level>") opens at that level; a family key
// ("tech:<family>") opens at the first level of the family the player meets. Keys that another file already maps win
// (this map is spread first in units.ts), so nothing that was wired before changes.

import { FAMILY_LESSON } from './guitar';
import { VL_LEVEL_LESSON } from './voiceLead';
import { UNITS as FAMILY_KEYS_GUITAR } from './familyKeysGuitar';
import { UNITS as FAMILY_BASS } from './familyBass';

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
  'tech:accomp': 'piano-lh-styles', // L9: root–5th, Alberti, stride, shells (accomp-1 is the Alberti bass)
  'tech:accomp-2': 'walk-approach', // L5: walking bass — chord tones on 1 and 3, approach notes on 4
  'tech:k-read-2': 'first-rhythms', // L8: quarters, 8ths and rests

  // ---- Guitar
  'tech:g-chords': 'fret-chords', // chord boxes, open shapes
  'tech:g-chords-3': 'seventh-types',
  'tech:g-rhythm': 'first-strum',
  'tech:g-scales': 'g-pent-boxes', // L7: the five pentatonic boxes (g-scales-1 is box 1)
  'tech:g-scales-14': 'modes',
  'tech:g-ear-6': 'roman-numerals',
  'tech:g-impro': 'progressions', // blues and ii–V–I named by numerals
  'tech:g-arps': 'triad-types',
  'tech:g-reading': 'g-staff-read', // L6: the treble staff on guitar, an octave above the sound; position I
  'tech:g-first-8': 'first-rhythms', // L8: reading rhythm on muted strings

  // ---- Bass
  'tech:b-chord': 'chord-members', // root, 3rd and 5th
  'tech:b-chord-6': 'seventh-types',
  'tech:b-scale': 'bass-scales',
  'tech:b-scale-4': 'modes',
  'tech:b-ear': 'basics-pitch', // higher or lower
  'tech:b-ear-3': 'roman-numerals',
  'tech:b-pocket-3': 'swing-ratio', // the shuffle feel
  'tech:b-time': 'first-rhythms', // L8: the quarter-note pulse, 8ths, rests, counting aloud
  'tech:b-first-8': 'first-rhythms',
  'tech:b-riff': 'first-riff',
  'tech:b-walk': 'walk-approach', // L5: two-feel roots and 5ths, chord tones on 1 and 3, approaches on 4
  'tech:b-up-walk': 'walk-approach',
  'tech:b-read': 'b-staff-read', // L6: the bass clef, an octave above the sound; first position
  'tech:b-posread': 'b-staff-read',
  'tech:b-up-read': 'b-staff-read',

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

  // ---- Topics with no mini-lesson of their own (EAR-JAZZ F25)
  'topic:voicing-type': 'voicings', // close, drop 2, shell, rootless
  'topic:chart-analysis': 'jazz-changes', // where are the ii–Vs?
  'topic:jazz-chains': 'jazz-changes', // backdoor, tritone sub
  'topic:chorale-rn': 'four-parts',
  'topic:blues-ear': 'jazz-form',
  'topic:song-sing': 'songs',
  'topic:song-play': 'songs',

  // ---- New family lessons (curriculum audit 2026-11-19, owner OK): keys, guitar and bass families, the song-chords topic
  ...FAMILY_KEYS_GUITAR,
  ...FAMILY_BASS,
};

/** The vocal families whose first level number points at another family's lesson (vocalUnit is by number). */
export const VOCAL_FAMILY_UNIT: Record<string, string> = { 'v-breath': 'vocal:breath' };

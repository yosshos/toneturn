// All mini-lessons (spec X), by id.

import { lessonVerified } from '../engine/verifiedContent'; // hidden until verified: left out of every list
import type { MiniLesson } from './miniTypes';
import { EXAMPLE } from './mini/example';
import { LESSONS as PATH } from './mini/path';
import { LESSONS as RHYTHM } from './mini/rhythm';
import { LESSONS as JAZZ } from './mini/jazz';
import { LESSONS as THEORY_EAR } from './mini/theoryEar';
import { LESSONS as VOICE } from './mini/voice';
import { LESSONS as SKILLS, MEMORY_LESSONS } from './mini/skills';
import { LESSONS as BASICS } from './mini/basics';
import { LESSONS as AD } from './mini/ad';
import { UNIT_LESSON, VOCAL_FAMILY_UNIT, vocalUnit } from './units';
import { LESSONS as INSTRUMENT } from './mini/instrument';
import { LESSONS as PIANO_JAZZ } from './mini/pianoJazz';
import { LESSONS as LICKS } from './mini/licks';
import { LESSONS as WRITTEN } from './mini/written';
import { LESSONS as HARMONY2 } from './mini/harmony2';
import { LESSONS as PITCH2 } from './mini/pitch2';
import { LESSONS as TIME2 } from './mini/time2';
import { LESSONS as SOUND } from './mini/sound';
import { LESSONS as CHORDREAD } from './mini/chordread';
import { LESSONS as PROG_GAMES } from './mini/progGames';
import { LESSONS as JAZZ_EAR } from './mini/jazzEar';
import { LESSONS as BASS_NICHE } from './mini/bassNiche';
import { LESSONS as BASS_NICHE2 } from './mini/bassNiche2';
import { LESSONS as DRUMS } from './mini/drums';
import { LESSONS as DRUMS_MORE } from './mini/drumsMore';
import { LESSONS as VOICE_COURSE } from './mini/voiceCourse';
import { LESSONS as GUITAR } from './mini/guitar';
import { LESSONS as MY_SONG } from './mini/mySong';
import { LESSONS as RHYTHM_GAPS } from './mini/rhythmGaps'; // AUDIT-CONTENT-THEORY R-1…R-5
// CURRICULUM-AUDIT-VOICE-DRUMS B3–B11 (owner 2026-11-19): the drums' core lessons, the singer's ear, guide tones on a blues.
import { LESSONS as DRUMS_CORE } from './mini/drumsCore';
import { LESSONS as VOICE_CORE } from './mini/voiceCore';
import { LESSONS as POST_TONAL } from './mini/postTonal'; // owner 2026-11-19: Messiaen, twelve-tone, Euclid

export const MINI_LESSONS: Record<string, MiniLesson> = Object.fromEntries([...EXAMPLE, ...PATH, ...RHYTHM, ...JAZZ, ...THEORY_EAR, ...VOICE, ...SKILLS, ...MEMORY_LESSONS, ...BASICS, ...AD, ...INSTRUMENT, ...WRITTEN, ...HARMONY2, ...PITCH2, ...TIME2, ...SOUND, ...CHORDREAD, ...PROG_GAMES, ...JAZZ_EAR, ...PIANO_JAZZ, ...LICKS, ...BASS_NICHE, ...DRUMS, ...DRUMS_MORE, ...VOICE_COURSE, ...GUITAR, ...BASS_NICHE2, ...MY_SONG, ...RHYTHM_GAPS, ...VOICE_LEAD, ...THEORY_PLAY, ...FIRST_STEPS, ...HARRIS2, ...HARMONY3, ...VL_EAR, ...KEY_MOVES, ...BEBOP_VOCAB, ...PHRASES_BY_EAR, ...SOLO_RULES, ...PROG_GRID, ...HEADS_LESSONS, ...JAZZ_CONTEXT, ...SCALE_WORK, ...HARRIS_LINES, ...REHARM_COLOR, ...SOLO_PIANO, ...FIRST_STEPS_MORE, ...STAGE_C, ...AUDIT7, ...GIG, ...TPAIR_DEEP, ...DRUMS_CORE, ...VOICE_CORE, ...INSTRUMENT_CORE, ...FAMILY_KEYS_GUITAR, ...LATIN_STYLES, ...FAMILY_BASS, ...THEORY_CORE, ...POST_TONAL, ...SYMMETRY, ...CADENCE_CHARTS].filter((l) => lessonVerified(l.id)).map((l) => [l.id, l]));
// Voice leading as a performed skill (AUDIT-CONTENT-THEORY §ה.2): one lesson per stage of k-vl / g-vl.
import { LESSONS as VOICE_LEAD } from './mini/voiceLead';

// THEORY_PLAY (TP-1…TP-5): theory you play.
import { LESSONS as THEORY_PLAY } from './mini/theoryPlay';

import { LESSONS as FIRST_STEPS } from './mini/firstSteps';
import { LESSONS as SCALE_WORK } from './mini/scaleWork'; // AUDIT-SCALES

// HARRIS_2 + HARMONY_3 (AUDIT-CONTENT-THEORY §ז.2)
import { LESSONS as HARRIS2 } from './mini/harris2';
import { LESSONS as HARMONY3 } from './mini/harmony3';
import { LESSONS as VL_EAR } from './mini/vlEar';
// AUDIT-GAPS-2: moving between keys (key changes, turnarounds; modulation by ear).
import { LESSONS as KEY_MOVES } from './mini/keyMoves';
import { LESSONS as CADENCE_CHARTS } from './mini/cadenceCharts';
// AUDIT-GAPS-2: bebop vocabulary (k-vocab, g-bebop, b-bebop).
import { LESSONS as BEBOP_VOCAB } from './mini/bebopVocab';
// Phrases by ear (k-phrase, g-phrase, b-phrase): learning lines by ear.
import { LESSONS as PHRASES_BY_EAR } from './mini/phrasesByEar';
// Progressions by ear (progGrid.ts): roots first, then colour.
import { LESSONS as PROG_GRID } from './mini/progGrid';
// AUDIT-DEPTH-3: heads — harmonising a melody, chord-melody, reharmonising a tune.
import { LESSONS as HEADS_LESSONS } from './mini/heads';
// AUDIT-DEPTH-3: improvising under rule cards (k/g/b-solo) and jazz in context (k/g/b-ctx).
import { LESSONS as SOLO_RULES } from './mini/soloRules';
import { LESSONS as JAZZ_CONTEXT } from './mini/jazzContext';
import { LESSONS as GIG } from './mini/gig'; // AUDIT-DEPTH-3 #11, #12, C8
// Barry Harris lines (BARRY-HARRIS-METHOD Part D): the chromatic scale, line devices, upbeats and compose.
import { LESSONS as HARRIS_LINES } from './mini/harrisLines';
// HARMONY-REHARM: one note many chords, the counter-line, mediants, modal interchange, pedal, planing, approach chords,
// modern colours, organ comping, functional vs colour, jazz deceptive resolutions.
import { LESSONS as REHARM_COLOR } from './mini/reharmColor';
// Solo jazz piano after Jeremy Siskind (SISKIND-SOLO-PIANO): registers, the mango problem, shells, stride, shared hands, comping, phrasing.
import { LESSONS as SOLO_PIANO } from './mini/soloPiano';
// AUDIT-6 Stage B: the new beginnings — bass, TAB, riffs, keyboard map, clefs, chord symbols, sight-reading, drums, Ear.
import { LESSONS as FIRST_STEPS_MORE } from './mini/firstStepsMore';
// STAGE C (AUDIT-6): the advanced endings — guitar above grade 8, drums past 1400, the voice's top ladder, the ear's gaps.
import { LESSONS as STAGE_C } from './mini/stageC';


/** The mini-lesson that opens a unit, if there is one. */
export const lessonForUnit = (unit: string): MiniLesson | null => MINI_LESSONS[UNIT_LESSON[unit] ?? ''] ?? null;

/**
 * The unit key whose mini-lesson opens a technique / vocal path step (curriculum audit 2026-11-19, R7 / R2): the level's
 * own lesson, else the family's; a vocal level falls back to its family's track lesson. Null when none exists.
 */
export function ladderLessonKey(kind: string, ladder: { family: string; ref: string }): string | null {
  const keys = kind === 'vocal'
    ? [`vocal:${ladder.ref}`, VOCAL_FAMILY_UNIT[ladder.family], vocalUnit(Number(ladder.ref))]
    : [`tech:${ladder.ref}`, `tech:${ladder.family}`];
  return keys.find((k): k is string => !!k && !!lessonForUnit(k)) ?? null;
}
// AUDIT-7: note values, interval numbers, the jazz entry on guitar / bass / voice, the singer's first steps, improvising in pop, pop style.
import { LESSONS as AUDIT7 } from './mini/audit7';
// Triad pairs, deep (2026-11-16): lines and voicings; on guitar and bass.
import { LESSONS as TPAIR_DEEP } from './mini/triadPairsDeep';
// Curriculum audit 2026-11-19 (INSTRUMENTS L5–L9 and the family lessons; owner OK 2026-11-19).
import { LESSONS as INSTRUMENT_CORE } from './mini/instrumentCore';
import { LESSONS as FAMILY_KEYS_GUITAR } from './mini/familyKeysGuitar';
// SPEC-JAZZ-NEIGHBOURS §2, §3: bossa / samba comping and the montuno (keys and guitar).
import { LESSONS as LATIN_STYLES } from './mini/latinStyles';
import { LESSONS as FAMILY_BASS } from './mini/familyBass';
// Curriculum audit 2026-11-19: shared theory (7th chords, chords of the key, scales, modes, beyond the octave), the 6 chord
// and the dim7, the jazz welcome, and the jazz topics that had no teaching page.
import { LESSONS as THEORY_CORE } from './mini/theoryCore';
// Symmetry unit (2026-11-19): dividing the octave, P / L / R, interval vectors.
import { LESSONS as SYMMETRY } from './mini/symmetry';

// Every unit that starts with a mini-lesson (spec X): unit id → mini-lesson id.
//   path lessons: the LessonId · topics: "topic:<id>" · vocal tracks: "vocal:<track>" · Play & improvise
//   tabs: "perform:<tab>" · games: "game:<id>"

import { UNITS as INSTRUMENT } from './mini/instrument';
import { UNITS as PIANO_JAZZ } from './mini/pianoJazz';
import { UNITS as WRITTEN } from './mini/written';
import { UNITS as HARMONY2 } from './mini/harmony2';
import { UNITS as PITCH2 } from './mini/pitch2';
import { UNITS as TIME2 } from './mini/time2';
import { UNITS as SOUND } from './mini/sound';
import { UNITS as CHORDREAD } from './mini/chordread';
import { UNITS as JAZZ_EAR } from './mini/jazzEar';
import { UNITS as BASS_NICHE } from './mini/bassNiche';
import { UNITS as BASS_NICHE2 } from './mini/bassNiche2';
import { UNITS as DRUMS } from './mini/drums';
import { UNITS as DRUMS_MORE } from './mini/drumsMore';

export const UNIT_LESSON: Record<string, string> = {
  // 0.38 (spec AE): each area file maps its own topics.
  ...INSTRUMENT,
  ...PIANO_JAZZ,
  ...WRITTEN,
  ...HARMONY2,
  ...PITCH2,
  ...TIME2,
  ...SOUND,
  ...CHORDREAD,
  ...JAZZ_EAR,
  // BASS_NICHE_PLAN: a technique family's first step ("tech:<family>") opens with its quick lesson.
  ...BASS_NICHE,
  ...BASS_NICHE2,
  // DRUMS_NICHE_PLAN P1: the drums niche families open with their quick lesson ("tech:<family>").
  ...DRUMS,
  // DRUMS_NICHE_PLAN P2: a few drum levels open with their own quick lesson ("tech:<level id>").
  ...DRUMS_MORE,
  // Learning path
  'bflat-two-homes': 'bflat-two-homes',
  'degrees-135': 'degrees-135',
  'major-minor': 'major-minor',
  cadences: 'cadences',
  'sing-home-five': 'sing-home-five',
  intervals: 'intervals',
  inversions: 'inversions',
  'notes-degrees': 'notes-degrees',
  'sing-names': 'sing-names',
  'sing-degrees': 'sing-degrees',
  'rhythm-r1': 'rhythm-r1',
  'rhythm-r2': 'rhythm-r2',
  'rhythm-r3': 'rhythm-r3',
  'rhythm-r4': 'rhythm-r4',
  'rhythm-r5': 'rhythm-r5',
  'rhythm-r6': 'rhythm-r6',
  'rhythm-r7': 'rhythm-r7',
  'rhythm-r8': 'rhythm-r8',
  runs: 'runs',
  'note-sequences': 'note-sequences',
  'jazz-1': 'jazz-1',
  songs: 'songs',
  'slash-chords': 'slash-chords',
  dictation: 'dictation',
  'jazz-2': 'jazz-2',
  'absolute-pitch': 'absolute-pitch',
  modes: 'modes',
  'wrong-notes': 'wrong-notes',
  // Practice topics
  'topic:bh-scale': 'bh-scale',
  'topic:bh-tone': 'bh-scale',
  'topic:bh-convert': 'bh-convert',
  'topic:bh-convert-2': 'bh-convert-2',
  'topic:bh-keys': 'bh-keys',
  'topic:bh-six-over': 'bh-six-over',
  'topic:bh-lines': 'bh-lines',
  'topic:bh-pivot': 'bh-pivot',
  'topic:bh-brothers': 'bh-brothers',
  'topic:bh-family': 'bh-family',
  'topic:bh-block': 'bh-block',
  'topic:comping': 'comping',
  'topic:turnarounds': 'turnarounds',
  'topic:where-home': 'where-home',
  'topic:next-chord': 'next-chord',
  'topic:reharm-swap': 'reharm-swap',
  'topic:figure-out': 'figure-out',
  'topic:guide-tones': 'guide-tones',
  'topic:chromatic-added': 'chromatic-added',
  'topic:extensions': 'extensions',
  'topic:voicings': 'voicings',
  'topic:progressions': 'progressions',
  'topic:form': 'form',
  'topic:fine-pitch': 'fine-pitch',
  'topic:in-tune': 'fine-pitch',
  'topic:two-voice': 'two-voice',
  'topic:set-classes': 'set-classes',
  'topic:maqam': 'maqam',
  'topic:eastern-rhythm': 'eastern-rhythm',
  'topic:polyrhythm': 'polyrhythm',
  'topic:odd-meter': 'odd-meter',
  'topic:swing-ratio': 'swing-ratio',
  'topic:key-signatures': 'key-signatures',
  'topic:interval-spelling': 'interval-spelling',
  'topic:chord-spelling': 'chord-spelling',
  'topic:roman-numerals': 'roman-numerals',
  'topic:circle-fifths': 'circle-fifths',
  'topic:transposition': 'transposition',
  'topic:chord-scale': 'chord-scale',
  'topic:note-reading': 'note-reading',
  'topic:tempo': 'tempo',
  'topic:intervals-all': 'intervals-all',
  'topic:degrees-ext': 'degrees-ext',
  'topic:sight-read': 'sight-read',
  'topic:rhythm-memory': 'rhythm-memory',
  'topic:chord-memory': 'chord-memory',
  'topic:call-response': 'call-response',
  'basics-pitch': 'basics-pitch',
  'basics-shape': 'basics-shape',
  'basics-beat': 'basics-beat',
  'basics-voice': 'basics-voice',
  transpose: 'transpose',
  'rhythm-shift': 'rhythm-shift',
  'chord-tones': 'chord-tones',
  'topic:basics-highlow': 'basics-pitch',
  'topic:basics-samediff': 'basics-pitch',
  'topic:basics-contour': 'basics-shape',
  'topic:basics-beat': 'basics-beat',
  'topic:transpose': 'transpose',
  'topic:transpose-adv': 'transpose',
  'topic:harmonic-dictation': 'harmony-more',
  'topic:displacement-3': 'rhythm-shift',
  'topic:displacement': 'rhythm-shift',
  'topic:rhythm-transform': 'transformations',
  'topic:melodic-transform': 'transformations',
  'topic:nashville': 'transformations',
  'topic:meter-feel': 'meter',
  'topic:downbeat': 'meter',
  'topic:syncopation': 'rhythm-shift',
  'topic:dynamics': 'expression',
  'topic:articulation': 'expression',
  'topic:mood': 'expression',
  'topic:cadence-types': 'harmony-more',
  'topic:modulation': 'harmony-more',
  'topic:harmonize': 'harmony-more',
  'topic:nct-ear': 'harmony-more',
  'topic:musical-terms': 'terms',
  'topic:time-signatures': 'terms',
  'topic:voice-leading': 'terms',
  'topic:find-tonic': 'home-and-scales',
  'topic:octave': 'home-and-scales',
  'topic:scale-types': 'home-and-scales',
  'topic:compound-intervals': 'home-and-scales',
  'topic:voice-count': 'texture',
  'topic:theory-facts': 'game-truefalse',
  // Vocal tracks
  'vocal:hold': 'vocal-hold',
  'vocal:vibrato': 'vocal-vibrato',
  'vocal:range': 'vocal-range',
  'vocal:melody': 'vocal-melody',
  'vocal:scales': 'vocal-scales',
  'vocal:harmony': 'vocal-harmony',
  'vocal:barry': 'vocal-barry',
  'vocal:sight': 'vocal-sight',
  'vocal:ornaments': 'vocal-ornaments',
  'vocal:singalong': 'songs',
  // VOICE_CURRICULUM: the voice course's new families (src/content/mini/voiceCourse.ts).
  'vocal:breath': 'voice-breath',
  'vocal:drift': 'voice-drift',
  'vocal:registers': 'voice-breath',
  'vocal:dynamics': 'voice-dynamics',
  'vocal:jazz-vibrato': 'voice-dynamics',
  'vocal:time': 'voice-time',
  'vocal:ear': 'voice-drift',
  'vocal:band': 'voice-band',
  'vocal:standards': 'voice-standards',
  'vocal:scat': 'voice-scat',
  'vocal:bebop': 'voice-time',
  'vocal:harmony-more': 'vocal-harmony',
  'vocal:inflect': 'voice-dynamics',
  // VOICE_CURRICULUM P2: reading over the band + quarter tones, and talking with the band (motif, trading, colla voce).
  'vocal:reading': 'voice-reading',
  'vocal:trading': 'voice-trading',
  // Play & improvise
  'perform:backing': 'perform-backing',
  'perform:improv': 'perform-improv',
  'perform:clock': 'perform-clock',
  'perform:midi': 'perform-midi',
  'perform:guitar': 'perform-guitar',
  // Games
  'game:echo': 'game-echo',
  'game:beat': 'game-beat',
  'game:truefalse': 'game-truefalse',
  // SPEC-LICKS-TRANSCRIPTION: the lick trainer and the transcription coach.
  'game:licks': 'lick-trainer',
  'game:transcribe': 'transcribe-coach',
  // GUITAR_DEEPENING §6.3: the chord finder (guitar Tools).
  'game:chordfinder': 'g-chord-finder',
};

const VOICE_UNIT: Record<number, string> = { 6: 'vocal:breath', 7: 'vocal:drift', 8: 'vocal:registers', 9: 'vocal:dynamics', 10: 'vocal:jazz-vibrato', 11: 'vocal:time', 12: 'vocal:ear', 13: 'vocal:band', 14: 'vocal:standards', 15: 'vocal:scat', 16: 'vocal:bebop', 17: 'vocal:harmony-more', 18: 'vocal:inflect', 19: 'vocal:sight', 20: 'vocal:scales' };

const VOICE_LEVEL_UNIT: Record<number, string> = { 704: 'vocal:reading', 1903: 'vocal:reading', 1904: 'vocal:reading', 1408: 'vocal:trading', 1409: 'vocal:trading', 1410: 'vocal:trading', 1507: 'vocal:trading', 1508: 'vocal:trading', 1509: 'vocal:trading', 1510: 'vocal:trading' };

/** The vocal track a vocal level belongs to (level numbers: see Vocal.tsx bases). */
export function vocalUnit(level: number | 'warmup'): string | null {
  if (level === 'warmup') return null;
  // VOICE_CURRICULUM P2 levels with their own lesson (before the number base).
  if (VOICE_LEVEL_UNIT[level]) return VOICE_LEVEL_UNIT[level];
  // VOICE_CURRICULUM: new family levels by their number base.
  if (level >= 600) return VOICE_UNIT[Math.floor(level / 100)] ?? null;
  if (level > 500) return 'vocal:ornaments';
  if (level > 400) return 'vocal:sight';
  if (level > 300) return 'vocal:barry';
  if (level > 200) return 'vocal:harmony';
  if (level > 100) return 'vocal:scales';
  if (level <= 2) return 'vocal:hold';
  if (level === 3 || level === 10 || level === 11) return 'vocal:vibrato';
  if (level === 4 || level === 5) return 'vocal:range';
  if (level === 12) return 'runs';
  return 'vocal:melody';
}

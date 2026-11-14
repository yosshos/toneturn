// All mini-lessons (spec X), by id.

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
import { UNIT_LESSON } from './units';
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

export const MINI_LESSONS: Record<string, MiniLesson> = Object.fromEntries([...EXAMPLE, ...PATH, ...RHYTHM, ...JAZZ, ...THEORY_EAR, ...VOICE, ...SKILLS, ...MEMORY_LESSONS, ...BASICS, ...AD, ...INSTRUMENT, ...WRITTEN, ...HARMONY2, ...PITCH2, ...TIME2, ...SOUND, ...CHORDREAD, ...PROG_GAMES, ...JAZZ_EAR, ...PIANO_JAZZ, ...LICKS, ...BASS_NICHE, ...DRUMS, ...DRUMS_MORE, ...VOICE_COURSE, ...GUITAR, ...BASS_NICHE2, ...MY_SONG, ...RHYTHM_GAPS, ...VOICE_LEAD, ...THEORY_PLAY, ...FIRST_STEPS].map((l) => [l.id, l]));
// Voice leading as a performed skill (AUDIT-CONTENT-THEORY §ה.2): one lesson per stage of k-vl / g-vl.
import { LESSONS as VOICE_LEAD } from './mini/voiceLead';

// THEORY_PLAY (TP-1…TP-5): theory you play.
import { LESSONS as THEORY_PLAY } from './mini/theoryPlay';

import { LESSONS as FIRST_STEPS } from './mini/firstSteps';


/** The mini-lesson that opens a unit, if there is one. */
export const lessonForUnit = (unit: string): MiniLesson | null => MINI_LESSONS[UNIT_LESSON[unit] ?? ''] ?? null;

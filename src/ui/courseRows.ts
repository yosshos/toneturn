// Which rows and games the Practice page shows per course (pure tables, moved out of Arcade.tsx in 0.67 so tests can
// read them without the UI).
import type { CourseId } from '../engine/courses';
import { gameVerified } from '../engine/verifiedContent';

/** The games each course offers (0.64, owner: every bottom-tab screen is the course's — no guitar game in piano).
 *  AUDIT-GAMES §5 (games fix): Technique left the lists (it is the Technique row), Odd-meter Echo is a mode of Groove
 *  Echo, Pitch Memory is a Today card, the groove trainer a tool; in drums Groove Echo replaces Beat Echo. Their
 *  routes and saved progress stay. */
const ALL_COURSE_GAMES: Record<CourseId, string[]> = {
  ear: ['melody', 'rhythm', 'truefalse', 'ghost', 'duel', 'daily', 'rush-interval', 'rush-chord', 'rush-progression', 'highway', 'melodypuzzle', 'nametune', 'rush-note', 'rush-keysig', 'peakhunter', 'rush-voicing', 'reharm', 'rush-scale', 'transcribe', 'rush-standard', 'polylock', 'bordercontrol', 'crossword', 'holdnote', 'thirdjump', 'darkside', 'whichpair'],
  jazz: ['rush-chord', 'rush-progression', 'rush-interval', 'truefalse', 'nametune', 'duel', 'daily', 'rush-standard', 'rush-voicing', 'reharm', 'bhtime', 'transcribe', 'rush-scale', 'bordercontrol', 'whichbrother', 'compcaller', 'guidetone', 'call5432', 'enclosure', 'crossword', 'holdnote', 'thirdjump', 'darkside', 'whichpair'],
  voice: ['flight', 'melody', 'nametune', 'rush-interval', 'rush-scale', 'singinterval', 'harmonyhold', 'runcatcher', 'singback'],
  keys: ['rush-note', 'rush-chord', 'rush-keysig', 'highway', 'melodypuzzle', 'rhythm', 'bhtime', 'rush-voicing', 'transcribe', 'riffecho', 'polylock', 'playback', 'voicingsprint', 'whichbrother', 'compcaller', 'elevator', 'guidetone', 'call5432', 'enclosure', 'holdnote', 'staffrunner', 'thirdjump', 'whichpair'],
  guitar: ['rush-fretboard', 'tuneup', 'rush-chord', 'highway', 'rush-note', 'rhythm', 'rush-voicing', 'riffecho', 'changerace', 'playback', 'rootsear', 'compcaller', 'elevator', 'guidetone', 'call5432', 'enclosure', 'strumchange'],
  bass: ['rush-fretboard', 'tuneup', 'highway', 'rush-note', 'rhythm', 'riffecho', 'walkchanges', 'rootsear', 'playback', 'guidetone', 'call5432', 'enclosure', 'rootcatch'],
  // 0.65: technique on the kit, Highway with drum lanes, beat echo, the groove trainer.
  // DRUMS_NICHE_PLAN §3 (P1): Land It, Groove Echo, Odd-meter Echo — measured takes on the kit.
  drums: ['highway', 'land', 'groove-echo', 'polylock', 'time-lock', 'ghost-control', 'rudiment-rush', 'groove-off', 'kitread', 'namegroove', 'rebound'],
};
/** The games on show: hidden-until-verified games (verifiedContent.ts) left out; their routes and saved progress stay. */
export const COURSE_GAMES: Record<CourseId, string[]> = Object.fromEntries(Object.entries(ALL_COURSE_GAMES).map(([c, gs]) => [c, gs.filter(gameVerified)])) as Record<CourseId, string[]>;
/** What Practice shows in each course (0.61, SPEC-COURSES): only the course's own rows; tools are shared.
 *  0.70 (SPEC-REPERTOIRE): "Songs" became "Repertoire" — the road from simple tunes to standards — in every course.
 *  Licks and the transcription coach (SPEC-LICKS-TRANSCRIPTION) sit in every course that plays or sings lines.
 *  SPEC-MY-SONG: "My song" (practise over your own recording, measured) in every course. */
export const COURSE_ROWS: Record<CourseId, string[]> = {
  ear: ['lessons', 'repertoire', 'puzzle', 'mysong', 'games'],
  voice: ['drills', 'repertoire', 'licks', 'transcribe', 'mysong', 'games'],
  // SPEC-PHRASE-STUDIO §17: Encore is the first Train row where it plays in v1 (piano: keys, jazz).
  keys: ['encore', 'drills', 'repertoire', 'pieces', 'licks', 'transcribe', 'mysong', 'games'],
  guitar: ['drills', 'repertoire', 'pieces', 'licks', 'transcribe', 'mysong', 'games'],
  bass: ['drills', 'repertoire', 'licks', 'transcribe', 'mysong', 'games'],
  drums: ['drills', 'repertoire', 'mysong', 'games'],
  jazz: ['encore', 'repertoire', 'charts', 'improv', 'licks', 'transcribe', 'mysong', 'games'],
};
/** 0.67: the Ear course in exam-prep mode (was the Exams course) puts the mock exams first. */
export const EXAM_PREP_ROWS = ['exams', 'lessons', 'puzzle', 'games'];
export const courseRows = (course: CourseId, examPrep = false): string[] => (course === 'ear' && examPrep ? EXAM_PREP_ROWS : COURSE_ROWS[course]);

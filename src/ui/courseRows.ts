// Which rows and games the Practice page shows per course (pure tables, moved out of Arcade.tsx in 0.67 so tests can
// read them without the UI).
import { JAZZ_GAMES, type CourseId } from '../engine/courses';
import { gameVerified } from '../engine/verifiedContent';

/** The games each course offers (0.64, owner: every bottom-tab screen is the course's — no guitar game in piano).
 *  AUDIT-GAMES §5 (games fix): Technique left the lists (it is the Technique row), Odd-meter Echo is a mode of Groove
 *  Echo, Pitch Memory is a Today card, the groove trainer a tool; in drums Groove Echo replaces Beat Echo. Their
 *  routes and saved progress stay. */
const ALL_COURSE_GAMES: Record<CourseId, string[]> = {
  // SPEC-JAZZ-FOLD: the old Jazz course's ear games are Ear's (Euclid, Mirror joined); its played ones (Which Brother,
  // Comp Caller, Guide-Tone Runner, Enclosure, 5-4-3-2, Barry Harris in Time) are the instrument courses'. The jazz
  // games (courses.ts JAZZ_GAMES) show only while the jazz pack is open (courseGames).
  ear: ['melody', 'rhythm', 'truefalse', 'ghost', 'duel', 'daily', 'rush-interval', 'rush-chord', 'rush-progression', 'highway', 'melodypuzzle', 'nametune', 'rush-note', 'rush-keysig', 'peakhunter', 'rush-voicing', 'reharm', 'rush-scale', 'transcribe', 'rush-standard', 'polylock', 'bordercontrol', 'crossword', 'holdnote', 'thirdjump', 'darkside', 'whichpair', 'tonnetz', 'euclid', 'mirror'],
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
/** SPEC-JAZZ-FOLD: a course's games for a player — the jazz games only while the jazz pack is open there. */
export const courseGames = (course: CourseId, jazzOn: boolean): string[] => (jazzOn ? COURSE_GAMES[course] : COURSE_GAMES[course].filter((g) => !JAZZ_GAMES.includes(g)));
/**
 * What Practice shows in each course: its places (BUILD-PLAN-2026-11 phase 3, SPEC-PRACTICE-IA-3 §2 and §8, owner
 * 2026-11-22). Four places in the playing courses — Technique, Licks, Repertoire, Improvise — then the games; Charts &
 * lead sheets, My pieces, My song and Ear's jazz standards live inside Repertoire, the transcription coach inside Licks.
 *   keys / guitar / bass: Technique, Licks, Repertoire, Improvise (for every player: the jazz pack changes the content).
 *   voice: Technique (the voice), Licks (sung), Repertoire, and Improvise (scat over a progression) with the jazz pack.
 *   drums: Technique, Repertoire (grooves and songs), Games, Improvise (fills, solos, trading fours); no Licks.
 *   ear: Lessons, Repertoire (by ear), Puzzle, Games; in exam prep, Exams first.
 */
export const COURSE_ROWS: Record<CourseId, string[]> = {
  ear: ['lessons', 'repertoire', 'puzzle', 'games'],
  voice: ['drills', 'licks', 'repertoire', 'games'],
  keys: ['drills', 'licks', 'repertoire', 'improv', 'games'],
  guitar: ['drills', 'licks', 'repertoire', 'improv', 'games'],
  bass: ['drills', 'licks', 'repertoire', 'improv', 'games'],
  drums: ['drills', 'repertoire', 'games', 'improv'],
};
/** The places the jazz pack adds (the voice's scat improvising); the other jazz content sits inside the places. */
export const JAZZ_ROWS: Partial<Record<CourseId, string[]>> = {
  voice: ['improv'],
};
/** The four places a course's Practice page shows as its main cards (the rows without Games). */
export const PLACE_ROWS = ['drills', 'licks', 'repertoire', 'improv', 'lessons', 'puzzle', 'exams'];
/** 0.67: the Ear course in exam-prep mode (was the Exams course) puts the mock exams first. */
export const EXAM_PREP_ROWS = ['exams', 'lessons', 'repertoire', 'puzzle', 'games'];
export function courseRows(course: CourseId, examPrep = false, jazz: 'off' | 'on' | 'focus' = 'off'): string[] {
  if (course === 'ear' && examPrep) return EXAM_PREP_ROWS;
  const base = COURSE_ROWS[course];
  const jz = jazz === 'off' ? [] : (JAZZ_ROWS[course] ?? []).filter((r) => !base.includes(r));
  if (!jz.length) return base;
  const at = base.indexOf('games');
  return at < 0 ? [...base, ...jz] : [...base.slice(0, at), ...jz, ...base.slice(at)];
}

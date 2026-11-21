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
/** What Practice shows in each course (0.61, SPEC-COURSES): only the course's own rows; tools are shared.
 *  0.70 (SPEC-REPERTOIRE): "Songs" became "Repertoire" — the road from simple tunes to standards — in every course.
 *  Licks and the transcription coach (SPEC-LICKS-TRANSCRIPTION) sit in every course that plays or sings lines.
 *  SPEC-MY-SONG: "My song" (practice over your own recording, measured) in every course. */
export const COURSE_ROWS: Record<CourseId, string[]> = {
  ear: ['lessons', 'repertoire', 'puzzle', 'mysong', 'games'],
  // Owner 2026-11-21: by importance — Technique first, then Encore (SPEC-PHRASE-STUDIO), then (jazz open) Charts and
  // Improvise, then the rest.
  // Licks live inside Encore (its library, owner 2026-11-21); the route stays for path steps.
  voice: ['drills', 'encore', 'repertoire', 'transcribe', 'mysong', 'games'],
  keys: ['drills', 'encore', 'repertoire', 'pieces', 'transcribe', 'mysong', 'games'],
  guitar: ['drills', 'encore', 'repertoire', 'pieces', 'transcribe', 'mysong', 'games'],
  bass: ['drills', 'encore', 'repertoire', 'transcribe', 'mysong', 'games'],
  drums: ['drills', 'repertoire', 'mysong', 'games'],
};
/**
 * SPEC-JAZZ-FOLD: the old Jazz course's rows, in the course that now holds them while the jazz pack is open — Ear: the
 * jazz standards, charts and lead sheets, improvising under rules, licks and transcription; the playing courses: charts
 * and improvising. In jazz focus they come first.
 */
export const JAZZ_ROWS: Partial<Record<CourseId, string[]>> = {
  ear: ['standards', 'charts', 'improv', 'licks', 'transcribe'],
  keys: ['charts', 'improv'],
  guitar: ['charts', 'improv'],
  bass: ['charts', 'improv'],
  voice: ['charts'],
};
/** 0.67: the Ear course in exam-prep mode (was the Exams course) puts the mock exams first. */
export const EXAM_PREP_ROWS = ['exams', 'lessons', 'puzzle', 'games'];
export function courseRows(course: CourseId, examPrep = false, jazz: 'off' | 'on' | 'focus' = 'off'): string[] {
  if (course === 'ear' && examPrep) return EXAM_PREP_ROWS;
  const base = COURSE_ROWS[course];
  const jz = jazz === 'off' ? [] : (JAZZ_ROWS[course] ?? []).filter((r) => !base.includes(r));
  if (!jz.length) return base;
  // Owner 2026-11-21: in the playing courses Charts and Improvise come right after Technique and Encore (focus or open).
  const enc = base.indexOf('encore');
  if (enc >= 0) return [...base.slice(0, enc + 1), ...jz, ...base.slice(enc + 1)];
  if (jazz === 'focus') return [...jz, ...base];
  // Open: after the course's own play rows, before My song and the games.
  const at = base.findIndex((r) => r === 'mysong' || r === 'games');
  return at < 0 ? [...base, ...jz] : [...base.slice(0, at), ...jz, ...base.slice(at)];
}

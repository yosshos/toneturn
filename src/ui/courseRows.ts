// Which rows and games the Practice page shows per course (pure tables, moved out of Arcade.tsx in 0.67 so tests can
// read them without the UI).
import type { CourseId } from '../engine/courses';

/** The games each course offers (0.64, owner: every bottom-tab screen is the course's — no guitar game in piano). */
export const COURSE_GAMES: Record<CourseId, string[]> = {
  ear: ['melody', 'rhythm', 'truefalse', 'ghost', 'duel', 'daily', 'rush-interval', 'rush-chord', 'rush-progression', 'highway', 'melodypuzzle', 'nametune', 'pitchmemory', 'rush-note', 'rush-keysig', 'peakhunter', 'rush-voicing', 'reharm', 'rush-scale', 'transcribe', 'rush-standard', 'polylock'],
  jazz: ['rush-chord', 'rush-progression', 'rush-interval', 'truefalse', 'nametune', 'duel', 'daily', 'rush-standard', 'rush-voicing', 'reharm', 'bhtime', 'transcribe', 'rush-scale'],
  voice: ['flight', 'pitchmemory', 'melody', 'nametune', 'rush-interval', 'rush-scale'],
  keys: ['drills', 'rush-note', 'rush-chord', 'rush-keysig', 'highway', 'melodypuzzle', 'rhythm', 'bhtime', 'rush-voicing', 'transcribe', 'riffecho', 'polylock'],
  guitar: ['drills', 'rush-fretboard', 'tuneup', 'rush-chord', 'highway', 'rush-note', 'rhythm', 'rush-voicing', 'riffecho'],
  bass: ['drills', 'rush-fretboard', 'tuneup', 'highway', 'rush-note', 'rhythm', 'riffecho'],
  // 0.65: technique on the kit, Highway with drum lanes, beat echo, the groove trainer.
  drums: ['drills', 'highway', 'rhythm', 'groove', 'polylock'],
};
/** What Practice shows in each course (0.61, SPEC-COURSES): only the course's own rows; tools are shared. */
export const COURSE_ROWS: Record<CourseId, string[]> = {
  ear: ['lessons', 'puzzle', 'games'],
  voice: ['drills', 'songs', 'games'],
  keys: ['drills', 'pieces', 'songs', 'games'],
  guitar: ['drills', 'songs', 'pieces', 'games'],
  bass: ['drills', 'songs', 'games'],
  drums: ['drills', 'games'],
  jazz: ['charts', 'improv', 'games'],
};
/** 0.67: the Ear course in exam-prep mode (was the Exams course) puts the mock exams first. */
export const EXAM_PREP_ROWS = ['exams', 'lessons', 'puzzle', 'games'];
export const courseRows = (course: CourseId, examPrep = false): string[] => (course === 'ear' && examPrep ? EXAM_PREP_ROWS : COURSE_ROWS[course]);

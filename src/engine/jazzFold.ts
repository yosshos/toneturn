// SPEC-JAZZ-FOLD (owner 2026-11-19): the Jazz course is folded into the other courses. Its ear and theory are the top
// levels of Ear & theory, its playing lives in the instrument / voice courses, and jazz content is gated by the 'jazz'
// pack per course. Pure: is the pack open in a course, which courses climbing opens, jazz focus toggling.

import { courseLevel } from './courseSocial';
import { JAZZ_FOCUS_COURSES, type CourseId } from './courses';
import { defaultPacks, type Goal, type Pack } from './path';
import type { Track } from './intake';
import type { Ratings } from './rating';

/** The settings this module reads (a Settings subset, so tests need no storage import). */
export interface JazzSettings {
  pathPacks?: Pack[];
  track?: Track;
  goal?: Goal;
  intake?: { plays?: string[] } | null | unknown;
  instrument?: string;
  midiInput?: boolean;
  jazzFocus?: CourseId[];
  jazzOpen?: CourseId[];
  drills?: { emphasis?: 'both' | 'classical' | 'jazz'; guitarAddOns?: string[]; bassTrack?: 'jazz' | 'prog' | 'both' } | null;
}

/**
 * SPEC-JAZZ-FOLD §3: the course level (courseSocial DYN) at which a beginner's jazz opens by itself — mf, rating 1100:
 * where the student track's path starts (path.ts START.student), i.e. what an intermediate player gets from day one,
 * and the top of the "developing" section, above which jazz harmony is the course's next material.
 */
export const JAZZ_OPEN_DYN = 'mf' as const;
// (A literal, not read from DYN at load: courseSocial sits in an import cycle; tests/jazzFold.test.ts checks they agree.)
export const JAZZ_OPEN_AT = 1100;

const playsOf = (s: JazzSettings): string[] => [
  ...(((s.intake as { plays?: string[] } | null | undefined)?.plays) ?? []),
  ...(s.midiInput ? ['keys'] : []),
  ...(s.instrument && !['voice', 'C', 'Bb', 'Eb', 'F'].includes(s.instrument) ? [s.instrument] : []),
];

/** The player's packs by background (the stored choice, else the questionnaire defaults: student / pro → jazz). */
export const backgroundPacks = (s: JazzSettings): Pack[] => s.pathPacks ?? defaultPacks(s.track ?? 'hobby', playsOf(s), s.goal ?? 'general');

export const jazzFocusOn = (s: Pick<JazzSettings, 'jazzFocus'>, c: CourseId): boolean => !!s.jazzFocus?.includes(c);

/** Why the jazz pack is open in a course (null = closed). */
export function jazzOpenWhy(s: JazzSettings, c: CourseId): 'background' | 'focus' | 'climbed' | 'instrument' | null {
  if (jazzFocusOn(s, c)) return 'focus';
  if (backgroundPacks(s).includes('jazz')) return 'background';
  if (s.jazzOpen?.includes(c)) return 'climbed';
  // An explicit instrument choice: piano emphasis "jazz", a ticked guitar jazz add-on, the bass jazz track.
  const d = s.drills ?? {};
  if (c === 'keys' && d.emphasis === 'jazz') return 'instrument';
  if (c === 'guitar' && d.guitarAddOns?.includes('jazz')) return 'instrument';
  if (c === 'bass' && d.bassTrack === 'jazz') return 'instrument';
  return null;
}
/** SPEC-JAZZ-FOLD §2: is the jazz pack open in this course? */
export const jazzOpenIn = (s: JazzSettings, c: CourseId): boolean => jazzOpenWhy(s, c) !== null;

/** The packs a course's path uses: the background packs, with 'jazz' exactly when it is open in the course. */
export function coursePacks(s: JazzSettings, c: CourseId): Pack[] {
  const base = backgroundPacks(s).filter((p) => p !== 'jazz');
  return jazzOpenIn(s, c) ? [...base, 'jazz'] : base;
}

/**
 * SPEC-JAZZ-FOLD §3: the player's courses whose level reached mf while their jazz is still closed — the caller adds
 * them to Settings.jazzOpen (persisted) and shows the one-time notice. Never closes anything.
 */
export function coursesToOpen(s: JazzSettings & { courses?: CourseId[] }, ratings: Ratings): CourseId[] {
  const mine = s.courses?.length ? s.courses : (['ear'] as CourseId[]);
  return mine.filter((c) => JAZZ_FOCUS_COURSES.includes(c) && !jazzOpenIn(s, c) && (courseLevel(c, ratings, mine).r ?? 0) >= JAZZ_OPEN_AT);
}

/** Jazz focus on / off for one course. */
export function toggleJazzFocus(s: Pick<JazzSettings, 'jazzFocus'>, c: CourseId, on: boolean): CourseId[] {
  const cur = s.jazzFocus ?? [];
  return on ? Array.from(new Set([...cur, c])) : cur.filter((x) => x !== c);
}

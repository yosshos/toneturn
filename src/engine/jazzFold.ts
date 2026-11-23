// SPEC-JAZZ-FOLD (owner 2026-11-19): the Jazz course is folded into the other courses. Its ear and theory are the top
// levels of Ear & theory, its playing lives in the instrument / voice courses, and jazz content is gated by the 'jazz'
// pack per course. Pure: is the pack open in a course, which courses climbing opens, jazz focus toggling.

import type { CourseId } from './courses';
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

/**
 * Jazz focus (SPEC-JAZZ-FOLD §4), now read from the style focus (SPEC-STYLE-FOCUS §6): a CHOSEN main style of jazz in the
 * course (or the old jazzFocus list, read-only for one version). The default focus (nothing chosen) is not "focus".
 */
export const jazzFocusOn = (s: Pick<JazzSettings, 'jazzFocus'> & { styleFocus?: Partial<Record<CourseId, { main: string }>> }, c: CourseId): boolean => {
  const f = s.styleFocus?.[c];
  return f ? f.main === 'jazz' : !!s.jazzFocus?.includes(c);
};

/**
 * SPEC-STYLE-FOCUS §2, §8.1 (owner 2026-11-22, "I don't believe in locking"): the jazz pack is no longer a lock. What
 * used to open it — the background, climbing to mf, an explicit instrument choice, jazz focus — now only says where a
 * player STARTS in jazz harmony. Why a course starts jazz at the intermediate level (null = from the first steps).
 */
export function jazzStartWhy(s: JazzSettings, c: CourseId): 'background' | 'focus' | 'climbed' | 'instrument' | null {
  if (jazzFocusOn(s, c)) return 'focus';
  if (backgroundPacks(s).includes('jazz')) return 'background';
  if (s.jazzOpen?.includes(c)) return 'climbed';
  const d = s.drills ?? {};
  if (c === 'keys' && d.emphasis === 'jazz') return 'instrument';
  if (c === 'guitar' && d.guitarAddOns?.includes('jazz')) return 'instrument';
  if (c === 'bass' && d.bassTrack === 'jazz') return 'instrument';
  return null;
}
/** The rating a course's jazz harmony starts at: the intermediate start (mf) when the above says so, else none (the beginning). */
export const jazzStartLevel = (s: JazzSettings, c: CourseId): number | undefined => (jazzStartWhy(s, c) ? JAZZ_OPEN_AT : undefined);

/** Every course has jazz from day one (SPEC-STYLE-FOCUS §2): difficulty is set by the level, not by a lock. */
export const jazzOpenIn = (_s: JazzSettings, _c: CourseId): boolean => true;

/** The packs a course's path uses: the background packs, always with 'jazz' (no lock). */
export function coursePacks(s: JazzSettings, _c: CourseId): Pack[] {
  return [...backgroundPacks(s).filter((p) => p !== 'jazz'), 'jazz'];
}

/** Climbing no longer opens anything (nothing is closed); kept so old callers compile. */
export function coursesToOpen(_s: JazzSettings & { courses?: CourseId[] }, _ratings: Ratings): CourseId[] {
  return [];
}

/** Jazz focus on / off for one course. */
export function toggleJazzFocus(s: Pick<JazzSettings, 'jazzFocus'>, c: CourseId, on: boolean): CourseId[] {
  const cur = s.jazzFocus ?? [];
  return on ? Array.from(new Set([...cur, c])) : cur.filter((x) => x !== c);
}

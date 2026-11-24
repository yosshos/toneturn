// The weaker and the stronger area of a course (docs/SPEC-PRACTICE-SESSION.md §11.5, owner-approved 2026-11-24). Pure.
//
// "Strong" and "weak" come from the area ratings: the Ear course's areas (pitch, time, memory, reading) by their domain
// ratings; an instrument course's two workout shares (technique / improvisation — repertoire and, on the drums,
// grooves live in the improvisation share) by how close each is to its target (sessionNeed.closeness).
// Minutes in the weakest area beyond its planned share are stretch; minutes in the strongest beyond its planned share
// are comfort:
//   - a drill take in the weakest area, once that area is past its share, is stretch (stretch.ts takeBand weakerArea);
//   - a lesson / ear answer's XP is tilted ×1.2 (weakest, past its share) or ×0.8 (strongest, past its share), with the
//     Elo factor (stretch.ts answerFactor), the product kept within 0.3–1.5.
// "This week" is the last 7 days, like the workout's neglect signal (§3.2); under 20 minutes nothing is read.

import type { CourseId } from './courses';
import { COURSE_AREAS } from './courses';
import { domainOf, domainValue, SKILLS, type DomainId, type Ratings } from './rating';
import { answerFactor } from './stretch';
import { addDay, summarize, type PracticeLedger } from './practiceTime';
import type { SkillId } from './lesson';

/** The least difference (0..1) between the weakest and the strongest area for either to count. */
export const AREA_GAP = 0.05;
/** The least week (minutes, across the compared areas) before the shares are read (= workout2 NEED.minWeek). */
export const AREA_MIN_WEEK = 20;
/** The answer tilt: the weakest area past its share, the strongest past its share. */
export const AREA_TILT = { weak: 1.2, strong: 0.8 } as const;
/** The combined answer factor (Elo × area) stays inside this range. */
export const ANSWER_FACTOR_RANGE = { min: 0.3, max: 1.5 } as const;

export interface AreaStretch {
  weakest: string | null;
  strongest: string | null;
  /** The weakest area got more than its planned share of the week's minutes. */
  weakBeyond: boolean;
  /** The strongest area got more than its planned share of the week's minutes. */
  strongBeyond: boolean;
}

export const NO_AREA_STRETCH: AreaStretch = { weakest: null, strongest: null, weakBeyond: false, strongBeyond: false };

/** The weakest and the strongest of the measured areas (0..1 each); none unless two are measured AREA_GAP apart. Ties
 *  go to the area named first. */
export function weakStrong(values: Readonly<Record<string, number | null | undefined>>): { weakest: string | null; strongest: string | null } {
  const xs = Object.entries(values).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]));
  if (xs.length < 2) return { weakest: null, strongest: null };
  let lo = xs[0];
  let hi = xs[0];
  for (const x of xs) {
    if (x[1] < lo[1]) lo = x;
    if (x[1] > hi[1]) hi = x;
  }
  if (hi[1] - lo[1] < AREA_GAP) return { weakest: null, strongest: null };
  return { weakest: lo[0], strongest: hi[0] };
}

/** The area got more than its planned share of the week's minutes (the planned shares are normalised over `planned`'s
 *  areas; the week must hold AREA_MIN_WEEK minutes across them). */
export function beyondShare(minutes: Readonly<Record<string, number | undefined>>, planned: Readonly<Record<string, number>>, area: string): boolean {
  const areas = Object.keys(planned);
  const total = areas.reduce((a, k) => a + Math.max(0, minutes[k] ?? 0), 0);
  const plan = areas.reduce((a, k) => a + Math.max(0, planned[k]), 0);
  if (total < AREA_MIN_WEEK || !(plan > 0) || !(area in planned)) return false;
  return Math.max(0, minutes[area] ?? 0) / total > Math.max(0, planned[area]) / plan;
}

/** §11.5: the weakest / strongest area and whether each is past its planned share this week. */
export function areaStretch(values: Readonly<Record<string, number | null | undefined>>, minutes: Readonly<Record<string, number | undefined>>, planned: Readonly<Record<string, number>>): AreaStretch {
  const { weakest, strongest } = weakStrong(values);
  if (!weakest || !strongest) return NO_AREA_STRETCH;
  return { weakest, strongest, weakBeyond: beyondShare(minutes, planned, weakest), strongBeyond: beyondShare(minutes, planned, strongest) };
}

/** A drill take in `area` counts as the weaker area (stretch) — the weakest area, past its planned share. */
export const takeInWeakerArea = (a: AreaStretch, area: string | null | undefined): boolean => !!area && a.weakBeyond && a.weakest === area;

/** The answer tilt per area: ×1.2 on the weakest past its share, ×0.8 on the strongest past its share. */
export function areaTilt(a: AreaStretch): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  if (a.weakest && a.weakBeyond) out[a.weakest] = AREA_TILT.weak;
  if (a.strongest && a.strongBeyond) out[a.strongest] = AREA_TILT.strong;
  return out;
}

/** An answer's factor: the Elo factor (absent expected score: 1) × the area tilt, kept within 0.3–1.5. */
export function answerStretchFactor(expected: number | undefined, tilt = 1): number {
  const f = (expected === undefined ? 1 : answerFactor(expected)) * (Number.isFinite(tilt) && tilt > 0 ? tilt : 1);
  return Math.max(ANSWER_FACTOR_RANGE.min, Math.min(ANSWER_FACTOR_RANGE.max, f));
}

// ---------------------------------------------------------------- an instrument course: technique / improvisation

export type InstrumentArea = 'tech' | 'improv';

/** The area a practice screen's kind belongs to (practiceTime kindOfRoute): technique (drills, licks) or the
 *  improvisation share (improvising, the pieces coach); anything else is neither. */
export const instrumentAreaOfKind = (kind: string | null | undefined): InstrumentArea | null => (kind === 'technique' ? 'tech' : kind === 'improv' || kind === 'piece' ? 'improv' : null);

/** §11.5 for an instrument course: closeness to target per area, the week's minutes per area (sessionNeed
 *  weekAreaMinutes) and the planned technique share of technique + improvisation (workout2 DAY_SHARES). */
export function instrumentAreaStretch(close: { tech?: number; improv?: number } | undefined, week: { tech?: number; improv?: number } | undefined, techShare: number): AreaStretch {
  const t = Math.max(0, Math.min(1, techShare));
  return areaStretch({ tech: close?.tech, improv: close?.improv }, { tech: week?.tech, improv: week?.improv }, { tech: t, improv: 1 - t });
}

// ---------------------------------------------------------------- a listening course: its rated areas

/** The rated areas of a course that answers can tilt (the instrument area is the takes' business). */
export const answerAreasOf = (course: CourseId): DomainId[] => (COURSE_AREAS[course] ?? []).filter((d) => d !== 'instrument');

/** The last 7 days' minutes per area (the time booked under a rating skill: lessons, rated games). */
export function weekDomainMinutes(l: PracticeLedger, today: string, course: CourseId, areas: readonly DomainId[]): Partial<Record<DomainId, number>> {
  const s = summarize(l, addDay(today, -6), today, course);
  const out: Partial<Record<DomainId, number>> = {};
  for (const a of areas) out[a] = 0;
  const known = new Set<string>(SKILLS);
  for (const [k, ms] of Object.entries(s.bySkill)) {
    if (!known.has(k)) continue;
    const d = domainOf(k as SkillId);
    if (out[d] !== undefined) out[d] = out[d]! + ms / 60_000;
  }
  return out;
}

/**
 * §11.5 for lessons and ear answers: the tilt per area of the active course — weakest and strongest by the domain
 * ratings, the planned shares equal across the course's rated areas (the listening workout plans by review / new /
 * strengthen, not by area). Empty when the course has fewer than two such areas.
 */
export function answerAreaTilt(course: CourseId, ratings: Ratings, l: PracticeLedger, today: string): Partial<Record<DomainId, number>> {
  const areas = answerAreasOf(course);
  if (areas.length < 2) return {};
  const values = Object.fromEntries(areas.map((a) => [a, domainValue(ratings, a)?.v ?? null]));
  const planned = Object.fromEntries(areas.map((a) => [a, 1]));
  return areaTilt(areaStretch(values, weekDomainMinutes(l, today, course, areas), planned)) as Partial<Record<DomainId, number>>;
}

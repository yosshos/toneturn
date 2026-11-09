// Technique drills → the rest of the app (everything-connects): rated events for the Skill Map / path / stats,
// and XP for the weekly league. Pure.

import type { RatingEvent } from '../rating';
import type { Drill, TakeMetrics } from './types';
import { tempoBand } from './analyze';

/** Guitar / bass drills ('g-' families) rate the guitar technique sub-skill. */
export const isGuitarDrill = (drill: Drill): boolean => drill.spec.family.startsWith('g-') || drill.spec.family.startsWith('b-') || drill.spec.instrument === 'guitar' || drill.spec.instrument === 'bass';

/** Difficulty of a take: the tempo band (T1–T7) on the rating scale 600–1600, + a little for hands together. */
export function drillDifficulty(drill: Drill, m: TakeMetrics): number {
  const band = tempoBand(m.nps);
  return Math.round(Math.min(1600, 640 + band * 120 + (drill.spec.hands === 'RL' ? 60 : 0)));
}

/** Graded score 0..1: notes right × evenness (when it matters). */
export function drillScore(drill: Drill, m: TakeMetrics): number {
  const cvs = [m.cvR, m.cvL].filter((x): x is number => x !== null);
  const cv = cvs.length ? Math.max(...cvs) : 0;
  const even = drill.goal.evenness ? Math.max(0, Math.min(1, 1 - Math.max(0, cv - 0.03) * 8)) : 1;
  return Math.round(Math.max(0, Math.min(1, m.accuracy * (0.6 + 0.4 * even))) * 1000) / 1000;
}

/** Bass drills (the bass course, the old g-bass starter, any drill for the bass) rate the bass technique sub-skill. */
export const isBassTechDrill = (drill: Drill): boolean => drill.spec.family.startsWith('b-') || drill.spec.family === 'g-bass' || drill.spec.instrument === 'bass';

type Tags = NonNullable<RatingEvent['tags']>;
/**
 * What a take rates besides the technique sub-skill (BASS_AUDIT A11): bass time / pocket drills feed timing (the click
 * on 2 & 4 or the off-beats → "when the click moves", a click on 1 or fading → "through the gaps", the kick → steady
 * beat), walking lines feed progressions, chord-tone lines feed harmony; other evenness drills a little subdividing.
 */
function secondTag(drill: Drill): Tags[number] | null {
  const f = drill.spec.family;
  if (f === 'b-time') return { skill: 'timing', sub: drill.click === '24' || drill.click === 'and' ? 'timing/backbeat' : drill.click === 'one' || drill.click === 'fade' ? 'timing/gap' : 'timing/subdivide', w: 0.4 };
  if (f === 'b-pocket') return { skill: 'timing', sub: 'timing/steady', w: 0.4 };
  if (f === 'b-walk') return { skill: 'cadences', sub: 'cadences/progression', w: 0.3 };
  if (f === 'b-chord') return { skill: 'theory', sub: 'theory/harmony', w: 0.3 };
  if (drill.goal.evenness) return { skill: 'timing', sub: 'timing/subdivide', w: 0.2 };
  return null;
}

/**
 * One take = one graded rated event (instrument / piano technique — guitar technique for 'g-' families, bass technique
 * for bass drills — plus a timing / harmony share, see secondTag).
 * Ids use the 'g:drill:<session>:<i>' shape so the path groups a drill session like a game session.
 */
export function drillEvents(drill: Drill, m: TakeMetrics, at: string, sessionId: string, index: number): RatingEvent[] {
  const sub = isBassTechDrill(drill) ? 'instrument/bass-tech' : isGuitarDrill(drill) ? 'instrument/guitar-tech' : 'instrument/piano-tech';
  const two = secondTag(drill);
  const tags: Tags = two ? [{ skill: 'instrument', sub, w: Math.round((1 - two.w) * 10) / 10 }, two] : [{ skill: 'instrument', sub, w: 1 }];
  return [{ id: `g:drill:${sessionId}:${index}`, skill: 'instrument', difficulty: drillDifficulty(drill, m), correct: m.verdict === 'clean', score: drillScore(drill, m), tags, at }];
}

/** XP of a take (league effort): clean 4, almost 2, not yet 1. */
export const drillXp = (m: TakeMetrics): number => (m.verdict === 'clean' ? 4 : m.verdict === 'almost' ? 2 : 1);

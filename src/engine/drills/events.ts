// Technique drills → the rest of the app (everything-connects): rated events for the Skill Map / path / stats,
// and XP for the weekly league. Pure.

import type { RatingEvent } from '../rating';
import type { Drill, TakeMetrics } from './types';
import { tempoBand } from './analyze';

/** Guitar / bass drills ('g-' families) rate the guitar technique sub-skill. */
export const isGuitarDrill = (drill: Drill): boolean => drill.spec.family.startsWith('g-') || drill.spec.instrument === 'guitar' || drill.spec.instrument === 'bass';

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

/**
 * One take = one graded rated event (instrument / piano technique — guitar technique for 'g-' families, with a timing share for evenness drills).
 * Ids use the 'g:drill:<session>:<i>' shape so the path groups a drill session like a game session.
 */
export function drillEvents(drill: Drill, m: TakeMetrics, at: string, sessionId: string, index: number): RatingEvent[] {
  const sub = isGuitarDrill(drill) ? 'guitar-tech' : 'piano-tech';
  const tags: NonNullable<RatingEvent['tags']> = drill.goal.evenness
    ? [
        { skill: 'instrument', sub, w: 0.8 },
        { skill: 'timing', sub: 'subdivide', w: 0.2 },
      ]
    : [{ skill: 'instrument', sub, w: 1 }];
  return [{ id: `g:drill:${sessionId}:${index}`, skill: 'instrument', difficulty: drillDifficulty(drill, m), correct: m.verdict === 'clean', score: drillScore(drill, m), tags, at }];
}

/** XP of a take (league effort): clean 4, almost 2, not yet 1. */
export const drillXp = (m: TakeMetrics): number => (m.verdict === 'clean' ? 4 : m.verdict === 'almost' ? 2 : 1);

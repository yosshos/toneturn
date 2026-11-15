// Velocity bars (COURSE-FEEDBACK-UI §4.1, slice 5). Pure. A thin row under the score: one bar a note, its height the
// loudness in four steps (pp / p / mf / f) from the player's calibrated range; a hollow outline where the item asks for a
// level; a thick ink top on an accented note. Shown only when the item has a loudness, accent or velocity-evenness goal
// (goal.dynamics other than the voicing one, accents in the score, the drum goals on velocity) — the timing evenness
// every scale has is the review's "Even" chip, not this row.

import { velocityBand } from './analyze';
import type { Drill, DrillCalibration, ExpNote, NoteResult } from './types';

/** 1…4: pp, p, mf, f (and louder). */
export type VelStep = 1 | 2 | 3 | 4;

const FALLBACK: DrillCalibration = { latencyMs: 0, velMin: 20, velMax: 120 };
const calOf = (cal?: DrillCalibration): DrillCalibration => (cal && cal.velMax > cal.velMin + 10 ? cal : FALLBACK);

/** A velocity as one of four steps across the player's range (quarters of [velMin, velMax]). */
export function velStep(vel: number, cal?: DrillCalibration): VelStep {
  const c = calOf(cal);
  const share = (vel - c.velMin) / (c.velMax - c.velMin);
  return share < 0.25 ? 1 : share < 0.5 ? 2 : share < 0.75 ? 3 : 4;
}

/** Does the item have a goal this row shows? */
export function velBarsShown(drill: Drill): boolean {
  const g = drill.goal;
  if (g.dynamics && g.dynamics !== 'voicing') return true;
  const dg = g.drum;
  if (dg && (dg.velCv !== undefined || dg.levels !== undefined || dg.accentGap !== undefined || dg.ghost !== undefined || dg.balance !== undefined)) return true;
  return drill.notes.some((n) => n.accent || n.ghost || n.dyn);
}

/** The step a note should reach (a hollow outline), or null when the item sets no level for it. */
export function velTarget(drill: Drill, n: ExpNote, cal?: DrillCalibration): VelStep | null {
  const d = drill.goal.dynamics;
  const level = n.dyn ?? (n.ghost ? 'pp' : d && d.startsWith('even-') ? (d.slice(5) as 'pp' | 'p' | 'mf' | 'f' | 'ff') : null);
  if (!level) return null;
  const [a, b] = velocityBand(level, calOf(cal));
  return velStep((a + b) / 2, cal);
}

export interface VelBar {
  /** Loudness step, null = not played yet (or not settled). */
  step: VelStep | null;
  target: VelStep | null;
  accent: boolean;
}

/** One bar a note of the drill, in onset order (a chord's notes are one bar: its loudest). */
export function velBars(drill: Drill, results: NoteResult[] | null | undefined, cal?: DrillCalibration): VelBar[] {
  const key = (n: ExpNote) => `${n.hand}:${n.voice ?? ''}:${n.beat}:${n.pitch}`;
  const got = new Map<string, number>();
  for (const r of results ?? []) if (r.played) got.set(key(r.exp), r.played.vel);
  const groups = new Map<string, ExpNote[]>();
  for (const n of drill.notes) {
    const k = n.chordId !== undefined ? `c${n.chordId}` : n.voice ? `${n.beat}:${n.voice}` : `${n.beat}:${n.hand}:${n.pitch}`;
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }
  return [...groups.values()]
    .sort((a, b) => a[0].beat - b[0].beat)
    .map((g) => {
      const vs = g.map((n) => got.get(key(n))).filter((v): v is number => v !== undefined);
      return { step: vs.length ? velStep(Math.max(...vs), cal) : null, target: velTarget(drill, g[0], cal), accent: g.some((n) => !!n.accent) };
    });
}

// Groove trainer level test (GAMES_TIERS_PLAN §2.4, 0.70): the fading click at the tier's length and tempo — two bars
// with the click, `bars` silent bars, one bar back in. Measured: the share of silent beats tapped within the window,
// how close they sit (mean |offset|), and whether the time is still there when the click returns. Pure.

import { tierDef, type DynName } from './gameTiers';

export interface GrooveTierPlan {
  bpm: number;
  /** Silent bars. */
  bars: number;
  /** Bar-by-bar: true = the click sounds (2 in, `bars` silent, 1 back). */
  plan: boolean[];
  beatsPerBar: number;
}

export function grooveTierPlan(tier: DynName): GrooveTierPlan {
  const p = tierDef('groove', tier)?.params ?? {};
  const bars = Number(p.bars ?? 1);
  const bpm = Number(p.bpm ?? 90);
  return { bpm, bars, beatsPerBar: 4, plan: [true, true, ...Array<boolean>(bars).fill(false), true] };
}

/** The window (ms) a silent beat must land in: 12 % of the beat, 45–90 ms (as the fading-click exercise). */
export const grooveTol = (beatMs: number) => Math.max(45, Math.min(90, beatMs * 0.12));

export interface GrooveTierScore {
  /** 0..100: hit share of the silent beats × closeness, the returning bar must be in time. */
  accuracy: number;
  hits: number;
  beats: number;
  meanAbs: number | null;
  /** The bar after the silence starts within the window (the time was kept, not found again). */
  landed: boolean;
}

/**
 * Score per-beat offsets of a level test (`offs` for every beat of the plan, null = no tap). Only the silent bars and
 * the first beat back count.
 */
export function grooveTierScore(plan: GrooveTierPlan, offs: (number | null)[], beatMs: number): GrooveTierScore {
  const per = plan.beatsPerBar;
  const from = 2 * per;
  const silent = offs.slice(from, from + plan.bars * per);
  const back = offs[from + plan.bars * per] ?? null;
  const tol = grooveTol(beatMs);
  const inWin = silent.filter((o): o is number => o !== null && Math.abs(o) <= tol);
  const meanAbs = inWin.length ? inWin.reduce((a, b) => a + Math.abs(b), 0) / inWin.length : null;
  const share = silent.length ? inWin.length / silent.length : 0;
  const close = meanAbs === null ? 0 : Math.max(0, 1 - (meanAbs / tol) * 0.5);
  const landed = back !== null && Math.abs(back) <= tol * 1.4;
  const accuracy = Math.round(100 * share * close * (landed ? 1 : 0.85));
  return { accuracy, hits: inWin.length, beats: silent.length, meanAbs: meanAbs === null ? null : Math.round(meanAbs), landed };
}

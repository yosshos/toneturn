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
  /** 0.75 (ff odd meter): the bar's groups (7/8 = 2+2+3); their starts are accented. */
  groups?: number[];
}

// ---------------------------------------------------------------- ff parts (0.75)
// ff has four parts (the slow 8-bar fade and three more); the player picks one per run. Clearing ff = two of the last
// three runs at 85, with passing runs in two DIFFERENT parts (gameTiers distinctParts, owner 2026-11-12):
//   slow    the fading click, 8 silent bars at 60 (the tier's own plan).
//   odd     the fading click in 7/8 (2+2+3) on the 8th-note pulse — 2 bars in, 4 silent, 1 back.
//   pocket  lay back 30 ms against a band that pushes (its hits sit 15 ms ahead of the grid) — 8 bars.
//   swing   hear two bars of swung 8ths at a hidden ratio, then tap 8ths at that feel for four bars, alone.
export type GrooveFfPart = 'slow' | 'odd' | 'pocket' | 'swing';
export const GROOVE_FF_PARTS: GrooveFfPart[] = ['slow', 'odd', 'pocket', 'swing'];
export const ODD_PULSE_BPM = 168;
export const POCKET_BPM = 96;
/** The band pushes: its hits sit this far ahead of the grid (ms). */
export const BAND_PUSH_MS = 15;
/** The target: this far behind the band (ms). */
export const LAY_BACK_MS = 30;
export const POCKET_BARS = 8;
export const SWING_BPM = 120;

export function grooveTierPlan(tier: DynName, part?: GrooveFfPart): GrooveTierPlan {
  if (tier === 'ff' && part === 'odd') return { bpm: ODD_PULSE_BPM, bars: 4, beatsPerBar: 7, groups: [2, 2, 3], plan: [true, true, false, false, false, false, true] };
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

/** Accented pulses of a plan's bar (group starts; beat 1 without groups). */
export function accentsOf(plan: Pick<GrooveTierPlan, 'groups' | 'beatsPerBar'>): number[] {
  if (!plan.groups) return [0];
  const out: number[] = [];
  plan.groups.reduce((at, g) => (out.push(at), at + g), 0);
  return out;
}

/**
 * ff pocket: per-beat offsets measured against the BAND (its pushed hits), the first bar (count-in) left out. A beat is
 * in the pocket within ±15 ms of 30 ms behind the band; accuracy = share in the pocket × how many beats were played.
 */
export function pocketPartScore(offs: (number | null)[], beatsPerBar = 4): { accuracy: number; share: number; mean: number; played: number } {
  const xs = offs.slice(beatsPerBar);
  const hit = xs.filter((o): o is number => o !== null);
  const played = xs.length ? hit.length / xs.length : 0;
  const inP = hit.filter((o) => Math.abs(o - LAY_BACK_MS) <= 15).length;
  const share = hit.length ? inP / hit.length : 0;
  const mean = hit.length ? Math.round(hit.reduce((a, b) => a + b, 0) / hit.length) : 0;
  return { accuracy: Math.round(100 * share * Math.min(1, played / 0.9)), share, mean, played };
}

/** A hidden swing ratio for a run (0.55 … 0.72, the long eighth's share of the beat). */
export const hiddenSwing = (seed: number) => 0.55 + (((seed >>> 0) % 18) / 100);

/** ff swing: full marks within 2 % of the ratio, none 12 % away; no measurable off-beats = 0. */
export function swingPartScore(hidden: number, played: number | null): number {
  if (played === null) return 0;
  const d = Math.abs(played - hidden);
  return Math.round(100 * Math.max(0, Math.min(1, 1 - (d - 0.02) / 0.1)));
}

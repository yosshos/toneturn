// MEASUREMENT-AUDIT B7: the velocity range of the player's keyboard. One softest and one loudest key press moved
// every pp…ff band with a single accidental press; now several presses per end (their medians), a p / mf / f check,
// and a gentle refinement from real takes (the range only widens toward what the player really plays). Pure.

import type { DrillCalibration } from './types';
import { dynBand } from './touch';

/** Presses asked for at each end. */
export const CAL_PRESSES = 5;

const med = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
/** The p-th percentile (0..1) of some values, linear between ranks. */
export function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  const x = p * (s.length - 1);
  const lo = Math.floor(x);
  const hi = Math.min(s.length - 1, lo + 1);
  return s[lo] + (s[hi] - s[lo]) * (x - lo);
}

/**
 * The range from several presses at each end: the median of each (one stray press can't move it). Null when either
 * end has fewer than 3 presses or the ends are under 20 apart (the presses were not really soft / loud).
 */
export function calFromPresses(soft: number[], loud: number[]): { velMin: number; velMax: number } | null {
  if (soft.length < 3 || loud.length < 3) return null;
  const velMin = Math.round(med(soft));
  const velMax = Math.round(med(loud));
  if (velMax - velMin < 20) return null;
  return { velMin, velMax };
}

/**
 * The p / mf / f check: the three levels played in turn must come out in order, each a clear step (≥ 8 % of the span)
 * above the one before. `ok` per level = its median inside its band.
 */
export function checkLevels(cal: DrillCalibration, p: number[], mf: number[], f: number[]): { apart: boolean; inBand: { p: boolean; mf: boolean; f: boolean } } {
  const span = Math.max(1, cal.velMax - cal.velMin);
  const [a, b, c] = [p, mf, f].map((x) => (x.length ? med(x) : NaN));
  const apart = b - a >= 0.08 * span && c - b >= 0.08 * span;
  const inb = (v: number, l: 'p' | 'mf' | 'f') => {
    const [lo, hi] = dynBand(l, cal);
    return v >= lo - 0.05 * span && v <= hi + 0.05 * span;
  };
  return { apart, inBand: { p: inb(a, 'p'), mf: inb(b, 'mf'), f: inb(c, 'f') } };
}

/**
 * Refine the range from a real MIDI take (≥ 16 notes): the take's 5th / 95th percentiles pull the ends a quarter of the
 * way out when they lie beyond them by more than 3 — never in (an even-mf take must not shrink the range). Null when
 * nothing changes.
 */
export function refineCal(cal: DrillCalibration, vels: number[]): DrillCalibration | null {
  if (vels.length < 16) return null;
  const lo = percentile(vels, 0.05);
  const hi = percentile(vels, 0.95);
  let { velMin, velMax } = cal;
  if (lo < velMin - 3) velMin = Math.max(1, Math.round(velMin + 0.25 * (lo - velMin)));
  if (hi > velMax + 3) velMax = Math.min(127, Math.round(velMax + 0.25 * (hi - velMax)));
  return velMin !== cal.velMin || velMax !== cal.velMax ? { ...cal, velMin, velMax } : null;
}

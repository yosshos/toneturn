// Encore difficulty — the calibration target and the observed-data step (SPEC-PHRASE-STUDIO §10.8.3 and §10.8.8).
//
// §10.8.3 sets the target for the difficulty model against the placed built-in levels: Spearman ρ ≥ 0.8, mean absolute
// error ≤ 90 points (one grade), and no family's levels out of order. The note-feature model (PHRASE_DIFF_V 2) reaches
// ρ 0.81 / error 123 on the 62 note-measurable piano levels (§10.8.7); the spec's own analysis is that what remains is
// the families' curricular order, which the notes do not show and only observed pass rates can measure (§10.8.8).
//
// This module is that measurement, pure: from (player rating, passed) observations of an item it estimates the item's
// empirical difficulty — the rating at which players pass it half the time, on the app's Elo scale
// (rating.ts: E = 1 / (1 + 10^((D − R) / 400))) — and reports the target per family and overall, with the items whose
// empirical difficulty drifts more than 150 points from the model listed for review. It never changes the model's
// weights or any XP (weights change only in a release, §10.8.5).

import { expected } from '../rating';

/** §10.8.3: the targets. */
export const TARGET = { rho: 0.8, mae: 90 } as const;
/** §10.8.8: an item whose empirical difficulty is this far from the model is listed for review. */
export const DRIFT = 150;
/** Fewer observations than this, or only passes / only misses, give no estimate. */
export const MIN_OBS = 12;

export interface Obs {
  rating: number;
  passed: boolean;
}

/**
 * The item's empirical difficulty: the maximum-likelihood D of the Elo curve given the observations, found by bisection
 * on the score equation Σ(passed − E(R, D)) = 0 (increasing in D). Null without enough evidence on both sides.
 */
export function empiricalDifficulty(obs: readonly Obs[], lo = 300, hi = 2600): number | null {
  if (obs.length < MIN_OBS) return null;
  const passes = obs.filter((o) => o.passed).length;
  if (passes === 0 || passes === obs.length) return null;
  const g = (D: number) => obs.reduce((s, o) => s + (o.passed ? 1 : 0) - expected(o.rating, D), 0);
  // g rises with D (a harder item predicts fewer passes, so the observed passes exceed the prediction)
  let a = lo;
  let b = hi;
  if (g(a) > 0 || g(b) < 0) return null;
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    if (g(m) < 0) a = m;
    else b = m;
  }
  return Math.round((a + b) / 2);
}

export interface CalItem {
  id: string;
  family: string;
  /** The item's place in its family's curricular order (levels 1, 2, …). */
  order: number;
  /** The difficulty model's D. */
  model: number;
  obs: readonly Obs[];
}
export interface CalReport {
  n: number;
  rho: number | null;
  mae: number | null;
  /** Families whose empirical difficulties run against their curricular order (an easier level after a harder one by > DRIFT / 2). */
  outOfOrder: string[];
  perFamily: { family: string; n: number; rho: number | null; mae: number | null }[];
  /** |empirical − model| > DRIFT, largest first. */
  review: { id: string; model: number; empirical: number; drift: number }[];
  /** The §10.8.3 target met on the observed data. */
  met: boolean;
}

const rank = (xs: number[]) => {
  const s = xs.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  // ties share their mean rank
  for (let i = 0; i < s.length; ) {
    let j = i;
    while (j + 1 < s.length && s[j + 1][0] === s[i][0]) j++;
    for (let k = i; k <= j; k++) r[s[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
};
/** Spearman's ρ (Pearson on ranks; null below 3 pairs or without spread). */
export function spearman(a: readonly number[], b: readonly number[]): number | null {
  const n = a.length;
  if (n < 3 || b.length !== n) return null;
  const ra = rank([...a]);
  const rb = rank([...b]);
  const ma = ra.reduce((s, x) => s + x, 0) / n;
  const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

/** The calibration report on observed data (items without an estimate are left out). */
export function calibrationReport(items: readonly CalItem[]): CalReport {
  const est = items.map((it) => ({ it, e: empiricalDifficulty(it.obs) })).filter((x): x is { it: CalItem; e: number } => x.e !== null);
  const stats = (xs: typeof est) => ({
    n: xs.length,
    rho: spearman(
      xs.map((x) => x.e),
      xs.map((x) => x.it.model),
    ),
    mae: xs.length ? xs.reduce((s, x) => s + Math.abs(x.e - x.it.model), 0) / xs.length : null,
  });
  const fams = [...new Set(est.map((x) => x.it.family))].sort();
  const perFamily = fams.map((family) => ({ family, ...stats(est.filter((x) => x.it.family === family)) }));
  const outOfOrder = fams.filter((f) => {
    const xs = est.filter((x) => x.it.family === f).sort((a, b) => a.it.order - b.it.order);
    let top = -Infinity;
    for (const x of xs) {
      if (x.e < top - DRIFT / 2) return true;
      top = Math.max(top, x.e);
    }
    return false;
  });
  const review = est
    .map((x) => ({ id: x.it.id, model: x.it.model, empirical: x.e, drift: Math.abs(x.e - x.it.model) }))
    .filter((x) => x.drift > DRIFT)
    .sort((a, b) => b.drift - a.drift);
  const all = stats(est);
  const met = all.rho !== null && all.mae !== null && all.rho >= TARGET.rho && all.mae <= TARGET.mae && !outOfOrder.length;
  return { ...all, outOfOrder, perFamily, review, met };
}

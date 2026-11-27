// Statistics for the Phase A rules (SPEC-HOLISTIC-2 §1.6, §1.7): the beta posterior, the regularised incomplete beta
// function, the n_eff design effect, and logistic helpers. Pure.

export const logistic = (x: number): number => 1 / (1 + Math.exp(-x));
export const logit = (p: number): number => Math.log(p / (1 - p));

/** ln Γ(x), Lanczos approximation (g = 7, n = 9). */
export function lgamma(x: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Continued fraction for the incomplete beta function (Numerical Recipes betacf). */
function betacf(a: number, b: number, x: number): number {
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** The regularised incomplete beta I_x(a, b) = P(p ≤ x) for p ~ Beta(a, b); real a, b > 0. */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(lbt);
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** The q-quantile of Beta(a, b), by bisection. */
export function betaQuantile(q: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The pooled dependence defaults (§1.7, §9.1): ρ_d = 0.15 (same day), ρ_c = 0.20 (same cell), until fitted. */
export const RHO_DAY = 0.15;
export const RHO_CELL = 0.2;
/**
 * Round 17 (review #4): the slump / re-promotion decisions are about the learner's ability at the tier (fresh cells), so
 * calibration is scored against the tier's fresh-cell p. ρ_c = 0.20 over-covers that estimand; this re-tuned value gives
 * ≈ 80 % coverage of the 80 % interval under the spec's shared supply (docs/MEASURE-R17-REPORT.txt §3). Proposed, not yet
 * the default (RHO_CELL stays the decision value until the owner decides).
 */
export const RHO_CELL_TIER = 0.1;

/**
 * §1.7 "dependence aware": the design effect 1 + (m_d − 1)ρ_d + (m_c − 1)ρ_c, with m_d = looks per day and m_c = looks
 * per cell (n / distinct days, n / distinct cells). n_eff = n / design effect.
 */
export function designEffect(n: number, days: number, cells: number, rhoD = RHO_DAY, rhoC = RHO_CELL): number {
  if (n <= 0) return 1;
  const md = n / Math.max(1, days);
  const mc = n / Math.max(1, cells);
  return 1 + (md - 1) * rhoD + (mc - 1) * rhoC;
}

/** A Beta(1, 1)-prior posterior from (possibly fractional) success / failure counts. */
export interface BetaPost {
  a: number;
  b: number;
}
export const betaPost = (s: number, f: number): BetaPost => ({ a: 1 + s, b: 1 + f });
/** P(p ≥ x | posterior). */
export const pAtLeast = (post: BetaPost, x: number): number => 1 - betaCdf(x, post.a, post.b);
/** P(p < x | posterior). */
export const pBelow = (post: BetaPost, x: number): number => betaCdf(x, post.a, post.b);

/** Gauss–Hermite-free marginal: E[logistic(mu + sd·Z)], Z ~ N(0, 1), by a fine grid (|z| ≤ 6). */
export function marginalP(mu: number, sd: number): number {
  if (sd <= 0) return logistic(mu);
  let s = 0;
  let w = 0;
  for (let z = -6; z <= 6.0001; z += 0.05) {
    const d = Math.exp(-0.5 * z * z);
    s += d * logistic(mu + sd * z);
    w += d;
  }
  return s / w;
}

/** The logit mean mu for which marginalP(mu, sd) = p (bisection). */
export function muForMarginal(p: number, sd: number): number {
  let lo = -15;
  let hi = 15;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (marginalP(mid, sd) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Quantile of a sorted copy (linear interpolation). NaN for an empty list. */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

// The threshold estimate (SPEC-HOLISTIC-2 §1.9) for the harness's H10 tempo model. Pure.
//
// A MAP logistic fit over an item's cold trials at their actual tempos (log tempo, × target):
//   P(clean | x = ln f) = logistic( logit(pTarget) + slope · (τ − x) )
// so τ is the log tempo at which the cold success rate is pTarget (0.707, what a 2-up-1-down staircase tracks). The
// slope is fixed from the catalogue (β / ln(tempo step)); the prior on τ is centred on the item's start tempo; trials are
// recency-weighted (half-life 10 days); "provisional" before 6 trials.

import { logistic, logit } from './stats';

export interface ColdTrial {
  day: number;
  /** Tempo, × target. */
  f: number;
  clean: boolean;
}

export interface ThresholdOpts {
  slope: number;
  priorSd: number;
  halfLifeDays: number;
  pTarget: number;
  minTrials: number;
}

export const THRESHOLD: ThresholdOpts = { slope: 1.2 / Math.log(1.2), priorSd: 0.25, halfLifeDays: 10, pTarget: 0.707, minTrials: 6 };

export interface ThresholdEstimate {
  /** The threshold tempo, × target. */
  f: number;
  /** Posterior SD of ln f. */
  sd: number;
  provisional: boolean;
}

/** The §1.9 threshold estimate on `today` from the cold trials, with the prior centred on `priorF` (× target). */
export function thresholdEstimate(trials: ColdTrial[], today: number, priorF: number, o: ThresholdOpts = THRESHOLD): ThresholdEstimate {
  const mu = Math.log(priorF);
  const a = logit(o.pTarget);
  let tau = mu;
  let h = 1 / (o.priorSd * o.priorSd);
  for (let it = 0; it < 25; it++) {
    let g = -(tau - mu) / (o.priorSd * o.priorSd);
    h = 1 / (o.priorSd * o.priorSd);
    for (const t of trials) {
      const w = Math.pow(0.5, (today - t.day) / o.halfLifeDays);
      const p = logistic(a + o.slope * (tau - Math.log(t.f)));
      g += w * o.slope * ((t.clean ? 1 : 0) - p);
      h += w * o.slope * o.slope * p * (1 - p);
    }
    const step = g / h;
    tau += Math.max(-0.5, Math.min(0.5, step));
    if (Math.abs(step) < 1e-6) break;
  }
  return { f: Math.exp(tau), sd: 1 / Math.sqrt(h), provisional: trials.length < o.minTrials };
}

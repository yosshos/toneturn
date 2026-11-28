// Synthetic learners for the harness (SPEC-HOLISTIC-2 §9.1). Pure.
//
// True cold success on a cell of content tier c, on local day d:
//   p = logistic( β·(θ(h) − c) + u_cell + v_day + g·(1 − e^(−visits / v½)) + shift(d) )
// θ(h) = θ0 + rate·h rises with practice hours h in the area (optionally capped); u_cell ~ N(0, sdCell) is fixed per
// cell, v_day ~ N(0, sdDay) is shared by every take that day. Warm takes add `warmBoost` logits (the warm-up decrement
// read the other way). Not modelled: forgetting, fatigue within a session, input noise (see report).

import { normal, type Rng } from './prng';
import { logistic, marginalP, muForMarginal } from './stats';

export interface LearnerParams {
  /** Ability in tier units at h = 0: cold p = 0.5 at tier θ (before random effects). */
  theta0: number;
  /** Tiers gained per practice hour in the area. */
  rate: number;
  /** Optional ceiling on θ. */
  thetaMax?: number;
  /** Logit slope per tier. */
  beta: number;
  /** Extra logits on warm (non-cold) takes. */
  warmBoost: number;
  /** Day random effect SD (logit), §9.1 default 0.8. */
  sdDay: number;
  /** Cell random effect SD (logit), §9.1 default 0.7. */
  sdCell: number;
  /** Item-specific practice gain (logits at saturation) and its half-visits scale. */
  itemGain: number;
  itemHalf: number;
  /** Extra logits by local day (a temporary dip, an injury…). */
  shift?: (day: number) => number;
  /**
   * The tempo axis (used only by the H10 tempo model, §1.7a / §1.9): a take at f × target is ln(f) / ln(tempoStep) tiers
   * harder (one content tier ≈ one tempo tier, a ×1.2 tempo ratio). f = 1 (the default everywhere else) changes nothing.
   */
  tempoStep?: number;
}

export const DEFAULT_LEARNER: LearnerParams = { theta0: 0, rate: 0.25, beta: 1.2, warmBoost: 0.8, sdDay: 0.8, sdCell: 0.7, itemGain: 0, itemHalf: 6 };
/** The default tempo ratio per tier (§1.7a tempo model). */
export const TEMPO_STEP = 1.2;
/** Difficulty, in tiers, of tier `c` played at `f` × target. */
export const tempoDifficulty = (c: number, f: number, step = TEMPO_STEP): number => c + Math.log(f) / Math.log(step);

/**
 * θ for which the marginal cold p (over the day and cell effects) at tier c equals p — "a learner whose cold p at the
 * next tier is 0.75" (§9.1 typical learners).
 */
export function thetaForP(p: number, c: number, lp: Pick<LearnerParams, 'beta' | 'sdDay' | 'sdCell'>): number {
  const sd = Math.sqrt(lp.sdDay ** 2 + lp.sdCell ** 2);
  return c + muForMarginal(p, sd) / lp.beta;
}

export class Learner {
  hours = 0;
  private days = new Map<number, number>();
  private cells = new Map<string, number>();
  constructor(readonly p: LearnerParams, private readonly rng: Rng) {}

  theta(): number {
    const t = this.p.theta0 + this.p.rate * this.hours;
    return this.p.thetaMax === undefined ? t : Math.min(this.p.thetaMax, t);
  }
  dayEffect(day: number): number {
    let v = this.days.get(day);
    if (v === undefined) this.days.set(day, (v = normal(this.rng) * this.p.sdDay));
    return v;
  }
  cellEffect(cell: string): number {
    let v = this.cells.get(cell);
    if (v === undefined) this.cells.set(cell, (v = normal(this.rng) * this.p.sdCell));
    return v;
  }
  /** The logit of a take before the day effect. */
  private base(tier: number, cell: string, visits: number, day: number, f = 1): number {
    const g = this.p.itemGain * (1 - Math.exp(-visits / this.p.itemHalf));
    const d = f === 1 ? tier : tempoDifficulty(tier, f, this.p.tempoStep ?? TEMPO_STEP);
    return this.p.beta * (this.theta() - d) + this.cellEffect(cell) + g + (this.p.shift ? this.p.shift(day) : 0);
  }
  /** P(clean) of a take today (at f × target; f = 1 unless the tempo model is on). */
  pTake(tier: number, cell: string, day: number, visits: number, warm: boolean, f = 1): number {
    return logistic(this.base(tier, cell, visits, day, f) + this.dayEffect(day) + (warm ? this.p.warmBoost : 0));
  }
  /** Draw a take. */
  take(tier: number, cell: string, day: number, visits: number, warm: boolean, f = 1): boolean {
    return this.rng() < this.pTake(tier, cell, day, visits, warm, f);
  }
  /** Truth: the cell's cold p marginal over the day effect (the cell effect and item practice included). */
  trueCellP(tier: number, cell: string, day: number, visits: number, f = 1): number {
    return marginalP(this.base(tier, cell, visits, day, f), this.p.sdDay);
  }
  /**
   * Truth: a cell of the tier with `visits` of item practice, marginal over day and cell effects (its own cell effect not
   * known): the item-practice gain counted, the cell's luck not. visits 0 = trueTierP.
   */
  trueTierPAfter(tier: number, day: number, visits: number, f = 1): number {
    const g = this.p.itemGain * (1 - Math.exp(-visits / this.p.itemHalf));
    const d = f === 1 ? tier : tempoDifficulty(tier, f, this.p.tempoStep ?? TEMPO_STEP);
    const mu = this.p.beta * (this.theta() - d) + g + (this.p.shift ? this.p.shift(day) : 0);
    return marginalP(mu, Math.sqrt(this.p.sdDay ** 2 + this.p.sdCell ** 2));
  }
  /** Truth: the tier's cold p marginal over day and cell effects (a fresh cell, no item practice), at f × target. */
  trueTierP(tier: number, day = 0, f = 1): number {
    const d = f === 1 ? tier : tempoDifficulty(tier, f, this.p.tempoStep ?? TEMPO_STEP);
    const mu = this.p.beta * (this.theta() - d) + (this.p.shift ? this.p.shift(day) : 0);
    return marginalP(mu, Math.sqrt(this.p.sdDay ** 2 + this.p.sdCell ** 2));
  }
}

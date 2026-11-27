// The §9.1 / §17.4 harness numbers (SPEC-HOLISTIC-2). Each experiment is seeded and pure; `runs` sets the precision.

import { defaultCatalogue, syntheticCatalogue, topTier, type AreaCatalogue } from './catalogue';
import { ItemPassTracker } from './itemPass';
import { DEFAULT_LEARNER, thetaForP, type LearnerParams } from './learner';
import { childSeed, mulberry32, normal, randInt } from './prng';
import { nonEmptyTiers } from './rank';
import { runReadingTier, simulateReadingArea } from './readingSim';
import { simulate, type PlannerConfig } from './simulate';
import { logistic, logit, muForMarginal, quantile } from './stats';

// ---------------------------------------------------------------- 1. P(item pass | cold clean rate) (§1.6)

/** Exact P(two consecutive cold cleans within k counting cold checks), cold clean rate p (the pair rule, §1.6). */
export function pPairWithin(p: number, k: number): number {
  // DP over states: 0 = no pending clean, 1 = one pending clean.
  let s0 = 1;
  let s1 = 0;
  let done = 0;
  for (let i = 0; i < k; i++) {
    done += s1 * p;
    const n1 = s0 * p;
    const n0 = (s0 + s1) * (1 - p);
    s0 = n0;
    s1 = n1;
  }
  return done;
}

/**
 * The item pass through the real tracker in a realistic flow: a cell visited on practice days (4/week by default),
 * each visit = the cold check then 4 warm takes; cold p = p (marginal), warm = +0.8 logit, a shared day effect (SD 0.8).
 * Returns P(passed within `days` calendar days).
 */
export function itemPassFlow(p: number, days: number, runs: number, seed: number, o: { dpw?: number; sdDay?: number; warmBoost?: number; warmTakes?: number } = {}): number {
  const dpw = o.dpw ?? 4;
  const sdDay = o.sdDay ?? 0.8;
  const mu = muForMarginal(p, sdDay);
  let passed = 0;
  for (let r = 0; r < runs; r++) {
    const rng = mulberry32(childSeed(seed, r));
    const tr = new ItemPassTracker();
    let week = new Set<number>();
    for (let day = 0; day < days && tr.passedAt === null; day++) {
      if (day % 7 === 0) {
        const d = [0, 1, 2, 3, 4, 5, 6].sort(() => rng() - 0.5);
        week = new Set(d.slice(0, dpw));
      }
      if (!week.has(day % 7)) continue;
      const v = normal(rng) * sdDay;
      let at = day * 24 + 7 + rng() * 15;
      tr.add({ at, day, clean: rng() < logistic(mu + v), cold: true, firstColdOfDay: true, atTarget: true });
      for (let k = 0; k < (o.warmTakes ?? 4); k++) {
        at += 0.03;
        tr.add({ at, day, clean: rng() < logistic(mu + v + (o.warmBoost ?? 0.8)), cold: false, firstColdOfDay: false, atTarget: true });
      }
    }
    if (tr.passedAt !== null) passed++;
  }
  return passed / runs;
}

// ---------------------------------------------------------------- 2. Reading / transfer false passes and time to pass

export interface ReadingSchedule {
  attemptsPerDay: number;
  practiceDaysPerWeek: number;
}
export const READING_SCHEDULE: ReadingSchedule = { attemptsPerDay: 4, practiceDaysPerWeek: 4 };
export const TRANSFER_SCHEDULE: ReadingSchedule = { attemptsPerDay: 2, practiceDaysPerWeek: 4 };

/** §1.6 false-pass rate: P(the tier passes within `days`) for a learner whose true marginal p is fixed. */
export function readingFalsePass(p: number, days: number, runs: number, seed: number, s: ReadingSchedule = READING_SCHEDULE, sdDay = 0.8, sdItem = 0.7): number {
  let n = 0;
  for (let r = 0; r < runs; r++) if (runReadingTier({ pOf: () => p, sdDay, sdItem, ...s, days, seed: childSeed(seed, r) }).passDay >= 0) n++;
  return n / runs;
}

/** §1.6 time to pass for a learner improving from p0 to p1 (linear in logit over `rampDays` calendar days, then flat). */
export function readingTimeToPass(runs: number, seed: number, o: { p0?: number; p1?: number; rampDays?: number; days?: number; s?: ReadingSchedule } = {}): { medianDay: number; p90Day: number; passed: number; medianPAtPass: number; medianAttempts: number } {
  const p0 = o.p0 ?? 0.3;
  const p1 = o.p1 ?? 0.85;
  const ramp = o.rampDays ?? 42;
  const pOf = (d: number) => logistic(logit(p0) + (logit(p1) - logit(p0)) * Math.min(1, d / ramp));
  const days: number[] = [];
  const ps: number[] = [];
  const atts: number[] = [];
  for (let r = 0; r < runs; r++) {
    const res = runReadingTier({ pOf, sdDay: 0.8, sdItem: 0.7, ...(o.s ?? READING_SCHEDULE), days: o.days ?? 120, seed: childSeed(seed, r) });
    if (res.passDay >= 0) {
      days.push(res.passDay);
      ps.push(res.pAtPass);
      atts.push(res.attempts);
    }
  }
  return { medianDay: quantile(days, 0.5), p90Day: quantile(days, 0.9), passed: days.length / runs, medianPAtPass: quantile(ps, 0.5), medianAttempts: quantile(atts, 0.5) };
}

// ---------------------------------------------------------------- 3. Calendar days per tier (rank, H8)

export interface TierTime {
  from: number | null;
  to: number;
  median: number;
  p90: number;
  /** Share that reached `to` within the cap. */
  reached: number;
}

/**
 * Calendar days from rank R to the next non-empty tier, for a learner whose true cold p at that next tier is `pNext`
 * (fixed ability, no item-practice gain: the conservative case), starting with rankHW = placedTier = R.
 */
export function daysPerTier(cat: AreaCatalogue, pNext: number, dpw: number, runs: number, seed: number, cap = 240, lp: Partial<LearnerParams> = {}, planner: Partial<PlannerConfig> = {}): TierTime[] {
  const tiers = nonEmptyTiers(cat.exercises);
  const out: TierTime[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const from = i === 0 ? null : tiers[i - 1];
    const to = tiers[i];
    const L: LearnerParams = { ...DEFAULT_LEARNER, ...lp, rate: 0 };
    L.theta0 = thetaForP(pNext, to, L);
    const d: number[] = [];
    let reached = 0;
    for (let r = 0; r < runs; r++) {
      const res = simulate({ catalogue: cat, learner: L, planner: { ...planner, practiceDaysPerWeek: dpw }, days: cap, seed: childSeed(seed, r * 31 + i), placedTier: from ?? 0, rankHW: from, stopWhenRank: to, noPlacementCorrection: true });
      const day = res.rankDay.get(to);
      if (day !== undefined) {
        reached++;
        d.push(day + 1);
      } else d.push(cap);
    }
    out.push({ from, to, median: quantile(d, 0.5), p90: quantile(d, 0.9), reached: reached / runs });
  }
  return out;
}

// ---------------------------------------------------------------- 4. Wrong demotions, calibration, re-promotion (§1.7)

export interface DemotionReport {
  /** Share of learners with ≥ 1 wrong demotion (truth ≥ 0.75) in the measured window. */
  wrongRate: number;
  /** Share with any slump. */
  anySlump: number;
  /** 80 % interval coverage of the window posterior (n_eff) and of the naive posterior (raw n). */
  coverage: number;
  naiveCoverage: number;
  bias: number;
  rmse: number;
  /** Median true p (passed cells at tiers ≥ the tier left) over all slumps in the window. */
  slumpTruthMedian: number;
  /** Share of learners whose rank rose above R during the run (their current form then reads harder cells). */
  rankRose: number;
}

/**
 * §1.7 / §9.1 wrong demotions per 90 days: learners with fixed ability whose true cold p at their placed tier R is
 * `pAtRank`, burn-in `burn` days (passes accrue, rank and current form follow), then a 90-day measured window. A slump is
 * wrong when the true mean cold p of the passed cells at tiers ≥ the tier left is ≥ 0.75.
 */
export function wrongDemotion(pAtRank: number, runs: number, seed: number, o: { dpw?: number; slots?: number; burn?: number; window?: number; R?: number; cat?: AreaCatalogue } = {}): DemotionReport {
  const cat = o.cat ?? defaultCatalogue();
  const R = o.R ?? 3;
  const burn = o.burn ?? 60;
  const win = o.window ?? 90;
  const L: LearnerParams = { ...DEFAULT_LEARNER, rate: 0 };
  L.theta0 = thetaForP(pAtRank, R, L);
  let wrong = 0;
  let any = 0;
  let rose = 0;
  const truths: number[] = [];
  const cal = { n: 0, hits: 0, naive: 0, bias: 0, sq: 0 };
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, learner: L, planner: { practiceDaysPerWeek: o.dpw ?? 4, confirmSlots: o.slots ?? 2 }, days: burn + win, seed: childSeed(seed, r), placedTier: R, noPlacementCorrection: true });
    const inWin = res.slumps.filter((s) => s.day >= burn);
    if (inWin.some((s) => s.truth >= 0.75)) wrong++;
    if (inWin.length) any++;
    if ((res.finalRank ?? -1) > R) rose++;
    for (const s of inWin) truths.push(s.truth);
    cal.n += res.calib.n;
    cal.hits += res.calib.hits;
    cal.naive += res.calib.naiveHits;
    cal.bias += res.calib.bias;
    cal.sq += res.calib.sq;
  }
  return { wrongRate: wrong / runs, anySlump: any / runs, coverage: cal.hits / Math.max(1, cal.n), naiveCoverage: cal.naive / Math.max(1, cal.n), bias: cal.bias / Math.max(1, cal.n), rmse: Math.sqrt(cal.sq / Math.max(1, cal.n)), slumpTruthMedian: quantile(truths, 0.5), rankRose: rose / runs };
}

/**
 * Re-promotion time: a learner at p = `pAtRank` (rank R reached in burn-in), a dip of `dipLogit` for `dipDays`, then
 * back. Returns the share that slumped during the dip and the median days from the dip's end until current form is
 * back at its pre-dip value (not at rank: rank often sits above the learner's cold level, see report), plus the share
 * of learners whose pre-dip current form was already below rank.
 */
export function repromotion(runs: number, seed: number, o: { pAtRank?: number; dipLogit?: number; dipDays?: number; burn?: number; after?: number; dpw?: number; slots?: number } = {}): { slumped: number; recovered: number; medianDays: number; p90Days: number; cfBelowRankBefore: number } {
  const cat = defaultCatalogue();
  const R = 3;
  const burn = o.burn ?? 90;
  const dipDays = o.dipDays ?? 28;
  const after = o.after ?? 120;
  const L0: LearnerParams = { ...DEFAULT_LEARNER, rate: 0 };
  const theta0 = thetaForP(o.pAtRank ?? 0.85, R, L0);
  let slumped = 0;
  let recovered = 0;
  let below = 0;
  const days: number[] = [];
  for (let r = 0; r < runs; r++) {
    const L: LearnerParams = { ...L0, theta0, shift: (d) => (d >= burn && d < burn + dipDays ? -(o.dipLogit ?? 3) : 0) };
    const res = simulate({ catalogue: cat, learner: L, planner: { practiceDaysPerWeek: o.dpw ?? 4, confirmSlots: o.slots ?? 2 }, days: burn + dipDays + after, seed: childSeed(seed, r), placedTier: R, noPlacementCorrection: true, recordDaily: true });
    const pre = res.daily[burn - 1];
    if (pre.cf !== null && pre.rank !== null && pre.cf < pre.rank) below++;
    const dipSlump = res.slumps.some((s) => s.day >= burn && s.day < burn + dipDays + 14);
    if (!dipSlump || pre.cf === null) continue;
    slumped++;
    const end = burn + dipDays;
    const back = res.daily.find((d) => d.day >= end && d.cf !== null && d.cf >= (pre.cf as number));
    if (back) {
      recovered++;
      days.push(back.day - end);
    } else days.push(after);
  }
  return { slumped: slumped / runs, recovered: recovered / Math.max(1, slumped), medianDays: quantile(days, 0.5), p90Days: quantile(days, 0.9), cfBelowRankBefore: below / runs };
}

// ---------------------------------------------------------------- 5. Climbs, stalls, placement, gaming (§1.3, §1.7)

/** A steadily improving beginner: cold p 0.6 at T0, +0.25 tiers per practice hour (≈ 1 tier / 3 weeks at 4×20 min). */
export const STEADY_LEARNER = (top = 9): LearnerParams => {
  const L = { ...DEFAULT_LEARNER, thetaMax: top };
  return { ...L, theta0: thetaForP(0.6, 0, L) };
};

export interface ClimbReport {
  name: string;
  perTier: number[];
  /** Target tier: T5, the next non-empty tier if T5 is empty, or the top tier with content if lower. */
  target: number;
  reachedTarget: number;
  medianDaysToTarget: number;
  /** Every non-empty tier reached (rank touched or passed it). */
  reachedAll: number;
  /** Learners with a stall: ≥ 42 days at true p ≥ 0.85 on the next tier without a rank rise. */
  stalls: number;
  worstStall: number;
  worstStallTier: number | null;
  /** Median true marginal cold p at the new rank tier, at the moment of each rank rise. */
  medianPAtRankUp: number;
  /** Share of rank rises where that p was < 0.5. */
  rankUpBelowHalf: number;
}

/** §1.3 / §9.1 rotation-only climb from T0 (no placement), `days` long. */
export function climb(cat: AreaCatalogue, runs: number, seed: number, days = 365, lp: LearnerParams = STEADY_LEARNER(), planner: Partial<PlannerConfig> = {}): ClimbReport {
  const tiers = nonEmptyTiers(cat.exercises);
  const top = topTier(cat);
  // T5, or the first non-empty tier above it when T5 is empty, or the top tier when the area stops below T5.
  const target = tiers.find((t) => t >= 5) ?? top;
  const perTier = Array.from({ length: top + 1 }, (_, t) => cat.exercises.filter((e) => e.available && e.tier === t).length);
  const d: number[] = [];
  let reached = 0;
  let all = 0;
  let stalls = 0;
  let worst = 0;
  let worstTier: number | null = null;
  const ups: number[] = [];
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, learner: lp, planner, days, seed: childSeed(seed, r) });
    for (const u of res.rankTruth) ups.push(u.p);
    const t = [...res.rankDay.entries()].filter(([k]) => k >= target).map(([, v]) => v);
    if (t.length) {
      reached++;
      d.push(Math.min(...t));
    } else d.push(days);
    if (res.finalRank !== null && res.finalRank >= top) all++;
    if (res.longestStall >= 42) stalls++;
    if (res.longestStall > worst) {
      worst = res.longestStall;
      worstTier = res.stallTier;
    }
  }
  return { name: cat.name, perTier, target, reachedTarget: reached / runs, medianDaysToTarget: quantile(d, 0.5), reachedAll: all / runs, stalls, worstStall: worst, worstStallTier: worstTier, medianPAtRankUp: quantile(ups, 0.5), rankUpBelowHalf: ups.filter((p) => p < 0.5).length / Math.max(1, ups.length) };
}

/** The tier a learner truly is at: the highest tier with marginal cold p ≥ 0.75. */
export const trueTier = (theta: number, lp: LearnerParams): number => Math.floor(theta - thetaForP(0.75, 0, lp));

/**
 * §1.3 placement: `offset` = placedTier − true tier (0 = correctly placed). Tempo areas use the default synthetic
 * catalogue, non-tempo the reading area. Returns the share corrected, the median day of the first drop, and the median
 * day placedTier first reaches the true tier (or rank reaches placedTier, which ends "placed").
 */
export function placementRun(offset: number, tempo: boolean, runs: number, seed: number, o: { days?: number; trueAt?: number; pAtTrue?: number } = {}): { corrected: number; medianFirstDrop: number; medianSettled: number; settled: number } {
  const days = o.days ?? 180;
  const T = o.trueAt ?? 1;
  const L: LearnerParams = { ...DEFAULT_LEARNER, rate: 0.05 };
  L.theta0 = thetaForP(o.pAtTrue ?? 0.75, T, L);
  let corrected = 0;
  let settled = 0;
  const first: number[] = [];
  const settle: number[] = [];
  for (let r = 0; r < runs; r++) {
    const placed = T + offset;
    let drops: { day: number; to: number }[];
    if (tempo) drops = simulate({ catalogue: defaultCatalogue(), learner: L, days, seed: childSeed(seed, r), placedTier: placed }).placementDrops;
    else drops = simulateReadingArea({ catalogue: syntheticCatalogue('reading', [3, 3, 3, 3, 3, 3, 3, 3], 0, false), theta0: L.theta0, rate: L.rate, beta: L.beta, sdDay: 0.8, sdItem: 0.7, practiceDaysPerWeek: 4, attemptsPerDay: 6, exercisesPerDay: 3, sessionMinutes: 20, days, seed: childSeed(seed, r), placedTier: placed }).placementDrops;
    if (drops.length) {
      corrected++;
      first.push(drops[0].day);
    }
    const s = drops.find((d) => d.to <= T + 1);
    if (offset <= 1 || s) {
      settled++;
      settle.push(offset <= 1 ? 0 : (s as { day: number }).day);
    }
  }
  return { corrected: corrected / runs, medianFirstDrop: quantile(first, 0.5), medianSettled: quantile(settle, 0.5), settled: settled / runs };
}

/** §1.7 guard: one exercise in many keys (the planner forced onto it) never raises rank. Returns the max rank seen. */
export function gamingOneExercise(runs: number, seed: number): (number | null)[] {
  const cat = defaultCatalogue();
  const out: (number | null)[] = [];
  for (let r = 0; r < runs; r++) {
    const rng = mulberry32(childSeed(seed, r));
    const tier = randInt(rng, 3);
    const e = cat.exercises.filter((x) => x.tier === tier)[0];
    const L: LearnerParams = { ...DEFAULT_LEARNER, rate: 0, theta0: tier + 3 };
    out.push(simulate({ catalogue: cat, learner: L, days: 180, seed: childSeed(seed, r + 1000), onlyExercise: e.id, planner: { workCellsPerSession: 4 } }).finalRank);
  }
  return out;
}

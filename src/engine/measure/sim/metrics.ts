// The §9.1 / §17.4 harness numbers (SPEC-HOLISTIC-2). Each experiment is seeded and pure; `runs` sets the precision.

import { defaultCatalogue, syntheticCatalogue, topTier, type AreaCatalogue } from './catalogue';
import { DEFAULT_PASS_EVIDENCE, DEFAULT_PASS_VARIANT, ItemPassTracker, type PassEvidence, type PassVariant } from './itemPass';
import { DEFAULT_LEARNER, thetaForP, type LearnerParams } from './learner';
import { childSeed, mulberry32, normal, randInt } from './prng';
import { Learner } from './learner';
import { rankableTiers, tierGuardOk, type CountingCheck, type TierGuard } from './rank';
import type { NonTempoMode } from './placement';
import { runReadingTier, simulateReadingArea } from './readingSim';
import { H10_BASELINE, H10_ON, H10_V14, h10Default, simulate, type DailyRecord, type H10Opts, type PlannerConfig, type SimOptions } from './simulate';
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
export function itemPassFlow(p: number, days: number, runs: number, seed: number, o: { dpw?: number; sdDay?: number; warmBoost?: number; warmTakes?: number; variant?: PassVariant; evidence?: PassEvidence } = {}): number {
  const dpw = o.dpw ?? 4;
  const sdDay = o.sdDay ?? 0.8;
  const mu = muForMarginal(p, sdDay);
  let passed = 0;
  for (let r = 0; r < runs; r++) {
    const rng = mulberry32(childSeed(seed, r));
    const tr = new ItemPassTracker('anyCold', o.variant ?? DEFAULT_PASS_VARIANT, o.evidence ?? DEFAULT_PASS_EVIDENCE);
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
  /** Every run's days (the cap when not reached). */
  days: number[];
}

/**
 * Calendar days from rank R to the next non-empty tier, for a learner whose true cold p at that next tier is `pNext`
 * (fixed ability, no item-practice gain: the conservative case), starting with rankHW = placedTier = R.
 */
export function daysPerTier(cat: AreaCatalogue, pNext: number, dpw: number, runs: number, seed: number, cap = 240, lp: Partial<LearnerParams> = {}, planner: Partial<PlannerConfig> = {}, variant: PassVariant = DEFAULT_PASS_VARIANT, extra: Partial<SimOptions> = {}): TierTime[] {
  const tiers = rankableTiers(cat.exercises);
  const out: TierTime[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const from = i === 0 ? null : tiers[i - 1];
    const to = tiers[i];
    const L: LearnerParams = { ...DEFAULT_LEARNER, ...lp, rate: 0 };
    L.theta0 = thetaForP(pNext, to, L);
    const d: number[] = [];
    let reached = 0;
    for (let r = 0; r < runs; r++) {
      const res = simulate({ catalogue: cat, learner: L, days: cap, seed: childSeed(seed, r * 31 + i), placedTier: from ?? 0, rankHW: from, stopWhenRank: to, noPlacementCorrection: true, variant, ...extra, planner: { ...planner, ...extra.planner, practiceDaysPerWeek: dpw } });
      const day = res.rankDay.get(to);
      if (day !== undefined) {
        reached++;
        d.push(day + 1);
      } else d.push(cap);
    }
    out.push({ from, to, median: quantile(d, 0.5), p90: quantile(d, 0.9), reached: reached / runs, days: d });
  }
  return out;
}

// ---------------------------------------------------------------- 4. Wrong demotions, calibration, re-promotion (§1.7)

export interface DemotionReport {
  /** Share of learners with ≥ 1 wrong demotion (truth ≥ 0.75) in the measured window. */
  wrongRate: number;
  /** The same, with the truth = the tier's fresh-cell p at the tier left (the tier estimand, round 17 #4). */
  wrongRateTier: number;
  /** The same, with the truth = the mean fresh-cell p over the decision window's looks (their own tiers, >= the tier left). */
  wrongRateWindow: number;
  /** Share with any slump. */
  anySlump: number;
  /** 80 % interval coverage of the window posterior (n_eff) and of the naive posterior (raw n), against the window's own cells. */
  coverage: number;
  naiveCoverage: number;
  bias: number;
  rmse: number;
  /** The same against the tier estimand (mean fresh-cell p at the window's tiers). */
  tierCoverage: number;
  naiveTierCoverage: number;
  tierBias: number;
  tierRmse: number;
  /** Per ρ_c in `calibRhoC`: coverage against each estimand. */
  grid: { rhoC: number; coverage: number; tierCoverage: number }[];
  /** Median true p (passed cells at tiers ≥ the tier left) over all slumps in the window. */
  slumpTruthMedian: number;
  /** Share of learners whose rank rose above R during the run (their current form then reads harder cells). */
  rankRose: number;
  /** Mean looks per 90 days in the measured window (and the share from FSRS reviews). */
  looksPer90: number;
  reviewShare: number;
}

/** Shared options of the current-form runs. `sim` passes any further simulate options (supply, evidence, ρ, calibRhoC…). */
export interface CurrentFormRun {
  dpw?: number;
  slots?: number;
  sim?: Partial<SimOptions>;
}

/**
 * §1.7 / §9.1 wrong demotions per 90 days: learners with fixed ability whose true cold p at their placed tier R is
 * `pAtRank`, burn-in `burn` days (passes accrue, rank and current form follow), then a 90-day measured window. A slump is
 * wrong when the true mean cold p of the passed cells at tiers ≥ the tier left is ≥ 0.75 (`wrongRateTier`: when the
 * tier's fresh-cell p is ≥ 0.75).
 */
export function wrongDemotion(pAtRank: number, runs: number, seed: number, o: CurrentFormRun & { burn?: number; window?: number; R?: number; cat?: AreaCatalogue } = {}): DemotionReport {
  const cat = o.cat ?? defaultCatalogue();
  const R = o.R ?? 3;
  const burn = o.burn ?? 60;
  const win = o.window ?? 90;
  const L: LearnerParams = { ...DEFAULT_LEARNER, ...o.sim?.learner, rate: 0 };
  L.theta0 = thetaForP(pAtRank, R, L);
  let wrong = 0;
  let wrongT = 0;
  let wrongW = 0;
  let any = 0;
  let rose = 0;
  let nLooks = 0;
  let nRev = 0;
  const truths: number[] = [];
  const cal = { n: 0, hits: 0, naive: 0, bias: 0, sq: 0, th: 0, tn: 0, tb: 0, tsq: 0 };
  const grid = (o.sim?.calibRhoC ?? []).map((rhoC) => ({ rhoC, hits: 0, tierHits: 0 }));
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, days: burn + win, seed: childSeed(seed, r), placedTier: R, noPlacementCorrection: true, ...o.sim, planner: { ...o.sim?.planner, practiceDaysPerWeek: o.dpw ?? 4, confirmSlots: o.slots ?? 2 }, learner: L });
    const inWin = res.slumps.filter((s) => s.day >= burn);
    if (inWin.some((s) => s.truth >= 0.75)) wrong++;
    if (inWin.some((s) => s.tierTruth >= 0.75)) wrongT++;
    if (inWin.some((s) => s.windowTierTruth >= 0.75)) wrongW++;
    if (inWin.length) any++;
    if ((res.finalRank ?? -1) > R) rose++;
    for (const s of inWin) truths.push(s.truth);
    const lw = res.looks.filter((l) => l.day >= burn);
    nLooks += lw.length;
    nRev += res.reviewLooks * (lw.length / Math.max(1, res.looks.length));
    const c = res.calib;
    cal.n += c.n;
    cal.hits += c.hits;
    cal.naive += c.naiveHits;
    cal.bias += c.bias;
    cal.sq += c.sq;
    cal.th += c.tierHits;
    cal.tn += c.naiveTierHits;
    cal.tb += c.tierBias;
    cal.tsq += c.tierSq;
    c.grid.forEach((g, i) => {
      grid[i].hits += g.hits;
      grid[i].tierHits += g.tierHits;
    });
  }
  const n = Math.max(1, cal.n);
  return {
    wrongRate: wrong / runs, wrongRateTier: wrongT / runs, wrongRateWindow: wrongW / runs, anySlump: any / runs,
    coverage: cal.hits / n, naiveCoverage: cal.naive / n, bias: cal.bias / n, rmse: Math.sqrt(cal.sq / n),
    tierCoverage: cal.th / n, naiveTierCoverage: cal.tn / n, tierBias: cal.tb / n, tierRmse: Math.sqrt(cal.tsq / n),
    grid: grid.map((g) => ({ rhoC: g.rhoC, coverage: g.hits / n, tierCoverage: g.tierHits / n })),
    slumpTruthMedian: quantile(truths, 0.5), rankRose: rose / runs, looksPer90: (nLooks / runs) * (90 / win), reviewShare: nRev / Math.max(1, nLooks),
  };
}

/**
 * Re-promotion time: a learner at p = `pAtRank` (rank R reached in burn-in), a dip of `dipLogit` for `dipDays`, then
 * back. Returns the share that slumped during the dip and the median days from the dip's end until current form is
 * back at its pre-dip value (not at rank: rank often sits above the learner's cold level, see report), plus the share
 * of learners whose pre-dip current form was already below rank.
 */
export function repromotion(runs: number, seed: number, o: CurrentFormRun & { pAtRank?: number; dipLogit?: number; dipDays?: number; burn?: number; after?: number } = {}): { slumped: number; recovered: number; medianDays: number; p90Days: number; cfBelowRankBefore: number; recoveredHonest: number; medianDaysHonest: number; p90DaysHonest: number; preCfAboveHonest: number; recoveredTrue: number; medianDaysTrue: number; p90DaysTrue: number; preCfAboveTrue: number } {
  const cat = defaultCatalogue();
  const R = 3;
  const burn = o.burn ?? 90;
  const dipDays = o.dipDays ?? 28;
  const after = o.after ?? 120;
  const L0: LearnerParams = { ...DEFAULT_LEARNER, ...o.sim?.learner, rate: 0 };
  const theta0 = thetaForP(o.pAtRank ?? 0.85, R, L0);
  let slumped = 0;
  let recovered = 0;
  let below = 0;
  const days: number[] = [];
  const daysH: number[] = [];
  let recoveredH = 0;
  let aboveH = 0;
  const daysT: number[] = [];
  let recoveredT = 0;
  let aboveT = 0;
  const truthL = new Learner({ ...L0, theta0 }, mulberry32(1));
  for (let r = 0; r < runs; r++) {
    const L: LearnerParams = { ...L0, theta0, shift: (d) => (d >= burn && d < burn + dipDays ? -(o.dipLogit ?? 3) : 0) };
    const res = simulate({ catalogue: cat, days: burn + dipDays + after, seed: childSeed(seed, r), placedTier: R, noPlacementCorrection: true, ...o.sim, planner: { ...o.sim?.planner, practiceDaysPerWeek: o.dpw ?? 4, confirmSlots: o.slots ?? 2 }, learner: L, recordDaily: true });
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
    // The honest target: the pre-dip current form, capped at the highest tier where the learner's fresh-cell p (no dip)
    // is >= 0.6, the re-promotion bar: current form is not meant to climb back to a tier the learner cannot hold.
    let honest = -1;
    for (let t = 0; t <= (pre.cf as number); t++) if (truthL.trueTierP(t) >= 0.6) honest = t;
    if (honest < (pre.cf as number)) aboveH++;
    const backH = res.daily.find((d) => d.day >= end && d.cf !== null && d.cf >= honest);
    if (backH) {
      recoveredH++;
      daysH.push(backH.day - end);
    } else daysH.push(after);
    // The learner's true tier (fresh-cell p >= 0.75), capped at the pre-dip current form.
    let tt = -1;
    for (let t = 0; t <= (pre.cf as number); t++) if (truthL.trueTierP(t) >= 0.75) tt = t;
    if (tt < (pre.cf as number)) aboveT++;
    const backT = res.daily.find((d) => d.day >= end && d.cf !== null && d.cf >= tt);
    if (backT) {
      recoveredT++;
      daysT.push(backT.day - end);
    } else daysT.push(after);
  }
  return { slumped: slumped / runs, recovered: recovered / Math.max(1, slumped), medianDays: quantile(days, 0.5), p90Days: quantile(days, 0.9), cfBelowRankBefore: below / runs, recoveredHonest: recoveredH / Math.max(1, slumped), medianDaysHonest: quantile(daysH, 0.5), p90DaysHonest: quantile(daysH, 0.9), preCfAboveHonest: aboveH / Math.max(1, slumped), recoveredTrue: recoveredT / Math.max(1, slumped), medianDaysTrue: quantile(daysT, 0.5), p90DaysTrue: quantile(daysT, 0.9), preCfAboveTrue: aboveT / Math.max(1, slumped) };
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
  /** Every rankable tier reached (fix 1: a 1-exercise top tier is not rankable). */
  reachedAll: number;
  /** Learners with a stall: ≥ 42 days at true p ≥ 0.85 on the next tier without a rank rise. */
  stalls: number;
  worstStall: number;
  worstStallTier: number | null;
  /** Every run's longest stall (days). */
  longestStalls: number[];
  /** Median true marginal cold p at the new rank tier, at the moment of each rank rise. */
  medianPAtRankUp: number;
  /** Share of rank rises where that p was < 0.5. */
  rankUpBelowHalf: number;
  /** Every rank rise's true p. */
  rankUps: number[];
  /** Every pass's cell truth (the cell's own cold p, item practice included). */
  passCellPs: number[];
}

/** §1.3 / §9.1 rotation-only climb from T0 (no placement), `days` long. */
export function climb(cat: AreaCatalogue, runs: number, seed: number, days = 365, lp: LearnerParams = STEADY_LEARNER(), planner: Partial<PlannerConfig> = {}, variant: PassVariant = DEFAULT_PASS_VARIANT, extra: Partial<SimOptions> = {}): ClimbReport {
  const tiers = rankableTiers(cat.exercises);
  const top = tiers[tiers.length - 1];
  const catTop = topTier(cat);
  // T5, or the first non-empty tier above it when T5 is empty, or the top tier when the area stops below T5.
  const target = tiers.find((t) => t >= 5) ?? top;
  const perTier = Array.from({ length: catTop + 1 }, (_, t) => cat.exercises.filter((e) => e.available && e.tier === t).length);
  const d: number[] = [];
  let reached = 0;
  let all = 0;
  let stalls = 0;
  let worst = 0;
  let worstTier: number | null = null;
  const ups: number[] = [];
  const passCellPs: number[] = [];
  const longestStalls: number[] = [];
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, learner: lp, days, seed: childSeed(seed, r), variant, ...extra, planner: { ...planner, ...extra.planner } });
    longestStalls.push(res.longestStall);
    for (const u of res.rankTruth) ups.push(u.p);
    for (const x of res.passTruth) passCellPs.push(x.cellP);
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
  return { name: cat.name, perTier, target, reachedTarget: reached / runs, medianDaysToTarget: quantile(d, 0.5), reachedAll: all / runs, stalls, worstStall: worst, worstStallTier: worstTier, longestStalls, medianPAtRankUp: quantile(ups, 0.5), rankUpBelowHalf: ups.filter((p) => p < 0.5).length / Math.max(1, ups.length), rankUps: ups, passCellPs };
}

/** The tier a learner truly is at: the highest tier with marginal cold p ≥ 0.75. */
export const trueTier = (theta: number, lp: LearnerParams): number => Math.floor(theta - thetaForP(0.75, 0, lp));

/**
 * §1.3 placement: `offset` = placedTier − true tier (0 = correctly placed). Tempo areas use the default synthetic
 * catalogue, non-tempo the reading area. Returns the share corrected, the median day of the first drop, and the median
 * day placedTier first reaches the true tier (or rank reaches placedTier, which ends "placed").
 */
export function placementRun(offset: number, tempo: boolean, runs: number, seed: number, o: { days?: number; trueAt?: number; pAtTrue?: number; rate?: number; mode?: NonTempoMode; fixedTempoSim?: boolean; n1AllCells?: boolean } = {}): { corrected: number; medianFirstDrop: number; medianSettled: number; settled: number } {
  const days = o.days ?? 180;
  const T = o.trueAt ?? 1;
  const L: LearnerParams = { ...DEFAULT_LEARNER, rate: o.rate ?? 0.05 };
  L.theta0 = thetaForP(o.pAtTrue ?? 0.75, T, L);
  let corrected = 0;
  let settled = 0;
  const first: number[] = [];
  const settle: number[] = [];
  for (let r = 0; r < runs; r++) {
    const placed = T + offset;
    let drops: { day: number; to: number }[];
    if (tempo) drops = simulate({ catalogue: defaultCatalogue(), learner: L, days, seed: childSeed(seed, r), placedTier: placed, nonTempoMode: o.mode }).placementDrops;
    else if (o.fixedTempoSim) drops = simulate({ catalogue: syntheticCatalogue('fixed-tempo', [3, 3, 3, 3, 3, 3, 3, 3], 12, false), learner: L, days, seed: childSeed(seed, r), placedTier: placed, nonTempoMode: o.mode, n1AllCells: o.n1AllCells }).placementDrops;
    else drops = simulateReadingArea({ catalogue: syntheticCatalogue('reading', [3, 3, 3, 3, 3, 3, 3, 3], 0, false), theta0: L.theta0, rate: L.rate, beta: L.beta, sdDay: 0.8, sdItem: 0.7, practiceDaysPerWeek: 4, attemptsPerDay: 6, exercisesPerDay: 3, sessionMinutes: 20, days, seed: childSeed(seed, r), placedTier: placed, nonTempoMode: o.mode }).placementDrops;
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

// ---------------------------------------------------------------- 6. Item-pass variants (coordinator 2026-11-27)

export interface VariantReport {
  variant: PassVariant;
  evidence: PassEvidence;
  /** The rank tier guard was on. */
  guard: boolean;
  /** (a) P(pass within 28 days, 4 days/wk) at cold p 0.3 … 0.8 (one cell: P1 = P0, P3 = P2). */
  pass28: { p: number; rate: number }[];
  /** (b) calendar days per tier pooled over every transition of every real area: per (pNext, days/wk). */
  tierDays: { pNext: number; dpw: number; median: number; p90: number; reached: number }[];
  /** (c) over the real-catalogue climbs: share of rank rises at true p < 0.5, median true p at a new tier. */
  rankUpBelowHalf: number;
  medianPAtRankUp: number;
  /** (c') over the same climbs: share of passes whose cell's true cold p (item practice included) was < 0.5. */
  passBelowHalf: number;
  /** (d) learners with a stall >= 42 days, and climbs that missed a rankable tier. */
  stalls: number;
  /** The longest stall over all climbs, and every climb's longest stall. */
  worstStall: number;
  longestStalls: number[];
  missedTop: number;
  climbs: number;
}

/** Runs (a)-(d) for one variant (and pass-evidence option) on the given real catalogues; `lp` adds learner overrides (e.g. itemGain). */
export function variantStudy(variant: PassVariant, cats: AreaCatalogue[], seed: number, o: { flowRuns: number; tierRuns: number; climbRuns: number }, extra: Partial<SimOptions> = {}, lp: Partial<LearnerParams> = {}): VariantReport {
  const evidence = extra.evidence ?? DEFAULT_PASS_EVIDENCE;
  const pass28 = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((p) => ({ p, rate: itemPassFlow(p, 28, o.flowRuns, seed + 1, { variant, evidence }) }));
  const tierDays: VariantReport['tierDays'] = [];
  for (const pNext of [0.75, 0.85]) {
    for (const dpw of [3, 5]) {
      const all: number[] = [];
      let reached = 0;
      let n = 0;
      for (const cat of cats) {
        for (const t of daysPerTier(cat, pNext, dpw, o.tierRuns, seed + 30, 240, lp, {}, variant, extra)) {
          all.push(...t.days);
          reached += t.reached * t.days.length;
          n += t.days.length;
        }
      }
      tierDays.push({ pNext, dpw, median: quantile(all, 0.5), p90: quantile(all, 0.9), reached: reached / Math.max(1, n) });
    }
  }
  const ups: number[] = [];
  const cellPs: number[] = [];
  let stalls = 0;
  let missed = 0;
  let climbs = 0;
  const longest: number[] = [];
  for (const cat of cats) {
    const c = climb(cat, o.climbRuns, seed + 60, 365, { ...STEADY_LEARNER(), ...lp }, {}, variant, extra);
    stalls += c.stalls;
    longest.push(...c.longestStalls);
    missed += Math.round((1 - c.reachedAll) * o.climbRuns);
    climbs += o.climbRuns;
    ups.push(...c.rankUps);
    cellPs.push(...c.passCellPs);
  }
  return { variant, evidence, guard: !!extra.rank?.tierGuard, pass28, tierDays, rankUpBelowHalf: ups.filter((p) => p < 0.5).length / Math.max(1, ups.length), medianPAtRankUp: quantile(ups, 0.5), passBelowHalf: cellPs.filter((p) => p < 0.5).length / Math.max(1, cellPs.length), stalls, worstStall: Math.max(0, ...longest), longestStalls: longest, missedTop: missed, climbs };
}

// ---------------------------------------------------------------- 7. Stationary-learner honesty (round 17 review #1)

export interface StationaryReport {
  /** True cold p (fresh cell) at the start tier. */
  p: number;
  startTier: number;
  /** The learner's true tier: the highest non-empty tier with fresh-cell cold p ≥ 0.75 (null: none). */
  trueTier: number | null;
  finalRankMedian: number;
  finalRankP90: number;
  /** Fresh-cell cold p at the final rank: median over learners. */
  pAtFinalRankMedian: number;
  /** Share of learners whose final rank is above their true tier. */
  aboveTrueTier: number;
  /** Rank rises, and the share at a fresh-cell p < 0.5 at the new tier. */
  rises: number;
  risesBelowHalf: number;
  /**
   * The same against the tier's own material as practised (item-practice gain counted, each exercise × key of the tier
   * at its own visit count, unoffered cells at 0): equals `risesBelowHalf` when itemGain is 0.
   */
  risesBelowHalfCat: number;
  /** Median of that catalogue truth at the rises. */
  risesCatMedian: number;
  /**
   * The same against the fresh-cell p at the floor of the probe band (0.95 × target in tempo areas, target in fixed-tempo
   * areas): the tempo of counting checks and pass probes, and the rank estimand (§1.1, v15).
   */
  risesBelowHalfProbe: number;
  /**
   * Per learner (round 18 #4): the share of learners whose final (permanent) rank sits at a tier where their true p < 0.5:
   * at target, at the probe band (the rank estimand) and against the tier's material as practised (catalogue p).
   */
  finalBelowHalf: number;
  finalBelowHalfProbe: number;
  finalBelowHalfCat: number;
  /** Per learner: the share with at least one rise at tier p < 0.5 (at target / at the probe band). */
  anyFalseRise: number;
  anyFalseRiseProbe: number;
  /** Skipped due checks per learner (day pickers). */
  skipsPerLearner: number;
  /**
   * Why false rises happen (round 18 #4): among rises at probe-band p < 0.5, the share whose guard record's own cells,
   * with their item practice, were at p ≥ 0.5 (pPractised: the guard measured practised cells correctly, the tier is
   * not learned), and the median pPractised over those rises.
   */
  falseRisesPractisedOk: number;
  falseRisesPractisedMedian: number;
  /** Passes, and the share at a cell p < 0.5 (the cell's own truth, item practice included) / a tier p < 0.5 (fresh cell). */
  passes: number;
  passesCellBelowHalf: number;
  passesTierBelowHalf: number;
}

/**
 * Learners who do NOT improve (rate 0) with true fresh-cell cold p = `p` at `startTier`, from scratch (placedTier 0, rank
 * none; the review's set-up), `days` long on the default planner. Rank never falls, so any rise above the true level is
 * permanent. `sim` passes simulate options (variant, evidence, supply…); `lp` learner overrides (e.g. itemGain).
 */
export function stationaryHonesty(p: number, runs: number, seed: number, o: { startTier?: number; days?: number; cat?: AreaCatalogue; sim?: Partial<SimOptions>; lp?: Partial<LearnerParams> } = {}): StationaryReport {
  const cat = o.cat ?? defaultCatalogue();
  const S = o.startTier ?? 2;
  const L: LearnerParams = { ...DEFAULT_LEARNER, ...o.lp, rate: 0 };
  L.theta0 = thetaForP(p, S, L);
  const tiers = rankableTiers(cat.exercises);
  const truth = new Learner(L, mulberry32(1));
  const tp = (t: number) => truth.trueTierP(t);
  const ok = tiers.filter((t) => tp(t) >= 0.75);
  const trueT = ok.length ? ok[ok.length - 1] : null;
  const finals: number[] = [];
  const pFinal: number[] = [];
  let above = 0;
  const rises: number[] = [];
  const risesCat: number[] = [];
  const risesProbe: number[] = [];
  const cellPs: number[] = [];
  const tierPs: number[] = [];
  let fb = 0;
  let fbp = 0;
  let fbc = 0;
  let anyF = 0;
  let anyFp = 0;
  let skips = 0;
  const falsePract: number[] = [];
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, learner: L, days: o.days ?? 365, seed: childSeed(seed, r), placedTier: 0, ...o.sim });
    const f = res.finalRank ?? -1;
    finals.push(f);
    if (res.finalRank !== null) pFinal.push(tp(res.finalRank));
    if (f > (trueT ?? -1)) above++;
    if (res.finalTruth) {
      if (res.finalTruth.p < 0.5) fb++;
      if (res.finalTruth.pProbe < 0.5) fbp++;
      if (res.finalTruth.pCat < 0.5) fbc++;
    }
    if (res.rankTruth.some((u) => u.p < 0.5)) anyF++;
    if (res.rankTruth.some((u) => u.pProbe < 0.5)) anyFp++;
    skips += res.skips;
    for (const u of res.rankTruth) {
      rises.push(u.p);
      risesCat.push(u.pCat);
      risesProbe.push(u.pProbe);
      if (u.pProbe < 0.5 && Number.isFinite(u.pPractised)) falsePract.push(u.pPractised);
    }
    for (const x of res.passTruth) {
      cellPs.push(x.cellP);
      tierPs.push(x.tierP);
    }
  }
  const below = (xs: number[]) => xs.filter((x) => x < 0.5).length / Math.max(1, xs.length);
  return { p, startTier: S, trueTier: trueT, finalRankMedian: quantile(finals, 0.5), finalRankP90: quantile(finals, 0.9), pAtFinalRankMedian: quantile(pFinal, 0.5), aboveTrueTier: above / runs, rises: rises.length, risesBelowHalf: below(rises), risesBelowHalfCat: below(risesCat), risesCatMedian: quantile(risesCat, 0.5), risesBelowHalfProbe: below(risesProbe), finalBelowHalf: fb / runs, finalBelowHalfProbe: fbp / runs, finalBelowHalfCat: fbc / runs, anyFalseRise: anyF / runs, anyFalseRiseProbe: anyFp / runs, skipsPerLearner: skips / runs, falseRisesPractisedOk: falsePract.filter((x) => x >= 0.5).length / Math.max(1, falsePract.length), falseRisesPractisedMedian: falsePract.length ? quantile(falsePract, 0.5) : NaN, passes: cellPs.length, passesCellBelowHalf: below(cellPs), passesTierBelowHalf: below(tierPs) };
}

// ---------------------------------------------------------------- 8. H10: offered challenge tracks ability (round 17 review #2)

export interface H10Week {
  week: number;
  theta: number;
  rank: number;
  /** The +2 cap: the second non-empty tier above max(placedTier, rank). */
  cap: number;
  contentEdge: number;
  enteredTop: number;
  /** Mean content tier, cold tempo (× target) and difficulty (tier + ln f / ln 1.2) of new / strengthen items offered. */
  tier: number;
  tempo: number;
  difficulty: number;
}

export interface H10Report {
  name: string;
  /** Weekly means over learners (weeks with frontier data). */
  weeks: H10Week[];
  /** Pooled Δ(offered difficulty) / Δ(min(θ, cap)) over 4-week windows in which rank stayed flat and θ rose. */
  flatSlope: number;
  flatWindows: number;
  /** Share of those windows in which offered difficulty did not rise (a plateau in offered challenge). */
  flatPlateau: number;
  /** Mean (min(θ, cap) − offered difficulty) over all learner-weeks: how far the offer lags ability. */
  meanLag: number;
  /** Non-exempt sessions whose target tier fell below the previous session's / whose mean offered difficulty fell > 0.5 tier. */
  targetFell: number;
  difficultyFell: number;
  /** Practice days that offered an item above the +2 cap. */
  overCap: number;
  medianDaysToTop: number;
}

/** The +2 cap tier: the second non-empty tier above `base` (or the top tier). */
const capTier = (tiers: number[], base: number): number => {
  const above = tiers.filter((t) => t > base);
  return above.length ? above[Math.min(1, above.length - 1)] : tiers[tiers.length - 1];
};

/**
 * H10 study: improving learners (default: p 0.6 at T0, 0.15 tiers per practice hour, so rank has flat spells) on the
 * tempo model, comparing planners. Weekly θ, rank and the offered frontier; the tracking slope while rank is flat.
 */
export function h10Study(name: string, runs: number, seed: number, o: { h10?: Partial<H10Opts>; days?: number; cat?: AreaCatalogue; lp?: Partial<LearnerParams>; sim?: Partial<SimOptions> } = {}): H10Report {
  const cat = o.cat ?? defaultCatalogue();
  const tiers = rankableTiers(cat.exercises);
  const days = o.days ?? 280;
  const lp: LearnerParams = { ...STEADY_LEARNER(), rate: 0.15, ...o.lp };
  const nW = Math.ceil(days / 7);
  const acc = Array.from({ length: nW }, () => ({ n: 0, theta: 0, rank: 0, cap: 0, edge: 0, top: 0, tier: 0, tempo: 0, d: 0 }));
  let sumDd = 0;
  let sumDt = 0;
  let windows = 0;
  let plateau = 0;
  let lag = 0;
  let lagN = 0;
  let sessions = 0;
  let tFell = 0;
  let dFell = 0;
  let overCap = 0;
  const toTop: number[] = [];
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, learner: lp, days, seed: childSeed(seed, r), placedTier: 0, noPlacementCorrection: true, ...o.sim, h10: { ...h10Default(cat), ...o.h10 }, recordDaily: true });
    const top = tiers[tiers.length - 1];
    toTop.push(res.rankDay.get(top) ?? days);
    const wk: (H10Week | null)[] = [];
    let prev: DailyRecord | null = null;
    for (let w = 0; w < nW; w++) {
      const ds = res.daily.filter((d) => d.day >= w * 7 && d.day < w * 7 + 7);
      const fr = ds.filter((d) => d.frontier);
      if (!fr.length) {
        wk.push(null);
        continue;
      }
      const last = ds[ds.length - 1];
      const rank = last.rank ?? -1;
      const cap = capTier(tiers, Math.max(last.placedTier, rank));
      const m = (f: (d: DailyRecord) => number) => fr.reduce((s, d) => s + f(d), 0) / fr.length;
      const row: H10Week = { week: w, theta: ds.reduce((s, d) => s + d.theta, 0) / ds.length, rank, cap, contentEdge: m((d) => d.frontier!.contentEdge), enteredTop: m((d) => d.frontier!.enteredTop), tier: m((d) => d.frontier!.tier), tempo: m((d) => d.frontier!.tempo), difficulty: m((d) => d.frontier!.difficulty) };
      wk.push(row);
      const a = acc[w];
      a.n++;
      a.theta += row.theta;
      a.rank += row.rank;
      a.cap += row.cap;
      a.edge += row.contentEdge;
      a.top += row.enteredTop;
      a.tier += row.tier;
      a.tempo += row.tempo;
      a.d += row.difficulty;
      lag += Math.min(row.theta, cap) - row.difficulty;
      lagN++;
      for (const d of fr) {
        const f = d.frontier!;
        if (f.maxTier > capTier(tiers, Math.max(d.placedTier, d.rank ?? -1))) overCap++;
        if (prev && prev.frontier) {
          sessions++;
          if (!f.exempt && f.target < prev.frontier.target) tFell++;
          if (!f.exempt && f.difficulty < prev.frontier.difficulty - 0.5) dFell++;
        }
        prev = d;
      }
    }
    for (let w = 0; w + 4 < nW; w++) {
      const a = wk[w];
      const b = wk[w + 4];
      if (!a || !b || a.rank !== b.rank) continue;
      const dt = Math.min(b.theta, b.cap) - Math.min(a.theta, a.cap);
      if (dt < 0.1) continue;
      windows++;
      sumDt += dt;
      sumDd += b.difficulty - a.difficulty;
      if (b.difficulty - a.difficulty <= 0) plateau++;
    }
  }
  const weeks: H10Week[] = acc.filter((a) => a.n > 0).map((a, i) => ({ week: acc.indexOf(a) >= 0 ? acc.indexOf(a) : i, theta: a.theta / a.n, rank: a.rank / a.n, cap: a.cap / a.n, contentEdge: a.edge / a.n, enteredTop: a.top / a.n, tier: a.tier / a.n, tempo: a.tempo / a.n, difficulty: a.d / a.n }));
  return { name, weeks, flatSlope: sumDd / Math.max(1e-9, sumDt), flatWindows: windows, flatPlateau: plateau / Math.max(1, windows), meanLag: lag / Math.max(1, lagN), targetFell: tFell / Math.max(1, sessions), difficultyFell: dFell / Math.max(1, sessions), overCap, medianDaysToTop: quantile(toTop, 0.5) };
}

export interface OvershootReport {
  /** Means over the practice days of the last `tailDays` days (pooled over learners). */
  rank: number;
  contentEdge: number;
  target: number;
  tier: number;
  /** Fresh-cell cold p of the offered working visits at their offered tempo, and at the probe band (target when fixed-tempo). */
  pOffer: number;
  pProbe: number;
  /** Share of those practice days whose offered probe-band p is < 0.3 (hopeless items) / whose offer is at the +2 cap. */
  hopeless: number;
  atCap: number;
  /** Share of sessions exempted by the struggle rule. */
  struggleDays: number;
}

/**
 * Round 18 #3: a learner who stops improving (rate 0, tier p `p` at T2, from scratch): where does the H10 planner aim in
 * the last `tailDays` of `days`? The challenge should sit near the challenge point (offered probe-band p well above 0.3),
 * not ratchet to the + 2 cap on noise.
 */
export function h10Overshoot(p: number, runs: number, seed: number, o: { cat?: AreaCatalogue; sim?: Partial<SimOptions>; days?: number; tailDays?: number } = {}): OvershootReport {
  const cat = o.cat ?? defaultCatalogue();
  const tiers = rankableTiers(cat.exercises);
  const days = o.days ?? 365;
  const tail = o.tailDays ?? 90;
  const L: LearnerParams = { ...DEFAULT_LEARNER, rate: 0 };
  L.theta0 = thetaForP(p, 2, L);
  const acc = { n: 0, rank: 0, edge: 0, target: 0, tier: 0, pOffer: 0, pProbe: 0, hopeless: 0, cap: 0, struggle: 0 };
  for (let r = 0; r < runs; r++) {
    const res = simulate({ catalogue: cat, learner: L, days, seed: childSeed(seed, r), placedTier: 0, ...o.sim, recordDaily: true });
    for (const d of res.daily) {
      if (d.day < days - tail || !d.frontier) continue;
      const f = d.frontier;
      acc.n++;
      acc.rank += d.rank ?? -1;
      acc.edge += f.contentEdge;
      acc.target += f.target;
      acc.tier += f.tier;
      acc.pOffer += f.pOffer;
      acc.pProbe += f.pProbe;
      if (f.pProbe < 0.3) acc.hopeless++;
      if (f.maxTier >= capTier(tiers, Math.max(d.placedTier, d.rank ?? -1))) acc.cap++;
      if (f.struggle) acc.struggle++;
    }
  }
  const n = Math.max(1, acc.n);
  return { rank: acc.rank / n, contentEdge: acc.edge / n, target: acc.target / n, tier: acc.tier / n, pOffer: acc.pOffer / n, pProbe: acc.pProbe / n, hopeless: acc.hopeless / n, atCap: acc.cap / n, struggleDays: acc.struggle / n };
}

/**
 * Round 18 #4: the guard as a repeated test. A stream of counting checks at a fixed true probe-band p (marginal over day
 * and cell effects, SD 0.8 / 0.7), 2 checks per practice day, a new cell every 6 checks. Returns, for each n in `ns`,
 * P(the guard passes at the single test after n checks) and P(it has passed at any test up to n): it is re-tested after
 * every check and rank keeps the high-water, so the second is the one that matters.
 */
export function guardRepeatedTest(p: number, g: TierGuard, runs: number, seed: number, ns: number[] = [12, 24, 48, 96]): { single: number[]; ever: number[] } {
  const single = ns.map(() => 0);
  const ever = ns.map(() => 0);
  const last = ns[ns.length - 1];
  const mu = muForMarginal(p, Math.sqrt(0.8 ** 2 + 0.7 ** 2));
  for (let r = 0; r < runs; r++) {
    const rng = mulberry32(childSeed(seed, r));
    const rec: CountingCheck[] = [];
    let passed = false;
    let cellEff = 0;
    let dayEff = 0;
    for (let i = 0; i < last; i++) {
      if (i % 6 === 0) cellEff = normal(rng) * 0.7;
      if (i % 2 === 0) dayEff = normal(rng) * 0.8;
      rec.push({ tier: 1, day: Math.floor(i / 2), cell: `c${Math.floor(i / 6)}`, clean: rng() < logistic(mu + cellEff + dayEff) });
      const ok = tierGuardOk(rec, 1, 1, g);
      passed = passed || ok;
      const k = ns.indexOf(i + 1);
      if (k >= 0) {
        if (ok) single[k]++;
        if (passed) ever[k]++;
      }
    }
  }
  return { single: single.map((x) => x / runs), ever: ever.map((x) => x / runs) };
}

/** The H10 planner presets, for the report. */
export const H10_PLANNERS: { name: string; h10: Partial<H10Opts> }[] = [
  { name: 'v13 planner (tempo model only)', h10: H10_BASELINE },
  { name: 'readiness entry only', h10: { ...H10_BASELINE, readiness: true } },
  { name: 'H10 as in v14: sticky readiness on one clean check, no struggle exemption', h10: H10_V14 },
  { name: 'H10 default (v15): evidence readiness + challenge point + no-easier + struggle exemption', h10: H10_ON },
];

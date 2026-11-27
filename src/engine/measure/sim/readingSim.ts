// Reading and transfer simulations (SPEC-HOLISTIC-2 §1.6, §9.1). Pure.
// - One tier's sequential pass test for a learner with a known (possibly rising) marginal p: false passes, time to pass.
// - A reading area (generators × tiers, keyless) climbed by the rotation: H8 rank over reading tier passes, the entry
//   ceiling and the §1.3 non-tempo placement correction.

import type { AreaCatalogue } from './catalogue';
import { initPlacement, isPlaced, nonTempoPlacementDay } from './placement';
import { mulberry32, normal, randInt, type Rng } from './prng';
import { entryCeiling, nonEmptyTiers, passedExerciseIds, updateRankHW, type PassRecord } from './rank';
import { readingPassed, READING_PASS, type Attempt, type ReadingPassOpts } from './readingPass';
import { logistic, marginalP, muForMarginal } from './stats';

export interface TierRunOpts {
  /** The learner's true marginal cold p (over day and item effects) on calendar day d. */
  pOf: (day: number) => number;
  sdDay: number;
  sdItem: number;
  practiceDaysPerWeek: number;
  attemptsPerDay: number;
  days: number;
  seed: number;
  pass?: ReadingPassOpts;
}

export interface TierRunResult {
  /** Calendar day of the pass, or −1. */
  passDay: number;
  attempts: number;
  /** True marginal p on the pass day. */
  pAtPass: number;
}

function weekDays(rng: Rng, k: number): Set<number> {
  const d = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 6; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return new Set(d.slice(0, k));
}

/** §1.6 one reading / transfer tier, checked after every attempt (the app's sequential use). */
export function runReadingTier(o: TierRunOpts): TierRunResult {
  const rng = mulberry32(o.seed);
  const sd = Math.sqrt(o.sdDay ** 2 + o.sdItem ** 2);
  const att: Attempt[] = [];
  let week = new Set<number>();
  for (let day = 0; day < o.days; day++) {
    if (day % 7 === 0) week = weekDays(rng, o.practiceDaysPerWeek);
    if (!week.has(day % 7)) continue;
    const mu = muForMarginal(o.pOf(day), sd);
    const v = normal(rng) * o.sdDay;
    for (let i = 0; i < o.attemptsPerDay; i++) {
      att.push({ day, clean: rng() < logistic(mu + v + normal(rng) * o.sdItem) });
      if (readingPassed(att, o.pass ?? READING_PASS)) return { passDay: day, attempts: att.length, pAtPass: o.pOf(day) };
    }
  }
  return { passDay: -1, attempts: att.length, pAtPass: NaN };
}

export interface ReadingAreaOpts {
  catalogue: AreaCatalogue;
  /** θ0 + rate · practice hours; cold logit at tier c = β(θ − c) + day + item. */
  theta0: number;
  rate: number;
  beta: number;
  sdDay: number;
  sdItem: number;
  practiceDaysPerWeek: number;
  /** Sight attempts per practice day, spread over the offered exercises. */
  attemptsPerDay: number;
  /** Exercises worked per day. */
  exercisesPerDay: number;
  sessionMinutes: number;
  days: number;
  seed: number;
  placedTier?: number;
}

export interface ReadingAreaResult {
  rankDay: Map<number, number>;
  finalRank: number | null;
  placementDrops: { day: number; to: number }[];
  finalPlaced: number;
  passes: PassRecord[];
}

/** A reading area climbed by the rotation (each exercise = generator × tier, keyless; §1.6, §1.7). */
export function simulateReadingArea(o: ReadingAreaOpts): ReadingAreaResult {
  const rng = mulberry32(o.seed);
  const ex = o.catalogue.exercises;
  const tiers = nonEmptyTiers(ex);
  const att = new Map<string, Attempt[]>();
  const passes: PassRecord[] = [];
  const rankDay = new Map<number, number>();
  const drops: { day: number; to: number }[] = [];
  let place = initPlacement(o.placedTier ?? 0, tiers);
  let rankHW: number | null = null;
  let hours = 0;
  let week = new Set<number>();
  for (let day = 0; day < o.days; day++) {
    if (day % 7 === 0) week = weekDays(rng, o.practiceDaysPerWeek);
    if (!week.has(day % 7)) continue;
    const passed = passedExerciseIds(passes);
    const ceiling = entryCeiling(ex, place.placedTier, rankHW, passed);
    // The rotation: unpassed exercises at tiers ≤ the ceiling, those above the base (max(placedTier, rank)) 3× as likely.
    const base = Math.max(place.placedTier, rankHW ?? -Infinity);
    const pool = ex.filter((e) => e.available && e.tier <= ceiling && !passed.has(e.id)).map((e) => ({ e, k: Math.pow(rng(), 1 / (e.tier > base ? 3 : 1)) }));
    const today = pool.sort((a, b) => b.k - a.k).slice(0, o.exercisesPerDay).map((x) => x.e);
    const v = normal(rng) * o.sdDay;
    const theta = o.theta0 + o.rate * hours;
    const placedToday: boolean[] = [];
    for (let i = 0; i < o.attemptsPerDay && today.length; i++) {
      const e = today[i % today.length];
      const a = att.get(e.id) ?? [];
      att.set(e.id, a);
      const clean = rng() < logistic(o.beta * (theta - e.tier) + v + normal(rng) * o.sdItem);
      a.push({ day, clean });
      if (e.tier === place.placedTier) placedToday.push(clean);
      if (!passed.has(e.id) && readingPassed(a)) {
        passed.add(e.id);
        passes.push({ exerciseId: e.id, tier: e.tier, key: null, at: day * 24 });
      }
    }
    hours += o.sessionMinutes / 60;
    const before: number | null = rankHW;
    rankHW = updateRankHW(ex, passes, place.placedTier, rankHW);
    if (rankHW !== null && rankHW !== before) for (const t of tiers) if (t <= rankHW && !rankDay.has(t)) rankDay.set(t, day);
    if (isPlaced(place, rankHW) && placedToday.length) {
      const b = place.placedTier;
      place = nonTempoPlacementDay(place, placedToday, tiers);
      if (place.placedTier !== b) drops.push({ day, to: place.placedTier });
    }
  }
  return { rankDay, finalRank: rankHW, placementDrops: drops, finalPlaced: place.placedTier, passes };
}

/** Marginal p of a reading tier for θ (for the report's truth columns). */
export const readingTierP = (theta: number, tier: number, beta: number, sdDay: number, sdItem: number): number => marginalP(beta * (theta - tier), Math.sqrt(sdDay ** 2 + sdItem ** 2));

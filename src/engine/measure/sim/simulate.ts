// The day-by-day simulation of one learner in one laddered / fixed-tempo area (SPEC-HOLISTIC-2 §9.1): a simple planner
// (practice days per week, sessions, a rotation offering cells at tiers ≤ the entry ceiling, 2–4 confirmation slots
// per session), the §1.6 item pass, H8 rank (§1.7), the entry ceiling (§1.3), the placement correction (§1.3) and the
// current-form posterior (§1.7). Pure.

import type { AreaCatalogue } from './catalogue';
import { admitLook, CURRENT_FORM, initCurrentForm, stepCurrentForm, windowAt, windowPosterior, type CurrentFormOpts, type Look, type PassedCell } from './currentForm';
import { ItemPassTracker, type ResetMode } from './itemPass';
import { Learner, type LearnerParams } from './learner';
import { initPlacement, isPlaced, nonTempoPlacementDay, tempoPlacementDay, type PlacementState } from './placement';
import { mulberry32, normal, randInt, type Rng } from './prng';
import { entryCeiling, nonEmptyTiers, passedExerciseIds, updateRankHW, type Exercise, type PassRecord } from './rank';
import { readingPBelow } from './readingPass';
import { betaQuantile, logit } from './stats';

export interface PlannerConfig {
  /** Practice days per week (integer 1–7; the days are drawn at random each week). */
  practiceDaysPerWeek: number;
  /** Chance of a second session on a practice day (≥ 2 h later). */
  secondSessionProb: number;
  /** Working (unpassed) cells visited per session in this area. */
  workCellsPerSession: number;
  /** Warm takes at target after the cold check, per visit. */
  warmTakesPerVisit: number;
  /** Confirmation slots per session given to this area (§1.7: 2–4 per session across all areas). */
  confirmSlots: number;
  /** Minutes of practice per session in this area (drives θ growth). */
  sessionMinutes: number;
  /** A working cell is set aside after this many visits without a pass (the exercise may come back in another key). */
  maxVisitsPerCell: number;
  /** Weight of exercises at tiers above the base (max(placedTier, rankHW)) vs below, when choosing new cells. */
  frontierWeight: number;
  /**
   * Offer a passed exercise above rank again in a new key while the passes at its tier and above hold < 2 keys
   * (needed by §1.7's key rule on 1-exercise tiers, or when 2 passes landed in one key). Default true.
   */
  offerNewKeys: boolean;
}

export const DEFAULT_PLANNER: PlannerConfig = { practiceDaysPerWeek: 4, secondSessionProb: 0.15, workCellsPerSession: 4, warmTakesPerVisit: 4, confirmSlots: 2, sessionMinutes: 20, maxVisitsPerCell: 12, frontierWeight: 3, offerNewKeys: true };

export interface SimOptions {
  catalogue: AreaCatalogue;
  learner: LearnerParams;
  planner?: Partial<PlannerConfig>;
  days: number;
  seed: number;
  placedTier?: number;
  /** A stored rank high-water to start from (e.g. "a learner at rank R"). */
  rankHW?: number | null;
  currentForm?: Partial<CurrentFormOpts>;
  resetMode?: ResetMode;
  /** Rank-gaming probe: the planner only ever offers this exercise, in a new key each time. */
  onlyExercise?: string;
  /** Days with no practice, [from, to). */
  breaks?: [number, number][];
  /** Turn off the placement correction (for runs that measure something else). */
  noPlacementCorrection?: boolean;
  /** Stop as soon as rank reaches this tier (saves time in per-tier timing runs). */
  stopWhenRank?: number;
  recordDaily?: boolean;
}

export interface DailyRecord {
  day: number;
  practice: boolean;
  theta: number;
  rank: number | null;
  cf: number | null;
  placedTier: number;
  ceiling: number;
  /** True marginal cold p at the next non-empty tier above rank (null at the top). */
  pNext: number | null;
}

export interface SlumpEvent {
  day: number;
  from: number;
  /** True mean cold p of the passed cells at tiers ≥ the tier demoted from (marginal over the day effect). */
  truth: number;
  /** True marginal cold p of a fresh cell at the tier demoted from. */
  tierTruth: number;
}

export interface SimResult {
  passes: PassRecord[];
  /** First day rank reached each tier. */
  rankDay: Map<number, number>;
  finalRank: number | null;
  finalCf: number | null;
  slumps: SlumpEvent[];
  rises: number[];
  placementDrops: { day: number; to: number }[];
  finalPlaced: number;
  /** Longest run of days with true p ≥ 0.85 at the next non-empty tier above rank while rank stood still. */
  longestStall: number;
  stallTier: number | null;
  looks: Look[];
  /** Posterior calibration: 80 % interval coverage, with n_eff and naive (n). */
  calib: { n: number; hits: number; naiveHits: number; bias: number; sq: number };
  practiceDays: number;
  daily: DailyRecord[];
}

interface Cell {
  id: string;
  ex: Exercise;
  key: number | null;
  tracker: ItemPassTracker;
  lastSound: number;
  lastColdDay: number;
  lastVisitDay: number;
  lastLookDay: number;
  visits: number;
  passed: boolean;
  shelved: boolean;
}

/** Draw `k` of the 7 weekdays. */
export function weekPlan(rng: Rng, k: number): Set<number> {
  const d = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 6; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return new Set(d.slice(0, Math.max(0, Math.min(7, k))));
}

/** Weighted pick. */
function pickWeighted<T>(rng: Rng, xs: T[], w: (x: T) => number): T | null {
  const tot = xs.reduce((s, x) => s + w(x), 0);
  if (tot <= 0) return null;
  let r = rng() * tot;
  for (const x of xs) if ((r -= w(x)) <= 0) return x;
  return xs[xs.length - 1];
}

/** Run one learner in one area. */
export function simulate(o: SimOptions): SimResult {
  const rng = mulberry32(o.seed);
  const learner = new Learner(o.learner, mulberry32(o.seed ^ 0x51ed));
  const P: PlannerConfig = { ...DEFAULT_PLANNER, ...o.planner };
  const CF: CurrentFormOpts = { ...CURRENT_FORM, ...o.currentForm };
  const ex = o.catalogue.exercises;
  const tiers = nonEmptyTiers(ex);
  const cells: Cell[] = [];
  const cellById = new Map<string, Cell>();
  const passes: PassRecord[] = [];
  const looks: Look[] = [];
  const rankDay = new Map<number, number>();
  let rankHW: number | null = o.rankHW ?? null;
  let place: PlacementState = initPlacement(o.placedTier ?? 0);
  let cfs = initCurrentForm();
  const slumps: SlumpEvent[] = [];
  const rises: number[] = [];
  const placementDrops: { day: number; to: number }[] = [];
  const daily: DailyRecord[] = [];
  const calib = { n: 0, hits: 0, naiveHits: 0, bias: 0, sq: 0 };
  let week = new Set<number>();
  let lastPracticeDay = -Infinity;
  let reentryLeft = 0;
  let practiceDays = 0;
  let stallRun = 0;
  let longestStall = 0;
  let stallTier: number | null = null;
  let prevRank: number | null = rankHW;
  const inBreak = (d: number) => (o.breaks ?? []).some(([a, b]) => d >= a && d < b);
  const passKeysFrom = (t: number): Set<number | null> => new Set(passes.filter((p) => p.tier >= t && p.key !== null).map((p) => p.key));
  const passedCells = (): PassedCell[] => cells.filter((c) => c.passed).map((c) => ({ cell: c.id, exerciseId: c.ex.id, key: c.key, tier: c.ex.tier }));
  if (rankHW !== null) rankDay.set(rankHW, 0);
  cfs = stepCurrentForm(cfs, looks, [], rankHW, 0, CF).state;

  for (let day = 0; day < o.days; day++) {
    if (day % 7 === 0) week = weekPlan(rng, P.practiceDaysPerWeek);
    const practice = week.has(day % 7) && !inBreak(day);
    let paceToday: number | null = null;
    let offeredPlaced = false;
    let passAtPlacedToday = false;
    if (practice) {
      practiceDays++;
      if (day - lastPracticeDay - 1 >= 7) reentryLeft = 3;
      const reentry = reentryLeft > 0;
      lastPracticeDay = day;
      const start = 7 + rng() * 15;
      const sessions = [start];
      if (rng() < P.secondSessionProb && start + 2 < 23.5) sessions.push(start + 2 + rng() * Math.min(4, 23.5 - start - 2));
      const lookToday: Look[] = [];
      for (const sh of sessions) {
        let now = day * 24 + sh;
        const passedSet = passedExerciseIds(passes);
        const ceiling = entryCeiling(ex, place.placedTier, rankHW, passedSet);
        const base = Math.max(place.placedTier, rankHW ?? -Infinity);
        // Confirmation slots (§1.7): passed cells only, the main item's cold check first, a new exercise per slot.
        const cfTier = cfs.cf ?? 0;
        const conf = cells
          .filter((c) => c.passed && c.lastVisitDay !== day)
          .map((c) => ({ c, s: (c.ex.tier >= cfTier ? 0 : 1000) + c.lastLookDay + rng() }))
          .sort((a, b) => a.s - b.s)
          .map((x) => x.c);
        const usedEx = new Set<string>();
        let slots = P.confirmSlots;
        for (const c of conf) {
          if (slots <= 0) break;
          if (usedEx.has(c.ex.id) && conf.some((d) => !usedEx.has(d.ex.id) && d !== c)) continue;
          usedEx.add(c.ex.id);
          slots--;
          const cold = now - c.lastSound >= 1;
          const first = cold && c.lastColdDay !== day;
          const clean = learner.take(c.ex.tier, c.id, day, c.visits, !cold);
          if (first) {
            c.lastColdDay = day;
            const look: Look = { at: now, day, cell: c.id, exerciseId: c.ex.id, key: c.key, tier: c.ex.tier, clean, reentry };
            if (admitLook(lookToday, look)) {
              lookToday.push(look);
              looks.push(look);
              c.lastLookDay = day;
            }
          }
          c.lastSound = now;
          c.lastVisitDay = day;
          now += 0.05;
        }
        // Working cells: in-progress first (awaiting the cold pair), then new ones from the rotation.
        const active = cells
          .filter((c) => !c.passed && !c.shelved && (o.onlyExercise === undefined || c.ex.id === o.onlyExercise))
          .sort((a, b) => Number(b.tracker.firstTargetAt !== null) - Number(a.tracker.firstTargetAt !== null) || a.lastVisitDay - b.lastVisitDay);
        const visit: Cell[] = active.slice(0, P.workCellsPerSession);
        while (visit.length < P.workCellsPerSession) {
          let pool: Exercise[];
          if (o.onlyExercise !== undefined) pool = ex.filter((e) => e.id === o.onlyExercise);
          else {
            const busy = new Set(visit.map((c) => c.ex.id).concat(active.map((c) => c.ex.id)));
            pool = ex.filter((e) => e.available && e.tier <= ceiling && !passedSet.has(e.id) && !busy.has(e.id));
            if (P.offerNewKeys) {
              pool = pool.concat(ex.filter((e) => e.available && e.keys > 0 && e.tier <= ceiling && e.tier > (rankHW ?? -1) && passedSet.has(e.id) && !busy.has(e.id) && passKeysFrom(e.tier).size < 2));
            }
          }
          const e = pickWeighted(rng, pool, (x) => (x.tier > base ? P.frontierWeight : 1));
          if (!e) break;
          const avoid = new Set<number | null>([...cells.filter((c) => c.ex.id === e.id).map((c) => c.key), ...passKeysFrom(e.tier)]);
          let key: number | null = null;
          if (e.keys > 0) {
            const free = Array.from({ length: e.keys }, (_, k) => k).filter((k) => !avoid.has(k));
            key = free.length ? free[randInt(rng, free.length)] : randInt(rng, e.keys);
          }
          const c: Cell = { id: `${e.id}|${key}|${cells.length}`, ex: e, key, tracker: new ItemPassTracker(o.resetMode), lastSound: -Infinity, lastColdDay: -1, lastVisitDay: -1, lastLookDay: -1, visits: 0, passed: false, shelved: false };
          cells.push(c);
          cellById.set(c.id, c);
          visit.push(c);
          if (o.onlyExercise !== undefined) break;
        }
        for (const c of visit) {
          if (c.ex.tier === place.placedTier) offeredPlaced = true;
          const cold = now - c.lastSound >= 1;
          const first = cold && c.lastColdDay !== day;
          if (first) c.lastColdDay = day;
          c.tracker.add({ at: now, day, clean: learner.take(c.ex.tier, c.id, day, c.visits, !cold), cold, firstColdOfDay: first, atTarget: true });
          for (let k = 0; k < P.warmTakesPerVisit; k++) {
            now += 0.03;
            c.tracker.add({ at: now, day, clean: learner.take(c.ex.tier, c.id, day, c.visits, true), cold: false, firstColdOfDay: false, atTarget: true });
          }
          c.lastSound = now;
          c.lastVisitDay = day;
          c.visits++;
          now += 0.05;
          if (c.tracker.passedAt !== null) {
            c.passed = true;
            passes.push({ exerciseId: c.ex.id, tier: c.ex.tier, key: c.key, at: c.tracker.passedAt });
            if (c.ex.tier === place.placedTier) passAtPlacedToday = true;
          } else if (c.visits >= P.maxVisitsPerCell) c.shelved = true;
        }
        learner.hours += P.sessionMinutes / 60;
        const before: number | null = rankHW;
        rankHW = updateRankHW(ex, passes, place.placedTier, rankHW);
        if (rankHW !== null && rankHW !== before) for (const t of tiers) if (t <= rankHW && !rankDay.has(t)) rankDay.set(t, day);
      }
      if (reentryLeft > 0) reentryLeft--;
      // The day's cold scale benchmark as a tier (§1.3 paceTier): the tier where cold p ≈ 0.7, with the day effect.
      paceToday = Math.max(0, Math.floor(learner.theta() + (learner.dayEffect(day) + normal(rng) * 0.3 - logit(0.7)) / o.learner.beta));
    }
    const endOfDay = day * 24 + 23.99;
    if (practice) {
      // Current form (§1.7).
      const pc = passedCells();
      const prevCf = cfs.cf;
      const r = stepCurrentForm(cfs, looks, pc, rankHW, endOfDay, CF);
      if (r.event === 'slump' && prevCf !== null) {
        const above = cells.filter((c) => c.passed && c.ex.tier >= prevCf);
        const truth = above.reduce((s, c) => s + learner.trueCellP(c.ex.tier, c.id, day, c.visits), 0) / Math.max(1, above.length);
        slumps.push({ day, from: prevCf, truth, tierTruth: learner.trueTierP(prevCf, day) });
      }
      if (r.event === 'rise') rises.push(day);
      cfs = r.state;
      // Calibration of the window posterior at current form (§9.1).
      if (cfs.cf !== null) {
        const win = windowAt(looks, cfs.cf, endOfDay, -Infinity, CF, true, false);
        if (win.length >= CF.minLooks) {
          const wp = windowPosterior(win, CF);
          const truth = win.reduce((s, l) => {
            const c = cellById.get(l.cell) as Cell;
            return s + learner.trueCellP(c.ex.tier, c.id, day, c.visits);
          }, 0) / win.length;
          const lo = betaQuantile(0.1, wp.post.a, wp.post.b);
          const hi = betaQuantile(0.9, wp.post.a, wp.post.b);
          const s = win.filter((l) => l.clean).length;
          const nlo = betaQuantile(0.1, 1 + s, 1 + win.length - s);
          const nhi = betaQuantile(0.9, 1 + s, 1 + win.length - s);
          const mean = wp.post.a / (wp.post.a + wp.post.b);
          calib.n++;
          if (truth >= lo && truth <= hi) calib.hits++;
          if (truth >= nlo && truth <= nhi) calib.naiveHits++;
          calib.bias += mean - truth;
          calib.sq += (mean - truth) ** 2;
        }
      }
      // Placement correction (§1.3), only while placed and only on offered days.
      if (!o.noPlacementCorrection && isPlaced(place, rankHW) && offeredPlaced) {
        const before = place.placedTier;
        if (o.catalogue.tempo) place = tempoPlacementDay(place, paceToday as number);
        else {
          const att = coldAtTier(cells, place.placedTier);
          place = nonTempoPlacementDay(place, passAtPlacedToday, att.length ? readingPBelow(att) : 0);
        }
        if (place.placedTier !== before) placementDrops.push({ day, to: place.placedTier });
      }
    }
    // Stall watch (§9.1): rank stands still while the true p at the next non-empty tier is ≥ 0.85.
    const next = tiers.find((t) => t > (rankHW ?? -1));
    const pNext = next === undefined ? null : learner.trueTierP(next, day);
    if (rankHW !== prevRank) stallRun = 0;
    prevRank = rankHW;
    if (pNext !== null && pNext >= 0.85) {
      stallRun++;
      if (stallRun > longestStall) {
        longestStall = stallRun;
        stallTier = rankHW;
      }
    } else stallRun = 0;
    if (o.recordDaily) daily.push({ day, practice, theta: learner.theta(), rank: rankHW, cf: cfs.cf, placedTier: place.placedTier, ceiling: entryCeiling(ex, place.placedTier, rankHW, passedExerciseIds(passes)), pNext });
    if (o.stopWhenRank !== undefined && rankHW !== null && rankHW >= o.stopWhenRank) break;
  }
  return { passes, rankDay, finalRank: rankHW, finalCf: cfs.cf, slumps, rises, placementDrops, finalPlaced: place.placedTier, longestStall, stallTier, looks, calib, practiceDays, daily };
}

/** The first-cold-of-day takes at a tier, in time order, as attempts for the §1.3 non-tempo posterior. */
function coldAtTier(cells: Cell[], t: number): { day: number; clean: boolean; cell: string }[] {
  const out: { at: number; day: number; clean: boolean; cell: string }[] = [];
  for (const c of cells) if (c.ex.tier === t) for (const a of c.tracker.coldLog) out.push({ ...a, cell: c.id });
  return out.sort((a, b) => a.at - b.at);
}

// The day-by-day simulation of one learner in one laddered / fixed-tempo area (SPEC-HOLISTIC-2 §9.1): a simple planner
// (practice days per week, sessions, a rotation offering cells at tiers ≤ the entry ceiling, confirmation slots), the
// §1.6 item pass, H8 rank (§1.7), the entry ceiling (§1.3), the placement correction (§1.3) and the current-form
// posterior (§1.7). Pure.
//
// Round 17 options (all off by default, so the v13 numbers reproduce exactly; the default RNG stream is unchanged):
// - `evidence`: where the item pass's share test reads its counting checks (P0 cell, P1 pooled per exercise, P2 ≥ 4
//   checks, P3 both; itemPass.ts);
// - `supply`: confirmation slots as a per-SESSION cap shared across the instrument's areas, plus modelled FSRS-review
//   looks (§1.7 "Supply and slots");
// - `calibRhoC`: calibration of the window posterior against two estimands (the window's own cells, and the tier's
//   fresh-cell p) over a grid of ρ_c;
// - `h10`: the tempo model (staircase, warm climb, §1.9 threshold estimates), readiness entry (§1.7a, capped at
//   base + 2 non-empty tiers) and the challenge-point planner (new items aimed at the working edge, no-easier rule
//   with re-entry and slump exempt), with per-session frontier records.

import type { AreaCatalogue } from './catalogue';
import { admitLook, CURRENT_FORM, initCurrentForm, stepCurrentForm, windowAt, windowPosterior, type CurrentFormOpts, type Look, type PassedCell } from './currentForm';
import { DEFAULT_PASS_EVIDENCE, ItemPassTracker, poolKey, type PassEvidence, type PassVariant, type ResetMode } from './itemPass';
import { Learner, TEMPO_STEP, tempoDifficulty, type LearnerParams } from './learner';
import { initPlacement, isPlaced, nonTempoPlacementDay, tempoPlacementDay, type NonTempoMode, type PlacementState } from './placement';
import { mulberry32, normal, randInt, type Rng } from './prng';
import { entryCeiling, keysOf, nonEmptyTiers, passedExerciseIds, rankableTiers, RANK_FIX, updateRankHW, type CountingCheck, type Exercise, type PassRecord, type RankOpts } from './rank';
import { betaQuantile, logit, quantile } from './stats';
import { THRESHOLD, thresholdEstimate, type ColdTrial } from './threshold';

export interface PlannerConfig {
  /** Practice days per week (integer 1–7; the days are drawn at random each week). */
  practiceDaysPerWeek: number;
  /** Chance of a second session on a practice day (≥ 2 h later). */
  secondSessionProb: number;
  /** Working (unpassed) cells visited per session in this area. */
  workCellsPerSession: number;
  /** Warm takes at target after the cold check, per visit. */
  warmTakesPerVisit: number;
  /** Confirmation slots per session given to this area (supply mode 'perArea'; §1.7: 2–4 per session across all areas). */
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

/** The supply of looks (§1.7 "Supply and slots"; round 17 review #3). */
export interface SupplyOpts {
  /** 'perArea' (the v13 harness): this area gets `confirmSlots` every session. 'shared': `sessionCap` slots per session across `areas` areas. */
  mode: 'perArea' | 'shared';
  /** Slots per session across all areas (§1.7: 2–4, scaled by session length). */
  sessionCap: number;
  /** Areas practised in a session that share the cap (the slots rotate across them; this area gets its turn). */
  areas: number;
  /** Model FSRS-review looks: passed cells due for review get a cold take at the probe band (it counts as a look). */
  reviews: boolean;
  /** At most this many due reviews per session in this area (the workout2 review quota). */
  reviewsPerSession: number;
  /** Days from the pass to the first review, interval growth on a clean review, shrink on a miss (≥ 1 day). */
  fsrsFirst: number;
  fsrsGrowth: number;
  fsrsLapse: number;
}

export const PER_AREA_SUPPLY: SupplyOpts = { mode: 'perArea', sessionCap: 2, areas: 1, reviews: false, reviewsPerSession: 0, fsrsFirst: 3, fsrsGrowth: 2.5, fsrsLapse: 0.3 };
/** The spec's supply: 3 slots per session shared by 4 areas practised that session, plus FSRS-review looks. */
export const SHARED_SUPPLY: SupplyOpts = { mode: 'shared', sessionCap: 3, areas: 4, reviews: true, reviewsPerSession: 2, fsrsFirst: 3, fsrsGrowth: 2.5, fsrsLapse: 0.3 };

/** H10 (§1.7a) options. All off = the v13 planner (every take at target, new cells by `frontierWeight`). */
export interface H10Opts {
  /** The tempo model: new cells start below target; a 2-up-1-down cold staircase, a warm climb, §1.9 threshold estimates. */
  tempo: boolean;
  /** Readiness entry: the next non-empty tier above the entered ones opens when ≥ min(readyCount, available) of the highest entered tier's exercises are ready; capped at base + 2 non-empty tiers. */
  readiness: boolean;
  /** The challenge-point planner: new items aimed at the working edge (content), new cells start at the threshold edge (tempo). */
  challenge: boolean;
  /** The new/strengthen content target never falls below the last session's (re-entry, slump and a placement drop exempt). */
  noEasier: boolean;
  /** A new item's start tempo, × target (also the floor of the challenge start tempo). */
  startFrac: number;
  readyCount: number;
  /** Planner weights for new exercises in challenge mode: at the target tier, one tier above it, below it. */
  wTarget: number;
  wAbove: number;
  wBelow: number;
}

export const H10_OFF: H10Opts = { tempo: false, readiness: false, challenge: false, noEasier: false, startFrac: 0.7, readyCount: 2, wTarget: 6, wAbove: 2, wBelow: 0.5 };
/** The tempo model with the v13 planner (the H10 baseline). */
export const H10_BASELINE: H10Opts = { ...H10_OFF, tempo: true };
/** The tempo model, readiness entry, the challenge point and the no-easier rule (§1.7a as proposed in round 17). */
export const H10_ON: H10Opts = { ...H10_OFF, tempo: true, readiness: true, challenge: true, noEasier: true };

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
  /** The item pass's cold half (default DEFAULT_PASS_VARIANT = V1; V0 = v12 as written). */
  variant?: PassVariant;
  /** Where the share test reads its counting checks (default P0 = per cell, the v13 rule). */
  evidence?: PassEvidence;
  /** Rank options (default: fix 1, rank needs >= 2 distinct exercises, keys = union). */
  rank?: RankOpts;
  /** The non-tempo placement-correction rule (default DEFAULT_NON_TEMPO). */
  nonTempoMode?: NonTempoMode;
  /**
   * §1.3 N1 attempts = first cold takes of ALL cells at placedTier (spec, default true), i.e. confirmation looks of
   * passed cells too; false = only working (unpassed) cells (the v13 harness).
   */
  n1AllCells?: boolean;
  /** Look supply (default PER_AREA_SUPPLY = the v13 harness). */
  supply?: Partial<SupplyOpts>;
  /** Calibration grid: coverage is also scored for these ρ_c values (evaluation only; decisions use currentForm.rhoC). */
  calibRhoC?: number[];
  /** H10 options (default H10_OFF). */
  h10?: Partial<H10Opts>;
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
  /** H10 (recorded when h10.tempo or h10.challenge is on, on practice days): the working edge and today's offer. */
  frontier?: FrontierRecord;
}

/** One practice day's offered frontier (new and strengthen cells, i.e. working cells). */
export interface FrontierRecord {
  /** Content edge: the highest entered tier with a ready cell (established, passed, or non-provisional threshold ≥ 0.95). */
  contentEdge: number;
  /** The highest entered tier (entry ceiling, plus readiness entry). */
  enteredTop: number;
  /** The challenge planner's target tier (the base when off). */
  target: number;
  /** Mean content tier, mean cold tempo (× target) and mean difficulty (tier + ln f / ln 1.2) of today's working visits. */
  tier: number;
  tempo: number;
  difficulty: number;
  /** The highest content tier offered today. */
  maxTier: number;
  /** Today was exempt from the no-easier rule (re-entry, a slump since the last session, a placement drop). */
  exempt: boolean;
}

export interface SlumpEvent {
  day: number;
  from: number;
  /** True mean cold p of the passed cells at tiers ≥ the tier demoted from (marginal over the day effect). */
  truth: number;
  /** True marginal cold p of a fresh cell at the tier demoted from. */
  tierTruth: number;
}

/** Calibration of the window posterior's 80 % interval, scored against two estimands (round 17 review #4). */
export interface Calib {
  n: number;
  /** Coverage of the window's own cells' mean true p: with n_eff (currentForm ρ), and naive (raw n). */
  hits: number;
  naiveHits: number;
  bias: number;
  sq: number;
  /** Coverage of the tier estimand (fresh cells at the window's tiers: mean trueTierP over the looks). */
  tierHits: number;
  naiveTierHits: number;
  tierBias: number;
  tierSq: number;
  /** Per ρ_c in `calibRhoC`: hits against each estimand. */
  grid: { rhoC: number; hits: number; tierHits: number }[];
}

export interface SimResult {
  passes: PassRecord[];
  /** Truth at each pass: the cell's true cold p (item practice included) and the tier's fresh-cell p. */
  passTruth: { tier: number; day: number; cellP: number; tierP: number }[];
  /** First day rank reached each tier. */
  rankDay: Map<number, number>;
  /** At each rank rise: the new rank and the learner's true marginal cold p at that tier (a fresh cell). */
  rankTruth: { tier: number; day: number; p: number }[];
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
  /** Looks that came from FSRS reviews (supply.reviews). */
  reviewLooks: number;
  calib: Calib;
  practiceDays: number;
  daily: DailyRecord[];
}

/** The H10 tempo state of a cell. */
interface TempoState {
  start: number;
  stair: number;
  step: number;
  run: number;
  lastDir: number;
  work: number;
  cleanBest: number;
  trials: ColdTrial[];
  est: number | null;
  provisional: boolean;
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
  /** FSRS review state (supply.reviews). */
  due: number;
  ivl: number;
  tempo: TempoState | null;
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

const PROBE = 0.95;
const newCalib = (grid: number[]): Calib => ({ n: 0, hits: 0, naiveHits: 0, bias: 0, sq: 0, tierHits: 0, naiveTierHits: 0, tierBias: 0, tierSq: 0, grid: grid.map((rhoC) => ({ rhoC, hits: 0, tierHits: 0 })) });

/** Run one learner in one area. */
export function simulate(o: SimOptions): SimResult {
  const rng = mulberry32(o.seed);
  const learner = new Learner(o.learner, mulberry32(o.seed ^ 0x51ed));
  const P: PlannerConfig = { ...DEFAULT_PLANNER, ...o.planner };
  const CF: CurrentFormOpts = { ...CURRENT_FORM, ...o.currentForm };
  const S: SupplyOpts = { ...PER_AREA_SUPPLY, ...o.supply };
  const X: H10Opts = { ...H10_OFF, ...o.h10 };
  const n1All = o.n1AllCells ?? true;
  const evidence = o.evidence ?? DEFAULT_PASS_EVIDENCE;
  const tempoStep = o.learner.tempoStep ?? TEMPO_STEP;
  const thrOpts = { ...THRESHOLD, slope: o.learner.beta / Math.log(tempoStep) };
  const recordFrontier = X.tempo || X.challenge || X.readiness;
  const ex = o.catalogue.exercises;
  const tiers = nonEmptyTiers(ex);
  const cells: Cell[] = [];
  const cellById = new Map<string, Cell>();
  const pools = new Map<string, boolean[]>();
  const passes: PassRecord[] = [];
  /** Every counting cold check of every working cell (shelved ones included), for the rank tier guard. */
  const checks: CountingCheck[] = [];
  const passTruth: SimResult['passTruth'] = [];
  const looks: Look[] = [];
  let reviewLooks = 0;
  const rankDay = new Map<number, number>();
  const rankTruth: { tier: number; day: number; p: number }[] = [];
  let rankHW: number | null = o.rankHW ?? null;
  const rankOpts = o.rank ?? RANK_FIX;
  const rankable = rankableTiers(ex, rankOpts);
  let place: PlacementState = initPlacement(o.placedTier ?? 0, tiers);
  let cfs = initCurrentForm();
  const slumps: SlumpEvent[] = [];
  const rises: number[] = [];
  const placementDrops: { day: number; to: number }[] = [];
  const daily: DailyRecord[] = [];
  const calib = newCalib(o.calibRhoC ?? []);
  let week = new Set<number>();
  let lastPracticeDay = -Infinity;
  let reentryLeft = 0;
  let practiceDays = 0;
  let stallRun = 0;
  let longestStall = 0;
  let stallTier: number | null = null;
  let prevRank: number | null = rankHW;
  // Shared supply: the slot rotation across areas (this area is area 0).
  let rot = S.mode === 'shared' ? randInt(rng, Math.max(1, S.areas)) : 0;
  // H10: the last session's target tier, and events that exempt the next session from the no-easier rule.
  let lastTarget: number | null = null;
  let lastSlumpDay = -Infinity;
  let lastDropDay = -Infinity;
  let lastTargetDay = -Infinity;
  const inBreak = (d: number) => (o.breaks ?? []).some(([a, b]) => d >= a && d < b);
  const passKeysFrom = (t: number): Set<number | null> => new Set(passes.filter((p) => p.tier >= t && p.key !== null).map((p) => p.key));
  const passedCells = (): PassedCell[] => cells.filter((c) => c.passed).map((c) => ({ cell: c.id, exerciseId: c.ex.id, key: c.key, tier: c.ex.tier }));
  const nextTier = (t: number): number | undefined => tiers.find((x) => x > t);
  /** A cell is ready (§1.7a): passed or `established`, or a non-provisional threshold estimate at the probe band. */
  const ready = (c: Cell): boolean => c.passed || c.tracker.established || (c.tempo !== null && c.tempo.est !== null && !c.tempo.provisional && c.tempo.est >= PROBE);
  /** §1.7a readiness entry on top of the tier-wide ceiling, capped at base + 2 non-empty tiers. */
  const enteredTop = (ceiling: number, base: number): number => {
    if (!X.readiness) return ceiling;
    const above = tiers.filter((t) => t > base);
    const cap = above.length ? above[Math.min(1, above.length - 1)] : ceiling;
    let top = ceiling;
    for (;;) {
      const nt = nextTier(top);
      if (nt === undefined || nt > cap) break;
      const avail = ex.filter((e) => e.available && e.tier === top);
      const readyEx = new Set(cells.filter((c) => c.ex.tier === top && ready(c)).map((c) => c.ex.id));
      if (avail.length && readyEx.size >= Math.min(X.readyCount, avail.length)) top = nt;
      else break;
    }
    return Math.max(top, ceiling);
  };
  /**
   * The content edge: the highest tier with a ready cell, at least max(placedTier, current form) (current form ≤ rank;
   * readiness is sticky, so a slump lowers only that floor).
   */
  const contentEdge = (): number => {
    let e = Math.max(place.placedTier, cfs.cf ?? rankHW ?? -Infinity, tiers.length ? tiers[0] : 0);
    for (const c of cells) if (c.ex.tier > e && ready(c)) e = c.ex.tier;
    return e;
  };
  /** The challenge start tempo of a new cell: the threshold edge borrowed from the same exercise, then the same tier, then the tier below. */
  const challengeTempo = (e: Exercise): number => {
    const est = (cs: Cell[]) => cs.filter((c) => c.tempo && c.tempo.est !== null && !c.tempo.provisional).map((c) => (c.tempo as TempoState).est as number);
    let xs = est(cells.filter((c) => c.ex.id === e.id));
    if (!xs.length) xs = est(cells.filter((c) => c.ex.tier === e.tier));
    if (!xs.length) {
      const below = [...tiers].reverse().find((t) => t < e.tier && cells.some((c) => c.ex.tier === t && c.tempo && c.tempo.est !== null && !c.tempo.provisional));
      if (below !== undefined) xs = est(cells.filter((c) => c.ex.tier === below)).map((f) => f / Math.pow(tempoStep, e.tier - below));
    }
    const f = xs.length ? quantile(xs, 0.5) : X.startFrac;
    return Math.min(1, Math.max(X.startFrac, f));
  };
  if (rankHW !== null) rankDay.set(rankHW, 0);
  cfs = stepCurrentForm(cfs, looks, [], rankHW, 0, CF).state;

  for (let day = 0; day < o.days; day++) {
    if (day % 7 === 0) week = weekPlan(rng, P.practiceDaysPerWeek);
    const practice = week.has(day % 7) && !inBreak(day);
    let paceToday: number | null = null;
    let offeredPlaced = false;
    const placedToday: boolean[] = [];
    const fr = { tiers: [] as number[], tempos: [] as number[], edge: 0, top: 0, target: 0, exempt: false };
    if (practice) {
      practiceDays++;
      if (day - lastPracticeDay - 1 >= 7) reentryLeft = 3;
      const reentry = reentryLeft > 0;
      lastPracticeDay = day;
      const start = 7 + rng() * 15;
      const sessions = [start];
      if (rng() < P.secondSessionProb && start + 2 < 23.5) sessions.push(start + 2 + rng() * Math.min(4, 23.5 - start - 2));
      const lookToday: Look[] = [];
      /** A cold take of a passed cell in the probe band (a slot or an FSRS review); returns whether it was clean. */
      const lookTake = (c: Cell, now: number, review: boolean): boolean => {
        const cold = now - c.lastSound >= 1;
        const first = cold && c.lastColdDay !== day;
        const clean = learner.take(c.ex.tier, c.id, day, c.visits, !cold);
        if (first) {
          c.lastColdDay = day;
          if (n1All && c.ex.tier === place.placedTier) {
            placedToday.push(clean);
            offeredPlaced = true;
          }
          const look: Look = { at: now, day, cell: c.id, exerciseId: c.ex.id, key: c.key, tier: c.ex.tier, clean, reentry };
          if (admitLook(lookToday, look)) {
            lookToday.push(look);
            looks.push(look);
            c.lastLookDay = day;
            if (review) reviewLooks++;
          }
        }
        c.lastSound = now;
        c.lastVisitDay = day;
        return clean;
      };
      for (const sh of sessions) {
        let now = day * 24 + sh;
        const passedSet = passedExerciseIds(passes);
        const ceiling = entryCeiling(ex, place.placedTier, rankHW, passedSet);
        const base = Math.max(place.placedTier, rankHW ?? -Infinity);
        const top = enteredTop(ceiling, base);
        // FSRS reviews (supply.reviews): passed cells due today, most overdue first; each is a cold probe-band take.
        if (S.reviews) {
          const due = cells.filter((c) => c.passed && c.due <= day && c.lastVisitDay !== day).sort((a, b) => a.due - b.due).slice(0, S.reviewsPerSession);
          for (const c of due) {
            const clean = lookTake(c, now, true);
            c.ivl = clean ? c.ivl * S.fsrsGrowth : Math.max(1, c.ivl * S.fsrsLapse);
            c.due = day + Math.max(1, Math.round(c.ivl));
            now += 0.05;
          }
        }
        // Confirmation slots (§1.7): passed cells only, the main item's cold check first, a new exercise per slot.
        const cfTier = cfs.cf ?? 0;
        const conf = cells
          .filter((c) => c.passed && c.lastVisitDay !== day)
          .map((c) => ({ c, s: (c.ex.tier >= cfTier ? 0 : 1000) + c.lastLookDay + rng() }))
          .sort((a, b) => a.s - b.s)
          .map((x) => x.c);
        const usedEx = new Set<string>();
        let slots = P.confirmSlots;
        if (S.mode === 'shared') {
          slots = 0;
          for (let k = 0; k < S.sessionCap; k++) if ((rot + k) % Math.max(1, S.areas) === 0) slots++;
          rot = (rot + S.sessionCap) % Math.max(1, S.areas);
        }
        for (const c of conf) {
          if (slots <= 0) break;
          if (usedEx.has(c.ex.id) && conf.some((d) => !usedEx.has(d.ex.id) && d !== c)) continue;
          usedEx.add(c.ex.id);
          slots--;
          lookTake(c, now, false);
          now += 0.05;
        }
        // H10: the challenge point for new items (content target), with the no-easier rule.
        let target = base;
        let exempt = false;
        if (X.challenge) {
          const edge = contentEdge();
          const entered = tiers.filter((t) => t <= top);
          const open = (t: number) => ex.some((e) => e.available && e.tier === t && !passedSet.has(e.id));
          target = entered.find((t) => t >= edge && open(t)) ?? top;
          exempt = reentry || lastSlumpDay >= lastTargetDay || lastDropDay >= lastTargetDay;
          if (X.noEasier && !exempt && lastTarget !== null) target = Math.max(target, Math.min(lastTarget, top));
          lastTarget = target;
          lastTargetDay = day;
        }
        if (recordFrontier) {
          fr.edge = contentEdge();
          fr.top = top;
          fr.target = target;
          fr.exempt = fr.exempt || exempt;
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
            pool = ex.filter((e) => e.available && e.tier <= top && !passedSet.has(e.id) && !busy.has(e.id));
            if (rankOpts.tierGuard) {
              // With the tier guard, a passed exercise above rank comes back in a new key (a fresh cell is unbiased tier
              // evidence); without this a fully passed small tier could never gather the guard's checks.
              pool = pool.concat(ex.filter((e) => e.available && e.keys > 0 && e.tier <= top && e.tier > (rankHW ?? -1) && passedSet.has(e.id) && !busy.has(e.id)));
            } else if (P.offerNewKeys) {
              pool = pool.concat(ex.filter((e) => e.available && e.keys > 0 && e.tier <= top && e.tier > (rankHW ?? -1) && passedSet.has(e.id) && !busy.has(e.id) && passKeysFrom(e.tier).size < 2));
            }
          }
          const tUp = nextTier(target);
          const e = X.challenge
            ? pickWeighted(rng, pool, (x) => (x.tier === target ? X.wTarget : x.tier === tUp ? X.wAbove : x.tier < target ? X.wBelow : 1))
            : pickWeighted(rng, pool, (x) => (x.tier > base ? P.frontierWeight : 1));
          if (!e) break;
          const avoid = new Set<number | null>([...cells.filter((c) => c.ex.id === e.id).map((c) => c.key), ...passKeysFrom(e.tier)]);
          let key: number | null = null;
          if (e.keys > 0) {
            const ks = keysOf(e);
            const free = ks.filter((k) => !avoid.has(k));
            key = free.length ? free[randInt(rng, free.length)] : ks[randInt(rng, ks.length)];
          }
          const pk = poolKey(evidence, e.id, e.tier);
          let pool2 = pools.get(pk);
          if (!pool2) pools.set(pk, (pool2 = []));
          let tempo: TempoState | null = null;
          if (X.tempo) {
            const f0 = X.challenge ? challengeTempo(e) : X.startFrac;
            tempo = { start: f0, stair: f0, step: 0.05, run: 0, lastDir: 0, work: f0, cleanBest: 0, trials: [], est: null, provisional: true };
          }
          const c: Cell = { id: `${e.id}|${key}|${cells.length}`, ex: e, key, tracker: new ItemPassTracker(o.resetMode, o.variant, evidence, pool2), lastSound: -Infinity, lastColdDay: -1, lastVisitDay: -1, lastLookDay: -1, visits: 0, passed: false, shelved: false, due: Infinity, ivl: S.fsrsFirst, tempo };
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
          const t = c.tempo;
          // The cold take's tempo: the staircase, or the pass probe max(staircase, 0.95) once the clean best reached 0.95.
          const fCold = t ? (t.cleanBest >= PROBE ? Math.max(t.stair, PROBE) : t.stair) : 1;
          const coldClean = learner.take(c.ex.tier, c.id, day, c.visits, !cold, fCold);
          if (first && c.ex.tier === place.placedTier) placedToday.push(coldClean);
          c.tracker.add({ at: now, day, clean: coldClean, cold, firstColdOfDay: first, atTarget: fCold >= PROBE - 1e-9 });
          if (c.tracker.lastCounting) checks.push({ tier: c.ex.tier, day, cell: c.id, clean: coldClean });
          if (recordFrontier && first) {
            fr.tiers.push(c.ex.tier);
            fr.tempos.push(fCold);
          }
          if (t) {
            if (cold) {
              // §1.9: every cold take feeds the staircase and the threshold; after a pass-probe take the staircase resets to the tempo played.
              t.trials.push({ day, f: fCold, clean: coldClean });
              t.stair = fCold;
              let dir = 0;
              if (coldClean) {
                t.cleanBest = Math.max(t.cleanBest, fCold);
                if (++t.run >= 2) {
                  dir = 1;
                  t.run = 0;
                }
              } else {
                dir = -1;
                t.run = 0;
              }
              if (dir !== 0) {
                if (t.lastDir !== 0 && dir !== t.lastDir) t.step = 0.025;
                t.lastDir = dir;
                t.stair = Math.min(1, Math.max(0.5, t.stair + dir * t.step));
              }
            }
            t.work = Math.max(t.work, Math.min(t.stair, 1));
          }
          for (let k = 0; k < P.warmTakesPerVisit; k++) {
            now += 0.03;
            const fw = t ? t.work : 1;
            const clean = learner.take(c.ex.tier, c.id, day, c.visits, true, fw);
            c.tracker.add({ at: now, day, clean, cold: false, firstColdOfDay: false, atTarget: fw >= PROBE - 1e-9 });
            if (t) {
              // The warm climb: a rise on every clean take, a step back on a miss (never below the start tempo).
              if (clean) {
                t.cleanBest = Math.max(t.cleanBest, fw);
                t.work = Math.min(1, fw + 0.04);
              } else t.work = Math.max(t.start, fw - 0.04);
            }
          }
          if (t) {
            const est = thresholdEstimate(t.trials, day, t.start, thrOpts);
            t.est = est.f;
            t.provisional = est.provisional;
          }
          c.lastSound = now;
          c.lastVisitDay = day;
          c.visits++;
          now += 0.05;
          if (c.tracker.passedAt !== null) {
            c.passed = true;
            c.due = day + S.fsrsFirst;
            passes.push({ exerciseId: c.ex.id, tier: c.ex.tier, key: c.key, at: c.tracker.passedAt });
            passTruth.push({ tier: c.ex.tier, day, cellP: learner.trueCellP(c.ex.tier, c.id, day, c.visits), tierP: learner.trueTierP(c.ex.tier, day) });
          } else if (c.visits >= P.maxVisitsPerCell) c.shelved = true;
        }
        learner.hours += P.sessionMinutes / 60;
        const before: number | null = rankHW;
        rankHW = updateRankHW(ex, passes, place.placedTier, rankHW, rankOpts, checks);
        if (rankHW !== null && rankHW !== before) {
          for (const t of tiers) if (t <= rankHW && !rankDay.has(t)) rankDay.set(t, day);
          rankTruth.push({ tier: rankHW, day, p: learner.trueTierP(rankHW, day) });
        }
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
        lastSlumpDay = day;
      }
      if (r.event === 'rise') rises.push(day);
      cfs = r.state;
      // Calibration of the window posterior at current form (§9.1), against the window's cells and against the tier.
      if (cfs.cf !== null) {
        const win = windowAt(looks, cfs.cf, endOfDay, -Infinity, CF, true, false);
        if (win.length >= CF.minLooks) {
          const wp = windowPosterior(win, CF);
          let truth = 0;
          let tierTruth = 0;
          for (const l of win) {
            const c = cellById.get(l.cell) as Cell;
            truth += learner.trueCellP(c.ex.tier, c.id, day, c.visits);
            tierTruth += learner.trueTierP(l.tier, day);
          }
          truth /= win.length;
          tierTruth /= win.length;
          const lo = betaQuantile(0.1, wp.post.a, wp.post.b);
          const hi = betaQuantile(0.9, wp.post.a, wp.post.b);
          const s = win.filter((l) => l.clean).length;
          const nlo = betaQuantile(0.1, 1 + s, 1 + win.length - s);
          const nhi = betaQuantile(0.9, 1 + s, 1 + win.length - s);
          const mean = wp.post.a / (wp.post.a + wp.post.b);
          calib.n++;
          if (truth >= lo && truth <= hi) calib.hits++;
          if (truth >= nlo && truth <= nhi) calib.naiveHits++;
          if (tierTruth >= lo && tierTruth <= hi) calib.tierHits++;
          if (tierTruth >= nlo && tierTruth <= nhi) calib.naiveTierHits++;
          calib.bias += mean - truth;
          calib.sq += (mean - truth) ** 2;
          calib.tierBias += mean - tierTruth;
          calib.tierSq += (mean - tierTruth) ** 2;
          for (const g of calib.grid) {
            const gp = windowPosterior(win, { rhoD: CF.rhoD, rhoC: g.rhoC });
            const glo = betaQuantile(0.1, gp.post.a, gp.post.b);
            const ghi = betaQuantile(0.9, gp.post.a, gp.post.b);
            if (truth >= glo && truth <= ghi) g.hits++;
            if (tierTruth >= glo && tierTruth <= ghi) g.tierHits++;
          }
        }
      }
      // Placement correction (§1.3), only while placed and only on offered days.
      if (!o.noPlacementCorrection && isPlaced(place, rankHW) && offeredPlaced) {
        const before = place.placedTier;
        if (o.catalogue.tempo) place = tempoPlacementDay(place, paceToday as number, tiers);
        else place = nonTempoPlacementDay(place, placedToday, tiers, o.nonTempoMode, day);
        if (place.placedTier !== before) {
          placementDrops.push({ day, to: place.placedTier });
          lastDropDay = day;
        }
      }
    }
    // Stall watch (§9.1): rank stands still while the true p at the next non-empty tier is ≥ 0.85.
    const next = rankable.find((t) => t > (rankHW ?? -1));
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
    if (o.recordDaily) {
      const rec: DailyRecord = { day, practice, theta: learner.theta(), rank: rankHW, cf: cfs.cf, placedTier: place.placedTier, ceiling: entryCeiling(ex, place.placedTier, rankHW, passedExerciseIds(passes)), pNext };
      if (recordFrontier && practice && fr.tiers.length) {
        const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
        rec.frontier = { contentEdge: fr.edge, enteredTop: fr.top, target: fr.target, tier: mean(fr.tiers), tempo: mean(fr.tempos), difficulty: mean(fr.tiers.map((t, i) => tempoDifficulty(t, fr.tempos[i], tempoStep))), maxTier: Math.max(...fr.tiers), exempt: fr.exempt };
      }
      daily.push(rec);
    }
    if (o.stopWhenRank !== undefined && rankHW !== null && rankHW >= o.stopWhenRank) break;
  }
  return { passes, passTruth, rankDay, rankTruth, finalRank: rankHW, finalCf: cfs.cf, slumps, rises, placementDrops, finalPlaced: place.placedTier, longestStall, stallTier, looks, reviewLooks, calib, practiceDays, daily };
}

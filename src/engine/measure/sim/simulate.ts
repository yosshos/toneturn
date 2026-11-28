// The day-by-day simulation of one learner in one laddered / fixed-tempo area (SPEC-HOLISTIC-2 §9.1): a simple planner
// (practice days per week, sessions, a rotation offering cells at tiers ≤ the entry ceiling, confirmation slots), the
// §1.6 item pass, H8 rank (§1.7), the entry ceiling (§1.3), the placement correction (§1.3) and the current-form
// posterior (§1.7). Pure.
//
// Defaults (owner 2026-11-28, SPEC-HOLISTIC-2 v14; v15 rule fixes of round 18): rank = H8 + the tier guard G
// (RANK_GUARDED; ungated H8 = RANK_FIX); supply = SHARED_SUPPLY (a per-session slot cap shared across areas + FSRS-review
// looks; PER_AREA_SUPPLY = v13); the planner = H10 in full (readiness entry, challenge point, no-easier; the tempo model
// in tempo areas; H10_OFF = v13).
// v15 (round 18):
// - cells are unique per exercise × key (the app's cell key); a shelved cell is resumed with its tracker, never duplicated;
// - at a tier with no fresh cell left (every exercise × key already has a cell: keyless areas, few-key exercises) the guard
//   also reads the probe-band cold looks of that tier's passed cells, and the guard reserve plays such a look (the guard
//   probe) when it has no fresh cell to offer (`guardLooks`, `guardProbe`);
// - a skipped due check (a cell sounded on a day its counting check was due, before or without that check) is a miss in
//   the guard record and the V1 share (`skipMiss`); `dayPicker` models learners who warm up first on bad days;
// - H10 readiness is evidence-based and re-evaluated (`readyRule: 'evidence'`), the content edge needs `edgeMin` ready
//   exercises and is capped at the entered top, and a struggling learner (estimated probe-band p of the target's working
//   cells < 0.3 over 14 days) is exempt from the no-easier rule (`struggle`);
// - the guard reserve and re-offer test the guard on its real range lo … t (grouped-down ranges), the re-entry window
//   ends per item at its first clean FSRS review, `offerNewKeys` is respected with the guard on, and lowered teacher
//   targets (`teacherTarget`) give coverage-only passes and checks the guard never reads.

import type { AreaCatalogue } from './catalogue';
import { admitLook, CURRENT_FORM, initCurrentForm, stepCurrentForm, windowAt, windowPosterior, type CurrentFormOpts, type Look, type PassedCell } from './currentForm';
import { DEFAULT_PASS_EVIDENCE, ItemPassTracker, poolKey, type PassEvidence, type PassVariant, type ResetMode } from './itemPass';
import { Learner, TEMPO_STEP, tempoDifficulty, type LearnerParams } from './learner';
import { initPlacement, isPlaced, nonTempoPlacementDay, tempoPlacementDay, type NonTempoMode, type PlacementState } from './placement';
import { mulberry32, normal, randInt, type Rng } from './prng';
import { DEFAULT_RANK, entryCeiling, guardLo, keysOf, nonEmptyTiers, passedExerciseIds, rankableTiers, tierGuardOk, updateRankHW, type CountingCheck, type Exercise, type PassRecord, type RankOpts } from './rank';
import { betaQuantile, logistic, logit, quantile } from './stats';
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
  /**
   * §1.7 shelving: a working cell is set aside after this many visits since it was last offered without a pass. A shelved
   * cell keeps its tracker (the cell key is fixed) and may be resumed later; its checks stay in the guard's record.
   */
  maxVisitsPerCell: number;
  /** Weight of exercises at tiers above the base (max(placedTier, rankHW)) vs below, when choosing new cells. */
  frontierWeight: number;
  /**
   * Offer a passed exercise above rank again in a new key while its tier needs it (§1.7: the key rule, or the guard).
   * Default true; false = never re-offer.
   */
  offerNewKeys: boolean;
  /**
   * With the rank tier guard: while the guard fails at the lowest tier t (rank < t <= the entered top) that already holds
   * a pass, one working slot per session goes to a fresh cell at t (an active cell there, else an unpassed exercise at t,
   * else a passed one in a new key; v15: else, at a tier with no fresh cell left, a guard probe), so the guard's record
   * keeps getting fresh checks (§1.7 step 6). Default true; false = the round 17 G planner.
   */
  guardReserve: boolean;
  /** v15: at a tier with no fresh cell left, the guard also reads the probe-band cold looks of that tier's passed cells. */
  guardLooks: boolean;
  /** v15: the guard reserve, with no fresh cell to offer at its tier, plays probe-band looks of passed cells there (the guard probe). */
  guardProbe: boolean;
  /** v15: at most this many guard probes per session (one per passed cell of the tier). */
  guardProbes: number;
  /** v15: a skipped due check (the cell sounded before, or without, its due cold check) is a miss in the guard's record and the V1 share (§1.6, §1.7). */
  skipMiss: boolean;
  /**
   * v15: a due check offered and not played (the learner left the area) is a miss in the guard's record while the
   * learner's skip share (skipped / offered due checks over the last `skipWindowDays`) exceeds `skipShareMax`.
   */
  unplayedMiss: boolean;
  skipShareMax: number;
  skipWindowDays: number;
  /** Alternative (owner question): warm-first skips also count as misses only above the skip share (default false: always). */
  warmSkipGated: boolean;
  /**
   * Explored in v14 for the item-gain sensitivity, NOT adopted (default off): a cell shelved with no counting check at all
   * is logged as one miss in the guard's record.
   */
  guardShelvedMiss: boolean;
  /** Explored, NOT adopted (default Infinity): only a cell's first `guardPerCell` counting checks enter the guard's record. */
  guardPerCell: number;
}

export const DEFAULT_PLANNER: PlannerConfig = { practiceDaysPerWeek: 4, secondSessionProb: 0.15, workCellsPerSession: 4, warmTakesPerVisit: 4, confirmSlots: 2, sessionMinutes: 20, maxVisitsPerCell: 12, frontierWeight: 3, offerNewKeys: true, guardReserve: true, guardLooks: true, guardProbe: true, guardProbes: 3, skipMiss: true, unplayedMiss: true, skipShareMax: 0.2, skipWindowDays: 30, warmSkipGated: false, guardShelvedMiss: false, guardPerCell: Infinity };
/** The v14 guard planner (no keyless fix, no skip rule) for comparisons. */
export const V14_GUARD_PLANNER: Partial<PlannerConfig> = { guardLooks: false, guardProbe: false, skipMiss: false, unplayedMiss: false };

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
  /** At most this many due reviews per session in this area (the per-area review allowance, §1.7). */
  reviewsPerSession: number;
  /** Days from the pass to the first review, interval growth on a clean review, shrink on a miss (≥ 1 day). */
  fsrsFirst: number;
  fsrsGrowth: number;
  fsrsLapse: number;
}

export const PER_AREA_SUPPLY: SupplyOpts = { mode: 'perArea', sessionCap: 2, areas: 1, reviews: false, reviewsPerSession: 0, fsrsFirst: 3, fsrsGrowth: 2.5, fsrsLapse: 0.3 };
/** The spec's supply: 3 slots per session shared by 4 areas practised that session, plus FSRS-review looks. */
export const SHARED_SUPPLY: SupplyOpts = { mode: 'shared', sessionCap: 3, areas: 4, reviews: true, reviewsPerSession: 2, fsrsFirst: 3, fsrsGrowth: 2.5, fsrsLapse: 0.3 };
/** The default supply (owner 2026-11-28): shared slots + FSRS-review looks. */
export const DEFAULT_SUPPLY: SupplyOpts = SHARED_SUPPLY;

/** H10 (§1.7a) options. All off = the v13 planner (every take at target, new cells by `frontierWeight`). */
export interface H10Opts {
  /** The tempo model: new cells start below target; a 2-up-1-down cold staircase, a warm climb, §1.9 threshold estimates. */
  tempo: boolean;
  /** Readiness entry: the next non-empty tier above the entered ones opens when ≥ min(readyCount, available) of the highest entered tier's exercises are ready; capped at base + 2 non-empty tiers. */
  readiness: boolean;
  /** The challenge-point planner: new items aimed at the working edge (content), new cells start at the threshold edge (tempo). */
  challenge: boolean;
  /** The new/strengthen content target never falls below the last session's (re-entry, slump, a placement drop and struggle exempt). */
  noEasier: boolean;
  /** A new item's start tempo, × target (also the floor of the challenge start tempo). */
  startFrac: number;
  readyCount: number;
  /** Planner weights for new exercises in challenge mode: at the target tier, one tier above it, below it. */
  wTarget: number;
  wAbove: number;
  wBelow: number;
  /**
   * What makes a cell ready (§1.7a). 'sticky' (v14): passed, or `established` (one clean counting check ever), or a
   * non-provisional threshold ≥ 0.95, never undone. 'evidence' (v15): ≥ 2 clean of the cell's last ≤ 3 probe-band cold
   * takes (counting checks, looks, skipped checks as misses; ≥ 2 takes), or a non-provisional threshold ≥ 0.95;
   * re-evaluated every session, so it decays when the evidence turns.
   */
  readyRule: 'sticky' | 'evidence';
  /** The content edge = the highest entered tier where ≥ min(edgeMin, available) exercises hold a ready cell (v14: 1). */
  edgeMin: number;
  /**
   * v15: the struggle step-down: when the estimated probe-band p of the working cells at the last target tier, over the
   * last `struggleDays` days (≥ `struggleMin` cold takes), is < `struggleP`, the challenge point steps down one open tier
   * (not below current form), at most once per `struggleDays`; the step holds (exempt from no-easier) until that tier
   * shows readiness (≥ min(readyCount, available) exercises with a ready cell).
   */
  struggle: boolean;
  struggleP: number;
  struggleDays: number;
  struggleMin: number;
  /** The step-down lifts one tier when the capped tier's estimated probe-band p is ≥ this. */
  recoverP: number;
  /** No step-down while the estimate is rising (above the previous window's). */
  struggleTrend: boolean;
}

export const H10_OFF: H10Opts = { tempo: false, readiness: false, challenge: false, noEasier: false, startFrac: 0.7, readyCount: 2, wTarget: 6, wAbove: 2, wBelow: 0.5, readyRule: 'evidence', edgeMin: 1, struggle: false, struggleP: 0.25, struggleDays: 21, struggleMin: 8, recoverP: 0.5, struggleTrend: true };
/** The tempo model with the v13 planner (the H10 baseline). */
export const H10_BASELINE: H10Opts = { ...H10_OFF, tempo: true };
/** H10 in full (§1.7a): the tempo model, readiness entry, the challenge point, the no-easier rule; v15 evidence readiness and the struggle exemption. */
export const H10_ON: H10Opts = { ...H10_OFF, tempo: true, readiness: true, challenge: true, noEasier: true, struggle: true };
/** H10 as in v14 (sticky readiness on one clean check, no struggle exemption): the round 18 ratchet, kept for comparison. */
export const H10_V14: H10Opts = { ...H10_ON, readyRule: 'sticky', edgeMin: 1, struggle: false };
/**
 * The default planner (owner 2026-11-28: H10 in full): H10_ON, with the tempo model only in tempo areas (a fixed-tempo
 * area such as harmony has no tempo axis). `h10: H10_OFF` gives the v13 planner.
 */
export const h10Default = (cat: AreaCatalogue): H10Opts => ({ ...H10_ON, tempo: cat.tempo });

/** Learner behaviour that games cold checks (round 18 #2). */
export type DayPicker = 'warmFirst' | 'warmFirst20' | 'senseSkip' | 'careless' | 'quitter';

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
  /** Rank options (default DEFAULT_RANK = H8 + the tier guard; RANK_FIX = ungated H8). */
  rank?: RankOpts;
  /** The non-tempo placement-correction rule (default DEFAULT_NON_TEMPO). */
  nonTempoMode?: NonTempoMode;
  /**
   * §1.3 N1 attempts = first cold takes of ALL cells at placedTier (spec, default true), i.e. confirmation looks of
   * passed cells too; false = only working (unpassed) cells (the v13 harness).
   */
  n1AllCells?: boolean;
  /** Look supply (default DEFAULT_SUPPLY = shared slots + FSRS reviews; PER_AREA_SUPPLY = the v13 harness). */
  supply?: Partial<SupplyOpts>;
  /** Calibration grid: coverage is also scored for these ρ_c values (evaluation only; decisions use currentForm.rhoC). */
  calibRhoC?: number[];
  /** H10 options (default h10Default(catalogue) = H10 in full; H10_OFF = the v13 planner). */
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
  /**
   * A learner who chooses the day for cold checks (round 18 #2). On a below-average day (day effect < 0):
   * 'warmFirst' warms every cell up first (no cold take of it that day); 'warmFirst20' does so only on the worst 20 % of
   * days (a picker who stays under the skip-share bar); 'senseSkip' warms up the first cell played, then
   * plays nothing more in the area that day. On other days both play cold as usual. 'careless' is an honest learner who
   * ignores the cold-first order on a random 20 % of practice days (not chosen by the day effect): the cost of the
   * skip rule to a learner who is not gaming it. 'quitter' is an honest learner who, on a random 20 % of practice days,
   * plays the first planned item (cold, as planned) and then leaves the area.
   */
  dayPicker?: DayPicker;
  /**
   * Lowered teacher targets: exerciseId → target as a fraction of the catalogue target (< 1). Those cells play at the
   * teacher target; their passes are coverage only and their checks never enter the guard (§1.7 teacher targets).
   */
  teacherTarget?: Record<string, number>;
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
  /** Content edge (§1.7a). */
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
  /** Today was exempt from the no-easier rule (re-entry, a slump since the last session, a placement drop, struggle). */
  exempt: boolean;
  /** Today's exemption came from the struggle rule. */
  struggle: boolean;
  /** Truth: mean fresh-cell cold p of today's working visits at their offered tempo, and at the probe band (target in fixed-tempo areas). */
  pOffer: number;
  pProbe: number;
}

export interface SlumpEvent {
  day: number;
  from: number;
  /** True mean cold p of the passed cells at tiers ≥ the tier demoted from (marginal over the day effect). */
  truth: number;
  /** True marginal cold p of a fresh cell at the tier demoted from. */
  tierTruth: number;
  /**
   * The tier estimand of the decision's own window: the mean fresh-cell p over the window's looks (each at its cell's
   * tier; the window at tier t reads passed cells at tiers >= t), as the calibration scores it.
   */
  windowTierTruth: number;
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
  /**
   * At each rank rise: the new rank and the learner's true marginal cold p at that tier on a fresh cell, at target (p),
   * at the probe band (pProbe: 0.95 × target in tempo areas, = p in fixed-tempo areas; the rank estimand, §1.1) and
   * against the tier's material as practised (pCat); and what the guard's record measured (pRecord: the recency-weighted
   * mean probe-band p of the cells behind its entries, with their item practice and cell luck; pPractised: the same
   * without the cell luck).
   */
  rankTruth: { tier: number; day: number; p: number; pProbe: number; pCat: number; pRecord: number; pPractised: number }[];
  finalRank: number | null;
  finalCf: number | null;
  /** At the end of the run, at the final rank tier: fresh-cell p at target, at the probe band, and the catalogue p. */
  finalTruth: { p: number; pProbe: number; pCat: number } | null;
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
  /** Every counting cold check of a working cell, and every skipped due check of one (the rank tier guard's record). */
  checks: CountingCheck[];
  /** Every probe-band cold look of a passed cell (and skipped due look), read by the guard only at a tier with no fresh cell left. */
  lookChecks: CountingCheck[];
  /** Skipped due checks (working cells) and looks (passed cells). */
  skips: number;
  /** Cells created (one per exercise × key at most). */
  cellCount: number;
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
  /** Visits since the cell was last offered (created or resumed): the shelving count. */
  visitsSince: number;
  passed: boolean;
  shelved: boolean;
  /** FSRS review state (supply.reviews). */
  due: number;
  ivl: number;
  tempo: TempoState | null;
  /** Counting cold checks this cell gave (the guard's record). */
  counted: number;
  /** Probe-band cold takes, first of the day (counting checks, looks, skipped checks as misses): v15 readiness. */
  probeLog: { day: number; clean: boolean }[];
  /** The re-entry window has ended for this cell (its first clean FSRS review since the break). */
  reentryCleared: boolean;
  /** Teacher target as a fraction of the catalogue target (1 = catalogue). */
  tFrac: number;
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

/** Merge two time-ordered check records. */
function mergeByTime(a: CountingCheck[], b: CountingCheck[]): CountingCheck[] {
  const out: CountingCheck[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (j >= b.length || (i < a.length && (a[i].at ?? 0) <= (b[j].at ?? 0))) out.push(a[i++]);
    else out.push(b[j++]);
  }
  return out;
}

export const PROBE = 0.95;
const newCalib = (grid: number[]): Calib => ({ n: 0, hits: 0, naiveHits: 0, bias: 0, sq: 0, tierHits: 0, naiveTierHits: 0, tierBias: 0, tierSq: 0, grid: grid.map((rhoC) => ({ rhoC, hits: 0, tierHits: 0 })) });
const cellKey = (exerciseId: string, key: number | null) => `${exerciseId}|${key}`;

/** Run one learner in one area. */
export function simulate(o: SimOptions): SimResult {
  const rng = mulberry32(o.seed);
  const learner = new Learner(o.learner, mulberry32(o.seed ^ 0x51ed));
  const P: PlannerConfig = { ...DEFAULT_PLANNER, ...o.planner };
  const CF: CurrentFormOpts = { ...CURRENT_FORM, ...o.currentForm };
  const S: SupplyOpts = { ...DEFAULT_SUPPLY, ...o.supply };
  const X: H10Opts = { ...h10Default(o.catalogue), ...o.h10 };
  const n1All = o.n1AllCells ?? true;
  const evidence = o.evidence ?? DEFAULT_PASS_EVIDENCE;
  const tempoStep = o.learner.tempoStep ?? TEMPO_STEP;
  const thrOpts = { ...THRESHOLD, slope: o.learner.beta / Math.log(tempoStep) };
  const recordFrontier = X.tempo || X.challenge || X.readiness;
  const probeF = o.catalogue.tempo ? PROBE : 1;
  const ex = o.catalogue.exercises;
  const tiers = nonEmptyTiers(ex);
  const cells: Cell[] = [];
  const cellById = new Map<string, Cell>();
  const cellByKey = new Map<string, Cell>();
  const pools = new Map<string, boolean[]>();
  const passes: PassRecord[] = [];
  /** Every counting cold check of every working cell (shelved ones included) and every skipped due check, for the rank tier guard. */
  const checks: CountingCheck[] = [];
  /** Probe-band cold looks of passed cells (first of the day per cell) and skipped due looks: read only at exhausted tiers. */
  const lookChecks: CountingCheck[] = [];
  /** Due checks offered and not played (the learner left the area): misses only while the skip share is above the bar. */
  const unplayed: CountingCheck[] = [];
  /** Days of due checks offered, and of skipped ones (warm-first or unplayed), in order: the skip share. */
  const dueDays: number[] = [];
  const skipDays: number[] = [];
  let skips = 0;
  const passTruth: SimResult['passTruth'] = [];
  const looks: Look[] = [];
  let reviewLooks = 0;
  const rankDay = new Map<number, number>();
  const rankTruth: SimResult['rankTruth'] = [];
  let rankHW: number | null = o.rankHW ?? null;
  const rankOpts = o.rank ?? DEFAULT_RANK;
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
  let lastDay = 0;
  // Shared supply: the slot rotation across areas (this area is area 0).
  let rot = S.mode === 'shared' ? randInt(rng, Math.max(1, S.areas)) : 0;
  // H10: the last session's target tier, and events that exempt the next session from the no-easier rule.
  let lastTarget: number | null = null;
  let lastSlumpDay = -Infinity;
  let lastDropDay = -Infinity;
  let lastTargetDay = -Infinity;
  let lastStruggleDay = -Infinity;
  /** v15: the stepped-down challenge point after a struggle, held until that tier shows readiness. */
  let struggleCap: number | null = null;
  const inBreak = (d: number) => (o.breaks ?? []).some(([a, b]) => d >= a && d < b);
  const passKeysFrom = (t: number): Set<number | null> => new Set(passes.filter((p) => p.tier >= t && p.key !== null).map((p) => p.key));
  const passedCells = (): PassedCell[] => cells.filter((c) => c.passed).map((c) => ({ cell: c.id, exerciseId: c.ex.id, key: c.key, tier: c.ex.tier }));
  const nextTier = (t: number): number | undefined => tiers.find((x) => x > t);
  /** v15: tiers with no fresh cell left: every available exercise × key there already has a cell (monotone, cached). */
  const exhaustedSet = new Set<number>();
  const exhausted = (t: number): boolean => {
    if (exhaustedSet.has(t)) return true;
    const es = ex.filter((e) => e.available && e.tier === t);
    const ok = es.length > 0 && es.every((e) => (e.keys > 0 ? keysOf(e).every((k) => cellByKey.has(cellKey(e.id, k))) : cellByKey.has(cellKey(e.id, null))));
    if (ok) exhaustedSet.add(t);
    return ok;
  };
  /** The guard's record: the counting checks, plus (v15) the passed cells' probe-band looks at tiers with no fresh cell left. */
  const guardRecord = (): CountingCheck[] => {
    let rec = checks;
    // Unplayed due checks are misses while the skip share over the last skipWindowDays exceeds skipShareMax.
    const over = P.unplayedMiss && unplayed.length > 0 && skipShare(lastDay) > P.skipShareMax;
    if (over) rec = mergeByTime(rec, unplayed.filter((u) => !(u as { look?: boolean }).look));
    if (!P.guardLooks || (!lookChecks.length && !over)) return rec;
    const ex0 = new Set(tiers.filter(exhausted));
    if (!ex0.size) return rec;
    let extra = lookChecks.filter((l) => ex0.has(l.tier));
    if (over) extra = mergeByTime(extra, unplayed.filter((u) => (u as { look?: boolean }).look && ex0.has(u.tier)));
    return extra.length ? mergeByTime(rec, extra) : rec;
  };
  /** The learner's skip share: skipped due checks (warmed up first, or offered and unplayed) over due checks offered, last window. */
  const skipShare = (day: number): number => {
    const from = day - P.skipWindowDays;
    let d = 0;
    let s = 0;
    for (let i = dueDays.length - 1; i >= 0 && dueDays[i] > from; i--) d++;
    for (let i = skipDays.length - 1; i >= 0 && skipDays[i] > from; i--) s++;
    return d ? s / d : 0;
  };
  /** A cell is ready (§1.7a). */
  const ready = (c: Cell): boolean => {
    const thr = c.tempo !== null && c.tempo.est !== null && !c.tempo.provisional && c.tempo.est >= PROBE;
    if (X.readyRule === 'sticky') return c.passed || c.tracker.established || thr;
    const last = c.probeLog.slice(-3);
    return thr || (last.length >= 2 && last.filter((x) => x.clean).length >= 2);
  };
  /** Exercises at tier t holding a ready cell. */
  const readyExercises = (t: number): number => new Set(cells.filter((c) => c.ex.tier === t && ready(c)).map((c) => c.ex.id)).size;
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
      if (avail.length && readyExercises(top) >= Math.min(X.readyCount, avail.length)) top = nt;
      else break;
    }
    return Math.max(top, ceiling);
  };
  /**
   * The content edge (§1.7a): the highest entered tier (≤ `top`) where ≥ min(edgeMin, available) exercises hold a ready
   * cell, at least max(placedTier, current form) (current form ≤ rank), capped at the entered top.
   */
  const contentEdge = (top: number): number => {
    let e = Math.max(place.placedTier, cfs.cf ?? rankHW ?? -Infinity, tiers.length ? tiers[0] : 0);
    for (const t of tiers) {
      if (t <= e || t > top) continue;
      const avail = ex.filter((x) => x.available && x.tier === t).length;
      if (avail && readyExercises(t) >= Math.min(X.edgeMin, avail)) e = t;
    }
    return Math.min(e, Math.max(top, tiers.length ? tiers[0] : 0));
  };
  /** The struggle floor: the current-form tier (strengthen work at the learner's own level), never below placedTier. */
  const strFloor = (): number => Math.max(place.placedTier, cfs.cf ?? rankHW ?? -Infinity);
  /**
   * v15 struggle: the estimated probe-band p of the working cells at tier t over the last struggleDays days (n = cold
   * takes behind it): a non-provisional threshold estimate read at 0.95 × target, else the clean share of the cell's
   * first cold takes of the day at the probe band.
   */
  const estAt = (t: number, day: number): { n: number; p: number } => {
    const from = day - X.struggleDays;
    let n = 0;
    let sum = 0;
    for (const c of cells) {
      if (c.passed || c.ex.tier !== t || c.lastVisitDay < from) continue;
      if (c.tempo && c.tempo.est !== null && !c.tempo.provisional) {
        const w = c.tempo.trials.filter((x) => x.day >= from && x.day <= day).length;
        if (!w) continue;
        n += w;
        sum += w * logistic(logit(thrOpts.pTarget) + thrOpts.slope * (Math.log(c.tempo.est) - Math.log(PROBE)));
      } else {
        const xs = c.tracker.coldLog.filter((x) => x.day >= from && x.day <= day);
        if (!xs.length) continue;
        n += xs.length;
        sum += xs.filter((t) => t.clean).length;
      }
    }
    return { n, p: n ? sum / n : NaN };
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
  /**
   * The tier's own material as practised (round 17 itemGain check): the mean, over every available exercise × key of
   * tier t, of the cold p with that cell's item-practice gain (0 visits if never offered), marginal over day and cell
   * effects. With itemGain 0 it equals the fresh-cell tier p.
   */
  const catalogueP = (t: number, day: number): number => {
    const es = ex.filter((e) => e.available && e.tier === t);
    let sum = 0;
    let n = 0;
    for (const e of es) {
      const ks: (number | null)[] = e.keys > 0 ? keysOf(e) : [null];
      for (const k of ks) {
        const c = cellByKey.get(cellKey(e.id, k));
        sum += learner.trueTierPAfter(t, day, c ? c.visits : 0);
        n++;
      }
    }
    return n ? sum / n : learner.trueTierP(t, day);
  };
  /**
   * How an exercise would be offered now: a new cell in a key it has no cell in yet (preferring keys the passes at its
   * tier and above do not cover), else its shelved unpassed cell resumed (tracker kept), else not at all.
   */
  const offerOf = (e: Exercise): { key: number | null; resume?: Cell } | null => {
    if (e.keys > 0) {
      const unused = keysOf(e).filter((k) => !cellByKey.has(cellKey(e.id, k)));
      if (unused.length) {
        const covered = passKeysFrom(e.tier);
        const pref = unused.filter((k) => !covered.has(k));
        const from = pref.length ? pref : unused;
        return { key: from[randInt(rng, from.length)] };
      }
    } else if (!cellByKey.has(cellKey(e.id, null))) return { key: null };
    const sh = cells.find((c) => c.ex.id === e.id && c.shelved && !c.passed);
    return sh ? { key: sh.key, resume: sh } : null;
  };
  const hasFreshCell = (e: Exercise): boolean => (e.keys > 0 ? keysOf(e).some((k) => !cellByKey.has(cellKey(e.id, k))) : !cellByKey.has(cellKey(e.id, null)));
  const canOffer = (e: Exercise): boolean => hasFreshCell(e) || cells.some((c) => c.ex.id === e.id && c.shelved && !c.passed);
  /** Create (or resume) the cell for an exercise; null when it has nothing to offer. */
  const openCell = (e: Exercise): Cell | null => {
    const off = offerOf(e);
    if (!off) return null;
    if (off.resume) {
      off.resume.shelved = false;
      off.resume.visitsSince = 0;
      return off.resume;
    }
    const pk = poolKey(evidence, e.id, e.tier);
    let pool2 = pools.get(pk);
    if (!pool2) pools.set(pk, (pool2 = []));
    let tempo: TempoState | null = null;
    if (X.tempo) {
      const f0 = X.challenge ? challengeTempo(e) : X.startFrac;
      tempo = { start: f0, stair: f0, step: 0.05, run: 0, lastDir: 0, work: f0, cleanBest: 0, trials: [], est: null, provisional: true };
    }
    const c: Cell = { id: cellKey(e.id, off.key), ex: e, key: off.key, tracker: new ItemPassTracker(o.resetMode, o.variant, evidence, pool2), lastSound: -Infinity, lastColdDay: -1, lastVisitDay: -1, lastLookDay: -1, visits: 0, visitsSince: 0, passed: false, shelved: false, due: Infinity, ivl: S.fsrsFirst, tempo, counted: 0, probeLog: [], reentryCleared: true, tFrac: o.teacherTarget?.[e.id] ?? 1 };
    cells.push(c);
    cellById.set(c.id, c);
    cellByKey.set(c.id, c);
    return c;
  };
  if (rankHW !== null) rankDay.set(rankHW, 0);
  cfs = stepCurrentForm(cfs, looks, [], rankHW, 0, CF).state;

  for (let day = 0; day < o.days; day++) {
    lastDay = day;
    if (day % 7 === 0) week = weekPlan(rng, P.practiceDaysPerWeek);
    const practice = week.has(day % 7) && !inBreak(day);
    let paceToday: number | null = null;
    let offeredPlaced = false;
    const placedToday: boolean[] = [];
    const fr = { tiers: [] as number[], tempos: [] as number[], pOffer: [] as number[], pProbe: [] as number[], edge: 0, top: 0, target: 0, exempt: false, struggle: false };
    if (practice) {
      practiceDays++;
      if (day - lastPracticeDay - 1 >= 7) {
        reentryLeft = 3;
        for (const c of cells) c.reentryCleared = false;
      }
      const reentry = reentryLeft > 0;
      lastPracticeDay = day;
      // The day picker's "bad day" (round 18 #2): the learner senses a below-average day.
      // warmDay: cells are warmed up before their due cold take; quitAfterFirst: the learner leaves the area after the first item played.
      const dp = o.dayPicker;
      const randomDay = dp === 'careless' || dp === 'quitter' ? rng() < 0.2 : false;
      // warmFirst20: a careful picker who warms up first only on the worst 20 % of days (day effect below its 20th percentile).
      const badDay = dp === 'warmFirst' || dp === 'senseSkip' ? learner.dayEffect(day) < 0 : dp === 'warmFirst20' ? learner.dayEffect(day) < -0.8416 * o.learner.sdDay : dp === 'careless' && randomDay;
      const quitAfterFirst = (dp === 'senseSkip' && badDay) || (dp === 'quitter' && randomDay);
      let quitArea = false;
      /** A due check of this cell was offered and not played (the learner had left the area): logged, a miss only above the skip share. */
      const logUnplayed = (c: Cell, now: number, look: boolean) => {
        skipDays.push(day);
        skips++;
        unplayed.push({ tier: c.ex.tier, day, cell: c.id, clean: false, at: now, kind: 'skip', countsForRank: c.tFrac >= 1, look } as CountingCheck & { look: boolean });
      };
      const start = 7 + rng() * 15;
      const sessions = [start];
      if (rng() < P.secondSessionProb && start + 2 < 23.5) sessions.push(start + 2 + rng() * Math.min(4, 23.5 - start - 2));
      const lookToday: Look[] = [];
      /**
       * A due cold take of a passed cell in the probe band (a slot, an FSRS review or a guard probe). Returns whether it
       * was clean, or null when no cold take happened (a day picker warmed the cell up first, or has left the area).
       */
      const lookTake = (c: Cell, now: number, review: boolean): boolean | null => {
        const dueNow = c.lastColdDay !== day;
        if (dueNow) dueDays.push(day);
        if (quitArea) {
          if (dueNow) logUnplayed(c, now, true);
          return null;
        }
        if (badDay) {
          // The day picker sounds the cell before its due cold take: a skipped due look (a miss for the guard, v15).
          if (dueNow && P.warmSkipGated) {
            c.lastColdDay = day;
            logUnplayed(c, now, true);
          } else if (dueNow) {
            c.lastColdDay = day;
            skips++;
            skipDays.push(day);
            if (P.skipMiss) {
              lookChecks.push({ tier: c.ex.tier, day, cell: c.id, clean: false, at: now, kind: 'skip', countsForRank: c.tFrac >= 1 });
              c.probeLog.push({ day, clean: false });
            }
          }
          learner.take(c.ex.tier, c.id, day, c.visits, true, c.tFrac);
          c.lastSound = now;
          c.lastVisitDay = day;
          if (quitAfterFirst) quitArea = true;
          return null;
        }
        const cold = now - c.lastSound >= 1;
        const first = cold && c.lastColdDay !== day;
        const clean = learner.take(c.ex.tier, c.id, day, c.visits, !cold, c.tFrac);
        if (first) {
          c.lastColdDay = day;
          c.probeLog.push({ day, clean });
          lookChecks.push({ tier: c.ex.tier, day, cell: c.id, clean, at: now, kind: 'look', countsForRank: c.tFrac >= 1 });
          if (n1All && c.ex.tier === place.placedTier) {
            placedToday.push(clean);
            offeredPlaced = true;
          }
          const look: Look = { at: now, day, cell: c.id, exerciseId: c.ex.id, key: c.key, tier: c.ex.tier, clean, reentry: reentry && !c.reentryCleared };
          if (admitLook(lookToday, look)) {
            lookToday.push(look);
            looks.push(look);
            c.lastLookDay = day;
            if (review) reviewLooks++;
          }
          // §1.7: the re-entry window ends per item at its first FSRS-good review.
          if (review && clean) c.reentryCleared = true;
        }
        c.lastSound = now;
        c.lastVisitDay = day;
        if (quitAfterFirst) quitArea = true;
        return clean;
      };
      for (const sh of sessions) {
        if (quitArea) break;
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
            if (clean !== null) {
              c.ivl = clean ? c.ivl * S.fsrsGrowth : Math.max(1, c.ivl * S.fsrsLapse);
              c.due = day + Math.max(1, Math.round(c.ivl));
            }
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
        if (quitArea) {
          // The learner left the area: the session's planned working cells with a due counting check go unplayed.
          for (const c of cells.filter((x) => !x.passed && !x.shelved).sort((a, b) => Number(b.tracker.firstTargetAt !== null) - Number(a.tracker.firstTargetAt !== null) || a.lastVisitDay - b.lastVisitDay).slice(0, P.workCellsPerSession)) {
            const t = c.tempo;
            const fCold = t ? (t.cleanBest >= PROBE ? Math.max(t.stair, PROBE) : t.stair) : 1;
            if (fCold >= PROBE - 1e-9 && c.tracker.due(now, day) && c.lastColdDay !== day) {
              dueDays.push(day);
              logUnplayed(c, now, false);
            }
          }
          break;
        }
        // H10: the challenge point for new items (content target), with the no-easier rule.
        let target = base;
        let exempt = false;
        let struggle = false;
        if (X.challenge) {
          const edge = contentEdge(top);
          const entered = tiers.filter((t) => t <= top);
          const open = (t: number) => ex.some((e) => e.available && e.tier === t && !passedSet.has(e.id));
          target = entered.find((t) => t >= edge && open(t)) ?? top;
          // v15 struggle: at most once per struggleDays, the challenge point steps one tier below the last target (a tier
          // with an unpassed exercise, or a passed one in a fresh key: strengthen work), never below current form.
          const strOpen = (t: number) => open(t) || ex.some((e) => e.available && e.tier === t && hasFreshCell(e));
          if (X.struggle && day - lastStruggleDay >= X.struggleDays && lastTarget !== null) {
            const est = estAt(lastTarget, day);
            // With struggleTrend, a learner whose estimate rose since the window before is progressing, not struggling.
            const prev = X.struggleTrend ? estAt(lastTarget, day - X.struggleDays) : { n: 0, p: NaN };
            const rising = prev.n >= X.struggleMin && est.p > prev.p;
            if (est.n >= X.struggleMin && est.p < X.struggleP && !rising) {
              struggle = true;
              lastStruggleDay = day;
              const below = [...entered].reverse().find((t) => t < (lastTarget as number) && t >= strFloor() && strOpen(t));
              if (below !== undefined) {
                struggleCap = below;
                // §1.7 shelving: working cells above the stepped-down challenge point are set aside (resumable, tracker kept).
                for (const c of cells) if (!c.passed && !c.shelved && c.ex.tier > below) c.shelved = true;
              }
            } else if (struggleCap !== null && est.n >= X.struggleMin && est.p >= X.recoverP) {
              // The step-down lifts one tier at a time when the capped tier's estimated probe-band p reaches recoverP.
              lastStruggleDay = day;
              const up = entered.find((t) => t > (struggleCap as number) && strOpen(t));
              struggleCap = up === undefined || up >= target ? null : up;
            }
          }
          if (struggleCap !== null) target = Math.min(target, struggleCap);
          // Exempt from no-easier: re-entry, a slump or a placement drop since the last session, a struggle step-down, and
          // (v15) a fall of the entered top because readiness evidence decayed.
          exempt = reentry || lastSlumpDay >= lastTargetDay || lastDropDay >= lastTargetDay || struggle || struggleCap !== null || (lastTarget !== null && top < lastTarget);
          if (X.noEasier && !exempt && lastTarget !== null) target = Math.max(target, Math.min(lastTarget, top));
          lastTarget = target;
          lastTargetDay = day;
        }
        if (recordFrontier) {
          fr.edge = contentEdge(top);
          fr.top = top;
          fr.target = target;
          fr.exempt = fr.exempt || exempt;
          fr.struggle = fr.struggle || struggle || struggleCap !== null;
        }
        // Working cells: in-progress first (awaiting the cold pair), then new ones from the rotation.
        const active = cells
          .filter((c) => !c.passed && !c.shelved && (o.onlyExercise === undefined || c.ex.id === o.onlyExercise))
          .sort((a, b) => Number(b.tracker.firstTargetAt !== null) - Number(a.tracker.firstTargetAt !== null) || a.lastVisitDay - b.lastVisitDay);
        // §1.7 step 6: the fresh check the tier guard needs (one reserved slot while it fails at a tier holding a pass).
        const record = rankOpts.tierGuard ? guardRecord() : checks;
        const g = rankOpts.tierGuard;
        const guardFails = (t: number): boolean => !!g && !tierGuardOk(record, guardLo(ex, t, ceiling, rankOpts), t, g);
        let guardTier: number | undefined;
        if (g && P.guardReserve && o.onlyExercise === undefined) {
          guardTier = tiers.find((t) => t > (rankHW ?? -1) && t <= top && passes.some((p) => p.tier === t && p.countsForRank !== false) && guardFails(t));
        }
        const reserve = guardTier !== undefined && !active.slice(0, P.workCellsPerSession).some((c) => c.ex.tier === guardTier);
        let budget = P.workCellsPerSession;
        const visit: Cell[] = active.slice(0, budget - (reserve ? 1 : 0));
        if (reserve) {
          const there = active.find((c) => c.ex.tier === guardTier && !visit.includes(c));
          if (there) visit.push(there);
        }
        let forceTier = reserve && !visit.some((c) => c.ex.tier === guardTier) ? guardTier : undefined;
        const busyIds = () => new Set(visit.map((c) => c.ex.id).concat(active.map((c) => c.ex.id)));
        while (visit.length < budget) {
          let pool: Exercise[];
          if (o.onlyExercise !== undefined) pool = ex.filter((e) => e.id === o.onlyExercise);
          else if (forceTier !== undefined) {
            const ft = forceTier;
            forceTier = undefined;
            const busy = busyIds();
            const open = ex.filter((e) => e.available && e.tier === ft && !passedSet.has(e.id) && !busy.has(e.id) && canOffer(e));
            pool = open.length ? open : P.offerNewKeys ? ex.filter((e) => e.available && e.tier === ft && passedSet.has(e.id) && !busy.has(e.id) && hasFreshCell(e)) : [];
            if (!pool.length) {
              // v15 guard probe: no fresh cell at the guard's tier, so the reserved slot plays a probe-band look of a
              // passed cell there (least recently looked), which the guard reads at such a tier.
              if (P.guardProbe && P.guardLooks && exhausted(ft)) {
                // up to guardProbes short probes, one per passed cell, least recently looked first; they use the reserved slot
                const pcs = cells.filter((c) => c.passed && c.ex.tier === ft && c.lastVisitDay !== day).sort((a, b) => a.lastLookDay - b.lastLookDay).slice(0, P.guardProbes);
                for (const pc of pcs) {
                  lookTake(pc, now, false);
                  now += 0.05;
                }
                if (pcs.length) budget--;
              }
              continue;
            }
          } else {
            const busy = busyIds();
            pool = ex.filter((e) => e.available && e.tier <= top && !passedSet.has(e.id) && !busy.has(e.id));
            // v15 struggle step-down: strengthen work at the capped tier and below includes passed exercises in fresh keys.
            if (struggleCap !== null) {
              const cap = struggleCap;
              const fl = strFloor();
              pool = pool.concat(ex.filter((e) => e.available && e.tier <= cap && e.tier >= fl && passedSet.has(e.id) && !busy.has(e.id) && hasFreshCell(e)));
            }
            if (rankOpts.tierGuard) {
              // With the tier guard, a passed exercise above rank comes back in a new key (a fresh cell is unbiased tier
              // evidence) when its tier still needs it: the key rule (< 2 keys), or the guard at that tier not yet met.
              if (P.offerNewKeys) {
                const needs = new Map<number, boolean>();
                const need = (t: number): boolean => {
                  let v = needs.get(t);
                  if (v === undefined) needs.set(t, (v = !P.guardReserve || passKeysFrom(t).size < 2 || guardFails(t)));
                  return v;
                };
                pool = pool.concat(ex.filter((e) => e.available && e.keys > 0 && e.tier <= top && e.tier > (rankHW ?? -1) && passedSet.has(e.id) && !busy.has(e.id) && need(e.tier)));
              }
            } else if (P.offerNewKeys) {
              pool = pool.concat(ex.filter((e) => e.available && e.keys > 0 && e.tier <= top && e.tier > (rankHW ?? -1) && passedSet.has(e.id) && !busy.has(e.id) && passKeysFrom(e.tier).size < 2));
            }
          }
          // Pick an exercise that can still be offered (a new key, or a shelved cell to resume).
          let c: Cell | null = null;
          let cand = [...new Set(pool)];
          while (!c && cand.length) {
            const tUp = nextTier(target);
            const e = X.challenge
              ? pickWeighted(rng, cand, (x) => (x.tier === target ? X.wTarget : x.tier === tUp ? X.wAbove : x.tier < target ? X.wBelow : 1))
              : pickWeighted(rng, cand, (x) => (x.tier > base ? P.frontierWeight : 1));
            if (!e) break;
            c = openCell(e);
            if (!c) cand = cand.filter((x) => x !== e);
          }
          if (!c) break;
          visit.push(c);
          if (o.onlyExercise !== undefined) break;
        }
        for (const c of visit) {
          const t = c.tempo;
          // The cold take's tempo: the staircase, or the pass probe max(staircase, 0.95) once the clean best reached 0.95.
          const fCold = t ? (t.cleanBest >= PROBE ? Math.max(t.stair, PROBE) : t.stair) : 1;
          const dueNow = fCold >= PROBE - 1e-9 && c.tracker.due(now, day) && c.lastColdDay !== day;
          if (dueNow) dueDays.push(day);
          if (quitArea) {
            if (dueNow) logUnplayed(c, now, false);
            continue;
          }
          if (c.ex.tier === place.placedTier) offeredPlaced = true;
          const firstVisitToday = c.lastVisitDay !== day;
          const fPlay = fCold * c.tFrac;
          // The day picker warms the cell up first on a bad day: no cold take; a due counting check is skipped (v15: a miss).
          const warmFirst = badDay && c.lastColdDay !== day;
          if (warmFirst) {
            c.lastColdDay = day;
            if (dueNow && P.warmSkipGated) {
              skips++;
              skipDays.push(day);
              unplayed.push({ tier: c.ex.tier, day, cell: c.id, clean: false, at: now, kind: 'skip', countsForRank: c.tFrac >= 1, look: false } as CountingCheck & { look: boolean });
            } else if (dueNow) {
              skips++;
              skipDays.push(day);
              if (P.skipMiss && c.tracker.addSkip(now, day)) {
                checks.push({ tier: c.ex.tier, day, cell: c.id, clean: false, at: now, kind: 'skip', countsForRank: c.tFrac >= 1 });
                c.probeLog.push({ day, clean: false });
              }
            }
          }
          const cold = !warmFirst && now - c.lastSound >= 1;
          const first = cold && c.lastColdDay !== day;
          if (first) c.lastColdDay = day;
          const coldClean = learner.take(c.ex.tier, c.id, day, c.visits, !cold, fPlay);
          if (first && c.ex.tier === place.placedTier) placedToday.push(coldClean);
          c.tracker.add({ at: now, day, clean: coldClean, cold, firstColdOfDay: first, atTarget: fCold >= PROBE - 1e-9 });
          if (c.tracker.lastCounting) {
            if (c.counted < P.guardPerCell) checks.push({ tier: c.ex.tier, day, cell: c.id, clean: coldClean, at: now, kind: 'check', countsForRank: c.tFrac >= 1 });
            c.counted++;
          }
          if (first && fCold >= PROBE - 1e-9 && c.tracker.firstTargetAt !== null) c.probeLog.push({ day, clean: coldClean });
          if (recordFrontier && firstVisitToday) {
            fr.tiers.push(c.ex.tier);
            fr.tempos.push(fCold);
            fr.pOffer.push(learner.trueTierP(c.ex.tier, day, fPlay));
            fr.pProbe.push(learner.trueTierP(c.ex.tier, day, probeF));
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
            const clean = learner.take(c.ex.tier, c.id, day, c.visits, true, fw * c.tFrac);
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
          c.visitsSince++;
          now += 0.05;
          if (c.tracker.passedAt !== null) {
            c.passed = true;
            c.due = day + S.fsrsFirst;
            passes.push({ exerciseId: c.ex.id, tier: c.ex.tier, key: c.key, at: c.tracker.passedAt, countsForRank: c.tFrac >= 1 });
            passTruth.push({ tier: c.ex.tier, day, cellP: learner.trueCellP(c.ex.tier, c.id, day, c.visits), tierP: learner.trueTierP(c.ex.tier, day) });
          } else if (c.visitsSince >= P.maxVisitsPerCell) {
            c.shelved = true;
            // Explored, not adopted: a cell set aside without ever reaching a counting check is one miss in the guard's record.
            if (P.guardShelvedMiss && c.counted === 0) checks.push({ tier: c.ex.tier, day, cell: c.id, clean: false, at: now, kind: 'check' });
          }
          if (quitAfterFirst) quitArea = true;
        }
        learner.hours += P.sessionMinutes / 60;
        const before: number | null = rankHW;
        rankHW = updateRankHW(ex, passes, place.placedTier, rankHW, rankOpts, rankOpts.tierGuard ? guardRecord() : checks);
        if (rankHW !== null && rankHW !== before) {
          for (const t of tiers) if (t <= rankHW && !rankDay.has(t)) rankDay.set(t, day);
          // What the guard's record measured: the recency-weighted mean true p of the cells behind its entries at lo … t,
          // with their item practice (and their own cell luck in pRecord), at the probe band.
          const lo = guardLo(ex, rankHW, entryCeiling(ex, place.placedTier, before, passedExerciseIds(passes)), rankOpts);
          const rec = (rankOpts.tierGuard ? guardRecord() : checks).filter((c) => c.tier >= lo && c.tier <= (rankHW as number) && c.countsForRank !== false);
          let wsum = 0;
          let pr = 0;
          let pp = 0;
          rec.forEach((c, i) => {
            const w = Math.pow(0.5, (rec.length - 1 - i) / (rankOpts.tierGuard?.halfLife ?? 24));
            const cc = cellById.get(c.cell) as Cell;
            wsum += w;
            pr += w * learner.trueCellP(cc.ex.tier, cc.id, day, cc.visits, probeF);
            pp += w * learner.trueTierPAfter(cc.ex.tier, day, cc.visits, probeF);
          });
          rankTruth.push({ tier: rankHW, day, p: learner.trueTierP(rankHW, day), pProbe: learner.trueTierP(rankHW, day, probeF), pCat: catalogueP(rankHW, day), pRecord: wsum ? pr / wsum : NaN, pPractised: wsum ? pp / wsum : NaN });
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
      const prevDecision = cfs.lastDecisionAt;
      const r = stepCurrentForm(cfs, looks, pc, rankHW, endOfDay, CF);
      if (r.event === 'slump' && prevCf !== null) {
        const above = cells.filter((c) => c.passed && c.ex.tier >= prevCf);
        const truth = above.reduce((s, c) => s + learner.trueCellP(c.ex.tier, c.id, day, c.visits), 0) / Math.max(1, above.length);
        const sw = windowAt(looks, prevCf, endOfDay, prevDecision, CF, true, true);
        const windowTierTruth = sw.reduce((s, l) => s + learner.trueTierP(l.tier, day), 0) / Math.max(1, sw.length);
        slumps.push({ day, from: prevCf, truth, tierTruth: learner.trueTierP(prevCf, day), windowTierTruth });
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
        rec.frontier = { contentEdge: fr.edge, enteredTop: fr.top, target: fr.target, tier: mean(fr.tiers), tempo: mean(fr.tempos), difficulty: mean(fr.tiers.map((t, i) => tempoDifficulty(t, fr.tempos[i], tempoStep))), maxTier: Math.max(...fr.tiers), exempt: fr.exempt, struggle: fr.struggle, pOffer: mean(fr.pOffer), pProbe: mean(fr.pProbe) };
      }
      daily.push(rec);
    }
    if (o.stopWhenRank !== undefined && rankHW !== null && rankHW >= o.stopWhenRank) break;
  }
  const finalTruth = rankHW === null ? null : { p: learner.trueTierP(rankHW, lastDay), pProbe: learner.trueTierP(rankHW, lastDay, probeF), pCat: catalogueP(rankHW, lastDay) };
  return { passes, passTruth, rankDay, rankTruth, finalRank: rankHW, finalCf: cfs.cf, finalTruth, slumps, rises, placementDrops, finalPlaced: place.placedTier, longestStall, stallTier, looks, reviewLooks, checks, lookChecks, skips, cellCount: cells.length, calib, practiceDays, daily };
}

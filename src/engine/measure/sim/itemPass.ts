// The item pass (SPEC-HOLISTIC-2 §1.6, SP §4.2 as amended) for technique, fixed-tempo, voice and rhythm cells. Pure.
//
//   passedAt = 3 counted clean takes at ≥ 95 % of target on ≥ 2 days
//            + 2 clean first-cold takes of the cell's main item on two distinct later days, each ≥ 8 h after, and on a
//              different local day from, the day the target was first reached. A cold miss between the two resets the pair.
//
// The cold half has variants (PassVariant): V1 is the default (owner 2026-11-27); V0 = v12 as written.
// Time is in hours from an arbitrary origin; `day` is the local day index. The harness abstracts tempo: `atTarget`
// marks a take in the probe band (≥ 0.95 × target), the only takes the rule reads.

import { betaCdf } from './stats';

/** One take of the cell's main item. */
export interface Take {
  /** Hours since the origin. */
  at: number;
  /** Local day index. */
  day: number;
  clean: boolean;
  /** ≥ 1 h since any sounding take of the cell (§1.4 `lastSound`). */
  cold: boolean;
  /** The first cold take of the cell's main item on this local day (§1.4). */
  firstColdOfDay: boolean;
  /** Played at ≥ 0.95 × target (the probe band). */
  atTarget: boolean;
}

/** §1.6 / §1.4: "later day" = ≥ 8 h after the first-target take and a different local day. */
export const LATER_DAY_HOURS = 8;
/** v15 (§1.6): a pending first clean of the pair expires after this many days (forgetting over long breaks is not modelled). */
export const PENDING_MAX_DAYS = 60;

/**
 * Which cold misses reset the pending pair. 'anyCold' (default, strict): any cold miss of the main item at the probe
 * band between the two counting takes. 'countingOnly': only a miss on a take that could itself have counted (first
 * cold of a later day). The spec line "A cold miss between the two resets that pair" does not say which; see report.
 */
export type ResetMode = 'anyCold' | 'countingOnly';

/**
 * The cold half of the item pass (harness option):
 * - V0 (v12 as written): 2 clean first-cold takes on distinct later days; a cold miss between them resets.
 * - V1 (the default, owner 2026-11-27): V0's pair, plus a clean share ≥ 2/3 over the last ≤ 6 counting cold checks of the cell.
 * - V2: a rolling 3-of-4: ≥ 3 clean among the last ≤ 4 counting cold checks (distinct days by construction).
 * - V3: Beta(1, 1) over the counting cold checks only: P(p ≥ 0.6) ≥ 0.85, with ≥ 3 checks on ≥ 3 days.
 */
export type PassVariant = 'V0' | 'V1' | 'V2' | 'V3';
export const PASS_VARIANTS: PassVariant[] = ['V0', 'V1', 'V2', 'V3'];
/** The default cold half: V1, approved by the owner 2026-11-27 (V0 = v12 as written stays selectable). */
export const DEFAULT_PASS_VARIANT: PassVariant = 'V1';

/**
 * Where the cold half's share test reads its counting checks (round 17 review #1; harness option on top of the variant):
 * - P0 (current): the cell's own counting checks (a new key starts a fresh record);
 * - P1: pooled per EXERCISE across all its keys and cells, shelved ones included (a new key never resets misses);
 * - P2: the cell's own checks, but ≥ 4 counting checks before the share test can pass;
 * - P3: P1 + P2 (pooled per exercise, ≥ 4 pooled checks);
 * - P4: pooled per content TIER (every exercise and key at the cell's tier, shelved cells included), ≥ 4 pooled checks
 *   (added in round 17 after P1–P3 left the stationary learner's inflation almost unchanged).
 * The pair (V0 / V1) stays per cell in every option. The simulator owns the pools (per exercise, or per tier for P4).
 */
export type PassEvidence = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export const PASS_EVIDENCE: PassEvidence[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
export const DEFAULT_PASS_EVIDENCE: PassEvidence = 'P0';
export const EVIDENCE_RULE: Record<PassEvidence, { pooled: boolean; minChecks: number }> = {
  P0: { pooled: false, minChecks: 0 },
  P1: { pooled: true, minChecks: 0 },
  P2: { pooled: false, minChecks: 4 },
  P3: { pooled: true, minChecks: 4 },
  P4: { pooled: true, minChecks: 4 },
};
/** The pool key of a cell: its exercise (P1 / P3) or its content tier (P4). */
export const poolKey = (evidence: PassEvidence, exerciseId: string, tier: number): string => (evidence === 'P4' ? `tier:${tier}` : exerciseId);

/** Incremental pass state for one cell (the sim feeds takes in time order). */
export class ItemPassTracker {
  private cleanCount = 0;
  private cleanDays = new Set<number>();
  /** When the warm half (3 counted clean on ≥ 2 days) was met. */
  warmDoneAt: number | null = null;
  /** The first clean take at target (SP §4.1 `firstTargetDay`). */
  firstTargetAt: number | null = null;
  firstTargetDay: number | null = null;
  /** The day of the pending first cold clean of the pair, or null. */
  pendingDay: number | null = null;
  /** V0's pair (sticky once complete). */
  pairDoneAt: number | null = null;
  /** The variant's cold half met. */
  coldDoneAt: number | null = null;
  passedAt: number | null = null;
  /** Whether the last take added was a counting cold check (the simulator logs these for the rank tier guard). */
  lastCounting = false;
  /** The counting cold checks (first cold takes of later days), clean or not, in order. */
  readonly counting: boolean[] = [];
  /** Every first-cold-of-day take at the probe band (for the §1.3 non-tempo placement correction). */
  readonly coldLog: { at: number; day: number; clean: boolean }[] = [];

  /**
   * `pool`: the exercise's shared counting-check log (P1 / P3), in time order across all its cells; this tracker appends
   * its own counting checks to it. Without one, a pooled option falls back to the cell's own log.
   */
  constructor(private readonly reset: ResetMode = 'anyCold', private readonly variant: PassVariant = DEFAULT_PASS_VARIANT, private readonly evidence: PassEvidence = DEFAULT_PASS_EVIDENCE, private readonly pool?: boolean[]) {}

  /** A clean cold take at the probe band on a later day (≥ 8 h, a different local day) than the first target: §1.6 `established`. */
  get established(): boolean {
    return this.counting.includes(true);
  }

  /** §1.6 counting take: a first cold take of a later day (≥ 8 h and a different local day after the first target). */
  isCounting(t: Take): boolean {
    return t.cold && t.firstColdOfDay && t.atTarget && this.firstTargetAt !== null && t.day > (this.firstTargetDay as number) && t.at - this.firstTargetAt >= LATER_DAY_HOURS;
  }

  /** The variant's cold rule, checked after each counting check. */
  private coldRuleMet(): boolean {
    const rule = EVIDENCE_RULE[this.evidence];
    const c = rule.pooled && this.pool ? this.pool : this.counting;
    if (c.length < rule.minChecks) return false;
    const last = (k: number) => c.slice(Math.max(0, c.length - k));
    const clean = (xs: boolean[]) => xs.filter(Boolean).length;
    switch (this.variant) {
      case 'V1': {
        const w = last(6);
        return this.pairDoneAt !== null && clean(w) / w.length >= 2 / 3;
      }
      case 'V2':
        return clean(last(4)) >= 3;
      case 'V3': {
        const s = clean(c);
        return c.length >= 3 && 1 - betaCdf(0.6, 1 + s, 1 + c.length - s) >= 0.85;
      }
      default:
        return this.pairDoneAt !== null;
    }
  }

  /**
   * v15 (§1.6): a skipped due check: on a later day the cell's counting cold check was due (offered at the probe band) but
   * the cell was sounded that day before, or without, it. It is a counting miss: it enters the clean share and resets a
   * pending pair. Honest learners, who play the cold check first (§1.4), never produce one.
   */
  addSkip(at: number, day: number): boolean {
    if (!this.due(at, day)) return false;
    if (this.pairDoneAt === null) this.pendingDay = null;
    this.counting.push(false);
    if (this.pool) this.pool.push(false);
    return true;
  }

  /** A counting cold check would count at this time (unpassed; a later day, ≥ 8 h after the first target). */
  due(at: number, day: number): boolean {
    return this.passedAt === null && this.firstTargetAt !== null && day > (this.firstTargetDay as number) && at - this.firstTargetAt >= LATER_DAY_HOURS;
  }

  add(t: Take): void {
    if (t.cold && t.firstColdOfDay && t.atTarget) this.coldLog.push({ at: t.at, day: t.day, clean: t.clean });
    this.lastCounting = false;
    if (this.passedAt !== null) return; // passed stays passed (SP §4.2)
    const counting = this.isCounting(t);
    this.lastCounting = counting;
    if (this.pairDoneAt === null) {
      // v15: a pending first clean older than PENDING_MAX_DAYS expires (a long break cannot complete a pair).
      if (counting && this.pendingDay !== null && t.day - this.pendingDay > PENDING_MAX_DAYS) this.pendingDay = null;
      if (counting && t.clean) {
        if (this.pendingDay !== null && this.pendingDay !== t.day) this.pairDoneAt = t.at;
        else this.pendingDay = t.day;
      } else if (!t.clean && t.cold && t.atTarget && (this.reset === 'anyCold' ? this.firstTargetAt !== null : counting)) {
        this.pendingDay = null;
      }
    }
    if (counting) {
      this.counting.push(t.clean);
      if (this.pool) this.pool.push(t.clean);
      if (this.coldDoneAt === null && this.coldRuleMet()) this.coldDoneAt = t.at;
    }
    if (t.clean && t.atTarget) {
      if (this.firstTargetAt === null) {
        this.firstTargetAt = t.at;
        this.firstTargetDay = t.day;
      }
      this.cleanCount++;
      this.cleanDays.add(t.day);
      if (this.warmDoneAt === null && this.cleanCount >= 3 && this.cleanDays.size >= 2) this.warmDoneAt = t.at;
    }
    if (this.warmDoneAt !== null && this.coldDoneAt !== null) this.passedAt = Math.max(this.warmDoneAt, this.coldDoneAt);
  }
}

/** §1.6 item pass over a whole take log (time order): the time of the pass, or null. */
export function itemPassAt(takes: Take[], reset: ResetMode = 'anyCold', variant: PassVariant = DEFAULT_PASS_VARIANT, evidence: PassEvidence = DEFAULT_PASS_EVIDENCE, pool?: boolean[]): number | null {
  const tr = new ItemPassTracker(reset, variant, evidence, pool);
  for (const t of takes) tr.add(t);
  return tr.passedAt;
}

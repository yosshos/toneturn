// Current form: the Phase A posterior (SPEC-HOLISTIC-2 §1.7). Pure. It never touches rank or entry.
//
// - A look = the first eligible confirmation per cell per day, from passed and established cells only; ≤ 2 looks per
//   area per day, the second from a different exercise.
// - The window at tier t: looks from passed cells at tiers ≥ t, last 90 days, last 30 looks, only looks after the last
//   decision; breadth ≥ min(3, passed exercises at tiers ≥ t) exercises and ≥ min(2, their keys) keys.
// - Beta(1, 1) over the window with n_eff = n / (1 + (m_d − 1)ρ_d + (m_c − 1)ρ_c).
// - Slump: P(p < 0.5) ≥ 0.95, ≥ 8 fresh looks (raw n) on ≥ 2 days → exactly one tier down; never in a re-entry window.
// - Re-promotion: P(p ≥ 0.6) ≥ 0.9 at current form + 1, capped at rank, no 30-look cap, same fresh-look rule.
// - Current form follows rank up (initialised from rank, capped at it).

import { betaPost, designEffect, pAtLeast, pBelow, RHO_CELL, RHO_DAY, type BetaPost } from './stats';

export interface Look {
  at: number;
  day: number;
  cell: string;
  exerciseId: string;
  key: number | null;
  /** Content tier of the cell. */
  tier: number;
  clean: boolean;
  /** Taken inside a re-entry window (§1.7): never counts toward a slump. */
  reentry?: boolean;
}

/** A passed and established cell (for the breadth rule). */
export interface PassedCell {
  cell: string;
  exerciseId: string;
  key: number | null;
  tier: number;
}

export interface CurrentFormOpts {
  rhoD: number;
  rhoC: number;
  windowDays: number;
  windowLooks: number;
  minLooks: number;
  minDays: number;
  slumpBar: number;
  slumpConf: number;
  riseBar: number;
  riseConf: number;
}

export const CURRENT_FORM: CurrentFormOpts = { rhoD: RHO_DAY, rhoC: RHO_CELL, windowDays: 90, windowLooks: 30, minLooks: 8, minDays: 2, slumpBar: 0.5, slumpConf: 0.95, riseBar: 0.6, riseConf: 0.9 };

export interface CurrentFormState {
  /** Current form tier; null while rank is none. */
  cf: number | null;
  /** The rank last seen (current form follows rank up). */
  rankSeen: number | null;
  /** Time of the last decision (drop, rise, or rank-rise reset); later decisions use only looks after it. */
  lastDecisionAt: number;
  slumps: number;
  rises: number;
}

export const initCurrentForm = (): CurrentFormState => ({ cf: null, rankSeen: null, lastDecisionAt: -Infinity, slumps: 0, rises: 0 });

/** §1.7 "the day is the unit": may this candidate be today's next look? (`today` = looks already admitted today.) */
export function admitLook(today: Look[], cand: Pick<Look, 'cell' | 'exerciseId'>): boolean {
  if (today.length >= 2) return false;
  if (today.some((l) => l.cell === cand.cell)) return false;
  if (today.length === 1 && today[0].exerciseId === cand.exerciseId) return false;
  return true;
}

/** §1.7 the window at tier t (time order). `cap` keeps only the last 30 (slump); re-promotion has no cap. */
export function windowAt(looks: Look[], t: number, now: number, since: number, o: CurrentFormOpts, cap: boolean, forSlump: boolean): Look[] {
  const from = now - o.windowDays * 24;
  const w = looks.filter((l) => l.tier >= t && l.at >= from && l.at > since && !(forSlump && l.reentry));
  return cap && w.length > o.windowLooks ? w.slice(w.length - o.windowLooks) : w;
}

/** §1.7 window breadth: ≥ min(3, passed exercises at tiers ≥ t) exercises, ≥ min(2, their keys) keys. */
export function breadthOk(win: Look[], passed: PassedCell[], t: number): boolean {
  const pc = passed.filter((c) => c.tier >= t);
  const needEx = Math.min(3, new Set(pc.map((c) => c.exerciseId)).size);
  const needKeys = Math.min(2, new Set(pc.filter((c) => c.key !== null).map((c) => c.key)).size);
  const ex = new Set(win.map((l) => l.exerciseId)).size;
  const keys = new Set(win.filter((l) => l.key !== null).map((l) => l.key)).size;
  return ex >= needEx && keys >= needKeys;
}

/** §1.7 the n_eff-corrected Beta(1, 1) posterior of a window. */
export function windowPosterior(win: Look[], o: Pick<CurrentFormOpts, 'rhoD' | 'rhoC'> = CURRENT_FORM): { post: BetaPost; n: number; days: number; deff: number } {
  const n = win.length;
  const days = new Set(win.map((l) => l.day)).size;
  const cells = new Set(win.map((l) => l.cell)).size;
  const deff = designEffect(n, days, cells, o.rhoD, o.rhoC);
  const s = win.filter((l) => l.clean).length;
  return { post: betaPost(s / deff, (n - s) / deff), n, days, deff };
}

/** Enough fresh looks for a decision (§1.7: ≥ 8 raw looks on ≥ 2 days, plus breadth). */
const decidable = (win: Look[], passed: PassedCell[], t: number, o: CurrentFormOpts): boolean =>
  win.length >= o.minLooks && new Set(win.map((l) => l.day)).size >= o.minDays && breadthOk(win, passed, t);

export type CurrentFormEvent = 'follow-rank' | 'slump' | 'rise' | null;

/**
 * One evaluation (the harness runs it at the end of each practice day). Order: follow rank up; else the slump test at
 * current form; else re-promotion toward rank. One decision at most.
 */
export function stepCurrentForm(s: CurrentFormState, looks: Look[], passed: PassedCell[], rank: number | null, now: number, o: CurrentFormOpts = CURRENT_FORM): { state: CurrentFormState; event: CurrentFormEvent } {
  if (rank !== null && (s.rankSeen === null || rank > s.rankSeen)) {
    return { state: { ...s, cf: rank, rankSeen: rank, lastDecisionAt: now }, event: 'follow-rank' };
  }
  if (s.cf === null || rank === null) return { state: s, event: null };
  const cf = Math.min(s.cf, rank);
  if (cf > 0) {
    const win = windowAt(looks, cf, now, s.lastDecisionAt, o, true, true);
    if (decidable(win, passed, cf, o) && pBelow(windowPosterior(win, o).post, o.slumpBar) >= o.slumpConf) {
      return { state: { ...s, cf: cf - 1, lastDecisionAt: now, slumps: s.slumps + 1 }, event: 'slump' };
    }
  }
  if (cf < rank) {
    const win = windowAt(looks, cf + 1, now, s.lastDecisionAt, o, false, false);
    if (decidable(win, passed, cf + 1, o) && pAtLeast(windowPosterior(win, o).post, o.riseBar) >= o.riseConf) {
      return { state: { ...s, cf: cf + 1, lastDecisionAt: now, rises: s.rises + 1 }, event: 'rise' };
    }
  }
  return { state: { ...s, cf }, event: null };
}

/** §1.7 "unmeasured" at tier t: no passed cell at tiers ≥ t. */
export const unmeasured = (passed: PassedCell[], t: number): boolean => !passed.some((c) => c.tier >= t);

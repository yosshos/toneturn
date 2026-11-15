// Plateau detector (AUDIT-5 §4 #5, P19). Pure.
//
// A plateau is an item or skill that stopped improving although it is being practised: the clean tempo (drills) or
// the rating (skills) stayed flat for at least three weeks while the player kept working on it. A fading item is
// one whose recent takes fall clearly below what it once reached. Each finding carries one concrete change of
// approach (Ericsson's "OK plateau": go back to effortful, error-producing work, or change the task), built from
// tools the app already has: a slower tempo ladder (step back), another key, looping the weakest bars (the error
// map's loop), or mixing the skill into a workout.

import type { ItemState } from './drills/types';
import { addDay, type ItemDay, type PlateauTry } from './practiceTime';

export const PLATEAU_WINDOW_DAYS = 21;
/** Flat = the window's best is within this share of the best before it. */
export const FLAT_GAIN = 0.03;
export const MIN_PRACTICE_DAYS = 3;
export const MIN_TAKES = 6;

export type PlateauHow = 'slower' | 'key' | 'loop' | 'mix';
export interface PlateauFinding {
  kind: 'plateau' | 'fading';
  scope: 'item' | 'skill';
  /** Drill item id, or the rating skill id. */
  id: string;
  family?: string;
  key?: number;
  /** The measure now (clean tempo, rating) and the best before the window. */
  now: number;
  best: number;
  /** Practice days in the window (the evidence that it was practised). */
  days: number;
  how: PlateauHow;
  /** A suggestion tried earlier on this item, and whether it has since paid off ("broke through"). */
  tried?: PlateauTry;
}

const dayOf = (iso: string) => iso.slice(0, 10);
const maxOf = (xs: number[]) => xs.reduce((a, x) => Math.max(a, x), 0);

/** Passed at the level tempo (3 clean at ≥ 95 % of the target on 2 days): a passed item is not on a plateau. */
export function passedAtTarget(st: ItemState): boolean {
  if (!st.targetBpm) return false;
  const at = (st.passLog ?? []).filter((x) => x.bpm >= 0.95 * st.targetBpm! - 1e-9);
  return at.length >= 3 && new Set(at.map((x) => dayOf(x.at))).size >= 2;
}

/** Rotate the suggestion: never the one tried last on this item. */
function pickHow(options: PlateauHow[], tried: PlateauTry | undefined, seed: number): PlateauHow {
  const left = tried ? options.filter((o) => o !== tried.how) : options;
  const pool = left.length ? left : options;
  return pool[Math.abs(seed) % pool.length];
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

export function itemPlateau(st: ItemState, ledger: ItemDay[] | undefined, today: string, tried?: PlateauTry): PlateauFinding | null {
  if (passedAtTarget(st)) return null;
  const from = addDay(today, -PLATEAU_WINDOW_DAYS + 1);
  const hist = st.history ?? [];
  const first = [hist[0]?.at, ledger?.[0]?.d].filter(Boolean).map((x) => dayOf(x!)).sort()[0];
  // Three weeks of history at least.
  if (!first || first > addDay(today, -PLATEAU_WINDOW_DAYS)) return null;
  const recentLedger = (ledger ?? []).filter((x) => x.d >= from);
  const days = new Set([...recentLedger.map((x) => x.d), ...hist.filter((h) => dayOf(h.at) >= from).map((h) => dayOf(h.at))]);
  const takes = recentLedger.reduce((a, x) => a + x.n, 0) || hist.filter((h) => dayOf(h.at) >= from).length * 2;
  if (days.size < MIN_PRACTICE_DAYS || takes < MIN_TAKES) return null;
  const before = maxOf([...hist.filter((h) => dayOf(h.at) < from).map((h) => h.bpm), ...(ledger ?? []).filter((x) => x.d < from).map((x) => x.b ?? 0)]);
  const recent = maxOf([...hist.filter((h) => dayOf(h.at) >= from).map((h) => h.bpm), ...recentLedger.map((x) => x.b ?? 0)]);
  const flat = before > 0 ? recent <= before * (1 + FLAT_GAIN) : recent === 0;
  if (!flat) return null;
  // No clean take at all in three weeks of work: slow down first; otherwise rotate the change of approach.
  const how = recent === 0 && before === 0 ? 'slower' : pickHow(['slower', 'key', 'loop'], tried, hash(st.itemId) + Math.floor(Date.parse(today) / (7 * 86400000)));
  return { kind: 'plateau', scope: 'item', id: st.itemId, family: st.family, key: st.key, now: recent, best: before, days: days.size, how, ...(tried ? { tried } : {}) };
}

/** Fading: the last two weeks' clean tempo (or cleanness) clearly below what the item reached before. */
export function itemFading(st: ItemState, ledger: ItemDay[] | undefined, today: string): PlateauFinding | null {
  const from = addDay(today, -13);
  const recentL = (ledger ?? []).filter((x) => x.d >= from);
  const olderL = (ledger ?? []).filter((x) => x.d < from && x.d >= addDay(today, -55));
  const n = (xs: ItemDay[]) => xs.reduce((a, x) => a + x.n, 0);
  const share = (xs: ItemDay[]) => xs.reduce((a, x) => a + x.c, 0) / Math.max(1, xs.reduce((a, x) => a + x.of, 0));
  const best = st.cleanBpm;
  const recentBpm = maxOf(recentL.map((x) => x.b ?? 0));
  // Tempo: played again lately, and nothing clean near the old best.
  if (best > 0 && n(recentL) >= 3 && recentBpm < 0.9 * best) return { kind: 'fading', scope: 'item', id: st.itemId, family: st.family, key: st.key, now: recentBpm, best, days: new Set(recentL.map((x) => x.d)).size, how: 'slower' };
  // Cleanness: the share of clean takes fell by a quarter or more.
  if (n(recentL) >= 4 && n(olderL) >= 4 && share(recentL) <= share(olderL) - 0.25) return { kind: 'fading', scope: 'item', id: st.itemId, family: st.family, key: st.key, now: Math.round(share(recentL) * 100), best: Math.round(share(olderL) * 100), days: new Set(recentL.map((x) => x.d)).size, how: 'loop' };
  return null;
}

/** A skill's weekly ratings (snapshots) flat for 3+ weeks while it was practised every one of those weeks. */
export function skillPlateaus(
  snapshots: { week: string; ratings: Partial<Record<string, number>> }[],
  eventsPerWeek: (skill: string, week: string) => number,
  tries: PlateauTry[] = [],
): PlateauFinding[] {
  const out: PlateauFinding[] = [];
  const snaps = snapshots.slice(-8);
  if (snaps.length < 4) return out;
  const skills = new Set(snaps.flatMap((s) => Object.keys(s.ratings)));
  for (const k of skills) {
    const last4 = snaps.slice(-4).map((s) => s.ratings[k]).filter((x): x is number => typeof x === 'number');
    const all = snaps.map((s) => s.ratings[k]).filter((x): x is number => typeof x === 'number');
    if (last4.length < 4) continue;
    const practised = snaps.slice(-3).every((s) => eventsPerWeek(k, s.week) >= 5);
    const peak = maxOf(all.slice(0, -2));
    const nowR = last4[last4.length - 1];
    if (peak > 0 && nowR < peak - 40) {
      out.push({ kind: 'fading', scope: 'skill', id: k, now: nowR, best: peak, days: 0, how: 'mix' });
      continue;
    }
    if (!practised) continue;
    const range = maxOf(last4) - Math.min(...last4);
    if (range <= 15 && nowR <= last4[0] + 10) {
      const tried = [...tries].reverse().find((t) => t.id === `skill:${k}`);
      out.push({ kind: 'plateau', scope: 'skill', id: k, now: nowR, best: maxOf(last4), days: 0, how: 'mix', ...(tried ? { tried } : {}) });
    }
  }
  return out;
}

/** Every finding, plateaus first, then fading; at most `limit`. */
export function detectPlateaus(
  input: {
    drillItems: Record<string, ItemState> | undefined;
    ledgerItems: Record<string, ItemDay[]>;
    snapshots?: { week: string; ratings: Partial<Record<string, number>> }[];
    eventsPerWeek?: (skill: string, week: string) => number;
    tries?: PlateauTry[];
  },
  today: string,
  limit = 6,
): PlateauFinding[] {
  const tries = input.tries ?? [];
  const lastTry = (id: string) => [...tries].reverse().find((t) => t.id === id);
  const plateaus: PlateauFinding[] = [];
  const fading: PlateauFinding[] = [];
  for (const st of Object.values(input.drillItems ?? {})) {
    const led = input.ledgerItems[`d:${st.itemId}`];
    const p = itemPlateau(st, led, today, lastTry(st.itemId));
    if (p) plateaus.push(p);
    else {
      const f = itemFading(st, led, today);
      if (f) fading.push(f);
    }
  }
  const skills = input.snapshots && input.eventsPerWeek ? skillPlateaus(input.snapshots, input.eventsPerWeek, tries) : [];
  plateaus.sort((a, b) => b.days - a.days);
  return [...plateaus, ...skills.filter((s) => s.kind === 'plateau'), ...fading, ...skills.filter((s) => s.kind === 'fading')].slice(0, limit);
}

/** A suggestion that paid off: the measure rose ≥ 5 % above what it was when the change was tried. */
export const brokeThrough = (t: PlateauTry, now: number) => now >= t.base * 1.05 && now > t.base;

/** A step back on the tempo ladder: the goal goes to 85 % of the clean tempo (never below ♩40); the clean record,
 * the pass log and every ✓ stay. */
export function stepBack(st: ItemState): ItemState {
  const base = st.cleanBpm > 0 ? st.cleanBpm : st.goalBpm;
  return { ...st, goalBpm: Math.max(40, Math.min(st.goalBpm, Math.round(base * 0.85))), streak: 0, fails: 0 };
}

/** Another key for a family: one not yet touched, else the least-practised one (not `key`). */
export function otherKey(items: Record<string, ItemState>, family: string, key: number, order: number[]): number {
  const takes = new Map<number, number>();
  for (const st of Object.values(items)) if (st.family === family) takes.set(st.key, (takes.get(st.key) ?? 0) + st.takes);
  const cands = order.filter((k) => k !== key);
  const fresh = cands.find((k) => !takes.has(k));
  if (fresh !== undefined) return fresh;
  return cands.sort((a, b) => (takes.get(a) ?? 0) - (takes.get(b) ?? 0))[0] ?? key;
}

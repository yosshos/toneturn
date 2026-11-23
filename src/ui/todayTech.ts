// Today's technique plan as the screens share it (BUILD-PLAN-2026-11 phase 2: "one today"). The workout's technique
// block and the technique screen's "part of today's workout" button run the SAME cells: the plan is built once a day
// from the matrix (todayPlan.ts) and kept on this device with where its run stopped, so both doors — and a reload —
// land on the same cell. The key of the week is kept per week here too (the key grid and the workout read one value).

import type { DrillSettings, ItemState } from '../engine/drills/types';
import type { Settings } from '../storage/progress';
import { families, levelDrills } from '../engine/drills/plan';
import { keysInOrder } from '../engine/drills/generate';
import { weekOf } from '../engine/drills/keyIndex';
import { playerTier } from '../engine/drills/tiers';
import { keyMatrix, type MatrixCell, type MatrixGroup, type MatrixView } from '../engine/drills/keyMatrix';
import { lickPool } from '../engine/vocab';
import { focusOf } from '../engine/styleFocus';
import { freezePlan, thawPlan, todayTechPlan, weekKeyFromMatrix, type FrozenPlan, type PlanCell } from '../engine/drills/todayPlan';

const lsGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* fine */
  }
};

/** The order of the rest of today's cells (SPEC-DAILY-WORKOUT §3): the player's view, remembered on this device. */
const MV_KEY = 'toneturn.matrixView';
export const readMatrixView = (): MatrixView => {
  const v = lsGet(MV_KEY);
  return v === 'key' || v === 'exercise' ? v : 'weak';
};
export const saveMatrixView = (v: MatrixView) => lsSet(MV_KEY, v);

/** The core families whose passes set the technique tier (SPEC-COACH-2 §1; the same list as the technique screen). */
const CORE_FAMILIES = ['scales', 'arpeggios', 'g-scales', 'g-arps', 'b-scale', 'b-chord'];
/** The matrix tier: the measured tier, else past the basics by the course answers / level test (2), else 0. */
export function matrixTierOf(settings: Pick<Settings, 'courseStart' | 'drillStart'>, ds: DrillSettings, items: Record<string, ItemState>): number {
  const core = families(ds.instrument ?? 'piano').filter((f) => CORE_FAMILIES.includes(f.id));
  const tier = playerTier(core.flatMap((f) => f.levels.flatMap((l) => levelDrills(l, ds.keyOrder))), items);
  if (tier >= 0) return tier;
  const inst = ds.instrument ?? 'piano';
  const report = (settings.courseStart as Record<string, { report?: string } | undefined> | undefined)?.[inst === 'piano' ? 'keys' : inst]?.report;
  const advanced = report === 'bit' || report === 'well' || Object.values(settings.drillStart ?? {}).some((x) => (x ?? 1) > 1);
  return advanced ? 2 : 0;
}

/** The key of the week for an instrument and a tab: picked once a week (by `pick`) and kept on this device. */
export function keptWeekKey(group: string, instrument: string, pick: () => number | null, now: number | string = Date.now()): number | null {
  const tag = `${weekOf(now)}|${instrument}`;
  const k = `toneturn.weekKey.${group}`;
  const kept = lsGet(k);
  if (kept?.startsWith(tag + '|')) return Number(kept.split('|')[2]);
  const r = pick();
  if (r !== null) lsSet(k, `${tag}|${r}`);
  return r;
}
/** This week's key if already picked (cheap: no matrix), for labels. */
export function weekKeyIfKept(group: string, instrument: string, now: number | string = Date.now()): number | null {
  const kept = lsGet(`toneturn.weekKey.${group}`);
  const tag = `${weekOf(now)}|${instrument}`;
  return kept?.startsWith(tag + '|') ? Number(kept.split('|')[2]) : null;
}

const PLAN_KEY = 'toneturn.todayKeys';
type Kept = FrozenPlan & { view: MatrixView };
const readKept = (): Kept | null => {
  try {
    const raw = lsGet(PLAN_KEY);
    return raw ? (JSON.parse(raw) as Kept) : null;
  } catch {
    return null;
  }
};
/** Today's frozen plan (its cells, items and resume point) if built today — cheap, for counting takes from anywhere. */
export function keptPlan(day: string): Kept | null {
  const k = readKept();
  return k && k.day === day ? k : null;
}
/** Where today's run reached (the coach's step): the next run resumes at that cell. */
export function setPlanAt(day: string, at: number) {
  const k = keptPlan(day);
  if (k && at > k.at) lsSet(PLAN_KEY, JSON.stringify({ ...k, at }));
}

export interface TodayTech {
  plan: PlanCell[];
  weekRoot: number | null;
  /** The coach's step to resume at. */
  at: number;
  minutes: number;
}

/**
 * Today's technique cells for the piano (null elsewhere: other instruments keep their opened levels' drills). Kept for
 * the day; built again when the block's minutes or the view change. `cells`: the matrix when the caller has it.
 */
export function todayTech(a: { settings: Pick<Settings, 'courseStart' | 'drillStart'> & Partial<Pick<Settings, 'lickBook' | 'styleFocus' | 'jazzFocus' | 'drills'>>; ds: DrillSettings; items: Record<string, ItemState>; minutes: number; day: string; cells?: MatrixCell[] }): TodayTech | null {
  if ((a.ds.instrument ?? 'piano') !== 'piano' || a.minutes <= 0) return null;
  const view = readMatrixView();
  // SPEC-STYLE-FOCUS §4–5: block H by the keys course's focus (60/30/10 in the plan's style slice)
  const focus = focusOf(a.settings, 'keys');
  const cells = a.cells ?? keyMatrix(families('piano'), matrixTierOf(a.settings, a.ds, a.items), a.items, { jazz: a.ds.emphasis === 'jazz', day: a.day, licks: lickPool(a.items, a.settings.lickBook), focus });
  const group: MatrixGroup = 'major';
  const order = keysInOrder(a.ds.keyOrder, false);
  const weekRoot = keptWeekKey(group, 'piano', () => weekKeyFromMatrix(cells, group, order), `${a.day}T12:00:00`);
  const kept = keptPlan(a.day);
  if (kept && kept.minutes === a.minutes && kept.view === view) {
    const plan = thawPlan(kept, cells);
    if (plan.length) return { plan, weekRoot, at: Math.min(kept.at, plan.length - 1), minutes: a.minutes };
  }
  const plan = todayTechPlan(cells, { minutes: a.minutes, weekRoot, weekGroup: group, view, keyOrder: order, focus, day: a.day });
  lsSet(PLAN_KEY, JSON.stringify({ ...freezePlan(plan, a.day, a.minutes), view } satisfies Kept));
  return { plan, weekRoot, at: 0, minutes: a.minutes };
}

// Today's technique plan as the screens share it (BUILD-PLAN-2026-11 phase 2: "one today"). The workout's technique
// block and the technique screen's "part of today's workout" button run the SAME cells: the plan is built once a day
// from the matrix (todayPlan.ts) and kept on this device with where its run stopped, so both doors — and a reload —
// land on the same cell. The key of the week is kept per week here too (the key grid and the workout read one value).

import type { DrillSettings, ItemState } from '../engine/drills/types';
import type { Settings } from '../storage/progress';
import { families, levelDrills } from '../engine/drills/plan';
import { keysInOrder } from '../engine/drills/generate';
import { weekOf, type LadderInst } from '../engine/drills/keyIndex';
import { playerTier } from '../engine/drills/tiers';
import { keyMatrix, type MatrixCell, type MatrixGroup, type MatrixView } from '../engine/drills/keyMatrix';
import { lickPool } from '../engine/vocab';
import { focusOf, weightedFocus } from '../engine/styleFocus';
import { freezePlan, openedByTier, resizePlan, thawPlan, todayTechPlan, weekGroupFor, weekKeyFromMatrix, type FrozenPlan, type PlanCell } from '../engine/drills/todayPlan';

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
  return priorTier(settings, ds);
}

/**
 * SPEC-KEY-SESSION-2 §4.1: the starting tier before any measured take — the course self-report (new T0, "a bit" T2,
 * "well" T4) or the level test (a start past the first levels: T2; the scales from level 8 on: T4), the higher.
 */
export function priorTier(settings: Pick<Settings, 'courseStart' | 'drillStart'>, ds: Pick<DrillSettings, 'instrument'>): number {
  const inst = ds.instrument ?? 'piano';
  const report = (settings.courseStart as Record<string, { report?: string } | undefined> | undefined)?.[inst === 'piano' ? 'keys' : inst]?.report;
  const self = report === 'well' ? 4 : report === 'bit' ? 2 : 0;
  const starts = Object.values(settings.drillStart ?? {}).map((x) => x ?? 1);
  const test = (settings.drillStart?.scales ?? 1) >= 8 ? 4 : starts.some((x) => x > 1) ? 2 : 0;
  return Math.max(self, test);
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

/**
 * D3: the key of the week as one value — its row group (major, or a harmonic-minor row from T2: the groups alternate
 * week by week, todayPlan.weekGroupFor) and its root. The group is kept per week and instrument beside the key.
 */
export interface WeekKey {
  root: number;
  group: MatrixGroup;
}
const WG_KEY = 'toneturn.weekGroup';
/** The week's group, picked once a week (by `pick`) and kept on this device. */
export function keptWeekGroup(instrument: string, pick: () => MatrixGroup, now: number | string = Date.now()): MatrixGroup {
  const tag = `${weekOf(now)}|${instrument}`;
  const kept = lsGet(WG_KEY);
  if (kept?.startsWith(tag + '|')) return kept.split('|')[2] === 'minor' ? 'minor' : 'major';
  const g = pick();
  lsSet(WG_KEY, `${tag}|${g}`);
  return g;
}
/** This week's key with its group if already picked (cheap: no matrix), for labels and Improvise. */
export function dayKeyIfKept(instrument: string, now: number | string = Date.now()): WeekKey | null {
  const tag = `${weekOf(now)}|${instrument}`;
  const kept = lsGet(WG_KEY);
  const group: MatrixGroup = kept?.startsWith(tag + '|') && kept.split('|')[2] === 'minor' ? 'minor' : 'major';
  const root = weekKeyIfKept(group, instrument, now);
  return root === null ? null : { root, group };
}
/**
 * The major key Improvise and the rotation play in for a week key: the key itself, or a minor week key's relative major
 * (the same signature: C minor's week improvises on E♭ major's sheet).
 */
export const improvRootOf = (k: WeekKey): number => (k.group === 'minor' ? (k.root + 3) % 12 : k.root);

/**
 * The key of the week, picking it from the matrix when this week has none kept yet (Improvise used to fall back to C).
 * Builds the matrix only then; null off the piano / guitar / bass or with nothing open.
 */
export function ensureDayKey(settings: Pick<Settings, 'courseStart' | 'drillStart'> & Partial<Pick<Settings, 'lickBook' | 'styleFocus' | 'jazzFocus' | 'drills'>>, ds: DrillSettings, items: Record<string, ItemState>, day: string): WeekKey | null {
  const inst = matrixInst(ds.instrument);
  if (!inst) return null;
  const kept = dayKeyIfKept(inst, `${day}T12:00:00`);
  if (kept) return kept;
  const cells = keyMatrix(families(inst), matrixTierOf(settings, ds, items), items, { jazz: ds.emphasis === 'jazz', day, instrument: inst, ...(inst === 'piano' ? { licks: lickPool(items, settings.lickBook) } : {}), focus: focusOf(settings, inst === 'piano' ? 'keys' : inst) });
  const order = keysInOrder(ds.keyOrder, false);
  const group = keptWeekGroup(inst, () => weekGroupFor(cells, weekOf(`${day}T12:00:00`)), `${day}T12:00:00`);
  const root = keptWeekKey(group, inst, () => weekKeyFromMatrix(cells, group, order), `${day}T12:00:00`);
  return root === null ? null : { root, group };
}

/**
 * SPEC-DAILY-WORKOUT §5: "+N new exercises opened" when the tier rises — the last seen tier and cell count are kept per
 * instrument; a rise records the gain, shown for 3 days. Returns the gain to show today (0: none).
 */
const SEEN_KEY = 'toneturn.matrixSeen';
export function noteMatrixSeen(instrument: string, tier: number, n: number, day: string): number {
  let all: Record<string, { tier: number; n: number; gained?: number; day?: string }> = {};
  try {
    all = JSON.parse(lsGet(SEEN_KEY) ?? '{}') ?? {};
  } catch {
    all = {};
  }
  const prev = all[instrument] ?? null;
  const gained = openedByTier(prev, tier, n);
  if (!prev || gained > 0 || tier !== prev.tier || n !== prev.n) {
    all[instrument] = gained > 0 ? { tier, n, gained, day } : { ...(prev ?? {}), tier, n };
    lsSet(SEEN_KEY, JSON.stringify(all));
  }
  lsSet(SEEN_LAST, instrument);
  return gainedShown(all[instrument], day);
}
const SEEN_LAST = 'toneturn.matrixSeenLast';
const gainedShown = (cur: { gained?: number; day?: string } | undefined, day: string): number => {
  if (!cur) return 0;
  const age = cur.day ? Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${cur.day}T12:00:00Z`)) / 86400000) : 99;
  return cur.gained && age >= 0 && age < 3 ? cur.gained : 0;
};
/**
 * §5 on the Progress page: the "+N new exercises opened" kept by the technique screen (read only — no matrix), for
 * `instrument` or the last instrument whose matrix was seen. 0: none to show.
 */
export function matrixGained(day: string, instrument?: string): number {
  try {
    const all = JSON.parse(lsGet(SEEN_KEY) ?? '{}') ?? {};
    const inst = instrument ?? lsGet(SEEN_LAST);
    return inst ? gainedShown(all[inst], day) : 0;
  } catch {
    return 0;
  }
}

const PLAN_KEY = 'toneturn.todayKeys';
type Kept = FrozenPlan & { view: MatrixView; /** The instrument the plan was built for (phase 7: guitar and bass have their own ladders). */ inst?: string };
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
  /** The key of the week's rows (major, or a harmonic-minor row). */
  weekGroup?: MatrixGroup;
  /** The coach's step to resume at. */
  at: number;
  minutes: number;
}

/** The instruments whose technique block runs the key × exercise matrix (phase 7: guitar and bass too; drums have no keys). */
export const matrixInst = (instrument?: string): LadderInst | null => (instrument === 'guitar' || instrument === 'bass' ? instrument : (instrument ?? 'piano') === 'piano' ? 'piano' : null);

/**
 * What the workout's technique block runs in a course (one today, BUILD-PLAN phase 2 + 7): on the piano, the guitar and
 * the bass today's matrix cells under the coach (the same plan as the technique screen's "part of today's workout");
 * on the drums (no keys) the opened levels' drills — grooves, fills and trading are the drums' other share.
 */
export function techBlockRuns(course: string | undefined, instrument: string | undefined): 'matrix' | 'drills' {
  const byCourse = course === 'keys' ? 'piano' : course === 'guitar' || course === 'bass' ? course : null;
  return byCourse && matrixInst(instrument) === byCourse ? 'matrix' : 'drills';
}

/**
 * Today's technique cells on the piano, guitar or bass (null on drums: no keys — their technique block keeps the opened
 * levels' drills). Kept for the day; built again when the block's minutes, the view or the instrument change. `cells`:
 * the matrix when the caller has it.
 */
export function todayTech(a: { settings: Pick<Settings, 'courseStart' | 'drillStart'> & Partial<Pick<Settings, 'lickBook' | 'styleFocus' | 'jazzFocus' | 'drills'>>; ds: DrillSettings; items: Record<string, ItemState>; minutes: number; day: string; cells?: MatrixCell[] }): TodayTech | null {
  const inst = matrixInst(a.ds.instrument);
  if (!inst || a.minutes <= 0) return null;
  const view = readMatrixView();
  // SPEC-STYLE-FOCUS §4–5: block H by the course's focus (60/30/10 in the plan's style slice)
  const focus = focusOf(a.settings, inst === 'piano' ? 'keys' : inst);
  const cells = a.cells ?? keyMatrix(families(inst), matrixTierOf(a.settings, a.ds, a.items), a.items, { jazz: a.ds.emphasis === 'jazz', day: a.day, instrument: inst, ...(inst === 'piano' ? { licks: lickPool(a.items, a.settings.lickBook) } : {}), focus });
  // D3: the key of the week — a major or (T2+, alternating weeks) a harmonic-minor row
  const group: MatrixGroup = keptWeekGroup(inst, () => weekGroupFor(cells, weekOf(`${a.day}T12:00:00`)), `${a.day}T12:00:00`);
  const order = keysInOrder(a.ds.keyOrder, false);
  const weekRoot = keptWeekKey(group, inst, () => weekKeyFromMatrix(cells, group, order), `${a.day}T12:00:00`);
  const kept = keptPlan(a.day);
  const sameInst = !!kept && (kept.inst ?? 'piano') === inst;
  const keptCells = kept && sameInst ? thawPlan(kept, cells) : [];
  if (kept && sameInst && kept.minutes === a.minutes && kept.view === view && keptCells.length) return { plan: keptCells, weekRoot, weekGroup: group, at: Math.min(kept.at, keptCells.length - 1), minutes: a.minutes };
  // …drawn by THE weights (styleWeight via weightedFocus: the rest by taste, liked ×2 / declined ×0.4)
  const fresh = todayTechPlan(cells, { minutes: a.minutes, weekRoot, weekGroup: group, view, keyOrder: order, focus: weightedFocus(a.settings, inst === 'piano' ? 'keys' : inst, a.day), day: a.day });
  // Never lose progress: "+2 min" (or a new view) keeps today's plan and the cell the run reached — the kept cells stay
  // (a new view re-orders only the cells not reached yet) and the fresh plan fills the rest.
  const at = kept && keptCells.length ? Math.min(kept.at, keptCells.length - 1) : 0;
  const plan = kept && keptCells.length ? resizePlan(keptCells, fresh, a.minutes, at, kept.view === view) : fresh;
  lsSet(PLAN_KEY, JSON.stringify({ ...freezePlan(plan, a.day, a.minutes), at, view, inst } satisfies Kept));
  return { plan, weekRoot, weekGroup: group, at, minutes: a.minutes };
}

/**
 * Phase 8 (D5): the matrix for the Progress page's measured time and projection — the same build as the key screen
 * (tier, jazz, the lick pool's block G on the piano, the focus's block H). Null off the piano / guitar / bass.
 */
export function projectionInput(settings: Pick<Settings, 'courseStart' | 'drillStart'> & Partial<Pick<Settings, 'lickBook' | 'styleFocus' | 'jazzFocus' | 'drills'>>, ds: DrillSettings, items: Record<string, ItemState>): { cells: MatrixCell[]; items: Record<string, ItemState>; weekRoot: number | null; weekGroup?: MatrixGroup } | null {
  const inst = matrixInst(ds.instrument);
  if (!inst) return null;
  const cells = keyMatrix(families(inst), matrixTierOf(settings, ds, items), items, { jazz: ds.emphasis === 'jazz', instrument: inst, ...(inst === 'piano' ? { licks: lickPool(items, settings.lickBook) } : {}), focus: focusOf(settings, inst === 'piano' ? 'keys' : inst) });
  const wk = dayKeyIfKept(inst);
  return { cells, items, weekRoot: wk?.root ?? null, ...(wk ? { weekGroup: wk.group } : {}) };
}

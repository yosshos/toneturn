// The key × exercise matrix (docs/SPEC-DAILY-WORKOUT.md §1–§5, owner 2026-11-22): every rung of the key ladder open at
// the player's tier, in every key — the full set, not a session's pick. A cell is closed when every item in it was
// played clean at its target in that key (the rule used everywhere). Each cell has an estimate of its minutes, so the
// app can say how long a key (or an exercise through the 12 keys) takes, fill today's window with the next cells of the
// player's view, and project when everything open is done. Pure.

import type { FamilyDef, LevelDef } from './generate';
import type { ItemState } from './types';
import { itemTargetBpm, specDrills } from './plan';
import { openKeyRungs, rungIdOf, type KeyMode, type LadderInst, type LadderRung } from './keyIndex';
import { coolingDown, itemStatus } from './itemStatus';
import type { Lick } from '../licks';

export type MatrixGroup = 'major' | 'minor';
export type MatrixView = 'weak' | 'key' | 'exercise';

export interface MatrixCell {
  root: number;
  group: MatrixGroup;
  /** The rung's source level id (scales-3, k-sharm-7, k-keylick-5 …): the same exercise across keys. */
  rung: string;
  block: LadderRung['block'] | 'W';
  /** A later rung of the row (phase 7): the Aeolian of a major key (from its 6th degree), melodic minor, a mode. */
  mode?: KeyMode;
  /** Teaching order inside the key (the warm-up is −1). */
  i: number;
  level: LevelDef;
  /** `cool`: every open item of the cell rests after a plateau (BUILD-PLAN §0.2) — skipped by the views and the projection. */
  need: { s: 0 | 1 | 2; share: number; last: string; cool?: boolean };
  /** Estimated minutes to work the cell now (to its target or the player's limit). */
  minutes: number;
}

/** Harmonic minor rows open at T2 (SPEC-DAILY-WORKOUT §1); melodic minor rows come later. */
export const MINOR_FROM_TIER = 2;
/** Seconds between takes (listening to the verdict, the coach's line, getting ready). */
const GAP_S = 10;
/**
 * Takes an item is expected to need: never played (rubato, the climb, the limit), played below target, closed (a check).
 * The cell's first new item climbs in full; the next ones share its motion and start near its tempo (the coach carries
 * the tempo over), so they need about half.
 */
const TAKES = { new: 8, newNext: 4, below: 5, closed: 1.5 };
/** The climb runs from the start tempo toward the target: takes average about this much above the start. */
const CLIMB_MEAN = 1.1;

/**
 * Minutes a cell needs now: for each of its items, the take length (beats at the tempo it would be played at) plus the
 * gap, times the takes it is expected to need. A played item's tempo is its best clean one; a new one starts at its own.
 */
export function cellMinutes(level: LevelDef, items: Record<string, ItemState>): number {
  return minutesOf(cellDrills(level), items);
}

/** A cell's items, each with its target tempo (computed once: generating and finding targets is the slow part). */
interface CellDrill {
  itemId: string;
  beats: number;
  startBpm: number;
  target: number;
}
const cellDrills = (level: LevelDef): CellDrill[] => level.specs.flatMap((_, k) => specDrills(level, k, 'fifths-up').map((d) => ({ itemId: d.itemId, beats: d.beats, startBpm: d.startBpm, target: itemTargetBpm(d) })));

function minutesOf(ds: CellDrill[], items: Record<string, ItemState>): number {
  let s = 0;
  let firstNew = true;
  for (const d of ds) {
    const st = items[d.itemId];
    const target = d.target;
    const played = !!st && st.takes > 0;
    const bpm = Math.max(30, played && st.cleanBpm ? st.cleanBpm : (d.startBpm || 60) * CLIMB_MEAN);
    const takeS = (d.beats * 60) / bpm + GAP_S;
    let takes: number;
    if (!played) {
      takes = firstNew ? TAKES.new : TAKES.newNext;
      firstNew = false;
    } else takes = st.cleanBpm >= target ? TAKES.closed : TAKES.below;
    s += takeS * takes;
  }
  return s / 60;
}

/**
 * Every open cell of the matrix: 12 major keys (and harmonic minor from T2), every rung open at the tier — on the piano,
 * the guitar or the bass (phase 7: each its own ladder, all 12 keys). The later rungs stay in their rows: the Aeolian of
 * each major key (from its 6th degree, T1+), the modes from the root (T4+), melodic minor in the minor rows (T4+).
 */
type CellShape = Omit<MatrixCell, 'need' | 'minutes'> & { drills: CellDrill[] };
/** The matrix's structure per tier / focus / groups: it does not depend on the player's items, so it is built once. */
const shapeCache = new Map<string, CellShape[]>();

function matrixShape(fams: FamilyDef[], tier: number, opts: { jazz?: boolean; groups?: MatrixGroup[]; licks?: Lick[]; instrument?: LadderInst }): CellShape[] {
  const groups = opts.groups ?? (tier >= MINOR_FROM_TIER ? ['major', 'minor'] : ['major']);
  // block G (phase 4): the pool's licks are part of the shape (an own lick's notes too: an edit rebuilds it)
  const licks = (opts.licks ?? []).map((l) => `${l.id}:${l.notes.length}:${l.notes.reduce((a, n) => a + n[0] * 7 + n[1] * 3, 0)}`).join(',');
  const key = `${opts.instrument ?? 'piano'}|${fams.map((f) => f.id).join(',')}|${tier}|${opts.jazz ? 1 : 0}|${groups.join(',')}|${licks}`;
  const hit = shapeCache.get(key);
  if (hit) return hit;
  const out: CellShape[] = [];
  for (const group of groups)
    for (let root = 0; root < 12; root++) {
      const { warm, built } = openKeyRungs(fams, root, group, tier, opts);
      const cell = (level: LevelDef, rung: string, block: MatrixCell['block'], i: number, mode?: KeyMode): CellShape => ({ root, group, rung, block, i, level, ...(mode ? { mode } : {}), drills: cellDrills(level) });
      if (warm) out.push(cell(warm, warm.id.replace(`key-${root}-`, ''), 'W', -1));
      for (const b of built) out.push(cell(b.lvl, rungIdOf(b.rung), b.rung.block, b.i, b.rung.mode));
    }
  if (shapeCache.size >= 8) shapeCache.clear();
  shapeCache.set(key, out);
  return out;
}

/** How much a cell needs work (as rungNeed), from its precomputed items. */
function needOf(ds: CellDrill[], items: Record<string, ItemState>, day: string): MatrixCell['need'] {
  const sts = ds.map((d) => items[d.itemId]).filter((x): x is ItemState => !!x && x.takes > 0);
  if (!sts.length) return { s: 0, share: 0, last: '' };
  const share = Math.min(...ds.map((d) => (items[d.itemId]?.cleanBpm ?? 0) / Math.max(1, d.target)));
  const last = sts.map((x) => x.last ?? '').sort()[0] ?? '';
  // closed = every item closed by the one rule (BUILD-PLAN D1: 3 clean takes at ≥ 95 % of target on 2 days)
  const open = ds.filter((d) => itemStatus(items[d.itemId], d.startBpm, d.target) !== 'closed');
  // the plateau (BUILD-PLAN §0.2): every open item rests after the coach's limit rule
  const cool = open.length > 0 && open.every((d) => coolingDown(items[d.itemId], day));
  return { s: open.length ? 1 : 2, share, last, ...(cool ? { cool } : {}) };
}

/** The local day ('YYYY-MM-DD'). */
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function keyMatrix(fams: FamilyDef[], tier: number, items: Record<string, ItemState>, opts: { jazz?: boolean; groups?: MatrixGroup[]; /** The local day for the cooldowns (default today). */ day?: string; /** The player's lick pool (vocab.lickPool): block G, language in the key. */ licks?: Lick[]; /** The instrument's ladder (phase 7: guitar and bass; default the piano). */ instrument?: LadderInst } = {}): MatrixCell[] {
  const day = opts.day ?? today();
  return matrixShape(fams, tier, opts).map(({ drills, ...c }) => ({ ...c, need: needOf(drills, items, day), minutes: minutesOf(drills, items) }));
}

/** A cell's identity across days and builds: group, key and rung. */
export const cellKey = (c: Pick<MatrixCell, 'group' | 'root' | 'rung'>): string => `${c.group}:${c.root}:${c.rung}`;

/** The item ids of a cell (every spec of its level in its key). */
export const cellItemIds = (c: Pick<MatrixCell, 'level'>): string[] => [...new Set(cellDrills(c.level).map((d) => d.itemId))];

const needCmp = (a: MatrixCell, b: MatrixCell): number => a.need.s - b.need.s || a.need.share - b.need.share || a.need.last.localeCompare(b.need.last);

/**
 * The cells in the player's view (SPEC-DAILY-WORKOUT §3), closed cells last:
 * - weak: by need everywhere (never played → lowest share of target → longest since), then key order, then teaching order;
 * - key: one key deep — the weakest key first (its mean share), each key's cells in teaching order;
 * - exercise: one exercise through the keys, interleaved — three keys of an exercise, then the next exercise, and so on.
 */
export function matrixOrder(cells: MatrixCell[], view: MatrixView, keyOrder: number[] = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]): MatrixCell[] {
  // cells resting after a plateau are left out (BUILD-PLAN §0.2); a by-key visit (the key page) still reaches them
  const open = cells.filter((c) => c.need.s < 2 && !c.need.cool);
  const closed = cells.filter((c) => c.need.s === 2);
  const kpos = (c: MatrixCell) => (c.group === 'minor' ? 12 : 0) + keyOrder.indexOf(c.root);
  if (view === 'weak') return [...open.sort((a, b) => needCmp(a, b) || kpos(a) - kpos(b) || a.i - b.i), ...closed];
  if (view === 'key') {
    const rows = new Map<string, MatrixCell[]>();
    for (const c of open) rows.set(`${c.group}-${c.root}`, [...(rows.get(`${c.group}-${c.root}`) ?? []), c]);
    const mean = (cs: MatrixCell[]) => cs.reduce((n, c) => n + c.need.share, 0) / cs.length;
    const keys = [...rows.values()].sort((a, b) => mean(a) - mean(b) || kpos(a[0]) - kpos(b[0]));
    return [...keys.flatMap((cs) => cs.sort((a, b) => a.i - b.i)), ...closed];
  }
  // by exercise, interleaved: rungs in teaching order, keys in chunks of three
  const rungs = [...new Map(open.map((c) => [`${c.group}:${c.rung}`, c])).values()].sort((a, b) => (a.group === b.group ? 0 : a.group === 'major' ? -1 : 1) || a.i - b.i).map((c) => `${c.group}:${c.rung}`);
  const byRung = new Map(rungs.map((r) => [r, open.filter((c) => `${c.group}:${c.rung}` === r).sort((a, b) => kpos(a) - kpos(b))]));
  const out: MatrixCell[] = [];
  for (let chunk = 0; chunk < 4; chunk++) for (const r of rungs) out.push(...(byRung.get(r) ?? []).slice(chunk * 3, chunk * 3 + 3));
  return [...out, ...closed];
}

/** Today's technique block: the next cells of the view until the minutes run out (at least one cell). */
export function fillMinutes(ordered: MatrixCell[], minutes: number): MatrixCell[] {
  const out: MatrixCell[] = [];
  let m = 0;
  for (const c of ordered) {
    if (c.need.s === 2) break;
    if (c.need.cool) continue;
    if (out.length && m + c.minutes > minutes) break;
    out.push(c);
    m += c.minutes;
  }
  return out;
}

export interface MatrixSummary {
  cells: number;
  closed: number;
  /** Minutes of work left in the open cells. */
  minutesLeft: number;
  byKey: { root: number; group: MatrixGroup; cells: number; closed: number; minutes: number }[];
  byRung: { rung: string; group: MatrixGroup; title: { en: string; he: string }; cells: number; closed: number; minutes: number }[];
}

export function matrixSummary(cells: MatrixCell[]): MatrixSummary {
  // the projection ignores cells resting after a plateau (BUILD-PLAN §0.2: so it converges)
  const left = (cs: MatrixCell[]) => cs.filter((c) => c.need.s < 2 && !c.need.cool).reduce((n, c) => n + c.minutes, 0);
  const byKey = new Map<string, MatrixCell[]>();
  const byRung = new Map<string, MatrixCell[]>();
  for (const c of cells) {
    byKey.set(`${c.group}-${c.root}`, [...(byKey.get(`${c.group}-${c.root}`) ?? []), c]);
    byRung.set(`${c.group}:${c.rung}`, [...(byRung.get(`${c.group}:${c.rung}`) ?? []), c]);
  }
  return {
    cells: cells.length,
    closed: cells.filter((c) => c.need.s === 2).length,
    minutesLeft: left(cells),
    byKey: [...byKey.values()].map((cs) => ({ root: cs[0].root, group: cs[0].group, cells: cs.length, closed: cs.filter((c) => c.need.s === 2).length, minutes: cs.reduce((n, c) => n + c.minutes, 0) })),
    byRung: [...byRung.values()].map((cs) => ({ rung: cs[0].rung, group: cs[0].group, title: cs[0].level.title, cells: cs.length, closed: cs.filter((c) => c.need.s === 2).length, minutes: left(cs) })),
  };
}

/**
 * Days to close everything open (SPEC-DAILY-WORKOUT §5): the minutes left over the technique minutes a day, less the
 * maintenance share (closed cells revisited). Null without a window.
 */
export function projectionDays(summary: MatrixSummary, minutesPerDay: number, techShare = 0.7, maintenance = 0.15): number | null {
  const perDay = minutesPerDay * techShare * (1 - maintenance);
  if (perDay <= 0) return null;
  return Math.ceil(summary.minutesLeft / perDay);
}

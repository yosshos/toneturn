// Today's technique block from the key × exercise matrix (docs/BUILD-PLAN-2026-11.md phase 2, D2–D3): one plan for
// the day, run from today's workout and from the technique screen alike (never two "todays"). About half its cells come
// from the key of the week (in teaching order), the rest weakest-first (or the player's chosen view) from every key;
// maintenance — closed cells revisited, longest since played first — sits inside the block (D2: 15–20 % of the
// technique share). Cells resting after a plateau are skipped (matrixOrder). Pure.

import type { FamilyDef } from './generate';
import { cellItemIds, cellKey, fillMinutes, matrixOrder, type MatrixCell, type MatrixGroup, type MatrixView } from './keyMatrix';
import { allocateSlots, seedOf, tierShares, type StyleFocus, type StyleTier } from '../styleFocus';
import type { StyleId } from '../styles';

/** Why a cell is in today's plan (SPEC-PATH-TODAY-PRACTICE §2 "why today"). */
export type CellWhy = 'week' | 'strengthen' | 'review' | 'style';
export interface PlanCell {
  cell: MatrixCell;
  why: CellWhy;
}

/** D3: the key of the week's share of the technique block. */
export const WEEK_SHARE = 0.5;
/** D2: maintenance (closed cells revisited) inside the technique share. */
export const MAINT_SHARE = 0.15;
/** SPEC-STYLE-FOCUS §4–5: the style block's (H) share of the technique block, split 60/30/10 by the focus. */
export const STYLE_SHARE = 0.15;

const DEFAULT_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

export interface TechPlanOpts {
  /** The block's minutes. */
  minutes: number;
  /** The key of the week (null: none — the whole block by the view). */
  weekRoot: number | null;
  weekGroup?: MatrixGroup;
  /** The order of the rest (the player's view, remembered; default weakest first). */
  view?: MatrixView;
  keyOrder?: number[];
  /** SPEC-STYLE-FOCUS: the focus (block H's 60/30/10) and the day (its rounding). Absent: block H runs as any block. */
  focus?: StyleFocus;
  day?: string;
}

/**
 * SPEC-STYLE-FOCUS §4: today's style cells (block H) within `minutes` — about 60 % from the main style, 30 % from the
 * "also" styles, 10 % from the rest (never zero over the weeks: the day's seed rounds the fractions). Inside a tier the
 * neediest cell first, one style after another.
 */
export function pickStyleCells(cells: MatrixCell[], focus: StyleFocus, minutes: number, day: string): MatrixCell[] {
  const open = matrixOrder(cells.filter((c) => c.block === 'H' && c.style), 'weak').filter((c) => c.need.s < 2 && !c.need.cool);
  if (!open.length || minutes <= 0) return [];
  const avg = open.reduce((n, c) => n + c.minutes, 0) / open.length;
  const n = Math.max(1, Math.round(minutes / Math.max(0.5, avg)));
  const present = [...new Set(open.map((c) => c.style as StyleId))];
  const slots = allocateSlots(n, tierShares(focus, present), seedOf(`${day}|styleblock`));
  const out: MatrixCell[] = [];
  for (const t of ['main', 'also', 'rest'] as StyleTier[]) {
    const pool = open.filter((c) => (c.tier ?? 'rest') === t);
    // one style after another inside the tier (the rest: a different style each day first)
    const styles = [...new Set(pool.map((c) => c.style as StyleId))];
    const rot = styles.length ? Math.floor(seedOf(`${day}|${t}`) * styles.length) : 0;
    const order = [...styles.slice(rot), ...styles.slice(0, rot)];
    let k = 0;
    while (slots[t] > 0 && pool.some((c) => !out.includes(c))) {
      const st = order[k++ % order.length];
      const c = pool.find((x) => x.style === st && !out.includes(x));
      if (c) {
        out.push(c);
        slots[t]--;
      }
    }
  }
  return out;
}

const sum = (cs: MatrixCell[]) => cs.reduce((n, c) => n + c.minutes, 0);

/** Today's technique cells: review (closed, oldest first) → the key of the week → the rest by the view. */
export function todayTechPlan(cells: MatrixCell[], o: TechPlanOpts): PlanCell[] {
  const minutes = Math.max(1, o.minutes);
  const order = o.keyOrder ?? DEFAULT_ORDER;
  const taken = new Set<string>();
  const take = (cs: MatrixCell[], why: CellWhy): PlanCell[] => cs.filter((c) => !taken.has(cellKey(c))).map((c) => (taken.add(cellKey(c)), { cell: c, why }));
  // Maintenance: closed cells revisited at growing intervals — the ones played longest ago first.
  const closed = cells.filter((c) => c.need.s === 2).sort((a, b) => a.need.last.localeCompare(b.need.last) || order.indexOf(a.root) - order.indexOf(b.root) || a.i - b.i);
  const maintBudget = closed.length ? minutes * MAINT_SHARE : 0;
  const review: MatrixCell[] = [];
  for (const c of closed) {
    if (sum(review) + c.minutes > maintBudget) break;
    review.push(c);
  }
  const plan = take(review, 'review');
  let left = minutes - sum(review);
  // SPEC-STYLE-FOCUS §4–5: with a focus, block H has its own slice (60/30/10) and stays out of the other parts.
  const styled = !!o.focus && cells.some((c) => c.block === 'H');
  const notH = (c: MatrixCell) => !styled || c.block !== 'H';
  if (styled) {
    const st = pickStyleCells(cells.filter((c) => !taken.has(cellKey(c))), o.focus!, left * STYLE_SHARE, o.day ?? '');
    plan.push(...take(st, 'style'));
    left -= sum(st);
  }
  // The key of the week: its open cells in teaching order, about half of what is left.
  if (o.weekRoot !== null) {
    const g = o.weekGroup ?? 'major';
    const wk = cells.filter((c) => notH(c) && c.root === o.weekRoot && c.group === g && c.need.s < 2 && !c.need.cool).sort((a, b) => a.i - b.i);
    if (wk.length) {
      const w = fillMinutes(wk, left * WEEK_SHARE);
      plan.push(...take(w, 'week'));
      left -= sum(w);
    }
  }
  // The rest: weakest first (or the chosen view) from every key, to the block's minutes.
  if (left >= 1 || plan.length === 0) {
    const rest = matrixOrder(cells.filter(notH), o.view ?? 'weak', order).filter((c) => !taken.has(cellKey(c)));
    plan.push(...take(fillMinutes(rest, Math.max(1, left)), 'strengthen'));
  }
  return plan;
}

/**
 * The key of the week from the matrix (BUILD-PLAN §0.2: one per-key model): the key whose open cells are weakest (the
 * lowest mean share of target), the never-played counted as 0; ties by the player's key order. Null when nothing is open.
 */
export function weekKeyFromMatrix(cells: MatrixCell[], group: MatrixGroup = 'major', keyOrder: number[] = DEFAULT_ORDER): number | null {
  const rows = new Map<number, MatrixCell[]>();
  for (const c of cells) if (c.group === group && c.need.s < 2 && !c.need.cool) rows.set(c.root, [...(rows.get(c.root) ?? []), c]);
  if (!rows.size) return null;
  const mean = (cs: MatrixCell[]) => cs.reduce((n, c) => n + c.need.share, 0) / cs.length;
  return [...rows.entries()].sort((a, b) => mean(a[1]) - mean(b[1]) || keyOrder.indexOf(a[0]) - keyOrder.indexOf(b[0]))[0][0];
}

/** The plan as one coach family (the coach walks it cell by cell: one-key levels, in the plan's order). */
export function planFamily(plan: PlanCell[], title = { en: "Today's technique", he: 'הטכניקה של היום' }): FamilyDef {
  return { id: 'scales', title, style: 'both', levels: plan.map((p, k) => ({ ...p.cell.level, level: k + 1 })) } as FamilyDef;
}

/** What a frozen plan keeps for the day (the cells by identity, their reasons, their items, where the run stopped). */
export interface FrozenPlan {
  day: string;
  minutes: number;
  cells: string[];
  why: CellWhy[];
  items: string[];
  /** The coach's step reached (resume at the cell). */
  at: number;
}

export function freezePlan(plan: PlanCell[], day: string, minutes: number): FrozenPlan {
  return { day, minutes, cells: plan.map((p) => cellKey(p.cell)), why: plan.map((p) => p.why), items: [...new Set(plan.flatMap((p) => cellItemIds(p.cell)))], at: 0 };
}

/** A frozen plan back on today's matrix (cells that left the matrix — a tier change — drop out). */
export function thawPlan(f: FrozenPlan, cells: MatrixCell[]): PlanCell[] {
  const by = new Map(cells.map((c) => [cellKey(c), c]));
  return f.cells.flatMap((k, i) => {
    const c = by.get(k);
    return c ? [{ cell: c, why: f.why[i] ?? 'strengthen' }] : [];
  });
}

/** How many of each reason (the button's line: "4 in the key of the week · 3 to strengthen · 1 review"). */
export function whyCounts(plan: { why: CellWhy }[]): Record<CellWhy, number> {
  const out: Record<CellWhy, number> = { week: 0, strengthen: 0, review: 0, style: 0 };
  for (const p of plan) out[p.why]++;
  return out;
}

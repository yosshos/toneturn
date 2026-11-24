// The practice card's focus sheet for an instrument course (docs/SPEC-PRACTICE-SESSION.md §12): the 12 keys of each row
// group the matrix has open, and the exercises (matrix rungs) listed by role as on the key page — each marked new /
// working / closed / due from the key × exercise matrix — and the cells a session walks for one exercise or one item.
// Pure.

import { specDrills } from './plan';
import { keyFacet, type FacetRole } from './keyFacet';
import { ROLE_ORDER } from './keyIndex';
import { cellItemIds, matrixOrder, type MatrixCell, type MatrixGroup } from './keyMatrix';

export type CellState = 'new' | 'working' | 'closed' | 'due';

export interface SheetKey {
  root: number;
  group: MatrixGroup;
  state: CellState;
}
export interface SheetRung {
  rung: string;
  group: MatrixGroup;
  role: FacetRole;
  title: { en: string; he: string };
  state: CellState;
}
export interface FocusSheet {
  groups: MatrixGroup[];
  keys: SheetKey[];
  rungs: SheetRung[];
}

const DEFAULT_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/** A set of cells as one mark: due (a closed cell due for review today) → closed (all closed) → new (none played) → working. */
export function cellsState(cs: readonly MatrixCell[], day: string): CellState {
  const end = `${day}T23:59:59.999Z`;
  if (cs.some((c) => c.need.s === 2 && (c.need.due ?? '') !== '' && c.need.due! <= end)) return 'due';
  if (cs.length && cs.every((c) => c.need.s === 2)) return 'closed';
  if (cs.every((c) => c.need.s === 0)) return 'new';
  return 'working';
}

/** The row on the key page a rung belongs to (its first drill's facet; by its ladder block when it has none). */
const BLOCK_ROLE: Record<MatrixCell['block'], FacetRole> = { W: 'scale', A: 'scale', S: 'harmony', B: 'harmony', C: 'line', D: 'control', E: 'cadence', F: 'colour', G: 'line', H: 'comping', R: 'apply' };
export function roleOfCell(c: MatrixCell): FacetRole {
  try {
    const d = c.level.specs.length ? specDrills(c.level, 0, 'fifths-up')[0] : undefined;
    const f = d ? keyFacet(d) : null;
    if (f && f.scope !== 'neutral') return f.role;
  } catch {
    /* a level that can't build in this key: its block decides */
  }
  return BLOCK_ROLE[c.block] ?? 'pattern';
}

/** §12: the sheet's keys (12 per open group, in the player's key order) and rungs (by role, then teaching order). */
export function focusSheet(cells: readonly MatrixCell[], day: string, keyOrder: number[] = DEFAULT_ORDER): FocusSheet {
  const shown = cells.filter((c) => c.tier !== 'rest');
  const groups = (['major', 'minor'] as MatrixGroup[]).filter((g) => shown.some((c) => c.group === g));
  const keys: SheetKey[] = [];
  for (const g of groups)
    for (const root of keyOrder) {
      const cs = shown.filter((c) => c.group === g && c.root === root);
      if (cs.length) keys.push({ root, group: g, state: cellsState(cs, day) });
    }
  const byRung = new Map<string, MatrixCell[]>();
  for (const c of shown) byRung.set(`${c.group}:${c.rung}`, [...(byRung.get(`${c.group}:${c.rung}`) ?? []), c]);
  const rungs = [...byRung.values()]
    .map((cs) => ({ cs, first: cs.slice().sort((a, b) => keyOrder.indexOf(a.root) - keyOrder.indexOf(b.root))[0] }))
    .map(({ cs, first }) => ({ rung: first.rung, group: first.group, role: roleOfCell(first), title: first.level.title, state: cellsState(cs, day), i: first.i }))
    .sort((a, b) => (a.group === b.group ? 0 : a.group === 'major' ? -1 : 1) || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.i - b.i)
    .map(({ i: _i, ...r }) => r);
  return { groups, keys, rungs };
}

/**
 * §12 "an exercise": the rung through the 12 keys — the open keys weakest first (never played → lowest share of target
 * → longest since), then the closed ones due for review, then the rest of the closed ones.
 */
export function rungCells(cells: readonly MatrixCell[], rung: string, group: MatrixGroup, keyOrder: number[] = DEFAULT_ORDER, day?: string): MatrixCell[] {
  const cs = cells.filter((c) => c.rung === rung && c.group === group);
  const open = matrixOrder(cs.filter((c) => c.need.s < 2), 'weak', keyOrder);
  const end = day ? `${day}T23:59:59.999Z` : '';
  const closed = cs.filter((c) => c.need.s === 2).sort((a, b) => Number(!!end && (b.need.due ?? '') <= end) - Number(!!end && (a.need.due ?? '') <= end) || (a.need.due ?? '').localeCompare(b.need.due ?? '') || keyOrder.indexOf(a.root) - keyOrder.indexOf(b.root));
  // a plateau's resting cells (matrixOrder leaves them out) still come in this exercise's visit, after the others
  const resting = cs.filter((c) => c.need.s < 2 && c.need.cool);
  return [...open, ...resting.filter((c) => !open.includes(c)), ...closed];
}

/** §12 "one item": its cell first, then the same exercise in its other keys (as rungCells). Empty: not in the matrix. */
export function itemCells(cells: readonly MatrixCell[], itemId: string, keyOrder: number[] = DEFAULT_ORDER, day?: string): MatrixCell[] {
  const own = cells.find((c) => cellItemIds(c).includes(itemId));
  if (!own) return [];
  return [own, ...rungCells(cells, own.rung, own.group, keyOrder, day).filter((c) => c !== own)];
}

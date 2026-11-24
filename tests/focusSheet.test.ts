// SPEC-PRACTICE-SESSION §12: the focus sheet's keys and exercises with their marks, and the cells a session walks for
// one exercise or one item.
import { describe, expect, it } from 'vitest';
import { families, itemTargetBpm, specDrills } from '../src/engine/drills/plan';
import { newItem } from '../src/engine/drills/ladder';
import type { ItemState } from '../src/engine/drills/types';
import { cellItemIds, keyMatrix, type MatrixCell } from '../src/engine/drills/keyMatrix';
import { cellsState, focusSheet, itemCells, rungCells } from '../src/engine/drills/focusSheet';
import { ROLE_ORDER } from '../src/engine/drills/keyIndex';

const fams = families('piano');
const DAY = '2026-11-24';
const ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const closeCell = (c: MatrixCell, items: Record<string, ItemState>) => {
  for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 6, cleanBpm: itemTargetBpm(d), last: '2026-11-20', passLog: ['2026-11-19', '2026-11-20', '2026-11-20'].map((at) => ({ at, bpm: itemTargetBpm(d) })) };
};
const playCell = (c: MatrixCell, items: Record<string, ItemState>) => {
  for (let k = 0; k < c.level.specs.length; k++) for (const d of specDrills(c.level, k, 'fifths-up')) items[d.itemId] = { ...newItem(d), takes: 4, cleanBpm: d.startBpm, last: '2026-11-21' };
};

describe('§12 the focus sheet', () => {
  const blank = keyMatrix(fams, 2, {}, { day: DAY });
  it('12 keys per open group, every exercise by role, all new at first', () => {
    const sh = focusSheet(blank, DAY, ORDER);
    expect(sh.groups).toEqual(['major', 'minor']);
    expect(sh.keys.filter((k) => k.group === 'major').map((k) => k.root)).toEqual(ORDER);
    expect(sh.keys.every((k) => k.state === 'new')).toBe(true);
    expect(sh.rungs.length).toBeGreaterThan(3);
    const majors = sh.rungs.filter((r) => r.group === 'major');
    const roles = majors.map((r) => ROLE_ORDER.indexOf(r.role));
    expect(roles).toEqual([...roles].sort((a, b) => a - b));
    expect(sh.rungs.findIndex((r) => r.group === 'minor')).toBeGreaterThanOrEqual(majors.length);
    // a tier without minor rows: major only
    expect(focusSheet(keyMatrix(fams, 0, {}, { day: DAY }), DAY).groups).toEqual(['major']);
  });
  it('marks: working once played, closed when every cell is closed, due when a closed cell is due', () => {
    const items: Record<string, ItemState> = {};
    const cKey = blank.filter((c) => c.group === 'major' && c.root === 7);
    playCell(cKey[0], items);
    let cells = keyMatrix(fams, 2, items, { day: DAY });
    expect(focusSheet(cells, DAY).keys.find((k) => k.root === 7 && k.group === 'major')!.state).toBe('working');
    for (const c of cKey) closeCell(c, items);
    cells = keyMatrix(fams, 2, items, { day: DAY });
    const g = cells.filter((c) => c.group === 'major' && c.root === 7);
    expect(cellsState(g, '2026-11-21')).toBe('closed');
    // far later every closed cell is due for review
    expect(cellsState(g, '2027-06-01')).toBe('due');
    expect(cellsState([], DAY)).toBe('new');
  });
  it('an exercise walks its 12 keys weakest first, closed last; an item starts at its own cell', () => {
    const items: Record<string, ItemState> = {};
    const rung = blank.find((c) => c.group === 'major' && c.block !== 'W')!;
    const same = blank.filter((c) => c.rung === rung.rung && c.group === 'major');
    expect(same).toHaveLength(12);
    closeCell(same.find((c) => c.root === 0)!, items);
    playCell(same.find((c) => c.root === 7)!, items);
    const cells = keyMatrix(fams, 2, items, { day: DAY });
    const walk = rungCells(cells, rung.rung, 'major', ORDER, DAY);
    expect(walk).toHaveLength(12);
    expect(walk.at(-1)!.root).toBe(0);
    // never played comes before played below target
    expect(walk.findIndex((c) => c.root === 7)).toBe(10);
    const target = same.find((c) => c.root === 5)!;
    const id = cellItemIds(target)[0];
    const it2 = itemCells(cells, id, ORDER, DAY);
    expect(it2[0].root).toBe(5);
    expect(it2).toHaveLength(12);
    expect(new Set(it2.map((c) => c.root)).size).toBe(12);
    expect(itemCells(cells, 'no-such-item', ORDER, DAY)).toEqual([]);
  });
});

// Where an item page opens from a path step (docs/SPEC-PATH-TODAY-PRACTICE.md §3.1, §3.3): a technique step opens the
// key page with its rung lit — in the key of the week when the level has it (the step = opening that cell) — and a lick
// step opens the page of its level's first lick not yet in all 12 keys.

import type { DrillSettings, ItemState } from '../engine/drills/types';
import type { FacetGroup } from '../engine/drills/keyFacet';
import { buildKeyIndex, type KeyIndex } from '../engine/drills/keyIndex';
import { levelKeys, shownFamilies } from '../engine/drills/plan';
import { LICKS } from '../engine/licks';
import { lickLadder } from '../engine/statusLadder';
import type { Settings } from '../storage/progress';
import { lickInstrumentOf } from './LickTrainer';
import { weekKeyIfKept } from './todayTech';

let idxCache: { k: string; idx: KeyIndex } | null = null;
const indexOf = (ds: DrillSettings): KeyIndex => {
  const k = JSON.stringify(ds);
  if (idxCache?.k !== k) idxCache = { k, idx: buildKeyIndex(shownFamilies(ds), ds.keyOrder) };
  return idxCache.idx;
};
const onPage = (idx: KeyIndex, root: number, levelId: string): FacetGroup | null => {
  const pages = idx.pages[root];
  for (const g of Object.keys(pages) as FacetGroup[]) if (Object.values(pages[g]).some((es) => (es ?? []).some((e) => e.level.id === levelId))) return g;
  return null;
};

/** The key whose page shows a technique level's rung (the week's key first), or null (no key page: drums, key-free levels). */
export function rungKeyOf(levelId: string, ds: DrillSettings, now: number | string = Date.now()): number | null {
  const inst = ds.instrument ?? 'piano';
  if (inst === 'drums') return null;
  const idx = indexOf(ds);
  const lv = shownFamilies(ds).flatMap((f) => f.levels).find((l) => l.id === levelId);
  if (!lv) return null;
  const keys = levelKeys(lv, ds.keyOrder).map((k) => ((k % 12) + 12) % 12);
  const week = weekKeyIfKept(lv.keys === 'minor' ? 'minor' : 'major', inst, now);
  const order = week !== null && keys.includes(week) ? [week, ...keys.filter((k) => k !== week)] : keys;
  return order.find((k) => onPage(idx, k, levelId)) ?? null;
}

/** A lick step's full practice: its level's first library lick not yet closed in all 12 keys (else the level's first). */
export function stepLickOf(level: number, s: Pick<Settings, 'activeCourse' | 'instrument'>, items: Record<string, ItemState>): string | null {
  const inst = lickInstrumentOf(s);
  const lv = LICKS.filter((l) => l.level === level);
  return (lv.find((l) => !lickLadder(l, inst, items).lit.includes('keys12')) ?? lv[0])?.id ?? null;
}

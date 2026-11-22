// One status for everything a player learns (docs/BUILD-PLAN-2026-11.md D1, D4, owner-approved 2026-11-22): new →
// learning → almost → closed, and above closed the unit-level steps (all 12 keys, in my language, in the fingers).
// "Closed" is the technique pass rule everywhere: 3 clean takes at ≥ 95 % of the target tempo on ≥ 2 days (itemPass).
// One clean take at the target is "almost"; a pass at the start tempo (the coach moving a beginner on) is "learning".
//
// The take's channel (docs/SPEC-EAR-AND-READING.md §1, BUILD-PLAN §0.2): how it was played — read at sight, read
// known material, by ear fresh, by ear known, or unaided (concept / memory). Reading is measured only on sight takes,
// by ear only on fresh ear takes. Pure.

import type { ItemState } from './types';
import { itemPass, PASS_SHARE } from './ladder';

export type ItemStatus = 'new' | 'learning' | 'almost' | 'closed';
export const STATUS_ORDER: ItemStatus[] = ['new', 'learning', 'almost', 'closed'];

/** An item's status against its start and target tempo. */
export function itemStatus(st: ItemState | undefined, startBpm: number, targetBpm: number): ItemStatus {
  if (!st || !st.takes) return 'new';
  if (itemPass(st, startBpm, targetBpm).target) return 'closed';
  if ((st.cleanBpm ?? 0) >= PASS_SHARE * targetBpm - 1e-9) return 'almost';
  return 'learning';
}

/** A unit's status (a cell, a lick in a key, a piece): its weakest item — but once anything is played it is at least learning. */
export function unitStatus(sts: ItemStatus[]): ItemStatus {
  if (!sts.length) return 'new';
  const min = sts.reduce((m, s) => (STATUS_ORDER.indexOf(s) < STATUS_ORDER.indexOf(m) ? s : m), 'closed' as ItemStatus);
  return min === 'new' && sts.some((s) => s !== 'new') ? 'learning' : min;
}

export const STATUS_WORD: Record<ItemStatus, { en: string; he: string }> = {
  new: { en: 'New', he: 'חדש' },
  learning: { en: 'Learning', he: 'בלמידה' },
  almost: { en: 'Almost', he: 'כמעט' },
  closed: { en: 'Closed', he: 'סגור' },
};

export * from './channel';

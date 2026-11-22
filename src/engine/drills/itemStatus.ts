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

/** Days a cell left at the player's limit rests before the matrix serves it again (BUILD-PLAN §0.2: the plateau). */
export const COOLDOWN_DAYS = 3;

const addDays = (day: string, n: number): string => {
  const t = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(t) ? new Date(t + n * 86400000).toISOString().slice(0, 10) : day;
};

/** The item after the coach's limit rule: "a ceiling for now" at this tempo, resting COOLDOWN_DAYS from `day`. */
export function withCeiling(st: ItemState, bpm: number, day: string): ItemState {
  return { ...st, ceiling: { bpm: Math.round(bpm), until: addDays(day, COOLDOWN_DAYS) } };
}

/** Resting after a plateau, on `day`: a ceiling whose cooldown hasn't ended, and not beaten since (a faster clean take). */
export function coolingDown(st: ItemState | undefined, day: string): boolean {
  const c = st?.ceiling;
  return !!st && !!c && day < c.until && (st.cleanBpm ?? 0) <= c.bpm + 0.5;
}

export * from './channel';

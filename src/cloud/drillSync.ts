// SPEC-CLIMB-SYNC §3: the drill items (tempi, stages, history, ceilings) sync across the player's devices.
// A sync pulls first (the rows changed since this device's last pull, merged item by item: drillMerge.ts), then pushes
// the items marked dirty here. Each pushed item carries `base`, the row version this device last saw: the server
// refuses to overwrite a row it hasn't seen (20261212000000), and a refused item is pulled, merged and pushed again.
// Signed-in players only; safe offline (a failed push stays dirty, a failed pull is tried again next time).
// The bookkeeping is per scope: the progress epoch and the account.

import { supabase } from './cloud';
import type { ItemState } from '../engine/drills/types';
import { clearDrillDirty, drillDirty, drillPulledAt, drillSeen, markDrillDirty, noteDrillSeen, setDrillPulledAt } from '../storage/drillDirty';
import { portable, sameItem } from '../storage/drillMerge';

export const DRILL_SYNCED = true;
const BATCH = 300;
/** Pulls overlap the last one a little (rows written in the same moment as the last one seen). */
const OVERLAP_MS = 2 * 60_000;
/** The server keeps rows up to 32 KB; a larger item stays on this device (it is dropped from the list, never retried). */
const MAX_CHARS = 30_000;
/** Rows per pull page (the server allows up to 1000). */
const PAGE = 500;

type Backend = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
let backend: Backend | null = null;
/** Tests answer the RPCs instead of the server. */
export function setDrillSyncBackend(b: Backend | null) {
  backend = b;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (backend) return ((await backend(fn, args)) ?? null) as T | null;
  if (!DRILL_SYNCED) return null;
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const drillScope = (epoch: string, userId: string) => `${epoch}|${userId}`;

/** This device has never pulled in this scope: everything it holds goes up (items from before the sync, another account). */
export function markAllIfFirst(items: Record<string, ItemState>, scope: string): void {
  if (drillPulledAt(scope) === null) markDrillDirty(Object.keys(items));
}

export interface PushResult {
  ok: boolean;
  /** Items the server refused (a newer row this device hasn't seen): pull, merge, push again. */
  refused: number;
}

/** Push the dirty items that exist here (`load` reads them fresh, after the versions are read). */
export async function pushDrillItems(load: () => Promise<Record<string, ItemState>>, epoch: string, scope: string): Promise<PushResult> {
  const dirty = drillDirty();
  const all = Object.keys(dirty);
  if (!all.length) return { ok: true, refused: 0 };
  const items = await load();
  const at = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, dirty[id]]));
  // ids no longer here (a fresh start, a removed item) and items too large for the server leave the list
  const drop = all.filter((id) => !items[id] || JSON.stringify(portable(items[id])).length > MAX_CHARS);
  if (drop.length) clearDrillDirty(at(drop));
  const ids = all.filter((id) => !drop.includes(id));
  const seen = drillSeen(scope);
  let ok = true;
  let refused = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const part = ids.slice(i, i + BATCH);
    try {
      const rows = (await rpc<{ item_id: string; updated_at: string }[]>('toneturn_drill_items_put', { p_epoch: epoch, p_items: part.map((id) => ({ id, state: portable(items[id]), base: seen[id] ?? null })) })) ?? [];
      const took = new Set(rows.map((r) => r.item_id));
      noteDrillSeen(scope, rows.map((r) => ({ id: r.item_id, at: r.updated_at })));
      clearDrillDirty(at(part.filter((id) => took.has(id))));
      refused += part.filter((id) => !took.has(id)).length;
    } catch {
      ok = false;
    }
  }
  return { ok: ok && refused === 0, refused };
}

/**
 * Pull the rows changed since this device's last pull (all of them on a first pull) and hand them to `merge` (the store
 * merges them into the items as they are at that moment). Merged copies that hold more than their row go back up. The
 * ids that changed here, or null when the pull failed.
 */
export async function pullDrillItems(epoch: string, scope: string, merge: (remote: ItemState[]) => Promise<{ items: Record<string, ItemState>; changed: string[] }>): Promise<string[] | null> {
  const since0 = drillPulledAt(scope);
  const since = since0 ? new Date(Date.parse(since0) - OVERLAP_MS).toISOString() : null;
  // paged (20261213000000): rows after a (updated_at, item_id) cursor, PAGE at a time, until a short page
  type Row = { item_id: string; state: ItemState; updated_at: string };
  const rows: Row[] = [];
  let cur: { at: string | null; id: string | null } = { at: since, id: null };
  for (let guard = 0; guard < 50; guard++) {
    let page: Row[] | null;
    try {
      page = await rpc<Row[]>('toneturn_drill_items_get', { p_epoch: epoch, p_since: cur.at, p_after: cur.id, p_limit: PAGE });
    } catch {
      return null;
    }
    if (!page) return null;
    rows.push(...page);
    if (page.length < PAGE) break;
    const last = page[page.length - 1];
    cur = { at: last.updated_at, id: last.item_id };
  }
  const good = rows.filter((r) => r && r.state && typeof r.state === 'object' && typeof r.item_id === 'string');
  const remote = good.map((r) => ({ ...r.state, itemId: r.item_id }));
  const r = remote.length ? await merge(remote) : { items: {}, changed: [] };
  // the versions seen go in only after the merge saved (a refused push then always pulls the newer row first)
  noteDrillSeen(scope, good.map((x) => ({ id: x.item_id, at: x.updated_at })));
  const repush = remote.filter((x) => r.items[x.itemId] && !sameItem(r.items[x.itemId], x)).map((x) => x.itemId);
  if (repush.length) markDrillDirty(repush);
  // the newest row seen (server time); none yet: "pulled once", read from the beginning next time
  const newest = rows.reduce((m, x) => (x.updated_at > m ? x.updated_at : m), since0 ?? '1970-01-01T00:00:00.000Z');
  setDrillPulledAt(scope, newest);
  return r.changed;
}

/**
 * One sync (SPEC-CLIMB-SYNC §3.2): pull and merge first, then push; items the server refused (another device wrote them
 * meanwhile) are pulled, merged and pushed once more. True when nothing is left to send.
 */
export async function drillSync(o: { epoch: string; userId: string; items: () => Promise<Record<string, ItemState>>; merge: (remote: ItemState[]) => Promise<{ items: Record<string, ItemState>; changed: string[] }> }): Promise<boolean> {
  const scope = drillScope(o.epoch, o.userId);
  markAllIfFirst(await o.items(), scope);
  for (let round = 0; round < 2; round++) {
    const pulled = await pullDrillItems(o.epoch, scope, o.merge);
    if (pulled === null) return false;
    const r = await pushDrillItems(o.items, o.epoch, scope);
    if (r.ok) return true;
    if (!r.refused) return false;
  }
  return false;
}

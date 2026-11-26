// SPEC-CLIMB-SYNC §3.3: two copies of one drill item (this device's and another device's) merged into one. Pure.
// The copy with more takes is the base; tempi and counts take the maximum, stages the union, logs the union by
// moment; a ceiling (the lowest missed challenge) takes the lower of two recent ones and goes once the clean tempo
// passed it. Merging is idempotent: an item merged with itself, or with a copy it already holds, comes out the same.

import type { ItemState } from '../engine/drills/types';

/** The ladder's own caps (ladder.ts): the history keeps 200 days, the pass log 60 takes. */
const HISTORY_CAP = 200;
const PASS_CAP = 60;
const CEIL_DAYS = 30;

type LogRow = { at: string; bpm: number };
const byMoment = (x: LogRow, y: LogRow) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.bpm - y.bpm);
/** The pass log: the union of takes (by moment and tempo), newest `cap` kept. */
function unionLog<T extends LogRow>(a: T[] | undefined, b: T[] | undefined, cap: number): T[] | undefined {
  if (!a && !b) return undefined;
  const seen = new Map<string, T>();
  for (const x of [...(a ?? []), ...(b ?? [])]) {
    const k = `${x.at}|${x.bpm}`;
    if (!seen.has(k)) seen.set(k, x);
  }
  const out = [...seen.values()].sort(byMoment);
  return out.length > cap ? out.slice(out.length - cap) : out;
}
/** The tempo history: one entry per day (the ladder replaces a day's entry when the tempo rises) — the higher tempo of a
 *  day, a tie to the later moment. */
function unionDays<T extends LogRow>(a: T[] | undefined, b: T[] | undefined): T[] {
  const days = new Map<string, T>();
  for (const x of [...(a ?? []), ...(b ?? [])]) {
    const k = String(x.at).slice(0, 10);
    const cur = days.get(k);
    if (!cur || x.bpm > cur.bpm || (x.bpm === cur.bpm && x.at > cur.at)) days.set(k, x);
  }
  const out = [...days.values()].sort(byMoment);
  return out.length > HISTORY_CAP ? out.slice(out.length - HISTORY_CAP) : out;
}

function mergeChannels(a: ItemState['channels'], b: ItemState['channels']): ItemState['channels'] {
  if (!a && !b) return undefined;
  const out: NonNullable<ItemState['channels']> = {};
  for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]) as Set<keyof NonNullable<ItemState['channels']>>) {
    const x = a?.[k];
    const y = b?.[k];
    out[k] = { n: Math.max(x?.n ?? 0, y?.n ?? 0), clean: Math.max(x?.clean ?? 0, y?.clean ?? 0), best: Math.max(x?.best ?? 0, y?.best ?? 0) };
  }
  return out;
}

const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

function mergeCeil(a: ItemState['ceil'], b: ItemState['ceil']): ItemState['ceil'] {
  if (!a) return b;
  if (!b) return a;
  if (daysBetween(a.at, b.at) <= CEIL_DAYS) return a.nps < b.nps || (a.nps === b.nps && a.at >= b.at) ? a : b;
  return a.at >= b.at ? a : b;
}

/** The notes per beat a ceiling was measured at (saved with it); else from the id (`pb4` = 16ths); else unknown. */
const perOf = (ceil: NonNullable<ItemState['ceil']>, id: string): number | null => {
  if (ceil.npb && ceil.npb > 0) return ceil.npb;
  const m = /:pb(\d)/.exec(id);
  return m ? Number(m[1]) : null;
};
/** A stable text of an item (keys sorted): the last tie-break, so two devices always pick the same copy. */
const stable = (x: unknown): string => JSON.stringify(sorted(x && typeof x === 'object' && 'rev' in (x as object) ? portable(x as ItemState) : x));

/** Two copies of one item merged (SPEC-CLIMB-SYNC §3.3); `preferA`: `a` is the base whatever the takes (a save built on
 *  an older revision: its own tempo and goal stand, the rest is the union). */
export function mergeItem(a: ItemState, b: ItemState, preferA = false): ItemState {
  const aFirst = preferA ? true : a.takes !== b.takes ? a.takes > b.takes : (a.last ?? '') !== (b.last ?? '') ? (a.last ?? '') > (b.last ?? '') : stable(a) >= stable(b);
  const base = aFirst ? a : b;
  const other = aFirst ? b : a;
  const out: ItemState = { ...base };
  out.cleanBpm = Math.max(a.cleanBpm ?? 0, b.cleanBpm ?? 0);
  out.takes = Math.max(a.takes ?? 0, b.takes ?? 0);
  if (a.activeMs !== undefined || b.activeMs !== undefined) out.activeMs = Math.max(a.activeMs ?? 0, b.activeMs ?? 0);
  const stages = [...new Set([...(base.stages ?? []), ...(other.stages ?? [])])];
  if (stages.length) out.stages = stages;
  out.history = unionDays(a.history, b.history);
  const passLog = unionLog(a.passLog, b.passLog, PASS_CAP);
  if (passLog) out.passLog = passLog;
  const channels = mergeChannels(a.channels, b.channels);
  if (channels) out.channels = channels;
  // a ceiling the merged clean tempo already reached goes first (2 % for the item tempo's rounding), then the lower of the rest
  const live = (c: ItemState['ceil']) => {
    if (!c) return undefined;
    const npb = perOf(c, out.itemId);
    return npb !== null && (out.cleanBpm * npb) / 60 >= c.nps * 0.98 ? undefined : c;
  };
  const ceil = mergeCeil(live(a.ceil), live(b.ceil));
  if (ceil) out.ceil = ceil;
  else delete out.ceil;
  return out;
}

/** Same content (field order aside)? Merging is skipped for rows that change nothing. */
export const sameItem = (a: ItemState, b: ItemState): boolean => stable(a) === stable(b);
/** The item as it travels: without this device's revision. */
export const portable = (x: ItemState): ItemState => {
  if (x.rev === undefined) return x;
  const { rev: _r, ...rest } = x;
  return rest as ItemState;
};
function sorted(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(sorted);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sorted((x as Record<string, unknown>)[k])]));
  return x;
}

/** Remote rows merged into the local items: the new map and the ids that changed here. */
export function mergeItems(local: Record<string, ItemState>, remote: ItemState[]): { items: Record<string, ItemState>; changed: string[] } {
  const items = { ...local };
  const changed: string[] = [];
  for (const r of remote) {
    if (!r || typeof r.itemId !== 'string') continue;
    const cur = items[r.itemId];
    const next = cur ? mergeItem(cur, r) : r;
    if (!cur || !sameItem(cur, next)) {
      items[r.itemId] = next;
      changed.push(r.itemId);
    }
  }
  return { items, changed };
}

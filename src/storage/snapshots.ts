// The daily progress snapshots on the device (docs/SPEC-PROGRESS-CHARTS.md §1): IndexedDB, one record holding every
// day (about 1 KB a day; a year daily, weekly before that). The past is back-filled once from the items and the
// practice ledger; today's snapshot is rewritten after every change of progress (idempotent).

import { backfillSnapshots, daySnapshot, minuteArea, pruneSnapshots, type Snapshot } from '../engine/snapshot';
import type { ItemState } from '../engine/drills/types';
import { indexedKV, memoryKV, type KV } from './kv';
import { pushSnapshot } from '../cloud/snapshots';

interface Stored {
  v: 1;
  backfilled?: boolean;
  days: Record<string, Snapshot>;
}

let kv: KV | null = null;
const store = (): KV => {
  if (kv) return kv;
  try {
    kv = typeof indexedDB !== 'undefined' ? indexedKV('toneturn-snapshots', 'kv') : memoryKV();
  } catch {
    kv = memoryKV();
  }
  return kv;
};
/** Tests: a fresh in-memory store. */
export const resetSnapshotStore = (k?: KV) => {
  kv = k ?? memoryKV();
};

export async function loadSnapshots(): Promise<Record<string, Snapshot>> {
  try {
    return ((await store().get<Stored>('all')) ?? { v: 1, days: {} }).days;
  } catch {
    return {};
  }
}

/** Write today's snapshot (and, the first time, back-fill the past). Never throws. */
export async function recordSnapshot(today: string, items: Record<string, ItemState>, ledgerDays: Record<string, Record<string, number>>): Promise<Record<string, Snapshot>> {
  try {
    const cur = (await store().get<Stored>('all')) ?? { v: 1 as const, days: {} };
    let days = { ...cur.days };
    // 0.117.0 kept raw ledger bucket keys in `minutes`: fold them into the kinds of practice once
    for (const [d, snap] of Object.entries(days))
      if (Object.keys(snap.minutes).some((k) => k.includes('|'))) {
        const m: Record<string, number> = {};
        for (const [k, v] of Object.entries(snap.minutes)) m[k.includes('|') ? minuteArea(k) : k] = Math.round(((m[k.includes('|') ? minuteArea(k) : k] ?? 0) + v) * 10) / 10;
        days[d] = { ...snap, minutes: m };
      }
    if (!cur.backfilled) days = { ...backfillSnapshots(items, ledgerDays, today, days), ...days };
    days[today] = daySnapshot(today, items, ledgerDays[today] ?? {});
    days = pruneSnapshots(days, today);
    await store().set<Stored>('all', { v: 1, backfilled: true, days });
    // the summary syncs for class members' teachers (a no-op until the migration is applied, SNAPSHOTS_SYNCED)
    void pushSnapshot(days[today]);
    return days;
  } catch {
    return {};
  }
}

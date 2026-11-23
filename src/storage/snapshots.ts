// The daily progress snapshots on the device (docs/SPEC-PROGRESS-CHARTS.md §1): IndexedDB, one record holding every
// day (about 1 KB a day; a year daily, weekly before that). The past is back-filled once from the items and the
// practice ledger; today's snapshot is rewritten after every change of progress (idempotent).

import { backfillSnapshots, daySnapshot, minuteArea, pruneSnapshots, type SnapExtra, type Snapshot } from '../engine/snapshot';
import type { ItemState } from '../engine/drills/types';
import { indexedKV, memoryKV, type KV } from './kv';
import { pushSnapshot } from '../cloud/snapshots';

interface Stored {
  v: 1;
  backfilled?: boolean;
  /** Ear steps were back-filled too (the Ear course's charts, added after the first back-fill). */
  earFilled?: boolean;
  days: Record<string, Snapshot>;
  /** The day's improvisation takes (count, summed in-scale share): the snapshot's in-scale rate. */
  improv?: { day: string; n: number; inSet: number };
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
/**
 * Every read-modify-write of the one record runs in turn (a promise queue): an improvisation take's note and a
 * snapshot write that overlap would otherwise each write back what it read, and one of them would be lost.
 */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

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

/** What the day's snapshot reads besides the items and the ledger (the app passes it from settings and progress). */
export type RecordExtra = Pick<SnapExtra, 'book' | 'modeStats' | 'ear' | 'mixTarget'>;

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

/** One improvisation take's in-scale share (0..1), for the day's in-scale rate (SPEC-PROGRESS-CHARTS §1). Never throws. */
export function noteImprovTake(today: string, inSet: number): Promise<void> {
  return serial(() => noteImprovTakeNow(today, inSet));
}
async function noteImprovTakeNow(today: string, inSet: number): Promise<void> {
  try {
    const cur = (await store().get<Stored>('all')) ?? { v: 1 as const, days: {} };
    const im = cur.improv?.day === today ? cur.improv : { day: today, n: 0, inSet: 0 };
    await store().set<Stored>('all', { ...cur, improv: { day: today, n: im.n + 1, inSet: im.inSet + Math.max(0, Math.min(1, inSet)) } });
  } catch {
    /* the rate simply misses this take */
  }
}

/** Write today's snapshot (and, the first time, back-fill the past). Never throws. */
export function recordSnapshot(today: string, items: Record<string, ItemState>, ledgerDays: Record<string, Record<string, number>>, extra: RecordExtra = {}): Promise<Record<string, Snapshot>> {
  return serial(() => recordSnapshotNow(today, items, ledgerDays, extra));
}
async function recordSnapshotNow(today: string, items: Record<string, ItemState>, ledgerDays: Record<string, Record<string, number>>, extra: RecordExtra): Promise<Record<string, Snapshot>> {
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
    if (!cur.backfilled) days = { ...backfillSnapshots(items, ledgerDays, today, days, extra.ear?.steps ?? []), ...days };
    else if (!cur.earFilled && extra.ear?.steps.length) {
      // the Ear course's steps arrived after the first back-fill: add them to the past days once
      const ear = backfillSnapshots({}, {}, today, {}, extra.ear.steps);
      for (const [d, snap] of Object.entries(ear)) days[d] = days[d] ? { ...days[d], status: { ...snap.status, ...days[d].status } } : snap;
    }
    const before = Object.keys(days).filter((d) => d < today).sort();
    const prior = before.length ? days[before[before.length - 1]] : undefined;
    const wkDay = before.filter((d) => d <= addDays(today, -7)).pop();
    const improvDay = cur.improv?.day === today ? { n: cur.improv.n, inSet: cur.improv.inSet } : undefined;
    days[today] = daySnapshot(today, items, ledgerDays[today] ?? {}, { ...extra, prior, weekAgo: wkDay ? days[wkDay] : undefined, improvDay });
    days = pruneSnapshots(days, today);
    await store().set<Stored>('all', { v: 1, backfilled: true, earFilled: cur.earFilled || !!extra.ear?.steps.length, days, ...(cur.improv ? { improv: cur.improv } : {}) });
    // the summary syncs for class members' teachers (a no-op until the migration is applied, SNAPSHOTS_SYNCED)
    void pushSnapshot(days[today]);
    return days;
  } catch {
    return {};
  }
}

/**
 * SPEC-PROGRESS-CHARTS §1: the day's snapshot is rewritten after every session end of any kind — a lesson, a game run,
 * an ear topic, repertoire, improvisation — not only when technique items change. The app installs this once; every
 * booking in the practice ledger (storage/practice.ts commits one at each session end) schedules a write a few seconds
 * later (debounced), reading the latest inputs. Returns the uninstall.
 */
export function installSnapshotRecorder(subscribe: (cb: () => void) => () => void, inputs: () => { today: string; items: Record<string, ItemState>; ledgerDays: Record<string, Record<string, number>>; extra?: RecordExtra } | null, delayMs = 4000): { schedule: () => void; stop: () => void } {
  let t: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      const x = inputs();
      if (x) void recordSnapshot(x.today, x.items, x.ledgerDays, x.extra);
    }, delayMs);
  };
  const off = subscribe(schedule);
  return {
    schedule,
    stop: () => {
      off();
      if (t) clearTimeout(t);
    },
  };
}

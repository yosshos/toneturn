// Take traces on this device (SPEC-PRACTICE-INTELLIGENCE §2.4, P1 shadow mode): one compact record per judged take
// (engine/drills/tendency.ts), the newest MAX kept, for calibration and later the long-term model. Never synced (the
// long-term buckets will be); exportable as JSON for calibration sessions.

import type { TakeTrace } from '../engine/drills/tendency';
import { indexedKV, memoryKV, type KV } from './kv';

/** The newest MAX traces, and none older than KEEP_DAYS (§2.4: 60–90 days on the device). */
const MAX = 3000;
const KEEP_DAYS = 90;
const kv: KV = (() => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedKV('toneturn-traces', 'traces') : memoryKV();
  } catch {
    return memoryKV();
  }
})();
let cache: TakeTrace[] | null = null;
let chain: Promise<unknown> = Promise.resolve();

export async function loadTraces(): Promise<TakeTrace[]> {
  if (cache) return cache;
  cache = (await kv.get<TakeTrace[]>('list')) ?? [];
  return cache;
}

/** SPEC-FINGERING F1: only the newest NOTE_LOG_KEEP traces keep their per-note log (`nl`, ~1–2 KB each) on the device;
 *  the calibration upload sends each trace right after it is kept, long before its log is dropped. */
export const NOTE_LOG_KEEP = 500;

/** The list with the per-note log dropped from all but the newest `keep` traces (the list is oldest first). Pure. */
export function trimNoteLogs(list: TakeTrace[], keep = NOTE_LOG_KEEP): TakeTrace[] {
  const from = list.length - keep;
  if (from <= 0) return list;
  return list.map((t, i) => {
    if (i >= from || !t.nl) return t;
    const { nl: _dropped, ...rest } = t;
    return rest;
  });
}

/** Keep one take's trace (serialised; the oldest drop beyond MAX). */
export function recordTrace(t: TakeTrace | null): Promise<unknown> {
  if (!t) return chain;
  chain = chain
    .then(async () => {
      const cur = await loadTraces();
      const cutoff = new Date(Date.parse(t.at) - KEEP_DAYS * 86_400_000).toISOString();
      const next = trimNoteLogs([...cur.filter((x) => x.at >= cutoff), t]);
      cache = next.length > MAX ? next.slice(next.length - MAX) : next;
      await kv.set('list', cache);
    })
    .catch(() => {});
  return chain;
}

/** All kept traces as a JSON text (calibration sessions; the owner's export). */
export async function exportTraces(): Promise<string> {
  return JSON.stringify({ v: 1, exported: new Date().toISOString(), traces: await loadTraces() });
}

/** Tests / the fresh start. */
export async function clearTraces(): Promise<void> {
  cache = [];
  await kv.set('list', []);
}

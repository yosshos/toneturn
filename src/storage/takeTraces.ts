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

/** Keep one take's trace (serialised; the oldest drop beyond MAX). */
export function recordTrace(t: TakeTrace | null): Promise<unknown> {
  if (!t) return chain;
  chain = chain
    .then(async () => {
      const cur = await loadTraces();
      const cutoff = new Date(Date.parse(t.at) - KEEP_DAYS * 86_400_000).toISOString();
      const next = [...cur.filter((x) => x.at >= cutoff), t];
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

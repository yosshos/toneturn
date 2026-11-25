// The teacher's weekly-plan send queue (SPEC-WEEK-PLAN-TILT §1.3), kept on THIS device: the items waiting to go out
// (engine/weekPlan.ts Queue) and the ones being sent right now. One copy for the whole app (module level), so a class
// card that is closed and opened again during a slow send sees the send still running and cannot start it twice.
// localStorage, written at once on every change: a reload keeps exactly what has not gone out.

import { useSyncExternalStore } from 'react';
import type { Queue } from '../engine/weekPlan';

const KEY = 'toneturn.weekPlanQueue.v1';
let queue: Queue = read();
let flying = new Set<string>();
const subs = new Set<() => void>();
let snap = { queue, flying };

function read(): Queue {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Queue | null;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}
// another tab of the app changed the queue: take its copy (the tabs share one localStorage)
if (typeof window !== 'undefined')
  window.addEventListener('storage', (ev) => {
    if (ev.key !== KEY) return;
    queue = read();
    emit();
  });
const emit = () => {
  snap = { queue, flying };
  for (const f of subs) f();
};

/** Change the queue (applied to the latest copy, stored at once). */
let stored = true;
export function updateQueue(f: (q: Queue) => Queue) {
  // from the stored copy (another window of the app may have changed it since this one last read it) — unless the last
  // write failed: then this window's copy is the only true one, and it goes on from that
  queue = f(stored ? read() : queue);
  try {
    if (Object.keys(queue).length) localStorage.setItem(KEY, JSON.stringify(queue));
    else localStorage.removeItem(KEY);
    stored = true;
  } catch {
    stored = false; // storage full or blocked: the queue still holds for this session
  }
  emit();
}

/** Mark entries as being sent (true) or done sending (false). */
export function setFlying(pids: string[], on: boolean) {
  const next = new Set(flying);
  for (const p of pids) {
    if (on) next.add(p);
    else next.delete(p);
  }
  flying = next;
  emit();
}

export const queueNow = (): Queue => queue;
export const isFlying = (pid: string): boolean => flying.has(pid);

/** The queue and the entries in flight, kept current in a component. */
export function useWeekPlanQueue(): { queue: Queue; flying: Set<string> } {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => void subs.delete(f)),
    () => snap,
    () => snap,
  );
}

/** Tests: start from an empty queue. */
export function resetWeekPlanQueue() {
  queue = {};
  flying = new Set();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* fine */
  }
  emit();
}

const MADE_KEY = 'toneturn.weekPlanMade.v1';
/** Assignment ids this device created from plans (the last 300): never matched again for another waiting item. */
export function noteCreated(id: string) {
  if (!id) return;
  try {
    const list = JSON.parse(localStorage.getItem(MADE_KEY) ?? '[]') as string[];
    localStorage.setItem(MADE_KEY, JSON.stringify([...list.filter((x) => x !== id), id].slice(-300)));
  } catch {
    /* fine */
  }
}
/** The ids taken: created here, or held by a waiting entry (its options pending). */
export function takenIds(): Set<string> {
  let list: string[] = [];
  try {
    list = JSON.parse(localStorage.getItem(MADE_KEY) ?? '[]') as string[];
  } catch {
    /* fine */
  }
  const held = Object.values(queue).flatMap((byClass) => Object.values(byClass).flat().flatMap((e) => (e.made ? [e.made] : [])));
  return new Set([...list, ...held]);
}

/**
 * Run a send for a class while no other window of the app sends to it (navigator.locks; where it is missing, this
 * window's own check is all there is). Returns false when another window holds it.
 */
export async function withSendLock(classId: string, fn: () => Promise<void>): Promise<boolean> {
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks) {
    await fn();
    return true;
  }
  let got = false;
  await locks.request(`toneturn-weekplan-send:${classId}`, { ifAvailable: true }, async (lock) => {
    if (!lock) return;
    got = true;
    queue = read();
    emit();
    await fn();
  });
  return got;
}

const BATCH_KEY = 'toneturn.weekPlanBatches.v1';
const readBatches = (): Record<string, string[]> => {
  try {
    return (JSON.parse(localStorage.getItem(BATCH_KEY) ?? '{}') as Record<string, string[]>) ?? {};
  } catch {
    return {};
  }
};
/** A send's "before" list: the class's assignment ids that existed when it began. Batches no entry refers to go. */
export function saveBatch(id: string, ids: string[]) {
  const used = new Set(Object.values(queue).flatMap((byClass) => Object.values(byClass).flat().flatMap((e) => (e.batch ? [e.batch] : []))));
  const all = readBatches();
  const next: Record<string, string[]> = { [id]: ids };
  for (const [k, v] of Object.entries(all)) if (used.has(k)) next[k] = v;
  try {
    localStorage.setItem(BATCH_KEY, JSON.stringify(next));
  } catch {
    /* fine: the time fallback still applies */
  }
}
export function batchBefore(id: string | undefined): Set<string> | null {
  if (!id) return null;
  const v = readBatches()[id];
  return v ? new Set(v) : null;
}

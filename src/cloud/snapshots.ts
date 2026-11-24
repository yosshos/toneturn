// Progress snapshots in the cloud (docs/SPEC-PROGRESS-CHARTS.md §1, §4, §6): the player's daily summary syncs so a
// teacher can chart their class; the teacher's switch shows students an anonymous class median.
// Needs migration 20261208000000_toneturn_progress_snapshots.sql — set SNAPSHOTS_SYNCED = true once the owner has
// applied it. Until then every call is a no-op (local snapshots keep building up on the device).

import { supabase } from './cloud';
import type { Snapshot } from '../engine/snapshot';

export const SNAPSHOTS_SYNCED = true; // migration 20261208000000 applied 2026-11-24

/** Tests and the dev mock (localStorage tt.mockSnapshots = 1, dev builds only) answer the RPCs instead. */
type Backend = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
let backend: Backend | null = null;
export function setSnapshotsBackend(b: Backend | null) {
  backend = b;
}
export const snapshotsMockOn = (): boolean => {
  if (!import.meta.env.DEV) return false;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('tt.mockSnapshots') === '1';
  } catch {
    return false;
  }
};
/** The teacher charts and the student's median line show only when the summaries sync (or a test backend answers). */
export const snapshotsOn = (): boolean => SNAPSHOTS_SYNCED || !!backend || snapshotsMockOn();

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!backend && snapshotsMockOn()) backend = (await import('./snapshotsMock')).mockSnapshotRpc;
  if (backend) return ((await backend(fn, args)) ?? null) as T | null;
  if (!SNAPSHOTS_SYNCED) return null;
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Push one day's snapshot (signed-in players only; never throws). */
export async function pushSnapshot(s: Snapshot): Promise<void> {
  try {
    await rpc('toneturn_snapshot_put', { p_day: s.day, p_data: s });
  } catch {
    /* offline or signed out: the next day's push carries on */
  }
}

/** The teacher: every member's snapshots from a day on, grouped by student. */
export async function classSnapshots(classId: string, from: string): Promise<Record<string, Record<string, Snapshot>>> {
  const rows = (await rpc<{ user_id: string; day: string; data: Snapshot }[]>('toneturn_class_snapshots', { p_class: classId, p_from: from })) ?? [];
  const out: Record<string, Record<string, Snapshot>> = {};
  for (const r of rows) (out[r.user_id] ??= {})[r.day] = { ...r.data, day: r.day };
  return out;
}

/** The teacher's switch: show students the anonymous class median. */
export const setClassMedian = (classId: string, on: boolean) => rpc<void>('toneturn_class_set_median', { p_class: classId, p_on: on });

/** The teacher: is the switch on (the class settings show it)? False when unknown. */
export async function classMedianOn(classId: string): Promise<boolean> {
  try {
    return !!(await rpc<boolean>('toneturn_class_median_on', { p_class: classId }));
  } catch {
    return false;
  }
}

/** A student: the class median per day (only when the teacher turned it on; 3+ students). */
export async function classMedian(classId: string, from: string): Promise<{ day: string; tempo: number; minutes: number }[]> {
  try {
    return ((await rpc<{ day: string; tempo: number; minutes: number }[]>('toneturn_class_median', { p_class: classId, p_from: from })) ?? []).map((r) => ({ day: r.day, tempo: r.tempo, minutes: r.minutes }));
  } catch {
    return [];
  }
}

/**
 * The parent digest (SPEC-PROGRESS-CHARTS §4.2, the simple version): the student's daily summaries behind a digest
 * link, read without signing in. Needs the snapshot migration's digest RPC (SNAPSHOTS_SYNCED); until then empty.
 */
export async function digestSnapshots(token: string, from: string): Promise<Record<string, Snapshot>> {
  try {
    const rows = (await rpc<{ day: string; data: Snapshot }[]>('toneturn_digest_snapshots', { p_token: token, p_from: from })) ?? [];
    return Object.fromEntries(rows.map((r) => [r.day, { ...r.data, day: r.day }]));
  } catch {
    return {};
  }
}

// Progress snapshots in the cloud (docs/SPEC-PROGRESS-CHARTS.md §1, §4, §6): the player's daily summary syncs so a
// teacher can chart their class; the teacher's switch shows students an anonymous class median.
// Needs migration 20261208000000_toneturn_progress_snapshots.sql — set SNAPSHOTS_SYNCED = true once the owner has
// applied it. Until then every call is a no-op (local snapshots keep building up on the device).

import { supabase } from './cloud';
import type { Snapshot } from '../engine/snapshot';

export const SNAPSHOTS_SYNCED = false; // migration 20261208000000 — NOT APPLIED yet

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
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

/** A student: the class median per day (only when the teacher turned it on; 3+ students). */
export async function classMedian(classId: string, from: string): Promise<{ day: string; tempo: number; minutes: number }[]> {
  try {
    return ((await rpc<{ day: string; tempo: number; minutes: number }[]>('toneturn_class_median', { p_class: classId, p_from: from })) ?? []).map((r) => ({ day: r.day, tempo: r.tempo, minutes: r.minutes }));
  } catch {
    return [];
  }
}

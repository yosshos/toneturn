// Calibration uploads (SPEC-PRACTICE-INTELLIGENCE §9, owner 2026-11-27): an account the server marks as a calibration
// account sends its take traces (storage/takeTraces.ts) to the server, the ones not sent yet, in batches. Every other
// account sends nothing: the server says no once a session and the client stops asking.

import { supabase } from './cloud';
import { loadTraces } from '../storage/takeTraces';
import type { TakeTrace } from '../engine/drills/tendency';

const SENT_KEY = 'tt.calibSentAt';
const BATCH = 200;
let enabled: Promise<boolean> | null = null;
let running: Promise<number> | null = null;

const sentAt = (): string => {
  try {
    return localStorage.getItem(SENT_KEY) ?? '';
  } catch {
    return '';
  }
};
const markSent = (at: string) => {
  try {
    localStorage.setItem(SENT_KEY, at);
  } catch {
    /* private mode: the server ignores duplicates */
  }
};

/** The traces after `since` (by time), oldest first. Pure. */
export function unsent(list: TakeTrace[], since: string): TakeTrace[] {
  return list.filter((t) => t.at > since).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/** Send the traces not sent yet (a calibration account only). Resolves to how many the server took. */
export function syncCalibTraces(): Promise<number> {
  if (running) return running;
  running = (async () => {
    const sb = supabase();
    if (!sb) return 0;
    const { data: s } = await sb.auth.getSession();
    if (!s.session) return 0;
    if (!enabled) enabled = Promise.resolve(sb.rpc('toneturn_calib_enabled')).then((r) => r.data === true, () => false);
    if (!(await enabled)) return 0;
    const todo = unsent(await loadTraces(), sentAt());
    let took = 0;
    for (let i = 0; i < todo.length; i += BATCH) {
      const part = todo.slice(i, i + BATCH);
      const { data, error } = await sb.rpc('toneturn_calib_upload', { p_traces: part });
      if (error) break;
      took += typeof data === 'number' ? data : 0;
      markSent(part[part.length - 1].at);
    }
    return took;
  })()
    .catch(() => 0)
    .finally(() => {
      running = null;
    });
  return running;
}

/** Signed out / another account: ask the server again. */
export function resetCalibUpload(): void {
  enabled = null;
}

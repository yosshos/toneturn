// Crash chokes (DRUMS_NICHE_PLAN §6.3 F9 L7, the `d-fills` 6 anticipations): the crash on the "&" of 4 is grabbed so
// the next 1 is silent. E-kits that measure it send polyphonic key pressure (0xA0) on the cymbal's note while the edge
// is held (Roland; several others), some send nothing. So the choke is measured only when the kit sent at least one
// during the take; a kit that sends none is never failed for it (the result says it was not measured).
// Pure: the take's choke onsets (ms from beat 0, latency removed) against the goal.

import type { Drill, TakeMetrics } from './types';
import { expTimeMs } from './analyze';

/** A choke counts from this long after the crash (a grab right on the stroke is the same motion, not yet a choke). */
const AFTER_MS = 60;
/** …and up to this long after the `by` beat. */
const LATE_MS = 80;
/** Pressure messages closer than this are one grab (a held edge sends a stream). */
const SAME_GRAB_MS = 150;

/** Collapse a stream of pressure messages (ms, sorted or not) into grab onsets. */
export function chokeOnsets(times: number[]): number[] {
  const out: number[] = [];
  for (const x of [...times].filter(Number.isFinite).sort((a, b) => a - b)) if (!out.length || x - out[out.length - 1] > SAME_GRAB_MS) out.push(x);
  return out;
}

export function chokeCheck(drill: Drill, bpm: number, times: number[]): { ok: number; of: number; measured: boolean } | null {
  const goal = drill.goal.drum?.choke;
  if (!goal) return null;
  const on = chokeOnsets(times);
  const of = goal.beats.length;
  if (!on.length) return { ok: 0, of, measured: false };
  const ok = goal.beats.filter((b) => {
    const a = expTimeMs(drill, b, bpm) + AFTER_MS;
    const z = expTimeMs(drill, b + goal.by, bpm) + LATE_MS;
    return on.some((x) => x >= a && x <= z);
  }).length;
  return { ok, of, measured: true };
}

/** The take with its choke measured: a missed choke keeps a clean take at "almost" (it never fails a take alone). */
export function withChoke(m: TakeMetrics, drill: Drill, bpm: number, times: number[]): TakeMetrics {
  const c = chokeCheck(drill, bpm, times);
  if (!c || !m.drum) return m;
  const out: TakeMetrics = { ...m, drum: { ...m.drum, choke: c } };
  if (c.measured && c.ok < c.of && m.verdict === 'clean') {
    out.verdict = 'almost';
    out.why = { en: `Choke the crash before the next 1 (${c.ok}/${c.of}).`, he: `תפסו את הקראש לפני ה-1 הבא (${c.ok}/${c.of}).` };
  }
  return out;
}

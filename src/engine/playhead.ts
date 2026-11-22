// The staff playhead (owner 2026-11-13): it glides through each note in the note's own time and stands on the notehead
// when the note is due. Pure.

import type { Drill } from './drills/types';
import { hasTimeline, timeMapOf } from './drills/timeline';
import { expTimeMs } from './drills/analyze';

/** The beat the cursor stops on: the last written onset (it never runs on past the last note to the line's end). */
export function cursorStop(drill: Pick<Drill, 'notes' | 'beats'>): number {
  let m = -Infinity;
  for (const n of drill.notes) if (n.beat > m) m = n.beat;
  return Number.isFinite(m) ? m : Math.max(0, drill.beats);
}

/**
 * A beat computed in a frame's callback reaches the screen a frame later (React commits the state after that frame is
 * painted): the cursor is computed for the moment it will be seen, one frame ahead (it measured ~18 ms behind at 60 Hz,
 * more on a busy phone). `frameLead()` keeps a running frame length: call it with each frame's time, it returns the lead.
 */
export function frameLead(): (now: number) => number {
  let last = 0;
  let frame = 16.7;
  return (now: number) => {
    const d = now - last;
    last = now;
    // a hidden tab or a stall is not a frame length
    if (d > 4 && d < 100) frame += (Math.min(50, Math.max(6, d)) - frame) * 0.2;
    return frame;
  };
}

type Clocked =Pick<Drill, 'notes' | 'beats' | 'spec' | 'meter' | 'pulse' | 'groups' | 'meters' | 'tempoMap'>;

/** Heard beat (on the drill's time map) of a moment `ms` after beat 0. */
const heardBeat = (drill: Clocked, bpm: number, ms: number): number => (hasTimeline(drill) ? timeMapOf(drill, bpm).beatAt(ms) : (ms * bpm) / 60000);

const tables = new WeakMap<object, Map<number, { heard: number[]; written: number[] }>>();
/** Each written onset with the heard beat it sounds on (expTimeMs: swung 8ths at 2/3, the tempo map), in order. */
function onsetTable(drill: Clocked, bpm: number): { heard: number[]; written: number[] } {
  let by = tables.get(drill);
  if (!by) tables.set(drill, (by = new Map()));
  const hit = by.get(bpm);
  if (hit) return hit;
  const ws = [...new Set(drill.notes.map((n) => Math.round(n.beat * 1e6) / 1e6))].sort((a, b) => a - b);
  const heard: number[] = [];
  const written: number[] = [];
  for (const w of ws) {
    const h = heardBeat(drill, bpm, expTimeMs(drill as Drill, w, bpm));
    // a written order the clock can't keep (never in practice) would turn the cursor back: keep it monotonic
    if (heard.length && h <= heard[heard.length - 1] + 1e-9) continue;
    heard.push(h);
    written.push(w);
  }
  const t = { heard, written };
  by.set(bpm, t);
  return t;
}

/**
 * Owner 2026-11-22 (the cursor ran past the line and off the tempo): the written beat the cursor shows `ms` after the
 * take's beat 0 is heard — a pure function of the audio clock, never of when a timer happened to fire. Each written
 * onset is reached exactly when it sounds (the grading's own expTimeMs: the drill's tempo map and mixed meters, swung
 * 8ths at 2/3 of the beat), gliding linearly between onsets; it stops on the last note (never on to the line's end).
 * Negative before beat 0 (the count-in, in beats).
 */
export function cursorBeatAt(drill: Clocked, bpm: number, ms: number): number {
  const b = Math.max(1, bpm);
  const h = heardBeat(drill, b, ms);
  if (h < 0) return h;
  const { heard, written } = onsetTable(drill, b);
  if (!heard.length) return Math.min(h, cursorStop(drill));
  if (h >= heard[heard.length - 1]) return written[written.length - 1];
  if (h <= heard[0]) return Math.min(h * (written[0] / Math.max(1e-9, heard[0])) || 0, written[0]);
  let lo = 0;
  let hi = heard.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (heard[mid] <= h) lo = mid;
    else hi = mid;
  }
  return written[lo] + ((h - heard[lo]) / (heard[hi] - heard[lo])) * (written[hi] - written[lo]);
}

/**
 * The now-cue on a staff / tab line (owner 2026-11-13: "it moves at a varying pace and spacing, like other programs").
 * `now` is fractional: i + f = a share f of the way from item i to the next one (the last item heads for the line's
 * end), so the line glides through each note in the note's own time and stands on the notehead when the note is due.
 * `xs`: each drawn item's notehead centre as a share of the width, then the line's end.
 */
export function nowX(xs: number[], now: number): number | null {
  if (!(now >= 0) || xs.length < 2) return null;
  const i = Math.min(Math.floor(now), xs.length - 2);
  const f = Math.min(1, Math.max(0, now - i));
  const a = xs[i];
  const b = xs[i + 1] ?? a;
  return a + (b - a) * f;
}

/**
 * The fractional now-cue position from real start times: `ats` = each drawn item's start, `end` = the line's end (same
 * unit as `cur`). −1 before the first item. A note lights a hair early (20 ms-ish) so it is on the head as it sounds.
 */
export function glidePos(ats: number[], end: number, cur: number): number {
  let k = -1;
  for (let i = 0; i < ats.length; i++) if (ats[i] <= cur + 0.02) k = i;
  if (k < 0) return -1;
  const a = ats[k];
  const b = ats[k + 1] ?? end;
  return b - a > 1e-6 ? k + Math.min(1, Math.max(0, (cur - a) / (b - a))) : k;
}

// The live singing feed (docs/research/VOICE-FEEDBACK-UI.md §4.11.6): frames go into a buffer held outside React;
// the lane draws from it in one requestAnimationFrame loop and the read-outs sample it at 4–10 Hz. React state
// changes only for discrete events (phase, note change), never once per frame.

import { DisplaySmoother, NoteNamer, octaveFold, type DisplayPoint } from '../engine/pitchDisplay';
import type { SungFrame } from '../engine/sing';
import type { TrackPoint } from '../engine/vocal';

/** One target of the lane: timed (a block from `start` for `dur` s) or untimed (a band across the whole lane). */
export interface LaneTarget {
  midi: number;
  start?: number;
  dur?: number;
  /** A "money note": double outline; the vibrato and stability read-outs belong to it. */
  golden?: boolean;
}

export class SingFeed {
  frames: SungFrame[] = [];
  pts: DisplayPoint[] = [];
  /** The note the readout shows (hysteresis), null = silence. */
  shown: number | null = null;
  /** Time of the first voiced point (onset), or null. */
  onset: number | null = null;
  /** Display delay correction (s): the mic's input latency on timed takes. */
  latency = 0;
  version = 0;
  /** Bumped on every reset (a new take): drawers drop their caches. */
  epoch = 0;
  private sm = new DisplaySmoother();
  private namer = new NoteNamer();
  private lastWall = 0;
  /** performance.now() of t = 0 when known (timed takes: the first beat), for the clock before any frame. */
  zeroWall: number | null = null;

  reset() {
    this.frames = [];
    this.pts = [];
    this.shown = null;
    this.onset = null;
    this.sm.reset();
    this.namer.reset();
    this.zeroWall = null;
    this.lastWall = 0;
    this.version++;
    this.epoch++;
  }

  push(f: SungFrame) {
    this.frames.push(f);
    const p = this.sm.push(this.latency ? { ...f, t: f.t - this.latency } : f);
    this.pts.push(p);
    if (p.m !== null && this.onset === null) this.onset = p.t;
    this.shown = this.namer.push(p.t, p.m);
    this.lastWall = typeof performance !== 'undefined' ? performance.now() : 0;
    this.version++;
  }

  /** Replace the buffer with a finished take (the review). */
  load(frames: SungFrame[]) {
    const keep = this.zeroWall;
    this.reset();
    this.zeroWall = keep;
    for (const f of frames) this.push(f);
    this.lastWall = 0;
  }

  /** The lane's "now" (s): the last point plus the wall time since (capped), or the clock before any frame. */
  now(): number {
    const wall = typeof performance !== 'undefined' ? performance.now() : 0;
    const last = this.pts[this.pts.length - 1];
    if (this.zeroWall !== null) {
      const clock = (wall - this.zeroWall) / 1000 - this.latency;
      // Frames lead when the clock is unknown or late; never run more than 0.15 s past the last frame.
      if (!last) return clock;
      return Math.max(last.t, Math.min(clock, last.t + 0.15));
    }
    if (!last) return 0;
    return last.t + Math.min(0.15, this.lastWall ? (wall - this.lastWall) / 1000 : 0);
  }

  /** The last display point if it is fresh and voiced. */
  last(): DisplayPoint | null {
    const p = this.pts[this.pts.length - 1];
    return p && p.m !== null ? p : null;
  }

  /** Cents track (guarded, unsmoothed, octave-folded) against a target, from `from` s on. */
  track(target: number, from = -Infinity): TrackPoint[] {
    const out: TrackPoint[] = [];
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i];
      if (p.g === null || p.t < from || p.bridged) continue;
      const g = p.g + octaveFold(p.g, target);
      out.push({ t: p.t, c: (g - target) * 100, rms: this.frames[i]?.rms ?? 0 });
    }
    return out;
  }
}

/**
 * The target that counts at time `t` for a pitch `m`: the timed block under `t` (or the next one within 0.25 s,
 * else the last one begun), or the nearest untimed band by pitch.
 */
export function targetAt(targets: LaneTarget[], t: number, m: number | null): LaneTarget | null {
  if (!targets.length) return null;
  const timed = targets.filter((x) => x.start !== undefined);
  if (timed.length) {
    const on = timed.find((x) => t >= x.start! && t < x.start! + (x.dur ?? 0.5));
    if (on) return on;
    const soon = timed.find((x) => x.start! > t && x.start! - t <= 0.25);
    if (soon) return soon;
    const begun = timed.filter((x) => x.start! <= t);
    return begun.length ? begun[begun.length - 1] : timed[0];
  }
  if (m === null || targets.length === 1) return targets[0];
  let best = targets[0];
  for (const x of targets) {
    const d = Math.abs(m + octaveFold(m, x.midi) - x.midi);
    const bd = Math.abs(m + octaveFold(m, best.midi) - best.midi);
    if (d < bd) best = x;
  }
  return best;
}

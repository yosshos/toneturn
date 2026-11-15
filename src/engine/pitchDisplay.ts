// Display smoothing for the live singing view (docs/research/VOICE-FEEDBACK-UI.md §4.11). Pure, no DOM.
// Raw detector frames → a steady, honest line: confidence gate with a short grace, an octave / fifth guard,
// a 3-frame median, then an adaptive (One-Euro style) low-pass that steadies held notes, follows leaps at once
// and leaves vibrato alone. DISPLAY ONLY: grading keeps reading the raw frames (gradeTake).

import type { SungFrame } from './sing';
import { hzToMidi } from './pitch';

export interface DisplayPoint {
  /** Seconds (the frame's own clock). */
  t: number;
  /** Smoothed pitch (fractional MIDI) for drawing; null = silence (break the line here). */
  m: number | null;
  /** Guarded + median pitch, not low-passed (steadiness and cents read from this). */
  g: number | null;
  /** The frame was a weak one bridged by the grace window. */
  bridged?: boolean;
}

export interface SmootherOpts {
  minConf?: number;
  /** Weak frames inside a voiced run are bridged for this long (s) before the line breaks. */
  graceSec?: number;
  /** One-Euro: cutoff (Hz) when the pitch is still. */
  minCutoff?: number;
  /** One-Euro: how fast the cutoff opens with speed (per cent/s). */
  beta?: number;
  /** One-Euro: cutoff (Hz) of the speed estimate. */
  dCutoff?: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

/**
 * A stateful smoother: push raw frames in order, get one display point per frame.
 * The speed estimate filters |Δ| (not the signed Δ), so a steady vibrato keeps the filter open (its average
 * speed is high) while a held straight tone lets it close.
 */
export class DisplaySmoother {
  private o: Required<SmootherOpts>;
  private hist: number[] = []; // last accepted (guarded) pitches, for the octave guard
  private pending: { shift: number; n: number } | null = null;
  private med: number[] = []; // median-3 window
  private lastVoicedT = -Infinity;
  private lastG: number | null = null;
  private x: number | null = null; // filtered value (cents)
  private dx = 0; // filtered speed |Δ| (cents/s)
  private lastT: number | null = null;

  constructor(o: SmootherOpts = {}) {
    this.o = { minConf: 0.8, graceSec: 0.06, minCutoff: 1.5, beta: 0.02, dCutoff: 1, ...o };
  }

  reset() {
    this.hist = [];
    this.pending = null;
    this.med = [];
    this.lastVoicedT = -Infinity;
    this.lastG = null;
    this.x = null;
    this.dx = 0;
    this.lastT = null;
  }

  push(f: SungFrame): DisplayPoint {
    const voiced = !!f.hz && f.confidence >= this.o.minConf;
    if (!voiced) {
      // Grace: a weak frame or two inside a run is a consonant, not a break.
      if (this.lastG !== null && f.t - this.lastVoicedT <= this.o.graceSec + 1e-9) return { t: f.t, m: this.x === null ? null : this.x / 100, g: this.lastG, bridged: true };
      this.breakLine();
      return { t: f.t, m: null, g: null };
    }
    let m = hzToMidi(f.hz!);
    // A long silence starts a new line (and a new history: a real new note may sit anywhere).
    if (f.t - this.lastVoicedT > 0.35) this.breakLine(true);
    m = this.guard(m, f.confidence);
    this.lastVoicedT = f.t;
    this.med.push(m);
    if (this.med.length > 3) this.med.shift();
    const g = this.med.length === 3 ? median(this.med) : m;
    this.lastG = g;
    const c = g * 100;
    const dt = this.lastT === null ? 0.02 : Math.max(0.005, f.t - this.lastT);
    this.lastT = f.t;
    if (this.x === null) {
      this.x = c;
      this.dx = 0;
    } else {
      const speed = Math.abs(c - this.x) / dt;
      this.dx += alpha(this.o.dCutoff, dt) * (speed - this.dx);
      // A real move (> 60 ¢ from the line) opens the filter at once: no lag on leaps.
      const cutoff = this.o.minCutoff + this.o.beta * Math.max(this.dx, Math.abs(c - this.x) > 60 ? speed : 0);
      this.x += alpha(cutoff, dt) * (c - this.x);
    }
    return { t: f.t, m: this.x / 100, g };
  }

  private breakLine(hard = false) {
    this.med = [];
    this.x = null;
    this.dx = 0;
    this.lastT = null;
    this.lastG = null;
    if (hard) {
      this.hist = [];
      this.pending = null;
    }
  }

  /** Octave (±1200 ¢) and, on weak frames, fifth (±700 ¢) errors fold back unless 3 frames in a row agree. */
  private guard(m: number, conf: number): number {
    if (this.hist.length < 3) {
      this.accept(m);
      return m;
    }
    const ref = median(this.hist);
    const d = m - ref;
    let shift = 0;
    for (const s of [12, -12, 24, -24]) if (Math.abs(d - s) <= 0.8) shift = s;
    if (!shift && conf < 0.9) for (const s of [7, -7, 19, -19]) if (Math.abs(d - s) <= 0.8) shift = s;
    if (!shift) {
      this.pending = null;
      this.accept(m);
      return m;
    }
    if (this.pending && this.pending.shift === shift) this.pending.n++;
    else this.pending = { shift, n: 1 };
    if (this.pending.n >= 3) {
      // A real leap: the new register wins; rebuild the history there.
      this.hist = [m, m, m];
      this.pending = null;
      return m;
    }
    return m - shift;
  }

  private accept(m: number) {
    this.hist.push(m);
    if (this.hist.length > 5) this.hist.shift();
  }
}

/** Smooth a whole take for drawing (the review and tests). */
export function smoothTrack(frames: SungFrame[], o?: SmootherOpts): DisplayPoint[] {
  const s = new DisplaySmoother(o);
  return frames.map((f) => s.push(f));
}

/**
 * The note-name readout without flicker: the shown note changes only when a new note has held ≥ 80 ms AND sits
 * more than 60 ¢ from the shown note's centre. Silence shows null ("–") after `silenceSec`.
 */
export class NoteNamer {
  private shown: number | null = null;
  private cand: number | null = null;
  private candSince = 0;
  private lastVoiced = -Infinity;
  constructor(
    private holdSec = 0.08,
    private awayCents = 60,
    private silenceSec = 0.15,
  ) {}
  reset() {
    this.shown = null;
    this.cand = null;
    this.lastVoiced = -Infinity;
  }
  /** Feed one display point (fractional MIDI or null); returns the whole note to show, or null. */
  push(t: number, m: number | null): number | null {
    if (m === null) {
      if (t - this.lastVoiced > this.silenceSec) {
        this.shown = null;
        this.cand = null;
      }
      return this.shown;
    }
    this.lastVoiced = t;
    const n = Math.round(m);
    if (this.shown === null) {
      // From silence, a note shows as soon as it holds briefly (no centre to be away from).
      if (this.cand !== n) {
        this.cand = n;
        this.candSince = t;
      }
      if (t - this.candSince >= this.holdSec - 1e-9) this.shown = n;
      return this.shown;
    }
    if (Math.abs(m - this.shown) * 100 <= this.awayCents) {
      this.cand = null;
      return this.shown;
    }
    if (this.cand !== n) {
      this.cand = n;
      this.candSince = t;
    }
    if (t - this.candSince >= this.holdSec - 1e-9) {
      this.shown = n;
      this.cand = null;
    }
    return this.shown;
  }
}

// ------------------------------------------------------------------ colour states (§4.10)

export type ZoneState = 'in' | 'close-sharp' | 'close-flat' | 'sharp' | 'flat' | 'none';

/** Where a pitch sits against the zone: in (≤ tol), close (≤ 50 ¢), or out, with its side. */
export function zoneState(cents: number | null, tol: number): ZoneState {
  if (cents === null || !Number.isFinite(cents)) return 'none';
  const a = Math.abs(cents);
  if (a <= tol) return 'in';
  if (a <= 50) return cents > 0 ? 'close-sharp' : 'close-flat';
  return cents > 0 ? 'sharp' : 'flat';
}

/** The colour token and the shape twin of each state (colour never carries meaning alone). */
export const ZONE_LOOK: Record<ZoneState, { color: 'teal' | 'teal-hatch' | 'tangerine' | 'purple' | 'none'; mark: '✓' | '▲' | '▼' | '' }> = {
  in: { color: 'teal', mark: '✓' },
  'close-sharp': { color: 'teal-hatch', mark: '▲' },
  'close-flat': { color: 'teal-hatch', mark: '▼' },
  sharp: { color: 'tangerine', mark: '▲' },
  flat: { color: 'purple', mark: '▼' },
  none: { color: 'none', mark: '' },
};

/** Rounded to 5 ¢ for the chip (the needle keeps the fine value). */
export const chipCents = (c: number) => Math.round(c / 5) * 5;

/** The fold that brings a sung pitch to the target's octave (±12k), for drawing a right-note-other-octave. */
export function octaveFold(m: number, target: number): number {
  return Math.round((target - m) / 12) * 12;
}

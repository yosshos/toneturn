// Bleed gate: while the app itself is sounding (a drone, a chord, a guide melody), the microphone also
// hears that sound. Without headphones the pitch detector could take the drone for the singer. The gate
// learns the room level of the app's own sound during a short calibration (the player waits, the
// sound plays), then drops frames that sit on a sounding pitch (±35 ¢, exact octave) unless they are
// clearly louder than that leak, and frames that are no louder than the room at all. Pure.

import { midiToHz } from './pitch';
import type { SungFrame } from './sing';

export const CALIBRATE_SEC = 0.6;

export class BleedGate {
  /** Loudness of the app's own sound at the microphone (RMS), learned during calibration. */
  leak = 0;
  private cal: number[] = [];
  private calibrated = false;

  constructor(
    /** MIDI notes the app is sounding while the player sings. */
    public playing: number[],
    private opts: { nearCents?: number; loudFactor?: number; floorFactor?: number } = {},
  ) {}

  /** Feed calibration frames (the player is silent, the app sound is playing). */
  calibrate(f: SungFrame) {
    this.cal.push(f.rms);
  }

  finishCalibration() {
    const xs = this.cal.slice().sort((a, b) => a - b);
    // A high percentile: the loudest the leak gets, not a single spike.
    this.leak = xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.9))] : 0;
    this.calibrated = true;
  }

  get ready() {
    return this.calibrated;
  }

  /** Is this frame (probably) the app's own sound? */
  isBleed(f: SungFrame): boolean {
    if (!f.hz) return false;
    const near = this.opts.nearCents ?? 35;
    const onPlaying = this.playing.some((m) => Math.abs(1200 * Math.log2(f.hz! / midiToHz(m))) <= near);
    const leak = Math.max(this.leak, 1e-4);
    if (onPlaying && f.rms < leak * (this.opts.loudFactor ?? 2.5)) return true;
    // No louder than the room: not a voice (whatever pitch the detector found in the leak).
    if (this.calibrated && f.rms < leak * (this.opts.floorFactor ?? 1.3)) return true;
    return false;
  }

  /** The frame with its pitch removed when it is bleed (so later stages see "no voice"). */
  pass(f: SungFrame): SungFrame {
    return this.isBleed(f) ? { ...f, hz: null, confidence: 0 } : f;
  }
}

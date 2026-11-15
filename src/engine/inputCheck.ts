// Input check (owner 2026-11-15): before an exercise starts, the player makes a sound or presses a key and SEES that
// the signal arrives — nobody starts a take and only then finds out nothing was picked up. The pure parts: the level
// meter's mapping, the "got it" detector, the hint after a quiet wait, the in-take watchdog, and a tiny input bus that
// the shared capture plumbing (mic frames, MIDI notes) pulses so the watchdog needs no per-screen wiring.

/** What the exercise listens to. */
export type InputCheckMode = 'mic' | 'midi' | 'drum-mic' | 'drum-midi';

export const isMidiMode = (m: InputCheckMode) => m === 'midi' || m === 'drum-midi';
export const isDrumMode = (m: InputCheckMode) => m === 'drum-mic' || m === 'drum-midi';

/** Bars in the level meter. */
export const METER_BARS = 8;
/** The meter's floor and ceiling (dBFS of the frame RMS): below the floor no bar, at the ceiling all bars. */
export const METER_FLOOR_DB = -60;
export const METER_CEIL_DB = -12;

/** Frame RMS (0..1) → dBFS (−∞ clamped to −120). */
export const rmsDb = (rms: number) => (rms > 1e-6 ? 20 * Math.log10(rms) : -120);

/** Frame RMS → meter fill 0..1 (linear in dB between the floor and the ceiling). */
export function meterLevel(rms: number): number {
  const db = rmsDb(rms);
  return Math.max(0, Math.min(1, (db - METER_FLOOR_DB) / (METER_CEIL_DB - METER_FLOOR_DB)));
}

/** Frame RMS → lit bars (0..METER_BARS). Any audible sound lights at least one bar. */
export function meterBars(rms: number, bars = METER_BARS): number {
  const l = meterLevel(rms);
  if (l <= 0) return 0;
  return Math.max(1, Math.min(bars, Math.round(l * bars)));
}

/** A frame for the detector: time (ms), pitch (Hz or null), YIN confidence, RMS. */
export interface CheckFrame {
  t: number;
  hz: number | null;
  confidence: number;
  rms: number;
}

/** "Got it" thresholds. A pitched sound: confidence ≥ 0.85, louder than −46 dBFS, held ≥ 120 ms on one semitone. */
export const GOT_CONF = 0.85;
export const GOT_MIN_RMS = 0.005;
export const GOT_HOLD_MS = 120;
/** A drum onset by mic: RMS ≥ 0.02 and ≥ 2.5× the quiet floor of the last ~300 ms. */
export const HIT_MIN_RMS = 0.02;
export const HIT_RATIO = 2.5;
const HIT_FLOOR_MS = 300;
const HIT_REFRACTORY_MS = 90;

const midiOfHz = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440));

/**
 * Feeds microphone frames; says when a clear signal has arrived. Pitched mode: a steady pitch held GOT_HOLD_MS.
 * Drum mode: an energy onset (a hit) over the recent floor. `peak` keeps the loudest RMS seen (for the hint).
 */
export class SignalDetector {
  gotIt = false;
  peak = 0;
  /** The pitch being held (MIDI), null when none. */
  note: number | null = null;
  private cand: number | null = null;
  private since = 0;
  private recent: { t: number; rms: number }[] = [];
  private lastHit = -Infinity;
  constructor(private drums = false) {}

  /** Returns 'hit' on a drum onset, 'note' when a pitched note is (still) held, null otherwise. */
  feed(f: CheckFrame): 'hit' | 'note' | null {
    this.peak = Math.max(this.peak, f.rms);
    if (this.drums) {
      const floorFrames = this.recent.filter((r) => r.t >= f.t - HIT_FLOOR_MS);
      const floor = floorFrames.length ? Math.min(...floorFrames.map((r) => r.rms)) : 0;
      this.recent.push({ t: f.t, rms: f.rms });
      while (this.recent.length && this.recent[0].t < f.t - HIT_FLOOR_MS) this.recent.shift();
      if (f.rms >= HIT_MIN_RMS && f.rms >= HIT_RATIO * Math.max(floor, 0.002) && f.t - this.lastHit > HIT_REFRACTORY_MS) {
        this.lastHit = f.t;
        this.gotIt = true;
        return 'hit';
      }
      return null;
    }
    if (!f.hz || f.confidence < GOT_CONF || f.rms < GOT_MIN_RMS) {
      this.cand = null;
      this.note = null;
      return null;
    }
    const m = midiOfHz(f.hz);
    if (m !== this.cand) {
      this.cand = m;
      this.since = f.t;
      return null;
    }
    if (f.t - this.since >= GOT_HOLD_MS) {
      this.note = m;
      this.gotIt = true;
      return 'note';
    }
    return null;
  }
}

/** The quiet wait before a hint shows. */
export const HINT_AFTER_MS = 4000;
/** Below this peak RMS nothing reached the microphone at all (≈ −54 dBFS): a device / mute problem, not volume. */
export const SILENT_PEAK = 0.002;

export type InputHint = 'permission' | 'device' | 'volume' | 'plug' | 'midi-device' | 'unsupported' | null;

/**
 * The hint for a check that has not heard anything yet. `error`: the microphone failed to open (an AccessError code);
 * `elapsed`: ms since the check started listening; `peak`: the loudest frame RMS; `devices`: MIDI inputs connected.
 */
export function hintFor(o: { mode: InputCheckMode; gotIt: boolean; elapsed: number; error?: string | null; peak?: number; devices?: number; midiSupported?: boolean }): InputHint {
  if (o.gotIt) return null;
  if (!isMidiMode(o.mode) && o.error) {
    if (o.error === 'permission-denied' || o.error === 'os-blocked' || o.error === 'insecure-context' || o.error === 'iframe-policy') return 'permission';
    if (o.error === 'unsupported') return 'unsupported';
    return 'device';
  }
  if (isMidiMode(o.mode)) {
    if (o.midiSupported === false) return 'unsupported';
    // No device at all: say so at once (nothing will ever arrive).
    if (!o.devices) return o.elapsed >= 600 ? 'plug' : null;
    return o.elapsed >= HINT_AFTER_MS ? 'midi-device' : null;
  }
  if (o.elapsed < HINT_AFTER_MS) return null;
  return (o.peak ?? 0) < SILENT_PEAK ? 'device' : 'volume';
}

/** The watchdog's wait: no input this long after the first expected note → "We don't hear you". */
export const WATCHDOG_MS = 3000;

/**
 * Whether the in-take watchdog shows. `firstDueAt`: performance time the first note was expected (null = not yet
 * known); `lastInputAt`: the last input pulse (−Infinity = none); `takeStartAt`: when the take began listening.
 * Shows only when nothing at all arrived since the take began and WATCHDOG_MS passed after the first expected note.
 */
export function watchdogDue(now: number, firstDueAt: number | null, lastInputAt: number, takeStartAt: number, quietMs = WATCHDOG_MS): boolean {
  if (firstDueAt === null) return false;
  if (lastInputAt >= takeStartAt) return false;
  return now - firstDueAt >= quietMs;
}

/** RMS of a frame that counts as an input pulse for the watchdog (a played or sung note, a hit). */
export const PULSE_RMS = 0.012;
/** Whether a mic frame is input (not room noise): a confident pitch, or a loud frame. */
export const isPulseFrame = (f: { hz: number | null; confidence: number; rms: number }) => (!!f.hz && f.confidence >= GOT_CONF && f.rms >= GOT_MIN_RMS) || f.rms >= PULSE_RMS * 2;

// ------------------------------------------------------------------ input bus

type PulseListener = (at: number, src: 'mic' | 'midi') => void;
const pulseListeners = new Set<PulseListener>();
let lastPulse = -Infinity;

/** Called by the capture plumbing on every input event (a MIDI note-on, a mic frame with a clear signal). */
export function notifyInput(src: 'mic' | 'midi', at: number = typeof performance !== 'undefined' ? performance.now() : Date.now()) {
  lastPulse = at;
  pulseListeners.forEach((l) => l(at, src));
}
export const lastInputAt = () => lastPulse;
export function onInput(cb: PulseListener) {
  pulseListeners.add(cb);
  return () => {
    pulseListeners.delete(cb);
  };
}
/** Tests: forget the last pulse. */
export const resetInputBus = () => {
  lastPulse = -Infinity;
};

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
/** MIDI note → "A4" (the app's spelling: sharps for C♯ / F♯, flats elsewhere). */
export const noteLabel = (m: number) => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

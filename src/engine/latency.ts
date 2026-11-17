// Input latency calibration (owner, 2026-11-07): the player plays along with clicks on the input they use (screen
// tap, MIDI key, microphone); the median offset is that input's delay, removed from every timing judgement. Pure.

export type LatencySource = 'tap' | 'midi' | 'mic';

export interface LatencyResult {
  /** Median offset (ms, + = the input arrives late). */
  ms: number;
  /** Spread of the offsets (ms): a large spread means the take was not steady enough to trust. */
  sd: number;
  /** Onsets used. */
  n: number;
  /** Steady enough to save (n ≥ 6 and sd ≤ 35 ms). */
  ok: boolean;
}

/** Offsets of onsets from the nearest click after the first `skip` clicks (warm-up), within ±40 % of a beat. */
export function latencyFrom(firstMs: number, onsetsMs: number[], bpm: number, skip = 4): LatencyResult | null {
  const beat = 60000 / bpm;
  const offs: number[] = [];
  const used = new Set<number>();
  for (const t of onsetsMs) {
    const rel = t - firstMs;
    const k = Math.round(rel / beat);
    if (k < skip || used.has(k)) continue;
    const off = rel - k * beat;
    if (Math.abs(off) >= beat * 0.4) continue;
    used.add(k);
    offs.push(off);
  }
  if (offs.length < 4) return null;
  const sorted = [...offs].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  // Spread around the median, ignoring the single worst onset (one stray hit should not fail the take).
  const devs = offs.map((o) => Math.abs(o - med)).sort((a, b) => a - b);
  const kept = devs.slice(0, Math.max(1, devs.length - 1));
  const sd = Math.sqrt(kept.reduce((a, d) => a + d * d, 0) / kept.length);
  return { ms: Math.round(med), sd: Math.round(sd), n: offs.length, ok: offs.length >= 6 && sd <= 35 };
}

/** MIDI input itself arrives within a few ms of the key (USB MIDI ≈ 1–5 ms). */
export const MIDI_IN_MS = 3;
/** A play-along median later than this is no human habit (people anticipate a click, they don't lag it by 60 ms). */
export const DEVICE_ONLY_ABOVE = 60;

export interface LatencySplit {
  /** The delay to remove from every timing judgement (ms). */
  deviceMs: number;
  /** The player's own steady early (−) / late (+) habit, reported and never removed; null when it can't be told apart. */
  biasMs: number | null;
}

/**
 * MEASUREMENT-AUDIT B6: the play-along median mixes the device's delay with the player's habit (typically 10–30 ms
 * ahead of a click). The take's clock already starts when the click is HEARD whenever the browser reports its audio
 * output time (piano.heardAt: getOutputTimestamp / outputLatency), and MIDI input arrives in a few ms — so on MIDI
 * with a reported output time the device part is MIDI_IN_MS and the rest is the player's habit: kept in the marks and
 * reported as a finding, not calibrated away. A median above DEVICE_ONLY_ABOVE is an unreported output delay
 * (Bluetooth): the device's. Without a reported output time, and for the microphone and screen taps (whose input delay
 * is real and unknown), the median stays the device's delay as before.
 */
export function splitLatency(medianMs: number, source: LatencySource, outputKnown: boolean): LatencySplit {
  if (source !== 'midi' || !outputKnown || medianMs > DEVICE_ONLY_ABOVE) return { deviceMs: medianMs, biasMs: null };
  return { deviceMs: MIDI_IN_MS, biasMs: Math.round(medianMs - MIDI_IN_MS) };
}

/** A habit worth naming: at least this far from the click (ms). */
export const HABIT_MS = 10;

/** The latency to subtract for an input (settings), with the built-in defaults when not calibrated. */
export function inputLatency(s: { tapLatencyMs?: number; midiLatencyMs?: number; micLatencyMs?: number }, source: LatencySource): number {
  if (source === 'tap') return s.tapLatencyMs ?? 0;
  if (source === 'midi') return s.midiLatencyMs ?? 0;
  return s.micLatencyMs ?? 70;
}

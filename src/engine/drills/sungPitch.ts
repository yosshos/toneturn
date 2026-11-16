// A sung note heard by the drill take's microphone loop (licks and Encore phrases on the voice). The loop turns each
// steady pitch into a note; plain rounding to the nearest semitone gives a voice only ±50 ¢, stricter than the
// course's one pass band for a sung note (vocal.passCents: ±65 ¢ below 1300, ±60 ¢ from 1300). So a sung pitch within
// the pass band of a note the drill expects is that note (octave kept, the nearest expected note wins); anything else
// rounds as before. The same single capture stream is used — no second microphone (iOS refuses one). Pure.

import { passCents } from '../vocal';

/** Fractional MIDI of a frequency. */
export const midiOfHz = (hz: number): number => 69 + 12 * Math.log2(hz / 440);

/**
 * The note a sung frequency counts as: the expected pitch (any octave, the one nearest the voice) within `tolCents`,
 * else the nearest semitone. `expected` = the drill's written pitches.
 */
export function sungMidi(hz: number, expected: readonly number[], tolCents: number = passCents()): number {
  const x = midiOfHz(hz);
  const r = Math.round(x);
  let best = r;
  let bestD = Infinity;
  for (const e of new Set(expected)) {
    const c = e + 12 * Math.round((x - e) / 12);
    const d = Math.abs(x - c) * 100;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= tolCents ? best : r;
}

/** A sung drill's pass band: its own (a phrase's rating) or the course's middle one. */
export const sungTolOf = (d: { sungTolCents?: number }): number => d.sungTolCents ?? passCents();

// The modelled guitar string (src/audio/pluck.ts): in tune, decaying, no click at the end.
import { describe, expect, it } from 'vitest';
import { guitarVoiceSamples, pluckOpts, pluckSamples } from '../src/audio/pluck';

const SR = 44100;

/** Period of a buffer by autocorrelation (samples), searched around the expected one. */
function period(x: Float32Array, from: number, guess: number): number {
  let best = guess;
  let bv = -Infinity;
  const W = 4096;
  for (let lag = Math.floor(guess * 0.9); lag <= Math.ceil(guess * 1.1); lag++) {
    let s = 0;
    for (let i = from; i < from + W; i++) s += x[i] * x[i + lag];
    if (s > bv) {
      bv = s;
      best = lag;
    }
  }
  // Parabolic refinement.
  const c = (lag: number) => {
    let s = 0;
    for (let i = from; i < from + W; i++) s += x[i] * x[i + lag];
    return s;
  };
  const a = c(best - 1);
  const b = c(best);
  const d = c(best + 1);
  return best + (0.5 * (a - d)) / (a - 2 * b + d);
}

describe('modelled guitar string', () => {
  it('sounds the asked pitch once played back at its rate (within 5 cents)', () => {
    for (const midi of [40, 45, 52, 64, 76]) {
      const { data, rate } = pluckSamples(midi, SR);
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const heard = (SR / period(data, 2000, SR / f / rate)) * rate;
      expect(Math.abs(1200 * Math.log2(heard / f)), `midi ${midi}`).toBeLessThan(5);
    }
  });

  it('decays: low strings ring longer than high ones, and the buffer ends in silence', () => {
    const rms = (x: Float32Array, a: number, b: number) => Math.sqrt(x.slice(a, b).reduce((s, v) => s + v * v, 0) / (b - a));
    const low = pluckSamples(40, SR).data;
    const high = pluckSamples(76, SR).data;
    expect(low.length).toBeGreaterThan(high.length);
    expect(rms(low, SR, SR + 2000)).toBeLessThan(rms(low, 0, 2000));
    expect(Math.abs(low[low.length - 1])).toBeLessThan(1e-3);
    expect(pluckOpts(40).t60).toBeGreaterThan(pluckOpts(76).t60);
  });

  // GUITAR_DEEPENING §8: nylon and clean electric, modelled like the steel string.
  it('the nylon and electric voices are in tune, end without a click, and nylon is darker than steel', () => {
    const centroid = (x: Float32Array, from: number, n = 4096) => {
      // A crude spectral centroid by zero-crossing rate of the first difference vs the signal (brightness proxy).
      let d = 0;
      let e = 0;
      for (let i = from + 1; i < from + n; i++) {
        d += (x[i] - x[i - 1]) ** 2;
        e += x[i] ** 2;
      }
      return Math.sqrt(d / Math.max(1e-12, e));
    };
    for (const voice of ['nylon', 'electric'] as const)
      for (const midi of [40, 52, 64, 76]) {
        const { data, rate } = guitarVoiceSamples(midi, SR, voice);
        const f = 440 * Math.pow(2, (midi - 69) / 12);
        const heard = (SR / period(data, 4000, SR / f / rate)) * rate;
        expect(Math.abs(1200 * Math.log2(heard / f)), `${voice} ${midi}`).toBeLessThan(5);
        expect(Math.abs(data[data.length - 1]), `${voice} ${midi} end`).toBeLessThan(1e-3);
      }
    for (const midi of [45, 57, 64]) {
      const steel = pluckSamples(midi, SR).data;
      const nylon = guitarVoiceSamples(midi, SR, 'nylon').data;
      expect(centroid(nylon, 2000), `midi ${midi}`).toBeLessThan(centroid(steel, 2000));
    }
  });
});

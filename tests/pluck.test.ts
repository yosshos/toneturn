// The modelled guitar string (src/audio/pluck.ts): in tune, decaying, no click at the end.
import { describe, expect, it } from 'vitest';
import { pluckOpts, pluckSamples } from '../src/audio/pluck';

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
});

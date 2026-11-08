import { describe, expect, it } from 'vitest';
import { chromaFromSpectrum, meanChroma, ringCheck } from '../src/engine/chroma';
import { analyzeGuitarTake, type GFrame } from '../src/engine/drills/guitarAnalyze';

const SR = 48000;
const N = 8192;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** A dB spectrum with harmonic partials of the given MIDI notes (amplitude 1/k). */
function spectrum(notes: number[], harmonics = 5): Float32Array {
  const lin = new Float32Array(N / 2);
  for (const m of notes)
    for (let k = 1; k <= harmonics; k++) {
      const bin = Math.round((hz(m) * k) / (SR / N));
      if (bin < lin.length) lin[bin] += 1 / k;
    }
  return lin.map((x) => (x > 0 ? 20 * Math.log10(x) : -140));
}

describe('chord ring-check (SPEC-0.48 §I1)', () => {
  it('an open G chord (G B D G B G) shows G, B and D', () => {
    const c = chromaFromSpectrum(spectrum([43, 47, 50, 55, 59, 67]), SR, N);
    const r = ringCheck(c, [7, 11, 2]);
    expect(r.missing).toEqual([]);
    expect(r.extra).toEqual([]);
  });
  it('a C chord with the E string muted misses E', () => {
    const full = ringCheck(chromaFromSpectrum(spectrum([48, 52, 55, 60, 64]), SR, N), [0, 4, 7]);
    expect(full.missing).toEqual([]);
    const muted = ringCheck(chromaFromSpectrum(spectrum([48, 55, 60], 2), SR, N), [0, 4, 7]);
    expect(muted.missing).toEqual([4]);
  });
  it('a wrong note shows as extra', () => {
    const r = ringCheck(chromaFromSpectrum(spectrum([48, 52, 55, 61], 1), SR, N), [0, 4, 7]);
    expect(r.extra).toContain(1);
  });
  it('silence: every note missing', () => {
    expect(ringCheck(chromaFromSpectrum(new Float32Array(N / 2).fill(-140), SR, N), [0, 4, 7]).missing.sort()).toEqual([0, 4, 7]);
  });
  it('mean of chroma vectors is normalised', () => {
    const m = meanChroma([[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]]);
    expect(Math.max(...m)).toBe(1);
    expect(m[0]).toBe(m[7]);
  });
  it('the guitar analysis reports full chords from frames with chroma', () => {
    const drill = {
      spec: { family: 'g-chords', kind: 'test', key: 0, hands: 'R' },
      itemId: 't', title: { en: 't', he: 't' }, meter: 4, beats: 8, keySig: 'C', startBpm: 60,
      notes: [0, 4].flatMap((beat, c) => [48, 52, 55].map((pitch) => ({ pitch, beat, dur: 4, hand: 'R' as const, chordId: c, technique: 'strum-down' as const, stroke: 'D' as const }))),
      goal: { evenness: false, hands: false },
    } as never;
    const frames: GFrame[] = [];
    for (let t = 0; t < 8000; t += 25) {
      const chord = t < 4000 ? [48, 52, 55] : [48, 55];
      frames.push({ t, hz: hz(48), conf: 0.9, rms: t % 4000 < 30 ? 0.3 : 0.1, chroma: chromaFromSpectrum(spectrum(chord, 2), SR, N) });
    }
    const played = [0, 4000].flatMap((on) => [48, 52, 55].map((pitch) => ({ pitch, on, off: null, vel: 64 })));
    const m = analyzeGuitarTake(drill, 60, played, undefined, frames);
    expect(m.guitar.ring).toEqual({ chords: 2, full: 1, missing: { 4: 1 } });
  });
});

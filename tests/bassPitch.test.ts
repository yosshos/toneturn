// BASS_AUDIT A1: bass-capable pitch tracking. Synthetic bass tones (fundamental + harmonics, and a weak-fundamental
// variant) through the same YIN the microphone uses, then a whole synthetic take through onsets → analysis.
import { describe, expect, it } from 'vitest';
import { bassPitchOpts, downsample, rms, spectralCentroid, yin } from '../src/engine/yin';
import { analyzeGuitarTake, captureOptsFor, detectOnsets, onsetOptsFor, UNPITCHED, type GFrame } from '../src/engine/drills/guitarAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import type { Drill, ExpNote } from '../src/engine/drills/types';

const SR = 48000;
const hzOf = (m: number) => 440 * 2 ** ((m - 69) / 12);
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);
/** A bass-like tone: harmonics 1..6 with the given amplitudes. */
function tone(midi: number, n: number, amps: number[], phase = 0.3): Float32Array {
  const f = hzOf(midi);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    amps.forEach((a, k) => (s += a * Math.sin(2 * Math.PI * f * (k + 1) * (i / SR) + phase * k)));
    b[i] = 0.25 * s;
  }
  return b;
}
const FULL = [1, 0.6, 0.4, 0.25, 0.15, 0.1];
const WEAK = [0.12, 1, 0.8, 0.5, 0.3, 0.2];
const pc = (m: number) => ((Math.round(m) % 12) + 12) % 12;

describe('bass pitch tracking (A1)', () => {
  const cases: [string, number, boolean][] = [
    ['E1', 28, false],
    ['A1', 33, false],
    ['B0', 23, true],
  ];
  for (const [name, m, lowB] of cases) {
    it(`${name}: exact with a full spectrum, right pitch class (± octave) with a weak fundamental`, () => {
      const o = bassPitchOpts(lowB);
      expect(o.fftSize).toBe(4096);
      const full = yin(tone(m, o.fftSize, FULL), SR, { minHz: o.minHz });
      expect(full.hz, name).not.toBeNull();
      expect(Math.round(midiOf(full.hz!))).toBe(m);
      const weak = yin(tone(m, o.fftSize, WEAK), SR, { minHz: o.minHz });
      expect(weak.hz, `${name} weak`).not.toBeNull();
      const got = Math.round(midiOf(weak.hz!));
      expect(pc(got)).toBe(pc(m));
      expect([0, 12]).toContain(got - m);
    });
  }

  it('the guitar default is unchanged (70 Hz floor, 2048 samples): E1 unread, E2 exact', () => {
    expect(yin(tone(28, 2048, FULL), SR).hz).toBeNull();
    expect(Math.round(midiOf(yin(tone(40, 2048, FULL), SR).hz!))).toBe(40);
  });

  it('5- and 6-string tunings get the 22 Hz floor; guitar drills keep the default capture', () => {
    const bassDrill = { spec: { family: 'b-time', kind: 'x', key: 4, hands: 'R' } } as Drill;
    expect(captureOptsFor(bassDrill)).toEqual({ minHz: 28, fftSize: 4096, centroid: true });
    expect(captureOptsFor(bassDrill, 'bass5')!.minHz).toBe(22);
    expect(captureOptsFor({ spec: { family: 'g-scales', kind: 'x', key: 4, hands: 'R' } } as Drill)).toBeNull();
    expect(onsetOptsFor(bassDrill)).toEqual({ pitchFrom: 40, pitchTo: 120 });
  });

  it('downsample and centroid helpers', () => {
    expect(downsample(new Float32Array([1, 3, 5, 7]), 2)).toEqual(new Float32Array([2, 6]));
    const spec = new Float32Array(4096).fill(-Infinity);
    spec[Math.round(1000 / (SR / 8192))] = 0;
    expect(spectralCentroid(spec, SR, 8192)).toBeCloseTo(1000, -1);
  });
});

describe('a synthetic bass take, sample by sample (A1 end to end)', () => {
  // Quarter notes at 80 bpm on low roots: E1 A1 B1 E1 G1 C2 D2 E1 (MIDI 28–38, all below the old 70 Hz floor but D2).
  const line = [28, 33, 35, 28, 31, 36, 38, 28];
  const notes: ExpNote[] = line.map((p, i) => ({ pitch: p, beat: i, dur: 1, hand: 'R' }));
  const drill: Drill = { spec: { family: 'b-time', kind: 'test', key: 4, hands: 'R' }, itemId: 't', title: { en: 't', he: 't' }, notes, beats: 8, meter: 4, keySig: 'C', goal: { evenness: true, hands: false }, startBpm: 80 };
  const bpm = 80;

  function render(amps: number[], dead = false): Float32Array {
    const len = Math.round(((drill.beats + 1) * 60 * SR) / bpm) + 4096;
    const buf = new Float32Array(len);
    notes.forEach((n, k) => {
      const t0 = Math.round((expTimeMs(drill, n.beat, bpm) / 1000) * SR) + 4096; // 4096 samples of lead-in
      const t1 = k + 1 < notes.length ? Math.round((expTimeMs(drill, notes[k + 1].beat, bpm) / 1000) * SR) + 4096 - Math.round(0.03 * SR) : t0 + SR;
      const f = hzOf(n.pitch);
      let seed = k * 7919 + 1;
      for (let i = t0; i < Math.min(t1, len); i++) {
        const t = (i - t0) / SR;
        const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.4);
        let s = 0;
        if (dead) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          s = (seed / 0x7fffffff - 0.5) * Math.exp(-t / 0.02) * 2;
        } else amps.forEach((a, h) => (s += a * Math.sin(2 * Math.PI * f * (h + 1) * t)));
        buf[i] = 0.25 * env * s;
      }
    });
    return buf;
  }
  /** Frames every 25 ms like the capture: YIN over the last 4096 samples, loudness over the last 2048. */
  function frames(buf: Float32Array): GFrame[] {
    const o = captureOptsFor(drill)!;
    const out: GFrame[] = [];
    const hop = Math.round(0.025 * SR);
    for (let end = 4096; end <= buf.length; end += hop) {
      const w = buf.subarray(end - o.fftSize, end);
      const y = yin(w, SR, { minRms: 0.008, minHz: o.minHz });
      out.push({ t: ((end - 4096) / SR) * 1000, hz: y.hz, conf: y.confidence, rms: rms(w.subarray(w.length - 2048)) });
    }
    return out;
  }

  it('reads every low root and the take is clean', () => {
    const fr = frames(render(FULL));
    const played = detectOnsets(fr, onsetOptsFor(drill));
    expect(played.map((p) => p.pitch)).toEqual(line);
    const m = analyzeGuitarTake(drill, bpm, played, undefined, fr);
    expect(m.verdict, m.why.en).toBe('clean');
    expect(m.guitar.unclear).toBe(0);
  });

  it('a weak fundamental still gives the right notes after octave folding', () => {
    const fr = frames(render(WEAK));
    const played = detectOnsets(fr, onsetOptsFor(drill));
    expect(played.length).toBe(line.length);
    played.forEach((p, i) => expect(pc(p.pitch)).toBe(pc(line[i])));
    const m = analyzeGuitarTake(drill, bpm, played, undefined, fr);
    expect(m.accuracy).toBe(1);
  });

  it('muted thumps in time are heard as onsets without a pitch and the take is not clean (A2)', () => {
    const fr = frames(render(FULL, true));
    const played = detectOnsets(fr, onsetOptsFor(drill));
    expect(played.length).toBe(line.length);
    expect(played.every((p) => p.pitch === UNPITCHED)).toBe(true);
    const m = analyzeGuitarTake(drill, bpm, played, undefined, fr);
    expect(m.verdict).toBe('not');
    expect(m.why.en).toMatch(/not heard clearly/);
  });
});

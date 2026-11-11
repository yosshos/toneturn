import { describe, expect, it } from 'vitest';
import { beatGrid, BEAT_CONFIDENT, fft, meterOf } from '../src/engine/beatTrack';

const SR = 22050;
/** Deterministic noise. */
const rng = (seed: number) => () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

/** A drum-like hit: a decaying low sine (kick) or noise burst (snare / hat) added at t. */
function hit(x: Float32Array, t: number, kind: 'kick' | 'snare' | 'hat', amp: number, rnd: () => number) {
  const s = Math.round(t * SR);
  const len = Math.round((kind === 'hat' ? 0.04 : kind === 'snare' ? 0.12 : 0.18) * SR);
  for (let i = 0; i < len && s + i < x.length; i++) {
    const env = Math.exp(-i / (len / 5));
    const v = kind === 'kick' ? Math.sin((2 * Math.PI * (55 + 60 * Math.exp(-i / 400)) * i) / SR) : rnd();
    x[s + i] += amp * env * v;
  }
}

function drums(bpm: number, sec: number, pattern: 'clicks' | 'rock', noise = 0.01, offset = 0.37): { x: Float32Array; beats: number[] } {
  const x = new Float32Array(Math.round(sec * SR));
  const rnd = rng(7);
  for (let i = 0; i < x.length; i++) x[i] = noise * rnd();
  const beat = 60 / bpm;
  const beats: number[] = [];
  for (let k = 0; offset + k * beat < sec - 0.3; k++) {
    const t = offset + k * beat;
    beats.push(t);
    if (pattern === 'clicks') hit(x, t, 'snare', 0.6, rnd);
    else {
      hit(x, t, k % 2 === 0 ? 'kick' : 'snare', 0.7, rnd);
      hit(x, t, 'hat', 0.15, rnd);
      hit(x, t + beat / 2, 'hat', 0.12, rnd);
    }
  }
  return { x, beats };
}

/** A sine melody, a new note on every beat (no percussion). */
function melodyOnly(bpm: number, sec: number): Float32Array {
  const x = new Float32Array(Math.round(sec * SR));
  const beat = 60 / bpm;
  const tune = [60, 62, 64, 65, 67, 65, 64, 62];
  for (let k = 0; k * beat < sec - beat; k++) {
    const f = 440 * 2 ** ((tune[k % tune.length] - 69) / 12);
    const s = Math.round((0.2 + k * beat) * SR);
    const len = Math.round(beat * 0.85 * SR);
    for (let i = 0; i < len && s + i < x.length; i++) x[s + i] += 0.4 * Math.min(1, i / 60) * Math.exp(-i / (SR * 0.6)) * Math.sin((2 * Math.PI * f * i) / SR);
  }
  return x;
}

const near = (beats: number[], t: number) => Math.min(...beats.map((b) => Math.abs(b - t)));

describe('fft', () => {
  it('finds a sine in its bin', () => {
    const n = 64;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * 5 * i) / n);
    fft(re, im);
    const mags = Array.from(re, (r, k) => Math.hypot(r, im[k]));
    expect(mags.indexOf(Math.max(...mags.slice(0, 32)))).toBe(5);
    expect(mags[5]).toBeCloseTo(32, 5);
  });
});

describe('beat tracker (SPEC-MY-SONG §3)', () => {
  it('a click track at 100 BPM: tempo, beat positions, confident', async () => {
    const { x, beats } = drums(100, 20, 'clicks');
    const g = await beatGrid(x, SR);
    expect(g).not.toBeNull();
    expect(Math.abs(g!.bpm - 100)).toBeLessThan(2);
    expect(g!.confidence).toBeGreaterThanOrEqual(BEAT_CONFIDENT);
    // Every true beat in the middle has a tracked beat within 35 ms.
    const mid = beats.filter((b) => b > 2 && b < 18);
    for (const b of mid) expect(near(g!.beats, b)).toBeLessThan(0.035);
  });

  it('a rock pattern at 140 BPM with eighth hats: the beat, not the eighth', async () => {
    const { x, beats } = drums(140, 20, 'rock');
    const g = await beatGrid(x, SR);
    expect(Math.abs(g!.bpm - 140)).toBeLessThan(3);
    expect(g!.confidence).toBeGreaterThanOrEqual(BEAT_CONFIDENT);
    const mid = beats.filter((b) => b > 2 && b < 18);
    const hits = mid.filter((b) => near(g!.beats, b) < 0.04).length;
    expect(hits / mid.length).toBeGreaterThan(0.9);
  });

  it('a slow 72 BPM pulse stays 72 (not doubled)', async () => {
    const { x } = drums(72, 24, 'clicks');
    const g = await beatGrid(x, SR);
    expect(Math.abs(g!.bpm - 72)).toBeLessThan(2);
  });

  it('a melody with no drums: its note onsets give the pulse', async () => {
    const g = await beatGrid(melodyOnly(90, 20), SR);
    expect(Math.abs(g!.bpm - 90)).toBeLessThan(2.5);
  });

  it('noise has no beat: not confident', async () => {
    const rnd = rng(3);
    const x = new Float32Array(SR * 15);
    for (let i = 0; i < x.length; i++) x[i] = 0.3 * rnd();
    const g = await beatGrid(x, SR);
    expect(g === null || g.confidence < BEAT_CONFIDENT).toBe(true);
  });

  it('too short or silent: null', async () => {
    expect(await beatGrid(new Float32Array(SR * 2), SR)).toBeNull();
    expect(await beatGrid(new Float32Array(SR * 10), SR)).toBeNull();
  });

  it('hits at random times (rubato) are not confident', async () => {
    const rnd = rng(11);
    const x = new Float32Array(SR * 20);
    for (let t = 0.3; t < 19.5; t += 0.25 + 0.9 * Math.abs(rnd())) hit(x, t, 'snare', 0.6, rnd);
    const g = await beatGrid(x, SR);
    expect(g === null || g.confidence < BEAT_CONFIDENT).toBe(true);
  });
});

/** A waltz: a kick on 1, a light snare on 2 and 3, a hat on every beat. `first` shifts which beat is 1. */
function waltz(bpm: number, sec: number, offset = 0.37, first = 0): Float32Array {
  const x = new Float32Array(Math.round(sec * SR));
  const rnd = rng(5);
  for (let i = 0; i < x.length; i++) x[i] = 0.01 * rnd();
  const beat = 60 / bpm;
  for (let k = 0; offset + k * beat < sec - 0.3; k++) {
    const t = offset + k * beat;
    if ((k + first) % 3 === 0) hit(x, t, 'kick', 0.8, rnd);
    else hit(x, t, 'snare', 0.3, rnd);
    hit(x, t, 'hat', 0.12, rnd);
  }
  return x;
}

describe('meter: 3/4 or 4 (SPEC-MY-SONG §6)', () => {
  it('meterOf: a three-beat accent pattern is 3 with its downbeat; two- and four-beat patterns stay 4', () => {
    const three = Array.from({ length: 30 }, (_, i) => ((i + 2) % 3 === 0 ? 2 : -1));
    const m = meterOf(three);
    expect(m.meter).toBe(3);
    expect(m.downbeat).toBe(1);
    expect(meterOf(Array.from({ length: 32 }, (_, i) => (i % 2 ? -1 : 1))).meter).toBe(4);
    expect(meterOf(Array.from({ length: 32 }, (_, i) => (i % 4 ? -0.5 : 1.5))).meter).toBe(4);
    expect(meterOf(Array.from({ length: 32 }, () => 0)).meter).toBe(4);
    // Too few beats: no call.
    expect(meterOf(three.slice(0, 12)).meter).toBe(4);
  });

  it('a waltz at 120 BPM is heard as 3/4, its downbeat on the kick', async () => {
    const g = await beatGrid(waltz(120, 24, 0.37, 1), SR);
    expect(g!.confidence).toBeGreaterThanOrEqual(BEAT_CONFIDENT);
    expect(g!.meter).toBe(3);
    // The kick is on the beats k with (k + 1) % 3 === 0: 0.37 + 2 × 0.5 = 1.37 s, then every 1.5 s.
    const d = g!.beats[g!.downbeat!];
    const phase = ((((d - 1.37) / 1.5) % 1) + 1) % 1;
    expect(Math.min(phase, 1 - phase)).toBeLessThan(0.05);
  });

  it('4/4 recordings never come out as 3/4 (rock kick–snare, a click track)', async () => {
    expect((await beatGrid(drums(140, 20, 'rock').x, SR))!.meter).toBeUndefined();
    expect((await beatGrid(drums(100, 20, 'clicks').x, SR))!.meter).toBeUndefined();
  });
});

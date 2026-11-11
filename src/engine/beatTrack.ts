// Offline beat tracking of a recording (SPEC-MY-SONG §3): the player's own audio, opened on the device. Pure apart
// from the optional async yield (a phone stays responsive on a long file).
//
//   1. onset strength: spectral flux of the log magnitude spectrum on a ~11 kHz copy (46 ms window, 11.6 ms hop),
//      half-wave rectified, with its local mean removed and scaled to unit spread;
//   2. tempo: the autocorrelation of that envelope over 55–210 BPM, weighted towards the 120 BPM region (log-normal,
//      so a 70 BPM ballad still wins when its pulse is clear), plus half its value at the double period (the beat,
//      not the eighth);
//   3. beats: dynamic programming (Ellis 2007) — every frame's best predecessor half to twice a period back, with a
//      penalty for straying from the period — then traced back from the strongest end.
//   4. confidence (0..1): how periodic the envelope is and how much stronger it is on the beats than elsewhere. A
//      recording with no steady pulse (rubato, a cappella) comes out low, and the screens then do not measure time.

export interface BeatGrid {
  bpm: number;
  /** Beat times (s). */
  beats: number[];
  /** 0..1; ≥ BEAT_CONFIDENT is good enough to measure timing against. */
  confidence: number;
  /** The envelope's autocorrelation at the beat period over its energy (0..1). */
  periodicity: number;
}

/** Beats at or above this confidence are used for timing. */
export const BEAT_CONFIDENT = 0.5;

/** In-place iterative radix-2 FFT (length a power of two). */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** The onset strength envelope (frames per second `fps`). */
export async function onsetEnvelope(x0: Float32Array, sampleRate: number, o: { yieldEvery?: number; onProgress?: (p: number) => void } = {}): Promise<{ env: Float32Array; fps: number; t0: number }> {
  const factor = Math.max(1, Math.round(sampleRate / 11025));
  const sr = sampleRate / factor;
  // Box-average decimation (a cheap low-pass), peak-normalised so the log compression sees the same scale.
  const n0 = Math.floor(x0.length / factor);
  const x = new Float32Array(n0);
  let peak = 0;
  for (let i = 0; i < n0; i++) {
    let s = 0;
    for (let k = 0; k < factor; k++) s += x0[i * factor + k];
    x[i] = s / factor;
    peak = Math.max(peak, Math.abs(x[i]));
  }
  const gain = peak > 0 ? 0.9 / peak : 1;
  let N = 256;
  while (N < sr * 0.046) N <<= 1;
  const hop = Math.max(1, Math.round(sr * 0.0116));
  const frames = Math.max(0, Math.floor((x.length - N) / hop) + 1);
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const half = N / 2;
  const hiBin = Math.min(half, Math.ceil((5000 * N) / sr));
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let prev = new Float64Array(hiBin);
  let cur = new Float64Array(hiBin);
  const flux = new Float32Array(frames);
  const every = o.yieldEvery ?? 1500;
  for (let f = 0; f < frames; f++) {
    const s = f * hop;
    for (let i = 0; i < N; i++) {
      re[i] = x[s + i] * gain * win[i];
      im[i] = 0;
    }
    fft(re, im);
    let sum = 0;
    for (let k = 1; k < hiBin; k++) {
      const m = Math.log(1 + 100 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
      cur[k] = m;
      if (f > 0 && m > prev[k]) sum += m - prev[k];
    }
    flux[f] = sum;
    [prev, cur] = [cur, prev];
    if (f % every === every - 1) {
      o.onProgress?.(f / frames);
      await tick();
    }
  }
  const fps = sr / hop;
  // Remove the local mean (±0.25 s), keep the rises, scale to unit spread.
  const w = Math.max(1, Math.round(0.25 * fps));
  const env = new Float32Array(frames);
  let acc = 0;
  let lo = 0;
  let hi = -1;
  for (let f = 0; f < frames; f++) {
    while (hi < Math.min(frames - 1, f + w)) acc += flux[++hi];
    while (lo < f - w) acc -= flux[lo++];
    env[f] = Math.max(0, flux[f] - acc / (hi - lo + 1));
  }
  let sq = 0;
  for (let f = 0; f < frames; f++) sq += env[f] * env[f];
  const sd = Math.sqrt(sq / Math.max(1, frames));
  if (sd > 1e-9) for (let f = 0; f < frames; f++) env[f] /= sd;
  o.onProgress?.(1);
  // Frame f's rise is heard around the middle of its window.
  return { env, fps, t0: N / 2 / sr };
}

/** The beat period from the envelope's autocorrelation. */
export function estimateTempo(env: Float32Array, fps: number, o: { minBpm?: number; maxBpm?: number } = {}): { bpm: number; lag: number; periodicity: number } | null {
  const minBpm = o.minBpm ?? 55;
  const maxBpm = o.maxBpm ?? 210;
  const n = env.length;
  const lmin = Math.max(2, Math.floor((60 * fps) / maxBpm));
  const lmax = Math.ceil((60 * fps) / minBpm);
  if (n < 2 * lmax + 8) return null;
  const top = Math.min(n - 1, 2 * lmax + 2);
  const ac = new Float64Array(top + 1);
  // Around the mean: a rectified envelope's mean alone would make anything look periodic.
  let mean = 0;
  for (let t = 0; t < n; t++) mean += env[t];
  mean /= n;
  for (let L = 0; L <= top; L++) {
    let s = 0;
    for (let t = 0; t + L < n; t++) s += (env[t] - mean) * (env[t + L] - mean);
    ac[L] = s / (n - L);
  }
  if (ac[0] <= 1e-12) return null;
  let best = -1;
  let bestV = -Infinity;
  for (let L = lmin; L <= lmax; L++) {
    const bpm = (60 * fps) / L;
    const w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    const v = w * (ac[L] + 0.5 * (2 * L <= top ? ac[2 * L] : 0));
    if (v > bestV) {
      bestV = v;
      best = L;
    }
  }
  if (best < 0) return null;
  // Settle on the local autocorrelation peak (±1), then interpolate.
  while (best > lmin && ac[best - 1] > ac[best]) best--;
  while (best < lmax && ac[best + 1] > ac[best]) best++;
  let lag = best;
  if (best > 1 && best < top) {
    const a = ac[best - 1];
    const b = ac[best];
    const c = ac[best + 1];
    const d = a - 2 * b + c;
    if (d < 0) lag = best + (0.5 * (a - c)) / d;
  }
  return { bpm: (60 * fps) / lag, lag, periodicity: Math.max(0, Math.min(1, ac[best] / ac[0])) };
}

/** Beat frames by dynamic programming (Ellis 2007) for a period of `lag` frames. */
export function trackBeats(env: Float32Array, lag: number, tightness = 400): number[] {
  const n = env.length;
  if (!n || lag < 2) return [];
  const C = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  const from = Math.round(2 * lag);
  const to = Math.max(1, Math.round(lag / 2));
  for (let t = 0; t < n; t++) {
    let bestV = -Infinity;
    let bestP = -1;
    for (let p = t - from; p <= t - to; p++) {
      if (p < 0) continue;
      const v = C[p] - tightness * Math.log((t - p) / lag) ** 2;
      if (v > bestV) {
        bestV = v;
        bestP = p;
      }
    }
    C[t] = env[t] + (bestP >= 0 ? Math.max(0, bestV) : 0);
    back[t] = bestP >= 0 && bestV > 0 ? bestP : -1;
  }
  // The strongest end within the last period.
  let end = n - 1;
  let endV = -Infinity;
  for (let t = Math.max(0, n - Math.ceil(lag)); t < n; t++)
    if (C[t] > endV) {
      endV = C[t];
      end = t;
    }
  const out: number[] = [];
  for (let t = end; t >= 0; t = back[t]) {
    out.push(t);
    if (back[t] < 0) break;
  }
  return out.reverse();
}

/** How much stronger the envelope is on the beats than half-way between them (each point's ±2-frame peak). */
function alignment(env: Float32Array, beatFrames: number[]): number {
  if (beatFrames.length < 2) return 0;
  const peakAt = (c: number) => {
    let m = 0;
    for (let k = Math.max(0, c - 2); k <= Math.min(env.length - 1, c + 2); k++) m = Math.max(m, env[k]);
    return m;
  };
  let on = 0;
  let off = 0;
  for (let i = 0; i < beatFrames.length - 1; i++) {
    on += peakAt(beatFrames[i]);
    off += peakAt(Math.round((beatFrames[i] + beatFrames[i + 1]) / 2));
  }
  return on / (off + 0.25 * (beatFrames.length - 1));
}

/** The beat grid of a recording (mono samples), or null when it is too short or silent. */
export async function beatGrid(samples: Float32Array, sampleRate: number, o: { maxSec?: number; onProgress?: (p: number) => void } = {}): Promise<BeatGrid | null> {
  const maxSec = o.maxSec ?? 300;
  const x = samples.subarray(0, Math.min(samples.length, Math.floor(maxSec * sampleRate)));
  if (x.length < sampleRate * 4) return null;
  const { env, fps, t0 } = await onsetEnvelope(x, sampleRate, { onProgress: (p) => o.onProgress?.(0.9 * p) });
  const tempo = estimateTempo(env, fps);
  if (!tempo) return null;
  const frames = trackBeats(env, tempo.lag);
  o.onProgress?.(1);
  if (frames.length < 4) return null;
  const beats = frames.map((f) => Math.round((f / fps + t0) * 1000) / 1000);
  const ibis = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
  const med = ibis[ibis.length >> 1];
  // Regular beats: the share of intervals within 12 % of the median.
  const regular = ibis.filter((d) => Math.abs(d - med) <= 0.12 * med).length / ibis.length;
  // Periodicity carries most of it (noise ≈ 0.2, a played pulse ≥ 0.5); landing on the beat rather than half-way adds
  // the rest (music with eighths everywhere still lands a little more on the beat).
  const per = Math.max(0, Math.min(1, (tempo.periodicity - 0.1) / 0.3));
  const align = Math.max(0, Math.min(1, (alignment(env, frames) - 1.2) / 2.5));
  const confidence = Math.round(Math.max(0, Math.min(1, (0.7 * per + 0.3 * align) * (0.4 + 0.6 * regular))) * 100) / 100;
  return { bpm: Math.round((60 / med) * 10) / 10, beats, confidence, periodicity: Math.round(tempo.periodicity * 100) / 100 };
}

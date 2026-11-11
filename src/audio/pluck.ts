// A modelled guitar string (0.66, guitar audit: the guitar course played everything on the piano). Karplus–Strong:
// a short burst of filtered noise circulates in a delay line one period long; an averaging filter and a small loss per
// period make the high partials die first, like a plucked steel string. Pure: samples in, samples out.

/** Seeded noise, so the same note always sounds the same (and tests are stable). */
function noise(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a ^= a << 13;
    a ^= a >>> 17;
    a ^= a << 5;
    return ((a >>> 0) / 4294967296) * 2 - 1;
  };
}

export interface PluckOpts {
  /** Ring time to −60 dB (s) at this pitch. */
  t60: number;
  /** Excitation brightness 0..1 (pick attack: higher = brighter). */
  bright: number;
  /** Pick position along the string (0..0.5): notches the partials at its multiples, as a real pluck does. */
  pickAt: number;
  /**
   * GUITAR_DEEPENING §8: the loop filter's weights on the samples one period back (n−N+1, n−N, n−N−1). Default the
   * steel string's two-point average [0, .5, .5]; a nylon string damps its highs more ([.25, .5, .25]), an electric less.
   */
  loop?: [number, number, number];
}

/** Default voicing by pitch: low strings ring long, the top of the neck short (a steel-string acoustic). */
export function pluckOpts(midi: number): PluckOpts {
  return { t60: Math.max(0.9, Math.min(3.4, 3.4 - (midi - 40) * 0.07)), bright: 0.55, pickAt: 0.14 };
}

/**
 * One plucked note as raw samples, tuned to the integer delay (period N, sounding sampleRate / (N + 0.5)). The caller
 * plays it back at `rate` to land exactly on the wanted pitch.
 */
export function pluckSamples(midi: number, sampleRate: number, opts: PluckOpts = pluckOpts(midi)): { data: Float32Array; rate: number } {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const [w0, w1, w2] = opts.loop ?? [0, 0.5, 0.5];
  // The loop filter delays by (w2 − w0) samples on top of the period (the steel string's average: half a sample).
  const fd = w2 - w0;
  const N = Math.max(2, Math.floor(sampleRate / f - fd));
  const f0 = sampleRate / (N + fd);
  const len = Math.ceil(opts.t60 * sampleRate);
  const y = new Float32Array(len);
  // Excitation: noise through a one-pole low-pass (brightness), then a comb for the pick position.
  const rnd = noise(midi * 7919 + 17);
  const a = 0.2 + 0.75 * (1 - opts.bright);
  let lp = 0;
  const ex = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    lp = a * lp + (1 - a) * rnd();
    ex[i] = lp;
  }
  const P = Math.max(1, Math.round(N * opts.pickAt));
  let mean = 0;
  for (let i = 0; i < N; i++) {
    y[i] = ex[i] - (i >= P ? ex[i - P] : 0);
    mean += y[i];
  }
  mean /= N;
  for (let i = 0; i < N; i++) y[i] -= mean;
  // Loss per period for the wanted ring time (the averaging filter adds its own, frequency-dependent damping).
  const g = Math.pow(10, -3 / (opts.t60 * f0));
  for (let n = N; n < len; n++) y[n] = g * (w0 * y[n - N + 1] + w1 * y[n - N] + w2 * y[n - N - 1 >= 0 ? n - N - 1 : n - N]);
  // Normalise the peak and fade the last 30 ms so the buffer never ends with a click.
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
  const k = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.min(len, Math.round(0.03 * sampleRate));
  for (let i = 0; i < len; i++) y[i] *= k * (i >= len - fade ? (len - i) / fade : 1);
  return { data: y, rate: f / f0 };
}

// ───────────────────────────── GUITAR_DEEPENING §8: nylon and clean electric ─────────────────────────────

/** The guitar voices: the steel-string acoustic (default), a nylon-string classical, a clean electric (neck pickup). */
export type GuitarVoice = 'steel' | 'nylon' | 'electric';

/** Nylon: a soft, thumb-like attack plucked near a fifth of the string, a darker loop, a shorter top register. */
export function nylonOpts(midi: number): PluckOpts {
  return { t60: Math.max(0.6, Math.min(2.6, 2.6 - (midi - 40) * 0.065)), bright: 0.22, pickAt: 0.2, loop: [0.25, 0.5, 0.25] };
}
/** Clean electric: a brighter loop and a long sustain (solid body, no box to drink the energy). */
export function electricOpts(midi: number): PluckOpts {
  return { t60: Math.max(1.6, Math.min(4.5, 4.5 - (midi - 40) * 0.06)), bright: 0.6, pickAt: 0.12, loop: [0, 0.7, 0.3] };
}

/** An RBJ peaking biquad run over the samples in place (the guitar body's air and top resonances). */
function peak(y: Float32Array, sr: number, f0: number, q: number, db: number): void {
  const A = Math.pow(10, db / 40);
  const w = (2 * Math.PI * f0) / sr;
  const al = Math.sin(w) / (2 * q);
  const b0 = 1 + al * A;
  const b1 = -2 * Math.cos(w);
  const b2 = 1 - al * A;
  const a0 = 1 + al / A;
  const a1 = -2 * Math.cos(w);
  const a2 = 1 - al / A;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < y.length; i++) {
    const x = y[i];
    const o = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = o;
    y[i] = o;
  }
}

/** Normalise to a 0.9 peak and fade the last 30 ms (no click at the end). */
function finishBuf(y: Float32Array, sr: number): void {
  let pk = 0;
  for (let i = 0; i < y.length; i++) pk = Math.max(pk, Math.abs(y[i]));
  const k = pk > 0 ? 0.9 / pk : 1;
  const fade = Math.min(y.length, Math.round(0.03 * sr));
  for (let i = 0; i < y.length; i++) y[i] *= k * (i >= y.length - fade ? (y.length - i) / fade : 1);
}

/**
 * One note of a guitar voice. Steel: the plain string. Nylon: the darker string through three body resonances
 * (≈ 100 / 200 / 400 Hz). Electric: the bright string seen by a neck pickup (a comb at its place on the string) and a
 * light drive. Modelled, no samples; same tuning contract as pluckSamples (play back at `rate`).
 */
export function guitarVoiceSamples(midi: number, sampleRate: number, voice: GuitarVoice = 'steel'): { data: Float32Array; rate: number } {
  if (voice === 'steel') return pluckSamples(midi, sampleRate);
  if (voice === 'nylon') {
    const r = pluckSamples(midi, sampleRate, nylonOpts(midi));
    const y = r.data;
    peak(y, sampleRate, 100, 3, 6);
    peak(y, sampleRate, 205, 4, 4);
    peak(y, sampleRate, 410, 4, 2.5);
    finishBuf(y, sampleRate);
    return r;
  }
  const r = pluckSamples(midi, sampleRate, electricOpts(midi));
  const x = r.data;
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  // The neck pickup sits about a quarter of the way from the bridge's end of the vibrating length: a comb at that delay.
  const D = Math.max(1, Math.round((sampleRate / (f / r.rate)) * 0.24));
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - 0.8 * (i >= D ? x[i - D] : 0);
  const drive = 1.6;
  const norm = Math.tanh(drive);
  let pk = 0;
  for (let i = 0; i < y.length; i++) pk = Math.max(pk, Math.abs(y[i]));
  for (let i = 0; i < y.length; i++) y[i] = Math.tanh((drive * y[i]) / (pk || 1)) / norm;
  finishBuf(y, sampleRate);
  return { data: y, rate: r.rate };
}


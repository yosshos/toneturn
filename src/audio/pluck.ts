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
  const N = Math.max(2, Math.floor(sampleRate / f - 0.5));
  const f0 = sampleRate / (N + 0.5);
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
  for (let n = N; n < len; n++) y[n] = g * 0.5 * (y[n - N] + y[n - N - 1 >= 0 ? n - N - 1 : n - N]);
  // Normalise the peak and fade the last 30 ms so the buffer never ends with a click.
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
  const k = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.min(len, Math.round(0.03 * sampleRate));
  for (let i = 0; i < len; i++) y[i] *= k * (i >= len - fade ? (len - i) / fade : 1);
  return { data: y, rate: f / f0 };
}

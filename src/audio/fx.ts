// Renders an `fx` stimulus (spec AE §4.4): a synthesised source (pink noise, a band loop, its drums, a voice-like
// line or a sine — all deterministic from the spec's seed) through an effect chain built from Web Audio nodes in
// an OfflineAudioContext: biquad EQ / filters → wave-shaper drive → compressor (+ makeup) → mid/side width →
// stereo pan → reverb (convolver with a generated impulse) and delay (feedback) sends → output gain.
// Loudness match (R1): with `matchTo`, the same source is also rendered through that chain and the result is
// scaled to the same RMS. Renders are cached by spec. The pure helpers (sources, impulse, RMS, curves) are
// exported for tests and need no Web Audio.

import { fxKey, sourceSeconds, type FxChain, type FxPart, type FxSpec } from '../engine/fx';

export const FX_RATE = 44100;
/** RMS of the plain sources (≈ −23 dBFS): room for +12 dB boosts and drive before clipping. */
const SOURCE_RMS = 0.07;

// ---------------------------------------------------------------- pure helpers

export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RMS over all channels. */
export function rms(chs: Float32Array[]): number {
  let s = 0;
  let n = 0;
  for (const c of chs) {
    for (let i = 0; i < c.length; i++) s += c[i] * c[i];
    n += c.length;
  }
  return n ? Math.sqrt(s / n) : 0;
}

/** Gain that brings a sound of RMS `have` to RMS `want` (1 when either is silent). */
export const matchGain = (want: number, have: number): number => (want > 1e-9 && have > 1e-9 ? want / have : 1);

/** Pink noise (Paul Kellet's filter), deterministic. */
export function pinkNoise(n: number, seed: number): Float32Array {
  const r = prng(seed);
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
  }
  return out;
}

/** Stereo reverb impulse: decorrelated noise decaying to −60 dB over `decay` s, after `predelay` s of silence. */
export function makeImpulse(rate: number, decay: number, predelay = 0, seed = 7): [Float32Array, Float32Array] {
  const pre = Math.floor(predelay * rate);
  const len = pre + Math.max(1, Math.floor(decay * rate));
  const out: [Float32Array, Float32Array] = [new Float32Array(len), new Float32Array(len)];
  const k = Math.log(1000) / Math.max(0.05, decay); // amplitude e^(−k t) reaches 0.001 at `decay`
  for (let c = 0; c < 2; c++) {
    const r = prng(seed + c * 7919);
    const d = out[c];
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / rate;
      const fadeIn = Math.min(1, t / 0.004);
      d[i] = (r() * 2 - 1) * Math.exp(-k * t) * fadeIn;
    }
  }
  return out;
}

/** Wave-shaper curve: 0 = (almost) linear, 1 = hard fuzz. Odd-symmetric and bounded by 1. */
export function driveCurve(amount: number, n = 2048): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n);
  const k = 1 + amount * 60;
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / norm;
  }
  return c;
}

/** Makeup gain (linear) for a compressor: half of the gain reduction at 0 dBFS, as a rough auto-makeup. */
export function compMakeup(threshold: number, ratio: number): number {
  const reduction = -threshold * (1 - 1 / Math.max(1, ratio));
  return 10 ** (reduction / 2 / 20) * 0.5 + 0.5;
}

const panGains = (p: number): [number, number] => {
  const a = ((Math.max(-1, Math.min(1, p)) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};
const hzOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Add a mono signal into a stereo pair at a pan position. */
function addPanned(L: Float32Array, R: Float32Array, at: number, sig: Float32Array, pan: number) {
  const [gl, gr] = panGains(pan);
  for (let i = 0; i < sig.length && at + i < L.length; i++) {
    if (at + i < 0) continue;
    L[at + i] += sig[i] * gl;
    R[at + i] += sig[i] * gr;
  }
}

/** Additive tone: harmonics with amplitudes `amp(h, f)`, an envelope, `dur` s. */
function tone(rate: number, f: number, dur: number, amp: (h: number, fh: number) => number, attack: number, decayTau: number, maxH = 40): Float32Array {
  const n = Math.floor(dur * rate);
  const out = new Float32Array(n);
  const hs: [number, number][] = [];
  for (let h = 1; h <= maxH && f * h < Math.min(12000, rate / 2 - 500); h++) {
    const a = amp(h, f * h);
    if (a > 1e-4) hs.push([(2 * Math.PI * f * h) / rate, a]);
  }
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t / attack) * Math.exp(-t / decayTau) * Math.min(1, (n - i) / (rate * 0.01));
    let s = 0;
    for (const [w, a] of hs) s += a * Math.sin(w * i);
    out[i] = s * env;
  }
  return out;
}

function kick(rate: number): Float32Array {
  const n = Math.floor(0.35 * rate);
  const o = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = 45 + 85 * Math.exp(-t / 0.03);
    ph += (2 * Math.PI * f) / rate;
    o[i] = Math.sin(ph) * Math.exp(-t / 0.12) * 1.1;
  }
  return o;
}
function snare(rate: number, r: () => number): Float32Array {
  const n = Math.floor(0.25 * rate);
  const o = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const w = r() * 2 - 1;
    const hp = w - prev * 0.6;
    prev = w;
    o[i] = hp * 0.5 * Math.exp(-t / 0.07) + Math.sin(2 * Math.PI * 190 * t) * 0.45 * Math.exp(-t / 0.05);
  }
  return o;
}
function hat(rate: number, r: () => number, open = false): Float32Array {
  const n = Math.floor((open ? 0.2 : 0.06) * rate);
  const o = new Float32Array(n);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    const hp = w - 2 * p1 + p2; // 2nd-order difference: bright
    p2 = p1;
    p1 = w;
    o[i] = hp * 0.12 * Math.exp(-(i / rate) / (open ? 0.08 : 0.018));
  }
  return o;
}

/** Vowel formants ('a', 'o', 'e') → harmonic weight. */
const VOWELS: [number, number, number][][] = [
  [[730, 1, 90], [1090, 0.5, 110], [2440, 0.25, 160]],
  [[570, 1, 80], [840, 0.45, 100], [2410, 0.15, 160]],
  [[530, 1, 80], [1840, 0.5, 130], [2480, 0.3, 160]],
];
const formant = (v: number) => (_h: number, fh: number) => {
  let w = 0.02;
  for (const [fc, g, bw] of VOWELS[v]) w += g / (1 + ((fh - fc) / bw) ** 2);
  return w / Math.sqrt(_h);
};

const PENTA = [0, 2, 4, 7, 9, 12, 14];
const PROGS = [[0, 5, 9, 7], [0, 9, 5, 7], [9, 5, 0, 7], [0, 7, 9, 5]];

/** The source as a stereo pair (pure, deterministic from the spec). Normalised to SOURCE_RMS. */
export function renderSource(spec: FxSpec, rate = FX_RATE): [Float32Array, Float32Array] {
  const n = Math.max(1, Math.floor(spec.seconds * rate));
  const srcN = Math.min(n, Math.floor(sourceSeconds(spec) * rate));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const r = prng(spec.seed);
  const bpm = spec.bpm ?? 110;
  const beat = 60 / bpm;
  const fadeOut = (x: Float32Array) => {
    const f = Math.floor(0.02 * rate);
    for (let i = 0; i < f && srcN - 1 - i >= 0; i++) x[srcN - 1 - i] *= i / f;
    x.fill(0, srcN);
  };
  switch (spec.source) {
    case 'pink': {
      const p = pinkNoise(srcN, spec.seed);
      const f = Math.floor(0.01 * rate);
      for (let i = 0; i < srcN; i++) {
        const env = Math.min(1, i / f, (srcN - i) / f);
        L[i] = R[i] = p[i] * env;
      }
      break;
    }
    case 'sine': {
      const hz = spec.sineHz ?? 1000;
      const f = Math.floor(0.03 * rate);
      for (let i = 0; i < srcN; i++) L[i] = R[i] = Math.sin((2 * Math.PI * hz * i) / rate) * Math.min(1, i / f, (srcN - i) / f);
      break;
    }
    case 'voice': {
      // A note every two beats (so delay echoes can be placed against the pulse), vowels varying.
      const root = 55 + Math.floor(r() * 5);
      const step = 2 * beat;
      for (let t = 0, k = 0; t < sourceSeconds(spec) - 0.1; t += step, k++) {
        const m = root + PENTA[Math.floor(r() * PENTA.length)];
        const dur = Math.min(beat * 0.8, sourceSeconds(spec) - t);
        const v = tone(rate, hzOf(m), dur, formant(k % 3), 0.02, 0.6);
        addPanned(L, R, Math.floor(t * rate), v, 0);
      }
      fadeOut(L);
      fadeOut(R);
      break;
    }
    case 'drums':
    case 'loop': {
      const parts: FxPart[] = spec.source === 'drums' ? ['drums'] : (spec.parts ?? ['drums', 'bass', 'keys']);
      const pp = spec.partPan ?? {};
      const steps = Math.floor(sourceSeconds(spec) / (beat / 2));
      const prog = PROGS[Math.floor(r() * PROGS.length)];
      const key = 36 + Math.floor(r() * 7);
      const K = kick(rate);
      const kickAt = new Set([0, 4, 5].concat(r() < 0.5 ? [7] : []));
      if (parts.includes('drums')) {
        const dp = pp.drums ?? 0;
        for (let s = 0; s < steps; s++) {
          const at = Math.floor(s * (beat / 2) * rate);
          if (kickAt.has(s % 8)) addPanned(L, R, at, K, dp);
          if (s % 4 === 2) addPanned(L, R, at, snare(rate, r), dp);
          addPanned(L, R, at, hat(rate, r, s % 8 === 7), dp + (pp.drums === undefined ? 0.35 : 0));
        }
      }
      if (parts.includes('bass')) {
        const bp = pp.bass ?? 0;
        for (let s = 0; s < steps; s++) {
          if (s % 2 === 1 && r() < 0.6) continue;
          const chord = prog[Math.floor(s / 4) % prog.length];
          const m = key + chord + (s % 4 === 3 && r() < 0.4 ? 7 : 0);
          const v = tone(rate, hzOf(m), beat * 0.45, (h) => 0.5 / h ** 1.6, 0.005, 0.25, 12);
          addPanned(L, R, Math.floor(s * (beat / 2) * rate), v, bp);
        }
      }
      if (parts.includes('keys')) {
        const spread = pp.keys === undefined;
        const kp = pp.keys ?? 0;
        for (let b = 0; b * beat < sourceSeconds(spec) - 0.05; b += 2) {
          const chord = prog[Math.floor(b / 2) % prog.length];
          const root = key + 24 + chord;
          const third = chord % 12 === 9 ? 3 : 4; // vi is minor
          [0, third, 7, 12].forEach((iv, j) => {
            const v = tone(rate, hzOf(root + iv), Math.min(beat * 1.9, sourceSeconds(spec) - b * beat), (h) => (h === 1 ? 0.12 : h === 2 ? 0.04 : h === 3 ? 0.015 : 0), 0.01, 0.9, 3);
            addPanned(L, R, Math.floor((b * beat + j * 0.012) * rate), v, spread ? [-0.6, 0.6, -0.3, 0.3][j] : kp);
          });
        }
      }
      fadeOut(L);
      fadeOut(R);
      break;
    }
  }
  const g = matchGain(SOURCE_RMS, rms([L.subarray(0, srcN), R.subarray(0, srcN)]));
  for (let i = 0; i < n; i++) {
    L[i] *= g;
    R[i] *= g;
  }
  return [L, R];
}

// ---------------------------------------------------------------- Web Audio rendering

type Ctx = BaseAudioContext;

/** Build the chain from `input` to the context's destination. */
function buildChain(ctx: Ctx, input: AudioNode, chain: FxChain, seed: number) {
  let node: AudioNode = input;
  for (const f of chain.eq ?? []) {
    const b = ctx.createBiquadFilter();
    b.type = f.type;
    b.frequency.value = f.freq;
    if (f.q !== undefined) b.Q.value = f.type === 'lowshelf' || f.type === 'highshelf' ? 0.0001 + f.q : f.q;
    if (f.gain !== undefined) b.gain.value = f.gain;
    node.connect(b);
    node = b;
  }
  if (chain.drive) {
    const pre = ctx.createGain();
    pre.gain.value = 1 + chain.drive * 6;
    const ws = ctx.createWaveShaper();
    ws.curve = driveCurve(chain.drive);
    ws.oversample = '4x';
    const post = ctx.createGain();
    post.gain.value = 0.4;
    node.connect(pre).connect(ws).connect(post);
    node = post;
  }
  if (chain.comp) {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = chain.comp.threshold;
    c.ratio.value = Math.min(20, chain.comp.ratio);
    c.knee.value = 3;
    c.attack.value = chain.comp.attack ?? 0.01;
    c.release.value = chain.comp.release ?? 0.15;
    const mk = ctx.createGain();
    mk.gain.value = compMakeup(chain.comp.threshold, chain.comp.ratio);
    node.connect(c).connect(mk);
    node = mk;
  }
  if (chain.width !== undefined && chain.width !== 1) {
    // L' = (1+w)/2·L + (1−w)/2·R, R' = (1−w)/2·L + (1+w)/2·R  (mid kept, side × w)
    const w = chain.width;
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const g = (v: number) => {
      const x = ctx.createGain();
      x.gain.value = v;
      return x;
    };
    node.connect(split);
    split.connect(g((1 + w) / 2), 0).connect(merge, 0, 0);
    split.connect(g((1 - w) / 2), 1).connect(merge, 0, 0);
    split.connect(g((1 - w) / 2), 0).connect(merge, 0, 1);
    split.connect(g((1 + w) / 2), 1).connect(merge, 0, 1);
    node = merge;
  }
  if (chain.pan !== undefined && chain.pan !== 0) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, chain.pan));
    node.connect(p);
    node = p;
  }
  const out = ctx.createGain();
  out.gain.value = 10 ** ((chain.gainDb ?? 0) / 20);
  out.connect(ctx.destination);
  const wetSum = (chain.reverb?.mix ?? 0) + (chain.delay?.mix ?? 0);
  const dry = ctx.createGain();
  dry.gain.value = Math.max(0.3, 1 - wetSum / 2);
  node.connect(dry).connect(out);
  if (chain.reverb && chain.reverb.mix > 0) {
    const conv = ctx.createConvolver();
    const [l, r] = makeImpulse(ctx.sampleRate, chain.reverb.decay, chain.reverb.predelay ?? 0, seed + 11);
    const buf = ctx.createBuffer(2, l.length, ctx.sampleRate);
    buf.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
    buf.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
    conv.normalize = true;
    conv.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = chain.reverb.mix;
    node.connect(conv).connect(wet).connect(out);
  }
  if (chain.delay && chain.delay.mix > 0) {
    const d = ctx.createDelay(4);
    d.delayTime.value = chain.delay.time;
    const fb = ctx.createGain();
    fb.gain.value = Math.min(0.9, chain.delay.feedback);
    const wet = ctx.createGain();
    wet.gain.value = chain.delay.mix;
    node.connect(d);
    d.connect(fb).connect(d);
    d.connect(wet).connect(out);
  }
}

async function renderChain(src: [Float32Array, Float32Array], chain: FxChain, seed: number, rate: number): Promise<AudioBuffer> {
  const Off = (globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ??
    (globalThis as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new Off(2, src[0].length, rate);
  const buf = ctx.createBuffer(2, src[0].length, rate);
  buf.copyToChannel(src[0] as Float32Array<ArrayBuffer>, 0);
  buf.copyToChannel(src[1] as Float32Array<ArrayBuffer>, 1);
  const s = ctx.createBufferSource();
  s.buffer = buf;
  buildChain(ctx, s, chain, seed);
  s.start(0);
  return ctx.startRendering();
}

const channels = (b: AudioBuffer) => Array.from({ length: b.numberOfChannels }, (_, c) => b.getChannelData(c));

const cache = new Map<string, Promise<AudioBuffer>>();
const CACHE_MAX = 32;

/** The spec rendered (and loudness-matched to `matchTo`), cached. */
export function renderFx(spec: FxSpec, rate = FX_RATE): Promise<AudioBuffer> {
  const key = `${rate}:${fxKey(spec)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    const src = renderSource(spec, rate);
    const out = await renderChain(src, spec.chain, spec.seed, rate);
    if (spec.matchTo) {
      const ref = await renderChain(src, spec.matchTo, spec.seed, rate);
      const g = matchGain(rms(channels(ref)), rms(channels(out)));
      // Never let the match push past full scale: if it would, both versions are at the source's level anyway.
      let peak = 0;
      for (const c of channels(out)) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
      const k = peak * g > 0.98 ? 0.98 / peak : g;
      for (const c of channels(out)) for (let i = 0; i < c.length; i++) c[i] *= k;
    }
    return out;
  })();
  p.catch(() => cache.delete(key));
  cache.set(key, p);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return p;
}

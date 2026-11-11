// Closed-set chord recognizer (GUITAR_DEEPENING §6, P1). Given a strum and the question's candidate chords, say
// which one sounded — or "play it again" when the evidence is not clear. It never guesses: the best candidate must
// beat the second by a margin. Pure (no Web Audio): samples or magnitude spectra in, a verdict out.
//
// Pipeline: Hann-windowed FFT frames 60–450 ms after the strum onset (8192 points at 48 kHz, hop 25 ms) → mean
// magnitude spectrum → harmonic pitch salience 70–1600 Hz (a pitch counts only when its own fundamental is a
// spectral peak; partials 1–4 are credited to it) → 12-bin chroma. The sounding bass is the lowest salient pitch in
// 70–330 Hz. Each candidate's template is its pitch classes smoothed with a plucked-string harmonic profile; the score
// is cosine(chroma, template) plus a bonus when the bass agrees (that is what tells C from C/E from C/G).

import { ringCheck } from './chroma';

export type ChordQuality = 'M' | 'm' | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim7' | 'sus2' | 'sus4' | '5' | '9' | 'add9';

/** A candidate chord: root pitch class, quality, optional bass pitch class (inversions / slash chords). */
export interface ChordCandidate {
  root: number;
  quality: ChordQuality;
  bass?: number;
  label?: string;
}

/** Intervals of each quality from the root. */
export const QUALITY_INTS: Record<ChordQuality, number[]> = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '5': [0, 7],
  '9': [0, 4, 7, 10, 2],
  add9: [0, 4, 7, 2],
};

const pc12 = (n: number): number => ((Math.round(n) % 12) + 12) % 12;
export const candidatePcs = (c: ChordCandidate): number[] => QUALITY_INTS[c.quality].map((i) => pc12(c.root + i));

// ⚙ calibrate with real takes (GUITAR_DEEPENING §6.4 P3: steel, nylon, clean electric).
/** The best candidate must beat the second by this much (score units: cosine + bass bonus). */
export const RECOGNIZE_MARGIN = 0.04;
/** Below this cosine for the best candidate nothing chord-like was heard. */
export const RECOGNIZE_MIN_SCORE = 0.6;
/** Added to a candidate's score when the heard bass is its bass note (root when no slash bass). */
export const BASS_BONUS = 0.12;
/** A salient pitch must reach this share of the strongest one to count (bass search). */
export const BASS_MIN_SHARE = 0.25;
/** Mean-spectrum peak must be this many times the spectral median to be a tone at all (noise / mute → unsure). */
export const TONAL_MIN_RATIO = 30;

/** Plucked-string harmonic profile for the templates: weight of partial h (1..6) — a pitch class at +12·log2(h). */
const PROFILE = [1, 0.3, 0.15, 0.1, 0.05, 0.03];
/** ⚙ Expected partial h amplitude (sqrt-compressed) relative to the fundamental, for the partial subtraction. */
const PARTIAL_EXPECT = [1, 0.75, 0.6, 0.5, 0.45, 0.4];
/** ⚙ How much of that expected partial is taken off (0 = none, 1 = all). */
const PARTIAL_SUBTRACT = 0.85;

export interface RecognizeOpts {
  /** Analysis window after the onset (ms); default 60–450. */
  fromMs?: number;
  toMs?: number;
  fftSize?: number;
  hopMs?: number;
}

export type RecognizeInput =
  | { samples: Float32Array; sampleRate: number; /** Strum onset inside the buffer (s, default 0). */ onset?: number }
  | { spectra: ArrayLike<number>[]; sampleRate: number; fftSize: number; /** Spectra in dB (AnalyserNode) instead of linear magnitude. */ db?: boolean };

export interface RecognizeResult {
  status: 'ok' | 'unsure';
  best?: { index: number; root: number; quality: ChordQuality; bass: number; confidence: number };
  scores: number[];
  /** The heard bass pitch class, or null. */
  bass: number | null;
  /** Pitch classes of the best (or top-scoring) candidate that did not ring. */
  missing: number[];
  chroma: number[];
}

// ───────────────────────────── FFT ─────────────────────────────

/** In-place radix-2 FFT (re, im of length 2^k). */
function fft(re: Float64Array, im: Float64Array): void {
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
    const a = (-2 * Math.PI) / len;
    const wr = Math.cos(a);
    const wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/** Mean magnitude spectrum (length fftSize/2) of Hann frames between fromMs and toMs after the onset. */
export function meanSpectrum(samples: Float32Array, sampleRate: number, onset = 0, opts: RecognizeOpts = {}): Float64Array {
  const N = opts.fftSize ?? 8192;
  const from = Math.round((onset + (opts.fromMs ?? 60) / 1000) * sampleRate);
  const to = Math.round((onset + (opts.toMs ?? 450) / 1000) * sampleRate);
  const hop = Math.max(1, Math.round(((opts.hopMs ?? 25) / 1000) * sampleRate));
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const out = new Float64Array(N / 2);
  let frames = 0;
  // At least one frame, even when the window is shorter than the FFT (zero-padded past the buffer end).
  for (let s = from; frames === 0 || s + N <= Math.max(to, from + N); s += hop) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = (samples[s + i] ?? 0) * win[i];
    fft(re, im);
    for (let k = 0; k < N / 2; k++) out[k] += Math.hypot(re[k], im[k]);
    frames++;
    if (s + N > to) break;
  }
  for (let k = 0; k < out.length; k++) out[k] /= frames;
  return out;
}

// ───────────────────────────── pitch salience → chroma, bass ─────────────────────────────

const LO_MIDI = 37; // ≈ 69 Hz
const HI_MIDI = 91; // ≈ 1568 Hz
const midiHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Spectral peaks mapped to semitones: each local maximum (over ±2 bins) is placed by parabolic interpolation and given
 * to its nearest semitone when within 35 cents — one peak, one semitone, so a Hann main lobe never lights the
 * neighbours. Returns the (sqrt-compressed) peak amplitude per MIDI pitch from LO_MIDI to `hiMidi`.
 */
function semitonePeaks(mag: ArrayLike<number>, binHz: number, hiMidi: number): number[] {
  const n = hiMidi - LO_MIDI + 1;
  const out = new Array<number>(n).fill(0);
  const kLo = Math.max(2, Math.floor((midiHz(LO_MIDI) * 0.97) / binHz));
  const kHi = Math.min(mag.length - 3, Math.ceil((midiHz(hiMidi) * 1.03) / binHz));
  for (let k = kLo; k <= kHi; k++) {
    const v = mag[k];
    if (!(v > 0) || v < mag[k - 1] || v < mag[k + 1] || v < mag[k - 2] || v < mag[k + 2]) continue;
    const a = Math.sqrt(Math.max(1e-12, mag[k - 1]));
    const b = Math.sqrt(v);
    const c = Math.sqrt(Math.max(1e-12, mag[k + 1]));
    const den = a - 2 * b + c;
    const d = den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0;
    const f = (k + d) * binHz;
    const midi = 69 + 12 * Math.log2(f / 440);
    const m = Math.round(midi);
    if (Math.abs(midi - m) > 0.35 || m < LO_MIDI || m > hiMidi) continue;
    const amp = Math.sqrt(b * b - 0.25 * (a - c) * d); // interpolated peak (sqrt-compressed magnitude)
    out[m - LO_MIDI] = Math.max(out[m - LO_MIDI], Number.isFinite(amp) ? amp : b);
  }
  return out;
}

/**
 * Salience per MIDI pitch LO..HI. A pitch counts only when its own fundamental is a peak; a peak a lower note's
 * partial explains (h = 2..6) keeps only what that partial is not expected to carry (PARTIAL_SUBTRACT), so the 5th
 * harmonic of A (C♯) does not read as a played C♯ over an A minor chord. Partials 2–4 are then credited to the pitch.
 */
export function pitchSalience(mag: ArrayLike<number>, sampleRate: number, fftSize: number): number[] {
  const binHz = sampleRate / fftSize;
  const top = HI_MIDI + 24; // partials up to the 4th of the top pitch
  const pk = semitonePeaks(mag, binHz, top);
  const n = HI_MIDI - LO_MIDI + 1;
  const gmax = Math.max(0, ...pk.slice(0, n));
  const res = pk.slice(0, n);
  for (let i = 0; i < n; i++) {
    if (res[i] < 0.08 * gmax) continue;
    for (let h = 2; h <= 6; h++) {
      const j = i + Math.round(12 * Math.log2(h));
      if (j < n) res[j] = Math.max(0, res[j] - Math.min(res[i], pk[i]) * PARTIAL_EXPECT[h - 1] * PARTIAL_SUBTRACT);
    }
  }
  const out: number[] = [];
  const w = [1, 0.5, 0.33, 0.25];
  for (let i = 0; i < n; i++) {
    if (res[i] < 0.08 * gmax) {
      out.push(0);
      continue;
    }
    const own = pk[i] > 0 ? res[i] / pk[i] : 0;
    let s = res[i];
    for (let h = 2; h <= 4; h++) {
      const j = i + Math.round(12 * Math.log2(h));
      if (midiHz(LO_MIDI + i) * h < 1600 * 1.06 && j < pk.length) s += own * w[h - 1] * pk[j];
    }
    out.push(s);
  }
  return out;
}

/** 12-bin chroma (max = 1) from a magnitude spectrum, through the harmonic salience. */
export function chromaFromMagnitude(mag: ArrayLike<number>, sampleRate: number, fftSize: number): number[] {
  const sal = pitchSalience(mag, sampleRate, fftSize);
  const c = new Array<number>(12).fill(0);
  sal.forEach((v, i) => (c[pc12(LO_MIDI + i)] += v));
  const max = Math.max(...c);
  return max > 0 ? c.map((x) => x / max) : c;
}

/** The sounding bass pitch class: the lowest salient pitch in 70–330 Hz (null when none is clear). */
export function bassFromMagnitude(mag: ArrayLike<number>, sampleRate: number, fftSize: number): number | null {
  const sal = pitchSalience(mag, sampleRate, fftSize);
  const max = Math.max(...sal);
  if (max <= 0) return null;
  const top = 64; // ≈ 330 Hz
  for (let m = LO_MIDI; m <= top; m++) {
    const v = sal[m - LO_MIDI];
    if (v < BASS_MIN_SHARE * max) continue;
    // A local salience maximum (a neighbour semitone's skirt is not a new note).
    const prev = sal[m - LO_MIDI - 1] ?? 0;
    const next = sal[m - LO_MIDI + 1] ?? 0;
    if (v >= prev && v >= next) return pc12(m);
  }
  return null;
}

/** Peak / median of the 70–1600 Hz band: tones are peaky, a muted chuck or noise is flat. */
function tonality(mag: ArrayLike<number>, sampleRate: number, fftSize: number): number {
  const binHz = sampleRate / fftSize;
  const xs: number[] = [];
  for (let k = Math.floor(70 / binHz); k <= Math.ceil(1600 / binHz) && k < mag.length; k++) xs.push(mag[k]);
  if (!xs.length) return 0;
  const max = Math.max(...xs);
  const sorted = [...xs].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  return med > 0 ? max / med : max > 0 ? Infinity : 0;
}

// ───────────────────────────── templates and decision ─────────────────────────────

/** A candidate's chroma template: its pitch classes with the plucked-string harmonic profile, max = 1. */
export function chordTemplate(c: ChordCandidate): number[] {
  const t = new Array<number>(12).fill(0);
  for (const p of candidatePcs(c)) PROFILE.forEach((w, h) => (t[pc12(p + 12 * Math.log2(h + 1))] += w));
  const max = Math.max(...t);
  return t.map((x) => x / max);
}

/**
 * Centred cosine (Pearson correlation) of chroma and template: energy on a class the chord does not have counts
 * against it — that is what separates A from Am when the A's 5th partial leaks a little C♯ into the A minor.
 */
function cosine(a: number[], b: number[]): number {
  const ma = a.reduce((x, y) => x + y, 0) / 12;
  const mb = b.reduce((x, y) => x + y, 0) / 12;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < 12; i++) {
    ab += (a[i] - ma) * (b[i] - mb);
    aa += (a[i] - ma) ** 2;
    bb += (b[i] - mb) ** 2;
  }
  return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 0;
}

/** Decide among the candidates from a chroma vector and the heard bass (null = unknown). */
export function recognizeFromChroma(chroma: number[], bassPc: number | null, candidates: ChordCandidate[]): RecognizeResult {
  const cos = candidates.map((c) => cosine(chroma, chordTemplate(c)));
  const scores = candidates.map((c, i) => Math.round((cos[i] + (bassPc !== null && bassPc === pc12(c.bass ?? c.root) ? BASS_BONUS : 0)) * 1e4) / 1e4);
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const bi = order[0];
  const base: RecognizeResult = { status: 'unsure', scores, bass: bassPc, missing: bi !== undefined ? ringCheck(chroma, candidatePcs(candidates[bi])).missing : [], chroma };
  if (bi === undefined || Math.max(...chroma) <= 0 || cos[bi] < RECOGNIZE_MIN_SCORE) return base;
  const second = order.length > 1 ? scores[order[1]] : 0;
  const margin = scores[bi] - second;
  if (margin < RECOGNIZE_MARGIN) return base;
  const c = candidates[bi];
  return { ...base, status: 'ok', best: { index: bi, root: pc12(c.root), quality: c.quality, bass: pc12(c.bass ?? c.root), confidence: Math.round(margin * 1000) / 1000 } };
}

/** Recognize a strum among the question's candidates. "unsure" means: ask the player to play it again. */
export function recognizeChord(input: RecognizeInput, candidates: ChordCandidate[], opts: RecognizeOpts = {}): RecognizeResult {
  let mag: ArrayLike<number>;
  let sr: number;
  let N: number;
  if ('samples' in input) {
    N = opts.fftSize ?? 8192;
    sr = input.sampleRate;
    mag = meanSpectrum(input.samples, sr, input.onset ?? 0, { ...opts, fftSize: N });
  } else {
    N = input.fftSize;
    sr = input.sampleRate;
    const acc = new Float64Array(input.spectra[0]?.length ?? 0);
    for (const s of input.spectra) for (let k = 0; k < acc.length; k++) acc[k] += input.db ? (Number.isFinite(s[k]) ? Math.pow(10, s[k] / 20) : 0) : s[k];
    for (let k = 0; k < acc.length; k++) acc[k] /= Math.max(1, input.spectra.length);
    mag = acc;
  }
  const empty = new Array<number>(12).fill(0);
  if (tonality(mag, sr, N) < TONAL_MIN_RATIO) return { status: 'unsure', scores: candidates.map(() => 0), bass: null, missing: [], chroma: empty };
  return recognizeFromChroma(chromaFromMagnitude(mag, sr, N), bassFromMagnitude(mag, sr, N), candidates);
}

// Chords and key of the player's own recording (SPEC-MY-SONG "chord extraction"), offline and on the device:
//
//   1. chroma: Hann frames of a ~11 kHz copy (4096 points ≈ 2.7 Hz bins, hop 1024 ≈ 93 ms), 105 Hz–1.8 kHz mapped to
//      pitch classes with their partials (mixChroma), and the lowest clear pitch (the bass, chordRecognize);
//   2. one chroma per beat of the detected beat grid (energy-weighted frames whose centre falls in the beat), or per
//      half second when there is no steady beat;
//   3. an HMM-style smoother (Viterbi) over 60 chord states (12 roots × major, minor, 7, maj7, m7) and "no chord":
//      emission = the centred cosine of the beat's chroma with each chord's template (+ a bass bonus, sevenths a hair
//      dearer than triads), transition = stay, with a change cheaper on a bar line when the bar is known;
//   4. segments = runs of one state; confidence per segment from how well its chord fits (the cosine) and by how much
//      it beats the next-best different chord (the margin). Only confident segments are measured against;
//   5. the key, major or minor: Krumhansl–Kessler profiles against the whole recording's chroma (+ the melody's notes),
//      with a nudge to the key whose tonic chord opens, closes or dominates the chord track — a minor song is named
//      from its own tonic (A minor: C is ♭3), not from its relative major.
// Pure apart from the optional async yields of the analysis.

import { chordTemplate, type ChordQuality } from './chordRecognize';
import { fft } from './beatTrack';
import { downsample } from './yin';

export type TrackQuality = 'M' | 'm' | '7' | 'maj7' | 'm7';
export const TRACK_QUALITIES: TrackQuality[] = ['M', 'm', '7', 'maj7', 'm7'];
/** Chord tones (semitones above the root) per quality. */
export const TRACK_INTS: Record<TrackQuality, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
/** A segment at or above this confidence is measured against. */
export const CHORD_CONFIDENT = 0.5;

export interface ChordSeg {
  start: number;
  end: number;
  /** null = no chord (silence, noise, drums only). */
  root: number | null;
  q: TrackQuality | null;
  /** 0..1 */
  conf: number;
}
export interface SongKey {
  tonic: number;
  minor: boolean;
  /** 0..1: how far the best key's correlation stands above the next. */
  conf: number;
}
export interface ChordTrack {
  segs: ChordSeg[];
  key: SongKey | null;
  /** Share of the analysed time inside confident chord segments. */
  coverage: number;
}

const mod12 = (n: number) => ((Math.round(n) % 12) + 12) % 12;
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const QSYM: Record<TrackQuality, string> = { M: '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7' };
/** A chord symbol (C, Am, G7, Fmaj7, Dm7) or "?" for no chord. */
export const chordName = (s: Pick<ChordSeg, 'root' | 'q'>) => (s.root === null || s.q === null ? '?' : `${NAMES[s.root]}${QSYM[s.q]}`);
/** Pitch classes of a segment's chord. */
export const segPcs = (s: Pick<ChordSeg, 'root' | 'q'>) => (s.root === null || s.q === null ? [] : TRACK_INTS[s.q].map((i) => mod12(s.root! + i)));

/** Centred cosine (Pearson) of two 12-vectors. */
export function pearson(a: number[], b: number[]): number {
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

/**
 * Chroma of a band mix: every bin from 105 Hz (above the kick drum) to 1.8 kHz adds its compressed magnitude to its nearest pitch class
 * (less the further it sits from the semitone). Partials are kept — the chord templates carry the same partials
 * (chordRecognize.chordTemplate) — because on a mix the bass's 3rd partial is often the chord's 5th, and removing it
 * (the strum recognizer's salience) leaves a minor chord without its 5th.
 */
const BIN_MAPS = new Map<string, { k: number; pc: number; w: number }[]>();
export function mixChroma(mag: ArrayLike<number>, sampleRate: number, fftSize: number): number[] {
  const c = new Array<number>(12).fill(0);
  const id = `${sampleRate}:${fftSize}`;
  let map = BIN_MAPS.get(id);
  if (!map) {
    map = [];
    const binHz = sampleRate / fftSize;
    for (let k = Math.ceil(105 / binHz); k <= Math.floor(1800 / binHz) && k < fftSize / 2; k++) {
      const m = 69 + 12 * Math.log2((k * binHz) / 440);
      const dev = Math.abs(m - Math.round(m));
      if (dev <= 0.4) map.push({ k, pc: mod12(m), w: 1 - dev / 0.4 });
    }
    BIN_MAPS.set(id, map);
  }
  for (const b of map) c[b.pc] += Math.sqrt(mag[b.k]) * b.w;
  const mx = Math.max(...c);
  return mx > 0 ? c.map((v) => v / mx) : c;
}

/** The bass: the lowest clear spectral peak in 55–260 Hz (≥ 35 % of the band's strongest), as a pitch class. */
export function lowPeak(mag: ArrayLike<number>, sampleRate: number, fftSize: number): number | null {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(2, Math.ceil(55 / binHz));
  const hi = Math.min(mag.length - 3, Math.floor(260 / binHz));
  let mx = 0;
  for (let k = lo; k <= hi; k++) mx = Math.max(mx, mag[k]);
  if (mx <= 0) return null;
  for (let k = lo; k <= hi; k++) {
    const v = mag[k];
    if (v >= 0.35 * mx && v >= mag[k - 1] && v >= mag[k + 1] && v >= mag[k - 2] && v >= mag[k + 2]) return mod12(69 + 12 * Math.log2((k * binHz) / 440));
  }
  return null;
}

export interface ChromaFrames {
  /** Frame centres (s). */
  t: number[];
  chroma: number[][];
  bass: (number | null)[];
  /** Frame energy (mean square). */
  energy: number[];
}

/** Chroma, bass and energy of a recording, one frame every ~93 ms (≤ maxSec). */
export async function chromaFrames(samples: Float32Array, sampleRate: number, o: { maxSec?: number; onProgress?: (p: number) => void; yieldEvery?: number } = {}): Promise<ChromaFrames> {
  const maxSec = o.maxSec ?? 240;
  const f = Math.max(1, Math.floor(sampleRate / 11025));
  const x = downsample(samples.subarray(0, Math.min(samples.length, Math.floor(maxSec * sampleRate))), f);
  const sr = sampleRate / f;
  const N = 4096;
  const hop = 1024;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const out: ChromaFrames = { t: [], chroma: [], bass: [], energy: [] };
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const mag = new Float64Array(N / 2);
  const total = Math.max(1, Math.floor((x.length - N) / hop) + 1);
  let k = 0;
  for (let s = 0; s + N <= x.length; s += hop, k++) {
    let e = 0;
    for (let i = 0; i < N; i++) {
      const v = x[s + i];
      e += v * v;
      re[i] = v * win[i];
      im[i] = 0;
    }
    e /= N;
    out.t.push((s + N / 2) / sr);
    out.energy.push(e);
    if (e < 1e-7) {
      out.chroma.push(new Array(12).fill(0));
      out.bass.push(null);
    } else {
      fft(re, im);
      for (let i = 0; i < N / 2; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
      out.chroma.push(mixChroma(mag, sr, N));
      out.bass.push(lowPeak(mag, sr, N));
    }
    if (o.yieldEvery !== 0 && k % (o.yieldEvery ?? 60) === 59) {
      o.onProgress?.(k / total);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  o.onProgress?.(1);
  return out;
}

interface Slot {
  start: number;
  end: number;
  chroma: number[];
  bass: number | null;
  /** Mean frame energy relative to the loudest slot (0..1). */
  level: number;
  /** A bar line falls at this slot's start (meter known). */
  downbeat: boolean;
}

/** One chroma per beat (or per half second without beats). */
function slotsOf(cf: ChromaFrames, beats: number[] | null, duration: number, meter: { meter: number; downbeat: number } | null): Slot[] {
  const edges: number[] = [];
  if (beats && beats.length >= 4) {
    const ibi = (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
    if (beats[0] > ibi * 0.6) edges.push(Math.max(0, beats[0] - ibi));
    edges.push(...beats);
    edges.push(Math.min(duration, beats[beats.length - 1] + ibi));
  } else for (let t = 0; t <= duration + 1e-9; t += 0.5) edges.push(t);
  const slots: Slot[] = [];
  // slot i is beat i − pre (a slot before the first beat has index −1)
  const pre = beats && beats.length >= 4 && edges[0] < beats[0] ? 1 : 0;
  for (let i = 0; i + 1 < edges.length; i++) {
    const [a, b] = [edges[i], edges[i + 1]];
    const c = new Array(12).fill(0);
    const bassVotes = new Array(12).fill(0);
    let w = 0;
    let e = 0;
    let n = 0;
    // frames whose (Hann) window lies mostly inside the slot: the next chord's attack must not leak into this beat
    for (let j = 0; j < cf.t.length; j++) {
      if (cf.t[j] < a + 0.09 || cf.t[j] > b - 0.09) continue;
      const wj = Math.sqrt(cf.energy[j]);
      for (let p = 0; p < 12; p++) c[p] += cf.chroma[j][p] * wj;
      if (cf.bass[j] !== null) bassVotes[cf.bass[j]!] += wj;
      w += wj;
      e += cf.energy[j];
      n++;
    }
    // A beat shorter than a frame hop takes the nearest frame.
    if (!n && cf.t.length) {
      const mid = (a + b) / 2;
      let j = 0;
      for (let q = 1; q < cf.t.length; q++) if (Math.abs(cf.t[q] - mid) < Math.abs(cf.t[j] - mid)) j = q;
      for (let p = 0; p < 12; p++) c[p] = cf.chroma[j][p];
      if (cf.bass[j] !== null) bassVotes[cf.bass[j]!] = 1;
      e = cf.energy[j];
      n = 1;
      w = 1;
    }
    const mx = Math.max(...c);
    const bv = Math.max(...bassVotes);
    const beatIdx = i - pre;
    slots.push({ start: a, end: b, chroma: mx > 0 ? c.map((v) => v / mx) : c, bass: bv > 0.35 * w ? bassVotes.indexOf(bv) : null, level: n ? e / n : 0, downbeat: !!meter && beatIdx >= 0 && (beatIdx - meter.downbeat) % meter.meter === 0 });
  }
  const top = Math.max(1e-12, ...slots.map((s) => s.level));
  for (const s of slots) s.level = s.level / top;
  return slots;
}

const STATES: { root: number; q: TrackQuality; tpl: number[] }[] = [];
for (let r = 0; r < 12; r++) for (const q of TRACK_QUALITIES) STATES.push({ root: r, q, tpl: chordTemplate({ root: r, quality: q as ChordQuality }) });
const NO_CHORD = STATES.length;
/** Emission weight (log-likelihood per unit of cosine), the bass bonus, the price of a 7th, "no chord"'s fixed fit. */
const LAMBDA = 10;
const BASS_BONUS = 0.1;
const SEVENTH_COST = 0.04;
const N_FIT = 0.3;
const minorish = (q: TrackQuality) => q === 'm' || q === 'm7';

/** Fit of every state for one slot (cosine + bass − 7th price; "no chord" fixed, and certain in silence). */
function fits(s: Slot): number[] {
  const quiet = s.level < 0.02 || Math.max(...s.chroma) <= 0;
  const out = STATES.map((st) => (quiet ? -1 : pearson(s.chroma, st.tpl) + (s.bass !== null && s.bass === st.root ? BASS_BONUS : 0) - (st.q === '7' || st.q === 'maj7' || st.q === 'm7' ? SEVENTH_COST : 0)));
  out.push(quiet ? 1 : N_FIT);
  return out;
}

/** Viterbi over the slots: the most likely chord per slot. */
function viterbi(F: number[][], slots: Slot[]): number[] {
  const S = NO_CHORD + 1;
  const T = F.length;
  if (!T) return [];
  const pStay = (t: number) => (slots[t].downbeat ? 0.7 : slots.some((x) => x.downbeat) ? 0.95 : 0.88);
  let prev = F[0].map((f) => LAMBDA * f);
  const back: Int16Array[] = [];
  for (let t = 1; t < T; t++) {
    const ps = pStay(t);
    const stay = Math.log(ps);
    const move = Math.log((1 - ps) / (S - 1));
    let bestI = 0;
    for (let i = 1; i < S; i++) if (prev[i] > prev[bestI]) bestI = i;
    const cur = new Array<number>(S);
    const bk = new Int16Array(S);
    for (let j = 0; j < S; j++) {
      const viaStay = prev[j] + stay;
      const viaMove = prev[bestI] + move;
      if (bestI !== j && viaMove > viaStay) {
        cur[j] = viaMove + LAMBDA * F[t][j];
        bk[j] = bestI;
      } else {
        cur[j] = viaStay + LAMBDA * F[t][j];
        bk[j] = j;
      }
    }
    back.push(bk);
    prev = cur;
  }
  let j = 0;
  for (let i = 1; i < S; i++) if (prev[i] > prev[j]) j = i;
  const path = new Array<number>(T);
  path[T - 1] = j;
  for (let t = T - 1; t > 0; t--) {
    j = back[t - 1][j];
    path[t - 1] = j;
  }
  return path;
}

/** The chord track from chroma frames and the beat grid (null = no steady beat: half-second slots). */
export function chordTrackFrom(cf: ChromaFrames, beats: number[] | null, duration: number, meter: { meter: number; downbeat: number } | null = null): ChordSeg[] {
  const slots = slotsOf(cf, beats, duration, meter);
  const F = slots.map(fits);
  const path = viterbi(F, slots);
  const segs: ChordSeg[] = [];
  let a = 0;
  for (let t = 1; t <= path.length; t++) {
    if (t < path.length && path[t] === path[a]) continue;
    const st = path[a];
    let fit = 0;
    let margin = 0;
    for (let k = a; k < t; k++) {
      fit += F[k][st];
      if (st !== NO_CHORD) {
        // the next best chord that is not this one (and not just this chord with / without its 7th)
        const mine = STATES[st];
        let second = -1;
        for (let i = 0; i < NO_CHORD; i++) {
          if (i === st) continue;
          const o = STATES[i];
          if (o.root === mine.root && minorish(o.q) === minorish(mine.q)) continue;
          second = Math.max(second, F[k][i]);
        }
        margin += F[k][st] - second;
      }
    }
    const n = t - a;
    const conf = st === NO_CHORD ? 0 : Math.max(0, Math.min(1, (fit / n - 0.45) / 0.3)) * Math.max(0, Math.min(1, margin / n / 0.12));
    segs.push({ start: slots[a].start, end: slots[t - 1].end, root: st === NO_CHORD ? null : STATES[st].root, q: st === NO_CHORD ? null : STATES[st].q, conf: Math.round(conf * 100) / 100 });
    a = t;
  }
  // adjacent segments of the same chord join (a "no chord" beat between two identical chords too)
  const out: ChordSeg[] = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last.root === s.root && last.q === s.q) {
      const w1 = last.end - last.start;
      const w2 = s.end - s.start;
      last.conf = Math.round(((last.conf * w1 + s.conf * w2) / (w1 + w2)) * 100) / 100;
      last.end = s.end;
    } else out.push({ ...s });
  }
  return out;
}

// ───────────────────────────── the key, major or minor ─────────────────────────────

const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * The key from a pitch-class weight vector (whole-recording chroma and / or melody notes) and, when given, the chord
 * track: the best of 24 Krumhansl–Kessler correlations, nudged (+0.06 each) towards the key whose tonic chord opens,
 * closes or lasts longest among the confident segments. null when there is nothing to judge.
 */
export function detectKey(weights: number[], segs: ChordSeg[] = []): SongKey | null {
  if (!(Math.max(...weights) > 0)) return null;
  const conf = segs.filter((s) => s.root !== null && s.conf >= CHORD_CONFIDENT);
  const dur = new Map<string, number>();
  for (const s of conf) {
    const k = `${s.root}:${s.q === 'm' || s.q === 'm7' ? 'm' : 'M'}`;
    dur.set(k, (dur.get(k) ?? 0) + s.end - s.start);
  }
  const longest = [...dur.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const tri = (s: ChordSeg | undefined) => (s ? `${s.root}:${s.q === 'm' || s.q === 'm7' ? 'm' : 'M'}` : '');
  const first = tri(conf[0]);
  const last = tri(conf[conf.length - 1]);
  const scored: { tonic: number; minor: boolean; v: number }[] = [];
  for (let t = 0; t < 12; t++)
    for (const minor of [false, true]) {
      const prof = minor ? KK_MINOR : KK_MAJOR;
      let v = pearson(weights, Array.from({ length: 12 }, (_, i) => prof[mod12(i - t)]));
      const me = `${t}:${minor ? 'm' : 'M'}`;
      if (me === first) v += 0.06;
      if (me === last) v += 0.06;
      if (me === longest) v += 0.06;
      scored.push({ tonic: t, minor, v });
    }
  scored.sort((a, b) => b.v - a.v);
  const [b0, b1] = scored;
  return { tonic: b0.tonic, minor: b0.minor, conf: Math.round(Math.max(0, Math.min(1, (b0.v - b1.v) / 0.15)) * 100) / 100 };
}

/** Pitch-class weights of a recording: the energy-weighted mean chroma of its frames, plus melody notes by duration. */
export function keyWeights(cf: ChromaFrames | null, notes: { midi: number; dur: number }[] = []): number[] {
  const w = new Array(12).fill(0);
  if (cf) {
    let tot = 0;
    cf.chroma.forEach((c, j) => {
      const e = Math.sqrt(cf.energy[j]);
      for (let p = 0; p < 12; p++) w[p] += c[p] * e;
      tot += e;
    });
    if (tot > 0) for (let p = 0; p < 12; p++) w[p] /= tot;
  }
  const h = new Array(12).fill(0);
  for (const n of notes) h[mod12(n.midi)] += n.dur;
  const hm = Math.max(...h);
  if (hm > 0) for (let p = 0; p < 12; p++) w[p] += (0.5 * h[p]) / hm;
  return w;
}

/** The whole chord analysis of a recording (mono samples, the beat grid when confident). */
export async function analyseChords(samples: Float32Array, sampleRate: number, beats: number[] | null, meter: { meter: number; downbeat: number } | null, melody: { midi: number; dur: number }[], o: { maxSec?: number; onProgress?: (p: number) => void } = {}): Promise<ChordTrack> {
  const duration = Math.min(samples.length / sampleRate, o.maxSec ?? 240);
  const cf = await chromaFrames(samples, sampleRate, { maxSec: o.maxSec, onProgress: o.onProgress });
  const segs = chordTrackFrom(cf, beats, duration, meter);
  const key = detectKey(keyWeights(cf, melody), segs);
  const covered = segs.filter((s) => s.conf >= CHORD_CONFIDENT && s.root !== null).reduce((a, s) => a + s.end - s.start, 0);
  return { segs, key, coverage: duration > 0 ? Math.round((covered / duration) * 100) / 100 : 0 };
}

/** The chord sounding at song time t (a confident one only, unless `any`). */
export function chordAt(track: ChordTrack | null | undefined, t: number, any = false): ChordSeg | null {
  if (!track) return null;
  const s = track.segs.find((x) => t >= x.start && t < x.end);
  return s && s.root !== null && (any || s.conf >= CHORD_CONFIDENT) ? s : null;
}

/** Of a stretch of the song: the share of its time under a confident chord (0..1). */
export function chordCoverage(track: ChordTrack | null | undefined, start: number, end: number): number {
  if (!track || end <= start) return 0;
  let c = 0;
  for (const s of track.segs) if (s.root !== null && s.conf >= CHORD_CONFIDENT) c += Math.max(0, Math.min(end, s.end) - Math.max(start, s.start));
  return c / (end - start);
}

// ───────────────────────────── measuring a take against the chords ─────────────────────────────

export interface ChordAlongGrade {
  /** Share of the measured onsets that fit the chord (null = nothing measurable). */
  fit: number | null;
  /** Onsets measured (under a confident chord). */
  measured: number;
  /** Onsets under no confident chord (not judged). */
  skipped: number;
}

/**
 * Keys / guitar against the chords: every onset (song seconds) under a confident chord is judged by what sounds just
 * after it. With chroma (a strum, both hands on the keys, MIDI chords): the chord's pitch classes must ring and carry
 * most of the energy (≥ 60 %), no strong pitch class outside it. With only a heard note (the strongest pitch by
 * microphone): that note must be a chord tone. Onsets under an unclear chord are skipped — never counted against.
 */
export function gradeChordsAlong(track: ChordTrack, heard: { onsets: number[]; frames?: { t: number; chroma?: number[] }[]; notes?: { midi: number; start: number }[] }, shift = 0): ChordAlongGrade {
  let ok = 0;
  let measured = 0;
  let skipped = 0;
  for (const on of heard.onsets) {
    const seg = chordAt(track, on - shift);
    if (!seg) {
      skipped++;
      continue;
    }
    const pcs = segPcs(seg);
    const cs = (heard.frames ?? []).filter((f) => f.chroma && f.t >= on + 0.04 && f.t <= on + 0.3).map((f) => f.chroma!);
    if (cs.length) {
      const c = new Array(12).fill(0);
      for (const x of cs) for (let p = 0; p < 12; p++) c[p] += x[p];
      const tot = c.reduce((a, b) => a + b, 0);
      if (tot <= 0) {
        skipped++;
        continue;
      }
      const inside = pcs.reduce((a, p) => a + c[p], 0) / tot;
      const mx = Math.max(...c);
      const strongOut = c.some((v, p) => !pcs.includes(p) && v >= 0.6 * mx);
      measured++;
      if (inside >= 0.6 && !strongOut) ok++;
      continue;
    }
    const n = (heard.notes ?? []).filter((x) => Math.abs(x.start - on) <= 0.12).sort((a, b) => Math.abs(a.start - on) - Math.abs(b.start - on))[0];
    if (!n) {
      skipped++;
      continue;
    }
    measured++;
    if (pcs.includes(mod12(n.midi))) ok++;
  }
  return { fit: measured >= 3 ? Math.round((ok / measured) * 1000) / 1000 : null, measured, skipped };
}

// ───────────────────────────── synthetic audio (tests, simulator) ─────────────────────────────

/** A synthetic band: chords (`[root pc, quality, beats]`) as harmonic piano-like tones with a bass root, a kick on every beat. */
export function synthChords(prog: [number, TrackQuality, number][], bpm: number, sampleRate = 22050, o: { melody?: number[]; noise?: number } = {}): Float32Array {
  const beat = 60 / bpm;
  const total = prog.reduce((a, c) => a + c[2], 0);
  const x = new Float32Array(Math.round((total * beat + 1) * sampleRate));
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const tone = (midi: number, t: number, len: number, amp: number) => {
    const s0 = Math.round(t * sampleRate);
    const n = Math.round(len * sampleRate);
    const f = 440 * 2 ** ((midi - 69) / 12);
    for (let h = 1; h <= 4; h++) {
      const w = (2 * Math.PI * f * h) / sampleRate;
      const a = amp / (h * h);
      for (let i = 0; i < n && s0 + i < x.length; i++) x[s0 + i] += a * Math.min(1, i / 60) * Math.exp(-i / (1.2 * sampleRate)) * Math.min(1, (n - i) / 300) * Math.sin(w * i);
    }
  };
  let b = 0;
  let mi = 0;
  for (const [root, q, beats] of prog) {
    const t = 0.5 + b * beat;
    for (const i of TRACK_INTS[q]) {
      const m = 55 + mod12(root + i - 55);
      tone(m, t, beats * beat * 0.95, 0.09);
    }
    tone(36 + mod12(root - 36), t, beats * beat * 0.95, 0.16);
    for (let k = 0; k < beats; k++) {
      const s = Math.round((t + k * beat) * sampleRate);
      for (let i = 0; i < 0.12 * sampleRate && s + i < x.length; i++) x[s + i] += 0.35 * Math.exp(-i / (0.03 * sampleRate)) * Math.sin(2 * Math.PI * (50 + 60 * Math.exp(-i / 300)) * (i / sampleRate));
      if (o.melody) {
        const m = o.melody[mi++ % o.melody.length];
        if (m > 0) tone(m, t + k * beat, beat * 0.8, 0.1);
      }
    }
    b += beats;
  }
  if (o.noise) for (let i = 0; i < x.length; i++) x[i] += o.noise * rnd();
  return x;
}

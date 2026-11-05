// Vocal technique (spec addendum P): measurable singing — holds, straight tone, vibrato, range,
// messa di voce, glides, melodies, leaps and faster transitions. Pure and deterministic: every metric
// is a function of YIN frames, unit-tested on synthetic tracks.

import { barryLine } from './barry';
import { MODE_STEPS, type ModeId } from './modes';
import { hzToMidi, midiToHz } from './pitch';
import type { SungFrame } from './sing';
import { segmentNotes } from './memory';

// ------------------------------------------------------------------ voice range (P.0)

export interface VoiceRange {
  low: number; // MIDI, comfortable lowest
  high: number; // MIDI, comfortable highest
}

/** Conservative default before calibration (octave-folded scoring makes it fit most voices). */
export const DEFAULT_RANGE: VoiceRange = { low: 55, high: 67 };
/** Smallest accepted range (semitones): an octave, so every pitch class has a place in it. */
export const MIN_RANGE = 12;

const voiced = (f: SungFrame, minConf = 0.8) => !!f.hz && f.confidence >= minConf && f.hz > 55 && f.hz < 1400;

/**
 * Comfortable range from a guided glide (down and up on "ah"): the 8th / 92nd percentile of the
 * confident pitches, rounded inward. Null when the take is unreliable (too little voice or < a sixth).
 */
export function rangeFromGlide(frames: SungFrame[]): VoiceRange | null {
  const ms = frames.filter((f) => voiced(f, 0.85)).map((f) => hzToMidi(f.hz!)).sort((a, b) => a - b);
  if (ms.length < 30) return null;
  const q = (p: number) => ms[Math.min(ms.length - 1, Math.max(0, Math.round(p * (ms.length - 1))))];
  const low = Math.ceil(q(0.08));
  const high = Math.floor(q(0.92));
  if (high - low < MIN_RANGE) return null;
  return { low, high };
}

/** Shift notes by octaves so they sit inside the range (intervals never change). */
export function fitToRange(midis: number[], range: VoiceRange): number[] {
  if (!midis.length) return midis;
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const mid = (range.low + range.high) / 2;
  let shift = Math.round((mid - (lo + hi) / 2) / 12) * 12;
  // Prefer fully inside; otherwise keep the centre closest.
  for (const s of [shift, shift - 12, shift + 12]) {
    if (lo + s >= range.low && hi + s <= range.high) {
      shift = s;
      break;
    }
  }
  return midis.map((m) => m + shift);
}

/** n notes spread evenly over the range (low → high), whole semitones. */
export function spreadOverRange(range: VoiceRange, n: number, margin = 1): number[] {
  const lo = range.low + margin;
  const hi = Math.max(lo, range.high - margin);
  if (n === 1) return [Math.round((lo + hi) / 2)];
  return Array.from({ length: n }, (_, i) => Math.round(lo + ((hi - lo) * i) / (n - 1)));
}

// ------------------------------------------------------------------ tracks

export interface TrackPoint {
  t: number;
  c: number; // cents from the target, octave-folded into (−600, 600]
  rms: number;
}

/** Cents track against a target (octave-insensitive), confident frames only. */
export function centsTrack(frames: SungFrame[], targetMidi: number, minConf = 0.8): TrackPoint[] {
  const out: TrackPoint[] = [];
  const th = midiToHz(targetMidi);
  for (const f of frames) {
    if (!voiced(f, minConf)) continue;
    let c = 1200 * Math.log2(f.hz! / th);
    c = ((((c + 600) % 1200) + 1200) % 1200) - 600;
    out.push({ t: f.t, c, rms: f.rms });
  }
  return out;
}

/** The longest stretch of voice, allowing gaps up to `gapSec`. */
export function longestVoiced(track: TrackPoint[], gapSec = 0.12): TrackPoint[] {
  let best: TrackPoint[] = [];
  let cur: TrackPoint[] = [];
  for (const p of track) {
    if (cur.length && p.t - cur[cur.length - 1].t > gapSec) {
      if (cur.length > best.length) best = cur;
      cur = [];
    }
    cur.push(p);
  }
  return cur.length > best.length ? cur : best;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const std = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Centred moving average over `win` seconds. */
export function trend(track: TrackPoint[], win = 0.4): number[] {
  const out: number[] = [];
  let a = 0;
  let b = 0;
  let sum = 0;
  for (let i = 0; i < track.length; i++) {
    while (b < track.length && track[b].t <= track[i].t + win / 2) sum += track[b++].c;
    while (track[a].t < track[i].t - win / 2) sum -= track[a++].c;
    out.push(sum / (b - a));
  }
  return out;
}

/** Least-squares slope (units of y per second). */
function slope(ts: number[], ys: number[]): number {
  const mt = mean(ts);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < ts.length; i++) {
    num += (ts[i] - mt) * (ys[i] - my);
    den += (ts[i] - mt) ** 2;
  }
  return den ? num / den : 0;
}

// ------------------------------------------------------------------ hold metrics (P.1)

export interface Vibrato {
  present: boolean;
  rate: number; // Hz
  extent: number; // ± cents (half peak-to-peak)
  regularity: number; // coefficient of variation (0 = perfectly even), max of period and extent CVs
  cycles: number;
  /** Vibrato jitter: mean cycle-to-cycle change of the period, relative (0.05 = 5 %). */
  jitter: number;
  /** Vibrato shimmer: mean cycle-to-cycle change of the extent, relative. */
  shimmer: number;
}

/** Vibrato from the detrended residual: cycles between upward zero crossings (with hysteresis). */
export function vibratoOf(track: TrackPoint[], residual: number[]): Vibrato {
  const none: Vibrato = { present: false, rate: 0, extent: 0, regularity: 0, cycles: 0, jitter: 0, shimmer: 0 };
  if (track.length < 10) return none;
  const hyst = 4;
  const ups: number[] = [];
  let state: 'lo' | 'hi' | null = null;
  for (let i = 0; i < residual.length; i++) {
    const r = residual[i];
    if (r > hyst && state !== 'hi') {
      if (state === 'lo') ups.push(i);
      state = 'hi';
    } else if (r < -hyst) state = 'lo';
  }
  if (ups.length < 4) return none;
  const periods: number[] = [];
  const extents: number[] = [];
  for (let k = 1; k < ups.length; k++) {
    const seg = residual.slice(ups[k - 1], ups[k]);
    periods.push(track[ups[k]].t - track[ups[k - 1]].t);
    extents.push((Math.max(...seg) - Math.min(...seg)) / 2);
  }
  const p = mean(periods);
  const e = mean(extents);
  const rate = p ? 1 / p : 0;
  const regularity = Math.max(std(periods) / (p || 1), std(extents) / (e || 1));
  const present = periods.length >= 3 && e >= 15 && rate >= 3.5 && rate <= 8.5;
  const c2c = (xs: number[], m: number) => (xs.length > 1 ? mean(xs.slice(1).map((x, i) => Math.abs(x - xs[i]))) / (m || 1) : 0);
  return { present, rate, extent: e, regularity, cycles: periods.length, jitter: c2c(periods, p), shimmer: c2c(extents, e) };
}

export interface HoldMetrics {
  unclear: boolean;
  voicedSec: number;
  settleMs: number | null; // from onset until the pitch stays within ±25 ¢ for 150 ms
  scoop: number; // signed cents at the onset (first 60 ms)
  intonation: number; // mean signed cents of the sustained part (vibrato centre)
  stability: number; // std of the residual (straight tone wobble)
  drift: number; // ¢/s of the slow trend
  vibrato: Vibrato;
  bestStretchSec: number; // longest stretch with the trend inside ±25 ¢
  loudnessRangeDb: number; // max − min of the smoothed level over the sustained part
  maxTrendDev: number; // largest |trend| over the sustained part
  /** Time (s, from onset) the vibrato starts / stops, when it does. */
  vibratoOnSec: number | null;
  vibratoOffSec: number | null;
  /** Every straight → vibrato / vibrato → straight change (s from the onset). */
  switches: { at: number; to: 'vib' | 'straight' }[];
  /** Vibrato in the first and second half of the sustained part (consistency under a swell). */
  halves: [Vibrato, Vibrato] | null;
}

const SETTLE_TOL = 25;
const SETTLE_HOLD = 0.15;

export function holdMetrics(frames: SungFrame[], targetMidi: number): HoldMetrics {
  const run = longestVoiced(centsTrack(frames, targetMidi));
  const voicedSec = run.length ? run[run.length - 1].t - run[0].t : 0;
  const empty: HoldMetrics = {
    unclear: true,
    voicedSec,
    settleMs: null,
    scoop: 0,
    intonation: 0,
    stability: 0,
    drift: 0,
    vibrato: { present: false, rate: 0, extent: 0, regularity: 0, cycles: 0, jitter: 0, shimmer: 0 },
    switches: [],
    halves: null,
    bestStretchSec: 0,
    loudnessRangeDb: 0,
    maxTrendDev: 0,
    vibratoOnSec: null,
    vibratoOffSec: null,
  };
  if (voicedSec < 0.6) return empty;
  const t0 = run[0].t;
  const tr = trend(run, 0.4);
  // Settle: first index from which |trend| ≤ tol holds for SETTLE_HOLD.
  let settleIdx = -1;
  for (let i = 0; i < run.length; i++) {
    let j = i;
    while (j < run.length && Math.abs(tr[j]) <= SETTLE_TOL) j++;
    if (j > i && run[j - 1].t - run[i].t >= SETTLE_HOLD) {
      settleIdx = i;
      break;
    }
    i = j;
  }
  const startOnset = run.filter((p) => p.t - t0 <= 0.06).map((p) => p.c);
  const scoop = mean(startOnset);
  const sustainFrom = settleIdx >= 0 ? settleIdx : Math.floor(run.length * 0.2);
  const body = run.slice(sustainFrom);
  const bodyTr = tr.slice(sustainFrom);
  const residual = body.map((p, i) => p.c - bodyTr[i]);
  const vib = vibratoOf(body, residual);
  const stability = std(residual);
  const intonation = mean(body.map((p) => p.c));
  const drift = slope(
    body.map((p) => p.t),
    bodyTr,
  );
  // Longest stretch with the trend in tune.
  let best = 0;
  let from = -1;
  for (let i = 0; i < run.length; i++) {
    if (Math.abs(tr[i]) <= SETTLE_TOL) {
      if (from < 0) from = i;
      best = Math.max(best, run[i].t - run[from].t);
    } else from = -1;
  }
  // Loudness range (dB of a 0.3 s moving RMS).
  const db = body.map((p) => 20 * Math.log10(Math.max(1e-4, p.rms)));
  const dbS = trend(
    body.map((p, i) => ({ t: p.t, c: db[i], rms: 0 })),
    0.3,
  );
  const loudnessRangeDb = dbS.length ? Math.max(...dbS) - Math.min(...dbS) : 0;
  const maxTrendDev = bodyTr.length ? Math.max(...bodyTr.map(Math.abs)) : 0;
  // Vibrato on / off: a sliding 0.45 s window of the residual's half peak-to-peak.
  let vibratoOnSec: number | null = null;
  let vibratoOffSec: number | null = null;
  const fullRes = run.map((p, i) => p.c - tr[i]);
  let wasOn = false;
  const switches: HoldMetrics['switches'] = [];
  let lastSwitch = -1;
  for (let i = 0; i < run.length; i++) {
    const w = fullRes.filter((_, k) => run[k].t >= run[i].t - 0.45 && run[k].t <= run[i].t);
    const on = w.length > 5 && (Math.max(...w) - Math.min(...w)) / 2 >= 15;
    const at = run[i].t - t0 - 0.2;
    if (on && !wasOn && vibratoOnSec === null && run[i].t - t0 > 0.45) vibratoOnSec = at;
    if (!on && wasOn && vibratoOnSec !== null && vibratoOffSec === null) vibratoOffSec = at;
    if (on !== wasOn && run[i].t - t0 > 0.45 && at - lastSwitch > 0.4) {
      switches.push({ at, to: on ? 'vib' : 'straight' });
      lastSwitch = at;
    }
    wasOn = on;
  }
  const half = Math.floor(body.length / 2);
  const halves: HoldMetrics['halves'] = body.length > 40 ? [vibratoOf(body.slice(0, half), residual.slice(0, half)), vibratoOf(body.slice(half), residual.slice(half))] : null;
  return {
    unclear: false,
    voicedSec,
    settleMs: settleIdx >= 0 ? Math.round((run[settleIdx].t - t0) * 1000) : null,
    scoop,
    intonation,
    stability,
    drift,
    vibrato: vib,
    bestStretchSec: best,
    loudnessRangeDb,
    maxTrendDev,
    vibratoOnSec,
    vibratoOffSec,
    switches,
    halves,
  };
}

/** Is there vibrato in this stretch of a take (≥ 2 cycles, ≥ 15 ¢)? Used per note in phrases. */
export function hasVibrato(frames: SungFrame[], targetMidi: number): boolean {
  const run = longestVoiced(centsTrack(frames, targetMidi));
  if (run.length < 15) return false;
  const tr = trend(run, 0.4);
  const res = run.map((p, i) => p.c - tr[i]);
  const v = vibratoOf(run, res);
  return v.cycles >= 2 && v.extent >= 15 && v.rate >= 3.5 && v.rate <= 8.5;
}

// ------------------------------------------------------------------ glide metrics

export interface GlideMetrics {
  unclear: boolean;
  /** Share of frame-to-frame moves that jump more than 70 ¢ (steps instead of a slide). */
  jumpiness: number;
  /** Share of moves in the main direction (1 = never turns back). */
  monotonic: number;
  /** Cents error of the landing (median of the last 0.3 s) against the end note. */
  landing: number;
}

export function glideMetrics(frames: SungFrame[], fromMidi: number, toMidi: number): GlideMetrics {
  const ms = frames.filter((f) => voiced(f)).map((f) => ({ t: f.t, m: hzToMidi(f.hz!) }));
  if (ms.length < 15) return { unclear: true, jumpiness: 1, monotonic: 0, landing: 0 };
  // Fold the octave so the start sits near fromMidi.
  const k = Math.round((fromMidi - ms[0].m) / 12) * 12;
  const m = ms.map((p) => ({ t: p.t, m: p.m + k }));
  const dir = Math.sign(toMidi - fromMidi) || 1;
  let jumps = 0;
  let along = 0;
  let moves = 0;
  for (let i = 1; i < m.length; i++) {
    const d = (m[i].m - m[i - 1].m) * 100;
    if (Math.abs(d) < 2) continue;
    moves++;
    if (Math.abs(d) > 70) jumps++;
    if (Math.sign(d) === dir) along++;
  }
  const tEnd = m[m.length - 1].t;
  const tail = m.filter((p) => p.t >= tEnd - 0.3).map((p) => p.m).sort((a, b) => a - b);
  const landing = (tail[tail.length >> 1] - toMidi) * 100;
  return { unclear: false, jumpiness: moves ? jumps / moves : 0, monotonic: moves ? along / moves : 1, landing };
}

// ------------------------------------------------------------------ melody metrics

export interface MelodyNote {
  target: number;
  cents: number | null; // signed, octave-folded; null = missed
  settleMs: number | null;
  overshoot: number; // cents beyond the target in the direction of travel, first 200 ms
  start: number | null;
}

export interface MelodyMetrics {
  unclear: boolean;
  notes: MelodyNote[];
  hit: number; // share of notes within ±50 ¢
  intonation: number; // mean |cents| of the hit notes
  transitionMs: number; // mean settle time from the start of each note (after the first)
  overshoot: number; // mean overshoot (cents)
  legato: number; // share of joins without a voice break (< 80 ms gap)
  timingMs: number | null; // mean |onset error| against an even grid (when a beat is given)
}

const fold = (c: number) => ((((c + 600) % 1200) + 1200) % 1200) - 600;

export function melodyMetrics(frames: SungFrame[], targets: number[], beatSec?: number): MelodyMetrics {
  const segs = segmentNotes(frames);
  const empty: MelodyMetrics = { unclear: true, notes: targets.map((t) => ({ target: t, cents: null, settleMs: null, overshoot: 0, start: null })), hit: 0, intonation: 0, transitionMs: 0, overshoot: 0, legato: 0, timingMs: null };
  if (!segs.length) return empty;
  // In-order alignment: each target takes the next segment within ±150 ¢ (pitch-class), skipping extras.
  const notes: MelodyNote[] = [];
  let j = 0;
  const matched: { i: number; seg: (typeof segs)[number] }[] = [];
  for (let i = 0; i < targets.length; i++) {
    let found = -1;
    for (let k = j; k < Math.min(segs.length, j + 3); k++) {
      const d = Math.abs(fold((segs[k].midi - targets[i]) * 100));
      if (d <= 150) {
        // Leave the segment to the next target when it is clearly that note (this one was skipped).
        const dn = i + 1 < targets.length ? Math.abs(fold((segs[k].midi - targets[i + 1]) * 100)) : Infinity;
        if (dn + 30 < d) break;
        found = k;
        break;
      }
    }
    if (found < 0) {
      notes.push({ target: targets[i], cents: null, settleMs: null, overshoot: 0, start: null });
      continue;
    }
    const seg = segs[found];
    j = found + 1;
    matched.push({ i, seg });
    const inSeg = frames.filter((f) => voiced(f) && f.t >= seg.start && f.t <= seg.end).map((f) => ({ t: f.t, c: fold((hzToMidi(f.hz!) - targets[i]) * 100) }));
    let settle: number | null = null;
    for (let a = 0; a < inSeg.length; a++) {
      let b = a;
      while (b < inSeg.length && Math.abs(inSeg[b].c) <= 35) b++;
      if (b > a && inSeg[b - 1].t - inSeg[a].t >= 0.08) {
        settle = Math.round((inSeg[a].t - seg.start) * 1000);
        break;
      }
      a = b;
    }
    const dir = i > 0 ? Math.sign(targets[i] - targets[i - 1]) : 0;
    const early = inSeg.filter((p) => p.t - seg.start <= 0.2).map((p) => p.c * dir);
    const overshoot = dir && early.length ? Math.max(0, Math.max(...early)) : 0;
    notes.push({ target: targets[i], cents: fold((seg.midi - targets[i]) * 100), settleMs: settle, overshoot, start: seg.start });
  }
  const hits = notes.filter((n) => n.cents !== null && Math.abs(n.cents) <= 50);
  const later = notes.slice(1).filter((n) => n.settleMs !== null);
  let joins = 0;
  let smooth = 0;
  for (let k = 1; k < matched.length; k++) {
    if (matched[k].i !== matched[k - 1].i + 1) continue;
    joins++;
    if (matched[k].seg.start - matched[k - 1].seg.end < 0.08) smooth++;
  }
  let timingMs: number | null = null;
  if (beatSec && matched.length >= 2) {
    const t0 = matched[0].seg.start - matched[0].i * beatSec;
    timingMs = Math.round(mean(matched.slice(1).map((m) => Math.abs(m.seg.start - (t0 + m.i * beatSec)) * 1000)));
  }
  return {
    unclear: false,
    notes,
    hit: hits.length / targets.length,
    intonation: mean(hits.map((n) => Math.abs(n.cents!))),
    transitionMs: Math.round(mean(later.map((n) => n.settleMs!))),
    overshoot: mean(notes.slice(1).filter((n) => n.cents !== null).map((n) => n.overshoot)),
    legato: joins ? smooth / joins : 0,
    timingMs,
  };
}

// ------------------------------------------------------------------ bands and scores

/** Lower is better: [excellent, good, fair] thresholds → score 1 … 0 (piecewise linear). */
export function bandScore(value: number, [exc, good, fair]: [number, number, number]): number {
  const v = Math.abs(value);
  if (v <= exc) return 1;
  if (v <= good) return 1 - (0.2 * (v - exc)) / (good - exc);
  if (v <= fair) return 0.8 - (0.3 * (v - good)) / (fair - good);
  return Math.max(0, 0.5 - (0.5 * (v - fair)) / fair);
}

/** Higher is better (e.g. duration reached vs. goal). */
export const reachScore = (value: number, goal: number) => Math.max(0, Math.min(1, value / goal));

export const BANDS = {
  settleMs: [150, 300, 600] as [number, number, number],
  intonation: [10, 20, 35] as [number, number, number],
  stability: [6, 12, 20] as [number, number, number],
  drift: [3, 6, 10] as [number, number, number],
  vibratoRegularity: [0.1, 0.2, 0.35] as [number, number, number],
  vibratoCue: [0.3, 0.6, 1.0] as [number, number, number],
  landing: [15, 30, 50] as [number, number, number],
  transitionMs: [120, 220, 400] as [number, number, number],
  overshoot: [15, 35, 60] as [number, number, number],
  timingMs: [40, 60, 110] as [number, number, number],
  /** Cycle-to-cycle (research: trained operatic rate CV ≈ 10 %; jitter falls with training). */
  vibratoJitter: [0.05, 0.1, 0.18] as [number, number, number],
  vibratoShimmer: [0.1, 0.2, 0.35] as [number, number, number],
};

/** Width targets for the narrow / wide drills (± cents). */
export const WIDTH_BAND: Record<'narrow' | 'wide', [number, number]> = { narrow: [18, 35], wide: [55, 95] };

export type VibratoStyle = 'pop' | 'classical';
export const EXTENT_BAND: Record<VibratoStyle, [number, number]> = { pop: [20, 50], classical: [40, 100] };

/** Distance outside an ideal [lo, hi] band, scored with a fair margin. */
export function inBandScore(v: number, [lo, hi]: [number, number], margin: number): number {
  const d = v < lo ? lo - v : v > hi ? v - hi : 0;
  return bandScore(d, [0, margin / 2, margin]);
}

export type MetricKey =
  | 'settle'
  | 'intonation'
  | 'stability'
  | 'drift'
  | 'duration'
  | 'vibratoRate'
  | 'vibratoExtent'
  | 'vibratoRegularity'
  | 'vibratoCue'
  | 'straight'
  | 'dynamics'
  | 'smoothness'
  | 'landing'
  | 'hit'
  | 'transition'
  | 'overshoot'
  | 'legato'
  | 'timing'
  | 'scoop'
  | 'vibratoJitter'
  | 'vibratoShimmer'
  | 'vibratoPlacement'
  | 'vibratoConsistency'
  | 'references';

export interface MetricScore {
  key: MetricKey;
  value: number; // raw value in its unit
  unit: '¢' | 'ms' | 's' | 'Hz' | '%' | 'dB' | '¢/s';
  score: number; // 0..1
  weight: number;
}

// ------------------------------------------------------------------ the ladder (P.2)

export type VocalKind = 'hold' | 'straight' | 'vibrato-delayed' | 'vibrato-onoff' | 'vibrato-steady' | 'range' | 'messa' | 'glide' | 'melody' | 'leap' | 'rhythmic' | 'staccato' | 'scale' | 'vibrato-rate' | 'vibrato-width' | 'vibrato-alternate' | 'vibrato-notes' | 'vibrato-register' | 'vibrato-messa' | 'harmony-hold' | 'harmony-line';

export interface VocalItem {
  id: string;
  kind: VocalKind;
  level: number;
  /** Target notes as offsets from the range position (resolved by `resolveItem`). */
  seconds: number; // hold goal / capture length
  reference: 'during' | 'before'; // the reference keeps sounding, or only before the voice
  /** For melodies / leaps / rhythmic: semitone steps from the first note. */
  steps?: number[];
  /** Beats per minute and notes per beat for rhythmic items. */
  bpm?: number;
  perBeat?: number;
  /** Position inside the range, 0 = low … 1 = high (holds); a list for range items. */
  at?: number | number[];
  /** Cue for vibrato on / off (seconds from the voice onset). */
  cueOn?: number;
  cueOff?: number;
  /** Advanced vibrato: the target rate (Hz), the width (narrow / wide), the switch cues (s), the notes that carry vibrato. */
  vibRate?: number;
  vibWidth?: 'narrow' | 'wide';
  cues?: number[];
  vibNotes?: boolean[];
  noteSecs?: number[];
  /** Harmony singing: notes that keep sounding while the player sings (semitones from the sung note — or, for a line, from the line's base). */
  accompany?: number[];
  /** Harmony line: the melody the app plays (semitones from the same base as `steps`). */
  melody?: number[];
  /** Harmony line: a chord per sung note instead of a melody (semitones from the line's base). */
  chords?: number[][];
  /** Played once before the take (semitones from the sung note) — e.g. the whole diminished chord. */
  pre?: number[];
  /** Barry Harris instructions (spec T): what the sung note does to the diminished chord. */
  bh?: { mode: 'name' | 'degree' | 'free' | 'resolve'; kind?: 'dom7' | 'm6' | 'maj6'; rootOffset?: number; degree?: number; dir?: 'up' | 'down'; dim?: number[] };
  /** Scales and modes: sing up in one scale and (optionally) down in another, from a named tonic. */
  scale?: ScaleSpec;
  difficulty: number;
}

export { MODE_STEPS, type ModeId } from './modes';

export interface ScaleSpec {
  /** Named tonic (letter name, e.g. "G", "Bb"); moved to the nearest tonic that fits when it cannot. */
  tonic: string;
  up: ModeId;
  down?: ModeId;
  /** Only the first n notes (a pentachord at the start), up and back. */
  notes?: number;
  /** What the player hears first: the whole figure (echo) or only the tonic (told). */
  hear: 'figure' | 'tonic';
}

/** Steps (from the tonic) of a scale figure: up in one scale, then down in the other. */
export function scaleSteps(sc: ScaleSpec): number[] {
  const up = MODE_STEPS[sc.up].slice(0, sc.notes ?? undefined);
  if (!sc.down) return up;
  const top = up[up.length - 1];
  const downScale = sc.notes ? MODE_STEPS[sc.down].slice(0, sc.notes) : MODE_STEPS[sc.down];
  // Down from the top note: the other scale's notes below it, in reverse.
  const below = downScale.filter((x) => x < top).reverse();
  return [...up, ...below];
}

export interface VocalLevel {
  level: number;
  kind: VocalKind[];
  items: VocalItem[];
  /** Score needed (0..1, mean of the items) to pass the level. */
  pass: number;
}

function L(level: number, pass: number, items: Omit<VocalItem, 'id' | 'level'>[]): VocalLevel {
  return { level, pass, kind: [...new Set(items.map((i) => i.kind))], items: items.map((it, i) => ({ ...it, id: `v${level}-${i + 1}`, level })) };
}

export const VOCAL_LEVELS: VocalLevel[] = [
  L(1, 0.6, [
    { kind: 'hold', seconds: 3, reference: 'during', at: 0.45, difficulty: 850 },
    { kind: 'hold', seconds: 5, reference: 'during', at: 0.55, difficulty: 900 },
    { kind: 'hold', seconds: 8, reference: 'during', at: 0.5, difficulty: 950 },
    { kind: 'hold', seconds: 5, reference: 'before', at: 0.4, difficulty: 1000 },
  ]),
  L(2, 0.62, [
    { kind: 'straight', seconds: 4, reference: 'before', at: 0.5, difficulty: 1000 },
    { kind: 'straight', seconds: 6, reference: 'before', at: 0.35, difficulty: 1050 },
    { kind: 'straight', seconds: 8, reference: 'before', at: 0.6, difficulty: 1100 },
    { kind: 'staccato', seconds: 4, reference: 'before', at: 0.5, steps: [0, 0, 0, 0], bpm: 80, perBeat: 1, difficulty: 1000 },
  ]),
  L(3, 0.6, [
    { kind: 'vibrato-delayed', seconds: 6, reference: 'before', at: 0.5, cueOn: 2, difficulty: 1100 },
    { kind: 'vibrato-steady', seconds: 6, reference: 'before', at: 0.45, difficulty: 1150 },
    { kind: 'vibrato-onoff', seconds: 8, reference: 'before', at: 0.55, cueOn: 2, cueOff: 5, difficulty: 1200 },
  ]),
  L(4, 0.6, [{ kind: 'range', seconds: 3, reference: 'before', at: [0, 0.25, 0.5, 0.75, 1], difficulty: 1150 }]),
  L(5, 0.6, [
    { kind: 'messa', seconds: 6, reference: 'before', at: 0.5, difficulty: 1200 },
    { kind: 'messa', seconds: 8, reference: 'before', at: 0.4, difficulty: 1250 },
  ]),
  L(6, 0.6, [
    { kind: 'glide', seconds: 3, reference: 'before', at: 0.3, steps: [0, 5], difficulty: 1050 },
    { kind: 'glide', seconds: 3, reference: 'before', at: 0.7, steps: [0, -7], difficulty: 1100 },
    { kind: 'glide', seconds: 4, reference: 'before', at: 0.2, steps: [0, 12], difficulty: 1200 },
  ]),
  L(7, 0.62, [
    { kind: 'melody', seconds: 5, reference: 'before', at: 0.3, steps: [0, 2, 4], difficulty: 1050 },
    { kind: 'melody', seconds: 6, reference: 'before', at: 0.3, steps: [0, 2, 4, 5, 4], difficulty: 1100 },
    { kind: 'melody', seconds: 7, reference: 'before', at: 0.4, steps: [0, -1, -3, -1, 0, 2], difficulty: 1150 },
  ]),
  L(8, 0.6, [
    { kind: 'leap', seconds: 5, reference: 'before', at: 0.3, steps: [0, 4, 0, 3], difficulty: 1150 },
    { kind: 'leap', seconds: 5, reference: 'before', at: 0.25, steps: [0, 7, 4, 0], difficulty: 1250 },
    { kind: 'leap', seconds: 6, reference: 'before', at: 0.2, steps: [0, 9, 7, 12], difficulty: 1350 },
  ]),
  L(9, 0.58, [
    { kind: 'rhythmic', seconds: 6, reference: 'before', at: 0.35, steps: [0, 2, 4, 2, 0], bpm: 80, perBeat: 1, difficulty: 1150 },
    { kind: 'rhythmic', seconds: 6, reference: 'before', at: 0.35, steps: [0, 2, 4, 5, 7, 5, 4, 2], bpm: 80, perBeat: 2, difficulty: 1250 },
    { kind: 'rhythmic', seconds: 6, reference: 'before', at: 0.4, steps: [0, 2, 4, 2, 4, 5, 4, 2, 0], bpm: 72, perBeat: 3, difficulty: 1350 },
    { kind: 'rhythmic', seconds: 6, reference: 'before', at: 0.4, steps: [0, 2, 4, 5, 7, 5, 4, 2, 0, 2, 4, 2], bpm: 66, perBeat: 4, difficulty: 1450 },
  ]),
];

const SC = (tonic: string, up: ModeId, down: ModeId | undefined, hear: ScaleSpec['hear'], difficulty: number, notes?: number): Omit<VocalItem, 'id' | 'level'> => ({
  kind: 'scale',
  seconds: 8,
  reference: 'before',
  scale: { tonic, up, down, hear, notes },
  difficulty,
});

/** Scales and modes (product owner, 2026-11-05): from Ionian up to mixed modes like up in Mixolydian, down in Superlocrian. */
export const MODE_LEVELS: VocalLevel[] = [
  L(1, 0.6, [SC('C', 'ionian', undefined, 'figure', 900, 5), SC('F', 'ionian', 'ionian', 'figure', 950, 5), SC('D', 'ionian', undefined, 'figure', 1000)]),
  L(2, 0.6, [SC('G', 'ionian', 'ionian', 'figure', 1000), SC('A', 'aeolian', undefined, 'figure', 1050), SC('C', 'major-pentatonic', 'major-pentatonic', 'tonic', 1050)]),
  L(3, 0.6, [SC('D', 'dorian', 'dorian', 'figure', 1100), SC('G', 'mixolydian', 'mixolydian', 'tonic', 1150), SC('A', 'minor-pentatonic', 'minor-pentatonic', 'tonic', 1100)]),
  L(4, 0.6, [SC('F', 'lydian', 'lydian', 'tonic', 1200), SC('E', 'phrygian', 'phrygian', 'tonic', 1250), SC('C', 'blues', undefined, 'tonic', 1200), SC('G', 'major-blues', 'major-blues', 'tonic', 1200)]),
  L(5, 0.58, [SC('A', 'harmonic-minor', 'harmonic-minor', 'tonic', 1250), SC('C', 'melodic-minor', 'melodic-minor', 'tonic', 1300), SC('B', 'locrian', 'locrian', 'tonic', 1350), SC('E', 'phrygian-dominant', 'phrygian-dominant', 'tonic', 1350)]),
  L(6, 0.56, [SC('F', 'lydian-dominant', undefined, 'tonic', 1350), SC('C', 'whole-tone', undefined, 'tonic', 1400), SC('G', 'altered', undefined, 'tonic', 1450), SC('D', 'diminished', undefined, 'tonic', 1450), SC('G', 'bebop-dominant', 'bebop-dominant', 'tonic', 1450), SC('E', 'double-harmonic', undefined, 'tonic', 1450)]),
  L(7, 0.56, [SC('C', 'ionian', 'aeolian', 'tonic', 1350), SC('D', 'dorian', 'mixolydian', 'tonic', 1400), SC('F', 'lydian', 'ionian', 'tonic', 1400)]),
  L(8, 0.54, [SC('G', 'mixolydian', 'altered', 'tonic', 1550), SC('Bb', 'lydian-dominant', 'altered', 'tonic', 1600), SC('A', 'harmonic-minor', 'phrygian', 'tonic', 1550), SC('E', 'diminished', 'whole-tone', 'tonic', 1650), SC('C', 'lydian-augmented', 'altered', 'tonic', 1650), SC('A', 'hungarian-minor', 'hungarian-minor', 'tonic', 1600)]),
].map((lv) => ({ ...lv, items: lv.items.map((it) => ({ ...it, id: it.id.replace(/^v/, 'm') })) }));

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function tonicPc(name: string): number {
  const base = LETTER_PC[name[0]];
  const acc = name.slice(1) === 'b' ? -1 : name.slice(1) === '#' ? 1 : 0;
  return (((base + acc) % 12) + 12) % 12;
}
const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Tonic MIDI for a scale item: the named tonic when the figure fits, else the nearest tonic that does. */
export function scaleTonic(sc: ScaleSpec, range: VoiceRange): { midi: number; name: string } | null {
  const steps = scaleSteps(sc);
  const lo = Math.min(...steps);
  const hi = Math.max(...steps);
  const minT = range.low - lo;
  const maxT = range.high - hi;
  if (minT > maxT) return null;
  const want = tonicPc(sc.tonic);
  const centre = (minT + maxT) / 2;
  let best: number | null = null;
  for (let m = minT; m <= maxT; m++) if (((m % 12) + 12) % 12 === want && (best === null || Math.abs(m - centre) < Math.abs(best - centre))) best = m;
  if (best !== null) return { midi: best, name: sc.tonic };
  // The named tonic has no place in this range: the closest tonic (by pitch class) that fits.
  let alt = minT;
  let dist = 99;
  for (let m = minT; m <= maxT; m++) {
    const d = Math.min((((m - want) % 12) + 12) % 12, (((want - m) % 12) + 12) % 12);
    if (d < dist) {
      dist = d;
      alt = m;
    }
  }
  return { midi: alt, name: PC_NAMES[((alt % 12) + 12) % 12] };
}

/** Advanced vibrato (levels 10–11): rate and width on demand, alternating, vibrato only on chosen notes,
 *  consistency across the range and through a swell. Exercise ideas from voice pedagogy (delayed vibrato,
 *  straight/vibrato alternation, vibrato on the closing note), measures from voice research (rate, extent,
 *  cycle-to-cycle jitter and shimmer). */
export const VIBRATO_LEVELS: VocalLevel[] = [
  L(10, 0.58, [
    { kind: 'vibrato-rate', seconds: 6, reference: 'before', at: 0.5, vibRate: 5, difficulty: 1250 },
    { kind: 'vibrato-rate', seconds: 6, reference: 'before', at: 0.5, vibRate: 6.3, difficulty: 1300 },
    { kind: 'vibrato-width', seconds: 6, reference: 'before', at: 0.45, vibWidth: 'narrow', difficulty: 1300 },
    { kind: 'vibrato-width', seconds: 6, reference: 'before', at: 0.55, vibWidth: 'wide', difficulty: 1300 },
    { kind: 'vibrato-alternate', seconds: 9, reference: 'before', at: 0.5, cues: [1.5, 3, 4.5, 6, 7.5], difficulty: 1350 },
  ]),
  L(11, 0.56, [
    { kind: 'vibrato-notes', seconds: 6, reference: 'before', at: 0.35, steps: [0, 2, 4, 5, 7], noteSecs: [0.6, 0.6, 0.6, 0.6, 2.4], vibNotes: [false, false, false, false, true], difficulty: 1300 },
    { kind: 'vibrato-notes', seconds: 8, reference: 'before', at: 0.3, steps: [0, 4, 7, 4, 0], noteSecs: [0.6, 0.6, 1.8, 0.6, 1.8], vibNotes: [false, false, true, false, true], difficulty: 1400 },
    { kind: 'vibrato-notes', seconds: 8, reference: 'before', at: 0.4, steps: [0, 2, 3, 5, 3, 2, 0], noteSecs: [1.6, 0.5, 0.5, 1.6, 0.5, 0.5, 1.6], vibNotes: [true, false, false, true, false, false, true], difficulty: 1450 },
    { kind: 'vibrato-register', seconds: 4, reference: 'before', at: [0.15, 0.5, 0.85], difficulty: 1400 },
    { kind: 'vibrato-messa', seconds: 7, reference: 'before', at: 0.5, difficulty: 1450 },
  ]),
];

/** Harmony singing (spec S.3): find the missing chord note over a sounding chord, then sing a line in thirds /
 *  sixths against a melody. Headphones are needed so the accompaniment stays out of the measurement. */
const H = (kind: 'harmony-hold' | 'harmony-line', extra: Partial<VocalItem>, difficulty: number): Omit<VocalItem, 'id' | 'level'> => ({
  kind,
  seconds: kind === 'harmony-hold' ? 4 : 6,
  reference: 'during',
  at: 0.45,
  difficulty,
  ...extra,
});
export const HARMONY_LEVELS: VocalLevel[] = [
  // Intervals over one held note: the app holds a note, the player sings the interval above (or below) it.
  L(1, 0.6, [H('harmony-hold', { accompany: [-7] }, 1050), H('harmony-hold', { accompany: [-4] }, 1100), H('harmony-hold', { accompany: [-3] }, 1100), H('harmony-hold', { accompany: [-9] }, 1150), H('harmony-hold', { accompany: [5], at: 0.35 }, 1150)]),
  L(2, 0.6, [H('harmony-hold', { accompany: [-4, 3] }, 1100), H('harmony-hold', { accompany: [-3, 4] }, 1150), H('harmony-hold', { accompany: [-4, 3], at: 0.6 }, 1150)]),
  L(3, 0.6, [H('harmony-hold', { accompany: [-7, -3] }, 1200), H('harmony-hold', { accompany: [4, 7], at: 0.3 }, 1250), H('harmony-hold', { accompany: [-10, -6, -3] }, 1300)]),
  // Melody 1-2-3-2-1 / harmony a third above: 3-4-5-4-3 (major key, base = the tonic).
  L(4, 0.58, [H('harmony-line', { melody: [0, 2, 4, 2, 0], steps: [4, 5, 7, 5, 4], bpm: 72, perBeat: 1 }, 1300), H('harmony-line', { melody: [0, 4, 7, 4, 0], steps: [4, 7, 11, 7, 4], bpm: 72, perBeat: 1 }, 1350)]),
  // A sixth below / a third below.
  L(5, 0.56, [H('harmony-line', { melody: [7, 9, 11, 12, 11, 9, 7], steps: [-2, 0, 2, 4, 2, 0, -2], bpm: 76, perBeat: 1 }, 1400), H('harmony-line', { melody: [4, 5, 7, 9, 7, 5, 4], steps: [0, 2, 4, 5, 4, 2, 0], bpm: 80, perBeat: 1 }, 1400)]),
].map((lv) => ({ ...lv, items: lv.items.map((it) => ({ ...it, id: it.id.replace(/^v/, 'h') })) }));

/** What the app plays during a harmony item (MIDI), in the same octave placement as the sung notes. */
export function itemAccompaniment(item: VocalItem, range: VoiceRange): number[] {
  const tg = itemTargets(item, range);
  if (item.kind === 'harmony-hold') return (item.accompany ?? []).map((s) => tg[0] + s);
  if (item.kind === 'harmony-line' && item.steps && item.melody) {
    const base = tg[0] - item.steps[0];
    return item.melody.map((s) => base + s);
  }
  return [];
}

/** Barry Harris track (spec T): scales, the diminished chord changes, free choice, resolution, half-step
 *  lines and the harmonised 6th-diminished scale. */
const DIMR = [0, 3, 6, 9];
function dimMoveItem(i: number, dir: 'up' | 'down', mode: 'name' | 'degree', difficulty: number): Omit<VocalItem, 'id' | 'level'> {
  const moved = DIMR[i] + (dir === 'down' ? -1 : 1);
  return {
    kind: 'harmony-hold',
    seconds: 4,
    reference: 'during',
    at: 0.5,
    accompany: DIMR.filter((_, k) => k !== i).map((x) => x - moved),
    pre: DIMR.map((x) => x - moved),
    bh: { mode, kind: dir === 'down' ? 'dom7' : 'm6', rootOffset: dir === 'down' ? 0 : 5, degree: i + 1, dir },
    difficulty,
  };
}
const sixChordBelow = (n: number): number[] => {
  const pc = ((n % 12) + 12) % 12;
  const set = [0, 4, 7, 9].includes(pc) ? [0, 4, 7, 9] : [11, 2, 5, 8];
  return set.filter((x) => x !== pc).map((x) => {
    let m = x + 12 * Math.floor(n / 12);
    while (m >= n) m -= 12;
    return m - n;
  });
};
const SIXDIM = [0, 2, 4, 5, 7, 8, 9, 11, 12];
export const BARRY_LEVELS: VocalLevel[] = [
  L(1, 0.6, [
    { kind: 'scale', seconds: 9, reference: 'before', scale: { tonic: 'C', up: 'sixth-dim', hear: 'figure' }, difficulty: 1150 },
    { kind: 'scale', seconds: 12, reference: 'before', scale: { tonic: 'F', up: 'sixth-dim', down: 'sixth-dim', hear: 'figure' }, difficulty: 1200 },
  ]),
  L(2, 0.58, [
    { kind: 'scale', seconds: 12, reference: 'before', scale: { tonic: 'G', up: 'sixth-dim', down: 'sixth-dim', hear: 'tonic' }, difficulty: 1300 },
    { kind: 'scale', seconds: 12, reference: 'before', scale: { tonic: 'C', up: 'minor-sixth-dim', down: 'minor-sixth-dim', hear: 'tonic' }, difficulty: 1350 },
    { kind: 'scale', seconds: 12, reference: 'before', scale: { tonic: 'C', up: 'chromatic', hear: 'tonic' }, difficulty: 1350 },
  ]),
  L(3, 0.6, [dimMoveItem(3, 'down', 'name', 1300), dimMoveItem(0, 'down', 'name', 1300), dimMoveItem(2, 'down', 'name', 1350)]),
  L(4, 0.58, [dimMoveItem(2, 'up', 'name', 1350), dimMoveItem(1, 'up', 'degree', 1400), dimMoveItem(3, 'down', 'degree', 1400)]),
  L(5, 0.56, [
    { kind: 'harmony-hold', seconds: 4, reference: 'during', at: 0.5, accompany: DIMR.map((x) => x - 1), pre: DIMR.map((x) => x - 1), bh: { mode: 'free', dim: DIMR.map((x) => x - 1) }, difficulty: 1450 },
    { kind: 'harmony-hold', seconds: 4, reference: 'during', at: 0.4, accompany: [-5, -1, 2, 5], bh: { mode: 'resolve' }, difficulty: 1400 },
    { kind: 'harmony-hold', seconds: 4, reference: 'during', at: 0.5, accompany: DIMR.map((x) => x - 4), pre: DIMR.map((x) => x - 4), bh: { mode: 'free', dim: DIMR.map((x) => x - 4) }, difficulty: 1450 },
  ]),
  L(6, 0.56, [
    { kind: 'rhythmic', seconds: 7, reference: 'before', at: 0.2, steps: barryLine(1, 'one'), bpm: 90, perBeat: 2, difficulty: 1400 },
    { kind: 'rhythmic', seconds: 8, reference: 'before', at: 0.1, steps: barryLine(3, 'one'), bpm: 90, perBeat: 2, difficulty: 1450 },
    { kind: 'rhythmic', seconds: 8, reference: 'before', at: 0.1, steps: barryLine(3, 'three'), bpm: 84, perBeat: 2, difficulty: 1550 },
    { kind: 'rhythmic', seconds: 8, reference: 'before', at: 0.1, steps: barryLine(2, 'two'), bpm: 84, perBeat: 2, difficulty: 1500 },
  ]),
  L(7, 0.55, [
    { kind: 'harmony-line', seconds: 9, reference: 'during', at: 0.3, steps: SIXDIM, chords: SIXDIM.map((n) => sixChordBelow(n).map((x) => x + n)), bpm: 66, perBeat: 1, difficulty: 1500 },
    { kind: 'harmony-line', seconds: 9, reference: 'during', at: 0.35, steps: SIXDIM.slice().reverse(), chords: SIXDIM.slice().reverse().map((n) => sixChordBelow(n).map((x) => x + n)), bpm: 66, perBeat: 1, difficulty: 1550 },
  ]),
].map((lv) => ({ ...lv, items: lv.items.map((it) => ({ ...it, id: it.id.replace(/^v/, 'bh') })) }));

/**
 * Sing → identify (spec T.2): the player chose a note a half step from one of the diminished notes. Which
 * chord did it make? Null when the sung note is not a half step from any of them.
 */
export function dimFreeResult(frames: SungFrame[], dimMidis: number[]): { kind: 'dom7' | 'm6'; root: number; cents: number } | null {
  const ms = frames.filter((f) => f.hz && f.confidence >= 0.8).map((f) => hzToMidi(f.hz!)).sort((a, b) => a - b);
  if (ms.length < 10) return null;
  const med = ms[ms.length >> 1];
  const pc = (((med % 12) + 12) % 12);
  for (const d of dimMidis) {
    const dpc = ((d % 12) + 12) % 12;
    for (const dir of [-1, 1] as const) {
      const t = (dpc + dir + 12) % 12;
      let c = (pc - t) * 100;
      c = ((((c + 600) % 1200) + 1200) % 1200) - 600;
      if (Math.abs(c) <= 50) return dir === -1 ? { kind: 'dom7', root: t, cents: c } : { kind: 'm6', root: (t + 5) % 12, cents: c };
    }
  }
  return null;
}

/** The whole ladder in order (levels 1–11; 12 = Riffs & runs). */
export const LADDER: VocalLevel[] = [...VOCAL_LEVELS, ...VIBRATO_LEVELS];

/** Level 12 continues in Riffs & runs (addendum K). */
export const VOCAL_TOP_LEVEL = 12;

/** A note at position p (0 = low … 1 = high) in the range. */
export const atRange = (range: VoiceRange, p: number, margin = 1) => Math.round(range.low + margin + (range.high - range.low - 2 * margin) * Math.max(0, Math.min(1, p)));

/** Target notes for an item in this voice. */
export function itemTargets(item: VocalItem, range: VoiceRange): number[] {
  if (item.kind === 'range' || item.kind === 'vibrato-register') return (item.at as number[]).map((p) => atRange(range, p));
  if (item.kind === 'scale' && item.scale) {
    const t = scaleTonic(item.scale, range) ?? { midi: atRange(range, 0), name: item.scale.tonic };
    return scaleSteps(item.scale).map((st) => t.midi + st);
  }
  let base = atRange(range, (item.at as number) ?? 0.5);
  if (!item.steps) return [base];
  // Keep the whole figure inside the range (never change the intervals).
  const lo = Math.min(...item.steps);
  const hi = Math.max(...item.steps);
  base = Math.max(range.low - lo, Math.min(range.high - hi, base));
  return item.steps.map((s) => base + s);
}

/** Whether every note of the item fits in this range. */
export function itemFits(item: VocalItem, range: VoiceRange): boolean {
  return itemTargets(item, range).every((m) => m >= range.low && m <= range.high);
}

// ------------------------------------------------------------------ grading a take

export interface TakeGrade {
  unclear: boolean;
  /** Barry Harris free choice: the chord the sung note made of the diminished. */
  chordMade?: { kind: 'dom7' | 'm6'; root: number; cents: number };
  score: number; // 0..1 (weighted mean of the metric scores)
  metrics: MetricScore[];
  /** The metric with the lowest score (drives the tip). */
  weakest: MetricKey | null;
  hold?: HoldMetrics;
  melody?: MelodyMetrics;
  glide?: GlideMetrics;
}

const M = (key: MetricKey, value: number, unit: MetricScore['unit'], score: number, weight: number): MetricScore => ({ key, value: Math.round(value * 10) / 10, unit, score, weight });

function finish(metrics: MetricScore[], extra: Partial<TakeGrade>): TakeGrade {
  const w = metrics.reduce((a, m) => a + m.weight, 0) || 1;
  const score = metrics.reduce((a, m) => a + m.score * m.weight, 0) / w;
  const weakest = metrics.length ? metrics.reduce((a, m) => (m.score < a.score ? m : a)).key : null;
  return { unclear: false, score: Math.round(score * 1000) / 1000, metrics, weakest, ...extra };
}

const UNCLEAR: TakeGrade = { unclear: true, score: 0, metrics: [], weakest: null };

/** Grade one hold-type take (hold, straight, vibrato, messa). On-demand rate / width gate the score. */
export function gradeHold(item: VocalItem, frames: SungFrame[], target: number, style: VibratoStyle = 'pop'): TakeGrade {
  const g = gradeHoldRaw(item, frames, target, style);
  if (g.unclear || (item.kind !== 'vibrato-rate' && item.kind !== 'vibrato-width')) return g;
  const key = item.kind === 'vibrato-rate' ? 'vibratoRate' : 'vibratoExtent';
  const k = g.metrics.find((m) => m.key === key)?.score ?? 0;
  return { ...g, score: Math.round(g.score * (0.4 + 0.6 * k) * 1000) / 1000 };
}

function gradeHoldRaw(item: VocalItem, frames: SungFrame[], target: number, style: VibratoStyle = 'pop'): TakeGrade {
  const h = holdMetrics(frames, target);
  if (h.unclear) return { ...UNCLEAR, hold: h };
  const base: MetricScore[] = [
    M('settle', h.settleMs ?? 1000, 'ms', bandScore(h.settleMs ?? 1000, BANDS.settleMs), 1),
    M('intonation', h.intonation, '¢', bandScore(h.intonation, BANDS.intonation), 2),
    M('duration', h.bestStretchSec, 's', reachScore(h.bestStretchSec, item.seconds * 0.9), 1.5),
  ];
  const vibScores = (w: number) => [
    M('vibratoRate', h.vibrato.rate, 'Hz', h.vibrato.present ? inBandScore(h.vibrato.rate, [5, 6.5], 1.5) : 0, w),
    M('vibratoExtent', h.vibrato.extent, '¢', h.vibrato.present ? inBandScore(h.vibrato.extent, EXTENT_BAND[style], 25) : 0, w),
    M('vibratoRegularity', h.vibrato.regularity * 100, '%', h.vibrato.present ? bandScore(h.vibrato.regularity, BANDS.vibratoRegularity) : 0, w),
  ];
  switch (item.kind) {
    case 'hold':
      return finish([...base, M('drift', h.drift, '¢/s', bandScore(h.drift, BANDS.drift), 1)], { hold: h });
    case 'straight':
      return finish([...base, M('stability', h.stability, '¢', h.vibrato.present ? 0 : bandScore(h.stability, BANDS.stability), 2), M('drift', h.drift, '¢/s', bandScore(h.drift, BANDS.drift), 1)], { hold: h });
    case 'vibrato-steady':
      return finish([...base, ...vibScores(1.5)], { hold: h });
    case 'vibrato-delayed': {
      const err = h.vibratoOnSec === null ? 9 : Math.abs(h.vibratoOnSec - (item.cueOn ?? 2));
      return finish([...base, ...vibScores(1), M('vibratoCue', err * 1000, 'ms', bandScore(err, BANDS.vibratoCue), 1.5)], { hold: h });
    }
    case 'vibrato-rate':
      return finish(
        [
          ...base.slice(1),
          M('vibratoRate', h.vibrato.rate, 'Hz', h.vibrato.present ? inBandScore(h.vibrato.rate, [(item.vibRate ?? 5.5) - 0.3, (item.vibRate ?? 5.5) + 0.3], 1) : 0, 3),
          M('vibratoJitter', h.vibrato.jitter * 100, '%', h.vibrato.present ? bandScore(h.vibrato.jitter, BANDS.vibratoJitter) : 0, 1.5),
        ],
        { hold: h },
      );
    case 'vibrato-width':
      return finish(
        [
          ...base.slice(1),
          M('vibratoExtent', h.vibrato.extent, '¢', h.vibrato.present ? inBandScore(h.vibrato.extent, WIDTH_BAND[item.vibWidth ?? 'narrow'], 20) : 0, 3),
          M('vibratoShimmer', h.vibrato.shimmer * 100, '%', h.vibrato.present ? bandScore(h.vibrato.shimmer, BANDS.vibratoShimmer) : 0, 1.5),
        ],
        { hold: h },
      );
    case 'vibrato-alternate': {
      // Each cue toggles (straight → vibrato → straight …): the nearest detected change of the right kind.
      const cues = item.cues ?? [];
      const errs = cues.map((c, k) => {
        const want = k % 2 === 0 ? 'vib' : 'straight';
        const near = h.switches.filter((sw) => sw.to === want).map((sw) => Math.abs(sw.at - c));
        return near.length ? Math.min(1.5, ...near) : 1.5;
      });
      const e = errs.length ? mean(errs) : 1.5;
      return finish([...base, M('vibratoCue', e * 1000, 'ms', bandScore(e, BANDS.vibratoCue), 3)], { hold: h });
    }
    case 'vibrato-messa': {
      const [a, b] = h.halves ?? [h.vibrato, h.vibrato];
      const both = a.present && b.present;
      const dRate = both ? Math.abs(a.rate - b.rate) / ((a.rate + b.rate) / 2) : 1;
      const dExt = both ? Math.abs(a.extent - b.extent) / ((a.extent + b.extent) / 2) : 1;
      const cons = Math.max(dRate, dExt);
      return finish(
        [
          ...base,
          M('dynamics', h.loudnessRangeDb, 'dB', reachScore(h.loudnessRangeDb, 6), 1.5),
          M('vibratoConsistency', cons * 100, '%', bandScore(cons, [0.1, 0.2, 0.35]), 2.5),
        ],
        { hold: h },
      );
    }
    case 'vibrato-onoff': {
      const eOn = h.vibratoOnSec === null ? 9 : Math.abs(h.vibratoOnSec - (item.cueOn ?? 2));
      const eOff = h.vibratoOffSec === null ? 9 : Math.abs(h.vibratoOffSec - (item.cueOff ?? 5));
      const e = (eOn + eOff) / 2;
      return finish([...base, ...vibScores(1), M('vibratoCue', e * 1000, 'ms', bandScore(e, BANDS.vibratoCue), 2)], { hold: h });
    }
    case 'messa':
      return finish(
        [
          ...base,
          M('dynamics', h.loudnessRangeDb, 'dB', reachScore(h.loudnessRangeDb, 6), 1.5),
          M('stability', h.maxTrendDev, '¢', bandScore(h.maxTrendDev, [15, 25, 40]), 2),
        ],
        { hold: h },
      );
    default:
      return finish(base, { hold: h });
  }
}

export function gradeGlide(frames: SungFrame[], from: number, to: number): TakeGrade {
  const g = glideMetrics(frames, from, to);
  if (g.unclear) return { ...UNCLEAR, glide: g };
  return finish(
    [
      M('smoothness', g.jumpiness * 100, '%', bandScore(g.jumpiness, [0.03, 0.1, 0.25]), 1.5),
      M('smoothness', (1 - g.monotonic) * 100, '%', bandScore(1 - g.monotonic, [0.1, 0.2, 0.35]), 1),
      M('landing', g.landing, '¢', bandScore(g.landing, BANDS.landing), 2),
    ],
    { glide: g },
  );
}

export function gradeMelody(item: VocalItem, frames: SungFrame[], targets: number[]): TakeGrade {
  const beatSec = item.bpm ? 60 / item.bpm / (item.perBeat ?? 1) : undefined;
  const m = melodyMetrics(frames, targets, item.kind === 'rhythmic' || item.kind === 'staccato' ? beatSec : undefined);
  if (m.unclear) return { ...UNCLEAR, melody: m };
  const out: MetricScore[] = [M('hit', m.hit * 100, '%', m.hit, 2.5), M('intonation', m.intonation, '¢', bandScore(m.intonation, BANDS.intonation), 1.5)];
  if (item.kind === 'staccato') {
    const scoops = m.notes.filter((n) => n.settleMs !== null).map((n) => n.settleMs!);
    out.push(M('scoop', mean(scoops), 'ms', bandScore(mean(scoops), [60, 120, 220]), 2));
  } else {
    out.push(M('transition', m.transitionMs, 'ms', bandScore(m.transitionMs, BANDS.transitionMs), 1.5));
    if (item.kind === 'leap') out.push(M('overshoot', m.overshoot, '¢', bandScore(m.overshoot, BANDS.overshoot), 1));
    if (item.kind === 'melody' || item.kind === 'scale') out.push(M('legato', m.legato * 100, '%', m.legato, 1));
  }
  if (m.timingMs !== null) out.push(M('timing', m.timingMs, 'ms', bandScore(m.timingMs, BANDS.timingMs), 2));
  const g = finish(out, { melody: m });
  // Wrong notes dominate: how well you sing the wrong scale should not earn a pass.
  return { ...g, score: Math.round(g.score * (0.4 + 0.6 * m.hit) * 1000) / 1000 };
}

/** A phrase where only some notes carry vibrato: right notes + vibrato exactly where asked. */
export function gradeVibratoNotes(item: VocalItem, frames: SungFrame[], targets: number[]): TakeGrade {
  const m = melodyMetrics(frames, targets);
  if (m.unclear) return { ...UNCLEAR, melody: m };
  const flags = item.vibNotes ?? [];
  let right = 0;
  let judged = 0;
  m.notes.forEach((n, i) => {
    if (n.start === null) return;
    const next = m.notes.slice(i + 1).find((x) => x.start !== null)?.start ?? Infinity;
    const seg = frames.filter((f) => f.t >= n.start! && f.t < next);
    judged++;
    if (hasVibrato(seg, n.target) === !!flags[i]) right++;
  });
  const placement = judged ? right / targets.length : 0;
  const g = finish(
    [
      M('hit', m.hit * 100, '%', m.hit, 2),
      M('intonation', m.intonation, '¢', bandScore(m.intonation, BANDS.intonation), 1),
      M('vibratoPlacement', placement * 100, '%', placement, 3),
    ],
    { melody: m },
  );
  return { ...g, score: Math.round(g.score * (0.4 + 0.6 * m.hit) * 1000) / 1000 };
}

/** Consistency of vibrato across several notes (rate and width spread): 1 = identical. */
export function vibratoConsistency(takes: { rate: number; extent: number }[]): number {
  if (takes.length < 2) return 1;
  const rs = takes.map((t) => t.rate);
  const es = takes.map((t) => t.extent);
  const spread = Math.max(std(rs) / (mean(rs) || 1), std(es) / (mean(es) || 1));
  return bandScore(spread, [0.08, 0.16, 0.3]);
}

/** Grade any item (range items are graded per note by the caller with `gradeHold`). */
export function gradeTake(item: VocalItem, frames: SungFrame[], range: VoiceRange, style: VibratoStyle = 'pop', noteIndex = 0): TakeGrade {
  const targets = itemTargets(item, range);
  switch (item.kind) {
    case 'glide':
      return gradeGlide(frames, targets[0], targets[1]);
    case 'melody':
    case 'leap':
    case 'rhythmic':
    case 'staccato':
    case 'scale':
      return gradeMelody(item, frames, targets);
    case 'range':
      return gradeHold({ ...item, kind: 'hold' }, frames, targets[noteIndex], style);
    case 'vibrato-register':
      return gradeHold({ ...item, kind: 'vibrato-steady' }, frames, targets[noteIndex], style);
    case 'vibrato-notes':
      return gradeVibratoNotes(item, frames, targets);
    case 'harmony-hold': {
      if (item.bh?.mode === 'free' && item.bh.dim) {
        // Free choice: any note a half step from the diminished counts; intonation against that note.
        const base = targets[0];
        const r = dimFreeResult(frames, item.bh.dim.map((x) => base + x));
        if (!r) return { ...UNCLEAR, unclear: false, score: 0, metrics: [M('hit', 0, '%', 0, 1)], weakest: 'hit' };
        const g = gradeHold({ ...item, kind: 'hold' }, frames, nearestMidi(frames), style); // intonation against the chosen semitone
        return { ...g, chordMade: r };
      }
      return gradeHold({ ...item, kind: 'hold' }, frames, targets[0], style);
    }
    case 'harmony-line':
      return gradeMelody({ ...item, kind: 'rhythmic' }, frames, targets);
    default:
      return gradeHold(item, frames, targets[0], style);
  }
}

/** Rule-based tip key from the weakest metric (and its sign). */
export function tipFor(g: TakeGrade): string | null {
  if (g.unclear || !g.weakest) return null;
  const h = g.hold;
  switch (g.weakest) {
    case 'drift':
      return h && h.drift < 0 ? 'tipDriftFlat' : 'tipDriftSharp';
    case 'intonation':
      return (h?.intonation ?? 0) < 0 ? 'tipFlat' : 'tipSharp';
    case 'settle':
    case 'scoop':
      return 'tipSettle';
    case 'stability':
      return 'tipStability';
    case 'duration':
      return 'tipBreath';
    case 'vibratoRate':
      return (h?.vibrato.rate ?? 0) > 6.5 ? 'tipVibFast' : 'tipVibSlow';
    case 'vibratoExtent':
      return 'tipVibExtent';
    case 'vibratoRegularity':
      return 'tipVibEven';
    case 'vibratoCue':
      return 'tipVibCue';
    case 'dynamics':
      return 'tipDynamics';
    case 'smoothness':
      return 'tipGlide';
    case 'landing':
      return 'tipLanding';
    case 'hit':
      return 'tipHit';
    case 'transition':
      return 'tipTransition';
    case 'overshoot':
      return 'tipOvershoot';
    case 'legato':
      return 'tipLegato';
    case 'timing':
      return 'tipTiming';
    case 'vibratoJitter':
    case 'vibratoShimmer':
      return 'tipVibEven';
    case 'vibratoPlacement':
      return 'tipVibPlace';
    case 'vibratoConsistency':
      return 'tipVibConsistent';
    default:
      return null;
  }
}

/** Range evenness for the range map: per note score; evenness = 1 − spread of the scores. */
export function rangeEvenness(scores: number[]): number {
  if (scores.length < 2) return 1;
  return Math.max(0, 1 - (Math.max(...scores) - Math.min(...scores)));
}

// ------------------------------------------------------------------ synthetic tracks (tests, simulator)

export interface SynthOpts {
  seconds?: number;
  fps?: number;
  cents?: number; // static offset
  driftPerSec?: number;
  vibRate?: number;
  vibExtent?: number;
  vibFrom?: number; // seconds
  vibTo?: number;
  jitter?: number; // random wobble amplitude (cents), deterministic
  scoop?: number; // cents at the onset, decaying over 0.12 s
  rmsFrom?: number;
  rmsPeak?: number; // messa di voce: rms peaks in the middle
  seed?: number;
  /** Vibrato only inside these [from, to] windows (s). */
  vibWindows?: [number, number][];
}

/** A synthetic sung note around targetMidi (deterministic). */
export function synthHold(targetMidi: number, o: SynthOpts = {}): SungFrame[] {
  const { seconds = 4, fps = 50, cents = 0, driftPerSec = 0, vibRate = 0, vibExtent = 0, vibFrom = 0, vibTo = Infinity, jitter = 0, scoop = 0, rmsFrom = 0.08, rmsPeak, seed = 1, vibWindows } = o;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out: SungFrame[] = [];
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    let c = cents + driftPerSec * t + jitter * rnd();
    const inWin = vibWindows ? vibWindows.some(([a, b]) => t >= a && t <= b) : t >= vibFrom && t <= vibTo;
    if (vibExtent && inWin) c += vibExtent * Math.sin(2 * Math.PI * vibRate * (t - vibFrom));
    if (scoop) c += scoop * Math.max(0, 1 - t / 0.12);
    const rms = rmsPeak ? rmsFrom + (rmsPeak - rmsFrom) * Math.sin((Math.PI * i) / n) : rmsFrom;
    out.push({ t: t + 0.3, hz: midiToHz(targetMidi + c / 100), confidence: 0.95, rms });
  }
  return [{ t: 0, hz: null, confidence: 0, rms: 0 }, ...out];
}

/** A synthetic melody: each target for `noteSec`, joined legato (or with gaps). */
export function synthMelody(targets: number[], noteSec = 0.5, o: { fps?: number; cents?: number; gap?: number; overshoot?: number } = {}): SungFrame[] {
  const { fps = 50, cents = 0, gap = 0, overshoot = 0 } = o;
  const out: SungFrame[] = [];
  let t = 0.3;
  targets.forEach((m, i) => {
    const n = Math.round(noteSec * fps);
    const dir = i ? Math.sign(m - targets[i - 1]) : 0;
    for (let k = 0; k < n; k++) {
      const over = dir && overshoot ? overshoot * dir * Math.max(0, 1 - k / (0.1 * fps)) : 0;
      out.push({ t, hz: midiToHz(m + (cents + over) / 100), confidence: 0.95, rms: 0.08 });
      t += 1 / fps;
    }
    if (gap) {
      const g = Math.round(gap * fps);
      for (let k = 0; k < g; k++) {
        out.push({ t, hz: null, confidence: 0, rms: 0 });
        t += 1 / fps;
      }
    }
  });
  return out;
}

/** A synthetic glide (straight line in pitch, or steps when `steps` is set). */
export function synthGlide(from: number, to: number, seconds = 2, o: { fps?: number; steps?: boolean; landing?: number } = {}): SungFrame[] {
  const { fps = 50, steps = false, landing = 0 } = o;
  const out: SungFrame[] = [];
  const n = Math.round(seconds * fps);
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    let m = from + (to - from) * Math.min(1, p / 0.8);
    if (steps) m = Math.round(m);
    if (p >= 0.8) m = to + landing / 100;
    out.push({ t: 0.3 + i / fps, hz: midiToHz(m), confidence: 0.95, rms: 0.08 });
  }
  return out;
}

/** A synthetic phrase: each note for its own length; flagged notes carry vibrato after 0.25 s. */
export function synthVibratoPhrase(targets: number[], secs: number[], vib: boolean[], o: { fps?: number; rate?: number; extent?: number } = {}): SungFrame[] {
  const { fps = 50, rate = 5.6, extent = 32 } = o;
  const out: SungFrame[] = [];
  let t = 0.3;
  targets.forEach((m, i) => {
    const n = Math.round((secs[i] ?? 0.5) * fps);
    for (let k = 0; k < n; k++) {
      const local = k / fps;
      const c = vib[i] && local > 0.25 ? extent * Math.sin(2 * Math.PI * rate * (local - 0.25)) : 0;
      out.push({ t, hz: midiToHz(m + c / 100), confidence: 0.95, rms: 0.08 });
      t += 1 / fps;
    }
  });
  return out;
}

/**
 * Melodic memory and the reference (spec P.9): the first reference is part of the task; every further
 * request to hear it again costs 15 % of the melodic-memory score (never below 40 %). Pitch quality
 * (Vocal technique) is not affected.
 */
export const memoryFactor = (extraReferences: number) => Math.max(0.4, 1 - 0.15 * Math.max(0, extraReferences));

/** The nearest whole MIDI note of a take (its median pitch). */
function nearestMidi(frames: SungFrame[]): number {
  const ms = frames.filter((f) => f.hz && f.confidence >= 0.8).map((f) => hzToMidi(f.hz!)).sort((a, b) => a - b);
  return Math.round(ms[ms.length >> 1] ?? 60);
}

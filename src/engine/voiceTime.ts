// Time feel for the voice (VOICE_CURRICULUM F7, the core engine of songs, standards and scat): sung onsets against a
// click or a band, after the microphone's delay is removed. Pure and deterministic, unit-tested on synthetic frames.
//
// Honest limits (§4 of the curriculum): a sung onset is only good to about ±25–40 ms on a phone, so "laid back" is
// judged as the AVERAGE over 8 or more notes, never note by note; the swing ratio only on articulated syllables
// ("doo-bah"), never legato; Bluetooth headphones add 150–300 ms, so the delay must be calibrated first.

import type { SungFrame } from './sing';
import { hzToMidi } from './pitch';

const dbOf = (rms: number) => 20 * Math.log10(Math.max(1e-5, rms));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const voicedF = (f: SungFrame) => !!f.hz && f.confidence >= 0.75 && f.hz > 55 && f.hz < 1400;

/**
 * Onsets of sung notes (seconds, the frames' clock): a new attack after quiet (a breath or a consonant: the level
 * rises 8 dB or more within 90 ms from a dip), or voice starting after 60 ms or more without it. Two onsets are at
 * least `minGap` apart (a fast run of eighths at 200 bpm is 150 ms).
 */
export function voiceOnsets(frames: SungFrame[], o: { minGap?: number; rise?: number; anyAttack?: boolean } = {}): number[] {
  const minGap = o.minGap ?? 0.11;
  const rise = o.rise ?? 8;
  if (frames.length < 3) return [];
  const ds = frames.map((f) => dbOf(f.rms));
  const sorted = [...ds].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  // Above the room, but never above "10 dB under the loud part" (a legato take has almost no quiet frames).
  const thr = Math.min(peak - 10, Math.max(floor + 6, peak - 28));
  const out: number[] = [];
  // Only a sung onset counts: two voiced frames within 60 ms after it (a click from the speaker has no pitch).
  const sungAfter = (t: number) => frames.filter((f) => f.t >= t && f.t <= t + 0.06 && voicedF(f)).length >= 2;
  const add = (t: number) => {
    if ((!out.length || t - out[out.length - 1] >= minGap) && (o.anyAttack || sungAfter(t))) out.push(t);
  };
  let unvoiced = 99;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i];
    // A loud rise from a recent dip (the attack of "dah", "doo-BAH").
    if (ds[i] >= thr && ds[i] - ds[i - 1] > 0.5) {
      let lo = ds[i];
      let k = i;
      for (let j = i - 1; j >= 0 && frames[i].t - frames[j].t <= 0.09; j--) {
        if (ds[j] < lo) {
          lo = ds[j];
          k = j;
        }
      }
      if (ds[i] - lo >= rise) {
        // The onset is where the rise passes its midpoint.
        const half = lo + (ds[i] - lo) / 2;
        let at = i;
        for (let j = k; j <= i; j++)
          if (ds[j] >= half) {
            at = j;
            break;
          }
        if (!out.length || frames[at].t - out[out.length - 1] >= minGap) add(frames[at].t);
      }
    }
    // Voice starting after a stretch without it.
    const v = voicedF(f) && ds[i] >= thr - 6;
    if (v && unvoiced * (frames[i].t - frames[i - 1].t) >= 0.06) add(f.t);
    unvoiced = v ? 0 : unvoiced + 1;
  }
  return out;
}

export interface TimeFeel {
  /** Grid points with a matched onset. */
  n: number;
  expected: number;
  /** Per grid point: signed offset in ms (+ = late), after the delay is removed; null = no onset near it. */
  offsets: (number | null)[];
  meanMs: number;
  sdMs: number;
  /** Mean absolute offset (ms). */
  absMs: number;
  /** Onsets that matched no grid point (inside the take's span). */
  extra: number;
}

/**
 * Onsets against a grid (both in seconds on one clock): each grid point takes the nearest unused onset inside
 * ±window, in order. `latencyMs` (the microphone's calibrated delay) is removed from every offset.
 */
export function timeFeel(onsets: number[], grid: number[], o: { latencyMs?: number; window?: number } = {}): TimeFeel {
  const lat = (o.latencyMs ?? 0) / 1000;
  const win = o.window ?? 0.25;
  const on = onsets.map((t) => t - lat);
  const used = new Set<number>();
  const offsets = grid.map((g) => {
    let best = -1;
    for (let k = 0; k < on.length; k++) {
      if (used.has(k) || Math.abs(on[k] - g) > win) continue;
      if (best < 0 || Math.abs(on[k] - g) < Math.abs(on[best] - g)) best = k;
    }
    if (best < 0) return null;
    used.add(best);
    return Math.round((on[best] - g) * 1000);
  });
  const got = offsets.filter((x): x is number => x !== null);
  const span = grid.length ? [grid[0] - win, grid[grid.length - 1] + win] : [0, 0];
  const extra = on.filter((t, k) => !used.has(k) && t >= span[0] && t <= span[1]).length;
  return { n: got.length, expected: grid.length, offsets, meanMs: Math.round(mean(got)), sdMs: Math.round(sd(got)), absMs: Math.round(mean(got.map(Math.abs))), extra };
}

export type FeelVerdict = 'on' | 'laid-back' | 'rushing' | 'loose' | 'too-few';
/** On top, laid back or rushing — from the mean of 8 or more notes only (one note is never judged). */
export function feelVerdict(f: Pick<TimeFeel, 'n' | 'meanMs' | 'sdMs'>): FeelVerdict {
  if (f.n < 8) return 'too-few';
  if (f.sdMs > 60) return 'loose';
  if (f.meanMs > 30) return 'laid-back';
  if (f.meanMs < -30) return 'rushing';
  return 'on';
}

/**
 * Swing ratio of articulated eighth pairs (long : short): for each beat with an onset near it and an off-beat onset
 * after it, (off − on) : (next beat − off). Median over the pairs. 2 = a triplet swing, 1 = straight.
 */
export function swingRatioOf(onsets: number[], beatSec: number, beats: number, o: { latencyMs?: number; t0?: number } = {}): { ratio: number; pairs: number } {
  const lat = (o.latencyMs ?? 0) / 1000;
  const t0 = o.t0 ?? 0;
  const on = onsets.map((t) => t - lat - t0);
  const rs: number[] = [];
  for (let k = 0; k < beats; k++) {
    const b = k * beatSec;
    const down = on.find((t) => Math.abs(t - b) <= 0.2 * beatSec);
    if (down === undefined) continue;
    const off = on.find((t) => t - b >= 0.35 * beatSec && t - b <= 0.85 * beatSec);
    if (off === undefined) continue;
    const long = off - down;
    const short = b + beatSec - off;
    if (short > 0.02) rs.push(long / short);
  }
  return { ratio: rs.length ? Math.round(median(rs) * 100) / 100 : 0, pairs: rs.length };
}

/** The swing band to aim for at a tempo (medium: a real swing; fast: flatter, as players do). */
export const swingBand = (bpm: number): [number, number] => (bpm >= 180 ? [1.2, 1.7] : bpm >= 150 ? [1.35, 2] : [1.5, 2.3]);

// ---------------------------------------------------------------- pitch along a timeline

export interface TimedNote {
  midi: number;
  /** Seconds from the grid's zero. */
  start: number;
  dur: number;
}

/** Share of a note's frames within ±tol cents (octave-folded); null when the note was not sung. */
export function notePitchShare(frames: SungFrame[], n: TimedNote, tol = 50, lag = 0): number | null {
  const a = n.start + lag + Math.min(0.1, n.dur * 0.25);
  const b = n.start + lag + n.dur - 0.03;
  const inNote = frames.filter((f) => f.t >= a && f.t <= b && voicedF(f));
  if (inNote.length < 3) return null;
  const ok = inNote.filter((f) => Math.abs(foldC((hzToMidi(f.hz!) - n.midi) * 100)) <= tol).length;
  return ok / inNote.length;
}

/** Median signed cents of a note (octave-folded), or null. */
export function noteCents(frames: SungFrame[], n: TimedNote, lag = 0): number | null {
  const a = n.start + lag + Math.min(0.12, n.dur * 0.3);
  const b = n.start + lag + n.dur - 0.03;
  const cs = frames.filter((f) => f.t >= a && f.t <= b && voicedF(f)).map((f) => foldC((hzToMidi(f.hz!) - n.midi) * 100));
  return cs.length >= 3 ? Math.round(median(cs)) : null;
}
const foldC = (c: number) => ((((c + 600) % 1200) + 1200) % 1200) - 600;

/**
 * Unaccompanied drift (F2): per phrase, the median signed cents of its notes against the starting key; drift = the
 * last phrase's offset − the first phrase's; note error = each note's distance from its own phrase's offset (the
 * tuning inside a phrase, once the slow slide is taken out). Mauch, Frieler & Dixon 2014: median ≈ 19 ¢ untrained.
 */
export function driftOf(cents: (number | null)[], phraseOf: number[]): { drift: number; medianError: number; perPhrase: number[] } | null {
  const phrases = [...new Set(phraseOf)].sort((a, b) => a - b);
  const per: number[] = [];
  const errs: number[] = [];
  for (const p of phrases) {
    const cs = cents.filter((c, i) => phraseOf[i] === p && c !== null) as number[];
    if (cs.length < 2) continue;
    const off = median(cs);
    per.push(Math.round(off));
    for (const c of cs) errs.push(Math.abs(c - off));
  }
  if (per.length < 2) return null;
  return { drift: per[per.length - 1] - per[0], medianError: Math.round(median(errs)), perPhrase: per };
}

// ---------------------------------------------------------------- synthetic takes (tests, simulator)

/** "dah" on each onset (s): a note of `len` s with a quiet consonant before it; `late` (s) shifts all of them. */
export function synthDahs(onsets: number[], midi = 60, o: { len?: number; fps?: number; late?: number; end?: number; jitter?: number[] } = {}): SungFrame[] {
  const { len = 0.22, fps = 100, late = 0 } = o;
  const end = o.end ?? (onsets.length ? onsets[onsets.length - 1] + 1 : 1);
  const at = onsets.map((t, i) => t + late + (o.jitter?.[i % (o.jitter?.length || 1)] ?? 0));
  const out: SungFrame[] = [];
  for (let k = 0; k <= end * fps; k++) {
    const t = k / fps;
    const on = at.find((s) => t >= s && t < s + len);
    out.push(on !== undefined ? { t, hz: 440 * 2 ** ((midi - 69) / 12), confidence: 0.95, rms: 0.12 } : { t, hz: null, confidence: 0, rms: 0.002 });
  }
  return out;
}

/** A sung line along timed notes (legato with a short dip at each new note, like a consonant). */
export function synthLine(notes: TimedNote[], o: { fps?: number; cents?: number | ((i: number) => number); late?: number; gapAfter?: number[] } = {}): SungFrame[] {
  const { fps = 100, late = 0 } = o;
  const out: SungFrame[] = [];
  const end = notes.length ? notes[notes.length - 1].start + notes[notes.length - 1].dur + 0.3 : 0.5;
  for (let k = 0; k <= end * fps; k++) {
    const t = k / fps;
    const i = notes.findIndex((n) => t >= n.start + late && t < n.start + late + n.dur);
    const gap = i >= 0 && (o.gapAfter ?? []).includes(i) && t > notes[i].start + late + notes[i].dur - 0.3;
    if (i < 0 || gap) {
      out.push({ t, hz: null, confidence: 0, rms: 0.002 });
      continue;
    }
    const c = typeof o.cents === 'function' ? o.cents(i) : o.cents ?? 0;
    const dip = t - (notes[i].start + late) < 0.03;
    out.push({ t, hz: 440 * 2 ** ((notes[i].midi + c / 100 - 69) / 12), confidence: dip ? 0.5 : 0.95, rms: dip ? 0.01 : 0.12 });
  }
  return out;
}

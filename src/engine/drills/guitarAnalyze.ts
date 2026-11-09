// Guitar take analysis (docs/SPEC-GUITAR-TECHNIQUE.md §6): composed on top of the piano analyzeTake. Pure.
// The microphone gives pitch frames (f0 + confidence), loudness (RMS) and optionally a spectral centroid. From them:
//  · detectOnsets — energy onsets (picked notes, strums, muted "chucks") + pitch-change onsets (hammer / pull / slide);
//  · normalizeGuitarTake — guitar-aware clean-up before the generic alignment: octave errors folded, bend / vibrato /
//    slide pitch glides removed, a strum's string onsets clustered into one chord, unpitched onsets snapped;
//  · analyzeGuitarTake — analyzeTake + guitar extras: bend intonation (cents), vibrato rate / width, legato volume,
//    chord-change gaps, palm-mute share, changes per minute, and the self-check list for what audio cannot judge.
// Thresholds marked ⚙ are research starting points (research doc §5), to calibrate with real takes.

import type { Drill, DrillCalibration, ExpNote, PlayedNote, TakeMetrics, TakeRules, Verdict } from './types';
import { analyzeTake, bassThresholds, expTimeMs, median, npsOf, tempoBand } from './analyze';
import { meanChroma, ringCheck } from '../chroma';
import { centsOff, crossingPenalty, ghostGapDb, ioiDrift, kickLock, lengthClass, lengthMatch, loudSdDb, oddEvenAsym, overlapMs, pocketShare, releaseAccuracy, releaseTime, ringThrough, ruleCheck, shiftGap, slapClass, subBias, swingRatio, zoneShift } from './bassAnalyze';
import { tuningById } from '../fretboard';
import { bassPitchOpts } from '../yin';

/** One analysis frame from the microphone (times in ms relative to beat 0, latency removed). */
export interface GFrame {
  t: number;
  /** Fundamental frequency (Hz) or null when unvoiced. */
  hz: number | null;
  /** Pitch confidence 0..1 (YIN / pYIN clarity). */
  conf?: number;
  /** Loudness (linear RMS). */
  rms: number;
  /** Spectral centroid (Hz), optional — sharpens the palm-mute cue. */
  centroid?: number;
  /** 12-bin chroma (C = 0, max 1), optional — the chord ring-check (SPEC-0.48 §I1). */
  chroma?: number[];
}

/** Pitch of an onset whose pitch could not be read (strum noise, muted chuck). */
export const UNPITCHED = -1;

type T2 = { en: string; he: string };
const PC_EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const PC_HE = ['דו', 'דו♯', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const midiHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
const centsOf = (hz: number, base: number): number => 1200 * Math.log2(hz / midiHz(base));
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

// ───────────────────────────── onsets from frames ─────────────────────────────

/** A bass drill (the bass course, the old g-bass starter, or any drill for the bass): bass capture + bass rules. */
export const isBassDrill = (drill: Drill): boolean => drill.spec.family.startsWith('b-') || drill.spec.family === 'g-bass' || drill.spec.instrument === 'bass';

/**
 * Microphone settings for a drill (BASS_AUDIT A1): bass → minHz 28 (22 when the tuning has a low B), a 4096-sample
 * analyser and the spectral centroid (plucking zone / slap advice); guitar → null (the 2048 / 70 Hz default).
 * `tuning` = the player's bass tuning id when the drill has none.
 */
export function captureOptsFor(drill: Drill, tuning?: string): { minHz: number; fftSize: number; centroid: boolean } | null {
  if (!isBassDrill(drill)) return null;
  const tu = tuningById(drill.spec.tuning ?? tuning ?? 'bass');
  const lowB = tu.instrument === 'bass' && Math.min(...tu.open) < 28;
  return { ...bassPitchOpts(lowB), centroid: true };
}

/** detectOnsets options for a drill: bass reads the pitch 40–120 ms after the onset (low E needs ~48 ms, low B ~65). */
export const onsetOptsFor = (drill: Drill): { pitchFrom: number; pitchTo: number } => (isBassDrill(drill) ? { pitchFrom: 40, pitchTo: 120 } : { pitchFrom: 20, pitchTo: 80 });

/**
 * Onsets from microphone frames: an energy rise (≥ ratio × the recent minimum, above the floor) starts a note; a new
 * stable pitch without an energy rise starts a legato note (hammer-on / pull-off / slide arrival). Pitch = the median
 * f0 20–80 ms after the onset (bass: 40–120 ms, see onsetOptsFor) when confident, else UNPITCHED. Velocity = peak RMS
 * mapped to 1–127 (relative only). Timing is always the energy onset, never the pitch frame.
 */
export function detectOnsets(frames: GFrame[], opts: { ratio?: number; floor?: number; refractoryMs?: number; minConf?: number; pitchFrom?: number; pitchTo?: number } = {}): PlayedNote[] {
  const ratio = opts.ratio ?? 1.8;
  const floor = opts.floor ?? 0.01;
  const refr = opts.refractoryMs ?? 50;
  const minConf = opts.minConf ?? 0.8;
  const pFrom = opts.pitchFrom ?? 20;
  const pTo = opts.pitchTo ?? 80;
  const out: PlayedNote[] = [];
  const pitchAt = (t0: number): number => {
    // Never past the next energy onset (a fast note's window would read the next one).
    const nextOn = frames.find((f, i) => f.t > t0 + refr && i > 0 && f.rms > floor && f.rms > ratio * Math.max(Math.min(...frames.slice(Math.max(0, i - 3), i).map((x) => x.rms)), floor / 2));
    const to = Math.min(t0 + pTo, nextOn ? nextOn.t - 5 : Infinity);
    const hs = frames.filter((f) => f.t >= t0 + pFrom && f.t <= to && f.hz && (f.conf ?? 1) >= minConf).map((f) => 69 + 12 * Math.log2(f.hz! / 440));
    return hs.length ? Math.round(median(hs)) : UNPITCHED;
  };
  const peakAt = (t0: number): number => Math.max(0, ...frames.filter((f) => f.t >= t0 && f.t <= t0 + 50).map((f) => f.rms));
  let last = -Infinity;
  let stable: number | null = null;
  let cand: number | null = null;
  let candSince = 0;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const prev = frames.slice(Math.max(0, i - 3), i).map((x) => x.rms);
    const base = prev.length ? Math.min(...prev) : 0;
    if (f.rms > floor && f.rms > ratio * Math.max(base, floor / 2) && f.t - last > refr) {
      last = f.t;
      const p = pitchAt(f.t);
      out.push({ pitch: p, on: f.t, off: null, vel: velOf(peakAt(f.t)) });
      stable = p === UNPITCHED ? null : p;
      cand = null;
      continue;
    }
    // Legato: a new stable pitch (≥ 40 ms) with no attack.
    if (f.hz && (f.conf ?? 1) >= minConf) {
      const m = Math.round(69 + 12 * Math.log2(f.hz / 440));
      if (m !== cand) {
        cand = m;
        candSince = f.t;
      } else if (m !== stable && f.t - candSince >= 40 && candSince - last > refr) {
        out.push({ pitch: m, on: candSince, off: null, vel: velOf(f.rms) });
        last = candSince;
        stable = m;
      }
    }
  }
  // Offsets: the RMS falls under 10 % of the note's peak.
  for (let k = 0; k < out.length; k++) {
    const n = out[k];
    const end = k + 1 < out.length ? out[k + 1].on : Infinity;
    const pk = peakAt(n.on);
    const fall = frames.find((f) => f.t > n.on + 30 && f.t < end && f.rms < 0.1 * pk);
    n.off = fall ? fall.t : null;
  }
  return out;
}
function velOf(rms: number): number {
  if (rms <= 0) return 1;
  const db = 20 * Math.log10(rms); // −60 dB … 0 dB → 1 … 127
  return Math.max(1, Math.min(127, Math.round(((db + 60) / 60) * 126) + 1));
}

// ───────────────────────────── normalisation ─────────────────────────────

interface Group {
  t: number;
  notes: ExpNote[];
  pcs: Set<number>;
}
function groupsOf(drill: Drill, bpm: number): Group[] {
  const m = new Map<number, Group>();
  for (const n of drill.notes) {
    const k = Math.round(n.beat * 1e4);
    let g = m.get(k);
    if (!g) {
      g = { t: expTimeMs(drill, n.beat, bpm), notes: [], pcs: new Set() };
      m.set(k, g);
    }
    g.notes.push(n);
    g.pcs.add(mod12(n.pitch));
  }
  return [...m.values()].sort((a, b) => a.t - b.t);
}

export interface Normalized {
  played: PlayedNote[];
  /** Onsets without a readable pitch that were snapped to an expected note (timing only). */
  unpitched: number;
  /** Pitches read an octave off and folded to the expected one. */
  octaveFixed: number;
  /** Glide artifacts dropped (bend / vibrato / slide pitches). */
  glides: number;
  /** Clustered strums: onset, spread of the string onsets (ms), how many onsets were merged. */
  strums: { at: number; spread: number; size: number }[];
  /** The single onsets snapped to an expected note for TIMING only (objects inside `played`): never a right pitch. */
  snapped: PlayedNote[];
}

/**
 * Guitar-aware clean-up of a take before analyzeTake (see the header). Played notes with pitch UNPITCHED are onsets
 * from detectOnsets that had no readable pitch.
 */
export function normalizeGuitarTake(drill: Drill, bpm: number, played: PlayedNote[], opts: { strumWindowMs?: number } = {}): Normalized {
  const beatMs = 60000 / bpm;
  const gs = groupsOf(drill, bpm);
  const radius = (i: number): number => Math.min(beatMs / 2, i > 0 ? (gs[i].t - gs[i - 1].t) / 2 : Infinity, i < gs.length - 1 ? (gs[i + 1].t - gs[i].t) / 2 : Infinity);
  let ps = played.map((p) => ({ ...p }));
  let octaveFixed = 0;
  let glides = 0;
  let unpitched = 0;

  // 1) Octave errors (guitar fundamentals are weak; trackers jump an octave).
  for (const p of ps) {
    if (p.pitch === UNPITCHED) continue;
    const near = gs.filter((g, i) => Math.abs(p.on - g.t) <= radius(i));
    if (near.some((g) => g.notes.some((n) => n.pitch === p.pitch))) continue;
    for (const g of near) {
      const e = g.notes.find((n) => mod12(n.pitch - p.pitch) === 0 && Math.abs(n.pitch - p.pitch) <= 24);
      if (e) {
        p.pitch = e.pitch;
        octaveFixed++;
        break;
      }
    }
  }

  // 2) Glides: pitches passed through during a bend / release / vibrato / slide are not new notes.
  const drop = new Set<number>();
  gs.forEach((g, i) => {
    const next = i < gs.length - 1 ? gs[i + 1].t : g.t + Math.max(...g.notes.map((n) => n.dur)) * beatMs;
    const prev = i > 0 ? gs[i - 1] : null;
    for (const n of g.notes) {
      const tech = n.technique;
      if (tech === 'bend' || tech === 'prebend' || tech === 'vibrato') {
        const k = Math.max(1, Math.ceil((n.bendCents ?? 100) / 100));
        const fret = tech === 'prebend' ? n.pitch - k : n.pitch;
        ps.forEach((p, j) => {
          if (p.pitch === UNPITCHED || p.on <= g.t + 30 || p.on >= next - 30) return;
          if (p.pitch >= fret && p.pitch <= fret + k && !(p.pitch === n.pitch && Math.abs(p.on - g.t) < 30)) drop.add(j);
        });
      }
      if (tech === 'slide' && prev) {
        const from = prev.notes[0].pitch;
        const lo = Math.min(from, n.pitch);
        const hi = Math.max(from, n.pitch);
        ps.forEach((p, j) => {
          if (p.pitch === UNPITCHED || p.on <= prev.t + 30 || p.on >= g.t + radius(i)) return;
          if (p.pitch > lo && p.pitch < hi) drop.add(j);
        });
      }
    }
  });
  glides = drop.size;
  ps = ps.filter((_, j) => !drop.has(j));

  // 3) Strums: a chord's string onsets within the strum window become one chord at the first onset.
  const win = opts.strumWindowMs ?? 90;
  const used = new Set<number>();
  const strums: Normalized['strums'] = [];
  const out: PlayedNote[] = [];
  gs.forEach((g, i) => {
    if (g.notes.length < 2) return;
    const r = radius(i);
    const cands = ps
      .map((p, j) => ({ p, j }))
      .filter(({ p, j }) => !used.has(j) && Math.abs(p.on - g.t) <= r)
      .sort((a, b) => a.p.on - b.p.on);
    if (!cands.length) return;
    const t0 = cands[0].p.on;
    const members = cands.filter(({ p }) => p.on - t0 <= Math.min(win, r));
    const fits = members.every(({ p }) => p.pitch === UNPITCHED || g.pcs.has(mod12(p.pitch)));
    if (!fits) return;
    for (const { j } of members) used.add(j);
    if (members.every(({ p }) => p.pitch === UNPITCHED)) unpitched++;
    const vel = Math.max(...members.map(({ p }) => p.vel));
    for (const n of g.notes) out.push({ pitch: n.pitch, on: t0, off: null, vel });
    strums.push({ at: t0, spread: members[members.length - 1].p.on - t0, size: members.length });
  });

  // 4) Unpitched single onsets snap to the nearest single-note group (TIMING only: analyzeGuitarTake never credits
  //    their pitch, BASS_AUDIT A2); unmatched ones stay extra. A pitched onset at an expected dead note whose pitch
  //    matches nothing written there (a muted string reads as noise) is treated the same way.
  const snapped: PlayedNote[] = [];
  const nearestSingle = (p: PlayedNote): number => {
    let best = -1;
    let bd = Infinity;
    gs.forEach((g, i) => {
      const d = Math.abs(p.on - g.t);
      if (g.notes.length === 1 && d <= radius(i) / 2 && d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  ps.forEach((p, j) => {
    if (used.has(j)) return;
    if (p.pitch !== UNPITCHED) {
      const k = nearestSingle(p);
      const near = gs.filter((g, i) => Math.abs(p.on - g.t) <= radius(i));
      if (k >= 0 && gs[k].notes[0].technique === 'dead' && !near.some((g) => g.notes.some((n) => n.pitch === p.pitch))) {
        const s = { ...p, pitch: gs[k].notes[0].pitch };
        snapped.push(s);
        out.push(s);
        return;
      }
      out.push(p);
      return;
    }
    const best = nearestSingle(p);
    if (best >= 0) {
      unpitched++;
      const s = { ...p, pitch: gs[best].notes[0].pitch };
      snapped.push(s);
      out.push(s);
    } else out.push(p);
  });
  out.sort((a, b) => a.on - b.on);
  return { played: out, unpitched, octaveFixed, glides, strums, snapped };
}

// ───────────────────────────── expression: bends, vibrato ─────────────────────────────

export interface BendResult {
  /** Target bend (cents above the fretted note). */
  target: number;
  /** Highest point reached (cents). */
  peak: number;
  /** Median of the held part (cents), null when the bend never got near the target. */
  held: number | null;
  /** held − target (cents): + = sharp (over-bent), − = flat. */
  error: number;
  /** Time from the pick to 90 % of the target (ms). */
  riseMs: number | null;
  /** SD of the held part (cents): wobble. */
  wobble: number | null;
  /** Came back to the fretted pitch (within 25 cents) before the window ended. */
  released: boolean;
  verdict: Verdict;
}

/** Points (time, cents above `base`) of confident frames in a window. */
function trace(frames: GFrame[], base: number, from: number, to: number): { t: number; c: number }[] {
  return frames.filter((f) => f.t >= from && f.t <= to && f.hz && (f.conf ?? 1) >= 0.5).map((f) => ({ t: f.t, c: centsOf(f.hz!, base) }));
}

/** Bend intonation from the pitch trace (⚙ clean ≤ 15 cents, almost ≤ 30). */
export function analyzeBend(frames: GFrame[], fretPitch: number, targetCents: number, fromMs: number, toMs: number): BendResult {
  const pts = trace(frames, fretPitch, fromMs, toMs);
  if (pts.length < 3) return { target: targetCents, peak: 0, held: null, error: -targetCents, riseMs: null, wobble: null, released: false, verdict: 'not' };
  const peak = Math.max(...pts.map((p) => p.c));
  const reach = pts.find((p) => p.c >= 0.9 * targetCents);
  const iReach = reach ? pts.indexOf(reach) : -1;
  // The held part: after reaching, while still within 25 % of the target.
  const held: number[] = [];
  if (iReach >= 0) for (let i = iReach; i < pts.length && pts[i].c >= 0.75 * targetCents; i++) held.push(pts[i].c);
  const h = held.length ? median(held) : null;
  const error = h !== null ? h - targetCents : peak - targetCents;
  const lastIdx = iReach >= 0 ? iReach + held.length : pts.length;
  const released = pts.slice(lastIdx).some((p) => Math.abs(p.c) <= 25);
  const ae = Math.abs(error);
  const verdict: Verdict = h === null ? 'not' : ae <= 15 ? 'clean' : ae <= 30 ? 'almost' : 'not';
  return { target: targetCents, peak, held: h, error, riseMs: reach ? reach.t - fromMs : null, wobble: held.length >= 3 ? sd(held) : null, released, verdict };
}

export interface VibratoResult {
  /** Cycles per second. */
  rateHz: number | null;
  /** Median peak-to-trough width (cents). */
  widthCents: number | null;
  /** CV of the cycle lengths (0 = perfectly regular). */
  irregularity: number | null;
  cycles: number;
  verdict: Verdict;
}

/**
 * Vibrato rate and width from the pitch trace. Targets (⚙, research: string vibrato 4–8 Hz, typically 5–7; width
 * 20–60 cents finger vibrato, ≥ 60 cents wide rock vibrato): pass `wide` for the rock target.
 */
export function analyzeVibrato(frames: GFrame[], fretPitch: number, fromMs: number, toMs: number, wide = false): VibratoResult {
  const pts = trace(frames, fretPitch, fromMs + 80, toMs);
  const none: VibratoResult = { rateHz: null, widthCents: null, irregularity: null, cycles: 0, verdict: 'not' };
  if (pts.length < 8) return none;
  // Extrema with 8-cent hysteresis.
  const ext: { t: number; c: number; max: boolean }[] = [];
  let dir = 0;
  let cur = pts[0];
  for (const p of pts.slice(1)) {
    if (dir === 0) {
      if (Math.abs(p.c - cur.c) >= 8) dir = p.c > cur.c ? 1 : -1;
      cur = p;
    } else if (dir === 1) {
      if (p.c >= cur.c) cur = p;
      else if (cur.c - p.c >= 8) {
        ext.push({ ...cur, max: true });
        dir = -1;
        cur = p;
      }
    } else if (p.c <= cur.c) cur = p;
    else if (p.c - cur.c >= 8) {
      ext.push({ ...cur, max: false });
      dir = 1;
      cur = p;
    }
  }
  const peaks = ext.filter((e) => e.max);
  if (peaks.length < 2) return none;
  const periods = peaks.slice(1).map((p, i) => p.t - peaks[i].t);
  const rate = 1000 / mean(periods);
  const widths: number[] = [];
  for (let i = 1; i < ext.length; i++) widths.push(Math.abs(ext[i].c - ext[i - 1].c));
  const width = median(widths);
  const irr = periods.length >= 2 ? sd(periods) / mean(periods) : 0;
  const rateOk = rate >= 4 && rate <= 8;
  const widthOk = wide ? width >= 60 : width >= 20 && width <= 80;
  const verdict: Verdict = rateOk && widthOk && irr <= 0.25 ? 'clean' : rateOk || widthOk ? 'almost' : 'not';
  return { rateHz: rate, widthCents: width, irregularity: irr, cycles: peaks.length, verdict };
}

// ───────────────────────────── loudness cues ─────────────────────────────

const peakRms = (frames: GFrame[], t0: number, ms = 50): number => Math.max(0, ...frames.filter((f) => f.t >= t0 && f.t <= t0 + ms).map((f) => f.rms));

/** Legato evenness: median loudness of hammered / pulled notes ÷ median of picked notes (⚙ target ≥ 0.5 ≈ −6 dB). */
export function legatoRatio(frames: GFrame[], notes: { on: number; technique?: ExpNote['technique'] }[]): number | null {
  const leg = notes.filter((n) => n.technique === 'hammer' || n.technique === 'pull').map((n) => peakRms(frames, n.on));
  const pick = notes.filter((n) => n.technique !== 'hammer' && n.technique !== 'pull' && n.technique !== 'tap').map((n) => peakRms(frames, n.on));
  if (!leg.length || !pick.length || median(pick) <= 0) return null;
  return median(leg) / median(pick);
}

/** Silence before each chord change (ms): RMS under `floor` × the median strum peak between two strums. */
export function changeGaps(frames: GFrame[], strumTimes: number[], changeIdx: number[], floor = 0.1): number[] {
  const peaks = strumTimes.map((t) => peakRms(frames, t));
  const ref = median(peaks.filter((p) => p > 0)) || 0;
  const step = frames.length > 1 ? Math.max(1, (frames[frames.length - 1].t - frames[0].t) / (frames.length - 1)) : 10;
  return changeIdx
    .filter((i) => i > 0 && i < strumTimes.length)
    .map((i) => frames.filter((f) => f.t > strumTimes[i - 1] + 30 && f.t < strumTimes[i] && f.rms < floor * ref).length * step);
}

/** Palm-mute cue: a fast decay (−20 dB within ⚙ 200 ms) and, when a centroid is given, a dull tone (⚙ < 1500 Hz). */
export function palmMuteScore(frames: GFrame[], onMs: number): { decayMs: number | null; centroid: number | null; muted: boolean } {
  const pk = peakRms(frames, onMs);
  if (pk <= 0) return { decayMs: null, centroid: null, muted: false };
  const fall = frames.find((f) => f.t > onMs + 20 && f.rms <= pk * 0.1);
  const decay = fall ? fall.t - onMs : null;
  const cs = frames.filter((f) => f.t >= onMs && f.t <= onMs + 60 && f.centroid !== undefined).map((f) => f.centroid!);
  const centroid = cs.length ? median(cs) : null;
  const muted = decay !== null && decay <= 200 && (centroid === null || centroid < 1500);
  return { decayMs: decay, centroid, muted };
}

// ───────────────────────────── self-checks (what audio cannot judge) ─────────────────────────────

/** The honest list: shown as tick boxes after a take, never graded. */
export function selfChecks(drill: Drill): T2[] {
  const techs = new Set(drill.notes.map((n) => n.technique));
  const strokes = new Set(drill.notes.map((n) => n.stroke));
  const out: T2[] = [];
  if (strokes.has('D') && strokes.has('U')) out.push({ en: 'Pick direction as written (down / up)', he: 'כיוון הפריטה כמו שכתוב (למטה / למעלה)' });
  if (['p', 'i', 'm', 'a', 'c'].some((s) => strokes.has(s as never))) out.push({ en: 'Right-hand fingers as written (p i m a)', he: 'אצבעות יד ימין כמו שכתוב (p i m a)' });
  if (drill.notes.some((n) => n.finger)) out.push({ en: 'Fretting fingers as shown, fingertips just behind the fret', he: 'אצבעות יד שמאל כמו שמוצג, קצות האצבעות ממש מאחורי הסריג' });
  out.push({ en: 'Unused strings muted (no ringing, no string noise)', he: 'מיתרים לא בשימוש מושתקים (בלי צלצול ורעשים)' });
  if (techs.has('strum-down') || techs.has('strum-up') || techs.has('dead')) out.push({ en: 'Strumming hand kept moving down-up', he: 'יד הפריטה המשיכה לנוע למטה-למעלה' });
  if (techs.has('rest-stroke')) out.push({ en: 'Rest stroke: the finger came to rest on the next string', he: 'מכה נשענת: האצבע נחה על המיתר הבא' });
  if (techs.has('tap')) out.push({ en: 'Tapped with the picking hand, other strings muted', he: 'הקשה ביד הפורטת, שאר המיתרים מושתקים' });
  out.push({ en: 'Relaxed: no pain, no squeezing', he: 'רפוי: בלי כאב ובלי לחיצה חזקה מדי' });
  return out;
}

// ───────────────────────────── the guitar analysis ─────────────────────────────

export interface GuitarExtras {
  unpitched: number;
  octaveFixed: number;
  glides: number;
  /** Mean spread of the string onsets in a strum (ms) — a slow / dragged strum shows here. */
  strumSpread: number | null;
  bends: BendResult[];
  vibrato: VibratoResult[];
  legatoRatio: number | null;
  /** Mean silence before a chord change (ms). */
  changeGapMs: number | null;
  /** Share of palm-muted notes that sounded muted. */
  palmMuteShare: number | null;
  /** Clean chord changes per minute (chord drills). */
  changesPerMin: number | null;
  /** Chord ring-check: chords judged, chords where every note rang, and how often each pitch class was missing. */
  ring: { chords: number; full: number; missing: Record<number, number> } | null;
  selfCheck: T2[];
  /** Expected pitched notes heard only as an onset without a pitch: timing counted, pitch never credited (A2). */
  unclear: number;
  /** Bass measures (drills with goal.bass): what was measured, null where it could not be. */
  bass?: BassMeasures;
  /** Advice lines that never change the verdict (slap / pop classes, A13). */
  advice?: T2[];
}

/** What the bass rules measured in a take (guitar.bass). Null = not asked for, or could not be measured. */
export interface BassMeasures {
  asym: { ms: number; db: number | null } | null;
  loudSd: number | null;
  crossing: number | null;
  kick: { lock: number; stray: number } | null;
  /** Share of notes whose length class matched (mic frames or MIDI note-offs). */
  lengths: number | null;
  ghostDb: number | null;
  /** A3: share of notes in the right class (dead = unpitched / short, the rest pitched). */
  ghostClass: number | null;
  /** A6: |mean offset| (ms) and the limit used (bass default 15 MIDI / 25 mic). */
  meanMs: { ms: number; lim: number } | null;
  /** A6: pocket on purpose: share within ±12 ms of each section's target, and each section's mean offset. */
  pocket: { share: number; means: number[] } | null;
  /** A8 */
  shiftGap: number | null;
  drift: number | null;
  swing: number | null;
  subBias: Record<string, number> | null;
  /** A9: rests judged / rests that rang; release share within ±ms; share of pairs overlapping ≤ the limit. */
  ringThrough: { rests: number; rang: number } | null;
  release: number | null;
  overlap: number | null;
  /** Fretless / upright: share of notes within ±cents, and the median |cents|. */
  cents: { share: number; median: number } | null;
  /** A12: bridge ÷ neck centroid ratio. */
  zone: number | null;
  /** A13 (advice only): share of thumb notes heard as thumb, pop notes heard as pop. */
  slap: { thumb: number | null; pop: number | null } | null;
}
export type GuitarTakeMetrics = TakeMetrics & { guitar: GuitarExtras };

const RANK: Record<Verdict, number> = { clean: 0, almost: 1, not: 2 };
const isGhostTech = (n: ExpNote): boolean => n.technique === 'dead' || n.technique === 'mute' || n.technique === 'harmonic';

/**
 * Free-choice drills (goal.bass.rules, A5): pair each slot of the model line with the nearest played onset, judge the
 * played pitches by the rules, and return a drill whose slots carry the played pitches (so the shared analysis judges
 * only timing for them) plus the rule report.
 */
function applyRules(drill: Drill, bpm: number, played: PlayedNote[]): { judged: Drill; rules: TakeRules } | null {
  const r = drill.goal.bass?.rules;
  if (!r) return null;
  const beatMs = 60000 / bpm;
  const T = drill.notes.map((n) => expTimeMs(drill, n.beat, bpm));
  const used = new Set<number>();
  const slot = drill.notes.map((n, i) => {
    if (n.chordId !== undefined) return null;
    const rad = Math.min(beatMs / 2, i > 0 ? (T[i] - T[i - 1]) / 2 : Infinity, i < T.length - 1 ? (T[i + 1] - T[i]) / 2 : Infinity);
    let best = -1;
    let bd = Infinity;
    played.forEach((p, j) => {
      const d = Math.abs(p.on - T[i]);
      if (!used.has(j) && p.pitch !== UNPITCHED && d <= rad + 1e-6 && d < bd) {
        bd = d;
        best = j;
      }
    });
    if (best < 0) return null;
    used.add(best);
    return best;
  });
  const rep = ruleCheck(
    r.kind,
    r.chart,
    drill.notes.map((n, i) => ({ pitch: slot[i] === null ? null : played[slot[i]!].pitch, beat: n.beat })),
    drill.meter || 4,
    r.maxMove ?? 4,
  );
  const notes = drill.notes.map((n, i) => (slot[i] === null ? n : { ...n, pitch: played[slot[i]!].pitch }));
  return { judged: { ...drill, notes, goal: { ...drill.goal, chordTonesOnBeats: undefined } }, rules: rep };
}

/**
 * One guitar take: normalise, run the shared analysis, add the guitar measures. Frames are optional (without them
 * only pitch + timing are judged; bends / vibrato / legato / mute / gaps stay null). Frames present = a microphone
 * take (bass: mic thresholds, A7); none = MIDI (note-offs used for the note-length rules, A9).
 */
export function analyzeGuitarTake(drill: Drill, bpm: number, played: PlayedNote[], cal?: DrillCalibration, frames: GFrame[] = []): GuitarTakeMetrics {
  const beatMs = 60000 / bpm;
  const bassDrill = isBassDrill(drill);
  const mic = frames.length > 0;
  const norm = normalizeGuitarTake(drill, bpm, played);
  // Without loudness (the plain pitch pipeline sends one velocity for every note) accents cannot be judged.
  const hasLoudness = new Set(played.map((p) => p.vel)).size > 1;
  // Free-choice lines (A5): the rules decide which pitches are right; the shared analysis then judges the timing.
  const ruled = applyRules(drill, bpm, norm.played);
  const base = ruled ? ruled.judged : drill;
  // The same holds for a dynamics shape (bass 16ths with a crescendo): pitch and timing are still judged.
  const judged: Drill = hasLoudness ? base : { ...base, goal: base.goal.dynamics ? { ...base.goal, dynamics: undefined } : base.goal, notes: base.notes.map((n) => (n.accent ? { ...n, accent: undefined } : n)) };
  // Bass timing limits (A7): mic SD ≤ 28 / CV ≤ .06 at every tempo; MIDI never stricter than SD 20 / CV .06.
  const m = analyzeTake(judged, bpm, norm.played, cal, bassDrill ? { thresholds: bassThresholds(tempoBand(npsOf(drill, bpm)), mic) } : {});
  // The shared analysis saw the substituted pitches; give the model line back to the per-note results.
  if (ruled) m.perNote.forEach((r, i) => (r.exp = drill.notes[i]));
  const gs = groupsOf(drill, bpm);
  const factors: { verdict: Verdict; en: string; he: string }[] = [];

  // A2: an onset without a pitch counts for timing only. Expected dead / muted / harmonic notes are the exception.
  const snapped = new Set(norm.snapped);
  let unclear = 0;
  m.perNote.forEach((r) => {
    if (r.played && snapped.has(r.played) && !isGhostTech(r.exp)) {
      r.ok = false;
      unclear++;
    }
  });
  if (ruled) {
    m.rules = ruled.rules;
    m.perNote.forEach((r, i) => {
      if (r.played && !ruled.rules.valid[i]) r.ok = false;
    });
  }
  if (unclear || ruled) m.accuracy = m.perNote.length ? m.perNote.filter((r) => r.ok).length / m.perNote.length : 1;
  {
    const pitchedExp = drill.notes.filter((n) => !isGhostTech(n)).length;
    const share = pitchedExp ? unclear / pitchedExp : 0;
    if (share > 0.1) factors.push({ verdict: share > 0.25 ? 'not' : 'almost', en: `${unclear} note${unclear === 1 ? '' : 's'} not heard clearly — play closer to the mic or a little louder`, he: `${unclear} צלילים לא נשמעו בבירור — נגנו קרוב יותר למיקרופון או מעט חזק יותר` });
  }
  if (ruled) {
    const R = ruled.rules;
    const w = R.worst;
    const at = w ? { en: `bar ${w.bar + 1}, beat ${Math.round(w.beatInBar * 100) / 100 + 1}`, he: `תיבה ${w.bar + 1}, פעמה ${Math.round(w.beatInBar * 100) / 100 + 1}` } : null;
    const nm = (k: number) => {
      const p = m.perNote[k].played?.pitch;
      return p === undefined ? { en: '?', he: '?' } : { en: PC_EN[mod12(p)], he: PC_HE[mod12(p)] };
    };
    if (R.validShare < 0.95)
      factors.push({
        verdict: R.validShare < 0.85 ? 'not' : 'almost',
        en: w && at ? `${Math.round(R.validShare * 100)}% of the notes fit — ${at.en}: ${nm(w.slot).en} doesn't fit ${w.chord}` : `${Math.round(R.validShare * 100)}% of the notes fit the chords`,
        he: w && at ? `${Math.round(R.validShare * 100)}% מהצלילים מתאימים — ${at.he}: ${nm(w.slot).he} לא מתאים ל־${w.chord}` : `${Math.round(R.validShare * 100)}% מהצלילים מתאימים לאקורדים`,
      });
    if (R.kind === 'walk' && R.beat1Ct < 0.9)
      factors.push({ verdict: R.beat1Ct < 0.75 ? 'not' : 'almost', en: `A chord tone on ${Math.round(R.beat1Ct * 100)}% of the chord changes (90% needed)`, he: `צליל אקורד ב-${Math.round(R.beat1Ct * 100)}% מחילופי האקורדים (צריך 90%)` });
    const maxRep = drill.goal.bass?.rules?.maxRepeat ?? (R.kind === 'walk' ? 0.05 : 1);
    if (R.repeats > maxRep + 1e-9) factors.push({ verdict: R.repeats > 2 * maxRep + 0.05 ? 'not' : 'almost', en: `Repeated notes: ${Math.round(R.repeats * 100)}% (keep it moving)`, he: `צלילים חוזרים: ${Math.round(R.repeats * 100)}% (להמשיך לנוע)` });
    if (R.moves !== null && R.moves < 0.9) factors.push({ verdict: R.moves < 0.75 ? 'not' : 'almost', en: `Nearest chord tone on ${Math.round(R.moves * 100)}% of the moves (90% needed)`, he: `לצליל האקורד הקרוב ב-${Math.round(R.moves * 100)}% מהמעברים (צריך 90%)` });
  }
  const extra: GuitarExtras = {
    unclear,
    unpitched: norm.unpitched,
    octaveFixed: norm.octaveFixed,
    glides: norm.glides,
    strumSpread: norm.strums.length ? mean(norm.strums.map((s) => s.spread)) : null,
    bends: [],
    vibrato: [],
    legatoRatio: null,
    changeGapMs: null,
    palmMuteShare: null,
    changesPerMin: null,
    ring: null,
    selfCheck: selfChecks(drill),
  };

  // Played onset of each expected note (from the shared analysis), else the click time.
  const onOf = (i: number): number => m.perNote[i].played?.on ?? expTimeMs(drill, drill.notes[i].beat, bpm);
  const nextT = (i: number): number => {
    const b = drill.notes[i].beat;
    const g = gs.find((x) => x.t > expTimeMs(drill, b, bpm) + 1);
    return g ? g.t : expTimeMs(drill, b + drill.notes[i].dur, bpm);
  };

  if (frames.length) {
    drill.notes.forEach((n, i) => {
      if ((n.technique === 'bend' || n.technique === 'prebend') && n.bendCents) {
        const fret = n.technique === 'prebend' ? n.pitch - Math.round(n.bendCents / 100) : n.pitch;
        const from = onOf(i);
        const r = analyzeBend(frames, fret, n.bendCents, from, nextT(i));
        extra.bends.push(r);
      }
      if (n.technique === 'vibrato') extra.vibrato.push(analyzeVibrato(frames, n.pitch, onOf(i), nextT(i), (n.bendCents ?? 0) >= 80));
    });
    const legNotes = drill.notes.map((n, i) => ({ on: onOf(i), technique: n.technique })).filter((_, i) => m.perNote[i].played);
    if (drill.notes.some((n) => n.technique === 'hammer' || n.technique === 'pull')) extra.legatoRatio = legatoRatio(frames, legNotes);
    const muted = drill.notes.map((n, i) => ({ n, i })).filter(({ n, i }) => n.technique === 'mute' && m.perNote[i].played);
    if (muted.length) {
      const seen = new Set<number>();
      const res = muted.filter(({ i }) => !seen.has(onOf(i)) && seen.add(onOf(i))).map(({ i }) => palmMuteScore(frames, onOf(i)).muted);
      extra.palmMuteShare = res.filter(Boolean).length / res.length;
    }
  }

  // Chord changes: a chord group whose pitch set differs from the previous chord group.
  const chordGs = gs.filter((g) => g.notes.length >= 2);

  // Ring-check: in the first ~400 ms after each chord's onset, did every chord note sound?
  if (chordGs.length && frames.some((f) => f.chroma)) {
    const ring = { chords: 0, full: 0, missing: {} as Record<number, number> };
    for (const g of chordGs) {
      const on = onOf(drill.notes.indexOf(g.notes[0]));
      const win = frames.filter((f) => f.chroma && f.t >= on + 50 && f.t <= on + 420 && f.rms > 0.01);
      if (win.length < 3) continue;
      const r = ringCheck(meanChroma(win.map((f) => f.chroma!)), [...g.pcs]);
      ring.chords++;
      if (!r.missing.length) ring.full++;
      for (const p of r.missing) ring.missing[p] = (ring.missing[p] ?? 0) + 1;
    }
    if (ring.chords) {
      extra.ring = ring;
      const share = ring.full / ring.chords;
      if (share < 0.75) {
        const worst = Object.entries(ring.missing).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([p]) => PC_EN[+p]);
        const worstHe = Object.entries(ring.missing).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([p]) => PC_HE[+p]);
        factors.push({
          verdict: share < 0.4 ? 'not' : 'almost',
          en: `Not every note rang (${ring.full} of ${ring.chords} chords full) — listen for ${worst.join(', ')}`,
          he: `לא כל הצלילים צלצלו (${ring.full} מתוך ${ring.chords} אקורדים מלאים) — הקשיבו ל־${worstHe.join(', ')}`,
        });
      }
    }
  }
  if (chordGs.length >= 2) {
    const key = (g: Group) => [...g.pcs].sort((a, b) => a - b).join(',');
    const changeIdx = chordGs.map((g, i) => (i > 0 && key(g) !== key(chordGs[i - 1]) ? i : -1)).filter((i) => i > 0);
    const okG = chordGs.map((g) => g.notes.every((n) => m.perNote[drill.notes.indexOf(n)].ok));
    const times = chordGs.map((g) => {
      const i = drill.notes.indexOf(g.notes[0]);
      return onOf(i);
    });
    if (changeIdx.length) {
      const clean = changeIdx.filter((i) => okG[i] && okG[i - 1]).length;
      const durMin = (drill.beats * beatMs) / 60000;
      extra.changesPerMin = durMin > 0 ? clean / durMin : null;
      if (frames.length) {
        const gaps = changeGaps(frames, times, changeIdx);
        if (gaps.length) {
          extra.changeGapMs = mean(gaps);
          const lim = Math.max(80, beatMs / 4); // ⚙ a 16th (or 80 ms) of silence at most
          if (extra.changeGapMs > lim) factors.push({ verdict: extra.changeGapMs > 2 * lim ? 'not' : 'almost', en: `Gaps at the chord changes (${Math.round(extra.changeGapMs)} ms)`, he: `שקט בהחלפות האקורדים (${Math.round(extra.changeGapMs)} ms)` });
        }
      }
    }
  }

  for (const b of extra.bends)
    if (b.verdict !== 'clean')
      factors.push({
        verdict: b.verdict,
        en: b.held === null ? `Bend short of the target (${Math.round(b.peak)} of ${b.target} cents)` : `Bend ${b.error > 0 ? 'sharp' : 'flat'} by ${Math.round(Math.abs(b.error))} cents`,
        he: b.held === null ? `הכיפוף לא הגיע ליעד (${Math.round(b.peak)} מתוך ${b.target} סנט)` : `הכיפוף ${b.error > 0 ? 'גבוה' : 'נמוך'} ב-${Math.round(Math.abs(b.error))} סנט`,
      });
  for (const v of extra.vibrato)
    if (v.verdict !== 'clean')
      factors.push({
        verdict: v.verdict,
        en: v.rateHz === null ? 'No vibrato heard' : `Vibrato ${v.rateHz.toFixed(1)} Hz, ${Math.round(v.widthCents ?? 0)} cents`,
        he: v.rateHz === null ? 'לא נשמע ויברטו' : `ויברטו ${v.rateHz.toFixed(1)} הרץ, ${Math.round(v.widthCents ?? 0)} סנט`,
      });
  if (extra.legatoRatio !== null && extra.legatoRatio < 0.5)
    factors.push({ verdict: extra.legatoRatio < 0.3 ? 'not' : 'almost', en: `Hammer-ons / pull-offs too quiet (${Math.round(extra.legatoRatio * 100)}% of picked)`, he: `ההקשות / המשיכות שקטות מדי (${Math.round(extra.legatoRatio * 100)}% מהנפרטים)` });
  if (extra.palmMuteShare !== null && extra.palmMuteShare < 0.75)
    factors.push({ verdict: extra.palmMuteShare < 0.5 ? 'not' : 'almost', en: `Palm mute not heard on ${Math.round((1 - extra.palmMuteShare) * 100)}% of notes`, he: `השתקת כף היד לא נשמעה ב-${Math.round((1 - extra.palmMuteShare) * 100)}% מהצלילים` });

  // Bass pass rules (BASS_CURRICULUM §5, BASS_AUDIT A3–A13) on top of pitch + timing.
  const bg = drill.goal.bass;
  const worse = (v: number, lim: number) => (v > 1.5 * lim ? 'not' : 'almost') as Verdict;
  // Played notes as (written beat, onset, offset) for the timing measures; unclear (snapped) onsets keep their timing.
  const pts = m.perNote.map((r, i) => ({ i, beat: drill.notes[i].beat, p: r.played, dev: r.dev })).filter((x) => x.p && x.dev !== null);
  const b: BassMeasures = { asym: null, loudSd: null, crossing: null, kick: null, lengths: null, ghostDb: null, ghostClass: null, meanMs: null, pocket: null, shiftGap: null, drift: null, swing: null, subBias: null, ringThrough: null, release: null, overlap: null, cents: null, zone: null, slap: null };
  if (bassDrill) {
    // A6: no consistent rush / drag (|mean offset| ≤ 15 ms MIDI, 25 ms mic), unless the level asks for a pocket.
    if (bg?.pocket?.length) {
      b.pocket = pocketShare(
        pts.map((x) => ({ beat: x.beat, dev: x.dev! })),
        bg.pocket,
        drill.beats,
      );
      if (b.pocket && b.pocket.share < 0.7) {
        const sec = b.pocket.means.map((x, k) => ({ x, k, off: Number.isFinite(x) ? x - bg.pocket![k] : 0 })).sort((p, q) => Math.abs(q.off) - Math.abs(p.off))[0];
        const want = (v: number) => (v > 0 ? { en: `${v} ms behind`, he: `${v} ms מאחורי הפעמה` } : v < 0 ? { en: `${-v} ms ahead`, he: `${-v} ms לפני הפעמה` } : { en: 'on the beat', he: 'על הפעמה' });
        const w = want(bg.pocket[sec.k]);
        factors.push({ verdict: b.pocket.share < 0.55 ? 'not' : 'almost', en: `In the pocket on ${Math.round(b.pocket.share * 100)}% of notes (70% needed) — part ${sec.k + 1} should sit ${w.en}, you were at ${Math.round(sec.x)} ms`, he: `בכיס ב-${Math.round(b.pocket.share * 100)}% מהצלילים (צריך 70%) — חלק ${sec.k + 1} צריך לשבת ${w.he}, ניגנתם ב-${Math.round(sec.x)} ms` });
      }
    } else if (m.timingMean !== null && pts.length >= 3) {
      const lim = bg?.meanMs ?? (mic ? 25 : 15);
      b.meanMs = { ms: Math.abs(m.timingMean), lim };
      if (b.meanMs.ms > lim) {
        const late = m.timingMean > 0;
        factors.push({ verdict: worse(b.meanMs.ms, lim), en: `${late ? 'Dragging' : 'Rushing'}: ${Math.round(b.meanMs.ms)} ms ${late ? 'behind' : 'ahead of'} the click on average`, he: `${late ? 'מאחרים' : 'ממהרים'}: בממוצע ${Math.round(b.meanMs.ms)} ms ${late ? 'אחרי' : 'לפני'} הקליק` });
      }
    }
  }
  if (bg) {
    const hit = drill.notes.map((n, i) => ({ n, i, p: m.perNote[i].played })).filter((x) => x.p);
    const loudOf = (on: number, vel: number) => (frames.length ? peakRms(frames, on) : vel);
    const loud = hasLoudness || frames.length ? hit.map((x) => loudOf(x.p!.on, x.p!.vel)) : undefined;
    // Next written onset after note i (in beats; null for the last note).
    const nextBeat = (i: number): number | null => {
      const nx = drill.notes.find((x) => x.beat > drill.notes[i].beat + 1e-6);
      return nx ? nx.beat : null;
    };
    const ms = (beat: number) => expTimeMs(drill, beat, bpm);
    const bars = Math.max(1, drill.beats / (drill.meter || 4));
    if (bg.asym) {
      // A10: odd / even by the expected note index.
      b.asym = oddEvenAsym(
        hit.map((x) => x.p!.on),
        loud,
        hit.map((x) => x.i),
      );
      if (b.asym && (b.asym.ms > bg.asym.ms || (b.asym.db !== null && b.asym.db > bg.asym.db))) {
        const over = b.asym.ms > bg.asym.ms;
        factors.push({ verdict: over ? worse(b.asym.ms, bg.asym.ms) : worse(b.asym.db!, bg.asym.db), en: over ? `Uneven fingers: every second note ${Math.round(b.asym.ms)} ms off` : `Uneven fingers: every second note ${b.asym.db!.toFixed(1)} dB softer or louder`, he: over ? `אצבעות לא שוות: כל צליל שני זז ב-${Math.round(b.asym.ms)} ms` : `אצבעות לא שוות: כל צליל שני שונה ב-${b.asym.db!.toFixed(1)} dB` });
      }
    }
    if (bg.loudSd && loud) {
      b.loudSd = loudSdDb(loud);
      if (b.loudSd !== null && b.loudSd > bg.loudSd) factors.push({ verdict: worse(b.loudSd, bg.loudSd), en: `Uneven volume (±${b.loudSd.toFixed(1)} dB)`, he: `עוצמה לא אחידה (±${b.loudSd.toFixed(1)} dB)` });
    }
    if (bg.crossing) {
      b.crossing = crossingPenalty(
        m.perNote.map((r) => r.dev),
        drill.notes.map((n) => n.string),
      );
      if (b.crossing !== null && b.crossing > bg.crossing) factors.push({ verdict: worse(b.crossing, bg.crossing), en: `String crossings ${Math.round(b.crossing)} ms less steady than the rest`, he: `מעברי המיתרים פחות יציבים ב-${Math.round(b.crossing)} ms` });
    }
    if (bg.kick) {
      const kicks = [...new Set(drill.notes.map((n) => expTimeMs(drill, n.beat, bpm)))];
      b.kick = kickLock(
        kicks,
        norm.played.map((p) => p.on),
        bg.kick,
      );
      if (b.kick.lock < 0.9 || b.kick.stray > bars) factors.push({ verdict: b.kick.lock < 0.75 ? 'not' : 'almost', en: `Locked with the kick on ${Math.round(b.kick.lock * 100)}% of hits (90% needed)`, he: `נעול עם הבס-דראם ב-${Math.round(b.kick.lock * 100)}% מהמכות (צריך 90%)` });
    }
    // Sounded length of a played note (ms): mic = the energy release, MIDI = the note-off (A9, B19).
    const soundedMs = (p: PlayedNote, until: number): number | null => (mic ? releaseTime(frames, p.on, until) : p.off !== null ? p.off - p.on : null);
    if (bg.lengths) {
      const res: { want: 'short' | 'full'; ratio: number }[] = [];
      drill.notes.forEach((n, i) => {
        const p = m.perNote[i].played;
        const nb = nextBeat(i);
        if (!p || nb === null) return;
        const gapMs = ms(nb) - ms(n.beat);
        if (gapMs <= 0) return;
        const len = soundedMs(p, p.on + gapMs * 1.5);
        if (len === null) return;
        res.push({ want: lengthClass(n.dur, nb - n.beat), ratio: len / gapMs });
      });
      b.lengths = lengthMatch(res);
      if (b.lengths !== null && b.lengths < 0.85) factors.push({ verdict: b.lengths < 0.6 ? 'not' : 'almost', en: `Note lengths right on ${Math.round(b.lengths * 100)}% of notes (85% needed)`, he: `אורך הצליל נכון ב-${Math.round(b.lengths * 100)}% מהצלילים (צריך 85%)` });
    }
    if (bg.ghostDb && loud) {
      const g = hit.map((x, k) => ({ dead: x.n.technique === 'dead', l: loud[k] }));
      b.ghostDb = ghostGapDb(
        g.filter((x) => x.dead).map((x) => x.l),
        g.filter((x) => !x.dead).map((x) => x.l),
      );
      if (b.ghostDb !== null && b.ghostDb < bg.ghostDb) factors.push({ verdict: b.ghostDb < bg.ghostDb / 2 ? 'not' : 'almost', en: `Ghost notes only ${b.ghostDb.toFixed(1)} dB quieter (${bg.ghostDb} dB needed)`, he: `צלילי הרפאים שקטים רק ב-${b.ghostDb.toFixed(1)} dB (צריך ${bg.ghostDb})` });
    }
    // A3: dead notes must sound dead (no pitch, or short, or — MIDI — much softer), the others pitched.
    if (bg.ghostClass) {
      const pitchedVel = hit.filter((x) => x.n.technique !== 'dead' && !snapped.has(x.p!)).map((x) => x.p!.vel);
      const medVel = pitchedVel.length ? median(pitchedVel) : 0;
      let right = 0;
      let deadWrong = 0;
      let pitchWrong = 0;
      drill.notes.forEach((n, i) => {
        const p = m.perNote[i].played;
        if (n.technique === 'dead') {
          if (!p) return void deadWrong++;
          const nb = nextBeat(i);
          const gap = nb === null ? beatMs : ms(nb) - ms(n.beat);
          const short = p.off !== null && p.off - p.on <= Math.min(150, 0.6 * gap);
          const soft = !mic && hasLoudness && medVel > 0 && p.vel <= 0.5 * medVel;
          if (snapped.has(p) || short || soft) right++;
          else deadWrong++;
        } else if (p && !snapped.has(p)) right++;
        else pitchWrong++;
      });
      b.ghostClass = drill.notes.length ? right / drill.notes.length : null;
      if (b.ghostClass !== null && b.ghostClass < bg.ghostClass)
        factors.push({
          verdict: b.ghostClass < bg.ghostClass - 0.15 ? 'not' : 'almost',
          en: deadWrong >= pitchWrong ? `${deadWrong} ghost note${deadWrong === 1 ? '' : 's'} rang with a pitch — mute the string with the fretting hand` : `${pitchWrong} note${pitchWrong === 1 ? '' : 's'} came out dead — press them down fully`,
          he: deadWrong >= pitchWrong ? `${deadWrong} צלילי רפאים נשמעו עם גובה — השתיקו את המיתר ביד שמאל` : `${pitchWrong} צלילים יצאו מתים — לחצו אותם עד הסוף`,
        });
    }
    // A8: shift gap (a new hand position, or a jump of ≥ 3 frets on one string, while the note before still sounds).
    if (bg.shiftGap) {
      const pairs: { prevOn: number; on: number; prevOff?: number | null }[] = [];
      drill.notes.forEach((n, i) => {
        if (i === 0) return;
        const a = drill.notes[i - 1];
        const moved = (a.pos !== undefined && n.pos !== undefined && a.pos !== n.pos) || (a.string !== undefined && a.string === n.string && a.fret !== undefined && n.fret !== undefined && a.fret > 0 && n.fret > 0 && Math.abs(a.fret - n.fret) >= 3);
        const legato = a.beat + a.dur >= n.beat - 1e-6;
        const pa = m.perNote[i - 1].played;
        const pb = m.perNote[i].played;
        if (moved && legato && pa && pb) pairs.push({ prevOn: pa.on, on: pb.on, prevOff: mic ? undefined : pa.off });
      });
      b.shiftGap = shiftGap(pairs, frames);
      if (b.shiftGap !== null && b.shiftGap > bg.shiftGap) factors.push({ verdict: worse(b.shiftGap, bg.shiftGap), en: `Silence before the shifts (${Math.round(b.shiftGap)} ms): move the hand while the note still sounds`, he: `שקט לפני ההחלפות (${Math.round(b.shiftGap)} ms): להזיז את היד בזמן שהצליל עוד נשמע` });
    }
    if (bg.drift) {
      b.drift = ioiDrift(
        pts.map((x) => ({ beat: x.beat, on: x.p!.on })),
        drill.meter || 4,
      );
      if (b.drift !== null && b.drift > bg.drift) factors.push({ verdict: worse(b.drift, bg.drift), en: `Less even at the end (${Math.round(b.drift * 100)}% more spread in the last 2 bars)`, he: `פחות אחיד בסוף (${Math.round(b.drift * 100)}% יותר פיזור ב-2 התיבות האחרונות)` });
    }
    if (bg.swing) {
      b.swing = swingRatio(
        pts.map((x) => ({ beat: x.beat, on: x.p!.on })),
        bg.swing.sub,
      );
      if (b.swing !== null && Math.abs(b.swing - bg.swing.ratio) > bg.swing.tol)
        factors.push({ verdict: Math.abs(b.swing - bg.swing.ratio) > 2 * bg.swing.tol ? 'not' : 'almost', en: `Swing ${b.swing.toFixed(2)} : 1 (aim for ${bg.swing.ratio} : 1)`, he: `סווינג ${b.swing.toFixed(2)} : 1 (המטרה ${bg.swing.ratio} : 1)` });
    }
    if (bg.subBias) {
      b.subBias = subBias(pts.map((x) => ({ beat: x.beat, dev: x.dev! })));
      const w = Object.entries(b.subBias).sort((p, q) => Math.abs(q[1]) - Math.abs(p[1]))[0];
      const SUB: Record<string, { en: string; he: string }> = { beat: { en: 'on the beat', he: 'על הפעמה' }, '8': { en: 'on the "and"', he: 'על ה"וְ"' }, '16': { en: 'on the 16ths', he: 'על השש-עשריות' }, trip: { en: 'on the triplets', he: 'על הטריולות' } };
      if (w && Math.abs(w[1]) > bg.subBias) factors.push({ verdict: worse(Math.abs(w[1]), bg.subBias), en: `${w[1] > 0 ? 'Late' : 'Early'} ${SUB[w[0]].en} (${Math.round(Math.abs(w[1]))} ms)`, he: `${w[1] > 0 ? 'מאחרים' : 'מקדימים'} ${SUB[w[0]].he} (${Math.round(Math.abs(w[1]))} ms)` });
    }
    // A9: note-length suite.
    if (bg.ringThrough !== undefined) {
      const tu = tuningById(drill.spec.tuning ?? (bassDrill ? 'bass' : 'standard'));
      const rests: Parameters<typeof ringThrough>[0] = [];
      drill.notes.forEach((n, i) => {
        const p = m.perNote[i].played;
        const nb = nextBeat(i);
        if (!p || nb === null || n.beat + n.dur > nb - 0.24) return;
        rests.push({ from: ms(n.beat + n.dur), to: ms(nb), prevOn: p.on, prevPitch: n.pitch, prevOff: mic ? undefined : p.off });
      });
      b.ringThrough = ringThrough(rests, frames, tu.open.map(mod12));
      const allowed = bg.ringThrough * Math.max(1, bars / 8);
      if (b.ringThrough.rests && b.ringThrough.rang > allowed)
        factors.push({ verdict: b.ringThrough.rang > 2 * allowed + 1 ? 'not' : 'almost', en: `${b.ringThrough.rang} rest${b.ringThrough.rang === 1 ? '' : 's'} kept ringing — stop the string on the rest`, he: `${b.ringThrough.rang} הפסקות המשיכו לצלצל — לעצור את המיתר בהפסקה` });
    }
    if (bg.release) {
      const xs: { release: number | null; target: number }[] = [];
      drill.notes.forEach((n, i) => {
        const p = m.perNote[i].played;
        const nb = nextBeat(i);
        if (!p || nb === null || n.beat + n.dur >= nb - 1e-6) return;
        xs.push({ release: soundedMs(p, p.on + (ms(nb) - ms(n.beat))), target: ms(n.beat + n.dur) - ms(n.beat) });
      });
      b.release = releaseAccuracy(xs, bg.release.ms);
      if (b.release !== null && b.release < 0.85) factors.push({ verdict: b.release < 0.6 ? 'not' : 'almost', en: `Released on time on ${Math.round(b.release * 100)}% of notes (±${bg.release.ms} ms, 85% needed)`, he: `שחרור בזמן ב-${Math.round(b.release * 100)}% מהצלילים (±${bg.release.ms} ms, צריך 85%)` });
    }
    if (bg.overlap !== undefined) {
      const pairs: Parameters<typeof overlapMs>[0] = [];
      drill.notes.forEach((n, i) => {
        if (i === 0) return;
        const a = drill.notes[i - 1];
        const pa = m.perNote[i - 1].played;
        const pb = m.perNote[i].played;
        if (!pa || !pb || a.pitch === n.pitch || a.beat >= n.beat - 1e-6) return;
        pairs.push({ prevPitch: a.pitch, prevOff: mic ? undefined : pa.off, nextPitch: n.pitch, nextOn: pb.on });
      });
      const lim = bg.overlap;
      const ov = overlapMs(pairs, frames).filter((x): x is number => x !== null);
      b.overlap = ov.length ? ov.filter((x) => x <= lim).length / ov.length : null;
      if (b.overlap !== null && b.overlap < 0.85) factors.push({ verdict: b.overlap < 0.6 ? 'not' : 'almost', en: `Notes overlap (${Math.round((1 - b.overlap) * 100)}% ring into the next one) — stop each note as the next sounds`, he: `צלילים חופפים (${Math.round((1 - b.overlap) * 100)}% ממשיכים לתוך הבא) — לעצור כל צליל כשהבא נשמע` });
    }
    // Fretless / upright intonation (mic only: a MIDI bass has no cents).
    if (bg.cents && mic) {
      const tol = bg.cents;
      const notes = drill.notes
        .map((n, i) => ({ n, p: m.perNote[i].played, i }))
        .filter((x) => x.p && !snapped.has(x.p) && !isGhostTech(x.n))
        .map((x) => {
          const nb = nextBeat(x.i);
          const until = Math.min(nb === null ? Infinity : ms(nb), ms(x.n.beat + x.n.dur)) - ms(x.n.beat);
          return { pitch: x.n.pitch, from: x.p!.on, to: x.p!.on + until };
        });
      const cs = centsOff(frames, notes).filter((x): x is number => x !== null);
      if (cs.length) {
        const share = cs.filter((c) => Math.abs(c) <= tol).length / cs.length;
        b.cents = { share, median: median(cs.map(Math.abs)) };
        if (share < 0.85) {
          const sharp = median(cs) > 0;
          factors.push({ verdict: share < 0.7 ? 'not' : 'almost', en: `In tune on ${Math.round(share * 100)}% of notes (±${tol} cents, 85% needed) — mostly ${sharp ? 'sharp' : 'flat'}`, he: `מכוון ב-${Math.round(share * 100)}% מהצלילים (±${tol} סנט, צריך 85%) — בעיקר ${sharp ? 'גבוה' : 'נמוך'}` });
        }
      }
    }
    // A12: plucking zone — the second half (bridge) brighter than the first (neck), against the player's own neck tone.
    if (bg.zone && mic) {
      b.zone = zoneShift(
        frames,
        hit.map((x) => x.p!.on),
        ms(drill.beats / 2),
      );
      if (b.zone !== null && b.zone < bg.zone) factors.push({ verdict: b.zone < 1 + (bg.zone - 1) / 2 ? 'not' : 'almost', en: `Bridge half only ${Math.round((b.zone - 1) * 100)}% brighter than the neck half — pluck closer to the bridge`, he: `החצי ליד הגשר בהיר רק ב-${Math.round((b.zone - 1) * 100)}% מהחצי ליד הצוואר — לפרוט קרוב יותר לגשר` });
    }
    // A13: slap / pop classes — advice only, never a factor.
    if (bg.slapAdvice && mic) {
      const pk = median(hit.map((x) => peakRms(frames, x.p!.on)).filter((x) => x > 0));
      const cls = hit.map((x) => ({ st: x.n.stroke, c: slapClass(frames, x.p!.on, pk) })).filter((x) => x.c !== null);
      const share = (st: string, want: string) => {
        const xs = cls.filter((x) => x.st === st);
        return xs.length ? xs.filter((x) => x.c === want).length / xs.length : null;
      };
      if (cls.length) {
        b.slap = { thumb: share('p', 'thumb'), pop: share('i', 'pop') };
        const adv: T2[] = [];
        if (b.slap.thumb !== null && b.slap.thumb < 0.7) adv.push({ en: `Thumb notes sounded like slaps ${Math.round(b.slap.thumb * 100)}% of the time — bounce off the string near the end of the neck`, he: `צלילי האגודל נשמעו כסלאפ ב-${Math.round(b.slap.thumb * 100)}% מהפעמים — לקפוץ מהמיתר ליד סוף הצוואר` });
        if (b.slap.pop !== null && b.slap.pop < 0.7) adv.push({ en: `Pops sounded like pops ${Math.round(b.slap.pop * 100)}% of the time — hook the string and let it snap`, he: `הפופים נשמעו כפופ ב-${Math.round(b.slap.pop * 100)}% מהפעמים — לתפוס את המיתר ולתת לו להצליף` });
        if (adv.length) extra.advice = adv;
      }
    }
  }
  if (bg || bassDrill) extra.bass = b;

  let verdict = m.verdict;
  let why = m.why;
  // A guitar factor can only lower the verdict; the worst one becomes the reason.
  for (const f of factors)
    if (RANK[f.verdict] > RANK[verdict]) {
      verdict = f.verdict;
      why = { en: f.en, he: f.he };
    }
  return { ...m, verdict, why, guitar: extra };
}

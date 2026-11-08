// Guitar take analysis (docs/SPEC-GUITAR-TECHNIQUE.md §6): composed on top of the piano analyzeTake. Pure.
// The microphone gives pitch frames (f0 + confidence), loudness (RMS) and optionally a spectral centroid. From them:
//  · detectOnsets — energy onsets (picked notes, strums, muted "chucks") + pitch-change onsets (hammer / pull / slide);
//  · normalizeGuitarTake — guitar-aware clean-up before the generic alignment: octave errors folded, bend / vibrato /
//    slide pitch glides removed, a strum's string onsets clustered into one chord, unpitched onsets snapped;
//  · analyzeGuitarTake — analyzeTake + guitar extras: bend intonation (cents), vibrato rate / width, legato volume,
//    chord-change gaps, palm-mute share, changes per minute, and the self-check list for what audio cannot judge.
// Thresholds marked ⚙ are research starting points (research doc §5), to calibrate with real takes.

import type { Drill, DrillCalibration, ExpNote, PlayedNote, TakeMetrics, Verdict } from './types';
import { analyzeTake, expTimeMs, median } from './analyze';
import { meanChroma, ringCheck } from '../chroma';

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

/**
 * Onsets from microphone frames: an energy rise (≥ ratio × the recent minimum, above the floor) starts a note; a new
 * stable pitch without an energy rise starts a legato note (hammer-on / pull-off / slide arrival). Pitch = the median
 * f0 20–80 ms after the onset when confident, else UNPITCHED. Velocity = peak RMS mapped to 1–127 (relative only).
 */
export function detectOnsets(frames: GFrame[], opts: { ratio?: number; floor?: number; refractoryMs?: number; minConf?: number } = {}): PlayedNote[] {
  const ratio = opts.ratio ?? 1.8;
  const floor = opts.floor ?? 0.01;
  const refr = opts.refractoryMs ?? 50;
  const minConf = opts.minConf ?? 0.8;
  const out: PlayedNote[] = [];
  const pitchAt = (t0: number): number => {
    const hs = frames.filter((f) => f.t >= t0 + 20 && f.t <= t0 + 80 && f.hz && (f.conf ?? 1) >= minConf).map((f) => 69 + 12 * Math.log2(f.hz! / 440));
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

  // 4) Unpitched single onsets snap to the nearest single-note group (timing only); unmatched ones stay extra.
  ps.forEach((p, j) => {
    if (used.has(j)) return;
    if (p.pitch !== UNPITCHED) {
      out.push(p);
      return;
    }
    let best = -1;
    let bd = Infinity;
    gs.forEach((g, i) => {
      const d = Math.abs(p.on - g.t);
      if (g.notes.length === 1 && d <= radius(i) / 2 && d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      unpitched++;
      out.push({ ...p, pitch: gs[best].notes[0].pitch });
    } else out.push(p);
  });
  out.sort((a, b) => a.on - b.on);
  return { played: out, unpitched, octaveFixed, glides, strums };
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
}
export type GuitarTakeMetrics = TakeMetrics & { guitar: GuitarExtras };

const RANK: Record<Verdict, number> = { clean: 0, almost: 1, not: 2 };

/**
 * One guitar take: normalise, run the shared analysis, add the guitar measures. Frames are optional (without them
 * only pitch + timing are judged; bends / vibrato / legato / mute / gaps stay null).
 */
export function analyzeGuitarTake(drill: Drill, bpm: number, played: PlayedNote[], cal?: DrillCalibration, frames: GFrame[] = []): GuitarTakeMetrics {
  const beatMs = 60000 / bpm;
  const norm = normalizeGuitarTake(drill, bpm, played);
  // Without loudness (the plain pitch pipeline sends one velocity for every note) accents cannot be judged.
  const hasLoudness = new Set(played.map((p) => p.vel)).size > 1;
  const judged: Drill = hasLoudness ? drill : { ...drill, notes: drill.notes.map((n) => (n.accent ? { ...n, accent: undefined } : n)) };
  const m = analyzeTake(judged, bpm, norm.played, cal);
  const gs = groupsOf(drill, bpm);
  const extra: GuitarExtras = {
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
  const factors: { verdict: Verdict; en: string; he: string }[] = [];

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

// Record mode by audio (SPEC-PHRASE-STUDIO §4.3 v2, §14.2): a monophonic line from the microphone — voice, guitar or
// bass single notes, a horn — becomes notes with a confidence each, then the same caught → trim → context flow as MIDI.
// Pure: frames in (the app's pitch capture, BrowserPitchCapture → listenLoop, ~25 ms hop), notes out.
//
//   1. The noise floor from the first 500 ms; a frame is voiced when it has a confident pitch above the floor.
//   2. The take's tuning offset (median cents off the nearest semitone over voiced frames) is removed — a guitar tuned
//      15 ¢ flat still reads right.
//   3. Vibrato is smoothed (a running median over 120 ms).
//   4. Stable-pitch segmentation: a note is ≥ 60 ms within ±40 ¢; a new note starts on a pitch jump > 70 ¢ that lasts,
//      on an energy rise (a re-attack of the same pitch), or after a gap.
//   5. Clean-up: octave errors fixed by continuity (a short note an octave off both neighbours), split same-pitch
//      fragments merged, very short unclear fragments dropped. Each note keeps a confidence 0..1.
// Free polyphonic audio (chords) is v3: a take with too much of it is reported (`poly`), and only its top line (the
// pitch the tracker hears, marked lower confidence) is offered — piano by mic in v2.

import type { RawNote } from './takeSource';

/** One capture frame: ms on the take's timeline, f0 (or null), pitch confidence, RMS, optional chroma. */
export interface AFrame {
  t: number;
  hz: number | null;
  conf: number;
  rms: number;
  chroma?: number[];
}
export interface AudioNote extends RawNote {
  /** 0..1: pitch clarity × steadiness × length. */
  conf: number;
}
export interface AudioTake {
  notes: AudioNote[];
  /** The tuning offset removed, in cents (+ = the instrument is sharp). */
  tuning: number;
  /** The noise floor (RMS) and the gate used. */
  floor: number;
  gate: number;
  /** Share of loud frames that sound polyphonic (unclear pitch, several pitch classes): > POLY_LIMIT = too polyphonic. */
  poly: number;
  tooPolyphonic: boolean;
  /** Mean note confidence (the caught card's mark). */
  conf: number;
}

export const MIN_NOTE_MS = 60;
export const STABLE_CENTS = 40;
export const JUMP_CENTS = 70;
export const VIBRATO_MS = 120;
export const POLY_LIMIT = 0.4;
/** Below this a note is "unclear": drawn dashed, offered for removal in the clean-up (as a ghost note). */
export const UNCLEAR = 0.45;

const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** The noise floor: the median RMS of the first 500 ms (or the quietest fifth of the take when it starts loud). */
export function noiseFloor(frames: AFrame[]): number {
  if (!frames.length) return 0;
  const t0 = frames[0].t;
  const head = frames.filter((f) => f.t - t0 < 500).map((f) => f.rms);
  const quiet = [...frames.map((f) => f.rms)].sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(frames.length / 5)));
  return Math.min(median(head), median(quiet));
}
/** The level a note must rise above (3 × the floor, never under 0.008). */
export const gateOf = (floor: number) => Math.max(0.008, floor * 3);
/** Record mode is armed until the first frame that is loud and pitched (the take starts there). */
export function firstSound(frames: AFrame[], gate: number, minConf = 0.6): number | null {
  const f = frames.find((x) => x.rms >= gate && !!x.hz && x.conf >= minConf);
  return f ? f.t : null;
}

/** Polyphony: loud frames whose pitch is unclear, or whose chroma has four or more strong pitch classes. */
export function polyphony(frames: AFrame[], gate: number): number {
  const loud = frames.filter((f) => f.rms >= gate);
  if (loud.length < 10) return 0;
  const poly = loud.filter((f) => f.conf < 0.5 || (f.chroma ? f.chroma.filter((c) => c >= 0.5).length >= 4 : false));
  return Math.round((poly.length / loud.length) * 1000) / 1000;
}

/** The tuning offset in cents: the median of each voiced frame's distance from its nearest semitone. */
export function tuningOffset(ms: number[]): number {
  if (!ms.length) return 0;
  return Math.round(median(ms.map((m) => (m - Math.round(m)) * 100)));
}

interface Seg {
  start: number;
  end: number;
  ms: number[];
  conf: number[];
  peak: number;
  /** Started by an attack (energy rise), not by a pitch change. */
  attack: boolean;
}

/**
 * Notes from frames (see the header). `opts.topLine` (piano by mic): every note's confidence × 0.7 (the tracker hears
 * one pitch of a chord — the top line, at best).
 */
export function audioNotes(frames: AFrame[], opts: { minConf?: number; topLine?: boolean } = {}): AudioTake {
  const minConf = opts.minConf ?? 0.6;
  const fs = [...frames].sort((a, b) => a.t - b.t);
  const floor = noiseFloor(fs);
  const gate = gateOf(floor);
  const poly = polyphony(fs, gate);
  const voiced = (f: AFrame) => !!f.hz && f.hz > 20 && f.conf >= minConf && f.rms >= gate;
  const raw = fs.map((f) => (voiced(f) ? midiOf(f.hz!) : null));
  const tuning = tuningOffset(raw.filter((m): m is number => m !== null));
  const corr = raw.map((m) => (m === null ? null : m - tuning / 100));
  // vibrato: a running median over ±60 ms within a voiced stretch
  const sm = corr.map((m, i) => {
    if (m === null) return null;
    const win: number[] = [];
    for (let j = i; j >= 0 && fs[i].t - fs[j].t <= VIBRATO_MS / 2 && corr[j] !== null; j--) win.push(corr[j]!);
    for (let j = i + 1; j < fs.length && fs[j].t - fs[i].t <= VIBRATO_MS / 2 && corr[j] !== null; j++) win.push(corr[j]!);
    return median(win);
  });
  const segs: Seg[] = [];
  let cur: Seg | null = null;
  let jumpSince: number | null = null;
  let lastVoiced = -Infinity;
  const close = () => {
    if (cur) segs.push(cur);
    cur = null;
    jumpSince = null;
  };
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    const m = sm[i];
    if (m === null) {
      if (cur && f.t - lastVoiced > 50) close();
      continue;
    }
    const prev = fs.slice(Math.max(0, i - 3), i).map((x) => x.rms);
    const attack = prev.length > 0 && f.rms > 1.8 * Math.max(Math.min(...prev), gate / 2) && (!cur || f.t - cur.start > 80);
    if (!cur || f.t - lastVoiced > 50 || (attack && cur && f.t - cur.start > 80)) {
      close();
      cur = { start: f.t, end: f.t, ms: [m], conf: [f.conf], peak: f.rms, attack: true };
      lastVoiced = f.t;
      continue;
    }
    const c: Seg = cur;
    const ref = median(c.ms.slice(-6));
    if (Math.abs(m - ref) * 100 > JUMP_CENTS) {
      // a pitch change that lasts two frames starts a new note (a single-frame glitch does not)
      if (jumpSince === null) jumpSince = i;
      else {
        const k = jumpSince;
        const idx: number[] = [];
        for (let j = k; j <= i; j++) if (sm[j] !== null) idx.push(j);
        // the frames since the jump (already in the note) move to the new one
        const moved = idx.length - 1;
        c.ms.splice(c.ms.length - moved);
        c.conf.splice(c.conf.length - moved);
        let e = k - 1;
        while (e > 0 && sm[e] === null) e--;
        c.end = Math.max(c.start, fs[Math.max(0, e)].t);
        segs.push(c);
        cur = { start: fs[k].t, end: f.t, ms: idx.map((j) => sm[j]!), conf: idx.map((j) => fs[j].conf), peak: Math.max(...idx.map((j) => fs[j].rms)), attack: false };
        jumpSince = null;
        lastVoiced = f.t;
        continue;
      }
    } else jumpSince = null;
    c.ms.push(m);
    c.conf.push(f.conf);
    c.end = f.t;
    c.peak = Math.max(c.peak, f.rms);
    lastVoiced = f.t;
  }
  close();
  const hop = fs.length > 1 ? median(fs.slice(1).map((f, i) => f.t - fs[i].t)) : 25;
  let notes: (AudioNote & { attack: boolean })[] = segs
    .map((s) => {
      const p = median(s.ms);
      const stab = s.ms.filter((x) => Math.abs(x - p) * 100 <= STABLE_CENTS).length / s.ms.length;
      const dur = s.end - s.start + hop;
      // clarity: the tracker's confidence over its useful band (0.6 barely a pitch … 0.9 a clean one)
      const clarity = clamp01((s.conf.reduce((a, b) => a + b, 0) / s.conf.length - minConf) / (0.9 - minConf));
      const conf = clamp01(Math.pow(clarity, 0.7) * (0.3 + 0.7 * stab) * Math.min(1, dur / 120)) * (opts.topLine ? 0.7 : 1);
      return { pitch: Math.round(p), on: Math.round(s.start), off: Math.round(s.start + dur), vel: 0, conf: Math.round(conf * 100) / 100, attack: s.attack, peak: s.peak, stab };
    })
    .filter((n) => (n.off ?? n.on) - n.on >= MIN_NOTE_MS || n.conf >= 0.6)
    .map(({ peak, stab, ...n }) => {
      // a wobbling note (under half its frames within ±40 ¢) is unclear whatever its clarity
      const c = stab < 0.5 ? Math.min(n.conf, UNCLEAR - 0.01) : n.conf;
      return { ...n, conf: c, vel: velOf(peak, c) };
    });
  notes = cleanUp(notes);
  const out: AudioNote[] = notes.map((n) => ({ pitch: n.pitch, on: n.on, off: n.off, vel: n.vel, conf: n.conf }));
  const conf = out.length ? Math.round((out.reduce((a, n) => a + n.conf, 0) / out.length) * 100) / 100 : 0;
  return { notes: out, tuning, floor, gate, poly, tooPolyphonic: poly > POLY_LIMIT, conf };
}

/**
 * The clean-up pass: (1) a short note an octave off both neighbours (gap < 80 ms) is folded to their octave; (2) a
 * note continuing the previous one's pitch without an attack, after < 40 ms, is merged into it; (3) a very short unclear
 * fragment (< 100 ms, confidence < 0.35) is dropped.
 */
export function cleanUp<T extends AudioNote & { attack?: boolean }>(ns: T[]): T[] {
  const a = ns.map((n) => ({ ...n }));
  for (let i = 1; i + 1 < a.length; i++) {
    const p = a[i - 1];
    const n = a[i];
    const q = a[i + 1];
    const short = (n.off ?? n.on) - n.on < 150;
    const near = n.on - (p.off ?? p.on) < 80 && q.on - (n.off ?? n.on) < 80;
    for (const o of [12, -12])
      if (short && near && Math.abs(n.pitch - o - p.pitch) <= 2 && Math.abs(n.pitch - o - q.pitch) <= 2) {
        n.pitch -= o;
        n.conf = Math.min(n.conf, 0.6);
      }
  }
  const merged: T[] = [];
  for (const n of a) {
    const last = merged[merged.length - 1];
    if (last && last.pitch === n.pitch && !n.attack && n.on - (last.off ?? last.on) < 40) {
      last.off = n.off;
      last.conf = Math.max(last.conf, n.conf);
      continue;
    }
    merged.push(n);
  }
  return merged.filter((n) => !((n.off ?? n.on) - n.on < 100 && n.conf < 0.35));
}

/**
 * Velocity from the note's peak level (relative, −60 … 0 dB → 30 … 127); an unclear note gets a ghost's velocity (< 25),
 * so the trim screen draws it dashed and its clean-up chip offers to remove it.
 */
export function velOf(rms: number, conf: number): number {
  if (conf < UNCLEAR) return Math.max(1, Math.min(24, Math.round(4 + conf * 40)));
  if (rms <= 0) return 30;
  const db = 20 * Math.log10(rms);
  return Math.max(30, Math.min(127, Math.round(30 + ((db + 60) / 60) * 97)));
}

/** Capture frames (seconds from the capture's start) → AFrames on the take's timeline (ms from `zeroMs`). */
export const toAFrame = (f: { t: number; hz: number | null; confidence: number; rms: number; chroma?: number[] }, startMs: number, zeroMs: number): AFrame => ({ t: startMs + f.t * 1000 - zeroMs, hz: f.hz, conf: f.confidence, rms: f.rms, ...(f.chroma ? { chroma: f.chroma } : {}) });

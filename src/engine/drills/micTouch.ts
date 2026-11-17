// MEASUREMENT-AUDIT (second round, 2026-11-17): the piano's touch by a phone microphone. Pure.
//
// By microphone there is no key velocity and no key release — only the sound's energy (RMS per ~25 ms frame). What
// that shows reliably on a phone, one hand at a time, single notes, no sustain pedal:
//   - RELATIVE loudness: one passage against another in the same take (p vs f) — a step of ≥ 5 dB. Never an absolute
//     level: the phone's gain, its distance and the room move every level by more than a p-to-mf step.
//   - a crescendo / diminuendo SHAPE: each note's attack peak (dB) along the scale — a change of ≥ 6 dB with a straight
//     enough trend (R² ≥ 0.6, looser than MIDI's 0.8: the piano's register and the phone's response add ±2–3 dB a note).
//   - legato vs staccato from the energy envelope: a damped note falls ≥ 18 dB within ~100 ms, an undamped one decays
//     slowly. Measured only when the notes are ≥ 250 ms apart and below C6 (the dampers stop around F6; above C6 notes
//     die away on their own), and only as legato vs detached — a fine overlap or portato's 60–80 % is not heard.
// Left out, and why (docs/research/MEASUREMENT-AUDIT.md §8): absolute levels (pp…ff bands), accents at speed (the
// previous note's ring hides a +3 dB step), voicing and hand balance (one sound, no hands), the pedal (the release is
// not heard under it), portato, and anything hands together. Each measure says when it can't tell ("no claim").

import type { Drill, Dyn, ExpNote, NoteResult, TouchLine, TouchMark, TouchReport } from './types';
import { MT, type L } from '../../i18n/measureText';

/** One frame of the take's sound: ms on the take's clock, linear RMS. */
export interface EnvFrame {
  t: number;
  rms: number;
}

/** ⚙ What the phone microphone can honestly tell apart (see the header). */
export const MIC_TOUCH = {
  /** A note counts as heard when its attack stands this far over the room's floor (dB). */
  audibleDb: 10,
  /** Of the notes, at least this share must be heard to measure anything. */
  heardShare: 0.7,
  /** p vs f: the written step between two passages must reach this (dB). */
  stepDb: 5,
  /** A crescendo / diminuendo half: change ≥ this (dB) … */
  shapeDb: 6,
  /** … with a trend this straight (R²). */
  shapeR2: 0.6,
  /** The release: a fall of this many dB below the note's peak means the damper is down. */
  dropDb: 18,
  /** Notes closer than this (ms) are too fast to hear the release. */
  minIoiMs: 250,
  /** Above this MIDI note the strings have no (or weak) dampers and die away on their own. */
  maxMidi: 84,
  /** Legato: the note still sounds at this share of the gap to the next one; staccato: it is gone by this share. */
  legatoShare: 0.75,
  stacShare: 0.7,
} as const;

export type MicTouchGoal = 'cresc' | 'dim-cresc' | 'terraced' | 'legato' | 'staccato';

/**
 * The touch goal a phone microphone can grade on this drill, or null. One hand, single notes, no accents, no pedal or
 * held-note goals; a shape (cresc, dim-cresc), written levels (terraced), or legato / staccato.
 */
export function micTouchGoal(drill: Pick<Drill, 'goal' | 'notes'> & { spec?: Drill['spec']; sung?: boolean }): MicTouchGoal | null {
  if (drill.sung || drill.spec?.instrument === 'guitar' || drill.spec?.instrument === 'bass') return null;
  const hands = new Set(drill.notes.map((n) => n.hand));
  if (hands.size !== 1 || drill.spec?.hands === 'RL') return null;
  if (drill.notes.some((n) => n.chordId !== undefined || n.accent)) return null;
  const g = drill.goal;
  if (g.pedal || g.holds || g.handArt || g.vl || g.ct || g.marks) return null;
  const d = g.dynamics;
  const a = g.articulation;
  if (d && a) return null;
  if (d === 'cresc' || d === 'dim-cresc' || d === 'terraced') return d;
  if (!d && (a === 'legato' || a === 'staccato')) return a;
  return null;
}

const dbOf = (r: number): number => 20 * Math.log10(Math.max(r, 1e-6));
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const med = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pct = (xs: number[], p: number): number => {
  if (!xs.length) return -120;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
};
function lsq(pts: [number, number][]): { slope: number; r2: number; range: number } | null {
  if (pts.length < 3) return null;
  const mx = mean(pts.map((p) => p[0]));
  const my = mean(pts.map((p) => p[1]));
  const sxx = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  const sxy = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0);
  const syy = pts.reduce((a, p) => a + (p[1] - my) ** 2, 0);
  if (sxx <= 0) return null;
  const slope = sxy / sxx;
  const xs = pts.map((p) => p[0]);
  return { slope, r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 0, range: slope * (Math.max(...xs) - Math.min(...xs)) };
}

export interface MicLine {
  line: TouchLine;
  sev: number;
  tag: string | null;
  marks: { i: number; mark: TouchMark }[];
}
export interface MicTouchResult {
  lines: MicLine[];
  report: NonNullable<TouchReport['mic']>;
}

interface Heard {
  n: ExpNote;
  i: number;
  on: number;
  /** The attack's peak (dB) and when. */
  peak: number;
  peakT: number;
}

const noClaim = (text: L): MicLine => ({ line: { id: 'mic', ok: false, text, why: MT.whyMicNoClaim }, sev: 2, tag: null, marks: [] });

/**
 * The touch of a piano take heard by the microphone. `per` = analyzeTake's per-note results (onsets from the pitch
 * tracker), `frames` = the take's energy. A take that can't be measured says so and does not pass (only measured
 * practice counts) — it never passes on the notes alone.
 */
export function analyzeMicTouch(drill: Drill, per: NoteResult[], frames: EnvFrame[]): MicTouchResult | null {
  const goal = micTouchGoal(drill);
  if (!goal) return null;
  const fs = frames.filter((f) => Number.isFinite(f.rms)).sort((a, b) => a.t - b.t);
  const played = per
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.played)
    .sort((a, b) => a.r.played!.on - b.r.played!.on);
  if (played.length < 5 || fs.length < 20) return { lines: [noClaim(MT.micFew)], report: {} };
  // the room's floor: the quiet before the first note (the count-in's clicks are short, so a low percentile skips them);
  // without enough of it, the quietest frames of the take
  const first = played[0].r.played!.on;
  const pre = fs.filter((f) => f.t < first - 100).map((f) => dbOf(f.rms));
  const floor = pre.length >= 8 ? pct(pre, 0.1) : pct(fs.map((f) => dbOf(f.rms)), 0.05);
  // each note's attack: the loudest frame from just before the tracked onset (the pitch settles after the hammer) to
  // well before the next note
  const heard: Heard[] = [];
  played.forEach((x, k) => {
    const on = x.r.played!.on;
    const next = played[k + 1]?.r.played!.on ?? on + 400;
    const prev = played[k - 1]?.r.played!.on ?? on - 400;
    const win = fs.filter((f) => f.t >= Math.max(prev + 30, on - 80) && f.t <= Math.min(next - 20, on + 150));
    if (!win.length) return;
    const top = win.reduce((a, b) => (b.rms > a.rms ? b : a));
    const peak = dbOf(top.rms);
    if (peak - floor < MIC_TOUCH.audibleDb) return;
    heard.push({ n: x.r.exp, i: x.i, on, peak, peakT: top.t });
  });
  if (heard.length < Math.max(5, MIC_TOUCH.heardShare * played.length)) return { lines: [noClaim(MT.micQuiet)], report: {} };
  if (goal === 'cresc' || goal === 'dim-cresc') return shape(heard, goal);
  if (goal === 'terraced') return steps(heard);
  return release(heard, fs, floor, goal);
}

/** The crescendo / diminuendo halves around the turning note, by the attacks' dB. */
function shape(hs: Heard[], goal: 'cresc' | 'dim-cresc'): MicTouchResult {
  const out: MicLine[] = [];
  let t = 0;
  for (let k = 1; k < hs.length; k++) if (Math.abs(hs[k].n.pitch - hs[0].n.pitch) > Math.abs(hs[t].n.pitch - hs[0].n.pitch)) t = k;
  const up = goal === 'cresc' ? 1 : -1;
  const halves: { a: number; b: number; dir: 1 | -1 }[] = [{ a: 0, b: t, dir: up as 1 | -1 }];
  if (t < hs.length - 2) halves.push({ a: t, b: hs.length - 1, dir: -up as 1 | -1 });
  const steps: number[] = [];
  for (const hf of halves) {
    const seg = hs.slice(hf.a, hf.b + 1);
    const f = lsq(seg.map((h, k) => [k, h.peak]));
    const louder = hf.dir > 0;
    const id: TouchLine['id'] = louder ? 'cresc' : 'dim';
    if (!f || seg.length < 4) continue;
    const signed = hf.dir * f.range;
    steps.push(Math.round(signed * 10) / 10);
    if (signed <= 2) out.push({ line: { id, ok: false, text: louder ? MT.crescNone : MT.dimNone, why: louder ? MT.whySmall : MT.whyDimEarly }, sev: 2, tag: `${id}-none`, marks: [] });
    else if (signed < MIC_TOUCH.shapeDb) out.push({ line: { id, ok: false, text: louder ? MT.crescSmall : MT.dimSmall, why: MT.whySmall }, sev: 1 + (MIC_TOUCH.shapeDb - signed) / MIC_TOUCH.shapeDb, tag: `${id}-small`, marks: [] });
    else if (f.r2 < MIC_TOUCH.shapeR2) out.push({ line: { id, ok: false, text: louder ? MT.crescUneven : MT.dimUneven, why: louder ? MT.whyUneven : MT.whyDimUneven }, sev: 1 + (MIC_TOUCH.shapeR2 - f.r2) / 0.3, tag: `${id}-uneven`, marks: [] });
    else out.push({ line: { id, ok: true, text: louder ? MT.crescOk : MT.dimOk }, sev: 0.5, tag: null, marks: [] });
  }
  if (!out.length) return { lines: [noClaim(MT.micFew)], report: {} };
  return { lines: out, report: { steps } };
}

/** Written levels zone by zone (terraced): each change a step of ≥ 5 dB the written way. */
function steps(hs: Heard[]): MicTouchResult {
  const RANK: Record<Dyn, number> = { pp: 0, p: 1, mp: 2, mf: 3, f: 4, ff: 5 };
  const zones: { d: Dyn; db: number[] }[] = [];
  for (const h of hs) {
    const d = h.n.dynMark;
    if (!d) continue;
    const z = zones[zones.length - 1];
    if (z && z.d === d) z.db.push(h.peak);
    else zones.push({ d, db: [h.peak] });
  }
  const meds = zones.map((z) => (z.db.length >= 2 ? med(z.db) : null));
  const st: number[] = [];
  for (let k = 1; k < zones.length; k++) {
    const a = meds[k - 1];
    const b = meds[k];
    if (a === null || b === null || RANK[zones[k].d] === RANK[zones[k - 1].d]) continue;
    st.push(Math.sign(RANK[zones[k].d] - RANK[zones[k - 1].d]) * (b - a));
  }
  if (!st.length) return { lines: [noClaim(MT.micFew)], report: {} };
  const worst = Math.min(...st);
  const r = Math.round(worst);
  const line: MicLine =
    worst >= MIC_TOUCH.stepDb
      ? { line: { id: 'zones', ok: true, text: MT.micStepOk(r) }, sev: 0.5, tag: null, marks: [] }
      : { line: { id: 'zones', ok: false, text: MT.micStepFlat(r), why: MT.whyMicStep }, sev: 1 + (MIC_TOUCH.stepDb - worst) / MIC_TOUCH.stepDb, tag: 'mic-step', marks: [] };
  return { lines: [line], report: { steps: st.map((x) => Math.round(x * 10) / 10) } };
}

/** Legato vs staccato: how long each note still sounds (within 18 dB of its peak) as a share of the gap to the next. */
function release(hs: Heard[], fs: EnvFrame[], floor: number, goal: 'legato' | 'staccato'): MicTouchResult {
  const shares: number[] = [];
  const bad: number[] = [];
  for (let k = 0; k + 1 < hs.length; k++) {
    const a = hs[k];
    const gap = hs[k + 1].on - a.on;
    if (gap < MIC_TOUCH.minIoiMs || a.n.pitch > MIC_TOUCH.maxMidi) continue;
    const end = Math.max(a.peak - MIC_TOUCH.dropDb, floor + 6);
    const after = fs.filter((f) => f.t > a.peakT && f.t < hs[k + 1].on - 15);
    const gone = after.find((f) => dbOf(f.rms) < end);
    const share = gone ? (gone.t - a.on) / gap : 1;
    shares.push(Math.round(share * 100) / 100);
    if (goal === 'legato' ? share < MIC_TOUCH.legatoShare : share > MIC_TOUCH.stacShare) bad.push(a.i);
  }
  if (shares.length < 4) return { lines: [noClaim(MT.micFast)], report: {} };
  const okShare = 1 - bad.length / shares.length;
  const marks = bad.map((i) => ({ i, mark: (goal === 'legato' ? 'gap' : 'long') as TouchMark }));
  const sev = okShare >= 0.8 ? 0.5 : 1 + (0.8 - okShare) / 0.2;
  const line: MicLine =
    goal === 'legato'
      ? okShare >= 0.8
        ? { line: { id: 'legato', ok: true, text: MT.micLegatoOk }, sev, tag: null, marks: [] }
        : { line: { id: 'legato', ok: false, text: MT.micLegatoGap(bad.length), why: MT.whyMicLegato }, sev, tag: 'mic-legato', marks }
      : okShare >= 0.8
        ? { line: { id: 'stac', ok: true, text: MT.stacOk }, sev, tag: null, marks: [] }
        : { line: { id: 'stac', ok: false, text: MT.stacLong(bad.length), why: MT.whyMicStac }, sev, tag: 'stac', marks };
  return { lines: [line], report: { held: shares } };
}

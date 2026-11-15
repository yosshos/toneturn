// Live read-outs for the singing view (docs/research/VOICE-FEEDBACK-UI.md §4.5–4.7, §5). Pure, unit-tested.
// Steadiness per slice (vibrato removed, so a healthy vibrato reads steady), the zone tolerance per item,
// and the live vibrato estimate for the vibrato chip.

import { BANDS, trend, vibratoOf, type TrackPoint, type VocalItem } from './vocal';

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const std = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** In-zone tolerance (± cents) by level: ±35 beginner, ±20 middle, ±10 fine-tune and advanced (BANDS.intonation). */
export function zoneTolerance(item: Pick<VocalItem, 'kind' | 'difficulty'>): number {
  const [exc, good, fair] = BANDS.intonation;
  if (item.kind === 'fine-tune' || item.kind === 'micro') return exc;
  const d = item.difficulty ?? 1200;
  if (d < 1300) return fair;
  if (d < 1700) return good;
  return exc;
}

/**
 * The wobble of a stretch with vibrato taken out: the residual after the slow trend, minus the best sine fit at
 * the residual's own rate when that fit is a real vibrato (3.5–8.5 Hz, explains most of the motion). The slow
 * trend's own wander inside the stretch counts too. Cents (std).
 */
export function wobble(pts: TrackPoint[], tr: number[]): number {
  if (pts.length < 4) return NaN;
  const res = pts.map((p, i) => p.c - tr[i]);
  let left = res;
  const rate = zeroCrossRate(pts, res);
  if (rate >= 3.5 && rate <= 8.5) {
    // Least squares a·sin + b·cos at that rate.
    let ss = 0, cc = 0, sc = 0, rs = 0, rc = 0;
    for (let i = 0; i < pts.length; i++) {
      const w = 2 * Math.PI * rate * pts[i].t;
      const s = Math.sin(w), c = Math.cos(w);
      ss += s * s; cc += c * c; sc += s * c; rs += res[i] * s; rc += res[i] * c;
    }
    const det = ss * cc - sc * sc;
    if (det > 1e-9) {
      const a = (rs * cc - rc * sc) / det;
      const b = (rc * ss - rs * sc) / det;
      const fit = res.map((r, i) => r - (a * Math.sin(2 * Math.PI * rate * pts[i].t) + b * Math.cos(2 * Math.PI * rate * pts[i].t)));
      if (std(fit) < 0.6 * std(res)) left = fit;
    }
  }
  return Math.hypot(std(left), std(tr));
}

function zeroCrossRate(pts: TrackPoint[], res: number[]): number {
  const ups: number[] = [];
  let lo = false;
  for (let i = 0; i < res.length; i++) {
    if (res[i] < -3) lo = true;
    else if (res[i] > 3 && lo) {
      ups.push(pts[i].t);
      lo = false;
    }
  }
  if (ups.length < 2) return 0;
  return (ups.length - 1) / (ups[ups.length - 1] - ups[0]);
}

/** Steadiness level of a slice: 4 = ≤ 6 ¢, 3 = ≤ 12 ¢, 2 = ≤ 20 ¢, 1 = worse, 0 = no voice (BANDS.stability). */
export function steadyLevel(wob: number): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isFinite(wob)) return 0;
  const [a, b, c] = BANDS.stability;
  return wob <= a ? 4 : wob <= b ? 3 : wob <= c ? 2 : 1;
}

/**
 * Steadiness per `slice` seconds from `t0`: each slice is judged with ±0.2 s of context (a vibrato cycle needs
 * room to be recognised), on the cents track against the target. Slices without enough voice are 0.
 */
export function sliceSteadiness(track: TrackPoint[], t0: number, slices: number, slice = 0.25): (0 | 1 | 2 | 3 | 4)[] {
  const tr = track.length ? trend(track, 0.4) : [];
  const out: (0 | 1 | 2 | 3 | 4)[] = [];
  for (let k = 0; k < slices; k++) {
    const a = t0 + k * slice;
    const b = a + slice;
    const inside = track.filter((p) => p.t >= a && p.t < b).length;
    if (inside < 4) {
      out.push(0);
      continue;
    }
    const idx: number[] = [];
    for (let i = 0; i < track.length; i++) if (track[i].t >= a - 0.2 && track[i].t < b + 0.2) idx.push(i);
    out.push(steadyLevel(wobble(idx.map((i) => track[i]), idx.map((i) => tr[i]))));
  }
  return out;
}

/** Longest run of full-height (level 4) slices, in seconds. */
export function bestStretch(levels: number[], slice = 0.25): number {
  let best = 0;
  let run = 0;
  for (const l of levels) {
    run = l === 4 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best * slice;
}

export interface LiveVibrato {
  state: 'straight' | 'vibrato' | 'unsteady' | 'none';
  rate: number; // Hz, 0.1
  extent: number; // ± cents, rounded to 5
}

/** The vibrato of the last `win` seconds (the chip): needs ≥ 3 cycles; irregular (CV > 0.35) reads unsteady. */
export function liveVibrato(track: TrackPoint[], win = 0.9): LiveVibrato {
  if (!track.length) return { state: 'none', rate: 0, extent: 0 };
  const end = track[track.length - 1].t;
  const w = track.filter((p) => p.t >= end - win);
  if (w.length < 10 || end - w[0].t < win * 0.8) return { state: 'none', rate: 0, extent: 0 };
  const tr = trend(w, 0.4);
  const v = vibratoOf(w, w.map((p, i) => p.c - tr[i]));
  if (v.cycles >= 3 && v.extent >= 15 && v.rate >= 3.5 && v.rate <= 8.5) {
    const shape = { rate: Math.round(v.rate * 10) / 10, extent: Math.round(v.extent / 5) * 5 };
    return { state: v.regularity > BANDS.vibratoRegularity[2] ? 'unsteady' : 'vibrato', ...shape };
  }
  return { state: 'straight', rate: 0, extent: 0 };
}

/**
 * The "money notes" of a phrase (§4.3, UltraStar's golden notes, used sparingly): long notes (≥ 1.4 × the median
 * length), else the single highest note when it is not the first. At most two; they get a double outline, and only
 * they carry the vibrato and stability read-outs in a melody.
 */
export function moneyNotes(midis: number[], durs: number[]): number[] {
  if (midis.length < 3) return [];
  const sorted = [...durs].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  let pick = durs.map((d, i) => (d >= med * 1.4 && d >= 0.6 ? i : -1)).filter((i) => i >= 0);
  if (!pick.length) {
    const top = Math.max(...midis);
    const at = midis.map((m, i) => (m === top ? i : -1)).filter((i) => i >= 0);
    if (at.length === 1 && at[0] > 0) pick = at;
  }
  // the longest first, then the latest
  return pick.sort((a, b) => durs[b] - durs[a] || b - a).slice(0, 2).sort((a, b) => a - b);
}

/** One note of a sung melody, read for the review's tap-a-note detail. */
export interface NoteDetail {
  cents: number | null;
  settleMs: number | null;
  overshoot: number;
  /** Wobble (vibrato removed), ¢ std, over the note's middle. */
  wobble: number | null;
  vibrato: LiveVibrato | null;
  /** Onset against the grid, ms (+ = late), aligned on the first sung note. */
  onsetMs: number | null;
  octave: boolean;
}

export function noteDetail(
  note: { target: number; cents: number | null; settleMs: number | null; overshoot: number; start: number | null; octave?: boolean },
  track: TrackPoint[],
  dur: number,
  onsetMs: number | null,
): NoteDetail {
  const base = { cents: note.cents, settleMs: note.settleMs, overshoot: Math.round(note.overshoot), onsetMs, octave: !!note.octave };
  if (note.start === null || note.cents === null) return { ...base, wobble: null, vibrato: null };
  const a = note.start + Math.min(0.15, dur * 0.25);
  const b = note.start + dur * 0.95;
  const mid = track.filter((p) => p.t >= a && p.t <= b);
  if (mid.length < 6) return { ...base, wobble: null, vibrato: null };
  const tr = trend(mid, 0.4);
  const w = wobble(mid, tr);
  const v = b - a >= 0.6 ? liveVibrato(mid, Math.min(0.9, b - a)) : null;
  return { ...base, wobble: Number.isFinite(w) ? Math.round(w) : null, vibrato: v && v.state !== 'none' ? v : null };
}

/** The vibrato centre line for the review: a centred moving average of a voiced run (breaks where the line breaks). */
export function centreLine(pts: { t: number; m: number | null }[], win = 0.3): { t: number; m: number | null }[] {
  const out: { t: number; m: number | null }[] = [];
  let run: { t: number; m: number }[] = [];
  const flush = () => {
    const tr = trend(run.map((p) => ({ t: p.t, c: p.m, rms: 0 })), win);
    run.forEach((p, i) => out.push({ t: p.t, m: tr[i] }));
    run = [];
  };
  for (const p of pts) {
    if (p.m === null) {
      if (run.length) flush();
      out.push({ t: p.t, m: null });
    } else run.push({ t: p.t, m: p.m });
  }
  if (run.length) flush();
  return out;
}

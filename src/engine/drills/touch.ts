// MEASUREMENT-AUDIT (2026-11-17): the touch of one take, from what MIDI gives — velocity, note-off and CC64. Pure.
//
// One function per measure, each returning one line (few words) and, for a miss, a "Why?" line; analyzeTake turns the
// lines into factors (severity > 1 = misses the goal) and keeps the report for the review, the staff marks and the
// profile. What is measured:
//   G2 / E1–E3  crescendo and diminuendo as SEPARATE halves around the turning note (per hand, the worse one graded):
//               slope and R² each, the peak at the turn, no jump > 20 % of the calibrated span, range ≥ half the span;
//               hands together: the hands' velocity lines correlate (≥ 0.8) and stay within 10 of each other.
//   E3b / G1    written levels zone by zone (terraced scales, a piece's p / f), hairpins, staccato dots, slurs.
//   E4          an even level held without creeping louder through the take.
//   G3          per-finger velocity and timing inside the take (shaped notes left out), thumb accents after crossings.
//   G4          long notes held ≥ 80 % of their value, clean releases at rests (notes under the pedal not judged).
//   G5 / B2     tempo drift (local tempo of the first vs the last third) and the swing ratio (graded against the
//               phrase's own ratio, or accepted inside the tempo's stylistic band).
//   G6 / B5     pedal changes, kept per change; outside pedal drills a blurred harmony change is soft information.
//   B4 / G7     chords: the share rolled (one rolled chord no longer fails a take) and the share top-voiced.
// Microphone takes have no velocity or release: only the timing measures (drift, swing) run on them.

import type { Drill, DrillCalibration, Dyn, ExpNote, Hand, NoteResult, PlayedNote, TouchLine, TouchMark, TouchReport } from './types';
import { MT, barsLabel, handTag, ratioText, type L } from '../../i18n/measureText';
import { analyzePedal, transitions, type PedalEvent } from './pedal';

export interface TouchFactor {
  sev: number;
  en: string;
  he: string;
}
export interface TouchOpts {
  mic?: boolean;
  /** The take's CC64 events (any MIDI take). */
  pedal?: PedalEvent[];
  /** An untimed / free-time take: no tempo or swing measures. */
  rubato?: boolean;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const med = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const sdOf = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};
/** Least squares y = a + b·x: slope, R² and the fitted change over the x range. */
export function fit(pts: [number, number][]): { slope: number; r2: number; range: number } | null {
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
const corr = (a: number[], b: number[]): number | null => {
  if (a.length < 3) return null;
  const ma = mean(a);
  const mb = mean(b);
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  a.forEach((x, i) => {
    sab += (x - ma) * (b[i] - mb);
    saa += (x - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  });
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
};

/** The player's velocity span (calibrated, else the uncalibrated 20–100 a keyboard gives a light-to-firm player). */
export function velSpan(cal?: DrillCalibration): number {
  return cal && cal.velMax > cal.velMin + 10 ? cal.velMax - cal.velMin : 80;
}
const PCT: Record<Dyn, [number, number]> = { pp: [0.03, 0.25], p: [0.15, 0.4], mp: [0.3, 0.55], mf: [0.45, 0.7], f: [0.6, 0.85], ff: [0.75, 0.97] };
const DEF: Record<Dyn, [number, number]> = { pp: [18, 46], p: [34, 64], mp: [50, 80], mf: [64, 96], f: [84, 112], ff: [100, 127] };
/** The velocity band of a written level (calibrated shares of the span, else the notation-software defaults). */
export function dynBand(d: Dyn, cal?: DrillCalibration): [number, number] {
  if (!cal || !(cal.velMax > cal.velMin + 10)) return DEF[d];
  const [a, b] = PCT[d];
  const s = cal.velMax - cal.velMin;
  return [Math.round(cal.velMin + a * s), Math.round(cal.velMin + b * s)];
}
const LEVELS: Dyn[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
/** The written level a velocity is nearest to (the centre of its band). */
export function levelOfVel(v: number, cal?: DrillCalibration): Dyn {
  let best: Dyn = 'mf';
  let d = Infinity;
  for (const l of LEVELS) {
    const [a, b] = dynBand(l, cal);
    const x = Math.abs(v - (a + b) / 2);
    if (x < d) (d = x), (best = l);
  }
  return best;
}
const RANK: Record<Dyn, number> = { pp: 0, p: 1, mp: 2, mf: 3, f: 4, ff: 5 };

/** Piano touch (velocity, release) is measured only on a piano by MIDI; guitar / bass velocities come from the mic. */
export const pianoTouch = (drill: Drill, mic?: boolean): boolean => !mic && drill.spec.instrument !== 'guitar' && drill.spec.instrument !== 'bass' && !drill.spec.family.startsWith('g-') && !drill.spec.family.startsWith('b-') && !drill.sung;

// ───────────────────────────── onsets ─────────────────────────────

interface On {
  beat: number;
  idx: number[];
  /** The written pitch that leads the onset (the top note; the bottom for the LH). */
  pitch: number;
  /** The loudest played velocity of the onset (null = nothing played). */
  vel: number | null;
  on: number | null;
  dev: number | null;
}
function onsetsOf(drill: Drill, per: NoteResult[], hand: Hand): On[] {
  const map = new Map<number, On>();
  drill.notes.forEach((n, i) => {
    if (n.hand !== hand) return;
    const k = Math.round(n.beat * 1e4);
    const o = map.get(k) ?? { beat: n.beat, idx: [], pitch: n.pitch, vel: null, on: null, dev: null };
    o.idx.push(i);
    if (hand === 'R' ? n.pitch > o.pitch : n.pitch < o.pitch) o.pitch = n.pitch;
    const r = per[i];
    if (r?.played) {
      o.vel = Math.max(o.vel ?? 0, r.played.vel);
      o.on = o.on === null ? r.played.on : Math.min(o.on, r.played.on);
      if (r.dev !== null) o.dev = o.dev === null ? r.dev : Math.min(o.dev, r.dev);
    }
    map.set(k, o);
  });
  return [...map.values()].sort((a, b) => a.beat - b.beat);
}
/** A single note in its hand (a chordId also joins the two hands' notes on one beat: that is no chord). */
export const soloInHand = (notes: ExpNote[], n: ExpNote): boolean => !notes.some((o) => o !== n && o.hand === n.hand && Math.abs(o.beat - n.beat) < 1e-6);
const handsOf = (drill: Drill): Hand[] => (['R', 'L'] as Hand[]).filter((h) => drill.notes.some((n) => n.hand === h));

// ───────────────────────────── G2: the shape ─────────────────────────────

interface HalfResult {
  fit: { slope: number; r2: number; range: number } | null;
  line: TouchLine;
  sev: number;
  tag: string | null;
  mark: { i: number; mark: TouchMark } | null;
}

/**
 * One half of a shaped scale (the onsets from `a` to `b`, inclusive), `dir` +1 = louder, −1 = softer. The checks in
 * order of what a teacher would say first: no change at all, a jump, the turn reached early, the change bunched at one
 * end (a crescendo that flattened, a diminuendo that fell all at once), too small, uneven.
 */
function half(os: On[], a: number, b: number, dir: 1 | -1, span: number, turnOff: number, hand: Hand | null): HalfResult {
  const id = dir > 0 ? 'cresc' : 'dim';
  const seg = os.slice(a, b + 1);
  const pts: [number, number][] = [];
  seg.forEach((o, k) => o.vel !== null && pts.push([k, o.vel]));
  const f = fit(pts);
  const tag = handTag(hand);
  const T = (x: L): L => ({ en: tag.en + x.en, he: tag.he + x.he });
  const need = 0.5 * span;
  if (!f) return { fit: null, line: { id, ok: false, text: T(dir > 0 ? MT.crescNone : MT.dimNone), why: dir > 0 ? MT.whySmall : MT.whyDimEarly }, sev: 2, tag: `${id}-none`, mark: null };
  const signed = dir * f.range;
  // the biggest step between neighbours (a terraced "crescendo" climbs in jumps)
  let jump = 0;
  let jumpAt = -1;
  for (let k = 1; k < pts.length; k++) {
    const d = dir * (pts[k][1] - pts[k - 1][1]);
    if (Math.abs(d) > jump) (jump = Math.abs(d)), (jumpAt = pts[k][0]);
  }
  // where the change happened: the share of the total change in the first and the last quarter of the half
  const n = pts.length;
  const q = Math.max(1, Math.round(n / 4));
  const total = dir * (pts[n - 1][1] - pts[0][1]);
  const lastShare = total > 0 ? (dir * (pts[n - 1][1] - pts[n - 1 - q][1])) / total : 0;
  const firstShare = total > 0 ? (dir * (pts[q][1] - pts[0][1])) / total : 0;
  // a flattening: the second half of the half moves less than a third of the first half
  const mid = Math.floor(n / 2);
  const f1 = fit(pts.slice(0, mid + 1));
  const f2 = fit(pts.slice(mid));
  const flat = !!f1 && !!f2 && dir * f1.slope > 0 && dir * f2.slope < 0.35 * dir * f1.slope;
  const allowed = Math.max(1, Math.round(0.05 * os.length));
  const mk = (i: number, mark: TouchMark) => ({ i: seg[Math.max(0, Math.min(seg.length - 1, i))].idx[0], mark });
  const sevShape = Math.max((1 - f.r2) / 0.2, signed > 0 ? need / signed : 3, jump / (0.2 * span));
  // first half's peak (cresc) / trough (dim-cresc) turning early: only for the half that leads to the turn
  if (signed <= 0.15 * span && f.r2 < 0.5)
    return { fit: f, line: { id, ok: false, text: T(dir > 0 ? MT.crescNone : MT.dimNone), why: dir > 0 ? MT.whySmall : MT.whyDimEarly }, sev: Math.max(2, sevShape), tag: `${id}-none`, mark: null };
  if (jump > 0.2 * span)
    return { fit: f, line: { id, ok: false, text: T(dir > 0 ? MT.crescJump(a + jumpAt + 1) : MT.dimJump(a + jumpAt + 1)), why: MT.whyJump }, sev: Math.max(1.2, sevShape), tag: `${id}-jump`, mark: mk(jumpAt, 'jump') };
  if (turnOff < -allowed)
    return { fit: f, line: { id, ok: false, text: T(dir > 0 ? MT.crescEarly(-turnOff) : MT.softEarly(-turnOff)), why: dir > 0 ? MT.whyPeak : MT.whySoftPeak }, sev: Math.max(1.2, 1 + (-turnOff - allowed) / (2 * allowed), sevShape), tag: `${id}-early`, mark: mk(seg.length - 1 + turnOff, 'peak') };
  if (dir > 0 && flat && b > a + 4) return { fit: f, line: { id, ok: false, text: T(MT.crescFlat), why: MT.whyFlat }, sev: Math.max(1.2, sevShape), tag: 'cresc-flat', mark: null };
  if (dir < 0 && lastShare > 0.5 && n >= 6) return { fit: f, line: { id, ok: false, text: T(MT.dimLate), why: MT.whyDimLate }, sev: Math.max(1.2, sevShape), tag: 'dim-late', mark: mk(n - 1 - q, 'jump') };
  if (dir < 0 && firstShare > 0.5 && n >= 6) return { fit: f, line: { id, ok: false, text: T(MT.dimEarly), why: MT.whyDimEarly }, sev: Math.max(1.2, sevShape), tag: 'dim-early', mark: null };
  if (signed < need) return { fit: f, line: { id, ok: false, text: T(dir > 0 ? MT.crescSmall : MT.dimSmall), why: MT.whySmall }, sev: Math.max(1.05, sevShape), tag: `${id}-small`, mark: null };
  if (f.r2 < 0.8) return { fit: f, line: { id, ok: false, text: T(dir > 0 ? MT.crescUneven : MT.dimUneven), why: dir > 0 ? MT.whyUneven : MT.whyDimUneven }, sev: Math.max(1.05, sevShape), tag: `${id}-uneven`, mark: null };
  return { fit: f, line: { id, ok: true, text: T(dir > 0 ? MT.crescOk : MT.dimOk) }, sev: sevShape, tag: null, mark: null };
}

/** The turning onset: the one farthest in pitch from where the hand started (the top of a scale, the outer note of contrary motion). */
function turnOf(os: On[]): number {
  let t = 0;
  for (let k = 1; k < os.length; k++) if (Math.abs(os[k].pitch - os[0].pitch) > Math.abs(os[t].pitch - os[0].pitch)) t = k;
  return t;
}

function shapeOf(drill: Drill, per: NoteResult[], span: number, add: Adder): TouchReport['shape'] {
  const goal = drill.goal.dynamics;
  const loudTurn = goal === 'cresc';
  const hs = handsOf(drill);
  const both = hs.length === 2;
  let worst: { sev: number; h: Hand; up: HalfResult; down: HalfResult | null; off: number } | null = null;
  const series: Partial<Record<Hand, On[]>> = {};
  for (const h of hs) {
    const os = onsetsOf(drill, per, h);
    series[h] = os;
    if (os.length < 4) continue;
    const t = turnOf(os);
    // the played turn: the loudest (cresc) / softest (dim-cresc) point of the smoothed line
    const v = os.map((o) => o.vel);
    const sm = v.map((_, k) => {
      const w = [v[k - 1], v[k], v[k + 1]].filter((x): x is number => x !== null && x !== undefined);
      return w.length ? mean(w) : null;
    });
    let p = -1;
    sm.forEach((x, k) => x !== null && (p < 0 || (loudTurn ? x > sm[p]! : x < sm[p]!)) && (p = k));
    const off = p < 0 ? 0 : p - t;
    const up = half(os, 0, t, loudTurn ? 1 : -1, span, off, both ? h : null);
    const down = t < os.length - 2 ? half(os, t, os.length - 1, loudTurn ? -1 : 1, span, 0, both ? h : null) : null;
    const sev = Math.max(up.sev, down?.sev ?? 0);
    if (!worst || sev > worst.sev) worst = { sev, h, up, down, off };
  }
  if (!worst) return undefined;
  const shape: NonNullable<TouchReport['shape']> = { up: worst.up.fit, down: worst.down?.fit ?? null, peakOff: worst.off, jump: 0 };
  for (const r of [worst.up, worst.down]) {
    if (!r) continue;
    // hands together: which hand's shape was the weaker one (the profile's "crescendos weaker in the LH")
    add(r.line, r.sev, r.tag ? (both ? [r.tag, `shape-${worst.h}`] : r.tag) : null, r.mark ? [r.mark] : []);
  }
  // hands together: the two velocity lines at the shared onsets
  if (both && series.R && series.L) {
    const lb = new Map(series.L.map((o) => [Math.round(o.beat * 1e4), o]));
    const rv: number[] = [];
    const lv: number[] = [];
    for (const o of series.R) {
      const l = lb.get(Math.round(o.beat * 1e4));
      if (l && o.vel !== null && l.vel !== null) (rv.push(o.vel), lv.push(l.vel));
    }
    if (rv.length >= 4) {
      const c = corr(rv, lv);
      const diff = mean(rv.map((x, i) => x - lv[i]));
      const lim = Math.max(10, 0.12 * span);
      const sev = Math.max(c === null ? 0 : (1 - c) / 0.2, Math.abs(diff) / lim);
      const ok = sev <= 1;
      const text = ok ? MT.handsDynOk : c !== null && c < 0.8 ? MT.handsDynApart : MT.handsLouder(diff > 0 ? 'R' : 'L', Math.round(Math.abs(diff)));
      add({ id: 'hands-dyn', ok, text, ...(ok ? {} : { why: MT.whyHandsDyn }) }, sev, ok ? null : 'hands-dyn', []);
      shape.hands = { corr: c, diff };
    }
  }
  return shape;
}

// ───────────────────────────── E3b / G1: written levels ─────────────────────────────

const dynOf = (n: ExpNote): Dyn | undefined => n.dynMark;
function zonesOf(drill: Drill, per: NoteResult[], cal: DrillCalibration | undefined, span: number, add: Adder, soft: boolean) {
  // consecutive onsets (both hands, by time) with the same written level
  const byBeat = new Map<number, number[]>();
  drill.notes.forEach((n, i) => dynOf(n) && byBeat.set(Math.round(n.beat * 1e4), [...(byBeat.get(Math.round(n.beat * 1e4)) ?? []), i]));
  const beats = [...byBeat.keys()].sort((a, b) => a - b);
  const zones: { d: Dyn; idx: number[]; from: number; to: number }[] = [];
  for (const b of beats) {
    const idx = byBeat.get(b)!;
    const d = dynOf(drill.notes[idx[0]])!;
    const z = zones[zones.length - 1];
    if (z && z.d === d) (z.idx.push(...idx), (z.to = drill.notes[idx[0]].beat));
    else zones.push({ d, idx: [...idx], from: drill.notes[idx[0]].beat, to: drill.notes[idx[0]].beat });
  }
  if (!zones.length) return;
  const meter = drill.meter || 4;
  const base = drill.barBase ?? 1;
  const where = (z: (typeof zones)[number]): L | null => (drill.goal.dynamics === 'terraced' ? null : barsLabel(base + Math.floor(z.from / meter + 1e-6), base + Math.floor(z.to / meter + 1e-6)));
  const meds: (number | null)[] = [];
  let worst: { sev: number; line: TouchLine; marks: { i: number; mark: TouchMark }[] } | null = null;
  for (const z of zones) {
    const vs = z.idx.filter((i) => !drill.notes[i].accent && per[i]?.played).map((i) => per[i].played!.vel);
    if (vs.length < 2) {
      meds.push(null);
      continue;
    }
    const m = med(vs);
    meds.push(m);
    const [lo, hi] = dynBand(z.d, cal);
    const out = m < lo ? lo - m : m > hi ? m - hi : 0;
    const sev = out === 0 ? 0.5 : 1 + out / (0.1 * span);
    if (out > 0 && (!worst || sev > worst.sev)) worst = { sev, line: { id: 'zones', ok: false, text: MT.zoneMiss(where(z), z.d, levelOfVel(m, cal)), why: MT.whyZone }, marks: [] };
    // inside a zone: no crescendo of its own (terraced, not a ramp)
    if (drill.goal.dynamics === 'terraced' && vs.length >= 4) {
      const f = fit(vs.map((v, k) => [k, v] as [number, number]));
      if (f && Math.abs(f.range) > 0.25 * span) {
        const s = Math.abs(f.range) / (0.25 * span);
        if (!worst || s > worst.sev) worst = { sev: s, line: { id: 'zones', ok: false, text: MT.zoneDrift, why: MT.whyZone }, marks: [] };
      }
    }
  }
  // a step between neighbouring zones, in the written direction (at least 10 % of the span)
  for (let k = 1; k < zones.length; k++) {
    const a = meds[k - 1];
    const b = meds[k];
    if (a === null || b === null || RANK[zones[k].d] === RANK[zones[k - 1].d]) continue;
    const want = Math.sign(RANK[zones[k].d] - RANK[zones[k - 1].d]);
    const step = want * (b - a);
    if (step < 0.1 * span) {
      const s = 1 + (0.1 * span - step) / (0.1 * span);
      if (!worst || s > worst.sev) worst = { sev: s, line: { id: 'zones', ok: false, text: MT.zoneFlat, why: MT.whyZone }, marks: [{ i: zones[k].idx[0], mark: 'jump' }] };
    }
  }
  if (worst) add(worst.line, soft ? Math.min(1.4, worst.sev) : worst.sev, 'zones', worst.marks);
  else add({ id: 'zones', ok: true, text: MT.zonesOk([...new Set(zones.map((z) => z.d))].join(' → ')) }, 0.5, null, []);
}

/** G1: hairpins — the velocity of the top line through each hairpin moves the written way. */
function hairpinsOf(drill: Drill, per: NoteResult[], span: number, add: Adder): void {
  const runs: { dir: 'cresc' | 'dim'; vs: number[]; from: number; to: number }[] = [];
  const os = [...onsetsOf(drill, per, 'R'), ...onsetsOf(drill, per, 'L')].filter((o) => drill.notes[o.idx[0]].hair).sort((a, b) => a.beat - b.beat);
  for (const o of os) {
    const d = drill.notes[o.idx[0]].hair!;
    const r = runs[runs.length - 1];
    if (r && r.dir === d && o.beat - r.to <= (drill.meter || 4)) {
      if (o.vel !== null) r.vs.push(o.vel);
      r.to = o.beat;
    } else runs.push({ dir: d, vs: o.vel !== null ? [o.vel] : [], from: o.beat, to: o.beat });
  }
  const meter = drill.meter || 4;
  const base = drill.barBase ?? 1;
  let bad: { r: (typeof runs)[number]; sev: number } | null = null;
  let judged = 0;
  for (const r of runs) {
    if (r.vs.length < 4) continue;
    judged++;
    const q = Math.max(1, Math.round(r.vs.length / 4));
    const rise = (mean(r.vs.slice(-q)) - mean(r.vs.slice(0, q))) * (r.dir === 'cresc' ? 1 : -1);
    const need = Math.max(6, 0.08 * span);
    if (rise < need) {
      const sev = 1 + (need - rise) / need;
      if (!bad || sev > bad.sev) bad = { r, sev };
    }
  }
  if (!judged) return;
  if (bad) add({ id: 'hair', ok: false, text: MT.hairMiss(barsLabel(base + Math.floor(bad.r.from / meter + 1e-6), base + Math.floor(bad.r.to / meter + 1e-6)), bad.r.dir === 'cresc'), why: MT.whyHair }, Math.min(1.4, bad.sev), 'hair', []);
  else add({ id: 'hair', ok: true, text: MT.hairOk }, 0.5, null, []);
}

/** E4: an even level — the band, which way it missed, and no creeping louder through the take. */
function levelOf(drill: Drill, per: NoteResult[], cal: DrillCalibration | undefined, span: number, add: Adder) {
  const lvl = drill.goal.dynamics!.slice(5) as Dyn;
  const vs = per.filter((r) => r.played && !r.exp.accent).map((r) => r.played!.vel);
  if (vs.length < 4) return;
  const [lo, hi] = dynBand(lvl, cal);
  const m = med(vs);
  // the take's own trend (velocity over the notes in order)
  const f = fit(vs.map((v, k) => [k, v] as [number, number]));
  const rise = f ? f.range : 0;
  if (rise >= 0.15 * span && f && f.r2 >= 0.25) add({ id: 'creep', ok: false, text: MT.creep(Math.round(rise)), why: MT.whyCreep }, rise / (0.15 * span), 'creep', []);
  if (m > hi) add({ id: 'level', ok: false, text: MT.tooLoud(lvl), why: MT.whyLevel(lvl) }, 0, 'level-loud', []);
  else if (m < lo) add({ id: 'level', ok: false, text: MT.tooSoft(lvl), why: MT.whyLevel(lvl) }, 0, 'level-soft', []);
  else add({ id: 'level', ok: true, text: MT.levelOk(lvl) }, 0, null, []);
}

// ───────────────────────────── G3: notes and positions ─────────────────────────────
// Owner 2026-11-17: the written fingering is only a suggestion (a jazz player often uses their own), so a take reports
// what is OBSERVED, tied to notes and places: a note that is soft / loud / late every time it comes, a bump or a late
// note right after the crossing points. Which finger may cause it is a long-term hypothesis (model.ts fingerHypotheses).

const SHAPED = new Set(['cresc', 'dim-cresc', 'terraced', 'voicing', 'accent3', 'accent4']);
const PC_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const PC_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
/** A pitch class named as the drill's key spells it (sharp keys sharp). */
export const pcName = (pc: number, key: number): string => ([7, 2, 9, 4, 11, 6].includes(((key % 12) + 12) % 12) ? PC_SHARP : PC_NAME)[((pc % 12) + 12) % 12];
/** Is this note right after a crossing point (the suggested thumb under / over, in the run's direction)? */
export function afterCrossing(prev: ExpNote, n: ExpNote): boolean {
  if (prev.finger === undefined || n.finger === undefined) return false;
  const up = n.pitch > prev.pitch;
  const goingOut = n.hand === 'R' ? up : !up;
  // thumb under after 3 / 4 going out; a 3 / 4 crossing over the thumb coming back
  return (n.finger === 1 && (prev.finger === 3 || prev.finger === 4) && goingOut) || (prev.finger === 1 && (n.finger === 3 || n.finger === 4) && !goingOut);
}
function fingersOf(drill: Drill, per: NoteResult[], span: number, add: Adder): TouchReport['fingers'] {
  const shaped = SHAPED.has(drill.goal.dynamics ?? '') || drill.notes.some((n) => n.dynMark || n.hair);
  const even = !!drill.goal.dynamics?.startsWith('even-');
  const hs = handsOf(drill);
  const both = hs.length === 2;
  const key = drill.tonic?.key ?? drill.spec.key;
  const out: NonNullable<TouchReport['fingers']> = [];
  let soft: { h: Hand; pc: number; pct: number; sev: number; loud: boolean } | null = null;
  let late: { h: Hand; pc: number; ms: number } | null = null;
  const bumps: number[] = [];
  const lateCross: number[] = [];
  for (const h of hs) {
    const plain = drill.notes.map((n, i) => ({ n, i, r: per[i] })).filter((x) => x.n.hand === h && soloInHand(drill.notes, x.n) && !x.n.accent && x.r?.played && x.r.ok);
    if (plain.length < 8) continue;
    const handVel = med(plain.map((x) => x.r.played!.vel));
    const handDev = mean(plain.filter((x) => x.r.dev !== null).map((x) => x.r.dev!));
    const pcs = [...new Set(plain.map((x) => ((x.n.pitch % 12) + 12) % 12))];
    if (pcs.length < 3) continue;
    for (const pc of pcs) {
      const xs = plain.filter((x) => ((x.n.pitch % 12) + 12) % 12 === pc);
      if (xs.length < 3) continue;
      const vs = xs.map((x) => x.r.played!.vel / Math.max(1, handVel));
      const vel = med(vs);
      // "every time": the note sits on the same side of the hand's level on (nearly) every appearance
      const sameSide = vs.filter((v) => Math.sign(v - 1) === Math.sign(vel - 1)).length / vs.length;
      const lt = mean(xs.filter((x) => x.r.dev !== null).map((x) => x.r.dev!)) - handDev;
      out.push({ key: `${h}:${pc}`, vel, late: lt, n: xs.length });
      if (!shaped && sameSide >= 0.75) {
        const d = Math.abs(vel - 1);
        if (d >= 0.12 && d * handVel >= Math.max(6, 0.06 * span)) {
          const sev = even ? d / 0.12 : 0.9;
          if (!soft || d * 100 > soft.pct) soft = { h, pc, pct: Math.round(d * 100), sev, loud: vel > 1 };
        }
      }
      if (lt >= 15 && (!late || lt > late.ms)) late = { h, pc, ms: Math.round(lt) };
    }
    // right after the crossing points: a bump (louder than both neighbours) or a late note
    plain.forEach((x, k) => {
      if (k === 0 || k === plain.length - 1 || !afterCrossing(plain[k - 1].n, x.n)) return;
      const nb = (plain[k - 1].r.played!.vel + plain[k + 1].r.played!.vel) / 2;
      if (!shaped && x.r.played!.vel >= 1.12 * nb && x.r.played!.vel - nb >= 6) bumps.push(x.i);
      const pd = plain[k - 1].r.dev;
      if (x.r.dev !== null && pd !== null && x.r.dev - pd >= 20) lateCross.push(x.i);
    });
  }
  if (soft) {
    const nm = pcName(soft.pc, key);
    const text = soft.loud ? MT.noteLoud(both ? soft.h : null, nm, soft.pct) : MT.noteSoft(both ? soft.h : null, nm, soft.pct);
    const marks = drill.notes.map((n, i) => ({ n, i })).filter((x) => x.n.hand === soft!.h && ((x.n.pitch % 12) + 12) % 12 === soft!.pc && per[x.i]?.played).map((x) => ({ i: x.i, mark: 'soft' as TouchMark }));
    add({ id: 'finger', ok: false, text, why: soft.loud ? MT.whyNoteLoud : MT.whyNoteSoft }, soft.sev, soft.loud ? `loud-note:${soft.h}${soft.pc}` : `soft-note:${soft.h}${soft.pc}`, marks);
  } else if (out.length && !shaped) add({ id: 'finger', ok: true, text: MT.notesEven }, 0, null, []);
  if (late) add({ id: 'late-finger', ok: false, text: MT.noteLate(both ? late.h : null, pcName(late.pc, key), late.ms), why: MT.whyLate }, 0.9, `late-note:${late.h}${late.pc}`, []);
  if (bumps.length >= 2) add({ id: 'thumb', ok: false, text: MT.crossBump(bumps.length), why: MT.whyThumb }, even ? 1.2 : 0.9, 'thumb', bumps.map((i) => ({ i, mark: 'thumb' as TouchMark })));
  if (lateCross.length >= 2) add({ id: 'late-finger', ok: false, text: MT.crossLate(lateCross.length), why: MT.whyThumb }, 0.9, 'cross-late', lateCross.map((i) => ({ i, mark: 'thumb' as TouchMark })));
  return out.length ? out : undefined;
}

// ───────────────────────────── G4: lengths ─────────────────────────────

const pedalDownAt = (ev: PedalEvent[], t: number): boolean => {
  let d = false;
  for (const e of ev) {
    if (e.at > t) break;
    d = e.down;
  }
  return d;
};
function lengthsOf(drill: Drill, bpm: number, per: NoteResult[], pedal: PedalEvent[], soft: boolean, add: Adder, expMs: (b: number) => number): TouchReport['lengths'] {
  const ev = transitions(pedal).sort((a, b) => a.at - b.at);
  const beatMs = 60000 / bpm;
  let long = 0;
  let held = 0;
  let rests = 0;
  let rel = 0;
  const marks: { i: number; mark: TouchMark }[] = [];
  const ringBy: Record<Hand, number> = { R: 0, L: 0 };
  drill.notes.forEach((n, i) => {
    const r = per[i];
    if (!r?.played || r.played.off === null || n.stac || n.hold) return;
    const L = expMs(n.beat + n.dur) - expMs(n.beat);
    const E = r.played.on + L;
    // under the sustain pedal the release is not heard: not judged
    if (pedalDownAt(ev, E - 20)) return;
    const next = drill.notes.filter((m) => m.hand === n.hand && m.beat > n.beat + 1e-6).reduce<number | null>((a, m) => (a === null || m.beat < a ? m.beat : a), null);
    if (next === null) return;
    const len = r.played.off - r.played.on;
    if (n.dur >= 1 - 1e-6) {
      long++;
      if (len >= 0.8 * L) held++;
      else marks.push({ i, mark: 'short' });
    }
    if (next - (n.beat + n.dur) >= 0.24) {
      rests++;
      if (r.played.off <= E + Math.max(80, 0.3 * beatMs)) rel++;
      else {
        marks.push({ i, mark: 'long' });
        ringBy[n.hand]++;
      }
    }
  });
  if (long >= 2) {
    const share = held / long;
    const sev = (1 - share) / 0.15;
    add(share >= 1 - 1e-9 ? { id: 'lengths', ok: true, text: MT.lengthsOk } : { id: 'lengths', ok: false, text: MT.lengthsShort(long - held), why: MT.whyLengths }, soft ? Math.min(1.4, sev) : sev, share < 1 ? 'lengths' : null, marks.filter((m) => m.mark === 'short'));
  }
  if (rests >= 1) {
    const share = rel / rests;
    const sev = (1 - share) / 0.15;
    const h: Hand | null = ringBy.R && ringBy.L ? null : ringBy.L ? 'L' : ringBy.R ? 'R' : null;
    const both = handsOf(drill).length === 2;
    add(share >= 1 - 1e-9 ? { id: 'release', ok: true, text: MT.releaseOk } : { id: 'release', ok: false, text: MT.releaseLong(both ? h : null, rests - rel), why: MT.whyRelease }, soft ? Math.min(1.4, sev) : sev, share < 1 ? 'release' : null, marks.filter((m) => m.mark === 'long'));
  }
  return long + rests ? { held, long, rel, rests } : undefined;
}

/** G1: staccato dots and slurs as written. */
function articulationOf(drill: Drill, per: NoteResult[], add: Adder) {
  const nextOn = (n: ExpNote): number | null => {
    const b = drill.notes.filter((m) => m.hand === n.hand && m.beat > n.beat + 1e-6).reduce<number | null>((a, m) => (a === null || m.beat < a ? m.beat : a), null);
    if (b === null) return null;
    const i = drill.notes.findIndex((m) => m.hand === n.hand && Math.abs(m.beat - b) < 1e-6 && per[drill.notes.indexOf(m)]?.played);
    return i >= 0 ? per[i].played!.on : null;
  };
  let sN = 0;
  let sOk = 0;
  const sMarks: { i: number; mark: TouchMark }[] = [];
  let lN = 0;
  let lOk = 0;
  const lMarks: { i: number; mark: TouchMark }[] = [];
  drill.notes.forEach((n, i) => {
    const r = per[i];
    if (!r?.played || r.played.off === null) return;
    const nx = nextOn(n);
    if (nx === null || nx <= r.played.on) return;
    const gap = nx - r.played.on;
    if (n.stac) {
      sN++;
      if ((r.played.off - r.played.on) / gap <= 0.6) sOk++;
      else sMarks.push({ i, mark: 'long' });
    }
    if (n.slur !== undefined) {
      const nxt = drill.notes.find((m) => m.hand === n.hand && m.slur === n.slur && m.beat > n.beat + 1e-6);
      if (!nxt) return;
      lN++;
      if (r.played.off - nx >= -10) lOk++;
      else lMarks.push({ i, mark: 'short' });
    }
  });
  if (sN >= 2) {
    const sh = sOk / sN;
    add(sh >= 0.8 ? { id: 'stac', ok: true, text: MT.stacOk } : { id: 'stac', ok: false, text: MT.stacLong(sN - sOk), why: MT.whyStac }, Math.min(1.4, (1 - sh) / 0.2), sh >= 0.8 ? null : 'stac', sMarks);
  }
  if (lN >= 2) {
    const sh = lOk / lN;
    add(sh >= 0.8 ? { id: 'slur', ok: true, text: MT.slurOk } : { id: 'slur', ok: false, text: MT.slurGap(lN - lOk), why: MT.whySlur }, Math.min(1.4, (1 - sh) / 0.2), sh >= 0.8 ? null : 'slur', lMarks);
  }
}

// ───────────────────────────── G5: drift, swing ─────────────────────────────

/** Local tempo of the first and the last third of the take, from the played onsets against the written times. */
export function tempoDrift(pts: { t: number; on: number }[], bpm: number): { from: number; to: number } | null {
  if (pts.length < 9) return null;
  const s = [...pts].sort((a, b) => a.t - b.t);
  const k = Math.floor(s.length / 3);
  const a = fit(s.slice(0, k + 1).map((p) => [p.t, p.on]));
  const b = fit(s.slice(s.length - k - 1).map((p) => [p.t, p.on]));
  // each third must last long enough for a tempo to mean something (a short fast run's jitter is not a drift)
  if (s[k].t - s[0].t < 1500 || s[s.length - 1].t - s[s.length - 1 - k].t < 1500) return null;
  if (!a || !b || a.slope <= 0 || b.slope <= 0) return null;
  return { from: bpm / a.slope, to: bpm / b.slope };
}

/** The stylistic swing band at a tempo: about a triplet (0.67) up to ♩140, leaning straighter to ~0.58 at ♩250. */
export function swingBand(bpm: number, ratio?: number): { target: number; lo: number; hi: number } {
  if (ratio !== undefined) return { target: ratio, lo: ratio - 0.05, hi: ratio + 0.05 };
  const target = Math.max(0.58, Math.min(2 / 3, 2 / 3 - Math.max(0, bpm - 140) * 0.0008));
  return { target, lo: target - 0.08, hi: target + 0.06 };
}

/**
 * The swing ratio of a take: per beat with a played on-beat note, its off-beat 8th and the next beat (same hand), the
 * long note's share of the beat. Median and spread; null with fewer than three such beats.
 */
export function measureSwing(drill: Drill, onOf: (i: number) => number | null): { ratio: number; sd: number; n: number } | null {
  const rs: number[] = [];
  for (const h of handsOf(drill)) {
    const at = new Map<number, number>();
    drill.notes.forEach((n, i) => {
      if (n.hand !== h) return;
      const on = onOf(i);
      if (on === null) return;
      const k = Math.round(n.beat * 2);
      if (Math.abs(n.beat * 2 - k) > 1e-4) return;
      at.set(k, Math.min(at.get(k) ?? Infinity, on));
    });
    for (const [k, a] of at) {
      if (k % 2) continue;
      const m = at.get(k + 1);
      const b = at.get(k + 2);
      if (m === undefined || b === undefined || b <= a) continue;
      rs.push((m - a) / (b - a));
    }
  }
  if (rs.length < 3) return null;
  return { ratio: med(rs), sd: sdOf(rs), n: rs.length };
}

// ───────────────────────────── G6: pedal ─────────────────────────────

/** Where the harmony changes: the chart's bars, else a new lowest left-hand pitch class (pieces). */
function harmonyChanges(drill: Drill): number[] {
  const meter = drill.meter || 4;
  if (drill.chart?.length) return drill.chart.map((c, i) => (i > 0 && c && c !== drill.chart![i - 1] ? i * meter : -1)).filter((b) => b > 0);
  const lh = drill.notes.filter((n) => n.hand === 'L');
  if (lh.length < 4) return [];
  const byBeat = new Map<number, number>();
  for (const n of lh) byBeat.set(Math.round(n.beat * 1e4), Math.min(byBeat.get(Math.round(n.beat * 1e4)) ?? 999, n.pitch));
  const out: number[] = [];
  let last: number | null = null;
  for (const [k, p] of [...byBeat.entries()].sort((a, b) => a[0] - b[0])) {
    const pc = ((p % 12) + 12) % 12;
    if (last !== null && pc !== last && Math.abs(k / 1e4 - Math.round(k / 1e4)) < 1e-4) out.push(k / 1e4);
    last = pc;
  }
  return out;
}
function pedalOf(drill: Drill, bpm: number, events: PedalEvent[], add: Adder, expMs: (b: number) => number): TouchReport['pedal'] {
  const g = drill.goal.pedal;
  const markAt = (beat: number) => {
    const i = drill.notes.reduce((b, n, k) => (Math.abs(n.beat - beat) < 1e-6 && (b < 0 || n.pitch < drill.notes[b].pitch) ? k : b), -1);
    return i >= 0 ? [{ i, mark: 'blur' as TouchMark }] : [];
  };
  if (g) {
    const pr = analyzePedal(g, events, bpm);
    const per = pr.perChange.map((c) => ({ beat: c.beat, ok: c.ok, ...(c.why ? { why: c.why } : {}) }));
    const sev = pr.total ? (pr.pass ? 0.5 : 1.3 + (0.8 - pr.ok / pr.total) * 2) : 0;
    add(pr.pass ? { id: 'pedal', ok: true, text: MT.pedalOk(pr.ok, pr.total) } : { id: 'pedal', ok: false, text: pr.why, why: MT.whyBlur }, sev, pr.pass ? null : 'pedal', per.filter((c) => !c.ok).flatMap((c) => markAt(c.beat)));
    return per;
  }
  // soft information: the pedal held down through a harmony change
  const ev = transitions(events).sort((a, b) => a.at - b.at);
  if (!ev.some((e) => e.down)) return undefined;
  const changes = harmonyChanges(drill);
  const blurred = changes.filter((b) => {
    const T = expMs(b);
    return pedalDownAt(ev, T - 150) && !ev.some((e) => !e.down && e.at >= T - 150 && e.at <= T + 250);
  });
  if (!changes.length) return undefined;
  if (blurred.length) add({ id: 'blur', ok: false, text: MT.pedalBlur(blurred.length), why: MT.whyBlur }, 0.9, 'blur', blurred.flatMap(markAt));
  return changes.map((b) => ({ beat: b, ok: !blurred.includes(b), ...(blurred.includes(b) ? { why: 'blur' } : {}) }));
}

// ───────────────────────────── B4 / G7: chords ─────────────────────────────

/** ms a chord's notes may spread before it counts as rolled. */
export const ROLL_MS = 30;
function chordsOf(drill: Drill, per: NoteResult[], span: number, add: Adder, velOk: boolean): { report: TouchReport['chords']; median: number | null; sevRoll: number | null } {
  const groups = new Map<string, number[]>();
  drill.notes.forEach((n, i) => {
    if (n.chordId === undefined || !per[i]?.played) return;
    const k = `${n.chordId}:${n.hand}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });
  const gs = [...groups.values()].filter((g) => g.length >= 2);
  if (!gs.length) return { report: undefined, median: null, sevRoll: null };
  const spreads = gs.map((g) => {
    const ons = g.map((i) => per[i].played!.on);
    return Math.max(...ons) - Math.min(...ons);
  });
  const rolledIdx = gs.filter((_, k) => spreads[k] > ROLL_MS);
  const md = med(spreads);
  const share = rolledIdx.length / gs.length;
  const sevRoll = Math.max(md / 25, share / 0.2);
  const marks = rolledIdx.map((g) => ({ i: Math.min(...g), mark: 'roll' as TouchMark }));
  add(rolledIdx.length ? { id: 'roll', ok: false, text: MT.rolled(rolledIdx.length, gs.length), why: MT.whyRoll } : { id: 'roll', ok: true, text: MT.chordsOk }, 0, rolledIdx.length ? 'roll' : null, marks);
  // G7: voicing per chord — the top note above the mean of the others by 10 % of the span (≥ 8)
  let voiced: number | undefined;
  if (velOk && (drill.goal.dynamics === 'voicing' || gs.some((g) => g.some((i) => drill.notes[i].accent)))) {
    const vg = gs.filter((g) => g.some((i) => drill.notes[i].accent));
    if (vg.length) {
      const vm: { i: number; mark: TouchMark }[] = [];
      voiced = 0;
      for (const g of vg) {
        const acc = g.filter((i) => drill.notes[i].accent).map((i) => per[i].played!.vel);
        const rest = g.filter((i) => !drill.notes[i].accent).map((i) => per[i].played!.vel);
        if (!rest.length) continue;
        const ok = mean(acc) - mean(rest) >= Math.max(8, 0.1 * span);
        if (ok) voiced++;
        vm.push({ i: g.find((i) => drill.notes[i].accent)!, mark: ok ? 'voiced' : 'flat' });
      }
      const share2 = voiced / vg.length;
      const sev = share2 >= 0.8 ? 0.5 + (1 - share2) : 1 + (0.8 - share2) / 0.2;
      add({ id: 'voicing', ok: share2 >= 0.8, text: MT.voiced(voiced, vg.length), ...(share2 >= 0.8 ? {} : { why: MT.whyVoiced }) }, drill.goal.dynamics === 'voicing' ? sev : Math.min(0.9, sev), share2 >= 0.8 ? null : 'voicing', vm);
    }
  }
  return { report: { rolled: rolledIdx.length, total: gs.length, ...(voiced !== undefined ? { voiced } : {}) }, median: md, sevRoll };
}

// ───────────────────────────── the report ─────────────────────────────

type Adder = (line: TouchLine, sev: number, tag: string | string[] | null, marks: { i: number; mark: TouchMark }[]) => void;

export interface TouchResult {
  report: TouchReport;
  factors: TouchFactor[];
  /** Chord spread: median (ms) and its severity (B4), null without chords. */
  chordMedian: number | null;
}

/**
 * The touch of one take. `per` = analyzeTake's per-note results (dev already against the measured swing), `expMs` the
 * drill's beat → ms map. `swing` = the measured swing and its band (analyzeTake measures it before the timing stats).
 */
export function analyzeTouch(drill: Drill, bpm: number, per: NoteResult[], cal: DrillCalibration | undefined, opts: TouchOpts, expMs: (b: number) => number, swing: { ratio: number; sd: number; band: { target: number; lo: number; hi: number } } | null): TouchResult {
  const lines: TouchLine[] = [];
  const marks: TouchReport['marks'] = [];
  const factors: TouchFactor[] = [];
  const tags: string[] = [];
  const control: number[] = [];
  const add: Adder = (line, sev, tag, ms) => {
    lines.push(line);
    marks.push(...ms);
    if (tag) tags.push(...(Array.isArray(tag) ? tag : [tag]));
    if (sev > 0) factors.push({ sev, en: line.text.en, he: line.text.he });
    if (['cresc', 'dim', 'hands-dyn', 'zones', 'hair', 'level', 'creep', 'lengths', 'release', 'stac', 'slur', 'pedal', 'voicing'].includes(line.id)) control.push(line.ok ? 1 : Math.max(0, 1 - Math.max(0, sev - 0.5) / 1.5));
  };
  const report: TouchReport = { lines, marks };
  const span = velSpan(cal);
  const velOk = pianoTouch(drill, opts.mic) && per.some((r) => r.played && r.played.vel !== 64);
  const releaseOk = pianoTouch(drill, opts.mic) && per.some((r) => r.played?.off !== null && r.played?.off !== undefined);
  const g = drill.goal;
  if (velOk) {
    if (g.dynamics === 'cresc' || g.dynamics === 'dim-cresc') report.shape = shapeOf(drill, per, span, add);
    if (g.dynamics === 'terraced' || (g.marks && drill.notes.some((n) => n.dynMark))) zonesOf(drill, per, cal, span, add, g.dynamics !== 'terraced');
    if (g.marks && drill.notes.some((n) => n.hair)) hairpinsOf(drill, per, span, add);
    if (g.dynamics?.startsWith('even-')) levelOf(drill, per, cal, span, add);
    report.fingers = fingersOf(drill, per, span, add);
  }
  const ch = pianoTouch(drill, opts.mic) ? chordsOf(drill, per, span, add, velOk) : { report: undefined, median: null, sevRoll: null };
  if (ch.report) report.chords = ch.report;
  if (ch.sevRoll !== null) factors.push({ sev: ch.sevRoll, en: lines.find((l) => l.id === 'roll')!.text.en, he: lines.find((l) => l.id === 'roll')!.text.he });
  if (releaseOk) {
    if (g.lengths) report.lengths = lengthsOf(drill, bpm, per, opts.pedal ?? [], !!g.marks, add, expMs);
    if (g.marks) articulationOf(drill, per, add);
  }
  if (opts.pedal && pianoTouch(drill, opts.mic) && (g.pedal || opts.pedal.length)) {
    const p = pedalOf(drill, bpm, opts.pedal, add, expMs);
    if (p) report.pedal = p;
  }
  // G5: drift — the onsets of the busier hand (a chord counts once), timed takes only
  if (!opts.rubato && !g.free && !g.improv && !(g.timingTolerance && g.timingTolerance > 1) && drill.freeAbove === undefined) {
    const pts: { t: number; on: number }[] = [];
    const seen = new Set<number>();
    per.forEach((r) => {
      if (!r.played || r.dev === null) return;
      const k = Math.round(r.exp.beat * 1e4);
      if (seen.has(k)) return;
      seen.add(k);
      pts.push({ t: r.played.on - r.dev, on: r.played.on });
    });
    const d = tempoDrift(pts, bpm);
    if (d) {
      const rel = d.to / d.from - 1;
      report.drift = { from: Math.round(d.from), to: Math.round(d.to) };
      const sev = Math.abs(rel) / 0.05;
      if (Math.abs(rel) >= 0.04) add({ id: 'drift', ok: false, text: rel > 0 ? MT.rushed(report.drift.from, report.drift.to) : MT.dragged(report.drift.from, report.drift.to), why: MT.whyRush }, sev, rel > 0 ? 'rush' : 'drag', []);
      else add({ id: 'drift', ok: true, text: MT.driftOk }, sev, null, []);
    }
  }
  if (swing && !opts.rubato) {
    const { ratio, sd, band } = swing;
    report.swing = { ratio, target: band.target, lo: band.lo, hi: band.hi };
    const out = ratio < band.lo ? band.lo - ratio : ratio > band.hi ? ratio - band.hi : 0;
    if (out > 0) add({ id: 'swing', ok: false, text: ratio < band.lo ? MT.swingStraight(ratioText(ratio)) : MT.swingHeavy(ratioText(ratio)), why: MT.whySwing(ratioText(band.target)) }, 1 + out / 0.05, ratio < band.lo ? 'swing-straight' : 'swing-heavy', []);
    else if (sd > 0.06) add({ id: 'swing', ok: false, text: MT.swingUneven, why: MT.whySwingUneven }, sd / 0.06, 'swing-uneven', []);
    else add({ id: 'swing', ok: true, text: MT.swingOk(ratioText(ratio)) }, 0, null, []);
  }
  if (control.length) report.control = mean(control);
  if (tags.length) report.tags = tags;
  return { report, factors, chordMedian: ch.median };
}

/** A note's played length (ms), for the views. */
export const heldMs = (p: PlayedNote): number | null => (p.off === null ? null : p.off - p.on);

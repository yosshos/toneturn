// What the app hears in a take (SPEC-PHRASE-STUDIO §14.1, §14.3): tempo, beat 0, meter, swing, key and chords — each
// with a confidence, and the second guess when it is not sure (shown as a two-choice question). Pure; MIDI notes only
// (audio is v2). Deterministic, no randomness.

import type { RawNote } from './takeSource';
import type { LickChord, LickContext } from '../licks';

export type Dots = 1 | 2 | 3;
/** Confidence 0..1 → the ●●● / ●●○ / ●○○ mark. */
export const dotsOf = (c: number): Dots => (c >= 0.6 ? 3 : c >= 0.3 ? 2 : 1);

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Onsets merged into events: notes within 40 ms are one event (a chord), weight = summed velocity. */
export function onsetEvents(notes: RawNote[]): { t: number; w: number; pitches: number[] }[] {
  const s = [...notes].sort((a, b) => a.on - b.on);
  const out: { t: number; w: number; pitches: number[] }[] = [];
  for (const n of s) {
    const last = out[out.length - 1];
    if (last && n.on - last.t < 40) {
      last.w += n.vel / 127;
      last.pitches.push(n.pitch);
    } else out.push({ t: n.on, w: Math.max(0.2, n.vel / 127), pitches: [n.pitch] });
  }
  return out;
}

export interface Grid {
  bpm: number;
  /** Beat 0 (ms). */
  t0: number;
  conf: number;
  /** The octave error alternative (×2 or ×½), when not sure. */
  alt: number | null;
}

/**
 * Tempo and beat phase from onsets (no click): the autocorrelation of a velocity-weighted onset signal (10 ms frames,
 * smoothed ~30 ms) over lags of ♩320…♩40, weighted by a broad log-tempo prior around ♩110 (avoids octave errors on
 * sparse playing); then the phase that puts the most onset weight on the beats. Confidence: how much the best lag beats
 * the best non-harmonic other lag.
 */
export function detectGrid(notes: RawNote[]): Grid {
  const ev = onsetEvents(notes);
  if (ev.length < 3) return { bpm: 100, t0: ev[0]?.t ?? 0, conf: 0, alt: null };
  const start = ev[0].t;
  const end = ev[ev.length - 1].t;
  const F = 10;
  const n = Math.max(1, Math.ceil((end - start) / F) + 40);
  const sig = new Float64Array(n);
  for (const e of ev) {
    const c = Math.round((e.t - start) / F);
    for (let k = -3; k <= 3; k++) {
      const j = c + k;
      if (j >= 0 && j < n) sig[j] += e.w * Math.exp(-(k * k) / 4.5);
    }
  }
  const lagMin = Math.floor(60000 / 320 / F);
  const lagMax = Math.ceil(60000 / 40 / F);
  const ac: number[] = [];
  for (let L = 0; L <= lagMax; L++) {
    if (L < lagMin) {
      ac.push(0);
      continue;
    }
    let s = 0;
    for (let i = 0; i + L < n; i++) s += sig[i] * sig[i + L];
    ac.push(s);
  }
  // Metrical salience: a beat period whose double and half also show up is a better beat.
  const score = (L: number) => {
    const bpm = 60000 / (L * F);
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 0.9, 2));
    const at = (x: number) => (x >= lagMin && x <= lagMax ? ac[Math.round(x)] : 0);
    return (ac[L] + 0.5 * at(L * 2) + 0.25 * at(L / 2)) * prior;
  };
  let best = lagMin;
  let bestS = -1;
  for (let L = lagMin; L <= lagMax; L++) {
    const s = score(L);
    if (s > bestS) {
      bestS = s;
      best = L;
    }
  }
  // Refine the period on the onsets themselves (sub-frame): the period within ±4 % that best fits the grid.
  const fit = (P: number, ph: number) => {
    let s = 0;
    for (const e of ev) {
      const x = (e.t - ph) / P;
      const d = x - Math.round(x);
      const h = x * 2 - Math.round(x * 2);
      s += e.w * (Math.exp(-(d * d) / 0.006) + 0.35 * Math.exp(-(h * h) / 0.012));
    }
    return s;
  };
  let P = best * F;
  let ph = start;
  let fs = -1;
  for (let k = -16; k <= 16; k++) {
    const p = best * F * (1 + k * 0.0025);
    for (let j = 0; j < 24; j++) {
      const phase = start + (j / 24) * p - p / 2;
      const s = fit(p, phase);
      if (s > fs) {
        fs = s;
        P = p;
        ph = phase;
      }
    }
  }
  // beat 0: the beat at or just before the first onset
  const t0 = ph + Math.floor((start - ph) / P + 0.25) * P;
  // Confidence: the best score against the best lag that is not a harmonic of it.
  let other = 0;
  for (let L = lagMin; L <= lagMax; L++) {
    const r = L / best;
    const harmonic = [0.5, 1, 2, 1.5, 2 / 3, 3, 1 / 3].some((h) => Math.abs(r - h) < 0.06);
    if (!harmonic) other = Math.max(other, score(L));
  }
  const margin = bestS > 0 ? 1 - other / bestS : 0;
  // How tight the onsets sit on the grid (8ths / triplets): rubato playing gets low confidence.
  const devs = ev.map((e) => {
    const x = (e.t - t0) / (P / 2);
    return Math.abs(x - Math.round(x)) * (P / 2);
  });
  const tight = Math.max(0, 1 - median(devs) / 60);
  const conf = Math.max(0, Math.min(1, 0.55 * margin + 0.45 * tight));
  const bpm = Math.round((60000 / P) * 10) / 10;
  const alt = conf < 0.6 ? (bpm < 100 ? Math.round(bpm * 2) : Math.round(bpm / 2)) : null;
  return { bpm: Math.round(bpm), t0, conf, alt };
}

/**
 * Swing: per beat with exactly two onsets (one on the beat), the share of the beat before the second one; the median
 * over such beats (0.5 straight … 0.72 hard swing). Confidence from how many beats agree.
 */
export function detectSwing(notes: RawNote[], g: Pick<Grid, 'bpm' | 't0'>): { swing: number; conf: number } {
  const P = 60000 / g.bpm;
  const ev = onsetEvents(notes);
  const byBeat = new Map<number, number[]>();
  for (const e of ev) {
    const x = (e.t - g.t0) / P;
    const b = Math.floor(x + 0.12);
    const f = x - b;
    (byBeat.get(b) ?? byBeat.set(b, []).get(b)!).push(f);
  }
  const ratios: number[] = [];
  for (const fs of byBeat.values()) {
    if (fs.length !== 2) continue;
    if (Math.abs(fs[0]) > 0.12) continue;
    const r = fs[1] - fs[0];
    if (r > 0.4 && r < 0.8) ratios.push(r);
  }
  if (ratios.length < 3) return { swing: 0.5, conf: ratios.length ? 0.2 : 0.1 };
  const m = median(ratios);
  const spread = median(ratios.map((r) => Math.abs(r - m)));
  const swing = m < 0.54 ? 0.5 : Math.min(0.72, Math.round(m * 100) / 100);
  return { swing, conf: Math.max(0.1, Math.min(1, (ratios.length / 8) * (1 - spread / 0.08))) };
}

/**
 * Meter and the downbeat: for 3 and 4 beats a bar and each phase, the accent on the bar's first beat (onset weight,
 * long notes, phrase starts after a rest) against the other beats. 4/4 wins ties (the common case).
 */
export function detectMeter(notes: RawNote[], g: Pick<Grid, 'bpm' | 't0'>): { meter: 3 | 4; downbeat: number; conf: number } {
  const P = 60000 / g.bpm;
  const ev = onsetEvents(notes);
  const beats = new Map<number, number>();
  for (let i = 0; i < ev.length; i++) {
    const e = ev[i];
    const x = (e.t - g.t0) / P;
    const b = Math.round(x);
    if (Math.abs(x - b) > 0.2) continue;
    const gapBefore = i ? (e.t - ev[i - 1].t) / P : 2;
    const gapAfter = i + 1 < ev.length ? (ev[i + 1].t - e.t) / P : 1;
    const w = e.w + (gapBefore >= 1 ? 0.6 : 0) + Math.min(1, gapAfter / 2) * 0.5 + (e.pitches.length > 1 ? 0.3 : 0);
    beats.set(b, (beats.get(b) ?? 0) + w);
  }
  const res: { meter: 3 | 4; phase: number; v: number }[] = [];
  for (const meter of [4, 3] as const) {
    for (let phase = 0; phase < meter; phase++) {
      let on = 0;
      let nOn = 0;
      let off = 0;
      let nOff = 0;
      for (const [b, w] of beats) {
        if (mod(b - phase, meter) === 0) {
          on += w;
          nOn++;
        } else {
          off += w;
          nOff++;
        }
      }
      const v = (nOn ? on / nOn : 0) - (nOff ? off / nOff : 0) + (meter === 4 ? 0.05 : 0);
      res.push({ meter, phase, v });
    }
  }
  res.sort((a, b) => b.v - a.v);
  const top = res[0];
  const otherMeter = res.find((r) => r.meter !== top.meter)!;
  const conf = Math.max(0.15, Math.min(1, (top.v - otherMeter.v) / 0.6));
  return { meter: top.meter, downbeat: top.phase, conf: beats.size < 4 ? 0.2 : conf };
}
const mod = (n: number, m: number) => ((n % m) + m) % m;

// ───────────────────────────── key and chords ─────────────────────────────

const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((x, y) => x + y, 0) / a.length;
  const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let n = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    n += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? n / Math.sqrt(da * db) : 0;
}

/** A note on the beat grid (beats from the phrase's bar line). */
export interface BeatNote {
  midi: number;
  beat: number;
  dur: number;
  /** MEASUREMENT-AUDIT G14: the source take's velocity (MIDI, or an audio take's relative level) — the model's dynamics. */
  vel?: number;
  /** G14: how long the source note sounded, as a share of the gap to the next onset of its hand (a short one is detached). */
  held?: number;
}

export interface KeyGuess {
  tonic: number;
  minor: boolean;
  /** Share among the two best (shown as "D minor 18 %"). */
  p: number;
}
export interface KeyResult {
  best: KeyGuess;
  second: KeyGuess;
  conf: number;
  /** Chords from a jazz template (relative to the tonic), or [] when no template fits. */
  chords: LickChord[];
  ctx: LickContext | 'free';
}

/** Pitch-class profile weighted by duration and metric position (on the beat × 1.5, bar line × 2). */
export function pcProfile(notes: BeatNote[], meter = 4): number[] {
  const w = new Array(12).fill(0);
  for (const n of notes) {
    const onBeat = Math.abs(n.beat - Math.round(n.beat)) < 0.05;
    const onBar = onBeat && mod(Math.round(n.beat), meter) === 0;
    w[mod12(n.midi)] += Math.min(2, Math.max(0.25, n.dur)) * (onBar ? 2 : onBeat ? 1.5 : 1);
  }
  return w;
}

type Q = 'maj7' | 'm7' | '7' | 'hd7' | 'm6';
const CHORD_CT: Record<Q, number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], hd7: [0, 3, 6, 10], m6: [0, 3, 7, 9] };
const CHORD_AVOID: Record<Q, number[]> = { maj7: [5, 10, 1], m7: [4, 11, 1], '7': [11, 3, 1], hd7: [4, 7, 11], m6: [4, 10, 1] };

/** The best chord of one bar (root pc, quality, fit 0..1), strong-beat chord tones weighted; null when the bar is empty. */
export function barChord(notes: BeatNote[]): { root: number; q: Q; fit: number } | null {
  if (!notes.length) return null;
  let best: { root: number; q: Q; fit: number } | null = null;
  let tot = 0;
  for (const n of notes) tot += weightOf(n);
  for (let r = 0; r < 12; r++)
    for (const q of Object.keys(CHORD_CT) as Q[]) {
      let s = 0;
      for (const n of notes) {
        const rel = mod12(n.midi - r);
        const w = weightOf(n);
        if (CHORD_CT[q].includes(rel)) s += w * (rel === 4 || rel === 3 || rel === 10 || rel === 11 ? 1.15 : 1);
        else if (CHORD_AVOID[q].includes(rel)) s -= w * 0.8;
      }
      const fit = tot ? s / tot : 0;
      if (!best || fit > best.fit + 1e-9) best = { root: r, q, fit };
    }
  return best;
}
const weightOf = (n: BeatNote) => {
  const onBeat = Math.abs(n.beat - Math.round(n.beat)) < 0.05;
  return Math.min(2, Math.max(0.25, n.dur)) * (onBeat ? 1.6 : 1);
};

/**
 * The key (Krumhansl–Kessler on the weighted profile) and, when one fits better, a jazz template over the bars:
 * ii–V–I, minor ii–V–i, ii–V, V–I, or a blues/dominant vamp. A template that fits gives the chords and can overrule a
 * close key call (a ii–V–I line in F that lingers on G and C reads as F, not C).
 */
export function detectKeyChords(notes: BeatNote[], meter = 4): KeyResult {
  const prof = pcProfile(notes, meter);
  const scored: { tonic: number; minor: boolean; v: number }[] = [];
  for (let t = 0; t < 12; t++)
    for (const minor of [false, true]) {
      const p = minor ? KK_MINOR : KK_MAJOR;
      scored.push({ tonic: t, minor, v: pearson(prof, Array.from({ length: 12 }, (_, i) => p[mod12(i - t)])) });
    }
  // a phrase that ends on its tonic, or starts there, leans that way
  const last = notes.length ? [...notes].sort((a, b) => a.beat - b.beat)[notes.length - 1] : null;
  if (last) for (const s of scored) if (mod12(last.midi - s.tonic) === 0) s.v += 0.05;
  scored.sort((a, b) => b.v - a.v);
  // Bar chords and templates.
  const bars = Math.max(1, Math.ceil(Math.max(...notes.map((n) => n.beat + n.dur), 1) / meter - 1e-6));
  const per: ({ root: number; q: Q; fit: number } | null)[] = [];
  for (let b = 0; b < bars; b++) per.push(barChord(notes.filter((n) => n.beat >= b * meter - 0.01 && n.beat < (b + 1) * meter - 0.01)));
  const tmpl = bestTemplate(per, meter);
  let best = scored[0];
  let second = scored.find((s) => s !== best)!;
  if (tmpl && tmpl.fit > 0.45) {
    const t = scored.find((s) => s.tonic === tmpl.tonic && s.minor === tmpl.minor);
    if (t && t.v > best.v - 0.25) {
      second = t === best ? second : best;
      best = t;
    }
  }
  const gap = best.v - second.v;
  const conf = Math.max(0, Math.min(1, gap / 0.2 + (tmpl && tmpl.fit > 0.45 && tmpl.tonic === best.tonic ? 0.25 : 0)));
  const pb = Math.max(0.5, Math.min(0.95, 0.5 + gap * 2.2));
  const chords: LickChord[] = tmpl && tmpl.fit > 0.45 && tmpl.tonic === best.tonic && tmpl.minor === best.minor ? tmpl.chords : [];
  return {
    best: { tonic: best.tonic, minor: best.minor, p: Math.round(pb * 100) / 100 },
    second: { tonic: second.tonic, minor: second.minor, p: Math.round((1 - pb) * 100) / 100 },
    conf: Math.round(conf * 100) / 100,
    chords,
    ctx: chords.length ? (tmpl!.ctx as LickContext) : 'free',
  };
}

/** Templates over the bar chords; returns the best one's tonic, chords (one per bar, relative) and mean fit. */
function bestTemplate(per: ({ root: number; q: Q; fit: number } | null)[], meter: number): { tonic: number; minor: boolean; chords: LickChord[]; fit: number; ctx: string } | null {
  const bars = per.length;
  let best: { tonic: number; minor: boolean; chords: LickChord[]; fit: number; ctx: string } | null = null;
  const T: { ctx: string; minor: boolean; seq: [number, Q[]][] }[] = [
    { ctx: 'major-251', minor: false, seq: [[2, ['m7']], [7, ['7']], [0, ['maj7']]] },
    { ctx: 'minor-251', minor: true, seq: [[2, ['hd7', 'm7']], [7, ['7']], [0, ['m6', 'm7']]] },
    { ctx: 'dominant', minor: false, seq: [[7, ['7']], [0, ['maj7']]] },
    { ctx: 'major-251', minor: false, seq: [[2, ['m7']], [7, ['7']]] },
  ];
  for (let tonic = 0; tonic < 12; tonic++)
    for (const tp of T) {
      // each template chord takes ⌊bars / len⌋ bars, the last one the rest (ii | V | I I)
      const L = tp.seq.length;
      if (bars < L) continue;
      const share = Math.floor(bars / L);
      const lens = tp.seq.map((_, i) => (i === L - 1 ? bars - share * (L - 1) : share));
      let fit = 0;
      let k = 0;
      let used = 0;
      const chords: LickChord[] = [];
      for (let i = 0; i < L; i++) {
        const [rel, qs] = tp.seq[i];
        const len = lens[i];
        chords.push([rel, qs[0], len * meter]);
        for (let b = 0; b < len; b++, k++) {
          const c = per[k];
          if (!c) continue;
          used++;
          const root = mod12(tonic + rel);
          fit += c.root === root && qs.includes(c.q) ? c.fit : c.root === root ? c.fit * 0.6 : scoreAgainst(c, root, qs[0]);
        }
      }
      if (!used) continue;
      const mean = fit / used + (L === 3 ? 0.03 : 0);
      if (!best || mean > best.fit) best = { tonic, minor: tp.minor, chords, fit: mean, ctx: tp.ctx };
    }
  return best;
}
const scoreAgainst = (c: { root: number; q: Q; fit: number }, root: number, q: Q) => {
  // the bar's best chord shares chord tones with the template chord (a rootless line)
  const a = CHORD_CT[c.q].map((x) => mod12(x + c.root));
  const b = CHORD_CT[q].map((x) => mod12(x + root));
  const common = a.filter((x) => b.includes(x)).length;
  return (common / 4) * c.fit * 0.8;
};

/** The take's span in seconds without its silent tail (the record mode stops after `silenceMs`). */
export function trimSilence(notes: RawNote[]): { start: number; end: number } {
  if (!notes.length) return { start: 0, end: 0 };
  const start = Math.min(...notes.map((n) => n.on));
  const end = Math.max(...notes.map((n) => n.off ?? n.on + 200));
  return { start, end };
}

/** Everything in one call (the "Caught" card). With a known tempo (click / band) only the key is detected. */
export interface Caught {
  grid: Grid;
  meter: 3 | 4;
  meterConf: number;
  swing: number;
  swingConf: number;
  key: KeyResult;
  bars: number;
  span: { start: number; end: number };
}
export function catchTake(notes: RawNote[], known?: { bpm?: number; t0?: number; meter?: number }): Caught {
  const span = trimSilence(notes);
  let grid: Grid;
  if (known?.bpm) grid = { bpm: known.bpm, t0: known.t0 ?? span.start, conf: 1, alt: null };
  else grid = detectGrid(notes);
  const m = known?.meter === 3 || known?.meter === 4 ? { meter: known.meter as 3 | 4, downbeat: 0, conf: 1 } : detectMeter(notes, grid);
  const P = 60000 / grid.bpm;
  // move beat 0 to the detected downbeat (a bar line)
  if (!known?.bpm) grid = { ...grid, t0: grid.t0 + m.downbeat * P - (m.downbeat ? m.meter * P : 0) };
  const sw = detectSwing(notes, grid);
  const beatNotes: BeatNote[] = notes.map((n) => ({ midi: n.pitch, beat: (n.on - grid.t0) / P, dur: Math.max(0.1, ((n.off ?? n.on + P / 2) - n.on) / P) }));
  const key = detectKeyChords(beatNotes, m.meter);
  const bars = Math.max(1, Math.ceil((span.end - grid.t0) / P / m.meter - 1e-6) - Math.floor((span.start - grid.t0) / P / m.meter + 1e-6));
  return { grid, meter: m.meter, meterConf: m.conf, swing: sw.swing, swingConf: sw.conf, key, bars, span };
}

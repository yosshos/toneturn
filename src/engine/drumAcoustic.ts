// An acoustic kit by microphone (DRUMS_AUDIT §5, best effort). DRUMS_CURRICULUM §3.8 calls telling the drums of a
// full acoustic kit apart "research-grade"; this is the simple, honest version of it:
//   • each frame carries the power in 8 octave bands (40 Hz – 12 kHz);
//   • an onset is a fast rise in any band; its feature is how much each band rose;
//   • a short per-player calibration (kick, snare, a tom, the hi-hat — 4 hits each) gives each drum's band template;
//   • each onset is split into those templates (non-negative least squares over 2–4 templates), so a kick + hat or a
//     snare + hat on the same 8th come out as two hits; the coefficient is the drum's strength (velocity);
//   • a drum close to the presence threshold, an onset the templates explain badly, or a snare / tom split → the hit is
//     marked UNSURE. Unsure hits never count as the wrong drum, and a take with too many of them is not counted at all
//     (never a fail, never a pass): only measured practice counts.
// Ride and crash count as the hat (one "cymbal" class); which tom is not measured. Only the levels listed in
// ACOUSTIC_LEVELS (2–4 voices, no open hat, no hi-hat foot, ghost notes only where they sound alone) are offered.
// Pure: the capture (pitchCapture.ts) hands in the band powers, the screens run the calibration.

import type { Drill } from './drills/types';
import type { DrumFamilyDef } from './drills/drums';
import type { DrumTakeHit } from './drills/drumAnalyze';
import type { AcousticCal, AcousticVoice } from './drumKit';

/** Octave band edges (Hz): kick 40–160, toms / snare body 80–640, snare wires 1.3–5 kHz, hat / cymbals 2.5–12 kHz. */
export const BAND_EDGES = [40, 80, 160, 320, 640, 1280, 2560, 5120, 12000];
export const N_BANDS = BAND_EDGES.length - 1;

const bandBins = (b: number, binHz: number, n: number): [number, number] => {
  const lo = Math.max(1, Math.ceil(BAND_EDGES[b] / binHz));
  const hi = Math.min(n - 1, Math.max(lo, Math.floor(BAND_EDGES[b + 1] / binHz)));
  return [lo, hi];
};

/** Band powers from an AnalyserNode's dB spectrum (getFloatFrequencyData). */
export function bandPowersFromDb(db: ArrayLike<number>, sampleRate: number, fftSize: number): number[] {
  const binHz = sampleRate / fftSize;
  return Array.from({ length: N_BANDS }, (_, b) => {
    const [lo, hi] = bandBins(b, binHz, db.length);
    let s = 0;
    for (let k = lo; k <= hi; k++) {
      const v = db[k];
      if (Number.isFinite(v)) s += 10 ** (v / 10);
    }
    return s;
  });
}

/** In-place radix-2 FFT (n a power of two). */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ar = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const ai = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
      }
    }
  }
}

/** Band powers of a block of samples (Hann window; length a power of two) — the same bands, for tests and offline use. */
export function bandPowers(samples: ArrayLike<number>, sampleRate: number): number[] {
  const n = samples.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = samples[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  fft(re, im);
  const half = n / 2;
  const binHz = sampleRate / n;
  return Array.from({ length: N_BANDS }, (_, b) => {
    const [lo, hi] = bandBins(b, binHz, half);
    let s = 0;
    for (let k = lo; k <= hi; k++) s += (re[k] * re[k] + im[k] * im[k]) / (n * n);
    return s;
  });
}

// ───────────────────────────── onsets ─────────────────────────────

export interface AFrame {
  /** ms */
  t: number;
  bands?: number[];
}
export interface AOnset {
  t: number;
  /** How much each band rose over the frames before (power). */
  x: number[];
}

/**
 * Streaming onset detector on band powers. The onset strength is the summed rise over the bands, each in log power
 * against the middle of the last three frames (less 2 dB), with the band's floor (its 20th percentile over the last ~3 s) added on
 * both sides, and each band's share capped (5 dB for 40–80 Hz, 7.5 dB for 80–160 Hz — one to three FFT bins, whose
 * noise jumps ×10 in silence — and 10 dB above): so the low bands' noise never fires alone, while a real stroke rises
 * in several bands (a hat over a ringing snare still rises ~8 dB in the top three). Fires at ≥ `threshold` (log10
 * units), at most once per `refractoryMs` and only after the strength fell back under half of it (the frames right
 * after an attack still rise over the frame before it). The feature is each band's peak over the onset frame and the
 * next two (the window catches the attack late, a kick's body comes after its click), minus the frames before: so an
 * onset is returned two frames after it happened; `flush` ends a take.
 */
const RISE_CAP = [0.5, 0.75, 1, 1, 1, 1, 1, 1];
/** Each band's first 2 dB of rise is ignored (noise wobble summed over eight bands). */
const DEAD = 0.2;
export class OnsetTracker {
  private hist: number[][] = [];
  private last = -Infinity;
  private armed = true;
  /** The strength of the last frame (for tests / tuning). */
  lastRise = 0;
  /** The previous frame: its time and strength (an attack late in its window shows there first, partly). */
  private prev: { t: number; rise: number } | null = null;
  private pending: { t: number; peak: number[]; base: number[]; n: number } | null = null;
  constructor(
    private threshold = 1.25,
    private refractoryMs = 35,
  ) {}
  push(f: AFrame): AOnset | null {
    const bands = f.bands;
    if (!bands || bands.length !== N_BANDS) return null;
    let out: AOnset | null = null;
    let fired = false;
    if (this.hist.length >= 3) {
      const prev = this.hist.slice(-3);
      const typ = this.typical();
      // The middle of the last three frames (the lowest one is biased low in noise); while a band is still ringing from a
      // stroke (well over its usual level and falling), the newest frame — a hat 150 ms after a snare rises over the
      // snare's tail, not over the louder frames before it.
      const base = bands.map((_, b) => {
        const mid = prev.map((h) => h[b]).sort((x, y) => x - y)[1];
        const l = prev[2][b];
        const p = prev[1][b];
        return l > 4 * typ[b] && p > l ? Math.min(mid, l) : mid;
      });
      let rise = 0;
      for (let b = 0; b < N_BANDS; b++) rise += Math.min(RISE_CAP[b], Math.max(0, Math.log10((bands[b] + typ[b]) / (base[b] + typ[b])) - DEAD));
      if (rise < this.threshold / 2) this.armed = true;
      if (this.armed && rise >= this.threshold && f.t - this.last > this.refractoryMs) {
        // The stroke began in the frame before when that frame already rose clearly (a third of the threshold).
        const p = this.prev;
        const t = p && p.rise >= this.threshold / 3 && p.t - this.last > this.refractoryMs ? p.t : f.t;
        this.armed = false;
        this.last = f.t;
        fired = true;
        out = this.flush();
        this.pending = { t, peak: [...bands], base, n: 1 };
      }
      this.prev = { t: f.t, rise };
      this.lastRise = rise;
    }
    if (!fired && this.pending) {
      const p = this.pending;
      p.peak = p.peak.map((x, b) => Math.max(x, bands[b]));
      if (++p.n >= 3) out = this.flush();
    }
    this.hist.push(bands);
    if (this.hist.length > 120) this.hist.shift();
    return out;
  }
  flush(): AOnset | null {
    const p = this.pending;
    this.pending = null;
    return p ? { t: p.t, x: p.peak.map((c, b) => Math.max(0, c - p.base[b])) } : null;
  }
  /** Each band's 20th percentile over the last ~3 s (its level between strokes, even in a dense 16th pattern). */
  private typical(): number[] {
    return Array.from({ length: N_BANDS }, (_, b) => {
      const s = this.hist.map((h) => h[b]).sort((x, y) => x - y);
      return (s[Math.floor(s.length * 0.2)] ?? 0) + 1e-20;
    });
  }
}

/** All onsets of a take's frames. */
export function acousticOnsets(frames: AFrame[], threshold = 1.25, refractoryMs = 35): AOnset[] {
  const tr = new OnsetTracker(threshold, refractoryMs);
  const out: AOnset[] = [];
  for (const f of frames) {
    const o = tr.push(f);
    if (o) out.push(o);
  }
  const o = tr.flush();
  if (o) out.push(o);
  return out;
}

// ───────────────────────────── classification ─────────────────────────────

export const ACOUSTIC_VOICES: AcousticVoice[] = ['kick', 'snare', 'tom', 'hat'];
export interface AHit {
  voice: AcousticVoice;
  /** Strength relative to the calibration hit (power ratio; 1 = as calibrated). */
  a: number;
  sure: boolean;
}
/** Presence: ≥ 8 % of the onset's strongest drum (−11 dB) and above an absolute floor (−23 dB under the calibration). */
const REL = 0.08;
const ABS = 0.005;
/** Above this share of the onset unexplained by the templates, nothing in it is sure. */
export const MAX_RESIDUAL = 0.35;

/** Gaussian elimination for a small system; null when singular. */
function solve(A: number[][], y: number[]): number[] | null {
  const n = y.length;
  const M = A.map((r, i) => [...r, y[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/**
 * Split one onset into the calibrated drums: the non-negative least-squares mix of the templates (every subset tried —
 * at most 4 templates), each band weighted so the loudest template there counts 1. Returns the drums present (strongest
 * first) and the relative residual.
 */
export function classifyOnset(x: number[], cal: AcousticCal): { hits: AHit[]; residual: number } {
  const vs = ACOUSTIC_VOICES.filter((v) => cal.tpl[v]?.length === N_BANDS);
  const T = vs.map((v) => cal.tpl[v]!);
  // Band weights: the loudest template there counts 1 — floored at 5 % of the weakest template's own peak, so bands
  // where no drum has much energy (a kick's click in the mids) can't dominate the fit.
  const floor = 0.05 * Math.min(...T.map((t) => Math.max(...t)));
  const w2 = x.map((_, b) => {
    const m = Math.max(1e-30, floor, ...T.map((t) => t[b]));
    return 1 / (m * m);
  });
  const norm = Math.sqrt(x.reduce((s, xb, b) => s + w2[b] * xb * xb, 0));
  if (!vs.length || norm <= 0) return { hits: [], residual: 1 };
  let best: { a: number[]; r: number } = { a: vs.map(() => 0), r: norm };
  for (let mask = 1; mask < 1 << vs.length; mask++) {
    const idx = vs.map((_, i) => i).filter((i) => mask & (1 << i));
    const A = idx.map((i) => idx.map((j) => T[i].reduce((s, ti, b) => s + w2[b] * ti * T[j][b], 0)));
    const y = idx.map((i) => T[i].reduce((s, ti, b) => s + w2[b] * ti * x[b], 0));
    const c = solve(A, y);
    if (!c || c.some((v) => v < 0)) continue;
    const a = vs.map(() => 0);
    idx.forEach((i, k) => (a[i] = c[k]));
    const r = Math.sqrt(x.reduce((s, xb, b) => s + w2[b] * (xb - a.reduce((q, ai, i) => q + ai * T[i][b], 0)) ** 2, 0));
    if (r < best.r - 1e-12) best = { a, r };
  }
  const residual = best.r / norm;
  const aMax = Math.max(...best.a);
  const thr = Math.max(ABS, REL * aMax);
  const hits: AHit[] = [];
  vs.forEach((v, i) => {
    const a = best.a[i];
    // A drum just under the threshold is reported as unsure (a kick masked by the snare), not as absent.
    if (a < 0.4 * thr) return;
    hits.push({ voice: v, a, sure: a >= 2 * thr && residual <= MAX_RESIDUAL });
  });
  // Snare and tom split one hit between them: which one is not known.
  const s = hits.find((h) => h.voice === 'snare');
  const t = hits.find((h) => h.voice === 'tom');
  if (s && t && Math.min(s.a, t.a) / Math.max(s.a, t.a) >= 0.5) s.sure = t.sure = false;
  return { hits: hits.sort((p, q) => q.a - p.a), residual };
}

/** The drill voice an acoustic drum is reported as (the analysis compares classes: hat ≈ ride ≈ crash, any tom). */
const AS_VOICE = { kick: 'kick', snare: 'snare', tom: 'tom1', hat: 'hihat' } as const;
/** Velocity 1–127 from the strength: the calibration hit = 80 (amplitude, not power). */
export const velOfStrength = (a: number): number => Math.max(1, Math.min(127, Math.round(80 * Math.sqrt(a))));

/** The acoustic drums a drill uses (its notes' classes); toms fall back to the snare without a tom template. */
export function drillAcousticVoices(d: Pick<Drill, 'notes'>, cal: AcousticCal): AcousticVoice[] {
  const out = new Set<AcousticVoice>();
  for (const n of d.notes) {
    const v = n.voice;
    if (!v) continue;
    if (v === 'kick') out.add('kick');
    else if (v === 'snare' || v === 'rim') out.add('snare');
    else if (v === 'tom1' || v === 'tom2' || v === 'tom3') out.add(cal.tpl.tom ? 'tom' : 'snare');
    else if (v !== 'hhPedal') out.add('hat');
  }
  return ACOUSTIC_VOICES.filter((v) => out.has(v));
}
/** A take's onsets → hits for analyzeDrumTake (acoustic mode), one per drum heard, unsure ones flagged. */
export function acousticHits(onsets: AOnset[], cal: AcousticCal, only?: AcousticVoice[]): DrumTakeHit[] {
  // Score-informed: only the drums the drill uses (a tom template can't steal a kick in a groove without toms).
  const c: AcousticCal = only ? { tpl: Object.fromEntries(Object.entries(cal.tpl).filter(([v]) => only.includes(v as AcousticVoice))) } : cal;
  const out: DrumTakeHit[] = [];
  for (const o of onsets) for (const h of classifyOnset(o.x, c).hits) out.push({ voice: AS_VOICE[h.voice], on: o.t, vel: velOfStrength(h.a), ...(h.sure ? {} : { unsure: true }) });
  return out;
}

// ───────────────────────────── calibration ─────────────────────────────

/** Hits asked per drum in the calibration. */
export const CAL_HITS = 4;
/** The calibration order; the tom can be skipped (then toms count as the snare). */
export const CAL_ORDER: { voice: AcousticVoice; optional?: boolean; prompt: { en: string; he: string } }[] = [
  { voice: 'kick', prompt: { en: 'Kick, 4 times', he: 'בס־תוף, 4 פעמים' } },
  { voice: 'snare', prompt: { en: 'Snare, 4 times', he: 'סנר, 4 פעמים' } },
  { voice: 'tom', optional: true, prompt: { en: 'One tom, 4 times', he: 'טום אחד, 4 פעמים' } },
  { voice: 'hat', prompt: { en: 'Hi-hat closed, 4 times', he: 'היי־האט סגור, 4 פעמים' } },
];

/** A drum's template: the per-band median of its calibration onsets (null with fewer than 3). */
export function templateOf(xs: number[][]): number[] | null {
  if (xs.length < 3) return null;
  return Array.from({ length: N_BANDS }, (_, b) => {
    const s = xs.map((x) => x[b]).sort((p, q) => p - q);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  });
}

const cosine = (p: number[], q: number[]): number => {
  // On log power: the shape of the spectrum, not the loudest band.
  const lp = p.map((v) => Math.log10(v + 1e-20));
  const lq = q.map((v) => Math.log10(v + 1e-20));
  const mp = lp.reduce((s, v) => s + v, 0) / lp.length;
  const mq = lq.reduce((s, v) => s + v, 0) / lq.length;
  let d = 0;
  let np = 0;
  let nq = 0;
  for (let i = 0; i < lp.length; i++) {
    d += (lp[i] - mp) * (lq[i] - mq);
    np += (lp[i] - mp) ** 2;
    nq += (lq[i] - mq) ** 2;
  }
  return np && nq ? d / Math.sqrt(np * nq) : 1;
};

/**
 * Build and check a calibration: each drum's template, then every calibration hit classified again — the strongest drum
 * must be the one asked for. A tom that sounds like the snare is dropped (toms then count as the snare). Not ok when
 * fewer than 80 % come out right, or kick / snare / hat are not told apart.
 */
export function buildCal(samples: Partial<Record<AcousticVoice, number[][]>>): { cal: AcousticCal; ok: boolean; acc: number; droppedTom: boolean } {
  const tpl: AcousticCal['tpl'] = {};
  for (const v of ACOUSTIC_VOICES) {
    const t = templateOf(samples[v] ?? []);
    if (t) tpl[v] = t;
  }
  let droppedTom = false;
  if (tpl.tom && tpl.snare && cosine(tpl.tom, tpl.snare) > 0.97) {
    delete tpl.tom;
    droppedTom = true;
  }
  const cal: AcousticCal = { tpl };
  let n = 0;
  let right = 0;
  for (const v of ACOUSTIC_VOICES) {
    if (!tpl[v]) continue;
    for (const x of samples[v] ?? []) {
      n++;
      if (classifyOnset(x, cal).hits[0]?.voice === v) right++;
    }
  }
  const acc = n ? right / n : 0;
  return { cal, ok: !!(tpl.kick && tpl.snare && tpl.hat) && acc >= 0.8, acc, droppedTom };
}

// ───────────────────────────── which levels ─────────────────────────────

/**
 * Levels an acoustic kit by microphone can play and be measured on, besides every single-surface level: 2–4 voices
 * from kick / snare / toms / hat-ride-crash; no open-hat articulation, no hi-hat foot; ghost notes only where they sound
 * alone (between the hat strokes, or with no hat). Left out: rock 3 and 6 (open hat), funk 4 and the double shuffle
 * (ghosts under the hat), the feet levels 1–2 (hi-hat foot), kit reading (open hat items); flams and drags (two hits
 * within 15–40 ms merge into one onset: MIDI only); jazz (swing ride with the hi-hat foot, cross-stick) and Latin
 * (cross-stick clave, bell, hi-hat foot) — a cross-stick is not a snare to the microphone; the drummer's ear L6 (open
 * hat) and L7 (style by ear: foot, cross-stick). Middle-Eastern L1–9 are dum (kick / floor tom), tak (snare), ka (a
 * soft snare between) and at most a hi-hat: all in. New families are left out until checked.
 */
export const ACOUSTIC_LEVELS = new Set([
  'd-rock-1', 'd-rock-2', 'd-rock-4', 'd-rock-5', 'd-rock-7', 'd-rock-8',
  'd-fills-1', 'd-fills-2', 'd-fills-3',
  'd-funk-2', 'd-funk-3',
  'd-shuffle-1', 'd-shuffle-2', 'd-shuffle-3',
  'd-indep-1', 'd-indep-2', 'd-indep-3', 'd-indep-4',
  'd-mideast-1', 'd-mideast-2', 'd-mideast-3', 'd-mideast-4', 'd-mideast-5', 'd-mideast-6', 'd-mideast-7', 'd-mideast-8', 'd-mideast-9',
  'd-feet-3',
  'd-ear-4', 'd-ear-5', 'd-ear-8',
]);
/** A drum drill's level id (`d-rock-2`). */
export const drumLevelId = (d: Pick<Drill, 'spec'>): string => `${d.spec.family}-${Number(String(d.spec.kind).split(':')[0]) || 1}`;
/** Can an acoustic kit play this drill by microphone (a grooves level from the list)? */
export const acousticOk = (d: Pick<Drill, 'spec'> & { drum?: Drill['drum'] }): boolean => ACOUSTIC_LEVELS.has(drumLevelId(d)) || !!d.drum?.acousticOk;

/** The levels a setup offers: MIDI all; a practice pad the single-surface ones; an acoustic kit those + ACOUSTIC_LEVELS. */
export function kitLevels(fams: DrumFamilyDef[], drumMic: boolean | 'pad' | 'acoustic' | undefined): DrumFamilyDef[] {
  if (!drumMic) return fams;
  const ok = (id: string, mic: boolean) => mic || (drumMic === 'acoustic' && ACOUSTIC_LEVELS.has(id));
  return fams.map((f) => ({ ...f, levels: f.levels.filter((l) => ok(l.id, l.mic)) })).filter((f) => f.levels.length > 0);
}
/** Level ids a setup leaves out of the path. */
export function kitHiddenLevels(fams: DrumFamilyDef[], drumMic: boolean | 'pad' | 'acoustic' | undefined): string[] {
  if (!drumMic) return [];
  return fams.flatMap((f) => f.levels.filter((l) => !l.mic && !(drumMic === 'acoustic' && ACOUSTIC_LEVELS.has(l.id))).map((l) => l.id));
}

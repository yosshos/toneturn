// Peak Hunter: hear a sound with one band boosted (B) next to the flat sound (A) and find the boosted frequency on a
// log slider. Pure: rounds come from a seed, so a saved game resumes on the same sounds. The audio is described with
// FxSpec (engine/fx.ts) and rendered by audio/fx.ts; B is loudness-matched to the dry chain (R1), so the boost is
// heard as colour, never as level.

import { fxSpec, needsHeadphones, type FxFilter, type FxSource, type FxSpec } from './fx';

export type PeakLevel = 1 | 2 | 3;
export const PEAK_LEVELS: readonly PeakLevel[] = [1, 2, 3];
export const PEAK_ROUNDS = 10;
/** Points for a round inside the full-credit zone. */
export const PEAK_MAX_POINTS = 100;
/** Full points within this distance (octaves)… */
export const FULL_OCT = 1 / 6;
/** …falling linearly to 0 at this distance. */
export const ZERO_OCT = 1;

/** The slider's span (log scale). */
export const SLIDER_MIN_HZ = 100;
export const SLIDER_MAX_HZ = 10_000;
/** Where boosts can land. */
export const PEAK_MIN_HZ = 125;
export const PEAK_MAX_HZ = 8000;

/** ISO octave centres, 125 Hz – 8 kHz (level 1). */
export const OCTAVE_BANDS = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
/** ISO third-octave centres, 125 Hz – 8 kHz (level 2). */
export const THIRD_BANDS = [125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000] as const;

/** Seconds of source per sound (loops: two bars at the round's tempo). */
const SRC_SEC: Record<'pink' | 'loop' | 'drums', number> = { pink: 2.2, loop: 4, drums: 4 };

export interface PeakRound {
  level: PeakLevel;
  source: 'pink' | 'loop' | 'drums';
  /** Seed of the source (noise / loop pattern). */
  seed: number;
  bpm?: number;
  /** The boosted centre frequency (Hz). */
  freq: number;
  /** Boost in dB. */
  gain: number;
  q: number;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rnd: () => number, list: readonly T[]): T => list[Math.floor(rnd() * list.length)];

/** Allowed answers on this level (null = free slider). */
export const bandsOf = (level: PeakLevel): readonly number[] | null => (level === 1 ? OCTAVE_BANDS : level === 2 ? THIRD_BANDS : null);

/** The ten rounds of a game. Consecutive rounds never repeat a band (and free rounds sit ≥ ½ octave apart). */
export function makeRounds(seed: number, level: PeakLevel, n = PEAK_ROUNDS): PeakRound[] {
  const rnd = rng(seed);
  const out: PeakRound[] = [];
  const bands = bandsOf(level);
  for (let i = 0; i < n; i++) {
    const prev = out[i - 1]?.freq;
    let freq = 0;
    for (let k = 0; k < 20; k++) {
      freq = bands ? pick(rnd, bands) : Math.round(PEAK_MIN_HZ * 2 ** (rnd() * Math.log2(PEAK_MAX_HZ / PEAK_MIN_HZ)));
      if (prev === undefined || (bands ? freq !== prev : octavesBetween(freq, prev) >= 0.5)) break;
    }
    const source: PeakRound['source'] = level === 3 ? 'loop' : level === 2 ? pick(rnd, ['pink', 'loop', 'drums'] as const) : pick(rnd, ['pink', 'pink', 'drums'] as const);
    const r: PeakRound = {
      level,
      source,
      seed: Math.floor(rnd() * 2 ** 31),
      freq,
      gain: level === 3 ? 6 : level === 2 ? pick(rnd, [9, 12]) : 12,
      q: level === 1 ? 1.4 : level === 2 ? 2.5 : 1.8,
    };
    if (source !== 'pink') r.bpm = 96 + Math.floor(rnd() * 5) * 6;
    out.push(r);
  }
  return out;
}

const srcSec = (r: PeakRound) => (r.bpm ? Math.round(((8 * 60) / r.bpm) * 100) / 100 : SRC_SEC[r.source]);
const base = (r: PeakRound) => ({ source: r.source as FxSource, seed: r.seed, ...(r.bpm ? { bpm: r.bpm } : {}) });

/** The boost of a round. */
export const peakFilter = (r: PeakRound): FxFilter => ({ type: 'peaking', freq: r.freq, gain: r.gain, q: r.q });

/** A: the flat sound. */
export function flatSpec(r: PeakRound): FxSpec {
  return fxSpec({ ...base(r), src: srcSec(r), chain: {}, matchTo: {} });
}

/** B: the boosted sound, loudness-matched to A (R1). */
export function boostSpec(r: PeakRound): FxSpec {
  return fxSpec({ ...base(r), src: srcSec(r), chain: { eq: [peakFilter(r)] }, matchTo: {} });
}

/** The round's energy sits below 300 Hz (phone speakers can't play it): ask for headphones. */
export const roundNeedsHeadphones = (r: PeakRound): boolean => needsHeadphones(boostSpec(r));

// ------------------------------------------------------------------ slider + scoring

const LOG_SPAN = Math.log2(SLIDER_MAX_HZ / SLIDER_MIN_HZ);
/** Slider position 0…1 (left = low) of a frequency. */
export const posOf = (hz: number): number => Math.min(1, Math.max(0, Math.log2(hz / SLIDER_MIN_HZ) / LOG_SPAN));
/** Frequency at slider position 0…1. */
export const hzAt = (pos: number): number => SLIDER_MIN_HZ * 2 ** (Math.min(1, Math.max(0, pos)) * LOG_SPAN);

/** Snap a frequency to the level's grid (free level: 3 significant figures, inside the boost range). */
export function snapHz(hz: number, level: PeakLevel): number {
  const bands = bandsOf(level);
  if (!bands) {
    const c = Math.min(PEAK_MAX_HZ, Math.max(PEAK_MIN_HZ, hz));
    const p = 10 ** (Math.floor(Math.log10(c)) - 2);
    return Math.round(c / p) * p;
  }
  let best = bands[0];
  for (const b of bands) if (octavesBetween(b, hz) < octavesBetween(best, hz)) best = b;
  return best;
}

/** Step to the neighbouring band (keyboard on snapped levels); free level moves 1/12 octave. */
export function stepHz(hz: number, level: PeakLevel, dir: 1 | -1, big = false): number {
  const bands = bandsOf(level);
  if (!bands) return snapHz(hz * 2 ** ((dir * (big ? 1 : 1 / 12)) as number), level);
  const i = bands.indexOf(snapHz(hz, level));
  const j = Math.min(bands.length - 1, Math.max(0, i + dir * (big ? 3 : 1)));
  return bands[j];
}

export const octavesBetween = (a: number, b: number): number => Math.abs(Math.log2(a / b));

/** Points for a guess: 100 within ⅙ octave, linear to 0 at 1 octave. */
export function pointsFor(guessHz: number, trueHz: number): number {
  const d = octavesBetween(guessHz, trueHz);
  if (d <= FULL_OCT) return PEAK_MAX_POINTS;
  if (d >= ZERO_OCT) return 0;
  return Math.round(PEAK_MAX_POINTS * (1 - (d - FULL_OCT) / (ZERO_OCT - FULL_OCT)));
}

/** "125 Hz" / "1.25 kHz". */
export function formatHz(hz: number): string {
  if (hz >= 1000) {
    const k = hz / 1000;
    return `${Number.isInteger(k) ? k : Number(k.toFixed(k >= 10 ? 1 : 2))} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}

// ------------------------------------------------------------------ game state (saved after each round)

export interface PeakAnswer {
  guess: number;
  points: number;
  octaves: number;
}

export interface PeakSave {
  v: 1;
  kind: 'peakhunter';
  seed: number;
  level: PeakLevel;
  answers: PeakAnswer[];
}

export function isPeakSave(x: unknown): x is PeakSave {
  const s = x as PeakSave | null;
  return (
    !!s &&
    typeof s === 'object' &&
    s.v === 1 &&
    s.kind === 'peakhunter' &&
    typeof s.seed === 'number' &&
    PEAK_LEVELS.includes(s.level) &&
    Array.isArray(s.answers) &&
    s.answers.length < PEAK_ROUNDS &&
    s.answers.every((a) => a && typeof a.guess === 'number' && typeof a.points === 'number' && typeof a.octaves === 'number')
  );
}

export const newSave = (seed: number, level: PeakLevel): PeakSave => ({ v: 1, kind: 'peakhunter', seed, level, answers: [] });

/** Record the guess for the current round. */
export function answer(save: PeakSave, rounds: readonly PeakRound[], guessHz: number): { save: PeakSave; result: PeakAnswer } {
  const r = rounds[save.answers.length];
  const g = snapHz(guessHz, save.level);
  const result: PeakAnswer = { guess: g, points: pointsFor(g, r.freq), octaves: Math.round(octavesBetween(g, r.freq) * 1000) / 1000 };
  return { save: { ...save, answers: [...save.answers, result] }, result };
}

export const totalOf = (answers: readonly PeakAnswer[]): number => answers.reduce((s, a) => s + a.points, 0);
export const meanOctavesOf = (answers: readonly PeakAnswer[]): number =>
  answers.length ? Math.round((answers.reduce((s, a) => s + a.octaves, 0) / answers.length) * 1000) / 1000 : 0;

export const isBest = (score: number, best: number | undefined): boolean => score > 0 && score > (best ?? 0);

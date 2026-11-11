// Polyrhythm Lock (GAMES_TIERS_PLAN §4, 0.70): two lanes, two hands. The slow pulse goes to the left hand, the fast one
// to the right (a "swap" round trades them half-way). A run is two rounds of 8 bars; each round is graded per hand:
// the share of written onsets hit inside the window, minus half a hit per stray tap. Accuracy = the mean of the hands.
// Pure: patterns, windows, grading, the run state.

import type { DynName } from './courseSocial';

export type Lane = 'L' | 'R';
export interface PolyRound {
  /** Fast : slow (3:2 = three in the right hand against two in the left). */
  fast: number;
  slow: number;
  /** The hands trade lanes from this bar on (f tier). */
  swapAt?: number;
  /** A drum groove under it (ff tier). */
  groove?: boolean;
}
export interface PolyOnset {
  lane: Lane;
  /** Quarter beats from the first bar's 1. */
  beat: number;
}
export const POLY_BARS = 8;
/** Bars in which both voices still sound (the guide); after that only the bar's 1 clicks. */
export const GUIDE_BARS = 2;

/** The rounds of each level (1 = mp … 4 = ff). */
export const POLY_LEVELS: PolyRound[][] = [
  [{ fast: 2, slow: 1 }, { fast: 3, slow: 2 }],
  [{ fast: 3, slow: 2 }, { fast: 4, slow: 3 }],
  [{ fast: 3, slow: 2, swapAt: 4 }, { fast: 5, slow: 4 }],
  [{ fast: 7, slow: 4, groove: true }, { fast: 3, slow: 2, groove: true }],
];
export const polyRounds = (level: number): PolyRound[] => POLY_LEVELS[Math.max(1, Math.min(4, level)) - 1];

/** Quarter beats per bar: the slow pulse falls on the beats (at least two beats a bar, so 2:1 is not a blur). */
export const barBeatsOf = (r: PolyRound) => Math.max(2, r.slow);

/** Every written onset of a round, in time order. */
export function polyPattern(r: PolyRound, bars = POLY_BARS): PolyOnset[] {
  const bb = barBeatsOf(r);
  const out: PolyOnset[] = [];
  for (let b = 0; b < bars; b++) {
    const swapped = r.swapAt !== undefined && b >= r.swapAt;
    const fastLane: Lane = swapped ? 'L' : 'R';
    const slowLane: Lane = swapped ? 'R' : 'L';
    for (let i = 0; i < r.fast; i++) out.push({ lane: fastLane, beat: b * bb + (i * bb) / r.fast });
    for (let i = 0; i < r.slow; i++) out.push({ lane: slowLane, beat: b * bb + (i * bb) / r.slow });
  }
  return out.sort((a, b) => a.beat - b.beat || (a.lane < b.lane ? -1 : 1));
}

/** The hit window (± ms): a quarter of the shortest gap in a lane, 40–90 ms. */
export function polyWindow(r: PolyRound, bpm: number): number {
  const beatMs = 60000 / bpm;
  const fastGap = (barBeatsOf(r) / Math.max(r.fast, r.slow)) * beatMs;
  return Math.round(Math.max(40, Math.min(90, fastGap * 0.25)));
}

export interface PolyTap {
  lane: Lane;
  /** ms from the first bar's 1, latency already removed. */
  ms: number;
}
export interface LaneGrade {
  hits: number;
  total: number;
  extra: number;
  /** Signed offsets of the hits (+ = late). */
  offsets: number[];
  /** 0..1 */
  score: number;
}
export interface PolyGrade {
  L: LaneGrade;
  R: LaneGrade;
  /** 0..100 */
  accuracy: number;
}

/** Grade the taps of a round: each written onset takes the nearest free tap of its lane inside the window. */
export function gradePoly(pattern: PolyOnset[], taps: PolyTap[], bpm: number, windowMs: number): PolyGrade {
  const beatMs = 60000 / bpm;
  const lane = (l: Lane): LaneGrade => {
    const want = pattern.filter((p) => p.lane === l).map((p) => p.beat * beatMs);
    const got = taps.filter((t) => t.lane === l).map((t) => t.ms);
    const used = new Set<number>();
    const offsets: number[] = [];
    for (const w of want) {
      let best = -1;
      let bestD = Infinity;
      got.forEach((g, i) => {
        const d = Math.abs(g - w);
        if (!used.has(i) && d <= windowMs && d < bestD) {
          best = i;
          bestD = d;
        }
      });
      if (best >= 0) {
        used.add(best);
        offsets.push(Math.round(got[best] - w));
      }
    }
    const hits = offsets.length;
    const extra = got.length - used.size;
    const total = want.length;
    return { hits, total, extra, offsets, score: total ? Math.max(0, (hits - 0.5 * extra) / total) : 0 };
  };
  const L = lane('L');
  const R = lane('R');
  return { L, R, accuracy: Math.round(((L.score + R.score) / 2) * 100) };
}

export interface PolyBacking {
  /** Count-in + clicks (seconds from the timeline start). */
  clicks: { t: number; accent: boolean; count?: boolean }[];
  /** Guide hits: kick = the left lane, snare = the right lane (drum timeline `wood` + `drums`). */
  wood: number[];
  drums: ('k' | 's')[];
  /** Groove hats (ff) as perc events. */
  hats: number[];
  responseAt: number;
  responseEnd: number;
}

/** One bar of count-in (clicks on the beats), the guide (both voices) for GUIDE_BARS, the bar's 1 to the end. */
export function polyBacking(r: PolyRound, bpm: number, bars = POLY_BARS): PolyBacking {
  const beat = 60 / bpm;
  const bb = barBeatsOf(r);
  const clicks: PolyBacking['clicks'] = [];
  for (let i = 0; i < bb; i++) clicks.push({ t: i * beat, accent: i === 0, count: true });
  const responseAt = bb * beat;
  const wood: number[] = [];
  const drums: ('k' | 's')[] = [];
  const hats: number[] = [];
  for (const o of polyPattern(r, bars)) {
    const bar = Math.floor(o.beat / bb + 1e-9);
    if (bar < GUIDE_BARS) {
      wood.push(responseAt + o.beat * beat);
      drums.push(o.lane === 'L' ? 'k' : 's');
    }
  }
  for (let b = 0; b < bars; b++) {
    clicks.push({ t: responseAt + b * bb * beat, accent: true });
    if (r.groove) for (let e = 0; e < bb * 2; e++) hats.push(responseAt + (b * bb + e / 2) * beat);
  }
  return { clicks, wood, drums, hats, responseAt, responseEnd: responseAt + bars * bb * beat + 0.3 };
}

// ---------------------------------------------------------------- the run

export interface PolySave {
  v: 1;
  game: 'polylock';
  level: number;
  tier?: DynName;
  /** Scores of the finished rounds (0..100), and their per-hand hit shares. */
  rounds: { accuracy: number; hitsL: number; hitsR: number }[];
}
export const newPolySave = (level: number, tier?: DynName): PolySave => ({ v: 1, game: 'polylock', level: Math.max(1, Math.min(4, level)), ...(tier ? { tier } : {}), rounds: [] });
export function isPolySave(x: unknown): x is PolySave {
  const s = x as PolySave | null;
  return !!s && s.v === 1 && s.game === 'polylock' && typeof s.level === 'number' && Array.isArray(s.rounds) && s.rounds.length < polyRounds(s.level).length;
}
export const polyDone = (s: PolySave) => s.rounds.length >= polyRounds(s.level).length;

/** The run's result: mean accuracy; the score = accuracy × tier factor ×10 (a few hundred points). */
export function polyResult(s: PolySave, input: string) {
  const n = Math.max(1, s.rounds.length);
  const accuracy = Math.round(s.rounds.reduce((a, r) => a + r.accuracy, 0) / n);
  const hitsL = Math.round((s.rounds.reduce((a, r) => a + r.hitsL, 0) / n) * 100) / 100;
  const hitsR = Math.round((s.rounds.reduce((a, r) => a + r.hitsR, 0) / n) * 100) / 100;
  return { game: 'polylock' as const, score: accuracy * 10 * s.level, detail: { accuracy, hitsL, hitsR, input, level: s.level, rounds: s.rounds.length, ...(s.tier ? { tier: s.tier } : {}) } };
}

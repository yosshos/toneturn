// Time with the click (spec AE §4.6, §10): click patterns, tempo-from-memory timelines and grading,
// multi-lane (drum kit / two hands) grading, steady-beat grading for sight-tap. Pure: no browser APIs.
// Taps are in ms from the response start and are expected to be latency-corrected already (R8: the caller
// subtracts settings.tapLatencyMs before grading, as for every rhythm-read item).

import type { ClickPattern } from './lesson';
import { gradeReading, onsetBeats, type Rhythm, type RhythmLevel } from './rhythm';

export interface Click {
  t: number;
  accent: boolean;
}

/** Small seeded generator (mulberry32), local so this module stays dependency-light. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which bars of a random-gaps passage have the click (true = on). Deterministic from the seed.
 * The first two bars are always on (to set the tempo); a gap is 1–2 bars; between gaps at least one bar is on.
 */
export function gapBars(seed: number, bars: number): boolean[] {
  const rnd = prng(seed ^ 0x6a9c);
  const out: boolean[] = [];
  const push = (v: boolean, n: number) => {
    for (let i = 0; i < n && out.length < bars; i++) out.push(v);
  };
  push(true, 2);
  while (out.length < bars) {
    push(false, 1 + Math.floor(rnd() * 2));
    push(true, 1 + Math.floor(rnd() * 2));
  }
  return out;
}

/**
 * Apply a click pattern to the clicks of a reading timeline (`readTimeline(...).clicks`). The first `countIn`
 * clicks are the count-in and always stay; the rest are the passage pulses, `perBar` to a bar.
 */
export function applyClicks(clicks: { t: number; accent: boolean }[], pattern: ClickPattern, perBar: number, countIn: number): { t: number; accent: boolean }[] {
  const head = clicks.slice(0, countIn).map((c) => ({ t: c.t, accent: c.accent }));
  const body = clicks.slice(countIn);
  const per = Math.max(1, Math.round(perBar));
  const pulse = clicks.length >= 2 ? clicks[1].t - clicks[0].t : 0;
  const bars = Math.ceil(body.length / per);
  const randomOn = pattern.kind === 'random-gaps' ? gapBars(pattern.seed, bars) : null;
  const out: { t: number; accent: boolean }[] = [];
  body.forEach((c, j) => {
    const bar = Math.floor(j / per);
    const beat = j % per;
    switch (pattern.kind) {
      case 'beats':
        out.push({ t: c.t, accent: c.accent });
        break;
      case 'backbeat':
        // 2 and 4 (every other pulse, starting on the second).
        if (beat % 2 === 1) out.push({ t: c.t, accent: false });
        break;
      case 'one':
        if (beat === 0) out.push({ t: c.t, accent: true });
        break;
      case 'offbeat':
        out.push({ t: c.t + pulse / 2, accent: false });
        break;
      case 'every2':
        if (beat === 0 && bar % 2 === 0) out.push({ t: c.t, accent: true });
        break;
      case 'gaps': {
        const cycle = Math.max(1, pattern.on + pattern.off);
        if (bar % cycle < pattern.on) out.push({ t: c.t, accent: c.accent });
        break;
      }
      case 'random-gaps':
        if (randomOn![bar]) out.push({ t: c.t, accent: c.accent });
        break;
    }
  });
  return [...head, ...out];
}

/**
 * Timeline for "tap a tempo" (tempo-memory). Without `withClicks`: no reference at all — start when ready
 * (responseAt = 0, a generous window). With it: that many clicks (accent every 4), then silence to hold the tempo.
 */
export function tempoTimeline(goal: { bpm: number; beats: number; withClicks?: number }): { clicks: Click[]; wood: number[]; responseAt: number; responseEnd: number } {
  const beat = 60 / goal.bpm;
  const n = goal.withClicks ?? 0;
  const clicks = Array.from({ length: n }, (_, i) => ({ t: i * beat, accent: i % 4 === 0 }));
  if (!n) return { clicks, wood: [], responseAt: 0, responseEnd: goal.beats * beat * 1.6 + 4 };
  const responseAt = n * beat;
  return { clicks, wood: [], responseAt, responseEnd: responseAt + goal.beats * beat * 1.35 + 1.5 };
}

const median = (xs: number[]) => {
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Grade a tapped tempo: the median inter-tap interval gives the BPM; full credit at ≤ 3 % error, none at ≥ 15 %.
 * Steadiness from the spread of the intervals (coefficient of variation: ≤ 3 % = 1, ≥ 15 % = 0).
 * accuracy = 0.75 · tempo + 0.25 · steadiness; pass at ≥ 0.7. Fewer than 4 taps = nothing to grade.
 */
export function gradeTempo(tapsMs: number[], goal: { bpm: number; beats: number; withClicks?: number }): { accuracy: number; bpm: number; errPct: number; steadiness: number; pass: boolean } {
  const taps = tapsMs.slice().sort((a, b) => a - b);
  const iois = taps.slice(1).map((t, i) => t - taps[i]).filter((d) => d > 0);
  if (taps.length < 4 || iois.length < 3) return { accuracy: 0, bpm: 0, errPct: 100, steadiness: 0, pass: false };
  const med = median(iois);
  const bpm = 60000 / med;
  const errPct = (Math.abs(bpm - goal.bpm) / goal.bpm) * 100;
  const tempo = clamp01(1 - (errPct - 3) / 12);
  const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
  const sd = Math.sqrt(iois.reduce((a, b) => a + (b - mean) ** 2, 0) / iois.length);
  const cv = sd / mean;
  const steadiness = clamp01(1 - (cv - 0.03) / 0.12);
  const accuracy = 0.75 * tempo + 0.25 * steadiness;
  return { accuracy, bpm: Math.round(bpm * 10) / 10, errPct: Math.round(errPct * 10) / 10, steadiness, pass: accuracy >= 0.7 };
}

/**
 * Grade several lanes (drum kit, two hands): each lane is graded with gradeReading against the taps on that lane;
 * accuracy and precision are combined weighted by each lane's onsets. Passes when every lane passes. A lane with
 * no notes passes when it got no taps.
 */
export function gradeLanes(lanes: { rhythm: Rhythm }[], bpm: number, taps: { ms: number; lane: number }[], level: RhythmLevel): { pass: boolean; accuracy: number; precision: number; perLane: number[] } {
  let pass = true;
  let acc = 0;
  let prec = 0;
  let total = 0;
  const perLane: number[] = [];
  lanes.forEach((l, i) => {
    const mine = taps.filter((t) => t.lane === i).map((t) => t.ms);
    const n = onsetBeats(l.rhythm).length;
    if (!n) {
      const ok = mine.length === 0;
      pass = pass && ok;
      perLane.push(ok ? 1 : 0);
      return;
    }
    const g = gradeReading(l.rhythm, bpm, mine, level);
    pass = pass && g.pass;
    perLane.push(g.accuracy);
    acc += g.accuracy * n;
    prec += g.precision * n;
    total += n;
  });
  return { pass, accuracy: total ? acc / total : 0, precision: total ? prec / total : 0, perLane };
}

/**
 * How steady the tapped beat was (0..1) — sight-tap, where the voice is graded separately. Each interval is
 * read as a whole number of beats (a skipped tap counts as two beats, not as a slow one); its error against the
 * beat gives a score (≤ 2 % = 1, ≥ 14 % = 0). Double taps score 0. Fewer than 3 taps = 0.
 */
export function steadyBeat(tapsMs: number[], bpm: number): number {
  const taps = tapsMs.slice().sort((a, b) => a - b);
  if (taps.length < 3) return 0;
  const beat = 60000 / bpm;
  const scores = taps.slice(1).map((t, i) => {
    const d = t - taps[i];
    const k = Math.round(d / beat);
    if (k < 1) return 0;
    const err = Math.abs(d / k - beat) / beat;
    return clamp01(1 - (err - 0.02) / 0.12);
  });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

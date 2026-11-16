// Rebound Ball (drums, AUDIT-7 hole #14 / AUDIT-GAMES "Rebound Ball"): even strokes against the click — two bars of
// quarters, eighths, accents, doubles, sixteenths or a swell, on the snare or a practice pad. Every stroke must land
// in its window (the 75 % rule) and the strokes must be even: their loudness may spread only so much (a MIDI kit's
// velocity; the microphone's peak, with a wider tolerance). Accents must stand out, a swell must rise and fall. The
// screen draws each stroke as a bounce whose height is its loudness, so evenness is seen at once. Pure.

import { clampLevel, runBpm, type BCheck, type BLap, type BMatch, type BSave, type BTarget } from './beginnerRun';

export interface ReboundLevel {
  /** Strokes per beat. */
  sub: 1 | 2 | 4;
  sticking: 'R' | 'RL' | 'RRLL';
  /** Accent every beat's first stroke. */
  accents?: boolean;
  /** Crescendo over bar 1, diminuendo over bar 2. */
  swell?: boolean;
  bpm: number;
  /** Largest spread of loudness allowed (coefficient of variation) on MIDI. */
  cv: number;
}
export const REBOUND_LEVELS: Record<number, ReboundLevel> = {
  1: { sub: 1, sticking: 'R', bpm: 70, cv: 0.3 },
  2: { sub: 2, sticking: 'RL', bpm: 70, cv: 0.25 },
  3: { sub: 2, sticking: 'RL', accents: true, bpm: 76, cv: 0.25 },
  4: { sub: 2, sticking: 'RRLL', bpm: 80, cv: 0.22 },
  5: { sub: 4, sticking: 'RL', bpm: 72, cv: 0.22 },
  6: { sub: 2, sticking: 'RL', swell: true, bpm: 84, cv: 0.5 },
};
/** The microphone hears loudness roughly: its tolerances are this much wider. */
export const MIC_SLACK = 1.6;
/** An accent is at least this much louder than the taps (MIDI; the mic 1.15). */
export const ACCENT_RATIO = 1.25;
/** A swell follows the asked loudness at least this closely (correlation; the mic 0.4). */
export const SWELL_CORR = 0.6;
/** More stray strokes than this (flams, bounces) fail the lap. */
export const MAX_EXTRA = 2;

export function reboundLap(_seed: number, level: number, lap: number, s?: Pick<BSave, 'boost'>): BLap {
  const lv = clampLevel(level);
  const L = REBOUND_LEVELS[lv];
  const n = 8 * L.sub;
  const targets: BTarget[] = [];
  for (let i = 0; i < n; i++) {
    const hand = L.sticking === 'R' ? 'R' : L.sticking === 'RL' ? (i % 2 ? 'L' : 'R') : Math.floor(i / 2) % 2 ? 'L' : 'R';
    const t: BTarget = { beat: i / L.sub, label: hand };
    if (L.accents && i % L.sub === 0) t.accent = true;
    if (L.swell) {
      // 0.3 → 1 over bar 1, 1 → 0.3 over bar 2
      const half = n / 2;
      t.level = i < half ? 0.3 + (0.7 * i) / (half - 1) : 1 - (0.7 * (i - half)) / (half - 1);
    }
    targets.push(t);
  }
  return { game: 'rebound', level: lv, lap, bpm: runBpm(L.bpm, s ?? { boost: 0 }), key: null, beats: 8, targets, meter: 4 };
}

/** Every stroke in its window is right (any pad: the kick and the hi-hat pedal never reach here). */
export const reboundJudge = (): 'right' => 'right';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const cvOf = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  return m > 0 ? sd / m : 0;
};
function corr(a: number[], b: number[]): number {
  if (a.length < 3) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Evenness (0..100) from the spread of loudness: 100 = all alike, 0 = a spread of half the mean or more. */
export const evenness = (vels: number[]): number => Math.round(100 * Math.max(0, Math.min(1, 1 - cvOf(vels) / 0.5)));

/** The lap's own check: even strokes (or accents that stand out, or a swell that follows the curve), few strays. */
export function reboundCheck(lap: Pick<BLap, 'targets' | 'level'>, m: Pick<BMatch, 'marks' | 'got' | 'extra'>, input: 'mic' | 'midi'): BCheck {
  const L = REBOUND_LEVELS[clampLevel(lap.level)];
  const slack = input === 'mic' ? MIC_SLACK : 1;
  const hit = lap.targets.map((t, i) => ({ t, v: m.marks[i] === 'hit' ? (m.got[i]?.vel ?? null) : null })).filter((x): x is { t: BTarget; v: number } => x.v !== null);
  if (m.extra.length > MAX_EXTRA) return { ok: false, meter: 0, why: 'extra' };
  if (hit.length < 2) return { ok: false, meter: 0, why: 'few' };
  if (L.swell) {
    const c = corr(
      hit.map((x) => x.t.level ?? 1),
      hit.map((x) => x.v),
    );
    const need = input === 'mic' ? 0.4 : SWELL_CORR;
    return { ok: c >= need, meter: Math.round(100 * Math.max(0, c)), ...(c >= need ? {} : { why: 'swell' }) };
  }
  const taps = hit.filter((x) => !x.t.accent).map((x) => x.v);
  const even = evenness(taps);
  const okEven = cvOf(taps) <= L.cv * slack;
  if (L.accents) {
    const acc = hit.filter((x) => x.t.accent).map((x) => x.v);
    const ratio = mean(acc) / Math.max(1, mean(taps));
    const okAcc = acc.length > 0 && ratio >= (input === 'mic' ? 1.15 : ACCENT_RATIO);
    return { ok: okEven && okAcc, meter: even, ...(!okAcc ? { why: 'accent' } : !okEven ? { why: 'uneven' } : {}) };
  }
  return { ok: okEven, meter: even, ...(okEven ? {} : { why: 'uneven' }) };
}

/** A microphone peak (0..1 amplitude) as a velocity 1..127 (a log scale: −30 dB … 0 dB). */
export function peakToVel(peak: number): number {
  const db = 20 * Math.log10(Math.max(1e-4, peak));
  return Math.max(1, Math.min(127, Math.round(((db + 30) / 30) * 126 + 1)));
}

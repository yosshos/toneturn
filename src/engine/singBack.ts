// Sing It Back (voice, AUDIT-7 hole #14 / §9 "no rhythm or time game for singers"): call and answer in time. The
// piano plays a short phrase in one bar, you sing it back in the next bar on the same beats — count-in, click and the
// now-cue on every note. From two notes (match the pitch) up to five-note minor phrases with eighths in all 12 keys.
// Placed in the singer's range; any octave counts (pitch classes), so every voice sings where it is comfortable. Pure.

import { rng } from './newGamesKit';
import { clampLevel, lapKey, runBpm, type BCall, type BJudge, type BLap, type BSave, type BTarget } from './beginnerRun';

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const MINOR = [0, 2, 3, 5, 7, 8, 10, 12];

export interface SingLevel {
  notes: number;
  /** Highest scale degree index used (0 = the tonic). */
  top: number;
  /** Largest move in scale steps. */
  leap: number;
  minor?: boolean;
  /** Eighth pairs allowed. */
  eighths?: boolean;
  keys: number[];
  bpm: number;
}
const ALL12 = [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6];
export const SING_LEVELS: Record<number, SingLevel> = {
  1: { notes: 2, top: 2, leap: 1, keys: [0, 7, 5], bpm: 66 },
  2: { notes: 3, top: 2, leap: 1, keys: [0, 7, 5, 2], bpm: 70 },
  3: { notes: 3, top: 4, leap: 2, keys: [0, 7, 5, 2, 10], bpm: 72 },
  4: { notes: 4, top: 4, leap: 2, keys: [0, 7, 5, 2, 10, 9, 3], bpm: 76 },
  5: { notes: 4, top: 4, leap: 4, minor: true, keys: ALL12, bpm: 80 },
  6: { notes: 5, top: 7, leap: 4, eighths: true, keys: ALL12, bpm: 88 },
};
/** Phrases (call + answer) in a lap. */
export const SING_PHRASES = 2;

/** The tonic in the singer's range: the lowest of its pitch class whose phrase (up to `span` semitones) fits, else the one nearest the middle. */
export function singTonic(key: number, low: number, high: number, span: number): number {
  const k = ((key % 12) + 12) % 12;
  for (let m = low; m <= high; m++) if (((m % 12) + 12) % 12 === k && m + span <= high) return m;
  const mid = (low + high - span) / 2;
  let best = 60 + k;
  for (let m = 36; m <= 84; m++) if (((m % 12) + 12) % 12 === k && Math.abs(m - mid) < Math.abs(best - mid)) best = m;
  return best;
}

export function singLap(seed: number, level: number, lap: number, s?: Pick<BSave, 'boost'>, range: { low: number; high: number } = { low: 55, high: 67 }): BLap {
  const lv = clampLevel(level);
  const L = SING_LEVELS[lv];
  const rnd = rng((seed ^ Math.imul(lap + 1, 0xc2b2ae35)) >>> 0);
  const key = lapKey(seed, lap, L.keys);
  const scale = L.minor ? MINOR : MAJOR;
  const tonic = singTonic(key, range.low, range.high, scale[L.top]);
  const targets: BTarget[] = [];
  const calls: BCall[] = [];
  for (let p = 0; p < SING_PHRASES; p++) {
    // the rhythm in one bar: halves for two notes, quarters, eighth pairs at the top tier
    let durs: number[];
    if (L.notes === 2) durs = [2, 2];
    else if (L.notes === 3) durs = [1, 1, 2];
    else if (L.notes === 4) durs = [1, 1, 1, 1];
    else {
      const pairAt = Math.floor(rnd() * 3);
      durs = [];
      for (let b = 0; b < 4; b++) durs.push(...(b === pairAt ? [0.5, 0.5] : [1]));
      // five notes: one pair + three quarters = 5
    }
    const degs: number[] = [];
    let d = p === 0 || lv <= 2 ? 0 : Math.floor(rnd() * (L.top + 1));
    for (let i = 0; i < durs.length; i++) {
      if (i > 0) {
        let next = d;
        // the first tier may repeat a note (pitch matching); the others move
        const mayStay = lv === 1;
        for (let k = 0; k < 20 && ((!mayStay && next === d) || next < 0 || next > L.top); k++) {
          const step = (mayStay ? 0 : 1) + Math.floor(rnd() * (L.leap + (mayStay ? 1 : 0)));
          next = d + (rnd() < 0.5 ? -step : step);
        }
        if (next < 0 || next > L.top || (!mayStay && next === d)) next = d === 0 ? 1 : d - 1;
        d = next;
      }
      degs.push(d);
    }
    const callBar = p * 8;
    let at = 0;
    degs.forEach((g, i) => {
      const midi = tonic + scale[g];
      calls.push({ midi, beat: callBar + at, beats: durs[i] });
      targets.push({ beat: callBar + 4 + at, midi, label: '' });
      at += durs[i];
    });
  }
  return { game: 'singback', level: lv, lap, bpm: runBpm(L.bpm, s ?? { boost: 0 }), key, beats: 8 * SING_PHRASES, targets, calls, meter: 4 };
}

/** The sung pitch class decides (any octave). */
export const singJudge: BJudge = (t, e) => {
  if (e.midi === undefined || t.midi === undefined) return 'skip';
  return (((e.midi - t.midi) % 12) + 12) % 12 === 0 ? 'right' : 'wrong';
};

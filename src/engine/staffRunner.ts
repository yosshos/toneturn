// Staff Runner (keys, AUDIT-7 hole #14 / AUDIT-GAMES "Grand-Staff Runner"): two bars of notes on the staff, played on
// the keyboard in time — count-in, click, the now-cue on the due note. Five-finger positions in a key (the key
// signature on the staff), from the C / G / F positions in the treble clef up to all 12 keys in both clefs with leaps
// and eighth notes. MIDI grades the exact note (the octave read off the staff); the microphone grades the pitch class
// (it can mistake the octave). Enharmonics are the same key. Pure.

import { rng } from './newGamesKit';
import { clampLevel, lapKey, runBpm, type BJudge, type BLap, type BSave, type BTarget } from './beginnerRun';

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];

export interface StaffLevel {
  clef: 'treble' | 'bass' | 'both';
  keys: number[];
  /** Largest move in scale steps (1 = steps only). */
  leap: number;
  /** Highest degree used (4 = a five-finger position, 7 = the octave). */
  top: number;
  /** 'half' = a note every two beats, 'quarter', 'mixed' = quarters and eighth pairs. */
  rhythm: 'half' | 'quarter' | 'mixed';
  bpm: number;
}
export const STAFF_LEVELS: Record<number, StaffLevel> = {
  1: { clef: 'treble', keys: [0, 7, 5], leap: 1, top: 4, rhythm: 'half', bpm: 60 },
  2: { clef: 'bass', keys: [0, 7, 5], leap: 1, top: 4, rhythm: 'half', bpm: 60 },
  3: { clef: 'both', keys: [0, 7, 5, 2, 10], leap: 2, top: 4, rhythm: 'quarter', bpm: 66 },
  4: { clef: 'both', keys: [0, 7, 5, 2, 10, 9, 3], leap: 4, top: 4, rhythm: 'quarter', bpm: 72 },
  5: { clef: 'both', keys: [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6], leap: 7, top: 7, rhythm: 'quarter', bpm: 80 },
  6: { clef: 'both', keys: [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6], leap: 7, top: 7, rhythm: 'mixed', bpm: 88 },
};

/** The tonic's MIDI note for a clef: treble from A3 to G♯4, bass from A2 to G♯3 (five notes up stay on the staff). */
export const staffTonic = (key: number, clef: 'treble' | 'bass'): number => {
  const k = ((key % 12) + 12) % 12;
  const base = clef === 'treble' ? 60 : 48;
  return k <= 8 ? base + k : base - 12 + k;
};

/** Lap `lap` of a run (seeded): its key, clef, notes, rhythm and tempo. */
export function staffLap(seed: number, level: number, lap: number, s?: Pick<BSave, 'boost'>): BLap {
  const lv = clampLevel(level);
  const L = STAFF_LEVELS[lv];
  const rnd = rng((seed ^ Math.imul(lap + 1, 0x85ebca6b)) >>> 0);
  const key = lapKey(seed, lap, L.keys);
  const clef: 'treble' | 'bass' = L.clef === 'both' ? (lap % 2 === 0 ? 'treble' : 'bass') : L.clef;
  const tonic = staffTonic(key, clef);
  // the rhythm: durations in beats over two bars of 4/4
  const durs: number[] = [];
  if (L.rhythm === 'half') for (let i = 0; i < 4; i++) durs.push(2);
  else if (L.rhythm === 'quarter') for (let i = 0; i < 8; i++) durs.push(1);
  else {
    // quarters and eighth pairs; at least two pairs, the last beat a quarter
    const pairs = new Set<number>();
    while (pairs.size < 2) pairs.add(Math.floor(rnd() * 7));
    for (let b = 0; b < 7; b++) if (rnd() < 0.3) pairs.add(b);
    for (let b = 0; b < 8; b++) {
      if (pairs.has(b)) durs.push(0.5, 0.5);
      else durs.push(1);
    }
  }
  // the notes: a walk on the position's degrees, starting on the tonic at the first tiers
  const degs: number[] = [];
  let d = lv <= 2 ? 0 : Math.floor(rnd() * (L.top + 1));
  for (let i = 0; i < durs.length; i++) {
    if (i > 0) {
      let next = d;
      for (let k = 0; k < 20 && (next === d || next < 0 || next > L.top); k++) {
        const step = 1 + Math.floor(rnd() * L.leap);
        next = d + (rnd() < 0.5 ? -step : step);
      }
      if (next === d || next < 0 || next > L.top) next = d === 0 ? 1 : d - 1;
      d = next;
    }
    degs.push(d);
  }
  const targets: BTarget[] = [];
  let at = 0;
  degs.forEach((g, i) => {
    targets.push({ beat: at, midi: tonic + MAJOR[g], label: '' });
    at += durs[i];
  });
  return { game: 'staffrunner', level: lv, lap, bpm: runBpm(L.bpm, s ?? { boost: 0 }), key, beats: 8, targets, clef, meter: 4 };
}

/** Each target's note value in beats (for the staff). */
export const staffDurs = (lap: Pick<BLap, 'targets' | 'beats'>): number[] => lap.targets.map((t, i) => (lap.targets[i + 1]?.beat ?? lap.beats) - t.beat);

/** MIDI: the exact note; the microphone: the pitch class (enharmonics are one key either way). */
export const staffJudge =
  (input: 'mic' | 'midi'): BJudge =>
  (t, e) => {
    if (e.midi === undefined || t.midi === undefined) return 'skip';
    if (input === 'midi') return e.midi === t.midi ? 'right' : 'wrong';
    return (((e.midi - t.midi) % 12) + 12) % 12 === 0 ? 'right' : 'wrong';
  };

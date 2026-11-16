// Root Catcher (bass, AUDIT-7 hole #14 / AUDIT-GAMES "Root Rescue"): the chords change bar by bar; play each chord's
// root on its first beat, in time — count-in, click, the band's soft chord (3rd and 5th / 7th only: never the root,
// so a microphone never hears the answer from the speaker), the now-cue. From I–IV–V in E / A / D up to two chords a
// bar in all 12 keys with only the Roman numerals shown. Any octave counts (pitch classes). Pure.

import { rng, pickOf } from './newGamesKit';
import { spellMidi } from './aids';
import { pc as pcOf } from './pitch';
import { clampLevel, KEY_NAME, lapKey, runBpm, type BJudge, type BLap, type BSave, type BTarget } from './beginnerRun';

type Q = 'M' | 'm' | '7' | 'maj7' | 'm7';
const Q_INTS: Record<Q, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
const Q_SUFFIX: Record<Q, string> = { M: '', m: 'm', '7': '7', maj7: 'maj7', m7: 'm7' };
/** A chart step: semitones above the tonic, quality, beats, numeral. */
type Step = [number, Q, number, string];

const MAJ: Record<string, Step> = {
  I: [0, 'M', 4, 'I'], IV: [5, 'M', 4, 'IV'], V: [7, 'M', 4, 'V'], vi: [9, 'm', 4, 'vi'],
};
const MIN: Record<string, Step> = {
  i: [0, 'm', 4, 'i'], iv: [5, 'm', 4, 'iv'], v: [7, 'm', 4, 'v'], VI: [8, 'M', 4, '♭VI'], VII: [10, 'M', 4, '♭VII'], III: [3, 'M', 4, '♭III'],
};
const half = (s: Step): Step => [s[0], s[1], 2, s[3]];

export interface RootLevel {
  keys: number[];
  /** The tonic is minor (the keys are minor tonics). */
  minor?: boolean;
  charts: Step[][];
  bpm: number;
  /** Only the numerals are shown (the key is named). */
  numerals?: boolean;
}
const ALL12 = [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6];
export const ROOT_LEVELS: Record<number, RootLevel> = {
  1: { keys: [4, 9, 2], charts: [[MAJ.I, MAJ.IV, MAJ.V, MAJ.I], [MAJ.I, MAJ.V, MAJ.IV, MAJ.I], [MAJ.I, MAJ.IV, MAJ.I, MAJ.V]], bpm: 70 },
  2: { keys: [4, 9, 2, 7, 0], charts: [[MAJ.I, MAJ.vi, MAJ.IV, MAJ.V], [MAJ.I, MAJ.V, MAJ.vi, MAJ.IV], [MAJ.vi, MAJ.IV, MAJ.I, MAJ.V], [MAJ.I, MAJ.IV, MAJ.vi, MAJ.V]], bpm: 76 },
  3: { keys: [4, 9, 2, 7, 11, 0], minor: true, charts: [[MIN.i, MIN.iv, MIN.v, MIN.i], [MIN.i, MIN.VI, MIN.VII, MIN.i], [MIN.i, MIN.iv, MIN.VII, MIN.III]], bpm: 80 },
  4: {
    keys: [4, 9, 2, 7, 0, 5, 10],
    // the 8-bar blues (I V IV IV I V I V), dominant 7ths
    charts: [[[0, '7', 4, 'I7'], [7, '7', 4, 'V7'], [5, '7', 4, 'IV7'], [5, '7', 4, 'IV7'], [0, '7', 4, 'I7'], [7, '7', 4, 'V7'], [0, '7', 4, 'I7'], [7, '7', 4, 'V7']]],
    bpm: 88,
  },
  5: {
    keys: ALL12,
    charts: [[half([2, 'm7', 2, 'ii7']), half([7, '7', 2, 'V7']), [0, 'maj7', 4, 'Imaj7'], half([2, 'm7', 2, 'ii7']), half([7, '7', 2, 'V7']), half([0, 'maj7', 2, 'Imaj7']), half([9, 'm7', 2, 'vi7'])]],
    bpm: 92,
  },
  6: {
    keys: ALL12,
    numerals: true,
    charts: [
      [half(MAJ.I), half(MAJ.vi), half([2, 'm', 2, 'ii']), half(MAJ.V), half([4, 'm', 2, 'iii']), half(MAJ.vi), half([2, 'm', 2, 'ii']), half(MAJ.V)],
      [half(MAJ.I), half(MAJ.IV), half([4, 'm', 2, 'iii']), half(MAJ.vi), half([2, 'm', 2, 'ii']), half(MAJ.V), MAJ.I],
      [half(MAJ.vi), half(MAJ.IV), half(MAJ.I), half(MAJ.V), half(MAJ.vi), half(MAJ.IV), MAJ.V],
    ],
    bpm: 100,
  },
};

/** A chord symbol spelled in the key (the minor keys spelled from their relative major). */
export function rootSym(root: number, q: string, keyMajor: number): string {
  const s = spellMidi(60 + root, pcOf(KEY_NAME[((keyMajor % 12) + 12) % 12]));
  return `${s.letter}${s.acc === -1 ? '♭' : s.acc === 1 ? '♯' : ''}${Q_SUFFIX[q as Q] ?? ''}`;
}

export function rootLap(seed: number, level: number, lap: number, s?: Pick<BSave, 'boost'>): BLap {
  const lv = clampLevel(level);
  const L = ROOT_LEVELS[lv];
  const rnd = rng((seed ^ Math.imul(lap + 1, 0x27d4eb2f)) >>> 0);
  const key = lapKey(seed, lap, L.keys);
  const chart = pickOf(rnd, L.charts);
  const keyMajor = L.minor ? (key + 3) % 12 : key;
  const targets: BTarget[] = [];
  let at = 0;
  for (const [st, q, beats, num] of chart) {
    const root = (key + st) % 12;
    targets.push({ beat: at, pcs: [root], label: rootSym(root, q, keyMajor), num, tones: Q_INTS[q].map((i) => (root + i) % 12) });
    at += beats;
  }
  return { game: 'rootcatch', level: lv, lap, bpm: runBpm(L.bpm, s ?? { boost: 0 }), key, beats: at, targets, meter: 4 };
}

/** The band's soft chord on each change: the chord's tones without the root, above middle C (MIDI). */
export function rootBand(t: BTarget): number[] {
  const root = t.pcs?.[0] ?? 0;
  return (t.tones ?? []).filter((x) => x !== root).map((x) => 60 + x);
}

/**
 * The root (any octave) is right. With the microphone a non-root chord tone is not a decision: the speaker plays
 * those notes (the band), so the mic may hear them.
 */
export const rootJudge =
  (input: 'mic' | 'midi'): BJudge =>
  (t, e) => {
    if (e.midi === undefined) return 'skip';
    const p = ((e.midi % 12) + 12) % 12;
    if (t.pcs?.includes(p)) return 'right';
    if (input === 'mic' && t.tones?.includes(p)) return 'skip';
    return 'wrong';
  };

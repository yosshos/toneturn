// Strum Changes (guitar, AUDIT-7 hole #14 / AUDIT-GAMES "One-Minute Changes" and "Swing-o-meter"'s on-the-beat idea):
// the chord changes on the bar (two a bar later); strum the new chord on its first beat, in time — count-in, click,
// the now-cue, the next chord shown. Open-chord pairs (E–A, A–D, G–C …) → four-chord songs in open keys → two
// changes a bar → barre chords in all 12 keys → 7th chords. The microphone's strum recogniser (chordFinder) or a MIDI
// guitar (the notes of one strum) says which chord it was. Pure.

import { rng } from './newGamesKit';
import { clampLevel, lapKey, runBpm, type BJudge, type BLap, type BSave, type BTarget } from './beginnerRun';
import { rootSym } from './rootCatcher';

type Q = 'M' | 'm' | '7' | 'maj7' | 'm7';
const Q_INTS: Record<Q, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
type Ch = [number, Q];
const E: Ch = [4, 'M'], A: Ch = [9, 'M'], D: Ch = [2, 'M'], G: Ch = [7, 'M'], C: Ch = [0, 'M'], Em: Ch = [4, 'm'], Am: Ch = [9, 'm'], F: Ch = [5, 'M'], Bm: Ch = [11, 'm'], B7: Ch = [11, '7'];

export interface StrumLevel {
  /** Open-chord sets (pairs alternate; songs play in order); null keys = open chords, no key. */
  sets: { key: number | null; chords: Ch[] }[];
  /** All-12-key levels: degrees over the lap's key instead of fixed sets. */
  degrees?: [number, Q][];
  keys?: number[];
  /** Beats per chord. */
  per: number;
  bpm: number;
}
const ALL12 = [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6];
const SONGS = [
  { key: 7, chords: [G, D, Em, C] },
  { key: 0, chords: [C, Am, F, G] },
  { key: 9, chords: [A, D, E, A] },
  { key: 2, chords: [D, G, A, D] },
  { key: 4, chords: [E, A, B7, E] },
  { key: 2, chords: [D, Bm, G, A] },
];
export const STRUM_LEVELS: Record<number, StrumLevel> = {
  1: { sets: [{ key: null, chords: [E, A] }, { key: null, chords: [A, D] }, { key: null, chords: [Em, Am] }, { key: null, chords: [E, Am] }], per: 4, bpm: 60 },
  2: { sets: [{ key: null, chords: [G, C] }, { key: null, chords: [D, G] }, { key: null, chords: [C, Am] }, { key: null, chords: [G, Em] }, { key: null, chords: [D, A] }], per: 4, bpm: 66 },
  3: { sets: SONGS.slice(0, 5), per: 4, bpm: 72 },
  4: { sets: SONGS, per: 2, bpm: 72 },
  // barre chords: I IV I V in every key
  5: { sets: [], degrees: [[0, 'M'], [5, 'M'], [0, 'M'], [7, 'M']], keys: ALL12, per: 4, bpm: 76 },
  // 7th chords: I–vi–ii–V, two a bar
  6: { sets: [], degrees: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']], keys: ALL12, per: 2, bpm: 84 },
};

export function strumLap(seed: number, level: number, lap: number, s?: Pick<BSave, 'boost'>): BLap {
  const lv = clampLevel(level);
  const L = STRUM_LEVELS[lv];
  const rnd = rng((seed ^ Math.imul(lap + 1, 0x165667b1)) >>> 0);
  let key: number | null;
  let chords: Ch[];
  if (L.degrees && L.keys) {
    key = lapKey(seed, lap, L.keys);
    chords = L.degrees.map(([d, q]) => [(key! + d) % 12, q]);
  } else {
    // pairs and songs walk their list from a random start, one a lap
    const set = L.sets[(Math.floor(rnd() * L.sets.length) + lap) % L.sets.length];
    key = set.key;
    chords = set.chords;
  }
  // four bars: a pair alternates, a song is played through (twice when two chords a bar)
  const n = (4 * 4) / L.per;
  const seq: Ch[] = Array.from({ length: n }, (_, i) => chords[i % chords.length]);
  const targets: BTarget[] = seq.map(([root, q], i) => ({ beat: i * L.per, chord: { root, quality: q }, label: rootSym(root, q, key ?? 0), tones: Q_INTS[q].map((x) => (root + x) % 12) }));
  return { game: 'strumchange', level: lv, lap, bpm: runBpm(L.bpm, s ?? { boost: 0 }), key, beats: 16, targets, meter: 4 };
}

/**
 * A MIDI guitar's strum (the pitch classes of the notes that came together) against a chord: right when it has the
 * root and at least one more chord tone and nothing outside the chord.
 */
export function midiStrumVerdict(pcs: number[], chord: { root: number; quality: string }): 'right' | 'wrong' | 'again' {
  const set = [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))];
  if (set.length < 2) return 'again';
  const tones = (Q_INTS[chord.quality as Q] ?? [0, 4, 7]).map((x) => (chord.root + x) % 12);
  const inside = set.every((p) => tones.includes(p));
  return inside && set.includes(chord.root % 12) ? 'right' : 'wrong';
}

/** The strum's verdict decides; an unclear strum ("again") is no decision. */
export const strumJudge: BJudge = (_t, e) => (e.verdict === 'right' ? 'right' : e.verdict === 'wrong' ? 'wrong' : 'skip');

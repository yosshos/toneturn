// Dark Side (docs/research/REHARM-AND-COLOR.md C.3 game; HARMONY-REHARM §4): modal interchange by ear, in time. A
// 4-bar loop plays after a one-bar count-in (click on every beat, the now-cue on the beat dots); tap the moment the
// borrowed chord arrives — earlier in its bar scores more — then name it.
//
// Tiers: pp pop loops, iv or ♭VII · p + ♭VI and ♭III · mp the jazz round: ivm6, iiø7, ♭VImaj7, ♭VII7 · mf every
// borrowed 7th chord (+ v m7, ♭IImaj7, ♭IIImaj7, ivm7) · f loops with two or three borrowed chords (tap each), named as
// chord symbols in the key · ff + borrowing in minor (Dorian IV7 and ii m7, the Picardy third). Standard harmony only
// (the borrowed table of commonTone.ts BORROWED). Every loop in the next key of the cycle of 4ths. Pure.

import { CT_Q, mod12, rootName, sharpKey, type CtQ } from './commonTone';
import { cycleKey, itemSeed, pickOf, rng, shuffled } from './newGamesKit';
import type { DynName } from './courseSocial';

export const DARK_ITEMS = 8;
export const DARK_BARS = 4;
export const DARK_COUNT_IN = 4;
export const darkLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
/** The loop tempo per level (♩). */
export const darkBpm = (level: number): number => [80, 88, 92, 100, 100, 108][Math.max(1, Math.min(6, level)) - 1];

/** A bar of a loop: semitones above the tonic, quality, Roman numeral, borrowed (from where) or not. */
export interface DarkBar {
  d: number;
  q: CtQ;
  rn: string;
  from?: { en: string; he: string };
}
export interface DarkLoop {
  /** The tonic pitch class and mode. */
  key: number;
  minor: boolean;
  bars: DarkBar[];
}
const A = { en: 'the parallel minor (Aeolian)', he: 'המינור המקביל (איאולי)' };
const AM = { en: 'the parallel minor or Mixolydian', he: 'המינור המקביל או מיקסולידי' };
const DOR = { en: 'Dorian minor', he: 'מינור דורי' };
const MIX = { en: 'Mixolydian', he: 'מיקסולידי' };
const PHR = { en: 'Phrygian', he: 'פריגי' };
const PIC = { en: 'the parallel major (a Picardy third)', he: 'המז׳ור המקביל (טרצה פיקרדית)' };
const b = (d: number, q: CtQ, rn: string, from?: DarkBar['from']): DarkBar => ({ d, q, rn, ...(from ? { from } : {}) });

/** Pop loops (triads), one borrowed chord. */
const POP: Record<string, DarkBar[][]> = {
  iv: [
    [b(0, 'M', 'I'), b(5, 'M', 'IV'), b(5, 'm', 'iv', A), b(0, 'M', 'I')],
    [b(0, 'M', 'I'), b(9, 'm', 'vi'), b(5, 'm', 'iv', A), b(0, 'M', 'I')],
  ],
  '♭VII': [
    [b(0, 'M', 'I'), b(10, 'M', '♭VII', AM), b(5, 'M', 'IV'), b(0, 'M', 'I')],
    [b(0, 'M', 'I'), b(5, 'M', 'IV'), b(10, 'M', '♭VII', AM), b(0, 'M', 'I')],
  ],
  '♭VI': [
    [b(0, 'M', 'I'), b(8, 'M', '♭VI', A), b(7, 'M', 'V'), b(0, 'M', 'I')],
    [b(0, 'M', 'I'), b(5, 'M', 'IV'), b(8, 'M', '♭VI', A), b(0, 'M', 'I')],
  ],
  '♭III': [
    [b(0, 'M', 'I'), b(3, 'M', '♭III', A), b(5, 'M', 'IV'), b(0, 'M', 'I')],
    [b(0, 'M', 'I'), b(7, 'M', 'V'), b(3, 'M', '♭III', A), b(5, 'M', 'IV')],
  ],
};
/** Jazz loops (7th chords), one borrowed chord. */
const JAZZ: Record<string, DarkBar[][]> = {
  ivm6: [[b(0, 'maj7', 'Imaj7'), b(5, 'maj7', 'IVmaj7'), b(5, 'm6', 'ivm6', DOR), b(0, 'maj7', 'Imaj7')]],
  'iiø7': [[b(0, 'maj7', 'Imaj7'), b(9, 'm7', 'vim7'), b(2, 'm7b5', 'iiø7', A), b(7, '7', 'V7')]],
  '♭VImaj7': [[b(0, 'maj7', 'Imaj7'), b(2, 'm7', 'iim7'), b(7, '7', 'V7'), b(8, 'maj7', '♭VImaj7', A)]],
  '♭VII7': [[b(0, 'maj7', 'Imaj7'), b(5, 'maj7', 'IVmaj7'), b(10, '7', '♭VII7', AM), b(0, 'maj7', 'Imaj7')]],
  'v m7': [[b(0, 'maj7', 'Imaj7'), b(7, 'm7', 'v m7', MIX), b(0, '7', 'I7'), b(5, 'maj7', 'IVmaj7')]],
  '♭IImaj7': [[b(0, 'maj7', 'Imaj7'), b(2, 'm7', 'iim7'), b(1, 'maj7', '♭IImaj7', PHR), b(0, 'maj7', 'Imaj7')]],
  '♭IIImaj7': [[b(0, 'maj7', 'Imaj7'), b(3, 'maj7', '♭IIImaj7', A), b(2, 'm7', 'iim7'), b(7, '7', 'V7')]],
  ivm7: [[b(0, 'maj7', 'Imaj7'), b(9, 'm7', 'vim7'), b(5, 'm7', 'ivm7', A), b(0, 'maj7', 'Imaj7')]],
};
/** Loops with two or three borrowed chords. */
const MULTI: DarkBar[][] = [
  [b(0, 'M', 'I'), b(8, 'M', '♭VI', A), b(10, 'M', '♭VII', AM), b(0, 'M', 'I')],
  [b(0, 'M', 'I'), b(10, 'M', '♭VII', AM), b(5, 'm', 'iv', A), b(0, 'M', 'I')],
  [b(0, 'maj7', 'Imaj7'), b(5, 'm7', 'ivm7', A), b(10, '7', '♭VII7', AM), b(0, 'maj7', 'Imaj7')],
  [b(0, 'maj7', 'Imaj7'), b(3, 'maj7', '♭IIImaj7', A), b(8, 'maj7', '♭VImaj7', A), b(1, 'maj7', '♭IImaj7', PHR)],
];
/** Minor loops: chords borrowed from Dorian or the parallel major. */
const MINOR: DarkBar[][] = [
  [b(0, 'm7', 'im7'), b(5, '7', 'IV7', DOR), b(0, 'm7', 'im7'), b(7, '7', 'V7')],
  [b(0, 'm7', 'im7'), b(2, 'm7', 'iim7', DOR), b(7, '7', 'V7'), b(0, 'm7', 'im7')],
  [b(0, 'm', 'i'), b(5, 'm', 'iv'), b(7, '7', 'V7'), b(0, 'M', 'I', PIC)],
];
/** Wrong names for a minor loop: chords that belong to the minor key itself (nothing borrowed). */
const MINOR_DECOYS: DarkBar[] = [b(5, 'm7', 'ivm7', A), b(10, '7', '♭VII7', A), b(8, 'maj7', '♭VImaj7', A), b(2, 'm7b5', 'iiø7', A)];

/** The names a level asks between (Roman numerals; f and ff name chord symbols in the key). */
const POP_PP = ['iv', '♭VII'];
const POP_P = ['iv', '♭VII', '♭VI', '♭III'];
const JAZZ_MP = ['ivm6', 'iiø7', '♭VImaj7', '♭VII7'];
const JAZZ_ALL = Object.keys(JAZZ);
export const usesSymbols = (level: number): boolean => level >= 5;

export interface DarkItem {
  loop: DarkLoop;
  /** Bars holding a borrowed chord (tap each). */
  borrowed: number[];
  /** The bar whose chord is named. */
  ask: number;
  choices: { id: string; label: string }[];
  answer: string;
}

/** Spelling: diatonic chords in the key's signature; borrowed ones in the parallel minor's (D: B♭, C; E: C, D). */
export function barRootName(loop: DarkLoop, bar: DarkBar): string {
  const p = mod12(loop.key + bar.d);
  if (p === 6 && (!bar.from || sharpKey(loop.key))) return 'F♯';
  const home = loop.minor ? loop.key + 3 : loop.key;
  const flats = bar.from && !loop.minor ? !sharpKey(loop.key) || !sharpKey(loop.key + 3) : !sharpKey(home);
  return rootName(p, flats);
}
const SYM: Partial<Record<CtQ, string>> = { M: '', m: 'm', m7b5: 'ø7' };
export const barSymbol = (loop: DarkLoop, bar: DarkBar): string => barRootName(loop, bar) + (SYM[bar.q] ?? CT_Q[bar.q].sym);
export const keyName = (loop: DarkLoop): string => (mod12(loop.key) === 6 ? 'F♯' : rootName(loop.key, !sharpKey(loop.minor ? loop.key + 3 : loop.key))) + (loop.minor ? 'm' : '');

/** Item i of a run: a loop in the next key, its borrowed bars, the asked bar and the choices. */
export function darkItem(seed: number, level: number, i: number): DarkItem {
  const lv = Math.max(1, Math.min(6, Math.round(level)));
  const rnd = rng(itemSeed(seed, i) ^ 0xda5c);
  const key = cycleKey(seed, i);
  let bars: DarkBar[];
  let minor = false;
  let pool: string[];
  if (lv <= 2) {
    pool = lv === 1 ? POP_PP : POP_P;
    bars = pickOf(rnd, POP[pickOf(rnd, pool)]);
  } else if (lv <= 4) {
    pool = lv === 3 ? JAZZ_MP : JAZZ_ALL;
    bars = pickOf(rnd, JAZZ[pickOf(rnd, pool)]);
  } else if (lv === 6 && rnd() < 0.5) {
    bars = pickOf(rnd, MINOR);
    minor = true;
    pool = [];
  } else {
    bars = pickOf(rnd, MULTI);
    pool = [];
  }
  const loop: DarkLoop = { key, minor, bars };
  const borrowed = bars.map((x, k) => (x.from ? k : -1)).filter((k) => k >= 0);
  const ask = borrowed[borrowed.length - 1];
  const target = bars[ask];
  if (!usesSymbols(lv)) {
    const others = shuffled(rnd, pool.filter((p) => p !== target.rn)).slice(0, 3);
    return { loop, borrowed, ask, answer: target.rn, choices: shuffled(rnd, [target.rn, ...others]).map((x) => ({ id: x, label: x })) };
  }
  // chord symbols in this key: the asked chord and three other borrowed chords of the same mode (never the same sound)
  const ans = barSymbol(loop, target);
  const cands = (minor ? [...MINOR.flat(), ...MINOR_DECOYS] : [...Object.values(POP).flat(2), ...Object.values(JAZZ).flat(2), ...MULTI.flat()]).filter((x) => x.from);
  const seen = new Set([`${mod12(target.d)}:${target.q}`]);
  const others: string[] = [];
  for (const c of shuffled(rnd, cands)) {
    const id = `${mod12(c.d)}:${c.q}`;
    if (seen.has(id)) continue;
    seen.add(id);
    others.push(barSymbol(loop, c));
    if (others.length >= 3) break;
  }
  return { loop, borrowed, ask, answer: ans, choices: shuffled(rnd, [ans, ...others]).map((x) => ({ id: x, label: x })) };
}

// ---------------------------------------------------------------- timing

/** A tap `beat` beats after the loop's first downbeat: the bar it counts for (a sixteenth early still counts), or −1. */
export function tapBar(beat: number): number {
  const b0 = Math.floor((beat + 0.25) / 4);
  return beat < -0.25 || b0 >= DARK_BARS ? -1 : b0;
}
/** Points for a tap on a borrowed bar: 15 on its downbeat, down to 8 at the end of the bar. */
export const tapPoints = (beat: number, level: number): number => {
  const inBar = Math.max(0, beat - Math.floor((beat + 0.25) / 4) * 4);
  return Math.round((8 + 7 * Math.max(0, 1 - inBar / 4)) * (1 + 0.1 * (level - 1)));
};
export const namePoints = (level: number): number => Math.round(10 * (1 + 0.1 * (level - 1)));

/** The taps of one loop judged: borrowed bars hit, false taps (on a bar of the key, at most 2 counted), bars missed. */
export function judgeTaps(item: DarkItem, beats: number[], level: number): { hits: number[]; falses: number; missed: number[]; points: number } {
  const hits: number[] = [];
  let falses = 0;
  let points = 0;
  for (const t of beats) {
    const bar = tapBar(t);
    if (bar < 0) continue;
    if (item.borrowed.includes(bar)) {
      if (!hits.includes(bar)) {
        hits.push(bar);
        points += tapPoints(t, level);
      }
    } else falses++;
  }
  falses = Math.min(2, falses);
  return { hits, falses, missed: item.borrowed.filter((x) => !hits.includes(x)), points };
}

/** One line on a wrong name ("Why?"). */
export function darkWhy(item: DarkItem, lang: 'en' | 'he'): string {
  const bar = item.loop.bars[item.ask];
  const from = bar.from ? bar.from[lang] : '';
  const sym = barSymbol(item.loop, bar);
  return lang === 'he' ? `${sym} (${bar.rn}) שאול מ־${from}.` : `${sym} (${bar.rn}) is borrowed from ${from}.`;
}

// ---------------------------------------------------------------- the run

export interface DarkSave {
  v: 1;
  game: 'darkside';
  seed: number;
  tier?: DynName;
  level: number;
  i: number;
  right: number;
  wrong: number;
  score: number;
  /** Taps on time (borrowed bars caught) and names right, for the result line. */
  caught: number;
  named: number;
}
export const newDarkSave = (seed: number, level: number, tier?: DynName): DarkSave => ({ v: 1, game: 'darkside', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), i: 0, right: 0, wrong: 0, score: 0, caught: 0, named: 0, ...(tier ? { tier } : {}) });
export function isDarkSave(x: unknown): x is DarkSave {
  const s = x as DarkSave | null;
  return !!s && s.v === 1 && s.game === 'darkside' && typeof s.seed === 'number' && typeof s.i === 'number' && s.i < DARK_ITEMS;
}
export const darkOver = (s: DarkSave): boolean => s.i >= DARK_ITEMS;

/** A loop's taps and its name answer together: one right per borrowed bar caught and for the name; wrongs for the rest. */
export function darkAnswer(s: DarkSave, taps: number[], named: boolean): { save: DarkSave; tap: ReturnType<typeof judgeTaps>; gained: number } {
  const item = darkItem(s.seed, s.level, s.i);
  const tap = judgeTaps(item, taps, s.level);
  const gained = tap.points + (named ? namePoints(s.level) : 0);
  const right = tap.hits.length + (named ? 1 : 0);
  const wrong = tap.missed.length + tap.falses + (named ? 0 : 1);
  return { save: { ...s, i: s.i + 1, right: s.right + right, wrong: s.wrong + wrong, score: s.score + gained, caught: s.caught + tap.hits.length, named: s.named + (named ? 1 : 0) }, tap, gained };
}
export function darkResult(s: DarkSave) {
  return { game: 'darkside' as const, score: s.score, detail: { right: s.right, wrong: s.wrong, level: s.level, items: s.i, caught: s.caught, named: s.named, bpm: darkBpm(s.level), ...(s.tier ? { tier: s.tier } : {}) } };
}

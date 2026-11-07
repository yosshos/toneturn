// Ear Bingo (spec AE §8; rooms and classes): 4×4 cards of chords / intervals / progressions from a seed, the
// call sequence, marking, line detection and claim validation. Pure — the same seed gives every device the
// same calls, and a player's card comes from (seed, player id), so nothing but the seed has to be shared.
//
// Fairness: the calls are the whole pool in a seeded order, so every item on every card is called eventually
// and every card can complete every line.

import { mulberry32, shuffle, type NoteEvent } from './lesson';
import { voiceChord, type ChordQuality } from './pitch';

export type BingoSet = 'chords' | 'intervals' | 'progressions';
export const BINGO_SETS: BingoSet[] = ['chords', 'intervals', 'progressions'];
export const CARD_SIZE = 4;
export const CELLS = CARD_SIZE * CARD_SIZE;

type Text = { en: string; he: string };
export interface BingoItem {
  id: string;
  set: BingoSet;
  /** Short symbol shown on the card (left-to-right in both languages). */
  label: string;
  /** Spoken / accessible name. */
  name: Text;
}

// ---------------------------------------------------------------- pools

const INTERVALS: [string, number, Text][] = [
  ['m2', 1, { en: 'minor second', he: 'סקונדה קטנה' }],
  ['M2', 2, { en: 'major second', he: 'סקונדה גדולה' }],
  ['m3', 3, { en: 'minor third', he: 'טרצה קטנה' }],
  ['M3', 4, { en: 'major third', he: 'טרצה גדולה' }],
  ['P4', 5, { en: 'perfect fourth', he: 'קוורטה זכה' }],
  ['TT', 6, { en: 'tritone', he: 'טריטון' }],
  ['P5', 7, { en: 'perfect fifth', he: 'קווינטה זכה' }],
  ['m6', 8, { en: 'minor sixth', he: 'סקסטה קטנה' }],
  ['M6', 9, { en: 'major sixth', he: 'סקסטה גדולה' }],
  ['m7', 10, { en: 'minor seventh', he: 'ספטימה קטנה' }],
  ['M7', 11, { en: 'major seventh', he: 'ספטימה גדולה' }],
  ['P8', 12, { en: 'octave', he: 'אוקטבה' }],
];
const INTERVAL_SEMIS = new Map(INTERVALS.map(([id, s]) => [id, s]));

const CHORDS: [string, string, number[], Text][] = [
  ['maj', 'maj', [0, 4, 7], { en: 'major', he: 'מז׳ור' }],
  ['min', 'm', [0, 3, 7], { en: 'minor', he: 'מינור' }],
  ['dim', 'dim', [0, 3, 6], { en: 'diminished', he: 'מוקטן' }],
  ['aug', 'aug', [0, 4, 8], { en: 'augmented', he: 'מוגדל' }],
  ['sus2', 'sus2', [0, 2, 7], { en: 'suspended second', he: 'סאס 2' }],
  ['sus4', 'sus4', [0, 5, 7], { en: 'suspended fourth', he: 'סאס 4' }],
  ['dom7', '7', [0, 4, 7, 10], { en: 'dominant seventh', he: 'ספטאקורד דומיננטי' }],
  ['maj7', 'maj7', [0, 4, 7, 11], { en: 'major seventh', he: 'מז׳ור 7' }],
  ['m7', 'm7', [0, 3, 7, 10], { en: 'minor seventh', he: 'מינור 7' }],
  ['m7b5', 'm7♭5', [0, 3, 6, 10], { en: 'half-diminished', he: 'חצי מוקטן' }],
  ['dim7', 'dim7', [0, 3, 6, 9], { en: 'diminished seventh', he: 'ספטאקורד מוקטן' }],
  ['mMaj7', 'm(maj7)', [0, 3, 7, 11], { en: 'minor major seventh', he: 'מינור מז׳ור 7' }],
  ['6', '6', [0, 4, 7, 9], { en: 'major sixth chord', he: 'מז׳ור 6' }],
  ['m6', 'm6', [0, 3, 7, 9], { en: 'minor sixth chord', he: 'מינור 6' }],
  ['add9', 'add9', [0, 4, 7, 14], { en: 'added ninth', he: 'אד 9' }],
  ['7sus4', '7sus4', [0, 5, 7, 10], { en: 'seventh suspended fourth', he: '7 סאס 4' }],
  ['9', '9', [0, 4, 7, 10, 14], { en: 'dominant ninth', he: 'נונה דומיננטית' }],
  ['maj9', 'maj9', [0, 4, 7, 11, 14], { en: 'major ninth', he: 'מז׳ור 9' }],
  ['m9', 'm9', [0, 3, 7, 10, 14], { en: 'minor ninth', he: 'מינור 9' }],
  ['7s9', '7♯9', [0, 4, 7, 10, 15], { en: 'seven sharp nine', he: '7 דיאז 9' }],
];
const CHORD_IVS = new Map(CHORDS.map(([id, , ivs]) => [id, ivs]));

const NUMERALS: Record<string, [number, ChordQuality]> = {
  I: [0, 'maj'],
  ii: [2, 'min'],
  iii: [4, 'min'],
  IV: [5, 'maj'],
  V: [7, 'maj'],
  vi: [9, 'min'],
  i: [0, 'min'],
  III: [3, 'maj'],
  iv: [5, 'min'],
  v: [7, 'min'],
  VI: [8, 'maj'],
  VII: [10, 'maj'],
};
const PROGRESSIONS: string[][] = [
  ['I', 'IV', 'V', 'I'],
  ['I', 'V', 'vi', 'IV'],
  ['I', 'vi', 'IV', 'V'],
  ['vi', 'IV', 'I', 'V'],
  ['ii', 'V', 'I', 'I'],
  ['I', 'IV', 'I', 'V'],
  ['I', 'ii', 'V', 'I'],
  ['I', 'iii', 'IV', 'V'],
  ['IV', 'V', 'iii', 'vi'],
  ['I', 'V', 'IV', 'I'],
  ['I', 'IV', 'vi', 'V'],
  ['I', 'vi', 'ii', 'V'],
  ['i', 'iv', 'v', 'i'],
  ['i', 'VI', 'III', 'VII'],
  ['i', 'iv', 'V', 'i'],
  ['i', 'VII', 'VI', 'V'],
  ['i', 'VI', 'iv', 'V'],
  ['i', 'iv', 'VII', 'III'],
];

function poolOf(set: BingoSet): BingoItem[] {
  if (set === 'intervals')
    return INTERVALS.flatMap(([id, , name]) =>
      (['u', 'd'] as const).map((dir) => ({
        id: `${id}${dir}`,
        set,
        label: `${id}${dir === 'u' ? '↑' : '↓'}`,
        name: { en: `${name.en} ${dir === 'u' ? 'up' : 'down'}`, he: `${name.he} ${dir === 'u' ? 'עולה' : 'יורדת'}` },
      })),
    );
  if (set === 'chords') return CHORDS.map(([id, label, , name]) => ({ id, set, label, name }));
  return PROGRESSIONS.map((p) => ({ id: p.join('-'), set, label: p.join('–'), name: { en: p.join(', '), he: p.join(', ') } }));
}
const POOLS: Record<BingoSet, BingoItem[]> = { chords: poolOf('chords'), intervals: poolOf('intervals'), progressions: poolOf('progressions') };

export const bingoPool = (set: BingoSet): BingoItem[] => POOLS[set];
export const bingoItem = (set: BingoSet, id: string): BingoItem | undefined => POOLS[set].find((x) => x.id === id);

// ---------------------------------------------------------------- cards and calls

export interface BingoCardData {
  set: BingoSet;
  seed: number;
  player: string;
  /** 16 item ids, row by row (physical order: row 0 left → right). */
  cells: string[];
}

/** FNV-1a: a stable number for a player id / nickname. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function bingoCard(set: BingoSet, seed: number, player: string | number): BingoCardData {
  const p = String(player);
  const rnd = mulberry32((seed ^ hashString(p) ^ 0xca2d) >>> 0);
  const cells = shuffle(rnd, POOLS[set].map((x) => x.id)).slice(0, CELLS);
  return { set, seed, player: p, cells };
}

/** Every item of the pool once, in a seeded order: the host plays them one by one. */
export function bingoCalls(set: BingoSet, seed: number): string[] {
  return shuffle(mulberry32((seed ^ 0xb1b0) >>> 0), POOLS[set].map((x) => x.id));
}

/** The 10 lines: 4 rows, 4 columns, 2 diagonals (cell indices). */
export const LINES: number[][] = [
  ...Array.from({ length: CARD_SIZE }, (_, r) => Array.from({ length: CARD_SIZE }, (_, c) => r * CARD_SIZE + c)),
  ...Array.from({ length: CARD_SIZE }, (_, c) => Array.from({ length: CARD_SIZE }, (_, r) => r * CARD_SIZE + c)),
  Array.from({ length: CARD_SIZE }, (_, i) => i * CARD_SIZE + i),
  Array.from({ length: CARD_SIZE }, (_, i) => i * CARD_SIZE + (CARD_SIZE - 1 - i)),
];

/** Lines whose four cells are all in `marked` (cell indices). */
export function completedLines(marked: Iterable<number>): number[][] {
  const m = new Set(marked);
  return LINES.filter((l) => l.every((i) => m.has(i)));
}

export interface ClaimResult {
  valid: boolean;
  /** The winning line, when valid. */
  line: number[] | null;
  /** Marked cells whose item has not been called (false marks). */
  falseMarks: number[];
}

/** A "Bingo!" claim counts only marks on items already called; one complete line wins. */
export function validateClaim(card: BingoCardData, marks: Iterable<number>, calledSoFar: Iterable<string>): ClaimResult {
  const called = new Set(calledSoFar);
  const all = [...new Set(marks)].filter((i) => i >= 0 && i < CELLS);
  const good = all.filter((i) => called.has(card.cells[i]));
  const falseMarks = all.filter((i) => !called.has(card.cells[i]));
  const line = completedLines(good)[0] ?? null;
  return { valid: !!line, line, falseMarks };
}

/** Index of the call after which this card first has a line (perfect marking), or -1. */
export function winsAt(card: BingoCardData, calls: string[]): number {
  const marked = new Set<number>();
  for (let k = 0; k < calls.length; k++) {
    const i = card.cells.indexOf(calls[k]);
    if (i >= 0) marked.add(i);
    if (completedLines(marked).length) return k;
  }
  return -1;
}

/** Every card can win: all its items are among the calls. */
export const cardCanWin = (card: BingoCardData, calls: string[]) => card.cells.every((c) => calls.includes(c)) && winsAt(card, calls) >= 0;

// ---------------------------------------------------------------- sound of a call

/** What the host plays for a call. The root / key varies with (seed, call index) so nothing is memorised by pitch. */
export function bingoCallEvents(set: BingoSet, id: string, seed: number, index = 0): { events: NoteEvent[]; length: number } {
  const rnd = mulberry32((seed ^ hashString(id) ^ (index * 0x2545f491)) >>> 0);
  const out: NoteEvent[] = [];
  if (set === 'intervals') {
    const semis = INTERVAL_SEMIS.get(id.slice(0, -1)) ?? 0;
    const up = id.endsWith('u');
    const root = 55 + Math.floor(rnd() * 8);
    const [a, b] = up ? [root, root + semis] : [root + semis, root];
    out.push({ midi: a, start: 0, duration: 0.75, velocity: 0.75 }, { midi: b, start: 0.8, duration: 1.1, velocity: 0.75 });
    // Then again, a little faster, so a missed first hearing can still be marked.
    out.push({ midi: a, start: 2.3, duration: 0.5, velocity: 0.7 }, { midi: b, start: 2.85, duration: 0.9, velocity: 0.7 });
    return { events: out, length: 4 };
  }
  if (set === 'chords') {
    const ivs = CHORD_IVS.get(id) ?? [0, 4, 7];
    const root = 48 + Math.floor(rnd() * 8);
    const notes = ivs.map((i) => root + i);
    out.push({ midi: root - 12, start: 0, duration: 2.2, velocity: 0.5 });
    notes.forEach((m, k) => out.push({ midi: m, start: 0, duration: 2.2, velocity: 0.6 }, { midi: m, start: 2.5 + k * 0.32, duration: 0.6, velocity: 0.6 }));
    const end = 2.5 + notes.length * 0.32 + 0.3;
    notes.forEach((m) => out.push({ midi: m, start: end, duration: 1.4, velocity: 0.6 }));
    return { events: out, length: end + 1.6 };
  }
  const key = Math.floor(rnd() * 12);
  let prev: number[] | undefined;
  id.split('-').forEach((n, k) => {
    const [deg, q] = NUMERALS[n] ?? [0, 'maj'];
    const v = voiceChord(key + deg, q, prev);
    prev = v.slice(1);
    v.forEach((m) => out.push({ midi: m, start: k * 1.05, duration: 1.0, velocity: 0.55 }));
  });
  return { events: out, length: 4 * 1.05 + 0.8 };
}

// ---------------------------------------------------------------- one game

export interface BingoGame {
  set: BingoSet;
  seed: number;
  calls: string[];
}
export const bingoGame = (set: BingoSet, seed: number): BingoGame => ({ set, seed, calls: bingoCalls(set, seed) });

/** Encode / decode a claim for a room answer string: "bingo:0,5,10,15". */
export const encodeClaim = (marks: Iterable<number>) => `bingo:${[...new Set(marks)].sort((a, b) => a - b).join(',')}`;
export function decodeClaim(s: string | null | undefined): number[] | null {
  if (!s || !s.startsWith('bingo:')) return null;
  const xs = s
    .slice(6)
    .split(',')
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n < CELLS);
  return xs;
}

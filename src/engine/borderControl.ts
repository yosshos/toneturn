// Border Control (AUDIT-GAMES §4.2 #6, Ear + Jazz): a phrase crosses a key border — home ii–V–I, then the move. Two
// stamps per case: HOW it crossed (the means) and WHERE it landed (the new key). Built on the key-move chords of
// src/engine/keyMoves.ts (the same chords the k-keys / g-keys / b-keys drills and the modulation-means topic play).
//   Level 1 (pp)  pivot chord or direct                    · 2 (p)  + a ii–V of the new key
//   Level 3 (mp)  + the common diminished (Barry Harris)   · 4 (mf) + a tritone sub into it
//   Level 5 (f)   all five, distant keys (a half step, minor / major 3rds, a tritone)
//   Level 6 (ff)  a tune's key centres: the 2nd and the 3rd centre (each with its ii–V–I), the first named
// Every case is in a seeded home key from all 12. Pure.

import { dimMove, directMove, iiVMove, KEY_NAMES, KEY_NAMES_HE, MINOR_NAMES, pivotMove, tritoneMove, type KChord, type KeyMove } from './keyMoves';
import { pickR, rng, shuffleR } from './topicKit';
import { caseSeed, mod12 } from './caseRun';
import type { DynName } from './courseSocial';

type Bi = { en: string; he: string };
export type BorderMeans = 'pivot' | 'direct' | 'iiv' | 'dim' | 'tritone';

export const MEANS_NAME: Record<BorderMeans, Bi> = {
  pivot: { en: 'Pivot chord', he: 'אקורד ציר' },
  direct: { en: 'Direct', he: 'ישירות' },
  iiv: { en: 'ii–V of the new key', he: 'ii–V של הסולם החדש' },
  dim: { en: 'Common diminished', he: 'המוקטן המשותף' },
  tritone: { en: 'Tritone sub', he: 'תחליף טריטון' },
};
/** One line for the "Why?" of a wrong means stamp. */
export const MEANS_WHY: Record<BorderMeans, Bi> = {
  pivot: { en: 'A chord of both keys (vi of the old = ii of the new) leads into the new cadence.', he: 'אקורד ששייך לשני הסולמות (vi של הישן = ii של החדש) מוביל לקדנצה החדשה.' },
  direct: { en: 'The old cadence ends, the new key starts with no chord between.', he: 'הקדנצה הישנה נגמרת והסולם החדש מתחיל בלי אקורד מקשר.' },
  iiv: { en: 'Right after the old I, the ii–V of the new key.', he: 'מיד אחרי ה־I הישן, ה־ii–V של הסולם החדש.' },
  dim: { en: 'I6, a diminished 7th, one note down a half step: the new V7.', he: 'I6, אקורד מוקטן, צליל אחד יורד חצי טון: ה־V7 החדש.' },
  tritone: { en: 'The new ii, then ♭II7 (the tritone sub of its V) into I.', he: 'ה־ii החדש, ואז ♭II7 (תחליף הטריטון של ה־V) אל ה־I.' },
};

const POOL: Record<number, BorderMeans[]> = {
  1: ['pivot', 'direct'],
  2: ['pivot', 'direct', 'iiv'],
  3: ['pivot', 'direct', 'iiv', 'dim'],
  4: ['pivot', 'direct', 'iiv', 'dim', 'tritone'],
  5: ['pivot', 'direct', 'iiv', 'dim', 'tritone'],
};
/** The means' usual distances (semitones up from home); level 5 reaches the distant keys. */
const OFFS: Record<Exclude<BorderMeans, 'pivot'>, number[]> = { direct: [2, 3, 5, 7, 8, 10], iiv: [1, 3, 4, 8, 10], tritone: [3, 5, 8, 10], dim: [3, 6, 9] };
const FAR_OFFS: Record<Exclude<BorderMeans, 'pivot'>, number[]> = { direct: [1, 3, 4, 6, 8, 9], iiv: [1, 3, 4, 6, 9], tritone: [1, 3, 4, 6, 9], dim: [3, 6, 9] };

export const tierLevelBC = (t: DynName) => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

/** A key, as a stamp: id `k<pc>` / `m<pc>` (minor), names in both languages (solfège in Hebrew). */
export interface KeyStamp {
  id: string;
  pc: number;
  minor: boolean;
}
export const keyStamp = (pc: number, minor = false): KeyStamp => ({ id: `${minor ? 'm' : 'k'}${mod12(pc)}`, pc: mod12(pc), minor });
export function keyStampName(k: KeyStamp): Bi {
  return k.minor ? { en: `${MINOR_NAMES[k.pc]} minor`, he: `${KEY_NAMES_HE[k.pc]} מינור` } : { en: `${KEY_NAMES[k.pc]} major`, he: `${KEY_NAMES_HE[k.pc]} מז׳ור` };
}

export interface BorderCase {
  level: number;
  home: number;
  /** The chords to play: home ii–V, then the move (level 6: three key centres). */
  chords: KChord[];
  /** Stamp 1: the means (levels 1–5) or the 2nd key centre (level 6). */
  first: { kind: 'means'; answer: BorderMeans; options: BorderMeans[] } | { kind: 'key'; answer: KeyStamp; options: KeyStamp[] };
  /** Stamp 2: the new key (levels 1–5) or the 3rd key centre (level 6). */
  second: { answer: KeyStamp; options: KeyStamp[] };
}

const homeIiV = (A: number): KChord[] => [
  { root: mod12(A + 2), q: 'm7', name: '', beats: 2, role: 'A' },
  { root: mod12(A + 7), q: '7', name: '', beats: 2, role: 'A' },
];
const centre = (k: number): KChord[] => [
  { root: mod12(k + 2), q: 'm7', name: '', beats: 2, role: 'B' },
  { root: mod12(k + 7), q: '7', name: '', beats: 2, role: 'B' },
  { root: mod12(k), q: 'maj7', name: '', beats: 4, role: 'B' },
];

function moveBy(dev: BorderMeans, A: number, r: () => number, far: boolean): KeyMove {
  if (dev === 'pivot') return pivotMove(A, Math.floor(r() * 4));
  const off = pickR(r, (far ? FAR_OFFS : OFFS)[dev]);
  if (dev === 'direct') return directMove(A, A + off);
  if (dev === 'iiv') return iiVMove(A, A + off);
  if (dev === 'tritone') return tritoneMove(A, A + off);
  return dimMove(A, A + off);
}

/** Four key options: the answer and three near misses (never home), shuffled. */
function keyOptions(r: () => number, answer: KeyStamp, home: number, extra: number[] = []): KeyStamp[] {
  const out = new Map<string, KeyStamp>([[answer.id, answer]]);
  const cands = shuffleR(r, [...extra, answer.pc + 1, answer.pc - 1, answer.pc + 5, answer.pc + 7, answer.pc + 3, answer.pc - 3, answer.pc + 6]);
  for (const c of cands) {
    if (out.size >= 4) break;
    const k = keyStamp(c, answer.minor && r() < 0.5);
    if (k.pc === mod12(home) && !k.minor) continue;
    if (!out.has(k.id) && !(k.pc === answer.pc)) out.set(k.id, k);
  }
  return shuffleR(r, [...out.values()]);
}

/** Case `i` of a run. */
export function borderCase(seed: number, i: number, level: number): BorderCase {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const r = rng(caseSeed(seed, i));
  r();
  // 12 home keys: case i of a run starts from the seed's key and walks the cycle of 4ths
  const home = mod12(Math.floor(r() * 12) + 5 * i);
  if (lv === 6) {
    const MOVES = [2, 10, 3, 9, 4, 8, 5, 7];
    const m1 = pickR(r, MOVES);
    const m2 = pickR(r, MOVES.filter((x) => mod12(m1 + x) !== 0));
    const b = keyStamp(home + m1);
    const c = keyStamp(home + m1 + m2);
    return {
      level: lv,
      home,
      chords: [...centre(home), ...centre(b.pc), ...centre(c.pc)],
      first: { kind: 'key', answer: b, options: keyOptions(r, b, home, [c.pc]) },
      second: { answer: c, options: keyOptions(r, c, home, [b.pc]) },
    };
  }
  const pool = POOL[lv];
  const means = pickR(r, pool);
  const mv = moveBy(means, home, r, lv >= 5);
  const to = keyStamp(mv.to, !!mv.toMinor);
  return {
    level: lv,
    home,
    chords: [...homeIiV(home), ...mv.chords],
    first: { kind: 'means', answer: means, options: pool.slice() },
    second: { answer: to, options: keyOptions(r, to, home) },
  };
}

/** Units right of a case (0–2): the first stamp and the second. */
export function stampBorder(c: BorderCase, first: string, second: string): { firstOk: boolean; secondOk: boolean; got: number } {
  const firstOk = c.first.kind === 'means' ? first === c.first.answer : first === c.first.answer.id;
  // enharmonics are the same key: compare by pitch class and mode
  const secondOk = second === c.second.answer.id;
  return { firstOk, secondOk, got: (firstOk ? 1 : 0) + (secondOk ? 1 : 0) };
}

/** The phrase's bpm by level (faster up the tiers). */
export const borderBpm = (level: number) => [0, 96, 104, 112, 120, 132, 144][Math.max(1, Math.min(6, level))];

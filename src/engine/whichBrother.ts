// Which Brother? (AUDIT-GAMES §4.2 #7, Jazz + Keys): Barry Harris's family of dominants (docs/BARRY-HARRIS-THEORY.md
// §1–§2). The four dominants a minor third apart — in C: G7, B♭7, D♭7, E7 — share one rootless 7♭9 (B°7 = D°), so
// each resolves to the same tonic. By ear first, then on the keys:
//   Level 1 (pp)  V7 or its tritone brother (♭II7) into I            — ear
//   Level 2 (p)   all four brothers into I                          — ear
//   Level 3 (mp)  the dim move: B°7, then one note down a half step — which brother was born? — ear
//   Level 4 (mf)  play the brother that lands a half step into I (the tritone brother) — keys
//   Level 5 (f)   play a named brother: the tritone sub, the backdoor ♭VII7, the ♭9 relative (III7) — keys
//   Level 6 (ff)  hear a brother resolve, play it back — ear and keys
// All 12 keys (the case's tonic walks the cycle of 4ths from a seeded start). Pure.

import { pickR, rng } from './topicKit';
import { caseSeed, mod12 } from './caseRun';
import type { DynName } from './courseSocial';

type Bi = { en: string; he: string };
/** A brother by its distance from the V7's root: 0 = V7 itself, 3 = backdoor (♭VII7), 6 = tritone (♭II7), 9 = ♭9 relative (III7). */
export type Brother = 0 | 3 | 6 | 9;
export const BROTHERS: Brother[] = [0, 3, 6, 9];

const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** A dominant's name in key `tonic`: its root above the tonic (V = 7, ♭VII = 10, ♭II = 1, III = 4). */
export const domName = (root: number) => `${FLAT[mod12(root)]}7`;
export const tonicName = (t: number) => `${FLAT[mod12(t)]}`;
/** The root of brother `b` in key `tonic` (the V7 of the tonic is 7 semitones up). */
export const brotherRoot = (tonic: number, b: Brother) => mod12(tonic + 7 + b);

export const BROTHER_NAME: Record<Brother, Bi> = {
  0: { en: 'V7 itself', he: 'ה־V7 עצמו' },
  3: { en: 'the backdoor ♭VII7', he: 'הדלת האחורית ♭VII7' },
  6: { en: 'the tritone sub ♭II7', he: 'תחליף הטריטון ♭II7' },
  9: { en: 'the ♭9 relative III7', he: 'קרוב ה־♭9 III7' },
};
export const BROTHER_ROMAN: Record<Brother, string> = { 0: 'V7', 3: '♭VII7', 6: '♭II7', 9: 'III7' };

/** Pitch classes of a dominant 7th on `root`. */
export const dom7 = (root: number) => [0, 4, 7, 10].map((x) => mod12(root + x));
/** The family's shared diminished: the rootless 7♭9 of every brother (in C: B D F A♭). */
export const familyDim = (tonic: number) => [11, 2, 5, 8].map((x) => mod12(tonic + x));
/** The note of the dim that, lowered a half step, gives brother `b` its root (B → B♭7, D → D♭7, F → E7, A♭ → G7). */
export const dimNoteFor = (tonic: number, b: Brother) => mod12(brotherRoot(tonic, b) + 1);

export const tierLevelWB = (t: DynName) => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
export const isPlayLevel = (level: number) => level >= 4;

export interface BrotherCase {
  level: number;
  tonic: number;
  answer: Brother;
  /** The choices (ear levels): brothers. */
  options: Brother[];
  /** Play levels: the dominant the question is about (the V7 of the tonic, or the brother heard at level 6). */
  of: Brother;
  /** Level 5: which brother to play, named. */
  ask?: Brother;
}

/** Case `i` of a run. */
export function brotherCase(seed: number, i: number, level: number): BrotherCase {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const r = rng(caseSeed(seed, i));
  r();
  const tonic = mod12(Math.floor(r() * 12) + 5 * i);
  if (lv === 1) {
    const answer = pickR(r, [0, 6] as Brother[]);
    return { level: lv, tonic, answer, options: [0, 6], of: 0 };
  }
  if (lv === 2 || lv === 3) return { level: lv, tonic, answer: pickR(r, BROTHERS), options: BROTHERS.slice(), of: 0 };
  if (lv === 4) return { level: lv, tonic, answer: 6, options: [], of: 0 };
  if (lv === 5) {
    const ask = pickR(r, [3, 6, 9] as Brother[]);
    return { level: lv, tonic, answer: ask, options: [], of: 0, ask };
  }
  const heard = pickR(r, BROTHERS);
  return { level: lv, tonic, answer: heard, options: [], of: heard };
}

/**
 * Judge a played chord for brother `b` of `tonic`: the dominant's root, 3rd and 7th must sound (the 5th is optional,
 * a ♭9 / 9 / 13 may colour it), the root in the bass, and no note outside the dominant and its usual tensions.
 */
export function judgeBrother(tonic: number, b: Brother, played: number[]): { ok: boolean; why: 'ok' | 'bass' | 'missing' | 'extra' } {
  if (!played.length) return { ok: false, why: 'missing' };
  const root = brotherRoot(tonic, b);
  const pcs = new Set(played.map(mod12));
  const need = [0, 4, 10].map((x) => mod12(root + x));
  const allowed = new Set([0, 1, 2, 4, 7, 9, 10].map((x) => mod12(root + x)));
  if (mod12(Math.min(...played)) !== root) return { ok: false, why: 'bass' };
  if (!need.every((p) => pcs.has(p))) return { ok: false, why: 'missing' };
  if ([...pcs].some((p) => !allowed.has(p))) return { ok: false, why: 'extra' };
  return { ok: true, why: 'ok' };
}

/** A voicing of brother `b` (bass root, then 3–7–9 / 13 above): the sound of a case and the answer shown. */
export function brotherVoicing(tonic: number, b: Brother): number[] {
  const root = brotherRoot(tonic, b);
  return [36 + mod12(root - 36), ...stack(root, [4, 7, 10])];
}
/** Close stack of the intervals above `root`, starting from the first one at or above E3 (52). */
function stack(root: number, ints: number[]): number[] {
  const out: number[] = [];
  let m = 51;
  for (const x of ints) {
    m = m + 1 + mod12(root + x - (m + 1));
    out.push(m);
  }
  return out;
}
/** The tonic chord (6) after it: 3, 5, 6, 8. */
export function tonicVoicing(tonic: number): number[] {
  return [36 + mod12(tonic - 36), ...stack(tonic, [4, 7, 9, 12])];
}
/** The family dim as a voicing (close, around the middle). */
export function dimVoicing(tonic: number): number[] {
  const pcs = familyDim(tonic);
  const lo = 55;
  return pcs.map((p) => lo + mod12(p - lo)).sort((a, b) => a - b);
}
/** Level 3: the dim, then the same voicing with the brother's note lowered a half step (and the new root in the bass). */
export function dimMoveVoicings(tonic: number, b: Brother): [number[], number[]] {
  const d = dimVoicing(tonic);
  const note = dimNoteFor(tonic, b);
  const born = d.map((m) => (mod12(m) === note ? m - 1 : m));
  const root = brotherRoot(tonic, b);
  return [[36 + mod12(note - 36), ...d], [36 + mod12(root - 36), ...born]];
}

/** "Why?" for a wrong answer: the brother's place in the family. */
export function brotherWhy(c: BrotherCase): Bi {
  const t = tonicName(c.tonic);
  const fam = [0, 3, 6, 9].map((b) => domName(brotherRoot(c.tonic, b as Brother))).join(' ');
  return { en: `Into ${t}: the family is ${fam} — one dim (${familyDim(c.tonic).map((p) => FLAT[p]).join(' ')}).`, he: `אל ${t}: המשפחה היא ${fam} — מוקטן אחד (${familyDim(c.tonic).map((p) => FLAT[p]).join(' ')}).` };
}

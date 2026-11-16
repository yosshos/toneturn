// Grace notes and two-voice helpers for the VexFlow staves (notation 0.99): NoteStaff (drills) and ScoreView (pieces)
// draw grace notes the same way — small notes in a GraceNoteGroup attached to the main head (a slashed eighth for an
// acciaccatura, beamed 16ths for several), with their own accidentals against the key signature.

import type { Grace } from '../engine/drills/types';

type VF = typeof import('vexflow/bravura');

const SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const KEY_FIFTHS: Record<string, number> = { Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7 };

/** The key signature's accidental per letter (−1 flat, 0 none, 1 sharp), from a VexFlow key name ('G', 'Bb', 'Am'). */
export function keyAccidentals(key: string): Record<string, number> {
  const minor = key.endsWith('m');
  const base = minor ? key.slice(0, -1) : key;
  let f = KEY_FIFTHS[base] ?? 0;
  if (minor) f = (KEY_FIFTHS[base] ?? 0) - 3;
  const out: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (f > 0) for (const l of SHARPS.slice(0, f)) out[l] = 1;
  if (f < 0) for (const l of [...SHARPS].reverse().slice(0, -f)) out[l] = -1;
  return out;
}

/** The accidental a VexFlow key ('f#/5', 'b/4', 'eb/4') needs against the key signature ('#', 'b', 'n' or none). */
export function accidentalFor(vfKey: string, key: string): string | null {
  const m = /^([a-g])(#|b)?\//.exec(vfKey);
  if (!m) return null;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const sig = keyAccidentals(key)[m[1].toUpperCase()];
  return acc === sig ? null : acc === 1 ? '#' : acc === -1 ? 'b' : 'n';
}

let seq = 0;
/** Name a voice-2 note's SVG group (svg g[id^="vf-v2-"]), so the lower voice can be found on the drawn staff. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const markVoice2 = (sn: any): void => void sn.setAttribute('id', `v2-${++seq}`);

/**
 * The grace notes before a main head as a VexFlow GraceNoteGroup (attach it with addModifier). One grace: an eighth,
 * slashed for an acciaccatura; several: beamed 16ths (the first slashed for an acciaccatura group).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function graceGroup(VF: VF, graces: Grace[], vfKey: (m: number) => string, clef: string, key: string, stemDown = false): any {
  const many = graces.length > 1;
  const notes = graces.map((g, k) => {
    const keyStr = vfKey(g.pitch);
    const gn = new VF.GraceNote({ keys: [keyStr], duration: many ? '16' : '8', slash: !!g.slash && (k === 0 || !many), clef, ...(stemDown ? { stem_direction: -1 } : {}) });
    const acc = accidentalFor(keyStr, key);
    if (acc) gn.addModifier(new VF.Accidental(acc), 0);
    // the SVG group's id says what it is (svg g[id^="vf-grace-"]): tests and the marks layer can find grace heads
    gn.setAttribute('id', `grace-${++seq}`);
    return gn;
  });
  const group = new VF.GraceNoteGroup(notes, false);
  if (many) group.beamNotes();
  return group;
}

/**
 * After the voice's accidentals are applied: a main head of the same letter and octave as one of its graces but a
 * different alteration shows its own sign (A after a grace A♭ reads A♮, even where the key needs none).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function signAfterGrace(VF: VF, sn: any, graces: Grace[], vfKey: (m: number) => string): void {
  const keys: string[] = sn.getKeys();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const has = (i: number) => sn.getModifiers().some((m: any) => m.getCategory?.() === 'Accidental' && m.getIndex?.() === i);
  keys.forEach((k, i) => {
    const m = /^([a-g])(#|b)?\/(-?\d)$/.exec(k);
    if (!m || has(i)) return;
    const clash = graces.some((g) => {
      const gm = /^([a-g])(#|b)?\/(-?\d)$/.exec(vfKey(g.pitch));
      return gm && gm[1] === m[1] && gm[3] === m[3] && (gm[2] ?? '') !== (m[2] ?? '');
    });
    if (clash) sn.addModifier(new VF.Accidental(m[2] === '#' ? '#' : m[2] === 'b' ? 'b' : 'n'), i);
  });
}

/** Columns of a two-voice line: distinct onsets over the voices (items in time order, `durs` per item, `vox` its voice). */
export function onsetColumns(durs: number[], vox: (1 | 2)[]): number {
  const at = { 1: 0, 2: 0 };
  const cols = new Set<number>();
  durs.forEach((d, i) => {
    const v = vox[i] ?? 1;
    cols.add(Math.round(at[v] * 1e4));
    at[v] += d;
  });
  return cols.size;
}

/** Each voice's bar-line positions (cumulative lengths that end a bar), for checking two voices meet at every bar line. */
export function voiceBarLines(durs: number[], vox: (1 | 2)[], meter: number): Record<1 | 2, number[]> {
  const at = { 1: 0, 2: 0 };
  const out: Record<1 | 2, number[]> = { 1: [], 2: [] };
  durs.forEach((d, i) => {
    const v = vox[i] ?? 1;
    at[v] += d;
    if (Math.abs(at[v] / meter - Math.round(at[v] / meter)) < 1e-6) out[v].push(Math.round(at[v] * 1e4) / 1e4);
  });
  return out;
}

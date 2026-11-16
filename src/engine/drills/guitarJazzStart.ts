// AUDIT-7 #2 (docs/research/AUDIT-7-GAPS.md §7): the guitarist's jazz entry below 1000 — performed, measured, in all 12
// keys, over the 12-bar blues (ABRSM Jazz G1–G3 / Aebersold Vol. 1 order: the blues head, then the chords, then the
// guide tones and the comping rhythms):
//
//   blues-head   a riff blues head (our own, AAB: the riff, the riff over IV, an answer) in quarters and halves
//   blues-shells three-note shells (root, 3rd, 7th) four to the bar, the root on string 6 or 5, whichever is nearer
//   blues-guide  the guide tones: the 3rd and 7th of every chord, two half notes a bar, each moving to the nearest
//                (option 1: one guide tone a bar, whole notes, starting on the 7th — the slowest guide-tone line)
//   blues-comp   the same shells in the Charleston (beat 1 and the "and" of 2), swung
//
// Every item is key-relative (the tonic's lowest fret on string 6 or 5) and runs in all 12 keys. Pure.

import type { Drill, DrillSpec } from './types';
import type { Tuning } from '../fretboard';
import { finish, mod, NAMES, place, shell, t, type Ev, type GN } from './guitar';

/** The 12-bar blues: the root of each bar's dominant seventh, in semitones above the key. */
export const BLUES_ROOTS = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 0];
/** The head (the singer's Riff Blues, voiceAudit7Songs.ts): [semitones from the tonic, beats], null = rest. */
const RIFF: [number | null, number][] = [[7, 1], [7, 1], [3, 1], [0, 1], [5, 2], [3, 1], [0, 1], [null, 2], [7, 1], [3, 1], [0, 4]];
export const BLUES_HEAD: [number | null, number][] = [...RIFF, ...RIFF, [2, 1], [2, 1], [-1, 1], [-5, 1], [5, 1], [5, 1], [3, 1], [0, 1], [null, 2], [7, 1], [3, 1], [0, 4]];
/** The pitch class (of two) whose nearest pitch to `prev` is closest. */
const nearestPc = (prev: number, pcs: number[]): number => pcs.reduce((a, b) => (Math.abs(mod(b - prev + 6, 12) - 6) < Math.abs(mod(a - prev + 6, 12) - 6) ? b : a));
const chordName = (key: number, bar: number) => `${NAMES[mod(key + BLUES_ROOTS[bar], 12)]}7`;
const strum = (v: { s: number; f: number }[]): GN[] => v.map((x) => ({ ...x, tech: 'strum-down' as const, stroke: 'D' as const }));

/** Shells for the 12 bars, each on the root string that keeps the hand nearest the last shell. */
export function bluesShells(tu: Tuning, key: number): { s: number; f: number }[][] {
  let near = 5;
  return BLUES_ROOTS.map((r) => {
    const root = mod(key + r, 12);
    const a = shell(tu, root, '7', 6, near);
    const b = shell(tu, root, '7', 5, near);
    const v = Math.abs(a[0].f - near) <= Math.abs(b[0].f - near) ? a : b;
    near = v[0].f;
    return v;
  });
}

export function generateGuitarJazzStart(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const evs: Ev[] = [];
  const chart = BLUES_ROOTS.map((_, bar) => chordName(key, bar));
  const k = NAMES[key];
  switch (s.kind) {
    case 'blues-head': {
      // The tonic between G3 and F♯4 so the head (a 4th below to a 5th above) lies in the first positions.
      const tonic = 55 + mod(key - 7, 12);
      let beat = 0;
      for (const [st, len] of BLUES_HEAD) {
        if (st !== null) {
          const p = place(tu, tonic + st, [3, 2, 4, 1, 5], 0, 12) ?? place(tu, tonic + st, [6, 5, 4, 3, 2, 1], 0, 15)!;
          evs.push({ beat, dur: len, notes: [{ ...p, stroke: 'D' }] });
        }
        beat += len;
      }
      const d = finish(s, tu, evs, { title: t(`A blues head: the riff, the riff over IV, the answer · ${k}`, `נושא בלוז: הריף, הריף על IV, התשובה · ${k}`), bpm: 80, evenness: false });
      return { ...d, chart };
    }
    case 'blues-shells': {
      bluesShells(tu, key).forEach((v, bar) => {
        for (let q = 0; q < 4; q++) evs.push({ beat: bar * 4 + q, dur: 1, notes: strum(v) });
      });
      evs.push({ beat: 48, dur: 4, notes: strum(bluesShells(tu, key)[0]) });
      const d = finish(s, tu, evs, { title: t(`Shells on a blues, four to the bar · ${k}`, `קונכיות על בלוז, ארבע לתיבה · ${k}`), bpm: 90, evenness: true });
      return { ...d, chart: [...chart, chordName(key, 0)] };
    }
    case 'blues-guide': {
      // The 3rd and the ♭7 of every bar, half notes; each guide tone the nearest one to the last (3 ↔ 7 between I and IV).
      let prev = 62;
      const whole = (s.option ?? 0) === 1;
      BLUES_ROOTS.forEach((r, bar) => {
        const root = key + r;
        // Option 1: one guide tone a bar (the 7th first, then whichever of 3 / 7 is nearer).
        const pcs = whole ? [bar === 0 ? root + 10 : nearestPc(prev, [root + 4, root + 10])] : [root + 4, root + 10];
        pcs.forEach((pc, h) => {
          const cands = [0, 1].map((o) => 55 + mod(pc - 55, 12) + 12 * o).filter((x) => x <= 74);
          const p = cands.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
          prev = p;
          const pl = place(tu, p, [3, 2, 4, 1], 1, 12) ?? place(tu, p, [3, 2, 4, 1, 5], 0, 15)!;
          evs.push({ beat: bar * 4 + h * 2, dur: whole ? 4 : 2, notes: [{ ...pl, ct: true, stroke: 'D' }] });
        });
      });
      const first = whole ? t('one a bar', 'אחד בתיבה') : t('two a bar', 'שניים בתיבה');
      const d = finish(s, tu, evs, { title: t(`Guide tones on a blues (${first.en}) · ${k}`, `צלילים מנחים על בלוז (${first.he}) · ${k}`), bpm: 80, evenness: true, goal: { chordTonesOnBeats: true } });
      return { ...d, chart };
    }
    case 'blues-comp': {
      // The Charleston: a short chord on 1, the next on the "and" of 2, held to the bar line.
      bluesShells(tu, key).forEach((v, bar) => {
        evs.push({ beat: bar * 4, dur: 1.5, notes: strum(v) });
        evs.push({ beat: bar * 4 + 1.5, dur: 2.5, notes: strum(v) });
      });
      const d = finish(s, tu, evs, { title: t(`Comping on a blues: the Charleston, shells · ${k}`, `ליווי על בלוז: צ׳רלסטון, קונכיות · ${k}`), bpm: 96, evenness: true });
      return { ...d, chart };
    }
  }
  throw new Error(`Unknown jazz-start kind ${s.kind}`);
}

// Elevator (AUDIT-GAMES §4.2 #10, Keys + Guitar): Thomas Echols's Elevator on Barry Harris's 6th-diminished scales
// (docs/BARRY-HARRIS-THEORY.md §5, §10; docs/research/BARRY-HARRIS-METHOD.md F1.2, E21, E22).
//
// Construction (F1.2): start from a unison on a scale tone; the top voice steps up the 8-note scale and the bottom
// voice steps down, one step each; fill the middle from the same chord. Each shape is a floor:
//   1 unison · 2 3rds · 3 triad · 4 6th · 5 octave · 6 drop 2 · 7 drop 3 · 8 drop 2&4 · 9 double octave.
// Top and bottom move by the same count in an 8-note scale, so they are both on (the 6 chord) or both off (the dim).
// In C6-dim from C (the method doc's table): C4 | B3 D4 | A3 C4 E4 | G♯3 (B3) F4 | G3 (C4 E4) G4 | F3 B3 D4 G♯4 |
// E3 C4 G4 A4 | D3 G♯3 F4 B4 | C3 (…) C5. In scale steps from the top note T (an alternating scale puts the next
// chord tone below two steps down): triad inner = T−2; drop 2 inner = T−6, T−4; drop 3 inner = T−6, T−2;
// drop 2&4 inner = T−10, T−4. Floors 4, 5 and 9 may add any tones of the same chord between the outer voices.
//
// Levels (tiers pp → ff):
//   1 floors 2–3 from the tonic (major 6-dim) · 2 floors 2–5 from any tone of the 6 chord (taking the elevator up a
//   floor = contrary motion) · 3 the minor 6-dim scale, floors 2–6 · 4 reach floor N with the melody note on top
//   (major or minor, floors 3–8) · 5 borrowing (E22): move the top 1–3 voices of a floor up one scale step into the
//   other chord (oblique motion) · 6 all four scales (with the dominant 7th-dim and 7♭5-dim), melody on top, floors to 9.
// Every case is in a seeded key from all 12. Answers are notes (MIDI numbers); a case is right when the voicing is.
// Pure.

import { pickR, rng } from './topicKit';
import { caseSeed, mod12 } from './caseRun';
import type { DynName } from './courseSocial';

type Bi = { en: string; he: string };
export type SixDimScale = 'major' | 'minor' | 'dom' | 'domb5';
/** The four 6th-diminished scales (BARRY-HARRIS-THEORY §5), semitones from the tonic; even indices are the chord. */
export const SCALES: Record<SixDimScale, number[]> = {
  major: [0, 2, 4, 5, 7, 8, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 9, 11],
  dom: [0, 2, 4, 5, 7, 8, 10, 11],
  domb5: [0, 2, 4, 5, 6, 8, 10, 11],
};
export const SCALE_NAME: Record<SixDimScale, Bi> = {
  major: { en: '6-dim', he: '6־דים' },
  minor: { en: 'm6-dim', he: 'm6־דים' },
  dom: { en: '7-dim', he: '7־דים' },
  domb5: { en: '7♭5-dim', he: '7♭5־דים' },
};
export const SCALE_SUFFIX: Record<SixDimScale, string> = { major: '6', minor: 'm6', dom: '7', domb5: '7♭5' };

export const FLOOR_NAME: Bi[] = [
  { en: '', he: '' },
  { en: 'unison', he: 'יוניסון' },
  { en: '3rds', he: 'טרצות' },
  { en: 'triad', he: 'משולש' },
  { en: '6th', he: 'סקסטה' },
  { en: 'octave', he: 'אוקטבה' },
  { en: 'drop 2', he: 'דרופ 2' },
  { en: 'drop 3', he: 'דרופ 3' },
  { en: 'drop 2&4', he: 'דרופ 2&4' },
  { en: 'double octave', he: 'אוקטבה כפולה' },
];
/** Floors whose middle is free (any tones of the same chord between the outer voices). */
export const FREE_MIDDLE = new Set([4, 5, 9]);

/** The scale as one ladder of MIDI notes: step k from the tonic `t` (step 0 = t, 8 steps = an octave). */
export const stepNote = (t: number, sc: SixDimScale, k: number) => {
  const s = SCALES[sc];
  const oct = Math.floor(k / 8);
  return t + 12 * oct + s[((k % 8) + 8) % 8];
};
/** The scale step of a note of the ladder (null when the note is not in the scale). */
export function noteStep(t: number, sc: SixDimScale, m: number): number | null {
  const d = m - t;
  const oct = Math.floor(d / 12);
  const i = SCALES[sc].indexOf(mod12(d));
  return i < 0 ? null : oct * 8 + i;
}
/** Is step k on the chord (the 6 / m6 / 7 / 7♭5) or off (the dim)? */
export const onChord = (k: number) => ((k % 8) + 8) % 8 % 2 === 0;

/** The floor `n` built from the unison step `s0`: outer voices, the required inner voices, and the chord (on / off). */
export function floorShape(t: number, sc: SixDimScale, s0: number, n: number): { bottom: number; top: number; inner: number[]; on: boolean } {
  const top = s0 + (n - 1);
  const bottom = s0 - (n - 1);
  const innerSteps = n === 3 ? [top - 2] : n === 6 ? [top - 6, top - 4] : n === 7 ? [top - 6, top - 2] : n === 8 ? [top - 10, top - 4] : [];
  return { bottom: stepNote(t, sc, bottom), top: stepNote(t, sc, top), inner: innerSteps.map((k) => stepNote(t, sc, k)), on: onChord(top) };
}
/** The full voicing of a floor (outer + required inner, low to high); floors 1 is one note. */
export function floorVoicing(t: number, sc: SixDimScale, s0: number, n: number): number[] {
  const f = floorShape(t, sc, s0, n);
  return [...new Set([f.bottom, ...f.inner, f.top])].sort((a, b) => a - b);
}

export interface ElevatorCase {
  level: number;
  /** Tonic MIDI note (the scale's root in the octave around middle C). */
  t: number;
  scale: SixDimScale;
  /** What the player builds. */
  kind: 'floor' | 'next' | 'melody' | 'borrow';
  floor: number;
  /** The unison step the floors grow from. */
  s0: number;
  /** Shown: the start note (floor / next), the melody note (melody), the floor voicing (borrow, next). */
  shown: number[];
  /** Borrow: how many top voices move. */
  borrow?: number;
  /** One right voicing (low to high). */
  answer: number[];
}

export const tierLevelEl = (t: DynName) => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];

/** Tonic for a case: one of 12, placed so the floors stay in about C3–C6. */
const tonicOf = (pc: number) => 60 + (mod12(pc) > 6 ? mod12(pc) - 12 : mod12(pc));

/** Case `i` of a run (seeded; tonics walk the cycle of 4ths from a seeded start: all 12 keys). */
export function elevatorCase(seed: number, i: number, level: number): ElevatorCase {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const r = rng(caseSeed(seed, i));
  r();
  const t = tonicOf(Math.floor(r() * 12) + 5 * i);
  if (lv === 1) {
    const floor = pickR(r, [2, 3]);
    return mk(lv, t, 'major', 'floor', floor, 0);
  }
  if (lv === 2) {
    const s0 = pickR(r, [0, 2, 4, 6]);
    const floor = pickR(r, [2, 3, 4, 5]);
    return mk(lv, t, 'major', floor > 2 && r() < 0.5 ? 'next' : 'floor', floor, s0);
  }
  if (lv === 3) {
    const s0 = pickR(r, [0, 2, 4, 6, 1, 3]);
    return mk(lv, t, 'minor', 'floor', pickR(r, [2, 3, 4, 5, 6]), s0);
  }
  if (lv === 4) {
    const sc = pickR(r, ['major', 'minor'] as SixDimScale[]);
    const floor = pickR(r, [3, 4, 5, 6, 7, 8]);
    const top = pickR(r, [8, 9, 10, 11, 12]);
    return mk(lv, t, sc, 'melody', floor, top - (floor - 1));
  }
  if (lv === 5) {
    const sc = pickR(r, ['major', 'minor'] as SixDimScale[]);
    const floor = pickR(r, [3, 7]);
    const s0 = pickR(r, [0, 2, 4, 6]);
    const borrow = floor === 3 ? pickR(r, [1, 2]) : pickR(r, [1, 2, 3]);
    return mk(lv, t, sc, 'borrow', floor, s0, borrow);
  }
  const sc = pickR(r, ['major', 'minor', 'dom', 'domb5'] as SixDimScale[]);
  const floor = pickR(r, [3, 5, 6, 7, 8, 9]);
  const top = pickR(r, [9, 10, 11, 12]);
  return mk(lv, t, sc, 'melody', floor, top - (floor - 1));
}

function mk(level: number, t: number, scale: SixDimScale, kind: ElevatorCase['kind'], floor: number, s0: number, borrow?: number): ElevatorCase {
  const v = floorVoicing(t, scale, s0, floor);
  if (kind === 'borrow') {
    const n = borrow ?? 1;
    const answer = v.map((m, k) => (k >= v.length - n ? stepNote(t, scale, (noteStep(t, scale, m) ?? 0) + 1) : m));
    return { level, t, scale, kind, floor, s0, shown: v, borrow: n, answer };
  }
  const shown = kind === 'melody' ? [v[v.length - 1]] : kind === 'next' ? floorVoicing(t, scale, s0, floor - 1) : [stepNote(t, scale, s0)];
  return { level, t, scale, kind, floor, s0, shown, answer: v };
}

/**
 * Judge a built voicing. Floors with a free middle accept any tones of the floor's chord strictly between the outer
 * voices; the others need exactly the floor's notes. Octave doublings of inner voices are not allowed (drop voicings
 * are four different notes). Borrowing needs exactly the answer.
 */
export function judgeElevator(c: ElevatorCase, notes: number[]): { ok: boolean; why: 'ok' | 'outer' | 'inner' | 'count' } {
  const got = [...new Set(notes)].sort((a, b) => a - b);
  const want = c.answer;
  if (!got.length) return { ok: false, why: 'count' };
  if (got[0] !== want[0] || got[got.length - 1] !== want[want.length - 1]) return { ok: false, why: 'outer' };
  if (c.kind !== 'borrow' && FREE_MIDDLE.has(c.floor)) {
    const f = floorShape(c.t, c.scale, c.s0, c.floor);
    const inner = got.slice(1, -1);
    const ok = inner.every((m) => {
      const k = noteStep(c.t, c.scale, m);
      return k !== null && onChord(k) === f.on;
    });
    return ok ? { ok: true, why: 'ok' } : { ok: false, why: 'inner' };
  }
  if (got.length !== want.length) return { ok: false, why: 'count' };
  return got.every((m, k) => m === want[k]) ? { ok: true, why: 'ok' } : { ok: false, why: 'inner' };
}

const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** A note name in the scale's spelling (flats; the dim tone of a major 6-dim is ♭6 → spelled as the key reads it). */
export const noteName = (m: number) => `${FLAT[mod12(m)]}${Math.floor(m / 12) - 1}`;
export const scaleTitle = (c: Pick<ElevatorCase, 't' | 'scale'>) => `${FLAT[mod12(c.t)]}${SCALE_SUFFIX[c.scale]}-dim`;
/** Keyboard range that holds a case's notes (whole octaves around them, at least two). */
export function padRange(c: ElevatorCase): [number, number] {
  const all = [...c.answer, ...c.shown];
  let lo = 12 * Math.floor(Math.min(...all) / 12);
  let hi = 12 * Math.ceil((Math.max(...all) + 1) / 12) - 1;
  if (hi - lo < 23) hi = lo + 23;
  // C to B, then one more C on top
  lo = Math.max(36, lo);
  return [lo, Math.min(96, hi + 1)];
}

// AUDIT-SCALES (owner 2026-11-14): the scale-harmonization ladder and Barry Harris borrowing, on piano (`k-sharm`) and
// guitar (`g-harm`). Every scale — major, the seven modes, harmonic and melodic minor, and Barry Harris's four
// diminished scales — is played UP and DOWN the whole scale: note by note, in diatonic 3rds (broken, then together),
// triads and 7th chords on every degree (arpeggiated, then block), and the 7th chords as drop 2 and drop 3.
//
// Barry Harris's diminished scales alternate a chord with the diminished 7th a half step under its root, so in 8ths
// the chord tones land on the beats both ways, and the scale's "7th chords" are the chord and the diminished in moving
// inversions (C6, B°7, C6/E, B°7/D …):
//   major 6th-dim     C6   + B°7   C D E F G A♭ A B       serves major chords (and m7 through the relative: Dm7 = F6)
//   minor 6th-dim     Cm6  + B°7   C D E♭ F G A♭ A B      serves minor chords and m7♭5 (Dø = Fm6)
//   dominant 7th-dim  C7   + B°7   C D E F G A♭ B♭ B      serves the dominant
//   7♭5-dim           C7♭5 + B°7   C D E F G♭ A♭ B♭ B     serves the altered / tritone-substitute dominant
//
// Borrowing (oblique motion): walking the 6th-diminished scale in 4-note chords, one or two voices step to a note of
// another chord (the diminished, the neighbouring chord, another diminished, a passing scale tone) and come back while
// the other voices hold. Graded note for note (the borrowed note and the return name their voice in the feedback),
// the chords by their pitch-class sets, the held voices by their length (MIDI).
//
// Pure and deterministic. Own exercises generated from the rules; nothing copied.

import { isVerified } from '../verifiedContent';
import type { Drill, DrillGoal, DrillSpec, ExpNote, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { autoFingering, itemIdOf, rhBase, sixLinePair } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import { finish as gFinish, guitarItemId, MAX_FRET, type Ev, type GN, type GuitarLevelDef } from './guitar';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
const mod = (n: number, m: number): number => ((n % m) + m) % m;
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const MAJ_N = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const MIN_N = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const SIG = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const pitchIn = (pc: number, lo: number): number => lo + mod(pc - lo, 12);

// ───────────────────────────── the scales ─────────────────────────────

export interface HScale {
  id: string;
  ints: number[];
  name: T2;
  /** Key signature: the parent major's offset from the tonic. */
  sig: number;
  minor?: boolean;
  /** Barry Harris diminished scales: the chord's tones (even indices; the diminished 7th on the odd ones). */
  chord?: number[];
  chordSym?: string;
}
export const H_SCALES: HScale[] = [
  { id: 'ionian', ints: [0, 2, 4, 5, 7, 9, 11], name: t('major', 'מז׳ור'), sig: 0 },
  { id: 'dorian', ints: [0, 2, 3, 5, 7, 9, 10], name: t('dorian', 'דורי'), sig: 10, minor: true },
  { id: 'phrygian', ints: [0, 1, 3, 5, 7, 8, 10], name: t('phrygian', 'פריגי'), sig: 8, minor: true },
  { id: 'lydian', ints: [0, 2, 4, 6, 7, 9, 11], name: t('lydian', 'לידי'), sig: 7 },
  { id: 'mixolydian', ints: [0, 2, 4, 5, 7, 9, 10], name: t('mixolydian', 'מיקסולידי'), sig: 5 },
  { id: 'aeolian', ints: [0, 2, 3, 5, 7, 8, 10], name: t('aeolian (natural minor)', 'איאולי (מינור טבעי)'), sig: 3, minor: true },
  { id: 'locrian', ints: [0, 1, 3, 5, 6, 8, 10], name: t('locrian', 'לוקרי'), sig: 1, minor: true },
  { id: 'harmonic', ints: [0, 2, 3, 5, 7, 8, 11], name: t('harmonic minor', 'מינור הרמוני'), sig: 3, minor: true },
  { id: 'melodic', ints: [0, 2, 3, 5, 7, 9, 11], name: t('melodic minor', 'מינור מלודי'), sig: 3, minor: true },
  { id: 'six-dim', ints: [0, 2, 4, 5, 7, 8, 9, 11], name: t('6th-diminished', 'שישית-מוקטן'), sig: 0, chord: [0, 4, 7, 9], chordSym: '6' },
  { id: 'six-dim-m', ints: [0, 2, 3, 5, 7, 8, 9, 11], name: t('minor 6th-diminished', 'מינור שישית-מוקטן'), sig: 3, minor: true, chord: [0, 3, 7, 9], chordSym: 'm6' },
  { id: 'dom-dim', ints: [0, 2, 4, 5, 7, 8, 10, 11], name: t('dominant 7th-diminished', 'דומיננט שביעית-מוקטן'), sig: 5, chord: [0, 4, 7, 10], chordSym: '7' },
  { id: 'dom5-dim', ints: [0, 2, 4, 5, 6, 8, 10, 11], name: t('7♭5-diminished', 'שביעית♭5-מוקטן'), sig: 5, chord: [0, 4, 6, 10], chordSym: '7♭5' },
];
/** Indices: the major scale and its modes; harmonic / melodic minor and the four Harris scales; the Harris scales. */
export const H_MODES = [0, 1, 2, 3, 4, 5, 6];
export const H_OTHERS = [7, 8, 9, 10, 11, 12];
export const H_HARRIS = [9, 10, 11, 12];

const scaleOf = (s: DrillSpec): HScale => H_SCALES[Math.min(H_SCALES.length - 1, Math.max(0, (s.option ?? 0) % 100))];
// The spelling of the seven diatonic modes (BUILD-PLAN phase 7: modes from the root in every key). A mode's tonic is
// the enharmonic name whose scale needs fewer accidentals (F♯ mixolydian, not G♭ with an F♭; a tie keeps the table's
// name: G♭ major, G♯ dorian), and the key signature is its parent major's, read from that spelling (G♯ dorian → F♯
// major), so the title and the staff never disagree. The major scale and the Aeolian come out as before.
const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
const SIG_OF: Record<string, string> = { C: 'C', G: 'G', D: 'D', A: 'A', E: 'E', B: 'B', 'F♯': 'F#', 'C♯': 'C#', F: 'F', 'B♭': 'Bb', 'E♭': 'Eb', 'A♭': 'Ab', 'D♭': 'Db', 'G♭': 'Gb', 'C♭': 'Cb' };
/** One letter per degree from a spelled tonic (as keyTheory.spellScale; local, so this generator imports no UI theory). */
export function spellH(tonic: string, ints: number[]): string[] {
  const li = LETTERS.indexOf(tonic[0]);
  const tAcc = tonic.slice(1) === '♭' ? -1 : tonic.slice(1) === '♯' ? 1 : 0;
  const tpc = mod(NATURAL[li] + tAcc, 12);
  return ints.map((iv, k) => {
    const l = (li + k) % 7;
    let d = mod(tpc + iv - NATURAL[l], 12);
    if (d > 6) d -= 12;
    return LETTERS[l] + (ACC[d] ?? '?');
  });
}
const accCount = (ns: string[]): number => ns.reduce((n, x) => n + (x.length - 1) * (/[𝄫𝄪]/u.test(x) ? 2 : 1), 0);
/** The other spelling of a black key (C♯ ↔ D♭ …). A natural tonic never needs more than 6 accidentals in a mode, so it stays. */
const TWIN: Record<string, string> = { 'C♯': 'D♭', 'D♭': 'C♯', 'D♯': 'E♭', 'E♭': 'D♯', 'F♯': 'G♭', 'G♭': 'F♯', 'G♯': 'A♭', 'A♭': 'G♯', 'A♯': 'B♭', 'B♭': 'A♯' };
const DIATONIC = (sc: HScale): number => (sc.chord ? -1 : H_MODES.find((i) => H_SCALES[i] === sc) ?? -1);
/** A scale's tonic name in a key. */
export function hTonic(key: number, sc: HScale): string {
  const base = (sc.minor ? MIN_N : MAJ_N)[mod(key, 12)];
  const twin = TWIN[base];
  if (DIATONIC(sc) < 0 || !twin) return base;
  return accCount(spellH(twin, sc.ints)) < accCount(spellH(base, sc.ints)) ? twin : base;
}
/** A scale's key signature in a key: the parent major's (the seven modes: from the spelled scale). */
export function hSig(key: number, sc: HScale): string {
  const m = DIATONIC(sc);
  if (m < 0) return SIG[mod(key + sc.sig, 12)];
  const parent = spellH(hTonic(key, sc), sc.ints)[(7 - m) % 7];
  return SIG_OF[parent] ?? SIG[mod(key + sc.sig, 12)];
}
const kName = hTonic;
const deg =(tonic: number, ints: number[], k: number): number => tonic + 12 * Math.floor(k / ints.length) + ints[mod(k, ints.length)];
const isHarris = (sc: HScale): boolean => !!sc.chord;

// ───────────────────────────── the ladder's music (instrument-free) ─────────────────────────────

// SPEC-KEY-SESSION §1 B2, B4, B5 (2026-11-23): 'ti' the triads on every degree in root position, 1st and 2nd inversion
// (block, one degree a bar of 3/4, one octave up and back); 'c4' the 1-2-3-5 cell from every degree (C-D-E-G, D-E-F-A …,
// Premier Guitar [V]), the cell turned over on the way down (G-E-D-C …); '9a' the diatonic 9th chord arpeggiated on
// every degree (C-E-G-B-D, D-F-A-C-E …). The seven-note scales only (the modes, harmonic and melodic minor).
export type HStep = 'line' | '3b' | '3t' | 'ta' | 'tb' | '7a' | '7b' | 'd2' | 'd3' | 'd24' | 'ti' | 'c4' | '9a';
export const H_STEPS: HStep[] = ['line', '3b', '3t', 'ta', 'tb', '7a', '7b', 'd2', 'd3'];
const STEP_T: Record<HStep, T2> = {
  line: t('note by note, up and down', 'צליל אחר צליל, עולה ויורד'),
  '3b': t('in 3rds, broken, up and down', 'בטרצות, שבורות, עולה ויורד'),
  '3t': t('in 3rds together, up and down', 'בטרצות יחד, עולה ויורד'),
  ta: t('triads on every degree, arpeggiated', 'משולשים על כל דרגה, בארפג׳יו'),
  tb: t('triads on every degree, block', 'משולשים על כל דרגה, בבלוק'),
  '7a': t('7th chords on every degree, arpeggiated', 'ספטאקורדים על כל דרגה, בארפג׳יו'),
  '7b': t('7th chords on every degree, block', 'ספטאקורדים על כל דרגה, בבלוק'),
  d2: t('7th chords in drop 2, up and down', 'ספטאקורדים בדרופ 2, עולה ויורד'),
  d3: t('7th chords in drop 3, up and down', 'ספטאקורדים בדרופ 3, עולה ויורד'),
  d24: t('7th chords in drop 2&4, up and down', 'ספטאקורדים בדרופ 2 ו־4, עולה ויורד'),
  ti: t('triads on every degree in root position, 1st and 2nd inversion', 'משולשים על כל דרגה במצב יסודי, בהיפוך ראשון ובהיפוך שני'),
  c4: t('1-2-3-5 cells from every degree, up and down', 'תאי 1-2-3-5 מכל דרגה, עולה ויורד'),
  '9a': t('9th chords on every degree, arpeggiated', 'אקורדי נונה על כל דרגה, בארפג׳יו'),
};

/** One onset of the ladder: pitches sounding together (low → high), its length, and the chord's pitch classes when it is a chord. */
export interface HEv {
  beat: number;
  dur: number;
  ps: number[];
  /** A graded chord (3+ notes): its pitch classes (required = allowed). */
  pcs?: number[];
  /** Harris scales: the line note is a chord tone. */
  ct?: boolean;
}

/** Degree span of a step: two octaves of the scale (N = 2 × notes) — `octs` 1 on the guitar's chord steps. */
export function ladderEvents(_key: number, sc: HScale, step: HStep, tonic: number, octs = 2): HEv[] {
  const n = sc.ints.length;
  const N = n * octs;
  const d = (k: number) => deg(tonic, sc.ints, k);
  const ctOf = (k: number) => (isHarris(sc) ? mod(k, 2) === 0 : undefined);
  const out: HEv[] = [];
  let b = 0;
  const push = (ps: number[], dur: number, extra: Partial<HEv> = {}) => {
    out.push({ beat: r6(b), dur, ps, ...extra });
    b += dur;
  };
  const upDown = (lo: number, hi: number): number[] => [...Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), ...Array.from({ length: hi - lo }, (_, i) => hi - 1 - i)];
  const chordAt = (k: number, size: 3 | 4): number[] => {
    // Melody on top: the degree's note with the scale's 3rds stacked under it (moving inversions on the Harris scales).
    const ps: number[] = [];
    for (let j = size - 1; j >= 0; j--) ps.push(d(k - 2 * j));
    return ps;
  };
  const pcsOf = (ps: number[]) => [...new Set(ps.map((p) => mod(p, 12)))].sort((a, c) => a - c);
  switch (step) {
    case 'line':
      for (const k of upDown(0, N)) push([d(k)], 0.5, { ct: ctOf(k) });
      break;
    case '3b':
      for (let k = 0; k <= N - 2; k++) {
        push([d(k)], 0.5, { ct: ctOf(k) });
        push([d(k + 2)], 0.5, { ct: ctOf(k + 2) });
      }
      for (let k = N; k >= 2; k--) {
        push([d(k)], 0.5, { ct: ctOf(k) });
        push([d(k - 2)], 0.5, { ct: ctOf(k - 2) });
      }
      break;
    case '3t':
      for (const k of upDown(0, N - 2)) push([d(k), d(k + 2)], 1);
      break;
    case 'ta':
    case '7a': {
      const sz = step === 'ta' ? 3 : 4;
      const u = 1 / (sz === 3 ? 3 : 2);
      const top = N - 2 * (sz - 1);
      for (let k = 0; k <= top; k++) for (let j = 0; j < sz; j++) push([d(k + 2 * j)], u, { ct: ctOf(k + 2 * j) });
      for (let k = N; k >= 2 * (sz - 1); k--) for (let j = 0; j < sz; j++) push([d(k - 2 * j)], u, { ct: ctOf(k - 2 * j) });
      break;
    }
    case 'ti': {
      // one octave: on every degree the root-position triad, then its 1st and 2nd inversions; down from the 7th degree
      // in the other order (2nd, 1st, root), home on the tonic triad
      const inv = (k: number, i: number): number[] => {
        const r = [d(k), d(k + 2), d(k + 4)];
        return i === 0 ? r : i === 1 ? [r[1], r[2], r[0] + 12] : [r[2], r[0] + 12, r[1] + 12];
      };
      for (let k = 0; k <= n; k++) for (let i = 0; i < 3; i++) push(inv(k, i), 1, { pcs: pcsOf(inv(k, i)) });
      for (let k = n - 1; k >= 0; k--) for (let i = 2; i >= 0; i--) push(inv(k, i), 1, { pcs: pcsOf(inv(k, i)) });
      break;
    }
    case 'c4':
      // the cell 1-2-3-5 from each degree up to the top (it lands on degree N), then turned over (5-3-2-1) from the one
      // below the top down to the tonic
      for (let k = 0; k <= N - 4; k++) for (const j of [0, 1, 2, 4]) push([d(k + j)], 0.5);
      for (let k = N - 5; k >= 0; k--) for (const j of [4, 2, 1, 0]) push([d(k + j)], 0.5);
      break;
    case '9a':
      // root, 3rd, 5th, 7th, 9th of each degree's diatonic 9th chord, up to the top; down from the 7th degree's chord
      for (let k = 0; k <= N - 8; k++) for (let j = 0; j < 5; j++) push([d(k + 2 * j)], 0.5);
      for (let k = N - 1; k >= 8; k--) for (let j = 0; j < 5; j++) push([d(k - 2 * j)], 0.5);
      break;
    case 'tb':
    case '7b':
    case 'd2':
    case 'd3':
    case 'd24': {
      const sz = step === 'tb' ? 3 : 4;
      for (const k of upDown(0, N)) {
        let ps = chordAt(k, sz);
        if (step === 'd2') ps = [ps[2] - 12, ps[0], ps[1], ps[3]];
        if (step === 'd3') ps = [ps[1] - 12, ps[0], ps[2], ps[3]];
        if (step === 'd24') ps = [ps[0] - 12, ps[2] - 12, ps[1], ps[3]];
        push(ps.slice().sort((a, c) => a - c), 1, { pcs: pcsOf(ps) });
      }
      break;
    }
  }
  if (out.length) out[out.length - 1].dur = Math.max(out[out.length - 1].dur, 1);
  return out;
}

/** The chord root under degree k's block chord (piano hands together: the LH root). */
function rootPc(key: number, sc: HScale, step: HStep, k: number): number {
  if (isHarris(sc)) return mod(k, 2) === 0 ? mod(key, 12) : mod(key + 11, 12);
  return mod(key + sc.ints[mod(k - (step === 'tb' ? 4 : 6), 7)], 12);
}

// ───────────────────────────── borrowing (oblique motion) ─────────────────────────────

export type BKind = 'one' | 'two' | 'three' | 'root' | 'chord' | 'out' | 'scale' | 'walk' | 'iivi' | 'std';
const VOICE_T = [t('soprano', 'סופרן'), t('alto', 'אלט'), t('tenor', 'טנור'), t('bass', 'בס')];
/** One borrowing note: pitch, timing, the voice (0 = top … 3 = bottom), the chord it belongs to (0 = a moving note). */
export interface BN {
  p: number;
  beat: number;
  dur: number;
  voice: number;
  /** Chord group id (> 0): the chord sounding at that onset; 0 = a borrowed / returning single note. */
  chord: number;
  hold?: boolean;
  ret?: boolean;
}
export interface BSeq {
  notes: BN[];
  /** Pitch classes of each chord group. */
  sets: Map<number, number[]>;
  beats: number;
  meter: number;
}

/** The borrowing sequence in close position (melody on top), 1 octave up and down the scale (or a progression). */
export function borrowSeq(key: number, sc: HScale, kind: BKind, param: number, top0: number): BSeq {
  const notes: BN[] = [];
  const sets = new Map<number, number[]>();
  let gid = 0;
  const scalePcs = sc.ints.map((x) => mod(x + key, 12));
  const inScale = (p: number) => scalePcs.includes(mod(p, 12));
  const stepDown = (p: number) => {
    let q = p - 1;
    while (!inScale(q)) q--;
    return q;
  };
  const stepUp = (p: number) => {
    let q = p + 1;
    while (!inScale(q)) q++;
    return q;
  };
  /** A half step outside the scale (a tone of another diminished chord); null when both neighbours are scale tones. */
  const outside = (p: number): number | null => (!inScale(p + 1) ? p + 1 : !inScale(p - 1) ? p - 1 : null);
  // one chord (voices low → high), held for `len` beats, with the moving voices' borrowed notes
  const chordWith = (b: number, len: number, v: number[], moves: { voice: number; to: number[] }[]) => {
    const id = ++gid;
    sets.set(id, [...new Set(v.map((p) => mod(p, 12)))].sort((a, c) => a - c));
    const byVoice = (vi: number) => v[v.length - 1 - vi];
    for (let vi = 0; vi < v.length; vi++) {
      const m = moves.find((x) => x.voice === vi && x.to.length);
      const p = byVoice(vi);
      if (!m) {
        notes.push({ p, beat: b, dur: len, voice: vi, chord: id, hold: moves.some((x) => x.to.length) });
        continue;
      }
      // The chord sounds first; the borrowed note(s) start a beat later (two beats in a 4-beat bar) and the return comes at
      // least a beat before the next chord, so no moving note sits on a chord's onset.
      const first = len >= 4 && m.to.length === 1 ? 2 : 1;
      notes.push({ p, beat: b, dur: first, voice: vi, chord: id });
      const each = m.to.length > 1 ? 0.5 : len - 1 - first;
      m.to.forEach((q, j) => notes.push({ p: q, beat: r6(b + first + j * each), dur: r6(each), voice: vi, chord: 0 }));
      const back = first + m.to.length * each;
      notes.push({ p, beat: r6(b + back), dur: r6(len - back), voice: vi, chord: 0, ret: true });
    }
  };
  if (kind === 'iivi' || kind === 'std') {
    // Barry's conversions: each chord as its 6th chord (Dm7 = F6, G7 = Dm6, Dø = Fm6, G7♭9 = A♭°7, C = C6); the
    // dominant borrows two voices from the diminished, the others one (rotating), each returning.
    const minorK = kind === 'iivi' && param === 1;
    const prog: [number, string][] =
      kind === 'iivi'
        ? minorK
          ? [[2, 'hd7'], [7, '7b9'], [0, 'm6'], [0, 'm6']]
          : [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']]
        : [[0, 'maj7'], [9, '7'], [2, 'm7'], [7, '7'], [4, 'm7'], [9, '7'], [2, 'm7'], [7, '7'], [0, 'maj7']];
    let top = top0;
    prog.forEach(([dd, q], i) => {
      const { home, dim } = sixLinePair(mod(key + dd, 12), q);
      // the top voice: the home tone nearest the last top (inside a 10th), then the chord closed under it
      let best = top;
      for (let x = top - 6; x <= top + 6; x++) if (home.includes(mod(x, 12)) && (Math.abs(x - top) < Math.abs(best - top) || !home.includes(mod(best, 12)))) best = x;
      top = best;
      const v = [top];
      for (let p = top - 1; v.length < 4; p--) if (home.includes(mod(p, 12))) v.push(p);
      v.sort((a, c) => a - c);
      const dimBelow = (p: number) => {
        for (let q = p - 1; q >= p - 2; q--) if (dim.includes(mod(q, 12))) return q;
        for (let q = p + 1; q <= p + 2; q++) if (dim.includes(mod(q, 12))) return q;
        return null;
      };
      const dom = q === '7' || q === '7b9';
      const voices = dom ? [0, 2] : [i % 4];
      const moves = voices.map((vi) => ({ voice: vi, to: [dimBelow(v[3 - vi])].filter((x): x is number => x !== null) }));
      chordWith(i * 4, 4, v, moves);
    });
    return { notes, sets, beats: prog.length * 4, meter: 4 };
  }
  // walking the scale of chords: 1 octave up, then down (17 chords)
  const n = sc.ints.length;
  const tonic = top0;
  const d = (k: number) => deg(tonic, sc.ints, k);
  const ks = [...Array.from({ length: n + 1 }, (_, i) => i), ...Array.from({ length: n }, (_, i) => n - 1 - i)];
  const len = kind === 'scale' ? 4 : 3;
  ks.forEach((k, i) => {
    const v = [d(k - 6), d(k - 4), d(k - 2), d(k)];
    const pv = (vi: number) => v[3 - vi];
    let moves: { voice: number; to: number[] }[] = [];
    if (kind === 'one') moves = [{ voice: param, to: [stepDown(pv(param))] }];
    else if (kind === 'two') moves = [param, param + 1].map((vi) => ({ voice: vi, to: [stepDown(pv(vi))] }));
    else if (kind === 'three') moves = [0, 1, 2, 3].filter((vi) => vi !== param).map((vi) => ({ voice: vi, to: [stepDown(pv(vi))] }));
    else if (kind === 'root') {
      // the dominant root borrowed into the diminished (a maj7 colour): at a dim degree, the voice on ♭6 falls to 5 and returns
      const vi = [0, 1, 2, 3].find((x) => mod(pv(x) - key, 12) === 8);
      moves = vi === undefined ? [] : [{ voice: vi, to: [pv(vi) - 1] }];
    }
    else if (kind === 'chord') moves = [{ voice: param, to: [stepUp(pv(param))] }];
    else if (kind === 'out') {
      const q = outside(pv(param));
      moves = [{ voice: param, to: q === null ? [] : [q] }];
    } else if (kind === 'scale') {
      const p = pv(param);
      moves = [{ voice: param, to: param === 0 ? [stepUp(p), stepUp(stepUp(p)), stepUp(p)] : [stepDown(p), stepDown(stepDown(p)), stepDown(p)] }];
    } else if (kind === 'walk') {
      const vi = i % 4;
      moves = [{ voice: vi, to: [i % 2 === 0 ? stepDown(pv(vi)) : stepUp(pv(vi))] }];
    }
    chordWith(i * len, len, v, moves);
  });
  return { notes, sets, beats: ks.length * len, meter: len };
}

/** Drop 2 / drop 3 of a borrowing sequence: the alto (drop 2) or the tenor (drop 3) an octave down, its moves too. */
export function dropSeq(seq: BSeq, drop: 0 | 2 | 3): BSeq {
  if (!drop) return seq;
  const vi = drop === 2 ? 1 : 2;
  return { ...seq, notes: seq.notes.map((x) => (x.voice === vi ? { ...x, p: x.p - 12 } : x)) };
}

const B_KIND_T: Record<BKind, (p: number) => T2> = {
  one: (p) => t(`the ${VOICE_T[p].en} borrows a step down and returns`, `ה${VOICE_T[p].he} שואל צעד למטה וחוזר`),
  two: (p) => t(`${VOICE_T[p].en} and ${VOICE_T[p + 1].en} borrow together and return`, `${VOICE_T[p].he} ו${VOICE_T[p + 1].he} שואלים יחד וחוזרים`),
  three: (p) => t(`three voices borrow, the ${VOICE_T[p].en} holds`, `שלושה קולות שואלים, ה${VOICE_T[p].he} מחזיק`),
  root: () => t('the dominant root borrowed into the diminished (a maj7 colour)', 'שורש הדומיננט מושאל אל המוקטן (צבע של maj7)'),
  chord: (p) => t(`the ${VOICE_T[p].en} borrows from the chord above and returns`, `ה${VOICE_T[p].he} שואל מהאקורד שמעל וחוזר`),
  out: (p) => t(`the ${VOICE_T[p].en} borrows from another diminished (a half step outside) and returns`, `ה${VOICE_T[p].he} שואל ממוקטן אחר (חצי טון מחוץ לסולם) וחוזר`),
  scale: (p) => t(`the ${VOICE_T[p].en} passes through the scale and returns`, `ה${VOICE_T[p].he} עובר דרך הסולם וחוזר`),
  walk: () => t('borrowing on every degree, voice by voice', 'השאלה על כל דרגה, קול אחר קול'),
  iivi: (p) => t(p === 1 ? 'minor ii–V–i: each chord borrows, the dominant from the diminished' : 'ii–V–I: each chord borrows, the dominant from the diminished', p === 1 ? 'ii–V–i מינורי: כל אקורד שואל, הדומיננט מהמוקטן' : 'ii–V–I: כל אקורד שואל, הדומיננט מהמוקטן'),
  std: () => t("a standard's turnaround (I–VI–ii–V, iii–VI–ii–V): each chord borrows", 'טרנאראונד של סטנדרט (I–VI–ii–V, ‏iii–VI–ii–V): כל אקורד שואל'),
};

/** Borrowing specs: kind 'bw-<kind>[-d2|-d3]', option = Harris scale (0–3) × 10 + voice / pair. */
function parseBorrow(s: DrillSpec): { kind: BKind; drop: 0 | 2 | 3; sc: HScale; param: number } {
  const m = /^bw-([a-z]+?)(?:-d([23]))?$/.exec(s.kind);
  const kind = (m?.[1] ?? 'one') as BKind;
  const drop = (m?.[2] ? Number(m[2]) : 0) as 0 | 2 | 3;
  const o = s.option ?? 0;
  const sc = H_SCALES[H_HARRIS[Math.min(3, Math.floor(o / 10))]];
  return { kind, drop, sc, param: Math.min(3, o % 10) };
}

// ───────────────────────────── piano ─────────────────────────────

class Notes {
  list: ExpNote[] = [];
  private cid = 0;
  add(beat: number, dur: number, hand: 'R' | 'L', ps: number[], extra: Partial<ExpNote> = {}): number | undefined {
    const id = ps.length > 1 ? ++this.cid : undefined;
    for (const p of ps) this.list.push({ pitch: p, beat: r6(beat), dur: r6(dur), hand, ...(id !== undefined ? { chordId: id } : {}), ...extra });
    return id;
  }
  /** A chord split between the hands: one chord id for both. */
  addSplit(beat: number, dur: number, parts: { hand: 'R' | 'L'; p: number; extra?: Partial<ExpNote> }[]): number {
    const id = ++this.cid;
    for (const x of parts) this.list.push({ pitch: x.p, beat: r6(beat), dur: r6(dur), hand: x.hand, chordId: id, ...(x.extra ?? {}) });
    return id;
  }
}

function pDrill(s: DrillSpec, n: Notes, title: T2, startBpm: number, goal: Partial<DrillGoal>, keySig: string, meter = 4): Drill {
  const notes = n.list.slice().sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  return {
    spec: { ...s },
    itemId: itemIdOf(s),
    title,
    notes,
    beats: r6(Math.max(...notes.map((x) => x.beat + x.dur))),
    meter,
    keySig,
    goal: { evenness: true, hands: s.hands === 'RL', ...goal },
    startBpm: s.tempo ?? startBpm,
  };
}

export function genHarmPiano(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  if (s.kind.startsWith('bw-')) return genBorrowPiano(s, key);
  if (s.kind.startsWith('sf-')) return genSixFivePiano(s);
  if (PART_D_KINDS.includes(s.kind)) return genPartDPiano(s);
  const sc = scaleOf(s);
  const step = s.kind.replace(/^hl-/, '') as HStep;
  const drop = step === 'd2' || step === 'd3' || step === 'd24';
  const chordStep = step === 'tb' || step === '7b' || step === 'ti' || drop;
  const tonic = chordStep ? pitchIn(key, drop ? 58 : step === 'ti' ? 52 : 59) : rhBase(key);
  const evs = ladderEvents(key, sc, step, tonic);
  // B2 / B4 / B5: every note spelled by the key (one letter per degree: F♯ in D, C♭ in G♭)
  const names = step === 'ti' || step === 'c4' || step === '9a' ? spellH(hTonic(key, sc), sc.ints) : null;
  const spellOf = (p: number): Partial<ExpNote> => {
    const k = names ? sc.ints.indexOf(mod(p - key, 12)) : -1;
    return k >= 0 ? { spell: names![k] } : {};
  };
  const n = new Notes();
  const sets: NonNullable<DrillGoal['chordSets']> = [];
  const fing = step === 'line' ? autoFingering(key, sc.ints) : null;
  const top = Math.max(...evs.map((e) => e.ps[0]));
  // the degree under each block chord, for the LH root (melody on top, k up then down)
  const N = sc.ints.length * 2;
  const ks = [...Array.from({ length: N + 1 }, (_, i) => i), ...Array.from({ length: N }, (_, i) => N - 1 - i)];
  evs.forEach((e, i) => {
    if (e.pcs) {
      let id: number;
      if (drop) id = n.addSplit(e.beat, e.dur, e.ps.map((p, j) => ({ hand: j === 0 || (step === 'd24' && j === 1) ? 'L' : 'R', p })));
      else if (names) id = n.addSplit(e.beat, e.dur, e.ps.map((p) => ({ hand: 'R' as const, p, extra: spellOf(p) })));
      else if (s.hands === 'RL') id = n.addSplit(e.beat, e.dur, [{ hand: 'L', p: pitchIn(rootPc(key, sc, step, ks[i]), 33) }, ...e.ps.map((p) => ({ hand: 'R' as const, p }))]);
      else id = n.add(e.beat, e.dur, 'R', e.ps)!;
      const pcs = s.hands === 'RL' && !drop ? [...new Set([...e.pcs, rootPc(key, sc, step, ks[i])])].sort((a, b) => a - b) : e.pcs;
      sets.push({ chordId: id, required: pcs, allowed: pcs });
    } else {
      const extra: Partial<ExpNote> = e.ps.length === 1 ? spellOf(e.ps[0]) : {};
      if (e.ct !== undefined) extra.chordTone = e.ct;
      if (fing && e.ps.length === 1) {
        const k = sc.ints.indexOf(mod(e.ps[0] - key, 12));
        if (k >= 0) extra.finger = e.ps[0] === top ? fing.rTop[k] : fing.r[k];
      }
      n.add(e.beat, e.dur, 'R', e.ps, extra);
    }
  });
  const harris = isHarris(sc) && (step === 'line' || step === '3b' || step === '7a');
  const goal: Partial<DrillGoal> = chordStep ? { evenness: false, chordSets: sets } : harris && step === 'line' ? { chordTonesOnBeats: true } : {};
  const hn = s.hands === 'RL' && !drop ? t(' · LH root', ' · שורש ביד שמאל') : t('', '');
  const title = t(`${kName(key, sc)} ${sc.name.en}: ${STEP_T[step].en}${hn.en}`, `${kName(key, sc)} ${sc.name.he}: ${STEP_T[step].he}${hn.he}`);
  const bpm = { line: 72, '3b': 66, '3t': 60, ta: 50, tb: 50, '7a': 60, '7b': 50, d2: 46, d3: 46, d24: 46, ti: 50, c4: 66, '9a': 60 }[step];
  return pDrill(s, n, title, bpm, goal, hSig(key, sc), step === 'ti' ? 3 : 4);
}

function genBorrowPiano(s: DrillSpec, key: number): Drill {
  const { kind, drop, sc, param } = parseBorrow(s);
  const prog = kind === 'iivi' || kind === 'std';
  const seq = dropSeq(borrowSeq(key, sc, kind, param, prog ? 72 : pitchIn(key, 64)), drop);
  const n = new Notes();
  const sets: NonNullable<DrillGoal['chordSets']> = [];
  const dropped = drop === 2 ? 1 : drop === 3 ? 2 : -1;
  const handOf = (v: number): 'R' | 'L' => (v === dropped ? 'L' : 'R');
  const groups = new Map<number, BN[]>();
  for (const x of seq.notes) {
    if (x.chord) groups.set(x.chord, [...(groups.get(x.chord) ?? []), x]);
    else n.add(x.beat, x.dur, handOf(x.voice), [x.p], { vox: x.voice, ...(x.ret ? { ret: true } : {}) });
  }
  for (const [g, xs] of groups) {
    const id = n.addSplit(xs[0].beat, 0, []);
    for (const x of xs) n.list.push({ pitch: x.p, beat: r6(x.beat), dur: r6(x.dur), hand: handOf(x.voice), chordId: id, vox: x.voice, ...(x.hold ? { hold: true } : {}) });
    sets.push({ chordId: id, required: seq.sets.get(g)!, allowed: seq.sets.get(g)! });
  }
  const sp: DrillSpec = { ...s, hands: drop ? 'RL' : 'R' };
  const dn = drop ? t(` · drop ${drop}`, ` · דרופ ${drop}`) : t('', '');
  const what = B_KIND_T[kind](param);
  const head = prog ? t(`Borrowing in ${MAJ_N[key]}`, `השאלה ב־${MAJ_N[key]}`) : t(`${kName(key, sc)}${sc.chordSym} ${sc.name.en} borrowing`, `השאלה ב${sc.name.he} ${kName(key, sc)}${sc.chordSym}`);
  return pDrill(sp, n, t(`${head.en}: ${what.en}${dn.en}`, `${head.he}: ${what.he}${dn.he}`), 50, { evenness: false, chordSets: sets, holds: 0.8 }, SIG[mod(key + (prog ? (kind === 'iivi' && param === 1 ? 3 : 0) : sc.sig), 12)], seq.meter);
}

// ───────────────────────────── guitar ─────────────────────────────

type P = { s: number; f: number };
const openOf = (tu: Tuning, s: number) => noteAt(tu, s, 0);

/** Every scale note of a two-octave run from the root on the lowest string, placed in one position (map pitch → place). */
function positionMap(tu: Tuning, key: number, sc: HScale, octs: number): { map: Map<number, P>; tonic: number; lo: number } {
  const low = tu.open.length;
  let f0 = mod(key - openOf(tu, low), 12);
  if (f0 === 0 && octs === 2 && sc.ints.length === 8) f0 = 12;
  const tonic = openOf(tu, low) + f0;
  const lo = Math.max(0, f0 - 1);
  const run = Array.from({ length: sc.ints.length * octs + 1 }, (_, k) => deg(tonic, sc.ints, k));
  const map = new Map<number, P>();
  let str = low;
  for (const p of run) {
    let got: P | null = null;
    for (let s = str; s >= 1 && !got; s--) {
      const f = p - openOf(tu, s);
      if (f >= Math.max(0, lo - 1) && f <= lo + 4 && f <= MAX_FRET) got = { s, f };
    }
    for (let s = str; s >= 1 && !got; s--) {
      const f = p - openOf(tu, s);
      if (f >= Math.max(0, lo - 1) && f <= lo + 5 && f <= MAX_FRET) got = { s, f };
    }
    if (!got) {
      let best: P | null = null;
      for (let s = low; s >= 1; s--) {
        const f = p - openOf(tu, s);
        if (f < 0 || f > MAX_FRET) continue;
        if (!best || Math.abs(f - (lo + 2)) < Math.abs(best.f - (lo + 2))) best = { s, f };
      }
      got = best!;
    }
    map.set(p, got);
    str = got.s;
  }
  return { map, tonic, lo };
}

/** A chord (pitches low → high) on one string set (strings low → high), the octave chosen near `center`; null if unplayable. */
export function placeOnSet(tu: Tuning, ps: number[], set: number[], center: number, span = 4): { places: P[]; shift: number } | null {
  let best: { places: P[]; shift: number; cost: number } | null = null;
  for (const shift of [-24, -12, 0, 12, 24]) {
    const places = ps.map((p, i) => ({ s: set[i], f: p + shift - openOf(tu, set[i]) }));
    if (places.some((x) => x.f < 0 || x.f > MAX_FRET)) continue;
    const fr = places.filter((x) => x.f > 0).map((x) => x.f);
    if (fr.length && Math.max(...fr) - Math.min(...fr) > span) continue;
    const mean = places.reduce((a, x) => a + x.f, 0) / places.length;
    const cost = Math.abs(mean - center);
    if (!best || cost < best.cost) best = { places, shift, cost };
  }
  return best ? { places: best.places, shift: best.shift } : null;
}

/** Guitar string sets: drop 2 on 4-3-2-1, 5-4-3-2, 6-5-4-3; drop 3 on 6-4-3-2, 5-3-2-1; triads on 3-2-1 … 6-5-4 (low → high). */
export const G_SETS = {
  d2: [[4, 3, 2, 1], [5, 4, 3, 2], [6, 5, 4, 3]],
  d3: [[6, 4, 3, 2], [5, 3, 2, 1]],
  // drop 2&4: the two dropped voices on the low strings, a string skipped under the top two
  d24: [[6, 5, 3, 2], [5, 4, 2, 1]],
  tri: [[3, 2, 1], [4, 3, 2], [5, 4, 3], [6, 5, 4]],
};
const setName = (set: number[]) => set.join('-');

export function genHarmGuitar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  if (s.kind.startsWith('bw-')) return genBorrowGuitar(s, tu, key);
  if (s.kind.startsWith('sf-')) return genSixFiveGuitar(s, tu);
  if (PART_D_KINDS.includes(s.kind)) return genPartDGuitar(s, tu);
  const sc = scaleOf(s);
  const step = s.kind.replace(/^hl-/, '') as HStep;
  const evs: Ev[] = [];
  let title: T2;
  const sig = hSig(key, sc);
  const lineStep = step === 'line' || step === '3b' || step === 'ta' || step === '7a' || step === 'c4' || step === '9a';
  if (lineStep || step === '3t') {
    const { map, tonic, lo } = positionMap(tu, key, sc, 2);
    for (const e of ladderEvents(key, sc, step, tonic, 2)) {
      if (e.ps.length === 1) {
        const pl = map.get(e.ps[0])!;
        evs.push({ beat: e.beat, dur: e.dur, notes: [{ ...pl, finger: Math.min(4, Math.max(1, pl.f - lo + 1)), ...(e.ct !== undefined ? { ct: e.ct } : {}) }] });
      } else {
        // 3rds as double stops on adjacent strings inside the position (or the nearest pair that fits)
        const [a, b] = e.ps;
        let got: GN[] | null = null;
        for (const tight of [true, false])
          for (let st = tu.open.length; st >= 2 && !got; st--) {
            const fa = a - openOf(tu, st);
            const fb = b - openOf(tu, st - 1);
            const ok = tight ? fa >= Math.max(0, lo - 1) && fb >= Math.max(0, lo - 1) && fa <= lo + 5 && fb <= lo + 5 : fa >= 0 && fb >= 0 && fa <= MAX_FRET && fb <= MAX_FRET;
            if (ok && Math.abs(fa - fb) <= 3) got = [{ s: st, f: fa }, { s: st - 1, f: fb }];
          }
        // anywhere on the neck: neighbouring strings or one string skipped, the nearest to the position
        if (!got) {
          let best: { g: GN[]; cost: number } | null = null;
          for (let st = tu.open.length; st >= 2; st--)
            for (const gap of [1, 2]) {
              if (st - gap < 1) continue;
              const fa = a - openOf(tu, st);
              const fb = b - openOf(tu, st - gap);
              if (fa < 0 || fb < 0 || fa > MAX_FRET || fb > MAX_FRET || Math.abs(fa - fb) > 4) continue;
              const cost = Math.abs((fa + fb) / 2 - (lo + 2)) + (gap - 1) * 2;
              if (!best || cost < best.cost) best = { g: [{ s: st, f: fa }, { s: st - gap, f: fb }], cost };
            }
          got = best?.g ?? null;
        }
        evs.push({ beat: e.beat, dur: e.dur, notes: got ?? [map.get(a)!] });
      }
    }
    title = t(`${kName(key, sc)} ${sc.name.en}: ${STEP_T[step].en} · in position`, `${kName(key, sc)} ${sc.name.he}: ${STEP_T[step].he} · במצב`);
  } else {
    // chords along the neck, one octave up and back: triads on 3 adjacent strings, 7ths in drop 2 / drop 3 on a set
    const set = step === 'tb' ? null : step === 'd3' ? G_SETS.d3[(s.position ?? 0) % 2] : step === 'd24' ? G_SETS.d24[(s.position ?? 0) % 2] : G_SETS.d2[step === '7b' ? 0 : (s.position ?? 0) % 3];
    const gStep: HStep = step === '7b' ? 'd2' : step;
    // the inversions climb from the root position: start them an octave lower (the D string's octave)
    const top = set ? pitchIn(key, openOf(tu, set[set.length - 1]) + 1) : pitchIn(key, openOf(tu, step === 'ti' ? 4 : 1));
    let center = 5;
    for (const e of ladderEvents(key, sc, gStep, top, 1)) {
      let pl: { places: P[]; shift: number } | null = null;
      if (set) pl = placeOnSet(tu, e.ps, set, center) ?? placeOnSet(tu, e.ps, set, center, 5);
      else {
        let bestCost = Infinity;
        for (const st of G_SETS.tri) {
          const x = placeOnSet(tu, e.ps, st, center);
          if (!x) continue;
          const mean = x.places.reduce((a, q) => a + q.f, 0) / 3;
          const cost = Math.abs(mean - center) + (st[2] === 1 ? 0 : 1);
          if (cost < bestCost) {
            bestCost = cost;
            pl = x;
          }
        }
      }
      if (!pl) continue;
      center = pl.places.reduce((a, q) => a + q.f, 0) / pl.places.length;
      evs.push({ beat: e.beat, dur: e.dur, notes: pl.places.map((q) => ({ ...q })) });
    }
    const where = set ? t(` · strings ${setName(set)}`, ` · מיתרים ${setName(set)}`) : t(' · 3-string sets', ' · קבוצות של 3 מיתרים');
    const st = step === '7b' ? t('7th chords on every degree, block (drop 2)', 'ספטאקורדים על כל דרגה, בבלוק (דרופ 2)') : STEP_T[step];
    title = t(`${kName(key, sc)} ${sc.name.en}: ${st.en}${where.en}`, `${kName(key, sc)} ${sc.name.he}: ${st.he}${where.he}`);
  }
  const chordStep = !lineStep && step !== '3t';
  const goal: Partial<DrillGoal> = chordStep ? { chordSets: chordSetsOf(evs, tu) } : {};
  return gFinish(s, tu, evs, { title, bpm: chordStep ? 50 : step === 'line' ? 72 : step === 'c4' ? 66 : 60, evenness: !chordStep, goal, keySig: sig, ...(step === 'ti' ? { meter: 3 } : {}) });
}

/** Chord sets of guitar chord events, in the order guitar finish() numbers them (events with 2+ notes). */
function chordSetsOf(evs: Ev[], tu: Tuning): NonNullable<DrillGoal['chordSets']> {
  const out: NonNullable<DrillGoal['chordSets']> = [];
  let id = 0;
  for (const e of evs) {
    if (e.notes.length < 2) continue;
    id++;
    if (e.notes.length < 3) continue;
    const pcs = [...new Set(e.notes.map((g) => mod(noteAt(tu, g.s, g.f), 12)))].sort((a, b) => a - b);
    out.push({ chordId: id, required: pcs, allowed: pcs });
  }
  return out;
}

function genBorrowGuitar(s: DrillSpec, tu: Tuning, key: number): Drill {
  const { kind, drop, sc, param } = parseBorrow(s);
  const d: 2 | 3 = drop === 3 ? 3 : 2;
  const set = d === 3 ? G_SETS.d3[(s.position ?? 0) % 2] : G_SETS.d2[(s.position ?? 0) % 3];
  const prog = kind === 'iivi' || kind === 'std';
  const seq = dropSeq(borrowSeq(key, sc, kind, param, prog ? 72 : pitchIn(key, 64)), d);
  const groups = new Map<number, BN[]>();
  for (const x of seq.notes) if (x.chord) groups.set(x.chord, [...(groups.get(x.chord) ?? []), x]);
  // each chord's moving notes follow the chord until the next chord
  const evs: Ev[] = [];
  let center = 5;
  const ids = [...groups.keys()].sort((a, b) => a - b);
  ids.forEach((g, gi) => {
    const xs = groups.get(g)!.slice().sort((a, b) => a.p - b.p);
    const b0 = xs[0].beat;
    const b1 = gi + 1 < ids.length ? groups.get(ids[gi + 1])![0].beat : seq.beats;
    const moving = seq.notes.filter((x) => !x.chord && x.beat > b0 - 1e-9 && x.beat < b1 - 1e-9);
    const pl = placeOnSet(tu, xs.map((x) => x.p), set, center) ?? placeOnSet(tu, xs.map((x) => x.p), set, center, 5);
    if (!pl) return;
    center = pl.places.reduce((a, q) => a + q.f, 0) / pl.places.length;
    const strOf = new Map(xs.map((x, i) => [x.voice, pl.places[i].s]));
    evs.push({ beat: b0, dur: Math.max(...xs.map((x) => x.dur)), notes: pl.places.map((q) => ({ ...q })) });
    for (const m of moving) {
      const st = strOf.get(m.voice)!;
      const f = m.p + pl.shift - openOf(tu, st);
      if (f < 0 || f > MAX_FRET) continue;
      evs.push({ beat: m.beat, dur: m.dur, notes: [{ s: st, f }] });
    }
  });
  evs.sort((a, b) => a.beat - b.beat);
  const what = B_KIND_T[kind](param);
  const head = prog ? t(`Borrowing in ${MAJ_N[key]}`, `השאלה ב־${MAJ_N[key]}`) : t(`${kName(key, sc)}${sc.chordSym} ${sc.name.en} borrowing`, `השאלה ב${sc.name.he} ${kName(key, sc)}${sc.chordSym}`);
  const title = t(`${head.en}: ${what.en} · drop ${d}, strings ${setName(set)}`, `${head.he}: ${what.he} · דרופ ${d}, מיתרים ${setName(set)}`);
  return gFinish(s, tu, evs, { title, bpm: 50, evenness: false, goal: { chordSets: chordSetsOf(evs, tu) }, meter: seq.meter, keySig: SIG[mod(key + (prog ? 0 : sc.sig), 12)] });
}

// ───────────────────────────── catalogues ─────────────────────────────

/** Path difficulty of the piano levels (path.ts KEYS_LEVEL_DIFF): lines and 3rds ~900–1100, triads and 7ths 1100–1350, drops and borrowing 1350–1650. */
export const K_HARM_DIFF: Record<string, number> = Object.fromEntries([900, 940, 980, 1010, 1050, 1090, 1110, 1140, 1170, 1200, 1230, 1260, 1300, 1340, 1380, 1450, 1520, 1600, 1360, 1400, 1440, 1480, 1540, 1600, 1650, 1560, 1580, 1600, 1620, 1640, 1670, 1700, 1450, 1500, 1620, 1460, 1500, 1520, 1680, 1480, 1420, 1690, 1320, 1350, 1150, 1180, 1400, 1430].map((d, i) => [`k-sharm-${i + 1}`, d]));

export function pianoScaleHarmFamily(): FamilyDef {
  const levels: LevelDef[] = [];
  const LV = (en: string, he: string, specs: SpecTemplate[], tempo: [number, number], diff: number) => {
    const level = levels.length + 1;
    const id = `k-sharm-${level}`;
    void diff;
    levels.push({ id, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: 'major', tempo });
  };
  const hl = (step: HStep, scales: number[], o: Partial<SpecTemplate> = {}): SpecTemplate[] => scales.map((i) => ({ family: 'k-sharm' as FamilyId, kind: `hl-${step}`, hands: 'R' as const, option: i, ...o }));
  const M = H_MODES;
  const O = H_OTHERS;
  LV('Note by note, 2 octaves up and down: major and the modes', 'צליל אחר צליל, 2 אוקטבות עולה ויורד: מז׳ור והמודוסים', hl('line', M), [60, 120], 900);
  LV('Note by note: harmonic and melodic minor, the four Harris diminished scales', 'צליל אחר צליל: מינור הרמוני ומלודי, ארבעת סולמות המוקטן של האריס', hl('line', O), [60, 120], 940);
  LV('Diatonic 3rds, broken: major and the modes', 'טרצות דיאטוניות, שבורות: מז׳ור והמודוסים', hl('3b', M), [60, 110], 980);
  LV('Diatonic 3rds, broken: minor and the Harris scales', 'טרצות דיאטוניות, שבורות: מינור וסולמות האריס', hl('3b', O), [60, 110], 1010);
  LV('3rds together: major and the modes', 'טרצות יחד: מז׳ור והמודוסים', hl('3t', M), [50, 90], 1050);
  LV('3rds together: minor and the Harris scales', 'טרצות יחד: מינור וסולמות האריס', hl('3t', O), [50, 90], 1090);
  LV('Triads on every degree, arpeggiated: major and the modes', 'משולשים על כל דרגה, בארפג׳יו: מז׳ור והמודוסים', hl('ta', M), [50, 90], 1110);
  LV('Triads arpeggiated: minor and the Harris scales', 'משולשים בארפג׳יו: מינור וסולמות האריס', hl('ta', O), [50, 90], 1140);
  LV('Block triads, melody on top: major and the modes', 'משולשים בבלוק, המנגינה למעלה: מז׳ור והמודוסים', hl('tb', M), [40, 80], 1170);
  LV('Block triads: minor and the Harris scales; LH root under them', 'משולשים בבלוק: מינור וסולמות האריס; שורש ביד שמאל', [...hl('tb', O), ...hl('tb', [0, 9], { hands: 'RL' })], [40, 80], 1200);
  LV('7th chords on every degree, arpeggiated: major and the modes', 'ספטאקורדים על כל דרגה, בארפג׳יו: מז׳ור והמודוסים', hl('7a', M), [50, 96], 1230);
  LV('7th chords arpeggiated: minor; the Harris scales chord and diminished in turn', 'ספטאקורדים בארפג׳יו: מינור; בסולמות האריס אקורד ומוקטן לסירוגין', hl('7a', O), [50, 96], 1260);
  LV('Block 7th chords, LH root: major and the modes', 'ספטאקורדים בבלוק, שורש ביד שמאל: מז׳ור והמודוסים', hl('7b', M, { hands: 'RL' }), [40, 76], 1300);
  LV('Block 7th chords: minor; the Harris scales in moving inversions (C6, B°7 …)', 'ספטאקורדים בבלוק: מינור; סולמות האריס בהיפוכים נעים (C6, ‏B°7 …)', [...hl('7b', O, { hands: 'RL' }), ...hl('7b', H_HARRIS)], [40, 76], 1340);
  LV('Drop 2 up and down the scale: major and the modes', 'דרופ 2 לאורך הסולם: מז׳ור והמודוסים', hl('d2', M, { hands: 'RL' }), [40, 72], 1380);
  LV('Drop 2: harmonic and melodic minor, the Harris scales', 'דרופ 2: מינור הרמוני ומלודי, סולמות האריס', hl('d2', O, { hands: 'RL' }), [40, 72], 1450);
  LV('Drop 3 up and down the scale: major and the modes', 'דרופ 3 לאורך הסולם: מז׳ור והמודוסים', hl('d3', M, { hands: 'RL' }), [40, 72], 1520);
  LV('Drop 3: harmonic and melodic minor, the Harris scales', 'דרופ 3: מינור הרמוני ומלודי, סולמות האריס', hl('d3', O, { hands: 'RL' }), [40, 72], 1600);
  // Borrowing (oblique motion) on the four Harris scales
  const bw = (kind: string, option: number, hands: 'R' | 'RL' = 'R'): SpecTemplate => ({ family: 'k-sharm', kind: `bw-${kind}`, hands, option });
  LV('Borrowing: one voice steps to the other chord and returns — soprano, alto, tenor, bass (6th-diminished)', 'השאלה: קול אחד עובר לאקורד השני וחוזר — סופרן, אלט, טנור, בס (שישית-מוקטן)', [0, 1, 2, 3].map((v) => bw('one', v)), [40, 72], 1360);
  LV('Borrowing, one voice: minor 6th, dominant 7th and 7♭5 diminished scales', 'השאלה, קול אחד: סולמות מינור 6, דומיננט 7 ו־7♭5 מוקטן', [1, 2, 3].flatMap((sc) => [0, 3].map((v) => bw('one', sc * 10 + v))), [40, 72], 1400);
  LV('Two voices borrow together and return', 'שני קולות שואלים יחד וחוזרים', [0, 1, 2].flatMap((p) => [bw('two', p), bw('two', 10 + p)]), [40, 72], 1440);
  LV('Borrowing from the chord above, from another diminished, and passing through the scale', 'השאלה מהאקורד שמעל, ממוקטן אחר, ומעבר דרך הסולם', [bw('chord', 0), bw('chord', 1), bw('out', 0), bw('out', 2), bw('scale', 0), bw('scale', 3), bw('chord', 10), bw('scale', 10)], [40, 72], 1480);
  LV("Borrowing while walking the scale, over ii–V–I and a standard's turnaround", 'השאלה בהליכה לאורך הסולם, על ii–V–I ועל טרנאראונד של סטנדרט', [bw('walk', 0), bw('walk', 10), bw('walk', 20), bw('walk', 30), bw('iivi', 0), bw('iivi', 1), bw('std', 0)], [40, 72], 1540);
  LV('Borrowing in drop 2', 'השאלה בדרופ 2', [bw('one-d2', 1, 'RL'), bw('two-d2', 0, 'RL'), bw('chord-d2', 0, 'RL'), bw('scale-d2', 0, 'RL'), bw('walk-d2', 0, 'RL'), bw('walk-d2', 10, 'RL'), bw('walk-d2', 20, 'RL'), bw('walk-d2', 30, 'RL'), bw('iivi-d2', 0, 'RL')], [40, 66], 1600);
  LV('Borrowing in drop 3', 'השאלה בדרופ 3', [bw('one-d3', 2, 'RL'), bw('two-d3', 1, 'RL'), bw('chord-d3', 0, 'RL'), bw('scale-d3', 0, 'RL'), bw('walk-d3', 0, 'RL'), bw('walk-d3', 10, 'RL'), bw('walk-d3', 20, 'RL'), bw('walk-d3', 30, 'RL'), bw('std-d3', 0, 'RL')], [40, 66], 1650);
  // Eight expressions of one dominant (BARRY-HARRIS-THEORY.md §4) — after the four diminished scales.
  const sf = (kind: string, option: number, hands: 'R' | 'RL' = 'RL'): SpecTemplate => ({ family: 'k-sharm', kind, hands, option });
  LV('Eight expressions of one dominant: the four brothers, the four minor 6ths, then all eight in drop 2, each to I6', 'שמונה ביטויים לדומיננט אחד: ארבעת האחים, ארבעת המינור 6, ואז כל השמונה בדרופ 2, כל אחד אל I6', [sf('sf-voice', 0), sf('sf-voice', 1), sf('sf-voice', 2)], [40, 72], 1560);
  LV('Each brother’s 7th-diminished scale over V–I', 'סולם השביעית־מוקטן של כל אח על V–I', [0, 1, 2, 3].map((o) => sf('sf-line', o, 'R')), [60, 120], 1580);
  LV('Each minor 6th’s scale over V–I', 'הסולם של כל מינור 6 על V–I', [4, 5, 6, 7].map((o) => sf('sf-line', o, 'R')), [60, 120], 1600);
  LV('Mixing the expressions per bar; the important minor as one sound over ii–V', 'ערבוב הביטויים לפי תיבה; המינור החשוב כצליל אחד על ii–V', [sf('sf-line', 8, 'R'), sf('sf-line', 9, 'R')], [60, 120], 1620);
  LV('Comping a turnaround and a jazz blues with the substitutions', 'ליווי טרנאראונד ובלוז ג׳אז עם התחליפים', [sf('sf-comp', 0), sf('sf-comp', 1)], [50, 100], 1640);
  LV('Borrowing inside the substitutions: the minor 6th and the tritone brother', 'השאלה בתוך התחליפים: המינור 6 והאח בטריטון', [sf('sf-borrow', 0, 'R'), sf('sf-borrow', 1, 'R')], [40, 72], 1670);
  LV('Minor ii–V–i: the half-diminished and the V as minor 6ths, then the diminished — voicings and lines', 'ii–V–i מינורי: החצי־מוקטן וה־V כמינור 6, ואז המוקטן — קולות וקווים', [sf('sf-minor', 0), sf('sf-minor', 1, 'R')], [40, 100], 1700);
  // BARRY-HARRIS-METHOD.md Part D (D3, D4, D6, D7, D11, D12) and drop 2&4 on the four key scales.
  const pd = (kind: string, option: number, hands: 'R' | 'RL' = 'RL'): SpecTemplate => ({ family: 'k-sharm', kind, hands, option });
  // The elevator from the tonic only (owner 2026-11-15: how Echols builds it; the outer-voice interval rule holds there).
  LV('The elevator: from a unison on the tonic up the nine floors and back (6th-diminished)', 'המעלית: מיוניסון על הטוניקה במעלה תשע הקומות וחזרה (שישית־מוקטן)', [pd('cm-expand', 0), pd('cm-elevator', 0)], [40, 72], 1450);
  LV('The 7th-dim and 7♭5-dim scales in drop 2 and drop 3 over V7 → I', 'סולמות השביעית־מוקטן ו־7♭5־מוקטן בדרופ 2 ובדרופ 3 על V7 ← I', [0, 1, 2, 3].map((o) => pd('v7-d2', o)), [40, 72], 1500);
  LV('Drop 2&4 on the four key scales', 'דרופ 2 ו־4 על ארבעת סולמות המפתח', H_HARRIS.map((i) => ({ family: 'k-sharm' as FamilyId, kind: 'hl-d24', hands: 'RL' as const, option: i })), [40, 72], 1620);
  LV('The sixth on the fifth: the major 6 on the 5th over the root', 'השישית על הקווינטה: מז׳ור 6 על הקווינטה מעל השורש', [pd('sixth5', 0), pd('sixth5', 1)], [40, 72], 1460);
  LV("Harris's moves: the first movement, the next move, major – minor – minor/6", 'המהלכים של האריס: התנועה הראשונה, המהלך הבא, מז׳ור – מינור – מינור/6', [pd('mv-first', 0), pd('mv-next', 0, 'R'), pd('mv-mmm', 0)], [40, 72], 1500);
  LV('Borrowing with three voices; the dominant root borrowed into the diminished', 'השאלה בשלושה קולות; שורש הדומיננט מושאל אל המוקטן', [{ family: 'k-sharm' as FamilyId, kind: 'bw-three', hands: 'R' as const, option: 3 }, { family: 'k-sharm' as FamilyId, kind: 'bw-three', hands: 'R' as const, option: 10 }, { family: 'k-sharm' as FamilyId, kind: 'bw-root', hands: 'R' as const, option: 0 }, { family: 'k-sharm' as FamilyId, kind: 'bw-root', hands: 'R' as const, option: 20 }], [40, 72], 1520);
  LV("The four related dominants over a shell; the tritone's minor resolving", 'ארבע הדומיננטות הקרובות מעל שלד; המינור של הטריטון נפתר', [pd('shell4', 0), pd('tm-res', 0)], [40, 72], 1680);
  LV(isVerified('item:el-borrow') ? 'The elevator in minor 6th-diminished; borrowing through the elevator' : 'The elevator in minor 6th-diminished, from the tonic', isVerified('item:el-borrow') ? 'המעלית במינור שישית־מוקטן; השאלה דרך המעלית' : 'המעלית במינור שישית־מוקטן, מהטוניקה', [pd('cm-expand', 8), pd('cm-elevator', 1), pd('el-borrow', 0), pd('el-borrow', 1)], [40, 72], 1480);
  LV(
    isVerified('item:vl-ladder:0') ? 'The voicing ladder: thirds, triads, shells, octave chords on the 6th-diminished scales' : 'The shells on the 6th-diminished scales: upper (drop 3) and lower (drop 2) without the left hand',
    isVerified('item:vl-ladder:0') ? 'סולם הקולות: טרצות, משולשים, שלדים, אקורדי אוקטבה על סולמות השישית־מוקטן' : 'השלדים על סולמות השישית־מוקטן: עליון (דרופ 3) ותחתון (דרופ 2) בלי יד שמאל',
    [0, 1, 2, 8, 3, 6, 9, 7].map((x) => pd('vl-ladder', x)),
    [40, 80],
    1420,
  );
  LV('A substitute on each V of a tune: itself, the family, the important minor, the tritone’s minor', 'תחליף על כל V של שיר: עצמו, המשפחה, המינור החשוב, המינור של הטריטון', [pd('sub-tune', 0), pd('sub-tune', 1)], [50, 100], 1690);
  // SPEC-KEY-SESSION §1 B2, B4, B5 (2026-11-23), appended so the levels above keep their ids and items: triad inversions
  // through the scale, the 1-2-3-5 cells and the 9th arpeggios (odd: major and the modes; even: harmonic and melodic minor).
  const MIN = [7, 8];
  LV('Triads on every degree in root position, 1st and 2nd inversion: major and the modes', 'משולשים על כל דרגה במצב יסודי, בהיפוך ראשון ובהיפוך שני: מז׳ור והמודוסים', hl('ti', M), [40, 80], 1320);
  LV('Triad inversions on every degree: harmonic and melodic minor', 'היפוכי משולשים על כל דרגה: מינור הרמוני ומלודי', hl('ti', MIN), [40, 80], 1350);
  LV('1-2-3-5 cells from every degree, 2 octaves up and down: major and the modes', 'תאי 1-2-3-5 מכל דרגה, 2 אוקטבות עולה ויורד: מז׳ור והמודוסים', hl('c4', M), [60, 120], 1150);
  LV('1-2-3-5 cells from every degree: harmonic and melodic minor', 'תאי 1-2-3-5 מכל דרגה: מינור הרמוני ומלודי', hl('c4', MIN), [60, 120], 1180);
  LV('9th chords on every degree, arpeggiated: major and the modes', 'אקורדי נונה על כל דרגה, בארפג׳יו: מז׳ור והמודוסים', hl('9a', M), [50, 100], 1400);
  LV('9th arpeggios on every degree: harmonic and melodic minor', 'ארפג׳יו נונות על כל דרגה: מינור הרמוני ומלודי', hl('9a', MIN), [50, 100], 1430);
  return { id: 'k-sharm', title: t('Scale harmonization and borrowing', 'הרמוניזציה של סולמות והשאלה'), style: 'both', levels };
}

export function guitarHarmLevels(): GuitarLevelDef[] {
  const out: GuitarLevelDef[] = [];
  const LV = (en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string, grade: number) => {
    const level = out.length + 1;
    out.push({ id: `g-harm-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: 'major', tempo, sub, grade });
  };
  const ALL = H_SCALES.map((_, i) => i);
  const g = (kind: string, option: number, position?: number): SpecTemplate => ({ family: 'g-harm', kind, hands: 'R', instrument: 'guitar', option, ...(position !== undefined ? { position } : {}) });
  const hl = (step: HStep, scales = ALL, position?: number) => scales.map((i) => g(`hl-${step}`, i, position));
  LV('Every scale note by note, two octaves in position, up and down', 'כל סולם צליל אחר צליל, שתי אוקטבות במצב, עולה ויורד', hl('line'), [60, 120], '8ths', 3);
  LV('Diatonic 3rds, broken, in position', 'טרצות דיאטוניות, שבורות, במצב', hl('3b'), [60, 110], '8ths', 4);
  LV('Diatonic 3rds as double stops', 'טרצות דיאטוניות כצלילים כפולים', hl('3t'), [50, 90], 'quarters', 5);
  LV('Triads on every degree, arpeggiated in position', 'משולשים על כל דרגה, בארפג׳יו במצב', hl('ta'), [50, 90], 'triplets', 5);
  LV('Block triads on 3-string sets along the neck', 'משולשים בבלוק על קבוצות של 3 מיתרים לאורך הצוואר', hl('tb'), [40, 80], 'quarters', 6);
  LV('7th arpeggios on every degree, in position', 'ארפג׳יו ספטימה על כל דרגה, במצב', hl('7a'), [50, 96], '8ths', 6);
  LV('7th chords on every degree in drop 2, strings 4-3-2-1', 'ספטאקורדים על כל דרגה בדרופ 2, מיתרים 4-3-2-1', hl('7b'), [40, 76], 'quarters', 7);
  LV('Drop 2 on strings 5-4-3-2 and 6-5-4-3', 'דרופ 2 על מיתרים 5-4-3-2 ו־6-5-4-3', [...hl('d2', ALL, 1), ...hl('d2', ALL, 2)], [40, 72], 'quarters', 8);
  LV('Drop 3 on strings 6-4-3-2 and 5-3-2-1; drop 2&4 on 6-5-3-2 and 5-4-2-1 (the four key scales)', 'דרופ 3 על מיתרים 6-4-3-2 ו־5-3-2-1; דרופ 2 ו־4 על 6-5-3-2 ו־5-4-2-1 (ארבעת סולמות המפתח)', [...hl('d3', ALL, 0), ...hl('d3', ALL, 1), ...hl('d24', H_HARRIS, 0), ...hl('d24', H_HARRIS, 1)], [40, 72], 'quarters', 8);
  LV('Borrowing in drop 2 (4-3-2-1): one voice at a time, all four Harris scales', 'השאלה בדרופ 2 (4-3-2-1): קול אחד בכל פעם, ארבעת סולמות האריס', [0, 1, 2, 3].map((v) => g('bw-one', v)).concat([1, 2, 3].map((sc) => g('bw-one', sc * 10))), [40, 72], 'quarters', 8);
  LV('Borrowing: two voices, the chord above, another diminished, a passing scale tone', 'השאלה: שני קולות, האקורד שמעל, מוקטן אחר, צליל סולם עובר', [g('bw-two', 0), g('bw-two', 11), g('bw-chord', 0), g('bw-out', 0), g('bw-scale', 0), g('bw-chord', 10)], [40, 72], 'quarters', 8);
  LV("Borrowing while walking the scale, over ii–V–I and a standard's turnaround", 'השאלה בהליכה לאורך הסולם, על ii–V–I ועל טרנאראונד של סטנדרט', [g('bw-walk', 0), g('bw-walk', 10), g('bw-walk', 20), g('bw-walk', 30), g('bw-iivi', 0), g('bw-iivi', 1), g('bw-std', 0)], [40, 72], 'quarters', 9);
  LV('Borrowing on other string sets: drop 2 on 5-4-3-2 and 6-5-4-3, drop 3 on 6-4-3-2 and 5-3-2-1', 'השאלה על קבוצות מיתרים נוספות: דרופ 2 על 5-4-3-2 ו־6-5-4-3, דרופ 3 על 6-4-3-2 ו־5-3-2-1', [g('bw-walk', 0, 1), g('bw-walk', 10, 2), g('bw-walk-d3', 0, 0), g('bw-walk-d3', 10, 1), g('bw-iivi-d3', 0, 0)], [40, 66], 'quarters', 9);
  // SPEC-KEY-SESSION §1 B2, B4, B5 (2026-11-23), appended: the seven-note scales (the modes, harmonic and melodic minor)
  const SEVEN = [...H_MODES, 7, 8];
  LV('Triads on every degree in root position, 1st and 2nd inversion, on 3-string sets', 'משולשים על כל דרגה במצב יסודי, בהיפוך ראשון ובהיפוך שני, על קבוצות של 3 מיתרים', hl('ti', SEVEN), [40, 80], 'quarters', 7);
  LV('1-2-3-5 cells from every degree, two octaves in position', 'תאי 1-2-3-5 מכל דרגה, שתי אוקטבות במצב', hl('c4', SEVEN), [60, 120], '8ths', 5);
  LV('9th chords on every degree, arpeggiated in position', 'אקורדי נונה על כל דרגה, בארפג׳יו במצב', hl('9a', SEVEN), [50, 100], '8ths', 7);
  return out;
}

// ───────────────────────────── eight expressions of one dominant (docs/BARRY-HARRIS-THEORY.md §4, §6.5) ─────────────────────────────
//
// A G7 that resolves to C can be played as any of 8 chords, each with its own 6th-diminished scale: the four brother
// dominants a minor 3rd apart (G7, B♭7, D♭7, E7 — their dominant 7th-dim scales share C° = A°7) and the four minor
// 6ths on their 5ths (Dm6, Fm6, A♭m6, Bm6 — their minor 6th-dim scales share D♭° = G°7). The third dim, D° = B°7, is
// G7♭9 rootless. Over a G bass: G7 plain; B♭7 ♭9 + ♯9; D♭7 altered, the tritone sub; E7 13♭9; Dm6 natural 9 and 13
// (and it serves Dm7 too, so the ii–V is one sound); Fm6 sus♭9; A♭m6 altered ♭9 ♭13; Bm6 only with the bass on E (E9),
// since over G its F♯ is a major 7th. Dm7 → F6, Dø → Fm6, G7♭9 → A♭°7, consistent with sixLinePair / sixPair.

/** A chord or a line note of these drills: pitches (upper voices), the bass (piano LH), its pitch classes. */
interface SfEv {
  beat: number;
  dur: number;
  ps: number[];
  bass?: number;
  pcs?: number[];
  ct?: boolean;
}
const pcsOfInts = (ints: number[], r: number) => [...new Set(ints.map((x) => mod(x + r, 12)))];
/** A close 4-note chord of `pcs` with its top voice the chord tone nearest `aim` (inside lo…hi). */
function closeNear(pcs: number[], aim: number, lo = 67, hi = 79): number[] {
  let top = aim;
  for (let d = 0; d <= 12; d++) {
    if (aim - d >= lo && pcs.includes(mod(aim - d, 12))) {
      top = aim - d;
      break;
    }
    if (aim + d <= hi && pcs.includes(mod(aim + d, 12))) {
      top = aim + d;
      break;
    }
  }
  const v = [top];
  for (let p = top - 1; v.length < 4; p--) if (pcs.includes(mod(p, 12))) v.push(p);
  return v.sort((a, b) => a - b);
}
const drop2Of = (v: number[]) => [v[2] - 12, v[0], v[1], v[3]].sort((a, b) => a - b);

/** A chord and its diminished as an 8th-note line over `bars`, the chord's tones on the beats, turning at the edges. */
function sixLine(bars: { home: number[]; dim: number[] }[], start = 72): SfEv[] {
  const out: SfEv[] = [];
  let prev = start;
  let dir = -1;
  bars.forEach((b, bi) => {
    const scale = [...b.home, ...b.dim];
    const last = bi === bars.length - 1;
    // the bar starts on a home tone: the nearest one beyond the last note, in the line's direction (bar 1: at the start)
    let p = prev;
    if (bi === 0) {
      for (let d = 0; d <= 6; d++)
        if (b.home.includes(mod(prev - d, 12))) {
          p = prev - d;
          break;
        }
    } else
      for (let d = 1; d <= 12; d++)
        if (b.home.includes(mod(prev + dir * d, 12))) {
          p = prev + dir * d;
          break;
        }
    const nn = last ? 5 : 8;
    for (let i = 0; i < nn; i++) {
      if (i > 0) {
        if (p + dir * 3 < 58 || p + dir * 3 > 86) dir = -dir;
        do p += dir;
        while (!scale.includes(mod(p, 12)));
      }
      out.push({ beat: bi * 4 + i / 2, dur: last && i === nn - 1 ? 2 : 0.5, ps: [p], ct: i % 2 === 0 });
    }
    prev = p;
    dir = -dir;
  });
  return out;
}

/** The eight expressions of the V (offsets from V's root): the chord's root and type, the bass, the colour. */
export const EXPRESSIONS: { r: number; m6: boolean; bass: number; en: string; he: string }[] = [
  { r: 0, m6: false, bass: 0, en: 'the plain dominant', he: 'הדומיננט הפשוט' },
  { r: 3, m6: false, bass: 0, en: '♭9 and ♯9, the backdoor sound', he: '♭9 ו־♯9, צליל הדלת האחורית' },
  { r: 6, m6: false, bass: 0, en: 'altered, the tritone sub', he: 'אלטרד, תחליף הטריטון' },
  { r: 9, m6: false, bass: 0, en: '13♭9', he: '13♭9' },
  { r: 7, m6: true, bass: 0, en: 'the important minor: natural 9 and 13', he: 'המינור החשוב: 9 ו־13 טבעיים' },
  { r: 10, m6: true, bass: 0, en: 'sus♭9', he: 'sus♭9' },
  { r: 1, m6: true, bass: 0, en: 'the tritone’s minor: altered ♭9 and ♭13', he: 'המינור של הטריטון: אלטרד, ♭9 ו־♭13' },
  { r: 4, m6: true, bass: 9, en: 'over the bass on the 6th (as its 9th chord)', he: 'מעל בס על הדרגה השישית (כאקורד 9 שלו)' },
];
/** An expression's chord pitch classes and its 6th-diminished scale (dominant: the dim a whole step up; m6: a half step down). */
export function exprOf(V: number, i: number): { pcs: number[]; home: number[]; dim: number[]; bass: number; name: string } {
  const e = EXPRESSIONS[i];
  const r = mod(V + e.r, 12);
  const home = e.m6 ? pcsOfInts([0, 3, 7, 9], r) : pcsOfInts([0, 4, 7, 10], r);
  const dim = e.m6 ? pcsOfInts([11, 2, 5, 8], r) : pcsOfInts([2, 5, 8, 11], r);
  return { pcs: home, home, dim, bass: mod(V + e.bass, 12), name: `${(e.m6 && [7, 10, 4].includes(e.r) ? MIN_N : MAJ_N)[r]}${e.m6 ? 'm6' : '7'}` };
}

const SF_T = {
  voice: [t('the four brother dominants over the V, each to I6', 'ארבע הדומיננטות האחיות על ה־V, כל אחת אל I6'), t('the four minor 6ths on their 5ths over the V, each to I6', 'ארבעת המינור 6 על הקווינטות שלהן על ה־V, כל אחד אל I6'), t('all eight expressions of the V in drop 2, each to I6', 'כל שמונת הביטויים של ה־V בדרופ 2, כל אחד אל I6')],
  mix: t('mixing per bar: four expressions of the V, then I6', 'ערבוב לפי תיבה: ארבעה ביטויים של ה־V, ואז I6'),
  one: t('the important minor over the whole ii–V, one sound, then I6', 'המינור החשוב על כל ה־ii–V, צליל אחד, ואז I6'),
  comp: [t('comping a turnaround: the important minors, then the tritone’s minors', 'ליווי טרנאראונד: המינורים החשובים, ואז המינורים של הטריטון'), t('comping a jazz blues with the important and the tritone’s minors', 'ליווי בלוז ג׳אז עם המינור החשוב והמינור של הטריטון')],
  borrow: [t('borrowing inside the important minor', 'השאלה בתוך המינור החשוב'), t('borrowing inside the tritone brother’s scale', 'השאלה בתוך הסולם של האח בטריטון')],
  minor: [t('minor ii–V–i: the ø as the m6 a minor 3rd up, the V as the m6 a half step up, then as its diminished', 'ii–V–i מינורי: ה־ø כמינור 6 טרצה קטנה למעלה, ה־V כמינור 6 חצי טון למעלה, ואז כמוקטן שלו'), t('minor ii–V–i lines through the m6 and diminished scales', 'קווי ii–V–i מינורי דרך סולמות המינור 6 והמוקטן')],
};

/** The drills' music (key = the key of I). */
export function sfEvents(key: number, kind: string, option: number): { evs: SfEv[]; title: T2; line: boolean; minor?: boolean } {
  const k = mod(key, 12);
  const o = option;
  const bassOf = (pc: number) => pitchIn(pc, 36);
  const chordEvs = (seq: { pcs: number[]; bass: number; dur: number }[], drop = false): SfEv[] => {
    const out: SfEv[] = [];
    let aim = 74;
    let b = 0;
    for (const c of seq) {
      let v = closeNear(c.pcs, aim);
      aim = v[3];
      if (drop) v = drop2Of(v);
      out.push({ beat: b, dur: c.dur, ps: v, bass: c.bass, pcs: [...new Set([...c.pcs, mod(c.bass, 12)])].sort((x, y) => x - y) });
      b += c.dur;
    }
    out[out.length - 1].dur = Math.max(out[out.length - 1].dur, 2);
    return out;
  };
  const V = mod(k + 7, 12);
  const I6 = pcsOfInts([0, 4, 7, 9], k);
  const sixI = sixLinePair(k, 'maj7');
  if (kind === 'sf-voice') {
    const which = o === 0 ? [0, 1, 2, 3] : o === 1 ? [4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
    const seq = which.flatMap((i) => {
      const x = exprOf(V, i);
      return [{ pcs: x.pcs, bass: bassOf(x.bass), dur: 2 }, { pcs: I6, bass: bassOf(k), dur: 2 }];
    });
    const tt = SF_T.voice[Math.min(2, o)];
    const names = which.map((i) => exprOf(V, i).name + (EXPRESSIONS[i].bass ? `/${MAJ_N[exprOf(V, i).bass]}` : '')).join(' · ');
    return { evs: chordEvs(seq, o === 2), title: t(`${MAJ_N[V]}7 → ${MAJ_N[k]}6: ${tt.en} (${names})`, `${MAJ_N[V]}7 ← ${MAJ_N[k]}6: ${tt.he} (${names})`), line: false };
  }
  if (kind === 'sf-line') {
    // 0–7: one expression's scale for two bars, then I6, twice; 8: four expressions a bar each, then I6; 9: the m6 on
    // the 5th over ii and V, then I6, twice.
    if (o <= 7) {
      const x = exprOf(V, o);
      const bars = [x, x, sixI, x, x, sixI];
      const e = EXPRESSIONS[o];
      return { evs: sixLine(bars), title: t(`${MAJ_N[V]}7 → ${MAJ_N[k]}6: the ${x.name} scale — ${e.en}`, `${MAJ_N[V]}7 ← ${MAJ_N[k]}6: סולם ${x.name} — ${e.he}`), line: true };
    }
    if (o === 8) {
      const bars = [exprOf(V, 4), exprOf(V, 2), exprOf(V, 6), exprOf(V, 1), sixI, exprOf(V, 0), exprOf(V, 5), exprOf(V, 3), exprOf(V, 4), sixI];
      return { evs: sixLine(bars), title: t(`${MAJ_N[V]}7 → ${MAJ_N[k]}6: ${SF_T.mix.en}`, `${MAJ_N[V]}7 ← ${MAJ_N[k]}6: ${SF_T.mix.he}`), line: true };
    }
    const m = exprOf(V, 4);
    const bars = [m, m, sixI, m, m, sixI];
    // from the low register up (the V–I items start at the top), so the two never play the same line
    return { evs: sixLine(bars, 64), title: t(`${MAJ_N[k]}: ${SF_T.one.en}`, `${MAJ_N[k]}: ${SF_T.one.he}`), line: true };
  }
  if (kind === 'sf-comp') {
    // Charleston: an attack on 1 and on the "and" of 2 every bar; a dominant played as its important minor (the m6 on
    // its 5th, natural) or as the tritone's minor (the m6 a half step above it, altered); a m7 as the 6 a minor 3rd up.
    const dom = (r: number, alt: boolean) => pcsOfInts([0, 3, 7, 9], alt ? r + 1 : r + 7);
    const blues: [number, string][] = [[0, 'n'], [5, 'n'], [0, 'n'], [0, 'a'], [5, 'n'], [5, 'a'], [0, 'n'], [9, 'a'], [2, 'm'], [7, 'a'], [0, 'n'], [7, 'a']];
    const bars: { pcs: number[]; bass: number }[] =
      o === 1
        ? blues.map(([d, c]) => {
            const r = mod(k + d, 12);
            return { pcs: c === 'm' ? pcsOfInts([0, 4, 7, 9], r + 3) : dom(r, c === 'a'), bass: r };
          })
        : [false, true].flatMap((alt) => [
            { pcs: I6, bass: k },
            { pcs: dom(k + 9, alt), bass: mod(k + 9, 12) },
            { pcs: pcsOfInts([0, 4, 7, 9], k + 5), bass: mod(k + 2, 12) },
            { pcs: dom(k + 7, alt), bass: mod(k + 7, 12) },
          ]);
    if (o !== 1) bars.push({ pcs: I6, bass: k });
    const seq = bars.flatMap((c) => [{ pcs: c.pcs, bass: bassOf(c.bass), dur: 1.5 }, { pcs: c.pcs, bass: bassOf(c.bass), dur: 2.5 }]);
    const tt = SF_T.comp[o === 1 ? 1 : 0];
    return { evs: chordEvs(seq), title: t(`${MAJ_N[k]}: ${tt.en}`, `${MAJ_N[k]}: ${tt.he}`), line: false };
  }
  // sf-minor
  if (o === 1) {
    const bars = [sixLinePair(mod(k + 2, 12), 'hd7'), sixLinePair(V, '7b9'), sixLinePair(k, 'm6')];
    return { evs: sixLine([...bars, ...bars]), title: t(`${MIN_N[k]}m: ${SF_T.minor[1].en}`, `${MIN_N[k]}m: ${SF_T.minor[1].he}`), line: true, minor: true };
  }
  const Fm6 = pcsOfInts([0, 3, 7, 9], k + 5);
  const Cm6 = pcsOfInts([0, 3, 7, 9], k);
  // two beats a chord, the two versions of the V twice (A♭m6, A♭°7, A♭m6, A♭°7)
  const seq = [pcsOfInts([0, 3, 7, 9], V + 1), pcsOfInts([0, 3, 6, 9], V + 1), pcsOfInts([0, 3, 7, 9], V + 1), pcsOfInts([0, 3, 6, 9], V + 1)].flatMap((v5) => [
    { pcs: Fm6, bass: bassOf(k + 2), dur: 2 },
    { pcs: v5, bass: bassOf(V), dur: 2 },
    { pcs: Cm6, bass: bassOf(k), dur: 4 },
  ]);
  return { evs: chordEvs(seq), title: t(`${MIN_N[k]}m: ${SF_T.minor[0].en}`, `${MIN_N[k]}m: ${SF_T.minor[0].he}`), line: false, minor: true };
}

/** sf-borrow: walk a scale of chords of the V with borrowing on every degree — 0: the important minor (minor 6th-dim), 1: the tritone brother (dominant 7th-dim). */
function sfBorrowRoot(key: number, o: number): { root: number; scaleOpt: number; name: string } {
  const V = mod(key + 7, 12);
  if (o === 1) {
    const r = mod(V + 6, 12);
    return { root: r, scaleOpt: 20, name: `${MAJ_N[r]}7 / ${MAJ_N[V]}7` };
  }
  const r = mod(V + 7, 12);
  return { root: r, scaleOpt: 10, name: `${MIN_N[r]}m6 / ${MAJ_N[V]}7` };
}

export function genSixFivePiano(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const o = s.option ?? 0;
  if (s.kind === 'sf-borrow') {
    // borrowing inside the important minor of V or the tritone brother's 7th-dim scale: walk that
    // 6th-diminished scale of chords, borrowing on every degree
    const { root, scaleOpt, name: nm } = sfBorrowRoot(key, o);
    const d = genBorrowPiano({ ...s, kind: 'bw-walk', option: scaleOpt, key: root }, root);
    const tt = SF_T.borrow[o === 1 ? 1 : 0];
    return { ...d, spec: { ...s }, itemId: itemIdOf(s), title: t(`${tt.en} (${nm})`, `${tt.he} (${nm})`), keySig: SIG[key] };
  }
  const r = sfEvents(key, s.kind, o);
  const n = new Notes();
  const sets: NonNullable<DrillGoal['chordSets']> = [];
  for (const e of r.evs) {
    if (r.line) n.add(e.beat, e.dur, 'R', e.ps, e.ct !== undefined ? { chordTone: e.ct } : {});
    else {
      const id = n.addSplit(e.beat, e.dur, [...(e.bass !== undefined ? [{ hand: 'L' as const, p: e.bass }] : []), ...e.ps.map((p) => ({ hand: (p < 55 ? 'L' : 'R') as 'L' | 'R', p }))]);
      sets.push({ chordId: id, required: e.pcs!, allowed: e.pcs! });
    }
  }
  const sp: DrillSpec = { ...s, hands: r.line ? 'R' : 'RL' };
  return pDrill(sp, n, r.title, r.line ? 70 : 56, r.line ? { chordTonesOnBeats: true } : { evenness: false, chordSets: sets }, SIG[r.minor ? mod(key + 3, 12) : key]);
}

export function genSixFiveGuitar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const o = s.option ?? 0;
  if (s.kind === 'sf-borrow') {
    const { root, scaleOpt } = sfBorrowRoot(key, o);
    const d = genBorrowGuitar({ ...s, kind: 'bw-walk', option: scaleOpt, key: root }, tu, root);
    const tt = SF_T.borrow[o === 1 ? 1 : 0];
    const spec: DrillSpec = { ...d.spec, key, kind: s.kind, option: s.option };
    return { ...d, spec, itemId: guitarItemId(spec), title: t(`${tt.en} · drop 2, strings 4-3-2-1`, `${tt.he} · דרופ 2, מיתרים 4-3-2-1`), keySig: SIG[key] };
  }
  const r = sfEvents(key, s.kind, s.kind === 'sf-voice' && o === 2 ? 0 : o) // the guitar plays every chord as drop 2 itself;
  const evs: Ev[] = [];
  if (r.line) {
    // the line in one position around frets 5–9, shifting only when a note leaves it
    let lo = 5;
    for (const e of r.evs) {
      const p = e.ps[0];
      let got: P | null = null;
      for (let st = tu.open.length; st >= 1 && !got; st--) {
        const f = p - openOf(tu, st);
        if (f >= Math.max(0, lo - 1) && f <= lo + 4) got = { s: st, f };
      }
      if (!got) {
        let best: P | null = null;
        for (let st = tu.open.length; st >= 1; st--) {
          const f = p - openOf(tu, st);
          if (f < 0 || f > MAX_FRET) continue;
          if (!best || Math.abs(f - (lo + 2)) < Math.abs(best.f - (lo + 2))) best = { s: st, f };
        }
        got = best!;
        lo = Math.max(0, got.f - 2);
      }
      evs.push({ beat: e.beat, dur: e.dur, notes: [{ ...got, ...(e.ct !== undefined ? { ct: e.ct } : {}) }] });
    }
  } else {
    // the upper voices as drop 2 on strings 4-3-2-1 (the bass left to the bass player)
    let center = 6;
    for (const e of r.evs) {
      const v = drop2Of(e.ps);
      const pl = placeOnSet(tu, v, G_SETS.d2[0], center) ?? placeOnSet(tu, v, G_SETS.d2[0], center, 5);
      if (!pl) continue;
      center = pl.places.reduce((a, q) => a + q.f, 0) / 4;
      evs.push({ beat: e.beat, dur: e.dur, notes: pl.places.map((q) => ({ ...q })) });
    }
  }
  const title = r.line ? r.title : t(`${r.title.en} · drop 2, strings 4-3-2-1`, `${r.title.he} · דרופ 2, מיתרים 4-3-2-1`);
  return gFinish(s, tu, evs, { title, bpm: r.line ? 70 : 56, evenness: r.line, goal: r.line ? { chordTonesOnBeats: true } : { chordSets: chordSetsOf(evs, tu) }, keySig: SIG[r.minor ? mod(key + 3, 12) : key] });
}

/** Guitar: the eight expressions, the moves and Part D in g-harris (levels 11–13, the jazz add-on). */
export function guitarSixFiveLevels(from: number): GuitarLevelDef[] {
  const g = (kind: string, option: number): SpecTemplate => ({ family: 'g-harris', kind, hands: 'R', instrument: 'guitar', option });
  const L = (level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string): GuitarLevelDef => ({ id: `g-harris-${level}`, level, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: 'major', tempo, sub, grade: 9 });
  return [
    L(from, "Eight expressions of one dominant, each to I6; Harris's moves; the sixth on the fifth; the minor ii–V–i", 'שמונה ביטויים לדומיננט אחד, כל אחד אל I6; המהלכים של האריס; השישית על הקווינטה; ii–V–i מינורי', [g('sf-voice', 0), g('sf-voice', 1), g('mv-first', 0), g('mv-next', 0), g('mv-mmm', 0), g('sixth5', 0), g('sf-minor', 0)], [40, 72], 'halves'),
    L(from + 1, 'The expressions’ scales over V–I; contrary motion and the elevator; the 7th-dim scales over V7 → I', 'סולמות הביטויים על V–I; תנועה נגדית והמעלית; סולמות השביעית־מוקטן על V7 ← I', [g('sf-line', 0), g('sf-line', 2), g('sf-line', 4), g('sf-line', 6), g('sf-line', 8), g('sf-line', 9), g('cm-expand', 0), g('cm-elevator', 0), g('v7-d2', 0), g('v7-d2', 1), g('vl-ladder', 2)], [60, 120], '8ths'),
    L(from + 2, "Comping with the substitutions; the related dominants over a shell; the tritone's minor; borrowing", 'ליווי עם התחליפים; הדומיננטות הקרובות מעל שלד; המינור של הטריטון; השאלה', [g('sf-comp', 0), g('sf-comp', 1), g('shell4', 0), g('tm-res', 0), g('sf-borrow', 0), g('sf-borrow', 1), g('bw-three', 3), g('bw-root', 0), g('sub-tune', 0), g('el-borrow', 0)], [50, 100], 'quarters'),
  ];
}

// ───────────────────────────── Harris's moves, contrary motion, the true sixth on the fifth (BARRY-HARRIS-METHOD.md Part D) ─────────────────────────────
//
// D3 contrary motion on the 6th-diminished scale (Kingstone's "expand and contract"): from a unison the outer voices
//    step apart and the middle fills in from the same chord, 6 and dim alternating, out to drop 2 / drop 3 shapes and
//    back; Echols's Elevator: floors are voicing types (unison, 3rds, triads, 6ths, octaves, drop 2, drop 3, drop 2&4),
//    along a floor = parallel motion, between floors = contrary.
// D4 the 7th-dim and 7♭5-dim scales harmonized in drop 2 over V7 → I.
// D6 the sixth on the fifth (Harris / Kingstone): the MAJOR 6 on the 5th of a major chord — G6 / F♯°7 over a C bass.
// D7 the named moves: first movement (Dm6 → B°7 → G7 → C6, half steps), next move (raise two consecutive dim notes,
//    return, lower them: E♭6 → C°7 → A♭6), major – minor – minor/6 (C6 – B°7 – C6/A – A♭°7 – C6/G – Am6/F♯).
// D11 borrowing with three voices; the dominant root borrowed into the dim (a maj7 colour).
// D12 the four related dominants over the V's shell, floating up the dim (Rees Ex. 11–13); the tritone's minor resolution.

/** Chord tones below a melody note inside a scale of chords: the scale's notes 2, 4, 6 steps under it. */
const chordBelow = (d: (k: number) => number, idx: number, n: number) => Array.from({ length: n }, (_, j) => d(idx - 2 * (j + 1)));

/**
 * Echols's Elevator (BARRY-HARRIS-METHOD.md F1.2): from a unison on scale index s the top voice steps up and the bottom
 * voice down, one scale step a floor, the middle filled from the same chord — 9 floors: unison, 3rds, triads, 6ths,
 * octaves, drop 2, drop 3, drop 2&4, double octave — climbed and come down again (Kingstone's "expand and contract").
 * Offsets from s per floor (C6-dim from C: C | B D | A C E | G♯ B F | G C E G | F B D G♯ | E C G A | D G♯ F B | C C E C).
 * Built from the tonic only (owner 2026-11-15, verified: Echols builds the floors from the tonic; the cm-expand levels use
 * options 0 and 8 — the other start degrees stay generatable for saved ids but are in no level).
 */
export const ELEVATOR_FLOORS: number[][] = [[0], [-1, 1], [-2, 0, 2], [-3, -1, 3], [-4, 0, 2, 4], [-5, -1, 1, 5], [-6, 0, 4, 6], [-7, -3, 3, 7], [-8, 0, 2, 8]];
export const FLOOR_T = [t('unison', 'יוניסון'), t('3rds', 'טרצות'), t('triads', 'משולשים'), t('6ths', 'סקסטות'), t('octaves', 'אוקטבות'), t('drop 2', 'דרופ 2'), t('drop 3', 'דרופ 3'), t('drop 2&4', 'דרופ 2 ו־4'), t('double octave', 'אוקטבה כפולה')];
function expandEvents(tonic: number, sc: HScale, s: number): HEv[] {
  const d = (k: number) => deg(tonic, sc.ints, k);
  const out: HEv[] = [];
  const floors = [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  floors.forEach((f, b) => {
    const ps = [...new Set(ELEVATOR_FLOORS[f].map((x) => d(s + x)))].sort((p, q) => p - q);
    const pcs = [...new Set(ps.map((p) => mod(p, 12)))].sort((p, q) => p - q);
    out.push({ beat: b, dur: b === floors.length - 1 ? 2 : 1, ps, ...(ps.length >= 3 ? { pcs } : {}) });
  });
  return out;
}

/** Echols's Elevator: a melody up the scale, one floor higher each note, then down along the drop 2 floor. */
function elevatorEvents(tonic: number, sc: HScale, s: number): HEv[] {
  const d = (k: number) => deg(tonic, sc.ints, k);
  const floor = (f: number, idx: number): number[] => {
    const m = d(idx);
    const [c1, c2, c3] = chordBelow(d, idx, 3);
    switch (f) {
      case 0: return [m];
      case 1: return [c1, m];
      case 2: return [c2, c1, m];
      case 3: return [c3, m];
      case 4: return [m - 12, m];
      case 5: return [c1 - 12, c3, c2, m];
      case 6: return [c2 - 12, c3, c1, m];
      default: return [c3 - 12, c1 - 12, c2, m];
    }
  };
  const out: HEv[] = [];
  let b = 0;
  const push = (ps: number[]) => {
    const sorted = [...new Set(ps)].sort((a, c) => a - c);
    out.push({ beat: b, dur: 1, ps: sorted, ...(sorted.length >= 3 ? { pcs: [...new Set(sorted.map((p) => mod(p, 12)))].sort((a, c) => a - c) } : {}) });
    b++;
  };
  for (let j = 0; j < 8; j++) push(floor(j, s + j));
  for (let j = 6; j >= 0; j--) push(floor(5, s + j));
  out[out.length - 1].dur = 2;
  return out;
}

const NAMED_T = {
  first: t('the first movement: m6 → °7 → 7 → 6, one note down a half step at a time', 'התנועה הראשונה: m6 ← °7 ← 7 ← 6, צליל אחד יורד חצי טון בכל פעם'),
  next: t('the next move: raise two neighbouring dim notes, return, lower them — round all four pairs', 'המהלך הבא: מעלים שני צלילי מוקטן שכנים, חוזרים, מורידים אותם — בכל ארבעת הזוגות'),
  mmm: t('major – minor – minor/6, the bass down by half steps', 'מז׳ור – מינור – מינור/6, הבס יורד בחצאי טונים'),
};

export interface DEv {
  beat: number;
  dur: number;
  ps: number[];
  bass?: number;
  pcs?: number[];
}
/** The Part D drills' music (key = the key of I, or the scale's tonic). */
export function partDEvents(key: number, kind: string, option: number): { evs: DEv[]; title: T2; sig: number } {
  const k = mod(key, 12);
  const o = option;
  const V = mod(k + 7, 12);
  const bassOf = (pc: number) => pitchIn(pc, 36);
  const withBass = (evs: HEv[], bass: number): DEv[] => evs.map((e) => ({ ...e, bass: bassOf(bass), pcs: [...new Set([...(e.pcs ?? e.ps.map((p) => mod(p, 12))), mod(bass, 12)])].sort((a, c) => a - c) }));
  const chain = (seq: { pcs: number[]; bass?: number; dur?: number; v?: number[] }[]): DEv[] => {
    let aim = 74;
    let b = 0;
    return seq.map((c) => {
      const v = c.v ?? closeNear(c.pcs, aim);
      aim = v[v.length - 1];
      const e: DEv = { beat: b, dur: c.dur ?? 2, ps: v, ...(c.bass !== undefined ? { bass: bassOf(c.bass) } : {}), pcs: [...new Set([...c.pcs, ...(c.bass !== undefined ? [mod(c.bass, 12)] : [])])].sort((x, y) => x - y) };
      b += e.dur;
      return e;
    });
  };
  if (kind === 'cm-expand' || kind === 'cm-elevator') {
    // cm-expand: option = scale (0 major, 1 minor 6th-dim) × 8 + the unison's scale degree; cm-elevator: a melody,
    // a floor higher each note (contrary), then along the drop 2 floor (parallel) — option 1 minor
    const minorSc = kind === 'cm-expand' ? o >= 8 : o === 1;
    const sc = H_SCALES[minorSc ? 10 : 9];
    const s = kind === 'cm-expand' ? o % 8 : 4;
    const tonic = pitchIn(k, 60) - (kind === 'cm-expand' && s >= 4 ? 12 : 0);
    const evs = kind === 'cm-expand' ? expandEvents(tonic, sc, s) : elevatorEvents(tonic, sc, s);
    const nm = `${kName(k, sc)}${sc.chordSym}`;
    const DEG = ['1', '2', '3', '4', '5', '♭6', '6', '7'];
    const degName = minorSc ? ['1', '2', '♭3', '4', '5', '♭6', '6', '7'][s] : DEG[s];
    const ttl = kind === 'cm-expand'
      ? t(`${nm} elevator from a unison on ${degName}: up the nine floors to the double octave and back`, `המעלית של ${nm} מיוניסון על ${degName}: במעלה תשע הקומות עד האוקטבה הכפולה וחזרה`)
      : t(`${nm}: a melody, a floor higher each note, then along the drop 2 floor`, `${nm}: מנגינה, קומה אחת למעלה בכל צליל, ואז לאורך קומת דרופ 2`);
    return { evs: evs.map((e) => ({ ...e })), title: ttl, sig: sc.sig };
  }
  if (kind === 'v7-d2') {
    // the 7th-dim (option 0) or 7♭5-dim (1) scale of the V harmonized in drop 2 (option 2/3: drop 3), over the V's bass, to I6
    const sc = H_SCALES[o % 2 === 1 ? 12 : 11];
    const step: HStep = o >= 2 ? 'd3' : 'd2';
    const evs = withBass(ladderEvents(V, sc, step, pitchIn(V, 58), 1), V);
    const last = evs[evs.length - 1];
    const I6 = pcsOfInts([0, 4, 7, 9], k);
    let v = closeNear(I6, last.ps[last.ps.length - 1]);
    v = step === 'd2' ? drop2Of(v) : [v[1] - 12, v[0], v[2], v[3]].sort((a, c) => a - c);
    evs.push({ beat: last.beat + last.dur, dur: 2, ps: v, bass: bassOf(k), pcs: [...new Set([...I6])].sort((a, c) => a - c) });
    const nm = `${MAJ_N[V]}${sc.chordSym}`;
    return { evs, title: t(`${nm} ${sc.name.en} scale of chords in drop ${step === 'd2' ? 2 : 3} over ${MAJ_N[V]}7 → ${MAJ_N[k]}6`, `סולם האקורדים של ${nm} (${sc.name.he}) בדרופ ${step === 'd2' ? 2 : 3} על ${MAJ_N[V]}7 ← ${MAJ_N[k]}6`), sig: 0 };
  }
  if (kind === 'sixth5') {
    // the major 6 on the 5th over the root: G6 / F♯°7 scale of chords over a C bass (option 1: drop 2)
    const evs = withBass(ladderEvents(V, H_SCALES[9], o === 1 ? 'd2' : '7b', pitchIn(V, 59), 1), k);
    return { evs, title: t(`The sixth on the fifth: ${MAJ_N[V]}6 and ${MAJ_N[mod(V + 11, 12)]}°7 over ${MAJ_N[k]}${o === 1 ? ', drop 2' : ''}`, `השישית על הקווינטה: ${MAJ_N[V]}6 ו־${MAJ_N[mod(V + 11, 12)]}°7 מעל ${MAJ_N[k]}${o === 1 ? ', דרופ 2' : ''}`), sig: 0 };
  }
  if (kind === 'mv-first') {
    // Dm6 → B°7 → G7 → C6: from the m6 one voice falls a half step to the dim, the same voice falls again to the dominant
    const out: DEv[] = [];
    let b = 0;
    for (const aim of [74, 79]) {
      const m6 = closeNear(pcsOfInts([0, 3, 7, 9], k + 2), aim);
      const dim = m6.map((p) => (mod(p, 12) === mod(k + 9, 12) ? p - 1 : p));
      const dom = dim.map((p) => (mod(p, 12) === mod(k + 8, 12) ? p - 1 : p));
      const six = closeNear(pcsOfInts([0, 4, 7, 9], k), dom[3]);
      const chs: [number[], number][] = [[m6, k + 2], [dim, k + 11], [dom, V], [six, k]];
      for (const [v, bass] of chs) {
        out.push({ beat: b, dur: 2, ps: v, bass: bassOf(bass), pcs: [...new Set([...v.map((p) => mod(p, 12)), mod(bass, 12)])].sort((x, y) => x - y) });
        b += 2;
      }
    }
    return { evs: out, title: t(`${MIN_N[mod(k + 2, 12)]}m6 → ${MAJ_N[mod(k + 11, 12)]}°7 → ${MAJ_N[V]}7 → ${MAJ_N[k]}6: ${NAMED_T.first.en}`, `${MIN_N[mod(k + 2, 12)]}m6 ← ${MAJ_N[mod(k + 11, 12)]}°7 ← ${MAJ_N[V]}7 ← ${MAJ_N[k]}6: ${NAMED_T.first.he}`), sig: 0 };
  }
  if (kind === 'mv-next') {
    // the dim on the key's root; each pair of neighbouring voices up a half step (a 6 chord), back, down (another 6), back
    const dim = closeNear(pcsOfInts([0, 3, 6, 9], k), 72);
    const seq: { pcs: number[]; v: number[] }[] = [];
    // start with the pair whose raise gives the 6 chord a minor 3rd above the key (E♭6 in C), so keys a minor 3rd
    // apart (the same dim) play the pairs in a different order
    const rootOfUp = (x: number) => {
      const v = dim.map((p, i) => (i === x || i === (x + 1) % 4 ? p + 1 : p)).map((p) => mod(p, 12));
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find((r) => [0, 4, 7, 9].every((iv) => v.includes(mod(r + iv, 12))))!;
    };
    const firstPair = [0, 1, 2, 3].find((x) => rootOfUp(x) === mod(k + 3, 12)) ?? 0;
    for (let pr = 0; pr < 4; pr++) {
      const a = (firstPair + pr) % 4;
      const c = (a + 1) % 4;
      const up = dim.map((p, i) => (i === a || i === c ? p + 1 : p));
      const dn = dim.map((p, i) => (i === a || i === c ? p - 1 : p));
      const pc = (v: number[]) => [...new Set(v.map((p) => mod(p, 12)))];
      seq.push({ pcs: pc(up), v: up.slice().sort((x, y) => x - y) }, { pcs: pc(dim), v: dim }, { pcs: pc(dn), v: dn.slice().sort((x, y) => x - y) }, { pcs: pc(dim), v: dim });
    }
    return { evs: chain(seq), title: t(`${MAJ_N[mod(k + 3, 12)]}6 → ${MAJ_N[k]}°7 → ${MAJ_N[mod(k + 8, 12)]}6: ${NAMED_T.next.en}`, `${MAJ_N[mod(k + 3, 12)]}6 ← ${MAJ_N[k]}°7 ← ${MAJ_N[mod(k + 8, 12)]}6: ${NAMED_T.next.he}`), sig: 0 };
  }
  if (kind === 'mv-mmm') {
    const I6 = pcsOfInts([0, 4, 7, 9], k);
    const seq = [
      { pcs: I6, bass: k },
      { pcs: pcsOfInts([0, 3, 6, 9], k + 11), bass: k + 11 },
      { pcs: I6, bass: k + 9 },
      { pcs: pcsOfInts([0, 3, 6, 9], k + 8), bass: k + 8 },
      { pcs: I6, bass: V },
      { pcs: pcsOfInts([0, 3, 7, 9], k + 9), bass: k + 6 },
    ];
    return { evs: chain([...seq, ...seq.map((c) => ({ ...c }))]), title: t(`${MAJ_N[k]}6 – ${MAJ_N[mod(k + 11, 12)]}°7 – ${MAJ_N[k]}6/${MAJ_N[mod(k + 9, 12)]} – … – ${MIN_N[mod(k + 9, 12)]}m6/${MIN_N[mod(k + 6, 12)]}: ${NAMED_T.mmm.en}`, `${MAJ_N[k]}6 – ${MAJ_N[mod(k + 11, 12)]}°7 – ${MAJ_N[k]}6/${MAJ_N[mod(k + 9, 12)]} – … – ${MIN_N[mod(k + 9, 12)]}m6/${MIN_N[mod(k + 6, 12)]}: ${NAMED_T.mmm.he}`), sig: 0 };
  }
  if (kind === 'vl-ladder') {
    // Echols's voicing ladder (F1.6) up and down the 6th-dim scale of chords. Options: 0 thirds, 1 triads, 2 the upper
    // shell, 3 octave chords; +4 = minor; 8 / 9 = the lower shell (major / minor).
    // The shells (owner 2026-11-15): the upper shell is C-G-A, the lower shell C-E-A (and so on up the scale) — drop 3
    // and drop 2 without the left hand: of the close chord C E G A, drop 3 leaves C G A in the right hand, drop 2 leaves
    // C E A. So the upper shell is the close chord's 1st, 3rd and 4th notes, the lower shell its 1st, 2nd and 4th, and
    // the shells start with the bottom note on the tonic. Thirds, triads and octave chords are still unconfirmed
    // (hidden, verifiedContent.ts): a "third" here is two scale steps, which is a 2nd at the 6th (G A).
    const sc = H_SCALES[o === 9 || (o >= 4 && o < 8) ? 10 : 9];
    const type = o >= 8 ? 4 : o % 4;
    const shell = type === 2 || type === 4;
    const d = (x: number) => deg(pitchIn(k, shell ? 55 : 64), sc.ints, x);
    const ks = [...Array.from({ length: 9 }, (_, i) => i), ...Array.from({ length: 8 }, (_, i) => 7 - i)];
    // shells: [bottom, middle, top] = degrees x, x + 4 (or + 2), x + 6 — the bottom note walks the scale from the tonic
    const shape = [[-2, 0], [-4, -2, 0], [0, 4, 6], [-8, -4, -2, 0], [0, 2, 6]][type];
    const evs: DEv[] = ks.map((x, b) => {
      const ps = shape.map((y) => d(x + y));
      return { beat: b, dur: b === ks.length - 1 ? 2 : 1, ps, ...(ps.length >= 3 ? { pcs: [...new Set(ps.map((p) => mod(p, 12)))].sort((p, q) => p - q) } : {}) };
    });
    const tt = [t('thirds', 'טרצות'), t('triads', 'משולשים'), t('the upper shell (drop 3 without the left hand)', 'השלד העליון (דרופ 3 בלי יד שמאל)'), t('octave chords', 'אקורדי אוקטבה'), t('the lower shell (drop 2 without the left hand)', 'השלד התחתון (דרופ 2 בלי יד שמאל)')][type];
    return { evs, title: t(`${kName(k, sc)}${sc.chordSym} voicing ladder: ${tt.en}, up and down the scale of chords`, `סולם הקולות של ${kName(k, sc)}${sc.chordSym}: ${tt.he}, לאורך סולם האקורדים`), sig: sc.sig };
  }
  if (kind === 'sub-tune') {
    // choosing a substitute on each V of a tune (F1.4): I–VI7–ii–V–iii–VI7–ii–V–I comped four times — each V as
    // itself, then the family (the tritone brother), the important minor, the tritone's minor (option 1: per bar mixed)
    const prog: [number, boolean][] = [[0, false], [9, true], [2, false], [7, true], [4, false], [9, true], [2, false], [7, true]];
    const choose = (r: number, pass: number): number[] => {
      const c = o === 1 ? (pass + r) % 4 : pass;
      return c === 0 ? pcsOfInts([0, 4, 7, 10], r) : c === 1 ? pcsOfInts([0, 4, 7, 10], r + 6) : c === 2 ? pcsOfInts([0, 3, 7, 9], r + 7) : pcsOfInts([0, 3, 7, 9], r + 1);
    };
    const seq: { pcs: number[]; bass: number; dur: number }[] = [];
    for (let pass = 0; pass < 4; pass++)
      for (const [dd, dom] of prog) {
        const r = mod(k + dd, 12);
        const pcs = dom ? choose(r, pass) : dd === 0 ? pcsOfInts([0, 4, 7, 9], r) : pcsOfInts([0, 4, 7, 9], r + 3);
        seq.push({ pcs, bass: dom && choose(r, pass).length && (o === 1 ? (pass + r) % 4 : pass) === 1 ? mod(r + 6, 12) : r, dur: 2 });
      }
    seq.push({ pcs: pcsOfInts([0, 4, 7, 9], k), bass: k, dur: 2 });
    return { evs: chain(seq), title: t(`${MAJ_N[k]}: a substitute on each V — itself, the family, the important minor, the tritone’s minor${o === 1 ? ', mixed' : ''}`, `${MAJ_N[k]}: תחליף על כל V — עצמו, המשפחה, המינור החשוב, המינור של הטריטון${o === 1 ? ', מעורב' : ''}`), sig: 0 };
  }
  if (kind === 'el-borrow') {
    // borrowing through the Elevator (F1, #9; verify — inferred): on floors 5–8 the soprano holds while the other voices
    // take the next floor's shape (the other chord) and come back
    const sc = H_SCALES[o === 1 ? 10 : 9];
    const d = (x: number) => deg(pitchIn(k, 60) - 12, sc.ints, x);
    const evs: DEv[] = [];
    let b = 0;
    for (const s0 of [0, 4])
      for (const f of [4, 5, 6, 7]) {
        const here = ELEVATOR_FLOORS[f].map((x) => d(s0 + 8 + x));
        const next = ELEVATOR_FLOORS[f + 1].map((x) => d(s0 + 8 + x));
        const sop = here[here.length - 1];
        const lowA = here.slice(0, -1);
        const lowB = next.slice(0, -1).filter((p) => p !== sop);
        const pc = (ps: number[]) => [...new Set(ps.map((p) => mod(p, 12)))].sort((x, y) => x - y);
        evs.push({ beat: b, dur: 1, ps: [...lowA, sop], pcs: pc([...lowA, sop]) });
        evs.push({ beat: b + 1, dur: 1, ps: [...lowB, sop], pcs: pc([...lowB, sop]) });
        evs.push({ beat: b + 2, dur: 1, ps: [...lowA, sop], pcs: pc([...lowA, sop]) });
        b += 3;
      }
    evs[evs.length - 1].dur = 2;
    return { evs, title: t(`${kName(k, sc)}${sc.chordSym}: borrowing through the elevator — the soprano holds, the other voices take the next floor and return`, `${kName(k, sc)}${sc.chordSym}: השאלה דרך המעלית — הסופרן נשאר, שאר הקולות לוקחים את הקומה הבאה וחוזרים`), sig: sc.sig };
  }
  if (kind === 'shell4') {
    // the V's shell (root, ♭7) held in the LH; the RH plays the four related dominants floating up by minor 3rds and back, then I6
    const shell = [pitchIn(V, 36), pitchIn(V, 36) + 10];
    const order = [0, 3, 6, 9, 6, 3, 0];
    let aim = 70;
    let b = 0;
    const evs: DEv[] = order.map((x) => {
      const pcs = pcsOfInts([0, 4, 7, 10], V + x);
      const v = closeNear(pcs, aim + (x === 0 ? 0 : 1), 67, 82);
      aim = v[3];
      const e: DEv = { beat: b, dur: 2, ps: [...shell, ...v], pcs: [...new Set([...pcs, V, mod(V + 10, 12)])].sort((p, q) => p - q) };
      b += 2;
      return e;
    });
    const I6 = pcsOfInts([0, 4, 7, 9], k);
    const v = closeNear(I6, aim);
    evs.push({ beat: b, dur: 2, ps: [pitchIn(k, 36), pitchIn(k, 36) + 9, ...v], pcs: I6.slice().sort((p, q) => p - q) });
    return { evs, title: t(`The four related dominants over the ${MAJ_N[V]}7 shell, floating up the diminished, to ${MAJ_N[k]}6`, `ארבע הדומיננטות הקרובות מעל שלד ${MAJ_N[V]}7, עולות לאורך המוקטן, אל ${MAJ_N[k]}6`), sig: 0 };
  }
  // tm-res: the tritone's minor (the m6 a half step above the V) through its scale of chords over the V's bass, to I6
  const r = mod(V + 1, 12);
  const sc = H_SCALES[10];
  const evs = withBass(ladderEvents(r, sc, '7b', pitchIn(r, 62), 1).slice(0, 5), V);
  const last = evs[evs.length - 1];
  const I6 = pcsOfInts([0, 4, 7, 9], k);
  const v = closeNear(I6, last.ps[last.ps.length - 1] - 1);
  evs.push({ beat: last.beat + last.dur, dur: 2, ps: v, bass: bassOf(k), pcs: [...new Set([...I6, k])].sort((p, q) => p - q) });
  return { evs, title: t(`The tritone's minor: ${MAJ_N[r]}m6 over ${MAJ_N[V]}, moving up its scale of chords, to ${MAJ_N[k]}6`, `המינור של הטריטון: ${MAJ_N[r]}m6 מעל ${MAJ_N[V]}, עולה בסולם האקורדים שלו, אל ${MAJ_N[k]}6`), sig: 0 };
}

export const PART_D_KINDS = ['cm-expand', 'cm-elevator', 'v7-d2', 'sixth5', 'mv-first', 'mv-next', 'mv-mmm', 'shell4', 'tm-res', 'vl-ladder', 'sub-tune', 'el-borrow'];

export function genPartDPiano(s: DrillSpec): Drill {
  const key = mod(s.key, 12);
  const r = partDEvents(key, s.kind, s.option ?? 0);
  const n = new Notes();
  const sets: NonNullable<DrillGoal['chordSets']> = [];
  const top0 = r.evs[0].ps[0];
  for (const e of r.evs) {
    // the bass never doubles a voice on the same key: an octave lower then
    const bass = e.bass !== undefined && e.ps.includes(e.bass) ? undefined : e.bass;
    const parts = [...(bass !== undefined ? [{ hand: 'L' as const, p: bass }] : []), ...e.ps.map((p) => ({ hand: (s.kind.startsWith('cm-') ? (p < top0 && e.ps.length > 1 && p < 60 ? 'L' : 'R') : p < 55 ? 'L' : 'R') as 'L' | 'R', p }))];
    if (parts.length === 1) n.add(e.beat, e.dur, parts[0].hand, [parts[0].p]);
    else {
      const id = n.addSplit(e.beat, e.dur, parts);
      if (e.pcs && parts.length >= 3) sets.push({ chordId: id, required: e.pcs, allowed: e.pcs });
    }
  }
  const hands = new Set(n.list.map((x) => x.hand));
  const sp: DrillSpec = { ...s, hands: hands.size > 1 ? 'RL' : 'R' };
  return pDrill(sp, n, r.title, 50, { evenness: false, chordSets: sets }, SIG[mod(key + r.sig, 12)]);
}

/** Any chord on the neck: each note on its own string (low → high), the octave and strings chosen near `center`. */
export function placeAny(tu: Tuning, ps: number[], center: number, span = 4): P[] | null {
  const n = ps.length;
  if (n === 1) {
    let best: P | null = null;
    for (let st = tu.open.length; st >= 1; st--) {
      const f = ps[0] - openOf(tu, st);
      if (f < 0 || f > MAX_FRET) continue;
      if (!best || Math.abs(f - center) < Math.abs(best.f - center)) best = { s: st, f };
    }
    return best ? [best] : null;
  }
  let best: { places: P[]; cost: number } | null = null;
  const strings = Array.from({ length: tu.open.length }, (_, i) => tu.open.length - i);
  const rec = (from: number, acc: number[]) => {
    if (acc.length === n) {
      for (const shift of [-12, 0, 12]) {
        const places = ps.map((p, i) => ({ s: acc[i], f: p + shift - openOf(tu, acc[i]) }));
        if (places.some((x) => x.f < 0 || x.f > MAX_FRET)) continue;
        const fr = places.filter((x) => x.f > 0).map((x) => x.f);
        if (fr.length && Math.max(...fr) - Math.min(...fr) > span) continue;
        const cost = Math.abs(places.reduce((a, x) => a + x.f, 0) / n - center) + Math.abs(shift) / 6;
        if (!best || cost < best.cost) best = { places, cost };
      }
      return;
    }
    for (let i = from; i < strings.length; i++) rec(i + 1, [...acc, strings[i]]);
  };
  rec(0, []);
  return best ? (best as { places: P[] }).places : null;
}

export function genPartDGuitar(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const r = partDEvents(key, s.kind, s.option ?? 0);
  const evs: Ev[] = [];
  let center = 5;
  for (const e of r.evs) {
    // the guitar plays the upper voices (the bass left to the bass player); five notes keep their outer four
    let ps = e.ps.length > 4 ? [e.ps[0], ...e.ps.slice(-3)] : e.ps;
    if (s.kind === 'shell4') ps = e.ps.slice(2);
    // a close 4-note chord is played as drop 2 on the neck when the close shape does not fit four frets
    const tries = ps.length === 4 && ps[3] - ps[0] < 12 ? [ps, drop2Of(ps)] : [ps];
    let pl: P[] | null = null;
    for (const x of tries) if (!pl) pl = placeAny(tu, x, center);
    if (!pl) continue;
    center = pl.reduce((a, q) => a + q.f, 0) / pl.length;
    evs.push({ beat: e.beat, dur: e.dur, notes: pl.map((q) => ({ ...q })) });
  }
  return gFinish(s, tu, evs, { title: r.title, bpm: 50, evenness: false, goal: { chordSets: chordSetsOf(evs, tu) }, keySig: SIG[mod(key + r.sig, 12)] });
}

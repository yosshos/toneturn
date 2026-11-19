// Reharmonization and colour harmony (docs/HARMONY-REHARM.md, the canonical reference; research in
// docs/research/REHARM-AND-COLOR.md Parts B–D). Pure: no audio, no UI.
//
//   §2 one note, many chords — the degree a held note takes over each chord, the chords that hold it, spelled
//      (a held F as the ♯9 of D7 or the ♯11 of B7 is E♯, never "F"), the ladder triads → 7ths → tensions;
//   §3 chromatic mediants — common tones, doubly chromatic pairs, the Coltrane link, P / L / R, the hexatonic and
//      octatonic cycles (the octatonic roots are the minor-third cycle of Barry Harris's family of dominants);
//   §4 modal interchange — the borrowed chords in major and the reverse borrowing in minor;
//   §5 the counter-line — a held note, the bass walking down by step, each bass note renaming the chord.
//
// Every drill and ear item builds its notes here, so the lessons, the drills and the tests agree.

import { MELODY_OK, type RQ } from './theoryPlay';

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
type T2 = { en: string; he: string };

// ───────────────────────────── spelling ─────────────────────────────

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<number, string> = { [-2]: '♭♭', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

/** A pitch class written on a letter (0 = C … 6 = B), or null when it needs more than a double accidental. */
export function onLetter(pc: number, letter: number): string | null {
  const l = ((letter % 7) + 7) % 7;
  let d = mod12(pc - NATURAL[l]);
  if (d > 6) d -= 12;
  return ACC[d] === undefined ? null : LETTERS[l] + ACC[d];
}
/** The letter index of a spelled note name ("E♯" → 2). */
export const letterOf = (name: string): number => LETTERS.indexOf(name[0]);
const accCount = (name: string): number => [...name.slice(1)].filter((c) => c === '♭' || c === '♯').length + (name.includes('𝄪') ? 2 : 0);

/** Root names: naturals as they are, black keys with flats (or sharps). F♯ is the one sharp a flat key still writes (♯IV). */
const FLAT_ROOT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARP_ROOT = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const rootName = (pc: number, flats = true): string => (flats ? FLAT_ROOT : SHARP_ROOT)[mod12(pc)];
/** Keys written with sharps (G D A E B F♯ and their relative minors). */
export const sharpKey = (key: number): boolean => [7, 2, 9, 4, 11, 6].includes(mod12(key));

// ───────────────────────────── qualities and degrees ─────────────────────────────

/** Chord qualities of the reharm ladder (intervals above the root; tensions above the octave keep their number). */
export type CtQ = 'M' | 'm' | 'maj7' | 'm7' | '7' | 'm7b5' | '6' | 'm6' | '9' | '7sus4' | '13' | '7b9' | '7#9' | '7#11' | '7b13' | 'maj7#11' | 'maj7#5' | 'dim7' | 'aug';
export const CT_Q: Record<CtQ, { ints: number[]; sym: string }> = {
  M: { ints: [0, 4, 7], sym: '' },
  m: { ints: [0, 3, 7], sym: 'm' },
  aug: { ints: [0, 4, 8], sym: '+' },
  maj7: { ints: [0, 4, 7, 11], sym: 'maj7' },
  m7: { ints: [0, 3, 7, 10], sym: 'm7' },
  '7': { ints: [0, 4, 7, 10], sym: '7' },
  m7b5: { ints: [0, 3, 6, 10], sym: 'm7♭5' },
  dim7: { ints: [0, 3, 6, 9], sym: '°7' },
  '6': { ints: [0, 4, 7, 9], sym: '6' },
  m6: { ints: [0, 3, 7, 9], sym: 'm6' },
  '9': { ints: [0, 4, 7, 10, 14], sym: '9' },
  '7sus4': { ints: [0, 5, 7, 10], sym: '7sus4' },
  '13': { ints: [0, 4, 10, 14, 21], sym: '13' },
  '7b9': { ints: [0, 4, 7, 10, 13], sym: '7♭9' },
  '7#9': { ints: [0, 4, 7, 10, 15], sym: '7♯9' },
  '7#11': { ints: [0, 4, 7, 10, 18], sym: '7♯11' },
  '7b13': { ints: [0, 4, 10, 20], sym: '7♭13' },
  'maj7#11': { ints: [0, 4, 7, 11, 18], sym: 'maj7♯11' },
  'maj7#5': { ints: [0, 4, 8, 11], sym: 'maj7♯5' },
};

/** A degree label and the number of letters above the root it is written on (the 9th on the 2nd letter …). */
export interface Degree {
  label: string;
  steps: number;
}
const D = (label: string, steps: number): Degree => ({ label, steps });
/**
 * The degree a note takes over a chord (its interval above the root, read through the chord's quality): ♭3 on a minor
 * chord but ♯9 on a 7♯9; ♭5 on m7♭5 but ♯11 on 7♯11; ♯5 on maj7♯5 or + but ♭13 on 7♭13; 11 on a sus chord; 13 on a
 * 13 chord, 6 on a 6 chord. Null when the note is not a tone of the chord.
 */
export function degreeIn(interval: number, q: CtQ): Degree | null {
  const i = mod12(interval);
  if (!CT_Q[q].ints.some((x) => mod12(x) === i)) return null;
  switch (i) {
    case 0: return D('1', 0);
    case 1: return D('♭9', 1);
    case 2: return D('9', 1);
    case 3: return q === '7#9' ? D('♯9', 1) : D('♭3', 2);
    case 4: return D('3', 2);
    case 5: return D('11', 3);
    case 6: return q === 'm7b5' || q === 'dim7' ? D('♭5', 4) : D('♯11', 3);
    case 7: return D('5', 4);
    case 8: return q === '7b13' ? D('♭13', 5) : D('♯5', 4);
    case 9: return q === '13' ? D('13', 5) : q === 'dim7' ? D('°7', 6) : D('6', 5);
    case 10: return D('♭7', 6);
    default: return D('maj7', 6);
  }
}

/** A chord and the held note's place in it, spelled. */
export interface HeldChord {
  root: number;
  q: CtQ;
  degree: string;
  /** Root name and chord symbol as written (D♭maj7, B7♯11). */
  rootName: string;
  sym: string;
  /** The held note as written over this chord (F, or E♯ as a ♯9 / ♯11 / ♯5). */
  held: string;
}

/**
 * Spell a chord whose root is a pitch class and the held note's degree in it: the root spelling (flat or sharp) that
 * writes the held note with the fewest accidentals and no double accidental; ties go to the key's side.
 */
export function spellHeld(root: number, q: CtQ, heldPc: number, flats = true): HeldChord | null {
  const deg = degreeIn(heldPc - root, q);
  if (!deg) return null;
  const opts = [...new Set([FLAT_ROOT[mod12(root)], SHARP_ROOT[mod12(root)]])].map((rn) => {
    const held = onLetter(heldPc, letterOf(rn) + deg.steps);
    return { rn, held, cost: held === null || held.includes('♭♭') || held.includes('𝄪') ? 99 : accCount(held) + accCount(rn) * 0.5 + (rn.includes(flats ? '♯' : '♭') ? 0.1 : 0) };
  });
  opts.sort((a, b) => a.cost - b.cost);
  const best = opts[0];
  // No clean spelling either way (a far key): the key's root name, the held note on its letter if it can be written.
  const held = best.held ?? rootName(heldPc, flats);
  return { root: mod12(root), q, degree: deg.label, rootName: best.rn, sym: best.rn + CT_Q[q].sym, held };
}

/** The ladder (C.1): [interval of the held note above the root, quality], per stage. Held F: F, Fm, Dm, D♭, B♭, B♭m … */
export const LADDER: Record<'triads' | 'sevenths' | 'tensions', [number, CtQ][]> = {
  triads: [[0, 'M'], [0, 'm'], [3, 'm'], [4, 'M'], [7, 'M'], [7, 'm']],
  sevenths: [[0, 'maj7'], [3, 'm7'], [4, 'maj7'], [7, 'maj7'], [10, '7'], [11, 'maj7'], [10, 'm7']],
  // E♭9 (9), C7sus4 (11), A♭13 (13), E7♭9 (♭9), B7♯11 (♯11 = E♯), A7♭13 (♭13), D7♯9 (♯9 = E♯) for a held F
  tensions: [[2, '9'], [5, '7sus4'], [9, '13'], [1, '7b9'], [6, '7#11'], [8, '7b13'], [3, '7#9']],
};

/** The chords of a ladder stage that hold a note, spelled (held F in C: the research tables). */
export function ladderChords(heldPc: number, stage: keyof typeof LADDER, flats = true): HeldChord[] {
  return LADDER[stage].map(([iv, q]) => spellHeld(heldPc - iv, q, heldPc, flats)!);
}

/** Every chord of the given qualities that holds the note as a chord tone (optionally only as one degree). */
export function chordsHolding(heldPc: number, quals: CtQ[], degree?: string, flats = true): HeldChord[] {
  const out: HeldChord[] = [];
  for (const q of quals)
    for (let r = 0; r < 12; r++) {
      const c = spellHeld(r, q, heldPc, flats);
      if (c && (!degree || c.degree === degree)) out.push(c);
    }
  return out;
}

/** Map a ladder quality to the melody-fit table of theoryPlay.ts (holdsMelody), where one exists. */
const RQ_OF: Partial<Record<CtQ, RQ>> = { maj7: 'maj7', '6': 'maj7', m7: 'm7', '7': '7', '9': '7', '13': '7', '7b9': '7', '7#9': '7', '7#11': '7', '7b13': '7', m7b5: 'm7b5', m6: 'm6', dim7: 'dim7' };
/**
 * Can a chord carry the held note (a chord tone, or a tension the chord allows — never an avoid note)? 7th chords use
 * MELODY_OK (the same table as holdsMelody); triads take their own tones and the 9th; sus chords the 9, 11, 13.
 */
export function holdsNote(root: number, q: CtQ, notePc: number): boolean {
  const i = mod12(notePc - root);
  if (CT_Q[q].ints.some((x) => mod12(x) === i)) return true;
  const rq = RQ_OF[q];
  if (rq) return MELODY_OK[rq].includes(i);
  if (q === 'M' || q === 'm') return i === 2;
  if (q === '7sus4') return [2, 9].includes(i);
  if (q === 'maj7#5') return [2, 6].includes(i);
  return false;
}

/**
 * Identify a played chord (pitches): a root that is played (the bass first) and a quality with at least three of its
 * tones played, every other note an available tension of it (a maj9 is a maj7, a 13 a 7). Null when nothing fits.
 */
export function identifyChord(pitches: number[]): { root: number; q: CtQ } | null {
  const ps = [...new Set(pitches)].sort((a, b) => a - b);
  if (ps.length < 3) return null;
  const pcs = [...new Set(ps.map(mod12))];
  const order: CtQ[] = ['maj7', 'm7', '7', 'm7b5', '6', 'm6', 'dim7', '7sus4', 'maj7#5', 'M', 'm', 'aug'];
  // Prefer the bass as the root, then any root; the first quality (7th chords before triads) that explains the notes.
  const roots = [mod12(ps[0]), ...pcs.filter((r) => r !== mod12(ps[0]))];
  // Pass 1: every note a chord tone (F A C D over F = F6, not Fmaj7 with a 13); pass 2: tensions allowed.
  for (const strict of [true, false])
    for (const r of roots)
      for (const q of order) {
        const tones = CT_Q[q].ints.map((x) => mod12(r + x));
        const hit = tones.filter((x) => pcs.includes(x)).length;
        const needs = q === 'M' || q === 'm' || q === 'aug' ? 3 : Math.min(3, tones.length);
        // the 3rd (or the sus 4th) must be there: without it the quality is a guess
        const third = mod12(r + CT_Q[q].ints[1]);
        if (hit >= needs && pcs.includes(third) && pcs.every((p) => tones.includes(p) || (!strict && holdsNote(r, q, p)))) return { root: r, q };
      }
  return null;
}

// ───────────────────────────── chromatic mediants and P / L / R ─────────────────────────────

export interface Triad {
  root: number;
  minor: boolean;
}
export const triadPcs = (t: Triad): number[] => [t.root, t.root + (t.minor ? 3 : 4), t.root + 7].map(mod12);
/** The pitch classes two triads share. */
export function commonTones(a: Triad, b: Triad): number[] {
  const B = triadPcs(b);
  return triadPcs(a).filter((p) => B.includes(p)).sort((x, y) => x - y);
}
/** The four chromatic mediants of a triad (same quality, a 3rd away): up M3, down M3, down m3, up m3. */
export const MEDIANT_MOVES: { id: 'upM3' | 'downM3' | 'downm3' | 'upm3'; d: number; name: T2 }[] = [
  { id: 'upM3', d: 4, name: { en: 'up a major 3rd', he: 'טרצה גדולה למעלה' } },
  { id: 'downM3', d: 8, name: { en: 'down a major 3rd', he: 'טרצה גדולה למטה' } },
  { id: 'downm3', d: 9, name: { en: 'down a minor 3rd', he: 'טרצה קטנה למטה' } },
  { id: 'upm3', d: 3, name: { en: 'up a minor 3rd', he: 'טרצה קטנה למעלה' } },
];
export const mediantsOf = (t: Triad): Triad[] => MEDIANT_MOVES.map((m) => ({ root: mod12(t.root + m.d), minor: t.minor }));
/** Doubly chromatic mediants: the opposite quality a major or minor 3rd away with no common tone (C ↔ A♭m, E♭m). */
export const doublyChromatic = (t: Triad): Triad[] => (t.minor ? [{ root: mod12(t.root + 4), minor: false }, { root: mod12(t.root + 9), minor: false }] : [{ root: mod12(t.root + 8), minor: true }, { root: mod12(t.root + 3), minor: true }]);

/** P (parallel), R (relative), L (leading-tone exchange): each keeps two common tones and moves one voice. */
export const P = (t: Triad): Triad => ({ root: t.root, minor: !t.minor });
export const R = (t: Triad): Triad => (t.minor ? { root: mod12(t.root + 3), minor: false } : { root: mod12(t.root - 3), minor: true });
export const L = (t: Triad): Triad => (t.minor ? { root: mod12(t.root - 4), minor: false } : { root: mod12(t.root + 4), minor: true });
export type PLR = 'P' | 'L' | 'R';
export const PLR_FN: Record<PLR, (t: Triad) => Triad> = { P, L, R };
/** Which single move turns a into b (null when none does). */
export function plrBetween(a: Triad, b: Triad): PLR | null {
  for (const k of ['P', 'L', 'R'] as PLR[]) {
    const c = PLR_FN[k](a);
    if (c.root === mod12(b.root) && c.minor === b.minor) return k;
  }
  return null;
}
/** The hexatonic cycle (P and L in turn): C – Cm – A♭ – A♭m – E – Em; its notes form the hexatonic scale C E♭ E G A♭ B. */
export function hexatonicCycle(root: number): Triad[] {
  const out: Triad[] = [{ root: mod12(root), minor: false }];
  for (let i = 0; i < 5; i++) out.push((i % 2 === 0 ? P : L)(out[out.length - 1]));
  return out;
}
/** The octatonic cycle (R and P in turn): C – Am – A – F♯m – F♯ – E♭m – E♭ – Cm. Roots C A F♯ E♭: the minor-third cycle. */
export function octatonicCycle(root: number): Triad[] {
  const out: Triad[] = [{ root: mod12(root), minor: false }];
  for (let i = 0; i < 7; i++) out.push((i % 2 === 0 ? R : P)(out[out.length - 1]));
  return out;
}
/** The roots of the octatonic cycle's major triads: the same minor-third cycle as the family of dominants (BARRY-HARRIS-THEORY §2). */
export const octatonicRoots = (root: number): number[] => octatonicCycle(root).filter((t) => !t.minor).map((t) => t.root);
/** Coltrane: three major chords a major 3rd apart; their roots spell an augmented triad (C E G♯ / A♭). */
export const coltraneRoots = (root: number): number[] => [0, 8, 4].map((d) => mod12(root + d));
/** Triad name (C, A♭m, F♯) in a key's spelling; the octatonic F♯ keeps its sharp. */
export const triadName = (t: Triad, flats = true): string => (t.root === 6 && flats ? 'F♯' : rootName(t.root, flats)) + (t.minor ? 'm' : '');

// ───────────────────────────── modal interchange ─────────────────────────────

export type Fn = 'T' | 'PD' | 'D';
export interface Borrowed {
  id: string;
  /** Roman numeral and the symbol in C. */
  rn: string;
  d: number;
  q: CtQ;
  from: T2;
  fn: Fn;
}
/** Chords from the parallel minor (or another mode on the same tonic) used in major (HARMONY-REHARM §4). */
export const BORROWED: Borrowed[] = [
  { id: 'iv', rn: 'iv', d: 5, q: 'm', from: { en: 'Aeolian', he: 'איאולי' }, fn: 'PD' },
  { id: 'ivm6', rn: 'ivm6', d: 5, q: 'm6', from: { en: 'Dorian minor', he: 'מינור דורי' }, fn: 'PD' },
  { id: 'ivm7', rn: 'ivm7', d: 5, q: 'm7', from: { en: 'Aeolian', he: 'איאולי' }, fn: 'PD' },
  { id: 'iiø7', rn: 'iiø7', d: 2, q: 'm7b5', from: { en: 'Aeolian', he: 'איאולי' }, fn: 'PD' },
  { id: 'bIII', rn: '♭IIImaj7', d: 3, q: 'maj7', from: { en: 'Aeolian', he: 'איאולי' }, fn: 'T' },
  { id: 'bVI', rn: '♭VImaj7', d: 8, q: 'maj7', from: { en: 'Aeolian', he: 'איאולי' }, fn: 'PD' },
  { id: 'bVII7', rn: '♭VII7', d: 10, q: '7', from: { en: 'Aeolian / Mixolydian', he: 'איאולי / מיקסולידי' }, fn: 'D' },
  { id: 'vm7', rn: 'v m7', d: 7, q: 'm7', from: { en: 'Mixolydian', he: 'מיקסולידי' }, fn: 'D' },
  { id: 'bII', rn: '♭IImaj7', d: 1, q: 'maj7', from: { en: 'Phrygian', he: 'פריגי' }, fn: 'D' },
];
/** Minor plagal: chords that go straight to I (iv, ivm6, ♭VI, ♭VII7, ♭IImaj7). */
export const MINOR_PLAGAL = ['iv', 'ivm6', 'bVI', 'bVII7', 'bII'];

// ───────────────────────────── the counter-line ─────────────────────────────

/**
 * The counter-line under a held note (HARMONY-REHARM §5): the bass walks down by half step from the held note and
 * every bass note renames the chord. Held C: C (root), Cmaj7/B (C = root), C7/B♭ (root), Am7 (♭3), A♭maj7 (3),
 * G7sus4 (11). `bass` and `root` are semitones from the held note; `slash` = the bass is not the root.
 */
export const COUNTER_LINE: { bass: number; root: number; q: CtQ; degree: string; slash: boolean }[] = [
  { bass: 0, root: 0, q: 'M', degree: '1', slash: false },
  { bass: -1, root: 0, q: 'maj7', degree: '1', slash: true },
  { bass: -2, root: 0, q: '7', degree: '1', slash: true },
  { bass: -3, root: -3, q: 'm7', degree: '♭3', slash: false },
  { bass: -4, root: -4, q: 'maj7', degree: '3', slash: false },
  { bass: -5, root: -5, q: '7sus4', degree: '11', slash: false },
];
/** The counter-line chord names under a held pitch class (C, Cmaj7/B, C7/B♭, Am7, A♭maj7, G7sus4 for C). */
export function counterLineNames(heldPc: number, flats = true): string[] {
  return COUNTER_LINE.map((c) => {
    const r = spellHeld(heldPc + c.root, c.q, heldPc, flats)!;
    if (!c.slash) return r.sym;
    // The bass is the chord's maj7 / ♭7: written on the letter below the root.
    const bass = onLetter(mod12(heldPc + c.bass), letterOf(r.rootName) + 6) ?? rootName(heldPc + c.bass, flats);
    return `${r.sym}/${bass}`;
  });
}

// ───────────────────────────── functional vs colour ─────────────────────────────

export type Family = 'functional' | 'colour';
/** The two families of reharm (HARMONY-REHARM §1). */
export const DEVICE_FAMILY: { id: string; fam: Family; name: T2 }[] = [
  { id: 'secondary', fam: 'functional', name: { en: 'Secondary dominant', he: 'דומיננטה משנית' } },
  { id: 'tritone', fam: 'functional', name: { en: 'Tritone sub', he: 'תחליף טריטון' } },
  { id: 'iiV', fam: 'functional', name: { en: 'Added ii–V', he: 'ii–V נוסף' } },
  { id: 'backdoor', fam: 'functional', name: { en: 'Backdoor', he: 'דלת אחורית' } },
  { id: 'pdim', fam: 'functional', name: { en: 'Passing diminished', he: 'מוקטן עובר' } },
  { id: 'mediant', fam: 'colour', name: { en: 'Chromatic mediant', he: 'מדיאנטה כרומטית' } },
  { id: 'planing', fam: 'colour', name: { en: 'Planing', he: 'פליינינג' } },
  { id: 'mi', fam: 'colour', name: { en: 'Modal interchange', he: 'השאלה מודאלית' } },
  { id: 'pedal', fam: 'colour', name: { en: 'Pedal point', he: 'צליל פדל' } },
  { id: 'common', fam: 'colour', name: { en: 'Common tone', he: 'צליל משותף' } },
  { id: 'slip', fam: 'colour', name: { en: 'Side-slip', he: 'החלקה הצידה' } },
];

// Moving between keys (docs/AUDIT-GAPS-2.md High #5, #6; Medium #11, #12): the harmonic music behind the k-keys /
// g-keys / b-keys families (drills/keyMoveDrills.ts) and the "how did it modulate" ear topics (topicsKeyMoves.ts).
// Pure and deterministic. Every chord is spelled in its own key (E7 → A6 after C6; B♭7 → E♭6), letters in both languages.
//
// Devices:
//   dim      the common diminished (Barry Harris): key A's I6 → a diminished 7th → lower one note a half step → V7 of
//            key B → I6. Key A's own diminished (its vii°7) leads to the keys a minor third apart (A, A±3, A+6); the
//            other two diminished chords (vii°7 of key B) reach the other eight.
//   dimb9    the same, but raise one note a whole step: a 7♭9 (root, ♭9, 3, 5) on key B's V.
//   pivot    a chord both keys share, then key B's cadence.
//   iiv      a ii–V of key B straight after key A.
//   tritone  key B's ii, then the tritone sub of its V (♭II7).
//   direct   key A's cadence, then key B's, no preparation.
//   pop      a pop lift up a half step or a whole step (triads), straight or through key B's V.
// Turnarounds (I–VI7–ii–V, I–♭III7–♭VI7–♭II7, Ladybird, I–♯I°7–ii–♯ii°7) and the rhythm-changes bridge
// (III7–VI7–II7–V7) use the same chord model.

import type { VLQuality } from './drills/voiceLead';

const mod12 = (n: number): number => ((n % 12) + 12) % 12;

/** Major keys as musicians name them (flats in flat keys; G♭ for the tritone key). */
export const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** Minor keys (C♯m, F♯m, G♯m, B♭m). */
export const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
export const KEY_NAMES_HE = ['דו', 'רה♭', 'רה', 'מי♭', 'מי', 'פה', 'סול♭', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const LETTERS = 'CDEFGAB';
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const LETTER_HE: Record<string, string> = { C: 'דו', D: 'רה', E: 'מי', F: 'פה', G: 'סול', A: 'לה', B: 'סי' };

export const keyName = (key: number, minor = false): string => (minor ? MINOR_NAMES : KEY_NAMES)[mod12(key)] + (minor ? 'm' : '');
/** A note name in Hebrew from its letter spelling ("E♭" → "מי♭"). */
export const heName = (name: string): string => (LETTER_HE[name[0]] ?? name[0]) + name.slice(1);

/**
 * The note `semis` above the tonic of `key`, `steps` letters up (a scale degree): in C, ♭III is (3, 2) → E♭; in A,
 * ♭II is (1, 1) → B♭; in F, ♯I is (1, 0) → F♯. A double sharp / flat falls back to the plain name.
 */
export function spellDeg(key: number, semis: number, steps: number, minor = false): string {
  const kn = (minor ? MINOR_NAMES : KEY_NAMES)[mod12(key)];
  const L = (LETTERS.indexOf(kn[0]) + steps) % 7;
  const want = mod12(key + semis);
  const acc = mod12(want - LETTER_PC[L] + 6) - 6;
  if (acc === 0) return LETTERS[L];
  if (acc === -1) return `${LETTERS[L]}♭`;
  if (acc === 1) return `${LETTERS[L]}♯`;
  return KEY_NAMES[want];
}

const LABEL: Record<VLQuality, string> = { M: '', m: 'm', dim: '°', maj7: 'maj7', '7': '7', m7: 'm7', m7b5: 'm7♭5', dim7: '°7', '6': '6', m6: 'm6', '7b9': '7♭9', '7b9r': '7♭9' };
/** Chord-tone intervals above the root (the 4-note chord; triads 3). */
export const KQ_INTS: Record<VLQuality, number[]> = { M: [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], maj7: [0, 4, 7, 11], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '7b9': [0, 4, 7, 10], '7b9r': [0, 1, 4, 7] };

/** Which part of the move a chord belongs to. */
export type Role = 'A' | 'move' | 'B';
export interface KChord {
  root: number;
  q: VLQuality;
  name: string;
  beats: number;
  role: Role;
}
const ch = (key: number, semis: number, steps: number, q: VLQuality, beats: number, role: Role, minor = false): KChord => ({ root: mod12(key + semis), q, name: spellDeg(key, semis, steps, minor) + LABEL[q], beats, role });

export type Device = 'dim' | 'dimb9' | 'pivot' | 'iiv' | 'tritone' | 'direct' | 'pop';
export interface KeyMove {
  device: Device;
  from: number;
  to: number;
  /** Key B is minor (the pivot to the relative minor). */
  toMinor?: boolean;
  chords: KChord[];
}

/** Key A's opening: its I6, or a ii–V–I6. */
export function homeStart(A: number, start: 'I6' | 'iiVI' | 'Imaj7' = 'I6'): KChord[] {
  if (start === 'iiVI') return [ch(A, 2, 1, 'm7', 2, 'A'), ch(A, 7, 4, '7', 2, 'A'), ch(A, 0, 0, '6', 4, 'A')];
  return [ch(A, 0, 0, start === 'I6' ? '6' : 'maj7', 4, 'A')];
}

/** The diminished 7th of a move: key A's own (its vii°7) when key B is a minor third away, else key B's vii°7. */
export function moveDim(A: number, B: number): KChord {
  return mod12(B - A) % 3 === 0 ? ch(A, 11, 6, 'dim7', 2, 'move') : ch(B, 11, 6, 'dim7', 2, 'move');
}
/** The common diminished: I6 (or ii–V–I6) in A → °7 → V7 (or 7♭9) of B → I6 in B. */
export function dimMove(A: number, B: number, o: { start?: 'I6' | 'iiVI'; b9?: boolean } = {}): KeyMove {
  return {
    device: o.b9 ? 'dimb9' : 'dim',
    from: mod12(A),
    to: mod12(B),
    chords: [...homeStart(A, o.start ?? 'I6'), moveDim(A, B), ch(B, 7, 4, o.b9 ? '7b9r' : '7', 2, 'move'), ch(B, 0, 0, '6', 4, 'B')],
  };
}

/** The four pivot moves (a chord diatonic to both keys, then key B's cadence). */
export const PIVOTS: { id: string; off: number; minor?: boolean; en: string; he: string }[] = [
  { id: 'V', off: 7, en: 'to the dominant: vi of A = ii of B', he: 'לדומיננטה: vi של A = ii של B' },
  { id: 'IV', off: 5, en: 'to the subdominant: ii of A = vi of B', he: 'לסובדומיננטה: ii של A = vi של B' },
  { id: 'ii', off: 2, en: 'up a whole step: iii of A = ii of B', he: 'טון למעלה: iii של A = ii של B' },
  { id: 'vi', off: 9, minor: true, en: 'to the relative minor: IV of A = VI of B', he: 'למינור המקביל: IV של A = VI של B' },
];
export function pivotMove(A: number, which: number): KeyMove {
  const p = PIVOTS[mod12(which) % PIVOTS.length];
  const B = mod12(A + p.off);
  const I = ch(A, 0, 0, 'maj7', 4, 'A');
  let chords: KChord[];
  if (p.id === 'V') chords = [I, ch(A, 9, 5, 'm7', 4, 'move'), ch(B, 7, 4, '7', 4, 'B'), ch(B, 0, 0, 'maj7', 4, 'B')];
  else if (p.id === 'IV') chords = [I, ch(A, 2, 1, 'm7', 4, 'move'), ch(B, 2, 1, 'm7', 2, 'B'), ch(B, 7, 4, '7', 2, 'B'), ch(B, 0, 0, 'maj7', 4, 'B')];
  else if (p.id === 'ii') chords = [I, ch(A, 4, 2, 'm7', 4, 'move'), ch(B, 7, 4, '7', 4, 'B'), ch(B, 0, 0, 'maj7', 4, 'B')];
  else chords = [I, ch(A, 5, 3, 'maj7', 4, 'move'), ch(B, 2, 1, 'm7b5', 2, 'B', true), ch(B, 7, 4, '7', 2, 'B', true), ch(B, 0, 0, 'm6', 4, 'B', true)];
  return { device: 'pivot', from: mod12(A), to: B, ...(p.minor ? { toMinor: true } : {}), chords };
}

/** A ii–V of the new key straight after key A's I. */
export function iiVMove(A: number, B: number): KeyMove {
  return { device: 'iiv', from: mod12(A), to: mod12(B), chords: [ch(A, 0, 0, 'maj7', 4, 'A'), ch(B, 2, 1, 'm7', 2, 'move'), ch(B, 7, 4, '7', 2, 'move'), ch(B, 0, 0, 'maj7', 4, 'B')] };
}
/** Key B's ii, then the tritone sub of its V (♭II7), into its I. */
export function tritoneMove(A: number, B: number): KeyMove {
  return { device: 'tritone', from: mod12(A), to: mod12(B), chords: [ch(A, 0, 0, 'maj7', 4, 'A'), ch(B, 2, 1, 'm7', 2, 'move'), ch(B, 1, 1, '7', 2, 'move'), ch(B, 0, 0, 'maj7', 4, 'B')] };
}
/** Key A's cadence, then key B's: no preparation. */
export function directMove(A: number, B: number): KeyMove {
  return {
    device: 'direct',
    from: mod12(A),
    to: mod12(B),
    chords: [ch(A, 0, 0, 'maj7', 2, 'A'), ch(A, 7, 4, '7', 2, 'A'), ch(A, 0, 0, 'maj7', 4, 'A'), ch(B, 0, 0, 'maj7', 2, 'B'), ch(B, 7, 4, '7', 2, 'B'), ch(B, 0, 0, 'maj7', 4, 'B')],
  };
}
/** A pop lift (triads): I–IV–V in A, then up a half or whole step — straight, or through key B's V. */
export function popMove(A: number, up: 1 | 2, viaV: boolean): KeyMove {
  const B = mod12(A + up);
  const chords = [ch(A, 0, 0, 'M', 4, 'A'), ch(A, 5, 3, 'M', 2, 'A'), ch(A, 7, 4, 'M', 2, 'A'), ...(viaV ? [ch(B, 7, 4, 'M', 4, 'move')] : []), ch(B, 0, 0, 'M', 4, 'B'), ch(B, 5, 3, 'M', 2, 'B'), ch(B, 7, 4, 'M', 2, 'B'), ch(B, 0, 0, 'M', 4, 'B')];
  return { device: 'pop', from: mod12(A), to: B, chords };
}

export type TurnKind = 'vi7' | 'dim' | 'tritone' | 'ladybird';
/** The turnaround variants in a key (two beats a chord, the tonic held at the end). */
export function turnaround(A: number, kind: TurnKind): KChord[] {
  const I = (b = 2) => ch(A, 0, 0, 'maj7', b, 'A');
  const ii = ch(A, 2, 1, 'm7', 2, 'A');
  const V = ch(A, 7, 4, '7', 2, 'A');
  if (kind === 'vi7') return [I(), ch(A, 9, 5, '7', 2, 'A'), ii, V, I(4)];
  if (kind === 'tritone') return [I(), ch(A, 3, 2, '7', 2, 'A'), ch(A, 8, 5, '7', 2, 'A'), ch(A, 1, 1, '7', 2, 'A'), I(4)];
  if (kind === 'ladybird') return [I(), ch(A, 3, 2, '7', 2, 'A'), ch(A, 8, 5, 'maj7', 2, 'A'), ch(A, 1, 1, '7', 2, 'A'), I(4)];
  // I–♯I°7–ii–♯ii°7–iii, then VI7–ii–V–I (the bass climbs by half steps).
  return [I(), ch(A, 1, 0, 'dim7', 2, 'A'), ii, ch(A, 3, 1, 'dim7', 2, 'A'), ch(A, 4, 2, 'm7', 2, 'A'), ch(A, 9, 5, '7', 2, 'A'), ii, V, I(4)];
}
export const TURN_NAME: Record<TurnKind, { en: string; he: string }> = {
  vi7: { en: 'I–VI7–ii–V', he: 'I–VI7–ii–V' },
  dim: { en: 'I–♯I°7–ii–♯ii°7', he: 'I–♯I°7–ii–♯ii°7' },
  tritone: { en: 'I–♭III7–♭VI7–♭II7', he: 'I–♭III7–♭VI7–♭II7' },
  ladybird: { en: 'Ladybird: I–♭III7–♭VImaj7–♭II7', he: 'לידיבירד: I–♭III7–♭VImaj7–♭II7' },
};
/** The rhythm-changes bridge: III7–VI7–II7–V7 (a bar each), then I. */
export function bridge(A: number): KChord[] {
  return [ch(A, 4, 2, '7', 4, 'A'), ch(A, 9, 5, '7', 4, 'A'), ch(A, 2, 1, '7', 4, 'A'), ch(A, 7, 4, '7', 4, 'A'), ch(A, 0, 0, 'maj7', 4, 'A')];
}

/** Beat of each chord. */
export const chordBeats = (cs: KChord[]): number[] => {
  let b = 0;
  return cs.map((c) => {
    const at = b;
    b += c.beats;
    return at;
  });
};
export const totalBeats = (cs: KChord[]): number => cs.reduce((s, c) => s + c.beats, 0);

/** Pitch classes of a chord. */
export const chordPcs = (c: Pick<KChord, 'root' | 'q'>): number[] => KQ_INTS[c.q].map((i) => mod12(c.root + i));

// ───────────────────────────── names of moves ─────────────────────────────

/** A distance between keys, named (up a minor third, a tritone …). */
export function moveName(off: number): { en: string; he: string } {
  const o = mod12(off);
  return (
    [
      { en: 'the same key', he: 'אותו סולם' },
      { en: 'up a half step', he: 'חצי טון למעלה' },
      { en: 'up a whole step', he: 'טון למעלה' },
      { en: 'up a minor 3rd', he: 'טרצה קטנה למעלה' },
      { en: 'up a major 3rd', he: 'טרצה גדולה למעלה' },
      { en: 'up a 4th', he: 'קוורטה למעלה' },
      { en: 'a tritone away', he: 'טריטון' },
      { en: 'down a 4th', he: 'קוורטה למטה' },
      { en: 'down a major 3rd', he: 'טרצה גדולה למטה' },
      { en: 'down a minor 3rd', he: 'טרצה קטנה למטה' },
      { en: 'down a whole step', he: 'טון למטה' },
      { en: 'down a half step', he: 'חצי טון למטה' },
    ] as const
  )[o];
}

export const DEVICE_NAME: Record<Device, { en: string; he: string }> = {
  dim: { en: 'The common diminished', he: 'המוקטן המשותף' },
  dimb9: { en: 'The diminished, raised to 7♭9', he: 'המוקטן, מורם ל־7♭9' },
  pivot: { en: 'A pivot chord', he: 'אקורד ציר' },
  iiv: { en: 'A ii–V of the new key', he: 'ii–V של הסולם החדש' },
  tritone: { en: 'A tritone sub into it', he: 'תחליף טריטון לתוכו' },
  direct: { en: 'Direct, no preparation', he: 'ישירות, בלי הכנה' },
  pop: { en: 'A pop lift', he: 'הרמה פופית' },
};

// ───────────────────────────── the 6th-diminished line ─────────────────────────────

/** Barry Harris's major 6th-diminished scale (C D E F G A♭ A B). */
export const SIX_DIM = [0, 2, 4, 5, 7, 8, 9, 11];

export interface LineNote {
  pitch: number;
  beat: number;
  dur: number;
  /** A chord tone of the bar's chord on a downbeat. */
  ct: boolean;
}
/**
 * The melodic move (eighths): key A's 6th-diminished scale up from its tonic (bar 1), the move's diminished arpeggio
 * up and key B's V7 arpeggio down (bar 2), key B's 6th-diminished scale down from its tonic (bar 3), landing on key
 * B's tonic (bar 4). `base` = the lowest tonic allowed (piano 55, guitar 43, bass 28).
 */
export function sixDimLine(A: number, B: number, base: number): LineNote[] {
  const out: LineNote[] = [];
  const tA = base + mod12(A - base);
  let beat = 0;
  const push = (pitch: number, ct: boolean, dur = 0.5) => {
    out.push({ pitch, beat, dur, ct });
    beat += dur;
  };
  // bar 1: A's scale up (8 notes, the 6 chord's tones on the downbeats: 1 3 5 6 of the scale are steps 0 2 4 6).
  SIX_DIM.forEach((x, i) => push(tA + x, i % 2 === 0));
  // bar 2: the diminished up from the note above the scale's top, then V7 of B down.
  const dimPcs = chordPcs(moveDim(A, B));
  let p = tA + 11;
  const dim: number[] = [];
  while (dim.length < 4) {
    p++;
    if (dimPcs.includes(mod12(p))) dim.push(p);
  }
  dim.forEach((x, i) => push(x, i === 0));
  const vPcs = chordPcs({ root: mod12(B + 7), q: '7' });
  let q = dim[3];
  const dom: number[] = [];
  while (dom.length < 4) {
    q--;
    if (vPcs.includes(mod12(q))) dom.push(q);
  }
  dom.forEach((x, i) => push(x, i === 0));
  // bar 3: B's scale down from the tonic nearest the V7's last note.
  const last = dom[3];
  let tB = last + mod12(B - last);
  if (tB - last > 6) tB -= 12;
  [0, -1, -3, -4, -5, -7, -8, -10].forEach((x, i) => push(tB + x, i % 2 === 0));
  // bar 4: home in B.
  push(tB - 12, true, 4);
  // Keep it in reach: the whole line moves by octaves so its lowest note is at or above `base`.
  const lo = Math.min(...out.map((n) => n.pitch));
  const shift = lo < base ? 12 * Math.ceil((base - lo) / 12) : 0;
  return out.map((n) => ({ ...n, pitch: n.pitch + shift }));
}

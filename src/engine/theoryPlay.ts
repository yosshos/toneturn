// Theory you play (docs/AUDIT-CONTENT-THEORY.md §ז.2, TP-1…TP-5): the exact music behind triad pairs, pentatonic
// superimposition, polychords / upper structures and reharmonising a melody — shared by the ear topics
// (topicsTheoryPlay.ts), the keys family k-theory (drills/generate.ts) and the guitar levels (drills/guitarJazz.ts).
// Every table is checked in tests/theoryPlay.test.ts: a triad pair is exactly its scale minus one named tone, a
// pentatonic's degrees over the chord are the colour it is called, a polychord's label follows from its notes.
// Pure, no randomness. Intervals are semitones above the chord root (0 = root).
//
// Corrections against the audit's sketch (a jazz teacher will check): G♭ + A♭ over C7alt give root, ♭9, ♯9, ♭5, ♭13,
// ♭7 — the altered scale WITHOUT the 3rd (A♭ major holds C, not E); D + E over C is lydian augmented (G♯ = ♯5), so the
// lydian pair over Cmaj7♯11 is D + Em; D minor pentatonic holds F (the avoid 11th over Cmaj7), so the lydian
// pentatonic over Cmaj7 is D major (= B minor) and D minor pentatonic is used over Cm7 (dorian).

type Bi = { en: string; he: string };
export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
const set = (xs: number[]): number[] => [...new Set(xs.map(mod12))].sort((a, b) => a - b);
export const triadOf = (root: number, minor: boolean): number[] => [root, root + (minor ? 3 : 4), root + 7].map(mod12);

/** Scales used here (intervals above the chord root). */
export const TP_SCALES: Record<string, { ints: number[]; n: Bi }> = {
  ionian: { ints: [0, 2, 4, 5, 7, 9, 11], n: { en: 'major (ionian)', he: 'מז׳ור (יוני)' } },
  lydian: { ints: [0, 2, 4, 6, 7, 9, 11], n: { en: 'lydian', he: 'לידי' } },
  'lydian-aug': { ints: [0, 2, 4, 6, 8, 9, 11], n: { en: 'lydian augmented', he: 'לידי מוגדל' } },
  dorian: { ints: [0, 2, 3, 5, 7, 9, 10], n: { en: 'dorian', he: 'דורי' } },
  mixolydian: { ints: [0, 2, 4, 5, 7, 9, 10], n: { en: 'mixolydian', he: 'מיקסולידי' } },
  'lydian-dom': { ints: [0, 2, 4, 6, 7, 9, 10], n: { en: 'lydian dominant', he: 'לידי דומיננטי' } },
  altered: { ints: [0, 1, 3, 4, 6, 8, 10], n: { en: 'altered', he: 'אלטרד' } },
  'half-whole': { ints: [0, 1, 3, 4, 6, 7, 9, 10], n: { en: 'half-whole diminished', he: 'מוקטן חצי-שלם' } },
};

/** Degree names of intervals over a chord (as players say them over that chord quality). */
const DEG_DOM: Record<number, string> = { 0: '1', 1: '♭9', 2: '9', 3: '♯9', 4: '3', 5: '11', 6: '♯11', 7: '5', 8: '♭13', 9: '13', 10: '♭7', 11: '7' };
const DEG_MAJ: Record<number, string> = { ...DEG_DOM, 8: '♯5', 10: '♭7' };
const DEG_MIN: Record<number, string> = { ...DEG_DOM, 3: '♭3', 8: '♭13' };
export function degName(iv: number, chord: 'maj7' | '7' | 'm7'): string {
  return (chord === 'maj7' ? DEG_MAJ : chord === 'm7' ? DEG_MIN : DEG_DOM)[mod12(iv)];
}

// ───────────────────────────── TP-1 triad pairs ─────────────────────────────

export type PairId = 'dorian' | 'lydian' | 'lydian-dom' | 'altered' | 'lydian-aug' | 'mixolydian';
export interface TriadPair {
  id: PairId;
  /** The chord it sounds over (symbol suffix) and its quality family. */
  chord: string;
  q: 'maj7' | '7' | 'm7';
  /** The two triads: root interval above the chord root, minor or major. */
  a: [number, boolean];
  b: [number, boolean];
  /** The scale whose tones they cover, and the one tone of it they leave out. */
  scale: keyof typeof TP_SCALES;
  missing: number;
  colour: Bi;
}
export const TRIAD_PAIRS: TriadPair[] = [
  { id: 'dorian', chord: 'm7', q: 'm7', a: [3, false], b: [5, false], scale: 'dorian', missing: 2, colour: { en: 'dorian', he: 'דורי' } },
  { id: 'lydian', chord: 'maj7♯11', q: 'maj7', a: [2, false], b: [4, true], scale: 'lydian', missing: 0, colour: { en: 'lydian', he: 'לידי' } },
  { id: 'lydian-dom', chord: '7♯11', q: '7', a: [0, false], b: [2, false], scale: 'lydian-dom', missing: 10, colour: { en: 'lydian dominant', he: 'לידי דומיננטי' } },
  { id: 'altered', chord: '7alt', q: '7', a: [6, false], b: [8, false], scale: 'altered', missing: 4, colour: { en: 'altered', he: 'אלטרד' } },
  { id: 'lydian-aug', chord: 'maj7♯5', q: 'maj7', a: [2, false], b: [4, false], scale: 'lydian-aug', missing: 0, colour: { en: 'lydian augmented', he: 'לידי מוגדל' } },
  { id: 'mixolydian', chord: '7', q: '7', a: [10, false], b: [0, false], scale: 'mixolydian', missing: 9, colour: { en: 'mixolydian', he: 'מיקסולידי' } },
];
export const pairById = (id: PairId): TriadPair => TRIAD_PAIRS.find((p) => p.id === id)!;
/** The pair's two triads (pitch classes) over a chord root. */
export function pairTriads(p: TriadPair, root: number): [number[], number[]] {
  return [triadOf(root + p.a[0], p.a[1]), triadOf(root + p.b[0], p.b[1])];
}
/** The hexatonic: the six notes of the pair (pitch classes, sorted). */
export const hexatonic = (p: TriadPair, root: number): number[] => set(pairTriads(p, root).flat());
/** The pair's name in a key: "G♭ + A♭", "D + Em". */
export function pairName(p: TriadPair, root: number, name: (pc: number) => string): string {
  return `${name(root + p.a[0])}${p.a[1] ? 'm' : ''} + ${name(root + p.b[0])}${p.b[1] ? 'm' : ''}`;
}

// ───────────────────────────── TP-2 pentatonic superimposition ─────────────────────────────

export type PentId = 'inside-maj' | 'lydian' | 'dorian' | 'inside-dom' | 'altered';
export interface PentSuper {
  id: PentId;
  chord: string;
  q: 'maj7' | '7' | 'm7';
  /** Root of the pentatonic above the chord root, and minor or major pentatonic. */
  root: number;
  minor: boolean;
  colour: Bi;
  /** The chord scale its notes belong to. */
  scale: keyof typeof TP_SCALES;
}
export const PENT_MAJ = [0, 2, 4, 7, 9];
export const PENT_MIN = [0, 3, 5, 7, 10];
export const PENTS: PentSuper[] = [
  { id: 'inside-maj', chord: 'maj7', q: 'maj7', root: 7, minor: false, colour: { en: 'inside: 3, 5, 7, 9, 13', he: 'פנימי: 3, 5, 7, 9, 13' }, scale: 'ionian' },
  { id: 'lydian', chord: 'maj7', q: 'maj7', root: 2, minor: false, colour: { en: 'lydian: ♯11', he: 'לידי: ♯11' }, scale: 'lydian' },
  { id: 'dorian', chord: 'm7', q: 'm7', root: 2, minor: true, colour: { en: 'dorian: 9, 11, 13', he: 'דורי: 9, 11, 13' }, scale: 'dorian' },
  { id: 'inside-dom', chord: '7', q: '7', root: 0, minor: false, colour: { en: 'inside: 1, 9, 3, 5, 13', he: 'פנימי: 1, 9, 3, 5, 13' }, scale: 'mixolydian' },
  { id: 'altered', chord: '7alt', q: '7', root: 3, minor: true, colour: { en: 'altered: ♭9, ♯9, ♭5, ♭13', he: 'אלטרד: ♭9, ♯9, ♭5, ♭13' }, scale: 'altered' },
];
export const pentById = (id: PentId): PentSuper => PENTS.find((p) => p.id === id)!;
/** The pentatonic's notes over a chord root (pitch classes in scale order from the pentatonic's own root). */
export const pentNotes = (p: PentSuper, chordRoot: number): number[] => (p.minor ? PENT_MIN : PENT_MAJ).map((x) => mod12(chordRoot + p.root + x));
export const pentName = (p: PentSuper, chordRoot: number, name: (pc: number) => string, he = false): string =>
  he ? `${name(chordRoot + p.root)} ${p.minor ? 'מינור' : 'מז׳ור'} פנטטוני` : `${name(chordRoot + p.root)} ${p.minor ? 'minor' : 'major'} pentatonic`;
/** The degrees the pentatonic gives over the chord ("9 3 ♯11 13 7"). */
export const pentDegrees = (p: PentSuper): string[] => (p.minor ? PENT_MIN : PENT_MAJ).map((x) => degName(p.root + x, p.q));

// ───────────────────────────── TP-3 polychords and upper structures ─────────────────────────────

export type SlashKind = 'inversion' | 'lydian' | 'sus' | 'other';
/**
 * What a slash chord X/b does: the bass in the triad → an inversion (C/E); a major triad a whole step above the bass →
 * the lydian upper structure (D/C = C, D, F♯, A: 9, ♯11, 13 — in a ii–V it is also D7/C, V7/V in third inversion);
 * a major triad a whole step below → a dominant sus (F/G = G9sus4: ♭7, 9, 11). Anything else is another polychord.
 */
export function slashKind(triadRoot: number, minor: boolean, bass: number): SlashKind {
  const tri = triadOf(triadRoot, minor);
  if (tri.includes(mod12(bass))) return 'inversion';
  if (!minor && mod12(triadRoot - bass) === 2) return 'lydian';
  if (!minor && mod12(bass - triadRoot) === 2) return 'sus';
  return 'other';
}
export const SLASH_NAME: Record<Exclude<SlashKind, 'other'>, Bi> = {
  inversion: { en: 'inversion', he: 'היפוך' },
  lydian: { en: 'upper structure (lydian)', he: 'מבנה עליון (לידי)' },
  sus: { en: 'dominant sus', he: 'דומיננט sus' },
};

export type UstId = 'ii-dom' | 'vm-dom' | 'vim-dom' | 'vi-dom' | 'biii-dom' | 'bv-dom' | 'bvi-dom' | 'v-maj' | 'ii-maj' | 'vii-maj' | 'iii-maj' | 'iv-min' | 'bvii-min';
export interface Ust {
  id: UstId;
  /** The chord under it. */
  q: 'maj7' | '7' | 'm7';
  /** The triad above the root and its quality. */
  t: number;
  minor: boolean;
  /** The chord symbol it makes (suffix after the root). */
  sym: string;
  /** Roman name of the triad over the chord root. */
  roman: string;
}
export const USTS: Ust[] = [
  { id: 'ii-dom', q: '7', t: 2, minor: false, sym: '13♯11', roman: 'II' },
  { id: 'vm-dom', q: '7', t: 7, minor: true, sym: '9', roman: 'v' },
  { id: 'vim-dom', q: '7', t: 9, minor: true, sym: '13', roman: 'vi' },
  { id: 'vi-dom', q: '7', t: 9, minor: false, sym: '13♭9', roman: 'VI' },
  { id: 'biii-dom', q: '7', t: 3, minor: false, sym: '7♯9', roman: '♭III' },
  { id: 'bv-dom', q: '7', t: 6, minor: false, sym: '7♭9♯11', roman: '♭V' },
  { id: 'bvi-dom', q: '7', t: 8, minor: false, sym: '7♯9♭13', roman: '♭VI' },
  { id: 'v-maj', q: 'maj7', t: 7, minor: false, sym: 'maj9', roman: 'V' },
  { id: 'ii-maj', q: 'maj7', t: 2, minor: false, sym: 'maj13♯11', roman: 'II' },
  { id: 'vii-maj', q: 'maj7', t: 11, minor: true, sym: 'maj9♯11', roman: 'vii' },
  { id: 'iii-maj', q: 'maj7', t: 4, minor: false, sym: 'maj7♯5', roman: 'III' },
  { id: 'iv-min', q: 'm7', t: 5, minor: false, sym: 'm13', roman: 'IV' },
  { id: 'bvii-min', q: 'm7', t: 10, minor: false, sym: 'm11', roman: '♭VII' },
];
export const ustById = (id: UstId): Ust => USTS.find((u) => u.id === id)!;
/** The shell under an upper structure: root, 3rd, 7th (intervals). */
export const SHELL: Record<'maj7' | '7' | 'm7', number[]> = { maj7: [0, 4, 11], '7': [0, 4, 10], m7: [0, 3, 10] };
/** All pitch classes of chord + triad over a root. */
export const ustPcs = (u: Ust, root: number): number[] => set([...SHELL[u.q].map((x) => root + x), ...triadOf(root + u.t, u.minor)]);
/** The triad's degrees over the chord ("9 ♯11 13"). */
export const ustDegrees = (u: Ust): string[] => [0, u.minor ? 3 : 4, 7].map((x) => degName(u.t + x, u.q));
export const ALTERED_TENSIONS = [1, 3, 8];
/** Over a dominant: natural (only 9, ♯11, 13 above the chord tones) or altered (holds ♭9, ♯9 or ♭13). */
export function domClass(u: Ust): 'natural' | 'altered' {
  const tri = triadOf(u.t, u.minor);
  return tri.some((x) => ALTERED_TENSIONS.includes(x)) ? 'altered' : 'natural';
}
/** Over a dominant, the colour by scale: altered tensions → altered; a ♯11 with only natural 9 / 13 → lydian dominant; else natural (mixolydian). */
export function domColour(u: Ust): 'natural' | 'lydian-dom' | 'altered' {
  if (domClass(u) === 'altered') return 'altered';
  return triadOf(u.t, u.minor).includes(6) ? 'lydian-dom' : 'natural';
}
/** The chord scales (of TP_SCALES) that hold every note of the chord + triad. */
export function scalesHolding(pcsOverRoot: number[], candidates: (keyof typeof TP_SCALES)[]): (keyof typeof TP_SCALES)[] {
  return candidates.filter((s) => pcsOverRoot.every((x) => TP_SCALES[s].ints.includes(mod12(x))));
}

// ───────────────────────────── TP-4 reharmonise it yourself ─────────────────────────────

export type RQ = '7' | 'maj7' | 'm7' | 'dim7' | 'm6' | 'mmaj7' | 'm7b5';
export const RQ_TONES: Record<RQ, number[]> = { '7': [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dim7: [0, 3, 6, 9], m6: [0, 3, 7, 9], mmaj7: [0, 3, 7, 11], m7b5: [0, 3, 6, 10] };
export const RQ_SYM: Record<RQ, string> = { '7': '7', maj7: 'maj7', m7: 'm7', dim7: '°7', m6: 'm6', mmaj7: 'm(maj7)', m7b5: 'm7♭5' };
/**
 * Melody notes a chord can carry (chord tone or available tension, intervals above its root): a dominant takes every
 * tension but the natural 11 and the major 7; maj7 / 6 the lydian-major tones; m7 dorian; °7 the whole-half scale.
 */
export const MELODY_OK: Record<RQ, number[]> = {
  '7': [0, 1, 2, 3, 4, 6, 7, 8, 9, 10],
  maj7: [0, 2, 4, 6, 7, 9, 11],
  m7: [0, 2, 3, 5, 7, 9, 10],
  dim7: [0, 2, 3, 5, 6, 8, 9, 11],
  m6: [0, 2, 3, 5, 7, 9, 11],
  mmaj7: [0, 2, 3, 5, 7, 9, 11],
  m7b5: [0, 2, 3, 5, 6, 8, 10],
};
export const holdsMelody = (root: number, q: RQ, melody: number): boolean => MELODY_OK[q].includes(mod12(melody - root));

export interface RChord {
  /** Root above the key's tonic. */
  d: number;
  q: RQ;
}
export type Slot = 'dominant' | 'into-ii';
export type Device = 'tritone' | 'backdoor' | 'added-ii' | 'passing-dim' | 'line-cliche';
export const DEVICE_NAME: Record<Device, Bi> = {
  tritone: { en: 'tritone sub', he: 'תחליף טריטון' },
  backdoor: { en: 'backdoor', he: 'דלת אחורית' },
  'added-ii': { en: 'added ii–V', he: 'ii–V נוסף' },
  'passing-dim': { en: 'passing diminished', he: 'דימיניש עובר' },
  'line-cliche': { en: 'line cliché', he: 'ליין קלישה' },
};
/**
 * Chords that do a slot's job in a major key (tonic = 0): the dominant slot (V7 → I) takes V7, its tritone sub ♭II7
 * and the backdoor ♭VII7; the slot from I into ii takes the passing ♯I°7, the secondary dominant VI7 (V7/ii) and its
 * tritone sub ♭III7.
 */
export const SLOT_CHORDS: Record<Slot, { c: RChord; device: Device | 'original' }[]> = {
  dominant: [
    { c: { d: 7, q: '7' }, device: 'original' },
    { c: { d: 1, q: '7' }, device: 'tritone' },
    { c: { d: 10, q: '7' }, device: 'backdoor' },
  ],
  'into-ii': [
    { c: { d: 1, q: 'dim7' }, device: 'passing-dim' },
    { c: { d: 9, q: '7' }, device: 'original' },
    { c: { d: 3, q: '7' }, device: 'tritone' },
  ],
};
/** Is a chord a valid reharmonisation of the slot holding the melody (a pitch class above the tonic)? */
export function reharmValid(slot: Slot, c: RChord, melody: number): boolean {
  const ok = SLOT_CHORDS[slot].some((x) => mod12(x.c.d - c.d) === 0 && x.c.q === c.q) || (slot === 'into-ii' && c.q === 'dim7' && RQ_TONES.dim7.some((x) => mod12(1 + x - c.d) === 0));
  return ok && holdsMelody(c.d, c.q, melody);
}
/**
 * The voicings accepted for a chord holding the melody (pitch-class sets, any octave): root + 3rd + 7th + melody, with
 * or without the 5th (a °7: its four notes). Every set contains the melody note. The root is required: a tritone sub
 * shares its 3rd and 7th with the V it replaces, so without the root the reharm would not be heard.
 */
export function voicingSets(c: RChord, tonic: number, melody: number): number[][] {
  const t = RQ_TONES[c.q].map((x) => mod12(tonic + c.d + x));
  const mel = mod12(tonic + melody);
  if (c.q === 'dim7') return [set([...t, mel])];
  const [r, third, fifth, seventh] = t;
  return [[r, third, seventh], [r, third, fifth, seventh]].map((v) => set([...v, mel]));
}
/** Line clichés (a voice moving by half steps over a held chord): minor i – i(maj7) – i7 – i6; major I – I+ – I6 – I7. */
export const LINE_CLICHE: Record<'minor' | 'major', { line: number[]; syms: string[] }> = {
  minor: { line: [0, 11, 10, 9], syms: ['m', 'm(maj7)', 'm7', 'm6'] },
  major: { line: [7, 8, 9, 10], syms: ['', '+', '6', '7'] },
};

// ───────────────────────────── lines (keys and guitar)

/** Pitch classes as a line from `from` up (each the next one above the last). */
export function upFrom(pcs: number[], from: number): number[] {
  const out: number[] = [];
  let p = from - 1;
  for (const pc of pcs) {
    p++;
    while (mod12(p) !== mod12(pc)) p++;
    out.push(p);
  }
  return out;
}
/** Pentatonic in 4-note groups (1-2-3-4, 2-3-4-5 …) up `groups` groups from the note nearest `start`, then the top held. */
export function pentGroups(pcs: number[], start: number, groups: number): number[] {
  const asc: number[] = [];
  let p = start;
  while (!pcs.includes(mod12(p))) p++;
  for (let i = 0; i < groups + 4; i++) {
    asc.push(p);
    p++;
    while (!pcs.includes(mod12(p))) p++;
  }
  const out: number[] = [];
  for (let g = 0; g < groups; g++) out.push(...asc.slice(g, g + 4));
  out.push(asc[groups + 3]);
  return out;
}
/** A triad pair as a line in 8ths: A, B, A's next inversion, B's next inversion … up `n` triads from `start`. */
export function pairLineUp(a: number[], b: number[], start: number, n: number): number[] {
  const out: number[] = [];
  let floor = start;
  for (let i = 0; i < n; i++) {
    const tri = i % 2 === 0 ? a : b;
    const inv = Math.floor(i / 2) % 3;
    const ord = [...tri.slice(inv), ...tri.slice(0, inv)];
    const notes = upFrom(ord, floor);
    out.push(...notes);
    floor = notes[0] + 1;
  }
  return out;
}

// ───────────────────────────── TP-5 guitar: rootless, quartal, Coltrane ─────────────────────────────

/** Rootless 4-note voicings (A form 3-5-7-9 / B form 7-9-3-5) by quality, as intervals above the root, low → high. */
export const ROOTLESS: Record<'m7' | '7' | 'maj7', { a: number[]; b: number[] }> = {
  m7: { a: [3, 7, 10, 14], b: [10, 14, 15, 19] },
  '7': { a: [10, 14, 16, 21], b: [4, 9, 10, 14] },
  maj7: { a: [4, 7, 11, 14], b: [11, 14, 16, 19] },
};
/** So What: three perfect 4ths and a major 3rd (from the root of a minor 7th chord: R 11 ♭7 ♭3 5). */
export const SO_WHAT = [0, 5, 10, 15, 19];
/** Giant Steps, first 8 bars as written (chord symbols only): root pitch class in the original key, quality, beats. */
export const GIANT_STEPS: [number, '7' | 'maj7' | 'm7', number][] = [
  [11, 'maj7', 2], [2, '7', 2], [7, 'maj7', 2], [10, '7', 2], [3, 'maj7', 4], [9, 'm7', 2], [2, '7', 2],
  [7, 'maj7', 2], [10, '7', 2], [3, 'maj7', 2], [6, '7', 2], [11, 'maj7', 4], [5, 'm7', 2], [10, '7', 2],
];

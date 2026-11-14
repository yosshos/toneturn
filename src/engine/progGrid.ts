// Chord progressions by ear, as a graded ladder (owner 2026-11-14): the shared harmony model behind the grid dictation
// (the ear course: each bar answered as root + quality + bass/colour, partial credit per part, one fix-it pass that
// replays only the wrong bars) and the instrument playback levels (k-ear, g-ear, b-ear) and their harmony grader.
//
// Progressions are generated in scale degrees and realised in any of the 12 keys, spelled for the key (flats in flat
// keys; a degree keeps its letter: ♯IV°7 is F♯°7 in C, the tritone sub ♭II7 is D♭7). Enharmonics are the same note
// (answers are pitch classes), and there is one root chip per pitch class, so no enharmonic decoys. Pure.

import type { GridQuestion, NoteEvent, Stimulus } from './lesson';

// ---------------------------------------------------------------- the chord model

/** Chord quality (the second chip row). */
export type GQ = 'maj' | 'm' | 'dim' | 'aug' | 'maj7' | 'm7' | '7' | 'm7b5' | 'dim7' | '6' | 'm6';
/** The third chip row: nothing, a chord tone in the bass (inversion / slash bass), or a colour (extension / alteration). */
export type GX = 'none' | '/3' | '/5' | '/7' | '9' | '11' | '13' | 'b9' | '#9' | '#11' | 'b13' | 'alt';

/** Intervals above the root of each quality. */
export const GQ_IV: Record<GQ, number[]> = {
  maj: [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
};
/** The colour notes each extra adds (semitones above the root). */
export const GX_IV: Partial<Record<GX, number[]>> = { '9': [14], '11': [17], '13': [21], b9: [13], '#9': [15], '#11': [18], b13: [20], alt: [13, 15, 20] };
/** Letter steps of the chord tone a slash bass names (3rd = 2 letters up, 5th = 4, 7th = 6). */
const SLASH_TONE: Record<'/3' | '/5' | '/7', number> = { '/3': 1, '/5': 2, '/7': 3 };

/** A chord in scale degrees (relative to the major tonic): "♭7" → deg 'b7'. */
export interface DChord {
  deg: string;
  q: GQ;
  x: GX;
  /** Length in beats (4/4). */
  beats: number;
}
/** A chord in a key. */
export interface GChord extends DChord {
  /** Root pitch class. */
  root: number;
  /** The chord symbol, spelled for the key ("E♭maj7", "F♯°7", "C/E", "G7alt"). */
  sym: string;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const LETTERS_HE = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const mod12 = (n: number) => ((Math.round(n) % 12) + 12) % 12;
/** The tonic's letter and accidental for each major key (F♯ for pc 6, as the app's other key names). */
const TONIC_SPELL: [number, number][] = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];

/** Semitones above the tonic of a degree string ('1' … '7' with b / # / bb). */
export function degSemis(deg: string): number {
  const m = /^(bb|b|#)?([1-7])$/.exec(deg);
  if (!m) throw new Error(`bad degree ${deg}`);
  const acc = m[1] === 'bb' ? -2 : m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  return MAJOR[Number(m[2]) - 1] + acc;
}

const ACC_EN: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
const ACC_HE: Record<number, string> = { [-2]: ' דאבל במול', [-1]: ' במול', 0: '', 1: ' דיאז', 2: ' דאבל דיאז' };
/** A note name from a letter index and a target pitch class. */
function nameOf(letter: number, pc: number, he = false): string {
  const l = ((letter % 7) + 7) % 7;
  let acc = mod12(pc - LETTER_PC[l]);
  if (acc > 6) acc -= 12;
  return he ? `${LETTERS_HE[l]}${ACC_HE[acc] ?? ''}` : `${LETTERS[l]}${ACC_EN[acc] ?? ''}`;
}
/** The major key's name ("E♭", Hebrew "מי במול"). */
export function keyName(tonic: number, he = false): string {
  const [l] = TONIC_SPELL[mod12(tonic)];
  return nameOf(l, mod12(tonic), he);
}
/** A degree spelled in a key: letter = the tonic's letter + (n − 1), accidental from the pitch. */
export function spellDeg(tonic: number, deg: string, he = false): string {
  const n = Number(/([1-7])$/.exec(deg)![1]);
  const [tl] = TONIC_SPELL[mod12(tonic)];
  return nameOf(tl + n - 1, mod12(tonic + degSemis(deg)), he);
}
/** The letter index of a degree in a key. */
function degLetter(tonic: number, deg: string): number {
  const n = Number(/([1-7])$/.exec(deg)![1]);
  return TONIC_SPELL[mod12(tonic)][0] + n - 1;
}

/** Default degree for each pitch class above the tonic (root chips): ♭2 ♭3 ♯4 ♭6 ♭7 — the common chromatic roots. */
const CHIP_DEG = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
/** The other spelling of each chromatic degree (♯1 for ♭2 …), when it is plainer in the key. */
const CHIP_ALT: (string | null)[] = [null, '#1', null, '#2', null, null, 'b5', null, '#5', null, '#6', null];

const Q_SUFFIX: Record<GQ, string> = { maj: '', m: 'm', dim: '°', aug: '+', maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7♭5', dim7: '°7', '6': '6', m6: 'm6' };
const ACC_TXT = (s: string) => s.replace('b', '♭').replace('#', '♯');
/** The suffix of a quality with its colour ("maj9", "7♭9", "13", "m11", "7alt"). */
export function suffixOf(q: GQ, x: GX): string {
  if (x === 'none' || x.startsWith('/')) return Q_SUFFIX[q];
  if (q === '7') return x === '9' || x === '13' || x === '11' ? x : x === 'alt' ? '7alt' : `7${ACC_TXT(x)}`;
  if (q === 'maj7') return x === '9' ? 'maj9' : x === '13' ? 'maj13' : `maj7${ACC_TXT(x)}`;
  if (q === 'm7') return x === '9' ? 'm9' : x === '11' ? 'm11' : `m7${ACC_TXT(x)}`;
  if (q === 'm7b5') return x === '11' ? 'm11♭5' : x === '9' ? 'm9♭5' : `m7♭5(${ACC_TXT(x)})`;
  if (q === '6' && x === '9') return '6/9';
  return `${Q_SUFFIX[q]}(${ACC_TXT(x)})`;
}

/** The bass pitch class of a chord (its root unless a slash names a chord tone). */
export function bassPcOf(c: Pick<GChord, 'root' | 'q' | 'x'>): number {
  if (c.x === '/3' || c.x === '/5' || c.x === '/7') return mod12(c.root + (GQ_IV[c.q][SLASH_TONE[c.x]] ?? 0));
  return mod12(c.root);
}
/** Every pitch class of a chord (tones + colours). */
export function chordPcs(c: Pick<GChord, 'root' | 'q' | 'x'>): number[] {
  const ivs = [...GQ_IV[c.q], ...(GX_IV[c.x] ?? [])];
  // An altered dominant has no natural 5th.
  const out = (c.x === 'alt' ? ivs.filter((i) => i !== 7) : ivs).map((i) => mod12(c.root + i));
  return [...new Set(out)];
}
/** The colour of a chord: what tells its quality and extension (3rd, 7th / 6th, colours), never the root or the plain 5th. */
export function colourPcs(c: Pick<GChord, 'root' | 'q' | 'x'>): number[] {
  const five = GQ_IV[c.q][2];
  return chordPcs(c).filter((p) => p !== mod12(c.root) && !(five === 7 && p === mod12(c.root + 7)));
}

/** The chord in a key, with its symbol. */
const DOUBLE = /[𝄫𝄪]/;
/** A root's name in a key, never with a double accidental (♭VI7 in D♭ is A7, not B𝄫7): the other letter then. */
export function rootName(tonic: number, deg: string): string {
  const name = spellDeg(tonic, deg);
  if (!DOUBLE.test(name)) return name;
  const m = /^(b|#)([1-7])$/.exec(deg);
  if (!m) return name;
  const n = Number(m[2]);
  const alt = m[1] === 'b' ? (n > 1 ? `#${n - 1}` : null) : n < 7 ? `b${n + 1}` : null;
  const other = alt ? spellDeg(tonic, alt) : name;
  return DOUBLE.test(other) ? name : other;
}
/** A note named from a letter, or the neighbouring letter when that avoids a double accidental. */
function plainNameOf(letter: number, pc: number): string {
  const a = nameOf(letter, pc);
  if (!DOUBLE.test(a)) return a;
  const b = nameOf(letter + (a.includes('𝄫') ? -1 : 1), pc);
  return DOUBLE.test(b) ? a : b;
}

export function realize(tonic: number, d: DChord): GChord {
  const root = mod12(tonic + degSemis(d.deg));
  const name = rootName(tonic, d.deg);
  let sym = `${name}${suffixOf(d.q, d.x)}`;
  if (d.x === '/3' || d.x === '/5' || d.x === '/7') {
    const k = SLASH_TONE[d.x];
    sym += `/${plainNameOf(degLetter(tonic, d.deg) + 2 * k, bassPcOf({ root, q: d.q, x: d.x }))}`;
  }
  return { ...d, root, sym };
}

/** The 12 root chips for a key: each pitch class spelled as the key writes it (the progression's own spellings first). */
export function rootChips(tonic: number, chords: DChord[]): string[] {
  // Indexed by absolute pitch class (C = 0), whatever the key.
  // A pitch class the progression does not use takes its plainer spelling (B, not C♭, in A♭; no double flats).
  const out: string[] = Array.from({ length: 12 }, () => '');
  const accs = (x: string) => (x.match(/[♭♯𝄫𝄪]/g) ?? []).length + (/[𝄫𝄪]/.test(x) ? 1 : 0);
  CHIP_DEG.forEach((d, semis) => {
    const alt = CHIP_ALT[semis];
    const a = spellDeg(tonic, d);
    const b = alt ? spellDeg(tonic, alt) : a;
    out[mod12(tonic + semis)] = accs(b) < accs(a) ? b : a;
  });
  for (const c of chords) out[mod12(tonic + degSemis(c.deg))] = rootName(tonic, c.deg);
  return out;
}

/** Chip labels (quality and extra rows): always read left to right. */
export const GQ_LABEL: Record<GQ, string> = { maj: 'M', m: 'm', dim: '°', aug: '+', maj7: 'maj7', m7: 'm7', '7': '7', m7b5: 'm7♭5', dim7: '°7', '6': '6', m6: 'm6' };
export const GX_LABEL: Record<GX, string> = { none: '—', '/3': '/3', '/5': '/5', '/7': '/7', '9': '9', '11': '11', '13': '13', b9: '♭9', '#9': '♯9', '#11': '♯11', b13: '♭13', alt: 'alt' };

// ---------------------------------------------------------------- the ladder

export type GridVoicing = 'close' | 'shell' | 'rootless';
export interface GridLevel {
  rating: number;
  en: string;
  he: string;
  qualities: GQ[];
  /** The third chip row; empty = no row (that part is not asked). */
  extras: GX[];
  voicing: GridVoicing;
  bpm: number;
}
/** The ear-course grid ladder (rating ~700–1900). */
export const GRID_LEVELS: GridLevel[] = [
  { rating: 1100, en: 'Four diatonic triads', he: 'ארבעה משולשים דיאטוניים', qualities: ['maj', 'm', 'dim'], extras: [], voicing: 'close', bpm: 92 },
  { rating: 1250, en: 'Four chords with 7ths', he: 'ארבעה אקורדים עם ספטימות', qualities: ['maj7', 'm7', '7', 'm7b5'], extras: [], voicing: 'close', bpm: 92 },
  { rating: 1350, en: 'Eight bars with secondary dominants', he: 'שמונה תיבות עם דומיננטות משניות', qualities: ['maj7', 'm7', '7', 'm7b5'], extras: [], voicing: 'close', bpm: 108 },
  { rating: 1450, en: 'Eight bars with inversions and slash bass', he: 'שמונה תיבות עם היפוכים ובס סלאש', qualities: ['maj', 'm', 'maj7', 'm7', '7'], extras: ['none', '/3', '/5', '/7'], voicing: 'close', bpm: 100 },
  { rating: 1550, en: 'Tritone subs, backdoor, minor ii–V', he: 'תחליף טריטון, דלת אחורית, ii–V מינורי', qualities: ['maj7', 'm7', '7', 'm7b5'], extras: ['none', 'b9'], voicing: 'shell', bpm: 108 },
  { rating: 1650, en: 'Colours on every chord: 9, 11, 13, altered', he: 'צבע על כל אקורד: 9, 11, 13, אלטרד', qualities: ['maj7', 'm7', '7', 'm7b5'], extras: ['9', '11', '13', 'b9', '#9', '#11', 'b13', 'alt'], voicing: 'rootless', bpm: 96 },
  { rating: 1750, en: 'A 12-bar jazz blues', he: 'בלוז ג׳אז של 12 תיבות', qualities: ['maj7', 'm7', '7', 'm7b5', 'dim7'], extras: ['none', '9', '13', 'b9'], voicing: 'rootless', bpm: 132 },
  { rating: 1850, en: 'A 32-bar AABA form', he: 'צורת AABA של 32 תיבות', qualities: ['maj7', 'm7', '7', 'm7b5'], extras: ['none', '9', '13', 'b9'], voicing: 'rootless', bpm: 150 },
];

/** A generated progression: the chords to answer, the order they are played in (AABA repeats A), named sections. */
export interface GridProg {
  chords: DChord[];
  order: number[];
  sections?: { label: string; from: number; to: number }[];
}

type Rnd = () => number;
const pickOf = <T,>(rnd: Rnd, xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const C = (deg: string, q: GQ, beats = 4, x: GX = 'none'): DChord => ({ deg, q, x, beats });
const DIA3: Record<string, GQ> = { '1': 'maj', '2': 'm', '3': 'm', '4': 'maj', '5': 'maj', '6': 'm', '7': 'dim' };
const DIA7: Record<string, GQ> = { '1': 'maj7', '2': 'm7', '3': 'm7', '4': 'maj7', '5': '7', '6': 'm7', '7': 'm7b5' };
/** Functional motion between diatonic degrees (what usually follows what). */
const NEXT: Record<string, string[]> = { '1': ['4', '6', '2', '3', '5'], '2': ['5', '5', '7'], '3': ['6', '4'], '4': ['5', '2', '1', '7'], '5': ['1', '6', '1'], '6': ['2', '4', '2'], '7': ['3', '1'] };

/** A diatonic chain of n degrees from I, by functional motion. */
function chain(rnd: Rnd, n: number, endOnHome = false): string[] {
  const out = ['1'];
  while (out.length < n) {
    const prev = out[out.length - 1];
    let nx = pickOf(rnd, NEXT[prev]);
    if (out.length === n - 1 && endOnHome) nx = NEXT[prev].includes('1') ? '1' : NEXT[prev].includes('5') ? '5' : nx;
    out.push(nx);
  }
  return out;
}

/** The secondary dominant of a degree (V7/ii = VI7 …). */
const SEC_OF: Record<string, string> = { '2': '6', '3': '7', '4': '1', '5': '2', '6': '3' };

/** Bass smoothing (1450): each chord in the inversion whose bass is nearest the bass before it. */
function smoothBass(rnd: Rnd, cs: DChord[], need = 2): DChord[] {
  const out = cs.map((c) => ({ ...c }));
  let prevBass = degSemis(out[0].deg);
  let made = 0;
  for (let i = 1; i < out.length; i++) {
    const c = out[i];
    const root = degSemis(c.deg);
    const opts: GX[] = ['none', '/3', '/5', ...(GQ_IV[c.q].length > 3 ? (['/7'] as GX[]) : [])];
    const dist = (x: GX) => {
      const b = bassPcOf({ root, q: c.q, x });
      const d = Math.abs(mod12(b - prevBass));
      return Math.min(d, 12 - d);
    };
    const best = opts.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    const last = i === out.length - 1;
    if (!last && best !== 'none' && dist(best) <= 2 && dist(best) < dist('none') && rnd() < 0.8) {
      c.x = best;
      made++;
    }
    prevBass = bassPcOf({ root, q: c.q, x: c.x });
  }
  // Too few inversions: the first-inversion of a middle chord (a common stepwise bass).
  for (let i = 1; i < out.length - 1 && made < need; i++) {
    if (out[i].x !== 'none') continue;
    out[i].x = rnd() < 0.7 ? '/3' : '/5';
    made++;
  }
  return out;
}

/** Cadence units (1550): ii–V–I and its substitutes. */
const UNITS3: { kind: string; cs: DChord[] }[] = [
  { kind: 'plain', cs: [C('2', 'm7'), C('5', '7'), C('1', 'maj7')] },
  { kind: 'tritone', cs: [C('2', 'm7'), C('b2', '7'), C('1', 'maj7')] },
  { kind: 'backdoor', cs: [C('4', 'm7'), C('b7', '7'), C('1', 'maj7')] },
  { kind: 'minor-vi', cs: [C('7', 'm7b5'), C('3', '7', 4, 'b9'), C('6', 'm7')] },
  { kind: 'minor-ii', cs: [C('3', 'm7b5'), C('6', '7', 4, 'b9'), C('2', 'm7')] },
  { kind: 'chromatic', cs: [C('3', 'm7'), C('b3', '7'), C('2', 'm7')] },
];
const UNITS2: { kind: string; cs: DChord[] }[] = [
  { kind: 'tritone', cs: [C('b2', '7'), C('1', 'maj7')] },
  { kind: 'backdoor', cs: [C('b7', '7'), C('1', 'maj7')] },
  { kind: 'plain', cs: [C('5', '7'), C('1', 'maj7')] },
  { kind: 'minor', cs: [C('3', '7', 4, 'b9'), C('6', 'm7')] },
];

/** Eight bars of cadences with substitutes (1550; also the colours level's base). */
function subsProg(rnd: Rnd): DChord[] {
  const shapes = [[3, 2, 2], [2, 3, 2], [2, 2, 3]];
  for (let guard = 0; guard < 40; guard++) {
    const shape = pickOf(rnd, shapes);
    const units = shape.map((n) => pickOf(rnd, n === 3 ? UNITS3 : UNITS2));
    const special = new Set(units.filter((u) => u.kind !== 'plain').map((u) => u.kind));
    if (special.size < 2) continue;
    const cs = [C('1', 'maj7'), ...units.flatMap((u) => u.cs.map((c) => ({ ...c })))];
    if (cs.some((c, i) => i > 0 && c.deg === cs[i - 1].deg && c.q === cs[i - 1].q)) continue;
    return cs;
  }
  return [C('1', 'maj7'), ...UNITS3[1].cs, ...UNITS2[1].cs, ...UNITS3[3].cs.slice(0, 2)];
}

/** A colour for every chord (1650): what a jazz player would put there, from what the chord resolves to. */
function colourAll(rnd: Rnd, cs: DChord[]): DChord[] {
  return cs.map((c, i) => {
    const next = cs[i + 1];
    let opts: GX[];
    if (c.q === 'maj7') opts = ['9', '#11', '13'];
    else if (c.q === 'm7') opts = ['9', '11'];
    else if (c.q === 'm7b5') opts = ['11'];
    else if (c.q === '7') {
      const toMinor = next && (next.q === 'm7' || next.q === 'm');
      opts = c.deg === 'b2' || c.deg === 'b3' || c.deg === 'b6' ? ['#11', '9', '13'] : c.deg === 'b7' ? ['13', '9', '#11'] : toMinor ? ['b9', 'b13', 'alt', '#9'] : ['9', '13', 'b9', 'alt', '#9'];
    } else opts = ['none'];
    return { ...c, x: pickOf(rnd, opts) };
  });
}

/** Jazz blues forms (1750): bars as chords with their beats. */
function bluesProg(rnd: Rnd, variant = Math.floor(rnd() * 3)): DChord[] {
  const col = (): GX => pickOf(rnd, ['none', '9', '13'] as GX[]);
  if (variant === 0)
    return [C('1', '7', 4, col()), C('4', '7', 4, col()), C('1', '7', 4, col()), C('5', 'm7', 2), C('1', '7', 2, col()), C('4', '7', 4, col()), C('#4', 'dim7'), C('1', '7', 4, col()), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7', 4, col()), C('1', '7', 2, col()), C('6', '7', 2, 'b9'), C('2', 'm7', 2), C('5', '7', 2, col())];
  if (variant === 1)
    return [C('1', '7', 4, col()), C('4', '7', 4, col()), C('1', '7', 8, col()), C('4', '7', 8, col()), C('1', '7', 4, col()), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7', 4, col()), C('1', '7', 4, col()), C('5', '7', 4, col())];
  // The Bird blues (descending ii–Vs).
  return [C('1', 'maj7'), C('7', 'm7b5', 2), C('3', '7', 2, 'b9'), C('6', 'm7', 2), C('2', '7', 2, col()), C('5', 'm7', 2), C('1', '7', 2, col()), C('4', '7', 4, col()), C('4', 'm7', 2), C('b7', '7', 2, col()), C('3', 'm7', 2), C('6', '7', 2, 'b9'), C('b3', 'm7', 2), C('b6', '7', 2, col()), C('2', 'm7'), C('5', '7', 4, col()), C('1', 'maj7', 2), C('6', '7', 2, 'b9'), C('2', 'm7', 2), C('5', '7', 2, col())];
}

/** AABA (1850): an A of 8 bars and a bridge of 8; the form plays A A B A. */
function aabaProg(rnd: Rnd): GridProg {
  const col = (): GX => pickOf(rnd, ['none', '9', '13'] as GX[]);
  const As: DChord[][] = [
    [C('1', 'maj7', 4, col()), C('6', 'm7'), C('2', 'm7'), C('5', '7', 4, col()), C('3', 'm7'), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7', 4, col())],
    [C('1', 'maj7', 4, col()), C('1', '7', 4, col()), C('4', 'maj7'), C('4', 'm7', 2), C('b7', '7', 2, col()), C('3', 'm7'), C('6', '7', 4, 'b9'), C('2', 'm7'), C('5', '7', 4, col())],
    [C('1', 'maj7', 2), C('6', '7', 2, 'b9'), C('2', 'm7', 2), C('5', '7', 2, col()), C('3', 'm7', 2), C('6', '7', 2, 'b9'), C('2', 'm7', 2), C('5', '7', 2, col()), C('1', '7', 4, col()), C('4', 'maj7'), C('3', 'm7', 2), C('6', '7', 2, 'b9'), C('2', 'm7', 2), C('5', '7', 2, col())],
  ];
  const Bs: DChord[][] = [
    [C('3', '7', 8, col()), C('6', '7', 8, col()), C('2', '7', 8, col()), C('5', '7', 8, col())],
    [C('5', 'm7'), C('1', '7', 4, col()), C('4', 'maj7', 8), C('4', 'm7'), C('b7', '7', 4, col()), C('1', 'maj7'), C('2', 'm7', 2), C('5', '7', 2, col())],
    [C('7', 'm7b5'), C('3', '7', 4, 'b9'), C('6', 'm7', 8), C('5', 'm7'), C('1', '7', 4, col()), C('4', 'maj7'), C('b7', '7', 4, col())],
  ];
  const A = pickOf(rnd, As).map((c) => ({ ...c }));
  const B = pickOf(rnd, Bs).map((c) => ({ ...c }));
  const a = A.map((_, i) => i);
  const b = B.map((_, i) => A.length + i);
  return { chords: [...A, ...B], order: [...a, ...a, ...b, ...a], sections: [{ label: 'A', from: 0, to: A.length }, { label: 'B', from: A.length, to: A.length + B.length }] };
}

/** The progression of grid level `level` (1-based). */
export function gridProgression(level: number, rnd: Rnd): GridProg {
  const plain = (chords: DChord[]): GridProg => ({ chords, order: chords.map((_, i) => i) });
  switch (level) {
    case 1: {
      let degs: string[];
      do degs = chain(rnd, 4).map((d) => (d === '7' ? '5' : d));
      while (new Set(degs).size < 3 || degs.some((d, i) => i > 0 && d === degs[i - 1]));
      return plain(degs.map((d) => C(d, DIA3[d])));
    }
    case 2: {
      let degs: string[];
      do degs = chain(rnd, 4);
      while (new Set(degs).size < 3);
      return plain(degs.map((d) => C(d, DIA7[d])));
    }
    case 3: {
      for (let guard = 0; guard < 60; guard++) {
        const degs = chain(rnd, 8);
        const cs = degs.map((d) => C(d, DIA7[d]));
        let made = 0;
        for (let i = 2; i < cs.length; i++) {
          const sec = SEC_OF[cs[i].deg];
          if (!sec || cs[i - 1].q === '7' || (cs[i - 2] && cs[i - 2].q === '7' && cs[i - 2].deg === sec) || rnd() < 0.35) continue;
          if (cs[i - 1].deg === sec && cs[i - 1].q === '7') continue;
          cs[i - 1] = C(sec, '7');
          made++;
        }
        if (made >= 2 && made <= 4 && !cs.some((c, i) => i > 0 && c.deg === cs[i - 1].deg && c.q === cs[i - 1].q)) return plain(cs);
      }
      return plain([C('1', 'maj7'), C('6', '7'), C('2', 'm7'), C('5', '7'), C('3', 'm7'), C('3', '7'), C('6', 'm7'), C('2', '7')]);
    }
    case 4: {
      const degs = chain(rnd, 8).map((d) => (d === '7' ? '5' : d));
      const cs = degs.map((d) => C(d, d === '5' && rnd() < 0.5 ? '7' : d === '2' && rnd() < 0.4 ? 'm7' : DIA3[d]));
      for (let i = 1; i < cs.length; i++) if (cs[i].deg === cs[i - 1].deg && cs[i].q === cs[i - 1].q) cs[i] = { ...cs[i], q: GQ_IV[cs[i].q].length > 3 ? DIA3[cs[i].deg] : DIA7[cs[i].deg] };
      return plain(smoothBass(rnd, cs));
    }
    case 5:
      return plain(subsProg(rnd));
    case 6:
      return plain(colourAll(rnd, subsProg(rnd)));
    case 7:
      return plain(bluesProg(rnd));
    default:
      return aabaProg(rnd);
  }
}

// ---------------------------------------------------------------- voicings and playback

/** The voicing's pitch classes (upper structure; the bass plays the root or slash bass separately). */
export function voicingPcs(c: Pick<GChord, 'root' | 'q' | 'x'>, style: GridVoicing): number[] {
  const iv = GQ_IV[c.q];
  const r = mod12(c.root);
  const at = (i: number) => mod12(r + i);
  const colours = (GX_IV[c.x] ?? []).map(at);
  if (style === 'close' || iv.length === 3) return [...new Set([...iv.map(at), ...colours])];
  const third = at(iv[1]);
  const seventh = at(iv[3]);
  // An altered 5th (♭5 of m7♭5 / °7, ♯5) is part of the colour: a shell keeps it, or Dm7 and Dm7♭5 would sound the same.
  const odd5 = iv[2] !== 7 ? [at(iv[2])] : [];
  if (style === 'shell') return [...new Set([third, seventh, ...odd5, ...colours])];
  // Rootless (A / B forms by voice leading): 3rd and 7th, the colour(s), else the 9th (or 5th / ♭5 where a 9th clashes).
  const fill = c.q === 'm7b5' ? [at(6)] : c.q === 'dim7' ? [at(6), at(0)] : [at(c.q === '7' || c.q === 'm7' || c.q === 'maj7' ? 14 : 7), at(iv[2])];
  const out = [...new Set([third, seventh, ...colours])];
  for (const f of fill) if (out.length < 4 && !out.includes(f)) out.push(f);
  return out;
}

/** Voice pitch classes in close position inside [lo, hi], nearest the previous voicing (smooth voice leading). */
export function voiceLead(pcs: number[], prev: number[] | null, lo = 52, hi = 74): number[] {
  const u = [...new Set(pcs.map(mod12))].sort((a, b) => a - b);
  let best: number[] = [];
  let cost = Infinity;
  const aim = prev && prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : (lo + hi) / 2 - 2;
  for (let r = 0; r < u.length; r++) {
    const ord = [...u.slice(r), ...u.slice(0, r)];
    for (let base = lo - 12; base <= hi; base++) {
      if (mod12(base) !== ord[0]) continue;
      const v: number[] = [base];
      for (let k = 1; k < ord.length; k++) {
        let m = v[k - 1] + 1;
        while (mod12(m) !== ord[k]) m++;
        v.push(m);
      }
      if (v[0] < lo || v[v.length - 1] > hi) continue;
      const c = prev && prev.length === v.length ? v.reduce((a, m, k) => a + Math.abs(m - prev[k]), 0) : Math.abs(v.reduce((a, b) => a + b, 0) / v.length - aim) * v.length;
      if (c < cost) {
        cost = c;
        best = v;
      }
    }
  }
  return best.length ? best : u.map((p) => 60 + p);
}

/** A pitch class in the bass register (A1 … G♯2). */
export const bassMidi = (pc: number) => 33 + mod12(pc - 33);

/** The voicings of a list of chords (upper voices led smoothly, the bass on the root / slash bass). */
export function voiceChords(cs: Pick<GChord, 'root' | 'q' | 'x'>[], style: GridVoicing): { bass: number; upper: number[] }[] {
  let prev: number[] | null = null;
  return cs.map((c) => {
    const upper: number[] = voiceLead(voicingPcs(c, style), prev, style === 'close' ? 55 : 52, style === 'close' ? 74 : 72);
    prev = upper;
    return { bass: bassMidi(bassPcOf(c)), upper };
  });
}

/** Note events of chords played in order (bass on beat 1, a 2-feel 5th on beat 3 of long chords at the jazz levels). */
export function progEvents(cs: GChord[], style: GridVoicing, bpm: number): { events: NoteEvent[]; length: number } {
  const spb = 60 / bpm;
  const vs = voiceChords(cs, style);
  const events: NoteEvent[] = [];
  let t = 0;
  cs.forEach((c, i) => {
    const len = c.beats * spb;
    const v = vs[i];
    v.upper.forEach((m) => events.push({ midi: m, start: t, duration: len * 0.92, velocity: 0.4 }));
    events.push({ midi: v.bass, start: t, duration: Math.min(c.beats, 2) * spb * 0.95, velocity: 0.62, inst: 'bass' });
    if (style !== 'close' && c.beats >= 4 && c.x !== '/3' && c.x !== '/5' && c.x !== '/7') {
      const five = bassMidi(mod12(c.root + GQ_IV[c.q][2]));
      events.push({ midi: five, start: t + 2 * spb, duration: 1.9 * spb, velocity: 0.55, inst: 'bass' });
    }
    t += len;
  });
  return { events, length: t + 0.6 };
}

// ---------------------------------------------------------------- the grid question

/** One answered (or expected) slot. */
export interface GridCell {
  root: number;
  q: GQ;
  x: GX;
}
/** The grid answer string: one "root.quality.extra" per slot, '|' between ("2.m7.none|7.7.b9|0.maj7.none"). */
export const cellKey = (c: GridCell | null): string => (c ? `${mod12(c.root)}.${c.q}.${c.x}` : '');
export const gridKey = (cs: (GridCell | null)[]): string => cs.map(cellKey).join('|');
export function parseGrid(a: string, n: number): (GridCell | null)[] {
  const parts = String(a ?? '').split('|');
  return Array.from({ length: n }, (_, i) => {
    const m = /^(\d+)\.([a-z0-9]+)\.([a-z0-9/#]+)$/.exec(parts[i] ?? '');
    if (!m || !(m[2] in GQ_IV)) return null;
    return { root: Number(m[1]) % 12, q: m[2] as GQ, x: m[3] as GX };
  });
}

/** The parts of a slot and their weight: root 0.5, quality 0.3, bass / colour 0.2. */
export const GRID_W = { root: 0.5, quality: 0.3, extra: 0.2 };
export interface GridMark {
  root: boolean;
  quality: boolean;
  /** Bass / colour part right (true when the level does not ask it). */
  extra: boolean;
  /** The slot is fully right. */
  ok: boolean;
  /** The slot's credit 0..1. */
  score: number;
}
export interface GridGrade {
  score: number;
  marks: GridMark[];
  roots: { ok: number; of: number };
  qualities: { ok: number; of: number };
  /** Bass / colour parts (absent when the level does not ask them). */
  extras: { ok: number; of: number } | null;
}

/** Grade a grid answer against the expected slots. `asked` = the level asks the third part. */
export function gradeGridCells(want: GridCell[], got: (GridCell | null)[], asked: boolean): GridGrade {
  const total = GRID_W.root + GRID_W.quality + (asked ? GRID_W.extra : 0);
  const marks = want.map((w, i): GridMark => {
    const g = got[i];
    const root = !!g && mod12(g.root) === mod12(w.root);
    const quality = !!g && g.q === w.q;
    const extra = asked ? !!g && g.x === w.x : true;
    const pts = (root ? GRID_W.root : 0) + (quality ? GRID_W.quality : 0) + (asked && extra ? GRID_W.extra : 0);
    const score = pts / total;
    return { root, quality, extra, ok: root && quality && extra, score };
  });
  const count = (f: (m: GridMark) => boolean) => ({ ok: marks.filter(f).length, of: marks.length });
  return {
    score: marks.length ? marks.reduce((a, m) => a + m.score, 0) / marks.length : 0,
    marks,
    roots: count((m) => m.root),
    qualities: count((m) => m.quality),
    extras: asked ? count((m) => m.extra) : null,
  };
}

/**
 * The fix-it pass: one more try on the wrong bars only. The item's credit is the first try plus half of what the fix
 * recovers (a fix never lowers it): 0.6 first → 1.0 fixed = 0.8.
 */
export function gridCredit(first: number, fixed: number | null): number {
  if (fixed === null || fixed <= first) return first;
  return first + 0.5 * (fixed - first);
}
/** The fix-it answer: right slots of the first try are kept, the wrong ones take the fixes. */
export function mergeFix(first: (GridCell | null)[], fixes: (GridCell | null)[], marks: GridMark[]): (GridCell | null)[] {
  return first.map((c, i) => (marks[i]?.ok ? c : (fixes[i] ?? c)));
}

/** Grade a grid question's answer. */
export function gradeGrid(q: Pick<GridQuestion, 'slots' | 'extras'>, answer: string): GridGrade {
  return gradeGridCells(q.slots, parseGrid(answer, q.slots.length), q.extras.length > 0);
}

/** The slots of an answer that are not fully right (the fix-it pass asks only these). */
export function gridWrong(q: Pick<GridQuestion, 'slots' | 'extras'>, answer: string): number[] {
  return gradeGrid(q, answer).marks.flatMap((m, i) => (m.ok ? [] : [i]));
}

/** The sound of some slots of a grid question, each bar on its own (its chord as voiced in the progression). */
export function gridSlotsStimulus(q: Pick<GridQuestion, 'slots' | 'voicing' | 'bpm'>, idx: number[], tempo = 1): Stimulus[] {
  const out: Stimulus[] = [];
  idx.forEach((i, k) => {
    const c = q.slots[i];
    if (!c) return;
    const r = progEvents([c], q.voicing, q.bpm * tempo);
    if (k > 0) out.push({ kind: 'rest', duration: 0.5 });
    out.push({ kind: 'events', events: r.events, length: r.length - 0.4 });
  });
  return out;
}
/** The whole progression in its form order (AABA plays A A B A), at a tempo factor. */
export function gridStimulus(q: Pick<GridQuestion, 'slots' | 'order' | 'voicing' | 'bpm'>, tempo = 1): Stimulus[] {
  const r = progEvents(q.order.map((i) => q.slots[i]), q.voicing, q.bpm * tempo);
  return [{ kind: 'events', events: r.events, length: r.length }];
}
/** The fix-it pass's sound: only the wrong bars. */
export function gridFixStimulus(q: Pick<GridQuestion, 'slots' | 'extras' | 'voicing' | 'bpm'>, answer: string): Stimulus[] {
  return gridSlotsStimulus(q, gridWrong(q, answer));
}

/** One line of feedback: "Roots 7/8 · quality 5/8 · bass 8/8" (the parts the level asks). */
export function gridLine(q: Pick<GridQuestion, 'slots' | 'extras'>, answer: string, lang: 'en' | 'he'): string {
  const g = gradeGrid(q, answer);
  const he = lang === 'he';
  const part = (ok: number, of: number) => (ok === of ? '✓' : `${ok}/${of}`);
  const third = q.extras.some((x) => x.startsWith('/')) ? (he ? 'בס' : 'bass') : he ? 'צבע' : 'colour';
  const xs = [`${he ? 'יסודות' : 'Roots'} ${part(g.roots.ok, g.roots.of)}`, `${he ? 'סוג' : 'quality'} ${part(g.qualities.ok, g.qualities.of)}`];
  if (g.extras) xs.push(`${third} ${part(g.extras.ok, g.extras.of)}`);
  return xs.join(' · ');
}

const Q_WORD: Record<GQ, { en: string; he: string }> = {
  maj: { en: 'major', he: 'מז׳ור' },
  m: { en: 'minor', he: 'מינור' },
  dim: { en: 'diminished', he: 'מוקטן' },
  aug: { en: 'augmented', he: 'מוגדל' },
  maj7: { en: 'major 7', he: 'מז׳ור 7' },
  m7: { en: 'minor 7', he: 'מינור 7' },
  '7': { en: 'dominant 7', he: 'דומיננט 7' },
  m7b5: { en: 'half-diminished', he: 'חצי מוקטן' },
  dim7: { en: 'diminished 7', he: 'מוקטן 7' },
  '6': { en: 'major 6', he: 'מז׳ור 6' },
  m6: { en: 'minor 6', he: 'מינור 6' },
};
/** A cell as a symbol with the key's root spelling ("A7", "C /3"). */
export function cellSym(c: GridCell | null, spell: string[]): string {
  if (!c) return '—';
  const slash = c.x.startsWith('/');
  return `${spell[mod12(c.root)]}${suffixOf(c.q, slash ? 'none' : c.x)}${slash ? ` ${c.x}` : ''}`;
}
/** "Why?" (wrong answers only): the first wrong bar — what it was, and the part that was missed. */
export function gridWhy(q: Pick<GridQuestion, 'slots' | 'extras' | 'spell'>, answer: string, lang: 'en' | 'he'): string | null {
  const got = parseGrid(answer, q.slots.length);
  const g = gradeGridCells(q.slots, got, q.extras.length > 0);
  const i = g.marks.findIndex((m) => !m.ok);
  if (i < 0) return null;
  const w = q.slots[i];
  const m = g.marks[i];
  const he = lang === 'he';
  const gotSym = cellSym(got[i], q.spell);
  const part = !m.root
    ? he
      ? 'שמעו את הבס: לאן היסוד זז'
      : 'follow the bass: where the root moves'
    : !m.quality
      ? he
        ? `האיכות היא ${Q_WORD[w.q].he}`
        : `the quality is ${Q_WORD[w.q].en}`
      : w.x.startsWith('/') || w.x === 'none'
        ? he
          ? 'הקשיבו לצליל הנמוך ביותר'
          : 'listen to the lowest note'
        : he
          ? `צליל הצבע: ${GX_LABEL[w.x]}`
          : `the colour note: ${GX_LABEL[w.x]}`;
  // Chord symbols read left to right inside Hebrew text (isolates).
  return he ? `תיבה ${i + 1}: ⁦${w.sym}⁩, לא ⁦${gotSym}⁩ — ${part}.` : `Bar ${i + 1}: ${w.sym}, not ${gotSym} — ${part}.`;
}

/** A grid item of level `level` (1–8): the key is any of the 12, the progression from the ladder. */
export function gridItem(seed: number, level: number, id: string, rnd: Rnd, topic = 'grid-dictation'): GridQuestion {
  const L = GRID_LEVELS[Math.max(0, Math.min(GRID_LEVELS.length - 1, level - 1))];
  const tonic = Math.floor(rnd() * 12);
  const p = gridProgression(level, rnd);
  const slots = p.chords.map((d) => realize(tonic, d));
  const q: GridQuestion = {
    kind: 'grid',
    id,
    topic,
    level,
    seed,
    skill: 'cadences',
    ask: { en: `Key of ${keyName(tonic)}: write each chord.`, he: `סולם ${keyName(tonic, true)}: כתבו כל אקורד.` },
    tonic,
    slots,
    order: p.order,
    ...(p.sections ? { sections: p.sections } : {}),
    qualities: L.qualities,
    extras: L.extras,
    spell: rootChips(tonic, p.chords),
    bpm: L.bpm,
    voicing: L.voicing,
    stimulus: [],
    answer: gridKey(slots),
    choices: [],
    difficulty: L.rating,
  };
  q.stimulus = gridStimulus(q);
  return q;
}

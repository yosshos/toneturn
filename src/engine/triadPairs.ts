// Triad pairs, deep (owner-approved 2026-11-16): the pair map, spelling in every key, the melodic patterns, voicings.
// General jazz pedagogy — two triads with no common tone give a six-note (hexatonic) sound that leaves one tone (or two)
// of the scale out; the standard written references are W. Weiskopf "Intervallic Improvisation", G. Campbell "Triad
// Pairs for Jazz" and J. Bergonzi's hexatonics volume. Nothing here is attributed to a named teacher in the interface.
//
// The map is DERIVED, not typed in: for every scale of the catalogue (the 7 modes of major, the 7 modes of melodic
// minor, harmonic minor's tonic and its 5th mode, and three symmetric scales) every major or minor triad inside the scale
// is found (augmented triads only in the whole-tone scale), and every two of them with no common tone is a pair. Each
// pair records what it leaves out of its scale, the degrees its six notes give over the scale's chord, whether it holds
// that chord's avoid tone, and whether its roots are neighbouring scale steps (adjacent) or not. The CORE list names the
// pairs the lessons, drills, ear levels and the game teach; tests/triadPairsDeep.test.ts checks every pair in all 12
// keys (six notes inside the scale, the omitted tones exactly the rest, the core list a subset of the derived map) and
// the spelling of every triad (three letters in thirds, no double accidental).
//
// Harmonic major is left out on purpose: its two disjoint pairs are E–m + F–m over C (not an idiomatic colour over any
// of its chords) and F–m + G, the same six notes as harmonic minor's iv + V (kept there). Quartal spacings of a pair
// are left out too (no source we trust gives a standard one). If in doubt, leave it out.
//
// Pure, no randomness. Intervals are semitones above the chord root (0 = root).

type Bi = { en: string; he: string };
export const mod12 = (n: number): number => ((n % 12) + 12) % 12;

// ───────────────────────────── scales ─────────────────────────────

export type TPScaleId =
  | 'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian'
  | 'mel-minor' | 'dorian-b2' | 'lydian-aug' | 'lydian-dom' | 'mixo-b6' | 'locrian-n2' | 'altered'
  | 'harm-minor' | 'phryg-dom'
  | 'half-whole' | 'augmented' | 'whole-tone';
/** How degrees are named over the chord: major-7th family, dominant, minor, half-diminished. */
export type TPQ = 'maj' | 'dom' | 'min' | 'hd';
export interface TPScale {
  id: TPScaleId;
  ints: number[];
  /** The chord it sounds over (symbol suffix after the root; ♭ ♯ as signs) and the band's chart spelling. */
  chord: string;
  chart: string;
  q: TPQ;
  family: 'major' | 'melodic' | 'harmonic' | 'symmetric';
  /** Avoid tones over the chord (Levine, The Jazz Theory Book: ionian / mixolydian 11, aeolian ♭13, phrygian ♭9 ♭13, locrian ♭9). */
  avoid: number[];
  n: Bi;
}
const rot = (xs: number[], k: number): number[] => xs.map((_, i) => mod12(xs[(i + k) % xs.length] - xs[k])).sort((a, b) => a - b);
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MEL = [0, 2, 3, 5, 7, 9, 11];
const HARM = [0, 2, 3, 5, 7, 8, 11];
export const TP_SCALE_LIST: TPScale[] = [
  { id: 'ionian', ints: rot(MAJ, 0), chord: 'maj7', chart: 'maj7', q: 'maj', family: 'major', avoid: [5], n: { en: 'ionian (major)', he: 'יוני (מז׳ור)' } },
  { id: 'dorian', ints: rot(MAJ, 1), chord: 'm7', chart: 'm7', q: 'min', family: 'major', avoid: [], n: { en: 'dorian', he: 'דורי' } },
  { id: 'phrygian', ints: rot(MAJ, 2), chord: 'm7', chart: 'm7', q: 'min', family: 'major', avoid: [1, 8], n: { en: 'phrygian', he: 'פריגי' } },
  { id: 'lydian', ints: rot(MAJ, 3), chord: 'maj7♯11', chart: 'maj7#11', q: 'maj', family: 'major', avoid: [], n: { en: 'lydian', he: 'לידי' } },
  { id: 'mixolydian', ints: rot(MAJ, 4), chord: '7', chart: '7', q: 'dom', family: 'major', avoid: [5], n: { en: 'mixolydian', he: 'מיקסולידי' } },
  { id: 'aeolian', ints: rot(MAJ, 5), chord: 'm7', chart: 'm7', q: 'min', family: 'major', avoid: [8], n: { en: 'aeolian (natural minor)', he: 'איאולי (מינור טבעי)' } },
  { id: 'locrian', ints: rot(MAJ, 6), chord: 'm7♭5', chart: 'm7b5', q: 'hd', family: 'major', avoid: [1], n: { en: 'locrian', he: 'לוקרי' } },
  { id: 'mel-minor', ints: rot(MEL, 0), chord: 'm(maj7)', chart: 'm(maj7)', q: 'min', family: 'melodic', avoid: [], n: { en: 'melodic minor', he: 'מינור מלודי' } },
  { id: 'dorian-b2', ints: rot(MEL, 1), chord: 'm7', chart: 'm7', q: 'min', family: 'melodic', avoid: [], n: { en: 'dorian ♭2', he: 'דורי ♭2' } },
  { id: 'lydian-aug', ints: rot(MEL, 2), chord: 'maj7♯5', chart: 'maj7#5', q: 'maj', family: 'melodic', avoid: [], n: { en: 'lydian augmented', he: 'לידי מוגדל' } },
  { id: 'lydian-dom', ints: rot(MEL, 3), chord: '7♯11', chart: '7#11', q: 'dom', family: 'melodic', avoid: [], n: { en: 'lydian dominant', he: 'לידי דומיננטי' } },
  { id: 'mixo-b6', ints: rot(MEL, 4), chord: '7♭13', chart: '7b13', q: 'dom', family: 'melodic', avoid: [], n: { en: 'mixolydian ♭6', he: 'מיקסולידי ♭6' } },
  { id: 'locrian-n2', ints: rot(MEL, 5), chord: 'm7♭5', chart: 'm7b5', q: 'hd', family: 'melodic', avoid: [], n: { en: 'locrian ♮2', he: 'לוקרי ♮2' } },
  { id: 'altered', ints: rot(MEL, 6), chord: '7alt', chart: '7alt', q: 'dom', family: 'melodic', avoid: [], n: { en: 'altered', he: 'אלטרד' } },
  { id: 'harm-minor', ints: rot(HARM, 0), chord: 'm(maj7)', chart: 'm(maj7)', q: 'min', family: 'harmonic', avoid: [], n: { en: 'harmonic minor', he: 'מינור הרמוני' } },
  { id: 'phryg-dom', ints: rot(HARM, 4), chord: '7♭9', chart: '7b9', q: 'dom', family: 'harmonic', avoid: [], n: { en: 'phrygian dominant (harmonic minor from the 5th)', he: 'פריגי דומיננטי (מינור הרמוני מהקווינטה)' } },
  { id: 'half-whole', ints: [0, 1, 3, 4, 6, 7, 9, 10], chord: '7♭9', chart: '7b9', q: 'dom', family: 'symmetric', avoid: [], n: { en: 'half-whole diminished', he: 'מוקטן חצי-שלם' } },
  { id: 'augmented', ints: [0, 3, 4, 7, 8, 11], chord: 'maj7♯5', chart: 'maj7#5', q: 'maj', family: 'symmetric', avoid: [], n: { en: 'augmented (symmetric)', he: 'מוגדל (סימטרי)' } },
  { id: 'whole-tone', ints: [0, 2, 4, 6, 8, 10], chord: '7♯5', chart: '7#5', q: 'dom', family: 'symmetric', avoid: [], n: { en: 'whole tone', he: 'טון שלם' } },
];
export const tpScale = (id: TPScaleId): TPScale => TP_SCALE_LIST.find((s) => s.id === id)!;

// ───────────────────────────── triads and the derived map ─────────────────────────────

export type TQ = 'M' | 'm' | '+';
export const TQ_INTS: Record<TQ, number[]> = { M: [0, 4, 7], m: [0, 3, 7], '+': [0, 4, 8] };
export interface TPTriad {
  /** Root, semitones above the chord root. */
  iv: number;
  q: TQ;
}
export const triadPcsOf = (t: TPTriad, root = 0): number[] => TQ_INTS[t.q].map((x) => mod12(root + t.iv + x));
const sameSet = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

export interface TPPair {
  id: string;
  scale: TPScaleId;
  a: TPTriad;
  b: TPTriad;
  /** adjacent: roots on neighbouring scale steps; non-adjacent; symmetric: inside a symmetric scale. */
  kind: 'adjacent' | 'non-adjacent' | 'symmetric';
  /** The scale tones the six notes leave out (intervals above the chord root). */
  missing: number[];
  /** The scale's avoid tones the pair holds. */
  avoids: number[];
}

/** Every major / minor triad (whole tone: augmented) whose three notes lie in the scale, by root interval. */
export function triadsIn(sc: TPScale): TPTriad[] {
  const qs: TQ[] = sc.id === 'whole-tone' ? ['+'] : ['M', 'm'];
  const out: TPTriad[] = [];
  for (const iv of sc.ints) for (const q of qs) if (TQ_INTS[q].every((x) => sc.ints.includes(mod12(iv + x)))) out.push({ iv, q });
  // an augmented triad is the same set from each of its notes: keep one root per set
  return out.filter((t, i) => out.findIndex((u) => sameSet(triadPcsOf(u), triadPcsOf(t))) === i);
}
const tid = (t: TPTriad): string => `${t.iv}${t.q}`;

/** Every pair of triads in the scale with no common tone (the derived map of one scale). */
export function pairsOfScale(sc: TPScale): TPPair[] {
  const ts = triadsIn(sc);
  const out: TPPair[] = [];
  for (let i = 0; i < ts.length; i++)
    for (let j = i + 1; j < ts.length; j++) {
      const A = triadPcsOf(ts[i]);
      const B = triadPcsOf(ts[j]);
      if (A.some((x) => B.includes(x))) continue;
      // order: the second root a step (≤ a tritone) above the first, so ♭VII + I reads B♭ + C, IV + V reads F + G
      const up = mod12(ts[j].iv - ts[i].iv);
      const [a, b] = up <= 6 ? [ts[i], ts[j]] : [ts[j], ts[i]];
      const six = [...A, ...B];
      const di = sc.ints.indexOf(a.iv);
      const dj = sc.ints.indexOf(b.iv);
      const n = sc.ints.length;
      const adjacent = sc.family !== 'symmetric' && ((dj - di + n) % n === 1 || (di - dj + n) % n === 1);
      out.push({
        id: `${sc.id}/${tid(a)}+${tid(b)}`,
        scale: sc.id,
        a,
        b,
        kind: sc.family === 'symmetric' ? 'symmetric' : adjacent ? 'adjacent' : 'non-adjacent',
        missing: sc.ints.filter((x) => !six.includes(x)),
        avoids: sc.avoid.filter((x) => six.includes(x)),
      });
    }
  return out;
}
/** The whole map: every scale's pairs. */
export const PAIR_MAP: TPPair[] = TP_SCALE_LIST.flatMap(pairsOfScale);
export const pairsFor = (id: TPScaleId): TPPair[] => PAIR_MAP.filter((p) => p.scale === id);
/** The scales of the catalogue that hold all six notes of a pair (over the same chord root). */
export function scalesHoldingPair(p: Pick<TPPair, 'a' | 'b'>): TPScaleId[] {
  const six = [...triadPcsOf(p.a), ...triadPcsOf(p.b)];
  return TP_SCALE_LIST.filter((s) => six.every((x) => s.ints.includes(x))).map((s) => s.id);
}

// ───────────────────────────── degrees and colour ─────────────────────────────

const DEG: Record<TPQ, string[]> = {
  maj: ['1', '♭9', '9', '♯9', '3', '11', '♯11', '5', '♯5', '13', '♭7', '7'],
  dom: ['1', '♭9', '9', '♯9', '3', '11', '♯11', '5', '♭13', '13', '♭7', '7'],
  min: ['1', '♭9', '9', '♭3', '3', '11', '♯11', '5', '♭13', '13', '♭7', '7'],
  hd: ['1', '♭9', '9', '♭3', '3', '11', '♭5', '5', '♭13', '13', '♭7', '7'],
};
export const degOf = (iv: number, q: TPQ): string => DEG[q][mod12(iv)];
/** The chord's own tones (1, 3rd, 5th, 7th) by scale — what is not a colour. */
const CHORD_TONES: Record<TPScaleId, number[]> = {
  ionian: [0, 4, 7, 11], dorian: [0, 3, 7, 10], phrygian: [0, 3, 7, 10], lydian: [0, 4, 7, 11], mixolydian: [0, 4, 7, 10], aeolian: [0, 3, 7, 10], locrian: [0, 3, 6, 10],
  'mel-minor': [0, 3, 7, 11], 'dorian-b2': [0, 3, 7, 10], 'lydian-aug': [0, 4, 8, 11], 'lydian-dom': [0, 4, 7, 10], 'mixo-b6': [0, 4, 7, 10], 'locrian-n2': [0, 3, 6, 10], altered: [0, 4, 10],
  'harm-minor': [0, 3, 7, 11], 'phryg-dom': [0, 4, 7, 10], 'half-whole': [0, 4, 7, 10], augmented: [0, 4, 8, 11], 'whole-tone': [0, 4, 8, 10],
};
export const chordTonesOf = (id: TPScaleId): number[] => CHORD_TONES[id];
/** The degrees each triad gives over the chord ("♭3 5 ♭7", "11 13 1"). */
export function pairDegrees(p: Pick<TPPair, 'a' | 'b' | 'scale'>): [string[], string[]] {
  const q = tpScale(p.scale).q;
  return [TQ_INTS[p.a.q].map((x) => degOf(p.a.iv + x, q)), TQ_INTS[p.b.q].map((x) => degOf(p.b.iv + x, q))];
}
const ORDER = ['♭9', '9', '♯9', '11', '♯11', '♭5', '♯5', '♭13', '13'];
/** The colours the pair adds over its chord: its notes that are not chord tones, low to high ("9 ♯11 13"). */
export function colourTones(p: Pick<TPPair, 'a' | 'b' | 'scale'>): string[] {
  const sc = tpScale(p.scale);
  const six = [...triadPcsOf(p.a), ...triadPcsOf(p.b)];
  return six.filter((x) => !CHORD_TONES[p.scale].includes(x)).map((x) => degOf(x, sc.q)).sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
}

// ───────────────────────────── the core pairs (taught) ─────────────────────────────

export type CoreId =
  | 'dorian' | 'mixolydian' | 'lydian' | 'ionian' | 'aeolian' | 'mixo-no11' | 'lydian-dom' | 'altered' | 'mel-minor' | 'half-dim'
  | 'lydian-aug' | 'phryg-dom' | 'hw-tritone' | 'augmented' | 'whole-tone';
export interface CorePair {
  id: CoreId;
  scale: TPScaleId;
  a: TPTriad;
  b: TPTriad;
  /** Path rating where it is first taught (advanced: ~1350–1850). */
  rating: number;
  /** Roman names over the chord root, as players say them ("♭III + IV"). */
  roman: string;
  advanced?: boolean;
}
const M = (iv: number): TPTriad => ({ iv, q: 'M' });
const m = (iv: number): TPTriad => ({ iv, q: 'm' });
const aug = (iv: number): TPTriad => ({ iv, q: '+' });
export const CORE: CorePair[] = [
  { id: 'dorian', scale: 'dorian', a: M(3), b: M(5), rating: 1350, roman: '♭III + IV' },
  { id: 'mixolydian', scale: 'mixolydian', a: M(10), b: M(0), rating: 1360, roman: '♭VII + I' },
  { id: 'lydian', scale: 'lydian', a: M(2), b: m(4), rating: 1380, roman: 'II + iii' },
  { id: 'ionian', scale: 'ionian', a: M(7), b: m(9), rating: 1400, roman: 'V + vi' },
  { id: 'aeolian', scale: 'aeolian', a: M(10), b: m(0), rating: 1420, roman: '♭VII + i' },
  { id: 'mixo-no11', scale: 'mixolydian', a: m(7), b: m(9), rating: 1440, roman: 'v + vi' },
  { id: 'lydian-dom', scale: 'lydian-dom', a: M(0), b: M(2), rating: 1460, roman: 'I + II' },
  { id: 'altered', scale: 'altered', a: M(6), b: M(8), rating: 1500, roman: '♭V + ♭VI' },
  { id: 'mel-minor', scale: 'mel-minor', a: M(5), b: M(7), rating: 1520, roman: 'IV + V' },
  { id: 'half-dim', scale: 'locrian', a: m(3), b: m(5), rating: 1540, roman: '♭iii + iv' },
  { id: 'lydian-aug', scale: 'lydian-aug', a: M(2), b: M(4), rating: 1560, roman: 'II + III' },
  { id: 'phryg-dom', scale: 'phryg-dom', a: M(0), b: M(1), rating: 1600, roman: 'I + ♭II' },
  { id: 'hw-tritone', scale: 'half-whole', a: M(0), b: M(6), rating: 1700, roman: 'I + ♯IV', advanced: true },
  { id: 'augmented', scale: 'augmented', a: M(0), b: m(8), rating: 1760, roman: 'I + ♯v', advanced: true },
  { id: 'whole-tone', scale: 'whole-tone', a: aug(0), b: aug(2), rating: 1780, roman: 'I+ + II+', advanced: true },
];
export const coreById = (id: CoreId): CorePair => CORE.find((c) => c.id === id)!;
/** The derived map's entry for a core pair (the same two triads in its scale). */
export function mapEntry(c: Pick<CorePair, 'scale' | 'a' | 'b'>): TPPair | undefined {
  const A = triadPcsOf(c.a);
  const B = triadPcsOf(c.b);
  return pairsFor(c.scale).find((p) => {
    const x = triadPcsOf(p.a);
    const y = triadPcsOf(p.b);
    return (sameSet(x, A) && sameSet(y, B)) || (sameSet(x, B) && sameSet(y, A));
  });
}
/** The pair's two triads (pitch classes, root first) over a chord root. */
export const coreTriads = (c: Pick<CorePair, 'a' | 'b'>, root: number): [number[], number[]] => [triadPcsOf(c.a, root), triadPcsOf(c.b, root)];
/** The six notes over a chord root (sorted pitch classes). */
export const coreHex = (c: Pick<CorePair, 'a' | 'b'>, root: number): number[] => [...new Set(coreTriads(c, root).flat())].sort((x, y) => x - y);
export const coreMissing = (c: CorePair): number[] => mapEntry(c)!.missing;
export const coreColour = (c: CorePair): string[] => colourTones(c);
/** The chord's symbol suffix and quality of a core pair. */
export const coreChord = (c: CorePair): string => tpScale(c.scale).chord;

/**
 * By ear the pairs are compared over one plain chord per group — maj7 (1 3 5 7), 7 (1 3 5 ♭7), m7 (1 ♭3 5 ♭7) — so the
 * colours a pair adds are its notes outside that chord ("9 ♯11 13" for D + Em over Cmaj7, "♯9 ♯5" never: the
 * augmented-scale pair is kept out of the ear levels, its ♯5 and the plain 5th clash over a plain maj7).
 */
export type EarGroup = 'maj' | 'dom' | 'min';
export const EAR_BASE: Record<EarGroup, number[]> = { maj: [0, 4, 7, 11], dom: [0, 4, 7, 10], min: [0, 3, 7, 10] };
export const earGroupOf = (c: Pick<CorePair, 'scale' | 'id'>): EarGroup | null => {
  if (c.id === 'augmented') return null;
  const q = tpScale(c.scale).q;
  return q === 'maj' ? 'maj' : q === 'dom' ? 'dom' : 'min';
};
const EAR_ORDER = ['♭9', '9', '♯9', '11', '♯11', '♭5', '♯5', '♭13', '13', '7'];
export function earColour(c: Pick<CorePair, 'a' | 'b' | 'scale' | 'id'>): string[] {
  const g = earGroupOf(c) ?? 'maj';
  const six = [...triadPcsOf(c.a), ...triadPcsOf(c.b)];
  const table: TPQ = g === 'min' ? 'hd' : g;
  return six.filter((x) => !EAR_BASE[g].includes(x)).map((x) => degOf(x, table)).sort((x, y) => EAR_ORDER.indexOf(x) - EAR_ORDER.indexOf(y));
}

// ───────────────────────────── spelling (every key) ─────────────────────────────

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
/** A pitch class written on a letter (0 = C … 6 = B), or null beyond a double accidental. */
export function onLetter(pc: number, letter: number): string | null {
  const l = ((letter % 7) + 7) % 7;
  let d = mod12(pc - NATURAL[l]);
  if (d > 6) d -= 12;
  return ACC[d] === undefined ? null : LETTERS[l] + ACC[d];
}
const letterOf = (name: string): number => LETTERS.indexOf(name[0]);
const accN = (n: string): number => (n.includes('𝄪') || n.includes('𝄫') ? 2 : n.length > 1 ? 1 : 0);
const UGLY = new Set(['B♯', 'E♯', 'C♭', 'F♭']);
/** Chord-root names of the 12 keys (the key-signature spelling the drills use: G♭, not F♯). */
export const KEY_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const FLAT_KEYS = new Set([1, 3, 5, 6, 8, 10]);
/**
 * The letter step above the chord root a triad's root is written on: from the degree's name over the chord (♭9 / 9 / ♯9
 * on the 2nd letter, ♯11 on the 4th, ♯5 on the 5th, ♭13 on the 6th), with the spellings players use where two names
 * exist: the altered pair is G♭ + A♭ over C7alt (♭5), and E♭ (not D♯) in the half-whole and altered scales.
 */
const STEP_OVERRIDE: Partial<Record<TPScaleId, Record<number, number>>> = { altered: { 3: 2, 6: 4 }, 'half-whole': { 3: 2 } };
function stepOf(iv: number, scale?: TPScaleId): number {
  const o = scale ? STEP_OVERRIDE[scale]?.[mod12(iv)] : undefined;
  if (o !== undefined) return o;
  const name = degOf(iv, scale ? tpScale(scale).q : 'dom');
  const n = Number(name.replace(/[♭♯]/g, ''));
  return (n - 1) % 7;
}

/** A triad on a spelled root: its three names on letters a third apart, or null when one needs a double accidental. */
export function spellOnRoot(rootName: string, q: TQ): string[] | null {
  const l = letterOf(rootName);
  const rpc = mod12(NATURAL[l] + (rootName.includes('♯') ? 1 : rootName.includes('♭') ? -1 : 0) + (rootName.includes('𝄪') ? 1 : 0) + (rootName.includes('𝄫') ? -1 : 0));
  const out = TQ_INTS[q].map((x, k) => onLetter(rpc + x, l + 2 * k));
  return out.every((n) => n && accN(n) < 2) ? (out as string[]) : null;
}
/**
 * The spelled triad `t` over chord root `key` ("A♭", "C", "E♭"), `scale` naming its degrees: the root on the letter of
 * its degree above the chord root (over C7alt G♭, over C in the augmented scale G♯m, in B lydian C♯ with its E♯) when
 * that root is not B♯ / E♯ / C♭ / F♭ and the triad needs no double accidental; otherwise the enharmonic root with the
 * fewest accidentals (D♭7♭9's pair is D♭ + D, not D♭ + E𝄫). An augmented triad is the same set from each of its notes:
 * it is named from the note that spells it best.
 */
export function spellTriad(key: number, t: TPTriad, scale?: TPScaleId, rootName?: string): { root: string; notes: string[]; name: string } {
  const kname = rootName ?? KEY_NAME[mod12(key)];
  const suffix = t.q === 'm' ? 'm' : t.q === '+' ? '+' : '';
  const tryRoot = (r: string | null) => (r && accN(r) < 2 && !UGLY.has(r) ? spellOnRoot(r, t.q) : null);
  const score = (x: { r: string; n: string[] }) => x.n.reduce((s, n) => s + accN(n) + (UGLY.has(n) ? 1.5 : 0), 0) + (FLAT_KEYS.has(mod12(key)) === x.r.includes('♭') ? 0 : 0.1);
  const all = (pc: number) =>
    [0, 1, 2, 3, 4, 5, 6]
      .map((l) => onLetter(pc, l))
      .map((r) => ({ r: r ?? '', n: tryRoot(r) }))
      .filter((x): x is { r: string; n: string[] } => !!x.n);
  if (t.q === '+') {
    const w = onLetter(mod12(key + t.iv), letterOf(kname) + stepOf(t.iv, scale));
    const p = tryRoot(w);
    if (p) return { root: w!, notes: p, name: w! + suffix };
    const roots = [0, 4, 8].map((d) => mod12(key + t.iv + d));
    const cands = roots.flatMap((pc, i) => all(pc).map((x) => ({ ...x, s: score(x) + (i === 0 ? 0 : 0.05) })));
    const best = cands.sort((x, y) => x.s - y.s)[0];
    return { root: best.r, notes: best.n, name: best.r + suffix };
  }
  const pc = mod12(key + t.iv);
  const want = onLetter(pc, letterOf(kname) + stepOf(t.iv, scale));
  const pref = tryRoot(want);
  if (pref) return { root: want!, notes: pref, name: want! + suffix };
  const best = all(pc).sort((x, y) => score(x) - score(y))[0];
  return { root: best.r, notes: best.n, name: best.r + suffix };
}
/** "F + G", "D + Em", "C + G♯m" over chord root `key` (spelled `rootName` when given: C♯, not D♭, in B major). */
export const pairNameIn = (c: Pick<CorePair, 'a' | 'b' | 'scale'>, key: number, rootName?: string): string => `${spellTriad(key, c.a, c.scale, rootName).name} + ${spellTriad(key, c.b, c.scale, rootName).name}`;
/** The chord symbol of a core pair in a key ("Dm7", "C7alt"). */
export const chordNameIn = (c: Pick<CorePair, 'scale'>, key: number, rootName?: string): string => (rootName ?? KEY_NAME[mod12(key)]) + tpScale(c.scale).chord;
export const chordChartIn = (c: Pick<CorePair, 'scale'>, key: number, rootName?: string): string => (rootName ?? KEY_NAME[mod12(key)]) + tpScale(c.scale).chart;
/** The root of the chord `d` semitones above the tonic of `key`, spelled in that key (B major: ii = C♯, VI = G♯). */
export function rootIn(key: number, d: number): string {
  const steps: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  const st = steps[mod12(d)];
  const n = st === undefined ? null : onLetter(mod12(key + d), letterOf(KEY_NAME[mod12(key)]) + st);
  return n && accN(n) < 2 && !UGLY.has(n) ? n : KEY_NAME[mod12(key + d)];
}

// ───────────────────────────── melodic patterns ─────────────────────────────

/**
 * The pattern families (each goes up the range, then back down the same notes reversed — groups of 5-3-1 coming down
 * after 1-3-5 going up):
 *   root   each triad in root position (1-3-5), A, B, A, B … each group starting above the last group's start
 *   perm1  3-5-1 (first inversion) ·  perm2  5-1-3 (second inversion)
 *   inv    alternating inversions: A root, B 1st inversion, A 2nd inversion, B root …
 *   cell2  two-note cells: two notes of A, two of B, each triad climbing on its own
 *   spread open triads (1-5-10), A then B — the wide, intervallic sound
 *   hex    the six notes as a scale
 */
export type PatId = 'root' | 'perm1' | 'perm2' | 'inv' | 'cell2' | 'spread' | 'hex';
export const PAT_NAME: Record<PatId, Bi> = {
  root: { en: 'root position, 1-3-5 up, 5-3-1 down', he: 'מצב יסודי, 1-3-5 למעלה, 5-3-1 למטה' },
  perm1: { en: '3-5-1 up, 1-5-3 down', he: '3-5-1 למעלה, 1-5-3 למטה' },
  perm2: { en: '5-1-3 up, 3-1-5 down', he: '5-1-3 למעלה, 3-1-5 למטה' },
  inv: { en: 'alternating inversions', he: 'היפוכים מתחלפים' },
  cell2: { en: 'two-note cells across the pair', he: 'תאים של שני צלילים בין שני המשולשים' },
  spread: { en: 'open triads (1-5-10)', he: 'משולשים פתוחים (1-5-10)' },
  hex: { en: 'the hexatonic scale', he: 'הסולם ההקסטוני' },
};
/** The lowest pitch of pitch class pc strictly above p. */
const above = (pc: number, p: number): number => p + 1 + mod12(pc - (p + 1));
/** The lowest pitch of pitch class pc at or above p. */
const atOrAbove = (pc: number, p: number): number => p + mod12(pc - p);

/** One way up through [lo, hi] (pitches). Triads are root-first pitch classes. */
export function patternUp(A: number[], B: number[], pat: PatId, lo: number, hi: number): number[] {
  const out: number[] = [];
  if (pat === 'hex') {
    const six = new Set([...A, ...B].map(mod12));
    for (let p = lo; p <= hi; p++) if (six.has(mod12(p))) out.push(p);
    // start on the first triad's root (the lowest A root in range) so the run begins on a chord sound
    const s = out.findIndex((p) => mod12(p) === mod12(A[0]));
    return s > 0 ? out.slice(s) : out;
  }
  if (pat === 'cell2') {
    const stream = (T: number[], from: number) => {
      const xs: number[] = [];
      let p = from - 1;
      for (let k = 0; xs.length < 40; k++) {
        p = above(T[k % 3], p);
        xs.push(p);
      }
      return xs;
    };
    const a = stream(A, atOrAbove(A[0], lo));
    const b = stream(B, above(B[0], a[0]));
    for (let k = 0; ; k++) {
      const chunk = [a[2 * k], a[2 * k + 1], b[2 * k], b[2 * k + 1]];
      if (chunk.some((p) => p > hi)) break;
      out.push(...chunk);
    }
    return out;
  }
  let anchor = lo - 1;
  for (let g = 0; g < 64; g++) {
    const T = g % 2 === 0 ? A : B;
    let order: number[];
    if (pat === 'spread') {
      const r = above(T[0], anchor);
      const grp = [r, r + mod12(T[2] - T[0]), r + 12 + mod12(T[1] - T[0])];
      if (grp[2] > hi) break;
      out.push(...grp);
      anchor = r;
      continue;
    }
    const inv = pat === 'root' ? 0 : pat === 'perm1' ? 1 : pat === 'perm2' ? 2 : g % 3;
    order = [T[inv % 3], T[(inv + 1) % 3], T[(inv + 2) % 3]];
    // the 3-5-1 and 5-1-3 shapes start on the 3rd / 5th nearest the first triad's root, not up to an octave above it
    const first = g === 0 && (pat === 'perm1' || pat === 'perm2') ? atOrAbove(order[0], lo - 7) : above(order[0], anchor);
    const grp = [first];
    for (let k = 1; k < 3; k++) grp.push(above(order[k], grp[k - 1]));
    if (grp[2] > hi) break;
    out.push(...grp);
    anchor = first;
  }
  return out;
}
/** Up, then the same notes back down (the top note once). */
export function patternUpDown(A: number[], B: number[], pat: PatId, lo: number, hi: number): number[] {
  const up = patternUp(A, B, pat, lo, hi);
  return [...up, ...up.slice(0, -1).reverse()];
}
/**
 * `count` notes of the pattern starting at the note nearest `near` (a group start going up, so each chord's bar starts
 * on a triad), continuing up and down the range as often as needed — for lines over changes.
 */
export function patternRun(A: number[], B: number[], pat: PatId, lo: number, hi: number, near: number, count: number): number[] {
  const cyc = patternUpDown(A, B, pat, lo, hi).slice(0, -1);
  const n = cyc.length;
  const step = pat === 'cell2' ? 4 : pat === 'hex' ? 1 : 3;
  const upLen = Math.ceil(n / 2);
  let best = 0;
  for (let i = 0; i < upLen; i += step) if (Math.abs(cyc[i] - near) < Math.abs(cyc[best] - near)) best = i;
  return Array.from({ length: count }, (_, k) => cyc[(best + k) % n]);
}

/** Rhythmic groupings: 8ths, triplets (three notes a beat), 16ths. The last note is held to the next beat. */
export type Grouping = 'eighths' | 'triplets' | 'sixteenths' | 'quarters';
export const PER_BEAT: Record<Grouping, number> = { quarters: 1, eighths: 2, triplets: 3, sixteenths: 4 };
export function rhythmize(ps: number[], g: Grouping, start = 0, hold = 2): { p: number; beat: number; dur: number }[] {
  const u = 1 / PER_BEAT[g];
  return ps.map((p, i) => ({ p, beat: start + i * u, dur: i === ps.length - 1 ? Math.max(hold, u) : u }));
}

// ───────────────────────────── voicings ─────────────────────────────

/** A close-position triad (pitch classes root first) in its inversion whose top is nearest `aim` within [lo, hi]. */
export function closeTriadNear(T: number[], aim: number, lo: number, hi: number): number[] {
  let best: number[] | null = null;
  for (let inv = 0; inv < 3; inv++) {
    const order = [T[inv], T[(inv + 1) % 3], T[(inv + 2) % 3]];
    for (let b = lo; b <= hi; b++) {
      if (mod12(b) !== mod12(order[0])) continue;
      const v = [b];
      for (let k = 1; k < 3; k++) v.push(above(order[k], v[k - 1]));
      if (v[2] > hi) continue;
      if (!best || Math.abs(v[2] - aim) < Math.abs(best[2] - aim)) best = v;
    }
  }
  return best!;
}
/** The close triad with `top` as its highest note (block chords: the melody on top). */
export function triadUnderTop(T: number[], top: number): number[] {
  const others = T.filter((x) => mod12(x) !== mod12(top));
  const v = others.map((pc) => top - 12 + mod12(pc - top + 12)).sort((a, b) => a - b);
  return [...v, top];
}
/** Smallest total motion between two voicings of equal size (sorted). */
export const motion = (a: number[], b: number[]): number => a.reduce((s, p, i) => s + Math.abs(p - b[i]), 0);
/** A close triad voice-led from `prev` (smallest motion) inside [lo, hi]. */
export function closeTriadLed(T: number[], prev: number[], lo: number, hi: number): number[] {
  let best: number[] | null = null;
  for (let inv = 0; inv < 3; inv++) {
    const order = [T[inv], T[(inv + 1) % 3], T[(inv + 2) % 3]];
    for (let b = lo; b <= hi; b++) {
      if (mod12(b) !== mod12(order[0])) continue;
      const v = [b];
      for (let k = 1; k < 3; k++) v.push(above(order[k], v[k - 1]));
      if (v[2] > hi) continue;
      if (!best || motion(prev, v) < motion(prev, best)) best = v;
    }
  }
  return best!;
}
/** Spread across two hands: the lower triad's root and 5th in the left hand, its 3rd (the 10th) and the upper triad above in the right. */
export function spreadPair(lower: number[], upper: number[], bassLo: number): { lh: number[]; rh: number[] } {
  const r = atOrAbove(lower[0], bassLo);
  const fifth = r + mod12(lower[2] - lower[0]);
  const tenth = r + 12 + mod12(lower[1] - lower[0]);
  const u0 = above(upper[0], tenth);
  const top = [u0, above(upper[1], u0), above(upper[2], above(upper[1], u0))];
  return { lh: [r, fifth], rh: [tenth, ...top] };
}

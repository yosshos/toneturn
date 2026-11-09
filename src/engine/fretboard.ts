// Fretboards and fingerboards (spec AE §3.1, §4.1): tunings, where a note is, what note a fret is. Pure.
// Strings are numbered from the highest-sounding string (1) to the lowest, as guitarists count them.
// Pitches are WRITTEN pitch (guitar and bass sound an octave lower than written; the app reads and draws written).

export type NeckInstrument = 'guitar' | 'bass' | 'violin' | 'viola' | 'cello';

export interface Tuning {
  id: string;
  instrument: NeckInstrument;
  name: { en: string; he: string };
  /** Open-string MIDI notes (written), string 1 (highest) first. */
  open: number[];
  /** Fretted (guitar, bass) or not (bowed strings: positions are marked instead of frets). */
  fretted: boolean;
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', instrument: 'guitar', name: { en: 'Standard (EADGBE)', he: 'סטנדרטי (EADGBE)' }, open: [64, 59, 55, 50, 45, 40], fretted: true },
  { id: 'drop-d', instrument: 'guitar', name: { en: 'Drop D', he: 'Drop D' }, open: [64, 59, 55, 50, 45, 38], fretted: true },
  { id: 'dadgad', instrument: 'guitar', name: { en: 'DADGAD', he: 'DADGAD' }, open: [62, 57, 55, 50, 45, 38], fretted: true },
  { id: 'open-g', instrument: 'guitar', name: { en: 'Open G', he: 'Open G' }, open: [62, 59, 55, 50, 43, 38], fretted: true },
  { id: 'half-down', instrument: 'guitar', name: { en: 'Half step down', he: 'חצי טון למטה' }, open: [63, 58, 54, 49, 44, 39], fretted: true },
  { id: 'bass', instrument: 'bass', name: { en: 'Bass (EADG)', he: 'בס (EADG)' }, open: [43, 38, 33, 28], fretted: true },
  // Bass course (BASS_CURRICULUM §10): 5-string (low B0 = 23), 6-string (high C3 = 48), drop-D 4-string (D1 = 26).
  { id: 'bass5', instrument: 'bass', name: { en: '5-string bass (BEADG)', he: 'בס 5 מיתרים (BEADG)' }, open: [43, 38, 33, 28, 23], fretted: true },
  { id: 'bass6', instrument: 'bass', name: { en: '6-string bass (BEADGC)', he: 'בס 6 מיתרים (BEADGC)' }, open: [48, 43, 38, 33, 28, 23], fretted: true },
  { id: 'bass-dropd', instrument: 'bass', name: { en: 'Bass, drop D (DADG)', he: 'בס, Drop D (DADG)' }, open: [43, 38, 33, 26], fretted: true },
  // 0.64 (BASS_CURRICULUM §5.1): fretless electric and upright (double) bass — same strings, no frets (intonation in cents).
  { id: 'bass-fretless', instrument: 'bass', name: { en: 'Fretless bass (EADG)', he: 'בס פרטלס (EADG)' }, open: [43, 38, 33, 28], fretted: false },
  { id: 'upright', instrument: 'bass', name: { en: 'Double bass (EADG)', he: 'קונטרבס (EADG)' }, open: [43, 38, 33, 28], fretted: false },
  { id: 'violin', instrument: 'violin', name: { en: 'Violin (GDAE)', he: 'כינור (GDAE)' }, open: [76, 69, 62, 55], fretted: false },
  { id: 'viola', instrument: 'viola', name: { en: 'Viola (CGDA)', he: 'ויולה (CGDA)' }, open: [69, 62, 55, 48], fretted: false },
  { id: 'cello', instrument: 'cello', name: { en: 'Cello (CGDA)', he: "צ'לו (CGDA)" }, open: [57, 50, 43, 36], fretted: false },
];
export const tuningById = (id: string | undefined): Tuning => TUNINGS.find((t) => t.id === id) ?? TUNINGS[0];
export const defaultTuning = (inst: NeckInstrument): Tuning => TUNINGS.find((t) => t.instrument === inst) ?? TUNINGS[0];

/** The note at a string and fret. */
export const noteAt = (t: Tuning, str: number, fret: number): number => t.open[str - 1] + fret;

/**
 * Dots written for one tuning (string / fret), moved onto another so each dot keeps its pitch (B12: bass diagrams on
 * the player's bass tuning). The string with the same open note keeps the fret (5-string: E A D G unchanged; 6-string:
 * G is string 2); else the same string with the fret moved (drop D: +2 on the 4th string); else the lowest fret anywhere.
 * A dot that can't be played on the new tuning is left out.
 */
export function remapDots<D extends { str: number; fret: number }>(from: Tuning, to: Tuning, dots: D[]): D[] {
  if (from.id === to.id) return dots;
  return dots.flatMap((d) => {
    const midi = noteAt(from, d.str, d.fret);
    const same = to.open.findIndex((o) => o === from.open[d.str - 1]);
    if (same >= 0) return [{ ...d, str: same + 1 }];
    if (d.str <= to.open.length && midi - to.open[d.str - 1] >= 0) return [{ ...d, fret: midi - to.open[d.str - 1] }];
    const ps = positionsOf(to, midi, 0, 24).sort((a, b) => a.fret - b.fret);
    return ps.length ? [{ ...d, str: ps[0].str, fret: ps[0].fret }] : [];
  });
}

/** Every place a MIDI note can be played, frets lo..hi (inclusive). */
export function positionsOf(t: Tuning, midi: number, lo = 0, hi = 15, strings?: number[]): { str: number; fret: number }[] {
  const out: { str: number; fret: number }[] = [];
  t.open.forEach((o, i) => {
    const str = i + 1;
    if (strings && !strings.includes(str)) return;
    const fret = midi - o;
    if (fret >= lo && fret <= hi) out.push({ str, fret });
  });
  return out;
}

/** Every place a pitch class appears, frets lo..hi. */
export function pcPositions(t: Tuning, pc: number, lo = 0, hi = 12, strings?: number[]): { str: number; fret: number }[] {
  const out: { str: number; fret: number }[] = [];
  t.open.forEach((o, i) => {
    const str = i + 1;
    if (strings && !strings.includes(str)) return;
    for (let f = lo; f <= hi; f++) if ((((o + f) % 12) + 12) % 12 === (((pc % 12) + 12) % 12)) out.push({ str, fret: f });
  });
  return out;
}

/** Inlay frets (dots on the neck). */
export const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

// ---------------------------------------------------------------- shapes (spec AE §4.1)
// A position on the neck. Strings 1 = highest; fret 0 = open (bowed strings: semitones above the open string).
export interface NeckPos {
  str: number;
  fret: number;
}

/** The notes (MIDI) of positions, in the order given. */
export const midisAt = (t: Tuning, ps: NeckPos[]): number[] => ps.map((p) => noteAt(t, p.str, p.fret));

/** A fingering: fretted / open positions and muted strings. */
export interface FretShape {
  dots: NeckPos[];
  muted: number[];
}
/** Parse "x32010" (lowest string first, as guitarists write it; x = muted; "(12)" for two-digit frets). */
export function parseShape(s: string, strings = 6): FretShape {
  const toks = s.match(/\(\d+\)|x|\d/g) ?? [];
  const dots: NeckPos[] = [];
  const muted: number[] = [];
  toks.forEach((tok, i) => {
    const str = strings - i;
    if (tok === 'x') muted.push(str);
    else dots.push({ str, fret: Number(tok.replace(/[()]/g, '')) });
  });
  return { dots, muted };
}
/** Move a shape up by n frets (open strings become fretted: the barre). */
export const shiftShape = (s: FretShape, n: number): FretShape => ({ dots: s.dots.map((d) => ({ str: d.str, fret: d.fret + n })), muted: s.muted.slice() });

/** A chord-box picture: fretted dots (roots marked), open and muted strings, the first fret shown. */
export interface BoxPicture {
  dots: { str: number; fret: number; root?: boolean }[];
  open: number[];
  muted: number[];
  baseFret: number;
}
/** The picture of a shape: fret 0 → ○; the window starts at 1 when everything fits in frets 1–4, else at the lowest fret. */
export function boxPicture(t: Tuning, s: FretShape, rootPc?: number): BoxPicture {
  const fretted = s.dots.filter((d) => d.fret > 0);
  const lo = fretted.length ? Math.min(...fretted.map((d) => d.fret)) : 1;
  const hi = fretted.length ? Math.max(...fretted.map((d) => d.fret)) : 1;
  const isRoot = (d: NeckPos) => rootPc !== undefined && (((noteAt(t, d.str, d.fret) - rootPc) % 12) + 12) % 12 === 0;
  return {
    dots: fretted.map((d) => ({ str: d.str, fret: d.fret, ...(isRoot(d) ? { root: true } : {}) })),
    open: s.dots.filter((d) => d.fret === 0).map((d) => d.str),
    muted: s.muted.slice(),
    baseFret: hi <= 4 ? 1 : lo,
  };
}

export type OpenChordId = 'C' | 'A' | 'G' | 'E' | 'D' | 'Am' | 'Em' | 'Dm';
/** The open chords (standard tuning): shape, root pitch class, quality. */
export const OPEN_CHORDS: Record<OpenChordId, { shape: string; root: number; minor: boolean }> = {
  C: { shape: 'x32010', root: 0, minor: false },
  A: { shape: 'x02220', root: 9, minor: false },
  G: { shape: '320003', root: 7, minor: false },
  E: { shape: '022100', root: 4, minor: false },
  D: { shape: 'xx0232', root: 2, minor: false },
  Am: { shape: 'x02210', root: 9, minor: true },
  Em: { shape: '022000', root: 4, minor: true },
  Dm: { shape: 'xx0231', root: 2, minor: true },
};

export type CagedId = 'C' | 'A' | 'G' | 'E' | 'D';
export const CAGED: CagedId[] = ['C', 'A', 'G', 'E', 'D'];
/** A major chord on `rootPc` played with a CAGED shape moved up the neck (shift 1–12 frets, never the open chord). */
export function cagedShape(shape: CagedId, rootPc: number): FretShape {
  const o = OPEN_CHORDS[shape];
  let n = (((rootPc - o.root) % 12) + 12) % 12;
  if (n === 0) n = 12;
  return shiftShape(parseShape(o.shape), n);
}

/** Every close-position triad (under an octave) on adjacent strings (`strings` low → high, e.g. [3, 2, 1]): one note
 *  per string, every chord tone present, fret span ≤ maxSpan. Sorted by lowest fret. */
export function triadVoicings(t: Tuning, pcs: number[], strings: number[], lo = 0, hi = 15, maxSpan = 4): NeckPos[][] {
  const want = new Set(pcs.map((p) => ((p % 12) + 12) % 12));
  const per = strings.map((str) => {
    const fs: number[] = [];
    for (let f = lo; f <= hi; f++) if (want.has(noteAt(t, str, f) % 12)) fs.push(f);
    return fs;
  });
  const out: NeckPos[][] = [];
  const rec = (i: number, acc: NeckPos[]) => {
    if (i === strings.length) {
      const ms = midisAt(t, acc);
      const fretted = acc.filter((p) => p.fret > 0).map((p) => p.fret);
      const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
      const rising = ms.every((m, k) => k === 0 || m > ms[k - 1]);
      if (span <= maxSpan && rising && new Set(ms.map((m) => m % 12)).size === want.size && ms[ms.length - 1] - ms[0] < 12) out.push(acc.slice());
      return;
    }
    for (const f of per[i]) rec(i + 1, [...acc, { str: strings[i], fret: f }]);
  };
  rec(0, []);
  return out.sort((a, b) => Math.min(...a.map((p) => p.fret)) - Math.min(...b.map((p) => p.fret)));
}

export type SeventhKind = 'maj7' | '7' | 'm7' | 'm7b5';
/** Third, fifth and seventh above the root. */
export const SEVENTH_IV: Record<SeventhKind, [number, number, number]> = { maj7: [4, 7, 11], '7': [4, 7, 10], m7: [3, 7, 10], m7b5: [3, 6, 10] };
/** Drop-2 (R 5 7 3 on four adjacent strings) or drop-3 (R 7 3 5, skipping the string above the root) seventh chord,
 *  root on `rootStr` at `rootFret`. Null when a note falls outside frets 0–15 or off the neck. */
export function dropVoicing(t: Tuning, drop: 2 | 3, kind: SeventhKind, rootStr: number, rootFret: number): NeckPos[] | null {
  const [third, fifth, seventh] = SEVENTH_IV[kind];
  const r = noteAt(t, rootStr, rootFret);
  const ms = drop === 2 ? [r, r + fifth, r + seventh, r + 12 + third] : [r, r + seventh, r + 12 + third, r + 12 + fifth];
  const strs = drop === 2 ? [rootStr, rootStr - 1, rootStr - 2, rootStr - 3] : [rootStr, rootStr - 2, rootStr - 3, rootStr - 4];
  if (strs[strs.length - 1] < 1 || rootStr > t.open.length) return null;
  const ps = ms.map((m, i) => ({ str: strs[i], fret: m - t.open[strs[i] - 1] }));
  return ps.every((p) => p.fret >= 0 && p.fret <= 15) ? ps : null;
}

/** Minor-pentatonic boxes 1–5: fret offsets on strings 6 … 1 (two notes each) from the box-1 root fret on string 6. */
export const PENTA_BOXES: [number, number][][] = [
  [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]],
  [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]],
  [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]],
  [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]],
  [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]],
];
/** Box n (1–5) of the minor pentatonic on `rootPc` (standard tuning), ascending (string 6 first), within frets 0–15. */
export function pentaBox(n: number, rootPc: number, t: Tuning = TUNINGS[0]): NeckPos[] {
  const r = (((rootPc - t.open[5]) % 12) + 12) % 12;
  let ps: NeckPos[] = PENTA_BOXES[n - 1].flatMap((fs, i) => fs.map((f) => ({ str: 6 - i, fret: r + f })));
  if (Math.max(...ps.map((p) => p.fret)) > 15) ps = ps.map((p) => ({ str: p.str, fret: p.fret - 12 }));
  return ps;
}

/** Three notes per string: `count` scale notes rising from the tonic `startMidi` (steps = the scale's semitones above
 *  its tonic, e.g. [0,2,4,5,7,9,11]) on `strings` from low to high (e.g. [6, 5, 4]). */
export function threeNps(t: Tuning, startMidi: number, steps: number[], strings: number[], count = strings.length * 3): NeckPos[] {
  const notes: number[] = [];
  for (let i = 0; notes.length < count; i++) notes.push(startMidi + 12 * Math.floor(i / steps.length) + steps[i % steps.length]);
  return notes.map((m, i) => {
    const str = strings[Math.floor(i / 3)];
    return { str, fret: m - t.open[str - 1] };
  });
}

/** An arpeggio as a shape (bass or guitar): each tone (semitones above the root) on the lowest string that keeps it
 *  under the hand (root fret −1 … +4), moving up the strings. Null when it doesn't fit. */
export function arpeggioShape(t: Tuning, rootStr: number, rootFret: number, intervals: number[]): NeckPos[] | null {
  const root = noteAt(t, rootStr, rootFret);
  let cur = rootStr;
  const out: NeckPos[] = [];
  for (const iv of intervals) {
    const m = root + iv;
    let placed: NeckPos | null = null;
    for (let s = cur; s >= 1 && !placed; s--) {
      const f = m - t.open[s - 1];
      if (f >= Math.max(0, rootFret - 1) && f <= rootFret + 4) placed = { str: s, fret: f };
    }
    if (!placed) return null;
    out.push(placed);
    cur = placed.str;
  }
  return out;
}

/** Root, fifth and octave (the bass player's first shape), root on `rootStr`. */
export const rootFiveOctave = (t: Tuning, rootStr: number, rootFret: number) => arpeggioShape(t, rootStr, rootFret, [0, 7, 12]);

/** Bowed strings: the first-position range in semitones above each open string (4th finger included). */
export const FIRST_POSITION: Record<'violin' | 'viola' | 'cello', [number, number]> = { violin: [0, 7], viola: [0, 7], cello: [0, 5] };

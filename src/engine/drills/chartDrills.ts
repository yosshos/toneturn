// Any progression as a piano drill (owner 2026-11-08): the improvisation levels, the chart templates, standards'
// changes or your own chart, played as voicings (shells, guide tones, rootless A / B, close 4-note, drop 2, drop 3,
// open, two-handed, quartal, upper structures, block chords) in a comping rhythm (whole, Charleston, reverse
// Charleston, Red Garland, anticipation, four to the bar) — or as a stride left hand (single, octave, tenths, broken
// tenths, walking). Mode "improv": only the left hand is written; the right hand improvises above it (not graded as
// notes — the screen checks it against the chord-scales). Pure: returns the events; generate.ts turns them into a Drill.
//
// The spec's kind encodes everything:  chart~<ref>~<voicing>~<rhythm>~<mode>
//   ref: "lv:<id>" improvisation level · "std:<id>" standard · "tpl:<id>" template · "txt:<uri-encoded text>" own chart ·
//        "cad:<id>" a cadence of the cadence library (cadences.ts, written in C / C minor) ·
//        "set:<id>" a built-in practice chart that is not a cadence (CHART_SETS, with its own home key)

import { CHART_TEMPLATES, IMPROV_LEVELS, parseChart, type ChartChordEv } from '../charts';
import { STANDARD_CHANGES } from '../standards';
import { autoScale } from '../improvRules';
import { MODE_STEPS } from '../modes';
import type { Hand } from './types';
import { moved, nameInKey, refHome, transposeSymIn, type Home } from '../stdKey';
import { cadenceById, cadencePlayText, cadenceTitle } from '../cadences';

export type ChartVoicing = 'shell' | 'guide' | 'rootless-a' | 'rootless-b' | 'rootless' | 'close4' | 'drop2' | 'drop3' | 'open' | 'two-hand' | 'quartal' | 'upper' | 'block' | 'stride-single' | 'stride-octave' | 'stride-tenth' | 'stride-broken' | 'stride-walk' | 'walk-lh' | 'sowhat1' | 'sowhat2' | 'barron';
export type CompRhythm = 'whole' | 'charleston' | 'reverse' | 'garland' | 'anticip' | 'four' | 'stride';
export type ChartMode = 'comp' | 'improv';

export const VOICINGS: ChartVoicing[] = ['shell', 'guide', 'rootless', 'rootless-a', 'rootless-b', 'close4', 'drop2', 'drop3', 'open', 'two-hand', 'quartal', 'upper', 'block'];
export const STRIDES: ChartVoicing[] = ['stride-single', 'stride-octave', 'stride-tenth', 'stride-broken', 'stride-walk'];
export const RHYTHMS: CompRhythm[] = ['whole', 'charleston', 'reverse', 'garland', 'anticip', 'four'];

type Bi = { en: string; he: string };
export const VOICING_NAME: Record<ChartVoicing, Bi> = {
  shell: { en: 'Shells (1-3-7 / 1-7-3)', he: 'שלדים (1-3-7 / 1-7-3)' },
  guide: { en: 'Guide tones (3 & 7)', he: 'צלילים מנחים (3 ו־7)' },
  rootless: { en: 'Rootless A/B (smoothest)', he: 'בלי שורש A/B (הכי חלק)' },
  'rootless-a': { en: 'Rootless A (3-5-7-9)', he: 'בלי שורש A (3-5-7-9)' },
  'rootless-b': { en: 'Rootless B (7-9-3-5)', he: 'בלי שורש B (7-9-3-5)' },
  close4: { en: 'Four-note close', he: 'ארבעה צלילים צמודים' },
  drop2: { en: 'Drop 2', he: 'דרופ 2' },
  drop3: { en: 'Drop 3', he: 'דרופ 3' },
  open: { en: 'Open / spread (LH 1-7, RH 3-5-9)', he: 'פתוח (יד שמאל 1-7, ימין 3-5-9)' },
  'two-hand': { en: 'Two-handed (LH 3-7, RH 9-5-3)', he: 'שתי ידיים (שמאל 3-7, ימין 9-5-3)' },
  quartal: { en: 'Quartal (fourths)', he: 'קוורטלי (קוורטות)' },
  upper: { en: 'Upper-structure triads', he: 'משולשי Upper structure' },
  block: { en: 'Block chords (locked hands)', he: 'אקורדי בלוק (ידיים נעולות)' },
  'stride-single': { en: 'Stride: single bass', he: 'סטרייד: בס בודד' },
  'stride-octave': { en: 'Stride: octave bass', he: 'סטרייד: בס באוקטבות' },
  'stride-tenth': { en: 'Stride: tenths', he: 'סטרייד: דצימות' },
  'stride-broken': { en: 'Stride: broken tenths', he: 'סטרייד: דצימות שבורות' },
  'stride-walk': { en: 'Stride: walking bass on 3', he: 'סטרייד: בס הולך על 3' },
  'walk-lh': { en: 'Walking bass in the left hand', he: 'בס מהלך ביד שמאל' },
  sowhat1: { en: 'Quartal (So What), variation 1', he: 'קוורטלי (So What), גרסה 1' },
  sowhat2: { en: 'Quartal (So What), variation 2', he: 'קוורטלי (So What), גרסה 2' },
  barron: { en: 'Kenny Barron voicing', he: 'הווייסינג של קני בארון' },
};
export const RHYTHM_NAME: Record<CompRhythm, Bi> = {
  whole: { en: 'One per chord', he: 'אחד לכל אקורד' },
  charleston: { en: 'Charleston', he: 'צ׳רלסטון' },
  reverse: { en: 'Reverse Charleston', he: 'צ׳רלסטון הפוך' },
  garland: { en: 'Red Garland', he: 'רד גרלנד' },
  anticip: { en: 'Anticipation (and of 4)', he: 'הקדמה (ו־4)' },
  four: { en: 'Four to the bar', he: 'ארבע לתיבה' },
  stride: { en: 'Stride (1-2-3-4)', he: 'סטרייד (1-2-3-4)' },
};

export interface ChartRef {
  text: string;
  title: Bi;
  bpm: number;
  /** The chart's tonic as written (when the ref tables don't know it: the cadence library). */
  home?: Home;
}

/** Built-in practice charts that are not cadences (written from C; the drill's key moves them). */
export const CHART_SETS: Record<string, ChartRef> = {
  // every minor 7th chord, round the circle of fifths (C, F, B♭ …): the Kenny Barron voicing on each
  'm7-cycle': {
    text: 'Cm7 | Fm7 | Bbm7 | Ebm7 | Abm7 | Dbm7 | Gbm7 | Bm7 | Em7 | Am7 | Dm7 | Gm7',
    title: { en: 'Minor 7th chords round the circle of fifths', he: 'אקורדי m7 במעגל הקווינטות' },
    bpm: 100,
    home: { key: 0, minor: true },
  },
};

/** Resolve a chart reference. */
export function chartRef(ref: string): ChartRef | null {
  const [k, ...rest] = ref.split(':');
  const id = rest.join(':');
  if (k === 'lv') {
    const l = IMPROV_LEVELS.find((x) => x.id === id);
    return l ? { text: l.text, title: l.title, bpm: l.bpm } : null;
  }
  if (k === 'std') {
    const s = STANDARD_CHANGES.find((x) => x.id === id);
    // a technique drill on a long form takes its first section (the whole tune is for improvising)
    const bars = s ? s.text.split('|') : [];
    const text = bars.length > 16 ? bars.slice(0, 8).join('|') : s?.text;
    return s && text ? { text, title: { en: `${s.name} (${s.part.en})`, he: `${s.name} (${s.part.he})` }, bpm: s.bpm } : null;
  }
  if (k === 'tpl') {
    const t = CHART_TEMPLATES.find((x) => x.id === id);
    return t ? { text: t.text, title: t.title, bpm: t.bpm } : null;
  }
  if (k === 'cad') {
    const c = cadenceById(id);
    return c ? { text: cadencePlayText(c), title: cadenceTitle(c), bpm: c.bpm, home: { key: 0, ...(c.minor ? { minor: true } : {}) } } : null;
  }
  if (k === 'set') return CHART_SETS[id] ?? null;
  if (k === 'txt') {
    try {
      // "title⏎text" (the title is optional)
      const raw = decodeURIComponent(id);
      const nl = raw.indexOf('\n');
      const title = nl > 0 ? raw.slice(0, nl) : '';
      return { text: nl > 0 ? raw.slice(nl + 1) : raw, title: title ? { en: title, he: title } : { en: 'My chart', he: 'המהלך שלי' }, bpm: 100 };
    } catch {
      return null;
    }
  }
  return null;
}
export const chartKind = (ref: string, v: ChartVoicing, r: CompRhythm, m: ChartMode = 'comp') => `chart~${ref}~${v}~${r}~${m}`;
export function parseChartKind(kind: string): { ref: string; voicing: ChartVoicing; rhythm: CompRhythm; mode: ChartMode } | null {
  const p = kind.split('~');
  if (p[0] !== 'chart' || p.length < 5) return null;
  return { ref: p[1], voicing: p[2] as ChartVoicing, rhythm: p[3] as CompRhythm, mode: (p[4] as ChartMode) || 'comp' };
}

// ---------------------------------------------------------------- chord roles

const mod = (n: number, m = 12) => ((n % m) + m) % m;
interface Roles {
  third: number;
  fifth: number;
  seventh: number;
  ninth: number;
  /** 5th, or the 13th on a dominant (rootless voicings). */
  color: number;
  dom: boolean;
  alt: boolean;
}
export function roles(c: { iv: number[] }): Roles {
  const iv = c.iv;
  const has = (x: number) => iv.includes(x);
  // an "11" chord (1-5-♭7-9-11, no 3rd) is a sus chord
  const third = has(3) ? 3 : has(4) ? 4 : has(5) || has(17) ? 5 : has(2) ? 2 : 4;
  const fifth = has(6) && !has(7) ? 6 : has(8) && !has(7) ? 8 : 7;
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : third === 3 ? 10 : 9; // triads become 6 / m7 sounds
  const dom = third === 4 && seventh === 10;
  // altered: a ♯9 or ♭13, or a ♭9 without the natural 13 (a 13♭9 keeps its 13)
  const alt = dom && (has(15) || has(20) || (has(13) && !has(21)));
  const ninth = has(13) ? 13 : has(15) ? 15 : third === 3 && fifth === 6 ? 12 /* m7♭5: the root */ : seventh === 9 && fifth === 6 ? 12 /* dim7 */ : 14;
  // The colour tone (rootless voicings' 5th slot): the chord's own 13 / ♭13 / ♯11 / 11 when the symbol has one; else
  // the 13th on a dominant (♭13 on an altered one) and the 5th on the rest.
  const color = dom
    ? has(21) ? 9 : has(20) ? 8 : has(18) ? 6 : alt ? 8 : 9
    : has(21) && seventh !== 9 ? 9 : has(18) && fifth === 7 ? 6 : has(17) && third === 3 ? 5 : fifth;
  return { third, fifth, seventh, ninth, color, dom, alt };
}

/**
 * The four tones (offsets from the root, inside an octave, rising) of a chord's 4-note form — four-way close, drop 2,
 * drop 3, block: 1-3-5-7 with the symbol's own tensions in place, so none is dropped. A 9th of the symbol (♭9, 9, ♯9)
 * replaces the root (a 7♭9 is 3-5-♭7-♭9, the diminished 7th on its 3rd); a ♯11, ♭13, 13 (or a m11's 11) replaces a
 * perfect 5th (a 7alt is 3-♭13-♭7-♭9). A m7♭5's ♭5 and a dim7's ♭5 and 𝄫7 are chord tones and stay.
 */
export function fourTones(c: { iv: number[] }): number[] {
  const R = roles(c);
  const has = (x: number) => c.iv.includes(x);
  const low = has(13) || has(14) || has(15) ? R.ninth : 0;
  const five = R.fifth !== 7 ? R.fifth : has(20) ? 8 : has(18) ? 6 : has(21) && R.seventh !== 9 ? 9 : has(17) && R.third === 3 ? 5 : 7;
  return [...new Set([low, R.third, five, R.seventh].map((x) => mod(x)))].sort((a, b) => a - b);
}

/** The pitch classes (offsets from the root) a chord's symbol defines beyond its triad and 7th: its altered 9ths,
 * ♯11, ♭13, 13, a m7♭5's / dim7's ♭5 and a dim7's 𝄫7 — no voicing type may leave them out (the shell and guide tones,
 * 1-3-7 and 3-7 by definition, aside). Each entry is a set of alternatives: a 7alt names no particular altered 9th,
 * so its ♭9 or its ♯9 will do (and its ♭13). */
export function definingTones(c: { iv: number[] }): number[][] {
  const R = roles(c);
  const altChord = c.iv.includes(13) && c.iv.includes(15);
  const out: number[][] = c.iv.filter((x) => (x === 13 || x === 15 ? !altChord : x === 18 || x === 20 || x === 21)).map((x) => [mod(x)]);
  if (altChord) out.push([1, 3]);
  if (R.fifth !== 7) out.push([R.fifth]);
  if (R.seventh === 9 && R.fifth === 6) out.push([9]);
  return out;
}
/** Does a set of offsets from the root hold every tone the chord's symbol defines? */
export const keepsDefining = (c: { iv: number[] }, offs: number[]): boolean => definingTones(c).every((g) => g.some((d) => offs.some((x) => mod(x) === d)));

/** Lay pitch offsets (relative to the root pc) into a register: the lowest note lands in [lo, lo + 12). */
function place(root: number, offs: number[], lo: number): number[] {
  const base = offs.map((o) => root + o);
  const low = Math.min(...base);
  const shift = Math.ceil((lo - low) / 12) * 12;
  return base.map((m) => m + shift).sort((a, b) => a - b);
}
/** Of several candidate voicings, the one closest to the previous (sum of nearest-note moves); first when none. */
function nearest(cands: number[][], prev: number[] | null): number[] {
  if (!cands.length) return [];
  if (!prev?.length) return cands[0];
  const cost = (v: number[]) => v.reduce((a, m) => a + Math.min(...prev.map((p) => Math.abs(p - m))), 0) + Math.abs(v[0] - prev[0]) * 0.5;
  return cands.slice().sort((a, b) => cost(a) - cost(b))[0];
}
/** The same offsets one octave down / up as extra candidates (keeps a voicing in range while it moves smoothly). */
const octaves = (v: number[], lo: number, hi: number) => {
  const xs = [v, v.map((m) => m - 12), v.map((m) => m + 12)].filter((x) => x[0] >= lo - 2 && x[x.length - 1] <= hi + 2);
  return xs.length ? xs : [v];
};

export interface Voiced {
  lh: number[];
  rh: number[];
}

const isQ = (c: { iv: number[] }, q: number[]) => c.iv.length === q.length && q.every((x, i) => c.iv[i] === x);
const M7 = [0, 3, 7, 10];
const DOM7 = [0, 4, 7, 10];
const MAJ7 = [0, 4, 7, 11];
const M11 = [0, 3, 7, 10, 14, 17];

/**
 * The So What chord (Wikipedia "So What chord"; thejazzpianosite.com, So What chord lesson): bottom to top three perfect
 * 4ths and a major 3rd, two notes in the left hand and three in the right — on D: D-G / C-F-A, Dm11. In the major
 * ii–V–I (offsets from each chord's root, so it runs in every key):
 *  - variation 1: ii7 = the So What on its root; V7 = the same shape (on the V's 5th), read as V9sus; Imaj7 = the So
 *    What on its 3rd (E-A / D-G-B in C, Cmaj13) — both hands up a step;
 *  - variation 2: ii7 the same; V7 = the open V9 (5-1 / 3-♭7-9: D-G / B-F-A); Imaj7 = the So What on its 7th
 *    (B-E / A-D-F♯, Cmaj13♯11).
 * Only m7, 7 and maj7 have a stated mapping (null for the rest: no minor ii–V, m7♭5 or altered So What is invented).
 */
export function soWhatOffsets(c: { iv: number[] }, variation: 1 | 2): number[] | null {
  if (isQ(c, M7)) return [0, 5, 10, 15, 19];
  if (isQ(c, DOM7)) return variation === 1 ? [7, 12, 17, 22, 26] : [7, 12, 16, 22, 26];
  if (isQ(c, MAJ7)) return variation === 1 ? [4, 9, 14, 19, 23] : [11, 16, 21, 26, 30];
  return null;
}

/**
 * The Kenny Barron voicing (thejazzpianosite.com, jazztutorial.com, learnjazzpiano.com, pianowithjonny.com): a stack of
 * fifths in each hand, six notes — LH root, 5th, 9th; RH ♭3, ♭7, 11, starting a half step above the LH's top note
 * (Cm11: C-G-D / E♭-B♭-F), on m7 / m11 chords. The major variant keeps the LH and builds the RH from the major 3rd:
 * maj7♯11 (C-G-D / E-B-F♯), used here on a maj7. Null on any other chord (the sources cover no other).
 */
export function barronOffsets(c: { iv: number[] }): number[] | null {
  if (isQ(c, M7) || isQ(c, M11)) return [0, 7, 14, 15, 22, 29];
  if (isQ(c, MAJ7)) return [0, 7, 14, 16, 23, 30];
  return null;
}

/** One chord as a voicing (absolute MIDI), led smoothly from the previous one. */
export function voice(c: ChartChordEv, v: ChartVoicing, prev: Voiced | null): Voiced {
  const R = roles(c);
  const r = c.root;
  const { third: T, seventh: S, ninth: N, color: X, fifth: F } = R;
  const lhOnly = (cands: number[][]): Voiced => ({ lh: nearest(cands.flatMap((x) => octaves(x, 48, 67)), prev?.lh ?? null), rh: [] });
  switch (v) {
    case 'shell':
      return lhOnly([place(r, [0, T, S], 40), place(r, [0, S, T + 12], 40)]);
    case 'guide':
      return lhOnly([place(r, [T, S], 52), place(r, [S, T + 12], 52)]);
    case 'rootless-a':
      return lhOnly([place(r, [T, X, S, N], 50)]);
    case 'rootless-b':
      return lhOnly([place(r, [S, N, T + 12, X + 12], 50)]);
    case 'rootless':
      return lhOnly([place(r, [T, X, S, N], 50), place(r, [S, N, T + 12, X + 12], 50)]);
    case 'quartal': {
      // stacked fourths inside the chord-scale, from the first of 9, 3, 5, 1 (then the scale's other tones) that gives
      // perfect fourths holding every tone the symbol defines (a m7♭5's ♭5, a 7♭9's ♭9); else rootless A
      const scale = MODE_STEPS[autoScale(c.iv)].map((x) => x % 12);
      for (const start of [...new Set([N % 12, T, F, 0, ...scale])]) {
        const notes = [start];
        let ok = true;
        for (let k = 0; k < 3 && ok; k++) {
          const next = notes[notes.length - 1] + 5;
          if (scale.includes(mod(next))) notes.push(next);
          else ok = false;
        }
        if (ok && keepsDefining(c, notes)) return lhOnly([place(r, notes, 50)]);
      }
      return lhOnly([place(r, [T, X, S, N], 50)]);
    }
    case 'close4': {
      const pcs = fourTones(c);
      const inv = [0, 1, 2, 3].map((k) => place(r, [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)], 57));
      return { lh: [], rh: nearest(inv.flatMap((x) => octaves(x, 55, 79)), prev?.rh ?? null) };
    }
    case 'drop2':
    case 'drop3': {
      const pcs = fourTones(c);
      const inv = [0, 1, 2, 3].map((k) => place(r, [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)], 60));
      const dropped = inv.map((cl) => {
        const top = cl.slice().sort((a, b) => b - a);
        const d = v === 'drop2' ? top[1] : top[2];
        return cl.map((m) => (m === d ? m - 12 : m)).sort((a, b) => a - b);
      });
      const pick = nearest(dropped.flatMap((x) => octaves(x, 48, 79)), prev ? [...prev.lh, ...prev.rh] : null);
      return { lh: [pick[0]], rh: pick.slice(1) };
    }
    case 'open': {
      const lh = nearest([place(r, [0, S], 40), place(r, [0, S], 40).map((m) => m + 12)].filter((x) => x[0] <= 52), prev?.lh ?? null);
      const rh = nearest(octaves(place(r, [T, X > 12 ? X - 12 : X, N], 60), 58, 79), prev?.rh ?? null);
      return { lh, rh };
    }
    case 'two-hand': {
      const lh = nearest([place(r, [T, S], 50), place(r, [S, T + 12], 50)], prev?.lh ?? null);
      // The hands never share a key (in some keys the LH's 3rd lands on the RH's): such a placement is left out.
      const cands = octaves(place(r, [N, X + 12, T + 12], 60), 60, 82);
      const apart = cands.filter((v) => !v.some((m) => lh.includes(m)));
      const rh = nearest(apart.length ? apart : cands.map((v) => v.map((m) => (lh.includes(m) ? m + 12 : m)).sort((a, b) => a - b)), prev?.rh ?? null);
      return { lh, rh };
    }
    case 'upper': {
      // LH guide tones; RH a triad that colours the chord: II (9, ♯11, 13) on dominants, ♭VI (♭13, 1, ♯9) on altered,
      // II on maj7 (lydian), IV on m7 (dorian 11-13-1), ♭III on m7♭5; VI (13, ♭9, 3) on a 13♭9, ♭V (♯11, ♭7, ♭9) on a
      // 7♭9, the diminished triad on the ♭3 of a dim7. A chord whose tones these leave out is voiced two-handed.
      const lh = nearest([place(r, [T, S], 50), place(r, [S, T + 12], 50)], prev?.lh ?? null);
      const has = (x: number) => c.iv.includes(x);
      const tri =
        R.dom && has(13) && has(21) ? [9, 13, 16]
        : R.dom && has(13) && !has(15) && !has(20) ? [6, 10, 13]
        : R.alt ? [8, 12, 15] : R.dom ? [2, 6, 9] : T === 4 ? [2, 6, 9] : F === 6 && S === 9 ? [3, 6, 9] : F === 6 ? [3, 6, 10] : [5, 9, 12];
      if (!keepsDefining(c, [T, S, ...tri])) return voice(c, 'two-hand', prev);
      const rh = nearest(octaves(place(r, tri, 62), 60, 82), prev?.rh ?? null);
      return { lh, rh };
    }
    case 'sowhat1':
    case 'sowhat2':
    case 'barron': {
      // a fixed two-handed shape (So What: 2 + 3 notes; Barron: 3 + 3), moved whole by octaves to lead smoothly
      const offs = v === 'barron' ? barronOffsets(c) : soWhatOffsets(c, v === 'sowhat1' ? 1 : 2);
      // a chord the shape has no stated form for: the dominant of a Barron ii–V–I in two hands (LH 3-7, RH 9-5-3)
      if (!offs) return voice(c, v === 'barron' ? 'two-hand' : 'rootless', prev);
      const nL = v === 'barron' ? 3 : 2;
      const base = place(r, offs, v === 'barron' ? 41 : 45);
      const cands = [base, base.map((m) => m - 12), base.map((m) => m + 12)].filter((x) => x[0] >= 40 && x[x.length - 1] <= 86);
      const pick = nearest(cands.length ? cands : [base], prev ? [...prev.lh, ...prev.rh] : null);
      return { lh: pick.slice(0, nL), rh: pick.slice(nL) };
    }
    case 'block': {
      // locked hands: a close 4-note chord in the RH with its top note doubled an octave lower in the LH
      const pcs = fourTones(c);
      const inv = [0, 1, 2, 3].map((k) => place(r, [...pcs.slice(k), ...pcs.slice(0, k).map((x) => x + 12)], 64));
      const rh = nearest(inv.flatMap((x) => octaves(x, 62, 84)), prev?.rh ?? null);
      return { lh: [rh[rh.length - 1] - 12], rh };
    }
    default:
      return lhOnly([place(r, [0, T, S], 40)]);
  }
}

// ---------------------------------------------------------------- the drill events

export interface ChartEv {
  beat: number;
  dur: number;
  notes: { pitch: number; hand: Hand; accent?: boolean }[];
  required: number[];
  allowed: number[];
}
export interface ChartDrillData {
  title: Bi;
  evs: ChartEv[];
  meter: number;
  startBpm: number;
  /** Notes at or above this pitch are the free right hand (improv mode): not graded as notes. */
  freeAbove?: number;
  /** The chart in the drill's key (for the right-hand check and the chart line). */
  text: string;
  /** The key the drill is in (the chart's home moved by the drill's key offset). */
  tonic: Home;
}

const HITS: Record<Exclude<CompRhythm, 'stride' | 'whole'>, number[]> = { charleston: [0, 1.5], reverse: [0.5, 2], garland: [1.5, 3.5], anticip: [0, 3.5], four: [0, 1, 2, 3] };

/** Build the events for a chart drill in key offset `key` (semitones from the chart as written). */
export function chartDrillData(kind: string, key: number): ChartDrillData | null {
  const k = parseChartKind(kind);
  if (!k) return null;
  const ref = chartRef(k.ref);
  if (!ref) return null;
  const meter = 4;
  const parsed0 = parseChart(ref.text, meter);
  if (!parsed0.chords.length) return null;
  const tonic = moved(ref.home ?? refHome(k.ref, ref.text), key);
  const chords = parsed0.chords.map((c) => ({ ...c, root: mod(c.root + key), bass: mod(c.bass + key) }));
  const bars = parsed0.bars;
  const stride = k.voicing.startsWith('stride');
  const evs: ChartEv[] = [];
  let prev: Voiced | null = null;
  const chordAt = (beat: number) => {
    let cur = chords[0];
    for (const c of chords) if (c.bar * meter + c.at <= beat + 1e-6) cur = c;
    return cur;
  };
  const pcsOf = (c: ChartChordEv) => c.iv.map((x) => mod(c.root + x));
  const allowOf = (c: ChartChordEv) => {
    const scale = MODE_STEPS[autoScale(c.iv)].map((x) => mod(c.root + x));
    return [...new Set([...pcsOf(c), ...scale])];
  };
  const push = (beat: number, dur: number, c: ChartChordEv, pitches: { pitch: number; hand: Hand }[], req?: number[]) => {
    if (!pitches.length) return;
    evs.push({ beat, dur, notes: pitches.map((p, i) => ({ ...p, accent: i === pitches.length - 1 })), required: req ?? [...new Set(pitches.map((p) => mod(p.pitch)))], allowed: [...new Set([...allowOf(c), ...pitches.map((p) => mod(p.pitch))])] });
  };
  const lowRoot = (pc: number, lo = 36) => lo + mod(pc - lo);

  if (k.voicing === 'walk-lh') {
    // Walking bass in the left hand, a note a beat: each chord's root (its slash bass) on its first beat, then its 3rd
    // and 5th, and on the beat before the next chord a half step from that chord's root (from the side the line is on).
    let last = 0;
    for (let b = 0; b < bars * meter; b++) {
      const c = chordAt(b);
      const nx = chordAt(b + 1);
      const R = roles(c);
      const root = lowRoot(c.bass);
      const pos = b - (c.bar * meter + c.at);
      let p: number;
      if (pos < 1e-6) p = root;
      else if (nx !== c && b + 1 < bars * meter) {
        const tgt = lowRoot(nx.bass);
        p = last > tgt ? tgt + 1 : tgt - 1;
      } else p = root + ([R.third, R.fifth, R.third][Math.min(2, Math.round(pos) - 1)] ?? R.third);
      last = p;
      push(b, 1, c, [{ pitch: p, hand: 'L' }], [mod(p)]);
    }
  } else if (stride) {
    // Stride: bass on 1 and 3, a chord in the middle register on 2 and 4.
    for (let b = 0; b < bars * meter; b++) {
      const c = chordAt(b);
      const nx = chordAt(b + 1);
      const pos = b % meter;
      const R = roles(c);
      if (pos % 2 === 0) {
        // tenths need a low root so the 10th stays under middle C
        const root = lowRoot(c.bass, k.voicing === 'stride-tenth' || k.voicing === 'stride-broken' ? 33 : 36);
        let bass: number[];
        const fifthBelow = lowRoot(mod(c.root + R.fifth), 31);
        const onThree = pos === 2;
        switch (k.voicing) {
          case 'stride-octave':
            bass = onThree ? [fifthBelow, fifthBelow + 12] : [root - 12 >= 28 ? root - 12 : root, root - 12 >= 28 ? root : root + 12];
            break;
          case 'stride-tenth':
            bass = onThree ? [fifthBelow, fifthBelow + mod(R.third - R.fifth)] : [root, root + 12 + R.third];
            break;
          case 'stride-broken': {
            const ten = onThree ? [fifthBelow] : [root, root + 12 + R.third];
            push(b, 0.5, c, [{ pitch: ten[0], hand: 'L' }], [mod(ten[0])]);
            if (ten[1]) push(b + 0.5, 0.5, c, [{ pitch: ten[1], hand: 'L' }], [mod(ten[1])]);
            continue;
          }
          case 'stride-walk':
            bass = onThree ? [lowRoot(mod(nx.root + (nx === c ? 7 : -1)), 31)] : [root];
            break;
          default:
            bass = onThree ? [fifthBelow] : [root];
        }
        push(b, 1, c, bass.map((p) => ({ pitch: p, hand: 'L' as Hand })), [...new Set(bass.map((p) => mod(p)))]);
      } else {
        // the stride chord: 3-5-7 between G3 and E4, close — with the symbol's tensions in place (fourTones less the
        // root): a 9th pushes the 5th out (a 7♭9 is 3-♭7-♭9), a ♭13 / ♯11 replaces it
        const ft = fourTones(c).filter((x) => x !== 0);
        const chord = place(c.root, ft.length > 3 && ft.includes(7) ? ft.filter((x) => x !== 7) : ft, 52);
        push(b, 1, c, chord.map((p) => ({ pitch: p, hand: 'L' as Hand })));
      }
    }
  } else {
    // Comping: hits per bar in the rhythm; every chord gets at least one hit; an anticipation sounds the next chord.
    const voiced = new Map<ChartChordEv, Voiced>();
    for (const c of chords) {
      const v = voice(c, k.voicing, prev);
      voiced.set(c, v);
      prev = v;
    }
    const hits: { beat: number; c: ChartChordEv }[] = [];
    for (let bar = 0; bar < bars; bar++) {
      const inBar = chords.filter((c) => c.bar === bar);
      if (k.rhythm === 'whole') for (const c of inBar) hits.push({ beat: bar * meter + c.at, c });
      else {
        for (const h of HITS[k.rhythm as keyof typeof HITS]) {
          const beat = bar * meter + h;
          const ant = k.rhythm === 'anticip' && h === 3.5 && bar < bars - 1;
          hits.push({ beat, c: ant ? chordAt((bar + 1) * meter) : chordAt(beat) });
        }
        for (const c of inBar) if (!hits.some((x) => x.c === c)) hits.push({ beat: bar * meter + c.at, c });
      }
    }
    hits.sort((a, b) => a.beat - b.beat);
    hits.forEach((h, i) => {
      const next = hits[i + 1]?.beat ?? bars * meter;
      const v = voiced.get(h.c)!;
      const pitches = [...v.lh.map((p) => ({ pitch: p, hand: 'L' as Hand })), ...(k.mode === 'improv' ? [] : v.rh.map((p) => ({ pitch: p, hand: 'R' as Hand })))];
      push(h.beat, Math.max(0.5, Math.min(next - h.beat, k.rhythm === 'four' ? 0.9 : 4)), h.c, pitches);
    });
  }
  const text = chords
    .reduce<string[][]>((acc, c) => {
      (acc[c.bar] ??= []).push(transposeSymIn(c.sym, key, tonic));
      return acc;
    }, [])
    .map((b) => (b ?? []).join(' '))
    .join(' | ');
  const vt = VOICING_NAME[k.voicing];
  const rt = stride ? RHYTHM_NAME.stride : RHYTHM_NAME[k.rhythm];
  const nm = nameInKey(ref.title, tonic);
  return {
    tonic,
    title: { en: `${nm.en} · ${vt.en} · ${rt.en}${k.mode === 'improv' ? ' · RH improvises' : ''}`, he: `${nm.he} · ${vt.he} · ${rt.he}${k.mode === 'improv' ? ' · יד ימין מאלתרת' : ''}` },
    evs,
    meter,
    startBpm: Math.max(50, Math.round(ref.bpm * 0.55)),
    // the right hand starts just above the left hand's highest note (never below middle C)
    ...(k.mode === 'improv' ? { freeAbove: Math.max(60, ...evs.flatMap((e) => e.notes.map((n) => n.pitch + 1))) } : {}),
    text,
  };
}

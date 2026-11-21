// "Know the key" (owner 2026-11-21): the facts of a key page, spelled right in every key — the key signature, the
// scale, the chord on each degree, the ii–V–I, the 6th-diminished, the relative / parallel keys, the modes on the root
// with their parent scales, the symmetric scales — and a three-question warm-up. Standard theory only; pure.

import { keyName } from './drills/generate';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const mod = (n: number, m = 12) => ((n % m) + m) % m;
const ACC: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

/** Spell a heptatonic scale from a tonic name ("D♭") and its intervals: one letter per degree. */
export function spellScale(tonic: string, ints: number[]): string[] {
  const li = LETTERS.indexOf(tonic[0]);
  const tAcc = tonic.slice(1) === '♭' ? -1 : tonic.slice(1) === '♯' ? 1 : 0;
  const tpc = mod(NATURAL[li] + tAcc);
  return ints.map((iv, k) => {
    const l = (li + k) % 7;
    let d = mod(tpc + iv - NATURAL[l]);
    if (d > 6) d -= 12;
    return LETTERS[l] + (ACC[d] ?? '?');
  });
}

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
export const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
export const MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11];

/** Sharps (+) or flats (−) in the key signature of a scale spelling. */
export const signature = (notes: string[]): number => notes.reduce((n, x) => n + (x.includes('♯') ? 1 : x.includes('♭') ? -1 : 0), 0);

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });

/** The tonic name of a page: majors with the usual flats (D♭, G♭), minors with the usual sharps (C♯, F♯, G♯). */
export const tonicOf = (root: number, minor: boolean): string => keyName(root, minor);

export interface KeyFacts {
  name: string;
  signature: number;
  notes: string[];
  /** Further scales (minor: harmonic and melodic). */
  more: { name: T2; notes: string[] }[];
  /** The chord on each degree. */
  chords: string[];
  cadence: string;
  /** The 6th-diminished (Harris, docs/BARRY-HARRIS-THEORY.md): the tonic 6th chord and the diminished on the 7th. */
  sixDim: string;
  relative: { root: number; minor: boolean; name: string };
  parallel: { root: number; minor: boolean; name: string };
}

const SEVENTHS_MAJOR = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7♭5'];
const SEVENTHS_MINOR = ['m7', 'm7♭5', 'maj7', 'm7', 'm7', 'maj7', '7'];

/** The facts of a major or minor key page. */
export function keyFacts(root: number, minor: boolean): KeyFacts {
  const tonic = tonicOf(root, minor);
  if (!minor) {
    const n = spellScale(tonic, MAJOR);
    const rel = mod(root + 9);
    return {
      name: tonic,
      signature: signature(n),
      notes: n,
      more: [],
      chords: n.map((x, k) => x + SEVENTHS_MAJOR[k]),
      cadence: `${n[1]}m7 – ${n[4]}7 – ${n[0]}maj7`,
      sixDim: `${n[0]}6 + ${n[6]}°7`,
      relative: { root: rel, minor: true, name: `${tonicOf(rel, true)}m` },
      parallel: { root, minor: true, name: `${tonicOf(root, true)}m` },
    };
  }
  const nat = spellScale(tonic, NATURAL_MINOR);
  const harm = spellScale(tonic, HARMONIC_MINOR);
  const mel = spellScale(tonic, MELODIC_MINOR);
  const rel = mod(root + 3);
  return {
    name: `${tonic}m`,
    signature: signature(nat),
    notes: nat,
    more: [
      { name: t('harmonic minor', 'מינור הרמוני'), notes: harm },
      { name: t('melodic minor', 'מינור מלודי'), notes: mel },
    ],
    // the natural-minor 7ths, with the dominant V7 of harmonic minor (the chord that makes the cadence)
    chords: nat.map((x, k) => (k === 4 ? `${harm[4]}7` : x + SEVENTHS_MINOR[k])),
    cadence: `${nat[1]}m7♭5 – ${harm[4]}7♭9 – ${nat[0]}m6`,
    sixDim: `${nat[0]}m6 + ${harm[6]}°7`,
    relative: { root: rel, minor: false, name: tonicOf(rel, false) },
    parallel: { root, minor: false, name: tonicOf(root, false) },
  };
}

/** The modes of melodic and harmonic minor on a root, each with its parent scale (standard names). */
export function minorModesOn(root: number): { name: T2; notes: string[]; parent: string }[] {
  const tonic = tonicOf(root, false);
  const MM: [number, T2][] = [
    [1, t('dorian ♭2', 'דורי ♭2')],
    [2, t('lydian augmented', 'לידי מוגדל')],
    [3, t('lydian dominant', 'לידי דומיננטי')],
    [4, t('mixolydian ♭6', 'מיקסולידי ♭6')],
    [5, t('locrian ♮2', 'לוקרי ♮2')],
    [6, t('altered', 'אלטרד')],
  ];
  const HM: [number, T2][] = [
    [1, t('locrian ♮6', 'לוקרי ♮6')],
    [2, t('ionian ♯5', 'יוני ♯5')],
    [3, t('dorian ♯4', 'דורי ♯4')],
    [4, t('phrygian dominant', 'פריגי דומיננטי')],
    [5, t('lydian ♯2', 'לידי ♯2')],
    [6, t('altered ♭♭7', 'אלטרד ♭♭7')],
  ];
  const out: { name: T2; notes: string[]; parent: string }[] = [];
  for (const [scale, list, pName] of [[MELODIC_MINOR, MM, t('melodic minor', 'מינור מלודי')], [HARMONIC_MINOR, HM, t('harmonic minor', 'מינור הרמוני')]] as const) {
    for (const [deg, name] of list) {
      // the parent's tonic: the root minus the degree's interval in the parent scale
      const pRoot = mod(root - scale[deg]);
      // the parent's name as usually written (D♭ melodic minor for C altered)
      const pTonic = keyName(pRoot);
      // the mode spelled from the page's root, one letter per degree (C altered: C D♭ E♭ F♭ G♭ A♭ B♭)
      const ints = [...scale.slice(deg), ...scale.slice(0, deg).map((x) => x + 12)].map((x) => x - scale[deg]);
      const notes = spellScale(tonic, ints);
      out.push({ name: { en: `${tonic} ${name.en}`, he: `${tonic} ${name.he}` }, notes, parent: `${pTonic} ${pName.en}|${pTonic} ${pName.he}` });
    }
  }
  return out;
}

/** A three-question warm-up for a key page: signature, the V7, a degree. Deterministic per key and day. */
export interface KeyQuestion {
  q: T2;
  options: string[];
  answer: string;
}
export function keyQuiz(root: number, minor: boolean, seed = 0): KeyQuestion[] {
  const f = keyFacts(root, minor);
  const sig = (n: number) => (n === 0 ? '0' : n > 0 ? `${n}♯` : `${-n}♭`);
  const sigOpts = [...new Set([f.signature, f.signature + 1, f.signature - 1, -f.signature || 2].map(sig))];
  const v7 = f.chords[4];
  const v7Opts = [...new Set([v7, `${f.notes[3]}7`, `${f.notes[1]}7`, `${f.notes[5]}7`])];
  const deg = [2, 5, 6][seed % 3];
  const degName = [, , t('3rd', 'השלישית'), , , t('6th', 'השישית'), t('7th', 'השביעית')][deg]!;
  const degOpts = [...new Set([f.notes[deg], f.notes[(deg + 1) % 7], f.notes[(deg + 6) % 7], f.notes[(deg + 3) % 7]])];
  const rot = <T,>(xs: T[], k: number) => [...xs.slice(k % xs.length), ...xs.slice(0, k % xs.length)];
  return [
    { q: t(`How many sharps or flats in ${f.name}?`, `כמה דיאזים או במולים ב־${f.name}?`), options: rot(sigOpts, seed + 1), answer: sig(f.signature) },
    { q: t(`The V7 of ${f.name}?`, `ה־V7 של ${f.name}?`), options: rot(v7Opts, seed + 2), answer: v7 },
    { q: t(`The ${degName.en} degree of ${f.name}?`, `הדרגה ${degName.he} של ${f.name}?`), options: rot(degOpts, seed), answer: f.notes[deg] },
  ];
}

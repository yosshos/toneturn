// AUDIT-7 #11 (docs/research/AUDIT-7-GAPS.md §1): graded classical repertoire on the keys — a public-domain tier, played
// through the piece coach (SPEC-PIECE) and as the k-classic ladder on the keys path.
//
// LEGAL (docs/research/MUSIC_SOURCES_LEGAL.md): only works that are public domain worldwide — the composer died more
// than 70 years ago (life + 70 is the longest common term) — and only OUR OWN engraving: every note below was written
// here from the music itself, not copied from a modern edition (an edition's editorial layer can carry its own
// copyright). Fingerings, dynamics and editorial marks are left out on purpose. `tests/audit7.test.ts` checks the list.
//
// Note text: bars separated by "|", events by spaces; an event is "<pitch>[+<pitch>…]/<length>" or "r/<length>", the
// length in the piece's beat unit (a quarter, or an eighth for x/8 metres). Every bar must fill its metre exactly (the
// parser throws otherwise), so a mistyped length cannot slip in. Pure data + a small parser.

import type { Piece, PieceBar, PieceNote } from '../engine/piece/score';

type Bi = { en: string; he: string };

export interface PdPiece {
  /** Lowercase id (item ids, result ids). */
  id: string;
  title: Bi;
  composer: Bi;
  born: number;
  died: number;
  /** Catalogue number (Latin, shown in <bdi>). */
  work: string;
  /** Which bars are here (an excerpt says so). */
  excerpt: Bi;
  /** Roughly the ABRSM grade of the excerpt as written here. */
  grade: number;
  /** Beats a bar, in `unit` notes. */
  meter: number;
  unit: 4 | 8;
  /** Key signature (fifths, −7…7) and the tonic pitch class. */
  fifths: number;
  tonic: number;
  minor?: boolean;
  /** Performance tempo (beats a minute, in `unit` notes). */
  tempo: number;
  /** Our own engraving (the only edition allowed here). */
  edition: 'own';
  /** A simple arrangement of a public-domain melody (the left hand is ours), not the composer's own texture. */
  arrangement?: boolean;
  /** The first bar is an upbeat bar, written whole with rests and numbered 0. */
  pickup?: boolean;
  /** Practice sections (bar indexes, inclusive): the ladder plays them one by one. */
  sections: { name: Bi; from: number; to: number }[];
  /** Voices of each hand (bars separated by "|"). */
  rh: string[];
  lh: string[];
}

// ───────────────────────────── J. S. Bach, Prelude in C (bars 1–19), generated from its chords ─────────────────────────────

/** WTC I, Prelude 1, bars 1–19: each bar's five notes (two in the left hand, three in the right), lowest first. */
export const PRELUDE_C_CHORDS: string[][] = [
  ['C4', 'E4', 'G4', 'C5', 'E5'],
  ['C4', 'D4', 'A4', 'D5', 'F5'],
  ['B3', 'D4', 'G4', 'D5', 'F5'],
  ['C4', 'E4', 'G4', 'C5', 'E5'],
  ['C4', 'E4', 'A4', 'E5', 'A5'],
  ['C4', 'D4', 'F#4', 'A4', 'D5'],
  ['B3', 'D4', 'G4', 'D5', 'G5'],
  ['B3', 'C4', 'E4', 'G4', 'C5'],
  ['A3', 'C4', 'E4', 'G4', 'C5'],
  ['D3', 'A3', 'D4', 'F#4', 'C5'],
  ['G3', 'B3', 'D4', 'G4', 'B4'],
  ['G3', 'Bb3', 'E4', 'G4', 'C#5'],
  ['F3', 'A3', 'D4', 'A4', 'D5'],
  ['F3', 'Ab3', 'D4', 'F4', 'B4'],
  ['E3', 'G3', 'C4', 'G4', 'C5'],
  ['E3', 'F3', 'A3', 'C4', 'F4'],
  ['D3', 'F3', 'A3', 'C4', 'F4'],
  ['G2', 'D3', 'G3', 'B3', 'F4'],
  ['C3', 'E3', 'G3', 'C4', 'E4'],
];
/** The prelude's figure, twice a bar: n1 held (a half), n2 from the second 16th, n3 n4 n5 n3 n4 n5 in the right hand. */
const preludeVoices = (): { rh: string; lh1: string; lh2: string } => {
  const half = (c: string[]) => ({ rh: `r/0.5 ${[c[2], c[3], c[4], c[2], c[3], c[4]].map((p) => `${p}/0.25`).join(' ')}`, lh1: `${c[0]}/2`, lh2: `r/0.25 ${c[1]}/1.75` });
  const bars = PRELUDE_C_CHORDS.map((c) => {
    const h = half(c);
    return { rh: `${h.rh} ${h.rh}`, lh1: `${h.lh1} ${h.lh1}`, lh2: `${h.lh2} ${h.lh2}` };
  });
  return { rh: bars.map((b) => b.rh).join(' | '), lh1: bars.map((b) => b.lh1).join(' | '), lh2: bars.map((b) => b.lh2).join(' | ') };
};
const PRE = preludeVoices();

// ───────────────────────────── the list (graded) ─────────────────────────────

export const PD_PIECES: PdPiece[] = [
  {
    id: 'ode-to-joy',
    title: { en: 'Ode to Joy (theme)', he: 'אודה לשמחה (הנושא)' },
    composer: { en: 'Ludwig van Beethoven', he: 'לודוויג ון בטהובן' },
    born: 1770,
    died: 1827,
    work: 'Op. 125',
    excerpt: { en: 'the theme, 8 bars, in C; our left hand', he: 'הנושא, 8 תיבות, בדו מז׳ור; יד שמאל שלנו' },
    grade: 1,
    meter: 4,
    unit: 4,
    fifths: 0,
    tonic: 0,
    tempo: 96,
    edition: 'own',
    arrangement: true,
    sections: [
      { name: { en: 'bars 1–4', he: 'תיבות 1–4' }, from: 0, to: 3 },
      { name: { en: 'bars 5–8', he: 'תיבות 5–8' }, from: 4, to: 7 },
    ],
    rh: ['E4/1 E4/1 F4/1 G4/1 | G4/1 F4/1 E4/1 D4/1 | C4/1 C4/1 D4/1 E4/1 | E4/1.5 D4/0.5 D4/2 | E4/1 E4/1 F4/1 G4/1 | G4/1 F4/1 E4/1 D4/1 | C4/1 C4/1 D4/1 E4/1 | D4/1.5 C4/0.5 C4/2'],
    lh: ['C3/4 | G2/4 | C3/4 | G2/4 | C3/4 | G2/4 | C3/2 G2/2 | G2/2 C3/2'],
  },
  {
    id: 'minuet-g',
    title: { en: 'Minuet in G', he: 'מינואט בסול מז׳ור' },
    composer: { en: 'Christian Petzold', he: 'כריסטיאן פצולד' },
    born: 1677,
    died: 1733,
    work: 'BWV Anh. 114',
    excerpt: { en: 'bars 1–16 (the first half)', he: 'תיבות 1–16 (החצי הראשון)' },
    grade: 1,
    meter: 3,
    unit: 4,
    fifths: 1,
    tonic: 7,
    tempo: 112,
    edition: 'own',
    sections: [
      { name: { en: 'bars 1–8', he: 'תיבות 1–8' }, from: 0, to: 7 },
      { name: { en: 'bars 9–16', he: 'תיבות 9–16' }, from: 8, to: 15 },
    ],
    rh: [
      'D5/1 G4/0.5 A4/0.5 B4/0.5 C5/0.5 | D5/1 G4/1 G4/1 | E5/1 C5/0.5 D5/0.5 E5/0.5 F#5/0.5 | G5/1 G4/1 G4/1 | C5/1 D5/0.5 C5/0.5 B4/0.5 A4/0.5 | B4/1 C5/0.5 B4/0.5 A4/0.5 G4/0.5 | F#4/1 G4/0.5 A4/0.5 B4/0.5 G4/0.5 | A4/3 | ' +
        'D5/1 G4/0.5 A4/0.5 B4/0.5 C5/0.5 | D5/1 G4/1 G4/1 | E5/1 C5/0.5 D5/0.5 E5/0.5 F#5/0.5 | G5/1 G4/1 G4/1 | C5/1 D5/0.5 C5/0.5 B4/0.5 A4/0.5 | B4/1 C5/0.5 B4/0.5 A4/0.5 G4/0.5 | A4/1 B4/0.5 A4/0.5 G4/0.5 F#4/0.5 | G4/3',
    ],
    lh: ['G3+B3+D4/2 A3/1 | B3/3 | C4/3 | B3/3 | A3/3 | G3/3 | D4/1 B3/1 G3/1 | D4/1 D3/0.5 C4/0.5 B3/0.5 A3/0.5 | B3/2 A3/1 | G3/1 B3/1 G3/1 | C4/3 | B3/1 C4/0.5 B3/0.5 A3/0.5 G3/0.5 | A3/2 F#3/1 | G3/2 B3/1 | C4/1 D4/1 D3/1 | G3/2 G2/1'],
  },
  {
    id: 'fur-elise',
    title: { en: 'Für Elise (opening)', he: 'לאליזה (הפתיחה)' },
    composer: { en: 'Ludwig van Beethoven', he: 'לודוויג ון בטהובן' },
    born: 1770,
    died: 1827,
    work: 'WoO 59',
    excerpt: { en: 'the upbeat and bars 1–8', he: 'הקדמה ותיבות 1–8' },
    grade: 3,
    meter: 3,
    unit: 8,
    fifths: 0,
    tonic: 9,
    minor: true,
    tempo: 120,
    edition: 'own',
    pickup: true,
    sections: [
      { name: { en: 'upbeat to bar 4', he: 'הקדמה עד תיבה 4' }, from: 0, to: 4 },
      { name: { en: 'bars 5–8', he: 'תיבות 5–8' }, from: 5, to: 8 },
    ],
    rh: [
      'r/2 E5/0.5 D#5/0.5 | E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 | A4/1 r/0.5 C4/0.5 E4/0.5 A4/0.5 | B4/1 r/0.5 E4/0.5 G#4/0.5 B4/0.5 | C5/1 r/0.5 E4/0.5 E5/0.5 D#5/0.5 | ' +
        'E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 | A4/1 r/0.5 C4/0.5 E4/0.5 A4/0.5 | B4/1 r/0.5 E4/0.5 C5/0.5 B4/0.5 | A4/1 r/2',
    ],
    lh: ['r/3 | r/3 | A2/0.5 E3/0.5 A3/0.5 r/1.5 | E2/0.5 E3/0.5 G#3/0.5 r/1.5 | A2/0.5 E3/0.5 A3/0.5 r/1.5 | r/3 | A2/0.5 E3/0.5 A3/0.5 r/1.5 | E2/0.5 E3/0.5 G#3/0.5 r/1.5 | A2/0.5 E3/0.5 A3/0.5 r/1.5'],
  },
  {
    id: 'prelude-c',
    title: { en: 'Prelude in C', he: 'פרלוד בדו מז׳ור' },
    composer: { en: 'Johann Sebastian Bach', he: 'יוהאן סבסטיאן באך' },
    born: 1685,
    died: 1750,
    work: 'BWV 846',
    excerpt: { en: 'bars 1–19', he: 'תיבות 1–19' },
    grade: 5,
    meter: 4,
    unit: 4,
    fifths: 0,
    tonic: 0,
    tempo: 66,
    edition: 'own',
    sections: [
      { name: { en: 'bars 1–11', he: 'תיבות 1–11' }, from: 0, to: 10 },
      { name: { en: 'bars 12–19', he: 'תיבות 12–19' }, from: 11, to: 18 },
    ],
    rh: [PRE.rh],
    lh: [PRE.lh1, PRE.lh2],
  },
];

/** The year a work became public domain everywhere a life + 70 term applies (the first 1 January after +70). */
export const pdFrom = (p: Pick<PdPiece, 'died'>): number => p.died + 71;
/** Public domain worldwide in `year` (and only our own engraving). */
export const isPdWorldwide = (p: Pick<PdPiece, 'died' | 'edition'>, year: number): boolean => p.edition === 'own' && pdFrom(p) <= year;

// ───────────────────────────── the parser ─────────────────────────────

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "F#4" → 66, "Bb3" → 58. */
export function midiOf(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad pitch "${name}"`);
  return 12 * (Number(m[3]) + 1) + STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** One voice → notes (beat = unit beats from the start), checking every bar fills the metre. */
export function parseVoice(src: string, meter: number, hand: 'R' | 'L', id = ''): { midi: number; start: number; dur: number; bar: number; hand: 'R' | 'L' }[] {
  const out: { midi: number; start: number; dur: number; bar: number; hand: 'R' | 'L' }[] = [];
  src.split('|').forEach((bar, bi) => {
    let at = 0;
    for (const ev of bar.trim().split(/\s+/)) {
      const [ps, len] = ev.split('/');
      const d = Number(len);
      if (!(d > 0)) throw new Error(`${id} bar ${bi + 1}: bad length in "${ev}"`);
      if (ps !== 'r') for (const p of ps.split('+')) out.push({ midi: midiOf(p), start: bi * meter + at, dur: d, bar: bi, hand });
      at += d;
    }
    if (Math.abs(at - meter) > 1e-6) throw new Error(`${id} bar ${bi + 1}: ${at} beats, the metre has ${meter}`);
  });
  return out;
}

/** All notes of a piece (both hands, every voice), sorted. */
export function pdNotes(p: PdPiece): { midi: number; start: number; dur: number; bar: number; hand: 'R' | 'L' }[] {
  return [...p.rh.flatMap((v) => parseVoice(v, p.meter, 'R', p.id)), ...p.lh.flatMap((v) => parseVoice(v, p.meter, 'L', p.id))].sort((a, b) => a.start - b.start || a.midi - b.midi);
}
export const pdBarCount = (p: PdPiece): number => p.rh[0].split('|').length;

/** The piece as the piece coach's model (quarter-note beats; repeats none). */
export function pdToPiece(p: PdPiece, lang: 'en' | 'he' = 'en'): Piece {
  const q = 4 / p.unit; // unit beats → quarter beats
  const n = pdBarCount(p);
  const bars: PieceBar[] = Array.from({ length: n }, (_, i) => ({ number: String(p.pickup ? i : i + 1), start: i * p.meter * q, beats: p.meter * q, sig: [p.meter, p.unit] as [number, number], ...(i === 0 ? { boundary: true } : {}) }));
  for (const s of p.sections) if (bars[s.from]) bars[s.from].boundary = true;
  const notes: PieceNote[] = pdNotes(p).map((x) => ({ midi: x.midi, start: x.start * q, dur: x.dur * q, bar: x.bar, hand: x.hand }));
  return { title: p.title[lang], composer: p.composer[lang], bars, notes, tempo: Math.round(p.tempo * q), fifths: p.fifths, source: 'musicxml' };
}
export const pdPiece = (id: string): PdPiece | undefined => PD_PIECES.find((p) => p.id === id);

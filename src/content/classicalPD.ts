// AUDIT-7 #11 (docs/research/AUDIT-7-GAPS.md §1): graded classical repertoire on the keys — a public-domain tier, played
// through the piece coach (SPEC-PIECE) and as the k-classic ladder on the keys path.
//
// LEGAL (docs/research/MUSIC_SOURCES_LEGAL.md): only works that are public domain worldwide — the composer died more
// than 70 years ago (life + 70 is the longest common term) — and only OUR OWN engraving: every note below was written
// here from the music itself, not copied from a modern edition (an edition's editorial layer can carry its own
// copyright). Fingerings, dynamics and editorial marks are left out on purpose. `tests/audit7.test.ts` checks the list.
//
// CORRECTNESS (owner: "nothing that isn't 100% certain"): every bar here was checked note for note — pitches, lengths,
// both hands — against a public-domain transcription of an old public-domain edition: the Mutopia Project's LilyPond
// text (licence line "Public Domain"; CC-BY-SA sources are not used). `source` names the file, the edition it
// transcribes, and how the bars were checked. The LilyPond text was only read (relative pitches resolved, bar by bar);
// nothing of its layout is used.
//
// Note text: bars separated by "|", events by spaces; an event is "<pitch>[+<pitch>…]/<length>" or "r/<length>", the
// length in the piece's beat unit (a quarter, or an eighth for x/8 metres). Every bar must fill its metre exactly (the
// parser throws otherwise), so a mistyped length cannot slip in.
//   "~" after an event ties it into the first event of the next bar (same pitches): one note, no new attack.
//   "[<pitch>,…]" before the pitches: grace notes, small, before the event and taking none of its time ("[B4]A4/3": the
//   Minuet's grace B before bar 8 — unslashed, as the source's \grace prints it; "[/B4]…" slashed, an acciaccatura).
//   Several graces in a row are written "[A4,B4]". Graded softly (engine/drills/grace.ts): never wrong, never a fail.
//   Two strings in a hand's list are two voices on that staff: the first stems up (voice 1), the second stems down
//   (voice 2), each with its own rests and filling every bar (the Prelude in C's left hand: inner voice over a held bass).
//   "@<kind>(<aux>)" after the length is an ornament sign (engine/ornaments.ts) on that note: @mordent(B4) (main – lower
//   – main), @prall(D5) (main – upper – main), @turn(D5,B4), @trill(D5). The sign is drawn; the notes graded are its
//   written-out realisation (quick notes of a quarter of the note, at most a 16th).
// Pure data + a small parser.

import type { Piece, PieceBar, PieceNote } from '../engine/piece/score';
import type { Grace } from '../engine/drills/types';
import { realise, type OrnKind, type Ornament } from '../engine/ornaments';

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
  /** The time signature as printed when it is not meter/unit (alla breve: '2/2'). */
  sig?: string;
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
  /** Where every bar was checked: a public-domain transcription of an old edition, its licence, and how. */
  source: { url: string; licence: 'Public Domain'; edition: string; checked: string };
  /** Practice sections (bar indexes, inclusive): the ladder plays them one by one. A tie never crosses a section's end. */
  sections: { name: Bi; from: number; to: number }[];
  /** Voices of each hand (bars separated by "|"): one, or two (the first stems up, the second stems down). */
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

/** A bar figure written out n times (repeated 16th figures of Bach's C minor prelude, as the source writes them). */
const twice = (fig: string): string => `${fig} ${fig}`;
const s16 = (ps: string): string => ps.split(' ').map((p) => `${p}/0.25`).join(' ');

const MUTOPIA = 'https://www.mutopiaproject.org/ftp/';

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
    source: {
      url: `${MUTOPIA}BeethovenLv/ode/ode.ly`,
      licence: 'Public Domain',
      edition: 'Mutopia hymn setting of the theme (soprano), in G',
      checked: 'bars 1–8 of the melody (its first two phrases), note for note and rhythm (E E F G … D. C C), transposed from G to C; the left hand is our own simple bass',
    },
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
    source: {
      url: `${MUTOPIA}BachJS/BWVAnh114/anna-magdalena-04/anna-magdalena-04.ly`,
      licence: 'Public Domain',
      edition: 'Bach-Gesellschaft (Anna Magdalena notebook)',
      checked: 'bars 1–16, both hands, note for note; the four mordents (bars 3, 5, 11, 13) are the source\'s \\mordent signs; the grace note B before bar 8\'s A is the source\'s \\grace b8 (unslashed), drawn small and graded softly',
    },
    sections: [
      { name: { en: 'bars 1–8', he: 'תיבות 1–8' }, from: 0, to: 7 },
      { name: { en: 'bars 9–16', he: 'תיבות 9–16' }, from: 8, to: 15 },
    ],
    rh: [
      'D5/1 G4/0.5 A4/0.5 B4/0.5 C5/0.5 | D5/1 G4/1 G4/1 | E5/1 C5/0.5@mordent(B4) D5/0.5 E5/0.5 F#5/0.5 | G5/1 G4/1 G4/1 | C5/1@mordent(B4) D5/0.5 C5/0.5 B4/0.5 A4/0.5 | B4/1 C5/0.5 B4/0.5 A4/0.5 G4/0.5 | F#4/1 G4/0.5 A4/0.5 B4/0.5 G4/0.5 | [B4]A4/3 | ' +
        'D5/1 G4/0.5 A4/0.5 B4/0.5 C5/0.5 | D5/1 G4/1 G4/1 | E5/1 C5/0.5@mordent(B4) D5/0.5 E5/0.5 F#5/0.5 | G5/1 G4/1 G4/1 | C5/1@mordent(B4) D5/0.5 C5/0.5 B4/0.5 A4/0.5 | B4/1 C5/0.5 B4/0.5 A4/0.5 G4/0.5 | A4/1 B4/0.5 A4/0.5 G4/0.5 F#4/0.5 | G4/3',
    ],
    lh: ['G3+B3+D4/2 A3/1 | B3/3 | C4/3 | B3/3 | A3/3 | G3/3 | D4/1 B3/1 G3/1 | D4/1 D3/0.5 C4/0.5 B3/0.5 A3/0.5 | B3/2 A3/1 | G3/1 B3/1 G3/1 | C4/3 | B3/1 C4/0.5 B3/0.5 A3/0.5 G3/0.5 | A3/2 F#3/1 | G3/2 B3/1 | C4/1 D4/1 D3/1 | G3/2 G2/1'],
  },
  {
    id: 'la-candeur',
    title: { en: 'La Candeur (Sincerity)', he: 'כנות' },
    composer: { en: 'Friedrich Burgmüller', he: 'פרידריך בורגמילר' },
    born: 1806,
    died: 1874,
    work: 'Op. 100 No. 1',
    excerpt: { en: 'bars 1–8 (the first section)', he: 'תיבות 1–8 (החלק הראשון)' },
    grade: 2,
    meter: 4,
    unit: 4,
    fifths: 0,
    tonic: 0,
    tempo: 132,
    edition: 'own',
    source: {
      url: `${MUTOPIA}BurgmullerJFF/O100/25EF-01/25EF-01.ly`,
      licence: 'Public Domain',
      edition: 'Collection Litolff, 19th century',
      checked: 'bars 1–8, both hands (the right hand\'s eighths, the left hand\'s held chords, the tie from bar 3 into bar 4), note for note',
    },
    sections: [
      { name: { en: 'bars 1–4', he: 'תיבות 1–4' }, from: 0, to: 3 },
      { name: { en: 'bars 5–8', he: 'תיבות 5–8' }, from: 4, to: 7 },
    ],
    rh: [
      'G5/0.5 E5/0.5 D5/0.5 C5/0.5 G5/0.5 E5/0.5 D5/0.5 C5/0.5 | C6/0.5 A5/0.5 G5/0.5 F5/0.5 C6/0.5 A5/0.5 G5/0.5 F5/0.5 | G5/0.5 E5/0.5 D5/0.5 C5/0.5 B4/0.5 C5/0.5 E5/0.5 F5/0.5 | G5/0.5 E5/0.5 D5/0.5 C5/0.5 B4/0.5 C5/0.5 D5/0.5 E5/0.5 | ' +
        'G5/0.5 F5/0.5 E5/0.5 D5/0.5 G5/0.5 F5/0.5 E5/0.5 D5/0.5 | F5/0.5 E5/0.5 D5/0.5 C5/0.5 F5/0.5 E5/0.5 D5/0.5 C5/0.5 | B4/0.5 A4/0.5 C5/0.5 B4/0.5 D5/0.5 C5/0.5 B4/0.5 A4/0.5 | G4/0.5 B4/0.5 C5/0.5 D5/0.5 G5/1 r/1',
    ],
    lh: ['C3+E3+G3/4 | C3+F3+A3/4 | C3+E3+G3/4~ | C3+E3+G3/4 | B2+F3+G3/4 | C3+E3+G3/4 | D3+F#3+C4/4 | G3+B3/3 r/1'],
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
    source: {
      url: `${MUTOPIA}BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.ly`,
      licence: 'Public Domain',
      edition: 'Breitkopf & Härtel, 1888',
      checked: 'the upbeat and bars 1–8 (first ending), both hands, note for note; bar 8 is the first ending\'s A (a quarter), the bar completed with a rest',
    },
    sections: [
      { name: { en: 'upbeat to bar 4', he: 'הקדמה עד תיבה 4' }, from: 0, to: 4 },
      { name: { en: 'bars 5–8', he: 'תיבות 5–8' }, from: 5, to: 8 },
    ],
    rh: [
      'r/2 E5/0.5 D#5/0.5 | E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 | A4/1 r/0.5 C4/0.5 E4/0.5 A4/0.5 | B4/1 r/0.5 E4/0.5 G#4/0.5 B4/0.5 | C5/1 r/0.5 E4/0.5 E5/0.5 D#5/0.5 | ' +
        'E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 | A4/1 r/0.5 C4/0.5 E4/0.5 A4/0.5 | B4/1 r/0.5 E4/0.5 C5/0.5 B4/0.5 | A4/2 r/1',
    ],
    lh: ['r/3 | r/3 | A2/0.5 E3/0.5 A3/0.5 r/1.5 | E2/0.5 E3/0.5 G#3/0.5 r/1.5 | A2/0.5 E3/0.5 A3/0.5 r/1.5 | r/3 | A2/0.5 E3/0.5 A3/0.5 r/1.5 | E2/0.5 E3/0.5 G#3/0.5 r/1.5 | A2/0.5 E3/0.5 A3/0.5 r/1.5'],
  },
  {
    id: 'clementi-36-1',
    title: { en: 'Sonatina in C, 1st movement', he: 'סונטינה בדו מז׳ור, פרק ראשון' },
    composer: { en: 'Muzio Clementi', he: 'מוציו קלמנטי' },
    born: 1752,
    died: 1832,
    work: 'Op. 36 No. 1',
    excerpt: { en: 'bars 1–15 (the exposition)', he: 'תיבות 1–15 (התצוגה)' },
    grade: 4,
    meter: 4,
    unit: 4,
    sig: '2/2',
    fifths: 0,
    tonic: 0,
    tempo: 126,
    edition: 'own',
    source: {
      url: `${MUTOPIA}ClementiM/O36/sonatina-1/sonatina-1.ly`,
      licence: 'Public Domain',
      edition: 'Sonatina Album, G. Schirmer, 1893',
      checked: 'bars 1–15 (to the first double bar), both hands, note for note',
    },
    sections: [
      { name: { en: 'bars 1–8', he: 'תיבות 1–8' }, from: 0, to: 7 },
      { name: { en: 'bars 9–15', he: 'תיבות 9–15' }, from: 8, to: 14 },
    ],
    rh: [
      'C5/1 E5/0.5 C5/0.5 G4/1 G4/1 | C5/1 E5/0.5 C5/0.5 G4/1 G5/1 | F5/0.5 E5/0.5 D5/0.5 C5/0.5 B4/0.5 C5/0.5 B4/0.5 C5/0.5 | D5/0.5 C5/0.5 B4/0.5 A4/0.5 G4/1 r/1 | C5/1 E5/0.5 C5/0.5 G4/1 G4/1 | E5/1 G5/0.5 E5/0.5 C5/1 E5/0.5 C5/0.5 | D5/0.5 B4/0.5 C5/0.5 A4/0.5 B4/0.5 G4/0.5 A4/0.5 F#4/0.5 | G4/0.5 A4/0.5 B4/0.5 C5/0.5 D5/0.5 E5/0.5 F#5/0.5 G5/0.5 | ' +
        'A4/1 A5/1 A5/1 A5/1 | B4/0.5 C5/0.5 D5/0.5 E5/0.5 F#5/0.5 G5/0.5 A5/0.5 B5/0.5 | C5/1 C6/1 C6/1 C6/1 | D5/0.5 G5/0.5 B5/0.5 D6/0.5 C6/0.5 B5/0.5 A5/0.5 G5/0.5 | F#5/0.5 E5/0.5 G5/0.5 F#5/0.5 A5/0.5 G5/0.5 F#5/0.5 E5/0.5 | E5/0.5 D5/0.5 C5/0.5 B4/0.5 D5/0.5 C5/0.5 B4/0.5 A4/0.5 | G4/2 r/2',
    ],
    lh: [
      'C3/1 r/1 r/2 | C3/1 r/1 r/2 | C3/1 r/1 C3/1 r/1 | G2/1 r/1 G3/0.5 F3/0.5 E3/0.5 D3/0.5 | C3/1 r/1 r/2 | C4/1 r/1 r/1 F#3/1 | G3/1 C3/1 D3/1 D2/1 | G2/1 r/1 r/2 | ' +
        'F#3/0.5 D4/0.5 A3/0.5 D4/0.5 F#3/0.5 D4/0.5 A3/0.5 D4/0.5 | G3/1 r/1 r/2 | A3/0.5 D4/0.5 C4/0.5 D4/0.5 A3/0.5 D4/0.5 C4/0.5 D4/0.5 | B3/1 r/1 r/2 | C4/1 r/1 C3/1 r/1 | D3/1 r/1 D2/1 r/1 | G2/0.5 B2/0.5 D3/0.5 G3/0.5 G2/1 r/1',
    ],
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
    source: {
      url: `${MUTOPIA}BachJS/BWV846/wtk1-prelude1/wtk1-prelude1.ly`,
      licence: 'Public Domain',
      edition: 'Mutopia WTC I Prelude 1 (Erbsland / Nienhuys)',
      checked: 'bars 1–19: each bar\'s five notes (both hands) and the figure (the right hand\'s 16ths after an eighth rest; the left hand in two voices as the source writes it: voice 1, stems up, a 16th rest then a dotted eighth tied to a quarter; voice 2, stems down, the held bass in halves), note for note',
    },
    sections: [
      { name: { en: 'bars 1–11', he: 'תיבות 1–11' }, from: 0, to: 10 },
      { name: { en: 'bars 12–19', he: 'תיבות 12–19' }, from: 11, to: 18 },
    ],
    rh: [PRE.rh],
    // two voices, as the source writes them: the inner voice (stems up) over the held bass (stems down)
    lh: [PRE.lh2, PRE.lh1],
  },
  {
    id: 'invention-8',
    title: { en: 'Invention No. 8 in F', he: 'אינוונציה מס׳ 8 בפה מז׳ור' },
    composer: { en: 'Johann Sebastian Bach', he: 'יוהאן סבסטיאן באך' },
    born: 1685,
    died: 1750,
    work: 'BWV 779',
    excerpt: { en: 'bars 1–12 (to the cadence in C)', he: 'תיבות 1–12 (עד הקדנצה בדו)' },
    grade: 6,
    meter: 3,
    unit: 4,
    fifths: -1,
    tonic: 5,
    tempo: 100,
    edition: 'own',
    source: {
      url: `${MUTOPIA}BachJS/BWV779/bach-invention-08/bach-invention-08.ly`,
      licence: 'Public Domain',
      edition: 'Bach-Gesellschaft',
      checked: 'bars 1–12, both hands (the canon at the octave, every 16th), note for note',
    },
    sections: [
      { name: { en: 'bars 1–6', he: 'תיבות 1–6' }, from: 0, to: 5 },
      { name: { en: 'bars 7–12', he: 'תיבות 7–12' }, from: 6, to: 11 },
    ],
    rh: [
      'r/0.5 F4/0.5 A4/0.5 F4/0.5 C5/0.5 F4/0.5 | F5/0.5 E5/0.25 D5/0.25 C5/0.25 D5/0.25 C5/0.25 Bb4/0.25 A4/0.25 Bb4/0.25 A4/0.25 G4/0.25 | F4/0.5 A4/0.5 C5/0.5 A4/0.5 F5/0.5 C5/0.5 | ' +
        `${s16('A5 C6 Bb5 C6 A5 C6 Bb5 C6 A5 C6 Bb5 C6')} | ${s16('F5 A5 G5 A5 F5 A5 G5 A5 F5 A5 G5 A5')} | ${s16('D5 F5 E5 F5 D5 F5 E5 F5 D5 F5 E5 F5')} | ` +
        `B4/0.5 G4/0.5 D5/0.5 B4/0.5 F5/0.5 D5/0.5 | ${s16('G5 A5 G5 F5 E5 F5 E5 D5 C5 D5 C5 Bb4')} | A4/0.5 ${s16('D5 C5 B4 C5 B4 A4 G4 A4 G4 F4')} | ` +
        'E4/0.25 F4/0.25 E4/0.25 D4/0.25 C4/0.5 C5/0.25 B4/0.25 C5/0.5 E4/0.5 | F4/0.5 C5/0.5 E4/0.5 C5/0.5 D4/0.5 B4/0.5 | C5/1 r/1 r/1',
    ],
    lh: [
      'r/3 | r/0.5 F3/0.5 A3/0.5 F3/0.5 C4/0.5 F3/0.5 | F4/0.5 E4/0.25 D4/0.25 C4/0.25 D4/0.25 C4/0.25 Bb3/0.25 A3/0.25 Bb3/0.25 A3/0.25 G3/0.25 | F3/0.5 A3/0.5 C4/0.5 A3/0.5 F4/0.5 C4/0.5 | ' +
        `${s16('A4 C5 Bb4 C5 A4 C5 Bb4 C5 A4 C5 Bb4 C5')} | ${s16('F4 A4 G4 A4 F4 A4 G4 A4 F4 A4 G4 A4')} | ${s16('D4 F4 E4 F4 D4 F4 E4 F4 D4 F4 E4 F4')} | ` +
        `B3/0.5 G3/0.5 C4/0.5 G3/0.5 E4/0.5 C4/0.5 | ${s16('F4 G4 F4 E4 D4 E4 D4 C4 B3 C4 B3 A3')} | G3/0.5 ${s16('C4 B3 A3 B3 A3 G3 F3 G3 F3 E3')} | ` +
        'D3/0.25 E3/0.25 D3/0.25 C3/0.25 G3/0.25 F3/0.25 E3/0.25 F3/0.25 G3/0.5 G2/0.5 | r/0.5 C3/0.5 E3/0.5 C3/0.5 G3/0.5 C3/0.5',
    ],
  },
  {
    id: 'invention-13',
    title: { en: 'Invention No. 13 in A minor', he: 'אינוונציה מס׳ 13 בלה מינור' },
    composer: { en: 'Johann Sebastian Bach', he: 'יוהאן סבסטיאן באך' },
    born: 1685,
    died: 1750,
    work: 'BWV 784',
    excerpt: { en: 'bars 1–6 (to the cadence in C)', he: 'תיבות 1–6 (עד הקדנצה בדו)' },
    grade: 7,
    meter: 4,
    unit: 4,
    fifths: 0,
    tonic: 9,
    minor: true,
    tempo: 72,
    edition: 'own',
    source: {
      url: `${MUTOPIA}BachJS/BWV784/bach-invention-13/bach-invention-13.ly`,
      licence: 'Public Domain',
      edition: 'Bach-Gesellschaft',
      checked: 'bars 1–6, both hands, note for note, with the ties over the bar lines of bars 3–6 (a tie inside a bar is written as one note of the summed length)',
    },
    sections: [
      { name: { en: 'bars 1–2', he: 'תיבות 1–2' }, from: 0, to: 1 },
      { name: { en: 'bars 3–6', he: 'תיבות 3–6' }, from: 2, to: 5 },
    ],
    rh: [
      `r/0.25 ${s16('E4 A4 C5 B4 E4 B4 D5')} C5/0.5 E5/0.5 G#4/0.5 E5/0.5 | ${s16('A4 E4 A4 C5 B4 E4 B4 D5')} C5/0.5 A4/0.5 r/1 | ` +
        `r/0.25 ${s16('E5 C5 E5 A4 C5 E4 G4')} F4/0.5 A4/0.5 D5/0.5 F5/0.5~ | ${s16('F5 D5 B4 D5 G4 B4 D4 F4')} E4/0.5 G4/0.5 C5/0.5 E5/0.5~ | ` +
        `${s16('E5 C5 A4 C5')} F4/0.5 D5/0.75 ${s16('B4 G4 B4')} E4/0.5 C5/0.5~ | ${s16('C5 A4 F4 A4')} D4/0.5 B4/0.5 C5/0.5 r/0.5 r/1`,
    ],
    lh: [
      `A2/0.5 A3/1 G#3/0.5 ${s16('A3 E3 A3 C4 B3 E3 B3 D4')} | C4/0.5 A3/0.5 G#3/0.5 E3/0.5 ${s16('A3 E3 A3 C4 B3 E3 B3 D4')} | ` +
        `C4/0.5 A3/0.5 C4/0.5 A3/0.5 ${s16('D4 A3 F3 A3 D3 F3 A2 C3')} | B2/0.5 D3/0.5 G3/0.5 B3/0.75 ${s16('G3 E3 G3 C3 E3 G2 B2')} | ` +
        `A2/0.5 C3/0.5 ${s16('D3 F3 B2 D3')} G2/0.5 B2/0.5 ${s16('C3 E3 A2 C3')} | F2/0.5 D2/0.5 ${s16('G2 G3 F3 G3 C3 G3 C4 E4 D4 G3 D4 F4')}`,
    ],
  },
  {
    id: 'prelude-c-minor',
    title: { en: 'Prelude in C minor', he: 'פרלוד בדו מינור' },
    composer: { en: 'Johann Sebastian Bach', he: 'יוהאן סבסטיאן באך' },
    born: 1685,
    died: 1750,
    work: 'BWV 847',
    excerpt: { en: 'bars 1–8', he: 'תיבות 1–8' },
    grade: 8,
    meter: 4,
    unit: 4,
    fifths: -3,
    tonic: 0,
    minor: true,
    tempo: 104,
    edition: 'own',
    source: {
      url: `${MUTOPIA}BachJS/BWV847/bwv847a/bwv847a.ly`,
      licence: 'Public Domain',
      edition: 'Breitkopf & Härtel, 1866',
      checked: 'bars 1–8, both hands, every 16th (each bar is a figure played twice, as the source writes it with \\repeat unfold 2), note for note',
    },
    sections: [
      { name: { en: 'bars 1–4', he: 'תיבות 1–4' }, from: 0, to: 3 },
      { name: { en: 'bars 5–8', he: 'תיבות 5–8' }, from: 4, to: 7 },
    ],
    rh: [
      [
        'C5 Eb4 D4 Eb4 C4 Eb4 D4 Eb4',
        'Ab4 F4 E4 F4 C4 F4 E4 F4',
        'B4 F4 Eb4 F4 D4 F4 Eb4 F4',
        'C5 G4 F4 G4 Eb4 G4 F4 G4',
        'Eb5 Ab4 G4 Ab4 Eb4 Ab4 G4 Ab4',
        'D5 F#4 E4 F#4 D4 F#4 E4 F#4',
        'D5 G4 F#4 G4 D4 G4 F#4 G4',
        'C5 E4 D4 E4 C4 E4 D4 E4',
      ]
        .map((f) => twice(s16(f)))
        .join(' | '),
    ],
    lh: [
      [
        'C3 G3 F3 G3 Eb3 G3 F3 G3',
        'C3 Ab3 G3 Ab3 F3 Ab3 G3 Ab3',
        'C3 Ab3 G3 Ab3 F3 Ab3 G3 Ab3',
        'C3 Eb3 D3 Eb3 G3 Eb3 D3 Eb3',
        'C3 C4 Bb3 C4 Ab3 C4 Bb3 C4',
        'C3 A3 G3 A3 F#3 A3 G3 A3',
        'Bb2 Bb3 A3 Bb3 G3 Bb3 A3 Bb3',
        'Bb2 G3 F3 G3 E3 G3 F3 G3',
      ]
        .map((f) => twice(s16(f)))
        .join(' | '),
    ],
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

export type PdNote = { midi: number; start: number; dur: number; bar: number; hand: 'R' | 'L'; /** Grace notes before this note. */ graces?: Grace[]; /** 2 = the hand's lower voice (stems down); 1 = the upper of two; absent = the hand's only voice. */ voice?: 1 | 2 };
const ORN_KINDS: OrnKind[] = ['mordent', 'prall', 'turn', 'trill'];

/**
 * One voice → its notes (beat = unit beats from the start; ornaments written out, ties merged) and its ornament signs,
 * checking every bar fills the metre and every tie lands on the same pitches.
 */
export function parseVoiceFull(src: string, meter: number, hand: 'R' | 'L', id = '', unit: 4 | 8 = 4, voice?: 1 | 2): { notes: PdNote[]; ornaments: Ornament[] } {
  const notes: PdNote[] = [];
  const ornaments: Ornament[] = [];
  /** Notes tied into the next bar's first event, by pitch. */
  let tied: Map<number, PdNote> | null = null;
  const bars = src.split('|');
  bars.forEach((bar, bi) => {
    let at = 0;
    const evs = bar.trim().split(/\s+/);
    evs.forEach((ev, ei) => {
      const m = /^(?:\[(\/)?([^\]]+)\])?([^/[\]]+)\/([\d.]+)(?:@(\w+)\(([^)]*)\))?(~)?$/.exec(ev);
      if (!m) throw new Error(`${id} bar ${bi + 1}: bad event "${ev}"`);
      const [, slash, gs, ps, len, orn, aux, tie] = m;
      const graces: Grace[] | undefined = gs ? gs.split(',').map((g) => ({ pitch: midiOf(g.trim()), ...(slash ? { slash: true } : {}) })) : undefined;
      if (graces && ps === 'r') throw new Error(`${id} bar ${bi + 1}: a grace note before a rest`);
      if (graces && orn) throw new Error(`${id} bar ${bi + 1}: a grace note and an ornament on one note`);
      const d = Number(len);
      if (!(d > 0)) throw new Error(`${id} bar ${bi + 1}: bad length in "${ev}"`);
      const start = bi * meter + at;
      const pitches = ps === 'r' ? [] : ps.split('+').map(midiOf);
      // the continuation of a tie: the first event of the bar, the same pitches, no new attack
      if (ei === 0 && tied) {
        if (pitches.length !== tied.size || !pitches.every((p) => tied!.has(p))) throw new Error(`${id} bar ${bi + 1}: the tie lands on "${ps}"`);
        if (orn) throw new Error(`${id} bar ${bi + 1}: an ornament on a tied note`);
        if (graces) throw new Error(`${id} bar ${bi + 1}: a grace note on a tied note`);
        for (const p of pitches) tied.get(p)!.dur += d;
        tied = tie ? tied : null;
        at += d;
        return;
      }
      const made: PdNote[] = [];
      if (orn) {
        if (!ORN_KINDS.includes(orn as OrnKind)) throw new Error(`${id} bar ${bi + 1}: unknown ornament "${orn}"`);
        if (pitches.length !== 1) throw new Error(`${id} bar ${bi + 1}: an ornament needs one note`);
        const kind = orn as OrnKind;
        const ax = aux.split(',').filter(Boolean).map(midiOf);
        const main = pitches[0];
        const upper = kind === 'mordent' ? main : ax[0];
        const lower = kind === 'mordent' ? ax[0] : kind === 'turn' ? ax[1] : main;
        if (upper === undefined || lower === undefined) throw new Error(`${id} bar ${bi + 1}: "${ev}" needs its neighbour note(s)`);
        if (tie) throw new Error(`${id} bar ${bi + 1}: a tie from an ornament`);
        // quick notes: a quarter of the note, at most a 16th (a quarter beat = 4 / unit beats)
        const sixteenth = 0.25 * (unit / 4);
        for (const r of realise(kind, start, d, main, upper, lower, Math.min(sixteenth, d / 4))) made.push({ midi: r.pitch, start: r.beat, dur: r.dur, bar: bi, hand, ...(voice ? { voice } : {}) });
        ornaments.push({ beat: start, dur: d, hand, pitch: main, kind });
      } else {
        // graces go on the chord's outer note (the top in the right hand, the bottom in the left)
        const outer = hand === 'R' ? Math.max(...pitches) : Math.min(...pitches);
        for (const p of pitches) made.push({ midi: p, start, dur: d, bar: bi, hand, ...(voice ? { voice } : {}), ...(graces && p === outer ? { graces } : {}) });
      }
      notes.push(...made);
      if (tie) {
        if (ei !== evs.length - 1) throw new Error(`${id} bar ${bi + 1}: a tie must end the bar`);
        if (!pitches.length) throw new Error(`${id} bar ${bi + 1}: a tied rest`);
        tied = new Map(made.map((n) => [n.midi, n]));
      } else if (ei === evs.length - 1) tied = null;
      at += d;
    });
    if (Math.abs(at - meter) > 1e-6) throw new Error(`${id} bar ${bi + 1}: ${at} beats, the metre has ${meter}`);
  });
  if (tied) throw new Error(`${id}: a tie past the last bar`);
  return { notes, ornaments };
}

/** One voice → notes (beat = unit beats from the start), checking every bar fills the metre. */
export function parseVoice(src: string, meter: number, hand: 'R' | 'L', id = '', unit: 4 | 8 = 4): PdNote[] {
  return parseVoiceFull(src, meter, hand, id, unit).notes;
}

/** A hand's voices: one (no voice mark) or two (1 = stems up, 2 = stems down). */
const voicesOf = (vs: string[], hand: 'R' | 'L', p: PdPiece) => {
  if (vs.length > 2) throw new Error(`${p.id}: at most two voices a hand`);
  return vs.map((v, k) => parseVoiceFull(v, p.meter, hand, p.id, p.unit, vs.length > 1 ? ((k + 1) as 1 | 2) : undefined));
};
const parsedAll = (p: PdPiece) => [...voicesOf(p.rh, 'R', p), ...voicesOf(p.lh, 'L', p)];
/** All notes of a piece (both hands, every voice; ornaments written out), sorted. */
export function pdNotes(p: PdPiece): PdNote[] {
  return parsedAll(p)
    .flatMap((v) => v.notes)
    .sort((a, b) => a.start - b.start || a.midi - b.midi);
}
/** The ornament signs of a piece (beats in the piece's unit), in order. */
export function pdOrnaments(p: PdPiece): Ornament[] {
  return parsedAll(p)
    .flatMap((v) => v.ornaments)
    .sort((a, b) => a.beat - b.beat);
}
export const pdBarCount = (p: PdPiece): number => p.rh[0].split('|').length;
/** The pitch classes the piece writes with a sharp (its own spelling: G♯ in A minor, F♯ in C minor), for the staff. */
export function pdSharps(p: PdPiece): number[] {
  const pcs = new Set<number>();
  for (const m of [...p.rh, ...p.lh].join(' ').matchAll(/[A-G]#-?\d/g)) pcs.add(((midiOf(m[0]) % 12) + 12) % 12);
  return [...pcs].sort((a, b) => a - b);
}
/** The pitch classes the piece writes with a flat. */
export function pdFlats(p: PdPiece): number[] {
  const pcs = new Set<number>();
  for (const m of [...p.rh, ...p.lh].join(' ').matchAll(/[A-G]b-?\d/g)) pcs.add(((midiOf(m[0]) % 12) + 12) % 12);
  return [...pcs].sort((a, b) => a - b);
}

/** The piece as the piece coach's model (quarter-note beats; repeats none). */
export function pdToPiece(p: PdPiece, lang: 'en' | 'he' = 'en'): Piece {
  const q = 4 / p.unit; // unit beats → quarter beats
  const n = pdBarCount(p);
  const sig: [number, number] = p.sig ? (p.sig.split('/').map(Number) as [number, number]) : [p.meter, p.unit];
  const bars: PieceBar[] = Array.from({ length: n }, (_, i) => ({ number: String(p.pickup ? i : i + 1), start: i * p.meter * q, beats: p.meter * q, sig, ...(i === 0 ? { boundary: true } : {}) }));
  for (const s of p.sections) if (bars[s.from]) bars[s.from].boundary = true;
  const notes: PieceNote[] = pdNotes(p).map((x) => ({ midi: x.midi, start: x.start * q, dur: x.dur * q, bar: x.bar, hand: x.hand, ...(x.graces ? { graces: x.graces } : {}), ...(x.voice ? { voice: x.voice } : {}) }));
  const orns = pdOrnaments(p).map((o) => ({ ...o, beat: o.beat * q, dur: o.dur * q }));
  const sharps = pdSharps(p);
  return { title: p.title[lang], composer: p.composer[lang], bars, notes, tempo: Math.round(p.tempo * q), fifths: p.fifths, source: 'musicxml', ...(orns.length ? { ornaments: orns } : {}), ...(sharps.length ? { sharps } : {}) };
}
export const pdPiece = (id: string): PdPiece | undefined => PD_PIECES.find((p) => p.id === id);

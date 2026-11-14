// Heads: melodies with their chords, one chorus each (docs/AUDIT-DEPTH-3.md §3; owner legal rule 2026-11-14).
//
// A melody here is either
//   (a) public domain worldwide (docs/research/STANDARDS_LEGAL.md §2.1, Tier 1A): every composer and lyricist died in
//       1955 or earlier AND the song was published in 1930 or earlier; or
//   (b) an original melody written for the app in the style.
// Never the melody of any other standard (I Got Rhythm, Body and Soul, Honeysuckle Rose … are PD in the US only and
// are NOT allowed). Chord charts are not protected, so every head carries its changes.
//
// `verify: true` marks a public-domain entry whose transcription the owner still has to check against period sheet
// music (LoC, Levy, IMSLP; never a modern fake book). Such a head is never served in an exercise (servedHeads()). The
// PD entries below carry their chord charts only: I was not confident of the exact notes of any of these melodies, so,
// per the owner's rule, the exercises use original heads instead and the PD melodies wait for a checked transcription.
//
// Melody text: bars split by "|", notes split by spaces. A note is <letter><accidental?><octave>[:<beats>]
// (C4 = middle C, 1 beat by default), "r[:beats]" is a rest, "-[:beats]" holds the note before (a tie, also across a
// bar line). Every bar adds up to 4 beats (tests check it). Chords: the chart syntax of src/engine/charts.ts.

export type HeadForm = 'AABA' | 'ABAC' | 'blues' | 'minor' | 'ballad';

export type HeadLicence =
  | { kind: 'pd-worldwide'; composers: { name: string; died: number }[]; published: number; source: string }
  | { kind: 'original'; by: string; year: number };

export interface Head {
  id: string;
  title: { en: string; he: string };
  form: HeadForm;
  /** The form's sections in order (label, bars). */
  sections: { label: string; bars: number }[];
  /** The lead-sheet key (the tonic; a minor tune by its minor tonic). */
  home: { key: number; minor?: boolean };
  /** Chart tempo (♩). */
  bpm: number;
  feel: 'swing' | 'ballad';
  /** One chorus of changes, one entry per bar ("|" between bars). */
  chords: string;
  /** One chorus of melody (absent: a PD entry waiting for a checked transcription). */
  melody?: string;
  licence: HeadLicence;
  /** A PD transcription the owner still has to check: never served in an exercise. */
  verify?: boolean;
}

const A8 = (l: string) => ({ label: l, bars: 8 });

// ───────────────────────────── originals ─────────────────────────────

// AABA, 32 bars, F major, medium swing.
const CB_A = 'A4:1.5 G4:0.5 A4 C5 | F#4:2 r:0.5 A4:0.5 C5 | Bb4:1.5 A4:0.5 Bb4 D5 | E5:2 D5 C5 | C5 A4 C5 F#4 | Bb4 G4 Bb4 E4';
const CORNER_BENCH: Head = {
  id: 'corner-bench',
  title: { en: 'Corner Bench', he: 'ספסל בפינה' },
  form: 'AABA',
  sections: [A8('A'), A8('A'), A8('B'), A8('A')],
  home: { key: 5 },
  bpm: 132,
  feel: 'swing',
  chords: [
    'Fmaj7 | D7 | Gm7 | C7 | Am7 D7 | Gm7 C7 | Fmaj7 D7 | Gm7 C7',
    'Fmaj7 | D7 | Gm7 | C7 | Am7 D7 | Gm7 C7 | Fmaj7 | Cm7 F7',
    'Bbmaj7 | Bbm7 Eb7 | Am7 | D7 | Gm7 | C7 | Am7 D7 | Gm7 C7',
    'Fmaj7 | D7 | Gm7 | C7 | Am7 D7 | Gm7 C7 | Fmaj7 | Gm7 C7',
  ].join(' | '),
  melody: [
    `${CB_A} | A4:2 F#4:2 | G4:2 r:2`,
    `${CB_A} | F4:3 r | C5 Bb4 A4 Eb5`,
    'D5:3 C5:0.5 Bb4:0.5 | Db5:2 G4:2 | C5:3 E5 | D5:1.5 C5:0.5 A4:2 | Bb4:3 D5 | C5:1.5 Bb4:0.5 G4:2 | A4 C5 F#4 A4 | G4 Bb4 E4 G4',
    `${CB_A} | F4:4 | r:4`,
  ].join(' | '),
  licence: { kind: 'original', by: 'The 7th Sense', year: 2026 },
};

// ABAC, 32 bars, G major, medium swing.
const LW_A = 'B4 D5 F#5:2 | G#4 B4 D5:2 | C5:1.5 B4:0.5 A4 E5 | F#5:3 r | D5 B4 F#4 A4 | G#4:2 B4 D5 | E5:2 C5 A4 | C5:2 r:2';
const LONG_WAY: Head = {
  id: 'long-way-round',
  title: { en: 'Long Way Round', he: 'הדרך הארוכה' },
  form: 'ABAC',
  sections: [A8('A'), A8('B'), A8('A'), A8('C')],
  home: { key: 7 },
  bpm: 144,
  feel: 'swing',
  chords: [
    'Gmaj7 | E7 | Am7 | D7 | Bm7 | E7 | Am7 | D7',
    'Gmaj7 | G7 | Cmaj7 | Cm7 F7 | Bm7 | E7 | A7 | Am7 D7',
    'Gmaj7 | E7 | Am7 | D7 | Bm7 | E7 | Am7 | D7',
    'Cmaj7 | C#dim7 | Bm7 | E7 | Am7 | D7 | Gmaj7 | Am7 D7',
  ].join(' | '),
  melody: [
    LW_A,
    'B4:1.5 A4:0.5 B4 D5 | F5:3 D5 | E5:2 C5 B4 | Eb5:2 A4:2 | D5 C#5 B4 A4 | G#4:3 r | C#5 E5 G5:2 | E5 C5 C5 A4',
    LW_A,
    'E5 D5 C5 G4 | A#4:2 C#5 E5 | D5:3 B4 | G#4 B4 D5 E5 | C5:2 A4 C5 | F#4 A4 C5 E5 | B4:4 | r:4',
  ].join(' | '),
  licence: { kind: 'original', by: 'The 7th Sense', year: 2026 },
};

// A 12-bar blues head in F: a riff, the riff up a 4th, an answer.
const BACK_PORCH: Head = {
  id: 'back-porch',
  title: { en: 'Back Porch Blues', he: 'בלוז המרפסת' },
  form: 'blues',
  sections: [{ label: 'Blues', bars: 12 }],
  home: { key: 5 },
  bpm: 126,
  feel: 'swing',
  chords: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7',
  melody:
    'A4 C5:0.5 D5:0.5 Eb5 C5 | D5:1.5 C5:0.5 Ab4:2 | A4 C5:0.5 D5:0.5 Eb5 C5 | Eb5:2 Eb5 C5 | D5 F5:0.5 G5:0.5 Ab5 F5 | Ab5:2 F5 D5 | C5 A4 C5 Eb5 | D5:2 F#4:2 | Bb4 D5 F5 D5 | E5:2 Bb4:2 | A4:2 F#4:2 | G4:2 E4:2',
  licence: { kind: 'original', by: 'The 7th Sense', year: 2026 },
};

// A minor tune, 16 bars (A B), C minor.
const NIGHT_FERRY: Head = {
  id: 'night-ferry',
  title: { en: 'Night Ferry', he: 'מעבורת לילה' },
  form: 'minor',
  sections: [A8('A'), A8('B')],
  home: { key: 0, minor: true },
  bpm: 120,
  feel: 'swing',
  chords: 'Cm7 | Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7 | Cm7 | Cm7 | Fm7 | Bb7 | Ebmaj7 | Dm7b5 G7 | Cm7 | Dm7b5 G7',
  melody:
    'G4 Bb4 C5 Eb5 | Eb5:2.5 D5:0.5 C5 | Ab4 C5 Eb5 F5 | D5:3 r | G4 Bb4 D5:2 | C5:3 r | F4 Ab4 C5 D5 | B4:3 r | G4 Bb4 C5 Eb5 | G5:2 F5 Eb5 | Eb5 C5 Ab4 F4 | Ab4:2 D5:2 | Bb4 D5 G5:2 | F5:2 D5 B4 | C5:4 | r:4',
  licence: { kind: 'original', by: 'The 7th Sense', year: 2026 },
};

// A ballad, 16 bars, E♭ major, two chords a bar.
const QUIET_HOURS: Head = {
  id: 'quiet-hours',
  title: { en: 'Quiet Hours', he: 'שעות שקטות' },
  form: 'ballad',
  sections: [A8('A'), A8('B')],
  home: { key: 3 },
  bpm: 66,
  feel: 'ballad',
  chords: 'Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7 | Fm7 Bb7 | Ebmaj7 Eb7 | Abmaj7 Db7 | Gm7 C7 | Fm7 Bb7 | Ebmaj7 Cm7 | Fm7 Bb7 | Bbm7 Eb7 | Abmaj7 Abm6 | Gm7 C7 | Fm7 Bb7 | Ebmaj7 | Fm7 Bb7',
  melody:
    'G4:2 Eb5:2 | C5:1.5 Ab4:0.5 D5:2 | D5:2 E5:2 | Eb5 C5 D5:2 | G4:2 Db5:2 | C5:2 F4:2 | Bb4:2 E4 G4 | Ab4:2 r:2 | G4:2 Eb5:2 | C5:1.5 Ab4:0.5 D5:2 | Db5:2 G4:2 | C5:2 B4:2 | D5:2 Bb4:2 | C5:2 Ab4:2 | G4:4 | r:4',
  licence: { kind: 'original', by: 'The 7th Sense', year: 2026 },
};

// ───────────────────────────── public domain worldwide (Tier 1A), to verify ─────────────────────────────

const PD_SRC = 'docs/research/STANDARDS_LEGAL.md §2.1 (Tier 1A); transcribe from period sheet music';

const INDIANA: Head = {
  id: 'indiana',
  title: { en: 'Back Home Again in Indiana', he: 'Back Home Again in Indiana' },
  form: 'ABAC',
  sections: [A8('A'), A8('B'), A8('A'), A8('C')],
  home: { key: 5 },
  bpm: 160,
  feel: 'swing',
  chords: 'F6 | F6 | D7 | D7 | G7 | G7 | C7 | C7 | F6 | F6 | D7 | D7 | G7 | G7 | Gm7 | C7 | F6 | F6 | D7 | D7 | G7 | G7 | C7 | C7 | F6 | F6 | Bb6 | Bbm6 | F6 | D7 | Gm7 C7 | F6',
  licence: { kind: 'pd-worldwide', composers: [{ name: 'James F. Hanley', died: 1942 }, { name: 'Ballard MacDonald', died: 1935 }], published: 1917, source: PD_SRC },
  verify: true,
};

const LOVE_ME_OR_LEAVE_ME: Head = {
  id: 'love-me-or-leave-me',
  title: { en: 'Love Me or Leave Me', he: 'Love Me or Leave Me' },
  form: 'AABA',
  sections: [A8('A'), A8('A'), A8('B'), A8('A')],
  home: { key: 2, minor: true },
  bpm: 140,
  feel: 'swing',
  chords: 'Dm | Dm(maj7) | Dm7 | Dm6 | Gm6 | A7 | Dm | A7 | Dm | Dm(maj7) | Dm7 | Dm6 | Gm6 | A7 | Dm | Dm | Fmaj7 | Dm7 | Gm7 | C7 | Fmaj7 | Dm7 | Gm7 | A7 | Dm | Dm(maj7) | Dm7 | Dm6 | Gm6 | A7 | Dm | Dm',
  licence: { kind: 'pd-worldwide', composers: [{ name: 'Walter Donaldson', died: 1947 }, { name: 'Gus Kahn', died: 1941 }], published: 1928, source: PD_SRC },
  verify: true,
};

const MEAN_TO_ME: Head = {
  id: 'mean-to-me',
  title: { en: 'Mean to Me', he: 'Mean to Me' },
  form: 'AABA',
  sections: [A8('A'), A8('A'), A8('B'), A8('A')],
  home: { key: 5 },
  bpm: 120,
  feel: 'swing',
  chords: 'Fmaj7 Dm7 | Gm7 C7 | Fmaj7 Dm7 | Gm7 C7 | Fmaj7 F7 | Bbmaj7 Bbm6 | Am7 D7 | Gm7 C7 | Fmaj7 Dm7 | Gm7 C7 | Fmaj7 Dm7 | Gm7 C7 | Fmaj7 F7 | Bbmaj7 Bbm6 | Gm7 C7 | Fmaj7 | Cm7 | F7 | Bbmaj7 | Bbmaj7 | Dm7 | G7 | Gm7 | C7 | Fmaj7 Dm7 | Gm7 C7 | Fmaj7 Dm7 | Gm7 C7 | Fmaj7 F7 | Bbmaj7 Bbm6 | Gm7 C7 | Fmaj7',
  licence: { kind: 'pd-worldwide', composers: [{ name: 'Fred E. Ahlert', died: 1953 }, { name: 'Roy Turk', died: 1934 }], published: 1929, source: PD_SRC },
  verify: true,
};

const MY_BLUE_HEAVEN: Head = {
  id: 'my-blue-heaven',
  title: { en: 'My Blue Heaven', he: 'My Blue Heaven' },
  form: 'AABA',
  sections: [A8('A'), A8('A'), A8('B'), A8('A')],
  home: { key: 3 },
  bpm: 132,
  feel: 'swing',
  chords: 'Eb6 | Eb6 | Eb6 | Bbm7 Eb7 | Abmaj7 | Abm6 | Eb6 | Fm7 Bb7 | Eb6 | Eb6 | Eb6 | Bbm7 Eb7 | Abmaj7 | Abm6 | Eb6 | Eb6 | Gm7 | C7 | Fm7 | Bb7 | Gm7 | C7 | Fm7 | Bb7 | Eb6 | Eb6 | Eb6 | Bbm7 Eb7 | Abmaj7 | Abm6 | Fm7 Bb7 | Eb6',
  licence: { kind: 'pd-worldwide', composers: [{ name: 'Walter Donaldson', died: 1947 }, { name: 'George Whiting', died: 1943 }], published: 1927, source: PD_SRC },
  verify: true,
};

/** Every head in the library, originals first (their order is the exercises' option order — never reorder). */
export const HEADS: Head[] = [CORNER_BENCH, LONG_WAY, BACK_PORCH, NIGHT_FERRY, QUIET_HOURS, INDIANA, LOVE_ME_OR_LEAVE_ME, MEAN_TO_ME, MY_BLUE_HEAVEN];

/**
 * The heads the exercises use: a melody, and not waiting for the owner's check. Their index in this list is the option
 * the head drills store (servedHeads()[i]) — a new head is appended, never inserted.
 */
export const servedHeads = (): Head[] => HEADS.filter((h) => !!h.melody && !h.verify);

export const headById = (id: string): Head | undefined => HEADS.find((h) => h.id === id);

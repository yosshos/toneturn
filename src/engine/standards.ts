// Standards' changes (owner 2026-11-08): the chord progressions of well-known jazz tunes, to improvise over and to
// practise voicings / comping / stride on. Chord progressions only — never the melodies or lyrics. Written in the usual
// lead-sheet keys; exercises transpose them. Bar text as in charts.ts ("|" between bars, two chords split a bar).

import type { ChartStyle } from './charts';

export interface StandardChanges {
  id: string;
  /** The tune whose changes these are (or the form). */
  name: string;
  /** Which part of the form. */
  part: { en: string; he: string };
  text: string;
  style: ChartStyle;
  bpm: number;
  group: StandardGroup;
  /** 1 easy … 5 hard to improvise / voice over. */
  level: number;
}

export type StandardGroup = 'blues' | 'rhythm' | 'swing' | 'ballad' | 'latin' | 'modal' | 'bebop' | 'coltrane';
export const STANDARD_GROUPS: Record<StandardGroup, { en: string; he: string }> = {
  blues: { en: 'Blues forms', he: 'צורות בלוז' },
  rhythm: { en: 'Rhythm changes', he: 'ריתם צ׳יינג׳ס' },
  swing: { en: 'Swing standards', he: 'סטנדרטים בסווינג' },
  ballad: { en: 'Ballads', he: 'בלדות' },
  latin: { en: 'Bossa and Latin', he: 'בוסה ולטיני' },
  modal: { en: 'Modal and jazz-funk', he: 'מודאלי וג׳אז־פאנק' },
  bebop: { en: 'Bebop and post-bop', he: 'ביבופ ופוסט־בופ' },
  coltrane: { en: 'Coltrane changes', he: 'קולטריין צ׳יינג׳ס' },
};

const A = { en: 'A section', he: 'חלק A' };
const FULL = { en: 'Whole form', he: 'כל הצורה' };
const BRIDGE = { en: 'Bridge', he: 'גשר' };
const AABA = { en: 'Whole form (AABA)', he: 'כל הצורה (AABA)' };
const HALF = { en: 'First half', he: 'החצי הראשון' };

/** Repeat a section text (helper for AABA forms). */
const j = (...parts: string[]) => parts.join(' | ');

const RHY_A1 = 'Bb G7 | Cm7 F7 | Bb G7 | Cm7 F7 | Bb Bb7 | Eb Edim7 | Bb G7 | Cm7 F7';
const RHY_A2 = 'Bb G7 | Cm7 F7 | Bb G7 | Cm7 F7 | Bb Bb7 | Eb Edim7 | Cm7 F7 | Bb';
const RHY_B = 'D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7';
const ATRAIN_A1 = 'C6 | C6 | D7#11 | D7#11 | Dm7 | G7 | C6 | Dm7 G7';
const ATRAIN_A2 = 'C6 | C6 | D7#11 | D7#11 | Dm7 | G7 | C6 | C6';
const SATIN_A = 'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7';
const IPA_A = 'Fmaj7 | Fmaj7 | G7 | G7 | Gm7 | Gb7 | Fmaj7 | Gb7';
const AUT_A = 'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm6 | Gm6';
const SOWHAT_A = 'Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7';
const SOWHAT_B = 'Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7';
const MAIDEN_A = 'D7sus4 | D7sus4 | D7sus4 | D7sus4 | F7sus4 | F7sus4 | F7sus4 | F7sus4';
const MAIDEN_B = 'Eb7sus4 | Eb7sus4 | Eb7sus4 | Eb7sus4 | C#m7 | C#m7 | C#m7 | C#m7';

export const STANDARD_CHANGES: StandardChanges[] = [
  // ---- blues
  { id: 'blues-f', group: 'blues', name: 'Jazz blues in F', part: FULL, text: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | D7b9 | Gm7 | C7 | F7 D7 | Gm7 C7', style: 'swing', bpm: 120, level: 1 },
  { id: 'blues-bb', group: 'blues', name: 'Jazz blues in B♭', part: FULL, text: 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | G7b9 | Cm7 | F7 | Bb7 G7 | Cm7 F7', style: 'swing', bpm: 126, level: 1 },
  { id: 'blues-basic', group: 'blues', name: 'Basic 12-bar blues in G', part: FULL, text: 'G7 | C7 | G7 | G7 | C7 | C7 | G7 | G7 | D7 | C7 | G7 | D7', style: 'rock', bpm: 110, level: 1 },
  { id: 'minor-blues', group: 'blues', name: 'Minor blues in C', part: FULL, text: 'Cm7 | Cm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7alt | Cm7 | Dm7b5 G7alt', style: 'swing', bpm: 132, level: 2 },
  { id: 'bird-blues', group: 'blues', name: 'Bird blues (Blues for Alice changes)', part: FULL, text: 'Fmaj7 | Em7b5 A7 | Dm7 G7 | Cm7 F7 | Bb7 | Bbm7 Eb7 | Am7 D7 | Abm7 Db7 | Gm7 | C7 | F7 D7 | Gm7 C7', style: 'swing', bpm: 150, level: 4 },
  { id: 'blues-waltz', group: 'blues', name: 'Blues waltz in F', part: FULL, text: 'F7 | Bb7 | F7 | F7 | Bb7 | Bb7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7', style: 'waltz', bpm: 150, level: 2 },
  // ---- rhythm changes
  { id: 'rhythm-full', group: 'rhythm', name: 'Rhythm changes in B♭', part: AABA, text: j(RHY_A1, RHY_A2, RHY_B, RHY_A2), style: 'swing', bpm: 170, level: 4 },
  { id: 'rhythm-a', group: 'rhythm', name: 'Rhythm changes', part: A, text: RHY_A1, style: 'swing', bpm: 160, level: 3 },
  { id: 'rhythm-bridge', group: 'rhythm', name: 'Rhythm changes', part: BRIDGE, text: RHY_B, style: 'swing', bpm: 170, level: 3 },
  // ---- swing standards
  { id: 'autumn', group: 'swing', name: 'Autumn Leaves', part: FULL, text: j(AUT_A, AUT_A, 'Am7b5 | D7b9 | Gm6 | Gm6 | Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm7 Gb7 | Fm7 E7 | Am7b5 | D7b9 | Gm6 | Gm6'), style: 'swing', bpm: 120, level: 2 },
  { id: 'fly', name: 'Fly Me to the Moon', group: 'swing', part: A, text: 'Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7 A7', style: 'swing', bpm: 120, level: 2 },
  { id: 'a-train', group: 'swing', name: 'Take the A Train', part: AABA, text: j(ATRAIN_A1, ATRAIN_A2, 'Fmaj7 | Fmaj7 | Fmaj7 | Fmaj7 | D7 | D7 | Dm7 | G7', ATRAIN_A2), style: 'swing', bpm: 150, level: 2 },
  { id: 'satin', group: 'swing', name: 'Satin Doll', part: AABA, text: j(SATIN_A, SATIN_A, 'Gm7 | C7 | Fmaj7 | Fmaj7 | Am7 | D7 | Dm7 | G7', SATIN_A), style: 'swing', bpm: 126, level: 3 },
  { id: 'attya', group: 'swing', name: 'All the Things You Are', part: FULL, text: 'Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | G7 | Cmaj7 | Cmaj7 | Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Am7b5 D7 | Gmaj7 | Gmaj7 | Am7 | D7 | Gmaj7 | Gmaj7 | F#m7b5 | B7 | Emaj7 | C7#5 | Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | Dbm7 | Cm7 | Bdim7 | Bbm7 | Eb7 | Abmaj7 | Gm7b5 C7', style: 'swing', bpm: 132, level: 3 },
  { id: 'tune-up', group: 'swing', name: 'Tune Up', part: FULL, text: 'Em7 | A7 | Dmaj7 | Dmaj7 | Dm7 | G7 | Cmaj7 | Cmaj7 | Cm7 | F7 | Bbmaj7 | Ebmaj7 | Em7 | A7 | Dmaj7 | Em7 A7', style: 'swing', bpm: 160, level: 3 },
  { id: 'never-another', group: 'swing', name: 'There Will Never Be Another You', part: HALF, text: 'Ebmaj7 | Ebmaj7 | Dm7b5 | G7 | Cm7 | Cm7 | Bbm7 | Eb7 | Abmaj7 | Db7 | Ebmaj7 | Cm7 | F7 | F7 | Fm7 | Bb7', style: 'swing', bpm: 150, level: 3 },
  { id: 'miss-jones', group: 'swing', name: 'Have You Met Miss Jones?', part: BRIDGE, text: 'Bbmaj7 | Abm7 Db7 | Gbmaj7 | Em7 A7 | Dmaj7 | Abm7 Db7 | Gbmaj7 | Gm7 C7', style: 'swing', bpm: 140, level: 4 },
  { id: 'stella', group: 'swing', name: 'Stella by Starlight', part: FULL, text: 'Em7b5 | A7 | Cm7 | F7 | Fm7 | Bb7 | Ebmaj7 | Ab7 | Bbmaj7 | Em7b5 A7 | Dm7 | Bbm7 Eb7 | Fmaj7 | Em7b5 A7 | Am7b5 | D7 | G7#5 | G7#5 | Cm7 | Cm7 | Ab7 | Ab7 | Bbmaj7 | Bbmaj7 | Em7b5 | A7 | Dm7b5 | G7 | Cm7b5 | F7 | Bbmaj7 | Bbmaj7', style: 'swing', bpm: 132, level: 5 },
  // ---- ballads
  { id: 'misty', group: 'ballad', name: 'Misty', part: A, text: 'Ebmaj7 | Bbm7 Eb7 | Abmaj7 | Abm7 Db7 | Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7 | Fm7 Bb7', style: 'ballad', bpm: 66, level: 3 },
  { id: 'valentine', group: 'ballad', name: 'My Funny Valentine', part: A, text: 'Cm | Cm(maj7) | Cm7 | Cm6 | Abmaj7 | Fm7 | Dm7b5 | G7b9', style: 'ballad', bpm: 60, level: 3 },
  { id: 'ballad-ii-v', group: 'ballad', name: 'Ballad turnarounds in E♭', part: FULL, text: 'Ebmaj7 Cm7 | Fm7 Bb7 | Gm7 C7b9 | Fm7 Bb7 | Ebmaj7 Eb7 | Abmaj7 Db7 | Gm7 C7 | Fm7 Bb7', style: 'ballad', bpm: 64, level: 2 },
  // ---- bossa / latin
  { id: 'blue-bossa', group: 'latin', name: 'Blue Bossa', part: FULL, text: 'Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7alt | Cm7 | Cm7 | Ebm7 | Ab7 | Dbmaj7 | Dbmaj7 | Dm7b5 | G7alt | Cm7 | Dm7b5 G7alt', style: 'bossa', bpm: 140, level: 3 },
  { id: 'ipanema', group: 'latin', name: 'The Girl from Ipanema', part: AABA, text: j(IPA_A, IPA_A, 'Gbmaj7 | Gbmaj7 | B7 | B7 | F#m7 | F#m7 | D7 | D7 | Gm7 | Gm7 | Eb7 | Eb7 | Am7 | D7b9 | Gm7 | C7b9', IPA_A), style: 'bossa', bpm: 130, level: 3 },
  { id: 'song-father', group: 'latin', name: 'Song for My Father', part: A, text: 'Fm7 | Fm7 | Eb7 | Eb7 | Db7 | C7 | Fm7 | Fm7', style: 'bossa', bpm: 120, level: 2 },
  { id: 'minor-bossa', group: 'latin', name: 'Minor bossa in A', part: FULL, text: 'Am7 | Am7 | Dm7 | Dm7 | Bm7b5 | E7b9 | Am7 | Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7 | Bm7b5 E7b9', style: 'bossa', bpm: 130, level: 2 },
  // ---- modal / jazz-funk
  { id: 'so-what', group: 'modal', name: 'So What / Impressions', part: AABA, text: j(SOWHAT_A, SOWHAT_A, SOWHAT_B, SOWHAT_A), style: 'swing', bpm: 140, level: 2 },
  { id: 'cantaloupe', group: 'modal', name: 'Cantaloupe Island', part: FULL, text: 'Fm7 | Fm7 | Fm7 | Fm7 | Db7 | Db7 | Db7 | Db7 | Dm7 | Dm7 | Dm7 | Dm7 | Fm7 | Fm7 | Fm7 | Fm7', style: 'pop', bpm: 112, level: 2 },
  { id: 'maiden', group: 'modal', name: 'Maiden Voyage', part: AABA, text: j(MAIDEN_A, MAIDEN_A, MAIDEN_B, MAIDEN_A), style: 'pop', bpm: 120, level: 3 },
  { id: 'chameleon', group: 'modal', name: 'Chameleon (vamp)', part: { en: 'Vamp', he: 'ווּמפּ' }, text: 'Bbm7 Eb7 | Bbm7 Eb7 | Bbm7 Eb7 | Bbm7 Eb7', style: 'rock', bpm: 96, level: 1 },
  { id: 'dorian-vamp', group: 'modal', name: 'Two-chord dorian vamp', part: { en: 'Vamp', he: 'ווּמפּ' }, text: 'Dm7 | G7 | Dm7 | G7', style: 'pop', bpm: 100, level: 1 },
  // ---- bebop / post-bop
  { id: 'solar', group: 'bebop', name: 'Solar', part: FULL, text: 'Cm(maj7) | Cm(maj7) | Gm7 | C7 | Fmaj7 | Fmaj7 | Fm7 | Bb7 | Ebmaj7 | Ebm7 Ab7 | Dbmaj7 | Dm7b5 G7', style: 'swing', bpm: 140, level: 4 },
  { id: 'ladybird', group: 'bebop', name: 'Lady Bird', part: FULL, text: 'Cmaj7 | Cmaj7 | Fm7 | Bb7 | Cmaj7 | Cmaj7 | Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Am7 | D7 | Dm7 | G7 | Cmaj7 Eb7 | Abmaj7 Db7', style: 'swing', bpm: 150, level: 4 },
  { id: 'two-five-keys', group: 'bebop', name: 'ii–V–I through all twelve keys', part: FULL, text: 'Dm7 | G7 | Cmaj7 | Cmaj7 | Cm7 | F7 | Bbmaj7 | Bbmaj7 | Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Abm7 | Db7 | Gbmaj7 | Gbmaj7 | F#m7 | B7 | Emaj7 | Emaj7 | Em7 | A7 | Dmaj7 | Dmaj7', style: 'swing', bpm: 140, level: 3 },
  { id: 'minor-two-five-keys', group: 'bebop', name: 'Minor ii–V–i around the cycle', part: FULL, text: 'Dm7b5 | G7alt | Cm6 | Cm6 | Gm7b5 | C7alt | Fm6 | Fm6 | Cm7b5 | F7alt | Bbm6 | Bbm6 | Fm7b5 | Bb7alt | Ebm6 | Ebm6', style: 'swing', bpm: 132, level: 4 },
  // ---- Coltrane
  { id: 'giant', group: 'coltrane', name: 'Giant Steps', part: FULL, text: 'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 | C#m7 F#7 | Bmaj7 | Fm7 Bb7 | Ebmaj7 | C#m7 F#7', style: 'swing', bpm: 200, level: 5 },
  // ---- common practice forms (0.64, written for the bass course: chord progressions only, no tune's melody)
  { id: 'turnarounds-f', group: 'swing', name: 'I–vi–ii–V turnarounds in F', part: FULL, text: 'Fmaj7 Dm7 | Gm7 C7 | Am7 D7 | Gm7 C7 | Fmaj7 F7 | Bbmaj7 Eb7 | Am7 D7 | Gm7 C7', style: 'swing', bpm: 132, level: 2 },
  { id: 'backdoor-g', group: 'swing', name: 'Backdoor ii–V study in G', part: FULL, text: 'Gmaj7 | Gmaj7 | Cm7 | F7 | Gmaj7 | Em7 | Am7 | D7 | Bm7 | E7 | Am7 | D7 | Cm7 | F7 | Gmaj7 | Am7 D7', style: 'swing', bpm: 126, level: 3 },
  { id: 'sec-dominants-c', group: 'swing', name: 'Secondary dominants in C', part: FULL, text: 'Cmaj7 | A7 | Dm7 | G7 | Em7 | A7 | Dm7 G7 | Cmaj7 | E7 | E7 | Am7 | D7 | Dm7 | G7 | Cmaj7 A7 | Dm7 G7', style: 'swing', bpm: 140, level: 2 },
  { id: 'modal-a', group: 'modal', name: 'Two-mode form in A (dorian, lydian)', part: AABA, text: 'Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | Bbmaj7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7', style: 'swing', bpm: 150, level: 2 },
  { id: 'giant-slow', group: 'coltrane', name: 'Giant Steps (slow practice)', part: FULL, text: 'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 | C#m7 F#7 | Bmaj7 | Fm7 Bb7 | Ebmaj7 | C#m7 F#7', style: 'swing', bpm: 110, level: 4 },
];

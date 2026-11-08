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
  /** 1 easy … 5 hard to improvise / voice over. */
  level: number;
}

export const STANDARD_CHANGES: StandardChanges[] = [
  { id: 'autumn', name: 'Autumn Leaves', part: { en: 'A section', he: 'חלק A' }, text: 'Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm6 | Gm6', style: 'swing', bpm: 120, level: 2 },
  { id: 'fly', name: 'Fly Me to the Moon', part: { en: 'A section', he: 'חלק A' }, text: 'Am7 | Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7b9 | Am7 A7', style: 'swing', bpm: 120, level: 2 },
  { id: 'a-train', name: 'Take the A Train', part: { en: 'A section', he: 'חלק A' }, text: 'Cmaj7 | Cmaj7 | D7#11 | D7#11 | Dm7 | G7 | Cmaj7 | Dm7 G7', style: 'swing', bpm: 150, level: 2 },
  { id: 'satin', name: 'Satin Doll', part: { en: 'A section', he: 'חלק A' }, text: 'Dm7 G7 | Dm7 G7 | Em7 A7 | Em7 A7 | Am7 D7 | Abm7 Db7 | Cmaj7 | Cmaj7', style: 'swing', bpm: 126, level: 3 },
  { id: 'blue-bossa', name: 'Blue Bossa', part: { en: 'Whole form', he: 'כל הצורה' }, text: 'Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7alt | Cm7 | Cm7 | Ebm7 | Ab7 | Dbmaj7 | Dbmaj7 | Dm7b5 | G7alt | Cm7 | Dm7b5 G7alt', style: 'bossa', bpm: 140, level: 3 },
  { id: 'attya', name: 'All the Things You Are', part: { en: 'First A', he: 'A ראשון' }, text: 'Fm7 | Bbm7 | Eb7 | Abmaj7 | Dbmaj7 | G7 | Cmaj7 | Cmaj7', style: 'swing', bpm: 132, level: 3 },
  { id: 'solar', name: 'Solar', part: { en: 'Whole form', he: 'כל הצורה' }, text: 'Cm(maj7) | Cm(maj7) | Gm7 | C7 | Fmaj7 | Fmaj7 | Fm7 | Bb7 | Ebmaj7 | Ebm7 Ab7 | Dbmaj7 | Dm7b5 G7', style: 'swing', bpm: 140, level: 4 },
  { id: 'bird-blues', name: 'Bird blues (Blues for Alice)', part: { en: 'Whole form', he: 'כל הצורה' }, text: 'Fmaj7 | Em7b5 A7 | Dm7 G7 | Cm7 F7 | Bb7 | Bbm7 Eb7 | Am7 D7 | Abm7 Db7 | Gm7 | C7 | F7 D7 | Gm7 C7', style: 'swing', bpm: 150, level: 4 },
  { id: 'ladybird', name: 'Lady Bird', part: { en: 'Whole form', he: 'כל הצורה' }, text: 'Cmaj7 | Cmaj7 | Fm7 | Bb7 | Cmaj7 | Cmaj7 | Bbm7 | Eb7 | Abmaj7 | Abmaj7 | Am7 | D7 | Dm7 | G7 | Cmaj7 Eb7 | Abmaj7 Db7', style: 'swing', bpm: 150, level: 4 },
  { id: 'rhythm-bridge', name: 'Rhythm changes', part: { en: 'Bridge', he: 'גשר' }, text: 'D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7', style: 'swing', bpm: 170, level: 3 },
  { id: 'so-what', name: 'So What / Impressions', part: { en: 'A and B (modal)', he: 'A ו־B (מודאלי)' }, text: 'Dm7 | Dm7 | Dm7 | Dm7 | Ebm7 | Ebm7 | Ebm7 | Ebm7', style: 'swing', bpm: 140, level: 2 },
  { id: 'giant', name: 'Giant Steps', part: { en: 'First 8 bars', he: '8 התיבות הראשונות' }, text: 'Bmaj7 D7 | Gmaj7 Bb7 | Ebmaj7 | Am7 D7 | Gmaj7 Bb7 | Ebmaj7 F#7 | Bmaj7 | Fm7 Bb7', style: 'swing', bpm: 200, level: 5 },
];

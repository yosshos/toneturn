// Openings of well-known public-domain melodies (traditional tunes, or composers who died long ago),
// as scale degrees in a major key with their rhythm. Only the first few notes are used — enough to
// recognise the tune — and every note stays within degrees 1–7 above the tonic, as written here.

export interface SongOpening {
  id: string;
  title: { en: string; he: string };
  /** Source, for the credits line. */
  source: string;
  degrees: number[];
  /** Note lengths in beats. */
  beats: number[];
  /** Chromatic / minor openings (0.70 PD catalogue, engine/pdTunes.ts): semitones above the tonic, used instead of `degrees`. */
  semis?: number[];
}

export const SONGS: SongOpening[] = [
  { id: 'twinkle', title: { en: 'Twinkle, Twinkle, Little Star', he: 'כוכב קטן' }, source: 'French folk tune, 18th c.', degrees: [1, 1, 5, 5, 6, 6, 5], beats: [1, 1, 1, 1, 1, 1, 2] },
  { id: 'ode', title: { en: 'Ode to Joy', he: 'האודה לשמחה' }, source: 'Beethoven, 1824', degrees: [3, 3, 4, 5, 5, 4, 3, 2], beats: [1, 1, 1, 1, 1, 1, 1, 1] },
  { id: 'jacques', title: { en: 'Frère Jacques', he: 'האח יעקב' }, source: 'French traditional', degrees: [1, 2, 3, 1, 1, 2, 3, 1], beats: [1, 1, 1, 1, 1, 1, 1, 1] },
  { id: 'mary', title: { en: 'Mary Had a Little Lamb', he: 'למרי היה כבש קטן' }, source: 'Lowell Mason, 1830s', degrees: [3, 2, 1, 2, 3, 3, 3], beats: [1.5, 0.5, 1, 1, 1, 1, 2] },
  { id: 'yonatan', title: { en: 'Yonatan HaKatan (Hänschen klein)', he: 'יונתן הקטן' }, source: 'German folk tune', degrees: [5, 3, 3, 4, 2, 2], beats: [1, 1, 2, 1, 1, 2] },
  { id: 'row', title: { en: 'Row, Row, Row Your Boat', he: 'חתירה בסירה' }, source: 'traditional, 1852', degrees: [1, 1, 1, 2, 3], beats: [1.5, 1.5, 1, 0.5, 1.5] },
  { id: 'yankee', title: { en: 'Yankee Doodle', he: 'יאנקי דודל' }, source: 'traditional, 18th c.', degrees: [1, 1, 2, 3, 1, 3, 2], beats: [1, 1, 1, 1, 1, 1, 2] },
  { id: 'london', title: { en: 'London Bridge', he: 'גשר לונדון' }, source: 'traditional', degrees: [5, 6, 5, 4, 3, 4, 5], beats: [1.5, 0.5, 1, 1, 1, 1, 2] },
  { id: 'saints', title: { en: 'When the Saints Go Marching In', he: 'כשהקדושים צועדים' }, source: 'traditional spiritual', degrees: [1, 3, 4, 5], beats: [1, 1, 1, 4] },
  { id: 'jingle', title: { en: 'Jingle Bells', he: 'ג׳ינגל בלס' }, source: 'James Lord Pierpont, 1857', degrees: [3, 3, 3, 3, 3, 3, 3, 5, 1, 2, 3], beats: [1, 1, 2, 1, 1, 2, 1, 1, 1.5, 0.5, 4] },
];

export const songById = (id: string) => SONGS.find((s) => s.id === id);

/** The first `n` notes of a song (recognisable opening). */
export const opening = (s: SongOpening, n = s.degrees.length) => ({ degrees: s.degrees.slice(0, n), beats: s.beats.slice(0, n) });

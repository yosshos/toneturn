// Name That Tune: the public-domain catalogue of its upper tiers (GAMES_TIERS_PLAN §2.4, 0.70). Only tunes that are
// public domain WORLDWIDE (docs/research/STANDARDS_LEGAL.md tier 1A: traditional, or published 1930 or earlier with
// every composer dead by 1955) — so no Handy, Gershwin, Von Tilzer, Sousa-era doubts, no Hava Nagila (lyric credit
// unclear). Openings only (a few notes), written as semitones above the tonic of the key the round is played in.
// Written out by us from the tunes as commonly known, not copied from a modern edition. The source line is shown in
// the credits; the owner should check each opening against period sheet music before release (STANDARDS_LEGAL §2).

import type { SongOpening } from './songs';
import { SONGS } from './songs';
import type { DynName } from './courseSocial';

/** A catalogue tune: its opening as semitones (`semis`), and which tier first plays it. */
export interface PdTune extends SongOpening {
  semis: number[];
  /** Written in a minor key (the f-tier minor mutation leaves it alone). */
  minor?: boolean;
  /** First tier that plays it: p = more folk, mp = classical themes, mf = ragtime / parlour / dance. */
  from: 'p' | 'mp' | 'mf';
}

const T = (id: string, en: string, he: string, source: string, from: PdTune['from'], semis: number[], beats: number[], minor = false): PdTune => ({ id, title: { en, he }, source, degrees: [], semis, beats, from, ...(minor ? { minor } : {}) });

export const PD_TUNES: PdTune[] = [
  // ---- p: more folk songs and spirituals (traditional)
  T('auld', 'Auld Lang Syne', 'אולד לאנג סיין', 'Scottish traditional (words: Burns, 1788)', 'p', [-5, 0, 0, 0, 4, 2, 0, 2, 4], [1, 1.5, 0.5, 1, 1, 1.5, 0.5, 1, 1]),
  T('greensleeves', 'Greensleeves', 'גרינסליבס', 'English traditional, 16th c.', 'p', [0, 3, 5, 7, 8, 7, 5, 2, -2], [1, 2, 1, 1.5, 0.5, 1, 2, 1, 1.5], true),
  T('scarborough', 'Scarborough Fair', 'יריד סקרבורו', 'English traditional', 'p', [0, 0, 7, 7, 7, 2, 3, 2, 0], [2, 1, 2, 1, 1, 1.5, 0.5, 1, 3], true),
  T('amazing', 'Amazing Grace', 'אמייזינג גרייס', 'American traditional melody "New Britain", 1829', 'p', [-5, 0, 4, 0, 4, 2, 0, -3, -5], [1, 2, 0.5, 0.5, 2, 1, 2, 1, 2]),
  T('michael', 'Michael, Row the Boat Ashore', 'מייקל, חתור לחוף', 'African-American spiritual, 19th c.', 'p', [0, 4, 7, 4, 7, 9, 7], [1, 1, 1.5, 0.5, 1, 1, 2]),
  T('mountain', "She'll Be Coming 'Round the Mountain", 'היא תבוא מסביב להר', 'American traditional, 19th c.', 'p', [-5, -3, 0, 0, 0, 0, -3, -5, -8, -5, 0], [0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 1, 3]),
  T('macdonald', 'Old MacDonald Had a Farm', 'לדוד משה הייתה חווה', 'traditional', 'p', [0, 0, 0, -5, -3, -3, -5], [1, 1, 1, 1, 1, 1, 2]),
  T('birthday', 'Happy Birthday to You', 'יום הולדת שמח', 'Mildred J. Hill (d. 1916) / Patty Hill (d. 1946)', 'p', [-5, -5, -3, -5, 0, -1], [0.75, 0.25, 1, 1, 1, 2]),
  T('range', 'Home on the Range', 'בית בערבה', 'Daniel E. Kelley (d. 1905), 1873', 'p', [-5, -5, 0, 2, 4, 0, -1, -3, -7, -7, -7], [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2]),
  // ---- mp: classical themes (composers long dead)
  T('elise', 'Für Elise', 'לאליזה', 'Beethoven (d. 1827)', 'mp', [7, 6, 7, 6, 7, 2, 5, 3, 0], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], true),
  T('fifth', 'Symphony No. 5 (opening)', 'הסימפוניה החמישית (פתיחה)', 'Beethoven (d. 1827)', 'mp', [7, 7, 7, 3, 5, 5, 5, 2], [0.5, 0.5, 0.5, 2, 0.5, 0.5, 0.5, 2], true),
  T('nacht', 'Eine kleine Nachtmusik', 'מוזיקת לילה זעירה', 'Mozart (d. 1791)', 'mp', [0, -5, 0, -5, 0, -5, 0, 4, 7], [1, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 2]),
  T('fortieth', 'Symphony No. 40 (opening)', 'הסימפוניה ה־40 (פתיחה)', 'Mozart (d. 1791)', 'mp', [8, 7, 7, 8, 7, 7, 8, 7, 7, 15], [0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 2], true),
  T('minuet', 'Minuet in G', 'מינואט בסול', 'Christian Petzold (d. 1733), from the Anna Magdalena Bach notebook', 'mp', [7, 0, 2, 4, 5, 7, 0, 0], [1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1]),
  T('newworld', 'New World Symphony (Largo)', 'סימפוניית העולם החדש (לרגו)', 'Dvořák (d. 1904)', 'mp', [4, 7, 7, 4, 2, 0, 2, 4, 7, 4, 2], [1.5, 0.5, 2, 1.5, 0.5, 2, 1, 1, 1, 1, 3]),
  T('morning', 'Morning Mood', 'מצב רוח של בוקר', 'Grieg (d. 1907)', 'mp', [7, 4, 2, 0, 2, 4, 7, 4, 2, 0, 2, 4], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5]),
  T('mountainking', 'In the Hall of the Mountain King', 'בהיכל מלך ההרים', 'Grieg (d. 1907)', 'mp', [0, 2, 3, 5, 7, 3, 7], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1], true),
  T('lullaby', 'Lullaby (Wiegenlied)', 'שיר הערש של ברהמס', 'Brahms (d. 1897)', 'mp', [4, 4, 7, 4, 4, 7, 4, 7, 12, 11, 9, 9, 7], [0.5, 0.5, 2, 0.5, 0.5, 2, 0.5, 0.5, 1, 1.5, 0.5, 1, 1]),
  T('swan', 'Swan Lake (theme)', 'אגם הברבורים (נושא)', 'Tchaikovsky (d. 1893)', 'mp', [7, 0, 2, 3, 5, 7, 3, 7, 3, 7], [3, 0.5, 0.5, 0.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5], true),
  T('turkish', 'Rondo alla Turca', 'רונדו אלה טורקה', 'Mozart (d. 1791)', 'mp', [2, 0, -1, 0, 3, 5, 3, 2, 3, 7], [0.25, 0.25, 0.25, 0.25, 1, 0.25, 0.25, 0.25, 0.25, 1], true),
  T('toccata', 'Toccata in D minor', 'טוקטה ברה מינור', 'J. S. Bach (d. 1750)', 'mp', [7, 5, 7, 5, 3, 2, 0, -1, 0], [0.25, 0.25, 2, 0.25, 0.25, 0.25, 0.25, 1, 2], true),
  T('bridal', 'Bridal Chorus', 'מקהלת הכלה', 'Wagner (d. 1883)', 'mp', [-5, 0, 0, 0, -5, 2, -1, 0], [1, 0.75, 0.25, 2, 1, 0.75, 0.25, 2]),
  T('spring', 'Spring (The Four Seasons)', 'האביב (ארבע העונות)', 'Vivaldi (d. 1741)', 'mp', [0, 4, 4, 4, 2, 0, 7], [1, 0.5, 0.5, 0.5, 0.25, 0.25, 2]),
  // ---- mf: ragtime, parlour songs, dances
  T('entertainer', 'The Entertainer', 'הבדרן', 'Scott Joplin (d. 1917), 1902', 'mf', [2, 3, 4, 12, 4, 12, 4, 12], [0.25, 0.25, 0.25, 0.5, 0.25, 0.5, 0.25, 1.5]),
  T('susanna', 'Oh! Susanna', 'הו! סוזנה', 'Stephen Foster (d. 1864), 1848', 'mf', [0, 2, 4, 7, 7, 9, 7, 4, 0, 2, 4, 4, 2, 0, 2], [0.5, 0.5, 1, 1, 0.75, 0.25, 1, 1, 0.75, 0.25, 1, 1, 1, 1, 2]),
  T('camptown', 'Camptown Races', 'המרוצים בקמפטאון', 'Stephen Foster (d. 1864), 1850', 'mf', [7, 7, 4, 7, 9, 7, 4, 4, 2, 4, 2], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 1.5, 0.5, 1.5]),
  T('swanee', 'Old Folks at Home (Swanee River)', 'נהר סוואני', 'Stephen Foster (d. 1864), 1851', 'mf', [4, 2, 0, 4, 2, 0, 12, 9, 12, 7], [1.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 2]),
  T('danube', 'The Blue Danube', 'הדנובה הכחולה', 'Johann Strauss II (d. 1899)', 'mf', [0, 0, 4, 7, 7, 19, 19, 16, 16], [1, 1, 1, 1, 2, 1, 2, 1, 2]),
  T('cancan', 'Galop infernal (Can-can)', 'קאן־קאן', 'Offenbach (d. 1880)', 'mf', [-5, -3, 0, -1, -3, 2, 2, 2, 4, -1, 0], [1, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5]),
];

/** The folk openings the game always had, as catalogue tunes (major scale degrees → semitones). */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const degreeSemis = (degrees: number[]): number[] => degrees.map((d) => MAJOR[(((d - 1) % 7) + 7) % 7] + 12 * Math.floor((d - 1) / 7));

/** The tunes a tier plays (pp the original 10 folk songs; each tier adds its group; f and ff play everything). */
export function tuneCatalogue(tier: DynName): SongOpening[] {
  const order: DynName[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];
  const i = order.indexOf(tier);
  if (i <= 0) return SONGS;
  if (i === 1) return [...SONGS, ...PD_TUNES.filter((t) => t.from === 'p')];
  if (i === 2) return PD_TUNES.filter((t) => t.from === 'mp' || t.from === 'p');
  if (i === 3) return PD_TUNES.filter((t) => t.from === 'mf' || t.from === 'mp');
  return [...SONGS, ...PD_TUNES];
}
export const tuneById = (id: string): SongOpening | undefined => SONGS.find((s) => s.id === id) ?? PD_TUNES.find((s) => s.id === id);

/** The minor mutation of the f tier: a major-key opening with its 3rd, 6th and 7th lowered (minor tunes stay). */
export function minorMutation(s: SongOpening): SongOpening {
  if ((s as PdTune).minor) return s;
  const semis = s.semis ?? degreeSemis(s.degrees);
  return { ...s, degrees: [], semis: semis.map((x) => (([4, 9, 11] as number[]).includes(((x % 12) + 12) % 12) ? x - 1 : x)) };
}

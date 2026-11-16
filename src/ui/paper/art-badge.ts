// Paper drawings for the badges: the badge-only subjects (streaks, counts, seasons, specials) and the map from a badge's
// glyph key (BadgeArt glyphKeyOf) to its drawing. Families and games reuse their path-step drawing (FAMILY_GLYPH,
// GAME_STEP_GLYPH); everything renders in the badge cut (ג‰¥ 64 px detail).
import { FAMILY_GLYPH, GAME_STEP_GLYPH } from '../stepGlyphs';
import { PAPER } from './index';
import { art, Ci, det, H, L, markArt, P, R, rich, star, T, type Art, type HueName } from './kit';

/** A count on a laurel plaque: "50", "200", "1000". */
const count = (text: string, hue: HueName, hue2: HueName): Art =>
  markArt(text, hue, hue2, [
    ...rich(P('M6 44 C 3 38, 3 30, 6 25', 'accentline', 1.6), P('M42 44 C 45 38, 45 30, 42 25', 'accentline', 1.6)),
    P(star(41, 9, 5.2), 'accent'),
  ]);
/** A calendar page with a figure on it. */
const cal = (text: string, hue: HueName, hue2: HueName, dots = 0): Art =>
  art(
    hue,
    hue2,
    R(5, 8, 38, 37, 6, 'light'),
    R(5, 8, 38, 11, 6, 'body'),
    R(5, 14, 38, 5, 0, 'body'),
    R(12.5, 3.5, 4.4, 10, 2.2, 'mark'),
    R(31, 3.5, 4.4, 10, 2.2, 'mark'),
    T(24, dots ? 34 : 39, text, dots ? 14 : 17, 'ink'),
    ...Array.from({ length: dots }, (_, i) => Ci(10.5 + i * 4.5, 40.5, 1.6, i === dots - 1 ? 'accent' : 'ink')),
    rich(H(38, 25, 2.4, 'accent')),
  );
/** A metronome showing a tempo record. */
const tempo = (text: string): Art =>
  art(
    'tan',
    'purple',
    P('M12 44 L17 7 Q24 2 31 7 L36 44 Z', 'body'),
    P('M16.6 40 L20.4 12 Q24 9.5 27.6 12 L31.4 40 Z', 'light'),
    L(24, 37, 33.5, 14, 'inkline', 2.4),
    R(28.5, 21, 6.4, 4.6, 1.4, 'accent', 'rotate(-22 31.7 23.3)'),
    R(9, 41.5, 30, 4.5, 2, 'mark'),
    T(24, 34, text, text.length > 2 ? 9 : 11, 'ink'),
    det(L(19.5, 18, 22, 18), L(19, 24, 21.5, 24)),
  );
/** A seal of clean takes with a count. */
const clean = (text: string): Art =>
  art(
    'teal',
    'purple',
    P(star(24, 22, 19, 0.86, 14), 'body'),
    Ci(24, 22, 13.5, 'light'),
    P('M16.5 21.5 L22 27 L32 15.5', 'inkline', 3.2),
    P('M15 40 L11 47 L17 45 L20 48 L22 41 Z', 'accent'),
    P('M33 40 L37 47 L31 45 L28 48 L26 41 Z', 'accent'),
    T(24, 37.6, text, text.length > 3 ? 7 : 8.5, 'ink'),
  );

export const BADGE_ONLY: Record<string, Art> = {
  /** Around the clock: all twelve keys on a dial. */
  clock12: art(
    'purple',
    'tan',
    Ci(24, 25, 20, 'body'),
    Ci(24, 25, 15.5, 'light'),
    ...Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return Ci(Math.round((24 + Math.cos(a) * 12.4) * 10) / 10, Math.round((25 + Math.sin(a) * 12.4) * 10) / 10, i % 3 ? 1.1 : 1.8, i === 0 ? 'accent' : 'ink');
    }),
    H(24, 25, 4.4, 'accent'),
    L(27.6, 24, 27.6, 14.5, 'inkline', 2),
    rich(P('M10 13 A 18 18 0 0 1 20 7', 'shine', 1.4)),
  ),
  /** Three in a row: a triad of note heads, one stem, a star. */
  hattrick: art(
    'tan',
    'purple',
    R(5, 10, 32, 34, 6, 'light'),
    H(17, 36, 5.2, 'body'),
    H(17, 27, 5.2, 'body'),
    H(17, 18, 5.2, 'accent'),
    L(21.8, 17, 21.8, 5, 'wire', 2.2),
    det(L(8, 22.5, 34, 22.5, 'line', 0.9), L(8, 31.5, 34, 31.5, 'line', 0.9)),
    P(star(38, 12, 8), 'accent'),
    rich(P(star(38, 12, 3.6), 'light')),
  ),
  /** The first: one note, flagged, with a spark. */
  firstnote: art(
    'pink',
    'purple',
    Ci(24, 26, 19, 'light'),
    H(20, 33, 7, 'body'),
    L(26.4, 31.2, 26.4, 9, 'inkline', 2.6),
    P('M26.4 9.2 C 33 11, 36 15, 33 22 C 33 17, 30 15, 26.4 15', 'accent'),
    P(star(39, 9, 5), 'accent'),
    rich(H(18, 31.6, 2.4, 'light')),
  ),
  /** Seven seas: a ship's wheel with seven spokes (seven courses / keys). */
  wheel: art(
    'sky',
    'tan',
    ...Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const x = Math.round((24 + Math.cos(a) * 20) * 10) / 10;
      const y = Math.round((25 + Math.sin(a) * 20) * 10) / 10;
      return [L(24, 25, x, y, 'tube', 3.2), Ci(x, y, 2.6, 'accent')];
    }).flat(),
    Ci(24, 25, 14, 'body'),
    Ci(24, 25, 9.5, 'light'),
    H(24, 25, 4.6, 'ink'),
    rich(P('M14 18 A 12 12 0 0 1 22 13', 'shine', 1.4)),
  ),
  /** Dawn chorus: the sun rising behind a line of note heads. */
  dawn: art(
    'tan',
    'pink',
    P('M6 34 A 18 18 0 0 1 42 34 Z', 'body'),
    P('M13 34 A 11 11 0 0 1 35 34 Z', 'light'),
    det(L(24, 6, 24, 11, 'accentline', 2), L(8, 14, 11.5, 17.5, 'accentline', 2), L(40, 14, 36.5, 17.5, 'accentline', 2)),
    R(3, 34, 42, 4, 1.6, 'mark'),
    H(13, 43, 3.4, 'accent'),
    H(24, 42, 3.4, 'accent'),
    H(35, 41, 3.4, 'accent'),
    rich(P('M17 30 A 7 7 0 0 1 22 25', 'shine', 1.2)),
  ),
  /** Midnight jazz: a crescent moon and a swung note. */
  midnight: art(
    'indigo',
    'tan',
    P('M30 5 C 17 6, 9 15, 9 27 C 9 39, 19 46, 30 45 C 21 41, 17 34, 17 26 C 17 17, 22 9, 30 5 Z', 'body'),
    det(P(star(38, 10, 3.2), 'accent'), P(star(43, 21, 2.2), 'accent')),
    H(33, 37, 4.8, 'accent'),
    L(37.4, 35.8, 37.4, 20, 'wire', 2.2),
    P('M37.4 20.2 Q42.5 22 41 27', 'wire', 2),
    rich(P('M13 20 C 12 25, 12 30, 14 34', 'shine', 1.3)),
  ),
  /** Hall of fame: a portico on a plinth with a note in the pediment. */
  pillars: art(
    'lilac',
    'tan',
    P('M4 15 L24 4 L44 15 Z', 'body'),
    R(7, 15, 34, 4, 1, 'body'),
    R(10, 20, 5.5, 18, 1.2, 'light'),
    R(21.25, 20, 5.5, 18, 1.2, 'light'),
    R(32.5, 20, 5.5, 18, 1.2, 'light'),
    R(5, 38, 38, 4, 1.2, 'body'),
    R(3, 42, 42, 4, 1.4, 'mark'),
    H(24, 11.2, 2.8, 'accent'),
    rich(L(12.75, 22, 12.75, 36, 'line', 0.8), L(24, 22, 24, 36, 'line', 0.8), L(35.25, 22, 35.25, 36, 'line', 0.8)),
  ),
  /** The four seasons: a dial cut in four, one quarter lit. */
  seasons: art(
    'green',
    'tan',
    Ci(24, 25, 19, 'light'),
    P('M24 25 L24 6 A 19 19 0 0 1 43 25 Z', 'body'),
    P('M24 25 L5 25 A 19 19 0 0 1 24 6 Z', 'accent'),
    det(L(24, 6, 24, 44, 'line', 1), L(5, 25, 43, 25, 'line', 1)),
    H(24, 25, 4.4, 'ink'),
    rich(P(star(33, 34, 3), 'body'), Ci(15, 34, 2.4, 'body')),
  ),
};

/** Badge glyph key ג†’ Paper drawing name (or a badge-only drawing). Families and games are resolved by their step glyph. */
const MAP: Record<string, string | Art> = {
  'area:pitch': 'ear', 'area:time': 'tempo', 'area:memory': 'memory', 'area:voice': 'sing', 'area:reading': 'sight', 'area:creative': 'improv', 'area:instrument': 'guitar', 'area:technique': 'keys',
  'skill:degrees': 'm:lesson:degrees-135', 'skill:intervals': 'intervals', 'skill:chords': 'chords', 'skill:cadences': 'prog', 'skill:modes': 'm:modes-ear', 'skill:pitch': 'tune', 'skill:absolute': 'name',
  'skill:rhythm-dictation': 'm:lesson:dictation', 'skill:rhythm-reading': 'counting', 'skill:timing': 'pulse', 'skill:tempo': 'slow', 'skill:meter': 'oddmeter', 'skill:sequences': 'm:lesson:note-sequences',
  'skill:rhythm': 'rhythm', 'skill:form': 'roadmap', 'skill:singing': 'sing', 'skill:technique': 'fingers1234', 'skill:agility': 'scalerush', 'skill:notes': 'clefs', 'skill:theory': 'theory', 'skill:sight': 'sight',
  'skill:dictation': 'transcribe', 'skill:improv': 'improv', 'skill:transpose': 'keymove', 'skill:expression': 'hairpin', 'skill:instrument': 'fretboard', 'skill:timbre': 'eq',
  'family:guitar': 'guitar', 'family:bass': 'bass', 'family:drums': 'drums', 'family:voice': 'sing',
  'tech:g-bend-tune': 'bend', 'tech:g-vibrato': 'contour', 'tech:g-five-boxes': 'box', 'tech:g-caged': 'chordbox', 'tech:g-changes-30': 'changerace', 'tech:g-changes-60': 'strumchange', 'tech:g-barre': 'fretboard', 'tech:g-jukebox': 'songstrum', 'tech:g-bassist': 'bass',
  keys: BADGE_ONLY.clock12,
  'tech:even-3': 'indep', 'tech:even-2': 'mango', 'tech:clean-10': clean('10'), 'tech:clean-100': clean('100'), 'tech:clean-1000': clean('1000'),
  'tech:lick-first': 'lick', 'tech:lick-10': 'riff', 'tech:lick-12keys': 'keymove', 'tech:tx-first': 'transcribe', 'tech:tx-bebop': 'txrace',
  'tech:tempo-1': tempo('+1'), 'tech:tempo-25': tempo('25'), 'tech:tempo-100': tempo('100'),
  'special:hat-trick': BADGE_ONLY.hattrick, 'special:fortnight': cal('14', 'tan', 'pink'), 'special:unit-mastered': 'trophy', 'special:tier': 'star', 'special:first': BADGE_ONLY.firstnote, 'special:rep': 'repstep',
  'special:half-century': count('50', 'tan', 'purple'), 'special:two-hundred': count('200', 'purple', 'tan'), 'special:weekly-ritual': cal('7', 'teal', 'purple', 7), 'special:iron-routine': 'fire',
  'special:seven-seas': BADGE_ONLY.wheel, 'special:swiss-army-ears': 'ear', 'special:dawn-chorus': BADGE_ONLY.dawn, 'special:midnight-jazz': BADGE_ONLY.midnight, 'special:weekend-warrior': cal('2', 'pink', 'purple', 2),
  'special:marathon': 'slow', 'special:bullseye-day': 'target', 'special:grand-tour': 'roadmap', 'special:renaissance': 'kclassic', 'special:hall-of-fame': BADGE_ONLY.pillars,
  'season:first': 'firstnote', 'season:three': count('3', 'green', 'tan'), 'season:vivaldi': BADGE_ONLY.seasons, 'season:full-rotation': 'seasons', 'season:year': count('365', 'green', 'purple'),
  'season:gold-rush': count('1st', 'tan', 'purple'), 'season:golden-trio': BADGE_ONLY.hattrick,
};

/** The Paper drawing for a badge glyph key, or null (the old line glyph then draws). */
export function badgePaper(key: string): Art | null {
  const m = MAP[key];
  if (m) return typeof m === 'string' ? (PAPER[m] ?? BADGE_ONLY[m] ?? null) : m;
  const fam = /^family:(.+)$/.exec(key);
  if (fam) {
    const g = FAMILY_GLYPH[fam[1]];
    if (g && PAPER[g]) return PAPER[g];
    if (fam[1].startsWith('g-')) return PAPER.guitar;
    if (fam[1].startsWith('b-')) return PAPER.bass;
    if (fam[1].startsWith('d-')) return PAPER.drums;
    if (fam[1].startsWith('v-')) return PAPER.sing;
    if (fam[1].startsWith('k-')) return PAPER.keys;
    return null;
  }
  const game = /^special:game:(.+)$/.exec(key);
  if (game) {
    const g = GAME_STEP_GLYPH[game[1]];
    return g && PAPER[g] ? PAPER[g] : null;
  }
  if (key.startsWith('special:tier')) return PAPER.star;
  if (key.startsWith('special:rep:')) return PAPER.repstep;
  if (key.startsWith('special:first:')) return BADGE_ONLY.firstnote;
  if (key.startsWith('special:units-mastered')) return PAPER.trophy;
  return null;
}
/** Every mapped key (for tests). */
export const BADGE_MAP_KEYS = Object.keys(MAP);


// Paper chrome symbols for the app frame: home, menu, settings, sidebar, profile, friends, stats, practice hub (see
// art-chrome.ts for the cut and its roles). Same rules: 1–4 parts on the 48 grid, sheets (body / accent) and thick strips
// (tube, w ≥ 4.5), cut-outs (light / line) only where needed, every part kept inside y 5–39 so its edge (3 units below)
// stays in the box; a tap motion (an(...)) where natural.
import { an, art, Ci, P, R, type Art } from './kit';
import { cut, head, S, SL } from './chrome-kit';

export const CHROME_APP = {
  /** Find my level: a ring with its needle. */
  compass: art('purple', 'rose', Ci(24, 22, 15, 'tube'), an('turn', { o: [24, 22] }, P('M31 14.5 L27 26 L17 29.5 L21 18 Z', 'body'))),
  /** A live room: a dot sending out two waves. */
  live: art('purple', 'rose', an('pulse', {}, Ci(24, 22, 5, 'accent')), an('pulse', { o: [24, 22] }, S('M15 12.5 Q9 22 15 31.5', 5), S('M33 12.5 Q39 22 33 31.5', 5))),
  /** The month review: a calendar sheet with its two rings. */
  calendar: art('purple', 'rose', R(7, 10, 34, 28, 5, 'body'), cut('M8 19 H40', 3), an('hop', {}, SL(16, 6, 16, 13, 4.6), SL(32, 6, 32, 13, 4.6))),
  /** Edit: a pencil. */
  edit: art('purple', 'rose', an('turn', { o: [24, 22] }, P('M30.5 6.5 L40 16 L19.5 36.5 L8.5 38.5 L10.5 27.5 Z', 'body')), cut('M13.5 28.5 L18.5 33.5', 2.6)),
  /** Input settings: two sliders. */
  sliders: art('purple', 'rose', SL(8, 14, 40, 14, 4.6), SL(8, 30, 40, 30, 4.6), an('nudge', {}, Ci(30, 14, 5.6, 'body')), an('nudge', { r: true }, Ci(18, 30, 5.6, 'body'))),
  /** Collapse / expand the side menu: a bar and a chevron (the CSS mirrors it in Hebrew). */
  sidebar: art('purple', 'rose', SL(37, 8.5, 37, 35.5, 5.6), an('nudge', { r: true }, S('M26 11 L15 22 L26 33', 6.5))),
  /** Friends: two people, the second in the accent. */
  people: art('purple', 'rose', an('hop', { d: 1 }, Ci(34, 13.5, 5.6, 'accent'), P('M27 36 Q28 23 34.5 23 Q43 23 43 36 Z', 'accent')), an('hop', {}, Ci(18, 14, 7, 'body')), P('M5 37 Q5 25 18 25 Q31 25 31 37 Z', 'body')),
  /** A class / a course of study: the mortarboard. */
  cap: art('purple', 'rose', an('hop', {}, P('M4 17 L24 8.5 L44 17 L24 25.5 Z', 'body')), P('M12 21.5 V30 Q24 37.5 36 30 V21.5 L24 27 Z', 'body'), SL(41, 18.5, 41, 29, 4.6)),
  /** Achievements: a medal on its ribbon. */
  medal: art('purple', 'rose', S('M16.5 6 L22 18.5', 5.6), S('M31.5 6 L26 18.5', 5.6), an('hop', {}, Ci(24, 27, 10.5, 'accent'))),
  /** The tuner: a gauge and its needle. */
  gauge: art('purple', 'rose', S('M8 31 A16 16 0 0 1 40 31', 5), an('turn', { o: [24, 31] }, SL(24, 31, 32, 16.5, 4.8)), Ci(24, 31, 4.4, 'body')),
  /** The drone: a held sound's level bars. */
  levels: art('purple', 'rose', SL(10, 18, 10, 26, 5.4), an('pulse', {}, SL(19.3, 11, 19.3, 33, 5.4)), an('pulse', { d: 1 }, SL(28.7, 7, 28.7, 37, 5.4)), SL(38, 15, 38, 29, 5.4)),
  /** A note (the instrument, the play list): the tilted head with its stem and flag. */
  quaver: art('purple', 'rose', an('nod', {}, head(17, 32, 8)), SL(24, 30, 24, 8, 4.8), S('M24 8 Q34.5 11 34.5 21', 4.8)),
  /** Chord charts: a grid of bars. */
  chordgrid: art('purple', 'rose', an('hop', {}, R(6, 8, 36, 29, 5, 'body')), cut('M18 8.5 V36.5 M30 8.5 V36.5 M6.5 22.5 H41.5', 2.6)),
  /** Privacy: a shield. */
  shield: art('purple', 'rose', an('hop', {}, P('M24 5.5 L39 11 V21.5 Q39 32.5 24 39 Q9 32.5 9 21.5 V11 Z', 'body')), cut('M17.5 22 L22.5 27 L31 17.5', 3)),
  /** Language: a globe. */
  globe: art('purple', 'rose', an('turn', {}, Ci(24, 22, 15.5, 'body')), cut('M9 22 H39 M24 7 Q15.5 22 24 37 Q32.5 22 24 7', 2.4)),
  /** Learning (my path): two note heads joined by a winding road. */
  route: art('purple', 'rose', S('M11.5 31.5 Q11.5 22 24 22 Q36.5 22 36.5 12.5', 4.8), an('hop', {}, head(11.5, 32, 6)), an('hop', { d: 1 }, head(36.5, 12, 6, 'accent'))),
  /** MIDI: a piano keyboard. */
  pianokeys: art('purple', 'rose', R(5, 9, 38, 28, 4.5, 'body'), an('press', {}, cut('M14.5 9.5 V22 M24 9.5 V22 M33.5 9.5 V22', 5)), cut('M14.5 22 V36.5 M24 22 V36.5 M33.5 22 V36.5', 2.4)),
  /** Display: an eye. */
  eye: art('purple', 'rose', P('M4 22 Q24 1.5 44 22 Q24 42.5 4 22 Z', 'body'), Ci(24, 22, 7.5, 'light'), an('pulse', {}, Ci(24, 22, 3.6, 'body'))),
} satisfies Record<string, Art>;

// Paper chrome symbols for recordings, players, Encore, tools (metronome, tuner, slow-down) (see art-chrome.ts for the
// cut and its roles). Same rules: 1–4 parts on the 48 grid, sheets (body / accent) and thick strips (tube, w ≥ 4.5),
// cut-outs (light / line) only where needed, every part kept inside y 5–39 so its edge (3 units below) stays in the
// box; a tap motion (an(...)) where natural.
import { an, art, Ci, P, R, star, type Art } from './kit';
import { cut, S, SL, tri } from './chrome-kit';

export const CHROME_MEDIA = {
  /** Delete: a bin with its lid; the lid lifts. */
  trash: art('purple', 'rose', an('hop', {}, R(8, 9, 32, 5.5, 2.6, 'body'), R(18.5, 5, 11, 6, 2.4, 'body')), P('M11.5 17 H36.5 L34.5 36 Q34.2 39 31.2 39 H16.8 Q13.8 39 13.5 36 Z', 'body'), cut('M20.5 22 V33.5 M27.5 22 V33.5', 2.8)),
  /** Select: a ticked square sheet. */
  select: art('purple', 'rose', R(7.5, 6, 33, 32, 8, 'body'), an('nod', { o: [21, 29] }, cut('M15 22 L21.5 28.5 L33 15.5', 4))),
  /** Jump back / ahead a few seconds: two chevron strips. */
  skipback: art('purple', 'rose', an('nudge', { r: true }, S('M22.5 10 L11 22 L22.5 34', 6), S('M37 10 L25.5 22 L37 34', 6))),
  skipfwd: art('purple', 'rose', an('nudge', {}, S('M11 10 L22.5 22 L11 34', 6), S('M25.5 10 L37 22 L25.5 34', 6))),
  /** A keyboard (a take played on keys): white sheet, three black keys cut. */
  keys: art('purple', 'rose', R(5.5, 8, 37, 29, 6, 'body'), an('press', {}, R(14, 8, 5, 15, 1.6, 'light')), an('press', { d: 1 }, R(29, 8, 5, 15, 1.6, 'light'))),
  /** A sung / audio take: level bars. */
  voice: art('purple', 'rose', an('pulse', {}, R(6, 18, 5.5, 8, 2.75, 'body'), R(14.5, 12, 5.5, 20, 2.75, 'body'), R(23, 6, 5.5, 32, 2.75, 'body'), R(31.5, 12, 5.5, 20, 2.75, 'body'), R(40, 18, 2.8, 8, 1.4, 'body'))),
  /** Restore from the bin: an arc turning back with its arrow corner. */
  restore: art('purple', 'rose', an('turn', { o: [24, 22], r: true }, S('M14.8 12.8 A12.6 12.6 0 1 1 11.4 23.5'), S('M12.8 5.8 L14 13.8 L22 12.6', 6))),
  /** Export / save out: an arrow down into a tray. */
  export: art('purple', 'rose', an('press', {}, SL(24, 6, 24, 23, 6), S('M16 16 L24 24 L32 16', 6)), S('M9 27 V33 Q9 37 13 37 H35 Q39 37 39 33 V27', 5.4)),
  /** Keep playing in the background: a phone sheet with a note head. */
  bglisten: art('purple', 'rose', R(12, 5, 24, 34, 6, 'body'), an('nod', {}, P('M19.6 26 Q16.5 26.4 16.9 29 Q17.4 31.4 21 30.6 Q23.6 30 23.6 27.5 V15 L30.5 13 V17.5', 'line', 2.8))),
  /** A playlist: three lines and a plus. */
  playlist: art('purple', 'rose', SL(7, 11, 31, 11, 5.2), SL(7, 21, 31, 21, 5.2), SL(7, 31, 19, 31, 5.2), an('turn', { o: [33, 31] }, SL(33, 24.5, 33, 37.5, 5.2), SL(26.5, 31, 39.5, 31, 5.2))),
  /** Not starred: the star as a strip of paper. */
  staroff: art('purple', 'rose', an('turn', {}, P(star(24, 23, 15.5, 0.5), 'tube', 4.6))),
  /** Edit: a pencil sheet with its tip cut. */
  edit: art('purple', 'rose', an('nod', { o: [10, 37] }, P('M9 31 L29.5 10.5 Q32 8 34.5 10.5 L37.5 13.5 Q40 16 37.5 18.5 L17 39 H9 Z', 'body')), cut('M26 14 L34 22', 2.8)),
  /** A record (listen on a streaming service — generic, not a brand mark). */
  vinyl: art('purple', 'rose', an('spin', { o: [24, 22] }, Ci(24, 22, 16, 'body'), Ci(24, 22, 5, 'accent')), cut('M15 14.5 Q24 9 33 14.5', 2.4)),
  /** A video (watch on a video site — generic). */
  video: art('purple', 'rose', R(4.5, 8.5, 39, 27, 8, 'body'), an('nudge', {}, P(tri(19, 31, 15, 29), 'light'))),
  /** Undo: a hooked strip with its arrow corner. */
  undo: art('purple', 'rose', an('nudge', { r: true }, S('M10 18 H28 Q38 18 38 27.5 Q38 37 28 37 H20', 6), S('M17 9.5 L9.5 18 L17 26.5', 6))),
  /** The mixer: three fader strips and their knobs. */
  faders: art('purple', 'rose', S('M11 7 V37 M24 7 V37 M37 7 V37', 4.6), an('slide', {}, R(6, 23, 10, 7, 3, 'accent')), an('slide', { r: true }, R(19, 12, 10, 7, 3, 'accent')), R(32, 19, 10, 7, 3, 'accent')),
} satisfies Record<string, Art>;

// The Paper "chrome" cut (owner 2026-11-16: "even the Play button looks odd ... everything should match"): the small
// symbols of the app's controls — play, stop, record, back, close, more … — drawn in the Paper language at 16–24 px.
// Each is 1–4 parts on the 48 grid, solid sheets and thick paper strips (no hairlines), each with its edge a little below
// (Paper.tsx, cut 'chrome': a deeper edge so it still reads at 16 px). They paint in the surface's chrome ramp
// (src/paper.css: purple paper on light cards and the lemon "now" buttons, white paper on purple and dark surfaces,
// the text colour anywhere else), so one drawing reads on ink, purple, lemon, card, dark card and the dark bar.
//
// Roles in this cut: body = the sheet · accent = the second hue (record, the star) · tube = a thick strip of the sheet
// (chevrons, crosses, arcs) · accentline = a strip in the accent · light / line = a cut-out in the surface colour.
import { an, art, Ci, E, gear, P, R, star, type Art } from './kit';
import { cut, head, S, SL, tri } from './chrome-kit';
import { CHROME_MEDIA } from './art-chrome-media';
import { CHROME_APP } from './art-chrome-app';

const PLAY = 'M15.5 11 Q15.5 6.6 19.3 8.8 L38.2 19.8 Q41.6 21.8 38.2 23.8 L19.3 34.8 Q15.5 37 15.5 32.6 Z';

const CORE = {
  // ---- media
  /** Play: a rounded paper triangle, optically centred; it nudges forward when pressed. */
  play: art('purple', 'rose', an('nudge', {}, P(PLAY, 'body'))),
  pause: art('purple', 'rose', an('press', {}, R(12.5, 8.5, 9, 28, 3.4, 'body')), an('press', { d: 1 }, R(26.5, 8.5, 9, 28, 3.4, 'body'))),
  stop: art('purple', 'rose', an('press', {}, R(11, 8.5, 26, 26, 6.5, 'body'))),
  /** Record: the accent disc; it pulses once. */
  record: art('purple', 'rose', an('pulse', {}, Ci(24, 21.5, 13.5, 'accent'))),
  /** Previous / next track (⏮ ⏭) and skip ahead (⏩). */
  prev: art('purple', 'rose', R(9.5, 9.5, 6.5, 25, 2.6, 'body'), an('nudge', { r: true }, P(tri(38.5, 17), 'body'))),
  next: art('purple', 'rose', an('nudge', {}, P(tri(9.5, 31), 'body')), R(32, 9.5, 6.5, 25, 2.6, 'body')),
  skip: art('purple', 'rose', an('nudge', {}, P(tri(6, 24.5), 'body')), an('nudge', { d: 1 }, P(tri(23.5, 42), 'body'))),
  /** Again (↻): an open circle of paper with its arrow corner. */
  again: art('purple', 'rose', an('turn', { o: [24, 22] }, S('M33.2 12.8 A12.6 12.6 0 1 0 36.6 23.5'), S('M35.2 5.8 L34 13.8 L26 12.6', 6))),
  /** Repeat / loop: two strips chasing each other. */
  repeat: art(
    'purple',
    'rose',
    an('loop', {}, S('M11.5 25 V19.5 Q11.5 13.5 17.5 13.5 H33', 5.6), S('M29 8.6 L34 13.5 L29 18.4', 5.6)),
    an('loop', { r: true }, S('M36.5 19 V24.5 Q36.5 30.5 30.5 30.5 H15', 5.6), S('M19 25.6 L14 30.5 L19 35.4', 5.6)),
  ),
  // ---- navigation (back / fwd mirror in Hebrew: Icon adds flip-rtl)
  back: art('purple', 'rose', an('nudge', { r: true }, S('M28.5 9.5 L16 22 L28.5 34.5', 7))),
  fwd: art('purple', 'rose', an('nudge', {}, S('M19.5 9.5 L32 22 L19.5 34.5', 7))),
  up: art('purple', 'rose', an('hop', {}, S('M11.5 28 L24 15.5 L36.5 28', 7))),
  down: art('purple', 'rose', an('press', {}, S('M11.5 16 L24 28.5 L36.5 16', 7))),
  /** Close: two crossed strips; it turns a little. */
  close: art('purple', 'rose', an('turn', { o: [24, 21.5] }, SL(13.5, 11, 34.5, 32, 7), SL(34.5, 11, 13.5, 32, 7))),
  /** More (⋯): three tilted note heads — the motif, where it helps. */
  more: art('purple', 'rose', an('hop', {}, head(10.5, 22, 5.4)), an('hop', { d: 1 }, head(24, 22, 5.4)), an('hop', { d: 2 }, head(37.5, 22, 5.4))),
  check: art('purple', 'rose', an('nod', { o: [20, 31] }, S('M10.5 21.5 L20 31 L37.5 12.5', 7))),
  plus: art('purple', 'rose', an('turn', { o: [24, 21.5] }, SL(24, 10, 24, 33, 7), SL(12.5, 21.5, 35.5, 21.5, 7))),
  minus: art('purple', 'rose', an('press', {}, SL(12.5, 21.5, 35.5, 21.5, 7))),
  swap: art('purple', 'rose', an('nudge', {}, S('M9 15 H35', 5.6), S('M30 9.6 L35.5 15 L30 20.4', 5.6)), an('nudge', { r: true }, S('M39 29 H13', 5.6), S('M18 23.6 L12.5 29 L18 34.4', 5.6))),
  download: art('purple', 'rose', an('press', {}, SL(24, 7, 24, 24, 6.5), S('M15.5 17 L24 25.5 L32.5 17', 6.5)), R(9, 31, 30, 6.5, 3.2, 'body')),
  share: art('purple', 'rose', S('M14 22 V33 Q14 36 17 36 H31 Q34 36 34 33 V22', 5.6), an('hop', {}, SL(24, 8, 24, 26, 6), S('M16.5 14.5 L24 7 L31.5 14.5', 6))),
  backspace: art('purple', 'rose', P('M17 9 H37 Q41 9 41 13 V31 Q41 35 37 35 H17 L5.5 22 Z', 'body'), cut('M23 16.5 L32 27.5 M32 16.5 L23 27.5', 3.4)),
  search: art('purple', 'rose', an('turn', { o: [20.5, 19] }, Ci(20.5, 19, 10, 'tube')), SL(28, 26.5, 37.5, 36, 7)),
  settings: art('purple', 'rose', an('spin', { o: [24, 22] }, P(gear(24, 22, 11.5, 16, 8, 0.2), 'body')), Ci(24, 22, 5, 'light')),
  folder: art('purple', 'rose', P('M7 13 Q7 9 11 9 H19 L22.5 12.5 H37 Q41 12.5 41 16.5 V32 Q41 36 37 36 H11 Q7 36 7 32 Z', 'body'), an('hop', {}, R(7, 17, 34, 19, 4, 'body'))),
  star: art('purple', 'rose', an('turn', {}, P(star(24, 22.5, 16.5, 0.5), 'body'))),
  // ---- the former line icons (src/ui/icons.tsx), same names
  lock: art('purple', 'rose', S('M16.5 20 V15.5 A7.5 7.5 0 0 1 31.5 15.5 V20', 5.4), an('hop', {}, R(10, 19.5, 28, 18.5, 5, 'body')), Ci(24, 27.5, 3, 'light')),
  mic: art('purple', 'rose', an('pulse', {}, R(17, 5.5, 14, 22, 7, 'body')), S('M10.5 20.5 Q10.5 32 24 32 Q37.5 32 37.5 20.5', 5), SL(24, 32, 24, 38, 5)),
  phones: art('purple', 'rose', S('M11.5 26 V22 A12.5 12.5 0 0 1 36.5 22 V26', 5), an('pulse', {}, R(6.5, 22.5, 11, 15, 4.5, 'body')), an('pulse', { d: 1 }, R(30.5, 22.5, 11, 15, 4.5, 'body'))),
  speaker: art('purple', 'rose', P('M7 16.5 Q7 15 8.5 15 H15 L24.5 7.5 Q26 6.4 26 8.3 V35.7 Q26 37.6 24.5 36.5 L15 29 H8.5 Q7 29 7 27.5 Z', 'body'), an('pulse', { o: [26, 22] }, S('M32 15 Q36.5 22 32 29', 5))),
  mute: art('purple', 'rose', P('M5 16.5 Q5 15 6.5 15 H13 L22.5 7.5 Q24 6.4 24 8.3 V35.7 Q24 37.6 22.5 36.5 L13 29 H6.5 Q5 29 5 27.5 Z', 'body'), an('turn', { o: [36, 22] }, SL(30.5, 16.5, 41.5, 27.5, 5), SL(41.5, 16.5, 30.5, 27.5, 5))),
  metronome: art('purple', 'rose', P('M17 19 H31 L36.5 36 Q37 38 35 38 H13 Q11 38 11.5 36 Z', 'body'), an('swing', { o: [24, 32] }, SL(24, 32, 33, 8, 5)), Ci(24, 32, 2.6, 'light')),
  tip: art('purple', 'rose', an('pulse', {}, Ci(24, 18, 12, 'body')), R(18.5, 29, 11, 5, 2, 'body'), R(20, 35, 8, 4, 2, 'body')),
  trophy: art('purple', 'rose', S('M14 12 Q6 12 8 19 Q9.5 23 16 24 M34 12 Q42 12 40 19 Q38.5 23 32 24', 4.6), an('hop', {}, P('M13 7 H35 V18 Q35 29 24 29 Q13 29 13 18 Z', 'body')), R(15, 32, 18, 6, 2.5, 'body')),
  target: art('purple', 'rose', Ci(24, 22, 12.5, 'tube'), an('pulse', {}, Ci(24, 22, 4.6, 'accent'))),
  cloud: art('purple', 'rose', an('hop', {}, P('M14 36 Q5 36 5 28.5 Q5 21.5 12.5 21 Q14 11 24 11 Q33.5 11 35.5 20 Q43 21 43 28.5 Q43 36 35 36 Z', 'body'))),
  dice: art('purple', 'rose', an('turn', {}, R(8.5, 6.5, 31, 31, 8, 'body')), Ci(17, 15, 2.9, 'light'), Ci(24, 22, 2.9, 'light'), Ci(31, 29, 2.9, 'light')),
  bolt: art('purple', 'rose', an('hop', {}, P('M27.5 5 L11 25 H22 L19.5 39 L37 18 H26 Z', 'body'))),
  clock: art('purple', 'rose', Ci(24, 23, 15, 'body'), an('turn', { o: [24, 23] }, cut('M24 14.5 V23 L30 27', 3.4))),
  gem: art('purple', 'rose', an('hop', {}, P('M13 8 H35 L42 17 L24 38 L6 17 Z', 'body')), cut('M6.5 17 H41.5 M18 8.5 L24 37 L30 8.5', 2.2)),
  snow: art('purple', 'rose', an('spin', { o: [24, 22] }, SL(24, 6, 24, 38, 5), SL(10.1, 14, 37.9, 30, 5), SL(10.1, 30, 37.9, 14, 5))),
  flame: art('purple', 'rose', an('flicker', {}, P('M24 4.5 Q26 13 33 19 Q38.5 24 37 30 Q35 38.5 24 38.5 Q13 38.5 11 30 Q9.5 23.5 16 18 Q17.5 24 21 25 Q18.5 15 24 4.5 Z', 'body'))),
  /** The gifts (§20.1), as sheets: the fermata a solid arc over its note-head dot; the gift a box, a lid with its bow, a ribbon cut. */
  fermata: art('purple', 'rose', P('M7 33 A17 17 0 0 1 41 33 L34.2 33 A10.2 10.2 0 0 0 13.8 33 Z', 'body'), an('hop', {}, head(24, 29, 4.4, 'accent'))),
  gift: art('purple', 'rose', R(9, 20, 30, 18.5, 4, 'body'), an('hop', {}, R(6.5, 12.5, 35, 8.5, 3, 'body'), P('M24 12.5 Q16 3 12.2 7 Q10.6 11 24 12.5 Q37.4 11 35.8 7 Q32 3 24 12.5 Z', 'body')), R(21.6, 12.5, 4.8, 26, 0, 'light')),
  /** A phrase dedicated to a friend: a gift tag sheet with its eyelet, a note head cut out of it. */
  dedicate: art('purple', 'rose', an('swing', { o: [12, 22] }, P('M15 7.5 H37.5 Q41.5 7.5 41.5 11.5 V32.5 Q41.5 36.5 37.5 36.5 H15 L5.5 22 Z', 'body')), Ci(12.5, 22, 2.8, 'light'), an('nod', {}, E(28, 22, 6.2, 4.6, -20, 'light'))),
  /** Practise with me now: two notes on one beam (a sheet), stems as paper strips. */
  together: art('purple', 'rose', SL(17, 33, 17, 13, 4.6), SL(35, 29, 35, 9, 4.6), an('wave', {}, P('M14.7 10 L37.3 5 L37.3 11.8 L14.7 16.8 Z', 'body')), an('nod', {}, head(12.5, 33, 6.6)), an('nod', { d: 1 }, head(30.5, 29, 6.6, 'accent'))),
  wave: art('purple', 'rose', an('vibrate', {}, S('M4.5 22 Q9 12 13.5 22 T22.5 22 T31.5 22 T40.5 22', 5.6))),
  /** The refresher / theory page (an open book). */
  book: art('purple', 'rose', P('M5 11 Q14 7 23 11.5 V37 Q14 33 5 36 Z', 'body'), an('wave', { o: [25, 24] }, P('M25 11.5 Q34 7 43 11 V36 Q34 33 25 37 Z', 'body'))),
  /** The headphones-required / listen mark reuses phones; a heart for favourites. */
  heart: art('purple', 'rose', an('pulse', {}, P('M24 38 Q6 26 6 16 Q6 8 14 8 Q20 8 24 14 Q28 8 34 8 Q42 8 42 16 Q42 26 24 38 Z', 'accent'))),
  /** Report (a flag on its pole) and send (a paper plane). */
  flag: art('purple', 'rose', SL(11, 7, 11, 38, 5.2), an('wave', { o: [11, 16] }, P('M13 7.5 H35 Q38 7.5 36.5 10.5 L33 16.5 L36.5 22.5 Q38 25.5 35 25.5 H13 Z', 'body'))),
  send: art('purple', 'rose', an('nudge', {}, P('M6 20.5 Q4.5 18 7.5 17 L38.5 7 Q42 6 40.5 9.5 L30.5 37 Q29.5 40 27 37.5 L21.5 27 Z', 'body')), cut('M21.5 27 L33 14', 2.6)),
  /** Tap mode (the answer pads): four pads, two pressed in the accent. */
  pads: art('purple', 'rose', an('press', {}, R(7, 6, 15, 15, 4.5, 'body')), R(26, 6, 15, 15, 4.5, 'accent'), R(7, 24, 15, 15, 4.5, 'accent'), an('press', { d: 1 }, R(26, 24, 15, 15, 4.5, 'body'))),
  /** A person (profile) and a list (the menu). */
  person: art('purple', 'rose', an('hop', {}, Ci(24, 14, 8, 'body')), P('M8 38 Q8 24 24 24 Q40 24 40 38 Z', 'body')),
  /** Globe: the quick language switch in the top bar — a paper ball with its equator and one meridian cut out. */
  globe: art('purple', 'rose', an('turn', { o: [24, 22] }, Ci(24, 22, 15.5, 'body')), cut('M9 22 H39 M24 6.5 Q14.5 22 24 37.5 Q33.5 22 24 6.5', 3.2)),
  menu: art('purple', 'rose', an('slide', {}, SL(10, 12, 38, 12, 6)), SL(10, 22, 38, 22, 6), an('slide', { d: 1 }, SL(10, 32, 38, 32, 6))),
} satisfies Record<string, Art>;

/** The whole chrome set: the core above and the screen families' symbols (art-chrome-media.ts, art-chrome-app.ts). */
export const CHROME = { ...CORE, ...CHROME_MEDIA, ...CHROME_APP } satisfies Record<string, Art>;
export type ChromeKey = keyof typeof CHROME;
export const CHROME_KEYS = Object.keys(CHROME) as ChromeKey[];
/** Directional symbols that mirror in Hebrew (RTL): back, forward, the track skips and the swap. */
export const CHROME_MIRROR: ReadonlySet<ChromeKey> = new Set<ChromeKey>(['back', 'fwd']);

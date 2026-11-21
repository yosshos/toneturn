// Paper drawings: the guitar course's families, topics and games (see kit.ts for the roles and builders).
// Shared cue: a light "neck" sheet with strings in the deep tone; each drawing puts its own idea on it.
import { art, an, Ci, det, H, L, markParts, N, P, R, rich, T, type Art, type Part } from './kit';

/** A neck sheet from y0, height h, with n strings (and optional frets at xs). */
const neck = (y0: number, h: number, n: number, frets: number[] = [], x0 = 2, w = 44): Part[] => {
  const gap = h / (n + 1);
  return [
    R(x0, y0, w, h, 3, 'light'),
    ...det(frets.map((x) => L(x, y0, x, y0 + h, 'inkline', 1.4))),
    // the strings ring when the icon plays, low to high
    ...Array.from({ length: n }, (_, i) => ({ ...L(x0 + 1, +(y0 + gap * (i + 1)).toFixed(2), x0 + w - 1, +(y0 + gap * (i + 1)).toFixed(2), 'line', 1), m: { k: 'vibrate' as const, d: (Math.min(i, 4) as 0 | 1 | 2 | 3 | 4) } })),
  ];
};
const pickPath = (cx: number, top: number, s: number) =>
  `M${cx} ${top + 40 * s} C ${cx - 10 * s} ${top + 31 * s}, ${cx - 19 * s} ${top + 20 * s}, ${cx - 19 * s} ${top + 11 * s} C ${cx - 19 * s} ${top + 3 * s}, ${cx - 11 * s} ${top}, ${cx} ${top} C ${cx + 11 * s} ${top}, ${cx + 19 * s} ${top + 3 * s}, ${cx + 19 * s} ${top + 11 * s} C ${cx + 19 * s} ${top + 20 * s}, ${cx + 10 * s} ${top + 31 * s}, ${cx} ${top + 40 * s} Z`;
const downArrow = (x: number, y0: number, y1: number, hw: number, role: 'body' | 'accent'): Part =>
  P(`M${x - hw} ${y0} L${x + hw} ${y0} L${x + hw} ${y1 - 9} L${x + hw + 4.5} ${y1 - 9} L${x} ${y1} L${x - hw - 4.5} ${y1 - 9} L${x - hw} ${y1 - 9} Z`, role);
const upArrow = (x: number, y0: number, y1: number, hw: number, role: 'body' | 'accent'): Part =>
  P(`M${x - hw} ${y0} L${x + hw} ${y0} L${x + hw} ${y1 + 9} L${x + hw + 4.5} ${y1 + 9} L${x} ${y1} L${x - hw - 4.5} ${y1 + 9} L${x - hw} ${y1 + 9} Z`, role);
const smallEar = (dx: number, dy: number, s: number): Part[] => {
  const p = (x: number, y: number) => `${+(dx + x * s).toFixed(2)} ${+(dy + y * s).toFixed(2)}`;
  return [
    P(`M${p(14, 0)} C ${p(6, -1)}, ${p(1, 5)}, ${p(2, 12)} C ${p(2.5, 16)}, ${p(6, 17)}, ${p(6, 20)} C ${p(6, 23)}, ${p(4, 24)}, ${p(4, 26)} C ${p(4, 29)}, ${p(9, 30)}, ${p(11, 27)} C ${p(14, 24)}, ${p(20, 21)}, ${p(21, 13)} C ${p(22, 5)}, ${p(18, 0)}, ${p(14, 0)} Z`, 'body'),
    P(`M${p(13.5, 5)} C ${p(9.5, 5)}, ${p(8, 8.5)}, ${p(9, 11.5)} C ${p(9.5, 13.5)}, ${p(12.5, 13.5)}, ${p(12.5, 16)} C ${p(12.5, 18)}, ${p(10.5, 19)}, ${p(11, 21)}`, 'inkline', 1.9),
  ];
};

export const ART_GUITAR: Record<string, Art> = {
  /** Fretting: one finger per fret — four fingertips climbing a neck under "1234". */
  fingers1234: art(
    'tan',
    'purple',
    neck(20, 24, 3, [13, 24, 35]),
    H(7.5, 38, 3.6, 'body'),
    H(18.5, 32, 3.6, 'body'),
    H(29.5, 26, 3.6, 'body'),
    H(40.5, 38, 3.6, 'accent'),
    R(8, 2, 32, 15, 4, 'body'),
    T(24, 14.2, '1234', 13, 'light', 26),
    rich(L(5, 41.5, 43, 41.5, 'shine', 0.8)),
  ),
  /** Picking: a pick striking a string, a note embossed on it. */
  pick: art(
    'tan',
    'purple',
    an('vibrate', { d: 2 }, det(L(2, 40, 46, 40, 'accentline', 2))),
    an('strike', { o: [24, 3] }, P(pickPath(24, 3, 1), 'body'),
    P(pickPath(24, 9, 0.72), 'light'),
    H(22, 21, 4.4, 'body'),
    L(25.9, 19.9, 25.9, 12, 'inkline', 1.8),
    det(P('M25.9 12.2 Q29.5 13.6 28.4 17', 'inkline', 1.4))),
    rich(P('M10 12 C 10 9, 13 7, 17 6.5', 'shine', 1.4)),
  ),
  /** Legato: a hammer-on — two heads under a slur, on a string. */
  slur: art(
    'tan',
    'purple',
    R(2, 34, 44, 9, 3, 'light'),
    det(L(3, 38.5, 45, 38.5, 'line', 1)),
    an('hop', {}, H(13, 32, 6, 'body')),
    an('hop', { d: 2 }, H(35, 22, 6, 'body')),
    L(18.6, 30.5, 18.6, 15, 'wire', 2),
    L(40.6, 20.5, 40.6, 6, 'wire', 2),
    P('M7 21 Q 20 4, 36 11', 'accentline', 2.6),
    rich(H(11.4, 31, 2, 'light'), H(33.4, 21, 2, 'light')),
  ),
  /** Scale boxes: a fingering box on the neck, the root lit. */
  box: art(
    'tan',
    'purple',
    neck(4, 40, 5, [17, 31]),
    Ci(10, 10.7, 3.4, 'accent'),
    Ci(24, 17.3, 3.4, 'body'),
    Ci(38, 10.7, 3.4, 'body'),
    Ci(10, 24, 3.4, 'body'),
    Ci(38, 30.7, 3.4, 'body'),
    Ci(24, 37.3, 3.4, 'accent'),
    rich(Ci(9, 9.6, 1, 'light'), Ci(23, 36.2, 1, 'light')),
  ),
  /** Chords: a chord diagram — nut, six strings, three fretted dots. */
  chordbox: art(
    'tan',
    'purple',
    R(9, 6, 30, 38, 3, 'light'),
    R(9, 6, 30, 4.5, 1.6, 'ink'),
    an('vibrate-x', {}, det([12, 16.8, 21.6, 26.4, 31.2, 36].map((x) => L(x, 10, x, 43, 'line', 1)))),
    L(10, 20, 38, 20, 'inkline', 1.4),
    L(10, 31, 38, 31, 'inkline', 1.4),
    Ci(16.8, 25.5, 3.4, 'body'),
    Ci(21.6, 37, 3.4, 'body'),
    Ci(31.2, 25.5, 3.4, 'accent'),
    rich(Ci(12, 2.6, 1.6, 'mark'), Ci(36, 2.6, 1.6, 'mark')),
  ),
  /** Arpeggios: a rolled-chord wave and three heads climbing out of it. */
  arp: art(
    'tan',
    'purple',
    P('M8 44 q 4 -4 0 -8 t 0 -8 t 0 -8 t 0 -8', 'accentline', 2.4),
    an('hop', {}, N(21, 36, 5.4, 12, 'body', 1.8)),
    an('hop', { d: 1 }, N(30.5, 25.5, 5.4, 12, 'body', 1.8)),
    an('hop', { d: 2 }, N(40, 15, 5.4, 11, 'body', 1.8)),
    det(P('M16 40 L44 12', 'dash', 1.2)),
    rich(H(19.5, 35, 1.8, 'light'), H(29, 24.5, 1.8, 'light'), H(38.5, 14, 1.8, 'light')),
  ),
  /** Rhythm guitar: down and up strokes across the strings. */
  strum: art(
    'tan',
    'purple',
    R(3, 15, 42, 20, 4, 'light'),
    an('vibrate', { d: 1 }, det(L(4, 20, 44, 20, 'line', 1), L(4, 25, 44, 25, 'line', 1), L(4, 30, 44, 30, 'line', 1))),
    an('slide', { r: true }, downArrow(15, 4, 44, 2.6, 'body')),
    an('slide', { d: 2 }, upArrow(33, 44, 4, 2.6, 'accent')),
    rich(L(14, 7, 14, 30, 'shine', 0.9)),
  ),
  /** Lead: a string bent upward under the fingertip. */
  bend: art(
    'tan',
    'purple',
    R(2, 28, 44, 16, 3, 'light'),
    det(L(26, 28, 26, 44, 'inkline', 1.4), L(3, 32, 45, 32, 'line', 1), L(3, 40, 45, 40, 'line', 1)),
    an('vibrate', {}, P('M3 36 L18 36 Q 28 36, 31 20', 'accentline', 2.4)),
    an('hop', {}, P('M26 19 L31.5 9 L37 19 Z', 'accent')),
    H(31, 24, 4.6, 'body'),
    rich(H(29.6, 23.2, 1.6, 'light')),
  ),
  /** Fingerstyle: p i m a on a plaque over three strings. */
  pima: art('tan', 'purple', markParts('pima', rich(L(6, 44.5, 42, 44.5, 'wire', 0.9)))),
  /** Flamenco: rasgueado — four fingers fanning out from the hand. */
  fan: art(
    'tan',
    'pink',
    P('M5 15 Q 24 -2, 43 15', 'accentline', 2.4),
    P('M24 40 L9 18', 'tube', 4.6),
    P('M24 40 L18 11', 'tube', 4.6),
    P('M24 40 L30 11', 'tube', 4.6),
    P('M24 40 L39 18', 'tube', 4.6),
    Ci(24, 40, 6, 'body'),
    H(9, 18, 3, 'accent'),
    H(18, 11, 3, 'accent'),
    H(30, 11, 3, 'accent'),
    H(39, 18, 3, 'accent'),
    rich(Ci(24, 40, 2.4, 'light')),
  ),
  /** The neck: nut, frets, strings, an inlay and a fretted note. */
  fretboard: art(
    'tan',
    'purple',
    R(2, 12, 44, 24, 3, 'light'),
    R(2, 12, 4, 24, 1.4, 'ink'),
    L(16, 12, 16, 36, 'inkline', 2.2),
    L(30, 12, 30, 36, 'inkline', 2.2),
    an('vibrate', {}, det(L(43, 12, 43, 36, 'inkline', 2.2), [16.8, 21.6, 26.4, 31.2].map((y) => L(6, y, 45, y, 'line', 1)))),
    Ci(23, 24, 2.4, 'accent'),
    H(37, 21.6, 4.4, 'body'),
    rich(Ci(37, 26.4, 1.4, 'accent'), H(35.8, 20.8, 1.5, 'light')),
  ),
  /** The guitarist's ear: an ear over three ringing strings. */
  guitarear: art(
    'teal',
    'tan',
    smallEar(13, 3, 1.15),
    R(2, 36, 44, 10, 3, 'accent'),
    det(L(3, 39, 45, 39, 'line', 1), L(3, 41.5, 45, 41.5, 'line', 1), L(3, 44, 45, 44, 'line', 1)),
    P('M9 12 C 6 15, 6 20, 9 23', 'accentline', 2.2),
    det(P('M40 12 C 43 15, 43 20, 40 23', 'accentline', 2.2)),
    rich(H(29, 9, 2.2, 'light')),
  ),
  /** Theory you play on the neck: two triads (triangles) over three strings. */
  gtpair: art(
    'tan',
    'purple',
    neck(14, 26, 3),
    P('M5 36 L13.5 18 L22 36 Z', 'body'),
    P('M24 32 L33 14 L42 32 Z', 'accent'),
    det(Ci(5, 36, 2, 'ink'), Ci(13.5, 18, 2, 'ink'), Ci(22, 36, 2, 'ink'), Ci(24, 32, 2, 'ink'), Ci(42, 32, 2, 'ink')),
    det(Ci(33, 14, 2, 'mark')),
    rich(L(8, 34, 13, 23, 'shine', 0.9)),
  ),
  /** Bebop on the neck: a target head enclosed by a note above and below, over strings. */
  genclose: art(
    'lilac',
    'tan',
    neck(6, 36, 4),
    H(32, 24, 6.4, 'body'),
    H(13, 13.2, 4, 'accent'),
    H(13, 34.8, 4, 'accent'),
    L(18, 15.5, 25.5, 20.5, 'inkline', 2),
    L(18, 32.5, 25.5, 27.5, 'inkline', 2),
    rich(H(30.4, 23, 2, 'light')),
  ),
  /** Phrases by ear on the neck: an ear, a rising line of heads over strings. */
  gphrase: art(
    'teal',
    'tan',
    smallEar(2, 3, 0.95),
    R(2, 34, 44, 11, 3, 'light'),
    det(L(3, 37.7, 45, 37.7, 'line', 1), L(3, 41.3, 45, 41.3, 'line', 1)),
    H(24, 29, 3.8, 'accent'),
    H(32, 22, 3.8, 'accent'),
    H(40, 14, 3.8, 'accent'),
    det(P('M24 29 L32 22 L40 14', 'dash', 1.2)),
    rich(H(14, 39.5, 2.4, 'body')),
  ),
  /** Barry Harris lines on the neck: a falling line on beat ticks, a chromatic head between. */
  gbhline: art(
    'lilac',
    'tan',
    neck(4, 32, 4),
    H(9, 10.4, 4, 'body'),
    H(19, 16.8, 4, 'body'),
    H(29, 23.2, 4, 'body'),
    H(39, 29.6, 4, 'body'),
    det(H(34, 26.4, 2.4, 'accent')),
    R(8, 39, 2, 6, 1, 'mark'),
    R(18, 39, 2, 6, 1, 'mark'),
    R(28, 39, 2, 6, 1, 'mark'),
    R(38, 39, 2, 6, 1, 'mark'),
  ),
  /** One note, many chords on the neck: a held note tied on top, three chord shapes below. */
  gctone: art(
    'lilac',
    'tan',
    H(9, 9, 4.2, 'accent'),
    H(39, 9, 4.2, 'accent'),
    P('M12 5 Q 24 -1, 36 5', 'accentline', 2),
    neck(18, 26, 3, [16, 32]),
    Ci(6, 24.5, 2.8, 'body'),
    Ci(11, 31, 2.8, 'body'),
    Ci(22, 31, 2.8, 'body'),
    Ci(27, 37.5, 2.8, 'body'),
    Ci(37, 24.5, 2.8, 'body'),
    Ci(42, 37.5, 2.8, 'body'),
    rich(L(9, 13, 9, 18, 'wire', 1), L(39, 13, 39, 18, 'wire', 1)),
  ),
  /** Colour harmony on the neck: a chord shape whose top tones are the colours. */
  gcolor: art(
    'lilac',
    'pink',
    R(9, 4, 30, 40, 3, 'light'),
    R(9, 4, 30, 4, 1.4, 'ink'),
    det([13, 18.5, 24, 29.5, 35].map((x) => L(x, 8, x, 43, 'line', 1))),
    L(10, 17, 38, 17, 'inkline', 1.3),
    L(10, 30, 38, 30, 'inkline', 1.3),
    Ci(13, 36.5, 3.2, 'body'),
    Ci(18.5, 23.5, 3.2, 'body'),
    Ci(24, 23.5, 3.2, 'body'),
    Ci(29.5, 12.5, 3.4, 'accent'),
    Ci(35, 12.5, 3.4, 'accent'),
    rich(Ci(28.6, 11.6, 1, 'light'), Ci(34.1, 11.6, 1, 'light')),
  ),
  /** Key changes on the neck: a note carried along an arc into a new key. */
  gkeymove: art(
    'lilac',
    'tan',
    neck(32, 13, 2),
    H(9, 30, 5, 'body'),
    P('M13 25 Q 24 6, 35 19', 'accentline', 2.4),
    P('M31 19 L38 22.5 L38.5 14.5 Z', 'accent'),
    H(39, 29, 5, 'body'),
    det(H(9, 12, 2.6, 'accent'), L(11.3, 11.4, 11.3, 5, 'wire', 1.3)),
    rich(H(7.4, 29.2, 1.6, 'light'), H(37.4, 28.2, 1.6, 'light')),
  ),
  /** The harmonised scale on the neck: voicings climbing across four strings. */
  gharmlad: art(
    'tan',
    'purple',
    neck(4, 40, 4),
    R(6, 20, 7, 20, 3.5, 'body'),
    R(20.5, 14, 7, 20, 3.5, 'body'),
    R(35, 8, 7, 20, 3.5, 'accent'),
    det(P('M9.5 18 L24 12 L38.5 6', 'dash', 1.2)),
    rich(L(8, 23, 8, 37, 'shine', 0.9), L(22.5, 17, 22.5, 31, 'shine', 0.9)),
  ),
  /** Chord-melody: the melody note on top of a stacked chord, over strings. */
  chordmel: art(
    'tan',
    'purple',
    R(2, 30, 44, 15, 3, 'light'),
    det(L(3, 35, 45, 35, 'line', 1), L(3, 40, 45, 40, 'line', 1)),
    H(21, 39, 4.4, 'body'),
    H(21, 30.5, 4.4, 'body'),
    H(21, 22, 4.4, 'body'),
    H(27, 10, 5.2, 'accent'),
    L(31.7, 8.7, 31.7, 1.5, 'wire', 2),
    L(25, 38, 25, 13.5, 'wire', 1.6),
    rich(H(25.6, 10.2, 1.8, 'light')),
  ),
  /** Comping a head on the guitar: a lead sheet with slashes above strings. */
  gtunecomp: art(
    'tan',
    'purple',
    R(3, 4, 42, 26, 3, 'light'),
    L(17, 7, 17, 27, 'inkline', 1.4),
    L(31, 7, 31, 27, 'inkline', 1.4),
    L(7, 23, 11, 13, 'inkline', 3),
    L(21, 23, 25, 13, 'inkline', 3),
    L(35, 23, 39, 13, 'inkline', 3),
    R(2, 34, 44, 11, 3, 'body'),
    det(L(3, 37.7, 45, 37.7, 'line', 1), L(3, 41.3, 45, 41.3, 'line', 1)),
    rich(H(10, 9.5, 1.8, 'ink'), H(24, 9.5, 1.8, 'ink'), H(38, 9.5, 1.8, 'ink')),
  ),
  /** Improvising under rule cards, on the guitar: a free line rising out of a card, strings below. */
  gsolo: art(
    'tan',
    'purple',
    R(3, 20, 20, 24, 3, 'light'),
    det(L(7, 27, 19, 27, 'inkline', 1.6), L(7, 32, 19, 32, 'inkline', 1.6), L(7, 37, 15, 37, 'inkline', 1.6)),
    P('M16 22 C 20 12, 26 26, 31 14 S 38 8, 40 9', 'accentline', 2.4),
    H(40, 8, 4.6, 'body'),
    R(26, 35, 20, 10, 2.5, 'body'),
    det(L(27, 38.3, 45, 38.3, 'line', 1), L(27, 41.7, 45, 41.7, 'line', 1)),
    rich(H(38.6, 7.2, 1.5, 'light')),
  ),
  /** Jazz in context on the guitar: four brothers a minor third apart around the tonic. */
  gbrothers: art(
    'tan',
    'purple',
    Ci(24, 24, 18, 'light'),
    det(L(7, 20, 41, 20, 'line', 1), L(6, 24, 42, 24, 'line', 1), L(7, 28, 41, 28, 'line', 1)),
    det(P('M24 10 L38 24 L24 38 L10 24 Z', 'inkline', 1.2)),
    H(24, 10, 4.2, 'body'),
    H(38, 24, 4.2, 'body'),
    H(24, 38, 4.2, 'body'),
    H(10, 24, 4.2, 'body'),
    H(24, 24, 5, 'accent'),
    rich(H(22.6, 23.2, 1.6, 'light')),
  ),
  /** First steps on the guitar: a pick over one open string, ringing. */
  gfirst: art(
    'tan',
    'purple',
    R(2, 32, 44, 10, 3, 'light'),
    L(3, 37, 45, 37, 'accentline', 2.2),
    P(pickPath(24, 4, 0.62), 'body'),
    det(P(pickPath(24, 8, 0.38), 'light')),
    det(P('M12 22 C 9 25, 9 29, 12 32', 'wire', 1.6), P('M36 22 C 39 25, 39 29, 36 32', 'wire', 1.6)),
    rich(Ci(6, 37, 2, 'body')),
  ),
  /** Riffs by grade: two power-chord dots and a riff line above. */
  griff: art(
    'tan',
    'purple',
    neck(24, 20, 3, [16, 30]),
    Ci(9, 39, 3.6, 'body'),
    Ci(23, 34, 3.6, 'body'),
    det(Ci(23, 39, 3.6, 'body')),
    P('M4 17 L12 9 L20 15 L28 5 L36 13 L44 7', 'accentline', 2.4),
    rich(H(44, 7, 2.4, 'accent'), H(4, 17, 2.4, 'accent')),
  ),
  /** Speed technique: a run of sixteenths under a speed streak. */
  gspeed: art(
    'tan',
    'purple',
    H(9, 40, 4, 'body'),
    H(18.5, 36, 4, 'body'),
    H(28, 32, 4, 'body'),
    H(37.5, 28, 4, 'body'),
    L(12.5, 39, 12.5, 21, 'wire', 1.6),
    L(22, 35, 22, 18.5, 'wire', 1.6),
    L(31.5, 31, 31.5, 16, 'wire', 1.6),
    L(41, 27, 41, 13.5, 'wire', 1.6),
    P('M11.5 18.5 L42 11 L42 15.4 L11.5 22.9 Z', 'mark'),
    det(P('M11.5 24.5 L42 17 L42 19.6 L11.5 27.1 Z', 'mark')),
    L(3, 8, 18, 4.5, 'accentline', 2),
    det(L(3, 13, 12, 11, 'accentline', 2)),
  ),
  /** Fusion and outside: a line that steps out a half step above the strings and comes back. */
  gfusion: art(
    'tan',
    'purple',
    neck(28, 16, 2),
    P('M8 34 L16 34 L20 13 L28 13 L32 34 L40 34', 'accentline', 2.2),
    H(8, 34, 4.2, 'body'),
    H(40, 34, 4.2, 'body'),
    H(20, 13, 4.2, 'accent'),
    H(28, 13, 4.2, 'accent'),
    det(L(24, 5, 24, 10, 'wire', 1.4)),
  ),
  /** Chord-melody arranging: a stacked chord with its melody on top, an arrow into the next one. */
  gcmarr: art(
    'lilac',
    'tan',
    H(9, 40, 4, 'body'),
    H(9, 32.5, 4, 'body'),
    H(9, 25, 4, 'body'),
    H(9, 13, 4.6, 'accent'),
    P('M18 24 L27 24 L27 20 L33 26 L27 32 L27 28 L18 28 Z', 'accent'),
    H(39, 38, 4, 'body'),
    H(39, 30.5, 4, 'body'),
    H(39, 23, 4, 'body'),
    H(39, 9, 4.6, 'accent'),
    rich(L(13, 12, 13, 4, 'wire', 1.4), L(43, 8, 43, 1.5, 'wire', 1.4)),
  ),
  /** Solo jazz guitar: walking quarters low, a two-note shell above on the "and". */
  gsolojazz: art(
    'lilac',
    'tan',
    R(2, 3, 44, 42, 4, 'light'),
    det([14, 20, 26, 32, 38].map((y) => L(5, y, 43, y, 'line', 0.9))),
    N(9, 38, 3.8, 13, 'ink', 1.5),
    N(18, 35, 3.8, 13, 'ink', 1.5),
    N(30, 32, 3.8, 13, 'ink', 1.5),
    N(39, 29, 3.8, 13, 'ink', 1.5),
    H(24, 17, 4, 'accent'),
    H(24, 11, 4, 'accent'),
    rich(L(27.6, 10, 27.6, 5, 'inkline', 1.3)),
  ),
  /** Harris lines at tempo: the falling line with a speed streak. */
  ghlfast: art(
    'lilac',
    'tan',
    H(17, 10, 4.4, 'body'),
    H(25, 18, 4.4, 'body'),
    H(33, 26, 4.4, 'body'),
    H(41, 34, 4.4, 'body'),
    det(H(37, 30, 2.4, 'accent')),
    L(3, 12, 11, 12, 'accentline', 2),
    L(3, 19, 17, 19, 'accentline', 2),
    det(L(3, 26, 23, 26, 'accentline', 2)),
    R(2, 41, 44, 5, 2, 'light'),
    rich(L(3, 43.5, 45, 43.5, 'line', 0.8)),
  ),
  /** Triad pairs on the neck: two three-dot shapes a step apart, joined by a bracket. */
  tpairneck: art(
    'tan',
    'purple',
    neck(10, 26, 3, [14, 26, 38]),
    Ci(8, 30.5, 3.2, 'body'),
    Ci(20, 23, 3.2, 'body'),
    Ci(8, 16.5, 3.2, 'body'),
    Ci(20, 30.5, 3.2, 'accent'),
    Ci(32, 23, 3.2, 'accent'),
    Ci(20, 16.5, 3.2, 'accent'),
    P('M8 41 L8 44 L32 44 L32 41', 'accentline', 1.8),
    rich(Ci(32, 30.5, 1.4, 'mark')),
  ),
  /** Meter and cross-rhythm on the guitar: "3:2" with beat ticks grouped 3 against 2. */
  gmeter: art(
    'tan',
    'purple',
    markParts(
      '3:2',
      det(R(17, 42.5, 2.4, 4.5, 1.2, 'mark'), R(22, 42.5, 2.4, 4.5, 1.2, 'mark'), R(27, 42.5, 2.4, 4.5, 1.2, 'mark'), R(33.5, 42.5, 3, 4.5, 1.2, 'accent'), R(39.5, 42.5, 3, 4.5, 1.2, 'accent')),
    ),
  ),
  /** On the bandstand (guitar): "Gig·6" with a pick. */
  /** The cadence chart library on the neck: "V→I·6". */
  gcadlib: art('tan', 'purple', markParts('V→I·6')),
  ggig: art(
    'tan',
    'purple',
    markParts('Gig·6', [P(pickPath(40.5, 34, 0.3), 'accent')]),
  ),
  /** Jazz blues on the guitar: "I7·IV7" with a bent blue note. */
  gjblues: art(
    'indigo',
    'tan',
    markParts('I7·IV7', det(P('M30 4 L34 4 Q 37 4, 38 1', 'wire', 1.4), H(41, 2.6, 2, 'accent'))),
  ),
  /** The song's chords, strummed: a melody line above, a three-note chord and a down-strum arrow. */
  songstrum: art(
    'tan',
    'purple',
    an('vibrate', { d: 1 }, P('M3 12 C 8 4, 13 4, 17 10 S 26 16, 31 8', 'accentline', 2)),
    H(17, 10, 2.8, 'accent'),
    H(31, 8, 2.8, 'accent'),
    H(14, 41, 4.4, 'body'),
    H(14, 32.5, 4.4, 'body'),
    H(14, 24, 4.4, 'body'),
    L(18, 40, 18, 17, 'wire', 1.6),
    an('slide', { r: true }, downArrow(36, 18, 45, 2.4, 'body')),
    rich(H(12.6, 23.2, 1.5, 'light')),
  ),
  /** Strum Changes (game): six strings and a down-strum arrow across them, a chord change marked. */
  strumchange: art(
    'tan',
    'purple',
    R(4, 8, 40, 36, 4, 'light'),
    [13, 18, 23, 28, 33, 38].map((y) => L(5, y, 43, y, 'line', 1)),
    downArrow(24, 2, 47, 3, 'accent'),
    det(T(11, 34, 'G', 9, 'ink'), T(37, 34, 'C', 9, 'ink')),
    rich(L(22.6, 5, 22.6, 34, 'shine', 0.9)),
  ),
};

// Paper scenes: the wider drawings that are not 48-grid icons, in the same language and through the same renderer
// (PaperSvg with its own viewBox): the instrument sound cards (120 x 72, viewBox 0 -6 120 72), the first-session medal
// (48 grid), the game intros of Tune-up and the Echo games (300 x 120). Flat sheets with their edge below, tones of
// one hue plus an accent, the tilted note head as the motif. No outlines, no literal colours, no lemon.
import { an, art, Ci, det, E, H, L, N, P, R, rich, star, type Art, type HueName, type Part } from './kit';

/** A keyboard: a light sheet of white keys, deep cut lines between them, ink black keys (the 2 + 3 pattern). */
function keyboard(x: number, y: number, w: number, n: number, h = 14): Part[] {
  const kw = w / n;
  const out: Part[] = [R(x, y, w, h, 1.6, 'light')];
  for (let i = 1; i < n; i++) out.push(L(+(x + kw * i).toFixed(2), y + 0.8, +(x + kw * i).toFixed(2), y + h - 0.8, 'line', 0.9));
  for (let i = 0; i < n - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) out.push(R(+(x + kw * (i + 1) - kw * 0.3).toFixed(2), y, +(kw * 0.6).toFixed(2), +(h * 0.6).toFixed(2), 0.8, 'ink'));
  return out;
}
/** A leg / stand: a small solid sheet over the background. */
const leg = (x: number, y: number, h: number, w = 4): Part => R(x, y, w, h, 1.6, 'mark');
/** The motif in the corner: a little accent note rising off the instrument (badge detail; plays on tap). */
const motif = (x: number, y: number, s = 4.2): Part[] => an('hop', { d: 1 }, N(x, y, s, 9, 'accent', 1.8, 1));

export const INSTRUMENT_VIEWBOX = '0 -6 120 72';

export const INSTRUMENT_ART: Record<string, Art> = {
  grand: art(
    'purple',
    'pink',
    P('M20 14 L62 0.5 L65.5 3.6 L30 15 Z', 'light'),
    L(36, 12.6, 58, 3, 'wire', 1.8),
    P('M14 40 L14 22 Q14 12 30 12 L70 12 Q86 12 96 22 Q106 32 108 40 Z', 'body'),
    P('M20 36 L20 23.5 Q20 17 31 17 L69 17 Q82 17 90 25 Q96 31 99 36', 'shine', 1.4),
    keyboard(14, 40, 60, 12, 10),
    R(74, 40, 34, 4, 1.4, 'ink'),
    leg(21, 50, 11),
    leg(58, 50, 11),
    leg(99, 44, 17),
    motif(100, 10),
  ),
  upright: art(
    'tan',
    'purple',
    R(24, 4, 72, 36, 4, 'body'),
    R(30, 9, 60, 9, 2, 'light'),
    det(E(44, 13.5, 3.5, 2.4, 0, 'body'), E(76, 13.5, 3.5, 2.4, 0, 'body')),
    R(30, 22, 60, 14, 2, 'ink'),
    rich(L(36, 25, 36, 33, 'shine', 1), L(84, 25, 84, 33, 'shine', 1)),
    keyboard(20, 40, 80, 14, 10),
    leg(25, 50, 11),
    leg(91, 50, 11),
    motif(102, 4),
  ),
  classic: art(
    'sky',
    'purple',
    R(10, 14, 100, 18, 4, 'body'),
    Ci(24, 23, 3.6, 'ink'),
    Ci(36, 23, 3.6, 'ink'),
    R(48.5, 18.5, 3, 9, 1.2, 'light'),
    R(56.5, 18.5, 3, 9, 1.2, 'light'),
    R(64.5, 18.5, 3, 9, 1.2, 'light'),
    P('M77 23 Q83 15 89 23 T101 23', 'shine', 2),
    keyboard(10, 32, 100, 15, 16),
    motif(104, 4),
  ),
  wurli: art(
    'pink',
    'purple',
    P('M12 18 Q12 10 22 10 H98 Q108 10 108 18 V34 H12 Z', 'body'),
    R(20, 15, 34, 5, 2.5, 'light'),
    det(Ci(94, 20, 3, 'ink'), Ci(84, 20, 3, 'ink')),
    keyboard(16, 34, 88, 14, 10),
    P('M25 44 L28.5 44 L21 62 L17.5 62 Z', 'mark'),
    P('M95 44 L91.5 44 L99 62 L102.5 62 Z', 'mark'),
    motif(106, 0),
  ),
  tine: art(
    'teal',
    'purple',
    R(10, 10, 100, 22, 3, 'body'),
    R(18, 16, 44, 4, 2, 'light'),
    R(68.5, 14, 3, 13, 1.2, 'ink'),
    R(76.5, 14, 3, 13, 1.2, 'ink'),
    R(84.5, 14, 3, 13, 1.2, 'ink'),
    R(92.5, 14, 3, 13, 1.2, 'ink'),
    keyboard(10, 32, 100, 15, 14),
    leg(18, 46, 16),
    leg(98, 46, 16),
    motif(106, -2),
  ),
  tonewheel: art(
    'indigo',
    'tan',
    R(12, 8, 96, 44, 4, 'body'),
    an('slide', {}, R(26.5, 11, 3.4, 8, 1.4, 'accent')),
    an('slide', { d: 1 }, R(34.5, 11, 3.4, 12, 1.4, 'accent')),
    an('slide', { d: 2 }, R(42.5, 11, 3.4, 16, 1.4, 'accent')),
    R(50.5, 11, 3.4, 8, 1.4, 'light'),
    R(58.5, 11, 3.4, 12, 1.4, 'light'),
    keyboard(18, 24, 84, 12, 9),
    keyboard(18, 36, 84, 12, 9),
    leg(20, 52, 10),
    leg(96, 52, 10),
  ),
  organ: art(
    'lilac',
    'purple',
    ...[16, 26, 36, 46, 56, 66, 76, 86, 96].map((x, i) => {
      const h = 40 - Math.abs(4 - i) * 6;
      return R(x, 46 - h, 8, h, 4, i % 2 ? 'light' : 'body');
    }),
    det(...[16, 36, 56, 76, 96].map((x) => R(x + 2, 38, 4, 2.4, 1.2, 'ink'))),
    R(12, 45, 96, 4, 1.6, 'ink'),
    keyboard(14, 48, 92, 14, 10),
  ),
  vibraphone: art(
    'sky',
    'indigo',
    ...Array.from({ length: 8 }, (_, i) => R(12 + i * 12.5, 8 + i * 1.6, 10, 30 - i * 1.6, 2, i % 2 ? 'light' : 'body')),
    ...Array.from({ length: 8 }, (_, i) => R(15.5 + i * 12.5, 40, 3, 14 - i, 1.4, 'mark')),
    R(10, 38, 102, 3, 1.4, 'ink'),
    an('strike', { o: [106, -4] }, L(106, -4, 91, 6, 'wire', 2.2), Ci(89, 7, 4.2, 'accent')),
  ),
  marimba: art(
    'tan',
    'purple',
    ...Array.from({ length: 8 }, (_, i) => R(12 + i * 12.5, 10, 10, 34 - i * 2.5, 2, i % 2 ? 'light' : 'body')),
    det(...Array.from({ length: 8 }, (_, i) => Ci(17 + i * 12.5, 14, 1.2, 'ink'))),
    R(10, 48, 102, 4, 1.6, 'mark'),
    leg(16, 50, 12),
    leg(102, 50, 12),
    motif(108, 0),
  ),
  harp: art(
    'green',
    'purple',
    P('M24 60 L24 6 Q24 2.5 28 3 Q62 2 96 32 L96 44 Q70 30 30 58 L30 60 Z', 'body'),
    P('M30 52 L30 9 Q60 8 90 34 L90 39 Q66 30 30 52 Z', 'light'),
    ...[36, 44, 52, 60, 68, 76, 84].map((x, i) => an('vibrate-x', { d: (i % 4) as 0 | 1 | 2 | 3 }, L(x, 9 + i * 3.4, x, 48 - i * 1.8, 'line', 1.1))),
    R(20, 58, 26, 4.5, 2, 'mark'),
  ),
  harpsichord: art(
    'teal',
    'pink',
    P('M12 40 V18 H72 L108 30 V40 Z', 'body'),
    P('M18 23 H70.5 L100 33 V36 H18 Z', 'light'),
    det(L(24, 26, 96, 34.5, 'line', 0.9), L(24, 29.5, 90, 35.5, 'line', 0.9)),
    keyboard(12, 40, 44, 7, 8),
    keyboard(12, 48, 44, 7, 8),
    R(56, 40, 52, 4, 1.4, 'ink'),
    leg(18, 56, 6),
    leg(100, 44, 18),
    leg(48, 56, 6),
    motif(104, 14),
  ),
};

/** The first-session medal (48 grid): a ribbon, a disc in the course hue with a light ring and a star cut from it. */
export const medalArt = (hue: HueName = 'purple'): Art =>
  art(
    hue,
    'rose',
    P('M14 2 H21 L17 17 H10 Z', 'accent'),
    P('M34 2 H27 L31 17 H38 Z', 'accent'),
    Ci(24, 30, 15, 'body'),
    Ci(24, 30, 10.5, 'light'),
    an('hop', {}, P(star(24, 30.6, 7.2), 'ink')),
    rich(P('M13.5 24 Q16 17.5 23 16.2', 'shine', 1.4)),
  );

/** A staff on a scene: five notation lines in the free tone (deep on light, lifted on dark), readable on the card. */
const staff = (w: number, ys = [40, 52, 64, 76, 88]): Part[] => ys.map((y) => L(10, y, w - 10, y, 'wire', 1.2));
/** A big note head with its edge (the motif). */
const head = (x: number, y: number, role: 'body' | 'accent' | 'light' | 'ink' = 'body', s = 11): Part => H(x, y, s, role);

export const GAME_VIEWBOX = '0 0 300 120';

/** Tune-up: a wobbly note slides onto the target line (the dashed target strip). */
export const TUNE_UP_ART: Art = art(
  'teal',
  'pink',
  staff(300),
  ...Array.from({ length: 13 }, (_, i) => R(20 + i * 20, 61, 12, 6, 3, 'body')),
  P('M40 92 C70 92 80 40 110 44 S150 80 180 66 S220 62 236 64', 'accentline', 1.6),
  head(40, 92, 'accent'),
  head(110, 44, 'accent'),
  an('hop', {}, head(246, 64, 'ink')),
  L(262, 46, 268, 36, 'wire', 3),
  L(270, 54, 280, 50, 'wire', 3),
);

/** Echo: a phrase (left, in the accent) and its echo a beat later (right, in the hue), a barline and sound waves between. */
export const echoArt = (kind: 'melody' | 'rhythm'): Art => {
  const ys = kind === 'melody' ? [76, 58, 64, 46] : [64, 64, 64, 64];
  return art(
    kind === 'melody' ? 'sky' : 'pink',
    'purple',
    staff(300),
    R(148.5, 34, 3, 60, 1.4, 'mark'),
    ...ys.map((y, i) => head(24 + i * 30, y, 'accent')),
    ...ys.map((y, i) => an('hop', { d: (i + 1) as 1 | 2 | 3 | 4 }, head(176 + i * 30, y, 'body'))),
    an('pulse', { o: [126, 64] }, P('M134 50a16 16 0 0 1 0 28', 'wire', 3)),
    an('pulse', { o: [126, 64], d: 1 }, P('M142 42a26 26 0 0 1 0 44', 'wire', 3)),
  );
};

/** The path's unit test node: a fermata over a final double barline (60 x 90), as sheets with their edges. */
export const PATH_CHECK_VIEWBOX = '0 0 60 90';
export const PATH_CHECK_ART: Art = art(
  'purple',
  'rose',
  P('M10 27 A20 20 0 0 1 50 27 Q50 29.5 48 29.5 Q46 29.5 46 27 A16 16 0 0 0 14 27 Q14 29.5 12 29.5 Q10 29.5 10 27 Z', 'body'),
  an('hop', {}, Ci(30, 22, 3.8, 'body')),
  R(24, 34, 3, 54, 0.6, 'mark'),
  R(31, 34, 9, 54, 0.6, 'mark'),
);
/** The path's review node: a repeat sign (40 x 90). */
export const PATH_REPEAT_VIEWBOX = '0 0 40 90';
export const PATH_REPEAT_ART: Art = art(
  'purple',
  'rose',
  R(6, 34, 6, 54, 0.6, 'mark'),
  R(17, 34, 2.5, 54, 0.6, 'mark'),
  an('hop', {}, Ci(27, 55, 3.6, 'body')),
  an('hop', { d: 1 }, Ci(27, 69, 3.6, 'body')),
);

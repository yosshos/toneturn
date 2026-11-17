// Paper drawings for the gifts between friends (SPEC-PHRASE-STUDIO §20.1): the gift itself, the fermata that holds a
// friend's missed day, a phrase dedicated to a friend, and "practise with me now". Layered tonal sheets, no outlines:
// a light sheet under body sheets, details in the deep tone, the tilted note head as the accent.
import { an, Ci, det, H, L, P, R, rich, art, type Art } from './kit';

export const ART_GIFTS: Record<string, Art> = {
  /** A gift: a box and its lid, a light ribbon sheet, the bow's two loops in the accent tied with a note head. */
  gift: art(
    'rose',
    'purple',
    R(9, 22.5, 30, 19.5, 3.5, 'body'),
    R(21, 22.5, 6, 19.5, 0, 'light'),
    det(L(12.5, 27, 12.5, 38, 'shine', 1.4)),
    an(
      'hop',
      {},
      R(6.5, 15, 35, 8.5, 3, 'body'),
      R(21, 15, 6, 8.5, 0, 'light'),
      P('M24 15.5 Q15.5 4.5 11 9 Q8.8 13.6 24 15.5 Z', 'accent'),
      P('M24 15.5 Q32.5 4.5 37 9 Q39.2 13.6 24 15.5 Z', 'accent'),
      H(24, 15, 3.2, 'ink'),
    ),
    rich(L(30, 27, 36, 27, 'shine', 1.2)),
  ),
  /** The fermata gift: a day card (one held day of the streak) with the fermata cut as a sheet and its dot a note head. */
  'gift-fermata': art(
    'rose',
    'purple',
    R(7, 12, 34, 30, 5, 'light'),
    P('M7 17 Q7 12 12 12 H36 Q41 12 41 17 V19 H7 Z', 'body'),
    det(R(14, 8, 3.4, 7.5, 1.7, 'mark'), R(30.6, 8, 3.4, 7.5, 1.7, 'mark')),
    P('M12.5 37 A11.5 11.5 0 0 1 35.5 37 L31.6 37 A7.6 7.6 0 0 0 16.4 37 Z', 'body'),
    an('hop', {}, H(24, 34, 2.9, 'accent')),
    rich(L(11, 40, 37, 40, 'line', 0.8)),
  ),
  /** A dedicated phrase: a gift tag (light sheet, an eyelet in the body hue) carrying two beamed notes, one the accent. */
  'gift-dedicate': art(
    'rose',
    'purple',
    an('swing', { o: [12, 24] }, P('M15 8 H38.5 Q42.5 8 42.5 12 V36 Q42.5 40 38.5 40 H15 L5.5 24 Z', 'light'), Ci(12.5, 24, 2.6, 'body')),
    det(P('M12.5 24 Q7 30 3.5 39', 'wire', 1.8)),
    H(22, 32, 3.8, 'ink'),
    L(25.4, 31, 25.4, 17.5, 'inkline', 2),
    H(33.5, 29, 3.8, 'accent'),
    L(36.9, 28, 36.9, 14.5, 'inkline', 2),
    P('M24.6 16.6 L37.7 13.6 L37.7 17.2 L24.6 20.2 Z', 'ink'),
    rich(R(18, 11.5, 14, 1.6, 0.8, 'body')),
  ),
  /** Practise with me now: two notes on one beam over a shared light sheet — one in the body hue, one in the accent. */
  'gift-together': art(
    'rose',
    'purple',
    Ci(24, 24, 19, 'light'),
    P('M19.4 12.6 L37.2 8.6 L37.2 13.4 L19.4 17.4 Z', 'ink'),
    an('nod', { o: [16, 33] }, H(15.5, 33, 5.2, 'body'), L(20.3, 31.7, 20.3, 13.5, 'inkline', 2.2)),
    an('nod', { o: [31, 29], d: 1 }, H(31.5, 29.5, 5.2, 'accent'), L(36.3, 28.2, 36.3, 9.6, 'inkline', 2.2)),
    det(Ci(24, 24, 15.5, 'dash')),
  ),
};

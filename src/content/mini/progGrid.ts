// Progressions by ear (owner 2026-11-14): the quick lesson before the grid dictation and the instrument playback
// levels — roots first (follow the bass), then the colour of each chord (3rd, 7th, the top note), slash bass. Every
// example is voiced by the same code as the exercises (src/engine/progGrid.ts). See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { bassMidi, progEvents, realize, type DChord, type GridVoicing } from '../../engine/progGrid';

const C = (deg: string, q: DChord['q'], x: DChord['x'] = 'none', beats = 4): DChord => ({ deg, q, x, beats });
const prog = (ds: DChord[], style: GridVoicing = 'close', bpm = 100): Stimulus => {
  const r = progEvents(ds.map((d) => realize(0, d)), style, bpm);
  return { kind: 'events', events: r.events, length: r.length };
};
const bassLine = (ds: DChord[], bpm = 100): Stimulus => {
  const spb = 60 / bpm;
  const events = ds.map((d, i) => ({ midi: bassMidi(realize(0, d).root) + 12, start: i * 4 * spb, duration: 3.6 * spb, velocity: 0.7, inst: 'bass' as const }));
  return { kind: 'events', events, length: ds.length * 4 * spb + 0.4 };
};
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

const TURN = [C('1', 'maj7'), C('6', 'm7'), C('2', 'm7'), C('5', '7')];

export const LESSONS: MiniLesson[] = [
  {
    id: 'hearing-progressions',
    area: 'harmony',
    emoji: 'ii',
    title: { en: 'Hearing progressions: roots first, then colour', he: 'לשמוע מהלכים: קודם שורשים, אחר כך צבע' },
    takeaway: {
      en: 'Write every root first, from the bass, as a degree of the key. Then each chord’s colour: minor or major 3rd, which 7th, then the top note (9, 13, ♭9, alt). A bass that is not the root is a slash chord.',
      he: 'קודם כותבים כל שורש, מהבס, כדרגה בסולם. אחר כך הצבע של כל אקורד: טרצה קטנה או גדולה, איזו ספטימה, ואז הצליל העליון (9, ‏13, ‏♭9, ‏alt). בס שאינו השורש הוא אקורד סלאש.',
    },
    steps: [
      {
        say: { en: 'A progression has two layers: where the roots move, and the colour of each chord. Hear them one at a time.', he: 'למהלך יש שתי שכבות: לאן השורשים זזים, והצבע של כל אקורד. שומעים אותן אחת־אחת.' },
        play: [prog(TURN)],
        show: { text: { en: 'roots → colour', he: 'שורשים ← צבע' } },
      },
      {
        say: { en: 'Roots first. Follow the bass and name each note against home: one, six, two, five.', he: 'קודם השורשים. עקבו אחרי הבס ותנו שם לכל צליל ביחס לבית: אחת, שש, שתיים, חמש.' },
        play: [bassLine(TURN)],
        show: { text: { en: '1 – 6 – 2 – 5', he: '1 – 6 – 2 – 5' } },
      },
      {
        say: { en: 'Then the colour of each chord: a major or a minor 3rd, then which 7th. Here: major 7, minor 7, minor 7, dominant.', he: 'אחר כך הצבע של כל אקורד: טרצה גדולה או קטנה, ואז איזו ספטימה. כאן: מז׳ור 7, מינור 7, מינור 7, דומיננט.' },
        play: [prog(TURN)],
        show: { text: { en: 'Cmaj7 Am7 Dm7 G7', he: 'Cmaj7 Am7 Dm7 G7' } },
      },
      {
        say: { en: 'When the bass is not the root, the chord leans: C over E. The bass moves by step, the chord stays.', he: 'כשהבס אינו השורש, האקורד נשען: C מעל מי. הבס זז בצעד, האקורד נשאר.' },
        play: [prog([C('1', 'maj'), C('1', 'maj', '/3'), C('4', 'maj')])],
        show: { text: { en: 'C – C/E – F', he: 'C – C/E – F' } },
      },
      {
        say: { en: 'The top note last: a 13 is bright, a flat 9 is dark, altered is darker still.', he: 'הצליל העליון בסוף: ‏13 בהיר, ‏♭9 כהה, אלטרד כהה עוד יותר.' },
        play: [prog([C('5', '7', '13')], 'rootless', 80), rest(), prog([C('5', '7', 'b9')], 'rootless', 80), rest(), prog([C('5', '7', 'alt')], 'rootless', 80)],
        show: { text: { en: 'G13 · G7♭9 · G7alt', he: 'G13 · G7♭9 · G7alt' } },
      },
      {
        say: { en: 'Your turn: the roots of every bar first, then the colours. A right root already earns half.', he: 'תורכם: קודם השורשים של כל התיבות, ואז הצבעים. שורש נכון כבר שווה חצי.' },
      },
    ],
    more: [
      {
        say: { en: 'Roots move in patterns. Down a fifth is the strongest pull: two to five to one. Learn to feel it before you name it.', he: 'שורשים זזים בתבניות. ירידה בקווינטה היא המשיכה החזקה ביותר: שתיים לחמש לאחת. למדו להרגיש אותה לפני שאתם נותנים לה שם.' },
        play: [prog([C('2', 'm7'), C('5', '7'), C('1', 'maj7')], 'shell', 96)],
        show: { text: { en: 'Dm7 – G7 – Cmaj7', he: 'Dm7 – G7 – Cmaj7' } },
      },
      {
        say: { en: 'A bass that falls by half steps into home is a tritone substitute: D flat seven instead of G seven. The 3rd and 7th stay, the root moves a tritone.', he: 'בס שיורד בחצאי טונים אל הבית הוא תחליף טריטון: D♭7 במקום G7. הטרצה והספטימה נשארות, השורש זז בטריטון.' },
        play: [prog([C('2', 'm7'), C('b2', '7'), C('1', 'maj7')], 'shell', 96)],
        show: { text: { en: 'Dm7 – D♭7 – Cmaj7', he: 'Dm7 – D♭7 – Cmaj7' } },
      },
      {
        say: { en: 'A bass that steps up a whole tone into home is the backdoor: F minor seven, B flat seven, C. It sounds softer, borrowed from the minor.', he: 'בס שעולה בטון שלם אל הבית הוא הדלת האחורית: Fm7, ‏B♭7, ‏C. הוא נשמע רך יותר, שאול מהמינור.' },
        play: [prog([C('4', 'm7'), C('b7', '7'), C('1', 'maj7')], 'shell', 96)],
        show: { text: { en: 'Fm7 – B♭7 – Cmaj7', he: 'Fm7 – B♭7 – Cmaj7' } },
      },
      {
        say: { en: 'In minor, the two chord is half-diminished and the five has a flat nine: B half-diminished, E seven flat nine, A minor. Listen for the dark top note.', he: 'במינור, אקורד השתיים הוא חצי מוקטן והחמש עם ♭9: Bm7♭5, ‏E7♭9, ‏Am. הקשיבו לצליל העליון הכהה.' },
        play: [prog([C('7', 'm7b5'), C('3', '7', 'b9'), C('6', 'm7')], 'shell', 96)],
        show: { text: { en: 'Bm7♭5 – E7♭9 – Am7', he: 'Bm7♭5 – E7♭9 – Am7' } },
      },
      {
        say: { en: 'A common slip: hearing a slash chord as a new root. If the bass moves but the colour above does not change, it is an inversion.', he: 'טעות נפוצה: לשמוע אקורד סלאש כשורש חדש. אם הבס זז אבל הצבע מעליו לא משתנה, זה היפוך.' },
      },
      {
        say: { en: 'Recap: bass first, then the 3rd and 7th, then the top. Long forms repeat: in an AABA, write the A once and listen for the bridge.', he: 'לסיכום: קודם הבס, אחר כך הטרצה והספטימה, ואז הצליל העליון. צורות ארוכות חוזרות: ב־AABA כותבים את ה־A פעם אחת ומקשיבים לגשר.' },
      },
    ],
  },
];

/** The ear topic and the instrument levels open with this lesson (App.tsx gate: "topic:…" / "tech:<level id>"). */
export const UNITS: Record<string, string> = {
  'topic:grid-dictation': 'hearing-progressions',
  ...Object.fromEntries(
    ['k-ear-10', 'k-ear-11', 'k-ear-12', 'k-ear-13', 'k-ear-14', 'k-ear-15', 'k-ear-16', 'g-ear-11', 'g-ear-12', 'g-ear-13', 'b-ear-22', 'b-ear-23'].map((id) => [`tech:${id}`, 'hearing-progressions']),
  ),
};

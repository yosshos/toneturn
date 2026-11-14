// Quick lesson for "Read the chord" (0.38): see a chord drawn and name it fast. Plain words, sound first.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.4, arpeggio?: boolean): Stimulus => ({ kind: 'chord', midis, duration, ...(arpeggio ? { arpeggio } : {}) });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });

export const LESSONS: MiniLesson[] = [
  {
    id: 'chord-read',
    area: 'theory',
    emoji: '🎹',
    title: { en: 'Read the chord', he: 'לקרוא את האקורד' },
    takeaway: {
      en: 'Find the lowest note first: that is the bass. Then read the distances: a big third on the bottom is major, a small one is minor. A different note in the bass makes a slash chord, like C/E.',
      he: 'קודם מוצאים את הצליל הנמוך: זה הבס. אחר כך קוראים את המרחקים: טרצה גדולה למטה היא מז׳ור, קטנה היא מינור. צליל אחר בבס הופך את זה לאקורד סלאש, כמו C/E.',
    },
    steps: [
      {
        say: {
          en: 'Hi {name}! Here is C major: C, E and G, stacked in thirds. Look at the bottom note first. Here it is the root, and it gives the chord its name.',
          he: 'היי {name}! הנה דו מז׳ור: דו, מי וסול, בנויים בטרצות. מסתכלים קודם על הצליל התחתון. כאן הוא השורש, והוא נותן לאקורד את השם.',
        },
        play: [chord([60, 64, 67], 1.2, true), rest(0.2), chord([60, 64, 67])],
        show: { notes: [60, 64, 67], chord: true },
      },
      {
        say: {
          en: 'Now count up to the middle note. Four half steps is a major third: major. Three half steps is a minor third: minor. Listen to C, then C minor.',
          he: 'עכשיו סופרים עד הצליל האמצעי. ארבעה חצאי טון זו טרצה גדולה: מז׳ור. שלושה חצאי טון זו טרצה קטנה: מינור. הקשיבו לדו, ואז לדו מינור.',
        },
        play: [chord([60, 64, 67], 1.1), rest(0.3), chord([60, 63, 67], 1.3)],
        show: { notes: [60, 63, 67], chord: true },
      },
      {
        say: {
          en: 'Two minor thirds make a diminished chord; two major thirds make an augmented one. Add one more third on top and it becomes a seventh chord, like G7.',
          he: 'שתי טרצות קטנות נותנות אקורד מוקטן; שתי טרצות גדולות נותנות מוגדל. מוסיפים עוד טרצה למעלה וזה הופך לאקורד ספטימה, כמו סול 7.',
        },
        play: [chord([60, 63, 66], 1), rest(0.2), chord([60, 64, 68], 1), rest(0.2), chord([55, 59, 62, 65], 1.3)],
        show: { notes: [55, 59, 62, 65], chord: true },
      },
      {
        say: {
          en: 'If the bottom note is not the root, write it after a slash. These are the same three notes with E in the bass, so we call it C over E.',
          he: 'אם הצליל התחתון הוא לא השורש, כותבים אותו אחרי לוכסן. אלה אותם שלושה צלילים עם מי בבס, אז קוראים לזה דו מז׳ור עם מי בבס: C/E.',
        },
        play: [chord([52, 55, 60], 1.4)],
        show: { notes: [52, 55, 60], chord: true, text: { en: 'C/E', he: 'C/E' } },
      },
      {
        say: {
          en: 'On the guitar it works the same way: find the lowest string that plays, name it, then read the shape. Your turn! Look, find the bass, and name it fast.',
          he: 'בגיטרה זה עובד אותו דבר: מוצאים את המיתר הנמוך שמנגן, נותנים לו שם, ואז קוראים את הצורה. תורכם! הסתכלו, מצאו את הבס, ותנו שם מהר.',
        },
        show: { text: { en: 'bass → third → name', he: 'בס ← טרצה ← שם' } },
      },
    ],
    more: [
      {
        say: { en: 'A triad is three notes stacked in thirds: root, third and fifth. Two thirds give four qualities: major is a major third then a minor third, minor the reverse, diminished two minor thirds, augmented two major thirds. Hear C, Cm, Cdim and Caug.', he: 'משולש הוא שלושה צלילים בטרצות: שורש, טרצה וקווינטה. שתי טרצות נותנות ארבעה סוגים: מז׳ור הוא טרצה גדולה ואז קטנה, מינור הפוך, מוקטן שתי טרצות קטנות, מוגדל שתי טרצות גדולות. הקשיבו ל־C, Cm, Cdim ו־Caug.' },
        play: [chord([60, 64, 67], 1), rest(0.2), chord([60, 63, 67], 1), rest(0.2), chord([60, 63, 66], 1), rest(0.2), chord([60, 64, 68], 1)],
        show: { notes: [60, 64, 67], chord: true, text: { en: 'C · Cm · Cdim · Caug', he: 'C · Cm · Cdim · Caug' } },
      },
      {
        say: { en: 'Inversions reorder the same notes. Root position has the root in the bass; first inversion puts the third in the bass, C/E; second inversion puts the fifth there, C/G. The name stays C; only the bass changes.', he: 'היפוכים מסדרים מחדש את אותם צלילים. במצב יסודי השורש בבס; בהיפוך ראשון הטרצה בבס, C/E; בהיפוך שני הקווינטה בבס, C/G. השם נשאר C; רק הבס משתנה.' },
        play: [chord([48, 52, 55], 1), rest(0.2), chord([52, 55, 60], 1), rest(0.2), chord([55, 60, 64], 1.2)],
        show: { notes: [52, 55, 60], chord: true, text: { en: 'C · C/E · C/G', he: 'C · C/E · C/G' } },
      },
      {
        say: { en: 'On the staff, a root-position triad sits on three lines or three spaces in a row. An inversion shows a gap of a fourth; the upper note of that fourth is the root.', he: 'בחמשה, משולש במצב יסודי יושב על שלושה קווים או שלושה רווחים ברצף. בהיפוך רואים פער של קוורטה; הצליל העליון של הקוורטה הוא השורש.' },
        show: { notes: [55, 60, 64], chord: true, text: { en: 'G–C: root = C', he: 'G–C: השורש = C' } },
      },
      {
        say: { en: 'Add a third above the fifth for a seventh chord. Cmaj7 is C E G B; C7, the dominant seventh, is C E G B flat; Cm7 is C E flat G B flat; Cm7♭5, half-diminished, is C E flat G flat B flat.', he: 'מוסיפים טרצה מעל הקווינטה ומקבלים אקורד ספטימה. Cmaj7 הוא C E G B; C7, הספטימה הדומיננטית, הוא C E G B♭; Cm7 הוא C E♭ G B♭; Cm7♭5, חצי מוקטן, הוא C E♭ G♭ B♭.' },
        play: [chord([60, 64, 67, 71], 1.1), rest(0.2), chord([60, 64, 67, 70], 1.1), rest(0.2), chord([60, 63, 67, 70], 1.1), rest(0.2), chord([60, 63, 66, 70], 1.2)],
        show: { notes: [60, 64, 67, 70], chord: true, text: { en: 'Cmaj7 · C7 · Cm7 · Cm7♭5', he: 'Cmaj7 · C7 · Cm7 · Cm7♭5' } },
      },
      {
        say: { en: 'A slash chord names the chord, then the bass: G7/B is G7 with its third in the bass. The bass can also be a note outside the chord, as in C/D.', he: 'אקורד סלאש נותן את שם האקורד ואז את הבס: G7/B הוא G7 עם הטרצה בבס. הבס יכול להיות גם צליל מחוץ לאקורד, כמו C/D.' },
        play: [chord([47, 55, 62, 65], 1.4)],
        show: { notes: [47, 55, 62, 65], chord: true, text: { en: 'G7/B', he: 'G7/B' } },
      },
      {
        say: { en: 'On guitar, find the lowest string that sounds; x marks a muted string. The open C chord, x32010, has C in the bass. The shape x20003 puts B in the bass under G, D and G: that is G/B.', he: 'בגיטרה, מוצאים את המיתר הנמוך ביותר שמנגן; x מסמן מיתר מושתק. אקורד דו הפתוח, x32010, הוא עם דו בבס. הצורה x20003 שמה סי בבס מתחת לסול, רה וסול: זה G/B.' },
        play: [chord([48, 52, 55, 60, 64], 1.3, true), rest(0.2), chord([47, 50, 55, 59, 67], 1.4, true)],
        show: { notes: [47, 50, 55, 59, 67], chord: true, text: { en: 'x20003 = G/B', he: 'x20003 = G/B' } },
      },
      {
        say: { en: 'Common mistakes: naming an inversion after its bass note, and mixing up minor and diminished. Check the fifth: perfect means minor, diminished means diminished. Spell in thirds, too: augmented C is C E G sharp, not A flat.', he: 'טעויות נפוצות: לקרוא להיפוך על שם הבס שלו, ולבלבל בין מינור למוקטן. בדקו את הקווינטה: זכה — מינור, מוקטנת — מוקטן. וכתבו בטרצות: C מוגדל הוא C E G♯, לא A♭.' },
        show: { notes: [60, 64, 68], chord: true, text: { en: 'Caug = C E G♯', he: 'Caug = C E G♯' } },
      },
      {
        say: { en: 'In real music, inversions make smooth bass lines, like C, G/B, Am stepping down. To keep: bass first, then rebuild in thirds to find the root, then read the third and the fifth.', he: 'במוזיקה אמיתית, היפוכים יוצרים קווי בס חלקים, כמו C, G/B, Am שיורדים בצעדים. לזכור: קודם הבס, אחר כך בונים מחדש בטרצות כדי למצוא את השורש, ואז קוראים את הטרצה והקווינטה.' },
        play: [chord([48, 55, 64], 1), chord([47, 55, 62], 1), chord([45, 52, 60], 1.3)],
        show: { notes: [48, 47, 45], text: { en: 'C → G/B → Am', he: 'C → G/B → Am' } },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:chord-read': 'chord-read',
};

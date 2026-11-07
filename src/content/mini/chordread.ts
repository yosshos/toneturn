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
          en: 'Hi {name}! Here is C major: C, E and G, stacked like a snowman. Look at the bottom note first. That is the root, and it gives the chord its name.',
          he: 'היי {name}! הנה דו מז׳ור: דו, מי וסול, אחד על השני כמו איש שלג. מסתכלים קודם על הצליל התחתון. זה השורש, והוא נותן לאקורד את השם.',
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
          en: 'Squeeze the top note down and you get diminished. Push it up and you get augmented. Add one more third on top and it becomes a seventh chord, like G7.',
          he: 'מורידים את הצליל העליון וקיבלנו מוקטן. מעלים אותו וקיבלנו מוגדל. מוסיפים עוד טרצה למעלה וזה הופך לאקורד ספט, כמו סול 7.',
        },
        play: [chord([59, 62, 65], 1), rest(0.2), chord([60, 64, 68], 1), rest(0.2), chord([55, 59, 62, 65], 1.3)],
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
  },
];

export const UNITS: Record<string, string> = {
  'topic:chord-read': 'chord-read',
};

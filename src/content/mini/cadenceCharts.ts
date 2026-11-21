// The cadence chart library (docs/research/JAZZ-CADENCE-INVENTORY.md gap list 1–7): the quick lesson before the
// k-cadlib / g-cadlib / b-cadlib families. Standard material only: the major and minor ii–V–I in shells, the idea of a
// chart written in Roman numerals, the voicings the levels walk through.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });

export const LESSONS: MiniLesson[] = [
  {
    id: 'cadence-charts',
    area: 'harmony',
    emoji: 'V',
    title: { en: 'Cadence charts', he: 'דפי קדנצות' },
    takeaway: {
      en: 'A cadence chart is a short progression that lands on a key, written in Roman numerals: learn it once, play it in all 12 keys and in every voicing.',
      he: 'דף קדנצה הוא מהלך קצר שנוחת על סולם, כתוב בספרות רומיות: לומדים אותו פעם אחת, ומנגנים אותו בכל 12 הסולמות ובכל צורת קול.',
    },
    steps: [
      {
        say: { en: 'A cadence chart is a short progression that lands on a key: the ii–V–I, the turnaround, the backdoor, the tritone sub. Each is written in Roman numerals, so it fits every key.', he: 'דף קדנצה הוא מהלך קצר שנוחת על סולם: ii–V–I, הטרנאראונד, הדלת האחורית, תחליף הטריטון. כל אחד כתוב בספרות רומיות, ולכן הוא מתאים לכל סולם.' },
        show: { text: { en: 'ii7 – V7 – Imaj7', he: 'ii7 – V7 – Imaj7' } },
      },
      {
        say: { en: 'In C the major ii–V–I is Dm7, G7, Cmaj7. Here it is in shells: root, 3rd and 7th.', he: 'בדו, ה־ii–V–I המז׳ורי הוא Dm7, ‏G7, ‏Cmaj7. הנה הוא בשלדים: שורש, טרצה וספטימה.' },
        play: [chord([38, 53, 60]), chord([43, 53, 59]), chord([36, 52, 59], 1.8)],
        show: { text: { en: 'Dm7 → G7 → Cmaj7', he: 'Dm7 → G7 → Cmaj7' } },
      },
      {
        say: { en: 'In minor the ii is half-diminished, the V takes a flat 9 and the tonic is a minor 6th chord.', he: 'במינור ה־ii חצי-מוקטן, ה־V מקבל נונה מונמכת, והטוניקה היא אקורד מינור שש.' },
        play: [chord([38, 53, 56, 60]), chord([43, 53, 56, 59]), chord([36, 51, 57], 1.8)],
        show: { text: { en: 'iiø7 → V7♭9 → im6', he: 'iiø7 → V7♭9 → im6' } },
      },
      {
        say: { en: 'The backdoor reaches C from B flat 7, after F minor 7: a softer pull than G7.', he: 'הדלת האחורית מגיעה לדו מ־B♭7, אחרי Fm7: משיכה רכה יותר מ־G7.' },
        play: [chord([41, 56, 63]), chord([46, 56, 62]), chord([36, 52, 59], 1.8)],
        show: { text: { en: 'iv7 → ♭VII7 → Imaj7', he: 'iv7 → ♭VII7 → Imaj7' } },
      },
      {
        say: { en: 'Each level keeps the charts and changes the voicing: shells, guide tones, rootless, drop 2 and drop 3, four-way close, two hands, stride and a walking bass.', he: 'כל שלב שומר על הדפים ומחליף את צורת הקול: שלדים, צלילים מנחים, בלי שורש, דרופ 2 ודרופ 3, ארבעה קולות צמודים, שתי ידיים, סטרייד ובס מהלך.' },
        show: { text: { en: 'one chart · many voicings', he: 'דף אחד · הרבה צורות קול' } },
      },
      {
        say: { en: 'How your playing is measured: every chord as the level writes it, on time. On the bass, chord tones on the changes and approach notes into them.', he: 'איך הנגינה נמדדת: כל אקורד כפי שהשלב כותב אותו, בזמן. בבס: צלילי אקורד בחילופים, וצלילי גישה אליהם.' },
      },
      {
        say: { en: 'To keep: think in numerals, not chord names. Then every key is the same job, and the ear hears where the chart lands.', he: 'מה לזכור: חושבים בספרות, לא בשמות אקורדים. כך כל סולם הוא אותה עבודה, והאוזן שומעת לאן הדף נוחת.' },
      },
    ],
    more: [
      {
        say: { en: 'A Roman numeral names a chord by its distance from the tonic. ii is the minor chord on the second degree, V7 the dominant on the fifth. Upper case means a major third, lower case a minor third.', he: 'ספרה רומית קוראת לאקורד לפי המרחק שלו מהטוניקה. ii הוא האקורד המינורי על הדרגה השנייה, V7 הדומיננטה על החמישית. אות גדולה פירושה טרצה גדולה, אות קטנה טרצה קטנה.' },
        show: { text: { en: 'ii7 · V7 · Imaj7 · ♭VII7', he: 'ii7 · V7 · Imaj7 · ♭VII7' } },
      },
      {
        say: { en: 'The tritone substitution swaps V7 for the dominant a tritone away. G7 and D flat 7 share their 3rd and 7th, B and F, so D flat 7 resolves to C just as well, and the bass falls a half step.', he: 'תחליף הטריטון מחליף את V7 בדומיננטה שבמרחק טריטון. ל־G7 ול־D♭7 אותן טרצה וספטימה, סי ופה, ולכן D♭7 נפתר לדו באותה מידה, והבס יורד חצי טון.' },
        play: [chord([38, 53, 60]), chord([37, 53, 59]), chord([36, 52, 59], 1.8)],
        show: { text: { en: 'Dm7 → D♭7 → Cmaj7', he: 'Dm7 → D♭7 → Cmaj7' } },
      },
      {
        say: { en: 'A turnaround leads back to the top of a tune: I, vi, ii, V. With VI7 in place of vi the pull into ii grows stronger, because VI7 is the dominant of ii.', he: 'טרנאראונד מחזיר לתחילת השיר: I, ‏vi, ‏ii, ‏V. עם VI7 במקום vi המשיכה אל ii חזקה יותר, כי VI7 הוא הדומיננטה של ii.' },
      },
      {
        say: { en: 'Some charts borrow from the parallel minor key: flat VI and flat VII. In a major key they colour the way home; in a minor key the same chords are part of the key.', he: 'יש דפים ששואלים מהסולם המינורי המקביל: ♭VI ו־♭VII. בסולם מז׳ורי הם צובעים את הדרך הביתה; בסולם מינורי אותם אקורדים שייכים לסולם עצמו.' },
      },
      {
        say: { en: 'Rootless voicings leave the root to the bass and add the 9th: Dm7 as F, A, C, E; G7 as F, A, B, E; Cmaj7 as E, G, B, D.', he: 'קולות בלי שורש משאירים את השורש לבס ומוסיפים את הנונה: Dm7 בתור פה, לה, דו, מי; G7 בתור פה, לה, סי, מי; Cmaj7 בתור מי, סול, סי, רה.' },
        play: [chord([53, 57, 60, 64]), chord([53, 57, 59, 64]), chord([52, 55, 59, 62], 1.8)],
      },
      {
        say: { en: 'On the bass, a walking line plays each chord’s root on its first beat and leads into the next chord with a chord tone or a half step.', he: 'בבס, קו מהלך מנגן את השורש של כל אקורד בפעמה הראשונה שלו, ומוביל לאקורד הבא בצליל של האקורד או בחצי טון.' },
      },
      {
        say: { en: 'Practice one chart through all 12 keys, round the cycle of fourths, slowly at first. Say the numerals aloud as you play, then the chord names.', he: 'תרגלו דף אחד בכל 12 הסולמות, במעגל הקוורטות, לאט בהתחלה. אמרו בקול את הספרות תוך כדי נגינה, ואחר כך את שמות האקורדים.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'tech:k-cadlib': 'cadence-charts',
  'tech:g-cadlib': 'cadence-charts',
  'tech:b-cadlib': 'cadence-charts',
};

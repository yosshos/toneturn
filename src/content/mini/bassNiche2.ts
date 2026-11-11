// BASS_NICHE_PLAN (P2): quick lessons for the bass course's standards ladder and extended techniques. Each opens its
// family's first path step (unit "tech:<family>"). Own words and examples; the drills then measure them.

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });

export const LESSONS: MiniLesson[] = [
  {
    id: 'bass-standards',
    area: 'jazz',
    emoji: '𝄢',
    title: { en: 'The standards ladder', he: 'סולם הסטנדרטים' },
    takeaway: { en: 'Five tiers of tunes, from blues forms to Coltrane changes: walk a whole chorus from the chart, at the tier’s tempo, without losing the form.', he: 'חמש דרגות של שירים, מצורות בלוז ועד קולטריין צ׳יינג׳ס: ווקינג של סבב שלם מהצ׳ארט, בטמפו של הדרגה, בלי לאבד את הצורה.' },
    steps: [
      {
        say: { en: 'Hi {name}! A working jazz bassist knows tunes, not exercises. This ladder sorts the tunes into five tiers.', he: 'היי {name}! בסיסט ג׳אז שעובד מכיר שירים, לא תרגילים. הסולם הזה מסדר את השירים בחמש דרגות.' },
        play: [notes([29, 33, 36, 39, 34, 38, 41, 44], 0.45)],
      },
      {
        say: { en: 'Tier one is the blues and modal tunes: few chords, long forms, time first.', he: 'דרגה אחת היא בלוזים ושירים מודאליים: מעט אקורדים, צורות ארוכות, קודם כל הזמן.' },
        play: [chord([41, 45, 48, 51]), chord([46, 50, 53, 56])],
      },
      {
        say: { en: 'Tier two is rhythm changes and the ii–V tunes. Tier three is minor tunes, bossas and ballads, where the feel changes.', he: 'דרגה שתיים היא ריתם צ׳יינג׳ס ושירי ii–V. דרגה שלוש היא שירים במינור, בוסות ובלדות, שבהם התחושה משתנה.' },
        play: [notes([38, 41, 43, 47, 36, 40, 43, 45], 0.4)],
      },
      {
        say: { en: 'Tier four is bebop up-tempo, two hundred and more. Tier five is Coltrane changes, where the key moves every two beats.', he: 'דרגה ארבע היא ביבופ בטמפו מהיר, מאתיים ומעלה. דרגה חמש היא קולטריין צ׳יינג׳ס, שבהם הסולם זז כל שתי פעמות.' },
        show: { text: { en: 'B – G – E♭', he: 'B – G – E♭' } },
      },
      {
        say: { en: 'Your turn: only the chart is shown. Walk one chorus; I check the chord tones on every change, and on long forms that the second half keeps the tempo of the first.', he: 'תורכם: רק הצ׳ארט מוצג. ווקינג של סבב אחד; אני בודק צלילי אקורד בכל חילוף, ובצורות ארוכות שהחצי השני שומר על הטמפו של הראשון.' },
        play: [notes([31, 35, 38, 41], 0.55)],
      },
    ],
    more: [
      {
        say: { en: 'Why tiers? A tune is hard for a reason: speed, harmony that moves, or a feel that is not swing. Each tier adds one of those.', he: 'למה דרגות? שיר קשה מסיבה: מהירות, הרמוניה שזזה, או תחושה שאינה סווינג. כל דרגה מוסיפה אחת מהן.' },
      },
      {
        say: { en: 'In tier three the ballads are in two: a root on one, a fifth or a passing note on three, and the notes ring their full length.', he: 'בדרגה שלוש הבלדות בשתיים: יסוד על אחת, קווינטה או צליל עובר על שלוש, והצלילים מצלצלים באורך מלא.' },
        play: [notes([39, 46, 41, 48], 1)],
      },
      {
        say: { en: 'In a bossa, the bass plays the root and the fifth with a push before beat three. The chord tones still land on the changes.', he: 'בבוסה הבס מנגן יסוד וקווינטה עם דחיפה לפני פעמה שלוש. צלילי האקורד עדיין נוחתים בחילופים.' },
        play: [notes([36, 43, 43, 36], 0.5)],
      },
      {
        say: { en: 'Up-tempo, think in half-bars: aim for the chord tone of the next change and let the passing notes take care of themselves.', he: 'בטמפו מהיר חושבים בחצאי תיבות: מכוונים לצליל האקורד של החילוף הבא ונותנים לצלילים העוברים להסתדר לבד.' },
      },
      {
        say: { en: 'Coltrane changes move by major thirds. Learn the three key centres as shapes on the neck before you add speed.', he: 'קולטריין צ׳יינג׳ס זזים בטרצות גדולות. לומדים את שלושת המרכזים הטונליים כצורות על הצוואר לפני שמוסיפים מהירות.' },
        play: [notes([35, 43, 39, 47], 0.6)],
      },
      {
        say: { en: 'The usual mistake is losing the form in the bridge. Sing the melody in your head while you walk; it tells you where you are.', he: 'הטעות הנפוצה היא לאבד את הצורה בגשר. שרים את המנגינה בראש בזמן הווקינג; היא אומרת לכם איפה אתם.' },
      },
      {
        say: { en: 'To keep: tier by tier, a whole chorus, from the chart. When every tier is done, the set list badge is yours.', he: 'מה לזכור: דרגה אחרי דרגה, סבב שלם, מהצ׳ארט. כשכל הדרגות הושלמו, תג רשימת השירים שלכם.' },
        show: { text: { en: '1 · 2 · 3 · 4 · 5', he: '1 · 2 · 3 · 4 · 5' } },
      },
    ],
  },
  {
    id: 'bass-ext',
    area: 'play',
    emoji: '𝄢',
    title: { en: 'Extended techniques on the bass', he: 'טכניקות מורחבות על הבס' },
    takeaway: { en: 'Harmonics, tapping, double-stops and the fretless: each is measured by what it sounds like — the pitch, the chord, the timing, the cents.', he: 'הרמוניקים, טאפינג, צלילים כפולים ופרטלס: כל אחד נמדד לפי איך שהוא נשמע — הגובה, האקורד, הזמן, הסנטים.' },
    steps: [
      {
        say: { en: 'Hi {name}! Fusion bassists made the bass sing above the band. These levels teach the sounds they used.', he: 'היי {name}! בסיסטים של פיוז׳ן גרמו לבס לשיר מעל הלהקה. השלבים האלה מלמדים את הצלילים שהם השתמשו בהם.' },
        play: [notes([52, 55, 57, 62, 64], 0.5)],
      },
      {
        say: { en: 'Natural harmonics: touch the string lightly over the twelfth, seventh, fifth, fourth or third fret, and pluck. Each one is a higher partial of the open string.', he: 'הרמוניקים טבעיים: נוגעים קלות במיתר מעל הסריג השנים-עשר, השביעי, החמישי, הרביעי או השלישי, ופורטים. כל אחד הוא עילי גבוה יותר של המיתר הפתוח.' },
        play: [notes([40, 47, 52, 56, 59], 0.6)],
        show: { text: { en: '12 · 7 · 5 · 4 · 3', he: '12 · 7 · 5 · 4 · 3' } },
      },
      {
        say: { en: 'Tapping: the fretting hand sounds the root, the other hand taps the fifth, the octave and the tenth. Every note must be even in time.', he: 'טאפינג: היד הלוחצת משמיעה את היסוד, והיד השנייה מקישה את הקווינטה, האוקטבה והדצימה. כל צליל צריך להיות שווה בזמן.' },
        play: [notes([33, 40, 45, 49, 33, 40, 45, 49], 0.25)],
      },
      {
        say: { en: 'Double-stops: a tenth or a root with its seventh, two strings at once. Both notes must ring, and the microphone hears whether they do.', he: 'צלילים כפולים: דצימה, או יסוד עם הספטימה שלו, שני מיתרים יחד. שני הצלילים צריכים לצלצל, והמיקרופון שומע אם הם מצלצלים.' },
        play: [chord([38, 53]), chord([43, 53]), chord([36, 52])],
      },
      {
        say: { en: 'Your turn. I measure the pitch of every harmonic, the evenness of the tapping, both notes of each double-stop, and on a fretless the cents.', he: 'תורכם. אני מודד את הגובה של כל הרמוניק, את השוויון של הטאפינג, את שני הצלילים של כל צליל כפול, ובפרטלס את הסנטים.' },
      },
    ],
    more: [
      {
        say: { en: 'The harmonic over the third fret is two octaves and a fifth above the open string. Touch a little above the fret, not on it.', he: 'ההרמוניק מעל הסריג השלישי נמצא שתי אוקטבות וקווינטה מעל המיתר הפתוח. נוגעים מעט מעל הסריג, לא עליו.' },
        play: [notes([28, 59], 0.8)],
      },
      {
        say: { en: 'Artificial harmonics: fret a note, then touch the same string twelve frets higher with the plucking hand. It sounds an octave above the fretted note.', he: 'הרמוניקים מלאכותיים: לוחצים צליל, ואז נוגעים באותו מיתר שנים-עשר סריגים מעל ביד הפורטת. הוא נשמע אוקטבה מעל הצליל הלחוץ.' },
        play: [notes([43, 55], 0.8)],
      },
      {
        say: { en: 'Shells on the bass are the root and the seventh: the same shape for every chord, a fret apart between major seventh and dominant.', he: 'שלדים על הבס הם היסוד והספטימה: אותה צורה לכל אקורד, סריג אחד הבדל בין ספטימה גדולה לדומיננטית.' },
        play: [chord([36, 47]), chord([36, 46])],
      },
      {
        say: { en: 'Comping on the bass uses the Charleston rhythm: one, and the "and" of two. Keep it short and let the drums fill the rest.', he: 'ליווי על הבס משתמש במקצב הצ׳רלסטון: אחת, וה"וְ" של שתיים. שומרים על זה קצר ונותנים לתופים למלא את השאר.' },
      },
      {
        say: { en: 'On a fretless, slide into the target from below and stop exactly on it. Vibrato comes after the pitch is right, never instead of it.', he: 'בפרטלס מחליקים אל צליל המטרה מלמטה ונעצרים בדיוק עליו. הוויברטו בא אחרי שהגובה נכון, אף פעם לא במקומו.' },
        play: [notes([45, 47], 0.6)],
      },
      {
        say: { en: 'The usual mistake is pressing too hard on a harmonic, which kills it. Touch, pluck near the bridge, and lift.', he: 'הטעות הנפוצה היא ללחוץ חזק מדי על הרמוניק, וזה מכבה אותו. נוגעים, פורטים ליד הגשר, ומרימים.' },
      },
      {
        say: { en: 'To keep: every technique here is judged by its sound. If it sounds right, in time and in tune, it counts.', he: 'מה לזכור: כל טכניקה כאן נשפטת לפי הצליל שלה. אם היא נשמעת נכון, בזמן ומכוונת, היא נחשבת.' },
        show: { text: { en: 'pitch · chord · time · cents', he: 'גובה · אקורד · זמן · סנטים' } },
      },
    ],
  },
];

/** Unit id ("tech:<family>": the family's first path step) → mini-lesson id. */
export const UNITS: Record<string, string> = {
  'tech:b-std': 'bass-standards',
  'tech:b-ext': 'bass-ext',
};

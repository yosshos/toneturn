// PIANO_JAZZ (2026-11-10): quick lessons for the jazz-piano shapes on the keys path — Barry Harris's 6th-diminished
// chords and the jazz pianist's chord shapes. Own words and examples; the drills then measure them in time.

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });

export const LESSONS: MiniLesson[] = [
  {
    id: 'key-sixdim',
    area: 'play',
    emoji: '𝄞',
    title: { en: 'Barry Harris chords', he: 'האקורדים של בארי האריס' },
    takeaway: { en: 'C6 and B°7 share no note and together make an 8-note scale: harmonise each scale note with whichever of the two holds it.', he: 'ל-C6 ול-B°7 אין צליל משותף, ויחד הם סולם של 8 צלילים: כל צליל בסולם מקבל את האקורד מבין השניים שמכיל אותו.' },
    steps: [
      {
        say: { en: 'Hi {name}! Barry Harris built his harmony on two chords. The 6th chord: C, E, G, A.', he: 'היי {name}! בארי האריס בנה את ההרמוניה שלו על שני אקורדים. אקורד השישית: דו, מי, סול, לה.' },
        play: [chord([60, 64, 67, 69])],
        show: { notes: [60, 64, 67, 69] },
      },
      {
        say: { en: 'And the diminished chord on the 7th: B, D, F, A flat. It holds every note the 6th chord does not.', he: 'ואקורד מוקטן על הדרגה השביעית: סי, רה, פה, לה במול. יש בו כל צליל שאין באקורד השישית.' },
        play: [chord([59, 62, 65, 68])],
        show: { notes: [59, 62, 65, 68] },
      },
      {
        say: { en: 'Put them together and you get an 8-note scale. Under each melody note goes the chord that holds it: 6th, diminished, 6th, diminished.', he: 'מחברים אותם ומקבלים סולם של 8 צלילים. מתחת לכל צליל מנגינה בא האקורד שמכיל אותו: שישית, מוקטן, שישית, מוקטן.' },
        play: [chord([60, 64, 67, 72], 0.6), chord([62, 65, 68, 71], 0.6), chord([64, 67, 69, 72], 0.6), chord([65, 68, 71, 74], 0.6), chord([67, 69, 72, 76], 1)],
      },
      {
        say: { en: 'The diminished wants to go home: it is the sound of motion, the 6th chord the sound of rest. Play the scale of chords slowly and listen to it breathe in and out.', he: 'המוקטן רוצה לחזור הביתה: הוא הצליל של התנועה, ואקורד השישית הצליל של המנוחה. נגנו את סולם האקורדים לאט והקשיבו איך הוא נושם פנימה והחוצה.' },
        play: [chord([62, 65, 68, 71], 0.8), chord([64, 67, 69, 72])],
      },
      {
        say: { en: 'Your turn: build the shapes on the keys, from the note I give.', he: 'תורכם: בנו את הצורות על הקלידים, מהצליל שאני נותן.' },
        show: { text: { en: 'C6 · B°7 · C6', he: 'C6 · B°7 · C6' } },
      },
    ],
    more: [
      {
        say: { en: 'Borrowing: one voice of the 6th chord steps to its neighbour in the diminished while the others hold. G to A flat over C, E, A gives a new colour, then back.', he: 'השאלה: קול אחד של אקורד השישית צועד לשכן שלו במוקטן, והאחרים נשארים. סול ללה במול מעל דו, מי, לה נותן צבע חדש, ואז חוזרים.' },
        play: [chord([60, 64, 67, 69], 0.8), chord([60, 64, 68, 69], 0.8), chord([60, 64, 67, 69])],
      },
      {
        say: { en: 'Lower one note of a diminished chord a half step and you get a dominant 7th. Raise one a whole step and you get a 7 flat 9 on that note.', he: 'מורידים צליל אחד של אקורד מוקטן בחצי טון ומקבלים ספטאקורד דומיננטי. מרימים אחד בטון שלם ומקבלים 7♭9 על הצליל הזה.' },
        play: [chord([59, 62, 65, 68], 0.8), chord([59, 62, 67, 68], 0.8), chord([60, 64, 67, 69])],
      },
      {
        say: { en: 'Any chord of a tune can move this way. A minor 7th is the 6th chord a minor third up: D minor 7 is F6. A dominant is the minor 6th on its fifth.', he: 'כל אקורד בשיר יכול לזוז כך. מינור 7 הוא אקורד השישית טרצה קטנה מעליו: רה מינור 7 הוא F6. דומיננט הוא מינור 6 על הקווינטה שלו.' },
        play: [chord([53, 57, 60, 62], 0.9), chord([50, 53, 57, 59])],
      },
      {
        say: { en: 'Spread the chords over both hands: drop the 2nd and 4th voices an octave into the left hand. The same four notes now sound wide and warm, the way big bands voice them.', he: 'פורשים את האקורדים על שתי הידיים: מורידים את הקול השני והרביעי אוקטבה ליד שמאל. אותם ארבעה צלילים נשמעים עכשיו רחבים וחמים, כמו בתזמורת גדולה.' },
        play: [chord([45, 52, 60, 67], 0.8), chord([47, 53, 62, 68], 0.8), chord([48, 55, 64, 69])],
      },
      {
        say: { en: 'To keep: two chords, eight notes, each note its own chord. The drills play this in every key, then over real forms.', he: 'מה לזכור: שני אקורדים, שמונה צלילים, לכל צליל האקורד שלו. התרגילים מנגנים את זה בכל הסולמות, ואחר כך על צורות אמיתיות.' },
        show: { text: { en: '6 · °7 · 6 · °7', he: '6 · °7 · 6 · °7' } },
      },
    ],
  },
  {
    id: 'key-jazz',
    area: 'play',
    emoji: '𝄞',
    title: { en: 'Jazz chords', he: 'אקורדי ג׳אז' },
    takeaway: { en: 'Jazz pianists leave the root to the bass and play the 3rd, 7th and colours: rootless A and B, upper structures, 4ths.', he: 'פסנתרני ג׳אז משאירים את היסוד לבס ומנגנים טרצה, ספטימה וצבעים: בלי יסוד A ו-B, מבנים עליונים, קוורטות.' },
    steps: [
      {
        say: { en: 'Hi {name}! The bass plays the root, so the piano can drop it. D minor 9 without D: F, A, C, E. That is the A form, the 3rd at the bottom.', he: 'היי {name}! הבס מנגן את היסוד, אז הפסנתר יכול לוותר עליו. רה מינור 9 בלי רה: פה, לה, דו, מי. זו צורה A, הטרצה למטה.' },
        play: [chord([53, 57, 60, 64])],
        show: { notes: [53, 57, 60, 64] },
      },
      {
        say: { en: 'Move to G13 and only two notes move: F, A, B, E. Then C major 9: E, G, B, D. The hand barely travels.', he: 'עוברים ל-G13 ורק שני צלילים זזים: פה, לה, סי, מי. ואז דו מז׳ור 9: מי, סול, סי, רה. היד כמעט לא זזה.' },
        play: [chord([53, 57, 60, 64], 0.9), chord([53, 57, 59, 64], 0.9), chord([52, 55, 59, 62])],
      },
      {
        say: { en: 'The B form starts on the 7th: C, E, F, A for D minor 9. Use it to keep the hand in the middle of the keyboard.', he: 'צורה B מתחילה בספטימה: דו, מי, פה, לה לרה מינור 9. משתמשים בה כדי להשאיר את היד באמצע המקלדת.' },
        play: [chord([48, 52, 53, 57])],
      },
      {
        say: { en: 'Why drop the root? It frees a finger for the colours, the 9th and the 13th, and it keeps the left hand out of the bass player’s way.', he: 'למה לוותר על היסוד? זה משחרר אצבע לצבעים, הנונה והשלוש-עשרה, ומשאיר את יד שמאל מחוץ לדרכו של הבסיסט.' },
        play: [chord([41, 57, 60, 64], 0.9), rest(0.1), chord([53, 57, 60, 64])],
      },
      {
        say: { en: 'Your turn: build each shape up from the note I give.', he: 'תורכם: בנו כל צורה למעלה מהצליל שאני נותן.' },
        show: { text: { en: '3 5 7 9 · 7 9 3 5', he: '3 5 7 9 · 7 9 3 5' } },
      },
    ],
    more: [
      {
        say: { en: 'Upper structures: the left hand holds 3rd and 7th, the right hand plays a plain triad that adds colours. Over G7, an E flat triad gives flat 13, root and sharp 9.', he: 'מבנים עליונים: יד שמאל מחזיקה טרצה וספטימה, יד ימין מנגנת משולש פשוט שמוסיף צבעים. מעל G7, משולש מי במול נותן ♭13, יסוד ו-♯9.' },
        play: [chord([47, 53, 63, 67, 70])],
      },
      {
        say: { en: 'The So What chord: three perfect 4ths and a major 3rd on top. D, G, C, F, A. Move it through the dorian scale for modal tunes, one step at a time, while the bass holds the root.', he: 'אקורד So What: שלוש קוורטות זכות וטרצה גדולה למעלה. רה, סול, דו, פה, לה. מזיזים אותו בסולם הדורי בשירים מודאליים, צעד אחד בכל פעם, והבס מחזיק את היסוד.' },
        play: [chord([50, 55, 60, 65, 69])],
      },
      {
        say: { en: 'The altered dominant keeps 3rd and 7th and bends everything else: G7 with B, F, B flat, E flat pulls hard to C.', he: 'הדומיננט האלטרד שומר טרצה וספטימה ומעקם את כל השאר: G7 עם סי, פה, סי במול, מי במול מושך חזק לדו.' },
        play: [chord([59, 65, 70, 75], 0.9), rest(0.1), chord([60, 64, 67, 71])],
      },
      {
        say: { en: 'In a minor ii–V–i the colours change: D half-diminished, G7 with a flat 9 and flat 13, then C minor 6. The flat notes come from the minor key itself.', he: 'ב-ii–V–i מינורי הצבעים משתנים: רה חצי מוקטן, G7 עם ♭9 ו-♭13, ואז דו מינור 6. הצלילים המונמכים באים מהסולם המינורי עצמו.' },
        play: [chord([53, 56, 60, 64], 0.8), chord([53, 56, 59, 63], 0.8), chord([51, 55, 57, 62])],
      },
      {
        say: { en: 'To keep: the 3rd and 7th name the chord, the rest is colour. Find the shape, then let it move as little as it can to the next chord.', he: 'מה לזכור: הטרצה והספטימה קובעות את האקורד, השאר צבע. מוצאים את הצורה, ונותנים לה לזוז כמה שפחות לאקורד הבא.' },
        show: { text: { en: '3 · 7 · colour', he: '3 · 7 · צבע' } },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:key-sixdim': 'key-sixdim',
  'topic:key-jazz': 'key-jazz',
};

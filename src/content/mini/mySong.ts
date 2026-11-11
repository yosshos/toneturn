// Quick lessons for "My song" (SPEC-MY-SONG): playing along with your own recording (keys, guitar, bass, drums) and
// transcribing from it (ear, jazz). Own words and examples. Opened the first time the Practice tile is tapped.

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
const mel = (midis: number[], beats: number[], bpm = 100): Stimulus => ({ kind: 'melody', midis, beats, bpm });
/** A pulse of `n` clicks `each` seconds apart, the first of each group of `group` louder. */
const pulse = (n: number, each: number, group = 4, midi = 76): Stimulus => ({
  kind: 'events',
  events: Array.from({ length: n }, (_, i) => ({ midi, start: i * each, duration: each * 0.5, velocity: i % group === 0 ? 0.9 : 0.45 })),
  length: n * each,
});
const TUNE = [64, 62, 60, 62, 64, 64, 64];
const TUNE_BEATS = [1, 1, 1, 1, 1, 1, 2];

export const LESSONS: MiniLesson[] = [
  {
    id: 'my-song',
    area: 'play',
    emoji: '',
    title: { en: 'My song: play along with your own recording', he: 'השיר שלי: לנגן יחד עם הקלטה שלכם' },
    takeaway: { en: 'Open a recording of your own; the app finds its beat and its line, and measures only what it found clearly.', he: 'פותחים הקלטה משלכם; האפליקציה מוצאת את הפעמה ואת הקו, ומודדת רק את מה שמצאה בבירור.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here you practise over a recording of your own: a voice memo, your band at rehearsal, a take you made. It stays on this phone.', he: 'היי {name}! כאן מתרגלים מעל הקלטה משלכם: הקלטה קולית, הלהקה שלכם בחזרה, טייק שהקלטתם. היא נשארת בטלפון הזה.' },
        play: [mel(TUNE, TUNE_BEATS)],
      },
      {
        say: { en: 'First the app listens to it once. It finds the beat, the melody and the bass line, and keeps what it found, so the next time opens at once.', he: 'קודם האפליקציה מקשיבה לה פעם אחת. היא מוצאת את הפעמה, המנגינה וקו הבס, ושומרת את מה שמצאה, כך שבפעם הבאה הכול נפתח מיד.' },
        play: [pulse(8, 0.6)],
      },
      {
        say: { en: 'The song is cut into short sections. Loop one, slow it down without changing the pitch, and when you are ready, play along on headphones.', he: 'השיר מחולק לקטעים קצרים. שמים קטע בלולאה, מאטים בלי לשנות את הגובה, וכשמוכנים מנגנים יחד, עם אוזניות.' },
        play: [mel(TUNE, TUNE_BEATS, 70)],
      },
      {
        say: { en: 'Your notes are measured against the beat of the recording, and against its line when that line came out clearly. A steady small delay is forgiven.', he: 'הצלילים שלכם נמדדים מול הפעמה של ההקלטה, ומול הקו שלה כשהקו יצא ברור. איחור קטן וקבוע נסלח.' },
        play: [chord([48, 52, 55]), mel([60, 64, 67], [1, 1, 2])],
      },
      {
        say: { en: 'When the app is not sure, it says so on the screen and measures less: timing only, or nothing. It never guesses a score.', he: 'כשהאפליקציה לא בטוחה, היא אומרת את זה על המסך ומודדת פחות: רק תזמון, או כלום. היא אף פעם לא מנחשת ציון.' },
        show: { text: { en: 'timing · notes · not measured', he: 'תזמון · צלילים · לא נמדד' } },
      },
    ],
    more: [
      {
        say: { en: 'How the beat is found: every sudden rise in the sound is an onset. The app looks for the spacing that repeats most and lays a grid of beats over it.', he: 'איך מוצאים את הפעמה: כל עלייה פתאומית בצליל היא התחלה. האפליקציה מחפשת את המרווח שחוזר הכי הרבה ופורשת מעליו רשת של פעמות.' },
        play: [pulse(8, 0.5)],
      },
      {
        say: { en: 'A ballad sung freely has no steady beat. Then timing is not measured at all, and the screen tells you so.', he: 'בלדה ששרים בחופשיות אין לה פעמה יציבה. אז התזמון לא נמדד בכלל, והמסך אומר לכם את זה.' },
        play: [mel([67, 65, 64, 62, 60], [1.5, 0.5, 2, 1, 3], 72)],
      },
      {
        say: { en: 'The melody comes out cleanly when one voice is the loudest pitched sound. A full band mix gives gaps, so notes may be checked only in part.', he: 'המנגינה יוצאת נקייה כשקול אחד הוא הצליל הגבוה הבולט ביותר. מיקס מלא של להקה יוצר חורים, ולכן אולי ייבדקו רק חלק מהצלילים.' },
        play: [mel([72, 74, 76, 79], [1, 1, 1, 1])],
      },
      {
        say: { en: 'Bass players are checked against the bass line, drummers against the beat alone, keys and guitar against the melody.', he: 'נגני בס נבדקים מול קו הבס, מתופפים מול הפעמה בלבד, קלידים וגיטרה מול המנגינה.' },
        play: [mel([36, 43, 41, 43], [1, 1, 1, 1], 90)],
      },
      {
        say: { en: 'Headphones matter: through a speaker the microphone hears the recording itself, and the take would measure the song, not you. A MIDI keyboard needs no headphones.', he: 'אוזניות חשובות: דרך רמקול המיקרופון שומע את ההקלטה עצמה, והטייק היה מודד את השיר ולא אתכם. מקלדת MIDI לא צריכה אוזניות.' },
      },
      {
        say: { en: 'A slowed take counts a little less than one at full speed. Climb the speeds: seventy-five, ninety, then the real thing.', he: 'טייק מואט נחשב קצת פחות מטייק במהירות מלאה. מטפסים במהירויות: שבעים וחמש, תשעים, ואז הדבר האמיתי.' },
        play: [mel(TUNE, TUNE_BEATS, 75)],
      },
      {
        say: { en: 'Your songs are kept on this device only. Rename them, see your last score, and delete the ones you no longer need to free space.', he: 'השירים שלכם נשמרים רק במכשיר הזה. אפשר לשנות להם שם, לראות את הציון האחרון ולמחוק את מה שכבר לא צריך כדי לפנות מקום.' },
        show: { text: { en: 'on this device · never uploaded', he: 'במכשיר הזה · לא עולה לשום מקום' } },
      },
    ],
  },
  {
    id: 'my-song-ear',
    area: 'ear',
    emoji: '',
    title: { en: 'Transcribe from your own recording', he: 'לתמלל מהקלטה שלכם' },
    takeaway: { en: 'Loop one phrase of your recording, slow it down, then play or sing it back: it is compared note by note.', he: 'שמים משפט אחד מההקלטה בלולאה, מאטים, ואז מנגנים או שרים אותו בחזרה: הוא מושווה צליל אחר צליל.' },
    steps: [
      {
        say: { en: 'Hi {name}! The best transcriptions come from music you love. Open a recording of your own, and the app takes out its melody, phrase by phrase.', he: 'היי {name}! התמלולים הכי טובים באים ממוזיקה שאתם אוהבים. פותחים הקלטה משלכם, והאפליקציה מוציאה ממנה את המנגינה, משפט אחר משפט.' },
        play: [mel([67, 69, 71, 74, 72], [0.5, 0.5, 0.5, 0.5, 2], 110)],
      },
      {
        say: { en: 'Pick a phrase and loop it. Slow it down until you can sing it in your head. The pitch stays the same.', he: 'בוחרים משפט ושמים אותו בלולאה. מאטים עד שאפשר לשיר אותו בראש. הגובה נשאר אותו דבר.' },
        play: [mel([67, 69, 71, 74, 72], [0.5, 0.5, 0.5, 0.5, 2], 70)],
      },
      {
        say: { en: 'Then play or sing it back after the count-in. The comparison is the one the transcription coach uses: pitch and rhythm, and the first note that went wrong.', he: 'אחר כך מנגנים או שרים אותו בחזרה אחרי הספירה. ההשוואה היא אותה השוואה של מאמן התמלול: גובה וקצב, והצליל הראשון שהשתבש.' },
        show: { text: { en: 'pitch · rhythm · first miss', he: 'גובה · קצב · טעות ראשונה' } },
      },
      {
        say: { en: 'Sing it an octave lower if that is your voice: the octave does not count as a mistake.', he: 'אפשר לשיר אוקטבה נמוכה יותר אם זה הקול שלכם: האוקטבה לא נחשבת טעות.' },
        play: [mel([55, 57, 59, 62, 60], [0.5, 0.5, 0.5, 0.5, 2], 110)],
      },
      {
        say: { en: 'Each phrase you get right feeds your dictation rating and your daily goal. A slowed phrase counts a little less.', he: 'כל משפט שמצליחים בו מזין את דירוג ההכתבה ואת היעד היומי. משפט מואט נחשב קצת פחות.' },
        play: [chord([48, 52, 55, 59], 1.2)],
      },
    ],
    more: [
      {
        say: { en: 'The melody is found where one voice is the loudest pitched sound: a cappella singing, a voice with one instrument, a solo line. A full band blurs it.', he: 'המנגינה נמצאת כשקול אחד הוא הצליל הבולט ביותר: שירה בלי ליווי, קול עם כלי אחד, קו סולו. להקה מלאה מטשטשת אותה.' },
        play: [mel([64, 67, 69, 67], [1, 1, 1, 1])],
      },
      {
        say: { en: 'Long phrases are cut into pieces of up to eight notes. Two or three short pieces are easier to hold than one long line.', he: 'משפטים ארוכים נחתכים לחלקים של עד שמונה צלילים. קל יותר להחזיק שניים או שלושה חלקים קצרים מקו ארוך אחד.' },
        play: [mel([60, 62, 64, 65, 67, 69, 71, 72], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5], 110)],
      },
      {
        say: { en: 'Start with the shape: up or down, steps or leaps. Then find the first note against the key, and the rest follows from there.', he: 'מתחילים מהצורה: למעלה או למטה, צעדים או קפיצות. אחר כך מוצאים את הצליל הראשון ביחס לסולם, והשאר בא משם.' },
        play: [chord([48, 52, 55], 1), mel([64], [1.5])],
      },
      {
        say: { en: 'When the recording has a steady beat, the phrase is timed at its tempo. When it does not, rhythm is judged on your own pulse, so a steady player who is a little slower is not wrong.', he: 'כשיש להקלטה פעמה יציבה, המשפט מתוזמן בטמפו שלה. כשאין, הקצב נשפט לפי הדופק שלכם, כך שמי שמנגן יציב וקצת לאט יותר לא טועה.' },
      },
      {
        say: { en: 'A common mistake is to loop a whole verse. Take three or four notes, get them right, then add the next few. Slow is a tool, not a failure.', he: 'טעות נפוצה היא לשים בלולאה בית שלם. לוקחים שלושה או ארבעה צלילים, מדייקים, ואז מוסיפים את הבאים. איטי זה כלי, לא כישלון.' },
        play: [mel([67, 69, 71], [0.5, 0.5, 1], 80)],
      },
      {
        say: { en: 'Your recordings stay on this device. Keep the songs you are learning and delete the rest to free space.', he: 'ההקלטות שלכם נשארות במכשיר הזה. שומרים את השירים שלומדים ומוחקים את השאר כדי לפנות מקום.' },
        show: { text: { en: 'on this device · never uploaded', he: 'במכשיר הזה · לא עולה לשום מקום' } },
      },
    ],
  },
];

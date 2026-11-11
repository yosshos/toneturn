// Quick lessons for the lick trainer and the transcription coach (SPEC-LICKS-TRANSCRIPTION). Own words and examples.

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const mel = (midis: number[], beats: number[], bpm = 120): Stimulus => ({ kind: 'melody', midis, beats, bpm });
const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
/** The short ii–V–I line of the lesson (A G F D | F E D B | E). */
const LINE = [69, 67, 65, 62, 65, 64, 62, 59, 64];
const LINE_BEATS = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2];

export const LESSONS: MiniLesson[] = [
  {
    id: 'lick-trainer',
    area: 'jazz',
    emoji: '',
    title: { en: 'Licks: vocabulary in 12 keys', he: 'ליקים: אוצר מילים ב-12 סולמות' },
    takeaway: { en: 'A lick is a word of the language: learn it over its chords, in every key, up to tempo — then use it in a solo.', he: 'ליק הוא מילה בשפה: לומדים אותו מעל האקורדים שלו, בכל הסולמות, עד הטמפו — ואז משתמשים בו בסולו.' },
    steps: [
      {
        say: { en: 'Hi {name}! Jazz players speak in phrases they own, the way you speak in words. Here is a short one over D minor 7, G 7 and C major 7.', he: 'היי {name}! נגני ג׳אז מדברים במשפטים שהם שולטים בהם, כמו שאתם מדברים במילים. הנה אחד קצר מעל רה מינור 7, סול 7 ודו מז׳ור 7.' },
        play: [mel(LINE, LINE_BEATS)],
        show: { text: { en: 'Dm7 · G7 · Cmaj7', he: 'Dm7 · G7 · Cmaj7' } },
      },
      {
        say: { en: 'Notice where it lands: the 7th of G falls a half step to the 3rd of C. The chord tones sit on the beats.', he: 'שימו לב לאן הוא נוחת: הספטימה של סול יורדת בחצי טון לטרצה של דו. צלילי האקורד יושבים על הפעמות.' },
        play: [chord([55, 59, 65]), chord([48, 52, 59])],
      },
      {
        say: { en: 'A word you can say only in one key is not yours yet. The same line a whole step down sounds like this.', he: 'מילה שאפשר להגיד רק בסולם אחד עוד לא שלכם. אותו קו טון שלם למטה נשמע כך.' },
        play: [mel(LINE.map((m) => m - 2), LINE_BEATS)],
      },
      {
        say: { en: 'So the grid has a column for every key and a row for every tempo. Only a clean, measured take fills a cell.', he: 'לכן בטבלה יש עמודה לכל סולם ושורה לכל טמפו. רק ביצוע נקי ומדוד ממלא משבצת.' },
        show: { text: { en: '12 keys × 4 tempos', he: '12 סולמות × 4 טמפו' } },
      },
      {
        say: { en: 'At three stars the lick joins your review, and Use it opens: the band plays, you improvise, and the app listens for your lick over the right chords.', he: 'בשלושה כוכבים הליק נכנס לחזרות, ו"להשתמש" נפתח: הלהקה מנגנת, אתם מאלתרים, והאפליקציה מקשיבה אם הליק שלכם מופיע מעל האקורדים הנכונים.' },
        play: [mel([62, 65, 69, 72, 71], [0.5, 0.5, 0.5, 0.5, 2])],
      },
    ],
    more: [
      {
        say: { en: 'Where do licks come from? From the chords. Take the chord tones, put them on the beats, and connect them with scale notes.', he: 'מאיפה באים ליקים? מהאקורדים. לוקחים את צלילי האקורד, שמים אותם על הפעמות, ומחברים ביניהם בצלילי סולם.' },
        play: [mel([62, 64, 65, 67, 69, 71, 72], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1])],
      },
      {
        say: { en: 'A chromatic note can lead into a chord tone by a half step. Players call it an approach note.', he: 'צליל כרומטי יכול להוביל לצליל אקורד בחצי טון. נגנים קוראים לזה צליל גישה.' },
        play: [mel([63, 64, 66, 67], [0.5, 0.5, 0.5, 1.5])],
      },
      {
        say: { en: 'An enclosure surrounds the target: one note above it, one below, then the target itself on the beat.', he: 'הקפה מקיפה את המטרה: צליל אחד מעליה, אחד מתחתיה, ואז המטרה עצמה על הפעמה.' },
        play: [mel([65, 63, 64], [0.5, 0.5, 2])],
      },
      {
        say: { en: 'The bebop scale adds a passing half step to the dominant scale, so going down in eighths keeps the chord tones on the beats.', he: 'סולם הביבופ מוסיף חצי טון מעביר לסולם הדומיננטי, כך שירידה בשמיניות שומרת את צלילי האקורד על הפעמות.' },
        play: [mel([67, 66, 65, 64, 62, 60, 59, 57, 55], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1])],
      },
      {
        say: { en: 'Practise slowly enough to be clean, then climb. The ladder raises the tempo only after clean takes, and a level counts only on two different days.', he: 'מתרגלים לאט מספיק כדי להיות נקיים, ואז מטפסים. הסולם מעלה את הטמפו רק אחרי ביצועים נקיים, ושלב נחשב רק בשני ימים שונים.' },
      },
      {
        say: { en: 'Learn the lick in the keys the music lives in: around the circle of fourths, the way ii–V–Is move through standards. After C comes F, then B flat, then E flat.', he: 'לומדים את הליק בסולמות שבהם המוזיקה חיה: סביב מעגל הקוורטות, כמו שמהלכי ii–V–I זזים בסטנדרטים. אחרי דו בא פה, אחר כך סי במול, ואז מי במול.' },
        show: { text: { en: 'C · F · B♭ · E♭ · A♭', he: 'C · F · B♭ · E♭ · A♭' } },
      },
      {
        say: { en: 'To keep: chord tones on the beats, approach and enclose, every key, then use it in a solo. That is how vocabulary becomes yours.', he: 'מה לזכור: צלילי אקורד על הפעמות, גישה והקפה, כל הסולמות, ואז להשתמש בסולו. כך אוצר מילים נהיה שלכם.' },
        show: { text: { en: 'hear · own · use · keep', he: 'לשמוע · לשלוט · להשתמש · לשמור' } },
      },
    ],
  },
  {
    id: 'transcribe-coach',
    area: 'jazz',
    emoji: '',
    title: { en: 'Transcribing by ear', he: 'תמלול בשמיעה' },
    takeaway: { en: 'Hear it, sing it inside, play it back, write it down, then move it to every key. Each step is measured.', he: 'לשמוע, לשיר בפנים, לנגן בחזרה, לכתוב, ואז להעביר לכל הסולמות. כל שלב נמדד.' },
    steps: [
      {
        say: { en: 'Hi {name}! Transcribing is how jazz has always been learned: you take a phrase off the music by ear, with no paper. Listen to this one.', he: 'היי {name}! תמלול הוא הדרך שבה תמיד למדו ג׳אז: מורידים משפט מהמוזיקה בשמיעה, בלי דף. הקשיבו למשפט הזה.' },
        play: [mel([67, 69, 71, 74, 72], [0.5, 0.5, 0.5, 0.5, 2], 110)],
      },
      {
        say: { en: 'Loop it and slow it down until you can sing it in your head. Slowing it here keeps the pitch exactly the same.', he: 'שימו בלולאה והאטו עד שתוכלו לשיר אותו בראש. ההאטה כאן שומרת על אותו גובה בדיוק.' },
        play: [mel([67, 69, 71, 74, 72], [0.5, 0.5, 0.5, 0.5, 2], 70)],
      },
      {
        say: { en: 'Then play it or sing it back after the count-in. The app compares note by note, pitch and rhythm, and names the first note that went wrong.', he: 'אחר כך נגנו או שירו אותו בחזרה אחרי הספירה. האפליקציה משווה צליל אחר צליל, גובה וקצב, ואומרת איזה צליל ראשון השתבש.' },
        show: { text: { en: '✓ ✓ ✓ ✕ ✓', he: '✓ ✓ ✓ ✕ ✓' } },
      },
      {
        say: { en: 'Now write it down as degrees of the key. This one is five, six, seven, two, one.', he: 'עכשיו כתבו אותו בדרגות של הסולם. המשפט הזה הוא חמש, שש, שבע, שתיים, אחת.' },
        play: [mel([67, 69, 71, 74, 72], [1, 1, 1, 1, 2], 100)],
        show: { text: { en: '5 6 7 2 1', he: '5 6 7 2 1' } },
      },
      {
        say: { en: 'Last, play it in all twelve keys, measured like a lick. Keep the phrases you love as your own licks, and use them.', he: 'בסוף, נגנו אותו בכל שנים־עשר הסולמות, במדידה כמו ליק. את המשפטים שאתם אוהבים שמרו כליקים שלכם, והשתמשו בהם.' },
        play: [mel([65, 67, 69, 72, 70], [0.5, 0.5, 0.5, 0.5, 2], 110)],
      },
    ],
    more: [
      {
        say: { en: 'Start with the shape before the notes: does it go up or down, by steps or by leaps? Sing the shape first.', he: 'מתחילים מהצורה לפני הצלילים: הוא עולה או יורד, בצעדים או בקפיצות? קודם שרים את הצורה.' },
        play: [mel([60, 64, 67, 65, 64], [0.5, 0.5, 1, 0.5, 1.5])],
      },
      {
        say: { en: 'Find the first note against the key. Is it the tonic, the third, the fifth? Everything else is measured from there.', he: 'מוצאים את הצליל הראשון ביחס לסולם. זו הטוניקה, הטרצה, הקווינטה? כל השאר נמדד משם.' },
        play: [chord([48, 52, 55], 1), mel([64], [1.5])],
      },
      {
        say: { en: 'Then the rhythm: where does each note start in the beat? Tap it slowly before you play it.', he: 'אחר כך הקצב: איפה כל צליל מתחיל בתוך הפעמה? הקישו אותו לאט לפני שמנגנים.' },
        play: [mel([67, 67, 67, 67, 67], [1, 0.5, 0.5, 1, 1], 90)],
      },
      {
        say: { en: 'Short loops beat long ones. Two or three notes at a time, then join them. Slow is a tool, not a failure.', he: 'לולאות קצרות עדיפות על ארוכות. שניים או שלושה צלילים בכל פעם, ואז מחברים. איטי זה כלי, לא כישלון.' },
      },
      {
        say: { en: 'Showing the notes is allowed, but a phrase you saw counts less. The goal is to hear it, not to read it.', he: 'מותר להציג את התווים, אבל משפט שראיתם נחשב פחות. המטרה היא לשמוע אותו, לא לקרוא אותו.' },
      },
      {
        say: { en: 'A band under the phrase helps: you hear each note against its chord, so a third sounds like a third. Turn the band on when the phrase has chords.', he: 'להקה מתחת למשפט עוזרת: שומעים כל צליל מול האקורד שלו, כך שטרצה נשמעת כמו טרצה. הדליקו את הלהקה כשיש למשפט אקורדים.' },
        play: [chord([48, 52, 55, 59], 1), mel([64, 62, 60], [0.5, 0.5, 1])],
      },
      {
        say: { en: 'To keep: shape, first note, rhythm, play it back, write it, all keys. Do one phrase a day and your ear will grow fast.', he: 'מה לזכור: צורה, צליל ראשון, קצב, לנגן בחזרה, לכתוב, כל הסולמות. משפט אחד ביום והאוזן תגדל מהר.' },
        show: { text: { en: 'hear · play · write · 12 keys', he: 'לשמוע · לנגן · לכתוב · 12 סולמות' } },
      },
    ],
  },
];

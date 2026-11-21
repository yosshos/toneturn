// Curriculum audit 2026-11-19 (CURRICULUM-AUDIT-INSTRUMENTS R7.4; owner OK 2026-11-19): one short lesson for each keys
// and guitar technique family whose first path level had no teaching screen — what the family trains, how to practice
// it, the one thing to watch — and the "song chords" topic. Each opens the family's first level ("tech:<family>",
// wired in pathWiring.ts). Own words and examples; the drills then measure the playing.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
/** Free timed notes: [midi, start s, length s, velocity]. */
const ev = (list: [number, number, number, number?][], length: number): Stimulus => ({
  kind: 'events',
  events: list.map(([midi, start, duration, velocity = 0.6]): NoteEvent => ({ midi, start, duration, velocity })),
  length,
});
/** The same notes louder and louder (or softer): one velocity step per note. */
const shaped = (midis: number[], from: number, to: number, each = 0.35): Stimulus =>
  ev(midis.map((m, i) => [m, i * each, each * 0.9, from + ((to - from) * i) / Math.max(1, midis.length - 1)]), midis.length * each + 0.3);

/** A chord strummed (low to high, a few ms apart). */
const strum = (midis: number[], at: number, gap = 0.02, v = 0.6): [number, number, number, number][] => midis.map((m, i) => [m, at + i * gap, 0.5, v]);

const E_MINOR_GTR = [40, 47, 52, 55, 59, 64]; // open E minor

export const LESSONS: MiniLesson[] = [
  // ================================================================== KEYS
  {
    id: 'fam-fingers',
    area: 'play',
    emoji: '',
    title: { en: 'Finger independence', he: 'עצמאות אצבעות' },
    takeaway: { en: 'Every finger strong, even and free of the others: five-finger patterns, Hanon, held notes, trills. Even first, fast later.', he: 'כל אצבע חזקה, שווה וחופשית מהאחרות: תבניות חמש אצבעות, האנון, צלילים מוחזקים, טרילים. קודם שוויון, אחר כך מהירות.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains each finger to work on its own: the same strength, the same timing, whatever the others do.', he: 'היי {name}! המשפחה הזאת מאמנת כל אצבע לעבוד לבד: אותו כוח, אותו תזמון, לא משנה מה האחרות עושות.' }, play: [notes([60, 62, 64, 65, 67, 65, 64, 62, 60], 0.28)], show: { notes: [60, 62, 64, 65, 67], text: { en: '1 2 3 4 5', he: '1 2 3 4 5' } } },
      { say: { en: 'It starts with five fingers on five keys, then Hanon’s patterns: C, E, F, G, A, G, F, E, one step higher each time.', he: 'מתחילים בחמש אצבעות על חמישה קלידים, ואז התבניות של האנון: דו, מי, פה, סול, לה, סול, פה, מי, צעד אחד גבוה יותר בכל פעם.' }, play: [notes([60, 64, 65, 67, 69, 67, 65, 64, 62, 65, 67, 69, 71, 69, 67, 65], 0.2)] },
      { say: { en: 'Then held notes: one finger holds its key down while the others play. The held finger stays relaxed, not pressed hard.', he: 'אחר כך צלילים מוחזקים: אצבע אחת מחזיקה את הקליד שלה למטה בזמן שהאחרות מנגנות. האצבע המוחזקת נשארת רפויה, לא לוחצת חזק.' }, play: [ev([[60, 0, 2.4, 0.5], [64, 0, 0.5], [65, 0.6, 0.5], [67, 1.2, 0.5], [65, 1.8, 0.5]], 2.6)] },
      { say: { en: 'The one thing to watch: evenness. Every note the same loudness and the same distance apart. A loose wrist and curved fingertips make it possible.', he: 'הדבר האחד לשים אליו לב: שוויון. כל צליל באותה עוצמה ובאותו מרחק מהקודם. שורש כף יד רפוי וקצות אצבעות מעוגלים מאפשרים את זה.' }, play: [notes([64, 65, 64, 65, 64, 65, 64, 65], 0.18)], show: { text: { en: 'even · loose · curved', he: 'שווה · רפוי · מעוגל' } } },
      { say: { en: 'Your turn: free time first, until every note is clean, then the tempo ladder, in all twelve keys. Every note is measured.', he: 'תורכם: קודם בזמן חופשי, עד שכל צליל נקי, ואז סולם הטמפו, בכל שנים־עשר הסולמות. כל צליל נמדד.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'Why bother? Melodies ask the weak fingers, four and five, to sing as clearly as the thumb. Independence is what lets a melody sound the same in any fingering.', he: 'למה זה חשוב? מנגינות מבקשות מהאצבעות החלשות, ארבע וחמש, לשיר ברור כמו האגודל. העצמאות היא מה שנותן למנגינה להישמע אותו דבר בכל אצבוע.' }, play: [notes([67, 65, 64, 62, 60], 0.35)] },
      { say: { en: 'Trills come next: two neighbouring fingers alternate fast, then measured, six or eight to the beat. The fingers stay close to the keys.', he: 'אחר כך טרילים: שתי אצבעות שכנות מתחלפות מהר, ואז במדידה, שש או שמונה לפעמה. האצבעות נשארות קרוב לקלידים.' }, play: [notes([64, 65, 64, 65, 64, 65, 64, 65, 64, 65, 64, 65], 0.1)] },
      { say: { en: 'Repeated notes change fingers on one key, four, three, two, one. Each finger plays from the key surface, so the repeat stays light and fast.', he: 'צלילים חוזרים מחליפים אצבעות על קליד אחד, ארבע, שלוש, שתיים, אחת. כל אצבע מנגנת משטח הקליד, כך שהחזרה נשארת קלה ומהירה.' }, play: [notes([67, 67, 67, 67, 67, 67, 67, 67], 0.15)] },
      { say: { en: 'The common mistake is pressing harder to go faster. Speed comes from less motion, not more force. If the forearm tires, slow down and shake it out.', he: 'הטעות הנפוצה היא ללחוץ חזק יותר כדי להגיע למהירות. מהירות באה מפחות תנועה, לא מיותר כוח. אם האמה מתעייפת, מאטים ומנערים אותה.' }, show: { text: { en: 'less motion, not more force', he: 'פחות תנועה, לא יותר כוח' } } },
      { say: { en: 'A practice tip: a few minutes daily, before pieces, with the click low. Play each pattern once loud and once soft; both must stay even.', he: 'טיפ לתרגול: כמה דקות כל יום, לפני היצירות, עם הקליק בשקט. מנגנים כל תבנית פעם אחת חזק ופעם אחת חלש; בשתיהן היא חייבת להישאר שווה.' }, play: [shaped([60, 62, 64, 65, 67], 0.8, 0.8), shaped([67, 65, 64, 62, 60], 0.35, 0.35)] },
      { say: { en: 'Where it lives: every scale run, every ornament and every fast melody rests on these patterns. To keep: even notes, a loose wrist, curved fingers, free time first, then the tempo ladder in all twelve keys.', he: 'איפה זה חי: כל ריצת סולם, כל קישוט וכל מנגינה מהירה נשענים על התבניות האלה. מה לזכור: צלילים שווים, שורש כף יד רפוי, אצבעות מעוגלות, קודם זמן חופשי, ואז סולם הטמפו בכל שנים־עשר הסולמות.' } },
    ],
  },
  {
    id: 'fam-control',
    area: 'play',
    emoji: '',
    title: { en: 'Touch and control', he: 'שליטה במגע' },
    takeaway: { en: 'How a note starts, how loud it is and how long it lasts: legato, staccato, portato, dynamics, accents and a top voice that sings.', he: 'איך צליל מתחיל, כמה הוא חזק וכמה זמן הוא נמשך: לגאטו, סטקטו, פורטטו, דינמיקה, הדגשות וקול עליון ששר.' },
    steps: [
      { say: { en: 'Hi {name}! Right notes are half of music. This family trains the other half: how long, how loud, and how each note is joined to the next.', he: 'היי {name}! צלילים נכונים הם חצי מהמוזיקה. המשפחה הזאת מאמנת את החצי השני: כמה ארוך, כמה חזק, ואיך כל צליל מתחבר לבא.' }, play: [ev([60, 62, 64, 65, 67].map((m, i): [number, number, number] => [m, i * 0.4, 0.42]), 2.2)] },
      { say: { en: 'Legato joins the notes: one key comes up as the next goes down. Staccato separates them: short, light, bouncing off the key.', he: 'לגאטו מחבר את הצלילים: קליד אחד עולה כשהבא יורד. סטקטו מפריד ביניהם: קצר, קל, קופץ מהקליד.' }, play: [ev([60, 62, 64, 65, 67].map((m, i): [number, number, number] => [m, i * 0.4, 0.42]), 2.1), rest(0.3), ev([60, 62, 64, 65, 67].map((m, i): [number, number, number] => [m, i * 0.4, 0.1]), 2.1)], show: { text: { en: 'legato · staccato', he: 'לגאטו · סטקטו' } } },
      { say: { en: 'Dynamics come next: one even level, then a crescendo up the scale and a diminuendo down. Loudness comes from the speed of the key, not from pushing.', he: 'אחר כך דינמיקה: עוצמה אחת שווה, ואז קרשנדו במעלה הסולם ודימינואנדו בירידה. העוצמה באה ממהירות הקליד, לא מלחיצה.' }, play: [shaped([60, 62, 64, 65, 67, 69, 71, 72], 0.3, 0.9, 0.3)] },
      { say: { en: 'The one thing to watch: listen to the end of each note, not only its start. Where a note stops is part of the music.', he: 'הדבר האחד לשים אליו לב: להקשיב לסוף של כל צליל, לא רק להתחלה. המקום שבו צליל נגמר הוא חלק מהמוזיקה.' }, play: [ev([[67, 0, 0.8], [64, 0.8, 0.2], [65, 1.2, 0.2], [67, 1.6, 0.9]], 2.8)], show: { text: { en: 'hear where it stops', he: 'לשמוע איפה הוא נגמר' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. A MIDI keyboard measures loudness and key release best; the microphone hears less of them.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. מקלדת MIDI מודדת עוצמה ושחרור קליד בצורה הטובה ביותר; המיקרופון שומע פחות מהם.' }, show: { text: { en: 'length · loudness · joins', he: 'אורך · עוצמה · חיבורים' } } },
    ],
    more: [
      { say: { en: 'Portato sits between the two: each note slightly separated but full, as if the notes were gently leaning. It is written as dots under a slur.', he: 'פורטטו נמצא בין השניים: כל צליל מעט מופרד אבל מלא, כאילו הצלילים נשענים בעדינות. הוא נכתב כנקודות מתחת לקשת.' }, play: [ev([60, 62, 64, 65].map((m, i): [number, number, number] => [m, i * 0.45, 0.32]), 2)] },
      { say: { en: 'Accents every third or fourth note train the hand to choose. The accented note goes down faster; the others stay light and even.', he: 'הדגשות כל צליל שלישי או רביעי מאמנות את היד לבחור. הצליל המודגש יורד מהר יותר; האחרים נשארים קלים ושווים.' }, play: [ev([60, 62, 64, 65, 67, 69, 71, 72].map((m, i): [number, number, number, number] => [m, i * 0.25, 0.22, i % 4 === 0 ? 0.9 : 0.4]), 2.3)] },
      { say: { en: 'Voicing: in a chord, the top note louder than the others. Weight goes toward the fifth finger while the rest of the hand stays light.', he: 'קול עליון: באקורד, הצליל העליון חזק מהאחרים. המשקל עובר לאצבע החמישית בזמן ששאר היד נשארת קלה.' }, play: [ev([[60, 0, 1, 0.35], [64, 0, 1, 0.35], [67, 0, 1, 0.35], [72, 0, 1, 0.85]], 1.3)] },
      { say: { en: 'The common mistake is a crescendo that jumps at the end. Plan it: start soft enough that there is room to grow, and grow a little on every note.', he: 'הטעות הנפוצה היא קרשנדו שקופץ בסוף. מתכננים אותו: מתחילים שקט מספיק כדי שיהיה לאן לגדול, וגדלים קצת בכל צליל.' }, show: { text: { en: 'start soft · grow evenly', he: 'להתחיל שקט · לגדול בשוויון' } } },
      { say: { en: 'A practice tip: record a scale and listen back with eyes closed. Uneven notes and early releases are easier to hear on the recording than while playing.', he: 'טיפ לתרגול: מקליטים סולם ומקשיבים בעיניים עצומות. צלילים לא שווים ושחרורים מוקדמים קל יותר לשמוע בהקלטה מאשר בזמן הנגינה.' } },
      { say: { en: 'Where it lives: a singing melody over a soft accompaniment, a phrase that grows and fades, a chord whose top note sings. To keep: hear the length, the loudness and the join of every single note.', he: 'איפה זה חי: מנגינה ששרה מעל ליווי שקט, משפט שגדל ונמוג, אקורד שהצליל העליון שלו שר. מה לזכור: לשמוע את האורך, העוצמה והחיבור של כל צליל וצליל.' } },
    ],
  },
  {
    id: 'fam-k-classic',
    area: 'play',
    emoji: '',
    title: { en: 'Classical pieces', he: 'יצירות קלאסיות' },
    takeaway: { en: 'Real pieces, from Ode to Joy to Bach: hands separately, short sections, a slow steady tempo, then hands together.', he: 'יצירות אמיתיות, מאודה לשמחה ועד באך: ידיים בנפרד, קטעים קצרים, טמפו איטי ויציב, ואז ידיים יחד.' },
    steps: [
      { say: { en: 'Hi {name}! This family is real music: graded classical pieces, from the Ode to Joy theme up to Bach’s inventions and preludes.', he: 'היי {name}! המשפחה הזאת היא מוזיקה אמיתית: יצירות קלאסיות לפי דרגות, מהנושא של אודה לשמחה ועד האינבנציות והפרלודים של באך.' }, play: [notes([64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62], 0.3)] },
      { say: { en: 'Learn a piece in short sections, two or four bars. Each hand alone first, slowly, with the written fingering, until it plays without stops.', he: 'לומדים יצירה בקטעים קצרים, שתיים או ארבע תיבות. קודם כל יד לבד, לאט, באצבוע הכתוב, עד שהיא מנגנת בלי עצירות.' }, play: [notes([74, 67, 69, 71, 72, 74, 67, 67], 0.35)], show: { text: { en: '2–4 bars · each hand · slowly', he: '2–4 תיבות · כל יד · לאט' } } },
      { say: { en: 'Then hands together, at a tempo where both stay clean. Join the sections one by one, and play across the joins, not only up to them.', he: 'אחר כך ידיים יחד, בטמפו שבו שתיהן נשארות נקיות. מחברים את הקטעים אחד אחד, ומנגנים דרך נקודות החיבור, לא רק עד אליהן.' }, play: [ev([[74, 0, 0.4], [55, 0, 1.2, 0.45], [67, 0.4, 0.4], [69, 0.8, 0.4], [71, 1.2, 0.4], [57, 1.2, 1.2, 0.45], [72, 1.6, 0.4], [74, 2, 0.6]], 2.8)] },
      { say: { en: 'The one thing to watch: one tempo from start to end. Choose the tempo of the hardest bar and keep it everywhere, even in the easy bars.', he: 'הדבר האחד לשים אליו לב: טמפו אחד מההתחלה עד הסוף. בוחרים את הטמפו של התיבה הקשה ביותר ושומרים עליו בכל מקום, גם בתיבות הקלות.' }, play: [notes([76, 75, 76, 75, 76, 71, 74, 72, 69], 0.3)], show: { text: { en: 'the hardest bar sets the tempo', he: 'התיבה הקשה קובעת את הטמפו' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder up to the piece’s own tempo. Every note and every onset is measured against the score.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו עד הטמפו של היצירה. כל צליל וכל כניסה נמדדים מול התווים.' }, show: { text: { en: 'free → ladder → the real tempo', he: 'חופשי ← סולם טמפו ← הטמפו האמיתי' } } },
    ],
    more: [
      { say: { en: 'Why pieces and not only exercises? A piece asks for everything at once: notes, rhythm, touch and shape. It is where technique turns into music.', he: 'למה יצירות ולא רק תרגילים? יצירה מבקשת הכול בבת אחת: צלילים, מקצב, מגע וצורה. שם הטכניקה הופכת למוזיקה.' }, play: [notes([72, 76, 79, 84, 79, 76, 72, 76, 79, 84, 79, 76], 0.18)] },
      { say: { en: 'Fingering is part of the piece. The written fingering is chosen so the hand arrives ready; keep the same fingering every time, or the hand never learns.', he: 'האצבוע הוא חלק מהיצירה. האצבוע הכתוב נבחר כדי שהיד תגיע מוכנה; שומרים על אותו אצבוע בכל פעם, אחרת היד אף פעם לא לומדת.' }, play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.25)] },
      { say: { en: 'Shape the phrase: most phrases grow toward a high point and relax at the end. Breathe between phrases, as a singer would.', he: 'מעצבים את המשפט: רוב המשפטים גדלים לעבר נקודת שיא ונרגעים בסוף. נושמים בין המשפטים, כמו זמר.' }, play: [shaped([67, 69, 71, 72, 74, 72, 71, 69, 67], 0.35, 0.85, 0.3)] },
      { say: { en: 'The common mistake is starting from the beginning every time. Start where the mistakes are, play that bar three times clean, then add the bars around it.', he: 'הטעות הנפוצה היא להתחיל מההתחלה בכל פעם. מתחילים איפה שהטעויות, מנגנים את התיבה הזאת שלוש פעמים נקי, ואז מוסיפים את התיבות שסביבה.' }, show: { text: { en: 'fix the bar, then its neighbours', he: 'לתקן את התיבה, ואז את השכנות' } } },
      { say: { en: 'Listen to a good recording before you start, so you know how it should sound. Then put the recording away and build your own playing, bar by bar.', he: 'מקשיבים להקלטה טובה לפני שמתחילים, כדי לדעת איך זה צריך להישמע. אחר כך שמים את ההקלטה בצד ובונים את הנגינה שלכם, תיבה אחרי תיבה.' } },
      { say: { en: 'Where it lives: these pieces have been played by piano students for centuries, and each teaches a skill: Bach the independent hands, Clementi clear scales, Burgmüller a singing line. To keep: small sections, one tempo, the written fingering.', he: 'איפה זה חי: את היצירות האלה מנגנים תלמידי פסנתר כבר מאות שנים, וכל אחת מלמדת מיומנות: באך את הידיים העצמאיות, קלמנטי סולמות ברורים, בורגמילר קו ששר. מה לזכור: קטעים קטנים, טמפו אחד, האצבוע הכתוב.' } },
    ],
  },
  {
    id: 'fam-k-pedal',
    area: 'play',
    emoji: '',
    title: { en: 'Pedalling', he: 'פדל' },
    takeaway: { en: 'Legato pedal: play the new chord, then lift and press the pedal at once. Change with the harmony; half-pedal for a clearer blur.', he: 'פדל לגאטו: מנגנים את האקורד החדש, ואז מרימים ולוחצים את הפדל מיד. מחליפים עם ההרמוניה; חצי פדל לטשטוש נקי יותר.' },
    steps: [
      { say: { en: 'Hi {name}! The right pedal lifts the dampers, so notes keep ringing after the fingers let go. This family trains when to press it and when to change it.', he: 'היי {name}! הפדל הימני מרים את המשתיקים, כך שהצלילים ממשיכים לצלצל אחרי שהאצבעות עוזבות. המשפחה הזאת מאמנת מתי ללחוץ עליו ומתי להחליף אותו.' }, play: [ev([[48, 0, 2.4, 0.5], [55, 0.3, 2.1, 0.5], [64, 0.6, 1.8, 0.5], [67, 0.9, 1.5, 0.5]], 2.6)] },
      { say: { en: 'Legato pedal: play the new chord first, then lift the pedal and press it again straight away. The new chord is caught, the old one cleared.', he: 'פדל לגאטו: קודם מנגנים את האקורד החדש, ואז מרימים את הפדל ולוחצים שוב מיד. האקורד החדש נתפס, הישן נמחק.' }, play: [ev([[48, 0, 1.4, 0.5], [52, 0.2, 1.2, 0.5], [55, 0.4, 1, 0.5], [41, 1.4, 1.4, 0.5], [53, 1.6, 1.2, 0.5], [57, 1.8, 1, 0.5]], 3)], show: { text: { en: 'chord down → pedal up–down', he: 'אקורד למטה ← פדל למעלה־למטה' } } },
      { say: { en: 'Change the pedal with the harmony. When the chord changes, the pedal changes; while the chord stays, the pedal stays down.', he: 'מחליפים פדל עם ההרמוניה. כשהאקורד מתחלף, הפדל מתחלף; כל עוד האקורד נשאר, הפדל נשאר למטה.' }, play: [ev([[48, 0, 1.6, 0.5], [55, 0.4, 1.2, 0.45], [64, 0.8, 0.8, 0.45], [43, 1.6, 1.6, 0.5], [55, 2, 1.2, 0.45], [62, 2.4, 0.8, 0.45]], 3.4)] },
      { say: { en: 'The one thing to watch: the change comes just after the new chord, never at the same moment. Pedal together with the keys and you get a gap or a smear.', he: 'הדבר האחד לשים אליו לב: ההחלפה באה רגע אחרי האקורד החדש, אף פעם לא באותו רגע. פדל יחד עם הקלידים נותן חור או מריחה.' }, play: [chord([48, 52, 55], 0.9), chord([53, 57, 60], 0.9)], show: { text: { en: 'keys first, then the pedal', he: 'קודם הקלידים, אחר כך הפדל' } } },
      { say: { en: 'Your turn. The pedal is measured from a MIDI keyboard with a sustain pedal; the microphone cannot hear it. Slowly first, then the tempo ladder.', he: 'תורכם. הפדל נמדד ממקלדת MIDI עם פדל; המיקרופון לא שומע אותו. קודם לאט, ואז סולם הטמפו.' }, show: { text: { en: 'MIDI keyboard + pedal', he: 'מקלדת MIDI + פדל' } } },
    ],
    more: [
      { say: { en: 'Why legato pedal? It joins chords that the hand cannot join alone, like broken chords spread over two octaves, without blurring one harmony into the next.', he: 'למה פדל לגאטו? הוא מחבר אקורדים שהיד לא יכולה לחבר לבד, כמו אקורדים שבורים על פני שתי אוקטבות, בלי לטשטש הרמוניה אחת לתוך הבאה.' }, play: [notes([48, 55, 64, 67, 72, 67, 64, 55], 0.22)] },
      { say: { en: 'Direct pedal goes down with the keys and up with them: short and rhythmic, for chords that should ring only as long as they are held.', he: 'פדל ישיר יורד עם הקלידים ועולה איתם: קצר ומקצבי, לאקורדים שצריכים לצלצל רק כל עוד מחזיקים אותם.' }, play: [chord([48, 52, 55], 0.5), rest(0.3), chord([48, 52, 55], 0.5)] },
      { say: { en: 'Half-pedal lifts the dampers only part of the way up and back. Some of the sound is cleared, a held low bass keeps ringing, and the harmony above stays clear.', he: 'חצי פדל מרים את המשתיקים רק חלק מהדרך ומחזיר. חלק מהצליל נמחק, בס נמוך מוחזק ממשיך לצלצל, וההרמוניה שמעליו נשארת נקייה.' }, play: [ev([[36, 0, 3, 0.5], [60, 0, 0.9, 0.45], [64, 0, 0.9, 0.45], [62, 1, 0.9, 0.45], [65, 1, 0.9, 0.45], [64, 2, 0.9, 0.45], [67, 2, 0.9, 0.45]], 3.2)] },
      { say: { en: 'The common mistake is too much pedal. Listen: if a scale passage turns into a cloud, change more often, or use less depth.', he: 'הטעות הנפוצה היא יותר מדי פדל. מקשיבים: אם קטע של סולם הופך לענן, מחליפים לעתים קרובות יותר, או לוחצים פחות עמוק.' }, show: { text: { en: 'the ear decides', he: 'האוזן מחליטה' } } },
      { say: { en: 'Practice the foot alone first: play slow chords with the right hand only and change the pedal after each one, until the motion is automatic.', he: 'מתרגלים קודם את הרגל לבד: מנגנים אקורדים איטיים ביד ימין בלבד ומחליפים פדל אחרי כל אחד, עד שהתנועה אוטומטית.' } },
      { say: { en: 'Where it lives: Chopin, Debussy, pop ballads and worship songs all lean on the pedal. To keep: keys first, the pedal right after; change with the harmony; and let the ear, not the foot, decide how much.', he: 'איפה זה חי: שופן, דביסי, בלדות פופ ושירי תפילה נשענים כולם על הפדל. מה לזכור: קודם הקלידים, הפדל מיד אחריהם; מחליפים עם ההרמוניה; והאוזן, לא הרגל, מחליטה כמה.' } },
    ],
  },
  {
    id: 'fam-advanced',
    area: 'play',
    emoji: '',
    title: { en: 'Advanced technique', he: 'טכניקה מתקדמת' },
    takeaway: { en: 'Octaves from a loose wrist, polyrhythms counted on their shared pulse, double 3rds and 6ths, leaps and hand crossings.', he: 'אוקטבות משורש כף יד רפוי, פולימקצבים שנספרים על הדופק המשותף, טרצות וסקסטות כפולות, קפיצות והצלבות ידיים.' },
    steps: [
      { say: { en: 'Hi {name}! This family is concert technique: scales in octaves, polyrhythms, double notes in one hand, big leaps and crossing hands.', he: 'היי {name}! המשפחה הזאת היא טכניקה של קונצרט: סולמות באוקטבות, פולימקצבים, צלילים כפולים ביד אחת, קפיצות גדולות והצלבת ידיים.' }, play: [ev([60, 62, 64, 65, 67].flatMap((m, i): [number, number, number][] => [[m, i * 0.3, 0.28], [m + 12, i * 0.3, 0.28]]), 1.8)] },
      { say: { en: 'Octaves come from the wrist, light and loose, with the thumb and fifth finger shaping the hand. The arm carries the hand along; it does not push.', he: 'אוקטבות באות משורש כף היד, קל ורפוי, כשהאגודל והאצבע החמישית נותנים ליד את הצורה. הזרוע מובילה את היד; היא לא דוחפת.' }, play: [ev([67, 67, 67, 67].flatMap((m, i): [number, number, number][] => [[m, i * 0.25, 0.2], [m + 12, i * 0.25, 0.2]]), 1.2)] },
      { say: { en: 'Polyrhythm: three against two. Count the shared pulse of six: the right hand plays on one, three and five, the left hand on one and four.', he: 'פולימקצב: שלוש נגד שתיים. סופרים את הדופק המשותף של שש: יד ימין מנגנת באחת, שלוש וחמש, יד שמאל באחת ובארבע.' }, play: [ev([[72, 0, 0.3], [72, 0.4, 0.3], [72, 0.8, 0.3], [48, 0, 0.5], [48, 0.6, 0.5], [72, 1.2, 0.3], [72, 1.6, 0.3], [72, 2, 0.3], [48, 1.2, 0.5], [48, 1.8, 0.5]], 2.6)], show: { text: { en: '1 2 3 4 5 6 · R: 1 3 5 · L: 1 4', he: '1 2 3 4 5 6 · ימין: 1 3 5 · שמאל: 1 4' } } },
      { say: { en: 'The one thing to watch: tension. Hard technique tempts the hand to tighten. Stop at the first sign of strain, shake out, and start again slower.', he: 'הדבר האחד לשים אליו לב: מתח. טכניקה קשה מפתה את היד להתכווץ. עוצרים בסימן הראשון של מאמץ, מנערים, ומתחילים שוב לאט יותר.' }, play: [notes([60, 64, 62, 65, 64, 67, 65, 69], 0.25)], show: { text: { en: 'stop at the first strain', he: 'לעצור במאמץ הראשון' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder, in all twelve keys. Every note, every hand and every onset is measured.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות. כל צליל, כל יד וכל כניסה נמדדים.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'Double 3rds and 6ths put two notes under one hand at once. Practice each pair of fingers slowly, listening that both notes sound together.', he: 'טרצות וסקסטות כפולות שמות שני צלילים מתחת ליד אחת בבת אחת. מתרגלים כל זוג אצבעות לאט, ומקשיבים ששני הצלילים נשמעים יחד.' }, play: [ev([[60, 0, 0.3], [64, 0, 0.3], [62, 0.35, 0.3], [65, 0.35, 0.3], [64, 0.7, 0.3], [67, 0.7, 0.3], [65, 1.05, 0.3], [69, 1.05, 0.3]], 1.6)] },
      { say: { en: 'Four against three uses a shared pulse of twelve. Learn it slowly by saying the combined rhythm aloud, then let the hands take over.', he: 'ארבע נגד שלוש משתמש בדופק משותף של שתים־עשרה. לומדים אותו לאט כשאומרים את המקצב המשולב בקול, ואז נותנים לידיים להמשיך לבד.' }, play: [ev([...[0, 0.6, 1.2, 1.8].map((t): [number, number, number] => [72, t, 0.25]), ...[0, 0.8, 1.6].map((t): [number, number, number] => [48, t, 0.4])], 2.6)] },
      { say: { en: 'Leaps: look ahead to the landing key, move early and fast, then play from close to the key. The jump is quick; the note itself is calm.', he: 'קפיצות: מסתכלים קדימה לקליד הנחיתה, זזים מוקדם ומהר, ואז מנגנים מקרוב לקליד. הקפיצה מהירה; הצליל עצמו רגוע.' }, play: [notes([36, 64, 31, 64, 36, 64], 0.35)] },
      { say: { en: 'The common mistake is practicing only at full speed. Hard passages need slow, perfect repetitions; the speed you use most is the one the hand learns.', he: 'הטעות הנפוצה היא לתרגל רק במהירות מלאה. קטעים קשים צריכים חזרות איטיות ומושלמות; המהירות שבה מנגנים הכי הרבה היא זו שהיד לומדת.' }, show: { text: { en: 'slow and perfect', he: 'לאט ומושלם' } } },
      { say: { en: 'Keep sessions short: ten focused minutes on advanced technique, then music. A tired hand repeats its mistakes.', he: 'שומרים על אימונים קצרים: עשר דקות מרוכזות של טכניקה מתקדמת, ואז מוזיקה. יד עייפה חוזרת על הטעויות שלה.' } },
      { say: { en: 'Where it lives: octaves in Liszt and Grieg, polyrhythms in Chopin and in jazz, double notes in Czerny’s studies and in Romantic concertos. To keep: a loose wrist, the shared pulse counted aloud, slow perfect repetitions, short sessions, and every level in all twelve keys before the tempo climbs.', he: 'איפה זה חי: אוקטבות אצל ליסט וגריג, פולימקצבים אצל שופן ובג׳אז, צלילים כפולים באטיודים של צ׳רני ובקונצ׳רטים רומנטיים. מה לזכור: שורש כף יד רפוי, הדופק המשותף נספר בקול, חזרות איטיות ומושלמות, אימונים קצרים, וכל שלב בכל שנים־עשר הסולמות לפני שהטמפו עולה.' } },
    ],
  },

  // ================================================================== GUITAR
  {
    id: 'fam-g-fingerstyle',
    area: 'play',
    emoji: '',
    title: { en: 'Fingerstyle', he: 'פריטת אצבעות' },
    takeaway: { en: 'The thumb (p) plays the bass on strings 6–4; i, m and a play strings 3, 2 and 1. A steady thumb, quiet fingers, then Travis, rest strokes and tremolo.', he: 'האגודל (p) מנגן את הבס על מיתרים 6–4; i‏, m ו־a מנגנות על מיתרים 3, 2 ו־1. אגודל יציב, אצבעות שקטות, ואז טראוויס, מכה נשענת וטרמולו.' },
    steps: [
      { say: { en: 'Hi {name}! Fingerstyle plays the bass and the chord with the fingers instead of a pick. Each finger has its own job.', he: 'היי {name}! פריטת אצבעות מנגנת את הבס ואת האקורד באצבעות במקום במפרט. לכל אצבע יש תפקיד משלה.' }, play: [notes([48, 55, 60, 64, 60, 55], 0.3)] },
      { say: { en: 'The thumb, p, plays the bass on strings six, five and four. The index, middle and ring fingers, i, m and a, play strings three, two and one.', he: 'האגודל, p, מנגן את הבס על מיתרים שש, חמש וארבע. המורה, האמה והקמיצה, i‏, m ו־a, מנגנות על מיתרים שלוש, שתיים ואחת.' }, play: [notes([48, 55, 60, 64], 0.45)], show: { text: { en: 'p · i · m · a', he: 'p · i · m · a' } } },
      { say: { en: 'Arpeggio patterns break the chord string by string. Later the thumb alternates two bass notes while the fingers play between: Travis picking.', he: 'תבניות ארפג׳יו שוברות את האקורד מיתר אחרי מיתר. בהמשך האגודל מחליף בין שני צלילי בס בזמן שהאצבעות מנגנות ביניהם: פריטת טראוויס.' }, play: [ev([[48, 0, 0.5], [64, 0.25, 0.3], [52, 0.5, 0.5], [60, 0.75, 0.3], [48, 1, 0.5], [64, 1.25, 0.3], [52, 1.5, 0.5], [60, 1.75, 0.3]], 2.2)] },
      { say: { en: 'The one thing to watch: a steady thumb, like a bass player. The fingers move from their knuckles; the hand above them stays still.', he: 'הדבר האחד לשים אליו לב: אגודל יציב, כמו נגן בס. האצבעות זזות מהמפרקים; היד שמעליהן נשארת שקטה.' }, play: [ev([[48, 0, 0.45], [48, 0.5, 0.45], [48, 1, 0.45], [48, 1.5, 0.45], [60, 0.25, 0.2, 0.4], [64, 0.75, 0.2, 0.4], [60, 1.25, 0.2, 0.4]], 2.1)], show: { text: { en: 'steady thumb · still hand', he: 'אגודל יציב · יד שקטה' } } },
      { say: { en: 'Your turn: free time first, until every string sounds, then the tempo ladder. Every note is measured, the bass and the treble alike.', he: 'תורכם: קודם בזמן חופשי, עד שכל מיתר נשמע, ואז סולם הטמפו. כל צליל נמדד, הבס והגבוהים כאחד.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Free stroke: the finger plucks and moves up into the palm, over the next string. Rest stroke: the finger plucks and comes to rest on the next string, for a fuller tone.', he: 'מכה חופשית: האצבע פורטת וזזה למעלה אל כף היד, מעל המיתר הבא. מכה נשענת: האצבע פורטת ונחה על המיתר הבא, לצליל מלא יותר.' }, play: [notes([64, 62, 60, 59], 0.4)] },
      { say: { en: 'The Giuliani patterns are classical right-hand studies: the same chord with a new finger order each time, until any order feels natural.', he: 'התבניות של ג׳וליאני הן תרגילים קלאסיים ליד ימין: אותו אקורד עם סדר אצבעות חדש בכל פעם, עד שכל סדר מרגיש טבעי.' }, play: [notes([48, 55, 60, 55, 64, 55, 60, 55], 0.2)] },
      { say: { en: 'Tremolo, p a m i: the thumb plays a bass note, then the ring, middle and index fingers repeat one treble note. It sounds like one long, singing note.', he: 'טרמולו, p a m i: האגודל מנגן צליל בס, ואז הקמיצה, האמה והמורה חוזרות על צליל גבוה אחד. זה נשמע כמו צליל אחד ארוך ושר.' }, play: [ev([[45, 0, 0.5], [69, 0.12, 0.1], [69, 0.24, 0.1], [69, 0.36, 0.1], [52, 0.48, 0.5], [69, 0.6, 0.1], [69, 0.72, 0.1], [69, 0.84, 0.1]], 1.2)] },
      { say: { en: 'The common mistake is a thumb that follows the fingers and loses the beat. Practice the thumb alone first, then add one finger at a time.', he: 'הטעות הנפוצה היא אגודל שהולך אחרי האצבעות ומאבד את הפעמה. מתרגלים קודם את האגודל לבד, ואז מוסיפים אצבע אחת בכל פעם.' }, show: { text: { en: 'thumb alone first', he: 'קודם האגודל לבד' } } },
      { say: { en: 'Keep the nails short and smooth, or slightly shaped, so every finger sounds the same. An uneven nail gives an uneven tone.', he: 'שומרים על ציפורניים קצרות וחלקות, או מעוצבות מעט, כדי שכל אצבע תישמע אותו דבר. ציפורן לא אחידה נותנת צליל לא אחיד.' } },
      { say: { en: 'Where it lives: folk and classical guitar, Travis-style country, singer-songwriters with a capo. To keep: a steady thumb, each finger on its own string, a still hand, and every string sounding clearly.', he: 'איפה זה חי: גיטרה עממית וקלאסית, קאנטרי בסגנון טראוויס, זמרים־יוצרים עם קאפו. מה לזכור: אגודל יציב, כל אצבע על המיתר שלה, יד שקטה, וכל מיתר נשמע בבירור.' } },
    ],
  },
  {
    id: 'fam-g-picking',
    area: 'play',
    emoji: '',
    title: { en: 'Picking', he: 'פריטה במפרט' },
    takeaway: { en: 'Down on the beat, up between: strict alternate picking from a small wrist motion, then string crossing, economy, sweep and hybrid picking.', he: 'למטה על הפעמה, למעלה ביניהן: פריטה מתחלפת קפדנית מתנועה קטנה של שורש כף היד, ואז מעבר מיתרים, אקונומי, סוויפ ופריטה היברידית.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the picking hand: clean, even notes at any speed, on one string and across all six.', he: 'היי {name}! המשפחה הזאת מאמנת את היד הפורטת: צלילים נקיים ושווים בכל מהירות, על מיתר אחד ועל פני כל השישה.' }, play: [notes([64, 64, 64, 64, 64, 64, 64, 64], 0.2)] },
      { say: { en: 'Alternate picking: down, up, down, up, with no exceptions. The down-stroke falls on the beat, the up-stroke on the and.', he: 'פריטה מתחלפת: למטה, למעלה, למטה, למעלה, בלי יוצאים מן הכלל. המכה למטה נופלת על הפעמה, המכה למעלה על ה־וְ.' }, play: [ev([0, 1, 2, 3, 4, 5, 6, 7].map((i): [number, number, number, number] => [64, i * 0.25, 0.22, i % 2 ? 0.45 : 0.7]), 2.2)], show: { text: { en: 'down · up · down · up', he: 'למטה · למעלה · למטה · למעלה' } } },
      { say: { en: 'Crossing strings is the hard part. Outside picking crosses from outside the two strings, inside picking from between them. Both must sound the same.', he: 'מעבר בין מיתרים הוא החלק הקשה. פריטה חיצונית עוברת מבחוץ לשני המיתרים, פריטה פנימית מביניהם. שתיהן חייבות להישמע אותו דבר.' }, play: [notes([64, 67, 64, 67, 62, 65, 62, 65], 0.2)] },
      { say: { en: 'The one thing to watch: a small motion. The pick moves from the wrist and passes the string by only a little; big strokes cannot get fast.', he: 'הדבר האחד לשים אליו לב: תנועה קטנה. המפרט זז משורש כף היד ועובר את המיתר רק במעט; מכות גדולות לא יכולות להיות מהירות.' }, play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.15)], show: { text: { en: 'small · from the wrist', he: 'קטן · משורש כף היד' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. Every note is measured for time and evenness, the up-strokes as much as the down-strokes.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. כל צליל נמדד בזמן ובשוויון, המכות למעלה כמו המכות למטה.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Economy picking keeps alternating on one string, but crosses to the next string in the same direction as the last stroke, like a short sweep.', he: 'פריטה אקונומית ממשיכה להתחלף על מיתר אחד, אבל עוברת למיתר הבא באותו כיוון של המכה האחרונה, כמו סוויפ קצר.' }, play: [notes([55, 57, 59, 60, 62, 64], 0.18)] },
      { say: { en: 'Sweep picking plays an arpeggio with one long motion across the strings. The fretting hand lets each note go as the next one sounds, so they never ring together.', he: 'סוויפ מנגן ארפג׳יו בתנועה ארוכה אחת על פני המיתרים. היד הלוחצת משחררת כל צליל כשהבא נשמע, כך שהם אף פעם לא מצלצלים יחד.' }, play: [notes([57, 60, 64, 69, 64, 60, 57], 0.12)] },
      { say: { en: 'Hybrid picking adds the middle and ring fingers to the pick: the pick on the low string, a finger on a higher one. It is the sound of country chicken picking.', he: 'פריטה היברידית מוסיפה את האמה והקמיצה למפרט: המפרט על המיתר הנמוך, אצבע על מיתר גבוה יותר. זה הצליל של צ׳יקן פיקינג בקאנטרי.' }, play: [ev([[52, 0, 0.2], [64, 0.2, 0.15], [52, 0.4, 0.2], [62, 0.6, 0.15], [50, 0.8, 0.2], [64, 1, 0.15]], 1.4)] },
      { say: { en: 'The common mistake is speeding up before the strokes are even. Use the click and push the tempo only when every note at the current tempo is clean.', he: 'הטעות הנפוצה היא להאיץ לפני שהמכות שוות. משתמשים בקליק ומעלים טמפו רק כשכל צליל בטמפו הנוכחי נקי.' }, show: { text: { en: 'clean, then faster', he: 'נקי, ואז מהר יותר' } } },
      { say: { en: 'Hold the pick lightly between the thumb and the side of the index finger, with only its tip showing. A tight grip makes a stiff arm.', he: 'מחזיקים את המפרט בקלילות בין האגודל לצד של האצבע המורה, כשרק הקצה שלו בחוץ. אחיזה חזקה עושה זרוע נוקשה.' } },
      { say: { en: 'Where it lives: rock and metal riffs, bluegrass runs, fusion lines. To keep: down on the beat, up between, a small wrist motion, and speed only after every note is clean and even.', he: 'איפה זה חי: ריפים של רוק ומטאל, ריצות בלוגראס, קווי פיוז׳ן. מה לזכור: למטה על הפעמה, למעלה ביניהן, תנועה קטנה של שורש כף היד, ומהירות רק אחרי שכל צליל נקי ושווה.' } },
    ],
  },
  {
    id: 'fam-g-fretting',
    area: 'play',
    emoji: '',
    title: { en: 'The fretting hand', he: 'היד הלוחצת' },
    takeaway: { en: 'One finger per fret, fingertips just behind the frets, the least pressure that gives a clean note: chromatic runs, permutations, the spider, stretches.', he: 'אצבע לכל סריג, קצות האצבעות ממש מאחורי הסריגים, הלחץ הקטן ביותר שנותן צליל נקי: ריצות כרומטיות, תמורות, העכביש, מתיחות.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the left hand, or the right for left-handers: four fingers that are strong, independent and accurate.', he: 'היי {name}! המשפחה הזאת מאמנת את יד שמאל, או את ימין לשמאליים: ארבע אצבעות חזקות, עצמאיות ומדויקות.' }, play: [notes([45, 46, 47, 48, 50, 51, 52, 53], 0.25)] },
      { say: { en: 'One finger per fret: in position V, the first finger takes fret 5, the second fret 6, the third fret 7, the fourth fret 8.', he: 'אצבע לכל סריג: במצב V, האצבע הראשונה לוקחת את סריג 5, השנייה את סריג 6, השלישית את סריג 7, הרביעית את סריג 8.' }, play: [notes([45, 46, 47, 48], 0.45)], show: { text: { en: '1 2 3 4 = fret 5 6 7 8', he: '1 2 3 4 = סריג 5 6 7 8' } } },
      { say: { en: 'Then the order changes: one, two, four, three; one, three, two, four. These permutations make every finger lead and follow.', he: 'אחר כך הסדר משתנה: אחת, שתיים, ארבע, שלוש; אחת, שלוש, שתיים, ארבע. התמורות האלה גורמות לכל אצבע להוביל וללכת אחרי.' }, play: [notes([45, 46, 48, 47, 45, 47, 46, 48], 0.25)] },
      { say: { en: 'The one thing to watch: the fingertip right behind the fret, with just enough pressure for a clean note. The thumb rests behind the neck, not squeezing.', he: 'הדבר האחד לשים אליו לב: קצה האצבע ממש מאחורי הסריג, עם לחץ שמספיק בדיוק לצליל נקי. האגודל נח מאחורי הצוואר, לא לוחץ.' }, play: [notes([57, 57, 57], 0.5)], show: { text: { en: 'behind the fret · light thumb', he: 'מאחורי הסריג · אגודל קל' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. The app hears each note’s pitch and onset, so a buzz or a late finger shows.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. האפליקציה שומעת את הגובה והכניסה של כל צליל, אז זמזום או אצבע מאחרת ייראו.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'The spider crosses two strings: fingers one and three on one string, two and four on the next, then they swap. It breaks the habit of moving all fingers together.', he: 'העכביש עובר בין שני מיתרים: אצבעות אחת ושלוש על מיתר אחד, שתיים וארבע על הבא, ואז הן מתחלפות. זה שובר את ההרגל להזיז את כל האצבעות יחד.' }, play: [notes([45, 52, 46, 53, 47, 52, 48, 53], 0.22)] },
      { say: { en: 'Keep fingers close: a finger that is not playing hovers just above its fret, ready. Fingers that fly far away arrive late.', he: 'שומרים על אצבעות קרובות: אצבע שלא מנגנת מרחפת ממש מעל הסריג שלה, מוכנה. אצבעות שעפות רחוק מגיעות באיחור.' }, play: [notes([57, 58, 59, 60, 59, 58, 57], 0.22)] },
      { say: { en: 'Stretches widen the hand: five or six frets under four fingers. Warm up first, start high on the neck where the frets are close, and move lower slowly.', he: 'מתיחות מרחיבות את היד: חמישה או שישה סריגים מתחת לארבע אצבעות. מתחממים קודם, מתחילים גבוה על הצוואר שבו הסריגים קרובים, ויורדים לאט.' }, play: [notes([57, 59, 61, 62], 0.4)] },
      { say: { en: 'The common mistake is squeezing. Press until the note is clean, then a little less. Any pain means stop.', he: 'הטעות הנפוצה היא ללחוץ חזק מדי. לוחצים עד שהצליל נקי, ואז קצת פחות. כל כאב פירושו לעצור.' }, show: { text: { en: 'clean, then a little less', he: 'נקי, ואז קצת פחות' } } },
      { say: { en: 'A practice tip: five minutes daily is better than an hour once a week. Short, slow, accurate repetitions build the hand without strain.', he: 'טיפ לתרגול: חמש דקות כל יום עדיפות על שעה פעם בשבוע. חזרות קצרות, איטיות ומדויקות בונות את היד בלי מאמץ.' } },
      { say: { en: 'Where it lives: every scale, chord change and solo depends on this hand. To keep: one finger per fret, fingertips just behind the frets, a light thumb, fingers hovering close, and the least pressure that still gives a clean note, from free time to the tempo ladder.', he: 'איפה זה חי: כל סולם, כל חילוף אקורד וכל סולו תלויים ביד הזאת. מה לזכור: אצבע לכל סריג, קצות אצבעות ממש מאחורי הסריגים, אגודל קל, אצבעות שמרחפות קרוב, והלחץ הקטן ביותר שעדיין נותן צליל נקי, מזמן חופשי ועד סולם הטמפו.' } },
    ],
  },
  {
    id: 'fam-g-legato',
    area: 'play',
    emoji: '',
    title: { en: 'Legato: hammer-ons and pull-offs', he: 'לגאטו: הקשות ומשיכות' },
    takeaway: { en: 'Pick once, then the fretting hand makes the notes: hammer-ons onto the fret, pull-offs that pluck the string. Even volume with the picked notes.', he: 'פורטים פעם אחת, ואז היד הלוחצת יוצרת את הצלילים: הקשות על הסריג, משיכות שפורטות את המיתר. עוצמה שווה לצלילים הפרוטים.' },
    steps: [
      { say: { en: 'Hi {name}! Legato on the guitar means more notes than picks: the fretting hand sounds the notes by itself.', he: 'היי {name}! לגאטו בגיטרה פירושו יותר צלילים ממכות: היד הלוחצת משמיעה את הצלילים בעצמה.' }, play: [notes([69, 71, 72, 71, 69], 0.2)] },
      { say: { en: 'A hammer-on: pick a note, then bring another finger down hard on a higher fret. The string keeps ringing at the new pitch.', he: 'הקשה: פורטים צליל, ואז מורידים אצבע אחרת בחוזקה על סריג גבוה יותר. המיתר ממשיך לצלצל בגובה החדש.' }, play: [notes([69, 71], 0.5)], show: { text: { en: 'h: 5 → 7', he: 'הקשה: 5 ← 7' } } },
      { say: { en: 'A pull-off: with both fingers down, pull the higher one off with a small sideways flick, so it plucks the string as it leaves.', he: 'משיכה: כששתי האצבעות למטה, מושכים את הגבוהה החוצה בתנועה קטנה הצידה, כך שהיא פורטת את המיתר כשהיא עוזבת.' }, play: [notes([71, 69], 0.5)], show: { text: { en: 'p: 7 → 5', he: 'משיכה: 7 ← 5' } } },
      { say: { en: 'The one thing to watch: even volume. The hammered and pulled notes should be as loud as the picked one; listen for the weak one.', he: 'הדבר האחד לשים אליו לב: עוצמה שווה. הצלילים המוקשים והנמשכים צריכים להיות חזקים כמו הצליל הפרוט; מקשיבים לחלש מביניהם.' }, play: [ev([[69, 0, 0.25, 0.7], [71, 0.25, 0.25, 0.65], [72, 0.5, 0.25, 0.65], [71, 0.75, 0.25, 0.65], [69, 1, 0.4, 0.65]], 1.6)], show: { text: { en: 'every note equal', he: 'כל צליל שווה' } } },
      { say: { en: 'Your turn: every finger pair, free time first, then the tempo ladder. Every note is measured, picked or not.', he: 'תורכם: כל זוג אצבעות, קודם בזמן חופשי, ואז סולם הטמפו. כל צליל נמדד, פרוט או לא.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Trills are hammer-ons and pull-offs in a row, as fast as they stay even. Start with fingers one and two, then try the weaker pairs, three and four.', he: 'טרילים הם הקשות ומשיכות ברצף, מהר ככל שהן נשארות שוות. מתחילים באצבעות אחת ושתיים, ואז מנסים את הזוגות החלשים יותר, שלוש וארבע.' }, play: [notes([69, 71, 69, 71, 69, 71, 69, 71, 69, 71], 0.1)] },
      { say: { en: 'Legato pentatonic: two notes per string, one pick on each string, the second note hammered going up and pulled off going down.', he: 'פנטטוני בלגאטו: שני צלילים בכל מיתר, מכה אחת על כל מיתר, הצליל השני מוקש בעלייה ונמשך בירידה.' }, play: [notes([57, 60, 62, 64, 67, 69], 0.2)] },
      { say: { en: 'Two-hand tapping lets the picking hand hammer a note high on the neck, then pull off to the fretting hand. It turns one string into wide arpeggios.', he: 'טאפינג בשתי ידיים נותן ליד הפורטת להקיש צליל גבוה על הצוואר, ואז למשוך אל היד הלוחצת. זה הופך מיתר אחד לארפג׳יו רחב.' }, play: [notes([76, 67, 71, 76, 67, 71], 0.15)] },
      { say: { en: 'The common mistake is noise from the other strings. Rest the picking hand lightly on the low strings and let unused fingers touch the higher ones.', he: 'הטעות הנפוצה היא רעש מהמיתרים האחרים. מניחים את היד הפורטת בעדינות על המיתרים הנמוכים, ונותנים לאצבעות שלא בשימוש לגעת בגבוהים.' }, show: { text: { en: 'mute what you don’t play', he: 'להשתיק את מה שלא מנגנים' } } },
      { say: { en: 'Practice slowly with a clean amp sound. Distortion hides weak pull-offs; a clean tone shows every one.', he: 'מתרגלים לאט עם צליל נקי במגבר. דיסטורשן מסתיר משיכות חלשות; צליל נקי מראה כל אחת.' } },
      { say: { en: 'Where it lives: fluid rock solos, blues licks and fast fusion runs, where the notes flow without a pick on each one. To keep: firm hammers right behind the fret, pull-offs that pluck, every note as loud as a picked one, and the other strings muted throughout.', he: 'איפה זה חי: סולואי רוק זורמים, ליקים של בלוז וריצות פיוז׳ן מהירות, שבהם הצלילים זורמים בלי מכת מפרט על כל אחד. מה לזכור: הקשות חזקות ממש מאחורי הסריג, משיכות שפורטות, כל צליל חזק כמו צליל פרוט, והמיתרים האחרים מושתקים כל הזמן.' } },
    ],
  },
  {
    id: 'fam-g-lead',
    area: 'play',
    emoji: '',
    title: { en: 'Lead techniques', he: 'טכניקות סולו' },
    takeaway: { en: 'Slides, harmonics, bends that reach the pitch, vibrato, double stops and octaves: the voice of a guitar solo, each one measured in tune.', he: 'החלקות, הרמוניקים, כיפופים שמגיעים לגובה, ויברטו, צלילים כפולים ואוקטבות: הקול של סולו בגיטרה, כל אחד נמדד בכיוון.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the sounds that make a guitar sing: slides, harmonics, bends and vibrato.', he: 'היי {name}! המשפחה הזאת מאמנת את הצלילים שגורמים לגיטרה לשיר: החלקות, הרמוניקים, כיפופים וויברטו.' }, play: [notes([64, 67, 69, 67, 64], 0.3)] },
      { say: { en: 'A slide: pick once and glide the finger to a new fret, keeping the pressure on. A natural harmonic: touch the string lightly over fret 12 and pick.', he: 'החלקה: פורטים פעם אחת ומחליקים את האצבע לסריג חדש, תוך שמירה על הלחץ. הרמוניק טבעי: נוגעים במיתר בעדינות מעל סריג 12 ופורטים.' }, play: [notes([62, 64], 0.5), rest(0.3), notes([76], 1)] },
      { say: { en: 'A bend pushes the string across the fret to raise the pitch: a half step, then a whole step. Fingers behind the bending finger help push.', he: 'כיפוף דוחף את המיתר לרוחב הסריג כדי להגביה את הצליל: חצי טון, ואז טון שלם. האצבעות שמאחורי האצבע המכופפת עוזרות לדחוף.' }, play: [notes([69], 0.6), rest(0.2), notes([67, 69], 0.6)], show: { text: { en: 'target first, then bend to it', he: 'קודם היעד, ואז מכופפים אליו' } } },
      { say: { en: 'The one thing to watch: the bend must arrive at the target pitch. Play the target fretted first, then bend until the sound matches it.', he: 'הדבר האחד לשים אליו לב: הכיפוף חייב להגיע לגובה היעד. מנגנים קודם את היעד בלחיצה, ואז מכופפים עד שהצליל זהה לו.' }, play: [notes([71, 69, 71], 0.5)], show: { text: { en: 'in tune, not near', he: 'בכיוון, לא בערך' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. The app measures every bend in cents, so you see how close it lands.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. האפליקציה מודדת כל כיפוף בסנטים, כך שרואים כמה קרוב הוא נוחת.' }, show: { text: { en: 'measured in cents', he: 'נמדד בסנטים' } } },
    ],
    more: [
      { say: { en: 'Vibrato is a small, regular bend and release, repeated. Narrow and slow for a ballad, wide and faster for rock. It comes from the wrist, like turning a key.', he: 'ויברטו הוא כיפוף ושחרור קטנים וקבועים, שוב ושוב. צר ואיטי לבלדה, רחב ומהיר יותר לרוק. הוא בא משורש כף היד, כמו סיבוב מפתח.' }, play: [notes([69, 70, 69, 70, 69, 70, 69], 0.15)] },
      { say: { en: 'Bend and release: bend up, hold the pitch, then let the string down to where it started. A pre-bend is bent silently first, picked, then released.', he: 'כיפוף ושחרור: מכופפים למעלה, מחזיקים את הגובה, ואז מורידים את המיתר לאן שהתחיל. בכיפוף מוקדם מכופפים קודם בשקט, פורטים, ואז משחררים.' }, play: [notes([67, 69, 69, 67], 0.4)] },
      { say: { en: 'Double stops play two strings at once, in 3rds or 6ths. Octaves in the Wes Montgomery style use the thumb, with the string between them muted.', he: 'צלילים כפולים מנגנים שני מיתרים בבת אחת, בטרצות או בסקסטות. אוקטבות בסגנון ווס מונטגומרי משתמשות באגודל, כשהמיתר שביניהן מושתק.' }, play: [chord([64, 67], 0.5), chord([65, 69], 0.5), chord([55, 67], 0.6)] },
      { say: { en: 'The common mistake is a bend that stops short of the pitch. Check against the fretted target every time until the hand knows the distance.', he: 'הטעות הנפוצה היא כיפוף שנעצר לפני הגובה. בודקים מול היעד הלחוץ בכל פעם, עד שהיד מכירה את המרחק.' }, show: { text: { en: 'check against the target', he: 'לבדוק מול היעד' } } },
      { say: { en: 'Put the techniques into phrases: a slide in, a bend, a vibrato on the last note. A solo is these few sounds, placed with care.', he: 'מכניסים את הטכניקות למשפטים: החלקה פנימה, כיפוף, ויברטו על הצליל האחרון. סולו הוא הצלילים המעטים האלה, ממוקמים בתשומת לב.' } },
      { say: { en: 'Where it lives: blues, rock and soul solos, where one bent note can say more than a fast run. To keep: bends that reach the target, a steady vibrato, clean slides and harmonics, all measured in tune.', he: 'איפה זה חי: סולואים בבלוז, ברוק ובסול, שבהם צליל מכופף אחד יכול לומר יותר מריצה מהירה. מה לזכור: כיפופים שמגיעים ליעד, ויברטו יציב, החלקות והרמוניקים נקיים, הכול נמדד בכיוון.' } },
    ],
  },
  {
    id: 'fam-g-flamenco',
    area: 'play',
    emoji: '',
    title: { en: 'Flamenco technique', he: 'טכניקת פלמנקו' },
    takeaway: { en: 'Rasgueado, picado and alzapúa inside the compás: the twelve-beat cycle of soleá and bulería, accented on 3, 6, 8, 10 and 12.', he: 'ראסגאדו, פיקאדו ואלסאפואה בתוך הקומפאס: המחזור של שתים־עשרה פעמות של סולאה ובולריאה, עם הדגשות ב־3, 6, 8, 10 ו־12.' },
    steps: [
      { say: { en: 'Hi {name}! Flamenco guitar has its own right-hand techniques and its own rhythm cycles. This family trains both.', he: 'היי {name}! לגיטרת פלמנקו יש טכניקות יד ימין משלה ומחזורי מקצב משלה. המשפחה הזאת מאמנת את שניהם.' }, play: [ev([...strum(E_MINOR_GTR, 0, 0.012, 0.75), ...strum(E_MINOR_GTR, 0.12, 0.012, 0.6), ...strum(E_MINOR_GTR, 0.24, 0.012, 0.6), ...strum(E_MINOR_GTR, 0.36, 0.012, 0.8)], 1.2)] },
      { say: { en: 'Rasgueado: the fingers start curled and flick out across the strings one after another, so one strum becomes a quick roll of strokes.', he: 'ראסגאדו: האצבעות מתחילות מכופפות ונפתחות החוצה על המיתרים אחת אחרי השנייה, כך שפריטה אחת הופכת לגלגול מהיר של מכות.' }, play: [ev([0, 0.09, 0.18, 0.27].flatMap((t, i) => strum(E_MINOR_GTR, t, 0.01, i === 3 ? 0.85 : 0.55)), 1)] },
      { say: { en: 'Picado plays scales with rest strokes, index and middle alternating, crisp and loud. Alzapúa uses the thumb, down and up, mixing a melody and strums.', he: 'פיקאדו מנגן סולמות במכה נשענת, מורה ואמה לסירוגין, חד וחזק. אלסאפואה משתמשת באגודל, למטה ולמעלה, ומשלבת מנגינה ופריטות.' }, play: [notes([64, 65, 67, 69, 67, 65, 64, 62], 0.14)] },
      { say: { en: 'The one thing to watch: the compás. In soleá and bulería, count twelve beats and accent three, six, eight, ten and twelve.', he: 'הדבר האחד לשים אליו לב: הקומפאס. בסולאה ובבולריאה סופרים שתים־עשרה פעמות ומדגישים שלוש, שש, שמונה, עשר ושתים־עשרה.' }, play: [ev(Array.from({ length: 12 }, (_, i): [number, number, number, number] => [52, i * 0.25, 0.15, [2, 5, 7, 9, 11].includes(i) ? 0.85 : 0.3]), 3.2)], show: { text: { en: '1 2 3 4 5 6 7 8 9 10 11 12', he: '1 2 3 4 5 6 7 8 9 10 11 12' } } },
      { say: { en: 'Your turn: free time first for the notes, then the tempo ladder. Every stroke and every accent is measured in time.', he: 'תורכם: קודם בזמן חופשי בשביל הצלילים, ואז סולם הטמפו. כל מכה וכל הדגשה נמדדות בזמן.' }, show: { text: { en: '3 · 6 · 8 · 10 · 12', he: '3 · 6 · 8 · 10 · 12' } } },
    ],
    more: [
      { say: { en: 'The triplet rasgueado divides each beat into three even strokes. Keep the strokes equal in loudness, so the roll sounds like one smooth sound.', he: 'ראסגאדו בטריולות מחלק כל פעמה לשלוש מכות שוות. שומרים על מכות שוות בעוצמה, כדי שהגלגול יישמע כמו צליל חלק אחד.' }, play: [ev([0, 0.15, 0.3, 0.45, 0.6, 0.75].flatMap((t) => strum(E_MINOR_GTR, t, 0.01, 0.6)), 1.2)] },
      { say: { en: 'Seguiriya counts its cycle as two, two, three, three, two: long and short beats. Rumba is in four, close to pop, with a strong strummed groove.', he: 'סגיריה סופרת את המחזור שלה כשתיים, שתיים, שלוש, שלוש, שתיים: פעמות ארוכות וקצרות. רומבה היא בארבע, קרובה לפופ, עם גרוב פרוט וחזק.' }, play: [ev([0, 0.5, 1, 1.75, 2.5].map((t): [number, number, number, number] => [52, t, 0.2, 0.8]), 3)] },
      { say: { en: 'Golpe, a tap on the guitar top with the ring finger, often marks the accents. It is part of the rhythm, not decoration.', he: 'גולפה, מכה על גוף הגיטרה בקמיצה, מסמנת הרבה פעמים את ההדגשות. היא חלק מהמקצב, לא קישוט.' }, play: [ev([...strum(E_MINOR_GTR, 0, 0.01, 0.7), [36, 0.5, 0.1, 0.5], ...strum(E_MINOR_GTR, 1, 0.01, 0.7)], 1.6)] },
      { say: { en: 'The common mistake is strength from the arm. Rasgueado comes from the fingers opening fast; a relaxed wrist gives speed and volume.', he: 'הטעות הנפוצה היא כוח מהזרוע. ראסגאדו בא מאצבעות שנפתחות מהר; שורש כף יד רפוי נותן מהירות ועוצמה.' }, show: { text: { en: 'fingers, not the arm', he: 'אצבעות, לא הזרוע' } } },
      { say: { en: 'Clap the compás before you play it: twelve claps, accents loud. When the cycle lives in the hands, the guitar techniques fall into place.', he: 'מוחאים כפיים את הקומפאס לפני שמנגנים אותו: שתים־עשרה מחיאות, ההדגשות חזקות. כשהמחזור חי בידיים, הטכניקות של הגיטרה נכנסות למקום.' } },
      { say: { en: 'Where it lives: soleá, bulería, alegrías, tangos and rumba, played for dancers and singers who expect the guitar to hold the compás without a slip. To keep: relaxed fingers that flick, even strokes, accents on three, six, eight, ten and twelve, and the cycle counted aloud until it lives in the hands.', he: 'איפה זה חי: סולאה, בולריאה, אלגריאס, טנגוס ורומבה, שמנוגנים לרקדנים ולזמרים שמצפים מהגיטרה להחזיק את הקומפאס בלי לפספס. מה לזכור: אצבעות רפויות שנפתחות, מכות שוות, הדגשות בשלוש, שש, שמונה, עשר ושתים־עשרה, והמחזור נספר בקול עד שהוא חי בידיים.' } },
    ],
  },

  // ================================================================== TOPIC: song chords
  {
    id: 'song-chords',
    area: 'play',
    emoji: '',
    title: { en: 'Finding a song’s chords', he: 'למצוא את האקורדים של שיר' },
    takeaway: { en: 'Listen to the melody notes on the strong beats: the chord that holds them fits. Home chord, the chord on 5, then the chord on 4.', he: 'מקשיבים לצלילי המנגינה על הפעמות החזקות: האקורד שמכיל אותם מתאים. אקורד הבית, האקורד על 5, ואז האקורד על 4.' },
    steps: [
      { say: { en: 'Hi {name}! Here you hear a bar of a song and choose the chord under it, then play it: guitar strums, bass plays the root, keys play the chord.', he: 'היי {name}! כאן שומעים תיבה של שיר ובוחרים את האקורד שמתחתיה, ואז מנגנים אותו: גיטרה פורטת, בס מנגן את השורש, קלידים מנגנים את האקורד.' }, play: [notes([64, 64, 65, 67], 0.4)] },
      { say: { en: 'Most songs lean on two chords: the home chord, and the chord built on the fifth note of the key, which wants to go home.', he: 'רוב השירים נשענים על שני אקורדים: אקורד הבית, והאקורד שנבנה על הצליל החמישי בסולם, שרוצה לחזור הביתה.' }, play: [chord([48, 52, 55, 60], 1), chord([43, 50, 55, 59], 1), chord([48, 52, 55, 60], 1.2)], show: { text: { en: 'I · V · I', he: 'I · V · I' } } },
      { say: { en: 'The clue is the melody on the strong beats. If it sings C, E or G, the home chord C fits. If it sings G, B or D, the G chord fits.', he: 'הרמז הוא המנגינה על הפעמות החזקות. אם היא שרה דו, מי או סול, אקורד הבית דו מתאים. אם היא שרה סול, סי או רה, אקורד סול מתאים.' }, play: [ev([[64, 0, 0.5], [48, 0, 1, 0.4], [52, 0, 1, 0.4], [55, 0, 1, 0.4], [62, 1, 0.5], [43, 1, 1, 0.4], [47, 1, 1, 0.4], [50, 1, 1, 0.4]], 2.2)] },
      { say: { en: 'The one thing to watch: try each choice and listen. The wrong chord rubs against the melody; the right one sounds settled under it.', he: 'הדבר האחד לשים אליו לב: מנסים כל אפשרות ומקשיבים. האקורד הלא נכון מתחכך במנגינה; הנכון נשמע רגוע מתחתיה.' }, play: [ev([[71, 0, 0.8], [48, 0, 0.8, 0.4], [52, 0, 0.8, 0.4], [55, 0, 0.8, 0.4], [71, 1, 0.8], [43, 1, 0.8, 0.4], [47, 1, 0.8, 0.4], [50, 1, 0.8, 0.4]], 2)], show: { text: { en: 'rub or rest?', he: 'חיכוך או מנוחה?' } } },
      { say: { en: 'Your turn: choose, then play the chord. Later levels add the chord on four, then ask what comes next. Every played chord is heard and checked.', he: 'תורכם: בוחרים, ואז מנגנים את האקורד. שלבים מאוחרים יותר מוסיפים את האקורד על 4, ואז שואלים מה בא אחר כך. כל אקורד שמנגנים נשמע ונבדק.' }, show: { text: { en: 'hear · choose · play', he: 'שומעים · בוחרים · מנגנים' } } },
    ],
    more: [
      { say: { en: 'Why these chords? In a major key the home chord, the chord on four and the chord on five together contain every note of the scale, so almost any melody fits one of them.', he: 'למה האקורדים האלה? בסולם מז׳ורי, אקורד הבית, האקורד על 4 והאקורד על 5 מכילים יחד את כל צלילי הסולם, ולכן כמעט כל מנגינה מתאימה לאחד מהם.' }, play: [chord([48, 52, 55], 0.8), chord([41, 45, 48], 0.8), chord([43, 47, 50], 0.8)] },
      { say: { en: 'The chord on four has F and A, the notes the other two lack. When the melody leans on F or A, think of it first.', he: 'באקורד על 4 יש פה ולה, הצלילים שחסרים לשני האחרים. כשהמנגינה נשענת על פה או על לה, חושבים עליו קודם.' }, play: [ev([[69, 0, 0.8], [41, 0, 0.9, 0.4], [45, 0, 0.9, 0.4], [48, 0, 0.9, 0.4]], 1.2)] },
      { say: { en: 'Songs usually end a phrase on the home chord, and the bar just before it is often the chord on five. Use the shape of the phrase as a second clue.', he: 'שירים בדרך כלל מסיימים משפט באקורד הבית, והתיבה שלפניו היא הרבה פעמים האקורד על 5. משתמשים בצורת המשפט כרמז שני.' }, play: [chord([43, 47, 50, 53], 0.9), chord([48, 52, 55, 60], 1.2)] },
      { say: { en: 'The common mistake is following the lowest melody note. Weak-beat notes often pass between chord tones; trust the notes that fall on the beat.', he: 'הטעות הנפוצה היא ללכת אחרי הצליל הנמוך במנגינה. צלילים על פעמות חלשות עוברים הרבה פעמים בין צלילי האקורד; סומכים על הצלילים שנופלים על הפעמה.' }, show: { text: { en: 'trust the strong beats', he: 'לסמוך על הפעמות החזקות' } } },
      { say: { en: 'Practice away from the app too: hum a song you know and strum along with only the home chord and the chord on five. Change when it starts to rub.', he: 'מתרגלים גם מחוץ לאפליקציה: מזמזמים שיר מוכר ופורטים איתו רק את אקורד הבית ואת האקורד על 5. מחליפים כשמתחיל חיכוך.' } },
      { say: { en: 'Where it lives: every campfire song, every jam and every first band rehearsal. To keep: the notes on the strong beats choose the chord.', he: 'איפה זה חי: כל שיר מדורה, כל ג׳אם וכל חזרה ראשונה של להקה. מה לזכור: הצלילים על הפעמות החזקות בוחרים את האקורד.' } },
    ],
  },
];

/** The family's first path level (tech:<family>) and the topic's level 1 open with these. */
export const UNITS: Record<string, string> = {
  'tech:fingers': 'fam-fingers',
  'tech:control': 'fam-control',
  'tech:k-classic': 'fam-k-classic',
  'tech:k-pedal': 'fam-k-pedal',
  'tech:advanced': 'fam-advanced',
  'tech:g-fingerstyle': 'fam-g-fingerstyle',
  'tech:g-picking': 'fam-g-picking',
  'tech:g-fretting': 'fam-g-fretting',
  'tech:g-legato': 'fam-g-legato',
  'tech:g-lead': 'fam-g-lead',
  'tech:g-flamenco': 'fam-g-flamenco',
  'topic:song-strum': 'song-chords',
};


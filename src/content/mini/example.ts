// The model mini-lesson (spec X). Every other lesson follows this voice: personal ("you"), playful,
// short sentences, exact facts, an example after almost every idea, 60–90 seconds in total.

import type { MiniLesson } from '../miniTypes';

const cadenceC = { kind: 'cadence' as const, key: { letter: 'C' as const, acc: 0 as const } };

export const EXAMPLE: MiniLesson[] = [
  {
    id: 'degrees-135',
    area: 'ear',
    emoji: '🏠',
    title: { en: 'Home, third, fifth', he: 'הבית, השלוש והחמש' },
    takeaway: { en: '1, 3 and 5 build the home chord: 1 is rest, 5 is open and strong, 3 is the warm color in between.', he: '1, 3 ו־5 בונים את אקורד הבית: 1 הוא מנוחה, 5 פתוח וחזק, 3 הוא הצבע החם שביניהם.' },
    steps: [
      {
        say: { en: 'Hey {name}! Every key has a home note — we call it 1. Listen: the chords lead you there, and you can feel it land.', he: 'היי {name}! לכל סולם יש צליל בית — אנחנו קוראים לו 1. הקשיבו: האקורדים מובילים אליו, ומרגישים איך הוא נוחת.' },
        play: [cadenceC, { kind: 'note', midi: 60, duration: 1.4 }],
        show: { notes: [60], key: 'C', text: { en: '1 = home', he: '1 = בית' } },
      },
      {
        say: { en: 'Stack two more notes on top — 3 and 5 — and you get the home chord. Most melodies love to rest on one of these three.', he: 'מוסיפים מעליו עוד שני צלילים — 3 ו־5 — ומקבלים את אקורד הבית. רוב המנגינות אוהבות לנוח על אחד משלושת אלה.' },
        play: [{ kind: 'chord', midis: [60, 64, 67], duration: 1.2, arpeggio: true }, { kind: 'chord', midis: [60, 64, 67], duration: 1.4 }],
        show: { notes: [60, 64, 67], key: 'C', text: { en: '1 – 3 – 5', he: '1 – 3 – 5' } },
      },
      {
        say: { en: 'Number 5 sounds open and strong, like a bright pillar. It feels stable, but a little "up in the air".', he: 'צליל 5 נשמע פתוח וחזק, כמו עמוד מואר. הוא יציב, אבל קצת "באוויר".' },
        play: [cadenceC, { kind: 'note', midi: 67, duration: 1.6 }],
        show: { notes: [67], key: 'C', text: { en: '5 — open, strong', he: '5 — פתוח, חזק' } },
      },
      {
        say: { en: 'Number 3 is the warm one — it gives the chord its color. In a major key it sounds sweet and bright.', he: 'צליל 3 הוא החם — הוא נותן לאקורד את הצבע שלו. בסולם מז׳ור הוא נשמע מתוק ומואר.' },
        play: [cadenceC, { kind: 'note', midi: 64, duration: 1.6 }],
        show: { notes: [64], key: 'C', text: { en: '3 — warm color', he: '3 — צבע חם' } },
      },
      {
        say: { en: 'And 1 is total rest: nothing wants to move. Here are all three again — 1, then 3, then 5. Feel the difference?', he: 'ו־1 הוא מנוחה מוחלטת: שום דבר לא רוצה לזוז. הנה שלושתם שוב — 1, אחר כך 3, אחר כך 5. מרגישים את ההבדל?' },
        play: [cadenceC, { kind: 'notes', midis: [60, 64, 67], each: 0.9 }],
        show: { notes: [60, 64, 67], key: 'C' },
      },
      {
        say: { en: 'A trick for the tricky pair: if you are not sure between 3 and 5, sing up from 1. Do-re-mi reaches 3; keep going to sol for 5.', he: 'טריק לזוג המבלבל: אם אתם לא בטוחים בין 3 ל־5, שירו למעלה מ־1. דו־רה־מי מגיע ל־3; ממשיכים עד סול בשביל 5.' },
        play: [{ kind: 'notes', midis: [60, 62, 64, 65, 67], each: 0.45 }],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: 'do re MI fa SOL', he: 'דו רה מי פה סול' } },
      },
      {
        say: { en: 'Same shape in every key — only home moves. Ready? I play the chords, then one note: tell me 1, 3 or 5.', he: 'אותה צורה בכל סולם — רק הבית זז. מוכנים? אני מנגן את האקורדים, ואז צליל אחד: תגידו לי 1, 3 או 5.' },
        play: [{ kind: 'cadence', key: { letter: 'G', acc: 0 } }, { kind: 'notes', midis: [55, 59, 62], each: 0.7 }],
        show: { notes: [55, 59, 62], key: 'G', text: { en: 'G: 1 – 3 – 5', he: 'סול: 1 – 3 – 5' } },
      },
    ],
    more: [
      {
        say: { en: 'Scale degrees are numbers for the notes of a key, counted up from home. In C major, C is 1, D is 2, E is 3 and so on up to B, which is 7. The numbers stay the same in every key.', he: 'דרגות הסולם הן מספרים לצלילים של הסולם, סופרים למעלה מהבית. בדו מז׳ור, דו הוא 1, רה הוא 2, מי הוא 3, וכך הלאה עד סי, שהוא 7. המספרים נשארים אותו דבר בכל סולם.' },
        play: [{ kind: 'notes', midis: [60, 62, 64, 65, 67, 69, 71, 72], each: 0.4 }],
        show: { notes: [60, 62, 64, 65, 67, 69, 71, 72], key: 'C', text: { en: '1 2 3 4 5 6 7 1', he: '1 2 3 4 5 6 7 1' } },
      },
      {
        say: { en: 'Why these three belong together: each is a third above the last. C to E is a major third, four semitones; E to G is a minor third, three. Stacked, they form the major triad on 1 — the tonic chord.', he: 'למה דווקא שלושתם ביחד: כל אחד נמצא טרצה מעל הקודם. מדו למי זו טרצה גדולה, ארבעה חצאי טונים; ממי לסול טרצה קטנה, שלושה. יחד הם יוצרים את המשולש המז׳ורי על 1 — אקורד הטוניקה.' },
        play: [{ kind: 'chord', midis: [60, 64, 67], duration: 1.2, arpeggio: true }, { kind: 'chord', midis: [60, 64, 67], duration: 1.3 }],
        show: { notes: [60, 64, 67], chord: true, key: 'C', text: { en: 'C – E – G', he: 'דו – מי – סול' } },
      },
      {
        say: { en: 'Against the home chord, 1, 3 and 5 all sound settled. The other degrees lean somewhere: 7 pulls hard up to 1. That contrast is your first clue — a note at rest is probably 1, 3 or 5.', he: 'מול אקורד הבית, 1, 3 ו־5 נשמעים יציבים. שאר הדרגות נשענות לאנשהו: 7 מושך חזק למעלה אל 1. הניגוד הזה הוא הרמז הראשון — צליל שנח הוא כנראה 1, 3 או 5.' },
        play: [cadenceC, { kind: 'notes', midis: [71, 72], each: 1 }],
        show: { notes: [71, 72], key: 'C', text: { en: '7 → 1', he: '7 → 1' } },
      },
      {
        say: { en: 'A reliable strategy: hold the note in your head and sing down the scale to the nearest home note, counting as you go. From 5 it takes four steps — 5, 4, 3, 2, 1. From 3, two steps.', he: 'אסטרטגיה בטוחה: החזיקו את הצליל בראש ושירו את הסולם למטה עד צליל הבית הקרוב, וספרו בדרך. מ־5 זה ארבעה צעדים — 5, 4, 3, 2, 1. מ־3, שני צעדים.' },
        play: [cadenceC, { kind: 'notes', midis: [67, 65, 64, 62, 60], each: 0.5 }],
        show: { notes: [67, 65, 64, 62, 60], key: 'C', text: { en: '5 4 3 2 1', he: '5 4 3 2 1' } },
      },
      {
        say: { en: 'Degrees ignore the octave. A high C is still 1, and a G below home is still 5. Judge the feeling of the note, not how high it is.', he: 'דרגות לא תלויות באוקטבה. דו גבוה הוא עדיין 1, וסול מתחת לבית הוא עדיין 5. שפטו את התחושה של הצליל, לא את הגובה שלו.' },
        play: [cadenceC, { kind: 'notes', midis: [72, 55], each: 1 }],
        show: { notes: [72, 55], key: 'C', text: { en: 'high 1 · low 5', he: '1 גבוה · 5 נמוך' } },
      },
      {
        say: { en: 'In a minor key, 3 is a semitone lower — E♭ in C minor. 1 and 5 stay where they are; only the color turns darker. Listen to major, then minor.', he: 'בסולם מינור, 3 נמוך בחצי טון — מי במול בדו מינור. 1 ו־5 נשארים במקומם; רק הצבע נעשה כהה יותר. הקשיבו למז׳ור, ואז למינור.' },
        play: [{ kind: 'chord', midis: [60, 64, 67], duration: 1.2, arpeggio: true }, { kind: 'chord', midis: [60, 63, 67], duration: 1.2, arpeggio: true }],
        show: { notes: [60, 63, 67], key: 'C', text: { en: '1 – ♭3 – 5', he: '1 – ♭3 – 5' } },
      },
      {
        say: { en: 'The usual mistake is mixing up 3 and 5, especially high up. Ask: warm and sweet, or open and bare? Warm is 3, bare is 5. Still unsure — sing down to 1 and count.', he: 'הטעות הנפוצה היא לבלבל בין 3 ל־5, במיוחד בגבוה. שאלו: חם ומתוק, או פתוח וחשוף? חם זה 3, חשוף זה 5. עדיין לא בטוחים — שירו למטה עד 1 וספרו.' },
        play: [cadenceC, { kind: 'notes', midis: [76, 79], each: 1.1 }],
        show: { notes: [76, 79], key: 'C', text: { en: '3 · 5', he: '3 · 5' } },
      },
      {
        say: { en: 'In real music these notes are everywhere. Bugle calls and many fanfares use only 1, 3 and 5, because a valveless horn plays them easily. Countless melodies also end on 1, or pause on 3 or 5.', he: 'במוזיקה אמיתית הצלילים האלה בכל מקום. תרועות של חצוצרה ופנפרות רבות משתמשות רק ב־1, 3 ו־5, כי כלי נשיפה בלי שסתומים מנגן אותם בקלות. אינספור מנגינות גם נגמרות על 1, או עוצרות על 3 או 5.' },
        play: [{ kind: 'melody', midis: [55, 60, 64, 67, 64, 67, 72], beats: [0.5, 0.5, 0.5, 1, 0.5, 0.5, 2], bpm: 100 }],
        show: { notes: [55, 60, 64, 67, 64, 67, 72], key: 'C', text: { en: '5 1 3 5 3 5 1', he: '5 1 3 5 3 5 1' } },
      },
      {
        say: { en: 'Recap: 1 is rest, 3 is the warm color, 5 is open and strong. Together they make the home chord, in every key.', he: 'לסיכום: 1 הוא מנוחה, 3 הוא הצבע החם, 5 פתוח וחזק. יחד הם בונים את אקורד הבית, בכל סולם.' },
        show: { notes: [60, 64, 67], chord: true, key: 'C', text: { en: '1 – 3 – 5', he: '1 – 3 – 5' } },
      },
    ],
  },
];

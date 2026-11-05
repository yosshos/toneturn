// The model mini-lesson (spec X). Every other lesson follows this voice: personal ("you"), playful,
// short sentences, exact facts, an example after almost every idea, 60–90 seconds in total.

import type { MiniLesson } from '../miniTypes';

const cadenceC = { kind: 'cadence' as const, key: { letter: 'C' as const, acc: 0 as const } };

export const EXAMPLE: MiniLesson[] = [
  {
    id: 'degrees-135',
    area: 'ear',
    emoji: '🏠',
    title: { en: 'Home, third, fifth', he: 'בית, שלישית, חמישית' },
    takeaway: { en: '1, 3 and 5 build the home chord: 1 is rest, 5 is open and strong, 3 is the warm colour in between.', he: '1, 3 ו־5 בונים את אקורד הבית: 1 הוא מנוחה, 5 פתוח וחזק, 3 הוא הצבע החם שביניהם.' },
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
        say: { en: 'Number 3 is the warm one — it gives the chord its colour. In a major key it sounds sweet and bright.', he: 'צליל 3 הוא החם — הוא נותן לאקורד את הצבע שלו. בסולם מז׳ור הוא נשמע מתוק ומואר.' },
        play: [cadenceC, { kind: 'note', midi: 64, duration: 1.6 }],
        show: { notes: [64], key: 'C', text: { en: '3 — warm colour', he: '3 — צבע חם' } },
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
        say: { en: 'Same shape in every key — only home moves. Ready? I play the chords, then one note: tell me 1, 3 or 5. You got this!', he: 'אותה צורה בכל סולם — רק הבית זז. מוכנים? אני מנגן את האקורדים, ואז צליל אחד: תגידו לי 1, 3 או 5. אתם יכולים!' },
        play: [{ kind: 'cadence', key: { letter: 'G', acc: 0 } }, { kind: 'notes', midis: [55, 59, 62], each: 0.7 }],
        show: { notes: [55, 59, 62], key: 'G', text: { en: 'G: 1 – 3 – 5', he: 'סול: 1 – 3 – 5' } },
      },
    ],
  },
];

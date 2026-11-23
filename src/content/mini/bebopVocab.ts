// Bebop vocabulary (docs/AUDIT-GAPS-2.md High #1, #2, #3, #7, #8, #10; Medium #9): quick lessons before the keys family
// k-vocab, the guitar family g-bebop and the bass family b-bebop. Every fact matches src/engine/bebopVocab.ts and its
// tests. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { gatedOr, isVerified } from '../../engine/verifiedContent';
/** "3 to ♭9": gated by verifiedContent bh-3-to-b9 (hidden 2026-11-21, owner-confirmed and switched on 2026-11-23). */
const B9 = isVerified('card:bh-3b9');

const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.28): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// C major 7 under the examples; G7 and D minor for the Barry Harris lines.
const CMAJ7 = [48, 59, 64, 67];
const G7 = [43, 59, 65, 67];
const DM7 = [50, 60, 65, 69];

export const LESSONS: MiniLesson[] = [
  {
    id: 'vocab-approach',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Approach notes', he: 'צלילי גישה' },
    takeaway: { en: 'A chord tone on the beat, reached from a half step below or above, from two half steps away, or from the 5th above it (the dominant approach).', he: 'צליל אקורד על הפעמה, שמגיעים אליו מחצי טון מתחת או מעל, משני חצאי טונים, או מהקווינטה שמעליו (גישה דומיננטית).' },
    steps: [
      {
        say: { en: 'Hi {name}! A bebop line puts a chord tone on the beat. The note just before it can come from outside the chord.', he: 'היי {name}! קו ביבופ שם צליל אקורד על הפעמה. הצליל שלפניו יכול לבוא מחוץ לאקורד.' },
        play: [chord(CMAJ7), notes([63, 64], 0.4)],
        show: { notes: [63, 64], text: { en: 'D♯ → E', he: 'D♯ → E' } },
      },
      {
        say: { en: 'From a half step below, or a half step above. Over C major 7, D sharp or F into E.', he: 'מחצי טון מתחת, או מחצי טון מעל. מעל Cmaj7, רה דיאז או פה אל מי.' },
        play: [notes([63, 64], 0.4), rest(), notes([65, 64], 0.4)],
        show: { notes: [65, 64], text: { en: '½ below · ½ above', he: '½ מתחת · ½ מעל' } },
      },
      {
        say: { en: 'Two half steps make a longer lead-in: D, D sharp, E, or F sharp, F, E.', he: 'שני חצאי טונים הם כניסה ארוכה יותר: רה, רה דיאז, מי, או פה דיאז, פה, מי.' },
        play: [notes([62, 63, 64], 0.3), rest(), notes([66, 65, 64], 0.3)],
        show: { notes: [62, 63, 64], text: { en: 'two half steps', he: 'שני חצאי טונים' } },
      },
      {
        say: { en: 'The dominant approach comes from the 5th above the target, like V going to I. B into E.', he: 'הגישה הדומיננטית מגיעה מהקווינטה שמעל צליל המטרה, כמו V שהולך ל־I. סי אל מי.' },
        play: [chord(CMAJ7, 0.8), notes([71, 64], 0.45)],
        show: { notes: [71, 64], text: { en: '5th above → target', he: 'קווינטה מעל ← מטרה' } },
      },
      {
        say: { en: 'Your turn: every chord tone in turn on a held chord, then the 3rds and 7ths through ii–V–I. It starts in free time.', he: 'תורכם: כל צליל באקורד בתורו על אקורד מוחזק, ואז הטרצות והספטימות לאורך ii–V–I. מתחילים בזמן חופשי.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the outside note is gone before the beat, and the chord tone lands where the ear checks the harmony.', he: 'למה זה עובד: הצליל שבחוץ נעלם לפני הפעמה, וצליל האקורד נוחת בדיוק במקום שבו האוזן בודקת את ההרמוניה.' },
      },
      {
        say: { en: 'Through ii–V–I, aim at the 3rd of each chord on beat 1: F, B, E in C. The approach note sits on the last 8th of the bar before.', he: 'לאורך ii–V–I, מכוונים לטרצה של כל אקורד בפעמה 1: פה, סי, מי בדו. צליל הגישה יושב על השמינית האחרונה של התיבה הקודמת.' },
        play: [chord(DM7, 0.6), notes([64, 65], 0.3), chord(G7, 0.6), notes([58, 59], 0.3), chord(CMAJ7, 0.6), notes([63, 64], 0.4)],
      },
      {
        say: { en: 'A common mistake: the outside note lands on the beat and the chord tone after it. Then the wrong note is the one the ear hears.', he: 'טעות נפוצה: הצליל שבחוץ נוחת על הפעמה, וצליל האקורד אחריו. אז האוזן שומעת דווקא את הצליל השגוי.' },
      },
      {
        say: { en: 'Bass players walk with the same moves: a half step or the 5th before each new root. On a horn, guitar or piano they shape every bebop line.', he: 'נגני בס מהלכים עם אותן תנועות: חצי טון או קווינטה לפני כל שורש חדש. בכלי נשיפה, גיטרה או פסנתר הן מעצבות כל קו ביבופ.' },
        play: [notes([43, 46, 47, 48], 0.4)],
      },
      {
        say: { en: 'How to practice: one approach type at a time, slowly, into every chord tone. Say the target before you play it, then let the lead-in find it.', he: 'איך מתרגלים: סוג גישה אחד בכל פעם, לאט, אל כל צליל באקורד. אמרו את צליל המטרה לפני שאתם מנגנים אותו, ואז תנו לצליל הגישה למצוא אותו.' },
      },
      {
        say: { en: 'To keep: target on the beat, approach just before it, from below, above, two half steps away or the 5th.', he: 'מה לזכור: המטרה על הפעמה, הגישה רגע לפניה, מלמטה, מלמעלה, משני חצאי טונים או מהקווינטה.' },
      },
    ],
  },
  {
    id: 'vocab-enclose',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Enclosures', he: 'כיתורים' },
    takeaway: { en: 'Surround the target from both sides before it lands: half step above and below, scale step above and half step below, the 4-note bebop enclosure, the delayed resolution.', he: 'מקיפים את צליל המטרה משני הצדדים לפני שהוא נוחת: חצי טון מעל ומתחת, צעד בסולם מעל וחצי טון מתחת, כיתור הביבופ בארבעה צלילים, הפתרון המושהה.' },
    steps: [
      {
        say: { en: 'Hi {name}! An enclosure surrounds the target. Into E: F above, D sharp below, then E on the beat.', he: 'היי {name}! כיתור מקיף את צליל המטרה. אל מי: פה מעל, רה דיאז מתחת, ואז מי על הפעמה.' },
        play: [chord(CMAJ7, 0.8), notes([65, 63, 64], 0.3)],
        show: { notes: [65, 63, 64], text: { en: 'F · D♯ · E', he: 'F · D♯ · E' } },
      },
      {
        say: { en: 'The order can turn: below first, then above. D sharp, F, E.', he: 'אפשר להפוך את הסדר: קודם מתחת, ואז מעל. רה דיאז, פה, מי.' },
        play: [notes([63, 65, 64], 0.3)],
        show: { notes: [63, 65, 64], text: { en: 'below → above', he: 'מתחת ← מעל' } },
      },
      {
        say: { en: 'The scale step above, then a half step below. Into G: A, F sharp, G. The upper note comes from the scale, the lower one from outside it.', he: 'צעד בסולם מעל, ואז חצי טון מתחת. אל סול: לה, פה דיאז, סול. הצליל העליון בא מהסולם, התחתון מבחוץ.' },
        play: [notes([69, 66, 67], 0.3)],
        show: { notes: [69, 66, 67], text: { en: 'step above · ½ below', he: 'צעד מעל · ½ מתחת' } },
      },
      {
        say: { en: 'The 4-note bebop enclosure: a whole step above, a half step above, a half step below, the target. F sharp, F, D sharp, E.', he: 'כיתור הביבופ בארבעה צלילים: טון שלם מעל, חצי טון מעל, חצי טון מתחת, המטרה. פה דיאז, פה, רה דיאז, מי.' },
        play: [notes([66, 65, 63, 64], 0.28)],
        show: { notes: [66, 65, 63, 64], text: { en: '+2 +1 −1 → target', he: '‎+2 +1 −1 ← מטרה' } },
      },
      {
        say: { en: 'The delayed resolution circles once more: F, D sharp, D, D sharp, then E. Your turn, in free time first.', he: 'הפתרון המושהה מסתובב עוד פעם: פה, רה דיאז, רה, רה דיאז, ואז מי. תורכם, קודם בזמן חופשי.' },
        play: [notes([65, 63, 62, 63, 64], 0.26)],
        show: { notes: [65, 63, 62, 63, 64], text: { en: 'delayed', he: 'מושהה' } },
      },
    ],
    more: [
      {
        say: { en: 'Where the notes fall: the target on the beat, the enclosure in the 8ths before it. Two notes take one beat, four take two.', he: 'איפה הצלילים נופלים: המטרה על הפעמה, הכיתור בשמיניות שלפניה. שני צלילים לוקחים פעמה אחת, ארבעה לוקחים שתיים.' },
      },
      {
        say: { en: 'Enclose every chord tone of ii–V–I: the roots, then the 3rds, the 5ths, the 7ths. Each one becomes a place you can land.', he: 'מכתרים כל צליל אקורד של ii–V–I: השורשים, אחר כך הטרצות, הקווינטות, הספטימות. כל אחד הופך למקום שאפשר לנחות בו.' },
        play: [chord(DM7, 0.5), notes([66, 64, 65], 0.25), chord(G7, 0.5), notes([60, 58, 59], 0.25), chord(CMAJ7, 0.5), notes([65, 63, 64], 0.3)],
      },
      {
        say: { en: 'When the scale step above is only a half step, as F above E, the two enclosures sound the same. That is fine: the rule still holds.', he: 'כשהצעד בסולם מעל הוא רק חצי טון, כמו פה מעל מי, שני הכיתורים נשמעים אותו דבר. זה בסדר: הכלל עדיין מתקיים.' },
      },
      {
        say: { en: 'A common mistake is to rush the enclosure and land early. Keep the 8ths even and let the target arrive exactly on the beat.', he: 'טעות נפוצה היא למהר בכיתור ולנחות מוקדם. שמרו על שמיניות שוות ותנו למטרה להגיע בדיוק על הפעמה.' },
      },
      {
        say: { en: 'You hear enclosures all through the bebop era, on horns, piano and guitar, usually into the 3rd or the root of the next chord.', he: 'שומעים כיתורים לאורך כל תקופת הביבופ, בכלי נשיפה, בפסנתר ובגיטרה, בדרך כלל אל הטרצה או השורש של האקורד הבא.' },
        play: [notes([69, 66, 67, 64, 62, 60], 0.24), notes([62, 59, 60], 0.3)],
      },
      {
        say: { en: 'To keep: above and below, then the target on the beat. Learn one type at a time, in all twelve keys, first on a held chord and then through ii–V–I.', he: 'מה לזכור: מעל ומתחת, ואז המטרה על הפעמה. לומדים סוג אחד בכל פעם, בכל שנים־עשר הסולמות, קודם על אקורד מוחזק ואחר כך לאורך ii–V–I.' },
      },
    ],
  },
  {
    id: 'vocab-time',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'The click moves', he: 'הקליק זז' },
    takeaway: { en: 'Swing with the click on 2 and 4, then the click on the "and", then a click that drops out for a bar. You keep the time, the click only checks it.', he: 'סווינג עם קליק על 2 ו־4, אחר כך קליק על ה"וְ", ואז קליק שנעלם לתיבה. אתם מחזיקים את הזמן, הקליק רק בודק.' },
    steps: [
      {
        say: { en: 'Hi {name}! In swing the drummer’s hi-hat closes on 2 and 4. Hear the click there and feel 1 and 3 yourself.', he: 'היי {name}! בסווינג ההיי־האט של המתופף נסגר על 2 ו־4. שמעו את הקליק שם, והרגישו את 1 ו־3 בעצמכם.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.3)],
        show: { text: { en: '1 [2] 3 [4]', he: '1 [2] 3 [4]' } },
      },
      {
        say: { en: 'Swung 8ths: the first of each pair longer, the second shorter and lighter. Start with a scale and an arpeggio.', he: 'שמיניות סווינג: הראשונה בכל זוג ארוכה, השנייה קצרה וקלה יותר. מתחילים בסולם ובארפג׳יו.' },
        play: [notes([60, 64, 67, 71, 72, 71, 67, 64], 0.3)],
        show: { text: { en: 'long · short', he: 'ארוכה · קצרה' } },
      },
      {
        say: { en: 'Later the click moves to the "and" of each beat. It feels off at first: count out loud and place the beat between the clicks.', he: 'בהמשך הקליק זז ל"וְ" של כל פעמה. בהתחלה זה מרגיש מוזר: ספרו בקול ושימו את הפעמה בין הקליקים.' },
        show: { text: { en: '1 & 2 & → [&]', he: '1 & 2 & ← [&]' } },
      },
      {
        say: { en: 'Then the gap: three bars with the click, one bar silent. Keep playing through the silence and meet the click on the next 1.', he: 'ואז החור: שלוש תיבות עם קליק, תיבה אחת בשקט. ממשיכים לנגן דרך השקט ופוגשים את הקליק ב־1 הבא.' },
        play: [chord([50, 60, 65], 0.5), rest(0.3), chord([43, 53, 59], 0.5), rest(0.3), chord([48, 59, 64], 1)],
        show: { text: { en: '▮▮▮ ▯', he: '▮▮▮ ▯' } },
      },
      {
        say: { en: 'Your turn: lines and comping with each click. The count-in and the moving cue on the staff stay with you.', he: 'תורכם: קווים וליווי עם כל קליק. הספירה לפני והסמן הנע על החמשה נשארים איתכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why: a band has no click. The bass and the drums give 2 and 4, and everyone else keeps the rest of the bar inside.', he: 'למה: ללהקה אין קליק. הבס והתופים נותנים 2 ו־4, וכל השאר מחזיקים את שאר התיבה בפנים.' },
      },
      {
        say: { en: 'Comping in the Charleston rhythm: a chord on 1, another on the "and" of 2. With the click on 2 and 4, the second chord sits just before it.', he: 'ליווי במקצב הצ׳רלסטון: אקורד על 1, ועוד אחד על ה"וְ" של 2. עם קליק על 2 ו־4, האקורד השני יושב רגע לפניו.' },
        play: [chord([50, 60, 65], 0.6), rest(0.15), chord([50, 60, 65], 0.8)],
      },
      {
        say: { en: 'Four to the bar is the oldest swing comp on the guitar: one short chord on every beat, all the same length, the 2 and 4 a little heavier.', he: 'ארבע לתיבה הוא הליווי הוותיק ביותר של הגיטרה בסווינג: אקורד קצר על כל פעמה, כולם באותו אורך, ו־2 ו־4 קצת כבדים יותר.' },
        play: [chord([43, 53, 59], 0.35), chord([43, 53, 59], 0.35), chord([43, 53, 59], 0.35), chord([43, 53, 59], 0.35)],
      },
      {
        say: { en: 'A common mistake is to follow the click and drift with it. You lead; the click only confirms. Record a take and listen to the bar without the click: did the line slow down?', he: 'טעות נפוצה היא ללכת אחרי הקליק ולזוז איתו. אתם מובילים; הקליק רק מאשר. הקליטו ביצוע והקשיבו לתיבה בלי הקליק: האם הקו האט?' },
      },
      {
        say: { en: 'To keep: 2 and 4 first, then the "and", then the gap. Slow tempos are the hardest, because the space between clicks is longest. Stay there until it feels easy, then climb the tempo ladder.', he: 'מה לזכור: קודם 2 ו־4, אחר כך ה"וְ", ואז החור. טמפו איטי הוא הקשה ביותר, כי המרווח בין הקליקים הכי ארוך. הישארו שם עד שזה מרגיש קל, ואז עלו בסולם הטמפו.' },
      },
    ],
  },
  {
    id: 'vocab-harris',
    area: 'jazz',
    emoji: '𝄞',
    title: B9 ? { en: 'Barry Harris: minor, 3 to ♭9, triplets', he: 'בארי האריס: מינור, 3 עד ♭9, טריולות' } : { en: 'Barry Harris: minor and triplets', he: 'בארי האריס: מינור וטריולות' },
    takeaway: B9
      ? { en: 'Over V7 play the minor 6th a 5th above (Dm6 over G7); 3–5–7–♭9 on the V, the ♭9 falling to the 5th of I; a triplet down the scale keeps chord tones on the beats.', he: 'מעל V7 מנגנים את המינור 6 קווינטה מעל (Dm6 מעל G7); 3–5–7–♭9 על ה־V, וה־♭9 יורד לקווינטה של I; טריולה יורדת בסולם שומרת צלילי אקורד על הפעמות.' }
      : { en: 'Over V7 play the minor 6th a 5th above (Dm6 over G7); a triplet down the scale keeps chord tones on the beats.', he: 'מעל V7 מנגנים את המינור 6 קווינטה מעל (Dm6 מעל G7); טריולה יורדת בסולם שומרת צלילי אקורד על הפעמות.' },
    steps: [
      {
        say: { en: 'Hi {name}! Make it minor: over G7 think D minor. D minor 6 is D, F, A, B: the 5th, flat 7, 9 and 3 of G.', he: 'היי {name}! להפוך למינור: מעל G7 חושבים רה מינור. רה מינור 6 הוא רה, פה, לה, סי: הקווינטה, ה־♭7, ה־9 והטרצה של סול.' },
        play: [chord(G7, 0.9), notes([62, 65, 69, 71], 0.3)],
        show: { notes: [62, 65, 69, 71], text: { en: 'Dm6 / G7', he: 'Dm6 / G7' } },
      },
      {
        say: { en: 'The same four notes from B are B minor 7 flat 5. Minor 6 and minor 7 flat 5 are one chord.', he: 'אותם ארבעה צלילים מסי הם Bm7♭5. מינור 6 ו־m7♭5 הם אקורד אחד.' },
        play: [notes([59, 62, 65, 69], 0.3)],
        show: { notes: [59, 62, 65, 69], text: { en: 'Bm7♭5 = Dm6', he: 'Bm7♭5 = Dm6' } },
      },
      ...gatedOr('bh-3b9', {
        say: { en: '3 to flat 9: on G7 play B, D, F, A flat. The A flat falls to G, the 5th of C.', he: '3 עד ♭9: על G7 מנגנים סי, רה, פה, לה במול. הלה במול יורד לסול, הקווינטה של דו.' },
        play: [chord(G7, 0.8), notes([59, 62, 65, 68], 0.3), chord(CMAJ7, 0.4), notes([67], 0.7)],
        show: { notes: [59, 62, 65, 68, 67], text: { en: '3 5 7 ♭9 → 5', he: '3 5 7 ♭9 ← 5' } },
      }, [
        {
          say: { en: 'Now as a line: over G7, the D minor 6 arpeggio down, B, A, F, D, then land on E, the 3rd of C.', he: 'עכשיו כקו: מעל G7, ארפג׳יו רה מינור 6 בירידה, סי, לה, פה, רה, ואז נחיתה על מי, הטרצה של דו.' },
          play: [chord(G7, 0.8), notes([71, 69, 65, 62], 0.3), chord(CMAJ7, 0.4), notes([64], 0.7)],
          show: { notes: [71, 69, 65, 62, 64], text: { en: 'Dm6 / G7 → E', he: 'Dm6 / G7 ← E' } },
        },
      ]),
      {
        say: { en: 'The triplet rule: going down the scale, a triplet from the root reaches the next chord tone on the beat. G, F, E, then D.', he: 'חוק הטריולה: בירידה בסולם, טריולה מהשורש מגיעה לצליל האקורד הבא על הפעמה. סול, פה, מי, ואז רה.' },
        play: [notes([67, 65, 64], 0.18), notes([62, 60, 59], 0.3)],
        show: { notes: [67, 65, 64, 62], text: { en: 'G F E → D', he: 'G F E ← D' } },
      },
      {
        say: { en: 'Your turn: each idea through ii–V–I in all twelve keys, in free time first.', he: 'תורכם: כל רעיון לאורך ii–V–I בכל שנים־עשר הסולמות, קודם בזמן חופשי.' },
      },
    ],
    more: [
      {
        say: { en: 'Why minor works: the ii and the V share their notes, so the ii–V is one minor sound. You think less and hear the line.', he: 'למה המינור עובד: ל־ii ול־V יש אותם צלילים, ולכן ה־ii–V הוא צליל מינורי אחד. חושבים פחות ושומעים את הקו.' },
        play: [chord(DM7, 0.6), notes([62, 64, 65, 67], 0.24), chord(G7, 0.6), notes([71, 69, 65, 62], 0.24), chord(CMAJ7, 0.8)],
      },
      {
        say: { en: 'Try it in the drill: the D minor scale over D minor 7, then the D minor 6 arpeggio over G7, landing on E, the 3rd of C.', he: 'נסו בתרגיל: סולם רה מינור מעל Dm7, ואחר כך ארפג׳יו רה מינור 6 מעל G7, ונחיתה על מי, הטרצה של דו.' },
      },
      ...gatedOr('bh-3b9', {
        say: { en: 'The 3 to flat 9 cell is a diminished 7th chord built on the 3rd. Its four notes all lead somewhere in the I chord.', he: 'התא 3 עד ♭9 הוא אקורד מוקטן שנבנה על הטרצה. כל ארבעת הצלילים שלו מובילים למקום כלשהו באקורד I.' },
      }, [
        {
          say: { en: 'The same move works over every dominant: G7 takes D minor 6, C7 takes G minor 6, F7 takes C minor 6. Always the minor 6 a 5th above the root.', he: 'אותו מהלך עובד מעל כל דומיננט: G7 מקבל רה מינור 6, C7 מקבל סול מינור 6, F7 מקבל דו מינור 6. תמיד המינור 6 קווינטה מעל השורש.' },
        },
      ]),
      {
        say: { en: 'From the 3rd a triplet works too: B, A, G, then F. A triplet from the 5th or 7th would put a tension on the beat, so the rule avoids it.', he: 'גם מהטרצה טריולה עובדת: סי, לה, סול, ואז פה. טריולה מהקווינטה או מהספטימה הייתה שמה מתח על הפעמה, ולכן החוק נמנע ממנה.' },
        play: [notes([71, 69, 67], 0.18), notes([65], 0.6)],
      },
      {
        say: { en: 'A common mistake is to rush the triplet. Three even notes in the beat, then the chord tone on time.', he: 'טעות נפוצה היא למהר בטריולה. שלושה צלילים שווים בתוך הפעמה, ואז צליל האקורד בזמן.' },
      },
      {
        say: { en: 'To keep: over V think the minor a 5th above; 3–5–7–♭9 resolves to the 5th; triplets from the root and the 3rd.', he: 'מה לזכור: מעל V חושבים על המינור קווינטה מעל; 3–5–7–♭9 נפתר לקווינטה; טריולות מהשורש ומהטרצה.' },
      },
    ],
  },
  {
    id: 'vocab-lines',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Bebop lines on your instrument', he: 'קווי ביבופ בכלי שלכם' },
    takeaway: { en: 'Chord tones on the beats, scale or chromatic notes between, an approach into every change: over minor ii–V, altered dominants, the blues, rhythm changes and turnarounds.', he: 'צלילי אקורד על הפעמות, צלילי סולם או כרומטיים ביניהם, גישה לכל החלפה: על ii–V מינורי, דומיננט אלטרד, בלוז, ריתם צ׳יינג׳ס וטרנאראונדים.' },
    steps: [
      {
        say: { en: 'Hi {name}! Every line here follows one rule: a chord tone on each beat, a passing note between.', he: 'היי {name}! כל קו כאן הולך לפי כלל אחד: צליל אקורד על כל פעמה, צליל מעבר ביניהם.' },
        play: [chord(DM7, 0.6), notes([65, 64, 62, 60, 59], 0.28)],
        show: { notes: [65, 64, 62, 60, 59], text: { en: 'chord tone · passing', he: 'צליל אקורד · מעבר' } },
      },
      {
        say: { en: 'Digital patterns come first: 1-2-3-5 and 1-3-5-7 on each chord, two chords a bar.', he: 'קודם תבניות דיגיטליות: 1-2-3-5 ו־1-3-5-7 על כל אקורד, שני אקורדים בתיבה.' },
        play: [notes([62, 64, 65, 69, 55, 57, 59, 62], 0.24)],
        show: { notes: [62, 64, 65, 69], text: { en: '1-2-3-5', he: '1-2-3-5' } },
      },
      {
        say: { en: 'Then the forms: minor ii–V–i and the altered dominant, the jazz blues, rhythm changes with its bridge, and turnarounds. Over the altered dominant the targets are the 3rd, the flat 7 and the altered tensions.', he: 'אחר כך הצורות: ii–V–i מינורי והדומיננט האלטרד, בלוז ג׳אז, ריתם צ׳יינג׳ס עם הגשר, וטרנאראונדים. מעל הדומיננט האלטרד המטרות הן הטרצה, ה־♭7 והמתחים האלטרד.' },
        play: [chord([43, 59, 65, 68], 0.6), notes([68, 65, 63, 59], 0.26), chord([48, 60, 63, 67], 0.9)],
        show: { text: { en: 'ii–V · blues · rhythm · turnaround', he: 'ii–V · בלוז · ריתם · טרנאראונד' } },
      },
      {
        say: { en: 'Each line is new in every key, built from the rules, so there is nothing to memorise: read it, hear the chord under it, and let the beats land on chord tones.', he: 'כל קו חדש בכל סולם ונבנה מהכללים, כך שאין מה לשנן: קוראים אותו, שומעים את האקורד מתחתיו, ונותנים לפעמות לנחות על צלילי אקורד.' },
        play: [chord(CMAJ7, 0.6), notes([64, 62, 60, 59, 57, 55], 0.26)],
      },
      {
        say: { en: 'Your turn: free time first, then the tempo ladder.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו.' },
      },
    ],
    more: [
      {
        say: { en: 'Turnarounds are where lines are made: I–vi–ii–V, I–VI7–II7–V7, and the tritone turnaround I–flat III7–flat VI7–flat II7.', he: 'טרנאראונדים הם המקום שבו נולדים קווים: I–vi–ii–V, ‏I–VI7–II7–V7, וטרנאראונד הטריטון I–♭III7–♭VI7–♭II7.' },
      },
      {
        say: { en: 'The bridge of rhythm changes is four dominants, two bars each, down by 5ths. Aim at the 3rd of each one.', he: 'הגשר של ריתם צ׳יינג׳ס הוא ארבע דומיננטות, שתי תיבות כל אחת, בירידה בקווינטות. כוונו לטרצה של כל אחת.' },
        play: [notes([68, 66, 64], 0.3), notes([61, 59, 57], 0.3), notes([66, 64, 62], 0.3), notes([59, 57, 55], 0.3)],
      },
      {
        say: { en: 'Digital patterns train the hand to find chord tones fast: 1-2-3-5 up from each root, then 7-5-3-1 down, two chords a bar, near the last note.', he: 'תבניות דיגיטליות מאמנות את היד למצוא צלילי אקורד מהר: 1-2-3-5 למעלה מכל שורש, ואז 7-5-3-1 למטה, שני אקורדים בתיבה, קרוב לצליל האחרון.' },
        play: [notes([62, 64, 65, 69, 65, 62, 59, 55], 0.22)],
      },
      {
        say: { en: 'A common mistake is to run the scale from the root on every chord. Start each bar near where the last one ended, and let the line turn at the edges of your range.', he: 'טעות נפוצה היא לרוץ בסולם מהשורש על כל אקורד. התחילו כל תיבה קרוב למקום שבו הקודמת נגמרה, ותנו לקו להסתובב בקצוות של המנעד.' },
      },
      {
        say: { en: 'On the bass, keep the line in one position as long as you can and shift on a chord tone, so the shift never lands on a passing note. On the guitar, the same: shift on the beat.', he: 'בבס, השאירו את הקו בפוזיציה אחת כמה שאפשר והחליפו פוזיציה על צליל אקורד, כך שההחלפה לא נופלת על צליל מעבר. בגיטרה אותו דבר: מחליפים על הפעמה.' },
      },
      {
        say: { en: 'To keep: chord tones on the beats, approach the change, stay near the last note. Then take one form through all twelve keys.', he: 'מה לזכור: צלילי אקורד על הפעמות, גישה להחלפה, להישאר קרוב לצליל האחרון. ואז לקחת צורה אחת דרך כל שנים־עשר הסולמות.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  // keys
  'tech:k-vocab': 'vocab-approach',
  'tech:k-vocab-1': 'vocab-time',
  'tech:k-vocab-4': 'vocab-enclose',
  'tech:k-vocab-5': 'vocab-enclose',
  'tech:k-vocab-6': 'vocab-enclose',
  'tech:k-vocab-7': 'vocab-enclose',
  'tech:k-vocab-8': 'vocab-harris',
  'tech:k-vocab-9': 'vocab-harris',
  'tech:k-vocab-10': 'vocab-time',
  // guitar
  'tech:g-bebop': 'vocab-lines',
  'tech:g-bebop-1': 'vocab-time',
  'tech:g-bebop-2': 'vocab-approach',
  'tech:g-bebop-3': 'vocab-enclose',
  'tech:g-bebop-4': 'vocab-enclose',
  'tech:g-bebop-5': 'vocab-enclose',
  'tech:g-bebop-10': 'vocab-harris',
  'tech:g-bebop-11': 'vocab-harris',
  'tech:g-bebop-12': 'vocab-time',
  // bass
  'tech:b-bebop': 'vocab-lines',
  'tech:b-bebop-1': 'vocab-enclose',
  'tech:b-bebop-2': 'vocab-enclose',
  'tech:b-bebop-7': 'vocab-harris',
};

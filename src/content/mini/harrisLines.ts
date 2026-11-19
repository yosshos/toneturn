// Barry Harris lines (docs/research/BARRY-HARRIS-METHOD.md Part D): the quick lessons before the k-harrisline,
// g-harrisline and b-harrisline levels and the bh-line-ear topic. Every example is built by src/engine/harrisLines.ts
// (sources cited there). Harris's terms: "the important minor", "extra note rules", "scale outline", "the related
// diminished". See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { gated, gatedOr, isVerified } from '../../engine/verifiedContent';
import { arpIntoScale, chromaticScale, importantArps, lick5432, phrase5432, scaleOutline, sevenDownLine, OUTLINES, threeToFlatNine } from '../../engine/harrisLines';
import { HL_LEVEL_IDS, HL_ROWS } from '../../engine/drills/harrisLineDrills';

const notes = (midis: number[], each = 0.27): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.35): Stimulus => ({ kind: 'rest', duration: d });
const ps = (l: { p: number }[]) => l.map((n) => n.p);

const CHROM_UP = ps(chromaticScale(60, 'maj', 'up').line);
const CHROM_DOWN = ps(chromaticScale(60, 'maj', 'down').line);
const CHROM_DOM = ps(chromaticScale(60, 'dom', 'up').line);
const C7 = [48, 52, 55, 58];

export const LESSONS: MiniLesson[] = [
  {
    id: 'bh-chromatic',
    area: 'jazz',
    emoji: '♯',
    title: { en: "Barry Harris: the chromatic scale", he: 'בארי האריס: הסולם הכרומטי' },
    takeaway: {
      en: 'Scale degrees on the beats, a chromatic note between. At a half step, skip to the note above and come back: C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C.',
      he: 'דרגות הסולם על הפעמות, צליל כרומטי ביניהן. בחצי טון מדלגים לצליל שמעל וחוזרים: C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C.',
    },
    steps: [
      {
        say: { en: 'Barry’s chromatic scale keeps every scale degree on a beat. Between two degrees a whole step apart goes the chromatic note.', he: 'בסולם הכרומטי של בארי כל דרגה של הסולם נמצאת על פעמה. בין שתי דרגות שרחוקות טון שלם בא הצליל הכרומטי.' },
        play: [notes(CHROM_UP.slice(0, 5))],
        show: { notes: CHROM_UP.slice(0, 5), key: 'C', text: { en: 'C C♯ D D♯ E', he: 'C C♯ D D♯ E' } },
      },
      {
        say: { en: 'From E to F there is no note between. So skip up to G, and come back to F: the skip-back keeps F on the beat.', he: 'בין מי לפה אין צליל באמצע. לכן מדלגים לסול וחוזרים לפה: הדילוג חזרה שומר את פה על הפעמה.' },
        play: [notes(CHROM_UP.slice(3, 9))],
        show: { notes: CHROM_UP.slice(3, 9), key: 'C', text: { en: 'E G F', he: 'E G F' } },
      },
      {
        say: { en: 'The whole octave up: the same skip from B to C, through D.', he: 'כל האוקטבה למעלה: אותו דילוג מסי לדו, דרך רה.' },
        play: [notes(CHROM_UP)],
        show: { notes: CHROM_UP, key: 'C', text: { en: 'C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C', he: 'C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C' } },
      },
      {
        say: { en: 'On a dominant the half step moves: from A to B flat, skip to C and come back.', he: 'על דומיננט חצי הטון זז: מלה לסי במול, מדלגים לדו וחוזרים.' },
        play: [chord(C7, 0.8), notes(CHROM_DOM)],
        show: { text: { en: 'C7: … A C B♭ B C', he: 'C7: … A C B♭ B C' } },
      },
      {
        say: { en: 'Practise it in all twelve keys: free time first, then on the click, with every scale degree landing on the beat. Your turn.', he: 'מתרגלים בכל שנים־עשר הסולמות: קודם בזמן חופשי, אחר כך עם הקליק, וכל דרגה של הסולם נוחתת על הפעמה. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: in eighths, every whole step takes two notes, so the degrees stay on the beats. A half step takes only one, so the skip adds the missing note.', he: 'למה זה עובד: בשמיניות כל טון שלם לוקח שני צלילים, ולכן הדרגות נשארות על הפעמות. חצי טון לוקח רק צליל אחד, והדילוג מוסיף את הצליל החסר.' },
        show: { text: { en: 'whole step = 2 notes · half step = skip + back', he: 'טון שלם = 2 צלילים · חצי טון = דילוג וחזרה' } },
      },
      {
        say: { en: 'How to hear it: tap the beat and listen for the scale on the taps. The skip sounds like a little turn just before the 4th and before the octave.', he: 'איך שומעים: הקישו את הפעמה והקשיבו לסולם על ההקשות. הדילוג נשמע כמו סיבוב קטן ממש לפני הרביעית ולפני האוקטבה.' },
        play: [notes(CHROM_UP.slice(3, 9)), rest(), notes(CHROM_UP.slice(11))],
      },
      {
        say: { en: 'Coming down, the same rule: at a half step go to the scale note below and come back up. The scale’s own notes stay on the beats.', he: 'בירידה, אותו חוק: בחצי טון יורדים לצליל הסולם שמתחת וחוזרים למעלה. הצלילים של הסולם נשארים על הפעמות.' },
        play: [notes(CHROM_DOWN)],
        show: { notes: CHROM_DOWN, key: 'C', text: { en: 'C A B B♭ A …', he: 'C A B B♭ A …' } },
      },
      {
        say: { en: 'It works on the minor 6th-diminished scale too, with four skips. A common slip is to rush the skip: keep the eighths even.', he: 'זה עובד גם על סולם המינור שישית־מוקטן, עם ארבעה דילוגים. טעות נפוצה היא למהר בדילוג: שמרו על שמיניות שוות.' },
        play: [notes(ps(chromaticScale(60, 'm6dim', 'up').line))],
      },
      ...gated('bh-chrom2', {
        say: { en: 'Then two voices: the same chromatic scale with a second voice a 3rd, a 6th or a 10th below, both moving together. Later, every other interval.', he: 'ואחר כך שני קולות: אותו סולם כרומטי עם קול שני טרצה, סקסטה או דצימה מתחת, ושניהם זזים יחד. אחר כך, כל שאר המרווחים.' },
      }),
      {
        say: { en: 'To keep: degrees on the beats, chromatic notes between, and at a half step skip past and come back.', he: 'לזכור: דרגות על הפעמות, צלילים כרומטיים ביניהן, ובחצי טון מדלגים הלאה וחוזרים.' },
      },
    ],
  },
  {
    id: 'bh-line-devices',
    area: 'jazz',
    emoji: '♭',
    title: { en: 'Barry Harris: line devices', he: 'בארי האריס: כלים לקו' },
    // Hidden until verified (verifiedContent.ts): the takeaway names only what is on show.
    takeaway: isVerified('card:bh-5432') && isVerified('card:bh-sevendown') && isVerified('card:bh-3b9')
      ? {
      en: 'A scale outline gives each bar its scale, up from the root. On a dominant: the three important arpeggios, the 5-4-3-2 phrases, 3 to ♭9, and seven down to the 3rd.',
      he: 'מתאר סולמות נותן לכל תיבה את הסולם שלה, מהשורש למעלה. על דומיננט: שלושת הארפג׳ים החשובים, משפטי 5-4-3-2, ‏3 עד ♭9, ושבע למטה לטרצה.',
    }
      : {
          en: 'A scale outline gives each bar its scale, up from the root. On a dominant: the three important arpeggios, then the scale down by the rule.',
          he: 'מתאר סולמות נותן לכל תיבה את הסולם שלה, מהשורש למעלה. על דומיננט: שלושת הארפג׳ים החשובים, ואז הסולם למטה לפי החוק.',
        },
    steps: [
      {
        say: { en: 'The scale outline of a tune: each bar its scale from the root up, chord tones on the beats. A chord that lasts two bars comes back down.', he: 'מתאר הסולמות של שיר: בכל תיבה הסולם שלה מהשורש למעלה, צלילי אקורד על הפעמות. אקורד שנמשך שתי תיבות חוזר למטה.' },
        play: [notes(ps(scaleOutline(0, OUTLINES.indiana.chords.slice(0, 2), 55).line))],
        show: { text: { en: 'C6 up | C6 down', he: 'C6 למעלה | C6 למטה' } },
      },
      {
        say: { en: 'On C7, the three important arpeggios: on 1, the minor on 5, the major on flat 7. Each one 1, 3, 5, 8.', he: 'על C7, שלושת הארפג׳ים החשובים: על 1, המינור על 5, המז׳ור על ♭7. כל אחד 1, ‏3, ‏5, ‏8.' },
        play: [chord(C7, 0.7), notes(ps(importantArps(60, 'up')))],
        show: { text: { en: 'C E G C · G B♭ D G · B♭ D F B♭', he: 'C E G C · G B♭ D G · B♭ D F B♭' } },
      },
      ...gatedOr('bh-5432', {
        say: { en: 'The 5-4-3-2 phrases, from Workbook 1. Here the 5 and the 3 on C7.', he: 'משפטי 5-4-3-2, מחוברת 1. הנה ה־5 וה־3 על C7.' },
        play: [notes(ps(phrase5432(60, 'dom', 5))), rest(), notes(ps(phrase5432(60, 'dom', 3)))],
        show: { text: { en: 'G B C F E · E G B♭ D', he: 'G B C F E · E G B♭ D' } },
      }, [
        {
          say: { en: 'Then an arpeggio into the scale: C7’s arpeggio up, then the scale down by the rule from the next chord tone, so the chord tones stay on the beats.', he: 'ואז ארפג׳ אל הסולם: הארפג׳ של C7 למעלה, ואז הסולם למטה לפי החוק מצליל האקורד הבא, כך שצלילי האקורד נשארים על הפעמות.' },
          play: [notes(ps(arpIntoScale(60, 0)))],
          show: { text: { en: 'C E G C · E D C B B♭ A G F E', he: 'C E G C · E D C B B♭ A G F E' } },
        },
      ]),
      ...gatedOr('bh-sevendown', {
        say: { en: 'Seven down to the 3rd: over D half-diminished to G7, play B flat 7 up, then down from its 7th, landing on B.', he: 'שבע למטה לטרצה: מעל רה חצי־מוקטן אל G7, מנגנים B♭7 למעלה, ואז למטה מהספטימה שלו, ונוחתים על סי.' },
        play: [notes(ps(sevenDownLine(60, 'full')))],
        show: { text: { en: 'B♭ … A♭ | A♭ G F E♭ D C B → C', he: 'B♭ … A♭ | A♭ G F E♭ D C B → C' } },
      }, [
        {
          say: { en: '3 to 9 on C7: from the 3rd up to the 9th, E G B flat D. It is the minor 7 flat 5 inside the dominant, and it lands on the 9th.', he: '3 עד 9 על C7: מהטרצה עד הנונה, E G B♭ D. זה המינור 7♭5 שבתוך הדומיננט, והוא נוחת על הנונה.' },
          play: [chord(C7, 0.7), notes([64, 67, 70, 74])],
          show: { notes: [64, 67, 70, 74], key: 'F', text: { en: 'E G B♭ D', he: 'E G B♭ D' } },
        },
      ]),
      {
        say: { en: 'Learn each device in all twelve keys, then put it into a scale outline. Your turn.', he: 'לומדים כל כלי בכל שנים־עשר הסולמות, ואז שמים אותו בתוך מתאר סולמות. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'An arpeggio up, then the scale down by the rule from the next chord tone: C E G C, then E D C B B flat A G F E.', he: 'ארפג׳ למעלה, ואז הסולם למטה לפי החוק מצליל האקורד הבא: C E G C, ואז E D C B B♭ A G F E.' },
        play: [notes(ps(arpIntoScale(60, 0)))],
      },
      ...gatedOr('bh-3b9', {
        say: { en: '3 to flat 9 over the family: G7, B flat 7, D flat 7 and E7 all share the same four notes, the diminished on the 3rd.', he: '3 עד ♭9 על המשפחה: G7, ‏B♭7, ‏D♭7 ו־E7 חולקים את אותם ארבעה צלילים, המוקטן על הטרצה.' },
        play: [notes(ps(threeToFlatNine(60, 'up').line))],
      }, [
        {
          say: { en: 'The three important arpeggios can also start from their 3rd. The same three chords, on 1, the minor on 5 and the major on flat 7, but the line moves in smaller leaps.', he: 'שלושת הארפג׳ים החשובים יכולים להתחיל גם מהטרצה שלהם. אותם שלושה אקורדים, על 1, המינור על 5 והמז׳ור על ♭7, אבל הקו זז בקפיצות קטנות יותר.' },
          play: [notes(ps(importantArps(60, 'inv')))],
        },
      ]),
      ...gatedOr('bh-lick', {
        say: { en: 'The combined 5-4-3-2 lick. The exact notes come from a workshop attendee’s notes and wait for a check against the workbook.', he: 'הליק 5-4-3-2 המשולב. הצלילים המדויקים באים מרשימות של משתתף בסדנה, ומחכים לבדיקה מול החוברת.' },
        play: [notes(ps(lick5432(55)))],
      }, [
        {
          say: { en: 'The dominant rule in one breath: from 1, 3, 5 or flat 7 add one half step, or three; from 2, 4 or 6 add none, or two. Then the chord tones land on the beats.', he: 'חוק הדומיננט בנשימה אחת: מ־1, 3, 5 או ♭7 מוסיפים חצי טון אחד, או שלושה; מ־2, 4 או 6 אף אחד, או שניים. ואז צלילי האקורד נוחתים על הפעמות.' },
          play: [notes([72, 71, 70, 69, 67, 65, 64, 62])],
        },
      ]),
      ...gatedOr('parks-eight', {
        say: { en: 'The dominant rule from every degree: start on each degree in turn, on the beat, and come down the scale. From 1, 3, 5 or flat 7 add one half step; from 3, 5 or flat 7 you may add three; from 2, 4 or 6 add none, or two.', he: 'חוק הדומיננט מכל דרגה: מתחילים מכל דרגה בתורה, על הפעמה, ויורדים בסולם. מ־1, 3, 5 או ♭7 מוסיפים חצי טון אחד; מ־3, 5 או ♭7 אפשר גם שלושה; מ־2, 4 או 6 אף אחד, או שניים.' },
      }, [
        {
          say: { en: 'Practise each device round the cycle of fourths: C7, F7, B flat 7, and on through all twelve keys. Free time first, then the click, then a whole tune.', he: 'מתרגלים כל כלי לפי מעגל הקוורטות: C7, ‏F7, ‏B♭7, וכך הלאה בכל שנים־עשר הסולמות. קודם בזמן חופשי, אחר כך עם הקליק, ואז שיר שלם.' },
        },
      ]),
      {
        say: { en: 'A common slip in an outline: playing Dm7’s own scale over ii. Barry says ii is V: over Dm7 to G7, play the G7 scale. A half-diminished chord becomes the dominant a major 3rd below it.', he: 'טעות נפוצה במתאר: לנגן את הסולם של Dm7 מעל ה־ii. בארי אומר ש־ii הוא V: מעל Dm7 אל G7, מנגנים את הסולם של G7. אקורד חצי־מוקטן הופך לדומיננט שנמצא טרצה גדולה מתחתיו.' },
      },
    ],
  },
  {
    id: 'bh-upbeats',
    area: 'jazz',
    emoji: '&',
    title: isVerified('card:bh-compose') ? { en: 'Barry Harris: the upbeat, and your own line', he: 'בארי האריס: הקצב החלש, והקו שלכם' } : { en: 'Barry Harris: the upbeat', he: 'בארי האריס: הקצב החלש' },
    takeaway: isVerified('card:bh-compose')
      ? {
      en: 'Feel the "and": comp on 2+ and 4+, push the bass onto the "and" of 4. Then write your own line over a move, a chord tone on every beat, and use it in a tune.',
      he: 'להרגיש את ה"וְ": ללוות על 2+ ו־4+, לדחוף את הבס ל"וְ" של 4. ואז לכתוב קו משלכם מעל מהלך, צליל אקורד על כל פעמה, ולהשתמש בו בשיר.',
    }
      : {
          en: 'Feel the "and": comp on 2+ and 4+, push the bass onto the "and" of 4.',
          he: 'להרגיש את ה"וְ": ללוות על 2+ ו־4+, לדחוף את הבס ל"וְ" של 4.',
        },
    steps: [
      {
        say: { en: 'Barry taught feeling the "and". Comp a short chord on the "and" of 2 and of 4, and let the drums keep the beat.', he: 'בארי לימד להרגיש את ה"וְ". מלווים באקורד קצר על ה"וְ" של 2 ושל 4, והתופים שומרים על הפעמה.' },
        play: [rest(0.3), chord(C7, 0.2), rest(0.4), chord(C7, 0.2)],
        show: { text: { en: '1 & 2 [&] 3 & 4 [&]', he: '1 & 2 [&] 3 & 4 [&]' } },
      },
      ...gatedOr('bh-feel6', {
        say: { en: 'Feel 6 in 4: a line in dotted quarters floats across the bar line while the band stays in 4.', he: 'להרגיש 6 בתוך 4: קו ברבעים מנוקדים מרחף מעל קו התיבה, והלהקה נשארת בארבע.' },
        play: [notes([60, 64, 67, 70, 72, 70, 67, 64], 0.45)],
      }, [
        {
          say: { en: 'Now hit only the ands: the 3rd of each chord on every and, nothing on the beats, while the drums keep the time.', he: 'עכשיו רק על ה"וְ": הטרצה של כל אקורד על כל "וְ", כלום על הפעמות, והתופים שומרים על הזמן.' },
          play: [rest(0.3), notes([64], 0.3), rest(0.3), notes([64], 0.3), rest(0.3), notes([65], 0.3), rest(0.3), notes([65], 0.3)],
          show: { text: { en: '1 [&] 2 [&] 3 [&] 4 [&]', he: '1 [&] 2 [&] 3 [&] 4 [&]' } },
        },
      ]),
      ...gatedOr('bh-compose', {
        say: { en: 'Then compose: over I to VI7, or ii–V–I, write a line with a chord tone on every beat, scale or chromatic notes between. Play it twice, then in a tune.', he: 'ואז מחברים: מעל I אל VI7, או ii–V–I, כותבים קו עם צליל אקורד על כל פעמה, צלילי סולם או כרומטיים ביניהם. מנגנים אותו פעמיים, ואז בתוך שיר.' },
        play: [notes([76, 74, 72, 71, 69, 70, 73, 74], 0.3)],
        show: { text: { en: 'C6 | A7 | Dm7 G7 | C6', he: 'C6 | A7 | Dm7 G7 | C6' } },
      }, [
        {
          say: { en: 'Move the same short chord to the and of 1 and the and of 4. A new place in the bar, and the next beat stays clear.', he: 'מזיזים את אותו אקורד קצר אל ה"וְ" של 1 ושל 4. מקום חדש בתיבה, והפעמה הבאה נשארת נקייה.' },
          play: [rest(0.15), chord(C7, 0.2), rest(0.85), chord(C7, 0.2)],
          show: { text: { en: '1 [&] 2 & 3 & 4 [&]', he: '1 [&] 2 & 3 & 4 [&]' } },
        },
      ]),
      {
        say: { en: 'The bass feels it too: push the next root onto the and of 4 and tie it over the bar line.', he: 'גם הבס מרגיש את זה: דוחפים את השורש הבא אל ה״וְ״ של 4 וקושרים אותו מעבר לקו התיבה.' },
        play: [notes([36, 40, 43, 41], 0.45), chord([41], 1)],
      },
      {
        say: { en: 'Every take is measured against the click, in all twelve keys. Your turn.', he: 'כל ניסיון נמדד מול הקליק, בכל שנים־עשר הסולמות. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Barry said rhythm rules the world. Dance taught him to feel the and: the off-beat is where swing lives.', he: 'בארי אמר שהקצב שולט בעולם. הריקוד לימד אותו להרגיש את ה״וְ״: הפעמה החלשה היא המקום שבו הסווינג חי.' },
      },
      {
        say: { en: 'Try the game: hit only the ands, the 3rd of each chord, while the drums keep the beat. A common slip is to drift onto the beat when the line gets busy; count the ands out loud.', he: 'נסו את המשחק: רק על ה״וְ״, הטרצה של כל אקורד, והתופים שומרים על הפעמה. טעות נפוצה היא לגלוש לפעמה כשהקו נעשה עמוס; ספרו את ה״וְ״ בקול.' },
        play: [rest(0.3), notes([64], 0.3), rest(0.3), notes([64], 0.3), rest(0.3), notes([65], 0.3), rest(0.3), notes([65], 0.3)],
      },
      ...gatedOr('bh-feel6', {
        say: { en: 'Feel 6 in 4 also comes in cells of three eighths. Each cell starts on a chord tone, and the cells keep crossing the bar line.', he: 'להרגיש 6 בתוך 4 בא גם בתאים של שלוש שמיניות. כל תא מתחיל בצליל אקורד, והתאים חוצים את קו התיבה.' },
        play: [notes([60, 62, 64, 67, 65, 64, 70, 69, 67], 0.25)],
      }, [
        {
          say: { en: 'Count out loud, one and two and, and clap only on the and. When that is easy, play the chord there and let the metronome take the beats. Then move it around the bar.', he: 'סופרים בקול, אחת וְ שתיים וְ, ומוחאים רק על ה"וְ". כשזה קל, מנגנים שם את האקורד ונותנים למטרונום את הפעמות. אחר כך מזיזים אותו בתוך התיבה.' },
        },
      ]),
      ...gatedOr('bh-compose', {
        say: { en: 'Composing a line: pick a chord tone for every beat first, then fill the eighths between with scale notes or a half step.', he: 'לחבר קו: קודם בוחרים צליל אקורד לכל פעמה, ואז ממלאים את השמיניות ביניהם בצלילי סולם או בחצי טון.' },
      }, [
        {
          say: { en: 'The bass walks on the beats but leans into the next bar: the next root on the and of 4, tied over the bar line. The band still meets on the downbeat.', he: 'הבס הולך על הפעמות אבל נשען אל התיבה הבאה: השורש הבא על ה"וְ" של 4, קשור מעל קו התיבה. הלהקה עדיין נפגשת על הפעמה הראשונה.' },
          play: [notes([36, 40, 43, 41], 0.45), chord([41], 1)],
        },
      ]),
      ...gatedOr('bh-compose', {
        say: { en: 'Then use it in a tune. Rhythm changes repeat I to VI7 and ii–V, so your line has many places to go. Harris and Rees had students write a line once and play it in every tune that has the same move, in every key.', he: 'ואז משתמשים בו בשיר. בריתם צ׳יינג׳ס חוזרים I אל VI7 ו־ii–V, כך שלקו שלכם יש הרבה מקומות. האריס וריס ביקשו מתלמידים לכתוב קו פעם אחת ולנגן אותו בכל שיר שיש בו את המהלך.' },
      }, [
        {
          say: { en: 'A chord on the and sounds lighter than one on the beat. Keep the comp short and soft, so the soloist has room and the time feels wide.', he: 'אקורד על ה"וְ" נשמע קל יותר מאקורד על הפעמה. שומרים את הליווי קצר ושקט, כדי שלסולן יהיה מקום והזמן ירגיש רחב.' },
        },
      ]),
    ],
  },
];

/** The lesson each level opens with (App.tsx gate: "tech:<level id>"), by its kind. */
const KIND_LESSON = (kind: string): string => (['hl-upbeat', 'hl-ands', 'hl-feel6', 'hl-walkties', 'hl-compose'].includes(kind) ? 'bh-upbeats' : kind === 'hl-chrom' ? CHROM : ['hl-rules', 'hl-triplet', 'hl-misc'].includes(kind) ? 'bh-lines' : 'bh-line-devices');
/** The chromatic-scale lesson, or (while it is hidden until verified) the line-devices lesson. */
const CHROM = isVerified('lesson:bh-chromatic') ? 'bh-chromatic' : 'bh-line-devices';
export const UNITS: Record<string, string> = {
  'topic:bh-line-ear': CHROM,
  'tech:k-harrisline': CHROM,
  'tech:g-harrisline': CHROM,
  'tech:b-harrisline': CHROM,
  ...Object.fromEntries(HL_LEVEL_IDS.keys.map((id, i) => [`tech:${id}`, KIND_LESSON(HL_ROWS[i].kind)])),
  'tech:g-harrisline-1': CHROM,
  'tech:b-harrisline-1': CHROM,
  ...Object.fromEntries(['g', 'b'].flatMap((x) => [2, 3, 5, 6].map((n) => [`tech:${x}-harrisline-${n}`, 'bh-line-devices']))),
  ...Object.fromEntries(['g', 'b'].flatMap((x) => [4, 7].map((n) => [`tech:${x}-harrisline-${n}`, 'bh-lines']))),
  ...Object.fromEntries(['g', 'b'].flatMap((x) => [8, 9].map((n) => [`tech:${x}-harrisline-${n}`, 'bh-upbeats']))),
  ...Object.fromEntries(['g', 'b'].map((x) => [`tech:${x}-harrisline-10`, 'bh-line-devices'])),
};

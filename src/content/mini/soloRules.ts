// Improvising with the drilled vocabulary (docs/AUDIT-DEPTH-3.md C5, C6, C7): quick lessons before the keys family
// k-solo, the guitar family g-solo and the bass family b-solo. Every fact matches src/engine/ruleCards.ts,
// src/engine/drills/soloDrills.ts and src/engine/soloChorus.ts. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.28): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

const DM7 = [50, 60, 65, 69];
const G7 = [43, 59, 65, 67];
const CMAJ7 = [48, 59, 64, 67];

export const LESSONS: MiniLesson[] = [
  {
    id: 'solo-rules',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Improvising by rule cards', he: 'אלתור לפי כרטיסי כללים' },
    takeaway: { en: 'You improvise; each rule card checks one thing in what you play: a guide tone on each change, an approach, Barry Harris’s rules, an enclosure, a pivot.', he: 'אתם מאלתרים; כל כרטיס כלל בודק דבר אחד במה שאתם מנגנים: צליל מנחה בכל החלפה, גישה, החוקים של בארי האריס, כיתור, פיבוט.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here nothing is written. You improvise over the form, and the cards say what must be in your line.', he: 'היי {name}! כאן שום דבר לא כתוב. אתם מאלתרים על הצורה, והכרטיסים אומרים מה חייב להיות בקו שלכם.' },
        play: [chord(DM7, 0.8), chord(G7, 0.8), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'Guide tone on each change: on beat 1 of every new chord, its 3rd or 7th. F over D minor, B over G7, E over C.', he: 'צליל מנחה בכל החלפה: בפעמה 1 של כל אקורד חדש, הטרצה או הספטימה שלו. פה מעל רה מינור, סי מעל G7, מי מעל דו.' },
        play: [chord(DM7, 0.5), notes([65], 0.5), chord(G7, 0.5), notes([59], 0.5), chord(CMAJ7, 0.5), notes([64], 0.6)],
        show: { notes: [65, 59, 64], text: { en: '3rds on beat 1', he: 'טרצות בפעמה 1' } },
      },
      {
        say: { en: 'Approach each chord: the first chord tone of a new chord comes from a half step away.', he: 'גישה לכל אקורד: צליל האקורד הראשון של אקורד חדש מגיע מחצי טון.' },
        play: [chord(G7, 0.5), notes([58, 59], 0.3), chord(CMAJ7, 0.5), notes([63, 64], 0.3)],
        show: { notes: [63, 64], text: { en: '½ step → chord tone', he: '½ טון ← צליל אקורד' } },
      },
      {
        say: { en: 'Barry Harris’s rules: chord tones on the beats, scale tones between, or a half step into the next note.', he: 'החוקים של בארי האריס: צלילי אקורד על הפעמות, צלילי סולם ביניהם, או חצי טון אל הצליל הבא.' },
        play: [chord(G7, 0.6), notes([67, 65, 65, 64, 62, 60, 59, 57], 0.22)],
      },
      {
        say: { en: 'Your turn. The band plays the form; the result shows each card with how many times you kept it. Start slow.', he: 'תורכם. הלהקה מנגנת את הצורה; התוצאה מראה כל כרטיס וכמה פעמים שמרתם עליו. מתחילים לאט.' },
      },
    ],
    more: [
      {
        say: { en: 'Enclosure cards ask for one type at least once every four bars: above then below, below then above, the scale step above, the bebop enclosure, the delayed resolution.', he: 'כרטיסי כיתור מבקשים סוג אחד לפחות פעם בכל ארבע תיבות: מעל ואז מתחת, מתחת ואז מעל, צעד הסולם מעל, כיתור הביבופ, הפתרון המושהה.' },
        play: [chord(CMAJ7, 0.6), notes([65, 63, 64], 0.3), rest(), notes([62, 63, 61, 62], 0.25)],
      },
      {
        say: { en: 'The pivot card: a chord tone on top, a drop of a 6th to the next chord tone, then the climb. C, E, G, B.', he: 'כרטיס הפיבוט: צליל אקורד למעלה, ירידה של סקסטה לצליל האקורד הבא, ואז טיפוס. דו, מי, סול, סי.' },
        play: [chord(CMAJ7, 0.6), notes([72, 64, 67, 71], 0.3)],
      },
      {
        say: { en: 'The lick card listens for one of the licks of the library, in any key, over the chord it belongs to. Learn it in the lick trainer first, then bring it here.', he: 'כרטיס הליק מאזין לאחד הליקים מהספרייה, בכל סולם, מעל האקורד שלו. לומדים אותו קודם במאמן הליקים, ואז מביאים אותו לכאן.' },
      },
      {
        say: { en: 'Triad pairs and superimposed pentatonics change the colour: over C major 7, D and E minor triads give the lydian sound; G major pentatonic sounds 5, 6, 7, 9 and 3.', he: 'זוגות משולשים ופנטטוניות מונחות משנים את הצבע: מעל Cmaj7, המשולשים רה ומי מינור נותנים את הסאונד הלידי; פנטטוני סול מז׳ור נשמע 5, 6, 7, 9 ו־3.' },
        play: [chord(CMAJ7, 0.6), notes([62, 66, 69, 64, 67, 71], 0.22)],
      },
      {
        say: { en: 'A card is kept when enough of your notes obey it: most cards ask for four in five, the enclosures and the pivot for three of every four windows of four bars.', he: 'כרטיס נשמר כשמספיק צלילים שלכם מצייתים לו: רוב הכרטיסים מבקשים ארבעה מתוך חמישה, הכיתורים והפיבוט שלושה מכל ארבעה חלונות של ארבע תיבות.' },
      },
      {
        say: { en: 'Keep the line inside the changes too: every note in the chord’s scale, or a half step into the next note. And play in every bar, at least two notes.', he: 'שמרו גם שהקו יישאר בתוך המהלך: כל צליל בסולם של האקורד, או חצי טון אל הצליל הבא. ונגנו בכל תיבה, לפחות שני צלילים.' },
      },
    ],
  },
  {
    id: 'solo-duo',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Comp and solo on one instrument', he: 'ללוות ולאלתר על כלי אחד' },
    takeaway: { en: 'Piano: the left hand comps written shells or rootless voicings, the right hand improvises under the cards. Guitar: a bar of chords, a bar of line. Bass: a bar of walking, a bar of fill.', he: 'פסנתר: יד שמאל מלווה בשלדים או בקולות בלי יסוד, יד ימין מאלתרת לפי הכרטיסים. גיטרה: תיבת אקורדים, תיבת קו. בס: תיבת הליכה, תיבת מילוי.' },
    steps: [
      {
        say: { en: 'Hi {name}! Now you are the band and the soloist. The comping is written and graded note for note.', he: 'היי {name}! עכשיו אתם גם הלהקה וגם הסולן. הליווי כתוב ונבדק צליל אחר צליל.' },
        play: [chord([43, 53, 59], 0.8), chord([48, 52, 59], 1)],
      },
      {
        say: { en: 'On the piano the split is middle C: everything above it is your line, checked by the cards.', he: 'בפסנתר החלוקה היא דו האמצעי: כל מה שמעליו הוא הקו שלכם, והכרטיסים בודקים אותו.' },
        play: [chord([43, 53, 59], 0.6), notes([65, 64, 62, 59], 0.25)],
      },
      {
        say: { en: 'Shells are the root with the 3rd or the 7th; rootless voicings leave the root to the bass and keep 3, 5, 7 and 9.', he: 'שלדים הם היסוד עם הטרצה או הספטימה; קולות בלי יסוד משאירים את היסוד לבס ושומרים 3, 5, 7 ו־9.' },
        play: [chord([43, 53, 59], 0.7), rest(0.2), chord([53, 57, 59, 64], 0.9)],
      },
      {
        say: { en: 'On guitar and bass the bars take turns: comp or walk one bar, play a line the next. The comping bars are written; the line bars are yours.', he: 'בגיטרה ובבס התיבות מתחלפות: ליווי או הליכה בתיבה אחת, קו בתיבה הבאה. תיבות הליווי כתובות; תיבות הקו שלכם.' },
        play: [chord([43, 53, 59], 0.6), notes([62, 64, 65, 67], 0.22)],
      },
      {
        say: { en: 'Your turn. Start slower than you think: the left hand must not wait for the right.', he: 'תורכם. התחילו לאט יותר ממה שנראה לכם: יד שמאל לא מחכה ליד ימין.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it matters: alone on the bandstand, a pianist or guitarist is the whole rhythm section. The comping keeps the form; the line tells the story.', he: 'למה זה חשוב: לבד על הבמה, פסנתרן או גיטריסט הם כל חטיבת הקצב. הליווי שומר על הצורה; הקו מספר את הסיפור.' },
      },
      {
        say: { en: 'Keep the comping short and low: a hit on each chord, under middle C, so it never covers the line.', he: 'שמרו על ליווי קצר ונמוך: מכה על כל אקורד, מתחת לדו האמצעי, כדי שלא יכסה את הקו.' },
        play: [chord([43, 53, 59], 0.4), rest(0.3), chord([48, 52, 59], 0.4)],
      },
      {
        say: { en: 'Let the line breathe where the comping moves: a new chord in the left hand is a good moment for a guide tone in the right.', he: 'תנו לקו לנשום איפה שהליווי זז: אקורד חדש ביד שמאל הוא רגע טוב לצליל מנחה ביד ימין.' },
        play: [chord([43, 53, 59], 0.4), notes([65], 0.4), chord([48, 52, 59], 0.4), notes([64], 0.5)],
      },
      {
        say: { en: 'On guitar, change position as little as you can between the chord bar and the line bar: the line starts where the chord shape lies.', he: 'בגיטרה, החליפו תנוחה כמה שפחות בין תיבת האקורד לתיבת הקו: הקו מתחיל איפה שצורת האקורד נמצאת.' },
      },
      {
        say: { en: 'On bass, the fill ends on a chord tone of the next bar’s chord, so the walk that follows starts at home.', he: 'בבס, המילוי נגמר על צליל אקורד של האקורד בתיבה הבאה, כך שההליכה שאחריו מתחילה בבית.' },
      },
      {
        say: { en: 'How it is graded: the written comping is checked note for note, like any voicing drill. Your line is checked by the level’s cards, and each card shows how many times you kept it, so you can see which part slipped when the tempo went up.', he: 'איך זה נבדק: הליווי הכתוב נבדק צליל אחר צליל, כמו כל תרגיל קולות. הקו שלכם נבדק לפי הכרטיסים של הרמה, וכל כרטיס מראה כמה פעמים שמרתם עליו, כך שרואים איזה חלק החליק כשהטמפו עלה.' },
      },
    ],
  },
  {
    id: 'solo-chorus',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Write and play a solo chorus', he: 'לכתוב ולנגן כורוס סולו' },
    takeaway: { en: 'Build a chorus bar by bar from vocabulary cells and licks, check it against the rules, then play it note for note: free time first, then up the tempo ladder, in every key.', he: 'בונים כורוס תיבה אחר תיבה מתאי אוצר מילים ומליקים, בודקים אותו מול החוקים, ואז מנגנים אותו צליל אחר צליל: קודם בזמן חופשי, אחר כך בסולם הטמפו, בכל הסולמות.' },
    steps: [
      {
        say: { en: 'Hi {name}! Choose a cell for every bar: arpeggio, scale line, enclosure, guide tones, pivot, approach, a rest, or a lick.', he: 'היי {name}! בחרו תא לכל תיבה: ארפג׳יו, קו סולם, כיתור, צלילים מנחים, פיבוט, גישה, מנוחה, או ליק.' },
      },
      {
        say: { en: 'The check under the grid counts the bars that start on a chord tone and the changes you reach by a step.', he: 'הבדיקה מתחת לרשת סופרת את התיבות שמתחילות בצליל אקורד ואת ההחלפות שמגיעים אליהן בצעד.' },
      },
      {
        say: { en: 'A scale line puts chord tones on the beats and scale tones between them, like this line down over G7.', he: 'קו סולם שם צלילי אקורד על הפעמות וצלילי סולם ביניהם, כמו הקו הזה למטה מעל G7.' },
        play: [chord(G7, 0.6), notes([71, 69, 67, 65, 62, 60, 59, 57], 0.22)],
      },
      {
        say: { en: 'An enclosure aims at the next chord: above, below, then its 3rd on beat 1. A pivot drops from the top note and climbs.', he: 'כיתור מכוון לאקורד הבא: מעל, מתחת, ואז הטרצה שלו בפעמה 1. פיבוט קופץ מהצליל העליון ומטפס.' },
        play: [chord(G7, 0.5), notes([65, 63, 64], 0.25), rest(0.2), chord(CMAJ7, 0.5), notes([72, 64, 67, 71], 0.25)],
      },
      {
        say: { en: 'Save it, then play it: first in free time, the notes only, then in time up the tempo ladder. It moves to every key with the level.', he: 'שמרו, ואז נגנו: קודם בזמן חופשי, רק הצלילים, ואז בזמן בסולם הטמפו. הכורוס עובר לכל הסולמות יחד עם הרמה.' },
        play: [chord(DM7, 0.5), chord(G7, 0.5), chord(CMAJ7, 0.8)],
      },
    ],
    more: [
      {
        say: { en: 'Why write a solo: the vocabulary you drilled becomes a chorus you own. Once it sits, you can improvise the next chorus around it.', he: 'למה לכתוב סולו: אוצר המילים שתרגלתם הופך לכורוס שלכם. כשהוא יושב, אפשר לאלתר את הכורוס הבא סביבו.' },
      },
      {
        say: { en: 'Vary the cells: two scale lines in a row sound like an exercise; an arpeggio, then an enclosure, then space, sounds like a phrase.', he: 'גוונו את התאים: שני קווי סולם ברצף נשמעים כמו תרגיל; ארפג׳יו, ואז כיתור, ואז מרווח, נשמעים כמו משפט.' },
        play: [chord(CMAJ7, 0.5), notes([60, 64, 67, 71], 0.22), notes([66, 64, 65], 0.25)],
      },
      {
        say: { en: 'A rest is a cell too. One empty bar in four lets the band answer and gives the next phrase a start.', he: 'גם מנוחה היא תא. תיבה ריקה אחת מתוך ארבע נותנת ללהקה לענות ונותנת למשפט הבא התחלה.' },
      },
      {
        say: { en: 'Licks borrowed into a bar move to the bar’s chord: a C7 lick becomes an F7 lick in bar 2 of the blues.', he: 'ליקים שמושאלים לתיבה זזים לאקורד שלה: ליק של C7 הופך לליק של F7 בתיבה 2 של הבלוז.' },
        play: [chord([41, 57, 63, 65], 0.6), notes([68, 69, 72, 75], 0.25)],
      },
      {
        say: { en: 'The check is a guide, not a wall: a bar that starts off the chord on purpose, an anticipation, is fine if you hear it.', he: 'הבדיקה היא מדריך, לא חומה: תיבה שמתחילה מחוץ לאקורד בכוונה, הקדמה, בסדר אם אתם שומעים אותה.' },
      },
      {
        say: { en: 'When the chorus sits at tempo in every key, play it once more and then improvise a second chorus right after it, using the same cells. That is how written vocabulary turns into your own playing.', he: 'כשהכורוס יושב בטמפו בכל הסולמות, נגנו אותו עוד פעם ומיד אחריו אלתרו כורוס שני, עם אותם תאים. כך אוצר מילים כתוב הופך לנגינה שלכם.' },
      },
    ],
  },
];

/** The lesson that opens each unit (tech:<family> = its first level, tech:<level id> = one level). */
export const UNITS: Record<string, string> = {
  'tech:k-solo': 'solo-rules',
  'tech:k-solo-11': 'solo-duo',
  'tech:k-solo-12': 'solo-duo',
  'tech:k-solo-13': 'solo-chorus',
  'tech:g-solo': 'solo-rules',
  'tech:g-solo-9': 'solo-duo',
  'tech:g-solo-10': 'solo-chorus',
  'tech:b-solo': 'solo-rules',
  'tech:b-solo-7': 'solo-duo',
  'tech:b-solo-8': 'solo-chorus',
};

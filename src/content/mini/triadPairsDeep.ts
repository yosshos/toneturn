// Triad pairs, deep (owner 2026-11-16): the quick lessons for the k-tpair / g-tpair / b-tpair families, the deeper ear
// levels and the Which Pair? game. Plain words, no teacher named. Every fact matches src/engine/triadPairs.ts and
// tests/triadPairsDeep.test.ts (the pairs, the tone each leaves out, the patterns, the voicings). See ../miniTypes.ts.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.26): Stimulus => ({ kind: 'notes', midis, each });

export const LESSONS: MiniLesson[] = [
  {
    id: 'tpair-deep',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Triad pairs: lines and voicings', he: 'זוגות משולשים: קווים וקולות' },
    takeaway: { en: 'Two triads with no shared note make six notes of a chord scale. Play them as lines (1-3-5, inversions, cells) and as chords (over the root, spread, block).', he: 'שני משולשים בלי צליל משותף הם שישה צלילים של סולם האקורד. מנגנים אותם כקווים (1-3-5, היפוכים, תאים) וכאקורדים (מעל היסוד, פרוש, בלוק).' },
    steps: [
      {
        say: { en: 'Hi {name}! A triad pair is two triads that share no note. Over C minor 7: E flat and F.', he: 'היי {name}! זוג משולשים הוא שני משולשים בלי צליל משותף. מעל דו מינור 7: מי במול ופה.' },
        play: [chord([48, 58], 2.2), chord([63, 67, 70], 0.9), chord([65, 69, 72], 0.9)],
        show: { text: { en: 'E♭ + F / Cm7', he: 'E♭ + F / Cm7' } },
      },
      {
        say: { en: 'Six notes, one left out. Every chord has its pair: G and A minor over C major 7 leave out the 11th; G flat and A flat over C7 altered leave out the 3rd.', he: 'שישה צלילים, אחד בחוץ. לכל אקורד הזוג שלו: סול ולה מינור מעל Cmaj7 משמיטים את ה־11; סול במול ולה במול מעל C7alt משמיטים את הטרצה.' },
        play: [notes([67, 71, 74, 69, 72, 76]), notes([66, 70, 73, 68, 72, 75])],
        show: { text: { en: 'G + Am / Cmaj7 · G♭ + A♭ / C7alt', he: 'G + Am / Cmaj7 · G♭ + A♭ / C7alt' } },
      },
      {
        say: { en: 'As a line: one triad, then the other, each a little higher. Root position first, then 3-5-1 and 5-1-3, then alternating inversions.', he: 'כקו: משולש אחד, ואז השני, כל אחד קצת יותר גבוה. קודם מצב יסודי, אחר כך 3-5-1 ו־5-1-3, ואז היפוכים מתחלפים.' },
        play: [notes([63, 67, 70, 65, 69, 72, 75, 79, 82, 77, 81, 84])],
        show: { text: { en: '1-3-5 · 3-5-1 · 5-1-3', he: '1-3-5 · 3-5-1 · 5-1-3' } },
      },
      {
        say: { en: 'As harmony: the root and 7th in the left hand, the two triads taking turns on top.', he: 'כהרמוניה: היסוד והספטימה ביד שמאל, ושני המשולשים מתחלפים למעלה.' },
        play: [chord([48, 58, 63, 67, 70], 1.1), chord([48, 58, 65, 69, 72], 1.1)],
        show: { notes: [48, 58, 63, 67, 70], chord: true },
      },
      {
        say: { en: 'Your turn: pairs in every key, as lines and as chords, measured on your instrument.', he: 'תורכם: זוגות בכל הסולמות, כקווים וכאקורדים, נמדדים על הכלי שלכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Find the pair by the tone it leaves out. Over a dominant, B flat and C leave out the 13th; G minor and A minor leave out the 11th, the avoid note, so they sound inside.', he: 'מוצאים את הזוג לפי הצליל שהוא משמיט. מעל דומיננט, סי במול ודו משמיטים את ה־13; סול מינור ולה מינור משמיטים את ה־11, הצליל שנמנעים ממנו, ולכן נשמעים פנימיים.' },
        play: [notes([58, 62, 65, 60, 64, 67]), notes([55, 58, 62, 57, 60, 64])],
      },
      {
        say: { en: 'Melodic minor gives strong pairs: F and G over C minor-major, C and D over C7 sharp 11. Harmonic minor gives G and A flat over G7 flat 9.', he: 'המינור המלודי נותן זוגות חזקים: פה וסול מעל דו מינור־מז׳ור, דו ורה מעל C7♯11. המינור ההרמוני נותן סול ולה במול מעל G7♭9.' },
        play: [notes([65, 69, 72, 67, 71, 74]), notes([60, 64, 67, 62, 66, 69])],
      },
      {
        say: { en: 'Intervallic cells: two notes of one triad, two of the other, or each triad open, root, 5th and 10th. The wide leaps are the modern sound.', he: 'תאים אינטרוולים: שני צלילים ממשולש אחד, שניים מהשני, או כל משולש פתוח, יסוד, קווינטה ודצימה. הקפיצות הרחבות הן הצליל המודרני.' },
        play: [notes([63, 67, 65, 69, 70, 75, 72, 77]), notes([63, 70, 79, 65, 72, 81])],
      },
      {
        say: { en: 'Spread voicing: one triad’s root and 5th in the left hand, its 3rd as the 10th, the other triad on top. Block chords: every melody note sits on top of its own triad.', he: 'קול פרוש: היסוד והקווינטה של משולש אחד ביד שמאל, הטרצה שלו כדצימה, והמשולש השני למעלה. אקורדי בלוק: כל צליל של המנגינה יושב מעל המשולש שלו.' },
        play: [chord([41, 48, 57, 63, 67, 70], 1.4), chord([63, 67, 70, 75], 0.7), chord([65, 69, 72, 77], 0.7)],
      },
      {
        say: { en: 'Advanced: slide the pair a half step up for a bar, then back. Outside, then inside: the return makes the tension sound planned.', he: 'מתקדם: מזיזים את הזוג חצי טון למעלה לתיבה, ואז חוזרים. בחוץ, ואז בפנים: החזרה גורמת למתח להישמע מתוכנן.' },
        play: [notes([63, 67, 70, 65, 69, 72]), notes([64, 68, 71, 66, 70, 73]), notes([63, 67, 70, 65, 69, 72])],
      },
      {
        say: { en: 'A common mistake is to run the six notes as a scale all the time. Keep the two shapes audible: three notes, then three.', he: 'טעות נפוצה היא לרוץ על שישת הצלילים כמו סולם כל הזמן. שומרים ששתי הצורות יישמעו: שלושה צלילים, ואז שלושה.' },
      },
      {
        say: { en: 'To keep: two triads, six notes, one tone left out. That tone names the colour.', he: 'מה לזכור: שני משולשים, שישה צלילים, צליל אחד בחוץ. הצליל הזה נותן לצבע את שמו.' },
        show: { text: { en: 'two triads = scale − 1', he: 'שני משולשים = סולם פחות 1' } },
      },
    ],
  },
  {
    id: 'tpair-strings',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Triad pairs on guitar and bass', he: 'זוגות משולשים בגיטרה ובבס' },
    takeaway: { en: 'On three strings each triad is one small shape; the pair is two shapes a step apart. On bass, play the pair as arpeggios through the changes.', he: 'על שלושה מיתרים כל משולש הוא צורה קטנה אחת; הזוג הוא שתי צורות במרחק טון. בבס מנגנים את הזוג כארפג׳יו לאורך המהלך.' },
    steps: [
      {
        say: { en: 'Hi {name}! On strings 3 to 1, a triad is one grip. Over D minor 7, F and G are two grips side by side.', he: 'היי {name}! על מיתרים 3 עד 1, משולש הוא אחיזה אחת. מעל רה מינור 7, פה וסול הן שתי אחיזות זו ליד זו.' },
        play: [chord([57, 60, 65], 0.9), chord([59, 62, 67], 0.9)],
        show: { text: { en: 'F + G / Dm7', he: 'F + G / Dm7' } },
      },
      {
        say: { en: 'Climb the neck: the next inversion of F, then of G, then back down. The same on strings 4 to 2.', he: 'מטפסים על הצוואר: ההיפוך הבא של פה, ואז של סול, ואז חזרה למטה. אותו דבר על מיתרים 4 עד 2.' },
        play: [chord([57, 60, 65], 0.6), chord([59, 62, 67], 0.6), chord([60, 65, 69], 0.6), chord([62, 67, 71], 0.6)],
      },
      {
        say: { en: 'On bass the pair is an arpeggio: F A C, G B D, over the D minor vamp. It outlines the colour without a chord.', he: 'בבס הזוג הוא ארפג׳יו: פה לה דו, סול סי רה, מעל וואמפ של רה מינור. הוא מצייר את הצבע בלי אקורד.' },
        play: [notes([41, 45, 48, 43, 47, 50], 0.3)],
      },
      {
        say: { en: 'As a line on three strings, play one triad, then the other, each group starting a little higher. On guitar the hand moves up the neck as the line climbs.', he: 'כקו על שלושה מיתרים, מנגנים משולש אחד ואז את השני, כל קבוצה מתחילה קצת יותר גבוה. בגיטרה היד זזה במעלה הצוואר כשהקו מטפס.' },
        play: [notes([57, 60, 65, 59, 62, 67, 60, 65, 69, 62, 67, 71], 0.24)],
      },
      {
        say: { en: 'Your turn: shapes, lines and the changes in every key, measured on your instrument.', he: 'תורכם: צורות, קווים ומהלכים בכל הסולמות, נמדדים על הכלי שלכם.' },
      },
    ],
    more: [
      {
        say: { en: 'The same two shapes work on strings 4 to 2. Learn each pair on both string sets so you can stay in one area of the neck.', he: 'אותן שתי צורות עובדות על מיתרים 4 עד 2. לומדים כל זוג על שתי קבוצות המיתרים כדי להישאר באזור אחד של הצוואר.' },
        play: [chord([53, 57, 60], 0.9), chord([55, 59, 62], 0.9)],
      },
      {
        say: { en: 'Comping with a pair: the first triad on beat 1, the second on the "and" of 2, over each chord of a ii–V–I. The bass player has the root, so the shapes can stay small.', he: 'ליווי עם זוג: המשולש הראשון על פעמה 1, השני על ה"וְ" של 2, מעל כל אקורד של ii–V–I. הבסיסט מנגן את היסוד, אז הצורות יכולות להישאר קטנות.' },
        play: [chord([57, 60, 65], 0.6), chord([59, 62, 67], 1.0)],
      },
      {
        say: { en: 'The six notes as a scale in one position give a hexatonic run. Play it slowly first, then keep the triads audible inside it.', he: 'ששת הצלילים כסולם במצב אחד נותנים ריצה הקסטונית. מנגנים לאט קודם, ואז שומרים שהמשולשים יישמעו בתוכה.' },
        play: [notes([53, 55, 57, 59, 60, 62, 65, 67, 69, 71, 72, 74], 0.22)],
      },
      {
        say: { en: 'On bass, change the pair with each chord: over D minor 7 F and G, over G7 the pair of its colour, over C major 7 its own. The line outlines the harmony by itself.', he: 'בבס מחליפים זוג עם כל אקורד: מעל רה מינור 7 פה וסול, מעל G7 הזוג של הצבע שלו, מעל Cmaj7 הזוג שלו. הקו מצייר את ההרמוניה בעצמו.' },
      },
      {
        say: { en: 'Advanced: slide the pair a half step up for one bar, then back. It sounds outside, then resolves inside.', he: 'מתקדם: מזיזים את הזוג חצי טון למעלה לתיבה אחת, ואז חוזרים. זה נשמע בחוץ, ואז נפתר פנימה.' },
        play: [notes([41, 45, 48, 43, 47, 50], 0.26), notes([42, 46, 49, 44, 48, 51], 0.26), notes([41, 45, 48], 0.4)],
      },
      {
        say: { en: 'To keep: two small shapes a step apart, six notes, one tone left out.', he: 'מה לזכור: שתי צורות קטנות במרחק טון, שישה צלילים, צליל אחד בחוץ.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'tech:k-tpair': 'tpair-deep',
  'tech:g-tpair': 'tpair-strings',
  'tech:b-tpair': 'tpair-strings',
  'game:whichpair': 'tpair-deep',
};

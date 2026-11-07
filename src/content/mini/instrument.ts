// Quick lessons for the 0.38 "Your instrument" topics (spec AE §4.1): play it back, the neck, shapes, scales, the
// keys and the fingerboard of the bowed strings. Plain words, sound first.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.4, arpeggio?: boolean): Stimulus => ({ kind: 'chord', midis, duration, ...(arpeggio ? { arpeggio } : {}) });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const C = { letter: 'C' as const, acc: 0 as const };

export const LESSONS: MiniLesson[] = [
  {
    id: 'play-back',
    area: 'play',
    emoji: '🎸',
    title: { en: 'Play it back', he: 'לנגן בחזרה' },
    takeaway: { en: 'Hear it, sing it inside, then find it on your instrument. Start from home: the key comes first, and every note is a step or a leap from there.', he: 'לשמוע, לשיר בפנים, ואז למצוא על הכלי. מתחילים מהבית: קודם הסולם, וכל צליל הוא צעד או קפיצה משם.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here is a short tune. Before you touch your instrument, sing it quietly in your head.', he: 'היי {name}! הנה מנגינה קצרה. לפני שאתם נוגעים בכלי, שירו אותה בשקט בראש.' },
        play: [{ kind: 'cadence', key: C }, rest(0.4), notes([60, 62, 64])],
        show: { notes: [60, 62, 64] },
      },
      {
        say: { en: 'The chords first tell you where home is. Find home on your instrument, then ask: does the tune go up or down, by a step or a leap?', he: 'האקורדים בהתחלה מראים איפה הבית. מצאו את הבית על הכלי, ואז שאלו: המנגינה עולה או יורדת, בצעד או בקפיצה?' },
        play: [notes([60, 64, 67, 64])],
        show: { text: { en: 'home → step or leap?', he: 'בית ← צעד או קפיצה?' } },
      },
      {
        say: { en: 'Wrong notes are fine. Play one, listen, and slide up or down until it matches what you heard.', he: 'צלילים לא נכונים זה בסדר. נגנו אחד, הקשיבו, והחליקו למעלה או למטה עד שזה מתאים למה ששמעתם.' },
        play: [notes([62, 63, 64], 0.6)],
      },
      {
        say: { en: 'Later the tunes get longer, a note outside the key sneaks in, and you play the bass line under chords. Last of all, the rhythm counts too.', he: 'בהמשך המנגינות מתארכות, צליל מחוץ לסולם מתגנב פנימה, ואתם מנגנים את קו הבס מתחת לאקורדים. ובסוף, גם המקצב נספר.' },
        play: [{ kind: 'melody', midis: [60, 62, 64, 62, 60], beats: [1, 1, 1, 1, 2], bpm: 90 }],
      },
      {
        say: { en: 'Your turn! Listen, sing it inside, and play it back. Mute the strings between notes so I hear each one clearly.', he: 'תורכם! הקשיבו, שירו בפנים, ונגנו בחזרה. השתיקו את המיתרים בין הצלילים כדי שאשמע כל צליל ברור.' },
        show: { text: { en: '👂 → 🎵 → 🎸', he: '👂 ← 🎵 ← 🎸' } },
      },
    ],
  },
  {
    id: 'fret-notes',
    area: 'play',
    emoji: '🎸',
    title: { en: 'Notes on the neck', he: 'תווים על הצוואר' },
    takeaway: { en: 'Each fret is a half step. Learn the open strings and the natural notes on strings 6 and 5, and every other note is a step away — and it all repeats at fret 12.', he: 'כל סריג הוא חצי טון. למדו את המיתרים הפתוחים ואת התווים הטבעיים על מיתרים 6 ו־5, וכל תו אחר נמצא במרחק צעד — והכול חוזר בסריג 12.' },
    steps: [
      {
        say: { en: 'Hi {name}! Every fret raises the note by a half step. Listen to the low E string climbing fret by fret.', he: 'היי {name}! כל סריג מעלה את הצליל בחצי טון. הקשיבו למיתר מי הנמוך עולה סריג אחרי סריג.' },
        play: [notes([40, 41, 42, 43, 44, 45], 0.4)],
        show: { text: { en: 'E F F♯ G G♯ A', he: 'מי פה פה♯ סול סול♯ לה' } },
      },
      {
        say: { en: 'Between most natural notes there are two frets. Only E to F and B to C sit side by side, one fret apart.', he: 'בין רוב התווים הטבעיים יש שני סריגים. רק מי לפה וסי לדו יושבים צמוד, סריג אחד ביניהם.' },
        play: [notes([40, 41, 43, 45], 0.5)],
        show: { text: { en: 'E·F — G — A', he: 'מי·פה — סול — לה' } },
      },
      {
        say: { en: 'Learn string 6 and string 5 first: they name the root of most barre chords. G is on fret 3 of string 6, C on fret 3 of string 5.', he: 'למדו קודם את מיתר 6 ומיתר 5: הם נותנים את השורש לרוב אקורדי הברה. סול בסריג 3 של מיתר 6, דו בסריג 3 של מיתר 5.' },
        play: [notes([43], 0.8), rest(0.2), notes([48], 0.8)],
      },
      {
        say: { en: 'At fret 12 everything starts again, an octave higher. And the same note lives in many places on the neck.', he: 'בסריג 12 הכול מתחיל מחדש, אוקטבה למעלה. ואותו צליל גר בהרבה מקומות על הצוואר.' },
        play: [notes([40, 52], 0.8), rest(0.2), notes([55, 55], 0.6)],
        show: { text: { en: 'fret 12 = octave', he: 'סריג 12 = אוקטבה' } },
      },
      {
        say: { en: 'Your turn! I name a note, you tap it on the neck. Say the names out loud while you look — it sticks faster.', he: 'תורכם! אני אומר שם של תו, ואתם מקישים עליו בצוואר. אמרו את השמות בקול כשאתם מחפשים — זה נדבק מהר יותר.' },
        show: { text: { en: 'E A D G B E', he: 'E A D G B E' } },
      },
    ],
  },
  {
    id: 'string-notes',
    area: 'play',
    emoji: '🎻',
    title: { en: 'Notes on the fingerboard', he: 'תווים על הגריף' },
    takeaway: { en: 'No frets, so your ear places the finger. In first position each string covers the notes up to the next open string: one finger per step.', he: 'אין סריגים, אז האוזן ממקמת את האצבע. בפוזיציה הראשונה כל מיתר מכסה את הצלילים עד המיתר הפתוח הבא: אצבע לכל צעד.' },
    steps: [
      {
        say: { en: 'Hi {name}! A violin is tuned in fifths: G, D, A, E. Listen to the four open strings.', he: 'היי {name}! כינור מכוון בקווינטות: סול, רה, לה, מי. הקשיבו לארבעת המיתרים הפתוחים.' },
        play: [notes([55, 62, 69, 76], 0.7)],
        show: { notes: [55, 62, 69, 76] },
      },
      {
        say: { en: 'In first position, four fingers climb the string until the next open string takes over. On the G string: A, B, C, D.', he: 'בפוזיציה הראשונה ארבע אצבעות מטפסות על המיתר עד שהמיתר הפתוח הבא ממשיך. על מיתר סול: לה, סי, דו, רה.' },
        play: [notes([55, 57, 59, 60, 62], 0.5)],
        show: { notes: [55, 57, 59, 60, 62] },
      },
      {
        say: { en: 'Some fingers sit close together — B to C is only a half step. Viola and cello work the same way, just lower: C, G, D, A.', he: 'יש אצבעות שיושבות צמוד — מסי לדו זה רק חצי טון. ויולה וצ׳לו עובדים אותו דבר, רק נמוך יותר: דו, סול, רה, לה.' },
        play: [notes([59, 60], 0.6), rest(0.3), notes([48, 55, 62, 69], 0.6)],
      },
      {
        say: { en: 'Sharps and flats sit between the fingers: F sharp is a little higher than F. Your ear decides exactly where.', he: 'דיאזים ובמולים יושבים בין האצבעות: פה דיאז קצת יותר גבוה מפה. האוזן מחליטה בדיוק איפה.' },
        play: [notes([65, 66], 0.7)],
      },
      {
        say: { en: 'Your turn! I name a note, you place it on the fingerboard. Then find every place a note lives in first position.', he: 'תורכם! אני אומר שם של תו, ואתם ממקמים אותו על הגריף. אחר כך מצאו כל מקום שבו צליל גר בפוזיציה הראשונה.' },
        show: { text: { en: 'G D A E', he: 'G D A E' } },
      },
    ],
  },
  {
    id: 'fret-intervals',
    area: 'play',
    emoji: '📐',
    title: { en: 'Intervals as shapes', he: 'מרווחים כצורות' },
    takeaway: { en: 'On a guitar every interval is a shape you can move anywhere. The only catch: between the G and B strings, shapes shift up one fret.', he: 'בגיטרה כל מרווח הוא צורה שאפשר להזיז לכל מקום. הקאץ׳ היחיד: בין מיתרי סול וסי הצורות זזות סריג אחד למעלה.' },
    steps: [
      {
        say: { en: 'Hi {name}! An octave on the guitar is a shape: two strings over and two frets up. Move it anywhere and it still sounds like an octave.', he: 'היי {name}! אוקטבה בגיטרה היא צורה: שני מיתרים הלאה ושני סריגים למעלה. הזיזו אותה לכל מקום והיא עדיין נשמעת כמו אוקטבה.' },
        play: [notes([45, 57], 0.7), rest(0.3), notes([47, 59], 0.7)],
        show: { text: { en: 'octave: 2 strings, 2 frets', he: 'אוקטבה: 2 מיתרים, 2 סריגים' } },
      },
      {
        say: { en: 'Same fret on the next string is a fourth. Two frets up on the next string is a fifth — the power chord.', he: 'אותו סריג במיתר הבא הוא קוורטה. שני סריגים למעלה במיתר הבא הם קווינטה — אקורד הפאוור.' },
        play: [chord([45, 50], 1), rest(0.3), chord([45, 52], 1)],
      },
      {
        say: { en: 'A major third is one fret back on the next string, a minor third two frets back. Hear how the major one is brighter.', he: 'טרצה גדולה היא סריג אחד אחורה במיתר הבא, טרצה קטנה שני סריגים אחורה. שמעו כמה הגדולה בהירה יותר.' },
        play: [notes([45, 49], 0.6), rest(0.3), notes([45, 48], 0.6)],
      },
      {
        say: { en: 'Crossing from G to B, the strings are only a third apart, so every shape moves one fret up. Remember the shift and the shapes never lie.', he: 'במעבר מסול לסי, המיתרים רחוקים רק טרצה, אז כל צורה זזה סריג אחד למעלה. זכרו את ההזזה והצורות לא ישקרו.' },
        play: [notes([55, 59], 0.7)],
        show: { text: { en: 'G → B: +1 fret', he: 'סול ← סי: +1 סריג' } },
      },
      {
        say: { en: 'Your turn! Start from the dot and find the interval I ask for. Later, you will hear it and find it by ear.', he: 'תורכם! התחילו מהנקודה ומצאו את המרווח שאני מבקש. בהמשך תשמעו אותו ותמצאו אותו לפי האוזן.' },
        show: { text: { en: '● → ?', he: '● ← ?' } },
      },
    ],
  },
  {
    id: 'fret-chords',
    area: 'play',
    emoji: '🎼',
    title: { en: 'Chord shapes', he: 'צורות של אקורדים' },
    takeaway: { en: 'Five open shapes — C, A, G, E, D — slide up the neck to play any chord (CAGED). Small triads on three strings and drop voicings for sevenths come from the same idea.', he: 'חמש צורות פתוחות — C, A, G, E, D — מחליקות במעלה הצוואר ומנגנות כל אקורד (CAGED). טריאדות קטנות על שלושה מיתרים וקולות דרופ לספטים באים מאותו רעיון.' },
    steps: [
      {
        say: { en: 'Hi {name}! A chord box is the neck standing up: strings left to right, frets top to bottom. A circle means open, a cross means do not play.', he: 'היי {name}! דיאגרמת אקורד היא הצוואר בעמידה: מיתרים משמאל לימין, סריגים מלמעלה למטה. עיגול אומר פתוח, איקס אומר לא לנגן.' },
        play: [chord([48, 52, 55, 60, 64], 1.6, true)],
        show: { text: { en: 'C: x32010', he: 'C: x32010' } },
      },
      {
        say: { en: 'Major or minor: one finger changes. Listen to A major, then A minor — only the third moved down.', he: 'מז׳ור או מינור: אצבע אחת משתנה. הקשיבו ללה מז׳ור ואז ללה מינור — רק הטרצה ירדה.' },
        play: [chord([45, 52, 57, 61, 64], 1.2, true), rest(0.3), chord([45, 52, 57, 60, 64], 1.2, true)],
      },
      {
        say: { en: 'Slide an open shape up and put a barre where the nut was, and it plays another chord. The E shape at fret 3 is G major.', he: 'החליקו צורה פתוחה למעלה ושימו ברה איפה שהיה האוכף, והיא מנגנת אקורד אחר. צורת E בסריג 3 היא סול מז׳ור.' },
        play: [chord([40, 47, 52, 56, 59, 64], 1.2, true), rest(0.3), chord([43, 50, 55, 59, 62, 67], 1.2, true)],
        show: { text: { en: 'C · A · G · E · D', he: 'C · A · G · E · D' } },
      },
      {
        say: { en: 'Three strings are enough for a triad. On the top strings, the same chord can be played in three inversions up the neck.', he: 'שלושה מיתרים מספיקים לטריאדה. על המיתרים העליונים אפשר לנגן את אותו אקורד בשלושה היפוכים לאורך הצוואר.' },
        play: [chord([55, 60, 64], 0.9), chord([60, 64, 67], 0.9), chord([64, 67, 72], 0.9)],
      },
      {
        say: { en: 'Your turn! Name the open chord, build triads, find the CAGED shape, then stack seventh chords. Bass players: root, fifth, octave, then arpeggios.', he: 'תורכם! זהו את האקורד הפתוח, בנו טריאדות, מצאו את צורת ה־CAGED, ואז בנו אקורדי ספטים. נגני בס: שורש, קווינטה, אוקטבה, ואז ארפג׳ו.' },
        show: { text: { en: 'R · 3 · 5 · 7', he: 'R · 3 · 5 · 7' } },
      },
    ],
  },
  {
    id: 'fret-scales',
    area: 'play',
    emoji: '🪜',
    title: { en: 'Scales on the neck', he: 'סולמות על הצוואר' },
    takeaway: { en: 'A scale on the neck is a pattern under one hand. Learn it from a root on string 6, then the five pentatonic boxes that cover the whole neck.', he: 'סולם על הצוואר הוא תבנית מתחת ליד אחת. למדו אותו משורש על מיתר 6, ואז את חמשת הבוקסים הפנטטוניים שמכסים את כל הצוואר.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here is G major, one octave up from G on string 6. Four frets, three strings, one hand that hardly moves.', he: 'היי {name}! הנה סול מז׳ור, אוקטבה אחת למעלה מסול על מיתר 6. ארבעה סריגים, שלושה מיתרים, יד אחת שכמעט לא זזה.' },
        play: [notes([43, 45, 47, 48, 50, 52, 54, 55], 0.35)],
      },
      {
        say: { en: 'The minor pentatonic has only five notes. Box 1 starts on the root on string 6: two notes on every string. This is A, at fret 5.', he: 'לפנטטונית המינורית יש רק חמישה צלילים. בוקס 1 מתחיל בשורש על מיתר 6: שני צלילים בכל מיתר. זה לה, בסריג 5.' },
        play: [notes([45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72], 0.25)],
        show: { text: { en: 'box 1', he: 'בוקס 1' } },
      },
      {
        say: { en: 'Each box joins the next one, five in all, until the pattern repeats at fret 12. The root dots tell you which box you are in.', he: 'כל בוקס מתחבר לבא אחריו, חמישה בסך הכול, עד שהתבנית חוזרת בסריג 12. נקודות השורש מגלות באיזה בוקס אתם.' },
        play: [notes([69, 72, 74, 76, 79, 81], 0.3)],
        show: { text: { en: '1 · 2 · 3 · 4 · 5', he: '1 · 2 · 3 · 4 · 5' } },
      },
      {
        say: { en: 'Three notes on every string makes fast runs easy: the same picking on every string. Bass players learn approach notes that lead into the next root.', he: 'שלושה צלילים בכל מיתר הופכים ריצות מהירות לקלות: אותה פריטה בכל מיתר. נגני בס לומדים צלילי גישה שמובילים לשורש הבא.' },
        play: [notes([40, 42, 44, 45, 47, 49, 51, 52, 54], 0.25), rest(0.3), notes([36, 40, 41], 0.5)],
      },
      {
        say: { en: 'Your turn! Play the scales I ask for, from the lowest note up, and name the box you see.', he: 'תורכם! נגנו את הסולמות שאני מבקש, מהצליל הנמוך למעלה, וזהו את הבוקס שאתם רואים.' },
        show: { text: { en: '🪜 low → high', he: '🪜 נמוך ← גבוה' } },
      },
    ],
  },
  {
    id: 'key-notes',
    area: 'play',
    emoji: '🎹',
    title: { en: 'Notes on the keys', he: 'תווים על הקלידים' },
    takeaway: { en: 'The black keys come in twos and threes. C sits just left of the two, F just left of the three — and from there you can find any note, interval or chord.', he: 'הקלידים השחורים באים בזוגות ובשלשות. דו יושב משמאל לזוג, פה משמאל לשלשה — ומשם אפשר למצוא כל צליל, מרווח או אקורד.' },
    steps: [
      {
        say: { en: 'Hi {name}! Look for the black keys in groups of two and three. C is the white key just left of the two black ones.', he: 'היי {name}! חפשו את הקלידים השחורים בקבוצות של שניים ושלושה. דו הוא הקליד הלבן משמאל לשני השחורים.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.35)],
        show: { notes: [60, 62, 64, 65, 67, 69, 71, 72] },
      },
      {
        say: { en: 'Each black key has two names. The one between C and D is C sharp, and also D flat — same key, same sound.', he: 'לכל קליד שחור יש שני שמות. זה שבין דו לרה הוא דו דיאז, וגם רה במול — אותו קליד, אותו צליל.' },
        play: [notes([60, 61, 62], 0.6)],
        show: { notes: [61] },
      },
      {
        say: { en: 'Octaves get numbers. The C in the middle of the piano is C4; the next C up is C5.', he: 'לאוקטבות יש מספרים. הדו באמצע הפסנתר הוא C4; הדו הבא למעלה הוא C5.' },
        play: [notes([60, 72], 0.8)],
        show: { notes: [60, 72] },
      },
      {
        say: { en: 'Count half steps, black keys included, to build an interval. Four half steps make a major third; stack a minor third on it and you have a major chord.', he: 'ספרו חצאי טונים, כולל השחורים, כדי לבנות מרווח. ארבעה חצאי טונים הם טרצה גדולה; הוסיפו מעליה טרצה קטנה ויש לכם אקורד מז׳ור.' },
        play: [notes([60, 64], 0.6), rest(0.3), chord([60, 64, 67], 1.2)],
        show: { notes: [60, 64, 67], chord: true },
      },
      {
        say: { en: 'Your turn! Find the notes I name, then build intervals and chords right on the keys.', he: 'תורכם! מצאו את התווים שאני אומר, ואז בנו מרווחים ואקורדים ישר על הקלידים.' },
        show: { text: { en: 'C D E F G A B', he: 'דו רה מי פה סול לה סי' } },
      },
    ],
  },
];

/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = {
  'topic:play-back': 'play-back',
  'topic:fret-notes': 'fret-notes',
  'topic:string-notes': 'string-notes',
  'topic:fret-intervals': 'fret-intervals',
  'topic:fret-chords': 'fret-chords',
  'topic:fret-scales': 'fret-scales',
  'topic:key-notes': 'key-notes',
};

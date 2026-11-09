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
    more: [
      {
        say: { en: 'Playing by ear is translation: a sound in your head becomes a place on your instrument. It has three stages — hear it, sing it inside, find it. Skip the middle stage and you are only guessing.', he: 'לנגן בשמיעה זה תרגום: צליל בראש הופך למקום על הכלי. יש לזה שלושה שלבים — לשמוע, לשיר בפנים, למצוא. מדלגים על השלב האמצעי, ונשארים עם ניחושים.' },
        show: { text: { en: 'hear → sing → find', he: 'לשמוע ← לשיר ← למצוא' } },
      },
      {
        say: { en: 'Start with the key. The chords before each tune point to 1, home. Find 1 on your instrument first; then every note is a degree you already know, not a random pitch.', he: 'מתחילים מהסולם. האקורדים שלפני כל מנגינה מצביעים על 1, הבית. מצאו קודם את 1 על הכלי; מאותו רגע כל צליל הוא דרגה שאתם כבר מכירים, לא גובה אקראי.' },
        play: [{ kind: 'cadence', key: { letter: 'G', acc: 0 } }, notes([55], 1)],
        show: { notes: [55], key: 'G', text: { en: 'G: 1 = G', he: 'סול: 1 = סול' } },
      },
      {
        say: { en: 'Next, the contour: up or down, and how far. A step is one or two half steps — the neighboring note of the scale. Anything bigger is a leap. Here: step, step, leap, step down.', he: 'אחר כך הקו: למעלה או למטה, וכמה רחוק. צעד הוא חצי טון או טון — השכן בסולם. כל דבר גדול יותר הוא קפיצה. כאן: צעד, צעד, קפיצה, צעד למטה.' },
        play: [notes([60, 62, 64, 67, 65], 0.55)],
        show: { notes: [60, 62, 64, 67, 65], key: 'C', text: { en: 'step · step · leap · step', he: 'צעד · צעד · קפיצה · צעד' } },
      },
      {
        say: { en: 'A good listening strategy: lock in the first and the last note. Many short tunes end on 1, so the last note is often a free answer. Fill in the middle afterwards.', he: 'אסטרטגיה טובה: תפסו קודם את הצליל הראשון ואת האחרון. הרבה מנגינות קצרות מסתיימות על 1, אז הצליל האחרון הוא לעיתים קרובות תשובה בחינם. את האמצע ממלאים אחר כך.' },
        play: [{ kind: 'cadence', key: C }, notes([67, 65, 64, 62, 60], 0.5)],
        show: { notes: [67, 65, 64, 62, 60], key: 'C', text: { en: '5 … 1', he: '5 … 1' } },
      },
      {
        say: { en: 'A note outside the key usually leans on a neighbor. Here E flat slides into E. If a note sounds "wrong but close", try a half step up or down from the scale note.', he: 'צליל מחוץ לסולם בדרך כלל נשען על שכן. כאן מי במול מחליק אל מי. אם צליל נשמע "לא נכון אבל קרוב", נסו חצי טון מעל או מתחת לצליל הסולם.' },
        play: [{ kind: 'cadence', key: C }, notes([60, 62, 63, 64], 0.55)],
        show: { notes: [60, 62, 63, 64], key: 'C', text: { en: '♭3 → 3', he: '♭3 → 3' } },
      },
      {
        say: { en: 'For a bass line, ignore the top of the chords and follow the lowest note. Most of the time it is the root: here C, F, G and back to C.', he: 'בקו בס, התעלמו מהחלק העליון של האקורדים ועקבו אחרי הצליל הנמוך ביותר. רוב הזמן זה השורש: כאן דו, פה, סול וחזרה לדו.' },
        play: [chord([48, 64, 67], 0.9), chord([53, 65, 69], 0.9), chord([55, 62, 67], 0.9), chord([48, 64, 72], 1.2)],
        show: { notes: [48, 53, 55, 48], clef: 'bass', text: { en: 'C · F · G · C', he: 'דו · פה · סול · דו' } },
      },
      {
        say: { en: 'How the app hears you: with a microphone, play one clear note at a time, let it ring, and mute the others — chords and buzzing strings confuse pitch detection. With a MIDI keyboard every note arrives exactly.', he: 'איך האפליקציה שומעת אתכם: עם מיקרופון, נגנו צליל אחד ברור בכל פעם, תנו לו לצלצל, והשתיקו את השאר — אקורדים ומיתרים מזמזמים מבלבלים את זיהוי הגובה. עם קלידי MIDI כל צליל מגיע בדיוק.' },
        show: { text: { en: '🎤 one note · 🎹 MIDI', he: '🎤 צליל אחד · 🎹 MIDI' } },
      },
      {
        say: { en: 'The common mistake is hunting note by note before the tune is in your head. Sing it first, even twice. To keep: home first, then contour, then the notes.', he: 'הטעות הנפוצה היא לחפש צליל אחרי צליל לפני שהמנגינה בראש. שירו אותה קודם, אפילו פעמיים. מה לזכור: קודם הבית, אחר כך הקו, ואז הצלילים.' },
        show: { text: { en: 'home → contour → notes', he: 'בית ← קו ← צלילים' } },
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
    more: [
      {
        say: { en: 'Standard tuning, from the thickest string (6) to the thinnest (1): E, A, D, G, B, E. Every pair is a fourth apart, except G to B, which is a major third.', he: 'כיוון סטנדרטי, מהמיתר העבה (6) לדק (1): E, A, D, G, B, E. כל זוג מיתרים רחוק קוורטה, חוץ מ־G ל־B, שביניהם טרצה גדולה.' },
        play: [notes([40, 45, 50, 55, 59, 64], 0.55)],
        show: { text: { en: '6 E · 5 A · 4 D · 3 G · 2 B · 1 E', he: '6 E · 5 A · 4 D · 3 G · 2 B · 1 E' } },
      },
      {
        say: { en: 'There are seven note names and twelve half steps. Each fret is one half step. Here are the natural notes on string 6: frets 0, 1, 3, 5, 7, 8, 10 and 12.', he: 'יש שבעה שמות של תווים ושנים־עשר חצאי טונים. כל סריג הוא חצי טון. הנה התווים הטבעיים על מיתר 6: סריגים 0, 1, 3, 5, 7, 8, 10 ו־12.' },
        play: [notes([40, 41, 43, 45, 47, 48, 50, 52], 0.4)],
        show: { text: { en: 'E0 F1 G3 A5 B7 C8 D10 E12', he: 'E0 F1 G3 A5 B7 C8 D10 E12' } },
      },
      {
        say: { en: 'And on string 5: A at 0, B at 2, C at 3, D at 5, E at 7, F at 8, G at 10. These two strings are your map — barre-chord roots live here.', he: 'ועל מיתר 5: A ב־0, B ב־2, C ב־3, D ב־5, E ב־7, F ב־8, G ב־10. שני המיתרים האלה הם המפה שלכם — שורשי אקורדי הברה גרים כאן.' },
        play: [notes([45, 47, 48, 50, 52, 53, 55, 57], 0.4)],
        show: { text: { en: 'A0 B2 C3 D5 E7 F8 G10 A12', he: 'A0 B2 C3 D5 E7 F8 G10 A12' } },
      },
      {
        say: { en: 'The fret between two naturals has two names. Fret 2 on string 6 is F sharp or G flat — same sound. Choose the name the key uses: F sharp in G major, G flat in D flat major.', he: 'הסריג שבין שני תווים טבעיים מקבל שני שמות. סריג 2 על מיתר 6 הוא F♯ או G♭ — אותו צליל. בוחרים את השם שהסולם משתמש בו: F♯ בסול מז׳ור, G♭ ברה במול מז׳ור.' },
        play: [notes([41, 42, 43], 0.6)],
        show: { text: { en: 'fret 2 = F♯ = G♭', he: 'סריג 2 = F♯ = G♭' } },
      },
      {
        say: { en: 'Octave shapes carry names across the neck. From string 6 or 5: skip a string, two frets up. From string 4 or 3: skip a string, three frets up, because of the B string. G at fret 3 → fret 5 → fret 8.', he: 'צורות אוקטבה מעבירות שמות לאורך הצוואר. ממיתר 6 או 5: מדלגים מיתר, שני סריגים למעלה. ממיתר 4 או 3: מדלגים מיתר, שלושה סריגים למעלה, בגלל מיתר B. סול בסריג 3 ← סריג 5 ← סריג 8.' },
        play: [notes([43, 55, 67], 0.7)],
        show: { text: { en: 'G: 6/3 → 4/5 → 2/8', he: 'סול: 6/3 ← 4/5 ← 2/8' } },
      },
      {
        say: { en: 'Fret 5 of a string equals the next open string — fret 4 on the G string. That is also how guitarists tune by ear: the two notes should ring as one.', he: 'סריג 5 במיתר שווה למיתר הפתוח הבא — סריג 4 במיתר G. כך גם מכוונים גיטרה בשמיעה: שני הצלילים צריכים לצלצל כאחד.' },
        play: [notes([50], 0.9), chord([50, 50], 1.2)],
        show: { text: { en: 'A string fret 5 = open D', he: 'מיתר A סריג 5 = D פתוח' } },
      },
      {
        say: { en: 'A good drill: one note, every place. Find all the Cs — string 5 fret 3, string 3 fret 5, string 2 fret 1, string 1 fret 8 — and say the name each time.', he: 'תרגיל טוב: תו אחד, בכל המקומות. מצאו את כל ה־C — מיתר 5 סריג 3, מיתר 3 סריג 5, מיתר 2 סריג 1, מיתר 1 סריג 8 — ואמרו את השם בכל פעם.' },
        play: [notes([48, 60, 60, 72], 0.6)],
        show: { text: { en: 'all the Cs', he: 'כל ה־C' } },
      },
      {
        say: { en: 'The common mistake is counting from the nut every time. Use landmarks instead: the dots at frets 3, 5, 7, 9 and 12. To keep: learn strings 6 and 5, then move by octave shapes.', he: 'הטעות הנפוצה היא לספור מהאוכף בכל פעם. השתמשו בנקודות ציון: הנקודות בסריגים 3, 5, 7, 9 ו־12. מה לזכור: לומדים את מיתרים 6 ו־5, ואז זזים בצורות אוקטבה.' },
        show: { text: { en: '3 · 5 · 7 · 9 · 12', he: '3 · 5 · 7 · 9 · 12' } },
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
    more: [
      {
        say: { en: 'The bowed strings are tuned in fifths. Violin: G, D, A, E from the G below middle C. Viola: C, G, D, A, a fifth lower. Cello: C, G, D, A, an octave below the viola.', he: 'כלי הקשת מכוונים בקווינטות. כינור: סול, רה, לה, מי, מהסול שמתחת לדו האמצעי. ויולה: דו, סול, רה, לה, קווינטה למטה. צ׳לו: דו, סול, רה, לה, אוקטבה מתחת לוויולה.' },
        play: [notes([55, 62, 69, 76], 0.55), rest(0.3), notes([36, 43, 50, 57], 0.55)],
        show: { text: { en: 'violin G D A E · cello C G D A', he: 'כינור G D A E · צ׳לו C G D A' } },
      },
      {
        say: { en: 'The double bass is the exception: it is tuned in fourths, E, A, D, G, like the low four strings of a guitar, and sounds an octave below where it is written.', he: 'הקונטרבס הוא היוצא מן הכלל: הוא מכוון בקוורטות, מי, לה, רה, סול, כמו ארבעת המיתרים הנמוכים של הגיטרה, ונשמע אוקטבה מתחת למה שכתוב.' },
        play: [notes([28, 33, 38, 43], 0.7)],
        show: { text: { en: 'bass: E A D G (fourths)', he: 'קונטרבס: E A D G (קוורטות)' } },
      },
      {
        say: { en: 'On violin in first position, finger 1 is a whole step above the open string and finger 4 reaches the next open string\'s note. On the A string: B, C sharp, D, then E — the same as open E.', he: 'בכינור בפוזיציה הראשונה, אצבע 1 נמצאת טון מעל המיתר הפתוח, ואצבע 4 מגיעה לצליל של המיתר הפתוח הבא. על מיתר לה: סי, דו דיאז, רה, ואז מי — כמו מי פתוח.' },
        play: [notes([69, 71, 73, 74, 76], 0.5), rest(0.2), notes([76], 0.9)],
        show: { notes: [69, 71, 73, 74, 76], text: { en: '0 · 1 · 2 · 3 · 4 = open E', he: '0 · 1 · 2 · 3 · 4 = מי פתוח' } },
      },
      {
        say: { en: 'What changes from key to key is where the half step falls. With C sharp, finger 2 sits close to 3. With C natural, it slides back next to 1. Hear the difference.', he: 'מה שמשתנה מסולם לסולם הוא איפה נופל חצי הטון. עם דו דיאז, אצבע 2 צמודה ל־3. עם דו טבעי, היא חוזרת ונצמדת ל־1. שמעו את ההבדל.' },
        play: [notes([69, 71, 73, 74], 0.5), rest(0.4), notes([69, 71, 72, 74], 0.5)],
        show: { notes: [69, 71, 73, 74, 72], text: { en: 'high 2 · low 2', he: '2 גבוהה · 2 נמוכה' } },
      },
      {
        say: { en: 'On the cello the hand covers less: in first position each finger is a half step, so four fingers span a minor third. Reaching a whole step between fingers 1 and 2 is called an extension.', he: 'בצ׳לו היד מכסה פחות: בפוזיציה הראשונה כל אצבע היא חצי טון, כך שארבע אצבעות משתרעות על טרצה קטנה. כשמותחים טון שלם בין אצבע 1 ל־2, זה נקרא אקסטנשן.' },
        play: [notes([50, 52, 53, 54, 55], 0.5)],
        show: { text: { en: 'cello: 1 · 2 · 3 · 4 = half steps', he: 'צ׳לו: 1 · 2 · 3 · 4 = חצאי טונים' } },
      },
      {
        say: { en: 'Check your intonation against the open strings. Finger 3 on the violin A string is D, an octave above the open D. In tune, the open string rings along in sympathy.', he: 'בדקו אינטונציה מול המיתרים הפתוחים. אצבע 3 על מיתר לה בכינור היא רה, אוקטבה מעל רה הפתוח. כשזה מדויק, המיתר הפתוח מצלצל יחד מעצמו.' },
        play: [notes([62], 0.8), chord([62, 74], 1.6)],
        show: { notes: [62, 74], chord: true, text: { en: 'open D + 3rd finger D', he: 'רה פתוח + רה באצבע 3' } },
      },
      {
        say: { en: 'The common mistake is placing fingers by memory and not by ear, so the notes drift flat as the hand tires. To keep: tuned in fifths, finger patterns follow the key, and your ear has the last word.', he: 'הטעות הנפוצה היא להניח אצבעות מהזיכרון ולא לפי האוזן, ואז הצלילים נוטים להיות נמוכים כשהיד מתעייפת. מה לזכור: כיוון בקווינטות, דפוסי האצבעות הולכים לפי הסולם, ולאוזן המילה האחרונה.' },
        show: { text: { en: 'fifths · pattern · ear', he: 'קווינטות · דפוס · אוזן' } },
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
    more: [
      {
        say: { en: 'An interval is a number of half steps, and on one string that is simply a number of frets. Open A to fret 7 on the same string is seven half steps: a perfect fifth, A to E.', he: 'מרווח הוא מספר של חצאי טונים, ועל מיתר אחד זה פשוט מספר סריגים. מלה פתוח עד סריג 7 על אותו מיתר יש שבעה חצאי טונים: קווינטה זכה, לה עד מי.' },
        play: [notes([45, 52], 0.8)],
        show: { text: { en: '7 frets = 7 half steps = P5', he: '7 סריגים = 7 חצאי טונים = קווינטה' } },
      },
      {
        say: { en: 'Across to the next string you start from five half steps, a fourth. So: two frets back is a minor third, one back a major third, same fret a fourth, one up the tritone, two up a fifth.', he: 'במעבר למיתר הבא מתחילים מחמישה חצאי טונים, קוורטה. אז: שני סריגים אחורה זו טרצה קטנה, אחד אחורה טרצה גדולה, אותו סריג קוורטה, אחד קדימה טריטון, שניים קדימה קווינטה.' },
        play: [notes([45, 48], 0.5), notes([45, 49], 0.5), notes([45, 50], 0.5), notes([45, 51], 0.5), notes([45, 52], 0.5)],
        show: { text: { en: '−2 m3 · −1 M3 · 0 P4 · +1 TT · +2 P5', he: '−2 m3 · −1 M3 · 0 P4 · +1 TT · +2 P5' } },
      },
      {
        say: { en: 'Two strings over you start from ten half steps, a minor seventh. One fret up is a major seventh, two frets up the octave. Same fret, two strings over: A to G.', he: 'שני מיתרים הלאה מתחילים מעשרה חצאי טונים, ספטימה קטנה. סריג אחד קדימה זו ספטימה גדולה, שניים קדימה אוקטבה. אותו סריג, שני מיתרים הלאה: לה עד סול.' },
        play: [notes([45, 55], 0.6), notes([45, 56], 0.6), notes([45, 57], 0.6)],
        show: { text: { en: '0 m7 · +1 M7 · +2 octave', he: '0 m7 · +1 M7 · +2 אוקטבה' } },
      },
      {
        say: { en: 'Any shape that crosses from the G string to the B string moves one fret up, because that pair is a major third apart. An octave from string 4 to string 2 is three frets up, not two.', he: 'כל צורה שעוברת ממיתר G למיתר B זזה סריג אחד למעלה, כי בין שני המיתרים האלה יש טרצה גדולה. אוקטבה ממיתר 4 למיתר 2 היא שלושה סריגים למעלה, לא שניים.' },
        play: [notes([52, 64], 0.8)],
        show: { text: { en: 'E: 4th string fret 2 → 2nd string fret 5', he: 'מי: מיתר 4 סריג 2 ← מיתר 2 סריג 5' } },
      },
      {
        say: { en: 'The power chord is root, fifth and octave stacked as one shape. From G on string 6, fret 3: the fifth and the octave both sit at fret 5 on the next two strings.', he: 'אקורד פאוור הוא שורש, קווינטה ואוקטבה בצורה אחת. מסול על מיתר 6, סריג 3: הקווינטה והאוקטבה שתיהן בסריג 5 על שני המיתרים הבאים.' },
        play: [chord([43, 50, 55], 1.4)],
        show: { text: { en: 'G5: 3 · 5 · 5', he: 'G5: 3 · 5 · 5' } },
      },
      {
        say: { en: 'In real music, sixths on the G and E strings, a string skipped between them, give the sweet double stops of soul and country. Slide the pair through the key: major sixth, major sixth, minor sixth.', he: 'במוזיקה אמיתית, סקסטות על מיתרי G ו־E, עם מיתר מדולג ביניהם, נותנות את הדאבל־סטופים המתוקים של סול וקאנטרי. החליקו את הזוג לאורך הסולם: סקסטה גדולה, גדולה, קטנה.' },
        play: [chord([60, 69], 0.8), chord([62, 71], 0.8), chord([64, 72], 1.2)],
        show: { text: { en: 'C+A · D+B · E+C', he: 'C+A · D+B · E+C' } },
      },
      {
        say: { en: 'The common mistake is forgetting the G–B shift, so a third or an octave comes out a half step flat. To keep: count half steps, start from a fourth on the next string, and add one fret past G.', he: 'הטעות הנפוצה היא לשכוח את ההזזה בין G ל־B, ואז טרצה או אוקטבה יוצאות חצי טון נמוכות מדי. מה לזכור: סופרים חצאי טונים, מתחילים מקוורטה במיתר הבא, ומוסיפים סריג אחרי G.' },
        show: { text: { en: 'next string = P4 · past G: +1', he: 'מיתר הבא = קוורטה · אחרי G: +1' } },
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
    more: [
      {
        say: { en: 'Read a chord name as six digits, string 6 to string 1. C is x32010: string 6 silent, then fret 3 (C), fret 2 (E), open G, fret 1 (C), open E. Only three note names: C, E, G.', he: 'קוראים שם אקורד כשש ספרות, ממיתר 6 למיתר 1. C הוא x32010: מיתר 6 שקט, אחר כך סריג 3 (דו), סריג 2 (מי), סול פתוח, סריג 1 (דו), מי פתוח. רק שלושה שמות: דו, מי, סול.' },
        play: [chord([48, 52, 55, 60, 64], 1.6, true)],
        show: { text: { en: 'x32010 = C E G C E', he: 'x32010 = C E G C E' } },
      },
      {
        say: { en: 'A major triad is root, major third, fifth; minor lowers the third by one fret. Open E is 022100; lift one finger, 022000, and it becomes E minor.', he: 'טריאדה מז׳ורית היא שורש, טרצה גדולה, קווינטה; במינור הטרצה יורדת בסריג אחד. E פתוח הוא 022100; מרימים אצבע אחת, 022000, והוא הופך ל־E מינור.' },
        play: [chord([40, 47, 52, 56, 59, 64], 1.2, true), rest(0.2), chord([40, 47, 52, 55, 59, 64], 1.2, true)],
        show: { text: { en: 'E 022100 · Em 022000', he: 'E 022100 · Em 022000' } },
      },
      {
        say: { en: 'CAGED names the five open shapes. Each one holds the root in a different place, so each can be barred and moved. The A shape at fret 3 is C major: x35553.', he: 'CAGED הוא השם של חמש הצורות הפתוחות. כל אחת מחזיקה את השורש במקום אחר, ולכן כל אחת אפשר לתפוס בברה ולהזיז. צורת A בסריג 3 היא דו מז׳ור: x35553.' },
        play: [chord([48, 55, 60, 64, 67], 1.4, true)],
        show: { text: { en: 'A shape, fret 3 = C', he: 'צורת A, סריג 3 = C' } },
      },
      {
        say: { en: 'The shapes link up the neck in that order. For C major: the open C shape, the A shape at 3, the G shape around 5, the E shape at 8, the D shape at 10 — then C again at 12.', he: 'הצורות מתחברות לאורך הצוואר בסדר הזה. בדו מז׳ור: צורת C הפתוחה, צורת A בסריג 3, צורת G סביב 5, צורת E בסריג 8, צורת D בסריג 10 — ושוב C בסריג 12.' },
        show: { text: { en: 'C → A → G → E → D → C', he: 'C → A → G → E → D → C' } },
      },
      {
        say: { en: 'Same chord, different color: each shape puts a different note on top. Open C ends on E, the A shape on G, the E shape at fret 8 on a high C.', he: 'אותו אקורד, צבע אחר: כל צורה שמה צליל אחר למעלה. C פתוח מסתיים על מי, צורת A על סול, צורת E בסריג 8 על דו גבוה.' },
        play: [chord([48, 52, 55, 60, 64], 1), chord([48, 55, 60, 64, 67], 1), chord([48, 55, 60, 64, 67, 72], 1.3)],
        show: { text: { en: 'top: E · G · C', he: 'למעלה: E · G · C' } },
      },
      {
        say: { en: 'Small triads on strings 3, 2 and 1 cover the neck in three inversions: G-C-E at the nut, C-E-G at fret 5, E-G-C at fret 8. They cut through a band without clashing with the bass.', he: 'טריאדות קטנות על מיתרים 3, 2 ו־1 מכסות את הצוואר בשלושה היפוכים: סול־דו־מי ליד האוכף, דו־מי־סול בסריג 5, מי־סול־דו בסריג 8. הן חותכות דרך הלהקה בלי להתנגש בבס.' },
        play: [chord([55, 60, 64], 0.9), chord([60, 64, 67], 0.9), chord([64, 67, 72], 1.2)],
        show: { notes: [55, 60, 64, 67, 72], text: { en: 'GCE · CEG · EGC', he: 'GCE · CEG · EGC' } },
      },
      {
        say: { en: 'For seventh chords guitarists use Drop 2: take a close voicing, C-E-G-B, and drop the second note from the top down an octave. You get G-C-E-B, on the top four strings at frets 5-5-5-7.', he: 'לאקורדי ספטימה גיטריסטים משתמשים ב־Drop 2: לוקחים קול צמוד, דו־מי־סול־סי, ומורידים אוקטבה את הצליל השני מלמעלה. מקבלים סול־דו־מי־סי, על ארבעת המיתרים העליונים בסריגים 5־5־5־7.' },
        play: [chord([60, 64, 67, 71], 1.2), rest(0.2), chord([55, 60, 64, 71], 1.4)],
        show: { notes: [55, 60, 64, 71], chord: true, text: { en: 'Cmaj7 Drop 2: xx5557', he: 'Cmaj7 Drop 2: xx5557' } },
      },
      {
        say: { en: 'The common mistake is learning shapes as finger pictures without knowing where the root is. Mark the root in every shape. To keep: five shapes, one chord, the whole neck.', he: 'הטעות הנפוצה היא ללמוד צורות כתמונות של אצבעות בלי לדעת איפה השורש. סמנו את השורש בכל צורה. מה לזכור: חמש צורות, אקורד אחד, כל הצוואר.' },
        show: { text: { en: 'find the root first', he: 'קודם מוצאים את השורש' } },
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
    more: [
      {
        say: { en: 'A major scale is a pattern of whole and half steps: W W H W W W H. From G on string 6: G, A, then B, C, D on string 5, then E, F sharp, G on string 4.', he: 'סולם מז׳ור הוא תבנית של טונים וחצאי טונים: ט ט ח ט ט ט ח. מסול על מיתר 6: סול, לה, אחר כך סי, דו, רה על מיתר 5, ואז מי, פה דיאז, סול על מיתר 4.' },
        play: [notes([43, 45, 47, 48, 50, 52, 54, 55], 0.4)],
        show: { text: { en: 'W W H W W W H', he: 'ט ט ח ט ט ט ח' } },
      },
      {
        say: { en: 'The minor pentatonic is 1, flat 3, 4, 5, flat 7 — in A: A, C, D, E, G. No half steps at all, which is why almost nothing in it sounds wrong.', he: 'הפנטטונית המינורית היא 1, ♭3, 4, 5, ♭7 — בלה: לה, דו, רה, מי, סול. בלי חצאי טונים בכלל, ולכן כמעט שום צליל בה לא נשמע לא נכון.' },
        play: [notes([45, 48, 50, 52, 55, 57], 0.45)],
        show: { text: { en: '1 ♭3 4 5 ♭7', he: '1 ♭3 4 5 ♭7' } },
      },
      {
        say: { en: 'The same box is also C major pentatonic: C, D, E, G, A. Same frets, different home. Which one you play depends on the chord underneath and the note you land on.', he: 'אותו בוקס הוא גם הפנטטונית של דו מז׳ור: דו, רה, מי, סול, לה. אותם סריגים, בית אחר. מה אתם מנגנים תלוי באקורד שמתחת ובצליל שעליו אתם נוחתים.' },
        play: [chord([48, 55, 64], 1), notes([60, 62, 64, 67, 69, 72], 0.4)],
        show: { text: { en: 'Am pent = C pent', he: 'פנט׳ לה מינור = פנט׳ דו מז׳ור' } },
      },
      {
        say: { en: 'Add one note, the flat 5 — E flat in A — and you have the blues scale. Use it as a passing note between 4 and 5, not as a place to stop.', he: 'מוסיפים צליל אחד, ♭5 — מי במול בלה — ומקבלים את סולם הבלוז. השתמשו בו כצליל מעבר בין 4 ל־5, לא כמקום לעצור.' },
        play: [notes([45, 48, 50, 51, 52, 55, 57], 0.4)],
        show: { text: { en: '1 ♭3 4 ♭5 5 ♭7', he: '1 ♭3 4 ♭5 5 ♭7' } },
      },
      {
        say: { en: 'Three notes per string turn a seven-note scale into a wider, even pattern. G major from fret 3: G A B, then C D E, then F sharp G A — each string fingered the same way.', he: 'שלושה צלילים בכל מיתר הופכים סולם של שבעה צלילים לתבנית רחבה ואחידה. סול מז׳ור מסריג 3: סול לה סי, אחר כך דו רה מי, ואז פה דיאז סול לה — כל מיתר באותה אצבוע.' },
        play: [notes([43, 45, 47, 48, 50, 52, 54, 55, 57], 0.3)],
        show: { text: { en: '3 · 3 · 3', he: '3 · 3 · 3' } },
      },
      {
        say: { en: 'Practice music, not just up and down. Play the scale in thirds: 1-3, 2-4, 3-5. It trains your fingers and your ear to skip, the way melodies really move.', he: 'תרגלו מוזיקה, לא רק למעלה ולמטה. נגנו את הסולם בטרצות: 1־3, 2־4, 3־5. זה מאמן את האצבעות ואת האוזן לדלג, כמו שמנגינות באמת זזות.' },
        play: [notes([60, 64, 62, 65, 64, 67, 65, 69, 67], 0.3)],
        show: { notes: [60, 64, 62, 65, 64, 67, 65, 69, 67], key: 'C', text: { en: 'in thirds', he: 'בטרצות' } },
      },
      {
        say: { en: 'The common mistake is running boxes without landing anywhere. End phrases on a chord tone and know which dot is the root. To keep: one pattern, one root, and the five boxes join into one neck.', he: 'הטעות הנפוצה היא לרוץ בבוקסים בלי לנחות בשום מקום. סיימו משפטים על צליל של האקורד ודעו איזו נקודה היא השורש. מה לזכור: תבנית אחת, שורש אחד, וחמשת הבוקסים מתחברים לצוואר אחד.' },
        show: { text: { en: 'land on the root', he: 'לנחות על השורש' } },
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
    more: [
      {
        say: { en: 'An octave on the keyboard has twelve keys: seven white and five black. The black keys alternate in groups of two and three, and that pattern is your map.', he: 'אוקטבה על המקלדת היא שנים־עשר קלידים: שבעה לבנים וחמישה שחורים. השחורים מתחלפים בקבוצות של שניים ושלושה, והתבנית הזו היא המפה שלכם.' },
        play: [notes([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], 0.28)],
        show: { notes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72] },
      },
      {
        say: { en: 'More landmarks: D sits between the two black keys, and the middle black key of the three is G sharp, or A flat. C and F sit just left of each group.', he: 'עוד נקודות ציון: רה יושב בין שני השחורים, והשחור האמצעי מבין השלושה הוא סול דיאז, או לה במול. דו ופה יושבים משמאל לכל קבוצה.' },
        play: [notes([62, 68], 0.8)],
        show: { notes: [62, 68] },
      },
      {
        say: { en: 'A full piano has 88 keys, from A0 to C8. Middle C is C4; the A above it, A4, is the tuning note at 440 hertz. Octave numbers change at every C.', he: 'לפסנתר מלא יש 88 קלידים, מ־A0 עד C8. הדו האמצעי הוא C4; הלה שמעליו, A4, הוא צליל הכיוון ב־440 הרץ. מספר האוקטבה מתחלף בכל דו.' },
        play: [notes([60, 69], 0.9)],
        show: { notes: [60, 69], text: { en: 'C4 · A4 = 440 Hz', he: 'C4 · A4 = 440 הרץ' } },
      },
      {
        say: { en: 'White neighbors are usually a whole step apart, with a black key between. Only E–F and B–C are half steps. So C major is all white, and G major needs one black key: F sharp.', he: 'שכנים לבנים רחוקים בדרך כלל טון שלם, עם שחור ביניהם. רק מי־פה וסי־דו הם חצאי טונים. לכן דו מז׳ור כולו לבן, וסול מז׳ור צריך שחור אחד: פה דיאז.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66, 67], 0.38)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66, 67], key: 'G' },
      },
      {
        say: { en: 'Build triads by counting half steps. Major is 4 + 3, minor 3 + 4, diminished 3 + 3, augmented 4 + 4. From C: C-E-G, C-E♭-G, C-E♭-G♭, C-E-G♯.', he: 'בונים טריאדות לפי ספירת חצאי טונים. מז׳ור 4 + 3, מינור 3 + 4, מוקטן 3 + 3, מוגדל 4 + 4. מדו: דו־מי־סול, דו־מי♭־סול, דו־מי♭־סול♭, דו־מי־סול♯.' },
        play: [chord([60, 64, 67], 0.9), chord([60, 63, 67], 0.9), chord([60, 63, 66], 0.9), chord([60, 64, 68], 1.1)],
        show: { notes: [60, 63, 64, 66, 67, 68], text: { en: '4+3 · 3+4 · 3+3 · 4+4', he: '4+3 · 3+4 · 3+3 · 4+4' } },
      },
      {
        say: { en: 'Names follow letters, not keys. The note a major third above C is E; a minor third above C is E flat, never D sharp, even though it is the same black key.', he: 'השמות הולכים לפי אותיות, לא לפי קלידים. טרצה גדולה מעל דו היא מי; טרצה קטנה מעל דו היא מי במול, אף פעם לא רה דיאז, למרות שזה אותו קליד שחור.' },
        play: [notes([60, 63], 0.7), chord([60, 63], 1.2)],
        show: { notes: [60, 63], text: { en: 'C → E♭ (not D♯)', he: 'דו ← מי♭ (לא רה♯)' } },
      },
      {
        say: { en: 'A practice tip: right hand plays a triad with fingers 1, 3, 5, left hand with 5, 3, 1. In scales the thumb passes under after 3 — in C major, after E in the right hand.', he: 'טיפ לתרגול: יד ימין מנגנת טריאדה באצבעות 1, 3, 5, יד שמאל ב־5, 3, 1. בסולמות האגודל עובר מתחת אחרי 3 — בדו מז׳ור, אחרי מי ביד ימין.' },
        show: { text: { en: 'RH 1-3-5 · LH 5-3-1', he: 'ימין 1-3-5 · שמאל 5-3-1' } },
      },
      {
        say: { en: 'The common mistake is counting white keys from the far end. Jump to the nearest black group instead. To keep: groups of two and three, C and F to their left, and count half steps for everything else.', he: 'הטעות הנפוצה היא לספור קלידים לבנים מהקצה. קפצו לקבוצת השחורים הקרובה. מה לזכור: קבוצות של שניים ושלושה, דו ופה משמאלן, וכל השאר בספירת חצאי טונים.' },
        show: { text: { en: '2 · 3 · C · F', he: '2 · 3 · דו · פה' } },
      },
    ],
  },
  // Final bass check: the bass course's own neck topics (no guitar shapes on the bass path).
  {
    id: 'bass-notes',
    area: 'play',
    emoji: '𝄢',
    title: { en: 'Notes on the bass neck', he: 'תווים על צוואר הבס' },
    takeaway: { en: 'Each fret is a half step. Learn the E and A strings first; everything repeats at fret 12.', he: 'כל סריג הוא חצי טון. לומדים קודם את מיתרי E ו־A; הכול חוזר בסריג 12.' },
    steps: [
      {
        say: { en: 'Hi {name}! A bass has four strings. From the lowest: E, A, D and G, each one a fourth above the last.', he: 'היי {name}! לבס יש ארבעה מיתרים. מהנמוך: E, ‏A, ‏D ו־G, כל אחד קוורטה מעל הקודם.' },
        play: [notes([28, 33, 38, 43], 0.6)],
        show: { text: { en: 'E A D G', he: 'E A D G' } },
      },
      {
        say: { en: 'Every fret raises the note by a half step. Listen to the E string climbing fret by fret.', he: 'כל סריג מעלה את הצליל בחצי טון. הקשיבו למיתר E עולה סריג אחרי סריג.' },
        play: [notes([28, 29, 30, 31, 32, 33], 0.4)],
      },
      {
        say: { en: 'Most natural notes are two frets apart. Only E to F and B to C sit side by side, with no fret between them.', he: 'רוב התווים הטבעיים רחוקים שני סריגים. רק E ל־F ו־B ל־C צמודים, בלי סריג ביניהם.' },
        play: [notes([28, 29, 31, 33], 0.5)],
        show: { text: { en: 'E0 F1 G3 A5', he: 'E0 F1 G3 A5' } },
      },
      {
        say: { en: 'Learn the E and A strings first: the roots of most bass lines live there.', he: 'לומדים קודם את מיתרי E ו־A: שם גרים השורשים של רוב קווי הבס.' },
        play: [notes([31], 0.8), rest(0.2), notes([36], 0.8)],
        show: { text: { en: 'G = E3 · C = A3', he: 'G = E3 · C = A3' } },
      },
      {
        say: { en: 'At fret 12 it all starts again, an octave up. Your turn: I name a note, you tap it on the neck.', he: 'בסריג 12 הכול מתחיל מחדש, אוקטבה למעלה. תורכם: אני אומר שם של תו, ואתם מקישים עליו בצוואר.' },
        play: [notes([28, 40], 0.8)],
        show: { text: { en: 'fret 12 = octave', he: 'סריג 12 = אוקטבה' } },
      },
    ],
    more: [
      {
        say: { en: 'The natural notes on the E string: frets 0, 1, 3, 5, 7, 8, 10 and 12. Say them as you play them.', he: 'התווים הטבעיים על מיתר E: סריגים 0, 1, 3, 5, 7, 8, 10 ו־12. אמרו אותם בקול כשאתם מנגנים.' },
        play: [notes([28, 29, 31, 33, 35, 36, 38, 40], 0.4)],
        show: { text: { en: 'E F G A B C D E', he: 'E F G A B C D E' } },
      },
      {
        say: { en: 'On the A string: A at 0, B at 2, C at 3, D at 5, E at 7, F at 8, G at 10.', he: 'על מיתר A: ‏A ב־0, ‏B ב־2, ‏C ב־3, ‏D ב־5, ‏E ב־7, ‏F ב־8, ‏G ב־10.' },
        play: [notes([33, 35, 36, 38, 40, 41, 43, 45], 0.4)],
        show: { text: { en: 'A0 B2 C3 D5 E7 F8 G10', he: 'A0 B2 C3 D5 E7 F8 G10' } },
      },
      {
        say: { en: 'The fret between two naturals has two names: fret 2 on the E string is F sharp or G flat. Use the name the key uses.', he: 'לסריג שבין שני תווים טבעיים יש שני שמות: סריג 2 על מיתר E הוא F♯ או G♭. בוחרים את השם שהסולם משתמש בו.' },
        show: { text: { en: 'fret 2 = F♯ = G♭', he: 'סריג 2 = F♯ = G♭' } },
      },
      {
        say: { en: 'The same note lives on the next string, five frets lower: fret 5 on E equals the open A string.', he: 'אותו צליל גר במיתר הבא, חמישה סריגים פחות: סריג 5 על E שווה למיתר A הפתוח.' },
        play: [notes([33, 33], 0.7)],
        show: { text: { en: 'E5 = A0', he: 'E5 = A0' } },
      },
      {
        say: { en: 'Octaves carry names across the neck: two strings up, two frets up. G at fret 3 on E is also G at fret 5 on D.', he: 'אוקטבות מעבירות שמות לאורך הצוואר: שני מיתרים למעלה, שני סריגים קדימה. G בסריג 3 על E הוא גם G בסריג 5 על D.' },
        play: [notes([31, 43], 0.7)],
      },
      {
        say: { en: 'The usual mistake is counting from the nut every time. Use landmarks instead: frets 3, 5, 7 and 12 carry dots.', he: 'הטעות הנפוצה היא לספור מהאוכף כל פעם. משתמשים בנקודות ציון: בסריגים 3, 5, 7 ו־12 יש נקודות.' },
      },
      {
        say: { en: 'To keep: E A D G, a half step per fret, the octave at 12. Five minutes a day of naming notes out loud is enough.', he: 'מה לזכור: E A D G, חצי טון לכל סריג, האוקטבה ב־12. חמש דקות ביום של שמות תווים בקול מספיקות.' },
        show: { text: { en: 'E A D G · 12', he: 'E A D G · 12' } },
      },
    ],
  },
  {
    id: 'bass-shapes',
    area: 'play',
    emoji: '𝄢',
    title: { en: 'Bass shapes', he: 'צורות בבס' },
    takeaway: { en: 'Root, fifth, octave: one shape, every key. Arpeggios and approach notes grow from it.', he: 'שורש, קווינטה, אוקטבה: צורה אחת, בכל סולם. ארפג׳ו וצלילי גישה צומחים ממנה.' },
    steps: [
      {
        say: { en: 'Hi {name}! On the bass one shape works in every key. Start on the root, on the E or the A string.', he: 'היי {name}! בבס צורה אחת עובדת בכל סולם. מתחילים מהשורש, על מיתר E או A.' },
        play: [notes([31], 0.8)],
      },
      {
        say: { en: 'The fifth is one string up and two frets up. The octave is two strings up and two frets up.', he: 'הקווינטה: מיתר אחד למעלה ושני סריגים קדימה. האוקטבה: שני מיתרים למעלה ושני סריגים קדימה.' },
        play: [notes([31, 38, 43], 0.6)],
        show: { text: { en: 'R · 5 · 8', he: 'R · 5 · 8' } },
      },
      {
        say: { en: 'Add the third and you have the chord. Major and minor are one fret apart.', he: 'מוסיפים את הטרצה ויש אקורד. מז׳ור ומינור רחוקים סריג אחד.' },
        play: [notes([31, 35, 38, 43], 0.45), rest(0.3), notes([31, 34, 38, 43], 0.45)],
        show: { text: { en: 'R 3 5 8 · R ♭3 5 8', he: 'R 3 5 8 · R ♭3 5 8' } },
      },
      {
        say: { en: 'Move the same shape two frets up and the key changes from G to A, while the fingers stay exactly the same.', he: 'מזיזים את אותה צורה שני סריגים קדימה והסולם משתנה מ־G ל־A, והאצבעות נשארות בדיוק אותו דבר.' },
        play: [notes([33, 40, 45], 0.5)],
      },
      {
        say: { en: 'An approach note leads into the next root: a half step below it, above it, or its fifth. Your turn: tap the shapes.', he: 'צליל גישה מוביל לשורש הבא: חצי טון מתחתיו, מעליו, או הקווינטה שלו. תורכם: הקישו את הצורות.' },
        play: [notes([31, 35, 36], 0.5)],
        show: { text: { en: 'G → B → C', he: 'G → B → C' } },
      },
    ],
    more: [
      {
        say: { en: 'Root and fifth carry most bass lines in pop, rock and country. The octave adds lift without new notes.', he: 'שורש וקווינטה נושאים את רוב קווי הבס בפופ, רוק וקאנטרי. האוקטבה מוסיפה תנופה בלי צלילים חדשים.' },
        play: [notes([33, 40, 45, 40], 0.4)],
      },
      {
        say: { en: 'The fifth also sits below the root: same fret, one string down. Handy when the root is on the A string.', he: 'הקווינטה יושבת גם מתחת לשורש: אותו סריג, מיתר אחד למטה. שימושי כשהשורש על מיתר A.' },
        play: [notes([36, 31], 0.6)],
        show: { text: { en: 'C on A3 · G on E3', he: 'C על A3 · G על E3' } },
      },
      {
        say: { en: 'Seventh chords add one more note: a major seventh is one fret below the octave, a minor seventh two frets below.', he: 'אקורדי ספט מוסיפים צליל אחד: ספט גדול הוא סריג אחד מתחת לאוקטבה, ספט קטן שני סריגים מתחתיה.' },
        play: [notes([31, 35, 38, 42], 0.45), rest(0.3), notes([31, 35, 38, 41], 0.45)],
        show: { text: { en: 'maj7 · 7', he: 'maj7 · 7' } },
      },
      {
        say: { en: 'A half step below the next root pulls hardest. A half step above sounds bluesier. Try both into the same chord.', he: 'חצי טון מתחת לשורש הבא מושך הכי חזק. חצי טון מעליו נשמע בלוזי יותר. נסו את שניהם אל אותו אקורד.' },
        play: [notes([31, 35, 36], 0.5), rest(0.3), notes([31, 37, 36], 0.5)],
      },
      {
        say: { en: 'The usual mistake is looking for each note alone. Think in shapes from the root, and say the chord tone you land on.', he: 'הטעות הנפוצה היא לחפש כל צליל לבד. חושבים בצורות מהשורש, ואומרים בקול על איזה צליל אקורד נוחתים.' },
      },
      {
        say: { en: 'Walking lines use all of it: a chord tone on the first beat, then steps, and an approach note on the last beat into the next chord.', he: 'קווי ווקינג משתמשים בכל זה: צליל אקורד על הפעמה הראשונה, אחר כך צעדים, וצליל גישה בפעמה האחרונה אל האקורד הבא.' },
        play: [notes([31, 33, 35, 37, 38], 0.45)],
        show: { text: { en: 'G A B C♯ → D', he: 'G A B C♯ → D' } },
      },
      {
        say: { en: 'To keep: root, fifth and octave first, then the third and the seventh, then the note that leads to the next root.', he: 'מה לזכור: קודם שורש, קווינטה ואוקטבה, אחר כך הטרצה והספט, ואז הצליל שמוביל לשורש הבא.' },
        show: { text: { en: 'R 5 8 · 3 7 · →', he: 'R 5 8 · 3 7 · →' } },
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
  'topic:bass-notes': 'bass-notes',
  'topic:bass-shapes': 'bass-shapes',
  'topic:key-notes': 'key-notes',
};

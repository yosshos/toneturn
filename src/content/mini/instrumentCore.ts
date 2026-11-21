// Curriculum audit 2026-11-19 (CURRICULUM-AUDIT-INSTRUMENTS §3.2, L5–L9; owner OK 2026-11-19): the instrument lessons
// that were missing — walking lines and approach notes, reading the staff on guitar and on bass, the pentatonic boxes,
// first rhythms on the instrument, the piano's left-hand styles. Each opens the path level that first uses it
// (wired in pathWiring.ts). Own words and examples; the drills then measure the playing.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.45): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const melody = (midis: number[], beats: number[], bpm = 90): Stimulus => ({ kind: 'melody', midis, beats, bpm });
/** Notes on one pitch with a click on every beat: [start beat, length in beats]; `beats` = the bar's length. */
function hits(bpm: number, beats: number, at: [number, number][], midi = 60): Stimulus {
  const b = 60 / bpm;
  const clicks: NoteEvent[] = Array.from({ length: beats }, (_, i) => ({ midi: 76, start: i * b, duration: 0.05, velocity: i === 0 ? 0.7 : 0.45, perc: i === 0 ? 'accent' : 'click' }));
  const tones: NoteEvent[] = at.map(([t, d]) => ({ midi, start: t * b, duration: d * b * 0.9, velocity: 0.75 }));
  return { kind: 'events', events: [...clicks, ...tones], length: beats * b + 0.3 };
}

// A minor pentatonic, box 1 (fret 5) and box 2 (frets 7–10), as the guitar sounds them (low E = 40).
const BOX1 = [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72];
const BOX2 = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74];

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ L5. Walking lines and approach notes
  {
    id: 'walk-approach',
    area: 'jazz',
    emoji: '',
    title: { en: 'Walking lines and approach notes', he: 'בס מהלך וצלילי גישה' },
    takeaway: {
      en: 'Chord tones on the strong beats, 1 and 3. On beat 4 an approach note leads into the next root: a half step, the next root’s 5th, or a scale step.',
      he: 'צלילי אקורד על הפעמות החזקות, 1 ו־3. בפעמה 4 צליל גישה מוביל אל השורש הבא: חצי טון, הקווינטה של השורש הבא, או צעד בסולם.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! A walking line plays one note on every beat. It starts simply: the root and the 5th, two notes a bar.', he: 'היי {name}! בס מהלך מנגן צליל אחד בכל פעמה. מתחילים פשוט: השורש והקווינטה, שני צלילים בתיבה.' },
        play: [notes([36, 31, 41, 36], 0.9)],
        show: { text: { en: 'C: R · 5 | F: R · 5', he: 'C: R · 5 | F: R · 5' } },
      },
      {
        say: { en: 'The rule of the walk: chord tones on the strong beats, one and three. Beats two and four may pass between them.', he: 'החוק של הבס המהלך: צלילי אקורד על הפעמות החזקות, אחת ושלוש. פעמות שתיים וארבע יכולות לעבור ביניהם.' },
        play: [notes([36, 38, 40, 43, 41], 0.45)],
        show: { text: { en: '1 & 3 = chord tones', he: '1 ו־3 = צלילי אקורד' } },
      },
      {
        say: { en: 'Beat four aims at the next root. The strongest pull is a half step. From C to F: G, then F sharp, then F.', he: 'פעמה ארבע מכוונת אל השורש הבא. המשיכה החזקה ביותר היא חצי טון. מדו לפה: סול, אחר כך פה דיאז, ואז פה.' },
        play: [notes([36, 40, 43, 42, 41], 0.45)],
        show: { text: { en: 'chromatic: F♯ → F', he: 'כרומטית: F♯ ← F' } },
      },
      {
        say: { en: 'Or play the next root’s 5th on beat four. C leads into F the way G leads into C: a small cadence in one note.', he: 'או מנגנים בפעמה ארבע את הקווינטה של השורש הבא. דו מוביל לפה כמו שסול מוביל לדו: קדנצה קטנה בצליל אחד.' },
        play: [notes([36, 40, 43, 48, 41], 0.45)],
        show: { text: { en: 'dominant: C → F', he: 'דומיננטית: C ← F' } },
      },
      {
        say: { en: 'Or arrive by a step of the scale. Here C, D, E, then G steps down into F.', he: 'או מגיעים בצעד של הסולם. כאן דו, רה, מי, ואז סול יורד בצעד אל פה.' },
        play: [notes([36, 38, 40, 43, 41], 0.45)],
        show: { text: { en: 'scale step: G → F', he: 'צעד בסולם: G ← F' } },
      },
      {
        say: { en: 'Your turn: walk with the band, in every key. On the piano the left hand plays the same line. Every note is measured: chord tones on one and three, an approach on four, even quarters.', he: 'תורכם: בס מהלך עם הלהקה, בכל הסולמות. בפסנתר יד שמאל מנגנת אותו קו. כל צליל נמדד: צלילי אקורד באחת ובשלוש, גישה בארבע, רבעים שווים.' },
        show: { text: { en: '1 · 3 chord tones → 4 approach', he: '1 · 3 צלילי אקורד ← 4 גישה' } },
      },
    ],
    more: [
      {
        say: { en: 'Why chord tones on one and three? Those are the beats the ear checks. When they land on the chord, the band hears the harmony even with no piano playing.', he: 'למה צלילי אקורד באחת ובשלוש? אלה הפעמות שהאוזן בודקת. כשהן נוחתות על האקורד, הלהקה שומעת את ההרמוניה גם בלי פסנתר.' },
        play: [notes([38, 41, 45, 41, 43, 47, 50, 47], 0.4)],
      },
      {
        say: { en: 'From below or from above: choose the side that keeps the line inside your range. Near the low E string, approach from above.', he: 'מלמטה או מלמעלה: בוחרים את הצד ששומר על הקו בתוך הטווח שלכם. ליד מיתר מי הנמוך, ניגשים מלמעלה.' },
        play: [notes([29, 28], 0.6)],
      },
      {
        say: { en: 'The dominant approach is the target’s 5th: a fourth below it or a fifth above it. On the bass, a fourth below sits at the same fret, one string lower.', he: 'הגישה הדומיננטית היא הקווינטה של היעד: קווארטה מתחתיו או קווינטה מעליו. בבס, הקווארטה מתחת יושבת באותו סריג, מיתר אחד נמוך יותר.' },
        play: [notes([31, 36], 0.6), notes([43, 36], 0.6)],
      },
      {
        say: { en: 'Real lines mix all three. A good habit: choose beat four first, then fill one to three. Here is a two-five-one with half steps into each root.', he: 'קווים אמיתיים מערבבים את שלושתן. הרגל טוב: בוחרים קודם את פעמה ארבע, ואז ממלאים אחת עד שלוש. הנה שתיים־חמש־אחת עם חצאי טונים אל כל שורש.' },
        play: [notes([38, 41, 45, 44, 43, 47, 50, 49, 48], 0.4)],
      },
      {
        say: { en: 'The common mistake is reaching the new root late, or a beat early. The approach is a full quarter, and the root arrives exactly on one.', he: 'הטעות הנפוצה היא להגיע לשורש החדש באיחור, או פעמה מוקדם מדי. הגישה היא רבע מלא, והשורש מגיע בדיוק באחת.' },
        show: { text: { en: '4 → 1, on time', he: '4 ← 1, בזמן' } },
      },
      {
        say: { en: 'Practice one chord change at a time, in all twelve keys. Sing the target before you play beat four: when the ear knows where the line is going, the hand follows.', he: 'מתרגלים חילוף אקורד אחד בכל פעם, בכל שנים־עשר הסולמות. שרים את היעד לפני שמנגנים את פעמה ארבע: כשהאוזן יודעת לאן הקו הולך, היד הולכת אחריה.' },
        play: [notes([36, 40, 43, 42, 41], 0.45)],
      },
    ],
  },

  // ------------------------------------------------------------------ L6a. Reading the staff on guitar
  {
    id: 'g-staff-read',
    area: 'play',
    emoji: '',
    title: { en: 'Reading the staff on guitar', he: 'קריאת חמשה בגיטרה' },
    takeaway: {
      en: 'Guitar music is written in the treble clef, an octave above the sound. In position I each finger takes one fret, 1 to 4.',
      he: 'תווים לגיטרה נכתבים במפתח סול, אוקטבה מעל הצליל שנשמע. במצב I כל אצבע לוקחת סריג אחד, 1 עד 4.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! Guitar music is written on one staff, in the treble clef. Each line and each space is one note name.', he: 'היי {name}! תווים לגיטרה נכתבים על חמשה אחת, במפתח סול. כל קו וכל רווח הוא שם של צליל אחד.' },
        play: [notes([52, 53, 55, 57, 59], 0.5)],
        show: { notes: [64, 65, 67, 69, 71], clef: 'treble', written: true },
      },
      {
        say: { en: 'The guitar sounds one octave lower than written. That keeps its low notes close to the staff instead of far below it.', he: 'הגיטרה נשמעת אוקטבה אחת נמוך מהכתוב. כך הצלילים הנמוכים שלה נשארים קרובים לחמשה ולא הרחק מתחתיה.' },
        play: [notes([40], 1.2)],
        show: { notes: [52], clef: 'treble', written: true, text: { en: 'written E · sounds an octave lower', he: 'כתוב מי · נשמע אוקטבה נמוך יותר' } },
      },
      {
        say: { en: 'The open strings, low to high: E, A, D, G, B, E. The low E hangs on three ledger lines; the high E sits in the top space.', he: 'המיתרים הפתוחים, מהנמוך לגבוה: מי, לה, רה, סול, סי, מי. מי הנמוך תלוי על שלושה קווי עזר; מי הגבוה יושב ברווח העליון.' },
        play: [notes([40, 45, 50, 55, 59, 64], 0.5)],
        show: { notes: [52, 57, 62, 67, 71, 76], clef: 'treble', written: true },
      },
      {
        say: { en: 'Position I: the first finger at fret 1, one finger per fret up to fret 4. Strings 3 to 1 first: G and A, then B, C, D, then E, F, G.', he: 'מצב I: האצבע הראשונה בסריג 1, אצבע לכל סריג עד סריג 4. קודם מיתרים 3 עד 1: סול ולה, אחר כך סי, דו, רה, ואז מי, פה, סול.' },
        play: [notes([55, 57, 59, 60, 62, 64, 65, 67], 0.4)],
        show: { notes: [67, 69, 71, 72, 74, 76, 77, 79], clef: 'treble', written: true },
      },
      {
        say: { en: 'Rhythm reads the same as on any instrument: a quarter is one beat, two eighths share a beat. Count aloud while you play.', he: 'המקצב נקרא כמו בכל כלי: רבע הוא פעמה אחת, שתי שמיניות חולקות פעמה. סופרים בקול בזמן שמנגנים.' },
        play: [melody([55, 57, 59, 59, 60, 59], [1, 0.5, 0.5, 1, 0.5, 1.5])],
        show: { notes: [67, 69, 71, 71, 72, 71], durs: [1, 0.5, 0.5, 1, 0.5, 0.5], clef: 'treble', written: true },
      },
      {
        say: { en: 'Your turn: read in position I and play in time. The app hears every pitch and every onset, so read ahead, not note by note.', he: 'תורכם: קוראים במצב I ומנגנים בזמן. האפליקציה שומעת כל גובה וכל כניסה, אז קוראים קדימה, לא צליל אחרי צליל.' },
        show: { text: { en: 'read ahead · keep the beat', he: 'לקרוא קדימה · לשמור על הפעמה' } },
      },
    ],
    more: [
      {
        say: { en: 'Why not just TAB? TAB tells you where to put a finger; the staff tells you what to play and when. The same E can be played in several places on the neck.', he: 'למה לא רק טאבים? הטאב אומר איפה לשים אצבע; החמשה אומרת מה לנגן ומתי. אותו מי אפשר לנגן בכמה מקומות על הצוואר.' },
        play: [notes([64, 64, 64], 0.6)],
        show: { text: { en: 'string 1 open · string 2 fret 5 · string 3 fret 9', he: 'מיתר 1 פתוח · מיתר 2 סריג 5 · מיתר 3 סריג 9' } },
      },
      {
        say: { en: 'A position is named after the fret of the first finger: position V puts the first finger at fret 5. Reading by position keeps the hand still while the eyes stay on the page.', he: 'מצב נקרא על שם הסריג של האצבע הראשונה: מצב V שם את האצבע הראשונה בסריג 5. קריאה לפי מצבים שומרת על יד שקטה בזמן שהעיניים נשארות על הדף.' },
        play: [notes([57, 59, 60, 62, 64], 0.4)],
      },
      {
        say: { en: 'Three landmarks below the staff: the low E on three ledger lines, middle C on one ledger line, and G on the second line. Read the rest as steps from them.', he: 'שלוש נקודות ציון: מי הנמוך על שלושה קווי עזר, דו האמצעי על קו עזר אחד, וסול על הקו השני. את השאר קוראים כצעדים מהן.' },
        play: [notes([40, 48, 55], 0.7)],
        show: { notes: [52, 60, 67], clef: 'treble', written: true },
      },
      {
        say: { en: 'The key signature holds for the whole piece. With one sharp, every F is F sharp, on every string and in every octave.', he: 'סימני ההיתק בתחילת השורה תקפים לכל היצירה. עם דיאז אחד, כל פה הוא פה דיאז, בכל מיתר ובכל אוקטבה.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66, 67], 0.35)],
        show: { notes: [67, 69, 71, 72, 74, 76, 78, 79], key: 'G', clef: 'treble', written: true },
      },
      {
        say: { en: 'The common mistake is looking down at the hand. Keep the eyes on the page and find the frets by feel, one finger for each fret.', he: 'הטעות הנפוצה היא להסתכל למטה על היד. משאירים את העיניים על הדף ומוצאים את הסריגים בתחושה, אצבע לכל סריג.' },
        show: { text: { en: 'eyes on the page', he: 'עיניים על הדף' } },
      },
      {
        say: { en: 'Read a little every day: four bars, slowly, saying the note names. Speed comes later; keeping the beat through a wrong note comes first.', he: 'קוראים קצת כל יום: ארבע תיבות, לאט, ואומרים את שמות הצלילים. המהירות תבוא אחר כך; קודם כול שומרים על הפעמה גם אחרי צליל שגוי.' },
      },
    ],
  },

  // ------------------------------------------------------------------ L6b. Reading the bass clef
  {
    id: 'b-staff-read',
    area: 'play',
    emoji: '',
    title: { en: 'Reading the bass clef', he: 'קריאת מפתח פה בבס' },
    takeaway: {
      en: 'Bass music is written in the bass clef, an octave above the sound. Open strings: E below the staff, A in the bottom space, D on the middle line, G in the top space.',
      he: 'תווים לבס נכתבים במפתח פה, אוקטבה מעל הצליל שנשמע. המיתרים הפתוחים: מי מתחת לחמשה, לה ברווח התחתון, רה על הקו האמצעי, סול ברווח העליון.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! Bass music is written in the bass clef. Its two dots sit around the line of F, which gives the clef its name.', he: 'היי {name}! תווים לבס נכתבים במפתח פה. שתי הנקודות שלו יושבות סביב הקו של פה, ומכאן שמו.' },
        play: [notes([41], 1.2)],
        show: { notes: [53], clef: 'bass', text: { en: 'the F line', he: 'הקו של פה' } },
      },
      {
        say: { en: 'Like the guitar, the bass sounds one octave lower than written. So its low notes stay close to the staff.', he: 'כמו הגיטרה, הבס נשמע אוקטבה אחת נמוך מהכתוב. כך הצלילים הנמוכים שלו נשארים קרובים לחמשה.' },
        play: [notes([28], 1.4)],
        show: { notes: [40], clef: 'bass', text: { en: 'written E · sounds an octave lower', he: 'כתוב מי · נשמע אוקטבה נמוך יותר' } },
      },
      {
        say: { en: 'The open strings: E on a ledger line below the staff, A in the bottom space, D on the middle line, G in the top space.', he: 'המיתרים הפתוחים: מי על קו עזר מתחת לחמשה, לה ברווח התחתון, רה על הקו האמצעי, סול ברווח העליון.' },
        play: [notes([28, 33, 38, 43], 0.7)],
        show: { notes: [40, 45, 50, 55], clef: 'bass' },
      },
      {
        say: { en: 'First position: one finger per fret, frets 1 to 4. On the E string: F, F sharp, G, G sharp. On the A string: B flat, B, C, C sharp.', he: 'מצב ראשון: אצבע לכל סריג, סריגים 1 עד 4. על מיתר מי: פה, פה דיאז, סול, סול דיאז. על מיתר לה: סי במול, סי, דו, דו דיאז.' },
        play: [notes([29, 30, 31, 32, 34, 35, 36, 37], 0.4)],
        show: { notes: [41, 42, 43, 44, 46, 47, 48, 49], clef: 'bass' },
      },
      {
        say: { en: 'The lines of the bass clef, bottom to top: G, B, D, F, A. The spaces: A, C, E, G. Say them once a day until they are automatic.', he: 'הקווים של מפתח פה, מלמטה למעלה: סול, סי, רה, פה, לה. הרווחים: לה, דו, מי, סול. אומרים אותם פעם ביום עד שהם אוטומטיים.' },
        play: [notes([31, 35, 38, 41, 45], 0.5)],
        show: { notes: [43, 47, 50, 53, 57], clef: 'bass' },
      },
      {
        say: { en: 'Your turn: read in first position and play in time. Every note is measured, pitch and onset, so read ahead and keep the beat.', he: 'תורכם: קוראים במצב ראשון ומנגנים בזמן. כל צליל נמדד, גובה וכניסה, אז קוראים קדימה ושומרים על הפעמה.' },
        show: { text: { en: 'read ahead · keep the beat', he: 'לקרוא קדימה · לשמור על הפעמה' } },
      },
    ],
    more: [
      {
        say: { en: 'Why the staff and not only TAB? Charts, big-band parts and theatre books are written on the staff. Reading lets you play a new part right the first time.', he: 'למה חמשה ולא רק טאבים? צ׳ארטים, תפקידים לביג בנד וספרי תיאטרון כתובים על החמשה. קריאה מאפשרת לנגן תפקיד חדש נכון כבר בפעם הראשונה.' },
        play: [notes([33, 36, 38, 40, 43, 40, 38, 36], 0.35)],
      },
      {
        say: { en: 'Four landmarks: low E on its ledger line, D on the middle line, G in the top space, and middle C on one ledger line above the staff.', he: 'ארבע נקודות ציון: מי הנמוך על קו העזר שלו, רה על הקו האמצעי, סול ברווח העליון, ודו האמצעי על קו עזר אחד מעל החמשה.' },
        play: [notes([28, 38, 43, 48], 0.6)],
        show: { notes: [40, 50, 55, 60], clef: 'bass' },
      },
      {
        say: { en: 'On the upright the low positions use three fingers, 1, 2 and 4, because the notes lie farther apart. Two frets’ worth, a whole step, fills the hand.', he: 'בקונטרבס המצבים הנמוכים משתמשים בשלוש אצבעות, 1, 2 ו־4, כי הצלילים רחוקים יותר זה מזה. טון שלם ממלא את כף היד.' },
        play: [notes([33, 34, 35], 0.6)],
      },
      {
        say: { en: 'Some levels ask only for rhythm on one string. Count aloud, one and two and, and keep the click in your body, not only in your ears.', he: 'יש שלבים שמבקשים רק מקצב על מיתר אחד. סופרים בקול, 1 וְ 2 וְ, ומרגישים את הקליק בגוף, לא רק באוזניים.' },
        play: [hits(90, 4, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]], 33)],
      },
      {
        say: { en: 'The common mistake is guessing from the shape of the line. Name the first note, then read each move as a step or a skip, up or down.', he: 'הטעות הנפוצה היא לנחש לפי צורת הקו. קוראים בשם לצליל הראשון, ואז קוראים כל תנועה כצעד או כדילוג, למעלה או למטה.' },
        show: { text: { en: 'name the first note · then steps and skips', he: 'שם לצליל הראשון · ואז צעדים ודילוגים' } },
      },
      {
        say: { en: 'Read four bars a day, first in a key you know, then with a new key signature. Short and daily beats long and rare.', he: 'קוראים ארבע תיבות ביום, קודם בסולם מוכר, ואחר כך עם סימני היתק חדשים. קצר ויומיומי עדיף על ארוך ונדיר.' },
      },
    ],
  },

  // ------------------------------------------------------------------ L7. Pentatonic boxes on guitar
  {
    id: 'g-pent-boxes',
    area: 'play',
    emoji: '',
    title: { en: 'Pentatonic boxes on guitar', he: 'תיבות פנטטוניות בגיטרה' },
    takeaway: {
      en: 'Five notes, five boxes: each box joins the next. The same boxes are a minor pentatonic from one root and a major pentatonic from the note three frets up.',
      he: 'חמישה צלילים, חמש תיבות: כל תיבה מתחברת לבאה. אותן תיבות הן פנטטוני מינורי משורש אחד ופנטטוני מז׳ורי מהצליל שנמצא שלושה סריגים מעליו.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! The minor pentatonic has five notes. In A: A, C, D, E, G. It has no half steps, so almost nothing in it sounds wrong.', he: 'היי {name}! לפנטטוני המינורי יש חמישה צלילים. בלה: לה, דו, רה, מי, סול. אין בו חצאי טונים, ולכן כמעט שום צליל בו לא נשמע שגוי.' },
        play: [notes([45, 48, 50, 52, 55, 57], 0.4)],
        show: { text: { en: 'A C D E G', he: 'A C D E G' } },
      },
      {
        say: { en: 'A box is those notes under one hand, two on every string. Box 1: the first finger at fret 5, with the root under it on string 6.', he: 'תיבה היא הצלילים האלה מתחת ליד אחת, שניים בכל מיתר. תיבה 1: האצבע הראשונה בסריג 5, והשורש מתחתיה על מיתר 6.' },
        play: [notes(BOX1, 0.25)],
        show: { notes: BOX1 },
      },
      {
        say: { en: 'Frets 5 and 8 take the first and fourth fingers; frets 5 and 7 take the first and third. The roots, on strings 6, 4 and 1, are your map.', he: 'סריגים 5 ו־8 בידי האצבע הראשונה והרביעית; סריגים 5 ו־7 בידי הראשונה והשלישית. השורשים, על מיתרים 6, 4 ו־1, הם המפה שלכם.' },
        play: [notes([45, 57, 69], 0.6)],
        show: { text: { en: 'roots: string 6 · 4 · 1', he: 'שורשים: מיתר 6 · 4 · 1' } },
      },
      {
        say: { en: 'The top notes of box 1 are the bottom notes of box 2. Box by box, five shapes climb the neck, and box 1 returns at fret 17.', he: 'הצלילים העליונים של תיבה 1 הם הצלילים התחתונים של תיבה 2. תיבה אחרי תיבה, חמש צורות מטפסות על הצוואר, ותיבה 1 חוזרת בסריג 17.' },
        play: [notes(BOX2, 0.25)],
        show: { text: { en: '1 → 2 → 3 → 4 → 5 → 1', he: '1 ← 2 ← 3 ← 4 ← 5 ← 1' } },
      },
      {
        say: { en: 'The same notes from C are C major pentatonic: C, D, E, G, A. Same boxes, a new home three frets up.', he: 'אותם צלילים מדו הם הפנטטוני של דו מז׳ור: דו, רה, מי, סול, לה. אותן תיבות, בית חדש שלושה סריגים למעלה.' },
        play: [chord([48, 52, 55], 0.9), notes([48, 50, 52, 55, 57, 60], 0.35)],
        show: { text: { en: 'A minor pent = C major pent', he: 'פנטטוני לה מינור = פנטטוני דו מז׳ור' } },
      },
      {
        say: { en: 'Your turn: box 1 in A, slowly and in free time first, then the tempo ladder, then every key. The root on string 6 tells you where the box starts.', he: 'תורכם: תיבה 1 בלה, לאט ובזמן חופשי קודם, אחר כך סולם הטמפו, ואז כל הסולמות. השורש על מיתר 6 אומר איפה התיבה מתחילה.' },
        show: { text: { en: 'root on string 6 = the box', he: 'שורש על מיתר 6 = התיבה' } },
      },
    ],
    more: [
      {
        say: { en: 'Why boxes? A solo needs notes that sit under the hand at speed. The five boxes cover the whole neck, and in each one the root lies in a new place.', he: 'למה תיבות? סולו צריך צלילים שיושבים מתחת ליד גם במהירות. חמש התיבות מכסות את כל הצוואר, ובכל אחת השורש נמצא במקום אחר.' },
        play: [notes([69, 67, 64, 62, 60, 57], 0.3)],
      },
      {
        say: { en: 'Join two boxes with a slide. In box 1, slide on string 3 from fret 7 to fret 9, and the hand is in box 2.', he: 'מחברים שתי תיבות בהחלקה. בתיבה 1, מחליקים על מיתר 3 מסריג 7 לסריג 9, והיד כבר בתיבה 2.' },
        play: [notes([57, 60, 62, 64, 67], 0.35)],
      },
      {
        say: { en: 'Minor root, then three frets up, the major root: A minor and C major, E minor and G major. Over a C chord, land on C; over A minor, land on A.', he: 'שורש מינורי, ושלושה סריגים מעליו השורש המז׳ורי: לה מינור ודו מז׳ור, מי מינור וסול מז׳ור. מעל אקורד דו נוחתים על דו; מעל לה מינור נוחתים על לה.' },
        play: [chord([45, 52, 57, 60], 0.9), notes([64, 62, 60, 57], 0.35)],
      },
      {
        say: { en: 'Later levels add the blues note, the flat five, and the major pentatonic as a sound of its own. Box 1 stays the map they hang on.', he: 'שלבים מאוחרים יותר מוסיפים את צליל הבלוז, ה־♭5, ואת הפנטטוני המז׳ורי כצליל בפני עצמו. תיבה 1 נשארת המפה שעליה הכול נתלה.' },
        play: [notes([45, 48, 50, 51, 52, 55, 57], 0.3)],
      },
      {
        say: { en: 'The common mistake is running up and down without landing anywhere. End each phrase on a root or a chord tone, and always know which dot is home.', he: 'הטעות הנפוצה היא לרוץ למעלה ולמטה בלי לנחות בשום מקום. מסיימים כל משפט על שורש או על צליל של האקורד, ותמיד יודעים איזו נקודה היא הבית.' },
        show: { text: { en: 'land on home', he: 'לנחות על הבית' } },
      },
      {
        say: { en: 'Learn one box a week: up, down, then short phrases inside it. Then join it to the box before. Say the root’s name each time you pass it.', he: 'לומדים תיבה אחת בשבוע: למעלה, למטה, ואז משפטים קצרים בתוכה. אחר כך מחברים אותה לתיבה שלפניה. אומרים את שם השורש בכל פעם שעוברים עליו.' },
      },
    ],
  },

  // ------------------------------------------------------------------ L8. First rhythms on the instrument
  {
    id: 'first-rhythms',
    area: 'rhythm',
    emoji: '',
    title: { en: 'First rhythms on your instrument', he: 'מקצבים ראשונים על הכלי' },
    takeaway: {
      en: 'A quarter is one beat, two eighths share a beat, a rest is a silence you count. Count aloud: 1 & 2 &.',
      he: 'רבע הוא פעמה אחת, שתי שמיניות חולקות פעמה, הפסקה היא שקט שסופרים. סופרים בקול: 1 וְ 2 וְ.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! Rhythm starts with the beat, a steady pulse you can count. Count one, two, three, four, and play one note on each.', he: 'היי {name}! מקצב מתחיל בפעמה, דופק יציב שאפשר לספור. סופרים אחת, שתיים, שלוש, ארבע, ומנגנים צליל אחד על כל אחת.' },
        play: [hits(80, 4, [[0, 1], [1, 1], [2, 1], [3, 1]])],
        show: { notes: [60, 60, 60, 60], durs: [1, 1, 1, 1], text: { en: '1 2 3 4', he: '1 2 3 4' } },
      },
      {
        say: { en: 'Eighth notes split each beat in two. Count one and, two and, and play on every number and on every and.', he: 'שמיניות מחלקות כל פעמה לשתיים. סופרים 1 וְ, 2 וְ, ומנגנים על כל מספר ועל כל וְ.' },
        play: [hits(80, 4, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t): [number, number] => [t, 0.5]))],
        show: { notes: [60, 60, 60, 60, 60, 60, 60, 60], durs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], text: { en: '1 & 2 & 3 & 4 &', he: '1 וְ 2 וְ 3 וְ 4 וְ' } },
      },
      {
        say: { en: 'A rest is a silence you count. A quarter rest lasts one whole beat: keep counting, and keep the hand ready for the next note.', he: 'הפסקה היא שקט שסופרים. הפסקת רבע נמשכת פעמה שלמה: ממשיכים לספור, והיד מוכנה לצליל הבא.' },
        play: [hits(80, 4, [[0, 1], [2, 1]])],
        show: { text: { en: 'note · rest · note · rest', he: 'צליל · הפסקה · צליל · הפסקה' } },
      },
      {
        say: { en: 'Now mix them: a quarter, two eighths, a quarter, then a rest. Say the counting aloud as you play; your voice keeps your hands honest.', he: 'עכשיו מערבבים: רבע, שתי שמיניות, רבע, ואז הפסקה. אומרים את הספירה בקול בזמן שמנגנים; הקול שומר על הידיים ישרות.' },
        play: [hits(80, 4, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]])],
        show: { notes: [60, 60, 60, 60], durs: [1, 0.5, 0.5, 1], text: { en: '1  2 &  3  (4)', he: '1  2 וְ  3  (4)' } },
      },
      {
        say: { en: 'On guitar, mute the strings and strum. On bass, use one open string. On keys, one key. Only the rhythm counts here.', he: 'בגיטרה, משתיקים את המיתרים ופורטים. בבס, מיתר פתוח אחד. בקלידים, קליד אחד. כאן רק המקצב נחשב.' },
        play: [hits(80, 4, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]], 40)],
      },
      {
        say: { en: 'Your turn: play with the click. The app measures every onset against the beat, so a clean rest counts as much as a clean note.', he: 'תורכם: מנגנים עם הקליק. האפליקציה מודדת כל כניסה מול הפעמה, אז הפסקה נקייה שווה כמו צליל נקי.' },
        show: { text: { en: 'count aloud · play with the click', he: 'לספור בקול · לנגן עם הקליק' } },
      },
    ],
    more: [
      {
        say: { en: 'Why count aloud? The voice is a second clock. When you say “and”, the hand knows exactly where the half beat is.', he: 'למה לספור בקול? הקול הוא שעון שני. כשאומרים "וְ", היד יודעת בדיוק איפה חצי הפעמה.' },
        play: [hits(80, 4, [[0.5, 0.5], [1.5, 0.5], [2.5, 0.5], [3.5, 0.5]])],
      },
      {
        say: { en: 'On guitar and bass a rest means muting. Lift the fretting finger off the fret while it still touches the string, or touch the string with the plucking hand.', he: 'בגיטרה ובבס הפסקה פירושה השתקה. מרימים את האצבע הלוחצת מהסריג בזמן שהיא עדיין נוגעת במיתר, או נוגעים במיתר ביד הפורטת.' },
        play: [hits(80, 4, [[0, 0.5], [1, 0.5], [2, 0.5], [3, 0.5]], 45)],
      },
      {
        say: { en: 'An eighth rest takes half a beat. Rest on the number and play on the and: that off-beat is the sound of reggae and ska.', he: 'הפסקת שמינית לוקחת חצי פעמה. שותקים על המספר ומנגנים על ה־וְ: הנגינה בין הפעמות היא הצליל של רגאיי וסקא.' },
        play: [hits(90, 4, [[0.5, 0.5], [1.5, 0.5], [2.5, 0.5], [3.5, 0.5]], 55)],
      },
      {
        say: { en: 'Tempo is a choice, not a test. Start slow enough to play every rest cleanly, then let the tempo ladder raise it a little at a time.', he: 'טמפו הוא בחירה, לא מבחן. מתחילים לאט מספיק כדי לנגן כל הפסקה נקי, ואז סולם הטמפו מעלה אותו קצת בכל פעם.' },
        play: [hits(60, 4, [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]])],
      },
      {
        say: { en: 'The common mistake is rushing after a rest. Count the silence as carefully as the notes; the next note arrives exactly on its beat.', he: 'הטעות הנפוצה היא למהר אחרי הפסקה. סופרים את השקט באותה הקפדה כמו את הצלילים; הצליל הבא מגיע בדיוק על הפעמה שלו.' },
        show: { text: { en: 'count the silence', he: 'לספור את השקט' } },
      },
      {
        say: { en: 'To keep: quarters on the beat, eighths on the number and the and, every rest counted, and the voice and the hand together.', he: 'מה לזכור: רבעים על הפעמה, שמיניות על המספר ועל ה־וְ, כל הפסקה נספרת, והקול והיד יחד.' },
        show: { text: { en: '♩ = 1 · ♫ = 1 & · rest = counted', he: '♩ = 1 · ♫ = 1 וְ · הפסקה = נספרת' } },
      },
    ],
  },

  // ------------------------------------------------------------------ L9. Piano left-hand styles
  {
    id: 'piano-lh-styles',
    area: 'play',
    emoji: '',
    title: { en: 'Left-hand styles at the piano', he: 'סגנונות יד שמאל בפסנתר' },
    takeaway: {
      en: 'Root and 5th, the Alberti bass, stride, shells: four ways for one hand to give both the bass and the harmony.',
      he: 'שורש וקווינטה, בס אלברטי, סטרייד, שלדים: ארבע דרכים ליד אחת לתת גם את הבס וגם את ההרמוניה.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! Under a melody the left hand has two jobs: the bass and the harmony. The simplest way is the root and the 5th.', he: 'היי {name}! מתחת למנגינה ליד שמאל יש שתי עבודות: הבס וההרמוניה. הדרך הפשוטה ביותר היא השורש והקווינטה.' },
        play: [chord([36, 43], 0.9), chord([36, 43], 0.9), chord([41, 48], 0.9), chord([36, 43], 0.9)],
        show: { notes: [36, 43], chord: true, clef: 'bass', text: { en: 'R + 5', he: 'R + 5' } },
      },
      {
        say: { en: 'The Alberti bass breaks the chord: low, high, middle, high. In C: C, G, E, G. Classical sonatas are full of it.', he: 'בס אלברטי שובר את האקורד: נמוך, גבוה, אמצעי, גבוה. בדו: דו, סול, מי, סול. הסונטות הקלאסיות מלאות בו.' },
        play: [notes([48, 55, 52, 55, 48, 55, 52, 55], 0.25)],
        show: { notes: [48, 55, 52, 55], clef: 'bass', durs: [0.5, 0.5, 0.5, 0.5] },
      },
      {
        say: { en: 'Stride: a low bass note on beats one and three, a chord in the middle on two and four. The jump between them is the skill.', he: 'סטרייד: צליל בס נמוך בפעמות אחת ושלוש, אקורד באמצע בשתיים ובארבע. הקפיצה ביניהם היא המיומנות.' },
        play: [chord([36], 0.5), chord([52, 55, 60], 0.5), chord([31], 0.5), chord([52, 55, 60], 0.5), chord([36], 0.5), chord([52, 55, 60], 0.5)],
        show: { text: { en: 'bass · chord · bass · chord', he: 'בס · אקורד · בס · אקורד' } },
      },
      {
        say: { en: 'Shells, for jazz: the root plus the 3rd or the 7th. D minor 7 takes D and C, G7 takes G and B, C major 7 takes C and B.', he: 'שלדים, לג׳אז: השורש ועוד הטרצה או הספטימה. Dm7 לוקח רה ודו, G7 לוקח סול וסי, Cmaj7 לוקח דו וסי.' },
        play: [chord([38, 48], 0.9), chord([43, 47], 0.9), chord([36, 47], 1.2)],
        show: { text: { en: 'Dm7 1-7 · G7 1-3 · Cmaj7 1-7', he: 'Dm7 1-7 · G7 1-3 · Cmaj7 1-7' } },
      },
      {
        say: { en: 'Your turn: each new pattern starts slowly, in free time where the notes are new, then climbs the tempo ladder in all twelve keys. Keep the left hand softer than the melody.', he: 'תורכם: כל תבנית חדשה מתחילה לאט, בזמן חופשי כשהצלילים חדשים, ואז מטפסת בסולם הטמפו בכל שנים־עשר הסולמות. יד שמאל שקטה יותר מהמנגינה.' },
        show: { text: { en: 'slow · free · then the ladder', he: 'לאט · חופשי · ואז הסולם' } },
      },
    ],
    more: [
      {
        say: { en: 'Boogie-woogie walks the chord in eighths: C, E, G, A, B flat, A, G, E. Eight notes, one bar, over and over, under a bluesy right hand.', he: 'בוגי־ווגי הולך על האקורד בשמיניות: דו, מי, סול, לה, סי במול, לה, סול, מי. שמונה צלילים, תיבה אחת, שוב ושוב, מתחת ליד ימין בלוזית.' },
        play: [notes([36, 40, 43, 45, 46, 45, 43, 40], 0.22)],
      },
      {
        say: { en: 'The left hand can also walk: one note per beat, chord tones on one and three, an approach note into the next root. The walking lesson shows how.', he: 'יד שמאל יכולה גם ללכת: צליל אחד בכל פעמה, צלילי אקורד באחת ובשלוש, צליל גישה אל השורש הבא. השיעור על בס מהלך מראה איך.' },
        play: [notes([36, 40, 43, 42, 41], 0.45)],
      },
      {
        say: { en: 'Keep left-hand chords above the C below middle C. Lower down, 3rds turn muddy; down there play single notes, 5ths and octaves.', he: 'שומרים את האקורדים של יד שמאל מעל הדו שמתחת לדו האמצעי. נמוך יותר, טרצות נשמעות עכורות; שם מנגנים צלילים בודדים, קווינטות ואוקטבות.' },
        play: [chord([31, 35, 38], 1), chord([48, 52, 55], 1)],
      },
      {
        say: { en: 'Pop left hands are simple: the root in octaves, or root, 5th and octave, often in eighths under the chords of the right hand.', he: 'יד שמאל בפופ פשוטה: השורש באוקטבות, או שורש, קווינטה ואוקטבה, הרבה פעמים בשמיניות מתחת לאקורדים של יד ימין.' },
        play: [notes([36, 43, 48, 43, 41, 48, 53, 48], 0.25)],
      },
      {
        say: { en: 'The common mistake is a left hand as loud as the melody. Play the left hand alone, then bring it one level down under the right.', he: 'הטעות הנפוצה היא יד שמאל חזקה כמו המנגינה. מנגנים את יד שמאל לבד, ואז מורידים אותה דרגה אחת מתחת לימנית.' },
        show: { text: { en: 'left hand: one level softer', he: 'יד שמאל: דרגה אחת שקטה יותר' } },
      },
      {
        say: { en: 'Practice the left hand alone until it runs without thought, then add the melody one bar at a time. Every style here goes into all twelve keys.', he: 'מתרגלים את יד שמאל לבד עד שהיא רצה בלי מחשבה, ואז מוסיפים את המנגינה תיבה אחרי תיבה. כל סגנון כאן עובר לכל שנים־עשר הסולמות.' },
      },
    ],
  },
];

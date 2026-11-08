// Quick lessons for the 0.38 topics (spec AE): pitch and voice — singing intervals.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const note = (midi: number, duration = 1.2): Stimulus => ({ kind: 'note', midi, duration });
const notes = (midis: number[], each = 0.6): Stimulus => ({ kind: 'notes', midis, each });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });

export const LESSONS: MiniLesson[] = [
  {
    id: 'sing-intervals',
    area: 'voice',
    emoji: '🎯',
    title: { en: 'Sing an interval', he: 'לשיר מרווח' },
    takeaway: {
      en: 'Hold the given note in your ear, feel the distance, then land on the new note. Thirds, fifths and octaves are your anchors; every other interval sits near one of them.',
      he: 'החזיקו את הצליל הנתון באוזן, הרגישו את המרחק ונחתו על הצליל החדש. טרצה, קווינטה ואוקטבה הן העוגנים; כל מרווח אחר יושב ליד אחד מהם.',
    },
    steps: [
      {
        say: { en: 'Hi {name}! Listen: one note, then a note a fifth above it. Hum the first one, then let your voice open up to the second.', he: 'היי {name}! הקשיבו: צליל אחד, ואז צליל שנמצא קווינטה מעליו. זמזמו את הראשון, ואז תנו לקול להיפתח אל השני.' },
        play: [note(55), notes([55, 62], 0.8)],
        playFirst: true,
        show: { notes: [55, 62], text: { en: 'G → D: a fifth up', he: 'סול ← רה: קווינטה למעלה' } },
      },
      {
        say: { en: 'A third is a smaller step: the first two notes of a major chord. An octave is the same note, higher — it feels like coming home up there.', he: 'טרצה היא צעד קטן יותר: שני הצלילים הראשונים של אקורד מז׳ור. אוקטבה היא אותו צליל, רק גבוה — מרגיש כמו לחזור הביתה, למעלה.' },
        play: [notes([55, 59], 0.7), rest(0.4), notes([55, 67], 0.7)],
      },
      {
        say: { en: 'The trick: sing the notes in between quietly in your head. From the given note, count up the scale until you reach the interval, then sing only the last note out loud.', he: 'הטריק: שירו בשקט בראש את הצלילים שבאמצע. מהצליל הנתון, עלו בסולם עד שמגיעים למרווח, ואז שירו בקול רק את הצליל האחרון.' },
        play: [notes([55, 57, 59, 60, 62], 0.35), rest(0.3), notes([55, 62], 0.8)],
      },
      {
        say: { en: 'Going down is harder, because the voice likes to climb. Hear a note, then a third below it. Lean down gently, do not drop.', he: 'למטה זה קשה יותר, כי הקול אוהב לטפס. שמעו צליל, ואז טרצה מתחתיו. רדו בעדינות, בלי ליפול.' },
        play: [note(64), notes([64, 60], 0.8)],
      },
      {
        say: { en: 'Inside a key you will hear the home chord first. Then you get a note that is not home, and you sing the interval from there. Keep the key in your ear while you sing.', he: 'בתוך סולם תשמעו קודם את אקורד הבית. אחר כך תקבלו צליל שאינו הבית, ותשירו ממנו את המרווח. שמרו את הסולם באוזן בזמן שאתם שרים.' },
        play: [{ kind: 'chord', midis: [48, 55, 60, 64], duration: 1.2 }, rest(0.3), notes([62, 65], 0.8)],
      },
    ],
    more: [
      {
        say: { en: 'An interval is the distance between two pitches. Its number counts letter names, both ends included: C to E is a third, C, D, E. Its quality comes from half steps: four make a major third, three a minor third.', he: 'מרווח הוא המרחק בין שני צלילים. המספר שלו סופר שמות צלילים, כולל שני הקצוות: דו עד מי זו טרצה — דו, רה, מי. הסוג נקבע לפי חצאי טון: ארבעה הם טרצה גדולה, שלושה טרצה קטנה.' },
        play: [notes([60, 64], 0.7), rest(0.3), notes([60, 63], 0.7)],
        show: { notes: [60, 63, 64], text: { en: 'M3 = 4 · m3 = 3', he: 'M3 = 4 · m3 = 3' } },
      },
      {
        say: { en: 'The full set, in half steps: minor and major seconds 1 and 2, thirds 3 and 4, the perfect fourth 5, the tritone 6, the perfect fifth 7, sixths 8 and 9, sevenths 10 and 11, the octave 12.', he: 'כל המרווחים, בחצאי טון: סקונדה קטנה וגדולה 1 ו־2, טרצות 3 ו־4, קוורטה זכה 5, טריטון 6, קווינטה זכה 7, סקסטות 8 ו־9, ספטימות 10 ו־11, אוקטבה 12.' },
        show: { text: { en: '1 2 · 3 4 · 5 · 6 · 7 · 8 9 · 10 11 · 12', he: '1 2 · 3 4 · 5 · 6 · 7 · 8 9 · 10 11 · 12' } },
      },
      {
        say: { en: 'Build the rest from your anchors: 1, 3, 5 and 8. A fourth is one step below the fifth; a sixth is one step above it; a seventh is one step below the octave. Hear C to F, then C to A.', he: 'בנו את השאר מהעוגנים: 1, 3, 5 ו־8. קוורטה היא צעד מתחת לקווינטה; סקסטה היא צעד מעליה; ספטימה היא צעד מתחת לאוקטבה. הקשיבו לדו–פה, ואז לדו–לה.' },
        play: [notes([60, 65], 0.7), rest(0.3), notes([60, 69], 0.7)],
        show: { notes: [60, 65, 69], text: { en: '4 = 5 − step · 6 = 5 + step', he: '4 = 5 פחות צעד · 6 = 5 ועוד צעד' } },
      },
      {
        say: { en: 'Before you sing, audiate: hear the target clearly inside, then sing it. Some musicians tie intervals to famous openings: Twinkle, Twinkle leaps up a fifth, Wagner\'s Bridal Chorus starts with a fourth, and Over the Rainbow opens with an octave.', he: 'לפני ששרים, שמעו בפנים: דמיינו את היעד בבירור, ואז שירו. יש מוזיקאים שקושרים מרווחים לפתיחות מפורסמות: "נצנץ נצנץ כוכב קטן" קופץ קווינטה למעלה, מקהלת הכלולות של וגנר מתחילה בקוורטה, ו־Over the Rainbow נפתח באוקטבה.' },
        play: [notes([60, 67], 0.7), rest(0.3), notes([60, 72], 0.7)],
        show: { notes: [60, 67, 72], text: { en: 'hear it → sing it', he: 'לשמוע ← לשיר' } },
      },
      {
        say: { en: 'Descending intervals feel different, so practice them on their own. Hear the top note as a degree: a fifth down is often 5 falling to 1, the sound of a bass line coming home.', he: 'מרווחים יורדים מרגישים אחרת, אז תרגלו אותם בנפרד. שמעו את הצליל העליון כדרגה: קווינטה למטה היא לעיתים קרובות 5 שיורד ל־1, הצליל של קו בס שחוזר הביתה.' },
        play: [notes([67, 60], 0.8)],
        show: { notes: [67, 60], text: { en: '5 → 1', he: '5 ← 1' } },
      },
      {
        say: { en: 'Inside a key, the quality depends on where you start. In C major, a third up from C is E, a major third; a third up from D is F, a minor third. Let the key choose, unless the exercise names the quality.', he: 'בתוך סולם, הסוג תלוי מאיפה מתחילים. בדו מז׳ור, טרצה מעל דו היא מי, טרצה גדולה; טרצה מעל רה היא פה, טרצה קטנה. תנו לסולם לבחור, אלא אם התרגיל מציין את הסוג.' },
        play: [{ kind: 'chord', midis: [48, 55, 60, 64], duration: 1 }, rest(0.3), notes([60, 64], 0.6), rest(0.3), notes([62, 65], 0.6)],
        show: { notes: [60, 62, 64, 65], key: 'C', text: { en: 'C–E major · D–F minor', he: 'דו–מי גדולה · רה–פה קטנה' } },
      },
      {
        say: { en: 'Common mistakes: wide leaps up land flat, minor and major get swapped, and the counting trick stays too slow. Use it to learn, then jump straight to the target.', he: 'טעויות נפוצות: קפיצות רחבות למעלה נוחתות נמוך מדי, קטן וגדול מתחלפים, וטריק הספירה נשאר איטי מדי. השתמשו בו כדי ללמוד, ואז קפצו ישר אל היעד.' },
        show: { text: { en: 'count to learn · jump to sing', he: 'סופרים כדי ללמוד · קופצים כדי לשיר' } },
      },
      {
        say: { en: 'To keep: the number from letters, the quality from half steps, anchors on 1, 3, 5 and 8, and hear it before you sing it.', he: 'לזכור: המספר לפי שמות הצלילים, הסוג לפי חצאי טון, עוגנים על 1, 3, 5 ו־8 — ולשמוע לפני ששרים.' },
        show: { text: { en: 'letters · half steps · anchors', he: 'שמות · חצאי טון · עוגנים' } },
      },
    ],
  },
];
/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = { 'topic:sing-intervals': 'sing-intervals' };

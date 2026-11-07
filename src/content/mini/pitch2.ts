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
  },
];
/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = { 'topic:sing-intervals': 'sing-intervals' };

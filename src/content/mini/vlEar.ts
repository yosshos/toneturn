// Voice leading by ear (docs/AUDIT-CONTENT-THEORY.md §ה.2): the quick lesson before the 'vl-ear' topic. Every fact
// matches its generator (src/engine/topicsVoiceLeadEar.ts).
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { vl251Stim } from '../../engine/topicsVoiceLeadEar';

const chord = (midis: number[], duration = 1.3): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });
/** Two chords, bass + upper voices. */
const pair = (a: number[], b: number[]): Stimulus[] => [chord(a), rest(0.25), chord(b, 1.6)];

// C (C E G over C) and its neighbours, each voice to the nearest note.
const C = [48, 60, 64, 67];
const Am = [45, 60, 64, 69]; // a 3rd: C and E stay
const F = [41, 60, 65, 69]; // a 5th: C stays
const Dm = [50, 62, 65, 69]; // a step: nothing stays

export const LESSONS: MiniLesson[] = [
  {
    id: 'vl-ear',
    area: 'harmony',
    emoji: 'S',
    title: { en: 'Voice leading by ear', he: 'הובלת קולות בשמיעה' },
    takeaway: {
      en: 'Each note of a chord moves to a note of the next. Shared notes stay, the rest move by step. Chords a 3rd apart keep two notes, a 5th apart one, a step apart none.',
      he: 'כל צליל באקורד עובר לצליל באקורד הבא. צלילים משותפים נשארים, השאר זזים בצעד. אקורדים במרחק טרצה שומרים שני צלילים, במרחק קווינטה אחד, במרחק צעד אף אחד.',
    },
    steps: [
      {
        say: { en: 'Voice leading is how each note of one chord moves to the next. Good voice leading keeps shared notes and moves the rest by step.', he: 'הובלת קולות היא האופן שבו כל צליל באקורד עובר לאקורד הבא. הובלה טובה משאירה צלילים משותפים ומזיזה את השאר בצעד.' },
        play: pair(C, Am),
        show: { text: { en: 'C → Am: C and E stay', he: 'C → Am: דו ומי נשארים' } },
      },
      {
        say: { en: 'Four voices: soprano on top, then alto, tenor, and the bass at the bottom. Here only the alto moves.', he: 'ארבעה קולות: סופרן למעלה, אחריו אלט, טנור, והבס למטה. כאן רק האלט זז.' },
        play: pair(C, [48, 60, 65, 67]),
        show: { text: { en: 'S · A · T · B', he: 'S · A · T · B' } },
      },
      {
        say: { en: 'Count what stays. Chords a 3rd apart share two notes, a 5th apart one, a step apart none.', he: 'ספרו מה נשאר. אקורדים במרחק טרצה חולקים שני צלילים, במרחק קווינטה אחד, במרחק צעד אף אחד.' },
        play: [...pair(C, Am), rest(), ...pair(C, F), rest(), ...pair(C, Dm)],
        show: { text: { en: '3rd: 2 · 5th: 1 · step: 0', he: 'טרצה: 2 · קווינטה: 1 · צעד: 0' } },
      },
      {
        say: { en: 'In a ii–V–I, smooth voice leading moves each voice a step or holds it. Jumpy voice leading plays every chord in root position, so the hand leaps.', he: 'ב־ii–V–I, הובלה חלקה מזיזה כל קול בצעד או משאירה אותו. הובלה קופצנית מנגנת כל אקורד במצב יסודי, והיד קופצת.' },
        play: [...vl251Stim(0, 'smooth'), rest(0.8), ...vl251Stim(0, 'jumpy')],
        show: { text: { en: 'smooth · jumpy', he: 'חלקה · קופצנית' } },
      },
      {
        say: { en: 'Drop 2 takes the second note from the top an octave down: the same chords, wider and more open. Your turn.', he: 'דרופ 2 מוריד את הצליל השני מלמעלה אוקטבה: אותם אקורדים, רחבים ופתוחים יותר. תורכם.' },
        play: [...vl251Stim(0, 'smooth'), rest(0.8), ...vl251Stim(0, 'drop2')],
        show: { text: { en: 'close · drop 2', he: 'מצב קרוב · דרופ 2' } },
      },
    ],
    more: [
      {
        say: { en: 'Why it matters: smooth lines are easier to sing and to play, and the harmony sounds connected instead of stacked. Arrangers check it chord by chord.', he: 'למה זה חשוב: קווים חלקים קלים יותר לשירה ולנגינה, וההרמוניה נשמעת מחוברת ולא כמו ערימת אקורדים. מעבדים בודקים את זה אקורד אחר אקורד.' },
      },
      {
        say: { en: 'In a ii–V–I the 7th of each chord falls a half step to the 3rd of the next. Listen for that slide inside the chords.', he: 'ב־ii–V–I הספטימה של כל אקורד יורדת חצי טון לטרצה של הבא. הקשיבו להחלקה הזאת בתוך האקורדים.' },
        play: vl251Stim(0, 'smooth'),
        show: { text: { en: 'Dm7 → G7 → Cmaj7: C → B, F → E', he: 'Dm7 → G7 → Cmaj7: דו → סי, פה → מי' } },
      },
      {
        say: { en: 'To hear which voice moved, sing the top note of both chords, then the bass. If neither changed, the move is inside: alto or tenor.', he: 'כדי לשמוע איזה קול זז, שירו את הצליל העליון של שני האקורדים, ואחר כך את הבס. אם אף אחד מהם לא השתנה, התנועה בפנים: אלט או טנור.' },
      },
      {
        say: { en: 'The common mistake: hearing a new chord and assuming everything moved. Often two notes stay put and only the colour changes. Listen for the notes that ring on.', he: 'הטעות הנפוצה: לשמוע אקורד חדש ולהניח שהכול זז. לעיתים קרובות שני צלילים נשארים במקום, ורק הצבע משתנה. הקשיבו לצלילים שממשיכים לצלצל.' },
        play: pair(C, Am),
      },
      {
        say: { en: 'You hear it in Bach chorales, in choir writing, and in jazz piano and guitar, where drop 2 is the standard voicing under a melody.', he: 'שומעים את זה בכוראלים של באך, בכתיבה למקהלה, ובפסנתר ובגיטרה של ג׳אז, שם דרופ 2 הוא הוויסינג המקובל מתחת למנגינה.' },
        play: vl251Stim(5, 'drop2'),
      },
      {
        say: { en: 'To keep: hold the shared notes, move the rest by step, count what stays. Drop 2 is close position opened up: the same notes, the same top.', he: 'מה לזכור: משאירים את הצלילים המשותפים, מזיזים את השאר בצעד, וסופרים מה נשאר. דרופ 2 הוא מצב קרוב שנפתח: אותם צלילים, אותו צליל עליון.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:vl-ear': 'vl-ear',
};

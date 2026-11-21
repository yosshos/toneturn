// BH-G (docs/AUDIT-CONTENT-THEORY.md §ז.2): the quick lesson for the pivot — Barry Harris's pivot arpeggio. Owner-
// confirmed definition (2026-11-14): a pivot is an arpeggio with some of its notes moved an octave, so the order stays
// the same and the contour changes; the canonical case is the root on top, a drop to the 3rd below, the climb. Every
// example is built by the same functions as the topic and the drills (src/engine/pivotArp.ts). The lesson sits just
// before "Scale line with a pivot" (bh-pivot) in mini/jazz.ts. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { mirrorArp, pivotArp, pivotEnclosureLine, scalePivotLine, straightArp } from '../../engine/pivotArp';

const notes = (midis: number[], each = 0.34): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.35): Stimulus => ({ kind: 'rest', duration: d });

const C = 60;
const MAJ7 = pivotArp(C, 'maj7');
const SCALE_PIVOT = scalePivotLine(72, '6', 2).line.map((n) => n.p);
const PIVOT_ENCL = pivotEnclosureLine(0, 0, 64).map((n) => n.p);

export const PIVOT_LESSON: MiniLesson = {
  id: 'bh-pivot-arp',
  area: 'jazz',
  emoji: '↓',
  title: { en: 'Barry Harris: the pivot', he: 'בארי האריס: הפיבוט' },
  takeaway: {
    en: 'A pivot is an arpeggio with some notes moved an octave: same order, new contour. The classic: the root on top, then drop to the 3rd below and climb 3-5-7. Cmaj7 = C, then E G B. The drop is a minor 6th over a major 3rd, a major 6th over a minor 3rd.',
    he: 'פיבוט הוא ארפג׳ שחלק מהצלילים שלו זזו אוקטבה: אותו סדר, קו מתאר חדש. הקלאסי: השורש למעלה, אז ירידה לטרצה שמתחתיו ועלייה 3-5-7. ‏Cmaj7 = דו, ואז מי סול סי. הירידה היא סקסטה קטנה מעל טרצה גדולה, סקסטה גדולה מעל טרצה קטנה.',
  },
  steps: [
    {
      say: { en: 'An arpeggio usually climbs straight up from the root: C, E, G, B.', he: 'ארפג׳ בדרך כלל עולה ישר מהשורש: דו, מי, סול, סי.' },
      play: [notes(straightArp(C, 'maj7'))],
      show: { notes: straightArp(C, 'maj7'), key: 'C', text: { en: '1 3 5 7', he: '1 3 5 7' } },
    },
    {
      say: { en: 'A pivot moves some of its notes an octave. The order stays, the shape changes. The classic one: the root on top, then drop to the 3rd and climb.', he: 'פיבוט מזיז חלק מהצלילים אוקטבה. הסדר נשאר, הצורה משתנה. הקלאסי: השורש למעלה, ואז ירידה לטרצה ועלייה.' },
      play: [notes(MAJ7)],
      show: { notes: MAJ7, key: 'C', text: { en: '1 ↓ 3 5 7', he: '1 ↓ 3 5 7' } },
    },
    {
      say: { en: 'Listen to the drop. Over a major 3rd it is a minor 6th; over a minor 3rd, a major 6th.', he: 'הקשיבו לירידה. מעל טרצה גדולה היא סקסטה קטנה; מעל טרצה קטנה, סקסטה גדולה.' },
      play: [notes([72, 64], 0.6), rest(), notes([72, 63], 0.6)],
      show: { text: { en: 'C → E: m6 · C → E♭: M6', he: 'C → E: m6 · C → E♭: M6' } },
    },
    {
      say: { en: 'It works on any seventh chord: maj7, m7, 7, m7♭5.', he: 'זה עובד על כל ספטאקורד: maj7, ‏m7, ‏7, ‏m7♭5.' },
      play: [notes(pivotArp(C, 'maj7')), rest(), notes(pivotArp(C, 'm7')), rest(), notes(pivotArp(C, '7')), rest(), notes(pivotArp(C, 'm7b5'))],
      show: { text: { en: 'Cmaj7 · Cm7 · C7 · Cm7♭5', he: 'Cmaj7 · Cm7 · C7 · Cm7♭5' } },
    },
    {
      say: { en: 'And on the 6th chord and the diminished, Barry’s two home chords.', he: 'וגם על אקורד ה־6 ועל המוקטן, שני אקורדי הבית של בארי.' },
      play: [notes(pivotArp(C, '6')), rest(), notes(pivotArp(C, 'dim7'))],
      show: { text: { en: 'C6 · C°7', he: 'C6 · C°7' } },
    },
    {
      say: { en: 'Practice it in all twelve keys: first in free time, then on the click. Your turn.', he: 'מתרגלים בכל שנים־עשר הסולמות: קודם בזמן חופשי, אחר כך עם הקליק. תורכם.' },
      play: [chord([48, 52, 55, 59], 0.8), notes(MAJ7)],
      show: { text: { en: 'top → drop → climb', he: 'למעלה ← ירידה ← עלייה' } },
    },
  ],
  more: [
    {
      say: { en: 'Any chord tone can sit on top. 3rd on top: drop to the 5th, climb 5, 7, 1. Then the 5th on top, then the 7th.', he: 'כל צליל אקורד יכול לשבת למעלה. טרצה למעלה: ירידה לקווינטה, עלייה 5, ‏7, ‏1. אחר כך הקווינטה למעלה, ואז הספטימה.' },
      play: [notes(pivotArp(C, 'maj7', 1)), rest(), notes(pivotArp(C, 'maj7', 2)), rest(), notes(pivotArp(C, 'maj7', 3))],
      show: { text: { en: '3 ↓ 5 7 1 · 5 ↓ 7 1 3 · 7 ↓ 1 3 5', he: '3 ↓ 5 7 1 · 5 ↓ 7 1 3 · 7 ↓ 1 3 5' } },
    },
    {
      say: { en: 'The mirror: the root at the bottom, leap up to the 7th, and fall: C, then B, G, E.', he: 'במראה: השורש למטה, קפיצה למעלה לספטימה, וירידה: דו, ואז סי, סול, מי.' },
      play: [notes(mirrorArp(C, 'maj7'))],
      show: { notes: mirrorArp(C, 'maj7'), key: 'C', text: { en: '1 ↑ 7 5 3', he: '1 ↑ 7 5 3' } },
    },
    {
      say: { en: 'Through ii–V–I, a pivot on each chord’s downbeat keeps a chord tone on every beat: D, F A C; G, B D F; C, E G B.', he: 'דרך ii–V–I, פיבוט על הפעמה החזקה של כל אקורד שומר צליל אקורד על כל פעמה: רה, פה לה דו; סול, סי רה פה; דו, מי סול סי.' },
      play: [notes([...pivotArp(62, 'm7'), ...pivotArp(55, '7'), ...pivotArp(C, 'maj7'), 72], 0.28)],
      show: { text: { en: 'Dm7 – G7 – Cmaj7', he: 'Dm7 – G7 – Cmaj7' } },
    },
    {
      say: { en: 'Scale plus pivot: Barry’s scale comes down by the half-step rules, lands on a chord tone on the beat, pivots there, and the scale carries on down.', he: 'סולם ועוד פיבוט: הסולם של בארי יורד לפי חוקי חצי הטון, נוחת על צליל אקורד על הפעמה, עושה שם פיבוט, והסולם ממשיך למטה.' },
      play: [notes(SCALE_PIVOT, 0.27)],
      show: { notes: SCALE_PIVOT, key: 'C', text: { en: 'C B A A♭ | G A C E | G F E D | C', he: 'C B A A♭ | G A C E | G F E D | C' } },
    },
    {
      say: { en: 'Pivot plus enclosure, a warm-up from Harry Likas and Barry: down the major bebop scale, a chord tone on every beat. Pivot: the next scale note jumps an octave. Enclosure: the chord tone above, the half step below, the target.', he: 'פיבוט ועוד כיתור, חימום של הארי ליקאס ובארי: במורד סולם הביבופ המז׳ורי, צליל אקורד על כל פעמה. פיבוט: הצליל הבא בסולם קופץ אוקטבה. כיתור: צליל האקורד מעל, חצי הטון מתחת, המטרה.' },
      play: [notes(PIVOT_ENCL, 0.27)],
      show: { notes: PIVOT_ENCL, key: 'C', text: { en: 'pivot · enclosure · pivot · enclosure', he: 'פיבוט · כיתור · פיבוט · כיתור' } },
    },
    {
      say: { en: 'A common slip is to drop to the 5th instead of the 3rd. From the root on top, the next chord tone down is always the 3rd. Sing the drop before you play it.', he: 'טעות נפוצה היא לרדת לקווינטה במקום לטרצה. מהשורש למעלה, צליל האקורד הבא למטה הוא תמיד הטרצה. שירו את הירידה לפני שאתם מנגנים אותה.' },
    },
    {
      say: { en: 'Recap: a pivot moves notes of an arpeggio an octave. The next lesson puts one inside a falling scale line.', he: 'לסיכום: פיבוט מזיז צלילים של ארפג׳ אוקטבה. השיעור הבא שם פיבוט בתוך קו סולם יורד.' },
    },
  ],
};

export const UNITS: Record<string, string> = {
  'topic:bh-pivot-arp': 'bh-pivot-arp',
  // The keys, guitar and bass levels open with the same lesson (App.tsx gate: "tech:<level id>").
  ...Object.fromEntries(['harris-19', 'harris-20', 'harris-21', 'harris-22', 'harris-23', 'harris-24', 'g-harris-8', 'g-harris-9', 'g-harris-10', 'b-barry-7', 'b-barry-8'].map((id) => [`tech:${id}`, 'bh-pivot-arp'])),
};

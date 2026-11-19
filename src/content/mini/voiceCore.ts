// The voice course's missing lessons (CURRICULUM-AUDIT-VOICE-DRUMS B3, B4, owner 2026-11-19): the blues entry split in
// two — swing and the 12-bar form stay in `voice-jazz-start` (audit7.ts, before v-jazz1·1); the guide tones on a blues
// are here, before v-jazz1·4 (vocal:2304) — and the singer's ear (the v-ear family: sing back, intervals from a given
// note, the bar not played). Short screens, one idea each, a sound per idea; timing before pitch (owner: singing =
// timing first). The 7th chord is named here for the first time on the voice path (chord-intro taught the triad).

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.45): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const note = (midi: number, duration = 1): Stimulus => ({ kind: 'note', midi, duration });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
const evs = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });

/** A chord held under a sung-style top note (the guide tone), bar by bar: [chord, top] at `secs` each. */
function guideLine(bars: [number[], number][], secs = 1.6): Stimulus {
  const ev: NoteEvent[] = [];
  bars.forEach(([c, top], i) => {
    for (const m of c) ev.push({ midi: m, start: i * secs, duration: secs * 0.95, velocity: 0.45 });
    ev.push({ midi: top, start: i * secs, duration: secs * 0.95, velocity: 0.85 });
  });
  return evs(ev, bars.length * secs + 0.2);
}
// Shells in C: root in the bass, then 3rd and 7th.
const C7 = [36, 52, 58];
const F7 = [41, 51, 57];
const G7 = [43, 53, 59];

/** A motif sung bar by bar on scale degrees of C major (0 = C), each bar the motif moved one step. */
const C_MAJ = [60, 62, 64, 65, 67, 69, 71, 72, 74];
const seq = (motif: number[], bars: number) => Array.from({ length: bars }, (_, j) => motif.map((d) => C_MAJ[d + j])).flat();

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ B3 (2) guide tones on a blues
  {
    id: 'voice-guide-tones',
    area: 'jazz',
    emoji: 'improv',
    title: { en: 'Guide tones on a blues', he: 'צלילים מנחים בבלוז' },
    takeaway: { en: 'A blues chord has four notes: root, third, fifth, flat seventh. Sing its third or seventh — the guide tones; they move by half steps from chord to chord.', he: 'לאקורד בלוז יש ארבעה צלילים: שורש, טרצה, קווינטה, ספטימה קטנה. שרים את הטרצה או את הספטימה — הצלילים המנחים; הם זזים בחצאי טונים מאקורד לאקורד.' },
    steps: [
      { say: { en: 'A blues chord has four notes: root, third, fifth and a flat seventh.', he: 'לאקורד בלוז יש ארבעה צלילים: שורש, טרצה, קווינטה וספטימה קטנה.' }, show: { notes: [60, 64, 67, 70], chord: true, key: 'C', text: { en: 'C7 = C E G B♭', he: 'C7 = דו מי סול סי במול' } }, play: [chord([60, 64, 67, 70], 1.4), rest(0.2), notes([60, 64, 67, 70], 0.5)] },
      { say: { en: 'The third and the seventh are the guide tones. They name the chord.', he: 'הטרצה והספטימה הן הצלילים המנחים. הן אלה שנותנות לאקורד את השם.' }, show: { notes: [64, 70], key: 'C', text: { en: 'C7: E · B♭', he: 'C7: מי · סי במול' } }, play: [notes([64, 70], 0.7), chord(C7, 1.4)] },
      { say: { en: 'The root belongs to the bass. Your notes are the third and seventh.', he: 'השורש שייך לבס. הצלילים שלכם הם הטרצה והספטימה.' }, play: [note(36, 1.2), rest(0.2), chord(C7, 1.4)] },
      { say: { en: 'From C7 to F7, both move by a half step.', he: 'מ־C7 ל־F7 שניהם זזים בחצי טון.' }, show: { notes: [64, 63], key: 'C', text: { en: 'E → E♭ · B♭ → A', he: 'מי ← מי במול · סי במול ← לה' } }, play: [chord(C7, 1.2), chord(F7, 1.4)] },
      { say: { en: 'So a guide-tone line barely moves: E, E-flat, E.', he: 'לכן קו של צלילים מנחים כמעט לא זז: מי, מי במול, מי.' }, show: { notes: [64, 63, 64], key: 'C', text: { en: 'C7 · F7 · C7', he: 'C7 · F7 · C7' } }, play: [guideLine([[C7, 64], [F7, 63], [C7, 64]])] },
      { say: { en: 'Your turn: one guide tone per chord, a half note each, in slow swing.', he: 'תורכם: צליל מנחה אחד לכל אקורד, חצי כל אחד, בסווינג איטי.' }, show: { text: { en: '3 or 7 · 𝅗𝅥', he: '3 או 7 · 𝅗𝅥' } } },
    ],
    more: [
      { say: { en: 'Over G7, the five chord, the guide tones are B and F. Back to C7, B falls to B-flat and F falls to E: half steps again.', he: 'מעל G7, אקורד החמישית, הצלילים המנחים הם סי ופה. בחזרה ל־C7, סי יורד לסי במול ופה יורד למי: שוב חצאי טונים.' }, show: { notes: [59, 65], key: 'C', text: { en: 'G7: B · F', he: 'G7: סי · פה' } }, play: [guideLine([[G7, 65], [C7, 64]])] },
      { say: { en: 'Why these two: the third says major or minor, and the seventh says the chord wants to move. Together they spell the harmony even with no piano.', he: 'למה דווקא הם: הטרצה אומרת מז׳ור או מינור, והספטימה אומרת שהאקורד רוצה לזוז. יחד הם מאייתים את ההרמוניה גם בלי פסנתר.' }, play: [notes([64, 70], 0.6), notes([63, 69], 0.6)] },
      { say: { en: 'Find them fast: from the root, the third is two whole steps up, and the flat seventh is a whole step below the next root.', he: 'מוצאים אותם מהר: מהשורש, הטרצה נמצאת שני טונים שלמים למעלה, והספטימה הקטנה טון שלם מתחת לשורש הבא.' }, play: [notes([60, 64], 0.5), notes([72, 70], 0.5)] },
      { say: { en: 'A common mistake is singing the root because it feels safe. Leave the root to the bass; the guide tones are what make your line sound like the changes.', he: 'טעות נפוצה היא לשיר את השורש כי הוא מרגיש בטוח. השאירו את השורש לבס; הצלילים המנחים הם מה שגורם לקו שלכם להישמע כמו האקורדים.' } },
      { say: { en: 'A practice tip: hum the line slowly over the chords before you swing it. When the half steps feel automatic, sing it in time with the band.', he: 'טיפ לתרגול: זמזמו את הקו לאט מעל האקורדים לפני שמכניסים סווינג. כשחצאי הטונים מרגישים אוטומטיים, שירו אותו בזמן עם הלהקה.' } },
      { say: { en: 'Where it lives: every jazz line leans on guide tones, and scat solos aim for them on strong beats. Recap: third and seventh, half steps, the root to the bass.', he: 'איפה זה חי: כל קו ג׳אז נשען על צלילים מנחים, וסולו סקאט מכוון אליהם בפעמות החזקות. לסיכום: טרצה וספטימה, חצאי טונים, השורש לבס.' } },
    ],
  },

  // ------------------------------------------------------------------ B4 the singer's ear (v-ear)
  {
    id: 'voice-ear',
    area: 'voice',
    emoji: 'sing',
    title: { en: 'The singer’s ear', he: 'האוזן של הזמר' },
    takeaway: { en: 'Hear it once, keep it, sing it back in time; sing an interval from a given note; find the rule of a sequence and sing the bar that was not played.', he: 'שומעים פעם אחת, שומרים, ושרים בחזרה בזמן; שרים מרווח מצליל נתון; מוצאים את החוק של סקוונצה ושרים את התיבה שלא נוגנה.' },
    steps: [
      { say: { en: 'A singer’s ear: hear it once, keep it, sing it back.', he: 'האוזן של הזמר: שומעים פעם אחת, שומרים, ושרים בחזרה.' }, play: [notes([60, 62, 64, 62, 60], 0.5)] },
      { say: { en: 'Sing it back: hear the whole phrase before you breathe in.', he: 'לשיר בחזרה: שומעים את כל המשפט לפני שנושמים.' }, show: { notes: [60, 64, 67, 64, 65, 62, 60], key: 'C' }, play: [notes([60, 64, 67, 64, 65, 62, 60], 0.42)] },
      { say: { en: 'Copy the rhythm as well as the notes. Timing counts first.', he: 'מעתיקים גם את הקצב, לא רק את הצלילים. התזמון נחשב קודם.' }, play: [evs([0, 0.5, 1, 1.25, 1.5, 2].map((t, i) => ({ midi: [60, 62, 64, 65, 64, 60][i], start: t, duration: 0.4, velocity: 0.7 })), 2.8)] },
      { say: { en: 'Intervals from a note: hear one note, then sing a third above it.', he: 'מרווחים מצליל נתון: שומעים צליל אחד, ואז שרים טרצה מעליו.' }, show: { notes: [60, 64], key: 'C', text: { en: 'C → E', he: 'דו ← מי' } }, play: [note(60, 1), rest(0.3), note(64, 1)] },
      { say: { en: 'Measure from the given note, not from what you sang before.', he: 'מודדים מהצליל הנתון, לא ממה ששרתם קודם.' }, play: [note(62, 0.9), rest(0.3), note(69, 1)] },
      { say: { en: 'The bar not played: a pattern climbs two bars; you sing the third.', he: 'התיבה שלא נוגנה: תבנית עולה שתי תיבות; אתם שרים את השלישית.' }, show: { notes: seq([0, 1, 2, 0], 2), key: 'C', text: { en: 'C D E C · D E F D · ?', he: 'דו רה מי דו · רה מי פה רה · ?' } }, play: [notes(seq([0, 1, 2, 0], 2), 0.4)] },
      { say: { en: 'Your turn: echo, then intervals, then the missing bar.', he: 'תורכם: הד, אחר כך מרווחים, ואז התיבה החסרה.' }, show: { text: { en: 'echo · interval · ?', he: 'הד · מרווח · ?' } } },
    ],
    more: [
      { say: { en: 'Hear it inside before you sing it. If you can hum the phrase silently in your head, your voice can find it.', he: 'שומעים בפנים לפני ששרים. אם אפשר לזמזם את המשפט בשקט בראש, הקול יכול למצוא אותו.' }, play: [notes([67, 65, 64, 62, 64, 60], 0.42)] },
      { say: { en: 'An interval has a size you can feel: a third is a small, sweet step up; a fifth is open and wide. Measure the gap itself.', he: 'למרווח יש גודל שאפשר להרגיש: טרצה היא צעד קטן ומתוק למעלה; קווינטה פתוחה ורחבה. מודדים את הרווח עצמו.' }, play: [notes([60, 64], 0.7), notes([60, 67], 0.7)] },
      { say: { en: 'In a sequence every bar is the first one moved by one step. Find the rule, then use it once more. Here the answer: E, F, G, E.', he: 'בסקוונצה כל תיבה היא הראשונה, מוזזת בצעד אחד. מוצאים את החוק, ומשתמשים בו פעם נוספת. הנה התשובה: מי, פה, סול, מי.' }, play: [notes(seq([0, 1, 2, 0], 3), 0.38)] },
      { say: { en: 'The common mistake: starting to sing while the phrase is still playing. Wait for the end, then come in on the beat.', he: 'הטעות הנפוצה: להתחיל לשיר כשהמשפט עוד מתנגן. מחכים לסוף, ואז נכנסים על הפעמה.' } },
      { say: { en: 'Where it lives: learning songs by ear, finding a harmony part, and the aural tests of graded singing exams.', he: 'איפה זה חי: לימוד שירים בשמיעה, מציאת קול שני, ומבחני השמיעה של בחינות שירה מדורגות.' } },
      { say: { en: 'A practice tip: sing back short phrases from songs you know, then from songs you don\'t. Record yourself and compare: the timing first, then the notes.', he: 'טיפ לתרגול: שירו בחזרה משפטים קצרים משירים שאתם מכירים, ואחר כך משירים שאתם לא מכירים. הקליטו את עצמכם והשוו: קודם התזמון, ואז הצלילים.' } },
      { say: { en: 'Recap: listen to the end, keep the rhythm, measure from the given note, and find the rule of the pattern.', he: 'לסיכום: מקשיבים עד הסוף, שומרים על הקצב, מודדים מהצליל הנתון, ומוצאים את החוק של התבנית.' } },
    ],
  },
];

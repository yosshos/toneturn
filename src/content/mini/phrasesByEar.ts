// Phrases by ear (owner 2026-11-14): the quick lesson before the phrase-playback ladder on the keys, the guitar and the
// bass (k-phrase, g-phrase, b-phrase; src/engine/drills/phraseDrills.ts) — how to learn a line by ear: sing it, find
// the first note, chunk it. Every fact matches src/engine/phraseEar.ts and its tests. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// G7 → C major 7 under the examples; a phrase with an enclosure into E (the 3rd of C).
const G7 = [43, 59, 65];
const CMAJ7 = [48, 59, 64];
const PHRASE = [67, 65, 62, 59, 65, 63, 64];

export const LESSONS: MiniLesson[] = [
  {
    id: 'phrase-by-ear',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Learning lines by ear', he: 'ללמוד קווים בשמיעה' },
    takeaway: { en: 'Sing it before you play it, find the first note against the chord, then learn the line in short chunks, each landing on a chord tone.', he: 'לשיר לפני שמנגנים, למצוא את הצליל הראשון מול האקורד, ואז ללמוד את הקו בקטעים קצרים, שכל אחד נוחת על צליל אקורד.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here a phrase plays over its chords, and you play it back. First, sing it: if you can sing it, your hands can find it.', he: 'היי {name}! כאן משפט מתנגן מעל האקורדים שלו, ואתם מנגנים אותו בחזרה. קודם שירו אותו: אם אפשר לשיר אותו, הידיים ימצאו אותו.' },
        play: [chord(G7, 0.6), notes(PHRASE), chord(CMAJ7, 0.8)],
        show: { notes: PHRASE, text: { en: 'sing it first', he: 'קודם לשיר' } },
      },
      {
        say: { en: 'Then find the first note. Hear it against the chord: is it the root, the 3rd, the 5th or the 7th? Here it is G, the root of G7.', he: 'אחר כך מצאו את הצליל הראשון. שמעו אותו מול האקורד: האם זה היסוד, הטרצה, הקווינטה או הספטימה? כאן זה סול, היסוד של G7.' },
        play: [chord(G7, 0.8), notes([67], 0.8)],
        show: { notes: [67], text: { en: 'the first note', he: 'הצליל הראשון' } },
      },
      {
        say: { en: 'Now chunk it. Learn the first few notes, then the next few, each chunk ending on a chord tone on the beat.', he: 'עכשיו חלקו אותו. למדו את הצלילים הראשונים, ואז את הבאים, וכל קטע נגמר על צליל אקורד על הפעמה.' },
        play: [notes([67, 65, 62, 59]), rest(0.6), notes([65, 63, 64])],
        show: { notes: [67, 65, 62, 59], text: { en: 'chunk 1 · chunk 2', he: 'קטע 1 · קטע 2' } },
      },
      {
        say: { en: 'Listen for the moves you know: an approach note, an enclosure, the bebop scale. Here F and D sharp enclose E.', he: 'הקשיבו לתנועות שאתם מכירים: צליל גישה, כיתור, סולם הביבופ. כאן פה ורה דיאז מכתרים את מי.' },
        play: [chord(CMAJ7, 0.6), notes([65, 63, 64], 0.35)],
        show: { notes: [65, 63, 64], text: { en: 'F · D♯ → E', he: 'F · D♯ → E' } },
      },
      {
        say: { en: 'Your turn: hear the phrase, replay it or slow it down if you need, then play it back in time. Every note counts on its own.', he: 'תורכם: שמעו את המשפט, השמיעו שוב או האטו אם צריך, ואז נגנו אותו בחזרה בזמן. כל צליל נספר בפני עצמו.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: singing ties the sound to your inner ear, so the hands follow a line you already hold, not a guess.', he: 'למה זה עובד: השירה קושרת את הצליל לאוזן הפנימית, כך שהידיים הולכות אחרי קו שכבר מוחזק אצלכם, ולא אחרי ניחוש.' },
      },
      {
        say: { en: 'Find the first note by its place in the chord. Sing the root of the chord, then walk up to the note: one step is the 2nd, two steps the 3rd.', he: 'מוצאים את הצליל הראשון לפי מקומו באקורד. שירו את היסוד של האקורד, ואז עלו אל הצליל: צעד אחד הוא הסקונדה, שני צעדים הטרצה.' },
        play: [chord(CMAJ7, 0.8), notes([60, 62, 64], 0.4)],
      },
      {
        say: { en: 'Chunks end where the line lands: a chord tone on a beat, often after an approach note or an enclosure. Those landings are your signposts.', he: 'קטעים נגמרים במקום שבו הקו נוחת: צליל אקורד על פעמה, הרבה פעמים אחרי צליל גישה או כיתור. הנחיתות האלה הן השלטים שלכם.' },
        play: [chord(G7, 0.6), notes([66, 67], 0.35), rest(0.3), chord(CMAJ7, 0.6), notes([63, 64], 0.35)],
      },
      {
        say: { en: 'A common mistake is starting from note one each time you slip. Repeat only the chunk that broke, then join it to the one before.', he: 'טעות נפוצה היא להתחיל מהצליל הראשון בכל פעם שמשהו משתבש. חזרו רק על הקטע שנשבר, ואז חברו אותו לקטע שלפניו.' },
      },
      {
        say: { en: 'Slow it down rather than guess. At a slower speed the passing notes are clear, and the rhythm stays the same.', he: 'עדיף להאט מאשר לנחש. במהירות איטית הצלילים העוברים ברורים, והמקצב נשאר אותו מקצב.' },
      },
      {
        say: { en: 'Every note counts on its own: a wrong note or a missed one costs only itself, and a steady answer a little slower than the call is still in time.', he: 'כל צליל נספר בפני עצמו: צליל שגוי או חסר עולה רק את עצמו, ותשובה יציבה, קצת איטית מהמשפט, עדיין בזמן.' },
      },
      {
        say: { en: 'To keep: sing it, find the first note, chunk it, then play it in every key.', he: 'מה לזכור: לשיר, למצוא את הצליל הראשון, לחלק לקטעים, ואז לנגן בכל הסולמות.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'tech:k-phrase': 'phrase-by-ear',
  'tech:k-phrase-1': 'phrase-by-ear',
  'tech:g-phrase': 'phrase-by-ear',
  'tech:g-phrase-1': 'phrase-by-ear',
  'tech:b-phrase': 'phrase-by-ear',
  'tech:b-phrase-1': 'phrase-by-ear',
};

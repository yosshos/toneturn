// Moving between keys (docs/AUDIT-GAPS-2.md #5, #6, #11, #12, #19): the quick lesson before the k-keys / g-keys /
// b-keys families and the modulation-means topic, and a short one before key-centres. Every example is played from
// the same chords the drills and the ear topics use (src/engine/keyMoves.ts, topicsKeyMoves.ts).
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { bridge, dimMove, directMove, iiVMove, pivotMove, popMove, sixDimLine, tritoneMove, turnaround } from '../../engine/keyMoves';
import { playKChords } from '../../engine/topicsKeyMoves';

const rest = (d = 0.5): Stimulus => ({ kind: 'rest', duration: d });
const line = (A: number, B: number): Stimulus[] => [{ kind: 'notes', midis: sixDimLine(A, B, 55).map((n) => n.pitch), each: 0.2 }];

export const LESSONS: MiniLesson[] = [
  {
    id: 'key-moves',
    area: 'harmony',
    emoji: 'K',
    title: { en: 'Moving between keys', he: 'מעברים בין סולמות' },
    takeaway: {
      en: 'A key change goes through a door: a pivot chord both keys share, a ii–V of the new key, a tritone sub, the common diminished, or no door at all (direct, or the pop lift).',
      he: 'מעבר סולם עובר דרך דלת: אקורד ציר ששני הסולמות חולקים, ii–V של הסולם החדש, תחליף טריטון, הדימיניש המשותף, או בלי דלת בכלל (ישירות, או ההרמה הפופית).',
    },
    steps: [
      {
        say: { en: 'A key change needs a door: a chord that leads out of the old key into the new one. Here are the doors jazz and pop use most.', he: 'מעבר סולם צריך דלת: אקורד שמוביל מהסולם הישן אל החדש. אלה הדלתות שג׳אז ופופ משתמשים בהן הכי הרבה.' },
        show: { text: { en: 'pivot · ii–V · tritone · °7 · direct', he: 'ציר · ii–V · טריטון · °7 · ישיר' } },
      },
      {
        say: { en: 'A pivot chord belongs to both keys. Am7 is vi in C and ii in G, so D7 can take it straight to G.', he: 'אקורד ציר שייך לשני הסולמות. Am7 הוא vi בדו ו־ii בסול, ולכן D7 לוקח אותו ישר לסול.' },
        play: playKChords(pivotMove(0, 0).chords),
        show: { text: { en: 'Cmaj7 → Am7 → D7 → Gmaj7', he: 'Cmaj7 → Am7 → D7 → Gmaj7' } },
      },
      {
        say: { en: 'A ii–V of the new key needs no shared chord. Fm7 and B♭7 aim at E♭, a minor third up.', he: 'ii–V של הסולם החדש לא צריך אקורד משותף. Fm7 ו־B♭7 מכוונים אל מי במול, טרצה קטנה למעלה.' },
        play: playKChords(iiVMove(0, 3).chords),
        show: { text: { en: 'Cmaj7 → Fm7 B♭7 → E♭maj7', he: 'Cmaj7 → Fm7 B♭7 → E♭maj7' } },
      },
      {
        say: { en: 'The tritone sub swaps B♭7 for E7: the same 3rd and 7th, and the bass slides down a half step into E♭.', he: 'תחליף הטריטון מחליף את B♭7 ב־E7: אותן טרצה וספטימה, והבס מחליק חצי טון למטה אל מי במול.' },
        play: playKChords(tritoneMove(0, 3).chords),
        show: { text: { en: 'Cmaj7 → Fm7 E7 → E♭maj7', he: 'Cmaj7 → Fm7 E7 → E♭maj7' } },
      },
      {
        say: { en: 'The common diminished: from C6, play B°7, lower F to E and it is E7, the V of A. Three notes stay, one moves a half step.', he: 'הדימיניש המשותף: מ־C6 מנגנים B°7, מורידים את פה למי, והוא E7, ה־V של לה. שלושה צלילים נשארים, אחד זז חצי טון.' },
        play: playKChords(dimMove(0, 9).chords),
        show: { text: { en: 'C6 → B°7 → E7 → A6', he: 'C6 → B°7 → E7 → A6' } },
      },
      {
        say: { en: 'Direct: one phrase ends in C, the next simply starts in E♭. Pop does it up a half step for the last chorus.', he: 'ישירות: משפט אחד נגמר בדו, הבא פשוט מתחיל במי במול. בפופ עושים את זה חצי טון למעלה לפזמון האחרון.' },
        play: [...playKChords(directMove(0, 3).chords), rest(), ...playKChords(popMove(0, 1, false).chords)],
        show: { text: { en: 'C ‖ E♭ · C ‖ D♭', he: 'C ‖ E♭ · C ‖ D♭' } },
      },
      {
        say: { en: 'Your turn: each door in all twelve keys, first in free time, then on the click. Lead every voice to the nearest note.', he: 'תורכם: כל דלת בכל שנים־עשר הסולמות, קודם בזמן חופשי, אחר כך עם המטרונום. הובילו כל קול לצליל הקרוב.' },
      },
    ],
    more: [
      {
        say: { en: 'Raise one note of the diminished a whole step instead and you get a 7♭9 on that note. From B°7, B up to C♯ gives D♭7♭9, the door to G♭.', he: 'אפשר במקום זה להעלות צליל אחד של הדימיניש בטון, ומקבלים 7♭9 על הצליל הזה. מ־B°7, סי שעולה לדו דיאז נותן D♭7♭9, הדלת לסול במול.' },
        play: playKChords(dimMove(0, 6, { b9: true }).chords),
        show: { text: { en: 'C6 → B°7 → D♭7♭9 → G♭6', he: 'C6 → B°7 → D♭7♭9 → G♭6' } },
      },
      {
        say: { en: 'Key A’s own diminished opens the keys a minor third apart. The other two diminished chords open the other eight, so three cover all twelve.', he: 'הדימיניש של הסולם עצמו פותח את הסולמות שבמרחק טרצה קטנה. שני הדימינישים האחרים פותחים את שמונת האחרים, כך ששלושה מכסים את כל השנים־עשר.' },
        play: playKChords(dimMove(0, 5).chords),
        show: { text: { en: 'C6 → E°7 → C7 → F6', he: 'C6 → E°7 → C7 → F6' } },
      },
      {
        say: { en: 'Turnarounds travel too: I–VI7–ii–V, the tritone turnaround I–♭III7–♭VI7–♭II7, the Ladybird, and I–♯I°7–ii–♯ii°7 with the bass climbing by half steps.', he: 'גם טרנאראונדים נוסעים: I–VI7–ii–V, טרנאראונד הטריטון I–♭III7–♭VI7–♭II7, הלידיבירד, ו־I–♯I°7–ii–♯ii°7 כשהבס מטפס בחצאי טונים.' },
        play: [...playKChords(turnaround(0, 'tritone')), rest(), ...playKChords(turnaround(0, 'dim'))],
        show: { text: { en: 'C E♭7 A♭7 D♭7 · C C♯°7 Dm7 D♯°7', he: 'C E♭7 A♭7 D♭7 · C C♯°7 Dm7 D♯°7' } },
      },
      {
        say: { en: 'The rhythm-changes bridge is a chain of dominants round the cycle: III7, VI7, II7, V7, each 7th falling to the next 3rd.', he: 'הגשר של ריתם צ׳יינג׳ס הוא שרשרת דומיננטים במעגל: III7, ‏VI7, ‏II7, ‏V7, וכל ספטימה יורדת לטרצה הבאה.' },
        play: playKChords(bridge(10), 0.22),
        show: { text: { en: 'D7 G7 C7 F7 → B♭', he: 'D7 G7 C7 F7 → B♭' } },
      },
      {
        say: { en: 'The melodic version: C’s 6th-diminished scale up, the diminished and E7, then A’s scale down to A.', he: 'הגרסה המלודית: סולם השש-מוקטן של דו למעלה, הדימיניש ו־E7, ואז הסולם של לה למטה עד לה.' },
        play: line(0, 9),
        show: { text: { en: 'C6-dim ↑ · B°7 · E7 · A6-dim ↓', he: 'C6-dim ↑ · B°7 · E7 · A6-dim ↓' } },
      },
      {
        say: { en: 'To hear the door, find the chord where the old key stops. Shared by both keys: a pivot. A diminished sliding into a dominant: the common diminished. Nothing: direct.', he: 'כדי לשמוע את הדלת, מצאו את האקורד שבו הסולם הישן נגמר. משותף לשני הסולמות: ציר. דימיניש שמחליק לדומיננט: הדימיניש המשותף. כלום: ישיר.' },
      },
      {
        say: { en: 'Common mistake: spelling the new key from the old one. After C, E7 and A6 are spelled with sharps; B♭7 belongs to E♭.', he: 'טעות נפוצה: לכתוב את הסולם החדש לפי הישן. אחרי דו, E7 ו־A6 נכתבים בדיאזים; B♭7 שייך למי במול.' },
      },
      {
        say: { en: 'To keep: every key change has a door, and every door works in all twelve keys.', he: 'מה לזכור: לכל מעבר סולם יש דלת, וכל דלת עובדת בכל שנים־עשר הסולמות.' },
      },
    ],
  },
  {
    id: 'key-centres',
    area: 'harmony',
    emoji: 'K',
    title: { en: 'Hearing key centres', he: 'לשמוע מרכזים טונליים' },
    takeaway: {
      en: 'Keep the first tonic in your ear. Each new I is a distance from it: a half step, a minor or major third, a tritone, a whole step.',
      he: 'שמרו את הטוניקה הראשונה באוזן. כל I חדש נמצא במרחק ממנה: חצי טון, טרצה קטנה או גדולה, טריטון, טון.',
    },
    steps: [
      {
        say: { en: 'Standards move through key centres, each with its own ii–V–I. To follow them, sing the first tonic and hold it in your ear.', he: 'סטנדרטים עוברים בין מרכזים טונליים, לכל אחד ii–V–I משלו. כדי לעקוב, שירו את הטוניקה הראשונה והחזיקו אותה באוזן.' },
        play: playKChords(iiVMove(0, 3).chords),
        show: { text: { en: 'C → E♭', he: 'C → E♭' } },
      },
      {
        say: { en: 'When the next I arrives, sing from the old tonic to the new one and count the half steps. Three up is a minor third.', he: 'כשה־I הבא מגיע, שירו מהטוניקה הישנה אל החדשה וספרו חצאי טונים. שלושה למעלה הם טרצה קטנה.' },
        play: [{ kind: 'note', midi: 60, duration: 0.7 }, { kind: 'note', midi: 63, duration: 0.9 }],
        show: { text: { en: 'C → E♭: +3', he: 'C → E♭: ‎+3' } },
      },
      {
        say: { en: 'Four up is a major third, a bright jump. One down is a half step, a dark slide.', he: 'ארבעה למעלה הם טרצה גדולה, קפיצה בהירה. אחד למטה הוא חצי טון, החלקה כהה.' },
        play: [...playKChords(iiVMove(0, 4).chords, 0.24), rest(0.4), ...playKChords(iiVMove(0, 11).chords, 0.24)],
        show: { text: { en: 'C → E · C → B', he: 'C → E · C → B' } },
      },
      {
        say: { en: 'The tritone is the farthest key: six half steps, halfway round the circle. It sounds strange and new.', he: 'הטריטון הוא הסולם הרחוק ביותר: שישה חצאי טונים, חצי מעגל. הוא נשמע מוזר וחדש.' },
        play: playKChords(iiVMove(0, 6).chords, 0.26),
        show: { text: { en: 'C → G♭: 6', he: 'C → G♭: ‎6' } },
      },
      {
        say: { en: 'A tune with three centres, down a whole step each time, like Tune Up: D, C, B♭. Your turn.', he: 'שיר עם שלושה מרכזים, כל פעם טון למטה, כמו Tune Up: רה, דו, סי במול. תורכם.' },
        play: playKChords([...iiVMove(2, 0).chords, ...iiVMove(0, 10).chords.slice(1)], 0.26),
        show: { text: { en: 'D → C → B♭', he: 'D → C → B♭' } },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: every new key brings its own ii–V. Hear the V7 resolve and you know where the new tonic is, even before it sounds.', he: 'למה זה עובד: כל סולם חדש מביא ii–V משלו. שומעים את ה־V7 נפתר ויודעים איפה הטוניקה החדשה, עוד לפני שהיא נשמעת.' },
        play: playKChords(iiVMove(0, 8).chords, 0.26),
        show: { text: { en: 'Cmaj7 → B♭m7 E♭7 → A♭maj7', he: 'Cmaj7 → B♭m7 E♭7 → A♭maj7' } },
      },
      {
        say: { en: 'Name the distance, then the key. From C, up a minor third is E♭, down a major third is A♭, down a whole step is B♭.', he: 'קודם נותנים שם למרחק, אחר כך לסולם. מדו, טרצה קטנה למעלה היא מי במול, טרצה גדולה למטה היא לה במול, טון למטה הוא סי במול.' },
      },
      {
        say: { en: 'Common shapes in standards: down whole steps, as in Tune Up; a bridge a major third away; Coltrane’s centres a major third apart, round the circle in three.', he: 'צורות נפוצות בסטנדרטים: טונים למטה, כמו ב־Tune Up; גשר במרחק טרצה גדולה; המרכזים של קולטריין במרחק טרצה גדולה, שלושה סביב המעגל.' },
        play: playKChords([...iiVMove(0, 4).chords, ...iiVMove(4, 8).chords.slice(1)], 0.24),
        show: { text: { en: 'C → E → A♭', he: 'C → E → A♭' } },
      },
      {
        say: { en: 'Common mistake: hearing the ii chord as the new tonic. Wait for the V7 to land; the chord it resolves to is home.', he: 'טעות נפוצה: לשמוע את אקורד ה־ii כטוניקה החדשה. חכו שה־V7 ינחת; האקורד שאליו הוא נפתר הוא הבית.' },
      },
      {
        say: { en: 'Practice: play a standard’s changes slowly and say each key centre aloud as it arrives. Then sing each new tonic over its chord, and check it on the keys.', he: 'תרגול: נגנו לאט את ההרמוניה של סטנדרט ואמרו בקול כל מרכז טונלי כשהוא מגיע. אחר כך שירו כל טוניקה חדשה מעל האקורד שלה, ובדקו אותה על הקלידים.' },
      },
      {
        say: { en: 'To keep: one tonic in the ear, count to the next, name it. Every centre is a distance from the one before.', he: 'מה לזכור: טוניקה אחת באוזן, סופרים עד הבאה, נותנים שם. כל מרכז הוא מרחק מזה שלפניו.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:modulation-means': 'key-moves',
  'topic:key-centres': 'key-centres',
  'tech:k-keys': 'key-moves',
  'tech:g-keys': 'key-moves',
  'tech:b-keys': 'key-moves',
};

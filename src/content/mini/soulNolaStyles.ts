// SPEC-JAZZ-NEIGHBOURS §4–§6: the teaching screens of the soul-jazz / gospel / funk families (k-gospel, k-souljazz,
// g-soul, b-soul), the New Orleans families (k-nola, b-nola) and the odd meters in jazz (k-odd). Every claim follows
// docs/research/STYLE-SOUL.md, STYLE-NEW-ORLEANS.md and STYLE-MEDITERRANEAN-TOUCH.md ([V] / [C] lines only, and the
// owner's confirmed additions); the sound examples are the conventions themselves (rhythms and progressions are not
// protectable), no tune.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** Free timed notes on a beat grid: [midi[], beat, beats, velocity], at `bpm`. */
const grid = (bpm: number, list: [number[], number, number, number?][], beats: number): Stimulus => {
  const s = 60 / bpm;
  const events: NoteEvent[] = list.flatMap(([ms, b, d, v = 0.55]) => ms.map((midi) => ({ midi, start: b * s, duration: d * s * 0.95, velocity: v })));
  return { kind: 'events', events, length: beats * s + 0.3 };
};
type G = [number[], number, number, number?][];

// Gospel (STYLE-SOUL §1): I and IV/I over a held C (RH 3–5–1 ↔ 4–6–1), the I–ii rocking, the 1–4 walk-up.
const C_I = [64, 67, 72];
const C_IV = [65, 69, 72];
const PLAGAL: G = [[[48], 0, 8, 0.5], [C_I, 0, 2], [C_IV, 2, 2], [C_I, 4, 2], [C_IV, 6, 2]];
const ROCK: G = [[[48], 0, 2, 0.5], [[60, 64, 67], 0, 1], [[62, 65, 69], 1, 1], [[52], 2, 2, 0.5], [[64, 67, 72], 2, 1], [[65, 69, 74], 3, 1], [[55], 4, 2, 0.5], [[67, 72, 76], 4, 1], [[69, 74, 77], 5, 1], [[48], 6, 2, 0.5], [[60, 64, 67], 6, 2]];
const WALKUP: G = [[[48], 0, 2, 0.55], [[64, 67, 72], 0, 2], [[50], 2, 1, 0.55], [[62, 65, 70], 2, 1], [[52], 3, 1, 0.55], [[64, 67, 72], 3, 1], [[53], 4, 4, 0.55], [[64, 69, 72], 4, 4]];

// Soul-jazz and funk (STYLE-SOUL §2, §3): the Charleston in 3–7 guide tones over C7 and F7 (swung "and" of 2); funk 16ths.
const SW = 2 / 3;
const CHARLESTON: G = [[[48], 0, 4, 0.45], [[64, 70], 0, 0.8], [[64, 70], 1 + SW, 1.2], [[53], 4, 4, 0.45], [[63, 69], 4, 0.8], [[63, 69], 5 + SW, 1.2]];
const FUNK: G = [0, 1, 2, 3].flatMap((k): G => [[[52, 58, 62, 67], k, 0.2, k === 0 ? 0.7 : 0.5], [[58, 62], k + 0.25, 0.1, 0.18], [[58, 62], k + 0.5, 0.1, 0.18], [[58, 62], k + 0.75, 0.1, 0.18]]);
const FUNK_BASS: G = [[[36], 0, 0.25, 0.75], [[48], 0.75, 0.25, 0.6], [[46], 1.75, 0.25, 0.6], [[43], 2.25, 0.25, 0.6], [[36], 3, 0.25, 0.6], [[39], 3.75, 0.25, 0.6]];

// New Orleans (STYLE-NEW-ORLEANS §1–§2): stride (bass on 1 and 3, chord on 2 and 4), the boogie walking line, the 2-feel.
const STRIDE: G = [[[36], 0, 1, 0.6], [[55, 60, 64], 1, 1, 0.45], [[43], 2, 1, 0.6], [[55, 60, 64], 3, 1, 0.45], [[45], 4, 1, 0.6], [[55, 61, 64], 5, 1, 0.45], [[40], 6, 1, 0.6], [[55, 61, 64], 7, 1, 0.45]];
const BOOGIE: G = [36, 40, 43, 45, 46, 45, 43, 40].map((m, k): [number[], number, number, number?] => [[m], k * 0.5 + (k % 2 ? 0.17 : 0), k % 2 ? 0.33 : 0.5, k % 2 ? 0.45 : 0.6]);
const TWO_FEEL: G = [[[36], 0, 2, 0.6], [[43], 2, 2, 0.6], [[45], 4, 2, 0.6], [[40], 6, 2, 0.6], [[38], 8, 2, 0.6], [[45], 10, 2, 0.6], [[43], 12, 2, 0.6], [[38], 14, 2, 0.6]];
// The second line's bass drum: the march pulse on 1 and 3, then the tresillo 3+3+2 (a low drum-like note).
const PULSE: G = [0, 2, 4, 6].map((b): [number[], number, number, number?] => [[36], b, 0.3, 0.7]);
const TRESILLO: G = [0, 1.5, 3, 4, 5.5, 7].map((b): [number[], number, number, number?] => [[36], b, 0.3, 0.7]);

// Odd meters (STYLE-MEDITERRANEAN-TOUCH §1): 8ths with the group starts accented — 7/8 2+2+3, 9/8 2+2+2+3, 3+3+3.
const groups = (gs: number[], reps: number): G => {
  const out: G = [];
  const len = gs.reduce((a, b) => a + b, 0);
  for (let r = 0; r < reps; r++) {
    let at = r * len;
    for (const g of gs) {
      for (let k = 0; k < g; k++) out.push([[k === 0 ? 84 : 79], at + k, 0.1, k === 0 ? 0.7 : 0.3]);
      at += g;
    }
  }
  return out;
};
/** Shells on the group starts of 7/8 (Dm7 → G7): F–C, then F–B. */
const ODD_COMP: G = [[[50], 0, 7, 0.5], [[53, 60], 0, 2], [[53, 60], 2, 2], [[53, 60], 4, 3], [[43], 7, 7, 0.5], [[53, 59], 7, 2], [[53, 59], 9, 2], [[53, 59], 11, 3]];

export const LESSONS: MiniLesson[] = [
  {
    id: 'style-gospel',
    area: 'play',
    emoji: '',
    title: { en: 'Gospel piano', he: 'פסנתר גוספל' },
    takeaway: { en: 'The church sound: IV to I again and again, triads rocking through their inversions, and bass walk-ups into the next chord.', he: 'הצליל של הכנסייה: IV ל־I שוב ושוב, משולשים שמתנדנדים דרך ההיפוכים, ועליות בבס אל האקורד הבא.' },
    steps: [
      { say: { en: 'Hi {name}! Gospel lives on the plagal move, four to one. Over a held C in the bass, the right hand rocks between C and F with the C on top.', he: 'היי {name}! הגוספל חי על התנועה הפלגלית, ארבע לאחת. מעל דו מוחזק בבס, יד ימין מתנדנדת בין דו לפה, והדו נשאר למעלה.' }, play: [grid(80, PLAGAL, 8)], show: { text: { en: 'IV → I', he: 'IV ← I' } } },
      { say: { en: 'Gospel players repeat that move through whole sections, not only at the end of a phrase.', he: 'נגני גוספל חוזרים על התנועה הזאת לאורך קטעים שלמים, לא רק בסוף משפט.' }, show: { text: { en: 'I – IV – I – IV', he: 'I – IV – I – IV' } } },
      { say: { en: 'Then rock it up the keyboard: root position, first inversion, second inversion, the top voice moving by step. Here C rocks to D minor in each position.', he: 'אחר כך מנדנדים אותה במעלה המקלדת: מצב יסודי, היפוך ראשון, היפוך שני, והקול העליון זז בצעדים. כאן דו מתנדנד לרה מינור בכל מצב.' }, play: [grid(90, ROCK, 8)], show: { text: { en: 'I – ii', he: 'I – ii' } } },
      { say: { en: 'The walk-up: the bass climbs one, two, three, four, under C, B flat over D, C over E, and lands on F major seven.', he: 'העלייה: הבס עולה אחת, שתיים, שלוש, ארבע, מתחת לדו, סי במול מעל רה, דו מעל מי, ונוחת על פה מז׳ור שבע.' }, play: [grid(80, WALKUP, 8)], show: { text: { en: '1 · 2 · 3 · 4', he: '1 · 2 · 3 · 4' } } },
      { say: { en: 'The one thing to watch: keep the hands close and move each voice the shortest way. Free time first, then the tempo ladder, in all twelve keys.', he: 'הדבר האחד לשים אליו לב: הידיים קרובות וכל קול זז בדרך הקצרה ביותר. קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'The minor plagal: four, four minor, one. Listen to the inner voice: the sixth falls to the flat sixth, then to the fifth.', he: 'הפלגלית המינורית: ארבע, ארבע מינור, אחת. הקשיבו לקול הפנימי: השש יורד לשש במול, ואז לחמש.' }, play: [grid(70, [[[53], 0, 2, 0.5], [[60, 65, 69], 0, 2], [[53], 2, 2, 0.5], [[60, 65, 68], 2, 2], [[48], 4, 4, 0.5], [[60, 64, 67], 4, 4]], 8)] },
      { say: { en: 'The gospel sus dominant is simply the four chord over the fifth: F over G. When the sus resolves, only the fourth falls to the third.', he: 'הדומיננטה הסאס של הגוספל היא פשוט אקורד הארבע מעל החמש: פה מעל סול. כשהסאס נפתר, רק הרביעית יורדת לטרצה.' }, play: [grid(70, [[[43], 0, 4, 0.5], [[65, 69, 72], 0, 2], [[65, 69, 71], 2, 2], [[48], 4, 4, 0.5], [[64, 67, 72], 4, 4]], 8)] },
      { say: { en: 'Passing chords colour the way: a chromatic dominant walk-up into four, one-six-two-five with an altered six, and a diminished chord between four and one over five.', he: 'אקורדים עוברים צובעים את הדרך: עלייה כרומטית של דומיננטים אל ארבע, אחת־שש־שתיים־חמש עם שש אלטרד, ואקורד מוקטן בין ארבע לאחת מעל חמש.' } },
      { say: { en: 'Small slides make it sing: a grace note from a half step below into the third of each chord.', he: 'החלקות קטנות נותנות לזה לשיר: צליל חן מחצי טון מתחת אל הטרצה של כל אקורד.' }, play: [grid(80, [[[48], 0, 4, 0.5], [[63], 0, 0.15, 0.4], [[64, 67, 72], 0.15, 3.8], [[53], 4, 4, 0.5], [[68], 4, 0.15, 0.4], [[65, 69, 72], 4.15, 3.8]], 8)] },
      { say: { en: 'In melodies, gospel often avoids the seventh degree. Two gospel scales: one two three four five six, and one two flat three three five six. A tendency, not a rule: the seventh stays in the chords.', he: 'במנגינות, הגוספל נמנע הרבה פעמים מהדרגה השביעית. שני סולמות גוספל: אחת שתיים שלוש ארבע חמש שש, ואחת שתיים שלוש במול שלוש חמש שש. נטייה, לא חוק: הספטימה נשארת באקורדים.' } },
      { say: { en: 'Slow gospel is often felt in twelve-eight: an octave in the bass on one and three, and the right hand repeating the triad on every triplet.', he: 'גוספל איטי מורגש הרבה פעמים בשתים־עשרה שמיניות: אוקטבה בבס על אחת ושלוש, ויד ימין חוזרת על המשולש בכל טריולה.' } },
      { say: { en: 'Recap: four to one again and again; rock through the inversions; walk the bass up; close hands, short moves.', he: 'לסיכום: ארבע לאחת שוב ושוב; להתנדנד דרך ההיפוכים; להעלות את הבס; ידיים קרובות, תנועות קצרות.' } },
    ],
  },
  {
    id: 'style-souljazz',
    area: 'play',
    emoji: '',
    title: { en: 'Soul-jazz and funk', he: 'סול-ג׳אז ופאנק' },
    takeaway: { en: 'Soul-jazz: the blues with added ii–Vs, comped with the Charleston in 3rds and 7ths. Funk: 16ths, the heavy "one", and one chord that lasts.', he: 'סול-ג׳אז: הבלוז עם ii–V נוספים, בליווי צ׳רלסטון בטרצות וספטימות. פאנק: שש־עשריות, ה"אחת" הכבדה, ואקורד אחד שמחזיק.' },
    steps: [
      { say: { en: 'Hi {name}! Soul-jazz is jazz soaked in blues and gospel, the organ-trio sound of the sixties. Call and response sits at its heart.', he: 'היי {name}! סול-ג׳אז הוא ג׳אז ספוג בבלוז ובגוספל, הצליל של שלישיות האורגן בשנות השישים. שאלה ותשובה הן הלב שלו.' }, show: { text: { en: 'call · response', he: 'שאלה · תשובה' } } },
      { say: { en: 'The basic comp is the Charleston: beat one and the and of two, with just two notes, the third and the seventh.', he: 'הליווי הבסיסי הוא הצ׳רלסטון: פעמה אחת וה"וְ" של שתיים, רק בשני צלילים, הטרצה והספטימה.' }, play: [grid(100, CHARLESTON, 8)], show: { text: { en: '1 · &2', he: '1 · וְ2' } } },
      { say: { en: 'The soul-jazz blues adds a two-five in bars four, eight, ten and twelve. Slow shuffles are central.', he: 'בלוז הסול-ג׳אז מוסיף שתיים־חמש בתיבות ארבע, שמונה, עשר ושתים־עשרה. שאפלים איטיים הם הלב.' }, show: { text: { en: 'ii–V: 4 · 8 · 10 · 12', he: 'ii–V: 4 · 8 · 10 · 12' } } },
      { say: { en: 'Funk turns the weight to the one: the first beat of the bar gets the heavy accent, with sixteenths moving underneath. Here a nine chord on every beat, muted strokes between.', he: 'הפאנק מעביר את המשקל ל"אחת": הפעמה הראשונה בתיבה מקבלת את ההטעמה הכבדה, ושש־עשריות זזות מתחת. כאן אקורד תשע על כל פעמה, ופריטות מושתקות ביניהן.' }, play: [grid(90, FUNK, 4)], show: { text: { en: 'the one', he: 'האחת' } } },
      { say: { en: 'The bass locks with it: the root on the one, an octave, dead notes between.', he: 'הבס ננעל איתו: השורש על האחת, אוקטבה, ותווים מתים ביניהם.' }, play: [grid(90, FUNK_BASS, 4)] },
      { say: { en: 'The one thing to watch: in funk the hand never stops moving, even through the rests. Free time first, then the tempo ladder, in all twelve keys.', he: 'הדבר האחד לשים אליו לב: בפאנק היד לא מפסיקה לזוז, גם בהפסקות. קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'Behind an organist, guitarists also comp in drop two, adding the flat nine, sharp nine or flat thirteen to the dominants.', he: 'מאחורי נגן אורגן, גיטריסטים מלווים גם בדרופ 2, ומוסיפים לדומיננטים את התשע במול, התשע דיאז או השלוש־עשרה במול.' } },
      { say: { en: 'Under the shuffle the bass walks, or plays the boogie figure: root, three, five, six, flat seven, six, five, three.', he: 'מתחת לשאפל הבס הולך, או מנגן את דמות הבוגי: שורש, שלוש, חמש, שש, שבע במול, שש, חמש, שלוש.' }, play: [grid(100, BOOGIE, 4)] },
      { say: { en: 'Funk often stays on one chord, or on a minor seventh and a related dominant. Players lean on dorian or mixolydian and the blues scale.', he: 'פאנק נשאר הרבה פעמים על אקורד אחד, או על מינור שבע ודומיננטה קשורה. הנגנים נשענים על דורי או מיקסולידי ועל סולם הבלוז.' } },
      { say: { en: 'Funk chords are extended: minor elevenths, ninths, six-nines. Guitarists love the nine chord.', he: 'אקורדי הפאנק מורחבים: מינור אחת־עשרה, תשיעיות, שש־תשע. גיטריסטים אוהבים את אקורד התשע.' }, play: [grid(80, [[[48, 52, 58, 62, 67], 0, 2], [[48, 51, 55, 58, 62], 2, 2]], 4)] },
      { say: { en: 'On the organ, loudness comes from the swell pedal, not the fingers, and the percussion speaks only on detached notes.', he: 'באורגן, העוצמה באה מדוושת העוצמה ולא מהאצבעות, והפרקשן נשמע רק בצלילים מנותקים.' } },
      { say: { en: 'Soul-jazz solos grow from short repeated riffs moved through the chords, organ-style double stops, and the blues scale over the whole form. Play a phrase, leave space, then answer it.', he: 'סולו בסול-ג׳אז צומח מריפים קצרים שחוזרים וזזים עם האקורדים, צלילים כפולים בסגנון אורגן, וסולם הבלוז לאורך כל הצורה. מנגנים משפט, משאירים מקום, ואז עונים לו.' } },
      { say: { en: 'Recap: the Charleston in guide tones over the blues with its two-fives; in funk, sixteenths, the one, and one chord that lasts.', he: 'לסיכום: צ׳רלסטון בצלילים מנחים על הבלוז עם ה־ii–V שלו; בפאנק, שש־עשריות, האחת, ואקורד אחד שמחזיק.' } },
    ],
  },
  {
    id: 'style-nola',
    area: 'play',
    emoji: '',
    title: { en: 'New Orleans: stride, boogie, the 2-feel', he: 'ניו אורלינס: סטרייד, בוגי, בשתיים' },
    takeaway: { en: 'Stride: bass on 1 and 3, a chord on 2 and 4. Boogie: one left-hand figure, eight to the bar. The bass and the parade drum: 1 and 3.', he: 'סטרייד: בס על 1 ו־3, אקורד על 2 ו־4. בוגי: דמות אחת ביד שמאל, שמונה לתיבה. הבס ותוף המצעד: 1 ו־3.' },
    steps: [
      { say: { en: 'Hi {name}! Stride is the root of jazz piano. The left hand keeps four beats: a low bass note on one and three, a chord in the middle on two and four.', he: 'היי {name}! סטרייד הוא השורש של פסנתר הג׳אז. יד שמאל שומרת על ארבע פעמות: צליל בס נמוך על אחת ושלוש, אקורד באמצע על שתיים וארבע.' }, play: [grid(110, STRIDE, 8)], show: { text: { en: 'bass · chord · bass · chord', he: 'בס · אקורד · בס · אקורד' } } },
      { say: { en: 'It took the oom-pah of ragtime and swung it, and the left hand strides further across the keys.', he: 'הוא לקח את האום־פה של הרגטיים והוסיף לו סווינג, ויד שמאל צועדת רחוק יותר על המקלדת.' }, show: { text: { en: 'oom-pah → stride', he: 'אום־פה ← סטרייד' } } },
      { say: { en: 'Boogie-woogie is eight to the bar: one repeating left-hand figure moved with the chords of the blues. Here the walking line.', he: 'בוגי־ווגי הוא שמונה לתיבה: דמות אחת שחוזרת ביד שמאל וזזה עם האקורדים של הבלוז. כאן הקו ההולך.' }, play: [grid(100, BOOGIE, 4)], show: { text: { en: '8 to the bar', he: '8 לתיבה' } } },
      { say: { en: 'The bass plays in two: the root on one and the fifth on three, like a tuba in a brass band.', he: 'הבס מנגן בשתיים: השורש על אחת והקווינטה על שלוש, כמו טובה בלהקת כלי נשיפה.' }, play: [grid(120, TWO_FEEL, 16)], show: { text: { en: '1 · 3', he: '1 · 3' } } },
      { say: { en: 'In a second-line parade the bass drum holds the march pulse on one and three, and the tresillo, three, three, two, is a building block.', he: 'בתהלוכת סקנד ליין תוף הבס מחזיק את פעימת המצעד על אחת ושלוש, והטרסיו, שלוש, שלוש, שתיים, הוא אבן בניין.' }, play: [grid(100, [...PULSE, ...TRESILLO.map(([m, b, d, v]): [number[], number, number, number?] => [m, b + 8, d, v])], 16)], show: { text: { en: '3 + 3 + 2', he: '3 + 3 + 2' } } },
      { say: { en: 'The one thing to watch: the left hand leaps but never rushes. Free time first, then the tempo ladder, in all twelve keys.', he: 'הדבר האחד לשים אליו לב: יד שמאל קופצת אבל לא ממהרת. קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'Stride grows in steps: a single bass note, then octaves, then tenths, rolled if your hand is small, then a bass that walks on three.', he: 'הסטרייד גדל בשלבים: צליל בס בודד, אחר כך אוקטבות, אחר כך דצימות, שבורות אם היד קטנה, ואז בס שהולך על שלוש.' }, play: [grid(110, [[[36, 48], 0, 1, 0.6], [[55, 60, 64], 1, 1, 0.45], [[43, 55], 2, 1, 0.6], [[55, 60, 64], 3, 1, 0.45]], 4)] },
      { say: { en: 'Two classic progressions: one, six seven, two seven, five seven, a chain of dominants; and four, sharp four diminished, one over five.', he: 'שני מהלכים קלאסיים: אחת, שש שבע, שתיים שבע, חמש שבע, שרשרת של דומיננטים; וארבע, ארבע דיאז מוקטן, אחת מעל חמש.' } },
      { say: { en: 'Boogie has three left-hand figures here: the five-six shuffle, the walking line, and broken octaves.', he: 'לבוגי יש כאן שלוש דמויות ליד שמאל: השאפל של חמש־שש, הקו ההולך ואוקטבות שבורות.' }, play: [grid(100, [[[36, 43], 0, 0.5], [[36, 43], 0.67, 0.33], [[36, 45], 1, 0.5], [[36, 45], 1.67, 0.33], [[36, 43], 2, 0.5], [[36, 43], 2.67, 0.33], [[36, 45], 3, 0.5], [[36, 45], 3.67, 0.33]], 4)] },
      { say: { en: 'The second-line feel sits between straight and swung: measured long to short, about four to three.', he: 'התחושה של הסקנד ליין יושבת בין ישר לסווינג: נמדד ארוך לקצר, בערך ארבע לשלוש.' } },
      { say: { en: 'In a parade the snare improvises off the march beat. Here you play the bass drum; the snare is for later, with a teacher.', he: 'בתהלוכה הסנר מאלתר מחוץ לפעימת המצעד. כאן מנגנים את תוף הבס; הסנר יבוא אחר כך, עם מורה.' } },
      { say: { en: 'Ragtime is the root: the same oom-pah left hand, played in straight eighths. Stride took it and swung it. Listen for the difference: straight is even, swung is long, then short.', he: 'הרגטיים הוא השורש: אותה יד שמאל של אום־פה, בשמיניות ישרות. הסטרייד לקח אותה והוסיף לה סווינג. הקשיבו להבדל: ישר זה שווה, סווינג זה ארוך ואז קצר.' } },
      { say: { en: 'Recap: stride, bass on one and three and chords between; boogie, one figure eight to the bar; the bass and the parade drum in two.', he: 'לסיכום: סטרייד, בס על אחת ושלוש ואקורדים ביניהם; בוגי, דמות אחת שמונה לתיבה; הבס ותוף המצעד בשתיים.' } },
    ],
  },
  {
    id: 'style-odd-jazz',
    area: 'play',
    emoji: '',
    title: { en: 'Odd meters in jazz: 7/8 and 9/8', he: 'משקלים אי־זוגיים בג׳אז: 7/8 ו־9/8' },
    takeaway: { en: 'Count the 8ths in groups of two and three; comp on the group starts; change chords on a group boundary.', he: 'סופרים את השמיניות בקבוצות של שתיים ושלוש; מלווים על תחילת הקבוצות; מחליפים אקורד על גבול של קבוצה.' },
    steps: [
      { say: { en: 'Hi {name}! Jazz borrows odd meters and feels them in straight eighths, grouped in twos and threes. Seven-eight here is two, two, three.', he: 'היי {name}! הג׳אז שואל משקלים אי־זוגיים ומרגיש אותם בשמיניות ישרות, בקבוצות של שתיים ושלוש. שבע־שמיניות כאן הוא שתיים, שתיים, שלוש.' }, play: [grid(200, groups([2, 2, 3], 3), 21)], show: { text: { en: '2 + 2 + 3', he: '2 + 2 + 3' } } },
      { say: { en: 'Nine-eight as two, two, two, three: the long group comes last and limps a little.', he: 'תשע־שמיניות כשתיים, שתיים, שתיים, שלוש: הקבוצה הארוכה באה בסוף וצולעת קצת.' }, play: [grid(220, groups([2, 2, 2, 3], 3), 27)], show: { text: { en: '2 + 2 + 2 + 3', he: '2 + 2 + 2 + 3' } } },
      { say: { en: 'Comping marks the group starts. Here shells, the third and the seventh, on every group of seven-eight over D minor and G.', he: 'הליווי מסמן את תחילת הקבוצות. כאן שלדים, הטרצה והספטימה, על כל קבוצה של שבע־שמיניות, מעל רה מינור וסול.' }, play: [grid(200, ODD_COMP, 14)], show: { text: { en: 'shells on the groups', he: 'שלדים על הקבוצות' } } },
      { say: { en: 'Then thin it out: only the first and the last group, then the next chord an eighth early. Change chords on a group boundary.', he: 'אחר כך מדללים: רק הקבוצה הראשונה והאחרונה, ואז האקורד הבא שמינית מוקדם. מחליפים אקורד על גבול של קבוצה.' }, show: { text: { en: 'first · last · early', he: 'ראשונה · אחרונה · מוקדם' } } },
      { say: { en: 'The one thing to watch: say the groups out loud while you play. Free time first, then the tempo ladder, in all twelve keys.', he: 'הדבר האחד לשים אליו לב: אמרו את הקבוצות בקול בזמן שאתם מנגנים. קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'Count with numbers that restart on every group: one two, one two, one two three. Or the syllables ta-ka, ta-ka, ta-ki-ta.', he: 'סופרים במספרים שמתחילים מחדש בכל קבוצה: אחת שתיים, אחת שתיים, אחת שתיים שלוש. או בהברות טה־קה, טה־קה, טה־קי־טה.' }, play: [grid(180, groups([2, 2, 3], 2), 14)] },
      { say: { en: 'A four-bar nine-eight cycle: three bars of two, two, two, three, then one bar of three, three, three.', he: 'מחזור תשע־שמיניות של ארבע תיבות: שלוש תיבות של שתיים, שתיים, שתיים, שלוש, ואז תיבה אחת של שלוש, שלוש, שלוש.' }, play: [grid(240, [...groups([2, 2, 2, 3], 3), ...groups([3, 3, 3], 1).map(([m, b, d, v]): [number[], number, number, number?] => [m, b + 27, d, v])], 36)] },
      { say: { en: 'The harmony follows the groups: two minor on the first groups, five on the rest, so the change falls where the long group begins.', he: 'ההרמוניה הולכת אחרי הקבוצות: שתיים מינור על הקבוצות הראשונות, חמש על השאר, כך שהחילוף נופל במקום שבו מתחילה הקבוצה הארוכה.' } },
      { say: { en: 'Rotate the same seven eighths, two two three, three two two, two three two, so no grouping feels strange.', he: 'מסובבים את אותן שבע שמיניות, שתיים שתיים שלוש, שלוש שתיים שתיים, שתיים שלוש שתיים, כך שאף חלוקה לא תרגיש זרה.' } },
      { say: { en: 'This stays a touch inside jazz. The hijaz colour lives in Improvise, as a scale option on a dominant that resolves to minor.', he: 'זה נשאר נגיעה בתוך הג׳אז. צבע החיג׳אז גר באלתור, כאפשרות סולם על דומיננטה שנפתרת למינור.' } },
      { say: { en: 'Practise in steps: clap only the group starts over an eighth-note click, then only the long group. Then the left hand on the group starts while the right hand plays every eighth.', he: 'מתרגלים בשלבים: מוחאים כפיים רק בתחילת הקבוצות מעל קליק של שמיניות, ואז רק בקבוצה הארוכה. אחר כך יד שמאל על תחילת הקבוצות, ויד ימין מנגנת כל שמינית.' } },
      { say: { en: 'Recap: straight eighths in groups; comp on the group starts; change chords on a group boundary.', he: 'לסיכום: שמיניות ישרות בקבוצות; ליווי על תחילת הקבוצות; החלפת אקורד על גבול של קבוצה.' } },
    ],
  },
];

/** Each family's first level opens with its teaching screen (pathWiring.ts). */
export const UNITS: Record<string, string> = {
  'tech:k-gospel': 'style-gospel',
  'tech:k-souljazz': 'style-souljazz',
  'tech:g-soul': 'style-souljazz',
  'tech:b-soul': 'style-souljazz',
  'tech:k-nola': 'style-nola',
  'tech:b-nola': 'style-nola',
  'tech:k-odd': 'style-odd-jazz',
};

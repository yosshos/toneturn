// SPEC-JAZZ-NEIGHBOURS §2, §3: the teaching screens of the Brazilian and Afro-Cuban comping families (k-brazil /
// g-brazil, k-montuno / g-guajeo). Every claim follows docs/research/STYLE-BRAZIL.md and STYLE-AFROCUBAN.md ([V] / [C]
// lines only); the sound examples are the conventions themselves (rhythms are not protectable), no tune.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** Free timed notes on a beat grid: [midi[], beat, beats, velocity], at `bpm`. */
const grid = (bpm: number, list: [number[], number, number, number?][], beats: number): Stimulus => {
  const s = 60 / bpm;
  const events: NoteEvent[] = list.flatMap(([ms, b, d, v = 0.55]) => ms.map((midi) => ({ midi, start: b * s, duration: d * s * 0.95, velocity: v })));
  return { kind: 'events', events, length: beats * s + 0.3 };
};

// C major 7 without its root (3-5-7-9) over the left hand's C and G (STYLE-BRAZIL §1(b)).
const CM9 = [64, 67, 71, 74];
const LH = (bar: number): [number[], number, number, number?][] => [[[48], bar * 4, 2, 0.6], [[43], bar * 4 + 2, 2, 0.6]];
/** F1 (1, 2, the "and" of 3) for two bars. */
const F1_BARS: [number[], number, number, number?][] = [0, 1].flatMap((bar) => [...LH(bar), [CM9, bar * 4, 1, 0.45], [CM9, bar * 4 + 1, 1.5, 0.45], [CM9, bar * 4 + 2.5, 1.5, 0.45]] as [number[], number, number, number?][]);
/** The bossa-clave comp 3-2: 1, the "and" of 2, 4 | 2, the "and" of 3. */
const F2_BARS: [number[], number, number, number?][] = [...LH(0), ...LH(1), [CM9, 0, 1.5, 0.45], [CM9, 1.5, 1.5, 0.45], [CM9, 3, 1, 0.45], [CM9, 5, 1.5, 0.45], [CM9, 6.5, 1.5, 0.45]];
/** The surdo pickups x..xx..x: root, 5th, 5th, root. */
const SURDO: [number[], number, number, number?][] = [[[48], 0, 1.5, 0.6], [[43], 1.5, 0.5, 0.35], [[43], 2, 1.5, 0.65], [[48], 3.5, 0.5, 0.35]];

// The montuno's grid (STYLE-AFROCUBAN §2.1): C major block chords, the two-side bar on the beats, the three-side on the offbeats.
const C3 = [60, 64, 67];
const ONBAR = (b0: number): [number[], number, number, number?][] => [0, 1, 2, 3].map((k) => [C3, b0 + k, 0.45, 0.5]);
const OFFBAR = (b0: number): [number[], number, number, number?][] => [0, 1, 2, 3].map((k) => [C3, b0 + k + 0.5, 0.45, 0.5]);
/** Son clave 3-2 on a high click (positions 0, 3, 6 | 10, 12 in 8ths). */
const CLAVE32: [number[], number, number, number?][] = [0, 1.5, 3, 5, 6].map((b) => [[96], b, 0.1, 0.5]);

export const LESSONS: MiniLesson[] = [
  {
    id: 'style-bossa-comp',
    area: 'play',
    emoji: '',
    title: { en: 'Bossa and samba comping', he: 'ליווי בוסה וסמבה' },
    takeaway: { en: 'Two layers: the bass is the surdo (root on 1, 5th on 3), the chords are the tamborim (1, 2, the "and" of 3). Straight 8ths, soft, the changes a little early.', he: 'שתי שכבות: הבס הוא הסורדו (שורש על 1, קווינטה על 3), האקורדים הם הטמבורים (1, 2, ה"וְ" של 3). שמיניות ישרות, ברכות, החילופים קצת מוקדם.' },
    steps: [
      { say: { en: 'Hi {name}! Brazilian comping has two layers. The low one is the surdo drum: the bass on beats 1 and 3, the root, then the 5th.', he: 'היי {name}! לליווי ברזילאי יש שתי שכבות. הנמוכה היא תוף הסורדו: הבס על פעמות 1 ו־3, השורש ואז הקווינטה.' }, play: [grid(120, [...LH(0), ...LH(1)], 8)], show: { text: { en: '1 · 3', he: '1 · 3' } } },
      { say: { en: 'The high layer is the tamborim: the chord on 1, on 2, and on the "and" of 3. On guitar the thumb plays the bass and the fingers the chord; on piano, left hand and right hand.', he: 'השכבה הגבוהה היא הטמבורים: האקורד על 1, על 2 ועל ה"וְ" של 3. בגיטרה האגודל מנגן את הבס והאצבעות את האקורד; בפסנתר, יד שמאל ויד ימין.' }, play: [grid(120, F1_BARS, 8)], show: { text: { en: '1 · 2 · &3', he: '1 · 2 · וְ3' } } },
      { say: { en: 'The bossa-clave comp spreads over two bars: 1, the "and" of 2, 4, then 2 and the "and" of 3. Usually 3-2, sometimes 2-3: the same bars swapped.', he: 'ליווי קלאבת הבוסה נפרש על שתי תיבות: 1, ה"וְ" של 2, 4, ואז 2 וה"וְ" של 3. בדרך כלל 3-2, לפעמים 2-3: אותן תיבות בסדר הפוך.' }, play: [grid(120, F2_BARS, 8)], show: { text: { en: '3 | 2', he: '3 | 2' } } },
      { say: { en: 'The one thing to watch: the 8ths are straight, not swung, and the energy stays low. Samba is the same idea, twice as dense, with the accent on beat 2 of each 2/4 bar.', he: 'הדבר האחד לשים אליו לב: השמיניות ישרות, לא סווינג, והאנרגיה נשארת נמוכה. סמבה היא אותו רעיון, צפוף פי שניים, עם ההטעמה על פעמה 2 של כל תיבת 2/4.' }, show: { text: { en: 'straight · soft · 2', he: 'ישר · רך · 2' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder, in all twelve keys. Thumb or left hand alone first, then both layers together.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות. קודם האגודל או יד שמאל לבד, ואז שתי השכבות יחד.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'The surdo has pickups too: a light note just before beat 3 and just before the next 1. Root on 1, 5th, 5th on 3, root. Keep the pickups short and soft so the bass does not gallop.', he: 'גם לסורדו יש הקדמות: צליל קל רגע לפני פעמה 3 ורגע לפני ה־1 הבא. שורש על 1, קווינטה, קווינטה על 3, שורש. ההקדמות קצרות ורכות, כדי שהבס לא ידהר.' }, play: [grid(110, SURDO, 4)] },
      { play: [grid(120, [...LH(0), ...LH(1), [CM9, 0, 1, 0.45], [CM9, 1, 1.5, 0.45], [CM9, 2.5, 1, 0.45], [[65, 69, 72, 76], 3.5, 0.5, 0.5], [[65, 69, 72, 76], 5, 1.5, 0.45], [[65, 69, 72, 76], 6.5, 1.5, 0.45]], 8)], say: { en: 'Anticipation: the new chord is often struck on the "and" before the bar line, not on the downbeat. In samba it comes a 16th early.', he: 'הקדמה: האקורד החדש מנוגן הרבה פעמים על ה"וְ" שלפני קו התיבה, לא על הפעמה הראשונה. בסמבה הוא מגיע שש־עשרית מוקדם.' } },
      { say: { en: 'Voicings: on piano the left hand has the root, so the right hand plays without it — 3, 5, 7, 9 — or 6/9 and stacks of 4ths from the chord’s own scale.', he: 'ווייסינגים: בפסנתר יד שמאל מנגנת את השורש, אז יד ימין מנגנת בלעדיו — 3, 5, 7, 9 — או 6/9 וערימות של קוורטות מתוך הסולם של האקורד עצמו.' } },
      { say: { en: 'The common mistake is looping one figure. Brazilian players vary it: the basic figure, the clave comp, the upbeats, a few bars each.', he: 'הטעות הנפוצה היא לחזור על דמות אחת בלופ. נגנים ברזילאים מגוונים: הדמות הבסיסית, ליווי הקלאבה, ה"וְ"ים, כמה תיבות כל אחת.' } },
      { say: { en: 'With a guitarist in the band, the pianist comps less: held pads and inner voices, and leaves the rhythm to the guitar.', he: 'כשיש גיטריסט בלהקה, הפסנתרן מלווה פחות: אקורדים מוחזקים וקולות פנימיים, ומשאיר את הקצב לגיטרה.' } },
      { say: { en: 'Recap: bass on 1 and 3, chords on 1, 2 and the "and" of 3; straight, soft, varied; the changes a little early.', he: 'לסיכום: בס על 1 ו־3, אקורדים על 1, 2 וה"וְ" של 3; ישר, רך, מגוון; החילופים קצת מוקדם.' } },
    ],
  },
  {
    id: 'style-montuno',
    area: 'play',
    emoji: '',
    title: { en: 'The montuno', he: 'המונטונו' },
    takeaway: { en: 'A two-bar figure in the clave: the bar on the clave’s three-side is played all on the offbeats, the bar on its two-side on the beats.', he: 'דמות של שתי תיבות בתוך הקלאבה: התיבה שעל צד השלוש של הקלאבה מנוגנת כולה על ה"וְ"ים, התיבה שעל צד השתיים על הפעמות.' },
    steps: [
      { say: { en: 'Hi {name}! The montuno, or guajeo, began on the Cuban tres guitar and moved to the piano. It repeats over two bars, and it lives inside the clave.', he: 'היי {name}! המונטונו, או הגואחאו, התחיל בגיטרת הטרס הקובנית ועבר לפסנתר. הוא חוזר על עצמו כל שתי תיבות, והוא חי בתוך הקלאבה.' }, play: [grid(100, CLAVE32, 8)], show: { text: { en: '3 | 2', he: '3 | 2' } } },
      { say: { en: 'The rule: the bar that sits on the clave’s three-side is played all on the offbeats; the bar on the two-side, on the beats.', he: 'הכלל: התיבה שיושבת על צד השלוש של הקלאבה מנוגנת כולה על ה"וְ"ים; התיבה שעל צד השתיים, על הפעמות.' }, play: [grid(100, [...OFFBAR(0), ...ONBAR(4), ...CLAVE32], 8)], show: { text: { en: 'off | on', he: 'וְ | פעמה' } } },
      { say: { en: 'In 2-3 the figure starts on the beats; in 3-2 it starts on the offbeats. The direction comes from where the chords start against the clave.', he: 'ב־2-3 הדמות מתחילה על הפעמות; ב־3-2 היא מתחילה על ה"וְ"ים. הכיוון נקבע לפי המקום שבו האקורדים מתחילים מול הקלאבה.' }, play: [grid(100, [...ONBAR(0), ...OFFBAR(4)], 8)] },
      { say: { en: 'The one thing to watch: never cross the clave. A 2-3 figure over a 3-2 clave sounds wrong, and moving it by a beat does not fix it.', he: 'הדבר האחד לשים אליו לב: לא לחצות את הקלאבה. דמות 2-3 מעל קלאבה 3-2 נשמעת לא נכון, והזזה בפעמה לא מתקנת את זה.' }, show: { text: { en: 'in clave', he: 'בתוך הקלאבה' } } },
      { say: { en: 'Your turn: block chords on the grid first, then the figure, then the changes — free time first, then the tempo ladder, in all twelve keys.', he: 'תורכם: קודם אקורדים חסומים על הרשת, אחר כך הדמות, ואז המהלך — קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { play: [grid(100, [[[55, 67], 0, 0.45, 0.5], [[60, 64], 1, 0.45, 0.45], [[57, 69], 2, 0.45, 0.5], [[60, 65], 3, 0.45, 0.45], [[59, 71], 4.5, 0.45, 0.5], [[62, 67], 5.5, 0.45, 0.45], [[57, 69], 6.5, 0.45, 0.5], [[60, 65], 7.5, 0.45, 0.45]], 8)], say: { en: 'Ponchando is the simple form: block chords on the attack points. The figure itself puts the line note in octaves, with the other chord tones between. Here over C, F, G and F: the octaves climb by step while the inner notes change with each chord.', he: 'פונצ׳נדו היא הצורה הפשוטה: אקורדים חסומים על נקודות הנגינה. הדמות עצמה שמה את צליל הקו באוקטבות, ואת שאר צלילי האקורד ביניהן. כאן על דו, פה, סול ופה: האוקטבות עולות בצעדים והצלילים הפנימיים מתחלפים עם כל אקורד.' } },
      { say: { en: 'The left hand doubles the line one or two octaves lower, and chord changes often come an 8th early.', he: 'יד שמאל מכפילה את הקו אוקטבה או שתיים נמוך יותר, וחילופי האקורדים מגיעים הרבה פעמים שמינית מוקדם.' } },
      { play: [grid(100, [[[43], 1.5, 1.5, 0.6], [[41], 3, 2.5, 0.6], [[36], 5.5, 1.5, 0.6], [[36], 7, 1, 0.6], ...CLAVE32], 8)], say: { en: 'Under it the bass plays the tumbao: nothing on 1, the "and" of 2 and beat 4, and the 4 already belongs to the next chord.', he: 'מתחת לזה הבס מנגן טומבאו: כלום על 1, ה"וְ" של 2 ופעמה 4, וה־4 כבר שייך לאקורד הבא.' } },
      { say: { en: 'Jazz harmony entered the montuno in the 1940s: a ii–V in two bars, or a ii–V–I over four.', he: 'ההרמוניה של הג׳אז נכנסה למונטונו בשנות הארבעים: ii–V בשתי תיבות, או ii–V–I על פני ארבע.' } },
      { say: { en: 'In songo the right hand plays on the four beats over a looping minor progression, while the drums and bass build the syncopation around it.', he: 'בסונגו יד ימין מנגנת על ארבע הפעמות מעל מהלך מינורי שחוזר בלופ, והתופים והבס בונים את הסינקופה סביבה.' } },
      { say: { en: 'A practice tip: say the clave out loud while you play the figure. If your hands and your voice agree on which bar is the three-side, you are in clave.', he: 'טיפ לתרגול: אמרו את הקלאבה בקול בזמן שאתם מנגנים את הדמות. אם הידיים והקול מסכימים איזו תיבה היא צד השלוש, אתם בתוך הקלאבה.' } },
      { say: { en: 'Recap: two bars, in clave; the three-side on the offbeats, the two-side on the beats; 2-3 or 3-2 by where the chords start.', he: 'לסיכום: שתי תיבות, בתוך הקלאבה; צד השלוש על ה"וְ"ים, צד השתיים על הפעמות; 2-3 או 3-2 לפי המקום שבו האקורדים מתחילים.' } },
    ],
  },
];

/** Each family's first level opens with its teaching screen (pathWiring.ts). */
export const UNITS: Record<string, string> = {
  'tech:k-brazil': 'style-bossa-comp',
  'tech:g-brazil': 'style-bossa-comp',
  'tech:k-montuno': 'style-montuno',
  'tech:g-guajeo': 'style-montuno',
};

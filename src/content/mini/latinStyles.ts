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

// Cha-cha-chá (STYLE-AFROCUBAN §2.5): the montuno figure on the beats over C F | G F — the octave line G–A–B–A, the
// other chord tones between; the bell on every beat, the conga on 4 and its "and" (high and low clicks).
type GN4 = [number[], number, number, number?];
const CC_FIG: GN4[] = [
  [[55, 67], 0, 0.45, 0.5], [[60, 64], 1, 0.45, 0.42], [[57, 69], 2, 0.45, 0.5], [[60, 65], 3, 0.45, 0.42],
  [[59, 71], 4, 0.45, 0.5], [[62, 67], 5, 0.45, 0.42], [[57, 69], 6, 0.45, 0.5], [[60, 65], 7, 0.45, 0.42],
];
const CC_BLOCK: GN4[] = [...[0, 1, 2, 3].map((k): GN4 => [C3, k, 0.45, 0.45]), ...[0, 1, 2, 3].map((k): GN4 => [[60, 65, 69], 4 + k, 0.45, 0.45])];
const BELL4: GN4[] = Array.from({ length: 8 }, (_, k): GN4 => [[96], k, 0.1, 0.4]);
const CONGA: GN4[] = [3, 3.5, 7, 7.5].map((b): GN4 => [[52], b, 0.25, 0.6]);
/** The tumbao-like bass under it: the "and" of 2 and beat 4, the 4 already the next chord (C F | G F). */
const CC_BASS: GN4[] = [[[48], 1.5, 1.5, 0.6], [[41], 3, 2.5, 0.6], [[43], 5.5, 1.5, 0.6], [[41], 7, 1, 0.6]];

// Bolero (STYLE-AFROCUBAN §2.6): the bass on 1 and 3 (the root, then the 5th), the chord broken in 8ths, up and down.
const BO_LH = (b0: number, r = 48, f = 43): GN4[] => [[[r], b0, 2, 0.55], [[f], b0 + 2, 2, 0.5]];
const ARP = (b0: number, v: number[]): GN4[] => {
  const up = [...v, ...v.slice(1, -1).reverse()];
  return Array.from({ length: 8 }, (_, k): GN4 => [[up[k % up.length]], b0 + k / 2, 0.5, k % 4 === 0 ? 0.42 : 0.34]);
};
const CMAJ7 = [60, 64, 67, 71];
/** ii–V–I in C over two bars and the tonic: D minor 7 (D, A), G7 (G, D), each with its broken chord. */
const IIV = [...BO_LH(0, 50, 45), ...ARP(0, [60, 62, 65, 69]), ...BO_LH(4, 43, 50), ...ARP(4, [59, 62, 65, 67])];

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
  {
    id: 'style-chacha',
    area: 'play',
    emoji: '',
    title: { en: 'The cha-cha-chá', he: 'הצ׳ה־צ׳ה־צ׳ה' },
    takeaway: { en: 'The montuno, played on the beats: Jorrín took the syncopation out for the dancers. A moderate tempo, the bell on every beat, the cha-cha-chá on 4, its "and" and 1.', he: 'המונטונו, מנוגן על הפעמות: חוֹרִין הוציא את הסינקופה בשביל הרוקדים. טמפו מתון, הפעמון על כל פעמה, הצ׳ה־צ׳ה־צ׳ה על 4, ה"וְ" שלו ו־1.' },
    steps: [
      { say: { en: 'Hi {name}! The cha-cha-chá was born in Havana in the early 1950s, in the charanga bands: flute, violins, piano, bass and percussion. Enrique Jorrín wrote it for dancers.', he: 'היי {name}! הצ׳ה־צ׳ה־צ׳ה נולד בהוואנה בתחילת שנות החמישים, בלהקות הצ׳רנגה: חליל, כינורות, פסנתר, בס וכלי הקשה. אנריקה חוֹרִין כתב אותו בשביל הרוקדים.' }, play: [grid(120, [...CC_BLOCK, ...BELL4], 8)], show: { text: { en: '1 · 2 · 3 · 4', he: '1 · 2 · 3 · 4' } } },
      { say: { en: 'Jorrín took the syncopation out on purpose, so the dancers could follow. So the piano plays its montuno on the beats, in every bar: the octave line, then the inner notes.', he: 'חוֹרִין הוציא את הסינקופה בכוונה, כדי שהרוקדים יוכלו לעקוב. לכן הפסנתר מנגן את המונטונו על הפעמות, בכל תיבה: קו האוקטבות, ואז הצלילים הפנימיים.' }, play: [grid(120, CC_FIG, 8)], show: { text: { en: 'on the beats', he: 'על הפעמות' } } },
      { say: { en: 'The name comes from the dancers’ feet: three quick steps on 4, its "and", and the next 1. In the band the conga marks the 4 and its "and", and the bell plays every beat.', he: 'השם בא מהרגליים של הרוקדים: שלושה צעדים מהירים על 4, ה"וְ" שלו וה־1 הבא. בלהקה הקונגה מסמנת את ה־4 ואת ה"וְ" שלו, והפעמון מנגן כל פעמה.' }, play: [grid(120, [...BELL4, ...CONGA], 8)], show: { text: { en: '4 · & · 1', he: '4 · וְ · 1' } } },
      { say: { en: 'The one thing to watch: the tempo. The cha-cha sits around 120 beats a minute, relaxed and even. Push it much faster and it turns into a mambo.', he: 'הדבר האחד לשים אליו לב: הטמפו. הצ׳ה־צ׳ה יושב סביב 120 פעמות בדקה, רגוע ואחיד. מאיצים הרבה, והוא הופך למאמבו.' }, play: [grid(120, [...CC_FIG, ...BELL4, ...CONGA], 8)], show: { text: { en: '≈ 120', he: '≈ 120' } } },
      { say: { en: 'Your turn: chords on the beats first, then the octave figure, then both hands, then with the band. Free time first, then the tempo ladder, in all twelve keys.', he: 'תורכם: קודם אקורדים על הפעמות, אחר כך דמות האוקטבות, אחר כך שתי ידיים, ואז עם הלהקה. קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { play: [grid(110, CC_FIG, 8)], say: { en: 'The figure is the montuno’s own: the line note in octaves, the other chord tones between. Over C, F, G and F the octaves walk G, A, B, A, and the loop comes back note for note.', he: 'הדמות היא של המונטונו עצמו: צליל הקו באוקטבות, ושאר צלילי האקורד ביניהן. על דו, פה, סול ופה האוקטבות הולכות סול, לה, סי, לה, והלופ חוזר צליל בצליל.' } },
      { say: { en: 'The cha-cha grew out of the danzón: its last section, the montuno, was stretched into a whole dance. That is why the piano part is a montuno, only calmer.', he: 'הצ׳ה־צ׳ה צמח מתוך הדנסון: החלק האחרון שלו, המונטונו, נמתח והפך לריקוד שלם. לכן תפקיד הפסנתר הוא מונטונו, רק רגוע יותר.' } },
      { play: [grid(120, [...CC_BASS, ...BELL4], 8)], say: { en: 'Under the piano the bass plays a tumbao-like line: the "and" of 2 and beat 4, the 4 already the next chord. The güiro scrapes a long stroke and two short ones.', he: 'מתחת לפסנתר הבס מנגן קו בסגנון טומבאו: ה"וְ" של 2 ופעמה 4, וה־4 כבר שייך לאקורד הבא. הגווירו מגרד משיכה ארוכה ושתיים קצרות.' } },
      { say: { en: 'Jazz players love the cha-cha too: a ii–V–I fits the same figure, one chord a bar, the octave line moving by step from chord to chord.', he: 'גם נגני ג׳אז אוהבים צ׳ה־צ׳ה: ⁦ii–V–I⁩ נכנס לאותה דמות, אקורד בכל תיבה, וקו האוקטבות זז בצעדים מאקורד לאקורד.' } },
      { say: { en: 'The mambo goes the other way: the same montuno, syncopated in the clave, much faster, around 180, with big-band horns. In this unit you play both.', he: 'המאמבו הולך לכיוון ההפוך: אותו מונטונו, בסינקופה בתוך הקלאבה, הרבה יותר מהר, בסביבות 180, עם כלי נשיפה של ביג בנד. ביחידה הזאת תנגנו את שניהם.' } },
      { say: { en: 'The common mistake is rushing. Count the dancers’ step while you play: two, three, cha-cha-chá. If the 4 and its "and" feel easy, the tempo is right.', he: 'הטעות הנפוצה היא למהר. ספרו את הצעד של הרוקדים בזמן שאתם מנגנים: שתיים, שלוש, צ׳ה־צ׳ה־צ׳ה. אם ה־4 וה"וְ" שלו מרגישים קלים, הטמפו נכון.' } },
      { say: { en: 'Recap: the montuno on the beats, a moderate tempo, the bell on every beat, the cha-cha-chá on 4, its "and" and 1, in the drums and the dancers’ feet.', he: 'לסיכום: המונטונו על הפעמות, טמפו מתון, הפעמון על כל פעמה, הצ׳ה־צ׳ה־צ׳ה על 4, ה"וְ" שלו ו־1, בתופים וברגליים של הרוקדים.' } },
    ],
  },
  {
    id: 'style-bolero',
    area: 'play',
    emoji: '',
    title: { en: 'The bolero', he: 'הבולרו' },
    takeaway: { en: 'Cuba’s love song: slow, the bass on 1 and 3, the chord broken in even 8ths over it.', he: 'שיר האהבה של קובה: איטי, הבס על 1 ו־3, והאקורד שבור בשמיניות אחידות מעליו.' },
    steps: [
      { say: { en: 'Hi {name}! The bolero is Cuba’s love song. It began with the trova singers of Santiago de Cuba, who sang to their own guitar; the first bolero, "Tristezas", dates from 1883.', he: 'היי {name}! הבולרו הוא שיר האהבה של קובה. הוא התחיל אצל זמרי הטרובה של סנטיאגו דה קובה, ששרו לצד הגיטרה של עצמם; הבולרו הראשון, "טריסטזאס", הוא משנת 1883.' }, play: [grid(72, [...BO_LH(0), ...ARP(0, CMAJ7), ...BO_LH(4), ...ARP(4, CMAJ7)], 8)], show: { text: { en: 'slow', he: 'איטי' } } },
      { say: { en: 'It is slow, about 60 to 90 beats a minute. The left hand keeps the bass on 1 and 3: the root, then the 5th.', he: 'הוא איטי, בערך 60 עד 90 פעמות בדקה. יד שמאל מחזיקה את הבס על 1 ו־3: השורש, ואז הקווינטה.' }, play: [grid(72, [...BO_LH(0), ...BO_LH(4)], 8)], show: { text: { en: '1 · 3', he: '1 · 3' } } },
      { say: { en: 'The right hand breaks the chord into 8ths, up and down, the way the guitar’s half-arpeggios did from the 1920s.', he: 'יד ימין שוברת את האקורד לשמיניות, למעלה ולמטה, כמו חצאי הארפג׳ים של הגיטרה משנות העשרים.' }, play: [grid(72, [...ARP(0, CMAJ7), ...ARP(4, CMAJ7)], 8)], show: { text: { en: 'up · down', he: 'למעלה · למטה' } } },
      { say: { en: 'The one thing to watch: keep the 8ths even and soft. The singer floats freely over a steady pulse, so the pulse itself must not move.', he: 'הדבר האחד לשים אליו לב: השמיניות אחידות ורכות. הזמר מרחף בחופשיות מעל דופק יציב, אז הדופק עצמו לא זז.' }, show: { text: { en: 'even · soft', he: 'אחיד · רך' } } },
      { say: { en: 'Your turn: the left hand alone first, then both hands. Free time first, then the tempo ladder, in all twelve keys.', he: 'תורכם: קודם יד שמאל לבד, ואז שתי ידיים. קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות.' }, play: [grid(72, IIV, 8)], show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { play: [grid(72, IIV, 8)], say: { en: 'Many jazz ballads turn into boleros easily: keep the changes and put the bolero feel underneath. A ii–V–I is the place to start: D minor 7, G7, C major 7.', he: 'הרבה בלדות ג׳אז הופכות לבולרו בקלות: משאירים את ההרמוניה ושמים מתחת את התחושה של הבולרו. ⁦ii–V–I⁩ הוא המקום להתחיל: רה מינור 7, סול 7, דו מז׳ור 7.' } },
      { play: [grid(72, [[[48], 0, 2, 0.55], [[43], 2, 1, 0.5], [[45], 3, 1, 0.5], [[50], 4, 2, 0.55], [[45], 6, 1, 0.5], [[43], 7, 1, 0.5]], 8)], say: { en: 'Some bass players add a note on 4: a half note, then two quarters. It leans each bar toward the next one.', he: 'יש נגני בס שמוסיפים צליל על 4: חצי, ואז שני רבעים. זה מטה כל תיבה אל התיבה הבאה.' } },
      { say: { en: 'In Cuba boleros are usually written in 2/4; elsewhere in 4/4. It is the same music, counted twice as fast on paper.', he: 'בקובה כותבים בולרו בדרך כלל ב־2/4; במקומות אחרים ב־4/4. זו אותה מוזיקה, שנספרת על הנייר מהר פי שניים.' } },
      { say: { en: 'In the 1930s the bolero met the son: the bolero-son of Trío Matamoros, a little more syncopated. In the 1950s came the bolero-cha, with the cha-cha-chá underneath.', he: 'בשנות השלושים הבולרו פגש את הסון: הבולרו־סון של טריו מטמורוס, עם קצת יותר סינקופה. בשנות החמישים הגיע הבולרו־צ׳ה, עם הצ׳ה־צ׳ה־צ׳ה מתחת.' } },
      { say: { en: 'The common mistake is a heavy hand. The arpeggio is a carpet, not a melody: the top note of each turn should not stick out, and the bass speaks a little louder than the 8ths.', he: 'הטעות הנפוצה היא יד כבדה. הארפג׳ו הוא שטיח, לא מנגינה: הצליל העליון בכל סיבוב לא בולט, והבס מדבר קצת חזק יותר מהשמיניות.' } },
      { say: { en: 'Recap: slow, the bass on 1 and 3, the chord broken in even 8ths, soft under a free melody.', he: 'לסיכום: איטי, הבס על 1 ו־3, האקורד שבור בשמיניות אחידות, ברכות מתחת למנגינה חופשית.' } },
    ],
  },
];

/** Each family's first level opens with its teaching screen (pathWiring.ts). */
export const UNITS: Record<string, string> = {
  'tech:k-brazil': 'style-bossa-comp',
  'tech:g-brazil': 'style-bossa-comp',
  'tech:k-montuno': 'style-montuno',
  'tech:g-guajeo': 'style-montuno',
  // 2026-11-23: the cha-cha and bolero levels open with their own screen ("tech:<level id>"); the mambo is the montuno.
  'tech:k-montuno-13': 'style-chacha',
  'tech:k-montuno-19': 'style-bolero',
};

// AUDIT-SCALES (owner 2026-11-14): the quick lessons for the new technique — hand independence (k-indep), harmonizing a
// scale (k-sharm / g-harm), Barry Harris's four diminished scales and borrowing (oblique motion) — and the steps added to
// the 6th-diminished lesson (bh-scale in mini/jazz.ts): the scale goes up AND down in the same eight notes. Every example
// follows the same rules as the drills (harmLadder.ts). See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson, MiniStep } from '../miniTypes';

const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.35): Stimulus => ({ kind: 'rest', duration: d });
const ev = (events: { midi: number; start: number; duration: number; velocity: number }[], length: number): Stimulus => ({ kind: 'events', events, length });

const SIX = [60, 62, 64, 65, 67, 68, 69, 71, 72];
const SIX_UPDOWN = [...SIX, ...SIX.slice(0, -1).reverse()];
const MIN6 = [60, 62, 63, 65, 67, 68, 69, 71, 72];
const DOM7 = [60, 62, 64, 65, 67, 68, 70, 71, 72];
const DOM7B5 = [60, 62, 64, 65, 66, 68, 70, 71, 72];
const C6 = [57, 60, 64, 67];
/** A held chord with one voice stepping away and back (oblique motion). */
const borrow = (held: number[], from: number, to: number): Stimulus =>
  ev([...held.map((m) => ({ midi: m, start: 0, duration: 1.5, velocity: 0.42 })), { midi: from, start: 0, duration: 0.7, velocity: 0.55 }, { midi: to, start: 0.75, duration: 0.35, velocity: 0.62 }, { midi: from, start: 1.12, duration: 0.5, velocity: 0.62 }], 1.8);

/** Added to bh-scale (core): the scale goes up and down in the same eight notes. */
export const BH_UP_DOWN: MiniStep[] = [
  {
    say: { en: 'Play it up and down in the same eight notes: C, E, G and A land on the beats both ways.', he: 'מנגנים אותו עולה ויורד באותם שמונה צלילים: דו, מי, סול ולה נוחתים על הפעמות בשני הכיוונים.' },
    play: [notes(SIX_UPDOWN, 0.2)],
    show: { notes: SIX, key: 'C', text: { en: 'up and down', he: 'עולה ויורד' } },
  },
];

/** Added to bh-scale (in depth). */
export const BH_MORE: MiniStep[] = [
  {
    say: { en: 'It is not a major scale with a passing note on the way down. The A♭ belongs to the scale in both directions, so the chord tones fall on the beats going up too.', he: 'זה לא סולם מז׳ור עם צליל מעבר רק בירידה. הלה במול שייך לסולם בשני הכיוונים, ולכן צלילי האקורד נופלים על הפעמות גם בעלייה.' },
    play: [notes(SIX_UPDOWN, 0.2)],
    show: { notes: SIX, key: 'C', text: { en: 'C D E F G A♭ A B', he: 'C D E F G A♭ A B' } },
  },
];

export const LESSONS: MiniLesson[] = [
  {
    id: 'bh-four-dim',
    area: 'jazz',
    emoji: 'sixdim',
    title: { en: "Barry Harris's four diminished scales", he: 'ארבעת סולמות הדימיניש של בארי האריס' },
    takeaway: { en: 'One diminished chord, B°7, woven with four chords: C6 (major, and m7 through the relative), Cm6 (minor, m7♭5), C7 (the dominant), C7♭5 (altered, the tritone sub).', he: 'אקורד דימיניש אחד, B°7, שזור בארבעה אקורדים: C6 (מז׳ור, ו־m7 דרך הקרוב), ‏Cm6 (מינור, m7♭5), ‏C7 (הדומיננט), ‏C7♭5 (אלטרד, תחליף הטריטון).' },
    steps: [
      {
        say: { en: 'Barry built four eight-note scales on the same diminished chord, B°7. Each weaves it with a different chord, so that chord’s tones land on the beats.', he: 'בארי בנה ארבעה סולמות של שמונה צלילים על אותו דימיניש, B°7. כל אחד שוזר אותו באקורד אחר, וכך צלילי האקורד נוחתים על הפעמות.' },
        play: [chord([59, 62, 65, 68], 1)],
        show: { notes: [59, 62, 65, 68], chord: true, key: 'C', text: { en: 'B°7', he: 'B°7' } },
      },
      {
        say: { en: 'The major 6th: C6 plus B°7. It serves major chords, and a minor 7th through its relative: Dm7 is F6.', he: 'שישית מז׳ור: C6 ועוד B°7. הוא משרת אקורדי מז׳ור, וגם מינור 7 דרך הקרוב שלו: Dm7 הוא F6.' },
        play: [chord([60, 64, 67, 69], 0.7), notes(SIX, 0.2)],
        show: { notes: SIX, key: 'C', text: { en: 'C6 + B°7', he: 'C6 + B°7' } },
      },
      {
        say: { en: 'The minor 6th: Cm6 plus B°7, with E♭. It serves minor chords and the half-diminished: Dm7♭5 is Fm6.', he: 'שישית מינור: Cm6 ועוד B°7, עם מי במול. הוא משרת אקורדי מינור וחצי־מוקטן: Dm7♭5 הוא Fm6.' },
        play: [chord([60, 63, 67, 69], 0.7), notes(MIN6, 0.2)],
        show: { notes: MIN6, key: 'C', text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
      {
        say: { en: 'The dominant 7th: C7 plus B°7 — C, D, E, F, G, A♭, B♭, B. C, E, G and B♭ on the beats. It serves the dominant.', he: 'שביעית דומיננטית: C7 ועוד B°7 — דו, רה, מי, פה, סול, לה במול, סי במול, סי. דו, מי, סול וסי במול על הפעמות. הוא משרת את הדומיננט.' },
        play: [chord([60, 64, 67, 70], 0.7), notes(DOM7, 0.2)],
        show: { notes: DOM7, key: 'C', text: { en: 'C7 + B°7', he: 'C7 + B°7' } },
      },
      {
        say: { en: 'The 7♭5: C7♭5 plus B°7, with G♭. It serves the altered dominant and the tritone substitute: G♭7♭5 has the same four notes.', he: 'שביעית ♭5: ‏C7♭5 ועוד B°7, עם סול במול. הוא משרת את הדומיננט האלטרד ואת תחליף הטריטון: ל־G♭7♭5 אותם ארבעה צלילים.' },
        play: [chord([60, 64, 66, 70], 0.7), notes(DOM7B5, 0.2)],
        show: { notes: DOM7B5, key: 'C', text: { en: 'C7♭5 + B°7', he: 'C7♭5 + B°7' } },
      },
    ],
    more: [
      {
        say: { en: 'Each scale goes up and down in the same eight notes, two octaves, with its chord’s tones on the beats. Start on a chord tone, never on a diminished one.', he: 'כל סולם עולה ויורד באותם שמונה צלילים, שתי אוקטבות, וצלילי האקורד שלו על הפעמות. מתחילים מצליל אקורד, אף פעם לא מצליל של הדימיניש.' },
        play: [notes([...DOM7, ...DOM7.slice(0, -1).reverse()], 0.18)],
      },
      {
        say: { en: 'Harmonize them the same way: every scale tone gets the chord or the diminished, in moving inversions. C7, then B°7 with D on top, then C7 with E on top.', he: 'מהרמנים אותם באותה דרך: כל צליל בסולם מקבל את האקורד או את הדימיניש, בהיפוכים נעים. C7, אחר כך B°7 עם רה למעלה, אחר כך C7 עם מי למעלה.' },
        play: [chord([52, 55, 58, 60], 0.5), chord([53, 56, 59, 62], 0.5), chord([55, 58, 60, 64], 0.8)],
      },
      {
        say: { en: 'Why one diminished serves all four: B°7 is G7♭9 without its root, the dominant of C. Whatever the home chord, the diminished pulls toward it.', he: 'למה דימיניש אחד משרת את כולם: B°7 הוא G7♭9 בלי השורש, הדומיננט של דו. מה שלא יהיה אקורד הבית, הדימיניש מושך אליו.' },
      },
      {
        say: { en: 'A common mistake: mixing the two dominant scales. The 7th scale keeps G; the 7♭5 scale lowers it to G♭. Listen to the beat after F.', he: 'טעות נפוצה: לבלבל בין שני סולמות הדומיננט. בסולם השביעית נשאר סול; בסולם ה־7♭5 הוא יורד לסול במול. הקשיבו לפעמה שאחרי פה.' },
        play: [notes([65, 67, 68], 0.3), rest(0.3), notes([65, 66, 68], 0.3)],
      },
      {
        say: { en: 'On a ii–V–I they line up: Dm7 takes the F 6th scale, G7 the G dominant scale or the D minor 6th, and C the C 6th. One diminished family links all three.', he: 'על ii–V–I הם מסתדרים: Dm7 לוקח את סולם השישית של פה, G7 את סולם הדומיננט של סול או את המינור 6 של רה, ו־C את סולם השישית של דו. משפחת דימיניש אחת מחברת את שלושתם.' },
      },
      {
        say: { en: 'To keep: one diminished chord, four partners. Pick the scale by the chord you are on, and play it through all twelve keys.', he: 'לזכור: דימיניש אחד, ארבעה בני זוג. בוחרים את הסולם לפי האקורד שעליו נמצאים, ומנגנים אותו בכל שנים־עשר הסולמות.' },
      },
    ],
  },
  {
    id: 'bh-borrow',
    area: 'jazz',
    emoji: 'sixdim',
    title: { en: 'Barry Harris: borrowing', he: 'בארי האריס: השאלה' },
    takeaway: { en: 'Borrowing is oblique motion: in a chord of the 6th-diminished scale, one or two voices step to another chord’s note and come back while the others hold.', he: 'השאלה היא תנועה אלכסונית: באקורד של סולם השישית־מוקטן, קול אחד או שניים עוברים לצליל של אקורד אחר וחוזרים, והאחרים מחזיקים.' },
    steps: [
      {
        say: { en: 'Take a C6 chord: A, C, E, G. Hold three notes and let the top one step down to F, from the diminished, and back to G.', he: 'קחו אקורד C6: לה, דו, מי, סול. מחזיקים שלושה צלילים ומורידים את העליון לפה, מהדימיניש, וחזרה לסול.' },
        play: [borrow([57, 60, 64], 67, 65)],
        show: { notes: C6, chord: true, key: 'C', text: { en: 'G → F → G', he: 'G ← F ← G' } },
      },
      {
        say: { en: 'That is oblique motion: one voice moves, the others stay. Barry called it borrowing — the voice borrows a note and returns it.', he: 'זו תנועה אלכסונית: קול אחד זז, האחרים נשארים. בארי קרא לזה השאלה — הקול שואל צליל ומחזיר אותו.' },
        play: [borrow([57, 60, 64], 67, 65)],
      },
      {
        say: { en: 'Any voice can borrow. Here the alto, E, dips to D and comes back.', he: 'כל קול יכול לשאול. כאן האלט, מי, יורד לרה וחוזר.' },
        play: [borrow([57, 60, 67], 64, 62)],
        show: { text: { en: 'alto E → D → E', he: 'אלט E ← D ← E' } },
      },
      {
        say: { en: 'Two voices can borrow together: soprano and alto step down at once, then return.', he: 'שני קולות יכולים לשאול יחד: הסופרן והאלט יורדים יחד, וחוזרים.' },
        play: [ev([...[57, 60].map((m) => ({ midi: m, start: 0, duration: 1.5, velocity: 0.42 })), { midi: 64, start: 0, duration: 0.7, velocity: 0.55 }, { midi: 67, start: 0, duration: 0.7, velocity: 0.55 }, { midi: 62, start: 0.75, duration: 0.35, velocity: 0.62 }, { midi: 65, start: 0.75, duration: 0.35, velocity: 0.62 }, { midi: 64, start: 1.12, duration: 0.5, velocity: 0.62 }, { midi: 67, start: 1.12, duration: 0.5, velocity: 0.62 }], 1.8)],
      },
      {
        say: { en: 'Then walk the scale of chords, C6 and B°7 in turn, and let one voice borrow on every degree. The held keys stay down.', he: 'אחר כך הולכים בסולם האקורדים, C6 ו־B°7 לסירוגין, ונותנים לקול אחד לשאול על כל דרגה. הקלידים המוחזקים נשארים לחוצים.' },
        play: [borrow([57, 60, 64], 67, 65), borrow([59, 62, 65], 68, 67)],
      },
    ],
    more: [
      {
        say: { en: 'Borrow from other places too. From the chord above: G rises to A♭ and returns. From another diminished, a half step outside the scale: C rises to C♯.', he: 'אפשר לשאול גם ממקומות אחרים. מהאקורד שמעל: סול עולה ללה במול וחוזר. מדימיניש אחר, חצי טון מחוץ לסולם: דו עולה לדו דיאז.' },
        play: [borrow([57, 60, 64], 67, 68), rest(0.2), borrow([57, 64, 67], 60, 61)],
      },
      {
        say: { en: 'Or pass through the scale: the top voice runs up a third and back, G, A♭, A, A♭, G, over the held voices.', he: 'או לעבור דרך הסולם: הקול העליון רץ טרצה למעלה וחזרה, סול, לה במול, לה, לה במול, סול, מעל הקולות המוחזקים.' },
        play: [ev([...[57, 60, 64].map((m) => ({ midi: m, start: 0, duration: 2, velocity: 0.42 })), ...[67, 68, 69, 68, 67].map((m, i) => ({ midi: m, start: i * 0.35, duration: 0.33, velocity: 0.6 }))], 2.2)],
      },
      {
        say: { en: 'Over a ii–V–I: Dm7 played as F6 borrows one voice; G7, played as Dm6, borrows two voices from the diminished, which makes G7♭9; then C6.', he: 'על ii–V–I: Dm7 שמנוגן כ־F6 שואל קול אחד; G7, שמנוגן כ־Dm6, שואל שני קולות מהדימיניש, וכך נוצר G7♭9; ואז C6.' },
        play: [chord([57, 60, 62, 65], 0.7), chord([57, 59, 62, 65], 0.5), chord([56, 59, 62, 65], 0.5), chord([55, 60, 64, 69], 0.9)],
      },
      {
        say: { en: 'The drills grade it voice by voice: the chord must sound, the borrowed note must move by the right step and return, and the held voices must really hold.', he: 'התרגילים בודקים קול אחר קול: האקורד צריך להישמע, הצליל המושאל צריך לזוז בצעד הנכון ולחזור, והקולות המוחזקים צריכים באמת להחזיק.' },
      },
      {
        say: { en: 'In drop 2 and drop 3 the same idea spreads over two hands, or over a string set on the guitar: the dropped voice can borrow too, low in the left hand.', he: 'בדרופ 2 ובדרופ 3 אותו רעיון מתפרס על שתי ידיים, או על קבוצת מיתרים בגיטרה: גם הקול שירד יכול לשאול, נמוך ביד שמאל.' },
      },
      {
        say: { en: 'A common mistake is lifting the whole hand when one finger moves. Practise slowly, rubato first, with the held keys pressed and only the borrowing finger free.', he: 'טעות נפוצה היא להרים את כל היד כשאצבע אחת זזה. מתרגלים לאט, קודם בלי קצב, עם הקלידים המוחזקים לחוצים ורק האצבע השואלת חופשייה.' },
      },
    ],
  },
  {
    id: 'hand-independence',
    area: 'play',
    emoji: 'indep',
    title: { en: 'Hand independence', he: 'עצמאות הידיים' },
    takeaway: { en: 'Each hand keeps its own job: a held note against moving fingers, two voices in one hand, an ostinato under a melody, different rhythms, touch and loudness per hand.', he: 'לכל יד התפקיד שלה: צליל מוחזק מול אצבעות נעות, שני קולות ביד אחת, אוסטינטו מתחת למנגינה, מקצבים שונים, מגע ועוצמה לכל יד.' },
    steps: [
      {
        say: { en: 'Hold one key down while the other fingers keep moving. The held finger stays still and relaxed, and the key stays down.', he: 'מחזיקים קליד אחד לחוץ בזמן שהאצבעות האחרות ממשיכות לנוע. האצבע המוחזקת נשארת שקטה ורפויה, והקליד נשאר למטה.' },
        play: [ev([{ midi: 60, start: 0, duration: 2.3, velocity: 0.5 }, ...[62, 65, 67, 65, 62, 65, 67, 65].map((m, i) => ({ midi: m, start: i * 0.29, duration: 0.27, velocity: 0.6 }))], 2.6)],
        show: { text: { en: 'hold 1, move 2-4-5', he: 'מחזיקים 1, מזיזים 2-4-5' } },
      },
      {
        say: { en: 'Two voices in one hand: the upper voice holds a long note while the lower fingers run underneath it.', he: 'שני קולות ביד אחת: הקול העליון מחזיק צליל ארוך והאצבעות התחתונות רצות מתחתיו.' },
        play: [ev([{ midi: 67, start: 0, duration: 1.2, velocity: 0.6 }, ...[60, 62, 64, 62].map((m, i) => ({ midi: m, start: i * 0.3, duration: 0.28, velocity: 0.45 }))], 1.4)],
      },
      {
        say: { en: 'Then let the hands disagree: the left hand repeats a short figure while the right hand sings a melody on top.', he: 'אחר כך הידיים לא מסכימות: יד שמאל חוזרת על דמות קצרה, ויד ימין שרה מנגינה מעליה.' },
        play: [ev([...[60, 64, 67, 65].map((m, i) => ({ midi: m, start: i * 0.6, duration: 0.58, velocity: 0.62 })), ...[36, 43, 48, 43, 36, 43, 48, 43].map((m, i) => ({ midi: m, start: i * 0.3, duration: 0.28, velocity: 0.4 }))], 2.6)],
        show: { text: { en: 'LH ostinato · RH melody', he: 'אוסטינטו ביד שמאל · מנגינה ביד ימין' } },
      },
      {
        say: { en: 'Different rhythms: three notes in the right hand against two in the left, the beats shared.', he: 'מקצבים שונים: שלושה צלילים ביד ימין מול שניים ביד שמאל, הפעמות משותפות.' },
        play: [ev([...[0, 1, 2, 3, 4, 5].map((i) => ({ midi: [60, 62, 64][i % 3], start: i * 0.25, duration: 0.23, velocity: 0.6 })), ...[0, 1, 2, 3].map((i) => ({ midi: [48, 55][i % 2], start: i * 0.375, duration: 0.35, velocity: 0.5 }))], 1.8)],
        show: { text: { en: '3 against 2', he: '3 נגד 2' } },
      },
      {
        say: { en: 'Touch and loudness per hand: one hand legato and singing, the other short and soft. A MIDI keyboard measures both, and the held notes too.', he: 'מגע ועוצמה לכל יד: יד אחת בלגאטו ושרה, השנייה קצרה ורכה. מקלדת MIDI מודדת את שניהם, וגם את הצלילים המוחזקים.' },
      },
    ],
    more: [
      {
        say: { en: 'These exercises follow the idea of Isidor Philipp’s independence studies: some fingers hold, others move, so each finger learns to work alone. Ours are new patterns in all twelve keys.', he: 'התרגילים האלה הולכים בעקבות הרעיון של תרגילי העצמאות של איזידור פיליפ: חלק מהאצבעות מחזיקות, אחרות נעות, וכך כל אצבע לומדת לעבוד לבד. שלנו הם תבניות חדשות בכל שנים־עשר הסולמות.' },
      },
      {
        say: { en: 'Hold the weak fingers last. Holding a chord with 1, 2 and 3 while 4 and 5 trill is the hardest: keep the trill light and the chord quiet.', he: 'את האצבעות החלשות מחזיקים אחרונות. להחזיק אקורד ב־1, 2 ו־3 בזמן ש־4 ו־5 בטריל זה הכי קשה: הטריל קל והאקורד שקט.' },
        play: [ev([...[60, 62, 64].map((m) => ({ midi: m, start: 0, duration: 1.6, velocity: 0.38 })), ...[65, 67, 65, 67, 65, 67].map((m, i) => ({ midi: m, start: i * 0.25, duration: 0.23, velocity: 0.55 }))], 1.8)],
      },
      {
        say: { en: 'For 3 against 2, count the shared beat aloud and feel the right hand’s middle note fall just before the left hand’s second.', he: 'ל־3 נגד 2, סופרים בקול את הפעמה המשותפת ומרגישים איך הצליל האמצעי של יד ימין נופל רגע לפני השני של יד שמאל.' },
        play: [ev([...[0, 1, 2].map((i) => ({ midi: 64, start: i * 0.4, duration: 0.38, velocity: 0.6 })), ...[0, 1].map((i) => ({ midi: 48, start: i * 0.6, duration: 0.58, velocity: 0.5 }))], 1.4)],
      },
      {
        say: { en: 'A common mistake: the staccato hand drags the legato hand short, or the soft hand gets loud with the other. Practise each hand alone first, then together slowly.', he: 'טעות נפוצה: היד בסטקטו מקצרת גם את היד בלגאטו, או שהיד הרכה מתחזקת יחד עם השנייה. מתרגלים קודם כל יד לבד, ואז יחד, לאט.' },
      },
      {
        say: { en: 'An ostinato frees the mind for the melody only when it runs by itself. Repeat the left-hand figure until you can talk over it, then add the right hand.', he: 'אוסטינטו משחרר את הראש למנגינה רק כשהוא רץ מעצמו. חוזרים על הדמות של יד שמאל עד שאפשר לדבר מעליה, ואז מוסיפים את יד ימין.' },
      },
      {
        say: { en: 'Every new item starts in free time, then quarter notes, then the tempo ladder. Speed comes last; independence comes first.', he: 'כל פריט חדש מתחיל בלי קצב, אחר כך ברבעים, ואז בסולם הטמפו. המהירות באה אחרונה; העצמאות באה ראשונה.' },
      },
    ],
  },
  {
    id: 'scale-harm',
    area: 'play',
    emoji: 'harmlad',
    title: { en: 'Harmonizing a scale', he: 'הרמוניזציה של סולם' },
    takeaway: { en: 'Stack the scale’s own 3rds on every degree: 3rds, triads, then 7th chords, arpeggiated and block, then drop 2 and drop 3 — up and down the scale.', he: 'בונים על כל דרגה את הטרצות של הסולם עצמו: טרצות, משולשים, ואז אקורדי ספטימה, בארפג׳יו ובבלוק, ואז דרופ 2 ודרופ 3 — לאורך הסולם, עולה ויורד.' },
    steps: [
      {
        say: { en: 'Every scale holds its own chords. First play it note by note, up and down two octaves.', he: 'כל סולם מחזיק את האקורדים שלו. קודם מנגנים אותו צליל אחר צליל, עולה ויורד שתי אוקטבות.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60], 0.18)],
      },
      {
        say: { en: 'Take every other note and you get the scale in 3rds: C–E, D–F, E–G. Broken first, then both notes together.', he: 'לוקחים כל צליל שני ומקבלים את הסולם בטרצות: דו–מי, רה–פה, מי–סול. קודם שבורות, אחר כך שני הצלילים יחד.' },
        play: [notes([60, 64, 62, 65, 64, 67], 0.22), chord([60, 64], 0.4), chord([62, 65], 0.4), chord([64, 67], 0.5)],
        show: { text: { en: 'C–E · D–F · E–G', he: 'C–E · D–F · E–G' } },
      },
      {
        say: { en: 'Add one more 3rd for a triad on every degree, and another for a 7th chord. Play them broken, then all at once.', he: 'מוסיפים עוד טרצה למשולש על כל דרגה, ועוד אחת לאקורד ספטימה. מנגנים אותם שבורים, ואז יחד.' },
        play: [notes([60, 64, 67, 71], 0.2), chord([60, 64, 67, 71], 0.6), notes([62, 65, 69, 72], 0.2), chord([62, 65, 69, 72], 0.6)],
        show: { text: { en: 'Cmaj7 · Dm7', he: 'Cmaj7 · Dm7' } },
      },
      {
        say: { en: 'Drop 2: take the second voice from the top down an octave. Drop 3: the third voice. On the piano the left hand takes the dropped note.', he: 'דרופ 2: מורידים את הקול השני מלמעלה אוקטבה. דרופ 3: את הקול השלישי. בפסנתר יד שמאל לוקחת את הצליל שירד.' },
        play: [chord([60, 64, 67, 71], 0.6), chord([55, 60, 64, 71], 0.7), chord([52, 60, 67, 71], 0.7)],
        show: { text: { en: 'close · drop 2 · drop 3', he: 'צמוד · דרופ 2 · דרופ 3' } },
      },
      {
        say: { en: 'On the guitar each drop lives on a string set: drop 2 on four neighbouring strings, drop 3 with a string skipped under the top three.', he: 'בגיטרה כל דרופ גר על קבוצת מיתרים: דרופ 2 על ארבעה מיתרים שכנים, דרופ 3 עם מיתר מדולג מתחת לשלושה העליונים.' },
      },
    ],
    more: [
      {
        say: { en: 'Every mode harmonizes itself. D dorian gives Dm7, Em7, Fmaj7, G7 — the notes of C major from a new home, so the chords move to new degrees.', he: 'כל מודוס מהרמן את עצמו. רה דורי נותן Dm7, ‏Em7, ‏Fmaj7, ‏G7 — הצלילים של דו מז׳ור מבית חדש, ולכן האקורדים עוברים לדרגות חדשות.' },
        play: [chord([62, 65, 69, 72], 0.5), chord([64, 67, 71, 74], 0.5), chord([65, 69, 72, 76], 0.5), chord([67, 71, 74, 77], 0.7)],
      },
      {
        say: { en: 'Harmonic and melodic minor bring their own colours: an augmented triad on the 3rd, a diminished 7th on the 7th, a dominant on the 4th of melodic minor.', he: 'מינור הרמוני ומלודי מביאים צבעים משלהם: משולש מוגדל על הדרגה השלישית, דימיניש על השביעית, דומיננט על הרביעית של המינור המלודי.' },
        play: [chord([63, 67, 71], 0.6), chord([59, 62, 65, 68], 0.6), chord([65, 69, 72, 75], 0.7)],
      },
      {
        say: { en: 'Barry Harris’s diminished scales alternate a chord and the diminished, so their 7th chords are moving inversions: C6, B°7, C6 over E, and so on up the scale.', he: 'סולמות הדימיניש של בארי האריס מחליפים בין אקורד לדימיניש, ולכן אקורדי הספטימה שלהם הם היפוכים נעים: C6, ‏B°7, ‏C6 מעל מי, וכך הלאה לאורך הסולם.' },
      },
      {
        say: { en: 'Keep the top note as the melody. In block chords and drops the scale is on top, and the voices under it follow by step — that is why it sounds smooth.', he: 'שומרים על הצליל העליון כמנגינה. באקורדי בלוק ובדרופים הסולם למעלה, והקולות מתחתיו הולכים אחריו בצעדים — לכן זה נשמע חלק.' },
      },
      {
        say: { en: 'On the piano, add the left-hand root under the block chords: the right hand keeps the voicing, the left hand names the chord.', he: 'בפסנתר מוסיפים יסוד ביד שמאל מתחת לאקורדי הבלוק: יד ימין שומרת על הקול, יד שמאל קובעת את האקורד.' },
      },
      {
        say: { en: 'A common mistake is rushing to the drops. If a triad on one degree hesitates, the drop on that degree will too: climb the ladder step by step, in every key.', he: 'טעות נפוצה היא למהר לדרופים. אם משולש על דרגה אחת מהסס, גם הדרופ על אותה דרגה יהסס: מטפסים בסולם צעד אחר צעד, בכל הסולמות.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'tech:k-indep-1': 'hand-independence',
  'tech:k-sharm-1': 'scale-harm',
  'tech:g-harm-1': 'scale-harm',
  'tech:harris-26': 'bh-four-dim',
  'tech:k-sharm-19': 'bh-borrow',
  'tech:g-harm-10': 'bh-borrow',
  'topic:bh-borrow': 'bh-borrow',
  // The eight expressions (important minor, tritone's minor, the brothers) and the true sixth on the fifth are taught in
  // bh-six-over (mini/jazz.ts); Harris's moves in bh-convert; contrary motion with the scale of chords (bh-block).
  'tech:k-sharm-36': 'bh-six-over',
  'tech:k-sharm-37': 'bh-convert',
  'topic:bh-moves': 'bh-convert',
  'topic:bh-tesseract': 'bh-convert',
  'tech:k-sharm-33': 'bh-block',
  'topic:bh-sixfive': 'bh-six-over',
  'tech:k-sharm-26': 'bh-six-over',
  'tech:g-harris-11': 'bh-six-over',
};

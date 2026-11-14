// Quick lessons for the first steps of each instrument course (AUDIT-CONTENT-THEORY §ז.2): sitting at the piano and
// finger numbers, the thumb passing under; tuning, holding and the first chord on the guitar, strumming in quarters;
// holding the sticks, the rebound and counting "1 e & a", the basic rock beat; standing, semi-occluded singing and
// matching a note. Each opens the first measured level it prepares (units "tech:<level id>" / "vocal:<level>").
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.6, arpeggio?: boolean): Stimulus => ({ kind: 'chord', midis, duration, ...(arpeggio ? { arpeggio } : {}) });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });

/** C position: C D E F G under fingers 1–5 of the right hand. */
const FIVE = [60, 62, 64, 65, 67];
/** E minor and G major, open strings ringing (sounding pitches). */
const EM = [40, 47, 52, 55, 59, 64];
const G = [43, 47, 50, 55, 59, 67];
/** A chord strummed on given beats (down strokes: low to high, a few ms apart). */
function strum(ch: number[], bpm: number, beats: number[], len: number): Stimulus {
  const b = 60 / bpm;
  return ev(beats.flatMap((t) => ch.map((m, i) => ({ midi: m, start: t * b + i * 0.012, duration: b * 0.9, velocity: 0.6 }))), len * b + 0.3);
}
type Drum = 'kick' | 'snare' | 'hat';
const KIT: Record<Drum, number> = { kick: 36, snare: 38, hat: 42 };
/** Kit hits [beat, drum, velocity] at `bpm`. */
function kit(bpm: number, beats: number, hits: [number, Drum, number?][]): Stimulus {
  const b = 60 / bpm;
  return ev(hits.map(([t, d, v]) => ({ midi: KIT[d], start: t * b, duration: 0.08, velocity: v ?? (d === 'hat' ? 0.45 : 0.8), perc: d })), beats * b + 0.4);
}
const every = (from: number, to: number, step: number, d: Drum, v?: number): [number, Drum, number?][] => Array.from({ length: Math.round((to - from) / step) }, (_, i) => [from + i * step, d, v]);
/** The basic rock beat: hi-hat 8ths, kick on 1 and 3, snare on 2 and 4. */
const rockBar = (b0: number): [number, Drum, number?][] => [...every(b0, b0 + 4, 0.5, 'hat'), [b0, 'kick'], [b0 + 2, 'kick'], [b0 + 1, 'snare'], [b0 + 3, 'snare']];
/** A sung note sliding onto the target from `from` semitones away, with the target held as a drone underneath. */
function slideOnto(target: number, from: number): Stimulus {
  const steps = 12;
  const slide: NoteEvent[] = Array.from({ length: steps }, (_, i) => ({ midi: target + from * (1 - i / (steps - 1)), start: 0.6 + i * 0.09, duration: 0.11, velocity: 0.5 }));
  return ev([{ midi: target - 12, start: 0, duration: 3.4, velocity: 0.35 }, ...slide, { midi: target, start: 0.6 + steps * 0.09, duration: 1.4, velocity: 0.5 }], 3.6);
}

export const LESSONS: MiniLesson[] = [
  {
    id: 'first-piano',
    area: 'play',
    emoji: '',
    title: { en: 'Sitting at the piano', he: 'יושבים ליד הפסנתר' },
    takeaway: { en: 'Sit tall with the elbows level with the keys, number the fingers 1 (thumb) to 5, and rest them on C D E F G: the C position.', he: 'יושבים זקוף, המרפקים בגובה הקלידים, מספרים את האצבעות מ־1 (אגודל) עד 5, ומניחים אותן על דו רה מי פה סול: עמדת דו.' },
    steps: [
      { say: { en: 'Hi {name}! Sit on the front half of the bench, feet flat, shoulders loose. Your elbows sit a little above the keys, and the bench far enough back that your arms can move.', he: 'היי {name}! יושבים על החצי הקדמי של הכיסא, כפות הרגליים על הרצפה, הכתפיים רפויות. המרפקים קצת מעל הקלידים, והכיסא רחוק מספיק כדי שהידיים יזוזו בחופשיות.' }, show: { text: { en: 'tall · loose · elbows level', he: 'זקוף · רפוי · מרפקים בגובה' } } },
      { say: { en: 'Curve the fingers as if you held a small ball. Play on the fingertips, the thumb on its side.', he: 'מעגלים את האצבעות כאילו מחזיקים כדור קטן. מנגנים על קצות האצבעות, והאגודל על הצד שלו.' }, play: [notes([60, 64, 67], 0.6)] },
      { say: { en: 'Fingers have numbers: the thumb is 1, the little finger is 5 — on both hands. Music for beginners prints them over the notes.', he: 'לאצבעות יש מספרים: האגודל הוא 1, הזרת היא 5 — בשתי הידיים. בתווים למתחילים הם כתובים מעל הצלילים.' }, play: [notes(FIVE, 0.45)], show: { notes: FIVE, text: { en: '1 2 3 4 5', he: '1 2 3 4 5' } } },
      { say: { en: 'The C position: right thumb on middle C, one finger per white key up to G. The left hand mirrors it: little finger on the C below, thumb on G.', he: 'עמדת דו: האגודל הימני על הדו האמצעי, אצבע אחת לכל קליד לבן עד סול. יד שמאל במראה: הזרת על הדו שמתחת, האגודל על סול.' }, play: [notes(FIVE, 0.4), rest(0.3), notes([48, 50, 52, 53, 55], 0.4)], show: { notes: [48, 50, 52, 53, 55, 60, 62, 64, 65, 67] } },
      { say: { en: 'Your turn: up and down the five notes, one hand at a time, slow and even with the click. The app listens for the right notes and the timing.', he: 'תורכם: למעלה ולמטה בחמשת הצלילים, יד אחת בכל פעם, לאט ואחיד עם הקליק. האפליקציה מקשיבה לצלילים ולתזמון.' }, play: [notes([...FIVE, 65, 64, 62, 60], 0.5)] },
    ],
    more: [
      { say: { en: 'Height matters more than people think. Too low and the wrists sag; too high and the shoulders lift. Adjust the bench, or sit on a cushion, until the forearm is level with the keys.', he: 'הגובה חשוב יותר ממה שנדמה. נמוך מדי — שורש כף היד שוקע; גבוה מדי — הכתפיים עולות. מכוונים את הכיסא, או מוסיפים כרית, עד שהאמה מקבילה לקלידים.' } },
      { say: { en: 'Weight, not squeezing. Let the arm drop into each key and release it right after. A tight hand sounds hard and tires fast.', he: 'משקל, לא לחיצה. נותנים לזרוע ליפול לתוך כל קליד ומשחררים מיד אחרי. יד מכווצת נשמעת קשה ומתעייפת מהר.' }, play: [notes([60, 62, 64], 0.7)] },
      { say: { en: 'Even means equal: the same loudness and the same space between every note. Listen for the weak fingers, four and five, and give them a little more weight.', he: 'אחיד פירושו שווה: אותה עוצמה ואותו מרווח בין כל הצלילים. הקשיבו לאצבעות החלשות, ארבע וחמש, ותנו להן קצת יותר משקל.' }, play: [notes([64, 65, 67, 65, 64], 0.45)] },
      { say: { en: 'Hands together in the C position move in mirror image: when the right thumb plays, the left little finger plays too. Same note names, different finger numbers.', he: 'ידיים יחד בעמדת דו נעות במראה: כשהאגודל הימני מנגן, הזרת השמאלית מנגנת איתו. אותם שמות צלילים, מספרי אצבעות שונים.' }, play: [chord([48, 60], 0.6), chord([50, 62], 0.6), chord([52, 64], 0.6)] },
      { say: { en: 'A common mistake is a collapsed first joint: the fingertip bends backwards. Keep it firm, like a small arch.', he: 'טעות נפוצה היא מפרק ראשון שקורס: קצה האצבע מתכופף לאחור. שומרים אותו יציב, כמו קשת קטנה.' } },
      { say: { en: 'Recap: tall and loose, curved fingers, numbers 1 to 5, the C position in both hands, and slow even notes with the click before anything fast.', he: 'לסיכום: זקוף ורפוי, אצבעות מעוגלות, מספרים 1 עד 5, עמדת דו בשתי הידיים, וצלילים איטיים ואחידים עם הקליק לפני כל דבר מהיר.' } },
    ],
  },
  {
    id: 'first-thumb',
    area: 'play',
    emoji: '',
    title: { en: 'The thumb passes under', he: 'האגודל עובר מתחת' },
    takeaway: { en: 'A scale has more notes than fingers: after finger 3 the thumb slides under to the next note, and the hand moves on without a bump.', he: 'בסולם יש יותר צלילים מאצבעות: אחרי אצבע 3 האגודל מחליק מתחת לצליל הבא, והיד ממשיכה בלי קפיצה.' },
    steps: [
      { say: { en: 'Five fingers, but a scale has eight notes. The trick is the thumb: it passes under the hand to reach the next note.', he: 'יש חמש אצבעות, אבל בסולם שמונה צלילים. הטריק הוא האגודל: הוא עובר מתחת ליד כדי להגיע לצליל הבא.' }, play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.4)] },
      { say: { en: 'In C, the right hand plays C D E with 1 2 3. Then the thumb slides under to F, and 1 2 3 4 5 finish the octave.', he: 'בדו, יד ימין מנגנת דו רה מי ב־1 2 3. אז האגודל מחליק מתחת לפה, ו־1 2 3 4 5 משלימות את האוקטבה.' }, play: [notes([60, 62, 64], 0.55), notes([65], 0.8)], show: { notes: [60, 62, 64, 65], text: { en: '1 2 3 → 1', he: '1 2 3 ← 1' } } },
      { say: { en: 'Move the thumb early. While finger 3 plays E, the thumb is already travelling under, so F comes on time and as loud as the others.', he: 'מזיזים את האגודל מוקדם. בזמן שאצבע 3 מנגנת מי, האגודל כבר בדרך מתחת, כך שפה מגיע בזמן ובאותה עוצמה.' }, play: [notes([62, 64, 65, 67], 0.5)] },
      { say: { en: 'Coming down, finger 3 crosses over the thumb: F with the thumb, then 3 lands on E.', he: 'בירידה, אצבע 3 עוברת מעל האגודל: פה באגודל, ואז 3 נוחתת על מי.' }, play: [notes([67, 65, 64, 62, 60], 0.5)], show: { notes: [65, 64], text: { en: '1 → 3', he: '1 ← 3' } } },
      { say: { en: 'Your turn: the short pattern up and back, each hand alone, slow with the click. Keep the elbow quiet; only the thumb moves.', he: 'תורכם: התבנית הקצרה למעלה ובחזרה, כל יד לחוד, לאט עם הקליק. המרפק שקט; רק האגודל זז.' }, play: [notes([60, 62, 64, 65, 64, 62, 60], 0.5)] },
    ],
    more: [
      { say: { en: 'Listen for the bump. If the note after the thumb comes late or loud, the thumb moved too late. Practise just the pair E to F, slowly, until it sounds like any other step.', he: 'הקשיבו לקפיצה. אם הצליל שאחרי האגודל מאחר או חזק מדי, האגודל זז מאוחר מדי. מתרגלים רק את הזוג מי־פה, לאט, עד שזה נשמע כמו כל צעד אחר.' }, play: [notes([64, 65, 64, 65], 0.6)] },
      { say: { en: 'The left hand does it the other way round: going up, finger 3 crosses over the thumb; coming down, the thumb passes under.', he: 'ביד שמאל זה הפוך: בעלייה אצבע 3 עוברת מעל האגודל; בירידה האגודל עובר מתחת.' }, play: [notes([48, 50, 52, 53, 55, 57, 59, 60], 0.4)] },
      { say: { en: 'Keep the wrist level and let the hand glide sideways. Twisting the wrist or lifting the elbow makes the crossing jerky.', he: 'שומרים את שורש כף היד ישר ונותנים ליד לגלוש הצידה. סיבוב של שורש היד או הרמת המרפק עושים את המעבר קופצני.' } },
      { say: { en: 'Some scales cross after finger 4 too. In C major the right hand crosses once going up; longer scales repeat the same move every octave.', he: 'בחלק מהסולמות עוברים גם אחרי אצבע 4. בדו מז׳ור יד ימין עוברת פעם אחת בעלייה; סולמות ארוכים יותר חוזרים על אותה תנועה בכל אוקטבה.' }, play: [notes([60, 62, 64, 65, 67, 69, 71, 72, 74, 76], 0.3)] },
      { say: { en: 'Practise it with the eyes away from the hands now and then. The thumb should find F by feel, because later the eyes will be on the music, not on the keys.', he: 'מדי פעם מתרגלים בלי להסתכל על הידיים. האגודל צריך למצוא את פה במגע, כי בהמשך העיניים יהיו על התווים, לא על הקלידים.' }, play: [notes([60, 62, 64, 65, 67], 0.5)] },
      { say: { en: 'This one move is behind every scale and arpeggio you will play. Once it is smooth, the scale levels open on the path.', he: 'התנועה הזו עומדת מאחורי כל סולם וארפג׳יו שתנגנו. כשהיא חלקה, שלבי הסולמות נפתחים בנתיב.' } },
    ],
  },
  {
    id: 'first-guitar',
    area: 'play',
    emoji: '',
    title: { en: 'Tune, hold, first chord', he: 'כיוון, אחיזה, אקורד ראשון' },
    takeaway: { en: 'Tune with the tuner, hold the guitar close with the neck slightly up, press just behind the fret, and let every string of E minor ring.', he: 'מכוונים עם הטיונר, מחזיקים את הגיטרה צמוד עם הצוואר קצת למעלה, לוחצים ממש מאחורי הסריג, ונותנים לכל מיתר של מי מינור לצלצל.' },
    steps: [
      { say: { en: 'Hi {name}! First, tune. The strings from thick to thin are E A D G B E. Open the tuner in Tools and turn each peg until the needle sits in the middle.', he: 'היי {name}! קודם מכוונים. המיתרים מהעבה לדק: מי לה רה סול סי מי. פותחים את הטיונר בכלים ומסובבים כל מפתח עד שהמחוג באמצע.' }, play: [notes([40, 45, 50, 55, 59, 64], 0.6)], show: { text: { en: 'E A D G B E', he: 'מי לה רה סול סי מי' } } },
      { say: { en: 'Hold it close: the body against you, the neck pointing a little up. The fretting thumb rests behind the neck, not wrapped over it.', he: 'מחזיקים צמוד: גוף הגיטרה אליכם, הצוואר מופנה קצת למעלה. האגודל של היד הלוחצת נח מאחורי הצוואר, לא עוטף אותו.' } },
      { say: { en: 'Press with the fingertip just behind the fret wire, not on top of it. Close to the fret means a clean note with less force.', he: 'לוחצים בקצה האצבע ממש מאחורי הסריג, לא עליו. קרוב לסריג פירושו צליל נקי בפחות כוח.' }, play: [notes([42, 43], 0.8)] },
      { say: { en: 'Your first chord is E minor: two fingers on the second fret of the A and D strings, and all six strings ring.', he: 'האקורד הראשון הוא מי מינור: שתי אצבעות על הסריג השני של מיתרי לה ורה, וכל שישת המיתרים מצלצלים.' }, play: [chord(EM, 1.8, true), rest(0.2), chord(EM, 1.6)], show: { text: { en: 'Em: 0 2 2 0 0 0', he: 'Em: 0 2 2 0 0 0' } } },
      { say: { en: 'Your turn: play the chord one string at a time. Every string should sound; the app hears which ones are muted or buzzing.', he: 'תורכם: מנגנים את האקורד מיתר אחרי מיתר. כל מיתר צריך להישמע; האפליקציה שומעת אילו מושתקים או מזמזמים.' }, play: [notes(EM, 0.5)] },
    ],
    more: [
      { say: { en: 'Tune up to the note. If a string is sharp, go below it first and come back up: the string holds its pitch better that way.', he: 'מכוונים כלפי מעלה אל הצליל. אם מיתר גבוה מדי, יורדים קודם מתחתיו וחוזרים למעלה: כך הוא מחזיק את הכיוון טוב יותר.' }, play: [ev([{ midi: 44.6, start: 0, duration: 0.9, velocity: 0.6 }, { midi: 45, start: 1, duration: 1, velocity: 0.6 }], 2.2)] },
      { say: { en: 'A muted string usually means a finger is lying on it. Arch the fingers so only the tips touch, and check each string again.', he: 'מיתר מושתק בדרך כלל אומר שאצבע נוגעת בו. מקמרים את האצבעות כך שרק הקצוות נוגעים, ובודקים שוב כל מיתר.' }, play: [notes([40, 47, 52, 55, 64], 0.5)] },
      { say: { en: 'A buzz means too far from the fret or too little pressure. Move closer to the fret before you press harder.', he: 'זמזום אומר רחוק מדי מהסריג או לחץ חלש מדי. מתקרבים לסריג לפני שלוחצים חזק יותר.' } },
      { say: { en: 'Next comes G major: three fingers, and again all six strings. Changing between E minor and G is the first real change you will practise.', he: 'אחר כך סול מז׳ור: שלוש אצבעות, ושוב כל שישת המיתרים. המעבר בין מי מינור לסול הוא ההחלפה האמיתית הראשונה שתתרגלו.' }, play: [chord(EM, 1.4), rest(0.2), chord(G, 1.4)] },
      { say: { en: 'Before every session, check the tuning again. New strings stretch and slip for the first days, and a guitar that is slightly out makes even a clean chord sound wrong.', he: 'לפני כל תרגול בודקים שוב את הכיוון. מיתרים חדשים נמתחים ומשתחררים בימים הראשונים, וגיטרה שקצת לא מכוונת גורמת גם לאקורד נקי להישמע לא נכון.' }, play: [chord([40, 47, 52, 55.4, 59, 64], 1.6)] },
      { say: { en: 'Short, frequent practice builds calluses without pain. Ten minutes a day is better than an hour once a week, and a sore fingertip is a sign to stop for today.', he: 'תרגול קצר ותכוף בונה יבלות בלי כאב. עשר דקות ביום עדיפות על שעה פעם בשבוע, וקצה אצבע כואב הוא סימן לעצור להיום.' } },
    ],
  },
  {
    id: 'first-strum',
    area: 'play',
    emoji: '',
    title: { en: 'Strumming in quarters', he: 'פריטה ברבעים' },
    takeaway: { en: 'One down-strum on every beat, the hand moving from the wrist, steady with the click — then down-up eighths.', he: 'פריטה אחת למטה על כל פעמה, היד זזה משורש כף היד, יציב עם הקליק — ואז שמיניות למטה־למעלה.' },
    steps: [
      { say: { en: 'Strumming is time first. Count one, two, three, four, and strum down on every number.', he: 'פריטה היא קודם כול זמן. סופרים אחת, שתיים, שלוש, ארבע, ופורטים למטה על כל מספר.' }, play: [strum(EM, 80, [0, 1, 2, 3], 4)], show: { text: { en: '1 2 3 4', he: '1 2 3 4' } } },
      { say: { en: 'Move from the wrist, like shaking water off the hand. The arm stays relaxed; the pick or fingers brush across the strings.', he: 'מזיזים משורש כף היד, כמו לנער מים מהיד. הזרוע נשארת רפויה; המפרט או האצבעות מברישים את המיתרים.' } },
      { say: { en: 'Keep the hand moving even when it does not strike: down on the beat, up in the air between beats. That motion is your clock.', he: 'היד ממשיכה לזוז גם כשהיא לא פורטת: למטה על הפעמה, למעלה באוויר בין הפעמות. התנועה הזו היא השעון שלכם.' }, play: [strum(EM, 80, [0, 1, 2, 3, 4, 5, 6, 7], 8)] },
      { say: { en: 'Then add the upstroke between the beats: down, up, down, up. Eighth notes, the same hand motion, now touching the strings both ways.', he: 'אחר כך מוסיפים את הפריטה למעלה בין הפעמות: למטה, למעלה, למטה, למעלה. שמיניות, אותה תנועה, עכשיו נוגעת במיתרים בשני הכיוונים.' }, play: [strum(EM, 80, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 4)], show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 וְ 2 וְ 3 וְ 4 וְ' } } },
      { say: { en: 'Your turn: quarters on E minor with the click, slowly. The app checks that each strum lands on the beat.', he: 'תורכם: רבעים על מי מינור עם הקליק, לאט. האפליקציה בודקת שכל פריטה נוחתת על הפעמה.' }, play: [strum(EM, 72, [0, 1, 2, 3], 4)] },
    ],
    more: [
      { say: { en: 'Slow is harder than fast for keeping time. Start at a tempo where every strum feels easy, and speed up only when four bars in a row are on the click.', he: 'לאט קשה יותר ממהר כשצריך לשמור על זמן. מתחילים בטמפו שבו כל פריטה קלה, ומאיצים רק כשארבע תיבות ברצף על הקליק.' } },
      { say: { en: 'Down-strokes on the beat are a little louder; up-strokes catch only the higher strings. That small difference gives the groove its shape.', he: 'פריטות למטה על הפעמה קצת חזקות יותר; פריטות למעלה תופסות רק את המיתרים הגבוהים. ההבדל הקטן הזה נותן לגרוב את הצורה שלו.' }, play: [strum(EM, 80, [0, 1, 2, 3], 4)] },
      { say: { en: 'The waltz is three beats a bar: a stronger first beat, then two lighter ones. One, two, three.', he: 'ואלס הוא שלוש פעמות בתיבה: פעמה ראשונה חזקה יותר, ואז שתיים קלות. אחת, שתיים, שלוש.' }, play: [strum(G, 96, [0, 1, 2, 3, 4, 5], 6)] },
      { say: { en: 'Changing chords comes from the same clock: keep strumming on the beat, and let the left hand arrive in time, even if the first strum of the new chord is not perfect.', he: 'החלפת אקורדים באה מאותו שעון: ממשיכים לפרוט על הפעמה, ונותנים ליד השמאלית להגיע בזמן, גם אם הפריטה הראשונה באקורד החדש לא מושלמת.' }, play: [strum(EM, 80, [0, 1], 2), strum(G, 80, [0, 1], 2)] },
      { say: { en: 'With a pick, hold it between the thumb and the side of the first finger, only the tip showing. Without one, brush down with the nails and up with the thumb.', he: 'עם מפרט, אוחזים אותו בין האגודל לצד של האצבע המורה, רק הקצה בחוץ. בלי מפרט, מברישים למטה עם הציפורניים ולמעלה עם האגודל.' }, play: [strum(G, 80, [0, 0.5, 1, 1.5], 2)] },
      { say: { en: 'Recap: count, strum on the numbers, keep the hand moving between them, then add the ups. Time first, speed later.', he: 'לסיכום: סופרים, פורטים על המספרים, היד ממשיכה לזוז ביניהם, ואז מוסיפים את הפריטות למעלה. קודם זמן, אחר כך מהירות.' } },
    ],
  },
  {
    id: 'first-sticks',
    area: 'rhythm',
    emoji: '',
    title: { en: 'Holding the sticks, counting 1 e & a', he: 'אחיזת המקלות, ספירת 1 e & a' },
    takeaway: { en: 'Hold the stick a third of the way up between thumb and first finger, let it bounce back from the head, and count every beat as 1 e & a.', he: 'אוחזים את המקל בשליש התחתון בין האגודל לאצבע המורה, נותנים לו לקפוץ חזרה מהעור, וסופרים כל פעמה כ־1 e & a.' },
    steps: [
      { say: { en: 'Hi {name}! Find the balance point, about a third of the way up the stick. Pinch it there between the thumb and the first finger; the other fingers wrap loosely.', he: 'היי {name}! מוצאים את נקודת האיזון, בערך בשליש התחתון של המקל. צובטים שם בין האגודל לאצבע המורה; שאר האצבעות עוטפות ברפיון.' }, show: { text: { en: 'thumb + first finger', he: 'אגודל + מורה' } } },
      { say: { en: 'Let the stick bounce. Throw it at the head and let it come back up by itself — you guide it, you do not push it into the drum.', he: 'נותנים למקל לקפוץ. זורקים אותו אל העור ונותנים לו לחזור למעלה לבד — אתם מכוונים אותו, לא דוחפים אותו לתוך התוף.' }, play: [kit(80, 4, [[0, 'snare'], [1, 'snare'], [2, 'snare'], [3, 'snare']])] },
      { say: { en: 'Count out loud. Quarters are one, two, three, four. Eighths add "and" between them: one and two and.', he: 'סופרים בקול. רבעים הם אחת, שתיים, שלוש, ארבע. שמיניות מוסיפות "וְ" ביניהם: אחת וְ שתיים וְ.' }, play: [kit(80, 4, every(0, 4, 0.5, 'snare'))], show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 וְ 2 וְ 3 וְ 4 וְ' } } },
      { say: { en: 'Sixteenths split each beat in four: one e and a, two e and a. Four even strokes for every click.', he: 'שש־עשריות מחלקות כל פעמה לארבע: 1 e & a, 2 e & a. ארבע מכות שוות לכל קליק.' }, play: [kit(70, 2, every(0, 2, 0.25, 'snare'))], show: { text: { en: '1 e & a 2 e & a', he: '1 e & a 2 e & a' } } },
      { say: { en: 'Your turn: quarters with the click, one hand, then the other. The app measures how close every stroke lands to the beat.', he: 'תורכם: רבעים עם הקליק, יד אחת ואז השנייה. האפליקציה מודדת כמה קרוב כל מכה נוחתת לפעמה.' }, play: [kit(72, 4, [[0, 'snare'], [1, 'snare'], [2, 'snare'], [3, 'snare']])] },
    ],
    more: [
      { say: { en: 'Matched grip means both hands hold the sticks the same way, palms facing down. It is how almost every rock, pop and jazz drummer starts.', he: 'אחיזה תואמת פירושה ששתי הידיים אוחזות את המקלות באותו אופן, כפות הידיים כלפי מטה. כך מתחילים כמעט כל מתופפי הרוק, הפופ והג׳אז.' } },
      { say: { en: 'A tight grip kills the bounce and the sound. If your hand tires after a minute, loosen the back fingers and let the rebound do the work.', he: 'אחיזה הדוקה הורגת את הקפיצה ואת הצליל. אם היד מתעייפת אחרי דקה, משחררים את האצבעות האחוריות ונותנים לקפיצה לעשות את העבודה.' }, play: [kit(90, 4, every(0, 4, 0.5, 'snare', 0.6))] },
      { say: { en: 'Height sets loudness. Strokes from the same height sound the same; that is the first step to even time.', he: 'הגובה קובע את העוצמה. מכות מאותו גובה נשמעות אותו דבר; זה הצעד הראשון לזמן אחיד.' }, play: [kit(80, 4, [[0, 'snare', 0.4], [1, 'snare', 0.4], [2, 'snare', 0.9], [3, 'snare', 0.9]])] },
      { say: { en: 'Counting is not optional. Saying one e and a out loud keeps your place when the rhythms get busy, and every drum part is written in these counts.', he: 'ספירה היא לא רשות. לומר 1 e & a בקול שומר על המקום שלכם כשהמקצבים נעשים צפופים, וכל תפקיד תופים כתוב בספירות האלה.' }, play: [kit(70, 2, [[0, 'snare'], [0.5, 'snare'], [0.75, 'snare'], [1, 'snare'], [1.25, 'snare'], [1.5, 'snare']])] },
      { say: { en: 'Alternate the hands from the start: right, left, right, left. Even strokes from both hands are the base of every roll and fill that comes later on the path.', he: 'מחליפים ידיים מההתחלה: ימין, שמאל, ימין, שמאל. מכות שוות משתי הידיים הן הבסיס לכל גלגול ומעבר שיבואו בהמשך הנתיב.' }, play: [kit(80, 4, every(0, 4, 0.5, 'snare', 0.6))] },
      { say: { en: 'Recap: balance point, loose fingers, let it bounce, same height for the same sound, and count out loud, from quarters to sixteenths.', he: 'לסיכום: נקודת איזון, אצבעות רפויות, לתת לקפוץ, אותו גובה לאותו צליל, וספירה בקול, מרבעים עד שש־עשריות.' } },
    ],
  },
  {
    id: 'first-rock',
    area: 'rhythm',
    emoji: '',
    title: { en: 'The basic rock beat', he: 'קצב הרוק הבסיסי' },
    takeaway: { en: 'Hi-hat on every eighth, kick on 1 and 3, snare on 2 and 4 — first the hands alone, then the kick joins.', he: 'היי־האט על כל שמינית, קיק על 1 ו־3, סנר על 2 ו־4 — קודם הידיים לבד, ואז הקיק מצטרף.' },
    steps: [
      { say: { en: 'This is the beat under a huge share of the songs you know. Three parts, one bar, played again and again with the band.', he: 'זה הקצב שמתחת לחלק עצום מהשירים שאתם מכירים. שלושה חלקים, תיבה אחת, שוב ושוב עם הלהקה.' }, play: [kit(96, 8, [...rockBar(0), ...rockBar(4)])] },
      { say: { en: 'The right hand plays the hi-hat on every eighth: one and two and three and four and.', he: 'יד ימין מנגנת היי־האט על כל שמינית: אחת וְ שתיים וְ שלוש וְ ארבע וְ.' }, play: [kit(96, 4, every(0, 4, 0.5, 'hat'))], show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 וְ 2 וְ 3 וְ 4 וְ' } } },
      { say: { en: 'The left hand adds the snare on two and four — the backbeat. Hat and snare hit together on those beats.', he: 'יד שמאל מוסיפה סנר על שתיים וארבע — הבקביט. ההיי־האט והסנר מכים יחד בפעמות האלה.' }, play: [kit(96, 4, [...every(0, 4, 0.5, 'hat'), [1, 'snare'], [3, 'snare']])] },
      { say: { en: 'The right foot plays the kick on one and three. Now all three: hat, kick, snare.', he: 'הרגל הימנית מנגנת קיק על אחת ושלוש. עכשיו שלושתם: היי־האט, קיק, סנר.' }, play: [kit(96, 4, rockBar(0))], show: { text: { en: 'K · S · K · S', he: 'קיק · סנר · קיק · סנר' } } },
      { say: { en: 'Your turn: start slowly with the click. The app checks each limb on its beat and that the bar repeats without drifting.', he: 'תורכם: מתחילים לאט עם הקליק. האפליקציה בודקת כל גף על הפעמה שלו ושהתיבה חוזרת בלי לזחול.' }, play: [kit(80, 4, rockBar(0))] },
    ],
    more: [
      { say: { en: 'Build it in layers. Hat alone until it is even, then hat and snare, then add the kick. Each layer at the same slow tempo.', he: 'בונים בשכבות. היי־האט לבד עד שהוא אחיד, אחר כך היי־האט וסנר, ואז מוסיפים את הקיק. כל שכבה באותו טמפו איטי.' }, play: [kit(80, 4, every(0, 4, 0.5, 'hat'))] },
      { say: { en: 'The usual slip: the right hand stops when the foot plays. Keep the hat going like a clock, whatever the other limbs do.', he: 'הטעות הרגילה: יד ימין נעצרת כשהרגל מנגנת. ההיי־האט ממשיך כמו שעון, מה שלא יעשו שאר הגפיים.' } },
      { say: { en: 'The backbeat is the loudest part. A strong snare on two and four over a lighter hat is what makes the beat feel good.', he: 'הבקביט הוא החלק החזק ביותר. סנר חזק על שתיים וארבע מעל היי־האט קל יותר הוא מה שגורם לקצב להרגיש טוב.' }, play: [kit(96, 4, [...every(0, 4, 0.5, 'hat', 0.3), [0, 'kick'], [2, 'kick'], [1, 'snare', 1], [3, 'snare', 1]])] },
      { say: { en: 'Once it is steady, move the kick: add one on the "and" of three. Small kick changes are the first variations the path asks for.', he: 'כשהקצב יציב, מזיזים את הקיק: מוסיפים אחד על ה"וְ" של שלוש. שינויים קטנים בקיק הם הווריאציות הראשונות שהנתיב מבקש.' }, play: [kit(96, 4, [...rockBar(0), [2.5, 'kick']])] },
      { say: { en: 'Sit at a height where the thighs slope slightly down, the hi-hat and snare close to you, and the kick pedal under the right foot without stretching. A comfortable setup makes steady time much easier.', he: 'יושבים בגובה שבו הירכיים נוטות קצת כלפי מטה, ההיי־האט והסנר קרובים, ודוושת הקיק מתחת לרגל ימין בלי להימתח. מערכת נוחה מקלה מאוד על זמן יציב.' } },
      { say: { en: 'Recap: hat on the eighths, kick on one and three, snare on two and four, built in layers, slow and steady before fast.', he: 'לסיכום: היי־האט על השמיניות, קיק על אחת ושלוש, סנר על שתיים וארבע, בונים בשכבות, לאט ויציב לפני מהר.' } },
    ],
  },
  {
    id: 'first-voice',
    area: 'voice',
    emoji: '',
    title: { en: 'Standing, breathing, finding the note', he: 'עמידה, נשימה, מציאת הצליל' },
    takeaway: { en: 'Stand tall and loose, warm up on a lip trill or through a straw, and slide onto the note until it blends with the drone.', he: 'עומדים זקוף ורפוי, מתחממים ברטט שפתיים או דרך קשית, ומחליקים אל הצליל עד שהוא מתמזג עם הצליל המתמשך.' },
    steps: [
      { say: { en: 'Hi {name}! Stand with your feet under your shoulders, knees soft, head level. Breathe low, into the belly and the sides, without lifting the shoulders.', he: 'היי {name}! עומדים עם הרגליים מתחת לכתפיים, הברכיים רכות, הראש ישר. נושמים נמוך, לבטן ולצדדים, בלי להרים את הכתפיים.' }, show: { text: { en: 'tall · loose · breathe low', he: 'זקוף · רפוי · נשימה נמוכה' } } },
      { say: { en: 'Hold one comfortable note while the drone plays with you. Listen for the moment the two sounds become one.', he: 'מחזיקים צליל נוח אחד בזמן שהצליל המתמשך מתנגן איתכם. מקשיבים לרגע שבו שני הצלילים הופכים לאחד.' }, play: [chord([48, 60], 2.5)] },
      { say: { en: 'A lip trill or a straw makes singing easier: the air meets a small resistance, the voice balances itself, and the throat stays relaxed.', he: 'רטט שפתיים או קשית מקלים על השירה: האוויר פוגש התנגדות קטנה, הקול מתאזן מעצמו, והגרון נשאר רפוי.' }, play: [notes([60, 62, 64, 62, 60], 0.5)] },
      { say: { en: 'Can’t find the note? Start a little below and slide up slowly, like a siren, until it settles on the drone. The meter shows if you are above or below.', he: 'לא מוצאים את הצליל? מתחילים קצת מתחת ומחליקים לאט למעלה, כמו סירנה, עד שהקול מתיישב על הצליל המתמשך. המד מראה אם אתם מעל או מתחת.' }, play: [slideOnto(60, -3)] },
      { say: { en: 'Your turn: hold the note with the drone, then the same on a lip trill, then slide onto it from above and below. Every take is measured.', he: 'תורכם: מחזיקים את הצליל עם הצליל המתמשך, אחר כך אותו דבר ברטט שפתיים, ואז מחליקים אליו מלמעלה ומלמטה. כל טייק נמדד.' }, play: [slideOnto(62, 3)] },
    ],
    more: [
      { say: { en: 'Posture is not stiffness. Imagine a string lifting the top of your head while the jaw and shoulders hang loose.', he: 'יציבה היא לא נוקשות. דמיינו חוט שמרים את קודקוד הראש בזמן שהלסת והכתפיים תלויות ברפיון.' } },
      { say: { en: 'For a lip trill, lips loose and together, blow until they flutter, and add a gentle hum. If the lips stop, press the cheeks lightly with two fingers.', he: 'לרטט שפתיים: שפתיים רפויות וצמודות, נושפים עד שהן רוטטות, ומוסיפים זמזום עדין. אם השפתיים נעצרות, לוחצים קלות על הלחיים בשתי אצבעות.' }, play: [notes([55, 57, 59, 60, 59, 57, 55], 0.45)] },
      { say: { en: 'With a straw, sing a held note or a slow glide through it. The sound is small but the pitch is clear, so the app measures it like any other note.', he: 'עם קשית, שרים דרכה צליל מוחזק או גלישה איטית. הצליל קטן אבל הגובה ברור, אז האפליקציה מודדת אותו כמו כל צליל אחר.' }, play: [slideOnto(57, -2)] },
      { say: { en: 'Matching pitch is a skill, not a gift. Most people who think they are "tone deaf" simply have not yet linked what they hear to what the voice does. Sliding builds that link.', he: 'התאמת גובה היא מיומנות, לא כישרון. רוב מי שחושבים שאין להם שמיעה פשוט עוד לא חיברו בין מה שהם שומעים למה שהקול עושה. ההחלקה בונה את החיבור.' }, play: [slideOnto(60, 4)] },
      { say: { en: 'Men and women often sing the same tune an octave apart: the same note names, a different height. Pick the octave that sits comfortably, low in your range, and match the drone there.', he: 'גברים ונשים שרים הרבה פעמים את אותה מנגינה בהפרש של אוקטבה: אותם שמות צלילים, גובה אחר. בוחרים את האוקטבה שנוחה לכם, נמוך במנעד, ומתאימים שם לצליל המתמשך.' }, play: [notes([48, 60], 1)] },
      { say: { en: 'Recap: stand tall and loose, breathe low, warm up semi-closed, hold with the drone, and slide until the two sounds become one.', he: 'לסיכום: עומדים זקוף ורפוי, נושמים נמוך, מתחממים בפה חצי סגור, מחזיקים עם הצליל המתמשך, ומחליקים עד ששני הצלילים הופכים לאחד.' } },
    ],
  },
];

/** The first measured level each lesson opens. */
export const UNITS: Record<string, string> = {
  'tech:k-first-1': 'first-piano',
  'tech:k-first-3': 'first-thumb',
  'tech:g-chords-1': 'first-guitar',
  'tech:g-rhythm-1': 'first-strum',
  'tech:d-time-1': 'first-sticks',
  'tech:d-rock-1': 'first-rock',
  'vocal:2101': 'first-voice',
};

// Quick lessons for the 0.38 time topics (spec AE §4.6, §10): the click, gaps, tempo from memory, two hands,
// rhythm slips, the drum kit, quick reaction, singing while tapping. Plain words, sound first.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const clk = (t: number, accent: boolean, v = 1): NoteEvent => ({ midi: 96, start: t, duration: 0.04, velocity: (accent ? 0.5 : 0.3) * v, perc: accent ? 'accent' : 'click' });
const hit = (t: number, v = 0.8): NoteEvent => ({ midi: 38, start: t, duration: 0.05, velocity: v, perc: 'snare' });

/** `beats` beats at `bpm`: clicks where `clickOn(i)` (accent on bar starts), hits at the given beat positions. */
function grid(bpm: number, beats: number, hits: number[], clickOn: (i: number) => boolean = () => true, clickShift = 0): Stimulus {
  const b = 60 / bpm;
  const out: NoteEvent[] = [];
  for (let i = 0; i < beats; i++) if (clickOn(i)) out.push(clk((i + clickShift) * b, i % 4 === 0 && clickShift === 0));
  for (const h of hits) out.push(hit(h * b));
  return ev(out, beats * b + 0.3);
}
const every = (beats: number, step: number) => Array.from({ length: Math.round(beats / step) }, (_, i) => i * step);
/** Two parts: `a` high notes against `b` low notes per beat cycle. */
function poly(a: number, b: number, cycle: number, times: number): Stimulus {
  const out: NoteEvent[] = [];
  for (let r = 0; r < times; r++) {
    for (let i = 0; i < a; i++) out.push({ midi: 84, start: r * cycle + (i * cycle) / a, duration: 0.05, velocity: i ? 0.55 : 0.8, perc: 'snare-soft' });
    for (let i = 0; i < b; i++) out.push({ midi: 45, start: r * cycle + (i * cycle) / b, duration: 0.12, velocity: i ? 0.7 : 0.9, perc: 'kick' });
  }
  return ev(out, cycle * times + 0.2);
}
/** Drum kit bars from onset lists (in beats) per voice. */
function kit(bpm: number, beats: number, kick: number[], snare: number[], hat: number[]): Stimulus {
  const b = 60 / bpm;
  const out: NoteEvent[] = [];
  for (const k of kick) out.push({ midi: 36, start: k * b, duration: 0.12, velocity: 0.9, perc: 'kick' });
  for (const s of snare) out.push({ midi: 38, start: s * b, duration: 0.08, velocity: 0.75, perc: 'snare' });
  for (const h of hat) out.push({ midi: 42, start: h * b, duration: 0.04, velocity: 0.45, perc: 'hat' });
  return ev(out, beats * b + 0.3);
}
/** Kick on every bar's beat 1, hat on every beat; bars with their own tempo and length. */
function groove(bars: { bpm: number; beats: number }[]): Stimulus {
  const out: NoteEvent[] = [];
  let t = 0;
  for (const bar of bars)
    for (let i = 0; i < bar.beats; i++) {
      out.push({ midi: 42, start: t, duration: 0.04, velocity: i === 0 ? 0.6 : 0.4, perc: 'hat' });
      if (i === 0) out.push({ midi: 36, start: t, duration: 0.12, velocity: 0.9, perc: 'kick' });
      t += 60 / bar.bpm;
    }
  return ev(out, t + 0.3);
}
/** A sung line (piano) with its rhythm over clicks. */
function line(bpm: number, midis: number[], durs: number[]): Stimulus {
  const b = 60 / bpm;
  const out: NoteEvent[] = [];
  const total = durs.reduce((a, d) => a + d, 0);
  for (let i = 0; i < total; i++) out.push(clk(i * b, i % 4 === 0, 0.7));
  let t = 0;
  midis.forEach((m, i) => {
    out.push({ midi: m, start: t * b, duration: durs[i] * b * 0.9, velocity: 0.6 });
    t += durs[i];
  });
  return ev(out, total * b + 0.3);
}
const fours = (n: number) => Array.from({ length: n }, (_, i) => i);

export const LESSONS: MiniLesson[] = [
  {
    id: 'click-subdivide',
    area: 'rhythm',
    emoji: '✂️',
    title: { en: 'Subdivide the click', he: 'לחלק את הקליק' },
    takeaway: { en: 'Inside every click live smaller, even pieces: two (eighths), three (triplets), four (sixteenths). Feel them and your taps stay steady.', he: 'בתוך כל קליק חיים חלקים קטנים ושווים: שניים (שמיניות), שלושה (טריולות), ארבעה (שש־עשריות). מרגישים אותם — וההקשות נשארות יציבות.' },
    steps: [
      { say: { en: 'Hi {name}! A click marks the beat, but inside each beat you can feel smaller, even pieces. Listen: the click, and two notes per click. Those are eighths.', he: 'היי {name}! הקליק מסמן את הפעמה, אבל בתוך כל פעמה אפשר להרגיש חלקים קטנים ושווים. הקשיבו: הקליק, ושני צלילים לכל קליק. אלה שמיניות.' }, play: [grid(80, 8, every(8, 0.5))] },
      { say: { en: 'Three even notes per click are triplets. Say trip-o-let, trip-o-let, with every syllable the same length.', he: 'שלושה צלילים שווים לכל קליק הם טריולה. אמרו טְרִי־אוֹ־לָה, טְרִי־אוֹ־לָה, וכל הברה באותו אורך.' }, play: [grid(72, 8, every(8, 1 / 3))] },
      { say: { en: 'Four per click are sixteenths: one-e-and-a. The click always lands on the first of the four.', he: 'ארבעה לכל קליק הם שש־עשריות: אחת־אֶה־וְ־אָה. הקליק תמיד נוחת על הראשון מהארבעה.' }, play: [grid(66, 8, every(8, 0.25))] },
      { say: { en: 'Swing turns each pair into long-short. It is the triplet with the middle note left out.', he: 'סווינג הופך כל זוג לארוך־קצר. זו הטריולה בלי הצליל האמצעי.' }, play: [grid(110, 8, every(8, 1).flatMap((x) => [x, x + 2 / 3]))] },
      { say: { en: 'In the exercise the click plays only the beats, and you tap the pieces. Feel the beat in your body and let your taps fall evenly between the clicks.', he: 'בתרגיל הקליק מנגן רק את הפעמות, ואתם מקישים את החלקים. הרגישו את הפעמה בגוף, ותנו להקשות ליפול באופן שווה בין הקליקים.' }, show: { text: { en: '♩ = ♫ = ³♫ = ♬♬', he: '♩ = ♫ = ³♫ = ♬♬' } } },
    ],
    more: [
      { say: { en: 'Subdivision means splitting each beat into equal parts. With a quarter-note beat, two parts are eighths, counted "1 and"; three are eighth-note triplets, "1 trip-let"; four are sixteenths, "1 e and a". Eighths, then sixteenths.', he: 'חלוקה פירושה לפצל כל פעמה לחלקים שווים. כשהפעמה היא רבע, שני חלקים הם שמיניות, סופרים ״אחת וְ״; שלושה הם טריולות של שמיניות, ״אחת טְרִי־אוֹ־לָה״; ארבעה הם שש־עשריות, ״אחת אֶה וְ אָה״. שמיניות, ואז שש־עשריות.' }, play: [grid(80, 4, every(4, 0.5)), grid(80, 4, every(4, 0.25))], show: { text: { en: '1 & · 1 trip-let · 1 e & a', he: '1 & · 1 טרי־או־לה · 1 e & a' } } },
      { say: { en: 'Why it helps: the longer the gap between clicks, the more room you have to drift. Subdividing gives your body checkpoints inside the gap, which is why slow tempos need it most. This is 50 beats per minute, felt in eighths.', he: 'למה זה עוזר: ככל שהרווח בין הקליקים ארוך יותר, יש יותר מקום לסטות. החלוקה נותנת לגוף נקודות ביקורת בתוך הרווח, ולכן טמפים איטיים צריכים אותה הכי הרבה. זה 50 פעמות לדקה, מורגש בשמיניות.' }, play: [grid(50, 4, every(4, 0.5))] },
      { say: { en: 'Twos and threes feel different. Twos are square, like a march. Threes roll and lilt, like a 6/8 ballad. Listen to the same click with two, then three, notes per beat.', he: 'שתיים ושלוש מרגישים שונה. שתיים מרובעות, כמו מארש. שלוש מתגלגלות ומתנדנדות, כמו בלדה ב־6/8. הקשיבו לאותו קליק עם שניים ואז שלושה צלילים לכל פעמה.' }, play: [grid(76, 4, every(4, 0.5)), grid(76, 4, every(4, 1 / 3))], show: { text: { en: '♫ · ³♫', he: '♫ · ³♫' } } },
      { say: { en: 'Swing eighths are written as even pairs but played long-short, close to a triplet with the middle note left out. The exact ratio varies: at fast tempos swing gets straighter. Straight, then swung.', he: 'שמיניות סווינג נכתבות כזוגות שווים אבל מנוגנות ארוך־קצר, קרוב לטריולה בלי הצליל האמצעי. היחס המדויק משתנה: בטמפים מהירים הסווינג נעשה ישר יותר. ישר, ואז בסווינג.' }, play: [grid(120, 4, every(4, 0.5)), grid(120, 4, every(4, 1).flatMap((x) => [x, x + 2 / 3]))], show: { text: { en: '♫ = ♩ ♪ (³)', he: '♫ = ♩ ♪ (³)' } } },
      { say: { en: 'A practice ladder: set a slow click and change the subdivision every bar — two, three, four — counting out loud. The beat must not move when the notes inside it change.', he: 'סולם תרגול: קבעו קליק איטי והחליפו חלוקה בכל תיבה — שתיים, שלוש, ארבע — וספרו בקול. הפעמה לא זזה כשהצלילים שבתוכה משתנים.' }, play: [grid(70, 12, [...every(4, 0.5), ...every(4, 1 / 3).map((x) => x + 4), ...every(4, 0.25).map((x) => x + 8)])], show: { text: { en: '2 → 3 → 4', he: '2 → 3 → 4' } } },
      { say: { en: 'The common mistake with triplets is to play them as an eighth and two sixteenths: long, short, short. Real triplets are three equal notes. Listen: the wrong shape, then even triplets.', he: 'הטעות הנפוצה בטריולות היא לנגן אותן כשמינית ושתי שש־עשריות: ארוך, קצר, קצר. טריולה אמיתית היא שלושה צלילים שווים. הקשיבו: הצורה השגויה, ואז טריולות שוות.' }, play: [grid(72, 4, every(4, 1).flatMap((x) => [x, x + 0.5, x + 0.75])), grid(72, 4, every(4, 1 / 3))], show: { text: { en: '♪♬ ✗ · ³♫ ✓', he: '♪♬ ✗ · ³♫ ✓' } } },
      { say: { en: 'Another trap is rushing the last subdivision, squeezing the "a" of "1 e and a" towards the next click. Keep the last piece as long as the first.', he: 'מלכודת נוספת היא למהר בחלק האחרון, לדחוס את ה״אָה״ של ״אחת אֶה וְ אָה״ לקראת הקליק הבא. שמרו על החלק האחרון ארוך כמו הראשון.' } },
      { say: { en: 'In real music: blues shuffles live on triplets, funk hi-hats often run in sixteenths, and slow 12/8 ballads are four beats each split into three.', he: 'במוזיקה אמיתית: שאפל של בלוז חי על טריולות, ההיי־הט בפאנק רץ הרבה פעמים בשש־עשריות, ובלדות איטיות ב־12/8 הן ארבע פעמות שכל אחת מתחלקת לשלוש.' } },
      { say: { en: 'To keep: every beat holds two, three or four equal pieces. Feel them between the clicks, keep them even, and your time stays steady even when the clicks are far apart.', he: 'מה לזכור: בכל פעמה יש שניים, שלושה או ארבעה חלקים שווים. הרגישו אותם בין הקליקים, שמרו שיהיו שווים, והזמן שלכם יישאר יציב גם כשהקליקים רחוקים.' } },
    ],
  },
  {
    id: 'click-backbeat',
    area: 'rhythm',
    emoji: '🔀',
    title: { en: 'When the click moves', he: 'כשהקליק זז' },
    takeaway: { en: 'A click on 2 and 4, on beat 1 only or on the "and"s is still a steady clock. Keep your own beat and use the click to check where you are.', he: 'קליק על 2 ו־4, רק על 1 או על ה״וְ״ הוא עדיין שעון יציב. שמרו על הפעמה שלכם והשתמשו בקליק כדי לבדוק איפה אתם.' },
    steps: [
      { say: { en: 'Hi {name}! Usually the click plays every beat: one, two, three, four. Here is the plain click with a tap on every beat.', he: 'היי {name}! בדרך כלל הקליק מנגן כל פעמה: אחת, שתיים, שלוש, ארבע. הנה הקליק הרגיל עם הקשה על כל פעמה.' }, play: [grid(92, 8, every(8, 1))] },
      { say: { en: 'Now the click plays only on two and four, the backbeat, like a snare in pop and jazz. Beats one and three fall in the silence between.', he: 'עכשיו הקליק מנגן רק על שתיים וארבע — הבקביט, כמו סנר בפופ ובג׳אז. פעמות אחת ושלוש נופלות בשקט שביניהם.' }, play: [grid(92, 8, every(8, 1), (i) => i % 2 === 1)] },
      { say: { en: 'Harder: the click only on beat one. You fill in two, three and four yourself, evenly.', he: 'קשה יותר: הקליק רק על פעמה אחת. את שתיים, שלוש וארבע אתם ממלאים לבד, באופן שווה.' }, play: [grid(92, 12, every(12, 1), (i) => i % 4 === 0)] },
      { say: { en: 'Hardest: the click moves onto the "and"s, halfway between the beats. Don\'t follow it; tap your beat against it.', he: 'הכי קשה: הקליק עובר אל ה״וְ״, באמצע בין הפעמות. אל תלכו אחריו — הקישו את הפעמה שלכם מולו.' }, play: [grid(88, 8, every(8, 1), () => true, 0.5)] },
      { say: { en: 'Tip: count out loud, quietly. A click in an unusual place is still a steady clock; it only tells you where you are.', he: 'טיפ: ספרו בקול, בשקט. קליק במקום לא רגיל הוא עדיין שעון יציב — הוא רק אומר לכם איפה אתם.' } },
    ],
    more: [
      { say: { en: 'The backbeat is beats two and four in 4/4: the weak beats, played strong. In rock, pop and soul the snare drum carries it while the kick lands on one and three.', he: 'הבקביט הוא פעמות שתיים וארבע ב־4/4: הפעמות החלשות, כשמנגנים אותן חזק. ברוק, בפופ ובסול הסנר נושא אותו, והבס־דראם נוחת על אחת ושלוש.' }, play: [kit(96, 8, [0, 2, 4, 6], [1, 3, 5, 7], every(8, 0.5))], show: { text: { en: '1 [2] 3 [4]', he: '1 [2] 3 [4]' } } },
      { say: { en: 'Jazz musicians practice with the click on two and four on purpose: it is where the drummer\'s hi-hat closes, and it makes the time feel like swing. Your taps fill one and three between the clicks.', he: 'נגני ג׳אז מתרגלים בכוונה עם קליק על שתיים וארבע: שם ההיי־הט של המתופף נסגר, וזה גורם לזמן להרגיש כמו סווינג. ההקשות שלכם ממלאות את אחת ושלוש בין הקליקים.' }, play: [grid(92, 8, [0, 2, 4, 6], (i) => i % 2 === 1)], show: { text: { en: 'tap 1 · click 2 · tap 3 · click 4', he: 'הקשה 1 · קליק 2 · הקשה 3 · קליק 4' } } },
      { say: { en: 'The trap: hearing the two-and-four click as one and three. Then your whole bar flips and every tap lands on the wrong beat. Fix it by saying "one" out loud just before the first click: "one CLICK three CLICK".', he: 'המלכודת: לשמוע את הקליק על שתיים וארבע כאילו הוא על אחת ושלוש. אז כל התיבה מתהפכת וכל הקשה נוחתת על הפעמה הלא נכונה. תקנו את זה כשאתם אומרים ״אחת״ בקול רגע לפני הקליק הראשון: ״אחת קליק שלוש קליק״.' } },
      { say: { en: 'With the click on beat one only, it marks bars, not beats. You carry three beats alone each time, so subdivide quietly and arrive exactly with the next click.', he: 'כשהקליק רק על פעמה אחת, הוא מסמן תיבות, לא פעמות. בכל פעם אתם נושאים שלוש פעמות לבד, אז חלקו בשקט בראש והגיעו בדיוק עם הקליק הבא.' }, play: [grid(100, 8, every(8, 1), (i) => i % 4 === 0)], show: { text: { en: '[1] 2 3 4 · [1] 2 3 4', he: '[1] 2 3 4 · [1] 2 3 4' } } },
      { say: { en: 'A click on the "and"s is like a ska guitar upstroke or a disco open hi-hat: it sits exactly halfway between your beats. Hear it as an answer to your tap, not as the beat itself.', he: 'קליק על ה״וְ״ דומה לפריטה למעלה בגיטרת סקא או להיי־הט פתוח בדיסקו: הוא יושב בדיוק באמצע בין הפעמות שלכם. שמעו אותו כתשובה להקשה שלכם, לא כפעמה עצמה.' }, play: [kit(104, 8, every(8, 1), [], every(8, 1).map((x) => x + 0.5))], show: { text: { en: '1 & 2 & · tap · click', he: '1 & 2 & · הקשה · קליק' } } },
      { say: { en: 'Another common mistake is drifting into the click: little by little your taps slide until they land with it. Here the taps start on the beats and slip onto the offbeat clicks. If tap and click start to merge, you have moved.', he: 'טעות נפוצה נוספת היא להיסחף אל הקליק: לאט לאט ההקשות מחליקות עד שהן נוחתות איתו. כאן ההקשות מתחילות על הפעמות וגולשות אל הקליקים שבין הפעמות. אם ההקשה והקליק מתחילים להתמזג — זזתם.' }, play: [grid(88, 8, [0, 1, 2.1, 3.2, 4.3, 5.4, 6.5, 7.5], () => true, 0.5)] },
      { say: { en: 'A good ladder: click on every beat, then on two and four, then on one only, then on the "and"s, then one bar on and one bar off. Move up only when the step before feels easy.', he: 'סולם טוב: קליק על כל פעמה, אחר כך על שתיים וארבע, אחר כך רק על אחת, אחר כך על ה״וְ״, ואז תיבה עם ותיבה בלי. עלו שלב רק כשהשלב הקודם מרגיש קל.' } },
      { say: { en: 'To keep: the click is a reference, not a leader. Wherever it sits, your beat stays where it is, and the click only confirms it.', he: 'מה לזכור: הקליק הוא נקודת ייחוס, לא מנהיג. איפה שהוא לא יהיה, הפעמה שלכם נשארת במקומה, והקליק רק מאשר אותה.' } },
    ],
  },
  {
    id: 'gap-click',
    area: 'rhythm',
    emoji: '🕳️',
    title: { en: 'Through the gaps', he: 'דרך השקט' },
    takeaway: { en: 'The click drops out and you keep the beat alone. When it comes back you hear at once whether you rushed or dragged.', he: 'הקליק נעלם ואתם שומרים על הפעמה לבד. כשהוא חוזר שומעים מיד אם מיהרתם או נגררתם.' },
    steps: [
      { say: { en: 'Hi {name}! A metronome helps, but real time lives inside you. Here the click plays two bars, then stops for one, while the taps keep going.', he: 'היי {name}! מטרונום עוזר, אבל הזמן האמיתי חי בתוככם. כאן הקליק מנגן שתי תיבות ואז נעלם לתיבה אחת, וההקשות ממשיכות.' }, play: [grid(100, 12, every(12, 1), (i) => Math.floor(i / 4) !== 2)] },
      { say: { en: 'When the click returns you hear at once whether you rushed. Listen: these taps run ahead in the gap and clash with the click when it comes back.', he: 'כשהקליק חוזר שומעים מיד אם מיהרתם. הקשיבו: ההקשות האלה רצות קדימה בשקט ומתנגשות בקליק כשהוא חוזר.' }, play: [grid(100, 12, every(12, 1).map((x) => (x >= 8 ? x - 0.12 * (x - 7) : x)), (i) => Math.floor(i / 4) !== 1)] },
      { say: { en: 'Now two bars on and two bars off. A longer silence means more time to drift, so stay calm and even.', he: 'עכשיו שתי תיבות עם קליק ושתיים בלי. שקט ארוך יותר הוא יותר זמן לסטות, אז הישארו רגועים ושווים.' }, play: [grid(104, 16, every(16, 1), (i) => Math.floor(i / 4) % 4 < 2)] },
      { say: { en: 'The secret is to keep counting in your head and to move a little: a nod or a foot on every beat.', he: 'הסוד: להמשיך לספור בראש ולזוז קצת — הנהון או רגל על כל פעמה.' } },
      { say: { en: 'In the exercise, tap every beat right through the gaps. You win when your taps land together with the click as it comes back.', he: 'בתרגיל, הקישו כל פעמה גם בתוך השקט. אתם מנצחים כשההקשות נוחתות יחד עם הקליק כשהוא חוזר.' } },
    ],
    more: [
      { say: { en: 'A gap click plays some bars and mutes others. It tests your internal clock: the sense of time that keeps running when nothing outside marks the beat. Here one bar on, one bar off, one bar on.', he: 'קליק עם הפסקות מנגן חלק מהתיבות ומשתיק אחרות. הוא בודק את השעון הפנימי שלכם: תחושת הזמן שממשיכה לרוץ כששום דבר מבחוץ לא מסמן את הפעמה. כאן תיבה עם, תיבה בלי, תיבה עם.' }, play: [grid(90, 12, every(12, 1), (i) => Math.floor(i / 4) !== 1)], show: { text: { en: '● ● ● ● · ○ ○ ○ ○ · ● ● ● ●', he: '● ● ● ● · ○ ○ ○ ○ · ● ● ● ●' } } },
      { say: { en: 'Why it matters: in a band nothing marks every beat. There are breaks, stops and quiet bars, and everyone has to come back in together. Your inner clock is what lets that happen.', he: 'למה זה חשוב: בלהקה שום דבר לא מסמן כל פעמה. יש ברייקים, עצירות ותיבות שקטות, וכולם צריכים לחזור יחד. השעון הפנימי שלכם הוא מה שמאפשר את זה.' } },
      { say: { en: 'When the click returns, compare. A tap before the click means you rushed; after it, you dragged. Many players rush in silence, especially at slow tempos. Here the taps drag through the gap and land late.', he: 'כשהקליק חוזר, השוו. הקשה לפני הקליק פירושה שמיהרתם; אחריו — שנגררתם. הרבה נגנים ממהרים בשקט, במיוחד בטמפים איטיים. כאן ההקשות נגררות בתוך השקט ונוחתות באיחור.' }, play: [grid(96, 12, every(12, 1).map((x) => (x >= 4 ? x + 0.06 * (x - 3) : x)), (i) => Math.floor(i / 4) !== 1)], show: { text: { en: 'early = rushed · late = dragged', he: 'מוקדם = מיהרתם · מאוחר = נגררתם' } } },
      { say: { en: 'The strategy is to fill the gap. Feel the eighths inside each beat, count the bars as well — "one two three four, two two three four" — and move: a nod, a foot, a sway.', he: 'האסטרטגיה היא למלא את השקט. הרגישו את השמיניות בתוך כל פעמה, ספרו גם את התיבות — ״אחת שתיים שלוש ארבע, שתיים שתיים שלוש ארבע״ — וזוזו: הנהון, רגל, נדנוד.' }, play: [grid(84, 12, every(12, 0.5), (i) => Math.floor(i / 4) !== 1)], show: { text: { en: '1 & 2 & 3 & 4 &', he: '1 & 2 & 3 & 4 &' } } },
      { say: { en: 'A practice ladder: one bar on and one off, then two and two, then one on and three off, then four and four. Slow tempos are harder than fast ones, because each silent beat lasts longer.', he: 'סולם תרגול: תיבה עם ותיבה בלי, אחר כך שתיים ושתיים, אחר כך אחת עם ושלוש בלי, ואז ארבע וארבע. טמפים איטיים קשים יותר ממהירים, כי כל פעמה שקטה נמשכת יותר זמן.' } },
      { say: { en: 'The common mistake is a sudden jump when the click comes back and you are off. In a band that sounds like a stumble. Adjust gently over two or three beats instead, and listen for what made you drift.', he: 'הטעות הנפוצה היא קפיצה פתאומית כשהקליק חוזר ואתם לא איתו. בלהקה זה נשמע כמו מעידה. במקום זה, תקנו בעדינות במשך שתיים או שלוש פעמות, והקשיבו מה גרם לכם לסטות.' } },
      { say: { en: 'In real music: in stop-time, common in blues and jazz, the band plays only the first beat of each bar and the soloist carries the time alone in between. Listen: the hits, and the silence you must keep.', he: 'במוזיקה אמיתית: בסטופ־טיים, שנפוץ בבלוז ובג׳אז, הלהקה מנגנת רק את הפעמה הראשונה של כל תיבה והסולן נושא את הזמן לבד ביניהן. הקשיבו: המכות, והשקט שצריך להחזיק.' }, play: [kit(100, 12, [0, 4, 8], [0, 4, 8], [])], show: { text: { en: 'hit · · · hit · · ·', he: 'מכה · · · מכה · · ·' } } },
      { say: { en: 'To keep: the beat lives in you, not in the click. Subdivide, count bars and move through every gap, and the click will find you exactly where you should be.', he: 'מה לזכור: הפעמה חיה בכם, לא בקליק. חלקו, ספרו תיבות וזוזו בתוך כל שקט, והקליק ימצא אתכם בדיוק איפה שאתם צריכים להיות.' } },
    ],
  },
  {
    id: 'tempo-memory',
    area: 'rhythm',
    emoji: '⏱️',
    title: { en: 'Tempo from memory', he: 'טמפו מהזיכרון' },
    takeaway: { en: 'Anchor tempos to things you know: 60 is a clock\'s second, 120 a brisk march. From those you can find the others without a metronome.', he: 'עגנו טמפים בדברים מוכרים: 60 זו שנייה של שעון, 120 צעדה נמרצת. מהם אפשר למצוא את השאר בלי מטרונום.' },
    steps: [
      { say: { en: 'Hi {name}! Musicians often count a song in without a metronome. That is tempo memory. This is 60 beats per minute: one per second, like a clock.', he: 'היי {name}! נגנים סופרים לעתים קרובות שיר בלי מטרונום. זה זיכרון טמפו. זה 60 פעמות בדקה: אחת בשנייה, כמו שעון.' }, play: [grid(60, 6, [])] },
      { say: { en: 'This is 120, twice as fast, like a brisk march.', he: 'זה 120, פי שניים מהר יותר, כמו צעדה נמרצת.' }, play: [grid(120, 10, [])] },
      { say: { en: 'And 90 sits between them: a relaxed walk.', he: 'ו־90 נמצא ביניהם: הליכה נינוחה.' }, play: [grid(90, 8, [])] },
      { say: { en: 'Anchor tempos to things you know. A second hand is 60, a march is 120, and from those you can guess the others: a little faster, a little slower.', he: 'עגנו טמפים בדברים שאתם מכירים. מחוג שניות הוא 60, צעדה היא 120, ומהם אפשר לנחש את השאר: קצת מהר יותר, קצת לאט יותר.' } },
      { say: { en: 'In the exercise there is no click. Start when you are ready and tap the asked tempo. Within three percent counts as perfect, so keep it even and don\'t rush.', he: 'בתרגיל אין קליק. מתחילים כשמוכנים ומקישים את הטמפו שהתבקש. עד שלושה אחוזים נחשב מושלם, אז שמרו על אחידות ואל תמהרו.' } },
    ],
    more: [
      { say: { en: 'Tempo is measured in beats per minute, BPM. At 60 there is one beat every second; at 120, two every second. Doubling the BPM halves the gap between beats. Here are 60 and 120.', he: 'טמפו נמדד בפעמות לדקה, BPM. ב־60 יש פעמה אחת בכל שנייה; ב־120, שתיים בכל שנייה. הכפלת ה־BPM מקצרת בחצי את הרווח בין הפעמות. הנה 60 ו־120.' }, play: [grid(60, 4, []), grid(120, 8, [])], show: { text: { en: '60 = 1/s · 120 = 2/s', he: '60 = 1 בשנייה · 120 = 2 בשנייה' } } },
      { say: { en: 'Build a set of anchors. A clock\'s second hand is 60. Many marches sit near 120. Then pick a few songs you know by heart, look up their tempos once, and keep them as reference points.', he: 'בנו לעצמכם עוגנים. מחוג השניות של שעון הוא 60. הרבה מארשים יושבים בסביבות 120. אחר כך בחרו כמה שירים שאתם מכירים בעל פה, בדקו פעם אחת את הטמפו שלהם, ושמרו אותם כנקודות ייחוס.' } },
      { say: { en: 'Find the in-between tempos from the anchors. 90 is one and a half times 60: three beats in the time of two seconds. Listen: the click at 90 against hits at 60.', he: 'מצאו את הטמפים שבאמצע מתוך העוגנים. 90 הוא פי אחד וחצי מ־60: שלוש פעמות בזמן של שתי שניות. הקשיבו: הקליק ב־90 מול מכות ב־60.' }, play: [grid(90, 9, [0, 1.5, 3, 4.5, 6, 7.5])], show: { text: { en: '90 : 60 = 3 : 2', he: '90 : 60 = 3 : 2' } } },
      { say: { en: 'Rough feel ranges help too. Below about 70 is a slow ballad, 90 to 110 a relaxed mid-tempo, around 120 to 130 a typical dance groove, and above 160 starts to feel very fast or is felt in half time.', he: 'גם טווחי תחושה גסים עוזרים. מתחת ל־70 בערך זו בלדה איטית, 90 עד 110 טמפו בינוני ונינוח, סביב 120 עד 130 גרוב ריקודים טיפוסי, ומעל 160 זה מתחיל להרגיש מהיר מאוד או שמרגישים אותו בחצי טמפו.' } },
      { say: { en: 'Watch out for half and double time. A song at 70 with busy eighths can feel like 140. Decide which pulse you are counting — the one your foot taps — before you name a number.', he: 'היזהרו מחצי טמפו וטמפו כפול. שיר ב־70 עם שמיניות צפופות יכול להרגיש כמו 140. החליטו איזה דופק אתם סופרים — זה שהרגל מקישה — לפני שאתם נותנים מספר.' }, play: [grid(70, 4, every(4, 0.5))], show: { text: { en: '70 ♫ ≈ 140 ♩', he: '70 ♫ ≈ 140 ♩' } } },
      { say: { en: 'A daily drill: before you start the metronome, tap 60, 90 and 120 cold, then check. Guess the tempo of songs you hear and look them up. Your guesses will tighten within weeks.', he: 'תרגיל יומי: לפני שמפעילים מטרונום, הקישו 60, 90 ו־120 בלי הכנה, ואז בדקו. נחשו את הטמפו של שירים שאתם שומעים ובדקו. תוך שבועות הניחושים יתחדדו.' } },
      { say: { en: 'The common mistake is a fast start: excitement pushes the first taps ahead, then you settle. Hear a few beats in your head before the first tap, and begin only when the pulse is already running.', he: 'הטעות הנפוצה היא התחלה מהירה: ההתרגשות דוחפת את ההקשות הראשונות קדימה, ורק אחר כך מתייצבים. שמעו כמה פעמות בראש לפני ההקשה הראשונה, והתחילו רק כשהדופק כבר רץ.' } },
      { say: { en: 'To keep: anchor tempos to things you know — 60 a second, 120 a march, a few favorite songs — and work out the rest by ratios. Feel the pulse first, then tap.', he: 'מה לזכור: עגנו טמפים בדברים שאתם מכירים — 60 שנייה, 120 מארש, כמה שירים אהובים — וחשבו את השאר לפי יחסים. הרגישו את הדופק קודם, ואז הקישו.' } },
    ],
  },
  {
    id: 'poly-tap',
    area: 'rhythm',
    emoji: '🙌',
    title: { en: 'Two hands', he: 'שתי ידיים' },
    takeaway: { en: 'Each hand keeps its own even rhythm; they meet on the beat. For 3 against 2 say "nice cup of tea".', he: 'כל יד שומרת על מקצב שווה משלה; הן נפגשות על הפעמה. ל־3 נגד 2 אמרו ״נַייס קַאפּ אוֹף טִי״.' },
    steps: [
      { say: { en: 'Hi {name}! Drummers and pianists play a different rhythm with each hand. Listen: the low drum plays the beat, the high one plays twice as fast. That is two against one.', he: 'היי {name}! מתופפים ופסנתרנים מנגנים מקצב שונה בכל יד. הקשיבו: התוף הנמוך מנגן את הפעמה, הגבוה פי שניים מהר. זה שתיים נגד אחת.' }, play: [poly(2, 1, 0.8, 6)] },
      { say: { en: 'Three against two: one hand plays two even notes, the other plays three in the same time. They meet only on the beat.', he: 'שלוש נגד שתיים: יד אחת מנגנת שני צלילים שווים, השנייה שלושה באותו זמן. הן נפגשות רק על הפעמה.' }, play: [poly(3, 2, 1.2, 5)] },
      { say: { en: 'A handy phrase for three against two is "nice cup of tea". Nice is both hands, cup the right, of the left, tea the right.', he: 'משפט שעוזר לשלוש נגד שתיים: ״נַייס קַאפּ אוֹף טִי״. נייס — שתי הידיים, קאפ — ימין, אוף — שמאל, טי — ימין.' }, play: [poly(3, 2, 1.8, 4)] },
      { say: { en: 'Four against three is the same idea, tighter: three on the left, four on the right.', he: 'ארבע נגד שלוש זה אותו רעיון, צפוף יותר: שלוש בשמאל, ארבע בימין.' }, play: [poly(4, 3, 1.5, 4)] },
      { say: { en: 'In the exercise you tap two pads. Start slowly, keep each hand even on its own, and let them meet on the beat.', he: 'בתרגיל מקישים על שני פדים. התחילו לאט, שמרו כל יד שווה בפני עצמה, ותנו להן להיפגש על הפעמה.' } },
    ],
    more: [
      { say: { en: 'A polyrhythm is two even pulses with different counts sharing the same span of time. In 3 against 2, three evenly spaced notes and two evenly spaced notes fill one cycle. They coincide only on its first note.', he: 'פולימקצב הוא שני דפקים שווים עם מספר שונה של צלילים שחולקים את אותו פרק זמן. ב־3 נגד 2, שלושה צלילים במרווחים שווים ושני צלילים במרווחים שווים ממלאים מחזור אחד. הם נפגשים רק בצליל הראשון שלו.' }, play: [poly(3, 2, 1.2, 4)], show: { text: { en: '3 : 2', he: '3 : 2' } } },
      { say: { en: 'The math: 3 against 2 lives on a grid of six. The three-part plays on 1, 3 and 5; the two-part on 1 and 4. Together: both, three, two, three — "nice cup of tea". Slowly now.', he: 'החשבון: 3 נגד 2 חי על רשת של שש. החלק של השלוש מנגן על 1, 3 ו־5; החלק של השתיים על 1 ו־4. ביחד: שניהם, שלוש, שתיים, שלוש — ״נייס קאפ אוף טי״. עכשיו לאט.' }, play: [poly(3, 2, 2.4, 3)], show: { text: { en: 'X · 3 2 3 · (6)', he: 'X · 3 2 3 · (6)' } } },
      { say: { en: '4 against 3 lives on a grid of twelve. The four-part plays on 1, 4, 7 and 10; the three-part on 1, 5 and 9. The combined rhythm is both, four, three, four, three, four.', he: '4 נגד 3 חי על רשת של שתים־עשרה. החלק של הארבע מנגן על 1, 4, 7 ו־10; החלק של השלוש על 1, 5 ו־9. המקצב המשולב הוא: שניהם, ארבע, שלוש, ארבע, שלוש, ארבע.' }, play: [poly(4, 3, 2.0, 3)], show: { text: { en: 'X · 4 3 4 3 4 · (12)', he: 'X · 4 3 4 3 4 · (12)' } } },
      { say: { en: 'A close cousin is the hemiola: three against two in sequence rather than at once. Six eighths are grouped as two threes, then as three twos, and the bar suddenly seems to change shape.', he: 'קרוב משפחה הוא ההמיולה: שלוש נגד שתיים ברצף ולא בבת אחת. שש שמיניות מתקבצות כשתי שלישיות, ואז כשלושה זוגות, והתיבה פתאום משנה צורה.' }, play: [kit(180, 12, [0, 3, 6, 8, 10], [], every(12, 1))], show: { text: { en: '123 123 · 12 12 12', he: '123 123 · 12 12 12' } } },
      { say: { en: 'How to practice: each hand alone first, until it is even. Then speak the combined rhythm. Then put the hands together very slowly, and finally focus on one hand while the other runs by itself. Swap hands too.', he: 'איך מתרגלים: קודם כל יד לבד, עד שהיא שווה. אחר כך אומרים את המקצב המשולב. אחר כך מחברים את הידיים לאט מאוד, ולבסוף מתרכזים ביד אחת בזמן שהשנייה רצה לבד. החליפו גם ידיים.' } },
      { say: { en: 'The common mistake is letting the two parts melt into one lopsided rhythm, where the three-part bends towards the two. Check each hand on its own: its notes must stay exactly evenly spaced.', he: 'הטעות הנפוצה היא לתת לשני החלקים להתמזג למקצב עקום אחד, שבו החלק של השלוש מתכופף לכיוון השתיים. בדקו כל יד בפני עצמה: הצלילים שלה חייבים להישאר במרווחים שווים בדיוק.' } },
      { say: { en: 'In real music, 3 against 2 is the foundation of much West African drumming and of Afro-Cuban grooves. Chopin\'s Fantaisie-Impromptu sets four notes in the right hand against three in the left.', he: 'במוזיקה אמיתית, 3 נגד 2 הוא הבסיס של הרבה תיפוף ממערב אפריקה ושל גרוב אפרו־קובני. בפנטזיה־אימפרומפטו של שופן היד הימנית מנגנת ארבעה צלילים מול שלושה ביד שמאל.' }, play: [poly(4, 3, 1.5, 4)] },
      { say: { en: 'To keep: a polyrhythm is two even pulses in one span. Find the shared grid, learn the combined pattern, and keep each hand even on its own.', he: 'מה לזכור: פולימקצב הוא שני דפקים שווים באותו פרק זמן. מצאו את הרשת המשותפת, למדו את הדפוס המשולב, ושמרו על כל יד שווה בפני עצמה.' } },
    ],
  },
  {
    id: 'rhythm-errors',
    area: 'rhythm',
    emoji: '🔍',
    title: { en: 'Spot the rhythm slip', he: 'למצוא את הטעות בקצב' },
    takeaway: { en: 'Follow the written rhythm with your eyes as it plays, beat by beat, and notice where the sound stops matching the page.', he: 'עקבו אחרי המקצב הכתוב בעיניים בזמן שהוא מתנגן, פעמה אחר פעמה, ושימו לב איפה הצליל מפסיק להתאים לדף.' },
    steps: [
      { say: { en: 'Hi {name}! Reading rhythm also means catching mistakes. Here is a bar: quarter, two eighths, quarter, quarter.', he: 'היי {name}! לקרוא קצב זה גם לתפוס טעויות. הנה תיבה: רבע, שתי שמיניות, רבע, רבע.' }, play: [grid(88, 4, [0, 1, 1.5, 2, 3])], show: { text: { en: '♩ ♫ ♩ ♩', he: '♩ ♫ ♩ ♩' } } },
      { say: { en: 'Now the same bar with one slip: beat three has two eighths instead of a quarter. Did you hear the extra note?', he: 'עכשיו אותה תיבה עם טעות אחת: בפעמה שלוש יש שתי שמיניות במקום רבע. שמעתם את הצליל הנוסף?' }, play: [grid(88, 4, [0, 1, 1.5, 2, 2.5, 3])], show: { text: { en: '♩ ♫ ♩ ♩', he: '♩ ♫ ♩ ♩' } } },
      { say: { en: 'Subtle slips are harder. Two even eighths played long-short, dotted. Listen: first even, then dotted.', he: 'טעויות עדינות קשות יותר. שתי שמיניות שוות שמנוגנות ארוך־קצר, מנוקד. הקשיבו: קודם שווה, אחר כך מנוקד.' }, play: [grid(80, 4, [0, 0.5, 1, 1.5]), grid(80, 4, [0, 0.75, 1, 1.75])] },
      { say: { en: 'Or a note comes a little early, a push. Here beat three arrives a sixteenth early.', he: 'או שצליל מגיע קצת מוקדם — דחיפה. כאן פעמה שלוש מגיעה שש־עשרית מוקדם.' }, play: [grid(76, 8, [0, 1, 1.75, 3, 4, 5, 5.75, 7])] },
      { say: { en: 'In the exercise, follow the written rhythm with your eyes as it plays, beat by beat, and mark where the sound stops matching. You can play each answer again to compare it with what you heard.', he: 'בתרגיל, עקבו אחרי המקצב הכתוב בעיניים בזמן שהוא מתנגן, פעמה אחר פעמה, וסמנו איפה הצליל מפסיק להתאים. אפשר לנגן כל תשובה שוב ולהשוות למה ששמעתם.' } },
    ],
    more: [
      { say: { en: 'Rhythm slips come in a few kinds: a missing or extra note, a wrong length, a note early or late, dotted instead of even, or triplets instead of eighths. Knowing the kinds tells you what to listen for. Here the written bar, then one with a note missing.', he: 'טעויות קצב באות בכמה סוגים: צליל חסר או מיותר, אורך שגוי, צליל מוקדם או מאוחר, מנוקד במקום שווה, או טריולות במקום שמיניות. כשמכירים את הסוגים, יודעים למה להקשיב. הנה התיבה הכתובה, ואז תיבה שחסר בה צליל.' }, play: [grid(88, 4, [0, 1, 1.5, 2, 3]), grid(88, 4, [0, 1, 2, 3])], show: { text: { en: '♩ ♫ ♩ ♩ · ♩ ♩ ♩ ♩', he: '♩ ♫ ♩ ♩ · ♩ ♩ ♩ ♩' } } },
      { say: { en: 'Prepare before you listen. Read the bar and count it in your head, and write or picture the beat numbers under the notes. While it plays, track beat numbers, not individual notes.', he: 'התכוננו לפני שאתם מקשיבים. קראו את התיבה וספרו אותה בראש, וכתבו או דמיינו את מספרי הפעמות מתחת לתווים. בזמן שהיא מתנגנת, עקבו אחרי מספרי הפעמות, לא אחרי צלילים בודדים.' } },
      { say: { en: 'Three pairs that are easy to confuse: straight eighths split the beat 1 to 1; swing is about 2 to 1; a dotted eighth and a sixteenth is 3 to 1. Listen to all three.', he: 'שלושה זוגות שקל לבלבל: שמיניות ישרות מחלקות את הפעמה 1 ל־1; סווינג הוא בערך 2 ל־1; שמינית מנוקדת ושש־עשרית הן 3 ל־1. הקשיבו לשלושתם.' }, play: [grid(80, 2, [0, 0.5, 1, 1.5]), grid(80, 2, [0, 2 / 3, 1, 1 + 2 / 3]), grid(80, 2, [0, 0.75, 1, 1.75])], show: { text: { en: '1:1 · 2:1 · 3:1', he: '1:1 · 2:1 · 3:1' } } },
      { say: { en: 'A tie removes an attack, so a tied note sounds like a missing one. Here four quarters, then the same bar with beats two and three tied: you hear only three notes.', he: 'קשת חיבור מבטלת הקשה, ולכן צליל מחובר נשמע כמו צליל חסר. הנה ארבעה רבעים, ואז אותה תיבה כשפעמות שתיים ושלוש מחוברות: שומעים רק שלושה צלילים.' }, play: [grid(88, 4, [0, 1, 2, 3]), grid(88, 4, [0, 1, 3])], show: { text: { en: '♩ ♩ ♩ ♩ · ♩ ♩‿♩ ♩', he: '♩ ♩ ♩ ♩ · ♩ ♩‿♩ ♩' } } },
      { say: { en: 'An anticipation, or push, brings a note in before its beat, often by an eighth. It is common in pop and only an error if the page does not show it. Here beat three of the second bar comes an eighth early.', he: 'הקדמה, או דחיפה, מכניסה צליל לפני הפעמה שלו, הרבה פעמים בשמינית. זה נפוץ בפופ, וזו טעות רק אם הדף לא מראה אותה. כאן פעמה שלוש של התיבה השנייה מגיעה שמינית מוקדם.' }, play: [grid(84, 8, [0, 1, 2, 3, 4, 5, 5.5, 7])], show: { text: { en: '… 2 & ← 3', he: '… 2 & ← 3' } } },
      { say: { en: 'The common mistake is listening to the whole bar as one blur. Narrow it down: was beat one right? Beat two? The slip is almost always in one beat, and once you find which, naming it is easy.', he: 'הטעות הנפוצה היא להקשיב לכל התיבה ככתם אחד. צמצמו: פעמה אחת הייתה נכונה? פעמה שתיים? הטעות כמעט תמיד בפעמה אחת, וכשמוצאים באיזו, קל לתת לה שם.' } },
      { say: { en: 'In real music, this is how teachers, conductors and band leaders work: they follow the page in time and stop exactly where the sound and the score part ways. The same skill helps you check your own playing.', he: 'במוזיקה אמיתית, כך עובדים מורים, מנצחים ומנהלי להקות: הם עוקבים אחרי הדף בזמן ועוצרים בדיוק במקום שבו הצליל והתווים נפרדים. אותה מיומנות עוזרת לבדוק גם את הנגינה שלכם.' } },
      { say: { en: 'To keep: count the bar before it plays, follow beat numbers while it plays, and ask which kind of slip it was — missing, extra, long, short, early, late, dotted or triplet.', he: 'מה לזכור: ספרו את התיבה לפני שהיא מתנגנת, עקבו אחרי מספרי הפעמות בזמן שהיא מתנגנת, ושאלו איזה סוג טעות זו — חסר, מיותר, ארוך, קצר, מוקדם, מאוחר, מנוקד או טריולה.' } },
    ],
  },
  {
    id: 'drum-read',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Read the drum kit', he: 'לקרוא תופים' },
    takeaway: { en: 'Drum notation puts the kick low, the snare in the middle and the hi-hat on top. Read one voice at a time, then put them together.', he: 'בתווי תופים הבס־דראם למטה, הסנר באמצע וההיי־הט למעלה. קראו קול אחד בכל פעם, ואז חברו אותם.' },
    steps: [
      { say: { en: 'Hi {name}! A drum part is written on one staff: the kick low, the snare in the middle, the hi-hat on top with little crosses. Listen to a basic rock beat.', he: 'היי {name}! חלק תופים נכתב על חמשה אחת: הבס־דראם למטה, הסנר באמצע, וההיי־הט למעלה עם איקסים קטנים. הקשיבו לביט רוק בסיסי.' }, play: [kit(90, 8, [0, 2, 4, 6], [1, 3, 5, 7], every(8, 0.5))] },
      { say: { en: 'The hi-hat keeps eighths, the snare hits two and four, and the kick plays one and three. First the hi-hat and snare alone.', he: 'ההיי־הט שומר על שמיניות, הסנר מכה על שתיים וארבע, והבס־דראם על אחת ושלוש. קודם רק ההיי־הט והסנר.' }, play: [kit(90, 4, [], [1, 3], every(4, 0.5))] },
      { say: { en: 'Move the kick and the groove changes. Here it adds a kick on the "and" of three.', he: 'מזיזים את הבס־דראם — והגרוב משתנה. כאן נוסף בס־דראם על ה״וְ״ של שלוש.' }, play: [kit(90, 8, [0, 2, 2.5, 4, 6, 6.5], [1, 3, 5, 7], every(8, 0.5))] },
      { say: { en: 'A fill breaks the groove for a moment, usually on the snare at the end of a bar, and leads back to beat one.', he: 'פיל שובר את הגרוב לרגע, בדרך כלל בסנר בסוף התיבה, ומוביל חזרה לפעמה אחת.' }, play: [kit(90, 9, [0, 2, 4, 8], [1, 3, 5, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75], [...every(6, 0.5), 8])] },
      { say: { en: 'In the exercise you play three pads: kick, snare and hi-hat. Read one line at a time first, then put them together slowly.', he: 'בתרגיל מנגנים על שלושה פדים: בס־דראם, סנר והיי־הט. קודם קראו שורה אחת בכל פעם, ואז חברו אותן לאט.' } },
    ],
    more: [
      { say: { en: 'Drum notation uses a five-line staff with a neutral percussion clef, and each line or space means a drum, not a pitch. In the most common layout the kick sits in the bottom space, the snare in the third space, and the hi-hat just above the staff with an x notehead.', he: 'כתיבת תופים משתמשת בחמשה של חמישה קווים עם מפתח הקשה ניטרלי, וכל קו או רווח מסמן תוף, לא גובה צליל. בסידור הנפוץ ביותר הבס־דראם יושב ברווח התחתון, הסנר ברווח השלישי, וההיי־הט ממש מעל החמשה עם ראש תו בצורת x.' }, play: [kit(90, 4, [0, 2], [1, 3], every(4, 0.5))], show: { text: { en: 'x hi-hat · ● snare · ● kick', he: 'x היי־הט · ● סנר · ● בס־דראם' } } },
      { say: { en: 'Usually the hands are written with stems up and the feet with stems down. Cymbals take x noteheads, drums take round ones, and the toms sit on the lines and spaces between snare and kick.', he: 'בדרך כלל הידיים נכתבות עם צוואר למעלה והרגליים עם צוואר למטה. מצלתיים מקבלים ראש תו x, תופים ראש עגול, והטומים יושבים על הקווים והרווחים שבין הסנר לבס־דראם.' } },
      { say: { en: 'Read the feet on their own first: here the kick on one, three and the "and" of three. Count eighths aloud, "one and two and", and place each kick on its syllable.', he: 'קראו קודם את הרגליים לבד: כאן הבס־דראם על אחת, שלוש וה״וְ״ של שלוש. ספרו שמיניות בקול, ״אחת וְ שתיים וְ״, ושימו כל בס־דראם על ההברה שלו.' }, play: [kit(90, 4, [0, 2, 2.5], [], every(4, 0.5))], show: { text: { en: '1 & 2 & 3 [&] 4 &', he: '1 & 2 & 3 [&] 4 &' } } },
      { say: { en: 'Know the basic grooves by sight. Four-on-the-floor puts the kick on every beat, the sound of disco and house. Half-time moves the snare to beat three only, so the same tempo feels twice as slow.', he: 'הכירו את הגרובים הבסיסיים במבט. ״פור און דה פלור״ שם בס־דראם על כל פעמה — הצליל של דיסקו והאוס. חצי טמפו מעביר את הסנר לפעמה שלוש בלבד, כך שאותו טמפו מרגיש איטי פי שניים.' }, play: [kit(116, 4, [0, 1, 2, 3], [1, 3], every(4, 1).map((x) => x + 0.5)), { kind: 'rest', duration: 0.3 }, kit(90, 8, [0, 4, 5.5], [2, 6], every(8, 0.5))], show: { text: { en: 'four-on-the-floor · half-time', he: 'פור און דה פלור · חצי טמפו' } } },
      { say: { en: 'Charts save space with signs. A slash with two dots repeats the previous bar, and "fill" or slashes over a bar ask you to improvise one. Many drum parts are mostly a written groove plus these signs.', he: 'תווים חוסכים מקום בעזרת סימנים. קו נטוי עם שתי נקודות חוזר על התיבה הקודמת, ו״fill״ או קווים נטויים מעל תיבה מבקשים לאלתר פיל. הרבה חלקי תופים הם בעיקר גרוב כתוב ועוד הסימנים האלה.' } },
      { say: { en: 'The common mistake is mixing up kick and snare, since both are round notes in spaces. A quick check: in rock and pop the snare almost always falls on two and four. If your "snare" lands on one, swap them.', he: 'הטעות הנפוצה היא לבלבל בין בס־דראם לסנר, כי שניהם תווים עגולים ברווחים. בדיקה מהירה: ברוק ובפופ הסנר כמעט תמיד נופל על שתיים וארבע. אם ה״סנר״ שלכם נוחת על אחת, החליפו ביניהם.' } },
      { say: { en: 'A good drill is to say the groove before you play it: "boom" for kick, "tak" for snare, "ts" for hi-hat. Then tap the hands on a table and the kick with your foot, slowly, adding one voice at a time.', he: 'תרגיל טוב הוא להגיד את הגרוב לפני שמנגנים: ״בום״ לבס־דראם, ״טק״ לסנר, ״טס״ להיי־הט. אחר כך הקישו את הידיים על שולחן ואת הבס־דראם ברגל, לאט, ותוסיפו קול אחד בכל פעם.' } },
      { say: { en: 'To keep: position tells the drum, the notehead tells drum or cymbal, the stems tell hands or feet. Read one voice at a time, then stack them.', he: 'מה לזכור: המיקום אומר איזה תוף, ראש התו אומר תוף או מצילה, הצוואר אומר ידיים או רגליים. קראו קול אחד בכל פעם, ואז הניחו אותם זה על זה.' } },
    ],
  },
  {
    id: 'tempo-react',
    area: 'rhythm',
    emoji: '⚡',
    title: { en: 'Quick reaction', he: 'תגובה מהירה' },
    takeaway: { en: 'Keep the first bar\'s speed and length in your head; when something changes, the music stops matching that picture.', he: 'שמרו בראש את המהירות והאורך של התיבה הראשונה; כשמשהו משתנה, המוזיקה מפסיקה להתאים לתמונה הזאת.' },
    steps: [
      { say: { en: 'Hi {name}! Bands sometimes change tempo or meter in the middle of a song, and you have to notice at once. Listen to this groove: the kick marks every beat one.', he: 'היי {name}! להקות משנות לפעמים טמפו או משקל באמצע שיר, וצריך לשים לב מיד. הקשיבו לגרוב הזה: הבס־דראם מסמן כל פעמה אחת.' }, play: [groove(fours(3).map(() => ({ bpm: 100, beats: 4 })))] },
      { say: { en: 'Here it suddenly gets faster in bar three. Count the bars on each kick.', he: 'כאן זה פתאום מאיץ בתיבה שלוש. ספרו את התיבות על כל בס־דראם.' }, play: [groove(fours(4).map((i) => ({ bpm: i >= 2 ? 120 : 100, beats: 4 })))] },
      { say: { en: 'And here the meter changes: four beats per bar, then three.', he: 'וכאן המשקל משתנה: ארבע פעמות בתיבה, ואז שלוש.' }, play: [groove(fours(5).map((i) => ({ bpm: 100, beats: i >= 2 ? 3 : 4 })))] },
      { say: { en: 'Small changes are harder. Keep a clear picture of the first bar\'s speed in your head, and compare every bar with it.', he: 'שינויים קטנים קשים יותר. החזיקו בראש תמונה ברורה של המהירות של התיבה הראשונה, והשוו אליה כל תיבה.' } },
      { say: { en: 'In the exercise you hear a groove and answer what changed, or in which bar. React to the feel first, then check by counting.', he: 'בתרגיל שומעים גרוב ועונים מה השתנה, או באיזו תיבה. הגיבו קודם לתחושה, ואז בדקו בספירה.' } },
    ],
    more: [
      { say: { en: 'Three things can change under you: the tempo, the meter, or the feel. A tempo change makes every beat faster or slower. A meter change adds or removes beats in the bar. A feel change, like half time, keeps the beat but moves the groove.', he: 'שלושה דברים יכולים להשתנות מתחתיכם: הטמפו, המשקל או התחושה. שינוי טמפו הופך כל פעמה למהירה או לאיטית יותר. שינוי משקל מוסיף או מוריד פעמות בתיבה. שינוי תחושה, כמו חצי טמפו, שומר על הפעמה אבל מזיז את הגרוב.' } },
      { say: { en: 'Tempo can change suddenly or gradually. Here it slows suddenly in bar three, from 100 to 84.', he: 'טמפו יכול להשתנות בפתאומיות או בהדרגה. כאן הוא מאט פתאום בתיבה שלוש, מ־100 ל־84.' }, play: [groove(fours(4).map((i) => ({ bpm: i >= 2 ? 84 : 100, beats: 4 })))], show: { text: { en: '100 100 | 84 84', he: '100 100 | 84 84' } } },
      { say: { en: 'A gradual change is harder to catch: an accelerando creeps up bar by bar. Compare each bar with the first one, not with the bar just before it.', he: 'שינוי הדרגתי קשה יותר לתפוס: אצ׳לרנדו מתגנב תיבה אחרי תיבה. השוו כל תיבה לראשונה, לא לתיבה שרגע לפניה.' }, play: [groove([96, 102, 108, 116].map((bpm) => ({ bpm, beats: 4 })))], show: { text: { en: 'accel. ↗', he: 'אצ׳לרנדו ↗' } } },
      { say: { en: 'The best tell between tempo and meter is the hi-hat. If the space between hat notes changes, the tempo changed. If the hats stay even but the kick comes early or late, the meter changed. Here 4/4 turns into 5/4.', he: 'הסימן הכי טוב להבדיל בין טמפו למשקל הוא ההיי־הט. אם הרווח בין צלילי ההיי־הט משתנה, הטמפו השתנה. אם ההיי־הט נשאר שווה אבל הבס־דראם מגיע מוקדם או מאוחר, המשקל השתנה. כאן 4/4 הופך ל־5/4.' }, play: [groove([4, 4, 5, 5].map((beats) => ({ bpm: 110, beats })))], show: { text: { en: '4 4 | 5 5', he: '4 4 | 5 5' } } },
      { say: { en: 'A feel change keeps the beat but moves the backbeat. In half time the snare moves from two and four to three alone, and the groove suddenly feels twice as slow, though the tempo has not changed.', he: 'שינוי תחושה שומר על הפעמה אבל מזיז את הבקביט. בחצי טמפו הסנר עובר משתיים וארבע לשלוש בלבד, והגרוב פתאום מרגיש איטי פי שניים, למרות שהטמפו לא השתנה.' }, play: [kit(100, 8, [0, 2, 4], [1, 3, 6], every(8, 0.5))], show: { text: { en: '2 & 4 → 3', he: '2 ו־4 ← 3' } } },
      { say: { en: 'The common mistake is to call a meter change a tempo change, because in both the kick arrives at a surprising moment. Check the hat before you answer.', he: 'הטעות הנפוצה היא לקרוא לשינוי משקל שינוי טמפו, כי בשניהם הבס־דראם מגיע ברגע מפתיע. בדקו את ההיי־הט לפני שאתם עונים.' } },
      { say: { en: 'In real music, many progressive rock pieces switch meters, and Balkan folk music lives in meters like 7/8 and 9/8. Even in simple songs, live bands drift in tempo — noticing it early is how you stay together.', he: 'במוזיקה אמיתית, הרבה יצירות פרוגרסיב רוק מחליפות משקלים, ומוזיקה עממית בלקנית חיה במשקלים כמו 7/8 ו־9/8. גם בשירים פשוטים, להקות חיות סוטות בטמפו — לשים לב לזה מוקדם זו הדרך להישאר ביחד.' } },
      { say: { en: 'To keep: hold the first bar as your reference. Hats closer or wider means tempo; kick early or late with even hats means meter; snare moved with the same hats means feel.', he: 'מה לזכור: החזיקו את התיבה הראשונה כנקודת ייחוס. היי־הט צפוף או מרווח יותר — טמפו; בס־דראם מוקדם או מאוחר עם היי־הט שווה — משקל; סנר שזז עם אותו היי־הט — תחושה.' } },
    ],
  },
  {
    id: 'sight-tap',
    area: 'voice',
    emoji: '👋',
    title: { en: 'Sing and tap', he: 'לשיר ולהקיש' },
    takeaway: { en: 'Your hand is the conductor: it keeps the beat steady while your voice reads the notes. If the voice hesitates, the hand keeps going.', he: 'היד שלכם היא המנצח: היא שומרת על פעמה יציבה בזמן שהקול קורא את התווים. אם הקול מהסס, היד ממשיכה.' },
    steps: [
      { say: { en: 'Hi {name}! Singers in a choir read a line and keep the beat at the same time. Here we practice both: sing the notes and tap the beat.', he: 'היי {name}! זמרים במקהלה קוראים שורה ושומרים על הפעמה בו בזמן. כאן מתרגלים את שניהם: שרים את התווים ומקישים את הפעמה.' }, play: [{ kind: 'cadence', key: { letter: 'C', acc: 0 } }] },
      { say: { en: 'Look at the line: it moves by step and ends at home. One note on every tap.', he: 'הסתכלו על השורה: היא זזה בצעדים ומסתיימת בבית. צליל אחד על כל הקשה.' }, play: [line(72, [64, 62, 64, 60], [1, 1, 1, 1])], show: { notes: [64, 62, 64, 60], durs: [1, 1, 1, 1], key: 'C' } },
      { say: { en: 'A half note lasts two taps, and two eighths fit inside one tap. Keep the hand even whatever the voice does.', he: 'חצי נמשך שתי הקשות, ושתי שמיניות נכנסות בתוך הקשה אחת. שמרו על יד אחידה, לא משנה מה הקול עושה.' }, play: [line(72, [60, 62, 64, 65, 64, 62, 60], [1, 0.5, 0.5, 2, 1, 1, 2])], show: { notes: [60, 62, 64, 65, 64, 62, 60], durs: [1, 0.5, 0.5, 2, 1, 1, 2], key: 'C' } },
      { say: { en: 'Your hand is the conductor. If the voice slows down on a hard note, the hand keeps going and the voice catches up.', he: 'היד היא המנצח. אם הקול מאט על צליל קשה, היד ממשיכה והקול מדביק את הקצב.' } },
      { say: { en: 'In the exercise we grade both: the notes you sing, and how steady your taps are. Hear the key first, then start on the count.', he: 'בתרגיל בודקים את שניהם: את הצלילים שאתם שרים, ואת היציבות של ההקשות. קודם שומעים את הסולם, ואז מתחילים בספירה.' } },
    ],
    more: [
      { say: { en: 'Tapping while you sing puts the beat outside your voice. The voice is busy with pitch; the hand holds time. Conductors do the same with a baton, and choirs follow it.', he: 'להקיש בזמן ששרים מוציא את הפעמה החוצה מהקול. הקול עסוק בגובה; היד מחזיקה את הזמן. מנצחים עושים את אותו דבר עם שרביט, והמקהלה עוקבת אחריו.' }, play: [line(72, [60, 62, 64, 65, 67], [1, 1, 1, 1, 4])], show: { notes: [60, 62, 64, 65, 67], durs: [1, 1, 1, 1, 4], key: 'C' } },
      { say: { en: 'Before you sing, scan the line. Find the key and sing its home note. Look for the highest and lowest notes, the leaps, and the long notes. Ten seconds of looking saves most mistakes.', he: 'לפני שאתם שרים, סרקו את השורה. מצאו את הסולם ושירו את צליל הבית שלו. חפשו את הצליל הגבוה והנמוך ביותר, את הקפיצות ואת הצלילים הארוכים. עשר שניות של הסתכלות חוסכות את רוב הטעויות.' }, play: [{ kind: 'cadence', key: { letter: 'C', acc: 0 } }, { kind: 'note', midi: 60, duration: 1.2 }], show: { notes: [60], key: 'C', text: { en: 'home = C', he: 'בית = דו' } } },
      { say: { en: 'Match note values to taps: a whole note lasts four taps, a half two, a quarter one, and two eighths share one tap. A dotted quarter lasts a tap and a half, so the next note starts on the "and".', he: 'התאימו ערכי תווים להקשות: שלם נמשך ארבע הקשות, חצי שתיים, רבע אחת, ושתי שמיניות חולקות הקשה אחת. רבע מנוקד נמשך הקשה וחצי, אז הצליל הבא מתחיל על ה״וְ״.' }, play: [line(72, [64, 62, 60, 62, 64], [1.5, 0.5, 1, 1, 4])], show: { notes: [64, 62, 60, 62, 64], durs: [1.5, 0.5, 1, 1, 4], key: 'C', text: { en: '♩. ♪ ♩ ♩ 𝅝', he: '♩. ♪ ♩ ♩ 𝅝' } } },
      { say: { en: 'For pitch: a step is the next note of the scale. For a leap, think of the home chord, C, E, G, and hear the target in your head before you sing it.', he: 'לגבי גובה: צעד הוא הצליל הבא בסולם. בקפיצה, חשבו על אקורד הבית, דו, מי, סול, ושמעו את היעד בראש לפני שאתם שרים אותו.' }, play: [line(72, [60, 64, 67, 64, 60], [1, 1, 1, 1, 4])], show: { notes: [60, 64, 67, 64, 60], durs: [1, 1, 1, 1, 4], key: 'C', text: { en: '1 3 5 3 1', he: '1 3 5 3 1' } } },
      { say: { en: 'The common mistake: the hand starts tapping the rhythm of the notes instead of the beat, or it waits for the voice. On a half note the hand taps twice while the voice sings once. The hand never stops, not even in a rest.', he: 'הטעות הנפוצה: היד מתחילה להקיש את המקצב של התווים במקום את הפעמה, או מחכה לקול. על חצי היד מקישה פעמיים והקול שר פעם אחת. היד אף פעם לא עוצרת, גם לא בהפסקה.' }, play: [line(72, [67, 64, 60], [2, 2, 4])], show: { notes: [67, 64, 60], durs: [2, 2, 4], key: 'C' } },
      { say: { en: 'A practice order: first speak the rhythm on "ta" while tapping. Then sing the pitches slowly without rhythm. Then put both together at a slow tempo, and only then speed up.', he: 'סדר תרגול: קודם אמרו את המקצב על ״טה״ בזמן שאתם מקישים. אחר כך שירו את הגבהים לאט בלי מקצב. אחר כך חברו את שניהם בטמפו איטי, ורק אז האיצו.' } },
      { say: { en: 'In real music, choir singers, session singers and music students do this daily. Solfège systems and the Kodály method pair singing with movement for the same reason: the body keeps time so the voice can read.', he: 'במוזיקה אמיתית, זמרי מקהלה, זמרי אולפן וסטודנטים למוזיקה עושים את זה כל יום. שיטות סולפג׳ ושיטת קודאי משלבות שירה עם תנועה מאותה סיבה: הגוף שומר על הזמן כדי שהקול יוכל לקרוא.' } },
      { say: { en: 'To keep: scan first, find home, and let the hand lead. Tap the beat, not the notes, and let the voice fit its notes onto the taps.', he: 'מה לזכור: סרקו קודם, מצאו את הבית, ותנו ליד להוביל. הקישו את הפעמה, לא את התווים, ותנו לקול להתאים את הצלילים שלו להקשות.' } },
    ],
  },
];

/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = Object.fromEntries(LESSONS.map((l) => [`topic:${l.id}`, l.id]));

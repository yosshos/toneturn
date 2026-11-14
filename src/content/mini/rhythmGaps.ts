// Quick lessons for the rhythm gaps (docs/AUDIT-CONTENT-THEORY.md §ז.2 R-1…R-5): cross-rhythm over the bar (5:4, 5:3,
// 7:4), metric modulation tapped, the hemiola performed, odd groupings and displacement. Plain words, sound first.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const clk = (t: number, accent: boolean): NoteEvent => ({ midi: 96, start: t, duration: 0.04, velocity: accent ? 0.5 : 0.3, perc: accent ? 'accent' : 'click' });
const hi = (t: number, v = 0.7): NoteEvent => ({ midi: 84, start: t, duration: 0.05, velocity: v, perc: 'snare-soft' });
const lo = (t: number, v = 0.85): NoteEvent => ({ midi: 45, start: t, duration: 0.12, velocity: v, perc: 'kick' });

/** `n` high notes against `over` low ones per bar of `bar` seconds, `bars` times. */
function cross(n: number, over: number, bar: number, bars: number): Stimulus {
  const out: NoteEvent[] = [];
  for (let b = 0; b < bars; b++) {
    for (let i = 0; i < n; i++) out.push(hi(b * bar + (i * bar) / n, i ? 0.55 : 0.8));
    for (let i = 0; i < over; i++) out.push(lo(b * bar + (i * bar) / over, i ? 0.7 : 0.9));
  }
  return ev(out, bar * bars + 0.3);
}
/** Clicks every `step` beats (accent every `acc` clicks) and hits at beat positions, at `bpm`. */
function grid(bpm: number, beats: number, hits: number[], step = 1, acc = 4): Stimulus {
  const b = 60 / bpm;
  const out: NoteEvent[] = [];
  for (let k = 0; k * step < beats - 1e-9; k++) out.push(clk(k * step * b, k % acc === 0));
  for (const h of hits) out.push(hi(h * b, 0.8));
  return ev(out, beats * b + 0.3);
}
/** Clicks on the old beat up to `at`, then every `every` beats; hits at the given beats (the hands that stay). */
function modulate(bpm: number, beats: number, at: number, every: number, hits: number[]): Stimulus {
  const b = 60 / bpm;
  const out: NoteEvent[] = [];
  for (let k = 0; k < at; k++) out.push(clk(k * b, k % 4 === 0));
  for (let k = 0; at + k * every < beats - 1e-9; k++) out.push(clk((at + k * every) * b, k % 4 === 0));
  for (const h of hits) out.push(hi(h * b, 0.6));
  return ev(out, beats * b + 0.3);
}
const every = (beats: number, step: number) => Array.from({ length: Math.round(beats / step) }, (_, i) => i * step);

export const LESSONS: MiniLesson[] = [
  {
    id: 'cross-rhythm',
    area: 'rhythm',
    emoji: '♩',
    title: { en: 'Cross-rhythms over the bar', he: 'פולי־ריתמוס על פני התיבה' },
    takeaway: { en: 'Keep the beat in one hand; spread the other hand evenly over the whole bar. They meet only on 1.', he: 'שמרו את הפעמה ביד אחת; פרשו את היד השנייה באופן שווה על פני כל התיבה. הן נפגשות רק על 1.' },
    steps: [
      { say: { en: 'Hi {name}! Until now the two hands split each beat between them. Now one hand spreads its notes over the whole bar. Listen: five high notes over four low beats.', he: 'היי {name}! עד עכשיו שתי הידיים חילקו ביניהן כל פעמה. עכשיו יד אחת פורשת את הצלילים שלה על פני כל התיבה. הקשיבו: חמישה צלילים גבוהים מעל ארבע פעמות נמוכות.' }, play: [cross(5, 4, 3.2, 3)], show: { text: { en: '5 : 4', he: '5 : 4' } } },
      { say: { en: 'Five against three, in 3/4: the same idea in a shorter bar, so the notes sit closer together.', he: 'חמש נגד שלוש, ב־3/4: אותו רעיון בתיבה קצרה יותר, ולכן הצלילים צפופים יותר.' }, play: [cross(5, 3, 2.4, 3)], show: { text: { en: '5 : 3', he: '5 : 3' } } },
      { say: { en: 'Seven against four: seven even notes in the time of one bar. Only the first note of each bar meets the beat.', he: 'שבע נגד ארבע: שבעה צלילים שווים בזמן של תיבה אחת. רק הצליל הראשון בכל תיבה נפגש עם הפעמה.' }, play: [cross(7, 4, 3.6, 3)], show: { text: { en: '7 : 4', he: '7 : 4' } } },
      { say: { en: 'Do not count the fast part note by note. Feel the bar as one long circle and spread the notes evenly around it.', he: 'אל תספרו את החלק המהיר צליל אחר צליל. הרגישו את התיבה כמעגל ארוך אחד ופרשו את הצלילים באופן שווה סביבו.' } },
      { say: { en: 'In the exercise the click keeps the beat with your slow hand. Start slowly, and listen for the one place each bar where both hands meet.', he: 'בתרגיל הקליק שומר את הפעמה יחד עם היד האיטית. התחילו לאט, והקשיבו למקום האחד בכל תיבה שבו שתי הידיים נפגשות.' } },
    ],
    more: [
      { say: { en: 'Five against four lives on a grid of twenty. The five-part plays on every fourth step; the beat on every fifth. Only the first step is shared.', he: 'חמש נגד ארבע חי על רשת של עשרים. החלק של החמש מנגן כל צעד רביעי; הפעמה כל צעד חמישי. רק הצעד הראשון משותף.' }, play: [cross(5, 4, 4, 2)], show: { text: { en: '20 = 5 × 4', he: '20 = 5 × 4' } } },
      { say: { en: 'Seven against four lives on a grid of twenty-eight, which is too fine to count. Here the long circle is the only way: hear the seven as one smooth wave across the bar.', he: 'שבע נגד ארבע חי על רשת של עשרים ושמונה, צפופה מדי לספירה. כאן המעגל הארוך הוא הדרך היחידה: שמעו את השבע כגל חלק אחד על פני התיבה.' }, play: [cross(7, 4, 4.2, 2)] },
      { say: { en: 'Practise it in layers: each hand alone against the click, then the two together very slowly, then let the beat hand run by itself while you listen to the other.', he: 'תרגלו בשכבות: כל יד לבד מול הקליק, אחר כך שתיהן יחד לאט מאוד, ואז תנו ליד של הפעמה לרוץ לבד בזמן שאתם מקשיבים לשנייה.' } },
      { say: { en: 'The common mistake: the fast hand bunches up near the beats and waits in between. Its notes must stay exactly evenly spaced, even where no beat helps them.', he: 'הטעות הנפוצה: היד המהירה מתקבצת ליד הפעמות ומחכה ביניהן. הצלילים שלה חייבים להישאר במרווחים שווים בדיוק, גם במקום שאין פעמה שעוזרת להם.' } },
      { say: { en: 'You hear these in jazz solos that float over the bar line, in Chopin and Scriabin, and in prog drumming, where a ride pattern in five sits over a groove in four.', he: 'שומעים את זה בסולואים של ג׳אז שמרחפים מעל קו התיבה, אצל שופן וסקריאבין, ובתיפוף פרוג, שבו דפוס רייד בחמש יושב מעל גרוב בארבע.' }, play: [cross(5, 4, 3.2, 2)] },
      { say: { en: 'To keep: one hand on the beat, the other evenly over the whole bar; they meet on 1. Feel the circle, not the count.', he: 'מה לזכור: יד אחת על הפעמה, השנייה באופן שווה על פני כל התיבה; הן נפגשות על 1. הרגישו את המעגל, לא את הספירה.' } },
    ],
  },
  {
    id: 'metric-tap',
    area: 'rhythm',
    emoji: '♩',
    title: { en: 'Metric modulation', he: 'מודולציה מטרית' },
    takeaway: { en: 'A note value you are already playing becomes the new beat: the hands keep going, the beat changes under them.', he: 'ערך תו שכבר מנגנים הופך לפעמה החדשה: הידיים ממשיכות, הפעמה משתנה מתחתיהן.' },
    steps: [
      { say: { en: 'Hi {name}! Metric modulation changes the tempo without a jolt. Listen: quarter notes, then quarter triplets, and the triplet becomes the new beat.', he: 'היי {name}! מודולציה מטרית משנה את הטמפו בלי קפיצה. הקשיבו: רבעים, אחר כך טריולות רבעים, והטריולה הופכת לפעמה החדשה.' }, play: [modulate(80, 16, 8, 2 / 3, [...every(8, 1), ...every(8, 2 / 3).map((x) => 8 + x)])], show: { text: { en: '♩³ = ♩ · × 3/2', he: '♩³ = ♩ · × 3/2' } } },
      { say: { en: 'Here the hands stay the same: even triplets all the way. Only the click moves, and two triplets now make one beat.', he: 'כאן הידיים לא משתנות: טריולות שוות כל הזמן. רק הקליק זז, ושתי טריולות הן עכשיו פעמה אחת.' }, play: [modulate(72, 16, 8, 2 / 3, every(16, 1 / 3))] },
      { say: { en: 'It also works the other way. Even eighths stay, and the click slows down: three of them now make one beat.', he: 'זה עובד גם בכיוון ההפוך. השמיניות השוות נשארות, והקליק מאט: שלוש מהן הן עכשיו פעמה אחת.' }, play: [modulate(88, 16, 8, 3 / 2, every(16, 1 / 2))] },
      { say: { en: 'The secret is that nothing in your hands has to change. The new beat was already hiding inside the old rhythm.', he: 'הסוד הוא שבידיים שום דבר לא צריך להשתנות. הפעמה החדשה כבר הסתתרה בתוך המקצב הישן.' } },
      { say: { en: 'In the exercise, keep your taps even through the change and let the new click settle in before you judge it.', he: 'בתרגיל, שמרו על הקשות שוות דרך השינוי ותנו לקליק החדש להתיישב לפני שאתם שופטים אותו.' } },
    ],
    more: [
      { say: { en: 'Work out the new tempo by the ratio. Triplet quarter to quarter: times three halves, so 80 becomes 120. Dotted eighth to quarter: times four thirds, so 90 becomes 120.', he: 'חשבו את הטמפו החדש לפי היחס. רבע טריולה לרבע: פי שלוש חלקי שתיים, כך ש־80 הופך ל־120. שמינית מנוקדת לרבע: פי ארבע חלקי שלוש, כך ש־90 הופך ל־120.' }, show: { text: { en: '80 × 3/2 = 120 · 90 × 4/3 = 120', he: '80 × 3/2 = 120 · 90 × 4/3 = 120' } } },
      { say: { en: 'The dotted eighth is the trickiest pivot. Group sixteenths in threes inside the old tempo, and each group of three becomes the new beat.', he: 'השמינית המנוקדת היא הציר המסובך ביותר. קבצו שש־עשריות בשלשות בתוך הטמפו הישן, וכל קבוצה של שלוש הופכת לפעמה החדשה.' }, play: [modulate(72, 16, 8, 3 / 4, every(16, 1 / 4))] },
      { say: { en: 'The trick is to hear the pivot value before the change. Feel it inside the old tempo for a bar, then let it become the beat.', he: 'הטריק הוא לשמוע את ערך הציר לפני השינוי. הרגישו אותו בתוך הטמפו הישן תיבה אחת, ואז תנו לו להפוך לפעמה.' } },
      { say: { en: 'The common mistake is to guess the new tempo instead of deriving it. Your taps rush or drag at the change. Keep them exactly even and the new tempo arrives by itself.', he: 'הטעות הנפוצה היא לנחש את הטמפו החדש במקום לגזור אותו. ההקשות ממהרות או נגררות בשינוי. שמרו עליהן שוות בדיוק והטמפו החדש מגיע מעצמו.' } },
      { say: { en: 'Drummers like Tony Williams and bands in prog and fusion use metric modulation to shift a whole band into a new tempo without stopping.', he: 'מתופפים כמו טוני וויליאמס ולהקות פרוג ופיוז׳ן משתמשים במודולציה מטרית כדי להעביר להקה שלמה לטמפו חדש בלי לעצור.' }, play: [modulate(80, 16, 8, 2 / 3, every(16, 1 / 3))] },
      { say: { en: 'To keep: the old note value equals the new beat. Keep the hands even; the beat changes under them.', he: 'מה לזכור: ערך התו הישן שווה לפעמה החדשה. שמרו על ידיים שוות; הפעמה משתנה מתחתיהן.' } },
    ],
  },
  {
    id: 'hemiola-tap',
    area: 'rhythm',
    emoji: '♩',
    title: { en: 'The hemiola, played', he: 'ההמיולה בביצוע' },
    takeaway: { en: 'Two bars of 3 felt as three big 2s: the accents cross the bar line, the bar line itself stays.', he: 'שתי תיבות של 3 שמורגשות כשלוש שתיים גדולות: ההדגשות חוצות את קו התיבה, וקו התיבה עצמו נשאר.' },
    steps: [
      { say: { en: 'Hi {name}! In 3/4 we feel one, two, three. Listen: two bars on the beat, then the same two bars in big twos. That is the hemiola.', he: 'היי {name}! ב־3/4 מרגישים אחת, שתיים, שלוש. הקשיבו: שתי תיבות על הפעמה, ואז אותן שתי תיבות בשתיים גדולות. זו ההמיולה.' }, play: [grid(100, 12, [0, 1, 2, 3, 4, 5, 6, 8, 10], 1, 3)], show: { text: { en: '123 123 · 1 2 3', he: '123 123 · 1 2 3' } } },
      { say: { en: 'Both at once: the beat below, three big notes above, over two bars. That is three against two, stretched across the bar line.', he: 'שתיהן יחד: הפעמה למטה, שלושה צלילים גדולים למעלה, על פני שתי תיבות. זה שלוש נגד שתיים, מתוח מעבר לקו התיבה.' }, play: [cross(3, 6, 3.6, 2)] },
      { say: { en: 'And over 4/4: eighths grouped three, three, two. It pulls across the bar and lands home on one.', he: 'ומעל 4/4: שמיניות בקבוצות של שלוש, שלוש, שתיים. זה מושך מעבר לתיבה ונוחת הביתה על אחת.' }, play: [grid(84, 8, [0, 1.5, 3, 4.5, 6, 7])], show: { text: { en: '3+3+2', he: '3+3+2' } } },
      { say: { en: 'There is also the bar that changes its mind: one bar in two big beats, like 6/8, then one in three, like 3/4.', he: 'יש גם תיבה שמשנה את דעתה: תיבה אחת בשתי פעמות גדולות, כמו 6/8, ואחריה תיבה בשלוש, כמו 3/4.' }, play: [grid(104, 12, [0, 1.5, 3, 4, 5, 6, 7.5, 9, 10, 11], 1, 3)] },
      { say: { en: 'In the exercise, keep the bar line in your body while your hands play across it, and land exactly on the next one.', he: 'בתרגיל, שמרו את קו התיבה בגוף בזמן שהידיים מנגנות מעבר לו, ונחתו בדיוק על האחת הבאה.' } },
    ],
    more: [
      { say: { en: 'The word comes from Greek for one and a half: three half notes take the place of two dotted halves. The total time stays the same; only the grouping changes.', he: 'המילה באה מיוונית ופירושה אחד וחצי: שלושה חצאים תופסים את המקום של שני חצאים מנוקדים. הזמן הכולל נשאר זהה; רק הקיבוץ משתנה.' }, show: { text: { en: '3 × 2 = 2 × 3', he: '3 × 2 = 2 × 3' } } },
      { say: { en: 'Baroque and classical cadences use the hemiola to broaden the last bars before the final chord. Listen for it at the ends of minuets and courantes.', he: 'קדנצות בארוק וקלאסיות משתמשות בהמיולה כדי להרחיב את התיבות האחרונות לפני האקורד הסופי. הקשיבו לה בסופי מינואטים וקורנטים.' }, play: [grid(96, 12, [0, 1, 2, 3, 4, 5, 6, 8, 10], 1, 3)] },
      { say: { en: 'In jazz, Latin and pop, three, three, two is everywhere: the tresillo, the Charleston, countless riffs. It is the same idea inside one bar of four.', he: 'בג׳אז, במוזיקה לטינית ובפופ, שלוש, שלוש, שתיים נמצא בכל מקום: הטרסיו, הצ׳רלסטון, אינספור ריפים. זה אותו רעיון בתוך תיבה אחת של ארבע.' }, play: [grid(96, 8, [0, 1.5, 3, 4, 5.5, 7])] },
      { say: { en: 'The common mistake is to let the bar line move with the accents, so the music suddenly sounds like it is in 2/4. Keep counting the bar quietly.', he: 'הטעות הנפוצה היא לתת לקו התיבה לזוז עם ההדגשות, כך שהמוזיקה פתאום נשמעת כאילו היא ב־2/4. המשיכו לספור את התיבה בשקט.' } },
      { say: { en: 'Practise by tapping the beat with your foot and the big twos with your hand. When that is easy, swap: hand on the beat, foot in twos.', he: 'תרגלו כך: הרגל מקישה את הפעמה והיד את השתיים הגדולות. כשזה קל, החליפו: היד על הפעמה, הרגל בשתיים.' } },
      { say: { en: 'To keep: the accents move, the bar line stays. Count the bar quietly while you play the big twos.', he: 'מה לזכור: ההדגשות זזות, קו התיבה נשאר. ספרו את התיבה בשקט בזמן שמנגנים את השתיים הגדולות.' } },
    ],
  },
  {
    id: 'odd-groupings',
    area: 'rhythm',
    emoji: '♩',
    title: { en: 'Odd meters and displacement', he: 'משקלים אי־זוגיים והזזה' },
    takeaway: { en: 'Count odd meters in groups of 2 and 3; a displaced figure keeps its shape and moves against the beat.', he: 'ספרו משקלים אי־זוגיים בקבוצות של 2 ו־3; דמות מוזזת שומרת על הצורה שלה וזזה מול הפעמה.' },
    steps: [
      { say: { en: 'Hi {name}! 5/4 is not five equal counts: it is a three and a two. Listen to the hit at the start of each group.', he: 'היי {name}! 5/4 הוא לא חמש ספירות שוות: הוא שלוש ועוד שתיים. הקשיבו למכה בתחילת כל קבוצה.' }, play: [grid(132, 10, [0, 3, 5, 8], 1, 5)], show: { text: { en: '5/4 = 3+2', he: '5/4 = 3+2' } } },
      { say: { en: '7/8 is two, two, three: short, short, long. Say it with me: doo-ba, doo-ba, doo-ba-da.', he: '7/8 הוא שתיים, שתיים, שלוש: קצר, קצר, ארוך. אמרו איתי: דו־בה, דו־בה, דו־בה־דה.' }, play: [grid(200, 14, [0, 2, 4, 7, 9, 11], 1, 7)], show: { text: { en: '7/8 = 2+2+3', he: '7/8 = 2+2+3' } } },
      { say: { en: 'The same seven can also be three, two, two. The long group comes first, and the whole bar leans differently.', he: 'אותו שבע יכול להיות גם שלוש, שתיים, שתיים. הקבוצה הארוכה באה ראשונה, וכל התיבה נוטה אחרת.' }, play: [grid(200, 14, [0, 3, 5, 7, 10, 12], 1, 7)], show: { text: { en: '7/8 = 3+2+2', he: '7/8 = 3+2+2' } } },
      { say: { en: 'Displacement moves a figure but keeps its shape. Here a riff starts on one, then the same riff an eighth later.', he: 'הזזה מזיזה דמות אבל שומרת על הצורה שלה. כאן ריף מתחיל על אחת, ואז אותו ריף שמינית מאוחר יותר.' }, play: [grid(84, 8, [0, 1.5, 3, 4.5, 6, 7.5])] },
      { say: { en: 'Keep the click as your anchor in the exercise: feel where each group starts, and the odd bar soon feels natural.', he: 'השתמשו בקליק כעוגן בתרגיל: הרגישו איפה כל קבוצה מתחילה, והתיבה האי־זוגית תרגיש טבעית מהר.' } },
    ],
    more: [
      { say: { en: 'Every odd meter breaks into twos and threes. Nine eighths can be three threes or two, two, two, three; eleven is often three, three, three, two.', he: 'כל משקל אי־זוגי מתפרק לשתיים ושלוש. תשע שמיניות יכולות להיות שלוש שלשות או שתיים, שתיים, שתיים, שלוש; אחת־עשרה היא הרבה פעמים שלוש, שלוש, שלוש, שתיים.' }, show: { text: { en: '9 = 2+2+2+3 · 11 = 3+3+3+2', he: '9 = 2+2+2+3 · 11 = 3+3+3+2' } } },
      { say: { en: 'Balkan dances, Turkish aksak rhythms and prog rock live in these meters. Dave Brubeck brought 5/4 and 9/8 into jazz, and Mizrahi music knows 7/8 well.', he: 'ריקודים בלקניים, מקצבי אקסאק טורקיים ופרוג רוק חיים במשקלים האלה. דייב ברובק הכניס את 5/4 ואת 9/8 לג׳אז, והמוזיקה המזרחית מכירה היטב את 7/8.' }, play: [grid(220, 18, [0, 2, 4, 6, 9, 11, 13, 15], 1, 9)] },
      { say: { en: 'Displacement is how jazz and funk players make a simple figure exciting: the same notes, shifted by an eighth or a quarter, land on new parts of the beat.', he: 'הזזה היא הדרך שבה נגני ג׳אז ופאנק הופכים דמות פשוטה למרגשת: אותם צלילים, מוזזים בשמינית או ברבע, נוחתים על חלקים חדשים של הפעמה.' }, play: [grid(84, 8, [0, 1.5, 3, 5, 6.5])] },
      { say: { en: 'The common mistake in odd meters is stretching the long group or squeezing the short ones. Every eighth stays the same length; only the grouping changes.', he: 'הטעות הנפוצה במשקלים אי־זוגיים היא למתוח את הקבוצה הארוכה או לדחוס את הקצרות. כל שמינית נשארת באותו אורך; רק הקיבוץ משתנה.' } },
      { say: { en: 'Practise by speaking the syllables over a slow click, then clapping only the group starts, then playing the figure on your instrument. Speed always comes last.', he: 'תרגלו כך: אמרו את ההברות מעל קליק איטי, אחר כך מחאו כפיים רק בתחילת כל קבוצה, ורק אז נגנו את הדמות בכלי. מהירות תמיד באה בסוף.' } },
      { say: { en: 'To keep: odd meters are groups of two and three. Know the grouping before you play; a displaced figure keeps its shape.', he: 'מה לזכור: משקלים אי־זוגיים הם קבוצות של שתיים ושלוש. דעו את החלוקה לפני שמנגנים; דמות מוזזת שומרת על הצורה שלה.' } },
    ],
  },
];

/** Unit id → mini-lesson id ("topic:<id>", "tech:<family>" = the family's first step, "tech:<level id>"). */
export const UNITS: Record<string, string> = {
  'topic:metric-tap': 'metric-tap',
  'topic:hemiola-tap': 'hemiola-tap',
  'tech:k-rhythm': 'cross-rhythm',
  'tech:k-rhythm-3': 'hemiola-tap',
  'tech:k-rhythm-4': 'odd-groupings',
  'tech:k-rhythm-7': 'metric-tap',
  'tech:g-meter': 'odd-groupings',
  'tech:g-meter-2': 'hemiola-tap',
  'tech:g-meter-5': 'cross-rhythm',
  'tech:g-meter-6': 'metric-tap',
  'tech:d-prog-11': 'cross-rhythm',
  'tech:b-time-11': 'hemiola-tap',
  'tech:b-time-13': 'cross-rhythm',
};

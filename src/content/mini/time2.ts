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
  },
  {
    id: 'sight-tap',
    area: 'voice',
    emoji: '👋',
    title: { en: 'Sing and tap', he: 'לשיר ולהקיש' },
    takeaway: { en: 'Your hand is the conductor: it keeps the beat steady while your voice reads the notes. If the voice hesitates, the hand keeps going.', he: 'היד שלכם היא המנצח: היא שומרת על פעמה יציבה בזמן שהקול קורא את התווים. אם הקול מהסס, היד ממשיכה.' },
    steps: [
      { say: { en: 'Hi {name}! Singers in a choir read a line and keep the beat at the same time. Here we practise both: sing the notes and tap the beat.', he: 'היי {name}! זמרים במקהלה קוראים שורה ושומרים על הפעמה בו בזמן. כאן מתרגלים את שניהם: שרים את התווים ומקישים את הפעמה.' }, play: [{ kind: 'cadence', key: { letter: 'C', acc: 0 } }] },
      { say: { en: 'Look at the line: it moves by step and ends at home. One note on every tap.', he: 'הסתכלו על השורה: היא זזה בצעדים ומסתיימת בבית. צליל אחד על כל הקשה.' }, play: [line(72, [64, 62, 64, 60], [1, 1, 1, 1])], show: { notes: [64, 62, 64, 60], durs: [1, 1, 1, 1], key: 'C' } },
      { say: { en: 'A half note lasts two taps, and two eighths fit inside one tap. Keep the hand even whatever the voice does.', he: 'חצי נמשך שתי הקשות, ושתי שמיניות נכנסות בתוך הקשה אחת. שמרו על יד אחידה, לא משנה מה הקול עושה.' }, play: [line(72, [60, 62, 64, 65, 64, 62, 60], [1, 0.5, 0.5, 2, 1, 1, 2])], show: { notes: [60, 62, 64, 65, 64, 62, 60], durs: [1, 0.5, 0.5, 2, 1, 1, 2], key: 'C' } },
      { say: { en: 'Your hand is the conductor. If the voice slows down on a hard note, the hand keeps going and the voice catches up.', he: 'היד היא המנצח. אם הקול מאט על צליל קשה, היד ממשיכה והקול מדביק את הקצב.' } },
      { say: { en: 'In the exercise we grade both: the notes you sing, and how steady your taps are. Hear the key first, then start on the count.', he: 'בתרגיל בודקים את שניהם: את הצלילים שאתם שרים, ואת היציבות של ההקשות. קודם שומעים את הסולם, ואז מתחילים בספירה.' } },
    ],
  },
];

/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = Object.fromEntries(LESSONS.map((l) => [`topic:${l.id}`, l.id]));

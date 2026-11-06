// Quick lessons for the ear basics and transposition: background from zero, plain words, sound first.
// Every term is explained the first time it appears ("pitch = how high or low a note is").

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
function clicks(times: number[]): Stimulus {
  const events: NoteEvent[] = times.map((t, i) => ({ midi: i % 4 === 0 ? 96 : 86, start: t, duration: 0.05, velocity: i % 4 === 0 ? 0.65 : 0.45 }));
  return { kind: 'events', events, length: times[times.length - 1] + 0.3 };
}
const even = (bpm: number, n: number) => Array.from({ length: n }, (_, i) => (i * 60) / bpm);

export const LESSONS: MiniLesson[] = [
  {
    id: 'basics-pitch',
    area: 'ear',
    emoji: '⬆️',
    title: { en: 'High and low', he: 'גבוה ונמוך' },
    takeaway: { en: 'Pitch means how high or low a note sounds. Comparing two notes — higher, lower, the same — is where every musical ear starts.', he: 'גובה צליל זה כמה הצליל נשמע גבוה או נמוך. להשוות בין שני צלילים — גבוה יותר, נמוך יותר, אותו דבר — משם מתחילה כל אוזן מוזיקלית.' },
    steps: [
      {
        say: { en: "Hi {name}! Let's start at the very beginning. Every note has a pitch — how high or low it sounds. A bird is high, a big drum is low.", he: 'היי {name}! מתחילים מההתחלה ממש. לכל צליל יש גובה — כמה הוא נשמע גבוה או נמוך. ציפור זה גבוה, תוף גדול זה נמוך.' },
        play: [notes([72], 0.9), rest(0.4), notes([48], 0.9)],
        show: { text: { en: 'high · low', he: 'גבוה · נמוך' } },
      },
      {
        say: { en: 'Now two notes. The second one goes up — it is higher. Listen once more and feel your ears "lift".', he: 'עכשיו שני צלילים. השני עולה — הוא גבוה יותר. הקשיבו שוב ותרגישו איך האוזניים "מתרוממות".' },
        play: [notes([60, 67], 0.8), rest(0.5), notes([60, 67], 0.8)],
        show: { notes: [60, 67], text: { en: 'higher ⬆', he: 'גבוה יותר ⬆' } },
      },
      {
        say: { en: 'And this time it goes down — lower. Big jumps are easy; small steps take a little practice. That is what we train.', he: 'והפעם הוא יורד — נמוך יותר. קפיצות גדולות קלות; צעדים קטנים דורשים קצת תרגול. את זה נאמן.' },
        play: [notes([67, 60], 0.8), rest(0.5), notes([64, 62], 0.8)],
        show: { notes: [67, 60], text: { en: 'lower ⬇', he: 'נמוך יותר ⬇' } },
      },
      {
        say: { en: 'Two short tunes can be the same or different. Here, one note changed in the second tune. Did you catch it?', he: 'שתי מנגינות קצרות יכולות להיות זהות או שונות. כאן צליל אחד השתנה במנגינה השנייה. תפסתם?' },
        play: [notes([60, 64, 67], 0.45), rest(0.7), notes([60, 65, 67], 0.45)],
        show: { text: { en: 'same? different?', he: 'אותו דבר? שונה?' } },
      },
      {
        say: { en: 'Your turn! Higher or lower, then same or different. No words to learn — just listen. Your ears already know more than you think.', he: 'תורכם! גבוה או נמוך, ואחר כך אותו דבר או שונה. אין מילים ללמוד — רק להקשיב. האוזניים שלכם כבר יודעות יותר ממה שאתם חושבים.' },
        show: { text: { en: '⬆ ⬇ =', he: '⬆ ⬇ =' } },
      },
    ],
  },
  {
    id: 'basics-shape',
    area: 'ear',
    emoji: '〰️',
    title: { en: 'The shape of a tune', he: 'הצורה של מנגינה' },
    takeaway: { en: 'A melody is a line of notes, one after another. Before any names, hear its shape: up, down, a hill or a valley.', he: 'מנגינה היא שורה של צלילים, אחד אחרי השני. עוד לפני שמות, שומעים את הצורה שלה: עולה, יורדת, גבעה או עמק.' },
    steps: [
      {
        say: { en: 'Hey {name}! A melody is just notes one after another — like a line you could draw. This one climbs up, like stairs.', he: 'היי {name}! מנגינה היא פשוט צלילים אחד אחרי השני — כמו קו שאפשר לצייר. המנגינה הזאת מטפסת למעלה, כמו מדרגות.' },
        play: [notes([60, 62, 64, 65, 67], 0.4)],
        show: { notes: [60, 62, 64, 65, 67], text: { en: 'up ↗', he: 'עולה ↗' } },
      },
      {
        say: { en: 'This one goes down the stairs.', he: 'והזאת יורדת במדרגות.' },
        play: [notes([67, 65, 64, 62, 60], 0.4)],
        show: { notes: [67, 65, 64, 62, 60], text: { en: 'down ↘', he: 'יורדת ↘' } },
      },
      {
        say: { en: 'And many tunes are a hill — up, then down — or a valley — down, then up. Try drawing it in the air as you listen.', he: 'והרבה מנגינות הן גבעה — עולות ואז יורדות — או עמק — יורדות ואז עולות. נסו לצייר אותן באוויר תוך כדי הקשבה.' },
        play: [notes([60, 64, 67, 64, 60], 0.4), rest(0.6), notes([67, 64, 60, 64, 67], 0.4)],
        show: { text: { en: 'hill ⌒ · valley ⌣', he: 'גבעה ⌒ · עמק ⌣' } },
      },
      {
        say: { en: 'Notice how the shape tells a story: going up builds energy, coming down relaxes. Composers use it on purpose, and you will hear it in almost every song you already love.', he: 'שימו לב איך הצורה מספרת סיפור: עלייה בונה אנרגיה, ירידה מרגיעה. מלחינים משתמשים בזה בכוונה, ותשמעו את זה כמעט בכל שיר שאתם כבר אוהבים.' },
        play: [notes([60, 62, 64, 67, 69, 72], 0.35), rest(0.5), notes([72, 69, 67, 64, 62, 60], 0.45)],
        show: { text: { en: 'energy ↗ · calm ↘', he: 'אנרגיה ↗ · רוגע ↘' } },
      },
      {
        say: { en: 'Your turn! Which way does each tune go? Draw it with a finger if it helps — musicians do it too.', he: 'תורכם! לאן הולכת כל מנגינה? ציירו עם האצבע אם זה עוזר — גם מוזיקאים עושים את זה.' },
        show: { text: { en: '↗ ↘ ⌒ ⌣', he: '↗ ↘ ⌒ ⌣' } },
      },
    ],
  },
  {
    id: 'basics-beat',
    area: 'rhythm',
    emoji: '💓',
    title: { en: 'Feel the beat', he: 'להרגיש את הפעמה' },
    takeaway: { en: 'The beat is the steady pulse under the music — what you tap your foot to. Tempo is how fast that beat goes.', he: 'הפעמה היא הדופק היציב מתחת למוזיקה — מה שמקישים לו ברגל. טמפו זה כמה מהר הפעמה הזאת.' },
    steps: [
      {
        say: { en: 'Hi {name}! Under almost every song there is a beat — a steady pulse, like a heartbeat. It is what your foot taps to.', he: 'היי {name}! מתחת כמעט לכל שיר יש פעמה — דופק יציב, כמו דופק של לב. לזה הרגל שלכם מקישה.' },
        play: [clicks(even(96, 8))],
        show: { text: { en: '♩ ♩ ♩ ♩', he: '♩ ♩ ♩ ♩' } },
      },
      {
        say: { en: 'A good beat is steady — every click the same distance apart. This one wobbles: some come early, some late. Feel the difference?', he: 'פעמה טובה היא יציבה — כל קליק באותו מרחק מהקודם. הזאת מתנדנדת: חלק מגיעים מוקדם, חלק מאוחר. מרגישים את ההבדל?' },
        play: [clicks([0, 0.62, 1.18, 1.95, 2.45, 3.2, 3.7, 4.45])],
        show: { text: { en: '♩ ♩♩ ♩ ♩♩', he: '♩ ♩♩ ♩ ♩♩' } },
      },
      {
        say: { en: 'How fast the beat goes is called the tempo. Here is a slow one, then a fast one.', he: 'כמה מהר הפעמה הולכת — זה נקרא טמפו. הנה אחת איטית, ואחר כך אחת מהירה.' },
        play: [clicks(even(70, 5)), rest(0.6), clicks(even(130, 8))],
        show: { text: { en: 'slow · fast', he: 'איטי · מהיר' } },
      },
      {
        say: { en: 'Musicians count the beat: one, two, three, four — and the first of each group feels a little stronger. Count along with this one.', he: 'מוזיקאים סופרים את הפעמה: אחת, שתיים, שלוש, ארבע — והראשונה בכל קבוצה מרגישה קצת חזקה יותר. ספרו יחד עם זו.' },
        play: [clicks(even(100, 8))],
        show: { text: { en: '1 2 3 4 · 1 2 3 4', he: '1 2 3 4 · 1 2 3 4' } },
      },
      {
        say: { en: 'Your turn! Is the beat steady or wobbly, faster or slower? Tap along on your knee — it makes it much easier.', he: 'תורכם! הפעמה יציבה או מתנדנדת, מהירה או איטית? הקישו יחד על הברך — זה עושה את זה הרבה יותר קל.' },
        show: { text: { en: 'steady? faster?', he: 'יציבה? מהירה?' } },
      },
    ],
  },
  {
    id: 'basics-voice',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'Match a note', he: 'להתאים צליל' },
    takeaway: { en: 'Matching means singing the very same pitch you hear. Start from a hum, slide gently until it feels "locked in".', he: 'להתאים זה לשיר בדיוק את אותו גובה שאתם שומעים. מתחילים בזמזום, מחליקים בעדינות עד שזה מרגיש "נעול".' },
    steps: [
      {
        say: { en: 'Hey {name}! Everyone can sing a little — even if you think you can’t. We start simple: hear a note, and hum it back.', he: 'היי {name}! כל אחד יכול לשיר קצת — גם אם אתם חושבים שלא. מתחילים פשוט: שומעים צליל, ומזמזמים אותו בחזרה.' },
        play: [notes([60], 1.4)],
        show: { notes: [60], text: { en: 'hmmm', he: 'מממ' } },
      },
      {
        say: { en: 'When you match, the two sounds blend into one — it feels calm. When you are off, you hear a little wobble, a "wah-wah". Slide slowly until it disappears.', he: 'כשמתאימים, שני הצלילים מתמזגים לאחד — זה מרגיש רגוע. כשלא, שומעים רעד קטן, "וואו-וואו". מחליקים לאט עד שהוא נעלם.' },
        play: [{ kind: 'chord', midis: [60, 60.4], duration: 1.6 }, rest(0.4), { kind: 'chord', midis: [60, 60], duration: 1.6 }],
        show: { text: { en: 'wobble → calm', he: 'רעד → רוגע' } },
      },
      {
        say: { en: 'Your voice has its own comfortable zone. If a note feels too high or too low, sing it an octave up or down — it still counts.', he: 'לקול שלכם יש אזור נוח משלו. אם צליל מרגיש גבוה מדי או נמוך מדי, שירו אותו אוקטבה למעלה או למטה — זה עדיין נחשב.' },
        play: [notes([55], 1), rest(0.3), notes([67], 1)],
        show: { notes: [55, 67], text: { en: 'same note, two heights', he: 'אותו צליל, שני גבהים' } },
      },
      {
        say: { en: 'Breathe low and relaxed, open your mouth a little, and start softly. Soft and in tune beats loud and pushed — always.', he: 'נשמו נמוך ורגוע, פתחו מעט את הפה, והתחילו בשקט. רך ומדויק עדיף על חזק ודחוף — תמיד.' },
        play: [notes([62], 1.6)],
        show: { notes: [62], text: { en: 'soft · relaxed', he: 'רך · רגוע' } },
      },
      {
        say: { en: 'Your turn! Listen, then hum or sing on "ooo". Gently — no straining. The screen shows you where you are.', he: 'תורכם! הקשיבו, ואז זמזמו או שירו "אוּ". בעדינות — בלי להתאמץ. המסך מראה לכם איפה אתם.' },
        show: { text: { en: '🎤 ooo', he: '🎤 אוּ' } },
      },
    ],
  },
  {
    id: 'transpose',
    area: 'theory',
    emoji: '🔀',
    title: { en: 'Same tune, new key', he: 'אותה מנגינה, סולם אחר' },
    takeaway: { en: 'A key is the "home" a melody sits in. Transposing keeps every step of the tune and moves the home: same degrees, new note names.', he: 'סולם הוא ה"בית" שבו מנגינה יושבת. טרנספוזיציה שומרת כל צעד במנגינה ומזיזה את הבית: אותן דרגות, שמות תווים חדשים.' },
    steps: [
      {
        say: { en: 'Hi {name}! You can start "Happy Birthday" on any note and it is still the same song. That is transposing — same tune, new starting place.', he: 'היי {name}! אפשר להתחיל שיר יום הולדת מכל צליל, והוא עדיין אותו שיר. זו טרנספוזיציה — אותה מנגינה, נקודת התחלה חדשה.' },
        play: [notes([60, 62, 64], 0.5), rest(0.6), notes([67, 69, 71], 0.5)],
        show: { notes: [60, 62, 64, 67, 69, 71], text: { en: 'C D E → G A B', he: 'דו רה מי → סול לה סי' } },
      },
      {
        say: { en: 'The trick is degrees: count from home. C D E in C major is 1 2 3. In G major, 1 2 3 is G A B. Same numbers, new names.', he: 'הטריק הוא דרגות: סופרים מהבית. דו רה מי בדו מז׳ור זה 1 2 3. בסול מז׳ור, 1 2 3 זה סול לה סי. אותם מספרים, שמות חדשים.' },
        play: [{ kind: 'cadence', key: { letter: 'G', acc: 0 } }, notes([67, 69, 71], 0.5)],
        show: { notes: [67, 69, 71], key: 'G', text: { en: '1 2 3 = G A B', he: '1 2 3 = סול לה סי' } },
      },
      {
        say: { en: 'Or move by an interval: up a fifth, every note goes up a fifth. C E G becomes G B D.', he: 'או מזיזים במרווח: קווינטה למעלה — כל צליל עולה קווינטה. דו מי סול הופך לסול סי רה.' },
        play: [notes([60, 64, 67], 0.5), rest(0.6), notes([67, 71, 74], 0.5)],
        show: { notes: [60, 64, 67, 67, 71, 74], text: { en: 'C E G → G B D', he: 'דו מי סול → סול סי רה' } },
      },
      {
        say: { en: 'Why bother? Singers move songs to suit their voice, and horn players read in other keys every day. It is a real musician’s superpower.', he: 'למה זה חשוב? זמרים מעבירים שירים כדי שיתאימו לקול שלהם, ונגני כלי נשיפה קוראים בסולמות אחרים כל יום. זו כוח־על אמיתי של מוזיקאים.' },
        play: [notes([60, 64, 67, 72], 0.4), rest(0.5), notes([65, 69, 72, 77], 0.4)],
        show: { text: { en: 'C → F: same song', he: 'דו → פה: אותו שיר' } },
      },
      {
        say: { en: 'Your turn! Pick the same tune in a new key, move it by an interval, say the new names — and finally sing it there.', he: 'תורכם! בחרו את אותה מנגינה בסולם חדש, הזיזו אותה במרווח, אמרו את השמות החדשים — ובסוף שירו אותה שם.' },
        show: { text: { en: 'same tune, new home', he: 'אותה מנגינה, בית חדש' } },
      },
    ],
  },
];

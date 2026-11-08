// Quick lessons for the ear basics and transposition: background from zero, plain words, sound first.
// Every term is explained the first time it appears ("pitch = how high or low a note is").

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
/** Clicks with an accent on the first of every `group`. */
function clicks(times: number[], group = 4): Stimulus {
  const events: NoteEvent[] = times.map((t, i) => ({ midi: i % group === 0 ? 96 : 86, start: t, duration: 0.05, velocity: i % group === 0 ? 0.65 : 0.45 }));
  return { kind: 'events', events, length: times[times.length - 1] + 0.3 };
}
/** One note at a chosen loudness (velocity 0–1). */
const loud = (midi: number, velocity: number, d = 1): Stimulus => ({ kind: 'events', events: [{ midi, start: 0, duration: d, velocity }], length: d + 0.2 });
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
    more: [
      {
        say: { en: 'Where does pitch come from? Every sound is something shaking — a string, a drum skin, your voice. Fast shaking makes a high note; slow shaking makes a low one. The speed of the shaking is called frequency.', he: 'מאיפה בא גובה הצליל? כל צליל הוא משהו שרוטט — מיתר, עור של תוף, הקול שלכם. רטט מהיר יוצר צליל גבוה; רטט איטי יוצר צליל נמוך. מהירות הרטט נקראת תדירות.' },
        play: [notes([48, 60, 72], 0.9)],
        show: { notes: [48, 60, 72], text: { en: 'slow → fast', he: 'איטי → מהיר' } },
      },
      {
        say: { en: 'On a piano, low notes are on the left and high notes on the right: every key is a little higher than the one before. Written music works the same way — higher on the page means higher in sound.', he: 'בפסנתר, הצלילים הנמוכים משמאל והגבוהים מימין: כל קליד קצת יותר גבוה מהקודם. גם בתווים זה אותו דבר — גבוה יותר על הדף פירושו גבוה יותר בצליל.' },
        play: [notes([48, 52, 55, 60, 64, 67, 72], 0.35)],
        show: { notes: [48, 52, 55, 60, 64, 67, 72], text: { en: 'left = low · right = high', he: 'שמאל = נמוך · ימין = גבוה' } },
      },
      {
        say: { en: 'The most common mix-up: high and low are not loud and soft. A note can be low and loud, or high and quiet. Here is the very same low note, first soft, then loud — its pitch does not change.', he: 'הבלבול הכי נפוץ: גבוה ונמוך זה לא חזק ושקט. צליל יכול להיות נמוך וחזק, או גבוה ושקט. הנה בדיוק אותו צליל נמוך, קודם בשקט ואז בחוזק — הגובה שלו לא משתנה.' },
        play: [loud(48, 0.2), rest(0.3), loud(48, 0.95)],
        show: { notes: [48], text: { en: 'soft · loud = same pitch', he: 'שקט · חזק = אותו גובה' } },
      },
      {
        say: { en: 'How to compare two notes: hum them softly after you hear them. You will feel your throat work a little harder for the higher one. Many people also move a hand up or down with the sound — try it.', he: 'איך משווים שני צלילים: זמזמו אותם בשקט אחרי ששמעתם. תרגישו שהגרון עובד קצת יותר קשה בשביל הגבוה. הרבה אנשים גם מזיזים יד למעלה או למטה עם הצליל — נסו.' },
        play: [notes([57, 62], 0.9), rest(0.5), notes([62, 57], 0.9)],
        show: { notes: [57, 62], text: { en: '⬆ then ⬇', he: '⬆ ואז ⬇' } },
      },
      {
        say: { en: 'The closer two notes are, the harder they are to tell apart. The smallest step on a piano is from one key to the very next one — called a semitone, or half step. Here is a big jump, then a semitone.', he: 'ככל ששני צלילים קרובים יותר, קשה יותר להבחין ביניהם. הצעד הכי קטן בפסנתר הוא מקליד אחד לזה שממש לידו — זה נקרא חצי טון. הנה קפיצה גדולה, ואז חצי טון.' },
        play: [notes([60, 72], 0.8), rest(0.5), notes([60, 61], 0.8)],
        show: { notes: [60, 61], text: { en: 'big jump · semitone', he: 'קפיצה גדולה · חצי טון' } },
      },
      {
        say: { en: 'For same or different, you do not need to remember every note. Keep the first tune in your head like a path, and listen for the moment the second one steps off it.', he: 'בשביל "אותו דבר או שונה" לא צריך לזכור כל צליל. החזיקו את המנגינה הראשונה בראש כמו שביל, והקשיבו לרגע שבו השנייה יוצאת ממנו.' },
        play: [notes([67, 64, 65, 62, 60], 0.45), rest(0.7), notes([67, 64, 65, 64, 60], 0.45)],
        show: { text: { en: 'the 4th note changed', he: 'הצליל ה־4 השתנה' } },
      },
      {
        say: { en: 'In real music, high and low have jobs. The bass plays low and holds everything up, like a floor. The melody — the tune you hum — usually sits higher, where the ear follows it easily.', he: 'במוזיקה אמיתית, לגבוה ולנמוך יש תפקידים. הבס מנגן נמוך ומחזיק את הכול, כמו רצפה. המנגינה — מה שמזמזמים — יושבת בדרך כלל גבוה יותר, איפה שהאוזן עוקבת אחריה בקלות.' },
        play: [notes([36, 43, 36, 43], 0.5), rest(0.3), notes([72, 74, 76, 74, 72], 0.4)],
        show: { text: { en: 'bass · melody', he: 'בס · מנגינה' } },
      },
      {
        say: { en: 'Recap: pitch is how high or low a note is. Fast vibration sounds high, slow sounds low, and it has nothing to do with how loud it is.', he: 'לסיכום: גובה צליל זה כמה הצליל גבוה או נמוך. רטט מהיר נשמע גבוה, איטי נשמע נמוך, ואין לזה קשר לכמה הצליל חזק.' },
        show: { text: { en: 'high · low ≠ loud · soft', he: 'גבוה · נמוך ≠ חזק · שקט' } },
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
    more: [
      {
        say: { en: 'The shape of a melody has a name: its contour. Picture it as a line drawn across the page, rising and falling like hills. Musicians feel this shape long before they know any note names.', he: 'לצורה של מנגינה יש שם: קו המתאר שלה. דמיינו קו שמצויר לרוחב הדף, עולה ויורד כמו גבעות. מוזיקאים מרגישים את הצורה הזאת הרבה לפני שהם יודעים שמות של תווים.' },
        play: [notes([60, 64, 62, 67, 65, 69, 72], 0.4)],
        show: { notes: [60, 64, 62, 67, 65, 69, 72], text: { en: 'contour', he: 'קו מתאר' } },
      },
      {
        say: { en: 'A melody moves in two ways. A step goes to the very next note, smooth like walking. A leap skips over notes, bold like jumping. Here are steps, then leaps.', he: 'מנגינה זזה בשתי דרכים. צעד הולך לצליל שממש לידו, חלק כמו הליכה. קפיצה מדלגת מעל צלילים, נועזת כמו ניתור. הנה צעדים, ואחר כך קפיצות.' },
        play: [notes([60, 62, 64, 65], 0.45), rest(0.6), notes([60, 67, 62, 69], 0.45)],
        show: { text: { en: 'steps · leaps', he: 'צעדים · קפיצות' } },
      },
      {
        say: { en: 'A tune can also stay put and repeat the same note. In your drawing that is flat ground — the line goes straight across before it moves again.', he: 'מנגינה יכולה גם לעמוד במקום ולחזור על אותו צליל. בציור שלכם זה שטח ישר — הקו הולך ישר לפני שהוא זז שוב.' },
        play: [notes([64, 64, 64, 62, 60], 0.45)],
        show: { notes: [64, 64, 64, 62, 60], text: { en: '→ → ↘', he: '→ → ↘' } },
      },
      {
        say: { en: 'How to hear the shape: follow the direction note by note — up, down or same — and whisper it to yourself. Then step back and ask: did the tune end higher or lower than it began?', he: 'איך שומעים את הצורה: עקבו אחרי הכיוון צליל אחרי צליל — למעלה, למטה או אותו דבר — ולחשו את זה לעצמכם. אחר כך הסתכלו על הכול ושאלו: המנגינה נגמרה גבוה או נמוך יותר ממה שהתחילה?' },
        play: [notes([60, 62, 64, 62, 67, 65, 64], 0.45)],
        show: { notes: [60, 62, 64, 62, 67, 65, 64], text: { en: 'ends higher ↗', he: 'נגמרת גבוה יותר ↗' } },
      },
      {
        say: { en: 'A common trap: a tune that rises overall can still dip a little on the way. Do not let one step down fool you — compare where it starts with where it ends.', he: 'מלכודת נפוצה: מנגינה שעולה בסך הכול יכולה עדיין לרדת קצת בדרך. אל תתנו לצעד אחד למטה לבלבל אתכם — השוו איפה היא מתחילה ואיפה היא נגמרת.' },
        play: [notes([60, 64, 62, 65, 64, 67, 72], 0.4)],
        show: { notes: [60, 64, 62, 65, 64, 67, 72], text: { en: 'dips, but rises overall', he: 'יורדת קצת, אבל עולה בסך הכול' } },
      },
      {
        say: { en: 'Practice: sing a tune you like, slowly, and let your hand draw it in the air — up for higher, down for lower. Your hand becomes a picture of the contour.', he: 'תרגול: שירו לאט מנגינה שאתם אוהבים, ותנו ליד לצייר אותה באוויר — למעלה כשעולה, למטה כשיורדת. היד הופכת לתמונה של קו המתאר.' },
      },
      {
        say: { en: 'In real songs, the melody often climbs toward its highest note at the most exciting moment, then comes back down to finish calmly. Next time you hear a chorus, listen for that peak.', he: 'בשירים אמיתיים, המנגינה מטפסת הרבה פעמים אל הצליל הכי גבוה שלה ברגע הכי מרגש, ואז חוזרת למטה כדי להסתיים ברוגע. בפעם הבאה שתשמעו פזמון, הקשיבו לשיא הזה.' },
        play: [notes([60, 62, 64, 67, 69, 72, 74, 72, 69, 67, 64, 60], 0.35)],
        show: { notes: [60, 62, 64, 67, 69, 72, 74, 72, 69, 67, 64, 60], text: { en: 'peak ⌒', he: 'שיא ⌒' } },
      },
      {
        say: { en: 'Recap: contour is the shape of a tune — up, down or level, by steps or by leaps. Hear the shape first; the note names come later.', he: 'לסיכום: קו המתאר הוא הצורה של מנגינה — עולה, יורדת או ישרה, בצעדים או בקפיצות. קודם שומעים את הצורה; שמות התווים יבואו אחר כך.' },
        show: { text: { en: '↗ ↘ → · step · leap', he: '↗ ↘ → · צעד · קפיצה' } },
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
    more: [
      {
        say: { en: 'The beat is the steady pulse you could clap along to. Its speed, the tempo, is measured in beats per minute — BPM. Sixty BPM is exactly one beat a second, like a clock ticking.', he: 'הפעמה היא הדופק היציב שאפשר למחוא לו כפיים. המהירות שלה, הטמפו, נמדדת בפעמות לדקה — BPM. שישים BPM זה בדיוק פעמה אחת בשנייה, כמו תקתוק של שעון.' },
        play: [clicks(even(60, 5))],
        show: { text: { en: '60 BPM = 1 per second', he: '60 BPM = אחת בשנייה' } },
      },
      {
        say: { en: 'Double it and you get 120 BPM — two beats a second, about the speed of a brisk walk. Much dance music sits close to this tempo.', he: 'מכפילים ומקבלים 120 BPM — שתי פעמות בשנייה, בערך הקצב של הליכה מהירה. הרבה מוזיקת ריקודים יושבת קרוב לטמפו הזה.' },
        play: [clicks(even(120, 8))],
        show: { text: { en: '120 BPM', he: '120 BPM' } },
      },
      {
        say: { en: 'Beats come in groups called bars, or measures. The first beat of each bar is a little stronger. Most pop songs group beats in fours: ONE two three four.', he: 'הפעמות מגיעות בקבוצות שנקראות תיבות. הפעמה הראשונה בכל תיבה קצת חזקה יותר. רוב שירי הפופ מקבצים פעמות בארבע: אחת שתיים שלוש ארבע.' },
        play: [clicks(even(100, 8))],
        show: { text: { en: 'ONE two three four', he: 'אחת שתיים שלוש ארבע' } },
      },
      {
        say: { en: 'A waltz groups them in threes: ONE two three, ONE two three. Listen for the strong click and count from it.', he: 'ואלס מקבץ אותן בשלוש: אחת שתיים שלוש, אחת שתיים שלוש. הקשיבו לקליק החזק וספרו ממנו.' },
        play: [clicks(even(140, 9), 3)],
        show: { text: { en: 'ONE two three', he: 'אחת שתיים שלוש' } },
      },
      {
        say: { en: 'To find the beat in any song, tap your foot to whatever feels natural. Then count to four along with it, and listen for where the strongest hit falls — that is ONE.', he: 'כדי למצוא את הפעמה בכל שיר, הקישו ברגל למה שמרגיש טבעי. אחר כך ספרו עד ארבע יחד איתה, והקשיבו איפה נופלת המכה הכי חזקה — זו אחת.' },
      },
      {
        say: { en: 'The most common mistake is rushing. When music gets exciting, people speed up without noticing. Listen: these clicks start steady and slowly get faster. Steady means the same distance between every beat.', he: 'הטעות הכי נפוצה היא למהר. כשהמוזיקה נעשית מרגשת, אנשים מאיצים בלי לשים לב. הקשיבו: הקליקים האלה מתחילים יציבים ולאט לאט מאיצים. יציב פירושו אותו מרחק בין כל הפעמות.' },
        play: [clicks([0, 0.6, 1.18, 1.73, 2.25, 2.74, 3.2, 3.63])],
        show: { text: { en: 'rushing ↗', he: 'מאיץ ↗' } },
      },
      {
        say: { en: 'Practice: walk and count, one step per beat. Or play along with a metronome — a tool that clicks a perfectly steady beat. Start slow; steady is more important than fast.', he: 'תרגול: לכו וספרו, צעד אחד לכל פעמה. או נגנו יחד עם מטרונום — כלי שמקיש פעמה יציבה לגמרי. התחילו לאט; יציב חשוב יותר ממהיר.' },
      },
      {
        say: { en: 'In real music, tempo sets the mood. A slow ballad may sit around 70 BPM and feels calm; a fast dance track pushes past 120 and makes you move.', he: 'במוזיקה אמיתית, הטמפו קובע את מצב הרוח. בלדה איטית יכולה לשבת סביב 70 BPM ומרגישה רגועה; שיר ריקוד מהיר עובר את 120 וגורם לכם לזוז.' },
        play: [clicks(even(70, 4)), rest(0.5), clicks(even(128, 8))],
        show: { text: { en: '70 · 128 BPM', he: '70 · 128 BPM' } },
      },
      {
        say: { en: 'Recap: the beat is the steady pulse, tempo is its speed in BPM, and beats group into bars with a strong ONE.', he: 'לסיכום: הפעמה היא הדופק היציב, הטמפו הוא המהירות שלה ב־BPM, והפעמות מתקבצות לתיבות עם אחת חזקה.' },
        show: { text: { en: '♩ ♩ ♩ ♩ · BPM · ONE', he: '♩ ♩ ♩ ♩ · BPM · אחת' } },
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
    more: [
      {
        say: { en: 'Matching pitch means singing the same note you hear. Your voice comes from two small folds in your throat, the vocal folds. Stretched tighter they vibrate faster and the note goes up; looser, it goes down. Your ear steers them for you.', he: 'להתאים גובה צליל פירושו לשיר את אותו צליל ששומעים. הקול שלכם בא משני קפלים קטנים בגרון, מיתרי הקול. כשהם מתוחים יותר הם רוטטים מהר והצליל עולה; רפויים יותר — הוא יורד. האוזן מכוונת אותם בשבילכם.' },
        play: [notes([57], 1.4)],
        show: { notes: [57], text: { en: 'hear → hum', he: 'שומעים → מזמזמים' } },
      },
      {
        say: { en: 'Men’s voices usually sound about an octave lower than women’s and children’s. An octave is the same note at a different height — it sounds alike, just bigger or smaller. Singing a note an octave away still counts as a match.', he: 'קולות של גברים נשמעים בדרך כלל בערך אוקטבה נמוך יותר מקולות של נשים וילדים. אוקטבה היא אותו צליל בגובה אחר — הוא נשמע דומה, רק גדול או קטן יותר. לשיר צליל באוקטבה אחרת עדיין נחשב התאמה.' },
        play: [notes([48], 1), rest(0.3), notes([60], 1)],
        show: { notes: [48, 60], text: { en: 'C · C an octave up', he: 'דו · דו אוקטבה למעלה' } },
      },
      {
        say: { en: 'How to hear whether you match: listen for the wobble. Two nearly equal notes make a slow "wah-wah". The closer they get, the slower it beats — until it disappears.', he: 'איך שומעים אם אתם מתאימים: הקשיבו לרעד. שני צלילים כמעט שווים יוצרים "וואו-וואו" איטי. ככל שהם מתקרבים, הרעד איטי יותר — עד שהוא נעלם.' },
        play: [{ kind: 'chord', midis: [60, 60.6], duration: 1.3 }, rest(0.3), { kind: 'chord', midis: [60, 60.25], duration: 1.3 }, rest(0.3), { kind: 'chord', midis: [60, 60], duration: 1.3 }],
        show: { text: { en: 'fast wobble · slow · gone', he: 'רעד מהיר · איטי · נעלם' } },
      },
      {
        say: { en: 'Practice: hum the note, then slide slowly up and down like a gentle siren, and stop when it locks in with the piano. Sliding finds the note more easily than jumping straight at it.', he: 'תרגול: זמזמו את הצליל, ואז החליקו לאט למעלה ולמטה כמו סירנה עדינה, ועצרו כשהוא ננעל עם הפסנתר. החלקה מוצאת את הצליל בקלות יותר מקפיצה ישר אליו.' },
        play: [notes([62], 1.8)],
        show: { notes: [62], text: { en: '↗↘ → lock', he: '↗↘ → ננעל' } },
      },
      {
        say: { en: 'Start near the pitch of your speaking voice — that is your comfortable zone. If a note feels too high or too low, move it an octave and try again.', he: 'התחילו קרוב לגובה של קול הדיבור שלכם — זה האזור הנוח שלכם. אם צליל מרגיש גבוה או נמוך מדי, העבירו אותו אוקטבה ונסו שוב.' },
      },
      {
        say: { en: 'The common mistake is pushing. Singing louder or tensing your neck does not make the note more correct — it usually drags it off. Stay soft, keep breathing, and let your ear do the work.', he: 'הטעות הנפוצה היא לדחוף. לשיר חזק יותר או למתוח את הצוואר לא עושה את הצליל מדויק יותר — בדרך כלל זה מוציא אותו מהמקום. הישארו רכים, המשיכו לנשום, ותנו לאוזן לעשות את העבודה.' },
      },
      {
        say: { en: 'In real music, this is the skill behind singing in tune. Choir singers match each other all the time, so their voices blend into one chord.', he: 'במוזיקה אמיתית, זה הכישור שמאחורי שירה מדויקת. זמרי מקהלה מתאימים את עצמם זה לזה כל הזמן, וכך הקולות שלהם מתמזגים לאקורד אחד.' },
        play: [notes([60, 64, 67], 0.6), { kind: 'chord', midis: [60, 64, 67], duration: 1.6 }],
        show: { notes: [60, 64, 67], chord: true, text: { en: 'voices blend', he: 'הקולות מתמזגים' } },
      },
      {
        say: { en: 'Recap: listen first, hum softly, slide until the wobble disappears. Any octave counts, and gentle always beats loud.', he: 'לסיכום: קודם מקשיבים, מזמזמים בשקט, ומחליקים עד שהרעד נעלם. כל אוקטבה נחשבת, ועדין תמיד עדיף על חזק.' },
        show: { text: { en: 'listen · hum · slide · lock', he: 'להקשיב · לזמזם · להחליק · לנעול' } },
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
        say: { en: 'Why bother? Singers move songs to suit their voice, and horn players read in other keys every day. It is a real musician’s superpower.', he: 'למה זה חשוב? זמרים מעבירים שירים כדי שיתאימו לקול שלהם, ונגני כלי נשיפה קוראים בסולמות אחרים כל יום. זה כוח־על אמיתי של מוזיקאים.' },
        play: [notes([60, 64, 67, 72], 0.4), rest(0.5), notes([65, 69, 72, 77], 0.4)],
        show: { text: { en: 'C → F: same song', he: 'דו → פה: אותו שיר' } },
      },
      {
        say: { en: 'Your turn! Pick the same tune in a new key, move it by an interval, say the new names — and finally sing it there.', he: 'תורכם! בחרו את אותה מנגינה בסולם חדש, הזיזו אותה במרווח, אמרו את השמות החדשים — ובסוף שירו אותה שם.' },
        show: { text: { en: 'same tune, new home', he: 'אותה מנגינה, בית חדש' } },
      },
    ],
    more: [
      {
        say: { en: 'To transpose is to move a piece to another key while keeping every distance between its notes. The tune keeps its shape and its degrees; only the letter names change.', he: 'לעשות טרנספוזיציה פירושו להעביר יצירה לסולם אחר ולשמור על כל המרחקים בין הצלילים. המנגינה שומרת על הצורה ועל הדרגות שלה; רק שמות התווים משתנים.' },
        play: [notes([60, 64, 62, 60], 0.5), rest(0.6), notes([62, 66, 64, 62], 0.5)],
        show: { text: { en: 'C E D C → D F♯ E D', he: 'דו מי רה דו → רה פה♯ מי רה' } },
      },
      {
        say: { en: 'Why it works: distances are counted in semitones, the smallest steps on the keyboard. Move every note up by the same number — here two semitones, a whole tone — and the tune keeps its exact shape.', he: 'למה זה עובד: את המרחקים סופרים בחצאי טונים, הצעדים הכי קטנים במקלדת. מזיזים כל צליל באותו מספר — כאן שני חצאי טונים, טון שלם — והמנגינה שומרת בדיוק על הצורה שלה.' },
        play: [notes([60, 62, 64, 65, 67], 0.4), rest(0.5), notes([62, 64, 66, 67, 69], 0.4)],
        show: { notes: [62, 64, 66, 67, 69], text: { en: 'C D E F G → D E F♯ G A', he: 'דו רה מי פה סול → רה מי פה♯ סול לה' } },
      },
      {
        say: { en: 'Notice the F♯. In D major it is needed to keep the same pattern of steps that C major has. Play F instead and the tune bends out of shape — listen.', he: 'שימו לב לפה דיאז. ברה מז׳ור הוא נחוץ כדי לשמור על אותה תבנית צעדים שיש בדו מז׳ור. נגנו פה רגיל במקומו והמנגינה מתעקמת — הקשיבו.' },
        play: [notes([62, 64, 66, 67, 69], 0.4), rest(0.5), notes([62, 64, 65, 67, 69], 0.4)],
        show: { text: { en: 'F♯ ✓ · F ✗', he: 'פה♯ ✓ · פה ✗' } },
      },
      {
        say: { en: 'Method one — degrees: write the tune as numbers, then read the numbers in the new key. 3 2 1 in C is E D C; in F major it is A G F.', he: 'שיטה ראשונה — דרגות: כותבים את המנגינה כמספרים, ואז קוראים את המספרים בסולם החדש. 3 2 1 בדו זה מי רה דו; בפה מז׳ור זה לה סול פה.' },
        play: [{ kind: 'cadence', key: { letter: 'F', acc: 0 } }, notes([69, 67, 65], 0.6)],
        show: { notes: [69, 67, 65], key: 'F', text: { en: 'F: 3 2 1 = A G F', he: 'פה: 3 2 1 = לה סול פה' } },
      },
      {
        say: { en: 'Method two — interval: choose the distance, such as up a fourth or down a tone, and move every note by it. Then check the new key’s sharps or flats.', he: 'שיטה שנייה — מרווח: בוחרים את המרחק, למשל קוורטה למעלה או טון למטה, ומזיזים בו כל צליל. אחר כך בודקים את הדיאזים או הבמולים של הסולם החדש.' },
      },
      {
        say: { en: 'The common mistake is moving the letters but forgetting the sharps and flats. C D E moved up to start on E becomes E F♯ G♯ — not E F G.', he: 'הטעות הנפוצה היא להזיז את האותיות ולשכוח את הדיאזים והבמולים. דו רה מי שמועבר להתחיל ממי הופך למי פה♯ סול♯ — לא מי פה סול.' },
        play: [notes([64, 66, 68], 0.5), rest(0.5), notes([64, 65, 67], 0.5)],
        show: { notes: [64, 66, 68], text: { en: 'E F♯ G♯ ✓ · E F G ✗', he: 'מי פה♯ סול♯ ✓ · מי פה סול ✗' } },
      },
      {
        say: { en: 'In real life, singers often ask for a song a tone lower to suit their voice. Some instruments read transposed parts: on a B♭ clarinet or trumpet, a written C sounds as B♭.', he: 'בחיים האמיתיים, זמרים מבקשים לא פעם שיר בטון נמוך יותר כדי שיתאים לקול. כלים מסוימים קוראים תווים במעבר: בקלרינט או בחצוצרה בסי במול, דו כתוב נשמע כסי במול.' },
        play: [notes([72], 1), rest(0.3), notes([70], 1)],
        show: { notes: [72, 70], text: { en: 'written C → sounds B♭', he: 'דו כתוב → נשמע סי♭' } },
      },
      {
        say: { en: 'Recap: transposing keeps the shape and the degrees and changes the names. Count from the new home, and always check the sharps and flats.', he: 'לסיכום: טרנספוזיציה שומרת על הצורה ועל הדרגות ומשנה את השמות. סופרים מהבית החדש, ותמיד בודקים את הדיאזים והבמולים.' },
        show: { text: { en: 'same degrees · new names', he: 'אותן דרגות · שמות חדשים' } },
      },
    ],
  },
];

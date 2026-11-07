// Quick lessons for the 0.38 topics (spec AE): the sound & production ear — EQ, filters, frequencies, room and
// echo, pan, width, compression and drive. Sound first, plain words.
import type { Stimulus } from '../../engine/lesson';
import { marker } from '../../engine/lesson';
import { fxSpec, type FxChain, type FxSource } from '../../engine/fx';
import type { MiniLesson } from '../miniTypes';

const SRC: Record<FxSource, number> = { pink: 2, loop: 4, drums: 4, voice: 3, sine: 1.4 };
/** A processed sound (loudness-matched to the plain one unless `level`). */
const fx = (source: FxSource, chain: FxChain, extra: { sineHz?: number; level?: boolean } = {}): Stimulus => ({
  kind: 'fx',
  fx: fxSpec({ source, seed: 4242, bpm: 120, src: SRC[source], chain, ...(extra.sineHz ? { sineHz: extra.sineHz } : {}), ...(extra.level ? {} : { matchTo: {} }) }),
});
const ab = (a: Stimulus, b: Stimulus): Stimulus[] => [marker(1), a, marker(2), b];
const boost = (freq: number, gain = 12) => ({ eq: [{ type: 'peaking' as const, freq, gain, q: 1 }] });

export const LESSONS: MiniLesson[] = [
  {
    id: 'sound-eq',
    area: 'ear',
    emoji: '🎚️',
    title: { en: 'Hearing EQ', he: 'לשמוע אקולייזר' },
    takeaway: { en: 'An EQ boost makes one band of frequencies stick out: lows sound boomy, mids nasal or honky, highs hissy and bright.', he: 'הגברה באקולייזר מבליטה פס אחד של תדרים: נמוכים נשמעים עמומים ומהדהדים, אמצע אפי, גבוהים שורקים ובהירים.' },
    steps: [
      { say: { en: 'Hi {name}! This hiss is pink noise: every frequency at once, evenly spread. It is the perfect test sound for your ears.', he: 'היי {name}! הרחש הזה הוא רעש ורוד: כל התדרים ביחד, בפיזור שווה. זה סאונד הבדיקה המושלם לאוזניים.' }, play: [fx('pink', {})], playFirst: true },
      { say: { en: 'Now we boost the lows. Listen for a darker, rounder rumble, like the sound behind a wall.', he: 'עכשיו נגביר את הנמוכים. הקשיבו לרעם כהה ועגול יותר, כמו סאונד מאחורי קיר.' }, play: ab(fx('pink', {}), fx('pink', boost(500))) },
      { say: { en: 'A boost in the middle sounds nasal, a bit like talking through a phone or a tube.', he: 'הגברה באמצע נשמעת אפית, קצת כמו לדבר דרך טלפון או צינור.' }, play: ab(fx('pink', {}), fx('pink', boost(2000))) },
      { say: { en: 'A boost in the highs adds hiss and air, like steam or rain on a window.', he: 'הגברה בגבוהים מוסיפה שריקה ואוויר, כמו קיטור או גשם על חלון.' }, play: ab(fx('pink', {}), fx('pink', boost(8000))) },
      { say: { en: 'Both versions always play at the same loudness, so only the colour tells you. Ask yourself: boomy, nasal or hissy? That is low, middle or high. Take your time and play both again.', he: 'שתי הגרסאות תמיד מתנגנות באותה עוצמה, כך שרק הצבע מגלה. שאלו את עצמכם: עמום, אפי או שורק? זה נמוכים, אמצע או גבוהים. קחו את הזמן ונגנו את שתיהן שוב.' } },
    ],
  },
  {
    id: 'sound-filter',
    area: 'ear',
    emoji: '🔉',
    title: { en: 'High-pass and low-pass', he: 'היי-פאס ולואו-פאס' },
    takeaway: { en: 'A high-pass filter removes the lows (thin, small sound); a low-pass removes the highs (dark, muffled sound). The cut-off is where it starts.', he: 'פילטר היי-פאס מוריד את הנמוכים (סאונד דק וקטן); לואו-פאס מוריד את הגבוהים (סאונד כהה ועמום). תדר החיתוך הוא המקום שבו זה מתחיל.' },
    steps: [
      { say: { en: 'Hi {name}! A filter does not add anything. It removes everything on one side of a frequency, called the cut-off.', he: 'היי {name}! פילטר לא מוסיף כלום. הוא מוריד את כל מה שנמצא בצד אחד של תדר מסוים, שנקרא תדר החיתוך.' }, play: [fx('loop', {})] },
      { say: { en: 'A high-pass lets only the highs pass. The lows are gone, so the band sounds thin, like a small radio.', he: 'היי-פאס נותן רק לגבוהים לעבור. הנמוכים נעלמים, אז הלהקה נשמעת דקה, כמו רדיו קטן.' }, play: [fx('loop', { eq: [{ type: 'highpass', freq: 1250, q: 0.9 }] })] },
      { say: { en: 'A low-pass is the opposite. The highs are gone, so the band sounds dark and muffled, like music from the next room.', he: 'לואו-פאס הוא ההפך. הגבוהים נעלמים, אז הלהקה נשמעת כהה ועמומה, כמו מוזיקה מהחדר הסמוך.' }, play: [fx('loop', { eq: [{ type: 'lowpass', freq: 800, q: 0.9 }] })] },
      { say: { en: 'Where is the cut-off? Move a low-pass down and more of the sound disappears. Here it is high, then low.', he: 'איפה תדר החיתוך? כשמורידים לואו-פאס, עוד ועוד מהסאונד נעלם. הנה הוא גבוה, ואז נמוך.' }, play: ab(fx('pink', { eq: [{ type: 'lowpass', freq: 4000, q: 0.9 }] }), fx('pink', { eq: [{ type: 'lowpass', freq: 500, q: 0.9 }] })) },
      { say: { en: 'So: thin means high-pass, muffled means low-pass. Then listen for how much is left: a little or a lot. Producers use both filters all the time, to make room for every instrument in a mix.', he: 'אז: דק זה היי-פאס, עמום זה לואו-פאס. אחר כך מקשיבים כמה נשאר: מעט או הרבה. מפיקים משתמשים בשני הפילטרים כל הזמן, כדי לפנות מקום לכל כלי במיקס.' } },
    ],
  },
  {
    id: 'sound-hz',
    area: 'ear',
    emoji: '〰️',
    title: { en: 'Name the frequency', he: 'לזהות את התדר' },
    takeaway: { en: 'Each octave doubles the frequency: 250 Hz is a low hum, 1 kHz a clear beep, 4 kHz a piercing whistle. Learn a few landmarks.', he: 'כל אוקטבה מכפילה את התדר: 250 הרץ זה זמזום נמוך, 1 קילו-הרץ צפצוף ברור, 4 קילו-הרץ שריקה חודרת. לומדים כמה נקודות ציון.' },
    steps: [
      { say: { en: 'Hi {name}! A pure tone has just one frequency, counted in hertz: vibrations per second. This is 1000 hertz, one kilohertz, the classic test beep.', he: 'היי {name}! לצליל טהור יש רק תדר אחד, שנמדד בהרץ: תנודות בשנייה. זה 1000 הרץ, קילו-הרץ אחד, הצפצוף הקלאסי של בדיקה.' }, play: [fx('sine', {}, { sineHz: 1000, level: true })] },
      { say: { en: 'Halve it twice and you get 250 hertz, a low hum. It is two octaves lower. Phone speakers barely play it, so use headphones.', he: 'חוצים פעמיים ומקבלים 250 הרץ, זמזום נמוך. זה שתי אוקטבות למטה. רמקול של טלפון כמעט לא מנגן אותו, אז כדאי אוזניות.' }, play: [fx('sine', {}, { sineHz: 250, level: true })] },
      { say: { en: 'Double one kilohertz twice: four kilohertz, a piercing whistle.', he: 'מכפילים קילו-הרץ אחד פעמיים: ארבעה קילו-הרץ, שריקה חודרת.' }, play: [fx('sine', {}, { sineHz: 4000, level: true })] },
      { say: { en: 'Here are all three in a row: hum, beep, whistle. Remember them as landmarks.', he: 'הנה שלושתם ברצף: זמזום, צפצוף, שריקה. זכרו אותם כנקודות ציון.' }, play: [fx('sine', {}, { sineHz: 250, level: true }), fx('sine', {}, { sineHz: 1000, level: true }), fx('sine', {}, { sineHz: 4000, level: true })] },
      { say: { en: 'Engineers use this to find a ringing or harsh frequency fast. Start from the landmarks, then go step by step: is it higher or lower than the beep, and by how many octaves?', he: 'טכנאי סאונד משתמשים בזה כדי למצוא מהר תדר מצלצל או צורם. מתחילים מנקודות הציון, ואז צעד אחר צעד: האם הוא גבוה או נמוך מהצפצוף, ובכמה אוקטבות?' } },
    ],
  },
  {
    id: 'sound-space',
    area: 'ear',
    emoji: '⛪',
    title: { en: 'Room and echo', he: 'חלל והד' },
    takeaway: { en: 'Reverb is the room ringing after the sound: short in a small room, long in a cathedral. Delay is a clear repeat, timed to the beat.', he: 'ריוורב הוא החלל שממשיך לצלצל אחרי הסאונד: קצר בחדר קטן, ארוך בקתדרלה. דיליי הוא חזרה ברורה, מתוזמנת לפעמה.' },
    steps: [
      { say: { en: 'Hi {name}! These drums are dry: no room at all. Every hit stops dead.', he: 'היי {name}! התופים האלה יבשים: בלי חלל בכלל. כל מכה נעצרת מיד.' }, play: [fx('drums', {})], playFirst: true },
      { say: { en: 'Now in a small room. A short ring follows each hit.', he: 'עכשיו בחדר קטן. צלצול קצר בא אחרי כל מכה.' }, play: [fx('drums', { reverb: { decay: 0.6, mix: 0.35 } })] },
      { say: { en: 'And in a cathedral. The ring lasts for seconds, and hits blur together.', he: 'ועכשיו בקתדרלה. הצלצול נמשך שניות, והמכות מתערבבות.' }, play: [fx('drums', { reverb: { decay: 5, mix: 0.45 } })] },
      { say: { en: 'A delay is different: a clean copy of the sound, repeated in time. Here the echo comes an eighth note later.', he: 'דיליי זה משהו אחר: עותק נקי של הסאונד, שחוזר בזמן. כאן ההד מגיע שמינית אחרי.' }, play: [fx('voice', { delay: { time: 0.25, feedback: 0.35, mix: 0.5 } })] },
      { say: { en: 'Listen to the tail after the sound stops: its length tells you the size of the room. For a delay, tap the beat with your foot and notice where the echo lands: halfway to the next beat is an eighth note, on the next beat is a quarter note. A gap between the hit and the start of the reverb is called pre-delay.', he: 'הקשיבו לזנב אחרי שהסאונד נעצר: האורך שלו מגלה את גודל החלל. בדיליי, תקתקו את הפעמה ברגל ושימו לב איפה ההד נוחת: באמצע הדרך לפעמה הבאה זו שמינית, על הפעמה הבאה זה רבע. רווח בין המכה לתחילת הריוורב נקרא פרי-דיליי.' } },
    ],
  },
  {
    id: 'sound-pan',
    area: 'ear',
    emoji: '🎧',
    title: { en: 'Left, right and wide', he: 'שמאל, ימין ורוחב' },
    takeaway: { en: 'Pan places a sound between the left and right speakers; width is how far a stereo mix spreads. You need headphones to hear both.', he: 'פאן ממקם סאונד בין הרמקול השמאלי לימני; רוחב הוא כמה מיקס סטריאו מתפרש. צריך אוזניות כדי לשמוע את שניהם.' },
    steps: [
      { say: { en: 'Hi {name}! Put your headphones on. This sound is panned to the left.', he: 'היי {name}! שימו אוזניות. הסאונד הזה נמצא בפאן שמאלה.' }, play: [fx('voice', { pan: -0.8 })] },
      { say: { en: 'Now to the right, and then back in the centre, where it seems to sit inside your head.', he: 'עכשיו ימינה, ואז בחזרה למרכז, שם הוא נשמע כאילו הוא בתוך הראש.' }, play: [fx('voice', { pan: 0.8 }), fx('voice', { pan: 0 })] },
      { say: { en: 'A mix is a stage. This band is in mono: everything stands in one spot in the middle.', he: 'מיקס הוא במה. הלהקה הזו במונו: הכול עומד בנקודה אחת באמצע.' }, play: [fx('loop', { width: 0 }, {})] },
      { say: { en: 'The same band, wide: the keys and the cymbals spread out to the sides and the space opens up.', he: 'אותה להקה, רחבה: הקלידים והמצלתיים מתפרשים לצדדים והמרחב נפתח.' }, play: [fx('loop', { width: 1.8 })] },
      { say: { en: 'To find a panned instrument, close your eyes and point to where it is. Your ears already know. For width, listen to the edges: does the sound reach all the way to your ears, or stay in the middle?', he: 'כדי למצוא כלי בפאן, עצמו עיניים והצביעו לאן שהוא נמצא. האוזניים כבר יודעות. כדי לשמוע רוחב, הקשיבו לקצוות: האם הסאונד מגיע עד האוזניים, או נשאר באמצע?' } },
    ],
  },
  {
    id: 'sound-dyn',
    area: 'ear',
    emoji: '🗜️',
    title: { en: 'Squash and grit', he: 'דחיסה ולכלוך' },
    takeaway: { en: 'A compressor turns the loud hits down, so the quiet parts come up: punchy or flat. Drive adds grit; fuzz turns it into a buzz.', he: 'קומפרסור מנמיך את המכות החזקות, כך שהחלקים השקטים עולים: פאנצ׳י או שטוח. דרייב מוסיף לכלוך; פאז הופך אותו לזמזום.' },
    steps: [
      { say: { en: 'Hi {name}! These are raw drums. Notice how the hits jump out and the space between them is quiet.', he: 'היי {name}! אלה תופים גולמיים. שימו לב איך המכות קופצות החוצה והרווח ביניהן שקט.' }, play: [fx('drums', {})], playFirst: true },
      { say: { en: 'Now heavily compressed, at the same loudness. The hits are squashed and the tails between them come up.', he: 'עכשיו עם קומפרסיה כבדה, באותה עוצמה. המכות נמעכות והזנבות ביניהן עולים.' }, play: ab(fx('drums', {}), fx('drums', { comp: { threshold: -32, ratio: 10, attack: 0.002, release: 0.08 } })) },
      { say: { en: 'Attack is how fast the compressor grabs. Slow attack lets the start of each hit punch through.', he: 'אטאק הוא כמה מהר הקומפרסור תופס. אטאק איטי נותן לתחילת כל מכה לבלוט.' }, play: [fx('drums', { comp: { threshold: -30, ratio: 8, attack: 0.04, release: 0.1 } })] },
      { say: { en: 'Drive adds grit, and fuzz pushes it into a buzzing square sound. Clean first, then fuzz.', he: 'דרייב מוסיף לכלוך, ופאז דוחף אותו לסאונד מזמזם ומרובע. קודם נקי, ואז פאז.' }, play: [fx('voice', {}), fx('voice', { drive: 1 })] },
      { say: { en: 'In these exercises loudness never gives the answer away, except when we ask which one is louder. Then listen closely: one or two decibels is a small but real step.', he: 'בתרגילים האלה העוצמה אף פעם לא מסגירה את התשובה, חוץ מאשר כששואלים מה חזק יותר. אז הקשיבו היטב: דציבל או שניים הם צעד קטן אבל אמיתי.' } },
    ],
  },
];

/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = {
  'topic:eq-ear': 'sound-eq',
  'topic:filter-ear': 'sound-filter',
  'topic:tone-hz': 'sound-hz',
  'topic:space-ear': 'sound-space',
  'topic:pan-ear': 'sound-pan',
  'topic:width-ear': 'sound-pan',
  'topic:dyn-ear': 'sound-dyn',
};

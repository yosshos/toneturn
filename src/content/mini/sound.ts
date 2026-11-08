// Quick lessons for the 0.38 topics (spec AE): the sound & production ear — EQ, filters, frequencies, room and
// echo, pan, width, compression and drive. Sound first, plain words.
import type { Stimulus } from '../../engine/lesson';
import { marker } from '../../engine/lesson';
import { fxSpec, type FxChain, type FxPart, type FxSource } from '../../engine/fx';
import type { MiniLesson } from '../miniTypes';

const SRC: Record<FxSource, number> = { pink: 2, loop: 4, drums: 4, voice: 3, sine: 1.4 };
/** A processed sound (loudness-matched to the plain one unless `level`). */
const fx = (source: FxSource, chain: FxChain, extra: { sineHz?: number; level?: boolean } = {}): Stimulus => ({
  kind: 'fx',
  fx: fxSpec({ source, seed: 4242, bpm: 120, src: SRC[source], chain, ...(extra.sineHz ? { sineHz: extra.sineHz } : {}), ...(extra.level ? {} : { matchTo: {} }) }),
});
/** The band loop with each part placed in the stereo field. */
const placed = (partPan: Partial<Record<FxPart, number>>): Stimulus => ({ kind: 'fx', fx: fxSpec({ source: 'loop', seed: 4242, bpm: 120, src: SRC.loop, chain: {}, partPan, matchTo: {} }) });
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
    more: [
      { say: { en: 'An equaliser raises or lowers chosen frequency bands. A parametric band has three controls: frequency (where), gain in decibels (how much), and Q (how wide). A high Q is a narrow spike; a low Q a broad hill.', he: 'אקולייזר מגביר או מנמיך פסי תדרים נבחרים. לפס פרמטרי יש שלושה כפתורים: תדר (איפה), גיין בדציבלים (כמה), ו־Q (כמה רחב). Q גבוה הוא שפיץ צר; Q נמוך הוא גבעה רחבה.' }, play: ab(fx('pink', { eq: [{ type: 'peaking', freq: 1000, gain: 12, q: 6 }] }), fx('pink', { eq: [{ type: 'peaking', freq: 1000, gain: 12, q: 0.7 }] })), show: { text: { en: 'narrow Q · wide Q', he: 'Q צר · Q רחב' } } },
      { say: { en: 'A rough map of the spectrum: below 60 Hz sub, felt more than heard; 60 to 250 bass and weight; 250 to 500 the "mud" or boxiness; 500 to 2k the honk; 2k to 5k presence and bite; above 5k sizzle and air.', he: 'מפה גסה של הספקטרום: מתחת ל־60 הרץ סאב, מורגש יותר משנשמע; 60 עד 250 בס ומשקל; 250 עד 500 ה"בוץ" או הקופסתיות; 500 עד 2k האפיות; 2k עד 5k נוכחות ונשיכה; מעל 5k זמזום ואוויר.' }, show: { text: { en: 'sub · bass · mud · honk · bite · air', he: 'סאב · בס · בוץ · אף · נשיכה · אוויר' } } },
      { say: { en: 'A shelf lifts everything above or below a point, like tilting a table. A high shelf adds air to the whole top end at once. Plain, then with a high shelf.', he: 'שלף מרים את כל מה שמעל או מתחת לנקודה, כמו להטות שולחן. היי־שלף מוסיף אוויר לכל הקצה העליון בבת אחת. רגיל, ואז עם היי־שלף.' }, play: ab(fx('loop', {}), fx('loop', { eq: [{ type: 'highshelf', freq: 6000, gain: 9 }] })) },
      { say: { en: 'Cutting is often cleaner than boosting. Instead of adding highs to make a mix clear, take out some low mids around 300 Hz. Plain, then with that cut.', he: 'חיתוך הוא הרבה פעמים נקי יותר מהגברה. במקום להוסיף גבוהים כדי שהמיקס יהיה ברור, הורידו קצת מהאמצע הנמוך סביב 300 הרץ. רגיל, ואז עם החיתוך.' }, play: ab(fx('loop', {}), fx('loop', { eq: [{ type: 'peaking', freq: 300, gain: -9, q: 1 }] })) },
      { say: { en: 'Engineers find problems with "boost and sweep": boost a narrow band hard, move it until the ugly ringing jumps out, then cut there. Here is a boost at 300 Hz, 1 kHz and 5 kHz on a voice.', he: 'טכנאים מוצאים בעיות בשיטת "להגביר ולסרוק": מגבירים פס צר בחוזקה, מזיזים אותו עד שהצלצול המכוער קופץ, ואז חותכים שם. הנה הגברה ב־300 הרץ, 1 קילו־הרץ ו־5 קילו־הרץ על קול.' }, play: [fx('voice', boost(300)), fx('voice', boost(1000)), fx('voice', boost(5000))], show: { text: { en: '300 · 1k · 5k', he: '300 · 1k · 5k' } } },
      { say: { en: 'The loudness trap: a louder version almost always sounds "better". That is why every comparison here is level-matched. When you EQ your own mix, match the levels before you judge.', he: 'מלכודת העוצמה: גרסה חזקה יותר כמעט תמיד נשמעת "טובה יותר". לכן כל השוואה כאן מותאמת בעוצמה. כשאתם עושים EQ למיקס שלכם, השוו עוצמות לפני ששופטים.' } },
      { say: { en: 'The common mistake is boosting everything until nothing stands out. Small moves of 2 or 3 dB go a long way. To keep: name the band — mud, honk, bite, air — then cut first and boost second.', he: 'הטעות הנפוצה היא להגביר הכול עד ששום דבר לא בולט. תזוזות קטנות של 2 או 3 דציבל עושות הרבה. מה לזכור: תנו שם לפס — בוץ, אף, נשיכה, אוויר — ואז קודם חותכים ורק אחר כך מגבירים.' }, show: { text: { en: 'name it · cut first', he: 'לתת שם · קודם לחתוך' } } },
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
    more: [
      { say: { en: 'The names say what passes through. A high-pass lets the highs through and removes the lows — so it is also called a low-cut. A low-pass is a high-cut. The two names describe the same filter from opposite sides.', he: 'השמות אומרים מה עובר. היי־פאס נותן לגבוהים לעבור ומוריד את הנמוכים — ולכן קוראים לו גם לואו־קאט. לואו־פאס הוא היי־קאט. שני השמות מתארים את אותו פילטר משני הצדדים.' }, show: { text: { en: 'high-pass = low-cut · low-pass = high-cut', he: 'היי־פאס = לואו־קאט · לואו־פאס = היי־קאט' } } },
      { say: { en: 'A filter does not cut like a wall; it slopes. The slope is measured in decibels per octave — 12 or 24 dB is common. Resonance, or Q, adds a peak right at the cut-off. Gentle, then resonant.', he: 'פילטר לא חותך כמו קיר; הוא משתפע. השיפוע נמדד בדציבלים לאוקטבה — 12 או 24 דציבל זה נפוץ. רזוננס, או Q, מוסיף פסגה בדיוק בתדר החיתוך. עדין, ואז רזוננטי.' }, play: ab(fx('pink', { eq: [{ type: 'lowpass', freq: 1000, q: 0.7 }] }), fx('pink', { eq: [{ type: 'lowpass', freq: 1000, q: 8 }] })) },
      { say: { en: 'Both together make a band-pass. Keep roughly 300 Hz to 3.4 kHz and a voice sounds like an old telephone line — a favourite effect for intros and bridges.', he: 'שניהם ביחד יוצרים בנד־פאס. משאירים בערך 300 הרץ עד 3.4 קילו־הרץ, וקול נשמע כמו קו טלפון ישן — אפקט אהוב בפתיחות ובגשרים.' }, play: ab(fx('voice', {}), fx('voice', { eq: [{ type: 'highpass', freq: 300, q: 0.9 }, { type: 'lowpass', freq: 3400, q: 0.9 }] })) },
      { say: { en: 'In mixing, a gentle high-pass on nearly everything except kick and bass clears out rumble nobody needs — on a vocal, often somewhere around 80 to 100 Hz. A low-pass pushes a sound further back.', he: 'במיקס, היי־פאס עדין כמעט על הכול חוץ מהקיק והבס מנקה רעמים שאף אחד לא צריך — על שירה, בדרך כלל סביב 80 עד 100 הרץ. לואו־פאס דוחף סאונד אחורה.' } },
      { say: { en: 'In dance music, a build-up often sweeps a high-pass upward until the track sounds thin, and the drop slams the lows back in. Filtered, then full.', he: 'במוזיקת דאנס, בילדאפ מרים לעיתים קרובות היי־פאס עד שהטרק נשמע דק, והדרופ מחזיר את הנמוכים בבום. מסונן, ואז מלא.' }, play: [fx('loop', { eq: [{ type: 'highpass', freq: 2000, q: 0.9 }] }), fx('loop', {})] },
      { say: { en: 'To estimate a cut-off, ask what is still there. A low-pass: what is the brightest thing you hear? A high-pass: what is the lowest? Compare it with your frequency landmarks.', he: 'כדי להעריך תדר חיתוך, שאלו מה עוד נשאר. בלואו־פאס: מה הדבר הכי בהיר שאתם שומעים? בהיי־פאס: מה הכי נמוך? השוו לנקודות הציון של התדרים.' }, play: ab(fx('pink', { eq: [{ type: 'highpass', freq: 500, q: 0.9 }] }), fx('pink', { eq: [{ type: 'highpass', freq: 4000, q: 0.9 }] })) },
      { say: { en: 'The common mistake is mixing up the names. Say what passes, not what is cut. To keep: thin means the lows are gone, muffled means the highs are gone, and the slope and resonance shape the edge.', he: 'הטעות הנפוצה היא להתבלבל בשמות. אמרו מה עובר, לא מה נחתך. מה לזכור: דק פירושו שהנמוכים נעלמו, עמום פירושו שהגבוהים נעלמו, והשיפוע והרזוננס מעצבים את הקצה.' }, show: { text: { en: 'thin · muffled', he: 'דק · עמום' } } },
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
    more: [
      { say: { en: 'Hertz counts vibrations per second. Human hearing spans roughly 20 Hz to 20 kHz, and the top end drops with age. Each doubling is an octave, so the whole range is about ten octaves.', he: 'הרץ סופר תנודות בשנייה. השמיעה האנושית משתרעת בערך מ־20 הרץ עד 20 קילו־הרץ, והקצה העליון יורד עם הגיל. כל הכפלה היא אוקטבה, כך שכל הטווח הוא בערך עשר אוקטבות.' }, show: { text: { en: '20 Hz … 20 kHz ≈ 10 octaves', he: '20 הרץ … 20 קילו־הרץ ≈ 10 אוקטבות' } } },
      { say: { en: 'Musical pitch is frequency too. The tuning A, A4, is 440 Hz; the A an octave up is 880. Listen to the doubling.', he: 'גם גובה צליל הוא תדר. לה של הכיוון, A4, הוא 440 הרץ; הלה שאוקטבה מעליו הוא 880. הקשיבו להכפלה.' }, play: [fx('sine', {}, { sineHz: 440, level: true }), fx('sine', {}, { sineHz: 880, level: true })], show: { text: { en: 'A4 440 · A5 880', he: 'A4 440 · A5 880' } } },
      { say: { en: 'Some real-world numbers: the low E of a bass guitar is about 41 Hz, of a guitar about 82 Hz, and the top C of a piano about 4186 Hz. Cymbals and breath live far above that.', he: 'כמה מספרים מהעולם: מי הנמוך של גיטרה בס הוא בערך 41 הרץ, של גיטרה בערך 82 הרץ, והדו העליון של פסנתר בערך 4186 הרץ. מצלתיים ונשימה גרים הרבה מעל זה.' }, show: { text: { en: 'bass E 41 · guitar E 82 · piano C8 4186', he: 'בס 41 · גיטרה 82 · פסנתר 4186' } } },
      { say: { en: 'A real note is not one frequency but a stack: the fundamental plus harmonics at 2, 3, 4 times and more. Timbre lives in those harmonics, which is why EQ above a note\'s pitch still changes it.', he: 'צליל אמיתי הוא לא תדר אחד אלא ערימה: היסודי ועוד הרמוניים בפי 2, 3, 4 ויותר. הגוון גר בהרמוניים האלה, ולכן EQ מעל גובה הצליל עדיין משנה אותו.' } },
      { say: { en: 'More landmarks to learn: 125 Hz a deep thump, 500 Hz body, 2 kHz a nasal edge, 8 kHz a thin sizzle. Each is two octaves from the next.', he: 'עוד נקודות ציון ללמוד: 125 הרץ חבטה עמוקה, 500 הרץ גוף, 2 קילו־הרץ קצה אפי, 8 קילו־הרץ זמזום דק. כל אחת רחוקה שתי אוקטבות מהבאה.' }, play: [fx('sine', {}, { sineHz: 125, level: true }), fx('sine', {}, { sineHz: 500, level: true }), fx('sine', {}, { sineHz: 2000, level: true }), fx('sine', {}, { sineHz: 8000, level: true })], show: { text: { en: '125 · 500 · 2k · 8k', he: '125 · 500 · 2k · 8k' } } },
      { say: { en: 'Your ears are most sensitive around 2 to 5 kHz. At the same level, a tone there sounds louder than one at 125 Hz, so judge by height, not by loudness.', he: 'האוזניים הכי רגישות סביב 2 עד 5 קילו־הרץ. באותה עוצמה, צליל שם נשמע חזק יותר מצליל ב־125 הרץ, אז שפטו לפי הגובה, לא לפי העוצמה.' }, play: [fx('sine', {}, { sineHz: 125, level: true }), fx('sine', {}, { sineHz: 3000, level: true })] },
      { say: { en: 'The common mistake is an octave error: pure tones are hard to place, and 1 kHz and 2 kHz can feel alike. Decide the octave first, then fine-tune. To keep: doubling is an octave, and four landmarks cover the map.', he: 'הטעות הנפוצה היא טעות אוקטבה: קשה למקם צלילים טהורים, ו־1 קילו־הרץ ו־2 קילו־הרץ יכולים להרגיש דומים. החליטו קודם על האוקטבה, ואז דייקו. מה לזכור: הכפלה היא אוקטבה, וארבע נקודות ציון מכסות את המפה.' }, show: { text: { en: '×2 = octave', he: '×2 = אוקטבה' } } },
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
    more: [
      { say: { en: 'Reverb is thousands of reflections. The first few, the early reflections, tell your ear the shape and size of the room; then they blur into a smooth tail. Decay time is how long that tail takes to fade by 60 dB.', he: 'ריוורב הוא אלפי החזרים. הראשונים, ההחזרים המוקדמים, מספרים לאוזן את הצורה והגודל של החלל; אחר כך הם מתמזגים לזנב חלק. זמן הדעיכה הוא כמה זמן לוקח לזנב לרדת ב־60 דציבל.' }, play: ab(fx('drums', { reverb: { decay: 0.8, mix: 0.4 } }), fx('drums', { reverb: { decay: 3, mix: 0.4 } })), show: { text: { en: 'decay 0.8 s · 3 s', he: 'דעיכה 0.8 ש׳ · 3 ש׳' } } },
      { say: { en: 'Pre-delay is the gap before the reverb starts. In a big hall the walls are far away, so the first reflections arrive later. A little pre-delay also keeps a voice clear in front of its own reverb.', he: 'פרי־דיליי הוא הרווח לפני שהריוורב מתחיל. באולם גדול הקירות רחוקים, אז ההחזרים הראשונים מגיעים מאוחר יותר. קצת פרי־דיליי גם שומר על הקול ברור מלפני הריוורב של עצמו.' }, play: ab(fx('drums', { reverb: { decay: 1.6, mix: 0.5 } }), fx('drums', { reverb: { decay: 1.6, mix: 0.5, predelay: 0.12 } })), show: { text: { en: 'pre-delay 0 · 120 ms', he: 'פרי־דיליי 0 · 120 מ״ש' } } },
      { say: { en: 'The wet/dry mix sets the distance. Little reverb puts a sound close to you; a lot pushes it to the back of the room. Close, then far.', he: 'מיקס ה־wet/dry קובע את המרחק. מעט ריוורב שם סאונד קרוב אליכם; הרבה דוחף אותו לסוף החדר. קרוב, ואז רחוק.' }, play: ab(fx('voice', { reverb: { decay: 1.5, mix: 0.12 } }), fx('voice', { reverb: { decay: 1.5, mix: 0.6 } })) },
      { say: { en: 'Delay comes in flavours. Slapback is one quick repeat, about a tenth of a second, the sound of 1950s rockabilly vocals. Longer delays with feedback repeat and fade.', he: 'לדיליי יש טעמים. סלאפבק הוא חזרה אחת מהירה, בערך עשירית שנייה, הסאונד של שירת רוקבילי משנות ה־50. דיליי ארוך יותר עם פידבק חוזר ודועך.' }, play: [fx('voice', { delay: { time: 0.1, feedback: 0.05, mix: 0.45 } }), fx('voice', { delay: { time: 0.375, feedback: 0.45, mix: 0.45 } })] },
      { say: { en: 'Delays are usually timed to the song. A quarter note lasts 60,000 divided by the BPM, in milliseconds: 500 ms at 120 BPM, so an eighth is 250 and a dotted eighth 375.', he: 'דיליי בדרך כלל מתוזמן לשיר. רבע נמשך 60,000 חלקי ה־BPM, במילישניות: 500 מ״ש ב־120 BPM, אז שמינית היא 250 ושמינית עם נקודה 375.' }, show: { text: { en: '120 BPM: ♩ 500 · ♪ 250 · ♪. 375', he: '120 BPM: ♩ 500 · ♪ 250 · ♪. 375' } } },
      { say: { en: 'To tell them apart, listen after the sound stops. Separate, countable copies mean delay; a smooth wash with no distinct repeats means reverb.', he: 'כדי להבדיל ביניהם, הקשיבו אחרי שהסאונד נעצר. עותקים נפרדים שאפשר לספור פירושם דיליי; שטיפה חלקה בלי חזרות ברורות פירושה ריוורב.' }, play: [fx('voice', { delay: { time: 0.25, feedback: 0.4, mix: 0.5 } }), fx('voice', { reverb: { decay: 2, mix: 0.5 } })] },
      { say: { en: 'The common mistake is too much reverb: every track gets a big room and the mix turns to mud. Use one or two shared spaces. To keep: decay is size, pre-delay is distance to the walls, mix is how far back.', he: 'הטעות הנפוצה היא יותר מדי ריוורב: כל ערוץ מקבל חלל גדול והמיקס הופך לבוץ. השתמשו בחלל משותף אחד או שניים. מה לזכור: דעיכה היא גודל, פרי־דיליי הוא המרחק לקירות, מיקס הוא כמה רחוק אחורה.' }, show: { text: { en: 'decay · pre-delay · mix', he: 'דעיכה · פרי־דיליי · מיקס' } } },
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
    more: [
      { say: { en: 'Pan works by level: send more of a sound to one speaker and it appears on that side. Equal in both and it seems to float in the middle — the "phantom centre". Hard left, then just slightly left.', he: 'פאן עובד לפי עוצמה: שולחים יותר מהסאונד לרמקול אחד והוא מופיע בצד הזה. שווה בשניהם והוא נראה כאילו מרחף באמצע — ה"מרכז הפנטום". שמאלה עד הסוף, ואז רק קצת שמאלה.' }, play: [fx('voice', { pan: -1 }), fx('voice', { pan: -0.3 })], show: { text: { en: 'L100 · L30', he: 'L100 · L30' } } },
      { say: { en: 'Your ears locate sounds by small differences between them, in level and in arrival time. Headphones exaggerate panning and put the centre inside your head; speakers put it in front of you.', he: 'האוזניים ממקמות סאונד לפי הבדלים קטנים ביניהן, בעוצמה ובזמן ההגעה. אוזניות מגזימות את הפאן ושמות את המרכז בתוך הראש; רמקולים שמים אותו מולכם.' } },
      { say: { en: 'A common mix layout: kick, snare, bass and lead vocal in the centre; guitars, keys and backing vocals out to the sides. Here the keys move to the left while drums and bass stay in the middle.', he: 'פריסת מיקס נפוצה: קיק, סנר, בס ושירה ראשית במרכז; גיטרות, קלידים וקולות ליווי לצדדים. כאן הקלידים זזים שמאלה, והתופים והבס נשארים באמצע.' }, play: [placed({ keys: -0.85 })], show: { text: { en: 'keys L · drums + bass C', he: 'קלידים L · תופים + בס במרכז' } } },
      { say: { en: 'Width is the difference between left and right. When both are identical the sound is mono; the more they differ, the wider it gets. Mono, normal, wide.', he: 'רוחב הוא ההבדל בין שמאל לימין. כששניהם זהים, הסאונד מונו; ככל שהם שונים יותר, הוא רחב יותר. מונו, רגיל, רחב.' }, play: [fx('loop', { width: 0 }), fx('loop', { width: 1 }), fx('loop', { width: 1.8 })] },
      { say: { en: 'Many listeners hear in mono: one phone speaker, a club system, a shop ceiling. Very wide tricks can thin out or vanish there, so engineers check every mix in mono too.', he: 'הרבה מאזינים שומעים במונו: רמקול טלפון אחד, מערכת במועדון, תקרה בחנות. טריקים רחבים מאוד יכולים להידלדל או להיעלם שם, ולכן טכנאים בודקים כל מיקס גם במונו.' } },
      { say: { en: 'To hear width, compare the edges with the middle. If the sound reaches your ears from the sides, it is wide; if it stays in one spot between them, it is narrow.', he: 'כדי לשמוע רוחב, השוו את הקצוות לאמצע. אם הסאונד מגיע לאוזניים מהצדדים, הוא רחב; אם הוא נשאר בנקודה אחת ביניהן, הוא צר.' }, play: ab(fx('loop', { width: 0.3 }), fx('loop', { width: 1.6 })) },
      { say: { en: 'The common mistake is making everything wide, which leaves no focus. Width comes from contrast: a solid centre makes the sides feel wider. To keep: pan places, width spreads, and the centre holds the song.', he: 'הטעות הנפוצה היא להפוך הכול לרחב, ואז אין מוקד. רוחב נוצר מניגוד: מרכז מוצק גורם לצדדים להרגיש רחבים יותר. מה לזכור: פאן ממקם, רוחב פורש, והמרכז מחזיק את השיר.' }, show: { text: { en: 'pan · width · centre', he: 'פאן · רוחב · מרכז' } } },
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
    more: [
      { say: { en: 'Dynamic range is the distance between the loudest and quietest moments. A compressor shrinks it: above the threshold, the ratio decides how much gets through. At 4:1, 8 dB over the threshold comes out as 2 dB over.', he: 'טווח דינמי הוא המרחק בין הרגעים החזקים לשקטים. קומפרסור מכווץ אותו: מעל הסף (threshold), היחס (ratio) קובע כמה עובר. ב־4:1, שמונה דציבל מעל הסף יוצאים כשניים מעליו.' }, show: { text: { en: '4:1 · +8 dB in → +2 dB out', he: '4:1 · 8 נכנסים ← 2 יוצאים' } } },
      { say: { en: 'Gentle and heavy: a low ratio smooths, a high ratio flattens. Then make-up gain brings the level back up. Here is 2:1, then 10:1, at the same loudness.', he: 'עדין וכבד: יחס נמוך מחליק, יחס גבוה משטיח. אחר כך גיין פיצוי (make-up) מחזיר את העוצמה. הנה 2:1, ואז 10:1, באותה עוצמה.' }, play: ab(fx('drums', { comp: { threshold: -24, ratio: 2, attack: 0.01, release: 0.1 } }), fx('drums', { comp: { threshold: -32, ratio: 10, attack: 0.002, release: 0.08 } })) },
      { say: { en: 'Attack decides the punch. A fast attack grabs the very start of each hit and dulls it; a slower one lets the click through and squeezes only the body. Fast, then slow.', he: 'האטאק קובע את הפאנץ׳. אטאק מהיר תופס את ההתחלה של כל מכה ומקהה אותה; איטי יותר נותן לקליק לעבור ולוחץ רק את הגוף. מהיר, ואז איטי.' }, play: ab(fx('drums', { comp: { threshold: -30, ratio: 8, attack: 0.001, release: 0.1 } }), fx('drums', { comp: { threshold: -30, ratio: 8, attack: 0.04, release: 0.1 } })) },
      { say: { en: 'Release is how fast it lets go. Very fast release can make the background swell up between hits — "pumping". Some styles use it on purpose; elsewhere it is a fault.', he: 'ריליס הוא כמה מהר הקומפרסור משחרר. ריליס מהיר מאוד יכול לגרום לרקע להתנפח בין המכות — "פאמפינג". יש סגנונות שמשתמשים בזה בכוונה; במקומות אחרים זו תקלה.' }, play: [fx('loop', { comp: { threshold: -34, ratio: 12, attack: 0.002, release: 0.05 } })] },
      { say: { en: 'A limiter is a compressor with a very high ratio and a ceiling no peak may pass. Mastering uses it to make a track loud — too much, and the music loses its life.', he: 'לימיטר הוא קומפרסור עם יחס גבוה מאוד ותקרה שאף שיא לא עובר. במאסטרינג משתמשים בו כדי שהטרק יהיה חזק — יותר מדי, והמוזיקה מאבדת את החיים שלה.' } },
      { say: { en: 'Distortion is a family, from subtle to wild: saturation adds warmth, overdrive grit, fuzz a buzzing square edge. All of them add harmonics, so listen for new fizz on top. Light, medium, full.', he: 'דיסטורשן היא משפחה, מעדין ועד פרוע: סטורציה מוסיפה חום, אוברדרייב לכלוך, פאז קצה מזמזם ומרובע. כולם מוסיפים הרמוניים, אז הקשיבו לזמזום חדש למעלה. קל, בינוני, מלא.' }, play: [fx('voice', { drive: 0.2 }), fx('voice', { drive: 0.5 }), fx('voice', { drive: 1 })] },
      { say: { en: 'Level itself: about 1 dB is close to the smallest change most people notice. Here pink noise, then the same 2 dB louder. Louder almost always sounds better, so compare at equal level.', he: 'והעוצמה עצמה: בערך דציבל אחד קרוב לשינוי הקטן ביותר שרוב האנשים מבחינים בו. הנה רעש ורוד, ואז אותו דבר חזק ב־2 דציבל. חזק יותר כמעט תמיד נשמע טוב יותר, אז השוו באותה עוצמה.' }, play: ab(fx('pink', {}, { level: true }), fx('pink', { gainDb: 2 }, { level: true })) },
      { say: { en: 'The common mistake is over-compressing until every hit is the same size. To keep: threshold says when, ratio how much, attack keeps or kills the punch, release sets the breathing; drive adds harmonics.', he: 'הטעות הנפוצה היא לדחוס עד שכל מכה באותו גודל. מה לזכור: הסף אומר מתי, היחס כמה, האטאק שומר או הורג את הפאנץ׳, הריליס קובע את הנשימה; דרייב מוסיף הרמוניים.' }, show: { text: { en: 'threshold · ratio · attack · release', he: 'סף · יחס · אטאק · ריליס' } } },
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

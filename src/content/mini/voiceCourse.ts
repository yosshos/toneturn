// Mini-lessons of the voice course's new families (VOICE_CURRICULUM): one short spoken lesson per new concept,
// played before a family's first level. Each says what is measured — and what is not (tone colour, vowels, words).

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** Notes one after another: [midi (−1 = rest; fractional = out of tune), seconds, velocity?]. */
function seq(notes: [number, number, number?][], tail = 0.2): Stimulus {
  let t = 0;
  const events: NoteEvent[] = [];
  for (const [midi, d, v] of notes) {
    if (midi >= 0) events.push({ midi, start: t, duration: d * 0.97, velocity: v ?? 0.68 });
    t += d;
  }
  return { kind: 'events', events, length: t + tail };
}
/** Clicks at a tempo, with notes on chosen beats (beats from 0; fractional = off-beats). */
function clicksAnd(bpm: number, beats: number, notes: number[], midi = 64, clickOn?: number[]): Stimulus {
  const b = 60 / bpm;
  const events: NoteEvent[] = [];
  for (let k = 0; k < beats; k++) if (!clickOn || clickOn.includes(k % 4)) events.push({ midi: 0, start: k * b, duration: 0.05, velocity: k % 4 === 0 ? 0.7 : 0.5, perc: k % 4 === 0 ? 'accent' : 'click' });
  for (const x of notes) events.push({ midi, start: x * b, duration: b * 0.35, velocity: 0.75 });
  events.sort((p, q) => p.start - q.start);
  return { kind: 'events', events, length: beats * b + 0.3 };
}
const swung = (n: number) => Array.from({ length: n }, (_, k) => [k, k + 2 / 3]).flat();
const note = (midi: number, duration: number): Stimulus => ({ kind: 'note', midi, duration });
/** Notes struck together. */
const chord = (midis: number[], d: number): Stimulus => ({ kind: 'events', events: midis.map((midi) => ({ midi, start: 0, duration: d, velocity: 0.55 })), length: d + 0.2 });

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ F1 breath + F3 registers
  {
    id: 'voice-breath',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'One breath, one smooth voice', he: 'נשימה אחת, קול אחד חלק' },
    takeaway: { en: 'Plan where you breathe, keep the note steady to the end of the breath, and cross your break without a crack.', he: 'מתכננים איפה נושמים, שומרים על הצליל יציב עד סוף הנשימה, ועוברים את המעבר בלי סדק.' },
    steps: [
      { say: { en: 'Hi {name}! A singer is judged at the end of the breath: does the note still stand still, or does it sink?', he: 'היי {name}! זמר נמדד בסוף הנשימה: האם הצליל עדיין עומד במקום, או שוקע?' }, play: [seq([[60, 2.2], [59.85, 0.6], [59.7, 0.6]])], show: { notes: [60], text: { en: 'steady → sinking', he: 'יציב ← שוקע' } } },
      { say: { en: 'So the last quarter of a long note counts double. Spend less air at the start, and the end stays easy.', he: 'לכן הרבע האחרון של צליל ארוך נחשב כפול. הוציאו פחות אוויר בהתחלה, והסוף נשאר קל.' }, play: [note(62, 3)], show: { text: { en: 'last quarter ×2', he: 'רבע אחרון ×2' } } },
      { say: { en: 'A breath is heard as a silence of a quarter second or more. In a breath plan you breathe at the marks, and only there.', he: 'נשימה נשמעת כשקט של רבע שנייה ומעלה. בתוכנית נשימה נושמים בסימנים, ורק שם.' }, play: [seq([[60, 0.6], [62, 0.6], [64, 0.6], [-1, 0.35], [65, 0.6], [64, 0.6], [62, 0.9]])], show: { text: { en: '♪ ♪ ♪ ’ ♪ ♪ ♪', he: '♪ ♪ ♪ ’ ♪ ♪ ♪' } } },
      { say: { en: 'Most voices have a spot where the sound wants to flip — the break. A slow siren on "oo" shows where yours is.', he: 'לרוב הקולות יש מקום שבו הצליל רוצה להתהפך — המעבר. סירנה איטית על "או" מראה איפה שלכם.' }, play: [seq([[57, 0.25], [59, 0.25], [61, 0.25], [63, 0.25], [65, 0.25], [67, 0.25], [69, 0.25], [71, 0.4]])] },
      { say: { en: 'The microphone hears a break as a sudden jump, a gap, or a sudden change in loudness. Chest, mix and head voice are real, but a phone cannot tell them apart — so only the smoothness counts.', he: 'המיקרופון שומע מעבר כקפיצה פתאומית, חור, או שינוי פתאומי בעוצמה. קול חזה, מעורב וראש קיימים, אבל טלפון לא מבחין ביניהם — לכן רק החלקות נחשבת.' }, show: { text: { en: 'smooth · bumpy · broke', he: 'חלק · מקרטע · נשבר' } } },
    ],
    more: [
      { say: { en: 'Breath support is not pushing. It is a slow, even release of air, so the note has fuel all the way to its end.', he: 'תמיכת נשימה זה לא לדחוף. זה שחרור איטי ואחיד של אוויר, כך שלצליל יש דלק עד הסוף.' }, play: [note(64, 3.5)] },
      { say: { en: 'Breathe low and quiet, through the nose or the mouth. A noisy gasp steals time from the music and dries the throat.', he: 'נושמים נמוך ובשקט, דרך האף או הפה. התנשפות רועשת גונבת זמן מהמוזיקה ומייבשת את הגרון.' } },
      { say: { en: 'Plan breaths where the words or the music pause — at the end of a phrase — never in the middle of a long note.', he: 'מתכננים נשימות איפה שהמילים או המוזיקה עוצרות — בסוף משפט — אף פעם לא באמצע צליל ארוך.' }, play: [seq([[60, 0.5], [62, 0.5], [64, 1], [-1, 0.4], [65, 0.5], [64, 0.5], [60, 1.2]])] },
      { say: { en: 'The levels grow from ten seconds on one note to twenty seconds on a fading phrase. Rest between takes.', he: 'השלבים גדלים מעשר שניות על צליל אחד לעשרים שניות על משפט שדועך. נחו בין טייק לטייק.' } },
      { say: { en: 'For the break, sing softer and on narrower vowels as you go up. Let the sound get lighter instead of louder.', he: 'במעבר, שירו חלש יותר ועל תנועות צרות יותר כשעולים. תנו לצליל להיות קל יותר במקום חזק יותר.' }, play: [seq([[62, 0.4, 0.7], [64, 0.4, 0.65], [66, 0.4, 0.6], [68, 0.4, 0.55], [70, 0.6, 0.5]])] },
      { say: { en: 'Never push to reach a high note. If it hurts or your voice is hoarse for days, rest — and see a voice doctor if it stays.', he: 'לעולם אל תדחפו כדי להגיע לצליל גבוה. אם כואב או שהקול צרוד ימים, נחו — ופנו לרופא קול אם זה נמשך.' } },
      { say: { en: "A common mistake is to take a huge breath and lock it in. Take a normal breath instead, and let it out slowly and evenly, like a long, quiet sigh.", he: "טעות נפוצה היא לקחת נשימה ענקית ולנעול אותה. קחו נשימה רגילה, ושחררו אותה לאט ובאופן אחיד, כמו אנחה ארוכה ושקטה." } },
      { say: { en: "To recap: steady to the end of the breath, breathe only where you planned, and cross the break lighter instead of louder.", he: "לסיכום: יציב עד סוף הנשימה, נושמים רק איפה שתכננו, ועוברים את המעבר קל יותר במקום חזק יותר." } },
    ],
  },
  // ------------------------------------------------------------------ F2 drift + F10 the singer's ear
  {
    id: 'voice-drift',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'In tune alone, in tune inside the chord', he: 'מדויק לבד, מדויק בתוך האקורד' },
    takeaway: { en: 'Keep the key in your ear when nothing plays, and find any chord tone by its name when a chord does.', he: 'שומרים את הסולם באוזן כששום דבר לא מנגן, ומוצאים כל צליל אקורד לפי שמו כשאקורד מנגן.' },
    steps: [
      { say: { en: 'Sing a song alone and the key slowly moves — usually down. That slow slide is called drift.', he: 'כששרים שיר לבד, הסולם זז לאט — לרוב למטה. ההחלקה האיטית הזאת נקראת זחילה.' }, play: [seq([[60, 0.5], [64, 0.5], [67, 0.5], [64, 0.5], [59.75, 0.9]])], show: { text: { en: 'start → end −25 ¢', he: 'התחלה ← סוף −25 ¢' } } },
      { say: { en: 'The app compares each phrase with the first one. Your notes inside a phrase are checked apart from that slide.', he: 'האפליקציה משווה כל משפט למשפט הראשון. הצלילים בתוך משפט נבדקים בנפרד מההחלקה.' }, show: { text: { en: 'drift · note error', he: 'זחילה · סטייה בצליל' } } },
      { say: { en: 'The trick: before a phrase ends, hear the home note in your head, then land on it.', he: 'הטריק: לפני שמשפט נגמר, שמעו את צליל הבית בראש, ואז נחתו עליו.' }, play: [seq([[60, 0.8], [-1, 0.3], [60, 0.8]])], show: { notes: [60], text: { en: 'home = home', he: 'בית = בית' } } },
      { say: { en: 'With a chord, the chord keeps sounding, one tone is missing, and you are asked for it by name: the 3rd, the 5th, the 7th.', he: 'עם אקורד, האקורד ממשיך להישמע, צליל אחד חסר, ומבקשים אותו לפי שמו: הטרצה, הקווינטה, הספטימה.' }, play: [chord([48, 55, 58], 1.8)], show: { notes: [48, 52, 55, 58], chord: true, text: { en: 'C7: the 3rd?', he: 'C7: הטרצה?' } } },
      { say: { en: 'Tensions are the jazz colours above the chord: the 9th, the 11th, the 13th. Here is a 9th on top of a major seventh chord.', he: 'מתחים הם צבעי הג׳אז מעל האקורד: הנונה, האונדצימה, הטרצדצימה. הנה נונה מעל אקורד מז׳ור ספט.' }, play: [chord([48, 52, 55, 59], 2), chord([48, 52, 55, 59, 62], 2)], show: { notes: [48, 52, 55, 59, 62], chord: true } },
    ],
    more: [
      { say: { en: 'Research on singing alone finds a median error of about twenty cents, and a clear drift in about one take in five. It is normal — and trainable.', he: 'מחקרים על שירה לבד מוצאים סטייה חציונית של כעשרים סנט, וזחילה ברורה בערך בטייק אחד מחמישה. זה רגיל — ואפשר לאמן את זה.' } },
      { say: { en: 'Fine tuning into a drone trains the same ear: the beating between your voice and the drone slows down and stops when you are exact.', he: 'כוונון עדין מול צליל מתמשך מאמן את אותה אוזן: הפעימות בין הקול לצליל המתמשך מאטות ונעלמות כשמדייקים.' }, play: [seq([[60, 1.4], [60.12, 1.4], [60, 1.4]])] },
      { say: { en: 'Sing the tonic again after a phrase, with nothing played between. If you come back flat, you were sinking on the way.', he: 'שירו שוב את הטוניקה אחרי משפט, בלי שום דבר שמתנגן ביניהם. אם חזרתם נמוך, שקעתם בדרך.' }, play: [seq([[60, 0.4], [62, 0.4], [64, 0.4], [65, 0.4], [67, 0.4], [64, 0.4], [60, 0.9]])] },
      { say: { en: 'In a chord, the 3rd tells major from minor and the 7th gives the jazz colour. Those two are the guide tones you will use in scat.', he: 'באקורד, הטרצה מבדילה בין מז׳ור למינור והספטימה נותנת את צבע הג׳אז. שני אלה הם הצלילים המנחים שתשתמשו בהם בסקאט.' } },
      { say: { en: 'Headphones help in every chord level: the chord stays out of the microphone, so only your voice is measured.', he: 'אוזניות עוזרות בכל שלב עם אקורד: האקורד לא נכנס למיקרופון, כך שנמדד רק הקול שלכם.' } },
      { say: { en: "A common mistake is to listen to yourself only. Keep listening to the key in your head, and compare every phrase ending with the very first note.", he: "טעות נפוצה היא להקשיב רק לעצמכם. המשיכו להקשיב לסולם בראש, והשוו כל סוף משפט לצליל הראשון." } },
      { say: { en: "To recap: drift is the slow slide of the key, note error is the tuning inside a phrase, and chord tones are found by name and settled fast.", he: "לסיכום: זחילה היא ההחלקה האיטית של הסולם, סטייה בצליל היא הכיוון בתוך משפט, וצלילי אקורד מוצאים לפי שם ומתייצבים עליהם מהר." } },
    ],
  },
  // ------------------------------------------------------------------ F4 dynamics + F5 jazz vibrato + F12 inflections
  {
    id: 'voice-dynamics',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'Shaping the sound', he: 'לעצב את הצליל' },
    takeaway: { en: 'Loudness steps, accents and arcs, a late narrow vibrato, scoops, falls and bends — each with a shape the microphone can see.', he: 'מדרגות עוצמה, הדגשות וקשתות, ויברטו מאוחר וצר, החלקות, נפילות וכיפופים — לכל אחד צורה שהמיקרופון רואה.' },
    steps: [
      { say: { en: 'Steps of loudness — soft, medium, loud — need a clear difference: about four decibels each.', he: 'מדרגות עוצמה — חלש, בינוני, חזק — צריכות הבדל ברור: כארבעה דציבל כל אחת.' }, play: [seq([[64, 0.8, 0.3], [64, 0.8, 0.55], [64, 0.8, 0.9]])], show: { text: { en: 'p → mf → f', he: 'p ← mf ← f' } } },
      { say: { en: 'An accent is one note clearly above its neighbours. A phrase has an arc: up to its peak note, then softer.', he: 'הדגשה היא צליל אחד שבולט מעל שכניו. למשפט יש קשת: עולה לצליל השיא, ואז רך יותר.' }, play: [seq([[60, 0.4, 0.4], [62, 0.4, 0.5], [64, 0.4, 0.65], [67, 0.6, 0.9], [64, 0.4, 0.6], [62, 0.4, 0.45], [60, 0.6, 0.35]])] },
      { say: { en: 'There is no absolute volume on a phone: only the change inside one take counts. Keep it still, about a forearm away.', he: 'אין בטלפון עוצמה מוחלטת: נחשב רק השינוי בתוך טייק אחד. השאירו אותו במקום, במרחק של אמה בערך.' } },
      { say: { en: 'Jazz singers start a long note straight and let a narrow vibrato bloom near its end — about 15 to 40 cents each way.', he: 'זמרי ג׳אז מתחילים צליל ארוך ישר, ונותנים לוויברטו צר לפרוח לקראת הסוף — בערך 15 עד 40 סנט לכל צד.' }, play: [note(64, 3)], show: { text: { en: 'straight —— ∿∿', he: 'ישר —— ∿∿' } } },
      { say: { en: 'A scoop starts a little below and arrives fast. A fall drops away at the end. The blue-note bend slides from the minor third up toward the major third.', he: 'החלקה פנימה מתחילה קצת מתחת ומגיעה מהר. נפילה צונחת בסוף. כיפוף הבלוז מחליק מהטרצה הקטנה למעלה לכיוון הגדולה.' }, play: [seq([[62.5, 0.06], [63.3, 0.06], [64, 1], [-1, 0.3], [64, 0.9], [63, 0.08], [61, 0.08], [59, 0.1]])] },
    ],
    more: [
      { say: { en: 'Dynamics live in the breath, not the throat. A crescendo is more air with the same shape of the mouth.', he: 'הדינמיקה נמצאת בנשימה, לא בגרון. קרשנדו זה יותר אוויר עם אותה צורת פה.' }, play: [seq([[62, 0.5, 0.3], [62, 0.5, 0.45], [62, 0.5, 0.6], [62, 0.5, 0.8]])] },
      { say: { en: 'Keep the pitch still while the loudness moves. Most singers go sharp when louder and flat when softer.', he: 'שמרו על הגובה במקום בזמן שהעוצמה זזה. רוב הזמרים עולים כשמתחזקים ויורדים כשנחלשים.' } },
      { say: { en: 'In a song, the chorus usually lifts: the app checks that it is at least three decibels louder than the verse.', he: 'בשיר, הפזמון בדרך כלל מתרומם: האפליקציה בודקת שהוא חזק לפחות בשלושה דציבל מהבית.' } },
      { say: { en: 'Vibrato on purpose: on the last note of a phrase, never on every note. In close harmony, none at all, so the chord rings clean.', he: 'ויברטו בכוונה: על הצליל האחרון של משפט, לא על כל צליל. בהרמוניה צפופה, בכלל לא, כדי שהאקורד יצלצל נקי.' }, play: [seq([[60, 0.4], [62, 0.4], [64, 0.4], [65, 1.6]])] },
      { say: { en: 'A ghost note is there but much softer — eight decibels or more below its neighbours. It makes a line swing.', he: 'צליל רפאים קיים אבל חלש בהרבה — שמונה דציבל ומעלה מתחת לשכניו. הוא נותן לקו סווינג.' }, play: [seq([[60, 0.4, 0.8], [62, 0.4, 0.2], [64, 0.6, 0.8]])] },
      { say: { en: 'Tone colour — breathy, bright, twang, belt — is real, but a phone microphone cannot measure it fairly, so it is never scored.', he: 'צבע הצליל — אוורירי, בהיר, אנפופי, בלט — קיים, אבל מיקרופון של טלפון לא מודד אותו בהגינות, לכן הוא אף פעם לא מקבל ציון.' } },
      { say: { en: "To recap: loudness is relative to you in one take, accents and arcs give a phrase its shape, and jazz vibrato comes late, narrow and on purpose.", he: "לסיכום: העוצמה יחסית אליכם בטייק אחד, הדגשות וקשתות נותנות למשפט צורה, וויברטו של ג׳אז מגיע מאוחר, צר ובכוונה." } },
    ],
  },
  // ------------------------------------------------------------------ F7 time feel + F6 bebop lines
  {
    id: 'voice-time',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'Where your notes land in time', he: 'איפה הצלילים נוחתים בזמן' },
    takeaway: { en: 'On top, laid back or rushing — judged from the average of eight notes or more, after your phone delay is removed.', he: 'על הפעמה, מאחוריה או ממהרים — לפי הממוצע של שמונה צלילים ומעלה, אחרי שמנכים את השהיית הטלפון.' },
    steps: [
      { say: { en: 'Sing "dah" right with the click. Your phone hears you a little late, so first we measure that delay once.', he: 'שירו "דה" בדיוק עם הקליק. הטלפון שומע אתכם קצת באיחור, לכן קודם מודדים את ההשהיה פעם אחת.' }, play: [clicksAnd(90, 8, [4, 5, 6, 7])], show: { text: { en: '♩ ♩ ♩ ♩', he: '♩ ♩ ♩ ♩' } } },
      { say: { en: 'Rests and pickups: come in on the "and", exactly. Anticipations push the next downbeat an eighth early.', he: 'הפסקות וכניסות: נכנסים על ה"ו", בדיוק. הקדמה דוחפת את הפעמה הבאה שמינית מוקדם יותר.' }, play: [clicksAnd(90, 8, [1.5, 3, 5.5, 7])] },
      { say: { en: 'Swing eighths are long-short: "doo-bah". The clicks move to 2 and 4, like a jazz drummer\'s hi-hat.', he: 'שמיניות בסווינג הן ארוך־קצר: "דו־בה". הקליקים עוברים ל־2 ול־4, כמו המצילה של מתופף ג׳אז.' }, play: [clicksAnd(110, 8, swung(8), 64, [1, 3])], show: { text: { en: 'long-short ×8', he: 'ארוך־קצר ×8' } } },
      { say: { en: 'Laid back means a little behind every click, evenly. One note is never judged — a sung onset is only good to a few hundredths of a second.', he: 'מאחורי הפעמה זה קצת אחרי כל קליק, באופן אחיד. צליל אחד אף פעם לא נשפט — תחילת צליל שר מדויקת רק לכמה מאיות שנייה.' }, play: [clicksAnd(90, 8, [4.15, 5.15, 6.15, 7.15])] },
      { say: { en: 'The inner clock: the click stops for four bars. Keep singing on the beat; it comes back on a downbeat and tells you where you are.', he: 'השעון הפנימי: הקליק נעלם לארבע תיבות. המשיכו לשיר על הפעמה; הוא חוזר על פעמה ראשונה ומראה איפה אתם.' } },
    ],
    more: [
      { say: { en: 'Why calibrate? A phone adds tens of milliseconds between your voice and the app. Bluetooth headphones add two hundred or more — use wired ones, or calibrate with them.', he: 'למה לכייל? הטלפון מוסיף עשרות אלפיות שנייה בין הקול לאפליקציה. אוזניות אלחוטיות מוסיפות מאתיים ויותר — השתמשו בחוטיות, או כיילו איתן.' } },
      { say: { en: 'Articulate for timing work: "dah", "doo-bah". A clear consonant gives a clear start; a legato vowel blurs it.', he: 'בתרגילי זמן, בטאו בבירור: "דה", "דו־בה". עיצור ברור נותן התחלה ברורה; תנועה בלגאטו מטשטשת אותה.' }, play: [clicksAnd(100, 4, [0, 1, 2, 3])] },
      { say: { en: 'A swing ratio of two to one is a triplet feel. At fast tempos players flatten it — the app expects that.', he: 'יחס סווינג של שניים לאחד הוא תחושת טריולה. בטמפו מהיר הנגנים משטחים אותו — והאפליקציה מצפה לזה.' }, play: [clicksAnd(160, 8, swung(8), 64, [1, 3])] },
      { say: { en: 'Back-phrasing, the way Billie Holiday did it: start a phrase late, then catch up so the last note lands on its beat.', he: 'פרייזינג מאוחר, כמו שבילי הולידיי עשתה: מתחילים משפט באיחור, ואז משיגים כך שהצליל האחרון נוחת על הפעמה שלו.' }, play: [clicksAnd(90, 8, [4.6, 5.3, 6, 7])] },
      { say: { en: 'Bebop lines put chord tones on the beats and chromatic notes between them, swung. Each note is checked for pitch and for its start.', he: 'קווי ביבופ שמים צלילי אקורד על הפעמות וצלילים כרומטיים ביניהם, בסווינג. כל צליל נבדק לגובה ולהתחלה שלו.' }, play: [seq([[62, 0.36], [61, 0.18], [62, 0.36], [65, 0.18], [69, 0.36], [68, 0.18], [69, 0.36], [72, 0.18], [71, 0.8]])] },
      { say: { en: "A common mistake is to rush the notes after a rest. Feel the rest as part of the music, count it, and come in on its far edge.", he: "טעות נפוצה היא למהר בצלילים שאחרי הפסקה. הרגישו את ההפסקה כחלק מהמוזיקה, ספרו אותה, והיכנסו בקצה הרחוק שלה." } },
      { say: { en: "To recap: calibrate once, articulate clearly, aim for an even average, and trust the inner clock when the click goes quiet.", he: "לסיכום: מכיילים פעם אחת, מבטאים בבירור, מכוונים לממוצע אחיד, וסומכים על השעון הפנימי כשהקליק שותק." } },
    ],
  },
  // ------------------------------------------------------------------ F13 songs with the band
  {
    id: 'voice-band',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'A song with the band, phrase by phrase', he: 'שיר עם להקה, משפט אחר משפט' },
    takeaway: { en: 'Every phrase gets a score — pitch, time, breath. The weakest one is looped slower until it passes, then the whole song again.', he: 'כל משפט מקבל ציון — גובה, זמן, נשימה. החלש מכולם חוזר לאט יותר עד שהוא עובר, ואז כל השיר שוב.' },
    steps: [
      { say: { en: 'Every great jazz singer can sing a simple song perfectly. Start here: the band plays, the notes scroll, your voice is drawn on top.', he: 'כל זמר ג׳אז גדול יודע לשיר שיר פשוט בצורה מושלמת. מתחילים כאן: הלהקה מנגנת, התווים זזים, והקול שלכם מצויר מעליהם.' }, play: [seq([[64, 0.5], [64, 0.5], [62, 0.5], [60, 0.5], [62, 1], [55, 1]])] },
      { say: { en: 'A phrase is half pitch, a third time and a fifth breath: no gap inside it where the music has none.', he: 'משפט הוא חצי גובה, שליש זמן וחמישית נשימה: בלי הפסקה בתוכו איפה שאין במוזיקה.' }, show: { text: { en: 'pitch 50 · time 30 · breath 20', he: 'גובה 50 · זמן 30 · נשימה 20' } } },
      { say: { en: 'The weakest phrase is looped a little slower. When it passes, try it at full tempo, then sing the whole song again.', he: 'המשפט החלש חוזר קצת לאט יותר. כשהוא עובר, נסו אותו בקצב המלא, ואז שירו שוב את כל השיר.' }, play: [seq([[60, 0.6], [62, 0.6], [64, 0.6], [62, 1.2]])] },
      { say: { en: 'Words are never graded — sing "la", numbers or names. With headphones the band stays out of the microphone.', he: 'מילים אף פעם לא נבדקות — שירו "לה", מספרים או שמות. עם אוזניות הלהקה לא נכנסת למיקרופון.' } },
      { say: { en: 'The songs are ours, written for the app, or traditional tunes that belong to everyone — with a grown-up band: pop, bossa, ballad, rock.', he: 'השירים שלנו, שנכתבו עבור האפליקציה, או מנגינות מסורתיות ששייכות לכולם — עם להקה בוגרת: פופ, בוסה, בלדה, רוק.' }, play: [chord([48, 55, 64], 1.2), chord([43, 55, 62], 1.2)] },
    ],
    more: [
      { say: { en: 'The same five meters follow you from a folk song to a ballad: pitch, time, breath, dynamics and a steady tone.', he: 'אותם חמישה מדדים מלווים אתכם משיר עם ועד בלדה: גובה, זמן, נשימה, דינמיקה וצליל יציב.' } },
      { say: { en: 'Time is checked on clear notes only: those after a rest, and those that change pitch. Repeated notes on one vowel are not judged one by one.', he: 'הזמן נבדק רק על צלילים ברורים: אלה שאחרי הפסקה, ואלה שמשנים גובה. צלילים חוזרים על אותה תנועה לא נשפטים אחד־אחד.' }, play: [seq([[64, 0.5], [64, 0.5], [65, 0.5], [67, 0.5]])] },
      { say: { en: 'Unaccompanied, from memory: you hear the key once, then sing alone. The app checks that you stay in the key to the end.', he: 'בלי ליווי, מהזיכרון: שומעים את הסולם פעם אחת, ואז שרים לבד. האפליקציה בודקת שנשארים בסולם עד הסוף.' }, play: [chord([48, 52, 55], 1.4)] },
      { say: { en: 'Our own songs have a verse and a chorus. Lift the chorus — the app wants it at least three decibels louder.', he: 'לשירים שלנו יש בית ופזמון. הרימו את הפזמון — האפליקציה רוצה אותו חזק לפחות בשלושה דציבל.' } },
      { say: { en: 'The performance take is one pass with no loops. It is scored and kept, like a recital card you can listen back to.', he: 'טייק ההופעה הוא מעבר אחד בלי חזרות. הוא מקבל ציון ונשמר, כמו כרטיס רסיטל שאפשר להאזין לו שוב.' } },
      { say: { en: "A common mistake is to sing the whole song again and again. Loop only the weak phrase, slower, until it passes — then put the song back together.", he: "טעות נפוצה היא לשיר את כל השיר שוב ושוב. חזרו רק על המשפט החלש, לאט יותר, עד שהוא עובר — ואז חברו את השיר מחדש." } },
      { say: { en: "To recap: every phrase is scored on pitch, time and breath, the weakest is looped, and every phrase must pass for the level.", he: "לסיכום: כל משפט מקבל ציון על גובה, זמן ונשימה, החלש חוזר בלולאה, וכל משפט חייב לעבור כדי לעבור את השלב." } },
    ],
  },
  // ------------------------------------------------------------------ F14 standards
  {
    id: 'voice-standards',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'From the written head to your own', he: 'מהנושא הכתוב אל שלכם' },
    takeaway: { en: 'First the head as written; then move its rhythm — anticipate, delay, sit behind the beat — and keep its long notes.', he: 'קודם הנושא כפי שנכתב; אחר כך מזיזים את המקצב — מקדימים, מאחרים, יושבים מאחורי הפעמה — ושומרים על הצלילים הארוכים.' },
    steps: [
      { say: { en: 'A jazz head is a melody over chords. Singers rarely sing it as written: they phrase it.', he: 'נושא בג׳אז הוא מנגינה מעל אקורדים. זמרים כמעט אף פעם לא שרים אותו כפי שנכתב: הם מעצבים אותו.' }, play: [seq([[67, 0.5], [64, 0.5], [67, 0.5], [61, 0.5], [62, 1], [55, 1]])] },
      { say: { en: 'Interpreting is graded honestly: the long notes must still be there, and a third of the onsets must move from the page.', he: 'הפרשנות נבדקת ביושר: הצלילים הארוכים חייבים להישאר, ושליש מהכניסות צריכות לזוז מהדף.' }, show: { text: { en: 'kept ≥ 85% · moved ≥ 30%', he: 'נשמר ≥ 85% · הוזז ≥ 30%' } } },
      { say: { en: 'A laid-back chorus sits a little behind the band, evenly — forty to a hundred and twenty milliseconds.', he: 'כורוס מאחורי הפעמה יושב קצת אחרי הלהקה, באופן אחיד — ארבעים עד מאה ועשרים אלפיות שנייה.' }, play: [clicksAnd(100, 8, [4.12, 5.12, 6.12, 7.12], 67)] },
      { say: { en: 'A ballad is long, steady notes and one breath per phrase. A bossa is soft, straight eighths, and no vibrato.', he: 'בלדה היא צלילים ארוכים ויציבים ונשימה אחת לכל משפט. בוסה היא רכה, שמיניות ישרות, ובלי ויברטו.' }, play: [seq([[64, 2], [61, 1], [64, 1], [65, 1.5]])] },
      { say: { en: 'Our heads are written for the app, or are traditional tunes with our own jazz chords — no copied melodies.', he: 'הנושאים שלנו נכתבו עבור האפליקציה, או שהם מנגינות מסורתיות עם אקורדי ג׳אז משלנו — בלי מנגינות מועתקות.' } },
      { say: { en: "Each level says what it measures: pitch per phrase, time, the long notes kept, the average lateness — never the words.", he: "כל שלב אומר מה הוא מודד: גובה בכל משפט, זמן, הצלילים הארוכים שנשמרו, האיחור הממוצע — אף פעם לא המילים." } },
    ],
    more: [
      { say: { en: 'Three ways to move a melody: anticipate a note by an eighth, delay it, or hold it over the bar line.', he: 'שלוש דרכים להזיז מנגינה: להקדים צליל בשמינית, לאחר אותו, או להחזיק אותו מעבר לקו התיבה.' }, play: [seq([[67, 0.75], [64, 0.75], [62, 1.5]])] },
      { say: { en: 'Keep the shape: the long notes and the phrase endings are the skeleton of the song. Move what is between them.', he: 'שמרו על הצורה: הצלילים הארוכים וסופי המשפטים הם השלד של השיר. הזיזו את מה שביניהם.' } },
      { say: { en: 'Forms you will meet: the twelve-bar blues, the sixteen-bar spiritual, a minor two-five cycle, rhythm changes, a ballad and a bossa.', he: 'מבנים שתפגשו: בלוז של שתים־עשרה תיבות, שיר רוחני של שש־עשרה, מעגל שתיים־חמש מינורי, ריתם צ׳יינג׳ס, בלדה ובוסה.' } },
      { say: { en: 'Behind the beat is judged as an average over eight notes or more, never note by note, because a phone onset wobbles a little.', he: 'מאחורי הפעמה נשפט כממוצע של שמונה צלילים ומעלה, אף פעם לא צליל־צליל, כי תחילת צליל בטלפון רועדת מעט.' }, play: [clicksAnd(90, 8, [4.1, 5.1, 6.1, 7.1], 67)] },
      { say: { en: 'Real titles of copyrighted standards appear only as chord charts. Their melodies wait for a licence — that is the law, and we respect it.', he: 'שמות אמיתיים של סטנדרטים מוגנים מופיעים רק כמהלכי אקורדים. המנגינות שלהם מחכות לרישיון — זה החוק, ואנחנו מכבדים אותו.' } },
      { say: { en: "A common mistake is to change the notes instead of the rhythm. First move the timing; keep the pitches of the head until your phrasing is sure.", he: "טעות נפוצה היא לשנות את הצלילים במקום את המקצב. קודם הזיזו את התזמון; שמרו על הצלילים של הנושא עד שהפרייזינג בטוח." } },
      { say: { en: "To recap: sing the head as written, then interpret it while keeping its long notes, sit behind the beat evenly, and shape ballads and bossas.", he: "לסיכום: שרים את הנושא כפי שנכתב, אחר כך מפרשים אותו ושומרים על הצלילים הארוכים, יושבים מאחורי הפעמה באופן אחיד, ומעצבים בלדות ובוסות." } },
    ],
  },
  // ------------------------------------------------------------------ F15 scat
  {
    id: 'voice-scat',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'Scat: the syllables are free, the notes are not', he: 'סקאט: ההברות חופשיות, הצלילים לא' },
    takeaway: { en: 'Scat is graded on rhythm and on landing chord tones — never on the syllables you choose.', he: 'סקאט נבדק לפי המקצב והנחיתה על צלילי אקורד — אף פעם לא לפי ההברות שבוחרים.' },
    steps: [
      { say: { en: 'Start with rhythm on one note: the app plays two bars, you answer with the same rhythm.', he: 'מתחילים במקצב על צליל אחד: האפליקציה מנגנת שתי תיבות, ואתם עונים באותו מקצב.' }, play: [clicksAnd(100, 8, [0, 1, 1.67, 3], 64, [1, 3])] },
      { say: { en: 'Guide tones are the 3rd and the 7th of each chord. Sing them through a two-five-one and you hear the changes move.', he: 'הצלילים המנחים הם הטרצה והספטימה של כל אקורד. שירו אותם דרך שתיים־חמש־אחת ותשמעו את האקורדים זזים.' }, play: [seq([[60, 1], [59, 1], [64, 1.6]])], show: { text: { en: 'Dm7 G7 C: C → B → E', he: 'Dm7 G7 C: דו ← סי ← מי' } } },
      { say: { en: 'Then free lines — with a chord tone on beat one of every chord, and end on one.', he: 'אחר כך קווים חופשיים — עם צליל אקורד בפעמה אחת של כל אקורד, וסיום על אחד.' }, play: [seq([[62, 0.5], [65, 0.25], [64, 0.25], [62, 0.5], [59, 0.5], [60, 1]])] },
      { say: { en: 'A chromatic approach reaches a chord tone from a half step above or below — the sound of bebop.', he: 'גישה כרומטית מגיעה לצליל אקורד מחצי טון מעל או מתחת — הצליל של הביבופ.' }, play: [seq([[63, 0.3], [64, 0.7], [-1, 0.2], [66, 0.3], [67, 0.7]])] },
      { say: { en: 'Doo, bah, dee, dat — choose any syllables. Only the notes, their timing and where they land are counted.', he: 'דו, בה, די, דת — בחרו כל הברה. נחשבים רק הצלילים, הזמן שלהם ואיפה הם נוחתים.' } },
      { say: { en: "Headphones keep the band out of the microphone, so only your line is heard and checked.", he: "אוזניות משאירות את הלהקה מחוץ למיקרופון, כך שרק הקו שלכם נשמע ונבדק." } },
    ],
    more: [
      { say: { en: 'The order follows how jazz singers are taught: copy rhythms, then embellish a melody, then guide tones, then free lines that land.', he: 'הסדר הולך לפי איך שמלמדים זמרי ג׳אז: מעתיקים מקצבים, אחר כך מקשטים מנגינה, אחר כך צלילים מנחים, ואז קווים חופשיים שנוחתים.' } },
      { say: { en: 'Before guide tones you need the ear: the chord-tone levels of the singer\'s ear, and harmony singing.', he: 'לפני צלילים מנחים צריך את האוזן: שלבי צלילי האקורד של האוזן של הזמר, ושירה בהרמוניה.' } },
      { say: { en: 'Landing means beat one of each chord. Between the landings, anything goes — scale notes, chromatic notes, rests.', he: 'נחיתה פירושה פעמה אחת של כל אקורד. בין הנחיתות, הכול מותר — צלילי סולם, צלילים כרומטיים, הפסקות.' }, play: [seq([[64, 0.5], [65, 0.25], [66, 0.25], [67, 1]])] },
      { say: { en: 'Leave space. A rest is part of a phrase, and short phrases with clear endings swing more than a stream of notes.', he: 'השאירו מקום. הפסקה היא חלק מהמשפט, ומשפטים קצרים עם סופים ברורים מסווינגים יותר מזרם של צלילים.' } },
      { say: { en: 'Over the blues, try the 3rd of each chord on beat one: the line moves by a half step where the chord changes.', he: 'מעל הבלוז, נסו את הטרצה של כל אקורד בפעמה אחת: הקו זז בחצי טון איפה שהאקורד מתחלף.' }, play: [seq([[64, 1], [63, 1], [64, 1]])] },
      { say: { en: "A common mistake is to fill every beat with notes. Fewer notes that land well sound better than many that wander.", he: "טעות נפוצה היא למלא כל פעמה בצלילים. מעט צלילים שנוחתים טוב נשמעים טוב יותר מהרבה צלילים שמשוטטים." } },
      { say: { en: "To recap: copy the rhythm first, sing the guide tones through the changes, land a chord tone on every beat one, and approach it by a half step.", he: "לסיכום: קודם מעתיקים את המקצב, שרים את הצלילים המנחים דרך האקורדים, נוחתים על צליל אקורד בכל פעמה אחת, ומגיעים אליו בחצי טון." } },
    ],
  },
];

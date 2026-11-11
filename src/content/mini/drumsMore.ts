// Quick lessons for the rest of the drums curriculum (DRUMS_NICHE_PLAN P2, drumMore.ts): the pocket and the swing dial,
// reggae (one-drop, steppers), two feet on the kick (doubles, the double pedal). They open before the first LEVEL that
// needs them (unit "tech:<level id>", e.g. tech:d-time-8), not before the family's first step. Plain words, sound first.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

type Drum = 'kick' | 'snare' | 'rim' | 'hat' | 'hat-open' | 'ride' | 'crash';
type Hit = [number, Drum, number?];
const MIDI: Record<Drum, number> = { kick: 36, snare: 38, rim: 37, hat: 42, 'hat-open': 46, ride: 51, crash: 49 };
/** Kit events from [beat, drum, velocity] at `bpm`. */
function kit(bpm: number, beats: number, hits: Hit[]): Stimulus {
  const b = 60 / bpm;
  const events: NoteEvent[] = hits.map(([t, d, v]) => ({ midi: MIDI[d], start: Math.max(0, t * b), duration: d === 'crash' || d === 'hat-open' ? 0.4 : 0.08, velocity: v ?? (d === 'hat' || d === 'ride' ? 0.45 : 0.8), perc: d }));
  return { kind: 'events', events, length: beats * b + 0.4 };
}
const every = (from: number, to: number, step: number, d: Drum, v?: number): Hit[] => Array.from({ length: Math.round((to - from) / step) }, (_, i) => [from + i * step, d, v] as Hit);
/** One bar of a funk / soul groove at `b0`: hat 8ths, kick 1 and the "&" of 2 and 3, snare 2 and 4 moved by `late` beats. */
const soul = (b0: number, late = 0, all = 0): Hit[] => [...every(b0 + all, b0 + 4 + all, 0.5, 'hat'), [b0 + all, 'kick'], [b0 + 1.5 + all, 'kick'], [b0 + 2 + all, 'kick'], [b0 + 1 + late + all, 'snare'], [b0 + 3 + late + all, 'snare']];
/** The ride's swing over `beats` beats, the skip note at `r` of the beat. */
const swingRide = (b0: number, beats: number, r: number): Hit[] => Array.from({ length: beats }, (_, i): Hit[] => [[b0 + i, 'ride', 0.5], ...(i % 2 ? ([[b0 + i + r, 'ride', 0.35]] as Hit[]) : [])]).flat();
/** The shuffle on the hat (beat and its last triplet), one bar. */
const shufHat = (b0: number): Hit[] => [0, 1, 2, 3].flatMap((q): Hit[] => [[b0 + q, 'hat', 0.4], [b0 + q + 2 / 3, 'hat', 0.5]]);

export const LESSONS: MiniLesson[] = [
  {
    id: 'drum-pocket',
    area: 'rhythm',
    emoji: '',
    title: { en: 'The pocket and the feel', he: 'הכיס והתחושה' },
    takeaway: { en: 'Choose where the beat sits — a little behind, on, or ahead; the snare alone laid back; the swing from almost straight to the full triplet — and keep it there on every note.', he: 'בוחרים איפה הפעמה יושבת — קצת מאחור, בדיוק או מלפנים; רק הסנר מאחור; הסווינג מכמעט ישר ועד הטריולה המלאה — ושומרים על המקום הזה בכל תו.' },
    steps: [
      { say: { en: 'Hi {name}! Two drummers can play the same groove at the same tempo and feel completely different. The difference is where the notes sit around the beat. Listen: one bar right on the grid, then the same bar laid back.', he: 'היי {name}! שני מתופפים יכולים לנגן אותו גרוב באותו טמפו ולהישמע אחרת לגמרי. ההבדל הוא איפה התווים יושבים סביב הפעמה. הקשיבו: תיבה אחת בדיוק על הרשת, ואז אותה תיבה מאחור.' }, play: [kit(90, 8.5, [...soul(0), ...soul(4, 0, 0.05)])] },
      { say: { en: 'Behind the beat sounds relaxed and heavy; ahead of it sounds urgent and driving. We are talking about ten milliseconds or so — you feel it more than you hear it.', he: 'מאחורי הפעמה נשמע רגוע וכבד; לפניה נשמע דחוף ודוחף. מדובר בעשר אלפיות שנייה בערך — מרגישים את זה יותר משומעים.' }, show: { text: { en: 'behind · on · ahead', he: 'מאחור · בדיוק · מלפנים' } } },
      { say: { en: 'Boom-bap and many soul grooves keep the hi-hat and the kick on the grid and lay only the snare back. Listen to the lazy snare.', he: 'בום־בפ והרבה גרובים של סול שומרים את ההיי־האט והקיק על הרשת, ומשאירים רק את הסנר מאחור. הקשיבו לסנר העצלן.' }, play: [kit(85, 8.5, [...soul(0, 0.06), ...soul(4, 0.06)])] },
      { say: { en: 'Swing has a dial too. The second eighth of the beat can sit at 55 percent, almost straight, at 62 percent, light, or at 67 percent, the full triplet. Listen to the three.', he: 'גם לסווינג יש חוגה. השמינית השנייה בפעמה יכולה לשבת ב-55 אחוז, כמעט ישר, ב-62 אחוז, קל, או ב-67 אחוז, הטריולה המלאה. הקשיבו לשלושתם.' }, play: [kit(100, 12.5, [...swingRide(0, 4, 0.55), ...swingRide(4, 4, 0.62), ...swingRide(8, 4, 0.67)])] },
      { say: { en: 'In these levels the app measures where your notes sit, in milliseconds, against the target you were given. Calibrate the latency first: the pocket is smaller than most delays.', he: 'בשלבים האלה האפליקציה מודדת איפה התווים שלכם יושבים, באלפיות שנייה, מול היעד שקיבלתם. כיילו קודם את ההשהיה: הכיס קטן מרוב ההשהיות.' } },
    ],
    more: [
      { say: { en: 'Pocket is also consistency. Ten milliseconds behind on every note is a feel; ten behind on some notes and on the grid on others is just uneven.', he: 'כיס הוא גם עקביות. עשר אלפיות מאחור בכל תו זו תחושה; עשר מאחור בחלק מהתווים ובדיוק בשאר זה פשוט לא אחיד.' } },
      { say: { en: 'The common mistake is to drag the whole groove when you try to lay back. Keep the hi-hat steady and move only the snare. Listen: first everything late, then only the snare.', he: 'הטעות הנפוצה היא לגרור את כל הגרוב כשמנסים לשבת מאחור. שמרו על ההיי־האט יציב והזיזו רק את הסנר. הקשיבו: קודם הכול מאחר, ואז רק הסנר.' }, play: [kit(85, 8.5, [...soul(0, 0, 0.06), ...soul(4, 0.06)])] },
      { say: { en: 'Practise the pocket with the click on 2 and 4, then on 1 only. The fewer clicks you hear, the more the feel has to come from you.', he: 'תרגלו את הכיס עם קליק על 2 ו-4, ואז רק על 1. ככל שיש פחות קליקים, התחושה צריכה לבוא יותר מכם.' } },
      { say: { en: 'Swing changes with the tempo. Slow swing can sit near the triplet; fast swing gets straighter, because there is no time left for a long first note. Listen at a fast tempo.', he: 'הסווינג משתנה עם הטמפו. סווינג איטי יכול לשבת ליד הטריולה; סווינג מהיר נעשה ישר יותר, כי לא נשאר זמן לתו ראשון ארוך. הקשיבו בטמפו מהיר.' }, play: [kit(220, 16.5, swingRide(0, 16, 0.58))] },
      { say: { en: 'In real music, a laid-back snare is a mark of soul, hip-hop and slow funk; pushing ahead is common in punk and fast rock; jazz drummers often keep the ride slightly on top to drive the band.', he: 'במוזיקה אמיתית, סנר שיושב מאחור הוא סימן היכר של סול, היפ־הופ ופאנק איטי; לדחוף קדימה נפוץ בפאנק־רוק וברוק מהיר; מתופפי ג׳אז שמים הרבה פעמים את הרייד קצת מלפנים כדי לדחוף את הלהקה.' } },
      { say: { en: 'Recap: decide where the beat sits before you play, keep that place on every note, and let the measurement tell you how close you came.', he: 'לסיכום: מחליטים איפה הפעמה יושבת לפני שמנגנים, שומרים על המקום הזה בכל תו, ונותנים למדידה לומר כמה קרוב הגעתם.' } },
    ],
  },
  {
    id: 'drum-reggae',
    area: 'world',
    emoji: '',
    title: { en: 'Reggae: the one-drop', he: 'רגאיי: הוואן־דרופ' },
    takeaway: { en: 'In the one-drop nothing plays on 1: the kick and the cross-stick land together on 3 over a hi-hat in a triplet feel; steppers puts the kick on every beat, rockers on 1 and 3.', he: 'בוואן־דרופ שום דבר לא מתנגן על 1: הקיק והקרוס־סטיק נוחתים יחד על 3, מעל היי־האט בתחושת טריולה; בסטפרס הקיק על כל פעמה, ברוקרס על 1 ו-3.' },
    steps: [
      { say: { en: 'Hi {name}! The reggae one-drop leaves beat one empty. The kick and the cross-stick drop together on three, and the hi-hat floats above in a triplet feel. Listen.', he: 'היי {name}! הוואן־דרופ של הרגאיי משאיר את פעמה אחת ריקה. הקיק והקרוס־סטיק נופלים יחד על שלוש, וההיי־האט מרחף מעל בתחושת טריולה. הקשיבו.' }, play: [kit(72, 8.5, [...shufHat(0), ...shufHat(4), [2, 'kick'], [2, 'rim'], [6, 'kick'], [6, 'rim']])] },
      { say: { en: 'Beat one is empty on purpose. The bass and the guitar’s off-beat chop carry it; the weight of the drums falls on three.', he: 'פעמה אחת ריקה בכוונה. הבס והקצב של הגיטרה על ה"וְ" נושאים אותה; המשקל של התופים נופל על שלוש.' }, show: { text: { en: '1 . 2 . 3 X 4 .', he: '1 . 2 . 3 X 4 .' } } },
      { say: { en: 'The cross-stick is the stick laid across the snare, its shoulder clicking on the rim. It is softer and drier than a snare stroke. Listen to it alone.', he: 'הקרוס־סטיק הוא מקל שמונח לרוחב הסנר, והכתף שלו מקישה על החישוק. הוא רך ויבש יותר ממכה על הסנר. הקשיבו לו לבד.' }, play: [kit(72, 4.5, [[1, 'rim'], [2, 'rim'], [3, 'rim']])] },
      { say: { en: 'Steppers puts the kick on every beat, a driving march under the same cross-stick on three. Rockers puts it on one and three, with the hi-hat on the off-beats.', he: 'סטפרס שם את הקיק על כל פעמה, מצעד דוחף מתחת לאותו קרוס־סטיק על שלוש. רוקרס שם אותו על אחת ושלוש, וההיי־האט על ה"וְ".' }, play: [kit(72, 8.5, [...every(0, 8, 0.5, 'hat'), ...every(0, 8, 1, 'kick'), [2, 'rim'], [6, 'rim']])] },
      { say: { en: 'In the exercise the app checks the kick and the cross-stick on three, the hi-hat on its triplet places, and a steady tempo. Reggae is slow, so the space between the notes is the hard part.', he: 'בתרגיל האפליקציה בודקת את הקיק והקרוס־סטיק על שלוש, את ההיי־האט במקומות הטריולה שלו, וטמפו יציב. רגאיי איטי, אז המרווח בין התווים הוא החלק הקשה.' } },
    ],
    more: [
      { say: { en: 'The common mistake is a kick on one out of habit. Rock and pop train the foot to land on one; here it has to wait for three.', he: 'הטעות הנפוצה היא קיק על אחת מתוך הרגל. רוק ופופ מאמנים את הרגל לנחות על אחת; כאן היא צריכה לחכות לשלוש.' } },
      { say: { en: 'Keep the hi-hat light and even, the long note a little stronger than the short one. A small open hat at the very end of the bar leads back to the empty one.', he: 'שמרו על ההיי־האט קל ואחיד, התו הארוך קצת חזק מהקצר. היי־האט פתוח קטן בסוף התיבה מוביל חזרה אל האחת הריקה.' }, play: [kit(72, 4.5, [...shufHat(0).slice(0, 7), [3 + 2 / 3, 'hat-open', 0.5], [2, 'kick'], [2, 'rim']])] },
      { say: { en: 'Reggae grew in Jamaica in the late 1960s out of ska and rocksteady. As the tempo slowed down, the drums moved their weight from the off-beats to beat three.', he: 'הרגאיי צמח בג׳מייקה בסוף שנות השישים מתוך הסקא והרוקסטדי. כשהטמפו האט, התופים העבירו את המשקל שלהם מה"וְ" אל פעמה שלוש.' } },
      { say: { en: 'Steppers came later and drives harder: four kicks to the bar, the same cross-stick on three. It sits well under dub, where the bass carries the song.', he: 'הסטפרס הגיע מאוחר יותר ודוחף חזק יותר: ארבעה קיקים בתיבה, ואותו קרוס־סטיק על שלוש. הוא יושב טוב מתחת לדאב, שבו הבס נושא את השיר.' }, play: [kit(76, 8.5, [...shufHat(0), ...shufHat(4), ...every(0, 8, 1, 'kick'), [2, 'rim'], [6, 'rim']])] },
      { say: { en: 'Practise slowly with the click on three only. When three feels like home, the empty one stops feeling like a mistake.', he: 'תרגלו לאט עם קליק רק על שלוש. כששלוש מרגיש כמו בית, האחת הריקה מפסיקה להרגיש כמו טעות.' } },
      { say: { en: 'Recap: nothing on one, kick and cross-stick together on three, a light triplet hi-hat; steppers for drive, rockers in between.', he: 'לסיכום: כלום על אחת, קיק וקרוס־סטיק יחד על שלוש, היי־האט קל בטריולות; סטפרס לדחיפה, רוקרס באמצע.' } },
    ],
  },
  {
    id: 'drum-feet',
    area: 'play',
    emoji: '',
    title: { en: 'Two feet on the kick', he: 'שתי רגליים על הקיק' },
    takeaway: { en: 'Doubles with one foot (heel–toe or slide), then two pedals alternating: the app measures even spacing and even strength, since the kit cannot tell the feet apart.', he: 'כפולות ברגל אחת (עקב–בוהן או החלקה), ואחר כך שני פדלים לסירוגין: האפליקציה מודדת מרווחים שווים ועוצמה שווה, כי המערכת לא מבדילה בין הרגליים.' },
    steps: [
      { say: { en: 'Hi {name}! A kick double is two sixteenths with one foot. Listen to doubles inside a simple rock groove.', he: 'היי {name}! כפולה בקיק היא שתי שש-עשריות ברגל אחת. הקשיבו לכפולות בתוך גרוב רוק פשוט.' }, play: [kit(80, 8.5, [...every(0, 8, 0.5, 'hat'), [1, 'snare'], [3, 'snare'], [5, 'snare'], [7, 'snare'], [0, 'kick'], [0.25, 'kick'], [2, 'kick'], [2.25, 'kick'], [4, 'kick'], [4.25, 'kick'], [6, 'kick'], [6.25, 'kick']])] },
      { say: { en: 'The heel–toe: the heel drops for the first stroke and the toe snaps the second. The second stroke must be as strong as the first — the app compares the two.', he: 'עקב–בוהן: העקב יורד במכה הראשונה והבוהן מקפיצה את השנייה. המכה השנייה צריכה להיות חזקה כמו הראשונה — האפליקציה משווה בין השתיים.' }, play: [kit(80, 4.5, [0, 1, 2, 3].flatMap((q): Hit[] => [[q, 'kick'], [q + 0.25, 'kick']]))] },
      { say: { en: 'A double pedal adds a second beater for the other foot. Both strike the same drum, so the kit cannot tell your feet apart; the app listens for even spacing and even strength instead.', he: 'דאבל פדל מוסיף מקבת שנייה לרגל השנייה. שתיהן מכות באותו תוף, אז המערכת לא מבדילה בין הרגליים; במקום זה האפליקציה מקשיבה למרווחים שווים ולעוצמה שווה.' }, play: [kit(90, 4.5, [...every(0, 4, 0.25, 'kick', 0.7), [1, 'snare'], [3, 'snare'], ...every(0, 4, 1, 'crash', 0.4)])] },
      { say: { en: 'The gallop mixes an eighth and two sixteenths. With two feet the order of the feet keeps changing, which makes it a good test of evenness.', he: 'הגאלופ מערבב שמינית ושתי שש-עשריות. בשתי רגליים סדר הרגליים כל הזמן מתחלף, וזה מבחן טוב לאחידות.' }, play: [kit(100, 4.5, [0, 1, 2, 3].flatMap((q): Hit[] => [[q, 'kick'], [q + 0.5, 'kick'], [q + 0.75, 'kick']]).concat([[1, 'snare'], [3, 'snare']]))] },
      { say: { en: 'Start slow with short bursts on one and three, then whole bars. A weak foot shows up as every other stroke softer or late.', he: 'התחילו לאט עם התפרצויות קצרות על אחת ושלוש, ואז תיבות שלמות. רגל חלשה מתגלה כמכה שנייה שקטה יותר או מאחרת.' } },
    ],
    more: [
      { say: { en: 'The slide technique: the foot slides up the pedal board, the first stroke from the middle and the second from the toe. It suits faster doubles than the heel–toe.', he: 'טכניקת ההחלקה: הרגל מחליקה במעלה הפדל, המכה הראשונה מהאמצע והשנייה מהבוהן. היא מתאימה לכפולות מהירות יותר מעקב–בוהן.' } },
      { say: { en: 'The common mistake is a weak second foot. Practise single-foot eighths with the weaker foot alone, then alternate slowly and listen for two equal strokes.', he: 'הטעות הנפוצה היא רגל שנייה חלשה. תרגלו שמיניות ברגל החלשה לבד, ואז לסירוגין לאט, והקשיבו לשתי מכות שוות.' }, play: [kit(80, 4.5, every(0, 4, 0.5, 'kick', 0.7))] },
      { say: { en: 'Endurance matters: a minute of sixteenths tells you more than ten seconds. The app compares the first and the last part of the take, so a tired foot shows.', he: 'סיבולת חשובה: דקה של שש-עשריות מגלה יותר מעשר שניות. האפליקציה משווה בין החלק הראשון לאחרון של הנגינה, אז רגל עייפה נחשפת.' } },
      { say: { en: 'In real music, double bass drives metal and some fusion, but drummers also use it lightly: a few fast doubles under a fill, or a rolling sixteenth line under a big chorus.', he: 'במוזיקה אמיתית, דאבל בס מניע מטאל וקצת פיוז׳ן, אבל מתופפים משתמשים בו גם בעדינות: כמה כפולות מהירות מתחת למעבר, או שורת שש-עשריות מתגלגלת מתחת לפזמון גדול.' }, play: [kit(110, 8.5, [...every(0, 8, 1, 'crash', 0.45), ...every(0, 8, 0.25, 'kick', 0.65), [1, 'snare'], [3, 'snare'], [5, 'snare'], [7, 'snare']])] },
      { say: { en: 'Keep the hands relaxed while the feet work. If the snare drifts when the feet get busy, slow down until both stay on the grid.', he: 'שמרו על הידיים רפויות בזמן שהרגליים עובדות. אם הסנר נודד כשהרגליים עסוקות, האטו עד ששתיהן נשארות על הרשת.' } },
      { say: { en: 'Recap: one foot first, the second stroke as strong as the first; then two feet, even in time and even in strength, held to the end of the take.', he: 'לסיכום: קודם רגל אחת, המכה השנייה חזקה כמו הראשונה; אחר כך שתי רגליים, שוות בזמן ושוות בעוצמה, עד סוף הנגינה.' } },
    ],
  },
];

/**
 * Each lesson opens before the first level that needs it (App.tsx gate: "tech:<level id>" before "tech:<family>"):
 * the pocket before the pocket, the lazy snare and the swing dial; reggae before the one-drop; the feet before doubles.
 */
export const UNITS: Record<string, string> = {
  'tech:d-time-8': 'drum-pocket',
  'tech:d-funk-7': 'drum-pocket',
  'tech:d-shuffle-5': 'drum-pocket',
  'tech:d-shuffle-6': 'drum-reggae',
  'tech:d-shuffle-7': 'drum-reggae',
  'tech:d-feet-4': 'drum-feet',
  'tech:d-feet-6': 'drum-feet',
};

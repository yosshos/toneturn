// Curriculum audit 2026-11-19 (CURRICULUM-AUDIT-INSTRUMENTS R7.4; owner OK 2026-11-19): one short lesson for each bass
// family (electric and upright) whose first path level had no teaching screen — what the family trains, how to practise
// it, the one thing to watch. Each opens the family's first level ("tech:<family>", wired in pathWiring.ts). Own words
// and examples; the drills then measure the playing.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** Bass notes on the recorded bass: [midi, start s, length s, velocity]. */
const bass = (list: [number, number, number, number?][], length?: number): Stimulus => ({
  kind: 'events',
  events: list.map(([midi, start, duration, velocity = 0.7]): NoteEvent => ({ midi, start, duration, velocity, inst: 'bass' })),
  length: length ?? Math.max(...list.map(([, s, d]) => s + d)) + 0.3,
});
/** A line, one note every `each` seconds, each ringing `ring` of the gap. */
const line = (midis: number[], each = 0.4, ring = 0.95, v = 0.7): Stimulus => bass(midis.map((m, i) => [m, i * each, each * ring, v]));
/** A line with its own velocities (accents, ghosts). */
const lineV = (pairs: [number, number][], each = 0.25, ring = 0.8): Stimulus => bass(pairs.map(([m, v], i) => [m, i * each, each * ring, v]));
/** Drums under a bass line: kick / snare / hat hits [beat, kind] at `bpm`. */
function kit(bpm: number, beats: number, hits: [number, 'kick' | 'snare' | 'hat'][], bassHits: [number, number, number][] = []): Stimulus {
  const b = 60 / bpm;
  const M = { kick: 36, snare: 38, hat: 42 } as const;
  return {
    kind: 'events',
    events: [
      ...hits.map(([t, d]): NoteEvent => ({ midi: M[d], start: t * b, duration: 0.08, velocity: d === 'hat' ? 0.4 : 0.8, perc: d })),
      ...bassHits.map(([m, t, d]): NoteEvent => ({ midi: m, start: t * b, duration: d * b * 0.9, velocity: 0.75, inst: 'bass' })),
    ],
    length: beats * b + 0.3,
  };
}
const ROCK_BEAT: [number, 'kick' | 'snare' | 'hat'][] = [[0, 'kick'], [1, 'snare'], [2, 'kick'], [3, 'snare'], ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t): [number, 'hat'] => [t, 'hat'])];

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ electric bass
  {
    id: 'fam-g-bass',
    area: 'play',
    emoji: '',
    title: { en: 'Bass guitar: the whole toolkit', he: 'גיטרה בס: כל הכלים' },
    takeaway: { en: 'A tour of the bass: the chromatic warm-up, scales, grooves, arpeggios, octaves and slap, and a first walk. Each one is measured in time.', he: 'סיור בבס: חימום כרומטי, סולמות, גרובים, ארפג׳יו, אוקטבות וסלאפ, ובס מהלך ראשון. כל אחד נמדד בזמן.' },
    steps: [
      { say: { en: 'Hi {name}! This family is a tour of the bass guitar: one level for each main tool, from the first warm-up to a walking line.', he: 'היי {name}! המשפחה הזאת היא סיור בגיטרה בס: שלב אחד לכל כלי מרכזי, מהחימום הראשון ועד בס מהלך.' }, play: [line([28, 29, 30, 31, 33, 34, 35, 36], 0.3)] },
      { say: { en: 'It opens with the chromatic warm-up: one finger per fret, one, two, three, four, and the plucking fingers alternating, index and middle.', he: 'היא נפתחת בחימום הכרומטי: אצבע לכל סריג, אחת, שתיים, שלוש, ארבע, ואצבעות הפריטה מתחלפות, מורה ואמה.' }, play: [line([33, 34, 35, 36], 0.45)], show: { text: { en: '1 2 3 4 · i m i m', he: '1 2 3 4 · i m i m' } } },
      { say: { en: 'Then scales and grooves: root, 5th and octave, rock eighths, a Motown line, a tumbao. The groove is where the bass lives.', he: 'אחר כך סולמות וגרובים: שורש, קווינטה ואוקטבה, שמיניות רוק, קו מוטאון, טומבאו. הגרוב הוא המקום שבו הבס חי.' }, play: [kit(100, 4, ROCK_BEAT, [[33, 0, 1], [40, 1, 1], [45, 2, 1], [40, 3, 1]])] },
      { say: { en: 'The one thing to watch: every note in time and the right length. A bass note that ends early leaves a hole under the whole band.', he: 'הדבר האחד לשים אליו לב: כל צליל בזמן ובאורך הנכון. צליל בס שנגמר מוקדם משאיר חור מתחת לכל הלהקה.' }, play: [line([33, 33, 38, 40], 0.5, 0.95)], show: { text: { en: 'in time · full length', he: 'בזמן · באורך מלא' } } },
      { say: { en: 'Your turn: free time first where the notes are new, then the tempo ladder, in all twelve keys. Every note is measured.', he: 'תורכם: קודם בזמן חופשי כשהצלילים חדשים, ואז סולם הטמפו, בכל שנים־עשר הסולמות. כל צליל נמדד.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'Arpeggios spell the chord one note at a time: root, 3rd, 5th, then the 7th. They are the notes a bass line leans on.', he: 'ארפג׳יו מאיית את האקורד צליל אחרי צליל: שורש, טרצה, קווינטה, ואז הספטימה. אלה הצלילים שקו בס נשען עליהם.' }, play: [line([33, 37, 40, 43, 40, 37, 33], 0.3)] },
      { say: { en: 'Octaves are the disco and funk sound: the root on the E or A string, the octave two strings higher and two frets up.', he: 'אוקטבות הן הצליל של דיסקו ופאנק: השורש על מיתר מי או לה, והאוקטבה שני מיתרים מעליו ושני סריגים למעלה.' }, play: [line([33, 45, 33, 45, 31, 43, 31, 43], 0.22, 0.6)] },
      { say: { en: 'The walking level closes the tour: one note per beat over a two-five-one and a blues, chord tones on the strong beats.', he: 'השלב של הבס המהלך סוגר את הסיור: צליל אחד בכל פעמה מעל שתיים־חמש־אחת ובלוז, צלילי אקורד על הפעמות החזקות.' }, play: [line([38, 41, 45, 44, 43, 47, 50, 49, 48], 0.4)] },
      { say: { en: 'The common mistake is fast fingers and loose time. A simple line in perfect time is worth more to a band than a busy one that drifts.', he: 'הטעות הנפוצה היא אצבעות מהירות וזמן רופף. קו פשוט בזמן מושלם שווה ללהקה יותר מקו עמוס שזז.' }, show: { text: { en: 'simple and in time', he: 'פשוט ובזמן' } } },
      { say: { en: 'Each tool here has its own family later, in more depth. This tour shows where each one fits, so the path never surprises you.', he: 'לכל כלי כאן יש בהמשך משפחה משלו, לעומק. הסיור הזה מראה איפה כל אחד מתאים, כך שהדרך אף פעם לא מפתיעה.' } },
      { say: { en: 'Where it lives: every band needs these tools: the warm-up before a gig, a scale in a fill, a groove under a chorus, octaves in a disco tune, a walk in a jazz club. To keep: notes in time and full length, alternating fingers, and the tempo ladder.', he: 'איפה זה חי: כל להקה צריכה את הכלים האלה: החימום לפני הופעה, סולם בתוך מעבר, גרוב מתחת לפזמון, אוקטבות בשיר דיסקו, בס מהלך במועדון ג׳אז. מה לזכור: צלילים בזמן ובאורך מלא, אצבעות מתחלפות, וסולם הטמפו.' } },
    ],
  },
  {
    id: 'fam-b-pluck',
    area: 'play',
    emoji: '',
    title: { en: 'The plucking hand', he: 'היד הפורטת' },
    takeaway: { en: 'Index and middle in strict turns, rest strokes, both fingers equally loud: then string crossing, skipping, raking, the gallop and three fingers.', he: 'מורה ואמה לסירוגין בקפדנות, מכות נשענות, שתי האצבעות באותה עוצמה: ואז מעבר מיתרים, דילוג, רייקינג, גאלופ ושלוש אצבעות.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the plucking hand: two fingers that sound like one, at any speed and on any string.', he: 'היי {name}! המשפחה הזאת מאמנת את היד הפורטת: שתי אצבעות שנשמעות כמו אחת, בכל מהירות ועל כל מיתר.' }, play: [line([33, 33, 33, 33, 33, 33, 33, 33], 0.25, 0.9)] },
      { say: { en: 'The rest stroke: pluck through the string and let the finger land on the next string down. Index, middle, index, middle, with no exceptions.', he: 'המכה הנשענת: פורטים דרך המיתר ונותנים לאצבע לנחות על המיתר הבא. מורה, אמה, מורה, אמה, בלי יוצאים מן הכלל.' }, play: [line([28, 28, 28, 28], 0.5)], show: { text: { en: 'i · m · i · m', he: 'i · m · i · m' } } },
      { say: { en: 'Then crossing strings, skipping strings, and long runs of sixteenths for stamina. The alternation never stops when the string changes.', he: 'אחר כך מעבר בין מיתרים, דילוג על מיתרים, וריצות ארוכות של שש־עשריות לסבולת. ההחלפה לא נעצרת כשהמיתר משתנה.' }, play: [line([33, 38, 33, 43, 33, 38, 33, 43], 0.2, 0.8)] },
      { say: { en: 'The one thing to watch: the two fingers equally loud. If the middle finger is louder, it is usually because it is longer; curve it a little more.', he: 'הדבר האחד לשים אליו לב: שתי האצבעות באותה עוצמה. אם האמה חזקה יותר, זה בדרך כלל כי היא ארוכה יותר; מעגלים אותה קצת יותר.' }, play: [lineV([[33, 0.7], [33, 0.7], [33, 0.7], [33, 0.7], [33, 0.7], [33, 0.7]], 0.3)], show: { text: { en: 'i = m', he: 'i = m' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. The app measures the timing and the loudness of every note, so an uneven pair shows.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. האפליקציה מודדת את התזמון והעוצמה של כל צליל, אז זוג לא שווה ייראה.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Raking: on a line that goes down across the strings, the finger that just played already rests on the next string, so it plays that one too.', he: 'רייקינג: בקו שיורד על פני המיתרים, האצבע שניגנה כבר נחה על המיתר הבא, אז היא מנגנת גם אותו.' }, play: [line([43, 38, 33, 28], 0.3)] },
      { say: { en: 'The gallop uses three fingers for an eighth and two sixteenths, over and over: the driving sound of metal bass.', he: 'הגאלופ משתמש בשלוש אצבעות לשמינית ושתי שש־עשריות, שוב ושוב: הצליל הדוחף של בס במטאל.' }, play: [bass([[28, 0, 0.25], [28, 0.3, 0.12], [28, 0.45, 0.12], [28, 0.6, 0.25], [28, 0.9, 0.12], [28, 1.05, 0.12], [28, 1.2, 0.25], [28, 1.5, 0.12], [28, 1.65, 0.12]])] },
      { say: { en: 'Where you pluck changes the tone. Near the neck the note is round and warm; near the bridge it is tight and bright. Later levels ask for both.', he: 'המקום שבו פורטים משנה את הצליל. ליד הצוואר הצליל עגול וחם; ליד הגשר הוא הדוק ובהיר. שלבים מאוחרים יותר מבקשים את שניהם.' }, play: [lineV([[33, 0.75], [33, 0.75], [33, 0.5], [33, 0.5]], 0.45)] },
      { say: { en: 'The common mistake is starting every phrase with the same finger. Let the alternation run on; the next note gets whichever finger comes next.', he: 'הטעות הנפוצה היא להתחיל כל משפט באותה אצבע. נותנים להחלפה לרוץ; הצליל הבא מקבל את האצבע שתורה להגיע.' }, show: { text: { en: 'let the alternation run', he: 'לתת להחלפה לרוץ' } } },
      { say: { en: 'Anchor the thumb on the pickup or on the low string, and keep the fingers close. A relaxed hand plucks evenly for a whole set.', he: 'מעגנים את האגודל על הפיקאפ או על המיתר הנמוך, ושומרים על אצבעות קרובות. יד רפויה פורטת בשוויון לאורך הופעה שלמה.' } },
      { say: { en: 'Where it lives: every fingerstyle bass line, from a slow ballad to a fast funk groove, depends on this hand. To keep: strict i and m, rest strokes, equal loudness, a light anchored thumb, raking on the way down, and the alternation running through every string change.', he: 'איפה זה חי: כל קו בס באצבעות, מבלדה איטית ועד גרוב פאנק מהיר, תלוי ביד הזאת. מה לזכור: i ו־m בקפדנות, מכות נשענות, עוצמה שווה, אגודל קל ומעוגן, רייקינג בירידה, וההחלפה ממשיכה דרך כל מעבר מיתר.' } },
    ],
  },
  {
    id: 'fam-b-pocket',
    area: 'play',
    emoji: '',
    title: { en: 'The pocket: lock with the drums', he: 'הכיס: נעילה עם התופים' },
    takeaway: { en: 'Play with the kick drum, the same length every time, ahead or behind on purpose. Groove is measured against the drummer, not a click.', he: 'מנגנים עם הקיק, באותו אורך בכל פעם, לפני הפעמה או אחריה בכוונה. גרוב נמדד מול המתופף, לא מול קליק.' },
    steps: [
      { say: { en: 'Hi {name}! The pocket is the place where bass and drums lock into one groove. This family trains you to find it and stay in it.', he: 'היי {name}! הכיס הוא המקום שבו הבס והתופים ננעלים לגרוב אחד. המשפחה הזאת מאמנת אתכם למצוא אותו ולהישאר בו.' }, play: [kit(96, 4, ROCK_BEAT, [[33, 0, 1], [33, 2, 1]])] },
      { say: { en: 'Start with the kick drum. Play exactly when it plays, so the two sound like one low, thick note.', he: 'מתחילים עם הקיק. מנגנים בדיוק כשהוא מנגן, כך ששניהם נשמעים כמו צליל אחד נמוך ועבה.' }, play: [kit(96, 4, [[0, 'kick'], [1.5, 'kick'], [2, 'kick'], [1, 'snare'], [3, 'snare']], [[33, 0, 1], [33, 1.5, 0.5], [33, 2, 1]])], show: { text: { en: 'bass = kick', he: 'בס = קיק' } } },
      { say: { en: 'Then feels: the shuffle, sixteenth funk, swung sixteenths, half-time. Each feel asks for a new place inside the beat.', he: 'אחר כך תחושות: שאפל, פאנק בשש־עשריות, שש־עשריות בסווינג, חצי זמן. כל תחושה מבקשת מקום חדש בתוך הפעמה.' }, play: [kit(90, 4, [[0, 'kick'], [1, 'snare'], [2, 'kick'], [3, 'snare']], [[33, 0, 0.67], [33, 0.67, 0.33], [40, 1, 0.67], [40, 1.67, 0.33], [45, 2, 0.67], [45, 2.67, 0.33], [40, 3, 0.67], [40, 3.67, 0.33]])] },
      { say: { en: 'The one thing to watch: the same length on every note. When the lengths wander, the groove wobbles even if every onset is on time.', he: 'הדבר האחד לשים אליו לב: אותו אורך בכל צליל. כשהאורכים משתנים, הגרוב מתנדנד גם אם כל כניסה בזמן.' }, play: [line([33, 33, 33, 33], 0.5, 0.6)], show: { text: { en: 'same length, every time', he: 'אותו אורך, בכל פעם' } } },
      { say: { en: 'Your turn: these levels are about time, so the band plays from the first take, and the tempo ladder starts slow. Every note is measured against the drums.', he: 'תורכם: השלבים האלה עוסקים בזמן, אז הלהקה מנגנת מהניסיון הראשון, וסולם הטמפו מתחיל לאט. כל צליל נמדד מול התופים.' }, show: { text: { en: 'with the band from the start', he: 'עם הלהקה מההתחלה' } } },
    ],
    more: [
      { say: { en: 'Pocket on purpose: a few milliseconds ahead of the beat pushes the band forward; a few behind makes it heavy and relaxed. Choose, then stay there.', he: 'כיס בכוונה: כמה אלפיות שנייה לפני הפעמה דוחפות את הלהקה קדימה; כמה אחריה עושות אותה כבדה ורגועה. בוחרים, ונשארים שם.' }, play: [kit(90, 4, [[0, 'kick'], [1, 'snare'], [2, 'kick'], [3, 'snare']], [[33, 0.06, 1], [33, 2.06, 1]])] },
      { say: { en: 'Half-time keeps the tempo but moves the snare to beat three. The bass follows the new feel with longer notes and more space.', he: 'חצי זמן שומר על הטמפו אבל מעביר את הסנר לפעמה שלוש. הבס הולך אחרי התחושה החדשה עם צלילים ארוכים יותר ויותר מקום.' }, play: [kit(96, 4, [[0, 'kick'], [2, 'snare'], ...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t): [number, 'hat'] => [t, 'hat'])], [[33, 0, 2], [31, 2.5, 1.5]])] },
      { say: { en: 'Follow the drummer’s fills: when the drums fill into a new section, land the new root with the crash, exactly on one.', he: 'הולכים אחרי המעברים של המתופף: כשהתופים עושים מעבר אל קטע חדש, נוחתים על השורש החדש יחד עם המצילה, בדיוק באחת.' }, show: { text: { en: 'land with the crash', he: 'לנחות עם המצילה' } } },
      { say: { en: 'The common mistake is listening to yourself instead of the kick. Turn your attention to the drums, and let your own notes follow.', he: 'הטעות הנפוצה היא להקשיב לעצמכם במקום לקיק. מפנים את תשומת הלב לתופים, ונותנים לצלילים שלכם ללכת אחריהם.' }, show: { text: { en: 'listen to the kick', he: 'להקשיב לקיק' } } },
      { say: { en: 'Practise with records: pick a song with a clear kick pattern and play only roots, matching every kick. Simple, and the fastest way into the pocket.', he: 'מתרגלים עם הקלטות: בוחרים שיר עם תבנית קיק ברורה ומנגנים רק שורשים, מול כל קיק. פשוט, והדרך המהירה ביותר אל הכיס.' } },
      { say: { en: 'Where it lives: soul, funk, rock and pop records are built on a bass and a kick locked so tightly that they sound like one instrument. To keep: play with the kick, keep every length the same, choose ahead or behind on purpose, follow the fills, and listen to the drummer before yourself.', he: 'איפה זה חי: הקלטות סול, פאנק, רוק ופופ בנויות על בס וקיק שננעלים כל כך חזק שהם נשמעים ככלי אחד. מה לזכור: לנגן עם הקיק, לשמור על אותו אורך בכל צליל, לבחור לפני או אחרי הפעמה בכוונה, ללכת אחרי המעברים, ולהקשיב למתופף לפני שמקשיבים לעצמכם.' } },
    ],
  },
  {
    id: 'fam-b-fret',
    area: 'play',
    emoji: '',
    title: { en: 'The fretting hand on bass', he: 'היד הלוחצת בבס' },
    takeaway: { en: 'One finger per fret, or 1-2-4 low on the neck; the thumb behind the neck; light pressure just behind the fret. Then shifts, pivots, octaves and 10ths.', he: 'אצבע לכל סריג, או 1-2-4 נמוך על הצוואר; האגודל מאחורי הצוואר; לחץ קל ממש מאחורי הסריג. ואז מעברי מצב, פיבוט, אוקטבות ודצימות.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the fretting hand: accurate, relaxed fingers that cover the whole neck.', he: 'היי {name}! המשפחה הזאת מאמנת את היד הלוחצת: אצבעות מדויקות ורפויות שמכסות את כל הצוואר.' }, play: [line([28, 29, 30, 31, 32, 31, 30, 29, 28], 0.28)] },
      { say: { en: 'One finger per fret: four fingers, four frets. Low on the neck, where the frets are wide, many players use 1, 2 and 4, the Simandl way.', he: 'אצבע לכל סריג: ארבע אצבעות, ארבעה סריגים. נמוך על הצוואר, שם הסריגים רחבים, נגנים רבים משתמשים ב־1, 2 ו־4, בדרך של סימנדל.' }, play: [line([29, 30, 31], 0.5)], show: { text: { en: '1 2 3 4 · or 1 2 4', he: '1 2 3 4 · או 1 2 4' } } },
      { say: { en: 'Then shifts along one string, scales over two octaves, pivots on one finger, and wide shapes like octaves and 10ths.', he: 'אחר כך מעברי מצב לאורך מיתר אחד, סולמות בשתי אוקטבות, פיבוט על אצבע אחת, וצורות רחבות כמו אוקטבות ודצימות.' }, play: [line([33, 35, 37, 38, 40, 42, 44, 45], 0.28)] },
      { say: { en: 'The one thing to watch: light pressure. The thumb rests behind the neck, opposite the middle finger, and the fingertip presses just behind the fret.', he: 'הדבר האחד לשים אליו לב: לחץ קל. האגודל נח מאחורי הצוואר, מול האצבע האמצעית, וקצה האצבע לוחץ ממש מאחורי הסריג.' }, play: [line([36, 36, 36], 0.5)], show: { text: { en: 'thumb behind · tip behind the fret', he: 'אגודל מאחור · קצה מאחורי הסריג' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder, in all twelve keys. The app hears every pitch, so a buzzing or late note shows.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו, בכל שנים־עשר הסולמות. האפליקציה שומעת כל גובה, אז צליל מזמזם או מאחר ייראה.' }, show: { text: { en: 'free → ladder → 12 keys', he: 'חופשי ← סולם טמפו ← 12 סולמות' } } },
    ],
    more: [
      { say: { en: 'A shift moves the whole hand along the neck. Slide lightly on the finger already on the string, arrive before the note, then press.', he: 'מעבר מצב מזיז את כל היד לאורך הצוואר. מחליקים בקלילות על האצבע שכבר על המיתר, מגיעים לפני הצליל, ואז לוחצים.' }, play: [line([33, 35, 37, 38, 40], 0.35)] },
      { say: { en: 'A pivot keeps one finger in place and swings the hand around it, to reach a fret just outside the position without a full shift.', he: 'פיבוט משאיר אצבע אחת במקומה ומסובב את היד סביבה, כדי להגיע לסריג שמחוץ למצב בלי מעבר מלא.' }, play: [line([33, 32, 33, 37], 0.4)] },
      { say: { en: 'Octaves and 10ths are wide shapes. The octave lies two strings up and two frets higher; the 10th adds a major third above the octave.', he: 'אוקטבות ודצימות הן צורות רחבות. האוקטבה נמצאת שני מיתרים למעלה ושני סריגים גבוה יותר; הדצימה מוסיפה טרצה גדולה מעל האוקטבה.' }, play: [line([33, 45, 33, 49], 0.45)] },
      { say: { en: 'The common mistake is a squeezing thumb. Squeeze and the hand tires in minutes. Let the arm’s weight do the pressing.', he: 'הטעות הנפוצה היא אגודל לוחץ. לוחצים, והיד מתעייפת תוך דקות. נותנים למשקל הזרוע לעשות את הלחיצה.' }, show: { text: { en: 'weight, not squeeze', he: 'משקל, לא לחיצה' } } },
      { say: { en: 'Warm up with the chromatic pattern before long sessions, slowly, then stretch gently. The bass’s frets are wide; respect the hand.', he: 'מתחממים בתבנית הכרומטית לפני אימון ארוך, לאט, ואז מותחים בעדינות. הסריגים בבס רחבים; שומרים על היד.' } },
      { say: { en: 'Where it lives: every scale, walking line and fill depends on a fretting hand that moves without strain. To keep: one finger per fret or 1-2-4 low on the neck, the thumb behind the middle finger, the fingertip just behind the fret, the arm’s weight instead of a squeeze, and shifts that arrive before the note.', he: 'איפה זה חי: כל סולם, כל קו בס מהלך וכל מעבר תלויים ביד לוחצת שזזה בלי מאמץ. מה לזכור: אצבע לכל סריג או 1-2-4 נמוך על הצוואר, האגודל מאחורי האצבע האמצעית, קצה האצבע ממש מאחורי הסריג, משקל הזרוע במקום לחיצה, ומעברי מצב שמגיעים לפני הצליל.' } },
    ],
  },
  {
    id: 'fam-b-length',
    area: 'play',
    emoji: '',
    title: { en: 'Muting and note length', he: 'השתקה ואורך צליל' },
    takeaway: { en: 'The end of a note is as exact as its start: real rests, staccato and legato, idle strings silent, a release on the “and”, palm and thumb mutes.', he: 'סוף הצליל מדויק כמו ההתחלה שלו: הפסקות אמיתיות, סטקטו ולגאטו, מיתרים לא בשימוש שקטים, שחרור על ה"וְ", השתקת כף יד ואגודל.' },
    steps: [
      { say: { en: 'Hi {name}! On the bass, the end of a note matters as much as its start. This family trains you to stop notes exactly.', he: 'היי {name}! בבס, סוף הצליל חשוב כמו ההתחלה שלו. המשפחה הזאת מאמנת אתכם לעצור צלילים בדיוק.' }, play: [line([33, 33, 33, 33], 0.5, 0.45)] },
      { say: { en: 'A rest is real silence. Lift the fretting finger until it barely touches the string, or touch an open string with the plucking hand.', he: 'הפסקה היא שקט אמיתי. מרימים את האצבע הלוחצת עד שהיא בקושי נוגעת במיתר, או נוגעים במיתר פתוח ביד הפורטת.' }, play: [bass([[33, 0, 0.45], [33, 1, 0.45], [36, 2, 0.45]], 3)], show: { text: { en: 'note · silence · note', he: 'צליל · שקט · צליל' } } },
      { say: { en: 'Staccato is short, legato is joined. Same notes, two different grooves. Many bass lines release on the “and”, half a beat long.', he: 'סטקטו קצר, לגאטו מחובר. אותם צלילים, שני גרובים שונים. הרבה קווי בס משחררים על ה"וְ", באורך של חצי פעמה.' }, play: [line([33, 36, 38, 40], 0.4, 0.3), line([33, 36, 38, 40], 0.4, 1)] },
      { say: { en: 'The one thing to watch: the strings you are not playing. Open strings ring in sympathy; keep them still with free fingers of both hands.', he: 'הדבר האחד לשים אליו לב: המיתרים שלא מנגנים עליהם. מיתרים פתוחים מצלצלים מעצמם; משקיטים אותם באצבעות פנויות של שתי הידיים.' }, play: [bass([[40, 0, 0.5], [28, 0, 1.5, 0.35]], 1.8)], show: { text: { en: 'silence the idle strings', he: 'להשקיט מיתרים לא בשימוש' } } },
      { say: { en: 'Your turn: free time first where the notes are new, then the tempo ladder. The app measures how long every note lasts, not only when it starts.', he: 'תורכם: קודם בזמן חופשי כשהצלילים חדשים, ואז סולם הטמפו. האפליקציה מודדת כמה זמן כל צליל נמשך, לא רק מתי הוא מתחיל.' }, show: { text: { en: 'start · length · end', he: 'התחלה · אורך · סוף' } } },
    ],
    more: [
      { say: { en: 'Muted octaves: play the octave shape while the free fingers rest on the string between, so only the two notes sound.', he: 'אוקטבות מושתקות: מנגנים את צורת האוקטבה בזמן שהאצבעות הפנויות נחות על המיתר שביניהן, כך שרק שני הצלילים נשמעים.' }, play: [line([33, 45, 33, 45], 0.3, 0.5)] },
      { say: { en: 'Palm muting: rest the edge of the plucking hand on the strings near the bridge and pluck with the thumb. The note turns short and thick, a vintage sound.', he: 'השתקת כף יד: מניחים את צד היד הפורטת על המיתרים ליד הגשר ופורטים באגודל. הצליל נעשה קצר ועבה, צליל וינטג׳.' }, play: [line([33, 33, 40, 38], 0.4, 0.35)] },
      { say: { en: 'In a groove, each note length is a choice. A short note on beat one leaves room for the snare; a long one fills the bar. Copy the lengths you hear.', he: 'בגרוב, כל אורך צליל הוא בחירה. צליל קצר בפעמה אחת משאיר מקום לסנר; צליל ארוך ממלא את התיבה. מעתיקים את האורכים ששומעים.' }, play: [kit(96, 4, ROCK_BEAT, [[33, 0, 0.5], [33, 1.5, 0.5], [33, 2, 1.5]])] },
      { say: { en: 'The common mistake is letting every note ring until the next. That is legato by accident. Decide each length on purpose.', he: 'הטעות הנפוצה היא לתת לכל צליל לצלצל עד הבא. זה לגאטו בטעות. מחליטים על כל אורך בכוונה.' }, show: { text: { en: 'every length on purpose', he: 'כל אורך בכוונה' } } },
      { say: { en: 'Practise one bar four ways: all short, all long, long-short, short-long. Record it, and listen to how the groove changes with the same notes.', he: 'מתרגלים תיבה אחת בארבע דרכים: הכול קצר, הכול ארוך, ארוך־קצר, קצר־ארוך. מקליטים, ומקשיבים איך הגרוב משתנה עם אותם צלילים.' } },
      { say: { en: 'Where it lives: the tight lines of funk, the short notes of reggae and Motown, the long ones of ballads. To keep: rests are real silence, every length is chosen, idle strings stay quiet, and the release is placed as carefully as the attack.', he: 'איפה זה חי: הקווים ההדוקים של פאנק, הצלילים הקצרים של רגאיי ומוטאון, הארוכים של בלדות. מה לזכור: הפסקות הן שקט אמיתי, כל אורך נבחר, מיתרים לא בשימוש נשארים שקטים, והשחרור ממוקם בהקפדה כמו ההתקפה.' } },
    ],
  },
  {
    id: 'fam-b-styles',
    area: 'play',
    emoji: '',
    title: { en: 'Style vocabulary', he: 'אוצר מילים סגנוני' },
    takeaway: { en: 'Rock, Motown, shuffle, disco, reggae, funk, bossa, samba, tumbao and more: each style has its own notes, lengths and place in the beat.', he: 'רוק, מוטאון, שאפל, דיסקו, רגאיי, פאנק, בוסה, סמבה, טומבאו ועוד: לכל סגנון צלילים, אורכים ומקום בפעמה משלו.' },
    steps: [
      { say: { en: 'Hi {name}! Every style has its own bass language. This family plays them one by one, each with its band.', he: 'היי {name}! לכל סגנון יש שפת בס משלו. המשפחה הזאת מנגנת אותם אחד אחד, כל אחד עם הלהקה שלו.' }, play: [kit(110, 4, ROCK_BEAT, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t): [number, number, number] => [28, t, 0.5]))] },
      { say: { en: 'Rock drives straight eighths on the root. Motown moves: syncopated, melodic, with passing notes between the chord tones.', he: 'רוק דוחף שמיניות ישרות על השורש. מוטאון זז: מסונכפ, מלודי, עם צלילים עוברים בין צלילי האקורד.' }, play: [line([33, 33, 33, 33], 0.25, 0.9), line([33, 40, 45, 44, 43, 40], 0.25, 0.8)] },
      { say: { en: 'Disco bounces in octaves. Reggae leaves space, with the drums dropping on beat three. Bossa nova plays the root and the 5th in a gentle long-short pattern.', he: 'דיסקו קופץ באוקטבות. רגאיי משאיר מקום, כשהתופים נופלים בפעמה שלוש. בוסה נובה מנגנת שורש וקווינטה בתבנית רכה של ארוך־קצר.' }, play: [line([33, 45, 33, 45, 33, 45, 33, 45], 0.2, 0.5), bass([[33, 0, 0.55], [28, 0.6, 0.15], [28, 0.8, 0.55], [33, 1.4, 0.15]], 1.9)] },
      { say: { en: 'The one thing to watch: listen to the drums first. The kick and the hi-hat tell you where the bass notes belong in each style.', he: 'הדבר האחד לשים אליו לב: מקשיבים קודם לתופים. הקיק וההיי־האט אומרים איפה צלילי הבס שייכים בכל סגנון.' }, play: [kit(100, 4, [[0, 'kick'], [2.5, 'kick'], [1, 'snare'], [3, 'snare']], [[33, 0, 1], [33, 2.5, 1]])], show: { text: { en: 'drums first', he: 'קודם התופים' } } },
      { say: { en: 'Your turn: style levels are timed with the band from the first take, and the tempo ladder starts slow. Every note and its length is measured.', he: 'תורכם: שלבי הסגנון מתוזמנים עם הלהקה מהניסיון הראשון, וסולם הטמפו מתחיל לאט. כל צליל והאורך שלו נמדדים.' }, show: { text: { en: 'with the band from the start', he: 'עם הלהקה מההתחלה' } } },
    ],
    more: [
      { say: { en: 'The blues shuffle swings its eighths long-short, often walking root, 3rd, 5th, 6th and back. It is the base of countless songs.', he: 'שאפל בלוז מנגן את השמיניות ארוך־קצר, הרבה פעמים הולך שורש, טרצה, קווינטה, סקסטה וחזרה. הוא הבסיס של אינספור שירים.' }, play: [bass([[33, 0, 0.3], [33, 0.33, 0.15], [37, 0.5, 0.3], [37, 0.83, 0.15], [40, 1, 0.3], [40, 1.33, 0.15], [42, 1.5, 0.3], [42, 1.83, 0.15]], 2.3)] },
      { say: { en: 'Funk lives on sixteenths: a strong note on one, ghost notes and short stabs around it, and silence used as part of the groove.', he: 'פאנק חי על שש־עשריות: צליל חזק באחת, צלילי רפאים ודקירות קצרות סביבו, ושקט שמשמש כחלק מהגרוב.' }, play: [lineV([[28, 0.85], [28, 0.25], [40, 0.6], [28, 0.25], [28, 0.25], [38, 0.6], [40, 0.7], [28, 0.25]], 0.15, 0.6)] },
      { say: { en: 'The tumbao, from Cuban music, anticipates: the bass plays on the “and” of two and on four, rarely on one. It pulls the band forward.', he: 'הטומבאו, מהמוזיקה הקובנית, מקדים: הבס מנגן על ה"וְ" של שתיים ועל ארבע, כמעט אף פעם לא באחת. הוא מושך את הלהקה קדימה.' }, play: [bass([[40, 0.75, 0.6], [33, 1.5, 0.6], [40, 2.75, 0.6], [33, 3.5, 0.6]], 4.2)] },
      { say: { en: 'The common mistake is playing every style like rock: straight and on the beat. Each style has a home inside the beat; learn where it is.', he: 'הטעות הנפוצה היא לנגן כל סגנון כמו רוק: ישר ועל הפעמה. לכל סגנון יש בית בתוך הפעמה; לומדים איפה הוא.' }, show: { text: { en: 'each style, its own place', he: 'לכל סגנון מקום משלו' } } },
      { say: { en: 'Listen to two records of each style before its level, and hum the bass line. When you can sing it, your hands learn it fast.', he: 'מקשיבים לשתי הקלטות של כל סגנון לפני השלב שלו, ומזמזמים את קו הבס. כשאפשר לשיר אותו, הידיים לומדות אותו מהר.' } },
      { say: { en: 'Where it lives: on any gig the bandleader may call a rock song, a bossa and a funk tune in one set. To keep: listen to the drums first, find the style’s place in the beat, copy its note lengths, hum the line before you play it, and keep the time steady.', he: 'איפה זה חי: בכל הופעה מנהל הלהקה יכול לבקש שיר רוק, בוסה ושיר פאנק באותו סט. מה לזכור: להקשיב קודם לתופים, למצוא את המקום של הסגנון בתוך הפעמה, להעתיק את אורכי הצלילים שלו, לזמזם את הקו לפני שמנגנים אותו, ולשמור על זמן יציב.' } },
    ],
  },
  {
    id: 'fam-b-ghost',
    area: 'play',
    emoji: '',
    title: { en: 'Ghost notes and 16th funk', he: 'צלילי רפאים ופאנק בשש־עשריות' },
    takeaway: { en: 'A ghost is a dead, pitchless click: the fretting finger touches the string without pressing. Quieter than the notes, exactly on its sixteenth.', he: 'צליל רפאים הוא נקישה מתה, בלי גובה: האצבע הלוחצת נוגעת במיתר בלי ללחוץ. שקט יותר מהצלילים, בדיוק על השש־עשרית שלו.' },
    steps: [
      { say: { en: 'Hi {name}! Ghost notes are the secret of funk bass: short, pitchless clicks that fill the sixteenths between the real notes.', he: 'היי {name}! צלילי רפאים הם הסוד של בס פאנק: נקישות קצרות בלי גובה שממלאות את השש־עשריות בין הצלילים האמיתיים.' }, play: [lineV([[28, 0.85], [28, 0.2], [28, 0.2], [40, 0.7], [28, 0.2], [38, 0.7], [28, 0.2], [40, 0.7]], 0.15, 0.5)] },
      { say: { en: 'To make a dead note, lay a fretting finger across the string without pressing it to the fret, and pluck. You hear a thud, not a pitch.', he: 'כדי ליצור צליל מת, מניחים אצבע לוחצת על המיתר בלי ללחוץ אותו לסריג, ופורטים. שומעים חבטה, לא גובה.' }, play: [lineV([[33, 0.2], [33, 0.2], [33, 0.2], [33, 0.2]], 0.35, 0.3)], show: { text: { en: 'touch, don’t press', he: 'לגעת, לא ללחוץ' } } },
      { say: { en: 'Then ghosts in sixteenths, a ghost before the octave, and two-bar funk lines where real notes and ghosts take turns.', he: 'אחר כך רפאים בשש־עשריות, רפאים לפני האוקטבה, וקווי פאנק של שתי תיבות שבהם צלילים אמיתיים ורפאים מתחלפים.' }, play: [lineV([[33, 0.85], [33, 0.2], [45, 0.7], [33, 0.2], [33, 0.85], [33, 0.2], [45, 0.7], [33, 0.2]], 0.15, 0.5)] },
      { say: { en: 'The one thing to watch: ghosts quieter than the notes. If they are as loud, the line turns into noise; the notes must stand out.', he: 'הדבר האחד לשים אליו לב: הרפאים שקטים מהצלילים. אם הם חזקים באותה מידה, הקו הופך לרעש; הצלילים צריכים לבלוט.' }, play: [lineV([[28, 0.85], [28, 0.15], [28, 0.15], [28, 0.15], [40, 0.8], [28, 0.15], [28, 0.15], [28, 0.15]], 0.15, 0.5)], show: { text: { en: 'ghost < note', he: 'רפאים < צליל' } } },
      { say: { en: 'Your turn: free time first where the notes are new, then the tempo ladder. Every sixteenth is measured, ghosts included.', he: 'תורכם: קודם בזמן חופשי כשהצלילים חדשים, ואז סולם הטמפו. כל שש־עשרית נמדדת, כולל הרפאים.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Why ghosts? They keep the plucking hand moving in even sixteenths, so the real notes fall exactly in place. They are a clock you can hear.', he: 'למה רפאים? הם שומרים על היד הפורטת בתנועה של שש־עשריות שוות, כך שהצלילים האמיתיים נופלים בדיוק במקום. הם שעון שאפשר לשמוע.' }, play: [lineV([[33, 0.8], [33, 0.2], [33, 0.2], [33, 0.2], [36, 0.7], [33, 0.2], [33, 0.2], [33, 0.2]], 0.15, 0.5)] },
      { say: { en: 'A ghost just before the octave makes the jump feel like one move: dead note, then the octave on the next sixteenth.', he: 'צליל רפאים רגע לפני האוקטבה הופך את הקפיצה לתנועה אחת: צליל מת, ואז האוקטבה בשש־עשרית הבאה.' }, play: [lineV([[33, 0.8], [33, 0.2], [45, 0.75], [33, 0.2], [33, 0.8], [33, 0.2], [45, 0.75]], 0.15, 0.5)] },
      { say: { en: 'A ghost can also come from the plucking hand: pluck the string while the fretting hand damps it. Both ways give the same click.', he: 'צליל רפאים יכול לבוא גם מהיד הפורטת: פורטים את המיתר בזמן שהיד הלוחצת משתיקה אותו. שתי הדרכים נותנות אותה נקישה.' }, show: { text: { en: 'dampen · pluck · click', he: 'להשתיק · לפרוט · נקישה' } } },
      { say: { en: 'The common mistake is a ghost that leaks pitch. Lift the finger a little more, or use two fingers flat on the string, until the note is gone.', he: 'הטעות הנפוצה היא רפאים שמשאירים גובה. מרימים את האצבע עוד קצת, או מניחים שתי אצבעות שטוחות על המיתר, עד שהצליל נעלם.' }, show: { text: { en: 'no pitch at all', he: 'בלי גובה בכלל' } } },
      { say: { en: 'Practise with a slow click: four sixteenths per beat, ghosts everywhere, then turn one ghost per beat into a real note. Move it around.', he: 'מתרגלים עם קליק איטי: ארבע שש־עשריות לפעמה, רפאים בכל מקום, ואז הופכים רפאים אחד בכל פעמה לצליל אמיתי. מזיזים אותו ממקום למקום.' } },
      { say: { en: 'Where it lives: funk and soul bass lines, where the ghosts make the groove dance between the notes. To keep: touch, don’t press; no pitch at all; ghosts quieter than the notes; every one exactly on its sixteenth; and a slow click until the hand runs evenly by itself.', he: 'איפה זה חי: קווי בס של פאנק וסול, שבהם הרפאים גורמים לגרוב לרקוד בין הצלילים. מה לזכור: לגעת, לא ללחוץ; בלי גובה בכלל; רפאים שקטים מהצלילים; כל אחד בדיוק על השש־עשרית שלו; וקליק איטי עד שהיד רצה בשוויון בעצמה.' } },
    ],
  },
  {
    id: 'fam-b-pick',
    area: 'play',
    emoji: '',
    title: { en: 'Pick technique on bass', he: 'נגינה במפרט בבס' },
    takeaway: { en: 'Down-strokes for drive, alternate picking for speed, palm muting for weight: every stroke the same loudness, in time.', he: 'מכות למטה לדחיפה, פריטה מתחלפת למהירות, השתקת כף יד למשקל: כל מכה באותה עוצמה, בזמן.' },
    steps: [
      { say: { en: 'Hi {name}! Many rock and punk bassists play with a pick. It gives a clear, punchy attack that cuts through loud guitars.', he: 'היי {name}! הרבה בסיסטים ברוק ובפאנק מנגנים במפרט. הוא נותן התקפה ברורה וחזקה שחותכת דרך גיטרות רועשות.' }, play: [line([28, 28, 28, 28, 28, 28, 28, 28], 0.22, 0.8)] },
      { say: { en: 'Down-strokes first: every eighth with a down-stroke. It drives hard, and keeps every note the same.', he: 'קודם מכות למטה: כל שמינית במכה למטה. זה דוחף חזק, ושומר על כל צליל אותו דבר.' }, play: [kit(120, 4, ROCK_BEAT, [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t): [number, number, number] => [28, t, 0.45]))], show: { text: { en: 'down · down · down · down', he: 'למטה · למטה · למטה · למטה' } } },
      { say: { en: 'Then alternate picking for sixteenths, down on the beat and up between, string crossing, and the palm-muted chug.', he: 'אחר כך פריטה מתחלפת לשש־עשריות, למטה על הפעמה ולמעלה ביניהן, מעבר מיתרים, וצ׳אג מושתק בכף היד.' }, play: [lineV([[33, 0.75], [33, 0.5], [33, 0.75], [33, 0.5], [33, 0.75], [33, 0.5], [33, 0.75], [33, 0.5]], 0.14, 0.7)] },
      { say: { en: 'The one thing to watch: up-strokes as loud as down-strokes. Listen for a limp up-stroke, and keep the motion small, from the wrist.', he: 'הדבר האחד לשים אליו לב: מכות למעלה חזקות כמו מכות למטה. מקשיבים למכה למעלה חלשה, ושומרים על תנועה קטנה, משורש כף היד.' }, play: [lineV([[33, 0.7], [33, 0.7], [33, 0.7], [33, 0.7], [33, 0.7], [33, 0.7]], 0.18, 0.7)], show: { text: { en: 'down = up', he: 'למטה = למעלה' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. Every stroke, down and up alike, is measured for time and for evenness.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. כל מכה, למטה ולמעלה כאחת, נמדדת בזמן ובשוויון.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Palm muting: rest the side of the picking hand on the strings right by the bridge. The note gets short and thick, the chug of rock and metal.', he: 'השתקת כף יד: מניחים את צד היד הפורטת על המיתרים ממש ליד הגשר. הצליל נעשה קצר ועבה, הצ׳אג של רוק ומטאל.' }, play: [line([28, 28, 28, 28, 31, 31, 33, 33], 0.2, 0.4)] },
      { say: { en: 'Down-strokes for two minutes is a stamina level. Relax between strokes; the arm does little, the wrist does the work.', he: 'מכות למטה במשך שתי דקות הוא שלב של סבולת. מרפים בין המכות; הזרוע עושה מעט, שורש כף היד עושה את העבודה.' }, play: [line([28, 28, 28, 28, 28, 28], 0.2, 0.8)] },
      { say: { en: 'Inside and outside picking cross strings between or around them. Economy strokes keep the pick moving in one direction across two strings.', he: 'פריטה פנימית וחיצונית עוברות בין מיתרים מביניהם או מסביבם. מכות אקונומיות שומרות על המפרט בכיוון אחד על פני שני מיתרים.' }, play: [line([33, 38, 33, 38, 31, 36, 31, 36], 0.18, 0.8)] },
      { say: { en: 'The common mistake is a stiff wrist that tires fast. Hold the pick loosely, let the wrist swing, and stop before it burns.', he: 'הטעות הנפוצה היא שורש כף יד נוקשה שמתעייף מהר. מחזיקים את המפרט ברפיון, נותנים לשורש כף היד להתנדנד, ועוצרים לפני שזה שורף.' }, show: { text: { en: 'loose grip · free wrist', he: 'אחיזה רפויה · שורש כף יד חופשי' } } },
      { say: { en: 'A thicker pick gives a firmer attack on bass strings. Try a few, then keep one, so the hand learns its feel.', he: 'מפרט עבה יותר נותן התקפה יציבה יותר על מיתרי בס. מנסים כמה, ואז נשארים עם אחד, כדי שהיד תלמד את התחושה שלו.' } },
      { say: { en: 'Where it lives: rock, punk and metal records, where a picked bass punches through loud guitars and locks with the kick drum. To keep: down-strokes for drive, alternate strokes for speed, up-strokes as loud as down-strokes, palm muting for weight, a loose grip and a free wrist, and a short break whenever the arm tightens.', he: 'איפה זה חי: הקלטות רוק, פאנק ומטאל, שבהן בס במפרט חותך דרך גיטרות רועשות וננעל עם הקיק. מה לזכור: מכות למטה לדחיפה, מכות מתחלפות למהירות, מכות למעלה חזקות כמו מכות למטה, השתקת כף יד למשקל, אחיזה רפויה ושורש כף יד חופשי, והפסקה קצרה בכל פעם שהזרוע מתכווצת.' } },
    ],
  },
  {
    id: 'fam-b-impro',
    area: 'play',
    emoji: '',
    title: { en: 'Fills and target notes', he: 'מעברים וצלילי מטרה' },
    takeaway: { en: 'Leave the groove for a moment and land on a target, the root or the 3rd, exactly on beat one. Then solos built on chord tones.', he: 'יוצאים מהגרוב לרגע ונוחתים על מטרה, השורש או הטרצה, בדיוק בפעמה אחת. ואז סולואים שבנויים על צלילי האקורד.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains bass fills and solos. Every idea leaves the groove and comes back to land on a target note.', he: 'היי {name}! המשפחה הזאת מאמנת מעברים וסולואים בבס. כל רעיון יוצא מהגרוב וחוזר לנחות על צליל מטרה.' }, play: [line([33, 33, 33, 36, 38, 40, 43, 45], 0.25, 0.85)] },
      { say: { en: 'A fill is short: a beat or two at the end of a phrase. Then the next bar starts on its target, first the root, later the 3rd.', he: 'מעבר הוא קצר: פעמה או שתיים בסוף משפט. ואז התיבה הבאה מתחילה על המטרה שלה, קודם השורש, אחר כך הטרצה.' }, play: [line([33, 33, 40, 43, 42, 41, 38], 0.3, 0.85)], show: { text: { en: 'fill → target on 1', he: 'מעבר ← מטרה באחת' } } },
      { say: { en: 'Later: two-bar answers over a vamp, pentatonic and blues solos, and two-five-one lines with guide tones and enclosures.', he: 'בהמשך: תשובות של שתי תיבות מעל וואמפ, סולואים בפנטטוני ובבלוז, וקווי שתיים־חמש־אחת עם צלילים מנחים וכיתורים.' }, play: [line([45, 48, 50, 52, 55, 52, 50, 45], 0.25)] },
      { say: { en: 'The one thing to watch: land on time. A fill that arrives late breaks the groove, however good its notes are.', he: 'הדבר האחד לשים אליו לב: לנחות בזמן. מעבר שמגיע באיחור שובר את הגרוב, כמה שהצלילים שלו טובים.' }, play: [kit(100, 8, [[0, 'kick'], [1, 'snare'], [2, 'kick'], [3, 'snare'], [4, 'kick'], [5, 'snare'], [6, 'kick'], [7, 'snare']], [[33, 0, 1], [33, 1, 1], [33, 2, 0.5], [40, 2.5, 0.5], [43, 3, 0.5], [44, 3.5, 0.5], [45, 4, 1]])], show: { text: { en: 'land on time', he: 'לנחות בזמן' } } },
      { say: { en: 'Your turn: these levels play with the band and a form, so they are timed from the first take. Every landing is measured against the beat and the chord.', he: 'תורכם: השלבים האלה מתנגנים עם הלהקה ועם צורה, אז הם מתוזמנים מהניסיון הראשון. כל נחיתה נמדדת מול הפעמה ומול האקורד.' }, show: { text: { en: 'target · on 1 · in the chord', he: 'מטרה · באחת · באקורד' } } },
    ],
    more: [
      { say: { en: 'Why targets? A fill without a destination sounds like noodling. With a target, even three notes sound like a plan.', he: 'למה מטרות? מעבר בלי יעד נשמע כמו שיטוט. עם מטרה, אפילו שלושה צלילים נשמעים כמו תוכנית.' }, play: [line([40, 42, 44, 45], 0.3)] },
      { say: { en: 'Landing on the 3rd is stronger than the root: it says major or minor. Over A7, land on C sharp; over D minor, land on F.', he: 'נחיתה על הטרצה חזקה יותר מהשורש: היא אומרת מז׳ור או מינור. מעל A7 נוחתים על דו דיאז; מעל רה מינור נוחתים על פה.' }, play: [line([38, 40, 42, 44, 45, 49], 0.3)] },
      { say: { en: 'Trading fours with the drums: four bars of solo, four bars of drums, and you come back exactly where the form says.', he: 'חילופי ארבע עם התופים: ארבע תיבות סולו, ארבע תיבות תופים, וחוזרים בדיוק איפה שהצורה אומרת.' }, show: { text: { en: '4 bass · 4 drums', he: '4 בס · 4 תופים' } } },
      { say: { en: 'The common mistake is too many fills. The groove is the job; a fill every four or eight bars is plenty.', he: 'הטעות הנפוצה היא יותר מדי מעברים. הגרוב הוא העבודה; מעבר כל ארבע או שמונה תיבות מספיק לגמרי.' }, show: { text: { en: 'groove first', he: 'קודם הגרוב' } } },
      { say: { en: 'Sing a fill first, then play it. If you can sing where it lands, your fingers will find it, and it will land on time.', he: 'שרים מעבר קודם, ואז מנגנים אותו. אם אפשר לשיר איפה הוא נוחת, האצבעות ימצאו אותו, והוא ינחת בזמן.' }, play: [line([33, 36, 38, 40, 43, 45], 0.3)] },
      { say: { en: 'Where it lives: a fill at the end of a chorus, a short answer to the singer, a solo chorus on a blues or a standard, trading fours at a jam. To keep: every fill has a target, the target is a chord tone, it lands exactly on beat one, and the groove comes back first. Fewer fills, better fills.', he: 'איפה זה חי: מעבר בסוף פזמון, תשובה קצרה לזמר, סבב סולו על בלוז או על סטנדרט, חילופי ארבע בג׳אם. מה לזכור: לכל מעבר יש מטרה, המטרה היא צליל של האקורד, היא נוחתת בדיוק בפעמה אחת, והגרוב חוזר קודם. פחות מעברים, מעברים טובים יותר.' } },
    ],
  },
  {
    id: 'fam-b-legato',
    area: 'play',
    emoji: '',
    title: { en: 'Slides, legato and harmonics', he: 'החלקות, לגאטו והרמוניקים' },
    takeaway: { en: 'Slides that land on the beat, hammer-ons and pull-offs as loud as plucked notes, harmonics at frets 12, 7 and 5, vibrato on long notes.', he: 'החלקות שנוחתות על הפעמה, הקשות ומשיכות חזקות כמו צלילים פרוטים, הרמוניקים בסריגים 12, 7 ו־5, ויברטו על צלילים ארוכים.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the fretting hand’s expression: slides, hammer-ons, pull-offs, harmonics and vibrato.', he: 'היי {name}! המשפחה הזאת מאמנת את ההבעה של היד הלוחצת: החלקות, הקשות, משיכות, הרמוניקים וויברטו.' }, play: [line([31, 33, 36, 38, 36, 33], 0.3)] },
      { say: { en: 'A slide: pluck once and glide the finger to the new fret, keeping the pressure on. The target note must arrive on the beat.', he: 'החלקה: פורטים פעם אחת ומחליקים את האצבע לסריג החדש, תוך שמירה על הלחץ. צליל היעד חייב להגיע על הפעמה.' }, play: [line([31, 33], 0.5)], show: { text: { en: 'slide → on the beat', he: 'החלקה ← על הפעמה' } } },
      { say: { en: 'Hammer-on: pluck, then bring a finger down hard on a higher fret. Pull-off: pull the finger off sideways, so it plucks the string.', he: 'הקשה: פורטים, ואז מורידים אצבע בחוזקה על סריג גבוה יותר. משיכה: מושכים את האצבע הצידה, כך שהיא פורטת את המיתר.' }, play: [line([38, 40, 38, 40], 0.35)] },
      { say: { en: 'The one thing to watch: even volume and exact time. The slid, hammered or pulled note is as loud and as on time as a plucked one.', he: 'הדבר האחד לשים אליו לב: עוצמה שווה וזמן מדויק. הצליל המוחלק, המוקש או הנמשך חזק ומדויק בזמן כמו צליל פרוט.' }, play: [lineV([[38, 0.7], [40, 0.65], [41, 0.65], [40, 0.65]], 0.3)], show: { text: { en: 'every note equal', he: 'כל צליל שווה' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. Every note is measured, whether it was plucked or not.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. כל צליל נמדד, בין אם נפרט ובין אם לא.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Natural harmonics: touch the string lightly right over the fret wire, without pressing, and pluck. Fret 12 gives the octave, fret 7 the octave and a 5th, fret 5 two octaves.', he: 'הרמוניקים טבעיים: נוגעים במיתר בעדינות ממש מעל תיל הסריג, בלי ללחוץ, ופורטים. סריג 12 נותן את האוקטבה, סריג 7 אוקטבה וקווינטה, סריג 5 שתי אוקטבות.' }, play: [line([40, 47, 52], 0.7)] },
      { say: { en: 'Vibrato on long notes: a small, even rocking of the finger along or across the string. It keeps a long note alive.', he: 'ויברטו על צלילים ארוכים: נדנוד קטן ושווה של האצבע לאורך המיתר או לרוחבו. הוא שומר על צליל ארוך חי.' }, play: [line([45, 46, 45, 46, 45], 0.2)] },
      { say: { en: 'A pedal tone repeats one note, often an open string, while a line moves above it. The open string rings; the fretted notes change.', he: 'צליל עוגב חוזר על צליל אחד, הרבה פעמים מיתר פתוח, בזמן שקו זז מעליו. המיתר הפתוח מצלצל; הצלילים הלחוצים משתנים.' }, play: [line([33, 40, 33, 42, 33, 44, 33, 45], 0.22)] },
      { say: { en: 'The common mistake is a slide that arrives late. Start the slide early enough that the target lands exactly on the beat.', he: 'הטעות הנפוצה היא החלקה שמגיעה באיחור. מתחילים את ההחלקה מוקדם מספיק כדי שהיעד ינחת בדיוק על הפעמה.' }, show: { text: { en: 'start early, land on time', he: 'להתחיל מוקדם, לנחות בזמן' } } },
      { say: { en: 'Practise each technique on one string first, slowly, then inside short lines. Expression is a choice, so use it where the music asks.', he: 'מתרגלים כל טכניקה קודם על מיתר אחד, לאט, ואז בתוך קווים קצרים. הבעה היא בחירה, אז משתמשים בה איפה שהמוזיקה מבקשת.' } },
      { say: { en: 'Where it lives: singing ballad lines, funk slides into the root, harmonic chords in solo pieces and fusion. To keep: keep the pressure while sliding, land on the beat, hammer and pull as loudly as you pluck, touch harmonics right over the fret wire, and save vibrato for long notes.', he: 'איפה זה חי: קווי בלדה שרים, החלקות פאנק אל השורש, אקורדים של הרמוניקים ביצירות סולו ובפיוז׳ן. מה לזכור: לשמור על הלחץ בזמן ההחלקה, לנחות על הפעמה, להקיש ולמשוך חזק כמו שפורטים, לגעת בהרמוניקים ממש מעל תיל הסריג, ולשמור את הוויברטו לצלילים ארוכים.' } },
    ],
  },
  {
    id: 'fam-b-slap',
    area: 'play',
    emoji: '',
    title: { en: 'Slap and pop', he: 'סלאפ ופופ' },
    takeaway: { en: 'The thumb strikes the low string and bounces off; a finger hooks a high string and snaps it. Octave slap and pop, ghost slaps, hammers, double thumbing.', he: 'האגודל מכה במיתר הנמוך וקופץ ממנו; אצבע מתחת למיתר גבוה מושכת אותו ומקפיצה אותו. סלאפ ופופ באוקטבות, סלאפים רפאים, הקשות, אגודל כפול.' },
    steps: [
      { say: { en: 'Hi {name}! Slap bass turns the bass into a drum: the thumb is the kick, the popping finger is the snare.', he: 'היי {name}! סלאפ הופך את הבס לתוף: האגודל הוא הקיק, האצבע המקפיצה היא הסנר.' }, play: [lineV([[33, 0.85], [45, 0.75], [33, 0.85], [45, 0.75], [31, 0.85], [43, 0.75], [33, 0.85], [45, 0.75]], 0.2, 0.5)] },
      { say: { en: 'The slap: the side of the thumb strikes the string over the end of the neck and bounces straight off, like a drumstick. The motion comes from turning the wrist.', he: 'הסלאפ: צד האגודל מכה במיתר מעל סוף הצוואר וקופץ מיד, כמו מקל תופים. התנועה באה מסיבוב שורש כף היד.' }, play: [lineV([[28, 0.85], [28, 0.85], [28, 0.85], [28, 0.85]], 0.4, 0.5)], show: { text: { en: 'thumb: strike and bounce', he: 'אגודל: מכה וקפיצה' } } },
      { say: { en: 'The pop: the index finger hooks under a high string and pulls it away, so it snaps back against the frets. Slap the root, pop the octave.', he: 'הפופ: האצבע המורה נכנסת מתחת למיתר גבוה ומושכת אותו החוצה, כך שהוא נוחת בחבטה על הסריגים. סלאפ על השורש, פופ על האוקטבה.' }, play: [lineV([[33, 0.85], [45, 0.8], [33, 0.85], [45, 0.8]], 0.3, 0.5)] },
      { say: { en: 'The one thing to watch: let the thumb bounce. If it stays on the string, the note dies; if it digs in, the tone turns harsh.', he: 'הדבר האחד לשים אליו לב: לתת לאגודל לקפוץ. אם הוא נשאר על המיתר, הצליל מת; אם הוא חופר, הצליל נעשה צורם.' }, play: [lineV([[28, 0.85], [28, 0.3], [28, 0.85]], 0.4, 0.5)], show: { text: { en: 'bounce, don’t press', he: 'לקפוץ, לא ללחוץ' } } },
      { say: { en: 'Your turn: free time first, then the tempo ladder. Every slap and pop is measured for time and for its place in the groove.', he: 'תורכם: קודם בזמן חופשי, ואז סולם הטמפו. כל סלאפ ופופ נמדדים בזמן ובמקום שלהם בגרוב.' }, show: { text: { en: 'free → ladder', he: 'חופשי ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Ghost slaps come from the fretting hand: slap the strings flat with the fingers to make a muted click between the real notes.', he: 'סלאפים רפאים באים מהיד הלוחצת: מכים על המיתרים בשטוחות עם האצבעות ויוצרים נקישה מושתקת בין הצלילים האמיתיים.' }, play: [lineV([[33, 0.85], [33, 0.2], [45, 0.8], [33, 0.2], [33, 0.85], [33, 0.2], [45, 0.8], [33, 0.2]], 0.15, 0.4)] },
      { say: { en: 'Hammer after the slap: slap a note, then hammer a higher fret on the same string. Two notes from one strike, the funk sound.', he: 'הקשה אחרי הסלאפ: מכים צליל, ואז מקישים על סריג גבוה יותר באותו מיתר. שני צלילים ממכה אחת, הצליל של פאנק.' }, play: [lineV([[28, 0.85], [31, 0.7], [33, 0.85], [36, 0.7]], 0.25, 0.5)] },
      { say: { en: 'Double thumbing uses the thumb like a pick: a down-stroke through the string, then an up-stroke back with the thumbnail. It doubles the speed.', he: 'אגודל כפול משתמש באגודל כמו במפרט: מכה למטה דרך המיתר, ואז מכה למעלה בחזרה עם הציפורן של האגודל. זה מכפיל את המהירות.' }, play: [lineV([[28, 0.85], [28, 0.7], [28, 0.85], [28, 0.7], [28, 0.85], [28, 0.7]], 0.15, 0.5)] },
      { say: { en: 'The common mistake is slapping too hard. A light, fast strike with a bounce is louder and cleaner than a heavy one.', he: 'הטעות הנפוצה היא להכות חזק מדי. מכה קלה ומהירה עם קפיצה חזקה ונקייה יותר ממכה כבדה.' }, show: { text: { en: 'light and fast', he: 'קל ומהיר' } } },
      { say: { en: 'Practise slap and pop slowly with the click, then add the ghosts. The groove comes from where the notes fall, not from how hard they hit.', he: 'מתרגלים סלאפ ופופ לאט עם הקליק, ואז מוסיפים את הרפאים. הגרוב בא מהמקום שבו הצלילים נופלים, לא מכמה חזק הם מכים.' } },
      { say: { en: 'Where it lives: funk, disco and gospel records since the 1970s, where the bass doubles as the drums. To keep: a light thumb that strikes and bounces, a finger that hooks and snaps, octaves slapped and popped, ghosts between them, and the groove placed by time, not by force, always with the click.', he: 'איפה זה חי: הקלטות פאנק, דיסקו וגוספל מאז שנות השבעים, שבהן הבס משמש גם כתופים. מה לזכור: אגודל קל שמכה וקופץ, אצבע שנכנסת מתחת ומקפיצה, אוקטבות בסלאפ ובפופ, רפאים ביניהן, והגרוב ממוקם לפי הזמן, לא לפי הכוח, תמיד עם הקליק.' } },
    ],
  },
  {
    id: 'fam-b-feel',
    area: 'play',
    emoji: '',
    title: { en: 'Jazz feels: two, half-time, broken, ballad, stop-time', he: 'תחושות ג׳אז: שתיים, חצי זמן, שבורה, בלדה, סטופ־טיים' },
    takeaway: { en: 'The same tune can be felt in two, in half-time, broken, as a ballad or in stop-time. The bass decides the feel and keeps the form.', he: 'אותו שיר אפשר להרגיש בשתיים, בחצי זמן, בתחושה שבורה, כבלדה או בסטופ־טיים. הבס מחליט על התחושה ושומר על הצורה.' },
    steps: [
      { say: { en: 'Hi {name}! Walking in four is one feel. This family trains the others, the ones a jazz bassist switches between inside one tune.', he: 'היי {name}! בס מהלך בארבע הוא תחושה אחת. המשפחה הזאת מאמנת את האחרות, אלה שבסיסט ג׳אז עובר ביניהן בתוך שיר אחד.' }, play: [line([38, 33, 43, 38], 0.8)] },
      { say: { en: 'The two-feel plays half notes on beats one and three, mostly roots and 5ths. It floats, and leaves room for the melody.', he: 'התחושה של שתיים מנגנת חצאים בפעמות אחת ושלוש, בעיקר שורשים וקווינטות. היא מרחפת, ומשאירה מקום למנגינה.' }, play: [line([38, 45, 43, 38, 36, 43, 41, 36], 0.6)], show: { text: { en: '1 · 3', he: '1 · 3' } } },
      { say: { en: 'Broken feel mixes halves, quarters and space, conversing with the drums. Stop-time hits one note at the start of a bar, then silence.', he: 'תחושה שבורה מערבבת חצאים, רבעים ושקט, בשיחה עם התופים. סטופ־טיים מכה צליל אחד בתחילת התיבה, ואז שקט.' }, play: [bass([[38, 0, 0.3], [43, 2, 0.3], [36, 4, 0.3]], 4.6)] },
      { say: { en: 'The one thing to watch: the form. In stop-time and in broken feel the bar lines go quiet; count every bar so the band comes back together.', he: 'הדבר האחד לשים אליו לב: הצורה. בסטופ־טיים ובתחושה שבורה קווי התיבה נעשים שקטים; סופרים כל תיבה כדי שהלהקה תחזור ביחד.' }, show: { text: { en: 'count every bar', he: 'לספור כל תיבה' } } },
      { say: { en: 'Your turn: these levels play with the band and a form, so they are timed from the first take. Every note and every feel change is measured.', he: 'תורכם: השלבים האלה מתנגנים עם הלהקה ועם צורה, אז הם מתוזמנים מהניסיון הראשון. כל צליל וכל החלפת תחושה נמדדים.' }, play: [line([38, 45, 43, 38], 0.7)] },
    ],
    more: [
      { say: { en: 'Half-time feels the beat at half speed: the bass plays long notes, the drums put the backbeat on three. The tempo stays; the feel slows.', he: 'חצי זמן מרגיש את הפעמה בחצי מהירות: הבס מנגן צלילים ארוכים, התופים שמים את הפעמה החזקה על שלוש. הטמפו נשאר; התחושה מאטה.' }, play: [line([38, 43, 36, 41], 1)] },
      { say: { en: 'The ballad in two: slow, long notes that ring, with small pickups into the next chord. Space is part of the line.', he: 'הבלדה בשתיים: צלילים איטיים וארוכים שמצלצלים, עם צלילי הקדמה קטנים אל האקורד הבא. השקט הוא חלק מהקו.' }, play: [bass([[38, 0, 1.4], [45, 1.5, 1], [42, 2.5, 0.4], [43, 3, 1.4]], 4.6)] },
      { say: { en: 'A common arrangement: the head in two, the solos in four. The change into four is a lift the whole band feels.', he: 'עיבוד נפוץ: הנושא בשתיים, הסולואים בארבע. המעבר לארבע הוא הרמה שכל הלהקה מרגישה.' }, play: [line([38, 45, 43, 38], 0.7), line([38, 41, 45, 44, 43], 0.35)] },
      { say: { en: 'The common mistake is losing the form after stop-time. Keep counting through the silence; the band returns exactly on the next section.', he: 'הטעות הנפוצה היא לאבד את הצורה אחרי סטופ־טיים. ממשיכים לספור דרך השקט; הלהקה חוזרת בדיוק בקטע הבא.' }, show: { text: { en: 'count through the silence', he: 'לספור דרך השקט' } } },
      { say: { en: 'Listen to how the great bassists change feels on records. Mark where the two-feel turns into four, and play along with only those moments.', he: 'מקשיבים איך הבסיסטים הגדולים מחליפים תחושות בהקלטות. מסמנים איפה השתיים הופכות לארבע, ומנגנים יחד רק ברגעים האלה.' } },
      { say: { en: 'Where it lives: every jazz gig. A ballad may open in two, swing in four for the solos, stop for a break and return in two for the last head. To keep: roots and fifths in two, long notes in half-time and ballads, space in the broken feel, silence in stop-time, and the form counted through all of it.', he: 'איפה זה חי: בכל הופעת ג׳אז. בלדה יכולה להיפתח בשתיים, לסווינג בארבע בסולואים, לעצור להפסקה ולחזור לשתיים בנושא האחרון. מה לזכור: שורשים וקווינטות בשתיים, צלילים ארוכים בחצי זמן ובבלדות, מקום בתחושה השבורה, שקט בסטופ־טיים, והצורה נספרת לאורך כל זה.' } },
    ],
  },

  // ------------------------------------------------------------------ upright bass
  {
    id: 'fam-b-up-arco',
    area: 'play',
    emoji: '',
    title: { en: 'Bowing the upright', he: 'נגינה בקשת בקונטרבס' },
    takeaway: { en: 'A straight bow, parallel to the bridge, between the bridge and the fingerboard: long tones, separate bows, slurs, hooked bows and string crossings.', he: 'קשת ישרה, מקבילה לגשר, בין הגשר ללוח האצבעות: צלילים ארוכים, קשתות נפרדות, לגאטו, קשת מחוברת ומעברי מיתרים.' },
    steps: [
      { say: { en: 'Hi {name}! This family trains the bow: a long, even, singing tone, the classical sound of the double bass.', he: 'היי {name}! המשפחה הזאת מאמנת את הקשת: צליל ארוך, שווה ושר, הצליל הקלאסי של הקונטרבס.' }, play: [bass([[28, 0, 2.2, 0.6], [33, 2.3, 2.2, 0.6]], 4.8)] },
      { say: { en: 'Long tones first, on the open strings. Keep the bow straight, parallel to the bridge, about halfway between the bridge and the end of the fingerboard.', he: 'קודם צלילים ארוכים, על המיתרים הפתוחים. שומרים על הקשת ישרה, מקבילה לגשר, בערך באמצע בין הגשר לסוף לוח האצבעות.' }, play: [bass([[38, 0, 2.6, 0.6]], 3)], show: { text: { en: 'straight · parallel · even', he: 'ישר · מקביל · שווה' } } },
      { say: { en: 'Then separate bows, one note per stroke; slurs, several notes in one bow; hooked bows, two notes in the same direction with a small stop.', he: 'אחר כך קשתות נפרדות, צליל אחד בכל משיכה; לגאטו, כמה צלילים בקשת אחת; קשת מחוברת, שני צלילים באותו כיוון עם עצירה קטנה.' }, play: [line([33, 35, 37, 38], 0.6, 0.9, 0.6)] },
      { say: { en: 'The one thing to watch: an even sound from the frog to the tip. The weight of the arm goes into the string; the bow speed stays steady.', he: 'הדבר האחד לשים אליו לב: צליל שווה מהעקב ועד הקצה. משקל הזרוע נכנס למיתר; מהירות הקשת נשארת קבועה.' }, play: [bass([[43, 0, 2.6, 0.6]], 3)], show: { text: { en: 'frog → tip, same sound', he: 'עקב ← קצה, אותו צליל' } } },
      { say: { en: 'Your turn: slowly first, then the tempo ladder. The app hears every bowed note’s pitch, start and length.', he: 'תורכם: קודם לאט, ואז סולם הטמפו. האפליקציה שומעת את הגובה, ההתחלה והאורך של כל צליל בקשת.' }, show: { text: { en: 'slow → ladder', he: 'לאט ← סולם טמפו' } } },
    ],
    more: [
      { say: { en: 'Two bows exist: the German bow, held from below like a saw, and the French bow, held from above like a cello bow. Both are correct; keep the one your teacher uses.', he: 'יש שתי קשתות: הקשת הגרמנית, שמחזיקים מלמטה כמו מסור, והקשת הצרפתית, שמחזיקים מלמעלה כמו קשת של צ׳לו. שתיהן נכונות; נשארים עם זו שהמורה משתמש בה.' }, play: [bass([[33, 0, 1.8, 0.6]], 2.1)] },
      { say: { en: 'Down-bow pulls toward the tip and is naturally heavier at the frog; up-bow pushes back. Strong beats usually take a down-bow.', he: 'קשת למטה מושכת לעבר הקצה והיא כבדה יותר מטבעה ליד העקב; קשת למעלה דוחפת בחזרה. פעמות חזקות לוקחות בדרך כלל קשת למטה.' }, play: [line([38, 38, 38, 38], 0.7, 0.9, 0.6)] },
      { say: { en: 'String crossing under one bow: tilt the arm to the next string’s level just before you need it. The bow travels on, the angle changes.', he: 'מעבר מיתרים בקשת אחת: מטים את הזרוע לגובה של המיתר הבא רגע לפני שצריך אותו. הקשת ממשיכה לנוע, הזווית משתנה.' }, play: [line([33, 38, 33, 38], 0.5, 0.95, 0.6)] },
      { say: { en: 'The common mistake is a bow that drifts toward the fingerboard. Watch the contact point in a mirror and keep it in one lane.', he: 'הטעות הנפוצה היא קשת שזזה לעבר לוח האצבעות. בודקים את נקודת המגע במראה ושומרים אותה במסלול אחד.' }, show: { text: { en: 'one lane', he: 'מסלול אחד' } } },
      { say: { en: 'Begin every session with a few long open-string tones, slowly. They are the scales of the bow, and they set the tone for everything after.', he: 'מתחילים כל אימון בכמה צלילים ארוכים על מיתרים פתוחים, לאט. הם הסולמות של הקשת, והם קובעים את הצליל לכל מה שבא אחריהם.' } },
      { say: { en: 'Where it lives: orchestras, chamber music, solo bass repertoire, and the bowed melodies some jazz bassists play. To keep: a straight bow parallel to the bridge, one contact lane, the arm’s weight in the string, an even speed from frog to tip, and long open tones every day.', he: 'איפה זה חי: תזמורות, מוזיקה קאמרית, רפרטואר סולו לקונטרבס, והמנגינות בקשת שחלק מבסיסטי הג׳אז מנגנים. מה לזכור: קשת ישרה ומקבילה לגשר, מסלול מגע אחד, משקל הזרוע במיתר, מהירות שווה מהעקב ועד הקצה, וצלילים ארוכים על מיתרים פתוחים כל יום.' } },
    ],
  },
  {
    id: 'fam-b-up-pizz',
    area: 'play',
    emoji: '',
    title: { en: 'Jazz pizzicato on the upright', he: 'פיציקטו ג׳אזי בקונטרבס' },
    takeaway: { en: 'Pluck with the side of the index finger, pulling across the string: long, even quarters that ring until the next one.', he: 'פורטים בצד האצבע המורה, במשיכה לרוחב המיתר: רבעים ארוכים ושווים שמצלצלים עד הבא.' },
    steps: [
      { say: { en: 'Hi {name}! Jazz pizzicato is the sound of the walking bass: a round, long note that rings under the whole band.', he: 'היי {name}! פיציקטו ג׳אזי הוא הצליל של הבס המהלך: צליל עגול וארוך שמצלצל מתחת לכל הלהקה.' }, play: [line([31, 35, 38, 41, 40, 38, 35, 31], 0.5, 0.98)] },
      { say: { en: 'Pluck with the side of the index finger, not the tip, pulling across the string toward the next one. More skin gives a fuller sound.', he: 'פורטים בצד האצבע המורה, לא בקצה, במשיכה לרוחב המיתר לעבר המיתר הבא. יותר עור נותן צליל מלא יותר.' }, play: [line([33, 33, 33, 33], 0.6, 0.98)], show: { text: { en: 'side of the finger · across', he: 'צד האצבע · לרוחב' } } },
      { say: { en: 'Then pizzicato over a two-five-one, sustain at tempo, and a graded study. The notes stay long even when the tempo rises.', he: 'אחר כך פיציקטו מעל שתיים־חמש־אחת, צליל מתמשך בטמפו, ואטיוד לפי דרגות. הצלילים נשארים ארוכים גם כשהטמפו עולה.' }, play: [line([38, 41, 45, 44, 43, 47, 50, 49, 48], 0.4, 0.98)] },
      { say: { en: 'The one thing to watch: sustain. Each quarter rings until the next one starts; the fretting finger keeps its pressure through the whole beat.', he: 'הדבר האחד לשים אליו לב: צליל מתמשך. כל רבע מצלצל עד שהבא מתחיל; האצבע הלוחצת שומרת על הלחץ לאורך כל הפעמה.' }, play: [line([33, 36, 40, 43], 0.6, 0.98)], show: { text: { en: 'ring to the next note', he: 'לצלצל עד הצליל הבא' } } },
      { say: { en: 'Your turn: steady quarters with the click or the band, and the tempo ladder starts slow. Every note’s length is measured.', he: 'תורכם: רבעים יציבים עם הקליק או עם הלהקה, וסולם הטמפו מתחיל לאט. האורך של כל צליל נמדד.' }, show: { text: { en: 'long · even · steady', he: 'ארוך · שווה · יציב' } } },
    ],
    more: [
      { say: { en: 'Pluck near the end of the fingerboard for a deep, round tone. Closer to the bridge gives more attack but less body.', he: 'פורטים קרוב לסוף לוח האצבעות לצליל עמוק ועגול. קרוב יותר לגשר נותן יותר התקפה אבל פחות גוף.' }, play: [line([33, 33], 0.8, 0.98)] },
      { say: { en: 'At fast tempos use two fingers, index and middle, side by side as one, or in turns. The sound must not get thinner.', he: 'בטמפו מהיר משתמשים בשתי אצבעות, מורה ואמה, צמודות כאחת, או לסירוגין. הצליל לא צריך להיעשות דק יותר.' }, play: [line([31, 35, 38, 41, 43, 41, 38, 35], 0.3, 0.98)] },
      { say: { en: 'The arm helps: let its weight fall into the string, rather than plucking only from the finger. That is where the big jazz sound comes from.', he: 'הזרוע עוזרת: נותנים למשקל שלה ליפול לתוך המיתר, במקום לפרוט רק מהאצבע. משם בא הצליל הגדול של הג׳אז.' }, play: [line([28, 31, 33, 35], 0.6, 0.98)] },
      { say: { en: 'The common mistake is lifting the fretting finger early. The note dies, the line gets choppy. Hold each note until the next finger lands.', he: 'הטעות הנפוצה היא להרים את האצבע הלוחצת מוקדם. הצליל מת, והקו נעשה קטוע. מחזיקים כל צליל עד שהאצבע הבאה נוחתת.' }, show: { text: { en: 'hold until the next lands', he: 'להחזיק עד שהבא נוחת' } } },
      { say: { en: 'Protect the fingers: build up playing time slowly, a little more each week. Blisters stop practice for days; patience keeps you playing.', he: 'שומרים על האצבעות: מגדילים את זמן הנגינה לאט, קצת יותר כל שבוע. שלפוחיות עוצרות אימון לימים; סבלנות שומרת אתכם מנגנים.' } },
      { say: { en: 'Where it lives: every jazz club and swing record, every walking line on the upright since the 1930s, where the bass is the warm floor under the band. To keep: the side of the finger, pulling across, the arm’s weight in the string, each note ringing until the next one lands, and playing time built up slowly.', he: 'איפה זה חי: כל מועדון ג׳אז וכל הקלטת סווינג, כל קו בס מהלך בקונטרבס מאז שנות השלושים, שבהם הבס הוא הרצפה החמה מתחת ללהקה. מה לזכור: צד האצבע, משיכה לרוחב, משקל הזרוע במיתר, כל צליל מצלצל עד שהבא נוחת, וזמן נגינה שנבנה לאט.' } },
    ],
  },
  {
    id: 'fam-b-up-pos',
    area: 'play',
    emoji: '',
    title: { en: 'Simandl positions on the upright', he: 'מצבי סימנדל בקונטרבס' },
    takeaway: { en: 'Fingers 1, 2 and 4 cover a whole step; each position moves the hand to a new place on the string; the octave harmonic, then thumb position.', he: 'אצבעות 1, 2 ו־4 מכסות טון שלם; כל מצב מזיז את היד למקום חדש על המיתר; ההרמוניק של האוקטבה, ואז מצב אגודל.' },
    steps: [
      { say: { en: 'Hi {name}! The upright has no frets, so the hand learns fixed places, called positions. This family trains them one by one.', he: 'היי {name}! לקונטרבס אין סריגים, אז היד לומדת מקומות קבועים, שנקראים מצבים. המשפחה הזאת מאמנת אותם אחד אחד.' }, play: [line([43, 44, 45, 46, 47], 0.45, 0.95)] },
      { say: { en: 'In the low positions the hand covers a whole step with three fingers: 1, 2 and 4. The fourth finger plays with the third behind it for support.', he: 'במצבים הנמוכים היד מכסה טון שלם בשלוש אצבעות: 1, 2 ו־4. האצבע הרביעית מנגנת כשהשלישית מאחוריה לתמיכה.' }, play: [line([44, 45, 46], 0.6, 0.95)], show: { text: { en: '1 · 2 · 4 = a whole step', he: '1 · 2 · 4 = טון שלם' } } },
      { say: { en: 'Half position puts the first finger a half step above the open string; first position, a whole step. Each new position moves the hand up the string.', he: 'בחצי מצב האצבע הראשונה נמצאת חצי טון מעל המיתר הפתוח; במצב ראשון, טון שלם. כל מצב חדש מזיז את היד למעלה על המיתר.' }, play: [line([43, 44, 45, 46], 0.5, 0.95)] },
      { say: { en: 'The one thing to watch: intonation. Without frets, every note is placed by ear. Check open strings and harmonics against the fingered notes.', he: 'הדבר האחד לשים אליו לב: כיוון. בלי סריגים, כל צליל ממוקם לפי האוזן. בודקים מיתרים פתוחים והרמוניקים מול הצלילים הלחוצים.' }, play: [line([38, 50, 38], 0.7, 0.95)], show: { text: { en: 'placed by ear', he: 'ממוקם לפי האוזן' } } },
      { say: { en: 'Your turn: slowly first, then the tempo ladder. The app measures every note in cents, so you see how close each finger lands.', he: 'תורכם: קודם לאט, ואז סולם הטמפו. האפליקציה מודדת כל צליל בסנטים, כך שרואים כמה קרוב כל אצבע נוחתת.' }, show: { text: { en: 'measured in cents', he: 'נמדד בסנטים' } } },
    ],
    more: [
      { say: { en: 'By the fourth position the hand reaches the middle of the string, where the octave harmonic sounds. It is a landmark you can always check.', he: 'במצב הרביעי היד מגיעה לאמצע המיתר, שם נשמע ההרמוניק של האוקטבה. זו נקודת ציון שתמיד אפשר לבדוק.' }, play: [line([43, 55], 0.9, 0.95)] },
      { say: { en: 'Thumb position: above the octave, the thumb comes onto the string as a movable nut, and the third finger joins in. The hand covers more notes there.', he: 'מצב אגודל: מעל האוקטבה, האגודל עולה על המיתר כמו אוכף נייד, והאצבע השלישית מצטרפת. שם היד מכסה יותר צלילים.' }, play: [line([55, 57, 59, 60], 0.45, 0.95)] },
      { say: { en: 'Shifting: slide lightly on the finger that is on the string, and let the ear guide the landing. A slow shift you can hear is fine while learning.', he: 'מעבר מצב: מחליקים בקלילות על האצבע שעל המיתר, ונותנים לאוזן להנחות את הנחיתה. מעבר איטי ששומעים אותו זה בסדר בזמן הלמידה.' }, play: [line([45, 47, 50], 0.6, 0.95)] },
      { say: { en: 'The common mistake is a hand that creeps out of position. Return to a known note often, an open string or a harmonic, and reset.', he: 'הטעות הנפוצה היא יד שזוחלת מחוץ למצב. חוזרים לעתים קרובות לצליל מוכר, מיתר פתוח או הרמוניק, ומתאפסים.' }, show: { text: { en: 'reset on a known note', he: 'להתאפס על צליל מוכר' } } },
      { say: { en: 'Practise each position with a drone or the tuner, slowly. Intonation is built by listening, one position at a time.', he: 'מתרגלים כל מצב עם צליל רצוף או עם הטיונר, לאט. כיוון נבנה בהקשבה, מצב אחד בכל פעם.' } },
      { say: { en: 'Where it lives: classical studies, orchestra parts and jazz solos all rely on knowing where each position lies. To keep: 1, 2 and 4 for a whole step, the third finger behind the fourth, landmarks like the octave harmonic, light shifts guided by the ear, and frequent resets on a known note.', he: 'איפה זה חי: אטיודים קלאסיים, תפקידים בתזמורת וסולואי ג׳אז נשענים כולם על הידיעה איפה כל מצב נמצא. מה לזכור: 1, 2 ו־4 לטון שלם, האצבע השלישית מאחורי הרביעית, נקודות ציון כמו ההרמוניק של האוקטבה, מעברים קלים שהאוזן מנחה, והתאפסות תכופה על צליל מוכר.' } },
    ],
  },
  {
    id: 'fam-b-up-scales',
    area: 'play',
    emoji: '',
    title: { en: 'Scales and arpeggios on the upright', he: 'סולמות וארפג׳יו בקונטרבס' },
    takeaway: { en: 'One octave, then two and three, in more and more keys; arpeggios, 7th chords and 3rds. In tune, with shifts that arrive on time.', he: 'אוקטבה אחת, אחר כך שתיים ושלוש, בעוד ועוד סולמות; ארפג׳יו, ספטאקורדים וטרצות. מכוונים, עם מעברי מצב שמגיעים בזמן.' },
    steps: [
      { say: { en: 'Hi {name}! This family builds scales and arpeggios on the upright, from one octave in the easy keys to three octaves.', he: 'היי {name}! המשפחה הזאת בונה סולמות וארפג׳יו בקונטרבס, מאוקטבה אחת בסולמות הקלים ועד שלוש אוקטבות.' }, play: [line([31, 33, 35, 36, 38, 40, 42, 43], 0.35, 0.95)] },
      { say: { en: 'Start with one-octave scales and arpeggios in G, D and F, then B flat, E flat, E and the rest, and on to two octaves.', he: 'מתחילים בסולמות וארפג׳יו באוקטבה אחת בסול, רה ופה, אחר כך סי במול, מי במול, מי והשאר, וממשיכים לשתי אוקטבות.' }, play: [line([31, 35, 38, 43, 38, 35, 31], 0.35, 0.95)], show: { text: { en: '1 octave → 2 → 3', he: 'אוקטבה 1 ← 2 ← 3' } } },
      { say: { en: 'Then dominant and diminished 7th arpeggios, broken 3rds and running 3rds. Each pattern trains the ear and the shifts together.', he: 'אחר כך ארפג׳יו של ספטאקורד דומיננטי ומוקטן, טרצות שבורות וטרצות רצות. כל תבנית מאמנת את האוזן ואת מעברי המצב יחד.' }, play: [line([31, 35, 33, 36, 35, 38, 36, 40], 0.3, 0.95)] },
      { say: { en: 'The one thing to watch: shifts on time. Move early, slide lightly on the finger already on the string, and arrive in tune on the beat.', he: 'הדבר האחד לשים אליו לב: מעברי מצב בזמן. זזים מוקדם, מחליקים בקלילות על האצבע שכבר על המיתר, ומגיעים מכוונים על הפעמה.' }, play: [line([38, 40, 42, 43, 45, 47], 0.35, 0.95)], show: { text: { en: 'move early · land in tune', he: 'לזוז מוקדם · לנחות מכוון' } } },
      { say: { en: 'Your turn: slowly first, free where the notes are new, then the tempo ladder, key by key. Every note is measured for pitch and time.', he: 'תורכם: קודם לאט, בזמן חופשי כשהצלילים חדשים, ואז סולם הטמפו, סולם אחרי סולם. כל צליל נמדד בגובה ובזמן.' }, show: { text: { en: 'slow → ladder → every key', he: 'לאט ← סולם טמפו ← כל הסולמות' } } },
    ],
    more: [
      { say: { en: 'Why scales on the upright? They map the fingerboard. After a few weeks in a key, the hand knows where its notes are without looking.', he: 'למה סולמות בקונטרבס? הם ממפים את לוח האצבעות. אחרי כמה שבועות בסולם, היד יודעת איפה הצלילים שלו בלי להסתכל.' }, play: [line([33, 35, 37, 38, 40, 42, 44, 45], 0.3, 0.95)] },
      { say: { en: 'Broken 3rds go up a 3rd and back a step: one, three, two, four, three, five. They train the ear to hear each interval clearly.', he: 'טרצות שבורות עולות טרצה וחוזרות צעד: אחת, שלוש, שתיים, ארבע, שלוש, חמש. הן מאמנות את האוזן לשמוע כל מרווח בבירור.' }, play: [line([31, 35, 33, 36, 35, 38], 0.35, 0.95)] },
      { say: { en: 'Three-octave scales climb into thumb position. The path starts them on E, the lowest string, then F, F sharp and G.', he: 'סולמות בשלוש אוקטבות מטפסים אל מצב אגודל. הדרך מתחילה אותם במי, המיתר הנמוך, ואחר כך פה, פה דיאז וסול.' }, play: [line([28, 32, 35, 40, 44, 47, 52], 0.3, 0.95)] },
      { say: { en: 'The common mistake is speeding up before the notes are in tune. Play slowly with a drone on the key’s root, and hear every note against it.', he: 'הטעות הנפוצה היא להאיץ לפני שהצלילים מכוונים. מנגנים לאט עם צליל רצוף על שורש הסולם, ושומעים כל צליל מולו.' }, show: { text: { en: 'in tune, then faster', he: 'מכוון, ואז מהר יותר' } } },
      { say: { en: 'Mix bowed and plucked scales: the bow shows every flaw in intonation, the pizzicato keeps the walking hand ready. Both belong to the upright.', he: 'משלבים סולמות בקשת ובפריטה: הקשת חושפת כל פגם בכיוון, הפיציקטו שומר על היד מוכנה לבס מהלך. שניהם שייכים לקונטרבס.' } },
      { say: { en: 'Where it lives: auditions, orchestra parts, walking lines and solos all draw on scales played in tune across the fingerboard. To keep: one octave before two and three, every key in turn, early light shifts, a drone to check the intonation, and both the bow and the fingers.', he: 'איפה זה חי: אודישנים, תפקידים בתזמורת, קווי בס מהלך וסולואים נשענים כולם על סולמות מכוונים לאורך לוח האצבעות. מה לזכור: אוקטבה אחת לפני שתיים ושלוש, כל סולם בתורו, מעברים מוקדמים וקלים, צליל רצוף לבדיקת הכיוון, וגם הקשת וגם האצבעות.' } },
    ],
  },
];

/** The family's first path level (tech:<family>) opens with its lesson. */
export const UNITS: Record<string, string> = Object.fromEntries(
  ['g-bass', 'b-pluck', 'b-pocket', 'b-fret', 'b-length', 'b-styles', 'b-ghost', 'b-pick', 'b-impro', 'b-legato', 'b-slap', 'b-feel', 'b-up-arco', 'b-up-pizz', 'b-up-pos', 'b-up-scales'].map((f) => [`tech:${f}`, `fam-${f}`]),
);

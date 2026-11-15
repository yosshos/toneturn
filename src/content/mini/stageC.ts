// STAGE C (docs/research/AUDIT-6-*.md): the quick lessons before the advanced endings — the guitar above grade 8, the
// drums past 1400, the voice's top ladder and the advanced ear topics. One lesson per new concept; see ../miniTypes.ts.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.25): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.35): Stimulus => ({ kind: 'rest', duration: d });
/** A rhythm on one drum-like low note: x = a stroke, X = an accent, - = a rest (16ths at the tempo). */
const rhythm = (r: string, bpm = 90): Stimulus => {
  const step = 60 / bpm / 4;
  const toks = r.split(/\s+/);
  return { kind: 'events', events: toks.flatMap((c, i) => (c === '-' ? [] : [{ midi: 45, start: i * step, duration: step * 0.8, velocity: c === 'X' ? 0.9 : 0.55 }])), length: toks.length * step + 0.3 };
};

export const LESSONS: MiniLesson[] = [
  // ───────────── guitar ─────────────
  {
    id: 'speed-ladder',
    area: 'play',
    emoji: 'tempo',
    title: { en: 'Speed: the tempo ladder', he: 'מהירות: סולם הטמפו' },
    takeaway: { en: 'Speed is accuracy repeated: clean at one tempo, then a few clicks faster. A loose hand, small motions.', he: 'מהירות היא דיוק שחוזר על עצמו: נקי בטמפו אחד, ואז כמה קליקים מהר יותר. יד רפויה, תנועות קטנות.' },
    steps: [
      { say: { en: 'Each item starts in free time, then on a slow click, then climbs the ladder to concert tempo.', he: 'כל פריט מתחיל בזמן חופשי, אחר כך על קליק איטי, ואז מטפס בסולם עד לטמפו של הופעה.' }, play: [notes([52, 54, 56, 57, 59, 61, 63, 64], 0.3)] },
      { say: { en: 'Keep the pick close to the strings and the fretting fingers low. Tension is what stops you, not the tempo.', he: 'שמרו את המפרט קרוב למיתרים ואת האצבעות הלוחצות נמוך. המתח עוצר אתכם, לא הטמפו.' }, play: [notes([52, 54, 56, 57, 59, 61, 63, 64, 63, 61, 59, 57, 56, 54, 52], 0.12)] },
      { say: { en: 'A take counts when every note is in time. Your turn.', he: 'טייק נחשב כשכל צליל בזמן. תורכם.' } },
    ],
  },
  {
    id: 'fusion-outside',
    area: 'play',
    emoji: 'shift',
    title: { en: 'Playing outside', he: 'לנגן בחוץ' },
    takeaway: { en: 'Leave the key on purpose and come back: the same shape a half step away, or the altered triad pair over V7.', he: 'יוצאים מהסולם בכוונה וחוזרים: אותה צורה בחצי טון הצידה, או זוג המשולשים האלטרד מעל V7.' },
    steps: [
      { say: { en: 'In: the minor pentatonic. Out: the same shape a half step higher. In again: back home, landing on the root.', he: 'בפנים: הפנטטוני המינורי. בחוץ: אותה צורה חצי טון למעלה. שוב בפנים: חזרה הביתה, נחיתה על היסוד.' }, play: [notes([57, 60, 62, 64, 67]), rest(), notes([58, 61, 63, 65, 68]), rest(), notes([67, 64, 62, 60, 57])] },
      { say: { en: 'Over G7 the major triads on D♭ and E♭ give the altered colours: ♯11, 7, ♭9 and ♭13, root, ♯9. Then resolve to C.', he: 'מעל G7 המשולשים המז׳וריים על D♭ ו-E♭ נותנים את צבעי האלטרד: ♯11, 7, ♭9 ו-♭13, יסוד, ♯9. ואז פתרון ל-C.' }, play: [chord([43, 53, 59], 0.8), notes([61, 65, 68, 63, 67, 70], 0.2), notes([64], 0.8)] },
      { say: { en: 'Outside only sounds right when the way back is clear. Your turn.', he: 'בחוץ נשמע נכון רק כשהדרך חזרה ברורה. תורכם.' } },
    ],
  },
  {
    id: 'cm-arranging',
    area: 'play',
    emoji: 'chords',
    title: { en: 'Arranging a chord-melody', he: 'לעבד אקורד-מלודיה' },
    takeaway: { en: 'An arrangement is a plan: an intro from the last bars, the chorus, then a reharmonised chorus or a tag ending.', he: 'עיבוד הוא תוכנית: פתיחה מהתיבות האחרונות, הפזמון, ואז פזמון בהרמון מחדש או סיום בתג.' },
    steps: [
      { say: { en: 'The melody stays on top. Under it: a walking bass, drop 2 chords, or a passing diminished between chords.', he: 'המנגינה נשארת למעלה. מתחתיה: בס מהלך, אקורדי דרופ 2, או דימיניש עובר בין האקורדים.' }, play: [chord([48, 64, 67, 71], 0.9), chord([47, 62, 65, 69], 0.9), chord([45, 60, 64, 67], 1.2)] },
      { say: { en: 'The intro borrows the last four bars; the tag repeats the last two before the final chord.', he: 'הפתיחה שואלת את ארבע התיבות האחרונות; התג חוזר על השתיים האחרונות לפני האקורד הסופי.' } },
      { say: { en: 'A ballad chorus is played rubato: the time is yours, the notes are measured. Your turn.', he: 'פזמון בלדה מנוגן רובאטו: הזמן שלכם, הצלילים נמדדים. תורכם.' } },
    ],
  },
  {
    id: 'solo-jazz-guitar',
    area: 'play',
    emoji: 'walk',
    title: { en: 'Solo jazz guitar', he: 'גיטרת ג׳אז סולו' },
    takeaway: { en: 'The thumb walks the bass on every beat; the fingers drop the 3rd and 7th on the "and". One guitar, a whole trio.', he: 'האגודל מהלך בבס על כל פעמה; האצבעות מוסיפות את הטרצה והספטימה על ה"וְ". גיטרה אחת, טריו שלם.' },
    steps: [
      { say: { en: 'First the walking line alone: a root on each chord, chord tones, a half step into the next root.', he: 'קודם הקו המהלך לבד: יסוד בכל אקורד, צלילי אקורד, חצי טון אל היסוד הבא.' }, play: [notes([41, 45, 48, 51, 46, 50, 53, 47], 0.45)] },
      { say: { en: 'Then the shell above it, short, on the "and" of 2 and 4 — the comping a pianist would play.', he: 'אחר כך הקונכייה מעליו, קצרה, על ה"וְ" של 2 ו-4 — הליווי שפסנתרן היה מנגן.' }, play: [chord([41, 57, 63], 0.4), chord([46, 56, 62], 0.4)] },
      { say: { en: 'Keep the bass even; the chords are lighter. Your turn.', he: 'שמרו על בס שווה; האקורדים קלים יותר. תורכם.' } },
    ],
  },
  // ───────────── drums ─────────────
  {
    id: 'pas-rolls',
    area: 'rhythm',
    emoji: 'rudiment',
    title: { en: 'The PAS rolls and ratamacues', he: 'הגלגולים והרטמקיו של PAS' },
    takeaway: { en: 'Open rolls are doubles plus a release: count the strokes. A ratamacue is drags leading into three strokes and an accent.', he: 'גלגולים פתוחים הם כפולות ועוד שחרור: סופרים את המכות. רטמקיו הוא דראגים שמובילים לשלוש מכות והדגשה.' },
    steps: [
      { say: { en: 'A 13-stroke roll: six doubles, RRLL RRLL RRLL, then one accented single.', he: 'גלגול של 13 מכות: שש כפולות, RRLL RRLL RRLL, ואז מכה בודדת מודגשת.' }, play: [rhythm('x x x x x x x x x x x x X - - -', 80)] },
      { say: { en: 'The buzz roll presses each stroke into the head. The app measures the hand pulse; the bounces are yours.', he: 'גלגול הבאז לוחץ כל מכה אל העור. האפליקציה מודדת את פעימות הידיים; הניתורים שלכם.' } },
      { say: { en: 'Grace notes need the kit over MIDI: the drag is two soft strokes just before the main one. Your turn.', he: 'צלילי חן צריכים מערכת ב-MIDI: הדראג הוא שתי מכות רכות רגע לפני המכה הראשית. תורכם.' } },
    ],
  },
  {
    id: 'stickings',
    area: 'rhythm',
    emoji: 'sticks',
    title: { en: 'Stickings at tempo', he: 'אצבועים בטמפו' },
    takeaway: { en: 'Every order of R and L is a different motion. Play each sticking until it sounds even — the listener should not hear the hands.', he: 'כל סדר של R ו-L הוא תנועה אחרת. נגנו כל אצבוע עד שהוא נשמע שווה — המאזין לא אמור לשמוע את הידיים.' },
    steps: [
      { say: { en: 'Four notes have fourteen stickings: RLRL, RRLL, RLLR and the rest. One a bar, four bars a take.', he: 'לארבעה צלילים יש ארבעה-עשר אצבועים: RLRL, RRLL, RLLR והשאר. אחד בכל תיבה, ארבע תיבות בטייק.' }, play: [rhythm('x x x x x x x x', 100)] },
      { say: { en: 'Then the accent moves through the group, and the right hand moves to another drum. Your turn.', he: 'אחר כך ההדגשה נודדת בתוך הקבוצה, ויד ימין עוברת לתוף אחר. תורכם.' } },
    ],
  },
  {
    id: 'synco-interp',
    area: 'rhythm',
    emoji: 'rhythm',
    title: { en: 'One line, five grooves', he: 'קו אחד, חמישה גרובים' },
    takeaway: { en: 'Read one syncopated line, and play it on the kick under a rock beat, as band hits, in funk, or as jazz comping.', he: 'קוראים קו מסונכפ אחד, ומנגנים אותו בקיק מתחת לקצב רוק, כמכות להקה, בפאנק, או כקומפינג ג׳אז.' },
    steps: [
      { say: { en: 'The line stays the same; the time around it changes. In jazz the upbeat eighth falls on the triplet’s last note.', he: 'הקו נשאר אותו קו; הזמן סביבו משתנה. בג׳אז השמינית החלשה נופלת על הצליל האחרון של הטריולה.' }, play: [rhythm('x - - x - - x -', 100)] },
      { say: { en: 'Long notes on the kick, short ones on the snare: the classic split for comping. Your turn.', he: 'צלילים ארוכים בקיק, קצרים בסנר: החלוקה הקלאסית לקומפינג. תורכם.' } },
    ],
  },
  {
    id: 'jazz-indep',
    area: 'rhythm',
    emoji: 'ride',
    title: { en: 'Jazz independence', he: 'עצמאות בג׳אז' },
    takeaway: { en: 'The ride and the foot on 2 and 4 never change; the snare and the kick move around them, one figure a bar.', he: 'הרייד והרגל על 2 ו-4 לא משתנים; הסנר והקיק זזים סביבם, דמות אחת בכל תיבה.' },
    steps: [
      { say: { en: 'Spang, spang-a-lang on the ride. Keep it swinging while the snare lands on the beat, then on the skip note.', he: 'ספאנג, ספאנג-א-לאנג ברייד. שמרו על הסווינג כשהסנר נוחת על הפעמה, ואז על צליל הדילוג.' } },
      { say: { en: 'If the ride stiffens, slow down: the time comes first. Your turn.', he: 'אם הרייד מתקשח, האטו: הזמן קודם. תורכם.' } },
    ],
  },
  {
    id: 'linear-funk',
    area: 'rhythm',
    emoji: 'ghost',
    title: { en: 'Linear funk', he: 'פאנק ליניארי' },
    takeaway: { en: 'No two limbs at once: hat, snare and kick take turns on the 16ths. Ghost notes fill the gaps quietly.', he: 'אף פעם לא שתי גפיים יחד: היי־האט, סנר וקיק מתחלפים על השש-עשריות. תווי רפאים ממלאים את הרווחים בשקט.' },
    steps: [
      { say: { en: 'A group of three — hat, snare, kick — repeated across a bar of 16ths shifts against the beat.', he: 'קבוצה של שלושה — היי־האט, סנר, קיק — שחוזרת על פני תיבה של שש-עשריות זזה מול הפעמה.' }, play: [rhythm('x x x x x x x x x x x x x x x x', 80)] },
      { say: { en: 'The app checks that nothing sounds together. Your turn.', he: 'האפליקציה בודקת ששום דבר לא נשמע יחד. תורכם.' } },
    ],
  },
  {
    id: 'brushes',
    area: 'rhythm',
    emoji: 'ride',
    title: { en: 'Brushes', he: 'מברשות' },
    takeaway: { en: 'The left hand sweeps circles for the sound; the right hand taps the time. The taps are measured, the sweep is yours.', he: 'יד שמאל מסובבת עיגולים בשביל הצליל; יד ימין מקישה את הזמן. הנקישות נמדדות, הסוויפ שלכם.' },
    steps: [
      { say: { en: 'In a ballad, one slow circle a beat and a tap on 2 and 4. In medium swing, the ride pattern in taps.', he: 'בבלדה, עיגול איטי אחד בכל פעמה ונקישה על 2 ו-4. בסווינג בינוני, תבנית הרייד בנקישות.' } },
      { say: { en: 'Up-tempo, the sweep flattens into straight eighths. Your turn.', he: 'בטמפו מהיר, הסוויפ משתטח לשמיניות ישרות. תורכם.' } },
    ],
  },
  {
    id: 'trading',
    area: 'rhythm',
    emoji: 'improv',
    title: { en: 'Soloing over a form', he: 'סולו על צורה' },
    takeaway: { en: 'Count the form while you solo, and land the next 1 with a crash and the kick. Four bars of time, four of yours.', he: 'סופרים את הצורה בזמן הסולו, ונוחתים על ה-1 הבא עם קראש וקיק. ארבע תיבות זמן, ארבע שלכם.' },
    steps: [
      { say: { en: 'The band lays out in your bars. Play anything — but never lose the bar line.', he: 'הלהקה שותקת בתיבות שלכם. נגנו מה שתרצו — רק אל תאבדו את קו התיבה.' } },
      { say: { en: 'In a chorus solo the band keeps playing: land each phrase of the form. Your turn.', he: 'בסבב סולו הלהקה ממשיכה לנגן: נחתו בכל משפט של הצורה. תורכם.' } },
    ],
  },
  // ───────────── voice ─────────────
  {
    id: 'altered-arps',
    area: 'voice',
    emoji: 'arp',
    title: { en: 'Diminished and augmented arpeggios', he: 'ארפג׳ים מוקטנים ומוגדלים' },
    takeaway: { en: 'Diminished stacks minor 3rds, augmented stacks major 3rds. Hear the next note before you sing it.', he: 'מוקטן בנוי מטרצות קטנות, מוגדל מטרצות גדולות. שמעו את הצליל הבא לפני ששרים אותו.' },
    steps: [
      { say: { en: 'Diminished: C, E flat, G flat — two minor 3rds. Augmented: C, E, G sharp — two major 3rds.', he: 'מוקטן: דו, מי במול, סול במול — שתי טרצות קטנות. מוגדל: דו, מי, סול דיאז — שתי טרצות גדולות.' }, play: [notes([60, 63, 66, 72], 0.4), rest(), notes([60, 64, 68, 72], 0.4)] },
      { say: { en: 'Every session moves to a new key, so the shapes, not the notes, are learned. Your turn.', he: 'כל מפגש עובר לסולם חדש, כך שלומדים את הצורות, לא את הצלילים. תורכם.' } },
    ],
  },
  {
    id: 'wide-leaps',
    area: 'voice',
    emoji: 'intervals',
    title: { en: 'Wide leaps', he: 'קפיצות רחבות' },
    takeaway: { en: 'For a leap, hear the target first and keep the throat still; arrive on the note, never slide into it.', he: 'בקפיצה, שמעו קודם את היעד ושמרו על גרון שקט; הגיעו אל הצליל, אל תחליקו אליו.' },
    steps: [
      { say: { en: 'A ninth is an octave and a step. Find the octave in your ear, then the step above it.', he: 'נונה היא אוקטבה ועוד צעד. מצאו את האוקטבה באוזן, ואז את הצעד שמעליה.' }, play: [notes([60, 74], 0.7)] },
      { say: { en: 'Each melody is sung on the click, every leap in time. Your turn.', he: 'כל מנגינה מושרת על הקליק, כל קפיצה בזמן. תורכם.' } },
    ],
  },
  {
    id: 'quick-study',
    area: 'voice',
    emoji: 'sight',
    title: { en: 'Quick study: read, vary, improvise', he: 'לימוד מהיר: לקרוא, לגוון, לאלתר' },
    takeaway: { en: 'Read four bars at sight over the band, sing them again with your own changes, then improvise over the same chords.', he: 'קוראים ארבע תיבות מהדף מעל הלהקה, שרים אותן שוב עם שינויים משלכם, ואז מאלתרים על אותם אקורדים.' },
    steps: [
      { say: { en: 'First take: as written. The melody is never played to you — read it.', he: 'טייק ראשון: כפי שנכתב. המנגינה לא מתנגנת לכם — קראו אותה.' } },
      { say: { en: 'Second take: keep the long notes, move the rhythm. Third: your own line, landing on chord tones. Your turn.', he: 'טייק שני: שמרו את הצלילים הארוכים, הזיזו את הקצב. שלישי: קו משלכם, נוחת על צלילי אקורד. תורכם.' } },
    ],
  },
  {
    id: 'score-part',
    area: 'voice',
    emoji: 'chords',
    title: { en: 'One part from the score', he: 'קול אחד מהתווים' },
    takeaway: { en: 'Your part is written; the other parts play with you. Read your line and hold it against theirs.', he: 'הקול שלכם כתוב; הקולות האחרים מנגנים איתכם. קראו את הקו שלכם והחזיקו אותו מול שלהם.' },
    steps: [
      { say: { en: 'Two parts in thirds and sixths: you sing the top, the app plays the bottom.', he: 'שני קולות בטרצות ובסקסטות: אתם שרים את העליון, האפליקציה מנגנת את התחתון.' }, play: [chord([60, 64], 0.6), chord([62, 65], 0.6), chord([64, 67], 0.9)] },
      { say: { en: 'Use headphones if you can; without them the app filters its own sound out. Your turn.', he: 'השתמשו באוזניות אם אפשר; בלעדיהן האפליקציה מסננת את הצליל שלה. תורכם.' } },
    ],
  },
  {
    id: 'style-studies',
    area: 'voice',
    emoji: 'mic',
    title: { en: 'Style studies', he: 'לימודי סגנון' },
    takeaway: { en: 'Pop and R&B sit off the beat; soul bends the third; musical theatre builds a phrase to its top note.', he: 'פופ ו-R&B יושבים מחוץ לפעמה; סול מכופף את הטרצה; תיאטרון מוזיקלי בונה משפט אל הצליל העליון שלו.' },
    steps: [
      { say: { en: 'Each song is ours, with the band. The time is graded first, then the notes.', he: 'כל שיר הוא שלנו, עם הלהקה. קודם נמדד הזמן, אחר כך הצלילים.' } },
      { say: { en: 'In the theatre songs the chorus must grow louder than the verse. Your turn.', he: 'בשירי התיאטרון הפזמון צריך להיות חזק יותר מהבית. תורכם.' } },
    ],
  },
  {
    id: 'top-range',
    area: 'voice',
    emoji: 'octave',
    title: { en: 'The top of the range', he: 'פסגת המנעד' },
    takeaway: { en: 'Go a little above your top note, steady and unforced, then reach it again inside a phrase. Stop if it hurts.', he: 'עולים קצת מעל הצליל העליון שלכם, יציב ובלי לדחוף, ואז מגיעים אליו שוב בתוך משפט. עוצרים אם כואב.' },
    steps: [
      { say: { en: 'One semitone above the top, then two, then three: short holds, a breath between.', he: 'חצי טון מעל הפסגה, אחר כך שניים, אחר כך שלושה: החזקות קצרות, נשימה ביניהן.' } },
      { say: { en: 'The goal note is your new top floor; the phrase that climbs to it makes it usable. Your turn.', he: 'צליל היעד הוא הקומה העליונה החדשה שלכם; המשפט שמטפס אליו הופך אותו לשמיש. תורכם.' } },
    ],
  },
  // ───────────── ear ─────────────
  {
    id: 'three-voice',
    area: 'ear',
    emoji: 'chords',
    title: { en: 'Three voices: the lowest', he: 'שלושה קולות: התחתון' },
    takeaway: { en: 'Hear the bass under two other voices: it moves by 4ths and 5ths in root position, by steps in inversions.', he: 'שומעים את הבס מתחת לשני קולות אחרים: במצב יסודי הוא זז בקוורטות ובקווינטות, בהיפוכים בצעדים.' },
    steps: [
      { say: { en: 'Three voices, the top one written. Hum the lowest while it plays.', he: 'שלושה קולות, העליון כתוב. זמזמו את התחתון בזמן שהוא מתנגן.' }, play: [chord([48, 64, 67], 0.8), chord([53, 65, 69], 0.8), chord([55, 62, 71], 0.8), chord([48, 64, 72], 1.1)] },
      { say: { en: 'Then write it in the bass clef, one note per chord. Your turn.', he: 'אחר כך כתבו אותו במפתח פה, צליל לכל אקורד. תורכם.' } },
    ],
  },
  {
    id: 'one-hearing',
    area: 'ear',
    emoji: 'memory',
    title: { en: 'One hearing', he: 'השמעה אחת' },
    takeaway: { en: 'The phrase plays once. Listen to the whole of it, keep it in your ear, then write it.', he: 'המשפט מתנגן פעם אחת. הקשיבו לכולו, שמרו אותו באוזן, ואז כתבו.' },
    steps: [
      { say: { en: 'There is no replay here: Repeat waits until you answer.', he: 'אין כאן השמעה חוזרת: הכפתור "שוב" מחכה עד שתענו.' } },
      { say: { en: 'Fix three things while it plays: the first note, the shape, the last note. Your turn.', he: 'קבעו שלושה דברים בזמן שהוא מתנגן: הצליל הראשון, הצורה, הצליל האחרון. תורכם.' } },
    ],
  },
  {
    id: 'features',
    area: 'ear',
    emoji: 'hairpin',
    title: { en: 'Describe the piece', he: 'תארו את הקטע' },
    takeaway: { en: 'One excerpt, several features: loudness, note lengths, tempo, major or minor, the ending. Every right feature counts.', he: 'קטע אחד, כמה תכונות: עוצמה, אורכי צלילים, טמפו, מז׳ור או מינור, הסיום. כל תכונה נכונה נחשבת.' },
    steps: [
      { say: { en: 'Smooth or detached? Loud, soft, or changing? Steady, faster, or slower?', he: 'רציף או מנותק? חזק, חלש, או משתנה? יציב, מאיץ או מאט?' }, play: [notes([60, 62, 64, 65, 67, 65, 64, 62, 60], 0.3)] },
      { say: { en: 'Pick the description that gets them all right. Your turn.', he: 'בחרו את התיאור שמתאים בכולן. תורכם.' } },
    ],
  },
];

/** Units: the family (tech:<family>), the first level of each voice family (vocal:<level>), the topics. */
export const UNITS: Record<string, string> = {
  'tech:g-speed': 'speed-ladder',
  'tech:g-fusion': 'fusion-outside',
  'tech:g-cmarr': 'cm-arranging',
  'tech:g-solojazz': 'solo-jazz-guitar',
  'tech:g-hlfast': 'bh-line-devices',
  'tech:d-pas': 'pas-rolls',
  'tech:d-stick': 'stickings',
  'tech:d-synco': 'synco-interp',
  'tech:d-chapin': 'jazz-indep',
  'tech:d-linear': 'linear-funk',
  'tech:d-brush': 'brushes',
  'tech:d-trade': 'trading',
  'vocal:2201': 'altered-arps',
  'vocal:2211': 'wide-leaps',
  'vocal:2231': 'quick-study',
  'vocal:2241': 'score-part',
  'vocal:2251': 'style-studies',
  'vocal:2271': 'top-range',
  'topic:three-voice': 'three-voice',
  'topic:one-hearing': 'one-hearing',
  'topic:features': 'features',
};

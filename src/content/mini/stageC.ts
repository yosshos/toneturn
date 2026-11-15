// STAGE C (docs/research/AUDIT-6-*.md): the quick lessons before the advanced endings — the guitar above grade 8, the
// drums past 1400, the voice's top ladder and the advanced ear topics. One lesson per group of new concepts (each
// family's first step opens with its group's lesson); see ../miniTypes.ts for the format.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.25): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d = 0.35): Stimulus => ({ kind: 'rest', duration: d });
/** A rhythm on one drum-like low note: x = a stroke, X = an accent, - = a rest (16ths at the tempo). */
const rhythm = (r: string, bpm = 90): Stimulus => {
  const step = 60 / bpm / 4;
  const toks = r.split(/\s+/);
  const events: NoteEvent[] = toks.flatMap((c, i) => (c === '-' ? [] : [{ midi: 45, start: i * step, duration: step * 0.8, velocity: c === 'X' ? 0.9 : 0.55 }]));
  return { kind: 'events', events, length: toks.length * step + 0.3 };
};

export const LESSONS: MiniLesson[] = [
  // ───────────── guitar ─────────────
  {
    id: 'guitar-top',
    area: 'play',
    emoji: 'tempo',
    title: { en: 'Above grade 8: speed and playing outside', he: 'מעבר לשלב 8: מהירות ונגינה בחוץ' },
    takeaway: { en: 'Speed is accuracy repeated, one small step at a time. Outside lines leave the key on purpose and always find the way back.', he: 'מהירות היא דיוק שחוזר על עצמו, צעד קטן בכל פעם. קווים בחוץ יוצאים מהסולם בכוונה ותמיד מוצאים את הדרך חזרה.' },
    steps: [
      { say: { en: 'Each speed item starts in free time, then on a slow click, then climbs the tempo ladder towards concert tempo.', he: 'כל פריט מהירות מתחיל בזמן חופשי, אחר כך על קליק איטי, ואז מטפס בסולם הטמפו אל טמפו של הופעה.' }, play: [notes([52, 54, 56, 57, 59, 61, 63, 64], 0.3)] },
      { say: { en: 'Keep the pick close to the strings and the fretting fingers low. Tension stops you long before the tempo does.', he: 'שמרו את המפרט קרוב למיתרים ואת האצבעות הלוחצות נמוך. המתח עוצר אתכם הרבה לפני שהטמפו עוצר.' }, play: [notes([52, 54, 56, 57, 59, 61, 63, 64, 63, 61, 59, 57, 56, 54, 52], 0.12)] },
      { say: { en: 'Outside by a half step: the minor pentatonic, the same shape a half step higher, then home again to the root.', he: 'בחוץ בחצי טון: הפנטטוני המינורי, אותה צורה חצי טון למעלה, ואז שוב הביתה אל היסוד.' }, play: [notes([57, 60, 62, 64, 67]), rest(), notes([58, 61, 63, 65, 68]), rest(), notes([67, 64, 62, 60, 57])] },
      { say: { en: 'Over G7 the major triads on D flat and E flat give the altered colours. Then the line resolves to C.', he: 'מעל G7 המשולשים המז׳וריים על רה במול ומי במול נותנים את צבעי האלטרד. ואז הקו נפתר לדו.' }, play: [chord([43, 53, 59], 0.8), notes([61, 65, 68, 63, 67, 70], 0.2), notes([64], 0.8)] },
      { say: { en: 'A take counts only when every note is in time, in every key. Outside sounds right only when the way back is clear. Your turn.', he: 'טייק נחשב רק כשכל צליל בזמן, בכל סולם. בחוץ נשמע נכון רק כשהדרך חזרה ברורה. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why small steps: the hand learns a motion at the speed it practises. Ten clean takes a few clicks up beat one messy take far up.', he: 'למה צעדים קטנים: היד לומדת תנועה במהירות שבה היא מתרגלת. עשרה טייקים נקיים כמה קליקים למעלה עדיפים על טייק מבולגן הרבה למעלה.' }, play: [notes([57, 59, 60, 62, 64, 65, 67, 69], 0.2)] },
      { say: { en: 'Three notes a string gives an even group for 16ths and triplets alike. Sweeps let one stroke cross several strings, one note each.', he: 'שלושה צלילים במיתר נותנים קבוצה שווה גם לשש-עשריות וגם לטריולות. סוויפ מאפשר למכה אחת לחצות כמה מיתרים, צליל אחד בכל מיתר.' } },
      { say: { en: 'Four notes a string stretches the hand across five or six frets. Hammer up, pull down, and pick only once on each string.', he: 'ארבעה צלילים במיתר מותחים את היד על פני חמישה או שישה סריגים. הקשות למעלה, משיכות למטה, ופריטה אחת בלבד בכל מיתר.' }, play: [notes([55, 57, 59, 60, 60, 62, 64, 65], 0.18)] },
      { say: { en: 'The altered triad pair comes from the melodic minor a half step above the dominant. Its two triads hold every altered tension between them.', he: 'זוג המשולשים האלטרד בא מהמינור המלודי שחצי טון מעל הדומיננט. בשני המשולשים יחד נמצאים כל מתחי האלטרד.' } },
      { say: { en: 'A common mistake is staying outside too long. One bar out, one bar in: the ear needs the home key to hear the tension.', he: 'טעות נפוצה היא להישאר בחוץ יותר מדי. תיבה בחוץ, תיבה בפנים: האוזן צריכה את סולם הבית כדי לשמוע את המתח.' }, play: [notes([60, 63, 65, 67]), notes([61, 64, 66, 68]), notes([67, 65, 63, 60], 0.3)] },
      { say: { en: 'Where it lives: fusion players lean on side-slips and triad pairs, rock and metal players on sweeps and three notes a string, all of it built slowly on a click.', he: 'איפה זה חי: נגני פיוז׳ן נשענים על החלקות וזוגות משולשים, נגני רוק ומטאל על סוויפ ושלושה צלילים במיתר, והכול נבנה לאט על קליק.' } },
      { say: { en: 'Recap: free time, then the ladder; clean before fast; out with a plan and back on a chord tone.', he: 'סיכום: זמן חופשי, ואז הסולם; נקי לפני מהיר; החוצה עם תוכנית וחזרה על צליל אקורד.' } },
    ],
  },
  {
    id: 'guitar-arranging',
    area: 'play',
    emoji: 'chords',
    title: { en: 'Solo jazz guitar and arranging', he: 'גיטרת ג׳אז סולו ועיבוד' },
    takeaway: { en: 'One guitar plays a trio: the thumb walks the bass, the fingers add shells and the melody on top. An arrangement is a plan for a whole tune.', he: 'גיטרה אחת מנגנת טריו: האגודל מהלך בבס, האצבעות מוסיפות קונכיות והמנגינה למעלה. עיבוד הוא תוכנית לשיר שלם.' },
    steps: [
      { say: { en: 'First the walking line alone: the root on each chord, chord tones between, a half step into the next root.', he: 'קודם הקו המהלך לבד: היסוד בכל אקורד, צלילי אקורד ביניהם, חצי טון אל היסוד הבא.' }, play: [notes([41, 45, 48, 51, 46, 50, 53, 47], 0.45)] },
      { say: { en: 'Then the shell above it, short, on the "and" of 2 and 4, the comping a pianist would play.', he: 'אחר כך הקונכייה מעליו, קצרה, על ה"וְ" של 2 ו-4, הליווי שפסנתרן היה מנגן.' }, play: [chord([41, 57, 63], 0.4), chord([46, 56, 62], 0.4)] },
      { say: { en: 'In chord-melody the melody stays on top. Under it go drop 2 chords, a walking bass, or a passing diminished.', he: 'באקורד-מלודיה המנגינה נשארת למעלה. מתחתיה באים אקורדי דרופ 2, בס מהלך, או דימיניש עובר.' }, play: [chord([48, 64, 67, 71], 0.9), chord([47, 62, 65, 69], 0.9), chord([45, 60, 64, 67], 1.2)] },
      { say: { en: 'An arrangement plans the whole tune: an intro from the last four bars, the chorus, a reharmonised chorus, a tag.', he: 'עיבוד מתכנן את כל השיר: פתיחה מארבע התיבות האחרונות, הפזמון, פזמון בהרמון מחדש, תג.' } },
      { say: { en: 'A ballad chorus is played rubato: the time is yours and the notes are measured. Keep the bass even, the chords lighter. Your turn.', he: 'פזמון בלדה מנוגן רובאטו: הזמן שלכם והצלילים נמדדים. שמרו על בס שווה, ואקורדים קלים יותר. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why the shell sits on the "and": the bass owns the beat. A chord on the off-beat answers it, like a pianist answering a bass player.', he: 'למה הקונכייה יושבת על ה"וְ": הבס הוא בעל הפעמה. אקורד על הפעמה החלשה עונה לו, כמו פסנתרן שעונה לבסיסט.' }, play: [notes([43, 47, 50, 52], 0.5), chord([53, 59], 0.3)] },
      { say: { en: 'The thumb plays the bass on strings six and five; the fingers take the guide tones on strings four to two. Keep the hand in one position.', he: 'האגודל מנגן את הבס על המיתרים שש וחמש; האצבעות לוקחות את הצלילים המנחים על המיתרים ארבע עד שתיים. השאירו את היד בפוזיציה אחת.' } },
      { say: { en: 'Reharmonising a chorus: tritone substitutions, extra two-fives, a backdoor dominant. The melody stays the same while the colours change under it.', he: 'הרמון מחדש של פזמון: תחליפי טריטון, שני-חמש נוספים, דומיננט דלת אחורית. המנגינה נשארת אותו דבר והצבעים משתנים מתחתיה.' }, play: [chord([43, 59, 65, 71], 0.8), chord([49, 59, 65, 71], 0.8), chord([48, 60, 64, 71], 1)] },
      { say: { en: 'The tag repeats the last two bars before the final chord, so the ending is felt coming, not stumbled into.', he: 'התג חוזר על שתי התיבות האחרונות לפני האקורד הסופי, כך שהסיום מורגש כשהוא מגיע ולא נופלים אליו.' } },
      { say: { en: 'A common mistake is a bass that rushes under a busy melody. Practise the bass and the melody alone first, then together, slowly.', he: 'טעות נפוצה היא בס שממהר מתחת למנגינה עמוסה. תרגלו קודם את הבס ואת המנגינה לבד, ואז יחד, לאט.' } },
      { say: { en: 'Where it lives: solo jazz guitarists play whole sets this way, the bass walking under shells and the melody, with an intro and a tag around every tune.', he: 'איפה זה חי: גיטריסטים של ג׳אז סולו מנגנים כך הופעות שלמות, הבס מהלך מתחת לקונכיות ולמנגינה, עם פתיחה ותג סביב כל שיר.' } },
      { say: { en: 'Recap: bass on the beat, shells on the "and", the melody on top, and a plan from the intro to the tag.', he: 'סיכום: בס על הפעמה, קונכיות על ה"וְ", המנגינה למעלה, ותוכנית מהפתיחה ועד התג.' } },
    ],
  },
  // ───────────── drums ─────────────
  {
    id: 'drum-rudiments-top',
    area: 'rhythm',
    emoji: 'rudiment',
    title: { en: 'The last PAS rudiments, and stickings at tempo', he: 'הרודימנטים האחרונים של PAS, ואצבועים בטמפו' },
    takeaway: { en: 'Open rolls are doubles plus a release; ratamacues are drags leading into an accent. Every sticking is its own motion — make each one sound even.', he: 'גלגולים פתוחים הם כפולות ועוד שחרור; רטמקיו הוא דראגים שמובילים להדגשה. כל אצבוע הוא תנועה משלו — גרמו לכל אחד להישמע שווה.' },
    steps: [
      { say: { en: 'A thirteen-stroke roll: six doubles, R R L L three times, then one accented single on the next eighth.', he: 'גלגול של שלוש-עשרה מכות: שש כפולות, R R L L שלוש פעמים, ואז מכה בודדת מודגשת על השמינית הבאה.' }, play: [rhythm('x x x x x x x x x x x x - - X -', 80)] },
      { say: { en: 'The buzz roll presses each stroke into the head. The app measures the pulse of your hands; the bounces between are yours.', he: 'גלגול הבאז לוחץ כל מכה אל העור. האפליקציה מודדת את פעימות הידיים שלכם; הניתורים שביניהן שלכם.' }, play: [rhythm('x x x x x x x x x x x x x x x x', 70)] },
      { say: { en: 'A double ratamacue: two drags, then three strokes, the last one accented on the beat.', he: 'רטמקיו כפול: שני דראגים, ואז שלוש מכות, והאחרונה מודגשת על הפעמה.' }, play: [rhythm('x x x x X - - -', 70)] },
      { say: { en: 'Stickings: four notes have fourteen orders of R and L. One sticking a bar, four bars a take, then faster.', he: 'אצבועים: לארבעה צלילים יש ארבעה-עשר סדרים של R ו-L. אצבוע אחד בכל תיבה, ארבע תיבות בטייק, ואז מהר יותר.' } },
      { say: { en: 'Grace notes need the kit over MIDI: the flam or drag is soft and comes just before the main stroke. Start slowly. Your turn.', he: 'צלילי חן צריכים מערכת ב-MIDI: הפלאם או הדראג רכים ורגע לפני המכה. התחילו לאט. תורכם.' } },
    ],
    more: [
      { say: { en: 'Count the strokes, not the time: five, seven, nine, ten, eleven, thirteen, fifteen, seventeen. The odd ones end on one accented single.', he: 'סופרים את המכות, לא את הזמן: חמש, שבע, תשע, עשר, אחת-עשרה, שלוש-עשרה, חמש-עשרה, שבע-עשרה. האי-זוגיים נגמרים במכה בודדת מודגשת.' }, play: [rhythm('x x x x x x x x X - - -', 90)] },
      { say: { en: 'The ten-stroke roll ends with two singles, the last accented. That is why it feels different from the eleven.', he: 'גלגול עשר המכות נגמר בשתי מכות בודדות, והאחרונה מודגשת. לכן הוא מרגיש שונה מגלגול אחת-עשרה המכות.' } },
      { say: { en: 'The pataflafla puts flams on the first and fourth notes: flam R, L, R, flam L. Keep the flams the same width every time.', he: 'הפאטאפלאפלה שמה פלאמים על הצליל הראשון והרביעי: פלאם R, L, R, פלאם L. שמרו על אותו רוחב פלאם בכל פעם.' } },
      { say: { en: 'The triple paradiddle is three alternating pairs and a double: R L R L R L R R, then the same from the left.', he: 'הפאראדידל המשולש הוא שלושה זוגות לסירוגין וכפולה: R L R L R L R R, ואז אותו דבר משמאל.' }, play: [rhythm('X x x x x x x x X x x x x x x x', 90)] },
      { say: { en: 'A common mistake is a weak second stroke in the doubles. The app compares the two; aim for the second as strong as the first.', he: 'טעות נפוצה היא מכה שנייה חלשה בכפולות. האפליקציה משווה ביניהן; כוונו שהשנייה תהיה חזקה כמו הראשונה.' } },
      { say: { en: 'Where it lives: marching and concert snare drummers use every rudiment here, and kit players move them around the toms for fills and solos.', he: 'איפה זה חי: מתופפי סנר במצעדים ובתזמורות משתמשים בכל הרודימנטים האלה, ומתופפי מערכת מעבירים אותם בין הטומים למעברים ולסולואים.' } },
      { say: { en: 'Recap: count the strokes, keep the release on the eighth, the graces soft and close, every sticking even.', he: 'סיכום: סופרים את המכות, השחרור על השמינית, צלילי החן רכים וקרובים, כל אצבוע שווה.' } },
    ],
  },
  {
    id: 'drum-grooves-top',
    area: 'rhythm',
    emoji: 'ghost',
    title: { en: 'Independence, linear funk and syncopation', he: 'עצמאות, פאנק ליניארי וסינקופות' },
    takeaway: { en: 'One written line, many grooves. In jazz the ride and the foot never change while snare and kick move; in linear funk no two limbs play together.', he: 'קו כתוב אחד, הרבה גרובים. בג׳אז הרייד והרגל לא משתנים כשהסנר והקיק זזים; בפאנק ליניארי אף פעם לא שתי גפיים יחד.' },
    steps: [
      { say: { en: 'Read one syncopated line, and play it on the kick under a rock beat, then as band hits with the crash.', he: 'קראו קו מסונכפ אחד, ונגנו אותו בקיק מתחת לקצב רוק, ואז כמכות להקה עם הקראש.' }, play: [rhythm('x - - x - - x - x - x - - x - -', 100)] },
      { say: { en: 'In jazz the upbeat eighth falls on the last note of the triplet. Long notes go to the kick, short ones to the snare.', he: 'בג׳אז השמינית החלשה נופלת על הצליל האחרון של הטריולה. צלילים ארוכים הולכים לקיק, קצרים לסנר.' } },
      { say: { en: 'Spang, spang-a-lang on the ride with the foot on 2 and 4. The snare moves through the triplet, one figure a bar.', he: 'ספאנג, ספאנג-א-לאנג ברייד והרגל על 2 ו-4. הסנר זז בתוך הטריולה, דמות אחת בכל תיבה.' }, play: [rhythm('x - - x - x x - - x - x', 120)] },
      { say: { en: 'Linear funk: hat, snare and kick take turns on the 16ths. A group of three across the bar shifts against the beat.', he: 'פאנק ליניארי: היי־האט, סנר וקיק מתחלפים על השש-עשריות. קבוצה של שלושה לאורך התיבה זזה מול הפעמה.' }, play: [rhythm('x x X x x X x x X x x X x x X x', 80)] },
      { say: { en: 'The app checks that nothing in a linear groove sounds together, and that the ride keeps swinging. Your turn.', he: 'האפליקציה בודקת ששום דבר בגרוב ליניארי לא נשמע יחד, ושהרייד ממשיך לסווינג. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why read one line many ways: a chart rarely tells a drummer what to play. It gives the rhythm, and the style decides the drums.', he: 'למה לקרוא קו אחד בהרבה דרכים: תרשים כמעט אף פעם לא אומר למתופף מה לנגן. הוא נותן את הקצב, והסגנון מחליט על התופים.' } },
      { say: { en: 'In funk the line goes on the kick under 16th hats, with ghost notes on the snare between the backbeats.', he: 'בפאנק הקו הולך לקיק מתחת להיי־האט בשש-עשריות, עם תווי רפאים בסנר בין ההדגשות.' }, play: [rhythm('X x g x X x g x X x g x X x g x', 90)] },
      { say: { en: 'The independence ladder adds one limb at a time: snare figures, kick figures, both, then the foot on every beat.', he: 'סולם העצמאות מוסיף גפה אחת בכל פעם: דמויות סנר, דמויות קיק, שתיהן, ואז הרגל על כל פעמה.' } },
      { say: { en: 'Displaced grooves move the whole pattern a 16th later each bar. The backbeat lands on e, then and, then a.', he: 'גרובים מוזזים מזיזים את כל התבנית שש-עשרית מאוחר יותר בכל תיבה. ההדגשה נוחתת על e, ואז על and, ואז על a.' }, play: [rhythm('x x x X x x x x x x x X x x x x', 90)] },
      { say: { en: 'A common mistake is the ride stiffening when the left hand gets busy. If it does, slow down: the time comes first.', he: 'טעות נפוצה היא רייד שמתקשח כשיד שמאל עמוסה. אם זה קורה, האטו: הזמן קודם.' } },
      { say: { en: 'Where it lives: big-band drummers read lines like these every night, and funk drummers build whole songs from linear patterns and ghost notes.', he: 'איפה זה חי: מתופפי ביג-בנד קוראים קווים כאלה בכל ערב, ומתופפי פאנק בונים שירים שלמים מתבניות ליניאריות ותווי רפאים.' } },
      { say: { en: 'Recap: one line, five interpretations; the ride and the foot stay put; in linear grooves, one limb at a time.', he: 'סיכום: קו אחד, חמש פרשנויות; הרייד והרגל נשארים במקום; בגרוב ליניארי, גפה אחת בכל פעם.' } },
    ],
  },
  {
    id: 'drum-form-top',
    area: 'rhythm',
    emoji: 'improv',
    title: { en: 'Brushes, odd meters at tempo, and soloing over a form', he: 'מברשות, משקלים מוזרים בטמפו, וסולו על צורה' },
    takeaway: { en: 'Brushes: the left hand sweeps, the right hand taps the time. Soloing: count the form and land the next 1 with the crash and kick.', he: 'מברשות: יד שמאל מסובבת, יד ימין מקישה את הזמן. סולו: סופרים את הצורה ונוחתים על ה-1 הבא עם קראש וקיק.' },
    steps: [
      { say: { en: 'In a brushes ballad the left hand sweeps one slow circle a beat, and the right taps on 2 and 4.', he: 'בבלדה במברשות יד שמאל מסובבת עיגול איטי אחד בכל פעמה, ויד ימין מקישה על 2 ו-4.' }, play: [rhythm('- - - - x - - - - - - - x - - -', 60)] },
      { say: { en: 'The taps are measured: timing, swing and accents. The sweep is yours, shown but not scored.', he: 'הנקישות נמדדות: זמן, סווינג והדגשות. הסוויפ שלכם, מוצג אבל לא נמדד.' } },
      { say: { en: 'Odd meters at tempo: 7/8 counted as 2 plus 2 plus 3. The hat accents mark each group.', he: 'משקלים מוזרים בטמפו: 7/8 שנספר כ-2 ועוד 2 ועוד 3. ההדגשות בהיי־האט מסמנות כל קבוצה.' }, play: [rhythm('X x X x X x x X x X x X x x', 200)] },
      { say: { en: 'Trading fours: four bars of time, four bars of solo while the band lays out. Play anything, but never lose the bar line.', he: 'חילופי ארבע: ארבע תיבות זמן, ארבע תיבות סולו כשהלהקה שותקת. נגנו מה שתרצו, רק אל תאבדו את קו התיבה.' }, play: [rhythm('x x X x - x X x x - X x x x X -', 120)] },
      { say: { en: 'Land each time section with a crash and the kick on its first beat, within a few milliseconds. Keep counting. Your turn.', he: 'נחתו בכל קטע זמן עם קראש וקיק על הפעמה הראשונה שלו, בתוך כמה אלפיות שנייה. המשיכו לספור. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why the sweep is not scored: to a microphone it is noise, and many kits send no brush data at all.', he: 'למה הסוויפ לא נמדד: למיקרופון הוא רעש, והרבה מערכות לא שולחות שום מידע על מברשות.' } },
      { say: { en: 'Up-tempo brushes flatten into straight eighths: the right hand taps every eighth and the sweep becomes a short stroke.', he: 'מברשות בטמפו מהיר משתטחות לשמיניות ישרות: יד ימין מקישה כל שמינית והסוויפ הופך למשיכה קצרה.' }, play: [rhythm('x - x - X - x - x - x - X - x -', 200)] },
      { say: { en: 'In 11/8 and 13/8 the groups of three and two change the feel. Say the groups out loud before you play.', he: 'ב-11/8 וב-13/8 הקבוצות של שלוש ושתיים משנות את התחושה. אמרו את הקבוצות בקול לפני שאתם מנגנים.' } },
      { say: { en: 'A chorus solo keeps the band playing. The form is your map: land each four-bar phrase, and catch the set-up hits at the end.', he: 'בסבב סולו הלהקה ממשיכה לנגן. הצורה היא המפה שלכם: נחתו בכל משפט של ארבע תיבות, ותפסו את מכות ההכנה בסוף.' }, play: [rhythm('x x x x X - - - x x X x X - - -', 120)] },
      { say: { en: 'A common mistake is playing so much in the solo bars that the count slips. Leave space; rests are part of a solo.', he: 'טעות נפוצה היא לנגן כל כך הרבה בתיבות הסולו שהספירה מחליקה. השאירו מקום; הפסקות הן חלק מסולו.' } },
      { say: { en: 'Where it lives: in a jazz club the drummer trades fours with the soloists, plays brushes on the ballads and keeps the form for the whole band.', he: 'איפה זה חי: במועדון ג׳אז המתופף מחליף ארבע עם הסולנים, מנגן במברשות בבלדות ושומר על הצורה בשביל כל הלהקה.' } },
      { say: { en: 'Recap: tap the time, sweep for the sound; count the groups; know the form and land it.', he: 'סיכום: מקישים את הזמן, מסובבים בשביל הצליל; סופרים את הקבוצות; מכירים את הצורה ונוחתים בה.' } },
    ],
  },
  // ───────────── voice ─────────────
  {
    id: 'voice-top',
    area: 'voice',
    emoji: 'arp',
    title: { en: 'The top ladder: altered arpeggios, leaps, runs, range', he: 'הסולם העליון: ארפג׳ים מיוחדים, קפיצות, ראנים, מנעד' },
    takeaway: { en: 'Hear the next note before you sing it. Diminished stacks minor 3rds, augmented major 3rds; a leap arrives, it never slides.', he: 'שמעו את הצליל הבא לפני ששרים אותו. מוקטן בנוי מטרצות קטנות, מוגדל מגדולות; קפיצה מגיעה, היא לא מחליקה.' },
    steps: [
      { say: { en: 'Diminished: C, E flat, G flat, two minor thirds. Augmented: C, E, G sharp, two major thirds.', he: 'מוקטן: דו, מי במול, סול במול, שתי טרצות קטנות. מוגדל: דו, מי, סול דיאז, שתי טרצות גדולות.' }, play: [notes([60, 63, 66, 72], 0.4), rest(), notes([60, 64, 68, 72], 0.4)] },
      { say: { en: 'A ninth is an octave and a step. Find the octave in your ear first, then the step above it.', he: 'נונה היא אוקטבה ועוד צעד. מצאו קודם את האוקטבה באוזן, ואז את הצעד שמעליה.' }, play: [notes([60, 72, 74], 0.6)] },
      { say: { en: 'A fast run is many small targets. Sing it slowly in tune first, then on the click, then faster.', he: 'ראן מהיר הוא הרבה יעדים קטנים. שירו אותו קודם לאט ומכוון, אחר כך על הקליק, ואז מהר יותר.' }, play: [notes([72, 69, 67, 64, 62, 60], 0.15)] },
      { say: { en: 'Every session moves to a new key, so you learn the shapes, not the notes. All twelve keys come round.', he: 'כל מפגש עובר לסולם חדש, כך שלומדים את הצורות, לא את הצלילים. כל שנים-עשר הסולמות מגיעים בתורם.' } },
      { say: { en: 'The top of the range: just above your highest note, steady and unforced, then inside a phrase. Stop if it hurts. Breathe low. Your turn.', he: 'פסגת המנעד: קצת מעל הצליל הגבוה שלכם, יציב ובלי לדחוף, ואז בתוך משפט. עצרו אם כואב. נשמו נמוך. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why diminished feels unstable: it has no perfect fifth, and every note is a minor third from the next. It wants to resolve a half step.', he: 'למה מוקטן מרגיש לא יציב: אין בו קווינטה זכה, וכל צליל רחוק טרצה קטנה מהבא. הוא רוצה להיפתר בחצי טון.' }, play: [notes([59, 62, 65, 68], 0.35), notes([60], 0.8)] },
      { say: { en: 'Half-diminished keeps the minor third and the diminished fifth, but its seventh is a whole step below the octave.', he: 'חצי מוקטן שומר על הטרצה הקטנה והקווינטה המוקטנת, אבל הספטימה שלו רחוקה טון שלם מהאוקטבה.' } },
      { say: { en: 'Tritones and chromatic leaps need a reference. Think of a nearby simple interval, then bend your target from it.', he: 'טריטונים וקפיצות כרומטיות צריכים נקודת ייחוס. חשבו על מרווח פשוט קרוב, ואז הזיזו את היעד ממנו.' }, play: [notes([60, 66, 67], 0.5)] },
      { say: { en: 'In a chromatic run every step is a half step. Keep the vowel the same and let the pitch move, not the jaw.', he: 'בראן כרומטי כל צעד הוא חצי טון. שמרו על אותה תנועת פה ותנו לגובה לזוז, לא ללסת.' } },
      { say: { en: 'A common mistake is pushing for the top note. Volume is not height: a light, steady note is the goal.', he: 'טעות נפוצה היא לדחוף אל הצליל העליון. עוצמה היא לא גובה: צליל קל ויציב הוא המטרה.' } },
      { say: { en: 'Where it lives: jazz singers outline diminished chords in bebop lines, soul and gospel singers run fast melismas, and every singer works the top of the range.', he: 'איפה זה חי: זמרי ג׳אז משרטטים אקורדים מוקטנים בקווי ביבופ, זמרי סול וגוספל מריצים מליסמות מהירות, וכל זמר עובד על פסגת המנעד.' } },
      { say: { en: 'Recap: hear it first, shapes not notes, slow before fast, and the top floor light and steady.', he: 'סיכום: לשמוע קודם, צורות ולא צלילים, לאט לפני מהר, והקומה העליונה קלה ויציבה.' } },
    ],
  },
  {
    id: 'voice-read-top',
    area: 'voice',
    emoji: 'sight',
    title: { en: 'Quick study, score parts and styles', he: 'לימוד מהיר, קולות מהתווים וסגנונות' },
    takeaway: { en: 'Read four bars over the band, vary them, then improvise on their chords. Hold your written part while another plays, and sing each style its own way.', he: 'קוראים ארבע תיבות מעל הלהקה, מגוונים אותן, ואז מאלתרים על האקורדים שלהן. מחזיקים את הקול הכתוב שלכם כשקול אחר מנגן, ושרים כל סגנון בדרך שלו.' },
    steps: [
      { say: { en: 'Quick study, first take: sing the four bars as written. The melody is never played to you; read it.', he: 'לימוד מהיר, טייק ראשון: שירו את ארבע התיבות כפי שנכתבו. המנגינה לא מתנגנת לכם; קראו אותה.' }, play: [notes([60, 62, 64, 67, 64, 69, 67], 0.3)] },
      { say: { en: 'Second take: keep the long notes and move the rhythm. Third take: your own line over the same chords, landing on chord tones.', he: 'טייק שני: שמרו על הצלילים הארוכים והזיזו את הקצב. טייק שלישי: קו משלכם על אותם אקורדים, נוחת על צלילי אקורד.' } },
      { say: { en: 'One part from the score: you sing the top line, the app plays the bottom one with you, in thirds and sixths.', he: 'קול אחד מהתווים: אתם שרים את הקו העליון, האפליקציה מנגנת איתכם את התחתון, בטרצות ובסקסטות.' }, play: [chord([60, 64], 0.6), chord([62, 65], 0.6), chord([64, 67], 0.9)] },
      { say: { en: 'Styles: pop and R&B sit off the beat, soul bends the third, musical theatre builds a phrase to its top note.', he: 'סגנונות: פופ ו-R&B יושבים מחוץ לפעמה, סול מכופף את הטרצה, תיאטרון מוזיקלי בונה משפט אל הצליל העליון שלו.' }, play: [notes([67, 63, 64, 67, 69], 0.3)] },
      { say: { en: 'Scat over rhythm changes at tempo: land a chord tone on each new chord. Use headphones for the score parts if you can. Your turn.', he: 'סקאט על ריתם צ׳יינג׳ס בטמפו: נחתו על צליל אקורד בכל אקורד חדש. השתמשו באוזניות בקולות מהתווים אם אפשר. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why read, vary, improvise: it is the RSL quick study. It shows you can read, interpret and create on the same music in a few minutes.', he: 'למה לקרוא, לגוון, לאלתר: זה הלימוד המהיר של RSL. הוא מראה שאפשר לקרוא, לפרש וליצור על אותה מוזיקה בכמה דקות.' } },
      { say: { en: 'When you vary, keep the shape of the phrase. Move notes earlier or later, add a neighbour, but land where the original lands.', he: 'כשמגוונים, שומרים על צורת המשפט. מקדימים או מאחרים צלילים, מוסיפים שכן, אבל נוחתים איפה שהמקור נוחת.' }, play: [notes([60, 62, 64, 67], 0.3), rest(), notes([60, 64, 62, 64, 67], 0.22)] },
      { say: { en: 'Holding a part: listen to the other voice as a partner, not a guide. If you drift to its notes, sing your line alone first.', he: 'להחזיק קול: הקשיבו לקול השני כשותף, לא כמדריך. אם אתם נסחפים אל הצלילים שלו, שירו קודם את הקו שלכם לבד.' } },
      { say: { en: 'The middle of three parts is the hardest: notes above and below pull at you. Find your first note against the bass.', he: 'האמצעי מבין שלושה קולות הוא הקשה ביותר: צלילים מעל ומתחת מושכים אתכם. מצאו את הצליל הראשון שלכם מול הבס.' }, play: [chord([48, 64, 67], 0.8), chord([45, 65, 69], 0.8)] },
      { say: { en: 'A common mistake in style songs is singing every style the same. Listen to where the accents fall and where the voice bends.', he: 'טעות נפוצה בשירי סגנון היא לשיר כל סגנון אותו דבר. הקשיבו איפה נופלות ההדגשות ואיפה הקול מתכופף.' } },
      { say: { en: 'Where it lives: session singers read a part at sight, backing singers hold harmonies against the lead, and good singers change their sound for each style.', he: 'איפה זה חי: זמרי אולפן קוראים קול מהדף, זמרי ליווי מחזיקים הרמוניות מול הסולן, וזמרים טובים משנים את הצליל שלהם לכל סגנון.' } },
      { say: { en: 'Recap: read, vary, create; hold your part; give each style its own time and colour.', he: 'סיכום: לקרוא, לגוון, ליצור; להחזיק את הקול שלכם; לתת לכל סגנון את הזמן והצבע שלו.' } },
    ],
  },
  // ───────────── ear ─────────────
  {
    id: 'ear-top',
    area: 'ear',
    emoji: 'chords',
    title: { en: 'Three voices, one hearing, describing a piece', he: 'שלושה קולות, השמעה אחת, תיאור קטע' },
    takeaway: { en: 'Hear the bass under two voices; keep a phrase in your ear after one hearing; and name several features of one excerpt at once.', he: 'שומעים את הבס מתחת לשני קולות; שומרים משפט באוזן אחרי השמעה אחת; ומתארים כמה תכונות של קטע אחד בבת אחת.' },
    steps: [
      { say: { en: 'Three voices, the top one written. Hum the lowest while it plays, then write it in the bass clef.', he: 'שלושה קולות, העליון כתוב. זמזמו את התחתון בזמן שהוא מתנגן, ואז כתבו אותו במפתח פה.' }, play: [chord([48, 64, 67], 0.8), chord([53, 65, 69], 0.8), chord([55, 62, 71], 0.8), chord([48, 64, 72], 1.1)] },
      { say: { en: 'Root position moves the bass by fourths and fifths; an inversion lets it move by step.', he: 'במצב יסודי הבס זז בקוורטות ובקווינטות; היפוך מאפשר לו לזוז בצעדים.' }, play: [notes([48, 53, 55, 48], 0.5), rest(), notes([48, 52, 53, 55], 0.5)] },
      { say: { en: 'One hearing: the phrase plays once, and Repeat waits until you answer. Fix the first note, the shape, the last note.', he: 'השמעה אחת: המשפט מתנגן פעם אחת, והכפתור "שוב" מחכה עד שתענו. קבעו את הצליל הראשון, הצורה, הצליל האחרון.' } },
      { say: { en: 'Describe the piece: smooth or detached? Loud, soft, or changing? Steady, faster, or slower? Major or minor?', he: 'תארו את הקטע: רציף או מנותק? חזק, חלש, או משתנה? יציב, מאיץ או מאט? מז׳ור או מינור?' }, play: [notes([60, 62, 64, 65, 67, 65, 64, 62, 60], 0.3)] },
      { say: { en: 'Choose the description that gets every feature right. Each right feature earns credit even when one is wrong. Trust your ear, then write it calmly. Your turn.', he: 'בחרו את התיאור שמתאים בכל התכונות. כל תכונה נכונה מקבלת ניקוד גם כשאחת שגויה. סמכו על האוזן וכתבו ברוגע. תורכם.' } },
    ],
    more: [
      { say: { en: 'Why the lowest voice matters: it decides the chord and its inversion. ABRSM asks for it at grade eight.', he: 'למה הקול התחתון חשוב: הוא קובע את האקורד ואת ההיפוך שלו. ABRSM מבקשים אותו בשלב שמונה.' } },
      { say: { en: 'To hear past the top voice, listen first for the cadence at the end: the bass falling a fifth to the tonic is easy to catch.', he: 'כדי לשמוע מעבר לקול העליון, הקשיבו קודם לקדנצה בסוף: בס שיורד קווינטה אל הטוניקה קל לתפוס.' }, play: [chord([43, 62, 67], 0.8), chord([48, 64, 72], 1)] },
      { say: { en: 'One hearing is how music meets you in a band: no rewind. Sing the phrase back in your head before you write anything.', he: 'השמעה אחת היא הדרך שבה מוזיקה פוגשת אתכם בלהקה: אין החזרה. שירו את המשפט בראש לפני שאתם כותבים משהו.' } },
      { say: { en: 'For several features, listen once for each one: the loudness, then the note lengths, the pulse, the key, the ending.', he: 'לכמה תכונות, הקשיבו פעם אחת לכל אחת: העוצמה, אחר כך אורכי הצלילים, הפעמה, הסולם, הסיום.' }, play: [notes([60, 64, 67, 64, 60], 0.2), rest(), notes([60, 63, 67, 63, 60], 0.45)] },
      { say: { en: 'A common mistake is judging the tempo by how busy the notes are. Tap the beat; faster means the taps get closer.', he: 'טעות נפוצה היא לשפוט את הטמפו לפי כמה הצלילים עמוסים. הקישו את הפעמה; מאיץ פירושו שההקשות מתקרבות.' } },
      { say: { en: 'Where it lives: arrangers write bass lines they hear under a melody, band players learn tunes after one hearing, and examiners ask you to describe what you heard.', he: 'איפה זה חי: מעבדים כותבים קווי בס שהם שומעים מתחת למנגינה, נגני להקה לומדים שירים אחרי השמעה אחת, ובוחנים מבקשים לתאר מה שמעתם.' } },
      { say: { en: 'Recap: the bass under the voices, one hearing held in the ear, one feature at a time.', he: 'סיכום: הבס מתחת לקולות, השמעה אחת שמוחזקת באוזן, תכונה אחת בכל פעם.' } },
    ],
  },
];

/** Units: the family (tech:<family>), the first level of each voice family (vocal:<level>), the topics. */
export const UNITS: Record<string, string> = {
  'tech:g-speed': 'guitar-top',
  'tech:g-fusion': 'guitar-top',
  'tech:g-cmarr': 'guitar-arranging',
  'tech:g-solojazz': 'guitar-arranging',
  'tech:g-hlfast': 'bh-line-devices',
  'tech:d-pas': 'drum-rudiments-top',
  'tech:d-stick': 'drum-rudiments-top',
  'tech:d-synco': 'drum-grooves-top',
  'tech:d-chapin': 'drum-grooves-top',
  'tech:d-linear': 'drum-grooves-top',
  'tech:d-brush': 'drum-form-top',
  'tech:d-oddtempo': 'drum-form-top',
  'tech:d-trade': 'drum-form-top',
  'vocal:2201': 'voice-top',
  'vocal:2211': 'voice-top',
  'vocal:2221': 'voice-top',
  'vocal:2271': 'voice-top',
  'vocal:2231': 'voice-read-top',
  'vocal:2241': 'voice-read-top',
  'vocal:2251': 'voice-read-top',
  'vocal:2261': 'voice-read-top',
  'topic:three-voice': 'ear-top',
  'topic:one-hearing': 'ear-top',
  'topic:features': 'ear-top',
};

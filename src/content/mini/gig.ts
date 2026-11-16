// On the bandstand (docs/AUDIT-DEPTH-3.md #11, #12, C8): quick lessons before the keys family k-gig, the guitar family
// g-gig, the bass family b-gig and the ear topic intro-ending. Every fact matches src/engine/drills/gigDrills.ts and its
// tests. Standard jazz practice; nothing is credited to a teacher. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// In C.
const CMAJ7 = [48, 59, 64, 67];
const EBMAJ7 = [51, 58, 62, 67];
const ABMAJ7 = [44, 60, 63, 67];
const DBMAJ7 = [37, 60, 65, 68];
const AB_MAJ = [44, 55, 60, 63];
const DB_MAJ = [37, 56, 60, 65];
const EM7 = [40, 55, 59, 62];
const EBDIM = [39, 54, 57, 60];
const DM7 = [50, 60, 65, 69];
const G7 = [43, 59, 65, 69];
const A7 = [45, 61, 64, 67];
const C7 = [48, 58, 64, 67];
const F7 = [41, 57, 63, 67];
// Ballad: C2 + E3 (a 10th) under a four-note rootless voicing.
const BALLAD_C = [36, 52, 64, 67, 71, 74];
const BALLAD_AM = [45, 60, 67, 71, 72, 76];

export const LESSONS: MiniLesson[] = [
  {
    id: 'gig-endings',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'More intros and endings', he: 'עוד פתיחות וסיומים' },
    takeaway: { en: 'Intros: the iii–VI7–ii–V7 vamp or a blues’s last four bars. Endings: ♭VI–♭II–I in maj7 or 7, the tag ×3, the Dameron turnaround, the diminished walk-down.', he: 'פתיחות: ואמפ iii–VI7–ii–V7 או ארבע התיבות האחרונות של בלוז. סיומים: ♭VI–♭II–I במז׳ור 7 או בדומיננט, התג ×3, הטרנאראונד של דיימרון, הירידה הדימינישית.' },
    steps: [
      {
        say: { en: 'Hi {name}! An intro can vamp on three, six, two, five: E minor 7, A7, D minor 7, G7, then the tune starts on C.', he: 'היי {name}! פתיחה יכולה לחזור על שלוש, שש, שתיים, חמש: Em7, ‏A7, ‏Dm7, ‏G7, ואז השיר מתחיל בדו.' },
        show: { text: { en: 'iii – VI7 – ii – V7 → I', he: 'iii – VI7 – ii – V7 → I' } },
        play: [chord(EM7, 0.5), chord(A7, 0.5), chord(DM7, 0.5), chord(G7, 0.5), chord(CMAJ7, 1)],
      },
      {
        say: { en: 'The Dameron turnaround moves by major 7th chords: C, E flat, A flat, D flat, then home.', he: 'הטרנאראונד של דיימרון זז באקורדי מז׳ור 7: דו, מי במול, לה במול, רה במול, ואז הביתה.' },
        show: { text: { en: 'Imaj7 – ♭IIImaj7 – ♭VImaj7 – ♭IImaj7', he: 'Imaj7 – ♭IIImaj7 – ♭VImaj7 – ♭IImaj7' } },
        play: [chord(CMAJ7, 0.6), chord(EBMAJ7, 0.6), chord(ABMAJ7, 0.6), chord(DBMAJ7, 0.6), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'To end, slide in from a half step above: A flat, D flat, C. As major 7ths it sounds soft; as dominants, bluesy.', he: 'כדי לסיים, מחליקים מחצי טון מלמעלה: לה במול, רה במול, דו. במז׳ור 7 זה רך; כדומיננטים, בלוזי.' },
        play: [chord(AB_MAJ, 0.7), chord(DB_MAJ, 0.7), chord(CMAJ7, 1.4)],
      },
      {
        say: { en: 'The walk-down: E minor 7, E flat diminished, D minor 7, G7, C. The bass falls by half steps.', he: 'הירידה: Em7, ‏E♭°7, ‏Dm7, ‏G7, דו. הבס יורד בחצאי טונים.' },
        play: [chord(EM7, 0.6), chord(EBDIM, 0.6), chord(DM7, 0.6), chord(G7, 0.6), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'Each item starts in free time. Then the click, slowly, up the tempo ladder, in all twelve keys.', he: 'כל תרגיל מתחיל בזמן חופשי. אחר כך עם קליק, לאט, במעלה סולם הטמפו, בכל שתים־עשרה הטונליות.' },
      },
    ],
    more: [
      {
        say: { en: 'Why intros and endings? A tune needs a way in and a way out. The band agrees on them before the count-off, so everyone lands on the first bar together and stops together.', he: 'למה פתיחות וסיומים? לשיר צריך דרך כניסה ודרך יציאה. הלהקה מסכימה עליהן לפני הספירה, כך שכולם נוחתים יחד על התיבה הראשונה ועוצרים יחד.' },
      },
      {
        say: { en: 'A blues often starts with its own last four bars: D minor 7, G7, then C7, A7, D minor 7, G7 back to the top.', he: 'בלוז מתחיל לא פעם בארבע התיבות האחרונות שלו: Dm7, ‏G7, ואז C7, ‏A7, ‏Dm7, ‏G7 חזרה להתחלה.' },
        play: [chord(DM7, 0.6), chord(G7, 0.6), chord(C7, 0.4), chord(A7, 0.4), chord(DM7, 0.4), chord(G7, 0.4), chord(C7, 1)],
      },
      {
        say: { en: 'The tag repeats the last turnaround three times before the final chord. Count the three: the band feels the end coming.', he: 'התג חוזר על הטרנאראונד האחרון שלוש פעמים לפני האקורד האחרון. ספרו את השלוש: הלהקה מרגישה שהסוף מגיע.' },
      },
      {
        say: { en: 'Hear the difference: A flat major 7 to D flat major 7 is gentle; A flat 7 to D flat 7 has a bluesy pull into C.', he: 'שמעו את ההבדל: מ־A♭maj7 ל־D♭maj7 זה עדין; מ־A♭7 ל־D♭7 יש משיכה בלוזית אל דו.' },
        play: [chord(AB_MAJ, 0.6), chord(DB_MAJ, 0.6), chord(CMAJ7, 1), rest(0.4), chord([44, 54, 60, 66], 0.6), chord([37, 53, 59, 65], 0.6), chord(CMAJ7, 1)],
      },
      {
        say: { en: 'A common mistake: rushing the last chord. Hold the final chord its full length and let it ring.', he: 'טעות נפוצה: למהר באקורד האחרון. החזיקו את האקורד האחרון את כל אורכו ותנו לו להדהד.' },
      },
      {
        say: { en: 'On guitar these sit in drop 2 on the top four strings; on bass you walk them, a root on every new chord and a half step into the next.', he: 'בגיטרה הם יושבים בדרופ 2 על ארבעת המיתרים העליונים; בבס הולכים בהם, יסוד בכל אקורד חדש וחצי טון אל הבא.' },
      },
      {
        say: { en: 'Recap: vamp in, play the head, and end with a slide, a tag, or the walk-down. The ear topic asks you to name each one.', he: 'לסיכום: נכנסים בוואמפ, מנגנים את הנושא, ומסיימים בהחלקה, בתג או בירידה. נושא השמיעה מבקש לזהות כל אחד מהם.' },
      },
    ],
  },
  {
    id: 'gig-ballad',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'The ballad: 10ths and four notes', he: 'הבלדה: דצימות וארבעה צלילים' },
    takeaway: { en: 'Left hand: the root and the 3rd an octave up (a 10th). Right hand: a four-note rootless voicing above it, each moving to the nearest next one.', he: 'יד שמאל: היסוד והטרצה אוקטבה מעליו (דצימה). יד ימין: קול של ארבעה צלילים בלי יסוד מעליה, וכל אחד זז לקרוב ביותר שאחריו.' },
    steps: [
      {
        say: { en: 'Hi {name}! A ballad is slow and even: straight eighths, a chord or two a bar. “Evening Lamp” is our own sixteen bars of ballad changes.', he: 'היי {name}! בלדה היא איטית ושקטה: שמיניות ישרות, אקורד או שניים בתיבה. ״מנורת ערב״ הן שש־עשרה תיבות בלדה משלנו.' },
      },
      {
        say: { en: 'The left hand plays a 10th: C low, and the E a 10th above it. If it is too wide, roll it from the bottom.', he: 'יד שמאל מנגנת דצימה: דו נמוך, והמי דצימה מעליו. אם זה רחב מדי, מגלגלים מלמטה.' },
        show: { notes: [36, 52], chord: true, clef: 'bass' },
        play: [chord([36, 52], 1.2)],
      },
      {
        say: { en: 'The right hand adds the 3rd, 5th, 7th and 9th, no root. Then everything together.', he: 'יד ימין מוסיפה טרצה, קווינטה, ספטימה ונונה, בלי יסוד. ואז הכול יחד.' },
        play: [chord(BALLAD_C, 1.4), chord(BALLAD_AM, 1.4)],
      },
      {
        say: { en: 'The right hand keeps one place above the left hand, and each voice moves to the nearest note of the next chord.', he: 'יד ימין נשארת במקום אחד מעל יד שמאל, וכל קול זז לצליל הקרוב ביותר של האקורד הבא.' },
        play: [chord([64, 67, 71, 74], 0.9), chord([64, 67, 71, 72], 0.9), chord([65, 69, 72, 76], 0.9)],
      },
      {
        say: { en: 'First the left hand alone, then the right hand over the root, then both. Free time first, then a slow click.', he: 'קודם יד שמאל לבד, אחר כך יד ימין מעל היסוד, ואז שתיהן. קודם בזמן חופשי, ואז קליק איטי.' },
      },
    ],
    more: [
      {
        say: { en: 'Why 10ths? A 10th fills the low register warmly without the mud of a low 3rd right next to the root.', he: 'למה דצימות? דצימה ממלאת את הרגיסטר הנמוך בחום, בלי הבוץ של טרצה נמוכה צמודה ליסוד.' },
        play: [chord([36, 40], 1), rest(0.3), chord([36, 52], 1)],
      },
      {
        say: { en: 'Two forms of the four-note voicing: A is 3, 5, 7, 9 from the bottom; B is 7, 9, 3, 5. Switch between them to keep the hand still.', he: 'שתי צורות לקול של ארבעה צלילים: A הוא 3, 5, 7, 9 מלמטה; B הוא 7, 9, 3, 5. מחליפים ביניהן כדי שהיד תישאר במקום.' },
        play: [chord([64, 67, 71, 74], 1), chord([67, 71, 72, 76], 1)],
      },
      {
        say: { en: 'On a minor 7 flat 5 or a diminished chord, the four notes include the root: that is fine, it is the chord itself.', he: 'באקורד m7♭5 או דימיניש, ארבעת הצלילים כוללים את היסוד: זה בסדר, זה האקורד עצמו.' },
      },
      {
        say: { en: 'A common mistake: playing loud. A ballad lives at piano to mezzo-piano; let the top note sing a little above the rest.', he: 'טעות נפוצה: לנגן חזק. בלדה חיה בפיאנו עד מצו־פיאנו; תנו לצליל העליון לשיר מעט מעל השאר.' },
      },
      {
        say: { en: 'Practise each half of the chart on its own: bars one to eight, then nine to sixteen. Then play all sixteen bars without stopping, in free time first.', he: 'תרגלו כל חצי של הלידשיט לבד: תיבות אחת עד שמונה, ואז תשע עד שש־עשרה. אחר כך נגנו את כל שש־עשרה התיבות בלי לעצור, קודם בזמן חופשי.' },
      },
      {
        say: { en: 'Recap: 10ths below, four notes above, small steps between chords, straight eighths, and patience.', he: 'לסיכום: דצימות למטה, ארבעה צלילים למעלה, צעדים קטנים בין האקורדים, שמיניות ישרות, וסבלנות.' },
      },
      {
        say: { en: 'On guitar the same chart sits in drop 2 on the middle strings; on bass you play it in two, a root and a 5th each bar.', he: 'בגיטרה אותו לידשיט יושב בדרופ 2 על המיתרים האמצעיים; בבס מנגנים אותו בשתיים, יסוד וקווינטה בכל תיבה.' },
      },
    ],
  },
  {
    id: 'gig-tune',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'A whole tune, start to finish', he: 'שיר שלם, מההתחלה עד הסוף' },
    takeaway: { en: 'Intro (the last four bars) → the head → one solo chorus → the head again → an ending. Each part is graded on its own.', he: 'פתיחה (ארבע התיבות האחרונות) ← הנושא ← סבב סולו אחד ← הנושא שוב ← סיום. כל חלק נבדק בנפרד.' },
    steps: [
      {
        say: { en: 'Hi {name}! On a gig a tune has a road map: an intro, the head, the solos, the head out, an ending.', he: 'היי {name}! בהופעה לשיר יש מפת דרכים: פתיחה, הנושא, הסולואים, הנושא בחזרה, וסיום.' },
        show: { text: { en: 'Intro → Head → Solo → Head → Ending', he: 'פתיחה ← נושא ← סולו ← נושא ← סיום' } },
      },
      {
        say: { en: 'The intro is the tune’s last four bars. On a blues in F: G minor 7, C7, F7, D7, G minor 7, C7.', he: 'הפתיחה היא ארבע התיבות האחרונות של השיר. בבלוז בפה: Gm7, ‏C7, ‏F7, ‏D7, ‏Gm7, ‏C7.' },
        play: [chord([43, 58, 65, 69], 0.6), chord(C7, 0.6), chord(F7, 0.4), chord([38, 54, 60, 65], 0.4), chord([43, 58, 65, 69], 0.4), chord(C7, 0.4), chord(F7, 1)],
      },
      {
        say: { en: 'Then the head: the melody in the right hand, shells in the left. You play it again after the solo.', he: 'אחר כך הנושא: המנגינה ביד ימין, שלדים בשמאל. מנגנים אותו שוב אחרי הסולו.' },
        play: [notes([69, 72, 74, 75, 72], 0.3)],
      },
      {
        say: { en: 'In the solo chorus the bars are yours: land a chord tone on each change, stay inside, or quote the head.', he: 'בסבב הסולו התיבות שלכם: צליל אקורד בכל החלפה, להישאר בתוך המהלך, או לצטט את הנושא.' },
      },
      {
        say: { en: 'The Basie ending: the band hits the tonic, the piano answers with three notes, and one last hit.', he: 'סיום בייסי: הלהקה מכה בטוניקה, הפסנתר עונה בשלושה צלילים, ומכה אחרונה אחת.' },
        play: [chord([41, 57, 62, 65], 0.5), rest(0.3), notes([72, 73, 74], 0.3), chord([41, 57, 62, 65, 77], 1.2)],
      },
      {
        say: { en: 'First each part alone, then the whole tune in one take with the band. The result shows which part slipped.', he: 'קודם כל חלק לבד, ואז השיר כולו בטייק אחד עם הלהקה. התוצאה מראה איזה חלק החליק.' },
      },
    ],
    more: [
      {
        say: { en: 'Why a road map? On the bandstand nobody stops to ask where we are. Knowing the form by heart frees your ears for the music.', he: 'למה מפת דרכים? על הבמה אף אחד לא עוצר לשאול איפה אנחנו. כשיודעים את הצורה בעל פה, האוזניים פנויות למוזיקה.' },
      },
      {
        say: { en: 'Back Porch Blues and Night Ferry are tunes written for this app, so their melodies are ours to play in any key.', he: 'בלוז המרפסת ומעבורת לילה הם שירים שנכתבו לאפליקציה, ולכן המנגינות שלהם שלנו לנגן בכל טונליות.' },
      },
      {
        say: { en: 'In a minor tune the ending is a tag: D half-diminished, G7 flat 9, three times, then C minor.', he: 'בשיר מינורי הסיום הוא תג: Dø7, ‏G7♭9, שלוש פעמים, ואז דו מינור.' },
        play: [chord([38, 53, 56, 60], 0.5), chord([43, 56, 59, 65], 0.5), chord([38, 53, 56, 60], 0.5), chord([43, 56, 59, 65], 0.5), chord([38, 53, 56, 60], 0.5), chord([43, 56, 59, 65], 0.5), chord([36, 55, 63, 69], 1.2)],
      },
      {
        say: { en: 'Quoting the head means four notes of the melody inside your solo, in any key. Listeners love hearing the tune peek through.', he: 'לצטט את הנושא פירושו ארבעה צלילים מהמנגינה בתוך הסולו שלכם, בכל טונליות. המאזינים אוהבים לשמוע את השיר מציץ.' },
        play: [notes([67, 70, 72, 75], 0.3)],
      },
      {
        say: { en: 'The result screen names the part that slipped: the intro, the head, the solo chorus, the head out or the ending. Practise that part alone, then try the whole take again.', he: 'מסך התוצאה מציין את החלק שהחליק: הפתיחה, הנושא, סבב הסולו, הנושא בחזרה או הסיום. תרגלו את החלק הזה לבד, ואז נסו שוב את הטייק כולו.' },
      },
      {
        say: { en: 'A common mistake: losing the form in the solo. Keep the chart in view and land on the first bar of the head out.', he: 'טעות נפוצה: ללכת לאיבוד בצורה בזמן הסולו. השאירו את הלידשיט מול העיניים ונחתו על התיבה הראשונה של הנושא בחזרה.' },
      },
      {
        say: { en: 'Recap: intro, head, one chorus, head, ending, all with the band. On guitar the head is chord-melody; on bass, two-feel for the head and walking for the solo.', he: 'לסיכום: פתיחה, נושא, סבב אחד, נושא, סיום, הכול עם הלהקה. בגיטרה הנושא הוא אקורד־מלודיה; בבס, בשתיים לנושא והליכה לסולו.' },
      },
    ],
  },
];

/** The lesson that opens each unit (family = its first level; levels where a new topic starts). */
export const UNITS: Record<string, string> = {
  'tech:k-gig': 'gig-endings',
  'tech:k-gig-1': 'gig-endings',
  'tech:k-gig-2': 'gig-ballad',
  'tech:k-gig-3': 'gig-endings',
  'tech:k-gig-9': 'gig-tune',
  'tech:g-gig': 'gig-endings',
  'tech:g-gig-1': 'gig-endings',
  'tech:g-gig-4': 'gig-ballad',
  'tech:g-gig-5': 'gig-tune',
  'tech:b-gig': 'gig-ballad',
  'tech:b-gig-1': 'gig-ballad',
  'tech:b-gig-2': 'gig-endings',
  'tech:b-gig-5': 'gig-tune',
  // intros and endings by ear (the instruments' own ear counterparts of the topic)
  'tech:g-gig-9': 'gig-endings',
  'tech:b-gig-9': 'gig-endings',
  'topic:intro-ending': 'gig-endings',
};

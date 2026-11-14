// HARMONY_3 (docs/AUDIT-CONTENT-THEORY.md §ד, §ז.2 H-1…H-8): quick lessons for harmonic function, modal cadences and
// vamps, borrowed jazz colours, jazz dictation, planing, form by ear and negative harmony. Every fact matches its
// generator (src/engine/topicsHarmony3.ts). Counterpoint species 3 and 5 are in the 'counterpoint' lesson (written.ts).
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { bhProg, type BhChord } from '../../engine/topicsHarris2';
import { jazzProgStim } from '../../engine/topicsJazzEar';

const chord = (midis: number[], duration = 1.3): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });
const ch = (sym: string, bass: number, pcs: number[]): BhChord => ({ sym, bass, pcs });
const T = (...c: BhChord[]) => bhProg(c, 0, 84);
const I = ch('I', 0, [0, 4, 7]);
const i = ch('i', 0, [0, 3, 7]);
const IV = ch('IV', 5, [5, 9, 0]);
const V = ch('V', 7, [7, 11, 2]);
const bVII = ch('♭VII', 10, [10, 2, 5]);

export const LESSONS: MiniLesson[] = [
  {
    id: 'function-ear',
    area: 'harmony',
    emoji: 'T',
    title: { en: 'Tonic, pre-dominant, dominant', he: 'טוניקה, סובדומיננטה, דומיננטה' },
    takeaway: {
      en: 'Tonic is at rest (I, vi; in minor i, ♭VI), pre-dominant moves away (IV, ii; iv, ii°), dominant pulls home (V, vii°; V and vii°7 with the raised 7th). iii sits between tonic and dominant.',
      he: 'טוניקה נחה (I, ‏vi; במינור i, ‏♭VI), סובדומיננטה מתרחקת (IV, ‏ii; ‏iv, ‏ii°), דומיננטה מושכת הביתה (V, ‏vii°; ‏V ו־vii°7 עם הדרגה השביעית המוגבהת). iii נמצא בין טוניקה לדומיננטה.',
    },
    steps: [
      {
        say: { en: 'Chords do three jobs. Tonic: home, at rest. Pre-dominant: moving away. Dominant: pulling back home.', he: 'לאקורדים יש שלושה תפקידים. טוניקה: הבית, מנוחה. סובדומיננטה: יציאה מהבית. דומיננטה: משיכה חזרה הביתה.' },
        play: [T(I, IV, V, I)],
        show: { text: { en: 'T → PD → D → T', he: 'T → PD → D → T' } },
      },
      {
        say: { en: 'In major, I and vi are tonic: they share two notes. IV and ii are pre-dominant: both hold the 4th degree. V and vii° are dominant: both hold the leading note.', he: 'במז׳ור, I ו־vi הם טוניקה: יש להם שני צלילים משותפים. IV ו־ii הם סובדומיננטה: בשניהם הדרגה הרביעית. V ו־vii° הם דומיננטה: בשניהם הצליל המוביל.' },
        play: [T(I, ch('vi', 9, [9, 0, 4])), rest(), T(IV, ch('ii', 2, [2, 5, 9])), rest(), T(V, ch('vii°6', 2, [11, 2, 5]))],
        show: { text: { en: 'T: I vi · PD: IV ii · D: V vii°', he: 'T: I vi · PD: IV ii · D: V vii°' } },
      },
      {
        say: { en: 'Minor works the same way: i and ♭VI tonic, iv and ii° pre-dominant, V and vii°7 dominant, with the raised 7th.', he: 'מינור עובד אותו דבר: i ו־♭VI טוניקה, ‏iv ו־ii° סובדומיננטה, ‏V ו־vii°7 דומיננטה, עם הדרגה השביעית המוגבהת.' },
        play: [T(i, ch('iv', 5, [5, 8, 0]), ch('V7', 7, [7, 11, 2, 5]), i)],
        show: { text: { en: 'i · iv · V7 · i', he: 'i · iv · V7 · i' } },
      },
      {
        say: { en: 'iii sits between: two notes with I, two with V. Before vi it sounds like a step away from home, after I like a softer tonic. So we don’t ask for it.', he: 'iii נמצא באמצע: שני צלילים עם I, שניים עם V. לפני vi הוא נשמע כצעד הרחק מהבית, אחרי I כמו טוניקה רכה. לכן לא שואלים עליו.' },
        show: { text: { en: 'iii = T or D?', he: 'iii = T או D?' } },
      },
      {
        say: { en: 'Your turn: hear the key, then one chord. At rest, leaning away, or pulling home?', he: 'תורכם: שומעים את הסולם, ואז אקורד אחד. נח, נוטה החוצה, או מושך הביתה?' },
      },
    ],
    more: [
      {
        say: { en: 'Function explains why chords can replace each other. Play vi where I was expected and the music still rests, a little darker: that is the deceptive cadence, V to vi.', he: 'הפונקציה מסבירה למה אקורדים יכולים להחליף זה את זה. מנגנים vi במקום שבו ציפינו ל־I, והמוזיקה עדיין נחה, קצת כהה יותר: זו הקדנצה המטעה, V ל־vi.' },
        play: [T(IV, V, ch('vi', 9, [9, 0, 4]))],
      },
      {
        say: { en: 'Pre-dominants share the 4th degree, the note that falls to the 3rd of I. ii often replaces IV before V: ii–V–I is the heart of jazz harmony.', he: 'הסובדומיננטות חולקות את הדרגה הרביעית, הצליל שיורד לטרצה של I. לעיתים קרובות ii מחליף את IV לפני V: ‏ii–V–I הוא הלב של הרמוניית הג׳אז.' },
        play: [T(I, ch('ii', 2, [2, 5, 9]), V, I)],
      },
      {
        say: { en: 'Dominants hold the leading note and, with a 7th, a tritone that wants to close: in G7 the B rises to C and the F falls to E.', he: 'הדומיננטות מחזיקות את הצליל המוביל, ועם ספטימה גם טריטון שרוצה להיסגר: ב־G7 הסי עולה לדו והפה יורד למי.' },
      },
      {
        say: { en: 'In minor the leading note must be raised: the natural minor v has no pull. That is why minor keys borrow V and vii°7 from harmonic minor.', he: 'במינור צריך להגביה את הצליל המוביל: ה־v של המינור הטבעי לא מושך. לכן סולמות מינוריים שואלים את V ואת vii°7 מהמינור ההרמוני.' },
      },
      {
        say: { en: 'Functions also come in longer chains. T, PD, D, T is the basic phrase; a pre-dominant can be stretched — IV then ii — and a tonic can be coloured, I then vi, before the dominant arrives.', he: 'פונקציות באות גם בשרשראות ארוכות. T, ‏PD, ‏D, ‏T הוא המשפט הבסיסי; אפשר למתוח סובדומיננטה — IV ואז ii — ולצבוע טוניקה, I ואז vi, לפני שהדומיננטה מגיעה.' },
        play: [T(I, ch('vi', 9, [9, 0, 4]), IV, ch('ii', 2, [2, 5, 9]), V, I)],
      },
      {
        say: { en: 'Recap: listen for rest, for leaning away, for pull. The bass helps: 1 and 6 rest, 4 and 2 lean, 5 and 7 pull.', he: 'לסיכום: מקשיבים למנוחה, לנטייה החוצה, למשיכה. הבס עוזר: 1 ו־6 נחים, 4 ו־2 נוטים, 5 ו־7 מושכים.' },
      },
    ],
  },
  {
    id: 'modal-cadence',
    area: 'harmony',
    emoji: '♭',
    title: { en: 'Modal cadences and vamps', he: 'קדנצות מודאליות ווואמפים' },
    takeaway: {
      en: 'A mode’s colour note makes the cadence: ♭VII–I Mixolydian, IV–i Dorian, ♭II–i Phrygian — no leading note, unlike V–I. A vamp’s chords name the mode: I–II Lydian, I–♭VII Mixolydian, i–IV Dorian, i–♭II Phrygian, i–♭VI–♭VII Aeolian.',
      he: 'צליל הצבע של המודוס יוצר את הקדנצה: ♭VII–I מיקסולידי, ‏IV–i דורי, ‏♭II–i פריגי — בלי צליל מוביל, בניגוד ל־V–I. האקורדים של וואמפ קובעים את המודוס: I–II לידי, ‏I–♭VII מיקסולידי, ‏i–IV דורי, ‏i–♭II פריגי, ‏i–♭VI–♭VII איאולי.',
    },
    steps: [
      {
        say: { en: '♭VII to I: the Mixolydian cadence of rock and folk. The ♭7 replaces the leading note.', he: '♭VII ל־I: הקדנצה המיקסולידית של רוק ופולק. ה־♭7 מחליף את הצליל המוביל.' },
        play: [T(I, bVII, I)],
        show: { text: { en: '♭VII → I', he: '♭VII → I' } },
      },
      {
        say: { en: 'In minor, a major IV gives the Dorian colour. ♭II to i is Phrygian: flamenco, metal.', he: 'במינור, IV מז׳ורי נותן את הצבע הדורי. ‏♭II ל־i הוא פריגי: פלמנקו, מטאל.' },
        play: [T(i, IV, i), rest(), T(i, ch('♭II', 1, [1, 5, 8]), i)],
        show: { text: { en: 'IV → i · ♭II → i', he: 'IV → i · ♭II → i' } },
      },
      {
        say: { en: 'Compare V to I: the leading note rises a half step into home. The modal cadences arrive more gently, by whole steps or from above.', he: 'השוו ל־V ל־I: הצליל המוביל עולה חצי טון אל הבית. הקדנצות המודאליות מגיעות בעדינות רבה יותר, בטונים שלמים או מלמעלה.' },
        play: [T(I, V, I)],
        show: { text: { en: 'V → I', he: 'V → I' } },
      },
      {
        say: { en: 'A vamp repeats two or three chords. Their notes pick the mode: I–II Lydian, for the ♯4; i–♭VI–♭VII Aeolian, natural minor.', he: 'וואמפ חוזר על שניים או שלושה אקורדים. הצלילים שלהם בוחרים את המודוס: I–II לידי, בגלל ה־♯4; ‏i–♭VI–♭VII איאולי, מינור טבעי.' },
        play: [T(I, ch('II', 2, [2, 6, 9]), I, ch('II', 2, [2, 6, 9]), I)],
        show: { text: { en: 'I – II: Lydian', he: 'I – II: לידי' } },
      },
      {
        say: { en: 'Ask first: is home major or minor? Then find the one chord that holds a note outside plain major or plain minor. That note names the mode. Your turn.', he: 'שואלים קודם: הבית מז׳ורי או מינורי? ואז מחפשים את האקורד היחיד שמחזיק צליל מחוץ למז׳ור או למינור הרגיל. הצליל הזה נותן את שם המודוס. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Each modal chord carries the mode’s one special note. ♭VII holds the ♭7, II holds the ♯4, IV in minor holds the natural 6, ♭II holds the ♭2.', he: 'כל אקורד מודאלי נושא את הצליל המיוחד של המודוס. ‏♭VII מחזיק את ה־♭7, ‏II את ה־♯4, ‏IV במינור את ה־6 הטבעי, ‏♭II את ה־♭2.' },
      },
      {
        say: { en: 'Aeolian needs two chords to prove itself: ♭VI gives the ♭6, ♭VII the natural 2, so it cannot be Dorian or Phrygian.', he: 'האיאולי צריך שני אקורדים כדי להוכיח את עצמו: ♭VI נותן את ה־♭6, ‏♭VII את ה־2 הטבעי, ולכן זה לא דורי ולא פריגי.' },
        play: [T(i, ch('♭VI', 8, [8, 0, 3]), bVII, i)],
      },
      {
        say: { en: 'Mixolydian rock often adds IV: I, ♭VII, IV, I. The three chords together use exactly the notes of the mode.', he: 'רוק מיקסולידי מוסיף לעיתים קרובות IV: ‏I, ‏♭VII, ‏IV, ‏I. שלושת האקורדים יחד משתמשים בדיוק בצלילי המודוס.' },
        play: [T(I, bVII, IV, I)],
      },
      {
        say: { en: 'Modes over a drone and modes over chords are different skills. Over a drone you hear each note against home; over a vamp you hear the chords’ colours, as a band plays them.', he: 'מודוסים מעל צליל ממושך ומודוסים מעל אקורדים הם מיומנויות שונות. מעל צליל ממושך שומעים כל צליל מול הבית; מעל וואמפ שומעים את הצבעים של האקורדים, כמו שלהקה מנגנת אותם.' },
      },
      {
        say: { en: 'Where you hear them: ♭VII–I ends countless rock songs; i–IV is the Dorian groove of soul and modal jazz; i–♭II is the sound of flamenco; I–II floats over film scores.', he: 'איפה שומעים אותם: ♭VII–I מסיים אינספור שירי רוק; ‏i–IV הוא הגרוב הדורי של סול וג׳אז מודאלי; ‏i–♭II הוא הצליל של הפלמנקו; ‏I–II מרחף מעל מוזיקת סרטים.' },
      },
      {
        say: { en: 'Recap: home first, then the colour chord. ♭VII Mixolydian, II Lydian, IV in minor Dorian, ♭II Phrygian, ♭VI with ♭VII Aeolian.', he: 'לסיכום: קודם הבית, ואז אקורד הצבע. ‏♭VII מיקסולידי, ‏II לידי, ‏IV במינור דורי, ‏♭II פריגי, ‏♭VI עם ♭VII איאולי.' },
      },
    ],
  },
  {
    id: 'borrowed-ext',
    area: 'jazz',
    emoji: '♭',
    title: { en: 'Borrowed chords in jazz colours', he: 'אקורדים שאולים בצבעי ג׳אז' },
    takeaway: {
      en: 'From the minor side jazz borrows ivm7, ivm6, ♭VImaj7, ♭VII7, ♭IIImaj7 and ♭IImaj7. On the way home: ♭VImaj7–♭VII7–I, the backdoor ivm7–♭VII7–I, and Tadd Dameron’s ♭IIImaj7–♭VImaj7–♭IImaj7–Imaj7.',
      he: 'מהצד המינורי הג׳אז שואל ivm7, ‏ivm6, ‏♭VImaj7, ‏♭VII7, ‏♭IIImaj7 ו־♭IImaj7. בדרך הביתה: ♭VImaj7–♭VII7–I, הדלת האחורית ivm7–♭VII7–I, והסיום של טאד דמרון ♭IIImaj7–♭VImaj7–♭IImaj7–Imaj7.',
    },
    steps: [
      {
        say: { en: 'From the parallel minor and its modes, jazz borrows major-7th colours: ♭VImaj7, ♭IIImaj7, ♭IImaj7 — and ivm7.', he: 'מהמינור המקביל והמודוסים שלו, הג׳אז שואל צבעים של מז׳ור 7: ♭VImaj7, ‏♭IIImaj7, ‏♭IImaj7 — ו־ivm7.' },
        play: [jazzProgStim(0, [[0, 'maj7', 4], [8, 'maj7', 4], [0, 'maj7', 4]], 108)],
        show: { text: { en: 'Imaj7 – ♭VImaj7 – Imaj7', he: 'Imaj7 – ♭VImaj7 – Imaj7' } },
      },
      {
        say: { en: 'The classic move: IVmaj7 to ivm6. One note falls a half step, and the major key darkens for a moment.', he: 'התנועה הקלאסית: IVmaj7 ל־ivm6. צליל אחד יורד חצי טון, והסולם המז׳ורי מתכהה לרגע.' },
        play: [jazzProgStim(0, [[5, 'maj7', 4], [5, 'm6', 4], [0, 'maj7', 4]], 108)],
        show: { text: { en: 'IVmaj7 → ivm6 → Imaj7', he: 'IVmaj7 → ivm6 → Imaj7' } },
      },
      {
        say: { en: 'On the way home: ♭VImaj7, ♭VII7, I. Or the backdoor: ivm7, ♭VII7, I.', he: 'בדרך הביתה: ♭VImaj7, ‏♭VII7, ‏I. או הדלת האחורית: ivm7, ‏♭VII7, ‏I.' },
        play: [jazzProgStim(0, [[8, 'maj7', 2], [10, 'dom7', 2], [0, 'maj7', 4]], 108), rest(), jazzProgStim(0, [[5, 'm7', 2], [10, 'dom7', 2], [0, 'maj7', 4]], 108)],
        show: { text: { en: '♭VImaj7–♭VII7–I · ivm7–♭VII7–I', he: '♭VImaj7–♭VII7–I · ivm7–♭VII7–I' } },
      },
      {
        say: { en: 'Tadd Dameron’s ending, as in “Lady Bird”: ♭IIImaj7, ♭VImaj7, ♭IImaj7, Imaj7.', he: 'הסיום של טאד דמרון, כמו ב־“Lady Bird”: ‏♭IIImaj7, ‏♭VImaj7, ‏♭IImaj7, ‏Imaj7.' },
        play: [jazzProgStim(0, [[0, 'maj7', 4], [3, 'maj7', 2], [8, 'maj7', 2], [1, 'maj7', 4], [0, 'maj7', 4]], 108)],
      },
      {
        say: { en: 'To name them, follow the bass: ♭II sits a half step above home, ♭III a minor 3rd above, ♭VI a major 3rd below, ♭VII a whole step below, and iv a 4th above. Then check the colour: major 7th or minor. Your turn.', he: 'כדי לתת שם, עוקבים אחרי הבס: ♭II יושב חצי טון מעל הבית, ‏♭III טרצה קטנה מעל, ‏♭VI טרצה גדולה מתחת, ‏♭VII טון מתחת, ו־iv קוורטה מעל. ואז בודקים את הצבע: מז׳ור 7 או מינור. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Where they come from: ♭III, ♭VI, ♭VII and iv belong to the parallel natural minor; ♭II to Phrygian. In C: E♭, A♭, B♭, Fm and D♭.', he: 'מאיפה הם באים: ♭III, ‏♭VI, ‏♭VII ו־iv שייכים למינור הטבעי המקביל; ‏♭II לפריגי. ב־C: ‏E♭, ‏A♭, ‏B♭, ‏Fm ו־D♭.' },
      },
      {
        say: { en: 'In jazz these chords usually take a major 7th, except ♭VII, which is a dominant 7th: B♭7 in C, the chord of the backdoor.', he: 'בג׳אז האקורדים האלה מקבלים בדרך כלל מז׳ור 7, חוץ מ־♭VII, שהוא דומיננט 7: ‏B♭7 ב־C, האקורד של הדלת האחורית.' },
        play: [jazzProgStim(0, [[10, 'dom7', 4], [0, 'maj7', 4]], 100)],
      },
      {
        say: { en: '♭IImaj7 to Imaj7 is not the tritone substitute. D♭7 has C♭ as its 7th and pulls hard; D♭maj7 has C and floats down.', he: '♭IImaj7 ל־Imaj7 הוא לא תחליף הטריטון. ל־D♭7 יש דו במול כספטימה והוא מושך חזק; ל־D♭maj7 יש דו והוא מרחף למטה.' },
        play: [jazzProgStim(0, [[1, 'dom7', 4], [0, 'maj7', 4]], 100), rest(), jazzProgStim(0, [[1, 'maj7', 4], [0, 'maj7', 4]], 100)],
      },
      {
        say: { en: 'The Tadd Dameron turnaround keeps the bass moving by 4ths and half steps: E♭, A♭, D♭, C. Each chord is a major 7th, so the colour stays bright while the roots wander.', he: 'הטרנאראונד של טאד דמרון שומר על בס שזז בקוורטות ובחצאי טונים: מי במול, לה במול, רה במול, דו. כל אקורד הוא מז׳ור 7, ולכן הצבע נשאר בהיר בזמן שהשורשים נודדים.' },
      },
      {
        say: { en: 'IV to iv is the most common borrowing of all, in jazz and in pop alike: the 6th degree falls a half step, A to A♭ in C, and the line keeps falling to G.', he: 'IV ל־iv הוא השאילה הנפוצה מכולן, בג׳אז ובפופ כאחד: הדרגה השישית יורדת חצי טון, לה ללה במול ב־C, והקו ממשיך לרדת לסול.' },
        play: [chord([53, 65, 69, 72], 1), chord([53, 65, 68, 72], 1), chord([48, 64, 67, 72], 1.3)],
      },
      {
        say: { en: 'Recap: borrowed chords colour a major key from the minor side; the bass tells you which one.', he: 'לסיכום: אקורדים שאולים צובעים סולם מז׳ורי מהצד המינורי; הבס אומר לכם איזה.' },
      },
    ],
  },
  {
    id: 'jazz-dictation',
    area: 'jazz',
    emoji: '7',
    title: { en: 'Writing the changes', he: 'לכתוב את המהלך' },
    takeaway: {
      en: 'Bass first, then each chord’s quality. A secondary ii–V aims at another chord (Em7 A7 → Dm7); a tritone substitute keeps the 3rd and 7th and moves the root a tritone (D♭7 for G7); the V’s colour: 13 bright, 7♭9 and 7alt dark, 7♯11 lydian.',
      he: 'קודם הבס, ואז האיכות של כל אקורד. ii–V משני מכוון לאקורד אחר (Em7 A7 → Dm7); תחליף טריטון שומר על הטרצה והספטימה ומזיז את היסוד בטריטון (D♭7 במקום G7); הצבע של ה־V: ‏13 בהיר, ‏7♭9 ו־7alt כהים, ‏7♯11 לידי.',
    },
    steps: [
      {
        say: { en: 'Writing down changes: first the roots, from the bass. Then each chord’s quality: minor 7, dominant, major 7.', he: 'כשכותבים מהלך: קודם השורשים, מהבס. ואז האיכות של כל אקורד: מינור 7, דומיננט, מז׳ור 7.' },
        play: [jazzProgStim(0, [[0, 'maj7', 4], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], 116)],
        show: { text: { en: 'Cmaj7 Em7 A7 Dm7 G7 Cmaj7', he: 'Cmaj7 Em7 A7 Dm7 G7 Cmaj7' } },
      },
      {
        say: { en: 'Em7 A7 is a ii–V of its own, aimed at Dm7: a secondary ii–V. The A7 makes D sound like home for a moment.', he: 'Em7 A7 הוא ii–V משלו, שמכוון ל־Dm7: ‏ii–V משני. ה־A7 גורם לרה להישמע כמו בית לרגע.' },
        show: { text: { en: 'Em7 A7 → Dm7', he: 'Em7 A7 → Dm7' } },
      },
      {
        say: { en: 'A tritone substitute: D♭7 for G7. The 3rd and the 7th swap places, and the bass falls by half steps into the I.', he: 'תחליף טריטון: D♭7 במקום G7. הטרצה והספטימה מתחלפות, והבס יורד בחצאי טונים אל ה־I.' },
        play: [jazzProgStim(0, [[2, 'm7', 2], [1, 'dom7', 2], [0, 'maj7', 4]], 116)],
        show: { text: { en: 'Dm7 D♭7 Cmaj7', he: 'Dm7 D♭7 Cmaj7' } },
      },
      {
        say: { en: 'The V’s colour: 13 bright, 7♭9 dark, 7alt darkest, 7♯11 lydian.', he: 'הצבע של ה־V: ‏13 בהיר, ‏7♭9 כהה, ‏7alt הכי כהה, ‏7♯11 לידי.' },
        play: [jazzProgStim(0, [[7, 'thirteen', 2], [7, 'b9', 2], [7, 'alt', 2], [7, 's11', 2]], 96)],
        show: { text: { en: 'G13 · G7♭9 · G7alt · G7♯11', he: 'G13 · G7♭9 · G7alt · G7♯11' } },
      },
      {
        say: { en: 'A walking bass line: the root on beat 1, chord or scale tones in the middle, then a half step into the next root, from below or from above. Your turn.', he: 'קו בס מהלך: היסוד בפעמה 1, צלילי אקורד או סולם באמצע, ואז חצי טון אל היסוד הבא, מלמטה או מלמעלה. תורכם.' },
        play: [notes([38, 41, 45, 42, 43, 47, 50, 49, 48], 0.42)],
        show: { text: { en: 'D F A F♯ | G B D D♭ | C', he: 'D F A F♯ | G B D D♭ | C' } },
      },
    ],
    more: [
      {
        say: { en: 'Roots first: hum the bass of each chord and find its distance from the last. 4ths up mean ii–V motion; half steps down mean tritone substitutes.', he: 'קודם השורשים: זמזמו את הבס של כל אקורד ומצאו את המרחק מהקודם. קוורטות למעלה הן תנועת ii–V; חצאי טונים למטה הם תחליפי טריטון.' },
      },
      {
        say: { en: 'Then the quality, from the 3rd and 7th. Minor 3rd and ♭7: minor 7. Major 3rd and ♭7: dominant. Major 3rd and major 7: major 7.', he: 'אחר כך האיכות, מהטרצה והספטימה. טרצה קטנה ו־♭7: מינור 7. טרצה גדולה ו־♭7: דומיננט. טרצה גדולה ומז׳ור 7: מז׳ור 7.' },
        play: [chord([50, 53, 57, 60], 1), chord([55, 59, 62, 65], 1), chord([48, 52, 55, 59], 1.3)],
      },
      {
        say: { en: 'The backdoor, ivm7 to ♭VII7 to I, arrives from a whole step below: Fm7, B♭7, C. It sounds softer than G7, with no leading note.', he: 'הדלת האחורית, ivm7 ל־♭VII7 ל־I, מגיעה מטון שלם מתחת: Fm7, ‏B♭7, ‏C. היא נשמעת רכה יותר מ־G7, בלי צליל מוביל.' },
        play: [jazzProgStim(0, [[5, 'm7', 2], [10, 'dom7', 2], [0, 'maj7', 4]], 112)],
      },
      {
        say: { en: 'Tensions come last. The top of the voicing tells you: a 13th sits a whole step above the 5th, a ♭9 a half step above the root.', he: 'המתחים באים אחרונים. הצליל העליון של הוויסינג אומר: 13 יושב טון מעל הקווינטה, ‏♭9 חצי טון מעל היסוד.' },
      },
      {
        say: { en: 'Secondary dominants are easy to miss when the ii is left out. A7 straight into Dm7 is still V of ii: write it as A7, and listen for the C♯ that leads into D.', he: 'קל לפספס דומיננטות משניות כשה־ii חסר. A7 ישר אל Dm7 הוא עדיין V של ii: כותבים A7, ומקשיבים לדו דיאז שמוביל לרה.' },
      },
      {
        say: { en: 'For the walking bass, write beat 1 of every bar first — the roots — then fill in the approach notes, then the middle of each bar.', he: 'בבס המהלך, כותבים קודם את פעמה 1 של כל תיבה — השורשים — אחר כך את צלילי הגישה, ואז את האמצע של כל תיבה.' },
      },
    ],
  },
  {
    id: 'planing',
    area: 'jazz',
    emoji: '=',
    title: { en: 'Planing and constant structure', he: 'פליינינג ומבנה קבוע' },
    takeaway: {
      en: 'Planing moves one chord shape in parallel: diatonic planing stays in the key, so the qualities change; exact planing keeps one quality. Constant structure puts one quality on roots that move without a key. Voice leading is the opposite: notes stay, the rest moves by small steps.',
      he: 'בפליינינג צורה אחת של אקורד זזה במקביל: פליינינג דיאטוני נשאר בסולם, ולכן האיכויות משתנות; פליינינג מדויק שומר על איכות אחת. במבנה קבוע יש איכות אחת על שורשים שזזים בלי סולם. הובלת קולות היא ההפך: צלילים נשארים, והשאר זז בצעדים קטנים.',
    },
    steps: [
      {
        say: { en: 'Planing: one shape moved in parallel under a melody. Every voice moves the same way.', he: 'פליינינג: צורה אחת שזזה במקביל מתחת למנגינה. כל הקולות זזים באותו כיוון.' },
        play: [chord([60, 64, 67, 71], 0.8), chord([62, 66, 69, 73], 0.8), chord([64, 68, 71, 75], 1.2)],
        show: { text: { en: 'Cmaj7 Dmaj7 Emaj7', he: 'Cmaj7 Dmaj7 Emaj7' } },
      },
      {
        say: { en: 'Diatonic planing stays in the key, so the qualities change: Cmaj7, Dm7, Em7. Exact planing keeps one quality.', he: 'פליינינג דיאטוני נשאר בסולם, ולכן האיכויות משתנות: Cmaj7, ‏Dm7, ‏Em7. פליינינג מדויק שומר על איכות אחת.' },
        play: [chord([60, 64, 67, 71], 0.8), chord([62, 65, 69, 72], 0.8), chord([64, 67, 71, 74], 1.2)],
        show: { text: { en: 'Cmaj7 Dm7 Em7', he: 'Cmaj7 Dm7 Em7' } },
      },
      {
        say: { en: 'Constant structure: one quality on roots that move without a key — Debussy, Bill Evans, modal jazz.', he: 'מבנה קבוע: איכות אחת על שורשים שזזים בלי סולם — דביסי, ביל אוואנס, ג׳אז מודאלי.' },
        play: [chord([60, 64, 67, 71], 0.8), chord([63, 67, 70, 74], 0.8), chord([66, 70, 73, 77], 0.8), chord([69, 73, 76, 80], 1.2)],
        show: { text: { en: 'Cmaj7 E♭maj7 G♭maj7 Amaj7', he: 'Cmaj7 E♭maj7 G♭maj7 Amaj7' } },
      },
      {
        say: { en: 'The So What voicing — three 4ths and a 3rd — is often planed: on E, then on D, inside D Dorian.', he: 'קול So What — שלוש קוורטות וטרצה — זז הרבה בפליינינג: על מי, ואז על רה, בתוך רה דורי.' },
        play: [chord([52, 57, 62, 67, 71], 1), chord([50, 55, 60, 65, 69], 1.4)],
        show: { text: { en: 'E A D G B → D G C F A', he: 'E A D G B → D G C F A' } },
      },
      {
        say: { en: 'Voice leading is the opposite: common tones stay where they are, and the other voices move by the smallest steps they can. Listen for which of the two you hear. Your turn.', he: 'הובלת קולות היא ההפך: צלילים משותפים נשארים במקומם, והקולות האחרים זזים בצעדים הכי קטנים שאפשר. הקשיבו איזה מהשניים אתם שומעים. תורכם.' },
        play: [chord([60, 64, 67, 71], 0.8), chord([60, 64, 69, 72], 0.8), chord([60, 65, 69, 74], 1.2)],
      },
    ],
    more: [
      {
        say: { en: 'Planing came into harmony with Debussy, who moved whole chords in parallel to colour a melody instead of leading voices toward a goal.', he: 'הפליינינג נכנס להרמוניה עם דביסי, שהזיז אקורדים שלמים במקביל כדי לצבוע מנגינה, במקום להוביל קולות אל יעד.' },
      },
      {
        say: { en: 'In diatonic planing the melody note decides each chord: build the same kind of stack below it, using only notes of the key.', he: 'בפליינינג דיאטוני צליל המנגינה קובע כל אקורד: בונים מתחתיו את אותה ערימה, רק מצלילי הסולם.' },
        play: [chord([62, 65, 69, 72], 0.7), chord([64, 67, 71, 74], 0.7), chord([65, 69, 72, 76], 0.7), chord([67, 71, 74, 77], 1.1)],
      },
      {
        say: { en: 'Exact planing ignores the key: every chord is the same, so the roots can land on any note. That freedom is what makes constant structure sound modern.', he: 'פליינינג מדויק מתעלם מהסולם: כל אקורד זהה, ולכן השורשים יכולים לנחות על כל צליל. החופש הזה הוא מה שגורם למבנה קבוע להישמע מודרני.' },
        play: [chord([62, 66, 69, 73], 0.8), chord([61, 65, 68, 72], 0.8), chord([59, 63, 66, 70], 1.2)],
      },
      {
        say: { en: 'To hear the difference, follow an inner voice. In planing it moves exactly with the top; in voice leading it often stays still while the top moves.', he: 'כדי לשמוע את ההבדל, עקבו אחרי קול פנימי. בפליינינג הוא זז בדיוק עם העליון; בהובלת קולות הוא נשאר לעיתים קרובות במקום בזמן שהעליון זז.' },
      },
      {
        say: { en: 'Which shape is it? A maj7 sounds bright with a half step at the top, an m7 soft, a dominant 7 restless, and a stack of 4ths open and hollow, with no 3rd to say major or minor.', he: 'איזו צורה? ‏maj7 נשמע בהיר עם חצי טון למעלה, ‏m7 רך, דומיננט 7 חסר מנוחה, וערימת קוורטות פתוחה וחלולה, בלי טרצה שתגיד מז׳ור או מינור.' },
        play: [chord([60, 64, 67, 71], 0.9), chord([60, 63, 67, 70], 0.9), chord([60, 64, 67, 70], 0.9), chord([60, 65, 70, 75], 1.2)],
      },
      {
        say: { en: 'Recap: parallel or led, in the key or exact, and which shape. Those are the three questions of this unit.', he: 'לסיכום: במקביל או מובל, בסולם או מדויק, ואיזו צורה. אלה שלוש השאלות של היחידה.' },
      },
    ],
  },
  {
    id: 'form-ear',
    area: 'harmony',
    emoji: '|',
    title: { en: 'Form by ear', he: 'צורה בשמיעה' },
    takeaway: {
      en: 'The 12-bar blues is the standard; an 8-bar blues runs I V IV IV I V I V; a 16-bar blues stretches the first four bars on I to eight. AABA puts the bridge third; ABAC starts its second half like the first and ends differently. Around the tune: an intro, a tag (the last phrase again) or a coda (a new ending).',
      he: 'בלוז 12 תיבות הוא הסטנדרט; בלוז 8 תיבות הולך I V IV IV I V I V; בלוז 16 תיבות מותח את ארבע התיבות הראשונות על I לשמונה. ב־AABA הגשר שלישי; ב־ABAC החצי השני מתחיל כמו הראשון ונגמר אחרת. מסביב לשיר: פתיחה, טאג (המשפט האחרון שוב) או קודה (סיום חדש).',
    },
    steps: [
      {
        say: { en: 'Blues lengths. The 12-bar blues is the standard. An 8-bar blues runs I, V, IV, IV, I, V, I, V. A 16-bar blues stretches the first four bars on I to eight.', he: 'אורכי בלוז. בלוז 12 תיבות הוא הסטנדרט. בלוז 8 תיבות הולך I, ‏V, ‏IV, ‏IV, ‏I, ‏V, ‏I, ‏V. בלוז 16 תיבות מותח את ארבע התיבות הראשונות על I לשמונה.' },
        play: [jazzProgStim(0, [0, 7, 5, 5, 0, 7, 0, 7].map((d) => [d, 'dom7', 4] as [number, 'dom7', number]), 192)],
        show: { text: { en: '8: I V IV IV | I V I V', he: '8: I V IV IV | I V I V' } },
      },
      {
        say: { en: 'Count bars from the first tonic until the form starts again. The move to IV is a landmark: bar 5 in the 12-bar, bar 3 in the 8-bar, bar 9 in the 16-bar.', he: 'סופרים תיבות מהטוניקה הראשונה עד שהצורה מתחילה שוב. המעבר ל־IV הוא נקודת ציון: תיבה 5 בבלוז 12, תיבה 3 בבלוז 8, תיבה 9 בבלוז 16.' },
        play: [jazzProgStim(0, [0, 0, 0, 0, 5].map((d) => [d, 'dom7', 4] as [number, 'dom7', number]), 192)],
        show: { text: { en: '1 2 3 4 | 5 …', he: '1 2 3 4 | 5 …' } },
      },
      {
        say: { en: 'Song forms: AABA puts a contrasting bridge third. ABAC starts its second half like the first and ends differently. ABAB alternates two phrases.', he: 'צורות שיר: ב־AABA גשר שונה מגיע שלישי. ב־ABAC החצי השני מתחיל כמו הראשון ונגמר אחרת. ב־ABAB שני משפטים מתחלפים.' },
        play: [notes([60, 62, 64, 67, 64, 62, 60, 60], 0.28), rest(0.3), notes([60, 62, 64, 67, 64, 62, 60, 60], 0.28), rest(0.3), notes([65, 67, 69, 72, 69, 67, 65, 67], 0.28)],
        show: { text: { en: 'AABA · ABAC · ABAB', he: 'AABA · ABAC · ABAB' } },
      },
      {
        say: { en: 'Around the tune: an intro before it, often a vamp like I–vi–ii–V.', he: 'מסביב לשיר: פתיחה לפניו, לעיתים קרובות וואמפ כמו I–vi–ii–V.' },
        play: [jazzProgStim(0, [[0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, 'dom7', 2]], 140)],
      },
      {
        say: { en: 'At the end: a tag repeats the last phrase, a coda adds a new ending. Your turn.', he: 'בסוף: טאג חוזר על המשפט האחרון, קודה מוסיפה סיום חדש. תורכם.' },
        show: { text: { en: 'intro · tag · coda', he: 'פתיחה · טאג · קודה' } },
      },
    ],
    more: [
      {
        say: { en: 'The 8-bar blues “Key to the Highway” is the classic example of I, V, IV, IV, I, V, I, V. Other 8-bar blues exist; what they share is the length and the I–IV–V chords.', he: 'בלוז 8 התיבות “Key to the Highway” הוא הדוגמה הקלאסית ל־I, ‏V, ‏IV, ‏IV, ‏I, ‏V, ‏I, ‏V. יש בלוזים אחרים של 8 תיבות; מה שמשותף להם הוא האורך ואקורדי I–IV–V.' },
      },
      {
        say: { en: 'The 16-bar blues here holds I for eight bars before the usual last eight of the 12-bar. Count patiently: the IV comes late.', he: 'בלוז 16 התיבות כאן מחזיק I שמונה תיבות לפני שמונה התיבות האחרונות הרגילות של בלוז 12. סופרים בסבלנות: ה־IV מגיע מאוחר.' },
        play: [jazzProgStim(0, [5, 5, 0, 0, 7, 5, 0, 7].map((d) => [d, 'dom7', 4] as [number, 'dom7', number]), 192)],
      },
      {
        say: { en: 'In AABA the bridge is the only new music; it usually moves to another key area and returns. In ABAC the third phrase returns to A, and C turns toward the final cadence.', he: 'ב־AABA הגשר הוא המוזיקה החדשה היחידה; הוא בדרך כלל עובר לאזור סולם אחר וחוזר. ב־ABAC המשפט השלישי חוזר ל־A, ו־C פונה אל הקדנצה הסופית.' },
      },
      {
        say: { en: 'A tag often repeats the last two bars three times over a turnaround before the final chord. A coda is new material: a vamp, a chromatic descent, a held chord.', he: 'טאג חוזר לעיתים קרובות על שתי התיבות האחרונות שלוש פעמים מעל טרנאראונד לפני האקורד הסופי. קודה היא חומר חדש: וואמפ, ירידה כרומטית, אקורד מוחזק.' },
        play: [jazzProgStim(0, [[4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], 140)],
      },
      {
        say: { en: 'An intro sets the key and the groove before the melody. Listen for the moment the tune starts: that is where you begin counting the form.', he: 'הפתיחה קובעת את הסולם ואת הגרוב לפני המנגינה. הקשיבו לרגע שבו השיר מתחיל: משם מתחילים לספור את הצורה.' },
      },
      {
        say: { en: 'Recap: count bars, compare phrases with the first one, and notice what was added before or after the tune.', he: 'לסיכום: סופרים תיבות, משווים משפטים לראשון, ושמים לב למה שנוסף לפני השיר או אחריו.' },
      },
    ],
  },
  {
    id: 'negative-harmony',
    area: 'theory',
    emoji: '±',
    title: { en: 'Negative harmony', he: 'הרמוניה שלילית' },
    takeaway: {
      en: 'Mirror every note around the axis between the 3rds of the tonic chord (in C, between E♭ and E): C ↔ G, D ↔ F, E ↔ E♭, A ↔ B♭, B ↔ A♭. Major triads become minor: V → iv, IV → v, I → i, ii → ♭VII, vi → ♭III, iii → ♭VI; G7 → Fm6.',
      he: 'משקפים כל צליל סביב הציר שבין הטרצות של אקורד הטוניקה (ב־C, בין E♭ ל־E): ‏C ↔ G, ‏D ↔ F, ‏E ↔ E♭, ‏A ↔ B♭, ‏B ↔ A♭. משולשים מז׳וריים נעשים מינוריים: V → iv, ‏IV → v, ‏I → i, ‏ii → ♭VII, ‏vi → ♭III, ‏iii → ♭VI; ‏G7 → Fm6.',
    },
    steps: [
      {
        say: { en: 'Negative harmony mirrors every note around an axis between the 3rds of the tonic chord: in C, between E♭ and E.', he: 'הרמוניה שלילית משקפת כל צליל סביב ציר שבין הטרצות של אקורד הטוניקה: ב־C, בין E♭ ל־E.' },
        play: [chord([60, 64, 67], 1), chord([60, 63, 67], 1.3)],
        show: { text: { en: 'C ↔ G · E ↔ E♭', he: 'C ↔ G · E ↔ E♭' } },
      },
      {
        say: { en: 'D and F swap, A and B♭, B and A♭. A major triad turns into a minor one.', he: 'רה ופה מתחלפים, לה וסי במול, סי ולה במול. משולש מז׳ורי הופך למינורי.' },
        play: [chord([62, 65], 0.8), chord([69, 70], 0.8), chord([68, 71], 1)],
        show: { text: { en: 'D ↔ F · A ↔ B♭ · B ↔ A♭', he: 'D ↔ F · A ↔ B♭ · B ↔ A♭' } },
      },
      {
        say: { en: 'So V, G B D, mirrors to F A♭ C: the minor iv. G7 becomes Fm6. IV becomes v, ii becomes ♭VII, vi ♭III, iii ♭VI.', he: 'כך V, סול סי רה, משתקף לפה לה במול דו: iv המינורי. G7 הופך ל־Fm6. ‏IV הופך ל־v, ‏ii ל־♭VII, ‏vi ל־♭III, ‏iii ל־♭VI.' },
        play: [chord([55, 59, 62, 65], 1), chord([53, 56, 60, 62], 1.2), chord([48, 52, 55, 60], 1.4)],
        show: { text: { en: 'G7 → Fm6 → C', he: 'G7 → Fm6 → C' } },
      },
      {
        say: { en: 'Hear it in a cadence: G7 to C, then its mirror, Fm6 to C. The same pull home, from the minor side.', he: 'שומעים את זה בקדנצה: G7 ל־C, ואז ההשתקפות שלו, Fm6 ל־C. אותה משיכה הביתה, מהצד המינורי.' },
        play: [chord([55, 59, 62, 65], 0.9), chord([48, 52, 55, 60], 1), rest(), chord([53, 56, 60, 62], 0.9), chord([48, 52, 55, 60], 1.2)],
      },
      {
        say: { en: 'It is a way to find minor-side colours for a major tune, not a rule of harmony. Your turn.', he: 'זו דרך למצוא צבעים מהצד המינורי לשיר במז׳ור, לא חוק של הרמוניה. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'The idea goes back to the theorist Ernst Levy, and the musician Jacob Collier made it widely known. Its rule is simple arithmetic: in C, a note n mirrors to 7 minus n, counted in semitones.', he: 'הרעיון מגיע מהתאורטיקן ארנסט לוי, והמוזיקאי ג׳ייקוב קולייר הפך אותו לידוע. הכלל הוא חשבון פשוט: ב־C, צליל n משתקף ל־7 פחות n, בחצאי טונים.' },
      },
      {
        say: { en: 'The axis has two sides: between E♭ and E, and across the circle between A and B♭. No note mirrors onto itself.', he: 'לציר יש שני צדדים: בין E♭ ל־E, ומעבר למעגל בין A ל־B♭. אף צליל לא משתקף על עצמו.' },
        play: [chord([63, 64], 0.9), chord([69, 70], 1.1)],
      },
      {
        say: { en: 'Why it sounds right: the mirror keeps every interval, upside down. The leading note B rising to C becomes A♭ falling to G — a half step into the 5th of the tonic.', he: 'למה זה נשמע נכון: ההשתקפות שומרת על כל מרווח, הפוך. הצליל המוביל סי שעולה לדו נעשה לה במול שיורד לסול — חצי טון אל הקווינטה של הטוניקה.' },
        play: [notes([71, 72], 0.5), rest(0.3), notes([68, 67], 0.5)],
      },
      {
        say: { en: 'A ii–V–I in C mirrors to B♭, Fm6, Cm. Most players use only the dominant part: iv6 or ♭VII7 in place of V, landing on a major I.', he: 'ii–V–I ב־C משתקף ל־B♭, ‏Fm6, ‏Cm. רוב הנגנים משתמשים רק בחלק הדומיננטי: iv6 או ♭VII7 במקום V, ונוחתים על I מז׳ורי.' },
      },
      {
        say: { en: 'Try it with a melody: a phrase that ends 2 to 1 in C, D to C, mirrors to F to G. Mirrored lines often land on the 5th where the original landed on the root.', he: 'נסו את זה עם מנגינה: משפט שנגמר 2 ל־1 ב־C, רה לדו, משתקף לפה לסול. קווים משוקפים נוחתים לעיתים קרובות על הקווינטה במקום שבו המקור נחת על היסוד.' },
        play: [notes([64, 62, 60], 0.45), rest(0.3), notes([63, 65, 67], 0.45)],
      },
      {
        say: { en: 'Recap: mirror around the 3rds of I. V becomes iv, the colours come from the minor side, and the pull home stays.', he: 'לסיכום: משקפים סביב הטרצות של I. ‏V נעשה iv, הצבעים באים מהצד המינורי, והמשיכה הביתה נשארת.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:function-ear': 'function-ear',
  'topic:modal-cadence': 'modal-cadence',
  'topic:borrowed-ext': 'borrowed-ext',
  'topic:jazz-dictation': 'jazz-dictation',
  'topic:planing': 'planing',
  'topic:form-ear': 'form-ear',
  'topic:negative-harmony': 'negative-harmony',
  // The keys levels that play them (k-reharm 9 borrowed comping, 10 planing).
  'tech:k-reharm-9': 'borrowed-ext',
  'tech:k-reharm-10': 'planing',
};

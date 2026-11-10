// Quick lessons for the advanced jazz ear and prog rhythm (EAR_THEORY_AUDIT): modes by ear, odd groupings and metric
// modulation, what jazz changes do, reharmonisation, transcribing phrases, jazz blues and rhythm changes.
// Every fact matches its generator (src/engine/topicsJazzEar.ts). See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { groupStim, jazzProgStim, modeStim, phraseOver } from '../../engine/topicsJazzEar';

const rest = (d = 0.5): Stimulus => ({ kind: 'rest', duration: d });
const C = 0;

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ modes by ear
  {
    id: 'modes-ear',
    area: 'ear',
    emoji: '🎼',
    title: { en: 'Modes by ear', he: 'מודוסים בשמיעה' },
    takeaway: {
      en: 'Over a drone, every mode has one colour note: Lydian’s ♯4, Mixolydian’s ♭7, Dorian’s 6, Phrygian’s ♭2. Listen for it against the home note.',
      he: 'מעל צליל ממושך לכל מודוס יש צליל צבע אחד: ♯4 בלידי, ♭7 במיקסולידי, 6 בדורי, ♭2 בפריגי. הקשיבו לו מול צליל הבית.',
    },
    steps: [
      {
        say: { en: 'A mode is a scale heard from its own home note. The drone holds home, so every step is heard against it.', he: 'מודוס הוא סולם שנשמע מצליל הבית שלו. הצליל הממושך מחזיק את הבית, וכל צליל נשמע מולו.' },
        play: [modeStim(60, 'ionian')],
        show: { text: { en: 'Ionian = major', he: 'יוני = מז׳ור' } },
      },
      {
        say: { en: 'Three bright modes. Lydian raises the 4th — it floats. Mixolydian lowers the 7th — bluesy, rock.', he: 'שלושה מודוסים בהירים. הלידי מגביה את ה־4 — הוא מרחף. המיקסולידי מנמיך את ה־7 — בלוזי, רוק.' },
        play: [modeStim(60, 'lydian'), rest(), modeStim(60, 'mixolydian')],
        show: { text: { en: 'Lydian ♯4 · Mixolydian ♭7', he: 'לידי ♯4 · מיקסולידי ♭7' } },
      },
      {
        say: { en: 'Three dark ones. Aeolian is natural minor. Dorian raises its 6th — minor but warm. Phrygian lowers the 2nd — Spanish, tense.', he: 'שלושה כהים. האיאולי הוא מינור טבעי. הדורי מגביה את ה־6 — מינור, אבל חם. הפריגי מנמיך את ה־2 — ספרדי ומתוח.' },
        play: [modeStim(60, 'dorian'), rest(), modeStim(60, 'phrygian')],
        show: { text: { en: 'Dorian 6 · Phrygian ♭2', he: 'דורי 6 · פריגי ♭2' } },
      },
      {
        say: { en: 'Compare Dorian with plain minor, Aeolian. Only the 6th differs: Dorian’s is a half step higher, and the whole scale brightens.', he: 'השוו את הדורי למינור הרגיל, האיאולי. רק ה־6 שונה: בדורי הוא גבוה בחצי טון, וכל הסולם מתבהר.' },
        play: [modeStim(62, 'aeolian'), rest(), modeStim(62, 'dorian')],
        show: { text: { en: 'Aeolian ♭6 · Dorian 6', he: 'איאולי ♭6 · דורי 6' } },
      },
      {
        say: { en: 'First ask bright or dark — the 3rd tells you. Then find the one note that differs from plain major or minor. Your turn.', he: 'קודם שואלים בהיר או כהה — הטרצה אומרת. אחר כך מחפשים את הצליל האחד ששונה ממז׳ור או ממינור רגיל. תורכם.' },
        show: { text: { en: '3rd → colour note → name', he: 'טרצה ← צליל צבע ← שם' } },
      },
    ],
    more: [
      {
        say: { en: 'All seven modes share the white keys; only the home note moves. C to C is Ionian, D to D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian, B Locrian.', he: 'שבעת המודוסים חולקים את הקלידים הלבנים; רק צליל הבית זז. מדו לדו יוני, מרה לרה דורי, מי פריגי, פה לידי, סול מיקסולידי, לה איאולי, סי לוקרי.' },
        show: { text: { en: 'C D E F G A B', he: 'דו רה מי פה סול לה סי' } },
      },
      {
        say: { en: 'Locrian is the darkest: ♭2 and a ♭5, so even its home chord is diminished. It is rare as a key, common over a half-diminished chord.', he: 'הלוקרי הוא הכהה ביותר: ♭2 ו־♭5, כך שאפילו אקורד הבית שלו מוקטן. הוא נדיר כסולם, נפוץ מעל אקורד חצי מוקטן.' },
        play: [modeStim(59, 'locrian')],
        show: { text: { en: 'Locrian ♭2 ♭5', he: 'לוקרי ♭2 ♭5' } },
      },
      {
        say: { en: 'In a tune the colour note is the one the melody leans on. Dorian tunes keep touching the bright 6th; Mixolydian riffs land on the ♭7.', he: 'במנגינה צליל הצבע הוא זה שהמנגינה נשענת עליו. מנגינות דוריות נוגעות שוב ושוב ב־6 הבהיר; ריפים מיקסולידיים נוחתים על ה־♭7.' },
      },
      {
        say: { en: 'Jazz adds the modes of melodic minor: Lydian dominant (♯4 and ♭7) over a 7♯11 chord, and Altered (every tension lowered or raised) over 7alt.', he: 'הג׳אז מוסיף את המודוסים של המינור המלודי: לידי דומיננטי (♯4 ו־♭7) מעל 7♯11, ואלטרד (כל המתחים מונמכים או מוגבהים) מעל 7alt.' },
        play: [modeStim(60, 'lyddom'), rest(), modeStim(60, 'altered')],
        show: { text: { en: 'Lydian dominant · Altered', he: 'לידי דומיננטי · אלטרד' } },
      },
      {
        say: { en: 'Phrygian dominant, from harmonic minor, has a major 3rd with the ♭2 — the sound of flamenco and of much Middle-Eastern music.', he: 'הפריגי הדומיננטי, מהמינור ההרמוני, משלב טרצה גדולה עם ♭2 — הצליל של הפלמנקו ושל הרבה מוזיקה מזרחית.' },
        play: [modeStim(60, 'phrdom')],
      },
      {
        say: { en: 'The common mistake is naming the scale by its first note heard. Always name it from the drone — that is home.', he: 'הטעות הנפוצה היא לתת שם לפי הצליל הראשון ששומעים. תמיד נותנים שם לפי הצליל הממושך — הוא הבית.' },
      },
    ],
  },

  // ------------------------------------------------------------------ prog / odd-time grooves
  {
    id: 'prog-meter',
    area: 'rhythm',
    emoji: '🥁',
    title: { en: 'Odd-time grooves', he: 'גרוב במשקלים מורכבים' },
    takeaway: {
      en: 'Odd meters are groups of 2 and 3. Count the groups the snare marks, not every eighth. Polymeter loops a riff of another length over the beat.',
      he: 'משקלים מורכבים הם קבוצות של 2 ושל 3. סופרים את הקבוצות שהסנר מסמן, לא כל שמינית. פולימטר הוא ריף באורך אחר שחוזר מעל הפעמה.',
    },
    steps: [
      {
        say: { en: 'Five beats can go long–short or short–long. 3 + 2 leans forward; 2 + 3 waits, then rolls.', he: 'חמש פעמות יכולות להיות ארוך–קצר או קצר–ארוך. 3 + 2 נוטה קדימה; 2 + 3 מחכה, ואז מתגלגל.' },
        play: [groupStim([3, 2], 0.4), rest(), groupStim([2, 3], 0.4)],
        show: { text: { en: '3+2 · 2+3', he: '3+2 · 2+3' } },
      },
      {
        say: { en: 'Nine eighths: three even groups feel like a slow waltz; 2+2+2+3 limps at the end — the Balkan aksak.', he: 'תשע שמיניות: שלוש קבוצות שוות מרגישות כמו ואלס איטי; 2+2+2+3 צולע בסוף — האקסאק הבלקני.' },
        play: [groupStim([3, 3, 3]), rest(), groupStim([2, 2, 2, 3])],
        show: { text: { en: '3+3+3 · 2+2+2+3', he: '3+3+3 · 2+2+2+3' } },
      },
      {
        say: { en: 'The kick marks the bar, the snare marks each new group. Follow the snares and count their gaps.', he: 'הבס־דראם מסמן את התיבה, הסנר מסמן כל קבוצה חדשה. עקבו אחרי הסנרים וספרו את המרווחים ביניהם.' },
        play: [groupStim([3, 3, 3, 2])],
        show: { text: { en: '11/8 = 3+3+3+2', he: '11/8 = 3+3+3+2' } },
      },
      {
        say: { en: 'The same eleven eighths can also go 4 + 4 + 3: two long groups and a short one. Same length, a different walk.', he: 'אותן אחת־עשרה שמיניות יכולות להיות גם 4 + 4 + 3: שתי קבוצות ארוכות ואחת קצרה. אותו אורך, הליכה אחרת.' },
        play: [groupStim([4, 4, 3])],
        show: { text: { en: '11/8 = 4+4+3', he: '11/8 = 4+4+3' } },
      },
      {
        say: { en: 'Your turn: hear the groups, then name them. Tap along with the snare if it helps, and say the group lengths out loud.', he: 'תורכם: שמעו את הקבוצות, ואז תנו להן שם. הקישו יחד עם הסנר אם זה עוזר, ואמרו בקול את אורכי הקבוצות.' },
      },
    ],
    more: [
      {
        say: { en: 'Odd meters live in rock and prog — five, seven and eleven are common — and in Balkan and Turkish dance music, where 9/8 and 11/8 are everyday meters.', he: 'משקלים מורכבים חיים ברוק ובפרוג — חמש, שבע ואחת־עשרה נפוצים — ובמוזיקת ריקודים בלקנית וטורקית, שבה 9/8 ו־11/8 הם משקלים יומיומיים.' },
        play: [groupStim([2, 2, 3, 2, 2])],
        show: { text: { en: '2+2+3+2+2', he: '2+2+3+2+2' } },
      },
      {
        say: { en: 'Polymeter: the drums stay in 4 while a riff of 3, 5 or 7 beats loops over them. The riff’s first note drifts across the bar until both line up again.', he: 'פולימטר: התופים נשארים ב־4 בזמן שריף של 3, 5 או 7 פעמות חוזר מעליהם. הצליל הראשון של הריף נודד לאורך התיבה עד ששניהם נפגשים שוב.' },
        play: [groupStim([3, 3, 3, 3], 0.3, 1)],
        show: { text: { en: '3 over 4 · 5 over 4', he: '3 על 4 · 5 על 4' } },
      },
      {
        say: { en: 'To find the riff length, count from one loud riff note to the next — ignore the drums for a moment.', he: 'כדי למצוא את אורך הריף, ספרו מצליל חזק אחד של הריף לבא — התעלמו לרגע מהתופים.' },
      },
      {
        say: { en: 'Metric modulation: a subdivision of the old beat becomes the new beat. If the triplets become the beat, the tempo grows by 3/2.', he: 'מודולציה מטרית: חלוקה של הפעמה הישנה הופכת לפעמה החדשה. אם הטריולות הופכות לפעמה, הטמפו גדל פי 3/2.' },
        show: { text: { en: 'triplet = new beat → ×3/2', he: 'טריולה = פעמה חדשה ← ×3/2' } },
      },
      {
        say: { en: 'Dotted quarters becoming the beat slow it to 2/3; dotted eighths becoming the beat speed it up by 4/3. Listen for the hat: it plays the pivot before the change.', he: 'רבעים מנוקדים שהופכים לפעמה מאטים ל־2/3; שמיניות מנוקדות שהופכות לפעמה מאיצות פי 4/3. הקשיבו להיי־האט: הוא מנגן את הציר לפני השינוי.' },
      },
      {
        say: { en: 'The common mistake is counting every eighth and losing the place. Feel the long group as one lazy step.', he: 'הטעות הנפוצה היא לספור כל שמינית ולאבד את המקום. הרגישו את הקבוצה הארוכה כצעד עצל אחד.' },
      },
    ],
  },

  // ------------------------------------------------------------------ what the changes do
  {
    id: 'jazz-changes',
    area: 'jazz',
    emoji: '🎷',
    title: { en: 'What the changes do', he: 'מה המהלך עושה' },
    takeaway: {
      en: 'Most jazz changes are ii–Vs pointing at a home. The tritone sub slides into it from a half step above; the backdoor comes from ♭VII7; borrowed chords come from the minor key.',
      he: 'רוב המהלכים בג׳אז הם ii–V שמכוונים אל בית. תחליף הטריטון מחליק אליו מחצי טון מעל; הדלת האחורית מגיעה מ־♭VII7; אקורדים שאולים מגיעים מהמינור.',
    },
    steps: [
      {
        say: { en: 'Major ii–V–I: minor 7, dominant, major 7. The bass climbs by fourths into home.', he: 'ii–V–I מז׳ורי: מינור 7, דומיננט, מז׳ור 7. הבס עולה בקוורטות אל הבית.' },
        play: [jazzProgStim(C, [[2, 'm9', 2], [7, 'thirteen', 2], [0, 'maj9', 4]])],
        show: { text: { en: 'Dm9 G13 Cmaj9', he: 'Dm9 G13 Cmaj9' } },
      },
      {
        say: { en: 'Minor ii–V–i: half-diminished, a dark ♭9 dominant, minor home.', he: 'ii–V–i מינורי: חצי מוקטן, דומיננט כהה עם ♭9, בית מינורי.' },
        play: [jazzProgStim(C, [[2, 'm7b5', 2], [7, 'b9', 2], [0, 'm69', 4]])],
        show: { text: { en: 'Dm7♭5 G7♭9 Cm6/9', he: 'Dm7♭5 G7♭9 Cm6/9' } },
      },
      {
        say: { en: 'Tritone sub: the V is replaced by the dominant a tritone away, so the bass falls by half steps: D, D♭, C.', he: 'תחליף טריטון: ה־V מוחלף בדומיננט שבמרחק טריטון, והבס יורד בחצאי טון: רה, רה במול, דו.' },
        play: [jazzProgStim(C, [[2, 'm9', 2], [1, 's11', 2], [0, 'maj9', 4]])],
        show: { text: { en: 'Dm9 D♭7♯11 Cmaj9', he: 'Dm9 D♭7♯11 Cmaj9' } },
      },
      {
        say: { en: 'Backdoor: iv minor to ♭VII7, then home — the bass steps up a whole tone into I.', he: 'דלת אחורית: iv מינור אל ♭VII7, ואז הביתה — הבס עולה טון שלם אל ה־I.' },
        play: [jazzProgStim(C, [[5, 'm9', 2], [10, 'nine', 2], [0, 'maj9', 4]])],
        show: { text: { en: 'Fm9 B♭9 Cmaj9', he: 'Fm9 B♭9 Cmaj9' } },
      },
      {
        say: { en: 'Listen to the bass first: fourths up means a ii–V, a half step down means a tritone sub, a whole step up from below means the backdoor. Then check the colours: a minor home sounds darker and the dominant before it has a ♭9.', he: 'הקשיבו קודם לבס: קוורטות למעלה זה ii–V, חצי טון למטה זה תחליף טריטון, טון שלם למעלה מלמטה זו הדלת האחורית. אחר כך בדקו את הצבעים: בית מינורי נשמע כהה יותר, והדומיננט שלפניו עם ♭9.' },
      },
    ],
    more: [
      {
        say: { en: 'Standards chain ii–Vs into new keys. After a ii–V–I, the next ii–V can lead to IV, to the relative minor, a whole step down, or up a minor third.', he: 'סטנדרטים משרשרים ii–V אל סולמות חדשים. אחרי ii–V–I, ה־ii–V הבא יכול להוביל ל־IV, למינור המקביל, טון שלם למטה או טרצה קטנה למעלה.' },
        play: [jazzProgStim(C, [[2, 'm9', 2], [7, 'nine', 2], [0, 'maj9', 4], [0, 'm9', 2], [5, 'nine', 2], [10, 'maj9', 4]])],
        show: { text: { en: 'C → B♭ (a whole step down)', he: 'C ← B♭ (טון שלם למטה)' } },
      },
      {
        say: { en: 'To hear where it goes, keep the first home in your ear and compare the new one with it.', he: 'כדי לשמוע לאן זה הולך, החזיקו את הבית הראשון באוזן והשוו אליו את הבית החדש.' },
      },
      {
        say: { en: 'Modal interchange borrows from the parallel minor: iv m6, ♭VImaj7, ♭VII7, ♭IIImaj7, iiø7. Each darkens the major key for a moment.', he: 'שאילה מודלית לוקחת מהמינור המקביל: iv m6, ‏♭VImaj7, ‏♭VII7, ‏♭IIImaj7, ‏iiø7. כל אחד מכהה את המז׳ור לרגע.' },
        play: [jazzProgStim(C, [[0, 'maj9', 4], [5, 'm6', 4], [0, 'maj9', 4]])],
        show: { text: { en: 'Cmaj9 Fm6 Cmaj9', he: 'Cmaj9 Fm6 Cmaj9' } },
      },
      {
        say: { en: 'Coltrane changes jump between three keys a major third apart, each reached by its own dominant.', he: 'שינויי קולטריין קופצים בין שלושה סולמות במרחק טרצה גדולה, וכל אחד מגיע דרך הדומיננט שלו.' },
        play: [jazzProgStim(C, [[0, 'maj7', 2], [3, 'dom7', 2], [8, 'maj7', 2], [11, 'dom7', 2], [4, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], 168)],
        show: { text: { en: 'C E♭7 A♭ B7 E G7 C', he: 'C E♭7 A♭ B7 E G7 C' } },
      },
      {
        say: { en: 'Compare dominants around the cycle — roots falling by fifths — with dominants falling by half steps, the tritone-sub chain.', he: 'השוו דומיננטים במעגל — שורשים שיורדים בקווינטות — לדומיננטים שיורדים בחצאי טון, שרשרת של תחליפי טריטון.' },
      },
      {
        say: { en: 'The common mistake is naming every dominant a V. Ask where it resolves: a dominant that falls a fifth is a V of the next chord, one that falls a half step is a tritone sub.', he: 'הטעות הנפוצה היא לקרוא לכל דומיננט V. שאלו לאן הוא נפתר: דומיננט שיורד קווינטה הוא V של האקורד הבא, ודומיננט שיורד חצי טון הוא תחליף טריטון.' },
      },
      {
        say: { en: 'To keep: bass first, then the chord colours, then name what the changes do — ii–V, substitute, borrowed chord, or a jump to a new key.', he: 'לזכור: קודם הבס, אחר כך צבעי האקורדים, ואז שם למה שהמהלך עושה — ii–V, תחליף, אקורד שאול, או קפיצה לסולם חדש.' },
      },
    ],
  },

  // ------------------------------------------------------------------ reharmonization
  {
    id: 'reharm-spot',
    area: 'jazz',
    emoji: '🎹',
    title: { en: 'Spot the reharmonization', he: 'לזהות רה־הרמוניזציה' },
    takeaway: {
      en: 'Reharmonizing keeps the tune and changes chords under it. Find the bar that sounds different, then ask how: a new dominant, a borrowed chord, a passing diminished.',
      he: 'רה־הרמוניזציה שומרת על המנגינה ומחליפה את האקורדים מתחתיה. מצאו את התיבה שנשמעת אחרת, ואז שאלו איך: דומיננט חדש, אקורד שאול, דימיניש מעבר.',
    },
    steps: [
      {
        say: { en: 'Reharmonizing means keeping the melody and putting new chords under it. Jazz players do it to refresh a standard. Here is the plain progression: I, vi, ii, V, I.', he: 'רה־הרמוניזציה פירושה לשמור על המנגינה ולשים מתחתיה אקורדים חדשים. נגני ג׳אז עושים את זה כדי לרענן סטנדרט. הנה המהלך הפשוט: I, ‏vi, ‏ii, ‏V, ‏I.' },
        play: [jazzProgStim(C, [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 4]], 152)],
        show: { text: { en: 'Cmaj7 Am7 Dm7 G7 Cmaj7', he: 'Cmaj7 Am7 Dm7 G7 Cmaj7' } },
      },
      {
        say: { en: 'Secondary dominant: Am7 becomes A7, a dominant of its own that pulls hard into Dm7, the next chord.', he: 'דומיננטה משנית: Am7 הופך ל־A7, דומיננט משלו שמושך חזק אל Dm7, האקורד הבא.' },
        play: [jazzProgStim(C, [[0, 'maj7', 4], [9, 'dom7', 4], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 4]], 152)],
      },
      {
        say: { en: 'Diminished passing chord: C♯°7 fills the gap between C and Dm7 — the bass rises by half steps.', he: 'אקורד מעבר מוקטן: C♯°7 ממלא את הרווח בין C ל־Dm7 — הבס עולה בחצאי טון.' },
        play: [jazzProgStim(C, [[0, 'maj7', 4], [1, 'dim7', 4], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 4]], 152)],
      },
      {
        say: { en: 'Tritone sub: G7 becomes D♭7, and the bass slides down by half steps, D, D♭, C, into home.', he: 'תחליף טריטון: G7 הופך ל־D♭7, והבס מחליק למטה בחצאי טון, רה, רה במול, דו, אל הבית.' },
        play: [jazzProgStim(C, [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [1, 'dom7', 4], [0, 'maj7', 4]], 152)],
      },
      {
        say: { en: 'Your turn: the original, then a new version. Follow the bass to find what changed, then name the trick.', he: 'תורכם: המקור, ואז גרסה חדשה. עקבו אחרי הבס כדי למצוא מה השתנה, ואז תנו שם לטריק.' },
      },
    ],
    more: [
      {
        say: { en: 'Tritone sub: G7 becomes D♭7. The two share their 3rd and 7th, so the colour barely changes but the bass slides down by half steps.', he: 'תחליף טריטון: G7 הופך ל־D♭7. לשניהם אותה טרצה וספטימה, ולכן הצבע כמעט לא משתנה, אבל הבס מחליק למטה בחצאי טון.' },
        play: [jazzProgStim(C, [[2, 'm7', 4], [1, 'dom7', 4], [0, 'maj7', 4]], 152)],
      },
      {
        say: { en: 'Backdoor: Dm7 G7 becomes Fm7 B♭7 — the minor iv and ♭VII7 lead home from below.', he: 'דלת אחורית: Dm7 G7 הופכים ל־Fm7 B♭7 — ה־iv המינורי וה־♭VII7 מובילים הביתה מלמטה.' },
        play: [jazzProgStim(C, [[5, 'm7', 4], [10, 'dom7', 4], [0, 'maj7', 4]], 152)],
      },
      {
        say: { en: 'Coltrane substitution: one ii–V–I becomes a tour of three keys: E♭7 to A♭, B7 to E, G7 home to C.', he: 'תחליף קולטריין: ii–V–I אחד הופך לסיור בשלושה סולמות — E♭7 אל A♭, ‏B7 אל E, ‏G7 הביתה אל C.' },
        play: [jazzProgStim(C, [[2, 'm7', 2], [3, 'dom7', 2], [8, 'maj7', 2], [11, 'dom7', 2], [4, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], 152)],
      },
      {
        say: { en: 'The melody stays the same in every version — that is what makes it a reharmonization, not a new tune. Each new chord must still fit the melody note above it.', he: 'המנגינה נשארת אותה מנגינה בכל הגרסאות — זה מה שהופך את זה לרה־הרמוניזציה ולא לשיר חדש. כל אקורד חדש עדיין צריך להתאים לצליל המנגינה שמעליו.' },
      },
      {
        say: { en: 'Why they work: a secondary dominant aims at the next chord; a tritone sub shares the dominant’s tritone; a diminished chord connects two chords a whole step apart by a half step in the bass.', he: 'למה זה עובד: דומיננטה משנית מכוונת אל האקורד הבא; תחליף טריטון חולק עם הדומיננט את הטריטון שלו; אקורד מוקטן מחבר שני אקורדים במרחק טון בחצי טון בבס.' },
      },
      {
        say: { en: 'The common mistake is listening to the top of the piano. The bass tells the story; the voicings only colour it.', he: 'הטעות הנפוצה היא להקשיב לחלק העליון של הפסנתר. הבס מספר את הסיפור; הוויסינגים רק צובעים אותו.' },
      },
      {
        say: { en: 'To keep: same tune, new chords. Find where the bass moves differently, then name the trick.', he: 'לזכור: אותה מנגינה, אקורדים חדשים. מצאו איפה הבס זז אחרת, ואז תנו שם לטריק.' },
      },
    ],
  },

  // ------------------------------------------------------------------ transcribing phrases
  {
    id: 'jazz-phrase',
    area: 'jazz',
    emoji: '✍️',
    title: { en: 'Transcribe the phrase', he: 'לתמלל פראזה' },
    takeaway: {
      en: 'Hear a phrase as degrees of its chord: find the first note against the bass, then follow steps and leaps. Bebop lines add a half step so chord tones fall on the beat.',
      he: 'שומעים פראזה כדרגות של האקורד: מוצאים את הצליל הראשון מול הבס, ואז עוקבים אחרי צעדים וקפיצות. קווי ביבופ מוסיפים חצי טון כדי שצלילי האקורד ייפלו על הפעמה.',
    },
    steps: [
      {
        say: { en: 'To transcribe, name each note as a degree of the chord under it. Over C7, an arpeggio from the root: 1, 3, 5, ♭7.', he: 'כדי לתמלל, נותנים לכל צליל שם של דרגה של האקורד שמתחתיו. מעל C7, ארפג׳ו מהשורש: 1, ‏3, ‏5, ‏♭7.' },
        play: [phraseOver(0, 'dom7', [0, 4, 7, 10])],
        show: { text: { en: '1 3 5 ♭7', he: '1 3 5 ♭7' } },
      },
      {
        say: { en: 'An enclosure circles its target: a note above, a half step below, then the target — here the 3rd.', he: 'הקפה מקיפה את המטרה: צליל מעל, חצי טון מתחת, ואז המטרה — כאן הטרצה.' },
        play: [phraseOver(0, 'dom7', [0, 2, 5, 3, 4])],
        show: { text: { en: '1 2 4 ♯2 3', he: '1 2 4 ♯2 3' } },
      },
      {
        say: { en: 'A bebop line falls from the root with an extra half step between 1 and ♭7, so the chord tones land on the beats.', he: 'קו ביבופ יורד מהשורש עם חצי טון נוסף בין 1 ל־♭7, כך שצלילי האקורד נוחתים על הפעמות.' },
        play: [phraseOver(0, 'dom7', [12, 11, 10, 9, 7, 5, 4, 2])],
        show: { text: { en: '1 7 ♭7 6 5 4 3 2', he: '1 7 ♭7 6 5 4 3 2' } },
      },
      {
        say: { en: 'A line over a dominant mixes steps of the scale with chord tones. This one starts on the 5th, leaps to the ♭7 and walks down.', he: 'קו מעל דומיננט משלב צעדים בסולם עם צלילי אקורד. הקו הזה מתחיל מה־5, קופץ ל־♭7 והולך למטה.' },
        play: [phraseOver(0, 'dom7', [7, 10, 9, 7, 5])],
        show: { text: { en: '5 ♭7 6 5 4', he: '5 ♭7 6 5 4' } },
      },
      {
        say: { en: 'Your turn: sing the phrase back, then pick its degrees.', he: 'תורכם: שירו את הפראזה בחזרה, ואז בחרו את הדרגות שלה.' },
      },
    ],
    more: [
      {
        say: { en: 'Transcribing is how jazz is learned: players copy phrases from records by ear, sing them, then play them in every key. Short phrases first — four to eight notes.', he: 'תמלול הוא הדרך שבה לומדים ג׳אז: נגנים מעתיקים פראזות מהקלטות בשמיעה, שרים אותן, ואז מנגנים אותן בכל הסולמות. קודם פראזות קצרות — ארבעה עד שמונה צלילים.' },
      },
      {
        say: { en: 'Start every transcription from the bass: hum it, then measure the first melody note against it. Is it the root, the 3rd, the 5th, the 7th — or a tension?', he: 'כל תמלול מתחיל מהבס: זמזמו אותו, ואז מדדו מולו את הצליל הראשון של המנגינה. האם זה השורש, הטרצה, החמישית, הספטימה — או מתח?' },
        play: [phraseOver(5, 'm7', [3, 7, 10, 14])],
      },
      {
        say: { en: 'Then follow the shape: steps are scale notes, leaps are usually chord tones. A half step that does not belong to the scale is a chromatic approach to the next note.', he: 'אחר כך עוקבים אחרי הצורה: צעדים הם צלילי סולם, קפיצות הן לרוב צלילי אקורד. חצי טון שלא שייך לסולם הוא גישה כרומטית לצליל הבא.' },
        play: [phraseOver(7, 'dom7', [7, 10, 9, 7, 5])],
      },
      {
        say: { en: 'Without the passing half step the same descent puts the ♭7 off the beat — compare the two.', he: 'בלי חצי הטון המעביר אותה ירידה מעבירה את ה־♭7 אל מחוץ לפעמה — השוו בין השתיים.' },
        play: [phraseOver(0, 'dom7', [12, 10, 9, 7, 5, 4, 2, 0]), rest(), phraseOver(0, 'dom7', [12, 11, 10, 9, 7, 5, 4, 2])],
      },
      {
        say: { en: 'The common mistake is writing what the hand would play instead of what the ear hears. Sing it first, slowly, and check every note against the bass.', he: 'הטעות הנפוצה היא לכתוב מה שהיד הייתה מנגנת במקום מה שהאוזן שומעת. שירו קודם, לאט, ובדקו כל צליל מול הבס.' },
      },
      {
        say: { en: 'To keep: bass, first note, shape, degrees — then check by singing along with the recording.', he: 'לזכור: בס, צליל ראשון, צורה, דרגות — ואז בודקים בשירה יחד עם ההקלטה.' },
      },
    ],
  },

  // ------------------------------------------------------------------ jazz forms
  {
    id: 'jazz-form',
    area: 'jazz',
    emoji: '🧩',
    title: { en: 'Blues and rhythm changes', he: 'בלוז וריתם צ׳יינג׳ס' },
    takeaway: {
      en: 'The jazz blues adds ii–Vs to the twelve bars; the Bird blues fills every bar with them. Rhythm changes has A sections of fast turnarounds and a bridge of dominants around the cycle.',
      he: 'בלוז הג׳אז מוסיף ii–V לשתים־עשרה התיבות; הבלוז של בירד ממלא בהם כל תיבה. בריתם צ׳יינג׳ס חלקי A בנויים מטרנאראונדים מהירים, והגשר מדומיננטים במעגל.',
    },
    steps: [
      {
        say: { en: 'A major blues: three dominant chords, I, IV and V, over twelve bars. Even the home chord is a dominant 7 — that is the blues sound.', he: 'בלוז מז׳ורי: שלושה אקורדים דומיננטיים, I, ‏IV ו־V, לאורך שתים־עשרה תיבות. אפילו אקורד הבית הוא דומיננט 7 — זה הצליל של הבלוז.' },
        play: [jazzProgStim(C, [[0, 'dom7', 4], [5, 'dom7', 4], [0, 'dom7', 4], [0, 'dom7', 4]], 184)],
        show: { text: { en: 'C7 F7 C7 C7 …', he: 'C7 F7 C7 C7 …' } },
      },
      {
        say: { en: 'A minor blues uses minor 7 chords on I and IV, and a ♭VI7 before the V in bar 9.', he: 'בלוז מינורי משתמש באקורדי מינור 7 על I ועל IV, וב־♭VI7 לפני ה־V בתיבה 9.' },
        play: [jazzProgStim(C, [[5, 'm7', 4], [0, 'm7', 4], [8, 'dom7', 4], [7, 'b9', 4], [0, 'm7', 4]], 184)],
      },
      {
        say: { en: 'Rhythm changes: the A section turns around every two beats; the bridge holds each dominant for two bars — III7, VI7, II7, V7.', he: 'ריתם צ׳יינג׳ס: חלק A מסתובב כל שתי פעמות; הגשר מחזיק כל דומיננט שתי תיבות — III7, ‏VI7, ‏II7, ‏V7.' },
        play: [jazzProgStim(C, [[4, 'dom7', 8], [9, 'dom7', 8]], 200)],
      },
      {
        say: { en: 'The Bird blues, after Charlie Parker, starts on a major 7 and walks down by ii–Vs.', he: 'הבלוז של בירד, על שם צ׳רלי פארקר, מתחיל במז׳ור 7 ויורד ב־ii–V.' },
        play: [jazzProgStim(C, [[0, 'maj7', 4], [11, 'm7b5', 2], [4, 'dom7', 2], [9, 'm7', 2], [2, 'dom7', 2]], 184)],
      },
      {
        say: { en: 'Listen to how fast the chords move and whether they are minor or dominant. Your turn.', he: 'הקשיבו כמה מהר האקורדים זזים, והאם הם מינוריים או דומיננטיים. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'The blues is the most played form in jazz: twelve bars, three phrases of four. Musicians call each time through the form a chorus.', he: 'הבלוז הוא הצורה הכי מנוגנת בג׳אז: שתים־עשרה תיבות, שלושה משפטים של ארבע. כל סיבוב בצורה נקרא כורוס.' },
        play: [jazzProgStim(C, [[0, 'dom7', 4], [5, 'dom7', 4], [0, 'dom7', 8]], 184)],
      },
      {
        say: { en: 'The jazz blues keeps the twelve bars but adds motion: bar 4 has a ii–V into IV, bar 6 a diminished passing chord, bars 8 to 10 a VI7–ii–V back home.', he: 'בלוז הג׳אז שומר על שתים־עשרה התיבות אבל מוסיף תנועה: בתיבה 4 ii–V אל IV, בתיבה 6 אקורד מעבר מוקטן, בתיבות 8 עד 10 ‏VI7–ii–V חזרה הביתה.' },
      },
      {
        say: { en: 'The Bird blues starts on Imaj7 and walks down by ii–Vs, a step at a time, until it reaches the IV chord in bar 5.', he: 'הבלוז של בירד מתחיל ב־Imaj7 ויורד ב־ii–V, צעד אחרי צעד, עד שהוא מגיע ל־IV בתיבה 5.' },
        play: [jazzProgStim(C, [[0, 'maj7', 4], [11, 'm7b5', 2], [4, 'dom7', 2], [9, 'm7', 2], [2, 'dom7', 2], [7, 'm7', 2], [0, 'dom7', 2], [5, 'dom7', 4]], 184)],
      },
      {
        say: { en: 'Rhythm changes is 32 bars, AABA, named after a famous Gershwin song. Its A sections are I–vi–ii–V again and again; its bridge is a cycle of dominants, each held for two bars.', he: 'ריתם צ׳יינג׳ס הוא 32 תיבות, AABA, על שם שיר מפורסם של גרשווין. חלקי ה־A הם I–vi–ii–V שוב ושוב; הגשר הוא מעגל של דומיננטים, כל אחד שתי תיבות.' },
      },
      {
        say: { en: 'The common mistake is losing count of the bars. Feel each four-bar phrase as one breath, and listen for the IV chord in bar 5. To keep: count bars, follow the bass, and notice when the chord colours change.', he: 'הטעות הנפוצה היא לאבד את ספירת התיבות. הרגישו כל משפט של ארבע תיבות כנשימה אחת, והקשיבו לאקורד IV בתיבה 5. לזכור: ספרו תיבות, עקבו אחרי הבס, ושימו לב מתי צבעי האקורדים משתנים.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:modes-ear': 'modes-ear',
  'topic:prog-meter': 'prog-meter',
  'topic:jazz-changes': 'jazz-changes',
  'topic:reharm-spot': 'reharm-spot',
  'topic:guide-line': 'guide-tones',
  'topic:jazz-phrase': 'jazz-phrase',
  'topic:jazz-form': 'jazz-form',
};

// Symmetry unit (owner 2026-11-19): the three lessons of the unit after the symmetric scales — dividing the octave,
// P / L / R (neo-Riemannian moves) and interval vectors. Every fact matches src/engine/symmetry.ts and its tests
// (tests/symmetry.test.ts): the transposition counts, the P / L / R moves, the hexatonic and octatonic cycles, the vectors.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.1): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// Triads voiced close, voice-led (the moving note is the one you hear move).
const C = [48, 60, 64, 67];
const Cm = [48, 60, 63, 67];
const Am = [45, 60, 64, 69];
const Em = [40, 59, 64, 67];
const Ab = [44, 60, 63, 68];
const Abm = [44, 59, 63, 68];
const E = [40, 59, 64, 68];
const Eb = [39, 58, 63, 67];
const Ebm = [39, 58, 63, 66];
const Fs = [42, 58, 61, 66];
const Fsm = [42, 57, 61, 66];
const A = [45, 57, 61, 64];
const Am2 = [45, 57, 60, 64];

export const LESSONS: MiniLesson[] = [
  {
    id: 'octave-division',
    area: 'theory',
    emoji: '12÷',
    title: { en: 'Dividing the octave', he: 'חלוקת האוקטבה' },
    takeaway: {
      en: 'Twelve semitones in equal parts: 2 × 6 = tritone, 3 × 4 = augmented triad, 4 × 3 = diminished 7th, 6 × 2 = whole-tone scale. The size of a part is also how many transpositions there are: 6, 4, 3, 2. G7 and D♭7 share a tritone; lowering any note of a dim7 gives one of four dominants.',
      he: 'שנים־עשר חצאי טונים בחלקים שווים: 2 × 6 = טריטון, 3 × 4 = משולש מוגדל, 4 × 3 = ספטאקורד מוקטן, 6 × 2 = סולם טון שלם. גודל החלק הוא גם מספר הטרנספוזיציות: 6, 4, 3, 2. ל־G7 ול־D♭7 טריטון משותף; הנמכה של כל צליל במוקטן נותנת אחד מארבעה דומיננטים.',
    },
    steps: [
      {
        say: { en: 'An octave holds twelve semitones. Split it into equal parts and you get the symmetric chords and scales.', he: 'באוקטבה יש שנים־עשר חצאי טונים. מחלקים אותה לחלקים שווים ומקבלים את האקורדים והסולמות הסימטריים.' },
        play: [notes([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], 0.17)],
        show: { text: { en: '12 = 2×6 = 3×4 = 4×3 = 6×2', he: '12 = 2×6 = 3×4 = 4×3 = 6×2' } },
      },
      {
        say: { en: 'Two parts of six semitones: the tritone. C up to F sharp, and F sharp up to C, are the same size.', he: 'שני חלקים של שישה חצאי טונים: הטריטון. מדו לפה דיאז, ומפה דיאז לדו, זה אותו גודל.' },
        play: [notes([60, 66, 72], 0.55)],
        show: { text: { en: 'C · F♯ · C', he: 'C · F♯ · C' } },
      },
      {
        say: { en: 'Three parts of four: major thirds, the augmented triad. Four parts of three: minor thirds, the diminished seventh.', he: 'שלושה חלקים של ארבעה: טרצות גדולות, המשולש המוגדל. ארבעה חלקים של שלושה: טרצות קטנות, הספטאקורד המוקטן.' },
        play: [notes([60, 64, 68, 72], 0.35), rest(0.3), notes([60, 63, 66, 69, 72], 0.35)],
        show: { text: { en: '3 × M3 · 4 × m3', he: '3 × M3 · 4 × m3' } },
      },
      {
        say: { en: 'Six parts of two: whole tones, the whole-tone scale you already know.', he: 'שישה חלקים של שניים: טונים שלמים, סולם הטון השלם שכבר מכירים.' },
        play: [notes([60, 62, 64, 66, 68, 70, 72], 0.28)],
        show: { text: { en: '6 × 2', he: '6 × 2' } },
      },
      {
        say: { en: 'Symmetric means few transpositions. Move a diminished seventh up a minor third and the same notes come back, so there are only three. Augmented triads: four. Whole-tone scales: two. Tritones: six.', he: 'סימטרי פירושו מעט טרנספוזיציות. מזיזים ספטאקורד מוקטן טרצה קטנה למעלה ואותם צלילים חוזרים, ולכן יש רק שלושה. משולשים מוגדלים: ארבעה. סולמות טון שלם: שניים. טריטונים: שישה.' },
        play: [chord([60, 63, 66, 69], 1), chord([63, 66, 69, 72], 1)],
        show: { text: { en: '°7: 3 · +: 4 · WT: 2 · TT: 6', he: '°7: 3 · +: 4 · WT: 2 · TT: 6' } },
      },
      {
        say: { en: 'In harmony: G7 and D flat 7 share one tritone, B and F. That is the tritone substitution.', he: 'בהרמוניה: ל־G7 ול־D♭7 יש טריטון אחד משותף, סי ופה. זה תחליף הטריטון.' },
        play: [chord([43, 59, 65], 1), chord([37, 59, 65], 1), chord([36, 60, 64], 1.2)],
        show: { text: { en: 'G7 ↔ D♭7: B–F', he: 'G7 ↔ D♭7: B–F' } },
      },
      {
        say: { en: 'And lower any note of a diminished seventh a half step: you get a dominant seventh on the lowered note. B°7 gives G7, B flat 7, D flat 7 and E7.', he: 'ומנמיכים צליל כלשהו של ספטאקורד מוקטן בחצי טון: מקבלים ספטאקורד דומיננטי על הצליל שהונמך. מ־B°7 יוצאים G7, ‏B♭7, ‏D♭7 ו־E7.' },
        play: [chord([59, 62, 65, 68], 1), chord([59, 62, 65, 67], 1.1)],
        show: { text: { en: 'B°7 → G7 · B♭7 · D♭7 · E7', he: 'B°7 → G7 · B♭7 · D♭7 · E7' } },
      },
      {
        say: { en: 'Your turn: how many parts, which interval, how many versions?', he: 'תורכם: כמה חלקים, איזה מרווח, כמה גרסאות?' },
      },
    ],
    more: [
      {
        say: { en: 'Why the size of a part is the number of transpositions: move the chord by one part and it lands on its own notes. A diminished seventh on C, on C sharp and on D are all different; on E flat it is the one on C again.', he: 'למה גודל החלק הוא מספר הטרנספוזיציות: מזיזים את האקורד בחלק אחד והוא נוחת על הצלילים של עצמו. ספטאקורד מוקטן על דו, על דו דיאז ועל רה שונים זה מזה; על מי במול הוא שוב זה של דו.' },
        play: [chord([60, 63, 66, 69], 0.9), chord([61, 64, 67, 70], 0.9), chord([62, 65, 68, 71], 0.9), chord([63, 66, 69, 72], 0.9)],
      },
      {
        say: { en: 'Scales work the same way. There are two whole-tone scales, one on C and one on C sharp, and between them they hold all twelve notes.', he: 'סולמות עובדים אותו דבר. יש שני סולמות טון שלם, אחד על דו ואחד על דו דיאז, וביחד יש בהם את כל שנים־עשר הצלילים.' },
        play: [notes([60, 62, 64, 66, 68, 70, 72], 0.24), rest(0.3), notes([61, 63, 65, 67, 69, 71, 73], 0.24)],
      },
      {
        say: { en: 'The diminished scale alternates half and whole steps and repeats every minor third, so it has three versions too. Each holds two diminished sevenths.', he: 'הסולם המוקטן מחליף חצאי טונים וטונים שלמים וחוזר על עצמו כל טרצה קטנה, ולכן גם לו יש שלוש גרסאות. בכל אחת יש שני ספטאקורדים מוקטנים.' },
        play: [notes([60, 61, 63, 64, 66, 67, 69, 70, 72], 0.24)],
      },
      {
        say: { en: 'The tritone substitution works because the 3rd and 7th stay: the B and F of G7 are the C flat and F of D flat 7. Both lead to C the same way, and their roots are a tritone apart too.', he: 'תחליף הטריטון עובד כי הטרצה והספטימה נשארות: הסי והפה של G7 הם הדו במול והפה של D♭7. שניהם מובילים לדו באותה דרך, וגם השורשים שלהם במרחק טריטון.' },
        play: [chord([43, 59, 65], 0.9), chord([36, 60, 64], 0.9), rest(0.3), chord([37, 59, 65], 0.9), chord([36, 60, 64], 1)],
      },
      {
        say: { en: 'The four dominants of one diminished seventh have roots a minor third apart: G, B flat, D flat, E. The octave in four parts again, one level up.', he: 'לארבעת הדומיננטים של ספטאקורד מוקטן אחד יש שורשים במרחק טרצה קטנה: סול, סי במול, רה במול, מי. שוב האוקטבה בארבעה חלקים, רמה אחת למעלה.' },
      },
      {
        say: { en: 'Recap: twelve divided by the number of parts gives the interval, and the interval in semitones gives the number of versions. Six, four, three, two.', he: 'לסיכום: שתים־עשרה חלקי מספר החלקים נותן את המרווח, והמרווח בחצאי טונים נותן את מספר הגרסאות. שש, ארבע, שלוש, שתיים.' },
      },
    ],
  },
  {
    id: 'neo-riemann',
    area: 'theory',
    emoji: 'PLR',
    title: { en: 'P, L, R: one note moves', he: 'P, L, R: צליל אחד זז' },
    takeaway: {
      en: 'Three moves keep two notes of a triad and move the third by step. P: C ↔ Cm (the 3rd, a semitone). R: C ↔ Am (the 5th of major up a whole tone; the root of minor down one). L: C ↔ Em (the root of major down a semitone; the 5th of minor up one). P then L: C → Cm → A♭.',
      he: 'שלושה מהלכים שומרים שני צלילים של משולש ומזיזים את השלישי בצעד. P: ‏C ↔ Cm (הטרצה, חצי טון). R: ‏C ↔ Am (הקווינטה של המז׳ור עולה טון שלם; השורש של המינור יורד טון). L: ‏C ↔ Em (השורש של המז׳ור יורד חצי טון; הקווינטה של המינור עולה חצי טון). P ואז L: ‏C → Cm → A♭.',
    },
    steps: [
      {
        say: { en: 'Two triads can share two notes. Move the third note by a step and you are on a new triad. There are three such moves: P, L and R.', he: 'שני משולשים יכולים לחלוק שני צלילים. מזיזים את הצליל השלישי בצעד ומגיעים למשולש חדש. יש שלושה מהלכים כאלה: P, L ו־R.' },
        play: [chord(C, 1), chord(Cm, 1), chord(C, 1)],
        show: { text: { en: 'P · L · R', he: 'P · L · R' } },
      },
      {
        say: { en: 'P, parallel: C major to C minor. The root and fifth stay; the third moves down a semitone.', he: 'P: מדו מז׳ור לדו מינור, אותו שורש. השורש והקווינטה נשארים; הטרצה יורדת חצי טון.' },
        play: [chord(C, 1), chord(Cm, 1.2)],
        show: { text: { en: 'C ↔ Cm', he: 'C ↔ Cm' } },
      },
      {
        say: { en: 'R, relative: C major to A minor. C and E stay; G moves up a whole tone to A.', he: 'R: מדו מז׳ור ללה מינור, הסולם המקביל. דו ומי נשארים; סול עולה טון שלם ללה.' },
        play: [chord(C, 1), chord(Am, 1.2)],
        show: { text: { en: 'C ↔ Am', he: 'C ↔ Am' } },
      },
      {
        say: { en: 'L, leading tone: C major to E minor. E and G stay; C moves down a semitone to B.', he: 'L, הצליל המוביל: מדו מז׳ור למי מינור. מי וסול נשארים; דו יורד חצי טון לסי.' },
        play: [chord(C, 1), chord(Em, 1.2)],
        show: { text: { en: 'C ↔ Em', he: 'C ↔ Em' } },
      },
      {
        say: { en: 'Each move undoes itself. From A minor, R moves the root down a whole tone back to C major; from E minor, L moves the fifth up a semitone.', he: 'כל מהלך מבטל את עצמו. מלה מינור, R מוריד את השורש טון שלם וחוזר לדו מז׳ור; ממי מינור, L מעלה את הקווינטה בחצי טון.' },
        play: [chord(Am, 0.9), chord(C, 0.9), rest(0.3), chord(Em, 0.9), chord(C, 1)],
      },
      {
        say: { en: 'Moves chain. P then L: C, C minor, A flat. Two moves reach the chromatic mediants: C to E is L then P.', he: 'מהלכים מתחברים. P ואז L: דו, דו מינור, לה במול. בשני מהלכים מגיעים למדיאנטות הכרומטיות: מ־C ל־E זה L ואז P.' },
        play: [chord(C, 0.9), chord(Cm, 0.9), chord(Ab, 1), rest(0.3), chord(C, 0.9), chord(Em, 0.9), chord(E, 1)],
        show: { text: { en: 'C →P→ Cm →L→ A♭', he: 'C →P→ Cm →L→ A♭' } },
      },
      {
        say: { en: 'Your turn: which note moved, and by how much?', he: 'תורכם: איזה צליל זז, ובכמה?' },
      },
    ],
    more: [
      {
        say: { en: 'This is neo-Riemannian theory, named after the nineteenth-century theorist Hugo Riemann and developed by David Lewin and Richard Cohn. It describes chords moving by smooth voice leading, without asking which key you are in.', he: 'זו התיאוריה הניאו־רימניאנית, על שם התאורטיקן הוגו רימן מהמאה התשע־עשרה, ופיתחו אותה דייוויד לואין וריצ׳רד כהן. היא מתארת אקורדים שזזים בהובלת קולות חלקה, בלי לשאול באיזה סולם אנחנו.' },
      },
      {
        say: { en: 'Alternate P and L from C: C, C minor, A flat, G sharp minor, E, E minor, and back to C. Six triads, all inside one augmented scale: the hexatonic cycle.', he: 'מחליפים P ו־L מדו: דו, דו מינור, לה במול, סול דיאז מינור, מי, מי מינור, וחזרה לדו. שישה משולשים, כולם בתוך סולם מוגדל אחד: המעגל ההקסטוני.' },
        play: [chord(C, 0.8), chord(Cm, 0.8), chord(Ab, 0.8), chord(Abm, 0.8), chord(E, 0.8), chord(Em, 0.8), chord(C, 1)],
      },
      {
        say: { en: 'Alternate P and R: C, C minor, E flat, E flat minor, F sharp, F sharp minor, A, A minor. Eight triads inside one diminished scale: the octatonic cycle.', he: 'מחליפים P ו־R: דו, דו מינור, מי במול, מי במול מינור, פה דיאז, פה דיאז מינור, לה, לה מינור. שמונה משולשים בתוך סולם מוקטן אחד: המעגל האוקטטוני.' },
        play: [chord(C, 0.7), chord(Cm, 0.7), chord(Eb, 0.7), chord(Ebm, 0.7), chord(Fs, 0.7), chord(Fsm, 0.7), chord(A, 0.7), chord(Am2, 0.7), chord(C, 0.9)],
      },
      {
        say: { en: 'Alternate L and R and you pass through all twenty-four major and minor triads. On the Tonnetz, the grid of fifths and thirds, every triad is a triangle and every move flips it over one edge.', he: 'מחליפים L ו־R ועוברים דרך כל עשרים וארבעה המשולשים המז׳וריים והמינוריים. בטונץ, הרשת של קווינטות וטרצות, כל משולש הוא אקורד וכל מהלך הופך אותו על צלע אחת.' },
      },
      {
        say: { en: 'Chromatic mediants like C to A flat are a common sound in film scores: one note stays, the other two slide by step.', he: 'מדיאנטות כרומטיות כמו C ל־A♭ הן צליל נפוץ במוזיקת סרטים: צליל אחד נשאר, השניים האחרים מחליקים בצעד.' },
        play: [chord(C, 1), chord(Ab, 1.2)],
      },
      {
        say: { en: 'Recap: P keeps the root and fifth, R keeps the root and third of the major triad, L keeps its third and fifth. One note moves; two stay.', he: 'לסיכום: P שומר על השורש והקווינטה, R שומר על השורש והטרצה של המשולש המז׳ורי, L שומר על הטרצה והקווינטה שלו. צליל אחד זז; שניים נשארים.' },
      },
    ],
  },
  {
    id: 'interval-vector',
    area: 'theory',
    emoji: 'ic',
    title: { en: 'Interval vectors', he: 'וקטור מרווחים' },
    takeaway: {
      en: 'An interval and its inversion are one class (ic1 … ic6). Count the classes of every pair of notes: the interval vector. Major and minor triads <001110>, dim7 <004002>, augmented <000300>, whole-tone scale <060603>, major scale <254361>.',
      he: 'מרווח וההיפוך שלו הם מחלקה אחת (ic1 … ic6). סופרים את המחלקות של כל זוג צלילים: וקטור המרווחים. משולש מז׳ורי ומינורי <001110>, מוקטן 7 <004002>, מוגדל <000300>, סולם טון שלם <060603>, סולם מז׳ור <254361>.',
    },
    steps: [
      {
        say: { en: 'Any chord is a set of intervals. Count every pair of notes and you can read its colour on paper.', he: 'כל אקורד הוא אוסף של מרווחים. סופרים כל זוג צלילים ואפשר לקרוא את הצבע שלו על הנייר.' },
        play: [notes([60, 64, 67], 0.4), chord([60, 64, 67], 1.2)],
      },
      {
        say: { en: 'An interval and its inversion are one class: a fifth and a fourth are class 5, a major sixth and a minor third class 3. The tritone is class 6.', he: 'מרווח וההיפוך שלו הם מחלקה אחת: קווינטה וקוורטה הן מחלקה 5, סקסטה גדולה וטרצה קטנה מחלקה 3. הטריטון הוא מחלקה 6.' },
        play: [notes([60, 67], 0.5), rest(0.3), notes([67, 72], 0.5)],
        show: { text: { en: 'ic1 … ic6', he: 'ic1 … ic6' } },
      },
      {
        say: { en: 'Six classes, so the count is six numbers: the interval vector. A major triad holds one minor third, one major third and one fifth: 0 0 1 1 1 0.', he: 'שש מחלקות, ולכן הספירה היא שישה מספרים: וקטור המרווחים. במשולש מז׳ורי יש טרצה קטנה אחת, טרצה גדולה אחת וקווינטה אחת: 0 0 1 1 1 0.' },
        play: [chord([60, 64, 67], 1.2)],
        show: { text: { en: '<001110>', he: '<001110>' } },
      },
      {
        say: { en: 'A minor triad has the same vector: the same intervals, upside down.', he: 'למשולש מינורי אותו וקטור: אותם מרווחים, הפוכים.' },
        play: [chord([60, 64, 67], 1), chord([60, 63, 67], 1.2)],
        show: { text: { en: 'C = Cm = <001110>', he: 'C = Cm = <001110>' } },
      },
      {
        say: { en: 'Symmetric chords show it at once. The diminished seventh: four minor thirds and two tritones, 0 0 4 0 0 2. The augmented triad: three major thirds, 0 0 0 3 0 0.', he: 'אקורדים סימטריים מראים את זה מיד. הספטאקורד המוקטן: ארבע טרצות קטנות ושני טריטונים, 0 0 4 0 0 2. המשולש המוגדל: שלוש טרצות גדולות, 0 0 0 3 0 0.' },
        play: [chord([60, 63, 66, 69], 1.1), chord([60, 64, 68], 1.2)],
        show: { text: { en: '°7 <004002> · + <000300>', he: '°7 <004002> · + <000300>' } },
      },
      {
        say: { en: 'Class 1, a semitone or major 7th, rubs; class 6, the tritone, is restless. Hear a major 7th chord, then a dominant 7th: the first holds the rub, the second the tritone.', he: 'מחלקה 1, חצי טון או ספטימה גדולה, משפשפת; מחלקה 6, הטריטון, לא שקטה. שומעים ספטאקורד מז׳ורי ואז ספטאקורד דומיננטי: בראשון השפשוף, בשני הטריטון.' },
        play: [chord([48, 64, 67, 71], 1.2), rest(0.3), chord([48, 64, 67, 70], 1.2)],
        show: { text: { en: 'Cmaj7: ic1 · C7: ic6', he: 'Cmaj7: ic1 · C7: ic6' } },
      },
      {
        say: { en: 'Your turn: list the pairs, fold, count.', he: 'תורכם: עוברים על הזוגות, מקפלים, סופרים.' },
      },
    ],
    more: [
      {
        say: { en: 'The vector comes from post-tonal set theory, as Allen Forte laid it out in 1973: it compares chords that share no notes. Sets with the same vector hold the same intervals, in any order.', he: 'הווקטור בא מתורת הסטים הפוסט־טונלית, כפי שאלן פורט הציג אותה ב־1973: הוא משווה אקורדים שאין להם צלילים משותפים. לסטים עם אותו וקטור יש אותם מרווחים, בכל סדר.' },
      },
      {
        say: { en: 'The whole-tone scale: six whole tones, six major thirds, three tritones, 0 6 0 6 0 3. No semitones and no fifths: that is why it floats.', he: 'סולם הטון השלם: שישה טונים שלמים, שש טרצות גדולות, שלושה טריטונים, 0 6 0 6 0 3. בלי חצאי טונים ובלי קווינטות: לכן הוא מרחף.' },
        play: [notes([60, 62, 64, 66, 68, 70, 72], 0.26)],
      },
      {
        say: { en: 'The major scale: 2 5 4 3 6 1. Six fifths and a single tritone, between degrees 4 and 7: the sound of a key.', he: 'סולם המז׳ור: 2 5 4 3 6 1. שש קווינטות וטריטון אחד בלבד, בין דרגה 4 לדרגה 7: הצליל של סולם.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.26), rest(0.3), notes([65, 71], 0.5)],
      },
      {
        say: { en: 'A dominant 7th and a half-diminished 7th share one vector, 0 1 2 1 1 1: turn C7 upside down and you get D half-diminished.', he: 'לספטאקורד דומיננטי ולחצי מוקטן יש אותו וקטור, 0 1 2 1 1 1: הופכים את C7 ומקבלים D חצי מוקטן.' },
        play: [chord([60, 64, 67, 70], 1.1), chord([62, 65, 68, 72], 1.2)],
      },
      {
        say: { en: 'Next step: the trichords topic names sets by their prime form, like [0,1,6]. The vector tells you what each of those sets sounds like inside.', he: 'הצעד הבא: נושא הטריכורדים נותן לסטים שם לפי הצורה הראשונית, כמו [0,1,6]. הווקטור אומר איך כל סט כזה נשמע מבפנים.' },
      },
      {
        say: { en: 'Recap: take every pair of notes, fold each interval to its class from 1 to 6, and count. Semitones rub, tritones are restless, fifths settle.', he: 'לסיכום: לוקחים כל זוג צלילים, מקפלים כל מרווח למחלקה שלו מ־1 עד 6, וסופרים. חצאי טונים משפשפים, טריטונים לא שקטים, קווינטות מתיישבות.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:octave-division': 'octave-division',
  'topic:neo-riemann': 'neo-riemann',
  'topic:interval-vector': 'interval-vector',
  // The Tonnetz game opens with the P / L / R lesson.
  'game:tonnetz': 'neo-riemann',
};

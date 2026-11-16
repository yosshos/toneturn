// Reharmonization and colour harmony (docs/HARMONY-REHARM.md, the canonical reference): the quick lessons before the
// k-ctone, k-mediant, k-organ, k-reharm 11–22, g-ctone, g-color and b-counter levels and the colour-harmony ear topics.
// Every example is in C (or holds F) and matches the reference tables. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { BC_ROWS, CT_ROWS, GCOL_ROWS, RH_FIRST, RH_ROWS } from '../../engine/drills/colorDrills';

const chord = (midis: number[], duration = 1): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.32): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.3): Stimulus => ({ kind: 'rest', duration: d });
const row = (cs: number[][], d = 0.9): Stimulus[] => cs.flatMap((c) => [chord(c, d)]);

// held F (F5) over the ladder
const TRI_F = [[69, 72, 77], [68, 72, 77], [69, 74, 77], [68, 73, 77], [70, 74, 77], [70, 73, 77]];
const G7_D2 = [62, 67, 71, 77];
const DB_D2 = [61, 68, 72, 77];
const EB9 = [51, 67, 70, 73, 77];
const B7S11 = [47, 63, 68, 69, 77];
const D7S9 = [50, 66, 69, 72, 77];
// mediants of C
const C = [60, 64, 67];
const AB = [60, 63, 68];
const E = [59, 64, 68];
const A = [61, 64, 69];
const EB = [58, 63, 67];
const ABM = [59, 63, 68];
// modal interchange in C
const I = [48, 60, 64, 67];
const IV = [41, 60, 65, 69];
const IVM6 = [41, 62, 65, 68, 72];
const BVI = [44, 60, 63, 68];
const BVII = [46, 62, 65, 70];
const CMAJ7 = [48, 64, 67, 71];
const DM7B5 = [50, 65, 68, 72];
const G7B9 = [43, 65, 68, 71];
// pedal on G
const PED = [[43, 62, 65, 69, 72], [43, 65, 69, 72], [43, 63, 68, 72], [43, 62, 65, 71], [36, 60, 64, 67]];

export const LESSONS: MiniLesson[] = [
  {
    id: 'ct-one-note',
    area: 'harmony',
    emoji: '⌒',
    title: { en: 'One note, many chords', he: 'צליל אחד, הרבה אקורדים' },
    takeaway: {
      en: 'Hold the melody note and change what it means: the root, the 3rd, the 5th, the 7th, or a tension of a new chord.',
      he: 'מחזיקים את צליל המנגינה ומשנים את המשמעות שלו: יסוד, טרצה, קווינטה, ספטימה, או טנשן של אקורד חדש.',
    },
    steps: [
      {
        say: { en: 'Keep one note on top and put different chords under it. The note stays; its meaning changes.', he: 'משאירים צליל אחד למעלה ומניחים מתחתיו אקורדים שונים. הצליל נשאר; המשמעות שלו משתנה.' },
        play: [notes([77], 0.8)],
        show: { notes: [77], key: 'C', text: { en: 'F', he: 'F' } },
      },
      {
        say: { en: 'F over six triads: F is the root of F and Fm, the 3rd of Dm and D flat, the 5th of B flat and B flat minor.', he: 'פה מעל שישה משולשים: פה הוא היסוד של F ו־Fm, הטרצה של Dm ו־D♭, הקווינטה של B♭ ו־B♭m.' },
        play: row(TRI_F, 0.8),
        show: { text: { en: 'F · Fm · Dm · D♭ · B♭ · B♭m', he: 'F · Fm · Dm · D♭ · B♭ · B♭m' } },
      },
      {
        say: { en: 'With 7th chords, F can also be a flat 7, as in G7, or a major 7, as in G flat major 7.', he: 'עם ספטאקורדים פה יכול להיות גם ♭7, כמו ב־G7, או ספטימה גדולה, כמו ב־G♭maj7.' },
        play: [chord(G7_D2, 1.1), chord(DB_D2, 1.1)],
        show: { notes: G7_D2, chord: true, key: 'C', text: { en: 'G7: D G B F (drop 2)', he: 'G7: D G B F (דרופ 2)' } },
      },
      {
        say: { en: 'Then the tensions: F is the 9th of E flat 9, the 11th of C7sus4, and the sharp 11 of B7. Over B7 it is written E sharp.', he: 'ואחר כך הטנשנים: פה הוא ה־9 של E♭9, ה־11 של C7sus4, וה־♯11 של B7. מעל B7 כותבים אותו E♯.' },
        play: [chord(EB9, 1.1), chord(B7S11, 1.1), chord(D7S9, 1.1)],
        show: { text: { en: 'E♭9 (9) · B7♯11 (E♯) · D7♯9 (E♯)', he: 'E♭9 (9) · B7♯11 (E♯) · D7♯9 (E♯)' } },
      },
      {
        say: { en: 'Practise it in all twelve keys: free time first, the note always on top, each chord moving to the nearest voicing. Your turn.', he: 'מתרגלים בכל שנים־עשר הסולמות: קודם בזמן חופשי, הצליל תמיד למעלה, וכל אקורד עובר לקול הקרוב. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: a melody note fits any chord in which it is a chord tone or an available tension. It must never be an avoid note, like F over C major 7.', he: 'למה זה עובד: צליל מנגינה מתאים לכל אקורד שבו הוא צליל אקורד או טנשן זמין. אסור שיהיה צליל להימנע ממנו, כמו פה מעל Cmaj7.' },
        play: [chord([48, 64, 67, 71, 77], 1.2)],
      },
      {
        say: { en: 'How to build drop 2 with the note on top: write the close voicing under it, then drop the second voice from the top by an octave.', he: 'איך בונים דרופ 2 עם הצליל למעלה: כותבים את הקול הצמוד מתחתיו, ואז מורידים את הקול השני מלמעלה באוקטבה.' },
        play: [chord([65, 67, 71, 74, 77].slice(1), 1), chord(G7_D2, 1)],
        show: { text: { en: 'G B D F → D G B F', he: 'G B D F → D G B F' } },
      },
      {
        say: { en: 'How to hear it: find the root in the bass, then count letters up to the held note. Three letters is the 3rd, seven the 7th.', he: 'איך שומעים: מוצאים את היסוד בבס וסופרים אותיות עד הצליל הנשאר. שלוש אותיות זו הטרצה, שבע הספטימה.' },
      },
      {
        say: { en: 'A common slip is to let the top note move. Keep it exactly where it is and let the other voices do the work.', he: 'טעות נפוצה היא לתת לצליל העליון לזוז. השאירו אותו בדיוק במקומו ותנו לשאר הקולות לעבוד.' },
        play: [chord([61, 68, 72, 77], 0.9), chord([62, 67, 71, 77], 0.9), chord([60, 65, 69, 77], 0.9)],
      },
      {
        say: { en: 'The common-tone diminished is the same idea: C6 to C diminished 7 and back, with C and A staying put.', he: 'הדימיניש בצליל משותף הוא אותו רעיון: C6 אל C°7 וחזרה, ו־C ו־A נשארים במקומם.' },
        play: [chord([60, 64, 67, 69], 0.9), chord([60, 63, 66, 69], 0.9), chord([60, 64, 67, 69], 0.9)],
      },
      {
        say: { en: 'At the top level you choose: harmonize the note eight ways, no chord twice, each one voice-led from the last.', he: 'ברמה העליונה אתם בוחרים: שמונה הרמוניות לצליל אחד, אף אקורד לא פעמיים, כל אחד בהובלת קולות מהקודם.' },
      },
      {
        say: { en: 'To keep: the note stays, the meaning moves. Root, 3rd, 5th, 7th, then the tensions.', he: 'לזכור: הצליל נשאר, המשמעות זזה. יסוד, טרצה, קווינטה, ספטימה, ואז הטנשנים.' },
      },
    ],
  },
  {
    id: 'bass-counter-line',
    area: 'harmony',
    emoji: '⌄',
    title: { en: 'The counter-line: the bass renames the chord', he: 'הקו הנגדי: הבס נותן לאקורד שם חדש' },
    takeaway: {
      en: 'The melody holds; the bass walks down by step; each bass note makes a new chord: C, Cmaj7/B, C7/B♭, Am7, A♭maj7, G7sus4.',
      he: 'המנגינה נשארת; הבס יורד בצעדים; כל צליל בס יוצר אקורד חדש: C, ‏Cmaj7/B, ‏C7/B♭, ‏Am7, ‏A♭maj7, ‏G7sus4.',
    },
    steps: [
      {
        say: { en: 'Hold C on top. Now walk the bass down a half step at a time.', he: 'מחזיקים דו למעלה. עכשיו הבס יורד חצי טון בכל פעם.' },
        play: [notes([48, 47, 46, 45, 44, 43], 0.45)],
        show: { notes: [48, 47, 46, 45, 44, 43], key: 'C', clef: 'bass', text: { en: 'C B B♭ A A♭ G', he: 'C B B♭ A A♭ G' } },
      },
      {
        say: { en: 'Every bass note renames the chord under the same C: C, C major 7 over B, C7 over B flat.', he: 'כל צליל בס נותן שם חדש לאקורד מתחת לאותו דו: C, ‏Cmaj7 מעל B, ‏C7 מעל B♭.' },
        play: [chord([48, 64, 67, 72], 0.9), chord([47, 64, 67, 72], 0.9), chord([46, 64, 67, 72], 0.9)],
        show: { text: { en: 'C · Cmaj7/B · C7/B♭', he: 'C · Cmaj7/B · C7/B♭' } },
      },
      {
        say: { en: 'Then A minor 7, where C is the flat 3; A flat major 7, where C is the 3rd; and G7sus4, where C is the 11th.', he: 'ואז Am7, שבו דו הוא ♭3; ‏A♭maj7, שבו דו הוא הטרצה; ו־G7sus4, שבו דו הוא ה־11.' },
        play: [chord([45, 64, 67, 72], 0.9), chord([44, 63, 67, 72], 0.9), chord([43, 62, 65, 72], 0.9), chord([36, 64, 67, 72], 1.1)],
        show: { text: { en: 'Am7 · A♭maj7 · G7sus4 → C', he: 'Am7 · A♭maj7 · G7sus4 → C' } },
      },
      {
        say: { en: 'On the bass this is a real reharm role: you change the harmony by your note choice, while the band keeps the melody.', he: 'בבס זה תפקיד אמיתי של הרמון מחדש: אתם משנים את ההרמוניה בבחירת הצליל, והלהקה שומרת על המנגינה.' },
        play: [notes([48, 47, 46, 45], 0.5)],
      },
      {
        say: { en: 'Count the result: one held note and six bass notes give six different chords, and the last one, G7sus4, leads straight back home to C.', he: 'ספרו את התוצאה: צליל אחד שנשאר ושישה צלילי בס נותנים שישה אקורדים שונים, והאחרון, G7sus4, מוביל ישר הביתה אל דו.' },
        play: [chord([43, 62, 65, 72], 0.9), chord([36, 64, 67, 72], 1.1)],
      },
      {
        say: { en: 'Play it in all twelve keys: free time first, then on the click. Your turn.', he: 'מנגנים בכל שנים־עשר הסולמות: קודם בזמן חופשי, ואחר כך עם הקליק. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the held note stays a chord tone or a tension over every new bass note, so the line sounds planned, not wrong.', he: 'למה זה עובד: הצליל הנשאר נשאר צליל אקורד או טנשן מעל כל צליל בס חדש, כך שהקו נשמע מתוכנן ולא שגוי.' },
        play: [chord([46, 64, 67, 72], 1), chord([45, 64, 67, 72], 1)],
      },
      {
        say: { en: 'It is the line cliché turned upside down: there an inner voice moves inside a held chord; here the bass moves under a held melody.', he: 'זה הקו הקלישאי הפוך: שם קול פנימי זז בתוך אקורד שנשאר; כאן הבס זז מתחת למנגינה שנשארת.' },
        play: [chord([48, 55, 60, 63], 0.8), chord([48, 55, 59, 63], 0.8), chord([48, 55, 58, 63], 0.8), chord([48, 55, 57, 63], 0.8)],
      },
      {
        say: { en: 'How to hear it: keep the top note in your ear and follow only the bass. Name the new root, then the held note’s degree in it.', he: 'איך שומעים: השאירו את הצליל העליון באוזן ועקבו רק אחרי הבס. תנו שם ליסוד החדש, ואז לדרגה של הצליל הנשאר בו.' },
      },
      {
        say: { en: 'A common slip on the bass is to rush the half steps. Give each new chord its full length so the change is heard.', he: 'טעות נפוצה בבס היא למהר בחצאי הטונים. תנו לכל אקורד חדש את כל האורך שלו כדי שהשינוי יישמע.' },
      },
      {
        say: { en: 'Arrangers use it under long melody notes in ballads. On the piano, the left hand walks while the right hand holds the note on top.', he: 'מעבדים משתמשים בזה מתחת לצלילי מנגינה ארוכים בבלדות. בפסנתר יד שמאל הולכת ויד ימין מחזיקה את הצליל למעלה.' },
        play: [notes([48, 47, 46, 45, 44, 43, 36], 0.4)],
      },
      {
        say: { en: 'Try it from other held notes too: hold the 5th of the key and walk the bass down, then name every chord you make.', he: 'נסו את זה גם מצלילים אחרים: החזיקו את הקווינטה של הסולם והורידו את הבס, ואז תנו שם לכל אקורד שיצרתם.' },
      },
      {
        say: { en: 'To keep: the melody holds, the bass walks, and every step is a new chord.', he: 'לזכור: המנגינה נשארת, הבס הולך, וכל צעד הוא אקורד חדש.' },
      },
    ],
  },
  {
    id: 'chromatic-mediants',
    area: 'harmony',
    emoji: '⅓',
    title: { en: 'Chromatic mediants', he: 'מדיאנטות כרומטיות' },
    takeaway: {
      en: 'Two major (or two minor) chords a 3rd apart share one note: C to E keeps E, C to A♭ keeps C. The film sound.',
      he: 'שני אקורדים מז׳וריים (או מינוריים) במרחק טרצה חולקים צליל אחד: C אל E שומר על E, ‏C אל A♭ שומר על C. הצליל של הסרטים.',
    },
    steps: [
      {
        say: { en: 'A chromatic mediant is a chord of the same quality a 3rd away. C goes to E, A flat, A or E flat.', he: 'מדיאנטה כרומטית היא אקורד באותה איכות במרחק טרצה. C הולך אל E, ‏A♭, ‏A או E♭.' },
        play: [chord(C, 0.8), chord(E, 0.8), rest(), chord(C, 0.8), chord(AB, 0.8)],
        show: { text: { en: 'C → E · A♭ · A · E♭', he: 'C → E · A♭ · A · E♭' } },
      },
      {
        say: { en: 'They share exactly one note. C and E share E; C and A flat share C; C and A share E; C and E flat share G.', he: 'הם חולקים צליל אחד בדיוק. C ו־E חולקים את E; ‏C ו־A♭ את C; ‏C ו־A את E; ‏C ו־E♭ את G.' },
        play: [chord(C, 0.8), chord(A, 0.8), chord(C, 0.8), chord(EB, 0.8)],
        show: { notes: [60, 64, 67], chord: true, key: 'C', text: { en: 'keep the common tone', he: 'שומרים על הצליל המשותף' } },
      },
      {
        say: { en: 'Doubly chromatic pairs share nothing: C to A flat minor, or C to E flat minor. The most distant sound there is.', he: 'זוגות כרומטיים כפולים לא חולקים כלום: C אל A♭m, או C אל E♭m. הצליל הרחוק ביותר שיש.' },
        play: [chord(C, 0.9), chord(ABM, 0.9), chord(C, 0.9)],
      },
      {
        say: { en: 'Coltrane’s cycle is built from them: C, A flat and E are major-third mediants, and their roots spell an augmented triad.', he: 'המעגל של קולטריין בנוי מהן: C, ‏A♭ ו־E הן מדיאנטות בטרצה גדולה, והיסודות שלהן יוצרים משולש מוגדל.' },
        play: [chord(C, 0.8), chord(AB, 0.8), chord(E, 0.8), chord(C, 0.8)],
        show: { text: { en: 'C – A♭ – E = C E G♯', he: 'C – A♭ – E = C E G♯' } },
      },
      {
        say: { en: 'Play them voice-led in all twelve keys: the common tone stays in the same voice. Your turn.', he: 'מנגנים אותן בהובלת קולות בכל שנים־עשר הסולמות: הצליל המשותף נשאר באותו קול. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it sounds like film music: the move is not functional. Nothing pulls home; the light changes while one note glows through.', he: 'למה זה נשמע כמו מוזיקת סרטים: התנועה לא פונקציונלית. שום דבר לא מושך הביתה; האור משתנה וצליל אחד זוהר לאורך הכל.' },
        play: [chord([48, 64, 67, 71], 1.1), chord([44, 63, 67, 72], 1.1), chord([48, 64, 67, 71], 1.1)],
      },
      {
        say: { en: 'Three moves explain them: P swaps major and minor on one root, R goes to the relative, and L moves one voice by a half step.', he: 'שלוש תנועות מסבירות אותן: P מחליף מז׳ור ומינור על אותו יסוד, ‏R הולך אל היחסי, ו־L מזיז קול אחד בחצי טון.' },
        play: [chord(C, 0.8), chord([60, 63, 67], 0.8), chord([60, 64, 69], 0.8), chord([59, 64, 67], 0.8)],
      },
      {
        say: { en: 'P and L in turn give the hexatonic cycle: C, C minor, A flat, A flat minor, E, E minor. One voice moves a half step each time.', he: 'P ו־L לסירוגין נותנים את המעגל ההקסטוני: C, ‏Cm, ‏A♭, ‏A♭m, ‏E, ‏Em. קול אחד זז בחצי טון בכל פעם.' },
        play: [chord(C, 0.6), chord([60, 63, 67], 0.6), chord(AB, 0.6), chord(ABM, 0.6), chord(E, 0.6), chord([59, 64, 67], 0.6)],
      },
      {
        say: { en: 'P and R in turn give the octatonic cycle. Its major roots, C, A, F sharp and E flat, are the minor-third cycle of Barry Harris’s family of dominants.', he: 'P ו־R לסירוגין נותנים את המעגל האוקטטוני. היסודות המז׳וריים שלו, C, ‏A, ‏F♯ ו־E♭, הם מעגל הטרצות הקטנות של משפחת הדומיננטות של בארי האריס.' },
        show: { text: { en: 'C – Am – A – F♯m – F♯ – E♭m – E♭ – Cm', he: 'C – Am – A – F♯m – F♯ – E♭m – E♭ – Cm' } },
      },
      {
        say: { en: 'A common slip is to jump the whole hand. Find the shared note first, hold it, and move only the other two.', he: 'טעות נפוצה היא להקפיץ את כל היד. מצאו קודם את הצליל המשותף, החזיקו אותו, והזיזו רק את השניים האחרים.' },
      },
      {
        say: { en: 'On the guitar the same moves sit on three strings: keep one finger on the common tone and move the other two.', he: 'בגיטרה אותן תנועות יושבות על שלושה מיתרים: השאירו אצבע אחת על הצליל המשותף והזיזו את שתי האחרות.' },
      },
      {
        say: { en: 'To keep: same quality, a 3rd away, one note in common, or none at all for the doubly chromatic pair.', he: 'לזכור: אותה איכות, במרחק טרצה, צליל משותף אחד, או אף אחד בזוג הכרומטי הכפול.' },
      },
    ],
  },
  {
    id: 'modal-mix',
    area: 'harmony',
    emoji: '♭',
    title: { en: 'Modal interchange: borrowing from minor', he: 'השאלה מודאלית: לשאול מהמינור' },
    takeaway: {
      en: 'Borrow chords from the parallel minor: iv(m6), ♭VI, ♭VII7, iiø7, ♭III, ♭II. Minor plagal goes straight to I; in minor the borrowing reverses.',
      he: 'שואלים אקורדים מהמינור המקביל: iv(m6), ‏♭VI, ‏♭VII7, ‏iiø7, ‏♭III, ‏♭II. הפלגלית המינורית הולכת ישר אל I; במינור ההשאלה מתהפכת.',
    },
    steps: [
      {
        say: { en: 'In C major, borrow F minor from C minor: I, IV, iv, I. The A flat darkens the IV for a moment.', he: 'בדו מז׳ור שואלים את פה מינור מדו מינור: I, ‏IV, ‏iv, ‏I. הלה במול מחשיך את ה־IV לרגע.' },
        play: [chord(I, 0.8), chord(IV, 0.8), chord(IVM6, 0.8), chord(I, 1)],
        show: { text: { en: 'C – F – Fm6 – C', he: 'C – F – Fm6 – C' } },
      },
      {
        say: { en: 'The pop on-ramp: flat VI, flat VII, I. Both chords come from the minor key.', he: 'הכניסה מהפופ: ♭VI, ‏♭VII, ‏I. שני האקורדים באים מהסולם המינורי.' },
        play: [chord(BVI, 0.8), chord(BVII, 0.8), chord(I, 1.1)],
      },
      {
        say: { en: 'Minor plagal: iv minor 6, flat VI major 7, flat VII7 or flat II major 7 going straight to I.', he: 'פלגלית מינורית: ivm6, ‏♭VImaj7, ‏♭VII7 או ♭IImaj7 שהולכים ישר אל I.' },
        play: [chord(IVM6, 0.9), chord(CMAJ7, 1), chord([46, 62, 65, 68], 0.9), chord(CMAJ7, 1)],
      },
      {
        say: { en: 'The minor’s ii in major: D half-diminished, G7 flat 9, C major 7. The flat 13 of G7 is the 3rd of C minor.', he: 'ה־ii של המינור במז׳ור: Dø7, ‏G7♭9, ‏Cmaj7. ה־♭13 של G7 הוא הטרצה של דו מינור.' },
        play: [chord(DM7B5, 0.9), chord(G7B9, 0.9), chord(CMAJ7, 1.2)],
        show: { text: { en: 'Dø7 – G7♭9 – Cmaj7', he: 'Dø7 – G7♭9 – Cmaj7' } },
      },
      {
        say: { en: 'The borrowed chord keeps the tonic but changes the mood for a moment: the music sounds darker, then comes home.', he: 'האקורד השאול שומר על הטוניקה אבל משנה את מצב הרוח לרגע: המוזיקה נשמעת כהה יותר, ואז חוזרת הביתה.' },
        play: [chord(IV, 0.8), chord(IVM6, 0.8), chord(I, 1)],
      },
      {
        say: { en: 'Comp each borrowing in all twelve keys, then use them inside a tune in the reharm studio. Your turn.', he: 'מלווים כל השאלה בכל שנים־עשר הסולמות, ואז משתמשים בהן בתוך שיר בסטודיו ההרמון. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the parallel minor shares the tonic, so its chords still point home, only darker.', he: 'למה זה עובד: למינור המקביל יש אותה טוניקה, ולכן האקורדים שלו עדיין מצביעים הביתה, רק כהים יותר.' },
      },
      {
        say: { en: 'Tadd Dameron’s turnaround uses three borrowed major 7ths: I, flat III, flat VI, flat II, then home.', he: 'הטרנאראונד של טאד דמרון משתמש בשלושה maj7 שאולים: I, ‏♭III, ‏♭VI, ‏♭II, ואז הביתה.' },
        play: [chord(CMAJ7, 0.8), chord([51, 62, 67, 70], 0.8), chord([44, 63, 67, 72], 0.8), chord([49, 65, 68, 72], 0.8), chord(CMAJ7, 1)],
      },
      {
        say: { en: 'From Mixolydian comes v minor 7: G minor 7, C7, F. It sounds like a ii–V into the IV.', he: 'מהמיקסולידי בא v m7: ‏Gm7, ‏C7, ‏F. זה נשמע כמו ii–V אל ה־IV.' },
        play: [chord([43, 58, 62, 65], 0.8), chord([48, 58, 64, 67], 0.8), chord([41, 57, 60, 64], 1)],
      },
      {
        say: { en: 'In minor the borrowing reverses: the Picardy third ends on major I, Dorian gives IV7, and ii minor 7 replaces the half-diminished.', he: 'במינור ההשאלה מתהפכת: הטרצה הפיקרדית מסיימת ב־I מז׳ורי, הדורי נותן IV7, ו־ii m7 מחליף את החצי מוקטן.' },
        play: [chord([48, 63, 67, 69], 0.8), chord([41, 63, 67, 69], 0.8), chord([43, 62, 65, 71], 0.8), chord([48, 64, 67, 69], 1)],
      },
      {
        say: { en: 'A common slip is a melody note the borrowed chord cannot carry: E over F minor clashes with A flat. The studio checks every bar.', he: 'טעות נפוצה היא צליל מנגינה שהאקורד השאול לא יכול לשאת: מי מעל פה מינור מתנגש בלה במול. הסטודיו בודק כל תיבה.' },
      },
      {
        say: { en: 'Minor plagal endings close many ballads: ivm6 straight to I sounds warm and a little sad, with no dominant at all.', he: 'סיומים פלגליים מינוריים סוגרים הרבה בלדות: ivm6 ישר אל I נשמע חם וקצת עצוב, בלי דומיננטה בכלל.' },
        play: [chord(IVM6, 1), chord(I, 1.2)],
      },
      {
        say: { en: 'In the reharm studio you can put iv, flat VI, flat VII7, iiø7 or the minor plagal ending on a bar; the app checks the melody note against each new chord.', he: 'בסטודיו ההרמון אפשר לשים iv, ‏♭VI, ‏♭VII7, ‏iiø7 או את הסיום הפלגלי המינורי על תיבה; האפליקציה בודקת את צליל המנגינה מול כל אקורד חדש.' },
      },
      {
        say: { en: 'To keep: borrow from the parallel minor; minor plagal goes straight home; in minor, borrow from major and Dorian.', he: 'לזכור: שואלים מהמינור המקביל; הפלגלית המינורית הולכת ישר הביתה; במינור שואלים מהמז׳ור ומהדורי.' },
      },
    ],
  },
  {
    id: 'pedal-point',
    area: 'harmony',
    emoji: '𝄐',
    title: { en: 'Pedal point', he: 'פדל' },
    takeaway: {
      en: 'The bass holds one note, the tonic or the dominant, while the chords above it change: Dm7/G – F/G – A♭/G – G7.',
      he: 'הבס מחזיק צליל אחד, הטוניקה או הדומיננטה, והאקורדים מעליו משתנים: Dm7/G – F/G – A♭/G – G7.',
    },
    steps: [
      {
        say: { en: 'A pedal is a bass note that stays while the harmony moves above it.', he: 'פדל הוא צליל בס שנשאר בזמן שההרמוניה זזה מעליו.' },
        play: [chord([36, 60, 64, 67], 0.8), chord([36, 60, 65, 69], 0.8), chord([36, 59, 62, 67], 0.8), chord([36, 60, 64, 67], 0.9)],
        show: { text: { en: 'C – F/C – G/C – C', he: 'C – F/C – G/C – C' } },
      },
      {
        say: { en: 'The dominant pedal holds G under the chords before C. It builds tension and sounds like an intro.', he: 'פדל הדומיננטה מחזיק סול מתחת לאקורדים שלפני דו. הוא בונה מתח ונשמע כמו פתיחה.' },
        play: row(PED, 0.8),
        show: { text: { en: 'Dm7/G – F/G – A♭/G – G7 → C', he: 'Dm7/G – F/G – A♭/G – G7 → C' } },
      },
      {
        say: { en: 'Over the G pedal, F over G is a G9sus4, and A flat over G is a G7 flat 9 sus.', he: 'מעל פדל סול, F מעל G הוא G9sus4, ו־A♭ מעל G הוא G7♭9sus.' },
        play: [chord([43, 65, 69, 72], 1.1), chord([43, 63, 68, 72], 1.1), chord([36, 60, 64, 67], 1)],
      },
      {
        say: { en: 'On the bass the job is time and length: hold the pedal steadily while the band changes chords.', he: 'בבס התפקיד הוא זמן ואורך: מחזיקים את הפדל ביציבות בזמן שהלהקה מחליפה אקורדים.' },
        play: [notes([43, 43, 43, 43], 0.5)],
      },
      {
        say: { en: 'The tonic pedal is calm, like a drone; the dominant pedal leans forward, so the ear waits for the tonic to arrive.', he: 'פדל הטוניקה רגוע, כמו בורדון; פדל הדומיננטה נוטה קדימה, והאוזן מחכה שהטוניקה תגיע.' },
        play: [chord([36, 60, 65, 69], 0.9), chord([43, 62, 65, 71], 0.9), chord([36, 60, 64, 67], 1)],
      },
      {
        say: { en: 'Play both pedals in all twelve keys. Your turn.', he: 'מנגנים את שני הפדלים בכל שנים־עשר הסולמות. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the held bass is a common tone of every chord, or a tension under it, so the ear hears one place while the colours change.', he: 'למה זה עובד: הבס הנשאר הוא צליל משותף של כל אקורד, או טנשן מתחתיו, והאוזן שומעת מקום אחד בזמן שהצבעים משתנים.' },
      },
      {
        say: { en: 'How to hear it: hum the lowest note. If it never moves while the chords do, it is a pedal. A 5th above home is the dominant pedal.', he: 'איך שומעים: זמזמו את הצליל הנמוך. אם הוא לא זז בזמן שהאקורדים זזים, זה פדל. קווינטה מעל הבית זה פדל הדומיננטה.' },
        play: [chord([43, 62, 65, 69], 0.9), chord([43, 63, 68, 72], 0.9)],
      },
      {
        say: { en: 'The push: anticipate the next bar on the and of 4 and tie it over. The pedal keeps moving forward while it stays on one note.', he: 'הדחיפה: מקדימים את התיבה הבאה ב״וְ״ של 4 וקושרים אותה. הפדל ממשיך להתקדם גם כשהוא נשאר על צליל אחד.' },
        play: [notes([43, 43, 43, 42, 43], 0.35)],
      },
      {
        say: { en: 'A common slip is to drift off the pedal when the chords get colourful. The bass stays; only the top moves.', he: 'טעות נפוצה היא לזוז מהפדל כשהאקורדים נעשים צבעוניים. הבס נשאר; רק החלק העליון זז.' },
      },
      {
        say: { en: 'Modal tunes live on pedals, and many intros and endings use the dominant pedal to set up the first chord.', he: 'שירים מודאליים חיים על פדלים, והרבה פתיחות וסיומים משתמשים בפדל הדומיננטה כדי להכין את האקורד הראשון.' },
      },
      {
        say: { en: 'Upper structures over a pedal give modern colours: a D triad over C is a lydian sound, an F triad over G a sus sound.', he: 'מבנים עליונים מעל פדל נותנים צבעים מודרניים: משולש D מעל C הוא צליל לידי, משולש F מעל G צליל סאס.' },
        play: [chord([36, 62, 66, 69], 1), chord([43, 65, 69, 72], 1)],
      },
      {
        say: { en: 'To keep: one bass note, many chords above it; tonic for calm, dominant for tension.', he: 'לזכור: צליל בס אחד, הרבה אקורדים מעליו; טוניקה לרוגע, דומיננטה למתח.' },
      },
    ],
  },
  {
    id: 'planing-melody',
    area: 'harmony',
    emoji: '∥',
    title: { en: 'Planing under a melody', he: 'פליינינג מתחת למנגינה' },
    takeaway: {
      en: 'One chord shape under every melody note, moved in parallel: the melody picks the chord. Exact planing keeps the quality; diatonic keeps the key.',
      he: 'צורת אקורד אחת מתחת לכל צליל במנגינה, בתנועה מקבילה: המנגינה בוחרת את האקורד. פליינינג מדויק שומר על האיכות; דיאטוני שומר על הסולם.',
    },
    steps: [
      {
        say: { en: 'Take one shape, a major 7 in drop 2 with the root on top, and slide it under each note of a melody.', he: 'לוקחים צורה אחת, maj7 בדרופ 2 עם היסוד למעלה, ומחליקים אותה מתחת לכל צליל במנגינה.' },
        play: [chord([63, 68, 71, 76], 0.7), chord([61, 66, 69, 74], 0.7), chord([59, 64, 67, 72], 0.7), chord([56, 61, 64, 69], 0.9)],
        show: { text: { en: 'E D C A, one shape', he: 'E D C A, צורה אחת' } },
      },
      {
        say: { en: 'This is exact planing, or constant structure: every chord has the same quality, so the key disappears.', he: 'זה פליינינג מדויק, או מבנה קבוע: לכל אקורד אותה איכות, ולכן הסולם נעלם.' },
        play: [chord([59, 64, 67, 72], 0.8), chord([61, 66, 69, 74], 0.8)],
      },
      {
        say: { en: 'Diatonic planing keeps the shape but changes the quality to stay in the key.', he: 'פליינינג דיאטוני שומר על הצורה אבל משנה את האיכות כדי להישאר בסולם.' },
        play: [chord([59, 64, 67, 72], 0.8), chord([60, 65, 69, 74], 0.8), chord([62, 67, 71, 76], 0.8)],
      },
      {
        say: { en: 'Try three shapes: major 7, minor 7, and a stack of fourths. Then the guitar slides one drop 2 shape up the neck.', he: 'מנסים שלוש צורות: maj7, ‏m7, וערימה של קוורטות. ואז הגיטרה מחליקה צורת דרופ 2 אחת על הצוואר.' },
        play: [chord([57, 62, 67, 72], 0.9), chord([55, 60, 65, 70], 0.9)],
      },
      {
        say: { en: 'The melody decides: each new note brings its own chord, all with the same shape, so the harmony follows the tune.', he: 'המנגינה מחליטה: כל צליל חדש מביא אקורד משלו, כולם באותה צורה, וההרמוניה הולכת אחרי השיר.' },
        play: [chord([56, 61, 64, 69], 0.7), chord([59, 64, 67, 72], 0.9)],
      },
      {
        say: { en: 'Free time first, the melody always on top, in all twelve keys. Your turn.', he: 'קודם בזמן חופשי, המנגינה תמיד למעלה, בכל שנים־עשר הסולמות. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the ear follows the top line, and the parallel shape makes it thicker, like one bright voice.', he: 'למה זה עובד: האוזן עוקבת אחרי הקו העליון, והצורה המקבילה מעבה אותו, כמו קול אחד מבריק.' },
      },
      {
        say: { en: 'How to hear it: if every chord sounds the same colour and the bass moves exactly with the melody, it is exact planing.', he: 'איך שומעים: אם כל אקורד נשמע באותו צבע והבס זז בדיוק עם המנגינה, זה פליינינג מדויק.' },
        play: [chord([56, 61, 64, 69], 0.8), chord([58, 63, 66, 71], 0.8), chord([59, 64, 67, 72], 0.8)],
      },
      {
        say: { en: 'A common slip is to change the shape on a hard note. Keep the same intervals under every note, even the chromatic ones.', he: 'טעות נפוצה היא לשנות את הצורה על צליל קשה. שמרו על אותם מרווחים מתחת לכל צליל, גם הכרומטיים.' },
      },
      {
        say: { en: 'The So What voicing is planing too: three fourths and a major third, moved up a half step and back.', he: 'קול So What הוא גם פליינינג: שלוש קוורטות וטרצה גדולה, חצי טון למעלה וחזרה.' },
        play: [chord([50, 55, 60, 65, 69], 1), chord([51, 56, 61, 66, 70], 1)],
      },
      {
        say: { en: 'Planing is colour, not function: nothing pulls. Use it on a held tonic or a long melody note.', he: 'פליינינג הוא צבע, לא פונקציה: שום דבר לא מושך. משתמשים בו על טוניקה ארוכה או על צליל מנגינה ארוך.' },
      },
      {
        say: { en: 'Choose the shape by the mood: major 7 is bright, minor 7 is soft, fourths sound open and modern.', he: 'בוחרים את הצורה לפי מצב הרוח: maj7 בהיר, ‏m7 רך, קוורטות נשמעות פתוחות ומודרניות.' },
        play: [chord([59, 64, 67, 72], 0.8), chord([58, 63, 67, 72], 0.8), chord([57, 62, 67, 72], 0.8)],
      },
      {
        say: { en: 'On the guitar the drop 2 shape lies under the fingers: keep the hand shape and slide it along the neck with the melody on string one.', he: 'בגיטרה צורת הדרופ 2 נמצאת מתחת לאצבעות: שומרים על צורת היד ומחליקים אותה לאורך הצוואר, המנגינה על מיתר אחד.' },
      },
      {
        say: { en: 'To keep: one shape, every note, the melody on top.', he: 'לזכור: צורה אחת, כל צליל, המנגינה למעלה.' },
      },
    ],
  },
  {
    id: 'approach-slip',
    area: 'harmony',
    emoji: '½',
    title: { en: 'Approach chords and side-slips', he: 'אקורדי גישה והחלקות הצידה' },
    takeaway: {
      en: 'Approach a chord from its own voicing a half step above or below (D♭maj7 → Cmaj7); side-slip a half step out and back on purpose.',
      he: 'מגיעים לאקורד מהקול שלו חצי טון מעל או מתחת (D♭maj7 → Cmaj7); מחליקים חצי טון החוצה וחזרה בכוונה.',
    },
    steps: [
      {
        say: { en: 'Play the target chord’s exact voicing a half step above, just before it. That is a planed approach.', he: 'מנגנים את הקול המדויק של אקורד היעד חצי טון מעליו, ממש לפניו. זו גישה מקבילה.' },
        play: [chord([49, 65, 68, 72], 0.6), chord([48, 64, 67, 71], 1.3)],
        show: { text: { en: 'D♭maj7 → Cmaj7', he: 'D♭maj7 → Cmaj7' } },
      },
      {
        say: { en: 'From below works too: B major 7 into C major 7. Every voice slides by a half step.', he: 'גם מלמטה עובד: Bmaj7 אל Cmaj7. כל קול מחליק בחצי טון.' },
        play: [chord([47, 63, 66, 70], 0.6), chord([48, 64, 67, 71], 1.3)],
      },
      {
        say: { en: 'Arrangers approach melody notes this way. It is not a dominant: it is a slide.', he: 'מעבדים מגיעים לצלילי מנגינה בדרך הזו. זו לא דומיננטה: זו החלקה.' },
        play: [chord([43, 59, 62, 65], 0.6), chord([48, 64, 67, 71], 1), rest(), chord([49, 65, 68, 72], 0.6), chord([48, 64, 67, 71], 1)],
      },
      {
        say: { en: 'A side-slip goes a half step out and comes back: D minor 7, E flat minor 7, D minor 7, over a dorian vamp.', he: 'החלקה הצידה יוצאת חצי טון החוצה וחוזרת: Dm7, ‏E♭m7, ‏Dm7, על וואמפ דורי.' },
        play: [chord([50, 55, 60, 65, 69], 0.9), chord([51, 56, 61, 66, 70], 0.9), chord([50, 55, 60, 65, 69], 1)],
      },
      {
        say: { en: 'Use it on strong melody notes, the ones on beat one: a short slide just before the beat makes the arrival sound planned.', he: 'משתמשים בזה על צלילי מנגינה חזקים, אלה שעל הפעמה הראשונה: החלקה קצרה ממש לפני הפעמה גורמת להגעה להישמע מתוכננת.' },
        play: [chord([49, 65, 68, 72], 0.5), chord([48, 64, 67, 71], 1)],
      },
      {
        say: { en: 'Play both in all twelve keys, free time first. Your turn.', he: 'מנגנים את שניהם בכל שנים־עשר הסולמות, קודם בזמן חופשי. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: a half step is the strongest pull there is, and when every voice slides together the ear accepts any chord on the way.', he: 'למה זה עובד: חצי טון הוא המשיכה החזקה ביותר שיש, וכשכל הקולות מחליקים יחד האוזן מקבלת כל אקורד בדרך.' },
      },
      {
        say: { en: 'How to hear it: a planed approach slides every voice; a dominant moves its 7th down to the next chord’s 3rd.', he: 'איך שומעים: גישה מקבילה מחליקה כל קול; דומיננטה מורידה את הספטימה שלה אל הטרצה של האקורד הבא.' },
        play: [chord([49, 65, 68, 72], 0.7), chord([48, 64, 67, 71], 0.9), chord([43, 59, 62, 65], 0.7), chord([48, 60, 64, 67], 0.9)],
      },
      {
        say: { en: 'Side-slipping is an improviser’s device too: play a phrase a half step out, then resolve. On the piano it works in the comping.', he: 'החלקה הצידה היא גם תחבולה של מאלתרים: מנגנים משפט חצי טון בחוץ, ואז פותרים. בפסנתר זה עובד בליווי.' },
      },
      {
        say: { en: 'A common slip is to stay out too long. One beat or one bar out, then back home.', he: 'טעות נפוצה היא להישאר בחוץ יותר מדי. פעמה אחת או תיבה אחת בחוץ, ואז חזרה הביתה.' },
      },
      {
        say: { en: 'The top level comps the side-slip on a dorian vamp at tempo, with the drums keeping the time.', he: 'הרמה העליונה מלווה את ההחלקה הצידה על וואמפ דורי בטמפו.' },
        play: [chord([50, 55, 60, 65, 69], 0.6), chord([51, 56, 61, 66, 70], 0.6), chord([50, 55, 60, 65, 69], 0.6)],
      },
      {
        say: { en: 'You can approach every chord of a phrase this way. The rhythm stays the same; only the half-step slide is added before each target, in the same voicing.', he: 'אפשר להגיע ככה לכל אקורד במשפט. הקצב נשאר אותו דבר; רק החלקת חצי הטון נוספת לפני כל יעד, באותו קול.' },
        play: [chord([47, 63, 66, 70], 0.5), chord([48, 64, 67, 71], 0.8), chord([46, 62, 65, 69], 0.5), chord([45, 61, 64, 68], 0.8)],
      },
      {
        say: { en: 'To keep: same voicing, a half step away, just before the target; out and back, on purpose.', he: 'לזכור: אותו קול, חצי טון ממנו, ממש לפני היעד; החוצה וחזרה, בכוונה.' },
      },
    ],
  },
  {
    id: 'modern-colours',
    area: 'harmony',
    emoji: '◇',
    title: { en: 'Modern colours: sus chords and maj7♯5', he: 'צבעים מודרניים: אקורדי סאס ו־maj7♯5' },
    takeaway: {
      en: 'Replace ii–V with one sus chord (F/G = G9sus4); string sus or maj7 chords without function; colour the tonic with maj7♯5.',
      he: 'מחליפים ii–V באקורד סאס אחד (F/G = G9sus4); משרשרים אקורדי סאס או maj7 בלי פונקציה; צובעים את הטוניקה ב־maj7♯5.',
    },
    steps: [
      {
        say: { en: 'A ii–V can become one chord: F over G. It holds the ii’s notes over the V’s bass, a G9sus4.', he: 'ii–V יכול להפוך לאקורד אחד: F מעל G. הוא מחזיק את הצלילים של ה־ii מעל הבס של ה־V, ‏G9sus4.' },
        play: [chord([50, 60, 65, 69], 0.7), chord([43, 59, 65, 69], 0.7), chord([48, 64, 67, 71], 1), rest(), chord([43, 65, 69, 72, 76], 1.2), chord([48, 64, 67, 71], 1)],
        show: { text: { en: 'Dm7 G7 → F/G', he: 'Dm7 G7 → F/G' } },
      },
      {
        say: { en: 'A sus chord has no 3rd pulling to the next chord. It floats.', he: 'לאקורד סאס אין טרצה שמושכת אל האקורד הבא. הוא מרחף.' },
        play: [chord([43, 60, 65, 69], 1.2)],
      },
      {
        say: { en: 'String sus chords on a moving bass and the music stops going anywhere: C7sus, A flat 7sus, B flat 7sus, G7sus.', he: 'משרשרים אקורדי סאס על בס נע והמוזיקה מפסיקה ללכת לאנשהו: C7sus, ‏A♭7sus, ‏B♭7sus, ‏G7sus.' },
        play: [chord([48, 58, 62, 65], 0.8), chord([44, 54, 58, 61], 0.8), chord([46, 56, 60, 63], 0.8), chord([43, 53, 57, 60], 0.8)],
      },
      {
        say: { en: 'Colour the tonic with major 7 sharp 5: E major over C. Brighter and less settled than major 7.', he: 'צובעים את הטוניקה ב־maj7♯5: E מז׳ור מעל C. בהיר יותר ופחות יציב מ־maj7.' },
        play: [chord([48, 64, 67, 71], 1), chord([48, 64, 68, 71], 1.2)],
        show: { text: { en: 'Cmaj7♯5 = E/C', he: 'Cmaj7♯5 = E/C' } },
      },
      {
        say: { en: 'These sounds came from the modal jazz of the sixties, where tunes rest on sus chords and move by colour rather than by cadence.', he: 'הצלילים האלה באו מהג׳אז המודאלי של שנות השישים, שבו שירים נחים על אקורדי סאס וזזים בצבע ולא בקדנצה.' },
        play: [chord([43, 60, 65, 69], 1), chord([46, 63, 68, 72], 1)],
      },
      {
        say: { en: 'Play them in all twelve keys. Your turn.', he: 'מנגנים אותם בכל שנים־עשר הסולמות. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: without the 3rd and 7th tritone there is nothing to resolve, so the ear hears colour, not direction.', he: 'למה זה עובד: בלי הטריטון של הטרצה והספטימה אין מה לפתור, והאוזן שומעת צבע ולא כיוון.' },
      },
      {
        say: { en: 'How to hear a sus: listen for the 4th where the 3rd would be. If it never falls, the chord stays sus.', he: 'איך שומעים סאס: מקשיבים לרביעית במקום שבו הטרצה הייתה. אם היא לא יורדת, האקורד נשאר סאס.' },
        play: [chord([43, 60, 62, 65], 0.9), chord([43, 59, 62, 65], 0.9)],
      },
      {
        say: { en: 'The sequences here are the app’s own, in the spirit of Herbie Hancock’s writing: sus or maj7 chords on roots that move freely.', he: 'הרצפים כאן של האפליקציה, ברוח הכתיבה של הרבי הנקוק: אקורדי סאס או maj7 על יסודות שזזים בחופשיות.' },
        play: [chord([48, 64, 67, 71], 0.8), chord([45, 61, 64, 68], 0.8), chord([44, 60, 63, 67], 0.8)],
      },
      {
        say: { en: 'A common slip is to resolve the sus by habit. Let it float, then go to the next sus without a 3rd.', he: 'טעות נפוצה היא לפתור את הסאס מתוך הרגל. תנו לו לרחף, ואז עברו לסאס הבא בלי טרצה.' },
      },
      {
        say: { en: 'maj7 sharp 5 is the lydian augmented sound. Over a ii–V it lands on a brighter, more open tonic.', he: 'maj7♯5 הוא הצליל הלידי־מוגדל. אחרי ii–V הוא נוחת על טוניקה בהירה ופתוחה יותר.' },
        play: [chord([50, 60, 65, 69], 0.7), chord([43, 59, 65, 69], 0.7), chord([48, 64, 68, 71], 1.2)],
      },
      {
        say: { en: 'On the guitar, F over G is an F triad on the top strings over a G bass: an easy way to play the sus reharm.', he: 'בגיטרה, F מעל G הוא משולש F על המיתרים העליונים מעל בס G: דרך קלה לנגן את הרמון הסאס.' },
        play: [chord([43, 65, 69, 72], 1.2)],
      },
      {
        say: { en: 'To keep: sus floats, maj7 sharp 5 shines, and a moving bass under one shape is colour, not function.', he: 'לזכור: סאס מרחף, maj7♯5 זוהר, ובס נע מתחת לצורה אחת הוא צבע ולא פונקציה.' },
      },
    ],
  },
  {
    id: 'organ-comping',
    area: 'jazz',
    emoji: '⫼',
    title: { en: 'Organ comping', he: 'ליווי באורגן' },
    takeaway: {
      en: 'The left hand walks the bass, the right hand holds a pad. Move one inner voice, thin the texture under a soloist, fill it out at the climax.',
      he: 'יד שמאל מהלכת בבס, יד ימין מחזיקה משטח. מזיזים קול פנימי אחד, מדללים את המרקם מתחת לסולן, וממלאים אותו בשיא.',
    },
    steps: [
      {
        say: { en: 'On the organ the left hand is the bass player. It walks: half notes first, then quarters.', he: 'באורגן יד שמאל היא נגן הבס. היא מהלכת: קודם חצאים, ואחר כך רבעים.' },
        play: [notes([41, 45, 48, 51, 46, 50, 53, 51], 0.4)],
        show: { notes: [41, 45, 48, 51], key: 'F', clef: 'bass' },
      },
      {
        say: { en: 'The right hand holds a pad of three notes, the 3rd, the 7th and the 9th, and moves each voice to the nearest note.', he: 'יד ימין מחזיקה משטח של שלושה צלילים, הטרצה, הספטימה והנונה, ומזיזה כל קול לצליל הקרוב.' },
        play: [chord([41, 57, 63, 67], 1.2), chord([46, 56, 62, 67], 1.2)],
        show: { text: { en: 'F7: A E♭ G · B♭7: A♭ D G', he: 'F7: A E♭ G · B♭7: A♭ D G' } },
      },
      {
        say: { en: 'Let one inner voice move while the others hold: a small counter-melody inside the pad.', he: 'נותנים לקול פנימי אחד לזוז והשאר נשארים: מלודיה נגדית קטנה בתוך המשטח.' },
        play: [chord([55, 60, 63], 0.7), chord([55, 59, 63], 0.7), chord([55, 58, 63], 0.7), chord([55, 57, 63], 0.7)],
      },
      {
        say: { en: 'Texture is the volume knob: two notes under a soloist, four at the climax.', he: 'המרקם הוא כפתור העוצמה: שני צלילים מתחת לסולן, ארבעה בשיא.' },
        play: [chord([57, 63], 1), chord([57, 62, 63, 67], 1)],
      },
      {
        say: { en: 'Organists often play without a bass player, so the left hand must keep steady time; the right hand answers the soloist with short pad changes.', he: 'נגני אורגן מנגנים הרבה פעמים בלי בסיסט, ולכן יד שמאל חייבת לשמור על זמן יציב; יד ימין עונה לסולן בשינויי משטח קצרים.' },
        play: [notes([41, 45, 48, 50, 46], 0.4)],
      },
      {
        say: { en: 'The levels play on the tonewheel organ, in all twelve keys. Your turn.', he: 'השלבים מתנגנים באורגן גלגלי הצליל, בכל שנים־עשר הסולמות. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the organ sustains, so a held pad fills the room and the walking line keeps the time moving.', he: 'למה זה עובד: האורגן מחזיק צליל, כך שמשטח מוחזק ממלא את החדר והקו המהלך שומר על הזמן בתנועה.' },
      },
      {
        say: { en: 'Drawbars shape the tone: 888 is the classic jazz setting, with the third-harmonic percussion on the attack.', he: 'הדרואברים מעצבים את הצליל: 888 הוא הכיוון הקלאסי לג׳אז, עם פרקשן ההרמוניה השלישית בהתקפה.' },
      },
      {
        say: { en: 'In a ballad, hold the pad and move the common-tone ladder on top: one note held while the chords under it change.', he: 'בבלדה מחזיקים את המשטח ומזיזים את סולם הצליל המשותף למעלה: צליל אחד נשאר והאקורדים מתחתיו משתנים.' },
        play: [chord([48, 64, 67, 71], 1), chord([44, 63, 67, 72], 1), chord([51, 63, 67, 70], 1)],
      },
      {
        say: { en: 'A common slip is to hold the pad too low. Keep it above the walking line so the bass stays clear.', he: 'טעות נפוצה היא להחזיק את המשטח נמוך מדי. השאירו אותו מעל הקו המהלך כדי שהבס יישאר ברור.' },
      },
      {
        say: { en: 'The walking hand is measured like a bass player: steady quarters, chord tones on the strong beats, a half step into each new root.', he: 'היד המהלכת נמדדת כמו נגן בס: רבעים יציבים, צלילי אקורד על הפעמות החזקות, חצי טון אל כל יסוד חדש.' },
        play: [notes([41, 45, 48, 47, 46], 0.4)],
      },
      {
        say: { en: 'Thin and full is a matter of voices: two notes leave room for the soloist, three or four add weight at the climax of a chorus.', he: 'דק ומלא זה עניין של קולות: שני צלילים משאירים מקום לסולן, שלושה או ארבעה מוסיפים משקל בשיא של סבב.' },
        play: [chord([57, 63], 0.9), chord([57, 63, 67], 0.9), chord([57, 62, 63, 67], 1)],
      },
      {
        say: { en: 'To keep: the left hand walks, the right hand holds a pad, one voice moves, and the texture follows the music.', he: 'לזכור: יד שמאל מהלכת, יד ימין מחזיקה משטח, קול אחד זז, והמרקם הולך עם המוזיקה.' },
      },
    ],
  },
  {
    id: 'pull-or-paint',
    area: 'harmony',
    emoji: '⇄',
    title: { en: 'Functional or colour reharm', he: 'הרמון פונקציונלי או צבע' },
    takeaway: {
      en: 'Functional reharms do the old chord’s job (pull or rest); colour reharms change the light, not the direction.',
      he: 'הרמון פונקציונלי עושה את העבודה של האקורד הישן (מושך או נח); הרמון צבע משנה את האור, לא את הכיוון.',
    },
    steps: [
      {
        say: { en: 'Every reharm belongs to one of two families. Functional chords pull toward the next chord, like a tritone sub.', he: 'כל הרמון מחדש שייך לאחת משתי משפחות. אקורדים פונקציונליים מושכים אל האקורד הבא, כמו תחליף טריטון.' },
        play: [chord([50, 60, 65, 69], 0.8), chord([49, 59, 65, 68], 0.8), chord([48, 59, 64, 67], 1.1)],
        show: { text: { en: 'Dm7 – D♭7 – Cmaj7', he: 'Dm7 – D♭7 – Cmaj7' } },
      },
      {
        say: { en: 'Colour chords paint: a chromatic mediant changes the light while nothing pulls.', he: 'אקורדי צבע צובעים: מדיאנטה כרומטית משנה את האור ושום דבר לא מושך.' },
        play: [chord([48, 64, 67, 71], 0.9), chord([44, 63, 67, 72], 0.9), chord([48, 64, 67, 71], 1)],
      },
      {
        say: { en: 'Functional: secondary dominants, tritone subs, an added ii–V, the backdoor, passing diminished chords.', he: 'פונקציונלי: דומיננטות משניות, תחליפי טריטון, ii–V נוסף, הדלת האחורית, דימיניש עובר.' },
        play: [chord([48, 64, 67, 71], 0.7), chord([49, 64, 67, 70], 0.7), chord([50, 65, 69, 72], 0.9)],
      },
      {
        say: { en: 'Colour: common tones, mediants, modal interchange, pedal point, planing, side-slips.', he: 'צבע: צלילים משותפים, מדיאנטות, השאלה מודאלית, פדל, פליינינג, החלקות הצידה.' },
        play: [chord([43, 62, 65, 69], 0.8), chord([43, 63, 68, 72], 0.8)],
      },
      {
        say: { en: 'A quick test: play the new chord and stop. If you want to hear the next chord at once, it pulls; if it could stay forever, it paints. Ask that question about every reharm you choose.', he: 'בדיקה מהירה: מנגנים את האקורד החדש ועוצרים. אם רוצים לשמוע מיד את האקורד הבא, הוא מושך; אם הוא יכול להישאר לנצח, הוא צובע. שאלו את השאלה הזו על כל הרמון שאתם בוחרים.' },
        play: [chord([43, 59, 62, 65], 1.2), rest(0.6), chord([44, 63, 67, 72], 1.2)],
      },
      {
        say: { en: 'Sort each device, then hear it: does it pull, or paint? Your turn.', he: 'ממיינים כל תחבולה, ואז שומעים אותה: היא מושכת, או צובעת? תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it matters: a reharm is valid when the melody note is a chord tone or tension of the new chord, and good when the voices move smoothly.', he: 'למה זה חשוב: הרמון מחדש תקין כשצליל המנגינה הוא צליל אקורד או טנשן של האקורד החדש, וטוב כשהקולות זזים בחלקות.' },
      },
      {
        say: { en: 'How to hear a functional chord: a 7th falling to the next 3rd, a bass moving by fifths or half steps into a goal.', he: 'איך שומעים אקורד פונקציונלי: ספטימה שיורדת אל הטרצה הבאה, בס שזז בקווינטות או בחצאי טון אל יעד.' },
        play: [chord([43, 59, 62, 65], 0.8), chord([48, 60, 64, 67], 1)],
      },
      {
        say: { en: 'How to hear colour: the chord could stay where it is. It is a new shade, not a step on the way.', he: 'איך שומעים צבע: האקורד יכול להישאר במקומו. זה גוון חדש, לא צעד בדרך.' },
        play: [chord([48, 64, 67, 71], 0.8), chord([48, 64, 68, 71], 1)],
      },
      {
        say: { en: 'A common slip is to mix them without a plan. Use function where the tune moves and colour where it rests.', he: 'טעות נפוצה היא לערבב אותם בלי תוכנית. השתמשו בפונקציה איפה שהשיר זז ובצבע איפה שהוא נח.' },
      },
      {
        say: { en: 'Some devices do both: the backdoor is functional, and it is also borrowed from minor.', he: 'יש תחבולות שעושות את שניהם: הדלת האחורית פונקציונלית, והיא גם שאולה מהמינור.' },
        play: [chord([41, 56, 60, 63], 0.8), chord([46, 56, 62, 65], 0.8), chord([48, 64, 67, 71], 1)],
      },
      {
        say: { en: 'The ear items play a short demo of each device in a random key; answer by the feeling, then check the name in the Why line.', he: 'התרגילים בשמיעה מנגנים הדגמה קצרה של כל תחבולה בסולם אקראי; עונים לפי התחושה, ואז בודקים את השם בשורת ההסבר.' },
      },
      {
        say: { en: 'To keep: function pulls, colour paints; check the melody first, then the voice leading.', he: 'לזכור: פונקציה מושכת, צבע צובע; בודקים את המנגינה, ואז את הובלת הקולות.' },
      },
    ],
  },
  {
    id: 'jazz-deceptive',
    area: 'harmony',
    emoji: '↷',
    title: { en: 'Jazz deceptive resolutions', he: 'הטעיות בג׳אז' },
    takeaway: {
      en: 'V7 can go anywhere but I: to ♭VImaj7, to iii, to IV, or through VI7 to ii. The surprise keeps the tune moving.',
      he: 'V7 יכול ללכת לכל מקום חוץ מ־I: אל ♭VImaj7, אל iii, אל IV, או דרך VI7 אל ii. ההפתעה ממשיכה את השיר.',
    },
    steps: [
      {
        say: { en: 'G7 wants C major 7. A deceptive resolution goes somewhere else.', he: 'G7 רוצה Cmaj7. הטעיה הולכת למקום אחר.' },
        play: [chord([43, 59, 65, 69], 0.9), chord([48, 64, 67, 71], 1.1)],
      },
      {
        say: { en: 'G7 to A flat major 7: the bass steps up a half step to a borrowed chord.', he: 'G7 אל A♭maj7: הבס עולה חצי טון אל אקורד שאול.' },
        play: [chord([43, 59, 65, 69], 0.9), chord([44, 60, 63, 67], 1.1)],
      },
      {
        say: { en: 'G7 to E minor 7 keeps the melody on E and delays the tonic.', he: 'G7 אל Em7 משאיר את המנגינה על מי ודוחה את הטוניקה.' },
        play: [chord([43, 59, 65, 69], 0.9), chord([40, 59, 62, 67], 1.1)],
      },
      {
        say: { en: 'Or G7 to A7, which goes on to D minor 7: a new ii–V begins.', he: 'או G7 אל A7, שממשיך אל Dm7: מתחיל ii–V חדש.' },
        play: [chord([43, 59, 65, 69], 0.8), chord([45, 61, 64, 67], 0.8), chord([50, 60, 65, 69], 1)],
      },
      {
        say: { en: 'Another favourite is G7 to F major 7: the bass steps down, the melody can stay, and the cadence turns into a new phrase instead of an ending. Listen for the bass first, then name the chord it lands on.', he: 'עוד אהוב הוא G7 אל Fmaj7: הבס יורד בצעד, המנגינה יכולה להישאר, והקדנצה הופכת למשפט חדש במקום סוף. הקשיבו קודם לבס, ואז תנו שם לאקורד שהוא נוחת עליו.' },
        play: [chord([43, 59, 65, 69], 0.9), chord([41, 57, 64, 67], 1.1)],
      },
      {
        say: { en: 'Listen to where V7 goes, then name it. Your turn.', he: 'הקשיבו לאן ה־V7 הולך, ואז תנו לזה שם. תורכם.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the V7 sets up a strong expectation, and any chord that shares its leading note or bass motion can answer it.', he: 'למה זה עובד: ה־V7 יוצר ציפייה חזקה, וכל אקורד שחולק איתו את הצליל המוביל או את תנועת הבס יכול לענות לו.' },
      },
      {
        say: { en: 'The classical one is V to vi. In jazz the favourites are flat VI major 7 and IV major 7.', he: 'הקלאסית היא V אל vi. בג׳אז האהובים הם ♭VImaj7 ו־IVmaj7.' },
        play: [chord([43, 59, 65, 69], 0.8), chord([41, 57, 64, 67], 1)],
      },
      {
        say: { en: 'How to hear it: follow the bass after the V. Up a half step is flat VI, down a step is IV, up a step goes to VI7.', he: 'איך שומעים: עקבו אחרי הבס אחרי ה־V. חצי טון למעלה זה ♭VI, צעד למטה זה IV, צעד למעלה הולך אל VI7.' },
      },
      {
        say: { en: 'A common slip is to hear every surprise as a mistake. In a standard it often marks the end of a section.', he: 'טעות נפוצה היא לשמוע כל הפתעה כטעות. בסטנדרט היא מסמנת הרבה פעמים סוף של חלק.' },
        play: [chord([50, 60, 65, 69], 0.7), chord([43, 59, 65, 69], 0.7), chord([44, 60, 63, 67], 1)],
      },
      {
        say: { en: 'On the piano, play G7 to each target with smooth voice leading: the 7th falls, the 3rd moves by step.', he: 'בפסנתר נגנו G7 אל כל יעד בהובלת קולות חלקה: הספטימה יורדת, הטרצה זזה בצעד.' },
      },
      {
        say: { en: 'The bass player hears it first: plan the walking line to the new target so the band lands together.', he: 'נגן הבס שומע את זה ראשון: מתכננים את קו הווקינג אל היעד החדש כדי שהלהקה תנחת יחד.' },
        play: [notes([43, 42, 44], 0.5)],
      },
      {
        say: { en: 'To keep: V7 to anything but I is a deceptive resolution; follow the bass to name it.', he: 'לזכור: V7 לכל מקום חוץ מ־I זו הטעיה; עקבו אחרי הבס כדי לתת לה שם.' },
      },
    ],
  },
];

const RH_LESSON: Record<string, string> = { 'rh-mi': 'modal-mix', 'rh-pedalpt': 'pedal-point', 'rh-planemel': 'planing-melody', 'rh-approach': 'approach-slip', 'rh-slip': 'approach-slip', 'rh-sus': 'modern-colours', 'rh-modern': 'modern-colours', 'rh-maj7s5': 'modern-colours' };
const G_LESSON = (kind: string): string => (kind.startsWith('gop') ? 'pedal-point' : kind.startsWith('gmi') ? 'modal-mix' : kind.startsWith('gmd') ? 'chromatic-mediants' : kind === 'gpl-melody' ? 'planing-melody' : kind === 'gss-slip' ? 'approach-slip' : 'modern-colours');
const B_LESSON = (kind: string): string =>
  ['bc-pedal', 'bc-dompedal', 'bc-push'].includes(kind) ? 'pedal-point' : ['bc-ctroots', 'bc-ctwalk'].includes(kind) ? 'ct-one-note' : kind === 'bc-thirds' ? 'chromatic-mediants' : kind === 'bc-counter' ? 'bass-counter-line' : 'modal-mix';

/** The lesson each topic and level opens with (App.tsx gate: "topic:<id>", "tech:<family>", "tech:<level id>"). */
export const UNITS: Record<string, string> = {
  'topic:ct-degree': 'ct-one-note',
  'topic:mediants': 'chromatic-mediants',
  'topic:pedal-ear': 'pedal-point',
  'topic:approach-chord': 'approach-slip',
  'topic:counter-line': 'bass-counter-line',
  'topic:modern-color': 'modern-colours',
  'topic:func-color': 'pull-or-paint',
  'topic:modal-mix': 'modal-mix',
  'tech:k-ctone': 'ct-one-note',
  'tech:g-ctone': 'ct-one-note',
  'tech:k-mediant': 'chromatic-mediants',
  'tech:k-organ': 'organ-comping',
  'tech:g-color': 'modal-mix',
  'tech:b-counter': 'bass-counter-line',
  'tech:k-tune-10': 'modal-mix',
  // HARMONY-REHARM still open: the bass hears borrowed chords (b-ear 24).
  'tech:b-ear-24': 'modal-mix',
  ...Object.fromEntries(CT_ROWS.map((r, i) => [`tech:k-ctone-${i + 1}`, r.kind === 'ct-counter' ? 'bass-counter-line' : 'ct-one-note'])),
  ...Object.fromEntries(RH_ROWS.map((r, i) => [`tech:k-reharm-${RH_FIRST + i}`, RH_LESSON[r.kind]])),
  ...Object.fromEntries(GCOL_ROWS.map((r, i) => [`tech:g-color-${i + 1}`, G_LESSON(r.kind)])),
  ...Object.fromEntries(BC_ROWS.map((r, i) => [`tech:b-counter-${i + 1}`, B_LESSON(r.kind)])),
};

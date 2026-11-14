// THEORY_PLAY (docs/AUDIT-CONTENT-THEORY.md §ז.2, TP-1…TP-5): quick lessons for theory you play — triad pairs,
// pentatonic superimposition, polychords and their role, reharmonising a melody yourself, the keys family and the
// guitar block (rootless on two string sets, So What, Giant Steps). Every fact matches src/engine/theoryPlay.ts and
// its tests. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';
import { pairStimOf } from '../../engine/topicsTheoryPlay';

const chord = (midis: number[], duration = 1.6): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

export const LESSONS: MiniLesson[] = [
  {
    id: 'triad-pairs',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Triad pairs', he: 'זוגות משולשים' },
    takeaway: { en: 'Two triads with no common note give six notes: a chord scale minus one tone. G♭ + A♭ over C7alt, D + Em over Cmaj7♯11, E♭ + F over Cm7.', he: 'שני משולשים בלי צליל משותף נותנים שישה צלילים: סולם האקורד פחות צליל אחד. G♭ + A♭ מעל C7alt‏, D + Em מעל Cmaj7♯11‏, E♭ + F מעל Cm7.' },
    steps: [
      {
        say: { en: 'Hi {name}! Take two triads that share no note. Over C minor 7: E flat major and F major.', he: 'היי {name}! לוקחים שני משולשים בלי צליל משותף. מעל דו מינור 7: מי במול מז׳ור ופה מז׳ור.' },
        play: [chord([63, 67, 70], 0.9), chord([65, 69, 72], 0.9)],
        show: { text: { en: 'E♭ + F / Cm7', he: 'E♭ + F / Cm7' } },
      },
      {
        say: { en: 'Together they are six notes of C dorian. Only the 9th, D, is left out.', he: 'יחד הם שישה צלילים של דו דורי. רק ה־9, רה, נשאר בחוץ.' },
        play: [pairStimOf('dorian', 0)],
        show: { text: { en: '♭3 5 ♭7 · 11 13 1', he: '♭3 5 ♭7 · 11 13 1' } },
      },
      {
        say: { en: 'Over C7alt: G flat and A flat. Root, flat 9, sharp 9, flat 5, flat 13, flat 7. The altered scale without its 3rd.', he: 'מעל C7alt: סול במול ולה במול. יסוד, ‏♭9, ‏♯9, ‏♭5, ‏♭13, ‏♭7. הסולם האלטרד בלי הטרצה.' },
        play: [pairStimOf('altered', 0)],
        show: { text: { en: 'G♭ + A♭ / C7alt', he: 'G♭ + A♭ / C7alt' } },
      },
      {
        say: { en: 'Over C major 7 sharp 11: D and E minor. 9, sharp 11, 13, then 3, 5, 7: lydian without the root.', he: 'מעל Cmaj7♯11: רה ומי מינור. 9, ‏♯11, 13, ואז 3, 5, 7: לידי בלי היסוד.' },
        play: [pairStimOf('lydian', 0)],
        show: { text: { en: 'D + Em / Cmaj7♯11', he: 'D + Em / Cmaj7♯11' } },
      },
      {
        say: { en: 'Your turn: name the pair for each chord, then hear its colour over the chord and tell dorian, lydian and altered apart.', he: 'תורכם: מצאו את הזוג לכל אקורד, ואז שמעו את הצבע שלו מעל האקורד והבדילו בין דורי, לידי ואלטרד.' },
      },
    ],
    more: [
      {
        say: { en: 'Where do you hear this? Saxophone and piano players of the 1970s and after, over modal vamps and altered dominants, use pairs to sound open and modern while staying exactly on the chord.', he: 'איפה שומעים את זה? נגני סקסופון ופסנתר משנות השבעים והלאה, מעל וואמפים מודאליים ודומיננטים אלטרד, משתמשים בזוגות כדי להישמע פתוח ומודרני ועדיין בדיוק על האקורד.' },
      },
      {
        say: { en: 'Why pairs? Two small shapes, each easy under the hand, give a wide modern sound with no scale running.', he: 'למה זוגות? שתי צורות קטנות, כל אחת נוחה ליד, נותנות צליל מודרני ורחב בלי לרוץ בסולם.' },
      },
      {
        say: { en: 'D and E major is a different pair: G sharp is the sharp 5. Over C major 7 sharp 5 that is lydian augmented.', he: 'רה ומי מז׳ור זה זוג אחר: סול דיאז הוא ♯5. מעל Cmaj7♯5 זה לידי מוגדל.' },
        play: [pairStimOf('lydian-aug', 0)],
      },
      {
        say: { en: 'Over a plain dominant: B flat and C give mixolydian without the 13th; C and D give lydian dominant without the 7th.', he: 'מעל דומיננט רגיל: סי במול ודו נותנים מיקסולידי בלי ה־13; דו ורה נותנים לידי דומיננטי בלי הספטימה.' },
        play: [pairStimOf('mixolydian', 0), rest(), pairStimOf('lydian-dom', 0)],
      },
      {
        say: { en: 'Play them in inversions: A, then B, then A from its 3rd, B from its 3rd, and so on. The line climbs without a leap.', he: 'מנגנים אותם בהיפוכים: A, אחר כך B, אחר כך A מהטרצה, B מהטרצה, וכן הלאה. הקו מטפס בלי קפיצה.' },
      },
      {
        say: { en: 'A common mistake is to run the six notes as a scale. Keep them as two triads: three notes, then three, and let the line jump between the shapes. That jump is the sound.', he: 'טעות נפוצה היא לרוץ על שישת הצלילים כמו על סולם. שמרו אותם כשני משולשים: שלושה צלילים, ואז שלושה, ותנו לקו לקפוץ בין הצורות. הקפיצה הזו היא הצליל.' },
      },
      {
        say: { en: 'To keep: find the one tone the six leave out. It tells you the scale.', he: 'מה לזכור: מצאו את הצליל האחד ששישה הצלילים משמיטים. הוא מגלה את הסולם.' },
        show: { text: { en: 'six notes = scale − 1', he: 'שישה צלילים = סולם פחות 1' } },
      },
    ],
  },
  {
    id: 'pent-super',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Pentatonic superimposition', he: 'פנטטוני מוסט' },
    takeaway: { en: 'A pentatonic built on another note colours the chord: G major pentatonic over Cmaj7 is inside, D major is lydian, E♭ minor over C7alt is altered.', he: 'פנטטוני שנבנה על צליל אחר צובע את האקורד: סול מז׳ור פנטטוני מעל Cmaj7 פנימי, רה מז׳ור לידי, מי במול מינור מעל C7alt אלטרד.' },
    steps: [
      {
        say: { en: 'Hi {name}! Over C major 7, G major pentatonic gives 5, 13, 7, 9, 3. Every note is safe.', he: 'היי {name}! מעל Cmaj7, סול מז׳ור פנטטוני נותן 5, 13, 7, 9, 3. כל צליל בטוח.' },
        play: [chord([48, 64, 67, 71], 1), notes([67, 69, 71, 74, 76])],
        show: { text: { en: 'G pent / Cmaj7', he: 'G פנט׳ / Cmaj7' } },
      },
      {
        say: { en: 'Move it up to D: D, E, F sharp, A, B. Now the F sharp is a sharp 11. That is the lydian colour.', he: 'מזיזים לרה: רה, מי, פה דיאז, לה, סי. עכשיו פה דיאז הוא ♯11. זה הצבע הלידי.' },
        play: [chord([48, 64, 67, 71], 1), notes([62, 64, 66, 69, 71])],
        show: { text: { en: '9 3 ♯11 13 7', he: '9 3 ♯11 13 7' } },
      },
      {
        say: { en: 'Over C7alt, E flat minor pentatonic: sharp 9, flat 5, flat 13, flat 7, flat 9. Five notes, all altered colour.', he: 'מעל C7alt, מי במול מינור פנטטוני: ‏♯9, ‏♭5, ‏♭13, ‏♭7, ‏♭9. חמישה צלילים, כולם צבע אלטרד.' },
        play: [chord([48, 64, 70, 75], 1), notes([63, 66, 68, 70, 73])],
      },
      {
        say: { en: 'Over C minor 7, D minor pentatonic gives 9, 11, 5, 13 and the root: a dorian sound.', he: 'מעל Cm7, רה מינור פנטטוני נותן 9, 11, 5, 13 והיסוד: צליל דורי.' },
        play: [chord([48, 63, 67, 70], 1), notes([62, 65, 67, 69, 72])],
      },
      {
        say: { en: 'Your turn: pick the pentatonic for a colour, read its degrees over the chord, then hear which one is playing.', he: 'תורכם: בחרו פנטטוני לצבע, קראו את הדרגות שלו מעל האקורד, ואז שמעו איזה מתנגן.' },
      },
    ],
    more: [
      {
        say: { en: 'Name each note against the chord root, not the pentatonic’s. That is how you know what you are adding.', he: 'קוראים לכל צליל מול יסוד האקורד, לא מול יסוד הפנטטוני. כך יודעים מה מוסיפים.' },
      },
      {
        say: { en: 'Listen to the same chord with two pentatonics: G major is calm and inside, D major lifts with the sharp 11. Same shape, a 5th apart.', he: 'הקשיבו לאותו אקורד עם שני פנטטוניים: סול מז׳ור רגוע ופנימי, רה מז׳ור מתרומם עם ה־♯11. אותה צורה, קווינטה ביניהם.' },
        play: [chord([48, 64, 67, 71], 1), notes([67, 69, 71, 74, 76], 0.24), rest(), chord([48, 64, 67, 71], 1), notes([62, 64, 66, 69, 71], 0.24)],
      },
      {
        say: { en: 'A common slip: D minor pentatonic over C major 7. It holds F, the 11th, which clashes with the 3rd. Keep it for C minor 7.', he: 'טעות נפוצה: רה מינור פנטטוני מעל Cmaj7. יש בו פה, ה־11, שמתנגש בטרצה. שמרו אותו ל־Cm7.' },
      },
      {
        say: { en: 'Play it in groups of four: 1-2-3-4, 2-3-4-5, up the neck or the keyboard. The groups cross the beat and sound like a line, not a scale.', he: 'מנגנים בקבוצות של ארבעה: 1-2-3-4, ‏2-3-4-5, במעלה הצוואר או המקלדת. הקבוצות חוצות את הפעמה ונשמעות כמו קו, לא כמו סולם.' },
      },
      {
        say: { en: 'Over the altered dominant the same trick works a half step above the root: E flat minor pentatonic over C7 gives every altered tension and resolves well to F.', he: 'מעל הדומיננט האלטרד אותו טריק עובד חצי טון מעל היסוד: מי במול מינור פנטטוני מעל C7 נותן את כל המתחים האלטרד ונפתר יפה לפה.' },
        play: [chord([48, 64, 70, 75], 1), notes([75, 73, 70, 68, 66], 0.24), chord([41, 57, 64, 69], 1.2)],
      },
      {
        say: { en: 'Practise it slowly over a vamp first, then over a ii–V–I: a different pentatonic on each chord, chosen for the colour you want to hear, not for the key of the tune.', he: 'תרגלו קודם לאט מעל וואמפ, ואז מעל ii–V–I: פנטטוני אחר על כל אקורד, שנבחר לפי הצבע שאתם רוצים לשמוע, לא לפי הסולם של השיר.' },
      },
      {
        say: { en: 'To keep: same five-note shape, new root, new colour.', he: 'מה לזכור: אותה צורה של חמישה צלילים, יסוד חדש, צבע חדש.' },
        show: { text: { en: 'G = inside · D = ♯11 · E♭m = alt', he: 'G = פנימי · D = ♯11 · E♭m = אלטרד' } },
      },
    ],
  },
  {
    id: 'polychords',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Polychords and what they do', he: 'פוליאקורדים ותפקידם' },
    takeaway: { en: 'C/E is an inversion, D/C an upper structure (lydian), F/G a dominant sus. A triad over a 7th chord names its colour: D/C7 = 13♯11, A♭/C7 = 7♯9♭13.', he: 'C/E הוא היפוך, D/C מבנה עליון (לידי), F/G דומיננט sus. משולש מעל ספטאקורד קובע את הצבע: D/C7 = 13♯11‏, A♭/C7 = 7♯9♭13.' },
    steps: [
      {
        say: { en: 'Hi {name}! Three slash chords look alike. C over E: E is in the C triad, so it is just C with the 3rd in the bass.', he: 'היי {name}! שלושה אקורדים עם לוכסן נראים דומה. C מעל E: מי נמצא במשולש של דו, אז זה פשוט דו עם הטרצה בבס.' },
        play: [chord([40, 60, 64, 67])],
        show: { text: { en: 'C/E = inversion', he: 'C/E = היפוך' } },
      },
      {
        say: { en: 'D over C: the bass is not in the triad. D, F sharp, A over C are 9, sharp 11, 13. An upper structure, the lydian sound.', he: 'D מעל C: הבס לא במשולש. רה, פה דיאז, לה מעל דו הם 9, ‏♯11, 13. מבנה עליון, הצליל הלידי.' },
        play: [chord([36, 62, 66, 69])],
        show: { text: { en: 'D/C = upper structure', he: 'D/C = מבנה עליון' } },
      },
      {
        say: { en: 'F over G: F, A, C over G are flat 7, 9, 11. A dominant with a 4th instead of a 3rd: G9 sus. It still wants to go to C.', he: 'F מעל G: פה, לה, דו מעל סול הם ♭7, ‏9, 11. דומיננט עם קוורטה במקום טרצה: G9sus. הוא עדיין רוצה ללכת לדו.' },
        play: [chord([43, 65, 69, 72], 1.2), chord([36, 64, 67, 72])],
        show: { text: { en: 'F/G = G9sus', he: 'F/G = G9sus' } },
      },
      {
        say: { en: 'Over a dominant, the triad names the colour. D over C7: 13 sharp 11, lydian dominant. A flat over C7: sharp 9, flat 13, altered.', he: 'מעל דומיננט, המשולש קובע את הצבע. D מעל C7: ‏13♯11, לידי דומיננטי. A♭ מעל C7: ‏♯9, ‏♭13, אלטרד.' },
        play: [chord([36, 52, 58, 62, 66, 69], 1.4), rest(), chord([36, 52, 58, 63, 68, 72], 1.4)],
      },
      {
        say: { en: 'Your turn: tell inversion, upper structure and sus apart, on paper and by ear.', he: 'תורכם: הבדילו בין היפוך, מבנה עליון ו־sus, בכתב ובשמיעה.' },
      },
    ],
    more: [
      {
        say: { en: 'The rule: bass inside the triad, an inversion. Triad a step above the bass, lydian. A step below, sus.', he: 'הכלל: הבס בתוך המשולש, היפוך. משולש טון מעל הבס, לידי. טון מתחת, sus.' },
      },
      {
        say: { en: 'Careful in a progression: D over C before G is also D7 in third inversion, the V of V, leading to G over B.', he: 'זהירות בתוך מהלך: D מעל C לפני G הוא גם D7 בהיפוך שלישי, ה־V של V, שמוביל ל־G מעל B.' },
        play: [chord([36, 62, 66, 69], 1), chord([35, 62, 67, 71])],
      },
      {
        say: { en: 'Natural tensions are 9 and 13, with sharp 11 for lydian dominant. Altered ones are flat 9, sharp 9, flat 13. G minor over C7 is natural: a plain C9.', he: 'מתחים טבעיים הם 9 ו־13, ועם ♯11 לידי דומיננטי. מתחים אלטרד הם ‏♭9, ‏♯9, ‏♭13. סול מינור מעל C7 טבעי: C9 פשוט.' },
        play: [chord([36, 52, 58, 62, 67, 70], 1.4)],
      },
      {
        say: { en: 'Upper structures work over major 7 and minor 7 too. G over C major 7 is a major 9; F over C minor 7 is 11, 13 and the root, dorian.', he: 'מבנים עליונים עובדים גם מעל maj7 ו־m7. G מעל Cmaj7 הוא maj9; ‏F מעל Cm7 הוא 11, 13 והיסוד, דורי.' },
        play: [chord([36, 52, 59, 62, 67, 71], 1.4), rest(), chord([36, 51, 58, 65, 69, 72], 1.4)],
      },
      {
        say: { en: 'Pianists voice these with the left hand on 3rd and 7th and the right hand on the triad, so the colour sits on top and the function stays clear underneath.', he: 'פסנתרנים מנגנים אותם עם יד שמאל על הטרצה והספטימה ויד ימין על המשולש, כך שהצבע יושב למעלה והתפקיד נשאר ברור מתחת.' },
      },
      {
        say: { en: 'By ear, start from the bass: if it doubles a note of the triad you hear an inversion; if it sits under it, a new chord.', he: 'בשמיעה, התחילו מהבס: אם הוא מכפיל צליל של המשולש, זה היפוך; אם הוא יושב מתחתיו, זה אקורד חדש.' },
      },
      {
        say: { en: 'To keep: read the triad against the bass. Its notes are the chord’s colours.', he: 'מה לזכור: קראו את המשולש מול הבס. הצלילים שלו הם הצבעים של האקורד.' },
        show: { text: { en: 'in = inv · +2 = lydian · −2 = sus', he: 'בפנים = היפוך · ‎+2 = לידי · ‎−2 = sus' } },
      },
    ],
  },
  {
    id: 'reharm-own',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Reharmonise it yourself', he: 'ריהרמנו בעצמכם' },
    takeaway: { en: 'A new chord works when it does the old one’s job (leads to the same place) and the melody note is its chord tone or tension.', he: 'אקורד חדש עובד כשהוא עושה את העבודה של הישן (מוביל לאותו מקום) וצליל המנגינה הוא צליל אקורד או מתח שלו.' },
    steps: [
      {
        say: { en: 'Hi {name}! G7 goes to C. Three dominants can do that job: G7, its tritone sub D flat 7, and the backdoor B flat 7.', he: 'היי {name}! G7 הולך לדו. שלושה דומיננטים יכולים לעשות את העבודה: G7, תחליף הטריטון D♭7, והדלת האחורית B♭7.' },
        play: [chord([43, 59, 65, 69], 0.9), chord([36, 64, 67, 71], 0.9), rest(), chord([37, 59, 65, 68], 0.9), chord([36, 64, 67, 71], 0.9), rest(), chord([34, 62, 65, 68], 0.9), chord([36, 64, 67, 71], 0.9)],
        show: { text: { en: 'G7 · D♭7 · B♭7 → C', he: 'G7 · D♭7 · B♭7 → C' } },
      },
      {
        say: { en: 'Now the melody. If it sings C, G7 has it as the 11th and D flat 7 as the major 7th. Both clash. B flat 7 has it as the 9th.', he: 'עכשיו המנגינה. אם היא שרה דו, ל־G7 זה ה־11 ול־D♭7 זו הספטימה הגדולה. שניהם מתנגשים. ל־B♭7 זה ה־9.' },
        play: [chord([34, 62, 65, 68, 72], 1.4), chord([36, 64, 67, 71, 72], 1.4)],
      },
      {
        say: { en: 'Between C and D minor, the passing C sharp diminished, A7 or E flat 7 all lead to D minor. Pick the one that holds the melody.', he: 'בין דו לרה מינור, דו דיאז מוקטן עובר, A7 או E♭7 מובילים כולם לרה מינור. בחרו את זה שמחזיק את המנגינה.' },
        play: [chord([48, 64, 67, 71], 0.8), chord([49, 64, 67, 70], 0.8), chord([50, 65, 69, 72])],
      },
      {
        say: { en: 'Over one long minor chord, a line cliché: C minor, minor-major 7, minor 7, minor 6. One voice falls by half steps.', he: 'מעל אקורד מינור ארוך אחד, ליין קלישה: דו מינור, מינור־מז׳ור 7, מינור 7, מינור 6. קול אחד יורד בחצאי טונים.' },
        play: [chord([48, 60, 63, 67], 0.8), chord([48, 59, 63, 67], 0.8), chord([48, 58, 63, 67], 0.8), chord([48, 57, 63, 67], 0.8)],
      },
      {
        say: { en: 'Your turn: play the root, the 3rd, the 7th and the melody note. Any octave counts.', he: 'תורכם: נגנו יסוד, טרצה, ספטימה וצליל המנגינה. כל אוקטבה נחשבת.' },
        show: { text: { en: 'job + melody', he: 'תפקיד + מנגינה' } },
      },
    ],
    more: [
      {
        say: { en: 'Over a dominant the melody may be any tension but the natural 11th and the major 7th. Over major 7, avoid the 11th; over minor 7, the flat 13.', he: 'מעל דומיננט המנגינה יכולה להיות כל מתח חוץ מה־11 הטבעי והספטימה הגדולה. מעל maj7 נמנעים מה־11; מעל m7 מה־♭13.' },
      },
      {
        say: { en: 'Why the root? A tritone sub shares its 3rd and 7th with the V. Without the root nobody hears that you changed it.', he: 'למה היסוד? תחליף טריטון חולק טרצה וספטימה עם ה־V. בלי היסוד אף אחד לא שומע שהחלפתם.' },
        play: [chord([53, 59], 0.9), rest(0.2), chord([43, 53, 59], 0.9), rest(0.2), chord([37, 53, 59], 0.9)],
      },
      {
        say: { en: 'An added ii–V splits a bar of V into ii and V: C, then D minor 7 G7, then C. The ii must hold the melody too.', he: 'ii–V נוסף מחלק תיבה של V ל־ii ול־V: דו, אחר כך Dm7 G7, ואז דו. גם ה־ii צריך להחזיק את המנגינה.' },
      },
      {
        say: { en: 'The backdoor sounds softer than the tritone sub: F minor 7 to B flat 7 to C borrows from C minor and lands warmly. Hear it under the melody note G.', he: 'הדלת האחורית נשמעת רכה יותר מתחליף הטריטון: Fm7 ל־B♭7 לדו שואל מדו מינור ונוחת בחום. שמעו אותה מתחת לצליל המנגינה סול.' },
        play: [chord([41, 56, 60, 63, 67], 0.9), chord([34, 56, 62, 65, 67], 0.9), chord([36, 59, 64, 67], 1.2)],
      },
      {
        say: { en: 'A good habit: write the melody note above each bar, list the chords that do the bar’s job, and cross out every one that clashes with the note. What is left is your palette.', he: 'הרגל טוב: כתבו את צליל המנגינה מעל כל תיבה, רשמו את האקורדים שעושים את העבודה של התיבה, ומחקו כל אחד שמתנגש בצליל. מה שנשאר הוא הפלטה שלכם.' },
      },
      {
        say: { en: 'To keep: first the job, then the melody. Both, or it is not a reharm.', he: 'מה לזכור: קודם התפקיד, אחר כך המנגינה. שניהם, אחרת זה לא ריהרמון.' },
      },
    ],
  },
  {
    id: 'k-theory',
    area: 'play',
    emoji: '𝄞',
    title: { en: 'Theory you play', he: 'תאוריה בביצוע' },
    takeaway: { en: 'The colours you learned by ear, under the hands: pentatonics and triad pairs over a vamp, upper structures, line clichés and your own reharm.', he: 'הצבעים שלמדתם באוזן, מתחת לידיים: פנטטוניים וזוגות משולשים מעל וואמפ, מבנים עליונים, ליין קלישה וריהרמון משלכם.' },
    steps: [
      {
        say: { en: 'Hi {name}! Here the theory goes into the hands. First a pentatonic over a vamp, in groups of four.', he: 'היי {name}! כאן התאוריה עוברת לידיים. קודם פנטטוני מעל וואמפ, בקבוצות של ארבעה.' },
        play: [chord([48, 64, 67, 71], 1), notes([62, 64, 66, 69, 64, 66, 69, 71], 0.22)],
      },
      {
        say: { en: 'Then upper structures: the left hand holds 3rd and 7th, the right hand moves a triad. D over C major 7 is the lydian sound.', he: 'אחר כך מבנים עליונים: יד שמאל מחזיקה טרצה וספטימה, יד ימין מזיזה משולש. D מעל Cmaj7 הוא הצליל הלידי.' },
        play: [chord([52, 59, 62, 66, 69])],
      },
      {
        say: { en: 'Then triad pairs in inversions: A, B, A from its 3rd, B from its 3rd. Six notes, two easy shapes.', he: 'אחר כך זוגות משולשים בהיפוכים: A, ‏B, ‏A מהטרצה, ‏B מהטרצה. שישה צלילים, שתי צורות קלות.' },
        play: [pairStimOf('altered', 0)],
      },
      {
        say: { en: 'Then a line cliché over a held minor chord, and a melody you reharmonise with a passing diminished and a tritone sub.', he: 'אחר כך ליין קלישה מעל אקורד מינור מוחזק, ומנגינה שאתם מרהרמנים עם דימיניש עובר ותחליף טריטון.' },
        play: [chord([48, 60, 63, 67], 0.7), chord([48, 59, 63, 67], 0.7), chord([48, 58, 63, 67], 0.7), chord([48, 57, 63, 67], 0.7)],
      },
      {
        say: { en: 'Each level starts slow, without a click, until the notes sit. Then the click comes in and the tempo climbs to the target.', he: 'כל שלב מתחיל לאט, בלי קליק, עד שהצלילים יושבים. אחר כך נכנס הקליק והטמפו עולה עד היעד.' },
      },
    ],
    more: [
      {
        say: { en: 'The lines are written out and checked note for note. Play them as written first; later, over the same vamp, make your own lines from the same notes.', he: 'הקווים כתובים ונבדקים צליל אחר צליל. נגנו אותם קודם כמו שכתוב; אחר כך, מעל אותו וואמפ, בנו קווים משלכם מאותם צלילים.' },
      },
      {
        say: { en: 'Chords are checked by their notes in any octave and any order. A voicing that holds the right pitch classes passes, so you may spread it over both hands as you like.', he: 'אקורדים נבדקים לפי הצלילים שלהם בכל אוקטבה ובכל סדר. וויסינג שמחזיק את הצלילים הנכונים עובר, אז אפשר לפרוש אותו על שתי הידיים איך שנוח.' },
      },
      {
        say: { en: 'The V changes colour halfway: A over G7 for a lydian dominant, then E flat over G7, altered, into C. Hear the pull grow.', he: 'ה־V מחליף צבע באמצע: A מעל G7 ללידי דומיננטי, ואז E♭ מעל G7, אלטרד, אל דו. שמעו איך המשיכה גדלה.' },
        play: [chord([43, 59, 65, 69, 73, 76], 0.9), chord([43, 59, 65, 70, 75, 79], 0.9), chord([48, 64, 71, 74, 79], 1.2)],
      },
      {
        say: { en: 'Last, ii–V–I in lines: a minor pentatonic over the ii, the altered pair over the V, the lydian pentatonic over the I.', he: 'ולסיום, ii–V–I בקווים: מינור פנטטוני מעל ה־ii, הזוג האלטרד מעל ה־V, הפנטטוני הלידי מעל ה־I.' },
        play: [notes([64, 67, 69, 71, 61, 65, 68, 63, 66, 70, 74, 76], 0.2)],
      },
      {
        say: { en: 'Keep the left hand relaxed and low in the upper structures; the right hand carries the colour and should sing a little louder than the shell.', he: 'השאירו את יד שמאל רפויה ונמוכה במבנים העליונים; יד ימין נושאת את הצבע וצריכה לשיר קצת חזק יותר מהקונכייה.' },
      },
      {
        say: { en: 'To keep: hear it, name it, then play it. The ear lessons and these drills are the same colours from two sides.', he: 'מה לזכור: לשמוע, לתת שם, ואז לנגן. שיעורי האוזן והתרגילים האלה הם אותם צבעים משני צדדים.' },
      },
    ],
  },
  {
    id: 'guitar-tp',
    area: 'play',
    emoji: '𝄞',
    title: { en: 'Rootless, quartal and Coltrane on guitar', he: 'בלי יסוד, קוורטלי וקולטריין בגיטרה' },
    takeaway: { en: 'Rootless 3-5-7-9 and 7-9-3-5 on strings 5–2 and 4–1, So What in 4ths, and Giant Steps with shells: the jazz pianist’s harmony on the neck.', he: 'בלי יסוד 3-5-7-9 ו־7-9-3-5 על מיתרים 5–2 ו־4–1, ‏So What בקוורטות, ו־Giant Steps בקונכיות: ההרמוניה של פסנתרן הג׳אז על הצוואר.' },
    steps: [
      {
        say: { en: 'Hi {name}! The bass plays the root, so the guitar can drop it. D minor 9 without D: F, A, C, E, on strings 5 to 2.', he: 'היי {name}! הבס מנגן את היסוד, אז הגיטרה יכולה לוותר עליו. רה מינור 9 בלי רה: פה, לה, דו, מי, על מיתרים 5 עד 2.' },
        play: [chord([53, 57, 60, 64])],
      },
      {
        say: { en: 'The same idea on strings 4 to 1, higher and brighter. A ii–V–I moves only one or two fingers.', he: 'אותו רעיון על מיתרים 4 עד 1, גבוה ובהיר יותר. ii–V–I מזיז רק אצבע או שתיים.' },
        play: [chord([65, 69, 72, 76], 0.9), chord([65, 69, 71, 76], 0.9), chord([64, 67, 71, 74])],
      },
      {
        say: { en: 'So What: three perfect 4ths and a major 3rd. D, G, C, F, A for D minor, moved up and down the dorian scale.', he: 'So What: שלוש קוורטות זכות וטרצה גדולה. רה, סול, דו, פה, לה לרה מינור, זז למעלה ולמטה בסולם הדורי.' },
        play: [chord([50, 55, 60, 65, 69])],
      },
      {
        say: { en: 'Giant Steps: keys a major 3rd apart, B, G and E flat, each reached by its own V7. Shells keep the hand still.', he: 'Giant Steps: סולמות במרחק טרצה גדולה, סי, סול ומי במול, וכל אחד מגיעים אליו דרך ה־V7 שלו. קונכיות שומרות את היד במקום.' },
        play: [chord([47, 58, 63], 0.7), chord([50, 60, 66], 0.7), chord([43, 54, 59], 0.7), chord([46, 56, 62], 0.7), chord([39, 50, 55], 1.2)],
      },
      {
        say: { en: 'Then upper structures on the top strings, triad pairs in inversions, pentatonic lines and line clichés. Each starts slow, without a click.', he: 'אחר כך מבנים עליונים על המיתרים העליונים, זוגות משולשים בהיפוכים, קווים פנטטוניים וליין קלישה. כל אחד מתחיל לאט, בלי קליק.' },
      },
    ],
    more: [
      {
        say: { en: 'Rootless on guitar means drop-2 shapes of 3, 5, 7, 9: four strings, no root, the 9th on top or inside. The bass player gives the root.', he: 'בלי יסוד בגיטרה זה צורות דרופ 2 של 3, 5, 7, 9: ארבעה מיתרים, בלי יסוד, ה־9 למעלה או בפנים. הבסיסט נותן את היסוד.' },
        play: [chord([53, 60, 64, 69], 1.2)],
      },
      {
        say: { en: 'In So What the same grip moves a whole step: on E and on D, both inside D dorian. Keep the hand shape and slide.', he: 'ב־So What אותה אחיזה זזה בטון: על מי ועל רה, שתיהן בתוך רה דורי. שומרים על צורת היד ומחליקים.' },
        play: [chord([52, 57, 62, 67, 71], 0.9), chord([50, 55, 60, 65, 69], 1.2)],
      },
      {
        say: { en: 'Giant Steps moves fast between three keys. Learn it slowly with shells, root, 3rd and 7th, then with drop-2 on the top four strings.', he: 'Giant Steps זז מהר בין שלושה סולמות. לומדים אותו לאט בקונכיות, יסוד, טרצה וספטימה, ואז בדרופ 2 על ארבעת המיתרים העליונים.' },
      },
      {
        say: { en: 'Upper structures on guitar: play the 3rd and 7th first, then the triad on strings 3 to 1. Two hits, one chord.', he: 'מבנים עליונים בגיטרה: קודם טרצה וספטימה, ואז המשולש על מיתרים 3 עד 1. שתי מכות, אקורד אחד.' },
      },
      {
        say: { en: 'A line cliché sits well on guitar: the root rings on a low string while one finger walks the moving voice down a string by half steps, the other notes held.', he: 'ליין קלישה יושב טוב על הגיטרה: היסוד מצלצל על מיתר נמוך בזמן שאצבע אחת מורידה את הקול הנע לאורך מיתר בחצאי טונים, והשאר מוחזקים.' },
      },
      {
        say: { en: 'To keep: fewer notes, chosen well. The root belongs to the bass; your notes are the 3rd, the 7th and the colours.', he: 'מה לזכור: פחות צלילים, נבחרים היטב. היסוד שייך לבס; הצלילים שלכם הם הטרצה, הספטימה והצבעים.' },
      },
    ],
  },
];

export const UNITS: Record<string, string> = {
  'topic:triad-pairs': 'triad-pairs',
  'topic:pent-super': 'pent-super',
  'topic:polychords': 'polychords',
  'topic:reharm-own': 'reharm-own',
  'tech:k-theory': 'k-theory',
  'tech:g-theory': 'guitar-tp',
};

// Jazz in context (docs/AUDIT-DEPTH-3.md §1 #5, #6): quick lessons before the keys family k-ctx, the guitar family
// g-ctx and the bass family b-ctx. Every fact matches src/engine/drills/ctxDrills.ts and its tests; the brothers follow
// docs/BARRY-HARRIS-THEORY.md §2. See ../miniTypes.ts for the format.
import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const chord = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.28): Stimulus => ({ kind: 'notes', midis, each });
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// In C: ii, the four brothers of G7, the tonic.
const DM7 = [50, 60, 65, 69];
const G7 = [43, 59, 65, 69];
const BB7 = [46, 62, 68, 72];
const DB7 = [37, 59, 65, 68];
const E7 = [40, 56, 62, 68];
const CMAJ7 = [48, 59, 64, 67];
const C6 = [48, 57, 64, 67];
const FM7 = [41, 56, 60, 63];
const AB7 = [44, 60, 66, 70];
const DIM = [59, 62, 65, 68];

export const LESSONS: MiniLesson[] = [
  {
    id: 'ctx-brothers',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'The brothers', he: 'האחים' },
    takeaway: { en: 'G7, B♭7, D♭7 and E7 share one diminished chord as their 7♭9 without the root (B D F A♭), so each can stand in for the V and resolve to C.', he: 'G7, ‏B♭7, ‏D♭7 ו־E7 חולקים אקורד מוקטן אחד כ־7♭9 שלהם בלי השורש (B D F A♭), ולכן כל אחד מהם יכול לעמוד במקום ה־V ולהיפתר לדו.' },
    steps: [
      {
        say: { en: 'Hi {name}! Take G7 with a flat 9 and leave out its root. What is left is a diminished chord: B, D, F and A flat.', he: 'היי {name}! קחו G7 עם נונה קטנה והשמיטו את השורש. מה שנשאר הוא אקורד מוקטן: סי, רה, פה ולה במול.' },
        play: [chord(G7), rest(0.3), chord(DIM)],
        show: { notes: DIM, chord: true, text: { en: 'G7♭9 − G = B°7', he: 'G7♭9 בלי G = B°7' } },
      },
      {
        say: { en: 'Now put another bass under the same four notes: B flat, D flat or E. Each bass turns the diminished into a dominant seven flat nine.', he: 'עכשיו שימו בס אחר מתחת לאותם ארבעה צלילים: סי במול, רה במול או מי. כל בס הופך את המוקטן לדומיננט שבע עם נונה קטנה.' },
        play: [chord([43, ...DIM], 0.9), chord([46, ...DIM], 0.9), chord([37, ...DIM], 0.9), chord([40, ...DIM], 0.9)],
        show: { text: { en: 'G7 · B♭7 · D♭7 · E7', he: 'G7 · B♭7 · D♭7 · E7' } },
      },
      {
        say: { en: 'These four dominants are one family (Barry Harris: the related dominants). Their roots are a minor third apart, and every one of them resolves to C.', he: 'ארבעת הדומיננטים האלה הם משפחה אחת (אצל בארי האריס: הדומיננטים הקרובים). השורשים שלהם במרחק טרצה קטנה, וכל אחד מהם נפתר לדו.' },
        play: [chord(BB7, 0.9), chord(CMAJ7), rest(0.2), chord(DB7, 0.9), chord(CMAJ7), rest(0.2), chord(E7, 0.9), chord(CMAJ7)],
      },
      {
        say: { en: 'You know some of them already. D flat 7 is the tritone sub. B flat 7 is the backdoor. E7 is the flat-nine relative.', he: 'חלק מהם אתם כבר מכירים. D♭7 הוא תחליף הטריטון. B♭7 הוא הדלת האחורית. E7 הוא הקרוב של הנונה הקטנה.' },
        show: { text: { en: '♭II7 · ♭VII7 · III7', he: '♭II7 · ♭VII7 · III7' } },
      },
      {
        say: { en: 'In a line, the half steps do the work: B goes up to C, F falls to E, A flat falls to G.', he: 'בקו, חצאי הטונים עושים את העבודה: סי עולה לדו, פה יורד למי, לה במול יורד לסול.' },
        play: [chord(DB7, 0.6), notes([61, 65, 68, 71, 74, 71, 68, 65, 64], 0.22)],
      },
      {
        say: { en: 'Your turn: each brother as an arpeggio into C, then inside a ii–V–I, comped, all four in turn, in a turnaround and in a blues. Lines start in free time.', he: 'תורכם: כל אח כארפג׳יו אל דו, ואז בתוך ii–V–I, בליווי, כל הארבעה בתורם, בטרנאראונד ובבלוז. קווים מתחילים בזמן חופשי.' },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: the diminished chord is the sound of the dominant. Its four notes pull by half steps into the tones of C.', he: 'למה זה עובד: אקורד המוקטן הוא הצליל של הדומיננט. ארבעת הצלילים שלו נמשכים בחצאי טונים אל הצלילים של דו.' },
        play: [chord(DIM, 0.9), chord(C6, 1.4)],
      },
      {
        say: { en: 'The bass under the diminished chooses the colour. G is the plain dominant, D flat sounds altered, B flat and E add the flat and sharp nine.', he: 'הבס מתחת למוקטן בוחר את הצבע. סול הוא הדומיננט הפשוט, רה במול נשמע אלטרד, סי במול ומי מוסיפים את הנונה הקטנה והמוגדלת.' },
      },
      {
        say: { en: 'In a ii–V–I, keep D minor 7 and C major 7 and swap the G7 for any brother. The ear still hears a cadence to C.', he: 'ב־ii–V–I, משאירים את Dm7 ואת Cmaj7 ומחליפים את G7 בכל אח. האוזן עדיין שומעת קדנצה לדו.' },
        play: [chord(DM7, 0.9), chord(E7, 0.9), chord(CMAJ7, 1.4)],
      },
      {
        say: { en: 'A common mistake is to treat the brothers as a chain of keys. They are four names for one job: the V of the same I.', he: 'טעות נפוצה היא לראות באחים שרשרת של סולמות. הם ארבעה שמות לתפקיד אחד: ה־V של אותו I.' },
      },
      {
        say: { en: 'Practise them in all twelve keys. In F the brothers are C7, E flat 7, G flat 7 and A7, and their shared diminished is E, G, B flat, D flat.', he: 'מתרגלים אותם בכל שנים־עשר הסולמות. בפה האחים הם C7, ‏E♭7, ‏G♭7 ו־A7, והמוקטן המשותף שלהם הוא מי, סול, סי במול, רה במול.' },
      },
      {
        say: { en: 'Bass players walk the brother roots: D, then D flat, then C is a chromatic line that every bassist knows.', he: 'נגני בס מהלכים על שורשי האחים: רה, ואז רה במול, ואז דו — קו כרומטי שכל בסיסט מכיר.' },
      },
      {
        say: { en: 'Later you will hear a ii–V–I and name the brother that replaced the V. Listen to the bass first: it tells you which one.', he: 'בהמשך תשמעו ii–V–I ותזהו איזה אח החליף את ה־V. הקשיבו קודם לבס: הוא אומר לכם מי זה.' },
      },
    ],
  },
  {
    id: 'ctx-backdoor',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'The backdoor', he: 'הדלת האחורית' },
    takeaway: { en: 'iv7 – ♭VII7 – I: borrowed from the minor key, the ♭VII7 comes home from a whole step below.', he: 'iv7 – ♭VII7 – I: שאול מהמינור, ה־♭VII7 חוזר הביתה מטון שלם מתחת.' },
    steps: [
      {
        say: { en: 'Hi {name}! The front door to C is G7. The backdoor is B flat 7, and it often comes right after F minor 7.', he: 'היי {name}! הדלת הראשית לדו היא G7. הדלת האחורית היא B♭7, והיא באה הרבה פעמים מיד אחרי Fm7.' },
        play: [chord(FM7), chord(BB7), chord(CMAJ7, 1.6)],
        show: { text: { en: 'Fm7 – B♭7 – Cmaj7', he: 'Fm7 – B♭7 – Cmaj7' } },
      },
      {
        say: { en: 'Both chords are borrowed from C minor. That is why they sound darker than the plain ii–V, and warmer when C arrives.', he: 'שני האקורדים שאולים מדו מינור. בגלל זה הם נשמעים כהים יותר מ־ii–V רגיל, וחמים יותר כשדו מגיע.' },
        play: [chord(DM7, 0.8), chord(G7, 0.8), chord(CMAJ7, 1.2), rest(0.3), chord(FM7, 0.8), chord(BB7, 0.8), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'Follow the guide tones: A flat falls to G, and the seventh of B flat 7 falls to the third of C.', he: 'עקבו אחרי הצלילים המנחים: לה במול יורד לסול, והספטימה של B♭7 יורדת לטרצה של דו.' },
        play: [notes([68, 67], 0.5), rest(), notes([68, 64], 0.5)],
        show: { notes: [68, 64], text: { en: 'A♭ → E', he: 'A♭ → E' } },
      },
      {
        say: { en: 'Over B flat 7 a bebop line keeps chord tones on the beats and lands on a tone of C on beat one.', he: 'מעל B♭7 קו ביבופ שומר על צלילי אקורד על הפעמות ונוחת על צליל של דו בפעמה אחת.' },
      },
      {
        say: { en: 'Your turn: comp the backdoor, play its guide tones, then a bebop line over B flat 7 into C, and the same colours inside a tune.', he: 'תורכם: לוו את הדלת האחורית, נגנו את הצלילים המנחים שלה, ואז קו ביבופ על B♭7 אל דו, ואותם צבעים בתוך שיר.' },
      },
    ],
    more: [
      {
        say: { en: 'B flat 7 is also a brother of G7: it shares the same diminished chord. That is the Barry Harris reason the backdoor works.', he: 'B♭7 הוא גם אח של G7: הוא חולק איתו את אותו מוקטן. זו הסיבה לפי בארי האריס שהדלת האחורית עובדת.' },
        play: [chord([46, ...DIM], 0.9), chord(CMAJ7, 1.4)],
      },
      {
        say: { en: 'Over B flat 7 the lydian dominant scale fits well: E natural sounds bright against the borrowed chord.', he: 'מעל B♭7 מתאים היטב הסולם הלידי הדומיננטי: מי בקר נשמע בהיר מול האקורד השאול.' },
        play: [chord(BB7, 0.6), notes([58, 60, 62, 64, 65, 67, 68, 70], 0.2)],
      },
      {
        say: { en: 'Other borrowed colours come from the same minor key: A flat major 7 after C, or F minor after F major.', he: 'צבעים שאולים אחרים באים מאותו מינור: A♭maj7 אחרי דו, או פה מינור אחרי פה מז׳ור.' },
      },
      {
        say: { en: 'In the tune you will play, bar six has F minor and B flat 7, bar twelve A flat major 7, and bars thirteen and fourteen the backdoor.', he: 'בשיר שתנגנו, בתיבה שש יש פה מינור ו־B♭7, בתיבה שתים־עשרה A♭maj7, ובתיבות שלוש־עשרה וארבע־עשרה הדלת האחורית.' },
      },
      {
        say: { en: 'A common mistake is to resolve B flat 7 to E flat. Here it goes up a whole step, home to C.', he: 'טעות נפוצה היא לפתור את B♭7 למי במול. כאן הוא עולה טון שלם, הביתה לדו.' },
      },
      {
        say: { en: 'Practise the backdoor in all twelve keys. In F it is B flat minor 7 to E flat 7 to F; in G it is C minor 7 to F7 to G. Say the chords before you play them.', he: 'מתרגלים את הדלת האחורית בכל שנים־עשר הסולמות. בפה זה B♭m7 ל־E♭7 לפה; בסול זה Cm7 ל־F7 לסול. אומרים את האקורדים לפני שמנגנים אותם.' },
      },
    ],
  },
  {
    id: 'ctx-superimpose',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Triad pairs and pentatonics over a form', he: 'זוגות משולשים ופנטטוניות על צורה' },
    takeaway: { en: 'Change the pair or the pentatonic with every chord: over Cmaj7 D and Em, over Dm7 F and G; over G7 the major pentatonic on A.', he: 'מחליפים את הזוג או את הפנטטוני עם כל אקורד: מעל Cmaj7 ‏D ו־Em, מעל Dm7 ‏F ו־G; מעל G7 הפנטטוני המז׳ורי על לה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Over a one-chord vamp, one triad pair is easy. Over a ii–V–I, every chord needs its own pair.', he: 'היי {name}! על ואמפ של אקורד אחד, זוג משולשים אחד זה קל. על ii–V–I, לכל אקורד צריך זוג משלו.' },
        play: [chord(DM7, 0.8), notes([65, 69, 72, 67, 71, 74], 0.2), chord(CMAJ7, 0.8), notes([62, 66, 69, 64, 67, 71], 0.2)],
        show: { text: { en: 'Dm7: F + G · Cmaj7: D + Em', he: 'Dm7: ‏F + G · ‏Cmaj7: ‏D + Em' } },
      },
      {
        say: { en: 'Over the dominant, try the triads on its root and on its second: G and A over G7, a bright lydian sound.', he: 'מעל הדומיננט, נסו את המשולשים על השורש שלו ועל הדרגה השנייה: סול ולה מעל G7, צליל לידי בהיר.' },
        play: [chord(G7, 0.8), notes([67, 71, 74, 69, 73, 76], 0.2)],
      },
      {
        say: { en: 'A pentatonic a fifth above the root gives a chord its colours: G pentatonic over C major 7, A minor pentatonic over D minor 7.', he: 'פנטטוני קווינטה מעל השורש נותן לאקורד את הצבעים שלו: פנטטוני סול מעל Cmaj7, פנטטוני לה מינור מעל Dm7.' },
        play: [chord(CMAJ7, 0.8), notes([67, 69, 71, 74, 76], 0.24)],
        show: { notes: [67, 69, 71, 74, 76], text: { en: 'G pentatonic over C', he: 'פנטטוני סול מעל דו' } },
      },
      {
        say: { en: 'Change exactly when the chord changes. The new pair or pentatonic starts on beat one of the bar.', he: 'מחליפים בדיוק כשהאקורד מתחלף. הזוג או הפנטטוני החדש מתחיל בפעמה אחת של התיבה.' },
      },
      {
        say: { en: 'Your turn: pairs and pentatonics through ii–V–I, a minor ii–V–i, a blues and a modal form. Each line starts in free time.', he: 'תורכם: זוגות ופנטטוניות לאורך ii–V–I, ‏ii–V–i מינורי, בלוז וצורה מודאלית. כל קו מתחיל בזמן חופשי.' },
      },
    ],
    more: [
      {
        say: { en: 'Over an altered dominant, use the pair a tritone and a minor sixth above the root: D flat and E flat over G7 alt.', he: 'מעל דומיננט אלטרד, משתמשים בזוג שטריטון וסקסטה קטנה מעל השורש: רה במול ומי במול מעל G7alt.' },
        play: [chord(G7, 0.6), notes([61, 65, 68, 63, 67, 70], 0.2)],
      },
      {
        say: { en: 'Over the minor seven flat five, the pair a half step and a minor third above: E flat and F minor over D half-diminished.', he: 'מעל מינור שבע עם קווינטה מוקטנת, הזוג שחצי טון וטרצה קטנה מעל: מי במול ופה מינור מעל Dø.' },
      },
      {
        say: { en: 'The minor pentatonic on the flat third also fits the altered dominant: B flat minor pentatonic over G7 alt.', he: 'הפנטטוני המינורי על הטרצה הקטנה מתאים גם לדומיננט האלטרד: פנטטוני סי במול מינור מעל G7alt.' },
        play: [chord(G7, 0.6), notes([58, 61, 63, 65, 68], 0.24)],
      },
      {
        say: { en: 'Six notes of a pair or five of a pentatonic leave out the plain chord sound. That space is why the lines sound modern.', he: 'שישה צלילים של זוג או חמישה של פנטטוני משאירים בחוץ את הצליל הפשוט של האקורד. המרחב הזה הוא מה שעושה את הקווים מודרניים.' },
      },
      {
        say: { en: 'A common mistake is to keep one pentatonic through the whole form. The changes then disappear from your line.', he: 'טעות נפוצה היא להחזיק פנטטוני אחד לאורך כל הצורה. אז המהלך נעלם מהקו שלכם.' },
      },
      {
        say: { en: 'Start slowly with one shape per chord, in free time, and name the pair or the pentatonic out loud. Then speed it up and let the shapes connect across the bar line, the last note near the next chord’s first.', he: 'מתחילים לאט עם צורה אחת לכל אקורד, בזמן חופשי, ואומרים בקול את שם הזוג או הפנטטוני. אחר כך מאיצים ונותנים לצורות להתחבר מעל קו התיבה, הצליל האחרון קרוב לראשון של האקורד הבא.' },
      },
    ],
  },
  {
    id: 'ctx-coltrane',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'The Coltrane sub', he: 'תחליף קולטריין' },
    takeaway: { en: 'Over a ii–V–I, reach the tonic through keys a major 3rd apart: Dm7 E♭7 A♭maj7 B7 Emaj7 G7 Cmaj7.', he: 'מעל ii–V–I, מגיעים לטוניקה דרך סולמות במרחק טרצה גדולה: Dm7 E♭7 A♭maj7 B7 Emaj7 G7 Cmaj7.' },
    steps: [
      {
        say: { en: 'Hi {name}! Keep the first and last chords of a ii–V–I. In between, visit A flat and E, a major third apart, each with its own V.', he: 'היי {name}! משאירים את האקורד הראשון והאחרון של ii–V–I. באמצע מבקרים בלה במול ובמי, במרחק טרצה גדולה, כל אחד עם ה־V שלו.' },
        show: { text: { en: 'Dm7 E♭7 | A♭ B7 | E G7 | C', he: 'Dm7 E♭7 | A♭ B7 | E G7 | C' } },
        play: [chord(DM7, 0.6), chord([39, 55, 61, 65], 0.6), chord([44, 55, 60, 63], 0.6), chord([47, 63, 69, 73], 0.6), chord([40, 56, 59, 63], 0.6), chord(G7, 0.6), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'C, A flat and E split the octave into three equal parts. That is the sound of Giant Steps, squeezed into one cadence.', he: 'דו, לה במול ומי מחלקים את האוקטבה לשלושה חלקים שווים. זה הצליל של Giant Steps, דחוס לתוך קדנצה אחת.' },
        play: [notes([60, 56, 52, 48], 0.4)],
      },
      {
        say: { en: 'A one-two-three-five cell on each chord makes the motion clear, two beats per chord.', he: 'תא של אחת־שתיים־שלוש־חמש על כל אקורד מבהיר את התנועה, שתי פעמות לכל אקורד.' },
        play: [notes([63, 65, 67, 70, 68, 70, 72, 75, 71, 73, 75, 78], 0.18)],
      },
      {
        say: { en: 'In the comping, shells keep it simple: root, third and seventh on each chord.', he: 'בליווי, שלדים שומרים על פשטות: שורש, טרצה וספטימה על כל אקורד.' },
      },
      {
        say: { en: 'Your turn: the line, then comp it in shells or drop 2. Bass players walk it. The line starts in free time.', he: 'תורכם: הקו, ואז ליווי בשלדים או בדרופ 2. נגני בס מהלכים אותו. הקו מתחיל בזמן חופשי.' },
      },
    ],
    more: [
      {
        say: { en: 'John Coltrane put these changes over standard ii–V–Is. Countdown, for example, recasts the changes of a well-known standard this way.', he: 'ג׳ון קולטריין שם את המהלכים האלה על ii–V–I רגילים. Countdown, למשל, בונה כך מחדש מהלך של סטנדרט מוכר.' },
      },
      {
        say: { en: 'Each V sits a fifth above its new key: E flat 7 to A flat, B7 to E, G7 to C. Hear the pull.', he: 'כל V נמצא קווינטה מעל הסולם הבא: E♭7 ללה במול, B7 למי, G7 לדו. שמעו את המשיכה.' },
        play: [chord([39, 55, 61, 65], 0.7), chord([44, 55, 60, 63], 0.9)],
      },
      {
        say: { en: 'The three tonics form an augmented triad: C, E, A flat. Arpeggiate it to feel where the line is heading.', he: 'שלוש הטוניקות יוצרות משולש מוגדל: דו, מי, לה במול. נגנו אותו בארפג׳יו כדי להרגיש לאן הקו הולך.' },
        play: [notes([60, 64, 68, 72], 0.3)],
      },
      {
        say: { en: 'Keep the cells close: start each one on the root nearest the last note, so the whole line stays in one comfortable register.', he: 'משאירים את התאים קרובים: מתחילים כל אחד על השורש הקרוב לצליל האחרון, כך שהקו נשאר במנעד אחד.' },
      },
      {
        say: { en: 'A common mistake is to rush the last bar. C major 7 is home: hold it, and let the band arrive with you.', he: 'טעות נפוצה היא למהר בתיבה האחרונה. Cmaj7 הוא הבית: החזיקו אותו, ותנו ללהקה להגיע איתכם.' },
      },
      {
        say: { en: 'Practise it slowly first, two beats a chord, and say each new key as you reach it: A flat, E, C. Then try the same three keys from the other tonics, so the shape becomes yours in all twelve keys.', he: 'מתרגלים קודם לאט, שתי פעמות לאקורד, ואומרים כל סולם חדש כשמגיעים אליו: לה במול, מי, דו. אחר כך מנסים את אותם שלושה סולמות מטוניקות אחרות, כך שהצורה הופכת לשלכם בכל שנים־עשר הסולמות.' },
      },
    ],
  },
  {
    id: 'ctx-intros-endings',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Intros and endings', he: 'פתיחות וסיומים' },
    takeaway: { en: 'Intros: the I–vi–ii–V vamp or the tune’s last four bars. Endings: the Basie tag, ♭VI7–♭II7–I, or the iii–VI–ii–V tag three times.', he: 'פתיחות: ואמפ I–vi–ii–V או ארבע התיבות האחרונות של השיר. סיומים: התג של בייסי, ‏♭VI7–♭II7–I, או תג iii–VI–ii–V שלוש פעמים.' },
    steps: [
      {
        say: { en: 'Hi {name}! The simplest intro is a vamp on one, six, two, five, two beats each, until the band comes in.', he: 'היי {name}! הפתיחה הפשוטה ביותר היא ואמפ על אחת, שש, שתיים, חמש, שתי פעמות לכל אחד, עד שהלהקה נכנסת.' },
        show: { text: { en: 'I – vi – ii – V', he: 'I – vi – ii – V' } },
        play: [chord(CMAJ7, 0.6), chord([45, 60, 64, 67], 0.6), chord(DM7, 0.6), chord(G7, 0.6), chord(CMAJ7, 1)],
      },
      {
        say: { en: 'Or play the last four bars of the tune. The listener hears where the form ends before it even starts.', he: 'או נגנו את ארבע התיבות האחרונות של השיר. השומע שומע איפה הצורה נגמרת עוד לפני שהיא מתחילה.' },
      },
      {
        say: { en: 'To end, delay the tonic: A flat 7, D flat 7, then C. Both chords slide down by half steps into home.', he: 'כדי לסיים, דוחים את הטוניקה: A♭7, ‏D♭7, ואז דו. שני האקורדים מחליקים בחצאי טונים הביתה.' },
        play: [chord(AB7, 0.8), chord(DB7, 0.8), chord(CMAJ7, 1.6)],
      },
      {
        say: { en: 'The tag ending repeats three, six, two, five three times before the last chord, so the band can feel it coming.', he: 'סיום התג חוזר על שלוש, שש, שתיים, חמש שלוש פעמים לפני האקורד האחרון, כך שהלהקה מרגישה שהוא מגיע.' },
        play: [chord([40, 55, 59, 62], 0.5), chord([45, 55, 61, 64], 0.5), chord(DM7, 0.5), chord(G7, 0.5), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'Your turn: comp the intros and the endings, and play the Basie tag before the last hit.', he: 'תורכם: לוו את הפתיחות ואת הסיומים, ונגנו את התג של בייסי לפני המכה האחרונה.' },
      },
    ],
    more: [
      {
        say: { en: 'The Basie ending: the band stops on the tonic, the piano answers with a short three-note tag, and the band plays one last hit.', he: 'סיום בייסי: הלהקה עוצרת על הטוניקה, הפסנתר עונה בתג קצר של שלושה צלילים, והלהקה מנגנת מכה אחרונה.' },
        play: [chord(C6, 0.5), rest(0.3), notes([67, 68, 69], 0.3), chord([48, 64, 67, 69, 72], 1.2)],
      },
      {
        say: { en: 'A flat 7 and D flat 7 are borrowed sounds: A flat from the minor key, D flat 7 the tritone sub of G7, one of its brothers.', he: 'A♭7 ו־D♭7 הם צלילים שאולים: לה במול מהמינור, ו־D♭7 תחליף הטריטון של G7, אחד האחים שלו.' },
        play: [chord(DB7, 0.8), chord(CMAJ7, 1.2)],
      },
      {
        say: { en: 'For the last-four-bars intro, use the real last bars of the tune you play: here F minor 7, B flat 7, then a turnaround to C.', he: 'לפתיחה של ארבע התיבות האחרונות, משתמשים בתיבות האחרונות האמיתיות של השיר: כאן Fm7, ‏B♭7, ואז טרנאראונד לדו.' },
      },
      {
        say: { en: 'Agree on the ending before you play. A nod on the last A section tells the band which tag is coming.', he: 'מסכימים על הסיום לפני שמנגנים. הנהון בחלק A האחרון אומר ללהקה איזה תג מגיע.' },
      },
      {
        say: { en: 'A common mistake is to slow down in the tag. Keep the time steady; only the last chord is held.', he: 'טעות נפוצה היא להאט בתג. שומרים על זמן יציב; רק האקורד האחרון מוחזק.' },
      },
      {
        say: { en: 'Practise each intro and ending in all twelve keys, with the band or a click. Count the bars out loud, so you always know where the form starts and where the last chord falls.', he: 'מתרגלים כל פתיחה וכל סיום בכל שנים־עשר הסולמות, עם הלהקה או עם קליק. סופרים את התיבות בקול, כך שתמיד יודעים איפה הצורה מתחילה ואיפה נופל האקורד האחרון.' },
      },
    ],
  },
  {
    id: 'ctx-ballad',
    area: 'jazz',
    emoji: '𝄞',
    title: { en: 'Ballad comping', he: 'ליווי בלדה' },
    takeaway: { en: 'Slow tempo, full sound: the left hand plays a 10th or a shell, the right hand four notes (3, 5, 7, 9) above it.', he: 'טמפו איטי, צליל מלא: יד שמאל מנגנת דצימה או שלד, יד ימין ארבעה צלילים (3, 5, 7, 9) מעליה.' },
    steps: [
      {
        say: { en: 'Hi {name}! A ballad has room. The left hand plays the root and the tenth; the right hand a rootless chord above middle C.', he: 'היי {name}! בבלדה יש מקום. יד שמאל מנגנת שורש ודצימה; יד ימין אקורד בלי שורש מעל דו האמצעי.' },
        play: [chord([36, 52, 64, 67, 71, 74], 2)],
        show: { notes: [36, 52, 64, 67, 71, 74], chord: true, text: { en: 'LH 1–10 · RH 3-5-7-9', he: 'שמאל 1–10 · ימין 3-5-7-9' } },
      },
      {
        say: { en: 'Keep the right hand close from chord to chord; only the bass moves far.', he: 'משאירים את יד ימין קרובה מאקורד לאקורד; רק הבס זז רחוק.' },
        play: [chord([36, 52, 64, 67, 71, 74], 1.4), chord([45, 60, 64, 67, 72, 74], 1.4)],
      },
      {
        say: { en: 'With two chords a bar, a shell in the left hand is lighter: the root and the seventh, the right hand on top.', he: 'עם שני אקורדים בתיבה, שלד ביד שמאל קל יותר: השורש והספטימה, ויד ימין מעליהן.' },
        play: [chord([38, 48, 65, 69, 72, 76], 1.2), chord([43, 53, 65, 69, 71, 76], 1.2)],
      },
      {
        say: { en: 'Play both hands exactly together, softly, and let each chord ring for its full length before the next one.', he: 'מנגנים את שתי הידיים בדיוק יחד, ונותנים לכל אקורד להישמע לכל אורכו.' },
      },
      {
        say: { en: 'Your turn: a ballad progression in tenths, then in shells with two chords a bar. Guitarists play it in drop 2.', he: 'תורכם: מהלך בלדה בדצימות, ואז בשלדים עם שני אקורדים בתיבה. גיטריסטים מנגנים אותו בדרופ 2.' },
      },
    ],
    more: [
      {
        say: { en: 'Start each chord in free time, then at a slow tempo: a ballad still has a pulse.', he: 'מתחילים כל אקורד בזמן חופשי, ואז בטמפו איטי: גם לבלדה יש פעימה.' },
        play: [chord(C6, 1.6)],
      },
      {
        say: { en: 'A tenth is a stretch. If your hand is small, roll it quickly from the bottom, or play the root and the seventh.', he: 'דצימה היא מתיחה. אם היד קטנה, פורטים אותה מהר מלמטה, או מנגנים שורש וספטימה.' },
        play: [notes([36, 52], 0.12), chord([64, 67, 71, 74], 1.2)],
      },
      {
        say: { en: 'Over the A7 in bar six, the flat nine gives the ballad its ache: the right hand plays C sharp, G and B flat.', he: 'מעל A7 בתיבה שש, הנונה הקטנה נותנת לבלדה את הכאב שלה: יד ימין מנגנת דו דיאז, סול וסי במול.' },
      },
      {
        say: { en: 'Leave the melody room. In a real ballad the right hand comps under the singer, softer than the tune.', he: 'משאירים מקום למנגינה. בבלדה אמיתית יד ימין מלווה מתחת לזמר, רכה יותר מהמנגינה.' },
      },
      {
        say: { en: 'A common mistake is to pedal through the changes. Lift the pedal with each new chord, so the harmony stays clear.', he: 'טעות נפוצה היא להחזיק פדל דרך ההחלפות. מרימים את הפדל עם כל אקורד חדש, כך שההרמוניה נשארת ברורה.' },
      },
      {
        say: { en: 'Listen to how great ballad pianists voice the top note of each chord: it moves by small steps and makes a quiet second melody. Try to keep your top voice moving by a step or holding still from chord to chord, all the way through the progression.', he: 'הקשיבו איך פסנתרני בלדות גדולים בונים את הצליל העליון של כל אקורד: הוא זז בצעדים קטנים ויוצר מנגינה שנייה שקטה. נסו לגרום לקול העליון שלכם לזוז בצעד או להישאר במקום מאקורד לאקורד, לאורך כל המהלך.' },
      },
    ],
  },
];

/** The lesson that opens each unit (family = its first level; levels where a new topic starts). */
export const UNITS: Record<string, string> = {
  // keys
  'tech:k-ctx': 'ctx-brothers',
  'tech:k-ctx-1': 'ctx-brothers',
  'tech:k-ctx-6': 'ctx-backdoor',
  'tech:k-ctx-7': 'ctx-backdoor',
  'tech:k-ctx-8': 'ctx-superimpose',
  'tech:k-ctx-9': 'ctx-superimpose',
  'tech:k-ctx-10': 'ctx-coltrane',
  'tech:k-ctx-11': 'ctx-intros-endings',
  'tech:k-ctx-12': 'ctx-intros-endings',
  'tech:k-ctx-13': 'ctx-ballad',
  // guitar
  'tech:g-ctx': 'ctx-brothers',
  'tech:g-ctx-1': 'ctx-brothers',
  'tech:g-ctx-5': 'ctx-backdoor',
  'tech:g-ctx-6': 'ctx-superimpose',
  'tech:g-ctx-7': 'ctx-superimpose',
  'tech:g-ctx-8': 'ctx-coltrane',
  'tech:g-ctx-9': 'ctx-intros-endings',
  'tech:g-ctx-10': 'ctx-intros-endings',
  'tech:g-ctx-11': 'ctx-ballad',
  // bass
  'tech:b-ctx': 'ctx-brothers',
  'tech:b-ctx-1': 'ctx-brothers',
  'tech:b-ctx-4': 'ctx-backdoor',
  'tech:b-ctx-5': 'ctx-superimpose',
  'tech:b-ctx-6': 'ctx-superimpose',
  'tech:b-ctx-7': 'ctx-coltrane',
};

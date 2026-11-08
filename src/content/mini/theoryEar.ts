// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Harmony, ear, world and written-theory topics. Every fact matches its generator (src/engine/topics*.ts).

import type { MiniLesson } from '../miniTypes';
import type { Stimulus } from '../../engine/lesson';
import type { PitchClass } from '../../engine/pitch';

const cad = (letter: PitchClass['letter'], acc: PitchClass['acc'] = 0): Stimulus => ({ kind: 'cadence', key: { letter, acc } });
const ch = (midis: number[], duration = 1.2): Stimulus => ({ kind: 'chord', midis, duration });
const arp = (midis: number[], duration = 1.8): Stimulus => ({ kind: 'chord', midis, duration, arpeggio: true });
const ns = (midis: number[], each = 0.45): Stimulus => ({ kind: 'notes', midis, each });
const n1 = (midi: number, duration = 0.9): Stimulus => ({ kind: 'note', midi, duration });
const rest = (duration = 0.4): Stimulus => ({ kind: 'rest', duration });
const phrase = (chords: ('I' | 'ii' | 'iii' | 'IV' | 'V' | 'V7' | 'vi')[]): Stimulus => ({ kind: 'phrase', key: { letter: 'C', acc: 0 }, chords });

// G7 shell (G2, B3, F4) with a tension on top — the extensions drill's voicing.
const G7 = [43, 59, 65];
// Form motifs in C.
const A = [60, 62, 64, 62, 67];
const A2 = [60, 62, 64, 65, 60];
const B = [69, 67, 65, 64, 62];
const Cm = [72, 71, 69, 67, 72];
const gap = rest(0.45);
// Maqamat (exact steps from topicsEar.ts).
const mq = (tonic: number, steps: number[]) => steps.map((s) => tonic + s);

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ harmony
  {
    id: 'extensions',
    area: 'harmony',
    emoji: '✨',
    title: { en: 'Extensions and colors', he: 'הרחבות וצבעים' },
    takeaway: { en: 'Keep stacking thirds past the 7th: 9, 11, 13. Alter them (♭9 ♯9 ♯11 ♭13) for spice, or swap the 3 for a 4 for sus.', he: 'ממשיכים לערום טרצות מעל ה־7: ‏9, 11, 13. משנים אותן (♭9 ♯9 ♯11 ♭13) בשביל תבלין, או מחליפים את ה־3 ב־4 בשביל sus.' },
    steps: [
      {
        say: { en: 'Hey {name}! A seventh chord is a stack of thirds: 1, 3, 5, 7. Keep stacking thirds and you reach 9, 11 and 13 — the extensions.', he: 'היי {name}! אקורד ספטימה בנוי מטרצות זו על גבי זו: 1, 3, 5, 7. ממשיכים להוסיף טרצות ומגיעים ל־9, 11 ו־13 — ההרחבות.' },
        play: [arp([43, 59, 62, 65]), ch([43, 59, 62, 65], 1.4)],
        show: { notes: [43, 59, 62, 65], chord: true, key: 'C', text: { en: 'G7 = 1 3 5 7', he: 'G7 = 1 3 5 7' } },
      },
      {
        say: { en: 'A 9 is really the 2, an octave up; a 13 is the 6, up high. Same G7, three tops: plain 7, then 9, then 13.', he: '9 הוא בעצם ה־2, אוקטבה למעלה; 13 הוא ה־6, גבוה למעלה. אותו G7, שלושה צלילים עליונים: 7 רגיל, אחר כך 9, אחר כך 13.' },
        play: [ch([...G7, 67]), ch([...G7, 69]), ch([...G7, 76], 1.5)],
        show: { notes: [...G7, 69], chord: true, key: 'C', text: { en: '7 → 9 → 13', he: '7 ← 9 ← 13' } },
      },
      {
        say: { en: 'Dominant chords love spice. Lower the 9 for ♭9, dark and tense; raise it for ♯9, the crunchy blues sound.', he: 'אקורדים דומיננטיים אוהבים תבלין. מנמיכים את ה־9 ומקבלים ♭9, כהה ומתוח; מגביהים אותו ומקבלים ♯9, הצליל הבלוזי והצורם.' },
        play: [ch([...G7, 68], 1.4), ch([...G7, 70], 1.6)],
        show: { notes: [...G7, 68], chord: true, key: 'C', text: { en: '♭9 · ♯9', he: '♭9 · ♯9' } },
      },
      {
        say: { en: 'Raise the 11 for ♯11, a shimmering tritone above the root. Lower the 13 for ♭13, a dark pull downward.', he: 'מגביהים את ה־11 ומקבלים ♯11 — טריטון מנצנץ מעל השורש. מנמיכים את ה־13 ומקבלים ♭13 — משיכה כהה כלפי מטה.' },
        play: [ch([...G7, 73], 1.4), ch([...G7, 75], 1.6)],
        show: { notes: [...G7, 73], chord: true, key: 'C', text: { en: '♯11 · ♭13', he: '♯11 · ♭13' } },
      },
      {
        say: { en: 'Major chords wear softer colors: maj7, maj9, the sparkling Lydian maj7♯11, and 6/9, which has no seventh at all.', he: 'לאקורדי מז׳ור יש צבעים רכים יותר: maj7, ‏maj9, ה־maj7♯11 הלידי והנוצץ, ו־6/9 — שאין בו ספטימה בכלל.' },
        play: [ch([43, 59, 62, 66], 1.1), ch([43, 59, 66, 69], 1.1), ch([43, 59, 66, 73], 1.1), ch([43, 59, 64, 69], 1.4)],
        show: { notes: [43, 59, 64, 69], chord: true, key: 'G', text: { en: 'maj7 · maj9 · maj7♯11 · 6/9', he: 'maj7 · maj9 · maj7♯11 · 6/9' } },
      },
      {
        say: { en: 'sus4 swaps the 3 for a 4, so the chord hangs in the air; 7sus4 adds the 7. add9 keeps the 3 and adds a 9, no seventh. And 7alt piles ♯9 and ♭13 onto a dominant.', he: 'ב־sus4 ה־4 מחליף את ה־3, והאקורד נשאר תלוי באוויר; 7sus4 מוסיף את ה־7. ‏add9 שומר על ה־3 ומוסיף 9, בלי ספטימה. ו־7alt מעמיס ♯9 ו־♭13 על הדומיננט.' },
        play: [ch([43, 60, 62, 67], 1.1), ch([43, 60, 65, 69], 1.1), ch([43, 59, 62, 69], 1.1), ch([43, 59, 65, 70, 75], 1.4)],
        show: { notes: [43, 60, 62, 67], chord: true, key: 'C', text: { en: 'sus4 · 7sus4 · add9 · 7alt', he: 'sus4 · 7sus4 · add9 · 7alt' } },
      },
      {
        say: { en: 'Your turn! I play a chord together, then note by note upward. Listen to the top note and the color, and pick its name.', he: 'תורכם! אני מנגן אקורד ביחד, ואז צליל אחר צליל מלמטה למעלה. הקשיבו לצליל העליון ולצבע, ובחרו את השם.' },
        play: [ch([...G7, 69], 1.5), arp([...G7, 69])],
        show: { notes: [...G7, 69], chord: true, key: 'C', text: { en: '7? 9? 13?', he: '7? 9? 13?' } },
      },
    ],
    more: [
      {
        say: { en: 'Stack thirds on G all the way up: G, B, D, F, then A, C, E. That is G13, and it holds all seven letters of the scale. Nobody plays all seven at once; players choose a few and leave the rest out.', he: 'ערמו טרצות על סול עד הסוף: סול, סי, רה, פה, ואז לה, דו, מי. זה G13, ויש בו את כל שבע האותיות של הסולם. אף אחד לא מנגן את כל השבע יחד; בוחרים כמה ומשמיטים את השאר.' },
        play: [arp([43, 59, 62, 65, 69, 72, 76], 2.6)],
        show: { notes: [43, 59, 62, 65, 69, 72, 76], chord: true, key: 'C', text: { en: 'G B D F | A C E = 1 3 5 7 | 9 11 13', he: 'סול סי רה פה | לה דו מי = 1 3 5 7 | 9 11 13' } },
      },
      {
        say: { en: 'The number tells you the context. A 9 means a seventh is in the chord too. Without the seventh it is add9: C, E, G, D. C9 is C, E, G, B♭, D.', he: 'המספר מספר את ההקשר. 9 אומר שיש באקורד גם ספטימה. בלי הספטימה זה add9: דו, מי, סול, רה. ‏C9 הוא דו, מי, סול, סי♭, רה.' },
        play: [ch([48, 52, 55, 62], 1.3), ch([48, 52, 58, 62], 1.5)],
        show: { notes: [48, 52, 58, 62], chord: true, key: 'F', text: { en: 'Cadd9 · C9', he: 'Cadd9 · C9' } },
      },
      {
        say: { en: 'The 11 is the tricky one. On a major or dominant chord, the natural 11 sits a semitone above the 3 and clashes. So players raise it to ♯11, or drop the 3 and call it sus. On a minor chord, the natural 11 sounds lovely: Dm11.', he: 'ה־11 הוא הבעייתי. באקורד מז׳ור או דומיננט, 11 טבעי יושב חצי טון מעל ה־3 ומתנגש בו. לכן מגביהים אותו ל־♯11, או משמיטים את ה־3 וקוראים לזה sus. באקורד מינורי, 11 טבעי נשמע נהדר: Dm11.' },
        play: [ch([43, 59, 65, 72], 1.2), ch([43, 59, 65, 73], 1.2), ch([38, 53, 60, 64, 67], 1.6)],
        show: { notes: [38, 53, 60, 64, 67], chord: true, key: 'C', text: { en: 'G7 + 11 ✗ · G7♯11 · Dm11', he: 'G7 + 11 ✗ · G7♯11 · Dm11' } },
      },
      {
        say: { en: 'Each chord type has its own menu. Major 7 takes 9, ♯11 and 13. Minor 7 takes 9 and 11. The dominant 7 takes natural 9 and 13, or the altered ♭9, ♯9, ♯11 and ♭13. It is the only chord that welcomes them all.', he: 'לכל סוג אקורד יש תפריט משלו. maj7 מקבל 9, ‏♯11 ו־13. ‏m7 מקבל 9 ו־11. אקורד 7 דומיננטי מקבל 9 ו־13 טבעיים, או את האלטרציות: ♭9, ‏♯9, ‏♯11 ו־♭13. זה האקורד היחיד שמקבל את כולם.' },
        show: { text: { en: 'maj7: 9 ♯11 13 · m7: 9 11 · 7: 9 13 ♭9 ♯9 ♯11 ♭13', he: 'maj7: 9 ♯11 13 · m7: 9 11 · 7: 9 13 ♭9 ♯9 ♯11 ♭13' } },
      },
      {
        say: { en: 'To hear which one is on top, sing the root, then compare. The 9 is a whole step above the root. The ♭9 is only a semitone above it. The 13 sits a semitone below the 7 in a dominant chord.', he: 'כדי לשמוע מה למעלה, שירו את השורש והשוו. ה־9 נמצא טון שלם מעל השורש. ה־♭9 רק חצי טון מעליו. ה־13 יושב חצי טון מתחת ל־7 באקורד דומיננטי.' },
        play: [ch([...G7, 69], 1.3), ns([67, 69], 0.55), rest(0.3), ch([...G7, 68], 1.3), ns([67, 68], 0.55)],
        show: { notes: [67, 69], key: 'C', text: { en: 'G → A = 9 · G → A♭ = ♭9', he: 'סול ← לה = 9 · סול ← לה♭ = ♭9' } },
      },
      {
        say: { en: 'A common mistake is putting colors too low. A 9 a step above a low root turns to mud. Keep the root alone in the bass and place the tensions above middle C, where they ring.', he: 'טעות נפוצה היא לשים את הצבעים נמוך מדי. 9 צמוד לשורש נמוך הופך לבוץ. השאירו את השורש לבד בבס ושימו את הטנשנים מעל דו האמצעי, שם הם מצלצלים.' },
        play: [ch([43, 45, 59, 65], 1.4), ch([43, 59, 65, 69], 1.6)],
        show: { notes: [43, 59, 65, 69], chord: true, key: 'C', text: { en: 'muddy · clear', he: 'בוץ · צלול' } },
      },
      {
        say: { en: 'In real music, 9ths and 13ths are everyday jazz, soul and funk colors. The ♯9 is called the Hendrix chord after Purple Haze. Maj7♯11 is the dreamy Lydian sound of film scores and modern jazz.', he: 'במוזיקה אמיתית, 9 ו־13 הם צבעים יומיומיים בג׳אז, בסול ובפאנק. ה־♯9 נקרא ״אקורד הנדריקס״ בגלל Purple Haze. ‏maj7♯11 הוא הצליל הלידי והחולמני של פסקולים ושל ג׳אז מודרני.' },
        play: [ch([40, 56, 62, 67], 1.6)],
        show: { notes: [40, 56, 62, 67], chord: true, key: 'E', text: { en: 'E7♯9', he: 'E7♯9' } },
      },
      {
        say: { en: 'To keep: extensions are 2, 4 and 6 an octave up, sitting above a seventh chord. Dominants take every alteration; the 11 needs care on major chords.', he: 'לזכור: הרחבות הן 2, 4 ו־6 אוקטבה למעלה, מעל אקורד ספטימה. הדומיננט מקבל כל שינוי; עם ה־11 צריך זהירות באקורדי מז׳ור.' },
        show: { text: { en: '9 = 2 · 11 = 4 · 13 = 6', he: '9 = 2 · 11 = 4 · 13 = 6' } },
      },
    ],
  },
  {
    id: 'voicings',
    area: 'harmony',
    emoji: '🎹',
    title: { en: 'Voicings and inversions', he: 'וויסינגים והיפוכים' },
    takeaway: { en: 'Same chord, different arrangement: close, drop 2 or spread; the bass note sets the inversion; jazz voicings leave notes out or add color on top.', he: 'אותו אקורד, סידור אחר: צפוף, Drop 2 או פרוש; צליל הבס קובע את ההיפוך; וויסינגים בג׳אז משמיטים צלילים או מוסיפים צבע למעלה.' },
    steps: [
      {
        say: { en: 'Same chord, different outfit: a voicing is how you arrange its notes. Here is Cmaj7 in close position, all four notes packed as tight as they go.', he: 'אותו אקורד, תלבושת אחרת: וויסינג הוא האופן שבו מסדרים את הצלילים. הנה Cmaj7 במצב צפוף — ארבעת הצלילים צמודים ככל האפשר.' },
        play: [ch([60, 64, 67, 71], 1.4), arp([60, 64, 67, 71])],
        show: { notes: [60, 64, 67, 71], chord: true, key: 'C', text: { en: 'Close', he: 'צפוף' } },
      },
      {
        say: { en: 'Drop 2: take the second note from the top and drop it an octave. Wider and smoother — a big-band and guitar favorite.', he: 'Drop 2: לוקחים את הצליל השני מלמעלה ומורידים אותו אוקטבה. רחב וחלק יותר — אהוב על ביג־בנדים ועל גיטריסטים.' },
        play: [ch([55, 60, 64, 71], 1.4), arp([55, 60, 64, 71])],
        show: { notes: [55, 60, 64, 71], chord: true, key: 'C', text: { en: 'Drop 2', he: 'Drop 2' } },
      },
      {
        say: { en: 'Spread: the notes fly apart over more than two octaves, with lots of air inside.', he: 'פרוש: הצלילים מתפזרים על פני יותר משתי אוקטבות, עם הרבה אוויר בפנים.' },
        play: [ch([48, 67, 71, 76], 1.4), arp([48, 67, 71, 76])],
        show: { notes: [48, 67, 71, 76], chord: true, key: 'C', text: { en: 'Spread', he: 'פרוש' } },
      },
      {
        say: { en: 'Inversions are about the bass. Root position has 1 at the bottom; first inversion puts the 3 there, second the 5, third the 7.', he: 'היפוכים קשורים לבס. במצב יסודי ה־1 למטה; בהיפוך ראשון ה־3 בבס, בשני ה־5, ובשלישי ה־7.' },
        play: [ch([60, 64, 67, 70], 1), ch([64, 67, 70, 72], 1), ch([55, 58, 60, 64], 1), ch([58, 64, 67, 72], 1.3)],
        show: { notes: [58, 64, 67, 72], chord: true, key: 'F', text: { en: 'C7 bass: 1 · 3 · 5 · 7', he: 'C7 בבס: 1 · 3 · 5 · 7' } },
      },
      {
        say: { en: 'Jazz pianists travel light. A shell is just 1, 3 and 7. A rootless voicing leaves the root to the bass player and adds 9 and 13.', he: 'פסנתרני ג׳אז נוסעים קל. וויסינג Shell הוא רק 1, 3 ו־7. וויסינג בלי שורש משאיר את השורש לבסיסט ומוסיף 9 ו־13.' },
        play: [ch([48, 52, 58], 1.4), ch([52, 57, 58, 62], 1.6)],
        show: { notes: [52, 57, 58, 62], chord: true, key: 'F', text: { en: 'Shell 1-3-7 · Rootless', he: 'Shell 1-3-7 · בלי שורש' } },
      },
      {
        say: { en: 'Quartal voicings stack fourths: open and modern. An upper structure puts a bright triad over 3 and 7 — here D major on top of C7.', he: 'וויסינג קוורטלי בנוי מקוורטות: פתוח ומודרני. Upper structure שם משולש מואר מעל ה־3 וה־7 — כאן רה מז׳ור מעל C7.' },
        play: [ch([48, 53, 58, 63, 67], 1.5), ch([48, 52, 58, 62, 66, 69], 1.8)],
        show: { notes: [48, 52, 58, 62, 66, 69], chord: true, key: 'F', text: { en: 'Quartal · D/C7', he: 'קוורטלי · D/C7' } },
      },
      {
        say: { en: 'Your turn! You hear a chord together, then note by note. Ask yourself: tight or wide? What is in the bass? Then pick the name.', he: 'תורכם! תשמעו אקורד ביחד, ואז צליל אחר צליל. שאלו את עצמכם: צפוף או רחב? מה בבס? ואז בחרו את השם.' },
        play: [ch([55, 60, 64, 71], 1.4), arp([55, 60, 64, 71])],
        show: { notes: [55, 60, 64, 71], chord: true, key: 'C', text: { en: 'Close? Drop 2? Spread?', he: 'צפוף? Drop 2? פרוש?' } },
      },
    ],
    more: [
      {
        say: { en: 'A voicing decides which notes you play, in which octave and in what order. An inversion only names the bass note. So two voicings can share an inversion: both of these are C major in root position, one close, one open.', he: 'וויסינג קובע אילו צלילים מנגנים, באיזו אוקטבה ובאיזה סדר. היפוך רק נותן שם לצליל הבס. לכן לשני וויסינגים יכול להיות אותו היפוך: שני אלה הם דו מז׳ור במצב יסודי, אחד צפוף ואחד פתוח.' },
        play: [ch([48, 52, 55], 1.2), ch([48, 55, 64], 1.4)],
        show: { notes: [48, 55, 64], chord: true, key: 'C', text: { en: 'C close · C open', he: 'C צפוף · C פתוח' } },
      },
      {
        say: { en: 'Classical figures name inversions. A triad in root position, first inversion is 6, second inversion is 6/4. For seventh chords: 7, 6/5, 4/3 and 4/2. Here are C, C/E and C/G.', he: 'בהרמוניה קלאסית מסמנים היפוכים בספרות. משולש במצב יסודי, היפוך ראשון הוא 6, היפוך שני הוא 6/4. באקורדי ספטימה: 7, ‏6/5, ‏4/3 ו־4/2. הנה C, ‏C/E ו־C/G.' },
        play: [ch([48, 52, 55], 0.9), ch([52, 55, 60], 0.9), ch([55, 60, 64], 1.2)],
        show: { notes: [52, 55, 60], chord: true, key: 'C', text: { en: 'root · 6 · 6/4', he: 'יסודי · 6 · 6/4' } },
      },
      {
        say: { en: 'To hear the inversion, ignore the top and sing the lowest note, then ask which chord tone it is. Root position sounds grounded. Second inversion sounds restless: here C/G leans into G7, then resolves to C.', he: 'כדי לשמוע את ההיפוך, התעלמו מהצליל העליון ושירו את הנמוך ביותר, ואז שאלו איזה צליל באקורד הוא. מצב יסודי נשמע יציב. היפוך שני נשמע חסר מנוחה: כאן C/G נשען על G7 ואז נפתר ל־C.' },
        play: [ch([43, 60, 64, 67], 1), ch([43, 59, 62, 65], 1), ch([36, 55, 64, 72], 1.5)],
        show: { notes: [43, 60, 64, 67], chord: true, key: 'C', text: { en: 'C/G → G7 → C', he: 'C/G ← G7 ← C' } },
      },
      {
        say: { en: 'Good voicings move as little as possible. Keep the shared notes, and move the others by step. C, F, G7, C: each upper voice moves a step or stays put.', he: 'וויסינג טוב זז כמה שפחות. שומרים על הצלילים המשותפים ומזיזים את האחרים בצעד. C, ‏F, ‏G7, ‏C: כל קול עליון זז צעד או נשאר במקום.' },
        play: [ch([48, 64, 67, 72], 0.9), ch([53, 65, 69, 72], 0.9), ch([55, 65, 71, 74], 0.9), ch([48, 64, 72, 76], 1.4)],
        show: { text: { en: 'C – F – G7 – C', he: 'C – F – G7 – C' } },
      },
      {
        say: { en: 'Jazz pianists use rootless voicings in two shapes: one built up from the 3, one from the 7. In a ii–V–I they barely move: Dm9, G13, Cmaj9.', he: 'פסנתרני ג׳אז משתמשים בוויסינגים בלי שורש בשתי צורות: אחת נבנית מה־3, השנייה מה־7. ב־ii–V–I הם כמעט לא זזים: Dm9, ‏G13, ‏Cmaj9.' },
        play: [ch([38, 53, 57, 60, 64], 1), ch([43, 53, 57, 59, 64], 1), ch([36, 52, 55, 59, 62], 1.5)],
        show: { notes: [53, 57, 59, 64], chord: true, key: 'C', text: { en: 'G13: F A B E = 7 9 3 13', he: 'G13: פה לה סי מי = 7 9 3 13' } },
      },
      {
        say: { en: 'The common mistake is a close chord too low. A third down in the bass sounds like mud. Spread the low notes, a fifth or an octave apart, and keep the thirds higher up.', he: 'הטעות הנפוצה היא אקורד צפוף נמוך מדי. טרצה למטה בבס נשמעת כמו בוץ. פרשו את הצלילים הנמוכים — קווינטה או אוקטבה ביניהם — והשאירו את הטרצות גבוה יותר.' },
        play: [ch([36, 40, 43], 1.4), ch([36, 55, 64], 1.5)],
        show: { notes: [36, 55, 64], chord: true, key: 'C', text: { en: 'muddy · clear', he: 'בוץ · צלול' } },
      },
      {
        say: { en: 'In real music, Drop 2 is the sound of big-band sax sections and jazz guitar. Miles Davis\'s So What made a quartal voicing famous: three fourths with a major third on top.', he: 'במוזיקה אמיתית, Drop 2 הוא הצליל של גזרת הסקסופונים בביג־בנד ושל גיטרת ג׳אז. ‏So What של מיילס דייוויס הפך וויסינג קוורטלי למפורסם: שלוש קוורטות ועליהן טרצה גדולה.' },
        play: [ch([40, 45, 50, 55, 59], 1.8)],
        show: { notes: [40, 45, 50, 55, 59], chord: true, key: 'C', text: { en: 'E A D G + B', he: 'מי לה רה סול + סי' } },
      },
      {
        say: { en: 'To keep: the bass sets the inversion, the rest is the voicing. Spread low, keep thirds high, and move each voice as little as you can.', he: 'לזכור: הבס קובע את ההיפוך, כל השאר הוא הוויסינג. פרושים למטה, טרצות למעלה, וכל קול זז כמה שפחות.' },
        show: { text: { en: 'bass = inversion · rest = voicing', he: 'בס = היפוך · השאר = וויסינג' } },
      },
    ],
  },
  {
    id: 'progressions',
    area: 'harmony',
    emoji: '🛤️',
    title: { en: 'Chord progressions', he: 'מהלכי אקורדים' },
    takeaway: { en: 'Roman numerals name a progression in any key. Pop loops I–V–vi–IV; jazz runs on ii–V–I; borrowed chords like ♭VI and ♭VII come from the parallel minor.', he: 'ספרות רומיות נותנות שם למהלך בכל סולם. פופ חוזר על I–V–vi–IV; ג׳אז רץ על ii–V–I; אקורדים שאולים כמו ♭VI ו־♭VII מגיעים מהמינור שעל אותה טוניקה (בדו מז׳ור: מדו מינור).' },
    steps: [
      {
        say: { en: 'Hi {name}! Chords travel in familiar routes called progressions. Roman numerals name each chord by its scale step: uppercase major, lowercase minor.', he: 'היי {name}! אקורדים נוסעים במסלולים מוכרים שנקראים מהלכים. ספרות רומיות מסמנות כל אקורד לפי הדרגה שלו: גדולות למז׳ור, קטנות למינור.' },
        play: [phrase(['I', 'V', 'vi', 'IV'])],
        show: { text: { en: 'I – V – vi – IV', he: 'I – V – vi – IV' } },
      },
      {
        say: { en: 'That was I–V–vi–IV, the pop anthem. Start it on vi and it turns wistful: vi–IV–I–V.', he: 'זה היה I–V–vi–IV, ההמנון של הפופ. מתחילים אותו מ־vi והוא נהיה נוגה: vi–IV–I–V.' },
        play: [phrase(['vi', 'IV', 'I', 'V'])],
        show: { text: { en: 'vi – IV – I – V', he: 'vi – IV – I – V' } },
      },
      {
        say: { en: 'I–vi–IV–V is the fifties doo-wop loop. I–IV–V–I is the plain, sturdy one.', he: 'I–vi–IV–V הוא הלופ של שנות החמישים. I–IV–V–I הוא הפשוט והיציב.' },
        play: [phrase(['I', 'vi', 'IV', 'V']), phrase(['I', 'IV', 'V', 'I'])],
        show: { text: { en: 'I–vi–IV–V · I–IV–V–I', he: 'I–vi–IV–V · I–IV–V–I' } },
      },
      {
        say: { en: 'Jazz runs on ii–V–I: a minor 7, a dominant 7, then home. The turnaround puts I and vi in front: I–vi–ii–V.', he: 'הג׳אז רץ על ii–V–I: מינור 7, דומיננט 7, ואז הביתה. הטרנאראונד מוסיף לפניו I ו־vi: ‏I–vi–ii–V.' },
        play: [ch([38, 57, 60, 65], 0.9), ch([43, 59, 62, 65], 0.9), ch([48, 59, 64, 67], 1.5)],
        show: { text: { en: 'Dm7 – G7 – Cmaj7', he: 'Dm7 – G7 – Cmaj7' } },
      },
      {
        say: { en: 'Tritone sub: swap the V7 for the dominant a tritone away. In C, D♭7 replaces G7, and the bass slides down by semitones.', he: 'תחליף טריטון: מחליפים את V7 בדומיננט שנמצא טריטון ממנו. בדו מז׳ור D♭7 מחליף את G7, והבס גולש למטה בחצאי טונים.' },
        play: [ch([38, 57, 60, 65], 0.9), ch([37, 59, 65, 68], 0.9), ch([36, 59, 64, 67], 1.5)],
        show: { text: { en: 'Dm7 – D♭7 – Cmaj7', he: 'Dm7 – D♭7 – Cmaj7' } },
      },
      {
        say: { en: 'Borrowed chords sneak in from the parallel minor. ♭VI–♭VII–I is the heroic ending. I–♭III–IV–I borrows too.', he: 'אקורדים שאולים מתגנבים מהמינור שעל אותה טוניקה. ♭VI–♭VII–I הוא הסיום ההרואי. גם I–♭III–IV–I שואל.' },
        play: [ch([48, 60, 64, 67], 0.8), ch([44, 60, 63, 68], 0.8), ch([46, 58, 62, 65], 0.8), ch([48, 60, 64, 67], 1.5)],
        show: { text: { en: 'I – ♭VI – ♭VII – I', he: 'I – ♭VI – ♭VII – I' } },
      },
      {
        say: { en: 'IV turning into minor iv sounds bittersweet. The backdoor, iv7–♭VII7–I, comes home from below instead of from V.', he: 'IV שהופך ל־iv מינורי נשמע מתוק־מריר. ה־Backdoor‏, iv7–♭VII7–I, מגיע הביתה מלמטה במקום מ־V.' },
        play: [ch([41, 57, 60, 65], 0.8), ch([41, 60, 65, 68], 0.8), ch([48, 60, 64, 67], 1.1), rest(0.3), ch([41, 60, 63, 68], 0.8), ch([46, 62, 65, 68], 0.8), ch([48, 59, 64, 67], 1.4)],
        show: { text: { en: 'IV–iv–I · iv7–♭VII7–I', he: 'IV–iv–I · iv7–♭VII7–I' } },
      },
      {
        say: { en: 'Your turn! I play a progression in some key. Follow the bass, notice where home lands, and pick the numerals.', he: 'תורכם! אני מנגן מהלך בסולם כלשהו. עקבו אחרי הבס, שימו לב איפה נוחת הבית, ובחרו את הספרות.' },
        play: [phrase(['I', 'vi', 'IV', 'V'])],
        show: { text: { en: '? – ? – ? – ?', he: '? – ? – ? – ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Chords have jobs. Tonic chords (I, vi, iii) feel like home. Predominant chords (IV, ii) lead away. Dominant chords (V, vii°) create tension that wants home. Most progressions follow that path: tonic, predominant, dominant, tonic.', he: 'לאקורדים יש תפקידים. אקורדי טוניקה (I, ‏vi, ‏iii) מרגישים כמו בית. אקורדי סובדומיננטה (IV, ‏ii) מובילים החוצה. אקורדי דומיננטה (V, ‏vii°) יוצרים מתח שרוצה הביתה. רוב המהלכים הולכים בדרך הזאת: טוניקה, סובדומיננטה, דומיננטה, טוניקה.' },
        play: [phrase(['I', 'ii', 'V7', 'I'])],
        show: { text: { en: 'T – PD – D – T', he: 'T – S – D – T' } },
      },
      {
        say: { en: 'The strongest root move is down a fifth, as in V to I. Chain it and you get a circle progression: vi, ii, V, I. The roots fall A, D, G, C.', he: 'תנועת השורש החזקה ביותר היא קווינטה למטה, כמו V ל־I. משרשרים אותה ומקבלים מהלך מעגלי: vi, ‏ii, ‏V, ‏I. השורשים יורדים: לה, רה, סול, דו.' },
        play: [phrase(['vi', 'ii', 'V7', 'I'])],
        show: { text: { en: 'vi – ii – V7 – I', he: 'vi – ii – V7 – I' } },
      },
      {
        say: { en: 'To hear a progression, follow the bass and sing it as scale degrees. Then listen for feel: I is rest, V leans forward, IV lifts away, vi is home in the shade.', he: 'כדי לשמוע מהלך, עקבו אחרי הבס ושירו אותו כדרגות בסולם. ואז הקשיבו לתחושה: I הוא מנוחה, V נוטה קדימה, IV מתרומם החוצה, vi הוא בית בצל.' },
        play: [phrase(['I', 'IV', 'vi', 'V'])],
        show: { text: { en: 'I – IV – vi – V', he: 'I – IV – vi – V' } },
      },
      {
        say: { en: 'A common mix-up is ii and IV. They share two notes and do the same job. Check the bass: in C, IV has F in the bass, ii has D.', he: 'בלבול נפוץ הוא בין ii ל־IV. יש להם שני צלילים משותפים והם עושים אותה עבודה. בדקו את הבס: בדו מז׳ור, ל־IV יש פה בבס, ול־ii יש רה.' },
        play: [ch([41, 57, 60, 65], 1.2), ch([38, 57, 62, 65], 1.4)],
        show: { notes: [38, 57, 62, 65], chord: true, key: 'C', text: { en: 'F (IV) · Dm (ii)', he: 'F (IV) · Dm (ii)' } },
      },
      {
        say: { en: 'In minor, ii–V–i darkens: iiø7, V7, i. In C minor that is Dø7, G7, Cm. The half-diminished ii sets up the minor ending.', he: 'במינור, ii–V–i מתכהה: iiø7, ‏V7, ‏i. בדו מינור זה Dø7, ‏G7, ‏Cm. ה־ii החצי מוקטן מכין את הסיום המינורי.' },
        play: [ch([38, 56, 60, 65], 1), ch([43, 59, 62, 65], 1), ch([36, 55, 60, 63], 1.5)],
        show: { notes: [38, 56, 60, 65], chord: true, key: 'Eb', text: { en: 'Dø7 – G7 – Cm', he: 'Dø7 – G7 – Cm' } },
      },
      {
        say: { en: 'Why does the tritone sub work? G7 and D♭7 share the same tritone, B and F (spelled C♭ in D♭7). Same tension, new bass.', he: 'למה תחליף טריטון עובד? ל־G7 ול־D♭7 יש אותו טריטון, סי ופה (ב־D♭7 הסי נכתב דו♭). אותו מתח, בס חדש.' },
        play: [ch([43, 59, 65], 1.2), ch([37, 59, 65], 1.2), ch([36, 55, 64], 1.4)],
        show: { notes: [59, 65], chord: true, key: 'C', text: { en: 'B + F in both', he: 'סי + פה בשניהם' } },
      },
      {
        say: { en: 'In real music, I–V–vi–IV carries countless pop songs; melody and rhythm make them different. Rock loves ♭VII–IV–I, borrowed from Mixolydian. And jazz standards are chains of ii–V–I in changing keys.', he: 'במוזיקה אמיתית, I–V–vi–IV נושא אינספור שירי פופ; המנגינה והקצב הם שמבדילים ביניהם. רוק אוהב ♭VII–IV–I, שאול מהמיקסולידי. וסטנדרטים של ג׳אז הם שרשראות של ii–V–I בסולמות מתחלפים.' },
        play: [ch([46, 58, 62, 65], 0.9), ch([41, 57, 60, 65], 0.9), ch([48, 55, 60, 64], 1.4)],
        show: { text: { en: '♭VII – IV – I', he: '♭VII – IV – I' } },
      },
      {
        say: { en: 'To keep: chords have jobs, and the bass tells you which degree you are on. Fifths down pull hardest; borrowed chords add color from the parallel minor.', he: 'לזכור: לאקורדים יש תפקידים, והבס אומר על איזו דרגה אתם. קווינטה למטה מושכת הכי חזק; אקורדים שאולים מוסיפים צבע מהמינור שעל אותה טוניקה.' },
        show: { text: { en: 'T → PD → D → T', he: 'T – S – D – T' } },
      },
    ],
  },
  {
    id: 'form',
    area: 'harmony',
    emoji: '🧱',
    title: { en: 'Musical form', he: 'מבנה מוזיקלי' },
    takeaway: { en: 'Give each phrase a letter: the same idea keeps its letter, a variation gets a prime (A′), a new idea gets the next letter.', he: 'נותנים לכל משפט אות: רעיון זהה שומר על האות, וריאציה מקבלת גרש (A′), ורעיון חדש מקבל את האות הבאה.' },
    steps: [
      {
        say: { en: 'Music is built from phrases, like sentences in a story. We label them with letters, and the first idea is always A.', he: 'מוזיקה בנויה ממשפטים, כמו משפטים בסיפור. מסמנים אותם באותיות, והרעיון הראשון הוא תמיד A.' },
        play: [ns(A, 0.32)],
        show: { notes: A, key: 'C', text: { en: 'A', he: 'A' } },
      },
      {
        say: { en: 'If it comes back exactly, it is A again.', he: 'אם הוא חוזר בדיוק, זה שוב A.' },
        play: [ns(A, 0.32), gap, ns(A, 0.32)],
        show: { text: { en: 'A  A', he: 'A  A' } },
      },
      {
        say: { en: 'Same start, different ending? That is a variation, A prime.', he: 'אותה התחלה, סוף אחר? זו וריאציה, A עם גרש.' },
        play: [ns(A, 0.32), gap, ns(A2, 0.32)],
        show: { text: { en: 'A  A′', he: 'A  A′' } },
      },
      {
        say: { en: 'A truly new idea, with a new shape, gets the next letter: B.', he: 'רעיון חדש באמת, עם צורה חדשה, מקבל את האות הבאה: B.' },
        play: [ns(A, 0.32), gap, ns(B, 0.32)],
        show: { text: { en: 'A  B', he: 'A  B' } },
      },
      {
        say: { en: 'Four phrases make a form. AABA is the classic song form: say it twice, take a detour, come home.', he: 'ארבעה משפטים יוצרים מבנה. AABA הוא מבנה השיר הקלאסי: אומרים פעמיים, עושים עיקוף, חוזרים הביתה.' },
        play: [ns(A, 0.26), gap, ns(A, 0.26), gap, ns(B, 0.26), gap, ns(A, 0.26)],
        show: { text: { en: 'A A B A', he: 'A A B A' } },
      },
      {
        say: { en: 'ABAB swaps back and forth, like verse and chorus. AABB pairs them up. ABAC brings A back, then ends somewhere new.', he: 'ABAB מתחלף הלוך ושוב, כמו בית ופזמון. AABB מצמיד אותם בזוגות. ABAC מחזיר את A, ואז מסיים במקום חדש.' },
        play: [ns(A, 0.26), gap, ns(B, 0.26), gap, ns(A, 0.26), gap, ns(Cm, 0.26)],
        show: { text: { en: 'A B A C', he: 'A B A C' } },
      },
      {
        say: { en: 'Your turn! Listen phrase by phrase and give each one a letter in your head. Then pick: same, variation or new — or the four-letter form.', he: 'תורכם! הקשיבו משפט אחרי משפט ותנו לכל אחד אות בראש. ואז בחרו: זהה, וריאציה או חדש — או את המבנה בארבע אותיות.' },
        play: [ns(A, 0.26), gap, ns(A, 0.26), gap, ns(B, 0.26), gap, ns(B, 0.26)],
        show: { text: { en: '? ? ? ?', he: '? ? ? ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Form works in layers. A motif is a few notes; motifs make a phrase, often four bars; phrases make a section; sections make the whole piece. Letters usually label the sections.', he: 'מבנה עובד בשכבות. מוטיב הוא כמה צלילים; מוטיבים יוצרים משפט, לרוב של ארבע תיבות; משפטים יוצרים חלק; וחלקים יוצרים את היצירה כולה. האותיות מסמנות בדרך כלל את החלקים.' },
        show: { text: { en: 'motif → phrase → section → form', he: 'מוטיב ← משפט ← חלק ← מבנה' } },
      },
      {
        say: { en: 'Phrases end in cadences, musical punctuation. Listen: the first phrase ends on G, the 5, like a question. The answer starts the same way and ends on C, home. A question and an answer together form a period.', he: 'משפטים נגמרים בקדנצות, סימני הפיסוק של המוזיקה. הקשיבו: המשפט הראשון נגמר בסול, דרגה 5, כמו שאלה. התשובה מתחילה באותו אופן ונגמרת בדו, בבית. שאלה ותשובה יחד יוצרות פריודה.' },
        play: [ns(A, 0.32), gap, ns(A2, 0.32)],
        show: { notes: A2, key: 'C', text: { en: 'A (open) · A′ (closed)', he: 'A (פתוח) · A′ (סגור)' } },
      },
      {
        say: { en: 'The classic forms: binary is AB; ternary is ABA; rondo keeps coming back to A, as in ABACA. The 32-bar song is AABA, four phrases of eight bars. Pop songs alternate verse and chorus, often with a bridge.', he: 'המבנים הקלאסיים: בינארי הוא AB; טרנארי הוא ABA; רונדו חוזר שוב ושוב ל־A, כמו ABACA. שיר 32 התיבות הוא AABA, ארבעה משפטים של שמונה תיבות. שירי פופ מחליפים בין בית לפזמון, לרוב עם גשר.' },
        play: [ns(A, 0.24), gap, ns(B, 0.24), gap, ns(A, 0.24), gap, ns(Cm, 0.24), gap, ns(A, 0.24)],
        show: { text: { en: 'A B A C A — rondo', he: 'A B A C A — רונדו' } },
      },
      {
        say: { en: 'To hear form, remember the opening well; the rest is spotting its return. Changes of contour, register, key or texture mark a new section. A strong cadence marks an ending.', he: 'כדי לשמוע מבנה, זכרו היטב את הפתיחה; כל השאר זה לזהות מתי היא חוזרת. שינוי בקו המלודי, במנעד, בסולם או במרקם מסמן חלק חדש. קדנצה חזקה מסמנת סיום.' },
        play: [ns(A, 0.28), gap, ns(B, 0.28), gap, ns(A, 0.28)],
        show: { text: { en: 'A B A', he: 'A B A' } },
      },
      {
        say: { en: 'The common mistake is giving a new letter to a small change. Ask: does it start the same and keep its shape? Then it is still A, marked A′. Only a new contour from the start earns B.', he: 'הטעות הנפוצה היא לתת אות חדשה לשינוי קטן. שאלו: האם זה מתחיל אותו דבר ושומר על הצורה? אם כן, זה עדיין A, עם גרש: A′. רק קו מלודי חדש מההתחלה מקבל B.' },
        play: [ns(A, 0.3), gap, ns([60, 62, 64, 62, 60], 0.3), gap, ns(B, 0.3)],
        show: { text: { en: 'A · A′ · B', he: 'A · A′ · B' } },
      },
      {
        say: { en: 'In real music, many jazz standards use AABA, including Gershwin\'s I Got Rhythm, whose chords became a jazz staple. Beethoven\'s Für Elise is a rondo: its famous opening returns between contrasting episodes.', he: 'במוזיקה אמיתית, הרבה סטנדרטים של ג׳אז בנויים AABA, ביניהם I Got Rhythm של גרשווין, שהאקורדים שלו הפכו לבסיס בג׳אז. ״לאליזה״ של בטהובן הוא רונדו: הפתיחה המפורסמת חוזרת בין פרקים מנוגדים.' },
        show: { text: { en: 'AABA · ABACA', he: 'AABA · ABACA' } },
      },
      {
        say: { en: 'To keep: listen in phrases, label by contour, and track returns. Same idea keeps its letter, a variant gets a prime, a new idea gets the next letter.', he: 'לזכור: מקשיבים במשפטים, מסמנים לפי הקו המלודי, ועוקבים אחרי החזרות. רעיון זהה שומר על האות, וריאציה מקבלת גרש, ורעיון חדש מקבל את האות הבאה.' },
        show: { text: { en: 'same A · variant A′ · new B', he: 'זהה A · וריאציה A′ · חדש B' } },
      },
    ],
  },

  // ------------------------------------------------------------------ ear
  {
    id: 'fine-pitch',
    area: 'ear',
    emoji: '🎯',
    title: { en: 'Fine pitch and tuning', he: 'גובה עדין וכיוון' },
    takeaway: { en: 'A semitone is 100 cents. Hear the lean of tiny steps, and listen for the wobble (beating) of two notes out of tune.', he: 'חצי טון הוא 100 סנט. שומעים לאן נוטה צעד זעיר, ומקשיבים לרעידה (פעימות) של שני צלילים לא מכוונים.' },
    steps: [
      {
        say: { en: 'Hi {name}! One piano key to the next is a semitone, and we split it into 100 tiny steps called cents. Today we hunt for much smaller gaps.', he: 'היי {name}! ממקש למקש בפסנתר זה חצי טון, ומחלקים אותו ל־100 צעדים זעירים שנקראים סנט. היום נחפש הבדלים קטנים בהרבה.' },
        play: [n1(60), rest(0.25), n1(61)],
        show: { notes: [60, 61], key: 'C', text: { en: '1 semitone = 100¢', he: 'חצי טון = 100¢' } },
      },
      {
        say: { en: 'Here is 50 cents, half a key. The second note is higher.', he: 'הנה 50 סנט, חצי מקש. הצליל השני גבוה יותר.' },
        play: [n1(60), rest(0.25), n1(60.5)],
        show: { text: { en: '+50¢ ↑', he: '+50¢ ↑' } },
      },
      {
        say: { en: 'Now 25 cents, lower. Do not analyze — just feel which way it leans.', he: 'עכשיו 25 סנט, נמוך יותר. אל תנתחו — פשוט הרגישו לאן הוא נוטה.' },
        play: [n1(64), rest(0.25), n1(63.75)],
        show: { text: { en: '−25¢ ↓', he: '−25¢ ↓' } },
      },
      {
        say: { en: 'Ten cents, higher. Tiny! Humming the first note softly helps you feel the second one pull away.', he: 'עשרה סנט, גבוה יותר. זעיר! זמזום שקט של הצליל הראשון עוזר להרגיש איך השני בורח ממנו.' },
        play: [n1(62), rest(0.25), n1(62.1)],
        show: { text: { en: '+10¢ ↑', he: '+10¢ ↑' } },
      },
      {
        say: { en: 'Two notes together tell on each other. In tune, they blend smoothly. Out of tune, you hear a wobble, called beating.', he: 'שני צלילים יחד מסגירים זה את זה. כשהם מכוונים, הם נמזגים בשקט. כשלא — שומעים רעידה, שנקראת פעימות.' },
        play: [ch([60, 67], 2), rest(0.3), ch([60, 67.35], 2.2)],
        show: { notes: [60, 67], chord: true, key: 'C', text: { en: 'in tune · out of tune', he: 'מכוון · לא מכוון' } },
      },
      {
        say: { en: 'In a melody, one sour note sticks out like a crooked picture on the wall. Which one here?', he: 'במנגינה, צליל אחד חמוץ בולט כמו תמונה עקומה על הקיר. איזה כאן?' },
        play: [ns([60, 62, 64.3, 65, 67], 0.5)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '1 2 3 4 5 — the 3rd!', he: '1 2 3 4 5 — השלישי!' } },
      },
      {
        say: { en: 'Your turn! Two notes one after the other: say higher or lower. In the tuning drill, say in tune or out — or which melody note is off. First impressions are usually right.', he: 'תורכם! שני צלילים בזה אחר זה: אמרו גבוה או נמוך. בתרגיל הכיוון, אמרו מכוון או לא — או איזה צליל במנגינה סוטה. הרושם הראשון בדרך כלל צודק.' },
        play: [n1(57), rest(0.25), n1(56.75)],
        show: { text: { en: 'Higher or lower?', he: 'גבוה או נמוך?' } },
      },
    ],
    more: [
      {
        say: { en: 'An octave is 1200 cents, and an equal-tempered semitone is 100. Cents are a ratio, not hertz, so 10 cents sounds the same size in any register: about 2.5 Hz at A 440, but under 1 Hz two octaves lower.', he: 'אוקטבה היא 1200 סנט, וחצי טון מושווה הוא 100. סנט הוא יחס, לא הרץ, ולכן 10 סנט נשמעים באותו גודל בכל מנעד: בערך 2.5 הרץ על לה 440, אבל פחות מהרץ אחד שתי אוקטבות למטה.' },
        play: [n1(69), rest(0.25), n1(69.1), rest(0.4), n1(45), rest(0.25), n1(45.1)],
        show: { notes: [69, 45], key: 'C', text: { en: '+10¢ high · +10¢ low', he: '+10¢ גבוה · +10¢ נמוך' } },
      },
      {
        say: { en: 'How small can you hear? Trained musicians notice about 5 cents between two notes in a row; most people start near 10 to 25. Practice moves that line, so short daily sessions really help.', he: 'כמה קטן אפשר לשמוע? מוזיקאים מאומנים מבחינים בכ־5 סנט בין שני צלילים ברצף; רוב האנשים מתחילים בסביבות 10 עד 25. תרגול מזיז את הגבול הזה, ולכן אימון קצר כל יום באמת עוזר.' },
        play: [n1(67), rest(0.25), n1(67.05)],
        show: { text: { en: '+5¢ ↑', he: '+5¢ ↑' } },
      },
      {
        say: { en: 'Beating is physics. Two close frequencies drift in and out of step, and the wobble rate equals their difference in hertz. 440 against 442.5 beats about two and a half times a second. As you tune closer, the beats slow down and vanish.', he: 'פעימות הן פיזיקה. שני תדרים קרובים נכנסים ויוצאים מהתאמה, וקצב הרעידה שווה להפרש ביניהם בהרץ. ‏440 מול 442.5 פועמים בערך פעמיים וחצי בשנייה. ככל שמכוונים קרוב יותר, הפעימות מאטות ונעלמות.' },
        play: [ch([69, 69.1], 2.4), rest(0.3), n1(69, 2)],
        show: { notes: [69], key: 'C', text: { en: 'beating · unison', he: 'פעימות · אוניסון' } },
      },
      {
        say: { en: 'Beats tell you something is off, not which way. To find out, move one note a little. If the beats speed up, you went the wrong way; if they slow down, keep going.', he: 'פעימות אומרות שמשהו לא מכוון, אבל לא לאיזה כיוון. כדי לדעת, הזיזו צליל אחד מעט. אם הפעימות מואצות, הלכתם לכיוון הלא נכון; אם הן מאטות, המשיכו.' },
        show: { text: { en: 'faster = wrong way · slower = closer', he: 'מהיר יותר = כיוון לא נכון · איטי יותר = מתקרבים' } },
      },
      {
        say: { en: 'In tune also depends on context. A pure major third is about 14 cents narrower than the piano\'s. Singers and string players often settle a major third a little low in chords. Compare the piano third with the pure one.', he: 'מכוון תלוי גם בהקשר. טרצה גדולה טהורה צרה בכ־14 סנט מזו של הפסנתר. זמרים ונגני כלי קשת מנמיכים לעיתים קרובות מעט את הטרצה הגדולה באקורדים. השוו את הטרצה של הפסנתר לטהורה.' },
        play: [ch([60, 64], 2), rest(0.3), ch([60, 63.86], 2)],
        show: { notes: [60, 64], chord: true, key: 'C', text: { en: 'piano 400¢ · pure 386¢', he: 'פסנתר 400¢ · טהורה 386¢' } },
      },
      {
        say: { en: 'A common trap: loudness and brightness fool the ear. A louder or brighter note can seem higher when it is not. Compare pitch only, and hum the first note to hold it steady.', he: 'מלכודת נפוצה: עוצמה ובהירות מטעות את האוזן. צליל חזק או בהיר יותר עלול להישמע גבוה יותר כשהוא לא. השוו רק את הגובה, וזמזמו את הצליל הראשון כדי להחזיק אותו יציב.' },
        show: { text: { en: 'louder ≠ higher', he: 'חזק יותר ≠ גבוה יותר' } },
      },
      {
        say: { en: 'In real music, orchestras tune to an A, usually 440 or 442 hertz, and piano tuners count beats to set every interval. To keep: 100 cents per semitone, and beats that slow down mean you are getting closer.', he: 'במוזיקה אמיתית, תזמורות מכוונות ללה, בדרך כלל 440 או 442 הרץ, ומכווני פסנתרים סופרים פעימות כדי לקבוע כל מרווח. לזכור: 100 סנט בחצי טון, ופעימות שמאטות אומרות שאתם מתקרבים.' },
        play: [n1(69, 1.6)],
        show: { notes: [69], key: 'C', text: { en: 'A = 440 Hz', he: 'לה = 440 הרץ' } },
      },
    ],
  },
  {
    id: 'two-voice',
    area: 'ear',
    emoji: '👯',
    title: { en: 'Two voices', he: 'שני קולות' },
    takeaway: { en: 'Two voices move in parallel (same way, same distance), similar (same way), contrary (opposite ways) or oblique (one stays).', he: 'שני קולות נעים במקביל (אותו כיוון, אותו מרחק), בתנועה דומה (אותו כיוון), נגדית (כיוונים הפוכים) או אלכסונית (אחד נשאר).' },
    steps: [
      {
        say: { en: 'Hi {name}! Two voices can move together in four ways. Parallel: same direction, same distance, like dancers in step.', he: 'היי {name}! שני קולות יכולים לנוע יחד בארבע דרכים. מקבילה: אותו כיוון, אותו מרחק, כמו רקדנים בצעד אחד.' },
        play: [ch([60, 76], 0.9), ch([62, 77], 1.3)],
        show: { notes: [60, 76, 62, 77], key: 'C', text: { en: 'Parallel ↗↗', he: 'מקבילה ↗↗' } },
      },
      {
        say: { en: 'Similar: same direction, but different distances. Here the low voice steps up while the high one leaps up.', he: 'דומה: אותו כיוון, אבל מרחקים שונים. כאן הקול הנמוך עולה צעד והגבוה קופץ למעלה.' },
        play: [ch([60, 79], 0.9), ch([62, 84], 1.3)],
        show: { notes: [60, 79, 62, 84], key: 'C', text: { en: 'Similar ↗↗', he: 'דומה ↗↗' } },
      },
      {
        say: { en: 'Contrary: one voice goes up while the other goes down. Composers adore this one.', he: 'נגדית: קול אחד עולה בזמן שהשני יורד. מלחינים מאוד אוהבים את זו.' },
        play: [ch([64, 79], 0.9), ch([62, 81], 1.3)],
        show: { notes: [64, 79, 62, 81], key: 'C', text: { en: 'Contrary ↘↗', he: 'נגדית ↘↗' } },
      },
      {
        say: { en: 'Oblique: one voice stays put while the other moves.', he: 'אלכסונית: קול אחד נשאר במקום והשני זז.' },
        play: [ch([60, 79], 0.9), ch([60, 81], 1.3)],
        show: { notes: [60, 79, 60, 81], key: 'C', text: { en: 'Oblique →↗', he: 'אלכסונית →↗' } },
      },
      {
        say: { en: 'Next, follow one line. Four two-note chords, then the lower voice alone: 1, 2, 3, 2.', he: 'עכשיו עוקבים אחרי קו אחד. ארבעה צמדי צלילים, ואז הקול התחתון לבד: 1, 2, 3, 2.' },
        play: [ch([60, 79], 0.6), ch([62, 77], 0.6), ch([64, 76], 0.6), ch([62, 77], 0.9), rest(0.4), ns([60, 62, 64, 62], 0.55)],
        show: { notes: [60, 62, 64, 62], key: 'C', text: { en: 'Lower: 1 2 3 2', he: 'תחתון: 1 2 3 2' } },
      },
      {
        say: { en: 'The top voice is easiest to hear. For the lower one, hum quietly along with the bass and let it guide you.', he: 'את הקול העליון הכי קל לשמוע. בשביל התחתון, זמזמו בשקט יחד עם הבס ותנו לו להוביל אתכם.' },
        play: [ch([60, 79], 0.6), ch([62, 77], 0.6), ch([64, 76], 0.6), ch([62, 77], 0.9), rest(0.4), ns([79, 77, 76, 77], 0.55)],
        show: { notes: [79, 77, 76, 77], key: 'C', text: { en: 'Upper: 5 4 3 4', he: 'עליון: 5 4 3 4' } },
      },
      {
        say: { en: 'Your turn! Name the motion — parallel, similar, contrary or oblique. Or, in the line levels, pick the scale degrees the lower or upper voice sang.', he: 'תורכם! תנו שם לתנועה — מקבילה, דומה, נגדית או אלכסונית. או, בשלבי הקווים, בחרו את הדרגות שהקול התחתון או העליון שר.' },
        play: [ch([64, 79], 0.9), ch([62, 81], 1.3)],
        show: { text: { en: 'How do they move?', he: 'איך הם נעים?' } },
      },
    ],
    more: [
      {
        say: { en: 'Combining independent lines is called counterpoint. What makes two lines independent is mostly their motion: contrary and oblique motion keep them apart, while parallel motion makes them blend into one.', he: 'שילוב של קווים עצמאיים נקרא קונטרפונקט. מה שהופך שני קווים לעצמאיים הוא בעיקר התנועה שלהם: תנועה נגדית ואלכסונית שומרות עליהם נפרדים, ותנועה מקבילה ממזגת אותם לאחד.' },
        play: [ch([60, 72], 0.7), ch([62, 71], 0.7), ch([64, 69], 0.7), ch([65, 67], 0.7), ch([64, 72], 1.2)],
        show: { text: { en: 'contrary: lines stay apart', he: 'נגדית: הקווים נשארים נפרדים' } },
      },
      {
        say: { en: 'Parallel means the same interval number each time: a third stays a third, even if a major third becomes a minor one in the key. Similar motion changes the distance. Watch the number, not just the direction.', he: 'מקבילה פירושה אותו מספר מרווח בכל פעם: טרצה נשארת טרצה, גם אם טרצה גדולה הופכת לקטנה בתוך הסולם. בתנועה דומה המרחק משתנה. הסתכלו על המספר, לא רק על הכיוון.' },
        play: [ch([60, 64], 0.7), ch([62, 65], 0.7), ch([64, 67], 1.1)],
        show: { notes: [60, 64, 62, 65, 64, 67], key: 'C', text: { en: 'C–E · D–F · E–G = 3 3 3', he: 'דו–מי · רה–פה · מי–סול = 3 3 3' } },
      },
      {
        say: { en: 'A listening strategy: track the gap between the voices. Same gap means parallel. Gap changes but both move the same way means similar. Gap opens or closes fast means contrary. One note held means oblique.', he: 'אסטרטגיית האזנה: עקבו אחרי הפער בין הקולות. אותו פער — מקבילה. הפער משתנה אבל שניהם באותו כיוון — דומה. הפער נפתח או נסגר מהר — נגדית. צליל אחד מוחזק — אלכסונית.' },
        show: { text: { en: 'same gap · same way · opposite · one holds', he: 'אותו פער · אותו כיוון · הפוך · אחד מחזיק' } },
      },
      {
        say: { en: 'Classical style forbids parallel fifths and octaves: the two voices fuse and lose their independence. Parallel thirds and sixths are welcome. Hear the hollow fifths, then the sweet thirds.', he: 'בסגנון הקלאסי אסור לכתוב קווינטות ואוקטבות מקבילות: שני הקולות מתמזגים ומאבדים את העצמאות שלהם. טרצות וסקסטות מקבילות רצויות. שמעו את הקווינטות החלולות, ואז את הטרצות המתוקות.' },
        play: [ch([48, 55], 0.6), ch([50, 57], 0.6), ch([52, 59], 0.9), rest(0.3), ch([60, 64], 0.6), ch([62, 65], 0.6), ch([64, 67], 0.9)],
        show: { text: { en: 'parallel 5ths ✗ · parallel 3rds ✓', he: 'קווינטות מקבילות ✗ · טרצות מקבילות ✓' } },
      },
      {
        say: { en: 'The classic two-voice cadence uses contrary motion: the lower voice falls from 2 to 1 while the upper rises from 7 to 8. Both land on C, an octave apart.', he: 'הקדנצה הקלאסית בשני קולות משתמשת בתנועה נגדית: הקול התחתון יורד מ־2 ל־1, והעליון עולה מ־7 ל־8. שניהם נוחתים על דו, באוקטבה זה מזה.' },
        play: [ch([62, 71], 1), ch([60, 72], 1.5)],
        show: { notes: [62, 71, 60, 72], key: 'C', text: { en: '2→1 · 7→8', he: '2→1 · 7→8' } },
      },
      {
        say: { en: 'To practice, play one line and sing the other, then swap. The lower voice is the hard one, so sing it first.', he: 'כדי לתרגל, נגנו קו אחד ושירו את השני, ואז החליפו. הקול התחתון הוא הקשה, אז שירו אותו קודם.' },
        play: [ns([60, 62, 64, 62], 0.55)],
        show: { notes: [60, 62, 64, 62], key: 'C', text: { en: 'sing the lower line', he: 'שירו את הקו התחתון' } },
      },
      {
        say: { en: 'In real music, Bach\'s two-part inventions are the classic school of two independent voices. Many folk duets, on the other hand, sing in parallel thirds. To keep: watch the gap, and contrary motion makes lines independent.', he: 'במוזיקה אמיתית, האינבנציות לשני קולות של באך הן בית הספר הקלאסי לשני קולות עצמאיים. לעומתן, הרבה דואטים עממיים שרים בטרצות מקבילות. לזכור: עקבו אחרי הפער, ותנועה נגדית יוצרת קווים עצמאיים.' },
        show: { text: { en: 'parallel · similar · contrary · oblique', he: 'מקבילה · דומה · נגדית · אלכסונית' } },
      },
    ],
  },
  {
    id: 'set-classes',
    area: 'ear',
    emoji: '🔢',
    title: { en: 'Trichords and prime form', he: 'טריכורדים וצורה ראשונית' },
    takeaway: { en: 'A set class groups a chord with all its transpositions and its mirror image; its prime form is the most compact spelling from 0, like [0,3,7].', he: 'סט מאגד אקורד עם כל הטרנספוזיציות שלו ועם תמונת המראה שלו; הצורה הראשונית היא הכתיבה הדחוסה ביותר מ־0, כמו [0,3,7].' },
    steps: [
      {
        say: { en: 'Without a key, we name chords with numbers. Count semitones up from the lowest note: C, E, G is 0, 4, 7.', he: 'בלי סולם, נותנים לאקורדים שמות במספרים. סופרים חצאי טונים מהצליל הנמוך: דו, מי, סול זה 0, 4, 7.' },
        play: [arp([60, 64, 67], 1.5), ch([60, 64, 67], 1.3)],
        show: { notes: [60, 64, 67], chord: true, key: 'C', text: { en: '0 4 7', he: '0 4 7' } },
      },
      {
        say: { en: 'Flip it upside down and you get the minor triad. A set class counts a chord, its mirror and every transposition as one family, named by its most compact form: the prime form. Both triads are [0,3,7].', he: 'הופכים אותו במראה ומקבלים את המשולש המינורי. סט מאגד אקורד, את תמונת המראה שלו ואת כל הטרנספוזיציות שלו למשפחה אחת, ששמה הוא הצורה הדחוסה ביותר: הצורה הראשונית. שני המשולשים הם [0,3,7].' },
        play: [ch([60, 64, 67], 1.1), ch([60, 63, 67], 1.4)],
        show: { notes: [60, 63, 67], chord: true, key: 'C', text: { en: '[0,3,7]', he: '[0,3,7]' } },
      },
      {
        say: { en: 'Some families have strong faces. [0,1,2] is a cluster of semitones. [0,2,7] stacks fifths: open and hollow.', he: 'לחלק מהמשפחות יש פרצוף ברור. [0,1,2] הוא קלאסטר של חצאי טונים. [0,2,7] בנוי מקווינטות: פתוח וחלול.' },
        play: [ch([60, 61, 62], 1.4), ch([60, 67, 74], 1.6)],
        show: { notes: [60, 61, 62], chord: true, key: 'C', text: { en: '[0,1,2] · [0,2,7]', he: '[0,1,2] · [0,2,7]' } },
      },
      {
        say: { en: '[0,3,6] is the tense diminished triad. [0,4,8] is the augmented triad, dreamy and floating.', he: '[0,3,6] הוא המשולש המוקטן והמתוח. [0,4,8] הוא המשולש המוגדל, חולמני ומרחף.' },
        play: [ch([60, 63, 66], 1.4), ch([60, 64, 68], 1.6)],
        show: { notes: [60, 64, 68], chord: true, key: 'C', text: { en: '[0,3,6] · [0,4,8]', he: '[0,3,6] · [0,4,8]' } },
      },
      {
        say: { en: 'Harder ones hide a semitone. [0,1,6] adds a tritone: the Viennese sound of Schoenberg. [0,1,5] adds a fourth, [0,1,4] a minor and a major third.', he: 'הקשים יותר מסתירים חצי טון. [0,1,6] מוסיף טריטון: הצליל הווינאי של שנברג. [0,1,5] מוסיף קוורטה, ו־[0,1,4] טרצה קטנה וטרצה גדולה.' },
        play: [ch([60, 61, 66], 1.2), ch([60, 61, 65], 1.2), ch([60, 61, 64], 1.4)],
        show: { notes: [60, 61, 66], chord: true, key: 'C', text: { en: '[0,1,6] · [0,1,5] · [0,1,4]', he: '[0,1,6] · [0,1,5] · [0,1,4]' } },
      },
      {
        say: { en: 'The notes may be spread out or flipped, so listen for ingredients: a semitone crunch, a tritone itch, an open fifth.', he: 'הצלילים עשויים להיות פרושים או הפוכים, אז הקשיבו למרכיבים: שפשוף של חצי טון, עקצוץ של טריטון, קווינטה פתוחה.' },
        play: [ch([55, 61, 72], 1.4), arp([55, 61, 72], 1.5)],
        show: { notes: [55, 61, 72], chord: true, key: 'C', text: { en: 'G C♯ C = [0,1,6]', he: 'G C♯ C = [0,1,6]' } },
      },
      {
        say: { en: 'Your turn! I play a three-note chord, together and then broken upward. Pick its family in prime form.', he: 'תורכם! אני מנגן אקורד של שלושה צלילים, ביחד ואז צליל אחר צליל. בחרו את המשפחה שלו בצורה ראשונית.' },
        play: [ch([57, 60, 65], 1.3), arp([57, 60, 65], 1.4)],
        show: { text: { en: '[0,?,?]', he: '[0,?,?]' } },
      },
    ],
    more: [
      {
        say: { en: 'Set theory works with pitch classes: octaves and enharmonic spellings count as the same. C is 0, C♯ is 1, up to B, which is 11, and you count around a clock of twelve. G, C♯, C becomes the set 7, 1, 0.', he: 'תורת הסטים עובדת עם מחלקות צליל: אוקטבות וכתיבים אנהרמוניים נחשבים לאותו דבר. דו הוא 0, דו דיאז 1, עד סי שהוא 11, וסופרים סביב שעון של שתים־עשרה. סול, דו דיאז, דו הופכים לסט 7, 1, 0.' },
        play: [arp([55, 61, 72], 1.6)],
        show: { notes: [55, 61, 72], chord: true, key: 'C', text: { en: 'G C♯ C = {7, 1, 0}', he: 'סול דו♯ דו = {7, 1, 0}' } },
      },
      {
        say: { en: 'Step one: normal form. Order the pitch classes inside one octave and try each one as the start. Keep the order with the smallest span. For {0, 1, 7} that is 7, 0, 1, spanning six semitones. Then subtract 7: 0, 5, 6.', he: 'שלב ראשון: צורה נורמלית. מסדרים את מחלקות הצליל בתוך אוקטבה אחת ומנסים להתחיל מכל אחת. שומרים את הסדר עם המרחק הקטן ביותר. ב־{0, 1, 7} זה 7, 0, 1 — שישה חצאי טונים. ואז מחסירים 7: ‏0, 5, 6.' },
        show: { text: { en: '{7, 0, 1} → [0, 5, 6]', he: '{7, 0, 1} → [0, 5, 6]' } },
      },
      {
        say: { en: 'Step two: try the mirror. Inverted, 0, 5, 6 becomes 0, 1, 6. The prime form is whichever packs the smaller intervals to the left, so [0,1,6]. That is why major and minor triads share [0,3,7].', he: 'שלב שני: בודקים את תמונת המראה. בהיפוך, 0, 5, 6 הופך ל־0, 1, 6. הצורה הראשונית היא זו שדוחסת את המרווחים הקטנים שמאלה, כלומר [0,1,6]. זו הסיבה שמשולש מז׳ורי ומינורי חולקים את [0,3,7].' },
        play: [ch([60, 65, 66], 1.3), ch([60, 61, 66], 1.4)],
        show: { notes: [60, 61, 66], chord: true, key: 'C', text: { en: '[0,5,6] mirror → [0,1,6]', he: 'המראה של [0,5,6]: [0,1,6]' } },
      },
      {
        say: { en: 'There are exactly twelve trichord families: [0,1,2], [0,1,3], [0,1,4], [0,1,5], [0,1,6], [0,2,4], [0,2,5], [0,2,6], [0,2,7], [0,3,6], [0,3,7] and [0,4,8].', he: 'יש בדיוק שתים־עשרה משפחות של טריכורדים: [0,1,2], ‏[0,1,3], ‏[0,1,4], ‏[0,1,5], ‏[0,1,6], ‏[0,2,4], ‏[0,2,5], ‏[0,2,6], ‏[0,2,7], ‏[0,3,6], ‏[0,3,7] ו־[0,4,8].' },
        show: { text: { en: '12 trichord classes', he: '12 משפחות של טריכורדים' } },
      },
      {
        say: { en: 'To hear the family, listen for its three intervals. [0,1,6] has a semitone, a fourth and a tritone. [0,1,5] has a semitone, a major third and a fourth. [0,1,4] has a semitone, a minor third and a major third.', he: 'כדי לשמוע את המשפחה, הקשיבו לשלושת המרווחים שלה. ב־[0,1,6] יש חצי טון, קוורטה וטריטון. ב־[0,1,5] יש חצי טון, טרצה גדולה וקוורטה. ב־[0,1,4] יש חצי טון, טרצה קטנה וטרצה גדולה.' },
        play: [arp([60, 61, 66], 1.3), arp([60, 61, 65], 1.3), arp([60, 61, 64], 1.3)],
        show: { text: { en: '1 5 6 · 1 4 5 · 1 3 4', he: '1 5 6 · 1 4 5 · 1 3 4' } },
      },
      {
        say: { en: 'The common mistake is missing a disguised semitone. Spread out, it becomes a major seventh or a minor ninth. Both still count as a semitone: they are the same interval class.', he: 'הטעות הנפוצה היא לפספס חצי טון מוסווה. כשהצלילים פרושים, הוא הופך לספטימה גדולה או ל־9 קטנה. שתיהן עדיין נחשבות חצי טון: הן אותה מחלקת מרווח.' },
        play: [ch([60, 61], 1.1), ch([60, 71], 1.1), ch([60, 73], 1.3)],
        show: { notes: [60, 73], chord: true, key: 'C', text: { en: 'm2 = M7 = m9 → class 1', he: 'חצי טון = ספטימה גדולה = 9 קטנה ← מחלקה 1' } },
      },
      {
        say: { en: 'In real music, [0,1,6] is so typical of Schoenberg and Webern that it is called the Viennese trichord. Webern built the row of his Concerto, Op. 24, from four [0,1,4] trichords. Stacked fourths, as in modern jazz, give [0,2,7].', he: 'במוזיקה אמיתית, [0,1,6] כל כך אופייני לשנברג ולוברן שהוא נקרא ״הטריכורד הווינאי״. וברן בנה את הסדרה של הקונצ׳רטו שלו, אופוס 24, מארבעה טריכורדים של [0,1,4]. קוורטות ערומות, כמו בג׳אז מודרני, נותנות [0,2,7].' },
        play: [ch([60, 65, 70], 1.5)],
        show: { notes: [60, 65, 70], chord: true, key: 'C', text: { en: 'C F B♭ = [0,2,7]', he: 'דו פה סי♭ = [0,2,7]' } },
      },
      {
        say: { en: 'To keep: reduce to pitch classes, find the most compact order, compare with its mirror, and start from 0. Then trust the interval ingredients.', he: 'לזכור: מצמצמים למחלקות צליל, מוצאים את הסדר הדחוס ביותר, משווים לתמונת המראה, ומתחילים מ־0. ואז סומכים על המרווחים שבפנים.' },
        show: { text: { en: 'compact · mirror · from 0', he: 'דחוס · מראה · מ־0' } },
      },
    ],
  },

  // ------------------------------------------------------------------ world
  {
    id: 'maqam',
    area: 'world',
    emoji: '🕌',
    title: { en: 'Maqamat', he: 'מקאמים' },
    takeaway: { en: 'A maqam is built from small note groups (ajnas); the first jins gives its flavor: Hijaz has the wide gap, Rast and Bayati the quarter tones.', he: 'מקאם בנוי מקבוצות צלילים קטנות (אג׳נאס); הג׳ינס הראשון נותן את הטעם: בחיג׳אז יש את הפער הרחב, בראסט ובביאתי — רבעי הטונים.' },
    steps: [
      {
        say: { en: 'Hi {name}! Arabic music organizes melody in maqamat. Each maqam is built from small groups of about four notes, each called a jins. The first jins gives the flavor.', he: 'היי {name}! המוזיקה הערבית מארגנת מנגינות במקאמים. כל מקאם בנוי מקבוצות קטנות של כארבעה צלילים, וכל אחת נקראת ג׳ינס. הג׳ינס הראשון נותן את הטעם.' },
        play: [ns(mq(58, [0, 2, 4, 5, 7, 9, 11, 12]), 0.32)],
        show: { notes: mq(58, [0, 2, 4, 5, 7, 9, 11, 12]), key: 'Bb', text: { en: 'Ajam = major', he: 'עג׳ם = מז׳ור' } },
      },
      {
        say: { en: 'That was Ajam, our familiar major scale. Hijaz is famous for its wide gap: a semitone, then a step and a half.', he: 'זה היה עג׳ם, סולם המז׳ור המוכר. חיג׳אז מפורסם בפער הרחב שלו: חצי טון, ואז טון וחצי.' },
        play: [ns(mq(62, [0, 1, 4, 5, 7, 8, 10, 12]), 0.32)],
        show: { notes: mq(62, [0, 1, 4, 5]), text: { en: 'Hijaz: D E♭ F♯ G', he: 'חיג׳אז: רה מי♭ פה♯ סול' } },
      },
      {
        say: { en: 'Kurd starts with a semitone and then whole steps, like Phrygian. Nahawand sounds like harmonic minor.', he: 'כורד מתחיל בחצי טון ואחריו טונים שלמים, כמו פריגי. נהוונד נשמע כמו מינור הרמוני.' },
        play: [ns(mq(62, [0, 1, 3, 5, 7, 8, 10, 12]), 0.3), rest(0.3), ns(mq(60, [0, 2, 3, 5, 7, 8, 11, 12]), 0.3)],
        show: { notes: mq(62, [0, 1, 3, 5]), text: { en: 'Kurd · Nahawand', he: 'כורד · נהוונד' } },
      },
      {
        say: { en: 'Now the magic ingredient: the quarter tone, a note between the piano keys. E half-flat sits right between E♭ and E.', he: 'ועכשיו המרכיב הקסום: רבע הטון, צליל שנמצא בין קלידי הפסנתר. מי חצי במול יושב בדיוק בין מי במול למי.' },
        play: [ns([63, 63.5, 64], 0.8)],
        show: { text: { en: 'E♭ · E half-flat · E', he: 'מי במול · מי חצי במול · מי' } },
      },
      {
        say: { en: 'Rast, on C, has a half-flat third and seventh: proud and warm. Bayati, on D, opens with a three-quarter step, soulful and earthy.', he: 'ראסט, על דו, עם טרצה וספטימה בחצי במול: גאה וחם. ביאתי, על רה, נפתח בצעד של שלושה רבעי טון, מלא נשמה וארצי.' },
        play: [ns(mq(60, [0, 2, 3.5, 5, 7, 9, 10.5, 12]), 0.3), rest(0.3), ns(mq(62, [0, 1.5, 3, 5, 7]), 0.35)],
        show: { text: { en: 'Rast · Bayati', he: 'ראסט · ביאתי' } },
      },
      {
        say: { en: 'Saba is Bayati with a lowered fourth, and it sounds heartbroken. Sikah starts on E half-flat itself.', he: 'סבא הוא ביאתי עם דרגה 4 מונמכת, והוא נשמע שבור לב. סיקה מתחיל על מי חצי במול עצמו.' },
        play: [ns(mq(62, [0, 1.5, 3, 4]), 0.4), rest(0.3), ns(mq(63.5, [0, 1.5, 3.5, 5.5, 7]), 0.4)],
        show: { text: { en: 'Saba · Sikah', he: 'סבא · סיקה' } },
      },
      {
        say: { en: 'Your turn! I play a maqam up and down. Listen to its first four notes and their gaps: a wide Hijaz leap, a quarter tone, or plain steps. Then name the maqam, or just its jins.', he: 'תורכם! אני מנגן מקאם עולה ויורד. הקשיבו לארבעת הצלילים הראשונים ולמרווחים ביניהם: קפיצה רחבה של חיג׳אז, רבע טון או צעדים רגילים. ואז תנו שם למקאם, או רק לג׳ינס.' },
        play: [ns(mq(62, [0, 1, 4, 5, 7, 8, 10, 12]), 0.32), ns(mq(62, [10, 8, 7, 5, 4, 1, 0]), 0.32)],
        show: { text: { en: 'Which maqam?', he: 'איזה מקאם?' } },
      },
    ],
    more: [
      {
        say: { en: 'A maqam is more than a scale. It has a tonic, two or more ajnas joined together, a pivot note where the next jins begins, and a typical path for the melody. Bayati on D is jins Bayati on D plus jins Nahawand on G.', he: 'מקאם הוא יותר מסולם. יש לו טוניקה, שני אג׳נאס או יותר שמחוברים זה לזה, צליל ציר שבו מתחיל הג׳ינס הבא, ודרך אופיינית שבה המנגינה הולכת. ביאתי על רה הוא ג׳ינס ביאתי על רה ועוד ג׳ינס נהוונד על סול.' },
        play: [ns(mq(62, [0, 1.5, 3, 5, 7, 8, 10, 12]), 0.34)],
        show: { text: { en: 'Bayati: D … G | G A B♭ C D', he: 'ביאתי: רה … סול | סול לה סי♭ דו רה' } },
      },
      {
        say: { en: 'Measure in semitones: a quarter tone is half a semitone, and the neutral step between a semitone and a tone is 1.5. Jins Rast goes 2, 1.5, 1.5. Jins Bayati turns it around: 1.5, 1.5, 2.', he: 'מודדים בחצאי טונים: רבע טון הוא חצי של חצי טון, והצעד הנייטרלי שבין חצי טון לטון הוא 1.5. ג׳ינס ראסט הולך 2, 1.5, 1.5. ג׳ינס ביאתי הופך את זה: 1.5, 1.5, 2.' },
        play: [ns(mq(60, [0, 2, 3.5, 5]), 0.5), rest(0.35), ns(mq(62, [0, 1.5, 3, 5]), 0.5)],
        show: { text: { en: 'Rast 2 · 1.5 · 1.5 — Bayati 1.5 · 1.5 · 2', he: 'ראסט 2 · 1.5 · 1.5 — ביאתי 1.5 · 1.5 · 2' } },
      },
      {
        say: { en: 'Four ajnas need no quarter tones. Ajam goes 2, 2, 1, like major. Nahawand goes 2, 1, 2, like minor. Kurd goes 1, 2, 2. Hijaz goes 1, 3, 1. Hijaz and Kurd differ only in the third note: F♯ or F.', he: 'ארבעה אג׳נאס לא צריכים רבעי טונים. עג׳ם הולך 2, 2, 1, כמו מז׳ור. נהוונד הולך 2, 1, 2, כמו מינור. כורד הולך 1, 2, 2. חיג׳אז הולך 1, 3, 1. חיג׳אז וכורד נבדלים רק בצליל השלישי: פה דיאז או פה.' },
        play: [ns(mq(62, [0, 1, 4, 5]), 0.5), rest(0.35), ns(mq(62, [0, 1, 3, 5]), 0.5)],
        show: { notes: mq(62, [0, 1, 4, 5]), key: 'C', text: { en: 'Hijaz D E♭ F♯ G · Kurd D E♭ F G', he: 'חיג׳אז רה מי♭ פה♯ סול · כורד רה מי♭ פה סול' } },
      },
      {
        say: { en: 'Rast, Bayati and Sikah are one family. Bayati on D starts with D, E half-flat, F, G: the same notes as Rast on C from its 2nd degree. Sikah starts on Rast\'s 3rd degree, E half-flat itself.', he: 'ראסט, ביאתי וסיקה הם משפחה אחת. ביאתי על רה מתחיל ברה, מי חצי במול, פה, סול: אותם צלילים כמו ראסט על דו, החל מדרגה 2. סיקה מתחיל מדרגה 3 של ראסט — מי חצי במול עצמו.' },
        play: [ns(mq(60, [0, 2, 3.5, 5, 7]), 0.42), rest(0.35), ns(mq(63.5, [0, 1.5, 3.5]), 0.5)],
        show: { text: { en: 'Rast C D E½♭ F G · Sikah E½♭ F G', he: 'ראסט דו רה מי½♭ פה סול · סיקה מי½♭ פה סול' } },
      },
      {
        say: { en: 'A listening strategy: start with the 2nd degree. A semitone above the tonic means Kurd or Hijaz. Three quarters means Bayati or Saba. A whole tone means Rast, Nahawand or Ajam. Then the 3rd degree decides.', he: 'אסטרטגיית האזנה: מתחילים מדרגה 2. חצי טון מעל הטוניקה — כורד או חיג׳אז. שלושה רבעים — ביאתי או סבא. טון שלם — ראסט, נהוונד או עג׳ם. ואז דרגה 3 מכריעה.' },
        play: [ns([62, 63], 0.55), rest(0.3), ns([62, 63.5], 0.55), rest(0.3), ns([62, 64], 0.55)],
        show: { text: { en: '1 · 1.5 · 2', he: '1 · 1.5 · 2' } },
      },
      {
        say: { en: 'Saba is Bayati with its 4th lowered to G♭, so its first jins spans less than a fourth and never quite settles. Above it, F, G♭, A, B♭ form a Hijaz.', he: 'סבא הוא ביאתי שדרגה 4 שלו הונמכה לסול במול, ולכן הג׳ינס הראשון שלו קצר מקוורטה ולא באמת נח. מעליו, פה, סול♭, לה, סי♭ יוצרים חיג׳אז.' },
        play: [ns(mq(62, [0, 1.5, 3, 5]), 0.45), rest(0.35), ns(mq(62, [0, 1.5, 3, 4, 7, 8]), 0.45)],
        show: { text: { en: 'Bayati D E½♭ F G · Saba D E½♭ F G♭', he: 'ביאתי רה מי½♭ פה סול · סבא רה מי½♭ פה סול♭' } },
      },
      {
        say: { en: 'To sing the half-flat, sing E♭ and E, then aim right between them. Practice each jins slowly over a drone on the tonic, so you hear every step against home.', he: 'כדי לשיר את חצי הבמול, שירו מי במול ומי, ואז כוונו בדיוק לאמצע. תרגלו כל ג׳ינס לאט מעל דרון על הטוניקה, כדי לשמוע כל צעד מול הבית.' },
        play: [n1(62, 1), ns([63, 64, 63.5], 0.7)],
        show: { text: { en: 'E♭ · E · E½♭', he: 'מי♭ · מי · מי½♭' } },
      },
      {
        say: { en: 'Two common mistakes. First, hearing the half-flat as out of tune and pulling it to E♭ or E. Second, mixing Hijaz with harmonic minor: Hijaz has its wide gap between degrees 2 and 3, harmonic minor between 6 and 7.', he: 'שתי טעויות נפוצות. הראשונה: לשמוע את חצי הבמול כצליל לא מכוון ולמשוך אותו למי במול או למי. השנייה: לבלבל בין חיג׳אז למינור הרמוני — בחיג׳אז הפער הרחב בין דרגות 2 ו־3, במינור הרמוני בין 6 ל־7.' },
        play: [ns(mq(62, [0, 1, 4, 5]), 0.45), rest(0.35), ns([69, 70, 73, 74], 0.45)],
        show: { notes: [69, 70, 73, 74], key: 'C', text: { en: 'Hijaz D E♭ F♯ · minor B♭ C♯ D', he: 'חיג׳אז רה מי♭ פה♯ · מינור סי♭ דו♯ רה' } },
      },
      {
        say: { en: 'The app places every quarter tone exactly halfway. Real musicians are subtler: the half-flat E of Sikah, Bayati and Rast can differ slightly, and Turkish makam uses a different tuning system altogether.', he: 'האפליקציה שמה כל רבע טון בדיוק באמצע. מוזיקאים אמיתיים עדינים יותר: מי חצי במול של סיקה, ביאתי וראסט יכול להיות שונה מעט, והמקאם הטורקי משתמש בשיטת כיוון אחרת לגמרי.' },
        show: { text: { en: 'app: exactly ½ · real: by ear', he: 'באפליקציה: בדיוק ½ · במציאות: לפי האוזן' } },
      },
      {
        say: { en: 'In real music, maqamat shape Arabic, Turkish and many Jewish traditions. The Hijaz sound is the Ahava Rabbah mode of synagogue chant and the freygish of klezmer. The Aleppo Jewish tradition assigns a maqam to each Sabbath.', he: 'במוזיקה אמיתית, מקאמים מעצבים את המוזיקה הערבית, הטורקית ומסורות יהודיות רבות. הצליל של חיג׳אז הוא ״אהבה רבה״ של החזנות וה״פרייגיש״ של הכליזמר. מסורת יהודי חלב מצמידה מקאם לכל שבת.' },
        play: [ns(mq(62, [0, 1, 4, 5, 7, 8, 10, 12]), 0.32)],
        show: { notes: mq(62, [0, 1, 4, 5, 7, 8, 10, 12]), key: 'C', text: { en: 'Hijaz = Ahava Rabbah = freygish', he: 'חיג׳אז = אהבה רבה = פרייגיש' } },
      },
      {
        say: { en: 'To keep: hear the first jins, starting from the 2nd degree. Semitone, neutral step or whole tone points you to the family; the 3rd and 4th degrees name it.', he: 'לזכור: שומעים את הג׳ינס הראשון, החל מדרגה 2. חצי טון, צעד נייטרלי או טון שלם מכוונים למשפחה; דרגות 3 ו־4 נותנות את השם.' },
        show: { text: { en: 'degree 2 → family · 3 and 4 → name', he: 'דרגה 2 ← משפחה · 3 ו־4 ← שם' } },
      },
    ],
  },

  // ------------------------------------------------------------------ theory
  {
    id: 'key-signatures',
    area: 'theory',
    emoji: '🗝️',
    title: { en: 'Key signatures', he: 'סימני היתק' },
    takeaway: { en: 'Sharp keys: the last sharp plus a semitone. Flat keys: the second-to-last flat (one flat = F). The relative minor is a minor third down.', he: 'סולמות דיאזים: הדיאז האחרון ועוד חצי טון. סולמות במולים: הבמול הלפני אחרון (במול אחד = פה). המינור המקביל נמצא טרצה קטנה למטה.' },
    steps: [
      {
        say: { en: 'Hi {name}! The sharps or flats right after the clef are the key signature. They hold for the whole piece. In D major, every F and C is sharp.', he: 'היי {name}! הדיאזים או הבמולים שמיד אחרי המפתח הם סימני ההיתק. הם תקפים לאורך כל היצירה. ברה מז׳ור, כל פה וכל דו הם דיאז.' },
        play: [cad('D'), ns([62, 64, 66, 67, 69, 71, 73, 74], 0.3)],
        show: { notes: [62, 64, 66, 67, 69, 71, 73, 74], key: 'D', text: { en: 'D major: F♯ C♯', he: 'רה מז׳ור: פה♯ דו♯' } },
      },
      {
        say: { en: 'Sharps always arrive in the same order: F C G D A E B. Flats are the mirror image: B E A D G C F.', he: 'הדיאזים תמיד מופיעים באותו סדר: פה דו סול רה לה מי סי. הבמולים הם תמונת ראי: סי מי לה רה סול דו פה.' },
        show: { text: { en: '♯ F C G D A E B · ♭ B E A D G C F', he: '♯ פה דו סול רה לה מי סי · ♭ סי מי לה רה סול דו פה' } },
      },
      {
        say: { en: 'Sharp keys: take the last sharp and go up a semitone. Four sharps end on D♯, so this is E major.', he: 'סולמות עם דיאזים: לוקחים את הדיאז האחרון ועולים חצי טון. ארבעה דיאזים נגמרים ברה דיאז, אז זה מי מז׳ור.' },
        play: [n1(63, 0.7), n1(64, 1.2), cad('E')],
        show: { notes: [63, 64], key: 'E', text: { en: 'D♯ → E major', he: 'רה♯ ← מי מז׳ור' } },
      },
      {
        say: { en: 'Flat keys: the second-to-last flat names the key. B♭, E♭, A♭ — that is E♭ major. One flat is the one to memorize: F major.', he: 'סולמות עם במולים: הבמול הלפני אחרון הוא שם הסולם. סי♭, מי♭, לה♭ — זה מי במול מז׳ור. במול אחד צריך פשוט לזכור: פה מז׳ור.' },
        play: [cad('E', -1)],
        show: { notes: [63, 67, 70], chord: true, key: 'Eb', text: { en: 'B♭ E♭ A♭ → E♭ major', he: 'סי♭ מי♭ לה♭ ← מי במול מז׳ור' } },
      },
      {
        say: { en: 'Every signature also fits a minor key, the relative minor: on the sixth degree, a minor third down. Two sharps: D major or B minor.', he: 'כל סימן היתק מתאים גם לסולם מינורי, המינור המקביל: על דרגה 6, טרצה קטנה למטה. שני דיאזים: רה מז׳ור או סי מינור.' },
        play: [ch([62, 66, 69], 1.2), ch([59, 62, 66], 1.6)],
        show: { notes: [59, 62, 66], chord: true, key: 'D', text: { en: 'D major = B minor', he: 'רה מז׳ור = סי מינור' } },
      },
      {
        say: { en: 'Your turn! You will see a key signature on the staff. Count the sharps or flats and pick the major key — at the top level, sometimes its relative minor. This one is all eyes, no ears.', he: 'תורכם! תראו סימן היתק על החמשה. ספרו את הדיאזים או הבמולים ובחרו את סולם המז׳ור — ובשלב העליון, לפעמים את המינור המקביל. הפעם הכול בעיניים, בלי אוזניים.' },
        play: [cad('A')],
        show: { notes: [69], key: 'A', text: { en: '3♯ = ?', he: '3♯ = ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why signatures exist: every major scale needs the same pattern of steps, tone, tone, semitone, tone, tone, tone, semitone. Starting on G, only F must rise to F♯ to keep that pattern. The signature prints it once instead of on every note.', he: 'למה צריך סימני היתק: כל סולם מז׳ור צריך את אותו דפוס צעדים — טון, טון, חצי, טון, טון, טון, חצי. כשמתחילים מסול, רק הפה צריך לעלות לפה דיאז כדי לשמור על הדפוס. סימן ההיתק כותב את זה פעם אחת, במקום ליד כל תו.' },
        play: [ns([55, 57, 59, 60, 62, 64, 66, 67], 0.32)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66, 67], key: 'G', text: { en: 'G major: F♯', he: 'סול מז׳ור: פה♯' } },
      },
      {
        say: { en: 'Each new sharp is a fifth above the last: F♯, C♯, G♯, D♯, A♯, E♯, B♯. Each new flat is a fifth below: B♭, E♭, A♭, D♭, G♭, C♭, F♭. So the order is the circle of fifths in disguise.', he: 'כל דיאז חדש נמצא קווינטה מעל הקודם: פה♯, דו♯, סול♯, רה♯, לה♯, מי♯, סי♯. כל במול חדש נמצא קווינטה מתחת: סי♭, מי♭, לה♭, רה♭, סול♭, דו♭, פה♭. כלומר, הסדר הוא מעגל הקווינטות בתחפושת.' },
        play: [ns([54, 61, 68, 75], 0.5), rest(0.3), ns([70, 63, 56, 49], 0.5)],
        show: { text: { en: 'F♯ C♯ G♯ D♯ … · B♭ E♭ A♭ D♭ …', he: 'פה♯ דו♯ סול♯ רה♯ … · סי♭ מי♭ לה♭ רה♭ …' } },
      },
      {
        say: { en: 'Signatures go up to seven: C♯ major has seven sharps, C♭ major seven flats. Three pairs sound the same: B and C♭, F♯ and G♭, C♯ and D♭. Musicians usually pick the one with fewer accidentals.', he: 'סימני היתק מגיעים עד שבעה: לדו דיאז מז׳ור שבעה דיאזים, לדו במול מז׳ור שבעה במולים. שלושה זוגות נשמעים אותו דבר: סי ודו♭, פה♯ וסול♭, דו♯ ורה♭. בדרך כלל בוחרים את זה עם פחות סימנים.' },
        show: { text: { en: 'B = C♭ · F♯ = G♭ · C♯ = D♭', he: 'סי = דו♭ · פה♯ = סול♭ · דו♯ = רה♭' } },
      },
      {
        say: { en: 'Minor keys borrow the signature of their relative major. The raised 7th of harmonic minor is never in the signature: it is written as an accidental each time. A minor has no signature, but its G♯ appears in the music.', he: 'סולמות מינוריים לוקחים את סימני ההיתק של המז׳ור המקביל. דרגה 7 המוגבהת של המינור ההרמוני לעולם לא נמצאת בסימני ההיתק: כותבים אותה כסימן מקרי בכל פעם. ללה מינור אין סימני היתק, אבל הסול דיאז שלו מופיע בתווים.' },
        play: [ns([57, 59, 60, 62, 64, 65, 68, 69], 0.32)],
        show: { notes: [57, 59, 60, 62, 64, 65, 68, 69], key: 'C', text: { en: 'A harmonic minor: G♯ as accidental', he: 'לה מינור הרמוני: סול♯ כסימן מקרי' } },
      },
      {
        say: { en: 'So how do you tell a major key from its relative minor? Look at the first and last bass notes and chords, and hunt for that raised 7th. No signature plus G♯ everywhere points to A minor.', he: 'אז איך מבחינים בין סולם מז׳ור למינור המקביל שלו? מסתכלים על צלילי הבס והאקורדים בהתחלה ובסוף, ומחפשים את דרגה 7 המוגבהת. בלי סימני היתק ועם סול דיאז בכל מקום — זה לה מינור.' },
        play: [ch([52, 56, 59, 62], 1), ch([45, 57, 60, 64], 1.5)],
        show: { notes: [52, 56, 59, 62], chord: true, key: 'C', text: { en: 'E7 → Am: G♯ gives it away', he: 'E7 → Am: הסול♯ מסגיר' } },
      },
      {
        say: { en: 'Accidentals in the music last until the bar line, on that line or space only. A natural sign cancels the signature for the rest of the bar.', he: 'סימנים מקריים בתוך התווים תקפים עד קו התיבה, ורק על אותו קו או רווח. סימן בקר מבטל את סימן ההיתק עד סוף התיבה.' },
        show: { text: { en: 'accidental → until the bar line', he: 'סימן מקרי ← עד קו התיבה' } },
      },
      {
        say: { en: 'Common mistakes: forgetting that one flat is F major, where the second-to-last rule cannot work. And naming sharp keys with flats: six sharps end on E♯, so the key is F♯ major, not G♭.', he: 'טעויות נפוצות: לשכוח שבמול אחד הוא פה מז׳ור, כי שם כלל הבמול הלפני אחרון לא עובד. ולתת לסולמות דיאזים שמות עם במולים: שישה דיאזים נגמרים במי דיאז, אז הסולם הוא פה דיאז מז׳ור, לא סול במול.' },
        show: { text: { en: '1♭ = F · 6♯ = F♯ major', he: '1♭ = פה · 6♯ = פה♯ מז׳ור' } },
      },
      {
        say: { en: 'In real music, string players feel at home in sharp keys, near their open strings G, D, A and E. Wind bands and brass live in flat keys like B♭ and E♭. To keep: count, apply the rule, and check for a raised 7th.', he: 'במוזיקה אמיתית, נגני כלי קשת מרגישים בבית בסולמות דיאזים, קרוב למיתרים הפתוחים סול, רה, לה ומי. תזמורות כלי נשיפה חיות בסולמות במולים כמו סי♭ ומי♭. לזכור: סופרים, מפעילים את הכלל, ובודקים אם יש דרגה 7 מוגבהת.' },
        play: [cad('B', -1)],
        show: { notes: [58, 62, 65], chord: true, key: 'Bb', text: { en: 'B♭ major: 2♭', he: 'סי♭ מז׳ור: 2♭' } },
      },
    ],
  },
  {
    id: 'interval-spelling',
    area: 'theory',
    emoji: '📏',
    title: { en: 'Spelling intervals', he: 'כתיבת מרווחים' },
    takeaway: { en: 'Count letters first for the number, then semitones for the quality: a major 3rd above E is G♯, never A♭.', he: 'קודם סופרים אותיות בשביל המספר, ואז חצאי טונים בשביל האיכות: טרצה גדולה מעל מי היא סול דיאז, אף פעם לא לה במול.' },
    steps: [
      {
        say: { en: 'Hi {name}! Spelling an interval takes two steps. Step one: count letters, with the bottom note as 1. C, D, E — a third.', he: 'היי {name}! כתיבת מרווח היא שני שלבים. שלב ראשון: סופרים אותיות, והצליל התחתון הוא 1. דו, רה, מי — טרצה.' },
        play: [ns([60, 62, 64], 0.5), ch([60, 64], 1.2)],
        show: { notes: [60, 64], key: 'C', text: { en: 'C D E = 3rd', he: 'דו רה מי = טרצה' } },
      },
      {
        say: { en: 'Step two: count semitones for the quality. C to E is four semitones, so it is a major third.', he: 'שלב שני: סופרים חצאי טונים בשביל האיכות. מדו למי יש ארבעה חצאי טונים, אז זו טרצה גדולה.' },
        play: [ns([60, 61, 62, 63, 64], 0.35), ch([60, 64], 1.2)],
        show: { notes: [60, 64], chord: true, key: 'C', text: { en: '4 semitones = major 3rd', he: '4 חצאי טונים = טרצה גדולה' } },
      },
      {
        say: { en: 'Now a trap. A major third above E? The letters say some kind of G. E to G is only three semitones, so raise it: G♯.', he: 'ועכשיו מלכודת. טרצה גדולה מעל מי? האותיות אומרות: סול כלשהו. ממי לסול יש רק שלושה חצאי טונים, אז מגביהים: סול דיאז.' },
        play: [ch([64, 68], 1.4)],
        show: { notes: [64, 68], chord: true, key: 'C', text: { en: 'E → G♯', he: 'מי ← סול♯' } },
      },
      {
        say: { en: 'A♭ sounds identical, but A is four letters up, so E to A♭ is a diminished fourth. Letter first, accidental second. Always.', he: 'לה במול נשמע אותו דבר, אבל לה נמצא ארבע אותיות למעלה, אז מי–לה במול זו קוורטה מוקטנת. קודם האות, אחר כך הסימן. תמיד.' },
        show: { text: { en: 'G♯ ✓   A♭ ✗', he: 'סול♯ ✓   לה♭ ✗' } },
      },
      {
        say: { en: 'Handy numbers: minor third 3, major third 4, perfect fourth 5, perfect fifth 7. A fifth above B: B C D E F, six semitones — so F♯.', he: 'מספרים שימושיים: טרצה קטנה 3, גדולה 4, קוורטה זכה 5, קווינטה זכה 7. קווינטה מעל סי: סי דו רה מי פה, שישה חצאי טונים — אז פה דיאז.' },
        play: [ch([59, 66], 1.4)],
        show: { notes: [59, 66], chord: true, key: 'C', text: { en: 'm3 3 · M3 4 · P4 5 · P5 7', he: 'טרצה קטנה 3 · טרצה גדולה 4 · קוורטה 5 · קווינטה 7' } },
      },
      {
        say: { en: 'Augmented is a semitone wider than major or perfect; diminished, a semitone narrower than minor or perfect. C to F♯ and C to G♭ sound the same — an augmented fourth and a diminished fifth.', he: 'מוגדל רחב בחצי טון מגדול או מזך; מוקטן צר בחצי טון מקטן או מזך. דו–פה דיאז ודו–סול במול נשמעים אותו דבר — קוורטה מוגדלת וקווינטה מוקטנת.' },
        play: [ch([60, 66], 1.4)],
        show: { notes: [60, 66], chord: true, key: 'C', text: { en: 'C–F♯ A4 · C–G♭ d5', he: 'דו–פה♯ קוורטה מוגדלת · דו–סול♭ קווינטה מוקטנת' } },
      },
      {
        say: { en: 'Your turn! I name an interval and a starting note. Count the letters, then the semitones, and pick the right spelling. Beware the twin with the wrong letter!', he: 'תורכם! אני אומר מרווח וצליל התחלה. ספרו אותיות, אחר כך חצאי טונים, ובחרו את הכתיב הנכון. היזהרו מהתאום עם האות הלא נכונה!' },
        play: [ns([62, 66], 0.6)],
        show: { text: { en: 'major 3rd ↑ D = ?', he: 'טרצה גדולה ↑ רה = ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Intervals come in two families. Unisons, 4ths, 5ths and octaves are perfect. 2nds, 3rds, 6ths and 7ths are major or minor. There is no major fifth and no perfect third.', he: 'מרווחים מתחלקים לשתי משפחות. אוניסון, קוורטה, קווינטה ואוקטבה הם זכים. סקונדה, טרצה, סקסטה וספטימה הן גדולות או קטנות. אין קווינטה גדולה ואין טרצה זכה.' },
        play: [ch([60, 67], 1.1), ch([60, 64], 1.1), ch([60, 63], 1.3)],
        show: { notes: [60, 67], chord: true, key: 'C', text: { en: 'P5 · M3 · m3', he: 'קווינטה זכה · טרצה גדולה · טרצה קטנה' } },
      },
      {
        say: { en: 'The full table in semitones: minor 2nd 1, major 2nd 2, minor 3rd 3, major 3rd 4, perfect 4th 5, tritone 6, perfect 5th 7, minor 6th 8, major 6th 9, minor 7th 10, major 7th 11, octave 12.', he: 'הטבלה המלאה בחצאי טונים: סקונדה קטנה 1, גדולה 2, טרצה קטנה 3, גדולה 4, קוורטה זכה 5, טריטון 6, קווינטה זכה 7, סקסטה קטנה 8, גדולה 9, ספטימה קטנה 10, גדולה 11, אוקטבה 12.' },
        show: { text: { en: 'm2 1 · M2 2 · m3 3 · M3 4 · P4 5 · TT 6 · P5 7 · m6 8 · M6 9 · m7 10 · M7 11 · P8 12', he: '1 2 3 4 5 6 7 8 9 10 11 12' } },
      },
      {
        say: { en: 'A shortcut: the major scale of the bottom note gives you every major and perfect interval above it. E major is E F♯ G♯ A B C♯ D♯, so a major 3rd above E is G♯ and a major 7th is D♯. Then adjust.', he: 'קיצור דרך: סולם המז׳ור של הצליל התחתון נותן את כל המרווחים הגדולים והזכים מעליו. מי מז׳ור הוא מי פה♯ סול♯ לה סי דו♯ רה♯, אז טרצה גדולה מעל מי היא סול דיאז וספטימה גדולה היא רה דיאז. ואז מתקנים.' },
        play: [ns([64, 66, 68, 69, 71, 73, 75, 76], 0.32)],
        show: { notes: [64, 66, 68, 69, 71, 73, 75, 76], key: 'E', text: { en: 'E major = the ruler above E', he: 'מי מז׳ור = הסרגל מעל מי' } },
      },
      {
        say: { en: 'Flip an interval and the numbers add up to 9. Major becomes minor, augmented becomes diminished, perfect stays perfect. C up to A is a major 6th, so A up to C is a minor 3rd.', he: 'הופכים מרווח והמספרים מסתכמים ב־9. גדול הופך לקטן, מוגדל למוקטן, וזך נשאר זך. מדו עד לה למעלה זו סקסטה גדולה, אז מלה עד דו למעלה זו טרצה קטנה.' },
        play: [ch([60, 69], 1.2), ch([57, 60], 1.3)],
        show: { notes: [57, 60], chord: true, key: 'C', text: { en: 'M6 ↔ m3 · 6 + 3 = 9', he: 'סקסטה גדולה ↔ טרצה קטנה · 6 + 3 = 9' } },
      },
      {
        say: { en: 'Twins sound alike but behave differently. In C major, the augmented 4th F–B opens out to E–C, while the diminished 5th B–F closes in to C–E. The spelling tells you where it goes.', he: 'תאומים נשמעים דומה אבל מתנהגים אחרת. בדו מז׳ור, הקוורטה המוגדלת פה–סי נפתחת החוצה למי–דו, והקווינטה המוקטנת סי–פה נסגרת פנימה לדו–מי. הכתיב אומר לאן הוא הולך.' },
        play: [ch([65, 71], 1), ch([64, 72], 1.2), rest(0.3), ch([59, 65], 1), ch([60, 64], 1.2)],
        show: { notes: [65, 71], chord: true, key: 'C', text: { en: 'A4 → 6th · d5 → 3rd', he: 'קוורטה מוגדלת ← סקסטה · קווינטה מוקטנת ← טרצה' } },
      },
      {
        say: { en: 'Intervals beyond the octave are compound: subtract 7 from the number. A 9th is a 2nd plus an octave, a 10th a 3rd plus an octave. C up to D an octave higher is a major 9th.', he: 'מרווחים שגדולים מאוקטבה הם מורכבים: מחסירים 7 מהמספר. 9 היא סקונדה ועוד אוקטבה, 10 היא טרצה ועוד אוקטבה. מדו עד הרה שמעל האוקטבה — 9 גדולה.' },
        play: [ch([60, 74], 1.4)],
        show: { notes: [60, 74], chord: true, key: 'C', text: { en: '9th = 2nd + octave', he: '9 = סקונדה + אוקטבה' } },
      },
      {
        say: { en: 'Two common mistakes: counting the bottom note as 0, which turns a 3rd into a 2nd; and counting semitones first, which gives the sound but not the spelling. Letters first, from 1.', he: 'שתי טעויות נפוצות: לספור את הצליל התחתון כ־0, וכך טרצה הופכת לסקונדה; ולספור קודם חצאי טונים, מה שנותן את הצליל אבל לא את הכתיב. קודם אותיות, מ־1.' },
        show: { text: { en: 'bottom note = 1', he: 'הצליל התחתון = 1' } },
      },
      {
        say: { en: 'Practice downward too: count letters down. A major 3rd below F: F, E, D gives D, but F down to D is three semitones, so lower it to D♭. To keep: letters for the number, semitones for the quality.', he: 'תרגלו גם כלפי מטה: סופרים אותיות למטה. טרצה גדולה מתחת לפה: פה, מי, רה נותן רה, אבל מפה לרה למטה יש שלושה חצאי טונים, אז מנמיכים לרה במול. לזכור: אותיות למספר, חצאי טונים לאיכות.' },
        play: [ns([65, 61], 0.7)],
        show: { notes: [65, 61], key: 'C', text: { en: 'F ↓ M3 = D♭', he: 'פה ↓ טרצה גדולה = רה♭' } },
      },
    ],
  },
  {
    id: 'chord-spelling',
    area: 'theory',
    emoji: '🔤',
    title: { en: 'Spelling chords', he: 'כתיבת אקורדים' },
    takeaway: { en: 'Chords are spelled in every other letter (1 3 5 7 9); the accidentals set the quality. G°7 is G B♭ D♭ F♭ — F♭, not E.', he: 'אקורדים נכתבים באות כן־אות לא (1 3 5 7 9); הסימנים קובעים את האיכות. G°7 הוא סול סי♭ רה♭ פה♭ — פה במול, לא מי.' },
    steps: [
      {
        say: { en: 'Hi {name}! Chords are spelled in skips: every other letter. Root, third, fifth, like C, E, G.', he: 'היי {name}! אקורדים נכתבים בדילוגים: אות כן, אות לא. שורש, טרצה, קווינטה — כמו דו, מי, סול.' },
        play: [arp([60, 64, 67], 1.6), ch([60, 64, 67], 1.2)],
        show: { notes: [60, 64, 67], chord: true, key: 'C', text: { en: 'C · E · G', he: 'דו · מי · סול' } },
      },
      {
        say: { en: 'The letters are fixed; accidentals set the quality. Major is a major third, then a minor third. E major: E, G, B, and the G must rise to G♯.', he: 'האותיות קבועות; הסימנים קובעים את האיכות. מז׳ור הוא טרצה גדולה ואז טרצה קטנה. מי מז׳ור: מי, סול, סי, והסול חייב לעלות לסול דיאז.' },
        play: [ch([64, 68, 71], 1.4)],
        show: { notes: [64, 68, 71], chord: true, key: 'E', text: { en: 'E – G♯ – B', he: 'מי – סול♯ – סי' } },
      },
      {
        say: { en: 'Minor puts the minor third first. Diminished is two minor thirds; augmented, two major thirds.', he: 'במינור הטרצה הקטנה באה ראשונה. מוקטן הוא שתי טרצות קטנות; מוגדל — שתי טרצות גדולות.' },
        play: [ch([60, 63, 67], 1), ch([60, 63, 66], 1), ch([60, 64, 68], 1.3)],
        show: { notes: [60, 63, 66], chord: true, key: 'C', text: { en: 'Cm · C° · C+', he: 'Cm · C° · C+' } },
      },
      {
        say: { en: 'Sevenths add one more letter. G7 is G, B, D, F: a major triad with a minor seventh. Gmaj7 raises it to F♯.', he: 'אקורדי ספטימה מוסיפים עוד אות. G7 הוא סול, סי, רה, פה: משולש מז׳ורי עם ספטימה קטנה. ב־Gmaj7 היא עולה לפה דיאז.' },
        play: [ch([55, 59, 62, 65], 1.2), ch([55, 59, 62, 66], 1.4)],
        show: { notes: [55, 59, 62, 65], chord: true, key: 'C', text: { en: 'G7 G B D F · Gmaj7 F♯', he: 'G7 סול סי רה פה · Gmaj7 פה♯' } },
      },
      {
        say: { en: 'Gm7 is G, B♭, D, F. Half-diminished Gø7 lowers the fifth to D♭. Fully diminished G°7 lowers the seventh too — to F♭, not E, because the seventh must be some F.', he: 'Gm7 הוא סול, סי♭, רה, פה. חצי מוקטן, Gø7, מנמיך את הקווינטה לרה במול. מוקטן מלא, G°7, מנמיך גם את הספטימה — לפה במול, לא מי, כי הספטימה חייבת להיות פה כלשהו.' },
        play: [ch([55, 58, 62, 65], 1), ch([55, 58, 61, 65], 1), ch([55, 58, 61, 64], 1.3)],
        show: { notes: [55, 58, 61, 64], chord: true, key: 'C', text: { en: 'G°7 = G B♭ D♭ F♭', he: 'G°7 = סול סי♭ רה♭ פה♭' } },
      },
      {
        say: { en: 'Ninths keep skipping: the 9 is the letter after the 7, so in G9 it is A. In G7♭9 it is A♭.', he: 'ה־9 ממשיכה לדלג: היא האות שאחרי ה־7, אז ב־G9 זה לה. ב־G7♭9 זה לה במול.' },
        play: [ch([43, 59, 62, 65, 69], 1.2), ch([43, 59, 62, 65, 68], 1.4)],
        show: { notes: [43, 59, 62, 65, 69], chord: true, key: 'C', text: { en: 'G9: G B D F A', he: 'G9: סול סי רה פה לה' } },
      },
      {
        say: { en: 'Your turn! I show a chord symbol and play it. Pick the spelling with every other letter and the right accidentals. Same-sound, wrong-letter answers are traps!', he: 'תורכם! אני מציג סימן אקורד ומנגן אותו. בחרו את הכתיב עם אות כן־אות לא והסימנים הנכונים. תשובות שנשמעות אותו דבר אבל עם אות לא נכונה — הן מלכודות!' },
        play: [ch([50, 54, 57, 60], 1.6)],
        show: { text: { en: 'D7 = ?', he: 'D7 = ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Chord formulas compare each chord to the major scale of its root. Major is 1 3 5, minor 1 ♭3 5, diminished 1 ♭3 ♭5, augmented 1 3 ♯5. Sevenths: maj7 1 3 5 7, dominant 7 1 3 5 ♭7, m7 1 ♭3 5 ♭7.', he: 'נוסחאות אקורדים משוות כל אקורד לסולם המז׳ור של השורש שלו. מז׳ור הוא 1 3 5, מינור 1 ♭3 5, מוקטן 1 ♭3 ♭5, מוגדל 1 3 ♯5. ספטימות: maj7 ‏1 3 5 7, דומיננט 7 ‏1 3 5 ♭7, ‏m7 ‏1 ♭3 5 ♭7.' },
        show: { text: { en: 'maj 1 3 5 · m 1 ♭3 5 · ° 1 ♭3 ♭5 · + 1 3 ♯5', he: 'מז׳ור 1 3 5 · מינור 1 ♭3 5 · מוקטן 1 ♭3 ♭5 · מוגדל 1 3 ♯5' } },
      },
      {
        say: { en: 'A three-step method. Write the letters in skips. Take the notes from the root\'s major scale. Apply the formula. B♭m7: letters B, D, F, A; B♭ major gives B♭, D, F, A; lower the 3 and 7: B♭, D♭, F, A♭.', he: 'שיטה בשלושה שלבים. כותבים את האותיות בדילוגים. לוקחים את הצלילים מסולם המז׳ור של השורש. מפעילים את הנוסחה. B♭m7: אותיות סי, רה, פה, לה; סי♭ מז׳ור נותן סי♭, רה, פה, לה; מנמיכים את 3 ו־7: סי♭, רה♭, פה, לה♭.' },
        play: [ch([46, 49, 53, 56], 1.6)],
        show: { notes: [46, 49, 53, 56], chord: true, key: 'Db', text: { en: 'B♭m7 = B♭ D♭ F A♭', he: 'B♭m7 = סי♭ רה♭ פה לה♭' } },
      },
      {
        say: { en: 'Half-diminished is 1 ♭3 ♭5 ♭7; fully diminished lowers the 7 twice. C°7 is C, E♭, G♭, B♭♭. That double flat sounds like A, but the seventh must be some B.', he: 'חצי מוקטן הוא 1 ♭3 ♭5 ♭7; מוקטן מלא מנמיך את ה־7 פעמיים. C°7 הוא דו, מי♭, סול♭, סי דאבל במול. הדאבל במול נשמע כמו לה, אבל הספטימה חייבת להיות סי כלשהו.' },
        play: [ch([60, 63, 66, 70], 1.2), ch([60, 63, 66, 69], 1.5)],
        show: { notes: [60, 63, 66, 69], chord: true, key: 'C', text: { en: 'Cø7 · C°7 = C E♭ G♭ B♭♭', he: 'Cø7 · C°7 = דו מי♭ סול♭ סי♭♭' } },
      },
      {
        say: { en: 'To recognize the four triads by ear: major is bright, minor dark, diminished tight and tense, augmented hanging and unresolved. Here they are on D.', he: 'כדי לזהות את ארבעת המשולשים באוזן: מז׳ור מואר, מינור כהה, מוקטן צפוף ומתוח, מוגדל תלוי ולא פתור. הנה הם על רה.' },
        play: [ch([62, 66, 69], 0.9), ch([62, 65, 69], 0.9), ch([62, 65, 68], 0.9), ch([62, 66, 70], 1.2)],
        show: { text: { en: 'D · Dm · D° · D+', he: 'D · Dm · D° · D+' } },
      },
      {
        say: { en: 'Sus and add chords keep the skip idea but change one member. Csus4 is C, F, G: the 4 replaces the 3. Cadd9 is C, E, G, D. C6 is C, E, G, A.', he: 'אקורדי sus ו־add שומרים על רעיון הדילוג אבל משנים צליל אחד. Csus4 הוא דו, פה, סול: ה־4 מחליף את ה־3. ‏Cadd9 הוא דו, מי, סול, רה. ‏C6 הוא דו, מי, סול, לה.' },
        play: [ch([60, 65, 67], 1), ch([60, 64, 67, 74], 1), ch([60, 64, 67, 69], 1.3)],
        show: { text: { en: 'Csus4 · Cadd9 · C6', he: 'Csus4 · Cadd9 · C6' } },
      },
      {
        say: { en: 'The common mistake is spelling from the keyboard. Cm is C, E♭, G, never C, D♯, G: the third must be some E. Also, an inversion never changes the spelling. C/E is still C, E, G, with E in the bass.', he: 'הטעות הנפוצה היא לכתוב לפי המקלדת. Cm הוא דו, מי♭, סול, אף פעם לא דו, רה♯, סול: הטרצה חייבת להיות מי כלשהו. וגם, היפוך לא משנה את הכתיב. C/E הוא עדיין דו, מי, סול, עם מי בבס.' },
        show: { text: { en: 'Cm = C E♭ G ✓ · C D♯ G ✗', he: 'Cm = דו מי♭ סול ✓ · דו רה♯ סול ✗' } },
      },
      {
        say: { en: 'Why it matters: one diminished seventh sound has four spellings, C°7, E♭°7, G♭°7 and A°7. The spelling shows which note is the root and where the chord wants to go. To keep: letters in skips, then the formula.', he: 'למה זה חשוב: לצליל אחד של אקורד מוקטן מלא יש ארבעה כתיבים: C°7, ‏E♭°7, ‏G♭°7 ו־A°7. הכתיב מראה מה השורש ולאן האקורד רוצה ללכת. לזכור: אותיות בדילוגים, ואז הנוסחה.' },
        show: { text: { en: 'one sound · four names', he: 'צליל אחד · ארבעה שמות' } },
      },
    ],
  },
  {
    id: 'roman-numerals',
    area: 'theory',
    emoji: '🏛️',
    title: { en: 'Roman numerals', he: 'ספרות רומיות' },
    takeaway: { en: 'The numeral is the scale step of the root; the case is the quality: in major I ii iii IV V vi vii°, in harmonic minor i ii° III+ iv V VI vii°.', he: 'הספרה היא הדרגה של השורש; הגודל הוא האיכות: במז׳ור I ii iii IV V vi vii°, במינור הרמוני i ii° III+ iv V VI vii°.' },
    steps: [
      {
        say: { en: 'Hi {name}! A Roman numeral names a chord by the scale step its root sits on. In C major, a chord on D is chord two.', he: 'היי {name}! ספרה רומית נותנת לאקורד שם לפי הדרגה שעליה יושב השורש שלו. בדו מז׳ור, אקורד על רה הוא אקורד שתיים.' },
        play: [cad('C'), ch([62, 65, 69], 1.5)],
        show: { notes: [62, 65, 69], chord: true, key: 'C', text: { en: 'D F A = ii', he: 'רה פה לה = ii' } },
      },
      {
        say: { en: 'The case shows the quality: uppercase major, lowercase minor, a small circle for diminished. In major: I, ii, iii, IV, V, vi, vii°.', he: 'גודל האות מראה את האיכות: גדולה למז׳ור, קטנה למינור, עיגול קטן למוקטן. במז׳ור: I, ii, iii, IV, V, vi, vii°.' },
        play: [ch([60, 64, 67], 0.6), ch([62, 65, 69], 0.6), ch([64, 67, 71], 0.6), ch([65, 69, 72], 0.6), ch([67, 71, 74], 0.6), ch([69, 72, 76], 0.6), ch([71, 74, 77], 0.6), ch([72, 76, 79], 1.2)],
        show: { key: 'C', text: { en: 'I ii iii IV V vi vii°', he: 'I ii iii IV V vi vii°' } },
      },
      {
        say: { en: 'I, IV and V are the major pillars. ii, iii and vi are minor, and vii° is the tense diminished one, B, D, F.', he: 'I, IV ו־V הם עמודי המז׳ור. ii, iii ו־vi מינוריים, ו־vii° הוא המוקטן המתוח — סי, רה, פה.' },
        play: [ch([71, 74, 77], 1.2), ch([72, 76, 79], 1.4)],
        show: { notes: [71, 74, 77], chord: true, key: 'C', text: { en: 'vii° → I', he: 'vii° → I' } },
      },
      {
        say: { en: 'Minor keys use harmonic minor, with a raised seventh. In A minor: i, ii°, III+, iv, V, VI, vii°. That G♯ makes V major.', he: 'בסולמות מינוריים משתמשים במינור ההרמוני, עם דרגה 7 מוגבהת. בלה מינור: i, ii°, III+, iv, V, VI, vii°. הסול דיאז הופך את V למז׳ורי.' },
        play: [ch([57, 60, 64], 1), ch([52, 56, 59], 1), ch([57, 60, 64], 1.4)],
        show: { notes: [52, 56, 59], chord: true, key: 'C', text: { en: 'A minor: V = E G♯ B', he: 'לה מינור: V = מי סול♯ סי' } },
      },
      {
        say: { en: 'And III+ is augmented: C, E, G♯. Strange and shiny.', he: 'ו־III+ הוא מוגדל: דו, מי, סול דיאז. מוזר ומבריק.' },
        play: [ch([60, 64, 68], 1.6)],
        show: { notes: [60, 64, 68], chord: true, key: 'C', text: { en: 'III+ = C E G♯', he: 'III+ = דו מי סול♯' } },
      },
      {
        say: { en: 'A secondary dominant borrows a V for another chord. V/V in C is D7, the dominant of G: a sudden push toward V.', he: 'דומיננטה משנית שואלת V בשביל אקורד אחר. V/V בדו מז׳ור הוא D7, הדומיננטה של סול: דחיפה פתאומית לכיוון V.' },
        play: [cad('C'), ch([54, 57, 60, 62], 1.1), ch([55, 59, 62], 1.4)],
        show: { notes: [54, 57, 60, 62], chord: true, key: 'C', text: { en: 'V/V = D7 → G', he: 'V/V = D7 → G' } },
      },
      {
        say: { en: 'Your turn! I name the key, often play a cadence, then one chord. Find its step and its quality, then pick the numeral.', he: 'תורכם! אני אומר את הסולם, לרוב מנגן קדנצה, ואז אקורד אחד. מצאו את הדרגה ואת האיכות, ובחרו את הספרה.' },
        play: [cad('G'), ch([57, 60, 64], 1.5)],
        show: { notes: [57, 60, 64], chord: true, key: 'G', text: { en: 'G major: ?', he: 'סול מז׳ור: ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Numerals describe function, not pitch, so a progression keeps its name in every key. ii–V–I is Dm, G7, C in C major, and Gm, C7, F in F major.', he: 'הספרות מתארות תפקיד, לא גובה, ולכן למהלך יש אותו שם בכל סולם. ii–V–I הוא Dm, ‏G7, ‏C בדו מז׳ור, ו־Gm, ‏C7, ‏F בפה מז׳ור.' },
        play: [phrase(['ii', 'V7', 'I'])],
        show: { text: { en: 'C: Dm G7 C · F: Gm C7 F', he: 'דו: Dm G7 C · פה: Gm C7 F' } },
      },
      {
        say: { en: 'Add a seventh to each degree of a major key and you get Imaj7, ii7, iii7, IVmaj7, V7, vi7 and viiø7. Only V has the dominant seventh: that is what makes it pull so hard.', he: 'מוסיפים ספטימה לכל דרגה בסולם מז׳ור ומקבלים Imaj7, ‏ii7, ‏iii7, ‏IVmaj7, ‏V7, ‏vi7 ו־viiø7. רק ל־V יש ספטימה דומיננטית: זה מה שגורם לו למשוך כל כך חזק.' },
        play: [ch([60, 64, 67, 71], 0.55), ch([62, 65, 69, 72], 0.55), ch([64, 67, 71, 74], 0.55), ch([65, 69, 72, 76], 0.55), ch([67, 71, 74, 77], 0.55), ch([69, 72, 76, 79], 0.55), ch([71, 74, 77, 81], 0.9)],
        show: { text: { en: 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7', he: 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7' } },
      },
      {
        say: { en: 'Small numbers after the numeral show the inversion. V7 has the root in the bass; V6/5 the 3; V4/3 the 5; V4/2 the 7. Here is G7 in C, with B, then D, then F in the bass.', he: 'מספרים קטנים אחרי הספרה מראים את ההיפוך. ב־V7 השורש בבס; ב־V6/5 ה־3; ב־V4/3 ה־5; ב־V4/2 ה־7. הנה G7 בדו מז׳ור, עם סי, אחר כך רה, אחר כך פה בבס.' },
        play: [ch([43, 59, 62, 65], 0.9), ch([47, 55, 62, 65], 0.9), ch([50, 55, 59, 65], 0.9), ch([53, 55, 59, 62], 1.2)],
        show: { notes: [47, 55, 62, 65], chord: true, key: 'C', text: { en: 'V7 · V6/5 · V4/3 · V4/2', he: 'V7 · V6/5 · V4/3 · V4/2' } },
      },
      {
        say: { en: 'Real minor-key music mixes forms. Natural minor gives a minor v and a major VII; harmonic minor gives the major V. In A minor, both G to Am and E to Am are common.', he: 'מוזיקה במינור אמיתית מערבבת צורות. מינור טבעי נותן v מינורי ו־VII מז׳ורי; מינור הרמוני נותן V מז׳ורי. בלה מינור, גם G אל Am וגם E אל Am נפוצים.' },
        play: [ch([43, 59, 62, 67], 0.9), ch([45, 57, 60, 64], 1.1), rest(0.3), ch([40, 56, 59, 64], 0.9), ch([45, 57, 60, 64], 1.3)],
        show: { text: { en: 'VII → i · V → i', he: 'VII → i · V → i' } },
      },
      {
        say: { en: 'A listening strategy: first sing the tonic, then sing the lowest note of the chord and name its degree. Then hear the quality: major, minor or diminished. Check the bass is really the root before you write the numeral.', he: 'אסטרטגיית האזנה: קודם שירו את הטוניקה, ואז שירו את הצליל הנמוך של האקורד ותנו שם לדרגה. אחר כך שמעו את האיכות: מז׳ור, מינור או מוקטן. בדקו שהבס הוא באמת השורש לפני שאתם כותבים את הספרה.' },
        play: [cad('C'), ch([45, 57, 60, 64], 1.4)],
        show: { notes: [45, 57, 60, 64], chord: true, key: 'C', text: { en: 'A = 6 · minor → vi', he: 'לה = 6 · מינור ← vi' } },
      },
      {
        say: { en: 'Secondary dominants: V/ii is A7, V/iii B7, V/IV C7, V/V D7 and V/vi E7. The clue is a note foreign to the key, like C♯ in A7, that rises a semitone into the next root.', he: 'דומיננטות משניות: V/ii הוא A7, ‏V/iii ‏B7, ‏V/IV ‏C7, ‏V/V ‏D7 ו־V/vi ‏E7. הסימן הוא צליל זר לסולם, כמו דו דיאז ב־A7, שעולה בחצי טון לשורש הבא.' },
        play: [ch([45, 61, 64, 67], 1), ch([50, 62, 65, 69], 1.4)],
        show: { notes: [45, 61, 64, 67], chord: true, key: 'C', text: { en: 'A7 (V/ii) → Dm', he: 'A7 (V/ii) → Dm' } },
      },
      {
        say: { en: 'The common mistake is naming by the bass note. C/E, with E in the bass, is still I in first inversion, I6, not iii. Em is E, G, B; C/E is E, G, C.', he: 'הטעות הנפוצה היא לתת שם לפי צליל הבס. C/E, עם מי בבס, הוא עדיין I בהיפוך ראשון, I6, ולא iii. ‏Em הוא מי, סול, סי; C/E הוא מי, סול, דו.' },
        play: [ch([52, 55, 60], 1.2), ch([52, 55, 59], 1.3)],
        show: { notes: [52, 55, 60], chord: true, key: 'C', text: { en: 'C/E = I6 · Em = iii', he: 'C/E = I6 · Em = iii' } },
      },
      {
        say: { en: 'Pop and jazz charts often write every numeral in capitals with a quality symbol, like IIm7–V7–Imaj7. To keep: the numeral is the root\'s degree, the case or symbol is the quality, the small numbers show the bass.', he: 'בפופ ובג׳אז כותבים לעיתים קרובות את כל הספרות באותיות גדולות עם סימן איכות, כמו IIm7–V7–Imaj7. לזכור: הספרה היא הדרגה של השורש, הגודל או הסימן הוא האיכות, והמספרים הקטנים מראים את הבס.' },
        show: { text: { en: 'ii7 = IIm7', he: 'ii7 = IIm7' } },
      },
    ],
  },
  {
    id: 'circle-fifths',
    area: 'theory',
    emoji: '🧭',
    title: { en: 'The circle of fifths', he: 'מעגל הקווינטות' },
    takeaway: { en: 'Clockwise by fifths adds a sharp (G D A E B F♯), counterclockwise adds a flat (F B♭ E♭ A♭ D♭ G♭); the relative minor is a minor third down.', he: 'עם כיוון השעון בקווינטות מוסיפים דיאז (סול רה לה מי סי פה♯), נגד כיוון השעון מוסיפים במול (פה סי♭ מי♭ לה♭ רה♭ סול♭); המינור המקביל טרצה קטנה למטה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Go up a perfect fifth from C and you reach G. Keep going: D, A, E, B, F♯. Each step adds one sharp.', he: 'היי {name}! עולים קווינטה זכה מדו ומגיעים לסול. ממשיכים: רה, לה, מי, סי, פה דיאז. כל צעד מוסיף דיאז אחד.' },
        play: [ns([48, 55, 62, 57, 64, 59, 66], 0.5)],
        show: { notes: [48, 55, 62, 57, 64, 59, 66], text: { en: 'C G D A E B F♯', he: 'דו סול רה לה מי סי פה♯' } },
      },
      {
        say: { en: 'So G has 1 sharp, D 2, A 3, E 4, B 5, and F♯ 6. Here is A major, with three.', he: 'כלומר: לסול דיאז אחד, לרה 2, ללה 3, למי 4, לסי 5 ולפה דיאז 6. הנה לה מז׳ור, עם שלושה.' },
        play: [cad('A')],
        show: { notes: [57, 61, 64], chord: true, key: 'A', text: { en: 'A = 3♯', he: 'לה = 3♯' } },
      },
      {
        say: { en: 'Go the other way, down by fifths, and you add flats: F, B♭, E♭, A♭, D♭, G♭ — one to six flats.', he: 'הולכים לכיוון השני, קווינטות למטה, ומוסיפים במולים: פה, סי♭, מי♭, לה♭, רה♭, סול♭ — מבמול אחד עד שישה.' },
        play: [ns([65, 58, 63, 56, 61, 54], 0.5)],
        show: { notes: [65, 58, 63, 56, 61, 54], text: { en: 'F B♭ E♭ A♭ D♭ G♭', he: 'פה סי♭ מי♭ לה♭ רה♭ סול♭' } },
      },
      {
        say: { en: 'Put them on a clock: C at the top, sharps clockwise, flats counterclockwise. At the bottom F♯ and G♭ meet: same sound, two names.', he: 'שמים אותם על שעון: דו למעלה, הדיאזים עם כיוון השעון, הבמולים נגדו. למטה נפגשים פה דיאז וסול במול: אותו צליל, שני שמות.' },
        show: { text: { en: '♭ ← C → ♯', he: 'דו למעלה · ♯ עם השעון · ♭ נגדו' } },
      },
      {
        say: { en: 'Neighbors on the circle are a fifth apart and differ by just one sharp or flat. Clockwise from D is A; counterclockwise is G.', he: 'שכנים במעגל רחוקים קווינטה זה מזה ונבדלים בדיאז או במול אחד בלבד. עם כיוון השעון מרה — לה; נגד כיוון השעון — סול.' },
        play: [ch([55, 59, 62], 1), ch([50, 54, 57], 1), ch([57, 61, 64], 1.3)],
        show: { text: { en: 'G ← D → A', he: 'השכנים של רה: סול, לה' } },
      },
      {
        say: { en: 'Each major key shares its signature with a relative minor, a minor third down. C major and A minor; G major and E minor.', he: 'כל סולם מז׳ור חולק את סימני ההיתק עם מינור מקביל, טרצה קטנה למטה. דו מז׳ור ולה מינור; סול מז׳ור ומי מינור.' },
        play: [ch([60, 64, 67], 1.1), ch([57, 60, 64], 1.4)],
        show: { notes: [57, 60, 64], chord: true, key: 'C', text: { en: 'C major ↔ A minor', he: 'דו מז׳ור ↔ לה מינור' } },
      },
      {
        say: { en: 'Your turn! I name a major key. Depending on the level, tell me how many sharps or flats it has, its relative minor, or its neighbor one step around the circle.', he: 'תורכם! אני אומר סולם מז׳ור. לפי השלב, אמרו לי כמה דיאזים או במולים יש בו, מה המינור המקביל שלו, או מי השכן שלו צעד אחד במעגל.' },
        play: [cad('E', -1)],
        show: { text: { en: 'E♭ major: ?', he: 'מי במול מז׳ור: ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why fifths? G major shares six of its seven notes with C major; only F becomes F♯. Each step clockwise raises the old 4th degree into a new leading tone. Each step counterclockwise lowers the old 7th.', he: 'למה קווינטות? לסול מז׳ור יש שישה מתוך שבעה צלילים משותפים עם דו מז׳ור; רק פה הופך לפה דיאז. כל צעד עם כיוון השעון מגביה את דרגה 4 הישנה לצליל מוביל חדש. כל צעד נגד כיוון השעון מנמיך את דרגה 7 הישנה.' },
        play: [ns([60, 62, 64, 65, 67, 69, 71, 72], 0.26), rest(0.3), ns([55, 57, 59, 60, 62, 64, 66, 67], 0.26)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66, 67], key: 'G', text: { en: 'C → G: F becomes F♯', he: 'דו ← סול: פה הופך לפה♯' } },
      },
      {
        say: { en: 'Down a fifth is the same as up a fourth. So counterclockwise you can also count fourths: C, F, B♭, E♭. Jazz musicians call this the cycle of fourths and practice everything around it.', he: 'קווינטה למטה זהה לקוורטה למעלה. לכן נגד כיוון השעון אפשר גם לספור קוורטות: דו, פה, סי♭, מי♭. מוזיקאי ג׳אז קוראים לזה מעגל הקוורטות ומתרגלים הכול סביבו.' },
        play: [ns([60, 65, 70, 75], 0.5)],
        show: { notes: [60, 65, 70, 75], key: 'C', text: { en: 'C F B♭ E♭ = up in fourths', he: 'דו פה סי♭ מי♭ = קוורטות למעלה' } },
      },
      {
        say: { en: 'Twelve positions, fifteen major key names: at the bottom, B and C♭, F♯ and G♭, C♯ and D♭ overlap. An inner ring holds the relative minors: A minor under C, E minor under G, D minor under F.', he: 'שתים־עשרה עמדות, חמישה־עשר שמות של סולמות מז׳ור: למטה חופפים סי ודו♭, פה♯ וסול♭, דו♯ ורה♭. בטבעת הפנימית יושבים המינורים המקבילים: לה מינור מתחת לדו, מי מינור מתחת לסול, רה מינור מתחת לפה.' },
        show: { text: { en: 'C/Am · G/Em · F/Dm …', he: 'C/Am · G/Em · F/Dm …' } },
      },
      {
        say: { en: 'Chord roots love to fall around the circle. iii, vi, ii, V, I falls by fifths all the way home: E, A, D, G, C.', he: 'שורשי אקורדים אוהבים לרדת סביב המעגל. iii, ‏vi, ‏ii, ‏V, ‏I יורד בקווינטות עד הבית: מי, לה, רה, סול, דו.' },
        play: [phrase(['iii', 'vi', 'ii', 'V7', 'I'])],
        show: { text: { en: 'iii – vi – ii – V7 – I', he: 'iii – vi – ii – V7 – I' } },
      },
      {
        say: { en: 'Distance on the circle is distance in sound. A move to a neighboring key is smooth. A jump across the circle, a tritone away, is a jolt. Hear C go to G through D7, then C jump to F♯.', he: 'מרחק במעגל הוא מרחק בצליל. מעבר לסולם שכן הוא חלק. קפיצה לצד השני של המעגל, טריטון משם, היא טלטלה. שמעו את דו עובר לסול דרך D7, ואז את דו קופץ לפה דיאז.' },
        play: [ch([48, 55, 64, 72], 0.9), ch([50, 57, 60, 66], 0.9), ch([43, 59, 62, 67], 1.2), rest(0.4), ch([48, 55, 64, 72], 0.9), ch([54, 58, 61, 66], 1.3)],
        show: { text: { en: 'C → D7 → G · C → F♯', he: 'C → D7 → G · C → F♯' } },
      },
      {
        say: { en: 'Common mistakes: turning the wrong way, so remember sharps go up by fifths, clockwise. And a wrong fifth: above B it is F♯, not F. B to F is only six semitones, a diminished fifth.', he: 'טעויות נפוצות: להסתובב לכיוון הלא נכון — זכרו שהדיאזים עולים בקווינטות, עם כיוון השעון. וקווינטה לא נכונה: מעל סי זה פה דיאז, לא פה. מסי לפה יש רק שישה חצאי טונים, קווינטה מוקטנת.' },
        play: [ch([59, 66], 1.2), ch([59, 65], 1.3)],
        show: { notes: [59, 66], chord: true, key: 'C', text: { en: 'B–F♯ P5 ✓ · B–F d5 ✗', he: 'סי–פה♯ קווינטה זכה ✓ · סי–פה מוקטנת ✗' } },
      },
      {
        say: { en: 'In real music, Baroque sequences and jazz standards such as Autumn Leaves march around the circle. To keep: clockwise adds a sharp, counterclockwise adds a flat, and neighbors are closely related keys.', he: 'במוזיקה אמיתית, סקוונצות בארוק וסטנדרטים של ג׳אז כמו Autumn Leaves צועדים סביב המעגל. לזכור: עם כיוון השעון מוסיפים דיאז, נגדו מוסיפים במול, ושכנים הם סולמות קרובים.' },
        show: { text: { en: '♯ clockwise · ♭ counterclockwise', he: '♯ עם השעון · ♭ נגדו' } },
      },
    ],
  },
  {
    id: 'transposition',
    area: 'theory',
    emoji: '🎺',
    title: { en: 'Transposition', he: 'טרנספוזיציה' },
    takeaway: { en: 'Move every note by the same interval, spelling letters first. B♭ instruments read a major 2nd up, E♭ alto sax a major 6th up, F horn a perfect 5th up.', he: 'מזיזים כל צליל באותו מרווח, ומקפידים קודם על האות. כלים ב־B♭ קוראים סקונדה גדולה למעלה, סקסופון אלט ב־E♭ סקסטה גדולה למעלה, קרן ב־F קווינטה זכה למעלה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Transposing means moving music by a fixed interval. Every note moves the same distance, so the tune stays the same tune.', he: 'היי {name}! טרנספוזיציה פירושה להזיז מוזיקה במרווח קבוע. כל צליל זז אותו מרחק, אז המנגינה נשארת אותה מנגינה.' },
        play: [ns([60, 62, 64, 60], 0.4), rest(0.3), ns([67, 69, 71, 67], 0.4)],
        show: { notes: [67, 69, 71, 67], key: 'G', text: { en: 'C → G: up a perfect 5th', he: 'דו ← סול: קווינטה זכה למעלה' } },
      },
      {
        say: { en: 'Spell it like an interval, letters first. D up a major third: D, E, F, then four semitones, so F♯.', he: 'כותבים כמו מרווח, קודם האותיות. רה ועוד טרצה גדולה: רה, מי, פה, ואז ארבעה חצאי טונים — פה דיאז.' },
        play: [ns([62, 66], 0.7)],
        show: { notes: [62, 66], key: 'D', text: { en: 'D + M3 = F♯', he: 'רה + טרצה גדולה = פה♯' } },
      },
      {
        say: { en: 'Some instruments sound a different note from the one they read. A B♭ trumpet or clarinet sounds a major second lower than written; the tenor sax, an octave lower again.', he: 'יש כלים שהצליל שנשמע שונה מהתו שהם קוראים. חצוצרה או קלרינט ב־B♭ נשמעים סקונדה גדולה מתחת לכתוב; סקסופון טנור — עוד אוקטבה נמוך יותר.' },
        play: [n1(62), n1(60, 1.2)],
        show: { notes: [62, 60], key: 'C', text: { en: 'B♭: written D → sounds C', he: 'B♭: כתוב רה ← נשמע דו' } },
      },
      {
        say: { en: 'So to write for them, go up: concert C becomes written D. To find the sound, go back down.', he: 'אז כדי לכתוב בשבילם, עולים: דו אמיתי נכתב רה. כדי למצוא מה נשמע, יורדים בחזרה.' },
        show: { text: { en: 'B♭ instruments: ↑ major 2nd', he: 'כלים ב־B♭: ↑ סקונדה גדולה' } },
      },
      {
        say: { en: 'The E♭ alto sax reads a major sixth higher: concert C is written A.', he: 'סקסופון אלט ב־E♭ קורא סקסטה גדולה למעלה: דו אמיתי נכתב לה.' },
        play: [ns([60, 69], 0.8)],
        show: { notes: [60, 69], key: 'C', text: { en: 'E♭ alto: ↑ major 6th', he: 'אלט ב־E♭: ↑ סקסטה גדולה' } },
      },
      {
        say: { en: 'The F horn reads a perfect fifth higher: concert C is written G.', he: 'קרן ב־F קוראת קווינטה זכה למעלה: דו אמיתי נכתב סול.' },
        play: [ns([60, 67], 0.8)],
        show: { notes: [60, 67], key: 'C', text: { en: 'F horn: ↑ perfect 5th', he: 'קרן ב־F: ↑ קווינטה זכה' } },
      },
      {
        say: { en: 'Your turn! Move a note by an interval, or switch between concert and written for an instrument. Count the letters first, then the semitones, and pick the spelling.', he: 'תורכם! הזיזו צליל במרווח, או עברו בין צליל אמיתי לכתוב בשביל כלי. ספרו קודם אותיות, אחר כך חצאי טונים, ובחרו את הכתיב.' },
        play: [ns([65, 67], 0.7)],
        show: { text: { en: 'B♭ clarinet: concert F → written ?', he: 'קלרינט ב־B♭: פה אמיתי ← כתוב ?' } },
      },
    ],
    more: [
      {
        say: { en: 'Transposition means two different jobs. One is moving a whole piece to a new key, for example to suit a singer\'s range. The other is writing for transposing instruments, whose written note differs from the sound.', he: 'טרנספוזיציה היא שתי משימות שונות. האחת: להעביר יצירה שלמה לסולם חדש, למשל כדי להתאים למנעד של זמר. השנייה: לכתוב לכלים מעבירים, שבהם התו הכתוב שונה מהצליל שנשמע.' },
        show: { text: { en: 'new key · transposing instruments', he: 'סולם חדש · כלים מעבירים' } },
      },
      {
        say: { en: 'A reliable method for a new key: think in scale degrees. C, E, G, E is 1, 3, 5, 3. In E♭ major, 1, 3, 5, 3 is E♭, G, B♭, G. Change the key signature first, then the notes follow.', he: 'שיטה בטוחה למעבר סולם: לחשוב בדרגות. דו, מי, סול, מי זה 1, 3, 5, 3. במי במול מז׳ור, 1, 3, 5, 3 זה מי♭, סול, סי♭, סול. קודם מחליפים את סימני ההיתק, והתווים באים אחריהם.' },
        play: [ns([60, 64, 67, 64], 0.4), rest(0.3), ns([63, 67, 70, 67], 0.4)],
        show: { notes: [63, 67, 70, 67], key: 'Eb', text: { en: '1 3 5 3 in C → in E♭', he: '1 3 5 3 בדו ← במי♭' } },
      },
      {
        say: { en: 'Chromatic notes keep their relation to the key. F♯ in C major is a raised 4th; moved to D major, the raised 4th is G♯.', he: 'צלילים כרומטיים שומרים על הקשר שלהם לסולם. פה דיאז בדו מז׳ור הוא דרגה 4 מוגבהת; כשעוברים לרה מז׳ור, דרגה 4 מוגבהת היא סול דיאז.' },
        play: [ns([64, 66, 67], 0.45), rest(0.3), ns([66, 68, 69], 0.45)],
        show: { notes: [66, 68, 69], key: 'D', text: { en: '♯4: F♯ in C → G♯ in D', he: '♯4: פה♯ בדו ← סול♯ ברה' } },
      },
      {
        say: { en: 'Why do instruments transpose? So one fingering gives one written note across a whole family. A saxophonist can switch from alto to tenor without relearning to read.', he: 'למה כלים מעבירים? כדי שאצבוע אחד ייתן תו כתוב אחד בכל המשפחה. סקסופוניסט יכול לעבור מאלט לטנור בלי ללמוד לקרוא מחדש.' },
        show: { text: { en: 'one fingering = one written note', he: 'אצבוע אחד = תו כתוב אחד' } },
      },
      {
        say: { en: 'The name tells you what sounds when the player reads C. A B♭ trumpet reading C sounds B♭, a major 2nd lower. The tenor sax sounds a major 9th lower, the baritone sax an octave and a major 6th. Guitar sounds an octave below written.', he: 'השם אומר מה נשמע כשהנגן קורא דו. חצוצרה ב־B♭ שקוראת דו משמיעה סי♭, סקונדה גדולה נמוך יותר. סקסופון טנור נשמע 9 גדולה נמוך יותר, סקסופון בריטון אוקטבה ועוד סקסטה גדולה. גיטרה נשמעת אוקטבה מתחת לכתוב.' },
        play: [n1(60, 0.8), n1(58, 1.2)],
        show: { notes: [60, 58], key: 'C', text: { en: 'B♭ trumpet: reads C, sounds B♭', he: 'חצוצרה ב־B♭: קוראת דו, משמיעה סי♭' } },
      },
      {
        say: { en: 'Key signatures move too. A concert piece in E♭ major is written in F major for B♭ instruments, and in C major for the E♭ alto sax.', he: 'גם סימני ההיתק זזים. יצירה במי במול מז׳ור נכתבת בפה מז׳ור לכלים ב־B♭, ובדו מז׳ור לסקסופון אלט ב־E♭.' },
        play: [cad('E', -1)],
        show: { text: { en: 'concert E♭ → B♭ inst. F · alto C', he: 'מי♭ אמיתי ← כלי B♭: פה · אלט: דו' } },
      },
      {
        say: { en: 'The common mistake is going the wrong way. The instrument sounds lower than written, so to write its part you go up. Check yourself: for B♭ trumpet and clarinet, alto sax and F horn, the written note should be higher than concert.', he: 'הטעות הנפוצה היא ללכת לכיוון הלא נכון. הכלי נשמע נמוך מהכתוב, אז כדי לכתוב לו עולים. בדקו את עצמכם: בחצוצרה ובקלרינט ב־B♭, בסקסופון אלט ובקרן ב־F, התו הכתוב גבוה מהצליל האמיתי.' },
        show: { text: { en: 'write for it: go up', he: 'כותבים בשבילו: עולים' } },
      },
      {
        say: { en: 'In real music, jazz fake books come in C, B♭ and E♭ editions, so every player reads in their own transposition. To keep: think in degrees, spell letters first, and write up for transposing instruments.', he: 'במוזיקה אמיתית, ספרי סטנדרטים בג׳אז יוצאים במהדורות C, ‏B♭ ו־E♭, כך שכל נגן קורא בטרנספוזיציה שלו. לזכור: חושבים בדרגות, כותבים קודם אותיות, ולכלים מעבירים כותבים למעלה.' },
        show: { text: { en: 'C · B♭ · E♭ books', he: 'ספרים ב־C · B♭ · E♭' } },
      },
    ],
  },
  {
    id: 'chord-scale',
    area: 'theory',
    emoji: '🧤',
    title: { en: 'Chord and scale', he: 'אקורד וסולם' },
    takeaway: { en: 'In a key, play the key\'s notes from the chord\'s root: ii is Dorian, iii Phrygian, V Mixolydian. Jazz tensions pick special scales: 7alt → altered.', he: 'בתוך סולם, מנגנים את צלילי הסולם מהשורש של האקורד: ii דורי, iii פריגי, V מיקסולידי. טנשנים בג׳אז בוחרים סולמות מיוחדים: 7alt ← אלטרד.' },
    steps: [
      {
        say: { en: 'Hi {name}! Every chord has a scale that fits it like a glove. Inside a key, play the key\'s notes starting from the chord\'s root.', he: 'היי {name}! לכל אקורד יש סולם שמתאים לו כמו כפפה. בתוך סולם, מנגנים את צלילי הסולם החל מהשורש של האקורד.' },
        play: [ch([50, 53, 57, 60], 1.2), ns([62, 64, 65, 67, 69, 71, 72, 74], 0.28)],
        show: { notes: [62, 64, 65, 67, 69, 71, 72, 74], key: 'C', text: { en: 'Dm7 in C → D Dorian', he: 'Dm7 בדו מז׳ור ← רה דורי' } },
      },
      {
        say: { en: 'In C major that gives seven modes: I Ionian, ii Dorian, iii Phrygian, IV Lydian, V Mixolydian, vi Aeolian, vii Locrian.', he: 'בדו מז׳ור זה נותן שבעה מודוסים: I יוני, ii דורי, iii פריגי, IV לידי, V מיקסולידי, vi איאולי, vii לוקרי.' },
        show: { key: 'C', text: { en: 'I Ion · ii Dor · iii Phr · IV Lyd · V Mix · vi Aeo · viiø Loc', he: 'I יוני · ii דורי · iii פריגי · IV לידי · V מיקסו · vi איאולי · viiø לוקרי' } },
      },
      {
        say: { en: 'Careful: m7 chords sit on ii, iii and vi, so the degree decides. Dm7 is Dorian, but Em7 in C is Phrygian.', he: 'זהירות: אקורדי m7 יושבים על ii, ‏iii ו־vi, אז הדרגה מכריעה. Dm7 הוא דורי, אבל Em7 בדו מז׳ור הוא פריגי.' },
        play: [ch([52, 55, 59, 62], 1.2), ns([64, 65, 67, 69, 71, 72, 74, 76], 0.28)],
        show: { notes: [64, 65, 67, 69, 71, 72, 74, 76], key: 'C', text: { en: 'Em7 → E Phrygian', he: 'Em7 ← מי פריגי' } },
      },
      {
        say: { en: 'G7, the V chord, takes Mixolydian: a major scale with a lowered seventh.', he: 'G7, אקורד ה־V, מקבל מיקסולידי: סולם מז׳ור עם ספטימה מונמכת.' },
        play: [ch([43, 59, 62, 65], 1.2), ns([55, 57, 59, 60, 62, 64, 65, 67], 0.28)],
        show: { notes: [55, 57, 59, 60, 62, 64, 65, 67], key: 'C', text: { en: 'G7 → G Mixolydian', he: 'G7 ← סול מיקסולידי' } },
      },
      {
        say: { en: 'Jazz adds color. 7alt takes the altered scale, 13♭9 the half-whole diminished, and 7♯11 the Lydian dominant.', he: 'הג׳אז מוסיף צבע. 7alt מקבל את סולם האלטרד, 13♭9 את הדימיניש חצי־שלם, ו־7♯11 את הלידי הדומיננטי.' },
        play: [ch([43, 59, 65, 70, 75], 1.4), ch([43, 59, 65, 69, 73], 1.4)],
        show: { notes: [43, 59, 65, 70, 75], chord: true, key: 'C', text: { en: '7alt · 13♭9 · 7♯11', he: '7alt · 13♭9 · 7♯11' } },
      },
      {
        say: { en: '7♯5 takes whole tone, m(maj7) melodic minor, maj7♯11 Lydian, and a 7♭9 heading to a minor chord takes Phrygian dominant.', he: '7♯5 מקבל טון שלם, m(maj7) מינור מלודי, maj7♯11 לידי, ו־7♭9 שהולך לאקורד מינורי מקבל פריגי דומיננטי.' },
        play: [ns([60, 62, 64, 66, 68, 70, 72], 0.3)],
        show: { notes: [60, 62, 64, 66, 68, 70, 72], text: { en: '7♯5 → whole tone', he: '7♯5 ← טון שלם' } },
      },
      {
        say: { en: 'Your turn! I show and play a chord, at first with its key. Find its degree, or its tell-tale tension, and pick the scale.', he: 'תורכם! אני מציג ומנגן אקורד, בהתחלה עם הסולם שלו. מצאו את הדרגה, או את הטנשן שמסגיר אותו, ובחרו את הסולם.' },
        play: [ch([45, 48, 52, 55], 1.6)],
        show: { notes: [45, 48, 52, 55], chord: true, key: 'C', text: { en: 'Am7 in C — which scale?', he: 'Am7 בדו מז׳ור — איזה סולם?' } },
      },
    ],
    more: [
      {
        say: { en: 'A chord scale is a pool of notes: the chord tones plus the tensions between them. Some scale notes clash when held, usually one a semitone above a chord tone. Over Cmaj7, a held F rubs against E; D, the 9, rings.', he: 'סולם אקורד הוא מאגר צלילים: צלילי האקורד ועוד הטנשנים שביניהם. חלק מצלילי הסולם מתנגשים כשמחזיקים אותם — בדרך כלל צליל שנמצא חצי טון מעל צליל של האקורד. מעל Cmaj7, פה מוחזק משפשף את המי; רה, ה־9, מצלצל.' },
        play: [ch([48, 55, 64, 71, 77], 1.4), ch([48, 55, 64, 71, 74], 1.5)],
        show: { notes: [48, 55, 64, 71, 74], chord: true, key: 'C', text: { en: 'F rubs · D (9) rings', he: 'פה משפשף · רה (9) מצלצל' } },
      },
      {
        say: { en: 'The seven modes, from brightest to darkest: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian. Each step down lowers just one note.', he: 'שבעת המודוסים, מהמואר לכהה: לידי, יוני, מיקסולידי, דורי, איאולי, פריגי, לוקרי. כל צעד למטה מנמיך צליל אחד בלבד.' },
        show: { text: { en: 'Lyd · Ion · Mix · Dor · Aeo · Phr · Loc', he: 'לידי · יוני · מיקסו · דורי · איאולי · פריגי · לוקרי' } },
      },
      {
        say: { en: 'Each mode has a signature note. Dorian has a natural 6, Aeolian a ♭6. Phrygian has a ♭2, Lydian a ♯4, Mixolydian a ♭7, Locrian a ♭2 and ♭5. Hear D Dorian, with B, then D Aeolian, with B♭.', he: 'לכל מודוס יש צליל מזהה. בדורי יש 6 טבעית, באיאולי ♭6. בפריגי ♭2, בלידי ♯4, במיקסולידי ♭7, ובלוקרי ♭2 ו־♭5. שמעו את רה דורי, עם סי, ואז את רה איאולי, עם סי♭.' },
        play: [ns([62, 64, 65, 67, 69, 71, 72, 74], 0.26), rest(0.3), ns([62, 64, 65, 67, 69, 70, 72, 74], 0.26)],
        show: { notes: [62, 64, 65, 67, 69, 71, 72, 74], key: 'C', text: { en: 'D Dorian (B) · D Aeolian (B♭)', he: 'רה דורי (סי) · רה איאולי (סי♭)' } },
      },
      {
        say: { en: 'The melodic minor scale has its own family of modes. Its 1st mode suits m(maj7), its 4th is Lydian dominant for 7♯11, its 6th is Locrian ♮2 for m7♭5, and its 7th is the altered scale for 7alt.', he: 'למינור המלודי יש משפחת מודוסים משלו. המודוס הראשון מתאים ל־m(maj7), הרביעי הוא לידי דומיננטי ל־7♯11, השישי הוא לוקרי ♮2 ל־m7♭5, והשביעי הוא סולם האלטרד ל־7alt.' },
        play: [ns([55, 56, 58, 59, 61, 63, 65, 67], 0.28)],
        show: { notes: [55, 56, 58, 59, 61, 63, 65, 67], key: 'C', text: { en: 'G altered: G A♭ B♭ B C♯ E♭ F', he: 'סול אלטרד: סול לה♭ סי♭ סי דו♯ מי♭ פה' } },
      },
      {
        say: { en: 'For dominants, ask three questions. Is the 9 natural or altered? Is the 11 natural or sharp? Is the 13 natural or flat? Natural 9 and 13 point to Mixolydian; ♭9 with natural 13 to half-whole diminished; ♭9 and ♭13 to altered or Phrygian dominant.', he: 'בדומיננטים שאלו שלוש שאלות. ה־9 טבעי או אלטרד? ה־11 טבעי או מוגבה? ה־13 טבעי או מונמך? 9 ו־13 טבעיים — מיקסולידי; ♭9 עם 13 טבעי — דימיניש חצי־שלם; ♭9 ו־♭13 — אלטרד או פריגי דומיננטי.' },
        play: [ns([55, 56, 58, 59, 61, 62, 64, 65, 67], 0.26)],
        show: { notes: [55, 56, 58, 59, 61, 62, 64, 65, 67], key: 'C', text: { en: 'G half-whole: G A♭ B♭ B C♯ D E F', he: 'סול חצי־שלם: סול לה♭ סי♭ סי דו♯ רה מי פה' } },
      },
      {
        say: { en: 'The common mistake is staying in the key\'s scale when the chord leaves it. In C minor, G7 resolving to Cm wants A♭ and E♭, its ♭9 and ♭13, not the A and E of G Mixolydian.', he: 'הטעות הנפוצה היא להישאר בסולם של היצירה כשהאקורד יוצא ממנו. בדו מינור, G7 שנפתר ל־Cm רוצה לה♭ ומי♭, ה־♭9 וה־♭13 שלו, ולא את הלה והמי של סול מיקסולידי.' },
        play: [ch([43, 59, 65, 68], 1.1), ch([36, 55, 60, 63], 1.5)],
        show: { notes: [43, 59, 65, 68], chord: true, key: 'Eb', text: { en: 'G7♭9 → Cm', he: 'G7♭9 → Cm' } },
      },
      {
        say: { en: 'In real music, modal jazz made chord scales famous: Miles Davis\'s So What sits on D Dorian, then moves up to E♭ Dorian. To keep: chord tones first, then pick the tensions that fit, and the scale names itself.', he: 'במוזיקה אמיתית, הג׳אז המודלי הפך את סולמות האקורד למפורסמים: So What של מיילס דייוויס יושב על רה דורי, ואז עולה למי♭ דורי. לזכור: קודם צלילי האקורד, אחר כך בוחרים את הטנשנים שמתאימים, והסולם כבר נותן לעצמו שם.' },
        show: { text: { en: 'chord tones + tensions = scale', he: 'צלילי אקורד + טנשנים = סולם' } },
      },
    ],
  },
  {
    id: 'note-reading',
    area: 'theory',
    emoji: '👀',
    title: { en: 'Reading notes', he: 'קריאת תווים' },
    takeaway: { en: 'Treble lines E G B D F, spaces F A C E; bass lines G B D F A, spaces A C E G; the alto clef points at middle C.', he: 'מפתח סול: קווים מי סול סי רה פה, רווחים פה לה דו מי; מפתח פה: קווים סול סי רה פה לה, רווחים לה דו מי סול; מפתח דו (אלט) מצביע על דו האמצעי.' },
    steps: [
      {
        say: { en: 'Hi {name}! A clef tells you which line is which note. The treble clef, or G clef, curls around the second line: G above middle C.', he: 'היי {name}! המפתח אומר איזה קו הוא איזה צליל. מפתח סול מתפתל סביב הקו השני: סול שמעל דו האמצעי.' },
        play: [n1(67, 1.2)],
        show: { notes: [67], clef: 'treble', text: { en: 'G clef → G', he: 'מפתח סול ← סול' } },
      },
      {
        say: { en: 'Treble lines from the bottom: E, G, B, D, F. The spaces spell F, A, C, E — FACE.', he: 'הקווים במפתח סול, מלמטה: מי, סול, סי, רה, פה. הרווחים: פה, לה, דו, מי.' },
        play: [ns([64, 67, 71, 74, 77], 0.45), ns([65, 69, 72, 76], 0.45)],
        show: { notes: [64, 67, 71, 74, 77], clef: 'treble', text: { en: 'E G B D F · F A C E', he: 'מי סול סי רה פה · פה לה דו מי' } },
      },
      {
        say: { en: 'The bass clef, or F clef, has two dots hugging the fourth line: F below middle C. Lines: G, B, D, F, A. Spaces: A, C, E, G.', he: 'במפתח פה שתי נקודות עוטפות את הקו הרביעי: פה שמתחת לדו האמצעי. קווים: סול, סי, רה, פה, לה. רווחים: לה, דו, מי, סול.' },
        play: [ns([43, 47, 50, 53, 57], 0.45)],
        show: { notes: [43, 47, 50, 53, 57], clef: 'bass', text: { en: 'G B D F A · A C E G', he: 'סול סי רה פה לה · לה דו מי סול' } },
      },
      {
        say: { en: 'The alto clef, a C clef, points straight at its middle line: middle C. Violas read it all day. Lines: F, A, C, E, G.', he: 'מפתח אלט, מפתח דו, מצביע ישר על הקו האמצעי: דו האמצעי. נגני ויולה קוראים אותו כל היום. קווים: פה, לה, דו, מי, סול.' },
        play: [ns([53, 57, 60, 64, 67], 0.45)],
        show: { notes: [53, 57, 60, 64, 67], clef: 'alto', text: { en: 'Middle line = middle C', he: 'קו אמצעי = דו האמצעי' } },
      },
      {
        say: { en: 'Middle C is the bridge: one ledger line below the treble staff, one above the bass staff. Ledger lines just continue the pattern.', he: 'דו האמצעי הוא הגשר: קו עזר אחד מתחת לחמשה של מפתח סול, ואחד מעל החמשה של מפתח פה. קווי עזר פשוט ממשיכים את הדפוס.' },
        play: [n1(60, 1.2)],
        show: { notes: [60], clef: 'treble', text: { en: 'Middle C', he: 'דו האמצעי' } },
      },
      {
        say: { en: 'Learn a few landmarks, then count: line, space, line is always the next letter up.', he: 'זכרו כמה ציוני דרך, ואז ספרו: קו, רווח, קו — כל אחד הוא האות הבאה למעלה.' },
        play: [ns([67, 69, 71], 0.5)],
        show: { notes: [67, 69, 71], clef: 'treble', text: { en: 'G → A → B', he: 'סול ← לה ← סי' } },
      },
      {
        say: { en: 'Your turn! I show one note on the staff. Check the clef, find your nearest landmark, count, and pick its name.', he: 'תורכם! אני מציג תו אחד על החמשה. בדקו את המפתח, מצאו את ציון הדרך הקרוב, ספרו, ובחרו את השם.' },
        play: [n1(74, 1)],
        show: { notes: [74], clef: 'treble', text: { en: 'Which note?', he: 'איזה תו?' } },
      },
    ],
    more: [
      {
        say: { en: 'Piano music uses the grand staff: a treble staff above a bass staff, joined by a brace. Middle C sits between them on its own short ledger line, belonging to both.', he: 'מוזיקה לפסנתר נכתבת על חמשה כפולה: חמשת מפתח סול מעל חמשת מפתח פה, מחוברות בסוגר. דו האמצעי יושב ביניהן על קו עזר קצר משלו, ושייך לשתיהן.' },
        play: [ch([48, 60, 72], 1.5)],
        show: { notes: [60], clef: 'bass', text: { en: 'middle C = C4', he: 'דו האמצעי = C4' } },
      },
      {
        say: { en: 'Learn six landmarks: bass G on the bottom line, bass F on the fourth line, middle C, treble G on the second line, C in the treble third space, and F on the top line. Every other note is a short count away.', he: 'למדו שישה ציוני דרך: סול על הקו התחתון במפתח פה, פה על הקו הרביעי במפתח פה, דו האמצעי, סול על הקו השני במפתח סול, דו ברווח השלישי במפתח סול, ופה על הקו העליון. כל תו אחר נמצא במרחק ספירה קצרה.' },
        play: [ns([43, 53, 60, 67, 72, 77], 0.45)],
        show: { text: { en: 'G2 · F3 · C4 · G4 · C5 · F5', he: 'G2 · F3 · C4 · G4 · C5 · F5' } },
      },
      {
        say: { en: 'Read shapes, not just single notes. Line to the next space is a 2nd; line to the next line is a 3rd. Three notes on consecutive lines, like E, G, B, form a stack of thirds: a triad.', he: 'קראו צורות, לא רק תווים בודדים. מקו לרווח הסמוך — סקונדה; מקו לקו הבא — טרצה. שלושה תווים על קווים רצופים, כמו מי, סול, סי, הם ערימת טרצות: משולש.' },
        play: [ns([64, 67, 71], 0.5), ch([64, 67, 71], 1.2)],
        show: { notes: [64, 67, 71], chord: true, clef: 'treble', text: { en: 'line–line–line = 3rds', he: 'קו–קו–קו = טרצות' } },
      },
      {
        say: { en: 'Ledger lines continue the staff. Above the treble staff, the first ledger line is A and the second is C. Below the bass staff, the first is E and the second is C.', he: 'קווי עזר ממשיכים את החמשה. מעל החמשה של מפתח סול, קו העזר הראשון הוא לה והשני הוא דו. מתחת לחמשה של מפתח פה, הראשון הוא מי והשני הוא דו.' },
        play: [n1(81, 0.8), n1(84, 1)],
        show: { notes: [81, 84], clef: 'treble', text: { en: 'A5 · C6', he: 'לה · דו' } },
      },
      {
        say: { en: 'The tenor clef is another C clef, pointing at the fourth line. Cellos, bassoons and trombones use it for high passages. Its lines are D, F, A, C, E.', he: 'מפתח טנור הוא עוד מפתח דו, והוא מצביע על הקו הרביעי. צ׳לו, בסון וטרומבון משתמשים בו בקטעים גבוהים. הקווים שלו: רה, פה, לה, דו, מי.' },
        play: [ns([50, 53, 57, 60, 64], 0.45)],
        show: { notes: [50, 53, 57, 60, 64], clef: 'tenor', text: { en: 'D F A C E', he: 'רה פה לה דו מי' } },
      },
      {
        say: { en: 'The common mistake is reading the bass clef with treble names. The same position reads two letters higher in bass clef: the bottom line is E in treble but G in bass. Always check the clef first.', he: 'הטעות הנפוצה היא לקרוא מפתח פה עם השמות של מפתח סול. אותו מקום על החמשה הוא שתי אותיות גבוה יותר במפתח פה: הקו התחתון הוא מי במפתח סול, אבל סול במפתח פה. תמיד בדקו קודם את המפתח.' },
        play: [n1(64, 0.9), n1(43, 1.1)],
        show: { notes: [43], clef: 'bass', text: { en: 'bottom line: E (treble) · G (bass)', he: 'קו תחתון: מי (סול) · סול (פה)' } },
      },
      {
        say: { en: 'Practice a few minutes every day, naming notes aloud, and time yourself. To keep: check the clef, find the nearest landmark, then count by lines and spaces.', he: 'תרגלו כמה דקות כל יום, אמרו את שמות התווים בקול, ומדדו זמן. לזכור: בודקים את המפתח, מוצאים את ציון הדרך הקרוב, ואז סופרים קווים ורווחים.' },
        show: { text: { en: 'clef → landmark → count', he: 'מפתח ← ציון דרך ← ספירה' } },
      },
    ],
  },
];

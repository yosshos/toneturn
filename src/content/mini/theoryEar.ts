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
    title: { en: 'Extensions and colours', he: 'הרחבות וצבעים' },
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
        say: { en: 'Major chords wear softer colours: maj7, maj9, the sparkling Lydian maj7♯11, and 6/9, which has no seventh at all.', he: 'לאקורדי מז׳ור יש צבעים רכים יותר: maj7, ‏maj9, ה־maj7♯11 הלידי והנוצץ, ו־6/9 — שאין בו ספטימה בכלל.' },
        play: [ch([43, 59, 62, 66], 1.1), ch([43, 59, 66, 69], 1.1), ch([43, 59, 66, 73], 1.1), ch([43, 59, 64, 69], 1.4)],
        show: { notes: [43, 59, 64, 69], chord: true, key: 'G', text: { en: 'maj7 · maj9 · maj7♯11 · 6/9', he: 'maj7 · maj9 · maj7♯11 · 6/9' } },
      },
      {
        say: { en: 'sus4 swaps the 3 for a 4, so the chord hangs in the air; 7sus4 adds the 7. add9 keeps the 3 and adds a 9, no seventh. And 7alt piles ♯9 and ♭13 onto a dominant.', he: 'ב־sus4 ה־4 מחליף את ה־3, והאקורד נשאר תלוי באוויר; 7sus4 מוסיף את ה־7. ‏add9 שומר על ה־3 ומוסיף 9, בלי ספטימה. ו־7alt מעמיס ♯9 ו־♭13 על הדומיננט.' },
        play: [ch([43, 60, 62, 67], 1.1), ch([43, 60, 65, 69], 1.1), ch([43, 59, 62, 69], 1.1), ch([43, 59, 65, 70, 75], 1.4)],
        show: { notes: [43, 60, 62, 67], chord: true, key: 'C', text: { en: 'sus4 · 7sus4 · add9 · 7alt', he: 'sus4 · 7sus4 · add9 · 7alt' } },
      },
      {
        say: { en: 'Your turn! I play a chord together, then note by note upward. Listen to the top note and the colour, and pick its name. Your ear knows more than you think.', he: 'תורכם! אני מנגן אקורד ביחד, ואז צליל אחר צליל מלמטה למעלה. הקשיבו לצליל העליון ולצבע, ובחרו את השם. האוזן שלכם יודעת יותר ממה שנדמה לכם.' },
        play: [ch([...G7, 69], 1.5), arp([...G7, 69])],
        show: { notes: [...G7, 69], chord: true, key: 'C', text: { en: '7? 9? 13?', he: '7? 9? 13?' } },
      },
    ],
  },
  {
    id: 'voicings',
    area: 'harmony',
    emoji: '🎹',
    title: { en: 'Voicings and inversions', he: 'וויסינגים והיפוכים' },
    takeaway: { en: 'Same chord, different arrangement: close, drop 2 or spread; the bass note sets the inversion; jazz voicings leave notes out or add colour on top.', he: 'אותו אקורד, סידור אחר: צפוף, Drop 2 או פרוש; צליל הבס קובע את ההיפוך; וויסינגים בג׳אז משמיטים צלילים או מוסיפים צבע למעלה.' },
    steps: [
      {
        say: { en: 'Same chord, different outfit: a voicing is how you arrange its notes. Here is Cmaj7 in close position, all four notes packed as tight as they go.', he: 'אותו אקורד, תלבושת אחרת: וויסינג הוא האופן שבו מסדרים את הצלילים. הנה Cmaj7 במצב צפוף — ארבעת הצלילים צמודים ככל האפשר.' },
        play: [ch([60, 64, 67, 71], 1.4), arp([60, 64, 67, 71])],
        show: { notes: [60, 64, 67, 71], chord: true, key: 'C', text: { en: 'Close', he: 'צפוף' } },
      },
      {
        say: { en: 'Drop 2: take the second note from the top and drop it an octave. Wider and smoother — a big-band and guitar favourite.', he: 'Drop 2: לוקחים את הצליל השני מלמעלה ומורידים אותו אוקטבה. רחב וחלק יותר — אהוב על ביג־בנדים ועל גיטריסטים.' },
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
        say: { en: 'Borrowed chords sneak in from the parallel minor. ♭VI–♭VII–I is the heroic ending — level complete! I–♭III–IV–I borrows too.', he: 'אקורדים שאולים מתגנבים מהמינור שעל אותה טוניקה. ♭VI–♭VII–I הוא הסיום ההרואי — שלב הושלם! גם I–♭III–IV–I שואל.' },
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
        say: { en: 'Now 25 cents, lower. Do not analyse — just feel which way it leans.', he: 'עכשיו 25 סנט, נמוך יותר. אל תנתחו — פשוט הרגישו לאן הוא נוטה.' },
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
  },

  // ------------------------------------------------------------------ world
  {
    id: 'maqam',
    area: 'world',
    emoji: '🕌',
    title: { en: 'Maqamat', he: 'מקאמים' },
    takeaway: { en: 'A maqam is built from small note groups (ajnas); the first jins gives its flavour: Hijaz has the wide gap, Rast and Bayati the quarter tones.', he: 'מקאם בנוי מקבוצות צלילים קטנות (אג׳נאס); הג׳ינס הראשון נותן את הטעם: בחיג׳אז יש את הפער הרחב, בראסט ובביאתי — רבעי הטונים.' },
    steps: [
      {
        say: { en: 'Hi {name}! Arabic music organises melody in maqamat. Each maqam is built from small groups of about four notes, each called a jins. The first jins gives the flavour.', he: 'היי {name}! המוזיקה הערבית מארגנת מנגינות במקאמים. כל מקאם בנוי מקבוצות קטנות של כארבעה צלילים, וכל אחת נקראת ג׳ינס. הג׳ינס הראשון נותן את הטעם.' },
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
        say: { en: 'Flat keys: the second-to-last flat names the key. B♭, E♭, A♭ — that is E♭ major. One flat is the one to memorise: F major.', he: 'סולמות עם במולים: הבמול הלפני אחרון הוא שם הסולם. סי♭, מי♭, לה♭ — זה מי במול מז׳ור. במול אחד צריך פשוט לזכור: פה מז׳ור.' },
        play: [cad('E', -1)],
        show: { notes: [63, 67, 70], chord: true, key: 'Eb', text: { en: 'B♭ E♭ A♭ → E♭ major', he: 'סי♭ מי♭ לה♭ ← מי במול מז׳ור' } },
      },
      {
        say: { en: 'Every signature also fits a minor key, the relative minor: on the sixth degree, a minor third down. Two sharps: D major or B minor.', he: 'כל סימן היתק מתאים גם לסולם מינורי, המינור המקביל: על הדרגה השישית, טרצה קטנה למטה. שני דיאזים: רה מז׳ור או סי מינור.' },
        play: [ch([62, 66, 69], 1.2), ch([59, 62, 66], 1.6)],
        show: { notes: [59, 62, 66], chord: true, key: 'D', text: { en: 'D major = B minor', he: 'רה מז׳ור = סי מינור' } },
      },
      {
        say: { en: 'Your turn! You will see a key signature on the staff. Count the sharps or flats and pick the major key — at the top level, sometimes its relative minor. This one is all eyes, no ears.', he: 'תורכם! תראו סימן היתק על החמשה. ספרו את הדיאזים או הבמולים ובחרו את סולם המז׳ור — ובשלב העליון, לפעמים את המינור המקביל. הפעם הכול בעיניים, בלי אוזניים.' },
        play: [cad('A')],
        show: { notes: [69], key: 'A', text: { en: '3♯ = ?', he: '3♯ = ?' } },
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
        say: { en: 'Augmented is a semitone wider than major or perfect; diminished, a semitone narrower than minor or perfect. C to F♯ and C to G♭ sound the same — a fourth and a fifth.', he: 'מוגדל רחב בחצי טון מגדול או מזך; מוקטן צר בחצי טון מקטן או מזך. דו–פה דיאז ודו–סול במול נשמעים אותו דבר — קוורטה מוגדלת וקווינטה מוקטנת.' },
        play: [ch([60, 66], 1.4)],
        show: { notes: [60, 66], chord: true, key: 'C', text: { en: 'C–F♯ A4 · C–G♭ d5', he: 'דו–פה♯ קוורטה מוגדלת · דו–סול♭ קווינטה מוקטנת' } },
      },
      {
        say: { en: 'Your turn! I name an interval and a starting note. Count the letters, then the semitones, and pick the right spelling. Beware the twin with the wrong letter!', he: 'תורכם! אני אומר מרווח וצליל התחלה. ספרו אותיות, אחר כך חצאי טונים, ובחרו את הכתיב הנכון. היזהרו מהתאום עם האות הלא נכונה!' },
        play: [ns([62, 66], 0.6)],
        show: { text: { en: 'major 3rd ↑ D = ?', he: 'טרצה גדולה ↑ רה = ?' } },
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
  },
  {
    id: 'circle-fifths',
    area: 'theory',
    emoji: '🧭',
    title: { en: 'The circle of fifths', he: 'מעגל הקווינטות' },
    takeaway: { en: 'Clockwise by fifths adds a sharp (G D A E B F♯), anticlockwise adds a flat (F B♭ E♭ A♭ D♭ G♭); the relative minor is a minor third down.', he: 'עם כיוון השעון בקווינטות מוסיפים דיאז (סול רה לה מי סי פה♯), נגד כיוון השעון מוסיפים במול (פה סי♭ מי♭ לה♭ רה♭ סול♭); המינור המקביל טרצה קטנה למטה.' },
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
        say: { en: 'Put them on a clock: C at the top, sharps clockwise, flats anticlockwise. At the bottom F♯ and G♭ meet: same sound, two names.', he: 'שמים אותם על שעון: דו למעלה, הדיאזים עם כיוון השעון, הבמולים נגדו. למטה נפגשים פה דיאז וסול במול: אותו צליל, שני שמות.' },
        show: { text: { en: '♭ ← C → ♯', he: 'דו למעלה · ♯ עם השעון · ♭ נגדו' } },
      },
      {
        say: { en: 'Neighbours on the circle are a fifth apart and differ by just one sharp or flat. Clockwise from D is A; anticlockwise is G.', he: 'שכנים במעגל רחוקים קווינטה זה מזה ונבדלים בדיאז או במול אחד בלבד. עם כיוון השעון מרה — לה; נגד כיוון השעון — סול.' },
        play: [ch([55, 59, 62], 1), ch([50, 54, 57], 1), ch([57, 61, 64], 1.3)],
        show: { text: { en: 'G ← D → A', he: 'השכנים של רה: סול, לה' } },
      },
      {
        say: { en: 'Each major key shares its signature with a relative minor, a minor third down. C major and A minor; G major and E minor.', he: 'כל סולם מז׳ור חולק את סימני ההיתק עם מינור מקביל, טרצה קטנה למטה. דו מז׳ור ולה מינור; סול מז׳ור ומי מינור.' },
        play: [ch([60, 64, 67], 1.1), ch([57, 60, 64], 1.4)],
        show: { notes: [57, 60, 64], chord: true, key: 'C', text: { en: 'C major ↔ A minor', he: 'דו מז׳ור ↔ לה מינור' } },
      },
      {
        say: { en: 'Your turn! I name a major key. Depending on the level, tell me how many sharps or flats it has, its relative minor, or its neighbour one step around the circle.', he: 'תורכם! אני אומר סולם מז׳ור. לפי השלב, אמרו לי כמה דיאזים או במולים יש בו, מה המינור המקביל שלו, או מי השכן שלו צעד אחד במעגל.' },
        play: [cad('E', -1)],
        show: { text: { en: 'E♭ major: ?', he: 'מי במול מז׳ור: ?' } },
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
        say: { en: 'The F horn reads a perfect fifth higher: concert C is written G. Brass players do this math before breakfast.', he: 'קרן ב־F קוראת קווינטה זכה למעלה: דו אמיתי נכתב סול. נגני כלי נשיפה עושים את החשבון הזה עוד לפני ארוחת הבוקר.' },
        play: [ns([60, 67], 0.8)],
        show: { notes: [60, 67], key: 'C', text: { en: 'F horn: ↑ perfect 5th', he: 'קרן ב־F: ↑ קווינטה זכה' } },
      },
      {
        say: { en: 'Your turn! Move a note by an interval, or switch between concert and written for an instrument. Count the letters first, then the semitones, and pick the spelling.', he: 'תורכם! הזיזו צליל במרווח, או עברו בין צליל אמיתי לכתוב בשביל כלי. ספרו קודם אותיות, אחר כך חצאי טונים, ובחרו את הכתיב.' },
        play: [ns([65, 67], 0.7)],
        show: { text: { en: 'B♭ clarinet: concert F → written ?', he: 'קלרינט ב־B♭: פה אמיתי ← כתוב ?' } },
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
        say: { en: 'Jazz adds colour. 7alt takes the altered scale, 13♭9 the half-whole diminished, and 7♯11 the Lydian dominant.', he: 'הג׳אז מוסיף צבע. 7alt מקבל את סולם האלטרד, 13♭9 את הדימיניש חצי־שלם, ו־7♯11 את הלידי הדומיננטי.' },
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
  },
];

// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// The learning path: one lesson before each path unit, teaching exactly what its exercise asks.

import type { MiniLesson } from '../miniTypes';
import type { Stimulus } from '../../engine/lesson';
import type { PitchClass } from '../../engine/pitch';

const K = (letter: PitchClass['letter'], acc: PitchClass['acc'] = 0): PitchClass => ({ letter, acc });
const C = K('C');
const D = K('D');
const F = K('F');
const G = K('G');
const Bb = K('B', -1);
const Eb = K('E', -1);

const cad = (key: PitchClass): Stimulus => ({ kind: 'cadence', key });
const note = (midi: number, duration = 1.4): Stimulus => ({ kind: 'note', midi, duration });
const notes = (midis: number[], each = 0.7): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.4, arpeggio = false): Stimulus => (arpeggio ? { kind: 'chord', midis, duration, arpeggio } : { kind: 'chord', midis, duration });
const rest = (duration = 0.4): Stimulus => ({ kind: 'rest', duration });
const melody = (midis: number[], beats: number[], bpm = 96): Stimulus => ({ kind: 'melody', midis, beats, bpm });

// C major from C4 (scale up to the octave), and modes from C4.
const C_MAJOR = [60, 62, 64, 65, 67, 69, 71];
const C_IONIAN = [60, 62, 64, 65, 67, 69, 71, 72];
const C_AEOLIAN = [60, 62, 63, 65, 67, 68, 70, 72];
const C_DORIAN = [60, 62, 63, 65, 67, 69, 70, 72];
const C_MIXO = [60, 62, 64, 65, 67, 69, 70, 72];
const upDown = (xs: number[]) => [...xs, ...xs.slice(0, -1).reverse()];

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ 1. Same B♭, two homes
  {
    id: 'bflat-two-homes',
    area: 'ear',
    emoji: '🔑',
    title: { en: 'Same B♭, two homes', he: 'אותו סי במול, שני בתים' },
    takeaway: { en: 'A note has no meaning alone: the key gives it its job. B♭ is 1 in B♭ major and 5 in E♭ major.', he: 'לצליל אין משמעות לבד: הסולם נותן לו תפקיד. סי במול הוא 1 בסי במול מז׳ור, ו־5 במי במול מז׳ור.' },
    steps: [
      {
        say: { en: 'Hey {name}! Here is a secret of ear training: a note on its own has no job. The key around it gives it one. Meet our note — B-flat.', he: 'היי {name}! הנה סוד קטן של פיתוח שמיעה: לצליל לבד אין תפקיד. הסולם שסביבו נותן לו תפקיד. תכירו את הצליל שלנו — סי במול.' },
        play: [note(70, 1.6)],
        show: { notes: [70], text: { en: 'B♭', he: 'סי במול' } },
      },
      {
        say: { en: 'Now chords in B-flat major, then the same B-flat. It sounds like home: settled, nothing wants to move. That is 1.', he: 'עכשיו אקורדים בסי במול מז׳ור, ואז אותו סי במול. הוא נשמע כמו בית: רגוע, שום דבר לא רוצה לזוז. זה 1.' },
        play: [cad(Bb), note(70, 1.8)],
        show: { notes: [70], key: 'Bb', text: { en: 'B♭ major: B♭ = 1', he: 'סי במול מז׳ור: סי במול = 1' } },
      },
      {
        say: { en: 'Now the chords move to E-flat major. Same B-flat, same piano — but now it floats, open and waiting. That is 5.', he: 'עכשיו האקורדים עוברים למי במול מז׳ור. אותו סי במול, אותו פסנתר — אבל עכשיו הוא מרחף, פתוח ומחכה. זה 5.' },
        play: [cad(Eb), note(70, 1.8)],
        show: { notes: [70], key: 'Eb', text: { en: 'E♭ major: B♭ = 5', he: 'מי במול מז׳ור: סי במול = 5' } },
      },
      {
        say: { en: 'Why 5? Count up the E-flat major scale: E-flat, F, G, A-flat, B-flat. The fifth note from home.', he: 'למה 5? סופרים למעלה בסולם מי במול מז׳ור: מי במול, פה, סול, לה במול, סי במול. הצליל החמישי מהבית.' },
        play: [notes([63, 65, 67, 68, 70], 0.55)],
        show: { notes: [63, 65, 67, 68, 70], key: 'Eb', text: { en: 'E♭ F G A♭ B♭ = 1 2 3 4 5', he: '1 2 3 4 5' } },
      },
      {
        say: { en: 'And 5 loves to go home. Listen to it land on E-flat — ahh, relief.', he: 'ו־5 אוהב לחזור הביתה. הקשיבו איך הוא נוחת על מי במול — אהה, הקלה.' },
        play: [cad(Eb), note(70, 1.2), { kind: 'resolve', fromMidi: 70, toMidi: 75 }],
        show: { notes: [70, 75], key: 'Eb', text: { en: '5 → 1', he: '5 → 1' } },
      },
      {
        say: { en: 'Your turn! I play the chords, then this same B-flat. Tell me "one" or "five". Trust the feeling — resting is 1, floating is 5.', he: 'תורכם! אני מנגן את האקורדים, ואז את אותו סי במול. תגידו "אחת" או "חמש". סמכו על התחושה — מנוחה זה 1, ריחוף זה 5.' },
        play: [cad(Bb), note(70, 1.4)],
        show: { notes: [70], text: { en: '1 or 5?', he: '1 או 5?' } },
      },
    ],
    more: [
      {
        say: { en: 'A degree describes a note’s job in a key, not its pitch. In B-flat major, B-flat is the tonic, 1. In E-flat major it is the dominant, 5. Same pitch; only the context changes.', he: 'דרגה מתארת את התפקיד של צליל בסולם, לא את הגובה שלו. בסי במול מז׳ור, סי במול הוא הטוניקה, 1. במי במול מז׳ור הוא הדומיננטה, 5. אותו גובה בדיוק; רק ההקשר משתנה.' },
        play: [cad(Bb), note(70, 1.4), cad(Eb), note(70, 1.4)],
        show: { notes: [70], text: { en: 'B♭ = 1 · B♭ = 5', he: 'סי במול = 1 · סי במול = 5' } },
      },
      {
        say: { en: 'Why does 1 feel like rest? It is the root of the home chord, the chord every cadence ends on. In B-flat major that chord is B-flat, D, F.', he: 'למה 1 מרגיש כמו מנוחה? הוא השורש של אקורד הבית, האקורד שכל קדנצה נגמרת בו. בסי במול מז׳ור האקורד הזה הוא סי במול, רה, פה.' },
        play: [chord([58, 62, 65], 1.2, true), chord([46, 58, 62, 65], 1.6)],
        show: { notes: [58, 62, 65], chord: true, key: 'Bb', text: { en: 'B♭ – D – F = 1 3 5', he: 'סי במול – רה – פה = 1 3 5' } },
      },
      {
        say: { en: '5 is also in the home chord, so it is stable — but it is the root of the V chord too, the chord that pulls home. In E-flat: E-flat chord, B-flat 7, E-flat chord.', he: 'גם 5 נמצא באקורד הבית, ולכן הוא יציב — אבל הוא גם השורש של אקורד V, האקורד שמושך הביתה. במי במול: אקורד מי במול, סי במול 7, אקורד מי במול.' },
        play: [chord([51, 63, 67, 70], 1.0), chord([46, 62, 65, 68], 1.0), chord([51, 63, 67, 70], 1.5)],
        show: { notes: [63, 67, 70], chord: true, key: 'Eb', text: { en: 'E♭ – B♭7 – E♭', he: 'E♭ – B♭7 – E♭' } },
      },
      {
        say: { en: 'A listening strategy: after the chords, sing home. If home is the very note you hear, it is 1. If you have to walk down 5, 4, 3, 2, 1 to reach home, it is 5.', he: 'אסטרטגיית האזנה: אחרי האקורדים, שירו את הבית. אם הבית הוא בדיוק הצליל ששמעתם, זה 1. אם צריך לרדת 5, 4, 3, 2, 1 כדי להגיע הביתה, זה 5.' },
        play: [cad(Eb), note(70, 1.0), notes([70, 68, 67, 65, 63], 0.5)],
        show: { notes: [70, 68, 67, 65, 63], key: 'Eb', text: { en: '5 4 3 2 1', he: '5 4 3 2 1' } },
      },
      {
        say: { en: 'The common mistake is judging by height: high means 5, low means 1. But the degree ignores the octave. This low B-flat is still 5 in E-flat major.', he: 'הטעות הנפוצה היא לשפוט לפי הגובה: גבוה זה 5, נמוך זה 1. אבל הדרגה לא תלויה באוקטבה. הסי במול הנמוך הזה הוא עדיין 5 במי במול מז׳ור.' },
        play: [cad(Eb), note(58, 1.6)],
        show: { notes: [58], key: 'Eb', text: { en: 'low, still 5', he: 'נמוך, ועדיין 5' } },
      },
      {
        say: { en: 'In real music this happens all the time. A note shared by two chords — a common tone — can stay put while the harmony moves, quietly changing its job. Hear B-flat on top, from B-flat major to E-flat major.', he: 'במוזיקה אמיתית זה קורה כל הזמן. צליל משותף לשני אקורדים יכול להישאר במקום בזמן שההרמוניה זזה, ולהחליף תפקיד בשקט. שמעו את הסי במול למעלה, מסי במול מז׳ור למי במול מז׳ור.' },
        play: [chord([46, 62, 65, 70], 1.4), chord([51, 63, 67, 70], 1.8)],
        show: { notes: [70], text: { en: 'common tone: 1 → 5', he: 'צליל משותף: 1 → 5' } },
      },
      {
        say: { en: 'Recap: a note gets its degree from the key, not from itself. Hear the chords, find home, then measure the note from home.', he: 'לסיכום: צליל מקבל את הדרגה שלו מהסולם, לא מעצמו. שומעים את האקורדים, מוצאים את הבית, ומודדים את הצליל ממנו.' },
        show: { text: { en: 'key → home → degree', he: 'סולם → בית → דרגה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 3. Major or minor?
  {
    id: 'major-minor',
    area: 'harmony',
    emoji: '🌗',
    title: { en: 'Major or minor?', he: 'מז׳ור או מינור?' },
    takeaway: { en: 'Major and minor chords differ by one note: the middle one. Major third = bright, minor third = dark.', he: 'אקורד מז׳ור ומינור נבדלים בצליל אחד: האמצעי. טרצה גדולה = בהיר, טרצה קטנה = כהה.' },
    steps: [
      {
        say: { en: 'Hi {name}! A basic chord has three notes: a root, a middle note, and a fifth on top. Here is C major — bright and sunny.', he: 'היי {name}! לאקורד בסיסי יש שלושה צלילים: שורש, צליל אמצעי, וקווינטה למעלה. הנה דו מז׳ור — בהיר ושמשי.' },
        play: [chord([60, 64, 67], 1.4, true), chord([48, 60, 64, 67], 1.6)],
        show: { notes: [60, 64, 67], chord: true, key: 'C', text: { en: 'C – E – G', he: 'דו – מי – סול' } },
      },
      {
        say: { en: 'Now lower just the middle note by a half step: E becomes E-flat. That is C minor — darker, softer, a little sad.', he: 'עכשיו מורידים רק את הצליל האמצעי בחצי טון: מי הופך למי במול. זה דו מינור — כהה יותר, רך יותר, קצת עצוב.' },
        play: [chord([60, 63, 67], 1.4, true), chord([48, 60, 63, 67], 1.6)],
        show: { notes: [60, 63, 67], chord: true, key: 'C', text: { en: 'C – E♭ – G', he: 'דו – מי במול – סול' } },
      },
      {
        say: { en: 'Only one note moves! The root and the fifth stay put. Hear the light switch off and on: major, minor, major.', he: 'רק צליל אחד זז! השורש והקווינטה נשארים במקום. שמעו איך האור נכבה ונדלק: מז׳ור, מינור, מז׳ור.' },
        play: [chord([60, 64, 67], 1.2), chord([60, 63, 67], 1.2), chord([60, 64, 67], 1.4)],
        show: { notes: [63, 64], text: { en: 'E ↔ E♭', he: 'מי ↔ מי במול' } },
      },
      {
        say: { en: 'That middle note is a third above the root. Four half steps make a major third; three make a minor third. That is where the names come from.', he: 'הצליל האמצעי נמצא טרצה מעל השורש. ארבעה חצאי טונים זו טרצה גדולה; שלושה זו טרצה קטנה. משם מגיעים השמות.' },
        play: [notes([60, 64], 0.8), rest(0.3), notes([60, 63], 0.8)],
        show: { notes: [60, 63, 64], text: { en: '4 = major · 3 = minor', he: '4 = מז׳ור · 3 = מינור' } },
      },
      {
        say: { en: 'The root will change every round, but the color does not. Here is G major, then G minor.', he: 'השורש ישתנה בכל סיבוב, אבל הצבע לא. הנה סול מז׳ור, ואז סול מינור.' },
        play: [chord([55, 59, 62], 1.4), rest(0.3), chord([55, 58, 62], 1.6)],
        show: { notes: [55, 58, 59, 62], text: { en: 'G → Gm', he: 'סול → סול מינור' } },
      },
      {
        say: { en: 'Your turn! I play a chord, you say "major" or "minor". Not sure? Hum the middle note: smiling means major, shaded means minor.', he: 'תורכם! אני מנגן אקורד, ואתם אומרים "מז׳ור" או "מינור". לא בטוחים? זמזמו את הצליל האמצעי: חיוך זה מז׳ור, צל זה מינור.' },
        show: { text: { en: 'major or minor?', he: 'מז׳ור או מינור?' } },
      },
    ],
    more: [
      {
        say: { en: 'A triad is two thirds stacked. Major: a major third (4 half steps), then a minor third (3). Minor: the reverse, 3 then 4. Both span a perfect fifth, 7 half steps, from root to top.', he: 'טריאדה היא שתי טרצות זו על זו. מז׳ור: טרצה גדולה (4 חצאי טונים), ואז טרצה קטנה (3). מינור: הפוך, 3 ואז 4. בשניהם יש קווינטה זכה, 7 חצאי טונים, מהשורש עד הצליל העליון.' },
        play: [chord([60, 64, 67], 1.3, true), rest(0.3), chord([60, 63, 67], 1.3, true)],
        show: { notes: [60, 63, 64, 67], text: { en: '4 + 3 = major · 3 + 4 = minor', he: '4 + 3 = מז׳ור · 3 + 4 = מינור' } },
      },
      {
        say: { en: 'Spell them with letters. D major is D, F-sharp, A; D minor is D, F, A. A major is A, C-sharp, E; A minor is A, C, E.', he: 'מאייתים אותם באותיות. רה מז׳ור הוא רה, פה דיאז, לה; רה מינור הוא רה, פה, לה. לה מז׳ור הוא לה, דו דיאז, מי; לה מינור הוא לה, דו, מי.' },
        play: [chord([62, 66, 69], 1.2), chord([62, 65, 69], 1.4)],
        show: { notes: [62, 65, 66, 69], text: { en: 'D–F♯–A · D–F–A', he: 'רה–פה♯–לה · רה–פה–לה' } },
      },
      {
        say: { en: 'Inside a major key, chords I, IV and V are major; ii, iii and vi are minor. In C: C, F and G major; D minor, E minor and A minor.', he: 'בתוך סולם מז׳ור, האקורדים I, IV ו־V הם מז׳ור; ii, iii ו־vi הם מינור. בדו: דו, פה וסול מז׳ור; רה מינור, מי מינור ולה מינור.' },
        play: [{ kind: 'phrase', key: C, chords: ['I', 'ii', 'iii', 'IV', 'V', 'vi'] }],
        show: { text: { en: 'I ii iii IV V vi', he: 'I ii iii IV V vi' } },
      },
      {
        say: { en: 'The common mistake: calling quiet, slow or low chords minor and loud, high ones major. Register and mood do not decide; only the third does. Here is a low G major, then a high E minor.', he: 'הטעות הנפוצה: לקרוא לאקורד שקט, איטי או נמוך מינור, ולאקורד חזק וגבוה מז׳ור. הרגיסטר ומצב הרוח לא קובעים; רק הטרצה. הנה סול מז׳ור נמוך, ואז מי מינור גבוה.' },
        play: [chord([43, 47, 50], 1.6), rest(0.3), chord([76, 79, 83], 1.2)],
        show: { notes: [43, 47, 50, 76, 79, 83], text: { en: 'G (major) · Em (minor)', he: 'G (מז׳ור) · Em (מינור)' } },
      },
      {
        say: { en: 'A listening tip: sing the chord back from the bottom, 1, 3, 5, and focus on the step from 1 to 3. A wide, open step is major; a narrow one is minor.', he: 'טיפ להאזנה: שירו את האקורד מלמטה, 1, 3, 5, והתמקדו בצעד מ־1 ל־3. צעד רחב ופתוח זה מז׳ור; צעד צר זה מינור.' },
        play: [chord([57, 60, 64], 1.4), notes([57, 60, 64], 0.6)],
        show: { notes: [57, 60, 64], text: { en: 'A – C – E = minor', he: 'לה – דו – מי = מינור' } },
      },
      {
        say: { en: 'In real songs the two colors alternate constantly. The pop progression I, V, vi, IV moves from major chords to the minor vi and back.', he: 'בשירים אמיתיים שני הצבעים מתחלפים כל הזמן. מהלך הפופ I, V, vi, IV עובר מאקורדי מז׳ור אל vi המינורי וחוזר.' },
        play: [{ kind: 'phrase', key: G, chords: ['I', 'V', 'vi', 'IV'] }],
        show: { text: { en: 'I – V – vi – IV', he: 'I – V – vi – IV' } },
      },
      {
        say: { en: 'Two more triads exist. Diminished stacks two minor thirds and sounds tense; augmented stacks two major thirds and sounds unsettled. You will meet them later.', he: 'יש עוד שתי טריאדות. מוקטן בנוי משתי טרצות קטנות ונשמע מתוח; מוגדל בנוי משתי טרצות גדולות ונשמע לא יציב. תפגשו אותם בהמשך.' },
        play: [chord([59, 62, 65], 1.3), rest(0.3), chord([60, 64, 68], 1.4)],
        show: { notes: [59, 62, 65, 68], text: { en: 'B° · C+', he: 'B° · C+' } },
      },
      {
        say: { en: 'Recap: same root, same fifth — the third decides. Four half steps above the root is major, three is minor.', he: 'לסיכום: אותו שורש, אותה קווינטה — הטרצה מכריעה. ארבעה חצאי טונים מעל השורש זה מז׳ור, שלושה זה מינור.' },
        show: { text: { en: '3rd: 4 = major · 3 = minor', he: 'טרצה: 4 = מז׳ור · 3 = מינור' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 4. Cadence detective
  {
    id: 'cadences',
    area: 'harmony',
    emoji: '🕵️',
    title: { en: 'Cadence detective', he: 'בלש הסיומות' },
    takeaway: { en: 'A phrase that ends V → I is resolved, like a full stop; one that stops on V is open, like a question.', he: 'משפט שנגמר ב־V → I הוא נפתר, כמו נקודה; משפט שנעצר על V הוא פתוח, כמו שאלה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Music talks in sentences called phrases. The chords at the end are the punctuation — we call that a cadence.', he: 'היי {name}! מוזיקה מדברת במשפטים. האקורדים בסוף הם סימני הפיסוק — לזה קוראים קדנצה.' },
        show: { text: { en: 'cadence = musical punctuation', he: 'קדנצה = סימן פיסוק מוזיקלי' } },
      },
      {
        say: { en: 'This phrase ends with five going to one: V7, then I. It comes home, like a full stop. We call it resolved.', he: 'המשפט הזה נגמר בחמש שהולך לאחת: V7, ואז I. הוא חוזר הביתה, כמו נקודה. קוראים לזה נפתר.' },
        play: [{ kind: 'phrase', key: C, chords: ['I', 'IV', 'V7', 'I'] }],
        show: { text: { en: 'I – IV – V7 – I .', he: 'I – IV – V7 – I .' } },
      },
      {
        say: { en: 'This one stops on V, the five chord. It hangs in the air, like a question mark. We call it open.', he: 'כאן הוא נעצר על V, אקורד החמש. הוא נשאר תלוי באוויר, כמו סימן שאלה. קוראים לזה פתוח.' },
        play: [{ kind: 'phrase', key: C, chords: ['I', 'vi', 'IV', 'V'] }],
        show: { text: { en: 'I – vi – IV – V ?', he: 'I – vi – IV – V ?' } },
      },
      {
        say: { en: 'Only the ending matters. Skip the middle and judge the very last chord: does it rest, or lean forward? Here are just the two endings.', he: 'רק הסוף חשוב. דלגו על האמצע ושפטו את האקורד האחרון: הוא נח, או נשען קדימה? הנה רק שני הסופים.' },
        play: [{ kind: 'phrase', key: C, chords: ['V7', 'I'] }, rest(0.5), { kind: 'phrase', key: C, chords: ['IV', 'V'] }],
        show: { text: { en: 'V7 → I .   IV → V ?', he: 'V7 → I .   IV → V ?' } },
      },
      {
        say: { en: 'A test that never fails: when it stops, do you want to sing home? Listen — this open phrase is begging for it.', he: 'מבחן שתמיד עובד: כשהמשפט נעצר, בא לכם לשיר את הבית? הקשיבו — המשפט הפתוח הזה ממש מתחנן לזה.' },
        play: [{ kind: 'phrase', key: G, chords: ['I', 'vi', 'IV', 'V'] }, rest(0.4), note(67, 1.6)],
        show: { notes: [67], key: 'G', text: { en: '? → home', he: '? → בית' } },
      },
      {
        say: { en: 'Your turn, detective! The key changes each round, so listen to the whole phrase and tell me "resolved" or "open". The last chord is your clue.', he: 'תורכם, בלשים! הסולם משתנה בכל סיבוב, אז הקשיבו לכל המשפט ותגידו "נפתר" או "פתוח". האקורד האחרון הוא הרמז.' },
        play: [{ kind: 'phrase', key: F, chords: ['I', 'IV', 'V7', 'I'] }],
        show: { text: { en: 'resolved or open?', he: 'נפתר או פתוח?' } },
      },
    ],
    more: [
      {
        say: { en: 'A cadence is the harmonic ending of a phrase. The authentic cadence, V to I, closes it. The half cadence stops on V and leaves it open.', he: 'קדנצה היא הסיום ההרמוני של משפט. הקדנצה האותנטית, V ל־I, סוגרת אותו. חצי קדנצה נעצרת על V ומשאירה אותו פתוח.' },
        play: [{ kind: 'phrase', key: C, chords: ['IV', 'V7', 'I'] }, rest(0.4), { kind: 'phrase', key: C, chords: ['I', 'IV', 'V'] }],
        show: { text: { en: 'V → I .   … → V ?', he: 'V → I .   … → V ?' } },
      },
      {
        say: { en: 'Why does V pull to I? In C, the G7 chord holds B, the leading tone, a half step below C. Its F leans down to E. Both tensions resolve at once.', he: 'למה V מושך ל־I? בדו, באקורד G7 יש סי — הצליל המוביל, חצי טון מתחת לדו. והפה שלו נשען למטה אל מי. שני המתחים נפתרים בבת אחת.' },
        play: [chord([43, 59, 62, 65], 1.3), chord([48, 60, 64, 67], 1.8)],
        show: { notes: [59, 65, 60, 64], text: { en: 'B → C · F → E', he: 'סי → דו · פה → מי' } },
      },
      {
        say: { en: 'A gentler close is the plagal cadence, IV to I — the “Amen” at the end of many hymns. It resolves, but without the leading tone’s pull.', he: 'סיום רך יותר הוא הקדנצה הפלגאלית, IV ל־I — ה"אמן" בסוף הרבה מזמורים כנסייתיים. היא נפתרת, אבל בלי המשיכה של הצליל המוביל.' },
        play: [{ kind: 'phrase', key: F, chords: ['I', 'IV', 'I'] }],
        show: { text: { en: 'IV → I', he: 'IV → I' } },
      },
      {
        say: { en: 'The deceptive cadence sets up V, then lands on vi instead of I. It sounds like a surprise turn: the phrase is not finished yet.', he: 'הקדנצה המטעה מכינה V, ואז נוחתת על vi במקום על I. זה נשמע כמו תפנית מפתיעה: המשפט עוד לא נגמר.' },
        play: [{ kind: 'phrase', key: C, chords: ['I', 'IV', 'V7', 'vi'] }],
        show: { text: { en: 'V7 → vi !', he: 'V7 → vi !' } },
      },
      {
        say: { en: 'A listening strategy: when the music stops, sing home. If your note sits comfortably in the last chord, the phrase is closed. If it rubs, the ending is open.', he: 'אסטרטגיית האזנה: כשהמוזיקה נעצרת, שירו את הבית. אם הצליל שלכם יושב בנוחות בתוך האקורד האחרון, המשפט סגור. אם הוא מתחכך, הסיום פתוח.' },
        play: [{ kind: 'phrase', key: G, chords: ['I', 'IV', 'V'] }, note(55, 1.6)],
        show: { notes: [55], key: 'G', text: { en: 'home vs. V = open', he: 'בית מול V = פתוח' } },
      },
      {
        say: { en: 'The common mistake: hearing a half cadence as closed because V is a bright major chord. On its own it sounds stable; in the key it wants I. Judge the last chord against the key, not by itself.', he: 'הטעות הנפוצה: לשמוע חצי קדנצה כסגורה כי V הוא אקורד מז׳ור בהיר. לבד הוא נשמע יציב; בתוך הסולם הוא רוצה את I. שפטו את האקורד האחרון ביחס לסולם, לא לבד.' },
        play: [{ kind: 'phrase', key: D, chords: ['I', 'vi', 'ii', 'V'] }],
        show: { text: { en: 'I – vi – ii – V ?', he: 'I – vi – ii – V ?' } },
      },
      {
        say: { en: 'In real music, phrases often come in pairs: the first ends with a half cadence, like a question, the second with an authentic cadence, like the answer. This pair is called a period.', he: 'במוזיקה אמיתית משפטים מגיעים הרבה פעמים בזוגות: הראשון נגמר בחצי קדנצה, כמו שאלה, והשני בקדנצה אותנטית, כמו תשובה. הזוג הזה נקרא פריודה.' },
        play: [{ kind: 'phrase', key: C, chords: ['I', 'IV', 'V'] }, rest(0.4), { kind: 'phrase', key: C, chords: ['I', 'V7', 'I'] }],
        show: { text: { en: 'question ? · answer .', he: 'שאלה ? · תשובה .' } },
      },
      {
        say: { en: 'Recap: V to I is a full stop; stopping on V is a question mark. IV to I closes gently, and V to vi is a surprise.', he: 'לסיכום: V ל־I הוא נקודה; עצירה על V היא סימן שאלה. IV ל־I סוגר ברכות, ו־V ל־vi הוא הפתעה.' },
        show: { text: { en: 'V→I . · →V ? · IV→I · V→vi', he: 'V→I . · →V ? · IV→I · V→vi' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 5. Sing home & five
  {
    id: 'sing-home-five',
    area: 'voice',
    emoji: '🎤',
    title: { en: 'Sing home & five', he: 'לשיר את הבית ואת החמש' },
    takeaway: { en: 'Hear the key, find home (1) with your voice, and reach 5 by climbing do-re-mi-fa-sol.', he: 'שומעים את הסולם, מוצאים את הבית (1) בקול, ומגיעים ל־5 בטיפוס דו־רה־מי־פה־סול.' },
    steps: [
      {
        say: { en: 'Hi {name}! Time for your own instrument — your voice. First I play the key, then its home note. Listen.', he: 'היי {name}! הגיע הזמן לכלי שלכם — הקול. קודם אני מנגן את הסולם, ואז את צליל הבית שלו. הקשיבו.' },
        play: [cad(C), note(60, 1.6)],
        show: { notes: [60], key: 'C', text: { en: '1 = home', he: '1 = בית' } },
      },
      {
        say: { en: 'Singing home is simple: hum the very note you just heard. Match it, hold it, mmm.', he: 'לשיר את הבית זה פשוט: זמזמו בדיוק את הצליל ששמעתם. התאימו, החזיקו, מממ.' },
        play: [note(60, 2.2)],
        show: { notes: [60], text: { en: 'mmm…', he: 'מממ…' } },
      },
      {
        say: { en: 'Five is the fifth note of the scale: do, re, mi, fa, sol. Climb there and stop.', he: 'חמש זה הצליל החמישי בסולם: דו, רה, מי, פה, סול. מטפסים לשם ועוצרים.' },
        play: [notes([60, 62, 64, 65, 67], 0.5), note(67, 1.2)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: 'do re mi fa SOL', he: 'דו רה מי פה סול' } },
      },
      {
        say: { en: 'A shortcut: it is the jump in "Twinkle, Twinkle". Twin-kle, twin-kle — from 1 up to 5.', he: 'קיצור דרך: זו הקפיצה ב"כוכב קטן". 1, 1, ואז קפיצה ל־5.' },
        play: [melody([60, 60, 67, 67], [1, 1, 1, 1])],
        show: { notes: [60, 60, 67, 67], key: 'C', text: { en: '1 1 5 5', he: '1 1 5 5' } },
      },
      {
        say: { en: 'While you sing, the screen shows your pitch live. Too low? Slide up a little. Too high? Ease down. Any octave counts.', he: 'בזמן שאתם שרים, המסך מראה את גובה הצליל שלכם בזמן אמת. נמוך מדי? החליקו קצת למעלה. גבוה מדי? רדו בעדינות. כל אוקטבה נחשבת.' },
        play: [cad(G), notes([55, 62], 1.1)],
        show: { notes: [55, 62], key: 'G', text: { en: 'G: 1 → 5', he: 'סול: 1 → 5' } },
      },
      {
        say: { en: 'Your turn. Hear the key and home, wait for the chime, then sing what I ask: home, or five. Breathe low and keep your jaw relaxed.', he: 'תורכם. שומעים את הסולם ואת הבית, מחכים לצליל, ושרים מה שאבקש: את הבית, או את החמש. נשימה נמוכה ולסת רפויה.' },
        show: { text: { en: '1 or 5 — sing it!', he: '1 או 5 — שירו!' } },
      },
    ],
    more: [
      {
        say: { en: '1 is the tonic, the note the key is named after. 5 is the dominant, a perfect fifth above: seven half steps. Together they frame the key, and most melodies lean on them.', he: '1 הוא הטוניקה, הצליל שעל שמו נקרא הסולם. 5 הוא הדומיננטה, קווינטה זכה מעליו: שבעה חצאי טונים. יחד הם מסגרים את הסולם, ורוב המנגינות נשענות עליהם.' },
        play: [cad(C), notes([60, 67], 0.9)],
        show: { notes: [60, 67], key: 'C', text: { en: 'C → G = 7 half steps', he: 'דו → סול = 7 חצאי טונים' } },
      },
      {
        say: { en: '5 also lives below home: a perfect fourth down, five half steps. Same degree, another octave. Sing whichever sits comfortably in your voice.', he: '5 נמצא גם מתחת לבית: קוורטה זכה למטה, חמישה חצאי טונים. אותה דרגה, אוקטבה אחרת. שירו את מה שנוח לקול שלכם.' },
        play: [cad(C), notes([60, 55], 0.9)],
        show: { notes: [60, 55], key: 'C', text: { en: '1 → 5 below', he: '1 → 5 למטה' } },
      },
      {
        say: { en: 'To find home, let the chords finish and hum the note that feels like rest. Hold it until nothing in you wants to move.', he: 'כדי למצוא את הבית, תנו לאקורדים להסתיים וזמזמו את הצליל שמרגיש כמו מנוחה. החזיקו אותו עד שכלום בפנים לא רוצה לזוז.' },
        play: [cad(F), note(65, 2.0)],
        show: { notes: [65], key: 'F', text: { en: 'F major: 1 = F', he: 'פה מז׳ור: 1 = פה' } },
      },
      {
        say: { en: 'To reach 5, climb the scale: do, re, mi, fa, sol — aloud at first, later silently. With practice you jump straight there, using the opening leap of “Twinkle, Twinkle” as your anchor.', he: 'כדי להגיע ל־5, מטפסים בסולם: דו, רה, מי, פה, סול — בהתחלה בקול, אחר כך בשקט. עם תרגול קופצים ישר, ונעזרים בקפיצה של "כוכב קטן" כעוגן.' },
        play: [cad(D), notes([62, 64, 66, 67, 69], 0.45), note(69, 1.2)],
        show: { notes: [62, 64, 66, 67, 69], key: 'D', text: { en: 'D E F♯ G A = 1 2 3 4 5', he: '1 2 3 4 5' } },
      },
      {
        say: { en: 'Pitch starts in the body. Breathe low, keep the jaw loose, and sing on a soft “mm” or “oo”. Start the note gently on pitch instead of scooping up into it.', he: 'דיוק בגובה מתחיל בגוף. נשימה נמוכה, לסת רפויה, ושירה על "מממ" או "או" רכים. התחילו את הצליל בעדינות ישר בגובה, במקום להחליק אליו מלמטה.' },
        show: { text: { en: 'low breath · loose jaw · “oo”', he: 'נשימה נמוכה · לסת רפויה · "או"' } },
      },
      {
        say: { en: 'The common mistake is landing on 4 or 6 instead of 5. To check, sing down from your note: 5, 4, 3, 2, 1. If you end on home, you were right.', he: 'הטעות הנפוצה היא לנחות על 4 או 6 במקום על 5. כדי לבדוק, שירו למטה מהצליל שלכם: 5, 4, 3, 2, 1. אם הגעתם לבית, צדקתם.' },
        play: [cad(C), notes([67, 65, 64, 62, 60], 0.5)],
        show: { notes: [67, 65, 64, 62, 60], key: 'C', text: { en: '5 4 3 2 1', he: '5 4 3 2 1' } },
      },
      {
        say: { en: 'In real music, 1 and 5 are the backbone of bass lines. In country, polka and many folk songs, the bass simply alternates root and fifth.', he: 'במוזיקה אמיתית, 1 ו־5 הם עמוד השדרה של קווי הבס. בקאנטרי, בפולקה ובהרבה שירי עם, הבס פשוט מתחלף בין השורש לקווינטה.' },
        play: [melody([48, 43, 48, 43, 48, 43, 48], [1, 1, 1, 1, 1, 1, 2], 110)],
        show: { notes: [48, 43, 48, 43], key: 'C', clef: 'bass', text: { en: '1 5 1 5', he: '1 5 1 5' } },
      },
      {
        say: { en: 'Recap: hear the key, settle on 1, then find 5 — seven half steps up, or five down.', he: 'לסיכום: שומעים את הסולם, נוחתים על 1, ומוצאים את 5 — שבעה חצאי טונים למעלה, או חמישה למטה.' },
        show: { notes: [55, 60, 67], key: 'C', text: { en: '5 · 1 · 5', he: '5 · 1 · 5' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 6. Thirds, fifths, octaves
  {
    id: 'intervals',
    area: 'ear',
    emoji: '📏',
    title: { en: 'Thirds, fifths, octaves', he: 'מרווחים: כמה רחוק?' },
    takeaway: { en: 'Major third = 4 half steps, sweet; perfect fifth = 7, open and hollow; octave = 12, the same note higher.', he: 'טרצה גדולה = 4 חצאי טונים, מתוקה; קווינטה זכה = 7, פתוחה וחלולה; אוקטבה = 12, אותו צליל גבוה יותר.' },
    steps: [
      {
        say: { en: 'Hey {name}! An interval is the distance between two notes. Today you meet three big ones: the third, the fifth and the octave.', he: 'היי {name}! מרווח הוא המרחק בין שני צלילים. היום תכירו שלושה חשובים: הטרצה, הקווינטה והאוקטבה.' },
        play: [notes([60, 64, 67, 72], 0.6)],
        show: { notes: [60, 64, 67, 72], key: 'C', text: { en: 'C → E · G · C', he: 'דו → מי · סול · דו' } },
      },
      {
        say: { en: 'A major third: four half steps, like C to E. Close and sweet — the bottom of a major chord.', he: 'טרצה גדולה: ארבעה חצאי טונים, כמו דו עד מי. קרובה ומתוקה — הבסיס של אקורד מז׳ור.' },
        play: [notes([60, 64], 0.8), chord([60, 64], 1.4)],
        show: { notes: [60, 64], key: 'C', text: { en: 'third = 4', he: 'טרצה = 4' } },
      },
      {
        say: { en: 'A perfect fifth: seven half steps, C to G. Open and strong, like a horn call. It is the leap in "Twinkle, Twinkle".', he: 'קווינטה זכה: שבעה חצאי טונים, דו עד סול. פתוחה וחזקה, כמו תרועת קרן. זו הקפיצה ב"כוכב קטן".' },
        play: [notes([60, 67], 0.8), chord([60, 67], 1.4)],
        show: { notes: [60, 67], key: 'C', text: { en: 'fifth = 7', he: 'קווינטה = 7' } },
      },
      {
        say: { en: 'An octave: twelve half steps, C to the next C. Same name, just higher — the two almost melt into one.', he: 'אוקטבה: שנים־עשר חצאי טונים, מדו לדו הבא. אותו שם, רק גבוה יותר — השניים כמעט מתמזגים לצליל אחד.' },
        play: [notes([60, 72], 0.8), chord([60, 72], 1.4)],
        show: { notes: [60, 72], key: 'C', text: { en: 'octave = 12', he: 'אוקטבה = 12' } },
      },
      {
        say: { en: 'Together is trickier, so listen to the blend: the third is warm and full, the fifth hollow, the octave nearly one note.', he: 'ביחד זה קשה יותר, אז הקשיבו לתערובת: הטרצה חמה ומלאה, הקווינטה חלולה, והאוקטבה כמעט צליל אחד.' },
        play: [chord([60, 64], 1.3), chord([60, 67], 1.3), chord([60, 72], 1.5)],
        show: { notes: [60, 64, 67, 72], text: { en: 'warm · hollow · one', he: 'חמה · חלולה · אחד' } },
      },
      {
        say: { en: 'Your turn. First the notes come one after the other, then together. Say "third", "fifth" or "octave".', he: 'תורכם. קודם הצלילים מגיעים בזה אחר זה, ואז ביחד. תגידו "טרצה", "קווינטה" או "אוקטבה".' },
        play: [notes([57, 64], 0.9)],
        show: { text: { en: 'third, fifth or octave?', he: 'טרצה, קווינטה או אוקטבה?' } },
      },
    ],
    more: [
      {
        say: { en: 'An interval has a number and a quality. The number counts letter names, both ends included: C to E spans C, D, E — a third. C to G spans five letters — a fifth.', he: 'למרווח יש מספר ואיכות. המספר סופר שמות תווים, כולל שני הקצוות: מדו למי עוברים דו, רה, מי — טרצה. מדו לסול יש חמישה תווים — קווינטה.' },
        play: [notes([60, 62, 64], 0.5), rest(0.3), notes([60, 62, 64, 65, 67], 0.4)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: 'C D E = 3 · C…G = 5', he: 'דו רה מי = 3 · דו…סול = 5' } },
      },
      {
        say: { en: 'The quality refines the size. A third can be major, 4 half steps like C to E, or minor, 3 like C to E-flat. Fifths and octaves are called perfect: 7 and 12.', he: 'האיכות מדייקת את הגודל. טרצה יכולה להיות גדולה, 4 חצאי טונים כמו דו–מי, או קטנה, 3 כמו דו–מי במול. קווינטה ואוקטבה נקראות זכות: 7 ו־12.' },
        play: [chord([60, 64], 1.2), rest(0.3), chord([60, 63], 1.2)],
        show: { notes: [60, 63, 64], text: { en: 'M3 = 4 · m3 = 3', he: 'טרצה גדולה = 4 · קטנה = 3' } },
      },
      {
        say: { en: 'Played one after the other, an interval is melodic; together, it is harmonic. Melodic is easier at first; harmonic trains you to hear the blend.', he: 'כשהצלילים מתנגנים בזה אחר זה, המרווח מלודי; כשהם יחד, הוא הרמוני. מלודי קל יותר בהתחלה; הרמוני מאמן לשמוע את התערובת.' },
        play: [notes([62, 69], 0.8), chord([62, 69], 1.4)],
        show: { notes: [62, 69], text: { en: 'D – A: fifth', he: 'רה – לה: קווינטה' } },
      },
      {
        say: { en: 'Anchor each interval to a tune you know. The major third opens “When the Saints Go Marching In”. The fifth is “Twinkle, Twinkle”. The octave opens “Over the Rainbow”.', he: 'קשרו כל מרווח למנגינה מוכרת. הטרצה הגדולה פותחת את "When the Saints Go Marching In". הקווינטה היא "כוכב קטן". האוקטבה פותחת את "Over the Rainbow".' },
        play: [melody([60, 64, 65, 67], [1, 1, 1, 2]), rest(0.4), melody([60, 72], [2, 2])],
        show: { notes: [60, 64, 72], key: 'C', text: { en: '1→3 · 1→8', he: '1→3 · 1→8' } },
      },
      {
        say: { en: 'Intervals also go down. A falling fifth, G down to C, is the same size as C up to G — count the same way.', he: 'מרווחים הולכים גם למטה. קווינטה יורדת, מסול לדו, היא באותו גודל כמו מדו לסול — סופרים אותו דבר.' },
        play: [notes([67, 60], 0.9), rest(0.3), notes([60, 67], 0.9)],
        show: { notes: [60, 67], text: { en: 'G ↓ C = C ↑ G', he: 'סול ↓ דו = דו ↑ סול' } },
      },
      {
        say: { en: 'The common mistake is confusing the fifth and the octave, since both sound pure. In an octave you hear one note doubled; in a fifth, two clearly different notes.', he: 'הטעות הנפוצה היא לבלבל בין קווינטה לאוקטבה, כי שתיהן נשמעות נקיות. באוקטבה שומעים צליל אחד כפול; בקווינטה, שני צלילים שונים בבירור.' },
        play: [chord([57, 64], 1.4), rest(0.3), chord([57, 69], 1.4)],
        show: { notes: [57, 64, 69], text: { en: 'A–E (5th) · A–A (8ve)', he: 'לה–מי (קווינטה) · לה–לה (אוקטבה)' } },
      },
      {
        say: { en: 'In real music, the fifth is the rock power chord and the tuning of the violin’s strings. Thirds give harmony singing its sweetness: two voices a third apart.', he: 'במוזיקה אמיתית, הקווינטה היא אקורד הפאוור של הרוק והכיוון של מיתרי הכינור. הטרצות נותנות לשירה בהרמוניה את המתיקות שלה: שני קולות במרחק טרצה.' },
        play: [chord([40, 47, 52], 1.2), rest(0.3), chord([64, 67], 0.6), chord([65, 69], 0.6), chord([67, 71], 1.0)],
        show: { notes: [40, 47, 52], text: { en: 'E5 power chord · thirds', he: 'E5 אקורד פאוור · טרצות' } },
      },
      {
        say: { en: 'Recap: count letters for the number, half steps for the quality. Major third 4, perfect fifth 7, octave 12.', he: 'לסיכום: סופרים תווים בשביל המספר, וחצאי טונים בשביל האיכות. טרצה גדולה 4, קווינטה זכה 7, אוקטבה 12.' },
        show: { text: { en: '3rd = 4 · 5th = 7 · 8ve = 12', he: 'טרצה 4 · קווינטה 7 · אוקטבה 12' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 7. Which note is in the bass?
  {
    id: 'inversions',
    area: 'harmony',
    emoji: '🎸',
    title: { en: 'Which note is in the bass?', he: 'איזה צליל בבס?' },
    takeaway: { en: 'The same chord can stand on its root (C), its third (C/E) or its fifth (C/G): the lowest note changes the feel.', he: 'אותו אקורד יכול לעמוד על השורש (C), על הטרצה (C/E) או על הקווינטה (C/G): הצליל הנמוך משנה את התחושה.' },
    steps: [
      {
        say: { en: 'Hi {name}! A chord can stand on different feet. Its lowest note — the bass — changes how the whole chord feels.', he: 'היי {name}! אקורד יכול לעמוד על רגליים שונות. הצליל הנמוך שלו — הבס — משנה את התחושה של כל האקורד.' },
        show: { notes: [60, 64, 67], chord: true, text: { en: 'C = C – E – G', he: 'C = דו – מי – סול' } },
      },
      {
        say: { en: 'Bass on the root: C under a C chord. Solid and grounded, feet flat on the floor.', he: 'בס על השורש: דו מתחת לאקורד דו. יציב ומקורקע, רגליים על הרצפה.' },
        play: [note(48, 0.8), chord([48, 60, 64, 67], 1.8)],
        show: { notes: [48, 60, 64, 67], chord: true, text: { en: 'C — root', he: 'C — שורש' } },
      },
      {
        say: { en: 'Bass on the third: E under a C chord, written C slash E. Lighter, a bit restless — it wants to keep walking.', he: 'בס על הטרצה: מי מתחת לאקורד דו, נכתב C/E. קליל יותר, קצת חסר מנוחה — הוא רוצה להמשיך ללכת.' },
        play: [note(40, 0.8), chord([40, 60, 64, 67], 1.8)],
        show: { notes: [40, 60, 64, 67], chord: true, text: { en: 'C/E — third', he: 'C/E — טרצה' } },
      },
      {
        say: { en: 'Bass on the fifth: G under a C chord, C slash G. Strong but hovering, like it is waiting for something.', he: 'בס על הקווינטה: סול מתחת לאקורד דו, C/G. חזק אבל מרחף, כאילו הוא מחכה למשהו.' },
        play: [note(43, 0.8), chord([43, 60, 64, 67], 1.8)],
        show: { notes: [43, 60, 64, 67], chord: true, text: { en: 'C/G — fifth', he: 'C/G — קווינטה' } },
      },
      {
        say: { en: 'The trick: hum the lowest note, then find it in the chord. Here the bass is E — the middle note of C, E, G. So: third!', he: 'הטריק: זמזמו את הצליל הנמוך, ואז מצאו אותו באקורד. כאן הבס הוא מי — הצליל האמצעי של דו, מי, סול. כלומר: טרצה!' },
        play: [note(40, 1.0), rest(0.3), notes([60, 64, 67], 0.6)],
        show: { notes: [40, 60, 64, 67], text: { en: 'E = the middle note', he: 'מי = הצליל האמצעי' } },
      },
      {
        say: { en: 'Your turn! I play the bass alone, then the full chord. Tell me "root", "third" or "fifth". The chord changes, the question does not.', he: 'תורכם! אני מנגן את הבס לבד, ואז את כל האקורד. תגידו "שורש", "טרצה" או "קווינטה". האקורד משתנה, השאלה לא.' },
        show: { text: { en: 'root, third or fifth?', he: 'שורש, טרצה או קווינטה?' } },
      },
    ],
    more: [
      {
        say: { en: 'An inversion is a chord with a note other than the root in the bass. Root in the bass: root position. Third in the bass: first inversion. Fifth in the bass: second inversion.', he: 'היפוך הוא אקורד שבבס שלו יש צליל שאינו השורש. שורש בבס: מצב יסודי. טרצה בבס: היפוך ראשון. קווינטה בבס: היפוך שני.' },
        play: [chord([60, 64, 67], 1.1), chord([64, 67, 72], 1.1), chord([67, 72, 76], 1.3)],
        show: { notes: [60, 64, 67], chord: true, text: { en: 'C · C/E · C/G', he: 'C · C/E · C/G' } },
      },
      {
        say: { en: 'Pop and jazz charts write inversions as slash chords: the chord, a slash, then the bass note. G/B is a G chord over B, its third. F/C is F over C, its fifth.', he: 'בפופ ובג׳ז כותבים היפוכים כאקורדי סלאש: האקורד, קו נטוי, ואז צליל הבס. G/B הוא אקורד סול מעל סי, הטרצה שלו. F/C הוא פה מעל דו, הקווינטה שלו.' },
        play: [chord([47, 62, 67, 71], 1.4), rest(0.3), chord([48, 65, 69, 72], 1.4)],
        show: { notes: [47, 62, 67, 71], chord: true, text: { en: 'G/B · F/C', he: 'G/B · F/C' } },
      },
      {
        say: { en: 'Only the bass decides the name. The upper notes can come in any order and spacing: with E in the bass, both of these are C/E.', he: 'רק הבס קובע את השם. הצלילים העליונים יכולים להופיע בכל סדר ובכל מרווח: כשמי בבס, שני אלה הם C/E.' },
        play: [chord([40, 55, 60, 64], 1.4), rest(0.3), chord([40, 60, 67, 72], 1.4)],
        show: { notes: [40, 55, 60, 64], chord: true, text: { en: 'C/E = C/E', he: 'C/E = C/E' } },
      },
      {
        say: { en: 'Why use inversions? They let the bass move by step. C, then G/B, then A minor: the bass walks C, B, A — smooth instead of jumping.', he: 'למה להשתמש בהיפוכים? הם מאפשרים לבס לזוז בצעדים. C, אחריו G/B, ואז לה מינור: הבס הולך דו, סי, לה — חלק, בלי קפיצות.' },
        play: [chord([48, 64, 67, 72], 1.0), chord([47, 62, 67, 71], 1.0), chord([45, 64, 69, 72], 1.5)],
        show: { notes: [48, 47, 45], clef: 'bass', text: { en: 'C – G/B – Am', he: 'C – G/B – Am' } },
      },
      {
        say: { en: 'Each position has a typical role. Root position is stable and final. First inversion is lighter and moving. Second inversion is unstable: C/G before G7 at a cadence is the classic “cadential six-four”.', he: 'לכל מצב יש תפקיד אופייני. מצב יסודי יציב וסוגר. היפוך ראשון קליל ובתנועה. היפוך שני לא יציב: C/G לפני G7 בקדנצה הוא ה"קוורט־סקסט הקדנציאלי" הקלאסי.' },
        play: [chord([43, 60, 64, 67], 1.1), chord([43, 59, 62, 65], 1.1), chord([48, 60, 64, 67], 1.6)],
        show: { notes: [43, 60, 64, 67], chord: true, text: { en: 'C/G → G7 → C', he: 'C/G → G7 → C' } },
      },
      {
        say: { en: 'The common mistake is naming the top note instead of the bass. The melody grabs your attention, but the inversion lives at the bottom. Here C is on top, yet the bass is G: second inversion.', he: 'הטעות הנפוצה היא לזהות את הצליל העליון במקום את הבס. המלודיה תופסת את תשומת הלב, אבל ההיפוך גר למטה. כאן דו למעלה, אבל הבס הוא סול: היפוך שני.' },
        play: [chord([43, 64, 67, 72], 1.6), rest(0.3), note(43, 1.2)],
        show: { notes: [43, 64, 67, 72], chord: true, text: { en: 'top C · bass G = C/G', he: 'למעלה דו · בבס סול = C/G' } },
      },
      {
        say: { en: 'In real music, inversions build descending bass lines, common in pop ballads and Baroque music alike. C, G/B, Am, C/G, F walks the bass straight down the scale.', he: 'במוזיקה אמיתית, היפוכים בונים קווי בס יורדים, נפוצים גם בבלדות פופ וגם במוזיקת בארוק. C, G/B, Am, C/G, F מוריד את הבס ישר במורד הסולם.' },
        play: [chord([48, 64, 67, 72], 0.9), chord([47, 62, 67, 71], 0.9), chord([45, 64, 69, 72], 0.9), chord([43, 64, 67, 72], 0.9), chord([41, 65, 69, 72], 1.4)],
        show: { notes: [48, 47, 45, 43, 41], clef: 'bass', text: { en: 'C B A G F', he: 'דו סי לה סול פה' } },
      },
      {
        say: { en: 'Recap: the lowest note names the inversion. Root is grounded, third is light, fifth is hovering; slash chords write it as chord over bass.', he: 'לסיכום: הצליל הנמוך קובע את ההיפוך. שורש מקורקע, טרצה קלילה, קווינטה מרחפת; אקורד סלאש כותב את זה כאקורד מעל בס.' },
        show: { text: { en: 'C · C/E · C/G', he: 'C · C/E · C/G' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 8. Notes and degrees
  {
    id: 'notes-degrees',
    area: 'theory',
    emoji: '🔢',
    title: { en: 'Notes and degrees', he: 'שמות תווים ומספרים בסולם' },
    takeaway: { en: 'Letter names stay fixed; degrees count from the key’s home. To convert, count up the scale from 1.', he: 'שמות התווים קבועים; הדרגות נספרות מהבית של הסולם. כדי להמיר, סופרים למעלה בסולם מ־1.' },
    steps: [
      {
        say: { en: 'Hey {name}! Every note has two names. Its letter — C, D, E — never changes. Its degree — 1, 2, 3 — is its place in the key.', he: 'היי {name}! לכל צליל יש שני שמות. השם שלו — דו, רה, מי — אף פעם לא משתנה. הדרגה שלו — 1, 2, 3 — היא המקום שלו בסולם.' },
        play: [cad(C), notes(C_MAJOR, 0.45)],
        show: { notes: C_MAJOR, key: 'C', text: { en: 'C D E F G A B = 1 2 3 4 5 6 7', he: 'דו רה מי פה סול לה סי = 1 2 3 4 5 6 7' } },
      },
      {
        say: { en: 'Change the key and the numbers move with home. In G major, G is 1 — so D is 5, and F-sharp is 7.', he: 'מחליפים סולם, והמספרים זזים עם הבית. בסול מז׳ור, סול הוא 1 — אז רה הוא 5, ופה דיאז הוא 7.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66], 0.45)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66], key: 'G', text: { en: 'G A B C D E F♯', he: 'סול לה סי דו רה מי פה♯' } },
      },
      {
        say: { en: 'To convert, count up from home. Which degree is B-flat in E-flat major? E-flat 1, F 2, G 3, A-flat 4, B-flat 5. Five!', he: 'כדי להמיר, סופרים מהבית. איזו דרגה היא סי במול במי במול מז׳ור? מי במול 1, פה 2, סול 3, לה במול 4, סי במול 5. חמש!' },
        play: [notes([63, 65, 67, 68, 70], 0.5)],
        show: { notes: [63, 65, 67, 68, 70], key: 'Eb', text: { en: 'E♭ F G A♭ B♭ = 1 2 3 4 5', he: '1 2 3 4 5' } },
      },
      {
        say: { en: 'The other way works too. Degree 4 in F major? F, G, A, B-flat. Careful: F major has B-flat, not B.', he: 'גם בכיוון ההפוך. דרגה 4 בפה מז׳ור? פה, סול, לה, סי במול. זהירות: בפה מז׳ור יש סי במול, לא סי.' },
        play: [notes([65, 67, 69, 70], 0.55)],
        show: { notes: [65, 67, 69, 70], key: 'F', text: { en: 'F G A B♭ = 1 2 3 4', he: '1 2 3 4' } },
      },
      {
        say: { en: 'Some rounds play a note in the key: hear its degree first, then name it. In D major, this is 3 — F-sharp.', he: 'בחלק מהסיבובים יתנגן צליל בסולם: קודם שומעים את הדרגה, ואז נותנים שם. ברה מז׳ור, זה 3 — פה דיאז.' },
        play: [cad(D), note(66, 1.5)],
        show: { notes: [66], key: 'D', text: { en: 'D major: 3 = F♯', he: 'רה מז׳ור: 3 = פה דיאז' } },
      },
      {
        say: { en: 'Your turn. I name a key, then ask for a note or a degree — or play one. Count from home; counting on your fingers is fine.', he: 'תורכם. אני אומר סולם, ואז שואל על תו או על דרגה — או מנגן אחד. סופרים מהבית; מותר להיעזר באצבעות.' },
        show: { text: { en: 'note ↔ degree', he: 'תו ↔ דרגה' } },
      },
    ],
    more: [
      {
        say: { en: 'Letter names are absolute: C is always C. Degrees are relative: they number a scale’s notes from its tonic, 1 to 7. The same numbers work in every key, which is why musicians use them to transpose.', he: 'שמות התווים מוחלטים: דו הוא תמיד דו. הדרגות יחסיות: הן ממספרות את צלילי הסולם מהטוניקה, 1 עד 7. אותם מספרים עובדים בכל סולם, ולכן מוזיקאים משתמשים בהם כדי לטרנספז.' },
        play: [cad(D), notes([62, 64, 66, 67, 69, 71, 73], 0.42)],
        show: { notes: [62, 64, 66, 67, 69, 71, 73], key: 'D', text: { en: 'D E F♯ G A B C♯ = 1–7', he: 'רה מי פה♯ סול לה סי דו♯ = 1–7' } },
      },
      {
        say: { en: 'Every major scale follows one pattern of whole and half steps: whole, whole, half, whole, whole, whole, half. The half steps fall between 3 and 4, and between 7 and 8.', he: 'כל סולם מז׳ור בנוי לפי אותה תבנית של טונים וחצאי טונים: טון, טון, חצי, טון, טון, טון, חצי. חצאי הטונים נמצאים בין 3 ל־4, ובין 7 ל־8.' },
        play: [notes(C_IONIAN, 0.42)],
        show: { notes: C_IONIAN, key: 'C', text: { en: 'W W H W W W H', he: 'ט ט ח ט ט ט ח' } },
      },
      {
        say: { en: 'That pattern decides the key signature. G major needs F-sharp, or the step from 7 to 8 would not be a half step. F major needs B-flat to keep 3 to 4 a half step.', he: 'התבנית הזאת קובעת את סימני ההיתק. סול מז׳ור צריך פה דיאז, אחרת הצעד מ־7 ל־8 לא יהיה חצי טון. פה מז׳ור צריך סי במול כדי שהצעד מ־3 ל־4 יישאר חצי טון.' },
        play: [notes([55, 57, 59, 60, 62, 64, 66, 67], 0.4)],
        show: { notes: [55, 57, 59, 60, 62, 64, 66, 67], key: 'G', text: { en: 'G major: F♯ → G', he: 'סול מז׳ור: פה♯ → סול' } },
      },
      {
        say: { en: 'Each degree takes its own letter, once. In D major, 3 is F-sharp, never G-flat: the letters must run D, E, F, G, A, B, C.', he: 'כל דרגה מקבלת אות משלה, פעם אחת. ברה מז׳ור, 3 הוא פה דיאז, אף פעם לא סול במול: האותיות חייבות לרוץ רה, מי, פה, סול, לה, סי, דו.' },
        play: [notes([62, 64, 66], 0.6)],
        show: { notes: [62, 64, 66], key: 'D', text: { en: 'D E F♯ = 1 2 3', he: 'רה מי פה♯ = 1 2 3' } },
      },
      {
        say: { en: 'Degrees have names too. 1 is the tonic, 4 the subdominant, 5 the dominant, and 7 the leading tone, because it leads up to 1.', he: 'לדרגות יש גם שמות. 1 היא הטוניקה, 4 הסובדומיננטה, 5 הדומיננטה, ו־7 הצליל המוביל, כי הוא מוביל למעלה ל־1.' },
        play: [cad(C), notes([60, 65, 67, 71, 72], 0.6)],
        show: { notes: [60, 65, 67, 71, 72], key: 'C', text: { en: '1 tonic · 4 · 5 dominant · 7 → 8', he: '1 טוניקה · 4 · 5 דומיננטה · 7 → 8' } },
      },
      {
        say: { en: 'A shortcut for high degrees: count down from the octave. In A major, 7 is one step below the next A — G-sharp. That is faster than counting six steps up.', he: 'קיצור דרך לדרגות גבוהות: סופרים למטה מהאוקטבה. בלה מז׳ור, 7 נמצא צעד אחד מתחת ללה הבא — סול דיאז. זה מהיר יותר מלספור שישה צעדים למעלה.' },
        play: [notes([57, 69, 68], 0.7)],
        show: { notes: [57, 69, 68], key: 'A', text: { en: '8 → 7 = G♯', he: '8 → 7 = סול♯' } },
      },
      {
        say: { en: 'The common mistake: forgetting the key signature while counting. In E-flat major, 4 is A-flat, not A. Say the scale with its accidentals before you count.', he: 'הטעות הנפוצה: לשכוח את סימני ההיתק תוך כדי ספירה. במי במול מז׳ור, 4 הוא לה במול, לא לה. אמרו את הסולם עם הסימנים לפני שסופרים.' },
        play: [notes([63, 65, 67, 68], 0.55)],
        show: { notes: [63, 65, 67, 68], key: 'Eb', text: { en: 'E♭ F G A♭ = 1 2 3 4', he: 'מי♭ פה סול לה♭ = 1 2 3 4' } },
      },
      {
        say: { en: 'Recap: letters are fixed, degrees move with home. Know the key’s accidentals, count from 1, and give every degree its own letter.', he: 'לסיכום: האותיות קבועות, הדרגות זזות עם הבית. הכירו את סימני ההיתק, ספרו מ־1, ותנו לכל דרגה אות משלה.' },
        show: { text: { en: 'letter ↔ degree', he: 'תו ↔ דרגה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 9. Sing it by name
  {
    id: 'sing-names',
    area: 'voice',
    emoji: '🗣️',
    title: { en: 'Sing it by name', he: 'לשיר לפי שם' },
    takeaway: { en: 'Echo a note exactly; to sing a named note, find home first, then climb to its degree.', he: 'חוזרים על צליל בדיוק; כדי לשיר תו לפי שם, מוצאים קודם את הבית ואז מטפסים לדרגה שלו.' },
    steps: [
      {
        say: { en: 'Hi {name}! Two games today. First, echo: I play a note, and you sing that very same note back.', he: 'היי {name}! שני משחקים היום. הראשון, הד: אני מנגן צליל, ואתם שרים בחזרה בדיוק את אותו צליל.' },
        play: [note(60, 1.4)],
        show: { notes: [60], text: { en: 'echo', he: 'הד' } },
      },
      {
        say: { en: 'Tune like a guitar string: hum, listen, nudge until it locks in. Low or high octave both count. Try this G in your head.', he: 'מכוונים כמו מיתר בגיטרה: מזמזמים, מקשיבים, מזיזים עד שזה ננעל. אוקטבה נמוכה או גבוהה — שתיהן נחשבות. נסו את הסול הזה בראש.' },
        play: [note(55, 1.8)],
        show: { notes: [55], text: { en: 'G', he: 'סול' } },
      },
      {
        say: { en: 'Then the real trick: I play the key and its home note, and ask for a note by name — like "sing E".', he: 'ואז הטריק האמיתי: אני מנגן את הסולם ואת צליל הבית שלו, ומבקש תו לפי שם — למשל "שירו מי".' },
        play: [cad(C), note(60, 1.4)],
        show: { notes: [60], key: 'C', text: { en: 'C major · sing E', he: 'דו מז׳ור · שירו מי' } },
      },
      {
        say: { en: 'Find it from home. In C major, E is 3: do, re, mi. And G is 5: keep climbing to sol.', he: 'מוצאים אותו מהבית. בדו מז׳ור, מי הוא 3: דו, רה, מי. וסול הוא 5: ממשיכים לטפס עד סול.' },
        play: [notes([60, 62, 64], 0.5), rest(0.4), notes([60, 62, 64, 65, 67], 0.45)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: 'E = 3 · G = 5', he: 'מי = 3 · סול = 5' } },
      },
      {
        say: { en: 'Same idea in any key. In D major, F-sharp is 3 and A is 5.', he: 'אותו רעיון בכל סולם. ברה מז׳ור, פה דיאז הוא 3 ולה הוא 5.' },
        play: [cad(D), notes([62, 66, 69], 0.8)],
        show: { notes: [62, 66, 69], key: 'D', text: { en: 'D F♯ A = 1 3 5', he: 'רה פה♯ לה = 1 3 5' } },
      },
      {
        say: { en: 'Your turn. Echo the notes I play, then sing the notes I name, after the chime. Aim for the center of each note.', he: 'תורכם. חזרו על הצלילים שאני מנגן, ואז שירו את התווים שאני אומר, אחרי הצליל. כוונו למרכז של כל צליל.' },
        show: { text: { en: 'echo · then by name', he: 'הד · ואז לפי שם' } },
      },
    ],
    more: [
      {
        say: { en: 'Two skills hide here. Echoing — matching a pitch you just heard — teaches your voice to follow your ear. Singing a named note teaches your inner map: name, then degree, then sound.', he: 'יש כאן שתי מיומנויות. הד — התאמה לצליל ששמעתם הרגע — מלמד את הקול ללכת אחרי האוזן. שירת תו לפי שם מלמדת את המפה הפנימית: שם, אחר כך דרגה, ואז צליל.' },
        play: [note(57, 1.6)],
        show: { notes: [57], text: { en: 'name → degree → sound', he: 'שם → דרגה → צליל' } },
      },
      {
        say: { en: 'Echo in the octave that suits your voice. Lower voices usually sing an octave below the piano’s middle; that still counts as the same note. Here is E, then the E an octave lower.', he: 'שירו את ההד באוקטבה שמתאימה לקול שלכם. קולות נמוכים שרים בדרך כלל אוקטבה מתחת לאמצע הפסנתר; זה עדיין נחשב אותו צליל. הנה מי, ואז המי שאוקטבה מתחתיו.' },
        play: [notes([64, 52], 1.0)],
        show: { notes: [64, 52], text: { en: 'E4 = E3', he: 'מי = מי' } },
      },
      {
        say: { en: 'To match a pitch, start the note softly, then nudge it up or down until it stops fighting the piano and locks in. Small, slow corrections beat big swoops.', he: 'כדי להתאים צליל, התחילו אותו ברכות, ואז הזיזו אותו קצת למעלה או למטה עד שהוא מפסיק להתנגש בפסנתר וננעל. תיקונים קטנים ואיטיים עדיפים על החלקות גדולות.' },
        play: [note(62, 2.4)],
        show: { notes: [62], text: { en: 'small nudges', he: 'תיקונים קטנים' } },
      },
      {
        say: { en: 'For a named note, go through the degree. In F major, “sing A”: A is 3, so sing do, re, mi from F.', he: 'לתו לפי שם, עוברים דרך הדרגה. בפה מז׳ור, "שירו לה": לה הוא 3, אז שרים דו, רה, מי מפה.' },
        play: [cad(F), notes([65, 67, 69], 0.6)],
        show: { notes: [65, 67, 69], key: 'F', text: { en: 'F G A = 1 2 3', he: 'פה סול לה = 1 2 3' } },
      },
      {
        say: { en: 'Some notes sit just below home. In G major, F-sharp is 7, a half step under G: sing home, then lean down one small step.', he: 'יש צלילים שיושבים ממש מתחת לבית. בסול מז׳ור, פה דיאז הוא 7, חצי טון מתחת לסול: שרים את הבית, ואז נשענים צעד קטן אחד למטה.' },
        play: [cad(G), notes([67, 66], 0.9)],
        show: { notes: [67, 66], key: 'G', text: { en: 'G → F♯ = 1 → 7', he: 'סול → פה♯ = 1 → 7' } },
      },
      {
        say: { en: 'The common mistake: guessing from the letter alone. B is 7 in C major, a tense note under home — but in G major it is 3, calm and sweet. Always go through the degree.', he: 'הטעות הנפוצה: לנחש רק לפי האות. סי הוא 7 בדו מז׳ור, צליל מתוח מתחת לבית — אבל בסול מז׳ור הוא 3, רגוע ומתוק. תמיד עוברים דרך הדרגה.' },
        play: [cad(C), note(71, 1.3), cad(G), note(71, 1.3)],
        show: { notes: [71], text: { en: 'B: 7 in C · 3 in G', he: 'סי: 7 בדו · 3 בסול' } },
      },
      {
        say: { en: 'This is how singers read new music without a piano: find the key, turn each note into a degree, then sing it from home.', he: 'כך זמרים קוראים מוזיקה חדשה בלי פסנתר: מוצאים את הסולם, הופכים כל תו לדרגה, ושרים אותו מהבית.' },
        show: { text: { en: 'key → degree → sing', he: 'סולם → דרגה → שירה' } },
      },
      {
        say: { en: 'Recap: echo by gentle tuning, any octave. For a named note, find home, turn the name into a degree, and climb there.', he: 'לסיכום: הד בכיוון עדין, בכל אוקטבה. לתו לפי שם, מוצאים את הבית, הופכים את השם לדרגה, ומטפסים אליה.' },
        show: { text: { en: 'echo · name → degree', he: 'הד · שם → דרגה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 10. Sing the degrees
  {
    id: 'sing-degrees',
    area: 'voice',
    emoji: '🪜',
    title: { en: 'Sing the degrees', he: 'לשיר לפי מספרים' },
    takeaway: { en: 'Lock in home first, then sing the numbers in order: steps walk the scale, 1–3–5 climbs the home chord.', he: 'קודם ננעלים על הבית, ואז שרים את המספרים לפי הסדר: צעדים הולכים בסולם, 1–3–5 מטפס על אקורד הבית.' },
    steps: [
      {
        say: { en: 'Hey {name}! Now you sing little tunes from numbers. I say "one, three, five" — you sing those degrees, in order.', he: 'היי {name}! עכשיו שרים מנגינות קטנות ממספרים. אני אומר "אחת, שלוש, חמש" — ואתם שרים את הדרגות האלה, לפי הסדר.' },
        play: [cad(C), notes([60, 64, 67], 0.8)],
        show: { notes: [60, 64, 67], key: 'C', text: { en: '1 – 3 – 5', he: '1 – 3 – 5' } },
      },
      {
        say: { en: 'Steps are the friendly ones: 1, 2, 3 walks up the scale, and 3, 2, 1 walks back home.', he: 'צעדים הם הידידותיים: 1, 2, 3 הולך למעלה בסולם, ו־3, 2, 1 הולך חזרה הביתה.' },
        play: [notes([60, 62, 64], 0.7), rest(0.4), notes([64, 62, 60], 0.7)],
        show: { notes: [60, 62, 64], key: 'C', text: { en: '1 2 3 · 3 2 1', he: '1 2 3 · 3 2 1' } },
      },
      {
        say: { en: 'Jumps skip notes: 1, 3, 5 climbs the home chord, and 5, 3, 1 slides down it like a banister.', he: 'קפיצות מדלגות על צלילים: 1, 3, 5 מטפס על אקורד הבית, ו־5, 3, 1 מחליק עליו למטה כמו על מעקה.' },
        play: [notes([67, 64, 60], 0.7), rest(0.4), notes([60, 67, 64], 0.7)],
        show: { notes: [60, 64, 67], key: 'C', text: { en: '5 3 1 · 1 5 3', he: '5 3 1 · 1 5 3' } },
      },
      {
        say: { en: 'And 5, 6, 5 is a little neighbor: step up from 5 and come right back.', he: 'ו־5, 6, 5 הוא שכן קטן: צעד אחד למעלה מ־5 וחזרה מיד.' },
        play: [notes([67, 69, 67], 0.7)],
        show: { notes: [67, 69], key: 'C', text: { en: '5 6 5', he: '5 6 5' } },
      },
      {
        say: { en: 'Tip: for a jump, sing the notes in between silently. From 1 to 5? Think 2, 3, 4 on the way.', he: 'טיפ: בקפיצה, שירו בשקט בראש את הצלילים שבאמצע. מ־1 ל־5? חשבו 2, 3, 4 בדרך.' },
        play: [notes([60, 62, 64, 65], 0.3), note(67, 1.2)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '1 (2 3 4) 5', he: '1 (2 3 4) 5' } },
      },
      {
        say: { en: 'Your turn! Hear the key and home, then sing the numbers I give you after the chime. One clear note at a time.', he: 'תורכם! שומעים את הסולם ואת הבית, ואז שרים את המספרים שאני נותן, אחרי הצליל. צליל ברור אחד בכל פעם.' },
        show: { text: { en: 'sing the numbers', he: 'שירו את המספרים' } },
      },
    ],
    more: [
      {
        say: { en: 'Singing degrees is the core of solfège: each number names a step of the scale, sung relative to home. Numbers or syllables — do, re, mi — work the same way, as long as the name follows the function.', he: 'שירה לפי דרגות היא הלב של הסולפג׳: כל מספר הוא צעד בסולם, שמושר ביחס לבית. מספרים או הברות — דו, רה, מי — עובדים אותו דבר, כל עוד השם הולך אחרי התפקיד.' },
        play: [cad(C), notes([60, 62, 64, 65, 67], 0.5)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '1 2 3 4 5 = do re mi fa sol', he: '1 2 3 4 5 = דו רה מי פה סול' } },
      },
      {
        say: { en: 'Degrees 1, 3 and 5 belong to the home chord and feel stable. The others are active and lean toward a neighbor: 7 rises to 1, 4 falls to 3, 2 falls to 1, 6 falls to 5.', he: 'דרגות 1, 3 ו־5 שייכות לאקורד הבית ומרגישות יציבות. האחרות פעילות ונשענות על שכן: 7 עולה ל־1, 4 יורד ל־3, 2 יורד ל־1, 6 יורד ל־5.' },
        play: [cad(C), notes([71, 72], 0.7), rest(0.3), notes([65, 64], 0.7)],
        show: { notes: [71, 72, 65, 64], key: 'C', text: { en: '7 → 1 · 4 → 3', he: '7 → 1 · 4 → 3' } },
      },
      {
        say: { en: 'Use those pulls to find active notes. To find 7, sing 1 and slip a half step down. To find 4, sing 3 and step a half step up.', he: 'השתמשו במשיכות האלה כדי למצוא צלילים פעילים. כדי למצוא 7, שירו 1 והחליקו חצי טון למטה. כדי למצוא 4, שירו 3 ועלו חצי טון.' },
        play: [notes([72, 71, 72], 0.7), rest(0.3), notes([64, 65, 64], 0.7)],
        show: { notes: [72, 71, 64, 65], key: 'C', text: { en: '1 7 1 · 3 4 3', he: '1 7 1 · 3 4 3' } },
      },
      {
        say: { en: 'For leaps, use the home chord as scaffolding. 1 to 6? Think 1 to 5, then one step up to 6.', he: 'בקפיצות, השתמשו באקורד הבית כפיגום. מ־1 ל־6? חשבו מ־1 ל־5, ואז צעד אחד למעלה ל־6.' },
        play: [notes([60, 67], 0.7), note(69, 1.2)],
        show: { notes: [60, 67, 69], key: 'C', text: { en: '1 (5) 6', he: '1 (5) 6' } },
      },
      {
        say: { en: 'Degrees also sit below 1. Many melodies start on 5 or 7 below home and rise into it.', he: 'דרגות נמצאות גם מתחת ל־1. הרבה מנגינות מתחילות ב־5 או ב־7 שמתחת לבית ועולות אליו.' },
        play: [cad(C), notes([55, 60], 0.7), rest(0.3), notes([59, 60], 0.7)],
        show: { notes: [55, 59, 60], key: 'C', text: { en: 'low 5 → 1 · low 7 → 1', he: '5 נמוך → 1 · 7 נמוך → 1' } },
      },
      {
        say: { en: 'A short daily routine: in one key, sing 1-2-3-2-1, then 1-3-5-3-1, then 1-5-1, checking against the piano. Then change key — the numbers stay the same.', he: 'שגרה יומית קצרה: בסולם אחד, שירו 1־2־3־2־1, אחר כך 1־3־5־3־1, ואז 1־5־1, ובדקו מול הפסנתר. אחר כך החליפו סולם — המספרים נשארים אותו דבר.' },
        play: [notes([60, 64, 67, 64, 60], 0.45), rest(0.4), notes([62, 66, 69, 66, 62], 0.45)],
        show: { notes: [62, 66, 69], key: 'D', text: { en: 'C, then D: 1 3 5 3 1', he: 'דו, ואז רה: 1 3 5 3 1' } },
      },
      {
        say: { en: 'The common mistake is drift: after a few notes, your sense of home slides sharp or flat, and every degree after it is off. Return to 1 often and compare it with the piano.', he: 'הטעות הנפוצה היא סחיפה: אחרי כמה צלילים, תחושת הבית זזה למעלה או למטה, וכל דרגה אחריה יוצאת לא מדויקת. חזרו ל־1 לעיתים קרובות והשוו אותו לפסנתר.' },
        play: [cad(C), notes([60, 64, 67, 69, 67, 64], 0.45), note(60, 1.4)],
        show: { notes: [60], key: 'C', text: { en: 'back to 1 — still true?', he: 'חזרה ל־1 — עדיין מדויק?' } },
      },
      {
        say: { en: 'Recap: lock in home, use the home chord as scaffolding, and let active notes lean into their neighbors.', he: 'לסיכום: ננעלים על הבית, נעזרים באקורד הבית כפיגום, ונותנים לצלילים הפעילים להישען על השכנים שלהם.' },
        show: { text: { en: '1 3 5 stable · others lean', he: '1 3 5 יציבים · השאר נשענים' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 20. Note sequences
  {
    id: 'note-sequences',
    area: 'ear',
    emoji: '🔗',
    title: { en: 'Note sequences', he: 'רצפי תווים' },
    takeaway: { en: 'Remember a short sequence as degrees, then turn each degree into a name — or a name into a degree.', he: 'זוכרים רצף קצר כדרגות, ואז הופכים כל דרגה לשם — או שם לדרגה.' },
    steps: [
      {
        say: { en: 'Hi {name}! You can name one note — now let us name a few in a row. Here are two notes in B-flat major.', he: 'היי {name}! אתם כבר יודעים לתת שם לצליל אחד — עכשיו ניתן שמות לכמה ברצף. הנה שני צלילים בסי במול מז׳ור.' },
        play: [cad(Bb), notes([65, 60], 0.8)],
        show: { key: 'Bb', text: { en: '? – ?', he: '? – ?' } },
      },
      {
        say: { en: 'The secret: remember numbers, not sounds. Those were 5 then 2. In B-flat major, 5 is F and 2 is C.', he: 'הסוד: זוכרים מספרים, לא צלילים. אלה היו 5 ואז 2. בסי במול מז׳ור, 5 הוא פה ו־2 הוא דו.' },
        play: [notes([65, 60], 0.8)],
        show: { notes: [65, 60], key: 'Bb', text: { en: '5 – 2 = F – C', he: '5 – 2 = פה – דו' } },
      },
      {
        say: { en: 'Hum it back once right away — a sung tune sticks much longer. Try three notes in G major: 1, 3, 5 is G, B, D.', he: 'זמזמו את זה בחזרה מיד — מנגינה ששרתם נשארת הרבה יותר זמן. נסו שלושה צלילים בסול מז׳ור: 1, 3, 5 זה סול, סי, רה.' },
        play: [cad(G), notes([67, 71, 74], 0.75)],
        show: { notes: [67, 71, 74], key: 'G', text: { en: 'G B D = 1 3 5', he: 'סול סי רה = 1 3 5' } },
      },
      {
        say: { en: 'Some rounds give you names to convert. In F major: A, G, F — which degrees? Count from home: 3, 2, 1.', he: 'בחלק מהסיבובים תקבלו שמות להמרה. בפה מז׳ור: לה, סול, פה — אילו דרגות? סופרים מהבית: 3, 2, 1.' },
        play: [notes([69, 67, 65], 0.75)],
        show: { notes: [69, 67, 65], key: 'F', text: { en: 'A G F = 3 2 1', he: 'לה סול פה = 3 2 1' } },
      },
      {
        say: { en: 'And one round asks you to sing named notes. Find home first, then each name by its number.', he: 'וסיבוב אחד מבקש לשיר תווים לפי שם. קודם מוצאים את הבית, ואז כל שם לפי המספר שלו.' },
        play: [cad(C), note(60, 1.2)],
        show: { notes: [60], key: 'C', text: { en: 'home first', he: 'קודם הבית' } },
      },
      {
        say: { en: 'Your turn! Listen and name, convert both ways, and sing. One note at a time — there is no rush.', he: 'תורכם! מקשיבים ונותנים שמות, ממירים לשני הכיוונים, ושרים. צליל אחד בכל פעם — אין לחץ.' },
        show: { text: { en: 'sound · names · degrees', he: 'צליל · שמות · דרגות' } },
      },
    ],
    more: [
      {
        say: { en: 'Short-term memory holds only a few items at once. Turning sounds into degrees packs them tightly: three numbers are far easier to hold than three raw pitches. In D major: F-sharp, E, D is 3, 2, 1.', he: 'הזיכרון לטווח קצר מחזיק רק כמה פריטים בבת אחת. הפיכת צלילים לדרגות דוחסת אותם: שלושה מספרים הרבה יותר קל להחזיק מאשר שלושה צלילים גולמיים. ברה מז׳ור: פה דיאז, מי, רה זה 3, 2, 1.' },
        play: [cad(D), notes([66, 64, 62], 0.7)],
        show: { notes: [66, 64, 62], key: 'D', text: { en: 'F♯ E D = 3 2 1', he: 'פה♯ מי רה = 3 2 1' } },
      },
      {
        say: { en: 'Look for patterns: steps, repeats, or a chord outline. 1, 3, 5, 8 is just the home chord climbing — four notes, one idea.', he: 'חפשו תבניות: צעדים, חזרות, או מתאר של אקורד. 1, 3, 5, 8 הוא פשוט אקורד הבית מטפס — ארבעה צלילים, רעיון אחד.' },
        play: [cad(C), notes([60, 64, 67, 72], 0.6)],
        show: { notes: [60, 64, 67, 72], key: 'C', text: { en: '1 3 5 8 = one chord', he: '1 3 5 8 = אקורד אחד' } },
      },
      {
        say: { en: 'Get the first note right and the rest follow. Find its degree against home, then track each move: up or down, step or leap. In F major: A, B-flat, C, F is 3, 4, 5, 1.', he: 'תפסו נכון את הצליל הראשון, והשאר יבואו. מצאו את הדרגה שלו ביחס לבית, ואז עקבו אחרי כל תנועה: למעלה או למטה, צעד או קפיצה. בפה מז׳ור: לה, סי במול, דו, פה זה 3, 4, 5, 1.' },
        play: [cad(F), notes([69, 70, 72, 65], 0.65)],
        show: { notes: [69, 70, 72, 65], key: 'F', text: { en: 'A B♭ C F = 3 4 5 1', he: 'לה סי♭ דו פה = 3 4 5 1' } },
      },
      {
        say: { en: 'To convert names, say the scale from home and count. In D major, A is 5, B is 6 and F-sharp is 3.', he: 'כדי להמיר שמות, אומרים את הסולם מהבית וסופרים. ברה מז׳ור, לה הוא 5, סי הוא 6, ופה דיאז הוא 3.' },
        play: [notes([69, 71, 66], 0.7)],
        show: { notes: [69, 71, 66], key: 'D', text: { en: 'A B F♯ = 5 6 3', he: 'לה סי פה♯ = 5 6 3' } },
      },
      {
        say: { en: 'If one note slips away, keep the contour — the up-and-down shape. A sequence with the right shape and one wrong number is easy to fix on the next hearing.', he: 'אם צליל אחד בורח, שמרו על הקונטור — צורת העליות והירידות. רצף עם צורה נכונה ומספר שגוי אחד קל לתקן בהשמעה הבאה.' },
        play: [notes([60, 67, 64, 65], 0.6)],
        show: { notes: [60, 67, 64, 65], key: 'C', text: { en: 'up · down · up', he: 'למעלה · למטה · למעלה' } },
      },
      {
        say: { en: 'The common mistake is naming each note the moment it sounds, and missing the next one. Listen to the whole sequence, sing it back, and only then name it.', he: 'הטעות הנפוצה היא לתת שם לכל צליל ברגע שהוא נשמע, ולפספס את הבא. הקשיבו לכל הרצף, שירו אותו בחזרה, ורק אז תנו שמות.' },
        show: { text: { en: 'hear → sing → name', he: 'שומעים → שרים → נותנים שם' } },
      },
      {
        say: { en: 'This is how musicians learn riffs and melodies by ear: hear a short phrase, sing it, turn it into degrees, then find it on the instrument.', he: 'כך מוזיקאים לומדים ריפים ומנגינות בשמיעה: שומעים משפט קצר, שרים אותו, הופכים אותו לדרגות, ואז מוצאים אותו על הכלי.' },
        show: { text: { en: 'ear → degrees → instrument', he: 'אוזן → דרגות → כלי' } },
      },
      {
        say: { en: 'Recap: remember sequences as numbers and shapes, anchor the first note to home, and name only after the whole sequence has finished.', he: 'לסיכום: זוכרים רצפים כמספרים וכצורות, מעגנים את הצליל הראשון לבית, ונותנים שמות רק אחרי שכל הרצף נגמר.' },
        show: { text: { en: 'numbers · shape · anchor', he: 'מספרים · צורה · עוגן' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 22. Songs you know
  {
    id: 'songs',
    area: 'ear',
    emoji: '🎶',
    title: { en: 'Songs you know', he: 'שירים שאתם מכירים' },
    takeaway: { en: 'Every melody is a string of degrees: find home, then ask of each note how far it is from home.', he: 'כל מנגינה היא רצף של דרגות: מוצאים את הבית, ושואלים על כל צליל כמה הוא רחוק ממנו.' },
    steps: [
      {
        say: { en: 'Hey {name}! You already know dozens of melodies — and each one is just degrees. Listen: 1, 1, 5, 5, 6, 6, 5.', he: 'היי {name}! אתם כבר מכירים עשרות מנגינות — וכל אחת מהן היא בסך הכול דרגות. הקשיבו: 1, 1, 5, 5, 6, 6, 5.' },
        play: [cad(C), melody([60, 60, 67, 67, 69, 69, 67], [1, 1, 1, 1, 1, 1, 2])],
        show: { notes: [60, 60, 67, 67, 69, 69, 67], key: 'C', text: { en: '1 1 5 5 6 6 5', he: '1 1 5 5 6 6 5' } },
      },
      {
        say: { en: 'That is "Twinkle, Twinkle". Same numbers in any key, same tune. Here it is in G.', he: 'זה "כוכב קטן". אותם מספרים בכל סולם — אותה מנגינה. הנה הוא בסול.' },
        play: [melody([55, 55, 62, 62, 64, 64, 62], [1, 1, 1, 1, 1, 1, 2])],
        show: { notes: [55, 55, 62, 62, 64, 64, 62], key: 'G', text: { en: 'G: 1 1 5 5 6 6 5', he: 'סול: 1 1 5 5 6 6 5' } },
      },
      {
        say: { en: 'Frère Jacques walks: 1, 2, 3, 1 — step, step, and back home.', he: '"האח יעקב" הולך בצעדים: 1, 2, 3, 1 — צעד, צעד, וחזרה הביתה.' },
        play: [melody([60, 62, 64, 60], [1, 1, 1, 1])],
        show: { notes: [60, 62, 64, 60], key: 'C', text: { en: '1 2 3 1', he: '1 2 3 1' } },
      },
      {
        say: { en: 'Not every song starts at home! "Ode to Joy" starts on 3: 3, 3, 4, 5, 5, 4, 3, 2.', he: 'לא כל שיר מתחיל בבית! "האודה לשמחה" מתחילה ב־3: 3, 3, 4, 5, 5, 4, 3, 2.' },
        play: [melody([64, 64, 65, 67, 67, 65, 64, 62], [1, 1, 1, 1, 1, 1, 1, 1])],
        show: { notes: [64, 64, 65, 67, 67, 65, 64, 62], key: 'C', text: { en: '3 3 4 5 5 4 3 2', he: '3 3 4 5 5 4 3 2' } },
      },
      {
        say: { en: 'The trick: keep home in your ear, and for each note ask — above or below home, and how far?', he: 'הטריק: שומרים את הבית באוזן, ועל כל צליל שואלים — מעל הבית או מתחתיו, ובכמה?' },
        play: [cad(C), melody([64, 62, 60, 62, 64, 64, 64], [1.5, 0.5, 1, 1, 1, 1, 2])],
        show: { notes: [64, 62, 60, 62, 64, 64, 64], key: 'C', text: { en: '3 2 1 2 3 3 3', he: '3 2 1 2 3 3 3' } },
      },
      {
        say: { en: 'Your turn. I play an opening, you say its degrees in order — then I reveal the song. Once, you will sing one from its numbers.', he: 'תורכם. אני מנגן פתיחה, ואתם אומרים את הדרגות לפי הסדר — ואז אני מגלה איזה שיר זה. פעם אחת גם תשירו שיר מהמספרים שלו.' },
        show: { text: { en: 'degrees → song', he: 'דרגות → שיר' } },
      },
    ],
    more: [
      {
        say: { en: 'You recognize a melody by its pattern of intervals, not by its exact pitches. That is why you know a song in any key: the degrees stay, only the starting pitch moves. “Twinkle” in D:', he: 'מזהים מנגינה לפי תבנית המרווחים שלה, לא לפי הגבהים המדויקים. לכן מזהים שיר בכל סולם: הדרגות נשארות, רק צליל ההתחלה זז. "כוכב קטן" ברה:' },
        play: [cad(D), melody([62, 62, 69, 69, 71, 71, 69], [1, 1, 1, 1, 1, 1, 2])],
        show: { notes: [62, 62, 69, 69, 71, 71, 69], key: 'D', text: { en: 'D: 1 1 5 5 6 6 5', he: 'רה: 1 1 5 5 6 6 5' } },
      },
      {
        say: { en: 'Melodies can start on any degree. Many begin on 5 below home and rise into the key. “Happy Birthday” does: 5, 5, 6, 5, 1, 7.', he: 'מנגינות יכולות להתחיל בכל דרגה. הרבה מהן מתחילות ב־5 שמתחת לבית ועולות לתוך הסולם. "יום הולדת שמח" למשל: 5, 5, 6, 5, 1, 7.' },
        play: [cad(C), melody([55, 55, 57, 55, 60, 59], [0.75, 0.25, 1, 1, 1, 2])],
        show: { notes: [55, 55, 57, 55, 60, 59], key: 'C', durs: [0.75, 0.25, 1, 1, 1, 2], text: { en: '5 5 6 5 1 7', he: '5 5 6 5 1 7' } },
      },
      {
        say: { en: 'Strategy: notice where the melody rests — usually the last note of a phrase. That is most often 1. Then measure the first note from there.', he: 'אסטרטגיה: שימו לב איפה המנגינה נחה — בדרך כלל בצליל האחרון של משפט. לרוב זה 1. משם מודדים את הצליל הראשון.' },
        play: [melody([60, 62, 64, 60, 60, 62, 64, 60], [1, 1, 1, 1, 1, 1, 1, 1])],
        show: { notes: [60, 62, 64, 60], key: 'C', text: { en: '1 2 3 1 · ends on 1', he: '1 2 3 1 · נגמר ב־1' } },
      },
      {
        say: { en: 'Then follow the motion. Most melodies move mostly by step, with an occasional leap for character. The second line of “Twinkle” is all steps down: 4, 4, 3, 3, 2, 2, 1.', he: 'אחר כך עוקבים אחרי התנועה. רוב המנגינות זזות בעיקר בצעדים, עם קפיצה מדי פעם בשביל אופי. השורה השנייה של "כוכב קטן" היא כולה צעדים למטה: 4, 4, 3, 3, 2, 2, 1.' },
        play: [melody([65, 65, 64, 64, 62, 62, 60], [1, 1, 1, 1, 1, 1, 2])],
        show: { notes: [65, 65, 64, 64, 62, 62, 60], key: 'C', text: { en: '4 4 3 3 2 2 1', he: '4 4 3 3 2 2 1' } },
      },
      {
        say: { en: 'Rhythm and meter are clues too. “Happy Birthday” sways in three beats per bar; “Twinkle” marches in four, even though both open with a repeated note.', he: 'גם הקצב והמשקל הם רמזים. "יום הולדת שמח" מתנדנד בשלוש פעמות בתיבה; "כוכב קטן" צועד בארבע, למרות ששניהם נפתחים בצליל חוזר.' },
        show: { text: { en: '3/4 · 4/4', he: '3/4 · 4/4' } },
      },
      {
        say: { en: 'The common mistake is assuming every song starts on 1. If your numbers come out strange, check the final note: if it is not 1, your home is in the wrong place.', he: 'הטעות הנפוצה היא להניח שכל שיר מתחיל ב־1. אם המספרים יוצאים מוזרים, בדקו את הצליל האחרון: אם הוא לא 1, הבית שלכם במקום הלא נכון.' },
        show: { text: { en: 'check the last note', he: 'בדקו את הצליל האחרון' } },
      },
      {
        say: { en: 'Musicians use this to play by ear, to transpose on the spot, and to write charts. Once a melody is in numbers, you can play it in any key — here, F.', he: 'מוזיקאים משתמשים בזה כדי לנגן בשמיעה, לטרנספז במקום, ולכתוב תווים. ברגע שמנגינה הפכה למספרים, אפשר לנגן אותה בכל סולם — הנה, בפה.' },
        play: [melody([65, 65, 72, 72, 74, 74, 72], [1, 1, 1, 1, 1, 1, 2])],
        show: { notes: [65, 65, 72, 72, 74, 74, 72], key: 'F', text: { en: 'F: 1 1 5 5 6 6 5', he: 'פה: 1 1 5 5 6 6 5' } },
      },
      {
        say: { en: 'Recap: find where the tune rests, call it 1, and measure every note from there — up or down, step or leap.', he: 'לסיכום: מוצאים איפה המנגינה נחה, קוראים לזה 1, ומודדים ממנו כל צליל — למעלה או למטה, צעד או קפיצה.' },
        show: { text: { en: 'rest = 1 · measure from home', he: 'מנוחה = 1 · מודדים מהבית' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 24. Dictation
  {
    id: 'dictation',
    area: 'ear',
    emoji: '✍️',
    title: { en: 'Melody dictation', he: 'הכתבה מלודית' },
    takeaway: { en: 'Write a bar in two passes: first the notes as degrees, then the rhythm.', he: 'כותבים תיבה בשני מעברים: קודם הצלילים כדרגות, ואז הקצב.' },
    steps: [
      {
        say: { en: 'Hi {name}! Dictation means writing down what you hear: the notes and their rhythm. We go one short bar at a time.', he: 'היי {name}! הכתבה פירושה לכתוב את מה ששומעים: את הצלילים ואת הקצב שלהם. נעבוד תיבה קצרה אחת בכל פעם.' },
        play: [cad(C), rest(0.3), melody([60, 62, 64, 60], [1, 1, 1, 1], 70)],
        show: { notes: [60, 62, 64, 60], key: 'C', durs: [1, 1, 1, 1] },
      },
      {
        say: { en: 'Pass one: the notes. Sing the bar in your head and turn it into degrees. That one was 1, 2, 3, 1.', he: 'מעבר ראשון: הצלילים. שירו את התיבה בראש והפכו אותה לדרגות. זו הייתה 1, 2, 3, 1.' },
        play: [melody([60, 62, 64, 60], [1, 1, 1, 1], 70)],
        show: { notes: [60, 62, 64, 60], key: 'C', text: { en: '1 2 3 1', he: '1 2 3 1' } },
      },
      {
        say: { en: 'Pass two: the rhythm — how long is each note? Here: ta, ta, ta-a. Two quarters and a half note.', he: 'מעבר שני: הקצב — כמה זמן נמשך כל צליל? כאן: טה, טה, טה־א. שני רבעים וחצי.' },
        play: [melody([64, 62, 60], [1, 1, 2], 70)],
        show: { notes: [64, 62, 60], key: 'C', durs: [1, 1, 2], text: { en: 'ta ta ta-a', he: 'טה טה טה־א' } },
      },
      {
        say: { en: 'Eighth notes come in pairs, two to a beat: ti-ti. Listen: ta, ti-ti, ta, ta.', he: 'שמיניות מגיעות בזוגות, שתיים בפעמה: טי־טי. הקשיבו: טה, טי־טי, טה, טה.' },
        play: [melody([64, 65, 64, 62, 60], [1, 0.5, 0.5, 1, 1], 76)],
        show: { notes: [64, 65, 64, 62, 60], key: 'C', durs: [1, 0.5, 0.5, 1, 1], text: { en: 'ta ti-ti ta ta', he: 'טה טי־טי טה טה' } },
      },
      {
        say: { en: 'And the dotted quarter: long, then short — ta-i ti.', he: 'והרבע המנוקד: ארוך, ואז קצר — טה־אי טי.' },
        play: [melody([60, 64, 62, 60], [1.5, 0.5, 1, 1], 80)],
        show: { notes: [60, 64, 62, 60], key: 'C', durs: [1.5, 0.5, 1, 1], text: { en: 'ta-i ti ta ta', he: 'טה־אי טי טה טה' } },
      },
      {
        say: { en: 'Your turn! Hear a bar, say its degrees in order, then pick the rhythm you heard. Notes first, rhythm second — one thing at a time.', he: 'תורכם! שומעים תיבה, אומרים את הדרגות לפי הסדר, ואז בוחרים את הקצב ששמעתם. קודם צלילים, אחר כך קצב — דבר אחד בכל פעם.' },
        show: { text: { en: 'degrees → rhythm', he: 'דרגות → קצב' } },
      },
    ],
    more: [
      {
        say: { en: 'Melodic dictation means writing down a melody you hear: its pitches, its rhythm and its meter. Professionals work in stages, and so should you.', he: 'הכתבה מלודית פירושה לכתוב מנגינה ששומעים: את הגבהים, את הקצב ואת המשקל. מקצוענים עובדים בשלבים, וכדאי שגם אתם.' },
        play: [cad(G), rest(0.3), melody([67, 71, 69, 67], [1, 1, 1, 1], 72)],
        show: { notes: [67, 71, 69, 67], key: 'G', durs: [1, 1, 1, 1], text: { en: '1 3 2 1', he: '1 3 2 1' } },
      },
      {
        say: { en: 'Before writing anything, gather three facts: the key, the first note’s degree, and the beat. Tap along and count how many beats make a bar — usually four or three.', he: 'לפני שכותבים משהו, אוספים שלוש עובדות: הסולם, הדרגה של הצליל הראשון, והפעמה. תופפו יחד וספרו כמה פעמות יש בתיבה — בדרך כלל ארבע או שלוש.' },
        show: { text: { en: 'key · first note · beat', he: 'סולם · צליל ראשון · פעמה' } },
      },
      {
        say: { en: 'Pass one, pitches. Sketch the contour first — up, down, same — then fill in exact degrees, checking each against home. This one: 1, 3, 2, 5.', he: 'מעבר ראשון, גבהים. קודם משרטטים את הקונטור — למעלה, למטה, אותו צליל — ואז ממלאים דרגות מדויקות, ובודקים כל אחת מול הבית. כאן: 1, 3, 2, 5.' },
        play: [cad(C), melody([60, 64, 62, 67], [1, 1, 1, 1], 72)],
        show: { notes: [60, 64, 62, 67], key: 'C', text: { en: '1 3 2 5', he: '1 3 2 5' } },
      },
      {
        say: { en: 'Pass two, rhythm. Tap the beat and notice which notes take one beat, which share a beat, and which hold longer. Here: two eighths, then three quarters.', he: 'מעבר שני, קצב. תופפו את הפעמה ושימו לב אילו צלילים לוקחים פעמה אחת, אילו חולקים פעמה, ואילו נמשכים יותר. כאן: שתי שמיניות, ואז שלושה רבעים.' },
        play: [melody([60, 62, 64, 65, 67], [0.5, 0.5, 1, 1, 1], 76)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', durs: [0.5, 0.5, 1, 1, 1], text: { en: 'ti-ti ta ta ta', he: 'טי־טי טה טה טה' } },
      },
      {
        say: { en: 'A dot adds half the note’s value. A dotted quarter lasts one and a half beats and is usually followed by an eighth; a dotted half lasts three beats.', he: 'נקודה מוסיפה חצי מערך התו. רבע מנוקד נמשך פעמה וחצי ובדרך כלל אחריו באה שמינית; חצי מנוקד נמשך שלוש פעמות.' },
        play: [melody([67, 65, 64, 62], [1.5, 0.5, 1, 1], 76), rest(0.3), melody([64, 60], [3, 1], 76)],
        show: { notes: [67, 65, 64, 62], key: 'C', durs: [1.5, 0.5, 1, 1], text: { en: 'ta-i ti ta ta', he: 'טה־אי טי טה טה' } },
      },
      {
        say: { en: 'Do not write during the first hearing. Listen, sing it back in your head, then write. On every replay, fill in only what is still missing.', he: 'אל תכתבו בהשמעה הראשונה. הקשיבו, שירו בראש, ורק אז כתבו. בכל השמעה חוזרת, השלימו רק את מה שעוד חסר.' },
        show: { text: { en: 'listen · sing · write', he: 'מקשיבים · שרים · כותבים' } },
      },
      {
        say: { en: 'The common mistake is straightening uneven rhythms. A dotted figure easily turns into even quarters on paper. Clap it back before choosing. Dotted, then even:', he: 'הטעות הנפוצה היא ליישר קצבים לא שווים. צורה מנוקדת הופכת בקלות לרבעים שווים על הדף. מחאו אותה בחזרה לפני שבוחרים. מנוקד, ואז שווה:' },
        play: [melody([60, 60, 62, 64], [1.5, 0.5, 1, 1], 80), rest(0.4), melody([60, 60, 62, 64], [1, 1, 1, 1], 80)],
        show: { notes: [60, 60, 62, 64], key: 'C', durs: [1.5, 0.5, 1, 1], text: { en: 'ta-i ti ≠ ta ta', he: 'טה־אי טי ≠ טה טה' } },
      },
      {
        say: { en: 'Dictation is the heart of ear-training exams and of transcribing solos. The same two passes work for one bar or a whole song.', he: 'הכתבה היא הלב של מבחני פיתוח שמיעה ושל תמלול סולואים. אותם שני מעברים עובדים לתיבה אחת או לשיר שלם.' },
        show: { text: { en: 'pitches → rhythm', he: 'גבהים → קצב' } },
      },
      {
        say: { en: 'Recap: key, first note and beat first; then degrees; then rhythm. Listen before you write.', he: 'לסיכום: קודם סולם, צליל ראשון ופעמה; אחר כך דרגות; ואז קצב. מקשיבים לפני שכותבים.' },
        show: { text: { en: 'listen → degrees → rhythm', he: 'מקשיבים → דרגות → קצב' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Absolute pitch corner
  {
    id: 'absolute-pitch',
    area: 'ear',
    emoji: '🎯',
    title: { en: 'Absolute pitch corner', he: 'פינת השמיעה המוחלטת' },
    takeaway: { en: 'Absolute pitch is rare and optional; relative pitch is the main goal. Here you train a feel for each note’s color.', he: 'שמיעה מוחלטת היא נדירה ולא חובה; שמיעה יחסית היא המטרה העיקרית. כאן מאמנים תחושה ל"צבע" של כל צליל.' },
    steps: [
      {
        say: { en: 'Hey {name}! Welcome to a bonus corner. Absolute pitch means naming a note with no reference at all — no key, no chords. Like this A.', he: 'היי {name}! ברוכים הבאים לפינת בונוס. שמיעה מוחלטת פירושה לזהות צליל בלי שום נקודת ייחוס — בלי סולם, בלי אקורדים. כמו הלה הזה.' },
        play: [note(69, 1.6)],
        show: { notes: [69], text: { en: 'A', he: 'לה' } },
      },
      {
        say: { en: 'Honest truth: full absolute pitch is rare, and few adults ever gain it. Most great musicians rely on relative pitch — hearing how notes relate.', he: 'האמת בכנות: שמיעה מוחלטת מלאה היא נדירה, ומעט מבוגרים רוכשים אותה. רוב המוזיקאים הגדולים נשענים על שמיעה יחסית — לשמוע את היחסים בין הצלילים.' },
        play: [notes([60, 60, 67, 67], 0.4), rest(0.3), notes([62, 62, 69, 69], 0.4)],
        show: { text: { en: 'same tune, any key = relative', he: 'אותה מנגינה, כל סולם = יחסית' } },
      },
      {
        say: { en: 'Still, many people find each note has a faint color of its own, and practice sharpens that feel. That is what we play with here.', he: 'ובכל זאת, הרבה אנשים מגלים שלכל צליל יש "צבע" עדין משלו, ותרגול מחדד את התחושה הזאת. עם זה נשחק כאן.' },
        play: [note(60, 1.2), rest(0.3), note(64, 1.2)],
        show: { notes: [60, 64], text: { en: 'C · E', he: 'דו · מי' } },
      },
      {
        say: { en: 'Before each note you hear a messy cluster. It is no mistake: it wipes the last note from memory, so you cannot sneak in relative pitch.', he: 'לפני כל צליל תשמעו קלאסטר מבולגן. זו לא טעות: הוא מוחק את הצליל הקודם מהזיכרון, כדי שלא תוכלו להתגנב עם שמיעה יחסית.' },
        play: [chord([55, 56, 61, 66, 68], 0.5), rest(0.9), note(62, 1.3)],
        show: { text: { en: 'cluster → note', he: 'קלאסטר → צליל' } },
      },
      {
        say: { en: 'The first level uses only the white keys: C, D, E, F, G, A, B.', he: 'הרמה הראשונה משתמשת רק בקלידים הלבנים: דו, רה, מי, פה, סול, לה, סי.' },
        play: [notes(C_MAJOR, 0.5)],
        show: { notes: C_MAJOR, key: 'C', text: { en: 'C D E F G A B', he: 'דו רה מי פה סול לה סי' } },
      },
      {
        say: { en: 'Your turn! Hear a note, pick its name. Guess freely — this score is tracked apart from your other skills, so it cannot hurt them.', he: 'תורכם! שומעים צליל ובוחרים את השם שלו. נחשו בחופשיות — הציון כאן נמדד בנפרד מהמיומנויות האחרות, אז הוא לא יכול לפגוע בהן.' },
        show: { text: { en: 'which note?', he: 'איזה צליל?' } },
      },
    ],
    more: [
      {
        say: { en: 'Absolute pitch, also called perfect pitch, is naming or singing a note with no reference. Relative pitch names notes by their relation to a known note or key. Most professional musicians rely on relative pitch.', he: 'שמיעה מוחלטת היא היכולת לזהות או לשיר צליל בלי שום נקודת ייחוס. שמיעה יחסית מזהה צלילים לפי היחס שלהם לצליל או לסולם ידועים. רוב המוזיקאים המקצועיים נשענים על שמיעה יחסית.' },
        play: [note(62, 1.6)],
        show: { notes: [62], text: { en: 'D — no reference', he: 'רה — בלי נקודת ייחוס' } },
      },
      {
        say: { en: 'Research links full absolute pitch to musical training in early childhood, and it is more common among speakers of tonal languages. Adults can improve with practice, but rarely reach effortless, instant naming.', he: 'מחקרים קושרים שמיעה מוחלטת מלאה ללימוד מוזיקה בגיל הילדות המוקדמת, והיא נפוצה יותר בקרב דוברי שפות טונאליות. מבוגרים יכולים להשתפר בתרגול, אבל רק לעיתים רחוקות מגיעים לזיהוי מיידי וללא מאמץ.' },
        show: { text: { en: 'rare · trainable in part', he: 'נדירה · ניתנת לאימון חלקי' } },
      },
      {
        say: { en: 'Many people without it still have pitch memory: asked to sing a favorite recording, they often land close to its original key. The ear stores pitch even when naming it takes training.', he: 'להרבה אנשים בלי שמיעה מוחלטת יש בכל זאת זיכרון צלילי: כשמבקשים מהם לשיר הקלטה אהובה, הם נוחתים הרבה פעמים קרוב לסולם המקורי. האוזן שומרת גובה גם כשלתת לו שם דורש אימון.' },
        show: { text: { en: 'pitch memory', he: 'זיכרון צלילי' } },
      },
      {
        say: { en: 'How to practice: start with one or two anchor notes, say A and C. Listen for their character, then compare each new note to an anchor before you guess.', he: 'איך מתרגלים: מתחילים מצליל עוגן אחד או שניים, למשל לה ודו. מקשיבים לאופי שלהם, ומשווים כל צליל חדש לעוגן לפני שמנחשים.' },
        play: [note(69, 1.4), rest(0.4), note(60, 1.4)],
        show: { notes: [69, 60], text: { en: 'anchors: A · C', he: 'עוגנים: לה · דו' } },
      },
      {
        say: { en: 'A note’s color shifts with register and instrument, so you are learning its name, not its height. Here is C in three octaves — the same note class each time.', he: 'הצבע של צליל משתנה עם הרגיסטר והכלי, אז אתם לומדים את השם שלו, לא את הגובה. הנה דו בשלוש אוקטבות — אותו צליל בכל פעם.' },
        play: [notes([48, 60, 72], 1.0)],
        show: { notes: [48, 60, 72], text: { en: 'C · C · C', he: 'דו · דו · דו' } },
      },
      {
        say: { en: 'The common mistake is quietly measuring from the previous note. That is relative pitch in disguise — a great skill, but here the cluster breaks the chain on purpose. Judge each note fresh.', he: 'הטעות הנפוצה היא למדוד בשקט מהצליל הקודם. זו שמיעה יחסית בתחפושת — מיומנות מצוינת, אבל כאן הקלאסטר שובר את השרשרת בכוונה. שפטו כל צליל מחדש.' },
        play: [chord([55, 56, 61, 66, 68], 0.5), rest(0.9), note(65, 1.4)],
        show: { text: { en: 'cluster → fresh note', he: 'קלאסטר → צליל חדש' } },
      },
      {
        say: { en: 'Even partial pitch memory is useful: it helps you sense a song’s key quickly and start singing closer to the right pitch.', he: 'גם זיכרון צלילי חלקי מועיל: הוא עוזר לחוש מהר את הסולם של שיר ולהתחיל לשיר קרוב יותר לגובה הנכון.' },
        show: { text: { en: 'a useful extra', he: 'תוספת שימושית' } },
      },
      {
        say: { en: 'Recap: absolute pitch is a bonus, relative pitch is the foundation. Train with anchor notes, and judge each note fresh.', he: 'לסיכום: שמיעה מוחלטת היא בונוס, שמיעה יחסית היא הבסיס. מתאמנים עם צלילי עוגן, ושופטים כל צליל מחדש.' },
        show: { text: { en: 'anchors · fresh ears', he: 'עוגנים · אוזן רעננה' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Modes by ear
  {
    id: 'modes',
    area: 'ear',
    emoji: '🌈',
    title: { en: 'Modes by ear', he: 'מודוסים בשמיעה' },
    takeaway: { en: 'Find the third (bright or dark), then the one odd note: Dorian has a raised 6th, Mixolydian a flat 7th.', he: 'מוצאים את הטרצה (בהירה או כהה), ואז את הצליל החריג: בדורי דרגה 6 מוגבהת, במיקסולידי ♭7.' },
    steps: [
      {
        say: { en: 'Hi {name}! A mode is a scale with its own mood. Same home note, a few notes shifted — and the color changes. Ionian is plain major.', he: 'היי {name}! מודוס הוא סולם עם מצב רוח משלו. אותו צליל בית, כמה צלילים זזים — והצבע משתנה. יוני הוא פשוט מז׳ור.' },
        play: [note(60, 0.9), rest(0.3), notes(upDown(C_IONIAN), 0.38)],
        show: { notes: C_IONIAN, text: { en: 'Ionian: 1 2 3 4 5 6 7', he: 'יוני: 1 2 3 4 5 6 7' } },
      },
      {
        say: { en: 'Aeolian is natural minor: the 3rd, 6th and 7th are all a half step lower. Darker, more serious.', he: 'איאולי הוא המינור הטבעי: דרגות 3, 6 ו־7 מונמכות כולן בחצי טון. כהה ורציני יותר.' },
        play: [note(60, 0.9), rest(0.3), notes(upDown(C_AEOLIAN), 0.38)],
        show: { notes: C_AEOLIAN, text: { en: 'Aeolian: 1 2 ♭3 4 5 ♭6 ♭7', he: 'איאולי: 1 2 ♭3 4 5 ♭6 ♭7' } },
      },
      {
        say: { en: 'Dorian is minor with a bright 6th — dark, but with a hopeful lift.', he: 'דורי הוא מינור עם דרגה 6 מוגבהת — כהה, אבל עם הרמה מלאת תקווה.' },
        play: [note(60, 0.9), rest(0.3), notes(C_DORIAN, 0.4)],
        show: { notes: C_DORIAN, text: { en: 'Dorian: 1 2 ♭3 4 5 6 ♭7', he: 'דורי: 1 2 ♭3 4 5 6 ♭7' } },
      },
      {
        say: { en: 'Mixolydian is major with a flat 7th — bluesy, a bit rock and roll.', he: 'מיקסולידי הוא מז׳ור עם ספטימה קטנה (♭7) — בלוזי, קצת רוקנרול.' },
        play: [note(60, 0.9), rest(0.3), notes(C_MIXO, 0.4)],
        show: { notes: C_MIXO, text: { en: 'Mixolydian: 1 2 3 4 5 6 ♭7', he: 'מיקסולידי: 1 2 3 4 5 6 ♭7' } },
      },
      {
        say: { en: 'The trick: first the third — bright family or dark family? Then hunt for the odd note. Here: Aeolian top, then Dorian top. Hear the 6th lift?', he: 'הטריק: קודם הטרצה — משפחה בהירה או כהה? ואז מחפשים את הצליל החריג. הנה: החלק העליון באיאולי, ואז בדורי. שומעים את דרגה 6 עולה?' },
        play: [notes([67, 68, 70, 72], 0.45), rest(0.4), notes([67, 69, 70, 72], 0.45)],
        show: { notes: [68, 69], text: { en: '♭6 → 6', he: '♭6 → 6' } },
      },
      {
        say: { en: 'Your turn! I play home, then a scale up and down. Name the mode. Higher levels add more modes — same trick, a different odd note.', he: 'תורכם! אני מנגן את הבית, ואז סולם למעלה ולמטה. אמרו איזה מודוס זה. ברמות גבוהות יותר מתווספים מודוסים — אותו טריק, צליל חריג אחר.' },
        show: { text: { en: 'which mode?', he: 'איזה מודוס?' } },
      },
    ],
    more: [
      {
        say: { en: 'The modes are seven scales made from the major scale’s notes, each starting on a different degree. Using only white keys: from C you get Ionian, from D Dorian, from G Mixolydian, from A Aeolian.', he: 'המודוסים הם שבעה סולמות שבנויים מהצלילים של סולם המז׳ור, וכל אחד מתחיל בדרגה אחרת. רק על הקלידים הלבנים: מדו מקבלים יוני, מרה דורי, מסול מיקסולידי, מלה איאולי.' },
        play: [notes([62, 64, 65, 67, 69, 71, 72, 74], 0.38)],
        show: { notes: [62, 64, 65, 67, 69, 71, 72, 74], text: { en: 'D E F G A B C D = D Dorian', he: 'רה מי פה סול לה סי דו רה = רה דורי' } },
      },
      {
        say: { en: 'For the ear, it is easier to compare modes on the same home note, as this exercise does. Then each mode is simply major or minor with one or two notes changed.', he: 'לאוזן קל יותר להשוות מודוסים על אותו צליל בית, כמו בתרגיל הזה. אז כל מודוס הוא פשוט מז׳ור או מינור עם צליל אחד או שניים שהשתנו.' },
        play: [note(60, 0.8), notes(C_IONIAN, 0.32), rest(0.3), notes(C_MIXO, 0.32)],
        show: { notes: [71, 70], text: { en: 'Ionian 7 · Mixolydian ♭7', he: 'יוני 7 · מיקסולידי ♭7' } },
      },
      {
        say: { en: 'Two more you will meet. Lydian is major with a raised 4: dreamy and floating, a favorite of film composers.', he: 'עוד שניים שתפגשו. לידי הוא מז׳ור עם דרגה 4 מוגבהת: חלומי ומרחף, אהוב על מלחיני סרטים.' },
        play: [note(60, 0.8), notes([60, 62, 64, 66, 67, 69, 71, 72], 0.38)],
        show: { notes: [60, 62, 64, 66, 67, 69, 71, 72], text: { en: 'Lydian: 1 2 3 ♯4 5 6 7', he: 'לידי: 1 2 3 ♯4 5 6 7' } },
      },
      {
        say: { en: 'Phrygian is minor with a flat 2, a half step above home: dark and tense, heard in flamenco and metal. Locrian, with ♭2 and ♭5, is the rarest and darkest.', he: 'פריגי הוא מינור עם ♭2, חצי טון מעל הבית: כהה ומתוח, נשמע בפלמנקו ובמטאל. לוקרי, עם ♭2 ו־♭5, הוא הנדיר והכהה מכולם.' },
        play: [note(60, 0.8), notes([60, 61, 63, 65, 67, 68, 70, 72], 0.38)],
        show: { notes: [60, 61, 63, 65, 67, 68, 70, 72], text: { en: 'Phrygian: 1 ♭2 ♭3 4 5 ♭6 ♭7', he: 'פריגי: 1 ♭2 ♭3 4 5 ♭6 ♭7' } },
      },
      {
        say: { en: 'The method: settle home, decide major or minor third, then hunt the characteristic note — ♯4 Lydian, ♭7 Mixolydian, 6 Dorian, ♭2 Phrygian. If nothing stands out, it is plain major or natural minor.', he: 'השיטה: נוחתים על הבית, מחליטים טרצה גדולה או קטנה, ואז מחפשים את הצליל האופייני — ♯4 לידי, ♭7 מיקסולידי, 6 דורי, ♭2 פריגי. אם שום דבר לא בולט, זה מז׳ור רגיל או מינור טבעי.' },
        show: { text: { en: '3rd → odd note → mode', he: 'טרצה → צליל חריג → מודוס' } },
      },
      {
        say: { en: 'Each mode’s color also lives in a chord. Dorian sounds like a minor chord with a major 6th; Mixolydian like a dominant 7th chord. Here are Cm6 and C7.', he: 'הצבע של כל מודוס חי גם באקורד. דורי נשמע כמו אקורד מינור עם סקסטה גדולה; מיקסולידי כמו אקורד דומיננט־ספטימה. הנה Cm6 ו־C7.' },
        play: [chord([48, 60, 63, 67, 69], 1.6), rest(0.3), chord([48, 60, 64, 67, 70], 1.6)],
        show: { notes: [48, 60, 63, 67, 69], chord: true, text: { en: 'Cm6 · C7', he: 'Cm6 · C7' } },
      },
      {
        say: { en: 'The common mistake is hearing Dorian as major because of its bright 6. Check the third first: Dorian’s is minor. The 6 only lifts a minor scale.', he: 'הטעות הנפוצה היא לשמוע דורי כמז׳ור בגלל דרגה 6 הבהירה. בדקו קודם את הטרצה: בדורי היא קטנה. דרגה 6 רק מרימה סולם מינורי.' },
        play: [note(60, 0.8), notes([60, 62, 63, 65, 67, 69, 70, 72], 0.38)],
        show: { notes: [63, 69], text: { en: '♭3 … 6 = Dorian', he: '♭3 … 6 = דורי' } },
      },
      {
        say: { en: 'In real music, Mixolydian fills rock and folk riffs, Aeolian is the everyday sound of minor pop, and Dorian is central to modal jazz — Miles Davis’s “So What” is built on it.', he: 'במוזיקה אמיתית, מיקסולידי ממלא ריפים של רוק ופולק, איאולי הוא הצליל היומיומי של פופ במינור, ודורי מרכזי בג׳ז מודאלי — "So What" של מיילס דייוויס בנוי עליו.' },
        show: { text: { en: 'rock · pop · modal jazz', he: 'רוק · פופ · ג׳ז מודאלי' } },
      },
      {
        say: { en: 'Recap: same home, different colors. Third first, then the characteristic note names the mode.', he: 'לסיכום: אותו בית, צבעים שונים. קודם הטרצה, ואז הצליל האופייני נותן למודוס את השם.' },
        show: { text: { en: 'third → characteristic note', he: 'טרצה → צליל אופייני' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Spot the wrong note
  {
    id: 'wrong-notes',
    area: 'ear',
    emoji: '🔍',
    title: { en: 'Spot the wrong note', he: 'מצאו את הצליל השגוי' },
    takeaway: { en: 'Sing the right scale in your head along with the one you hear: the note where you disagree is the wrong one.', he: 'שירו בראש את הסולם הנכון יחד עם מה שאתם שומעים: הצליל שבו אתם לא מסכימים הוא השגוי.' },
    steps: [
      {
        say: { en: 'Hi {name}! Detective time. I play a scale with one note bent out of place — you find it. First, the real thing: C major.', he: 'היי {name}! זמן בלשות. אני מנגן סולם שבו צליל אחד עקום — ואתם מוצאים אותו. קודם, המקור: דו מז׳ור.' },
        play: [note(60, 0.9), rest(0.3), notes(C_IONIAN, 0.5)],
        show: { notes: C_IONIAN, key: 'C', text: { en: '1 2 3 4 5 6 7 8', he: '1 2 3 4 5 6 7 8' } },
      },
      {
        say: { en: 'Now number 4 is a half step too high: F became F-sharp. Hear it stick out?', he: 'עכשיו מספר 4 גבוה מדי בחצי טון: פה הפך לפה דיאז. שומעים איך הוא בולט?' },
        play: [note(60, 0.9), rest(0.3), notes([60, 62, 64, 66, 67, 69, 71, 72], 0.5)],
        show: { notes: [60, 62, 64, 66, 67, 69, 71, 72], key: 'C', text: { en: '1 2 3 ♯4 5 6 7 8', he: '1 2 3 ♯4 5 6 7 8' } },
      },
      {
        say: { en: 'Wrong notes can also slip down. Here number 6 drops: A became A-flat.', he: 'צליל שגוי יכול גם להחליק למטה. כאן מספר 6 יורד: לה הפך ללה במול.' },
        play: [note(60, 0.9), rest(0.3), notes([60, 62, 64, 65, 67, 68, 71, 72], 0.5)],
        show: { notes: [60, 62, 64, 65, 67, 68, 71, 72], key: 'C', text: { en: '1 2 3 4 5 ♭6 7 8', he: '1 2 3 4 5 ♭6 7 8' } },
      },
      {
        say: { en: 'The trick: sing the right scale in your head along with mine, and count. That one was number 3 — E became E-flat.', he: 'הטריק: שירו בראש את הסולם הנכון יחד איתי, וספרו. זה היה מספר 3 — מי הפך למי במול.' },
        play: [note(60, 0.9), rest(0.3), notes([60, 62, 63, 65, 67, 69, 71, 72], 0.5)],
        playFirst: true,
        show: { notes: [60, 62, 63, 65, 67, 69, 71, 72], key: 'C', text: { en: '1 2 ♭3 4 5 6 7 8', he: '1 2 ♭3 4 5 6 7 8' } },
      },
      {
        say: { en: 'Your turn. I play home, then the scale. Say the number of the wrong note — home and the top are always right.', he: 'תורכם. אני מנגן את הבית, ואז את הסולם. אמרו את המספר של הצליל השגוי — הבית והצליל העליון תמיד נכונים.' },
        show: { text: { en: 'which number?', he: 'איזה מספר?' } },
      },
    ],
    more: [
      {
        say: { en: 'Spotting a wrong note means comparing what you hear with what you expect. Once home is set, your ear predicts each next step of the scale; a wrong note breaks that prediction.', he: 'לזהות צליל שגוי פירושו להשוות בין מה ששומעים למה שמצפים. ברגע שהבית נקבע, האוזן צופה את הצעד הבא בסולם; צליל שגוי שובר את הציפייה הזאת.' },
        play: [cad(C), notes(C_IONIAN, 0.4)],
        show: { notes: C_IONIAN, key: 'C', text: { en: 'expected: 1–8', he: 'הצפוי: 1–8' } },
      },
      {
        say: { en: 'Every wrong note distorts the pattern of whole and half steps. Raise 4 to F-sharp, and the half step moves: 3 to 4 becomes a whole step, 4 to 5 a half step.', he: 'כל צליל שגוי מעוות את תבנית הטונים וחצאי הטונים. מגביהים את 4 לפה דיאז, וחצי הטון זז: מ־3 ל־4 נהיה טון שלם, ומ־4 ל־5 חצי טון.' },
        play: [notes([64, 65, 67], 0.55), rest(0.3), notes([64, 66, 67], 0.55)],
        show: { notes: [64, 65, 66, 67], key: 'C', text: { en: 'E F G · E F♯ G', he: 'מי פה סול · מי פה♯ סול' } },
      },
      {
        say: { en: 'Raised notes tend to sound sharp and pushy, pulling upward. Lowered notes sound darker; a lowered 3, 6 or 7 hints at minor or blues. Here, 7 drops to B-flat.', he: 'צלילים מוגבהים נשמעים בדרך כלל חדים ודוחפים, נמשכים למעלה. צלילים מונמכים נשמעים כהים יותר; 3, 6 או 7 מונמכים רומזים על מינור או בלוז. כאן, 7 יורד לסי במול.' },
        play: [note(60, 0.8), notes(C_MIXO, 0.4)],
        show: { notes: C_MIXO, key: 'C', text: { en: '1 2 3 4 5 6 ♭7 8', he: '1 2 3 4 5 6 ♭7 8' } },
      },
      {
        say: { en: 'The method: sing the correct scale silently, a hair ahead of the piano. The moment your inner voice and the piano disagree, note the number. On replay, check: higher or lower?', he: 'השיטה: שירו בשקט את הסולם הנכון, טיפה לפני הפסנתר. ברגע שהקול הפנימי והפסנתר לא מסכימים, רשמו את המספר. בהשמעה הבאה בדקו: גבוה יותר או נמוך יותר?' },
        play: [note(60, 0.8), notes([60, 61, 64, 65, 67, 69, 71, 72], 0.45)],
        show: { notes: [60, 61, 64, 65, 67, 69, 71, 72], key: 'C', text: { en: '1 ♭2 3 4 5 6 7 8', he: '1 ♭2 3 4 5 6 7 8' } },
      },
      {
        say: { en: 'The common mistake is blaming the note after the wrong one. A wrong note makes the next step sound odd too, because the gap is wrong on both sides. The first surprise is usually the culprit.', he: 'הטעות הנפוצה היא להאשים את הצליל שאחרי השגוי. צליל שגוי גורם גם לצעד הבא להישמע מוזר, כי המרווח שגוי משני הצדדים. ההפתעה הראשונה היא בדרך כלל האשמה.' },
        play: [notes([60, 62, 64, 66, 67], 0.55)],
        show: { notes: [60, 62, 64, 66, 67], key: 'C', text: { en: '♯4, not 5', he: '♯4, לא 5' } },
      },
      {
        say: { en: 'To go further, practice descending scales too: sing down from 8 to 1 so your expectation works in both directions.', he: 'כדי להתקדם, תרגלו גם סולמות יורדים: שירו מ־8 עד 1 כדי שהציפייה תעבוד בשני הכיוונים.' },
        play: [notes([72, 71, 69, 67, 65, 64, 62, 60], 0.4)],
        show: { notes: [72, 71, 69, 67, 65, 64, 62, 60], key: 'C', text: { en: '8 7 6 5 4 3 2 1', he: '8 7 6 5 4 3 2 1' } },
      },
      {
        say: { en: 'In real music, this is proofreading: catching a wrong note in a chart, in your own playing, or in a choir. It also helps you notice chromatic notes a composer added on purpose.', he: 'במוזיקה אמיתית, זו הגהה: לתפוס צליל שגוי בתווים, בנגינה שלכם או במקהלה. זה גם עוזר לשים לב לצלילים כרומטיים שמלחין הוסיף בכוונה.' },
        show: { text: { en: 'proofreading by ear', he: 'הגהה בשמיעה' } },
      },
      {
        say: { en: 'Recap: keep the right scale running in your head, mark the first disagreement, then decide whether it was raised or lowered.', he: 'לסיכום: הריצו בראש את הסולם הנכון, סמנו את אי ההסכמה הראשונה, ואז החליטו אם הצליל הוגבה או הונמך.' },
        show: { text: { en: 'expect · compare · mark', he: 'מצפים · משווים · מסמנים' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Riffs & runs
  {
    id: 'runs',
    area: 'voice',
    emoji: '⚡',
    title: { en: 'Riffs & runs', he: 'ריפים וראנים' },
    takeaway: { en: 'A run is a fast scale passage on one vowel: know its scale (major, pentatonic, blues) and its shape, then sing it slow and clean before fast.', he: 'ראן הוא קטע סולמי מהיר על תנועה אחת: מכירים את הסולם (מז׳ור, פנטטוני, בלוז) ואת הצורה, ושרים לאט ונקי לפני מהר.' },
    steps: [
      {
        say: { en: 'Hey {name}! A run is a quick string of notes sung on one vowel — the sparkle singers add to a melody. Runs are built from scales. This one is major: bright and clean.', he: 'היי {name}! ראן הוא רצף מהיר של צלילים על תנועה אחת — הנצנוץ שזמרים מוסיפים למנגינה. ראנים בנויים מסולמות. זה במז׳ור: בהיר ונקי.' },
        play: [cad(C), rest(0.3), notes([60, 62, 64, 65, 67, 69], 0.33)],
        show: { notes: [60, 62, 64, 65, 67, 69], key: 'C', text: { en: 'major', he: 'מז׳ור' } },
      },
      {
        say: { en: 'The minor pentatonic has just five notes per octave, with bigger gaps. Soulful — an R&B favorite.', he: 'בפנטטוני מינורי יש רק חמישה צלילים באוקטבה, עם רווחים גדולים יותר. נשמתי — אהוב במיוחד בר׳נ׳ב.' },
        play: [cad(C), rest(0.3), notes([60, 63, 65, 67, 70, 72], 0.33)],
        show: { notes: [60, 63, 65, 67, 70, 72], text: { en: 'C E♭ F G B♭ C', he: 'דו מי♭ פה סול סי♭ דו' } },
      },
      {
        say: { en: 'Blues adds one spicy extra: the flat 5, squeezed between 4 and 5. Hear the crunch?', he: 'בלוז מוסיף תבלין אחד: ה־♭5 (הבלו נוט), דחוסה בין 4 ל־5. שומעים את החריקה?' },
        play: [cad(C), rest(0.3), notes([60, 63, 65, 66, 67, 70], 0.33)],
        show: { notes: [60, 63, 65, 66, 67, 70], text: { en: 'C E♭ F G♭ G B♭', he: 'דו מי♭ פה סול♭ סול סי♭' } },
      },
      {
        say: { en: 'Runs also have a shape: going up, going down, or a turn — up and back.', he: 'לראנים יש גם צורה: עולה, יורדת, או סיבוב — למעלה ובחזרה.' },
        play: [notes([60, 62, 64, 65, 67], 0.37), rest(0.4), notes([67, 65, 64, 62, 60], 0.37), rest(0.4), notes([60, 62, 64, 62, 60], 0.37)],
        show: { text: { en: 'up · down · turn', he: 'עולה · יורדת · סיבוב' } },
      },
      {
        say: { en: 'To sing one: start slow on "ah", keep every note separate and clean, then speed up. Clean beats fast!', he: 'כדי לשיר ראן: מתחילים לאט על "אה", שומרים על כל צליל נפרד ונקי, ואז מאיצים. נקי מנצח מהיר!' },
        play: [notes([60, 62, 64, 62, 60], 0.6)],
        show: { notes: [60, 62, 64, 62, 60], key: 'C', text: { en: 'slow → fast', he: 'לאט → מהר' } },
      },
      {
        say: { en: 'Your turn! First say the scale — major, pentatonic or blues — and the shape. Then sing runs back after me. Breathe low, keep it light.', he: 'תורכם! קודם אמרו את הסולם — מז׳ור, פנטטוני או בלוז — ואת הצורה. ואז שירו ראנים בחזרה אחריי. נשימה עמוקה, וקליל.' },
        show: { text: { en: 'name it · sing it', he: 'מזהים · שרים' } },
      },
    ],
    more: [
      {
        say: { en: 'A run, or riff, is a quick ornament sung on one syllable — a melisma. It decorates a melody note, often at the end of a phrase, and always fits the scale and chord underneath.', he: 'ראן, או ריף, הוא קישוט מהיר שמושר על הברה אחת — מליסמה. הוא מקשט צליל במנגינה, הרבה פעמים בסוף משפט, ותמיד מתאים לסולם ולאקורד שמתחת.' },
        play: [cad(C), rest(0.2), notes([67, 69, 67, 64, 62, 60], 0.2), note(60, 1.0)],
        show: { notes: [67, 69, 67, 64, 62, 60], key: 'C', text: { en: '5 6 5 3 2 1', he: '5 6 5 3 2 1' } },
      },
      {
        say: { en: 'The scale sets the color. Major runs sound sweet and bright; the minor pentatonic, 1 ♭3 4 5 ♭7, sounds soulful; the blues scale adds ♭5 for grit.', he: 'הסולם קובע את הצבע. ראנים במז׳ור נשמעים מתוקים ובהירים; הפנטטוני המינורי, 1 ♭3 4 5 ♭7, נשמע נשמתי; סולם הבלוז מוסיף ♭5 בשביל חספוס.' },
        play: [notes([72, 70, 67, 65, 63, 60], 0.22), rest(0.4), notes([72, 70, 67, 66, 65, 63, 60], 0.22)],
        show: { notes: [72, 70, 67, 66, 65, 63, 60], text: { en: 'pentatonic · blues', he: 'פנטטוני · בלוז' } },
      },
      {
        say: { en: 'Pentatonic scales contain no half steps, so their notes rarely clash with the chord. That is why they are the standard material for runs in gospel, soul and R&B.', he: 'בסולמות פנטטוניים אין חצאי טונים, ולכן הצלילים שלהם כמעט לא מתנגשים באקורד. בגלל זה הם חומר הגלם הסטנדרטי לראנים בגוספל, בסול ובר׳נ׳ב.' },
        play: [notes([60, 62, 64, 67, 69, 72], 0.25), rest(0.3), chord([48, 60, 64, 67], 1.4)],
        show: { notes: [60, 62, 64, 67, 69, 72], key: 'C', text: { en: 'C D E G A C', he: 'דו רה מי סול לה דו' } },
      },
      {
        say: { en: 'Every run has a target: the note it lands on, usually a chord tone like 1, 3 or 5. Know where you will end, then fill the path. Descending runs are the most common and the easiest to sing.', he: 'לכל ראן יש יעד: הצליל שהוא נוחת עליו, בדרך כלל צליל מהאקורד כמו 1, 3 או 5. דעו איפה תסיימו, ואז מלאו את הדרך. ראנים יורדים הם הנפוצים והקלים ביותר לשירה.' },
        play: [notes([72, 69, 67, 64, 62], 0.2), note(60, 1.2)],
        show: { notes: [72, 69, 67, 64, 62, 60], key: 'C', text: { en: 'target: 1', he: 'יעד: 1' } },
      },
      {
        say: { en: 'Practice slowly on “ah”, one note per beat with a metronome. Double the speed only when every note is in tune. Grouping notes in threes or fours helps you keep your place.', he: 'מתרגלים לאט על "אה", צליל אחד בכל פעמה עם מטרונום. מכפילים מהירות רק כשכל צליל מדויק. חלוקת הצלילים לקבוצות של שלוש או ארבע עוזרת לא ללכת לאיבוד.' },
        play: [notes([67, 64, 62, 60], 0.5), rest(0.3), notes([67, 64, 62, 60], 0.25)],
        show: { notes: [67, 64, 62, 60], key: 'C', text: { en: 'slow → ×2', he: 'לאט → ×2' } },
      },
      {
        say: { en: 'Keep runs light: less volume, less breath pressure, a relaxed throat. Move the pitch, not the jaw. Heavy, loud runs smear the notes together.', he: 'שמרו על ראנים קלילים: פחות עוצמה, פחות לחץ אוויר, גרון רפוי. מזיזים את הגובה, לא את הלסת. ראנים כבדים וחזקים מורחים את הצלילים זה לתוך זה.' },
        show: { text: { en: 'light · relaxed · clear', he: 'קליל · רפוי · ברור' } },
      },
      {
        say: { en: 'The common mistake is sliding instead of singing separate notes. A clean run has a distinct pitch on every note, like beads on a string, not a siren.', he: 'הטעות הנפוצה היא להחליק במקום לשיר צלילים נפרדים. בראן נקי לכל צליל יש גובה ברור, כמו חרוזים על חוט, לא כמו סירנה.' },
        play: [notes([60, 62, 64, 65, 67], 0.25)],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: 'beads, not a siren', he: 'חרוזים, לא סירנה' } },
      },
      {
        say: { en: 'Runs are a hallmark of gospel, soul and R&B, and of Baroque arias, where long melismas show off the voice. Use them sparingly: one clean run says more than ten.', he: 'ראנים הם סימן היכר של גוספל, סול ור׳נ׳ב, וגם של אריות בארוק, שבהן מליסמות ארוכות מציגות את הקול. השתמשו בהם במשורה: ראן נקי אחד אומר יותר מעשרה.' },
        show: { text: { en: 'less is more', he: 'פחות זה יותר' } },
      },
      {
        say: { en: 'Recap: choose the scale, know the target, sing it slow and clean, then speed up.', he: 'לסיכום: בוחרים סולם, יודעים את היעד, שרים לאט ונקי, ואז מאיצים.' },
        show: { text: { en: 'scale · target · slow → fast', he: 'סולם · יעד · לאט → מהר' } },
      },
    ],
  },
];

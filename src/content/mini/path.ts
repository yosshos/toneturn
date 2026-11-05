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
        say: { en: 'Why 5? Count up the E-flat major scale: E-flat, F, G, A-flat, B-flat. Five steps from home.', he: 'למה 5? סופרים למעלה בסולם מי במול מז׳ור: מי במול, פה, סול, לה במול, סי במול. חמישה צעדים מהבית.' },
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
        say: { en: 'The root will change every round, but the colour does not. Here is G major, then G minor.', he: 'השורש ישתנה בכל סיבוב, אבל הצבע לא. הנה סול מז׳ור, ואז סול מינור.' },
        play: [chord([55, 59, 62], 1.4), rest(0.3), chord([55, 58, 62], 1.6)],
        show: { notes: [55, 58, 59, 62], text: { en: 'G → Gm', he: 'סול → סול מינור' } },
      },
      {
        say: { en: 'Your turn! I play a chord, you say "major" or "minor". Not sure? Hum the middle note: smiling means major, shaded means minor.', he: 'תורכם! אני מנגן אקורד, ואתם אומרים "מז׳ור" או "מינור". לא בטוחים? זמזמו את הצליל האמצעי: חיוך זה מז׳ור, צל זה מינור.' },
        show: { text: { en: 'major or minor?', he: 'מז׳ור או מינור?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 4. Cadence detective
  {
    id: 'cadences',
    area: 'harmony',
    emoji: '🕵️',
    title: { en: 'Cadence detective', he: 'בלש הקדנצות' },
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
        say: { en: 'Five is five steps up the scale: do, re, mi, fa, sol. Climb there and stop.', he: 'חמש זה חמישה צעדים למעלה בסולם: דו, רה, מי, פה, סול. מטפסים לשם ועוצרים.' },
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
        say: { en: 'Your turn! Hear the key and home, wait for the chime, then sing what I ask: home, or five. Breathe, relax your jaw — you got this.', he: 'תורכם! שומעים את הסולם ואת הבית, מחכים לצליל, ושרים מה שאבקש: את הבית, או את החמש. נשימה, לסת רפויה — אתם יכולים.' },
        show: { text: { en: '1 or 5 — sing it!', he: '1 או 5 — שירו!' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 6. Thirds, fifths, octaves
  {
    id: 'intervals',
    area: 'ear',
    emoji: '📏',
    title: { en: 'Thirds, fifths, octaves', he: 'טרצות, קווינטות, אוקטבות' },
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
        say: { en: 'Your turn! First the notes come one after the other, then together. Say "third", "fifth" or "octave". Easy does it!', he: 'תורכם! קודם הצלילים מגיעים בזה אחר זה, ואז ביחד. תגידו "טרצה", "קווינטה" או "אוקטבה". בנחת!' },
        play: [notes([57, 64], 0.9)],
        show: { text: { en: 'third, fifth or octave?', he: 'טרצה, קווינטה או אוקטבה?' } },
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
  },

  // ------------------------------------------------------------------ 8. Notes and degrees
  {
    id: 'notes-degrees',
    area: 'theory',
    emoji: '🔢',
    title: { en: 'Notes and degrees', he: 'תווים ודרגות' },
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
        say: { en: 'Your turn! I name a key, then ask for a note or a degree — or play one. Count from home. Fingers are totally allowed!', he: 'תורכם! אני אומר סולם, ואז שואל על תו או על דרגה — או מנגן אחד. סופרים מהבית. מותר לגמרי להיעזר באצבעות!' },
        show: { text: { en: 'note ↔ degree', he: 'תו ↔ דרגה' } },
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
        say: { en: 'Your turn! Echo the notes I play, then sing the notes I name, after the chime. Aim for the middle of the note — you can do it.', he: 'תורכם! חזרו על הצלילים שאני מנגן, ואז שירו את התווים שאני אומר, אחרי הצליל. כוונו לאמצע הצליל — אתם יכולים.' },
        show: { text: { en: 'echo · then by name', he: 'הד · ואז לפי שם' } },
      },
    ],
  },

  // ------------------------------------------------------------------ 10. Sing the degrees
  {
    id: 'sing-degrees',
    area: 'voice',
    emoji: '🪜',
    title: { en: 'Sing the degrees', he: 'לשיר את הדרגות' },
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
        say: { en: 'And 5, 6, 5 is a little neighbour: step up from 5 and come right back.', he: 'ו־5, 6, 5 הוא שכן קטן: צעד אחד למעלה מ־5 וחזרה מיד.' },
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
        say: { en: 'Your turn! I play an opening, you say its degrees in order — then I reveal the song. Once, you will sing one from its numbers. Feeling famous yet?', he: 'תורכם! אני מנגן פתיחה, ואתם אומרים את הדרגות לפי הסדר — ואז אני מגלה איזה שיר זה. פעם אחת גם תשירו שיר מהמספרים שלו. מרגישים כבר מפורסמים?' },
        show: { text: { en: 'degrees → song', he: 'דרגות → שיר' } },
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
  },

  // ------------------------------------------------------------------ Absolute pitch corner
  {
    id: 'absolute-pitch',
    area: 'ear',
    emoji: '🎯',
    title: { en: 'Absolute pitch corner', he: 'פינת השמיעה המוחלטת' },
    takeaway: { en: 'Absolute pitch is rare and optional; relative pitch is the main goal. Here you train a feel for each note’s colour.', he: 'שמיעה מוחלטת היא נדירה ולא חובה; שמיעה יחסית היא המטרה העיקרית. כאן מאמנים תחושה ל"צבע" של כל צליל.' },
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
        say: { en: 'Still, many people find each note has a faint colour of its own, and practice sharpens that feel. That is what we play with here.', he: 'ובכל זאת, הרבה אנשים מגלים שלכל צליל יש "צבע" עדין משלו, ותרגול מחדד את התחושה הזאת. עם זה נשחק כאן.' },
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
        say: { en: 'Hi {name}! A mode is a scale with its own mood. Same home note, a few notes shifted — and the colour changes. Ionian is plain major.', he: 'היי {name}! מודוס הוא סולם עם מצב רוח משלו. אותו צליל בית, כמה צלילים זזים — והצבע משתנה. יוני הוא פשוט מז׳ור.' },
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
        say: { en: 'Your turn! I play home, then the scale. Say the number of the wrong note — home and the top are always right. Happy hunting!', he: 'תורכם! אני מנגן את הבית, ואז את הסולם. אמרו את המספר של הצליל השגוי — הבית והצליל העליון תמיד נכונים. ציד מוצלח!' },
        show: { text: { en: 'which number?', he: 'איזה מספר?' } },
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
        say: { en: 'The minor pentatonic has just five notes per octave, with bigger gaps. Soulful — an R&B favourite.', he: 'בפנטטוני מינורי יש רק חמישה צלילים באוקטבה, עם רווחים גדולים יותר. נשמתי — אהוב במיוחד בר׳נ׳ב.' },
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
  },
];

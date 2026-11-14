// Mini-lessons for the progression games (0.53): where is home, what comes next, which chord changed, figure it out.
// See ../miniTypes.ts for the format. Examples in C major unless said otherwise.
import type { MiniLesson } from '../miniTypes';
import type { Stimulus } from '../../engine/lesson';

const ch = (midis: number[], duration = 0.9): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (duration = 0.5): Stimulus => ({ kind: 'rest', duration });
// Root position in the bass + close upper voices around middle C.
const I = [36, 60, 64, 67];
const ii = [38, 62, 65, 69];
const iii = [40, 59, 64, 67];
const IV = [41, 60, 65, 69];
const V = [43, 59, 62, 67];
const V7 = [43, 59, 62, 65];
const vi = [45, 60, 64, 69];
const bVII = [46, 58, 62, 65];
const bVI = [44, 60, 63, 68];
const iv = [41, 60, 65, 68];
const ii7 = [38, 60, 65, 69];
const Imaj7 = [36, 59, 64, 67];
const bII7 = [37, 59, 65, 68];
const prog = (cs: number[][], each = 0.85): Stimulus[] => cs.map((c, i) => ch(c, i === cs.length - 1 ? each * 1.7 : each));

export const LESSONS: MiniLesson[] = [
  {
    id: 'where-home',
    area: 'harmony',
    emoji: '',
    title: { en: 'Where is home?', he: 'איפה הבית?' },
    takeaway: { en: 'Home (I) is the chord where the tension lets go — most often right after V.', he: 'הבית (I) הוא האקורד שבו המתח משתחרר — לרוב מיד אחרי V.' },
    steps: [
      { say: { en: 'Every key has a home chord, the I. Music leaves it, travels, and comes back. Finding home by ear is the first step of hearing harmony.', he: 'לכל סולם יש אקורד בית, ה־I. המוזיקה עוזבת אותו, מטיילת, וחוזרת. למצוא את הבית באוזן זה הצעד הראשון בשמיעת הרמוניה.' }, play: prog([I, IV, V, I]), show: { text: { en: 'I – IV – V – I', he: 'I – IV – V – I' } } },
      { say: { en: 'Home sounds like rest. The chord before it, V, sounds like a question that wants an answer.', he: 'הבית נשמע כמו מנוחה. האקורד שלפניו, V, נשמע כמו שאלה שמחכה לתשובה.' }, play: prog([V7, I]), show: { text: { en: 'V7 → I', he: 'V7 → I' } } },
      { say: { en: 'Home does not have to come first. Here the progression starts away from home and arrives on the third chord.', he: 'הבית לא חייב לבוא ראשון. כאן המהלך מתחיל רחוק מהבית ומגיע אליו באקורד השלישי.' }, play: prog([ii, V, I, vi]), show: { text: { en: 'ii – V – I – vi', he: 'ii – V – I – vi' } } },
      { say: { en: 'Sometimes V leads you on and the music lands somewhere else, often on vi. That is a deceptive cadence: it sounds almost like home, but not quite.', he: 'לפעמים V מוביל אתכם והמוזיקה נוחתת במקום אחר, לרוב על vi. זאת קדנצה מטעה: זה נשמע כמעט כמו בית, אבל לא לגמרי.' }, play: prog([IV, V7, vi]), show: { text: { en: 'V7 → vi', he: 'V7 → vi' } } },
      { say: { en: 'A useful trick: hum the lowest note of each chord. On the home chord the hum feels settled, like the last note of a song.', he: 'טריק שימושי: זמזמו את הצליל הנמוך של כל אקורד. באקורד הבית הזמזום מרגיש יציב, כמו הצליל האחרון של שיר.' } },
      { say: { en: 'Your turn: count the chords as they pass, and answer with the number of the one that is home.', he: 'תורכם: ספרו את האקורדים כשהם עוברים, וענו במספר של האקורד שהוא הבית.' }, show: { text: { en: 'count 1, 2, 3, 4…', he: 'סופרים 1, 2, 3, 4…' } } },
    ],
    more: [
      { say: { en: 'Why does I feel like home? Its root is the key’s first note, and its notes are the most stable ones of the scale: 1, 3 and 5.', he: 'למה I מרגיש כמו בית? השורש שלו הוא הצליל הראשון של הסולם, והצלילים שלו הם היציבים ביותר בסולם: 1, 3 ו־5.' }, play: [ch(I, 1.6)] },
      { say: { en: 'V pulls toward I because of two notes: the leading tone, 7, rises a half step to 1, and the bass falls a fifth to the root.', he: 'V מושך ל־I בגלל שני צלילים: הצליל המוביל, 7, עולה חצי טון ל־1, והבס יורד קווינטה אל השורש.' }, play: prog([V7, I]) },
      { say: { en: 'IV to I is the softer way home, the "amen" ending of hymns. It arrives without the leading tone, so it sounds gentle rather than final.', he: 'IV ל־I הוא הדרך הרכה הביתה, סיום ה"אמן" של מזמורים. הוא מגיע בלי הצליל המוביל, ולכן נשמע עדין ולא סופי.' }, play: prog([IV, I]) },
      { say: { en: 'In minor keys home is the minor chord i, and V usually becomes major so it can still pull strongly.', he: 'בסולמות מינוריים הבית הוא האקורד המינורי i, ו־V לרוב הופך למז׳ורי כדי שימשיך למשוך חזק.' }, play: prog([[45, 60, 64, 69], [40, 59, 62, 68], [45, 60, 64, 69]]) },
      { say: { en: 'A common mistake is to call the first chord home just because it is first. Wait for the rest: home is where the music would be happy to stop.', he: 'טעות נפוצה היא לקרוא לאקורד הראשון בית רק כי הוא ראשון. חכו למנוחה: הבית הוא המקום שבו המוזיקה הייתה שמחה לעצור.' } },
      { say: { en: 'In real songs, choruses often begin away from home and land on I at the end of the line. Listen for it in the songs you know.', he: 'בשירים אמיתיים פזמונים מתחילים לעיתים קרובות רחוק מהבית ונוחתים על I בסוף השורה. הקשיבו לזה בשירים שאתם מכירים.' } },
    ],
  },
  {
    id: 'next-chord',
    area: 'harmony',
    emoji: '',
    title: { en: 'What comes next?', he: 'מה בא אחר כך?' },
    takeaway: { en: 'Progressions follow habits: V goes home, ii goes to V, and pop loops repeat four chords.', he: 'למהלכים יש הרגלים: V הולך הביתה, ii הולך ל־V, ולופים של פופ חוזרים על ארבעה אקורדים.' },
    steps: [
      { say: { en: 'Chord progressions are not random. A few habits come back in thousands of songs, so the ear learns to expect the next chord.', he: 'מהלכי אקורדים אינם אקראיים. כמה הרגלים חוזרים באלפי שירים, ולכן האוזן לומדת לצפות לאקורד הבא.' }, play: prog([I, V, vi, IV]), show: { text: { en: 'I – V – vi – IV', he: 'I – V – vi – IV' } } },
      { say: { en: 'The strongest habit: after V comes I. Hear the first chords, then guess before the last one sounds.', he: 'ההרגל החזק ביותר: אחרי V בא I. שמעו את האקורדים הראשונים, ונחשו לפני שהאחרון נשמע.' }, play: [...prog([IV, V]), rest(0.8), ch(I, 1.4)] },
      { say: { en: 'In jazz, ii goes to V and V goes to I. The bass falls by fifths: D, G, C.', he: 'בג׳אז ii הולך ל־V ו־V הולך ל־I. הבס יורד בקווינטות: רה, סול, דו.' }, play: prog([ii7, V7, Imaj7]), show: { text: { en: 'ii7 – V7 – Imaj7', he: 'ii7 – V7 – Imaj7' } } },
      { say: { en: 'Pop loops repeat: I, V, vi, then IV, and again. Once you know the loop, the fourth chord is no surprise.', he: 'לופים של פופ חוזרים: I, V, vi, ואז IV, ושוב. ברגע שמכירים את הלופ, האקורד הרביעי לא מפתיע.' }, play: prog([I, V, vi, IV, I, V, vi, IV], 0.6) },
      { say: { en: 'To predict, sing the bass of where you think it goes, then compare with what you hear.', he: 'כדי לנחש, שירו את הבס של המקום שאליו אתם חושבים שזה הולך, ואז השוו למה שאתם שומעים.' } },
      { say: { en: 'Your turn: three chords play. Choose the chord that comes next, and listen to each choice if you are not sure.', he: 'תורכם: שלושה אקורדים מתנגנים. בחרו את האקורד שבא אחר כך, והקשיבו לכל אפשרות אם אתם לא בטוחים.' }, show: { text: { en: '… – ?', he: '… – ?' } } },
    ],
    more: [
      { say: { en: 'Why these habits? Chords whose roots fall a fifth share notes and resolve tension step by step. That is the backbone of tonal music.', he: 'למה ההרגלים האלה? אקורדים שהשורשים שלהם יורדים בקווינטה חולקים צלילים ופותרים מתח צעד אחר צעד. זה עמוד השדרה של המוזיקה הטונאלית.' }, play: prog([vi, ii, V, I]) },
      { say: { en: 'Borrowed chords bring color from the parallel minor. ♭VI and ♭VII lead home with a heroic, film-music sound.', he: 'אקורדים שאולים מביאים צבע מהמינור שעל אותה טוניקה. ♭VI ו־♭VII מובילים הביתה בצליל הרואי, של מוזיקת סרטים.' }, play: prog([I, bVI, bVII, I]) },
      { say: { en: 'The minor four, iv, is the bittersweet one: IV turns minor just before home.', he: 'הרביעית המינורית, iv, היא הדו־ערכית: IV הופך למינור רגע לפני הבית.' }, play: prog([I, IV, iv, I]) },
      { say: { en: 'A secondary dominant points to another chord: a major chord on 3 pulls toward vi as if vi were home for a moment.', he: 'דומיננטה משנית מצביעה על אקורד אחר: אקורד מז׳ורי על 3 מושך ל־vi כאילו vi היה הבית לרגע.' }, play: prog([I, [40, 59, 64, 68], vi]) },
      { say: { en: 'A common mistake is to guess by the melody alone. Follow the bass: it usually tells you the next root.', he: 'טעות נפוצה היא לנחש לפי המנגינה בלבד. עקבו אחרי הבס: לרוב הוא מגלה את השורש הבא.' } },
      { say: { en: 'Practice prediction away from the app too: when a song you know is playing, pause it before a chord change and sing the next bass note. Then press play and check. A minute of this a day sharpens the ear fast.', he: 'תרגלו ניחוש גם מחוץ לאפליקציה: כששיר שאתם מכירים מתנגן, עצרו אותו לפני חילוף אקורד ושירו את צליל הבס הבא. אז לחצו על נגן ובדקו. דקה כזאת ביום מחדדת את האוזן מהר.' } },
      { say: { en: 'Recap: V to I, ii to V, the four-chord loop, and a few colors: ♭VI, ♭VII, iv and secondary dominants.', he: 'סיכום: V ל־I, ii ל־V, הלופ של ארבעה אקורדים, וכמה צבעים: ♭VI, ♭VII, iv ודומיננטות משניות.' } },
    ],
  },
  {
    id: 'reharm-swap',
    area: 'harmony',
    emoji: '',
    title: { en: 'Which chord changed?', he: 'איזה אקורד השתנה?' },
    takeaway: { en: 'A reharmonization swaps a chord for one that shares its job: ii for IV, iii for vi, ♭II7 for V7.', he: 'הרמון מחדש מחליף אקורד באקורד שעושה אותה עבודה: ii במקום IV, iii במקום vi, ♭II7 במקום V7.' },
    steps: [
      { say: { en: 'Arrangers often keep a melody and change one chord under it. The song stays the same, but the color changes.', he: 'מעבדים שומרים לעיתים קרובות על המנגינה ומחליפים אקורד אחד מתחתיה. השיר נשאר אותו שיר, אבל הצבע משתנה.' }, play: [...prog([I, IV, V, I], 0.7), rest(), ...prog([I, ii, V, I], 0.7)] },
      { say: { en: 'Swaps that share notes are the gentlest: ii can replace IV, and iii can replace vi.', he: 'ההחלפות העדינות ביותר הן של אקורדים שחולקים צלילים: ii יכול להחליף את IV, ו־iii יכול להחליף את vi.' }, play: [...prog([I, V, vi, IV], 0.7), rest(), ...prog([I, V, iii, IV], 0.7)] },
      { say: { en: 'In jazz, the tritone sub replaces V7 with a dominant a half step above home, so the bass slides down to I.', he: 'בג׳אז, תחליף הטריטון מחליף את V7 בדומיננטה שנמצאת חצי טון מעל הבית, כך שהבס מחליק למטה אל I.' }, play: [...prog([ii7, V7, Imaj7], 0.8), rest(), ...prog([ii7, bII7, Imaj7], 0.8)] },
      { say: { en: 'The fastest way to find the change: follow the bass in both versions. The bar where it moves differently is the one.', he: 'הדרך המהירה ביותר למצוא את השינוי: עקבו אחרי הבס בשתי הגרסאות. התיבה שבה הוא זז אחרת היא זו.' } },
      { say: { en: 'Then ask what the new chord does: is it softer, darker, or does it lead home more smoothly?', he: 'ואז שאלו מה האקורד החדש עושה: הוא רך יותר, כהה יותר, או מוביל הביתה בצורה חלקה יותר?' } },
      { say: { en: 'Your turn: the progression plays, then plays again with one chord replaced. Answer with the number of the changed chord.', he: 'תורכם: המהלך מתנגן, ואז שוב עם אקורד אחד שהוחלף. ענו במספר של האקורד שהשתנה.' }, show: { text: { en: '1 2 3 4 … 1 2 ? 4', he: '1 2 3 4 … 1 2 ? 4' } } },
    ],
    more: [
      { say: { en: 'Chords have jobs. Tonic chords (I, vi, iii) rest, subdominant chords (IV, ii) move away, dominant chords (V, vii°) pull back home.', he: 'לאקורדים יש תפקידים. אקורדי טוניקה (I, vi, iii) נחים, אקורדי סובדומיננטה (IV, ii) מתרחקים, ואקורדי דומיננטה (V, vii°) מושכים חזרה הביתה.' }, play: prog([I, IV, V, I]) },
      { say: { en: 'A swap inside the same job keeps the music flowing: vi for I gives a deceptive, darker arrival.', he: 'החלפה בתוך אותו תפקיד שומרת על הזרימה: vi במקום I נותן נחיתה מטעה וכהה יותר.' }, play: [...prog([IV, V, I], 0.8), rest(), ...prog([IV, V, vi], 0.8)] },
      { say: { en: 'Borrowing from minor darkens one moment: IV becomes iv, or V becomes ♭VII.', he: 'שאילה מהמינור מכהה רגע אחד: IV הופך ל־iv, או V הופך ל־♭VII.' }, play: [...prog([I, IV, I], 0.8), rest(), ...prog([I, iv, I], 0.8)] },
      { say: { en: 'The tritone sub works because V7 and ♭II7 share their 3rd and 7th, the two notes that make a dominant sound like a dominant.', he: 'תחליף הטריטון עובד כי ל־V7 ול־♭II7 יש אותה טרצה ואותה ספטימה, שני הצלילים שגורמים לדומיננטה להישמע כמו דומיננטה.' } },
      { say: { en: 'A common mistake is to listen to the top notes only. Many reharmonizations keep the melody and change just the bass.', he: 'טעות נפוצה היא להקשיב רק לצלילים העליונים. הרבה הרמונים מחדש שומרים על המנגינה ומשנים רק את הבס.' } },
      { say: { en: 'In real music, reharmonization is everywhere: a singer’s last chorus with a new chord under the final line, a jazz pianist’s second time through a standard, a film cue that darkens one familiar chord. Once you hear the trick, you hear it in many songs.', he: 'במוזיקה אמיתית הרמון מחדש נמצא בכל מקום: הפזמון האחרון של זמרת עם אקורד חדש מתחת לשורה האחרונה, הפעם השנייה של פסנתרן ג׳אז בסטנדרט, קטע מוזיקת סרט שמכהה אקורד מוכר אחד. ברגע ששומעים את הטריק, שומעים אותו בהרבה שירים.' } },
      { say: { en: 'Recap: find the bar by the bass, then name the swap: same job, borrowed from minor, or a jazz substitution.', he: 'סיכום: מוצאים את התיבה לפי הבס, ואז נותנים שם להחלפה: אותו תפקיד, שאול מהמינור, או תחליף ג׳אזי.' } },
    ],
  },
  {
    id: 'figure-out',
    area: 'ear',
    emoji: '',
    title: { en: 'Figure it out', he: 'לפענח לבד' },
    takeaway: { en: 'Work it out in order: home, bass, chords, melody — each step makes the next one easier.', he: 'מפענחים לפי הסדר: בית, בס, אקורדים, מנגינה — כל צעד מקל על הבא.' },
    steps: [
      { say: { en: 'Musicians learn songs by ear in a fixed order. Each step gives you a frame for the next one.', he: 'מוזיקאים לומדים שירים באוזן בסדר קבוע. כל צעד נותן מסגרת לצעד הבא.' }, play: prog([I, vi, IV, V, I], 0.6) },
      { say: { en: 'Step one, home: on which note does the tune want to end? That note is 1, and everything else is counted from it.', he: 'צעד ראשון, הבית: על איזה צליל המנגינה רוצה להסתיים? הצליל הזה הוא 1, וכל השאר נספר ממנו.' }, play: [{ kind: 'notes', midis: [64, 62, 60], each: 0.45 }] },
      { say: { en: 'Step two, the bass: hum the lowest notes. Do they go up or down, by a step or a jump? The bass gives you the chord roots.', he: 'צעד שני, הבס: זמזמו את הצלילים הנמוכים. הם עולים או יורדים, בצעד או בקפיצה? הבס נותן את שורשי האקורדים.' }, play: [{ kind: 'notes', midis: [36, 45, 41, 43, 36], each: 0.55 }] },
      { say: { en: 'Step three, the chords: with the roots known, decide major or minor. A minor chord on 6 is vi, a major chord on 4 is IV.', he: 'צעד שלישי, האקורדים: כשהשורשים ידועים, מחליטים מז׳ור או מינור. אקורד מינורי על 6 הוא vi, אקורד מז׳ורי על 4 הוא IV.' }, play: prog([vi, IV]) },
      { say: { en: 'Step four, the melody: sing it slowly and name each note as a degree. The chord under it usually holds the answer.', he: 'צעד רביעי, המנגינה: שירו אותה לאט ותנו לכל צליל שם של דרגה. האקורד שמתחתיה בדרך כלל מחזיק את התשובה.' } },
      { say: { en: 'Your turn: each level is one of these steps on a new short tune. Listen as many times as you need.', he: 'תורכם: כל רמה היא אחד הצעדים האלה על שיר קצר חדש. הקשיבו כמה פעמים שצריך.' }, show: { text: { en: 'home → bass → chords → melody', he: 'בית → בס → אקורדים → מנגינה' } } },
    ],
    more: [
      { say: { en: 'Why this order? Home anchors the numbers, the bass anchors the harmony, and the harmony narrows down the melody notes.', he: 'למה בסדר הזה? הבית מעגן את המספרים, הבס מעגן את ההרמוניה, וההרמוניה מצמצמת את האפשרויות לצלילי המנגינה.' } },
      { say: { en: 'Finding home: wait for the end of a phrase. The note where the tune comes to rest is usually 1, sometimes 3 or 5.', he: 'למצוא את הבית: חכו לסוף המשפט. הצליל שבו המנגינה נחה הוא לרוב 1, לפעמים 3 או 5.' }, play: [{ kind: 'notes', midis: [67, 65, 64, 62, 60], each: 0.4 }] },
      { say: { en: 'The bass moves slowly and repeats, so it is easier to follow than the chords on top. Sing it an octave higher if it is too low.', he: 'הבס זז לאט וחוזר על עצמו, ולכן קל יותר לעקוב אחריו מאשר אחרי האקורדים שמעליו. שירו אותו אוקטבה גבוה יותר אם הוא נמוך מדי.' }, play: [{ kind: 'notes', midis: [48, 57, 53, 55], each: 0.6 }] },
      { say: { en: 'A common mistake is to start with the melody. Without home and harmony, every note is a guess.', he: 'טעות נפוצה היא להתחיל במנגינה. בלי בית והרמוניה, כל צליל הוא ניחוש.' } },
      { say: { en: 'In real practice, choose a short song you know, find home with your voice, then the bass, then the chords on your instrument.', he: 'בתרגול אמיתי, בחרו שיר קצר שאתם מכירים, מצאו את הבית בקול, אחר כך את הבס, ואז את האקורדים על הכלי.' } },
      { say: { en: 'Checking yourself matters as much as guessing: play your answer along with the recording. If it clashes, the bass or the chord quality is wrong; go one step back and listen again.', he: 'לבדוק את עצמכם חשוב כמו לנחש: נגנו את התשובה שלכם יחד עם ההקלטה. אם זה מתנגש, הבס או סוג האקורד שגויים; חזרו צעד אחד אחורה והקשיבו שוב.' } },
      { say: { en: 'Recap: home, bass, chords, melody. Slow down and repeat as often as needed; the order matters more than the speed.', he: 'סיכום: בית, בס, אקורדים, מנגינה. האטו וחזרו כמה שצריך; הסדר חשוב יותר מהמהירות.' } },
    ],
  },
];

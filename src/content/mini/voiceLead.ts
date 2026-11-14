// Voice leading as a performed skill (AUDIT-CONTENT-THEORY §ה.2): one quick lesson per stage of the k-vl / g-vl
// levels — common tones stay, the other voices move by step, the 7th falls to the 3rd, drop 2 / drop 3, spreads, a
// melody on top. Own words and examples; the drills then grade the voicings you choose.

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const ch = (midis: number[], duration = 1.1): Stimulus => ({ kind: 'chord', midis, duration });

export const LESSONS: MiniLesson[] = [
  {
    id: 'vl-triads',
    area: 'harmony',
    emoji: '𝄞',
    title: { en: 'Triads to the nearest inversion', he: 'משולשים להיפוך הקרוב' },
    takeaway: { en: 'Keep the common tone, move the other voices to the nearest notes: C–E–G to C–F–A, not a jump to F–A–C.', he: 'משאירים את הצליל המשותף ומזיזים את שאר הקולות לצליל הקרוב: דו–מי–סול לדו–פה–לה, ולא קפיצה לפה–לה–דו.' },
    steps: [
      {
        say: { en: 'Hi {name}! Play C major, then F major, both in root position. The whole hand jumps, and it sounds like blocks.', he: 'היי {name}! נגנו דו מז׳ור ואז פה מז׳ור, שניהם במצב יסודי. כל היד קופצת, וזה נשמע כמו קוביות.' },
        play: [ch([60, 64, 67]), ch([65, 69, 72])],
        show: { text: { en: 'C → F', he: 'C → F' } },
      },
      {
        say: { en: 'Now look for a note the two chords share. C is in both. Keep it where it is.', he: 'עכשיו מחפשים צליל ששני האקורדים חולקים. דו נמצא בשניהם. משאירים אותו במקום.' },
        show: { notes: [60, 64, 67], chord: true },
      },
      {
        say: { en: 'The other two voices move to the nearest notes of F: E up to F, G up to A. Three semitones in all, and F comes out in second inversion.', he: 'שני הקולות האחרים זזים לצלילים הקרובים של פה: מי עולה לפה, סול עולה ללה. שלושה חצאי טון בסך הכול, ופה יוצא בהיפוך שני.' },
        play: [ch([60, 64, 67]), ch([60, 65, 69])],
        show: { notes: [60, 65, 69], chord: true },
      },
      {
        say: { en: 'To G: C steps down to B, F down to D, A down to G. Then back home to C. Every voice moves by a step or stays.', he: 'אל סול: דו יורד לסי, פה יורד לרה, לה יורד לסול. ואז חוזרים הביתה לדו. כל קול זז בצעד או נשאר.' },
        play: [ch([60, 65, 69], 0.9), ch([59, 62, 67], 0.9), ch([60, 64, 67])],
      },
      {
        say: { en: 'Your turn: you see only the chord names and the first chord. Find the nearest inversion each time. The app counts how far your voices moved.', he: 'תורכם: רואים רק את שמות האקורדים ואת האקורד הראשון. מוצאים בכל פעם את ההיפוך הקרוב. האפליקציה סופרת כמה הקולות שלכם זזו.' },
        show: { text: { en: 'C · F · G · C', he: 'C · F · G · C' } },
      },
    ],
    more: [
      {
        say: { en: 'Why it matters: a pianist or guitarist who jumps block to block sounds like a beginner. Small moves make the chords sing like a choir, each voice its own line.', he: 'למה זה חשוב: נגן שקופץ מקובייה לקובייה נשמע מתחיל. תנועות קטנות גורמות לאקורדים לשיר כמו מקהלה, לכל קול קו משלו.' },
        play: [ch([60, 64, 67], 0.8), ch([60, 64, 69], 0.8), ch([60, 65, 69], 0.8), ch([59, 62, 67])],
      },
      {
        say: { en: 'The rule of thumb: common tones stay, the other voices go to the nearest chord tone. C to A minor keeps two notes and moves one.', he: 'כלל האצבע: צלילים משותפים נשארים, ושאר הקולות הולכים לצליל האקורד הקרוב. מדו ללה מינור נשארים שני צלילים וזז אחד.' },
        play: [ch([60, 64, 67]), ch([60, 64, 69])],
      },
      {
        say: { en: 'When no note is shared, like F to G, move all three voices by step, the opposite way from the bass. The bass goes up, the hand comes down.', he: 'כשאין צליל משותף, כמו פה לסול, מזיזים את שלושת הקולות בצעד, בכיוון ההפוך לבס. הבס עולה, היד יורדת.' },
        play: [ch([53, 60, 65, 69]), ch([55, 59, 62, 67])],
      },
      {
        say: { en: 'Add the root in the left hand. The bass may leap, it is the floor. The right hand keeps moving by step above it.', he: 'מוסיפים את היסוד ביד שמאל. הבס יכול לקפוץ, הוא הרצפה. יד ימין ממשיכה לזוז בצעדים מעליו.' },
        play: [ch([48, 64, 67, 72], 0.9), ch([53, 65, 69, 72], 0.9), ch([55, 62, 67, 71], 0.9), ch([48, 64, 67, 72])],
      },
      {
        say: { en: 'On the guitar it is the same on three strings: the shapes change, the hand barely moves along the neck.', he: 'בגיטרה זה אותו דבר על שלושה מיתרים: הצורות מתחלפות, והיד כמעט לא זזה לאורך הצוואר.' },
        show: { text: { en: 'strings 3-2-1 · 4-3-2', he: 'מיתרים 3-2-1 · 4-3-2' } },
      },
      {
        say: { en: 'Try I, vi, IV, V the same way: C, then A minor keeps C and E, F keeps C and A, G moves everything by a step. Listen for one smooth line on top.', he: 'נסו את I, vi, IV, V באותה דרך: דו, ואז לה מינור שומר על דו ומי, פה שומר על דו ולה, וסול מזיז הכול בצעד. הקשיבו לקו חלק אחד למעלה.' },
        play: [ch([60, 64, 67], 0.7), ch([60, 64, 69], 0.7), ch([60, 65, 69], 0.7), ch([59, 62, 67], 0.7), ch([60, 64, 67])],
      },
      {
        say: { en: 'To keep: find what stays, step what moves, and let the bass do the leaping.', he: 'מה לזכור: מוצאים מה נשאר, מזיזים בצעד את מה שזז, ונותנים לבס לקפוץ.' },
        show: { text: { en: 'stay · step · leap in the bass', he: 'נשאר · צעד · קפיצה בבס' } },
      },
    ],
  },
  {
    id: 'vl-guide',
    area: 'harmony',
    emoji: '𝄞',
    title: { en: 'Guide tones: the 7th falls to the 3rd', he: 'צלילים מנחים: הספטימה יורדת לטרצה' },
    takeaway: { en: 'In ii–V–I the 7th of each chord falls a step to the 3rd of the next, and the 3rd stays as the next 7th.', he: 'ב־ii–V–I הספטימה של כל אקורד יורדת בצעד לטרצה של הבא, והטרצה נשארת כספטימה של הבא.' },
    steps: [
      {
        say: { en: 'Hi {name}! Two notes tell a 7th chord who it is: the 3rd and the 7th. D minor 7: F and C.', he: 'היי {name}! שני צלילים אומרים לספטאקורד מי הוא: הטרצה והספטימה. רה מינור 7: פה ודו.' },
        play: [ch([50, 65, 72])],
        show: { notes: [65, 72], chord: true },
      },
      {
        say: { en: 'Move to G7. F stays: it is the 7th of G7. C falls a half step to B, the 3rd of G7.', he: 'עוברים ל־G7. פה נשאר: הוא הספטימה של G7. דו יורד חצי טון לסי, הטרצה של G7.' },
        play: [ch([50, 65, 72], 0.9), ch([43, 65, 71])],
        show: { notes: [65, 71], chord: true },
      },
      {
        say: { en: 'Then C major 7: F, the 7th of G7, falls to E. B stays as the 7th of C. One note moves at each change.', he: 'ואז דו מז׳ור 7: פה, הספטימה של G7, יורד למי. סי נשאר כספטימה של דו. צליל אחד זז בכל החלפה.' },
        play: [ch([50, 65, 72], 0.8), ch([43, 65, 71], 0.8), ch([48, 64, 71])],
      },
      {
        say: { en: 'That is the rule: when the root falls a fifth, the 7th steps down to the next 3rd. Two lines that hardly move, and the whole progression is there.', he: 'זה הכלל: כשהיסוד יורד בקווינטה, הספטימה יורדת בצעד לטרצה הבאה. שני קווים שכמעט לא זזים, וכל המהלך נמצא שם.' },
        show: { text: { en: '7 → 3', he: '7 → 3' } },
      },
      {
        say: { en: 'Your turn: the root in the left hand, the 3rd and 7th in the right. Start from the written pair and move one note at a time.', he: 'תורכם: היסוד ביד שמאל, הטרצה והספטימה ביד ימין. מתחילים מהזוג הכתוב ומזיזים צליל אחד בכל פעם.' },
        show: { text: { en: 'Dm7 · G7 · Cmaj7', he: 'Dm7 · G7 · Cmaj7' } },
      },
    ],
    more: [
      {
        say: { en: 'Start with the 7th below instead: C and F over D. Then B and F over G, then B and E over C. The same rule, the other shape.', he: 'אפשר להתחיל עם הספטימה למטה: דו ופה מעל רה. ואז סי ופה מעל סול, ואז סי ומי מעל דו. אותו כלל, הצורה השנייה.' },
        play: [ch([50, 60, 65], 0.8), ch([43, 59, 65], 0.8), ch([48, 59, 64])],
      },
      {
        say: { en: 'Jazz players comp with just these two notes and a bass. It sounds full because the ear fills in the rest.', he: 'נגני ג׳אז מלווים רק עם שני הצלילים האלה ובס. זה נשמע מלא כי האוזן משלימה את השאר.' },
        play: [ch([45, 60, 67], 0.8), ch([50, 60, 65], 0.8), ch([43, 59, 65], 0.8), ch([48, 59, 64])],
      },
      {
        say: { en: 'A common mistake: moving the 7th up. C up to D over G7 loses the pull. Let it fall.', he: 'טעות נפוצה: להעלות את הספטימה. דו שעולה לרה מעל G7 מאבד את המשיכה. נותנים לה ליפול.' },
        play: [ch([50, 65, 72], 0.8), ch([43, 65, 74])],
      },
      {
        say: { en: 'In minor the same: D half-diminished, G7, C minor. The 7th falls to the 3rd, now E flat.', he: 'במינור אותו דבר: רה חצי מוקטן, G7, דו מינור. הספטימה יורדת לטרצה, עכשיו מי במול.' },
        play: [ch([50, 65, 72], 0.8), ch([43, 65, 71], 0.8), ch([48, 63, 69])],
      },
      {
        say: { en: 'Why the 7th falls: it is the restless note of the chord. Over the next root it becomes the 3rd, the note that names the new chord. The tension leaves by the shortest road.', he: 'למה הספטימה יורדת: היא הצליל חסר המנוחה של האקורד. מעל היסוד הבא היא הופכת לטרצה, הצליל שנותן לאקורד החדש את שמו. המתח יוצא בדרך הקצרה ביותר.' },
        play: [ch([43, 65, 71], 1), ch([48, 64, 71])],
      },
      {
        say: { en: 'In a longer turnaround, I, vi, ii, V, the same two lines keep going. Every chord adds one small step, and the bass carries the roots underneath.', he: 'במהלך ארוך יותר, I, vi, ii, V, אותם שני קווים ממשיכים. כל אקורד מוסיף צעד קטן אחד, והבס נושא את היסודות מתחת.' },
        play: [ch([48, 64, 71], 0.7), ch([45, 64, 67], 0.7), ch([50, 65, 72], 0.7), ch([43, 65, 71], 0.7), ch([48, 64, 71])],
      },
      {
        say: { en: 'To keep: two notes, one moves, and the 7th always steps down.', he: 'מה לזכור: שני צלילים, אחד זז, והספטימה תמיד יורדת בצעד.' },
        show: { text: { en: '3 & 7 · one moves', he: '3 ו־7 · אחד זז' } },
      },
    ],
  },
  {
    id: 'vl-sevenths',
    area: 'harmony',
    emoji: '𝄞',
    title: { en: 'Close-position 7th chords', he: 'ספטאקורדים במצב צמוד' },
    takeaway: { en: 'Four notes inside an octave: ii–V–I alternates root position and second inversion, two voices moving each time.', he: 'ארבעה צלילים בתוך אוקטבה: ii–V–I מחליף בין מצב יסודי להיפוך שני, ושני קולות זזים בכל פעם.' },
    steps: [
      {
        say: { en: 'Hi {name}! Now all four notes of the chord, close together. D minor 7 in root position: D, F, A, C.', he: 'היי {name}! עכשיו כל ארבעת צלילי האקורד, צמודים. רה מינור 7 במצב יסודי: רה, פה, לה, דו.' },
        play: [ch([62, 65, 69, 72])],
        show: { notes: [62, 65, 69, 72], chord: true },
      },
      {
        say: { en: 'To G7: D and F stay. A steps down to G, C falls to B. G7 comes out in second inversion: D, F, G, B.', he: 'אל G7: רה ופה נשארים. לה יורד לסול, דו יורד לסי. G7 יוצא בהיפוך שני: רה, פה, סול, סי.' },
        play: [ch([62, 65, 69, 72], 0.9), ch([62, 65, 67, 71])],
        show: { notes: [62, 65, 67, 71], chord: true },
      },
      {
        say: { en: 'To C major 7: G and B stay, D steps down to C, F to E. Root position again. Four semitones, then two.', he: 'אל דו מז׳ור 7: סול וסי נשארים, רה יורד לדו, פה למי. שוב מצב יסודי. ארבעה חצאי טון, ואז שניים.' },
        play: [ch([62, 65, 67, 71], 0.9), ch([60, 64, 67, 71])],
      },
      {
        say: { en: 'Start from second inversion and the pattern flips: second, root, second. Either way, half the hand stays still.', he: 'מתחילים מהיפוך שני והתבנית מתהפכת: שני, יסודי, שני. בכל מקרה, חצי יד נשארת במקום.' },
        play: [ch([57, 60, 62, 65], 0.8), ch([55, 59, 62, 65], 0.8), ch([55, 59, 60, 64])],
      },
      {
        say: { en: 'Your turn, in every key. Then around the cycle of fifths: eight chords, each a short step down, the hand staying in one place.', he: 'תורכם, בכל הסולמות. ואחר כך במעגל הקווינטות: שמונה אקורדים, כל אחד צעד קטן למטה, והיד נשארת במקום אחד.' },
        show: { text: { en: 'Cmaj7 · Fmaj7 · Bm7♭5 · Em7 · Am7 · Dm7 · G7 · Cmaj7', he: 'Cmaj7 · Fmaj7 · Bm7♭5 · Em7 · Am7 · Dm7 · G7 · Cmaj7' } },
      },
    ],
    more: [
      {
        say: { en: 'Around the cycle every root falls a fifth, so every 7th falls to the next 3rd. The voicings slowly sink: that is fine, start a little higher.', he: 'במעגל כל יסוד יורד בקווינטה, אז כל ספטימה יורדת לטרצה הבאה. הקולות שוקעים לאט: זה בסדר, מתחילים קצת גבוה יותר.' },
        play: [ch([60, 64, 67, 71], 0.7), ch([60, 64, 65, 69], 0.7), ch([59, 62, 65, 69], 0.7), ch([59, 62, 64, 67], 0.7), ch([57, 60, 64, 67])],
      },
      {
        say: { en: 'Count your motion: from D minor 7 to G7 the smallest move is three semitones. If you moved seven, one voice jumped.', he: 'סופרים את התנועה: מרה מינור 7 ל־G7 התנועה הקטנה היא שלושה חצאי טון. אם זזתם שבעה, קול אחד קפץ.' },
        show: { text: { en: 'Dm7 → G7: 3', he: 'Dm7 → G7: 3' } },
      },
      {
        say: { en: 'A chain of two-fives down by whole steps works the same: D minor 7, G7, C minor 7, F7, and on. Each pair a new key.', he: 'שרשרת של שתיים־חמש שיורדת בטונים עובדת אותו דבר: רה מינור 7, G7, דו מינור 7, F7, וכן הלאה. כל זוג סולם חדש.' },
        play: [ch([62, 65, 69, 72], 0.7), ch([62, 65, 67, 71], 0.7), ch([60, 63, 67, 70], 0.7), ch([60, 63, 65, 69])],
      },
      {
        say: { en: 'Watch out for the 7th going up out of habit. Over the dominant it wants to fall.', he: 'שימו לב לספטימה שעולה מתוך הרגל. מעל הדומיננט היא רוצה ליפול.' },
        play: [ch([62, 65, 69, 72], 0.8), ch([62, 65, 67, 71])],
      },
      {
        say: { en: 'You never have to think which inversion comes next. Keep the common tones, step the rest, and the right inversion appears by itself. The chord names are enough.', he: 'אין צורך לחשוב איזה היפוך בא עכשיו. משאירים את הצלילים המשותפים, מזיזים בצעד את השאר, וההיפוך הנכון מופיע מעצמו. שמות האקורדים מספיקים.' },
        show: { text: { en: 'stay · step', he: 'נשאר · צעד' } },
      },
      {
        say: { en: 'In minor, D half-diminished, G7 and C minor 6 move the same way. The flat 5 of the first chord, A flat, falls to G.', he: 'במינור, רה חצי מוקטן, G7 ודו מינור 6 זזים באותה דרך. הקווינטה המוקטנת של האקורד הראשון, לה במול, יורדת לסול.' },
        play: [ch([62, 65, 68, 72], 0.8), ch([62, 65, 67, 71], 0.8), ch([60, 63, 67, 69])],
      },
      {
        say: { en: 'To keep: close position, two voices stay, two step, and the inversions take care of themselves.', he: 'מה לזכור: מצב צמוד, שני קולות נשארים, שניים צועדים, וההיפוכים מסתדרים מעצמם.' },
        show: { text: { en: 'root · 2nd · root', he: 'יסודי · שני · יסודי' } },
      },
    ],
  },
  {
    id: 'vl-drop',
    area: 'harmony',
    emoji: '𝄞',
    title: { en: 'Drop 2 and drop 3', he: 'דרופ 2 ודרופ 3' },
    takeaway: { en: 'Take a close voicing and drop its second (or third) voice from the top an octave: wider, warmer, and still led by step.', he: 'לוקחים קול צמוד ומורידים את הקול השני (או השלישי) מלמעלה באוקטבה: רחב יותר, חם יותר, ועדיין מובל בצעדים.' },
    steps: [
      {
        say: { en: 'Hi {name}! C major 7 close: C, E, G, B. Take the second note from the top, G, and drop it an octave.', he: 'היי {name}! דו מז׳ור 7 צמוד: דו, מי, סול, סי. לוקחים את הצליל השני מלמעלה, סול, ומורידים אותו אוקטבה.' },
        play: [ch([60, 64, 67, 71]), ch([55, 60, 64, 71])],
        show: { notes: [55, 60, 64, 71], chord: true },
      },
      {
        say: { en: 'That is drop 2: G, C, E, B. On the piano the low note goes to the left hand. On the guitar it fits four neighbouring strings.', he: 'זה דרופ 2: סול, דו, מי, סי. בפסנתר הצליל הנמוך עובר ליד שמאל. בגיטרה זה נכנס בארבעה מיתרים שכנים.' },
        show: { text: { en: 'drop 2', he: 'דרופ 2' } },
      },
      {
        say: { en: 'Lead it like close position: the top voice moves by step, the 7th falls to the 3rd. D minor 7, G7, C major 7, all in drop 2.', he: 'מובילים כמו במצב צמוד: הקול העליון זז בצעד, הספטימה יורדת לטרצה. רה מינור 7, G7, דו מז׳ור 7, הכול בדרופ 2.' },
        play: [ch([57, 62, 65, 72], 0.9), ch([55, 62, 65, 71], 0.9), ch([55, 60, 64, 71])],
      },
      {
        say: { en: 'Drop 3 drops the third voice from the top instead: E, C, G, B. The bass sits low, on the guitar on strings six or five.', he: 'דרופ 3 מוריד את הקול השלישי מלמעלה: מי, דו, סול, סי. הבס יושב נמוך, בגיטרה על מיתר שש או חמש.' },
        play: [ch([60, 64, 67, 71]), ch([52, 60, 67, 71])],
      },
      {
        say: { en: 'Your turn: the first voicing is written, its top note changes from item to item. Keep the top voice moving by step.', he: 'תורכם: הקול הראשון כתוב, והצליל העליון שלו מתחלף מתרגיל לתרגיל. שומרים על הקול העליון בצעדים.' },
        show: { text: { en: 'Dm7 · G7 · Cmaj7', he: 'Dm7 · G7 · Cmaj7' } },
      },
    ],
    more: [
      {
        say: { en: 'Each chord has four drop 2 voicings, one with each chord tone on top. Practise ii–V–I from all four.', he: 'לכל אקורד יש ארבעה קולות דרופ 2, אחד עם כל צליל אקורד למעלה. מתרגלים ii–V–I מכל הארבעה.' },
        play: [ch([53, 60, 62, 69], 0.7), ch([57, 62, 65, 72], 0.7), ch([60, 65, 69, 74], 0.7), ch([62, 69, 72, 77])],
      },
      {
        say: { en: 'On the guitar the app counts semitones, not frets. A shape far up the neck can still be the nearest voicing.', he: 'בגיטרה האפליקציה סופרת חצאי טון, לא סריגים. צורה רחוקה על הצוואר עדיין יכולה להיות הקול הקרוב.' },
        show: { text: { en: 'semitones, not frets', he: 'חצאי טון, לא סריגים' } },
      },
      {
        say: { en: 'A common mistake: playing close position and calling it drop 2. If all four notes fit inside an octave, nothing was dropped.', he: 'טעות נפוצה: לנגן מצב צמוד ולקרוא לזה דרופ 2. אם כל ארבעת הצלילים נכנסים באוקטבה, שום דבר לא הורד.' },
        play: [ch([62, 65, 69, 72], 0.8), ch([57, 62, 65, 72])],
      },
      {
        say: { en: 'Big bands voice saxes this way, and guitarists comp with it. The spread opens the sound without losing the line.', he: 'תזמורות גדולות כותבות כך לסקסופונים, וגיטריסטים מלווים כך. הפריסה פותחת את הצליל בלי לאבד את הקו.' },
        play: [ch([55, 62, 65, 71], 0.8), ch([55, 60, 64, 71])],
      },
      {
        say: { en: 'How to find the next drop 2 quickly: picture the close voicing you would play, lead it by step, then drop the same voice again. The hand learns the four shapes.', he: 'איך מוצאים מהר את הדרופ 2 הבא: מדמיינים את הקול הצמוד שהייתם מנגנים, מובילים אותו בצעד, ומורידים שוב את אותו קול. היד לומדת את ארבע הצורות.' },
        play: [ch([62, 65, 69, 72], 0.7), ch([57, 62, 65, 72], 0.9)],
      },
      {
        say: { en: 'Drop 3 on the guitar puts the root on string six or five with a gap above it. It sounds like a small big band behind a singer.', he: 'דרופ 3 בגיטרה שם את היסוד על מיתר שש או חמש, עם רווח מעליו. זה נשמע כמו תזמורת קטנה מאחורי זמרת.' },
        play: [ch([50, 60, 65, 69], 0.8), ch([43, 53, 59, 64], 0.8), ch([48, 59, 64, 67])],
      },
      {
        say: { en: 'To keep: drop the second voice for drop 2, the third for drop 3, then lead every voice as before.', he: 'מה לזכור: מורידים את הקול השני לדרופ 2, את השלישי לדרופ 3, ומובילים כל קול כמו קודם.' },
        show: { text: { en: 'drop 2 · drop 3', he: 'דרופ 2 · דרופ 3' } },
      },
    ],
  },
  {
    id: 'vl-spread',
    area: 'harmony',
    emoji: '𝄞',
    title: { en: 'Spread voicings and a melody on top', he: 'קולות פרוסים ומנגינה למעלה' },
    takeaway: { en: 'Left hand root and 7th, right hand 3–5–9 led by step; with a melody, the melody note is always the top voice.', he: 'ביד שמאל יסוד וספטימה, ביד ימין 3–5–9 בצעדים; עם מנגינה, צליל המנגינה הוא תמיד הקול העליון.' },
    steps: [
      {
        say: { en: 'Hi {name}! A spread voicing uses both hands. Left hand: the root and the 7th. D and C for D minor 7.', he: 'היי {name}! קול פרוס משתמש בשתי הידיים. יד שמאל: היסוד והספטימה. רה ודו לרה מינור 7.' },
        play: [ch([50, 60])],
        show: { notes: [50, 60], chord: true, clef: 'bass' },
      },
      {
        say: { en: 'Right hand: the 3rd, the 5th and the 9th. F, A and E. Together: a wide, open chord.', he: 'יד ימין: הטרצה, הקווינטה והנונה. פה, לה ומי. ביחד: אקורד רחב ופתוח.' },
        play: [ch([50, 60, 65, 69, 76])],
        show: { notes: [65, 69, 76], chord: true },
      },
      {
        say: { en: 'The left hand follows the root. The right hand moves by small steps: F, A, E, then B, E, A over G7, then E, G, D over C major 7.', he: 'יד שמאל הולכת אחרי היסוד. יד ימין זזה בצעדים קטנים: פה, לה, מי, ואז סי, מי, לה מעל G7, ואז מי, סול, רה מעל דו מז׳ור 7.' },
        play: [ch([50, 60, 65, 69, 76], 0.9), ch([43, 53, 59, 64, 69], 0.9), ch([48, 59, 64, 67, 74])],
      },
      {
        say: { en: 'With a melody the rule changes a little: the melody note must be on top. Build the chord below it, still by the smallest move.', he: 'עם מנגינה הכלל משתנה מעט: צליל המנגינה חייב להיות למעלה. בונים את האקורד מתחתיו, עדיין בתנועה הקטנה ביותר.' },
        play: [ch([50, 69, 72, 74, 77], 0.9), ch([43, 71, 74, 76, 77], 0.9), ch([48, 71, 72, 74, 76])],
      },
      {
        say: { en: 'Your turn: chord names, and a melody when there is one. Choose voicings that carry it.', he: 'תורכם: שמות אקורדים, ומנגינה כשיש. בוחרים קולות שנושאים אותה.' },
        show: { text: { en: 'Dm7 · G7 · Cmaj7', he: 'Dm7 · G7 · Cmaj7' } },
      },
    ],
    more: [
      {
        say: { en: 'On the dominant play the 13th instead of the 5th: B, E, A over G and F. It sounds richer and moves more smoothly.', he: 'על הדומיננט מנגנים את ה־13 במקום הקווינטה: סי, מי, לה מעל סול ופה. זה נשמע עשיר יותר וזז חלק יותר.' },
        play: [ch([43, 53, 59, 64, 69])],
      },
      {
        say: { en: 'In minor: D half-diminished with F, A flat, G on top, then G7 flat 9, then C minor 6. The right hand stays close.', he: 'במינור: רה חצי מוקטן עם פה, לה במול, סול למעלה, ואז G7 במול 9, ואז דו מינור 6. יד ימין נשארת צמודה.' },
        play: [ch([50, 60, 65, 68, 79], 0.9), ch([43, 53, 59, 68, 80], 0.9), ch([48, 57, 63, 67, 74])],
      },
      {
        say: { en: 'Harmonising a melody: first find which chord tone the melody is, then fill in the others below by the nearest notes.', he: 'הרמוניזציה למנגינה: קודם מוצאים איזה צליל אקורד המנגינה, ואז ממלאים את האחרים מתחת בצלילים הקרובים.' },
        show: { text: { en: 'melody = top voice', he: 'מנגינה = קול עליון' } },
      },
      {
        say: { en: 'A common mistake: letting a chord note rise above the melody. Then the tune disappears inside the chord.', he: 'טעות נפוצה: לתת לצליל של האקורד לעלות מעל המנגינה. אז המנגינה נעלמת בתוך האקורד.' },
        play: [ch([50, 69, 72, 74, 77], 0.8), ch([50, 72, 74, 77, 81])],
      },
      {
        say: { en: 'Practise the right hand alone first: three notes moving by step over the changes. Then add the left hand, which only follows the roots.', he: 'מתרגלים קודם את יד ימין לבד: שלושה צלילים שזזים בצעדים לאורך המהלך. אחר כך מוסיפים את יד שמאל, שרק הולכת אחרי היסודות.' },
        play: [ch([65, 69, 76], 0.8), ch([59, 64, 69], 0.8), ch([64, 67, 74])],
      },
      {
        say: { en: 'Listen to the top: in a good spread the highest note makes a small tune of its own, even with no written melody.', he: 'הקשיבו לצליל העליון: בקול פרוס טוב הצליל הגבוה יוצר מנגינה קטנה משלו, גם בלי מנגינה כתובה.' },
        play: [ch([50, 60, 65, 69, 76], 0.8), ch([43, 53, 59, 64, 69], 0.8), ch([48, 59, 64, 67, 74])],
      },
      {
        say: { en: 'To keep: the left hand is the floor, the right hand sings, and the melody always sits on top.', he: 'מה לזכור: יד שמאל היא הרצפה, יד ימין שרה, והמנגינה תמיד יושבת למעלה.' },
        show: { text: { en: 'LH 1–7 · RH 3–5–9', he: 'שמאל 1–7 · ימין 3–5–9' } },
      },
    ],
  },
];

/** The lesson behind each voice-leading level (shown on the family page). */
export const VL_LEVEL_LESSON: Record<string, string> = {
  'k-vl-1': 'vl-triads',
  'k-vl-2': 'vl-triads',
  'k-vl-3': 'vl-guide',
  'k-vl-4': 'vl-sevenths',
  'k-vl-5': 'vl-sevenths',
  'k-vl-6': 'vl-drop',
  'k-vl-7': 'vl-spread',
  'k-vl-8': 'vl-spread',
  'g-vl-1': 'vl-triads',
  'g-vl-2': 'vl-drop',
  'g-vl-3': 'vl-drop',
};

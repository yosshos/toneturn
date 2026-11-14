// BASS_NICHE_PLAN (P1): quick lessons for the bass course's jazz and prog families — swing time, Barry Harris lines,
// the road map, the tumbao and the clave, odd meters, unison riffs, polymeter and metric modulation. Each opens its
// family's first path step (unit "tech:<family>"). Own words and examples; the drills then measure them in time.

import type { Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.4): Stimulus => ({ kind: 'chord', midis, duration });

export const LESSONS: MiniLesson[] = [
  {
    id: 'bass-swing',
    area: 'jazz',
    emoji: '𝄢',
    title: { en: 'Swing time on the bass', he: 'זמן סווינג על הבס' },
    takeaway: { en: 'Swing is measured: long quarters, a steady place against the ride, and the same tempo in the last chorus as in the first.', he: 'סווינג נמדד: רבעים ארוכים, מקום קבוע מול הרייד, ואותו טמפו בסבב האחרון כמו בראשון.' },
    steps: [
      {
        say: { en: 'Hi {name}! Right notes are half of walking. The other half is time, and time can be measured.', he: 'היי {name}! צלילים נכונים הם חצי מהווקינג. החצי השני הוא הזמן, ואת הזמן אפשר למדוד.' },
        play: [notes([31, 35, 38, 40, 41, 40, 38, 35], 0.5)],
      },
      {
        say: { en: 'First, long quarters. Each note rings until the next one starts. A short, dry note makes the band sound nervous.', he: 'קודם, רבעים ארוכים. כל צליל מצלצל עד שהבא מתחיל. צליל קצר ויבש גורם ללהקה להישמע עצבנית.' },
        play: [notes([33, 36, 40, 43], 0.6)],
        show: { text: { en: '♩ ♩ ♩ ♩ — each one full', he: '♩ ♩ ♩ ♩ — כל אחד מלא' } },
      },
      {
        say: { en: 'Second, your place against the ride cymbal. On top is a few milliseconds ahead, laid back a few behind. A good bassist chooses, and stays there.', he: 'שנית, המקום שלכם מול מצלתיית הרייד. על הקצה זה כמה אלפיות שנייה לפני, מאחור זה כמה אחרי. בסיסט טוב בוחר, ונשאר שם.' },
        show: { text: { en: 'ahead · centre · behind', he: 'לפני · במרכז · אחרי' } },
      },
      {
        say: { en: 'Third, no drift. The third chorus is as fast as the first, even when the drums drop out.', he: 'שלישית, בלי לזוז. הסבב השלישי מהיר כמו הראשון, גם כשהתופים יוצאים.' },
        play: [notes([29, 33, 36, 39, 34, 38, 41, 44], 0.45)],
      },
      {
        say: { en: 'Your turn: walk with the band. I measure the length of every note, where it sits against the ride, and the tempo of every chorus.', he: 'תורכם: ווקינג עם הלהקה. אני מודד את האורך של כל צליל, איפה הוא יושב מול הרייד, ואת הטמפו של כל סבב.' },
        play: [notes([31, 35, 38, 41], 0.55)],
      },
    ],
    more: [
      {
        say: { en: 'Why long notes? The bass is the floor of the band. When the floor has holes, the soloist hears them first.', he: 'למה צלילים ארוכים? הבס הוא הרצפה של הלהקה. כשיש חורים ברצפה, הסולן שומע אותם ראשון.' },
        play: [notes([28, 32, 35, 38], 0.6)],
      },
      {
        say: { en: 'The ride plays one, two and a skip, three, four and a skip. Lock your quarters to its beats, not to its skips.', he: 'הרייד מנגן אחת, שתיים וקפיצה, שלוש, ארבע וקפיצה. נועלים את הרבעים על הפעמות שלו, לא על הקפיצות.' },
      },
      {
        say: { en: 'Playing on top pushes the band forward; it suits fast tunes. Laid back makes a ballad or a slow blues heavy and warm.', he: 'נגינה על הקצה דוחפת את הלהקה קדימה; היא מתאימה לשירים מהירים. מאחורי הפעמה נותנת לבלדה או לבלוז איטי כובד וחום.' },
      },
      {
        say: { en: 'Up-tempo, from 220 to over 300, the hand stays loose and the notes stay long. Practise at the edge of clean, then step back.', he: 'בטמפו מהיר, מ-220 ועד מעל 300, היד נשארת רפויה והצלילים נשארים ארוכים. מתרגלים בקצה של הנקי, ואז חוזרים צעד אחורה.' },
        play: [notes([33, 37, 40, 43, 38, 42, 45, 47], 0.3)],
      },
      {
        say: { en: 'The usual mistake is rushing when the drums stop. Count the bars in your head and keep the same length of beat.', he: 'הטעות הנפוצה היא להאיץ כשהתופים נעצרים. סופרים את התיבות בראש ושומרים על אותו אורך פעמה.' },
      },
      {
        say: { en: 'Listen to the great walking bassists on records: the notes are simple, but every quarter is full and sits in the same place for chorus after chorus. That is the sound these levels measure.', he: 'הקשיבו לבסיסטים הגדולים של הווקינג בהקלטות: הצלילים פשוטים, אבל כל רבע מלא ויושב באותו מקום סבב אחרי סבב. זה הצליל שהשלבים האלה מודדים.' },
      },
      {
        say: { en: 'To keep: long, placed, steady. The notes come from the walking rules; the swing comes from these three.', he: 'מה לזכור: ארוך, ממוקם, יציב. הצלילים באים מחוקי הווקינג; הסווינג בא משלושת אלה.' },
        show: { text: { en: 'long · placed · steady', he: 'ארוך · ממוקם · יציב' } },
      },
    ],
  },
  {
    id: 'bass-barry',
    area: 'jazz',
    emoji: '𝄢',
    title: { en: 'Barry Harris lines on the bass', he: 'הקווים של בארי האריס על הבס' },
    takeaway: { en: 'Chord tones on the downbeats: run down the dominant scale and add a half step where a chord tone would fall off the beat.', he: 'צלילי אקורד על הפעמות החזקות: יורדים בסולם הדומיננטי ומוסיפים חצי טון במקום שבו צליל אקורד היה נופל מחוץ לפעמה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Barry Harris taught one simple goal for lines: the chord tones land on the beats.', he: 'היי {name}! בארי האריס לימד מטרה פשוטה אחת לקווים: צלילי האקורד נוחתים על הפעמות.' },
        play: [notes([43, 41, 40, 38, 36, 35, 33, 31], 0.35)],
      },
      {
        say: { en: 'Run down the G7 scale from G in eighths and the chord tones fall on the off-beats by the second beat. Something has to give.', he: 'יורדים בסולם של G7 מ-G בשמיניות, וכבר בפעמה השנייה צלילי האקורד נופלים בין הפעמות. משהו צריך לזוז.' },
        show: { text: { en: 'G F E D C B A G', he: 'G F E D C B A G' } },
      },
      {
        say: { en: 'The fix is one extra half step, between the root and the flat seven. Now G, F, D and B sit on the beats.', he: 'התיקון הוא חצי טון אחד נוסף, בין היסוד לספטימה הקטנה. עכשיו G, F, D ו-B יושבים על הפעמות.' },
        play: [notes([43, 42, 41, 40, 38, 36, 35, 33, 31], 0.33)],
        show: { text: { en: 'G F♯ F E D C B A G', he: 'G F♯ F E D C B A G' } },
      },
      {
        say: { en: 'The same idea works in a walk: chord tones on one and three, and passing notes, scale or chromatic, on two and four.', he: 'אותו רעיון עובד בווקינג: צלילי אקורד על אחת ושלוש, וצלילים עוברים, מהסולם או כרומטיים, על שתיים וארבע.' },
        play: [notes([38, 40, 41, 42, 43, 41, 40, 39], 0.5)],
      },
      {
        say: { en: 'Your turn: play the lines with the band. I check that every downbeat is a chord tone.', he: 'תורכם: נגנו את הקווים עם הלהקה. אני בודק שכל פעמה חזקה היא צליל אקורד.' },
        play: [chord([31, 47, 53, 57], 1.2)],
      },
    ],
    more: [
      {
        say: { en: 'Barry built his harmony on the 6th chord and the diminished chord a half step below it. Together they make an eight-note scale.', he: 'בארי בנה את ההרמוניה שלו על אקורד השישית ועל המוקטן שחצי טון מתחתיו. יחד הם יוצרים סולם של שמונה צלילים.' },
        play: [notes([36, 38, 40, 41, 43, 44, 45, 47], 0.35)],
      },
      {
        say: { en: 'On the bass the diminished chord is a passing chord: C, C sharp diminished, D minor. It walks you up by half steps.', he: 'על הבס המוקטן הוא אקורד עובר: C, C דיאז מוקטן, D מינור. הוא מוביל אתכם למעלה בחצאי טונים.' },
        play: [notes([36, 37, 38, 43], 0.6)],
      },
      {
        say: { en: 'A pivot breaks a line that runs too low: the next note jumps up an octave and the line keeps falling from there.', he: 'פיבוט שובר קו שיורד נמוך מדי: הצליל הבא קופץ אוקטבה למעלה והקו ממשיך לרדת משם.' },
      },
      {
        say: { en: 'Start from the 3rd, the 5th or the 7th and the half steps change place, but the goal stays: chord tones on the beat.', he: 'מתחילים מהטרצה, מהקווינטה או מהספטימה, וחצאי הטונים מחליפים מקום, אבל המטרה נשארת: צלילי אקורד על הפעמה.' },
      },
      {
        say: { en: 'The usual mistake is adding half steps everywhere. Add one only where a chord tone would slip off the beat.', he: 'הטעות הנפוצה היא להוסיף חצאי טונים בכל מקום. מוסיפים רק במקום שבו צליל אקורד היה מחליק מהפעמה.' },
      },
      {
        say: { en: 'You will hear these lines in bebop solos on every instrument. On the bass they make a solo chorus sound like the horns, and they make a walking line sound inevitable.', he: 'את הקווים האלה שומעים בסולואים של ביבופ על כל כלי. על הבס הם גורמים לסבב סולו להישמע כמו כלי הנשיפה, ולקו ווקינג להישמע מתבקש.' },
      },
      {
        say: { en: 'To keep: downbeats are chord tones. Everything between them is a passing note that leads to the next one.', he: 'מה לזכור: הפעמות החזקות הן צלילי אקורד. כל מה שביניהן הוא צליל עובר שמוביל לבא.' },
        show: { text: { en: 'beat = chord tone', he: 'פעמה = צליל אקורד' } },
      },
    ],
  },
  {
    id: 'bass-form',
    area: 'jazz',
    emoji: '𝄢',
    title: { en: 'The road map: form and arrangement', he: 'מפת הדרכים: צורה ועיבוד' },
    takeaway: { en: 'Know where you are in the form: two-feel and four-feel by section, stops and hits with the band, tags and endings.', he: 'לדעת איפה אתם בצורה: בשתיים ובארבע לפי הקטע, עצירות ומכות עם הלהקה, טאגים וסיומים.' },
    steps: [
      {
        say: { en: 'Hi {name}! A tune is a road map: sections, repeats and an ending. The bassist is the one who must never get lost.', he: 'היי {name}! שיר הוא מפת דרכים: קטעים, חזרות וסיום. הבסיסט הוא זה שאסור לו ללכת לאיבוד אף פעם.' },
        show: { text: { en: 'A A B A', he: 'A A B A' } },
      },
      {
        say: { en: 'A common plan: the A sections in two, half notes on one and three, and the bridge in four, walking quarters.', he: 'תוכנית נפוצה: קטעי A בשתיים, חצאים על אחת ושלוש, והגשר בארבע, רבעים של ווקינג.' },
        play: [notes([36, 43, 33, 40], 0.9), notes([40, 44, 47, 45, 33, 37, 40, 43], 0.45)],
      },
      {
        say: { en: 'Stop-time: the band hits only on one. You hit with them, short, and you keep counting through the silence.', he: 'עצירות: הלהקה מכה רק על אחת. אתם מכים איתם, קצר, וממשיכים לספור דרך השקט.' },
        play: [notes([29, 34, 29, 34], 0.9)],
      },
      {
        say: { en: 'A tag repeats the last turnaround, often three times, and the tune ends on one short hit together.', he: 'טאג חוזר על הטרנאראונד האחרון, הרבה פעמים שלוש פעמים, והשיר נגמר במכה קצרה אחת ביחד.' },
        play: [notes([40, 45, 38, 43, 40, 45, 38, 43, 36], 0.4)],
      },
      {
        say: { en: 'Your turn: the road map shows the sections. I check every bar is in its place and every section starts on time.', he: 'תורכם: מפת הדרכים מראה את הקטעים. אני בודק שכל תיבה במקומה ושכל קטע מתחיל בזמן.' },
        play: [notes([36, 43, 36, 43], 0.7)],
      },
    ],
    more: [
      {
        say: { en: 'Pedal intros hold the dominant in the bass while the chords move above it. The tension breaks when the head comes in.', he: 'פתיחות על עוגב מחזיקות את הדומיננטה בבס בזמן שהאקורדים זזים מעליה. המתח נשבר כשהנושא נכנס.' },
        play: [notes([31, 31, 31, 43, 31, 31, 31, 43], 0.4)],
      },
      {
        say: { en: 'A Latin A section with a swing bridge changes the feel, not the tempo. The quarter note stays the same length.', he: 'קטע A לטיני עם גשר בסווינג משנה את התחושה, לא את הטמפו. הרבע נשאר באותו אורך.' },
      },
      {
        say: { en: 'Pushes put the next chord on the "and" of four, tied over the bar line. Skips are short notes that kick the two-feel along.', he: 'דחיפות שמות את האקורד הבא על ה"וְ" של ארבע, קשור מעבר לקו התיבה. קפיצות הן צלילים קצרים שמניעים את התחושה בשתיים.' },
        play: [notes([36, 36, 43, 41], 0.5)],
      },
      {
        say: { en: 'Lost a bar? Listen for the turnaround or the bridge and jump back in on its first beat. Never stop.', he: 'איבדתם תיבה? מקשיבים לטרנאראונד או לגשר ונכנסים שוב בפעמה הראשונה שלו. אף פעם לא עוצרים.' },
      },
      {
        say: { en: 'The usual mistake is counting bars but not sections. Feel the four-bar phrases; the form is built from them.', he: 'הטעות הנפוצה היא לספור תיבות ולא קטעים. מרגישים את המשפטים של ארבע תיבות; הצורה בנויה מהם.' },
      },
      {
        say: { en: 'On a gig nobody hands you the form twice. Learn the road map of each tune before you play it: how many bars, where the bridge is, how it ends.', he: 'בהופעה אף אחד לא נותן לכם את הצורה פעמיים. לומדים את מפת הדרכים של כל שיר לפני שמנגנים אותו: כמה תיבות, איפה הגשר, איך הוא נגמר.' },
      },
      {
        say: { en: 'To keep: know the map before you play, feel each section change, and land every new section on one.', he: 'מה לזכור: מכירים את המפה לפני שמנגנים, מרגישים כל מעבר קטע, ונוחתים על אחת בכל קטע חדש.' },
        show: { text: { en: 'map · feel · land', he: 'מפה · תחושה · נחיתה' } },
      },
    ],
  },
  {
    id: 'bass-tumbao',
    area: 'world',
    emoji: '𝄢',
    title: { en: 'The tumbao and the clave', he: 'הטומבאו והקלאבה' },
    takeaway: { en: 'The Afro-Cuban bass plays the "and" of two and beat four, leaves the one empty, and anticipates the next chord.', he: 'הבס האפרו-קובני מנגן על ה"וְ" של שתיים ועל ארבע, משאיר את האחת ריקה, ומקדים את האקורד הבא.' },
    steps: [
      {
        say: { en: 'Hi {name}! In salsa and son the bass does something strange: it does not play on one.', he: 'היי {name}! בסלסה ובסון הבס עושה משהו מוזר: הוא לא מנגן על אחת.' },
        play: [notes([40, 33, 40, 33], 0.6)],
      },
      {
        say: { en: 'The tumbao: a note on the "and" of two, and a note on four that rings over the bar line, through the one.', he: 'הטומבאו: צליל על ה"וְ" של שתיים, וצליל על ארבע שמצלצל מעבר לקו התיבה, דרך האחת.' },
        show: { text: { en: '1 & 2 (&) 3 & (4)', he: '1 וְ 2 (וְ) 3 וְ (4)' } },
      },
      {
        say: { en: 'The note on four is already the NEXT chord. The bass tells the band where the harmony is going.', he: 'הצליל על ארבע הוא כבר האקורד הבא. הבס אומר ללהקה לאן ההרמוניה הולכת.' },
        play: [notes([40, 41, 40, 43, 47, 43], 0.45)],
      },
      {
        say: { en: 'Above it all sits the clave, a two-bar pattern: three hits, then two, or two, then three. Everything lines up with it.', he: 'מעל הכול יושבת הקלאבה, דפוס של שתי תיבות: שלוש מכות, ואז שתיים, או שתיים ואז שלוש. הכול מסתדר לפיה.' },
        play: [notes([72, 72, 72, 72, 72], 0.4)],
      },
      {
        say: { en: 'Your turn: play the tumbao with the clave. A note on one counts as an extra note, and a late change counts as missed.', he: 'תורכם: נגנו טומבאו עם הקלאבה. צליל על אחת נחשב צליל מיותר, וחילוף מאוחר נחשב החמצה.' },
        play: [notes([40, 33, 45, 40], 0.5)],
      },
    ],
    more: [
      {
        say: { en: 'Cha-cha keeps the one, then adds the "cha-cha" on four and its "and". Songo and Mozambique syncopate in sixteenths.', he: 'בצ׳ה-צ׳ה האחת נשארת, ומתווסף ה"צ׳ה-צ׳ה" על ארבע וה"וְ" שלו. סונגו ומוזמביק מסנכפים בשש-עשריות.' },
        play: [notes([36, 43, 48, 47], 0.4)],
      },
      {
        say: { en: 'Afro-Cuban six-eight feels each beat in three. The bell pattern is long and asymmetric; count it slowly at first.', he: 'שש-שמיניות אפרו-קובני מרגיש כל פעמה בשלוש. דפוס הפעמון ארוך ולא סימטרי; סופרים אותו לאט בהתחלה.' },
      },
      {
        say: { en: 'In Brazil the bass works differently: the samba and partido alto drive the sixteenths, the baião rocks on a dotted rhythm.', he: 'בברזיל הבס עובד אחרת: הסמבה והפרטידו אלטו מניעים את השש-עשריות, והבאיון מתנדנד על מקצב מנוקד.' },
        play: [notes([36, 43, 48, 36, 43, 46], 0.3)],
      },
      {
        say: { en: 'Latin jazz brings the tumbao to standards: the root of every new chord arrives an eighth early, on the "and".', he: 'ג׳אז לטיני מביא את הטומבאו לסטנדרטים: היסוד של כל אקורד חדש מגיע שמינית מוקדם, על ה"וְ".' },
      },
      {
        say: { en: 'The usual mistake is falling back onto one when it gets busy. Keep the one for the drums and the piano, and trust the silence.', he: 'הטעות הנפוצה היא לחזור לאחת כשנהיה עמוס. משאירים את האחת לתופים ולפסנתר, וסומכים על השקט.' },
      },
      {
        say: { en: 'Listen to salsa and Latin jazz records and follow only the bass: you will hear the empty one, the anticipations, and how the whole band leans on them.', he: 'הקשיבו להקלטות של סלסה וג׳אז לטיני ועקבו רק אחרי הבס: תשמעו את האחת הריקה, את ההקדמות, ואיך כל הלהקה נשענת עליהן.' },
      },
      {
        say: { en: 'To keep: the "and" of two, then four, and four is the next chord. Feel the clave over two bars.', he: 'מה לזכור: ה"וְ" של שתיים, ואז ארבע, וארבע הוא האקורד הבא. מרגישים את הקלאבה על פני שתי תיבות.' },
        show: { text: { en: '2& · 4 → next chord', he: '2וְ · 4 ← האקורד הבא' } },
      },
    ],
  },
  {
    id: 'bass-odd',
    area: 'rhythm',
    emoji: '𝄢',
    title: { en: 'Odd meters: twos and threes', he: 'משקלים אי-זוגיים: שתיים ושלוש' },
    takeaway: { en: 'Every odd meter is twos and threes: count the groups, accent their first note, and the bar stops feeling odd.', he: 'כל משקל אי-זוגי הוא שתיים ושלוש: סופרים את הקבוצות, מדגישים את הצליל הראשון של כל אחת, והתיבה מפסיקה להרגיש מוזרה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Seven-eight sounds hard, but nobody counts to seven. Players count groups of two and three.', he: 'היי {name}! שבע-שמיניות נשמע קשה, אבל אף אחד לא סופר עד שבע. נגנים סופרים קבוצות של שתיים ושלוש.' },
        play: [notes([40, 40, 52, 40, 47, 40, 40], 0.25)],
      },
      {
        say: { en: 'Two plus two plus three: one-two, one-two, one-two-three. The first note of each group gets the accent, so the listener hears the groups, not a long row of eighths.', he: 'שתיים ועוד שתיים ועוד שלוש: אחת-שתיים, אחת-שתיים, אחת-שתיים-שלוש. הצליל הראשון של כל קבוצה מקבל את ההדגשה, כך שהמאזין שומע את הקבוצות ולא שורה ארוכה של שמיניות.' },
        show: { text: { en: '7/8 = 2 + 2 + 3', he: '7/8 = 2 + 2 + 3' } },
      },
      {
        say: { en: 'Turn the groups around and the same seven feels new: three plus two plus two, or two plus three plus two.', he: 'מסובבים את הקבוצות ואותן שבע מרגישות חדשות: שלוש ועוד שתיים ועוד שתיים, או שתיים ועוד שלוש ועוד שתיים.' },
        play: [notes([40, 40, 40, 52, 40, 47, 40], 0.25)],
      },
      {
        say: { en: 'Longer meters are just more groups: eleven is three, three, three, two; thirteen adds another two.', he: 'משקלים ארוכים הם פשוט יותר קבוצות: אחת-עשרה היא שלוש, שלוש, שלוש, שתיים; שלוש-עשרה מוסיפה עוד שתיים.' },
        play: [notes([40, 40, 40, 47, 40, 40, 52, 40, 40, 45, 40], 0.22)],
      },
      {
        say: { en: 'Your turn: play the riffs with the drums. I time every eighth on the bar, and I listen for the accents on the group starts.', he: 'תורכם: נגנו את הריפים עם התופים. אני מודד כל שמינית בתיבה, ומקשיב להדגשות בתחילת כל קבוצה.' },
        play: [notes([40, 40, 52, 40, 47, 40, 40], 0.22)],
      },
    ],
    more: [
      {
        say: { en: 'Five-four is three plus two or two plus three quarters. Many prog riffs use it as a long, lopsided groove.', he: 'חמש-רבעים הוא שלוש ועוד שתיים או שתיים ועוד שלוש רבעים. הרבה ריפים של פרוג משתמשים בו כגרוב ארוך ולא סימטרי.' },
        play: [notes([40, 40, 40, 47, 40], 0.4)],
      },
      {
        say: { en: 'Odd groupings can sit inside four-four too: three, three, two eighths fill a bar and make it lean forward.', he: 'קבוצות אי-זוגיות יכולות לשבת גם בתוך ארבע-רבעים: שלוש, שלוש, שתיים שמיניות ממלאות תיבה וגורמות לה לנטות קדימה.' },
        play: [notes([40, 40, 40, 52, 40, 40, 47, 40], 0.25)],
      },
      {
        say: { en: 'Mixed meters change from bar to bar, a seven-eight then a four-four. Read the meter before each bar like a chord.', he: 'משקלים מתחלפים משתנים מתיבה לתיבה, שבע-שמיניות ואז ארבע-רבעים. קוראים את המשקל לפני כל תיבה כמו אקורד.' },
      },
      {
        say: { en: 'Displacement moves a riff an eighth or a sixteenth later. The notes stay the same; the beat under them moves.', he: 'הזזה מזיזה ריף שמינית או שש-עשרית מאוחר יותר. הצלילים נשארים אותו דבר; הפעמה שמתחתם זזה.' },
      },
      {
        say: { en: 'The usual mistake is rushing the last group of three. Give it its full length before the next one, or the bar shrinks to six.', he: 'הטעות הנפוצה היא למהר בקבוצה האחרונה של שלוש. נותנים לה את מלוא האורך לפני האחת הבאה, אחרת התיבה מתכווצת לשש.' },
      },
      {
        say: { en: 'Odd meters are everywhere in progressive rock, in Balkan and Middle-Eastern music and in modern jazz. The same twos and threes run through all of them, so the skill carries over.', he: 'משקלים אי-זוגיים נמצאים בכל מקום ברוק מתקדם, במוזיקה בלקנית ומזרחית ובג׳אז מודרני. אותן שתיים ושלוש עוברות בכולם, ולכן המיומנות עוברת איתן.' },
      },
      {
        say: { en: 'To keep: count the groups, not the eighths, and accent each group start. Then speed up.', he: 'מה לזכור: סופרים קבוצות, לא שמיניות, ומדגישים את תחילת כל קבוצה. ורק אז מאיצים.' },
        show: { text: { en: '2 + 2 + 3', he: '2 + 2 + 3' } },
      },
    ],
  },
  {
    id: 'bass-unison',
    area: 'rhythm',
    emoji: '𝄢',
    title: { en: 'Unison riffs', he: 'ריפים באוניסון' },
    takeaway: { en: 'In a unison every note starts with the guitar or the keys: tight means within about a hundredth of a second, every time.', he: 'באוניסון כל צליל מתחיל יחד עם הגיטרה או הקלידים: צמוד פירושו בערך מאית שנייה, בכל פעם.' },
    steps: [
      {
        say: { en: 'Hi {name}! Prog and fusion bands love unisons: bass and guitar playing the same riff together, as one instrument.', he: 'היי {name}! להקות פרוג ופיוז׳ן אוהבות אוניסונים: בס וגיטרה מנגנים את אותו ריף, כמו כלי אחד.' },
        play: [notes([40, 40, 52, 50, 47, 45, 43, 40], 0.25)],
      },
      {
        say: { en: 'The guitar usually plays it an octave higher. Sometimes a fifth higher, so the bass sounds a fifth below and the riff gets a heavy, open sound.', he: 'הגיטרה בדרך כלל מנגנת אותו אוקטבה מעל. לפעמים קווינטה מעל, כך שהבס נשמע קווינטה מתחת והריף מקבל צליל כבד ופתוח.' },
        play: [chord([40, 52], 0.8), chord([40, 59], 0.8)],
      },
      {
        say: { en: 'Tight means your notes start with theirs, within about twelve milliseconds on average, and the spread stays small.', he: 'צמוד פירושו שהצלילים שלכם מתחילים יחד עם שלהם, בערך שתים-עשרה אלפיות שנייה בממוצע, והפיזור נשאר קטן.' },
        show: { text: { en: '±12 ms', he: '±12 ms' } },
      },
      {
        say: { en: 'Fast runs, chromatic, whole-tone or diminished, test it most: every sixteenth lined up with the keys.', he: 'ריצות מהירות, כרומטיות, טון שלם או מוקטנות, בודקות את זה הכי הרבה: כל שש-עשרית מיושרת עם הקלידים.' },
        play: [notes([40, 41, 42, 43, 44, 45, 46, 47], 0.15)],
      },
      {
        say: { en: 'Your turn: play the riff with the band in your headphones. I measure how far each note is from theirs.', he: 'תורכם: נגנו את הריף עם הלהקה באוזניות. אני מודד כמה רחוק כל צליל שלכם משלהם.' },
        play: [notes([40, 43, 45, 47], 0.3)],
      },
    ],
    more: [
      {
        say: { en: 'A pedal riff keeps the low root between moving notes; the pick plays down and up so every note has the same attack.', he: 'ריף עוגב שומר את היסוד הנמוך בין צלילים זזים; המפרט מנגן למטה ולמעלה כך שלכל צליל אותה התקפה.' },
        play: [notes([28, 40, 28, 38, 28, 35, 28, 31], 0.2)],
      },
      {
        say: { en: 'A sequenced riff keeps its shape and moves it to each chord root. An ostinato keeps its notes while the chords change above it.', he: 'ריף בסקוונצה שומר על הצורה שלו ומעביר אותה לכל יסוד של אקורד. אוסטינטו שומר על הצלילים בזמן שהאקורדים משתנים מעליו.' },
      },
      {
        say: { en: 'Odd-meter unisons combine both skills: the group accents and the lock to the band.', he: 'אוניסונים במשקל אי-זוגי מחברים את שתי המיומנויות: ההדגשות של הקבוצות והנעילה עם הלהקה.' },
        play: [notes([40, 40, 52, 40, 47, 40, 40], 0.22)],
      },
      {
        say: { en: 'The usual mistake is listening to yourself. Listen to the guitar and put your note inside its note, so the two attacks become one.', he: 'הטעות הנפוצה היא להקשיב לעצמכם. מקשיבים לגיטרה ושמים את הצליל שלכם בתוך הצליל שלה, כך ששתי ההתקפות נעשות אחת.' },
      },
      {
        say: { en: 'Headphones matter here: the band plays only in them, so the microphone hears just your bass and can time it against the guitar.', he: 'האוזניות חשובות כאן: הלהקה מנגנת רק בהן, כך שהמיקרופון שומע רק את הבס שלכם ויכול למדוד אותו מול הגיטרה.' },
      },
      {
        say: { en: 'Fusion and progressive bands rehearse their unison passages slowly for weeks. Do the same here: the tempo ladder raises the speed only after three clean takes.', he: 'להקות פיוז׳ן ופרוג מתרגלות את קטעי האוניסון שלהן לאט במשך שבועות. עושים כאן אותו דבר: סולם הטמפו מעלה את המהירות רק אחרי שלושה ביצועים נקיים.' },
      },
      {
        say: { en: 'To keep: one riff, two instruments, one attack. Slow it down until it is tight, then raise the tempo.', he: 'מה לזכור: ריף אחד, שני כלים, התקפה אחת. מאטים עד שזה צמוד, ואז מעלים את הטמפו.' },
        show: { text: { en: 'one riff · one attack', he: 'ריף אחד · התקפה אחת' } },
      },
    ],
  },
  {
    id: 'bass-poly',
    area: 'rhythm',
    emoji: '𝄢',
    title: { en: 'Polymeter and metric modulation', he: 'פולימטר ומודולציה מטרית' },
    takeaway: { en: 'A riff can cycle against the band’s bar and meet it again later; a metric modulation turns one note value into the new beat.', he: 'ריף יכול להסתובב מול התיבה של הלהקה ולפגוש אותה שוב מאוחר יותר; מודולציה מטרית הופכת ערך תו אחד לפעמה החדשה.' },
    steps: [
      {
        say: { en: 'Hi {name}! In polymeter the drums stay in four while your riff has its own length, five or seven eighths.', he: 'היי {name}! בפולימטר התופים נשארים בארבע בזמן שלריף שלכם יש אורך משלו, חמש או שבע שמיניות.' },
        play: [notes([40, 52, 50, 47, 43], 0.25)],
      },
      {
        say: { en: 'A five-eighth riff over four-four drifts against the bar line and meets the drums again after five bars.', he: 'ריף של חמש שמיניות מעל ארבע-רבעים זז מול קו התיבה ונפגש שוב עם התופים אחרי חמש תיבות.' },
        show: { text: { en: '8 × 5 = 5 × 8', he: '8 × 5 = 5 × 8' } },
      },
      {
        say: { en: 'Three against two: dotted quarters over the beat. Four against three: four notes in every bar of three. In both, the band\'s beat stays where it was.', he: 'שלוש נגד שתיים: רבעים מנוקדים מעל הפעמה. ארבע נגד שלוש: ארבעה צלילים בכל תיבה של שלוש. בשניהם הפעמה של הלהקה נשארת במקומה.' },
        play: [notes([40, 47, 52], 0.6)],
      },
      {
        say: { en: 'Metric modulation: play triplet quarters, then make that triplet the new beat. One hundred twenty becomes one hundred eighty.', he: 'מודולציה מטרית: מנגנים רבעי טריולה, ואז הופכים את הטריולה לפעמה החדשה. מאה עשרים נהיה מאה שמונים.' },
        play: [notes([40, 43, 45, 47], 0.5), notes([40, 43, 45, 47, 48, 47], 0.333)],
      },
      {
        say: { en: 'Your turn: I measure the new tempo against the written ratio, within two percent, and your first note in it.', he: 'תורכם: אני מודד את הטמפו החדש מול היחס הכתוב, בטווח של שני אחוזים, ואת הצליל הראשון שלכם בו.' },
        play: [notes([40, 47, 52, 47], 0.4)],
      },
    ],
    more: [
      {
        say: { en: 'Count the riff in its own groups and let the drums go round you. Do not try to count both at once, at first.', he: 'סופרים את הריף בקבוצות שלו ונותנים לתופים להסתובב סביבכם. לא מנסים לספור את שניהם יחד.' },
      },
      {
        say: { en: 'The dotted-eighth modulation is smaller: the dotted eighth becomes the new quarter, one hundred twenty to one hundred sixty.', he: 'המודולציה של שמינית מנוקדת קטנה יותר: השמינית המנוקדת נעשית הרבע החדש, ממאה עשרים למאה שישים.' },
        play: [notes([40, 43, 45, 47, 48], 0.375)],
      },
      {
        say: { en: 'Before the change, feel the new note value inside the old beat for a whole bar. Then simply keep it.', he: 'לפני השינוי מרגישים את ערך התו החדש בתוך הפעמה הישנה במשך תיבה שלמה. ואז פשוט נשארים איתו.' },
        play: [notes([40, 40, 40, 40, 40, 40], 0.333)],
      },
      {
        say: { en: 'A seven-eight riff against four-four drums is the classic prog sound: the riff and the backbeat meet every eight bars.', he: 'ריף בשבע-שמיניות מול תופים בארבע-רבעים הוא הצליל הקלאסי של פרוג: הריף והבקביט נפגשים כל שמונה תיבות.' },
      },
      {
        say: { en: 'The usual mistake is slowing back to the old tempo after a few bars. The new beat must stay new until the next change.', he: 'הטעות הנפוצה היא לחזור לאט לטמפו הישן אחרי כמה תיבות. הפעמה החדשה צריכה להישאר חדשה עד השינוי הבא.' },
      },
      {
        say: { en: 'Progressive rock and modern jazz drummers use these devices all the time. When the bass keeps its own cycle steady, the band sounds deliberate rather than lost.', he: 'מתופפים של רוק מתקדם וג׳אז מודרני משתמשים בכלים האלה כל הזמן. כשהבס שומר על המחזור שלו יציב, הלהקה נשמעת מכוונת ולא אבודה.' },
      },
      {
        say: { en: 'To keep: in polymeter count your own groups; in a modulation, the pivot note becomes the beat.', he: 'מה לזכור: בפולימטר סופרים את הקבוצות שלכם; במודולציה, תו הציר נעשה הפעמה.' },
        show: { text: { en: '♩3 → ♩', he: '♩3 ← ♩' } },
      },
    ],
  },
];

/** Unit id ("tech:<family>": the family's first path step) → mini-lesson id. */
export const UNITS: Record<string, string> = {
  'tech:b-swing': 'bass-swing',
  'tech:b-barry': 'bass-barry',
  'tech:b-jform': 'bass-form',
  'tech:b-latin': 'bass-tumbao',
  'tech:b-odd': 'bass-odd',
  'tech:b-prog': 'bass-unison',
  'tech:b-poly': 'bass-poly',
};

// Build identity + player-facing changelog.

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
export const APP_COMMIT = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'dev';
export const APP_BUILT = typeof __APP_BUILT__ !== 'undefined' ? __APP_BUILT__ : '';

export interface ChangeEntry {
  version: string;
  date: string;
  en: string[];
  he: string[];
}

/** Newest first. Keep entries short and player-facing. */
export const CHANGELOG: ChangeEntry[] = [
  {
    version: '0.32.0',
    date: '2026-11-06',
    en: [
      'Preview: the Avatar studio — two 3D avatars to dress part by part, items to try (headphones, shades, beanie, a legendary guitar) and emotes, including a jam together',
    ],
    he: [
      'תצוגה מקדימה: סטודיו לאוואטר — שני אוואטרים בתלת־ממד להלביש חלק־חלק, פריטים לנסות (אוזניות, משקפי שמש, כובע גרב, גיטרה אגדית) ואימוטים, כולל ג׳אם ביחד',
    ],
  },
  {
    version: '0.31.0',
    date: '2026-11-05',
    en: [
      'Truth or Bluff (was True or false?): music theory statements — true, or a bluff? Pick topics and a level, play solo, against a friend on one device, or online. Every miss shows you why',
      'Find my level measures all 20 skills by default; skip any section, or measure just one area',
      'New practice: rhythm memory, chord memory, call & response (improvisation by ear), and deeper sight-reading (bass clef, minor, three versions)',
    ],
    he: [
      'אמת או בלוף (לשעבר נכון או לא?): משפטים בתיאוריה — אמת, או בלוף? בחרו נושאים ורמה, שחקו לבד, נגד חבר על אותו מכשיר, או אונליין. כל טעות מראה למה',
      'מבחן הרמה מודד את כל 20 הכישורים כברירת מחדל; אפשר לדלג על כל חלק, או למדוד תחום אחד בלבד',
      'תרגול חדש: זיכרון ריתמי, זיכרון הרמוני, שאלה ותשובה (אלתור בשמיעה), וקריאה מהדף לעומק (מפתח פה, מינור, שלוש גרסאות)',
    ],
  },
  {
    version: '0.30.0',
    date: '2026-11-05',
    en: [
      'Find my level now measures every skill to your edge: each one gets harder until you miss, then the next — with a level meter at the side and a word of encouragement at every step',
      'Rhythm is tapped on a big pad everywhere (saying “ta” is optional in Settings)',
      'More: quick lessons for every vocal track, sight-singing feedback per note, Barry Harris 6-chord and diminished notes and the chromatic scale in sections, secondary dominants and the blues turnaround, “in tune, sharp or flat” down to 10 cents',
      'Phones: no screen scrolls sideways',
      'New skills — Tempo & pulse, Fine pitch, Sight-reading, Improvisation — with new topics (every interval by ear, minor & chromatic degrees); the Skill Map shows five domains; a cleaner home screen with today’s plan first',
    ],
    he: [
      'מבחן הרמה מודד עכשיו כל כישור עד הקצה: כל אחד מתקשה עד שטועים, ואז הבא — עם מד רמה בצד ומילה טובה בכל שלב',
      'קצב מקישים על כפתור גדול בכל מקום (לומר ״טה״ — רשות, בהגדרות)',
      'ועוד: שיעורים קצרים לכל מסלולי הקול, משוב לכל צליל בקריאה בשירה, צלילי אקורד ה־6 והדימיניש של בארי האריס והסולם הכרומטי בקטעים, דומיננטות משניות וטרנאראונד בלוז, ״מכוון, גבוה או נמוך״ עד 10 סנט',
      'טלפונים: אף מסך לא גולל הצידה',
      'כישורים חדשים — טמפו ופעמה, גובה עדין, קריאה מהדף, אלתור — עם נושאים חדשים (כל המרווחים בשמיעה, דרגות במינור וכרומטיות); מפת הכישורים בחמישה תחומים; דף בית נקי יותר עם תוכנית היום בראש',
    ],
  },
  {
    version: '0.29.0',
    date: '2026-11-05',
    en: [
      'Every unit now starts with a quick lesson (about a minute): what it is, how it sounds, how to hear it — with examples. Skip any time',
      'Hear a lesson to the end and the topic joins your collection: “Topics I learned”, by area — replay any card',
      'Personal coaching: after a miss you hear what was off in *your* answer (“not 5 — this one is lower”, “the first 2 notes were right”), and the recap names the pair you mixed up most',
      'Leagues become a chord: Root, Third, Fifth, Seventh, the Ninth, ♯11 and 13 — each league adds a note to your badge; the top ones are hard to reach. Your Skill Map shows your ear’s chord too',
    ],
    he: [
      'כל יחידה מתחילה עכשיו בשיעור קצר (בערך דקה): מה זה, איך זה נשמע, איך שומעים את זה — עם דוגמאות. אפשר לדלג בכל רגע',
      'הקשבתם לשיעור עד הסוף? הנושא מצטרף לאוסף שלכם: ״נושאים שלמדתי״, לפי תחומים — וכל כרטיס אפשר לשמוע שוב',
      'אימון אישי: אחרי טעות שומעים מה לא הסתדר בתשובה *שלכם* (״זה לא 5 — הצליל הזה נמוך יותר״, ״2 הצלילים הראשונים היו נכונים״), והסיכום מראה את הזוג שהכי בלבל אתכם',
      'הליגות הופכות לאקורד: שורש, טרצה, קווינטה, ספטימה, 9, ♯11 ו־13 — כל ליגה מוסיפה צליל לתג שלכם; העליונות קשות להשגה. גם במפת הכישורים מופיע האקורד של האוזן שלכם',
    ],
  },
  {
    version: '0.28.0',
    date: '2026-11-05',
    en: [
      'Barry Harris: the 6th-diminished scales, the diminished chord that becomes dominants and minor/major 6s, 6 chords over every chord, half-step rules, pivots, brother dominants — to hear and to sing (7 singing levels)',
      'Singing feedback says how and where: “a bit flat”, “went sharp at the end”, “slid up into the note”, note by note in melodies',
      'Notes shown your way everywhere: keyboard, staff, guitar tab or any mix — also in Echo Chain, vocal technique and sing-along',
      'Sight-singing: read a melody with its rhythm and sing it from the tonic and a count-in',
      'Ornaments & dynamics: grace notes, mordents, turns, trills, crescendo, decrescendo, swell',
      'New practice topics: extensions & alterations, voicings, progressions, form, fine pitch, in tune?, two voices, trichords, maqamat with quarter tones, Middle-Eastern rhythms, polyrhythms, odd meters, swing feel, and written theory (key signatures, spelling, Roman numerals, circle of fifths, transposition, chord-scale, three clefs)',
      'Play & improvise: backing tracks (ii–V–I, minor, blues), improvise with feedback, MIDI keyboard drills, guitar from tab; choir rooms where every phone sings its own part',
      'Inner clock drill (the metronome drops out — keep the beat), sus4 / add9 / alt in extensions, a recorded organ drone, colour themes for gems, a notification when a friend plays your duel',
      'Leagues climb the overtone series: Fundamental → Octave → Fifth → Seventh → The Ninth; written theory now shows on your Skill Map',
      'Voice answers understood better: common mishearings of numbers (“to” → 2, “for” → 4, שלש → 3 …), every recognizer guess is checked, and when it misses and you tap the answer, it learns that mishearing',
    ],
    he: [
      'בארי האריס: סולמות 6 דימיניש, הדימיניש שהופך לדומיננטים ולמינור/מז׳ור 6, אקורדי 6 מעל כל אקורד, חוקי חצאי הטונים, פיבוטים, דומיננטים אחים — בשמיעה ובשירה (7 שלבי שירה)',
      'המשוב על השירה אומר איך ואיפה: ״קצת נמוך״, ״עלית בסוף״, ״החלקת לתוך הצליל״, צליל אחר צליל במנגינות',
      'תווים בתצוגה שבחרת בכל מקום: מקלדת, חמשה, טאבים לגיטרה או שילוב — גם בשרשרת הד, בטכניקה קולית ובשירה עם שירים',
      'קריאה בשירה: קוראים מנגינה עם הקצב שלה ושרים אותה מהטוניקה וספירה',
      'קישוטים ודינמיקה: אצ׳קטורות, מורדנטים, טרנים, טרילים, קרשנדו, דקרשנדו, קרשנדו־דקרשנדו',
      'נושאי תרגול חדשים: הרחבות ואלטרציות, וויסינגים, מהלכים, מבנה, גובה עדין, מכוון?, שני קולות, טריכורדים, מקאמים עם רבעי טונים, מקצבים מזרחיים, פולי־ריתמים, משקלים אי־זוגיים, תחושת סווינג, ותיאוריה כתובה (סימני היתק, כתיבה, ספרות רומיות, מעגל הקווינטות, טרנספוזיציה, אקורד־סולם, שלושה מפתחות)',
      'נגינה ואלתור: פלייבקים (ii–V–I, מינור, בלוז), אלתור עם משוב, תרגילי מקלדת MIDI, גיטרה מטאבים; חדרי מקהלה שבהם כל טלפון שר קול משלו',
      'תרגיל שעון פנימי (המטרונום נעלם — שמרו על הפעמה), sus4 / add9 / alt בהרחבות, דרון עוגב מוקלט, ערכות צבע ביהלומים, התראה כשחבר משחק את הדו־קרב שלכם',
      'הליגות מטפסות בסדרת הצלילים העיליים: יסוד ← אוקטבה ← קווינטה ← ספטימה ← 9; תיאוריה כתובה מופיעה עכשיו במפת הכישורים',
      'הבנה טובה יותר של תשובות בקול: טעויות שמיעה נפוצות במספרים (״to״ ← 2, ״for״ ← 4, שלש ← 3 …), בדיקה של כל ניחושי המזהה, וכשהוא לא מבין ואתם לוחצים על התשובה — הוא לומד את טעות השמיעה',
    ],
  },
  {
    version: '0.27.0',
    date: '2026-11-05',
    en: [
      'Instrument sounds: grand piano, upright, harpsichord, harp, marimba, vibraphone, organ (Settings → Sound)',
      'Play together: every game in live rooms — and a big-screen mode (TV or laptop shows the game, phones answer); Echo Chain together, steadiest voice, true-or-false, modes, wrong notes',
      'Advanced vibrato, harmony singing (intervals over a held note, missing chord notes, harmony lines), sing-along with songs you know',
      'Spot the wrong note; blues, pentatonic, bebop and more in Modes by ear and in scales to sing',
      'New lessons: slash chords & bass lines, melodic dictation, Jazz 2 (licks & melodic minor)',
      'Today’s workout (5/10/20 min), achievements, weekly leagues, duels with friends, an optional absolute-pitch corner, instrument mode',
      'Your answer next to the right one in the recap; synonyms understood (#11 = ♭5 = tritone, Δ = maj7 …); the drone is never mistaken for your voice',
    ],
    he: [
      'צלילי כלים: פסנתר כנף, פסנתר עומד, צ׳מבלו, נבל, מרימבה, ויברפון, עוגב (הגדרות ← צליל)',
      'לשחק יחד: כל משחק בחדרים חיים — ומצב מסך גדול (טלוויזיה או מחשב מציגים את המשחק, הטלפונים עונים); שרשרת הד יחד, הקול היציב ביותר, נכון או לא, מודוסים, צליל שגוי',
      'ויברטו מתקדם, שירת הרמוניה (מרווחים מעל צליל מוחזק, צלילים חסרים באקורד, קווי הרמוניה), שירה עם שירים מוכרים',
      'מצאו את הצליל השגוי; בלוז, פנטטוני, ביבופ ועוד במודוסים בשמיעה ובסולמות לשירה',
      'שיעורים חדשים: אקורדים עם בס ומהלכי בס, הכתבה מלודית, ג׳אז 2 (ליקים ומינור מלודי)',
      'האימון של היום (5/10/20 דק׳), הישגים, ליגות שבועיות, דו־קרבות עם חברים, פינת שמיעה מוחלטת (רשות), מצב כלי נגינה',
      'התשובה שלך לצד הנכונה בסיכום; מילים נרדפות מובנות (#11 = ♭5 = טריטון, Δ = maj7 …); הדרון לעולם לא נחשב כקול שלך',
    ],
  },
  {
    version: '0.26.0',
    date: '2026-11-05',
    en: [
      'New: Vocal technique — 12 measured levels from one steady note to vibrato control, glides, leaps and fast passages: intonation, stability, drift, vibrato rate, width and evenness, transitions, timing. Live pitch trace, one tip per take, listen back',
      'Your range: calibrate it once (glide on “ah”) — every sung exercise in the app now stays inside it',
      'Scales & modes to sing: from Ionian up to “G Mixolydian up, altered down”',
      'Modes by ear: hear a scale and name its mode — including the modes of harmonic and melodic minor',
      'Daily 3-minute vocal warm-up (counts for your streak)',
    ],
    he: [
      'חדש: טכניקה קולית — 12 רמות מדודות, מצליל יציב אחד ועד שליטה בוויברטו, גלישות, קפיצות ומעברים מהירים: אינטונציה, יציבות, זחילה, קצב, רוחב ואחידות של הוויברטו, מעברים ותזמון. גרף גובה חי, טיפ לכל טייק, האזנה לעצמך',
      'המנעד שלך: מכיילים פעם אחת (גלישה על "אה") — וכל תרגיל שירה באפליקציה נשאר בתוכו',
      'סולמות ומודוסים לשירה: מיוני ועד "מ־G למעלה במיקסולידי ולמטה באלטרד"',
      'מודוסים בשמיעה: שומעים סולם ומזהים את המודוס — כולל המודוסים של מינור הרמוני ומלודי',
      'חימום קולי יומי של 3 דקות (נחשב לרצף)',
    ],
  },
  {
    version: '0.25.1',
    date: '2026-11-05',
    en: ['Find my level and True or false? are now in the menu, and Find my level sits under the main button on Home'],
    he: ['"מציאת הרמה שלי" ו"נכון או לא?" נמצאים עכשיו בתפריט, ו"מציאת הרמה שלי" מופיע גם מתחת לכפתור הראשי במסך הבית'],
  },
  {
    version: '0.25.0',
    date: '2026-11-05',
    en: ['New game — True or false?: three notes, two intervals: are both right? Solo 60-second runs or a duel on one device, four levels up to “by ear”'],
    he: ['משחק חדש — נכון או לא?: שלושה צלילים, שני מרווחים: שניהם נכונים? ריצה של 60 שניות לבד או דו־קרב על המכשיר, ארבע רמות עד "לפי השמיעה"'],
  },
  {
    version: '0.24.0',
    date: '2026-11-05',
    en: ['Show notes as keyboard, notation, guitar tab — or any mix (Settings)', 'Aids while answering: the key or the note to sing is shown while a skill is still growing, and fades out as you reach Solid. Aided answers count a little easier, so the rating stays fair', 'After each answer, the notes you heard appear on every view you chose'],
    he: ['הצגת תווים כמקלדת, תווים, טאבים לגיטרה — או כל שילוב (בהגדרות)', 'עזרה בזמן התשובה: הסולם או הצליל לשירה מוצגים כל עוד המיומנות מתפתחת, ונעלמים כשמגיעים לרמת "יציבים". תשובה עם עזרה נחשבת קצת קלה יותר, כדי שהדירוג יישאר הוגן', 'אחרי כל תשובה, הצלילים ששמעתם מופיעים בכל תצוגה שבחרתם'],
  },
  {
    version: '0.23.0',
    date: '2026-11-05',
    en: ['Streak 2.0: a celebration when your streak grows, milestones with confetti, and a streak calendar', 'Streak freezes: one free every Monday, more with gems — a missed day no longer ends your streak', 'Gems: earned for good lessons, your daily goal, puzzles and milestones; spend them on freezes or a streak repair'],
    he: ['רצף 2.0: חגיגה כשהרצף גדל, אבני דרך עם קונפטי, ולוח שנה של הרצף', 'הקפאות רצף: אחת חינם בכל יום שני, ועוד ביהלומים — יום שפספסתם כבר לא מוחק את הרצף', 'יהלומים: צוברים על שיעורים טובים, יעד יומי, פאזלים ואבני דרך; קונים בהם הקפאות או תיקון רצף'],
  },
  {
    version: '0.22.0',
    date: '2026-11-05',
    en: ['Your overall rating: one number for your whole ear, next to your name, with your best and its trend on the Skill Map', 'After every session: how your rating moved — overall and in each skill — and when you reach a new level', 'Ratings next to names for friends (sort by rating), in online rooms, on the daily board and in class rosters'],
    he: ['הדירוג הכללי שלכם: מספר אחד לכל האוזן, ליד השם שלכם, עם השיא והמגמה במפת המיומנויות', 'אחרי כל סשן: כמה הדירוג השתנה — כללית ובכל מיומנות — ומתי הגעתם לרמה חדשה', 'דירוג ליד השמות של חברים (מיון לפי דירוג), בחדרי אונליין, בטבלה היומית וברשימת הכיתה'],
  },
  {
    version: '0.21.0',
    date: '2026-11-05',
    en: [
      'Find my level now covers every topic (degrees, notes, intervals, chords, cadences, melodies, rhythm, tapping, singing), adapts per topic, shows which topics are left, gives XP — and is the first step on a first visit',
      'Your Skill Map sends you to the lesson that fits your level, opens the path up to it, and shows a trend chart for every skill',
      'Topic progress bars on Home: lessons done out of how many, per topic',
      'The keyboard no longer lights up the answer while you are still answering',
      'Cleaner header: install and update buttons up top; language in Settings; “What’s new” in the menu',
      'New home animation: random notes and the intervals between them',
      'Fixed screens that were too wide on phones',
    ],
    he: [
      'מציאת הרמה מכסה עכשיו את כל הנושאים (דרגות, תווים, מרווחים, אקורדים, קדנצות, מנגינות, קצב, הקשה, שירה), מותאמת לכל נושא בנפרד, מראה אילו נושאים נשארו, נותנת XP — והיא הצעד הראשון בכניסה הראשונה',
      'מפת המיומנויות שולחת אתכם לשיעור שמתאים לרמה שלכם, פותחת את המסלול עד אליו, ומציגה גרף מגמה לכל מיומנות',
      'פסי התקדמות לפי נושא במסך הבית: כמה שיעורים הושלמו מתוך כמה',
      'המקלדת כבר לא מאירה את התשובה בזמן שאתם עוד עונים',
      'סרגל עליון נקי יותר: כפתורי התקנה ועדכון למעלה; השפה בהגדרות; "מה חדש" בתפריט',
      'אנימציה חדשה במסך הבית: תווים אקראיים והמרווחים ביניהם',
      'תוקנו מסכים שהיו רחבים מדי בטלפון',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-11-05',
    en: ['ToneTurn is now Ninth Sense — new name, new logo. Your progress, friends and account stay as they are.'],
    he: ['ToneTurn נקראת עכשיו Ninth Sense — שם חדש ולוגו חדש. ההתקדמות, החברים והחשבון שלכם נשארים כמו שהם.'],
  },
  {
    version: '0.19.0',
    date: '2026-11-05',
    en: ['Class mode: teachers create a class, students join with a code, the teacher assigns lessons and sees each student’s progress', 'Race your ghost: your best run comes back as an opponent that answers exactly when you did'],
    he: ['מצב כיתה: מורים פותחים כיתה, תלמידים מצטרפים עם קוד, המורה מקצה שיעורים ורואה את ההתקדמות של כל תלמיד', 'מרוץ נגד הרוח: הריצה הכי טובה שלכם חוזרת כיריב שעונה בדיוק מתי שאתם עניתם'],
  },
  {
    version: '0.18.0',
    date: '2026-11-05',
    en: ['Jazz 1 (lesson 21): major 7, dominant 7, minor 7 and half-diminished chords, and the ii–V–I family, voiced like a jazz pianist', 'Songs you know (lesson 22): famous public-domain openings — name the degrees, then find out which song it was'],
    he: ['ג׳אז 1 (שיעור 21): אקורדי מז׳ור 7, דומיננט 7, מינור 7 וחצי מוקטן, ומשפחת ii–V–I, בקולות של פסנתרן ג׳אז', 'שירים שאתם מכירים (שיעור 22): פתיחות מפורסמות מנחלת הכלל — אומרים את הדרגות ומגלים איזה שיר זה היה'],
  },
  {
    version: '0.17.0',
    date: '2026-11-04',
    en: ['Review with spaced repetition: mistakes come back after 1, 3, 7, 16 and 35 days until they stick', 'Drone practice: sing every scale degree over a held tonic and see how in tune you are', 'MIDI keyboard: play instead of singing, and press a key to answer degree and note questions'],
    he: ['חזרה מרווחת: טעויות חוזרות אחרי 1, 3, 7, 16 ו־35 ימים עד שהן נקלטות', 'תרגול עם דרון: שרים כל דרגה מעל טוניקה מתמשכת ורואים כמה מדויק', 'מקלדת MIDI: מנגנים במקום לשיר, ולוחצים על קליד כדי לענות על שאלות דרגות ותווים'],
  },
  {
    version: '0.16.0',
    date: '2026-11-04',
    en: ['Note sequences (lesson 20): hear notes and name them, turn names into degrees and back, sing from note names — the whole melodic matrix now works for sequences', 'Note-name keypad in Buttons mode'],
    he: ['רצפי תווים (שיעור 20): שומעים תווים ונותנים שם, ממירים שמות לדרגות ובחזרה, שרים לפי שמות — כל המטריצה המלודית עובדת עכשיו גם ברצפים', 'מקלדת שמות תווים במצב כפתורים'],
  },
  {
    version: '0.15.0',
    date: '2026-11-04',
    en: ['Rhythm 4–8: sixteenths, syncopation, triplets, 3/4 and 6/8, and jazz swing', 'Build the bar: in dictation, tap rhythm blocks to write what you heard', 'Stricter timing where it matters: triplets vs eighths are told apart'],
    he: ['קצב 4–8: שש-עשריות, סינקופה, טריולות, 3/4 ו־6/8, וסווינג של ג׳אז', 'בונים את התיבה: בהכתבה מקישים על קוביות קצב כדי לכתוב את מה ששמעתם', 'תזמון מדויק יותר איפה שזה חשוב: מבחינים בין טריולות לשמיניות'],
  },
  {
    version: '0.14.0',
    date: '2026-11-04',
    en: ['Riffs & runs (lesson 14): name a run’s scale or shape, then sing fast runs back — graded on pitch, clean separate notes and even timing', 'Runs workshop: each run at 60 %, 80 %, then full speed, at your level', 'New Skill Map axis: Vocal agility'],
    he: ['ריפים וראנים (שיעור 14): מזהים סולם או כיוון של ראן, ושרים ראנים מהירים בחזרה — ניקוד לפי גובה, צלילים נקיים ונפרדים ותזמון אחיד', 'סדנת ראנים: כל ראן ב־60%, ב־80% ואז במהירות מלאה, ברמה שלכם', 'ציר חדש במפת המיומנויות: גמישות קולית'],
  },
  {
    version: '0.13.0',
    date: '2026-11-04',
    en: ['Daily challenge leaderboard: see how many played today, your rank and top %, and your friends’ scores', 'Your first play is graded on the server — also when you played before signing in'],
    he: ['טבלת האתגר היומי: כמה שיחקו היום, המקום שלכם, האחוזון, והניקוד של החברים', 'המשחק הראשון שלכם נבדק בשרת — גם אם שיחקתם לפני שהתחברתם'],
  },
  {
    version: '0.12.0',
    date: '2026-11-04',
    en: ['Online rooms: create a room, share the code or link, and play friends on their own phones — same sound at the same moment, live leaderboard after every round, podium at the end', 'The server keeps the answers and does the scoring'],
    he: ['חדרי אונליין: פותחים חדר, משתפים קוד או קישור ומשחקים עם חברים, כל אחד בטלפון שלו — אותו צליל באותו רגע, טבלה חיה אחרי כל סיבוב ופודיום בסוף', 'השרת שומר את התשובות ומחשב את הניקוד'],
  },
  {
    version: '0.11.0',
    date: '2026-11-04',
    en: ['Daily challenge: 5 questions, the same for everyone today, scored on speed and accuracy, with a spoiler-free share card', 'Duel on this device: two players face to face on a split screen, same sound, fastest right answer wins'],
    he: ['האתגר היומי: 5 שאלות, אותן שאלות לכולם היום, ניקוד לפי מהירות ודיוק, וכרטיס שיתוף בלי ספוילרים', 'דו־קרב על המכשיר: שני שחקנים פנים מול פנים במסך מפוצל, אותו צליל, התשובה הנכונה המהירה מנצחת'],
  },
  {
    version: '0.10.0',
    date: '2026-11-04',
    en: ['Rhythm 1–3: read rhythm notation and tap it on the metronome (or say “ta”)', 'Rhythm dictation: hear a bar and pick its notation, or say it', 'Rhythm reading and rhythm dictation join the Skill Map'],
    he: ['קצב 1–3: קוראים תווי קצב ומקישים על המטרונום (או אומרים "טה")', 'הכתבה קצבית: שומעים תיבה ובוחרים את התווים שלה, או אומרים אותה', 'קריאה והכתבה קצבית נוספו למפת המיומנויות'],
  },
  {
    version: '0.9.0',
    date: '2026-11-04',
    en: ['New lesson: Notes and degrees (hear and name, name ↔ degree)', 'New lesson: Sing it by name (echo a note, sing a named note)', 'New lesson: Sing the degrees (sing “1 3 5” in order)', 'Note naming joins the Skill Map'],
    he: ['שיעור חדש: תווים ודרגות (לשמוע ולתת שם, שם ↔ דרגה)', 'שיעור חדש: לשיר לפי שם (לחזור על צליל, לשיר תו לפי שמו)', 'שיעור חדש: לשיר את הדרגות (לשיר "1 3 5" לפי הסדר)', 'שמות תווים נוספו למפת המיומנויות'],
  },
  {
    version: '0.8.0',
    date: '2026-11-04',
    en: ['New scoring: accuracy, attempts and response time all count', 'Answer chips show your time, attempts and XP', 'Timed scoring is off during your first week (change it in Settings)'],
    he: ['ניקוד חדש: דיוק, מספר ניסיונות וזמן תגובה', 'אחרי כל תשובה רואים זמן, ניסיונות ו-XP', 'בשבוע הראשון הניקוד בלי זמן (אפשר לשנות בהגדרות)'],
  },
  {
    version: '0.7.1',
    date: '2026-11-04',
    en: ['Skill Map: rhythmic memory and rhythmic precision are now separate, like singing in tune and melodic memory'],
    he: ['מפת המיומנויות: זיכרון קצבי ודיוק קצבי נפרדים עכשיו, כמו שירה מדויקת וזיכרון מלודי'],
  },
  {
    version: '0.7.0',
    date: '2026-11-04',
    en: ['New lesson: thirds, fifths and octaves', 'New lesson: which note is in the bass? (C, C/E, C/G)', 'Intervals now appear on your Skill Map'],
    he: ['שיעור חדש: טרצות, קווינטות ואוקטבות', 'שיעור חדש: איזה צליל בבס? (C,‏ C/E,‏ C/G)', 'המרווחים מופיעים עכשיו במפת המיומנויות'],
  },
  {
    version: '0.6.0',
    date: '2026-11-04',
    en: [
      'Find my level: 9 questions that adapt to you',
      'Skill Map: your ear, skill by skill, with a recommended next step',
      'Review your mistakes and hear your answer next to the right one',
      'Weekly puzzle with gold and silver medals',
      'Beat Echo: calibrate tap timing for your device',
    ],
    he: [
      'מציאת הרמה: 9 שאלות שמתאימות את עצמן אליכם',
      'מפת מיומנויות: האוזן שלכם לפי מיומנות, עם הצעד הבא המומלץ',
      'חזרה על טעויות — שומעים את התשובה שלכם ליד הנכונה',
      'חידה שבועית עם מדליות זהב וכסף',
      'הד קצב: כיול תזמון ההקשה למכשיר שלכם',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-04',
    en: ['Menu with version, install and update', 'Daily streak reminders (push)', 'Friends: add by code and compare weekly XP'],
    he: ['תפריט עם גרסה, התקנה ועדכון', 'תזכורת יומית לשמירה על הרצף (פוש)', 'חברים: הוספה בקוד והשוואת XP שבועי'],
  },
  {
    version: '0.4.0',
    date: '2026-11-04',
    en: ['Echo Chain and Beat Echo memory games', 'Play together on one device (up to 4 players)'],
    he: ['משחקי הזיכרון שרשרת הד והד קצב', 'משחק משותף על מכשיר אחד (עד 4 שחקנים)'],
  },
  {
    version: '0.3.0',
    date: '2026-11-04',
    en: ['4 new lessons incl. singing with a live tuner', 'Cloud save with Google sign-in'],
    he: ['4 שיעורים חדשים כולל שירה עם מד כיוון', 'שמירה בענן עם התחברות Google'],
  },
  {
    version: '0.2.0',
    date: '2026-11-04',
    en: ['English by default, full Hebrew', 'Choose the narration voice'],
    he: ['אנגלית כברירת מחדל, עברית מלאה', 'בחירת קול הקריין'],
  },
  {
    version: '0.1.0',
    date: '2026-11-04',
    en: ['First lesson: Same B♭, two homes', 'Hands-free voice answers'],
    he: ['השיעור הראשון: אותו B♭, שני בתים', 'תשובות בקול בלי ידיים'],
  },
];

/** -1 / 0 / 1 semantic version compare (numeric parts only). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Changelog entries newer than the version the player last saw. */
export function unseenChanges(lastSeen: string | null): ChangeEntry[] {
  if (!lastSeen) return [];
  return CHANGELOG.filter((c) => compareVersions(c.version, lastSeen) > 0);
}

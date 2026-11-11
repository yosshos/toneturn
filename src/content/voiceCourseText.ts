// Words of the voice course's family screens and timed takes (VOICE_CURRICULUM). Hebrew first; no English words in
// the Hebrew, no emoji. Kept here (not in i18n/strings.ts) so the voice course stays in its own files.

type Bi = { en: string; he: string };

export const VT = {
  families: { en: 'The voice course', he: 'קורס השירה' },
  familiesHint: { en: 'Fifteen families from a simple song sung well to a jazz standard. Only what the microphone measures counts: pitch, time, loudness, vibrato.', he: 'חמש־עשרה משפחות, משיר פשוט ששרים היטב ועד סטנדרט ג׳אז. נחשב רק מה שהמיקרופון מודד: גובה, זמן, עוצמה, ויברטו.' },
  stage: { A: { en: 'Song Singer', he: 'זמר שירים' }, B: { en: 'Musician Singer', he: 'זמר מוזיקאי' }, C: { en: 'Jazz Singer', he: 'זמר ג׳אז' }, D: { en: 'Jazz Artist', he: 'אמן ג׳אז' } } as Record<'A' | 'B' | 'C' | 'D', Bi>,
  levelsOf: { en: '{done} of {n} levels', he: '{done} מתוך {n} שלבים' },
  runsCard: { en: 'Runs & riffs: 8 levels', he: 'ראנים וריפים: 8 שלבים' },
  notMeasured: { en: 'Not graded: syllables, words, tone colour. Only pitch, time and loudness.', he: 'לא נבדקים: הברות, מילים, צבע הצליל. רק גובה, זמן ועוצמה.' },
  sing: { en: 'Sing', he: 'לשיר' },
  stop: { en: 'Stop', he: 'עצירה' },
  retry: { en: 'Again', he: 'שוב' },
  next: { en: 'Next', he: 'הבא' },
  done: { en: 'Done', he: 'סיום' },
  back: { en: 'Back', he: 'חזרה' },
  itemOf: { en: 'Exercise {i} of {n}', he: 'תרגיל {i} מתוך {n}' },
  countIn: { en: 'Count-in…', he: 'ספירה…' },
  listenCall: { en: 'Listen to the call…', he: 'הקשיבו לקריאה…' },
  yourTurn: { en: 'Your turn', he: 'תורכם' },
  singing: { en: 'Singing…', he: 'שרים…' },
  score: { en: 'Score', he: 'ציון' },
  unclear: { en: 'Too little voice was heard — sing a little louder, closer to the phone.', he: 'נשמע מעט מדי קול — שירו קצת חזק יותר, קרוב יותר לטלפון.' },
  headphones: { en: 'I sing with wired headphones', he: 'אני שר עם אוזניות חוטיות' },
  headphonesWhy: { en: 'The band stays out of the microphone. Bluetooth adds a delay — calibrate once if you use it.', he: 'הלהקה לא נכנסת למיקרופון. אוזניות אלחוטיות מוסיפות השהיה — כיילו פעם אחת אם משתמשים בהן.' },
  guide: { en: 'Melody guide (headphones only)', he: 'מנגינה מנחה (רק עם אוזניות)' },
  calTitle: { en: 'First, the microphone delay', he: 'קודם, ההשהיה של המיקרופון' },
  calWhy: { en: 'Timing is judged to a few hundredths of a second, so the delay of your phone is measured once and taken out.', he: 'הזמן נמדד במאיות שנייה, לכן מודדים פעם אחת את ההשהיה של הטלפון ומנכים אותה.' },
  calSkip: { en: 'Skip (use the usual delay)', he: 'לדלג (השהיה רגילה)' },
  phrase: { en: 'Phrase {n}', he: 'משפט {n}' },
  phrases: { en: 'Every phrase', he: 'כל משפט' },
  loopWeak: { en: 'Loop phrase {n}, slower', he: 'לחזור על משפט {n}, לאט יותר' },
  loopFull: { en: 'Phrase {n} at full tempo', he: 'משפט {n} בקצב המלא' },
  loopPassed: { en: 'Phrase {n} passed — now the whole song again.', he: 'משפט {n} עבר — עכשיו כל השיר שוב.' },
  wholeAgain: { en: 'The whole song', he: 'כל השיר' },
  loopNote: { en: 'Loops are practice: only a whole take counts for the level.', he: 'חזרות הן תרגול: רק טייק שלם נחשב לשלב.' },
  recital: { en: 'One pass, no loops — the take is kept.', he: 'מעבר אחד, בלי חזרות — הטייק נשמר.' },
  needEvery: { en: 'Every phrase at {p}% or more passes.', he: 'כל משפט ב־{p}% ומעלה — עוברים.' },
  levelPassed: { en: 'Level passed.', he: 'השלב עבר.' },
  levelNotYet: { en: 'Not yet — {need}% passes this level.', he: 'עוד לא — {need}% מעבירים את השלב.' },
  keyOnly: { en: 'You hear the key once, then sing alone.', he: 'שומעים את הסולם פעם אחת, ואז שרים לבד.' },
  feel: {
    on: { en: 'On top of the beat', he: 'על הפעמה' },
    'laid-back': { en: 'Laid back', he: 'מאחורי הפעמה' },
    rushing: { en: 'Rushing', he: 'ממהרים' },
    loose: { en: 'Uneven', he: 'לא אחיד' },
    'too-few': { en: 'Too few notes to judge the feel', he: 'מעט מדי צלילים כדי לשפוט את התחושה' },
  } as Record<string, Bi>,
  meanLate: { en: 'Average {ms} ms {dir}, spread ±{sd} ms', he: 'בממוצע {ms} מ״ש {dir}, פיזור ±{sd} מ״ש' },
  late: { en: 'late', he: 'מאוחר' },
  early: { en: 'early', he: 'מוקדם' },
  swingRatio: { en: 'Swing {r} : 1 (aim {lo}–{hi})', he: 'סווינג {r} : 1 (יעד {lo}–{hi})' },
  driftLine: { en: 'Drift {d} ¢ over the song · note error {e} ¢', he: 'זחילה {d} ¢ לאורך השיר · סטייה בצליל {e} ¢' },
  chorusLine: { en: 'Chorus {db} dB louder than the verse (aim 3)', he: 'הפזמון חזק ב־{db} דציבל מהבית (יעד 3)' },
  guideSlots: { en: 'Guide tones on {k} of {n} half notes', he: 'צלילים מנחים ב־{k} מתוך {n} חצאים' },
  landingLine: { en: 'Chord tones on the strong beats: {p}%', he: 'צלילי אקורד בפעמות החזקות: {p}%' },
  approachLine: { en: 'Approached by a half step: {p}%', he: 'גישה בחצי טון: {p}%' },
  chordsNow: { en: 'Chords', he: 'אקורדים' },
  probe: { en: 'Find my voice level', he: 'מציאת הרמה בשירה' },
  probeHint: { en: 'About 2½ minutes: your path then starts where you are.', he: 'כשתיים וחצי דקות: המסלול יתחיל איפה שאתם נמצאים.' },
} as const;

/** How each timed item is sung (the brief line). */
export const TIME_INSTR: Record<string, Bi> = {
  on: { en: 'Sing "dah" on every marked beat, exactly with the click — on one comfortable note.', he: 'שירו "דה" בכל פעמה מסומנת, בדיוק עם הקליק — על צליל נוח אחד.' },
  entry: { en: 'Rest where there is no mark; come in exactly on the "and".', he: 'שתקו איפה שאין סימן; היכנסו בדיוק על ה"ו".' },
  anticipate: { en: 'Push the next downbeat: the mark sits an eighth before the bar line.', he: 'הקדימו את הפעמה הבאה: הסימן נמצא שמינית לפני קו התיבה.' },
  swing: { en: 'Sing "doo-bah" on every beat, long-short like a swing drummer. Clicks on 2 and 4.', he: 'שירו "דו־בה" בכל פעמה, ארוך־קצר כמו מתופף סווינג. הקליקים על 2 ועל 4.' },
  behind: { en: 'Same beats, but lay back: a little behind every click, evenly.', he: 'אותן פעמות, אבל מאחור: קצת אחרי כל קליק, באופן אחיד.' },
  back: { en: 'Start the phrase half a beat to a beat late, then catch up: the last note right on its beat.', he: 'התחילו את המשפט חצי פעמה עד פעמה באיחור, ואז השיגו: הצליל האחרון בדיוק על הפעמה שלו.' },
  clock: { en: '"Dah" on every beat. The click stops for four bars — keep going; it comes back on a downbeat.', he: '"דה" בכל פעמה. הקליק נעלם לארבע תיבות — המשיכו; הוא חוזר על פעמה ראשונה.' },
  call: { en: 'Listen to the two-bar call, then sing it back on one note, in time.', he: 'הקשיבו לקריאה של שתי תיבות, ואז שירו אותה בחזרה על צליל אחד, בזמן.' },
};

export const SONG_INSTR = {
  band: { en: 'Sing the melody with the band. Each phrase is scored: pitch, time, breath.', he: 'שירו את המנגינה עם הלהקה. כל משפט מקבל ציון: גובה, זמן, נשימה.' },
  unacc: { en: 'You hear the key, then sing it alone. The app checks that you stay in the key.', he: 'שומעים את הסולם, ואז שרים לבד. האפליקציה בודקת שנשארים בסולם.' },
  interpret: { en: 'Make it yours: anticipate, delay, hold over the bar — but keep the long notes.', he: 'עשו אותו שלכם: הקדימו, אחרו, החזיקו מעבר לתיבה — אבל שמרו על הצלילים הארוכים.' },
  behind: { en: 'Sing the whole chorus a little behind the beat — evenly, every note.', he: 'שירו את כל הכורוס קצת מאחורי הפעמה — באופן אחיד, כל צליל.' },
  steady: { en: 'A ballad: long, steady notes and one breath per phrase.', he: 'בלדה: צלילים ארוכים ויציבים ונשימה אחת לכל משפט.' },
  straight: { en: 'Bossa: straight eighths, soft, and no vibrato on the long notes.', he: 'בוסה: שמיניות ישרות, ברכות, ובלי ויברטו בצלילים הארוכים.' },
  chorus: { en: 'Lift the chorus: sing it louder than the verse.', he: 'הרימו את הפזמון: שירו אותו חזק יותר מהבית.' },
} as const;

export const SCAT_INSTR = {
  guide: { en: 'Sing a 3rd or a 7th of each chord, a half note each. Any syllable — only the note counts.', he: 'שירו טרצה או ספטימה של כל אקורד, חצי תו לכל אחד. כל הברה — רק הצליל נחשב.' },
  landing: { en: 'Improvise freely, but land a chord tone on beat 1 of every chord, and end on one.', he: 'אלתרו בחופשיות, אבל נחתו על צליל אקורד בפעמה 1 של כל אקורד, וסיימו על אחד.' },
  approach: { en: 'Reach chord tones from a half step above or below.', he: 'הגיעו לצלילי האקורד מחצי טון מעל או מתחת.' },
} as const;

/** Names of the new metrics (the old ones are in i18n/strings.ts metricNames). */
export const METRIC_NAMES: Record<string, Bi> = {
  onset: { en: 'On the beat', he: 'על הפעמה' },
  spread: { en: 'Evenness', he: 'אחידות' },
  coverage: { en: 'Notes sung', he: 'צלילים ששרו' },
  swing: { en: 'Swing ratio', he: 'יחס סווינג' },
  lateness: { en: 'Behind the beat', he: 'מאחורי הפעמה' },
  entry: { en: 'Entries', he: 'כניסות' },
  reentry: { en: 'Back on the one', he: 'חזרה על האחת' },
  target: { en: 'Target note', he: 'צליל היעד' },
  phrases: { en: 'Phrases', he: 'משפטים' },
  breath: { en: 'Breath', he: 'נשימה' },
  tuneDrift: { en: 'Drift', he: 'זחילה' },
  noteError: { en: 'Note error', he: 'סטייה בצליל' },
  chorus: { en: 'Chorus lift', he: 'הרמת הפזמון' },
  moved: { en: 'Rhythm moved', he: 'מקצב שהוזז' },
  kept: { en: 'Long notes kept', he: 'צלילים ארוכים שנשמרו' },
  guide: { en: 'Guide tones', he: 'צלילים מנחים' },
  landingTones: { en: 'Chord-tone landing', he: 'נחיתה על צלילי אקורד' },
  approach: { en: 'Half-step approach', he: 'גישה בחצי טון' },
  accent: { en: 'Accents', he: 'הדגשות' },
  arc: { en: 'Phrase arc', he: 'קשת המשפט' },
  break: { en: 'Smooth register', he: 'מעבר רגיסטר חלק' },
  shape: { en: 'Shape', he: 'צורה' },
  steady: { en: 'Steady long notes', he: 'צלילים ארוכים יציבים' },
};

/** How each further held / phrase item is sung ({s} = seconds). */
export const MORE_INSTR: Record<string, Bi> = {
  'breath-hold': { en: 'Hear the note, then hold it alone for {s} seconds — steady to the very end of the breath.', he: 'שמעו את הצליל, ואז החזיקו אותו לבד {s} שניות — יציב עד סוף הנשימה.' },
  'breath-phrase': { en: 'Sing the whole phrase on one breath, legato, the last note in tune.', he: 'שירו את כל המשפט בנשימה אחת, בלגאטו, והצליל האחרון מדויק.' },
  'breath-plan': { en: 'Breathe only at the marks (’) and nowhere else.', he: 'נושמים רק בסימנים (’) ובשום מקום אחר.' },
  'fine-tune': { en: 'Sing into the drone until the beating stops — within a second.', he: 'שירו אל תוך הצליל המתמשך עד שהפעימות נעלמות — בתוך שנייה.' },
  'drift-phrase': { en: 'Hear the phrase once, then sing it and land on the first note again — nothing is played between.', he: 'שמעו את המשפט פעם אחת, ואז שירו אותו ונחתו שוב על הצליל הראשון — שום דבר לא מתנגן ביניהם.' },
  siren: { en: 'Slide up from the low note to the high one and back, on "oo" — smoothly through the break.', he: 'החליקו מהצליל הנמוך לגבוה ובחזרה, על "או" — בצורה חלקה דרך המעבר.' },
  'terraced-scale': { en: 'Five notes, three times: soft, then medium, then loud — the same smooth sound each time.', he: 'חמישה צלילים, שלוש פעמים: חלש, בינוני ואז חזק — אותו צליל חלק בכל פעם.' },
  edge: { en: 'A half step above your top: hold it two seconds, easily. Stop at once if it hurts.', he: 'חצי טון מעל הצליל הגבוה שלכם: החזיקו אותו שתי שניות, בקלות. עצרו מיד אם כואב.' },
  terraced: { en: 'Three notes: soft, medium, loud — a clear step each time, the pitch staying put.', he: 'שלושה צלילים: חלש, בינוני, חזק — מדרגה ברורה בכל פעם, והגובה נשאר במקום.' },
  accents: { en: 'Sing the line evenly, and accent only the marked notes (>).', he: 'שירו את הקו באופן אחיד, והדגישו רק את הצלילים המסומנים (>).' },
  arc: { en: 'Grow louder up to the highest note, then let the phrase come down softer.', he: 'התחזקו עד הצליל הגבוה, ואז תנו למשפט לרדת ברכות.' },
  'vibrato-jazz': { en: 'Straight tone first; when the sign shows, a narrow, easy vibrato to the end.', he: 'קודם צליל ישר; כשהסימן מופיע, ויברטו צר וקל עד הסוף.' },
  'vibrato-widen': { en: 'A vibrato from the start that opens a little wider towards the end.', he: 'ויברטו מההתחלה שנפתח מעט לקראת הסוף.' },
  scoop: { en: 'Scoop into the note from below, quickly, then hold it in tune.', he: 'החליקו אל הצליל מלמטה, מהר, ואז החזיקו אותו מדויק.' },
  fall: { en: 'Hold the note, then let it fall off at the end — a long drop down.', he: 'החזיקו את הצליל, ואז תנו לו ליפול בסוף — ירידה ארוכה למטה.' },
  bend: { en: 'Start a half step under the note and bend up into it — a slide, not a jump.', he: 'התחילו חצי טון מתחת לצליל וכופפו אליו — החלקה, לא קפיצה.' },
  ghost: { en: 'Three notes: the middle one ghosted — much softer, but still there.', he: 'שלושה צלילים: האמצעי רפאים — חלש בהרבה, אבל עדיין שם.' },
  tone: { en: 'The chord sounds: sing {tone}.', he: 'האקורד נשמע: שירו את {tone}.' },
  straightTone: { en: 'No vibrato at all while the chord sounds.', he: 'בלי ויברטו בכלל בזמן שהאקורד נשמע.' },
};

/** Chord tones and tensions by name. */
export const TONE_NAMES: Record<string, Bi> = {
  R: { en: 'the root', he: 'השורש' },
  '3': { en: 'the 3rd', he: 'הטרצה' },
  '5': { en: 'the 5th', he: 'הקווינטה' },
  '7': { en: 'the 7th', he: 'הספטימה' },
  '9': { en: 'the 9th', he: 'הנונה' },
  '11': { en: 'the 11th', he: 'האונדצימה' },
  '13': { en: 'the 13th', he: 'הטרצדצימה' },
  '♭9': { en: 'the flat 9th', he: 'הנונה הקטנה' },
  '♯11': { en: 'the sharp 11th', he: 'האונדצימה המוגדלת' },
};
// Mini-lessons for the topics that complete the skill map: tempo & pulse, every interval by ear, minor and
// chromatic degrees, sight-reading by ear. Same voice as ./example.ts.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

/** A click track at `bpm`, optionally drifting to `bpm2` by the end. */
function clicks(bpm: number, beats: number, bpm2 = bpm): Stimulus {
  const events: NoteEvent[] = [];
  let t = 0;
  for (let i = 0; i < beats; i++) {
    events.push({ midi: i % 4 === 0 ? 96 : 86, start: t, duration: 0.05, velocity: i % 4 === 0 ? 0.65 : 0.45 });
    t += 60 / (bpm + ((bpm2 - bpm) * i) / Math.max(1, beats - 1));
  }
  return { kind: 'events', events, length: t + 0.2 };
}
/** Steady beats at `bpm`, each split into `per` notes (the first of each beat accented). */
function grid(bpm: number, beats: number, per: number): Stimulus {
  const events: NoteEvent[] = [];
  const step = 60 / bpm / per;
  for (let i = 0; i < beats * per; i++) events.push({ midi: i % per === 0 ? 96 : 84, start: i * step, duration: 0.05, velocity: i % per === 0 ? 0.6 : 0.35 });
  return { kind: 'events', events, length: beats * per * step + 0.2 };
}
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const two = (a: number, b: number, harmonic = false): Stimulus[] => (harmonic ? [{ kind: 'chord', midis: [a, b], duration: 1.6 }] : [{ kind: 'notes', midis: [a, b], each: 0.7 }]);
const cadenceC: Stimulus = { kind: 'cadence', key: { letter: 'C', acc: 0 } };
const minorCadence: Stimulus[] = [
  { kind: 'chord', midis: [45, 60, 64], duration: 0.7 },
  { kind: 'chord', midis: [50, 62, 65], duration: 0.7 },
  { kind: 'chord', midis: [52, 59, 62, 68], duration: 0.7 },
  { kind: 'chord', midis: [45, 60, 64], duration: 1.1 },
];

export const LESSONS: MiniLesson[] = [
  {
    id: 'tempo',
    area: 'rhythm',
    emoji: '⏱️',
    title: { en: 'Tempo & pulse', he: 'טמפו ופעמה' },
    takeaway: { en: 'BPM = beats per minute: 60 is one a second, 120 two a second. Feel the gap between clicks, not the sound.', he: 'BPM = פעמות לדקה: 60 זה אחת לשנייה, 120 שתיים לשנייה. הרגישו את הרווח בין הקליקים, לא את הצליל.' },
    steps: [
      {
        say: { en: 'Hey {name}! Tempo is how fast the beat goes, counted in beats per minute — BPM. Sixty BPM is exactly one beat every second.', he: 'היי {name}! טמפו הוא כמה מהר הפעמה זזה, נמדד בפעמות לדקה — BPM. שישים BPM זה בדיוק פעמה אחת בכל שנייה.' },
        play: [clicks(60, 6)],
        show: { text: { en: '60 BPM = 1 per second', he: '60 BPM = אחת לשנייה' } },
      },
      {
        say: { en: 'Double it and you get 120: two beats a second, a brisk walk. Most pop songs live between 90 and 130.', he: 'כפלו ותקבלו 120: שתי פעמות לשנייה, הליכה מהירה. רוב שירי הפופ נמצאים בין 90 ל־130.' },
        play: [clicks(120, 8)],
        show: { text: { en: '120 BPM = 2 per second', he: '120 BPM = שתיים לשנייה' } },
      },
      {
        say: { en: 'Faster or slower? Listen to the gap between clicks, not the clicks themselves. Here is 100, then 115.', he: 'מהיר או איטי? הקשיבו לרווח בין הקליקים, לא לקליקים עצמם. הנה 100, ואז 115.' },
        play: [clicks(100, 5), rest(0.6), clicks(115, 5)],
        show: { text: { en: '100 → 115', he: '100 ← 115' } },
      },
      {
        say: { en: 'Tempo can also drift. This one speeds up — musicians call it accelerando. Its opposite, slowing down, is ritardando.', he: 'טמפו יכול גם לזחול. הזה מאיץ — מוזיקאים קוראים לזה אצלרנדו. ההפך, האטה, נקרא ריטרדנדו.' },
        play: [clicks(90, 10, 110)],
        show: { text: { en: 'accelerando ↗', he: 'אצלרנדו ↗' } },
      },
      {
        say: { en: 'To guess a number, anchor on 60 and 120: is it slower than a second, about one, or about two a second? Then fine-tune.', he: 'כדי לנחש מספר, היאחזו ב־60 וב־120: האם זה איטי משנייה, בערך אחת, או בערך שתיים לשנייה? ואז דייקו.' },
        play: [clicks(90, 6)],
        show: { text: { en: '60 ← 90 → 120', he: '60 ← 90 → 120' } },
      },
      {
        say: { en: 'Your turn! Faster or slower, steady or drifting, and finally: name the tempo. Tap along with a finger — it really helps.', he: 'תורכם! מהיר או איטי, יציב או זוחל, ולבסוף: מה הטמפו. הקישו יחד עם האצבע — זה ממש עוזר.' },
        show: { text: { en: '? BPM', he: '? BPM' } },
      },
    ],
    more: [
      {
        say: { en: 'Tempo is the rate of the pulse, the beat you would tap your foot to. One beat lasts 60 divided by the BPM, in seconds: at 120 BPM each beat is half a second; at 90, two thirds of a second.', he: 'טמפו הוא קצב הפעמה, זו שהייתם מקישים לה ברגל. פעמה אחת נמשכת 60 חלקי ה־BPM, בשניות: ב־120 BPM כל פעמה היא חצי שנייה; ב־90, שני שלישים של שנייה.' },
        play: [clicks(120, 6)],
        show: { text: { en: 'beat = 60 ÷ BPM seconds', he: 'פעמה = 60 ÷ BPM שניות' } },
      },
      {
        say: { en: 'Tempo is not how busy the music is. Here is 70 BPM, then the same 70 filled with four notes per beat. It feels faster, but the pulse has not moved.', he: 'טמפו הוא לא כמה המוזיקה עמוסה. הנה 70 BPM, ואז אותו 70 עם ארבעה צלילים בכל פעמה. זה מרגיש מהר יותר, אבל הפעמה לא זזה.' },
        play: [clicks(70, 4), rest(0.5), grid(70, 4, 4)],
        show: { text: { en: '70 = 70', he: '70 = 70' } },
      },
      {
        say: { en: 'Classical scores use Italian words, each a range rather than a number: Adagio slow, around 70; Andante a walking pace, around 90; Allegro fast, around 130; Presto very fast, 170 and more.', he: 'בתווים קלאסיים משתמשים במילים איטלקיות, כל אחת טווח ולא מספר: אדאג׳ו איטי, בערך 70; אנדנטה קצב הליכה, בערך 90; אלגרו מהיר, בערך 130; פרסטו מהיר מאוד, 170 ומעלה.' },
        show: { text: { en: 'Adagio · Andante · Allegro · Presto', he: 'אדאג׳ו · אנדנטה · אלגרו · פרסטו' } },
      },
      {
        say: { en: 'Styles have home tempos too. House music typically sits around 120 to 128, drum and bass around 170 to 175, and much hip-hop between 85 and 95.', he: 'גם לסגנונות יש טמפו בית. האוס נמצא בדרך כלל סביב 120 עד 128, דראם אנד בייס סביב 170 עד 175, והרבה היפ־הופ בין 85 ל־95.' },
        play: [clicks(124, 8), rest(0.4), clicks(88, 6)],
        show: { text: { en: '124 · 88', he: '124 · 88' } },
      },
      {
        say: { en: 'To hear a number, compare with anchors. A clock\'s second hand is 60; a brisk march is 120. Then ask: closer to the lower anchor, the middle, or the upper one? 90 sits halfway.', he: 'כדי לשמוע מספר, משווים לנקודות עוגן. מחוג השניות בשעון הוא 60; מצעד נמרץ הוא 120. ואז שואלים: קרוב לעוגן התחתון, לאמצע, או לעליון? 90 יושב באמצע.' },
        play: [clicks(60, 4), rest(0.4), clicks(90, 5), rest(0.4), clicks(120, 6)],
        show: { text: { en: '60 · 90 · 120', he: '60 · 90 · 120' } },
      },
      {
        say: { en: 'The common mistake is an octave error: hearing 140 as 70, or the reverse, because you tapped every other beat. Both are valid feels; check which one the drums and the bass line really lock to.', he: 'הטעות הנפוצה היא טעות של "אוקטבה": לשמוע 140 כ־70, או להפך, כי הקשתם כל פעמה שנייה. שתי התחושות לגיטימיות; בדקו לאיזו מהן התופים והבס באמת נצמדים.' },
        play: [clicks(140, 8)],
        show: { text: { en: '140 or 70?', he: '140 או 70?' } },
      },
      {
        say: { en: 'Slowing down is ritardando. It often closes a piece; listen for the gaps stretching. Practice tip: keeping a slow tempo steady is harder than a fast one, so practice slow with a metronome.', he: 'האטה נקראת ריטרדנדו. היא סוגרת הרבה פעמים יצירה; הקשיבו לרווחים שנמתחים. טיפ לתרגול: להחזיק טמפו איטי יציב קשה יותר ממהיר, אז תרגלו לאט עם מטרונום.' },
        play: [clicks(110, 8, 80)],
        show: { text: { en: 'ritardando ↘', he: 'ריטרדנדו ↘' } },
      },
      {
        say: { en: 'To keep: tempo is the pulse, not the notes. Anchor on 60 and 120, feel the gap, and decide which level of the beat you are counting.', he: 'מה לזכור: טמפו הוא הפעמה, לא הצלילים. היאחזו ב־60 וב־120, הרגישו את הרווח, והחליטו באיזו רמה של הפעמה אתם סופרים.' },
        show: { text: { en: 'pulse · anchors · gap', he: 'פעמה · עוגנים · רווח' } },
      },
    ],
  },
  {
    id: 'intervals-all',
    area: 'ear',
    emoji: '📏',
    title: { en: 'Every interval by ear', he: 'כל המרווחים בשמיעה' },
    takeaway: { en: 'Twelve intervals, each a number of semitones with its own color: rub, step, sad, sweet, open, tense, hollow, warm, bluesy, longing, the same note.', he: 'שנים־עשר מרווחים, כל אחד מספר חצאי טונים עם צבע משלו: חיכוך, צעד, עצוב, מתוק, פתוח, מתוח, חלול, חם, בלוזי, כמיהה, אותו צליל.' },
    steps: [
      {
        say: { en: 'Hi {name}! Between two notes there are twelve intervals, from one semitone up to the octave. Each has its own color. Let us meet them.', he: 'היי {name}! בין שני צלילים יש שנים־עשר מרווחים, מחצי טון ועד אוקטבה. לכל אחד צבע משלו. בואו נכיר אותם.' },
        play: [{ kind: 'notes', midis: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], each: 0.28 }],
        show: { text: { en: '1 … 12 semitones', he: '1 … 12 חצאי טונים' } },
      },
      {
        say: { en: 'The small ones: a minor 2nd rubs, a major 2nd is just a step. A minor 3rd sounds sad, a major 3rd sweet.', he: 'הקטנים: סקונדה קטנה מתחככת, סקונדה גדולה היא סתם צעד. טרצה קטנה נשמעת עצובה, טרצה גדולה מתוקה.' },
        play: [...two(60, 61), rest(0.3), ...two(60, 62), rest(0.3), ...two(60, 63), rest(0.3), ...two(60, 64)],
        show: { notes: [60, 61, 62, 63, 64], text: { en: 'm2 · M2 · m3 · M3', he: 'm2 · M2 · m3 · M3' } },
      },
      {
        say: { en: 'The middle: the perfect 4th is open, like a hymn. The tritone, six semitones, is restless. The perfect 5th is wide and hollow.', he: 'האמצע: הקוורטה הזכה פתוחה, כמו מזמור. הטריטון, שישה חצאי טונים, חסר מנוחה. הקווינטה הזכה רחבה וחלולה.' },
        play: [...two(60, 65), rest(0.3), ...two(60, 66), rest(0.3), ...two(60, 67)],
        show: { notes: [60, 65, 66, 67], text: { en: 'P4 · tritone · P5', he: 'P4 · טריטון · P5' } },
      },
      {
        say: { en: 'The big ones: a minor 6th is bittersweet, a major 6th warm. A minor 7th is bluesy, a major 7th longing. And the octave — the same note, higher.', he: 'הגדולים: סקסטה קטנה מתוקה־מרירה, סקסטה גדולה חמה. ספטימה קטנה בלוזית, ספטימה גדולה כמהה. ואוקטבה — אותו צליל, גבוה יותר.' },
        play: [...two(60, 68), ...two(60, 69), ...two(60, 70), ...two(60, 71), ...two(60, 72)],
        show: { notes: [60, 68, 69, 70, 71, 72], text: { en: 'm6 · M6 · m7 · M7 · 8', he: 'm6 · M6 · m7 · M7 · 8' } },
      },
      {
        say: { en: 'Together, intervals blend: listen for how much the two notes fight. Going down, sing the top note first, then the bottom.', he: 'ביחד, המרווחים מתמזגים: הקשיבו כמה שני הצלילים נאבקים. בירידה, שירו קודם את העליון ואז את התחתון.' },
        play: [...two(60, 64, true), rest(0.3), ...two(60, 66, true), rest(0.3), { kind: 'notes', midis: [72, 67], each: 0.7 }],
        show: { text: { en: 'together · down', he: 'ביחד · למטה' } },
      },
      {
        say: { en: 'Your turn! First up, then all twelve, then together, then down. Pick the interval — guess by color, then count if you need to.', he: 'תורכם! קודם עולים, אחר כך כל השנים־עשר, אחר כך ביחד, ואז יורדים. בחרו את המרווח — נחשו לפי הצבע, ואז ספרו אם צריך.' },
        show: { text: { en: 'which interval?', he: 'איזה מרווח?' } },
      },
    ],
    more: [
      {
        say: { en: 'An interval has a number and a quality. The number counts letter names, both ends included: C up to E is C, D, E — a third. The quality, major or minor, comes from the half steps: four make a major third, three a minor third.', he: 'למרווח יש מספר ואיכות. המספר סופר שמות של תווים, כולל שני הקצוות: מדו עד מי זה דו, רה, מי — טרצה. האיכות, גדולה או קטנה, באה מחצאי הטונים: ארבעה הם טרצה גדולה, שלושה טרצה קטנה.' },
        play: [...two(60, 64), rest(0.3), ...two(60, 63)],
        show: { notes: [60, 64, 63], text: { en: 'C–E M3 · C–E♭ m3', he: 'דו–מי M3 · דו–מי♭ m3' } },
      },
      {
        say: { en: 'Unisons, fourths, fifths and octaves are called perfect. The rest are major or minor. Stretch one half step further and you get augmented or diminished: C to F sharp is an augmented fourth, C to G flat a diminished fifth — the same tritone sound, spelled two ways.', he: 'אוניסון, קוורטה, קווינטה ואוקטבה נקראים זכים. השאר גדולים או קטנים. מותחים בעוד חצי טון ומקבלים מוגדל או מוקטן: דו עד פה דיאז היא קוורטה מוגדלת, דו עד סול במול קווינטה מוקטנת — אותו צליל של טריטון, בשני כתיבים.' },
        play: [...two(60, 66)],
        show: { notes: [60, 66], text: { en: 'A4 = d5 = 6 half steps', he: 'קוורטה מוגדלת = קווינטה מוקטנת = 6' } },
      },
      {
        say: { en: 'Turn an interval upside down and it inverts: the numbers add up to 9, major becomes minor, perfect stays perfect. C up to E is a major third; E up to C is a minor sixth.', he: 'הופכים מרווח והוא מתהפך: המספרים מסתכמים ב־9, גדול הופך לקטן, זך נשאר זך. דו למעלה עד מי זו טרצה גדולה; מי למעלה עד דו זו סקסטה קטנה.' },
        play: [...two(60, 64), rest(0.3), ...two(64, 72)],
        show: { notes: [60, 64, 72], text: { en: 'M3 ↔ m6 · P4 ↔ P5', he: 'M3 ↔ m6 · P4 ↔ P5' } },
      },
      {
        say: { en: 'Played together, intervals range from smooth to rough. Octaves and fifths blend, thirds and sixths are sweet, seconds, sevenths and the tritone clash. Fifth, major third, minor second.', he: 'כשמנגנים ביחד, המרווחים נעים בין חלק למחוספס. אוקטבות וקווינטות מתמזגות, טרצות וסקסטות מתוקות, סקונדות, ספטימות והטריטון מתנגשים. קווינטה, טרצה גדולה, סקונדה קטנה.' },
        play: [...two(60, 67, true), ...two(60, 64, true), ...two(60, 61, true)],
        show: { text: { en: 'blend · sweet · clash', he: 'מתמזג · מתוק · מתנגש' } },
      },
      {
        say: { en: 'Many people use song openings as anchors: "Over the Rainbow" leaps an octave, Wagner\'s Bridal Chorus starts with a fourth, the big leap in the Star Wars main theme is a fifth, and Bernstein\'s "Maria" opens with a tritone. Pick tunes you truly know.', he: 'הרבה אנשים משתמשים בפתיחות של שירים כעוגנים: "Over the Rainbow" קופץ אוקטבה, מקהלת החתונה של וגנר פותחת בקוורטה, הקפיצה הגדולה בנושא של מלחמת הכוכבים היא קווינטה, ו־"Maria" של ברנשטיין פותח בטריטון. בחרו מנגינות שאתם באמת מכירים.' },
        play: [...two(60, 72), rest(0.3), ...two(60, 65), rest(0.3), ...two(60, 67)],
        show: { text: { en: '8 · P4 · P5', he: '8 · P4 · P5' } },
      },
      {
        say: { en: 'The most common mix-up is the fourth and the fifth. Sing up the scale from the low note: do-re-mi-fa stops at the fourth, do to sol reaches the fifth. The fifth also sounds more settled and hollow.', he: 'הבלבול הנפוץ ביותר הוא בין קוורטה לקווינטה. שירו את הסולם מהצליל הנמוך: דו־רה־מי־פה נעצר בקוורטה, דו עד סול מגיע לקווינטה. הקווינטה גם נשמעת יציבה וחלולה יותר.' },
        play: [{ kind: 'notes', midis: [60, 62, 64, 65], each: 0.35 }, rest(0.3), { kind: 'notes', midis: [60, 62, 64, 65, 67], each: 0.35 }],
        show: { notes: [60, 62, 64, 65, 67], text: { en: 'fa = P4 · sol = P5', he: 'פה = P4 · סול = P5' } },
      },
      {
        say: { en: 'Beyond the octave, intervals are compound: a ninth is an octave plus a second, a tenth an octave plus a third. They keep the color of the small interval, opened out.', he: 'מעבר לאוקטבה המרווחים מורכבים: 9 היא אוקטבה ועוד סקונדה, 10 אוקטבה ועוד טרצה. הם שומרים על הצבע של המרווח הקטן, רק פתוח יותר.' },
        play: [...two(48, 62, true), rest(0.2), ...two(48, 64, true)],
        show: { notes: [48, 62, 64], text: { en: '9 = 8 + 2 · 10 = 8 + 3', he: '9 = 8 + 2 · 10 = 8 + 3' } },
      },
      {
        say: { en: 'To keep: count letters for the number, half steps for the quality. Guess by color first, then check by singing the scale between the two notes.', he: 'מה לזכור: אותיות בשביל המספר, חצאי טונים בשביל האיכות. נחשו קודם לפי הצבע, ואז בדקו בשירת הסולם שבין שני הצלילים.' },
        show: { text: { en: 'letters → number · half steps → quality', he: 'אותיות ← מספר · חצאי טונים ← איכות' } },
      },
    ],
  },
  {
    id: 'degrees-ext',
    area: 'ear',
    emoji: '🌗',
    title: { en: 'Degrees in minor & chromatic degrees', he: 'דרגות במינור ודרגות כרומטיות' },
    takeaway: { en: 'Natural minor lowers 3, 6 and 7. A chromatic degree is a note outside the key — ♭3, ♯4, ♭6, ♭7 — that leans on a scale note next to it.', he: 'מינור טבעי מנמיך את 3, 6 ו־7. דרגה כרומטית היא צליל מחוץ לסולם — ♭3, ♯4, ♭6, ♭7 — שנשען על צליל סולם שלידו.' },
    steps: [
      {
        say: { en: 'Hey {name}! In a minor key, home is still 1 — but the steps change. Hear the minor cadence, then home.', he: 'היי {name}! בסולם מינורי הבית הוא עדיין 1 — אבל הצעדים משתנים. הקשיבו לקדנצה המינורית, ואז לבית.' },
        play: [...minorCadence, { kind: 'note', midi: 57, duration: 1.2 }],
        show: { notes: [57], text: { en: 'A minor: 1 = A', he: 'לה מינור: 1 = לה' } },
      },
      {
        say: { en: 'Natural minor lowers three degrees of major: 3, 6 and 7. That is what makes it darker.', he: 'מינור טבעי מנמיך שלוש דרגות של המז׳ור: 3, 6 ו־7. זה מה שהופך אותו לכהה יותר.' },
        play: [{ kind: 'notes', midis: [57, 59, 60, 62, 64, 65, 67, 69], each: 0.4 }],
        show: { notes: [57, 59, 60, 62, 64, 65, 67, 69], text: { en: '1 2 ♭3 4 5 ♭6 ♭7 8', he: '1 2 ♭3 4 5 ♭6 ♭7 8' } },
      },
      {
        say: { en: 'Degrees still feel the same: 1 rests, 5 is strong. Here is 5, then 3 — in minor, 3 is the dark color.', he: 'הדרגות עדיין מרגישות אותו דבר: 1 נח, 5 חזק. הנה 5, ואז 3 — במינור, 3 הוא הצבע הכהה.' },
        play: [...minorCadence, { kind: 'note', midi: 64, duration: 1 }, { kind: 'note', midi: 60, duration: 1.2 }],
        show: { notes: [64, 60], text: { en: '5 · ♭3', he: '5 · ♭3' } },
      },
      {
        say: { en: 'Back in major, a chromatic degree is a note outside the key. Flat 3 is the blue note; sharp 4 is the Lydian lift; flat 7 is bluesy.', he: 'בחזרה במז׳ור, דרגה כרומטית היא צליל מחוץ לסולם. ♭3 הוא הבלו נוט; ♯4 הוא ההרמה הלידית; ♭7 בלוזי.' },
        play: [cadenceC, { kind: 'note', midi: 63, duration: 0.9 }, { kind: 'note', midi: 66, duration: 0.9 }, { kind: 'note', midi: 70, duration: 1.1 }],
        show: { notes: [63, 66, 70], key: 'C', text: { en: '♭3 · ♯4 · ♭7', he: '♭3 · ♯4 · ♭7' } },
      },
      {
        say: { en: 'The trick: a chromatic note leans. Ask which scale note it wants to slide into — up or down — and name it from there.', he: 'הטריק: צליל כרומטי נשען. שאלו לאיזה צליל של הסולם הוא רוצה להחליק — למעלה או למטה — וקראו לו לפי זה.' },
        play: [cadenceC, { kind: 'notes', midis: [66, 67], each: 0.8 }],
        show: { notes: [66, 67], key: 'C', text: { en: '♯4 → 5', he: '♯4 → 5' } },
      },
      {
        say: { en: 'Your turn! First every degree in a minor key, then chromatic ones in major. Feel home first, then the note.', he: 'תורכם! קודם כל הדרגות בסולם מינורי, ואז כרומטיות במז׳ור. הרגישו קודם את הבית, ואז את הצליל.' },
        show: { text: { en: 'which degree?', he: 'איזו דרגה?' } },
      },
    ],
    more: [
      {
        say: { en: 'Minor comes in three versions. Natural minor: 1 2 ♭3 4 5 ♭6 ♭7. Harmonic minor raises 7 back up, so it leans into home — in A minor, G sharp.', he: 'מינור מגיע בשלוש גרסאות. מינור טבעי: 1 2 ♭3 4 5 ♭6 ♭7. מינור הרמוני מעלה בחזרה את 7, כדי שיישען אל הבית — בלה מינור, סול דיאז.' },
        play: [{ kind: 'notes', midis: [57, 59, 60, 62, 64, 65, 68, 69], each: 0.38 }],
        show: { notes: [57, 59, 60, 62, 64, 65, 68, 69], text: { en: 'harmonic: … ♭6 7 8', he: 'הרמוני: … ♭6 7 8' } },
      },
      {
        say: { en: 'That raised 7 gives minor its strong dominant chord: E major, or E7, instead of E minor. It is the G sharp in the cadence you hear before every minor exercise.', he: 'ה־7 המוגבה נותן למינור את אקורד הדומיננטה החזק שלו: מי מז׳ור, או E7, במקום מי מינור. זה הסול דיאז בקדנצה שאתם שומעים לפני כל תרגיל במינור.' },
        play: [...minorCadence],
        show: { text: { en: 'Am · Dm · E7 · Am', he: 'Am · Dm · E7 · Am' } },
      },
      {
        say: { en: 'Melodic minor raises both 6 and 7 on the way up, to smooth the gap between them; in classical practice it falls back to natural minor coming down. In jazz it keeps both raised.', he: 'מינור מלודי מעלה גם את 6 וגם את 7 בעלייה, כדי להחליק את הפער ביניהם; בפרקטיקה הקלאסית הוא חוזר למינור טבעי בירידה. בג׳אז שתיהן נשארות מוגבהות.' },
        play: [{ kind: 'notes', midis: [57, 59, 60, 62, 64, 66, 68, 69], each: 0.38 }],
        show: { notes: [57, 59, 60, 62, 64, 66, 68, 69], text: { en: 'melodic ↑: … 6 7 8', he: 'מלודי ↑: … 6 7 8' } },
      },
      {
        say: { en: 'Each minor degree has its pull. ♭6 sighs down into 5 — in A minor, F to E. 2 leans down to 1, and 4 tends to fall to ♭3.', he: 'לכל דרגה במינור יש משיכה משלה. ♭6 נאנח למטה אל 5 — בלה מינור, פה אל מי. 2 נשען למטה אל 1, ו־4 נוטה לרדת אל ♭3.' },
        play: [...minorCadence, { kind: 'notes', midis: [65, 64], each: 0.8 }],
        show: { notes: [65, 64], text: { en: '♭6 → 5', he: '♭6 → 5' } },
      },
      {
        say: { en: 'A chromatic degree is spelled by where it goes. Rising, it takes a sharp: ♯4 to 5. Falling, a flat: ♭2 to 1, ♭6 to 5. Here, in C: D flat sinking into C.', he: 'דרגה כרומטית נכתבת לפי לאן שהיא הולכת. בעלייה היא מקבלת דיאז: ♯4 אל 5. בירידה, במול: ♭2 אל 1, ♭6 אל 5. כאן, בדו: רה במול ששוקע אל דו.' },
        play: [cadenceC, { kind: 'notes', midis: [61, 60], each: 0.8 }],
        show: { notes: [61, 60], key: 'C', text: { en: '♭2 → 1', he: '♭2 → 1' } },
      },
      {
        say: { en: 'Where they come from: ♭3, ♭6 and ♭7 are borrowed from the parallel minor. ♯4 often comes from a chord that leads to V — in C, D7 with its F sharp, then G, then home.', he: 'מאיפה הן באות: ♭3, ♭6 ו־♭7 מושאלות מהמינור שעל אותה טוניקה. ♯4 מגיע לעיתים קרובות מאקורד שמוביל אל V — בדו, D7 עם הפה דיאז שלו, אחר כך סול, ואז הבית.' },
        play: [{ kind: 'chord', midis: [48, 64, 67, 72], duration: 0.8 }, { kind: 'chord', midis: [50, 66, 69, 72], duration: 0.8 }, { kind: 'chord', midis: [43, 67, 71, 74], duration: 0.8 }, { kind: 'chord', midis: [48, 64, 67, 72], duration: 1.2 }],
        show: { text: { en: 'C · D7 · G · C', he: 'C · D7 · G · C' } },
      },
      {
        say: { en: 'In blues and rock, the blue ♭3 often bends or slides up into 3 over a major chord. The clash is the point. Hear the slide.', he: 'בבלוז ובמוזיקת רוק, ה־♭3 הבלו נוט עולה לעיתים קרובות בבנד או בהחלקה אל 3 מעל אקורד מז׳ורי. ההתנגשות היא העניין. שמעו את ההחלקה.' },
        play: [{ kind: 'chord', midis: [48, 55, 64], duration: 0.8 }, { kind: 'notes', midis: [63, 64, 60], each: 0.45 }],
        show: { notes: [63, 64, 60], key: 'C', text: { en: '♭3 → 3 → 1', he: '♭3 → 3 → 1' } },
      },
      {
        say: { en: 'The common mistake is naming a chromatic note by the nearest key instead of its direction. Ask where it wants to go. To keep: minor lowers 3, 6 and 7; chromatic notes lean, and their spelling shows the way.', he: 'הטעות הנפוצה היא לקרוא לצליל כרומטי לפי הקליד הקרוב במקום לפי הכיוון שלו. שאלו לאן הוא רוצה ללכת. מה לזכור: מינור מנמיך את 3, 6 ו־7; צלילים כרומטיים נשענים, והכתיב שלהם מראה את הדרך.' },
        show: { text: { en: '♯ goes up · ♭ goes down', he: '♯ עולה · ♭ יורד' } },
      },
    ],
  },
  {
    id: 'sight-read',
    area: 'theory',
    emoji: '👀',
    title: { en: 'Sight-reading by ear', he: 'קריאה מהדף בשמיעה' },
    takeaway: { en: 'Read ahead and hear it in your head first; then follow the notes one by one and catch the one that does not match.', he: 'קראו קדימה ושמעו את זה בראש קודם; ואז עקבו אחרי התווים אחד־אחד ותפסו את זה שלא תואם.' },
    steps: [
      {
        say: { en: 'Hi {name}! Sight-reading means hearing music from the page. Here are four notes — try to imagine them before I play.', he: 'היי {name}! קריאה מהדף פירושה לשמוע מוזיקה מהדף. הנה ארבעה תווים — נסו לדמיין אותם לפני שאני מנגן.' },
        play: [{ kind: 'notes', midis: [60, 62, 64, 62], each: 0.6 }],
        show: { notes: [60, 62, 64, 62], key: 'C' },
      },
      {
        say: { en: 'The shape tells you a lot: a step moves to the next line or space; a skip jumps one over. Up on the staff means up in pitch.', he: 'הצורה אומרת הרבה: צעד עובר לקו או לרווח הבא; דילוג קופץ על אחד. למעלה על החמשה זה למעלה בגובה.' },
        play: [{ kind: 'notes', midis: [60, 64, 67, 64], each: 0.6 }],
        show: { notes: [60, 64, 67, 64], key: 'C', text: { en: 'step · skip', he: 'צעד · דילוג' } },
      },
      {
        say: { en: 'Now follow along: same notes on the page, but one note is played differently. Did you catch it? It was the third.', he: 'עכשיו עקבו: אותם תווים על הדף, אבל צליל אחד מנוגן אחרת. תפסתם? זה היה השלישי.' },
        play: [{ kind: 'notes', midis: [60, 62, 65, 62], each: 0.6 }],
        show: { notes: [60, 62, 64, 62], key: 'C', text: { en: 'note 3 differs', he: 'צליל 3 שונה' } },
      },
      {
        say: { en: 'The trick: point at each note as it plays, so your eyes and ears move together. A surprise is the note you are pointing at.', he: 'הטריק: הצביעו על כל תו כשהוא מתנגן, כך שהעיניים והאוזניים זזות יחד. ההפתעה היא התו שעליו אתם מצביעים.' },
        play: [{ kind: 'notes', midis: [67, 65, 64, 62, 60], each: 0.55 }],
        show: { notes: [67, 65, 64, 62, 60], key: 'C' },
      },
      {
        say: { en: 'Your turn! Read, listen and say if it matches; then which note was different — in longer lines, in the bass clef, in minor; and at the top, three versions where only one is the written one.', he: 'תורכם! קראו, הקשיבו ותגידו אם זה תואם; ואז איזה צליל היה שונה — בשורות ארוכות, במפתח פה, במינור; ובראש הסולם, שלוש גרסאות שרק אחת מהן כתובה.' },
        show: { text: { en: 'match? which note?', he: 'תואם? איזה צליל?' } },
      },
    ],
    more: [
      {
        say: { en: 'Musicians call hearing music in your head "audiation". Sight-reading by ear is audiation from the page: you see the notes and hear them before any sound is made.', he: 'מוזיקאים קוראים לשמיעת מוזיקה בראש "אודיאציה". קריאה מהדף בשמיעה היא אודיאציה מהדף: רואים את התווים ושומעים אותם עוד לפני שנשמע צליל.' },
        show: { text: { en: 'see → hear inside', he: 'לראות ← לשמוע בפנים' } },
      },
      {
        say: { en: 'Before reading a single note, check the key signature and find home. One sharp means G major or E minor. Hum the home chord to set your ear.', he: 'לפני שקוראים תו אחד, בודקים את סימני ההיתק ומוצאים את הבית. דיאז אחד פירושו סול מז׳ור או מי מינור. זמזמו את אקורד הבית כדי לכוון את האוזן.' },
        play: [{ kind: 'cadence', key: { letter: 'G', acc: 0 } }, { kind: 'notes', midis: [55, 59, 62], each: 0.6 }],
        show: { notes: [55, 59, 62], key: 'G', text: { en: '1 ♯ = G major', he: '♯ אחד = סול מז׳ור' } },
      },
      {
        say: { en: 'Read the distance, not each letter. Line to the next space is a second; line to the next line, a third; line to the line after that, a fifth. C, E, G: two thirds, then a fourth up to C.', he: 'קוראים את המרחק, לא כל אות. מקו לרווח הבא זו סקונדה; מקו לקו הבא, טרצה; מקו לקו שאחריו, קווינטה. דו, מי, סול: שתי טרצות, ואז קוורטה עד דו.' },
        play: [{ kind: 'notes', midis: [60, 64, 67, 72], each: 0.6 }],
        show: { notes: [60, 64, 67, 72], key: 'C', text: { en: '3 · 3 · 4', he: '3 · 3 · 4' } },
      },
      {
        say: { en: 'Then group notes into patterns you already know: a scale run, a broken chord, a repeated note. You read words, not single letters — music works the same way.', he: 'אחר כך מקבצים תווים לתבניות שאתם כבר מכירים: ריצת סולם, אקורד שבור, צליל חוזר. קוראים מילים, לא אותיות בודדות — במוזיקה זה אותו דבר.' },
        play: [{ kind: 'notes', midis: [60, 62, 64, 65, 67], each: 0.35 }, rest(0.3), { kind: 'notes', midis: [67, 64, 60], each: 0.45 }],
        show: { notes: [60, 62, 64, 65, 67, 64, 60], key: 'C', text: { en: 'scale · chord', he: 'סולם · אקורד' } },
      },
      {
        say: { en: 'Rhythm is half of reading. Scan it first and tap it: here a quarter, two eighths, then quarters.', he: 'המקצב הוא חצי מהקריאה. סרקו אותו קודם והקישו: כאן רבע, שתי שמיניות, ואז רבעים.' },
        play: [{ kind: 'melody', midis: [60, 62, 64, 65, 67], beats: [1, 0.5, 0.5, 1, 1], bpm: 90 }],
        show: { notes: [60, 62, 64, 65, 67], key: 'C', durs: [1, 0.5, 0.5, 1, 1] },
      },
      {
        say: { en: 'When you follow and something surprises you, decide two things: which note, and was it higher or lower than written? Here the third note goes up to A instead of G.', he: 'כשאתם עוקבים ומשהו מפתיע, החליטו שני דברים: איזה צליל, והאם הוא היה גבוה או נמוך ממה שכתוב? כאן הצליל השלישי עולה ללה במקום לסול.' },
        play: [{ kind: 'notes', midis: [64, 65, 69, 65, 64], each: 0.55 }],
        show: { notes: [64, 65, 67, 65, 64], key: 'C', text: { en: 'note 3: higher', he: 'צליל 3: גבוה יותר' } },
      },
      {
        say: { en: 'In the bass clef the lines, bottom to top, are G, B, D, F, A, and middle C sits on a ledger line just above. Same distances, new names.', he: 'במפתח פה הקווים, מלמטה למעלה, הם סול, סי, רה, פה, לה, והדו האמצעי יושב על קו עזר ממש מעל. אותם מרחקים, שמות חדשים.' },
        play: [{ kind: 'notes', midis: [43, 47, 50, 53, 57], each: 0.5 }],
        show: { notes: [43, 47, 50, 53, 57], clef: 'bass' },
      },
      {
        say: { en: 'The common mistake is reading letter by letter and losing the line. Look one note ahead, hear the shape, and let the eye run before the ear. To keep: home, distance, pattern, rhythm.', he: 'הטעות הנפוצה היא לקרוא אות אחרי אות ולאבד את הקו. הסתכלו צליל אחד קדימה, שמעו את הצורה, ותנו לעין לרוץ לפני האוזן. מה לזכור: בית, מרחק, תבנית, מקצב.' },
        show: { text: { en: 'home · distance · pattern · rhythm', he: 'בית · מרחק · תבנית · מקצב' } },
      },
    ],
  },
];

/** A rhythm on one woodblock-like note: durations in eighths at 100 BPM. */
function beat(durs: number[]): Stimulus {
  const e = 0.3;
  const events: NoteEvent[] = [];
  let t = 0;
  for (const d of durs) {
    events.push({ midi: 76, start: t, duration: 0.1, velocity: 0.6 });
    t += d * e;
  }
  return { kind: 'events', events, length: t + 0.1 };
}
const tri = (r: number, third: number, fifth: number): Stimulus => ({ kind: 'chord', midis: [r - 12, r + third, r + fifth, r + 12], duration: 0.8 });

export const MEMORY_LESSONS: MiniLesson[] = [
  {
    id: 'rhythm-memory',
    area: 'rhythm',
    emoji: '🧠',
    title: { en: 'Rhythm memory', he: 'זיכרון ריתמי' },
    takeaway: { en: 'Chunk it: hear a rhythm as short words of one or two beats, and say them to yourself. Short words are easy to keep.', he: 'חלקו לחתיכות: שמעו מקצב כמילים קצרות של פעמה או שתיים, ואמרו אותן לעצמכם. מילים קצרות קל לשמור.' },
    steps: [
      {
        say: { en: 'Hey {name}! Remembering a rhythm is a real skill — drummers, dancers and singers use it all the time. Here is one bar.', he: 'היי {name}! לזכור מקצב זו מיומנות אמיתית — מתופפים, רקדנים וזמרים משתמשים בה כל הזמן. הנה תיבה אחת.' },
        play: [beat([2, 2, 1, 1, 2])],
        show: { text: { en: 'ta · ta · ti-ti · ta', he: 'טה · טה · טי־טי · טה' } },
      },
      {
        say: { en: 'The trick is chunking. Do not count every note — hear short words: "ta", "ti-ti", "ta-a". Two or three words fill a bar.', he: 'הטריק הוא לחלק לחתיכות. אל תספרו כל תו — שמעו מילים קצרות: "טה", "טי־טי", "טה־א". שתיים־שלוש מילים ממלאות תיבה.' },
        play: [beat([1, 1, 2, 4])],
        show: { text: { en: 'ti-ti · ta · ta-a', he: 'טי־טי · טה · טה־א' } },
      },
      {
        say: { en: 'Now the same or different? First the rhythm, then again — but one note moved by half a beat. Hear where it jumped?', he: 'עכשיו, אותו דבר או שונה? קודם המקצב, ואז שוב — אבל צליל אחד זז בחצי פעמה. שמעתם איפה הוא קפץ?' },
        play: [beat([2, 2, 1, 1, 2]), { kind: 'rest', duration: 1 }, beat([2, 1, 2, 1, 2])],
        show: { text: { en: 'one note moved', he: 'צליל אחד זז' } },
      },
      {
        say: { en: 'Longer rhythms: say the words to yourself while you listen, then keep them going through what comes next. That is how you hold four bars.', he: 'מקצבים ארוכים: אמרו את המילים לעצמכם בזמן ההאזנה, והמשיכו להחזיק אותן דרך מה שבא אחר כך. כך מחזיקים ארבע תיבות.' },
        play: [beat([2, 2, 1, 1, 2, 1, 1, 2, 4])],
      },
      {
        say: { en: 'Your turn! Same or different, then pick it out of three, then four bars with one tiny change. Chunk it — you have got this.', he: 'תורכם! אותו דבר או שונה, אחר כך לבחור אותו מתוך שלושה, ואז ארבע תיבות עם שינוי קטנטן. חלקו לחתיכות — אתם יכולים.' },
        show: { text: { en: 'same? which one?', he: 'אותו דבר? איזה?' } },
      },
    ],
    more: [
      {
        say: { en: 'Short-term memory holds only a few chunks at a time. A bar of eight separate notes is too many; two or three rhythm "words" is easy. Rhythm memory is the art of grouping.', he: 'הזיכרון לטווח קצר מחזיק רק כמה חתיכות בכל פעם. תיבה של שמונה צלילים נפרדים זה יותר מדי; שתיים־שלוש "מילים" ריתמיות זה קל. זיכרון ריתמי הוא אמנות הקיבוץ.' },
        play: [beat([1, 1, 1, 1, 2, 2])],
        show: { text: { en: 'ti-ti · ti-ti · ta · ta', he: 'טי־טי · טי־טי · טה · טה' } },
      },
      {
        say: { en: 'Two syllable systems are common: words like ta and ti-ti, or counting "1 and 2 and". Use whichever you already know; the point is to name each beat, not each note.', he: 'יש שתי שיטות הברות נפוצות: מילים כמו טה וטי־טי, או ספירה "1 וְ 2 וְ". השתמשו במה שאתם כבר מכירים; העיקר לתת שם לכל פעמה, לא לכל צליל.' },
        show: { text: { en: 'ta · ti-ti = 1 · 2 &', he: 'טה · טי־טי = 1 · 2 וְ' } },
      },
      {
        say: { en: 'Keep the beat in your body as a frame. The pulse is the grid; each note is either on a beat or between beats. The ones between beats — syncopations — are what you most need to remember.', he: 'החזיקו את הפעמה בגוף כמסגרת. הפעמה היא הרשת; כל צליל נמצא או על פעמה או ביניהן. אלה שבין הפעמות — הסינקופות — הם מה שהכי חשוב לזכור.' },
        play: [beat([1, 2, 1, 2, 2])],
        show: { text: { en: 'on · off · off · on · on', he: 'על · בין · בין · על · על' } },
      },
      {
        say: { en: 'A famous chunk: three plus three plus two eighths, the tresillo. It runs through Latin music, reggaeton and a great deal of pop. Once you know it, you hear it as one word.', he: 'חתיכה מפורסמת: שלוש ועוד שלוש ועוד שתיים שמיניות, הטרסיו. הוא עובר לאורך המוזיקה הלטינית, רגאטון והרבה מאוד פופ. מרגע שמכירים אותו, שומעים אותו כמילה אחת.' },
        play: [beat([3, 3, 2, 3, 3, 2])],
        show: { text: { en: '3 + 3 + 2', he: '3 + 3 + 2' } },
      },
      {
        say: { en: 'With short clicks, a long note and a short note followed by a rest sound alike. What you remember is where each sound starts — the attack points against the beat.', he: 'עם קליקים קצרים, צליל ארוך וצליל קצר עם הפסקה נשמעים אותו דבר. מה שזוכרים זה איפה כל צליל מתחיל — נקודות ההתקפה ביחס לפעמה.' },
        play: [beat([2, 2, 4]), rest(0.5), beat([2, 2, 4])],
        show: { text: { en: 'where it starts', he: 'איפה זה מתחיל' } },
      },
      {
        say: { en: 'Music repeats itself. Many four-bar rhythms are a bar, the same bar, then a change. Listen for the repeat and spend your attention on the change.', he: 'מוזיקה חוזרת על עצמה. הרבה מקצבים של ארבע תיבות הם תיבה, אותה תיבה שוב, ואז שינוי. הקשיבו לחזרה והשקיעו את תשומת הלב בשינוי.' },
        play: [beat([2, 1, 1, 2, 2]), beat([2, 1, 1, 2, 2]), beat([1, 1, 1, 1, 4])],
        show: { text: { en: 'A · A · B', he: 'A · A · B' } },
      },
      {
        say: { en: 'The common mistake is losing the "1", the downbeat, so everything shifts. Tap or nod on every 1. To keep: feel the pulse, chunk into words, and watch where the pattern changes.', he: 'הטעות הנפוצה היא לאבד את ה"1", הפעמה הראשונה, ואז הכול זז. הקישו או הנהנו על כל 1. מה לזכור: הרגישו את הפעמה, חלקו למילים, ושימו לב איפה התבנית משתנה.' },
        show: { text: { en: 'pulse · words · change', he: 'פעמה · מילים · שינוי' } },
      },
    ],
  },
  {
    id: 'chord-memory',
    area: 'harmony',
    emoji: '🧩',
    title: { en: 'Chord memory', he: 'זיכרון הרמוני' },
    takeaway: { en: 'Follow the bass and the mood of each chord, chord by chord: bright, dark, tense. The one whose mood changed is the one that changed.', he: 'עקבו אחרי הבס ואחרי מצב הרוח של כל אקורד, אקורד אחרי אקורד: בהיר, כהה, מתוח. זה שמצב הרוח שלו השתנה — הוא זה שהשתנה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Musicians remember whole chord progressions — that is how they learn songs by ear. Here are three chords.', he: 'היי {name}! מוזיקאים זוכרים מהלכי אקורדים שלמים — כך הם לומדים שירים בשמיעה. הנה שלושה אקורדים.' },
        play: [tri(60, 4, 7), tri(65, 4, 7), tri(67, 4, 7)],
        show: { text: { en: 'I · IV · V', he: 'I · IV · V' } },
      },
      {
        say: { en: 'Give each chord a word: major is bright, minor is dark. Follow the bass too — it walks under everything.', he: 'תנו לכל אקורד מילה: מז׳ור בהיר, מינור כהה. עקבו גם אחרי הבס — הוא הולך מתחת לכל השאר.' },
        play: [tri(60, 4, 7), tri(69, 3, 7)],
        show: { text: { en: 'bright · dark', he: 'בהיר · כהה' } },
      },
      {
        say: { en: 'Now the same three — but the middle one changed. The bass moved and the color went dark. That is the one.', he: 'עכשיו אותם שלושה — אבל האמצעי השתנה. הבס זז והצבע נהיה כהה. זה הוא.' },
        play: [tri(60, 4, 7), tri(65, 4, 7), tri(67, 4, 7), { kind: 'rest', duration: 0.8 }, tri(60, 4, 7), tri(62, 3, 7), tri(67, 4, 7)],
        show: { text: { en: 'chord 2 changed', he: 'אקורד 2 השתנה' } },
      },
      {
        say: { en: 'For long progressions, number them as you go — one, two, three, four — and keep the bass line humming in your head. When the color flips, note the number.', he: 'במהלכים ארוכים, מספרו אותם תוך כדי — אחת, שתיים, שלוש, ארבע — ותזמזמו את קו הבס בראש. כשהצבע מתהפך, זכרו את המספר.' },
        play: [tri(60, 4, 7), tri(69, 3, 7), tri(65, 4, 7), tri(67, 4, 7)],
        show: { text: { en: '1 · 2 · 3 · 4', he: '1 · 2 · 3 · 4' } },
      },
      {
        say: { en: 'Your turn! The progression plays twice; say which chord changed. Three chords, then four, then six.', he: 'תורכם! המהלך מתנגן פעמיים; אמרו איזה אקורד השתנה. שלושה אקורדים, אחר כך ארבעה, ואז שישה.' },
        show: { text: { en: 'which chord?', he: 'איזה אקורד?' } },
      },
    ],
    more: [
      {
        say: { en: 'Musicians remember progressions as functions, not names. Roman numerals number the chords of the key: in C, C is I, F is IV, G is V, A minor is vi. The same numbers work in every key.', he: 'מוזיקאים זוכרים מהלכים כפונקציות, לא כשמות. ספרות רומיות ממספרות את אקורדי הסולם: בדו, דו הוא I, פה הוא IV, סול הוא V, לה מינור הוא vi. אותם מספרים עובדים בכל סולם.' },
        play: [tri(60, 4, 7), tri(65, 4, 7), tri(67, 4, 7), tri(69, 3, 7)],
        show: { text: { en: 'I · IV · V · vi', he: 'I · IV · V · vi' } },
      },
      {
        say: { en: 'Each chord quality has its color: major bright, minor dark, a dominant seventh tense and wanting to move, diminished unstable. Hear C, A minor, G7 and B diminished.', he: 'לכל סוג אקורד צבע משלו: מז׳ור בהיר, מינור כהה, ספטימה דומיננטית מתוחה ורוצה לזוז, מוקטן לא יציב. שמעו דו, לה מינור, G7 ו־סי מוקטן.' },
        play: [tri(60, 4, 7), tri(69, 3, 7), { kind: 'chord', midis: [43, 59, 62, 65], duration: 0.8 }, tri(59, 3, 6)],
        show: { text: { en: 'bright · dark · tense · unstable', he: 'בהיר · כהה · מתוח · לא יציב' } },
      },
      {
        say: { en: 'The bass line is the spine. Hum it while the chords play: here C, F, G, C. Strong moves, like a fourth up or a fifth down, are the easiest to remember.', he: 'קו הבס הוא עמוד השדרה. זמזמו אותו בזמן שהאקורדים מתנגנים: כאן דו, פה, סול, דו. תנועות חזקות, כמו קוורטה למעלה או קווינטה למטה, הכי קל לזכור.' },
        play: [tri(60, 4, 7), tri(65, 4, 7), tri(67, 4, 7), tri(60, 4, 7)],
        show: { notes: [48, 53, 55, 48], clef: 'bass', text: { en: 'C · F · G · C', he: 'דו · פה · סול · דו' } },
      },
      {
        say: { en: 'Many songs reuse a few patterns, so learn them as single units. I–V–vi–IV runs under a huge number of pop songs; ii–V–I is the core of jazz.', he: 'הרבה שירים משתמשים שוב ושוב בכמה תבניות, אז למדו אותן כיחידה אחת. I–V–vi–IV נמצא מתחת למספר עצום של שירי פופ; ii–V–I הוא הלב של הג׳אז.' },
        play: [tri(60, 4, 7), tri(67, 4, 7), tri(69, 3, 7), tri(65, 4, 7)],
        show: { text: { en: 'I · V · vi · IV', he: 'I · V · vi · IV' } },
      },
      {
        say: { en: 'A change can hide in the color alone. Here the bass stays on F, but the second time F major becomes F minor — a chord borrowed from the minor key.', he: 'שינוי יכול להסתתר רק בצבע. כאן הבס נשאר על פה, אבל בפעם השנייה פה מז׳ור הופך לפה מינור — אקורד מושאל מהסולם המינורי.' },
        play: [tri(60, 4, 7), tri(65, 4, 7), tri(60, 4, 7), { kind: 'rest', duration: 0.6 }, tri(60, 4, 7), tri(65, 3, 7), tri(60, 4, 7)],
        show: { text: { en: 'IV → iv', he: 'IV → iv' } },
      },
      {
        say: { en: 'For long progressions, chunk in pairs: four chords are two gestures, six are three. Notice when the music returns home to I; it splits the line into phrases.', he: 'במהלכים ארוכים, חלקו לזוגות: ארבעה אקורדים הם שתי תנועות, שישה הם שלוש. שימו לב מתי המוזיקה חוזרת הביתה ל־I; זה מחלק את המהלך למשפטים.' },
        show: { text: { en: '(1 2) (3 4) (5 6)', he: '(1 2) (3 4) (5 6)' } },
      },
      {
        say: { en: 'The common mistake is trying to hold every chord at once. Keep the bass and the colors, and listen for the moment something feels different. To keep: numbers, bass, color, pairs.', he: 'הטעות הנפוצה היא לנסות להחזיק כל אקורד בבת אחת. שמרו את הבס ואת הצבעים, והקשיבו לרגע שבו משהו מרגיש אחרת. מה לזכור: מספרים, בס, צבע, זוגות.' },
        show: { text: { en: 'numbers · bass · color · pairs', he: 'מספרים · בס · צבע · זוגות' } },
      },
    ],
  },
  {
    id: 'call-response',
    area: 'play',
    emoji: '💬',
    title: { en: 'Call & response', he: 'שאלה ותשובה' },
    takeaway: { en: 'A good answer lands somewhere that makes sense: home to finish, a chord note to fit, or the call\'s own shape, moved, to echo it.', he: 'תשובה טובה נוחתת במקום הגיוני: בבית כדי לסיים, על צליל של האקורד כדי להתאים, או בצורה של השאלה עצמה, במקום אחר, כדי להדהד אותה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Improvising starts with listening: a phrase asks a question, and your phrase answers. Here is a call — it sounds unfinished.', he: 'היי {name}! אלתור מתחיל בהקשבה: משפט שואל שאלה, והמשפט שלכם עונה. הנה שאלה — היא נשמעת לא גמורה.' },
        play: [cadenceC, { kind: 'notes', midis: [60, 62, 64, 67], each: 0.32 }],
        show: { notes: [60, 62, 64, 67], key: 'C', text: { en: 'the call', he: 'השאלה' } },
      },
      {
        say: { en: 'An answer that lands home sounds finished. One that stops on 2 or 7 sounds like another question. Hear both.', he: 'תשובה שנוחתת בבית נשמעת גמורה. תשובה שעוצרת על 2 או 7 נשמעת כמו עוד שאלה. הקשיבו לשתיהן.' },
        play: [{ kind: 'notes', midis: [67, 65, 62, 60], each: 0.32 }, { kind: 'rest', duration: 0.8 }, { kind: 'notes', midis: [67, 65, 64, 62], each: 0.32 }],
        show: { text: { en: 'home ✓ · open ?', he: 'בית ✓ · פתוח ?' } },
      },
      {
        say: { en: 'Over a chord, the safest notes are the chord\'s own. Over F major, F, A and C fit; B rubs against it.', he: 'מעל אקורד, הצלילים הבטוחים ביותר הם הצלילים שלו. מעל פה מז׳ור, פה, לה ודו מתאימים; סי מתחכך בו.' },
        play: [{ kind: 'chord', midis: [53, 65, 69], duration: 1.2 }, { kind: 'notes', midis: [65, 69, 72], each: 0.35 }, { kind: 'chord', midis: [53, 65, 69], duration: 1.2 }, { kind: 'notes', midis: [71, 71], each: 0.4 }],
        show: { notes: [65, 69, 72, 71], text: { en: 'fits · rubs', he: 'מתאים · מתחכך' } },
      },
      {
        say: { en: 'And the classic trick: echo. Take the call\'s shape and play it again a step higher. The ear loves it.', he: 'והטריק הקלאסי: הד. קחו את הצורה של השאלה ונגנו אותה שוב צעד אחד למעלה. האוזן אוהבת את זה.' },
        play: [{ kind: 'notes', midis: [60, 62, 64, 67], each: 0.32 }, { kind: 'rest', duration: 0.35 }, { kind: 'notes', midis: [62, 64, 65, 69], each: 0.32 }],
        show: { notes: [60, 62, 64, 67, 62, 64, 65, 69], key: 'C', text: { en: 'echo, a step up', he: 'הד, צעד למעלה' } },
      },
      {
        say: { en: 'Your turn! A call, two answers: which one finishes, which one fits the chord, which one echoes. Then try your own on the backing tracks.', he: 'תורכם! שאלה ושתי תשובות: איזו מסיימת, איזו מתאימה לאקורד, איזו מהדהדת. ואחר כך נסו תשובה משלכם על ה־Backing tracks.' },
        show: { text: { en: 'which answer?', he: 'איזו תשובה?' } },
      },
    ],
    more: [
      {
        say: { en: 'Call and response is one of the oldest forms in music: one voice calls, others answer. It is central to West African traditions, work songs, gospel and blues, and lives on in jazz musicians trading phrases.', he: 'שאלה ותשובה היא אחת הצורות העתיקות במוזיקה: קול אחד קורא, אחרים עונים. היא מרכזית במסורות של מערב אפריקה, בשירי עבודה, בגוספל ובבלוז, וממשיכה בג׳אז כשנגנים מחליפים משפטים.' },
        show: { text: { en: 'call ↔ response', he: 'שאלה ↔ תשובה' } },
      },
      {
        say: { en: 'In theory terms, a question and answer form a period. The first phrase ends open, often on 2 or 5; the second starts the same way and ends on 1.', he: 'במונחי תאוריה, שאלה ותשובה יוצרות פריודה. המשפט הראשון מסתיים פתוח, לרוב על 2 או 5; השני מתחיל באותה צורה ומסתיים על 1.' },
        play: [{ kind: 'notes', midis: [60, 64, 67, 65, 64, 62], each: 0.32 }, rest(0.5), { kind: 'notes', midis: [60, 64, 67, 65, 64, 62, 60], each: 0.32 }],
        show: { notes: [60, 64, 67, 65, 64, 62], key: 'C', text: { en: '… 2 ? · … 1 .', he: '… 2 ? · … 1 .' } },
      },
      {
        say: { en: 'You have four tools to answer: repeat the call, move it (a sequence), vary it — same rhythm, new notes — or contrast it. Here the answer keeps the rhythm and changes the notes.', he: 'יש לכם ארבעה כלים לענות: לחזור על השאלה, להזיז אותה (סקוונצה), לגוון אותה — אותו מקצב, צלילים חדשים — או לענות בניגוד. כאן התשובה שומרת על המקצב ומחליפה את הצלילים.' },
        play: [{ kind: 'melody', midis: [67, 67, 69, 67], beats: [0.5, 0.5, 1, 2], bpm: 100 }, { kind: 'melody', midis: [65, 65, 64, 60], beats: [0.5, 0.5, 1, 2], bpm: 100 }],
        show: { notes: [67, 67, 69, 67, 65, 65, 64, 60], key: 'C', text: { en: 'same rhythm, new notes', he: 'אותו מקצב, צלילים חדשים' } },
      },
      {
        say: { en: 'Put chord tones on the strong beats and let other notes pass between them. Going from G7 to C, a line on B rises to C and one on F falls to E: tension, then release.', he: 'שימו צלילי אקורד על הפעמות החזקות ותנו לצלילים אחרים לעבור ביניהם. במעבר מ־G7 ל־C, קו על סי עולה לדו וקו על פה יורד למי: מתח, ואז שחרור.' },
        play: [{ kind: 'chord', midis: [43, 53, 59, 65], duration: 1.1 }, { kind: 'chord', midis: [48, 52, 60, 64], duration: 1.5 }],
        show: { notes: [59, 65, 60, 64], text: { en: 'B → C · F → E', he: 'סי ← דו · פה ← מי' } },
      },
      {
        say: { en: 'The blues uses the form inside each verse: a line, the same line again, then a different line that answers it — AAB. Between the sung lines, the guitar answers the voice.', he: 'הבלוז משתמש בצורה בתוך כל בית: שורה, אותה שורה שוב, ואז שורה אחרת שעונה לה — AAB. בין השורות המושרות, הגיטרה עונה לקול.' },
        show: { text: { en: 'A · A · B', he: 'A · A · B' } },
      },
      {
        say: { en: 'Practice tip: answer with three notes only, and sing before you play. A short answer that lands home beats a long one that wanders.', he: 'טיפ לתרגול: ענו בשלושה צלילים בלבד, ושירו לפני שאתם מנגנים. תשובה קצרה שנוחתת בבית עדיפה על ארוכה שמשוטטת.' },
        play: [{ kind: 'notes', midis: [67, 65, 64, 62], each: 0.32 }, rest(0.5), { kind: 'notes', midis: [64, 62, 60], each: 0.4 }],
        show: { notes: [64, 62, 60], key: 'C', text: { en: '3 · 2 · 1', he: '3 · 2 · 1' } },
      },
      {
        say: { en: 'The common mistake is not listening: starting before the call ends, or playing something unrelated. Leave space, borrow from the call. To keep: end where it makes sense, and let the answer remember the question.', he: 'הטעות הנפוצה היא לא להקשיב: להתחיל לפני שהשאלה נגמרת, או לנגן משהו שלא קשור. השאירו מקום, קחו חומר מהשאלה. מה לזכור: לסיים במקום הגיוני, ולתת לתשובה לזכור את השאלה.' },
        show: { text: { en: 'listen · space · land', he: 'הקשבה · מקום · נחיתה' } },
      },
    ],
  },
];

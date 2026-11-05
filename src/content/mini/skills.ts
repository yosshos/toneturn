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
  },
  {
    id: 'intervals-all',
    area: 'ear',
    emoji: '📏',
    title: { en: 'Every interval by ear', he: 'כל המרווחים בשמיעה' },
    takeaway: { en: 'Twelve intervals, each a number of semitones with its own colour: rub, step, sad, sweet, open, tense, hollow, warm, bluesy, longing, the same note.', he: 'שנים־עשר מרווחים, כל אחד מספר חצאי טונים עם צבע משלו: חיכוך, צעד, עצוב, מתוק, פתוח, מתוח, חלול, חם, בלוזי, כמיהה, אותו צליל.' },
    steps: [
      {
        say: { en: 'Hi {name}! Between two notes there are twelve intervals, from one semitone up to the octave. Each has its own colour. Let us meet them.', he: 'היי {name}! בין שני צלילים יש שנים־עשר מרווחים, מחצי טון ועד אוקטבה. לכל אחד צבע משלו. בואו נכיר אותם.' },
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
        say: { en: 'Your turn! First up, then all twelve, then together, then down. Pick the interval — guess by colour, then count if you need to.', he: 'תורכם! קודם עולים, אחר כך כל השנים־עשר, אחר כך ביחד, ואז יורדים. בחרו את המרווח — נחשו לפי הצבע, ואז ספרו אם צריך.' },
        show: { text: { en: 'which interval?', he: 'איזה מרווח?' } },
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
        say: { en: 'Degrees still feel the same: 1 rests, 5 is strong. Here is 5, then 3 — in minor, 3 is the dark colour.', he: 'הדרגות עדיין מרגישות אותו דבר: 1 נח, 5 חזק. הנה 5, ואז 3 — במינור, 3 הוא הצבע הכהה.' },
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
        say: { en: 'Now the same three — but the middle one changed. The bass moved and the colour went dark. That is the one.', he: 'עכשיו אותם שלושה — אבל האמצעי השתנה. הבס זז והצבע נהיה כהה. זה הוא.' },
        play: [tri(60, 4, 7), tri(65, 4, 7), tri(67, 4, 7), { kind: 'rest', duration: 0.8 }, tri(60, 4, 7), tri(62, 3, 7), tri(67, 4, 7)],
        show: { text: { en: 'chord 2 changed', he: 'אקורד 2 השתנה' } },
      },
      {
        say: { en: 'For long progressions, number them as you go — one, two, three, four — and keep the bass line humming in your head. When the colour flips, note the number.', he: 'במהלכים ארוכים, מספרו אותם תוך כדי — אחת, שתיים, שלוש, ארבע — ותזמזמו את קו הבס בראש. כשהצבע מתהפך, זכרו את המספר.' },
        play: [tri(60, 4, 7), tri(69, 3, 7), tri(65, 4, 7), tri(67, 4, 7)],
        show: { text: { en: '1 · 2 · 3 · 4', he: '1 · 2 · 3 · 4' } },
      },
      {
        say: { en: 'Your turn! The progression plays twice; say which chord changed. Three chords, then four, then six.', he: 'תורכם! המהלך מתנגן פעמיים; אמרו איזה אקורד השתנה. שלושה אקורדים, אחר כך ארבעה, ואז שישה.' },
        show: { text: { en: 'which chord?', he: 'איזה אקורד?' } },
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
  },
];

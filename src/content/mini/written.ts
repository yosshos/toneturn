// Quick lessons for the 0.38 written topics (spec AE §4.2, §4.5, §10): writing melodies, rhythms, two voices and
// the bass; colour chords on paper; scales, four-part harmony, counterpoint and ornaments. Sound first, plain words.
import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const C = { letter: 'C' as const, acc: 0 as const };
const cadence: Stimulus = { kind: 'cadence', key: C };
const notes = (midis: number[], each = 0.5): Stimulus => ({ kind: 'notes', midis, each });
const chord = (midis: number[], duration = 1.3): Stimulus => ({ kind: 'chord', midis, duration });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const melody = (midis: number[], beats: number[], bpm = 84): Stimulus => ({ kind: 'melody', midis, beats, bpm });
/** Voices with durations in beats, played together. */
function voices(lines: { midis: number[]; beats: number[]; from?: number }[], bpm = 72): Stimulus {
  const b = 60 / bpm;
  const ev: NoteEvent[] = [];
  let end = 0;
  for (const l of lines) {
    let t = l.from ?? 0;
    l.midis.forEach((m, i) => {
      ev.push({ midi: m, start: t * b, duration: l.beats[i] * b * 0.95, velocity: 0.6 });
      t += l.beats[i];
    });
    end = Math.max(end, t);
  }
  return { kind: 'events', events: ev, length: end * b + 0.3 };
}
/** Hits on an eighth-note grid over a click on every beat (4/4). */
function grid(on: number[], bars = 2, step = 0.3): Stimulus {
  const ev: NoteEvent[] = [];
  for (let k = 0; k < bars * 4; k++) ev.push({ midi: 76, start: k * 2 * step, duration: 0.04, velocity: k % 4 === 0 ? 0.55 : 0.3, perc: k % 4 === 0 ? 'accent' : 'click' });
  for (const o of on) ev.push({ midi: 64, start: o * step, duration: step * 0.9, velocity: 0.8, perc: 'wood' });
  return { kind: 'events', events: ev, length: bars * 8 * step + 0.2 };
}
const blocks = (chords: number[][], each = 0.9): Stimulus => ({
  kind: 'events',
  events: chords.flatMap((c, i) => c.map((m) => ({ midi: m, start: i * each, duration: i === chords.length - 1 ? each * 1.6 : each * 0.95, velocity: 0.5 }))),
  length: (chords.length - 1) * each + each * 1.6 + 0.2,
});

export const LESSONS: MiniLesson[] = [
  {
    id: 'write-melody',
    area: 'theory',
    emoji: '✍️',
    title: { en: 'Write what you hear', he: 'לכתוב את מה ששומעים' },
    takeaway: { en: 'Hear the key first, keep the tune in your head, then write it note by note: step or leap, up or down. Rhythm comes after the pitches.', he: 'קודם שומעים את הסולם, מחזיקים את המנגינה בראש, ואז כותבים צליל אחרי צליל: צעד או קפיצה, למעלה או למטה. את הקצב כותבים אחרי הצלילים.' },
    steps: [
      { say: { en: 'Hi {name}! Writing a melody starts with the key. These four chords tell your ear where home is.', he: 'היי {name}! כתיבת מנגינה מתחילה בסולם. ארבעת האקורדים האלה מראים לאוזן איפה הבית.' }, play: [cadence], playFirst: true, show: { text: { en: 'C major', he: 'דו מז׳ור' } } },
      { say: { en: 'Now a short tune. Before writing anything, hum it back in your head.', he: 'עכשיו מנגינה קצרה. לפני שכותבים משהו, זמזמו אותה בראש.' }, play: [notes([64, 62, 60], 0.6)], playFirst: true, show: { notes: [64, 62, 60], key: 'C', clef: 'treble' } },
      { say: { en: 'The first note is given. For every next note ask two questions: a step or a leap? Up or down?', he: 'הצליל הראשון נתון. על כל צליל הבא שואלים שתי שאלות: צעד או קפיצה? למעלה או למטה?' }, play: [notes([60, 64, 67, 65, 64], 0.55)], show: { notes: [60, 64, 67, 65, 64], key: 'C', clef: 'treble', text: { en: 'leap · leap · step · step', he: 'קפיצה · קפיצה · צעד · צעד' } } },
      { say: { en: 'With rhythm, write the notes first, then their lengths: this one is long, short, short, long.', he: 'כשיש קצב, כותבים קודם את הצלילים ואחר כך את האורכים: כאן ארוך, קצר, קצר, ארוך.' }, play: [melody([67, 65, 64, 60], [2, 1, 1, 4])], show: { notes: [67, 65, 64, 60], durs: [2, 1, 1, 4], key: 'C', clef: 'treble' } },
      { say: { en: 'Stuck on a note? Sing the line from the start up to that note, then compare it with the home note: is it the tonic, the third, the fifth? Knowing the scale degree tells you exactly where to write it on the staff.', he: 'נתקעתם על צליל? שירו את הקו מההתחלה עד הצליל הזה, ואז השוו אותו לצליל הבית: האם זו הטוניקה, הטרצה, הקווינטה? כשיודעים את הדרגה בסולם, יודעים בדיוק איפה לכתוב אותה על החמשה.' }, play: [notes([60, 62, 64, 67, 64, 60], 0.5)], show: { notes: [60, 62, 64, 67, 64, 60], key: 'C', clef: 'treble', text: { en: '1 2 3 5 3 1', he: '1 2 3 5 3 1' } } },
      { say: { en: 'Your turn! Listen, hum, then write. Three replays are free.', he: 'תורכם! הקשיבו, זמזמו, ואז כתבו. שלוש השמעות חוזרות בחינם.' }, show: { text: { en: '👂 → 🎵 → ✍️', he: '👂 → 🎵 → ✍️' } } },
    ],
  },
  {
    id: 'build-rhythm',
    area: 'rhythm',
    emoji: '🧱',
    title: { en: 'Build the rhythm', he: 'לבנות את המקצב' },
    takeaway: { en: 'Count the beats while you listen, then build the bars one beat at a time from blocks: a long note, two eighths, a dotted figure…', he: 'סופרים פעמות תוך כדי הקשבה, ואז בונים את התיבות פעמה אחרי פעמה מקוביות: צליל ארוך, שתי שמיניות, דמות מנוקדת…' },
    steps: [
      { say: { en: 'Two bars of rhythm over a click. Count one, two, three, four along with it.', he: 'שתי תיבות של מקצב מעל קליק. ספרו איתו אחת, שתיים, שלוש, ארבע.' }, play: [grid([0, 2, 4, 5, 6, 8, 12, 14])], playFirst: true, show: { text: { en: '1 2 3 4 | 1 2 3 4', he: '1 2 3 4 | 1 2 3 4' } } },
      { say: { en: 'Take it one beat at a time. One hit on a beat is a quarter note; two quick hits are two eighths.', he: 'לוקחים פעמה אחת בכל פעם. מכה אחת על פעמה היא רבע; שתי מכות מהירות הן שתי שמיניות.' }, play: [grid([0, 2, 4, 5, 6], 1)], show: { text: { en: '♩ ♩ ♫ ♩', he: '♩ ♩ ♫ ♩' } } },
      { say: { en: 'A note that holds through two beats is a half note — nothing new happens on the second beat.', he: 'צליל שנמשך שתי פעמות הוא חצי — בפעמה השנייה לא קורה שום דבר חדש.' }, play: [grid([0, 4, 6], 1)], show: { text: { en: '𝅗𝅥 ♩ ♩', he: '𝅗𝅥 ♩ ♩' } } },
      { say: { en: 'A dotted quarter followed by an eighth makes a long-short limp. The dot adds half the value, so the long note lasts one and a half beats and the short one fills the rest.', he: 'רבע מנוקד ואחריו שמינית יוצרים צליעה של ארוך־קצר. הנקודה מוסיפה חצי מהערך, אז הצליל הארוך נמשך פעמה וחצי והקצר משלים את השאר.' }, play: [grid([0, 3, 4, 6], 1)], show: { text: { en: '♩. ♪ ♩ ♩', he: '♩. ♪ ♩ ♩' } } },
      { say: { en: 'Now build both bars from the blocks, then play your version to check it.', he: 'עכשיו בנו את שתי התיבות מהקוביות, ונגנו את הגרסה שלכם כדי לבדוק.' }, play: [grid([0, 2, 4, 5, 6, 8, 12, 14])], show: { text: { en: '♩ ♩ ♫ ♩ | 𝅗𝅥 ♩ ♩', he: '♩ ♩ ♫ ♩ | 𝅗𝅥 ♩ ♩' } } },
    ],
  },
  {
    id: 'two-voices',
    area: 'harmony',
    emoji: '🎼',
    title: { en: 'Two voices', he: 'שני קולות' },
    takeaway: { en: 'In two-part music, follow one line at a time. Voices often move in opposite directions, and meet mostly in thirds, sixths and octaves.', he: 'במוזיקה בשני קולות עוקבים אחרי קו אחד בכל פעם. הקולות נעים הרבה בכיוונים הפוכים, ונפגשים בעיקר בטרצות, סקסטות ואוקטבות.' },
    steps: [
      { say: { en: 'Two lines at once, {name}. First just enjoy how they fit together.', he: 'שני קווים בבת אחת, {name}. קודם פשוט תיהנו מאיך שהם משתלבים.' }, play: [voices([{ midis: [72, 74, 76, 74, 72], beats: [1, 1, 1, 1, 2] }, { midis: [60, 59, 57, 59, 48], beats: [1, 1, 1, 1, 2] }])], playFirst: true, show: { text: { en: 'two lines', he: 'שני קווים' } } },
      { say: { en: 'Now only the top line. Hum it.', he: 'עכשיו רק הקו העליון. זמזמו אותו.' }, play: [notes([72, 74, 76, 74, 72])], show: { notes: [72, 74, 76, 74, 72], key: 'C', clef: 'treble' } },
      { say: { en: 'And the bottom line. Notice: when the top goes up, the bottom goes down. That is contrary motion.', he: 'ועכשיו הקו התחתון. שימו לב: כשהעליון עולה, התחתון יורד. זו תנועה נגדית.' }, play: [notes([60, 59, 57, 59, 48])], show: { notes: [48, 47, 45, 47, 36], key: 'C', clef: 'bass' } },
      { say: { en: 'Sometimes the lower voice copies the upper one a bar later. That is imitation — listen for the echo.', he: 'לפעמים הקול התחתון מעתיק את העליון תיבה אחת אחריו. זה חיקוי — הקשיבו להד.' }, play: [voices([{ midis: [72, 74, 76, 72, 76, 77, 79, 76], beats: [1, 1, 1, 1, 1, 1, 1, 1] }, { midis: [60, 62, 64, 60], beats: [1, 1, 1, 1], from: 4 }])], show: { text: { en: 'imitation', he: 'חיקוי' } } },
      { say: { en: 'Where the voices meet, listen for the distance between them. Thirds and sixths sound sweet and full; octaves and fifths sound open and bare. The last note of a phrase usually meets on an octave.', he: 'במקום שבו הקולות נפגשים, הקשיבו למרחק ביניהם. טרצות וסקסטות נשמעות מתוקות ומלאות; אוקטבות וקווינטות נשמעות פתוחות וחשופות. הצליל האחרון של משפט נפגש בדרך כלל באוקטבה.' }, play: [chord([60, 64], 0.9), chord([60, 69], 0.9), chord([60, 72], 1.2)], show: { text: { en: '3 · 6 · 8', he: '3 · 6 · 8' } } },
      { say: { en: 'Your turn! One voice is given — listen for the other one and write it.', he: 'תורכם! קול אחד נתון — הקשיבו לשני וכתבו אותו.' }, show: { text: { en: '𝄞 + 𝄢', he: '𝄞 + 𝄢' } } },
    ],
  },
  {
    id: 'write-bass',
    area: 'harmony',
    emoji: '🎸',
    title: { en: 'Write the bass', he: 'לכתוב את הבס' },
    takeaway: { en: 'The bass is the floor of the harmony. In root position it plays the chord’s root; in an inversion it moves by step; passing notes fill the gaps.', he: 'הבס הוא הרצפה של ההרמוניה. במצב יסודי הוא מנגן את יסוד האקורד; בהיפוך הוא זז בצעדים; צלילי מעבר ממלאים את הרווחים.' },
    steps: [
      { say: { en: 'Listen to the lowest note under each chord, {name}. That is the bass line.', he: 'הקשיבו לצליל הנמוך ביותר מתחת לכל אקורד, {name}. זה קו הבס.' }, play: [blocks([[48, 64, 67, 72], [53, 65, 69, 72], [55, 62, 67, 71], [48, 64, 67, 72]])], playFirst: true, show: { notes: [48, 53, 55, 48], clef: 'bass', key: 'C', text: { en: 'I  IV  V  I', he: 'I  IV  V  I' } } },
      { say: { en: 'Alone, the bass already tells the story: home, away, tension, home.', he: 'הבס לבדו כבר מספר את הסיפור: בית, יציאה, מתח, בית.' }, play: [notes([48, 53, 55, 48], 0.7)], show: { notes: [48, 53, 55, 48], clef: 'bass', key: 'C' } },
      { say: { en: 'In an inversion the bass takes another chord note, so it can move smoothly by step.', he: 'בהיפוך הבס לוקח צליל אחר של האקורד, וכך הוא יכול לזוז בצעדים חלקים.' }, play: [blocks([[48, 64, 67, 72], [47, 62, 67, 74], [48, 64, 67, 72]])], show: { notes: [48, 47, 48], clef: 'bass', key: 'C', text: { en: 'I  V6  I', he: 'I  V6  I' } } },
      { say: { en: 'Passing notes walk between chord notes: do, re, mi.', he: 'צלילי מעבר הולכים בין צלילי האקורד: דו, רה, מי.' }, play: [notes([48, 50, 52, 53], 0.5)], show: { notes: [48, 50, 52, 53], clef: 'bass', key: 'C' } },
      { say: { en: 'A trick for the bass: hum the lowest note of every chord, quietly, under your breath. Then ask how far each step is from the one before — a step, a fourth up, a fifth down — and write that distance on the staff.', he: 'טריק לבס: זמזמו בשקט את הצליל הנמוך ביותר של כל אקורד. אחר כך שאלו כמה רחוק כל צעד מהקודם — צעד, קוורטה למעלה, קווינטה למטה — וכתבו את המרחק הזה על החמשה.' }, play: [notes([48, 53, 55, 57, 53, 55, 48], 0.5)], show: { notes: [48, 53, 55, 57, 53, 55, 48], clef: 'bass', key: 'C' } },
      { say: { en: 'Your turn! Listen only to the bottom and write it in the bass clef.', he: 'תורכם! הקשיבו רק לתחתית וכתבו אותה במפתח פה.' }, show: { text: { en: '𝄢 ↓', he: '𝄢 ↓' } } },
    ],
  },
  {
    id: 'colour-on-paper',
    area: 'theory',
    emoji: '🎨',
    title: { en: 'Colour chords on paper', he: 'אקורדי צבע בכתב' },
    takeaway: { en: 'Cadential 6/4: the tonic chord over the dominant bass, before V. Neapolitan: a major chord on the lowered 2nd. Augmented sixths: ♭6 and ♯4 pull apart to the dominant.', he: 'קוורטסקסט קדנציאלי: אקורד הטוניקה מעל בס הדומיננטה, לפני V. נפוליטני: אקורד מז׳ורי על הדרגה השנייה המונמכת. סקסטות מוגדלות: ♭6 ו־♯4 נפתחים החוצה אל הדומיננטה.' },
    steps: [
      { say: { en: 'This chord sounds like home, but the bass is already on G. It is the cadential six-four: it leans into V.', he: 'האקורד הזה נשמע כמו הבית, אבל הבס כבר על סול. זה הקוורטסקסט הקדנציאלי: הוא נשען לתוך V.' }, play: [blocks([[43, 60, 64, 67], [43, 59, 62, 67], [36, 60, 64, 67]])], playFirst: true, show: { notes: [55, 60, 64, 67], chord: true, key: 'C', text: { en: 'I 6/4 → V → I', he: 'I 6/4 → V → I' } } },
      { say: { en: 'The Neapolitan: a major chord on the lowered second degree — in C minor, D♭ major.', he: 'הנפוליטני: אקורד מז׳ורי על הדרגה השנייה המונמכת — בדו מינור, רה במול מז׳ור.' }, play: [blocks([[53, 61, 65, 68], [43, 59, 62, 67], [48, 60, 63, 67]])], show: { text: { en: 'D♭ – F – A♭', he: 'רה במול – פה – לה במול' } } },
      { say: { en: 'Augmented sixths: A♭ in the bass, F♯ on top. They move apart, out to the G octave. Italian has three notes, French adds D, German adds E♭.', he: 'סקסטות מוגדלות: לה במול בבס, פה דיאז למעלה. הם נפתחים החוצה, לאוקטבה של סול. האיטלקית בת שלושה צלילים, הצרפתית מוסיפה רה, הגרמנית מוסיפה מי במול.' }, play: [blocks([[44, 60, 63, 66], [43, 59, 62, 67]])], show: { text: { en: 'It: A♭ C F♯ · Fr: A♭ C D F♯ · Ger: A♭ C E♭ F♯', he: 'איטלקית: לה♭ דו פה♯ · צרפתית: + רה · גרמנית: + מי♭' } } },
      { say: { en: 'Any chord can borrow a leading-note seventh: F♯ – A – C – E♭ is vii°7 of V in C.', he: 'כל אקורד יכול לשאול ספטאקורד של צליל מוביל: פה דיאז – לה – דו – מי במול הוא vii°7 של V בדו.' }, play: [blocks([[54, 57, 60, 63], [55, 59, 62, 67]])], show: { text: { en: 'vii°7/V → V', he: 'vii°7/V → V' } } },
      { say: { en: 'Your turn! Read the notes, find the root and the special note, and name the chord.', he: 'תורכם! קראו את התווים, מצאו את היסוד ואת הצליל המיוחד, ותנו לאקורד שם.' }, show: { text: { en: '♭II · +6 · vii°7/V', he: '♭II · +6 · vii°7/V' } } },
    ],
  },
  {
    id: 'write-scale',
    area: 'theory',
    emoji: '🪜',
    title: { en: 'Write the scale', he: 'לכתוב את הסולם' },
    takeaway: { en: 'One letter per step, then fix the accidentals so the tones and semitones fall in the right places. Minor scales raise the 7th (harmonic) or the 6th and 7th going up (melodic).', he: 'אות אחת לכל צעד, ואז מתקנים את סימני ההיתק כך שהטונים וחצאי הטונים ייפלו במקום הנכון. במינור מגביהים את ה־7 (הרמוני) או את ה־6 וה־7 בעלייה (מלודי).' },
    steps: [
      { say: { en: 'A scale uses every letter once: D, E, F, G, A, B, C, D. Never two Fs!', he: 'סולם משתמש בכל אות פעם אחת: רה, מי, פה, סול, לה, סי, דו, רה. אף פעם לא שני פה!' }, play: [notes([62, 64, 65, 67, 69, 71, 72, 74], 0.35)], playFirst: true, show: { text: { en: 'D E F G A B C D', he: 'רה מי פה סול לה סי דו רה' } } },
      { say: { en: 'Then the accidentals: major is tone, tone, semitone, tone, tone, tone, semitone. D major needs F♯ and C♯.', he: 'אחר כך סימני ההיתק: מז׳ור הוא טון, טון, חצי, טון, טון, טון, חצי. רה מז׳ור צריך פה דיאז ודו דיאז.' }, play: [notes([62, 64, 66, 67, 69, 71, 73, 74], 0.35)], show: { notes: [62, 64, 66, 67, 69, 71, 73, 74], clef: 'treble' } },
      { say: { en: 'Harmonic minor raises the 7th: in A minor, G♯. Hear the wide step before the top.', he: 'מינור הרמוני מגביה את ה־7: בלה מינור, סול דיאז. שמעו את הצעד הרחב לפני הטוניקה.' }, play: [notes([57, 59, 60, 62, 64, 65, 68, 69], 0.35)], show: { notes: [57, 59, 60, 62, 64, 65, 68, 69], clef: 'treble' } },
      { say: { en: 'Melodic minor raises the 6th and 7th going up, and comes down natural.', he: 'מינור מלודי מגביה את ה־6 וה־7 בעלייה, ויורד טבעי.' }, play: [notes([57, 59, 60, 62, 64, 66, 68, 69, 67, 65, 64, 62, 60, 59, 57], 0.28)], show: { text: { en: '↑ F♯ G♯ · ↓ G F', he: '↑ פה♯ סול♯ · ↓ סול פה' } } },
      { say: { en: 'Modes start the same white notes from a different place. D to D on the white keys is Dorian; from another tonic, keep the same pattern of tones and semitones and add the accidentals it needs.', he: 'מודוסים מתחילים את אותם קלידים לבנים ממקום אחר. מרה עד רה על הלבנים זה דורי; מטוניקה אחרת, שומרים על אותה תבנית של טונים וחצאי טונים ומוסיפים את סימני ההיתק הדרושים.' }, play: [notes([62, 64, 65, 67, 69, 71, 72, 74], 0.33)], show: { notes: [62, 64, 65, 67, 69, 71, 72, 74], clef: 'treble' } },
      { say: { en: 'Your turn! Write the scale with accidentals — there is no key signature to help.', he: 'תורכם! כתבו את הסולם עם סימני היתק — אין ארמטורה שתעזור.' }, show: { text: { en: '♯ ♭ ♮', he: '♯ ♭ ♮' } } },
    ],
  },
  {
    id: 'four-parts',
    area: 'theory',
    emoji: '🎻',
    title: { en: 'Four-part harmony', he: 'הרמוניה בארבעה קולות' },
    takeaway: { en: 'Figures name the intervals above the bass: 5/3 root position, 6 first inversion, 6/4 second. In four parts: double the root, keep upper voices within an octave, avoid parallel fifths and octaves, resolve the 7th down.', he: 'הספרות מציינות את המרווחים מעל הבס: 5/3 מצב יסודי, 6 היפוך ראשון, 6/4 היפוך שני. בארבעה קולות: מכפילים את היסוד, שומרים את הקולות העליונים בטווח אוקטבה, נמנעים מקווינטות ואוקטבות מקבילות, ופותרים את הספטימה למטה.' },
    steps: [
      { say: { en: 'Soprano, alto, tenor and bass: four voices, one chord. Here is C major with the root doubled.', he: 'סופרן, אלט, טנור ובס: ארבעה קולות, אקורד אחד. הנה דו מז׳ור עם יסוד מוכפל.' }, play: [chord([48, 55, 64, 72], 1.6)], playFirst: true, show: { notes: [48, 55, 64, 72], chord: true, key: 'C' } },
      { say: { en: 'Figures under the bass tell you the chord. E with a 6 means a sixth above E — that is C major, first inversion.', he: 'הספרות מתחת לבס אומרות מה האקורד. מי עם 6 פירושו סקסטה מעל מי — זה דו מז׳ור בהיפוך ראשון.' }, play: [chord([52, 55, 60, 67], 1.6)], show: { notes: [52, 55, 60, 67], chord: true, key: 'C', text: { en: 'E · 6 = C/E', he: 'מי · 6 = דו/מי' } } },
      { say: { en: 'Two voices moving in parallel fifths sound hollow — the rule says avoid it. Listen.', he: 'שני קולות שנעים בקווינטות מקבילות נשמעים חלולים — הכלל אומר להימנע מזה. הקשיבו.' }, play: [blocks([[53, 60, 65, 69], [55, 62, 67, 71]], 1)], show: { text: { en: 'F→G, C→D: parallel fifths', he: 'פה←סול, דו←רה: קווינטות מקבילות' } } },
      { say: { en: 'In V7 to I the seventh falls by step and the leading note rises to the tonic.', he: 'ב־V7 ל־I הספטימה יורדת בצעד והצליל המוביל עולה לטוניקה.' }, play: [blocks([[43, 59, 65, 74], [48, 60, 64, 72]], 1.1)], show: { text: { en: 'F → E · B → C', he: 'פה ← מי · סי ← דו' } } },
      { say: { en: 'Keep the upper three voices close: no more than an octave between soprano and alto, or alto and tenor. The bass may sit further away, down below.', he: 'שמרו על שלושת הקולות העליונים קרובים: לא יותר מאוקטבה בין סופרן לאלט, או בין אלט לטנור. הבס יכול לשבת רחוק יותר, למטה.' }, play: [chord([43, 59, 62, 67], 1.4)], show: { notes: [43, 59, 62, 67], chord: true, key: 'C' } },
      { say: { en: 'Your turn! Read the figures, fill in the inner voices, and check the rules.', he: 'תורכם! קראו את הספרות, השלימו את הקולות הפנימיים, ובדקו את הכללים.' }, show: { text: { en: 'S A T B', he: 'ס א ט ב' } } },
    ],
  },
  {
    id: 'counterpoint',
    area: 'theory',
    emoji: '⚖️',
    title: { en: 'Species counterpoint', he: 'קונטרפונקט לפי סוגים' },
    takeaway: { en: 'A new line against a cantus: consonances on strong beats, dissonance only as a passing note or a prepared suspension that resolves down, and never parallel fifths or octaves.', he: 'קו חדש מול קנטוס פירמוס: קונסוננסים בפעמות החזקות, דיסוננס רק כצליל מעבר או כהשהיה מוכנה שנפתרת למטה, ואף פעם לא קווינטות או אוקטבות מקבילות.' },
    steps: [
      { say: { en: 'A slow given tune, the cantus, and a new line above it. Note against note: that is first species.', he: 'מנגינה איטית נתונה, הקנטוס פירמוס, וקו חדש מעליה. תו מול תו: זה הסוג הראשון.' }, play: [voices([{ midis: [60, 62, 64, 62, 60], beats: [2, 2, 2, 2, 4] }, { midis: [67, 65, 67, 71, 72], beats: [2, 2, 2, 2, 4] }], 90)], playFirst: true, show: { notes: [67, 65, 67, 71, 72], key: 'C', text: { en: '1 : 1', he: '1 : 1' } } },
      { say: { en: 'Thirds and sixths are sweet, fifths and octaves are open. A second or a seventh clashes.', he: 'טרצות וסקסטות מתוקות, קווינטות ואוקטבות פתוחות. סקונדה או ספטימה מתנגשות.' }, play: [chord([60, 64], 0.9), chord([60, 69], 0.9), chord([60, 67], 0.9), chord([60, 71], 0.9)], show: { text: { en: '3 · 6 · 5 · 7 ✗', he: '3 · 6 · 5 · 7 ✗' } } },
      { say: { en: 'Second species: two notes against one. The weak note may clash only as a passing note, walking by step.', he: 'סוג שני: שני תווים מול אחד. התו החלש יכול להתנגש רק כצליל מעבר, שהולך בצעדים.' }, play: [voices([{ midis: [60, 62, 60], beats: [2, 2, 4] }, { midis: [67, 65, 64, 62, 64], beats: [1, 1, 1, 1, 4] }], 90)], show: { text: { en: '2 : 1', he: '2 : 1' } } },
      { say: { en: 'Fourth species: a note is held over the bar and clashes, then steps down to resolve. That is a suspension.', he: 'סוג רביעי: תו מוחזק מעבר לקו התיבה ומתנגש, ואז יורד בצעד ונפתר. זו השהיה.' }, play: [voices([{ midis: [62, 60], beats: [2, 2] }, { midis: [71, 69], beats: [3, 1] }], 70)], show: { text: { en: '7 → 6', he: '7 → 6' } } },
      { say: { en: 'Each line should also sing well on its own: mostly steps, a few leaps, and after a big leap a step back the other way.', he: 'כל קו צריך גם לשיר יפה בפני עצמו: בעיקר צעדים, מעט קפיצות, ואחרי קפיצה גדולה צעד חזרה לכיוון השני.' }, play: [notes([67, 72, 71, 69, 67], 0.5)], show: { notes: [67, 72, 71, 69, 67], key: 'C', clef: 'treble' } },
      { say: { en: 'Your turn! Read both lines and find what breaks the rules — or say it is correct.', he: 'תורכם! קראו את שני הקווים ומצאו מה שובר את הכללים — או אמרו שהכול תקין.' }, show: { text: { en: '✓ or ✗ ?', he: '✓ או ✗ ?' } } },
    ],
  },
  {
    id: 'ornaments-paper',
    area: 'theory',
    emoji: '🌀',
    title: { en: 'Ornaments', he: 'קישוטים' },
    takeaway: { en: 'Trill: fast alternation with the note above. Mordent: note, the one below, note. Upper mordent: note, the one above, note. Turn: above, note, below, note. Appoggiatura: a leaning note on the beat that resolves.', he: 'טריל: החלפה מהירה עם הצליל שמעל. מורדנט: הצליל, הצליל שמתחת, הצליל. מורדנט עליון: הצליל, הצליל שמעל, הצליל. גרופטו: מעל, הצליל, מתחת, הצליל. אפוג׳יאטורה: צליל נשען על הפעמה שנפתר.' },
    steps: [
      { say: { en: 'A trill shakes quickly between a note and the one above it.', he: 'טריל מתנדנד מהר בין צליל לצליל שמעליו.' }, play: [melody([74, 72, 74, 72, 74, 72, 74, 72, 72], [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1], 72)], playFirst: true, show: { text: { en: 'tr', he: 'tr' } } },
      { say: { en: 'A mordent is quick: the note, the one below, and back. The upper mordent goes above instead.', he: 'מורדנט הוא מהיר: הצליל, הצליל שמתחת, וחזרה. המורדנט העליון הולך למעלה במקום.' }, play: [melody([72, 71, 72], [0.25, 0.25, 1.5], 72), rest(0.3), melody([72, 74, 72], [0.25, 0.25, 1.5], 72)], show: { text: { en: 'C B C · C D C', he: 'דו סי דו · דו רה דו' } } },
      { say: { en: 'A turn circles the note: above, the note, below, the note.', he: 'גרופטו מקיף את הצליל: מעל, הצליל, מתחת, הצליל.' }, play: [melody([74, 72, 71, 72], [0.5, 0.5, 0.5, 1.5], 72)], show: { notes: [74, 72, 71, 72], key: 'C', clef: 'treble' } },
      { say: { en: 'An appoggiatura leans on the beat — a sigh — and then resolves to the real note.', he: 'אפוג׳יאטורה נשענת על הפעמה — כמו אנחה — ואז נפתרת לצליל האמיתי.' }, play: [melody([74, 72], [1, 1.5], 66)], show: { notes: [74, 72], key: 'C', clef: 'treble' } },
      { say: { en: 'On paper an ornament is often just a small sign above the note. Players read the sign and add the extra notes themselves, in the style of the music.', he: 'בכתב קישוט הוא לעיתים קרובות רק סימן קטן מעל התו. הנגנים קוראים את הסימן ומוסיפים את הצלילים בעצמם, לפי סגנון המוזיקה.' }, play: [melody([72, 74, 72, 71, 72], [0.5, 0.5, 0.5, 0.5, 2], 72)], show: { notes: [72, 74, 72, 71, 72], key: 'C', clef: 'treble' } },
      { say: { en: 'Your turn! Look at the notes written out, count how many there are, and name the ornament.', he: 'תורכם! הסתכלו על התווים הכתובים, ספרו כמה יש, ותנו שם לקישוט.' }, show: { text: { en: 'tr · ∿ · ∽', he: 'tr · ∿ · ∽' } } },
    ],
  },
];

/** Unit id ("topic:<id>") → mini-lesson id. */
export const UNITS: Record<string, string> = {
  'topic:staff-dictation': 'write-melody',
  'topic:rhythm-build': 'build-rhythm',
  'topic:two-part': 'two-voices',
  'topic:bass-dictation': 'write-bass',
  'topic:chromatic-theory': 'colour-on-paper',
  'topic:scale-spelling': 'write-scale',
  'topic:figured-bass': 'four-parts',
  'topic:counterpoint': 'counterpoint',
  'topic:ornaments': 'ornaments-paper',
};

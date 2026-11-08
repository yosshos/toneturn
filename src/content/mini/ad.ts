// Quick lessons for the spec-AD units: moving rhythms, chord tones, meter, expression, more harmony,
// transformations, written terms, finding home and scales, texture. Plain words, sound first.

import type { NoteEvent, Stimulus } from '../../engine/lesson';
import type { MiniLesson } from '../miniTypes';

const notes = (midis: number[], each = 0.45, velocity?: number): Stimulus =>
  velocity === undefined ? { kind: 'notes', midis, each } : { kind: 'events', events: midis.map((m, i) => ({ midi: m, start: i * each, duration: each * 0.95, velocity })), length: midis.length * each + 0.2 };
const chord = (midis: number[], duration = 1.3, arpeggio?: boolean): Stimulus => ({ kind: 'chord', midis, duration, ...(arpeggio ? { arpeggio } : {}) });
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const C = { letter: 'C' as const, acc: 0 as const };
/** Hits on a sixteenth grid over clicks on every beat (one 4/4 bar per `bars`). */
function grid(on: number[], bars = 2, step = 0.15): Stimulus {
  const ev: NoteEvent[] = [];
  for (let b = 0; b < bars; b++) {
    for (let k = 0; k < 4; k++) ev.push({ midi: 76, start: (b * 16 + k * 4) * step, duration: 0.04, velocity: k === 0 ? 0.55 : 0.3, perc: k === 0 ? 'accent' : 'click' });
    for (const o of on) ev.push({ midi: 64, start: (b * 16 + o) * step, duration: step * 1.6, velocity: 0.8 });
  }
  return { kind: 'events', events: ev, length: bars * 16 * step + 0.2 };
}
/** Oom-pah in `beats` per bar: low note on 1, chord on the others. */
function meter(beats: number, bars = 3, beat = 0.5): Stimulus {
  const ev: NoteEvent[] = [];
  for (let b = 0; b < bars; b++)
    for (let k = 0; k < beats; k++) {
      const t = (b * beats + k) * beat;
      if (k === 0) ev.push({ midi: 48, start: t, duration: beat * 0.9, velocity: 0.9 });
      else ev.push({ midi: 64, start: t, duration: beat * 0.5, velocity: 0.4 }, { midi: 67, start: t, duration: beat * 0.5, velocity: 0.4 });
    }
  return { kind: 'events', events: ev, length: bars * beats * beat + 0.2 };
}
const phrase = (romans: number[][]): Stimulus => {
  const ev: NoteEvent[] = [];
  romans.forEach((c, i) => c.forEach((m) => ev.push({ midi: m, start: i * 0.75, duration: i === romans.length - 1 ? 1.3 : 0.7, velocity: 0.5 })));
  return { kind: 'events', events: ev, length: romans.length * 0.75 + 0.8 };
};
const I: [number, number, number] = [48, 64, 67];
const IV: [number, number, number] = [53, 65, 69];
const V: [number, number, number] = [55, 62, 67];
const vi: [number, number, number] = [57, 64, 69];
// Full four-voice chords in C (bass + three upper voices) for the in-depth sections.
const I4 = [48, 64, 67, 72]; // C E G C
const ii4 = [50, 62, 65, 69]; // D D F A
const IV4 = [53, 65, 69, 72]; // F F A C
const V4 = [55, 62, 67, 71]; // G D G B
const vi4 = [57, 64, 69, 72]; // A E A C
const D7 = [50, 60, 66, 69]; // D C F# A — V7 of G
const G4 = [43, 59, 67, 74]; // G B G D (C→B, F#→G)
/** Notes with their own velocities (`len` = sounding fraction of each slot: 0.25 staccato, 1 legato). */
const shaped = (midis: number[], vels: number[], each = 0.32, len = 0.95): Stimulus => ({
  kind: 'events',
  events: midis.map((m, i) => ({ midi: m, start: i * each, duration: each * len, velocity: vels[i] })),
  length: midis.length * each + 0.2,
});
/** Compound 6/8: a low note on 1 and (lighter) on 4, soft chords on the other eighths. */
function six(bars = 2, eighth = 0.25): Stimulus {
  const ev: NoteEvent[] = [];
  for (let b = 0; b < bars; b++)
    for (let k = 0; k < 6; k++) {
      const t = (b * 6 + k) * eighth;
      if (k % 3 === 0) ev.push({ midi: k ? 43 : 48, start: t, duration: eighth * 0.9, velocity: k ? 0.7 : 0.9 });
      else ev.push({ midi: 64, start: t, duration: eighth * 0.6, velocity: 0.35 }, { midi: 67, start: t, duration: eighth * 0.6, velocity: 0.35 });
    }
  return { kind: 'events', events: ev, length: bars * 6 * eighth + 0.2 };
}

export const LESSONS: MiniLesson[] = [
  {
    id: 'rhythm-shift',
    area: 'rhythm',
    emoji: '↪️',
    title: { en: 'Move the rhythm', he: 'להזיז את המקצב' },
    takeaway: { en: 'The same rhythm can start on a different beat of the bar. Moving it (displacement) changes how it feels, even though the pattern is identical.', he: 'אותו מקצב יכול להתחיל בפעמה אחרת בתיבה. ההזזה (הסטה) משנה את התחושה, למרות שהתבנית זהה.' },
    steps: [
      {
        say: { en: 'Hi {name}! This is the Charleston: a long note, then a quick one, on the first beats of the bar. Count one, two, three, four with the clicks.', he: 'היי {name}! זה הצ׳רלסטון: צליל ארוך ואחריו צליל מהיר, בפעמות הראשונות של התיבה. ספרו אחת, שתיים, שלוש, ארבע עם הקליקים.' },
        play: [grid([0, 6])],
        show: { text: { en: '●··· ··●· ···· ····', he: '●··· ··●· ···· ····' } },
      },
      {
        say: { en: 'Now the very same pattern starts one beat later, on beat two. Nothing else changed — but it suddenly feels pushed and jazzy.', he: 'עכשיו אותה תבנית בדיוק מתחילה פעמה אחת מאוחר יותר, בפעמה שתיים. שום דבר אחר לא השתנה — אבל פתאום זה מרגיש דחוף וג׳אזי.' },
        play: [grid([4, 10])],
        show: { text: { en: '···· ●··· ··●· ····', he: '···· ●··· ··●· ····' } },
      },
      {
        say: { en: 'Musicians call this displacement: moving a rhythm in time, the way transposing moves a melody in pitch. You can move it by a beat, or by just half a beat.', he: 'מוזיקאים קוראים לזה הסטה: להזיז מקצב בזמן, כמו שטרנספוזיציה מזיזה מנגינה בגובה. אפשר להזיז בפעמה שלמה, או רק בחצי פעמה.' },
        play: [grid([0, 6]), rest(0.4), grid([2, 8])],
        show: { text: { en: 'moved by ½ beat', he: 'הוזז בחצי פעמה' } },
      },
      {
        say: { en: 'A trick: keep counting the beat out loud, and say "now" where the pattern starts. The count stays put; only the pattern slides along it.', he: 'טריק: המשיכו לספור את הפעמה בקול, ותגידו "עכשיו" במקום שבו התבנית מתחילה. הספירה נשארת במקום; רק התבנית מחליקה לאורכה.' },
        play: [grid([4, 10], 2, 0.18)],
        show: { text: { en: '1 2 3 4 — "now" on 2', he: '1 2 3 4 — "עכשיו" על 2' } },
      },
      {
        say: { en: 'Your turn! Hear how far a pattern moved, pick the moved one on paper, then tap it yourself starting on beat two.', he: 'תורכם! שמעו כמה התבנית זזה, בחרו את הגרסה המוסטת בכתב, ואז הקישו אותה בעצמכם מהפעמה השנייה.' },
        show: { text: { en: '↪ 1 beat', he: '↪ פעמה אחת' } },
      },
    ],
    more: [
      {
        say: { en: 'Rhythmic displacement moves a whole pattern to a new place in the bar. Every note length and every gap stays the same; only its position against the beat changes. Here is the Charleston from beat one, then the same figure from beat three.', he: 'הסטה מקצבית מזיזה תבנית שלמה למקום אחר בתיבה. כל אורך צליל וכל רווח נשארים כמו שהם; משתנה רק המיקום שלה ביחס לפעמה. הנה הצ׳רלסטון מפעמה אחת, ואז אותה דמות מפעמה שלוש.' },
        play: [grid([0, 6], 1), rest(0.3), grid([8, 14], 1)],
        show: { text: { en: '●··· ··●· ···· ···· → ···· ···· ●··· ··●·', he: '●··· ··●· ···· ···· → ···· ···· ●··· ··●·' } },
      },
      {
        say: { en: 'Why it feels different: in 4/4, beat one is the strongest, beat three next, two and four weaker, and the "and"s between the beats weaker still. A note on a weak spot pulls against the beat — that pull is syncopation. Listen: hits on one and three, then on the "and"s after them.', he: 'למה זה מרגיש אחרת: ב־4/4 פעמה אחת היא החזקה ביותר, אחריה פעמה שלוש, שתיים וארבע חלשות יותר, וה״וְ״ שבין הפעמות חלשים עוד יותר. צליל במקום חלש מושך נגד הפעמה — המשיכה הזאת היא סינקופה. הקשיבו: מכות על אחת ושלוש, ואז על ה״וְ״ שאחריהן.' },
        play: [grid([0, 8], 1), rest(0.3), grid([2, 10], 1)],
        show: { text: { en: '1 · 3 → 1& · 3&', he: '1 · 3 → 1& · 3&' } },
      },
      {
        say: { en: 'A shift of half a beat is the most dramatic: every note leaves the beat and lands on an "and". The shape is identical, but now it floats between the clicks.', he: 'הסטה של חצי פעמה היא הדרמטית ביותר: כל צליל עוזב את הפעמה ונוחת על ״וְ״. הצורה זהה, אבל עכשיו היא מרחפת בין הקליקים.' },
        play: [grid([0, 4, 8, 12], 1), rest(0.3), grid([2, 6, 10, 14], 1)],
        show: { text: { en: '1 2 3 4 → & & & &', he: '1 2 3 4 → & & & &' } },
      },
      {
        say: { en: 'To hear a displacement, keep counting and ask two questions. Does the first note land on a number or on an "and"? Which number is nearest? This Charleston starts on the "and" of two: it moved by a beat and a half.', he: 'כדי לשמוע הסטה, המשיכו לספור ושאלו שתי שאלות. הצליל הראשון נוחת על מספר או על ״וְ״? איזה מספר הכי קרוב? הצ׳רלסטון הזה מתחיל ב״וְ״ של שתיים: הוא זז בפעמה וחצי.' },
        play: [grid([6, 12])],
        show: { text: { en: '2& · 4', he: '2& · 4' } },
      },
      {
        say: { en: 'To play it, fix your foot on the beat first. Clap the pattern from beat one, then from two, then from the "and" of one, without letting the foot move. Start slowly; the foot is your anchor.', he: 'כדי לנגן את זה, קבעו קודם את הרגל על הפעמה. מחאו את התבנית מפעמה אחת, אחר כך משתיים, ואז מה״וְ״ של אחת — בלי לתת לרגל לזוז. התחילו לאט; הרגל היא העוגן שלכם.' },
        play: [grid([2, 8], 2, 0.18)],
        show: { text: { en: 'from 1& · foot on 1 2 3 4', he: 'מ־1& · רגל על 1 2 3 4' } },
      },
      {
        say: { en: 'The common mistake: when a pattern is shifted, the ear quietly moves beat one to its first note, and the shift disappears. If a displaced pattern suddenly sounds normal, check your count against the accented click — that is still beat one.', he: 'הטעות הנפוצה: כשתבנית מוסטת, האוזן מזיזה בשקט את פעמה אחת אל הצליל הראשון שלה, וההסטה נעלמת. אם תבנית מוסטת פתאום נשמעת רגילה, בדקו את הספירה מול הקליק המודגש — הוא עדיין פעמה אחת.' },
      },
      {
        say: { en: 'In real music displacement is everywhere. Jazz pianists comp with the Charleston and shifted copies of it, so the chords never fall in the same place twice. Rock and funk riffs often start on the "and" of four, just before the bar line, which makes them push forward.', he: 'במוזיקה אמיתית הסטה נמצאת בכל מקום. פסנתרני ג׳אז מלווים בצ׳רלסטון ובעותקים מוסטים שלו, כך שהאקורדים אף פעם לא נופלים פעמיים באותו מקום. ריפים של רוק ופאנק מתחילים הרבה פעמים ב״וְ״ של ארבע, רגע לפני קו התיבה, וזה נותן להם דחיפה קדימה.' },
      },
      {
        say: { en: 'To keep: displacement changes where a rhythm sits, not what it is. Hold the beat still, locate the first note against it, and every shift becomes easy to hear and to play.', he: 'מה לזכור: הסטה משנה איפה המקצב יושב, לא מה הוא. החזיקו את הפעמה במקום, מצאו את הצליל הראשון ביחס אליה, וכל הסטה תהיה קלה לשמיעה ולנגינה.' },
      },
    ],
  },
  {
    id: 'chord-tones',
    area: 'voice',
    emoji: '🎶',
    title: { en: 'Sing inside the chord', he: 'לשיר בתוך האקורד' },
    takeaway: { en: 'A chord is three notes stacked: root at the bottom, third in the middle, fifth on top. Singing each one trains your ear to hear inside harmony.', he: 'אקורד הוא שלושה צלילים זה על זה: שורש למטה, טרצה באמצע, קווינטה למעלה. לשיר כל אחד מהם מאמן את האוזן לשמוע לתוך ההרמוניה.' },
    steps: [
      {
        say: { en: 'Hey {name}! A chord sounds like one thing, but it is really three notes together. Listen: first all together, then one by one.', he: 'היי {name}! אקורד נשמע כמו דבר אחד, אבל הוא בעצם שלושה צלילים ביחד. הקשיבו: קודם כולם יחד, ואז אחד־אחד.' },
        play: [chord([48, 52, 55]), rest(0.3), chord([48, 52, 55], 1.4, true)],
        show: { notes: [48, 52, 55], chord: true },
      },
      {
        say: { en: 'The bottom note is the root — it names the chord. The middle one is the third. The top one is the fifth.', he: 'הצליל התחתון הוא השורש — הוא נותן לאקורד את השם. האמצעי הוא הטרצה. העליון הוא הקווינטה.' },
        play: [notes([48], 0.8), notes([52], 0.8), notes([55], 0.8)],
        show: { text: { en: 'root · third · fifth', he: 'שורש · טרצה · קווינטה' } },
      },
      {
        say: { en: 'The third decides the mood. In a minor chord the middle note sits a little lower, and the whole chord turns darker.', he: 'הטרצה קובעת את מצב הרוח. באקורד מינורי הצליל האמצעי יושב קצת נמוך יותר, וכל האקורד נעשה כהה יותר.' },
        play: [chord([57, 61, 64], 1.2, true), rest(0.3), chord([57, 60, 64], 1.2, true)],
        show: { text: { en: 'major · minor', he: 'מז׳ור · מינור' } },
      },
      {
        say: { en: 'Melodies love to end on home. When a tune stops one step early, you can feel which note it is missing. Sing it in your head now.', he: 'מנגינות אוהבות להיגמר בבית. כשמנגינה נעצרת צעד אחד לפני הסוף, מרגישים איזה צליל חסר. שירו אותו עכשיו בראש.' },
        play: [notes([60, 62, 64, 65, 67, 65, 64, 62], 0.38), rest(1), notes([60], 1)],
        show: { text: { en: '… → 1', he: '… ← 1' } },
      },
      {
        say: { en: 'Your turn! Hear a chord and sing the note I ask for — bottom, middle or top. Then finish a tune by singing its last note.', he: 'תורכם! שמעו אקורד ושירו את הצליל שאבקש — תחתון, אמצעי או עליון. אחר כך סיימו מנגינה כשאתם שרים את הצליל האחרון שלה.' },
        show: { text: { en: '1 · 3 · 5', he: '1 · 3 · 5' } },
      },
    ],
    more: [
      {
        say: { en: 'A triad is two thirds stacked. In C major: C, E and G. From the root up to the third is a major third, four half steps; from the third up to the fifth is a minor third, three half steps. Together they span a perfect fifth, seven half steps.', he: 'משולש (טריאדה) הוא שתי טרצות זו על זו. בדו מז׳ור: דו, מי וסול. מהשורש עד הטרצה יש טרצה גדולה, ארבעה חצאי טונים; מהטרצה עד הקווינטה טרצה קטנה, שלושה חצאי טונים. יחד הן פורשות קווינטה זכה, שבעה חצאי טונים.' },
        play: [chord([48, 52, 55], 1.3, true), chord([48, 52, 55], 1.2)],
        show: { notes: [48, 52, 55], chord: true, clef: 'bass', text: { en: 'C E G · 4 + 3', he: 'C E G · 4 + 3' } },
      },
      {
        say: { en: 'Swap the order of the thirds and you get a minor triad: C, E-flat, G. The root and fifth stay; only the third drops a half step. That single note turns bright into dark.', he: 'הופכים את סדר הטרצות ומקבלים משולש מינורי: דו, מי במול, סול. השורש והקווינטה נשארים; רק הטרצה יורדת בחצי טון. הצליל האחד הזה הופך מואר לכהה.' },
        play: [chord([48, 52, 55], 1.2), rest(0.3), chord([48, 51, 55], 1.2)],
        show: { text: { en: 'C E G · C E♭ G', he: 'C E G · C E♭ G' } },
      },
      {
        say: { en: 'The root is not always at the bottom. E, G, C is still a C major chord, only inverted. So musicians name chord tones by their job, not their height: the root names the chord, the third makes it major or minor, the fifth adds body.', he: 'השורש לא תמיד למטה. מי, סול, דו הוא עדיין אקורד דו מז׳ור, רק בהיפוך. לכן מוזיקאים קוראים לצלילי האקורד לפי התפקיד שלהם, לא לפי הגובה: השורש נותן את השם, הטרצה קובעת מז׳ור או מינור, הקווינטה מוסיפה גוף.' },
        play: [chord([52, 55, 60], 1.3, true), chord([52, 55, 60], 1.2)],
        show: { notes: [52, 55, 60], chord: true, text: { en: 'E G C = C', he: 'E G C = C' } },
      },
      {
        say: { en: 'To hear inside a chord, start at the edges. The bass is easiest: hum it first. The top note is the brightest: hum it next. The middle hides between them, so find it by singing up from the bass: one, three, five.', he: 'כדי לשמוע לתוך אקורד, התחילו מהקצוות. הבס הכי קל: זמזמו אותו קודם. הצליל העליון הכי בהיר: זמזמו אותו אחריו. האמצעי מתחבא ביניהם, אז מצאו אותו כשאתם שרים למעלה מהבס: 1, 3, 5.' },
        play: [chord([48, 52, 55], 1.5), rest(0.3), notes([48, 52, 55], 0.6)],
        show: { text: { en: 'bass → top → middle', he: 'בס ← עליון ← אמצעי' } },
      },
      {
        say: { en: 'A daily drill: hold a chord and sing one, three, five, three, one slowly over it. Then sustain a single tone and listen for blend. When you are exactly in tune, your voice melts into the chord and the wobble stops.', he: 'תרגיל יומי: החזיקו אקורד ושירו מעליו לאט 1, 3, 5, 3, 1. אחר כך החזיקו צליל אחד והקשיבו להתמזגות. כשאתם מדויקים לגמרי, הקול נמס לתוך האקורד והרעד נעלם.' },
        play: [notes([60, 64, 67, 64, 60], 0.55)],
        show: { notes: [60, 64, 67, 64, 60], text: { en: '1 3 5 3 1', he: '1 3 5 3 1' } },
      },
      {
        say: { en: 'The usual slip: asked for the third or the fifth, the voice drifts to the root, because the root pulls hardest. Check by singing up from the root and stopping on the note you want. Singing it an octave lower or higher is fine; it is the same note.', he: 'הטעות הרגילה: כשמבקשים את הטרצה או את הקווינטה, הקול נסחף אל השורש, כי השורש מושך הכי חזק. בדקו כשאתם שרים למעלה מהשורש ועוצרים על הצליל הרצוי. לשיר אותו אוקטבה למטה או למעלה זה בסדר; זה אותו צליל.' },
      },
      {
        say: { en: 'In real music, backing vocals mostly sing chord tones, often a third below the lead. Bass lines lean on root and fifth, like the oom-pah of a march or the boom-chick of country. Here a lead line with a harmony a third below.', he: 'במוזיקה אמיתית, קולות ליווי שרים בעיקר צלילי אקורד, הרבה פעמים טרצה מתחת לקול הראשי. קווי בס נשענים על השורש והקווינטה, כמו האום־פה של מארש או הבום־צ׳יק של קאנטרי. הנה קו ראשי עם הרמוניה טרצה מתחתיו.' },
        play: [chord([60, 64], 0.5), chord([62, 65], 0.5), chord([64, 67], 1.1)],
        show: { text: { en: 'E F G / C D E', he: 'E F G / C D E' } },
      },
      {
        say: { en: 'To keep: a triad is root, third and fifth. The root names it, the third sets major or minor, the fifth gives stability. Listen for the bass first, then the top, then the middle.', he: 'מה לזכור: משולש הוא שורש, טרצה וקווינטה. השורש נותן את השם, הטרצה קובעת מז׳ור או מינור, הקווינטה נותנת יציבות. הקשיבו קודם לבס, אחר כך לעליון, ואז לאמצעי.' },
      },
    ],
  },
  {
    id: 'meter',
    area: 'rhythm',
    emoji: '💃',
    title: { en: 'In 2, 3 or 4?', he: 'בשתיים, שלוש או ארבע?' },
    takeaway: { en: 'Beats come in groups: twos (a march), threes (a waltz) or fours (most pop). The first beat of each group is the strongest — that is beat 1.', he: 'פעמות באות בקבוצות: שתיים (מארש), שלוש (ואלס) או ארבע (רוב הפופ). הפעמה הראשונה בכל קבוצה היא החזקה — זו פעמה 1.' },
    steps: [
      {
        say: { en: 'Hi {name}! Beats like to travel in groups, and the first beat of each group is a little stronger. That grouping is called the meter.', he: 'היי {name}! פעמות אוהבות לנוע בקבוצות, והפעמה הראשונה בכל קבוצה קצת חזקה יותר. הקיבוץ הזה נקרא משקל.' },
        play: [meter(4, 2)],
        show: { text: { en: '1 2 3 4 · 1 2 3 4', he: '1 2 3 4 · 1 2 3 4' } },
      },
      {
        say: { en: 'A march goes in two: left, right, left, right. Strong, weak, strong, weak.', he: 'מארש הולך בשתיים: שמאל, ימין, שמאל, ימין. חזק, חלש, חזק, חלש.' },
        play: [meter(2, 4)],
        show: { text: { en: '1 2 · 1 2', he: '1 2 · 1 2' } },
      },
      {
        say: { en: 'A waltz goes in three: one, two, three — one, two, three. It sways and turns instead of marching.', he: 'ואלס הולך בשלוש: אחת, שתיים, שלוש — אחת, שתיים, שלוש. הוא מתנדנד ומסתובב במקום לצעוד.' },
        play: [meter(3, 4)],
        show: { text: { en: '1 2 3 · 1 2 3', he: '1 2 3 · 1 2 3' } },
      },
      {
        say: { en: 'To find beat one, listen for the low note and the strongest pulse. Music can start in the middle of a bar, so do not trust the first note.', he: 'כדי למצוא את פעמה אחת, הקשיבו לצליל הנמוך ולדופק החזק ביותר. מוזיקה יכולה להתחיל באמצע תיבה, אז אל תסמכו על הצליל הראשון.' },
        play: [meter(4, 2, 0.45)],
        show: { text: { en: 'find the 1', he: 'מצאו את ה־1' } },
      },
      {
        say: { en: 'Your turn! Is it a march or a waltz, in two, three or four? Then find where beat one is hiding.', he: 'תורכם! זה מארש או ואלס, בשתיים, שלוש או ארבע? אחר כך מצאו איפה מסתתרת פעמה אחת.' },
        show: { text: { en: '2 · 3 · 4', he: '2 · 3 · 4' } },
      },
    ],
    more: [
      {
        say: { en: 'Meter is the regular pattern of strong and weak beats. Each group is a bar, and the time signature names it: 2/4 has two beats, 3/4 three, 4/4 four. In these simple meters every beat divides into two.', he: 'משקל הוא הדפוס הקבוע של פעמות חזקות וחלשות. כל קבוצה היא תיבה, וסימן המשקל נותן לה שם: ב־2/4 שתי פעמות, ב־3/4 שלוש, ב־4/4 ארבע. במשקלים הפשוטים האלה כל פעמה מתחלקת לשתיים.' },
        play: [meter(3, 3)],
        show: { text: { en: '2/4 · 3/4 · 4/4', he: '2/4 · 3/4 · 4/4' } },
      },
      {
        say: { en: '4/4 has a second, lighter accent on beat three: strong, weak, medium, weak. That is why a slow four can sound like a two. The test is the bass and the chord changes: do they come every four beats, or every two?', he: 'ב־4/4 יש הדגשה שנייה, קלה יותר, על פעמה שלוש: חזק, חלש, בינוני, חלש. לכן ארבע איטי יכול להישמע כמו שתיים. המבחן הוא הבס וחילופי האקורדים: הם מגיעים כל ארבע פעמות, או כל שתיים?' },
        play: [meter(4, 2), rest(0.3), meter(2, 4)],
        show: { text: { en: '1 2 3 4 · 1 2 1 2', he: '1 2 3 4 · 1 2 1 2' } },
      },
      {
        say: { en: '6/8 is a compound meter: six eighth notes felt as two beats, each split into three — ONE two three, FOUR five six. It rocks gently. 3/4 fills the same bar with three beats, each split into two.', he: '6/8 הוא משקל מורכב: שש שמיניות שמרגישים כשתי פעמות, וכל אחת מתחלקת לשלוש — אחת שתיים שלוש, ארבע חמש שש. הוא מתנדנד בעדינות. 3/4 ממלא את אותה תיבה בשלוש פעמות, וכל אחת מתחלקת לשתיים.' },
        play: [six(2), rest(0.3), meter(3, 2)],
        show: { text: { en: '6/8: 1 2 3 4 5 6 · 3/4: 1 & 2 & 3 &', he: '6/8: 1 2 3 4 5 6 · 3/4: 1 & 2 & 3 &' } },
      },
      {
        say: { en: 'To find the meter, tap the beat that feels natural, then listen for the next low, heavy note and count the taps in between. Bass notes and chord changes usually fall on beat one.', he: 'כדי למצוא את המשקל, הקישו את הפעמה שמרגישה טבעית, הקשיבו לצליל הנמוך והכבד הבא, וספרו את ההקשות שביניהם. צלילי בס וחילופי אקורדים נופלים בדרך כלל על פעמה אחת.' },
        play: [meter(3, 3, 0.4)],
        show: { text: { en: '1 2 3 · 1 2 3 · 1 2 3', he: '1 2 3 · 1 2 3 · 1 2 3' } },
      },
      {
        say: { en: 'Careful: many tunes begin before beat one, with a pickup, also called an anacrusis. Here a single note leads in, and beat one arrives with the bass.', he: 'זהירות: הרבה מנגינות מתחילות לפני פעמה אחת, עם קדם־פעמה, שנקראת גם אנקרוזיס. כאן צליל אחד מוביל פנימה, ופעמה אחת מגיעה עם הבס.' },
        play: [notes([67], 0.5), meter(3, 2)],
        show: { text: { en: '3 | 1 2 3 | 1', he: '3 | 1 2 3 | 1' } },
      },
      {
        say: { en: 'A common mistake is to mix up meter and tempo. A waltz is in three whether it is fast or slow, and a march is in two at any speed. Count the group, not the speed.', he: 'טעות נפוצה היא לבלבל בין משקל לטמפו. ואלס הוא בשלוש בין אם הוא מהיר ובין אם הוא איטי, ומארש הוא בשתיים בכל מהירות. ספרו את הקבוצה, לא את המהירות.' },
        play: [meter(3, 2, 0.3), rest(0.3), meter(3, 2, 0.6)],
        show: { text: { en: 'fast 3 = slow 3', he: '3 מהיר = 3 איטי' } },
      },
      {
        say: { en: 'In real music, marches are usually in 2/4 or 6/8, waltzes in 3/4, most pop and rock in 4/4, and Irish jigs in 6/8. Odd meters exist too: "Take Five", recorded by the Dave Brubeck Quartet, is in 5/4.', he: 'במוזיקה אמיתית, מארשים הם בדרך כלל ב־2/4 או ב־6/8, ואלסים ב־3/4, רוב הפופ והרוק ב־4/4, וג׳יגים אירים ב־6/8. יש גם משקלים לא זוגיים: ״Take Five״ של רביעיית דייב ברובק הוא ב־5/4.' },
        play: [meter(5, 2, 0.4)],
        show: { text: { en: '5/4: 1 2 3 4 5', he: '5/4: 1 2 3 4 5' } },
      },
      {
        say: { en: 'To keep: meter is how beats group. Find the heavy beat one, count to the next one, and check whether each beat splits in two, simple meter, or in three, compound meter.', he: 'מה לזכור: משקל הוא הדרך שבה הפעמות מתקבצות. מצאו את פעמה אחת הכבדה, ספרו עד הבאה, ובדקו אם כל פעמה מתחלקת לשתיים — משקל פשוט — או לשלוש — משקל מורכב.' },
      },
    ],
  },
  {
    id: 'expression',
    area: 'ear',
    emoji: '🎭',
    title: { en: 'Loud, soft, short, smooth', he: 'חזק, חלש, קצר, רציף' },
    takeaway: { en: 'The same notes can be played loud or soft (dynamics), short or smooth (articulation). Together they make the mood of the music.', he: 'אותם צלילים אפשר לנגן חזק או חלש (דינמיקה), קצר או רציף (ארטיקולציה). ביחד הם יוצרים את מצב הרוח של המוזיקה.' },
    steps: [
      {
        say: { en: 'Hi {name}! Music is not only which notes — it is how they are played. Here is the same tune, softly and then loudly.', he: 'היי {name}! מוזיקה היא לא רק אילו צלילים — אלא איך מנגנים אותם. הנה אותה מנגינה, בשקט ואז בחוזקה.' },
        play: [notes([60, 62, 64, 65, 67], 0.32, 0.25), rest(0.4), notes([60, 62, 64, 65, 67], 0.32, 0.95)],
        show: { text: { en: 'p · f', he: 'p · f' } },
      },
      {
        say: { en: 'Musicians call loud and soft dynamics. Growing louder is a crescendo; fading softer is a diminuendo.', he: 'מוזיקאים קוראים לחזק וחלש דינמיקה. התחזקות היא קרשנדו; היחלשות היא דימינואנדו.' },
        play: [{ kind: 'events', events: Array.from({ length: 10 }, (_, i) => ({ midi: [60, 64, 67, 64][i % 4], start: i * 0.28, duration: 0.26, velocity: 0.1 + 0.09 * i })), length: 3 }],
        show: { text: { en: 'crescendo <', he: 'קרשנדו <' } },
      },
      {
        say: { en: 'Notes can also be short and bouncy — staccato — or smooth and joined — legato. Same notes, a different character.', he: 'צלילים יכולים להיות גם קצרים וקופצניים — סטקטו — או רציפים ומחוברים — לגטו. אותם צלילים, אופי אחר.' },
        play: [{ kind: 'events', events: [60, 62, 64, 65, 67].map((m, i) => ({ midi: m, start: i * 0.32, duration: 0.08, velocity: 0.6 })), length: 1.8 }, rest(0.3), notes([60, 62, 64, 65, 67], 0.32)],
        show: { text: { en: 'staccato · legato', he: 'סטקטו · לגטו' } },
      },
      {
        say: { en: 'Put it all together and you get a mood: fast, loud and major sounds joyful; slow, soft and minor sounds sad.', he: 'מחברים הכל ומקבלים מצב רוח: מהיר, חזק ומז׳ורי נשמע שמח; איטי, שקט ומינורי נשמע עצוב.' },
        play: [notes([60, 64, 67, 72, 67, 64], 0.18, 0.9), rest(0.4), notes([57, 60, 64, 62, 60, 57], 0.55, 0.3)],
        show: { text: { en: '😀 · 😢', he: '😀 · 😢' } },
      },
      {
        say: { en: 'Your turn! Louder or softer, short or smooth, and how does it feel? There are no wrong feelings — but the clues are real.', he: 'תורכם! חזק או חלש, קצר או רציף, ואיך זה מרגיש? אין רגשות שגויים — אבל הרמזים אמיתיים.' },
        show: { text: { en: 'p f · . —', he: 'p f · . —' } },
      },
    ],
    more: [
      {
        say: { en: 'Dynamics are marked with Italian letters, from very soft to very loud: pp, p, mp, mf, f, ff. The m stands for mezzo, moderately. They are relative: forte in a lullaby is softer than forte in a brass band.', he: 'דינמיקה מסומנת באותיות איטלקיות, מחלש מאוד עד חזק מאוד: pp, p, mp, mf, f, ff. ה־m היא מֶצוֹ, בינוני. הסימנים יחסיים: פורטה בשיר ערש חלש יותר מפורטה בתזמורת כלי נשיפה.' },
        play: [shaped([60, 64, 67, 72, 67, 64], [0.12, 0.25, 0.4, 0.55, 0.75, 0.95], 0.45)],
        show: { text: { en: 'pp p mp mf f ff', he: 'pp p mp mf f ff' } },
      },
      {
        say: { en: 'Gradual changes are drawn as hairpins: an opening one is a crescendo, a closing one a diminuendo, also called decrescendo. A single stressed note is an accent, marked with a small >.', he: 'שינויים הדרגתיים מסומנים במזלגות: מזלג נפתח הוא קרשנדו, מזלג נסגר הוא דימינואנדו, שנקרא גם דקרשנדו. צליל בודד מודגש הוא אקצנט, ומסומן ב־> קטן.' },
        play: [shaped([72, 71, 69, 67, 65, 64, 62, 60], [0.95, 0.83, 0.71, 0.59, 0.47, 0.35, 0.24, 0.14], 0.28), rest(0.4), shaped([67, 67, 67, 67, 67, 67, 67, 67], [0.9, 0.3, 0.3, 0.3, 0.9, 0.3, 0.3, 0.3], 0.25)],
        show: { text: { en: 'dim. · accents >', he: 'דימינואנדו · אקצנטים >' } },
      },
      {
        say: { en: 'Articulation is how each note starts and ends. Staccato, a dot, cuts the note short. Tenuto, a short line, holds it full length with a little weight. Legato, under a slur, joins notes with no gap. Staccato shortens the sound, never the beat: the next note still comes on time.', he: 'ארטיקולציה היא איך כל צליל מתחיל ונגמר. סטקטו, נקודה, מקצר את הצליל. טנוטו, קו קצר, מחזיק אותו לכל אורכו עם קצת משקל. לגטו, מתחת לקשת, מחבר צלילים בלי רווח. סטקטו מקצר את הצליל, אף פעם לא את הפעמה: הצליל הבא עדיין מגיע בזמן.' },
        play: [shaped([60, 62, 64, 65, 67], [0.6, 0.6, 0.6, 0.6, 0.6], 0.35, 0.25), rest(0.3), shaped([60, 62, 64, 65, 67], [0.6, 0.6, 0.6, 0.6, 0.6], 0.35, 1)],
        show: { text: { en: 'staccato · legato — same timing', he: 'סטקטו · לגטו — אותו תזמון' } },
      },
      {
        say: { en: 'To hear dynamics, compare with what came just before, not with a fixed loudness. For articulation, listen to the ends of notes: is there silence between them, or does each one flow into the next?', he: 'כדי לשמוע דינמיקה, השוו למה שהיה רגע לפני, לא לעוצמה קבועה. בארטיקולציה, הקשיבו לסופי הצלילים: יש שקט ביניהם, או שכל צליל זורם לתוך הבא?' },
      },
      {
        say: { en: 'When you play or sing, shape the phrase. Most phrases grow towards their highest or most important note and relax after it. Decide where the peak is before you begin.', he: 'כשאתם מנגנים או שרים, עצבו את המשפט. רוב המשפטים מתעצמים לקראת הצליל הגבוה או החשוב ביותר, ונרגעים אחריו. החליטו איפה השיא לפני שאתם מתחילים.' },
        play: [shaped([60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60], [0.25, 0.32, 0.4, 0.5, 0.62, 0.85, 0.62, 0.5, 0.4, 0.32, 0.25], 0.3)],
        show: { text: { en: '<  peak  >', he: '<  שיא  >' } },
      },
      {
        say: { en: 'The classic mistake: speeding up in a crescendo and slowing down in a diminuendo. Louder is not faster. Keep the pulse steady and change only the volume, as in this crescendo.', he: 'הטעות הקלאסית: להאיץ בקרשנדו ולהאט בדימינואנדו. חזק יותר זה לא מהר יותר. שמרו על דופק יציב ושנו רק את העוצמה, כמו בקרשנדו הזה.' },
        play: [shaped([60, 64, 67, 64, 60, 64, 67, 64, 60, 64, 67, 72], [0.1, 0.17, 0.24, 0.31, 0.38, 0.45, 0.52, 0.6, 0.68, 0.76, 0.85, 0.95], 0.25)],
        show: { text: { en: 'cresc. ≠ accel.', he: 'cresc. ≠ accel.' } },
      },
      {
        say: { en: 'In real music, dynamics build form. Ravel\'s "Boléro" is one long crescendo from start to finish. Many rock songs set a quiet verse against a loud chorus. Mood comes from all the clues together: tempo, loudness, articulation, register and major or minor.', he: 'במוזיקה אמיתית, הדינמיקה בונה את המבנה. ״בולרו״ של ראוול הוא קרשנדו אחד ארוך מההתחלה ועד הסוף. הרבה שירי רוק מעמידים בית שקט מול פזמון חזק. מצב הרוח נוצר מכל הרמזים יחד: טמפו, עוצמה, ארטיקולציה, גובה, ומז׳ור או מינור.' },
      },
      {
        say: { en: 'To keep: dynamics say how loud, articulation says how each note begins and ends. Both are relative, both carry the mood, and neither should change your tempo.', he: 'מה לזכור: דינמיקה אומרת כמה חזק, ארטיקולציה אומרת איך כל צליל מתחיל ונגמר. שתיהן יחסיות, שתיהן נושאות את מצב הרוח, ואף אחת מהן לא אמורה לשנות את הטמפו.' },
      },
    ],
  },
  {
    id: 'harmony-more',
    area: 'harmony',
    emoji: '🧭',
    title: { en: 'Endings, key changes and fitting chords', he: 'סיומות, מעברי סולם ואקורדים מתאימים' },
    takeaway: { en: 'Phrases end in different ways (cadences), music can move to a new home (modulation), and every melody note suggests the chords that fit under it.', he: 'משפטים נגמרים בדרכים שונות (קדנצות), מוזיקה יכולה לעבור לבית חדש (מודולציה), וכל צליל במנגינה מרמז על האקורדים שמתאימים מתחתיו.' },
    steps: [
      {
        say: { en: 'Hi {name}! A cadence is how a phrase ends — like punctuation. Five to one is a full stop. Four to one is a gentle "Amen".', he: 'היי {name}! קדנצה היא הדרך שבה משפט נגמר — כמו סימן פיסוק. חמש לאחת זו נקודה. ארבע לאחת זה "אמן" עדין.' },
        play: [phrase([I, IV, V, I]), rest(0.4), phrase([I, V, IV, I])],
        show: { text: { en: 'V → I · IV → I', he: 'V ← I · IV ← I' } },
      },
      {
        say: { en: 'Some phrases stop on five — a question mark. And a deceptive cadence sets up home, then surprises you with a sad chord instead.', he: 'יש משפטים שנעצרים על חמש — סימן שאלה. וקדנצה מטעה מכינה את הבית, ואז מפתיעה באקורד עצוב במקום.' },
        play: [phrase([I, IV, [50, 62, 65], V]), rest(0.4), phrase([I, IV, V, vi])],
        show: { text: { en: '… V ? · V → vi !', he: '… V ? · V ← vi !' } },
      },
      {
        say: { en: 'Sometimes the music changes home altogether. That is a key change, or modulation — the ground shifts under your feet.', he: 'לפעמים המוזיקה מחליפה בית לגמרי. זה מעבר סולם, או מודולציה — הקרקע זזה מתחת לרגליים.' },
        play: [{ kind: 'cadence', key: C }, rest(0.3), { kind: 'cadence', key: { letter: 'D', acc: 0 } }],
        show: { text: { en: 'C → D', he: 'דו ← רה' } },
      },
      {
        say: { en: 'Under any melody note, some chords fit and some clash. A chord fits when the melody notes are inside it.', he: 'מתחת לכל צליל במנגינה, יש אקורדים שמתאימים ויש שמתנגשים. אקורד מתאים כשצלילי המנגינה נמצאים בתוכו.' },
        play: [{ kind: 'events', events: [...[53, 65, 69].map((m) => ({ midi: m, start: 0, duration: 1.4, velocity: 0.4 })), ...[72, 69, 65].map((m, i) => ({ midi: m, start: i * 0.45, duration: 0.42, velocity: 0.8 }))], length: 1.6 }],
        show: { text: { en: 'C A F → IV', he: 'דו לה פה ← IV' } },
      },
      {
        say: { en: 'Your turn! Name the ending, hear whether the key changed, and choose the chord that fits the tune.', he: 'תורכם! תנו שם לסיומת, שמעו אם הסולם השתנה, ובחרו את האקורד שמתאים למנגינה.' },
        show: { text: { en: 'I IV V vi', he: 'I IV V vi' } },
      },
    ],
    more: [
      {
        say: { en: 'A cadence is the pair of chords that closes a phrase. The strongest is the authentic cadence, V to I: the bass falls from G to C, and the leading tone, B, rises a half step to C. It sounds final, like a full stop.', he: 'קדנצה היא זוג האקורדים שסוגר משפט. החזקה ביותר היא הקדנצה האותנטית, V ל־I: הבס יורד מסול לדו, והצליל המוביל, סי, עולה בחצי טון לדו. היא נשמעת סופית, כמו נקודה.' },
        play: [phrase([I4, IV4, V4, I4])],
        show: { text: { en: 'V → I  (B → C)', he: 'V → I  (B → C)' } },
      },
      {
        say: { en: 'The plagal cadence, IV to I, has no leading tone, so it is softer: the "Amen" sung at the end of many hymns. The bass falls from F to C.', he: 'הקדנצה הפלגלית, IV ל־I, היא בלי צליל מוביל, ולכן רכה יותר: ה״אמן״ שבסוף הרבה מזמורי כנסייה. הבס יורד מפה לדו.' },
        play: [phrase([I4, IV4, I4])],
        show: { text: { en: 'IV → I  "A-men"', he: 'IV → I  ״אָ־מֵן״' } },
      },
      {
        say: { en: 'A half cadence stops on V. It sounds open, like a comma or a question, and the next phrase usually answers with a full cadence. Musicians call this pair antecedent and consequent.', he: 'חצי קדנצה נעצרת על V. היא נשמעת פתוחה, כמו פסיק או שאלה, והמשפט הבא עונה לה בדרך כלל בקדנצה מלאה. מוזיקאים קוראים לזוג הזה משפט שואל ומשפט עונה.' },
        play: [phrase([I4, ii4, V4]), rest(0.3), phrase([I4, V4, I4])],
        show: { text: { en: 'I ii V , · I V I .', he: 'I ii V , · I V I .' } },
      },
      {
        say: { en: 'The deceptive cadence goes V to vi. The melody still resolves, B to C, but the bass steps up to A instead of falling to C. The vi chord shares two notes with I, C and E, so it can stand in for home with a darker color.', he: 'הקדנצה המטעה הולכת מ־V ל־vi. המנגינה עדיין נפתרת, סי לדו, אבל הבס עולה צעד ללה במקום לרדת לדו. לאקורד vi יש שני צלילים משותפים עם I, דו ומי, ולכן הוא יכול למלא את מקום הבית בצבע כהה יותר.' },
        play: [phrase([I4, IV4, V4, vi4])],
        show: { text: { en: 'V → vi  (G → A)', he: 'V → vi  (G → A)' } },
      },
      {
        say: { en: 'To tell them apart, follow the bass on the last two chords. G down to C: authentic. F to C: plagal. Stopping on G, unresolved: half. G up to A, with a minor color: deceptive.', he: 'כדי להבדיל ביניהן, עקבו אחרי הבס בשני האקורדים האחרונים. סול יורד לדו: אותנטית. פה לדו: פלגלית. נעצר על סול, בלי פתרון: חצי קדנצה. סול עולה ללה, בצבע מינורי: מטעה.' },
      },
      {
        say: { en: 'A modulation makes a new note home. The smooth way uses a pivot chord that belongs to both keys. A minor is vi in C and ii in G; from it, D7, the V7 of G, leads to G, and F-sharp, the new leading tone, confirms the move.', he: 'מודולציה הופכת צליל אחר לבית. הדרך החלקה עוברת דרך אקורד ציר ששייך לשני הסולמות. לה מינור הוא vi בדו ו־ii בסול; ממנו D7, ה־V7 של סול, מוביל לסול, ופה דיאז, הצליל המוביל החדש, מאשר את המעבר.' },
        play: [phrase([I4, vi4, D7, G4])],
        show: { text: { en: 'C: I vi = G: ii V7 I', he: 'C: I vi = G: ii V7 I' } },
      },
      {
        say: { en: 'Pop songs often skip the pivot: the last chorus simply jumps up a half step or a whole step. It is direct and dramatic, and you feel the floor lift.', he: 'בשירי פופ מדלגים הרבה פעמים על הציר: הפזמון האחרון פשוט קופץ חצי טון או טון שלם למעלה. זה ישיר ודרמטי, ומרגישים את הרצפה מתרוממת.' },
        play: [{ kind: 'cadence', key: C }, rest(0.3), { kind: 'cadence', key: { letter: 'D', acc: 0 } }],
        show: { text: { en: 'C → D', he: 'C → D' } },
      },
      {
        say: { en: 'Fitting a chord to a melody: a note fits when it is one of the chord\'s tones. G belongs to C major and to G major, so both work under it. Under F major, G is not a chord tone but an added color, the 9.', he: 'להתאים אקורד למנגינה: צליל מתאים כשהוא אחד מצלילי האקורד. סול שייך לדו מז׳ור ולסול מז׳ור, אז שניהם עובדים מתחתיו. מתחת לפה מז׳ור, סול הוא לא צליל אקורד אלא צבע נוסף — ה־9.' },
        play: [chord([48, 52, 55, 67], 1.1), rest(0.2), chord([55, 59, 62, 67], 1.1), rest(0.2), chord([53, 57, 60, 67], 1.1)],
        show: { text: { en: 'G over C ✓ · G ✓ · F (9)', he: 'G מעל C ✓ · G ✓ · F (9)' } },
      },
      {
        say: { en: 'A common mistake is one chord per melody note. Chords usually change once or twice a bar. Choose the chord that holds the notes on the strong beats; the notes in between can simply pass through.', he: 'טעות נפוצה היא אקורד לכל צליל במנגינה. אקורדים מתחלפים בדרך כלל פעם או פעמיים בתיבה. בחרו את האקורד שמכיל את הצלילים בפעמות החזקות; הצלילים שביניהן יכולים פשוט לעבור דרכו.' },
      },
      {
        say: { en: 'To keep: cadences are punctuation — V to I a full stop, IV to I an amen, ending on V a comma, V to vi a surprise. Modulation moves home, and a chord fits when it holds the melody\'s strong notes.', he: 'מה לזכור: קדנצות הן סימני פיסוק — V ל־I נקודה, IV ל־I אמן, סיום על V פסיק, V ל־vi הפתעה. מודולציה מזיזה את הבית, ואקורד מתאים כשהוא מכיל את הצלילים החזקים של המנגינה.' },
      },
    ],
  },
  {
    id: 'transformations',
    area: 'theory',
    emoji: '🔀',
    title: { en: 'Moving music around', he: 'להזיז מוזיקה ממקום למקום' },
    takeaway: { en: 'Musicians move music around: chord numbers into any key, a motif up a step (sequence), upside down (inversion) or backwards (retrograde), a rhythm twice as slow.', he: 'מוזיקאים מזיזים מוזיקה: מספרי אקורדים לכל סולם, מוטיב צעד למעלה (סקוונצה), הפוך (היפוך) או מהסוף להתחלה (רטרוגרד), מקצב פי שניים לאט.' },
    steps: [
      {
        say: { en: 'Hi {name}! Many musicians think of chords as numbers: one, four, five. In C that is C, F and G. In G it is G, C and D.', he: 'היי {name}! הרבה מוזיקאים חושבים על אקורדים כמספרים: אחת, ארבע, חמש. בדו זה דו, פה וסול. בסול זה סול, דו ורה.' },
        play: [phrase([I, IV, V, I])],
        show: { text: { en: 'I IV V → C F G', he: 'I IV V ← C F G' } },
      },
      {
        say: { en: 'A sequence repeats a little motif one step higher, and then higher again. Your ear expects the next step before it comes.', he: 'סקוונצה חוזרת על מוטיב קטן צעד אחד למעלה, ושוב למעלה. האוזן מצפה לצעד הבא עוד לפני שהוא מגיע.' },
        play: [notes([60, 62, 64, 60], 0.3), notes([62, 64, 65, 62], 0.3), notes([64, 65, 67, 64], 0.3)],
        show: { text: { en: '↗ ↗ ↗', he: '↗ ↗ ↗' } },
      },
      {
        say: { en: 'Composers also flip a motif upside down — that is inversion — or play it backwards, called retrograde.', he: 'מלחינים גם הופכים מוטיב — זה היפוך — או מנגנים אותו מהסוף להתחלה, מה שנקרא רטרוגרד.' },
        play: [notes([60, 64, 62, 67], 0.32), rest(0.3), notes([60, 56, 58, 53], 0.32), rest(0.3), notes([67, 62, 64, 60], 0.32)],
        show: { text: { en: 'motif · inverted · backwards', he: 'מוטיב · הפוך · מהסוף' } },
      },
      {
        say: { en: 'Rhythms can be stretched too: twice as slow is augmentation, twice as fast is diminution. The shape stays; the speed changes.', he: 'גם מקצבים אפשר למתוח: פי שניים לאט זו אוגמנטציה, פי שניים מהר זו דימינוציה. הצורה נשארת; המהירות משתנה.' },
        play: [grid([0, 3, 6, 8], 1), rest(0.3), grid([0, 6, 12], 1, 0.15)],
        show: { text: { en: '×2 · ÷2', he: '×2 · ÷2' } },
      },
      {
        say: { en: 'Your turn! Turn numbers into chords, continue a sequence, and say what was done to a motif or a rhythm.', he: 'תורכם! הפכו מספרים לאקורדים, המשיכו סקוונצה, ואמרו מה נעשה למוטיב או למקצב.' },
        show: { text: { en: '🔀', he: '🔀' } },
      },
    ],
    more: [
      {
        say: { en: 'Roman numerals name chords by scale degree. Build a triad on each note of the major scale and you get I, ii, iii, IV, V, vi and vii°. Upper case is major, lower case minor, and the small circle means diminished. In C: C, Dm, Em, F, G, Am, B°.', he: 'ספרות רומיות נותנות שם לאקורדים לפי דרגת הסולם. בונים משולש על כל צליל של הסולם המז׳ורי ומקבלים I, ii, iii, IV, V, vi ו־vii°. אות גדולה היא מז׳ור, קטנה היא מינור, והעיגול הקטן פירושו מוקטן. בדו: C, Dm, Em, F, G, Am, B°.' },
        play: [phrase([[48, 52, 55], [50, 53, 57], [52, 55, 59], [53, 57, 60], [55, 59, 62], [57, 60, 64], [59, 62, 65]])],
        show: { text: { en: 'I ii iii IV V vi vii°', he: 'I ii iii IV V vi vii°' } },
      },
      {
        say: { en: 'Because the numbers describe the pattern, not the notes, they move to any key unchanged. ii–V–I is Dm, G, C in C major, and Gm, C, F in F major. Same progression, same feeling, new pitch.', he: 'מכיוון שהמספרים מתארים את הדפוס ולא את הצלילים, הם עוברים לכל סולם בלי שינוי. ii–V–I הוא Dm, G, C בדו מז׳ור, ו־Gm, C, F בפה מז׳ור. אותו מהלך, אותה תחושה, גובה חדש.' },
        play: [phrase([[50, 62, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67]]), rest(0.3), phrase([[55, 67, 70, 74], [48, 64, 67, 72], [53, 65, 69, 72]])],
        show: { text: { en: 'C: Dm G C · F: Gm C F', he: 'C: Dm G C · F: Gm C F' } },
      },
      {
        say: { en: 'A sequence repeats a motif at a new pitch. A diatonic sequence stays inside the scale, so step sizes shift: C D E, then D E F, with a half step at the top. A real sequence copies the intervals exactly: D E F-sharp.', he: 'סקוונצה חוזרת על מוטיב בגובה חדש. סקוונצה דיאטונית נשארת בתוך הסולם, ולכן גודל הצעדים משתנה: דו רה מי, ואז רה מי פה, עם חצי טון למעלה. סקוונצה ממשית מעתיקה את המרווחים בדיוק: רה מי פה דיאז.' },
        play: [notes([60, 62, 64], 0.3), rest(0.25), notes([62, 64, 65], 0.3), rest(0.25), notes([62, 64, 66], 0.3)],
        show: { text: { en: 'C D E · D E F · D E F♯', he: 'C D E · D E F · D E F♯' } },
      },
      {
        say: { en: 'Inversion turns every interval upside down: same size, opposite direction. The motif C, E, D, G goes up a major third, down a whole step, up a fourth. Inverted from C: down a major third to A-flat, up a whole step to B-flat, down a fourth to F.', he: 'היפוך הופך כל מרווח: אותו גודל, כיוון הפוך. המוטיב דו, מי, רה, סול עולה טרצה גדולה, יורד טון שלם, עולה קוורטה. בהיפוך מדו: יורד טרצה גדולה ללה במול, עולה טון שלם לסי במול, יורד קוורטה לפה.' },
        play: [notes([60, 64, 62, 67], 0.35), rest(0.3), notes([60, 56, 58, 53], 0.35)],
        show: { text: { en: 'C E D G · C A♭ B♭ F', he: 'C E D G · C A♭ B♭ F' } },
      },
      {
        say: { en: 'Retrograde plays the notes in reverse order: G, D, E, C. Combine both and you get the retrograde inversion. Twelve-tone composers such as Schoenberg build whole pieces from these four forms: original, inversion, retrograde and retrograde inversion.', he: 'רטרוגרד מנגן את הצלילים בסדר הפוך: סול, רה, מי, דו. משלבים את שניהם ומקבלים רטרוגרד של ההיפוך. מלחינים דודקפוניים כמו שנברג בונים יצירות שלמות מארבע הצורות האלה: מקור, היפוך, רטרוגרד ורטרוגרד של ההיפוך.' },
        play: [notes([67, 62, 64, 60], 0.35), rest(0.3), notes([53, 58, 56, 60], 0.35)],
        show: { text: { en: 'G D E C · F B♭ A♭ C', he: 'G D E C · F B♭ A♭ C' } },
      },
      {
        say: { en: 'Augmentation doubles every note value; diminution halves them. The pitches and the rhythm\'s shape stay, only the time stretches or shrinks. Bach uses augmentation in some of his canons and fugues.', he: 'אוגמנטציה מכפילה כל ערך צליל; דימינוציה מחלקת אותו בחצי. הצלילים וצורת המקצב נשארים, רק הזמן נמתח או מתכווץ. באך משתמש באוגמנטציה בכמה מהקאנונים והפוגות שלו.' },
        play: [notes([60, 64, 62, 67], 0.25), rest(0.3), notes([60, 64, 62, 67], 0.5)],
        show: { text: { en: '♫ ♫ → ♩ ♩ ♩ ♩', he: '♫ ♫ → ♩ ♩ ♩ ♩' } },
      },
      {
        say: { en: 'To recognize a transformation, trace the contour with your hand. Same shape, higher: transposition or sequence. Mirror image: inversion. Last note first: retrograde. Same shape, slower or faster: augmentation or diminution.', he: 'כדי לזהות טרנספורמציה, ציירו את קו המתאר ביד. אותה צורה, גבוה יותר: טרנספוזיציה או סקוונצה. תמונת ראי: היפוך. הצליל האחרון ראשון: רטרוגרד. אותה צורה, לאט או מהר יותר: אוגמנטציה או דימינוציה.' },
      },
      {
        say: { en: 'The usual confusion is inversion versus retrograde, since both sound "turned around". Check the first note: an inversion starts where the original started; a retrograde starts where the original ended.', he: 'הבלבול הרגיל הוא בין היפוך לרטרוגרד, כי שניהם נשמעים "הפוכים". בדקו את הצליל הראשון: היפוך מתחיל איפה שהמקור התחיל; רטרוגרד מתחיל איפה שהמקור נגמר.' },
      },
      {
        say: { en: 'To keep: numbers carry chords between keys, a sequence moves a motif in pitch, inversion mirrors it, retrograde reverses it, and augmentation and diminution change its speed. The idea stays recognizable every time.', he: 'מה לזכור: מספרים מעבירים אקורדים בין סולמות, סקוונצה מזיזה מוטיב בגובה, היפוך משקף אותו, רטרוגרד הופך את הסדר, ואוגמנטציה ודימינוציה משנות את המהירות. הרעיון נשאר מזוהה בכל פעם.' },
      },
    ],
  },
  {
    id: 'terms',
    area: 'theory',
    emoji: '📜',
    title: { en: 'The words on the page', he: 'המילים שעל הדף' },
    takeaway: { en: 'Sheet music speaks Italian: tempo words (Adagio, Allegro), dynamics (p, f) and signs (staccato, fermata). The time signature tells how beats are grouped.', he: 'תווים מדברים איטלקית: מילות טמפו (אדג׳ו, אלגרו), דינמיקה (p, f) וסימנים (סטקטו, פרמטה). סימן המשקל אומר איך הפעמות מתקבצות.' },
    steps: [
      {
        say: { en: 'Hi {name}! Written music has its own words, mostly Italian. Adagio means slow, Allegro means fast and lively.', he: 'היי {name}! לתווים יש מילים משלהם, בעיקר באיטלקית. אדג׳ו פירושו איטי, אלגרו פירושו מהיר ועליז.' },
        play: [notes([60, 64, 67, 64], 0.7), rest(0.3), notes([60, 64, 67, 64, 60, 64, 67, 72], 0.17)],
        show: { text: { en: 'Adagio · Allegro', he: 'Adagio · Allegro' } },
      },
      {
        say: { en: 'Small letters tell how loud: p is soft, f is loud, and two of them — pp or ff — mean very.', he: 'אותיות קטנות אומרות כמה חזק: p זה חלש, f זה חזק, ושתיים מהן — pp או ff — פירושן מאוד.' },
        play: [notes([64, 67, 72], 0.4, 0.15), rest(0.3), notes([64, 67, 72], 0.4, 0.95)],
        show: { text: { en: 'pp · ff', he: 'pp · ff' } },
      },
      {
        say: { en: 'A dot above a note means short — staccato. A curved line over notes means smooth — legato. An eye-shaped sign, the fermata, means hold it.', he: 'נקודה מעל תו פירושה קצר — סטקטו. קו מעוגל מעל תווים פירושו רציף — לגטו. סימן בצורת עין, הפרמטה, פירושו להחזיק.' },
        play: [{ kind: 'events', events: [60, 62, 64].map((m, i) => ({ midi: m, start: i * 0.35, duration: 0.08, velocity: 0.6 })).concat([{ midi: 67, start: 1.05, duration: 2.2, velocity: 0.6 }]), length: 3.4 }],
        show: { text: { en: '·  ⌒  𝄐', he: '·  ⌒  𝄐' } },
      },
      {
        say: { en: 'The two numbers at the start are the time signature. In three-four, the top number says three beats in a bar; the four says each beat is a quarter note.', he: 'שני המספרים בהתחלה הם סימן המשקל. בשלוש־רבעים, המספר העליון אומר שלוש פעמות בתיבה; הארבע אומר שכל פעמה היא רבע.' },
        play: [meter(3, 2)],
        show: { text: { en: '3/4 = ♩ ♩ ♩', he: '3/4 = ♩ ♩ ♩' } },
      },
      {
        say: { en: 'Your turn! Match the words to their meaning, read time signatures, and spot what breaks the rules of good voice leading.', he: 'תורכם! התאימו מילים למשמעות, קראו סימני משקל, וזהו מה שובר את כללי הובלת הקולות.' },
        show: { text: { en: 'Allegro · mf · 6/8', he: 'Allegro · mf · 6/8' } },
      },
    ],
    more: [
      {
        say: { en: 'Tempo words, from slow to fast: Largo, broad; Adagio, at ease; Andante, at a walking pace; Moderato, moderate; Allegro, lively; Presto, very fast. They describe character as much as speed, so composers often add a metronome mark. Andante, then Presto.', he: 'מילות טמפו, מאיטי למהיר: לרגו, רחב; אדג׳ו, בנחת; אנדנטה, בקצב הליכה; מודרטו, מתון; אלגרו, עליז; פרסטו, מהיר מאוד. הן מתארות אופי לא פחות ממהירות, ולכן מלחינים מוסיפים לעתים קרובות סימון מטרונום. אנדנטה, ואז פרסטו.' },
        play: [notes([60, 64, 67, 64], 0.6), rest(0.3), notes([60, 64, 67, 64, 60, 64, 67, 72], 0.15)],
        show: { text: { en: 'Largo · Adagio · Andante · Moderato · Allegro · Presto', he: 'Largo · Adagio · Andante · Moderato · Allegro · Presto' } },
      },
      {
        say: { en: 'Changing the tempo: ritardando or rallentando, written rit. or rall., means gradually slower; accelerando means gradually faster; a tempo means back to the original speed. Listen to a ritardando.', he: 'שינויי טמפו: ריטרדנדו או רלנטנדו, שנכתבים rit. או rall., פירושם להאט בהדרגה; אצ׳לרנדו פירושו להאיץ בהדרגה; a tempo פירושו לחזור למהירות המקורית. הקשיבו לריטרדנדו.' },
        play: [{ kind: 'events', events: [[72, 0], [71, 0.28], [69, 0.58], [67, 0.92], [65, 1.32], [64, 1.8]].map(([m, s], i) => ({ midi: m, start: s, duration: i === 5 ? 1 : 0.3, velocity: 0.6 })), length: 3 }],
        show: { text: { en: 'rit. · accel. · a tempo', he: 'rit. · accel. · a tempo' } },
      },
      {
        say: { en: 'Dynamics run pp, p, mp, mf, f, ff, from very soft to very loud; the m, mezzo, means moderately. Sfz, sforzando, is a sudden strong accent on one note. Cresc. and dim. spell out gradual changes in words. Here: p, mf, ff.', he: 'הדינמיקה נעה pp, p, mp, mf, f, ff, מחלש מאוד עד חזק מאוד; ה־m, מצו, פירושה בינוני. sfz, ספורצנדו, הוא הדגשה פתאומית וחזקה על צליל אחד. cresc. ו־dim. כותבים שינויים הדרגתיים במילים. כאן: p, mf, ff.' },
        play: [notes([64, 67, 72], 0.35, 0.2), rest(0.25), notes([64, 67, 72], 0.35, 0.55), rest(0.25), notes([64, 67, 72], 0.35, 0.95)],
        show: { text: { en: 'p · mf · ff', he: 'p · mf · ff' } },
      },
      {
        say: { en: 'A curved line can mean two things. Over different notes it is a slur: play them smoothly. Between two notes of the same pitch it is a tie: play one long note and do not strike the second. Listen: two Gs, then the same two tied.', he: 'לקו מעוגל יש שתי משמעויות. מעל צלילים שונים זו קשת לגטו: לנגן אותם ברציפות. בין שני צלילים באותו גובה זו קשת חיבור (ליגטורה): מנגנים צליל אחד ארוך ולא מקישים את השני. הקשיבו: שני סול, ואז אותם שניים מחוברים.' },
        play: [notes([67, 67], 0.55), rest(0.3), notes([67], 1.1)],
        show: { text: { en: 'slur ≠ tie', he: 'קשת לגטו ≠ ליגטורה' } },
      },
      {
        say: { en: 'In a time signature the top number counts the beats in a bar, and the bottom number names the beat: 4 is a quarter note, 2 a half note, 8 an eighth. A large C means 4/4, common time; a C with a line through it is 2/2, cut time.', he: 'בסימן משקל המספר העליון סופר את הפעמות בתיבה, והתחתון אומר מהי הפעמה: 4 הוא רבע, 2 חצי, 8 שמינית. C גדולה פירושה 4/4, ״common time״; C עם קו דרכה היא 2/2, ״alla breve״.' },
        play: [meter(2, 3)],
        show: { text: { en: 'C = 4/4 · ¢ = 2/2', he: 'C = 4/4 · ¢ = 2/2' } },
      },
      {
        say: { en: '6/8 is not six slow beats. It is six eighths grouped in two threes, so a conductor beats two. 3/4 has the same six eighths, grouped as three twos.', he: '6/8 הוא לא שש פעמות איטיות. אלה שש שמיניות שמתקבצות לשתי שלישיות, ולכן מנצח מסמן שתיים. ב־3/4 יש אותן שש שמיניות, מקובצות לשלושה זוגות.' },
        play: [six(2), rest(0.3), meter(3, 2)],
        show: { text: { en: '6/8 = 2 × 3 · 3/4 = 3 × 2', he: '6/8 = 2 × 3 · 3/4 = 3 × 2' } },
      },
      {
        say: { en: 'The road map: repeat signs, two dots beside a double bar, send you back. First and second endings are played the first and second time through. D.C. means from the beginning, D.S. from the sign, al Fine up to the word Fine, al Coda on to the coda.', he: 'מפת הדרכים: סימני חזרה, שתי נקודות ליד קו כפול, מחזירים אתכם אחורה. סיום ראשון ושני מנוגנים בפעם הראשונה ובפעם השנייה. D.C. פירושו מההתחלה, D.S. מהסימן, al Fine עד המילה Fine, ו־al Coda הלאה אל הקודה.' },
      },
      {
        say: { en: 'Classical part-writing adds rules: resolve the leading tone up, do not cross voices, and avoid parallel fifths and octaves, where two voices keep that interval while moving the same way. Listen: C–G to D–A, parallel fifths; then G falls to F instead.', he: 'כתיבת קולות קלאסית מוסיפה כללים: לפתור את הצליל המוביל למעלה, לא להצליב קולות, ולהימנע מקווינטות ואוקטבות מקבילות — שני קולות ששומרים על המרווח הזה כשהם זזים באותו כיוון. הקשיבו: דו–סול לרה–לה, קווינטות מקבילות; ואז סול יורד לפה במקום.' },
        play: [chord([48, 55], 0.9), chord([50, 57], 0.9), rest(0.4), chord([48, 55], 0.9), chord([50, 53], 0.9)],
        show: { text: { en: 'C–G → D–A ✗ · C–G → D–F ✓', he: 'C–G → D–A ✗ · C–G → D–F ✓' } },
      },
      {
        say: { en: 'A common mistake is to treat the words as exact speeds. Allegro literally means cheerful, and two Allegros can be quite different. Read the word for character and the metronome mark for speed.', he: 'טעות נפוצה היא להתייחס למילים כמהירויות מדויקות. אלגרו פירושו המילולי עליז, ושני אלגרו יכולים להיות שונים למדי. קראו את המילה בשביל האופי ואת סימון המטרונום בשביל המהירות.' },
      },
      {
        say: { en: 'To keep: Italian words set tempo and character, letters set loudness, small signs shape each note, and the time signature tells how many beats a bar has and which note gets one.', he: 'מה לזכור: מילים איטלקיות קובעות טמפו ואופי, אותיות קובעות עוצמה, סימנים קטנים מעצבים כל צליל, וסימן המשקל אומר כמה פעמות יש בתיבה ואיזה תו מקבל פעמה.' },
      },
    ],
  },
  {
    id: 'home-and-scales',
    area: 'ear',
    emoji: '🏠',
    title: { en: 'Home, octaves and scales', he: 'בית, אוקטבות וסולמות' },
    takeaway: { en: 'Every tune has a home note your ear finds by itself. Octaves are the same note higher or lower. Scales are families of notes with their own color.', he: 'לכל מנגינה יש צליל בית שהאוזן מוצאת בעצמה. אוקטבות הן אותו צליל, גבוה או נמוך יותר. סולמות הם משפחות של צלילים עם צבע משלהן.' },
    steps: [
      {
        say: { en: 'Hi {name}! Even without chords, a tune has a home — the note where it feels finished. Listen, then hear the home note.', he: 'היי {name}! גם בלי אקורדים, למנגינה יש בית — הצליל שבו היא מרגישה גמורה. הקשיבו, ואז שמעו את צליל הבית.' },
        play: [notes([64, 62, 60, 62, 64, 67, 65, 62], 0.38), rest(0.6), notes([60], 1.2)],
        show: { text: { en: '… 🏠', he: '… 🏠' } },
      },
      {
        say: { en: 'Two notes an octave apart sound like the same note, one high and one low — like a man and a child singing together.', he: 'שני צלילים במרחק אוקטבה נשמעים כמו אותו צליל, אחד גבוה ואחד נמוך — כמו גבר וילד ששרים יחד.' },
        play: [notes([48, 60], 0.8), rest(0.3), chord([48, 60], 1.2)],
        show: { text: { en: 'C · C', he: 'דו · דו' } },
      },
      {
        say: { en: 'A pentatonic scale has only five notes. It sounds open and folk-like, and almost nothing in it can sound wrong.', he: 'לסולם פנטטוני יש רק חמישה צלילים. הוא נשמע פתוח ועממי, וכמעט שום דבר בו לא יכול להישמע שגוי.' },
        play: [notes([60, 62, 64, 67, 69, 72], 0.3)],
        show: { text: { en: '1 2 3 5 6', he: '1 2 3 5 6' } },
      },
      {
        say: { en: 'The blues scale adds one extra, crunchy note to the minor pentatonic — the blue note. You know it from countless songs.', he: 'סולם הבלוז מוסיף צליל אחד, צורם ומיוחד, לפנטטוני המינורי — הצליל הכחול. אתם מכירים אותו מאינספור שירים.' },
        play: [notes([60, 63, 65, 66, 67, 70, 72], 0.3)],
        show: { text: { en: '1 ♭3 4 ♭5 5 ♭7', he: '1 ♭3 4 ♭5 5 ♭7' } },
      },
      {
        say: { en: 'Your turn! Find the home note of a tune, tell an octave from a near miss, and name the scale you hear.', he: 'תורכם! מצאו את צליל הבית של מנגינה, הבדילו בין אוקטבה לכמעט־אוקטבה, ותנו שם לסולם שאתם שומעים.' },
        show: { text: { en: '🏠 · 8ve · ♪♪♪', he: '🏠 · 8ve · ♪♪♪' } },
      },
    ],
    more: [
      {
        say: { en: 'The home note is the tonic. Your ear finds it from where phrases rest, from which notes are used, and from the leading tone, the note a half step below home that pulls up into it. Listen: a phrase that stops on B, then its resolution to C.', he: 'צליל הבית נקרא טוניקה. האוזן מוצאת אותו לפי המקום שבו משפטים נחים, לפי הצלילים שבשימוש, ולפי הצליל המוביל — הצליל שחצי טון מתחת לבית ומושך אליו למעלה. הקשיבו: משפט שנעצר על סי, ואז הפתרון שלו לדו.' },
        play: [notes([64, 62, 60, 62, 64, 65, 62, 59], 0.35), rest(0.6), notes([60], 1.2)],
        show: { notes: [59, 60], key: 'C', text: { en: 'B → C', he: 'B → C' } },
      },
      {
        say: { en: 'An octave is twelve half steps, and its top note vibrates exactly twice as fast. That 2:1 ratio makes the two blend so well that they share a name. One half step less, a major seventh, and the blend turns into a sharp rub.', he: 'אוקטבה היא שנים־עשר חצאי טונים, והצליל העליון שלה רוטט בדיוק פי שניים מהר. היחס 2:1 גורם לשניהם להתמזג כל כך טוב שיש להם אותו שם. חצי טון פחות — ספטימה גדולה — וההתמזגות הופכת לחיכוך חד.' },
        play: [chord([48, 60], 1.2), rest(0.3), chord([48, 59], 1.2)],
        show: { text: { en: '12 = octave · 11 = major 7th', he: '12 = אוקטבה · 11 = ספטימה גדולה' } },
      },
      {
        say: { en: 'A major scale has seven notes with this pattern: whole, whole, half, whole, whole, whole, half. From C: C D E F G A B C. The two half steps, E–F and B–C, give it its shape.', he: 'לסולם מז׳ור יש שבעה צלילים עם הדפוס הזה: טון, טון, חצי, טון, טון, טון, חצי. מדו: דו רה מי פה סול לה סי דו. שני חצאי הטונים, מי–פה וסי–דו, נותנים לו את הצורה שלו.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.3)],
        show: { notes: [60, 62, 64, 65, 67, 69, 71, 72], key: 'C', text: { en: 'W W H W W W H', he: 'ט ט ח ט ט ט ח' } },
      },
      {
        say: { en: 'The natural minor scale uses another pattern: whole, half, whole, whole, half, whole, whole. From A: A B C D E F G A — the same notes as C major, with a different home. Its lowered 3, 6 and 7 make it darker.', he: 'הסולם המינורי הטבעי משתמש בדפוס אחר: טון, חצי, טון, טון, חצי, טון, טון. מלה: לה סי דו רה מי פה סול לה — אותם צלילים כמו דו מז׳ור, עם בית אחר. ה־3, ה־6 וה־7 המונמכים שלו הופכים אותו לכהה יותר.' },
        play: [notes([57, 59, 60, 62, 64, 65, 67, 69], 0.3)],
        show: { notes: [57, 59, 60, 62, 64, 65, 67, 69], text: { en: 'W H W W H W W', he: 'ט ח ט ט ח ט ט' } },
      },
      {
        say: { en: 'The major pentatonic keeps only 1, 2, 3, 5 and 6. It has no half steps, so no two notes rub. Start the same notes on 6 and you get the minor pentatonic, A C D E G: the scale of countless rock and blues solos.', he: 'הפנטטוני המז׳ורי שומר רק על 1, 2, 3, 5 ו־6. אין בו חצאי טונים, אז אף שני צלילים לא מתחככים. מתחילים את אותם צלילים מ־6 ומקבלים את הפנטטוני המינורי, לה דו רה מי סול: הסולם של אינספור סולואים ברוק ובבלוז.' },
        play: [notes([60, 62, 64, 67, 69, 72], 0.28), rest(0.3), notes([57, 60, 62, 64, 67, 69], 0.28)],
        show: { text: { en: '1 2 3 5 6 · 1 ♭3 4 5 ♭7', he: '1 2 3 5 6 · 1 ♭3 4 5 ♭7' } },
      },
      {
        say: { en: 'The blues scale adds ♭5 to the minor pentatonic. In C: C, E-flat, F, G-flat, G, B-flat. The blue note is usually a passing note squeezed between 4 and 5, not a place to rest.', he: 'סולם הבלוז מוסיף ♭5 לפנטטוני המינורי. בדו: דו, מי במול, פה, סול במול, סול, סי במול. הצליל הכחול הוא בדרך כלל צליל מעבר שנדחק בין 4 ל־5, לא מקום לנוח בו.' },
        play: [notes([60, 63, 65, 66, 67, 66, 65, 63, 60], 0.25)],
        show: { notes: [60, 63, 65, 66, 67, 70, 72], text: { en: 'C E♭ F G♭ G B♭', he: 'C E♭ F G♭ G B♭' } },
      },
      {
        say: { en: 'To name a scale, find home first, then check the third: major or minor. Then listen for half steps. None means pentatonic; a chromatic squeeze between 4 and 5 means blues.', he: 'כדי לזהות סולם, מצאו קודם את הבית, ואז בדקו את הטרצה: מז׳ור או מינור. אחר כך הקשיבו לחצאי טונים. אין בכלל — פנטטוני; דחיסה כרומטית בין 4 ל־5 — בלוז.' },
      },
      {
        say: { en: 'The common mistake is taking the first or lowest note as home. Many tunes start on 5 or 3 and only land on home at the end. This one starts on G, but home is C. Listen to where a tune rests, not where it begins.', he: 'הטעות הנפוצה היא לקחת את הצליל הראשון או הנמוך ביותר כבית. הרבה מנגינות מתחילות ב־5 או ב־3 ונוחתות בבית רק בסוף. המנגינה הזאת מתחילה בסול, אבל הבית הוא דו. הקשיבו איפה מנגינה נחה, לא איפה היא מתחילה.' },
        play: [notes([67, 64, 65, 62, 64, 62], 0.35), notes([60], 1.1)],
        show: { notes: [67, 64, 65, 62, 64, 62, 60], key: 'C' },
      },
      {
        say: { en: 'In real music, pentatonic melodies appear in folk traditions around the world, from Scotland to China to West Africa. The minor pentatonic and the blues scale are the core vocabulary of blues and rock guitar.', he: 'במוזיקה אמיתית, מנגינות פנטטוניות מופיעות במסורות עממיות בכל העולם, מסקוטלנד דרך סין ועד מערב אפריקה. הפנטטוני המינורי וסולם הבלוז הם אוצר המילים הבסיסי של גיטרת בלוז ורוק.' },
      },
      {
        say: { en: 'To keep: home is where the music rests, an octave is the same note vibrating twice as fast, and every scale is a pattern of steps — major, minor, pentatonic or blues.', he: 'מה לזכור: הבית הוא המקום שבו המוזיקה נחה, אוקטבה היא אותו צליל במהירות כפולה, וכל סולם הוא דפוס של צעדים — מז׳ור, מינור, פנטטוני או בלוז.' },
      },
    ],
  },
  {
    id: 'texture',
    area: 'ear',
    emoji: '🧩',
    title: { en: 'How many at once?', he: 'כמה בבת אחת?' },
    takeaway: { en: 'Texture is how many things sound at once: one line, a melody with chords, or several independent lines woven together.', he: 'מרקם זה כמה דברים נשמעים בבת אחת: קו אחד, מנגינה עם אקורדים, או כמה קווים עצמאיים שנארגים יחד.' },
    steps: [
      {
        say: { en: 'Hi {name}! Sometimes you hear one note, sometimes several together. Counting them is a great ear workout. Here: one, then two, then three.', he: 'היי {name}! לפעמים שומעים צליל אחד, לפעמים כמה ביחד. לספור אותם זה אימון מצוין לאוזן. הנה: אחד, אחר כך שניים, אחר כך שלושה.' },
        play: [chord([55], 1), rest(0.3), chord([48, 55], 1), rest(0.3), chord([48, 55, 64], 1)],
        show: { text: { en: '1 · 2 · 3', he: '1 · 2 · 3' } },
      },
      {
        say: { en: 'Spread-out notes are easier to count than notes squeezed close together. Listen for the bottom and the top first, then the middle.', he: 'צלילים מפוזרים קל יותר לספור מאשר צלילים צפופים. הקשיבו קודם לתחתון ולעליון, ואז לאמצע.' },
        play: [chord([43, 55, 64, 71], 1.4), rest(0.3), chord([60, 62, 64, 67], 1.4)],
        show: { text: { en: 'spread · close', he: 'פרוש · צפוף' } },
      },
      {
        say: { en: 'When lines move on their own, each with its own rhythm, musicians call it polyphony. Try to follow just the low line.', he: 'כשקווים נעים כל אחד בעצמו, עם קצב משלו, מוזיקאים קוראים לזה פוליפוניה. נסו לעקוב רק אחרי הקו הנמוך.' },
        play: [{ kind: 'events', events: [[48, 0, 0.6], [50, 0.6, 0.6], [52, 1.2, 1.2], [67, 0, 0.3], [65, 0.3, 0.3], [64, 0.6, 0.3], [62, 0.9, 0.3], [60, 1.2, 1.2]].map(([m, s, d]) => ({ midi: m, start: s, duration: d, velocity: 0.6 })), length: 2.6 }],
        show: { text: { en: 'two lines', he: 'שני קווים' } },
      },
      {
        say: { en: 'Pieces are built from phrases too: a phrase comes back the same, comes back changed, or something new arrives.', he: 'יצירות בנויות גם ממשפטים: משפט חוזר כמו שהוא, חוזר בשינוי, או שמגיע משהו חדש.' },
        play: [notes([60, 64, 67, 64], 0.3), rest(0.2), notes([60, 64, 67, 64], 0.3), rest(0.2), notes([65, 69, 72, 69], 0.3)],
        show: { text: { en: 'A A B', he: 'A A B' } },
      },
      {
        say: { en: 'Your turn! Count the notes in a chord, count the moving lines, and hear how the phrases are put together.', he: 'תורכם! ספרו את הצלילים באקורד, ספרו את הקווים הנעים, ושמעו איך המשפטים מחוברים.' },
        show: { text: { en: '1 2 3 4', he: '1 2 3 4' } },
      },
    ],
    more: [
      {
        say: { en: 'Texture describes how the lines in music relate. Monophony is a single line with no accompaniment, even when many voices sing it together in unison or in octaves, as in Gregorian chant.', he: 'מרקם מתאר איך הקווים במוזיקה מתייחסים זה לזה. מונופוניה היא קו אחד בלי ליווי, גם כשהרבה קולות שרים אותו יחד באוניסון או באוקטבות, כמו בשירה גרגוריאנית.' },
        play: [notes([60, 62, 64, 62, 65, 64, 62, 60], 0.35)],
        show: { text: { en: 'monophony: 1 line', he: 'מונופוניה: קו אחד' } },
      },
      {
        say: { en: 'Homophony is one melody supported by chords. In a hymn all the voices move together in the same rhythm; in a pop song a voice sings over strummed chords. Either way, one line leads and the rest support it.', he: 'הומופוניה היא מנגינה אחת שאקורדים תומכים בה. במזמור כל הקולות זזים יחד באותו מקצב; בשיר פופ קול שר מעל אקורדים מפורטים. בשני המקרים קו אחד מוביל והשאר תומכים בו.' },
        play: [phrase([I4, IV4, V4, I4])],
        show: { text: { en: 'homophony: melody + chords', he: 'הומופוניה: מנגינה + אקורדים' } },
      },
      {
        say: { en: 'Polyphony is two or more independent lines, each with its own rhythm and shape. The simplest kind is a round, or canon, like "Frère Jacques": the same tune enters again later and fits against itself. Here a short tune is answered an octave lower.', he: 'פוליפוניה היא שני קווים עצמאיים או יותר, לכל אחד מקצב וצורה משלו. הסוג הפשוט ביותר הוא קאנון, כמו ״פרֶר ז׳אק״: אותה מנגינה נכנסת שוב מאוחר יותר ומתאימה לעצמה. כאן מנגינה קצרה נענית אוקטבה למטה.' },
        play: [{ kind: 'events', events: [0, 12].flatMap((o, v) => [60, 62, 64, 60, 64, 65, 67].map((m, i) => ({ midi: m - o, start: v * 1.4 + i * 0.35, duration: i === 6 ? 0.7 : 0.33, velocity: v ? 0.5 : 0.6 }))), length: 4.3 }],
        show: { text: { en: 'polyphony: 2 lines', he: 'פוליפוניה: שני קווים' } },
      },
      {
        say: { en: 'Counting notes in a chord is about density. Doubling a note in another octave thickens the sound without adding a new pitch name. Here C, G and E, then the same chord with an extra C on top.', he: 'לספור צלילים באקורד זה עניין של צפיפות. הכפלת צליל באוקטבה אחרת מעבה את הצליל בלי להוסיף שם צליל חדש. כאן דו, סול ומי, ואז אותו אקורד עם עוד דו למעלה.' },
        play: [chord([48, 55, 64], 1.2), rest(0.3), chord([48, 55, 64, 72], 1.2)],
        show: { notes: [48, 55, 64, 72], chord: true, text: { en: '3 + 8ve', he: '3 + אוקטבה' } },
      },
      {
        say: { en: 'To hear texture, follow the bass first, then the top line. Then ask: do the lines move together, with one leading? That is homophony. Do they move on their own, with different rhythms? That is polyphony.', he: 'כדי לשמוע מרקם, עקבו קודם אחרי הבס, ואז אחרי הקו העליון. אחר כך שאלו: הקווים זזים יחד, ואחד מוביל? זו הומופוניה. כל אחד זז בעצמו, במקצבים שונים? זו פוליפוניה.' },
      },
      {
        say: { en: 'Form is how phrases follow each other. Label each phrase with a letter: a repeat keeps its letter, a varied repeat gets a prime, new material gets a new letter. AABA is the 32-bar form of many jazz standards. Here: A, A prime, B, A.', he: 'צורה היא הסדר שבו משפטים באים זה אחרי זה. מסמנים כל משפט באות: חזרה שומרת על האות, חזרה בשינוי מקבלת תג (׳), וחומר חדש מקבל אות חדשה. AABA היא צורת 32 התיבות של הרבה סטנדרטים בג׳אז. כאן: A, A׳, B, A.' },
        play: [notes([60, 64, 67, 64], 0.25), rest(0.15), notes([60, 64, 67, 72], 0.25), rest(0.15), notes([65, 69, 72, 69], 0.25), rest(0.15), notes([60, 64, 67, 64], 0.25)],
        show: { text: { en: "A A' B A", he: 'A A׳ B A' } },
      },
      {
        say: { en: 'A common mistake: more instruments does not mean polyphony. A full orchestra playing a tune with chords is homophonic; two flutes weaving independent lines are polyphonic. Count independent lines, not players.', he: 'טעות נפוצה: יותר כלים זה לא פוליפוניה. תזמורת שלמה שמנגנת מנגינה עם אקורדים היא הומופונית; שני חלילים שאורגים קווים עצמאיים הם פוליפוניים. ספרו קווים עצמאיים, לא נגנים.' },
      },
      {
        say: { en: 'In real music, Gregorian chant is monophonic, a Bach fugue is polyphonic, and most pop songs are homophonic. Many pieces move between textures to create contrast.', he: 'במוזיקה אמיתית, שירה גרגוריאנית היא מונופונית, פוגה של באך היא פוליפונית, ורוב שירי הפופ הומופוניים. הרבה יצירות עוברות בין מרקמים כדי ליצור ניגוד.' },
      },
      {
        say: { en: 'To keep: one line is monophony, a melody with chords is homophony, independent lines are polyphony. Count lines from the bass and the top, and label phrases with letters to see the form.', he: 'מה לזכור: קו אחד הוא מונופוניה, מנגינה עם אקורדים היא הומופוניה, קווים עצמאיים הם פוליפוניה. ספרו קווים מהבס ומהעליון, וסמנו משפטים באותיות כדי לראות את הצורה.' },
      },
    ],
  },
];

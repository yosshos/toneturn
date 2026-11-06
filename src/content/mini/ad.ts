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
const phrase = (romans: [number, number, number][]): Stimulus => {
  const ev: NoteEvent[] = [];
  romans.forEach((c, i) => c.forEach((m) => ev.push({ midi: m, start: i * 0.75, duration: i === romans.length - 1 ? 1.3 : 0.7, velocity: 0.5 })));
  return { kind: 'events', events: ev, length: romans.length * 0.75 + 0.8 };
};
const I: [number, number, number] = [48, 64, 67];
const IV: [number, number, number] = [53, 65, 69];
const V: [number, number, number] = [55, 62, 67];
const vi: [number, number, number] = [57, 64, 69];

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
  },
  {
    id: 'home-and-scales',
    area: 'ear',
    emoji: '🏠',
    title: { en: 'Home, octaves and scales', he: 'בית, אוקטבות וסולמות' },
    takeaway: { en: 'Every tune has a home note your ear finds by itself. Octaves are the same note higher or lower. Scales are families of notes with their own colour.', he: 'לכל מנגינה יש צליל בית שהאוזן מוצאת בעצמה. אוקטבות הן אותו צליל, גבוה או נמוך יותר. סולמות הם משפחות של צלילים עם צבע משלהן.' },
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
  },
];

// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Jazz, slash chords, Barry Harris and the Play & improvise units.

import type { MiniLesson } from '../miniTypes';
import type { Stimulus } from '../../engine/lesson';
import { PROGRESSIONS } from '../../engine/jazz';
import { backingTrack, type ChartId } from '../../engine/perform';

const C = { letter: 'C' as const, acc: 0 as const };
const chord = (midis: number[], duration = 1.2, arpeggio?: boolean): Stimulus => ({ kind: 'chord', midis, duration, ...(arpeggio ? { arpeggio } : {}) });
const notes = (midis: number[], each = 0.32): Stimulus => ({ kind: 'notes', midis, each });
const rest = (duration = 0.4): Stimulus => ({ kind: 'rest', duration });
/** A line in eighth notes (last note held), like the Barry Harris line exercises. */
const line = (midis: number[], bpm = 120, last = 2): Stimulus => ({ kind: 'melody', midis, beats: midis.map((_, i) => (i === midis.length - 1 ? last : 0.5)), bpm });
/** Timed notes: [midi, start beat, length in beats, velocity?]. */
const timed = (bpm: number, ns: [number, number, number, number?][]): Stimulus => {
  const b = 60 / bpm;
  return {
    kind: 'events',
    events: ns.map(([midi, start, len, v]) => ({ midi, start: start * b, duration: len * b * 0.95, velocity: v ?? 0.7 })),
    length: Math.max(...ns.map(([, s, l]) => s + l)) * b + 0.3,
  };
};
/** One chorus of the Play-along band in C (no count-in), optionally only some of its parts. */
const band = (id: ChartId, bpm: number, keep?: (midi: number) => boolean): Stimulus => {
  const t = backingTrack(id, 0, bpm, 1, { countIn: false });
  return { kind: 'events', events: keep ? t.events.filter((e) => keep(e.midi)) : t.events, length: t.length };
};

// Shared chords around middle C (C4 = 60).
const B_DIM = [59, 62, 65, 68]; // B D F A♭
const G7 = [59, 62, 65, 67]; // B D F G (A♭ lowered)
const E7 = [59, 62, 64, 68]; // B D E G♯ (F lowered)
const FM6 = [60, 62, 65, 68]; // C D F A♭ (B raised)
const C6 = [60, 64, 67, 69]; // C E G A
const SIXDIM_C = [60, 62, 64, 65, 67, 68, 69, 71, 72];
/** C6-diminished scale harmonised: each top note with its chord (C6 or B°7) underneath. */
const HARMONISED = [
  [52, 55, 57, 60],
  [53, 56, 59, 62],
  [55, 57, 60, 64],
  [56, 59, 62, 65],
  [57, 60, 64, 67],
];
/** C7 dominant scale lines (Barry Harris half-step rules). */
const PLAIN_FROM_1 = [72, 70, 69, 67, 65, 64, 62, 60];
const FROM_1 = [72, 71, 70, 69, 67, 65, 64, 62, 60];
const FROM_3_THREE = [76, 75, 74, 73, 72, 71, 70, 69, 67, 65, 64, 62, 60];
const FROM_2_TWO = [74, 73, 72, 71, 70, 69, 67, 65, 64, 62, 60];
const C7 = [60, 64, 67, 70];

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ Jazz 1
  {
    id: 'jazz-1',
    area: 'jazz',
    emoji: '🎷',
    title: { en: 'Seventh-chord colours', he: 'הצבעים של אקורדי ספטים' },
    takeaway: { en: 'Four seventh chords — maj7 dreamy, 7 restless, m7 mellow, m7♭5 dark — and ii–V–I chains them home.', he: 'ארבעה אקורדי ספטים — maj7 חולמני, 7 חסר מנוחה, m7 רך, m7♭5 אפל — ו־ii–V–I מחבר אותם הביתה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Jazz rarely stops at three notes. Add a 7th on top of a chord and it gets a whole new colour.', he: 'היי {name}! ג׳אז כמעט אף פעם לא נעצר בשלושה צלילים. מוסיפים ספטימה מעל האקורד, והוא מקבל צבע חדש לגמרי.' },
        play: [chord([60, 64, 67], 1), rest(0.3), chord([60, 64, 67, 71], 1.6)],
        show: { notes: [60, 64, 67, 71], chord: true, key: 'C', text: { en: 'C → Cmaj7', he: 'C → Cmaj7' } },
      },
      {
        say: { en: 'Major 7: C, E, G, B. Dreamy and soft — the 7th sits just a half step under the octave.', he: 'מז׳ור 7: דו, מי, סול, סי. חולמני ורך — הספטימה יושבת חצי טון מתחת לאוקטבה.' },
        play: [chord([60, 64, 67, 71], 1, true), chord([60, 64, 67, 71], 1.4)],
        show: { notes: [60, 64, 67, 71], chord: true, key: 'C', text: { en: 'Cmaj7', he: 'Cmaj7' } },
      },
      {
        say: { en: 'Lower that 7th to B♭ and you get the dominant 7: bluesy and restless. It wants to move — here, to F.', he: 'מורידים את הספטימה לסי במול ומקבלים דומיננט 7: בלוזי וחסר מנוחה. הוא רוצה לזוז — כאן, לפה.' },
        play: [chord([48, 64, 67, 70], 1.3), chord([53, 65, 69, 72], 1.5)],
        show: { notes: [60, 64, 67, 70], chord: true, key: 'C', text: { en: 'C7 → F', he: 'C7 → F' } },
      },
      {
        say: { en: 'Minor 7 lowers the 3rd too: C, E♭, G, B♭. Mellow and cool, more relaxed than sad.', he: 'מינור 7 מוריד גם את הטרצה: דו, מי במול, סול, סי במול. רך וקליל, יותר רגוע מעצוב.' },
        play: [chord([60, 63, 67, 70], 1, true), chord([60, 63, 67, 70], 1.4)],
        show: { notes: [60, 63, 67, 70], chord: true, key: 'C', text: { en: 'Cm7', he: 'Cm7' } },
      },
      {
        say: { en: 'Half-diminished, m7♭5, lowers the 5th as well: C, E♭, G♭, B♭. Dark and mysterious, like a question.', he: 'חצי־מוקטן, m7♭5, מוריד גם את הקווינטה: דו, מי במול, סול במול, סי במול. אפל ומסתורי, כמו שאלה.' },
        play: [chord([60, 63, 66, 70], 1, true), chord([60, 63, 66, 70], 1.4)],
        show: { notes: [60, 63, 66, 70], chord: true, key: 'C', text: { en: 'Cm7♭5', he: 'Cm7♭5' } },
      },
      {
        say: { en: 'Now chain them: minor 7, dominant, major 7. That is ii–V–I, the most common move in jazz. Feel the middle chord pull home.', he: 'עכשיו נשרשר אותם: מינור 7, דומיננט, מז׳ור 7. זה ii–V–I, המהלך הנפוץ ביותר בג׳אז. הרגישו איך האקורד האמצעי מושך הביתה.' },
        play: [{ kind: 'jazz', key: C, chords: PROGRESSIONS['ii-V-I'], each: 1.1 }],
        show: { text: { en: 'Dm7 → G7 → Cmaj7', he: 'Dm7 → G7 → Cmaj7' } },
      },
      {
        say: { en: 'Two cousins: V–I is just the last two chords. I–vi–ii–V starts at home and wanders off — the classic turnaround.', he: 'שני בני דודים: V–I הוא רק שני האקורדים האחרונים. I–vi–ii–V מתחיל בבית ומטייל החוצה — הטרנאראונד הקלאסי.' },
        play: [{ kind: 'jazz', key: C, chords: PROGRESSIONS['V-I'], each: 1 }, rest(0.5), { kind: 'jazz', key: C, chords: PROGRESSIONS['I-vi-ii-V'], each: 1 }],
        show: { text: { en: 'V–I · I–vi–ii–V', he: 'V–I · I–vi–ii–V' } },
      },
      {
        say: { en: 'Your turn! Hear one chord and name its colour: major 7, dominant 7, minor 7 or half-diminished. Then name the progression — count the chords, and listen for where home is.', he: 'תורכם! שמעו אקורד אחד ותנו לו שם: מז׳ור 7, דומיננט 7, מינור 7 או חצי־מוקטן. אחר כך זהו את המהלך — ספרו את האקורדים, והקשיבו איפה הבית.' },
        play: [chord([43, 59, 65, 69], 1.6)],
        show: { text: { en: 'maj7 · 7 · m7 · m7♭5', he: 'maj7 · 7 · m7 · m7♭5' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Jazz 2
  {
    id: 'jazz-2',
    area: 'jazz',
    emoji: '🎺',
    title: { en: 'Melodic minor and swing', he: 'מינור מלודי וסווינג' },
    takeaway: { en: 'Natural minor, Dorian and melodic minor differ only at the top (6 and 7); swing plays eighth notes long–short.', he: 'מינור טבעי, דורי ומינור מלודי נבדלים רק למעלה (6 ו־7); בסווינג השמיניות הן ארוכה־קצרה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Two jazz secrets today: a minor scale with a bright top, and the swing feel.', he: 'היי {name}! שני סודות ג׳אז היום: סולם מינור עם צמרת מוארת, ותחושת הסווינג.' },
        play: [line([60, 62, 63, 65, 67, 69, 71, 72], 132, 1)],
        show: { notes: [60, 62, 63, 65, 67, 69, 71, 72], key: 'C' },
      },
      {
        say: { en: 'Start with natural minor: C, D, E♭, F, G, A♭, B♭, C. Dark all the way up.', he: 'נתחיל במינור טבעי: דו, רה, מי במול, פה, סול, לה במול, סי במול, דו. אפל לכל אורך הדרך.' },
        play: [notes([60, 62, 63, 65, 67, 68, 70, 72])],
        show: { notes: [60, 62, 63, 65, 67, 68, 70, 72], key: 'C', text: { en: 'natural minor', he: 'מינור טבעי' } },
      },
      {
        say: { en: 'Raise just the 6th, A♭ to A, and you get Dorian — still minor, but cooler and brighter.', he: 'מעלים רק את השישית, מלה במול ללה, ומקבלים דורי — עדיין מינור, אבל קריר ומואר יותר.' },
        play: [notes([60, 62, 63, 65, 67, 69, 70, 72])],
        show: { notes: [60, 62, 63, 65, 67, 69, 70, 72], key: 'C', text: { en: 'Dorian: 6', he: 'דורי: 6' } },
      },
      {
        say: { en: 'Raise the 7th too, and you have melodic minor: minor at the bottom, major at the top. In jazz it stays the same on the way down.', he: 'מעלים גם את השביעית, ויש לכם מינור מלודי: מינור למטה, מז׳ור למעלה. בג׳אז הוא נשאר אותו דבר גם בירידה.' },
        play: [notes([60, 62, 63, 65, 67, 69, 71, 72]), notes([71, 69, 67, 65, 63, 62, 60])],
        show: { notes: [60, 62, 63, 65, 67, 69, 71, 72], key: 'C', text: { en: 'melodic minor: 6 + 7', he: 'מינור מלודי: 6 + 7' } },
      },
      {
        say: { en: 'The trick: listen to the last four notes. Two dark ones, one, or none — natural, Dorian, melodic.', he: 'הטריק: הקשיבו לארבעת הצלילים האחרונים. שניים כהים, אחד, או אף אחד — טבעי, דורי, מלודי.' },
        play: [notes([67, 68, 70, 72], 0.3), rest(0.4), notes([67, 69, 70, 72], 0.3), rest(0.4), notes([67, 69, 71, 72], 0.3)],
        show: { text: { en: 'A♭ B♭ · A B♭ · A B', he: 'A♭ B♭ · A B♭ · A B' } },
      },
      {
        say: { en: 'Now swing. Pairs of eighth notes go long–short, like a relaxed walk: doo-ba, doo-ba. Straight first, then swung.', he: 'ועכשיו סווינג. זוגות של שמיניות מתנגנים ארוכה־קצרה, כמו הליכה נינוחה: דו־בה, דו־בה. קודם ישר, אחר כך בסווינג.' },
        play: [line([60, 64, 67, 71, 69, 67], 132, 1), rest(0.5), { kind: 'melody', midis: [60, 64, 67, 71, 69, 67], beats: [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1], bpm: 132 }],
        show: { text: { en: 'doo-ba doo-ba', he: 'דו־בה דו־בה' } },
      },
      {
        say: { en: 'In the exercise you write a lick as scale degrees. This one is 1, 3, 5, 7, 6, 5 — up the chord, then a step down.', he: 'בתרגיל תכתבו ליק כמספרי דרגות. הליק הזה הוא 1, 3, 5, 7, 6, 5 — עולים באקורד, ואז צעד למטה.' },
        play: [{ kind: 'cadence', key: C }, rest(0.3), { kind: 'melody', midis: [60, 64, 67, 71, 69, 67], beats: [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1], bpm: 132 }],
        show: { notes: [60, 64, 67, 71, 69, 67], key: 'C', text: { en: '1 3 5 7 6 5', he: '1 3 5 7 6 5' } },
      },
      {
        say: { en: 'Your turn! First name the scale — natural minor, Dorian or melodic minor. Then write two swung licks as numbers, and sing one back.', he: 'תורכם! קודם זהו את הסולם — מינור טבעי, דורי או מינור מלודי. אחר כך כתבו שני ליקים בסווינג כמספרים, ושירו אחד בחזרה.' },
        play: [notes([65, 67, 68, 70, 72, 74, 76, 77])],
        show: { text: { en: 'natural · Dorian · melodic', he: 'טבעי · דורי · מלודי' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Slash chords
  {
    id: 'slash-chords',
    area: 'harmony',
    emoji: '➗',
    title: { en: 'Slash chords: a new floor', he: 'אקורדים עם לוכסן: רצפה חדשה' },
    takeaway: { en: 'C/E means a C chord with E in the bass: the bass can be the root, 3rd, 5th — or a note outside the chord.', he: 'C/E פירושו אקורד דו עם מי בבס: הבס יכול להיות השורש, הטרצה, הקווינטה — או צליל מחוץ לאקורד.' },
    steps: [
      {
        say: { en: 'Hey {name}! A slash chord is a chord over a bass note. C/E means a C chord with E at the bottom. Same chord, new floor.', he: 'היי {name}! אקורד עם לוכסן הוא אקורד מעל צליל בס. C/E פירושו אקורד דו עם מי למטה. אותו אקורד, רצפה חדשה.' },
        play: [{ kind: 'note', midi: 40, duration: 0.8 }, chord([40, 60, 64, 67], 1.8)],
        show: { notes: [40, 60, 64, 67], chord: true, key: 'C', text: { en: 'C/E', he: 'C/E' } },
      },
      {
        say: { en: 'Bass on the root first: plain C. Solid and grounded, nothing to add.', he: 'קודם בס על השורש: דו רגיל. יציב ומקורקע, אין מה להוסיף.' },
        play: [{ kind: 'note', midi: 48, duration: 0.8 }, chord([48, 60, 64, 67], 1.8)],
        show: { notes: [48, 60, 64, 67], chord: true, key: 'C', text: { en: 'C', he: 'C' } },
      },
      {
        say: { en: 'Bass on the 3rd: C/E. Lighter, as if the chord stands on tiptoe.', he: 'בס על הטרצה: C/E. קליל יותר, כאילו האקורד עומד על קצות האצבעות.' },
        play: [{ kind: 'note', midi: 40, duration: 0.8 }, chord([40, 60, 64, 67], 1.8)],
        show: { notes: [40, 60, 64, 67], chord: true, key: 'C', text: { en: 'C/E = 3rd', he: 'C/E = טרצה' } },
      },
      {
        say: { en: 'Bass on the 5th: C/G. It floats, waiting for something to happen.', he: 'בס על הקווינטה: C/G. הוא מרחף, מחכה שמשהו יקרה.' },
        play: [{ kind: 'note', midi: 43, duration: 0.8 }, chord([43, 60, 64, 67], 1.8)],
        show: { notes: [43, 60, 64, 67], chord: true, key: 'C', text: { en: 'C/G = 5th', he: 'C/G = קווינטה' } },
      },
      {
        say: { en: 'The bass can also sit outside the chord. C/D sounds open and modern; C/B♭ hides a bluesy 7th underneath.', he: 'הבס יכול גם לשבת מחוץ לאקורד. C/D נשמע פתוח ומודרני; C/B♭ מחביא ספטימה בלוזית מתחת.' },
        play: [{ kind: 'note', midi: 50, duration: 0.7 }, chord([50, 60, 64, 67], 1.5), rest(0.4), { kind: 'note', midi: 46, duration: 0.7 }, chord([46, 60, 64, 67], 1.5)],
        show: { text: { en: 'C/D · C/F · C/B♭', he: 'C/D · C/F · C/B♭' } },
      },
      {
        say: { en: 'Bass notes tell a story too. In 1, 7, 6, 5 the bass walks down the scale — C, B, A, G — and the chords follow.', he: 'גם צלילי הבס מספרים סיפור. ב־1, 7, 6, 5 הבס יורד בסולם — דו, סי, לה, סול — והאקורדים הולכים אחריו.' },
        play: [chord([48, 55, 60, 64], 1), chord([47, 55, 59, 62], 1), chord([45, 57, 60, 64], 1), chord([43, 55, 59, 62], 1.5)],
        show: { notes: [48, 47, 45, 43], key: 'C', clef: 'bass', text: { en: '1 – 7 – 6 – 5', he: '1 – 7 – 6 – 5' } },
      },
      {
        say: { en: 'Your turn! You hear the bass note, then the chord — tell me which note is in the bass. Later, write a bass line as numbers, like 1, 7, 6, 5.', he: 'תורכם! תשמעו את צליל הבס, ואז את האקורד — אמרו לי איזה צליל בבס. אחר כך כתבו קו בס כמספרים, כמו 1, 7, 6, 5.' },
        play: [{ kind: 'note', midi: 45, duration: 0.8 }, chord([45, 65, 69, 72], 1.8)],
        show: { text: { en: 'Which note is in the bass?', he: 'איזה צליל בבס?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: 6th-diminished scales
  {
    id: 'bh-scale',
    area: 'jazz',
    emoji: '🎹',
    title: { en: 'Barry Harris: the 6th-diminished scale', he: 'בארי האריס: סולם 6 דימיניש' },
    takeaway: { en: 'C6 (C E G A) and B°7 (B D F A♭) take turns: C D E F G A♭ A B — eight notes, rest and tension alternating.', he: 'C6 (דו מי סול לה) ו־B°7 (סי רה פה לה במול) מתחלפים: דו רה מי פה סול לה במול לה סי — שמונה צלילים, מנוחה ומתח לסירוגין.' },
    steps: [
      {
        say: { en: 'Hey {name}! Barry Harris — the bebop pianist and much-loved teacher — built his harmony from just two chords, moving together.', he: 'היי {name}! בארי האריס — פסנתרן הביבופ והמורה האהוב — בנה את כל ההרמוניה שלו משני אקורדים בלבד, שזזים יחד.' },
        play: [chord(C6, 1.2), chord(B_DIM, 1.2), chord(C6, 1.6)],
        show: { text: { en: 'C6 + B°7', he: 'C6 + B°7' } },
      },
      {
        say: { en: 'The first is a major 6 chord: C, E, G, A. Warm and settled — home.', he: 'הראשון הוא אקורד מז׳ור 6: דו, מי, סול, לה. חם ורגוע — בית.' },
        play: [chord(C6, 1.1, true), chord(C6, 1.4)],
        show: { notes: C6, chord: true, key: 'C', text: { en: 'C6', he: 'C6' } },
      },
      {
        say: { en: 'The second is a diminished 7th: B, D, F, A♭ — stacked minor thirds. Tense, and it wants to go home.', he: 'השני הוא אקורד דימיניש: סי, רה, פה, לה במול — טרצות קטנות אחת על השנייה. מתוח, ורוצה הביתה.' },
        play: [chord(B_DIM, 1.1, true), chord(B_DIM, 1.2), chord(C6, 1.4)],
        show: { notes: B_DIM, chord: true, key: 'C', text: { en: 'B°7', he: 'B°7' } },
      },
      {
        say: { en: 'Weave them together and you get the C 6th-diminished scale: C, D, E, F, G, A♭, A, B. Eight notes, not seven.', he: 'שוזרים אותם יחד ומקבלים את סולם דו 6 דימיניש: דו, רה, מי, פה, סול, לה במול, לה, סי. שמונה צלילים, לא שבעה.' },
        play: [notes(SIXDIM_C)],
        show: { notes: SIXDIM_C, key: 'C', text: { en: 'C D E F G A♭ A B', he: 'C D E F G A♭ A B' } },
      },
      {
        say: { en: 'Here is the magic: give every scale note its chord, and they alternate — 6 chord, diminished, 6 chord. Rest, tension, rest.', he: 'וזה הקסם: נותנים לכל צליל בסולם את האקורד שלו, והם מתחלפים — אקורד 6, דימיניש, אקורד 6. מנוחה, מתח, מנוחה.' },
        play: HARMONISED.map((c, i) => chord(c, i === HARMONISED.length - 1 ? 1.4 : 0.7)),
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '6 · ° · 6 · ° · 6', he: '6 · ° · 6 · ° · 6' } },
      },
      {
        say: { en: 'Make the 6 chord minor — C, E♭, G, A — and you get the minor 6th-diminished scale. Same idea, darker home.', he: 'הופכים את אקורד ה־6 למינור — דו, מי במול, סול, לה — ומקבלים את סולם מינור 6 דימיניש. אותו רעיון, בית כהה יותר.' },
        play: [chord([60, 63, 67, 69], 1), notes([60, 62, 63, 65, 67, 68, 69, 71, 72])],
        show: { notes: [60, 62, 63, 65, 67, 68, 69, 71, 72], key: 'C', text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
      {
        say: { en: 'How to spot it: listen near the top. G, A♭, A — two half steps in a row. A plain major scale just goes G, A, B.', he: 'איך מזהים: הקשיבו למעלה. סול, לה במול, לה — שני חצאי טונים ברצף. סולם מז׳ור רגיל פשוט עושה סול, לה, סי.' },
        play: [notes([67, 68, 69, 71, 72], 0.34), rest(0.5), notes([67, 69, 71, 72], 0.34)],
        show: { notes: [67, 68, 69, 71, 72], key: 'C', text: { en: 'G A♭ A B', he: 'G A♭ A B' } },
      },
      {
        say: { en: 'Your turn! Hear a scale up and down: is it the 6th-diminished scale or another? Count the notes — the others have seven. Sometimes you hear one note: does it live in the 6 chord or the diminished?', he: 'תורכם! תשמעו סולם עולה ויורד: האם זה סולם 6 דימיניש או סולם אחר? ספרו את הצלילים — לאחרים יש שבעה. לפעמים תשמעו צליל אחד: הוא גר באקורד ה־6 או בדימיניש?' },
        play: [notes([65, 67, 69, 70, 72, 73, 74, 76, 77], 0.28)],
        show: { text: { en: '6 or °?', he: '6 או °?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: dim → dominant / minor 6
  {
    id: 'bh-convert',
    area: 'jazz',
    emoji: '🪄',
    title: { en: 'Barry Harris: the diminished chord changes', he: 'בארי האריס: הדימיניש משנה צורה' },
    takeaway: { en: 'Lower one note of a dim7 a half step → a dominant 7 on that note. Raise one → a minor 6 a fourth above it.', he: 'מורידים צליל אחד בדימיניש בחצי טון → דומיננט 7 על הצליל הזה. מעלים צליל אחד → מינור 6 קוורטה מעליו.' },
    steps: [
      {
        say: { en: 'Hey {name}! Time for Barry Harris’s favourite magic trick. Start with a diminished chord: B, D, F, A♭.', he: 'היי {name}! הגיע הזמן לטריק הקסם האהוב של בארי האריס. מתחילים באקורד דימיניש: סי, רה, פה, לה במול.' },
        play: [chord(B_DIM, 1.1, true), chord(B_DIM, 1.4)],
        show: { notes: B_DIM, chord: true, key: 'C', text: { en: 'B°7', he: 'B°7' } },
      },
      {
        say: { en: 'Every note is a minor third from the next. It is perfectly symmetrical, so it belongs to no single key — it can turn into many chords.', he: 'כל צליל רחוק טרצה קטנה מהבא. הוא סימטרי לגמרי, ולכן לא שייך לאף סולם אחד — הוא יכול להפוך להרבה אקורדים.' },
        play: [notes([59, 62, 65, 68, 71], 0.4)],
        show: { notes: [59, 62, 65, 68, 71], key: 'C', text: { en: '3 + 3 + 3 + 3', he: '3 + 3 + 3 + 3' } },
      },
      {
        say: { en: 'Lower just one note a half step. A♭ drops to G, and the chord becomes G7, a dominant. The lowered note is its root.', he: 'מורידים צליל אחד בחצי טון. לה במול יורד לסול, והאקורד הופך לסול 7, דומיננט. הצליל שירד הוא השורש שלו.' },
        play: [chord(B_DIM, 1), rest(0.2), chord(G7, 1.6)],
        show: { notes: G7, chord: true, key: 'C', text: { en: 'A♭ ↓ G → G7', he: 'A♭ ↓ G → G7' } },
      },
      {
        say: { en: 'Any of the four notes works. Lower F to E and you get E7. Four notes, four dominants.', he: 'זה עובד עם כל אחד מארבעת הצלילים. מורידים את פה למי ומקבלים מי 7. ארבעה צלילים, ארבעה דומיננטים.' },
        play: [chord(B_DIM, 1), rest(0.2), chord(E7, 1.6)],
        show: { notes: E7, chord: true, key: 'C', text: { en: 'F ↓ E → E7', he: 'F ↓ E → E7' } },
      },
      {
        say: { en: 'Now go up: raise one note a half step. B rises to C, and you get F minor 6 — F, A♭, C, D. The root is a fourth above the note you raised.', he: 'עכשיו למעלה: מעלים צליל אחד בחצי טון. סי עולה לדו, ומקבלים פה מינור 6 — פה, לה במול, דו, רה. השורש נמצא קוורטה מעל הצליל שעלה.' },
        play: [chord(B_DIM, 1), rest(0.2), chord(FM6, 1.6)],
        show: { notes: FM6, chord: true, key: 'C', text: { en: 'B ↑ C → Fm6', he: 'B ↑ C → Fm6' } },
      },
      {
        say: { en: 'So: down makes a dominant — bright, bluesy, pulling forward. Up makes a minor 6 — darker and softer. Back to back:', he: 'אז: למטה עושה דומיננט — מואר, בלוזי, מושך קדימה. למעלה עושה מינור 6 — כהה ורך יותר. אחד אחרי השני:' },
        play: [chord(G7, 1.4), rest(0.4), chord(FM6, 1.4)],
        show: { text: { en: '↓ = 7 · ↑ = m6', he: '↓ = 7 · ↑ = m6' } },
      },
      {
        say: { en: 'Your turn! You hear the diminished chord, then one note moves. Dominant 7 or minor 6? Later, find which note moved, and name the chord.', he: 'תורכם! תשמעו את הדימיניש, ואז צליל אחד זז. דומיננט 7 או מינור 6? בהמשך תמצאו איזה צליל זז, ותתנו לאקורד שם.' },
        play: [chord([60, 63, 66, 69], 1), rest(0.2), chord([60, 63, 66, 68], 1.6)],
        show: { text: { en: '7 or m6?', he: '7 או m6?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: one or two notes
  {
    id: 'bh-convert-2',
    area: 'jazz',
    emoji: '🔀',
    title: { en: 'Barry Harris: moving one or two notes', he: 'בארי האריס: להזיז צליל אחד או שניים' },
    takeaway: { en: 'One note down → dominant 7; one up → minor 6; two neighbours up or down together → major 6.', he: 'צליל אחד למטה → דומיננט 7; אחד למעלה → מינור 6; שני שכנים יחד למעלה או למטה → מז׳ור 6.' },
    steps: [
      {
        say: { en: 'Hey {name}! Quick recap. From B diminished, lower one note and you get a dominant, G7. Raise one and you get a minor 6, F minor 6.', he: 'היי {name}! תזכורת קצרה. מסי דימיניש, מורידים צליל אחד ומקבלים דומיננט, סול 7. מעלים אחד ומקבלים מינור 6, פה מינור 6.' },
        play: [chord(B_DIM, 1), chord(G7, 1.2), rest(0.3), chord(B_DIM, 1), chord(FM6, 1.2)],
        show: { text: { en: 'B°7 → G7 · Fm6', he: 'B°7 → G7 · Fm6' } },
      },
      {
        say: { en: 'Now move two neighbours together. Raise B and D to C and E♭: you get A♭6 — A♭, C, E♭, F. A major 6, sunny and settled.', he: 'עכשיו מזיזים שני שכנים יחד. מעלים את סי ורה לדו ומי במול: מקבלים לה במול 6 — לה במול, דו, מי במול, פה. מז׳ור 6, שמשי ורגוע.' },
        play: [chord(B_DIM, 1), rest(0.2), chord([60, 63, 65, 68], 1.6)],
        show: { notes: [60, 63, 65, 68], chord: true, key: 'C', text: { en: 'B D ↑ → A♭6', he: 'B D ↑ → A♭6' } },
      },
      {
        say: { en: 'Or lower two neighbours: B and D drop to B♭ and D♭. Now it is D♭6 — D♭, F, A♭, B♭. Another major 6.', he: 'או מורידים שני שכנים: סי ורה יורדים לסי במול ורה במול. עכשיו זה רה במול 6 — רה במול, פה, לה במול, סי במול. עוד מז׳ור 6.' },
        play: [chord(B_DIM, 1), rest(0.2), chord([58, 61, 65, 68], 1.6)],
        show: { notes: [58, 61, 65, 68], chord: true, key: 'C', text: { en: 'B D ↓ → D♭6', he: 'B D ↓ → D♭6' } },
      },
      {
        say: { en: 'This is the heart of Barry’s method: the diminished chord is the engine. Nudge it a half step and you land on the chord you need.', he: 'זה הלב של השיטה של בארי: הדימיניש הוא המנוע. דוחפים אותו בחצי טון ונוחתים על האקורד שצריך.' },
        play: [chord(B_DIM, 0.9), chord(G7, 0.9), chord([48, 64, 67, 69], 1.5)],
        show: { text: { en: 'B°7 → G7 → C6', he: 'B°7 → G7 → C6' } },
      },
      {
        say: { en: 'Three colours to tell apart. Dominant 7: restless. Minor 6: dark and soft. Major 6: bright and at rest.', he: 'שלושה צבעים להבחין ביניהם. דומיננט 7: חסר מנוחה. מינור 6: כהה ורך. מז׳ור 6: מואר ונח.' },
        play: [chord(G7, 1.2), rest(0.3), chord(FM6, 1.2), rest(0.3), chord([60, 63, 65, 68], 1.4)],
        show: { text: { en: '7 · m6 · 6', he: '7 · m6 · 6' } },
      },
      {
        say: { en: 'A listening tip: still restless? Probably the dominant. Sounds finished? It is a 6 chord — then ask: sunny major or shadowy minor?', he: 'טיפ להאזנה: עדיין חסר מנוחה? כנראה דומיננט. נשמע גמור? זה אקורד 6 — ואז שאלו: מז׳ור שמשי או מינור מוצל?' },
        play: [chord(FM6, 1.2), rest(0.3), chord([60, 63, 65, 68], 1.4)],
        show: { text: { en: 'm6 or 6?', he: 'm6 או 6?' } },
      },
      {
        say: { en: 'Your turn! The diminished chord sounds, then one or two notes move. What did it become: dominant, minor 6 or major 6? On the next level, name the exact chord.', he: 'תורכם! הדימיניש נשמע, ואז צליל אחד או שניים זזים. למה הוא הפך: דומיננט, מינור 6 או מז׳ור 6? ברמה הבאה תתנו לאקורד את השם המדויק.' },
        play: [chord([60, 63, 66, 69], 1), rest(0.2), chord([61, 64, 66, 69], 1.6)],
        show: { text: { en: '7 · m6 · 6', he: '7 · m6 · 6' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: one dim, four keys
  {
    id: 'bh-keys',
    area: 'jazz',
    emoji: '🗝️',
    title: { en: 'Barry Harris: one diminished, four keys', he: 'בארי האריס: דימיניש אחד, ארבעה סולמות' },
    takeaway: { en: 'B°7 makes G7, B♭7, D♭7 and E7 — doors to C, E♭, G♭ and A, four keys a minor third apart.', he: 'B°7 יוצר G7, B♭7, D♭7 ו־E7 — דלתות לדו, מי במול, סול במול ולה, ארבעה סולמות במרחק טרצה קטנה.' },
    steps: [
      {
        say: { en: 'Hey {name}! You can turn a diminished chord into a dominant. Now follow it home. Lower A♭ to G: G7, which resolves to C.', he: 'היי {name}! אתם כבר יודעים להפוך דימיניש לדומיננט. עכשיו נלך איתו הביתה. מורידים את לה במול לסול: סול 7, שנפתר לדו.' },
        play: [chord(B_DIM, 0.9), chord(G7, 0.9), chord([60, 72, 76, 79], 1.4)],
        show: { text: { en: 'B°7 → G7 → C', he: 'B°7 → G7 → C' } },
      },
      {
        say: { en: 'Lower F to E instead: E7, which goes home to A — a minor third below C.', he: 'הפעם מורידים את פה למי: מי 7, שהולך הביתה ללה — טרצה קטנה מתחת לדו.' },
        play: [chord(B_DIM, 0.9), chord(E7, 0.9), chord([57, 69, 73, 76], 1.4)],
        show: { text: { en: 'B°7 → E7 → A', he: 'B°7 → E7 → A' } },
      },
      {
        say: { en: 'Lower B to B♭: B♭7, heading to E♭ — a minor third above C.', he: 'מורידים את סי לסי במול: סי במול 7, בדרך למי במול — טרצה קטנה מעל דו.' },
        play: [chord(B_DIM, 0.9), chord([58, 62, 65, 68], 0.9), chord([51, 63, 67, 70], 1.4)],
        show: { text: { en: 'B°7 → B♭7 → E♭', he: 'B°7 → B♭7 → E♭' } },
      },
      {
        say: { en: 'And lower D to D♭: D♭7, which lands on G♭ — a tritone away, the far side of the circle.', he: 'ומורידים את רה לרה במול: רה במול 7, שנוחת על סול במול — טריטון משם, הצד הרחוק של המעגל.' },
        play: [chord(B_DIM, 0.9), chord([59, 61, 65, 68], 0.9), chord([54, 66, 70, 73], 1.4)],
        show: { text: { en: 'B°7 → D♭7 → G♭', he: 'B°7 → D♭7 → G♭' } },
      },
      {
        say: { en: 'So one diminished chord is a doorway to four keys: C, E♭, G♭ and A, each a minor third apart. Barry used this to slip between keys.', he: 'אז דימיניש אחד הוא דלת לארבעה סולמות: דו, מי במול, סול במול ולה, כל אחד במרחק טרצה קטנה. בארי השתמש בזה כדי לחמוק בין סולמות.' },
        play: [chord([48, 60, 64, 67], 0.8), chord([51, 58, 63, 67], 0.8), chord([54, 58, 61, 66], 0.8), chord([45, 57, 61, 64], 1.2)],
        show: { text: { en: 'C · E♭ · G♭ · A', he: 'C · E♭ · G♭ · A' } },
      },
      {
        say: { en: 'A tip: hum the first home note and keep it. When the new home arrives, is it the same, three half steps up or down, or the strange tritone?', he: 'טיפ: זמזמו את צליל הבית הראשון ושמרו אותו. כשהבית החדש מגיע — הוא אותו צליל, שלושה חצאי טונים למעלה או למטה, או הטריטון המוזר?' },
        play: [{ kind: 'note', midi: 60, duration: 0.8 }, { kind: 'note', midi: 63, duration: 0.8 }, rest(0.4), { kind: 'note', midi: 60, duration: 0.8 }, { kind: 'note', midi: 57, duration: 0.8 }],
        show: { text: { en: 'same · ↑3 · ↓3 · tritone', he: 'אותו · ↑3 · ↓3 · טריטון' } },
      },
      {
        say: { en: 'Your turn! First the reference: diminished, G7, C. Then the same diminished chord goes somewhere else. Same key, a minor third up, a minor third down, or a tritone away?', he: 'תורכם! קודם הדוגמה: דימיניש, סול 7, דו. ואז אותו דימיניש הולך למקום אחר. אותו סולם, טרצה קטנה למעלה, טרצה קטנה למטה, או טריטון?' },
        play: [chord(B_DIM, 0.9), chord(G7, 0.9), chord([60, 72, 76, 79], 1.4)],
        show: { text: { en: 'same · ↑m3 · ↓m3 · tritone', he: 'אותו · ↑3 · ↓3 · טריטון' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: 6 chord over everything
  {
    id: 'bh-six-over',
    area: 'jazz',
    emoji: '🧩',
    title: { en: 'Barry Harris: which 6 chord over it?', he: 'בארי האריס: איזה אקורד 6 מעליו?' },
    takeaway: { en: 'maj7 → the 6 on its root; m7 → the major 6 a minor third up; 7 → the minor 6 on its 5th (and more for ø7, alt, sus).', he: 'maj7 → ה־6 על השורש; m7 → מז׳ור 6 טרצה קטנה למעלה; 7 → מינור 6 על הקווינטה (ועוד לחצי־מוקטן, אלטרד וסאס).' },
    steps: [
      {
        say: { en: 'Hey {name}! Barry Harris taught that almost any chord can be played as a 6 chord — major 6 or minor 6. Learn a few 6 chords, and you can play over everything.', he: 'היי {name}! בארי האריס לימד שכמעט כל אקורד אפשר לנגן כאקורד 6 — מז׳ור 6 או מינור 6. לומדים כמה אקורדי 6, ויכולים לנגן מעל הכול.' },
        play: [chord(C6, 1, true), chord([48, 64, 67, 69, 72], 1.4)],
        show: { notes: C6, chord: true, key: 'C', text: { en: '6 + 6 + 6 = everything', he: '6 + 6 + 6 = הכול' } },
      },
      {
        say: { en: 'Over Cmaj7, play C6: C, E, G, A. Same root — sweet and simple.', he: 'מעל Cmaj7 מנגנים C6: דו, מי, סול, לה. אותו שורש — מתוק ופשוט.' },
        play: [chord([48, 64, 67, 69, 72], 1.6)],
        show: { notes: [48, 64, 67, 69, 72], chord: true, key: 'C', text: { en: 'Cmaj7 → C6', he: 'Cmaj7 → C6' } },
      },
      {
        say: { en: 'Over a minor 7, go up a minor third. Dm7 is D, F, A, C; F6 is F, A, C, D — the very same notes!', he: 'מעל מינור 7 עולים טרצה קטנה. Dm7 הוא רה, פה, לה, דו; F6 הוא פה, לה, דו, רה — בדיוק אותם צלילים!' },
        play: [chord([50, 65, 69, 72, 74], 1.6)],
        show: { notes: [50, 65, 69, 72, 74], chord: true, key: 'C', text: { en: 'Dm7 → F6', he: 'Dm7 → F6' } },
      },
      {
        say: { en: 'Over a dominant 7, play the minor 6 on its 5th. Over G7, D minor 6: D, F, A, B — the 5th, ♭7, 9th and 3rd of G7.', he: 'מעל דומיננט 7 מנגנים מינור 6 על הקווינטה שלו. מעל G7, רה מינור 6: רה, פה, לה, סי — הקווינטה, הספטימה, הנונה והטרצה של G7.' },
        play: [chord([43, 62, 65, 69, 71], 1.6)],
        show: { notes: [43, 62, 65, 69, 71], chord: true, key: 'C', text: { en: 'G7 → Dm6', he: 'G7 → Dm6' } },
      },
      {
        say: { en: 'Put it together: Dm7, G7, Cmaj7 become F6, D minor 6, C6 — and the bass does the rest.', he: 'מחברים: Dm7, G7, Cmaj7 הופכים ל־F6, רה מינור 6, C6 — והבס עושה את השאר.' },
        play: [chord([50, 65, 69, 72, 74], 1.1), chord([43, 62, 65, 69, 71], 1.1), chord([48, 64, 67, 69, 72], 1.6)],
        show: { text: { en: 'F6 · Dm6 · C6', he: 'F6 · Dm6 · C6' } },
      },
      {
        say: { en: 'Three more for later. Over m7♭5, the minor 6 a minor third up. Over an altered dominant, the minor 6 a half step up. Over 7sus, the major 6 a whole step down.', he: 'עוד שלושה להמשך. מעל m7♭5, מינור 6 טרצה קטנה למעלה. מעל דומיננט אלטרד, מינור 6 חצי טון למעלה. מעל 7sus, מז׳ור 6 טון שלם למטה.' },
        play: [chord([50, 65, 68, 72, 74], 1.2), rest(0.2), chord([43, 63, 65, 68, 71], 1.2), rest(0.2), chord([43, 65, 69, 72, 74], 1.4)],
        show: { text: { en: 'Dø → Fm6 · G7alt → A♭m6 · G7sus → F6', he: 'Dø → Fm6 · G7alt → A♭m6 · G7sus → F6' } },
      },
      {
        say: { en: 'Your turn! I name a chord, like G7 or Dm7, and you pick the 6 chord Barry plays over it. On the last level you only hear it: the chord, then four 6 chords over its bass.', he: 'תורכם! אני אומר שם של אקורד, כמו G7 או Dm7, ואתם בוחרים את אקורד ה־6 שבארי מנגן מעליו. ברמה האחרונה רק שומעים: את האקורד, ואז ארבעה אקורדי 6 מעל הבס שלו.' },
        play: [chord([43, 59, 65, 69], 1.3), rest(0.3), chord([43, 62, 65, 69, 71], 1.5)],
        show: { text: { en: 'G7 → ?6', he: 'G7 → ?6' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: half-step rules
  {
    id: 'bh-lines',
    area: 'jazz',
    emoji: '〰️',
    title: { en: 'Barry Harris: half steps in dominant lines', he: 'בארי האריס: חצאי טונים בקווי דומיננט' },
    takeaway: { en: 'Down the dominant scale, add half steps so chord tones land on the beat: one between 1 and ♭7; from 3, 5, 7 up to three; from 2, 4, 6 two.', he: 'בירידה בסולם הדומיננט מוסיפים חצאי טונים כדי שצלילי האקורד ינחתו על הפעמה: אחד בין 1 ל־♭7; מ־3, 5, 7 עד שלושה; מ־2, 4, 6 שניים.' },
    steps: [
      {
        say: { en: 'Hey {name}! Bebop lines sound smooth because the chord tones land on the beats. Barry Harris had clear rules for it, on the dominant scale.', he: 'היי {name}! קווי ביבופ נשמעים חלק כי צלילי האקורד נוחתים על הפעמות. לבארי האריס היו כללים ברורים לזה, על סולם הדומיננט.' },
        play: [chord(C7, 1.2, true), chord(C7, 1)],
        show: { notes: C7, chord: true, key: 'C', text: { en: 'C7: 1 3 5 ♭7', he: 'C7: 1 3 5 ♭7' } },
      },
      {
        say: { en: 'Walk straight down C7’s scale in eighths, and A, F and D land on the beats — not chord tones. It sounds a bit lost.', he: 'יורדים ישר בסולם של C7 בשמיניות, ועל הפעמות נוחתים לה, פה ורה — לא צלילי אקורד. זה נשמע קצת אבוד.' },
        play: [chord(C7, 0.8), rest(0.2), line(PLAIN_FROM_1)],
        show: { notes: PLAIN_FROM_1, key: 'C', text: { en: 'C B♭ A G F E D C', he: 'C B♭ A G F E D C' } },
      },
      {
        say: { en: 'Barry’s fix: add one half step, B, between 1 and ♭7. Now B♭, G, E and C all fall on the beat.', he: 'התיקון של בארי: מוסיפים חצי טון אחד, סי, בין 1 ל־♭7. עכשיו סי במול, סול, מי ודו נוחתים כולם על הפעמה.' },
        play: [chord(C7, 0.8), rest(0.2), line(FROM_1)],
        show: { notes: FROM_1, key: 'C', text: { en: 'C B B♭ A G F E D C', he: 'C B B♭ A G F E D C' } },
      },
      {
        say: { en: 'Why it works: each added note shifts the line by one eighth, sliding the chord tones back onto the beat.', he: 'למה זה עובד: כל צליל שמוסיפים מזיז את הקו בשמינית אחת, ומחזיר את צלילי האקורד לפעמה.' },
        play: [line(PLAIN_FROM_1, 120, 1), rest(0.4), line(FROM_1, 120, 1)],
        show: { text: { en: '+1 = back on the beat', he: '+1 = חזרה לפעמה' } },
      },
      {
        say: { en: 'Start on 3, 5 or ♭7 and you may add three: between 3 and 2, 2 and 1, 1 and ♭7. Each one only once.', he: 'מתחילים על 3, 5 או ♭7 ואפשר להוסיף שלושה: בין 3 ל־2, בין 2 ל־1, ובין 1 ל־♭7. כל אחד רק פעם אחת.' },
        play: [chord(C7, 0.8), rest(0.2), line(FROM_3_THREE)],
        show: { notes: FROM_3_THREE, key: 'C', text: { en: '3–2 · 2–1 · 1–♭7', he: '3–2 · 2–1 · 1–♭7' } },
      },
      {
        say: { en: 'Start on 2, 4 or 6 — notes outside the chord — and the rule is two: between 2 and 1, and between 1 and ♭7.', he: 'מתחילים על 2, 4 או 6 — צלילים מחוץ לאקורד — והכלל הוא שניים: בין 2 ל־1, ובין 1 ל־♭7.' },
        play: [chord(C7, 0.8), rest(0.2), line(FROM_2_TWO)],
        show: { notes: FROM_2_TWO, key: 'C', text: { en: '2–1 · 1–♭7', he: '2–1 · 1–♭7' } },
      },
      {
        say: { en: 'Your turn! You hear a dominant chord, then a line falling down its scale. Was the half step between 1 and ♭7 added? Later, count the extra half steps, and check that chord tones hit the beats.', he: 'תורכם! תשמעו אקורד דומיננט, ואז קו שיורד בסולם שלו. האם נוסף חצי הטון בין 1 ל־♭7? בהמשך תספרו את חצאי הטונים הנוספים, ותבדקו שצלילי האקורד נוחתים על הפעמות.' },
        play: [chord([55, 59, 62, 65], 0.8), rest(0.2), line([67, 65, 64, 62, 60, 59, 57, 55])],
        show: { text: { en: 'with or without?', he: 'עם או בלי?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: pivot
  {
    id: 'bh-pivot',
    area: 'jazz',
    emoji: '↩️',
    title: { en: 'Barry Harris: the pivot', he: 'בארי האריס: הפיבוט' },
    takeaway: { en: 'A pivot jumps the rest of a falling line up an octave, so it keeps going down without running out of room.', he: 'פיבוט מקפיץ את שארית הקו היורד אוקטבה למעלה, כך שהוא ממשיך לרדת בלי להיגמר לו המקום.' },
    steps: [
      {
        say: { en: 'Hey {name}! Scale lines love to run downhill — and sooner or later they hit the bottom of your instrument, or your voice.', he: 'היי {name}! קווי סולם אוהבים לרוץ במורד — ובשלב מסוים הם מגיעים לתחתית של הכלי, או של הקול.' },
        play: [line(FROM_1, 112)],
        show: { notes: FROM_1, key: 'C' },
      },
      {
        say: { en: 'Barry Harris’s answer is the pivot: at any moment, jump the rest of the line up an octave and keep falling. Same notes, more room.', he: 'התשובה של בארי האריס היא הפיבוט: בכל רגע, מקפיצים את שארית הקו אוקטבה למעלה וממשיכים לרדת. אותם צלילים, יותר מקום.' },
        play: [line([72, 71, 70, 69, 79, 77, 76, 74, 72], 112)],
        show: { notes: [72, 71, 70, 69, 79, 77, 76, 74, 72], key: 'C', text: { en: 'C B B♭ A ↑ G F E D C', he: 'C B B♭ A ↑ G F E D C' } },
      },
      {
        say: { en: 'Listen for the leap: the line walks down by step, then once — boing — it jumps up. Here it pivots later, before the 7th note.', he: 'הקשיבו לקפיצה: הקו יורד בצעדים, ופעם אחת — בוינג — הוא קופץ למעלה. כאן הפיבוט מאוחר יותר, לפני הצליל השביעי.' },
        play: [line([72, 71, 70, 69, 67, 65, 76, 74, 72], 112)],
        show: { notes: [72, 71, 70, 69, 67, 65, 76, 74, 72], key: 'C', text: { en: '1 2 3 4 5 6 ↑7', he: '1 2 3 4 5 6 ↑7' } },
      },
      {
        say: { en: 'Pivots keep a long line in a comfortable range, and the sudden leap gives it a fresh shape.', he: 'פיבוטים שומרים קו ארוך במנעד נוח, והקפיצה הפתאומית נותנת לו צורה רעננה.' },
        play: [line([60, 59, 58, 57, 55, 53, 52, 50, 48], 112), rest(0.4), line([60, 59, 58, 57, 67, 65, 64, 62, 60], 112)],
        show: { text: { en: 'low → pivot', he: 'נמוך → פיבוט' } },
      },
      {
        say: { en: 'The trick: count the notes as they go by, and say the number where the line suddenly jumps up. Here: 1, 2, 3 — and up on 4.', he: 'הטריק: ספרו את הצלילים תוך כדי, ואמרו את המספר שבו הקו קופץ פתאום למעלה. כאן: 1, 2, 3 — ולמעלה ב־4.' },
        play: [line([72, 71, 70, 81, 79, 77, 76, 74, 72], 112)],
        show: { notes: [72, 71, 70, 81, 79, 77, 76, 74, 72], key: 'C', text: { en: '1 2 3 ↑4', he: '1 2 3 ↑4' } },
      },
      {
        say: { en: 'Your turn! You hear one run that pivots once to stay in range. Before which note did it jump? Count along and catch the leap.', he: 'תורכם! תשמעו ריצה אחת שעושה פיבוט פעם אחת כדי להישאר במנעד. לפני איזה צליל היא קפצה? ספרו יחד ותפסו את הקפיצה.' },
        play: [line([67, 66, 65, 64, 62, 72, 71, 69, 67], 112)],
        show: { text: { en: 'before note…?', he: 'לפני צליל…?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: brother dominants
  {
    id: 'bh-brothers',
    area: 'jazz',
    emoji: '👬',
    title: { en: 'Barry Harris: brother dominants', he: 'בארי האריס: דומיננטים אחים' },
    takeaway: { en: 'G7, B♭7, D♭7 and E7 share one diminished chord (their ♭9), so they can stand in for each other; G7 ↔ D♭7 is the tritone sub.', he: 'G7, B♭7, D♭7 ו־E7 חולקים דימיניש אחד (ה־♭9 שלהם), ולכן יכולים להחליף זה את זה; G7 ↔ D♭7 הוא תחליף הטריטון.' },
    steps: [
      {
        say: { en: 'Hey {name}! Put G in the bass under B diminished, and you get G7♭9 — a dominant with a spicy flat nine.', he: 'היי {name}! שמים סול בבס מתחת לסי דימיניש, ומקבלים G7♭9 — דומיננט עם נונה במול חריפה.' },
        play: [chord(B_DIM, 1), rest(0.2), chord([43, ...B_DIM], 1.6)],
        show: { notes: [43, ...B_DIM], chord: true, key: 'C', text: { en: 'G + B°7 = G7♭9', he: 'G + B°7 = G7♭9' } },
      },
      {
        say: { en: 'Keep the same diminished chord and move the bass: B♭, D♭, E. Each makes another dominant 7♭9.', he: 'משאירים את אותו דימיניש ומזיזים את הבס: סי במול, רה במול, מי. כל אחד יוצר עוד דומיננט 7♭9.' },
        play: [chord([43, ...B_DIM], 0.9), chord([46, ...B_DIM], 0.9), chord([49, ...B_DIM], 0.9), chord([40, ...B_DIM], 1.3)],
        show: { text: { en: 'G7 · B♭7 · D♭7 · E7', he: 'G7 · B♭7 · D♭7 · E7' } },
      },
      {
        say: { en: 'In Barry Harris’s thinking they are one family — we call them brothers: four dominants a minor third apart, sharing one diminished chord. So they can stand in for one another.', he: 'בחשיבה של בארי האריס הם משפחה אחת — אנחנו קוראים להם אחים: ארבעה דומיננטים במרחק טרצה קטנה, שחולקים דימיניש אחד. ולכן הם יכולים להחליף זה את זה.' },
        play: [chord([43, ...B_DIM], 0.9), chord([46, ...B_DIM], 0.9), chord([48, 60, 64, 67], 1.4)],
        show: { notes: [43, 46, 49, 52], key: 'C', clef: 'bass', text: { en: 'G – B♭ – D♭ – E', he: 'G – B♭ – D♭ – E' } },
      },
      {
        say: { en: 'The brother a tritone away is the famous tritone sub. G7 and D♭7 share B and F, and both slide home to C.', he: 'האח שנמצא טריטון משם הוא תחליף הטריטון המפורסם. G7 ו־D♭7 חולקים את סי ופה, ושניהם מחליקים הביתה לדו.' },
        play: [chord([43, 59, 65], 0.9), chord([48, 60, 64], 1.1), rest(0.3), chord([49, 59, 65], 0.9), chord([48, 60, 64], 1.3)],
        show: { text: { en: 'G7 → C · D♭7 → C', he: 'G7 → C · D♭7 → C' } },
      },
      {
        say: { en: 'In the exercise you hear plain dominant 7s. Brothers have roots three or six half steps apart. Anything else: not related.', he: 'בתרגיל תשמעו דומיננטים 7 רגילים. לאחים יש שורשים במרחק שלושה או שישה חצאי טונים. כל מרחק אחר: לא קרובים.' },
        play: [chord([55, 65, 71, 74], 1), chord([58, 68, 74, 77], 1.2), rest(0.4), chord([55, 65, 71, 74], 1), chord([57, 67, 73, 76], 1.2)],
        show: { text: { en: 'G7 → B♭7 ✓ · G7 → A7 ✗', he: 'G7 → B♭7 ✓ · G7 → A7 ✗' } },
      },
      {
        say: { en: 'Your turn! Two dominant chords: brothers from the same diminished family, or not? Later, name the brother: a minor third up, a minor third down, or the tritone sub.', he: 'תורכם! שני אקורדי דומיננט: אחים מאותה משפחת דימיניש, או לא? בהמשך תזהו איזה אח: טרצה קטנה למעלה, טרצה קטנה למטה, או תחליף הטריטון.' },
        play: [chord([55, 65, 71, 74], 1), rest(0.2), chord([52, 62, 68, 71], 1.4)],
        show: { text: { en: 'brothers?', he: 'אחים?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Added chromatic half step
  {
    id: 'chromatic-added',
    area: 'jazz',
    emoji: '🧷',
    title: { en: 'Where is the added half step?', he: 'איפה נוסף חצי הטון?' },
    takeaway: { en: 'Jazz lines squeeze a half step into a whole-step gap of the scale — like Barry Harris’s 6th-diminished scale (A♭ between G and A).', he: 'קווי ג׳אז דוחסים חצי טון לתוך מרווח של טון שלם בסולם — כמו סולם 6 דימיניש של בארי האריס (לה במול בין סול ללה).' },
    steps: [
      {
        say: { en: 'Hey {name}! Jazz players love to squeeze an extra half step into a scale. The line slides, and the strong notes stay on the beat.', he: 'היי {name}! נגני ג׳אז אוהבים לדחוס חצי טון נוסף לתוך סולם. הקו מחליק, והצלילים החזקים נשארים על הפעמה.' },
        play: [line([72, 71, 70, 69, 67, 65, 64, 62, 60], 120)],
        show: { text: { en: '+ ½', he: '+ ½' } },
      },
      {
        say: { en: 'Plain C major first: C, D, E, F, G, A, B, C. Wherever two notes are a whole step apart, there is room for one more.', he: 'קודם דו מז׳ור רגיל: דו, רה, מי, פה, סול, לה, סי, דו. בכל מקום ששני צלילים רחוקים טון שלם, יש מקום לעוד אחד.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72])],
        show: { notes: [60, 62, 64, 65, 67, 69, 71, 72], key: 'C', text: { en: '1 2 3 4 5 6 7 8', he: '1 2 3 4 5 6 7 8' } },
      },
      {
        say: { en: 'Add A♭ between G and A — notes 5 and 6 — and you get Barry Harris’s 6th-diminished scale.', he: 'מוסיפים לה במול בין סול ללה — צלילים 5 ו־6 — ומקבלים את סולם 6 דימיניש של בארי האריס.' },
        play: [notes(SIXDIM_C)],
        show: { notes: SIXDIM_C, key: 'C', text: { en: '1 2 3 4 5 ♭ 6 7 8', he: '1 2 3 4 5 ♭ 6 7 8' } },
      },
      {
        say: { en: 'Another spot: between C and D, notes 1 and 2. Hear the little slide right at the start?', he: 'מקום אחר: בין דו לרה, צלילים 1 ו־2. שומעים את ההחלקה הקטנה ממש בהתחלה?' },
        play: [notes([60, 61, 62, 64, 65, 67, 69, 71, 72])],
        show: { notes: [60, 61, 62, 64, 65, 67, 69, 71, 72], key: 'C', text: { en: '1 ♯ 2 3 4 5 6 7 8', he: '1 ♯ 2 3 4 5 6 7 8' } },
      },
      {
        say: { en: 'Now the dominant scale, coming down: C, B♭, A, G, F, E, D, C. The classic added note is B, between C and B♭ — notes 1 and 2, counted from the top.', he: 'עכשיו סולם הדומיננט, בירידה: דו, סי במול, לה, סול, פה, מי, רה, דו. הצליל המוסף הקלאסי הוא סי, בין דו לסי במול — צלילים 1 ו־2, סופרים מלמעלה.' },
        play: [notes([72, 70, 69, 67, 65, 64, 62, 60]), rest(0.4), notes([72, 71, 70, 69, 67, 65, 64, 62, 60])],
        show: { notes: [72, 71, 70, 69, 67, 65, 64, 62, 60], key: 'C', text: { en: '1 ♮ 2 3 4 5 6 7 8', he: '1 ♮ 2 3 4 5 6 7 8' } },
      },
      {
        say: { en: 'The trick: count only the scale notes. The extra one is the tiny slide that gets no number — which two numbers does it squeeze between?', he: 'הטריק: ספרו רק את צלילי הסולם. הנוסף הוא ההחלקה הקטנה שלא מקבלת מספר — בין אילו שני מספרים הוא נדחס?' },
        play: [notes([60, 62, 64, 65, 66, 67, 69, 71, 72])],
        show: { notes: [60, 62, 64, 65, 66, 67, 69, 71, 72], key: 'C', text: { en: '1 2 3 4 ♯ 5 6 7 8', he: '1 2 3 4 ♯ 5 6 7 8' } },
      },
      {
        say: { en: 'Your turn! You hear a scale with one extra half step. Where is it — between which two notes? First the major scale going up; later the dominant scale coming down.', he: 'תורכם! תשמעו סולם עם חצי טון אחד נוסף. איפה הוא — בין אילו שני צלילים? קודם סולם מז׳ור בעלייה; אחר כך סולם הדומיננט בירידה.' },
        play: [notes([65, 67, 68, 69, 70, 72, 74, 76, 77])],
        show: { text: { en: 'between … and …?', he: 'בין … ל־…?' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: the singing track
  {
    id: 'vocal-barry',
    area: 'jazz',
    emoji: '🎤',
    title: { en: 'Sing the Barry Harris way', he: 'לשיר בדרך של בארי האריס' },
    takeaway: { en: 'Sing the 6th-diminished scale, sing the one note that turns a diminished chord into a dominant or minor 6, then sing half-step lines and the harmonised scale.', he: 'שרים את סולם 6 דימיניש, שרים את הצליל האחד שהופך דימיניש לדומיננט או למינור 6, ואז שרים קווים עם חצאי טונים ואת הסולם המהורמן.' },
    steps: [
      {
        say: { en: 'Hey {name}! Barry Harris taught by singing — in his workshops, whole rooms sang the scales and chords together. Now you sing his system.', he: 'היי {name}! בארי האריס לימד דרך שירה — בסדנאות שלו, אולמות שלמים שרו יחד את הסולמות והאקורדים. עכשיו אתם שרים את השיטה שלו.' },
        play: [chord(C6, 1), chord(B_DIM, 1), chord(C6, 1.4)],
        show: { text: { en: '7 levels', he: '7 רמות' } },
      },
      {
        say: { en: 'First, sing the 6th-diminished scale: C, D, E, F, G, A♭, A, B, C. Watch for A♭ and A, side by side.', he: 'קודם, שרים את סולם 6 דימיניש: דו, רה, מי, פה, סול, לה במול, לה, סי, דו. שימו לב ללה במול וללה, אחד ליד השני.' },
        play: [notes(SIXDIM_C, 0.36)],
        show: { notes: SIXDIM_C, key: 'C', text: { en: 'C D E F G A♭ A B C', he: 'C D E F G A♭ A B C' } },
      },
      {
        say: { en: 'Next, the diminished chord holds and you sing the one note that moves. To make G7 from B diminished, sing G — a half step below A♭.', he: 'אחר כך, הדימיניש מחזיק ואתם שרים את הצליל היחיד שזז. כדי להפוך סי דימיניש לסול 7, שירו סול — חצי טון מתחת ללה במול.' },
        play: [chord(B_DIM, 1.1), chord([59, 62, 65], 0.6), chord(G7, 1.6)],
        show: { notes: G7, chord: true, key: 'C', text: { en: 'B°7 → sing G → G7', he: 'B°7 → שירו G → G7' } },
      },
      {
        say: { en: 'Then by degree: “raise the lowest note”. B goes up to C, and your voice has made F minor 6. Lower makes dominants; raise makes minor 6s.', he: 'אחר כך לפי דרגה: "העלו את הצליל הנמוך". סי עולה לדו, והקול שלכם יצר פה מינור 6. הורדה יוצרת דומיננטים; העלאה יוצרת מינור 6.' },
        play: [chord(B_DIM, 1.1), chord(FM6, 1.6)],
        show: { notes: FM6, chord: true, key: 'C', text: { en: 'B ↑ C → Fm6', he: 'B ↑ C → Fm6' } },
      },
      {
        say: { en: 'Then it is your choice: sing any note a half step from the diminished, and I tell you what you made. Or hear a dominant and sing its home root — G7 goes to C.', he: 'ואז הבחירה שלכם: שירו כל צליל בחצי טון מהדימיניש, ואני אגיד לכם מה יצרתם. או שמעו דומיננט ושירו את שורש הבית שלו — סול 7 הולך לדו.' },
        play: [chord([55, 59, 62, 65], 1.3), { kind: 'note', midi: 60, duration: 1.4 }],
        show: { text: { en: 'G7 → C', he: 'G7 → C' } },
      },
      {
        say: { en: 'Then Barry’s half-step lines: sing down the dominant scale in eighths, with the added half steps keeping chord tones on the beat.', he: 'אחר כך הקווים של בארי עם חצאי הטונים: שרים בירידה בסולם הדומיננט בשמיניות, וחצאי הטונים הנוספים שומרים את צלילי האקורד על הפעמה.' },
        play: [line(FROM_1, 90)],
        show: { notes: FROM_1, key: 'C', text: { en: 'C B B♭ A G F E D C', he: 'C B B♭ A G F E D C' } },
      },
      {
        say: { en: 'Finally, the harmonised scale: you sing each note while the piano adds its chord underneath — 6, diminished, 6, diminished.', he: 'ולסיום, הסולם המהורמן: אתם שרים כל צליל והפסנתר מוסיף מתחתיו את האקורד שלו — 6, דימיניש, 6, דימיניש.' },
        play: HARMONISED.map((c, i) => chord(c, i === HARMONISED.length - 1 ? 1.4 : 0.8)),
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '6 · ° · 6 · ° · 6', he: '6 · ° · 6 · ° · 6' } },
      },
      {
        say: { en: 'Your turn! Start at level one: listen to the scale, then sing it up from C — eight notes, A♭ and A both in there. A clear “la” works best.', he: 'תורכם! מתחילים ברמה אחת: הקשיבו לסולם, ואז שירו אותו בעלייה מדו — שמונה צלילים, גם לה במול וגם לה. "לה" ברור עובד הכי טוב.' },
        play: [{ kind: 'note', midi: 60, duration: 1.2 }],
        show: { notes: [60], key: 'C', text: { en: 'sing from C', he: 'שירו מדו' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Play & improvise: backing tracks
  {
    id: 'perform-backing',
    area: 'play',
    emoji: '🥁',
    title: { en: 'Play along with the band', he: 'לנגן עם הלהקה' },
    takeaway: { en: 'The band: a walking bass (one note a beat), Charleston comping (beat 1 and the "and" of 2) and a swung ride — over ii–V–I, minor ii–V–i or blues.', he: 'הלהקה: בס מהלך (צליל לכל פעמה), ליווי צ׳רלסטון (פעמה 1 וה"ו" של 2) ורייד בסווינג — מעל ii–V–I, ii–V–i במינור או בלוז.' },
    steps: [
      {
        say: { en: 'Hey {name}! Time to play with a band — a tiny one living in your phone. Bass, piano and ride cymbal loop a chord chart while you join in.', he: 'היי {name}! הגיע הזמן לנגן עם להקה — קטנה, שגרה לכם בטלפון. בס, פסנתר ומצילת רייד מנגנים בלופ רצף אקורדים, ואתם מצטרפים.' },
        play: [band('ii-V-I', 132)],
        show: { text: { en: 'Dm7 | G7 | Cmaj7 | Cmaj7', he: 'Dm7 | G7 | Cmaj7 | Cmaj7' } },
      },
      {
        say: { en: 'The bass walks: one note per beat, climbing through the chord, then stepping into the next chord by a half step.', he: 'הבס מהלך: צליל אחד לכל פעמה, מטפס באקורד, ואז נכנס לאקורד הבא בחצי טון.' },
        play: [band('ii-V-I', 132, (m) => m < 55)],
        show: { text: { en: '♩ ♩ ♩ ♩', he: '♩ ♩ ♩ ♩' } },
      },
      {
        say: { en: 'The piano comps in the Charleston rhythm: on beat 1 and on the “and” of 2 — just the 3rd, the 7th and a colour note.', he: 'הפסנתר מלווה בקצב צ׳רלסטון: על פעמה 1 ועל ה"ו" של 2 — רק טרצה, ספטימה וצליל צבע.' },
        play: [band('ii-V-I', 132, (m) => m >= 55 && m < 90)],
        show: { text: { en: '1 (2) & …', he: '1 (2) ו …' } },
      },
      {
        say: { en: 'And the ride cymbal: ding, ding-a-ding, ding-a-ding — the swing that pushes everything forward.', he: 'ומצילת הרייד: דינג, דינג־א־דינג, דינג־א־דינג — הסווינג שדוחף הכול קדימה.' },
        play: [band('ii-V-I', 132, (m) => m >= 90)],
        show: { text: { en: 'ding, ding-a-ding', he: 'דינג, דינג־א־דינג' } },
      },
      {
        say: { en: 'Three charts to choose from: the major ii–V–I, the darker minor ii–V–i, and the 12-bar blues. Here is the minor one.', he: 'שלושה רצפים לבחירה: ii–V–I במז׳ור, ii–V–i הכהה יותר במינור, ובלוז של 12 תיבות. הנה המינורי.' },
        play: [band('minor-ii-V-i', 132)],
        show: { text: { en: 'Dø7 | G7♭9 | Cm6 | Cm6', he: 'Dø7 | G7♭9 | Cm6 | Cm6' } },
      },
      {
        say: { en: 'A good start: pick a slow tempo, play just the roots with the bass, then try the 3rds. Feel how they lock in.', he: 'התחלה טובה: בחרו טמפו איטי, נגנו רק את השורשים יחד עם הבס, ואז נסו את הטרצות. הרגישו איך הם ננעלים.' },
        play: [timed(100, [[50, 0, 2], [43, 2, 2], [48, 4, 2], [65, 6, 2], [59, 8, 2], [64, 10, 2]])],
        show: { text: { en: 'roots, then 3rds', he: 'שורשים, ואז טרצות' } },
      },
      {
        say: { en: 'Your turn! Choose a chart, a key and a tempo, press play, and join the band — on your instrument or with your voice. No score here: just groove.', he: 'תורכם! בחרו רצף, סולם וטמפו, לחצו על נגן, והצטרפו ללהקה — בכלי או בקול. אין כאן ציון: רק גרוב.' },
        play: [band('ii-V-I', 150)],
        show: { text: { en: 'chart · key · tempo · ▶', he: 'רצף · סולם · טמפו · ▶' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Play & improvise: guided improvisation
  {
    id: 'perform-improv',
    area: 'play',
    emoji: '🎶',
    title: { en: 'Improvise with a guide', he: 'לאלתר עם מדריך' },
    takeaway: { en: 'Chord tones on beats 1 and 3, end on a chord tone, mix rhythms, use range, and approach chord tones by a half step.', he: 'צלילי אקורד בפעמות 1 ו־3, סיום על צליל אקורד, קצבים מגוונים, מנעד רחב, וגישה לצלילי אקורד בחצי טון.' },
    steps: [
      {
        say: { en: 'Hey {name}! Improvising is not random notes — it is choices that fit the chords. I listen to your solo and give you five friendly pointers.', he: 'היי {name}! אלתור הוא לא צלילים אקראיים — הוא בחירות שמתאימות לאקורדים. אני מקשיב לסולו שלכם ונותן חמש הערות ידידותיות.' },
        play: [band('ii-V-I', 132)],
        show: { text: { en: '5 pointers', he: '5 הערות' } },
      },
      {
        say: { en: 'One: land on a chord tone — 1, 3, 5 or 7 — on beats 1 and 3. That is how a line “makes the changes”.', he: 'אחת: נחתו על צליל אקורד — 1, 3, 5 או 7 — בפעמות 1 ו־3. כך קו "עושה את ההרמוניה".' },
        play: [timed(120, [
          [50, 0, 4, 0.45], [60, 0, 4, 0.4], [65, 0, 4, 0.4],
          [43, 4, 4, 0.45], [59, 4, 4, 0.4], [65, 4, 4, 0.4],
          [48, 8, 4, 0.45], [59, 8, 4, 0.4], [64, 8, 4, 0.4],
          [69, 0, 1], [67, 1, 1], [65, 2, 1], [64, 3, 1], [74, 4, 1], [72, 5, 1], [71, 6, 1], [69, 7, 1], [67, 8, 2], [64, 10, 2],
        ])],
        show: { text: { en: 'beats 1 & 3 = chord tones', he: 'פעמות 1 ו־3 = צלילי אקורד' } },
      },
      {
        say: { en: 'Two: end on a chord tone of the last chord, so your solo sounds finished — not like a question. Hear the difference?', he: 'שתיים: סיימו על צליל של האקורד האחרון, כדי שהסולו יישמע גמור — לא כמו שאלה. שומעים את ההבדל?' },
        play: [chord([48, 59, 64, 77], 1.6), rest(0.4), chord([48, 59, 64, 76], 1.6)],
        show: { text: { en: 'F ✗ · E ✓', he: 'F ✗ · E ✓' } },
      },
      {
        say: { en: 'Three: mix your rhythms — eighths, a quarter, a long note, even a rest. Silence is part of the solo.', he: 'שלוש: גוונו את הקצב — שמיניות, רבע, צליל ארוך, ואפילו הפסקה. שקט הוא חלק מהסולו.' },
        play: [timed(120, [[62, 0, 0.5], [64, 0.5, 0.5], [65, 1, 0.5], [67, 1.5, 0.5], [69, 2, 1], [67, 3, 2], [64, 6, 0.5], [62, 6.5, 0.5], [60, 7, 1.5]])],
        show: { text: { en: 'eighths · quarter · long · rest', he: 'שמיניות · רבע · ארוך · הפסקה' } },
      },
      {
        say: { en: 'Four: use some range. Reach at least a sixth between your lowest and highest notes — C up to A, say.', he: 'ארבע: השתמשו במנעד. הגיעו לפחות לסקסטה בין הצליל הנמוך לגבוה — למשל מדו עד לה.' },
        play: [line([60, 64, 67, 69, 72, 69, 67, 64, 60], 120)],
        show: { notes: [60, 69], key: 'C', text: { en: 'C → A = 6th', he: 'C → A = סקסטה' } },
      },
      {
        say: { en: 'Five, the bebop spice: approach a chord tone from a half step away. D♯ slides into E, A♭ into G.', he: 'חמש, התבלין של הביבופ: גשו לצליל אקורד מחצי טון ממנו. רה דיאז מחליק למי, לה במול לסול.' },
        play: [timed(120, [[48, 0, 4, 0.45], [59, 0, 4, 0.4], [64, 0, 4, 0.4], [63, 0, 0.5], [64, 0.5, 1.5], [68, 2, 0.5], [67, 2.5, 1.5]])],
        show: { notes: [63, 64, 68, 67], key: 'C', text: { en: 'D♯ → E · A♭ → G', he: 'D♯ → E · A♭ → G' } },
      },
      {
        say: { en: 'Your turn! Pick a chart, listen for one bar, then improvise — sing, or play into the microphone, one note at a time. Then read your five scores and a tip or two.', he: 'תורכם! בחרו רצף, הקשיבו תיבה אחת, ואז אלתרו — בשירה, או בנגינה מול המיקרופון, צליל אחד בכל פעם. אחר כך קראו את חמשת הציונים וטיפ או שניים.' },
        play: [band('ii-V-I', 132, (m) => m < 90)],
        show: { text: { en: '1 bar → improvise!', he: 'תיבה אחת → אלתרו!' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Play & improvise: MIDI keyboard drills
  {
    id: 'perform-midi',
    area: 'play',
    emoji: '🎹',
    title: { en: 'Keyboard drills', he: 'תרגילי מקלדת' },
    takeaway: { en: 'Voicings (any, shell 1-3-7, rootless 3-5-7-9), play it back, an even scale, and ii–V–I with guide tones in all keys.', he: 'וויסינגים (כל וויסינג, של 1-3-7, בלי שורש 3-5-7-9), לנגן בחזרה, סולם אחיד, ו־ii–V–I עם צלילים מנחים בכל הסולמות.' },
    steps: [
      {
        say: { en: 'Hey {name}! Plug in a MIDI keyboard, or use the keys on screen, and let’s get jazz harmony into your hands. Four short drills.', he: 'היי {name}! חברו מקלדת MIDI, או השתמשו במקשים שעל המסך, ובואו נכניס הרמוניית ג׳אז לידיים. ארבעה תרגילים קצרים.' },
        play: [chord([60, 64, 67, 71], 1.6)],
        show: { text: { en: 'voicings · play back · scale · ii–V–I', he: 'וויסינגים · בחזרה · סולם · ii–V–I' } },
      },
      {
        say: { en: 'Voicings first. “Any voicing” means all four chord notes, in any order and octave. Cmaj7: C, E, G, B.', he: 'קודם וויסינגים. "כל וויסינג" פירושו כל ארבעת צלילי האקורד, בכל סדר ואוקטבה. Cmaj7: דו, מי, סול, סי.' },
        play: [chord([60, 64, 67, 71], 1, true), chord([55, 60, 64, 71], 1.4)],
        show: { notes: [60, 64, 67, 71], chord: true, key: 'C', text: { en: 'Cmaj7 = C E G B', he: 'Cmaj7 = C E G B' } },
      },
      {
        say: { en: 'A shell is exactly three notes: the root at the bottom, plus the 3rd and the 7th. Cmaj7 shell: C, E, B. Lean, and very jazz.', he: 'של (shell) הוא בדיוק שלושה צלילים: השורש למטה, ועוד הטרצה והספטימה. של של Cmaj7: דו, מי, סי. רזה, וג׳אזי מאוד.' },
        play: [chord([48, 52, 59], 1.6)],
        show: { notes: [48, 52, 59], chord: true, key: 'C', text: { en: 'shell 1-3-7', he: 'של 1-3-7' } },
      },
      {
        say: { en: 'Rootless: leave the root to the bass player and play 3, 5, 7 and 9. For Dm7: F, A, C, E.', he: 'בלי שורש: משאירים את השורש לבסיסט ומנגנים 3, 5, 7 ו־9. ל־Dm7: פה, לה, דו, מי.' },
        play: [{ kind: 'note', midi: 38, duration: 0.7 }, chord([38, 65, 69, 72, 76], 1.6)],
        show: { notes: [65, 69, 72, 76], chord: true, key: 'C', text: { en: 'Dm7 rootless: F A C E', he: 'Dm7 בלי שורש: F A C E' } },
      },
      {
        say: { en: '“Play it back”: hear five notes from C major and play them. “Even scale”: C major up and down, and I measure how steady you are.', he: '"לנגן בחזרה": שומעים חמישה צלילים מדו מז׳ור ומנגנים אותם. "סולם אחיד": דו מז׳ור למעלה ולמטה, ואני מודד כמה אתם יציבים.' },
        play: [notes([64, 67, 65, 69, 72], 0.45), rest(0.6), notes([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60], 0.24)],
        show: { notes: [60, 62, 64, 65, 67, 69, 71, 72], key: 'C' },
      },
      {
        say: { en: 'Last, ii–V–I in all twelve keys, around the circle: C, F, B♭ and on. Each chord needs at least its 3rd and 7th — the guide tones. Hear the 7th slide down to the next 3rd?', he: 'ולסיום, ii–V–I בכל שנים־עשר הסולמות, סביב המעגל: דו, פה, סי במול והלאה. כל אקורד צריך לפחות טרצה וספטימה — הצלילים המנחים. שומעים איך הספטימה מחליקה לטרצה הבאה?' },
        play: [chord([50, 60, 65], 1), chord([43, 59, 65], 1), chord([48, 59, 64], 1.6)],
        show: { text: { en: 'C → B · F → E', he: 'C → B · F → E' } },
      },
      {
        say: { en: 'Your turn! Pick a drill. On a MIDI keyboard, play the chord and let go; on the screen keys, tap the notes, then send. I tell you what is missing or extra.', he: 'תורכם! בחרו תרגיל. במקלדת MIDI, נגנו את האקורד ושחררו; במקשים שעל המסך, הקישו על הצלילים ואז שלחו. אני אגיד מה חסר ומה מיותר.' },
        play: [chord([43, 53, 58], 1), chord([48, 52, 58], 1), chord([41, 52, 57], 1.6)],
        show: { text: { en: 'Gm7 → C7 → Fmaj7', he: 'Gm7 → C7 → Fmaj7' } },
      },
    ],
  },
];

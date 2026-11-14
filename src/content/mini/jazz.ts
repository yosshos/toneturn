// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Jazz, slash chords, Barry Harris and the Play & improvise units.

import type { MiniLesson } from '../miniTypes';
import type { NoteEvent, Stimulus } from '../../engine/lesson';
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
/** The harmonised C6-diminished scale over the whole octave (top notes C up to C). */
const HARMONISED_FULL = [...HARMONISED, [59, 62, 65, 68], [60, 64, 67, 69], [62, 65, 68, 71], [64, 67, 69, 72]];
const tone = (midi: number, duration = 0.8): Stimulus => ({ kind: 'note', midi, duration });
/** Swung eighths (2 : 1), last note held a beat. */
const swung = (midis: number[], bpm = 132): Stimulus => ({ kind: 'melody', midis, beats: midis.map((_, i) => (i === midis.length - 1 ? 1 : i % 2 === 0 ? 2 / 3 : 1 / 3)), bpm });

// ---- Jazz round 2 (bh-family, bh-block, comping, turnarounds, guide-tones) — matches src/engine/topicsJazz.ts.
/** C6-diminished scale in Drop 2 block chords, top notes C5 … C6 (6 chord on C E G A, B°7 on D F A♭ B). */
const BLK = [
  [57, 64, 67, 72], // A E G C — C6
  [59, 65, 68, 74], // B F A♭ D — B°7
  [60, 67, 69, 76], // C G A E — C6
  [62, 68, 71, 77], // D A♭ B F — B°7
  [64, 69, 72, 79], // E A C G — C6
  [65, 71, 74, 80], // F B D A♭ — B°7
  [67, 72, 76, 81], // G C E A — C6
  [68, 74, 77, 83], // A♭ D F B — B°7
  [69, 76, 79, 84], // A E G C — C6
];
/** The same in minor (Cm6 + B°7), top notes C5 … C6. */
const BLK_MIN = [
  [57, 63, 67, 72],
  [59, 65, 68, 74],
  [60, 67, 69, 75],
  [62, 68, 71, 77],
  [63, 69, 72, 79],
  [65, 71, 74, 80],
  [67, 72, 75, 81],
  [68, 74, 77, 83],
  [69, 75, 79, 84],
];
const blocks = (cs: number[][], each = 0.5, last = 1.3): Stimulus[] => cs.map((c, i) => chord(c, i === cs.length - 1 ? last : each));
/** Swing groove: one bass note per beat + hi-hat, chord hits at beat positions (x.5 = the "and", played 2/3 through the beat). */
const groove = (bass: number[], hits: [number, number[], number][], straight = false, bpm = 120): Stimulus => {
  const b = 60 / bpm;
  const at = (x: number) => Math.floor(x) + (x % 1 ? (straight ? 0.5 : 2 / 3) : 0);
  const events: NoteEvent[] = [];
  bass.forEach((m, k) => {
    events.push({ midi: m, start: k * b, duration: b * 0.85, velocity: 0.6 });
    events.push({ midi: 42, start: k * b, duration: 0.05, velocity: k % 2 ? 0.3 : 0.18, perc: 'hat' });
  });
  for (const [pos, ms, len] of hits) for (const m of ms) events.push({ midi: m, start: at(pos) * b, duration: len * b, velocity: 0.5 });
  return { kind: 'events', events, length: bass.length * b + 0.3 };
};
const COMP_C7 = [58, 62, 64]; // B♭ D E = 7, 9, 3 of C7
const WALK_C7 = [48, 52, 55, 58, 48, 58, 55, 52];
/** Comping on C7: chord hits per bar (beats from 0; 1.5 = the "and" of 2). */
const comp = (bars: number[][], len = 0.45, straight = false): Stimulus =>
  groove(WALK_C7.slice(0, bars.length * 4), bars.flatMap((hs, bar) => hs.map((h): [number, number[], number] => [bar * 4 + h, COMP_C7, len])), straight);
/** Charleston on C7, then Fmaj7 anticipated on the "and" of 4 and held over the bar line. */
const ANTICIP = groove([48, 52, 55, 58, 53, 57, 60, 64], [[0, COMP_C7, 0.45], [1.5, COMP_C7, 0.45], [3.5, [57, 64, 67], 2]]);
// Turnaround chords in C: bass + guide tones and a colour note.
const T_C = [48, 55, 59, 64]; // Cmaj7: C G B E
const T_AM7 = [45, 55, 60, 64]; // A G C E
const T_DM7 = [50, 57, 60, 65]; // D A C F
const T_G7 = [43, 57, 59, 65]; // G A B F
const T_EM7 = [40, 55, 59, 62]; // E G B D
const T_A7 = [45, 55, 61, 64]; // A G C♯ E
const T_E7 = [40, 56, 59, 62]; // E G♯ B D
const T_D7 = [50, 57, 60, 66]; // D A C F♯
const T_EB7 = [51, 55, 61, 65]; // E♭ G D♭ F
const T_DB7 = [49, 59, 63, 65]; // D♭ C♭ E♭ F
const T_AB = [44, 55, 60, 63]; // A♭maj7: A♭ G C E♭
const turn = (cs: number[][], each = 0.75): Stimulus[] => [...cs, T_C].map((c, i) => chord(c, i === cs.length ? 1.4 : each));
// Guide-tone shells (bass, two guide tones) through ii–V–I in C.
const GT_A = [[50, 65, 72], [43, 65, 71], [48, 64, 71]]; // top 7–3–7: C B B
const GT_B = [[50, 60, 65], [43, 59, 65], [48, 59, 64]]; // top 3–7–3: F F E
const GT_A_MIN = [[50, 65, 72], [43, 65, 71], [48, 63, 70]]; // Dm7♭5 G7 Cm7: C B B♭
const GT_B_MIN = [[50, 60, 65], [43, 59, 65], [48, 58, 63]]; // F F E♭
const gt = (cs: number[][], each = 0.9): Stimulus[] => cs.map((c, i) => chord(c, i === cs.length - 1 ? 1.5 : each));
/** Swung line over ii–V–I shells, a guide tone on each chord's first beat: C (7 of Dm7), B (3 of G7), E (3 of Cmaj7). */
const GT_SOLO = timed(120, [
  [50, 0, 2, 0.45], [53, 0, 2, 0.45], [60, 0, 2, 0.45],
  [43, 2, 2, 0.45], [53, 2, 2, 0.45], [59, 2, 2, 0.45],
  [48, 4, 2, 0.45], [52, 4, 2, 0.45], [59, 4, 2, 0.45],
  [72, 0, 0.6, 0.75], [69, 2 / 3, 0.3, 0.75], [67, 1, 0.6, 0.75], [65, 5 / 3, 0.3, 0.75],
  [71, 2, 0.6, 0.75], [69, 8 / 3, 0.3, 0.75], [67, 3, 0.6, 0.75], [65, 11 / 3, 0.3, 0.75],
  [64, 4, 2, 0.75],
]);

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ Jazz 1
  {
    id: 'jazz-1',
    area: 'jazz',
    emoji: '🎷',
    title: { en: 'Seventh-chord colors', he: 'הצבעים של אקורדי ספטימה' },
    takeaway: { en: 'Four seventh chords — maj7 dreamy, 7 restless, m7 mellow, m7♭5 dark — and ii–V–I chains them home.', he: 'ארבעה אקורדי ספטימה — maj7 חולמני, 7 חסר מנוחה, m7 רך, m7♭5 אפל — ו־ii–V–I מחבר אותם הביתה.' },
    steps: [
      {
        say: { en: 'Hey {name}! Jazz rarely stops at three notes. Add a 7th on top of a chord and it gets a whole new color.', he: 'היי {name}! ג׳אז כמעט אף פעם לא נעצר בשלושה צלילים. מוסיפים ספטימה מעל האקורד, והוא מקבל צבע חדש לגמרי.' },
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
        say: { en: 'Your turn! Hear one chord and name its color: major 7, dominant 7, minor 7 or half-diminished. Then name the progression — count the chords, and listen for where home is.', he: 'תורכם! שמעו אקורד אחד ותנו לו שם: מז׳ור 7, דומיננט 7, מינור 7 או חצי־מוקטן. אחר כך זהו את המהלך — ספרו את האקורדים, והקשיבו איפה הבית.' },
        play: [chord([43, 59, 65, 69], 1.6)],
        show: { text: { en: 'maj7 · 7 · m7 · m7♭5', he: 'maj7 · 7 · m7 · m7♭5' } },
      },
    ],
    more: [
      {
        say: { en: 'A seventh chord stacks one more third on a triad: 1, 3, 5 and 7. Its color comes from two choices — the kind of triad, and the size of the 7th: major (11 half steps above the root) or minor (10).', he: 'אקורד ספטימה מוסיף עוד טרצה מעל משולש: 1, 3, 5 ו־7. הצבע שלו נקבע משתי בחירות — סוג המשולש, וגודל הספטימה: גדולה (11 חצאי טונים מעל השורש) או קטנה (10).' },
        play: [notes([60, 64, 67, 71], 0.4), chord([60, 64, 67, 71], 1.4)],
        show: { notes: [60, 64, 67, 71], chord: true, key: 'C', text: { en: '1 3 5 7', he: '1 3 5 7' } },
      },
      {
        say: { en: 'The four recipes. maj7: major triad, major 7th. 7: major triad, minor 7th. m7: minor triad, minor 7th. m7♭5: diminished triad, minor 7th. Here they are on C, one after another.', he: 'ארבעת המתכונים. maj7: משולש מז׳ור, ספטימה גדולה. 7: משולש מז׳ור, ספטימה קטנה. m7: משולש מינור, ספטימה קטנה. m7♭5: משולש מוקטן, ספטימה קטנה. הנה כולם על דו, אחד אחרי השני.' },
        play: [chord([60, 64, 67, 71], 1), chord([60, 64, 67, 70], 1), chord([60, 63, 67, 70], 1), chord([60, 63, 66, 70], 1.3)],
        show: { text: { en: 'Cmaj7 · C7 · Cm7 · Cm7♭5', he: 'Cmaj7 · C7 · Cm7 · Cm7♭5' } },
      },
      {
        say: { en: 'Why the dominant is restless: its 3rd and 7th — E and B♭ in C7 — form a tritone, the most unstable interval. In F the tritone resolves by half steps: E rises to F, B♭ falls to A.', he: 'למה הדומיננט חסר מנוחה: הטרצה והספטימה שלו — מי וסי במול ב־C7 — יוצרות טריטון, המרווח הכי לא יציב. ב־F הטריטון נפתר בחצאי טונים: מי עולה לפה, סי במול יורד ללה.' },
        play: [chord([48, 64, 70], 1.3), chord([53, 65, 69], 1.5)],
        show: { notes: [64, 70], chord: true, key: 'C', text: { en: 'E–B♭ → F–A', he: 'E–B♭ → F–A' } },
      },
      {
        say: { en: 'In a major key each degree has its own seventh chord: Imaj7, iim7, iiim7, IVmaj7, V7, vim7 and viiø7. There is only one dominant — V7 — which is why it points home so clearly.', he: 'בסולם מז׳ור לכל דרגה יש אקורד ספטימה משלה: Imaj7, iim7, iiim7, IVmaj7, V7, vim7 ו־viiø7. יש רק דומיננט אחד — V7 — ולכן הוא מצביע הביתה בבירור כזה.' },
        play: [chord([60, 64, 67, 71], 0.75), chord([62, 65, 69, 72], 0.75), chord([64, 67, 71, 74], 0.75), chord([65, 69, 72, 76], 0.75), chord([67, 71, 74, 77], 0.75), chord([69, 72, 76, 79], 0.75), chord([71, 74, 77, 81], 1.2)],
        show: { text: { en: 'Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bø7', he: 'Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bø7' } },
      },
      {
        say: { en: 'To hear the color, ask two questions. Does it want to move? Then it is the dominant. If it rests: bright is maj7, soft is m7. Dark, hollow and unstable is m7♭5.', he: 'כדי לשמוע את הצבע, שאלו שתי שאלות. האם הוא רוצה לזוז? אז זה הדומיננט. אם הוא נח: מואר זה maj7, רך זה m7. אפל, חלול ולא יציב — זה m7♭5.' },
        play: [chord([60, 64, 67, 70], 1.2), rest(0.3), chord([60, 63, 66, 70], 1.4)],
        show: { text: { en: '7 = moves · m7♭5 = dark', he: '7 = זז · m7♭5 = אפל' } },
      },
      {
        say: { en: 'The classic mix-up is maj7 against 7. Put the root on top and compare: the major 7th rubs a half step below it, the minor 7th sits a whole step below.', he: 'הבלבול הקלאסי הוא בין maj7 ל־7. שימו את השורש למעלה והשוו: הספטימה הגדולה משתפשפת חצי טון מתחתיו, הספטימה הקטנה יושבת טון שלם מתחתיו.' },
        play: [chord([60, 64, 67, 71, 72], 1.3), rest(0.3), chord([60, 64, 67, 70, 72], 1.3)],
        show: { text: { en: 'B–C = ½ · B♭–C = 1', he: 'B–C = ½ · B♭–C = 1' } },
      },
      {
        say: { en: 'At the keyboard, walk through all four by lowering one note at a time: Cmaj7, lower the 7th — C7, lower the 3rd — Cm7, lower the 5th — Cm7♭5. Each step moves one note a half step.', he: 'בפסנתר, עברו על כל הארבעה על ידי הורדת צליל אחד בכל פעם: Cmaj7, מורידים את הספטימה — C7, מורידים את הטרצה — Cm7, מורידים את הקווינטה — Cm7♭5. בכל צעד צליל אחד זז בחצי טון.' },
        show: { text: { en: 'B → B♭ · E → E♭ · G → G♭', he: 'B → B♭ · E → E♭ · G → G♭' } },
      },
      {
        say: { en: 'In real music ii–V–I is everywhere; the standard “Autumn Leaves” is built from chains of it. In a minor key the ii is half-diminished: Dm7♭5, G7, Cm.', he: 'במוזיקה אמיתית ii–V–I נמצא בכל מקום; הסטנדרט "Autumn Leaves" בנוי משרשראות שלו. בסולם מינורי ה־ii הוא חצי־מוקטן: Dm7♭5, G7, Cm.' },
        play: [chord([50, 65, 68, 72], 1.1), chord([43, 59, 62, 65], 1.1), chord([48, 60, 63, 67], 1.6)],
        show: { text: { en: 'Dm7♭5 → G7 → Cm', he: 'Dm7♭5 → G7 → Cm' } },
      },
      {
        say: { en: 'To keep: a seventh chord is a triad plus a 7th. maj7 rests, 7 pulls, m7 relaxes, m7♭5 darkens — and ii–V–I chains them home.', he: 'לזכור: אקורד ספטימה הוא משולש ועוד ספטימה. maj7 נח, 7 מושך, m7 רגוע, m7♭5 מחשיך — ו־ii–V–I מחבר אותם הביתה.' },
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
        say: { en: 'Raise just the 6th, A♭ to A, and you get Dorian — still minor, but cooler and brighter.', he: 'מעלים רק את דרגה 6, מלה במול ללה, ומקבלים דורי — עדיין מינור, אבל קריר ומואר יותר.' },
        play: [notes([60, 62, 63, 65, 67, 69, 70, 72])],
        show: { notes: [60, 62, 63, 65, 67, 69, 70, 72], key: 'C', text: { en: 'Dorian: 6', he: 'דורי: 6' } },
      },
      {
        say: { en: 'Raise the 7th too, and you have melodic minor: minor at the bottom, major at the top. In jazz it stays the same on the way down.', he: 'מעלים גם את דרגה 7, ויש לכם מינור מלודי: מינור למטה, מז׳ור למעלה. בג׳אז הוא נשאר אותו דבר גם בירידה.' },
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
    more: [
      {
        say: { en: 'All three minor scales share the bottom five notes: C, D, E♭, F, G. Only the 6th and 7th change. Natural minor has ♭6 and ♭7, Dorian has 6 and ♭7, melodic minor has 6 and 7.', he: 'לשלושת סולמות המינור יש אותם חמשת הצלילים התחתונים: דו, רה, מי במול, פה, סול. רק דרגות 6 ו־7 משתנות. במינור טבעי ♭6 ו־♭7, בדורי 6 ו־♭7, במינור מלודי 6 ו־7.' },
        play: [notes([60, 62, 63, 65, 67], 0.3)],
        show: { notes: [60, 62, 63, 65, 67], key: 'C', text: { en: '1 2 ♭3 4 5', he: '1 2 ♭3 4 5' } },
      },
      {
        say: { en: 'Why raise the 7th? B is a leading tone, a half step under C. It turns the V chord from Gm7 into G7, which pulls home far more strongly. Compare.', he: 'למה להעלות את דרגה 7? סי הוא צליל מוביל, חצי טון מתחת לדו. הוא הופך את אקורד ה־V מ־Gm7 ל־G7, שמושך הביתה הרבה יותר חזק. השוו.' },
        play: [chord([43, 58, 62, 65], 1), chord([48, 60, 63, 67], 1.2), rest(0.4), chord([43, 59, 62, 65], 1), chord([48, 60, 63, 67], 1.4)],
        show: { text: { en: 'Gm7 → Cm · G7 → Cm', he: 'Gm7 → Cm · G7 → Cm' } },
      },
      {
        say: { en: 'Classical melodic minor comes down as natural minor. Jazz keeps the raised notes both ways and treats it as a parent scale: its 7th mode is the altered scale, its 4th mode the Lydian dominant.', he: 'במוזיקה הקלאסית המינור המלודי יורד כמינור טבעי. הג׳אז שומר על הצלילים המוגבהים בשני הכיוונים ומתייחס אליו כסולם אם: המודוס ה־7 שלו הוא הסולם האלטרד, המודוס ה־4 — לידי דומיננט.' },
        play: [notes([72, 71, 69, 67, 65, 63, 62, 60], 0.3)],
        show: { notes: [72, 71, 69, 67, 65, 63, 62, 60], key: 'C', text: { en: 'C melodic minor ↓', he: 'דו מינור מלודי ↓' } },
      },
      {
        say: { en: 'Each scale has its chord. Natural minor fits a tonic minor, Cm. Dorian fits Cm7 as a ii chord. Melodic minor fits Cm6 and Cm(maj7) — the bright minor home of jazz.', he: 'לכל סולם יש את האקורד שלו. מינור טבעי מתאים לטוניקה מינורית, Cm. דורי מתאים ל־Cm7 כאקורד ii. מינור מלודי מתאים ל־Cm6 ול־Cm(maj7) — הבית המינורי המואר של הג׳אז.' },
        play: [chord([48, 63, 67, 69], 1.2), line([60, 62, 63, 65, 67, 69, 71, 72], 132, 1)],
        show: { notes: [48, 63, 67, 69], chord: true, key: 'C', text: { en: 'Cm6', he: 'Cm6' } },
      },
      {
        say: { en: 'Swing splits each beat unevenly: the first eighth is longer, close to two thirds of the beat, the second shorter. At fast tempos the swing gets straighter, and players often accent the short off-beat note.', he: 'בסווינג כל פעמה מתחלקת באופן לא שווה: השמינית הראשונה ארוכה, קרוב לשני שלישים מהפעמה, והשנייה קצרה. בטמפו מהיר הסווינג מתיישר, ונגנים מדגישים לא פעם דווקא את השמינית הקצרה שבין הפעמות.' },
        play: [swung([62, 64, 65, 67, 69, 67, 65, 64], 140)],
        show: { text: { en: '⅔ + ⅓', he: '⅔ + ⅓' } },
      },
      {
        say: { en: 'How to hear it: tap the beat and listen to the note between taps. Straight, it falls exactly halfway. Swung, it arrives late, on the last third of the beat.', he: 'איך שומעים: הקישו את הפעמה והקשיבו לצליל שבין ההקשות. בישר הוא נופל בדיוק באמצע. בסווינג הוא מגיע מאוחר, בשליש האחרון של הפעמה.' },
        play: [line([67, 65, 64, 62, 60, 62, 64, 65], 120, 1), rest(0.5), swung([67, 65, 64, 62, 60, 62, 64, 65], 120)],
        show: { text: { en: 'straight · swung', he: 'ישר · סווינג' } },
      },
      {
        say: { en: 'The common mistake is over-swinging: dotted eighth plus sixteenth, a 3-to-1 split. It sounds stiff and jumpy, not relaxed. Compare it with real swing, about 2 to 1.', he: 'הטעות הנפוצה היא סווינג מוגזם: שמינית עם נקודה ועוד שש־עשרית, חלוקה של 3 ל־1. זה נשמע נוקשה וקופצני, לא נינוח. השוו לסווינג אמיתי, בערך 2 ל־1.' },
        play: [{ kind: 'melody', midis: [60, 64, 67, 71, 69, 67], beats: [0.75, 0.25, 0.75, 0.25, 0.75, 1], bpm: 132 }, rest(0.5), swung([60, 64, 67, 71, 69, 67])],
        show: { text: { en: '3:1 ✗ · 2:1 ✓', he: '3:1 ✗ · 2:1 ✓' } },
      },
      {
        say: { en: 'Practice: play or sing the melodic minor scale in swung eighths with a metronome on 2 and 4, saying the degree numbers. Then write short licks as numbers — it trains ear and hands together.', he: 'תרגול: נגנו או שירו את המינור המלודי בשמיניות בסווינג, עם מטרונום על 2 ו־4, ואמרו את מספרי הדרגות. אחר כך כתבו ליקים קצרים כמספרים — זה מאמן את האוזן ואת הידיים יחד.' },
      },
      {
        say: { en: 'In real music: Miles Davis’s “So What” is built on D Dorian. Minor 6 chords, from melodic minor, close many minor-key jazz tunes. And swung eighths have been the basic pulse of jazz since the 1930s.', he: 'במוזיקה אמיתית: "So What" של מיילס דייוויס בנוי על רה דורי. אקורדי מינור 6, מהמינור המלודי, חותמים הרבה מנגינות ג׳אז במינור. ושמיניות בסווינג הן הדופק הבסיסי של הג׳אז מאז שנות ה־30.' },
        play: [notes([62, 64, 65, 67, 69, 71, 72, 74], 0.3)],
        show: { notes: [62, 64, 65, 67, 69, 71, 72, 74], key: 'C', text: { en: 'D Dorian', he: 'רה דורי' } },
      },
      {
        say: { en: 'To keep: the three minors differ only in 6 and 7. Swing is long–short, about two to one, and relaxed.', he: 'לזכור: שלושת המינורים נבדלים רק בדרגות 6 ו־7. סווינג הוא ארוך־קצר, בערך שניים לאחד, ונינוח.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Slash chords
  {
    id: 'slash-chords',
    area: 'harmony',
    emoji: '➗',
    title: { en: 'Slash chords: a new floor', he: 'אקורדי סלאש: רצפה חדשה' },
    takeaway: { en: 'C/E means a C chord with E in the bass: the bass can be the root, 3rd, 5th — or a note outside the chord.', he: 'C/E פירושו אקורד דו עם מי בבס: הבס יכול להיות השורש, הטרצה, הקווינטה — או צליל מחוץ לאקורד.' },
    steps: [
      {
        say: { en: 'Hey {name}! A slash chord is a chord over a bass note. C/E means a C chord with E at the bottom. Same chord, new floor.', he: 'היי {name}! אקורד סלאש הוא אקורד מעל צליל בס. C/E פירושו אקורד דו עם מי למטה. אותו אקורד, רצפה חדשה.' },
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
    more: [
      {
        say: { en: 'X/Y means chord X with note Y as the lowest note. When Y belongs to the chord, it is an inversion: C/E is the first inversion, C/G the second. When it does not, a new sound appears.', he: 'X/Y פירושו אקורד X עם הצליל Y כצליל הנמוך ביותר. כש־Y שייך לאקורד, זהו היפוך: C/E הוא ההיפוך הראשון, C/G השני. כשהוא לא שייך, נוצר צליל חדש.' },
        play: [chord([48, 60, 64, 67], 1), chord([40, 60, 64, 67], 1), chord([43, 60, 64, 67], 1.3)],
        show: { text: { en: 'C · C/E · C/G', he: 'C · C/E · C/G' } },
      },
      {
        say: { en: 'Sometimes a slash chord is just another name. C/A has A, C, E and G — exactly Am7. Writers choose the slash name when they want you to think of C on top of a moving bass.', he: 'לפעמים אקורד סלאש הוא פשוט שם אחר. ב־C/A יש לה, דו, מי וסול — בדיוק Am7. כותבים את שם הסלאש כשרוצים שתחשבו על דו למעלה מעל בס שזז.' },
        play: [chord([45, 60, 64, 67], 1.6)],
        show: { notes: [45, 60, 64, 67], chord: true, key: 'C', text: { en: 'C/A = Am7', he: 'C/A = Am7' } },
      },
      {
        say: { en: 'C/G has a job of its own: in classical harmony it is the cadential six-four. It sits on the dominant bass and leans into G7, then home to C.', he: 'ל־C/G יש תפקיד משלו: בהרמוניה הקלאסית זה ה־6/4 הקדנציאלי. הוא יושב על בס הדומיננט ונשען לתוך G7, ואז הביתה לדו.' },
        play: [chord([43, 60, 64, 67], 1.1), chord([43, 59, 62, 65], 1.1), chord([48, 60, 64, 67], 1.5)],
        show: { text: { en: 'C/G → G7 → C', he: 'C/G → G7 → C' } },
      },
      {
        say: { en: 'A favorite outside bass: F/G. Over G, the F triad gives the ♭7, 9 and 11 — a soft G9sus4 that still leads to C. You hear it all over pop, gospel and modern jazz.', he: 'בס חיצוני אהוב: F/G. מעל סול, משולש פה נותן את ה־♭7, ה־9 וה־11 — G9sus4 רך שעדיין מוביל לדו. שומעים אותו בכל מקום בפופ, בגוספל ובג׳אז מודרני.' },
        play: [chord([43, 65, 69, 72], 1.4), chord([48, 64, 67, 72], 1.6)],
        show: { notes: [43, 65, 69, 72], chord: true, key: 'C', text: { en: 'F/G → C', he: 'F/G → C' } },
      },
      {
        say: { en: 'Slash chords let the bass walk by step under steady chords. C, G/B, Am, Am/G, F: the bass falls C, B, A, G, F while the upper notes barely move.', he: 'אקורדי סלאש מאפשרים לבס ללכת בצעדים מתחת לאקורדים יציבים. C, G/B, Am, Am/G, F: הבס יורד דו, סי, לה, סול, פה, והצלילים העליונים כמעט לא זזים.' },
        play: [chord([48, 60, 64, 67], 0.9), chord([47, 59, 62, 67], 0.9), chord([45, 60, 64, 69], 0.9), chord([43, 60, 64, 69], 0.9), chord([41, 60, 65, 69], 1.4)],
        show: { notes: [48, 47, 45, 43, 41], key: 'C', clef: 'bass', text: { en: 'C – G/B – Am – Am/G – F', he: 'C – G/B – Am – Am/G – F' } },
      },
      {
        say: { en: 'The opposite is a pedal point: the bass stays put while the chords change above it. C, F/C, G/C, C — tension builds over the held C, then relaxes.', he: 'ההפך הוא פדאל (צליל עוגב): הבס נשאר במקום והאקורדים מתחלפים מעליו. C, F/C, G/C, C — המתח נבנה מעל הדו המוחזק, ואז משתחרר.' },
        play: [chord([48, 60, 64, 67], 1), chord([48, 60, 65, 69], 1), chord([48, 59, 62, 67], 1), chord([48, 60, 64, 67], 1.4)],
        show: { text: { en: 'C · F/C · G/C · C', he: 'C · F/C · G/C · C' } },
      },
      {
        say: { en: 'To hear the bass, ignore the chord and hum the lowest note. Then compare it with the chord: the root sounds solid, the 3rd light, the 5th floating, and a note outside the chord adds a new color.', he: 'כדי לשמוע את הבס, התעלמו מהאקורד וזמזמו את הצליל הנמוך ביותר. אחר כך השוו אותו לאקורד: שורש נשמע יציב, טרצה קלילה, קווינטה מרחפת, וצליל מחוץ לאקורד מוסיף צבע חדש.' },
        play: [chord([40, 60, 64, 67], 1.4), tone(40, 1)],
        show: { text: { en: 'hum the bass', he: 'זמזמו את הבס' } },
      },
      {
        say: { en: 'Common mistake: playing the chord’s root in the bass anyway, or putting the slash note on top. The note after the slash must be the lowest — left hand on piano, lowest string on guitar.', he: 'טעות נפוצה: לנגן בכל זאת את שורש האקורד בבס, או לשים את צליל הסלאש למעלה. הצליל שאחרי הלוכסן חייב להיות הנמוך ביותר — יד שמאל בפסנתר, המיתר הנמוך בגיטרה.' },
        play: [chord([48, 60, 67, 76], 1.3), rest(0.3), chord([40, 60, 64, 67], 1.3)],
        show: { text: { en: 'E on top ✗ · C/E ✓', he: 'E למעלה ✗ · C/E ✓' } },
      },
      {
        say: { en: 'In real music: Procol Harum’s “A Whiter Shade of Pale” rides a long descending bass under slash chords, and Bach loved walking bass lines. Pop ballads use C/E and G/B constantly to keep the bass smooth.', he: 'במוזיקה אמיתית: "A Whiter Shade of Pale" של פרוקול הארום נשען על בס יורד ארוך מתחת לאקורדי סלאש, ובאך אהב קווי בס צועדים. בלדות פופ משתמשות כל הזמן ב־C/E וב־G/B כדי לשמור על בס חלק.' },
      },
      {
        say: { en: 'To keep: the letter after the slash is the bass. In the chord, it is an inversion; outside it, a new color or a new chord name.', he: 'לזכור: הצליל שאחרי הלוכסן הוא הבס. אם הוא באקורד — זה היפוך; אם לא — צבע חדש, או שם אקורד חדש.' },
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
    more: [
      {
        say: { en: 'Precisely: the major 6th-diminished scale joins two four-note chords with no note in common. The tonic 6 chord gives 1, 3, 5, 6; the diminished 7th on the 7th degree gives 7, 2, 4, ♭6. Together: eight notes.', he: 'בדיוק: סולם מז׳ור 6 דימיניש מחבר שני אקורדים של ארבעה צלילים בלי אף צליל משותף. אקורד ה־6 של הטוניקה נותן 1, 3, 5, 6; הדימיניש על דרגה 7 נותן 7, 2, 4, ♭6. יחד: שמונה צלילים.' },
        play: [chord(C6, 1), chord(B_DIM, 1), notes(SIXDIM_C, 0.28)],
        show: { notes: SIXDIM_C, key: 'C', text: { en: 'C6 + B°7', he: 'C6 + B°7' } },
      },
      {
        say: { en: 'Why eight notes matter: in eighth notes, eight notes fill a bar of 4/4 exactly. Start on C on the beat, and every beat gets a C6 note — C, E, G, A — while the diminished notes fall between.', he: 'למה שמונה צלילים חשובים: בשמיניות, שמונה צלילים ממלאים בדיוק תיבה של 4/4. מתחילים על דו על הפעמה, וכל פעמה מקבלת צליל של C6 — דו, מי, סול, לה — וצלילי הדימיניש נופלים ביניהן.' },
        play: [line(SIXDIM_C, 120, 1)],
        show: { notes: SIXDIM_C, key: 'C', text: { en: 'C E G A on the beats', he: 'C E G A על הפעמות' } },
      },
      {
        say: { en: 'The harmonized scale in full: each scale note on top, its chord underneath. Notes from C6 get an inversion of C6; notes from the diminished get B°7. Up the whole octave:', he: 'הסולם המהורמן במלואו: כל צליל בסולם למעלה, והאקורד שלו מתחתיו. צלילים מ־C6 מקבלים היפוך של C6; צלילים מהדימיניש מקבלים B°7. לאורך כל האוקטבה:' },
        play: HARMONISED_FULL.map((c, i) => chord(c, i === HARMONISED_FULL.length - 1 ? 1.2 : 0.55)),
        show: { notes: SIXDIM_C, key: 'C', text: { en: '6 ° 6 ° 6 ° 6 ° 6', he: '6 ° 6 ° 6 ° 6 ° 6' } },
      },
      {
        say: { en: 'What the diminished chord does here: B°7 is G7♭9 without its root, so it acts as the dominant. The scale goes home, dominant, home — that is why the harmonized scale sounds like constant motion and rest.', he: 'מה הדימיניש עושה כאן: B°7 הוא G7♭9 בלי השורש, ולכן הוא מתפקד כדומיננט. הסולם הולך בית, דומיננט, בית — ולכן הסולם המהורמן נשמע כמו תנועה ומנוחה בלי הפסקה.' },
        play: [chord([43, ...B_DIM], 1.2), chord([48, 64, 67, 69, 72], 1.5)],
        show: { notes: [43, ...B_DIM], chord: true, key: 'C', text: { en: 'B°7 = G7♭9 without G', he: 'B°7 = G7♭9 בלי G' } },
      },
      {
        say: { en: 'The minor 6th-diminished scale swaps C6 for Cm6 — C, E♭, G, A — and keeps the same B°7. Its notes: C, D, E♭, F, G, A♭, A, B. One note changes; the whole system stays.', he: 'סולם מינור 6 דימיניש מחליף את C6 ב־Cm6 — דו, מי במול, סול, לה — ושומר על אותו B°7. הצלילים שלו: דו, רה, מי במול, פה, סול, לה במול, לה, סי. צליל אחד משתנה; כל השיטה נשארת.' },
        play: [chord([60, 63, 67, 69], 1), chord(B_DIM, 1), chord([60, 63, 67, 69], 1.3)],
        show: { notes: [60, 62, 63, 65, 67, 68, 69, 71, 72], key: 'C', text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
      {
        say: { en: 'The same eight notes are also known as the major bebop scale. Barry’s twist is how you think of them: not as a scale with an extra note, but as two chords taking turns.', he: 'אותם שמונה צלילים מוכרים גם כסולם הביבופ המז׳ורי. החידוש של בארי הוא איך חושבים עליהם: לא כסולם עם צליל נוסף, אלא כשני אקורדים שמתחלפים.' },
      },
      {
        say: { en: 'Practice the scale from every note of C6 — C, E, G and A — so a C6 note always lands on the beat. From E: E, F, G, A♭, A, B, C, D, E.', he: 'תרגלו את הסולם מכל צליל של C6 — דו, מי, סול ולה — כך שצליל של C6 תמיד נוחת על הפעמה. ממי: מי, פה, סול, לה במול, לה, סי, דו, רה, מי.' },
        play: [line([64, 65, 67, 68, 69, 71, 72, 74, 76], 120, 1)],
        show: { notes: [64, 65, 67, 68, 69, 71, 72, 74, 76], key: 'C', text: { en: 'from E', he: 'ממי' } },
      },
      {
        say: { en: 'The common mistake: starting on a diminished note on the beat. From D, the beats get D, F, A♭ and B — all tension, nothing lands. If a line feels lopsided, check what sits on the beat.', he: 'הטעות הנפוצה: להתחיל על צליל של הדימיניש על הפעמה. מרה, הפעמות מקבלות רה, פה, לה במול וסי — כולם מתח, שום דבר לא נוחת. אם קו מרגיש עקום, בדקו מה יושב על הפעמה.' },
        play: [line([62, 64, 65, 67, 68, 69, 71, 72, 74], 120, 1)],
        show: { text: { en: 'D F A♭ B on the beats ✗', he: 'D F A♭ B על הפעמות ✗' } },
      },
      {
        say: { en: 'Barry Harris (1929–2021) came up in Detroit’s bebop scene and taught workshops in New York for decades. Many pianists’ block-chord voicings come straight from this harmonized scale.', he: 'בארי האריס (1929–2021) צמח בסצנת הביבופ של דטרויט ולימד סדנאות בניו יורק במשך עשרות שנים. וויסינגים של אקורדי בלוק אצל פסנתרנים רבים באים ישירות מהסולם המהורמן הזה.' },
      },
      {
        say: { en: 'To keep: a 6 chord plus the diminished chord a half step below its root — eight notes, rest on the beat, tension between.', he: 'לזכור: אקורד 6 ועוד הדימיניש שחצי טון מתחת לשורש שלו — שמונה צלילים, מנוחה על הפעמה, מתח ביניהן.' },
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
        say: { en: 'Hey {name}! Time for Barry Harris’s favorite magic trick. Start with a diminished chord: B, D, F, A♭.', he: 'היי {name}! הגיע הזמן לטריק הקסם האהוב של בארי האריס. מתחילים באקורד דימיניש: סי, רה, פה, לה במול.' },
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
    more: [
      {
        say: { en: 'Why lowering makes a dominant: G7♭9 is G plus B°7 — B, D, F, A♭. So the diminished chord is a dominant 7♭9 missing its root. Lower A♭ to G and the root is back: G7.', he: 'למה הורדה יוצרת דומיננט: G7♭9 הוא סול ועוד B°7 — סי, רה, פה, לה במול. כלומר, הדימיניש הוא דומיננט 7♭9 שחסר לו השורש. מורידים את לה במול לסול, והשורש חוזר: G7.' },
        play: [chord([43, 59, 62, 65, 68], 1.3), rest(0.2), chord([43, 59, 62, 65, 67], 1.5)],
        show: { text: { en: 'G7♭9 → G7', he: 'G7♭9 → G7' } },
      },
      {
        say: { en: 'All four downs from B°7: B to B♭ gives B♭7, D to D♭ gives D♭7, F to E gives E7, A♭ to G gives G7. The lowered note is always the new root.', he: 'כל ארבע ההורדות מ־B°7: סי לסי במול נותן B♭7, רה לרה במול נותן D♭7, פה למי נותן E7, לה במול לסול נותן G7. הצליל שירד הוא תמיד השורש החדש.' },
        play: [chord([58, 62, 65, 68], 1), chord([59, 61, 65, 68], 1), chord(E7, 1), chord(G7, 1.3)],
        show: { text: { en: 'B♭7 · D♭7 · E7 · G7', he: 'B♭7 · D♭7 · E7 · G7' } },
      },
      {
        say: { en: 'All four ups: B to C gives Fm6, D to E♭ gives A♭m6, F to F♯ gives Bm6, A♭ to A gives Dm6. The raised note is the 5th of the new chord, so the root is a fourth above it.', he: 'כל ארבע ההעלאות: סי לדו נותן Fm6, רה למי במול נותן A♭m6, פה לפה דיאז נותן Bm6, לה במול ללה נותן Dm6. הצליל שעלה הוא הקווינטה של האקורד החדש, ולכן השורש קוורטה מעליו.' },
        play: [chord(FM6, 1), chord([59, 63, 65, 68], 1), chord([59, 62, 66, 68], 1), chord([59, 62, 65, 69], 1.3)],
        show: { text: { en: 'Fm6 · A♭m6 · Bm6 · Dm6', he: 'Fm6 · A♭m6 · Bm6 · Dm6' } },
      },
      {
        say: { en: 'Symmetry in, symmetry out. The four dominants — G, B♭, D♭, E — are a minor third apart, and so are the four minor 6 chords — D, F, A♭, B.', he: 'סימטריה נכנסת, סימטריה יוצאת. ארבעת הדומיננטים — סול, סי במול, רה במול, מי — רחוקים טרצה קטנה זה מזה, וכך גם ארבעת אקורדי המינור 6 — רה, פה, לה במול, סי.' },
        play: [notes([55, 58, 61, 64], 0.4), rest(0.3), notes([62, 65, 68, 71], 0.4)],
        show: { text: { en: '7: G B♭ D♭ E · m6: D F A♭ B', he: '7: G B♭ D♭ E · m6: D F A♭ B' } },
      },
      {
        say: { en: 'How to hear the direction: after a downward move the chord still leans forward, bright and bluesy — a dominant. After an upward move it settles into a soft, shadowed minor. Listen:', he: 'איך שומעים את הכיוון: אחרי תנועה למטה האקורד עדיין נוטה קדימה, מואר ובלוזי — דומיננט. אחרי תנועה למעלה הוא מתיישב למינור רך ומוצל. הקשיבו:' },
        play: [chord(B_DIM, 0.9), chord(G7, 1.2), rest(0.4), chord(B_DIM, 0.9), chord([59, 62, 65, 69], 1.4)],
        show: { text: { en: 'A♭ ↓ = G7 · A♭ ↑ = Dm6', he: 'A♭ ↓ = G7 · A♭ ↑ = Dm6' } },
      },
      {
        say: { en: 'At the piano, hold B°7 in the right hand and move each finger in turn, first down, then up, naming each chord aloud. Then do the same from C°7 and C♯°7 — that covers every key.', he: 'בפסנתר, החזיקו B°7 ביד ימין והזיזו כל אצבע בתורה, קודם למטה ואז למעלה, ואמרו בקול את שם האקורד. אחר כך אותו דבר מ־C°7 ומ־C♯°7 — וזה מכסה את כל הסולמות.' },
      },
      {
        say: { en: 'The common mistake is naming the wrong root. Down: the note that moved is the root. Up: the note that moved is the 5th — count a fourth up from it.', he: 'הטעות הנפוצה היא לתת שורש לא נכון. למטה: הצליל שזז הוא השורש. למעלה: הצליל שזז הוא הקווינטה — ספרו קוורטה למעלה ממנו.' },
        show: { text: { en: '↓ moved note = 1 · ↑ moved note = 5', he: '↓ הצליל שזז = 1 · ↑ הצליל שזז = 5' } },
      },
      {
        say: { en: 'In playing, the move is a voice-leading tool: hold the diminished chord, then nudge one note at the last moment to land on the chord you need — B°7, G7, then home to C6.', he: 'בנגינה, התנועה הזאת היא כלי להובלת קולות: מחזיקים את הדימיניש, ואז דוחפים צליל אחד ברגע האחרון כדי לנחות על האקורד שצריך — B°7, G7, ואז הביתה ל־C6.' },
        play: [chord(B_DIM, 1), chord(G7, 1), chord([48, 64, 67, 69], 1.5)],
        show: { text: { en: 'B°7 → G7 → C6', he: 'B°7 → G7 → C6' } },
      },
      {
        say: { en: 'To keep: one note down a half step — a dominant on that note. One note up — a minor 6 a fourth above it.', he: 'לזכור: צליל אחד למטה בחצי טון — דומיננט על הצליל הזה. צליל אחד למעלה — מינור 6 קוורטה מעליו.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: one or two notes
  {
    id: 'bh-convert-2',
    area: 'jazz',
    emoji: '🔀',
    title: { en: 'Barry Harris: moving one or two notes', he: 'בארי האריס: להזיז צליל אחד או שניים' },
    takeaway: { en: 'One note down → dominant 7; one up → minor 6; two neighbors up or down together → major 6.', he: 'צליל אחד למטה → דומיננט 7; אחד למעלה → מינור 6; שני שכנים יחד למעלה או למטה → מז׳ור 6.' },
    steps: [
      {
        say: { en: 'Hey {name}! Quick recap. From B diminished, lower one note and you get a dominant, G7. Raise one and you get a minor 6, F minor 6.', he: 'היי {name}! תזכורת קצרה. מסי דימיניש, מורידים צליל אחד ומקבלים דומיננט, סול 7. מעלים אחד ומקבלים מינור 6, פה מינור 6.' },
        play: [chord(B_DIM, 1), chord(G7, 1.2), rest(0.3), chord(B_DIM, 1), chord(FM6, 1.2)],
        show: { text: { en: 'B°7 → G7 · Fm6', he: 'B°7 → G7 · Fm6' } },
      },
      {
        say: { en: 'Now move two neighbors together. Raise B and D to C and E♭: you get A♭6 — A♭, C, E♭, F. A major 6, sunny and settled.', he: 'עכשיו מזיזים שני שכנים יחד. מעלים את סי ורה לדו ומי במול: מקבלים לה במול 6 — לה במול, דו, מי במול, פה. מז׳ור 6, שמשי ורגוע.' },
        play: [chord(B_DIM, 1), rest(0.2), chord([60, 63, 65, 68], 1.6)],
        show: { notes: [60, 63, 65, 68], chord: true, key: 'C', text: { en: 'B D ↑ → A♭6', he: 'B D ↑ → A♭6' } },
      },
      {
        say: { en: 'Or lower two neighbors: B and D drop to B♭ and D♭. Now it is D♭6 — D♭, F, A♭, B♭. Another major 6.', he: 'או מורידים שני שכנים: סי ורה יורדים לסי במול ורה במול. עכשיו זה רה במול 6 — רה במול, פה, לה במול, סי במול. עוד מז׳ור 6.' },
        play: [chord(B_DIM, 1), rest(0.2), chord([58, 61, 65, 68], 1.6)],
        show: { notes: [58, 61, 65, 68], chord: true, key: 'C', text: { en: 'B D ↓ → D♭6', he: 'B D ↓ → D♭6' } },
      },
      {
        say: { en: 'This is the heart of Barry’s method: the diminished chord is the engine. Nudge it a half step and you land on the chord you need.', he: 'זה הלב של השיטה של בארי: הדימיניש הוא המנוע. דוחפים אותו בחצי טון ונוחתים על האקורד שצריך.' },
        play: [chord(B_DIM, 0.9), chord(G7, 0.9), chord([48, 64, 67, 69], 1.5)],
        show: { text: { en: 'B°7 → G7 → C6', he: 'B°7 → G7 → C6' } },
      },
      {
        say: { en: 'Three colors to tell apart. Dominant 7: restless. Minor 6: dark and soft. Major 6: bright and at rest.', he: 'שלושה צבעים להבחין ביניהם. דומיננט 7: חסר מנוחה. מינור 6: כהה ורך. מז׳ור 6: מואר ונח.' },
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
    more: [
      {
        say: { en: 'The full map from one diminished chord: one note down gives a dominant 7, one note up a minor 6, and two neighboring notes moved together — up or down — a major 6.', he: 'המפה המלאה מדימיניש אחד: צליל אחד למטה נותן דומיננט 7, צליל אחד למעלה מינור 6, ושני צלילים שכנים שזזים יחד — למעלה או למטה — מז׳ור 6.' },
        play: [chord(B_DIM, 0.9), chord(G7, 1), rest(0.2), chord(FM6, 1), rest(0.2), chord([60, 63, 65, 68], 1.3)],
        show: { text: { en: '↓ 7 · ↑ m6 · ↑↑ or ↓↓ 6', he: '↓ 7 · ↑ m6 · ↑↑ או ↓↓ 6' } },
      },
      {
        say: { en: 'Raise two neighbors and they become the 3rd and 5th of a major 6; the root is a major third below the lower one. B and D rise to C and E♭: C is the 3rd, so the chord is A♭6.', he: 'מעלים שני שכנים, והם הופכים לטרצה ולקווינטה של מז׳ור 6; השורש נמצא טרצה גדולה מתחת לתחתון מביניהם. סי ורה עולים לדו ומי במול: דו הוא הטרצה, ולכן האקורד הוא A♭6.' },
        play: [chord(B_DIM, 1), chord([60, 63, 65, 68], 1.5)],
        show: { notes: [60, 63, 65, 68], chord: true, key: 'C', text: { en: 'B D ↑ → A♭6', he: 'B D ↑ → A♭6' } },
      },
      {
        say: { en: 'Lower two neighbors and they become the 6th and the root; the upper of the two is the root. B and D fall to B♭ and D♭: D♭ is the root, B♭ its 6th — D♭6.', he: 'מורידים שני שכנים, והם הופכים לדרגה 6 ולשורש; העליון מביניהם הוא השורש. סי ורה יורדים לסי במול ורה במול: רה במול הוא השורש, סי במול דרגה 6 שלו — D♭6.' },
        play: [chord(B_DIM, 1), chord([58, 61, 65, 68], 1.5)],
        show: { notes: [58, 61, 65, 68], chord: true, key: 'C', text: { en: 'B D ↓ → D♭6', he: 'B D ↓ → D♭6' } },
      },
      {
        say: { en: 'Four pairs each way. Raising gives A♭6, B6, D6 and F6; lowering gives D♭6, E6, G6 and B♭6. Here are D6 and G6, both from moving F and A♭.', he: 'ארבעה זוגות לכל כיוון. העלאה נותנת A♭6, B6, D6 ו־F6; הורדה נותנת D♭6, E6, G6 ו־B♭6. הנה D6 ו־G6, שניהם מהזזת פה ולה במול.' },
        play: [chord(B_DIM, 0.8), chord([59, 62, 66, 69], 1.1), rest(0.3), chord(B_DIM, 0.8), chord([59, 62, 64, 67], 1.3)],
        show: { text: { en: 'F A♭ ↑ → D6 · F A♭ ↓ → G6', he: 'F A♭ ↑ → D6 · F A♭ ↓ → G6' } },
      },
      {
        say: { en: 'Count it up: one diminished chord reaches four dominants, four minor 6s and eight major 6s — sixteen chords, each one or two half-step moves away. That is why the diminished chord sits at the center of Barry’s system.', he: 'סך הכול: דימיניש אחד מגיע לארבעה דומיננטים, ארבעה מינור 6 ושמונה מז׳ור 6 — שישה־עשר אקורדים, כל אחד במרחק של תנועה אחת או שתיים בחצי טון. לכן הדימיניש עומד במרכז השיטה של בארי.' },
      },
      {
        say: { en: 'Telling 6 from m6: a minor 6 hides a tritone between its ♭3 and 6 — A♭ and D in Fm6 — so it sounds shadowed and a little restless. A major 6 has no tritone; it simply rests.', he: 'להבדיל בין 6 ל־m6: במינור 6 מסתתר טריטון בין ה־♭3 לדרגה 6 — לה במול ורה ב־Fm6 — ולכן הוא נשמע מוצל וקצת חסר מנוחה. במז׳ור 6 אין טריטון; הוא פשוט נח.' },
        play: [chord(FM6, 1.3), rest(0.3), chord([60, 63, 65, 68], 1.4)],
        show: { text: { en: 'Fm6 · A♭6', he: 'Fm6 · A♭6' } },
      },
      {
        say: { en: 'A listening order: first ask whether it still pulls — a dominant. If it rests, ask major or minor. For the exact name, find which notes moved and which way.', he: 'סדר האזנה: קודם שאלו אם הוא עדיין מושך — דומיננט. אם הוא נח, שאלו מז׳ור או מינור. לשם המדויק, מצאו אילו צלילים זזו ולאיזה כיוון.' },
      },
      {
        say: { en: 'Common mistake: moving two notes that are not neighbors. Raise B and F — a tritone apart — and you get C, D, F♯, A♭: a D7♭5, not a 6 chord. Neighbors means a minor third apart.', he: 'טעות נפוצה: להזיז שני צלילים שאינם שכנים. מעלים את סי ופה — טריטון זה מזה — ומקבלים דו, רה, פה דיאז, לה במול: D7♭5, לא אקורד 6. שכנים פירושו במרחק טרצה קטנה.' },
        play: [chord(B_DIM, 0.9), chord([60, 62, 66, 68], 1.4)],
        show: { text: { en: 'B F ↑ → D7♭5 ✗', he: 'B F ↑ → D7♭5 ✗' } },
      },
      {
        say: { en: 'Practice on all three diminished chords: B°7, C°7 and C♯°7. Move each pair up and down and name the major 6 — twenty-four in all, every major 6 twice.', he: 'תרגלו על שלושת הדימינישים: B°7, C°7 ו־C♯°7. הזיזו כל זוג למעלה ולמטה ותנו שם למז׳ור 6 — עשרים וארבעה בסך הכול, כל מז׳ור 6 פעמיים.' },
      },
      {
        say: { en: 'To keep: two neighbors up — the raised notes are the 3rd and 5th. Two down — the upper lowered note is the root. Either way, a major 6.', he: 'לזכור: שני שכנים למעלה — הצלילים שעלו הם הטרצה והקווינטה. שניים למטה — העליון מבין אלה שירדו הוא השורש. בשני המקרים, מז׳ור 6.' },
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
    more: [
      {
        say: { en: 'Why it works: each note of B°7 is the 3rd of one dominant, and that 3rd is the leading tone of a key. B leads to C, D to E♭, F to G♭, and A♭ — spelled G♯ — to A.', he: 'למה זה עובד: כל צליל ב־B°7 הוא הטרצה של דומיננט אחד, והטרצה הזאת היא הצליל המוביל של סולם. סי מוביל לדו, רה למי במול, פה לסול במול, ולה במול — שנכתב סול דיאז — ללה.' },
        play: [chord(B_DIM, 1), notes([59, 60], 0.5), rest(0.2), chord(B_DIM, 0.8), notes([68, 69], 0.5)],
        show: { text: { en: 'B→C · D→E♭ · F→G♭ · G♯→A', he: 'B→C · D→E♭ · F→G♭ · G♯→A' } },
      },
      {
        say: { en: 'There are only three diminished 7th chords: C°7, C♯°7 and D°7. Every other is one of these renamed, because each repeats after a minor third. B°7 has the same notes as D°7, F°7 and A♭°7.', he: 'יש רק שלושה אקורדי דימיניש: C°7, C♯°7 ו־D°7. כל השאר הם אחד מהם בשם אחר, כי כל אחד חוזר על עצמו אחרי טרצה קטנה. ל־B°7 יש אותם צלילים כמו ל־D°7, F°7 ו־A♭°7.' },
        play: [chord([60, 63, 66, 69], 1), chord([61, 64, 67, 70], 1), chord([62, 65, 68, 71], 1.3)],
        show: { text: { en: 'C°7 · C♯°7 · D°7', he: 'C°7 · C♯°7 · D°7' } },
      },
      {
        say: { en: 'So three diminished chords, four keys each, cover all twelve keys. Learn the trick on B°7 and you hold the map to a third of all keys.', he: 'אז שלושה דימינישים, ארבעה סולמות לכל אחד, מכסים את כל שנים־עשר הסולמות. לומדים את הטריק על B°7 ומחזיקים מפה לשליש מכל הסולמות.' },
      },
      {
        say: { en: 'The diminished chord can also skip the dominant and resolve straight home, every note moving by step: B to C, F to E, A♭ to G. Hear it go to C, then to A.', he: 'הדימיניש יכול גם לדלג על הדומיננט ולהיפתר ישר הביתה, כשכל צליל זז בצעד: סי לדו, פה למי, לה במול לסול. שמעו אותו הולך לדו, ואחר כך ללה.' },
        play: [chord(B_DIM, 1), chord([48, 60, 64, 67], 1.3), rest(0.3), chord(B_DIM, 1), chord([45, 57, 61, 64, 69], 1.4)],
        show: { text: { en: 'B°7 → C · B°7 → A', he: 'B°7 → C · B°7 → A' } },
      },
      {
        say: { en: 'A real modulation: start in C, slip through B°7 and E7, and arrive in A. The diminished chord is the hinge — it belongs to both keys.', he: 'מודולציה אמיתית: מתחילים בדו, חומקים דרך B°7 ו־E7, ומגיעים ללה. הדימיניש הוא הציר — הוא שייך לשני הסולמות.' },
        play: [chord([48, 60, 64, 67], 1), chord(B_DIM, 1), chord([40, ...E7], 1), chord([45, 57, 61, 64, 69], 1.5)],
        show: { text: { en: 'C → B°7 → E7 → A', he: 'C → B°7 → E7 → A' } },
      },
      {
        say: { en: 'How to hear where it went: keep the first home note in your ear and sing the new one after it. Three half steps is a minor third, up or down; six is the tritone, the farthest and strangest.', he: 'איך שומעים לאן הוא הלך: שמרו את צליל הבית הראשון באוזן ושירו אחריו את החדש. שלושה חצאי טונים הם טרצה קטנה, למעלה או למטה; שישה הם הטריטון, הרחוק והמוזר מכולם.' },
        play: [notes([60, 63], 0.6), rest(0.3), notes([60, 57], 0.6), rest(0.3), notes([60, 66], 0.6)],
        show: { text: { en: '↑3 · ↓3 · 6', he: '↑3 · ↓3 · 6' } },
      },
      {
        say: { en: 'Common mistake: assuming a diminished chord belongs to one key. It never does — the bass and the next chord decide. And spell the tritone key as G♭ or F♯, whichever the music uses.', he: 'טעות נפוצה: להניח שדימיניש שייך לסולם אחד. הוא אף פעם לא — הבס והאקורד הבא מחליטים. ואת סולם הטריטון כתבו סול במול או פה דיאז, לפי מה שהמוזיקה משתמשת בו.' },
      },
      {
        say: { en: 'In real music the diminished 7th has been the classic pivot chord since the Baroque, and Romantic composers leaned on it for sudden key changes. Barry turned it into an everyday tool.', he: 'במוזיקה אמיתית הדימיניש הוא אקורד הציר הקלאסי עוד מתקופת הבארוק, והמלחינים הרומנטיים נשענו עליו לשינויי סולם פתאומיים. בארי הפך אותו לכלי עבודה יומיומי.' },
      },
      {
        say: { en: 'Practice: from B°7, resolve to each of the four keys and name it. Then repeat from C°7 (keys D♭, E, G, B♭) and C♯°7 (D, F, A♭, B).', he: 'תרגול: מ־B°7, היפתרו לכל אחד מארבעת הסולמות ותנו לו שם. אחר כך חזרו מ־C°7 (סולמות D♭, E, G, B♭) ומ־C♯°7 (D, F, A♭, B).' },
      },
      {
        say: { en: 'To keep: each note of a diminished chord is a leading tone. Four notes, four doors — four keys a minor third apart.', he: 'לזכור: כל צליל בדימיניש הוא צליל מוביל. ארבעה צלילים, ארבע דלתות — ארבעה סולמות במרחק טרצה קטנה.' },
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
        say: { en: 'Over a dominant 7, play the minor 6 on its 5th. Over G7, D minor 6: D, F, A, B — the 5th, ♭7, 9th and 3rd of G7.', he: 'מעל דומיננט 7 מנגנים מינור 6 על הקווינטה שלו. מעל G7, רה מינור 6: רה, פה, לה, סי — הקווינטה, הספטימה, ה־9 והטרצה של G7.' },
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
    more: [
      {
        say: { en: 'The idea: Barry thought in two scales only — major 6-diminished and minor 6-diminished. So every chord gets a 6 chord, and with it a whole 6th-diminished scale to play on.', he: 'הרעיון: בארי חשב בשני סולמות בלבד — מז׳ור 6 דימיניש ומינור 6 דימיניש. אז כל אקורד מקבל אקורד 6, ואיתו סולם 6 דימיניש שלם לנגן עליו.' },
      },
      {
        say: { en: 'm7 → the major 6 a minor third up. Dm7 and F6 are the same four notes, so over Dm7 you play the F 6th-diminished scale: F, G, A, B♭, C, D♭, D, E.', he: 'm7 → המז׳ור 6 טרצה קטנה למעלה. Dm7 ו־F6 הם אותם ארבעה צלילים, ולכן מעל Dm7 מנגנים את סולם פה 6 דימיניש: פה, סול, לה, סי במול, דו, רה במול, רה, מי.' },
        play: [chord([50, 65, 69, 72, 74], 1.2), notes([65, 67, 69, 70, 72, 73, 74, 76, 77], 0.26)],
        show: { notes: [65, 67, 69, 70, 72, 73, 74, 76, 77], key: 'C', text: { en: 'Dm7 → F6-dim', he: 'Dm7 → F6 דימיניש' } },
      },
      {
        say: { en: '7 → the minor 6 on the 5th. Over G7 play Dm6: D, F, A, B — the 5th, ♭7, 9th and 3rd. The tritone B–F is inside, so the dominant sound stays. Its scale: D, E, F, G, A, B♭, B, C♯.', he: '7 → המינור 6 על הקווינטה. מעל G7 מנגנים Dm6: רה, פה, לה, סי — הקווינטה, ה־♭7, ה־9 והטרצה. הטריטון סי–פה נמצא בפנים, ולכן צליל הדומיננט נשמר. הסולם שלו: רה, מי, פה, סול, לה, סי במול, סי, דו דיאז.' },
        play: [chord([43, 62, 65, 69, 71], 1.2), notes([62, 64, 65, 67, 69, 70, 71, 73, 74], 0.26)],
        show: { notes: [62, 64, 65, 67, 69, 70, 71, 73, 74], key: 'C', text: { en: 'G7 → Dm6-dim', he: 'G7 → Dm6 דימיניש' } },
      },
      {
        say: { en: 'maj7 → the 6 on its root: C6 over Cmaj7. For a brighter sound Barry also used the 6 on the 5th: G6 over C gives G, B, D, E — the 5th, 7th, 9th and 6th.', he: 'maj7 → ה־6 על השורש: C6 מעל Cmaj7. לצליל מואר יותר בארי השתמש גם ב־6 על הקווינטה: G6 מעל דו נותן סול, סי, רה, מי — הקווינטה, הספטימה, ה־9 ודרגה 6.' },
        play: [chord([48, 64, 67, 69, 72], 1.3), rest(0.3), chord([48, 67, 71, 74, 76], 1.5)],
        show: { text: { en: 'C6 · G6/C', he: 'C6 · G6/C' } },
      },
      {
        say: { en: 'The other three. m7♭5 → minor 6 a minor third up: Dm7♭5 equals Fm6. Altered → minor 6 a half step up: A♭m6 over G gives ♭9, 3, ♭13, ♭7. Sus → major 6 a whole step down: F6 over G gives ♭7, 9, 11, 5.', he: 'שלושת האחרים. m7♭5 → מינור 6 טרצה קטנה למעלה: Dm7♭5 שווה ל־Fm6. אלטרד → מינור 6 חצי טון למעלה: A♭m6 מעל סול נותן ♭9, 3, ♭13, ♭7. סאס → מז׳ור 6 טון שלם למטה: F6 מעל סול נותן ♭7, 9, 11, 5.' },
        show: { text: { en: 'ø → m6 ↑m3 · alt → m6 ↑½ · sus → 6 ↓1', he: 'ø → m6 ↑m3 · alt → m6 ↑½ · sus → 6 ↓1' } },
      },
      {
        say: { en: 'A minor ii–V–i in 6 chords: Dm7♭5, G7alt, Cm6 become Fm6, A♭m6, Cm6 — three minor 6 shapes over a moving bass.', he: 'ii–V–i במינור באקורדי 6: Dm7♭5, G7alt, Cm6 הופכים ל־Fm6, A♭m6, Cm6 — שלוש צורות של מינור 6 מעל בס שזז.' },
        play: [chord([50, 65, 68, 72, 74], 1.1), chord([43, 63, 65, 68, 71], 1.1), chord([48, 63, 67, 69, 72], 1.6)],
        show: { text: { en: 'Fm6/D · A♭m6/G · Cm6', he: 'Fm6/D · A♭m6/G · Cm6' } },
      },
      {
        say: { en: 'How to hear it: the bass names the chord, the 6 chord colors it. The same Dm6 shape over D is a Dm6; over G it becomes a G9. Listen to the bass change:', he: 'איך שומעים: הבס קובע את שם האקורד, אקורד ה־6 צובע אותו. אותה צורת Dm6 מעל רה היא Dm6; מעל סול היא הופכת ל־G9. הקשיבו לבס שמשתנה:' },
        play: [chord([50, 62, 65, 69, 71], 1.3), rest(0.3), chord([43, 62, 65, 69, 71], 1.4)],
        show: { text: { en: 'Dm6 over D · Dm6 over G = G9', he: 'Dm6 מעל D · Dm6 מעל G = G9' } },
      },
      {
        say: { en: 'Common mistake: mixing up m7 and m7♭5 — both go a minor third up. Check the chord’s 5th: a perfect 5th (A in Dm7) gives a major 6, F6; a flat 5th (A♭ in Dm7♭5) gives a minor 6, Fm6.', he: 'טעות נפוצה: לבלבל בין m7 ל־m7♭5 — שניהם עולים טרצה קטנה. בדקו את הקווינטה של האקורד: קווינטה זכה (לה ב־Dm7) נותנת מז׳ור 6, F6; קווינטה מוקטנת (לה במול ב־Dm7♭5) נותנת מינור 6, Fm6.' },
        play: [chord([50, 65, 69, 72, 74], 1.2), rest(0.3), chord([50, 65, 68, 72, 74], 1.3)],
        show: { text: { en: 'Dm7 = F6 · Dm7♭5 = Fm6', he: 'Dm7 = F6 · Dm7♭5 = Fm6' } },
      },
      {
        say: { en: 'Practice the table in one key until it is automatic, then play ii–V–I around the circle as major 6, minor 6, major 6 — in C: F6, Dm6, C6.', he: 'תרגלו את הטבלה בסולם אחד עד שזה אוטומטי, ואז נגנו ii–V–I סביב המעגל כמז׳ור 6, מינור 6, מז׳ור 6 — בדו: F6, Dm6, C6.' },
      },
      {
        say: { en: 'To keep: maj7 → 6 on the root; m7 → major 6 up a minor third; 7 → minor 6 on the 5th; m7♭5 → minor 6 up a minor third; altered → minor 6 up a half step; sus → major 6 down a whole step.', he: 'לזכור: maj7 → 6 על השורש; m7 → מז׳ור 6 טרצה קטנה למעלה; 7 → מינור 6 על הקווינטה; m7♭5 → מינור 6 טרצה קטנה למעלה; אלטרד → מינור 6 חצי טון למעלה; סאס → מז׳ור 6 טון שלם למטה.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: half-step rules
  {
    id: 'bh-lines',
    area: 'jazz',
    emoji: '〰️',
    title: { en: 'Barry Harris: half steps in dominant lines', he: 'בארי האריס: חצאי טונים בקווי דומיננט' },
    takeaway: { en: 'Down the dominant scale, add half steps so chord tones land on the beat: one between 1 and ♭7; from 3, 5, 7 up to three; from 2, 4, 6 none, or two.', he: 'בירידה בסולם הדומיננט מוסיפים חצאי טונים כדי שצלילי האקורד ינחתו על הפעמה: אחד בין 1 ל־♭7; מ־3, 5, 7 עד שלושה; מ־2, 4, 6 אפס, או שניים.' },
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
        say: { en: 'Start on 2, 4 or 6 — notes outside the chord — and you add none, or two: between 2 and 1, and between 1 and ♭7.', he: 'מתחילים על 2, 4 או 6 — צלילים מחוץ לאקורד — ומוסיפים אפס, או שניים: בין 2 ל־1, ובין 1 ל־♭7.' },
        play: [chord(C7, 0.8), rest(0.2), line(FROM_2_TWO)],
        show: { notes: FROM_2_TWO, key: 'C', text: { en: '2–1 · 1–♭7', he: '2–1 · 1–♭7' } },
      },
      {
        say: { en: 'Your turn! You hear a dominant chord, then a line falling down its scale. Was the half step between 1 and ♭7 added? Later, count the extra half steps, and check that chord tones hit the beats.', he: 'תורכם! תשמעו אקורד דומיננט, ואז קו שיורד בסולם שלו. האם נוסף חצי הטון בין 1 ל־♭7? בהמשך תספרו את חצאי הטונים הנוספים, ותבדקו שצלילי האקורד נוחתים על הפעמות.' },
        play: [chord([55, 59, 62, 65], 0.8), rest(0.2), line([67, 65, 64, 62, 60, 59, 57, 55])],
        show: { text: { en: 'with or without?', he: 'עם או בלי?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why a straight scale goes wrong: coming down the dominant scale, chord tones and other notes alternate — except at the top, where 1 and ♭7, C and B♭, are two chord tones side by side.', he: 'למה סולם ישר משתבש: בירידה בסולם הדומיננט, צלילי אקורד וצלילים אחרים מתחלפים — חוץ מלמעלה, שם 1 ו־♭7, דו וסי במול, הם שני צלילי אקורד צמודים.' },
        play: [chord(C7, 0.8), rest(0.2), line(PLAIN_FROM_1)],
        show: { notes: PLAIN_FROM_1, key: 'C', text: { en: 'C B♭ = 1 ♭7, side by side', he: 'C B♭ = 1 ♭7, צמודים' } },
      },
      {
        say: { en: 'One half step between them, B, restores the alternation, and it works from any chord tone. From 5: G, F, E, D, C, B, B♭, A, G — and G, E, C, B♭, G land on the beats.', he: 'חצי טון אחד ביניהם, סי, מחזיר את הסירוגין, וזה עובד מכל צליל אקורד. מ־5: סול, פה, מי, רה, דו, סי, סי במול, לה, סול — וסול, מי, דו, סי במול, סול נוחתים על הפעמות.' },
        play: [chord(C7, 0.8), rest(0.2), line([67, 65, 64, 62, 60, 59, 58, 57, 55])],
        show: { notes: [67, 65, 64, 62, 60, 59, 58, 57, 55], key: 'C', text: { en: '5: one half step', he: '5: חצי טון אחד' } },
      },
      {
        say: { en: 'Starting on the beat from a non-chord tone — 2, 4 or 6 — the basic rule is none. From D: D, C, B♭, A, G, F, E, D, C. After the first note, the chord tones already fall on the beats.', he: 'כשמתחילים על הפעמה מצליל שאינו באקורד — 2, 4 או 6 — הכלל הבסיסי הוא אף אחד. מרה: רה, דו, סי במול, לה, סול, פה, מי, רה, דו. אחרי הצליל הראשון, צלילי האקורד כבר נופלים על הפעמות.' },
        play: [chord(C7, 0.8), rest(0.2), line([74, 72, 70, 69, 67, 65, 64, 62, 60])],
        show: { notes: [74, 72, 70, 69, 67, 65, 64, 62, 60], key: 'C', text: { en: '2: none', he: '2: אף אחד' } },
      },
      {
        say: { en: 'The counting logic: each added note shifts the rest of the line by one eighth, and two added notes cancel out. So from a chord tone you add an odd number — one or three — and from a non-chord tone an even number — none or two.', he: 'ההיגיון של הספירה: כל צליל מוסף מזיז את שאר הקו בשמינית אחת, ושני צלילים מוספים מבטלים זה את זה. לכן מצליל אקורד מוסיפים מספר אי־זוגי — אחד או שלושה — ומצליל שאינו באקורד מספר זוגי — אפס או שניים.' },
        show: { text: { en: '1 3 5 ♭7 → 1 or 3 · 2 4 6 → 0 or 2', he: '1 3 5 ♭7 → 1 או 3 · 2 4 6 → 0 או 2' } },
      },
      {
        say: { en: 'The added spots are fixed, each used once. From 3, 5 or ♭7: between 3 and 2, 2 and 1, 1 and ♭7. From 2, 4 or 6: between 2 and 1, and 1 and ♭7. Here is 5 with all three.', he: 'המקומות להוספה קבועים, וכל אחד משמש פעם אחת. מ־3, 5 או ♭7: בין 3 ל־2, בין 2 ל־1, ובין 1 ל־♭7. מ־2, 4 או 6: בין 2 ל־1, ובין 1 ל־♭7. הנה 5 עם שלושתם.' },
        play: [chord(C7, 0.8), rest(0.2), line([67, 65, 64, 63, 62, 61, 60, 59, 58, 57, 55])],
        show: { notes: [67, 65, 64, 63, 62, 61, 60, 59, 58, 57, 55], key: 'C', text: { en: '3–2 · 2–1 · 1–♭7', he: '3–2 · 2–1 · 1–♭7' } },
      },
      {
        say: { en: 'How to hear it: tap the beat while the line falls and notice what lands on each tap. A good line sounds anchored, with chord tones on the taps. Also listen for the chromatic slides: one extra note, or a longer run of half steps.', he: 'איך שומעים: הקישו את הפעמה בזמן שהקו יורד, ושימו לב מה נוחת על כל הקשה. קו טוב נשמע מעוגן, עם צלילי אקורד על ההקשות. הקשיבו גם להחלקות הכרומטיות: צליל נוסף אחד, או ריצה ארוכה יותר של חצאי טונים.' },
      },
      {
        say: { en: 'Common mistake: adding the half step in the wrong spot. Put A♭ between A and G instead, and A — not a chord tone — still lands on a beat. Add it between 1 and ♭7, where the problem starts.', he: 'טעות נפוצה: להוסיף את חצי הטון במקום הלא נכון. שימו לה במול בין לה לסול, ולה — שאינו צליל אקורד — עדיין נוחת על פעמה. הוסיפו אותו בין 1 ל־♭7, איפה שהבעיה מתחילה.' },
        play: [line([72, 70, 69, 68, 67, 65, 64, 62, 60]), rest(0.4), line(FROM_1)],
        show: { text: { en: 'A A♭ G ✗ · C B B♭ ✓', he: 'A A♭ G ✗ · C B B♭ ✓' } },
      },
      {
        say: { en: 'Practice slowly with a metronome on 2 and 4. Start from every degree of C7, sing or play the line in eighths, and say which half steps you will add before you start.', he: 'תרגלו לאט עם מטרונום על 2 ו־4. התחילו מכל דרגה של C7, שירו או נגנו את הקו בשמיניות, ואמרו מראש אילו חצאי טונים תוסיפו.' },
      },
      {
        say: { en: 'In real music: the line from 1 with B added is what David Baker later called the dominant bebop scale. Charlie Parker’s and Bud Powell’s lines are full of these passing half steps.', he: 'במוזיקה אמיתית: הקו מ־1 עם סי מוסף הוא מה שדייוויד בייקר כינה מאוחר יותר סולם ביבופ דומיננטי. הקווים של צ׳רלי פרקר ובאד פאוול מלאים בחצאי טונים עוברים כאלה.' },
      },
      {
        say: { en: 'To keep: chord tones on the beat. From a chord tone add one, or three; from a non-chord tone none, or two. The first fix is always between 1 and ♭7.', he: 'לזכור: צלילי אקורד על הפעמה. מצליל אקורד מוסיפים אחד, או שלושה; מצליל שאינו באקורד אפס, או שניים. התיקון הראשון תמיד בין 1 ל־♭7.' },
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
    more: [
      {
        say: { en: 'A pivot is a change of octave in the middle of a line. The notes and the rhythm stay the same; from the pivot on, the line simply continues an octave higher — or lower.', he: 'פיבוט הוא החלפת אוקטבה באמצע קו. הצלילים והקצב נשארים אותו דבר; מנקודת הפיבוט, הקו פשוט ממשיך אוקטבה למעלה — או למטה.' },
        play: [line([72, 71, 70, 69, 67, 77, 76, 74, 72], 112)],
        show: { notes: [72, 71, 70, 69, 67, 77, 76, 74, 72], key: 'C', text: { en: 'C B B♭ A G ↑ F E D C', he: 'C B B♭ A G ↑ F E D C' } },
      },
      {
        say: { en: 'Why Barry used it: his material is mostly descending scale lines, and a long descent soon runs out of room. Pivots let a line keep falling for bars while it stays in one comfortable octave.', he: 'למה בארי השתמש בזה: החומר שלו הוא בעיקר קווי סולם יורדים, וירידה ארוכה נגמרת מהר. פיבוטים מאפשרים לקו להמשיך לרדת לאורך תיבות ולהישאר באוקטבה נוחה אחת.' },
      },
      {
        say: { en: 'The pivot does not change the rhythm, so the beat placement survives: chord tones stay on the beats. A pivot on a beat, onto a chord tone, makes the leap sound most deliberate.', he: 'הפיבוט לא משנה את הקצב, ולכן המיקום על הפעמות נשמר: צלילי האקורד נשארים על הפעמות. פיבוט על פעמה, אל צליל אקורד, נותן לקפיצה את הצליל הכי מכוון.' },
        play: [line([72, 71, 70, 69, 79, 77, 76, 74, 72], 112)],
        show: { notes: [72, 71, 70, 69, 79, 77, 76, 74, 72], key: 'C', text: { en: 'pivot onto G, on the beat', he: 'פיבוט אל G, על הפעמה' } },
      },
      {
        say: { en: 'What you actually hear is a leap of a 7th, not an octave: a step down plus an octave up. From A to the high G, the jump is a minor 7th.', he: 'מה שבאמת שומעים הוא קפיצה של ספטימה, לא של אוקטבה: צעד למטה ועוד אוקטבה למעלה. מלה לסול הגבוה, הקפיצה היא ספטימה קטנה.' },
        play: [notes([69, 79], 0.7)],
        show: { notes: [69, 79], key: 'C', text: { en: 'A → G = 7th', he: 'A → G = ספטימה' } },
      },
      {
        say: { en: 'Pivots also go down. When a rising line climbs too high, drop the rest an octave: G, A, B♭, C, then D, E, F, G an octave lower.', he: 'פיבוטים הולכים גם למטה. כשקו עולה מטפס גבוה מדי, מורידים את השאר אוקטבה: סול, לה, סי במול, דו, ואז רה, מי, פה, סול אוקטבה למטה.' },
        play: [line([67, 69, 70, 72, 62, 64, 65, 67], 112)],
        show: { notes: [67, 69, 70, 72, 62, 64, 65, 67], key: 'C', text: { en: 'G A B♭ C ↓ D E F G', he: 'G A B♭ C ↓ D E F G' } },
      },
      {
        say: { en: 'Combine it with the half-step rules. From 5 with B added, pivoting before C: G, F, E, D, then C, B, B♭, A, G up an octave — chord tones still on the beats.', he: 'שלבו את זה עם כללי חצאי הטונים. מ־5 עם סי מוסף, ופיבוט לפני דו: סול, פה, מי, רה, ואז דו, סי, סי במול, לה, סול אוקטבה למעלה — וצלילי האקורד עדיין על הפעמות.' },
        play: [chord(C7, 0.8), rest(0.2), line([67, 65, 64, 62, 72, 71, 70, 69, 67], 112)],
        show: { notes: [67, 65, 64, 62, 72, 71, 70, 69, 67], key: 'C', text: { en: 'G F E D ↑ C B B♭ A G', he: 'G F E D ↑ C B B♭ A G' } },
      },
      {
        say: { en: 'Common mistake: repeating the note at the pivot. The next note must be the next scale note, only in a new octave. If you hear a clean octave jump, a note was repeated. Wrong, then right:', he: 'טעות נפוצה: לחזור על הצליל בנקודת הפיבוט. הצליל הבא חייב להיות הצליל הבא בסולם, רק באוקטבה חדשה. אם שומעים קפיצת אוקטבה נקייה, צליל חזר על עצמו. שגוי, ואז נכון:' },
        play: [line([72, 71, 70, 69, 81, 79, 77, 76, 74], 112, 1), rest(0.4), line([72, 71, 70, 69, 79, 77, 76, 74, 72], 112, 1)],
        show: { text: { en: 'A ↑ A ✗ · A ↑ G ✓', he: 'A ↑ A ✗ · A ↑ G ✓' } },
      },
      {
        say: { en: 'Practice: sing or play a long descending line and pivot on a cue — every four notes, then every three. In the exercise, count the notes aloud and name the one where the leap lands.', he: 'תרגול: שירו או נגנו קו יורד ארוך ועשו פיבוט לפי סימן — כל ארבעה צלילים, אחר כך כל שלושה. בתרגיל, ספרו את הצלילים בקול ותנו שם לצליל שבו הקפיצה נוחתת.' },
      },
      {
        say: { en: 'In real music, octave displacement runs all through bebop: a line seems to break off and reappear an octave away, which keeps long phrases fresh and inside the instrument’s best range.', he: 'במוזיקה אמיתית, הזזת אוקטבה נמצאת לאורך כל הביבופ: קו נשמע כאילו נשבר ומופיע שוב אוקטבה משם, וזה שומר על משפטים ארוכים רעננים ובתוך המנעד הטוב של הכלי.' },
      },
      {
        say: { en: 'To keep: a pivot moves the rest of a line an octave — same notes, same rhythm. You hear it as a sudden leap of a 7th.', he: 'לזכור: פיבוט מזיז את שארית הקו אוקטבה — אותם צלילים, אותו קצב. שומעים אותו כקפיצה פתאומית של ספטימה.' },
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
        say: { en: 'Hey {name}! Put G in the bass under B diminished, and you get G7♭9 — a dominant with a spicy flat nine.', he: 'היי {name}! שמים סול בבס מתחת לסי דימיניש, ומקבלים G7♭9 — דומיננט עם ♭9 חריף.' },
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
    more: [
      {
        say: { en: 'Precisely: a 7♭9 chord is its root plus a diminished 7th built on its 3rd. G7♭9 is G under B, D, F, A♭. Any dominant whose 3rd, 5th, ♭7 and ♭9 are those four notes is a brother.', he: 'בדיוק: אקורד 7♭9 הוא השורש שלו ועוד דימיניש שבנוי על הטרצה. G7♭9 הוא סול מתחת לסי, רה, פה, לה במול. כל דומיננט שהטרצה, הקווינטה, ה־♭7 וה־♭9 שלו הם ארבעת הצלילים האלה — הוא אח.' },
        play: [chord([43, 59, 62, 65, 68], 1.5)],
        show: { notes: [43, 59, 62, 65, 68], chord: true, key: 'C', text: { en: 'G7♭9 = G + B°7', he: 'G7♭9 = G + B°7' } },
      },
      {
        say: { en: 'The four brother roots — G, B♭, D♭, E — form a diminished chord themselves. Each root is a note of B°7 lowered a half step: exactly the lowering rule you already know.', he: 'ארבעת שורשי האחים — סול, סי במול, רה במול, מי — יוצרים בעצמם אקורד דימיניש. כל שורש הוא צליל של B°7 שירד בחצי טון: בדיוק כלל ההורדה שאתם כבר מכירים.' },
        play: [notes([43, 46, 49, 52], 0.5)],
        show: { notes: [43, 46, 49, 52], key: 'C', clef: 'bass', text: { en: 'G B♭ D♭ E', he: 'G B♭ D♭ E' } },
      },
      {
        say: { en: 'Tritone brothers share the tritone itself. In G7, B and F are the 3rd and ♭7; in D♭7 the same two notes are the ♭7 (C♭) and the 3rd. The roles swap, the tension stays.', he: 'אחים בטריטון חולקים את הטריטון עצמו. ב־G7 סי ופה הם הטרצה וה־♭7; ב־D♭7 אותם שני צלילים הם ה־♭7 (דו במול) והטרצה. התפקידים מתחלפים, המתח נשאר.' },
        play: [chord([43, 59, 65], 1.1), rest(0.3), chord([49, 59, 65], 1.1)],
        show: { text: { en: 'G7: B=3 F=♭7 · D♭7: F=3 C♭=♭7', he: 'G7: B=3 F=♭7 · D♭7: F=3 C♭=♭7' } },
      },
      {
        say: { en: 'Minor-third brothers share two notes too. G7 and B♭7 both contain D and F: in G7 they are the 5th and ♭7, in B♭7 the 3rd and 5th.', he: 'גם אחים בטרצה קטנה חולקים שני צלילים. ב־G7 וב־B♭7 יש רה ופה: ב־G7 הם הקווינטה וה־♭7, ב־B♭7 הטרצה והקווינטה.' },
        play: [chord([43, 62, 65, 71], 1.1), rest(0.2), chord([46, 62, 65, 68], 1.1)],
        show: { text: { en: 'G7 · B♭7: D F shared', he: 'G7 · B♭7: D F משותפים' } },
      },
      {
        say: { en: 'Using them in a ii–V–I: replace G7 with D♭7 and the bass slides down by half steps, D, D♭, C — the tritone substitution. Dm7, D♭7, Cmaj7:', he: 'שימוש ב־ii–V–I: מחליפים את G7 ב־D♭7 והבס מחליק בחצאי טונים, רה, רה במול, דו — תחליף הטריטון. Dm7, D♭7, Cmaj7:' },
        play: [chord([50, 60, 65, 69], 1.1), chord([49, 59, 65, 68], 1.1), chord([48, 59, 64, 67], 1.6)],
        show: { text: { en: 'Dm7 → D♭7 → Cmaj7', he: 'Dm7 → D♭7 → Cmaj7' } },
      },
      {
        say: { en: 'Or use the brother a whole step below home: B♭7 to C, the Backdoor dominant, often after Fm7. It resolves softly, with A♭ falling to G.', he: 'או משתמשים באח שנמצא טון שלם מתחת לבית: B♭7 לדו, הדומיננט של ה־Backdoor, לרוב אחרי Fm7. הוא נפתר ברכות, ולה במול יורד לסול.' },
        play: [chord([41, 60, 63, 68], 1), chord([46, 62, 65, 68], 1), chord([48, 60, 64, 67], 1.6)],
        show: { text: { en: 'Fm7 → B♭7 → C', he: 'Fm7 → B♭7 → C' } },
      },
      {
        say: { en: 'How to hear brothers: sing the two roots. Three half steps apart, up or down, or six — brothers. A whole step, a fourth or a fifth — not from the same family.', he: 'איך שומעים אחים: שירו את שני השורשים. שלושה חצאי טונים, למעלה או למטה, או שישה — אחים. טון שלם, קוורטה או קווינטה — לא מאותה משפחה.' },
        play: [notes([43, 46], 0.6), rest(0.3), notes([43, 45], 0.6)],
        show: { text: { en: 'G–B♭ ✓ · G–A ✗', he: 'G–B♭ ✓ · G–A ✗' } },
      },
      {
        say: { en: 'Common mistake: treating every brother alike. The tritone brother keeps the tension and moves the bass smoothly; the minor-third brothers change the color more. E7 in place of G7 sounds most surprising — it leans toward A minor.', he: 'טעות נפוצה: להתייחס לכל האחים אותו דבר. אח הטריטון שומר על המתח ומזיז את הבס בחלקות; האחים בטרצה קטנה משנים את הצבע יותר. E7 במקום G7 נשמע הכי מפתיע — הוא נוטה ללה מינור.' },
      },
      {
        say: { en: 'Practice: hold B°7 in the right hand and walk the left hand G, B♭, D♭, E, naming each 7♭9. Then resolve each one to its own home, and to C.', he: 'תרגול: החזיקו B°7 ביד ימין והוליכו את יד שמאל סול, סי במול, רה במול, מי, ותנו שם לכל 7♭9. אחר כך פתרו כל אחד לבית שלו, ולדו.' },
      },
      {
        say: { en: 'To keep: four dominants a minor third apart share one diminished chord — their 3, 5, ♭7 and ♭9. The tritone brother is the tritone sub.', he: 'לזכור: ארבעה דומיננטים במרחק טרצה קטנה חולקים דימיניש אחד — ה־3, 5, ♭7 ו־♭9 שלהם. האח בטריטון הוא תחליף הטריטון.' },
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
    more: [
      {
        say: { en: 'Precisely: an added half step is a chromatic passing note. It fills a whole-step gap with the note in between. Half-step gaps — E–F and B–C in C major — have no room.', he: 'בדיוק: חצי טון מוסף הוא צליל עובר כרומטי. הוא ממלא מרווח של טון שלם בצליל שבאמצע. במרווחים של חצי טון — מי–פה וסי–דו בדו מז׳ור — אין מקום.' },
        play: [notes([64, 65], 0.4), rest(0.3), notes([67, 68, 69], 0.35)],
        show: { text: { en: 'E F · G A♭ A', he: 'E F · G A♭ A' } },
      },
      {
        say: { en: 'In major there are five whole-step gaps: 1–2, 2–3, 4–5, 5–6 and 6–7. Each gives a different eight-note scale, and each changes which notes land on the beats.', he: 'במז׳ור יש חמישה מרווחים של טון שלם: 1–2, 2–3, 4–5, 5–6 ו־6–7. כל אחד נותן סולם אחר של שמונה צלילים, וכל אחד משנה אילו צלילים נוחתים על הפעמות.' },
        show: { text: { en: '1–2 · 2–3 · 4–5 · 5–6 · 6–7', he: '1–2 · 2–3 · 4–5 · 5–6 · 6–7' } },
      },
      {
        say: { en: 'Why add a note at all: a seven-note scale in eighth notes drifts against the beat. Eight notes fill a 4/4 bar exactly. Coming down with A♭ added, C, A, G, E and C land on the beats.', he: 'למה להוסיף צליל בכלל: סולם של שבעה צלילים בשמיניות זוחל ביחס לפעמה. שמונה צלילים ממלאים בדיוק תיבה של 4/4. בירידה עם לה במול מוסף, דו, לה, סול, מי ודו נוחתים על הפעמות.' },
        play: [line([72, 71, 69, 68, 67, 65, 64, 62, 60], 120)],
        show: { notes: [72, 71, 69, 68, 67, 65, 64, 62, 60], key: 'C', text: { en: 'C · A · G · E · C on the beats', he: 'C · A · G · E · C על הפעמות' } },
      },
      {
        say: { en: 'The two classic choices: A♭ between 5 and 6 over a major or 6 chord — Barry’s 6th-diminished scale — and B between ♭7 and 1 over a dominant. Both are known as bebop scales.', he: 'שתי הבחירות הקלאסיות: לה במול בין 5 ל־6 מעל אקורד מז׳ור או 6 — סולם 6 דימיניש של בארי — וסי בין ♭7 ל־1 מעל דומיננט. שניהם מוכרים כסולמות ביבופ.' },
        play: [chord(C7, 0.8), rest(0.2), line(FROM_1)],
        show: { notes: FROM_1, key: 'C', text: { en: 'C B B♭ A G F E D C', he: 'C B B♭ A G F E D C' } },
      },
      {
        say: { en: 'How to find it by ear: count the scale notes and listen for the spot where the line slides by half steps. Inside that slide, the note that is not in the key is the extra one.', he: 'איך מוצאים אותו באוזן: ספרו את צלילי הסולם והקשיבו למקום שבו הקו מחליק בחצאי טונים. בתוך ההחלקה הזאת, הצליל שלא שייך לסולם הוא הנוסף.' },
        play: [notes([60, 62, 64, 65, 66, 67, 69, 71, 72], 0.3)],
        show: { notes: [60, 62, 64, 65, 66, 67, 69, 71, 72], key: 'C', text: { en: 'E F F♯ G — F♯ is extra', he: 'E F F♯ G — F♯ הנוסף' } },
      },
      {
        say: { en: 'Common mistake: counting E–F or B–C as an added note. Those half steps belong to the major scale. Compare E, F, G with E, F, F♯, G — only the second has an extra note.', he: 'טעות נפוצה: לספור את מי–פה או סי–דו כצליל מוסף. חצאי הטונים האלה שייכים לסולם המז׳ור. השוו מי, פה, סול למי, פה, פה דיאז, סול — רק בשני יש צליל נוסף.' },
        play: [notes([64, 65, 67], 0.35), rest(0.4), notes([64, 65, 66, 67], 0.35)],
        show: { text: { en: 'E F G · E F F♯ G', he: 'E F G · E F F♯ G' } },
      },
      {
        say: { en: 'Practice: sing the major scale and insert a half step in each of the five gaps in turn, saying the numbers aloud and the extra note as “and”. Then do the same down the dominant scale.', he: 'תרגול: שירו את סולם המז׳ור והכניסו חצי טון בכל אחד מחמשת המרווחים בתורו, ואמרו את המספרים בקול ואת הצליל הנוסף כ"ו". אחר כך אותו דבר בירידה בסולם הדומיננט.' },
      },
      {
        say: { en: 'In real music these passing notes are the sound of bebop: Charlie Parker, Bud Powell and Barry Harris used them to keep long eighth-note lines flowing over the chords.', he: 'במוזיקה אמיתית הצלילים העוברים האלה הם הצליל של הביבופ: צ׳רלי פרקר, באד פאוול ובארי האריס השתמשו בהם כדי שקווים ארוכים בשמיניות ימשיכו לזרום מעל האקורדים.' },
      },
      {
        say: { en: 'To keep: the extra note splits a whole step. Find the slide, then the note that is not in the key — that is the added half step.', he: 'לזכור: הצליל הנוסף מפצל טון שלם. מצאו את ההחלקה, ואז את הצליל שלא שייך לסולם — זה חצי הטון המוסף.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: the singing track
  {
    id: 'vocal-barry',
    area: 'jazz',
    emoji: '🎤',
    title: { en: 'Sing the Barry Harris way', he: 'לשיר בדרך של בארי האריס' },
    takeaway: { en: 'Sing the 6th-diminished scale, sing the one note that turns a diminished chord into a dominant or minor 6, then sing half-step lines and the harmonized scale.', he: 'שרים את סולם 6 דימיניש, שרים את הצליל האחד שהופך דימיניש לדומיננט או למינור 6, ואז שרים קווים עם חצאי טונים ואת הסולם המהורמן.' },
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
        say: { en: 'Finally, the harmonized scale: you sing each note while the piano adds its chord underneath — 6, diminished, 6, diminished.', he: 'ולסיום, הסולם המהורמן: אתם שרים כל צליל והפסנתר מוסיף מתחתיו את האקורד שלו — 6, דימיניש, 6, דימיניש.' },
        play: HARMONISED.map((c, i) => chord(c, i === HARMONISED.length - 1 ? 1.4 : 0.8)),
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '6 · ° · 6 · ° · 6', he: '6 · ° · 6 · ° · 6' } },
      },
      {
        say: { en: 'Your turn! Start at level one: listen to the scale, then sing it up from C — eight notes, A♭ and A both in there. A clear “la” works best.', he: 'תורכם! מתחילים ברמה אחת: הקשיבו לסולם, ואז שירו אותו בעלייה מדו — שמונה צלילים, גם לה במול וגם לה. "לה" ברור עובד הכי טוב.' },
        play: [{ kind: 'note', midi: 60, duration: 1.2 }],
        show: { notes: [60], key: 'C', text: { en: 'sing from C', he: 'שירו מדו' } },
      },
    ],
    more: [
      {
        say: { en: 'Singing puts the system in your ear, not just your fingers. Use numbers or letter names so every note has a label: 1, 2, 3, 4, 5, ♭6, 6, 7 for the 6th-diminished scale.', he: 'שירה מכניסה את השיטה לאוזן, לא רק לאצבעות. השתמשו במספרים או בשמות הצלילים, כך שלכל צליל יש תווית: 1, 2, 3, 4, 5, ♭6, 6, 7 לסולם 6 דימיניש.' },
        play: [notes(SIXDIM_C, 0.36)],
        show: { notes: SIXDIM_C, key: 'C', text: { en: '1 2 3 4 5 ♭6 6 7 8', he: '1 2 3 4 5 ♭6 6 7 8' } },
      },
      {
        say: { en: 'The hard spot is the top: G, A♭, A, then a whole step to B. Practice it slowly — G, A♭, A, then G, A, B — until the two half steps sound clearly smaller than the whole step.', he: 'המקום הקשה הוא למעלה: סול, לה במול, לה, ואז טון שלם לסי. תרגלו לאט — סול, לה במול, לה, ואז סול, לה, סי — עד שחצאי הטונים נשמעים קטנים בבירור מהטון השלם.' },
        play: [notes([67, 68, 69, 71], 0.45), rest(0.4), notes([67, 69, 71], 0.45)],
        show: { notes: [67, 68, 69, 71], key: 'C', text: { en: 'G A♭ A B', he: 'G A♭ A B' } },
      },
      {
        say: { en: 'Sing the two chords as arpeggios. C6 rises a major third, a minor third, then a whole step. B°7 is three minor thirds in a row — keep each one exactly three half steps.', he: 'שירו את שני האקורדים כארפג׳ו. C6 עולה טרצה גדולה, טרצה קטנה, ואז טון שלם. B°7 הוא שלוש טרצות קטנות ברצף — שמרו על כל אחת בדיוק שלושה חצאי טונים.' },
        play: [notes([60, 64, 67, 69], 0.45), rest(0.3), notes([59, 62, 65, 68], 0.45)],
        show: { text: { en: 'C E G A · B D F A♭', he: 'C E G A · B D F A♭' } },
      },
      {
        say: { en: 'To sing the moving note, first find its neighbor in the chord. For G7, hum A♭ inside B°7, then slide down a half step to G. The piano fills in the dominant.', he: 'כדי לשיר את הצליל שזז, מצאו קודם את השכן שלו באקורד. בשביל G7, זמזמו את לה במול בתוך B°7, ואז החליקו חצי טון למטה לסול. הפסנתר משלים את הדומיננט.' },
        play: [chord(B_DIM, 1), tone(68, 0.7), tone(67, 0.9), chord(G7, 1.4)],
        show: { text: { en: 'A♭ → G', he: 'A♭ → G' } },
      },
      {
        say: { en: 'From a dominant to its home root: home is a fifth below the dominant’s root, and the dominant’s 3rd rises a half step to it. In G7, find B and step up to C.', he: 'מדומיננט לשורש הבית: הבית נמצא קווינטה מתחת לשורש הדומיננט, והטרצה של הדומיננט עולה אליו בחצי טון. ב־G7, מצאו את סי ועלו צעד לדו.' },
        play: [chord([55, 59, 62, 65], 1.2), tone(59, 0.7), tone(60, 1.2)],
        show: { text: { en: 'G7: B → C', he: 'G7: B → C' } },
      },
      {
        say: { en: 'For half-step lines, sing at a slow tempo and tap the beat. Chord tones go on the taps; the added half steps pass quickly between them. Sing the line from 1:', he: 'בקווים עם חצאי טונים, שירו בטמפו איטי והקישו את הפעמה. צלילי האקורד על ההקשות; חצאי הטונים הנוספים עוברים מהר ביניהן. שירו את הקו מ־1:' },
        play: [line(FROM_1, 80)],
        show: { notes: FROM_1, key: 'C', text: { en: 'C B B♭ A G F E D C', he: 'C B B♭ A G F E D C' } },
      },
      {
        say: { en: 'Common mistake: half steps that drift. A♭ and A, or B and B♭, can blur into one note. Check against the piano, and slow down on the half steps until they are clean.', he: 'טעות נפוצה: חצאי טונים שזוחלים. לה במול ולה, או סי וסי במול, עלולים להתמזג לצליל אחד. בדקו מול הפסנתר, והאטו בחצאי הטונים עד שהם נקיים.' },
      },
      {
        say: { en: 'Choose a comfortable octave, or move the whole exercise to another key — the system works the same everywhere. If a line runs out of range, pivot: jump the rest up an octave.', he: 'בחרו אוקטבה נוחה, או העבירו את כל התרגיל לסולם אחר — השיטה עובדת אותו דבר בכל מקום. אם קו יוצא מהמנעד, עשו פיבוט: הקפיצו את השאר אוקטבה למעלה.' },
      },
      {
        say: { en: 'To keep: label every note, find the moving note from its neighbor, and keep the half steps small and clean.', he: 'לזכור: תנו תווית לכל צליל, מצאו את הצליל שזז דרך השכן שלו, ושמרו על חצאי טונים קטנים ונקיים.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Play & improvise: backing tracks
  {
    id: 'perform-backing',
    area: 'play',
    emoji: '🥁',
    title: { en: 'Play along with the band', he: 'לנגן עם הלהקה' },
    takeaway: { en: 'The band: a walking bass (one note a beat), Charleston comping (beat 1 and the "and" of 2) and a swung ride — over ii–V–I, minor ii–V–i or blues.', he: 'הלהקה: ווקינג בס (צליל לכל פעמה), ליווי צ׳רלסטון (פעמה 1 וה"ו" של 2) ורייד בסווינג — מעל ii–V–I, ii–V–i במינור או בלוז.' },
    steps: [
      {
        say: { en: 'Hey {name}! Time to play with a band — a tiny one living in your phone. Bass, piano and ride cymbal loop a chord chart while you join in.', he: 'היי {name}! הגיע הזמן לנגן עם להקה — קטנה, שגרה לכם בטלפון. בס, פסנתר ומצילת רייד מנגנים בלופ רצף אקורדים, ואתם מצטרפים.' },
        play: [band('ii-V-I', 132)],
        show: { text: { en: 'Dm7 | G7 | Cmaj7 | Cmaj7', he: 'Dm7 | G7 | Cmaj7 | Cmaj7' } },
      },
      {
        say: { en: 'The bass walks: one note per beat, climbing through the chord, then stepping into the next chord by a half step.', he: 'ווקינג בס: צליל אחד לכל פעמה, מטפס באקורד, ואז נכנס לאקורד הבא בחצי טון.' },
        play: [band('ii-V-I', 132, (m) => m < 55)],
        show: { text: { en: '♩ ♩ ♩ ♩', he: '♩ ♩ ♩ ♩' } },
      },
      {
        say: { en: 'The piano comps in the Charleston rhythm: on beat 1 and on the “and” of 2 — just the 3rd, the 7th and a color note.', he: 'הפסנתר מלווה בקצב צ׳רלסטון: על פעמה 1 ועל ה"ו" של 2 — רק טרצה, ספטימה וצליל צבע.' },
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
    more: [
      {
        say: { en: 'Each player has a job. The bass gives the roots and the time, the piano the harmony and rhythmic hits, the drums the groove. When you join, you are the fourth voice — leave them room.', he: 'לכל נגן יש תפקיד. הבס נותן את השורשים ואת הזמן, הפסנתר את ההרמוניה ונקישות קצביות, התופים את הגרוב. כשאתם מצטרפים, אתם הקול הרביעי — השאירו להם מקום.' },
        play: [band('ii-V-I', 132)],
        show: { text: { en: 'bass · piano · drums · you', he: 'בס · פסנתר · תופים · אתם' } },
      },
      {
        say: { en: 'A walking bass line, beat by beat: the root on beat 1, chord or scale notes on 2 and 3, and on 4 an approach note — often a half step from the next root. Here D, E, F, F♯ lead to G.', he: 'קו ווקינג בס, פעמה אחרי פעמה: השורש בפעמה 1, צלילי אקורד או סולם ב־2 וב־3, ובפעמה 4 צליל גישה — לרוב חצי טון מהשורש הבא. כאן רה, מי, פה, פה דיאז מובילים לסול.' },
        play: [timed(120, [[38, 0, 1], [40, 1, 1], [41, 2, 1], [42, 3, 1], [43, 4, 1], [47, 5, 1], [50, 6, 1], [49, 7, 1], [48, 8, 2]])],
        show: { notes: [38, 40, 41, 42, 43], key: 'C', clef: 'bass', text: { en: 'D E F F♯ → G', he: 'D E F F♯ → G' } },
      },
      {
        say: { en: 'The Charleston rhythm: a hit on beat 1 and another on the “and” of 2, then space for the rest of the bar. Short, light chords, so the bass and the soloist can be heard.', he: 'קצב הצ׳רלסטון: נקישה בפעמה 1 ועוד אחת על ה"ו" של 2, ואז מרווח לשאר התיבה. אקורדים קצרים וקלים, כדי שהבס והסולן יישמעו.' },
        play: [timed(120, [
          [53, 0, 0.5], [60, 0, 0.5], [64, 0, 0.5], [53, 5 / 3, 0.5], [60, 5 / 3, 0.5], [64, 5 / 3, 0.5],
          [53, 4, 0.5], [59, 4, 0.5], [64, 4, 0.5], [53, 4 + 5 / 3, 0.5], [59, 4 + 5 / 3, 0.5], [64, 4 + 5 / 3, 0.5],
        ])],
        show: { text: { en: '1 · (2) & · 3 · 4', he: '1 · (2) ו · 3 · 4' } },
      },
      {
        say: { en: 'The ride cymbal plays quarter notes with a swung skip into beats 2 and 4: ding, ding-a ding, ding-a. Drummers usually add the hi-hat on 2 and 4 — together, the heartbeat of swing.', he: 'מצילת הרייד מנגנת רבעים עם קפיצה בסווינג לתוך פעמות 2 ו־4: דינג, דינג־א דינג, דינג־א. מתופפים מוסיפים בדרך כלל היי־האט על 2 ו־4 — ויחד זה הדופק של הסווינג.' },
        play: [band('ii-V-I', 132, (m) => m >= 90)],
        show: { text: { en: 'ding, ding-a ding, ding-a', he: 'דינג, דינג־א דינג, דינג־א' } },
      },
      {
        say: { en: 'The three forms. Major ii–V–I: four bars, Dm7, G7, then two bars of Cmaj7. Minor: Dø7, G7♭9, two bars of Cm6. Blues: twelve bars, three lines of four — one of the most played forms in jazz.', he: 'שלושת המבנים. ii–V–I במז׳ור: ארבע תיבות, Dm7, G7, ואז שתי תיבות Cmaj7. במינור: Dø7, G7♭9, שתי תיבות Cm6. בלוז: שתים־עשרה תיבות, שלוש שורות של ארבע — אחד המבנים הנפוצים ביותר בג׳אז.' },
        show: { text: { en: '4 bars · 4 bars · 12 bars', he: '4 תיבות · 4 תיבות · 12 תיבות' } },
      },
      {
        say: { en: 'How to stay in place: find beat 1 by the bass root and the ride, then count bars — one-two-three-four, two-two-three-four. Knowing where the form starts again is half of playing with a band.', he: 'איך לא ללכת לאיבוד: מצאו את פעמה 1 לפי שורש הבס והרייד, ואז ספרו תיבות — אחת־שתיים־שלוש־ארבע, שתיים־שתיים־שלוש־ארבע. לדעת איפה המבנה מתחיל מחדש זה חצי מהנגינה עם להקה.' },
      },
      {
        say: { en: 'Common mistakes: rushing ahead of the bass, playing in the same low register as the bass, and losing count at the end of the form. Lock onto the ride, stay above the bass, keep counting.', he: 'טעויות נפוצות: לרוץ לפני הבס, לנגן באותו מנעד נמוך של הבס, ולאבד את הספירה בסוף המבנה. היצמדו לרייד, הישארו מעל הבס, והמשיכו לספור.' },
      },
      {
        say: { en: 'A practice ladder: roots with the bass, then 3rds and 7ths with the piano, then a simple rhythm on the Charleston hits, then short phrases. Raise the tempo only when it all feels easy.', he: 'סולם תרגול: שורשים עם הבס, אחר כך טרצות וספטימות עם הפסנתר, אחר כך קצב פשוט על נקישות הצ׳רלסטון, ואז משפטים קצרים. העלו טמפו רק כשהכול מרגיש קל.' },
      },
      {
        say: { en: 'In real music: the Charleston rhythm comes from James P. Johnson’s 1923 song “Charleston”. Walking bass grew up in the swing era, and bebop drummers such as Kenny Clarke moved the time onto the ride cymbal.', he: 'במוזיקה אמיתית: קצב הצ׳רלסטון בא מהשיר "Charleston" של ג׳יימס פ. ג׳ונסון משנת 1923. הווקינג בס צמח בתקופת הסווינג, ומתופפי ביבופ כמו קני קלארק העבירו את הזמן למצילת הרייד.' },
      },
      {
        say: { en: 'To keep: the bass walks, the piano hits 1 and the “and” of 2, the ride swings — count the bars and fit into the space they leave.', he: 'לזכור: הבס צועד, הפסנתר מנקש על 1 ועל ה"ו" של 2, הרייד מסווינג — ספרו תיבות והשתלבו במרווח שהם משאירים.' },
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
    more: [
      {
        say: { en: '“Making the changes” means your line shows the chords even without the band. The way to do it: chord tones on the strong beats, 1 and 3; other notes on the weak beats, passing between them.', he: '"לעשות את ההרמוניה" פירושו שהקו שלכם מראה את האקורדים גם בלי הלהקה. הדרך: צלילי אקורד בפעמות החזקות, 1 ו־3; צלילים אחרים בפעמות החלשות, עוברים ביניהם.' },
        play: [timed(120, [[69, 0, 1], [67, 1, 1], [65, 2, 1], [64, 3, 1], [74, 4, 1], [72, 5, 1], [71, 6, 1], [69, 7, 1], [67, 8, 2]])],
        show: { text: { en: 'Dm7: A F · G7: D B · C: G', he: 'Dm7: A F · G7: D B · C: G' } },
      },
      {
        say: { en: 'The strongest chord tones are the guide tones, the 3rd and 7th. Across a ii–V–I they move by tiny steps: C, the 7th of Dm7, falls to B, the 3rd of G7; F, the 7th of G7, falls to E in Cmaj7.', he: 'צלילי האקורד החזקים ביותר הם הצלילים המנחים, הטרצה והספטימה. לאורך ii–V–I הם זזים בצעדים זעירים: דו, הספטימה של Dm7, יורד לסי, הטרצה של G7; פה, הספטימה של G7, יורד למי ב־Cmaj7.' },
        play: [chord([50, 60, 65], 1.1), chord([43, 59, 65], 1.1), chord([48, 59, 64], 1.6)],
        show: { text: { en: 'C → B · F → E', he: 'C → B · F → E' } },
      },
      {
        say: { en: 'Endings: the root sounds most final, the 3rd and 5th almost as settled. On a major 7 chord, ending on the 7th or 9th sounds open and modern. Avoid the 4th over a major chord — it clashes with the 3rd.', he: 'סיומים: השורש נשמע הכי סופי, הטרצה והקווינטה כמעט באותה יציבות. על אקורד maj7, סיום על הספטימה או על ה־9 נשמע פתוח ומודרני. הימנעו מקוורטה מעל אקורד מז׳ור — היא מתנגשת בטרצה.' },
        play: [chord([48, 59, 64, 72], 1.3), rest(0.2), chord([48, 59, 64, 74], 1.3), rest(0.2), chord([48, 59, 64, 77], 1.3)],
        show: { text: { en: 'C ✓ · D ~ · F ✗', he: 'C ✓ · D ~ · F ✗' } },
      },
      {
        say: { en: 'Rhythm and space: think in phrases of one or two bars with a breath after each. Repeat a short motif and change it slightly — the ear follows a solo that remembers itself.', he: 'קצב ומרווח: חשבו במשפטים של תיבה או שתיים עם נשימה אחרי כל אחד. חזרו על מוטיב קצר ושנו אותו מעט — האוזן עוקבת אחרי סולו שזוכר את עצמו.' },
        play: [timed(120, [[67, 0, 0.5], [64, 0.5, 0.5], [65, 1, 0.5], [67, 1.5, 1.5], [69, 4, 0.5], [65, 4.5, 0.5], [67, 5, 0.5], [69, 5.5, 1.5]])],
        show: { text: { en: 'motif · rest · motif, changed', he: 'מוטיב · הפסקה · מוטיב, משתנה' } },
      },
      {
        say: { en: 'Range and shape: a phrase usually rises and falls like an arch. Use at least a sixth, and let the high point come once — a line stuck on three notes sounds as if it is circling.', he: 'מנעד וצורה: משפט בדרך כלל עולה ויורד כמו קשת. השתמשו לפחות בסקסטה, ותנו לשיא להגיע פעם אחת — קו שתקוע על שלושה צלילים נשמע כאילו הוא מסתובב במקום.' },
      },
      {
        say: { en: 'Approach notes come in three kinds: from a half step below, from a half step above, or an enclosure — above, then below, then the target. Here F and D♯ close in on E.', he: 'צלילי גישה באים בשלושה סוגים: מחצי טון מתחת, מחצי טון מעל, או Enclosure (הקפה) — מעל, אחר כך מתחת, ואז היעד. כאן פה ורה דיאז סוגרים על מי.' },
        play: [timed(120, [[48, 0, 4, 0.45], [55, 0, 4, 0.4], [59, 0, 4, 0.4], [65, 0, 0.5], [63, 0.5, 0.5], [64, 1, 2]])],
        show: { notes: [65, 63, 64], key: 'C', text: { en: 'F D♯ → E', he: 'F D♯ → E' } },
      },
      {
        say: { en: 'Practice one pointer at a time: first only chord tones in quarter notes, then add approach notes, then rests and motifs. Record yourself and listen back once — it shows more than any score.', he: 'תרגלו הערה אחת בכל פעם: קודם רק צלילי אקורד ברבעים, אחר כך הוסיפו צלילי גישה, ואז הפסקות ומוטיבים. הקליטו את עצמכם והקשיבו פעם אחת — זה מראה יותר מכל ציון.' },
      },
      {
        say: { en: 'Common mistakes: running scales with no target, filling every beat, and ending on whatever note comes. Decide where a phrase will land before you start it.', he: 'טעויות נפוצות: לרוץ בסולמות בלי יעד, למלא כל פעמה, ולסיים על הצליל שיוצא. החליטו לאן המשפט ינחת לפני שאתם מתחילים אותו.' },
      },
      {
        say: { en: 'In real music, jazz has always been learned by ear: players copy solos from records phrase by phrase and sing them before they play them. Even two bars of a favorite solo teach all five pointers.', he: 'במוזיקה אמיתית, ג׳אז תמיד נלמד באוזן: נגנים מעתיקים סולואים מהקלטות משפט אחרי משפט, ושרים אותם לפני שהם מנגנים. אפילו שתי תיבות מסולו אהוב מלמדות את כל חמש ההערות.' },
      },
      {
        say: { en: 'To keep: chord tones on 1 and 3, a clear ending, rhythms that breathe, an arching range, and half-step approaches.', he: 'לזכור: צלילי אקורד על 1 ו־3, סיום ברור, קצב שנושם, מנעד בצורת קשת, וגישה בחצי טון.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Play & improvise: MIDI keyboard drills
  {
    id: 'perform-midi',
    area: 'play',
    emoji: '🎹',
    title: { en: 'Keyboard drills', he: 'תרגילי מקלדת' },
    takeaway: { en: 'Voicings (any, shell 1-3-7, rootless 3-5-7-9), play it back, an even scale, and ii–V–I with guide tones in all keys.', he: 'וויסינגים (כל וויסינג, Shell 1-3-7, בלי שורש 3-5-7-9), לנגן בחזרה, סולם אחיד, ו־ii–V–I עם צלילים מנחים בכל הסולמות.' },
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
        say: { en: 'A shell is exactly three notes: the root at the bottom, plus the 3rd and the 7th. Cmaj7 shell: C, E, B. Lean, and very jazz.', he: 'Shell הוא בדיוק שלושה צלילים: השורש למטה, ועוד הטרצה והספטימה. ה־Shell של Cmaj7: דו, מי, סי. רזה, וג׳אזי מאוד.' },
        play: [chord([48, 52, 59], 1.6)],
        show: { notes: [48, 52, 59], chord: true, key: 'C', text: { en: 'shell 1-3-7', he: 'Shell 1-3-7' } },
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
    more: [
      {
        say: { en: 'A voicing is the choice of which chord notes to play, in which octave and order. Close position keeps them inside an octave; open position spreads them out. The same Cmaj7, two sounds:', he: 'וויסינג הוא הבחירה אילו צלילי אקורד לנגן, באיזו אוקטבה ובאיזה סדר. מצב צפוף שומר אותם בתוך אוקטבה; מצב פתוח מפזר אותם. אותו Cmaj7, שני צלילים:' },
        play: [chord([60, 64, 67, 71], 1.3), rest(0.3), chord([48, 55, 64, 71], 1.5)],
        show: { text: { en: 'close · open', he: 'צפוף · פתוח' } },
      },
      {
        say: { en: 'Shells come in two shapes: 1-3-7 and 1-7-3. Alternate them through a ii–V–I and the hand barely moves: Dm7 as D, C, F; G7 as G, B, F; Cmaj7 as C, B, E.', he: 'ל־Shell יש שתי צורות: 1-3-7 ו־1-7-3. מחליפים ביניהן לאורך ii–V–I והיד כמעט לא זזה: Dm7 כ־רה, דו, פה; G7 כ־סול, סי, פה; Cmaj7 כ־דו, סי, מי.' },
        play: [chord([50, 60, 65], 1), chord([43, 59, 65], 1), chord([48, 59, 64], 1.5)],
        show: { text: { en: '1-7-3 · 1-3-7 · 1-7-3', he: '1-7-3 · 1-3-7 · 1-7-3' } },
      },
      {
        say: { en: 'Rootless voicings also come in two shapes: 3-5-7-9 and 7-9-3-5. On G7 the second shape usually takes the 13th instead of the 5th: F, A, B, E.', he: 'גם לוויסינגים בלי שורש יש שתי צורות: 3-5-7-9 ו־7-9-3-5. ב־G7 הצורה השנייה לוקחת בדרך כלל את ה־13 במקום הקווינטה: פה, לה, סי, מי.' },
        play: [tone(43, 0.6), chord([43, 65, 69, 71, 76], 1.4)],
        show: { notes: [65, 69, 71, 76], chord: true, key: 'C', text: { en: 'G7: F A B E = 7 9 3 13', he: 'G7: F A B E = 7 9 3 13' } },
      },
      {
        say: { en: 'Put them together: Dm7 as F, A, C, E; G7 as F, A, B, E; Cmaj7 as E, G, B, D. Few notes move, and each by a step or less.', he: 'מחברים: Dm7 כ־פה, לה, דו, מי; G7 כ־פה, לה, סי, מי; Cmaj7 כ־מי, סול, סי, רה. מעט צלילים זזים, וכל אחד בצעד או פחות.' },
        play: [chord([38, 65, 69, 72, 76], 1.1), chord([43, 65, 69, 71, 76], 1.1), chord([48, 64, 67, 71, 74], 1.6)],
        show: { text: { en: 'Dm7 → G7 → Cmaj7', he: 'Dm7 → G7 → Cmaj7' } },
      },
      {
        say: { en: 'The guide-tone rule behind it: the 7th of one chord falls a half step to the 3rd of the next, and the 3rd holds to become the next 7th. In ii–V–I: C to B, then F to E.', he: 'כלל הצלילים המנחים שמאחורי זה: הספטימה של אקורד אחד יורדת חצי טון לטרצה של הבא, והטרצה נשארת והופכת לספטימה הבאה. ב־ii–V–I: דו לסי, ואז פה למי.' },
      },
      {
        say: { en: 'For the even scale, fingering keeps it smooth. Right hand in C: 1, 2, 3, then the thumb passes under to F: 1, 2, 3, 4, 5. Slow and even beats fast and bumpy — use a metronome.', he: 'בסולם האחיד, האצבוע שומר על חלקות. יד ימין בדו: 1, 2, 3, ואז האגודל עובר מתחת לפה: 1, 2, 3, 4, 5. לאט ואחיד עדיף על מהיר וקופצני — השתמשו במטרונום.' },
        play: [notes([60, 62, 64, 65, 67, 69, 71, 72], 0.3)],
        show: { notes: [60, 62, 64, 65, 67, 69, 71, 72], key: 'C', text: { en: '1 2 3 · 1 2 3 4 5', he: '1 2 3 · 1 2 3 4 5' } },
      },
      {
        say: { en: 'For “play it back”, hear the phrase in your head before touching a key. Find the first note, then think in steps and leaps. Sing it once if you are unsure.', he: 'ב"לנגן בחזרה", שמעו את המשפט בראש לפני שאתם נוגעים במקש. מצאו את הצליל הראשון, ואז חשבו בצעדים ובקפיצות. שירו אותו פעם אחת אם אתם לא בטוחים.' },
      },
      {
        say: { en: 'All twelve keys go around the circle of fourths: C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G. Each key is a fourth above the last — the same move as V to I.', he: 'כל שנים־עשר הסולמות עוברים במעגל הקוורטות: C, F, B♭, E♭, A♭, D♭, G♭, B, E, A, D, G. כל סולם נמצא קוורטה מעל הקודם — אותה תנועה כמו V ל־I.' },
      },
      {
        say: { en: 'Common mistakes: close thirds too low sound muddy — keep them above roughly the C below middle C — and chords that blur into each other. Release one chord cleanly before the next. Low, then clear:', he: 'טעויות נפוצות: טרצות צפופות נמוך מדי נשמעות עכורות — שמרו אותן בערך מעל הדו שמתחת לדו האמצעי — ואקורדים שנבלעים זה בזה. שחררו אקורד אחד בצורה נקייה לפני הבא. נמוך, ואז ברור:' },
        play: [chord([40, 43, 47, 50], 1.3), rest(0.3), chord([52, 55, 59, 62], 1.3)],
        show: { text: { en: 'Em7 low ✗ · Em7 mid ✓', he: 'Em7 נמוך ✗ · Em7 באמצע ✓' } },
      },
      {
        say: { en: 'To keep: shells 1-3-7 and 1-7-3, rootless 3-5-7-9 and 7-9-3-5, and guide tones that move by a half step or stay put.', he: 'לזכור: Shell של 1-3-7 ו־1-7-3, וויסינג בלי שורש 3-5-7-9 ו־7-9-3-5, וצלילים מנחים שזזים בחצי טון או נשארים במקום.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: same notes, other names
  {
    id: 'bh-family',
    area: 'jazz',
    emoji: '🧬',
    title: { en: 'Barry Harris: same notes, other names', he: 'בארי האריס: אותם צלילים, שמות אחרים' },
    takeaway: { en: 'C6 = Am7, Cm6 = Am7♭5, and a diminished chord is a 7♭9 without its root — the bass decides the name.', he: 'C6 = Am7, Cm6 = Am7♭5, ודימיניש הוא 7♭9 בלי השורש — הבס קובע את השם.' },
    steps: [
      {
        say: { en: 'Barry Harris taught that many chord names are the same four notes over a different bass. Listen: C6, then Am7. The upper notes stay; only the bass moves.', he: 'בארי האריס לימד שהרבה שמות של אקורדים הם אותם ארבעה צלילים מעל בס אחר. הקשיבו: C6, ואז Am7. הצלילים העליונים נשארים; רק הבס זז.' },
        play: [chord([48, 60, 64, 67, 69], 1.3), rest(0.3), chord([45, 60, 64, 67, 69], 1.5)],
        show: { text: { en: 'C6 = Am7', he: 'C6 = Am7' } },
      },
      {
        say: { en: 'C6 is C, E, G, A. Start from the A and read up: A, C, E, G — that is Am7. Its root sits a minor third below the root of the 6 chord.', he: 'C6 הוא דו, מי, סול, לה. מתחילים מהלה וקוראים למעלה: לה, דו, מי, סול — זה Am7. השורש שלו נמצא טרצה קטנה מתחת לשורש של אקורד ה־6.' },
        play: [notes([60, 64, 67, 69], 0.35), rest(0.3), notes([57, 60, 64, 67], 0.35)],
        show: { notes: [57, 60, 64, 67], key: 'C', text: { en: 'C E G A = A C E G', he: 'C E G A = A C E G' } },
      },
      {
        say: { en: 'Minor works the same way. Cm6 — C, E♭, G, A — has exactly the notes of Am7♭5, the half-diminished chord on A.', he: 'במינור זה עובד אותו דבר. Cm6 — דו, מי במול, סול, לה — מכיל בדיוק את הצלילים של Am7♭5, אקורד חצי־מוקטן על לה.' },
        play: [chord([48, 60, 63, 67, 69], 1.3), rest(0.3), chord([45, 60, 63, 67, 69], 1.5)],
        show: { notes: [60, 63, 67, 69], chord: true, key: 'C', text: { en: 'Cm6 = Am7♭5', he: 'Cm6 = Am7♭5' } },
      },
      {
        say: { en: 'A diminished chord is a 7♭9 chord without its root. B, D, F, A♭ with G underneath is G7♭9.', he: 'אקורד דימיניש הוא אקורד 7♭9 בלי השורש. סי, רה, פה, לה במול עם סול מתחת — זה G7♭9.' },
        play: [chord(B_DIM, 1), rest(0.2), chord([43, ...B_DIM], 1.5)],
        show: { notes: [43, ...B_DIM], chord: true, key: 'C', text: { en: 'B°7 + G = G7♭9', he: 'B°7 + G = G7♭9' } },
      },
      {
        say: { en: 'Put a bass a half step below any of its four notes and you get another dominant: G, B♭, D♭ or E. One diminished chord, four dominants.', he: 'שימו בס חצי טון מתחת לכל אחד מארבעת הצלילים שלו, ותקבלו דומיננט אחר: סול, סי במול, רה במול או מי. דימיניש אחד, ארבעה דומיננטים.' },
        play: [chord([43, ...B_DIM], 0.9), chord([46, ...B_DIM], 0.9), chord([49, ...B_DIM], 0.9), chord([40, ...B_DIM], 1.3)],
        show: { text: { en: 'G7♭9 · B♭7♭9 · D♭7♭9 · E7♭9', he: 'G7♭9 · B♭7♭9 · D♭7♭9 · E7♭9' } },
      },
      {
        say: { en: 'Barry’s advice: think of the 6 chord. For Dm7 think F6, for Bm7♭5 think Dm6, and for G7 think of a diminished chord.', he: 'העצה של בארי: חשבו על אקורד ה־6. על Dm7 חשבו F6, על Bm7♭5 חשבו Dm6, ועל G7 חשבו על דימיניש.' },
        play: [chord([50, 65, 69, 72, 74], 1.5)],
        show: { text: { en: 'Dm7 → F6 · Bm7♭5 → Dm6 · G7 → °7', he: 'Dm7 → F6 · Bm7♭5 → Dm6 · G7 → °7' } },
      },
      {
        say: { en: 'Your turn. First on paper: which chord has the same four notes? Then by ear: the same notes over a bass. Hum the bass — it names the chord.', he: 'תורכם. קודם על הנייר: לאיזה אקורד יש אותם ארבעה צלילים? אחר כך בשמיעה: אותם צלילים מעל בס. זמזמו את הבס — הוא קובע את השם.' },
        play: [chord([45, 60, 64, 67, 69], 1.6)],
        show: { text: { en: 'C6 or Am7?', he: 'C6 או Am7?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why it works: a 6 chord and the minor 7 chord a minor third below share all four notes. The 6th of one is the root of the other. Minor 6 and half-diminished pair up the same way: Fm6 equals Dm7♭5.', he: 'למה זה עובד: אקורד 6 ואקורד המינור 7 שנמצא טרצה קטנה מתחתיו חולקים את כל ארבעת הצלילים. ה־6 של האחד הוא השורש של השני. מינור 6 וחצי־מוקטן מתחברים באותה צורה: Fm6 שווה ל־Dm7♭5.' },
        play: [chord([41, 60, 62, 65, 68], 1.3), rest(0.3), chord([38, 60, 62, 65, 68], 1.5)],
        show: { notes: [60, 62, 65, 68], chord: true, key: 'C', text: { en: 'Fm6 = Dm7♭5', he: 'Fm6 = Dm7♭5' } },
      },
      {
        say: { en: 'A diminished chord repeats every minor third, so there are only three of them: C°7, C♯°7 and D°7. Every other diminished chord is one of these, spelled from another note.', he: 'אקורד דימיניש חוזר על עצמו כל טרצה קטנה, ולכן יש רק שלושה כאלה: C°7, C♯°7 ו־D°7. כל דימיניש אחר הוא אחד מהם, כתוב מצליל אחר.' },
        play: [chord([60, 63, 66, 69], 0.9), chord([61, 64, 67, 70], 0.9), chord([62, 65, 68, 71], 1.3)],
        show: { text: { en: 'C°7 · C♯°7 · D°7', he: 'C°7 · C♯°7 · D°7' } },
      },
      {
        say: { en: 'Each one serves four dominants a minor third apart. B°7 — the same notes as D°7 — belongs to G7, B♭7, D♭7 and E7. G and D♭ are a tritone apart, and so are B♭ and E: tritone substitutes, built in.', he: 'כל אחד מהם משרת ארבעה דומיננטים במרחק טרצה קטנה זה מזה. B°7 — אותם צלילים כמו D°7 — שייך ל־G7, B♭7, D♭7 ו־E7. בין סול לרה במול יש טריטון, וגם בין סי במול למי: תחליפי טריטון, מובנים בפנים.' },
        show: { text: { en: 'B°7 → G7 · B♭7 · D♭7 · E7', he: 'B°7 → G7 · B♭7 · D♭7 · E7' } },
      },
      {
        say: { en: 'To find a dominant on paper: pick any note of the diminished chord and go down a half step — that is a root. A♭ gives G, B gives B♭, D gives D♭, F gives E.', he: 'כדי למצוא דומיננט על הנייר: בחרו צליל כלשהו בדימיניש ורדו חצי טון — זה שורש. לה במול נותן סול, סי נותן סי במול, רה נותן רה במול, פה נותן מי.' },
        show: { text: { en: 'A♭→G · B→B♭ · D→D♭ · F→E', he: 'A♭→G · B→B♭ · D→D♭ · F→E' } },
      },
      {
        say: { en: 'By ear, the upper notes cannot tell you the name — the bass can. Over C, the notes C, E, G, A sound sweet and settled; over A they turn soft and minor. Hum the lowest note first.', he: 'בשמיעה, הצלילים העליונים לא יגידו לכם את השם — הבס כן. מעל דו, הצלילים דו, מי, סול, לה נשמעים מתוקים ויציבים; מעל לה הם הופכים לרכים ומינוריים. זמזמו קודם את הצליל הנמוך.' },
        play: [chord([48, 60, 64, 67, 69], 1.2), tone(48, 0.8), rest(0.3), chord([45, 60, 64, 67, 69], 1.2), tone(45, 0.8)],
        show: { text: { en: 'C6 · Am7', he: 'C6 · Am7' } },
      },
      {
        say: { en: 'The common mistake is going the wrong way. The minor 7 root is a minor third below the 6 chord: C6 is Am7, not E♭m7. And in a 7♭9 the root sits a half step below a diminished note, not above it.', he: 'הטעות הנפוצה היא ללכת לכיוון הלא נכון. השורש של המינור 7 נמצא טרצה קטנה מתחת לאקורד ה־6: C6 הוא Am7, לא E♭m7. וב־7♭9 השורש נמצא חצי טון מתחת לצליל של הדימיניש, לא מעליו.' },
        show: { text: { en: 'C6 = Am7 ✓ · E♭m7 ✗', he: 'C6 = Am7 ✓ · E♭m7 ✗' } },
      },
      {
        say: { en: 'How Barry used it: since Dm7 is F6 and G7 borrows B°7, a whole ii–V–I can be played with 6 chords and diminished chords. F6 over D, B°7 over G, then home to C6.', he: 'איך בארי השתמש בזה: מכיוון ש־Dm7 הוא F6 ו־G7 שואל את B°7, אפשר לנגן ii–V–I שלם עם אקורדי 6 ודימיניש. F6 מעל רה, B°7 מעל סול, ואז הביתה ל־C6.' },
        play: [chord([50, 65, 69, 72, 74], 1.1), chord([43, 59, 62, 65, 68], 1.1), chord([48, 64, 67, 69, 72], 1.6)],
        show: { text: { en: 'F6/D → B°7/G → C6', he: 'F6/D → B°7/G → C6' } },
      },
      {
        say: { en: 'Practice: play a 6 chord with its root in the bass, then move only the bass down a minor third and name the new chord aloud. Do it in major and minor, then around the circle of fourths.', he: 'תרגול: נגנו אקורד 6 עם השורש בבס, ואז הזיזו רק את הבס טרצה קטנה למטה ואמרו בקול את שם האקורד החדש. עשו את זה במז׳ור ובמינור, ואחר כך לאורך מעגל הקוורטות.' },
      },
      {
        say: { en: 'To keep: 6 = minor 7 a minor third below, minor 6 = half-diminished a minor third below, diminished = 7♭9 without the root. The bass decides the name.', he: 'לזכור: 6 = מינור 7 טרצה קטנה מתחת, מינור 6 = חצי־מוקטן טרצה קטנה מתחת, דימיניש = 7♭9 בלי השורש. הבס קובע את השם.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Barry Harris: block chords
  {
    id: 'bh-block',
    area: 'jazz',
    emoji: '🧱',
    title: { en: 'Barry Harris: block chords', he: 'בארי האריס: אקורדי בלוק' },
    takeaway: { en: 'Harmonize the 6th-diminished scale in Drop 2: 1, 3, 5, 6 get the 6 chord; 2, 4, ♭6, 7 get the diminished chord.', he: 'מהרמנים את סולם 6 דימיניש ב־Drop 2: דרגות 1, 3, 5, 6 מקבלות את אקורד ה־6; דרגות 2, 4, ♭6, 7 מקבלות את הדימיניש.' },
    steps: [
      {
        say: { en: 'Barry Harris block chords put a full chord under every note of the 6th-diminished scale — four voices moving together. Listen to C, all the way up.', he: 'אקורדי הבלוק של בארי האריס שמים אקורד מלא מתחת לכל צליל בסולם 6 דימיניש — ארבעה קולות שזזים יחד. הקשיבו לדו, לאורך כל האוקטבה.' },
        play: blocks(BLK),
        show: { text: { en: '6 ° 6 ° 6 ° 6 ° 6', he: '6 ° 6 ° 6 ° 6 ° 6' } },
      },
      {
        say: { en: 'The rule: scale notes 1, 3, 5 and 6 — C, E, G, A — get the C6 chord. Notes 2, 4, ♭6 and 7 — D, F, A♭, B — get the diminished chord, B°7.', he: 'הכלל: צלילי הסולם 1, 3, 5 ו־6 — דו, מי, סול, לה — מקבלים את אקורד C6. הצלילים 2, 4, ♭6 ו־7 — רה, פה, לה במול, סי — מקבלים את הדימיניש, B°7.' },
        play: blocks(BLK.slice(0, 3), 0.8),
        show: { text: { en: '1 3 5 6 → C6 · 2 4 ♭6 7 → B°7', he: '1 3 5 6 → C6 · 2 4 ♭6 7 → B°7' } },
      },
      {
        say: { en: 'The voicing is Drop 2. Stack the chord close under the melody note, then drop the second voice from the top an octave. Close first, then Drop 2.', he: 'הוויסינג הוא Drop 2. בונים את האקורד צפוף מתחת לצליל המלודיה, ואז מורידים את הקול השני מלמעלה באוקטבה. קודם צפוף, אחר כך Drop 2.' },
        play: [chord([64, 67, 69, 72], 1.2), rest(0.3), chord([57, 64, 67, 72], 1.5)],
        show: { notes: [57, 64, 67, 72], chord: true, key: 'C', text: { en: 'E G A C → A E G C', he: 'E G A C → A E G C' } },
      },
      {
        say: { en: 'Played in order, the chords take turns: rest, tension, rest. Each diminished chord leans into the 6 chords on both sides.', he: 'כשמנגנים לפי הסדר, האקורדים מתחלפים: מנוחה, מתח, מנוחה. כל דימיניש נשען אל אקורדי ה־6 משני צדדיו.' },
        play: blocks([BLK[2], BLK[3], BLK[4], BLK[3], BLK[2]], 0.8),
        show: { text: { en: '6 · ° · 6 · ° · 6', he: '6 · ° · 6 · ° · 6' } },
      },
      {
        say: { en: 'Make the home chord minor, Cm6, and you get the minor version. The diminished chords stay the same; every E becomes E♭.', he: 'הופכים את אקורד הבית למינור, Cm6, ומקבלים את הגרסה המינורית. אקורדי הדימיניש נשארים אותו דבר; כל מי הופך למי במול.' },
        play: blocks(BLK_MIN.slice(0, 5), 0.6),
        show: { text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
      {
        say: { en: 'Pianists use it two ways: to comp, moving through the scale over one chord, and to harmonize a melody, one block chord per note. Here is E, D, C.', he: 'פסנתרנים משתמשים בזה בשתי דרכים: לליווי, תנועה בסולם מעל אקורד אחד, ולהרמוניזציה של מלודיה, אקורד בלוק לכל צליל. הנה מי, רה, דו.' },
        play: blocks([BLK[2], BLK[1], BLK[0]], 0.8, 1.4),
        show: { notes: [76, 74, 72], key: 'C', text: { en: 'E D C', he: 'מי רה דו' } },
      },
      {
        say: { en: 'Your turn. Is a block chord a 6 chord or diminished? Where did a run stop? Major or minor? And in a short melody, how many diminished chords?', he: 'תורכם. האם אקורד בלוק הוא אקורד 6 או דימיניש? איפה נעצרה ריצה? מז׳ורי או מינורי? ובמלודיה קצרה — כמה אקורדי דימיניש?' },
        play: [chord(BLK[0], 1), rest(0.4), chord(BLK[5], 1.4)],
        show: { text: { en: '6 or °?', he: '6 או °?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why every note gets a chord: the scale is two chords woven together, so each of its eight notes belongs to exactly one of them. No note is left as a passing tone without harmony.', he: 'למה כל צליל מקבל אקורד: הסולם הוא שני אקורדים שזורים יחד, ולכן כל אחד משמונת הצלילים שייך בדיוק לאחד מהם. אף צליל לא נשאר צליל מעבר בלי הרמוניה.' },
        play: [line([72, 74, 76, 77, 79, 80, 81, 83, 84], 120, 1)],
        show: { notes: [72, 74, 76, 77, 79, 80, 81, 83, 84], key: 'C', text: { en: 'C D E F G A♭ A B C', he: 'C D E F G A♭ A B C' } },
      },
      {
        say: { en: 'Drop 2 precisely: take the four chord notes in close position, melody on top. Count down from the top and lower voice 2 by an octave. C6 with C on top: E, G, A, C becomes A, E, G, C.', he: 'Drop 2 בדיוק: לוקחים את ארבעת צלילי האקורד במצב צפוף, המלודיה למעלה. סופרים מלמעלה ומורידים את קול 2 באוקטבה. C6 עם דו למעלה: מי, סול, לה, דו הופך ללה, מי, סול, דו.' },
        show: { notes: [57, 64, 67, 72], chord: true, key: 'C', text: { en: 'Drop 2', he: 'Drop 2' } },
      },
      {
        say: { en: 'The result spans more than an octave, so it splits between the hands: left hand on the lowest note, right hand on the top three. It sounds open and warm, like a sax section.', he: 'התוצאה מתפרסת על יותר מאוקטבה, ולכן מתחלקת בין הידיים: יד שמאל על הצליל הנמוך, יד ימין על שלושת העליונים. זה נשמע פתוח וחם, כמו גזרת סקסופונים.' },
        play: blocks(BLK.slice(0, 3), 1.2, 1.5),
        show: { notes: [59, 65, 68, 74], chord: true, key: 'C', text: { en: 'B°7: B F A♭ D', he: 'B°7: B F A♭ D' } },
      },
      {
        say: { en: 'Four Drop 2 shapes of C6 — C, E, G or A on top — and four of B°7 — D, F, A♭ or B on top — alternate up the octave. The diminished shapes all look alike: it is a symmetrical chord.', he: 'ארבע צורות Drop 2 של C6 — דו, מי, סול או לה למעלה — וארבע של B°7 — רה, פה, לה במול או סי למעלה — מתחלפות לאורך האוקטבה. צורות הדימיניש נראות כולן אותו דבר: זה אקורד סימטרי.' },
        play: blocks(BLK, 0.45, 1.2),
        show: { text: { en: '6 ° 6 ° 6 ° 6 ° 6', he: '6 ° 6 ° 6 ° 6 ° 6' } },
      },
      {
        say: { en: 'Minor: Cm6 with C on top is A, E♭, G, C. Here is the whole minor scale in block chords.', he: 'במינור: Cm6 עם דו למעלה הוא לה, מי במול, סול, דו. הנה כל הסולם המינורי באקורדי בלוק.' },
        play: blocks(BLK_MIN, 0.45, 1.2),
        show: { notes: [57, 63, 67, 72], chord: true, key: 'C', text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
      {
        say: { en: 'To hear major against minor, ignore the diminished chords — they are identical in both. Listen only to the 6 chords: is the 3rd E or E♭?', he: 'כדי להבחין בין מז׳ור למינור, התעלמו מאקורדי הדימיניש — הם זהים בשניהם. הקשיבו רק לאקורדי ה־6: הטרצה היא מי או מי במול?' },
        play: [chord(BLK[2], 1.2), rest(0.3), chord(BLK_MIN[2], 1.4)],
        show: { text: { en: 'E · E♭', he: 'מי · מי במול' } },
      },
      {
        say: { en: 'Comping with it: over one long C6, walk the top voice up and down the scale. The chords keep moving, yet the harmony never leaves C.', he: 'ליווי בעזרתו: מעל C6 ארוך אחד, הזיזו את הקול העליון למעלה ולמטה בסולם. האקורדים ממשיכים לזוז, אבל ההרמוניה לא עוזבת את דו.' },
        play: blocks([BLK[2], BLK[3], BLK[4], BLK[3], BLK[2], BLK[1], BLK[0]], 0.45, 1.2),
        show: { text: { en: 'E F G F E D C', he: 'מי פה סול פה מי רה דו' } },
      },
      {
        say: { en: 'The common mistake: putting the 6 chord under a diminished note. D belongs to the diminished, B°7, not to C6 — so D gets B°7. Wrong, then right:', he: 'הטעות הנפוצה: לשים אקורד 6 מתחת לצליל של הדימיניש. רה שייך לדימיניש, B°7, ולא ל־C6 — ולכן רה מקבל B°7. לא נכון, ואז נכון:' },
        play: [chord([57, 64, 67, 74], 1.3), rest(0.3), chord(BLK[1], 1.4)],
        show: { text: { en: 'D on C6 ✗ · D on B°7 ✓', he: 'רה על C6 ✗ · רה על B°7 ✓' } },
      },
      {
        say: { en: 'In real music, parallel block chords go back to Milt Buckner and George Shearing’s “locked hands”. Drop 2 is the more open cousin, standard in big-band sax writing. Barry’s system builds it from just two chords.', he: 'במוזיקה אמיתית, אקורדי בלוק מקבילים חוזרים למילט באקנר ולסגנון ה־"locked hands" של ג׳ורג׳ שירינג. Drop 2 הוא בן הדוד הפתוח יותר, סטנדרט בכתיבה לגזרת סקסופונים בביג בנד. השיטה של בארי בונה אותו משני אקורדים בלבד.' },
      },
      {
        say: { en: 'To keep: 1, 3, 5, 6 get the 6 chord; 2, 4, ♭6, 7 get the diminished — voiced in Drop 2, alternating rest and tension.', he: 'לזכור: 1, 3, 5, 6 מקבלים את אקורד ה־6; 2, 4, ♭6, 7 מקבלים את הדימיניש — ב־Drop 2, מנוחה ומתח לסירוגין.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Comping rhythms
  {
    id: 'comping',
    area: 'jazz',
    emoji: '🎶',
    title: { en: 'Comping rhythms', he: 'מקצבי ליווי (קומפינג)' },
    takeaway: { en: 'Comping = short chords in the gaps: Charleston (1, and of 2), reverse (and of 1, 3), Red Garland (and of 2, and of 4), anticipation, four to the bar.', he: 'קומפינג = אקורדים קצרים ברווחים: צ׳רלסטון (1, ו־2), צ׳רלסטון הפוך (ו־1, 3), רד גרלנד (ו־2, ו־4), הקדמה, ארבע לתיבה.' },
    steps: [
      {
        say: { en: 'Comping is how a pianist or guitarist accompanies in jazz: short chords placed in the gaps, while bass and drums keep the time. A few rhythms come up again and again.', he: 'קומפינג הוא הדרך שבה פסנתרן או גיטריסט מלווים בג׳אז: אקורדים קצרים שממוקמים ברווחים, בזמן שהבס והתופים שומרים על הזמן. כמה מקצבים חוזרים שוב ושוב.' },
        play: [comp([[0, 1.5], [0.5, 2]])],
        show: { text: { en: 'comping', he: 'קומפינג' } },
      },
      {
        say: { en: 'The Charleston: a chord on beat 1 and on the “and” of 2. In swing that “and” arrives late, on the last third of the beat.', he: 'הצ׳רלסטון: אקורד על פעמה 1 ועל ה"ו" של 2. בסווינג ה"ו" הזה מגיע מאוחר, בשליש האחרון של הפעמה.' },
        play: [comp([[0, 1.5], [0, 1.5]])],
        show: { text: { en: '1 · and of 2', he: '1 · ו־2' } },
      },
      {
        say: { en: 'The reverse Charleston turns it around: the “and” of 1, then beat 3. The first chord comes just after the beat.', he: 'הצ׳רלסטון ההפוך הופך את זה: ה"ו" של 1, ואז פעמה 3. האקורד הראשון מגיע רגע אחרי הפעמה.' },
        play: [comp([[0.5, 2], [0.5, 2]])],
        show: { text: { en: 'and of 1 · 3', he: 'ו־1 · 3' } },
      },
      {
        say: { en: 'Red Garland, after the pianist in Miles Davis’s 1950s quintet: the “and” of 2 and the “and” of 4. Only off-beats — light, and pushing forward.', he: 'רד גרלנד, על שם הפסנתרן של החמישייה של מיילס דייוויס בשנות ה־50: ה"ו" של 2 וה"ו" של 4. רק אוף־ביטים — קליל, ודוחף קדימה.' },
        play: [comp([[1.5, 3.5], [1.5, 3.5]])],
        show: { text: { en: 'and of 2 · and of 4', he: 'ו־2 · ו־4' } },
      },
      {
        say: { en: 'An anticipation plays the next chord early, on the “and” of 4, and holds it over the bar line. Here F arrives before its bar.', he: 'הקדמה מנגנת את האקורד הבא מוקדם, על ה"ו" של 4, ומחזיקה אותו מעבר לקו התיבה. כאן F מגיע לפני התיבה שלו.' },
        play: [ANTICIP],
        show: { text: { en: 'C7 … F on the and of 4', he: 'C7 … F על ו־4' } },
      },
      {
        say: { en: 'Four to the bar: a short, even chord on every beat — the sound of Freddie Green’s guitar in the Count Basie band.', he: 'ארבע לתיבה: אקורד קצר ואחיד על כל פעמה — הצליל של הגיטרה של פרדי גרין בתזמורת של קאונט בייסי.' },
        play: [comp([[0, 1, 2, 3], [0, 1, 2, 3]], 0.7)],
        show: { text: { en: '1 2 3 4', he: '1 2 3 4' } },
      },
      {
        say: { en: 'Your turn. Bass and hi-hat keep the time — which rhythm is the piano playing? Ask first: does the first chord land on the beat, or just after it?', he: 'תורכם. הבס וההיי־האט שומרים על הזמן — באיזה מקצב הפסנתר מנגן? שאלו קודם: האקורד הראשון נוחת על הפעמה, או רגע אחריה?' },
        show: { text: { en: 'on the beat or after?', he: 'על הפעמה או אחריה?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why comping leaves space: the bass and drums already mark every beat, and the soloist owns the foreground. A few well-placed chords make the time feel stronger and give the soloist room to breathe — and something to answer.', he: 'למה הקומפינג משאיר מקום: הבס והתופים כבר מסמנים כל פעמה, והסולן מחזיק את החזית. כמה אקורדים במקום הנכון מחזקים את תחושת הזמן ונותנים לסולן מקום לנשום — ומשהו לענות לו.' },
      },
      {
        say: { en: 'Count “1 and 2 and 3 and 4 and”. In swing each beat splits unevenly, about two thirds plus one third, so every “and” falls late. The Charleston is beat 1 plus the “and” of 2: a dotted quarter, then an eighth.', he: 'ספרו "1 ו 2 ו 3 ו 4 ו". בסווינג כל פעמה מתחלקת באופן לא שווה, בערך שני שלישים ועוד שליש, ולכן כל "ו" נופל מאוחר. הצ׳רלסטון הוא פעמה 1 ועוד ה"ו" של 2: רבע עם נקודה, ואז שמינית.' },
        play: [comp([[0, 1.5], [0, 1.5]])],
        show: { text: { en: '♩. ♪', he: '♩. ♪' } },
      },
      {
        say: { en: 'The reverse Charleston is the same pair shifted half a beat later: the “and” of 1, then 3. Compare them back to back.', he: 'הצ׳רלסטון ההפוך הוא אותו זוג, מוזז חצי פעמה מאוחר יותר: ה"ו" של 1, ואז 3. השוו אחד אחרי השני.' },
        play: [comp([[0, 1.5]]), rest(0.3), comp([[0.5, 2]])],
        show: { text: { en: '1 · 2&  →  1& · 3', he: '1 · ו־2  ←  ו־1 · 3' } },
      },
      {
        say: { en: 'Red Garland played with Miles Davis from 1955 to 1958. His stabs on the “and” of 2 and the “and” of 4 lean into beats 3 and 1, so the groove feels pulled forward.', he: 'רד גרלנד ניגן עם מיילס דייוויס בין 1955 ל־1958. הדקירות שלו על ה"ו" של 2 ושל 4 נשענות אל פעמות 3 ו־1, ולכן הגרוב מרגיש נמשך קדימה.' },
        play: [comp([[1.5, 3.5], [1.5, 3.5]])],
        show: { text: { en: '2& · 4&', he: 'ו־2 · ו־4' } },
      },
      {
        say: { en: 'An anticipation moves the harmony early: the next bar’s chord sounds on the “and” of 4 and is tied across the bar line. At chord changes, it pushes the tune ahead.', he: 'הקדמה מזיזה את ההרמוניה מוקדם: האקורד של התיבה הבאה נשמע על ה"ו" של 4 וממשיך מעבר לקו התיבה. בנקודות של חילופי אקורדים, היא דוחפת את המנגינה קדימה.' },
        play: [ANTICIP],
        show: { text: { en: '4& → tied', he: 'ו־4 ← מוחזק' } },
      },
      {
        say: { en: 'Four to the bar is swing-era rhythm guitar: Freddie Green played short, even chords on every beat with the Count Basie Orchestra for decades, locked in with the bass.', he: 'ארבע לתיבה הוא גיטרת הקצב של תקופת הסווינג: פרדי גרין ניגן אקורדים קצרים ואחידים על כל פעמה בתזמורת של קאונט בייסי במשך עשרות שנים, נעול יחד עם הבס.' },
        play: [comp([[0, 1, 2, 3], [0, 1, 2, 3]], 0.7)],
        show: { text: { en: '1 2 3 4', he: '1 2 3 4' } },
      },
      {
        say: { en: 'How to tell them apart: tap the beat. Does the first chord land on a tap — Charleston or four to the bar — or between taps — reverse, Red Garland or anticipation? Then count the chords in the bar.', he: 'איך מבחינים ביניהם: הקישו את הפעמה. האקורד הראשון נוחת על הקשה — צ׳רלסטון או ארבע לתיבה — או בין ההקשות — הפוך, רד גרלנד או הקדמה? אחר כך ספרו כמה אקורדים יש בתיבה.' },
      },
      {
        say: { en: 'The common mistake is playing the “and” straight, exactly halfway through the beat. Against a swing groove it sounds stiff. Straight first, then swung:', he: 'הטעות הנפוצה היא לנגן את ה"ו" ישר, בדיוק באמצע הפעמה. מול גרוב של סווינג זה נשמע נוקשה. קודם ישר, אחר כך בסווינג:' },
        play: [comp([[0, 1.5], [0, 1.5]], 0.45, true), rest(0.4), comp([[0, 1.5], [0, 1.5]])],
        show: { text: { en: 'straight ✗ · swung ✓', he: 'ישר ✗ · סווינג ✓' } },
      },
      {
        say: { en: 'Practice with a metronome on 2 and 4: comp the Charleston through a ii–V–I, then mix patterns, and leave some bars empty on purpose. Silence is part of comping.', he: 'תרגלו עם מטרונום על 2 ו־4: לוו בצ׳רלסטון לאורך ii–V–I, אחר כך ערבבו מקצבים, והשאירו בכוונה כמה תיבות ריקות. שקט הוא חלק מהקומפינג.' },
      },
      {
        say: { en: 'To keep: comp in the gaps. Charleston — 1 and the “and” of 2; reverse — the “and” of 1 and 3; Red Garland — the “and” of 2 and 4; anticipation — the “and” of 4; Freddie Green — every beat.', he: 'לזכור: מלווים ברווחים. צ׳רלסטון — 1 וה"ו" של 2; הפוך — ה"ו" של 1 ו־3; רד גרלנד — ה"ו" של 2 ושל 4; הקדמה — ה"ו" של 4; פרדי גרין — כל פעמה.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Turnarounds
  {
    id: 'turnarounds',
    area: 'jazz',
    emoji: '🔄',
    title: { en: 'Turnarounds', he: 'טרנאראונדים' },
    takeaway: { en: 'Four chords that lead home: I–vi–ii–V and its substitutes — iii for I, dominants for minors, tritone subs, and the Ladybird.', he: 'ארבעה אקורדים שמובילים הביתה: I–vi–ii–V והתחליפים שלו — iii במקום I, דומיננטים במקום מינורים, תחליפי טריטון, ולידיבירד.' },
    steps: [
      {
        say: { en: 'A turnaround is a short chord loop at the end of a section that leads back to the top. The basic one is I–vi–ii–V: Cmaj7, Am7, Dm7, G7, then home.', he: 'טרנאראונד הוא לופ קצר של אקורדים בסוף קטע, שמוביל חזרה להתחלה. הבסיסי הוא I–vi–ii–V: Cmaj7, Am7, Dm7, G7, ואז הביתה.' },
        play: turn([T_C, T_AM7, T_DM7, T_G7]),
        show: { text: { en: 'I–vi–ii–V', he: 'I–vi–ii–V' } },
      },
      {
        say: { en: 'Start on iii instead: Em7, Am7, Dm7, G7. Em7 shares three notes with Cmaj7, so it sounds like home, only less settled.', he: 'מתחילים ב־iii במקום: Em7, Am7, Dm7, G7. ל־Em7 יש שלושה צלילים משותפים עם Cmaj7, ולכן הוא נשמע כמו בית, רק פחות יציב.' },
        play: turn([T_EM7, T_AM7, T_DM7, T_G7]),
        show: { text: { en: 'iii–vi–ii–V', he: 'iii–vi–ii–V' } },
      },
      {
        say: { en: 'Turn vi into a dominant and it pulls harder: I–VI7–ii–V, with A7 in place of Am7. Or make all four dominant: III7–VI7–II7–V7 — E7, A7, D7, G7.', he: 'הופכים את vi לדומיננט, והוא מושך חזק יותר: I–VI7–ii–V, עם A7 במקום Am7. או שהופכים את כל הארבעה לדומיננטים: III7–VI7–II7–V7 — E7, A7, D7, G7.' },
        play: [...turn([T_C, T_A7, T_DM7, T_G7], 0.65), rest(0.5), ...turn([T_E7, T_A7, T_D7, T_G7], 0.65)],
        show: { text: { en: 'I–VI7–ii–V · III7–VI7–II7–V7', he: 'I–VI7–ii–V · III7–VI7–II7–V7' } },
      },
      {
        say: { en: 'Tritone substitutes swap a dominant for the one a tritone away: I–♭III7–ii–♭II7 — Cmaj7, E♭7, Dm7, D♭7. From E♭ the bass slides down by half steps to C.', he: 'תחליפי טריטון מחליפים דומיננט בזה שנמצא טריטון ממנו: I–♭III7–ii–♭II7 — Cmaj7, E♭7, Dm7, D♭7. ממי במול הבס מחליק למטה בחצאי טונים עד דו.' },
        play: turn([T_C, T_EB7, T_DM7, T_DB7]),
        show: { text: { en: 'I–♭III7–ii–♭II7', he: 'I–♭III7–ii–♭II7' } },
      },
      {
        say: { en: 'The Ladybird, from Tadd Dameron’s tune “Lady Bird”: I–♭III7–♭VImaj7–♭II7 — Cmaj7, E♭7, A♭maj7, D♭7. A quick trip far away, then a half step home.', he: 'הלידיבירד, מהמנגינה "Lady Bird" של טאד דמרון: I–♭III7–♭VImaj7–♭II7 — Cmaj7, E♭7, A♭maj7, D♭7. טיול קצר רחוק מהבית, ואז חצי טון הביתה.' },
        play: turn([T_C, T_EB7, T_AB, T_DB7]),
        show: { text: { en: 'I–♭III7–♭VImaj7–♭II7', he: 'I–♭III7–♭VImaj7–♭II7' } },
      },
      {
        say: { en: 'Your turn: four chords and back home — which turnaround? Follow the bass: thirds and fourths, or half steps? Then listen for bright dominants where minor chords should be.', he: 'תורכם: ארבעה אקורדים וחזרה הביתה — איזה טרנאראונד? עקבו אחרי הבס: טרצות וקוורטות, או חצאי טונים? אחר כך הקשיבו לדומיננטים מוארים במקום שבו היו אמורים להיות אקורדי מינור.' },
        show: { text: { en: 'follow the bass', he: 'עקבו אחרי הבס' } },
      },
    ],
    more: [
      {
        say: { en: 'Every turnaround is a dressed-up I–V–I. The vi and iii stand in for I — Am7 has the same notes as C6 — and ii prepares V. So the four chords say: home, still home, prepare, go.', he: 'כל טרנאראונד הוא I–V–I בבגדים חגיגיים. ה־vi וה־iii מחליפים את I — ל־Am7 יש אותם צלילים כמו ל־C6 — ו־ii מכין את V. כך שארבעת האקורדים אומרים: בית, עדיין בית, הכנה, יוצאים.' },
      },
      {
        say: { en: 'A secondary dominant is the V of a chord other than I. A7 is V of Dm7: its C♯ is a leading tone to D. Compare Am7 to Dm7, then A7 to Dm7.', he: 'דומיננט משני הוא ה־V של אקורד שאינו I. A7 הוא ה־V של Dm7: הדו דיאז שלו הוא צליל מוביל לרה. השוו Am7 אל Dm7, ואז A7 אל Dm7.' },
        play: [chord(T_AM7, 1), chord(T_DM7, 1.2), rest(0.4), chord(T_A7, 1), chord(T_DM7, 1.3)],
        show: { text: { en: 'Am7 → Dm7 · A7 → Dm7', he: 'Am7 → Dm7 · A7 → Dm7' } },
      },
      {
        say: { en: 'With all four dominant, every chord resolves a fourth up into the next: E7, A7, D7, G7, C. The bridge of Rhythm changes uses exactly this chain, two bars per chord.', he: 'כשכל הארבעה דומיננטים, כל אקורד נפתר קוורטה למעלה אל הבא: E7, A7, D7, G7, C. הגשר של Rhythm changes משתמש בדיוק בשרשרת הזאת, שתי תיבות לכל אקורד.' },
        play: turn([T_E7, T_A7, T_D7, T_G7], 0.9),
        show: { text: { en: 'E7 → A7 → D7 → G7 → C', he: 'E7 → A7 → D7 → G7 → C' } },
      },
      {
        say: { en: 'Why the tritone substitute works: G7 and D♭7 share their 3rd and 7th — B and F in G7, F and C♭ in D♭7. Same tension, new bass. Likewise, E♭7 stands in for A7.', he: 'למה תחליף הטריטון עובד: ל־G7 ול־D♭7 יש אותה טרצה וספטימה — סי ופה ב־G7, פה ודו במול ב־D♭7. אותו מתח, בס חדש. באותו אופן, E♭7 מחליף את A7.' },
        play: [chord(T_G7, 1), chord(T_C, 1.2), rest(0.4), chord(T_DB7, 1), chord(T_C, 1.3)],
        show: { text: { en: 'G7 → C · D♭7 → C', he: 'G7 → C · D♭7 → C' } },
      },
      {
        say: { en: 'The bass gives each one away. C A D G: I–vi or I–VI7. E A D G: iii–vi or all dominants. C E♭ D D♭: tritone. C E♭ A♭ D♭: Ladybird, climbing in fourths after E♭.', he: 'הבס מסגיר כל אחד מהם. C A D G: I–vi או I–VI7. E A D G: iii–vi או כולם דומיננטים. C E♭ D D♭: טריטון. C E♭ A♭ D♭: לידיבירד, עולה בקוורטות אחרי מי במול.' },
        play: [notes([48, 45, 50, 43, 48], 0.4), rest(0.4), notes([48, 51, 50, 49, 48], 0.4)],
        show: { notes: [48, 51, 50, 49, 48], clef: 'bass', key: 'C', text: { en: 'C A D G · C E♭ D D♭', he: 'C A D G · C E♭ D D♭' } },
      },
      {
        say: { en: 'The common mistake is trusting the bass alone. I–vi–ii–V and I–VI7–ii–V have the same bass; only the second chord differs — soft Am7 or bright A7. Listen to its color.', he: 'הטעות הנפוצה היא לסמוך רק על הבס. ל־I–vi–ii–V ול־I–VI7–ii–V יש אותו בס; רק האקורד השני שונה — Am7 רך או A7 מואר. הקשיבו לצבע שלו.' },
        play: [chord(T_AM7, 1.2), rest(0.3), chord(T_A7, 1.4)],
        show: { text: { en: 'Am7 · A7', he: 'Am7 · A7' } },
      },
      {
        say: { en: 'The Ladybird borrows a whole cadence: E♭7 to A♭maj7 is V–I in A♭. Then D♭7, the tritone sub of G7, slides a half step home to C.', he: 'הלידיבירד שואל קדנצה שלמה: E♭7 אל A♭maj7 הוא V–I בלה במול. אחר כך D♭7, תחליף הטריטון של G7, מחליק חצי טון הביתה לדו.' },
        play: [chord(T_EB7, 1), chord(T_AB, 1.2), chord(T_DB7, 1), chord(T_C, 1.4)],
        show: { text: { en: 'E♭7 → A♭maj7 → D♭7 → C', he: 'E♭7 → A♭maj7 → D♭7 → C' } },
      },
      {
        say: { en: 'In real music, I–vi–ii–V is the A section of Rhythm changes, from Gershwin’s “I Got Rhythm”, and turnarounds close countless standards and blues choruses. Players swap one for another freely in the same two bars.', he: 'במוזיקה אמיתית, I–vi–ii–V הוא קטע ה־A של Rhythm changes, מתוך "I Got Rhythm" של גרשווין, וטרנאראונדים חותמים אינספור סטנדרטים וכוראסים של בלוז. נגנים מחליפים אחד בשני בחופשיות באותן שתי תיבות.' },
      },
      {
        say: { en: 'Practice each one in C with the root in the left hand and the 3rd and 7th in the right, then in F and B♭. Say the bass notes aloud as you play.', he: 'תרגלו כל אחד בדו, עם השורש ביד שמאל והטרצה והספטימה ביד ימין, ואחר כך בפה ובסי במול. אמרו בקול את צלילי הבס בזמן שאתם מנגנים.' },
      },
      {
        say: { en: 'To keep: I–vi–ii–V is the model. Swap I for iii, minors for dominants, dominants for tritone subs — and the bass tells you which.', he: 'לזכור: I–vi–ii–V הוא הדגם. מחליפים I ב־iii, מינורים בדומיננטים, דומיננטים בתחליפי טריטון — והבס מגלה לכם איזה.' },
      },
    ],
  },

  // ------------------------------------------------------------------ Guide-tone lines
  {
    id: 'guide-tones',
    area: 'jazz',
    emoji: '🧭',
    title: { en: 'Guide-tone lines', he: 'קווי צלילים מנחים' },
    takeaway: { en: 'The 3rd and 7th move by step through ii–V–I: 7 falls to 3, 3 holds as 7 — two lines, 7–3–7 and 3–7–3.', he: 'הטרצה והספטימה זזות בצעדים לאורך ii–V–I: 7 יורדת ל־3, 3 נשארת ונהיית 7 — שני קווים, 7–3–7 ו־3–7–3.' },
    steps: [
      {
        say: { en: 'The 3rd and 7th of a chord are its guide tones. They decide its quality — major or minor, dominant or major 7. In Dm7 they are F and C.', he: 'הטרצה והספטימה של אקורד הן הצלילים המנחים שלו (Guide tones). הן קובעות את האיכות שלו — מז׳ור או מינור, דומיננט או מז׳ור 7. ב־Dm7 אלה פה ודו.' },
        play: [tone(50, 0.6), chord([50, 65, 72], 1.4)],
        show: { notes: [65, 72], chord: true, key: 'C', text: { en: 'Dm7: 3 = F · 7 = C', he: 'Dm7: 3 = פה · 7 = דו' } },
      },
      {
        say: { en: 'Through ii–V–I they move by step. The 7th falls a half step to the next chord’s 3rd; the 3rd stays put and becomes the next 7th.', he: 'לאורך ii–V–I הם זזים בצעדים. הספטימה יורדת חצי טון אל הטרצה של האקורד הבא; הטרצה נשארת במקום והופכת לספטימה הבאה.' },
        play: gt(GT_A),
        show: { text: { en: '7 → 3 · 3 → 7', he: '7 → 3 · 3 → 7' } },
      },
      {
        say: { en: 'That gives two lines. From the 7th: C, B, B — 7, 3, 7. From the 3rd: F, F, E — 3, 7, 3. First one line on top, then the other.', he: 'כך נוצרים שני קווים. מהספטימה: דו, סי, סי — 7, 3, 7. מהטרצה: פה, פה, מי — 3, 7, 3. קודם קו אחד למעלה, ואחר כך השני.' },
        play: [...gt(GT_A, 0.8), rest(0.4), ...gt(GT_B, 0.8)],
        show: { text: { en: '7–3–7 · 3–7–3', he: '7–3–7 · 3–7–3' } },
      },
      {
        say: { en: 'In a minor ii–V–i — Dm7♭5, G7, Cm7 — the lines end a half step lower: C, B, B♭ and F, F, E♭.', he: 'ב־ii–V–i מינורי — Dm7♭5, G7, Cm7 — הקווים מסתיימים חצי טון נמוך יותר: דו, סי, סי במול ופה, פה, מי במול.' },
        play: gt(GT_A_MIN),
        show: { text: { en: 'C B B♭ · F F E♭', he: 'C B B♭ · F F E♭' } },
      },
      {
        say: { en: 'Improvisers aim for these notes as each chord arrives; pianists use them to connect chords smoothly. This line lands on C, then B, then E.', he: 'מאלתרים מכוונים אל הצלילים האלה ברגע שכל אקורד מגיע; פסנתרנים משתמשים בהם כדי לחבר אקורדים בצורה חלקה. הקו הזה נוחת על דו, אחר כך סי, ואז מי.' },
        play: [GT_SOLO],
        show: { notes: [72, 69, 67, 65, 71, 69, 67, 65, 64], key: 'C', text: { en: 'Dm7 · G7 · Cmaj7', he: 'Dm7 · G7 · Cmaj7' } },
      },
      {
        say: { en: 'Your turn. You hear a ii–V–I in shells — which line is on top? Follow the highest note: does it fall first and then hold, or hold first and then fall?', he: 'תורכם. תשמעו ii–V–I ב־Shell — איזה קו למעלה? עקבו אחרי הצליל הגבוה: הוא קודם יורד ואחר כך נשאר, או קודם נשאר ואחר כך יורד?' },
        show: { text: { en: '7–3–7 or 3–7–3?', he: '7–3–7 או 3–7–3?' } },
      },
    ],
    more: [
      {
        say: { en: 'Why the 3rd and 7th: the bass usually plays the root, and the 5th adds little color. The 3rd says major or minor; the 7th says major 7 or dominant. Cmaj7 and C7 differ by one guide tone.', he: 'למה דווקא הטרצה והספטימה: הבס בדרך כלל מנגן את השורש, והקווינטה מוסיפה מעט צבע. הטרצה אומרת מז׳ור או מינור; הספטימה אומרת מז׳ור 7 או דומיננט. בין Cmaj7 ל־C7 יש הבדל של צליל מנחה אחד.' },
        play: [chord([48, 64, 71], 1.2), rest(0.3), chord([48, 64, 70], 1.4)],
        show: { text: { en: 'C E B · C E B♭', he: 'C E B · C E B♭' } },
      },
      {
        say: { en: 'Why they move by step: in ii–V–I the roots rise by fourths. The 7th of Dm7, C, falls to B, the 3rd of G7. The 3rd of Dm7, F, is already the 7th of G7. Then F falls to E while B stays.', he: 'למה הם זזים בצעדים: ב־ii–V–I השורשים עולים בקוורטות. הספטימה של Dm7, דו, יורדת לסי, הטרצה של G7. הטרצה של Dm7, פה, היא כבר הספטימה של G7. אחר כך פה יורד למי, וסי נשאר.' },
        show: { text: { en: 'C→B · F=F · F→E · B=B', he: 'C→B · F=F · F→E · B=B' } },
      },
      {
        say: { en: 'Inside G7, B and F form the tritone that drives the dominant. In classical harmony B rises to C; in jazz it often stays as the major 7th of Cmaj7, while F still falls to E.', he: 'בתוך G7, סי ופה יוצרים את הטריטון שמניע את הדומיננט. בהרמוניה הקלאסית סי עולה לדו; בג׳אז הוא נשאר לא פעם כספטימה הגדולה של Cmaj7, ופה עדיין יורד למי.' },
        play: [chord([43, 59, 65], 1.1), chord([48, 60, 64], 1.2), rest(0.4), chord([43, 59, 65], 1.1), chord([48, 59, 64], 1.4)],
        show: { text: { en: 'B → C · B = B', he: 'B → C · B = B' } },
      },
      {
        say: { en: 'In minor, Dm7♭5 has the same 3rd and 7th as Dm7 — F and C; only its 5th, A♭, differs. The tonic Cm7 brings E♭ and B♭, so both lines end a half step lower than in major.', he: 'במינור, ל־Dm7♭5 יש אותה טרצה וספטימה כמו ל־Dm7 — פה ודו; רק הקווינטה שלו, לה במול, שונה. הטוניקה Cm7 מביאה מי במול וסי במול, ולכן שני הקווים מסתיימים חצי טון נמוך יותר מאשר במז׳ור.' },
        play: [...gt(GT_B, 0.8), rest(0.4), ...gt(GT_B_MIN, 0.8)],
        show: { text: { en: 'F F E · F F E♭', he: 'F F E · F F E♭' } },
      },
      {
        say: { en: 'The rule holds through longer chains. Over A7, D7, G7, Cmaj7 the top line falls G, F♯, F, E — a half step per chord — while the lower line goes C♯, C, B, B.', he: 'הכלל ממשיך גם בשרשראות ארוכות. מעל A7, D7, G7, Cmaj7 הקו העליון יורד סול, פה דיאז, פה, מי — חצי טון לכל אקורד — והקו התחתון הולך דו דיאז, דו, סי, סי.' },
        play: [chord([45, 61, 67], 0.9), chord([50, 60, 66], 0.9), chord([43, 59, 65], 0.9), chord([48, 59, 64], 1.4)],
        show: { notes: [67, 66, 65, 64], key: 'C', text: { en: 'G F♯ F E', he: 'G F♯ F E' } },
      },
      {
        say: { en: 'To improvise with them, put a guide tone on the first beat of each chord and fill in around it with scale notes. Here: C over Dm7, B over G7, and F resolving to E on Cmaj7.', he: 'כדי לאלתר בעזרתם, שימו צליל מנחה על הפעמה הראשונה של כל אקורד ומלאו סביבו בצלילי סולם. כאן: דו מעל Dm7, סי מעל G7, ופה שנפתר למי על Cmaj7.' },
        play: [GT_SOLO],
        show: { text: { en: 'C · B · F → E', he: 'C · B · F → E' } },
      },
      {
        say: { en: 'The common mistake is keeping the old note when the chord changes. Hold C into G7 and it clashes as a suspended 4th; move it to B and the chord comes into focus.', he: 'הטעות הנפוצה היא להשאיר את הצליל הישן כשהאקורד מתחלף. מחזיקים דו לתוך G7 והוא נשמע כקוורטה תלויה (sus4); מזיזים אותו לסי והאקורד מתבהר.' },
        play: [chord(GT_A[0], 0.9), chord([43, 65, 72], 1.3), rest(0.3), chord(GT_A[0], 0.9), chord(GT_A[1], 1.3)],
        show: { text: { en: 'C on G7 ✗ · B on G7 ✓', he: 'דו על G7 ✗ · סי על G7 ✓' } },
      },
      {
        say: { en: 'Practice: play the root in the left hand and the two guide tones in the right through a ii–V–I in every key. Then sing one line while you play the other.', he: 'תרגול: נגנו את השורש ביד שמאל ואת שני הצלילים המנחים ביד ימין לאורך ii–V–I בכל הסולמות. אחר כך שירו קו אחד בזמן שאתם מנגנים את השני.' },
      },
      {
        say: { en: 'To keep: 3rds and 7ths are the chord’s identity. Through ii–V–I, 7 falls to 3 and 3 holds as 7 — the lines 7–3–7 and 3–7–3.', he: 'לזכור: הטרצות והספטימות הן הזהות של האקורד. לאורך ii–V–I, 7 יורדת ל־3 ו־3 נשארת כ־7 — הקווים 7–3–7 ו־3–7–3.' },
      },
    ],
  },
];

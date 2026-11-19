// Mini-lessons — see ../miniTypes.ts for the format and ./example.ts for the voice.
// Curriculum audit 2026-11-19 (owner OK the same day): the shared theory every course leans on, and the jazz topics that
// had no teaching page. Short on purpose (few words per screen, one idea per screen, a sound on every concept screen),
// like `chord-intro`. Six open a path lesson of their own (src/engine/theoryLessons.ts: four practice items each); the
// other six open a topic's first level. Barry Harris content follows docs/BARRY-HARRIS-THEORY.md §1, §5 and §6 only.
// Terms are the glossary's (שורש, ספטאקורד, מוקטן, טון שלם, חצי טון, סולם מקביל, שלד, צפוף, דף אקורדים).

import type { MiniLesson } from '../miniTypes';
import type { Stimulus } from '../../engine/lesson';
import type { JazzChord, SeventhQuality } from '../../engine/jazz';
import type { PitchClass } from '../../engine/pitch';

const K = (letter: PitchClass['letter'], acc: PitchClass['acc'] = 0): PitchClass => ({ letter, acc });
const C = K('C');
const G = K('G');
const F = K('F');
const chord = (midis: number[], duration = 1.3, arpeggio = false): Stimulus => (arpeggio ? { kind: 'chord', midis, duration, arpeggio } : { kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.32): Stimulus => ({ kind: 'notes', midis, each });
const note = (midi: number, duration = 1.2): Stimulus => ({ kind: 'note', midi, duration });
const rest = (duration = 0.4): Stimulus => ({ kind: 'rest', duration });
const phrase = (key: PitchClass, chords: ('I' | 'ii' | 'iii' | 'IV' | 'V' | 'V7' | 'vi')[]): Stimulus => ({ kind: 'phrase', key, chords });
/** Jazz seventh chords in a key: [root above the tonic in semitones, quality]. */
const jazz = (key: PitchClass, chs: [number, SeventhQuality][], each = 1.0): Stimulus => ({ kind: 'jazz', key, chords: chs.map(([root, q]): JazzChord => ({ root, q })), each });
/** Swung eighths (2 : 1), the last note held a beat. */
const swung = (midis: number[], bpm = 120): Stimulus => ({ kind: 'melody', midis, beats: midis.map((_, i) => (i === midis.length - 1 ? 1 : i % 2 === 0 ? 2 / 3 : 1 / 3)), bpm });
const straight = (midis: number[], bpm = 120): Stimulus => ({ kind: 'melody', midis, beats: midis.map((_, i) => (i === midis.length - 1 ? 1 : 0.5)), bpm });
/** A low tonic held under a scale (the drone the mode is heard against). */
const overDrone = (tonic: number, scale: number[], each = 0.34): Stimulus => ({
  kind: 'events',
  events: [{ midi: tonic - 24, start: 0, duration: scale.length * each + 0.4, velocity: 0.5 }, ...scale.map((m, i) => ({ midi: m, start: i * each, duration: each * 0.95, velocity: 0.7 }))],
  length: scale.length * each + 0.6,
});

// Scales from C4 (60) up to the octave.
const up = (steps: number[], t = 60) => steps.map((x) => t + x);
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10, 12];
const HARM_MINOR = [0, 2, 3, 5, 7, 8, 11, 12];
const DORIAN = [0, 2, 3, 5, 7, 9, 10, 12];
const MIXO = [0, 2, 4, 5, 7, 9, 10, 12];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11, 12];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10, 12];

// Seventh chords on C (close, root position).
const CMAJ7 = [60, 64, 67, 71];
const C7 = [60, 64, 67, 70];
const CM7 = [60, 63, 67, 70];
const CHALF = [60, 63, 66, 70];
const CDIM7 = [60, 63, 66, 69];
// Barry Harris (BARRY-HARRIS-THEORY §1, §5): C6 and B°7 (the D° class), the C 6th-diminished scale and its chords.
const C6 = [60, 64, 67, 69];
const B_DIM = [59, 62, 65, 68];
const SIXDIM = [60, 62, 64, 65, 67, 68, 69, 71, 72];
const SIXDIM_CHORDS = [[60, 64, 67, 69], [62, 65, 68, 71], [64, 67, 69, 72], [65, 68, 71, 74], [67, 69, 72, 76]];

export const LESSONS: MiniLesson[] = [
  // ------------------------------------------------------------------ Seventh chords (INSTRUMENTS L1, EAR-JAZZ F40)
  {
    id: 'sevenths',
    area: 'harmony',
    emoji: 'chords',
    title: { en: 'Seventh chords', he: 'ספטאקורדים' },
    takeaway: { en: 'A triad plus a seventh above the root: maj7 (major triad, major 7th), 7 (major triad, minor 7th), m7, ø7 and °7.', he: 'משולש ועוד ספטימה מעל השורש: maj7 (משולש מז׳ור, ספטימה גדולה), 7 (משולש מז׳ור, ספטימה קטנה), m7, ‏ø7 ו־°7.' },
    steps: [
      {
        say: { en: 'Stack one more third on a triad and you get a seventh chord: four notes.', he: 'מוסיפים עוד טרצה מעל משולש ומקבלים ספטאקורד: ארבעה צלילים.' },
        play: [chord([60, 64, 67], 1.1), rest(0.3), chord(CMAJ7, 1.2, true), chord(CMAJ7, 1.4)],
        show: { notes: CMAJ7, chord: true, key: 'C', text: { en: '1 · 3 · 5 · 7', he: '1 · 3 · 5 · 7' } },
      },
      {
        say: { en: 'Major triad, major seventh: maj7. Soft and dreamy.', he: 'משולש מז׳ור, ספטימה גדולה: maj7. רך וחלומי.' },
        play: [chord(CMAJ7, 1.2, true), chord([48, ...CMAJ7], 1.5)],
        show: { notes: CMAJ7, chord: true, key: 'C', text: { en: 'Cmaj7 = C E G B', he: 'Cmaj7 = דו מי סול סי' } },
      },
      {
        say: { en: 'Major triad, minor seventh: plain 7, the dominant. It wants to move.', he: 'משולש מז׳ור, ספטימה קטנה: 7 בלבד, הדומיננט. הוא רוצה לזוז.' },
        play: [chord([48, 64, 67, 70], 1.3), chord([53, 65, 69, 72], 1.5)],
        show: { notes: C7, chord: true, key: 'C', text: { en: 'C7 = C E G B♭ → F', he: 'C7 = דו מי סול סי♭ → F' } },
      },
      {
        say: { en: 'Minor triad, minor seventh: m7. Mellow and relaxed.', he: 'משולש מינור, ספטימה קטנה: m7. רך ורגוע.' },
        play: [chord(CM7, 1.2, true), chord([48, ...CM7], 1.5)],
        show: { notes: CM7, chord: true, key: 'C', text: { en: 'Cm7 = C E♭ G B♭', he: 'Cm7 = דו מי♭ סול סי♭' } },
      },
      {
        say: { en: 'Diminished triad: with a minor seventh it is ø7, with a diminished seventh °7.', he: 'משולש מוקטן: עם ספטימה קטנה זה ø7, עם ספטימה מוקטנת זה °7.' },
        play: [chord(CHALF, 1.3), rest(0.3), chord(CDIM7, 1.5)],
        show: { notes: [60, 63, 66, 69, 70], text: { en: 'Cø7 · C°7', he: 'Cø7 · C°7' } },
      },
    ],
    more: [
      {
        say: { en: 'The name comes from two choices: the triad, and the seventh above the root. A major seventh is eleven half steps, a minor seventh ten, a diminished seventh nine.', he: 'השם נקבע משתי בחירות: המשולש, והספטימה מעל השורש. ספטימה גדולה היא אחד־עשר חצאי טונים, קטנה עשרה, מוקטנת תשעה.' },
        play: [notes([60, 71], 0.7), rest(0.2), notes([60, 70], 0.7), rest(0.2), notes([60, 69], 0.7)],
        show: { notes: [60, 69, 70, 71], text: { en: '11 · 10 · 9', he: '11 · 10 · 9' } },
      },
      {
        say: { en: 'Stack thirds on every step of C major and you get Cmaj7, Dm7, Em7, Fmaj7, G7, Am7 and Bø7. Only the fifth step, G7, is a dominant seventh.', he: 'בונים טרצות על כל דרגה בדו מז׳ור ומקבלים Cmaj7, ‏Dm7, ‏Em7, ‏Fmaj7, ‏G7, ‏Am7 ו־Bø7. רק בדרגה החמישית, G7, יש ספטאקורד דומיננטי.' },
        play: [chord(CMAJ7, 0.7), chord([62, 65, 69, 72], 0.7), chord([64, 67, 71, 74], 0.7), chord([65, 69, 72, 76], 0.7), chord([55, 59, 62, 65], 0.7), chord([57, 60, 64, 67], 0.7), chord([59, 62, 65, 69], 0.9)],
        show: { text: { en: 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7', he: 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7' } },
      },
      {
        say: { en: 'Why the dominant pulls: in G7, the third B and the seventh F are a tritone apart. B rises to C, F falls to E.', he: 'למה הדומיננט מושך: ב־G7, הטרצה סי והספטימה פה רחוקות טריטון זו מזו. סי עולה לדו, פה יורד למי.' },
        play: [chord([43, 59, 62, 65], 1.3), chord([48, 60, 64, 67], 1.6)],
        show: { notes: [59, 65, 60, 64], text: { en: 'B → C · F → E', he: 'סי → דו · פה → מי' } },
      },
      {
        say: { en: 'The diminished seventh lives in harmonic minor, on the raised seventh step. In C minor it is B, D, F, A-flat, and it leads home to C minor.', he: 'הספטאקורד המוקטן גר במינור ההרמוני, על דרגה 7 המוגבהת. בדו מינור הוא סי, רה, פה, לה במול, והוא מוביל הביתה לדו מינור.' },
        play: [chord(B_DIM, 1.3), chord([48, 60, 63, 67], 1.6)],
        show: { notes: B_DIM, chord: true, text: { en: 'B°7 → Cm', he: 'B°7 → Cm' } },
      },
      {
        say: { en: 'On a chart: maj7 or a triangle for the major seventh; a plain 7 always means the dominant; m7; ø7, also written m7 flat 5; °7, also written dim7.', he: 'בדף אקורדים: maj7 או משולש קטן לספטימה גדולה; 7 לבד תמיד אומר דומיננט; m7; ‏ø7, שנכתב גם m7♭5; ‏°7, שנכתב גם dim7.' },
        show: { text: { en: 'maj7 / Δ · 7 · m7 · ø7 / m7♭5 · °7 / dim7', he: 'maj7 / Δ · 7 · m7 · ø7 / m7♭5 · °7 / dim7' } },
      },
      {
        say: { en: 'A common mistake: hearing m7 as a dominant because both have the minor seventh. Listen to the third first: bright means maj7 or 7, dark means m7, ø7 or °7. Then the top.', he: 'טעות נפוצה: לשמוע m7 כדומיננט, כי לשניהם יש ספטימה קטנה. הקשיבו קודם לטרצה: בהיר זה maj7 או 7, כהה זה m7, ‏ø7 או °7. ואז לצליל העליון.' },
        play: [chord(CM7, 1.2), rest(0.3), chord(C7, 1.2)],
        show: { notes: [63, 64], text: { en: 'Cm7 · C7', he: 'Cm7 · C7' } },
      },
      {
        say: { en: 'To keep: a triad plus a seventh. Five colours: maj7, 7, m7, ø7 and °7.', he: 'לזכור: משולש ועוד ספטימה. חמישה צבעים: maj7, ‏7, ‏m7, ‏ø7 ו־°7.' },
        show: { text: { en: 'maj7 · 7 · m7 · ø7 · °7', he: 'maj7 · 7 · m7 · ø7 · °7' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Chords of the key (EAR-JAZZ M1, INSTRUMENTS L2)
  {
    id: 'chord-numbers',
    area: 'harmony',
    emoji: 'chords',
    title: { en: 'Chords of the key', he: 'האקורדים של הסולם' },
    takeaway: { en: 'A chord on every step of the scale, named by its step: I ii iii IV V vi vii°. Capital = major, small = minor. V7 pulls home to I.', he: 'אקורד על כל דרגה בסולם, בשם של הדרגה: I ii iii IV V vi vii°. אות גדולה = מז׳ור, קטנה = מינור. V7 מושך הביתה ל־I.' },
    steps: [
      {
        say: { en: 'Build a chord on every note of the scale, using only the scale’s notes.', he: 'בונים אקורד על כל צליל בסולם, רק מהצלילים של הסולם.' },
        play: [notes(up(MAJOR), 0.28), rest(0.3), chord([60, 64, 67], 0.6), chord([62, 65, 69], 0.6), chord([64, 67, 71], 0.6), chord([65, 69, 72], 0.6), chord([67, 71, 74], 0.6), chord([69, 72, 76], 0.6), chord([71, 74, 77], 0.6), chord([72, 76, 79], 1.0)],
        show: { notes: up(MAJOR), key: 'C', text: { en: 'C D E F G A B', he: 'דו רה מי פה סול לה סי' } },
      },
      {
        say: { en: 'Name each chord by its step, in Roman numerals, from one to seven.', he: 'נותנים לכל אקורד שם לפי הדרגה שלו, בספרות רומיות, מאחת עד שבע.' },
        play: [chord([60, 64, 67], 0.6), chord([62, 65, 69], 0.6), chord([64, 67, 71], 0.6), chord([65, 69, 72], 0.6), chord([67, 71, 74], 0.6), chord([69, 72, 76], 0.6), chord([71, 74, 77], 0.9)],
        show: { key: 'C', text: { en: 'I ii iii IV V vi vii°', he: 'I ii iii IV V vi vii°' } },
      },
      {
        say: { en: 'Capital letters are major chords: I, IV and V. In C: C, F and G.', he: 'אותיות גדולות הן אקורדי מז׳ור: I, ‏IV ו־V. בדו: דו, פה וסול.' },
        play: [phrase(C, ['I', 'IV', 'V', 'I'])],
        show: { text: { en: 'I – IV – V – I = C F G C', he: 'I – IV – V – I = C F G C' } },
      },
      {
        say: { en: 'Small letters are minor: ii, iii and vi. vii° is diminished.', he: 'אותיות קטנות הן מינור: ii, ‏iii ו־vi. ‏vii° הוא מוקטן.' },
        play: [chord([62, 65, 69], 0.8), chord([64, 67, 71], 0.8), chord([69, 72, 76], 0.8), rest(0.3), chord([71, 74, 77], 1.1)],
        show: { text: { en: 'ii = Dm · iii = Em · vi = Am · vii° = B°', he: 'ii = Dm · iii = Em · vi = Am · vii° = B°' } },
      },
      {
        say: { en: 'Add a seventh to V and you get V7. It pulls hardest to I.', he: 'מוסיפים ספטימה ל־V ומקבלים V7. הוא מושך הכי חזק ל־I.' },
        play: [chord([43, 59, 62, 65], 1.3), chord([48, 60, 64, 67], 1.6)],
        show: { notes: [55, 59, 62, 65], chord: true, key: 'C', text: { en: 'V7 → I = G7 → C', he: 'V7 → I = G7 → C' } },
      },
      {
        say: { en: 'Numbers, not names: I, IV, V, I sounds the same in every key.', he: 'מספרים, לא שמות: I, ‏IV, ‏V, ‏I נשמע אותו דבר בכל סולם.' },
        play: [phrase(C, ['I', 'IV', 'V', 'I']), rest(0.4), phrase(G, ['I', 'IV', 'V', 'I'])],
        show: { text: { en: 'C: C F G C · G: G C D G', he: 'דו: C F G C · סול: G C D G' } },
      },
    ],
    more: [
      {
        say: { en: 'Why these colours? Stack thirds from each note with C major’s notes only. C, E, G is major; D, F, A is minor; B, D, F is diminished.', he: 'למה דווקא הצבעים האלה? בונים טרצות מכל צליל רק עם הצלילים של דו מז׳ור. דו, מי, סול הוא מז׳ור; רה, פה, לה מינור; סי, רה, פה מוקטן.' },
        play: [chord([60, 64, 67], 1.0, true), chord([62, 65, 69], 1.0, true), chord([71, 74, 77], 1.0, true)],
        show: { text: { en: 'C E G · D F A · B D F', he: 'דו מי סול · רה פה לה · סי רה פה' } },
      },
      {
        say: { en: 'I, IV and V hold all seven notes of the scale between them. That is why three chords can harmonise so many simple songs.', he: 'ב־I, ‏IV ו־V יחד יש את כל שבעת הצלילים של הסולם. לכן שלושה אקורדים מספיקים להרבה שירים פשוטים.' },
        play: [chord([60, 64, 67], 0.9), chord([65, 69, 72], 0.9), chord([67, 71, 74], 0.9), notes(up(MAJOR), 0.25)],
        show: { text: { en: 'C E G + F A C + G B D', he: 'דו מי סול + פה לה דו + סול סי רה' } },
      },
      {
        say: { en: 'The pop progression I, V, vi, IV — in C: C, G, A minor, F.', he: 'מהלך הפופ I, ‏V, ‏vi, ‏IV — בדו: C, ‏G, ‏Am, ‏F.' },
        play: [phrase(C, ['I', 'V', 'vi', 'IV'])],
        show: { text: { en: 'I – V – vi – IV', he: 'I – V – vi – IV' } },
      },
      {
        say: { en: 'ii often comes before V. ii, V, I in C is D minor, G7, C — the move jazz is built on.', he: 'לפני V בא הרבה פעמים ii. ‏ii, ‏V, ‏I בדו הוא Dm, ‏G7, ‏C — המהלך שעליו בנוי הג׳אז.' },
        play: [phrase(C, ['ii', 'V7', 'I'])],
        show: { text: { en: 'ii – V7 – I', he: 'ii – V7 – I' } },
      },
      {
        say: { en: 'vi is the relative minor of I: A minor shares every note with C major. That is why vi can stand in for I.', he: 'vi הוא המינור המקביל של I: לה מינור חולק את כל הצלילים עם דו מז׳ור. לכן vi יכול להחליף את I.' },
        play: [chord([60, 64, 67], 1.1), chord([57, 60, 64], 1.3)],
        show: { notes: [57, 60, 64, 67], text: { en: 'C = C E G · Am = A C E', he: 'C = דו מי סול · Am = לה דו מי' } },
      },
      {
        say: { en: 'Nashville numbers are the same idea in plain digits: 1, 4, 5, and 6m for the minor six.', he: 'מספרי נאשוויל הם אותו רעיון בספרות רגילות: 1, ‏4, ‏5, ו־6m לשש המינורי.' },
        play: [phrase(F, ['I', 'IV', 'vi', 'V'])],
        show: { text: { en: '1 – 4 – 6m – 5', he: '1 – 4 – 6m – 5' } },
      },
      {
        say: { en: 'To keep: the numeral is the step of the root, the case is the colour, and V7 pulls home to I.', he: 'לזכור: הספרה היא הדרגה של השורש, גודל האות הוא הצבע, ו־V7 מושך הביתה ל־I.' },
        show: { text: { en: 'I ii iii IV V vi vii°', he: 'I ii iii IV V vi vii°' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Major and minor scales (EAR-JAZZ M2, INSTRUMENTS D2)
  {
    id: 'scales-mm',
    area: 'theory',
    emoji: 'scale',
    title: { en: 'Major and minor scales', he: 'סולם מז׳ור וסולם מינור' },
    takeaway: { en: 'Major: whole, whole, half, whole, whole, whole, half. Natural minor lowers 3, 6 and 7. Its relative major shares its notes. Harmonic minor raises the 7th back, so V7 can pull home.', he: 'מז׳ור: טון, טון, חצי, טון, טון, טון, חצי. מינור טבעי מנמיך את 3, ‏6 ו־7. לסולם המקביל במז׳ור יש אותם צלילים. מינור הרמוני מגביה שוב את 7, כדי ש־V7 ימשוך הביתה.' },
    steps: [
      {
        say: { en: 'A major scale climbs in whole and half steps: W W H W W W H.', he: 'סולם מז׳ור עולה בטונים שלמים ובחצאי טונים: ט ט ח ט ט ט ח.' },
        play: [notes(up(MAJOR), 0.4)],
        show: { notes: up(MAJOR), key: 'C', text: { en: 'W W H W W W H', he: 'ט ט ח ט ט ט ח' } },
      },
      {
        say: { en: 'The half steps sit between 3 and 4, and 7 and 8. In C: E–F, B–C.', he: 'חצאי הטונים נמצאים בין 3 ל־4, ובין 7 ל־8. בדו: מי–פה, סי–דו.' },
        play: [notes([64, 65], 0.7), rest(0.3), notes([71, 72], 0.7)],
        show: { notes: [64, 65, 71, 72], key: 'C', text: { en: 'E–F · B–C', he: 'מי–פה · סי–דו' } },
      },
      {
        say: { en: 'Natural minor lowers three steps: 3, 6 and 7. Here is C minor.', he: 'מינור טבעי מנמיך שלוש דרגות: 3, ‏6 ו־7. הנה דו מינור.' },
        play: [notes(up(MAJOR), 0.3), rest(0.4), notes(up(NAT_MINOR), 0.3)],
        show: { notes: up(NAT_MINOR), text: { en: '1 2 ♭3 4 5 ♭6 ♭7', he: '1 2 ♭3 4 5 ♭6 ♭7' } },
      },
      {
        say: { en: 'A minor uses C major’s notes, from A. It is C’s relative minor.', he: 'לה מינור משתמש בצלילים של דו מז׳ור, מלה. הוא הסולם המקביל של דו.' },
        play: [notes(up(MAJOR), 0.28), rest(0.4), notes(up(NAT_MINOR, 57), 0.3)],
        show: { notes: up(NAT_MINOR, 57), key: 'C', text: { en: 'A B C D E F G', he: 'לה סי דו רה מי פה סול' } },
      },
      {
        say: { en: 'Harmonic minor raises the seventh again. Now V is major, and V7 pulls home.', he: 'מינור הרמוני מגביה שוב את דרגה 7. עכשיו V מז׳ורי, ו־V7 מושך הביתה.' },
        play: [notes(up(HARM_MINOR, 57), 0.3), rest(0.3), chord([52, 62, 64, 68], 1.2), chord([45, 60, 64, 69], 1.5)],
        show: { notes: up(HARM_MINOR, 57), text: { en: 'G → G♯ · E7 → Am', he: 'סול → סול♯ · E7 → Am' } },
      },
    ],
    more: [
      {
        say: { en: 'A whole step is two half steps: C to D skips the black key between them. A half step is the very next key: E to F, with no key between.', he: 'טון שלם הוא שני חצאי טונים: מדו לרה מדלגים על הקליד השחור שביניהם. חצי טון הוא הקליד הבא ממש: מי לפה, בלי קליד ביניהם.' },
        play: [notes([60, 61, 62], 0.5), rest(0.3), notes([64, 65], 0.6)],
        show: { notes: [60, 62, 64, 65], text: { en: 'W = 2 · H = 1', he: 'ט = 2 · ח = 1' } },
      },
      {
        say: { en: 'Every major key has a relative minor on its sixth step, three half steps below: G major and E minor share one sharp, F major and D minor one flat.', he: 'לכל סולם מז׳ור יש סולם מקביל במינור על הדרגה השישית שלו, שלושה חצאי טונים מתחת: סול מז׳ור ומי מינור חולקים דיאז אחד, פה מז׳ור ורה מינור במול אחד.' },
        play: [notes(up(MAJOR, 55), 0.25), rest(0.3), notes(up(NAT_MINOR, 52), 0.25)],
        show: { key: 'G', text: { en: 'G major = E minor (F♯)', he: 'סול מז׳ור = מי מינור (פה♯)' } },
      },
      {
        say: { en: 'The parallel minor is something else: the same tonic with other notes. C major and C minor share C, but three steps differ.', he: 'המינור על אותה טוניקה הוא דבר אחר: אותו בית עם צלילים אחרים. דו מז׳ור ודו מינור חולקים את דו, אבל שלוש דרגות שונות.' },
        play: [chord([48, 60, 64, 67], 1.1), rest(0.2), chord([48, 60, 63, 67], 1.3)],
        show: { notes: [63, 64], text: { en: 'C · Cm', he: 'C · Cm' } },
      },
      {
        say: { en: 'Why harmonic minor? In natural minor, chord v is minor and the seventh step is a whole step below home. Raise it and the leading tone pulls up to the tonic, and V becomes major.', he: 'למה מינור הרמוני? במינור טבעי אקורד v מינורי, ודרגה 7 נמצאת טון שלם מתחת לבית. מגביהים אותה, והצליל המוביל נמשך למעלה אל הטוניקה, ו־V נהיה מז׳ורי.' },
        play: [chord([52, 59, 64, 67], 1.1), chord([45, 57, 60, 64], 1.2), rest(0.3), chord([52, 59, 64, 68], 1.1), chord([45, 57, 60, 64], 1.3)],
        show: { notes: [67, 68], text: { en: 'Em → Am · E → Am', he: 'Em → Am · E → Am' } },
      },
      {
        say: { en: 'The raised seventh leaves a gap of three half steps between the sixth and seventh steps: F to G-sharp in A minor. That gap gives harmonic minor its special sound.', he: 'דרגה 7 המוגבהת משאירה רווח של שלושה חצאי טונים בין דרגה 6 לדרגה 7: פה לסול דיאז בלה מינור. הרווח הזה נותן למינור ההרמוני את הצליל המיוחד שלו.' },
        play: [notes([65, 68, 69], 0.6)],
        show: { notes: [65, 68, 69], text: { en: 'F → G♯ = 3', he: 'פה → סול♯ = 3' } },
      },
      {
        say: { en: 'A common mistake: thinking minor only changes the third. In natural minor the sixth and seventh are lower too. Sing up from the tonic and listen at the top.', he: 'טעות נפוצה: לחשוב שמינור משנה רק את הטרצה. במינור טבעי גם השישית והשביעית נמוכות יותר. שירו מהטוניקה למעלה והקשיבו בחלק העליון.' },
        play: [notes([67, 69, 71, 72], 0.4), rest(0.3), notes([67, 68, 70, 72], 0.4)],
        show: { notes: [67, 68, 69, 70, 71, 72], text: { en: '5 6 7 8 · 5 ♭6 ♭7 8', he: '5 6 7 8 · 5 ♭6 ♭7 8' } },
      },
      {
        say: { en: 'To keep: major is W W H W W W H. Natural minor lowers 3, 6 and 7. Harmonic minor raises 7 again.', he: 'לזכור: מז׳ור הוא ט ט ח ט ט ט ח. מינור טבעי מנמיך את 3, ‏6 ו־7. מינור הרמוני מגביה שוב את 7.' },
        show: { text: { en: 'major · natural minor · harmonic minor', he: 'מז׳ור · מינור טבעי · מינור הרמוני' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Modes as colours (INSTRUMENTS L4, EAR-JAZZ F6)
  {
    id: 'mode-colours',
    area: 'theory',
    emoji: 'scale',
    title: { en: 'Modes: colours of one scale', he: 'מודוסים: צבעים של סולם אחד' },
    takeaway: { en: 'A mode is the major scale from another step. On one tonic, each is major or minor with one note changed: Lydian ♯4, Mixolydian ♭7, Dorian 6, Phrygian ♭2.', he: 'מודוס הוא סולם המז׳ור מדרגה אחרת. על אותה טוניקה, כל אחד הוא מז׳ור או מינור עם צליל אחד שונה: לידי ♯4, מיקסולידי ♭7, דורי 6, פריגי ♭2.' },
    steps: [
      {
        say: { en: 'Play C major’s notes, but start and end on D. Same notes, a new home.', he: 'מנגנים את הצלילים של דו מז׳ור, אבל מתחילים ומסיימים ברה. אותם צלילים, בית חדש.' },
        play: [overDrone(62, up(DORIAN, 62))],
        show: { notes: up(DORIAN, 62), key: 'C', text: { en: 'D E F G A B C D', he: 'רה מי פה סול לה סי דו רה' } },
      },
      {
        say: { en: 'Compare on one tonic: each mode is major or minor with one note changed.', he: 'משווים על אותה טוניקה: כל מודוס הוא מז׳ור או מינור עם צליל אחד שונה.' },
        play: [overDrone(60, up(MAJOR)), rest(0.3), overDrone(60, up(MIXO))],
        show: { notes: [70, 71], text: { en: 'C major · C Mixolydian', he: 'דו מז׳ור · דו מיקסולידי' } },
      },
      {
        say: { en: 'Mixolydian is major with a lowered seventh. Bluesy, rock.', he: 'מיקסולידי הוא מז׳ור עם ספטימה מונמכת. בלוזי, רוק.' },
        play: [overDrone(60, up(MIXO))],
        show: { notes: up(MIXO), text: { en: 'Mixolydian = major ♭7', he: 'מיקסולידי = מז׳ור ♭7' } },
      },
      {
        say: { en: 'Lydian is major with a raised fourth. Bright, floating.', he: 'לידי הוא מז׳ור עם רביעית מוגבהת. בהיר, מרחף.' },
        play: [overDrone(60, up(LYDIAN))],
        show: { notes: up(LYDIAN), text: { en: 'Lydian = major ♯4', he: 'לידי = מז׳ור ♯4' } },
      },
      {
        say: { en: 'Dorian is natural minor with a major sixth. Minor, but warm.', he: 'דורי הוא מינור טבעי עם סקסטה גדולה. מינור, אבל חם.' },
        play: [overDrone(60, up(NAT_MINOR)), rest(0.3), overDrone(60, up(DORIAN))],
        show: { notes: [68, 69], text: { en: 'Dorian = minor 6', he: 'דורי = מינור 6' } },
      },
      {
        say: { en: 'Phrygian is natural minor with a lowered second. Dark, with a Spanish edge.', he: 'פריגי הוא מינור טבעי עם שנייה מונמכת. כהה, עם נגיעה ספרדית.' },
        play: [overDrone(60, up(PHRYGIAN))],
        show: { notes: up(PHRYGIAN), text: { en: 'Phrygian = minor ♭2', he: 'פריגי = מינור ♭2' } },
      },
    ],
    more: [
      {
        say: { en: 'Each mode starts on a different step of the major scale: Ionian on 1, Dorian on 2, Phrygian on 3, Lydian on 4, Mixolydian on 5, Aeolian on 6, Locrian on 7.', he: 'כל מודוס מתחיל על דרגה אחרת של סולם המז׳ור: יוני על 1, דורי על 2, פריגי על 3, לידי על 4, מיקסולידי על 5, איאולי על 6, לוקרי על 7.' },
        play: [notes(up(DORIAN, 62), 0.22), rest(0.3), notes(up(MIXO, 67), 0.22)],
        show: { key: 'C', text: { en: '1 Ionian · 2 Dorian · 3 Phrygian · 4 Lydian · 5 Mixolydian · 6 Aeolian · 7 Locrian', he: '1 יוני · 2 דורי · 3 פריגי · 4 לידי · 5 מיקסולידי · 6 איאולי · 7 לוקרי' } },
      },
      {
        say: { en: 'Ionian is plain major and Aeolian is natural minor. Locrian, with a lowered second and fifth, is rarely used as a home.', he: 'יוני הוא מז׳ור רגיל ואיאולי הוא מינור טבעי. לוקרי, עם שנייה וקווינטה מונמכות, משמש רק לעיתים רחוקות כבית.' },
        play: [overDrone(60, up([0, 1, 3, 5, 6, 8, 10, 12]))],
        show: { text: { en: 'Locrian = minor ♭2 ♭5', he: 'לוקרי = מינור ♭2 ♭5' } },
      },
      {
        say: { en: 'From brightest to darkest: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian. Each one lowers one more note than the one before.', he: 'מהבהיר ביותר לכהה ביותר: לידי, יוני, מיקסולידי, דורי, איאולי, פריגי, לוקרי. כל אחד מנמיך צליל אחד יותר מהקודם.' },
        show: { text: { en: '♯4 → 4 → ♭7 → ♭3 → ♭6 → ♭2 → ♭5', he: '♯4 → 4 → ♭7 → ♭3 → ♭6 → ♭2 → ♭5' } },
      },
      {
        say: { en: 'To find a mode’s notes, find its parent major scale. D Dorian comes from C major, because D is C’s second step. G Mixolydian comes from C too: G is its fifth step.', he: 'כדי למצוא את הצלילים של מודוס, מוצאים את סולם המז׳ור שלו. רה דורי בא מדו מז׳ור, כי רה היא הדרגה השנייה של דו. גם סול מיקסולידי בא מדו: סול היא הדרגה החמישית שלו.' },
        play: [overDrone(67, up(MIXO, 55))],
        show: { notes: up(MIXO, 55), key: 'C', text: { en: 'G A B C D E F G', he: 'סול לה סי דו רה מי פה סול' } },
      },
      {
        say: { en: 'A listening tip: keep the tonic sounding, play the scale, and wait for the one note that differs from plain major or minor. That note is the colour.', he: 'טיפ להאזנה: השאירו את הטוניקה מצלצלת, נגנו את הסולם, וחכו לצליל האחד ששונה ממז׳ור או ממינור רגיל. הצליל הזה הוא הצבע.' },
        play: [overDrone(60, [60, 62, 64, 66, 67, 66, 64, 60], 0.4)],
        show: { notes: [66], text: { en: 'F♯ = Lydian', he: 'פה♯ = לידי' } },
      },
      {
        say: { en: 'In music: modal jazz often sits on Dorian, and many rock and folk tunes lean on Mixolydian’s flat seventh.', he: 'במוזיקה: ג׳אז מודאלי יושב הרבה פעמים על דורי, והרבה שירי רוק ופולק נשענים על הספטימה המונמכת של המיקסולידי.' },
        play: [overDrone(62, [62, 65, 67, 69, 71, 69, 67, 65, 62], 0.34)],
        show: { notes: [71], text: { en: 'D Dorian: B = 6', he: 'רה דורי: סי = 6' } },
      },
      {
        say: { en: 'To keep: same notes, another home. Lydian sharp four, Mixolydian flat seven, Dorian natural six, Phrygian flat two.', he: 'לזכור: אותם צלילים, בית אחר. לידי ♯4, מיקסולידי ♭7, דורי 6, פריגי ♭2.' },
        show: { text: { en: '♯4 · ♭7 · 6 · ♭2', he: '♯4 · ♭7 · 6 · ♭2' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Beyond the octave (EAR-JAZZ M3)
  {
    id: 'beyond-octave',
    area: 'ear',
    emoji: 'intervals',
    title: { en: 'Beyond the octave', he: 'מעבר לאוקטבה' },
    takeaway: { en: 'Past the octave the numbers go on: a 9th is a 2nd plus an octave, a 10th a 3rd, an 11th a 4th, a 12th a 5th, a 13th a 6th. Take away seven to find the simple interval.', he: 'אחרי האוקטבה המספרים ממשיכים: נונה היא סקונדה ועוד אוקטבה, דצימה היא טרצה, 11 היא קוורטה, 12 היא קווינטה, 13 היא סקסטה. מחסירים שבע ומקבלים את המרווח הפשוט.' },
    steps: [
      {
        say: { en: 'Past the octave, the numbers keep counting: eight, then nine, then ten.', he: 'אחרי האוקטבה, המספרים ממשיכים: שמונה, ואז תשע, ואז עשר.' },
        play: [notes([60, 72, 74, 76], 0.7)],
        show: { notes: [60, 72, 74, 76], key: 'C', text: { en: '8 · 9 · 10', he: '8 · 9 · 10' } },
      },
      {
        say: { en: 'A ninth is a second plus an octave: C to the D above the next C.', he: 'נונה היא סקונדה ועוד אוקטבה. מדו עד הרה שמעל הדו הבא.' },
        play: [notes([60, 62], 0.8), rest(0.3), notes([60, 74], 0.8)],
        show: { notes: [60, 62, 74], key: 'C', text: { en: '2 + 8 = 9', he: '2 + 8 = 9' } },
      },
      {
        say: { en: 'A tenth is a third plus an octave. Wide, but it still sounds sweet.', he: 'דצימה היא טרצה ועוד אוקטבה. רחבה, אבל עדיין נשמעת מתוקה.' },
        play: [notes([60, 64], 0.8), rest(0.3), chord([48, 64], 1.4)],
        show: { notes: [48, 64], key: 'C', text: { en: '3 + 8 = 10', he: '3 + 8 = 10' } },
      },
      {
        say: { en: 'Take away seven for the simple interval: 9 is 2, 11 is 4, 13 is 6.', he: 'מחסירים שבע ומוצאים את המרווח הפשוט: 9 הוא 2, ‏11 הוא 4, ‏13 הוא 6.' },
        play: [chord([48, 62], 1.0), chord([48, 65], 1.0), chord([48, 69], 1.2)],
        show: { notes: [48, 62, 65, 69], text: { en: '9 → 2 · 11 → 4 · 13 → 6', he: '9 → 2 · 11 → 4 · 13 → 6' } },
      },
      {
        say: { en: 'Chords use them on top: a ninth above a seventh chord adds colour.', he: 'אקורדים משתמשים בהם למעלה: נונה מעל ספטאקורד מוסיפה צבע.' },
        play: [chord([48, 64, 67, 70], 1.2), rest(0.2), chord([48, 64, 67, 70, 74], 1.6)],
        show: { notes: [48, 64, 67, 70, 74], text: { en: 'C7 → C9', he: 'C7 → C9' } },
      },
    ],
    more: [
      {
        say: { en: 'Chords are stacked in thirds: 1, 3, 5, 7. Keep stacking and the next thirds are 9, 11 and 13. After 13 comes the root again, two octaves up.', he: 'אקורדים נבנים בטרצות: 1, ‏3, ‏5, ‏7. ממשיכים לבנות, והטרצות הבאות הן 9, ‏11 ו־13. אחרי 13 בא שוב השורש, שתי אוקטבות למעלה.' },
        play: [notes([48, 52, 55, 58, 62, 65, 69], 0.45)],
        show: { notes: [48, 52, 55, 58, 62, 65, 69], text: { en: '1 3 5 7 9 11 13', he: '1 3 5 7 9 11 13' } },
      },
      {
        say: { en: 'Why call it a ninth and not a second? Above the seventh it sits on top of the chord as a colour, not crowded against the root.', he: 'למה קוראים לזה נונה ולא סקונדה? מעל הספטימה הצליל יושב בראש האקורד כצבע, ולא צפוף ליד השורש.' },
        play: [chord([60, 62, 64, 67], 1.2), rest(0.3), chord([48, 64, 67, 70, 74], 1.4)],
        show: { text: { en: 'C D E G · C E G B♭ D', he: 'דו רה מי סול · דו מי סול סי♭ רה' } },
      },
      {
        say: { en: 'The quality stays: a major second becomes a major ninth, a minor third a minor tenth, a perfect fifth a perfect twelfth.', he: 'האיכות נשארת: סקונדה גדולה נהיית נונה גדולה, טרצה קטנה דצימה קטנה, קווינטה זכה דואודצימה זכה.' },
        play: [notes([48, 62], 0.7), notes([48, 63], 0.7), notes([48, 67], 0.7)],
        show: { notes: [48, 62, 63, 67], text: { en: 'M9 · m10 · P12', he: 'M9 · m10 · P12' } },
      },
      {
        say: { en: 'A listening tip: sing the top note an octave lower, name the simple interval, then add seven.', he: 'טיפ להאזנה: שירו את הצליל העליון אוקטבה נמוך יותר, תנו שם למרווח הפשוט, ואז הוסיפו שבע.' },
        play: [notes([48, 64], 0.8), rest(0.3), notes([48, 52], 0.8)],
        show: { notes: [48, 52, 64], text: { en: '10 → 3', he: '10 → 3' } },
      },
      {
        say: { en: 'A common mistake: adding eight. The octave note is counted only once, so a second plus an octave is a ninth, not a tenth.', he: 'טעות נפוצה: להוסיף שמונה. צליל האוקטבה נספר רק פעם אחת, ולכן סקונדה ועוד אוקטבה היא נונה, לא דצימה.' },
        show: { text: { en: '2 + 8 − 1 = 9', he: '2 + 8 − 1 = 9' } },
      },
      {
        say: { en: 'On jazz charts: C9, F13, Cmaj7 sharp 11. The numbers are these wide intervals, counted up from the root.', he: 'בדף אקורדים של ג׳אז: C9, ‏F13, ‏Cmaj7♯11. המספרים הם המרווחים הרחבים האלה, נספרים מהשורש למעלה.' },
        play: [chord([41, 57, 63, 67, 74], 1.4)],
        show: { notes: [41, 57, 63, 67, 74], text: { en: 'F13 = F · A E♭ G D', he: 'F13 = פה · לה מי♭ סול רה' } },
      },
      {
        say: { en: 'To keep: past the octave, take away seven. Nine is two, eleven is four, thirteen is six, and the quality stays.', he: 'לזכור: אחרי האוקטבה, מחסירים שבע. תשע היא שתיים, אחת־עשרה היא ארבע, שלוש־עשרה היא שש, והאיכות נשארת.' },
        show: { text: { en: '9 = 2 · 11 = 4 · 13 = 6', he: '9 = 2 · 11 = 4 · 13 = 6' } },
      },
    ],
  },

  // ------------------------------------------------------------------ The 6 chord and the diminished 7th (EAR-JAZZ M4)
  // docs/BARRY-HARRIS-THEORY.md: §1 (three diminished chords, a dominant from a dim), §5 (the major and minor 6th-dim
  // scales), §6.3 (the chord alternates with its dim). Nothing else.
  {
    id: 'six-dim',
    area: 'jazz',
    emoji: 'chords',
    title: { en: 'The 6 chord and the diminished 7th', he: 'אקורד 6 והספטאקורד המוקטן' },
    takeaway: { en: 'C6 = C E G A, calm, the jazz home. B°7 = B D F A♭, minor thirds only, tense. They share no note; together they make the 8-note C 6th-diminished scale.', he: 'C6 = דו מי סול לה, רגוע, הבית בג׳אז. B°7 = סי רה פה לה♭, רק טרצות קטנות, מתוח. אין להם צליל משותף; יחד הם יוצרים את סולם דו 6 מוקטן, בן 8 צלילים.' },
    steps: [
      {
        say: { en: 'A major triad plus the sixth: C6 is C, E, G, A. The jazz home.', he: 'משולש מז׳ור ועוד הסקסטה: C6 הוא דו, מי, סול, לה. הבית בג׳אז.' },
        play: [chord(C6, 1.1, true), chord([48, ...C6], 1.5)],
        show: { notes: C6, chord: true, key: 'C', text: { en: 'C6 = C E G A', he: 'C6 = דו מי סול לה' } },
      },
      {
        say: { en: 'A diminished seventh stacks only minor thirds: B, D, F, A-flat. Tense.', he: 'ספטאקורד מוקטן בנוי רק מטרצות קטנות: סי, רה, פה, לה במול. מתוח.' },
        play: [chord(B_DIM, 1.1, true), chord([47, ...B_DIM], 1.5)],
        show: { notes: B_DIM, chord: true, key: 'C', text: { en: 'B°7 = B D F A♭', he: 'B°7 = סי רה פה לה♭' } },
      },
      {
        say: { en: 'They share no note. Take turns: rest, tension, rest.', he: 'אין להם אף צליל משותף. מתחלפים: מנוחה, מתח, מנוחה.' },
        play: [chord(C6, 1.0), chord(B_DIM, 1.0), chord(C6, 1.4)],
        show: { notes: [...B_DIM, ...C6].sort((a, b) => a - b), text: { en: '6 · °7 · 6', he: '6 · °7 · 6' } },
      },
      {
        say: { en: 'Their eight notes together make the C sixth-diminished scale.', he: 'שמונת הצלילים שלהם יחד יוצרים את סולם דו 6 מוקטן.' },
        play: [notes(SIXDIM, 0.34)],
        show: { notes: SIXDIM, key: 'C', text: { en: 'C D E F G A♭ A B', he: 'דו רה מי פה סול לה♭ לה סי' } },
      },
      {
        say: { en: 'Each scale note gets its chord: 6, diminished, 6, diminished.', he: 'כל צליל בסולם מקבל את האקורד שלו: 6, מוקטן, 6, מוקטן.' },
        play: SIXDIM_CHORDS.map((c, i) => chord(c, i === SIXDIM_CHORDS.length - 1 ? 1.3 : 0.7)),
        show: { notes: [60, 62, 64, 65, 67], key: 'C', text: { en: '6 · °7 · 6 · °7 · 6', he: '6 · °7 · 6 · °7 · 6' } },
      },
    ],
    more: [
      {
        say: { en: 'There are only three diminished seventh chords, and each has four names a minor third apart. B°7 is also D°7, F°7 and A-flat°7: the same four notes.', he: 'יש רק שלושה ספטאקורדים מוקטנים, ולכל אחד ארבעה שמות, במרחק טרצה קטנה זה מזה. B°7 הוא גם D°7, ‏F°7 ו־A♭°7: אותם ארבעה צלילים.' },
        play: [chord([59, 62, 65, 68], 0.8), chord([62, 65, 68, 71], 0.8), chord([65, 68, 71, 74], 0.8), chord([68, 71, 74, 77], 1.0)],
        show: { notes: B_DIM, chord: true, text: { en: 'B°7 = D°7 = F°7 = A♭°7', he: 'B°7 = D°7 = F°7 = A♭°7' } },
      },
      {
        say: { en: 'The other two: C°7 is C, E-flat, G-flat, A; D-flat°7 is D-flat, E, G, B-flat.', he: 'שני האחרים: C°7 הוא דו, מי♭, סול♭, לה; ‏D♭°7 הוא רה♭, מי, סול, סי♭.' },
        play: [chord([60, 63, 66, 69], 1.0), rest(0.2), chord([61, 64, 67, 70], 1.0), rest(0.2), chord([62, 65, 68, 71], 1.2)],
        show: { text: { en: 'C° · D♭° · D°', he: 'C° · D♭° · D°' } },
      },
      {
        say: { en: 'Lower any one note of a diminished seventh a half step and you get a dominant seventh on that note. In B°7, lower A-flat to G: B, D, F, G is G7.', he: 'מנמיכים צליל אחד של ספטאקורד מוקטן בחצי טון ומקבלים ספטאקורד דומיננטי על הצליל הזה. ב־B°7 מנמיכים את לה♭ לסול: סי, רה, פה, סול הוא G7.' },
        play: [chord(B_DIM, 1.0), chord([59, 62, 65, 67], 1.1), chord([48, 60, 64, 67], 1.4)],
        show: { notes: [59, 62, 65, 67], chord: true, text: { en: 'B°7 → G7 → C', he: 'B°7 → G7 → C' } },
      },
      {
        say: { en: 'Make the 6 chord minor, C, E-flat, G, A, and keep B°7: that is the minor sixth-diminished scale. Same idea, a darker home.', he: 'הופכים את אקורד ה־6 למינור, דו, מי♭, סול, לה, ומשאירים את B°7: זה סולם מינור 6 מוקטן. אותו רעיון, בית כהה יותר.' },
        play: [chord([60, 63, 67, 69], 1.0), notes([60, 62, 63, 65, 67, 68, 69, 71, 72], 0.3)],
        show: { notes: [60, 62, 63, 65, 67, 68, 69, 71, 72], key: 'C', text: { en: 'Cm6 + B°7', he: 'Cm6 + B°7' } },
      },
      {
        say: { en: 'At the piano: C6 in root position, then the next scale note up in the bass with B°7 above it, then C6 in first inversion. Climb the scale chord by chord, 6 and diminished taking turns.', he: 'בפסנתר: C6 במצב יסודי, ואז הצליל הבא בסולם בבס עם B°7 מעליו, ואז C6 בהיפוך ראשון. עולים בסולם אקורד אחרי אקורד, 6 ומוקטן מתחלפים.' },
        play: SIXDIM_CHORDS.map((c, i) => chord(c, i === SIXDIM_CHORDS.length - 1 ? 1.3 : 0.8)),
        show: { text: { en: 'C6 · B°7 · C6 · B°7 · C6', he: 'C6 · B°7 · C6 · B°7 · C6' } },
      },
      {
        say: { en: 'Barry Harris taught these scales first as a chording tool: harmony for every note of a line, built from two chords.', he: 'בארי האריס לימד את הסולמות האלה קודם ככלי לבניית אקורדים: הרמוניה לכל צליל בקו, משני אקורדים.' },
        play: [chord([55, 57, 60, 64], 0.8), chord([56, 59, 62, 65], 0.8), chord([57, 60, 64, 67], 1.2)],
        show: { text: { en: '2 chords → every note', he: '2 אקורדים → כל צליל' } },
      },
      {
        say: { en: 'To keep: C6 is home, B°7 is motion, and their eight notes make one scale.', he: 'לזכור: C6 הוא הבית, B°7 הוא התנועה, ושמונת הצלילים שלהם הם סולם אחד.' },
        show: { text: { en: 'C6 + B°7 = 8 notes', he: 'C6 + B°7 = 8 צלילים' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Welcome to jazz (EAR-JAZZ M6)
  {
    id: 'jazz-welcome',
    area: 'jazz',
    emoji: 'jazz',
    title: { en: 'Welcome to jazz', he: 'ברוכים הבאים לג׳אז' },
    takeaway: { en: 'Jazz eighths swing, long–short. The blues is 12 bars on I7, IV7 and V7. And ii–V–I is the move that brings a tune home.', he: 'שמיניות בג׳אז מתנדנדות, ארוך–קצר. הבלוז הוא 12 תיבות על I7, ‏IV7 ו־V7. ו־ii–V–I הוא המהלך שמחזיר שיר הביתה.' },
    steps: [
      {
        say: { en: 'Jazz eighths swing: long–short, long–short. First straight, then swung.', he: 'שמיניות בג׳אז מתנדנדות: ארוך–קצר, ארוך–קצר. קודם ישר, ואז בסווינג.' },
        play: [straight([67, 69, 71, 72, 74, 72, 71, 69, 67]), rest(0.4), swung([67, 69, 71, 72, 74, 72, 71, 69, 67])],
        show: { text: { en: '♪♪ → long–short', he: '♪♪ → ארוך–קצר' } },
      },
      {
        say: { en: 'The blues is jazz’s home form: twelve bars, three chords.', he: 'הבלוז הוא הצורה הביתית של הג׳אז: שתים־עשרה תיבות, שלושה אקורדים.' },
        play: [jazz(C, [[0, '7'], [5, '7'], [7, '7'], [0, '7']], 1.0)],
        show: { text: { en: 'I7 · IV7 · V7', he: 'I7 · IV7 · V7' } },
      },
      {
        say: { en: 'Four bars of I7, two of IV7, two of I7, then V7, IV7, I7.', he: 'ארבע תיבות של I7, שתיים של IV7, שתיים של I7, ואז V7, ‏IV7, ‏I7.' },
        play: [jazz(C, [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], 0.55)],
        show: { text: { en: 'I7 I7 I7 I7 | IV7 IV7 I7 I7 | V7 IV7 I7 V7', he: 'I7 I7 I7 I7 | IV7 IV7 I7 I7 | V7 IV7 I7 V7' } },
      },
      {
        say: { en: 'The most common move in jazz: ii–V–I. In C: D minor 7, G7, C major 7.', he: 'המהלך הנפוץ ביותר בג׳אז: ii–V–I. בדו: Dm7, ‏G7, ‏Cmaj7.' },
        play: [jazz(C, [[2, 'm7'], [7, '7'], [0, 'maj7']], 1.1)],
        show: { text: { en: 'Dm7 → G7 → Cmaj7', he: 'Dm7 → G7 → Cmaj7' } },
      },
      {
        say: { en: 'ii and V lean forward; I is home. Tunes chain ii–Vs through many keys.', he: 'ii ו־V נשענים קדימה; I הוא הבית. שירים משרשרים ii–V דרך הרבה סולמות.' },
        play: [jazz(C, [[2, 'm7'], [7, '7'], [0, 'maj7']], 0.9), jazz(F, [[2, 'm7'], [7, '7'], [0, 'maj7']], 0.9)],
        show: { text: { en: 'C: Dm7 G7 Cmaj7 · F: Gm7 C7 Fmaj7', he: 'דו: Dm7 G7 Cmaj7 · פה: Gm7 C7 Fmaj7' } },
      },
    ],
    more: [
      {
        say: { en: 'Swung eighths are played roughly like the first and last notes of a triplet, about two to one. At fast tempos they even out.', he: 'שמיניות בסווינג מנוגנות בערך כמו הצליל הראשון והאחרון של טריולה, בערך שניים לאחד. בטמפו מהיר הן מתיישרות.' },
        play: [swung([60, 62, 64, 65, 67, 65, 64, 62, 60], 100)],
        show: { text: { en: '♪ ♪ ≈ ♩ ♪ (triplet)', he: '♪ ♪ ≈ ♩ ♪ (טריולה)' } },
      },
      {
        say: { en: 'The basic 12-bar blues: I7 for four bars, often with IV7 in bar 2, IV7 for two, I7 for two, then V7, IV7, I7, and V7 to go round again.', he: 'הבלוז הבסיסי של 12 תיבות: I7 ארבע תיבות, הרבה פעמים עם IV7 בתיבה 2, ‏IV7 שתיים, ‏I7 שתיים, ואז V7, ‏IV7, ‏I7, ו־V7 כדי להתחיל שוב.' },
        play: [jazz(F, [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], 0.55)],
        show: { text: { en: 'F7 B♭7 F7 F7 | B♭7 B♭7 F7 F7 | C7 B♭7 F7 C7', he: 'F7 B♭7 F7 F7 | B♭7 B♭7 F7 F7 | C7 B♭7 F7 C7' } },
      },
      {
        say: { en: 'In a blues every chord is a dominant seventh, even the I. That is a big part of the blues sound.', he: 'בבלוז כל אקורד הוא ספטאקורד דומיננטי, אפילו ה־I. זה חלק גדול מהצליל של הבלוז.' },
        play: [jazz(C, [[0, '7'], [0, 'maj7'], [0, '7']], 1.0)],
        show: { text: { en: 'C7 · Cmaj7 · C7', he: 'C7 · Cmaj7 · C7' } },
      },
      {
        say: { en: 'The jazz blues adds ii–Vs: bar 4 leads to IV with a ii–V, and bars 9 and 10 become ii and V of the key.', he: 'בלוז הג׳אז מוסיף ii–V: תיבה 4 מובילה ל־IV עם ii–V, ותיבות 9 ו־10 נהיות ii ו־V של הסולם.' },
        play: [jazz(C, [[7, 'm7'], [0, '7'], [5, '7']], 0.9), rest(0.3), jazz(C, [[2, 'm7'], [7, '7'], [0, '7']], 0.9)],
        show: { text: { en: 'bar 4: Gm7 C7 → F7 · bars 9–10: Dm7 G7', he: 'תיבה 4: Gm7 C7 → F7 · תיבות 9–10: Dm7 G7' } },
      },
      {
        say: { en: 'A lead sheet gives the melody and the chord symbols. The players make up the rest: the comping, the walking bass line, the solos over the form.', he: 'דף אקורדים נותן את המנגינה ואת סימני האקורדים. הנגנים ממציאים את השאר: הליווי, הווקינג של הבס, הסולואים על הצורה.' },
        show: { text: { en: 'melody + chords → the band', he: 'מנגינה + אקורדים → הלהקה' } },
      },
      {
        say: { en: 'A listening tip: count the blues in groups of four bars, and follow the bass to hear when I, IV and V arrive.', he: 'טיפ להאזנה: ספרו את הבלוז בקבוצות של ארבע תיבות, ועקבו אחרי הבס כדי לשמוע מתי מגיעים I, ‏IV ו־V.' },
        play: [jazz(C, [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7']], 0.6)],
        show: { text: { en: '1 2 3 4 | 5 = IV', he: '1 2 3 4 | 5 = IV' } },
      },
    ],
  },

  // ------------------------------------------------------------------ The blues by ear (topic blues-ear; EAR-JAZZ M5)
  {
    id: 'blues-ear',
    area: 'jazz',
    emoji: 'jazz',
    title: { en: 'The blues by ear', he: 'הבלוז בשמיעה' },
    takeaway: { en: 'Twelve bars in three groups of four: IV arrives at bar 5, V at bar 9, home at bar 11. The bass tells you which chord you are on. A jazz blues adds ii–Vs.', he: 'שתים־עשרה תיבות בשלוש קבוצות של ארבע: IV מגיע בתיבה 5, ‏V בתיבה 9, הביתה בתיבה 11. הבס מגלה על איזה אקורד אתם. בלוז ג׳אז מוסיף ii–V.' },
    steps: [
      {
        say: { en: 'A blues chorus is twelve bars: three lines of four.', he: 'כורוס של בלוז הוא שתים־עשרה תיבות: שלוש שורות של ארבע.' },
        play: [jazz(C, [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], 0.55)],
        show: { text: { en: '4 + 4 + 4 = 12', he: '4 + 4 + 4 = 12' } },
      },
      {
        say: { en: 'Bar 5 is the first big change: the IV chord arrives.', he: 'תיבה 5 היא השינוי הגדול הראשון: מגיע אקורד IV.' },
        play: [jazz(C, [[0, '7'], [0, '7'], [5, '7'], [5, '7']], 0.8)],
        show: { text: { en: 'bar 5: IV7', he: 'תיבה 5: IV7' } },
      },
      {
        say: { en: 'Bar 9 brings V, the strongest pull. Bar 11 is home.', he: 'תיבה 9 מביאה את V, המשיכה החזקה ביותר. תיבה 11 היא הבית.' },
        play: [jazz(C, [[7, '7'], [5, '7'], [0, '7'], [0, '7']], 0.9)],
        show: { text: { en: 'bar 9: V7 · bar 11: I7', he: 'תיבה 9: V7 · תיבה 11: I7' } },
      },
      {
        say: { en: 'Lost? Follow the bass: its note names the chord, I, IV or V.', he: 'הלכתם לאיבוד? עקבו אחרי הבס: הצליל שלו נותן לאקורד שם, I, ‏IV או V.' },
        play: [notes([36, 41, 43, 36], 0.7)],
        show: { notes: [36, 41, 43], text: { en: 'C · F · G = I · IV · V', he: 'דו · פה · סול = I · IV · V' } },
      },
      {
        say: { en: 'A jazz blues keeps the form but adds ii–Vs and moves faster.', he: 'בלוז ג׳אז שומר על הצורה אבל מוסיף ii–V וזז מהר יותר.' },
        play: [jazz(C, [[2, 'm7'], [7, '7'], [0, '7'], [9, '7'], [2, 'm7'], [7, '7']], 0.7)],
        show: { text: { en: 'Dm7 G7 C7 A7 Dm7 G7', he: 'Dm7 G7 C7 A7 Dm7 G7' } },
      },
    ],
    more: [
      {
        say: { en: 'The blues uses dominant sevenths on I, IV and V. In F: F7, B-flat 7 and C7.', he: 'הבלוז משתמש בספטאקורדים דומיננטיים על I, ‏IV ו־V. בפה: F7, ‏B♭7 ו־C7.' },
        play: [jazz(F, [[0, '7'], [5, '7'], [7, '7'], [0, '7']], 1.0)],
        show: { text: { en: 'F7 · B♭7 · C7', he: 'F7 · B♭7 · C7' } },
      },
      {
        say: { en: 'Many blues go to IV already in bar 2 and come back in bar 3. Players call it the quick change. The big IV in bar 5 is still the landmark.', he: 'הרבה בלוזים הולכים ל־IV כבר בתיבה 2 וחוזרים בתיבה 3. נגנים קוראים לזה שינוי מהיר. ה־IV הגדול בתיבה 5 הוא עדיין נקודת הציון.' },
        play: [jazz(C, [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7']], 0.7)],
        show: { text: { en: 'I7 IV7 I7 I7 | IV7', he: 'I7 IV7 I7 I7 | IV7' } },
      },
      {
        say: { en: 'Bar 12 often goes to V7: the turnaround that sends the band back to the top for the next chorus.', he: 'תיבה 12 הולכת הרבה פעמים ל־V7: הטרנאראונד ששולח את הלהקה בחזרה להתחלה, לכורוס הבא.' },
        play: [jazz(C, [[0, '7'], [7, '7'], [0, '7']], 1.0)],
        show: { text: { en: 'bar 12: V7 → bar 1', he: 'תיבה 12: V7 → תיבה 1' } },
      },
      {
        say: { en: 'The minor blues has the same shape with minor chords: i for four bars, iv for two, i for two, then two dominants lead home.', he: 'לבלוז המינורי יש אותה צורה עם אקורדי מינור: i ארבע תיבות, ‏iv שתיים, ‏i שתיים, ואז שתי דומיננטות מובילות הביתה.' },
        play: [jazz(C, [[0, 'm7'], [5, 'm7'], [0, 'm7'], [8, '7'], [7, '7'], [0, 'm7']], 0.75)],
        show: { text: { en: 'Cm7 · Fm7 · Cm7 · A♭7 G7 Cm7', he: 'Cm7 · Fm7 · Cm7 · A♭7 G7 Cm7' } },
      },
      {
        say: { en: 'In the jazz blues, bar 4 is a ii–V into IV, and bars 9 and 10 are ii and V. The form is the same; the chords move twice as often.', he: 'בבלוז הג׳אז, תיבה 4 היא ii–V אל IV, ותיבות 9 ו־10 הן ii ו־V. הצורה זהה; האקורדים זזים פי שניים.' },
        play: [jazz(C, [[0, '7'], [7, 'm7'], [0, '7'], [5, '7']], 0.8), rest(0.3), jazz(C, [[2, 'm7'], [7, '7'], [0, '7']], 0.8)],
        show: { text: { en: 'C7 Gm7 C7 → F7 · Dm7 G7 C7', he: 'C7 Gm7 C7 → F7 · Dm7 G7 C7' } },
      },
      {
        say: { en: 'A common mistake: counting beats instead of bars. Count bar numbers on beat one only: one, two, three, four, then the IV.', he: 'טעות נפוצה: לספור פעמות במקום תיבות. ספרו את מספר התיבה רק בפעמה הראשונה: אחת, שתיים, שלוש, ארבע, ואז ה־IV.' },
        show: { text: { en: '1 . . . 2 . . . 3 . . . 4 . . . 5 = IV', he: '1 . . . 2 . . . 3 . . . 4 . . . 5 = IV' } },
      },
      {
        say: { en: 'To keep: bar 5 brings IV, bar 9 brings V, and bar 11 is home.', he: 'לזכור: תיבה 5 מביאה את IV, תיבה 9 את V, ותיבה 11 היא הבית.' },
        show: { text: { en: '5 = IV · 9 = V · 11 = I', he: '5 = IV · 9 = V · 11 = I' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Voicing types (topic voicing-type; EAR-JAZZ M5)
  {
    id: 'voicing-type',
    area: 'jazz',
    emoji: 'chords',
    title: { en: 'Voicing types', he: 'סוגי ויסינג' },
    takeaway: { en: 'The same chord, spread out in different ways: close (inside an octave), drop 2 and drop 3 (a voice moved down an octave), shell (root, 3rd, 7th), rootless (3, 5, 7, 9), quartal (stacked 4ths).', he: 'אותו אקורד, פרוש בדרכים שונות: צפוף (בתוך אוקטבה), דרופ 2 ודרופ 3 (קול אחד יורד אוקטבה), שלד (שורש, טרצה, ספטימה), בלי שורש (3, ‏5, ‏7, ‏9), קוורטלי (קוורטות זו על זו).' },
    steps: [
      {
        say: { en: 'Close: all four notes inside one octave. Compact.', he: 'צפוף: כל ארבעת הצלילים בתוך אוקטבה אחת. דחוס.' },
        play: [chord(CMAJ7, 1.4), rest(0.2), notes(CMAJ7, 0.22)],
        show: { notes: CMAJ7, chord: true, text: { en: 'close: C E G B', he: 'צפוף: דו מי סול סי' } },
      },
      {
        say: { en: 'Drop 2: the second note from the top drops an octave. Wider, smoother.', he: 'דרופ 2: הצליל השני מלמעלה יורד אוקטבה. רחב וחלק יותר.' },
        play: [chord(CMAJ7, 1.1), rest(0.2), chord([55, 60, 64, 71], 1.4)],
        show: { notes: [55, 60, 64, 71], chord: true, text: { en: 'drop 2: G C E B', he: 'דרופ 2: סול דו מי סי' } },
      },
      {
        say: { en: 'Drop 3: the third note from the top drops instead. Even wider.', he: 'דרופ 3: הצליל השלישי מלמעלה יורד במקום. עוד יותר רחב.' },
        play: [chord(CMAJ7, 1.1), rest(0.2), chord([52, 60, 67, 71], 1.4)],
        show: { notes: [52, 60, 67, 71], chord: true, text: { en: 'drop 3: E C G B', he: 'דרופ 3: מי דו סול סי' } },
      },
      {
        say: { en: 'Shell: just the root, the third and the seventh. A bare skeleton.', he: 'שלד: רק השורש, הטרצה והספטימה. שלד חשוף.' },
        play: [chord([48, 64, 71], 1.5)],
        show: { notes: [48, 64, 71], chord: true, text: { en: 'shell: C · E B', he: 'שלד: דו · מי סי' } },
      },
      {
        say: { en: 'Rootless: 3, 5, 7 and 9. The bass player has the root.', he: 'בלי שורש: 3, ‏5, ‏7 ו־9. השורש אצל נגן הבס.' },
        play: [chord([36, 64, 67, 71, 74], 1.5)],
        show: { notes: [64, 67, 71, 74], chord: true, text: { en: 'rootless: E G B D', he: 'בלי שורש: מי סול סי רה' } },
      },
    ],
    more: [
      {
        say: { en: 'Why drop 2? The close chord’s top voice stays the melody, and the dropped note opens space in the middle. It also lies well under the fingers on guitar.', he: 'למה דרופ 2? הקול העליון של האקורד הצפוף נשאר המנגינה, והצליל שירד פותח מקום באמצע. הוא גם נוח לאצבעות בגיטרה.' },
        play: [chord(CMAJ7, 1.0), chord([55, 60, 64, 71], 1.3)],
        show: { notes: [71], text: { en: 'top note stays: B', he: 'הצליל העליון נשאר: סי' } },
      },
      {
        say: { en: 'A listening tip: hear the width first. Close sounds tight in the middle; drop 2 and drop 3 spread out, with a gap at the bottom.', he: 'טיפ להאזנה: קודם שמעו את הרוחב. צפוף נשמע דחוס באמצע; דרופ 2 ודרופ 3 פרושים, עם רווח למטה.' },
        play: [chord(CMAJ7, 1.0), rest(0.2), chord([55, 60, 64, 71], 1.0), rest(0.2), chord([52, 60, 67, 71], 1.2)],
        show: { text: { en: 'close · drop 2 · drop 3', he: 'צפוף · דרופ 2 · דרופ 3' } },
      },
      {
        say: { en: 'The shell is the pianist’s left hand and the guitarist’s first jazz chord: the third and seventh say major or minor, dominant or not.', he: 'השלד הוא יד שמאל של הפסנתרן והאקורד הג׳אזי הראשון של הגיטריסט: הטרצה והספטימה אומרות מז׳ור או מינור, דומיננט או לא.' },
        play: [chord([50, 65, 72], 1.0), chord([43, 59, 65], 1.0), chord([48, 64, 71], 1.3)],
        show: { text: { en: 'Dm7 · G7 · Cmaj7 (shells)', he: 'Dm7 · G7 · Cmaj7 (שלדים)' } },
      },
      {
        say: { en: 'Quartal: notes stacked in fourths instead of thirds. Open and modern, as in modal jazz.', he: 'קוורטלי: צלילים בנויים בקוורטות במקום בטרצות. פתוח ומודרני, כמו בג׳אז מודאלי.' },
        play: [chord([50, 55, 60, 65], 1.5)],
        show: { notes: [50, 55, 60, 65], chord: true, text: { en: 'D G C F', he: 'רה סול דו פה' } },
      },
      {
        say: { en: 'An upper structure puts a triad from the upper tensions over a dominant. A D major triad over C7 gives the 9, the sharp 11 and the 13.', he: 'מבנה עליון שם משולש מהמתחים העליונים מעל דומיננט. משולש רה מז׳ור מעל C7 נותן את 9, ‏♯11 ו־13.' },
        play: [chord([36, 52, 58], 0.9), chord([36, 52, 58, 62, 66, 69], 1.5)],
        show: { notes: [36, 52, 58, 62, 66, 69], text: { en: 'D/C7 = 9 · ♯11 · 13', he: 'D/C7 = 9 · ♯11 · 13' } },
      },
      {
        say: { en: 'To keep: close, drop 2, drop 3, shell, rootless, quartal. Same chord, different spacing. Listen for the width first, then for the root in the bass, and last for the top note.', he: 'לזכור: צפוף, דרופ 2, דרופ 3, שלד, בלי שורש, קוורטלי. אותו אקורד, פריסה אחרת. הקשיבו קודם לרוחב, אחר כך לשורש בבס, ובסוף לצליל העליון.' },
        show: { text: { en: 'close · drop 2 · drop 3 · shell · rootless · quartal', he: 'צפוף · דרופ 2 · דרופ 3 · שלד · בלי שורש · קוורטלי' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Reading a lead sheet (topic chart-analysis; EAR-JAZZ M5)
  {
    id: 'chart-analysis',
    area: 'jazz',
    emoji: 'jazz',
    title: { en: 'Reading a lead sheet', he: 'לקרוא דף אקורדים' },
    takeaway: { en: 'Find the key (where the tune rests), then the ii–Vs (a minor 7 and a dominant a 4th higher). Every ii–V points to its I, even in another key; every chord is home, on the way, or pulling home.', he: 'מוצאים את הסולם (איפה השיר נח), ואז את ה־ii–V (מינור 7 ודומיננט קוורטה מעליו). כל ii–V מצביע על ה־I שלו, גם בסולם אחר; כל אקורד הוא בית, בדרך, או מושך הביתה.' },
    steps: [
      {
        say: { en: 'A lead sheet shows the melody and a chord symbol for every bar.', he: 'דף אקורדים מראה את המנגינה וסימן אקורד לכל תיבה.' },
        play: [jazz(C, [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']], 1.0)],
        show: { text: { en: '| Dm7 | G7 | Cmaj7 | Cmaj7 |', he: '| Dm7 | G7 | Cmaj7 | Cmaj7 |' } },
      },
      {
        say: { en: 'Find the key first: where does the tune rest? Usually the last chord.', he: 'קודם מוצאים את הסולם: איפה השיר נח? בדרך כלל באקורד האחרון.' },
        play: [jazz(C, [[9, 'm7'], [2, 'm7'], [7, '7'], [0, 'maj7']], 1.0)],
        show: { text: { en: '… G7 | Cmaj7 ‖ = C', he: '… G7 | Cmaj7 ‖ = דו' } },
      },
      {
        say: { en: 'Find the ii–Vs: a minor 7, then a dominant a fourth higher.', he: 'מוצאים את ה־ii–V: מינור 7, ואז דומיננט קוורטה מעליו.' },
        play: [jazz(C, [[2, 'm7'], [7, '7']], 1.2)],
        show: { text: { en: 'Dm7 → G7 (D → G = a 4th)', he: 'Dm7 → G7 (רה → סול = קוורטה)' } },
      },
      {
        say: { en: 'Each ii–V points to the chord after it, even in another key.', he: 'כל ii–V מצביע על האקורד שאחריו, גם בסולם אחר.' },
        play: [jazz(C, [[4, 'm7'], [9, '7'], [2, 'maj7']], 1.1)],
        show: { text: { en: 'Em7 A7 → Dmaj7', he: 'Em7 A7 → Dmaj7' } },
      },
      {
        say: { en: 'So every chord has a job: home, on the way, or pulling home.', he: 'כך לכל אקורד יש תפקיד: בית, בדרך, או מושך הביתה.' },
        play: [jazz(C, [[0, 'maj7'], [2, 'm7'], [7, '7'], [0, 'maj7']], 1.0)],
        show: { text: { en: 'I = home · ii = on the way · V = pull', he: 'I = בית · ii = בדרך · V = משיכה' } },
      },
    ],
    more: [
      {
        say: { en: 'A minor ii–V has a half-diminished ii and a dominant V that resolves to a minor I. In C minor: D half-diminished, G7, C minor.', he: 'ii–V מינורי הוא ii חצי מוקטן ו־V דומיננטי שנפתר ל־I מינורי. בדו מינור: Dø7, ‏G7, ‏Cm.' },
        play: [jazz(C, [[2, 'm7b5'], [7, '7'], [0, 'm7']], 1.1)],
        show: { text: { en: 'Dø7 → G7 → Cm7', he: 'Dø7 → G7 → Cm7' } },
      },
      {
        say: { en: 'Not every ii–V lands. Some move on to another ii–V instead: the tune keeps travelling before it comes home.', he: 'לא כל ii–V נוחת. חלק ממשיכים במקום זאת ל־ii–V אחר: השיר ממשיך לנסוע לפני שהוא חוזר הביתה.' },
        play: [jazz(C, [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7'], [0, 'maj7']], 0.8)],
        show: { text: { en: 'Em7 A7 | Dm7 G7 | Cmaj7', he: 'Em7 A7 | Dm7 G7 | Cmaj7' } },
      },
      {
        say: { en: 'A dominant alone can point the same way. A7 in the key of C is not from the scale: it is the V of D minor, a secondary dominant.', he: 'גם דומיננט לבד יכול להצביע כך. A7 בסולם דו לא שייך לסולם: הוא ה־V של רה מינור, דומיננטה משנית.' },
        play: [jazz(C, [[0, 'maj7'], [9, '7'], [2, 'm7']], 1.0)],
        show: { text: { en: 'A7 → Dm7 = V/ii', he: 'A7 → Dm7 = V/ii' } },
      },
      {
        say: { en: 'The turnaround I, vi, ii, V fills the last bars and leads back to the top.', he: 'הטרנאראונד I, ‏vi, ‏ii, ‏V ממלא את התיבות האחרונות ומוביל בחזרה להתחלה.' },
        play: [jazz(C, [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']], 0.9)],
        show: { text: { en: 'Cmaj7 Am7 Dm7 G7', he: 'Cmaj7 Am7 Dm7 G7' } },
      },
      {
        say: { en: 'Analysts mark a ii–V with a bracket under the two chords, and an arrow from each dominant to where it resolves.', he: 'מנתחים מסמנים ii–V בסוגר מתחת לשני האקורדים, וחץ מכל דומיננט אל המקום שבו הוא נפתר.' },
        show: { text: { en: 'Dm7 G7 → Cmaj7  (└─┘ →)', he: 'Dm7 G7 → Cmaj7  (└─┘ →)' } },
      },
      {
        say: { en: 'A common mistake: taking the first chord as the key. Many standards begin on ii or somewhere far away. Check the last bars and the key signature.', he: 'טעות נפוצה: לחשוב שהאקורד הראשון הוא הסולם. הרבה סטנדרטים מתחילים ב־ii או במקום רחוק. בדקו את התיבות האחרונות ואת סימני ההיתק.' },
        play: [jazz(C, [[2, 'm7'], [7, '7'], [0, 'maj7']], 1.0)],
        show: { text: { en: 'starts on Dm7 · key = C', he: 'מתחיל ב־Dm7 · סולם = דו' } },
      },
      {
        say: { en: 'To keep: the key first, then the ii–Vs, then each chord’s job: home, on the way, or pulling home.', he: 'לזכור: קודם הסולם, אחר כך ה־ii–V, ואז התפקיד של כל אקורד: בית, בדרך, או מושך הביתה.' },
        show: { text: { en: 'key → ii–V → job', he: 'סולם → ii–V → תפקיד' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Backdoor, ii–V chains, Coltrane cycles (topic jazz-chains)
  {
    id: 'jazz-chains',
    area: 'jazz',
    emoji: 'jazz',
    title: { en: 'Backdoor, chains, Coltrane cycles', he: 'דלת אחורית, שרשראות, מעגלי קולטריין' },
    takeaway: { en: 'Other roads home: the backdoor iv–♭VII7–I, the tritone sub ii–♭II7–I, ii–Vs chained step by step, and Coltrane’s key centres a major third apart.', he: 'דרכים אחרות הביתה: הדלת האחורית iv–♭VII7–I, תחליף הטריטון ii–♭II7–I, שרשראות ii–V צעד אחר צעד, והמרכזים של קולטריין במרחק טרצה גדולה.' },
    steps: [
      {
        say: { en: 'The plain road home: ii–V–I. D minor 7, G7, C major 7.', he: 'הדרך הרגילה הביתה: ii–V–I. ‏Dm7, ‏G7, ‏Cmaj7.' },
        play: [jazz(C, [[2, 'm7'], [7, '7'], [0, 'maj7']], 1.1)],
        show: { text: { en: 'Dm7 G7 Cmaj7', he: 'Dm7 G7 Cmaj7' } },
      },
      {
        say: { en: 'The backdoor: iv–flat VII7–I. F minor 7, B-flat 7, C. Home from below.', he: 'הדלת האחורית: iv–♭VII7–I. ‏Fm7, ‏B♭7, ‏C. הביתה מלמטה.' },
        play: [jazz(C, [[5, 'm7'], [10, '7'], [0, 'maj7']], 1.1)],
        show: { text: { en: 'Fm7 B♭7 Cmaj7', he: 'Fm7 B♭7 Cmaj7' } },
      },
      {
        say: { en: 'The tritone sub: D-flat 7 replaces G7. The bass slides down by half steps.', he: 'תחליף הטריטון: D♭7 במקום G7. הבס מחליק למטה בחצאי טונים.' },
        play: [jazz(C, [[2, 'm7'], [1, '7'], [0, 'maj7']], 1.1)],
        show: { text: { en: 'Dm7 D♭7 Cmaj7', he: 'Dm7 D♭7 Cmaj7' } },
      },
      {
        say: { en: 'Chains: ii–Vs in a row, each one a step lower.', he: 'שרשראות: ii–V ברצף, כל אחד צעד נמוך יותר.' },
        play: [jazz(C, [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7'], [0, 'maj7']], 0.85)],
        show: { text: { en: 'Em7 A7 | Dm7 G7 | Cmaj7', he: 'Em7 A7 | Dm7 G7 | Cmaj7' } },
      },
      {
        say: { en: 'Coltrane cycles: key centres a major third apart, each reached by its own V7.', he: 'מעגלי קולטריין: מרכזים טונליים במרחק טרצה גדולה, לכל אחד ה־V7 שלו.' },
        play: [jazz(C, [[0, 'maj7'], [3, '7'], [8, 'maj7'], [11, '7'], [4, 'maj7'], [7, '7'], [0, 'maj7']], 0.75)],
        show: { text: { en: 'C · E♭7 A♭ · B7 E · G7 C', he: 'C · E♭7 A♭ · B7 E · G7 C' } },
      },
    ],
    more: [
      {
        say: { en: 'Why the tritone sub works: G7 and D-flat 7 share the same third and seventh, B and F, swapped. The tension is the same; only the bass changes.', he: 'למה תחליף הטריטון עובד: ל־G7 ול־D♭7 יש אותה טרצה וספטימה, סי ופה, בהחלפת תפקידים. המתח זהה; רק הבס משתנה.' },
        play: [chord([43, 59, 65], 1.0), chord([49, 59, 65], 1.0), chord([48, 60, 64], 1.3)],
        show: { notes: [59, 65], text: { en: 'G7 = B F · D♭7 = F C♭', he: 'G7 = סי פה · D♭7 = פה דו♭' } },
      },
      {
        say: { en: 'The backdoor borrows from the minor key: iv is F minor and flat VII is B-flat, both from C minor. The B-flat 7 lands on C without the leading tone.', he: 'הדלת האחורית שואלת מהמינור: iv הוא פה מינור ו־♭VII הוא סי במול, שניהם מדו מינור. ה־B♭7 נוחת על דו בלי הצליל המוביל.' },
        play: [jazz(C, [[5, 'm7'], [10, '7'], [0, 'maj7']], 1.0)],
        show: { text: { en: 'iv – ♭VII7 – I', he: 'iv – ♭VII7 – I' } },
      },
      {
        say: { en: 'Chains can move down by whole steps, by half steps, or by minor thirds. Listen to the bass of each minor 7 chord to hear the step.', he: 'שרשראות יכולות לרדת בטונים שלמים, בחצאי טונים או בטרצות קטנות. הקשיבו לבס של כל אקורד מינור 7 כדי לשמוע את הצעד.' },
        play: [jazz(C, [[3, 'm7'], [8, '7'], [2, 'm7'], [7, '7'], [0, 'maj7']], 0.85)],
        show: { text: { en: 'E♭m7 A♭7 | Dm7 G7 | Cmaj7 (half step)', he: 'E♭m7 A♭7 | Dm7 G7 | Cmaj7 (חצי טון)' } },
      },
      {
        say: { en: 'A dominant cycle drops the minor chords: III7, VI7, II7, V7, each dominant resolving to the next a fifth below.', he: 'מעגל דומיננטות מוותר על אקורדי המינור: III7, ‏VI7, ‏II7, ‏V7, כל דומיננט נפתר לבא אחריו, קווינטה מתחת.' },
        play: [jazz(C, [[4, '7'], [9, '7'], [2, '7'], [7, '7'], [0, 'maj7']], 0.85)],
        show: { text: { en: 'E7 A7 D7 G7 Cmaj7', he: 'E7 A7 D7 G7 Cmaj7' } },
      },
      {
        say: { en: 'John Coltrane built Giant Steps on centres a major third apart. Three keys divide the octave into equal parts, and each is reached by its own dominant.', he: 'ג׳ון קולטריין בנה את Giant Steps על מרכזים במרחק טרצה גדולה. שלושה סולמות מחלקים את האוקטבה לחלקים שווים, ולכל אחד יש דומיננט משלו.' },
        play: [jazz(C, [[0, 'maj7'], [3, '7'], [8, 'maj7']], 0.9)],
        show: { text: { en: 'C → A♭ → E → C', he: 'C → A♭ → E → C' } },
      },
      {
        say: { en: 'A listening tip: follow the bass. Up a fourth is a ii–V; a half step down is the tritone sub; a whole step up into I is the backdoor.', he: 'טיפ להאזנה: עקבו אחרי הבס. קוורטה למעלה זה ii–V; חצי טון למטה זה תחליף טריטון; טון שלם למעלה אל ה־I זו הדלת האחורית.' },
        play: [notes([38, 43, 36], 0.6), rest(0.3), notes([38, 37, 36], 0.6), rest(0.3), notes([34, 36], 0.6)],
        show: { text: { en: 'D G C · D D♭ C · B♭ C', he: 'D G C · D D♭ C · B♭ C' } },
      },
    ],
  },

  // ------------------------------------------------------------------ Chorale analysis (topic chorale-rn; EAR-JAZZ M5)
  {
    id: 'chorale-rn',
    area: 'theory',
    emoji: 'chords',
    title: { en: 'Chorale analysis', he: 'ניתוח כורל' },
    takeaway: { en: 'Four voices, one chord at a time. Name each chord by its numeral: start from the bass (root position or ⁶), then ask what it does — rest, move away, or pull home.', he: 'ארבעה קולות, אקורד אחד בכל פעם. נותנים לכל אקורד ספרה: מתחילים מהבס (מצב יסודי או ⁶), ואז שואלים מה הוא עושה — מנוחה, יציאה, או משיכה הביתה.' },
    steps: [
      {
        say: { en: 'A chorale: four voices, one chord at a time. Name each by its numeral.', he: 'כורל: ארבעה קולות, אקורד אחד בכל פעם. נותנים לכל אחד ספרה.' },
        play: [chord([48, 55, 64, 72], 0.9), chord([53, 57, 65, 72], 0.9), chord([43, 55, 62, 71], 0.9), chord([48, 55, 64, 72], 1.3)],
        show: { text: { en: 'I – IV – V – I', he: 'I – IV – V – I' } },
      },
      {
        say: { en: 'Start from the bass. Bass on the root: root position.', he: 'מתחילים מהבס. הבס על השורש: מצב יסודי.' },
        play: [note(48, 0.8), chord([48, 55, 64, 72], 1.3)],
        show: { notes: [48, 55, 64, 72], chord: true, text: { en: 'I (bass C)', he: 'I (בבס דו)' } },
      },
      {
        say: { en: 'Bass on the third: first inversion, written with a small 6.', he: 'הבס על הטרצה: היפוך ראשון, נכתב עם 6 קטן.' },
        play: [note(52, 0.8), chord([52, 55, 60, 72], 1.3)],
        show: { notes: [52, 55, 60, 72], chord: true, text: { en: 'I⁶ (bass E)', he: 'I⁶ (בבס מי)' } },
      },
      {
        say: { en: 'Then ask its job: rest is I, away is IV or ii, pulling home is V.', he: 'ואז שואלים מה התפקיד שלו: מנוחה זה I, יציאה זה IV או ii, משיכה הביתה זה V.' },
        play: [phrase(C, ['I', 'ii', 'V', 'I'])],
        show: { text: { en: 'I rest · ii away · V pull · I', he: 'I מנוחה · ii יציאה · V משיכה · I' } },
      },
      {
        say: { en: 'The cadential six-four: I with its fifth in the bass, just before V. It decorates V.', he: 'הקוורטסקסט הקדנציאלי: I עם הקווינטה בבס, רגע לפני V. הוא מקשט את V.' },
        play: [chord([43, 55, 64, 72], 1.0), chord([43, 55, 62, 71], 1.0), chord([36, 55, 64, 72], 1.4)],
        show: { text: { en: 'I⁶₄ → V → I', he: 'I⁶₄ → V → I' } },
      },
    ],
    more: [
      {
        say: { en: 'Bass on the fifth is second inversion, written six-four. Outside the cadence it is rare in chorales: mostly passing or over a held bass.', he: 'הבס על הקווינטה הוא היפוך שני, נכתב שש־ארבע. מחוץ לקדנצה הוא נדיר בכורלים: בעיקר כמעבר או מעל בס מוחזק.' },
        play: [note(43, 0.8), chord([43, 60, 64, 72], 1.3)],
        show: { notes: [43, 60, 64, 72], chord: true, text: { en: 'I⁶₄ (bass G)', he: 'I⁶₄ (בבס סול)' } },
      },
      {
        say: { en: 'V7 has four inversions: root position 7, then six-five with the third in the bass, four-three with the fifth, four-two with the seventh.', he: 'ל־V7 ארבעה מצבים: מצב יסודי 7, ואז שש־חמש עם הטרצה בבס, ארבע־שלוש עם הקווינטה, ארבע־שתיים עם הספטימה.' },
        play: [chord([43, 59, 62, 65], 0.8), chord([47, 55, 62, 65], 0.8), chord([50, 55, 59, 65], 0.8), chord([53, 55, 59, 62], 1.0)],
        show: { text: { en: 'V7 · V⁶₅ · V⁴₃ · V⁴₂', he: 'V7 · V⁶₅ · V⁴₃ · V⁴₂' } },
      },
      {
        say: { en: 'vi often follows V in place of I: the deceptive cadence. The bass climbs a step, from 5 to 6, instead of falling home.', he: 'vi בא הרבה פעמים אחרי V במקום I: הקדנצה המטעה. הבס עולה צעד, מ־5 ל־6, במקום ליפול הביתה.' },
        play: [chord([43, 55, 62, 71], 1.0), chord([45, 57, 64, 72], 1.4)],
        show: { text: { en: 'V → vi', he: 'V → vi' } },
      },
      {
        say: { en: 'In a minor key the numerals change case: i, ii°, III, iv, V, VI. V is major because of the raised seventh, the leading tone.', he: 'בסולם מינורי גודל האותיות משתנה: i, ‏ii°, ‏III, ‏iv, ‏V, ‏VI. ‏V מז׳ורי בגלל דרגה 7 המוגבהת, הצליל המוביל.' },
        play: [chord([45, 57, 60, 64], 0.9), chord([50, 57, 62, 65], 0.9), chord([40, 56, 59, 64], 0.9), chord([45, 57, 60, 64], 1.2)],
        show: { text: { en: 'A minor: i – iv – V – i', he: 'לה מינור: i – iv – V – i' } },
      },
      {
        say: { en: 'A listening tip: sing the bass line first. Its shape tells you the inversions, and a bass falling five to one tells you the cadence.', he: 'טיפ להאזנה: שירו קודם את קו הבס. הצורה שלו מגלה את ההיפוכים, ובס שיורד מחמש לאחת מגלה את הקדנצה.' },
        play: [notes([48, 52, 53, 55, 48], 0.6)],
        show: { notes: [48, 52, 53, 55], text: { en: 'C E F G C = I I⁶ IV V I', he: 'דו מי פה סול דו = I I⁶ IV V I' } },
      },
      {
        say: { en: 'To keep: bass first for the inversion, then the chord’s job for its numeral: rest, move away, or pull home. The last two chords name the cadence, and the bass line names the inversions.', he: 'לזכור: קודם הבס בשביל ההיפוך, ואז התפקיד של האקורד בשביל הספרה: מנוחה, יציאה, או משיכה הביתה. שני האקורדים האחרונים נותנים שם לקדנצה, וקו הבס נותן שם להיפוכים.' },
        show: { text: { en: 'bass → inversion · job → numeral', he: 'בס → היפוך · תפקיד → ספרה' } },
      },
    ],
  },
];

/** The topics these lessons open (units.ts spreads this after every other file, so it wins over the stop-gaps). */
export const UNITS: Record<string, string> = {
  'topic:compound-intervals': 'beyond-octave',
  'topic:blues-ear': 'blues-ear',
  'topic:voicing-type': 'voicing-type',
  'topic:chart-analysis': 'chart-analysis',
  'topic:jazz-chains': 'jazz-chains',
  'topic:chorale-rn': 'chorale-rn',
  // The technique levels that first use the shared theory open with its short lesson (the path lesson itself comes first).
  'tech:arpeggios-4': 'sevenths',
  'tech:arpeggios-5': 'sevenths',
  'tech:voicings-2': 'sevenths',
  'tech:g-chords-3': 'sevenths',
  'tech:b-chord-6': 'sevenths',
  'tech:cadences': 'chord-numbers',
  'tech:k-ear-7': 'chord-numbers',
  'tech:g-ear-6': 'chord-numbers',
  'tech:b-ear-3': 'chord-numbers',
  'tech:scales-19': 'mode-colours',
  'tech:g-scales-14': 'mode-colours',
  'tech:b-scale-4': 'mode-colours',
};

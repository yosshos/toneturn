// The course opener (~50 s, six scenes) and the unit opener (~18 s, three scenes): docs/openers-prototype.html, owner
// 2026-11-18 ("הדוגמה לפתיח מהממת"). This file is the copy and the sounds, per course and per unit theme; the film
// itself is src/ui/Opener.tsx. Rules: few words a line, Hebrew first, a mature tone, no emoji, only theory that is
// certainly true. Stations are the course's real path structure (unit themes for Ear, technique / vocal families
// and jazz topics for the others) — tests/openers.test.ts checks every reference exists.
//
// Seen flags live in Settings.openers (synced with the rest of the settings): an opener never shows twice on its own.
import type { CourseId } from '../engine/courses';
import type { PercKind, NoteEvent } from '../engine/lesson';
import type { Section } from '../engine/path';
import type { SelfReport } from '../engine/courseStart';
import type { GlyphKind } from '../ui/Glyph';

export type T2 = { he: string; en: string };

// ---------------------------------------------------------------- sounds (played by the app's piano / kit engine)

/** A note: midi, start (s), duration (s), velocity (0..1). */
export type Ev = [number, number, number, number?];
/** A drum hit: kind, start (s), velocity. */
export type Hit = [PercKind, number, number?];
/** A short sound: notes on the piano (or hummed: a sung answer), hits on the kit. */
export interface Snd {
  n?: Ev[];
  p?: Hit[];
  hum?: boolean;
  bass?: boolean;
}

/** A chord, lightly rolled. */
export const ch = (ms: number[], t = 0, d = 0.8, v = 0.55, roll = 0.012): Ev[] => ms.map((m, i) => [m, t + i * roll, d, v * (i === 0 ? 0.9 : 0.75)]);
/** A line of notes, `step` seconds apart. */
export const line = (ms: number[], step = 0.3, d = 0.3, v = 0.62, t0 = 0): Ev[] => ms.map((m, i) => [m, t0 + i * step, d, v]);
const hits = (pattern: [PercKind, number][], step: number, v = 0.85): Hit[] => pattern.map(([k, i]) => [k, i * step, v]);
const snd = (...parts: (Ev[] | Snd)[]): Snd => {
  const out: Snd = { n: [] };
  for (const p of parts) {
    if (Array.isArray(p)) out.n!.push(...p);
    else {
      if (p.n) out.n!.push(...p.n);
      if (p.p) out.p = [...(out.p ?? []), ...p.p];
      if (p.hum) out.hum = true;
      if (p.bass) out.bass = true;
    }
  }
  return out;
};

/** The events and length of a sound, for PianoEngine.play. */
export function sndEvents(s: Snd): { events: NoteEvent[]; length: number } {
  const events: NoteEvent[] = [];
  for (const [midi, start, duration, velocity] of s.n ?? []) events.push({ midi, start, duration, velocity: velocity ?? 0.6, ...(s.hum ? { inst: 'hum' as const } : s.bass ? { inst: 'bass' as const } : {}) });
  for (const [perc, start, velocity] of s.p ?? []) events.push({ midi: 60, start, duration: 0.2, velocity: velocity ?? 0.85, perc });
  const length = events.reduce((a, e) => Math.max(a, e.start + e.duration), 0) + 0.4;
  return { events, length };
}

// ---------------------------------------------------------------- the course opener

export interface Station {
  /** What on the real path it stands for: an Ear unit theme, a technique / vocal family, or a topic. */
  ref: { theme?: string; family?: string; topic?: string };
  /** The symbol (else the family's / topic's own path symbol). */
  glyph?: GlyphKind;
  name: T2;
  desc: T2;
  say: T2;
  snd: Snd;
}

export interface HookCard {
  label: T2;
  badge?: string;
  snd: Snd;
}

export interface HowDemo {
  title: T2;
  lead: T2;
  /** 'choice': two answers, one lights as each sound plays; 'play': the notes / hits you play light up as you play them. */
  kind: 'choice' | 'play';
  prompt: T2;
  opts?: [T2, T2];
  /** Choice: the right option (0 / 1). */
  answer?: number;
  /** Choice: the small "say …" line under each option. */
  sayOpt?: [T2, T2];
  /** Play: the chips that light up in turn. */
  chips?: T2[];
  /** The demo, in order: which option / chip lights (null = none), the sound, how long it lasts (ms). */
  steps: { light: number | null; snd: Snd; ms: number }[];
  /** What the player said / played, shown before the feedback (choice). */
  said?: T2;
  fb: T2;
  says: [T2, T2, T2];
}

export interface CourseOpenerDef {
  hook: { eyebrow: T2; ask: T2; promise: T2; lead: T2; cards: HookCard[]; say1: T2; say2: T2 };
  road: { title: T2; lead: T2; say: T2; then: T2; thenSay: T2; stations: Station[] };
  how: HowDemo;
  /** One short line under each rung of the course's ladder (courseStart.ts LADDER). */
  rungs: [T2, T2, T2, T2];
}

const EAR_THEME_GLYPH: Record<string, GlyphKind> = { home: 'tune', steps: 'intervals', colour: 'features', pulse: 'pulse', chords: 'chords', memory: 'memory', harmony: 'prog', groove: 'groove', read: 'sight', sound: 'eq' };
export const themeGlyph = (theme: string | undefined): GlyphKind => EAR_THEME_GLYPH[theme ?? ''] ?? 'ear';

// Shared demo sounds
const C4 = 60;
const NOTE_HIGHER: HowDemo = {
  title: { he: 'מקשיבים. עונים. יודעים.', en: 'Listen. Answer. Know.' },
  lead: { he: 'תשובה בקול או בלחיצה. בלי להקליד.', en: 'Answer out loud or with a tap. No typing.' },
  kind: 'choice',
  prompt: { he: 'איזה צליל גבוה יותר?', en: 'Which note is higher?' },
  opts: [{ he: 'הראשון', en: 'First' }, { he: 'השני', en: 'Second' }],
  sayOpt: [{ he: 'אמרו ״ראשון״', en: 'say “first”' }, { he: 'אמרו ״שני״', en: 'say “second”' }],
  answer: 1,
  steps: [
    { light: 0, snd: { n: line([C4], 0.3, 0.6, 0.75) }, ms: 700 },
    { light: 1, snd: { n: line([67], 0.3, 0.7, 0.75) }, ms: 800 },
  ],
  said: { he: '״השני״', en: '“Second”' },
  fb: { he: 'נכון. קפיצה של קווינטה למעלה.', en: 'Right. It leapt up a fifth.' },
  says: [{ he: 'מקשיבים,', en: 'You listen,' }, { he: 'עונים בקול או בלחיצה,', en: 'answer out loud or with a tap,' }, { he: 'ומיד יודעים אם צדקתם.', en: 'and know right away if you were right.' }],
};
const PLAY_SAYS = (what: T2): [T2, T2, T2] => [{ he: 'מקשיבים,', en: 'You listen,' }, what, { he: 'והאפליקציה שומעת אם זה נקי ובזמן.', en: 'and the app hears if it was clean and in time.' }];

export const COURSE_OPENERS: Record<CourseId, CourseOpenerDef> = {
  ear: {
    hook: {
      eyebrow: { he: 'קורס שמיעה ותיאוריה', en: 'Ear & theory course' },
      ask: { he: 'מה מוזיקאי שומע?', en: 'What does a musician hear?' },
      promise: { he: 'בסוף הקורס, גם אתם.', en: 'By the end of this course, so will you.' },
      lead: { he: 'אקורדים, כיוון המנגינה, והבית. הכול מהאוזן.', en: 'The chords, where the tune goes, and home. All by ear.' },
      cards: [
        { label: { he: 'C', en: 'C' }, badge: '1', snd: { n: ch([48, 60, 64, 67, 72]) } },
        { label: { he: 'G', en: 'G' }, badge: '5', snd: { n: ch([43, 59, 62, 67, 71]) } },
        { label: { he: 'Am', en: 'Am' }, badge: '6', snd: { n: ch([45, 60, 64, 69, 72]) } },
        { label: { he: 'F', en: 'F' }, badge: '4', snd: { n: ch([41, 60, 65, 69, 72]) } },
      ],
      say1: { he: 'מוזיקאי שומע שיר, ויודע מה קורה בו: אילו אקורדים, לאן המנגינה הולכת, ואיפה הבית.', en: 'A musician hears a song and knows what is going on: which chords, where the tune goes, and where home is.' },
      say2: { he: 'בקורס הזה, גם אתם תשמעו את זה.', en: 'In this course, you will learn to hear it too.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'כל יחידה מוסיפה שכבה למה שהאוזן כבר יודעת.', en: 'Each unit adds a layer to what your ear already knows.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: זיכרון, הרמוניה, גרוב, קריאה, ועד הרמוניה של ג׳אז', en: 'Then memory, harmony, groove, reading, and on to jazz harmony' },
      thenSay: { he: 'ומשם, עד ההרמוניה של ג׳אז.', en: 'And from there, all the way to jazz harmony.' },
      stations: [
        { ref: { theme: 'home' }, glyph: 'tune', name: { he: 'בית ויציאה', en: 'Home & away' }, desc: { he: 'הצליל שכל מנגינה חוזרת אליו', en: 'The note every tune comes back to' }, say: { he: 'מתחילים בבית, הצליל שכל מנגינה חוזרת אליו.', en: 'You start at home: the note every tune comes back to.' }, snd: snd(line([67, 65, 64, 62], 0.17, 0.2), [[60, 0.68, 0.9, 0.7]], ch([48, 55, 64], 0.68, 0.9, 0.3)) },
        { ref: { theme: 'steps' }, glyph: 'intervals', name: { he: 'צעדים וקפיצות', en: 'Steps & leaps' }, desc: { he: 'המרחק בין שני צלילים', en: 'The distance between two notes' }, say: { he: 'צעדים וקפיצות.', en: 'Steps and leaps.' }, snd: snd([[60, 0, 0.35, 0.6], [62, 0.3, 0.35, 0.6], [67, 0.62, 0.6, 0.7]]) },
        { ref: { theme: 'colour' }, glyph: 'features', name: { he: 'בהיר וכהה', en: 'Bright & dark' }, desc: { he: 'מז׳ור ומינור', en: 'Major and minor' }, say: { he: 'אקורדים בהירים וכהים.', en: 'Bright chords and dark ones.' }, snd: snd(ch([48, 60, 64, 67], 0, 0.55, 0.5), ch([48, 60, 63, 67], 0.62, 0.7, 0.5)) },
        { ref: { theme: 'pulse' }, glyph: 'pulse', name: { he: 'דופק ומשקל', en: 'Pulse & meter' }, desc: { he: 'להרגיש את הפעמה', en: 'Feel the beat' }, say: { he: 'דופק ומשקל.', en: 'Pulse and meter.' }, snd: { p: hits([['kick', 0], ['hat', 1], ['snare', 2], ['hat', 3], ['kick', 4], ['kick', 5], ['snare', 6], ['hat', 7]], 0.2) } },
        { ref: { theme: 'chords' }, glyph: 'chords', name: { he: 'לבנות אקורדים', en: 'Building chords' }, desc: { he: 'מה יש בתוך אקורד', en: 'What is inside a chord' }, say: { he: 'ואז, מה יש בתוך אקורד.', en: 'Then, what is inside a chord.' }, snd: snd(line([48, 52, 55, 58], 0.18, 0.5, 0.5), ch([48, 52, 55, 58], 0.75, 0.8, 0.45)) },
      ],
    },
    how: NOTE_HIGHER,
    rungs: [
      { he: 'גבוה ונמוך, הבית, דופק', en: 'High and low, home, pulse' },
      { he: 'מרווחים, מז׳ור ומינור', en: 'Intervals, major and minor' },
      { he: 'מהלכים, הכתבה, אקורדי ספט', en: 'Progressions, dictation, sevenths' },
      { he: 'ii–V–I, מודולציות, שמיעה פנימית', en: 'ii–V–I, modulation, inner hearing' },
    ],
  },
  keys: {
    hook: {
      eyebrow: { he: 'קורס פסנתר וקלידים', en: 'Piano & keys course' },
      ask: { he: 'מה הידיים של פסנתרן יודעות?', en: 'What do a pianist’s hands know?' },
      promise: { he: 'בסוף הקורס, גם שלכם.', en: 'By the end of this course, so will yours.' },
      lead: { he: 'בלוז ג׳אז, מהאוזן ומהיד, עם להקה.', en: 'A jazz blues, by ear and by hand, with a band.' },
      cards: [
        { label: { he: 'F7', en: 'F7' }, badge: 'I', snd: { n: ch([41, 57, 63]) } },
        { label: { he: 'B♭7', en: 'B♭7' }, badge: 'IV', snd: { n: ch([46, 56, 62]) } },
        { label: { he: 'F7', en: 'F7' }, badge: 'I', snd: { n: ch([41, 57, 63]) } },
        { label: { he: 'C7', en: 'C7' }, badge: 'V', snd: { n: ch([48, 58, 64]) } },
      ],
      say1: { he: 'פסנתרן מנגן בלוז עם להקה, ושלושה צלילים ביד שמאל מספיקים לו.', en: 'A pianist plays a blues with the band, and three notes in the left hand are enough.' },
      say2: { he: 'בקורס הזה, גם אתם תנגנו את זה.', en: 'In this course, you will play it too.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'כל יחידה: טכניקה, אוזן וקריאה, קצת מכל אחד.', en: 'Every unit: technique, ear and reading, a little of each.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: בלוז, סטנדרטים ופסנתר ג׳אז', en: 'Then the blues, standards and jazz piano' },
      thenSay: { he: 'ומשם, לבלוז ולסטנדרטים.', en: 'And from there, the blues and the standards.' },
      stations: [
        { ref: { family: 'k-first' }, name: { he: 'צעדים ראשונים', en: 'First steps' }, desc: { he: 'ישיבה, אצבעות, חמש אצבעות בדו', en: 'Posture and five fingers in C' }, say: { he: 'מתחילים בצעדים ראשונים ליד הפסנתר.', en: 'You start with first steps at the piano.' }, snd: { n: line([60, 62, 64, 65, 67], 0.16, 0.25) } },
        { ref: { family: 'fingers' }, name: { he: 'עצמאות אצבעות', en: 'Finger independence' }, desc: { he: 'כל אצבע לבד', en: 'Every finger on its own' }, say: { he: 'עצמאות אצבעות.', en: 'Finger independence.' }, snd: { n: line([60, 64, 62, 65, 64, 67], 0.13, 0.2) } },
        { ref: { family: 'k-ear' }, name: { he: 'אוזן של פסנתרן', en: 'Pianist’s ear' }, desc: { he: 'לשמוע ולנגן בחזרה', en: 'Hear it, play it back' }, say: { he: 'אוזן של פסנתרן.', en: 'A pianist’s ear.' }, snd: { n: line([67, 64, 60], 0.3, 0.4) } },
        { ref: { family: 'k-lh' }, name: { he: 'יד שמאל', en: 'The left hand' }, desc: { he: 'בס וצלילי שלד', en: 'Bass notes and shells' }, say: { he: 'יד שמאל: בס וקולות שלד.', en: 'The left hand: bass and shells.' }, snd: snd(line([41], 0.3, 0.8, 0.6), ch([45, 51], 0.4, 0.8, 0.5)) },
        { ref: { family: 'scales' }, name: { he: 'סולמות וארפג׳ים', en: 'Scales & arpeggios' }, desc: { he: 'בכל שנים־עשר הסולמות', en: 'In all twelve keys' }, say: { he: 'וסולמות, בכל שנים־עשר הסולמות.', en: 'And scales, in all twelve keys.' }, snd: { n: line([60, 62, 64, 65, 67, 69, 71, 72], 0.1, 0.18) } },
      ],
    },
    how: {
      title: { he: 'מקשיבים. מנגנים. יודעים.', en: 'Listen. Play. Know.' },
      lead: { he: 'מקלדת MIDI או המיקרופון שומעים כל צליל.', en: 'A MIDI keyboard or the microphone hears every note.' },
      kind: 'play',
      prompt: { he: 'נגנו דו, מי, סול', en: 'Play C, E, G' },
      chips: [{ he: 'דו', en: 'C' }, { he: 'מי', en: 'E' }, { he: 'סול', en: 'G' }],
      steps: [
        { light: 0, snd: { n: line([60], 0.3, 0.5) }, ms: 450 },
        { light: 1, snd: { n: line([64], 0.3, 0.5) }, ms: 450 },
        { light: 2, snd: { n: line([67], 0.3, 0.7) }, ms: 650 },
      ],
      fb: { he: 'נקי ובזמן. שלושה מתוך שלושה.', en: 'Clean and in time. Three of three.' },
      says: PLAY_SAYS({ he: 'מנגנים על הפסנתר,', en: 'play it on the piano,' }),
    },
    rungs: [
      { he: 'ידיים, אצבעות, קריאה', en: 'Hands, fingers, reading' },
      { he: 'קולות שלד ובלוז', en: 'Shells and the blues' },
      { he: 'סטנדרטים עם להקה', en: 'Standards with a band' },
      { he: 'ריהרמוניזציה ובארי האריס', en: 'Reharmonisation, Barry Harris' },
    ],
  },
  guitar: {
    hook: {
      eyebrow: { he: 'קורס גיטרה', en: 'Guitar course' },
      ask: { he: 'מה גיטריסט עושה בלהקה?', en: 'What does a guitarist do in a band?' },
      promise: { he: 'בסוף הקורס, גם אתם.', en: 'By the end of this course, so will you.' },
      lead: { he: 'אקורדים בזמן, ריפים, ואז ליווי ג׳אז.', en: 'Chords in time, riffs, then jazz comping.' },
      cards: [
        { label: { he: 'A', en: 'A' }, badge: 'I', snd: { n: ch([45, 52, 57, 61, 64], 0, 0.8, 0.55, 0.02) } },
        { label: { he: 'D', en: 'D' }, badge: 'IV', snd: { n: ch([50, 57, 62, 66], 0, 0.8, 0.55, 0.02) } },
        { label: { he: 'E', en: 'E' }, badge: 'V', snd: { n: ch([40, 47, 52, 56, 59, 64], 0, 0.8, 0.55, 0.02) } },
        { label: { he: 'A', en: 'A' }, badge: 'I', snd: { n: ch([45, 52, 57, 61, 64], 0, 0.8, 0.55, 0.02) } },
      ],
      say1: { he: 'גיטריסט מחזיק את הלהקה: אקורד נכון, בדיוק בזמן.', en: 'A guitarist holds the band together: the right chord, right on time.' },
      say2: { he: 'בקורס הזה, גם אתם תנגנו ככה.', en: 'In this course, you will play like that too.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'כל יחידה: טכניקה, צוואר הגיטרה והאוזן.', en: 'Every unit: technique, the neck and your ear.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: בלוז, ליווי ג׳אז ואלתור', en: 'Then the blues, jazz comping and improvising' },
      thenSay: { he: 'ומשם, עד ליווי ג׳אז.', en: 'And from there, all the way to jazz comping.' },
      stations: [
        { ref: { family: 'g-first' }, name: { he: 'צעדים ראשונים', en: 'First steps' }, desc: { he: 'כיוון, אחיזה, מיתרים פתוחים', en: 'Tuning, holding, open strings' }, say: { he: 'מתחילים בצעדים ראשונים.', en: 'You start with first steps.' }, snd: { n: line([40, 45, 50, 55, 59, 64], 0.14, 0.5, 0.5) } },
        { ref: { family: 'g-chords' }, name: { he: 'אקורדים והחלפות', en: 'Chords & changes' }, desc: { he: 'אקורדים פתוחים, החלפות בזמן', en: 'Open chords, changes in time' }, say: { he: 'אקורדים והחלפות.', en: 'Chords and changes.' }, snd: snd(ch([45, 52, 57, 61, 64], 0, 0.5, 0.5, 0.02), ch([50, 57, 62, 66], 0.55, 0.7, 0.5, 0.02)) },
        { ref: { family: 'g-rhythm' }, name: { he: 'גיטרה קצבית', en: 'Rhythm guitar' }, desc: { he: 'פריטה למטה ולמעלה', en: 'Down and up strums' }, say: { he: 'גיטרה קצבית.', en: 'Rhythm guitar.' }, snd: snd(ch([45, 52, 57, 61, 64], 0, 0.2, 0.5, 0.01), ch([57, 61, 64], 0.25, 0.15, 0.35, 0.01), ch([45, 52, 57, 61, 64], 0.5, 0.2, 0.5, 0.01), ch([57, 61, 64], 0.75, 0.3, 0.35, 0.01)) },
        { ref: { family: 'g-riff' }, name: { he: 'ריפים', en: 'Riffs' }, desc: { he: 'צלילים בודדים ואקורדי פאוור', en: 'Single notes and power chords' }, say: { he: 'ריפים.', en: 'Riffs.' }, snd: { n: line([40, 40, 43, 45, 40, 47, 45], 0.14, 0.14, 0.6) } },
        { ref: { family: 'g-scales' }, name: { he: 'סולמות על הצוואר', en: 'Scales on the neck' }, desc: { he: 'פנטטוני ועוד', en: 'Pentatonic and more' }, say: { he: 'וסולמות על הצוואר.', en: 'And scales on the neck.' }, snd: { n: line([45, 48, 50, 52, 55, 57], 0.13, 0.2) } },
      ],
    },
    how: {
      title: { he: 'מקשיבים. מנגנים. יודעים.', en: 'Listen. Play. Know.' },
      lead: { he: 'המיקרופון שומע את הגיטרה, בלי כבלים.', en: 'The microphone hears your guitar. No cables.' },
      kind: 'play',
      prompt: { he: 'פרטו לה, ואז רה', en: 'Strum A, then D' },
      chips: [{ he: 'A', en: 'A' }, { he: 'D', en: 'D' }],
      steps: [
        { light: 0, snd: { n: ch([45, 52, 57, 61, 64], 0, 0.7, 0.55, 0.02) }, ms: 700 },
        { light: 1, snd: { n: ch([50, 57, 62, 66], 0, 0.8, 0.55, 0.02) }, ms: 800 },
      ],
      fb: { he: 'בזמן עם הלהקה.', en: 'In time with the band.' },
      says: PLAY_SAYS({ he: 'מנגנים על הגיטרה,', en: 'play it on the guitar,' }),
    },
    rungs: [
      { he: 'אקורדים פתוחים ופריטה', en: 'Open chords and strumming' },
      { he: 'ריפים, פאוור ובלוז', en: 'Riffs, power chords, blues' },
      { he: 'דרופ 2 ו־ii–V–I', en: 'Drop-2 and ii–V–I' },
      { he: 'אלתור והרמוניה מתקדמת', en: 'Improvising, advanced harmony' },
    ],
  },
  bass: {
    hook: {
      eyebrow: { he: 'קורס בס', en: 'Bass course' },
      ask: { he: 'מה הבסיסט מחזיק?', en: 'What does the bassist hold?' },
      promise: { he: 'את הזמן ואת ההרמוניה. בסוף הקורס, גם אתם.', en: 'The time and the harmony. By the end, so will you.' },
      lead: { he: 'נעולים עם המתופף, ואז ווקינג על בלוז.', en: 'Locked with the drummer, then walking a blues.' },
      cards: [
        { label: { he: 'C', en: 'C' }, badge: '1', snd: { n: [[36, 0, 0.5, 0.75]], p: [['kick', 0, 0.8]], bass: true } },
        { label: { he: 'F', en: 'F' }, badge: '4', snd: { n: [[41, 0, 0.5, 0.75]], p: [['kick', 0, 0.8]], bass: true } },
        { label: { he: 'G', en: 'G' }, badge: '5', snd: { n: [[43, 0, 0.5, 0.75]], p: [['kick', 0, 0.8]], bass: true } },
        { label: { he: 'C', en: 'C' }, badge: '1', snd: { n: [[36, 0, 0.8, 0.75]], p: [['kick', 0, 0.8]], bass: true } },
      ],
      say1: { he: 'הבסיסט מחבר בין התופים להרמוניה: צליל אחד, בדיוק עם הבס־דראם.', en: 'The bassist joins the drums to the harmony: one note, right with the kick.' },
      say2: { he: 'בקורס הזה, גם אתם תחזיקו את הלהקה.', en: 'In this course, you will hold the band too.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'כל יחידה: זמן, צוואר הבס והאוזן.', en: 'Every unit: time, the neck and your ear.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: גרובים, בלוז, ווקינג וסטנדרטים', en: 'Then grooves, the blues, walking and standards' },
      thenSay: { he: 'ומשם, עד ווקינג על סטנדרטים.', en: 'And from there, all the way to walking the standards.' },
      stations: [
        { ref: { family: 'b-first' }, name: { he: 'צעדים ראשונים', en: 'First steps' }, desc: { he: 'אחיזה, כיוון, פריטה', en: 'Holding, tuning, plucking' }, say: { he: 'מתחילים בצעדים ראשונים.', en: 'You start with first steps.' }, snd: { n: line([28, 33, 38, 43], 0.25, 0.5, 0.7), bass: true } },
        { ref: { family: 'b-time' }, name: { he: 'זמן וחלוקות', en: 'Time & subdivision' }, desc: { he: 'דופק יציב עם הקליק', en: 'A steady pulse with the click' }, say: { he: 'זמן וחלוקות.', en: 'Time and subdivision.' }, snd: { n: line([36, 36, 36, 36], 0.3, 0.25, 0.7), p: hits([['click', 0], ['click', 1], ['click', 2], ['click', 3]], 0.3, 0.6), bass: true } },
        { ref: { family: 'b-chord' }, name: { he: 'שורש וקווינטה', en: 'Root and fifth' }, desc: { he: 'צלילי האקורד', en: 'The chord tones' }, say: { he: 'שורש, קווינטה וצלילי אקורד.', en: 'Root, fifth and chord tones.' }, snd: { n: line([36, 43, 41, 48], 0.3, 0.3, 0.7), bass: true } },
        { ref: { family: 'b-pocket' }, name: { he: 'הכיס', en: 'The pocket' }, desc: { he: 'נעולים עם התופים', en: 'Locked with the drums' }, say: { he: 'הכיס: נעולים עם התופים.', en: 'The pocket: locked with the drums.' }, snd: { n: [[36, 0, 0.25, 0.75], [36, 0.6, 0.25, 0.7], [43, 0.9, 0.25, 0.7]], p: hits([['kick', 0], ['snare', 1], ['kick', 2], ['kick', 3], ['snare', 4]], 0.3), bass: true } },
        { ref: { family: 'b-walk' }, name: { he: 'ווקינג', en: 'Walking' }, desc: { he: 'צליל בכל פעמה, על בלוז', en: 'A note a beat, over a blues' }, say: { he: 'ווקינג, צליל בכל פעמה.', en: 'Walking: a note on every beat.' }, snd: { n: line([36, 40, 43, 45, 46, 45], 0.22, 0.24, 0.7), p: hits([['ride', 0], ['ride', 2], ['ride', 4]], 0.22, 0.5), bass: true } },
      ],
    },
    how: {
      title: { he: 'מקשיבים. מנגנים. יודעים.', en: 'Listen. Play. Know.' },
      lead: { he: 'המיקרופון שומע כל צליל, ומודד את הזמן.', en: 'The microphone hears every note and measures your time.' },
      kind: 'play',
      prompt: { he: 'שורש וקווינטה: דו וסול', en: 'Root and fifth: C and G' },
      chips: [{ he: 'דו', en: 'C' }, { he: 'סול', en: 'G' }],
      steps: [
        { light: 0, snd: { n: [[36, 0, 0.45, 0.75]], p: [['kick', 0]], bass: true }, ms: 600 },
        { light: 1, snd: { n: [[43, 0, 0.6, 0.75]], p: [['snare', 0]], bass: true }, ms: 700 },
      ],
      fb: { he: 'בדיוק עם הבס־דראם.', en: 'Right with the kick.' },
      says: PLAY_SAYS({ he: 'מנגנים על הבס,', en: 'play it on the bass,' }),
    },
    rungs: [
      { he: 'שורשים, זמן, כיס', en: 'Roots, time, pocket' },
      { he: 'גרובים ובלוז', en: 'Grooves and the blues' },
      { he: 'ווקינג על מהלכים', en: 'Walking through changes' },
      { he: 'סולו, מילויים, סטנדרטים', en: 'Solos, fills, standards' },
    ],
  },
  drums: {
    hook: {
      eyebrow: { he: 'קורס תופים', en: 'Drums course' },
      ask: { he: 'מה מחזיק להקה ביחד?', en: 'What holds a band together?' },
      promise: { he: 'הגרוב. בסוף הקורס, הוא אצלכם.', en: 'The groove. By the end, it is in your hands.' },
      lead: { he: 'גרוב יציב, ואז מילויים, תחושות ומשקלים.', en: 'A steady groove, then fills, feels and meters.' },
      cards: [
        { label: { he: 'בס־דראם', en: 'Kick' }, snd: { p: [['kick', 0, 0.9]] } },
        { label: { he: 'סנר', en: 'Snare' }, snd: { p: [['snare', 0, 0.9]] } },
        { label: { he: 'היי־האט', en: 'Hi-hat' }, snd: { p: [['hat', 0, 0.8], ['hat', 0.2, 0.6]] } },
        { label: { he: 'גרוב', en: 'Groove' }, snd: { p: hits([['kick', 0], ['hat', 0], ['hat', 1], ['snare', 2], ['hat', 2], ['hat', 3]], 0.2) } },
      ],
      say1: { he: 'בס־דראם, סנר והיי־האט. ביחד, הם הגרוב שכל הלהקה נשענת עליו.', en: 'Kick, snare and hi-hat. Together they are the groove the whole band leans on.' },
      say2: { he: 'בקורס הזה, הגרוב יהיה אצלכם.', en: 'In this course, the groove will be yours.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'נמדד על תופים אלקטרוניים ב־MIDI.', en: 'Measured on an e-kit by MIDI.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: מילויים, שאפל, פאנק ומשקלים אי־זוגיים', en: 'Then fills, shuffle, funk and odd meters' },
      thenSay: { he: 'ומשם, עד משקלים אי־זוגיים.', en: 'And from there, all the way to odd meters.' },
      stations: [
        { ref: { family: 'd-first' }, name: { he: 'צעדים ראשונים', en: 'First steps' }, desc: { he: 'אחיזה ומכות שוות', en: 'Grip and even strokes' }, say: { he: 'מתחילים בצעדים ראשונים.', en: 'You start with first steps.' }, snd: { p: hits([['snare-soft', 0], ['snare-soft', 1], ['snare-soft', 2], ['snare-soft', 3]], 0.25, 0.6) } },
        { ref: { family: 'd-time' }, name: { he: 'זמן וחלוקה', en: 'Time & subdivision' }, desc: { he: 'רבעים, שמיניות, עם הקליק', en: 'Quarters and eighths with the click' }, say: { he: 'זמן וחלוקה.', en: 'Time and subdivision.' }, snd: { p: hits([['click', 0], ['snare-soft', 0], ['snare-soft', 1], ['click', 2], ['snare-soft', 2], ['snare-soft', 3]], 0.2, 0.6) } },
        { ref: { family: 'd-rock' }, name: { he: 'גרובים של רוק ופופ', en: 'Rock & pop grooves' }, desc: { he: 'הקצב הבסיסי, ואז וריאציות', en: 'The basic beat, then variations' }, say: { he: 'גרובים של רוק ופופ.', en: 'Rock and pop grooves.' }, snd: { p: hits([['kick', 0], ['hat', 0], ['hat', 1], ['snare', 2], ['hat', 2], ['hat', 3], ['kick', 4], ['hat', 4], ['kick', 5], ['hat', 5], ['snare', 6], ['hat', 6], ['hat', 7]], 0.18) } },
        { ref: { family: 'd-strokes' }, name: { he: 'מכות ודינמיקה', en: 'Strokes & dynamics' }, desc: { he: 'חלש, בינוני, חזק', en: 'Soft, medium, loud' }, say: { he: 'מכות ודינמיקה.', en: 'Strokes and dynamics.' }, snd: { p: [['snare', 0, 0.3], ['snare', 0.25, 0.3], ['snare', 0.5, 0.6], ['snare', 0.75, 0.6], ['snare', 1, 1], ['snare', 1.25, 1]] } },
        { ref: { family: 'd-ear' }, name: { he: 'שמיעה למתופפים', en: 'Drummer’s ear' }, desc: { he: 'לשמוע מקצב ולנגן בחזרה', en: 'Hear a rhythm, play it back' }, say: { he: 'ושמיעה של מתופף.', en: 'And a drummer’s ear.' }, snd: { p: [['snare', 0], ['snare', 0.2], ['snare', 0.6], ['snare', 0.8], ['snare', 1.0]] } },
      ],
    },
    how: {
      title: { he: 'מקשיבים. מנגנים. יודעים.', en: 'Listen. Play. Know.' },
      lead: { he: 'תופים אלקטרוניים ב־MIDI: כל מכה נמדדת.', en: 'An e-kit by MIDI: every hit is measured.' },
      kind: 'play',
      prompt: { he: 'בס־דראם, סנר, בס־דראם, סנר', en: 'Kick, snare, kick, snare' },
      chips: [{ he: 'בס־דראם', en: 'Kick' }, { he: 'סנר', en: 'Snare' }, { he: 'בס־דראם', en: 'Kick' }, { he: 'סנר', en: 'Snare' }],
      steps: [
        { light: 0, snd: { p: [['kick', 0]] }, ms: 380 },
        { light: 1, snd: { p: [['snare', 0]] }, ms: 380 },
        { light: 2, snd: { p: [['kick', 0]] }, ms: 380 },
        { light: 3, snd: { p: [['snare', 0]] }, ms: 500 },
      ],
      fb: { he: 'בדיוק על הפעמה.', en: 'Right on the beat.' },
      says: PLAY_SAYS({ he: 'מנגנים על התופים,', en: 'play it on the kit,' }),
    },
    rungs: [
      { he: 'אחיזה, זמן, הקצב הבסיסי', en: 'Grip, time, the basic beat' },
      { he: 'מילויים, שאפל, פאנק', en: 'Fills, shuffle, funk' },
      { he: 'משקלים אי־זוגיים', en: 'Odd meters' },
      { he: 'ג׳אז, פולי־ריתם, סולו', en: 'Jazz, polyrhythm, solos' },
    ],
  },
  voice: {
    hook: {
      eyebrow: { he: 'קורס שירה', en: 'Singing course' },
      ask: { he: 'מה זמר שומע לפני שהוא שר?', en: 'What does a singer hear before singing?' },
      promise: { he: 'את הצליל הבא. בסוף הקורס, גם אתם.', en: 'The next note. By the end, so will you.' },
      lead: { he: 'לשיר מדויק, עם להקה, משירים ועד סקאט.', en: 'Sing in tune with a band, from songs to scat.' },
      cards: [
        { label: { he: 'דו', en: 'Do' }, badge: '1', snd: { n: [[60, 0, 0.6, 0.6]] } },
        { label: { he: 'מי', en: 'Mi' }, badge: '3', snd: { n: [[64, 0, 0.6, 0.6]] } },
        { label: { he: 'סול', en: 'Sol' }, badge: '5', snd: { n: [[67, 0, 0.6, 0.6]] } },
        { label: { he: 'דו', en: 'Do' }, badge: '8', snd: { n: [[72, 0, 0.6, 0.6]] } },
      ],
      say1: { he: 'זמר שומע את הצליל בראש, ורק אז שר אותו.', en: 'A singer hears the note in their head, and only then sings it.' },
      say2: { he: 'בקורס הזה, גם אתם תשמעו ככה.', en: 'In this course, you will hear like that too.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'המיקרופון שומע כל צליל שאתם שרים.', en: 'The microphone hears every note you sing.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: סטנדרטים, הרמוניה, סקאט ואלתור', en: 'Then standards, harmony, scat and improvising' },
      thenSay: { he: 'ומשם, עד סקאט.', en: 'And from there, all the way to scat.' },
      stations: [
        { ref: { family: 'v-first' }, name: { he: 'צעדים ראשונים', en: 'First steps' }, desc: { he: 'צליל אחד, מדויק', en: 'One note, in tune' }, say: { he: 'מתחילים בצליל אחד, מדויק.', en: 'You start with one note, in tune.' }, snd: snd(line([60], 0.3, 0.6, 0.6), { n: [[60, 0.8, 0.8, 0.55]], hum: true }) },
        { ref: { family: 'v-breath' }, name: { he: 'נשימה והחזקה', en: 'Breath & sustain' }, desc: { he: 'צליל ארוך ויציב', en: 'A long, steady note' }, say: { he: 'נשימה והחזקה.', en: 'Breath and sustain.' }, snd: { n: [[64, 0, 1.4, 0.55]], hum: true } },
        { ref: { family: 'v-pitch' }, name: { he: 'גובה ואינטונציה', en: 'Pitch & intonation' }, desc: { he: 'לשמוע ולתקן', en: 'Hear it, correct it' }, say: { he: 'גובה ואינטונציה.', en: 'Pitch and intonation.' }, snd: { n: line([60, 62, 64], 0.35, 0.4, 0.55), hum: true } },
        { ref: { family: 'v-songs' }, name: { he: 'שירים עם להקה', en: 'Songs with the band' }, desc: { he: 'שירים בנחלת הכלל', en: 'Public-domain songs' }, say: { he: 'שירים עם להקה.', en: 'Songs with the band.' }, snd: snd(ch([48, 55, 64], 0, 1.2, 0.35), { n: line([67, 67, 69, 67], 0.25, 0.3, 0.55), hum: true }) },
        { ref: { family: 'v-scat' }, name: { he: 'סקאט ואלתור', en: 'Scat & improvising' }, desc: { he: 'לאלתר בקול', en: 'Improvise with your voice' }, say: { he: 'ובסוף, סקאט.', en: 'And then, scat.' }, snd: { n: [[67, 0, 0.18, 0.55], [70, 0.24, 0.12, 0.5], [69, 0.36, 0.18, 0.55], [67, 0.6, 0.18, 0.5], [64, 0.84, 0.4, 0.55]], hum: true } },
      ],
    },
    how: {
      title: { he: 'מקשיבים. שרים. יודעים.', en: 'Listen. Sing. Know.' },
      lead: { he: 'המיקרופון שומע כל צליל, באוזניות או בלי.', en: 'The microphone hears every note, with or without headphones.' },
      kind: 'play',
      prompt: { he: 'שירו בחזרה: דו, רה, מי', en: 'Sing it back: Do, Re, Mi' },
      chips: [{ he: 'דו', en: 'Do' }, { he: 'רה', en: 'Re' }, { he: 'מי', en: 'Mi' }],
      steps: [
        { light: null, snd: { n: line([60, 62, 64], 0.35, 0.35) }, ms: 1300 },
        { light: 0, snd: { n: [[60, 0, 0.35, 0.55]], hum: true }, ms: 380 },
        { light: 1, snd: { n: [[62, 0, 0.35, 0.55]], hum: true }, ms: 380 },
        { light: 2, snd: { n: [[64, 0, 0.5, 0.55]], hum: true }, ms: 600 },
      ],
      fb: { he: 'מדויק. שלושה מתוך שלושה.', en: 'In tune. Three of three.' },
      says: PLAY_SAYS({ he: 'שרים בחזרה,', en: 'sing it back,' }),
    },
    rungs: [
      { he: 'צליל מדויק, נשימה', en: 'In tune, breath' },
      { he: 'שירים עם להקה', en: 'Songs with a band' },
      { he: 'סטנדרטים והרמוניה', en: 'Standards and harmony' },
      { he: 'סקאט ואלתור', en: 'Scat and improvising' },
    ],
  },
  jazz: {
    hook: {
      eyebrow: { he: 'קורס ג׳אז ואלתור', en: 'Jazz & improv course' },
      ask: { he: 'מה שומע מי שמאלתר?', en: 'What does an improviser hear?' },
      promise: { he: 'את המהלכים. בסוף הקורס, גם אתם.', en: 'The changes. By the end, so will you.' },
      lead: { he: 'סווינג, המהלכים, ואלתור על בלוז וסטנדרטים.', en: 'Swing, the changes, and improvising on blues and standards.' },
      cards: [
        { label: { he: 'Dm7', en: 'Dm7' }, badge: 'ii', snd: { n: ch([50, 65, 69, 72]) } },
        { label: { he: 'G7', en: 'G7' }, badge: 'V', snd: { n: ch([43, 53, 59, 62]) } },
        { label: { he: 'Cmaj7', en: 'Cmaj7' }, badge: 'I', snd: { n: ch([48, 59, 64, 67]) } },
        { label: { he: 'A7', en: 'A7' }, badge: 'VI7', snd: { n: ch([45, 55, 61, 64]) } },
      ],
      say1: { he: 'מי שמאלתר שומע לאן ההרמוניה הולכת, ומנגן לשם.', en: 'An improviser hears where the harmony is going, and plays toward it.' },
      say2: { he: 'בקורס הזה, גם אתם תשמעו את זה.', en: 'In this course, you will learn to hear it too.' },
    },
    road: {
      title: { he: 'חמש תחנות, ואז רחוק יותר', en: 'Five stops, then further' },
      lead: { he: 'כל יחידה: אוזן, קצב ושפה.', en: 'Every unit: ear, time and language.' },
      say: { he: 'הדרך בנויה מתחנות.', en: 'The road is built from stops.' },
      then: { he: 'ומשם: סטנדרטים, ריהרמוניזציה והרמוניה מתקדמת', en: 'Then standards, reharmonisation and advanced harmony' },
      thenSay: { he: 'ומשם, עד הרמוניה מתקדמת.', en: 'And from there, all the way to advanced harmony.' },
      stations: [
        { ref: { topic: 'swing-ratio' }, glyph: 'swingtime', name: { he: 'תחושת סווינג', en: 'Swing feel' }, desc: { he: 'ארוך־קצר, על הרייד', en: 'Long-short, on the ride' }, say: { he: 'מתחילים בתחושת הסווינג.', en: 'You start with the swing feel.' }, snd: { p: [['ride', 0], ['ride', 0.4], ['ride', 0.667], ['ride', 0.8], ['ride', 1.2], ['ride', 1.467]] } },
        { ref: { topic: 'guide-tones' }, glyph: 'guidetone', name: { he: 'צלילים מנחים', en: 'Guide tones' }, desc: { he: 'הטרצות והספטימות', en: 'The thirds and sevenths' }, say: { he: 'צלילים מנחים: הטרצות והספטימות.', en: 'Guide tones: the thirds and sevenths.' }, snd: snd(ch([53, 60], 0, 0.45, 0.5), ch([53, 59], 0.45, 0.45, 0.5), ch([52, 59], 0.9, 0.7, 0.5)) },
        { ref: { topic: 'comping' }, glyph: 'compvoc', name: { he: 'ליווי', en: 'Comping' }, desc: { he: 'מקצבי ליווי של ג׳אז', en: 'Jazz comping rhythms' }, say: { he: 'ליווי.', en: 'Comping.' }, snd: snd(ch([53, 59, 64], 0, 0.2, 0.5), ch([53, 59, 64], 0.53, 0.3, 0.5), { p: [['ride', 0], ['ride', 0.4], ['ride', 0.53], ['ride', 0.8]] }) },
        { ref: { topic: 'call-response' }, glyph: 'echo', name: { he: 'שאלה ותשובה', en: 'Call & response' }, desc: { he: 'משפט, ואז תשובה', en: 'A phrase, then an answer' }, say: { he: 'שאלה ותשובה.', en: 'Call and response.' }, snd: { n: [...line([67, 69, 72], 0.2, 0.25), ...line([72, 69, 67], 0.2, 0.25, 0.6, 0.9)] } },
        { ref: { topic: 'bh-convert' }, glyph: 'sixdim', name: { he: 'בארי האריס', en: 'Barry Harris' }, desc: { he: 'השישית והדימיניש', en: 'The sixth and the diminished' }, say: { he: 'ובארי האריס: השישית והדימיניש.', en: 'And Barry Harris: the sixth and the diminished.' }, snd: snd(ch([48, 60, 64, 67, 69], 0, 0.42, 0.45), ch([47, 59, 62, 65, 68], 0.45, 0.42, 0.45), ch([48, 60, 64, 67, 69], 0.9, 0.7, 0.45)) },
      ],
    },
    how: {
      title: { he: 'מקשיבים. עונים. יודעים.', en: 'Listen. Answer. Know.' },
      lead: { he: 'תשובה בקול או בלחיצה. בלי להקליד.', en: 'Answer out loud or with a tap. No typing.' },
      kind: 'choice',
      prompt: { he: 'סווינג או ישר?', en: 'Swing or straight?' },
      opts: [{ he: 'סווינג', en: 'Swing' }, { he: 'ישר', en: 'Straight' }],
      sayOpt: [{ he: 'אמרו ״סווינג״', en: 'say “swing”' }, { he: 'אמרו ״ישר״', en: 'say “straight”' }],
      answer: 0,
      steps: [{ light: null, snd: { p: [['ride', 0], ['ride', 0.4], ['ride', 0.667], ['ride', 0.8], ['ride', 1.2], ['ride', 1.467], ['ride', 1.6]] }, ms: 1700 }],
      said: { he: '״סווינג״', en: '“Swing”' },
      fb: { he: 'נכון. ארוך־קצר, ארוך־קצר.', en: 'Right. Long-short, long-short.' },
      says: [{ he: 'מקשיבים,', en: 'You listen,' }, { he: 'עונים בקול או בלחיצה,', en: 'answer out loud or with a tap,' }, { he: 'ומיד יודעים אם צדקתם.', en: 'and know right away if you were right.' }],
    },
    rungs: [
      { he: 'סווינג וצלילים מנחים', en: 'Swing and guide tones' },
      { he: 'בלוז וליווי', en: 'The blues and comping' },
      { he: 'סטנדרטים ו־ii–V', en: 'Standards and ii–Vs' },
      { he: 'ריהרמוניזציה וצבע', en: 'Reharmonisation and colour' },
    ],
  },
};

// ---------------------------------------------------------------- shared scenes: the day, where you start, the start

export const DAY = {
  eyebrow: { he: 'הקצב שלכם', en: 'Your pace' },
  title: { he: 'חמש דקות ביום', en: 'Five minutes a day' },
  lead: { he: 'קצר מספיק כדי לא לוותר. ארוך מספיק כדי להשתפר.', en: 'Short enough to keep going. Long enough to get better.' },
  goal: { he: 'היעד היומי', en: 'Daily goal' },
  goalSub: { he: 'שיעור אחד קצר', en: 'One short lesson' },
  streak: { he: 'רצף', en: 'Streak' },
  streakSub: { he: 'יום אחרי יום', en: 'Day after day' },
  league: { he: 'הליגה השבועית', en: 'Weekly league' },
  names: [{ he: 'נועה', en: 'Noa' }, { he: 'איתי', en: 'Itai' }, { he: 'אתם', en: 'You' }, { he: 'מאיה', en: 'Maya' }],
  says: [
    { he: 'חמש דקות ביום מספיקות.', en: 'Five minutes a day is enough.' },
    { he: 'הרצף נבנה מיום ליום,', en: 'Your streak grows day by day,' },
    { he: 'ובליגה השבועית מתחרים עם חברים.', en: 'and in the weekly league you play against friends.' },
  ] as T2[],
};

/** What the player answered on the course-start screen ("Where are you?"). */
export function reportLabel(c: CourseId, r: SelfReport): T2 {
  if (r === 'new') return { he: 'חדשים בזה', en: 'New to this' };
  const listening = c === 'ear' || c === 'jazz';
  const he = listening ? ['יודעים קצת', 'יודעים טוב'] : c === 'voice' ? ['שרים קצת', 'שרים טוב'] : ['מנגנים קצת', 'מנגנים טוב'];
  const en = listening ? ['I know a bit', 'I know it well'] : c === 'voice' ? ['I sing a bit', 'I sing well'] : ['I play a bit', 'I play well'];
  const i = r === 'bit' ? 0 : 1;
  return { he: he[i], en: en[i] };
}

/** The rung the "you are here" pin stands on, from the self-report (the path and the level test place you exactly). */
export const rungOfReport = (r: SelfReport): number => (r === 'new' ? 0 : r === 'bit' ? 1 : 2);

export const START = {
  eyebrow: (c: CourseId, r: SelfReport): T2 => {
    const l = reportLabel(c, r);
    return { he: `בחרתם: ${l.he}`, en: `You chose: ${l.en}` };
  },
  title: { new: { he: 'מתחילים מהבסיס', en: 'You start from the ground up' }, bit: { he: 'מתחילים בטעימה ברמה שלכם', en: 'You start with a taste at your level' }, well: { he: 'טעימה קצרה, ואז בדיקת רמה', en: 'A short taste, then a level test' } } as Record<SelfReport, T2>,
  pin: { new: { he: 'אתם כאן', en: 'You are here' }, bit: { he: 'בערך כאן', en: 'About here' }, well: { he: 'בערך כאן', en: 'About here' } } as Record<SelfReport, T2>,
  skip: { he: 'מה שכבר תדעו, הדרך תדלג עליו לבד', en: 'What you already know, the road skips for you' },
  say: {
    new: { he: 'סיפרתם שאתם חדשים בזה, אז מתחילים מהבסיס.', en: 'You told us you are new to this, so you start from the ground up.' },
    bit: { he: 'סיפרתם שאתם יודעים קצת, אז מתחילים בטעימה ברמה שלכם.', en: 'You told us you know a bit, so you start with a taste at your level.' },
    well: { he: 'סיפרתם שאתם יודעים טוב, אז אחרי טעימה קצרה יש בדיקת רמה.', en: 'You told us you know it well, so a short taste comes first, then a level test.' },
  } as Record<SelfReport, T2>,
  skipSay: { he: 'ומה שכבר תדעו, הדרך תדלג עליו לבד.', en: 'And whatever you already know, the road skips on its own.' },
};

export const GO = {
  eyebrow: { he: 'השיעור הראשון', en: 'Lesson one' },
  start: { he: 'מתחילים', en: 'Start' },
  close: { he: 'חזרה לקורס', en: 'Back to the course' },
  again: { he: 'אפשר לצפות שוב בכל זמן מעמוד הקורס', en: 'Watch again any time from the course page' },
  say: (title: T2): T2 => ({ he: `מוכנים? השיעור הראשון: ${title.he}.`, en: `Ready? Your first lesson: ${title.en}.` }),
  sayReplay: { he: 'נתראה בדרך.', en: 'See you on the road.' },
};

export const FILM = {
  skip: { he: 'דילוג', en: 'Skip' },
  pause: { he: 'השהיה', en: 'Pause' },
  resume: { he: 'המשך', en: 'Resume' },
  back: { he: 'הסצנה הקודמת', en: 'Previous scene' },
  watch: { he: 'צפייה עם קול', en: 'Watch with sound' },
  scene: { he: 'סצנה', en: 'Scene' },
  courseScenes: [
    { he: 'מה תשמעו', en: 'The promise' },
    { he: 'הדרך', en: 'The road' },
    { he: 'איך תרגיל נראה', en: 'How a question works' },
    { he: 'חמש דקות ביום', en: 'Five minutes a day' },
    { he: 'איפה מתחילים', en: 'Where you start' },
    { he: 'מתחילים', en: 'Start' },
  ] as T2[],
  unitScenes: [
    { he: 'מה', en: 'What' },
    { he: 'למה זה חשוב', en: 'Why it matters' },
    { he: 'מה ביחידה', en: 'What’s in the unit' },
  ] as T2[],
  watchIntro: { he: 'צפייה בפתיחה', en: 'Watch the intro' },
  aboutUnit: { he: 'על היחידה', en: 'About this unit' },
};

// ---------------------------------------------------------------- the unit opener

/** A demo pass on the time lanes (music runs left to right in every language): notes by pitch, hits by drum. */
export interface LanePass {
  cap: T2;
  /** One column per event: notes (stacked = a chord) or a drum hit; `t` = its start (s). */
  ev: { m?: number[]; p?: PercKind; t: number; d?: number }[];
  /** How the pass ends: 'home' lights the last dot (and the home band), 'hang' marks it unresolved. */
  end?: 'home' | 'hang';
  /** A chord under the last event. */
  under?: number[];
}

export interface UnitThemeCopy {
  what: T2;
  whatSay: T2;
  why: T2;
  whySay: T2;
  /** Three things it feeds (glyph + one or two words). */
  feeds: [{ g: GlyphKind; t: T2 }, { g: GlyphKind; t: T2 }, { g: GlyphKind; t: T2 }];
  goal: T2;
  goalSay: T2;
  demo: [LanePass, LanePass];
  /** The pitch at the bottom lane (notes), and where the home band sits (a midi), if any. */
  base: number;
  home?: number;
}

const ev = (ms: number[], step = 0.34, d = 0.3): LanePass['ev'] => ms.map((m, i) => ({ m: [m], t: i * step, d }));
const pev = (ps: PercKind[], step = 0.2): LanePass['ev'] => ps.map((p, i) => ({ p, t: i * step }));
const swung = (n: number, beat = 0.4): LanePass['ev'] => Array.from({ length: n }, (_, i) => ({ p: 'ride' as PercKind, t: Math.floor(i / 2) * beat + (i % 2 ? beat * (2 / 3) : 0) }));

/** Unit themes (path.ts THEMES): what, why and a sound demo. Used by the Ear and Jazz courses. */
export const UNIT_THEMES: Record<string, UnitThemeCopy> = {
  home: {
    what: { he: 'לכל מנגינה יש צליל אחד שהיא רוצה לחזור אליו.', en: 'Every tune has one note it wants to come back to.' },
    whatSay: { he: 'לכל מנגינה יש בית.', en: 'Every tune has a home.' },
    why: { he: 'הכול נמדד מהבית', en: 'Everything is measured from home' },
    whySay: { he: 'מרווחים, אקורדים ומהלכים, כולם נשמעים ביחס לבית.', en: 'Intervals, chords and progressions are all heard from home.' },
    feeds: [{ g: 'intervals', t: { he: 'מרווחים', en: 'Intervals' } }, { g: 'chords', t: { he: 'אקורדים', en: 'Chords' } }, { g: 'prog', t: { he: 'מהלכים', en: 'Progressions' } }],
    goal: { he: 'בסוף: תמצאו את הבית בכל מנגינה', en: 'By the end: find home in any tune' },
    goalSay: { he: 'בסוף היחידה תמצאו את הבית בכל מנגינה.', en: 'By the end, you will find home in any tune.' },
    demo: [
      { cap: { he: 'נעצרת באמצע…', en: 'Stops halfway…' }, ev: ev([60, 62, 64, 65, 67, 65, 64, 62]), end: 'hang', under: [43, 55, 59, 62] },
      { cap: { he: '…וחוזרת הביתה', en: '…and comes home' }, ev: ev([60, 62, 64, 65, 67, 65, 64, 62, 60]), end: 'home', under: [48, 55, 64] },
    ],
    base: 60,
    home: 60,
  },
  steps: {
    what: { he: 'צלילים זזים בצעדים קטנים או בקפיצות.', en: 'Notes move by small steps or by leaps.' },
    whatSay: { he: 'צלילים זזים בצעדים, או בקפיצות.', en: 'Notes move by steps, or by leaps.' },
    why: { he: 'כך נבנית צורה של מנגינה', en: 'That is the shape of a melody' },
    whySay: { he: 'צעדים וקפיצות הם מה שנותן למנגינה את הצורה שלה.', en: 'Steps and leaps are what give a melody its shape.' },
    feeds: [{ g: 'contour', t: { he: 'מנגינות', en: 'Melodies' } }, { g: 'sing', t: { he: 'שירה', en: 'Singing' } }, { g: 'sight', t: { he: 'קריאה', en: 'Reading' } }],
    goal: { he: 'בסוף: תשמעו כמה רחוק המנגינה זזה', en: 'By the end: hear how far a tune moves' },
    goalSay: { he: 'בסוף היחידה תשמעו כמה רחוק המנגינה זזה.', en: 'By the end, you will hear how far a tune moves.' },
    demo: [
      { cap: { he: 'בצעדים', en: 'By step' }, ev: ev([60, 62, 64, 65, 67]) },
      { cap: { he: 'בקפיצות', en: 'By leap' }, ev: ev([60, 67, 64, 72, 60], 0.4, 0.35) },
    ],
    base: 60,
  },
  colour: {
    what: { he: 'אקורד מז׳ור נשמע בהיר, ומינור נשמע כהה.', en: 'A major chord sounds bright, a minor one dark.' },
    whatSay: { he: 'יש אקורדים בהירים, ויש כהים.', en: 'Some chords sound bright, some dark.' },
    why: { he: 'הצבע קובע את מצב הרוח', en: 'Colour sets the mood' },
    whySay: { he: 'הצבע של האקורד קובע את מצב הרוח של המוזיקה.', en: 'The colour of a chord sets the mood of the music.' },
    feeds: [{ g: 'chords', t: { he: 'אקורדים', en: 'Chords' } }, { g: 'scales', t: { he: 'סולמות', en: 'Scales' } }, { g: 'features', t: { he: 'אופי', en: 'Character' } }],
    goal: { he: 'בסוף: תבחינו בין מז׳ור למינור', en: 'By the end: tell major from minor' },
    goalSay: { he: 'בסוף היחידה תבחינו בין מז׳ור למינור.', en: 'By the end, you will tell major from minor.' },
    demo: [
      { cap: { he: 'מז׳ור: בהיר', en: 'Major: bright' }, ev: [...ev([60, 64, 67], 0.3), { m: [60, 64, 67], t: 1.0, d: 1 }] },
      { cap: { he: 'מינור: כהה', en: 'Minor: dark' }, ev: [...ev([60, 63, 67], 0.3), { m: [60, 63, 67], t: 1.0, d: 1 }] },
    ],
    base: 60,
  },
  pulse: {
    what: { he: 'למוזיקה יש פעמה יציבה, בקבוצות של שתיים, שלוש או ארבע.', en: 'Music has a steady beat, in groups of two, three or four.' },
    whatSay: { he: 'למוזיקה יש פעמה יציבה.', en: 'Music has a steady beat.' },
    why: { he: 'לנגן ביחד מתחיל בפעמה', en: 'Playing together starts with the beat' },
    whySay: { he: 'כדי לנגן ביחד, כולם מרגישים את אותה פעמה.', en: 'To play together, everyone feels the same beat.' },
    feeds: [{ g: 'rhythm', t: { he: 'קצב', en: 'Rhythm' } }, { g: 'groove', t: { he: 'גרוב', en: 'Groove' } }, { g: 'drums', t: { he: 'נגינה עם להקה', en: 'Band playing' } }],
    goal: { he: 'בסוף: תרגישו את הפעמה ואת המשקל', en: 'By the end: feel the beat and the meter' },
    goalSay: { he: 'בסוף היחידה תרגישו את הפעמה ואת המשקל.', en: 'By the end, you will feel the beat and the meter.' },
    demo: [
      { cap: { he: 'בארבע', en: 'In four' }, ev: pev(['kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'hat'], 0.3) },
      { cap: { he: 'בשלוש', en: 'In three' }, ev: pev(['kick', 'hat', 'hat', 'kick', 'hat', 'hat', 'kick', 'hat', 'hat'], 0.3) },
    ],
    base: 60,
  },
  chords: {
    what: { he: 'רוב האקורדים בנויים מצלילים בטרצות, אחד מעל השני.', en: 'Most chords are notes stacked in thirds.' },
    whatSay: { he: 'אקורד הוא כמה צלילים ביחד.', en: 'A chord is several notes together.' },
    why: { he: 'מי שיודע מה בפנים, שומע ומנגן', en: 'Know what is inside, and you can hear it and play it' },
    whySay: { he: 'מי שיודע מה יש בתוך אקורד, יכול לשמוע אותו ולנגן אותו.', en: 'Know what is inside a chord, and you can hear it and play it.' },
    feeds: [{ g: 'keys', t: { he: 'נגינה', en: 'Playing' } }, { g: 'voicing', t: { he: 'קולות', en: 'Voicings' } }, { g: 'prog', t: { he: 'מהלכים', en: 'Progressions' } }],
    goal: { he: 'בסוף: תשמעו יסוד, טרצה וקווינטה', en: 'By the end: hear root, third and fifth' },
    goalSay: { he: 'בסוף היחידה תשמעו את היסוד, הטרצה והקווינטה.', en: 'By the end, you will hear the root, the third and the fifth.' },
    demo: [
      { cap: { he: 'צליל אחרי צליל', en: 'One note at a time' }, ev: ev([60, 64, 67, 71], 0.4, 0.6) },
      { cap: { he: 'ביחד: אקורד', en: 'Together: a chord' }, ev: [{ m: [60, 64, 67, 71], t: 0, d: 1.4 }] },
    ],
    base: 60,
  },
  memory: {
    what: { he: 'לשמוע משפט, לזכור אותו, ולכתוב אותו.', en: 'Hear a phrase, keep it, write it down.' },
    whatSay: { he: 'שומעים משפט, וזוכרים אותו.', en: 'You hear a phrase, and keep it.' },
    why: { he: 'כך לומדים שירים מהאוזן', en: 'That is how songs are learned by ear' },
    whySay: { he: 'לזכור את מה ששומעים, כך לומדים שירים מהאוזן.', en: 'Remembering what you hear is how you learn songs by ear.' },
    feeds: [{ g: 'echo', t: { he: 'לנגן בחזרה', en: 'Play back' } }, { g: 'transcribe', t: { he: 'תמלול', en: 'Transcribing' } }, { g: 'sight', t: { he: 'הכתבה', en: 'Dictation' } }],
    goal: { he: 'בסוף: תזכרו ותכתבו משפטים קצרים', en: 'By the end: remember and write short phrases' },
    goalSay: { he: 'בסוף היחידה תזכרו ותכתבו משפטים קצרים.', en: 'By the end, you will remember and write short phrases.' },
    demo: [
      { cap: { he: 'מקשיבים…', en: 'Listen…' }, ev: ev([64, 62, 60, 62, 64, 64, 64]) },
      { cap: { he: '…ומנגנים בחזרה', en: '…and play it back' }, ev: ev([64, 62, 60, 62, 64, 64, 64]), end: 'home' },
    ],
    base: 60,
  },
  harmony: {
    what: { he: 'אקורדים נעים בדפוסים שחוזרים.', en: 'Chords move in patterns that come back.' },
    whatSay: { he: 'אקורדים נעים בדפוסים קבועים.', en: 'Chords move in set patterns.' },
    why: { he: 'אותם מהלכים, באלפי שירים', en: 'The same moves, in thousands of songs' },
    whySay: { he: 'אותם מהלכים חוזרים באלפי שירים.', en: 'The same moves come back in thousands of songs.' },
    feeds: [{ g: 'prog', t: { he: 'מהלכים', en: 'Progressions' } }, { g: 'standard', t: { he: 'שירים', en: 'Songs' } }, { g: 'improv', t: { he: 'אלתור', en: 'Improvising' } }],
    goal: { he: 'בסוף: תשמעו לאן ההרמוניה הולכת', en: 'By the end: hear where the harmony goes' },
    goalSay: { he: 'בסוף היחידה תשמעו לאן ההרמוניה הולכת.', en: 'By the end, you will hear where the harmony is going.' },
    demo: [
      { cap: { he: 'I – IV – V – I', en: 'I – IV – V – I' }, ev: [{ m: [48, 60, 64, 67], t: 0, d: 0.6 }, { m: [53, 60, 65, 69], t: 0.6, d: 0.6 }, { m: [55, 59, 62, 67], t: 1.2, d: 0.6 }, { m: [48, 60, 64, 67], t: 1.8, d: 0.9 }], end: 'home' },
      { cap: { he: 'ii – V – I', en: 'ii – V – I' }, ev: [{ m: [50, 60, 65, 69], t: 0, d: 0.7 }, { m: [43, 53, 59, 62], t: 0.7, d: 0.7 }, { m: [48, 59, 64, 67], t: 1.4, d: 1 }], end: 'home' },
    ],
    base: 48,
  },
  groove: {
    what: { he: 'גרוב הוא איך הקצב מרגיש, לא רק איפה הוא נופל.', en: 'Groove is how rhythm feels, not just where it falls.' },
    whatSay: { he: 'גרוב הוא איך שהקצב מרגיש.', en: 'Groove is how the rhythm feels.' },
    why: { he: 'אותם צלילים, יבשים או חיים', en: 'The same notes, stiff or alive' },
    whySay: { he: 'אותם צלילים יכולים להישמע יבשים, או חיים.', en: 'The same notes can sound stiff, or alive.' },
    feeds: [{ g: 'rhythm', t: { he: 'קצב', en: 'Rhythm' } }, { g: 'swingtime', t: { he: 'סווינג', en: 'Swing' } }, { g: 'drumread', t: { he: 'קריאת קצב', en: 'Reading rhythm' } }],
    goal: { he: 'בסוף: תשמעו ותכתבו מקצבים', en: 'By the end: hear and write rhythms' },
    goalSay: { he: 'בסוף היחידה תשמעו ותכתבו מקצבים.', en: 'By the end, you will hear and write rhythms.' },
    demo: [
      { cap: { he: 'ישר', en: 'Straight' }, ev: pev(['ride', 'ride', 'ride', 'ride', 'ride', 'ride', 'ride', 'ride'], 0.2) },
      { cap: { he: 'בסווינג', en: 'Swung' }, ev: swung(8) },
    ],
    base: 60,
  },
  read: {
    what: { he: 'תווים על הדף, והעברה לסולם אחר.', en: 'Notes on the page, and moving them to a new key.' },
    whatSay: { he: 'קוראים תווים, ומעבירים אותם לסולם אחר.', en: 'You read notes, and move them to a new key.' },
    why: { he: 'קריאה פותחת כל מוזיקה', en: 'Reading opens any music' },
    whySay: { he: 'מי שקורא, יכול ללמוד מוזיקה עוד לפני ששמע אותה.', en: 'If you can read, you can learn music before you hear it.' },
    feeds: [{ g: 'sight', t: { he: 'קריאה', en: 'Reading' } }, { g: 'theory', t: { he: 'תיאוריה', en: 'Theory' } }, { g: 'keychord', t: { he: 'סולמות', en: 'Keys' } }],
    goal: { he: 'בסוף: תקראו ותעבירו מנגינות קצרות', en: 'By the end: read and transpose short tunes' },
    goalSay: { he: 'בסוף היחידה תקראו ותעבירו מנגינות קצרות.', en: 'By the end, you will read and transpose short tunes.' },
    demo: [
      { cap: { he: 'בדו', en: 'In C' }, ev: ev([60, 64, 67, 64, 60]) },
      { cap: { he: 'אותה מנגינה, בסול', en: 'Same tune, in G' }, ev: ev([67, 71, 74, 71, 67]) },
    ],
    base: 60,
  },
  sound: {
    what: { he: 'צבע, צורה והצליל של כלים.', en: 'Colour, form and the sound of instruments.' },
    whatSay: { he: 'צבע, צורה וצליל.', en: 'Colour, form and sound.' },
    why: { he: 'כך המוזיקה מרגישה כמו שהיא מרגישה', en: 'That is why music feels the way it does' },
    whySay: { he: 'הצליל והצורה הם מה שגורם למוזיקה להרגיש כמו שהיא מרגישה.', en: 'Sound and form are what make music feel the way it does.' },
    feeds: [{ g: 'eq', t: { he: 'צליל', en: 'Sound' } }, { g: 'voicing', t: { he: 'קולות', en: 'Voicings' } }, { g: 'features', t: { he: 'הבעה', en: 'Expression' } }],
    goal: { he: 'בסוף: תשמעו צבע, צליל וצורה', en: 'By the end: hear colour, sound and form' },
    goalSay: { he: 'בסוף היחידה תשמעו צבע, צליל וצורה.', en: 'By the end, you will hear colour, sound and form.' },
    demo: [
      { cap: { he: 'צפוף', en: 'Close' }, ev: [{ m: [60, 64, 67], t: 0, d: 1.2 }] },
      { cap: { he: 'פתוח', en: 'Open' }, ev: [{ m: [48, 55, 64, 72], t: 0, d: 1.4 }] },
    ],
    base: 48,
  },
};

/** Courses whose units are mostly playing (technique / vocal families): a course-level what and a why per section. */
export const COURSE_UNIT: Partial<Record<CourseId, { what: T2; whatSay: T2; why: Record<Section, T2> }>> = {
  keys: {
    what: { he: 'ליד הפסנתר: טכניקה, אוזן וקריאה, קצת מכל אחד.', en: 'At the piano: technique, ear and reading, a little of each.' },
    whatSay: { he: 'ביחידה הזאת, טכניקה, אוזן וקריאה ליד הפסנתר.', en: 'This unit: technique, ear and reading at the piano.' },
    why: {
      beginner: { he: 'הרגלים טובים עכשיו מקלים על כל צעד אחר כך.', en: 'Good habits now make every later step easier.' },
      developing: { he: 'כשהצורות בידיים, האוזן פנויה להקשיב.', en: 'With the shapes in your hands, your ear is free to listen.' },
      solid: { he: 'קולות וזמן הם מה שהלהקה שומעת מכם.', en: 'Voicings and time are what the band hears from you.' },
      advanced: { he: 'שליטה בכל הסולמות הופכת ידע למוזיקה.', en: 'Fluency in every key turns knowledge into music.' },
    },
  },
  guitar: {
    what: { he: 'על הגיטרה: טכניקה, צוואר ואוזן, קצת מכל אחד.', en: 'On the guitar: technique, the neck and your ear.' },
    whatSay: { he: 'ביחידה הזאת, טכניקה, צוואר ואוזן על הגיטרה.', en: 'This unit: technique, the neck and your ear on the guitar.' },
    why: {
      beginner: { he: 'ידיים רגועות וזמן יציב, ואז הכול נשמע טוב יותר.', en: 'Relaxed hands and steady time make everything sound better.' },
      developing: { he: 'צורות על הצוואר פותחות כל סולם.', en: 'Shapes on the neck open every key.' },
      solid: { he: 'ליווי טוב הוא מה שהופך גיטריסט לחבר להקה.', en: 'Good comping is what makes a guitarist a band member.' },
      advanced: { he: 'חופש על הצוואר הופך רעיונות לנגינה.', en: 'Freedom on the neck turns ideas into playing.' },
    },
  },
  bass: {
    what: { he: 'על הבס: זמן, צוואר ואוזן, קצת מכל אחד.', en: 'On the bass: time, the neck and your ear.' },
    whatSay: { he: 'ביחידה הזאת, זמן, צוואר ואוזן על הבס.', en: 'This unit: time, the neck and your ear on the bass.' },
    why: {
      beginner: { he: 'הלהקה נשענת על הזמן של הבסיסט.', en: 'The band leans on the bassist’s time.' },
      developing: { he: 'צלילי האקורד הם מה שהבס מוסיף להרמוניה.', en: 'Chord tones are what the bass adds to the harmony.' },
      solid: { he: 'ווקינג טוב נושא את כל הלהקה.', en: 'A good walking line carries the whole band.' },
      advanced: { he: 'שליטה בכל הסולמות משחררת אתכם לנגן.', en: 'Fluency in every key frees you to play.' },
    },
  },
  drums: {
    what: { he: 'על התופים: זמן, מכות וגרוב, קצת מכל אחד.', en: 'On the kit: time, strokes and groove.' },
    whatSay: { he: 'ביחידה הזאת, זמן, מכות וגרוב על התופים.', en: 'This unit: time, strokes and groove on the kit.' },
    why: {
      beginner: { he: 'זמן יציב הוא הדבר הראשון שהלהקה צריכה.', en: 'Steady time is the first thing a band needs.' },
      developing: { he: 'שליטה בדינמיקה הופכת קצב לגרוב.', en: 'Control of dynamics turns a beat into a groove.' },
      solid: { he: 'תחושות שונות פותחות סגנונות חדשים.', en: 'New feels open new styles.' },
      advanced: { he: 'חופש בזמן הוא מה שמאפשר לשוחח עם הלהקה.', en: 'Freedom in time lets you talk with the band.' },
    },
  },
  voice: {
    what: { he: 'בקול: דיוק, נשימה ושירים, קצת מכל אחד.', en: 'With your voice: pitch, breath and songs.' },
    whatSay: { he: 'ביחידה הזאת, דיוק, נשימה ושירים.', en: 'This unit: pitch, breath and songs.' },
    why: {
      beginner: { he: 'צליל מדויק ונשימה יציבה הם הבסיס של כל שיר.', en: 'An in-tune note and steady breath are the base of every song.' },
      developing: { he: 'לשמוע לפני שמשמיעים, זה מה שעושה זמר מדויק.', en: 'Hearing before you sing is what makes a singer in tune.' },
      solid: { he: 'הרמוניה וזמן הם מה שמחבר אתכם ללהקה.', en: 'Harmony and time connect you to the band.' },
      advanced: { he: 'שליטה בקול משחררת אתכם לאלתר.', en: 'Control of your voice frees you to improvise.' },
    },
  },
};

/** The unit opener's copy for a course and a unit (theme copy for Ear / Jazz, course copy for the playing courses). */
export function unitCopy(course: CourseId, theme: string | undefined, section: Section): { what: T2; whatSay: T2; why: T2; whySay: T2; theme: UnitThemeCopy } {
  const th = UNIT_THEMES[theme ?? ''] ?? UNIT_THEMES.home;
  const cu = COURSE_UNIT[course];
  if (!cu) return { what: th.what, whatSay: th.whatSay, why: th.why, whySay: th.whySay, theme: th };
  return { what: cu.what, whatSay: cu.whatSay, why: cu.why[section], whySay: cu.why[section], theme: th };
}

export const UNIT_TX = {
  unit: { he: 'יחידה {n}', en: 'Unit {n}' },
  why: { he: 'למה זה חשוב', en: 'Why it matters' },
  inUnit: { he: 'ביחידה הזאת', en: 'In this unit' },
  steps: { he: '{n} צעדים', en: '{n} steps' },
  minutes: { he: 'כ־{m} דקות', en: 'About {m} min' },
  stepsSay: { he: 'ביחידה הזאת {n} צעדים קצרים, בערך {m} דקות.', en: 'This unit has {n} short steps, about {m} minutes.' },
  start: { he: 'מתחילים', en: 'Start' },
  close: { he: 'סגירה', en: 'Close' },
};
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));

/** Rough minutes for a unit: about a minute and a half a step, to the nearest 5 (never under 5). */
export const unitMinutes = (steps: number): number => Math.max(5, Math.round((steps * 1.5) / 5) * 5);

// ---------------------------------------------------------------- seen flags (Settings.openers)

export interface OpenersSeen {
  /** Course openers seen (course → when). */
  course?: Partial<Record<CourseId, string>>;
  /** Unit openers seen ("<course>:<unit id>" → when). */
  unit?: Record<string, string>;
}
export const unitKey = (course: CourseId, unitId: string) => `${course}:${unitId}`;
export const courseOpenerSeen = (o: OpenersSeen | undefined, c: CourseId): boolean => !!o?.course?.[c];
export const unitOpenerSeen = (o: OpenersSeen | undefined, c: CourseId, unitId: string): boolean => !!o?.unit?.[unitKey(c, unitId)];
export const markCourseOpener = (o: OpenersSeen | undefined, c: CourseId, now: string): OpenersSeen => (o?.course?.[c] ? (o ?? {}) : { ...(o ?? {}), course: { ...(o?.course ?? {}), [c]: now } });
export const markUnitOpener = (o: OpenersSeen | undefined, c: CourseId, unitId: string, now: string): OpenersSeen => (o?.unit?.[unitKey(c, unitId)] ? (o ?? {}) : { ...(o ?? {}), unit: { ...(o?.unit ?? {}), [unitKey(c, unitId)]: now } });

/**
 * Does entering this unit show its opener on its own? Only the first entry into the current unit: never once seen, and
 * never for a unit already started (a step with stars — an existing player's unit counts as entered).
 */
export function unitOpenerDue(o: OpenersSeen | undefined, c: CourseId, unit: { id: string; status: string; steps: { state: string; stars?: number }[] }): boolean {
  if (unit.status !== 'current' || unitOpenerSeen(o, c, unit.id)) return false;
  return !unit.steps.some((x) => (x.stars ?? 0) > 0 || x.state === 'done' || x.state === 'mastered');
}

// ---------------------------------------------------------------- every narrated line (the voice inventory)

/** Every line the openers say, per language (English ones are pre-recorded: scripts/voice/inventory.ts). */
export function openerLines(lang: 'he' | 'en', tasteTitles: T2[]): string[] {
  const out: T2[] = [];
  for (const d of Object.values(COURSE_OPENERS)) {
    out.push(d.hook.say1, d.hook.say2, d.road.say, d.road.thenSay, ...d.road.stations.map((s) => s.say), ...d.how.says);
  }
  out.push(...DAY.says, ...Object.values(START.say), START.skipSay, GO.sayReplay, ...tasteTitles.map(GO.say));
  for (const t of Object.values(UNIT_THEMES)) out.push(t.whatSay, t.whySay, t.goalSay);
  for (const cu of Object.values(COURSE_UNIT)) if (cu) out.push(cu.whatSay, ...Object.values(cu.why));
  for (let n = 1; n <= 14; n++) out.push({ he: fill(UNIT_TX.stepsSay.he, { n, m: unitMinutes(n) }), en: fill(UNIT_TX.stepsSay.en, { n, m: unitMinutes(n) }) });
  return [...new Set(out.map((t) => t[lang]))];
}

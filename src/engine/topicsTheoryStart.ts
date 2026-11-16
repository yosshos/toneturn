// AUDIT-7 #1 (docs/research/AUDIT-7-GAPS.md §6): written theory started 3–4 grades after ABRSM Music Theory does. Two
// topics of ABRSM theory grades 1–2 that the app had no item for:
//
//   note-values      1 notes: how many beats (whole, half, dotted half, quarter, eighth) · 2 rests, the dotted quarter
//                    and the sixteenth · 3 add up a group of notes and rests (ABRSM G1–G2), 750–860
//   interval-number  1 the number only (2nd … octave) above the tonic of C, G, D or F major, read off the treble staff ·
//                    2 any two notes of a major scale up to three sharps or flats, treble or bass clef, melodic or
//                    harmonic · 3 going down too, keys to four sharps or flats (ABRSM G1–G3: "intervals by number
//                    only"), 800–900
//
// The beat values count the quarter note as one beat (4/4), as the grade 1 papers do. Every item is generated from its
// seed: key, clef, register, the group. Pure.

import type { ChoiceQuestion } from './lesson';
import type { PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR, choiceQ, chordStim, eventsStim, notesStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

// ---------------------------------------------------------------- note values

/** A written value: its symbol, its length in quarter-note beats, and its name. */
interface Val {
  k: string;
  sym: string;
  beats: number;
  en: string;
  he: string;
}
const NOTE_VALS: Val[] = [
  { k: 'w', sym: '𝅝', beats: 4, en: 'whole note', he: 'תו שלם' },
  { k: 'h.', sym: '𝅗𝅥.', beats: 3, en: 'dotted half note', he: 'חצי עם נקודה' },
  { k: 'h', sym: '𝅗𝅥', beats: 2, en: 'half note', he: 'חצי' },
  { k: 'q', sym: '♩', beats: 1, en: 'quarter note', he: 'רבע' },
  { k: 'e', sym: '♪', beats: 0.5, en: 'eighth note', he: 'שמינית' },
];
/** Level 2: rests (only those a symbol shows apart without a staff line: quarter, eighth, sixteenth), dotted quarter, 16th. */
const MORE_VALS: Val[] = [
  { k: 'qr', sym: '𝄽', beats: 1, en: 'quarter rest', he: 'הפסקת רבע' },
  { k: 'er', sym: '𝄾', beats: 0.5, en: 'eighth rest', he: 'הפסקת שמינית' },
  { k: 'sr', sym: '𝄿', beats: 0.25, en: 'sixteenth rest', he: 'הפסקת שש־עשרית' },
  { k: 'q.', sym: '♩.', beats: 1.5, en: 'dotted quarter note', he: 'רבע עם נקודה' },
  { k: 's', sym: '𝅘𝅥𝅯', beats: 0.25, en: 'sixteenth note', he: 'שש־עשרית' },
  { k: 'qr.', sym: '𝄽.', beats: 1.5, en: 'dotted quarter rest', he: 'הפסקת רבע עם נקודה' },
];
/** Beat counts as answers: their keys and names. */
const BEATS = [0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const beatKey = (b: number) => `b${b}`;
const beatName = (b: number) => {
  const whole = Math.floor(b);
  const frac = b - whole === 0.5 ? '½' : b - whole === 0.25 ? '¼' : '';
  const txt = whole ? `${whole}${frac}` : frac;
  return nm(txt, txt, String(b));
};
/** The answer and three neighbouring beat counts, in rising order. */
function beatChoices(rnd: () => number, ans: number, pool: number[]): number[] {
  const near = pool.filter((b) => b !== ans).sort((a, b) => Math.abs(a - ans) - Math.abs(b - ans) || (rnd() < 0.5 ? -1 : 1));
  return [ans, ...near.slice(0, 3)].sort((a, b) => a - b);
}
/** Level 3 groups: two to four values (notes and rests) that add up to 2–4 beats. */
const GROUP_VALS = [...NOTE_VALS.filter((v) => v.beats <= 2), ...MORE_VALS.filter((v) => v.k === 'qr' || v.k === 'er' || v.k === 'q.')];
export function noteGroup(rnd: () => number): Val[] {
  for (let g = 0; g < 50; g++) {
    const n = 2 + Math.floor(rnd() * 3);
    const out = Array.from({ length: n }, () => pickR(rnd, GROUP_VALS));
    const sum = out.reduce((a, v) => a + v.beats, 0);
    if (sum >= 2 && sum <= 4 && sum * 2 === Math.round(sum * 2)) return out;
  }
  return [NOTE_VALS[3], NOTE_VALS[3], NOTE_VALS[2]];
}
export const NOTE_VALUES_DIFF = [750, 800, 860];

TOPIC_GEN['note-values'] = {
  title: { en: 'Note values and rests', he: 'ערכי תווים והפסקות' },
  skill: 'theory',
  levels: [
    { en: 'Notes: how many beats?', he: 'תווים: כמה פעמות?' },
    { en: 'Rests, dotted quarter, sixteenth', he: 'הפסקות, רבע עם נקודה, שש־עשרית' },
    { en: 'Add up the beats', he: 'לחבר את הפעמות' },
  ],
  gen(seed, level, id): ChoiceQuestion {
    const rnd = rng(seed);
    const difficulty = NOTE_VALUES_DIFF[level - 1] ?? 860;
    const names: ChoiceQuestion['names'] = {};
    if (level <= 2) {
      const v = pickR(rnd, level === 1 ? NOTE_VALS : MORE_VALS);
      const choices = beatChoices(rnd, v.beats, level === 1 ? [0.5, 1, 2, 3, 4] : BEATS.filter((b) => b <= 2));
      for (const c of choices) names[beatKey(c)] = beatName(c);
      return choiceQ({
        id, topic: 'note-values', level, seed, skill: 'theory', difficulty,
        ask: { en: `How many beats? (♩ = 1)`, he: `כמה פעמות? (♩ = 1)` },
        text: { en: v.sym, he: v.sym },
        names, answer: beatKey(v.beats), choices: choices.map(beatKey), stimulus: [],
      });
    }
    const group = noteGroup(rnd);
    const sum = group.reduce((a, v) => a + v.beats, 0);
    const choices = beatChoices(rnd, sum, BEATS.filter((b) => b >= 1.5));
    for (const c of choices) names[beatKey(c)] = beatName(c);
    const line = group.map((v) => v.sym).join('  ');
    // The group can be heard too: one note per written note at ♩ = 100, the rests silent.
    const beat = 0.6;
    let at = 0;
    const events: { midi: number; start: number; duration: number; velocity: number }[] = [];
    for (const v of group) {
      if (!v.k.includes('r')) events.push({ midi: 67, start: at * beat, duration: v.beats * beat * 0.9, velocity: 0.7 });
      at += v.beats;
    }
    return choiceQ({
      id, topic: 'note-values', level, seed, skill: 'theory', difficulty,
      ask: { en: 'How many beats in all? (♩ = 1)', he: 'כמה פעמות בסך הכול? (♩ = 1)' },
      text: { en: line, he: line },
      names, answer: beatKey(sum), choices: choices.map(beatKey), stimulus: [eventsStim(events, sum * beat + 0.3)],
    });
  },
};
TOPIC_TAGS['note-values'] = tg(['theory', 'terms', 0.6], ['rhythm-reading', 'read', 0.4]);

/** The note-values level's whole pool (tests). */
export const NOTE_VALUE_POOL = { notes: NOTE_VALS, more: MORE_VALS };

// ---------------------------------------------------------------- interval numbers

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
interface Key {
  pc: PitchClass;
  /** The tonic in the treble register (C4 … G4) — the bass clef takes it two octaves down. */
  tonic: number;
}
const K = (letter: PitchClass['letter'], acc: PitchClass['acc'], tonic: number): Key => ({ pc: { letter, acc }, tonic });
/** ABRSM theory G1: C, G, D and F major; G2 adds A, B♭ and E♭. */
const KEYS_G1: Key[] = [K('C', 0, 60), K('G', 0, 67), K('D', 0, 62), K('F', 0, 65)];
const KEYS_G2: Key[] = [...KEYS_G1, K('A', 0, 57), K('B', -1, 58), K('E', -1, 63)];
/** Level 3 (ABRSM G3): up to four sharps or flats. */
const KEYS_G3: Key[] = [...KEYS_G2, K('E', 0, 64), K('A', -1, 56)];
const NUM_NAMES: Record<number, ReturnType<typeof nm>> = {
  2: nm('2nd', 'סקונדה', 'second', 'two'),
  3: nm('3rd', 'טרצה', 'third', 'three'),
  4: nm('4th', 'קוורטה', 'fourth', 'four'),
  5: nm('5th', 'קווינטה', 'fifth', 'five'),
  6: nm('6th', 'סקסטה', 'sixth', 'six'),
  7: nm('7th', 'ספטימה', 'seventh', 'seven'),
  8: nm('Octave', 'אוקטבה', 'octave', 'eight'),
};
/** The midi of scale degree `d` (0 = tonic, may pass the octave) above `tonic` in a major key. */
const degMidi = (tonic: number, d: number) => tonic + 12 * Math.floor(d / 7) + MAJOR[((d % 7) + 7) % 7];
export const INTERVAL_NUMBER_DIFF = [800, 850, 900];

TOPIC_GEN['interval-number'] = {
  title: { en: 'Interval numbers', he: 'מספרי מרווחים' },
  skill: 'theory',
  levels: [
    { en: 'Above the tonic, treble clef', he: 'מעל הטוניקה, מפתח סול' },
    { en: 'Any two notes, treble or bass', he: 'כל שני צלילים, סול או פה' },
    { en: 'Up or down, keys to four sharps or flats', he: 'עולה או יורד, סולמות עד ארבעה סימנים' },
  ],
  gen(seed, level, id): ChoiceQuestion {
    const rnd = rng(seed);
    const key = pickR(rnd, level === 1 ? KEYS_G1 : level === 2 ? KEYS_G2 : KEYS_G3);
    const n = 2 + Math.floor(rnd() * 7); // 2 … 8
    const low = level === 1 ? 0 : Math.floor(rnd() * 7);
    const bass = level >= 2 && rnd() < 0.5;
    const harmonic = level === 2 && rnd() < 0.5;
    // Level 3: half the items go down (the upper note first).
    const down = level === 3 && rnd() < 0.5;
    const base = key.tonic - (bass ? 24 : 0) - (low >= 4 ? 12 : 0);
    const a = degMidi(base, low);
    const b = degMidi(base, low + n - 1);
    const pool = [2, 3, 4, 5, 6, 7, 8].filter((x) => x !== n).sort((x, y) => Math.abs(x - n) - Math.abs(y - n) || (rnd() < 0.5 ? -1 : 1));
    const choices = [n, ...pool.slice(0, 3)].sort((x, y) => x - y);
    const names: ChoiceQuestion['names'] = {};
    for (const c of choices) names[`n${c}`] = NUM_NAMES[c];
    return choiceQ({
      id, topic: 'interval-number', level, seed, skill: 'theory', difficulty: INTERVAL_NUMBER_DIFF[level - 1] ?? 870,
      ask: { en: 'Which interval number?', he: 'איזה מרווח (מספר)?' },
      names, answer: `n${n}`, choices: choices.map((c) => `n${c}`),
      stimulus: [harmonic ? chordStim([a, b], 1.4) : notesStim(down ? [b, a] : [a, b], 0.6)],
      show: { midis: down ? [b, a] : [a, b], clef: bass ? 'bass' : 'treble', key: key.pc, ...(harmonic ? { chord: true } : {}) },
    });
  },
};
TOPIC_TAGS['interval-number'] = tg(['theory', 'spelling', 0.6], ['notes', 'staff', 0.4]);

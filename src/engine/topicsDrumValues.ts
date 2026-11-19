// `drum-values` (CURRICULUM-AUDIT-VOICE-DRUMS B5, owner 2026-11-19): the practice after the drums' "Note values and
// rests" lesson, early on the drums path (units 1–2), before snare reading (d-read) and snare dictation (d-ear 3).
//
// Levels   1  how many beats: quarter, eighth, half, whole, quarter rest, eighth rest — and which of three bars
//             (quarters, eighths, rests) the snare just played
//          2  + sixteenths and the dotted quarter, the same two kinds of item
//          3  everything mixed in one bar: eighth rests, dotted quarters, sixteenths, quarter rests
//
// The snare plays after a one-bar count-in of clicks (owner: every timed example counts in). The quarter note is the
// beat (4/4), as in the lesson. Choice items: one line of feedback, "Why?" on a wrong answer (Lesson.tsx). Pure.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { CELLS, TPQ, type CellId } from './rhythm';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

/** A written value: its symbol, its length in quarter-note beats, its name. */
interface Val {
  sym: string;
  beats: number;
  en: string;
  he: string;
}
const L1_VALS: Val[] = [
  { sym: '♩', beats: 1, en: 'quarter note', he: 'רבע' },
  { sym: '♪', beats: 0.5, en: 'eighth note', he: 'שמינית' },
  { sym: '𝅗𝅥', beats: 2, en: 'half note', he: 'חצי' },
  { sym: '𝅝', beats: 4, en: 'whole note', he: 'תו שלם' },
  { sym: '𝄽', beats: 1, en: 'quarter rest', he: 'הפסקת רבע' },
  { sym: '𝄾', beats: 0.5, en: 'eighth rest', he: 'הפסקת שמינית' },
];
const L2_VALS: Val[] = [
  { sym: '𝅘𝅥𝅯', beats: 0.25, en: 'sixteenth note', he: 'שש־עשרית' },
  { sym: '♩.', beats: 1.5, en: 'dotted quarter note', he: 'רבע עם נקודה' },
  { sym: '𝅗𝅥.', beats: 3, en: 'dotted half note', he: 'חצי עם נקודה' },
  ...L1_VALS.slice(0, 2),
];
const BEAT_POOL = [0.25, 0.5, 1, 1.5, 2, 3, 4];
const beatKey = (b: number) => `b${b}`;
const beatName = (b: number) => {
  const w = Math.floor(b);
  const f = b - w === 0.5 ? '½' : b - w === 0.25 ? '¼' : '';
  const txt = w ? `${w}${f}` : f;
  return nm(txt, txt, String(b));
};

/** One-bar snare patterns (4/4) by level, built from rhythm cells; drawn with the cells' symbols. */
const BARS: Record<1 | 2 | 3, CellId[][]> = {
  1: [
    ['q', 'q', 'q', 'q'],
    ['ee', 'ee', 'ee', 'ee'],
    ['q', 'ee', 'q', 'ee'],
    ['ee', 'q', 'ee', 'q'],
    ['q', 'qr', 'q', 'qr'],
    ['h', 'q', 'q'],
    ['q', 'q', 'h'],
    ['ee', 'ee', 'h'],
    ['q', 'ee', 'qr', 'q'],
    ['ere', 'ere', 'q', 'q'],
  ],
  2: [
    ['ssss', 'q', 'ssss', 'q'],
    ['q', 'ssss', 'q', 'ssss'],
    ['ee', 'ssss', 'ee', 'q'],
    ['dqe', 'q', 'q'],
    ['dqe', 'dqe'],
    ['q', 'q', 'dqe'],
    ['ssss', 'ssss', 'ee', 'q'],
    ['dqe', 'ee', 'q'],
  ],
  3: [
    ['ere', 'ssss', 'q', 'qr'],
    ['dqe', 'ere', 'q'],
    ['q', 'ere', 'ssss', 'q'],
    ['ssss', 'qr', 'ee', 'qr'],
    ['dqe', 'qr', 'ee'],
    ['ere', 'q', 'dqe'],
    ['q', 'ssss', 'ere', 'ere'],
    ['dqe', 'ssss', 'qr'],
  ],
};
const SYM: Partial<Record<CellId, string>> = { q: '♩', ee: '♫', h: '𝅗𝅥', qr: '𝄽', ere: '𝄾♪', ssss: '♬♬', dqe: '♩.♪' };
const barText = (cells: CellId[]) => cells.map((c) => SYM[c] ?? c).join(' ');

/** A bar on the snare after a count-in of four clicks (accent on 1), quiet clicks under it. */
export function snareBar(cells: CellId[], bpm: number): Stimulus {
  const b = 60 / bpm;
  const ev: NoteEvent[] = [];
  for (let i = 0; i < 4; i++) ev.push({ midi: 0, start: i * b, duration: 0.05, velocity: i ? 0.5 : 0.8, perc: i ? 'click' : 'accent' });
  const t0 = 4 * b;
  for (let i = 0; i < 4; i++) ev.push({ midi: 0, start: t0 + i * b, duration: 0.05, velocity: 0.3, perc: 'click' });
  let at = 0;
  for (const c of cells) {
    for (const e of CELLS[c].events) if (!e.rest) ev.push({ midi: 38, start: t0 + ((at + e.start) / TPQ) * b, duration: 0.08, velocity: 0.8, perc: 'snare' });
    at += CELLS[c].beats * TPQ;
  }
  return { kind: 'events', events: ev, length: t0 + 4 * b + 0.3 };
}

export const DRUM_VALUES_DIFF = [735, 790, 860];

TOPIC_GEN['drum-values'] = {
  title: { en: 'Note values on the snare', he: 'ערכי תווים על הסנר' },
  skill: 'rhythm-reading',
  // The drums course's own: the path offers it to drummers only (courses are disjoint).
  forPlays: ['drums'],
  levels: [
    { en: 'Quarters, eighths, halves, rests', he: 'רבעים, שמיניות, חצאים, הפסקות' },
    { en: '+ sixteenths and the dotted quarter', he: '+ שש־עשריות ורבע עם נקודה' },
    { en: 'All mixed, with rests', he: 'הכול מעורבב, עם הפסקות' },
  ],
  gen(seed, level, id): ChoiceQuestion {
    const rnd = rng(seed);
    const L = (Math.min(3, Math.max(1, level)) as 1 | 2 | 3);
    const difficulty = DRUM_VALUES_DIFF[L - 1];
    if (rnd() < 0.5) {
      // How many beats?
      const v = pickR(rnd, L === 1 ? L1_VALS : L === 2 ? L2_VALS : [...L2_VALS, ...L1_VALS.slice(4)]);
      const pool = BEAT_POOL.filter((x) => x !== v.beats).sort((a, z) => Math.abs(a - v.beats) - Math.abs(z - v.beats) || (rnd() < 0.5 ? -1 : 1));
      const choices = [v.beats, ...pool.slice(0, 3)].sort((a, z) => a - z);
      return choiceQ({
        id, topic: 'drum-values', level: L, seed, skill: 'rhythm-reading', difficulty,
        ask: { en: 'How many beats? (♩ = 1)', he: 'כמה פעמות? (♩ = 1)' },
        text: { en: v.sym, he: v.sym },
        names: Object.fromEntries(choices.map((c) => [beatKey(c), beatName(c)])),
        answer: beatKey(v.beats), choices: choices.map(beatKey), stimulus: [],
      });
    }
    // Which bar did the snare play?
    const bpm = pickR(rnd, L === 1 ? [72, 80, 88] : [66, 72, 80]);
    const opts = shuffleR(rnd, BARS[L]).slice(0, 3);
    const answer = opts[0];
    const keys = opts.map((o) => o.join('.'));
    return choiceQ({
      id, topic: 'drum-values', level: L, seed, skill: 'rhythm-reading', difficulty: difficulty + 20,
      ask: { en: 'Which bar did the snare play?', he: 'איזו תיבה הסנר ניגן?' },
      names: Object.fromEntries(opts.map((o) => [o.join('.'), nm(barText(o), barText(o))])),
      answer: answer.join('.'), choices: shuffleR(rnd, keys),
      stimulus: [snareBar(answer, bpm)],
      choiceStim: Object.fromEntries(opts.map((o) => [o.join('.'), [snareBar(o, bpm)]])),
    });
  },
};
TOPIC_TAGS['drum-values'] = tg(['rhythm-reading', 'read', 1]);

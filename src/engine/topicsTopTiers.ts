// Content for the last `todo` rows of the game tiers (GAMES_TIERS_PLAN, 0.75). Game-only topics, registered by
// engine/rush.ts (like topicsAdvGames.ts), never in the lesson catalogue. Own material, built from rules. Pure, seeded.
//   interval-cells 1  Interval Sprint ff: two intervals in a row (a 3-note cell), quick notes, 8 options.
//   interval-cells 2  Interval Sprint ff: compound intervals by their jazz names (♭9, 9, ♯9, 11, ♯11, ♭13, 13).

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, notesStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type Names = ChoiceQuestion['names'];

// ================================================================ interval-cells

/** Interval symbols by semitones (1..12). */
export const IV_SYM = ['', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
/** Quick notes at ff: 0.4 s each, the cell lasts 1.2 s. */
export const CELL_NOTE_S = 0.4;

/** A cell key: signed semitones of the two moves, e.g. "3,-5" = up a minor 3rd, then down a 4th. */
export const cellKey = (a: number, b: number) => `${a},${b}`;
export function cellName(key: string): { en: string; he: string } {
  const [a, b] = key.split(',').map(Number);
  const one = (x: number) => `${x > 0 ? '↑' : '↓'}${IV_SYM[Math.abs(x)]}`;
  const s = `${one(a)} ${one(b)}`;
  return { en: s, he: s };
}
/** The three notes of a cell from `low` (kept inside G3–C6). */
export function cellMidis(key: string, base: number): number[] {
  const [a, b] = key.split(',').map(Number);
  // start so that the whole cell sits in range: lowest point ≥ 55, highest ≤ 84
  const pts = [0, a, a + b];
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  let s = base;
  if (s + lo < 55) s = 55 - lo;
  if (s + hi > 84) s = 84 - hi;
  return pts.map((p) => s + p);
}

const JAZZ: { k: string; s: number; en: string; he: string; say: string[] }[] = [
  { k: 'b9', s: 13, en: '♭9', he: '♭9', say: ['flat nine', 'minor ninth'] },
  { k: '9', s: 14, en: '9', he: '9', say: ['nine', 'ninth'] },
  { k: 's9', s: 15, en: '♯9', he: '♯9', say: ['sharp nine'] },
  { k: '10', s: 16, en: '3 (10th)', he: '3 (דצימה)', say: ['third', 'tenth'] },
  { k: '11', s: 17, en: '11', he: '11', say: ['eleven', 'eleventh'] },
  { k: 's11', s: 18, en: '♯11', he: '♯11', say: ['sharp eleven'] },
  { k: 'b13', s: 20, en: '♭13', he: '♭13', say: ['flat thirteen'] },
  { k: '13', s: 21, en: '13', he: '13', say: ['thirteen'] },
];
export const JAZZ_TENSIONS = JAZZ.map((j) => j.k);

TOPIC_GEN['interval-cells'] = {
  title: { en: 'Interval cells and jazz names', he: 'תאי מרווחים ושמות ג׳אז' },
  skill: 'intervals',
  levels: [
    { en: 'Two intervals in a row (3 notes)', he: 'שני מרווחים ברצף (3 צלילים)' },
    { en: 'Tensions by name: ♭9, ♯11, ♭13 …', he: 'טנשנים בשמם: ♭9, ♯11, ♭13 …' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const lv = Math.max(1, Math.min(2, level));
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    if (lv === 1) {
      const step = () => (1 + Math.floor(rnd() * 12)) * (rnd() < 0.5 ? -1 : 1);
      const a = step();
      let b = step();
      if (b === -a) b = a > 0 ? b - 1 || 1 : b + 1 || -1; // never straight back to the first note
      const answer = cellKey(a, b);
      // decoys: one move changed by a half / whole step, or its direction flipped (8 options in all)
      const set = new Set<string>([answer]);
      const near = (x: number, d: number) => {
        const m = Math.abs(x) + d;
        return m >= 1 && m <= 12 ? Math.sign(x) * m : null;
      };
      const cands: string[] = [];
      for (const d of [-2, -1, 1, 2]) {
        const na = near(a, d);
        const nb = near(b, d);
        if (na !== null) cands.push(cellKey(na, b));
        if (nb !== null) cands.push(cellKey(a, nb));
      }
      cands.push(cellKey(-a, b), cellKey(a, -b));
      for (const c of shuffleR(rnd, cands)) {
        if (set.size >= 8) break;
        const [x, y] = c.split(',').map(Number);
        if (x !== 0 && y !== 0 && y !== -x) set.add(c);
      }
      const choices = shuffleR(rnd, [...set]);
      const base = 60 + Math.floor(rnd() * 7);
      for (const c of choices) {
        names[c] = nm(cellName(c).en, cellName(c).he);
        choiceStim[c] = [notesStim(cellMidis(c, base), CELL_NOTE_S)];
      }
      return choiceQ({
        id, topic: 'interval-cells', level: lv, seed, skill: 'intervals', difficulty: 1480,
        ask: { en: 'Which two intervals?', he: 'אילו שני מרווחים?' }, names, answer, choices, choiceStim,
        stimulus: choiceStim[answer],
      });
    }
    const ans = pickR(rnd, JAZZ);
    const root = 43 + Math.floor(rnd() * 7); // G2–C♯3: the tension lands around middle C
    const play = (s: number): Stimulus[] => [notesStim([root, root + s], 0.6)];
    for (const j of JAZZ) {
      names[j.k] = nm(j.en, j.he, ...j.say);
      choiceStim[j.k] = play(j.s);
    }
    return choiceQ({
      id, topic: 'interval-cells', level: lv, seed, skill: 'intervals', difficulty: 1560,
      ask: { en: 'Root, then which tension?', he: 'שורש, ואז איזה טנשן?' }, names, answer: ans.k, choices: shuffleR(rnd, JAZZ.map((j) => j.k)), choiceStim,
      stimulus: play(ans.s),
    });
  },
};
TOPIC_TAGS['interval-cells'] = (l) => (l === 2 ? tg(['intervals', 'compound', 1]) : tg(['intervals', 'melodic', 1]));

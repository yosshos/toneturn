// Symmetry unit (owner 2026-11-19), in the Ear & theory course right after the symmetric scales (scale-types 4: whole
// tone and diminished). Three topics, each with its own mini-lesson (src/content/mini/symmetry.ts):
//   · octave-division  — equal divisions of the octave: 2 → tritone, 3 → augmented triad, 4 → dim7, 6 → whole tone;
//                        by ear; how many transpositions; the tritone substitution and the dim7's four dominants
//   · neo-riemann      — P, L, R on triads, by name and by ear; two-step chains, the hexatonic and octatonic cycles;
//                        the chromatic mediants as chains
//   · interval-vector  — interval classes and the vector <ic1 … ic6>; which of two chords holds a semitone / tritone
// Every answer is computed by src/engine/symmetry.ts (tests/symmetry.test.ts, tests/symmetryUnit.test.ts).

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm, chordStim, notesStim, pcName } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { applyChain, applyOp, chainPath, cycleOf, divisionSet, hasClass, intervalClass, intervalVector, IV_SETS, mod12, OPS, partSize, shortestChains, transpositions, triadName, triadVoicing, unionPcs, vectorText, type Op, type Triad } from './symmetry';

type Names = ChoiceQuestion['names'];
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// ================================================================ shared names

/** The interval of each part (semitones → name). */
const PART: Record<number, { en: string; he: string }> = {
  1: { en: 'Semitone', he: 'חצי טון' },
  2: { en: 'Whole tone', he: 'טון שלם' },
  3: { en: 'Minor 3rd', he: 'טרצה קטנה' },
  4: { en: 'Major 3rd', he: 'טרצה גדולה' },
  6: { en: 'Tritone', he: 'טריטון' },
};
/** The symmetric sets of the unit, by number of parts. */
const SYM_SET: Record<number, { en: string; he: string }> = {
  2: { en: 'Tritone (two notes)', he: 'טריטון (שני צלילים)' },
  3: { en: 'Augmented triad', he: 'משולש מוגדל' },
  4: { en: 'Diminished 7th', he: 'ספטאקורד מוקטן' },
  6: { en: 'Whole-tone scale', he: 'סולם טון שלם' },
};
export const OP_NAMES: Record<Op, { en: string; he: string }> = {
  P: { en: 'P (parallel)', he: 'P (אותו שורש)' },
  L: { en: 'L (leading tone)', he: 'L (צליל מוביל)' },
  R: { en: 'R (relative)', he: 'R (מקביל)' },
};
const opNames = (): Names => Object.fromEntries(OPS.map((o) => [o, nm(OP_NAMES[o].en, OP_NAMES[o].he, o)]));
const chainLabel = (w: Op[]) => w.join(' → ');

/** Two or more triads in a row, each voice-led from the one before (a bass root under each). */
export function triadsStim(ts: Triad[], each = 1.1): Stimulus[] {
  const out: Stimulus[] = [];
  let prev: number[] | undefined;
  for (const t of ts) {
    const v = triadVoicing(t, prev);
    prev = v;
    out.push(chordStim([36 + mod12(t.root - 36) + 12, ...v], each));
  }
  return out;
}

// ================================================================ octave-division

/** Properly spelled diminished 7ths (vii°7 of a harmonic minor), their notes in order up from the root. */
export const DIM7S: { root: string; notes: string[]; pc: number }[] = [
  { root: 'B', notes: ['B', 'D', 'F', 'A♭'], pc: 11 },
  { root: 'C♯', notes: ['C♯', 'E', 'G', 'B♭'], pc: 1 },
  { root: 'F♯', notes: ['F♯', 'A', 'C', 'E♭'], pc: 6 },
  { root: 'G♯', notes: ['G♯', 'B', 'D', 'F'], pc: 8 },
  { root: 'E', notes: ['E', 'G', 'B♭', 'D♭'], pc: 4 },
  { root: 'A', notes: ['A', 'C', 'E♭', 'G♭'], pc: 9 },
];
/** Lower note k of a dim7 a semitone: the dominant 7th on the lowered note (its pitch classes, its root). */
export function lowerDimNote(dimRoot: number, k: number): { pcs: number[]; root: number } {
  const pcs = divisionSet(4, dimRoot);
  pcs[k] = mod12(pcs[k] - 1);
  return { pcs: pcs.slice().sort((a, b) => a - b), root: pcs[k] };
}
/** The dominant 7ths that share the tritone (3rd and 7th) of the one on `r`: only the one a tritone away. */
export const sharesTritone = (a: number, b: number) => {
  const t = (r: number) => [mod12(r + 4), mod12(r + 10)].sort((x, y) => x - y).join(',');
  return t(a) === t(b);
};

TOPIC_GEN['octave-division'] = {
  title: { en: 'Dividing the octave', he: 'חלוקת האוקטבה' },
  skill: 'theory',
  levels: [
    { en: 'Equal parts: which interval?', he: 'חלקים שווים: איזה מרווח?' },
    { en: 'By ear: how many parts?', he: 'בשמיעה: כמה חלקים?' },
    { en: 'How many transpositions?', he: 'כמה טרנספוזיציות?' },
    { en: 'Tritone sub and the dim7', he: 'תחליף טריטון והמוקטן' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'octave-division', level, seed };
    if (level === 2) {
      // Hear a symmetric chord or cycle: into how many equal parts does it split the octave?
      const pool = [2, 3, 4, 6];
      const n = pickR(rnd, pool);
      const root = 55 + Math.floor(rnd() * 8);
      const block = rnd() < 0.5;
      const play = (k: number): Stimulus[] => {
        const up = [...divisionSet(k, 0).map((p) => root + p), root + 12];
        return block && k < 6 ? [chordStim(up.slice(0, -1), 1.3), rest(0.3), notesStim(up, 0.32)] : [notesStim(up, 0.32)];
      };
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const k of pool) {
        names[`n${k}`] = nm(`${k}`, `${k}`, `${k}`);
        choiceStim[`n${k}`] = play(k);
      }
      return choiceQ({
        ...base, skill: 'chords', difficulty: 1530,
        ask: { en: 'Into how many equal parts does it split the octave?', he: 'לכמה חלקים שווים זה מחלק את האוקטבה?' },
        names, answer: `n${n}`, choices: pool.map((k) => `n${k}`), stimulus: play(n), choiceStim,
      });
    }
    if (level === 3) {
      const pool = [2, 3, 4, 6];
      const n = pickR(rnd, pool);
      const right = transpositions(divisionSet(n));
      const opts = shuffleR(rnd, [1, 2, 3, 4, 6]).filter((x) => x !== right).slice(0, 3);
      const choices = shuffleR(rnd, [right, ...opts]);
      const names: Names = {};
      for (const c of choices) names[`t${c}`] = nm(`${c}`, `${c}`, `${c}`);
      return choiceQ({
        ...base, skill: 'theory', difficulty: 1580,
        ask: { en: `${SYM_SET[n].en}: how many different transpositions?`, he: `${SYM_SET[n].he}: כמה טרנספוזיציות שונות?` },
        text: { en: `${SYM_SET[n].en} × ?`, he: `${SYM_SET[n].he} × ?` },
        names, answer: `t${right}`, choices: choices.map((c) => `t${c}`), stimulus: [notesStim([...divisionSet(n, 0).map((p) => 60 + p), 72], 0.3)],
      });
    }
    if (level === 4) {
      if (rnd() < 0.5) {
        // Tritone substitution: the dominant that shares this one's 3rd and 7th.
        const r = pickR(rnd, [7, 2, 9, 4, 11, 5, 10, 3, 8, 0]);
        const cands = [r + 6, r + 1, r + 5, r + 7].map(mod12);
        const right = cands.find((c) => sharesTritone(r, c))!;
        const opts = shuffleR(rnd, cands);
        const names: Names = {};
        for (const c of opts) names[`d${c}`] = nm(`${pcName(c)}7`, `${pcName(c)}7`);
        return choiceQ({
          ...base, skill: 'theory', difficulty: 1620,
          ask: { en: `Which dominant shares the tritone of ${pcName(r)}7?`, he: `איזה דומיננט חולק את הטריטון של ${pcName(r)}7?` },
          text: { en: `${pcName(r)}7 ↔ ?7`, he: `${pcName(r)}7 ↔ ?7` },
          names, answer: `d${right}`, choices: opts.map((c) => `d${c}`), stimulus: [chordStim([43 + mod12(r - 43), ...[4, 10].map((x) => 60 + mod12(r + x - 60))], 1.3)],
        });
      }
      // The dim7's four dominants: lower any one note a semitone.
      const d = pickR(rnd, DIM7S);
      const k = Math.floor(rnd() * 4);
      const all = [0, 1, 2, 3].map((j) => lowerDimNote(d.pc, j).root);
      const right = all[k];
      const opts = shuffleR(rnd, all);
      const names: Names = {};
      for (const c of opts) names[`d${c}`] = nm(`${pcName(c)}7`, `${pcName(c)}7`);
      return choiceQ({
        ...base, skill: 'theory', difficulty: 1640,
        ask: { en: `${d.root}°7: lower the ${d.notes[k]} a half step. Which chord?`, he: `${d.root}°7: מנמיכים את ${d.notes[k]} בחצי טון. איזה אקורד?` },
        text: { en: `${d.root}°7 = ${d.notes.join(' ')}`, he: `${d.root}°7 = ${d.notes.join(' ')}` },
        names, answer: `d${right}`, choices: opts.map((c) => `d${c}`), stimulus: [chordStim(divisionSet(4, d.pc).map((p) => 60 + mod12(p - 60)).sort((a, b) => a - b), 1.3)],
      });
    }
    // level 1: equal parts ↔ the interval of each part
    if (rnd() < 0.6) {
      const n = pickR(rnd, [2, 3, 4, 6, 12]);
      const right = partSize(n);
      const opts = shuffleR(rnd, [1, 2, 3, 4, 6].filter((x) => x !== right)).slice(0, 3);
      const choices = shuffleR(rnd, [right, ...opts]);
      const names: Names = {};
      for (const c of choices) names[`i${c}`] = nm(PART[c].en, PART[c].he);
      return choiceQ({
        ...base, skill: 'theory', difficulty: 1480,
        ask: { en: `Split the octave into ${n} equal parts. Each part is a…?`, he: `מחלקים את האוקטבה ל־${n} חלקים שווים. כל חלק הוא…?` },
        text: { en: `12 ÷ ${n} = ?`, he: `12 ÷ ${n} = ?` },
        names, answer: `i${right}`, choices: choices.map((c) => `i${c}`), stimulus: [],
      });
    }
    const size = pickR(rnd, [2, 3, 4, 6]);
    const right = 12 / size;
    const choices = [2, 3, 4, 6];
    const names: Names = {};
    for (const c of choices) names[`n${c}`] = nm(`${c}`, `${c}`, `${c}`);
    return choiceQ({
      ...base, skill: 'theory', difficulty: 1490,
      ask: { en: `How many ${PART[size].en.toLowerCase()}s fill one octave?`, he: `${PART[size].he}: כמה כאלה באוקטבה אחת?` },
      text: { en: `? × ${PART[size].en.toLowerCase()} = octave`, he: `? × ${PART[size].he} = אוקטבה` },
      names, answer: `n${right}`, choices: choices.map((c) => `n${c}`), stimulus: [],
    });
  },
};
TOPIC_TAGS['octave-division'] = (l) => (l === 2 ? tg(['chords', 'symmetry', 1]) : tg(['theory', 'symmetry', 1]));

// ================================================================ neo-riemann

const START_ROOTS = [0, 2, 4, 5, 7, 9, 10, 3, 8, 1, 6, 11];
const randTriad = (rnd: () => number): Triad => ({ root: pickR(rnd, START_ROOTS), minor: rnd() < 0.4 });

/** The scales the unit compares cycles with (pitch classes from C). */
const CYCLE_SCALES: Record<string, { pcs: number[]; en: string; he: string }> = {
  aug: { pcs: [0, 3, 4, 7, 8, 11], en: 'Augmented scale', he: 'סולם מוגדל' },
  dim: { pcs: [0, 1, 3, 4, 6, 7, 9, 10], en: 'Diminished scale', he: 'סולם מוקטן' },
  wt: { pcs: [0, 2, 4, 6, 8, 10], en: 'Whole-tone scale', he: 'סולם טון שלם' },
  major: { pcs: [0, 2, 4, 5, 7, 9, 11], en: 'Major scale', he: 'סולם מז׳ור' },
};
/** A pitch-class set equals some transposition of a scale. */
export const isTransposedScale = (pcs: number[], scale: number[]) => {
  const key = (xs: number[]) => [...new Set(xs.map(mod12))].sort((a, b) => a - b).join(',');
  return Array.from({ length: 12 }, (_, t) => key(scale.map((p) => p + t))).includes(key(pcs));
};
/** Two-step chains with one P: from a triad they reach its four chromatic mediants (same quality). */
export const MEDIANT_WORDS: Op[][] = [['P', 'L'], ['L', 'P'], ['P', 'R'], ['R', 'P']];

TOPIC_GEN['neo-riemann'] = {
  title: { en: 'P, L, R: one note moves', he: 'P, L, R: צליל אחד זז' },
  skill: 'theory',
  levels: [
    { en: 'Name the move', he: 'איזה מהלך?' },
    { en: 'By ear: which move?', he: 'בשמיעה: איזה מהלך?' },
    { en: 'Two moves; the cycles', he: 'שני מהלכים; המעגלים' },
    { en: 'Chromatic mediants as chains', he: 'מדיאנטות כרומטיות כשרשראות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'neo-riemann', level, seed };
    const t = randTriad(rnd);
    if (level === 1 || level === 2) {
      const op = pickR(rnd, OPS);
      const u = applyOp(t, op);
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const o of OPS) choiceStim[o] = triadsStim([t, applyOp(t, o)]);
      const ear = level === 2;
      return choiceQ({
        ...base, skill: ear ? 'chords' : 'theory', difficulty: ear ? 1570 : 1520,
        ask: ear ? { en: 'Two triads. Which move: P, L or R?', he: 'שני משולשים. איזה מהלך: P, L או R?' } : { en: `${triadName(t)} → ${triadName(u)}: which move?`, he: `${triadName(t)} → ${triadName(u)}: איזה מהלך?` },
        ...(ear ? {} : { text: { en: `${triadName(t)} → ${triadName(u)}`, he: `${triadName(t)} → ${triadName(u)}` } }),
        names: opNames(), answer: op, choices: [...OPS], stimulus: triadsStim([t, u]), choiceStim,
      });
    }
    if (level === 3) {
      const form = rnd();
      if (form < 0.6) {
        // Two moves in a row: where do you land?
        const a = pickR(rnd, OPS);
        const b = pickR(rnd, OPS.filter((o) => o !== a));
        const right = triadName(applyChain(t, [a, b]));
        const others = shuffleR(rnd, OPS.flatMap((x) => OPS.filter((y) => y !== x).map((y) => triadName(applyChain(t, [x, y]))))).filter((n) => n !== right);
        const choices = shuffleR(rnd, [right, ...[...new Set(others)].slice(0, 3)]);
        const names: Names = {};
        for (const c of choices) names[c] = nm(c, c);
        return choiceQ({
          ...base, skill: 'theory', difficulty: 1620,
          ask: { en: `${triadName(t)}, then ${a}, then ${b}. Where do you land?`, he: `${triadName(t)}, ואז ${a}, ואז ${b}. לאן מגיעים?` },
          text: { en: `${triadName(t)} →${a}→ ? →${b}→ ?`, he: `${triadName(t)} →${a}→ ? →${b}→ ?` },
          names, answer: right, choices, stimulus: triadsStim([t]),
        });
      }
      const pair: [Op, Op] = pickR(rnd, [['P', 'L'], ['P', 'R']] as [Op, Op][]);
      const cyc = cycleOf(t, pair[0], pair[1]);
      const word = `${pair[0]}${pair[1]}${pair[0]}${pair[1]}…`;
      if (form < 0.8) {
        // How many triads in the cycle?
        const right = cyc.length;
        const choices = [4, 6, 8, 12];
        const names: Names = {};
        for (const c of choices) names[`c${c}`] = nm(`${c}`, `${c}`, `${c}`);
        return choiceQ({
          ...base, skill: 'theory', difficulty: 1640,
          ask: { en: `${word} from ${triadName(t)}: how many different triads before it comes back?`, he: `${word} מ־${triadName(t)}: כמה משולשים שונים עד שחוזרים?` },
          text: { en: `${triadName(t)} ${word}`, he: `${triadName(t)} ${word}` },
          names, answer: `c${right}`, choices: choices.map((c) => `c${c}`), stimulus: triadsStim(cyc.slice(0, 3), 0.8),
        });
      }
      // Which scale holds every note of the cycle?
      const all = unionPcs(cyc);
      const right = Object.keys(CYCLE_SCALES).find((k) => isTransposedScale(all, CYCLE_SCALES[k].pcs))!;
      const choices = shuffleR(rnd, Object.keys(CYCLE_SCALES));
      const names: Names = {};
      for (const c of choices) names[c] = nm(CYCLE_SCALES[c].en, CYCLE_SCALES[c].he);
      return choiceQ({
        ...base, skill: 'theory', difficulty: 1650,
        ask: { en: `Every triad of the ${word} cycle fits in one scale. Which?`, he: `כל המשולשים במעגל ${word} נכנסים בסולם אחד. איזה?` },
        text: { en: `${pair[0]}${pair[1]} → ?`, he: `${pair[0]}${pair[1]} → ?` },
        names, answer: right, choices, stimulus: triadsStim(cyc.slice(0, 3), 0.8),
      });
    }
    // level 4: a chromatic mediant reached in two moves — which chain?
    const w = pickR(rnd, MEDIANT_WORDS);
    const target = applyChain(t, w);
    const sols = shortestChains(t, target);
    const right = chainLabel(sols[0]);
    const choices = shuffleR(rnd, MEDIANT_WORDS.map(chainLabel));
    const names: Names = {};
    for (const c of choices) names[c] = nm(c, c);
    return choiceQ({
      ...base, skill: 'theory', difficulty: 1690,
      ask: { en: `${triadName(t)} → ${triadName(target)}: which two moves?`, he: `${triadName(t)} → ${triadName(target)}: אילו שני מהלכים?` },
      text: { en: `${triadName(t)} → ? → ${triadName(target)}`, he: `${triadName(t)} → ? → ${triadName(target)}` },
      names, answer: right, choices, stimulus: triadsStim(chainPath(t, sols[0])),
    });
  },
};
TOPIC_TAGS['neo-riemann'] = (l) => (l === 2 ? tg(['chords', 'symmetry', 1]) : tg(['theory', 'symmetry', 1]));

// ================================================================ interval-vector

const IV_INTERVALS: { s: number; en: string; he: string; short: string }[] = [
  { s: 2, en: 'major 2nd', he: 'סקונדה גדולה', short: 'M2' },
  { s: 3, en: 'minor 3rd', he: 'טרצה קטנה', short: 'm3' },
  { s: 4, en: 'major 3rd', he: 'טרצה גדולה', short: 'M3' },
  { s: 5, en: 'perfect 4th', he: 'קוורטה זכה', short: 'P4' },
  { s: 7, en: 'perfect 5th', he: 'קווינטה זכה', short: 'P5' },
  { s: 8, en: 'minor 6th', he: 'סקסטה קטנה', short: 'm6' },
  { s: 9, en: 'major 6th', he: 'סקסטה גדולה', short: 'M6' },
  { s: 10, en: 'minor 7th', he: 'ספטימה קטנה', short: 'm7' },
  { s: 11, en: 'major 7th', he: 'ספטימה גדולה', short: 'M7' },
];
/** The triads of level 1, as chord symbols on C. */
const IV_TRIADS: { k: string; sym: string }[] = [
  { k: 'major', sym: '' },
  { k: 'minor', sym: 'm' },
  { k: 'dim', sym: '°' },
  { k: 'aug', sym: '+' },
  { k: 'sus4', sym: 'sus4' },
];
/** The classes of a set, as a list ("3 · 4 · 5"). */
export const classList = (pcs: number[]): string =>
  intervalVector(pcs)
    .flatMap((n, i) => Array<number>(n).fill(i + 1))
    .join(' · ');
/** Ear pairs: exactly one chord of each holds the class (semitone = ic1, tritone = ic6). */
export const IV_PAIRS: { ic: 1 | 6; a: string; b: string }[] = [
  { ic: 1, a: 'maj7', b: 'dom7' },
  { ic: 1, a: 'maj7', b: 'm7' },
  { ic: 6, a: 'dom7', b: 'maj7' },
  { ic: 6, a: 'm7b5', b: 'm7' },
  { ic: 6, a: 'dim', b: 'minor' },
  { ic: 6, a: 'dim7', b: 'aug' },
];
const VECTOR_POOL = ['major', 'dim', 'aug', 'dom7', 'maj7', 'm7', 'dim7', 'wholetone', 'majorScale'];

TOPIC_GEN['interval-vector'] = {
  title: { en: 'Interval vectors', he: 'וקטור מרווחים' },
  skill: 'theory',
  levels: [
    { en: 'Interval classes in a triad', he: 'מחלקות מרווחים במשולש' },
    { en: 'The vector of a chord', he: 'הווקטור של אקורד' },
    { en: 'By ear: which has a semitone or tritone?', he: 'בשמיעה: באיזה יש חצי טון או טריטון?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'interval-vector', level, seed };
    const root = pickR(rnd, [0, 2, 5, 7, 9, 10, 3]);
    const at = (pcs: number[]) => pcs.map((p) => 60 + mod12(root + p - 60)).sort((a, b) => a - b);
    if (level === 3) {
      const pr = pickR(rnd, IV_PAIRS);
      const flip = rnd() < 0.5;
      const first = flip ? pr.b : pr.a;
      const second = flip ? pr.a : pr.b;
      const right = hasClass(IV_SETS[first].pcs, pr.ic) ? 'first' : 'second';
      const sa = chordStim(at(IV_SETS[first].pcs), 1.2);
      const sb = chordStim(at(IV_SETS[second].pcs), 1.2);
      const what = pr.ic === 1 ? { en: 'a semitone (or major 7th)', he: 'חצי טון (או ספטימה גדולה)' } : { en: 'a tritone', he: 'טריטון' };
      return choiceQ({
        ...base, skill: 'chords', difficulty: 1650,
        ask: { en: `Which chord holds ${what.en}?`, he: `באיזה אקורד יש ${what.he}?` },
        names: { first: nm('First chord', 'האקורד הראשון', 'first'), second: nm('Second chord', 'האקורד השני', 'second') },
        answer: right, choices: ['first', 'second'], stimulus: [sa, rest(0.4), sb], choiceStim: { first: [sa], second: [sb] },
      });
    }
    if (level === 2) {
      const k = pickR(rnd, VECTOR_POOL);
      const right = vectorText(intervalVector(IV_SETS[k].pcs));
      const others = [...new Set(shuffleR(rnd, VECTOR_POOL).map((x) => vectorText(intervalVector(IV_SETS[x].pcs))))].filter((v) => v !== right).slice(0, 3);
      const choices = shuffleR(rnd, [right, ...others]);
      const names: Names = {};
      for (const c of choices) names[c] = nm(c, c);
      const scale = IV_SETS[k].pcs.length > 4;
      return choiceQ({
        ...base, skill: 'theory', difficulty: 1600,
        ask: { en: `${IV_SETS[k].en}: which interval vector?`, he: `${IV_SETS[k].he}: איזה וקטור מרווחים?` },
        text: { en: `${IV_SETS[k].en} → <ic1…ic6>`, he: `${IV_SETS[k].he} → <ic1…ic6>` },
        names, answer: right, choices, stimulus: scale ? [notesStim([...at(IV_SETS[k].pcs), at(IV_SETS[k].pcs)[0] + 12], 0.28)] : [chordStim(at(IV_SETS[k].pcs), 1.2)],
      });
    }
    // level 1: an interval's class, or the classes in a triad
    if (rnd() < 0.4) {
      const iv = pickR(rnd, IV_INTERVALS);
      const right = intervalClass(iv.s);
      const opts = shuffleR(rnd, [1, 2, 3, 4, 5, 6].filter((x) => x !== right)).slice(0, 3);
      const choices = shuffleR(rnd, [right, ...opts]);
      const names: Names = {};
      for (const c of choices) names[`ic${c}`] = nm(`ic${c}`, `ic${c}`);
      return choiceQ({
        ...base, skill: 'theory', difficulty: 1540,
        ask: { en: `A ${iv.en}: which interval class?`, he: `${iv.he}: איזו מחלקת מרווח?` },
        text: { en: `${iv.short} → ic?`, he: `${iv.short} → ic?` },
        names, answer: `ic${right}`, choices: choices.map((c) => `ic${c}`), stimulus: [notesStim([60, 60 + iv.s], 0.6)],
      });
    }
    const tri = pickR(rnd, IV_TRIADS);
    const right = classList(IV_SETS[tri.k].pcs);
    const labels = [...new Set(shuffleR(rnd, IV_TRIADS).map((x) => classList(IV_SETS[x.k].pcs)))].filter((l) => l !== right).slice(0, 3);
    const choices = shuffleR(rnd, [right, ...labels]);
    const names: Names = {};
    for (const c of choices) names[c] = nm(c, c);
    const sym = `${pcName(root)}${tri.sym}`;
    return choiceQ({
      ...base, skill: 'theory', difficulty: 1560,
      ask: { en: `${sym}: which interval classes does it hold?`, he: `${sym}: אילו מחלקות מרווח יש בו?` },
      text: { en: `${sym} → ic ?`, he: `${sym} → ic ?` },
      names, answer: right, choices, stimulus: [chordStim(at(IV_SETS[tri.k].pcs), 1.2)],
    });
  },
};
TOPIC_TAGS['interval-vector'] = (l) => (l === 3 ? tg(['chords', 'symmetry', 1]) : tg(['theory', 'symmetry', 1]));

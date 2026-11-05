// Topics that complete the skill map (product owner): tempo & pulse, every interval by ear, minor-key and
// chromatic degrees, sight-reading without singing. Pure, seeded.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, eventsStim, nm } from './topicKit';

// ---------------------------------------------------------------- Tempo & pulse

/** A click track: `beats` clicks at `bpm` (accent every 4), optionally drifting to `bpm2` by the end. */
function clicks(bpm: number, beats: number, bpm2 = bpm): Stimulus {
  const ev: NoteEvent[] = [];
  let t = 0;
  for (let i = 0; i < beats; i++) {
    ev.push({ midi: i % 4 === 0 ? 96 : 86, start: t, duration: 0.05, velocity: i % 4 === 0 ? 0.65 : 0.45 });
    const b = bpm + ((bpm2 - bpm) * i) / Math.max(1, beats - 1);
    t += 60 / b;
  }
  return eventsStim(ev, t + 0.2);
}
const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const bpmName = (b: number) => nm(`${b} BPM`, `${b} BPM`, String(b), `${b} bpm`);

TOPIC_GEN['tempo'] = {
  title: { en: 'Tempo & pulse', he: 'טמפו ופעמה' },
  skill: 'tempo',
  levels: [
    { en: 'Faster or slower? (15%)', he: 'מהיר או איטי? (15%)' },
    { en: 'Speeding up, slowing down or steady?', he: 'מאיץ, מאט או יציב?' },
    { en: 'Which tempo? (60–150)', he: 'איזה טמפו? (60–150)' },
    { en: 'Faster or slower? (5%)', he: 'מהיר או איטי? (5%)' },
    { en: 'Which tempo? (12 BPM apart)', he: 'איזה טמפו? (12 BPM הפרש)' },
    { en: 'Which tempo? (6 BPM apart)', he: 'איזה טמפו? (6 BPM הפרש)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level === 1 || level === 4) {
      const base = 76 + Math.floor(rnd() * 50);
      const k = level === 1 ? 0.15 : 0.05;
      const answer = rnd() < 0.5 ? 'faster' : 'slower';
      const play = (a: string): Stimulus[] => [clicks(base, 6), rest(0.7), clicks(Math.round(base * (a === 'faster' ? 1 + k : 1 - k)), 6)];
      return choiceQ({
        id, topic: 'tempo', level, seed, skill: 'tempo', difficulty: level === 1 ? 1000 : 1420,
        ask: { en: 'Is the second pulse faster or slower?', he: 'הפעמה השנייה מהירה או איטית יותר?' },
        names: { faster: nm('Faster', 'מהיר יותר', 'faster', 'quicker', 'מהיר'), slower: nm('Slower', 'איטי יותר', 'slower', 'איטי') },
        answer, choices: ['faster', 'slower'], stimulus: play(answer), choiceStim: { faster: play('faster'), slower: play('slower') },
      });
    }
    if (level === 2) {
      const base = 84 + Math.floor(rnd() * 40);
      const answer = pickR(rnd, ['up', 'down', 'steady']);
      const play = (a: string): Stimulus[] => [clicks(base, 10, a === 'up' ? base * 1.12 : a === 'down' ? base * 0.88 : base)];
      return choiceQ({
        id, topic: 'tempo', level, seed, skill: 'tempo', difficulty: 1150,
        ask: { en: 'Is the pulse speeding up, slowing down, or steady?', he: 'הפעמה מאיצה, מאטה, או יציבה?' },
        names: { up: nm('Speeding up', 'מאיצה', 'speeding up', 'accelerando', 'faster', 'מאיץ'), down: nm('Slowing down', 'מאטה', 'slowing down', 'ritardando', 'slower', 'מאט'), steady: nm('Steady', 'יציבה', 'steady', 'same', 'יציב') },
        answer, choices: ['up', 'down', 'steady'], stimulus: play(answer), choiceStim: { up: play('up'), down: play('down'), steady: play('steady') },
      });
    }
    // Which tempo: one click track, pick its BPM.
    const step = level === 3 ? 30 : level === 5 ? 12 : 6;
    const options = level === 3 ? [60, 90, 120, 150] : (() => {
      const c = 72 + Math.floor(rnd() * 60);
      return [c - step, c, c + step, c + 2 * step].map((x) => Math.round(x));
    })();
    const answer = pickR(rnd, options);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const o of options) {
      names[String(o)] = bpmName(o);
      choiceStim[String(o)] = [clicks(o, 8)];
    }
    return choiceQ({
      id, topic: 'tempo', level, seed, skill: 'tempo', difficulty: level === 3 ? 1250 : level === 5 ? 1500 : 1680,
      ask: { en: 'What is the tempo?', he: 'מה הטמפו?' },
      names, answer: String(answer), choices: options.map(String), stimulus: [clicks(answer, 8)], choiceStim,
    });
  },
};

// ---------------------------------------------------------------- Every interval by ear

const IV = [
  { s: 1, en: 'minor 2nd', he: 'סקונדה קטנה', say: ['m2', 'half step', 'semitone'] },
  { s: 2, en: 'major 2nd', he: 'סקונדה גדולה', say: ['M2', 'whole step', 'tone'] },
  { s: 3, en: 'minor 3rd', he: 'טרצה קטנה', say: ['m3'] },
  { s: 4, en: 'major 3rd', he: 'טרצה גדולה', say: ['M3'] },
  { s: 5, en: 'perfect 4th', he: 'קוורטה זכה', say: ['P4', 'fourth'] },
  { s: 6, en: 'tritone', he: 'טריטון', say: ['#4', 'b5', 'augmented fourth', 'diminished fifth', 'טריטון'] },
  { s: 7, en: 'perfect 5th', he: 'קווינטה זכה', say: ['P5', 'fifth'] },
  { s: 8, en: 'minor 6th', he: 'סקסטה קטנה', say: ['m6'] },
  { s: 9, en: 'major 6th', he: 'סקסטה גדולה', say: ['M6'] },
  { s: 10, en: 'minor 7th', he: 'ספטימה קטנה', say: ['m7'] },
  { s: 11, en: 'major 7th', he: 'ספטימה גדולה', say: ['M7'] },
  { s: 12, en: 'octave', he: 'אוקטבה', say: ['P8', 'eight'] },
];

TOPIC_GEN['intervals-all'] = {
  title: { en: 'Every interval by ear', he: 'כל המרווחים בשמיעה' },
  skill: 'intervals',
  levels: [
    { en: 'Up: 3rds, 4th, 5th, octave', he: 'עולים: טרצות, קוורטה, קווינטה, אוקטבה' },
    { en: 'Up: all twelve', he: 'עולים: כל השנים־עשר' },
    { en: 'Together (harmonic)', he: 'ביחד (הרמוני)' },
    { en: 'Down', he: 'יורדים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? IV.filter((x) => [3, 4, 5, 7, 12].includes(x.s)) : IV;
    const ans = pickR(rnd, pool);
    const choices = level === 1 ? pool : shuffleR(rnd, [ans, ...IV.filter((x) => x !== ans).sort((a, b) => Math.abs(a.s - ans.s) - Math.abs(b.s - ans.s)).slice(0, 3)]);
    const low = 55 + Math.floor(rnd() * 8);
    const play = (s: number): Stimulus[] => (level === 3 ? [chordStim([low, low + s], 1.8)] : level === 4 ? [notesStim([low + 12, low + 12 - s], 0.8)] : [notesStim([low, low + s], 0.8)]);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const c of choices) {
      names[`i${c.s}`] = nm(c.en, c.he, ...c.say);
      choiceStim[`i${c.s}`] = play(c.s);
    }
    return choiceQ({
      id, topic: 'intervals-all', level, seed, skill: 'intervals', difficulty: [1050, 1250, 1380, 1450][level - 1],
      ask: { en: 'Which interval?', he: 'איזה מרווח?' },
      names, answer: `i${ans.s}`, choices: choices.map((c) => `i${c.s}`), stimulus: play(ans.s), choiceStim,
    });
  },
};

// ---------------------------------------------------------------- Degrees in minor, chromatic degrees

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const CHROM: { d: string; s: number; say: string[] }[] = [
  { d: '♭2', s: 1, say: ['flat two'] },
  { d: '♭3', s: 3, say: ['flat three'] },
  { d: '♯4', s: 6, say: ['sharp four', 'flat five'] },
  { d: '♭6', s: 8, say: ['flat six'] },
  { d: '♭7', s: 10, say: ['flat seven'] },
];

TOPIC_GEN['degrees-ext'] = {
  title: { en: 'Degrees in minor & chromatic degrees', he: 'דרגות במינור ודרגות כרומטיות' },
  skill: 'degrees',
  levels: [
    { en: 'All degrees in a minor key', he: 'כל הדרגות בסולם מינורי' },
    { en: 'Chromatic degrees in major (♭3, ♯4, ♭7…)', he: 'דרגות כרומטיות במז׳ור (♭3, ♯4, ♭7…)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = 55 + Math.floor(rnd() * 7);
    if (level === 1) {
      const cad: Stimulus[] = [chordStim([t - 12, t + 3, t + 7], 0.7), chordStim([t - 7, t + 5, t + 8], 0.7), chordStim([t - 5, t + 4, t + 7, t + 10], 0.7), chordStim([t - 12, t + 3, t + 7], 1.1), rest(0.3)];
      const d = 1 + Math.floor(rnd() * 7);
      const names: ChoiceQuestion['names'] = {};
      for (let k = 1; k <= 7; k++) names[String(k)] = nm(String(k), String(k), ['one', 'two', 'three', 'four', 'five', 'six', 'seven'][k - 1]);
      return choiceQ({
        id, topic: 'degrees-ext', level, seed, skill: 'degrees', difficulty: 1300,
        ask: { en: 'In this minor key — which degree?', he: 'בסולם המינורי הזה — איזו דרגה?' },
        names, answer: String(d), choices: ['1', '2', '3', '4', '5', '6', '7'], stimulus: [...cad, { kind: 'note', midi: t + MINOR[d - 1], duration: 1.4 }],
      });
    }
    const cad: Stimulus[] = [chordStim([t - 12, t + 4, t + 7], 0.7), chordStim([t - 7, t + 5, t + 9], 0.7), chordStim([t - 5, t + 2, t + 5, t + 7], 0.7), chordStim([t - 12, t + 4, t + 7], 1.1), rest(0.3)];
    const ans = pickR(rnd, CHROM);
    const pool = shuffleR(rnd, [ans, ...shuffleR(rnd, CHROM.filter((c) => c !== ans)).slice(0, 2)]);
    const diatonic = pickR(rnd, [['2', 2], ['3', 4], ['4', 5], ['6', 9], ['7', 11]] as [string, number][]);
    const names: ChoiceQuestion['names'] = {};
    for (const c of pool) names[c.d] = nm(c.d, c.d, ...c.say);
    names[diatonic[0]] = nm(diatonic[0], diatonic[0]);
    return choiceQ({
      id, topic: 'degrees-ext', level, seed, skill: 'degrees', difficulty: 1500,
      ask: { en: 'Which degree — maybe a chromatic one?', he: 'איזו דרגה — אולי כרומטית?' },
      names, answer: ans.d, choices: shuffleR(rnd, [...pool.map((c) => c.d), diatonic[0]]), stimulus: [...cad, { kind: 'note', midi: t + ans.s, duration: 1.4 }],
    });
  },
};

// ---------------------------------------------------------------- Sight-reading without singing

const MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14];
const KEYS: { pc: number; name: string }[] = [
  { pc: 0, name: 'C' },
  { pc: 7, name: 'G' },
  { pc: 5, name: 'F' },
  { pc: 2, name: 'D' },
  { pc: 10, name: 'Bb' },
];

function melody(rnd: () => number, n: number, leap: number): number[] {
  const out = [0];
  for (let i = 1; i < n; i++) out.push(Math.max(0, Math.min(8, out[i - 1] + pickR(rnd, leap > 2 ? [-3, -2, -1, 1, 2, 3, 4] : [-2, -1, 1, 1, 2]))));
  return out;
}

TOPIC_GEN['sight-read'] = {
  title: { en: 'Sight-reading by ear', he: 'קריאה מהדף בשמיעה' },
  skill: 'sight',
  levels: [
    { en: 'Does it match the notes?', he: 'זה תואם לתווים?' },
    { en: 'Which note was played differently?', he: 'איזה צליל נוגן אחרת?' },
    { en: 'Longer lines with leaps', he: 'שורות ארוכות עם קפיצות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, KEYS);
    const base = 60 + key.pc - (key.pc > 5 ? 12 : 0);
    const n = level === 1 ? 4 : level === 2 ? 6 : 8;
    const degs = melody(rnd, n, level === 3 ? 3 : 2);
    const written = degs.map((d) => base + MAJ[d]);
    const show = { midis: written, key: { letter: key.name[0] as 'C', acc: (key.name[1] === 'b' ? -1 : 0) as 0 } };
    const changed = (pos: number) => written.map((m, i) => (i === pos ? base + MAJ[Math.max(0, Math.min(8, degs[i] + (degs[i] >= 7 ? -1 : 1)))] : m));
    if (level === 1) {
      const same = rnd() < 0.5;
      const pos = 1 + Math.floor(rnd() * (n - 1));
      const play = (s: string): Stimulus[] => [notesStim(s === 'yes' ? written : changed(pos), 0.55)];
      return choiceQ({
        id, topic: 'sight-read', level, seed, skill: 'sight', difficulty: 1100,
        ask: { en: 'Read the notes, then listen: does it match?', he: 'קראו את התווים, ואז הקשיבו: זה תואם?' },
        names: { yes: nm('It matches', 'תואם', 'yes', 'matches', 'same', 'כן'), no: nm('Something differs', 'משהו שונה', 'no', 'different', 'לא') },
        answer: same ? 'yes' : 'no', choices: ['yes', 'no'], stimulus: play(same ? 'yes' : 'no'), choiceStim: { yes: play('yes'), no: play('no') }, show,
      });
    }
    const pos = 1 + Math.floor(rnd() * (n - 1));
    const keys = Array.from({ length: n - 1 }, (_, i) => `n${i + 2}`);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    keys.forEach((k, i) => {
      names[k] = nm(`Note ${i + 2}`, `צליל ${i + 2}`, String(i + 2), `${['second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][i]}`);
      choiceStim[k] = [notesStim(changed(i + 1), 0.55)];
    });
    return choiceQ({
      id, topic: 'sight-read', level, seed, skill: 'sight', difficulty: level === 2 ? 1300 : 1500,
      ask: { en: 'Read along — which note was played differently?', he: 'קראו יחד — איזה צליל נוגן אחרת?' },
      names, answer: `n${pos + 1}`, choices: keys, stimulus: [notesStim(changed(pos), 0.55)], choiceStim, show,
    });
  },
};

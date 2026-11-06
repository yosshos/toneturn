// Topics that complete the skill map (product owner): tempo & pulse, every interval by ear, minor-key and
// chromatic degrees, sight-reading without singing. Pure, seeded.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { factItem, factQuestion, SILENT_TOPICS } from './theoryFacts';
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

// ---------------------------------------------------------------- Sight-reading, deeper levels (bass clef, minor, three versions)

const MIN_SCALE = [0, 2, 3, 5, 7, 8, 10, 12, 14];
const MINOR_KEYS: { pc: number; name: string }[] = [
  { pc: 9, name: 'A' },
  { pc: 4, name: 'E' },
  { pc: 2, name: 'D' },
  { pc: 7, name: 'G' },
  { pc: 0, name: 'C' },
];
const ORD = ['second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
const ordinal = (k: number) => ({ en: ['First', 'Second', 'Third'][k], he: ['הראשונה', 'השנייה', 'השלישית'][k], say: [['one', 'first', 'אחת', 'ראשונה'], ['two', 'second', 'שתיים', 'שנייה'], ['three', 'third', 'שלוש', 'שלישית']][k] });
const ordNames = (prefix: string, n: number): ChoiceQuestion['names'] =>
  Object.fromEntries(Array.from({ length: n }, (_, k) => {
    const o = ordinal(k);
    return [`${prefix}${k + 1}`, nm(o.en, o.he, ...o.say)];
  }));
/** A short high blip that numbers each version (1, 2, 3). */
const blip = (i: number): Stimulus => ({ kind: 'note', midi: 84 + i * 2, duration: 0.15 });

const sightBase = TOPIC_GEN['sight-read'];
TOPIC_GEN['sight-read'] = {
  ...sightBase,
  levels: [
    ...sightBase.levels,
    { en: 'Bass clef', he: 'מפתח פה' },
    { en: 'Minor keys, with leaps', he: 'סולמות מינוריים, עם קפיצות' },
    { en: 'Three versions — which one is written?', he: 'שלוש גרסאות — איזו כתובה?' },
  ],
  gen(seed, level, id) {
    if (level <= 3) return sightBase.gen(seed, level, id);
    const rnd = rng(seed);
    const minor = level === 5;
    const k = minor ? pickR(rnd, MINOR_KEYS) : pickR(rnd, KEYS);
    const scale = minor ? MIN_SCALE : MAJ;
    const bass = level === 4;
    // Tonic around G3 (treble) or G2 (bass), so the line sits on the staff.
    const base = (bass ? 43 : 55) + ((k.pc - 7 + 12) % 12);
    const n = level === 4 ? 6 : 8;
    const degs = melody(rnd, n, level === 4 ? 2 : 3);
    const written = degs.map((d) => base + scale[d]);
    const show: ChoiceQuestion['show'] = { midis: written, clef: bass ? 'bass' : 'treble', key: minor ? null : ({ letter: k.name[0], acc: k.name[1] === 'b' ? -1 : 0 } as never) };
    const changed = (pos: number, dir = 1) => written.map((m, i) => (i === pos ? base + scale[Math.max(0, Math.min(8, degs[i] + (degs[i] >= 7 ? -dir : dir)))] : m));
    if (level === 6) {
      // Three versions: the written one and two with one note changed. Hear all three, pick the written one.
      const p1 = 1 + Math.floor(rnd() * (n - 1));
      let p2 = 1 + Math.floor(rnd() * (n - 1));
      if (p2 === p1) p2 = p1 === n - 1 ? 1 : p1 + 1;
      const versions = shuffleR(rnd, [
        { key: 'w', midis: written },
        { key: 'x', midis: changed(p1) },
        { key: 'y', midis: changed(p2, -1) },
      ]);
      const answer = `v${versions.findIndex((v) => v.key === 'w') + 1}`;
      const stim: Stimulus[] = versions.flatMap((v, i) => [blip(i), rest(0.25), notesStim(v.midis, 0.42), rest(0.8)]);
      return choiceQ({
        id, topic: 'sight-read', level, seed, skill: 'sight', difficulty: 1680,
        ask: { en: 'Read the line. Three versions play — which one is written?', he: 'קראו את השורה. מתנגנות שלוש גרסאות — איזו כתובה?' },
        names: ordNames('v', 3), answer, choices: ['v1', 'v2', 'v3'], stimulus: stim, show,
      });
    }
    const pos = 1 + Math.floor(rnd() * (n - 1));
    const keys = Array.from({ length: n - 1 }, (_, i) => `n${i + 2}`);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    keys.forEach((kk, i) => {
      names[kk] = nm(`Note ${i + 2}`, `צליל ${i + 2}`, String(i + 2), ORD[i]);
      choiceStim[kk] = [notesStim(changed(i + 1), 0.5)];
    });
    return choiceQ({
      id, topic: 'sight-read', level, seed, skill: 'sight', difficulty: bass ? 1530 : 1560,
      ask: minor
        ? { en: `Read along in ${k.name} minor — which note was played differently?`, he: `קראו יחד ב־${k.name} מינור — איזה צליל נוגן אחרת?` }
        : { en: 'Bass clef: read along — which note was played differently?', he: 'מפתח פה: קראו יחד — איזה צליל נוגן אחרת?' },
      names, answer: `n${pos + 1}`, choices: keys, stimulus: [notesStim(changed(pos), 0.5)], choiceStim, show,
    });
  },
};

// ---------------------------------------------------------------- Rhythm memory (memory domain)

/** A rhythm as durations in eighths, filling `bars` bars of 4/4. */
export function rhythmCells(rnd: () => number, bars: number, busy: boolean): number[] {
  const out: number[] = [];
  for (let b = 0; b < bars; b++) {
    let left = 8;
    while (left > 0) {
      const opts = (busy ? [1, 1, 2, 2, 3, 4] : [2, 2, 4, 1, 1]).filter((d) => d <= left);
      const d = pickR(rnd, opts);
      out.push(d);
      left -= d;
    }
  }
  return out;
}
function rhythmStim(durs: number[], bpm = 100): Stimulus {
  const e = 30 / bpm;
  const ev: NoteEvent[] = [];
  let t = 0;
  durs.forEach((d, i) => {
    ev.push({ midi: 76, start: t, duration: Math.min(0.12, d * e * 0.6), velocity: i === 0 ? 0.7 : 0.55 });
    t += d * e;
  });
  return eventsStim(ev, t + 0.1);
}
/** The same rhythm with one onset moved by an eighth (the total stays the same). Always differs. */
export function nudge(rnd: () => number, durs: number[]): number[] {
  const idx = durs.map((d, i) => ({ d, i })).filter(({ d, i }) => i < durs.length - 1 && d >= 2).map(({ i }) => i);
  if (!idx.length) {
    // All eighths (or one long note): merge the first two, or split the first.
    return durs.length > 1 ? [durs[0] + durs[1], ...durs.slice(2)] : [1, durs[0] - 1];
  }
  const i = pickR(rnd, idx);
  const out = durs.slice();
  out[i] -= 1;
  out[i + 1] += 1;
  return out;
}
export const sameRhythm = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

TOPIC_GEN['rhythm-memory'] = {
  title: { en: 'Rhythm memory', he: 'זיכרון ריתמי' },
  skill: 'rhythm',
  levels: [
    { en: 'One bar: same or different?', he: 'תיבה אחת: אותו דבר או שונה?' },
    { en: 'Two bars: same or different?', he: 'שתי תיבות: אותו דבר או שונה?' },
    { en: 'Remember it through three others', he: 'לזכור אותו דרך שלושה אחרים' },
    { en: 'Four bars, one note moved', he: 'ארבע תיבות, צליל אחד זז' },
    { en: 'Four bars through three others', he: 'ארבע תיבות דרך שלושה אחרים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const bars = level === 1 ? 1 : level >= 4 ? 4 : 2;
    const a = rhythmCells(rnd, bars, level >= 2);
    if (level === 3 || level === 5) {
      // Hear a rhythm, then three candidates: which one was it?
      const b = nudge(rnd, a);
      let c = rhythmCells(rnd, bars, true);
      if (sameRhythm(c, a) || sameRhythm(c, b)) c = nudge(rnd, b);
      const cands = shuffleR(rnd, [{ k: 'a', d: a }, { k: 'b', d: b }, { k: 'c', d: c }]);
      return choiceQ({
        id, topic: 'rhythm-memory', level, seed, skill: 'rhythm', difficulty: level === 5 ? 1720 : 1380,
        ask: { en: 'Remember the first rhythm. Which of the three that follow is it?', he: 'זכרו את המקצב הראשון. איזה משלושת הבאים הוא?' },
        names: ordNames('r', 3), answer: `r${cands.findIndex((x) => x.k === 'a') + 1}`, choices: ['r1', 'r2', 'r3'],
        stimulus: [rhythmStim(a), rest(1.4), ...cands.flatMap((x, i) => [blip(i), rest(0.35), rhythmStim(x.d), rest(0.9)])],
      });
    }
    const isSame = rnd() < 0.5;
    const b = nudge(rnd, a);
    const play = (s: boolean): Stimulus[] => [rhythmStim(a), rest(1.1), rhythmStim(s ? a : b)];
    return choiceQ({
      id, topic: 'rhythm-memory', level, seed, skill: 'rhythm', difficulty: [1000, 1200, 1380, 1580][level - 1],
      ask: { en: 'Two rhythms: the same, or different?', he: 'שני מקצבים: אותו דבר, או שונים?' },
      names: { same: nm('The same', 'אותו דבר', 'same', 'the same', 'זהה', 'אותו'), diff: nm('Different', 'שונים', 'different', 'not the same', 'שונה') },
      answer: isSame ? 'same' : 'diff', choices: ['same', 'diff'], stimulus: play(isSame), choiceStim: { same: play(true), diff: play(false) },
    });
  },
};

// ---------------------------------------------------------------- Chord memory: which chord changed? (memory domain)

const TRIADS: Record<string, number[]> = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16] };
const triad = (root: number, rn: string) => {
  const t = TRIADS[rn];
  return [root - 12 + t[0], root + t[1], root + t[2], root + t[0] + 12];
};

TOPIC_GEN['chord-memory'] = {
  title: { en: 'Chord memory', he: 'זיכרון הרמוני' },
  skill: 'sequences',
  levels: [
    { en: 'Three chords: which one changed?', he: 'שלושה אקורדים: איזה השתנה?' },
    { en: 'Four chords', he: 'ארבעה אקורדים' },
    { en: 'Six chords', he: 'שישה אקורדים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const n = level === 1 ? 3 : level === 2 ? 4 : 6;
    const root = 57 + Math.floor(rnd() * 7);
    const prog = ['I'];
    while (prog.length < n) prog.push(pickR(rnd, Object.keys(TRIADS).filter((r) => r !== prog[prog.length - 1])));
    const pos = 1 + Math.floor(rnd() * (n - 1));
    const changed = (p: number) => prog.map((r, i) => (i === p ? pickR(rng(seed + p), Object.keys(TRIADS).filter((x) => x !== r && x !== prog[i - 1] && x !== prog[i + 1])) : r));
    const play = (rs: string[]): Stimulus[] => rs.map((r) => chordStim(triad(root, r), 0.85));
    const keys = Array.from({ length: n - 1 }, (_, i) => `c${i + 2}`);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    keys.forEach((k, i) => {
      names[k] = nm(`Chord ${i + 2}`, `אקורד ${i + 2}`, String(i + 2), ORD[i]);
      choiceStim[k] = [...play(prog), rest(1), ...play(changed(i + 1))];
    });
    return choiceQ({
      id, topic: 'chord-memory', level, seed, skill: 'sequences', difficulty: [1150, 1350, 1560][level - 1],
      ask: { en: 'The progression plays twice. Which chord changed the second time?', he: 'המהלך מתנגן פעמיים. איזה אקורד השתנה בפעם השנייה?' },
      names, answer: `c${pos + 1}`, choices: keys, stimulus: choiceStim[`c${pos + 1}`], choiceStim,
    });
  },
};

// ---------------------------------------------------------------- Call & response (improvisation by ear)

const line = (t: number, ds: number[]) => ds.map((d) => t + MAJ[d]);

TOPIC_GEN['call-response'] = {
  title: { en: 'Call & response', he: 'שאלה ותשובה' },
  skill: 'improv',
  levels: [
    { en: 'Which answer sounds finished?', he: 'איזו תשובה נשמעת גמורה?' },
    { en: 'Which answer fits the chord?', he: 'איזו תשובה מתאימה לאקורד?' },
    { en: 'Which answer echoes the call?', he: 'איזו תשובה מהדהדת את השאלה?' },
    { en: 'In minor: which answer lands on the chord?', he: 'במינור: איזו תשובה נוחתת על האקורד?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = 60 + Math.floor(rnd() * 5);
    const call = pickR(rnd, [[0, 1, 2, 4], [2, 4, 5, 4], [4, 2, 3, 1], [0, 2, 4, 5]]);
    let good: number[];
    let bad: number[];
    let ask: { en: string; he: string };
    let backing: Stimulus | null = null;
    if (level === 1) {
      // Finished = lands on the home note; open = stops on 2 or 7.
      good = pickR(rnd, [[4, 3, 1, 0], [2, 1, 1, 0], [5, 4, 2, 0]]);
      bad = pickR(rnd, [[4, 3, 2, 1], [2, 3, 5, 6], [0, 2, 3, 1]]);
      ask = { en: 'A call, then two answers. Which answer sounds finished (lands home)?', he: 'שאלה, ואחריה שתי תשובות. איזו תשובה נשמעת גמורה (נוחתת בבית)?' };
    } else if (level === 2) {
      // Over a held IV chord (F A C in C): chord tones vs leaning on 7 and 5-against-4 clashes (B, E… in C).
      backing = chordStim([t - 7, t + 5, t + 9]);
      good = pickR(rnd, [[3, 5, 7, 5], [5, 3, 0, 3], [7, 5, 3, 5]]);
      bad = pickR(rnd, [[6, 6, 2, 6], [2, 6, 2, 2], [6, 2, 6, 6]]);
      ask = { en: 'Over the chord: which answer fits it best?', he: 'מעל האקורד: איזו תשובה מתאימה לו יותר?' };
    } else if (level === 4) {
      // Over the minor i chord (A C E — the relative minor of the key): an answer that lands on a chord tone
      // vs one that stops on the 2nd, 4th or 6th of the minor key.
      backing = chordStim([t - 3 - 12, t, t + 4]);
      // Degree indices of C major: 0 C, 1 D, 2 E, 3 F, 4 G, 5 A, 6 B, 7 C. Good answers end on C or A; open
      // ones on D, B or F.
      good = pickR(rnd, [[4, 3, 2, 0], [2, 3, 4, 5], [7, 6, 5, 5]]);
      bad = pickR(rnd, [[4, 3, 2, 1], [2, 3, 4, 6], [0, 1, 3, 3]]);
      ask = { en: 'In minor, over the chord: which answer lands on a chord note?', he: 'במינור, מעל האקורד: איזו תשובה נוחתת על צליל של האקורד?' };
    } else {
      // Echo: the answer repeats the call's shape a step higher (a sequence) vs an unrelated line.
      good = call.map((d) => d + 1);
      bad = [6, 3, 0, 2];
      ask = { en: 'Which answer echoes the call (the same shape, moved)?', he: 'איזו תשובה מהדהדת את השאלה (אותה צורה, במקום אחר)?' };
    }
    const firstGood = rnd() < 0.5;
    const [a1, a2] = firstGood ? [good, bad] : [bad, good];
    // The call and the answer as one timed phrase; over a chord, the chord is held under the whole phrase.
    const phrase = (ans: number[]): Stimulus[] => {
      const ev: NoteEvent[] = [];
      const notes = [...line(t, call).map((m, i) => ({ m, at: i * 0.32 })), ...line(t, ans).map((m, i) => ({ m, at: 4 * 0.32 + 0.35 + i * 0.32 }))];
      for (const x of notes) ev.push({ midi: x.m + 12, start: x.at, duration: 0.3, velocity: 0.7 });
      const len = notes[notes.length - 1].at + 0.5;
      if (backing && backing.kind === 'chord') for (const m of backing.midis) ev.push({ midi: m, start: 0, duration: len, velocity: 0.32 });
      return [eventsStim(ev, len)];
    };
    const stim: Stimulus[] = [
      ...(level === 1 ? [chordStim([t - 12, t + 4, t + 7], 0.9), rest(0.3)] : []),
      blip(0), rest(0.25),
      ...phrase(a1),
      rest(1),
      blip(1), rest(0.25),
      ...phrase(a2),
    ];
    return choiceQ({
      id, topic: 'call-response', level, seed, skill: 'improv', difficulty: [1050, 1250, 1400, 1560][level - 1],
      ask,
      names: { a1: nm('First answer', 'התשובה הראשונה', 'one', 'first', 'אחת', 'ראשונה'), a2: nm('Second answer', 'התשובה השנייה', 'two', 'second', 'שתיים', 'שנייה') },
      answer: firstGood ? 'a1' : 'a2', choices: ['a1', 'a2'], stimulus: stim,
    });
  },
};

// ---------------------------------------------------------------- Truth or Bluff as a practice topic (silent theory)

TOPIC_GEN['theory-facts'] = {
  title: { en: 'Truth or Bluff: theory', he: 'אמת או בלוף: תיאוריה' },
  skill: 'theory',
  levels: [
    { en: 'Basics: notes, rhythm, keys', he: 'יסודות: תווים, מקצב, סולמות' },
    { en: 'Intervals, chords, scales, the circle', he: 'מרווחים, אקורדים, סולמות, המעגל' },
    { en: 'Modes, harmony, jazz', he: 'מודוסים, הרמוניה, ג׳אז' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const topics = SILENT_TOPICS.filter((x) => x !== 'trio');
    const f = factItem(topics, level as 1 | 2 | 3, rnd);
    return { ...(factQuestion(id, f, seed) as ChoiceQuestion), topic: 'theory-facts', level };
  },
};

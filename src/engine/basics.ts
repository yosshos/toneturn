// Ear basics for non-musicians (product owner, 2026-11-06) and transposition (same tune, another key).
//
// Basics: no words needed — higher or lower, same or different, the shape of a melody, a steady beat, and
// matching a note with your voice. They open the path for curious listeners and hobbyists (intake track), and
// live as practice topics for everyone.
//
// Transposition: a melody (shown by name or played) in one key, given in another key or moved by an interval —
// recognised (choice), named (say or tap the names) or sung. A skill of its own ('transpose', in the reading &
// theory domain): it joins knowing the notes, hearing the shape and placing it anywhere.
// Pure, seeded.

import type { ChoiceQuestion, LessonDef, NameSeqQuestion, Question, SingSeqQuestion, Stimulus } from './lesson';
import type { PitchClass } from './pitch';
import { mulberry32, nameSeqQuestion, placeInRange, singQuestion, singSeqQuestion } from './lesson';
import { displayNote, majorScale, pc, pcValue } from './pitch';
import { TOPIC_GEN, choiceQ, eventsStim, nm, notesStim, pickR, rng, shuffleR } from './topicKit';
import './topicsSkills'; // 'tempo' (used by the beat lesson)

const rest = (d: number): Stimulus => ({ kind: 'rest', duration: d });
const nameEn = (p: PitchClass) => displayNote(p, 'letter', 'en');
const nameHe = (p: PitchClass) => displayNote(p, 'solfege', 'he');
const MAJ = [0, 2, 4, 5, 7, 9, 11];

// ================================================================ Ear basics

TOPIC_GEN['basics-highlow'] = {
  title: { en: 'Higher or lower?', he: 'גבוה או נמוך?' },
  skill: 'pitch',
  levels: [
    { en: 'Big jumps', he: 'קפיצות גדולות' },
    { en: 'Smaller jumps', he: 'קפיצות קטנות יותר' },
    { en: 'Steps — or the same note', he: 'צעדים — או אותו צליל' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const a = 55 + Math.floor(rnd() * 12);
    const sizes = level === 1 ? [7, 9, 12] : level === 2 ? [3, 4, 5] : [1, 2];
    const opts = level === 3 ? ['higher', 'lower', 'same'] : ['higher', 'lower'];
    const answer = pickR(rnd, opts);
    const d = pickR(rnd, sizes);
    const b = answer === 'higher' ? a + d : answer === 'lower' ? a - d : a;
    const play = (x: string): Stimulus[] => [notesStim([a, x === 'higher' ? a + d : x === 'lower' ? a - d : a], 0.9)];
    return choiceQ({
      id, topic: 'basics-highlow', level, seed, skill: 'pitch', difficulty: [700, 820, 960][level - 1],
      ask: { en: 'Is the second note higher or lower?', he: 'הצליל השני גבוה יותר או נמוך יותר?' },
      names: { higher: nm('Higher ⬆', 'גבוה יותר ⬆', 'higher', 'up', 'גבוה', 'למעלה'), lower: nm('Lower ⬇', 'נמוך יותר ⬇', 'lower', 'down', 'נמוך', 'למטה'), same: nm('The same =', 'אותו צליל =', 'same', 'the same', 'אותו', 'זהה') },
      answer, choices: opts, stimulus: [notesStim([a, b], 0.9)], choiceStim: Object.fromEntries(opts.map((o) => [o, play(o)])),
    });
  },
};

function tune(rnd: () => number, n: number, step: number[]): number[] {
  const out = [60 + Math.floor(rnd() * 5)];
  for (let i = 1; i < n; i++) out.push(out[i - 1] + pickR(rnd, step));
  return out;
}

TOPIC_GEN['basics-samediff'] = {
  title: { en: 'Same or different?', he: 'אותו דבר או שונה?' },
  skill: 'sequences',
  levels: [
    { en: 'Three notes', he: 'שלושה צלילים' },
    { en: 'Five notes', he: 'חמישה צלילים' },
    { en: 'Seven notes, a small change', he: 'שבעה צלילים, שינוי קטן' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const n = [3, 5, 7][level - 1];
    const a = tune(rnd, n, [-4, -2, 2, 3, 4, 5]);
    const pos = 1 + Math.floor(rnd() * (n - 1));
    const b = a.map((m, i) => (i === pos ? m + (level === 3 ? pickR(rnd, [-1, 1]) : pickR(rnd, [-3, 3, 4])) : m));
    const same = rnd() < 0.5;
    const play = (s: boolean): Stimulus[] => [notesStim(a, 0.45), rest(0.8), notesStim(s ? a : b, 0.45)];
    return choiceQ({
      id, topic: 'basics-samediff', level, seed, skill: 'sequences', difficulty: [760, 900, 1060][level - 1],
      ask: { en: 'Two short tunes: the same, or different?', he: 'שתי מנגינות קצרות: אותו דבר, או שונות?' },
      names: { same: nm('The same', 'אותו דבר', 'same', 'the same', 'זהה', 'אותו'), diff: nm('Different', 'שונות', 'different', 'not the same', 'שונה') },
      answer: same ? 'same' : 'diff', choices: ['same', 'diff'], stimulus: play(same), choiceStim: { same: play(true), diff: play(false) },
    });
  },
};

TOPIC_GEN['basics-contour'] = {
  title: { en: 'The shape of a melody', he: 'הצורה של מנגינה' },
  skill: 'sequences',
  levels: [
    { en: 'Up or down?', he: 'עולה או יורדת?' },
    { en: 'Hills and valleys', he: 'גבעות ועמקים' },
    { en: 'Longer tunes', he: 'מנגינות ארוכות יותר' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const n = level === 3 ? 7 : 5;
    const shapes = level === 1 ? ['up', 'down'] : ['up', 'down', 'hill', 'valley'];
    const answer = pickR(rnd, shapes);
    const base = 60 + Math.floor(rnd() * 4);
    const make = (s: string) => {
      const half = Math.floor(n / 2);
      const st = () => pickR(rnd, [2, 2, 3, 4]);
      const out = [s === 'down' || s === 'valley' ? base + 9 : base];
      for (let i = 1; i < n; i++) {
        const goingUp = s === 'up' || (s === 'hill' && i <= half) || (s === 'valley' && i > half);
        out.push(out[i - 1] + (goingUp ? st() : -st()));
      }
      return out;
    };
    const play = (s: string): Stimulus[] => [notesStim(make(s), 0.4)];
    return choiceQ({
      id, topic: 'basics-contour', level, seed, skill: 'sequences', difficulty: [720, 860, 980][level - 1],
      ask: { en: 'Which way does the melody go?', he: 'לאן המנגינה הולכת?' },
      names: {
        up: nm('Up ↗', 'עולה ↗', 'up', 'going up', 'עולה', 'למעלה'),
        down: nm('Down ↘', 'יורדת ↘', 'down', 'going down', 'יורדת', 'למטה'),
        hill: nm('Up, then down ⌒', 'עולה ואז יורדת ⌒', 'hill', 'up and down', 'גבעה', 'עולה ויורדת'),
        valley: nm('Down, then up ⌣', 'יורדת ואז עולה ⌣', 'valley', 'down and up', 'עמק', 'יורדת ועולה'),
      },
      answer, choices: shapes, stimulus: play(answer), choiceStim: Object.fromEntries(shapes.map((s) => [s, play(s)])),
    });
  },
};

function clicks(times: number[], accent = 4): Stimulus {
  return eventsStim(times.map((t, i) => ({ midi: i % accent === 0 ? 96 : 86, start: t, duration: 0.05, velocity: i % accent === 0 ? 0.65 : 0.45 })), times[times.length - 1] + 0.3);
}

TOPIC_GEN['basics-beat'] = {
  title: { en: 'A steady beat', he: 'פעמה יציבה' },
  skill: 'timing',
  levels: [
    { en: 'Steady or wobbly? (clearly)', he: 'יציבה או מתנדנדת? (ברור)' },
    { en: 'Steady or wobbly? (subtle)', he: 'יציבה או מתנדנדת? (עדין)' },
    { en: 'Steady or wobbly? (tiny)', he: 'יציבה או מתנדנדת? (זעיר)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const bpm = 80 + Math.floor(rnd() * 40);
    const beat = 60 / bpm;
    const jit = [0.11, 0.06, 0.03][level - 1];
    const steady = rnd() < 0.5;
    const make = (s: boolean) => {
      const r2 = rng(seed + 7);
      return Array.from({ length: 10 }, (_, i) => i * beat + (s || i < 2 ? 0 : (r2() < 0.5 ? -1 : 1) * jit * (0.6 + r2() * 0.4)));
    };
    const play = (s: boolean): Stimulus[] => [clicks(make(s))];
    return choiceQ({
      id, topic: 'basics-beat', level, seed, skill: 'timing', difficulty: [760, 900, 1080][level - 1],
      ask: { en: 'Is the beat steady, or does it wobble?', he: 'הפעמה יציבה, או שהיא מתנדנדת?' },
      names: { steady: nm('Steady ♩♩♩♩', 'יציבה ♩♩♩♩', 'steady', 'even', 'יציבה', 'יציב'), wobbly: nm('Wobbly ♩ ♩♩ ♩', 'מתנדנדת ♩ ♩♩ ♩', 'wobbly', 'uneven', 'מתנדנדת', 'לא יציב') },
      answer: steady ? 'steady' : 'wobbly', choices: ['steady', 'wobbly'], stimulus: play(steady), choiceStim: { steady: play(true), wobbly: play(false) },
    });
  },
};

const lesson = (id: LessonDef['id'], skill: LessonDef['skill'], questions: Question[]): LessonDef => ({ id, version: 1, skill, scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions });
const gen = (topic: string, level: number, seed: number, id: string) => TOPIC_GEN[topic].gen(seed, level, id);

export function basicsPitch(seed = Date.now()): LessonDef {
  const r = mulberry32(seed);
  const s = () => Math.floor(r() * 1e9);
  return lesson('basics-pitch', 'pitch', [gen('basics-highlow', 1, s(), 'q1'), gen('basics-highlow', 1, s(), 'q2'), gen('basics-samediff', 1, s(), 'q3'), gen('basics-highlow', 2, s(), 'q4'), gen('basics-samediff', 1, s(), 'q5'), gen('basics-highlow', 3, s(), 'q6')]);
}
export function basicsShape(seed = Date.now()): LessonDef {
  const r = mulberry32(seed);
  const s = () => Math.floor(r() * 1e9);
  return lesson('basics-shape', 'sequences', [gen('basics-contour', 1, s(), 'q1'), gen('basics-contour', 1, s(), 'q2'), gen('basics-contour', 2, s(), 'q3'), gen('basics-samediff', 2, s(), 'q4'), gen('basics-contour', 2, s(), 'q5'), gen('basics-contour', 3, s(), 'q6')]);
}
export function basicsBeat(seed = Date.now()): LessonDef {
  const r = mulberry32(seed);
  const s = () => Math.floor(r() * 1e9);
  return lesson('basics-beat', 'timing', [gen('basics-beat', 1, s(), 'q1'), gen('basics-beat', 1, s(), 'q2'), gen('tempo', 1, s(), 'q3'), gen('basics-beat', 2, s(), 'q4'), gen('tempo', 1, s(), 'q5'), gen('basics-beat', 2, s(), 'q6')]);
}
/** Match a note with your voice: hear one note, sing it back (no key, no names). */
export function basicsVoice(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const keys = shuffleR(rnd, ['C', 'D', 'E', 'F', 'G', 'A']);
  const qs = [1, 3, 5, 1].map((deg, i) => {
    const q = singQuestion(`q${i + 1}`, pc(keys[i]), deg);
    return { ...q, stimulus: [{ kind: 'note' as const, midi: q.targetMidi, duration: 1.4 }], difficulty: 700 + i * 40 };
  });
  return lesson('basics-voice', 'singing', qs);
}

// ================================================================ Transposition

const KEYS = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb'];
const tuneDeg = (rnd: () => number, n: number) => {
  const d = [1];
  for (let i = 1; i < n; i++) d.push(Math.max(1, Math.min(7, d[i - 1] + pickR(rnd, [-2, -1, 1, 1, 2]))));
  return d;
};
const namesIn = (key: PitchClass, degs: number[]) => {
  const sc = majorScale(key);
  return degs.map((d) => sc[d - 1]);
};
const show = (ps: PitchClass[]) => ({ en: ps.map(nameEn).join(' '), he: ps.map(nameHe).join(' ') });
const midisIn = (key: PitchClass, degs: number[]) => {
  const t = placeInRange(pcValue(key), 57, 66);
  return degs.map((d) => t + MAJ[d - 1]);
};
/** Interval moves: [en, he, semitones, scale-step count] — keys reached are spelled from the major scale. */
const MOVES: [string, string, number][] = [
  ['up a major 2nd', 'סקונדה גדולה למעלה', 2],
  ['up a perfect 4th', 'קוורטה זכה למעלה', 5],
  ['up a perfect 5th', 'קווינטה זכה למעלה', 7],
  ['down a major 2nd', 'סקונדה גדולה למטה', -2],
  ['up a minor 3rd', 'טרצה קטנה למעלה', 3],
];
const keyAt = (from: string, semis: number) => {
  const v = (pcValue(pc(from)) + semis + 120) % 12;
  return ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][v];
};

TOPIC_GEN['transpose'] = {
  title: { en: 'Same tune, new key', he: 'אותה מנגינה, סולם אחר' },
  skill: 'transpose',
  levels: [
    { en: 'Three notes to a near key', he: 'שלושה צלילים לסולם קרוב' },
    { en: 'Move it by an interval', he: 'להזיז במרווח' },
    { en: 'Five notes, any key', he: 'חמישה צלילים, כל סולם' },
    { en: 'By ear: which version is the same tune?', he: 'בשמיעה: איזו גרסה היא אותה מנגינה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const n = level === 3 ? 5 : 3;
    const degs = tuneDeg(rnd, level === 4 ? 5 : n);
    const from = pickR(rnd, level === 1 ? ['C', 'G', 'F'] : KEYS);
    let to: string;
    let ask: { en: string; he: string };
    const fromNames = namesIn(pc(from), degs);
    if (level === 2) {
      const mv = pickR(rnd, MOVES);
      to = keyAt(from, mv[2]);
      ask = { en: `${show(fromNames).en} — moved ${mv[0]}, it becomes…`, he: `${show(fromNames).he} — ${mv[1]} זה הופך ל…` };
    } else {
      to = pickR(rnd, (level === 1 ? ['C', 'G', 'F', 'D'] : KEYS).filter((k) => k !== from));
      ask = { en: `${show(fromNames).en} in ${nameEn(pc(from))} major — in ${nameEn(pc(to))} major it is…`, he: `${show(fromNames).he} ב${nameHe(pc(from))} מז׳ור — ב${nameHe(pc(to))} מז׳ור זה…` };
    }
    const right = namesIn(pc(to), degs);
    if (level === 4) {
      // Hear the tune in one key, then three versions in another: one is the same tune.
      const wrong1 = degs.map((d, i) => (i === Math.floor(degs.length / 2) ? Math.min(7, d + 1) : d));
      const wrong2 = degs.map((d, i) => (i === degs.length - 1 ? Math.max(1, d - 1) : d));
      if (wrong2.every((x, i) => x === degs[i])) wrong2[degs.length - 1] = Math.min(7, degs[degs.length - 1] + 2);
      const vers = shuffleR(rnd, [{ k: 'ok', d: degs }, { k: 'x', d: wrong1 }, { k: 'y', d: wrong2 }]);
      const ans = `v${vers.findIndex((v) => v.k === 'ok') + 1}`;
      const stim: Stimulus[] = [notesStim(midisIn(pc(from), degs), 0.42), rest(1), ...vers.flatMap((v, i) => [{ kind: 'note' as const, midi: 79 + i * 2, duration: 0.15 }, rest(0.25), notesStim(midisIn(pc(to), v.d), 0.42), rest(0.7)])];
      return choiceQ({
        id, topic: 'transpose', level, seed, skill: 'transpose', difficulty: 1300,
        ask: { en: 'A tune — then three versions in another key. Which one is the same tune?', he: 'מנגינה — ואחריה שלוש גרסאות בסולם אחר. איזו מהן היא אותה מנגינה?' },
        names: { v1: nm('First', 'הראשונה', 'one', 'first', 'אחת', 'ראשונה'), v2: nm('Second', 'השנייה', 'two', 'second', 'שתיים', 'שנייה'), v3: nm('Third', 'השלישית', 'three', 'third', 'שלוש', 'שלישית') },
        answer: ans, choices: ['v1', 'v2', 'v3'], stimulus: stim,
      });
    }
    // Choices: the right names and near misses (one note off, or moved to the wrong key).
    const wrongKey = keyAt(to, pickR(rnd, [-2, 2, -1, 1]));
    const opts = [
      { k: 'a', ps: right },
      { k: 'b', ps: namesIn(pc(wrongKey), degs) },
      { k: 'c', ps: right.map((p, i) => (i === degs.length - 1 ? namesIn(pc(to), [Math.min(7, degs[i] + 1)])[0] : p)) },
    ];
    const seen = new Set<string>();
    const uniq = opts.filter((o) => {
      const s = show(o.ps).en;
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    const sh = shuffleR(rnd, uniq);
    const names: ChoiceQuestion['names'] = {};
    sh.forEach((o, i) => (names[`o${i + 1}`] = nm(show(o.ps).en, show(o.ps).he, ['one', 'two', 'three'][i], ['first', 'second', 'third'][i])));
    return choiceQ({
      id, topic: 'transpose', level, seed, skill: 'transpose', difficulty: [1050, 1180, 1250][level - 1],
      ask, names, answer: `o${sh.findIndex((o) => o.k === 'a') + 1}`, choices: sh.map((_, i) => `o${i + 1}`),
      stimulus: [notesStim(midisIn(pc(from), degs), 0.5)],
    });
  },
};

/** Say (or tap) the names of a melody given in another key. */
export function transposeNamesQuestion(id: string, from: PitchClass, to: PitchClass, degs: number[], difficulty: number): NameSeqQuestion {
  const q = nameSeqQuestion(id, to, degs, 'degrees');
  const fromNames = namesIn(from, degs);
  return {
    ...q,
    from: { key: from, names: fromNames.map((p) => `${p.letter}${p.acc}`) },
    stimulus: [{ kind: 'cadence', key: from }, { kind: 'notes', midis: midisIn(from, degs), each: 0.55 }, rest(0.6), { kind: 'cadence', key: to }],
    difficulty,
    skillAs: 'transpose',
  };
}
/** Hear a melody in one key, sing it in another. */
export function transposeSingQuestion(id: string, from: PitchClass, to: PitchClass, degs: number[], difficulty: number): SingSeqQuestion {
  const q = singSeqQuestion(id, to, degs, difficulty);
  const t = placeInRange(pcValue(to), 55, 66);
  return {
    ...q,
    fromKey: from,
    stimulus: [{ kind: 'cadence', key: from }, { kind: 'notes', midis: midisIn(from, degs), each: 0.55 }, rest(0.6), { kind: 'cadence', key: to }, { kind: 'note', midi: t, duration: 1.0 }],
    skillAs: 'transpose',
  };
}

export function transposeLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const k = shuffleR(rnd, ['C', 'G', 'F', 'D']);
  const L = lesson('transpose', 'transpose', [
    gen('transpose', 1, s(), 'q1'),
    gen('transpose', 1, s(), 'q2'),
    gen('transpose', 2, s(), 'q3'),
    transposeNamesQuestion('q4', pc(k[0]), pc(k[1]), [1, 2, 3], 1150),
    transposeNamesQuestion('q5', pc(k[2]), pc(k[3]), [1, 3, 5, 3], 1250),
    gen('transpose', 4, s(), 'q6'),
    transposeSingQuestion('q7', pc(k[1]), pc(k[2]), [1, 2, 3], 1200),
  ]);
  // Intro: the same three steps (1 2 3) from two homes.
  L.intro = [
    { id: 'intro-c', card: { kind: 'degrees', key: pc('C'), degrees: [1, 2, 3] }, stimulus: [{ kind: 'cadence', key: pc('C') }, notesStim([60, 62, 64], 0.5)] },
    { id: 'intro-g', card: { kind: 'degrees', key: pc('G'), degrees: [1, 2, 3] }, stimulus: [{ kind: 'cadence', key: pc('G') }, notesStim([67, 69, 71], 0.5)] },
  ];
  return L;
}

// Shared theory path lessons (curriculum audit 2026-11-19, owner OK the same day): the short practice after each new
// mini-lesson — chords of the key (EAR-JAZZ M1, INSTRUMENTS L2), seventh chords (L1), major and minor scales (M2),
// modes as colours (L4), the 6 chord and the diminished 7th (M4, docs/BARRY-HARRIS-THEORY.md §1 and §5 only) and the
// jazz welcome (M6). Four items each, built by hand so every item asks exactly what its mini-lesson showed.
// The first item carries the lesson's sub-skill (the path takes it from item 1): its `topic` names the topic the lesson
// opens, so the lesson and that topic count as one new idea.

import type { ChoiceQuestion, IntroStep, LessonDef, Question, Stimulus } from './lesson';
import type { PitchClass } from './pitch';
import { mulberry32 } from './lesson';
import { choiceQ, nm, pickR, shuffleR } from './topicKit';

type Names = ChoiceQuestion['names'];
const lesson = (id: LessonDef['id'], skill: LessonDef['skill'], questions: Question[], intro: IntroStep[]): LessonDef => ({ id, version: 1, skill, scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro, questions });
const chord = (midis: number[], duration = 1.4, arpeggio = false): Stimulus => (arpeggio ? { kind: 'chord', midis, duration, arpeggio } : { kind: 'chord', midis, duration });
const notes = (midis: number[], each = 0.3): Stimulus => ({ kind: 'notes', midis, each });
const rest = (duration = 0.35): Stimulus => ({ kind: 'rest', duration });
const K = (letter: PitchClass['letter'], acc: PitchClass['acc'] = 0): PitchClass => ({ letter, acc });

// ================================================================ Chords of the key (I ii iii IV V vi vii°)

const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** The keys used, with their tonic as a midi note near middle C and the chord names of I, ii, IV, V, vi. */
const KEYS: { pc: PitchClass; t: number; en: string; he: string; ch: Record<string, [string, string]> }[] = [
  { pc: K('C'), t: 60, en: 'C major', he: 'דו מז׳ור', ch: { I: ['C', 'דו מז׳ור'], ii: ['Dm', 'רה מינור'], IV: ['F', 'פה מז׳ור'], V: ['G', 'סול מז׳ור'], vi: ['Am', 'לה מינור'] } },
  { pc: K('G'), t: 55, en: 'G major', he: 'סול מז׳ור', ch: { I: ['G', 'סול מז׳ור'], ii: ['Am', 'לה מינור'], IV: ['C', 'דו מז׳ור'], V: ['D', 'רה מז׳ור'], vi: ['Em', 'מי מינור'] } },
  { pc: K('F'), t: 53, en: 'F major', he: 'פה מז׳ור', ch: { I: ['F', 'פה מז׳ור'], ii: ['Gm', 'סול מינור'], IV: ['B♭', 'סי במול מז׳ור'], V: ['C', 'דו מז׳ור'], vi: ['Dm', 'רה מינור'] } },
  { pc: K('D'), t: 62, en: 'D major', he: 'רה מז׳ור', ch: { I: ['D', 'רה מז׳ור'], ii: ['Em', 'מי מינור'], IV: ['G', 'סול מז׳ור'], V: ['A', 'לה מז׳ור'], vi: ['Bm', 'סי מינור'] } },
];
const RN_DEG: Record<string, number> = { I: 0, ii: 1, iii: 2, IV: 3, V: 4, vi: 5, 'vii°': 6 };
const RN_NAME: Record<string, Names[string]> = {
  I: nm('I', 'I', 'one', 'אחת', 'אחד'),
  ii: nm('ii', 'ii', 'two', 'שתיים', 'שתים'),
  IV: nm('IV', 'IV', 'four', 'ארבע'),
  V: nm('V', 'V', 'five', 'חמש'),
  vi: nm('vi', 'vi', 'six', 'שש'),
};
/** The triad on a degree of the major key, close and above the tonic (stays inside 53–81). */
function triad(t: number, rn: string): number[] {
  const d = RN_DEG[rn];
  return [0, 2, 4].map((j) => t + MAJ[(d + j) % 7] + (d + j >= 7 ? 12 : 0));
}
function numeralItem(id: string, k: (typeof KEYS)[number], answer: string, pool: string[], difficulty: number, seed: number): ChoiceQuestion {
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  for (const rn of pool) {
    names[rn] = RN_NAME[rn];
    choiceStim[rn] = [chord(triad(k.t, rn), 1.4)];
  }
  return choiceQ({
    id, topic: 'roman-numerals', level: 1, seed, skill: 'theory', difficulty,
    ask: { en: `In ${k.en}: which chord is this?`, he: `ב${k.he}: איזה אקורד זה?` },
    names, answer, choices: pool,
    stimulus: [{ kind: 'cadence', key: k.pc }, rest(0.4), chord(triad(k.t, answer), 1.6)],
    choiceStim,
  });
}
/** "Numbers instead of names": the key's cadence, then which chord is IV / V in it. */
function nameItem(id: string, k: (typeof KEYS)[number], rn: 'IV' | 'V', difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const right = k.ch[rn];
  const other = k.ch[rn === 'V' ? 'IV' : 'V'];
  const third = k.ch.vi;
  const opts = shuffleR(rnd, [right, other, third]);
  const names: Names = {};
  opts.forEach(([en, he]) => (names[en] = nm(en, he)));
  return choiceQ({
    id, topic: 'roman-numerals', level: 1, seed, skill: 'theory', difficulty,
    ask: { en: `In ${k.en}, chord ${rn} is…`, he: `ב${k.he}, אקורד ${rn} הוא…` },
    names, answer: right[0], choices: opts.map((o) => o[0]),
    stimulus: [{ kind: 'cadence', key: k.pc }],
    text: { en: `${k.en}: ${rn} = ?`, he: `${k.he}: ${rn} = ?` },
  });
}
export function chordNumbersLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const C = KEYS[0];
  const first = pickR(rnd, ['I', 'IV', 'V']);
  const k2 = pickR(rnd, KEYS.slice(1));
  const second = pickR(rnd, ['I', 'IV', 'V'].filter((x) => x !== first));
  const k3 = pickR(rnd, KEYS);
  const k4 = pickR(rnd, KEYS);
  const L = lesson('chord-numbers', 'theory', [
    numeralItem('q1', C, first, ['I', 'IV', 'V'], 950, s()),
    numeralItem('q2', k2, second, ['I', 'IV', 'V'], 980, s()),
    numeralItem('q3', k3, pickR(rnd, ['IV', 'V', 'vi']), ['IV', 'V', 'vi'], 1000, s()),
    nameItem('q4', k4, rnd() < 0.5 ? 'IV' : 'V', 1000, s(), rnd),
  ], [
    { id: 'intro-numbers', card: { kind: 'explain', topic: 'chord-numbers', steps: ['I', 'IV', 'V', 'I'] }, stimulus: [{ kind: 'phrase', key: K('C'), chords: ['I', 'IV', 'V', 'I'] }] },
  ]);
  return L;
}

// ================================================================ Seventh chords

const SEV: Record<string, { iv: number[]; n: Names[string] }> = {
  maj7: { iv: [0, 4, 7, 11], n: nm('maj7', 'מז׳ור 7 (maj7)', 'major seven', 'major seventh', 'מז׳ור שבע') },
  dom7: { iv: [0, 4, 7, 10], n: nm('7 (dominant)', '7 (דומיננט)', 'dominant', 'dominant seven', 'seven', 'דומיננט') },
  m7: { iv: [0, 3, 7, 10], n: nm('m7', 'מינור 7 (m7)', 'minor seven', 'minor seventh', 'מינור שבע') },
  m7b5: { iv: [0, 3, 6, 10], n: nm('ø7 (half-diminished)', 'ø7 (חצי מוקטן)', 'half diminished', 'minor seven flat five', 'חצי מוקטן') },
  dim7: { iv: [0, 3, 6, 9], n: nm('°7 (diminished)', '°7 (מוקטן)', 'diminished', 'diminished seven', 'מוקטן') },
};
function seventhItem(id: string, root: number, answer: string, pool: string[], difficulty: number, seed: number): ChoiceQuestion {
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  const play = (k: string): Stimulus[] => [chord(SEV[k].iv.map((x) => root + x), 1.5), rest(0.25), chord(SEV[k].iv.map((x) => root + x), 1.4, true)];
  for (const k of pool) {
    names[k] = SEV[k].n;
    choiceStim[k] = play(k);
  }
  return choiceQ({ id, topic: 'seventh-chords', level: 1, seed, skill: 'chords', difficulty, ask: { en: 'Which seventh chord?', he: 'איזה ספטאקורד?' }, names, answer, choices: pool, stimulus: play(answer), choiceStim });
}
export function seventhsLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const root = () => 53 + Math.floor(rnd() * 8); // F3 … C4: the 7th stays at or below B4
  const L = lesson('sevenths', 'chords', [
    seventhItem('q1', 60, pickR(rnd, ['maj7', 'dom7']), ['maj7', 'dom7'], 1000, s()),
    seventhItem('q2', root(), pickR(rnd, ['dom7', 'm7']), ['dom7', 'm7'], 1040, s()),
    seventhItem('q3', root(), pickR(rnd, ['maj7', 'dom7', 'm7']), ['maj7', 'dom7', 'm7'], 1080, s()),
    seventhItem('q4', root(), pickR(rnd, ['m7', 'm7b5', 'dim7']), ['m7', 'm7b5', 'dim7'], 1120, s()),
  ], [
    { id: 'intro-maj7', card: { kind: 'seventh', quality: 'maj7' }, stimulus: [chord([60, 64, 67, 71], 1.4, true), chord([48, 60, 64, 67, 71], 1.4)] },
    { id: 'intro-dom7', card: { kind: 'seventh', quality: '7' }, stimulus: [chord([48, 64, 67, 70], 1.3), chord([53, 65, 69, 72], 1.4)] },
  ]);
  return L;
}

// ================================================================ Major and minor scales

const SCALE: Record<string, { st: number[]; n: Names[string] }> = {
  major: { st: [0, 2, 4, 5, 7, 9, 11, 12], n: nm('Major', 'מז׳ור', 'major', 'מז׳ור') },
  minor: { st: [0, 2, 3, 5, 7, 8, 10, 12], n: nm('Natural minor', 'מינור טבעי', 'minor', 'natural minor', 'מינור', 'מינור טבעי') },
  harm: { st: [0, 2, 3, 5, 7, 8, 11, 12], n: nm('Harmonic minor', 'מינור הרמוני', 'harmonic', 'harmonic minor', 'הרמוני', 'מינור הרמוני') },
};
function scaleItem(id: string, t: number, answer: string, pool: string[], difficulty: number, seed: number): ChoiceQuestion {
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  const play = (k: string): Stimulus[] => [notes(SCALE[k].st.map((x) => t + x), 0.3)];
  for (const k of pool) {
    names[k] = SCALE[k].n;
    choiceStim[k] = play(k);
  }
  return choiceQ({ id, topic: 'scale-types', level: 1, seed, skill: 'modes', difficulty, ask: { en: 'Which scale?', he: 'איזה סולם?' }, names, answer, choices: pool, stimulus: play(answer), choiceStim });
}
/** Natural minor: the same notes as which major scale? (its relative major) */
const REL: { t: number; en: string; he: string; opts: [string, string, string][] }[] = [
  { t: 57, en: 'A minor', he: 'לה מינור', opts: [['C', 'C major', 'דו מז׳ור'], ['A', 'A major', 'לה מז׳ור'], ['G', 'G major', 'סול מז׳ור']] },
  { t: 64, en: 'E minor', he: 'מי מינור', opts: [['G', 'G major', 'סול מז׳ור'], ['E', 'E major', 'מי מז׳ור'], ['D', 'D major', 'רה מז׳ור']] },
  { t: 62, en: 'D minor', he: 'רה מינור', opts: [['F', 'F major', 'פה מז׳ור'], ['D', 'D major', 'רה מז׳ור'], ['C', 'C major', 'דו מז׳ור']] },
];
function relativeItem(id: string, r: (typeof REL)[number], difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const opts = shuffleR(rnd, r.opts);
  const names: Names = {};
  for (const [k, en, he] of opts) names[k] = nm(en, he);
  return choiceQ({
    id, topic: 'scale-types', level: 1, seed, skill: 'modes', difficulty,
    ask: { en: `${r.en} has the same notes as…`, he: `ל${r.he} יש אותם צלילים כמו ל…` },
    names, answer: r.opts[0][0], choices: opts.map((o) => o[0]),
    stimulus: [notes(SCALE.minor.st.map((x) => r.t + x), 0.3)],
  });
}
export function scalesMmLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const t = () => pickR(rnd, [57, 60, 62, 64]);
  const L = lesson('scales-mm', 'modes', [
    scaleItem('q1', 60, pickR(rnd, ['major', 'minor']), ['major', 'minor'], 950, s()),
    scaleItem('q2', t(), pickR(rnd, ['major', 'minor']), ['major', 'minor'], 980, s()),
    relativeItem('q3', pickR(rnd, REL), 1030, s(), rnd),
    scaleItem('q4', t(), pickR(rnd, ['minor', 'harm']), ['minor', 'harm'], 1060, s()),
  ], [
    { id: 'intro-major-minor', card: { kind: 'explain', topic: 'scales-mm', steps: ['1', '2', '♭3', '4', '5', '♭6', '♭7'] }, stimulus: [notes(SCALE.major.st.map((x) => 60 + x)), rest(0.5), notes(SCALE.minor.st.map((x) => 60 + x))] },
  ]);
  return L;
}

// ================================================================ Modes: colours of the major scale (parallel view)

const MODE: Record<string, { st: number[]; n: Names[string] }> = {
  ionian: { st: [0, 2, 4, 5, 7, 9, 11, 12], n: nm('Major (Ionian)', 'מז׳ור (יוני)', 'major', 'ionian', 'מז׳ור', 'יוני') },
  aeolian: { st: [0, 2, 3, 5, 7, 8, 10, 12], n: nm('Natural minor (Aeolian)', 'מינור טבעי (איאולי)', 'minor', 'aeolian', 'מינור', 'איאולי') },
  mixolydian: { st: [0, 2, 4, 5, 7, 9, 10, 12], n: nm('Mixolydian (♭7)', 'מיקסולידי (♭7)', 'mixolydian', 'מיקסולידי') },
  dorian: { st: [0, 2, 3, 5, 7, 9, 10, 12], n: nm('Dorian (6)', 'דורי (6)', 'dorian', 'דורי') },
  lydian: { st: [0, 2, 4, 6, 7, 9, 11, 12], n: nm('Lydian (♯4)', 'לידי (♯4)', 'lydian', 'לידי') },
  phrygian: { st: [0, 1, 3, 5, 7, 8, 10, 12], n: nm('Phrygian (♭2)', 'פריגי (♭2)', 'phrygian', 'פריגי') },
};
function modeItem(id: string, t: number, a: string, b: string, difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const answer = rnd() < 0.5 ? a : b;
  const pool = [a, b];
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  // The tonic first (the home the colour is heard against), then the scale up.
  const play = (k: string): Stimulus[] => [chord([t - 12, t], 1.0), notes(MODE[k].st.map((x) => t + x), 0.3)];
  for (const k of pool) {
    names[k] = MODE[k].n;
    choiceStim[k] = play(k);
  }
  return choiceQ({ id, topic: 'modes-ear', level: 1, seed, skill: 'modes', difficulty, ask: { en: 'Which mode?', he: 'איזה מודוס?' }, names, answer, choices: pool, stimulus: play(answer), choiceStim });
}
export function modeColoursLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const t = () => pickR(rnd, [57, 60, 62]);
  const L = lesson('mode-colours', 'modes', [
    modeItem('q1', 60, 'ionian', 'mixolydian', 1100, s(), rnd),
    modeItem('q2', t(), 'aeolian', 'dorian', 1150, s(), rnd),
    modeItem('q3', t(), 'ionian', 'lydian', 1200, s(), rnd),
    modeItem('q4', t(), 'aeolian', 'phrygian', 1200, s(), rnd),
  ], [
    { id: 'intro-modes', card: { kind: 'explain', topic: 'mode-colours', steps: ['6', '♭7', '♯4', '♭2'] }, stimulus: [chord([48, 60], 1.0), notes(MODE.ionian.st.map((x) => 60 + x)), rest(0.4), notes(MODE.mixolydian.st.map((x) => 60 + x))] },
  ]);
  return L;
}

// ================================================================ The 6 chord and the diminished 7th (BARRY-HARRIS-THEORY §1, §5)

/** C6 = C E G A; B°7 = B D F A♭ (the D° class of §1). Transposed by `r` semitones. */
const SIX = (r: number) => [60, 64, 67, 69].map((x) => x + r);
const DIM = (r: number) => [59, 62, 65, 68].map((x) => x + r);
const MAJ7 = (r: number) => [60, 64, 67, 71].map((x) => x + r);
const SD_NAMES: Names = {
  six: nm('6 chord', 'אקורד 6', 'six', 'six chord', 'sixth', 'שש', 'אקורד שש'),
  dim: nm('Diminished 7th (°7)', 'ספטאקורד מוקטן (°7)', 'diminished', 'diminished seven', 'מוקטן'),
  maj7: nm('maj7', 'מז׳ור 7 (maj7)', 'major seven', 'מז׳ור שבע'),
};
function sixDimItem(id: string, r: number, pair: ['six', 'dim'] | ['six', 'maj7'], difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const answer = rnd() < 0.5 ? pair[0] : pair[1];
  const shape = (k: string) => (k === 'six' ? SIX(r) : k === 'dim' ? DIM(r) : MAJ7(r));
  const play = (k: string): Stimulus[] => [chord([shape(k)[0] - 12, ...shape(k)], 1.5), rest(0.25), chord(shape(k), 1.3, true)];
  const names: Names = {};
  for (const k of pair) names[k] = SD_NAMES[k];
  return choiceQ({
    id, topic: 'bh-three-dim', level: 1, seed, skill: 'chords', difficulty,
    ask: pair[1] === 'dim' ? { en: 'A 6 chord, or a diminished 7th?', he: 'אקורד 6, או ספטאקורד מוקטן?' } : { en: 'A 6 chord, or a major 7th?', he: 'אקורד 6, או מז׳ור 7?' },
    names, answer, choices: [...pair], stimulus: play(answer), choiceStim: Object.fromEntries(pair.map((k) => [k, play(k)])),
  });
}
/** A note of the C 6th-diminished scale over the C6 chord: does it belong to C6 or to B°7? */
function scaleToneItem(id: string, difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const inSix = rnd() < 0.5;
  const tone = pickR(rnd, inSix ? [72, 76, 79, 81] : [74, 77, 80, 83]); // C E G A · D F A♭ B, above the chord
  return choiceQ({
    id, topic: 'bh-three-dim', level: 1, seed, skill: 'chords', difficulty,
    ask: { en: 'C6, then one note of its scale. Is the note in the 6 chord or in the diminished?', he: 'C6, ואז צליל אחד מהסולם שלו. הצליל באקורד ה־6 או במוקטן?' },
    names: { six: nm('In C6 (C E G A)', 'ב־C6 (דו מי סול לה)', 'six', 'C six', 'שש'), dim: nm('In B°7 (B D F A♭)', 'ב־B°7 (סי רה פה לה במול)', 'diminished', 'מוקטן') },
    answer: inSix ? 'six' : 'dim', choices: ['six', 'dim'],
    stimulus: [chord([48, 64, 67, 69], 1.3), rest(0.2), { kind: 'note', midi: tone, duration: 1.2 }],
    choiceStim: { six: [chord([48, 64, 67, 69], 1.0), chord([60, 64, 67, 69], 1.2)], dim: [chord([47, 62, 65, 68], 1.0), chord([59, 62, 65, 68], 1.2)] },
  });
}
export function sixDimLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const r = () => pickR(rnd, [-5, -3, -2, 0, 2]); // G … D
  const L = lesson('six-dim', 'chords', [
    sixDimItem('q1', 0, ['six', 'dim'], 1150, s(), rnd),
    sixDimItem('q2', r(), ['six', 'dim'], 1180, s(), rnd),
    sixDimItem('q3', r(), ['six', 'maj7'], 1200, s(), rnd),
    scaleToneItem('q4', 1220, s(), rnd),
  ], [
    { id: 'intro-six-dim', card: { kind: 'explain', topic: 'six-dim', steps: ['6', '°7', '6', '°7'] }, stimulus: [chord(SIX(0), 1.0), chord(DIM(0), 1.0), chord(SIX(0), 1.3)] },
  ]);
  return L;
}

// ================================================================ Welcome to jazz (swing, the blues, ii–V–I)

/** ii–V–I home, or ii–V left open (the jazz voicings of src/engine/jazz.ts). */
function homeItem(id: string, difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const key = pickR(rnd, [K('C'), K('F'), K('G'), K('B', -1)]);
  const home: Stimulus[] = [{ kind: 'jazz', key, chords: [{ root: 2, q: 'm7' }, { root: 7, q: '7' }, { root: 0, q: 'maj7' }], each: 1.1 }];
  const open: Stimulus[] = [{ kind: 'jazz', key, chords: [{ root: 2, q: 'm7' }, { root: 7, q: '7' }], each: 1.1 }];
  const answer = rnd() < 0.5 ? 'home' : 'open';
  return choiceQ({
    id, topic: 'jazz-changes', level: 1, seed, skill: 'cadences', difficulty,
    ask: { en: 'A ii–V: does it reach I, or stop on V?', he: 'ii–V: הוא מגיע ל־I, או נעצר על V?' },
    names: { home: nm('Home: ii–V–I', 'בבית: ii–V–I', 'home', 'one', 'בית'), open: nm('Open: stops on V', 'פתוח: נעצר על V', 'open', 'five', 'פתוח') },
    answer, choices: ['home', 'open'], stimulus: answer === 'home' ? home : open, choiceStim: { home, open },
  });
}
/** Straight or swung eighths: the same line, even or long–short (2 : 1). */
function swingItem(id: string, difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const t = pickR(rnd, [55, 57, 60, 62]);
  const line = pickR(rnd, [[0, 2, 4, 5, 7, 5, 4, 2, 0], [7, 5, 4, 2, 0, 2, 4, 5, 7], [0, 4, 7, 9, 7, 4, 2, 4, 0]]).map((x) => t + x);
  const bpm = pickR(rnd, [112, 120, 132]);
  const play = (sw: boolean): Stimulus[] => [{ kind: 'melody', midis: line, beats: line.map((_, i) => (i === line.length - 1 ? 1 : sw ? (i % 2 === 0 ? 2 / 3 : 1 / 3) : 0.5)), bpm }];
  const sw = rnd() < 0.5;
  return choiceQ({
    id, topic: 'swing-ratio', level: 1, seed, skill: 'rhythm-dictation', difficulty,
    ask: { en: 'Straight eighths, or swing?', he: 'שמיניות ישרות, או סווינג?' },
    names: { straight: nm('Straight (even)', 'ישר (שווה)', 'straight', 'even', 'ישר'), swing: nm('Swing (long–short)', 'סווינג (ארוך–קצר)', 'swing', 'סווינג') },
    answer: sw ? 'swing' : 'straight', choices: ['straight', 'swing'], stimulus: play(sw), choiceStim: { straight: play(false), swing: play(true) },
  });
}
/** A blues: four bars of I7, then bar 5 — the IV7 that arrives there, or V7? */
function bluesItem(id: string, difficulty: number, seed: number, rnd: () => number): ChoiceQuestion {
  const key = pickR(rnd, [K('C'), K('F'), K('G'), K('B', -1)]);
  const bars = (fifth: number): Stimulus[] => [{ kind: 'jazz', key, chords: [0, 0, 0, 0].map(() => ({ root: 0, q: '7' as const })), each: 0.6 }, { kind: 'jazz', key, chords: [{ root: fifth, q: '7' }], each: 1.4 }];
  const iv = rnd() < 0.5;
  return choiceQ({
    id, topic: 'blues-ear', level: 1, seed, skill: 'form', difficulty,
    ask: { en: 'A blues: four bars of I7. Which chord comes in bar 5?', he: 'בלוז: ארבע תיבות של I7. איזה אקורד מגיע בתיבה 5?' },
    names: { iv: nm('IV7 (the blues move)', 'IV7 (המהלך של הבלוז)', 'four', 'four seven', 'ארבע'), v: nm('V7', 'V7', 'five', 'five seven', 'חמש') },
    answer: iv ? 'iv' : 'v', choices: ['iv', 'v'], stimulus: bars(iv ? 5 : 7), choiceStim: { iv: bars(5), v: bars(7) },
  });
}
export function jazzWelcomeLesson(seed = Date.now()): LessonDef {
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const swing: Stimulus = { kind: 'melody', midis: [67, 69, 71, 72, 74, 72, 71, 69, 67], beats: [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 1], bpm: 120 };
  const L = lesson('jazz-welcome', 'rhythm-dictation', [
    swingItem('q1', 800, s(), rnd),
    bluesItem('q2', 820, s(), rnd),
    swingItem('q3', 830, s(), rnd),
    homeItem('q4', 950, s(), rnd),
  ], [
    { id: 'intro-swing', card: { kind: 'explain', topic: 'jazz-welcome', steps: ['ii', 'V', 'I'] }, stimulus: [swing, rest(0.4), { kind: 'jazz', key: K('C'), chords: [{ root: 2, q: 'm7' }, { root: 7, q: '7' }, { root: 0, q: 'maj7' }], each: 1.1 }] },
  ]);
  return L;
}

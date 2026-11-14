// HARMONY_3 (docs/AUDIT-CONTENT-THEORY.md §ד, §ז.2 "harmony and ear" H-1…H-8): functional harmony and the advanced
// areas the audit found missing. Own material: every progression, line and melody is generated from rules.
// Ear & theory course (no pack):
//   · function-ear      — H-1: T / PD / D, on paper and by ear, major and minor (iii is not asked: see the lesson)
//   · modal-cadence     — H-2: ♭VII–I, IV–i, ♭II–i against V–I; which mode over a vamp of chords (not over a drone)
//   · borrowed-ext      — H-3: ♭IImaj7, ♭IIImaj7, ♭VImaj7–♭VII7, Tadd Dameron's ♭III–♭VI–♭II
//   · form-ear          — H-7: 12-, 8- or 16-bar blues by counting bars; AABA / ABAC / ABAB; intro, tag or coda
//   · negative-harmony  — H-8: the mirror around the tonic–dominant axis (V ↔ iv, IV ↔ v, I ↔ i)
// Jazz & improv course (pack 'jazz'):
//   · jazz-dictation    — H-4: chord symbols with qualities and tensions (secondary ii–V, tritone, backdoor, the V's
//                         colour); a walking bass line
//   · planing           — H-5: parallel or functional, diatonic or exact planing, which shape moves
// Counterpoint species 3 and 5 (H-6) are levels 4–5 of 'counterpoint' (topicsWritten.ts).

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { bhProg, nearVoicing, ROOT, type BhChord } from './topicsHarris2';
import { jazzProgStim, JQ, type JQId } from './topicsJazzEar';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const rest = (d = 0.5): Stimulus => ({ kind: 'rest', duration: d });
const ch = (sym: string, bass: number, pcs: number[]): BhChord => ({ sym, bass, pcs });

// ---------------------------------------------------------------- spelling by letter (walking bass, notes)

const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LET_HE = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const LET_PC = [0, 2, 4, 5, 7, 9, 11];
export interface Sp {
  l: number;
  a: number;
}
const spPc = (s: Sp) => mod12(LET_PC[s.l] + s.a);
const accOf = (pc: number, l: number) => {
  let a = mod12(pc - LET_PC[l]);
  if (a > 6) a -= 12;
  return a;
};
export const spEn = (s: Sp) => LET[s.l] + (['𝄫', '♭', '', '♯', '𝄪'][s.a + 2] ?? '');
export const spHe = (s: Sp) => LET_HE[s.l] + ([' במול כפול', ' במול', '', ' דיאז', ' דיאז כפול'][s.a + 2] ?? '');
/** A chord root as charts write it (ROOT: flats, F♯) as a spelled note. */
const rootSp = (pc: number): Sp => {
  const n = ROOT[mod12(pc)];
  const l = LET.indexOf(n[0]);
  return { l, a: accOf(pc, l) };
};
/** The note `semis` above a spelled note, `steps` letters up. */
export const above = (s: Sp, semis: number, steps: number): Sp => {
  const l = (s.l + steps) % 7;
  return { l, a: accOf(spPc(s) + semis, l) };
};

// ================================================================ H-1 function-ear

type Fn = 'T' | 'PD' | 'D';
const FN_NAMES: Names = {
  T: nm('Tonic (T)', 'טוניקה (T)', 'tonic'),
  PD: nm('Pre-dominant (PD)', 'סובדומיננטה (PD)', 'pre dominant', 'subdominant'),
  D: nm('Dominant (D)', 'דומיננטה (D)', 'dominant'),
};
/** Roman numerals and their function (iii is left out: it shares two notes with I and two with V — the lesson says why). */
export const FUNCTIONS: { rn: string; fn: Fn; minor: boolean; deg: number; q: string }[] = [
  { rn: 'I', fn: 'T', minor: false, deg: 0, q: '' },
  { rn: 'vi', fn: 'T', minor: false, deg: 9, q: 'm' },
  { rn: 'IV', fn: 'PD', minor: false, deg: 5, q: '' },
  { rn: 'ii', fn: 'PD', minor: false, deg: 2, q: 'm' },
  { rn: 'V', fn: 'D', minor: false, deg: 7, q: '' },
  { rn: 'vii°', fn: 'D', minor: false, deg: 11, q: '°' },
  { rn: 'i', fn: 'T', minor: true, deg: 0, q: 'm' },
  { rn: '♭VI', fn: 'T', minor: true, deg: 8, q: '' },
  { rn: 'iv', fn: 'PD', minor: true, deg: 5, q: 'm' },
  { rn: 'ii°', fn: 'PD', minor: true, deg: 2, q: '°' },
  { rn: 'V', fn: 'D', minor: true, deg: 7, q: '' },
  { rn: 'vii°7', fn: 'D', minor: true, deg: 11, q: '°7' },
];
const MAJ_CH: Record<string, { c: BhChord; fn: Fn }> = {
  vi: { c: ch('vi', 9, [9, 0, 4]), fn: 'T' },
  I6: { c: ch('I6', 4, [0, 4, 7]), fn: 'T' },
  IV: { c: ch('IV', 5, [5, 9, 0]), fn: 'PD' },
  ii: { c: ch('ii', 2, [2, 5, 9]), fn: 'PD' },
  ii6: { c: ch('ii6', 5, [2, 5, 9]), fn: 'PD' },
  V: { c: ch('V', 7, [7, 11, 2]), fn: 'D' },
  V7: { c: ch('V7', 7, [7, 11, 2, 5]), fn: 'D' },
  vii6: { c: ch('vii°6', 2, [11, 2, 5]), fn: 'D' },
};
const MIN_CH: Record<string, { c: BhChord; fn: Fn }> = {
  VI: { c: ch('VI', 8, [8, 0, 3]), fn: 'T' },
  i6: { c: ch('i6', 3, [0, 3, 7]), fn: 'T' },
  iv: { c: ch('iv', 5, [5, 8, 0]), fn: 'PD' },
  ii6: { c: ch('ii°6', 5, [2, 5, 8]), fn: 'PD' },
  V: { c: ch('V', 7, [7, 11, 2]), fn: 'D' },
  V7: { c: ch('V7', 7, [7, 11, 2, 5]), fn: 'D' },
  vii7: { c: ch('vii°7', 11, [11, 2, 5, 8]), fn: 'D' },
};
const CTX_MAJ = [ch('I', 0, [0, 4, 7]), ch('IV', 5, [5, 9, 0]), ch('V', 7, [7, 11, 2]), ch('I', 0, [0, 4, 7])];
const CTX_MIN = [ch('i', 0, [0, 3, 7]), ch('iv', 5, [5, 8, 0]), ch('V', 7, [7, 11, 2]), ch('i', 0, [0, 3, 7])];

TOPIC_GEN['function-ear'] = {
  title: { en: 'Harmonic function: tonic, pre-dominant, dominant', he: 'פונקציה הרמונית: טוניקה, סובדומיננטה, דומיננטה' },
  skill: 'cadences',
  levels: [
    { en: 'On paper: which function?', he: 'בכתב: איזו פונקציה?' },
    { en: 'By ear, in major', he: 'בשמיעה, במז׳ור' },
    { en: 'By ear, in minor', he: 'בשמיעה, במינור' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const choices = ['T', 'PD', 'D'];
    if (level === 1) {
      const f = pickR(rnd, FUNCTIONS);
      const k = Math.floor(rnd() * 12);
      const kn = `${ROOT[k]}${f.minor ? 'm' : ''}`;
      const c = `${ROOT[mod12(k + f.deg)]}${f.q}`;
      return choiceQ({
        id, topic: 'function-ear', level, seed, skill: 'theory', difficulty: 1000,
        ask: { en: `In ${kn}, what does ${c} (${f.rn}) do?`, he: `ב־${kn}, מה התפקיד של ${c} (${f.rn})?` },
        text: { en: `${kn}: ${c} = ${f.rn}`, he: `${kn}: ${c} = ${f.rn}` },
        names: FN_NAMES, answer: f.fn, choices, stimulus: [],
      });
    }
    const minor = level === 3;
    const key = Math.floor(rnd() * 12);
    const pool = minor ? MIN_CH : MAJ_CH;
    const pick = pool[pickR(rnd, Object.keys(pool))];
    const ctx = minor ? CTX_MIN : CTX_MAJ;
    const one = (k: string) => [bhProg(ctx, key, 132, 1), rest(0.5), bhProg([pool[k].c], key, 80, 2)];
    const byFn = (fn: Fn) => Object.keys(pool).find((k) => pool[k].fn === fn)!;
    return choiceQ({
      id, topic: 'function-ear', level, seed, skill: 'cadences', difficulty: minor ? 1150 : 1050,
      ask: { en: 'The key, then one chord. Its function?', he: 'הסולם, ואז אקורד אחד. מה הפונקציה שלו?' },
      names: FN_NAMES, answer: pick.fn, choices,
      stimulus: [bhProg(ctx, key, 132, 1), rest(0.5), bhProg([pick.c], key, 80, 2)],
      choiceStim: { T: one(byFn('T')), PD: one(byFn('PD')), D: one(byFn('D')) },
    });
  },
};
TOPIC_TAGS['function-ear'] = (l) => (l === 1 ? tg(['theory', 'harmony', 1]) : tg(['cadences', 'progression', 1]));

// ================================================================ H-2 modal-cadence

/** Modal cadences, each with the tonic first: the colour chord is the mode's own note against the key. */
export const MODAL_CAD: Record<string, { ch: BhChord[]; n: ReturnType<typeof nm> }> = {
  mixo: { ch: [ch('I', 0, [0, 4, 7]), ch('♭VII', 10, [10, 2, 5]), ch('I', 0, [0, 4, 7])], n: nm('♭VII–I (Mixolydian)', '♭VII–I (מיקסולידי)', 'mixolydian') },
  dorian: { ch: [ch('i', 0, [0, 3, 7]), ch('IV', 5, [5, 9, 0]), ch('i', 0, [0, 3, 7])], n: nm('IV–i (Dorian)', 'IV–i (דורי)', 'dorian') },
  phryg: { ch: [ch('i', 0, [0, 3, 7]), ch('♭II', 1, [1, 5, 8]), ch('i', 0, [0, 3, 7])], n: nm('♭II–i (Phrygian)', '♭II–i (פריגי)', 'phrygian') },
  auth: { ch: [ch('I', 0, [0, 4, 7]), ch('V', 7, [7, 11, 2]), ch('I', 0, [0, 4, 7])], n: nm('V–I (authentic)', 'V–I (אותנטית)', 'authentic') },
};
/** Vamps that name a mode by their chords alone (each set of chords fits one mode of the five). */
export const VAMPS: Record<string, { ch: BhChord[]; n: ReturnType<typeof nm> }> = {
  lydian: { ch: [ch('I', 0, [0, 4, 7]), ch('II', 2, [2, 6, 9])], n: nm('Lydian', 'לידי', 'lydian') },
  mixo: { ch: [ch('I', 0, [0, 4, 7]), ch('♭VII', 10, [10, 2, 5])], n: nm('Mixolydian', 'מיקסולידי', 'mixolydian') },
  dorian: { ch: [ch('i', 0, [0, 3, 7]), ch('IV', 5, [5, 9, 0])], n: nm('Dorian', 'דורי', 'dorian') },
  phryg: { ch: [ch('i', 0, [0, 3, 7]), ch('♭II', 1, [1, 5, 8])], n: nm('Phrygian', 'פריגי', 'phrygian') },
  aeol: { ch: [ch('i', 0, [0, 3, 7]), ch('♭VI', 8, [8, 0, 3]), ch('♭VII', 10, [10, 2, 5])], n: nm('Aeolian', 'איאולי', 'aeolian', 'natural minor') },
};
/** Richer vamps (sevenths, a slash chord): still one mode each. */
export const VAMPS7: Record<string, { ch: BhChord[]; n: ReturnType<typeof nm> }> = {
  lydian: { ch: [ch('Imaj7', 0, [0, 4, 7, 11]), ch('II/I', 0, [2, 6, 9])], n: VAMPS.lydian.n },
  mixo: { ch: [ch('I', 0, [0, 4, 7]), ch('♭VII', 10, [10, 2, 5]), ch('IV', 5, [5, 9, 0])], n: VAMPS.mixo.n },
  dorian: { ch: [ch('im7', 0, [0, 3, 7, 10]), ch('IV7', 5, [5, 9, 0, 3])], n: VAMPS.dorian.n },
  phryg: { ch: [ch('im7', 0, [0, 3, 7, 10]), ch('♭IImaj7', 1, [1, 5, 8, 0])], n: VAMPS.phryg.n },
  aeol: { ch: [ch('im7', 0, [0, 3, 7, 10]), ch('♭VImaj7', 8, [8, 0, 3, 7]), ch('♭VII', 10, [10, 2, 5])], n: VAMPS.aeol.n },
  ionian: { ch: [ch('I', 0, [0, 4, 7]), ch('IV', 5, [5, 9, 0]), ch('V', 7, [7, 11, 2]), ch('IV', 5, [5, 9, 0])], n: nm('Ionian (major)', 'יוני (מז׳ור)', 'ionian', 'major') },
};
/** The scale of each mode above its tonic, for the tests (every vamp chord inside its own mode, outside the others). */
export const MODE_IV: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phryg: [0, 1, 3, 5, 7, 8, 10],
  aeol: [0, 2, 3, 5, 7, 8, 10],
};

TOPIC_GEN['modal-cadence'] = {
  title: { en: 'Modal cadences and vamps', he: 'קדנצות מודאליות ווואמפים' },
  skill: 'modes',
  levels: [
    { en: 'Which cadence?', he: 'איזו קדנצה?' },
    { en: 'Which mode? A vamp of chords', he: 'איזה מודוס? וואמפ של אקורדים' },
    { en: 'Which mode? Sevenths and colours', he: 'איזה מודוס? ספטאקורדים וצבעים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    if (level === 1) {
      const ks = Object.keys(MODAL_CAD);
      const a = pickR(rnd, ks);
      const names: Names = {};
      for (const k of ks) names[k] = MODAL_CAD[k].n;
      return choiceQ({
        id, topic: 'modal-cadence', level, seed, skill: 'cadences', difficulty: 1350,
        ask: { en: 'Home, a chord, home. Which cadence?', he: 'בית, אקורד, בית. איזו קדנצה?' },
        names, answer: a, choices: shuffleR(rnd, ks), stimulus: [bhProg(MODAL_CAD[a].ch, key, 76)],
        choiceStim: Object.fromEntries(ks.map((k) => [k, [bhProg(MODAL_CAD[k].ch, key, 76)]])),
      });
    }
    const pool = level === 2 ? VAMPS : VAMPS7;
    const a = pickR(rnd, Object.keys(pool));
    const opts = shuffleR(rnd, [a, ...shuffleR(rnd, Object.keys(pool).filter((k) => k !== a)).slice(0, 3)]);
    const names: Names = {};
    for (const o of opts) names[o] = pool[o].n;
    const vamp = (k: string) => bhProg([...pool[k].ch, ...pool[k].ch, pool[k].ch[0]], key, 100);
    return choiceQ({
      id, topic: 'modal-cadence', level, seed, skill: 'modes', difficulty: level === 2 ? 1400 : 1450,
      ask: { en: 'A vamp. Which mode?', he: 'וואמפ. איזה מודוס?' },
      names, answer: a, choices: opts, stimulus: [vamp(a)],
      choiceStim: Object.fromEntries(opts.map((o) => [o, [vamp(o)]])),
    });
  },
};
TOPIC_TAGS['modal-cadence'] = (l) => (l === 1 ? tg(['cadences', 'cadence', 1]) : tg(['modes', 'modes', 1]));

// ================================================================ H-3 borrowed-ext

type JL = [number, JQId, number][];
const BORROW1: Record<string, { c: JL; n: ReturnType<typeof nm> }> = {
  bII: { c: [[1, 'maj7', 4]], n: nm('♭IImaj7', '♭IImaj7', 'flat two') },
  bIII: { c: [[3, 'maj7', 4]], n: nm('♭IIImaj7', '♭IIImaj7', 'flat three') },
  bVI: { c: [[8, 'maj7', 4]], n: nm('♭VImaj7', '♭VImaj7', 'flat six') },
  iv: { c: [[5, 'm7', 4]], n: nm('ivm7', 'ivm7', 'four minor', 'minor four') },
};
const BORROW2: Record<string, { c: JL; n: ReturnType<typeof nm> }> = {
  iiV: { c: [[2, 'm7', 2], [7, 'dom7', 2]], n: nm('ii–V–I', 'ii–V–I', 'two five') },
  bVI: { c: [[8, 'maj7', 2], [10, 'dom7', 2]], n: nm('♭VImaj7–♭VII7–I', '♭VImaj7–♭VII7–I', 'flat six') },
  back: { c: [[5, 'm7', 2], [10, 'dom7', 2]], n: nm('ivm7–♭VII7–I (backdoor)', 'ivm7–♭VII7–I (דלת אחורית)', 'backdoor') },
  tadd: { c: [[3, 'maj7', 1], [8, 'maj7', 1], [1, 'maj7', 2]], n: nm('♭III–♭VI–♭II–I (Tadd Dameron)', '♭III–♭VI–♭II–I (טאד דמרון)', 'tadd dameron', 'lady bird') },
};

/** After IVmaj7 (the classic IV → iv move and its relatives): one borrowed chord, then home. */
const BORROW3: Record<string, { c: JL; n: ReturnType<typeof nm> }> = {
  ivm6: { c: [[5, 'm6', 4]], n: nm('ivm6', 'ivm6', 'minor six', 'four minor six') },
  bVII7: { c: [[10, 'dom7', 4]], n: nm('♭VII7', '♭VII7', 'flat seven') },
  bVI: { c: [[8, 'maj7', 4]], n: nm('♭VImaj7', '♭VImaj7', 'flat six') },
  bII: { c: [[1, 'maj7', 4]], n: nm('♭IImaj7', '♭IImaj7', 'flat two') },
};

TOPIC_GEN['borrowed-ext'] = {
  title: { en: 'Borrowed chords in jazz colours', he: 'אקורדים שאולים בצבעי ג׳אז' },
  skill: 'cadences',
  levels: [
    { en: 'Which borrowed chord?', he: 'איזה אקורד שאול?' },
    { en: 'Which way home?', he: 'באיזו דרך הביתה?' },
    { en: 'After IVmaj7: which borrowed chord?', he: 'אחרי IVmaj7: איזה אקורד שאול?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const pool = level === 1 ? BORROW1 : level === 2 ? BORROW2 : BORROW3;
    const ks = Object.keys(pool);
    const a = pickR(rnd, ks);
    const names: Names = {};
    for (const k of ks) names[k] = pool[k].n;
    const I: JL = [[0, 'maj7', 4]];
    const IV: JL = [[5, 'maj7', 4]];
    const play = (k: string) => [jazzProgStim(key, level === 1 ? [...I, ...pool[k].c, ...I] : level === 2 ? [...I, ...pool[k].c, [0, 'maj7', 4]] : [...I, ...IV, ...pool[k].c, ...I], 112)];
    return choiceQ({
      id, topic: 'borrowed-ext', level, seed, skill: 'cadences', difficulty: [1450, 1500, 1550][level - 1],
      ask: level === 1 ? { en: 'Imaj7, a chord from the minor side, Imaj7. Which?', he: 'Imaj7, אקורד מהצד המינורי, Imaj7. איזה?' } : level === 2 ? { en: 'Into Imaj7. Which way?', he: 'אל Imaj7. באיזו דרך?' } : { en: 'Imaj7, IVmaj7, a borrowed chord, home. Which?', he: 'Imaj7, ‏IVmaj7, אקורד שאול, הביתה. איזה?' },
      names, answer: a, choices: shuffleR(rnd, ks), stimulus: play(a),
      choiceStim: Object.fromEntries(ks.map((k) => [k, play(k)])),
    });
  },
};
TOPIC_TAGS['borrowed-ext'] = tg(['cadences', 'chromatic', 1]);

// ================================================================ H-4 jazz-dictation

const QSYM: Partial<Record<JQId, string>> = { maj7: 'maj7', dom7: '7', m7: 'm7', m7b5: 'm7♭5', dim7: '°7', m9: 'm9', maj9: 'maj9', thirteen: '13', b9: '7♭9', alt: '7alt', s11: '7♯11', nine: '9' };
const symLine = (key: number, line: JL) => line.map(([d, q]) => `${ROOT[mod12(key + d)]}${QSYM[q] ?? q}`).join(' ');
/** Progressions to write down, by level (1 secondary ii–V, 2 tritone substitutes, 3 backdoor, 4 the V's colour). */
export const DICT: JL[][] = [
  [
    [[0, 'maj7', 4], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4]],
    [[0, 'maj7', 4], [7, 'm7', 2], [0, 'dom7', 2], [5, 'maj7', 4], [2, 'm7', 2], [7, 'dom7', 2]],
    [[0, 'maj7', 4], [11, 'm7b5', 2], [4, 'dom7', 2], [9, 'm7', 4], [2, 'm7', 2], [7, 'dom7', 2]],
  ],
  [
    [[0, 'maj7', 4], [3, 'dom7', 4], [2, 'm7', 2], [1, 'dom7', 2], [0, 'maj7', 4]],
    [[0, 'maj7', 4], [4, 'm7', 2], [3, 'dom7', 2], [2, 'm7', 2], [1, 'dom7', 2], [0, 'maj7', 4]],
    [[2, 'm7', 4], [8, 'dom7', 4], [7, 'm7', 2], [6, 'dom7', 2], [5, 'maj7', 4]],
  ],
  [
    [[0, 'maj7', 4], [5, 'm7', 2], [10, 'dom7', 2], [0, 'maj7', 4]],
    [[0, 'maj7', 4], [5, 'maj7', 4], [5, 'm7', 2], [10, 'dom7', 2], [0, 'maj7', 4]],
    [[2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4], [5, 'm7', 2], [10, 'dom7', 2], [0, 'maj7', 4]],
  ],
];
/** One-chord changes of a line: a quality swapped or a dominant replaced by its tritone substitute (or back). */
function mutants(line: JL): JL[] {
  const out: JL[] = [];
  const swap: Partial<Record<JQId, JQId[]>> = { m7: ['dom7', 'maj7'], dom7: ['m7', 'maj7'], maj7: ['dom7', 'm7'], m7b5: ['m7', 'dom7'] };
  line.forEach(([d, q, b], i) => {
    if (i === 0) return;
    for (const q2 of swap[q] ?? []) out.push(line.map((c, j) => (j === i ? [d, q2, b] : c)) as JL);
    if (q === 'dom7') out.push(line.map((c, j) => (j === i ? [mod12(d + 6), q, b] : c)) as JL);
  });
  return out;
}
const DOM_COLOURS: JQId[] = ['thirteen', 'b9', 'alt', 's11'];
/** Walking-bass bar patterns (then a half step into the next root): arp = root 3 5, scale = root 2 3, down = root ♭7 5 below. */
const WALK: Record<string, number[]> = { arp: [0, 1, 2], scale: [0, 3, 1], down: [0, 4, 2] };
/** A ii–V–I walking line in quarters: spelled notes, pitches, and the line as text. */
export function walkLine(key: number, pats: [string, string], approach: ['below' | 'above', 'below' | 'above']): { sp: Sp[]; midis: number[] } {
  const roots = [mod12(key + 2), mod12(key + 7), mod12(key)];
  const quals = [[3, 7, 10], [4, 7, 10], [4, 7, 11]];
  const sp: Sp[] = [];
  const midis: number[] = [];
  let r0 = 36 + mod12(roots[0] - 36);
  for (let b = 0; b < 2; b++) {
    const R = rootSp(roots[b]);
    const [third, fifth, seventh] = quals[b];
    const tones: Record<number, { s: Sp; m: number }> = {
      0: { s: R, m: r0 },
      1: { s: above(R, third, 2), m: r0 + third },
      2: { s: above(R, fifth, 4), m: r0 + fifth },
      3: { s: above(R, 2, 1), m: r0 + 2 },
      4: { s: above(R, seventh, 6), m: r0 + seventh - 12 },
    };
    for (const k of WALK[pats[b]]) {
      sp.push(tones[k].s);
      midis.push(pats[b] === 'down' && k === 2 ? tones[k].m - 12 : tones[k].m);
    }
    // the next root: nearest to the last note, in E1…E3
    const last = midis[midis.length - 1];
    let nr = -1000;
    for (let m = 28; m <= 55; m++) if (mod12(m) === roots[b + 1] && Math.abs(m - last) < Math.abs(nr - last)) nr = m;
    const Rn = rootSp(roots[b + 1]);
    // a half step below or above (the other side when that note was just played)
    let below = approach[b] === 'below';
    if ((below ? nr - 1 : nr + 1) === last) below = !below;
    const app = below ?{ s: above(Rn, -1, 6), m: nr - 1 } : { s: above(Rn, 1, 1), m: nr + 1 };
    sp.push(app.s);
    midis.push(app.m);
    r0 = nr;
  }
  sp.push(rootSp(roots[2]));
  midis.push(r0);
  return { sp, midis };
}
const walkText = (w: Sp[], he = false) => {
  const f = he ? spHe : spEn;
  return `${w.slice(0, 4).map(f).join(' ')} | ${w.slice(4, 8).map(f).join(' ')} | ${f(w[8])}`;
};

TOPIC_GEN['jazz-dictation'] = {
  title: { en: 'Jazz dictation: write the changes', he: 'הכתבת ג׳אז: לכתוב את המהלך' },
  skill: 'cadences',
  levels: [
    { en: 'Secondary ii–Vs', he: 'ii–V משניים' },
    { en: 'Tritone substitutes', he: 'תחליפי טריטון' },
    { en: 'The backdoor', he: 'הדלת האחורית' },
    { en: 'The dominant’s colour', he: 'הצבע של הדומיננט' },
    { en: 'A walking bass line', he: 'קו בס מהלך' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 5, 10, 3, 7, 2, 8, 9]);
    if (level === 5) {
      const P = ['arp', 'scale', 'down'];
      const right = { pats: [pickR(rnd, P), pickR(rnd, P)] as [string, string], app: [pickR(rnd, ['below', 'above'] as const), pickR(rnd, ['below', 'above'] as const)] as ['below' | 'above', 'below' | 'above'] };
      const flip = (x: 'below' | 'above') => (x === 'below' ? 'above' : 'below');
      const cands = [
        { pats: right.pats, app: [flip(right.app[0]), right.app[1]] },
        { pats: right.pats, app: [right.app[0], flip(right.app[1])] },
        ...P.filter((p) => p !== right.pats[0]).map((p) => ({ pats: [p, right.pats[1]], app: right.app })),
        ...P.filter((p) => p !== right.pats[1]).map((p) => ({ pats: [right.pats[0], p], app: right.app })),
      ] as { pats: [string, string]; app: ['below' | 'above', 'below' | 'above'] }[];
      const rightW = walkLine(key, right.pats, right.app);
      const seen = new Set([walkText(rightW.sp)]);
      const picks = [rightW];
      for (const c of shuffleR(rnd, cands)) {
        const w = walkLine(key, c.pats, c.app);
        const t = walkText(w.sp);
        if (seen.has(t) || picks.length >= 4) continue;
        seen.add(t);
        picks.push(w);
      }
      const names: Names = {};
      for (const w of picks) names[walkText(w.sp)] = nm(walkText(w.sp), walkText(w.sp, true));
      const bpm = 112;
      const q = 60 / bpm;
      const chordsAt: [number, number[]][] = [
        [0, [3, 7, 10, 14].map((x) => x + key + 2)],
        [4, [4, 7, 10, 14].map((x) => x + key + 7)],
        [8, [4, 7, 11, 14].map((x) => x + key)],
      ];
      const stim = (w: { midis: number[] }) => {
        const ev: NoteEvent[] = w.midis.map((m, i) => ({ midi: m, start: i * q, duration: q * (i === 8 ? 3 : 0.9), velocity: 0.78, inst: 'bass' as const }));
        let prev: number[] | null = null;
        for (const [b, pcs] of chordsAt) {
          const v = nearVoicing(pcs, prev, 57, 79, 72);
          prev = v;
          for (const m of v) ev.push({ midi: m, start: b * q, duration: q * (b === 8 ? 3 : 3.6), velocity: 0.28 });
        }
        return [eventsStim(ev, 12 * q + 0.3)];
      };
      const ans = walkText(rightW.sp);
      return choiceQ({
        id, topic: 'jazz-dictation', level, seed, skill: 'dictation', difficulty: 1750,
        ask: { en: `ii–V–I in ${ROOT[key]}: which bass line?`, he: `ii–V–I ב־${ROOT[key]}: איזה קו בס?` },
        names, answer: ans, choices: shuffleR(rnd, picks.map((w) => walkText(w.sp))), stimulus: stim(rightW),
        choiceStim: Object.fromEntries(picks.map((w) => [walkText(w.sp), stim(w)])),
      });
    }
    let line: JL;
    let opts: JL[];
    if (level === 4) {
      const col = pickR(rnd, DOM_COLOURS);
      const mk = (c: JQId): JL => [[2, 'm9', 4], [7, c, 4], [0, 'maj9', 4]];
      line = mk(col);
      opts = DOM_COLOURS.map(mk);
    } else {
      line = pickR(rnd, DICT[level - 1]);
      const ms: JL[] = [];
      const seen = new Set([symLine(key, line)]);
      for (const m of shuffleR(rnd, mutants(line))) {
        const s = symLine(key, m);
        if (seen.has(s) || ms.length >= 3) continue;
        seen.add(s);
        ms.push(m);
      }
      opts = [line, ...ms];
    }
    const names: Names = {};
    for (const o of opts) names[symLine(key, o)] = nm(symLine(key, o), symLine(key, o));
    return choiceQ({
      id, topic: 'jazz-dictation', level, seed, skill: 'cadences', difficulty: [1600, 1650, 1700, 1750][level - 1],
      ask: { en: `In ${ROOT[key]}: which changes?`, he: `ב־${ROOT[key]}: איזה מהלך?` },
      names, answer: symLine(key, line), choices: shuffleR(rnd, opts.map((o) => symLine(key, o))), stimulus: [jazzProgStim(key, line, 116)],
      choiceStim: Object.fromEntries(opts.map((o) => [symLine(key, o), [jazzProgStim(key, o, 116)]])),
    });
  },
};
TOPIC_TAGS['jazz-dictation'] = (l) => (l === 5 ? tg(['dictation', 'bass', 1]) : tg(['cadences', 'dictation', 1]));

// ================================================================ H-5 planing

const SHAPES: Record<string, { iv: number[]; n: ReturnType<typeof nm> }> = {
  maj7: { iv: [0, 4, 7, 11], n: nm('maj7', 'maj7', 'major seven') },
  m7: { iv: [0, 3, 7, 10], n: nm('m7', 'm7', 'minor seven') },
  dom7: { iv: [0, 4, 7, 10], n: nm('7', '7', 'dominant', 'seven') },
  quartal: { iv: [0, 5, 10, 15], n: nm('Fourths (quartal)', 'קוורטות (קוורטלי)', 'quartal', 'fourths') },
};
/** Diatonic 7th chords on each degree (major): planing that follows the key. */
const DIA7 = [[0, 4, 7, 11], [0, 3, 7, 10], [0, 3, 7, 10], [0, 4, 7, 11], [0, 4, 7, 10], [0, 3, 7, 10], [0, 3, 6, 10]];
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** Chords as events: each a bass and a fixed set of pitches (exact voicings, for planing). */
function planed(chords: { bass: number; midis: number[] }[], bpm = 96): Stimulus {
  const q = 60 / bpm;
  const ev: NoteEvent[] = [];
  chords.forEach((c, i) => {
    const len = q * (i === chords.length - 1 ? 3 : 1.9);
    ev.push({ midi: c.bass, start: i * 2 * q, duration: len, velocity: 0.6 });
    for (const m of c.midis) ev.push({ midi: m, start: i * 2 * q + 0.01, duration: len, velocity: 0.45 });
  });
  return eventsStim(ev, chords.length * 2 * q + 1);
}
const low = (pc: number) => 36 + mod12(pc - 36);

TOPIC_GEN['planing'] = {
  title: { en: 'Planing and constant structure', he: 'פליינינג ומבנה קבוע' },
  skill: 'cadences',
  levels: [
    { en: 'Parallel or functional?', he: 'מקביל או פונקציונלי?' },
    { en: 'Diatonic or exact planing?', he: 'פליינינג דיאטוני או מדויק?' },
    { en: 'Which shape moves?', he: 'איזו צורה זזה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    if (level === 1) {
      // The same top line, harmonised by one shape moved in parallel (exact) or by voice-led chords (I vi ii V I).
      const shape = pickR(rnd, ['maj7', 'm7', 'quartal']);
      const tops = [4, 2, 0, 11, 0].map((x, i) => 72 + key + x - (i === 3 ? 12 : 0));
      const iv = SHAPES[shape].iv;
      const par = tops.map((t) => ({ bass: low(t - iv[3]), midis: iv.map((x) => t - iv[3] + x) }));
      const funcCh = [[0, [0, 4, 7, 11]], [9, [9, 0, 4, 7]], [2, [2, 5, 9, 0]], [7, [7, 11, 2, 5]], [0, [0, 4, 7, 11]]] as [number, number[]][];
      let prev: number[] | null = null;
      const fun = funcCh.map(([b, pcs]) => {
        const v = nearVoicing(pcs.map((p) => p + key), prev, 57, 80);
        prev = v;
        return { bass: low(b + key), midis: v };
      });
      const parallel = rnd() < 0.5;
      const names: Names = { par: nm('Parallel (planing)', 'מקביל (פליינינג)', 'parallel', 'planing'), func: nm('Functional (voice-led)', 'פונקציונלי (הובלת קולות)', 'functional', 'voice led') };
      return choiceQ({
        id, topic: 'planing', level, seed, skill: 'cadences', difficulty: 1550,
        ask: { en: 'Do the chords move as one shape, or lead their voices?', he: 'האקורדים זזים כצורה אחת, או שהקולות מובלים?' },
        names, answer: parallel ? 'par' : 'func', choices: ['par', 'func'], stimulus: [planed(parallel ? par : fun)],
        choiceStim: { par: [planed(par)], func: [planed(fun)] },
      });
    }
    if (level === 2) {
      // Up the scale from I: diatonic 7th chords (the qualities change with the key) or one quality on every degree.
      const exact = rnd() < 0.5;
      const q = pickR(rnd, ['maj7', 'm7'] as const);
      const degs = pickR(rnd, [[0, 1, 2, 3], [3, 2, 1, 0], [1, 2, 3, 4], [4, 3, 2, 1]]);
      const mk = (ex: boolean) => degs.map((d) => {
        const r = key + MAJ[d];
        const iv = ex ? SHAPES[q].iv : DIA7[d];
        const b = 48 + mod12(r - 48);
        return { bass: low(r), midis: iv.map((x) => b + 12 + x) };
      });
      const names: Names = { dia: nm('Diatonic (stays in the key)', 'דיאטוני (נשאר בסולם)', 'diatonic'), exact: nm('Exact (same quality)', 'מדויק (אותה איכות)', 'exact', 'chromatic', 'real') };
      return choiceQ({
        id, topic: 'planing', level, seed, skill: 'cadences', difficulty: 1600,
        ask: { en: 'Seventh chords up the scale: in the key, or the same chord every time?', he: 'ספטאקורדים לאורך הסולם: בתוך הסולם, או אותו אקורד בכל פעם?' },
        names, answer: exact ? 'exact' : 'dia', choices: ['dia', 'exact'], stimulus: [planed(mk(exact))],
        choiceStim: { dia: [planed(mk(false))], exact: [planed(mk(true))] },
      });
    }
    // Level 3: constant structure — one shape on roots that move without a key (minor 3rds, half steps, whole steps).
    const ks = Object.keys(SHAPES);
    const a = pickR(rnd, ks);
    const moves = pickR(rnd, [[3, 3, 3], [-1, -1, 2], [2, -3, 4], [4, -1, -3], [-2, -2, 5]]);
    const roots = [key];
    for (const m of moves) roots.push(roots[roots.length - 1] + m);
    const mk = (s: string) => roots.map((r) => {
      const b = 48 + mod12(r - 48);
      return { bass: low(r), midis: SHAPES[s].iv.map((x) => b + 12 + x) };
    });
    const names: Names = {};
    for (const k of ks) names[k] = SHAPES[k].n;
    return choiceQ({
      id, topic: 'planing', level, seed, skill: 'chords', difficulty: 1650,
      ask: { en: 'One shape on moving roots. Which shape?', he: 'צורה אחת על שורשים זזים. איזו צורה?' },
      names, answer: a, choices: shuffleR(rnd, ks), stimulus: [planed(mk(a))],
      choiceStim: Object.fromEntries(ks.map((k) => [k, [planed(mk(k))]])),
    });
  },
};
TOPIC_TAGS['planing'] = (l) => (l === 3 ? tg(['chords', 'voicing', 1]) : tg(['cadences', 'progression', 1]));

// ================================================================ H-7 form-ear

/** Blues forms, one chord a bar (degrees: 0 = I7, 5 = IV7, 7 = V7). */
export const BLUES: Record<string, { bars: number[]; n: ReturnType<typeof nm> }> = {
  b12: { bars: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], n: nm('12-bar blues', 'בלוז 12 תיבות', 'twelve') },
  // "Key to the Highway": I V IV IV | I V I V.
  b8: { bars: [0, 7, 5, 5, 0, 7, 0, 7], n: nm('8-bar blues', 'בלוז 8 תיבות', 'eight') },
  // The 12-bar form with its first four bars on I stretched to eight.
  b16: { bars: [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], n: nm('16-bar blues', 'בלוז 16 תיבות', 'sixteen') },
};
const FORMS: Record<string, { secs: string; n: ReturnType<typeof nm> }> = {
  aaba: { secs: 'AABA', n: nm('AABA', 'AABA', 'a a b a') },
  abac: { secs: 'ABAC', n: nm('ABAC', 'ABAC', 'a b a c') },
  abab: { secs: 'ABAB', n: nm('ABAB', 'ABAB', 'a b a b') },
};
/** A two-bar phrase of the major scale (eight quarters, degrees as scale steps), ending on `end`. */
function phrase(rnd: () => number, end: number, start?: number): number[] {
  const out = [start ?? pickR(rnd, [0, 2, 4, 7])];
  while (out.length < 7) {
    const p = out[out.length - 1];
    let n = p + pickR(rnd, [-2, -1, -1, 1, 1, 2, 3, -3]);
    n = Math.max(-1, Math.min(9, n));
    out.push(n);
  }
  out.push(end);
  return out;
}
const degMidi = (key: number, d: number) => 60 + key + Math.floor(d / 7) * 12 + MAJ[((d % 7) + 7) % 7];

TOPIC_GEN['form-ear'] = {
  title: { en: 'Form by ear: blues lengths, AABA or ABAC, intro and ending', he: 'צורה בשמיעה: אורך הבלוז, AABA או ABAC, פתיחה וסיום' },
  skill: 'form',
  levels: [
    { en: '12-, 8- or 16-bar blues?', he: 'בלוז 12, 8 או 16 תיבות?' },
    { en: 'AABA, ABAC or ABAB?', he: 'AABA, ‏ABAC או ABAB?' },
    { en: 'Intro, tag or coda?', he: 'פתיחה, טאג או קודה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    if (level === 1) {
      const ks = Object.keys(BLUES);
      const a = pickR(rnd, ks);
      const names: Names = {};
      for (const k of ks) names[k] = BLUES[k].n;
      const play = (k: string) => [jazzProgStim(key, [...BLUES[k].bars.map((d) => [d, 'dom7', 4] as [number, JQId, number]), [0, 'dom7', 4]], 192)];
      return choiceQ({
        id, topic: 'form-ear', level, seed, skill: 'form', difficulty: 1300,
        ask: { en: 'Count the bars until the form starts again. Which blues?', he: 'ספרו תיבות עד שהצורה מתחילה שוב. איזה בלוז?' },
        names, answer: a, choices: ks, stimulus: play(a),
      });
    }
    const q = 60 / 152;
    const mel = (secs: number[][]) => {
      const ev: NoteEvent[] = [];
      secs.flat().forEach((d, i) => ev.push({ midi: degMidi(key, d), start: i * q, duration: q * 0.9, velocity: 0.62 }));
      return ev;
    };
    if (level === 2) {
      const A = phrase(rnd, 4, 0);
      let B = phrase(rnd, 4, 5);
      let Cc = phrase(rnd, 0, 7);
      if (B.join() === A.join()) B = B.map((d, i) => (i < 7 ? d + 2 : d));
      if (Cc.join() === A.join() || Cc.join() === B.join()) Cc = Cc.map((d, i) => (i < 7 ? d - 1 : d));
      const A2 = [...A.slice(0, 7), 0];
      const ks = Object.keys(FORMS);
      const a = pickR(rnd, ks);
      const build = (k: string) => (k === 'aaba' ? [A, A2, B, A2] : k === 'abac' ? [A, B, A, Cc] : [A, B, A, [...B.slice(0, 7), 0]]);
      const names: Names = {};
      for (const k of ks) names[k] = FORMS[k].n;
      return choiceQ({
        id, topic: 'form-ear', level, seed, skill: 'form', difficulty: 1350,
        ask: { en: 'Four phrases. Which form?', he: 'ארבעה משפטים. איזו צורה?' },
        names, answer: a, choices: ks, stimulus: [eventsStim(mel(build(a)), 32 * q + 0.4)],
      });
    }
    // Level 3: an intro (a I–vi–ii–V vamp before the tune), a tag (the last phrase again, three times) or a coda (a new
    // ending after the last phrase).
    const end = phrase(rnd, 0, 4);
    const kind = pickR(rnd, ['intro', 'tag', 'coda']);
    const vamp = [[0, 4, 7, 11], [9, 0, 4, 7], [2, 5, 9, 0], [7, 11, 2, 5]];
    const tune = (start: number) => end.map((d, i) => ({ midi: degMidi(key, d), start: start + i * q, duration: q * 0.9, velocity: 0.64 }));
    const ev: NoteEvent[] = [];
    let len = 0;
    if (kind === 'intro') {
      let prev: number[] | null = null;
      [...vamp, ...vamp].forEach((pcs, i) => {
        const v = nearVoicing(pcs.map((p) => p + key), prev, 50, 67, 64);
        prev = v;
        for (const m of v) ev.push({ midi: m, start: i * 2 * q, duration: 2 * q * 0.95, velocity: 0.34 });
      });
      ev.push(...tune(16 * q));
      len = 24 * q;
    } else if (kind === 'tag') {
      const last = end.slice(4);
      ev.push(...tune(0));
      for (let k = 1; k <= 2; k++) last.forEach((d, i) => ev.push({ midi: degMidi(key, d), start: (4 + 4 * k + i) * q, duration: q * 0.9, velocity: 0.64 }));
      ev.push({ midi: degMidi(key, 0), start: 16 * q, duration: 3 * q, velocity: 0.6 });
      len = 20 * q;
    } else {
      ev.push(...tune(0));
      [4, 5, 6, 7, 6, 7].forEach((d, i) => ev.push({ midi: degMidi(key, d), start: (8 + i) * q, duration: q * 0.9, velocity: 0.6 }));
      ev.push(...[0, 4, 7, 11].map((x) => ({ midi: 60 + key + x, start: 14 * q, duration: 4 * q, velocity: 0.45 })));
      len = 19 * q;
    }
    const names: Names = { intro: nm('An intro', 'פתיחה (אינטרו)', 'intro'), tag: nm('A tag', 'טאג', 'tag'), coda: nm('A coda', 'קודה', 'coda') };
    return choiceQ({
      id, topic: 'form-ear', level, seed, skill: 'form', difficulty: 1400,
      ask: { en: 'Something added to the tune. What?', he: 'משהו נוסף לשיר. מה?' },
      names, answer: kind, choices: ['intro', 'tag', 'coda'], stimulus: [eventsStim(ev, len + 0.5)],
    });
  },
};
TOPIC_TAGS['form-ear'] = tg(['form', 'song', 1]);

// ================================================================ H-8 negative-harmony

/** Negative harmony: reflect around the axis between the 3rds of I (E♭–E in C): p → 2·key + 7 − p. */
export const mirror = (key: number, pc: number) => mod12(2 * key + 7 - pc);
/** The diatonic triads of a major key and their mirrors (as root and quality). */
export const NEG_TRIADS: { rn: string; deg: number; minor: boolean }[] = [
  { rn: 'I', deg: 0, minor: false },
  { rn: 'ii', deg: 2, minor: true },
  { rn: 'iii', deg: 4, minor: true },
  { rn: 'IV', deg: 5, minor: false },
  { rn: 'V', deg: 7, minor: false },
  { rn: 'vi', deg: 9, minor: true },
];
/** The mirror of a triad: a major triad becomes minor and the other way round, rooted on the mirror of its 5th. */
export function negTriad(key: number, deg: number, minor: boolean): { root: number; minor: boolean } {
  return { root: mirror(key, key + deg + 7), minor: !minor };
}
const triadName = (r: number, minor: boolean) => `${ROOT[mod12(r)]}${minor ? 'm' : ''}`;

TOPIC_GEN['negative-harmony'] = {
  title: { en: 'Negative harmony', he: 'הרמוניה שלילית' },
  skill: 'theory',
  levels: [
    { en: 'The mirror of a chord', he: 'השתקפות של אקורד' },
    { en: 'The mirror of a note; V7 in the mirror', he: 'השתקפות של צליל; V7 במראה' },
    { en: 'Where is the axis?', he: 'איפה הציר?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 5, 7, 2, 10, 3, 9, 8]);
    const base = { id, topic: 'negative-harmony', level, seed, skill: 'theory' as const };
    if (level === 3) {
      // The axis runs between the minor and the major 3rd of the tonic (and, across the circle, between ♮6 and ♭7).
      const k = key === 8 ? 0 : key;
      const R = rootSp(k);
      const L: Record<number, number> = { 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4 };
      const pair = (a: number) => `${spEn(above(R, a, L[a]))}–${spEn(above(R, a + 1, L[a + 1]))}`;
      const opts = shuffleR(rnd, [3, 2, 4, 6]);
      const id3 = (o: number) => `a${mod12(k + o)}`;
      const names: Names = {};
      for (const o of opts) names[id3(o)] = nm(pair(o), pair(o));
      return choiceQ({
        ...base, difficulty: 1600,
        ask: { en: `Negative harmony in ${ROOT[k]}: the axis lies between which two notes?`, he: `הרמוניה שלילית ב־${ROOT[k]}: הציר עובר בין אילו שני צלילים?` },
        text: { en: `${ROOT[k]}: ? | ?`, he: `${ROOT[k]}: ? | ?` },
        names, answer: id3(3), choices: opts.map(id3), stimulus: [],
      });
    }
    if (level === 1) {
      const t = pickR(rnd, NEG_TRIADS);
      const all = NEG_TRIADS.map((x) => negTriad(key, x.deg, x.minor));
      const right = negTriad(key, t.deg, t.minor);
      const others = shuffleR(rnd, all.filter((x) => triadName(x.root, x.minor) !== triadName(right.root, right.minor))).slice(0, 3);
      const opts = shuffleR(rnd, [right, ...others]).map((x) => triadName(x.root, x.minor));
      const names: Names = {};
      for (const o of opts) names[o] = nm(o, o);
      const src = triadName(key + t.deg, t.minor);
      return choiceQ({
        ...base, difficulty: 1500,
        ask: { en: `Negative harmony in ${ROOT[key]}: the mirror of ${src} (${t.rn})?`, he: `הרמוניה שלילית ב־${ROOT[key]}: ההשתקפות של ${src} (${t.rn})?` },
        text: { en: `${ROOT[key]}: ${src} → ?`, he: `${ROOT[key]}: ${src} → ?` },
        names, answer: triadName(right.root, right.minor), choices: opts, stimulus: [],
      });
    }
    if (rnd() < 0.5) {
      // V7 → the minor iv6 (= iiø7): G7 in C mirrors to C A♭ F D = Fm6.
      const right = `${ROOT[mod12(key + 5)]}m6`;
      const opts = shuffleR(rnd, [right, `${ROOT[mod12(key + 10)]}7`, `${ROOT[mod12(key + 2)]}m7`, `${ROOT[mod12(key + 8)]}maj7`]);
      const names: Names = {};
      for (const o of opts) names[o] = nm(o, o);
      const v7 = `${ROOT[mod12(key + 7)]}7`;
      return choiceQ({
        ...base, difficulty: 1550,
        ask: { en: `Negative harmony in ${ROOT[key]}: the mirror of ${v7}?`, he: `הרמוניה שלילית ב־${ROOT[key]}: ההשתקפות של ${v7}?` },
        text: { en: `${ROOT[key]}: ${v7} → ?`, he: `${ROOT[key]}: ${v7} → ?` },
        names, answer: right, choices: opts, stimulus: [],
      });
    }
    const p = Math.floor(rnd() * 12);
    const right = mirror(key, key + p);
    const opts = shuffleR(rnd, [right, ...shuffleR(rnd, Array.from({ length: 12 }, (_, i) => i).filter((x) => x !== right)).slice(0, 3)]);
    const names: Names = {};
    for (const o of opts) names[`n${o}`] = nm(ROOT[o], ROOT[o]);
    return choiceQ({
      ...base, difficulty: 1550,
      ask: { en: `Negative harmony in ${ROOT[key]}: the mirror of the note ${ROOT[mod12(key + p)]}?`, he: `הרמוניה שלילית ב־${ROOT[key]}: ההשתקפות של הצליל ${ROOT[mod12(key + p)]}?` },
      text: { en: `${ROOT[key]}: ${ROOT[mod12(key + p)]} → ?`, he: `${ROOT[key]}: ${ROOT[mod12(key + p)]} → ?` },
      names, answer: `n${right}`, choices: opts.map((o) => `n${o}`), stimulus: [],
    });
  },
};
TOPIC_TAGS['negative-harmony'] = tg(['theory', 'harmony', 1]);

// keep JQ referenced for the symbol table's keys (QSYM) — tensions are voiced by jazzProgStim
void JQ;

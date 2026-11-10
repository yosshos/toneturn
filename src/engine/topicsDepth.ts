// SPEC-0.48 §D (owner 2026-11-08): no topic with fewer than three levels. New levels come after the existing ones,
// so saved progress and review tags ("choice:<topic>:<level>:<seed>") keep their meaning.

import type { ChoiceQuestion, Stimulus } from './lesson';
import { barryLine, DIM7, moveDim, pivot } from './barry';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, nm, pcName, pcNameHe } from './topicKit';
import { motifs } from './topicsHarmony';

type Gen = (seed: number, level: number, id: string) => ChoiceQuestion;
type Names = ChoiceQuestion['names'];

/** Append levels to a topic; `gen` gets the full level number (for the tag) and the new level's index from 1. */
function deepen(topic: string, more: { en: string; he: string }[], gen: (seed: number, level: number, id: string, k: number) => ChoiceQuestion) {
  const base = TOPIC_GEN[topic];
  if (!base) return;
  const baseN = base.levels.length;
  const g: Gen = (seed, level, id) => (level <= baseN ? (base.gen(seed, level, id) as ChoiceQuestion) : gen(seed, level, id, level - baseN));
  TOPIC_GEN[topic] = { ...base, levels: [...base.levels, ...more], gen: g };
}

const gap: Stimulus = { kind: 'rest', duration: 0.5 };
const REL: Record<number, string> = { 0: 'same', 3: 'up3', 6: 'tritone', 9: 'down3' };
const REL_NAMES: Names = {
  same: nm('The same key', 'אותו סולם', 'same'),
  up3: nm('A minor third up', 'טרצה קטנה למעלה', 'minor third up', 'up'),
  tritone: nm('A tritone away', 'טריטון', 'tritone'),
  down3: nm('A minor third down', 'טרצה קטנה למטה', 'minor third down', 'down'),
};
const fit = (ms: number[], lo = 52, hi = 80) => ms.map((m) => (m < lo ? m + 12 : m > hi ? m - 12 : m)).sort((a, b) => a - b);

/** Runs once from topics.ts, after every base topic exists. */
export function applyDepth() {
// ---------------------------------------------------------------- form 3–5

deepen(
  'form',
  [
    { en: 'Which phrase is new?', he: 'איזה משפט חדש?' },
    { en: 'Ternary, rondo, song form, verse–chorus', he: 'שלושה חלקים, רונדו, שיר, בית–פזמון' },
    { en: 'Repeated, varied or moved?', he: 'חוזר, וריאציה או מוזז?' },
  ],
  (seed, level, id, k) => {
    const rnd = rng(seed);
    const key = 57 + Math.floor(rnd() * 6);
    const [A, B, C] = motifs(rnd, key, 3);
    const each = 0.24 - 0.01 * k;
    if (k === 1) {
      const at = pickR(rnd, [2, 3, 4]);
      const play = (p: number): Stimulus[] => [1, 2, 3, 4].flatMap((i) => (i > 1 ? [gap] : []).concat(notesStim(i === p ? B : A, each)));
      const choiceStim: Record<string, Stimulus[]> = {};
      const names: Names = {};
      for (const p of [2, 3, 4]) {
        choiceStim[`p${p}`] = play(p);
        names[`p${p}`] = nm(`Phrase ${p}`, `משפט ${p}`, String(p));
      }
      return choiceQ({ id, topic: 'form', level, seed, skill: 'form', difficulty: 1400, ask: { en: 'Four phrases, one of them is new (the bridge). Which?', he: 'ארבעה משפטים, אחד מהם חדש (הגשר). איזה?' }, names, answer: `p${at}`, choices: ['p2', 'p3', 'p4'], stimulus: play(at), choiceStim });
    }
    if (k === 2) {
      const M: Record<string, number[]> = { A, B, C };
      const forms = ['ABA', 'ABACA', 'AABA', 'ABAB'];
      const play = (f: string): Stimulus[] => f.split('').flatMap((ch, i) => (i ? [gap, notesStim(M[ch], each)] : [notesStim(M[ch], each)]));
      const names: Names = {
        ABA: nm('Ternary (A B A)', 'שלושה חלקים (A B A)', 'ternary', 'ABA'),
        ABACA: nm('Rondo (A B A C A)', 'רונדו (A B A C A)', 'rondo'),
        AABA: nm('Song form (A A B A)', 'צורת שיר (A A B A)', 'song form', 'AABA', 'thirty two bar'),
        ABAB: nm('Verse–chorus (A B A B)', 'בית–פזמון (A B A B)', 'verse chorus', 'ABAB'),
      };
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const f of forms) choiceStim[f] = play(f);
      const answer = pickR(rnd, forms);
      return choiceQ({ id, topic: 'form', level, seed, skill: 'form', difficulty: 1500, ask: { en: 'Which form?', he: 'איזה מבנה?' }, names, answer, choices: forms, stimulus: play(answer), choiceStim });
    }
    // k === 3: the second phrase is the same, a variation, or the same tune moved up (a sequence).
    const step = pickR(rnd, [2, 5, 7]);
    const varied = A.slice(0, 3).concat(A[3] + (A[3] > key + 4 ? -3 : 3), A[4]);
    const second: Record<string, number[]> = { same: A, varied, moved: A.map((m) => m + step) };
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const s of Object.keys(second)) choiceStim[s] = [notesStim(A, each), gap, notesStim(second[s], each)];
    const answer = pickR(rnd, Object.keys(second));
    return choiceQ({
      id, topic: 'form', level, seed, skill: 'form', difficulty: 1550,
      ask: { en: 'Phrase 2: repeat, variation or sequence?', he: 'משפט 2: חזרה, וריאציה או סקוונצה?' },
      names: { same: nm('A repeat', 'חזרה', 'repeat', 'same'), varied: nm('A variation', 'וריאציה', 'variation'), moved: nm('Moved higher (sequence)', 'מוזז למעלה (סקוונצה)', 'sequence', 'moved', 'higher') },
      answer, choices: ['same', 'varied', 'moved'], stimulus: choiceStim[answer], choiceStim,
    });
  },
);

// ---------------------------------------------------------------- chromatic-added 3–4

const ADD_SCALES: Record<string, { steps: number[]; en: string; he: string }> = {
  majUp: { steps: [0, 2, 4, 5, 7, 9, 11, 12], en: 'major, up', he: 'מז׳ור, עולה' },
  majDown: { steps: [12, 11, 9, 7, 5, 4, 2, 0], en: 'major, down', he: 'מז׳ור, יורד' },
  domUp: { steps: [0, 2, 4, 5, 7, 9, 10, 12], en: 'dominant, up', he: 'דומיננט, עולה' },
  domDown: { steps: [12, 10, 9, 7, 5, 4, 2, 0], en: 'dominant, down', he: 'דומיננט, יורד' },
  dorDown: { steps: [12, 10, 9, 7, 5, 3, 2, 0], en: 'dorian, down', he: 'דורי, יורד' },
  melUp: { steps: [0, 2, 3, 5, 7, 9, 11, 12], en: 'melodic minor, up', he: 'מינור מלודי, עולה' },
};
deepen(
  'chromatic-added',
  [
    { en: 'Any scale, either way, faster', he: 'כל סולם, לשני הכיוונים, מהר יותר' },
    { en: 'Minor scales at tempo', he: 'סולמות מינוריים בטמפו' },
  ],
  (seed, level, id, k) => {
    const rnd = rng(seed);
    const tonic = 55 + Math.floor(rnd() * 10);
    const pool = k === 1 ? ['majUp', 'majDown', 'domUp', 'domDown'] : ['dorDown', 'melUp', 'domDown'];
    const sc = ADD_SCALES[pickR(rnd, pool)];
    const base = sc.steps;
    const gaps = base.slice(0, -1).map((_, i) => i).filter((i) => Math.abs(base[i + 1] - base[i]) === 2);
    const g = pickR(rnd, gaps);
    const line = [...base.slice(0, g + 1), (base[g] + base[g + 1]) / 2, ...base.slice(g + 1)].map((s) => tonic + s);
    const others = shuffleR(rnd, gaps.filter((x) => x !== g)).slice(0, 3);
    const choices = [g, ...others].sort((a, b) => a - b);
    const names: Names = {};
    for (const c of choices) names[`g${c}`] = nm(`Between notes ${c + 1} and ${c + 2}`, `בין צליל ${c + 1} ל־${c + 2}`, `${c + 1} and ${c + 2}`, `${c + 1} ${c + 2}`);
    return choiceQ({
      id, topic: 'chromatic-added', level, seed, skill: 'modes', difficulty: 1400 + 100 * k,
      ask: { en: `A ${sc.en} scale with one added half step — where?`, he: `סולם ${sc.he} עם חצי טון נוסף — איפה?` },
      names, answer: `g${g}`, choices: choices.map((c) => `g${c}`), stimulus: [notesStim(line, k === 1 ? 0.24 : 0.19)],
    });
  },
);

// ---------------------------------------------------------------- Barry Harris 2–3 levels

// bh-keys: name the new key; then the minor side (minor 6 chords). (Level 2 — any diminished chord — lives in topicsPitch2.)
deepen(
  'bh-keys',
  [
    { en: 'Name the new key', he: 'מה הסולם החדש?' },
    { en: 'The minor side (minor 6 chords)', he: 'הצד המינורי (אקורדי מינור 6)' },
  ],
  (seed, level, id, k) => {
    const rnd = rng(seed);
    const root = 55 + Math.floor(rnd() * 8);
    const dir = k === 1 ? 'down' : 'up';
    const resolve = (i: number) => {
      const r = moveDim(root, { notes: [i], dir });
      const t = dir === 'down' ? r.root + 5 : r.root;
      const tonic = fit(dir === 'down' ? [t, t + 4, t + 7] : [t, t + 3, t + 7, t + 9]);
      return { stim: [chordStim(DIM7(root), 0.8), chordStim(fit(r.midis), 0.8), chordStim(tonic, 1.3)] as Stimulus[], home: t % 12 };
    };
    const ref = Math.floor(rnd() * 4);
    const i = Math.floor(rnd() * 4);
    const a = resolve(ref);
    const b = resolve(i);
    if (k === 1) {
      // The first key is named; which of the four keys of this diminished chord is the second?
      const homes = [0, 1, 2, 3].map((j) => resolve(j).home);
      const names: Names = {};
      for (const h of homes) names[`k${h}`] = nm(`${pcName(h)} major`, `${pcNameHe(h)} מז׳ור`, pcName(h).replace('♭', ' flat'));
      return choiceQ({
        id, topic: 'bh-keys', level, seed, skill: 'cadences', difficulty: 1500,
        ask: { en: `The first resolution goes to ${pcName(a.home)} major. Where does the second go?`, he: `הפתרון הראשון הולך ל${pcNameHe(a.home)} מז׳ור. לאן הולך השני?` },
        text: { en: `1st: ${pcName(a.home)}`, he: `ראשון: ${pcNameHe(a.home)}` },
        names, answer: `k${b.home}`, choices: homes.map((h) => `k${h}`), stimulus: [...a.stim, { kind: 'rest', duration: 0.7 }, ...b.stim],
      });
    }
    const answer = REL[(((b.home - a.home) % 12) + 12) % 12];
    return choiceQ({
      id, topic: 'bh-keys', level, seed, skill: 'cadences', difficulty: 1450 + 100 * k,
      ask: { en: 'Up to minor 6 chords. Where did the second land?', he: 'עולים לאקורדי מינור 6. לאן נחת השני?' },
      names: REL_NAMES, answer, choices: ['same', 'up3', 'tritone', 'down3'], stimulus: [...a.stim, { kind: 'rest', duration: 0.7 }, ...b.stim],
    });
  },
);

// bh-tone: the minor 6 / diminished pair in any key; then count the diminished notes in a short line.
deepen(
  'bh-tone',
  [
    { en: 'Minor 6 or diminished, any key', he: 'מינור 6 או דימיניש, כל סולם' },
    { en: 'How many notes came from the diminished?', he: 'כמה צלילים הגיעו מהדימיניש?' },
  ],
  (seed, level, id, k) => {
    const rnd = rng(seed);
    const t = 55 + Math.floor(rnd() * 8);
    const minor = k === 1 || rnd() < 0.5;
    const six = minor ? [t, t + 3, t + 7, t + 9] : [t, t + 4, t + 7, t + 9];
    const dim = [t - 1, t + 2, t + 5, t + 8];
    const sixName = `${pcName(t % 12)}${minor ? 'm6' : '6'}`;
    const sixHe = `${pcNameHe(t % 12)} ${minor ? 'מינור 6' : '6'}`;
    const intro: Stimulus[] = [chordStim(six, 0.9), chordStim(dim, 0.9), { kind: 'rest', duration: 0.4 }];
    if (k === 1) {
      const fromSix = rnd() < 0.5;
      const note = pickR(rnd, fromSix ? six : dim) + 12;
      return choiceQ({
        id, topic: 'bh-tone', level, seed, skill: 'chords', difficulty: 1350,
        ask: { en: `${sixName}, then its diminished, then one note: from which chord?`, he: `${sixHe}, אחר כך הדימיניש שלו, ואז צליל: מאיזה אקורד?` },
        names: { six: nm('The 6 chord', 'אקורד ה־6', 'six', 'minor six', 'שש'), dim: nm('The diminished chord', 'הדימיניש', 'diminished', 'dim', 'דימיניש') },
        answer: fromSix ? 'six' : 'dim', choices: ['six', 'dim'],
        stimulus: [...intro, { kind: 'note', midi: note, duration: 1.1 }],
        choiceStim: { six: [chordStim([...six, note])], dim: [chordStim([...dim, note])] },
      });
    }
    const n = pickR(rnd, [1, 2, 3]);
    const fromDim = shuffleR(rnd, [0, 1, 2, 3]).slice(0, n);
    const line = [0, 1, 2, 3].map((i) => (fromDim.includes(i) ? pickR(rnd, dim) : pickR(rnd, six)) + 12);
    return choiceQ({
      id, topic: 'bh-tone', level, seed, skill: 'chords', difficulty: 1550,
      ask: { en: `${sixName}, its diminished, then four notes: how many came from the diminished?`, he: `${sixHe}, הדימיניש שלו, ואז ארבעה צלילים: כמה מהם מהדימיניש?` },
      names: { n1: nm('One', 'אחד', 'one', '1'), n2: nm('Two', 'שניים', 'two', '2'), n3: nm('Three', 'שלושה', 'three', '3') },
      answer: `n${n}`, choices: ['n1', 'n2', 'n3'], stimulus: [...intro, notesStim(line, 0.55)],
    });
  },
);

// bh-convert-2: backwards — a dominant 7: which diminished chord does it come from? (its ♭9 diminished: root + 1)
// ("Which note moved?" is bh-convert level 2.) There are only three diminished chords; each is named by its four notes.
deepen('bh-convert-2', [{ en: 'Which diminished chord is it from?', he: 'מאיזה דימיניש הוא בא?' }], (seed, level, id) => {
  const rnd = rng(seed);
  const r = 53 + Math.floor(rnd() * 12);
  // any inversion and register, so the item is never the same twice in a row
  const inv = Math.floor(rnd() * 4);
  const lift = rnd() < 0.5 ? 0 : 5;
  const dom = fit([r, r + 4, r + 7, r + 10].map((m, j) => m + (j < inv ? 12 : 0) + lift), 48, 79);
  const fam = (r + 1) % 3;
  const dimName = (f: number) => {
    const pcs = [0, 3, 6, 9].map((x) => (f + x) % 12);
    return { en: `${pcs.map((p) => pcName(p)).join(' ')} (${pcName(pcs[0])}°7)`, he: `${pcs.map((p) => pcNameHe(p)).join(' ')}` };
  };
  const keys = ['f0', 'f1', 'f2'];
  const names: Names = {};
  const choiceStim: Record<string, Stimulus[]> = {};
  keys.forEach((kk, f) => {
    const d = dimName(f);
    names[kk] = nm(d.en, d.he, `${pcName(f).replace('♭', ' flat')} diminished`);
    choiceStim[kk] = [chordStim(fit(DIM7(60 + f), 52, 76), 0.9), chordStim(dom, 1.2)];
  });
  return choiceQ({
    id, topic: 'bh-convert-2', level, seed, skill: 'chords', difficulty: 1650,
    ask: { en: `${pcName(r % 12)}7: lower one note of which diminished chord to get it?`, he: `${pcNameHe(r % 12)} 7: באיזה דימיניש מורידים צליל אחד כדי לקבל אותו?` },
    text: { en: `${pcName(r % 12)}7`, he: `${pcNameHe(r % 12)} 7` },
    names, answer: keys[fam], choices: keys, stimulus: [chordStim(dom, 1.4)], choiceStim,
  });
});

// bh-pivot: longer lines from other chord tones, faster.
deepen(
  'bh-pivot',
  [
    { en: 'Lines from 3, 5 and 7', he: 'קווים מ־3, 5 ו־7' },
    { en: 'Up or down, at tempo', he: 'למעלה או למטה, בטמפו' },
  ],
  (seed, level, id, k) => {
    const rnd = rng(seed);
    const root = 52 + Math.floor(rnd() * 8);
    const line = barryLine(pickR(rnd, [3, 5, 7]), 'three');
    const positions = Array.from({ length: Math.max(1, line.length - 4) }, (_, j) => j + 2);
    const at = pickR(rnd, positions);
    const dir: 1 | -1 = k === 2 && rnd() < 0.5 ? -1 : 1;
    const p = pivot(line, at, dir);
    const offered = [at, ...shuffleR(rnd, positions.filter((x) => x !== at)).slice(0, 4)].sort((a, b) => a - b);
    const names: Names = {};
    for (const x of offered) names[`p${x}`] = nm(`Before note ${x + 1}`, `לפני צליל ${x + 1}`, String(x + 1));
    const bpm = k === 1 ? 120 : 144;
    return choiceQ({
      id, topic: 'bh-pivot', level, seed, skill: 'sequences', difficulty: 1400 + 120 * k,
      ask: { en: 'The line jumped an octave once — before which note?', he: 'הקו קפץ אוקטבה פעם אחת — לפני איזה צליל?' },
      names, answer: `p${at}`, choices: offered.map((x) => `p${x}`),
      stimulus: [{ kind: 'melody', midis: p.map((s) => root + s), beats: p.map((_, j) => (j === p.length - 1 ? 2 : 0.5)), bpm }],
    });
  },
);

// bh-brothers: three dominants, one is not a brother.
deepen('bh-brothers', [{ en: 'Find the stranger', he: 'מי לא שייך' }], (seed, level, id) => {
  const rnd = rng(seed);
  const r1 = 55 + Math.floor(rnd() * 6);
  const dom = (r: number) => fit([r, r + 10, r + 16, r + 19].map((m) => (m > 62 ? m - 12 : m)), 50, 82);
  const bro = shuffleR(rnd, [3, 6, 9]).slice(0, 2);
  const stranger = pickR(rnd, [1, 2, 4, 5, 7, 10]);
  const order = shuffleR(rnd, [0, 1, 2]);
  const offs = [0, bro[0], bro[1]];
  // the stranger replaces one non-reference brother; the reference (offset 0) never moves
  const list = offs.map((o, j) => (j === 2 ? stranger : o));
  const played = order.map((j) => list[j]);
  const strangerAt = played.indexOf(stranger);
  const keys = ['c1', 'c2', 'c3'];
  return choiceQ({
    id, topic: 'bh-brothers', level, seed, skill: 'chords', difficulty: 1700,
    ask: { en: 'Three dominants — two are brothers (same diminished chord). Which one is the stranger?', he: 'שלושה דומיננטים — שניים אחים (אותו דימיניש). מי לא שייך?' },
    names: { c1: nm('The first', 'הראשון', 'first', 'one'), c2: nm('The second', 'השני', 'second', 'two'), c3: nm('The third', 'השלישי', 'third', 'three') },
    answer: keys[strangerAt], choices: keys,
    stimulus: played.flatMap((o, j) => (j ? [{ kind: 'rest' as const, duration: 0.3 }, chordStim(dom(r1 + o), 1.2)] : [chordStim(dom(r1 + o), 1.2)])),
  });
});
}

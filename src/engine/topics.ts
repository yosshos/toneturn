// Topic generators for ChoiceQuestion (spec T–V). Each topic: a title, a skill, levels, and a pure,
// seeded generator — so a review item can be rebuilt from its tag "choice:<topic>:<level>:<seed>".

import type { ChoiceQuestion, Stimulus } from './lesson';
import { MODE_STEPS, type ModeId } from './modes';
import { barryLine, DIM7, moveDim, pivot, SIX_OVER, type DimMove, type HalfStepRule } from './barry';

export { TOPIC_GEN, rng, pickR, shuffleR, pcName, pcNameHe, choiceQ, topicLesson, type TopicDef } from './topicKit';
import { TOPIC_GEN, rng, pickR, shuffleR, pcName, pcNameHe, choiceQ, chordStim, notesStim } from './topicKit';
import './topicsHarmony';
import './topicsEar';
import './topicsTheory';
import './topicsSkills';
import './topicsAD';
// 0.38 (spec AE): new topics and deeper levels for existing ones (wrappers run after the base topics).
import './topicsInstrument';
// PIANO_JAZZ: Barry Harris shapes and jazz chords on the keys.
import './topicsPianoJazz';
import './topicsWritten';
import './topicsHarmony2';
import './topicsPitch2';
import './topicsTime2';
import './topicsSound';
import './topicsChordRead';
import './topicsSongs';
import './topicsJazz';
import './topicsProgGames';
import './topicsGaps';
import './topicsChartAnalysis';
import { applyDepth } from './topicsDepth';

// ================================================================ T. Barry Harris

const DIM = (r: number) => [r, r + 3, r + 6, r + 9];

/** Lowering note i of a dim7 gives a dominant 7 on the lowered note; raising it gives a minor 6 (root = raised + 5). */
export function dimConvert(root: number, i: number, dir: 'down' | 'up'): { midis: number[]; kind: 'dom' | 'm6'; chordRoot: number } {
  const m = DIM(root).slice();
  m[i] += dir === 'down' ? -1 : 1;
  return dir === 'down' ? { midis: m, kind: 'dom', chordRoot: m[i] } : { midis: m, kind: 'm6', chordRoot: m[i] + 5 };
}
const chordName = (kind: 'dom' | 'm6', rootPc: number) => ({
  en: `${pcName(rootPc)}${kind === 'dom' ? '7' : 'm6'}`,
  he: `${pcNameHe(rootPc)} ${kind === 'dom' ? '7' : 'מינור 6'}`,
  say: [`${pcName(rootPc).replace('♭', ' flat')} ${kind === 'dom' ? 'seven' : 'minor six'}`, `${pcName(rootPc).replace('♭', 'b')}${kind === 'dom' ? '7' : 'm6'}`],
});

TOPIC_GEN['bh-convert'] = {
  title: { en: 'Barry Harris: the diminished chord changes', he: 'בארי האריס: הדימיניש משנה צורה' },
  skill: 'chords',
  levels: [
    { en: 'Dominant or minor 6?', he: 'דומיננט או מינור 6?' },
    { en: 'Which note moved?', he: 'איזה צליל זז?' },
    { en: 'Name the chord', he: 'מה שם האקורד?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 59 + Math.floor(rnd() * 3); // B, C, D♭ dim7 around middle C
    const i = Math.floor(rnd() * 4);
    const dir = rnd() < 0.6 ? 'down' : 'up';
    const res = dimConvert(root, i, dir);
    const stimulus: Stimulus[] = [chordStim(DIM(root), 1.2), { kind: 'rest', duration: 0.3 }, chordStim(res.midis, 1.6)];
    if (level === 1) {
      const other = dimConvert(root, i, dir === 'down' ? 'up' : 'down');
      return choiceQ({
        id, topic: 'bh-convert', level, seed, skill: 'chords', difficulty: 1150,
        ask: { en: 'The diminished chord moved one note: dominant 7 or minor 6?', he: 'צליל אחד בדימיניש זז: דומיננט 7 או מינור 6?' },
        names: { dom: { en: 'Dominant 7', he: 'דומיננט 7', say: ['dominant', 'seven', 'דומיננט'] }, m6: { en: 'Minor 6', he: 'מינור 6', say: ['minor six', 'minor', 'מינור'] } },
        answer: res.kind, choices: ['dom', 'm6'], stimulus,
        choiceStim: { [res.kind]: [chordStim(res.midis)], [other.kind]: [chordStim(other.midis)] },
      });
    }
    if (level === 2) {
      const names = {
        n1: { en: 'The lowest note', he: 'הצליל הנמוך', say: ['lowest', 'bottom', 'first', 'one', 'נמוך', 'ראשון'] },
        n2: { en: 'The 2nd note', he: 'הצליל השני', say: ['second', 'two', 'שני'] },
        n3: { en: 'The 3rd note', he: 'הצליל השלישי', say: ['third', 'three', 'שלישי'] },
        n4: { en: 'The top note', he: 'הצליל העליון', say: ['top', 'highest', 'fourth', 'four', 'עליון', 'רביעי'] },
      };
      const choiceStim: Record<string, Stimulus[]> = {};
      for (let k = 0; k < 4; k++) choiceStim[`n${k + 1}`] = [chordStim(DIM(root), 0.9), chordStim(dimConvert(root, k, dir).midis, 1.2)];
      return choiceQ({
        id, topic: 'bh-convert', level, seed, skill: 'chords', difficulty: 1300,
        ask: { en: `One note of the diminished chord moved ${dir === 'down' ? 'down' : 'up'} a half step — which?`, he: `צליל אחד בדימיניש ${dir === 'down' ? 'ירד' : 'עלה'} בחצי טון — איזה?` },
        names, answer: `n${i + 1}`, choices: ['n1', 'n2', 'n3', 'n4'], stimulus, choiceStim,
      });
    }
    // Level 3: name the chord among the four of the same family (all lowered, or all raised).
    const fam = [0, 1, 2, 3].map((k) => dimConvert(root, k, dir));
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    fam.forEach((f, k) => {
      names[`c${k}`] = chordName(f.kind, f.chordRoot % 12);
      choiceStim[`c${k}`] = [chordStim(f.midis)];
    });
    return choiceQ({
      id, topic: 'bh-convert', level, seed, skill: 'chords', difficulty: 1450,
      ask: { en: `Diminished on ${pcName(root % 12)}, one note moves — which chord is it?`, he: `דימיניש על ${pcNameHe(root % 12)}, צליל אחד זז — איזה אקורד זה?` },
      names, answer: `c${i}`, choices: shuffleR(rnd, ['c0', 'c1', 'c2', 'c3']), stimulus, choiceStim,
    });
  },
};

TOPIC_GEN['bh-keys'] = {
  title: { en: 'Barry Harris: one diminished, four keys', he: 'בארי האריס: דימיניש אחד, ארבעה סולמות' },
  skill: 'cadences',
  levels: [{ en: 'Same key or another?', he: 'אותו סולם או אחר?' }],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 59;
    const resolve = (k: number): Stimulus[] => {
      const dom = dimConvert(root, k, 'down');
      const tonic = dom.chordRoot + 5;
      return [chordStim(DIM(root), 0.9), chordStim(dom.midis, 0.9), chordStim([tonic - 12, tonic, tonic + 4, tonic + 7].map((m) => (m < 52 ? m + 12 : m)), 1.4)];
    };
    const ref = 3; // lowering the top note → dominant on the 6th degree… the reference resolution
    const k = Math.floor(rnd() * 4);
    const rel = (((k - ref) % 4) + 4) % 4; // 0 same, 1 = a minor third up, 2 = a tritone, 3 = a minor third down
    const keys = ['same', 'up3', 'tritone', 'down3'];
    return choiceQ({
      id, topic: 'bh-keys', level, seed, skill: 'cadences', difficulty: 1350,
      ask: { en: 'First the reference resolution, then another from the same diminished chord: where did it go?', he: 'קודם הפתרון לדוגמה, ואחר כך עוד אחד מאותו דימיניש: לאן הוא הלך?' },
      names: {
        same: { en: 'The same key', he: 'אותו סולם', say: ['same'] },
        up3: { en: 'A minor third up', he: 'טרצה קטנה למעלה', say: ['minor third up', 'up'] },
        tritone: { en: 'A tritone away', he: 'טריטון', say: ['tritone'] },
        down3: { en: 'A minor third down', he: 'טרצה קטנה למטה', say: ['minor third down', 'down'] },
      },
      answer: keys[rel], choices: keys,
      stimulus: [...resolve(ref), { kind: 'rest', duration: 0.8 }, ...resolve(k)],
    });
  },
};

const SCALE_NAMES: Partial<Record<ModeId, { en: string; he: string; say?: string[] }>> = {
  'sixth-dim': { en: 'Major 6th diminished', he: 'מז׳ור 6 דימיניש', say: ['sixth diminished', 'six diminished', 'barry harris'] },
  'minor-sixth-dim': { en: 'Minor 6th diminished', he: 'מינור 6 דימיניש', say: ['minor sixth diminished', 'minor six diminished'] },
  ionian: { en: 'Major', he: 'מז׳ור', say: ['major'] },
  'harmonic-major': { en: 'Harmonic major', he: 'מז׳ור הרמוני', say: ['harmonic major'] },
  'melodic-minor': { en: 'Melodic minor', he: 'מינור מלודי', say: ['melodic minor'] },
  'harmonic-minor': { en: 'Harmonic minor', he: 'מינור הרמוני', say: ['harmonic minor'] },
  'bebop-major': { en: 'Bebop major', he: 'ביבופ מז׳ורי', say: ['bebop major'] },
  lydian: { en: 'Lydian', he: 'לידי', say: ['lydian'] },
};

TOPIC_GEN['bh-scale'] = {
  title: { en: 'Barry Harris: 6th diminished scales', he: 'בארי האריס: סולמות 6 דימיניש' },
  skill: 'modes',
  levels: [
    { en: 'Major 6-dim or major?', he: '6 דימיניש או מז׳ור?' },
    { en: 'Major family', he: 'משפחת המז׳ור' },
    { en: 'Minor family', he: 'משפחת המינור' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool: ModeId[] = level === 1 ? ['sixth-dim', 'ionian'] : level === 2 ? ['sixth-dim', 'ionian', 'harmonic-major', 'lydian'] /* bebop major = the same notes as 6th-diminished: never both */ : ['minor-sixth-dim', 'melodic-minor', 'harmonic-minor', 'sixth-dim'];
    const mode = pickR(rnd, pool);
    const tonic = 57 + Math.floor(rnd() * 8);
    const play = (m: ModeId): Stimulus[] => [notesStim(MODE_STEPS[m].map((s) => tonic + s), 0.3), notesStim(MODE_STEPS[m].map((s) => tonic + s).reverse().slice(1), 0.3)];
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const m of pool) {
      names[m] = SCALE_NAMES[m]!;
      choiceStim[m] = play(m);
    }
    return choiceQ({ id, topic: 'bh-scale', level, seed, skill: 'modes', difficulty: 1150 + 100 * level, ask: { en: 'Which scale is this?', he: 'איזה סולם זה?' }, names, answer: mode, choices: shuffleR(rnd, pool), stimulus: play(mode), choiceStim });
  },
};

TOPIC_GEN['bh-tone'] = {
  title: { en: 'Barry Harris: 6 chord or diminished?', he: 'בארי האריס: אקורד 6 או דימיניש?' },
  skill: 'chords',
  levels: [{ en: 'Which chord owns the note?', he: 'לאיזה אקורד שייך הצליל?' }],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const t = 60;
    const six = [t, t + 4, t + 7, t + 9];
    const dim = [t - 1, t + 2, t + 5, t + 8];
    const fromSix = rnd() < 0.5;
    const note = pickR(rnd, fromSix ? six : dim) + 12;
    return choiceQ({
      id, topic: 'bh-tone', level, seed, skill: 'chords', difficulty: 1200,
      ask: { en: 'C6, then B diminished, then a note of the scale: from which chord?', he: 'C6, אחר כך סי דימיניש, ואז צליל מהסולם: מאיזה אקורד?' },
      names: { six: { en: 'The 6 chord', he: 'אקורד ה־6', say: ['six', 'sixth', 'major six', 'שש'] }, dim: { en: 'The diminished chord', he: 'הדימיניש', say: ['diminished', 'dim', 'דימיניש', 'מוקטן'] } },
      answer: fromSix ? 'six' : 'dim', choices: ['six', 'dim'],
      stimulus: [chordStim(six, 1), chordStim(dim, 1), { kind: 'rest', duration: 0.4 }, { kind: 'note', midi: note, duration: 1.2 }],
      choiceStim: { six: [chordStim([...six, note])], dim: [chordStim([...dim, note])] },
    });
  },
};

TOPIC_GEN['chromatic-added'] = {
  title: { en: 'Where is the added half step?', he: 'איפה נוסף חצי הטון?' },
  skill: 'modes',
  levels: [{ en: 'Major scale, up', he: 'סולם מז׳ור, עולה' }, { en: 'Dominant scale, down', he: 'סולם דומיננט, יורד' }],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = 57 + Math.floor(rnd() * 8);
    const base = level === 1 ? [0, 2, 4, 5, 7, 9, 11, 12] : [12, 10, 9, 7, 5, 4, 2, 0];
    // Insert a chromatic note in one whole-step gap.
    const gaps = base.slice(0, -1).map((_, i) => i).filter((i) => Math.abs(base[i + 1] - base[i]) === 2);
    const g = pickR(rnd, gaps);
    const line = [...base.slice(0, g + 1), (base[g] + base[g + 1]) / 2, ...base.slice(g + 1)].map((s) => tonic + s);
    const choices = gaps.slice(0, 4).includes(g) ? gaps.slice(0, 4) : [...gaps.slice(0, 3), g];
    const names: ChoiceQuestion['names'] = {};
    for (const c of choices) names[`g${c}`] = { en: `Between notes ${c + 1} and ${c + 2}`, he: `בין צליל ${c + 1} ל־${c + 2}`, say: [`${c + 1} and ${c + 2}`, `${c + 1} ${c + 2}`] };
    return choiceQ({
      id, topic: 'chromatic-added', level, seed, skill: 'modes', difficulty: 1150 + 100 * level,
      ask: { en: 'A half step was added to the scale — where?', he: 'נוסף חצי טון לסולם — איפה?' },
      names, answer: `g${g}`, choices: choices.map((c) => `g${c}`), stimulus: [notesStim(line, 0.32)],
    });
  },
};

// ---------------------------------------------------------------- Barry Harris, higher levels

const KIND_NAME = {
  dom7: { en: 'Dominant 7', he: 'דומיננט 7', say: ['dominant', 'seven', 'דומיננט'] },
  m6: { en: 'Minor 6', he: 'מינור 6', say: ['minor six', 'minor', 'מינור'] },
  maj6: { en: 'Major 6', he: 'מז׳ור 6', say: ['major six', 'major', 'מזור'] },
};
const nameOf = (kind: 'dom7' | 'm6' | 'maj6', root: number) => ({
  en: `${pcName(root)}${kind === 'dom7' ? '7' : kind === 'm6' ? 'm6' : '6'}`,
  he: `${pcNameHe(root)} ${kind === 'dom7' ? '7' : kind === 'm6' ? 'מינור 6' : 'מז׳ור 6'}`,
  say: [`${pcName(root).replace('♭', ' flat')} ${kind === 'dom7' ? 'seven' : kind === 'm6' ? 'minor six' : 'six'}`],
});

TOPIC_GEN['bh-convert-2'] = {
  title: { en: 'Barry Harris: moving one or two notes', he: 'בארי האריס: להזיז צליל אחד או שניים' },
  skill: 'chords',
  levels: [
    { en: 'Dominant, minor 6 or major 6?', he: 'דומיננט, מינור 6 או מז׳ור 6?' },
    { en: 'Name the chord (all three kinds)', he: 'מה שם האקורד (שלושת הסוגים)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 59 + Math.floor(rnd() * 4);
    const moves: DimMove[] = [];
    for (let i = 0; i < 4; i++) for (const dir of ['up', 'down'] as const) moves.push({ notes: [i], dir });
    for (let i = 0; i < 3; i++) for (const dir of ['up', 'down'] as const) moves.push({ notes: [i, i + 1], dir });
    const mv = pickR(rnd, moves);
    const res = moveDim(root, mv);
    const stimulus: Stimulus[] = [chordStim(DIM7(root), 1.1), { kind: 'rest', duration: 0.3 }, chordStim(res.midis, 1.6)];
    if (level === 1) {
      return choiceQ({
        id, topic: 'bh-convert-2', level, seed, skill: 'chords', difficulty: 1400,
        ask: { en: 'The diminished chord moved: which kind of chord is it now?', he: 'הדימיניש זז: איזה סוג אקורד זה עכשיו?' },
        names: KIND_NAME, answer: res.kind, choices: ['dom7', 'm6', 'maj6'], stimulus,
      });
    }
    // Level 2: four named chords from different moves of the same dim7 (one of them right).
    const others = shuffleR(rnd, moves.filter((x) => x !== mv)).map((x) => moveDim(root, x));
    const opts = [res];
    for (const o of others) if (opts.length < 4 && !opts.some((p) => p.kind === o.kind && p.root % 12 === o.root % 12)) opts.push(o);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    opts.forEach((o, k) => {
      names[`c${k}`] = nameOf(o.kind, o.root);
      choiceStim[`c${k}`] = [chordStim(o.midis)];
    });
    return choiceQ({
      id, topic: 'bh-convert-2', level, seed, skill: 'chords', difficulty: 1550,
      ask: { en: `Diminished on ${pcName(root)} — one or two notes move. Which chord?`, he: `דימיניש על ${pcNameHe(root)} — צליל אחד או שניים זזים. איזה אקורד?` },
      names, answer: 'c0', choices: shuffleR(rnd, ['c0', 'c1', 'c2', 'c3']), stimulus, choiceStim,
    });
  },
};

const OVER: { chord: keyof typeof SIX_OVER; en: string; he: string; iv: number[] }[] = [
  { chord: 'maj7', en: 'maj7', he: 'מז׳ור 7', iv: [0, 4, 7, 11] },
  { chord: 'm7', en: 'm7', he: 'מינור 7', iv: [0, 3, 7, 10] },
  { chord: 'm7b5', en: 'm7♭5', he: 'חצי מוקטן', iv: [0, 3, 6, 10] },
  { chord: '7', en: '7', he: '7', iv: [0, 4, 7, 10] },
  { chord: '7alt', en: '7alt', he: '7 אלטרד', iv: [0, 4, 10, 13, 15] },
  { chord: '7sus', en: '7sus', he: '7 סאס', iv: [0, 5, 7, 10] },
];

TOPIC_GEN['bh-six-over'] = {
  title: { en: 'Barry Harris: which 6 chord over it?', he: 'בארי האריס: איזה אקורד 6 מעליו?' },
  skill: 'theory',
  levels: [
    { en: 'm7, dominant, maj7', he: 'מינור 7, דומיננט, מז׳ור 7' },
    { en: 'All six chord types', he: 'כל ששת סוגי האקורדים' },
    { en: 'By ear: which 6 chord fits?', he: 'בשמיעה: איזה אקורד 6 מתאים?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? OVER.filter((o) => ['maj7', 'm7', '7'].includes(o.chord)) : OVER;
    const o = pickR(rnd, pool);
    const root = pickR(rnd, [0, 2, 5, 7, 9, 10]);
    const right = SIX_OVER[o.chord];
    const cands: { kind: 'maj6' | 'm6'; r: number }[] = [{ kind: right.kind, r: (root + right.up) % 12 }];
    for (const up of shuffleR(rnd, [0, 1, 3, 5, 7, 8, 10])) {
      for (const kind of ['maj6', 'm6'] as const) {
        const c = { kind, r: (root + up) % 12 };
        if (cands.length < 4 && !cands.some((x) => x.kind === c.kind && x.r === c.r)) cands.push(c);
      }
    }
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    const bass = 48 + root;
    const chordMidis = o.iv.map((x) => 60 + root + x).map((m) => (m > 76 ? m - 12 : m));
    cands.forEach((c, k) => {
      names[`s${k}`] = nameOf(c.kind, c.r);
      const six = (c.kind === 'maj6' ? [0, 4, 7, 9] : [0, 3, 7, 9]).map((x) => 60 + c.r + x).map((m) => (m > 79 ? m - 12 : m));
      choiceStim[`s${k}`] = [chordStim([bass, ...six], 1.6)];
    });
    const ear = level === 3;
    return choiceQ({
      id, topic: 'bh-six-over', level, seed, skill: ear ? 'chords' : 'theory', difficulty: 1300 + 100 * level,
      ask: ear
        ? { en: 'Hear the chord, then four 6 chords over its bass: which one does Barry use?', he: 'שמעו את האקורד, ואז ארבעה אקורדי 6 מעל הבס שלו: באיזה בארי משתמש?' }
        : { en: `Over ${pcName(root)}${o.en}, which 6 chord does Barry play?`, he: `מעל ${pcNameHe(root)} ${o.he}, איזה אקורד 6 בארי מנגן?` },
      text: ear ? undefined : { en: `${pcName(root)}${o.en}`, he: `${pcNameHe(root)} ${o.he}` },
      names, answer: 's0', choices: shuffleR(rnd, ['s0', 's1', 's2', 's3']),
      stimulus: ear ? [chordStim([bass, ...chordMidis], 1.6), { kind: 'rest', duration: 0.4 }, ...['s0', 's1', 's2', 's3'].flatMap((k) => [...choiceStim[k], { kind: 'rest' as const, duration: 0.25 }])] : [],
      choiceStim,
    });
  },
};

const RULE_LABEL = {
  none: { en: 'No extra half steps', he: 'בלי חצאי טונים נוספים', say: ['none', 'no', 'zero', 'בלי', 'אפס'] },
  one: { en: 'One: between 1 and ♭7', he: 'אחד: בין 1 ל־♭7', say: ['one', 'אחד'] },
  two: { en: 'Two: 2–1 and 1–♭7', he: 'שניים: 2–1 ו־1–♭7', say: ['two', 'שניים', 'שתיים'] },
  three: { en: 'Three: 3–2, 2–1 and 1–♭7', he: 'שלושה: 3–2, 2–1 ו־1–♭7', say: ['three', 'שלושה', 'שלוש'] },
};

TOPIC_GEN['bh-lines'] = {
  title: { en: 'Barry Harris: half steps in dominant lines', he: 'בארי האריס: חצאי טונים בקווי דומיננט' },
  skill: 'sequences',
  levels: [
    { en: 'From a chord tone: where is the half step?', he: 'מצליל אקורד: איפה חצי הטון?' },
    { en: 'How many half steps were added?', he: 'כמה חצאי טונים נוספו?' },
    { en: 'Did the chord tones land on the beats?', he: 'האם צלילי האקורד נחתו על הפעמות?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 50 + Math.floor(rnd() * 7);
    const play = (line: number[]): Stimulus[] => [
      chordStim([root, root + 4, root + 7, root + 10].map((m) => m + 12), 0.9),
      { kind: 'rest', duration: 0.3 },
      { kind: 'melody', midis: line.map((s) => root + s), beats: line.map((_, i) => (i === line.length - 1 ? 2 : 0.5)), bpm: 120 },
    ];
    if (level === 1) {
      const deg = pickR(rnd, [1, 3, 5, 7]);
      const withIt = rnd() < 0.75;
      const line = barryLine(deg, withIt ? 'one' : 'none');
      return choiceQ({
        id, topic: 'bh-lines', level, seed, skill: 'sequences', difficulty: 1350,
        ask: { en: 'A dominant line from a chord tone: was the half step between 1 and ♭7 added?', he: 'קו דומיננט מצליל אקורד: האם נוסף חצי הטון בין 1 ל־♭7?' },
        names: { one: RULE_LABEL.one, none: RULE_LABEL.none }, answer: withIt ? 'one' : 'none', choices: ['one', 'none'], stimulus: play(line),
        choiceStim: { one: play(barryLine(deg, 'one')), none: play(barryLine(deg, 'none')) },
      });
    }
    if (level === 2) {
      const deg = pickR(rnd, [1, 2, 3, 4, 5, 6, 7]);
      const options: HalfStepRule[] = deg === 1 ? ['none', 'one'] : [1, 3, 5, 7].includes(deg) ? ['none', 'one', 'three'] : ['none', 'two'];
      const rule = pickR(rnd, options);
      const choices: HalfStepRule[] = ['none', 'one', 'two', 'three'];
      return choiceQ({
        id, topic: 'bh-lines', level, seed, skill: 'sequences', difficulty: 1450,
        ask: { en: 'How many extra half steps in this line?', he: 'כמה חצאי טונים נוספים יש בקו הזה?' },
        names: RULE_LABEL, answer: rule, choices, stimulus: play(barryLine(deg, rule)),
      });
    }
    // Level 3: Barry's rule (chord tones on the downbeats) or a line that puts them off the beat.
    const deg = pickR(rnd, [3, 5, 7]);
    const good = rnd() < 0.5;
    const line = good ? barryLine(deg, 'three') : barryLine(deg, 'two').filter((_, i) => i !== 1);
    return choiceQ({
      id, topic: 'bh-lines', level, seed, skill: 'sequences', difficulty: 1550,
      ask: { en: 'Do the chord tones land on the beats — Barry’s rule — or not?', he: 'האם צלילי האקורד נוחתים על הפעמות — הכלל של בארי — או לא?' },
      names: { yes: { en: 'On the beats', he: 'על הפעמות', say: ['yes', 'on', 'כן'] }, no: { en: 'Off the beats', he: 'לא על הפעמות', say: ['no', 'off', 'לא'] } },
      answer: good ? 'yes' : 'no', choices: ['yes', 'no'], stimulus: play(line),
    });
  },
};

TOPIC_GEN['bh-pivot'] = {
  title: { en: 'Barry Harris: where did the line pivot?', he: 'בארי האריס: איפה הקו הסתובב?' },
  skill: 'sequences',
  levels: [{ en: 'An octave jump in a scale run', he: 'קפיצת אוקטבה בריצת סולם' }],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = 55 + Math.floor(rnd() * 6);
    const line = barryLine(1, 'one'); // 9 notes
    const at = 2 + Math.floor(rnd() * 5);
    const p = pivot(line, at, 1);
    const choices = [2, 3, 4, 5, 6].map((k) => `p${k}`);
    const names: ChoiceQuestion['names'] = {};
    for (const k of [2, 3, 4, 5, 6]) names[`p${k}`] = { en: `Before note ${k + 1}`, he: `לפני צליל ${k + 1}`, say: [String(k + 1)] };
    return choiceQ({
      id, topic: 'bh-pivot', level, seed, skill: 'sequences', difficulty: 1300,
      ask: { en: 'The run jumped an octave once to stay in range — before which note?', he: 'הריצה קפצה פעם אחת אוקטבה כדי להישאר במנעד — לפני איזה צליל?' },
      names, answer: `p${at}`, choices,
      stimulus: [{ kind: 'melody', midis: p.map((s) => root + s), beats: p.map((_, i) => (i === p.length - 1 ? 2 : 0.5)), bpm: 112 }],
    });
  },
};

// Barry Harris: the four "brother" dominants of one diminished chord (roots a minor third apart) share their
// ♭9 diminished chord, so they substitute for each other. Hear two dominants — same family?
TOPIC_GEN['bh-brothers'] = {
  title: { en: 'Barry Harris: brother dominants', he: 'בארי האריס: דומיננטים אחים' },
  skill: 'chords',
  levels: [
    { en: 'Same diminished family?', he: 'מאותה משפחת דימיניש?' },
    { en: 'Which brother?', he: 'איזה אח?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const r1 = 55 + Math.floor(rnd() * 6);
    const dom = (r: number) => {
      const b = r > 58 ? r - 12 : r;
      return [b, b + 10, b + 16, b + 19].map((m) => (m < 50 ? m + 12 : m)).sort((a, b2) => a - b2);
    };
    const play = (k: number): Stimulus[] => [chordStim(dom(r1), 1.1), { kind: 'rest', duration: 0.25 }, chordStim(dom(r1 + k), 1.4)];
    if (level === 1) {
      const fam = [3, 6, 9];
      const non = [1, 2, 4, 5, 7];
      const same = rnd() < 0.5;
      const k = same ? pickR(rnd, fam) : pickR(rnd, non);
      return choiceQ({
        id, topic: 'bh-brothers', level, seed, skill: 'chords', difficulty: 1450,
        ask: { en: 'Two dominants: brothers (same diminished chord) or not?', he: 'שני דומיננטים: אחים (אותו דימיניש) או לא?' },
        names: { yes: { en: 'Brothers', he: 'אחים', say: ['yes', 'same', 'brothers', 'כן'] }, no: { en: 'Not related', he: 'לא קשורים', say: ['no', 'not', 'different', 'לא'] } },
        answer: same ? 'yes' : 'no', choices: ['yes', 'no'], stimulus: play(k),
        choiceStim: { yes: play(same ? k : 3), no: play(same ? 2 : k) },
      });
    }
    const keys = ['up3', 'tritone', 'down3'];
    const k = pickR(rnd, [3, 6, 9]);
    const choiceStim: Record<string, Stimulus[]> = { up3: play(3), tritone: play(6), down3: play(9) };
    return choiceQ({
      id, topic: 'bh-brothers', level, seed, skill: 'chords', difficulty: 1600,
      ask: { en: 'The second dominant is a brother of the first — which one?', he: 'הדומיננט השני הוא אח של הראשון — איזה?' },
      names: {
        up3: { en: 'A minor third up', he: 'טרצה קטנה למעלה', say: ['minor third up', 'up'] },
        tritone: { en: 'A tritone away (tritone sub)', he: 'טריטון (תחליף טריטון)', say: ['tritone', 'tritone sub', 'flat five', 'טריטון'] },
        down3: { en: 'A minor third down', he: 'טרצה קטנה למטה', say: ['minor third down', 'down'] },
      },
      answer: keys[[3, 6, 9].indexOf(k)], choices: keys, stimulus: play(k), choiceStim,
    });
  },
};

// SPEC-0.48 §D: deeper levels for the thin topics (after every base topic above).
applyDepth();

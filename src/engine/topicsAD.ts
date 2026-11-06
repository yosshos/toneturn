// Spec AD (exercise taxonomy): the well-known exercises that were missing — octave, find the tonic, more
// cadences, modulation, harmonising a melody, compound intervals, scale types, non-chord tones, meter, the
// downbeat, hemiola, syncopation, voice count, musical terms, time signatures, voice leading, rhythmic and
// melodic transformations, Nashville numbers, and expression (dynamics, articulation, mood). Pure, seeded.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm, pcName, pcNameHe } from './topicKit';

type Names = ChoiceQuestion['names'];
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });
const ev = (events: NoteEvent[], length: number): Stimulus => ({ kind: 'events', events, length });
const N = (midi: number, start: number, duration: number, velocity = 0.7): NoteEvent => ({ midi, start, duration, velocity });
const notes = (midis: number[], each = 0.45, velocity = 0.7): Stimulus => ev(midis.map((m, i) => N(m, i * each, each * 0.95, velocity)), midis.length * each + 0.15);
/** Close-position triad (+ bass an octave below) on a root midi; q: 'M' | 'm' | 'd' | '7' (dominant). */
const chordOn = (root: number, q: 'M' | 'm' | 'd' | '7' = 'M') => {
  const iv = q === 'M' ? [0, 4, 7] : q === 'm' ? [0, 3, 7] : q === 'd' ? [0, 3, 6] : [0, 4, 7, 10];
  return [root - 12, ...iv.map((x) => root + x)];
};
const block = (midis: number[], start: number, dur: number, v = 0.5) => midis.map((m) => N(m, start, dur, v));
/** A chord progression as events (each chord `each` seconds; the last one longer). */
const prog = (chords: number[][], each = 0.8): Stimulus => {
  const out: NoteEvent[] = [];
  chords.forEach((c, i) => out.push(...block(c, i * each, i === chords.length - 1 ? each * 1.6 : each * 0.95)));
  return ev(out, (chords.length - 1) * each + each * 1.6 + 0.2);
};
/** Diatonic degree (1..7, may go beyond) → semitones in major. */
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
const degMidi = (tonic: number, d: number, scale = MAJ) => tonic + 12 * Math.floor((d - 1) / 7) + scale[(((d - 1) % 7) + 7) % 7];
/** Roman → chord in a major key at `tonic` (midi, middle register). */
const RN: Record<string, [number, 'M' | 'm' | 'd' | '7']> = { I: [0, 'M'], ii: [2, 'm'], iii: [4, 'm'], IV: [5, 'M'], V: [7, 'M'], V7: [7, '7'], vi: [9, 'm'], 'V/V': [2, '7'] };
const rn = (tonic: number, r: string) => {
  const [o, q] = RN[r];
  const root = tonic + o;
  return chordOn(root > tonic + 6 ? root - 12 : root, q);
};
const KEYS = [60, 62, 65, 67, 57, 58]; // C D F G A B♭ (tonic midis)

// ======================================================================= PITCH & HARMONY

TOPIC_GEN['octave'] = {
  title: { en: 'Same note, another octave?', he: 'אותו צליל, אוקטבה אחרת?' },
  skill: 'pitch',
  levels: [
    { en: 'Octave or a different note?', he: 'אוקטבה או צליל אחר?' },
    { en: 'Octave, or almost (7th, 9th)?', he: 'אוקטבה, או כמעט (ספטימה, נונה)?' },
    { en: 'Which one is the same note?', he: 'איזה מהם הוא אותו צליל?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const low = 48 + Math.floor(rnd() * 10);
    if (level === 3) {
      const opts = shuffleR(rnd, [12, 11, 13, 7]).slice(0, 3);
      if (!opts.includes(12)) opts[0] = 12;
      const order = shuffleR(rnd, opts);
      const letters = ['a', 'b', 'c'];
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      order.forEach((o, i) => {
        names[letters[i]] = nm(`Note ${letters[i].toUpperCase()}`, `צליל ${['א', 'ב', 'ג'][i]}`, letters[i].toUpperCase());
        choiceStim[letters[i]] = [notes([low, low + o], 0.7)];
      });
      return choiceQ({ id, topic: 'octave', level, seed, skill: 'pitch', difficulty: 980, ask: { en: 'A low note — which high note is the same note, an octave up?', he: 'צליל נמוך — איזה צליל גבוה הוא אותו צליל, אוקטבה למעלה?' }, names, answer: letters[order.indexOf(12)], choices: letters, stimulus: [notes([low], 1)], choiceStim });
    }
    const same = rnd() < 0.5;
    const off = same ? 12 : level === 1 ? pickR(rnd, [7, 9, 16, 5]) : pickR(rnd, [11, 13]);
    const names: Names = { same: nm('Same note', 'אותו צליל', 'same', 'octave'), diff: nm('Different note', 'צליל אחר', 'different') };
    return choiceQ({ id, topic: 'octave', level, seed, skill: 'pitch', difficulty: level === 1 ? 760 : 900, ask: { en: 'Low, then high: the same note an octave apart, or a different note?', he: 'נמוך ואז גבוה: אותו צליל באוקטבה אחרת, או צליל אחר?' }, names, answer: same ? 'same' : 'diff', choices: ['same', 'diff'], stimulus: [notes([low, low + off], 0.8)] });
  },
};

TOPIC_GEN['find-tonic'] = {
  title: { en: 'Find the home note', he: 'למצוא את הבית' },
  skill: 'degrees',
  levels: [
    { en: 'A tune around the home chord', he: 'מנגינה סביב אקורד הבית' },
    { en: 'A stepwise tune, ending away from home', he: 'מנגינה בצעדים שנגמרת רחוק מהבית' },
    { en: 'In a minor key', he: 'בסולם מינורי' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = pickR(rnd, KEYS);
    const scale = level === 3 ? MIN : MAJ;
    const pools: Record<number, number[][]> = {
      1: [[1, 3, 5, 3, 1, 5, 3], [5, 3, 1, 3, 5, 8, 5], [1, 5, 3, 5, 8, 5, 3]],
      2: [[1, 2, 3, 4, 5, 4, 3, 2], [3, 2, 1, 2, 3, 4, 5, 6], [5, 4, 3, 2, 1, 2, 3, 2], [1, 3, 2, 4, 3, 5, 4, 2]],
      3: [[1, 2, 3, 2, 1, 5, 4, 3], [5, 3, 1, 2, 3, 4, 2, 7], [1, 3, 5, 4, 3, 2, 1, 2]],
    };
    const tune = pickR(rnd, pools[level]).map((d) => degMidi(tonic, d === 7 && level === 3 ? 7 : d, scale) + (d === 7 && level === 3 ? 1 : 0));
    // Choices: the tonic and two other scale notes heard in the tune (same register).
    const others = shuffleR(rnd, [2, 3, 4, 5, 6].filter((d) => level > 1 || d === 3 || d === 5)).slice(0, 2);
    const cand = shuffleR(rnd, [1, ...others]);
    const letters = ['a', 'b', 'c'];
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    cand.forEach((d, i) => {
      names[letters[i]] = nm(`Note ${letters[i].toUpperCase()}`, `צליל ${['א', 'ב', 'ג'][i]}`, letters[i].toUpperCase());
      choiceStim[letters[i]] = [notes([degMidi(tonic, d, scale)], 1.1)];
    });
    return choiceQ({ id, topic: 'find-tonic', level, seed, skill: 'degrees', difficulty: [1000, 1150, 1300][level - 1], ask: { en: 'No chords this time. Which note feels like home?', he: 'הפעם בלי אקורדים. איזה צליל מרגיש כמו הבית?' }, names, answer: letters[cand.indexOf(1)], choices: letters, stimulus: [notes(tune, 0.42)], choiceStim });
  },
};

const CAD_TYPES: Record<string, { r: string[]; en: string; he: string; say: string[] }> = {
  authentic: { r: ['I', 'IV', 'V7', 'I'], en: 'Authentic (V → I)', he: 'אותנטית (V ← I)', say: ['authentic', 'perfect'] },
  plagal: { r: ['I', 'V', 'IV', 'I'], en: 'Plagal (IV → I, "Amen")', he: 'פלגלית (IV ← I, "אמן")', say: ['plagal', 'amen'] },
  half: { r: ['I', 'IV', 'ii', 'V'], en: 'Half (ends on V)', he: 'חצי קדנצה (נגמרת על V)', say: ['half'] },
  deceptive: { r: ['I', 'IV', 'V7', 'vi'], en: 'Deceptive (V → vi)', he: 'מטעה (V ← vi)', say: ['deceptive', 'interrupted'] },
};
TOPIC_GEN['cadence-types'] = {
  title: { en: 'Four kinds of cadence', he: 'ארבעה סוגי קדנצות' },
  skill: 'cadences',
  levels: [
    { en: 'Authentic or plagal?', he: 'אותנטית או פלגלית?' },
    { en: '… or half?', he: '… או חצי קדנצה?' },
    { en: 'All four, with deceptive', he: 'כל הארבע, כולל מטעה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = [['authentic', 'plagal'], ['authentic', 'plagal', 'half'], ['authentic', 'plagal', 'half', 'deceptive']][level - 1];
    const answer = pickR(rnd, pool);
    const tonic = pickR(rnd, KEYS);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(CAD_TYPES[k].en, CAD_TYPES[k].he, ...CAD_TYPES[k].say);
      choiceStim[k] = [prog(CAD_TYPES[k].r.map((r) => rn(tonic, r)))];
    }
    return choiceQ({ id, topic: 'cadence-types', level, seed, skill: 'cadences', difficulty: [1100, 1220, 1360][level - 1], ask: { en: 'How does the phrase end?', he: 'איך המשפט נגמר?' }, names, answer, choices: pool, stimulus: [prog(CAD_TYPES[answer].r.map((r) => rn(tonic, r)))], choiceStim });
  },
};

/** A short phrase that establishes a key: I–IV–V7–I (major) or i–iv–V7–i (minor). */
const keyPhrase = (tonic: number, minor = false) => (minor ? [chordOn(tonic, 'm'), chordOn(tonic + 5, 'm'), chordOn(tonic + 7, '7'), chordOn(tonic, 'm')] : [chordOn(tonic), chordOn(tonic + 5), chordOn(tonic + 7, '7'), chordOn(tonic)]);
const MOD: Record<string, { off: number; minor?: boolean; en: string; he: string; say: string[] }> = {
  stay: { off: 0, en: 'Stays in the same key', he: 'נשאר באותו סולם', say: ['same', 'stays', 'no'] },
  step: { off: 2, en: 'Up a whole step', he: 'טון שלם למעלה', say: ['step', 'whole step'] },
  dominant: { off: 7, en: 'To the dominant (V)', he: 'לדומיננטה (V)', say: ['dominant', 'five'] },
  sub: { off: 5, en: 'To the subdominant (IV)', he: 'לסובדומיננטה (IV)', say: ['subdominant', 'four'] },
  relminor: { off: -3, minor: true, en: 'To the relative minor', he: 'למינור המקביל', say: ['relative minor', 'minor'] },
};
TOPIC_GEN['modulation'] = {
  title: { en: 'Key change (modulation)', he: 'מעבר סולם (מודולציה)' },
  skill: 'cadences',
  levels: [
    { en: 'Did the key change?', he: 'האם הסולם השתנה?' },
    { en: 'Where to: a step up, or to the dominant?', he: 'לאן: טון למעלה, או לדומיננטה?' },
    { en: 'Dominant, subdominant or relative minor?', he: 'דומיננטה, סובדומיננטה או מינור מקביל?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = [['stay', 'step'], ['stay', 'step', 'dominant'], ['dominant', 'sub', 'relminor', 'step']][level - 1];
    const answer = pickR(rnd, pool);
    const tonic = pickR(rnd, [60, 62, 65, 57]);
    const second = (k: string) => {
      const m = MOD[k];
      let t2 = tonic + m.off;
      if (t2 > 66) t2 -= 12;
      return keyPhrase(t2, m.minor);
    };
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(MOD[k].en, MOD[k].he, ...MOD[k].say);
      choiceStim[k] = [prog([...keyPhrase(tonic), ...second(k)], 0.62)];
    }
    // Level 1: "changed" covers any key change.
    if (level === 1) {
      names.step = nm('It changed key', 'הסולם השתנה', 'changed', 'yes');
      const real = pickR(rnd, ['step', 'dominant', 'sub']);
      choiceStim.step = [prog([...keyPhrase(tonic), ...second(real)], 0.62)];
      return choiceQ({ id, topic: 'modulation', level, seed, skill: 'cadences', difficulty: 1150, ask: { en: 'Two phrases. Is the second in the same key?', he: 'שני משפטים. האם השני באותו סולם?' }, names, answer, choices: pool, stimulus: answer === 'stay' ? choiceStim.stay : choiceStim.step, choiceStim });
    }
    return choiceQ({ id, topic: 'modulation', level, seed, skill: 'cadences', difficulty: [0, 1300, 1480][level - 1], ask: { en: 'The first phrase sets home. Where does the second one go?', he: 'המשפט הראשון קובע את הבית. לאן הולך השני?' }, names, answer, choices: pool, stimulus: choiceStim[answer], choiceStim });
  },
};

TOPIC_GEN['harmonize'] = {
  title: { en: 'Harmonise a melody', he: 'להרמן מנגינה' },
  skill: 'cadences',
  levels: [
    { en: 'I, IV or V under the tune?', he: 'I, IV או V מתחת למנגינה?' },
    { en: 'Add ii and vi', he: 'מוסיפים ii ו־vi' },
    { en: 'A secondary dominant (V/V)', he: 'דומיננטה משנית (V/V)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = [['I', 'IV', 'V'], ['I', 'IV', 'V', 'ii', 'vi'], ['I', 'IV', 'V', 'V/V']][level - 1];
    const tonic = pickR(rnd, [60, 62, 65, 67]);
    // A melody bar made of the answer chord's tones — chosen so no other offered chord holds all of them.
    const tonesOf = (r: string) => {
      const [o, q] = RN[r];
      const iv = q === 'M' ? [0, 4, 7] : q === 'm' ? [0, 3, 7] : q === 'd' ? [0, 3, 6] : [0, 4, 7, 10];
      return iv.map((x) => (o + x) % 12);
    };
    let answer: string, mel: number[];
    let guard = 0;
    do {
      answer = level === 3 && rnd() < 0.5 ? 'V/V' : pickR(rnd, pool);
      const t = tonesOf(answer);
      const picks = shuffleR(rnd, t).slice(0, 3);
      mel = picks.map((pcs) => tonic + 12 + pcs - (pcs > 9 ? 12 : 0));
      guard++;
    } while (guard < 50 && pool.some((r) => r !== answer && mel.every((m) => tonesOf(r).includes((((m - tonic) % 12) + 12) % 12))));
    const melEv = (start: number) => mel.map((m, i) => N(m, start + i * 0.5, 0.48, 0.8));
    const withChord = (r: string) => ev([...block(rn(tonic, r), 0, 1.5, 0.4), ...melEv(0)], 1.8);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    const nameOf: Record<string, [string, string, string[]]> = { I: ['I (home)', 'I (הבית)', ['one', 'home']], IV: ['IV', 'IV', ['four']], V: ['V', 'V', ['five']], ii: ['ii', 'ii', ['two']], vi: ['vi', 'vi', ['six']], 'V/V': ['V/V (II7)', 'V/V (II7)', ['five of five', 'secondary']] };
    for (const r of pool) {
      names[r] = nm(nameOf[r][0], nameOf[r][1], ...nameOf[r][2]);
      choiceStim[r] = [withChord(r)];
    }
    return choiceQ({ id, topic: 'harmonize', level, seed, skill: 'cadences', difficulty: [1150, 1350, 1500][level - 1], ask: { en: `In ${pcName(tonic)} major: which chord fits under this bar?`, he: `ב${pcNameHe(tonic)} מז׳ור: איזה אקורד מתאים מתחת לתיבה?` }, names, answer: answer!, choices: pool, stimulus: [ev([...block(rn(tonic, 'I'), 0, 0.9, 0.35)], 1), rest(0.3), ev(melEv(0), 1.6)], choiceStim });
  },
};

const COMPOUND: Record<string, [number, string, string, string[]]> = {
  m9: [13, 'Minor 9th', 'נונה קטנה', ['minor ninth']],
  M9: [14, 'Major 9th', 'נונה גדולה', ['major ninth']],
  m10: [15, 'Minor 10th', 'דצימה קטנה', ['minor tenth']],
  M10: [16, 'Major 10th', 'דצימה גדולה', ['major tenth']],
  P11: [17, 'Perfect 11th', 'אונדצימה', ['eleventh']],
  P12: [19, 'Perfect 12th', 'דואודצימה', ['twelfth']],
  P8: [12, 'Octave', 'אוקטבה', ['octave']],
};
TOPIC_GEN['compound-intervals'] = {
  title: { en: 'Compound intervals', he: 'מרווחים מורכבים' },
  skill: 'intervals',
  levels: [
    { en: 'Octave, 9th or 10th?', he: 'אוקטבה, נונה או דצימה?' },
    { en: 'Major or minor 9th and 10th', he: 'נונה ודצימה, גדולה או קטנה' },
    { en: 'All, up to the 12th, together', he: 'הכל עד הדואודצימה, ביחד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = [['P8', 'M9', 'M10'], ['m9', 'M9', 'm10', 'M10'], ['M9', 'm10', 'M10', 'P11', 'P12']][level - 1];
    const answer = pickR(rnd, pool);
    const low = 45 + Math.floor(rnd() * 8);
    const play = (k: string) => (level === 3 ? ev(block([low, low + COMPOUND[k][0]], 0, 1.6, 0.6), 1.8) : notes([low, low + COMPOUND[k][0]], 0.8));
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(COMPOUND[k][1], COMPOUND[k][2], ...COMPOUND[k][3]);
      choiceStim[k] = [play(k)];
    }
    return choiceQ({ id, topic: 'compound-intervals', level, seed, skill: 'intervals', difficulty: [1350, 1480, 1620][level - 1], ask: { en: 'More than an octave apart — which interval?', he: 'יותר מאוקטבה — איזה מרווח?' }, names, answer, choices: pool, stimulus: [play(answer)], choiceStim });
  },
};

const SCALES: Record<string, [number[], string, string, string[]]> = {
  major: [[0, 2, 4, 5, 7, 9, 11, 12], 'Major', 'מז׳ור', ['major']],
  minor: [[0, 2, 3, 5, 7, 8, 10, 12], 'Natural minor', 'מינור טבעי', ['minor', 'natural minor']],
  pentaMaj: [[0, 2, 4, 7, 9, 12], 'Major pentatonic', 'פנטטוני מז׳ורי', ['major pentatonic']],
  pentaMin: [[0, 3, 5, 7, 10, 12], 'Minor pentatonic', 'פנטטוני מינורי', ['minor pentatonic']],
  blues: [[0, 3, 5, 6, 7, 10, 12], 'Blues scale', 'סולם בלוז', ['blues']],
  harmMin: [[0, 2, 3, 5, 7, 8, 11, 12], 'Harmonic minor', 'מינור הרמוני', ['harmonic minor', 'harmonic']],
};
TOPIC_GEN['scale-types'] = {
  title: { en: 'Pentatonic, blues and minor scales', he: 'סולמות פנטטוניים, בלוז ומינור' },
  skill: 'modes',
  levels: [
    { en: 'Major, minor or pentatonic?', he: 'מז׳ור, מינור או פנטטוני?' },
    { en: 'Major or minor pentatonic, or blues?', he: 'פנטטוני מז׳ורי או מינורי, או בלוז?' },
    { en: 'With harmonic minor', he: 'כולל מינור הרמוני' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = [['major', 'minor', 'pentaMaj'], ['pentaMaj', 'pentaMin', 'blues'], ['minor', 'harmMin', 'pentaMin', 'blues']][level - 1];
    const answer = pickR(rnd, pool);
    const t = pickR(rnd, [57, 60, 62, 64]);
    const play = (k: string) => notes(SCALES[k][0].map((x) => t + x), 0.3);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(SCALES[k][1], SCALES[k][2], ...SCALES[k][3]);
      choiceStim[k] = [play(k)];
    }
    return choiceQ({ id, topic: 'scale-types', level, seed, skill: 'modes', difficulty: [1050, 1250, 1400][level - 1], ask: { en: 'Which scale?', he: 'איזה סולם?' }, names, answer, choices: pool, stimulus: [play(answer)], choiceStim });
  },
};

const NCT: Record<string, { en: string; he: string; say: string[]; mel: (c: number) => [number, number][] }> = {
  // [midi offset from the chord root, length in beats]; the chord is a major triad on c.
  passing: { en: 'Passing note', he: 'צליל מעבר', say: ['passing'], mel: () => [[4, 1], [5, 1], [7, 2]] },
  neighbour: { en: 'Neighbour note', he: 'צליל שכן', say: ['neighbour', 'neighbor'], mel: () => [[7, 1], [9, 1], [7, 2]] },
  suspension: { en: 'Suspension (held over, then down)', he: 'השהיה (מוחזק ואז יורד)', say: ['suspension'], mel: () => [[5, 2], [4, 2]] },
  appoggiatura: { en: 'Appoggiatura (leap in, step out)', he: 'אפוג׳יאטורה (קפיצה פנימה, צעד החוצה)', say: ['appoggiatura'], mel: () => [[0, 1], [9, 1.5], [7, 1.5]] },
};
TOPIC_GEN['nct-ear'] = {
  title: { en: 'Notes outside the chord', he: 'צלילים מחוץ לאקורד' },
  skill: 'cadences',
  levels: [
    { en: 'Passing or neighbour?', he: 'מעבר או שכן?' },
    { en: 'With suspension', he: 'כולל השהיה' },
    { en: 'All four', he: 'כל הארבעה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = [['passing', 'neighbour'], ['passing', 'neighbour', 'suspension'], ['passing', 'neighbour', 'suspension', 'appoggiatura']][level - 1];
    const answer = pickR(rnd, pool);
    const c = pickR(rnd, [60, 62, 65]);
    const beat = 0.55;
    const play = (k: string) => {
      const out: NoteEvent[] = [...block([c - 12, c + 4 - 12, c + 7 - 12], 0, beat * 4, 0.38)];
      let t = 0;
      for (const [o, b] of NCT[k].mel(c)) {
        out.push(N(c + 12 + o - 12, t, b * beat * 0.95, 0.78));
        t += b * beat;
      }
      return ev(out, beat * 4 + 0.3);
    };
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(NCT[k].en, NCT[k].he, ...NCT[k].say);
      choiceStim[k] = [play(k)];
    }
    return choiceQ({ id, topic: 'nct-ear', level, seed, skill: 'cadences', difficulty: [1400, 1520, 1650][level - 1], ask: { en: 'One note of the tune is not in the chord. What kind is it?', he: 'צליל אחד במנגינה לא שייך לאקורד. איזה סוג הוא?' }, names, answer, choices: pool, stimulus: [play(answer)], choiceStim });
  },
};

// ======================================================================= TIME

/** A bar pattern of accompaniment in `beats` per bar (bass on 1; compound = 3 eighths per beat). */
function meterSound(beats: number, compound: boolean, bars: number, tempo = 100, tonic = 48): Stimulus {
  const out: NoteEvent[] = [];
  const beat = 60 / tempo;
  const sub = compound ? 3 : 1;
  const step = compound ? beat / 3 : beat;
  let t = 0;
  for (let b = 0; b < bars; b++)
    for (let i = 0; i < beats * sub; i++) {
      const down = i === 0;
      const strong = i % sub === 0;
      if (down) out.push(N(tonic, t, step * 0.9, 0.9));
      else if (strong) out.push(...block([tonic + 16, tonic + 19], t, step * 0.6, 0.42));
      else out.push(...block([tonic + 16, tonic + 19], t, step * 0.5, 0.2));
      t += step;
    }
  return ev(out, t + 0.2);
}
TOPIC_GEN['meter-feel'] = {
  title: { en: 'In 2, 3 or 4?', he: 'בשתיים, שלוש או ארבע?' },
  skill: 'meter',
  levels: [
    { en: 'March (2) or waltz (3)?', he: 'מארש (2) או ואלס (3)?' },
    { en: 'In 2, 3 or 4', he: 'בשתיים, שלוש או ארבע' },
    { en: 'Simple or compound: 3/4 or 6/8?', he: 'פשוט או מורכב: 3/4 או 6/8?' },
    { en: 'Hemiola: does the beat stretch?', he: 'המיולה: האם הפעמה נמתחת?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    const tonic = pickR(rnd, [45, 48, 50, 43]);
    if (level <= 2) {
      const pool = level === 1 ? ['2', '3'] : ['2', '3', '4'];
      const answer = pickR(rnd, pool);
      const lab: Record<string, [string, string, string[]]> = { '2': ['In 2 (march)', 'בשתיים (מארש)', ['two', 'march']], '3': ['In 3 (waltz)', 'בשלוש (ואלס)', ['three', 'waltz']], '4': ['In 4', 'בארבע', ['four']] };
      for (const k of pool) {
        names[k] = nm(lab[k][0], lab[k][1], ...lab[k][2]);
        choiceStim[k] = [meterSound(Number(k), false, 3, 112, tonic)];
      }
      return choiceQ({ id, topic: 'meter-feel', level, seed, skill: 'meter', difficulty: level === 1 ? 800 : 950, ask: { en: 'Count along: how many beats in each group?', he: 'ספרו יחד: כמה פעמות בכל קבוצה?' }, names, answer, choices: pool, stimulus: [meterSound(Number(answer), false, 4, 112, tonic)], choiceStim });
    }
    if (level === 3) {
      const answer = pickR(rnd, ['34', '68']);
      names['34'] = nm('3/4 (three beats)', '3/4 (שלוש פעמות)', 'three four', 'three');
      names['68'] = nm('6/8 (two beats of three)', '6/8 (שתי פעמות של שלוש)', 'six eight', 'six');
      // Same six eighths: 3/4 = 2+2+2 accents, 6/8 = 3+3.
      const six = (groups: number[]) => {
        const out: NoteEvent[] = [];
        const e = 0.2;
        let t = 0;
        for (let bar = 0; bar < 4; bar++) {
          let i = 0;
          for (const g of groups)
            for (let k = 0; k < g; k++) {
              out.push(k === 0 ? N(i === 0 ? tonic : tonic + 7, t, e * 0.9, i === 0 ? 0.9 : 0.7) : N(tonic + 16, t, e * 0.5, 0.22));
              i++;
              t += e;
            }
        }
        return ev(out, t + 0.2);
      };
      choiceStim['34'] = [six([2, 2, 2])];
      choiceStim['68'] = [six([3, 3])];
      return choiceQ({ id, topic: 'meter-feel', level, seed, skill: 'meter', difficulty: 1250, ask: { en: 'Six quick notes per bar — grouped 2+2+2 (3/4) or 3+3 (6/8)?', he: 'שישה צלילים מהירים בתיבה — 2+2+2 (3/4) או 3+3 (6/8)?' }, names, answer, choices: ['34', '68'], stimulus: choiceStim[answer], choiceStim });
    }
    // Hemiola: two bars of 3/4 felt as one bar of 3/2 (accents every 2 quarters) before the cadence.
    const answer = pickR(rnd, ['yes', 'no']);
    names.yes = nm('Yes — it stretches', 'כן — היא נמתחת', 'yes', 'hemiola');
    names.no = nm('No — steady in 3', 'לא — יציבה בשלוש', 'no', 'steady');
    const mk = (hem: boolean) => {
      const out: NoteEvent[] = [];
      const q = 0.42;
      let t = 0;
      for (let bar = 0; bar < 6; bar++) {
        const inHem = hem && (bar === 3 || bar === 4);
        for (let k = 0; k < 3; k++) {
          const idx = (bar - 3) * 3 + k; // 0..5 inside the hemiola
          const accent = inHem ? idx % 2 === 0 : k === 0;
          out.push(accent ? N(tonic + (inHem ? 7 : 0), t, q * (inHem ? 1.9 : 0.9), 0.9) : N(tonic + 16, t, q * 0.5, 0.2));
          t += q;
        }
      }
      out.push(N(tonic, t, 1, 0.9));
      return ev(out, t + 1.1);
    };
    choiceStim.yes = [mk(true)];
    choiceStim.no = [mk(false)];
    return choiceQ({ id, topic: 'meter-feel', level, seed, skill: 'meter', difficulty: 1550, ask: { en: 'A waltz heading to its ending — do two bars turn into one big bar of three (hemiola)?', he: 'ואלס לקראת הסוף — האם שתי תיבות הופכות לתיבה גדולה אחת של שלוש (המיולה)?' }, names, answer, choices: ['yes', 'no'], stimulus: choiceStim[answer], choiceStim });
  },
};

TOPIC_GEN['downbeat'] = {
  title: { en: 'Where is beat 1?', he: 'איפה הפעמה הראשונה?' },
  skill: 'meter',
  levels: [
    { en: 'Bass on 1 (clear)', he: 'בס על 1 (ברור)' },
    { en: 'Melody only, longest note on 1', he: 'מנגינה בלבד, הצליל הארוך על 1' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const k = Math.floor(rnd() * 4); // the bar starts at beat k+1
    const q = 0.45;
    const tonic = pickR(rnd, [48, 50, 53]);
    const out: NoteEvent[] = [];
    // Melody (one note per beat, the note on beat 1 is longer and lower when level 1 adds bass).
    const melodyFor = [0, 4, 7, 4];
    for (let i = 0; i < 9; i++) {
      const beat = (k + i) % 4; // 0 = beat 1
      const t = i * q;
      if (level === 1) out.push(beat === 0 ? N(tonic, t, q * 0.9, 0.9) : N(tonic + 12 + melodyFor[beat], t, q * 0.5, 0.35));
      else out.push(N(tonic + 12 + melodyFor[beat] + (beat === 0 ? 0 : 2), t, beat === 0 ? q * 0.98 : q * 0.45, beat === 0 ? 0.85 : 0.5));
    }
    const answer = String(((4 - k) % 4) + 1);
    const names: Names = {};
    const ord = ['1st', '2nd', '3rd', '4th'];
    const ordHe = ['הראשון', 'השני', 'השלישי', 'הרביעי'];
    for (let i = 1; i <= 4; i++) names[String(i)] = nm(`The ${ord[i - 1]} note`, `הצליל ${ordHe[i - 1]}`, String(i), ord[i - 1]);
    return choiceQ({ id, topic: 'downbeat', level, seed, skill: 'meter', difficulty: level === 1 ? 1000 : 1200, ask: { en: 'Four beats to a bar, starting anywhere. Which of the first four notes is beat 1?', he: 'ארבע פעמות בתיבה, מתחילים באמצע. איזה מארבעת הצלילים הראשונים הוא פעמה 1?' }, names, answer, choices: ['1', '2', '3', '4'], stimulus: [ev(out, 9 * q + 0.2)] });
  },
};

TOPIC_GEN['syncopation'] = {
  title: { en: 'Which beat is pushed?', he: 'איזו פעמה נדחפת?' },
  skill: 'rhythm-dictation',
  levels: [
    { en: 'One push in a bar of quarters', he: 'דחיפה אחת בתיבה של רבעים' },
    { en: 'Over eighth notes', he: 'מעל שמיניות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pushed = 2 + Math.floor(rnd() * 3); // beat 2, 3 or 4 arrives an eighth early
    const q = 0.5;
    const out: NoteEvent[] = [];
    for (let bar = 0; bar < 2; bar++)
      for (let b = 1; b <= 4; b++) {
        const t = bar * 4 * q + (b - 1) * q;
        out.push({ midi: 76, start: t, duration: 0.04, velocity: b === 1 ? 0.5 : 0.28, perc: b === 1 ? 'accent' : 'click' });
        if (level === 2) out.push(N(67, t, q * 0.4, 0.3), N(67, t + q / 2, q * 0.4, 0.25));
        if (b === pushed - 1) continue; // the note before the push is left out (tied over)
        out.push(N(64, b === pushed ? t - q / 2 : t, q * (b === pushed ? 1.4 : 0.9), 0.85));
      }
    const names: Names = { '2': nm('Beat 2', 'פעמה 2', 'two'), '3': nm('Beat 3', 'פעמה 3', 'three'), '4': nm('Beat 4', 'פעמה 4', 'four') };
    return choiceQ({ id, topic: 'syncopation', level, seed, skill: 'rhythm-dictation', difficulty: level === 1 ? 1200 : 1350, ask: { en: 'One note comes half a beat early (a push). Which beat does it belong to?', he: 'צליל אחד מגיע חצי פעמה מוקדם (דחיפה). לאיזו פעמה הוא שייך?' }, names, answer: String(pushed), choices: ['2', '3', '4'], stimulus: [ev(out, 8 * q + 0.3)] });
  },
};

// ======================================================================= FORM & TEXTURE

TOPIC_GEN['voice-count'] = {
  title: { en: 'How many notes at once?', he: 'כמה צלילים ביחד?' },
  skill: 'form',
  levels: [
    { en: 'One, two or three notes', he: 'צליל אחד, שניים או שלושה' },
    { en: 'Two, three or four notes', he: 'שניים, שלושה או ארבעה צלילים' },
    { en: 'How many moving lines?', he: 'כמה קווים נעים?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? ['1', '2', '3'] : level === 2 ? ['2', '3', '4'] : ['1', '2', '3'];
    const answer = pickR(rnd, pool);
    const n = Number(answer);
    const base = 48 + Math.floor(rnd() * 6);
    const spread = [0, 7, 16, 22];
    let stim: Stimulus;
    if (level < 3) stim = ev(block(spread.slice(0, n).map((x) => base + x), 0, 1.8, 0.55), 2);
    else {
      // n independent lines in different registers and rhythms.
      const lines = [
        [[0, 2], [2, 2], [4, 4]],
        [[19, 1], [17, 1], [16, 1], [14, 1], [12, 4]],
        [[28, 3], [26, 1], [24, 2], [23, 2]],
      ];
      const out: NoteEvent[] = [];
      for (let v = 0; v < n; v++) {
        let t = 0;
        for (const [o, b] of lines[v]) {
          out.push(N(base + o, t, b * 0.3 * 0.95, 0.6));
          t += b * 0.3;
        }
      }
      stim = ev(out, 8 * 0.3 + 0.3);
    }
    const names: Names = { '1': nm('One', 'אחד', 'one'), '2': nm('Two', 'שניים', 'two'), '3': nm('Three', 'שלושה', 'three'), '4': nm('Four', 'ארבעה', 'four') };
    const sub: Names = {};
    for (const k of pool) sub[k] = names[k];
    return choiceQ({ id, topic: 'voice-count', level, seed, skill: 'form', difficulty: [900, 1150, 1300][level - 1], ask: level < 3 ? { en: 'How many notes are sounding together?', he: 'כמה צלילים נשמעים ביחד?' } : { en: 'How many separate lines are moving?', he: 'כמה קווים נפרדים נעים?' }, names: sub, answer, choices: pool, stimulus: [stim] });
  },
};

// ======================================================================= READING & THEORY (written)

const TERMS: { l: number; k: string; en: string; he: string; mean: [string, string] }[] = [
  { l: 1, k: 'largo', en: 'Largo', he: 'לרגו', mean: ['very slow, broad', 'איטי מאוד, רחב'] },
  { l: 1, k: 'adagio', en: 'Adagio', he: 'אדג׳ו', mean: ['slow', 'איטי'] },
  { l: 1, k: 'andante', en: 'Andante', he: 'אנדנטה', mean: ['walking pace', 'בקצב הליכה'] },
  { l: 1, k: 'allegro', en: 'Allegro', he: 'אלגרו', mean: ['fast, lively', 'מהיר, עליז'] },
  { l: 1, k: 'presto', en: 'Presto', he: 'פרסטו', mean: ['very fast', 'מהיר מאוד'] },
  { l: 1, k: 'ritardando', en: 'Ritardando (rit.)', he: 'ריטרדנדו (rit.)', mean: ['gradually slower', 'מאט בהדרגה'] },
  { l: 2, k: 'pp', en: 'pp (pianissimo)', he: 'pp (פיאניסימו)', mean: ['very soft', 'חלש מאוד'] },
  { l: 2, k: 'mf', en: 'mf (mezzo forte)', he: 'mf (מצו פורטה)', mean: ['moderately loud', 'חזק במידה'] },
  { l: 2, k: 'ff', en: 'ff (fortissimo)', he: 'ff (פורטיסימו)', mean: ['very loud', 'חזק מאוד'] },
  { l: 2, k: 'cresc', en: 'Crescendo (<)', he: 'קרשנדו (<)', mean: ['gradually louder', 'מתחזק בהדרגה'] },
  { l: 2, k: 'dim', en: 'Diminuendo (>)', he: 'דימינואנדו (>)', mean: ['gradually softer', 'נחלש בהדרגה'] },
  { l: 2, k: 'sfz', en: 'sfz (sforzando)', he: 'sfz (ספורצנדו)', mean: ['a sudden strong accent', 'הדגשה חזקה ופתאומית'] },
  { l: 3, k: 'staccato', en: 'Staccato (dot)', he: 'סטקטו (נקודה)', mean: ['short, detached', 'קצר ומנותק'] },
  { l: 3, k: 'legato', en: 'Legato (slur)', he: 'לגטו (קשת)', mean: ['smooth, connected', 'רציף ומחובר'] },
  { l: 3, k: 'fermata', en: 'Fermata (𝄐)', he: 'פרמטה (𝄐)', mean: ['hold longer than written', 'להחזיק יותר מהכתוב'] },
  { l: 3, k: 'dc', en: 'D.C. al Fine', he: 'D.C. al Fine', mean: ['back to the start, end at Fine', 'חזרה להתחלה, עד Fine'] },
  { l: 3, k: 'tenuto', en: 'Tenuto (–)', he: 'טנוטו (–)', mean: ['hold for full length', 'להחזיק את מלוא האורך'] },
  { l: 3, k: 'atempo', en: 'A tempo', he: 'א טמפו', mean: ['back to the original speed', 'חזרה למהירות המקורית'] },
];
TOPIC_GEN['musical-terms'] = {
  title: { en: 'Musical terms', he: 'מונחים מוזיקליים' },
  skill: 'theory',
  levels: [
    { en: 'Tempo words', he: 'מילות טמפו' },
    { en: 'Dynamics', he: 'דינמיקה' },
    { en: 'Articulation and signs', he: 'ארטיקולציה וסימנים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = TERMS.filter((t) => t.l === level);
    const pick = shuffleR(rnd, pool).slice(0, 4);
    const ans = pick[0];
    const order = shuffleR(rnd, pick);
    const names: Names = {};
    for (const t of order) names[t.k] = nm(t.mean[0], t.mean[1]);
    return choiceQ({ id, topic: 'musical-terms', level, seed, skill: 'theory', difficulty: [950, 1050, 1150][level - 1], ask: { en: `What does “${ans.en}” mean?`, he: `מה פירוש “${ans.he}”?` }, text: { en: ans.en, he: ans.he }, names, answer: ans.k, choices: order.map((t) => t.k), stimulus: [] });
  },
};

TOPIC_GEN['time-signatures'] = {
  title: { en: 'Time signatures', he: 'סימני משקל' },
  skill: 'theory',
  levels: [
    { en: 'How many beats in a bar?', he: 'כמה פעמות בתיבה?' },
    { en: 'Which time signature fits this bar?', he: 'איזה סימן משקל מתאים לתיבה?' },
    { en: 'Simple or compound, duple or triple?', he: 'פשוט או מורכב, זוגי או משולש?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level === 1) {
      const sig = pickR(rnd, [['2/4', '2'], ['3/4', '3'], ['4/4', '4'], ['5/4', '5']]);
      const names: Names = { '2': nm('Two', 'שתיים', 'two'), '3': nm('Three', 'שלוש', 'three'), '4': nm('Four', 'ארבע', 'four'), '5': nm('Five', 'חמש', 'five') };
      return choiceQ({ id, topic: 'time-signatures', level, seed, skill: 'theory', difficulty: 900, ask: { en: `How many quarter-note beats in a bar of ${sig[0]}?`, he: `כמה פעמות של רבע יש בתיבה של ${sig[0]}?` }, text: { en: sig[0], he: sig[0] }, names, answer: sig[1], choices: ['2', '3', '4', '5'], stimulus: [] });
    }
    if (level === 2) {
      const bars: [string, string][] = [['♩ ♩ ♩', '34'], ['♩ ♩ ♩ ♩', '44'], ['𝅗𝅥 ♩', '34'], ['𝅗𝅥 𝅗𝅥', '44'], ['♩. ♩.', '68'], ['♪♪♪ ♪♪♪', '68'], ['♩ ♩', '24'], ['♩ ♪♪', '24']];
      const [bar, answer] = pickR(rnd, bars);
      const names: Names = { '24': nm('2/4', '2/4', 'two four'), '34': nm('3/4', '3/4', 'three four'), '44': nm('4/4', '4/4', 'four four'), '68': nm('6/8', '6/8', 'six eight') };
      return choiceQ({ id, topic: 'time-signatures', level, seed, skill: 'theory', difficulty: 1100, ask: { en: 'Which time signature fits this one full bar?', he: 'איזה סימן משקל מתאים לתיבה המלאה הזאת?' }, text: { en: bar, he: bar }, names, answer, choices: ['24', '34', '44', '68'], stimulus: [] });
    }
    const sig = pickR(rnd, [['6/8', 'cd'], ['9/8', 'ct'], ['3/4', 'st'], ['2/4', 'sd'], ['12/8', 'cq'], ['4/4', 'sq']]);
    const names: Names = { sd: nm('Simple duple', 'פשוט זוגי', 'simple duple'), st: nm('Simple triple', 'פשוט משולש', 'simple triple'), sq: nm('Simple quadruple', 'פשוט מרובע', 'simple quadruple'), cd: nm('Compound duple', 'מורכב זוגי', 'compound duple'), ct: nm('Compound triple', 'מורכב משולש', 'compound triple'), cq: nm('Compound quadruple', 'מורכב מרובע', 'compound quadruple') };
    const pool = shuffleR(rnd, ['sd', 'st', 'sq', 'cd', 'ct', 'cq'].filter((x) => x !== sig[1])).slice(0, 3).concat(sig[1]);
    const choices = shuffleR(rnd, pool);
    const sub: Names = {};
    for (const c of choices) sub[c] = names[c];
    return choiceQ({ id, topic: 'time-signatures', level, seed, skill: 'theory', difficulty: 1300, ask: { en: `What kind of meter is ${sig[0]}?`, he: `איזה סוג משקל הוא ${sig[0]}?` }, text: { en: sig[0], he: sig[0] }, names: sub, answer: sig[1], choices, stimulus: [] });
  },
};

TOPIC_GEN['voice-leading'] = {
  title: { en: 'Voice leading rules', he: 'כללי הובלת קולות' },
  skill: 'theory',
  levels: [
    { en: 'Where does the leading note go?', he: 'לאן הולך הצליל המוביל?' },
    { en: 'Spot parallel fifths and octaves', he: 'לזהות קווינטות ואוקטבות מקבילות' },
    { en: 'Resolving the seventh', he: 'פתרון הספטימה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 7, 2, 5, 10]);
    const nmOf = (pc: number) => pcName(pc);
    const nmHe = (pc: number) => pcNameHe(pc);
    if (level === 1) {
      const lt = (key + 11) % 12;
      const opts = shuffleR(rnd, [key, (key + 9) % 12, (key + 7) % 12, (key + 2) % 12]);
      const names: Names = {};
      opts.forEach((p) => (names[`n${p}`] = nm(nmOf(p), nmHe(p))));
      return choiceQ({ id, topic: 'voice-leading', level, seed, skill: 'theory', difficulty: 1150, ask: { en: `In ${nmOf(key)} major, the leading note ${nmOf(lt)} in V–I usually moves to…`, he: `ב${nmHe(key)} מז׳ור, הצליל המוביל ${nmHe(lt)} ב־V–I עובר בדרך כלל ל…` }, text: { en: `${nmOf(lt)} → ?`, he: `${nmHe(lt)} ← ?` }, names, answer: `n${key}`, choices: opts.map((p) => `n${p}`), stimulus: [] });
    }
    if (level === 2) {
      // Two voices, two chords: show the intervals; which pair moves in parallel fifths/octaves?
      const kind = pickR(rnd, ['p5', 'p8', 'ok']);
      const lowA = key;
      const lowB = (key + pickR(rnd, [2, 5, 7])) % 12;
      const upA = kind === 'ok' ? (lowA + 4) % 12 : (lowA + (kind === 'p5' ? 7 : 0)) % 12;
      const upB = kind === 'ok' ? (lowB + 3) % 12 : (lowB + (kind === 'p5' ? 7 : 0)) % 12;
      const txt = `${nmOf(upA)} → ${nmOf(upB)}\n${nmOf(lowA)} → ${nmOf(lowB)}`;
      const txtHe = `${nmHe(upA)} ← ${nmHe(upB)}\n${nmHe(lowA)} ← ${nmHe(lowB)}`;
      const names: Names = { p5: nm('Parallel fifths', 'קווינטות מקבילות', 'fifths'), p8: nm('Parallel octaves', 'אוקטבות מקבילות', 'octaves'), ok: nm('Fine — no parallels', 'תקין — אין מקבילות', 'fine', 'none') };
      return choiceQ({ id, topic: 'voice-leading', level, seed, skill: 'theory', difficulty: 1400, ask: { en: 'Upper and lower voice move together. What do you see?', he: 'הקול העליון והתחתון זזים יחד. מה רואים?' }, text: { en: txt, he: txtHe }, names, answer: kind, choices: ['p5', 'p8', 'ok'], stimulus: [] });
    }
    const root = (key + 7) % 12; // V7 in the key
    const sev = (root + 10) % 12;
    const right = (sev + 11) % 12; // down a half step (→ the 3rd of I)
    const opts = shuffleR(rnd, [right, (sev + 1) % 12, (sev + 2) % 12, (sev + 10) % 12]);
    const names: Names = {};
    opts.forEach((p) => (names[`n${p}`] = nm(nmOf(p), nmHe(p))));
    return choiceQ({ id, topic: 'voice-leading', level, seed, skill: 'theory', difficulty: 1520, ask: { en: `${nmOf(root)}7 → ${nmOf(key)}: the seventh (${nmOf(sev)}) resolves to…`, he: `${nmOf(root)}7 ← ${nmOf(key)}: הספטימה (${nmHe(sev)}) נפתרת ל…` }, text: { en: `${nmOf(root)}7 → ${nmOf(key)}`, he: `${nmOf(root)}7 → ${nmOf(key)}` }, names, answer: `n${right}`, choices: opts.map((p) => `n${p}`), stimulus: [] });
  },
};

// ======================================================================= TRANSFORMATIONS (skill `transpose`)

const NASH_KEYS = [0, 7, 2, 9, 4, 5, 10, 3];
const deg2pc = (key: number, deg: number) => (key + MAJ[deg - 1]) % 12;
const chordName = (key: number, r: string) => {
  const d = { I: 1, ii: 2, iii: 3, IV: 4, V: 5, vi: 6 }[r]!;
  const minor = r === r.toLowerCase();
  return pcName(deg2pc(key, d)) + (minor ? 'm' : '');
};
TOPIC_GEN['nashville'] = {
  title: { en: 'Numbers to chords (Nashville)', he: 'ממספרים לאקורדים (נאשוויל)' },
  skill: 'transpose',
  levels: [
    { en: 'I–IV–V in a new key', he: 'I–IV–V בסולם חדש' },
    { en: 'With ii and vi', he: 'כולל ii ו־vi' },
    { en: 'Move a progression from one key to another', he: 'להעביר מהלך מסולם לסולם' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool: string[] = level === 1 ? ['I', 'IV', 'V'] : ['I', 'ii', 'IV', 'V', 'vi'];
    const romans = Array.from({ length: 4 }, () => pickR(rnd, pool));
    romans[0] = 'I';
    if (!romans.some((r) => r !== 'I')) romans[2] = 'V';
    const key = pickR(rnd, NASH_KEYS);
    const from = level === 3 ? pickR(rnd, NASH_KEYS.filter((k) => k !== key)) : null;
    const right = romans.map((r) => chordName(key, r)).join(' – ');
    const wrongs = new Set<string>();
    // Distractors: right numbers in a neighbouring key; one chord wrong; minor/major swapped.
    wrongs.add(romans.map((r) => chordName((key + 7) % 12, r)).join(' – '));
    wrongs.add(romans.map((r) => chordName((key + 5) % 12, r)).join(' – '));
    const alt = romans.slice();
    const i = 1 + Math.floor(rnd() * 3);
    alt[i] = alt[i] === 'IV' ? 'V' : 'IV';
    wrongs.add(alt.map((r) => chordName(key, r)).join(' – '));
    const opts = shuffleR(rnd, [right, ...[...wrongs].filter((w) => w !== right).slice(0, 3)]);
    const names: Names = {};
    opts.forEach((o, k) => (names[`o${k}`] = nm(o, o, ['A', 'B', 'C', 'D'][k])));
    const numStr = romans.join(' – ');
    const ask = from === null ? { en: `${numStr} in ${pcName(key)} major is…`, he: `${numStr} ב${pcNameHe(key)} מז׳ור הוא…` } : { en: `${romans.map((r) => chordName(from, r)).join(' – ')} (in ${pcName(from)}) — moved to ${pcName(key)}:`, he: `${romans.map((r) => chordName(from, r)).join(' – ')} (ב${pcNameHe(from)}) — מועבר ל${pcNameHe(key)}:` };
    return choiceQ({ id, topic: 'nashville', level, seed, skill: 'transpose', difficulty: [1050, 1200, 1350][level - 1], ask, text: { en: numStr, he: numStr }, names, answer: `o${opts.indexOf(right)}`, choices: opts.map((_, k) => `o${k}`), stimulus: [] });
  },
};

/** Melodic transformations heard: sequence, mutation, inversion / retrograde. */
TOPIC_GEN['melodic-transform'] = {
  title: { en: 'Melodic transformations', he: 'טרנספורמציות מלודיות' },
  skill: 'transpose',
  levels: [
    { en: 'Continue the sequence a step higher', he: 'להמשיך את הסקוונצה צעד למעלה' },
    { en: 'The same tune in minor (mutation)', he: 'אותה מנגינה במינור (מוטציה)' },
    { en: 'Inversion, retrograde or transposition?', he: 'היפוך, רטרוגרד או טרנספוזיציה?' },
    { en: 'The same tune in a mode', he: 'אותה מנגינה במודוס' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = pickR(rnd, [60, 62, 65, 67]);
    const motifs = [[1, 2, 3, 1], [1, 3, 2, 1], [3, 2, 1, 2], [1, 2, 3, 5, 3], [5, 4, 3, 1]];
    const m = pickR(rnd, motifs);
    const letters = ['a', 'b', 'c'];
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    const label = (i: number) => nm(`Version ${letters[i].toUpperCase()}`, `גרסה ${['א', 'ב', 'ג'][i]}`, letters[i].toUpperCase());
    if (level === 1) {
      const step = (k: number) => m.map((d) => degMidi(tonic, d + k));
      const right = step(2);
      const opts = shuffleR(rnd, [right, step(1).map((x, i) => (i === 2 ? x + 1 : x)), m.map((d) => degMidi(tonic, d + 2) + 2)]);
      opts.forEach((o, i) => {
        names[letters[i]] = label(i);
        choiceStim[letters[i]] = [notes(o, 0.36)];
      });
      return choiceQ({ id, topic: 'melodic-transform', level, seed, skill: 'transpose', difficulty: 1150, ask: { en: 'The motif, then one step higher. Which version continues it one more step up (in the key)?', he: 'המוטיב, ואז צעד אחד למעלה. איזו גרסה ממשיכה עוד צעד למעלה (בתוך הסולם)?' }, names, answer: letters[opts.indexOf(right)], choices: letters, stimulus: [notes(step(0), 0.36), rest(0.3), notes(step(1), 0.36)], choiceStim });
    }
    if (level === 2) {
      const tune = [1, 2, 3, 4, 5, 3, 1];
      const maj = tune.map((d) => degMidi(tonic, d));
      const right = tune.map((d) => degMidi(tonic, d, MIN));
      const opts = shuffleR(rnd, [right, tune.map((d) => degMidi(tonic - 3, d)), tune.map((d) => degMidi(tonic, d, [0, 2, 4, 5, 7, 9, 10]))]);
      opts.forEach((o, i) => {
        names[letters[i]] = label(i);
        choiceStim[letters[i]] = [notes(o, 0.34)];
      });
      return choiceQ({ id, topic: 'melodic-transform', level, seed, skill: 'transpose', difficulty: 1350, ask: { en: 'A tune in major. Which version is the same tune in minor, on the same home note?', he: 'מנגינה במז׳ור. איזו גרסה היא אותה מנגינה במינור, על אותו צליל בית?' }, names, answer: letters[opts.indexOf(right)], choices: letters, stimulus: [notes(maj, 0.34)], choiceStim });
    }
    if (level === 4) {
      const tune = [1, 2, 3, 4, 5, 6, 5, 3, 1];
      const MODES: Record<string, [number[], string, string, string[]]> = {
        dorian: [[0, 2, 3, 5, 7, 9, 10], 'Dorian', 'דורי', ['dorian']],
        mixolydian: [[0, 2, 4, 5, 7, 9, 10], 'Mixolydian', 'מיקסולידי', ['mixolydian']],
        lydian: [[0, 2, 4, 6, 7, 9, 11], 'Lydian', 'לידי', ['lydian']],
        phrygian: [[0, 1, 3, 5, 7, 8, 10], 'Phrygian', 'פריגי', ['phrygian']],
      };
      const pool = Object.keys(MODES);
      const answer = pickR(rnd, pool);
      for (const k of pool) {
        names[k] = nm(MODES[k][1], MODES[k][2], ...MODES[k][3]);
        choiceStim[k] = [notes(tune.map((d) => degMidi(tonic, d)), 0.3), rest(0.3), notes(tune.map((d) => degMidi(tonic, d, MODES[k][0])), 0.3)];
      }
      return choiceQ({ id, topic: 'melodic-transform', level, seed, skill: 'transpose', difficulty: 1620, ask: { en: 'A tune in major, then the same tune moved into a mode (same home note). Which mode?', he: 'מנגינה במז׳ור, ואז אותה מנגינה במודוס (אותו צליל בית). איזה מודוס?' }, names, answer, choices: pool, stimulus: choiceStim[answer], choiceStim });
    }
    const base = [0, 4, 2, 7, 5].map((x) => tonic + x);
    const kinds: Record<string, [number[], string, string, string[]]> = {
      inv: [base.map((x) => 2 * base[0] - x), 'Inversion (upside down)', 'היפוך (הפוך)', ['inversion', 'upside down']],
      retro: [base.slice().reverse(), 'Retrograde (backwards)', 'רטרוגרד (מהסוף להתחלה)', ['retrograde', 'backwards']],
      trans: [base.map((x) => x + 5), 'Transposition (moved)', 'טרנספוזיציה (הוזזה)', ['transposition', 'moved']],
    };
    const answer = pickR(rnd, Object.keys(kinds));
    for (const k of Object.keys(kinds)) {
      names[k] = nm(kinds[k][1], kinds[k][2], ...kinds[k][3]);
      choiceStim[k] = [notes(base, 0.32), rest(0.3), notes(kinds[k][0], 0.32)];
    }
    return choiceQ({ id, topic: 'melodic-transform', level, seed, skill: 'transpose', difficulty: 1500, ask: { en: 'A motif, then a changed version. What was done to it?', he: 'מוטיב, ואז גרסה שעברה שינוי. מה נעשה לו?' }, names, answer, choices: Object.keys(kinds), stimulus: choiceStim[answer], choiceStim });
  },
};

/** Rhythmic transformations beyond displacement: augmentation, clave direction, 3 over 4, metric modulation. */
const RT_STEP = 0.14; // sixteenth at ~107 BPM
const hits = (on: number[], cycle: number, reps: number, step = RT_STEP, midi = 64, clickEvery = 4): Stimulus => {
  const out: NoteEvent[] = [];
  for (let r = 0; r < reps; r++) {
    for (let k = 0; k < cycle; k += clickEvery) out.push({ midi: 76, start: (r * cycle + k) * step, duration: 0.04, velocity: k === 0 ? 0.5 : 0.28, perc: k === 0 ? 'accent' : 'click' });
    for (const o of on) out.push(N(midi, (r * cycle + o) * step, step * 1.6, 0.8));
  }
  return ev(out, reps * cycle * step + 0.2);
};
TOPIC_GEN['rhythm-transform'] = {
  title: { en: 'Rhythmic transformations', he: 'טרנספורמציות ריתמיות' },
  skill: 'transpose',
  levels: [
    { en: 'Twice as slow, or twice as fast?', he: 'פי שניים לאט, או פי שניים מהר?' },
    { en: 'Clave: 3-2 or 2-3?', he: 'קלאבה: 3-2 או 2-3?' },
    { en: 'A pattern of 3 over 4: where does it land?', he: 'תבנית של 3 על 4: איפה היא נוחתת?' },
    { en: 'Metric modulation: the new tempo', he: 'מודולציה מטרית: הטמפו החדש' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    if (level === 1) {
      const pat = pickR(rnd, [[0, 3, 6, 8], [0, 2, 4, 7], [0, 4, 6, 7]]);
      const answer = pickR(rnd, ['aug', 'dim', 'same']);
      const f = answer === 'aug' ? 2 : answer === 'dim' ? 0.5 : 1;
      names.aug = nm('Twice as slow (augmentation)', 'פי שניים לאט (אוגמנטציה)', 'slow', 'augmentation');
      names.dim = nm('Twice as fast (diminution)', 'פי שניים מהר (דימינוציה)', 'fast', 'diminution');
      names.same = nm('The same speed', 'אותה מהירות', 'same');
      const mk = (g: number) => [hits(pat, 16, 1, RT_STEP, 64, 4), rest(0.3), hits(pat.map((x) => x * g), 16 * g, 1, RT_STEP, 64, 4)];
      for (const k of ['aug', 'dim', 'same']) choiceStim[k] = mk(k === 'aug' ? 2 : k === 'dim' ? 0.5 : 1);
      return choiceQ({ id, topic: 'rhythm-transform', level, seed, skill: 'transpose', difficulty: 1250, ask: { en: 'A rhythm, then the same rhythm changed. How?', he: 'מקצב, ואז אותו מקצב בשינוי. איך?' }, names, answer, choices: ['aug', 'dim', 'same'], stimulus: mk(f), choiceStim });
    }
    if (level === 2) {
      const three = [0, 6, 12];
      const two = [4, 8];
      const answer = pickR(rnd, ['32', '23']);
      const pat = (k: string) => (k === '32' ? [...three, ...two.map((x) => x + 16)] : [...two, ...three.map((x) => x + 16)]);
      names['32'] = nm('3-2 clave', 'קלאבה 3-2', 'three two');
      names['23'] = nm('2-3 clave', 'קלאבה 2-3', 'two three');
      for (const k of ['32', '23']) choiceStim[k] = [hits(pat(k), 32, 2, 0.12, 76 - 4, 4)];
      return choiceQ({ id, topic: 'rhythm-transform', level, seed, skill: 'transpose', difficulty: 1400, ask: { en: 'Son clave over two bars. Which bar has the three hits — the first (3-2) or the second (2-3)?', he: 'קלאבת סון על פני שתי תיבות. באיזו תיבה שלוש המכות — בראשונה (3-2) או בשנייה (2-3)?' }, names, answer, choices: ['32', '23'], stimulus: choiceStim[answer], choiceStim });
    }
    if (level === 3) {
      // A 3-eighth figure repeated in 4/4: which beat does its 3rd repetition start on?
      const reps = 2 + Math.floor(rnd() * 3); // 2..4 → start of repetition (reps+1)
      const startEighth = reps * 3; // 6, 9, 12
      const answer = startEighth === 6 ? 'b4' : startEighth === 9 ? 'b1and' : 'b3';
      const out: NoteEvent[] = [];
      const e = 0.25;
      for (let k = 0; k < 16; k++) if (k % 2 === 0) out.push({ midi: 76, start: k * e, duration: 0.04, velocity: k % 8 === 0 ? 0.5 : 0.28, perc: k % 8 === 0 ? 'accent' : 'click' });
      for (let r = 0; r <= reps; r++) out.push(N(r === reps ? 72 : 64, r * 3 * e, e * 0.9, 0.85), N(67, (r * 3 + 1) * e, e * 0.9, 0.5));
      names.b4 = nm('Beat 4', 'פעמה 4', 'four');
      names.b1and = nm('The “and” of 1, bar 2', 'ה"ו" של 1, תיבה 2', 'and of one');
      names.b3 = nm('Beat 3, bar 2', 'פעמה 3, תיבה 2', 'three of bar two');
      return choiceQ({ id, topic: 'rhythm-transform', level, seed, skill: 'transpose', difficulty: 1600, ask: { en: 'A 3-eighth figure repeats over 4/4. Where does the high note (its last start) land?', he: 'דמות של 3 שמיניות חוזרת על 4/4. איפה נוחת הצליל הגבוה (ההתחלה האחרונה)?' }, names, answer, choices: ['b4', 'b1and', 'b3'], stimulus: [ev(out, 16 * e + 0.3)] });
    }
    // Metric modulation: old tempo T; "new quarter = old dotted quarter" (2/3 T) or "= old eighth" (2T) or "= old triplet-quarter" (3/2 T).
    const T = pickR(rnd, [60, 80, 90, 120]);
    const rules: Record<string, [number, string, string]> = {
      dotted: [(2 / 3) * T, 'new ♩ = old ♩.', 'רבע חדש = רבע מנוקד ישן'],
      eighth: [2 * T, 'new ♩ = old ♪', 'רבע חדש = שמינית ישנה'],
      trip: [(3 / 2) * T, 'new ♩ = old triplet ♩', 'רבע חדש = רבע טריולה ישן'],
    };
    const k = pickR(rnd, Object.keys(rules));
    const right = Math.round(rules[k][0]);
    const others = shuffleR(rnd, [...new Set([Math.round((2 / 3) * T), Math.round(2 * T), Math.round(1.5 * T), Math.round(T / 2), T])].filter((x) => x !== right)).slice(0, 3);
    const opts = shuffleR(rnd, [right, ...others]);
    for (const o of opts) names[`t${o}`] = nm(`${o} BPM`, `${o} BPM`, String(o));
    return choiceQ({ id, topic: 'rhythm-transform', level, seed, skill: 'transpose', difficulty: 1750, ask: { en: `♩ = ${T}. Then: ${rules[k][1]}. The new tempo is…`, he: `♩ = ${T}. ואז: ${rules[k][2]}. הטמפו החדש הוא…` }, text: { en: `♩ = ${T} → ${rules[k][1]}`, he: `♩ = ${T} → ${rules[k][2]}` }, names, answer: `t${right}`, choices: opts.map((o) => `t${o}`), stimulus: [] });
  },
};

// ======================================================================= EXPRESSION

TOPIC_GEN['dynamics'] = {
  title: { en: 'Loud and soft', he: 'חזק וחלש' },
  skill: 'expression',
  levels: [
    { en: 'Louder or softer?', he: 'חזק יותר או חלש יותר?' },
    { en: 'Getting louder, softer, or steady?', he: 'מתחזק, נחלש או קבוע?' },
    { en: 'Which bar is the loudest?', he: 'איזו תיבה הכי חזקה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = pickR(rnd, [60, 62, 65, 55]);
    const tune = [0, 2, 4, 5, 7, 5, 4, 2].map((x) => tonic + x);
    const names: Names = {};
    if (level === 1) {
      const answer = pickR(rnd, ['louder', 'softer']);
      const [a, b] = answer === 'louder' ? [0.3, 0.95] : [0.95, 0.3];
      names.louder = nm('Second is louder', 'השני חזק יותר', 'louder');
      names.softer = nm('Second is softer', 'השני חלש יותר', 'softer');
      return choiceQ({ id, topic: 'dynamics', level, seed, skill: 'expression', difficulty: 700, ask: { en: 'The same tune twice. Is the second time louder or softer?', he: 'אותה מנגינה פעמיים. האם בפעם השנייה חזק יותר או חלש יותר?' }, names, answer, choices: ['louder', 'softer'], stimulus: [notes(tune, 0.3, a), rest(0.4), notes(tune, 0.3, b)] });
    }
    if (level === 2) {
      const answer = pickR(rnd, ['cresc', 'dim', 'steady']);
      const n = 12;
      const vel = (i: number) => (answer === 'cresc' ? 0.12 + (0.88 * i) / (n - 1) : answer === 'dim' ? 1 - (0.88 * i) / (n - 1) : 0.55);
      const out = Array.from({ length: n }, (_, i) => N(tonic + [0, 4, 7, 4][i % 4], i * 0.28, 0.26, vel(i)));
      names.cresc = nm('Getting louder (crescendo)', 'מתחזק (קרשנדו)', 'crescendo', 'louder');
      names.dim = nm('Getting softer (diminuendo)', 'נחלש (דימינואנדו)', 'diminuendo', 'softer');
      names.steady = nm('Steady', 'קבוע', 'steady', 'same');
      return choiceQ({ id, topic: 'dynamics', level, seed, skill: 'expression', difficulty: 820, ask: { en: 'Is it getting louder, getting softer, or staying the same?', he: 'זה מתחזק, נחלש או נשאר אותו דבר?' }, names, answer, choices: ['cresc', 'dim', 'steady'], stimulus: [ev(out, n * 0.28 + 0.2)] });
    }
    const loud = 1 + Math.floor(rnd() * 4);
    const out: NoteEvent[] = [];
    for (let bar = 1; bar <= 4; bar++) for (let k = 0; k < 4; k++) out.push(N(tonic + [0, 4, 7, 12][k], ((bar - 1) * 4 + k) * 0.25, 0.23, bar === loud ? 0.95 : 0.42 + 0.06 * ((bar + seed) % 3)));
    for (let b = 1; b <= 4; b++) names[String(b)] = nm(`Bar ${b}`, `תיבה ${b}`, String(b));
    return choiceQ({ id, topic: 'dynamics', level, seed, skill: 'expression', difficulty: 950, ask: { en: 'Four bars. Which one is the loudest?', he: 'ארבע תיבות. איזו הכי חזקה?' }, names, answer: String(loud), choices: ['1', '2', '3', '4'], stimulus: [ev(out, 16 * 0.25 + 0.2)] });
  },
};

TOPIC_GEN['articulation'] = {
  title: { en: 'Short, smooth or accented', he: 'קצר, רציף או מודגש' },
  skill: 'expression',
  levels: [
    { en: 'Staccato or legato?', he: 'סטקטו או לגטו?' },
    { en: 'Staccato, legato or accents?', he: 'סטקטו, לגטו או הדגשות?' },
    { en: 'Which note is accented?', he: 'איזה צליל מודגש?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = pickR(rnd, [60, 62, 64, 57]);
    const line = [0, 2, 4, 5, 7, 5, 4, 2].map((x) => tonic + x);
    const each = 0.32;
    const play = (k: string) => ev(line.map((m, i) => N(m, i * each, k === 'stacc' ? each * 0.25 : each * 1.05, k === 'acc' ? (i % 2 === 0 ? 0.95 : 0.3) : 0.6)), line.length * each + 0.2);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    if (level < 3) {
      const pool = level === 1 ? ['stacc', 'leg'] : ['stacc', 'leg', 'acc'];
      const answer = pickR(rnd, pool);
      const lab: Record<string, [string, string, string]> = { stacc: ['Short (staccato)', 'קצר (סטקטו)', 'staccato'], leg: ['Smooth (legato)', 'רציף (לגטו)', 'legato'], acc: ['Accented', 'מודגש', 'accents'] };
      for (const k of pool) {
        names[k] = nm(lab[k][0], lab[k][1], lab[k][2]);
        choiceStim[k] = [play(k)];
      }
      return choiceQ({ id, topic: 'articulation', level, seed, skill: 'expression', difficulty: level === 1 ? 750 : 880, ask: { en: 'How are the notes played?', he: 'איך מנוגנים הצלילים?' }, names, answer, choices: pool, stimulus: [play(answer)], choiceStim });
    }
    const acc = 2 + Math.floor(rnd() * 4); // note 2..5
    const out = line.slice(0, 6).map((m, i) => N(m, i * 0.4, 0.36, i + 1 === acc ? 0.98 : 0.36));
    for (let b = 2; b <= 5; b++) names[String(b)] = nm(`Note ${b}`, `צליל ${b}`, String(b));
    return choiceQ({ id, topic: 'articulation', level, seed, skill: 'expression', difficulty: 1000, ask: { en: 'Six notes. Which one has the accent?', he: 'שישה צלילים. על איזה ההדגשה?' }, names, answer: String(acc), choices: ['2', '3', '4', '5'], stimulus: [ev(out, 6 * 0.4 + 0.2)] });
  },
};

const MOODS: Record<string, { minor: boolean; each: number; vel: number; en: string; he: string; say: string[] }> = {
  joyful: { minor: false, each: 0.18, vel: 0.9, en: 'Joyful', he: 'שמח', say: ['joyful', 'happy'] },
  calm: { minor: false, each: 0.55, vel: 0.3, en: 'Calm', he: 'רגוע', say: ['calm', 'peaceful'] },
  sad: { minor: true, each: 0.6, vel: 0.32, en: 'Sad', he: 'עצוב', say: ['sad'] },
  tense: { minor: true, each: 0.16, vel: 0.95, en: 'Tense', he: 'מתוח', say: ['tense', 'angry'] },
};
TOPIC_GEN['mood'] = {
  title: { en: 'What is the mood?', he: 'מה מצב הרוח?' },
  skill: 'expression',
  levels: [
    { en: 'Joyful or sad?', he: 'שמח או עצוב?' },
    { en: 'Joyful, calm, sad or tense', he: 'שמח, רגוע, עצוב או מתוח' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? ['joyful', 'sad'] : ['joyful', 'calm', 'sad', 'tense'];
    const answer = pickR(rnd, pool);
    const tonic = pickR(rnd, [57, 60, 62]);
    const play = (k: string) => {
      const M = MOODS[k];
      const sc = M.minor ? MIN : MAJ;
      const degs = [1, 3, 5, 3, 4, 2, 7, 1, 3, 5, 8, 5];
      const out = degs.map((d, i) => N(degMidi(tonic, d, sc) + (M.minor && d === 7 ? 1 : 0), i * M.each, M.each * (M.vel > 0.5 ? 0.6 : 1.05), M.vel));
      out.push(...block((M.minor ? chordOn(tonic - 12, 'm') : chordOn(tonic - 12)).slice(1), 0, degs.length * M.each, M.vel * 0.5));
      return ev(out, degs.length * M.each + 0.4);
    };
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = nm(MOODS[k].en, MOODS[k].he, ...MOODS[k].say);
      choiceStim[k] = [play(k)];
    }
    return choiceQ({ id, topic: 'mood', level, seed, skill: 'expression', difficulty: level === 1 ? 650 : 800, ask: { en: 'How does this music feel?', he: 'איך המוזיקה הזאת מרגישה?' }, names, answer, choices: pool, stimulus: [play(answer)], choiceStim });
  },
};

// ======================================================================= P2: harmonic dictation, 3/4 displacement

/** Chord with an explicit bass (inversions): [bass, ...upper]. */
const withBass = (tonic: number, r: string): number[] => {
  const inv = r.endsWith('6');
  const base = rn(tonic, inv ? r.slice(0, -1) : r);
  if (!inv) return base;
  const third = base[2] - 12; // the chord's third, an octave down, in the bass
  return [third, ...base.slice(1)];
};
const HD_POOLS: string[][] = [
  ['I', 'IV', 'V'],
  ['I', 'ii', 'IV', 'V', 'vi'],
  ['I', 'I6', 'ii', 'IV', 'V', 'V/V', 'vi'],
];
TOPIC_GEN['harmonic-dictation'] = {
  title: { en: 'Harmonic dictation', he: 'הכתבה הרמונית' },
  skill: 'cadences',
  levels: [
    { en: 'Four chords: I, IV, V', he: 'ארבעה אקורדים: I, IV, V' },
    { en: 'With ii and vi', he: 'כולל ii ו־vi' },
    { en: 'With inversions and V/V', he: 'כולל היפוכים ו־V/V' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = HD_POOLS[level - 1];
    const pickProg = () => {
      const p = ['I'];
      while (p.length < 3) {
        const c = pickR(rnd, pool.filter((x) => x !== p[p.length - 1]));
        p.push(c);
      }
      p.push(pickR(rnd, ['I', 'V', level > 1 ? 'vi' : 'IV']));
      if (p[3] === p[2]) p[3] = p[2] === 'I' ? 'V' : 'I';
      return p;
    };
    const right = pickProg();
    const key = (p: string[]) => p.join(' – ');
    const opts = new Map<string, string[]>([[key(right), right]]);
    let guard = 0;
    while (opts.size < 4 && guard++ < 60) {
      const w = right.slice();
      const i = 1 + Math.floor(rnd() * 3);
      w[i] = pickR(rnd, pool.filter((x) => x !== right[i] && x !== w[i - 1]));
      if (rnd() < 0.3) {
        const j = i === 3 ? 1 : i + 1;
        w[j] = pickR(rnd, pool.filter((x) => x !== right[j]));
      }
      opts.set(key(w), w);
    }
    const list = shuffleR(rnd, [...opts.values()]);
    const tonic = pickR(rnd, [60, 62, 65, 67]);
    const play = (p: string[]) => prog(p.map((r) => withBass(tonic, r)), 0.85);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    list.forEach((p, i) => {
      names[`o${i + 1}`] = nm(key(p), key(p), ['A', 'B', 'C', 'D'][i]);
      choiceStim[`o${i + 1}`] = [play(p)];
    });
    return choiceQ({ id, topic: 'harmonic-dictation', level, seed, skill: 'cadences', difficulty: [1300, 1480, 1680][level - 1], ask: { en: `In ${pcName(tonic)} major: write down the four chords.`, he: `ב${pcNameHe(tonic)} מז׳ור: רשמו את ארבעת האקורדים.` }, names, answer: `o${list.indexOf(right) + 1}`, choices: list.map((_, i) => `o${i + 1}`), stimulus: [ev(block(rn(tonic, 'I'), 0, 0.8, 0.3), 0.9), rest(0.4), play(right)], choiceStim });
  },
};

/** Displacement in 3/4 and 6/8: the bar is 12 sixteenths; a move of an eighth or a beat crosses the bar differently. */
const D34: { en: string; he: string; on: number[]; compound?: boolean }[] = [
  { en: 'Waltz figure', he: 'דמות ואלס', on: [0, 6, 8] },
  { en: 'Long-short', he: 'ארוך־קצר', on: [0, 6] },
  { en: 'Gigue (6/8)', he: 'ג׳יג (6/8)', on: [0, 4, 6, 10], compound: true },
];
TOPIC_GEN['displacement-3'] = {
  title: { en: 'Displacement in 3/4 and 6/8', he: 'הסטה ב־3/4 וב־6/8' },
  skill: 'transpose',
  levels: [{ en: 'How far did it move?', he: 'כמה זה זז?' }],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const p = pickR(rnd, D34);
    const pool = p.compound ? ['e', 'q', 'dq'] : ['e', 'q', 'h'];
    const by: Record<string, number> = { e: 2, q: 4, h: 8, dq: 6 };
    let answer: string, moved: number[];
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
    do {
      answer = pickR(rnd, pool);
      moved = p.on.map((o) => (o + by[answer]) % 12).sort((a, b) => a - b);
    } while (same(moved, p.on) || pool.some((k) => k !== answer && same(p.on.map((o) => (o + by[k]) % 12).sort((a, b) => a - b), moved)));
    const step = 0.16;
    const bar = (on: number[], bars: number) => {
      const out: NoteEvent[] = [];
      const beats = p.compound ? [0, 6] : [0, 4, 8];
      for (let b = 0; b < bars; b++) {
        beats.forEach((k, i) => out.push({ midi: 76, start: (b * 12 + k) * step, duration: 0.04, velocity: i === 0 ? 0.55 : 0.3, perc: i === 0 ? 'accent' : 'click' }));
        for (const o of on) out.push(N(64, (b * 12 + o) * step, step * 1.6, 0.8));
      }
      return ev(out, bars * 12 * step + 0.2);
    };
    const lab: Record<string, [string, string, string[]]> = {
      e: ['An eighth later', 'שמינית מאוחר יותר', ['eighth']],
      q: ['A quarter later', 'רבע מאוחר יותר', ['quarter']],
      h: ['Two quarters later', 'שני רבעים מאוחר יותר', ['two quarters', 'half']],
      dq: ['A dotted quarter (one beat) later', 'רבע מנוקד (פעמה) מאוחר יותר', ['dotted quarter', 'beat']],
    };
    const names: Names = {};
    for (const k of pool) names[k] = nm(lab[k][0], lab[k][1], ...lab[k][2]);
    return choiceQ({ id, topic: 'displacement-3', level, seed, skill: 'transpose', difficulty: 1450, ask: { en: `${p.en} in ${p.compound ? '6/8' : '3/4'} — then moved. How far?`, he: `${p.he} ב־${p.compound ? '6/8' : '3/4'} — ואז מוסט. כמה?` }, names, answer, choices: pool, stimulus: [bar(p.on, 2), rest(0.4), bar(moved, 2)] });
  },
};

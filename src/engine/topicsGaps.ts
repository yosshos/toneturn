// Exam gaps (0.56, docs/research/BAGRUT_AND_CONSERVATORY.md §2, owner 2026-11-09: "everything, in order"):
//   sight-modulate — sing a written line that leaves the key: a chromatic neighbour, then to the dominant, the relative
//                    minor, the subdominant, and away and back (TAU oral, Jerusalem Academy entrance).
//   chorale-rn     — a four-part chorale phrase: the Roman numeral and inversion of a marked chord (Bagrut "ניתוח כורל",
//                    TAU sample Q9): root-position triads → ii and vi → inversions → V7 and the cadential 6/4 → minor.
import type { SingSeqQuestion, Stimulus } from './lesson';
import { pc, type PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

const pcValue = (k: PitchClass) => ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[k.letter] + k.acc;
const MAJ = [0, 2, 4, 5, 7, 9, 11];
/** Nearest major-scale degree number (1–7) of a semitone offset from the tonic (chromatic notes take their letter's). */
const degreeOf = (semi: number) => {
  const s = ((semi % 12) + 12) % 12;
  let best = 0;
  MAJ.forEach((x, i) => (Math.abs(x - s) < Math.abs(MAJ[best] - s) || (Math.abs(x - s) === Math.abs(MAJ[best] - s) && x < s) ? (best = i) : 0));
  return best + 1;
};

// ======================================================================= sight-modulate

/** Lines as semitones from the tonic; each level's lines leave the key the same way. All end where they land. */
const LINES: number[][][] = [
  // 1. a chromatic neighbour or passing note, staying home
  [[7, 6, 7, 4, 2, 0], [4, 5, 6, 7, 4, 2, 0], [0, 2, 3, 4, 2, 0], [9, 8, 7, 5, 4, 2, 0], [4, 2, 1, 2, 4, 0]],
  // 2. to the dominant: the raised 4th leads to the new home
  [[0, 4, 7, 5, 4, 2, 4, 6, 7], [4, 2, 0, 2, 4, 5, 9, 6, 7], [7, 5, 4, 2, 4, 7, 9, 6, 7], [0, 2, 4, 7, 9, 11, 9, 6, 7]],
  // 3. to the relative minor: the raised 5th leads to 6
  [[4, 5, 7, 5, 4, 2, 4, 8, 9], [0, 4, 7, 5, 4, 2, 0, 8, 9], [7, 4, 5, 2, 4, 11, 12, 8, 9], [4, 7, 9, 7, 5, 4, 5, 8, 9]],
  // 4. to the subdominant: the lowered 7th
  [[7, 9, 7, 4, 2, 4, 10, 9, 7, 5], [0, 4, 7, 10, 9, 7, 5], [4, 7, 12, 10, 9, 7, 5], [0, 2, 4, 5, 7, 10, 9, 5]],
  // 5. away and back: out (to V or vi) and home again
  [[0, 2, 4, 6, 7, 9, 7, 5, 4, 2, 0], [4, 7, 9, 8, 9, 7, 5, 4, 2, 0], [0, 4, 7, 10, 9, 7, 5, 7, 11, 12], [7, 6, 7, 9, 11, 12, 10, 9, 7, 5, 4, 2, 0]],
];
const MOD_KEYS = ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb'];

TOPIC_GEN['sight-modulate'] = {
  title: { en: 'Sing a line that changes key', he: 'לשיר שורה שמשנה סולם' },
  skill: 'sight',
  levels: [
    { en: 'One chromatic note, staying home', he: 'צליל כרומטי אחד, נשארים בבית' },
    { en: 'To the dominant (♯4)', he: 'לדומיננטה (♯4)' },
    { en: 'To the relative minor (♯5)', he: 'למינור המקביל (♯5)' },
    { en: 'To the subdominant (♭7)', he: 'לסובדומיננטה (♭7)' },
    { en: 'Away and back home', he: 'יוצאים וחוזרים הביתה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(5, Math.max(1, level));
    const keyName = pickR(rnd, MOD_KEYS);
    const key = pc(keyName);
    const tonic = 53 + ((pcValue(key) - 53 + 120) % 12);
    const line = pickR(rnd, LINES[L - 1]);
    const midis = line.map((x) => tonic + x);
    // quarter notes, a half note to close; from level 3 some pairs of eighths and a dotted rhythm
    const durs: number[] = midis.map((_, i) => (i === midis.length - 1 ? 2 : 1));
    if (L >= 3) {
      for (let i = 1; i < durs.length - 2; i++) if (rnd() < 0.25) [durs[i], durs[i + 1]] = rnd() < 0.5 ? [0.5, 0.5] : [1.5, 0.5];
    }
    const q: SingSeqQuestion = {
      id,
      kind: 'sing-seq',
      key,
      degrees: line.map(degreeOf),
      midis,
      choices: [],
      answer: 'accurate',
      stimulus: [{ kind: 'cadence', key }, { kind: 'note', midi: midis[0], duration: 1.2 }],
      difficulty: [1450, 1580, 1680, 1760, 1860][L - 1],
      skillAs: 'sight',
      prompt: { en: 'Sing the written line (the first note is given). Watch for the new accidental — it takes you to a new home.', he: 'שירו את השורה הכתובה (הצליל הראשון נתון). שימו לב לסימן ההיתק החדש — הוא לוקח אתכם לבית חדש.' },
      show: { midis, durs, key },
      topic: { id: 'sight-modulate', level, seed },
    };
    return q;
  },
};
TOPIC_TAGS['sight-modulate'] = (l) => (l === 1 ? tg(['sight', 'sing', 0.7], ['degrees', 'chromatic', 0.3]) : tg(['sight', 'sing', 0.6], ['cadences', 'modulation', 0.4]));

// ======================================================================= chorale-rn

/** A chord: Roman numeral (major key degrees), its intervals above the root, and the bass's chord member (0 root, 1 3rd, 2 5th, 3 7th). */
type RN = { rn: string; deg: number; iv: number[]; inv: number };
const T = (rn: string, deg: number, iv: number[], inv = 0): RN => ({ rn, deg, iv, inv });
const MAJ_T: Record<string, RN> = {
  I: T('I', 0, [0, 4, 7]), ii: T('ii', 2, [0, 3, 7]), iii: T('iii', 4, [0, 3, 7]), IV: T('IV', 5, [0, 4, 7]), V: T('V', 7, [0, 4, 7]), vi: T('vi', 9, [0, 3, 7]),
  I6: T('I6', 0, [0, 4, 7], 1), IV6: T('IV6', 5, [0, 4, 7], 1), V6: T('V6', 7, [0, 4, 7], 1), ii6: T('ii6', 2, [0, 3, 7], 1), I64: T('I64', 0, [0, 4, 7], 2),
  V7: T('V7', 7, [0, 4, 7, 10]), V65: T('V65', 7, [0, 4, 7, 10], 1), V43: T('V43', 7, [0, 4, 7, 10], 2), V42: T('V42', 7, [0, 4, 7, 10], 3),
};
const MIN_T: Record<string, RN> = {
  i: T('i', 0, [0, 3, 7]), iv: T('iv', 5, [0, 3, 7]), V: T('V', 7, [0, 4, 7]), VI: T('VI', 8, [0, 4, 7]), iio6: T('iio6', 2, [0, 3, 6], 1), V7: T('V7', 7, [0, 4, 7, 10]), i6: T('i6', 0, [0, 3, 7], 1), III: T('III', 3, [0, 4, 7]),
};
/** Phrases per level (the marked chord is any but the first). */
const PHRASES: string[][][] = [
  [['I', 'IV', 'V', 'I'], ['I', 'V', 'IV', 'I'], ['I', 'IV', 'I', 'V', 'I'], ['I', 'V', 'I', 'IV', 'V', 'I']],
  [['I', 'vi', 'ii', 'V', 'I'], ['I', 'vi', 'IV', 'V', 'I'], ['I', 'ii', 'V', 'vi'], ['I', 'IV', 'ii', 'V', 'I']],
  [['I', 'V6', 'I', 'IV', 'V', 'I'], ['I', 'ii6', 'V', 'I'], ['I', 'IV6', 'V6', 'I'], ['I6', 'IV', 'V', 'I'], ['I', 'vi', 'ii6', 'V', 'I']],
  [['I', 'IV', 'I64', 'V', 'I'], ['I', 'V65', 'I', 'V43', 'I6', 'ii6', 'V7', 'I'], ['I', 'V42', 'I6', 'IV', 'V7', 'I'], ['I', 'ii6', 'I64', 'V7', 'I']],
  [['i', 'iv', 'V', 'i'], ['i', 'VI', 'iio6', 'V', 'i'], ['i', 'iv', 'V7', 'VI'], ['i', 'i6', 'iv', 'V7', 'i'], ['i', 'III', 'iv', 'V', 'i']],
];
const PRETTY = (rn: string) => rn.replace('o6', '°⁶').replace('o', '°').replace('64', '⁶₄').replace('65', '⁶₅').replace('43', '⁴₃').replace('42', '⁴₂').replace(/6$/, '⁶').replace(/7$/, '⁷');

/** Four voices, the bass taking the asked inversion, the upper three close and moving as little as possible. */
export function voiceChorale(key: number, chords: RN[]): number[][] {
  const out: number[][] = [];
  let prevUpper: number[] | null = null;
  for (const c of chords) {
    const root = key + c.deg;
    const members = c.iv.map((x) => root + x);
    const bassPc = members[c.inv];
    const bass = 40 + ((((bassPc - 40) % 12) + 12) % 12); // E2–D#3
    // upper voices: the other members (doubling the root of a triad), each placed in G3–E5
    const upperPcs = c.iv.length === 4 ? members.filter((_, i) => i !== c.inv || c.inv === 0).slice(0, 3) : [members[0], members[1], members[2]];
    let best: number[] | null = null;
    let bestCost = Infinity;
    for (const base of [55, 57, 59, 60, 62, 64, 65, 67]) {
      const v = upperPcs.map((p) => base + ((((p - base) % 12) + 12) % 12)).sort((a, b) => a - b);
      if (v[2] > 76 || v[0] <= bass) continue;
      const cost: number = prevUpper ? v.reduce((s, x, i) => s + Math.abs(x - prevUpper![i]), 0) : Math.abs(v[1] - 64);
      if (cost < bestCost) [best, bestCost] = [v, cost];
    }
    const upper: number[] = best ?? upperPcs.map((p) => 60 + ((((p - 60) % 12) + 12) % 12)).sort((a, b) => a - b);
    prevUpper = upper;
    out.push([bass, ...upper]);
  }
  return out;
}

TOPIC_GEN['chorale-rn'] = {
  title: { en: 'Chorale analysis', he: 'ניתוח כורל' },
  skill: 'cadences',
  levels: [
    { en: 'I, IV and V', he: 'I, IV ו־V' },
    { en: 'With ii and vi', he: 'עם ii ו־vi' },
    { en: 'Inversions (⁶)', he: 'היפוכים (⁶)' },
    { en: 'V⁷ and its inversions, the cadential ⁶₄', he: 'V⁷ וההיפוכים שלו, ⁶₄ הקדנצי' },
    { en: 'In a minor key', he: 'בסולם מינורי' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(5, Math.max(1, level));
    const minor = L === 5;
    const table = minor ? MIN_T : MAJ_T;
    const phrase = pickR(rnd, PHRASES[L - 1]).map((r) => table[r]);
    const key = Math.floor(rnd() * 12);
    const voiced = voiceChorale(key, phrase);
    const at = 1 + Math.floor(rnd() * (phrase.length - 1));
    const answer = phrase[at].rn;
    const pool = [...new Set(PHRASES.slice(0, L).flat(2).filter((r) => r in table))];
    const choices = shuffleR(rnd, [answer, ...shuffleR(rnd, pool.filter((r) => r !== answer)).slice(0, 3)]);
    const names = Object.fromEntries(choices.map((r) => [r, nm(PRETTY(r), PRETTY(r), r)]));
    const stimulus: Stimulus[] = [...voiced.map((v, i) => chordStim(v, i === voiced.length - 1 ? 1.5 : 0.95)), { kind: 'rest', duration: 0.6 }, chordStim(voiced[at], 1.6)];
    const keyNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
    return choiceQ({
      id, topic: 'chorale-rn', level, seed, skill: 'cadences', difficulty: 1250 + 110 * L,
      ask: { en: `Chorale phrase: which is chord ${at + 1}?`, he: `משפט כורל: מהו אקורד ${at + 1}?` },
      text: { en: `${keyNames[key]} ${minor ? 'minor' : 'major'} · chord ${at + 1} of ${phrase.length}`, he: `סולם ${keyNames[key]} ${minor ? 'מינור' : 'מז׳ור'} · אקורד ${at + 1} מתוך ${phrase.length}` },
      show: { midis: voiced[at], chord: true, clef: 'bass' },
      names, answer, choices, stimulus,
    });
  },
};
TOPIC_TAGS['chorale-rn'] = (l) => (l <= 2 ? tg(['cadences', 'progression', 1]) : l === 5 ? tg(['cadences', 'progression', 0.6], ['chords', 'inversion', 0.4]) : tg(['cadences', 'progression', 0.5], ['chords', 'inversion', 0.5]));

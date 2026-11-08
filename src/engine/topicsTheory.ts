// Written theory topics (spec U.11): key signatures, interval & chord spelling, roman numerals, the circle
// of fifths, transposition, chord-scales, note reading in three clefs. Pure, seeded; spelled correctly.

import type { ChoiceQuestion, Stimulus } from './lesson';
import type { PitchClass } from './pitch';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, nm } from './topicKit';

// ---------------------------------------------------------------- spelling

const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NAT = [0, 2, 4, 5, 7, 9, 11];
const SOL = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
/** A spelled note: letter index and accidental (−2…2). */
export interface Sp {
  l: number;
  a: number;
}
const ACC_EN: Record<number, string> = { [-2]: '♭♭', [-1]: '♭', 0: '', 1: '♯', 2: '♯♯' };
const ACC_SAY: Record<number, string> = { [-2]: ' double flat', [-1]: ' flat', 0: '', 1: ' sharp', 2: ' double sharp' };
const ACC_HE: Record<number, string> = { [-2]: ' במול כפול', [-1]: ' במול', 0: '', 1: ' דיאז', 2: ' דיאז כפול' };
export const spEn = (s: Sp) => `${LET[s.l]}${ACC_EN[s.a]}`;
const spHe = (s: Sp) => `${SOL[s.l]}${ACC_HE[s.a]}`;
const spSay = (s: Sp) => `${LET[s.l]}${ACC_SAY[s.a]}`;
const spPc = (s: Sp) => (((NAT[s.l] + s.a) % 12) + 12) % 12;
const spName = (s: Sp) => nm(spEn(s), spHe(s), spSay(s));
const sp = (name: string): Sp => ({ l: LET.indexOf(name[0] as (typeof LET)[number]), a: name.slice(1) === '♯' ? 1 : name.slice(1) === '♭' ? -1 : 0 });

/** The note `num` letters above (1 = unison, 3 = third…) and `semis` semitones above. Null if it needs a triple accidental. */
export function spellAbove(root: Sp, num: number, semis: number): Sp | null {
  const l = (root.l + num - 1) % 7;
  let a = (((spPc(root) + semis - NAT[l]) % 12) + 12) % 12;
  if (a > 6) a -= 12;
  return Math.abs(a) <= 2 ? { l, a } : null;
}
/** Same pitch, the neighbouring letter (the enharmonic every student confuses). */
function enharmonic(s: Sp, dir: 1 | -1): Sp | null {
  const l = (s.l + dir + 7) % 7;
  let a = (((spPc(s) - NAT[l]) % 12) + 12) % 12;
  if (a > 6) a -= 12;
  return Math.abs(a) <= 2 ? { l, a } : null;
}
const sameSp = (x: Sp, y: Sp) => x.l === y.l && x.a === y.a;

/** Four spelled choices: the answer, its wrong-letter enharmonic, and a semitone off on the right letter. */
function noteChoices(rnd: () => number, ans: Sp): Sp[] {
  const cands = [enharmonic(ans, 1), enharmonic(ans, -1), { l: ans.l, a: ans.a + 1 }, { l: ans.l, a: ans.a - 1 }, { l: (ans.l + 1) % 7, a: ans.a }, { l: (ans.l + 6) % 7, a: ans.a }].filter((c): c is Sp => !!c && Math.abs(c.a) <= 2 && !sameSp(c, ans));
  const out: Sp[] = [ans];
  for (const c of shuffleR(rnd, cands)) if (out.length < 4 && !out.some((o) => spEn(o) === spEn(c))) out.push(c);
  return shuffleR(rnd, out);
}
function spChoicesQ(ans: Sp, opts: Sp[]) {
  const names: ChoiceQuestion['names'] = {};
  for (const o of opts) names[spEn(o)] = spName(o);
  return { names, answer: spEn(ans), choices: opts.map(spEn) };
}

// ---------------------------------------------------------------- keys

interface Key {
  tonic: Sp;
  sig: number; // + sharps, − flats
}
const MAJOR_KEYS: Key[] = [
  ['C', 0], ['G', 1], ['D', 2], ['A', 3], ['E', 4], ['B', 5], ['F♯', 6], ['F', -1], ['B♭', -2], ['E♭', -3], ['A♭', -4], ['D♭', -5], ['G♭', -6],
].map(([n, s]) => ({ tonic: sp(n as string), sig: s as number }));
const relMinor = (k: Key): Sp => spellAbove(k.tonic, 6, 9)!;
const pcOf = (s: Sp): PitchClass => ({ letter: LET[s.l], acc: s.a as PitchClass['acc'] });
const keyName = (s: Sp, minor: boolean) => nm(`${spEn(s)} ${minor ? 'minor' : 'major'}`, `${spHe(s)} ${minor ? 'מינור' : 'מז׳ור'}`, `${spSay(s)} ${minor ? 'minor' : 'major'}`);
const sigName = (n: number) => (n === 0 ? nm('No sharps or flats', 'בלי סימנים', 'none', 'nothing', 'בלי') : nm(`${Math.abs(n)} ${n > 0 ? (n === 1 ? 'sharp' : 'sharps') : n === -1 ? 'flat' : 'flats'}`, `${Math.abs(n)} ${n > 0 ? 'דיאזים' : 'במולים'}`, `${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][Math.abs(n)]} ${n > 0 ? 'sharp' : 'flat'}`));
const tonicMidi = (s: Sp) => 60 + spPc(s);

TOPIC_GEN['key-signatures'] = {
  title: { en: 'Key signatures', he: 'סימני היתק' },
  skill: 'theory',
  levels: [
    { en: 'Up to 2 sharps or flats', he: 'עד 2 דיאזים או במולים' },
    { en: 'Up to 4', he: 'עד 4' },
    { en: 'Up to 6 — major or minor', he: 'עד 6 — מז׳ור או מינור' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const max = level === 1 ? 2 : level === 2 ? 4 : 6;
    const pool = MAJOR_KEYS.filter((k) => Math.abs(k.sig) <= max);
    const k = pickR(rnd, pool);
    const minor = level === 3 && rnd() < 0.5;
    const others = shuffleR(rnd, pool.filter((x) => x !== k)).slice(0, 3);
    const opts = shuffleR(rnd, [k, ...others]);
    const ton = (x: Key) => (minor ? relMinor(x) : x.tonic);
    const names: ChoiceQuestion['names'] = {};
    for (const o of opts) names[spEn(ton(o))] = keyName(ton(o), minor);
    const step = [0, 2, 4, 5, 7, 9, 11][Math.floor(rnd() * 7)];
    const m = tonicMidi(k.tonic) + step;
    return choiceQ({
      id, topic: 'key-signatures', level, seed, skill: 'theory', difficulty: 1000 + 150 * level,
      ask: minor ? { en: 'Which minor key has this signature?', he: 'לאיזה סולם מינורי שייך סימן ההיתק?' } : { en: 'Which major key has this signature?', he: 'לאיזה סולם מז׳ורי שייך סימן ההיתק?' },
      names, answer: spEn(ton(k)), choices: opts.map((o) => spEn(ton(o))), stimulus: [],
      show: { midis: [m > 74 ? m - 12 : m], key: pcOf(k.tonic) },
    });
  },
};

// ---------------------------------------------------------------- intervals

const IV: Record<string, { num: number; semis: number; name: ReturnType<typeof nm> }> = {
  m2: { num: 2, semis: 1, name: nm('minor 2nd', 'סקונדה קטנה') },
  M2: { num: 2, semis: 2, name: nm('major 2nd', 'סקונדה גדולה') },
  A2: { num: 2, semis: 3, name: nm('augmented 2nd', 'סקונדה מוגדלת') },
  m3: { num: 3, semis: 3, name: nm('minor 3rd', 'טרצה קטנה') },
  M3: { num: 3, semis: 4, name: nm('major 3rd', 'טרצה גדולה') },
  d4: { num: 4, semis: 4, name: nm('diminished 4th', 'קוורטה מוקטנת') },
  P4: { num: 4, semis: 5, name: nm('perfect 4th', 'קוורטה זכה') },
  A4: { num: 4, semis: 6, name: nm('augmented 4th', 'קוורטה מוגדלת') },
  d5: { num: 5, semis: 6, name: nm('diminished 5th', 'קווינטה מוקטנת') },
  P5: { num: 5, semis: 7, name: nm('perfect 5th', 'קווינטה זכה') },
  A5: { num: 5, semis: 8, name: nm('augmented 5th', 'קווינטה מוגדלת') },
  m6: { num: 6, semis: 8, name: nm('minor 6th', 'סקסטה קטנה') },
  M6: { num: 6, semis: 9, name: nm('major 6th', 'סקסטה גדולה') },
  d7: { num: 7, semis: 9, name: nm('diminished 7th', 'ספטימה מוקטנת') },
  m7: { num: 7, semis: 10, name: nm('minor 7th', 'ספטימה קטנה') },
  M7: { num: 7, semis: 11, name: nm('major 7th', 'ספטימה גדולה') },
};
const IV_LEVELS = [['m3', 'M3', 'P4', 'P5'], ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'm7', 'M7'], ['A2', 'd4', 'A4', 'd5', 'A5', 'd7', 'm6', 'M7']];
const ROOTS = [['C', 'D', 'E', 'F', 'G', 'A'], ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'B♭', 'E♭', 'F♯', 'A♭'], ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'B♭', 'E♭', 'F♯', 'A♭', 'D♭', 'C♯', 'G♯']];

TOPIC_GEN['interval-spelling'] = {
  title: { en: 'Spelling intervals', he: 'כתיבת מרווחים' },
  skill: 'theory',
  levels: [
    { en: 'Thirds, fourths, fifths', he: 'טרצות, קוורטות, קווינטות' },
    { en: 'All intervals, any root', he: 'כל המרווחים, כל שורש' },
    { en: 'Augmented and diminished', he: 'מוגדלים ומוקטנים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    let root: Sp, ivk: string, ans: Sp | null;
    do {
      root = sp(pickR(rnd, ROOTS[level - 1]));
      ivk = pickR(rnd, IV_LEVELS[level - 1]);
      ans = spellAbove(root, IV[ivk].num, IV[ivk].semis);
    } while (!ans || Math.abs(ans.a) > (level === 3 ? 2 : 1));
    const q = spChoicesQ(ans, noteChoices(rnd, ans));
    const m = tonicMidi(root);
    return choiceQ({
      id, topic: 'interval-spelling', level, seed, skill: 'theory', difficulty: 1100 + 180 * level,
      ask: { en: `A ${IV[ivk].name.en} above ${spEn(root)}?`, he: `${IV[ivk].name.he} מעל ${spHe(root)}?` },
      text: { en: `${IV[ivk].name.en} ↑ ${spEn(root)} = ?`, he: `${IV[ivk].name.he} ↑ ${spHe(root)} = ?` },
      ...q, stimulus: [notesStim([m, m + IV[ivk].semis], 0.6)],
    });
  },
};

// ---------------------------------------------------------------- chords

const CHORDS: Record<string, { tones: [number, number][]; en: string; he: string; say: string }> = {
  maj: { tones: [[1, 0], [3, 4], [5, 7]], en: '', he: 'מז׳ור', say: 'major' },
  min: { tones: [[1, 0], [3, 3], [5, 7]], en: 'm', he: 'מינור', say: 'minor' },
  dim: { tones: [[1, 0], [3, 3], [5, 6]], en: '°', he: 'מוקטן', say: 'diminished' },
  aug: { tones: [[1, 0], [3, 4], [5, 8]], en: '+', he: 'מוגדל', say: 'augmented' },
  maj7: { tones: [[1, 0], [3, 4], [5, 7], [7, 11]], en: 'maj7', he: 'מז׳ור 7', say: 'major seven' },
  dom7: { tones: [[1, 0], [3, 4], [5, 7], [7, 10]], en: '7', he: '7', say: 'seven' },
  m7: { tones: [[1, 0], [3, 3], [5, 7], [7, 10]], en: 'm7', he: 'מינור 7', say: 'minor seven' },
  hd: { tones: [[1, 0], [3, 3], [5, 6], [7, 10]], en: 'ø7', he: 'חצי מוקטן', say: 'half diminished' },
  dim7: { tones: [[1, 0], [3, 3], [5, 6], [7, 9]], en: '°7', he: 'מוקטן 7', say: 'diminished seven' },
  dom9: { tones: [[1, 0], [3, 4], [5, 7], [7, 10], [2, 14]], en: '9', he: '9', say: 'nine' },
  m9: { tones: [[1, 0], [3, 3], [5, 7], [7, 10], [2, 14]], en: 'm9', he: 'מינור 9', say: 'minor nine' },
  b9: { tones: [[1, 0], [3, 4], [5, 7], [7, 10], [2, 13]], en: '7♭9', he: '7 במול 9', say: 'seven flat nine' },
  s11: { tones: [[1, 0], [3, 4], [7, 10], [2, 14], [4, 18]], en: '9♯11', he: '9 דיאז 11', say: 'nine sharp eleven' },
};
const CHORD_LEVELS = [['maj', 'min', 'dim', 'aug'], ['maj7', 'dom7', 'm7', 'hd', 'dim7'], ['dom9', 'm9', 'b9', 's11']];

function spellChord(root: Sp, kind: string): Sp[] | null {
  const out: Sp[] = [];
  for (const [num, semis] of CHORDS[kind].tones) {
    const s = spellAbove(root, num, semis);
    if (!s) return null;
    out.push(s);
  }
  return out;
}
const chordLine = (ns: Sp[]) => ns.map(spEn).join(' – ');
const chordLineHe = (ns: Sp[]) => ns.map(spHe).join(' – ');

TOPIC_GEN['chord-spelling'] = {
  title: { en: 'Spelling chords', he: 'כתיבת אקורדים' },
  skill: 'theory',
  levels: [
    { en: 'Triads', he: 'משולשים' },
    { en: 'Seventh chords', he: 'אקורדי ספטימה' },
    { en: 'Ninths and alterations', he: '9, 11, 13 ואלטרציות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    let root: Sp, kind: string, ns: Sp[] | null;
    do {
      root = sp(pickR(rnd, ROOTS[Math.min(2, level)]));
      kind = pickR(rnd, CHORD_LEVELS[level - 1]);
      ns = spellChord(root, kind);
    } while (!ns || ns.some((n) => Math.abs(n.a) > 1 + (level === 3 ? 1 : 0)));
    // Decoys: one tone respelled enharmonically, one tone a semitone off, the third/seventh of another quality.
    const decoys: Sp[][] = [];
    const tryAdd = (d: Sp[] | null) => d && chordLine(d) !== chordLine(ns!) && !decoys.some((x) => chordLine(x) === chordLine(d)) && decoys.length < 3 && decoys.push(d);
    for (let k = 1; k < ns.length && decoys.length < 3; k++) {
      const i = 1 + ((k + Math.floor(rnd() * ns.length)) % (ns.length - 1));
      const e = enharmonic(ns[i], rnd() < 0.5 ? 1 : -1);
      if (e) tryAdd(ns.map((x, j) => (j === i ? e : x)));
      const off = { l: ns[i].l, a: ns[i].a + (rnd() < 0.5 ? 1 : -1) };
      if (Math.abs(off.a) <= 2) tryAdd(ns.map((x, j) => (j === i ? off : x)));
    }
    const all = shuffleR(rnd, [ns, ...decoys]);
    const names: ChoiceQuestion['names'] = {};
    for (const c of all) names[chordLine(c)] = nm(chordLine(c), chordLineHe(c));
    const sym = `${spEn(root)}${CHORDS[kind].en}`;
    const base = 48 + spPc(root);
    return choiceQ({
      id, topic: 'chord-spelling', level, seed, skill: 'theory', difficulty: 1150 + 170 * level,
      ask: { en: `Spell ${sym}`, he: `כתבו את ${spHe(root)} ${CHORDS[kind].he}` },
      text: { en: sym, he: `${spHe(root)} ${CHORDS[kind].he}` },
      names, answer: chordLine(ns), choices: all.map(chordLine),
      stimulus: [chordStim(CHORDS[kind].tones.map(([, s]) => base + s), 1.6)],
    });
  },
};

// ---------------------------------------------------------------- roman numerals

const MAJ_STEPS = [0, 2, 4, 5, 7, 9, 11];
const HMIN_STEPS = [0, 2, 3, 5, 7, 8, 11];
const RN_MAJ = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const RN_MIN = ['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°'];
const RN_SAY = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const RN_SEC = ['V/ii', 'V/iii', 'V/IV', 'V/V', 'V/vi'];
const RN_SEC_DEG = [1, 2, 3, 4, 5];

TOPIC_GEN['roman-numerals'] = {
  title: { en: 'Roman numerals', he: 'ספרות רומיות' },
  skill: 'theory',
  levels: [
    { en: 'Major keys', he: 'סולמות מז׳וריים' },
    { en: 'Minor keys (harmonic)', he: 'סולמות מינוריים (הרמוני)' },
    { en: 'Secondary dominants', he: 'דומיננטות משניות' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const k = pickR(rnd, MAJOR_KEYS.filter((x) => Math.abs(x.sig) <= 3));
    const minor = level === 2;
    const ton = minor ? relMinor(k) : k.tonic;
    const t = 55 + ((spPc(ton) - 55 + 120) % 12);
    let midis: number[];
    let answer: string;
    let pool: string[];
    if (level <= 2) {
      const steps = minor ? HMIN_STEPS : MAJ_STEPS;
      const deg = Math.floor(rnd() * 7);
      midis = [0, 2, 4].map((j) => t + steps[(deg + j) % 7] + (deg + j >= 7 ? 12 : 0));
      const rn = minor ? RN_MIN : RN_MAJ;
      answer = rn[deg];
      pool = shuffleR(rnd, [answer, ...shuffleR(rnd, rn.filter((x) => x !== answer)).slice(0, 3)]);
    } else {
      const j = Math.floor(rnd() * RN_SEC.length);
      const targetRoot = t + MAJ_STEPS[RN_SEC_DEG[j]];
      const r = targetRoot + 7 - 12;
      midis = [r, r + 4, r + 7, r + 10].map((m) => (m < 52 ? m + 12 : m)).sort((a, b) => a - b);
      answer = RN_SEC[j];
      pool = shuffleR(rnd, [answer, ...shuffleR(rnd, [...RN_SEC.filter((x) => x !== answer), 'V7']).slice(0, 3)]);
    }
    const names: ChoiceQuestion['names'] = {};
    for (const p of pool) {
      const i = [...RN_MAJ, ...RN_MIN].indexOf(p) % 7;
      names[p] = p.includes('/') ? nm(p, p, `five of ${RN_SAY[RN_MAJ.indexOf(p.split('/')[1])]}`, `secondary dominant of ${RN_SAY[RN_MAJ.indexOf(p.split('/')[1])]}`) : p === 'V7' ? nm('V7', 'V7', 'five seven', 'dominant seven') : nm(p, p, RN_SAY[i]);
    }
    return choiceQ({
      id, topic: 'roman-numerals', level, seed, skill: 'theory', difficulty: 1200 + 170 * level,
      ask: { en: `In ${keyName(ton, minor).en}: which chord is this?`, he: `ב${keyName(ton, minor).he}: איזה אקורד זה?` },
      names, answer, choices: pool,
      stimulus: minor ? [chordStim(midis, 1.6)] : [{ kind: 'cadence', key: pcOf(k.tonic) } as Stimulus, chordStim(midis, 1.6)],
      show: { midis, chord: true, key: pcOf(k.tonic) },
    });
  },
};

// ---------------------------------------------------------------- circle of fifths

TOPIC_GEN['circle-fifths'] = {
  title: { en: 'The circle of fifths', he: 'מעגל הקווינטות' },
  skill: 'theory',
  levels: [
    { en: 'How many sharps or flats?', he: 'כמה דיאזים או במולים?' },
    { en: 'Relative minor', he: 'המינור המקביל' },
    { en: 'Neighbors on the circle', he: 'שכנים במעגל' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const k = pickR(rnd, MAJOR_KEYS);
    if (level === 1) {
      const opts = shuffleR(rnd, [k.sig, ...shuffleR(rnd, [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].filter((x) => x !== k.sig && Math.abs(x - k.sig) <= 3)).slice(0, 3)]);
      const names: ChoiceQuestion['names'] = {};
      for (const o of opts) names[`s${o}`] = sigName(o);
      return choiceQ({ id, topic: 'circle-fifths', level, seed, skill: 'theory', difficulty: 1100, ask: { en: `How many sharps or flats in ${spEn(k.tonic)} major?`, he: `כמה סימנים ב${spHe(k.tonic)} מז׳ור?` }, text: { en: `${spEn(k.tonic)} major`, he: `${spHe(k.tonic)} מז׳ור` }, names, answer: `s${k.sig}`, choices: opts.map((o) => `s${o}`), stimulus: [{ kind: 'cadence', key: pcOf(k.tonic) }] });
    }
    if (level === 2) {
      const ans = relMinor(k);
      const opts = shuffleR(rnd, [ans, spellAbove(k.tonic, 3, 3)!, spellAbove(k.tonic, 6, 8)!, spellAbove(k.tonic, 5, 7)!].filter((x, i, a) => a.findIndex((y) => spEn(y) === spEn(x)) === i));
      const names: ChoiceQuestion['names'] = {};
      for (const o of opts) names[spEn(o)] = keyName(o, true);
      return choiceQ({ id, topic: 'circle-fifths', level, seed, skill: 'theory', difficulty: 1250, ask: { en: `The relative minor of ${spEn(k.tonic)} major?`, he: `המינור המקביל של ${spHe(k.tonic)} מז׳ור?` }, text: { en: `${spEn(k.tonic)} major → ? minor`, he: `${spHe(k.tonic)} מז׳ור ← ? מינור` }, names, answer: spEn(ans), choices: opts.map(spEn), stimulus: [{ kind: 'cadence', key: pcOf(k.tonic) }] });
    }
    const up = rnd() < 0.5;
    const i = MAJOR_KEYS.indexOf(k);
    const bySig = (s: number) => MAJOR_KEYS.find((x) => x.sig === s);
    const ansK = bySig(k.sig + (up ? 1 : -1)) ?? bySig(k.sig + (up ? -1 : 1))!;
    const dir = ansK.sig > k.sig;
    const opts = shuffleR(rnd, [ansK, ...shuffleR(rnd, MAJOR_KEYS.filter((x) => x !== ansK && x !== k)).slice(0, 3)]);
    void i;
    const names: ChoiceQuestion['names'] = {};
    for (const o of opts) names[spEn(o.tonic)] = keyName(o.tonic, false);
    return choiceQ({
      id, topic: 'circle-fifths', level, seed, skill: 'theory', difficulty: 1300,
      ask: dir ? { en: `One step clockwise (a fifth up) from ${spEn(k.tonic)} major?`, he: `צעד אחד עם כיוון השעון (קווינטה למעלה) מ${spHe(k.tonic)} מז׳ור?` } : { en: `One step counterclockwise (a fifth down) from ${spEn(k.tonic)} major?`, he: `צעד אחד נגד כיוון השעון (קווינטה למטה) מ${spHe(k.tonic)} מז׳ור?` },
      text: { en: `${spEn(k.tonic)} ${dir ? '→ +1♯' : '→ +1♭'}`, he: `${spHe(k.tonic)} ${dir ? '← +1♯' : '← +1♭'}` },
      names, answer: spEn(ansK.tonic), choices: opts.map((o) => spEn(o.tonic)), stimulus: [{ kind: 'cadence', key: pcOf(k.tonic) }],
    });
  },
};

// ---------------------------------------------------------------- transposition

const INSTR = [
  { en: 'B♭ trumpet / clarinet / tenor sax', he: 'חצוצרה / קלרינט / סקסופון טנור ב־B♭', num: 2, semis: 2 },
  { en: 'E♭ alto sax', he: 'סקסופון אלט ב־E♭', num: 6, semis: 9 },
  { en: 'F horn', he: 'קרן ב־F', num: 5, semis: 7 },
];

TOPIC_GEN['transposition'] = {
  title: { en: 'Transposition on paper', he: 'טרנספוזיציה בכתב' },
  skill: 'transpose',
  levels: [
    { en: 'Move a note by an interval', he: 'להזיז צליל במרווח' },
    { en: 'Transposing instruments: concert → written', he: 'כלים מטרנספזים: צליל אמיתי ← כתוב' },
    { en: 'Written → concert', he: 'כתוב ← צליל אמיתי' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    let from: Sp, ans: Sp | null, ask: { en: string; he: string }, text: { en: string; he: string };
    do {
      from = sp(pickR(rnd, ROOTS[1]));
      if (level === 1) {
        const ivk = pickR(rnd, ['M2', 'm3', 'M3', 'P4', 'P5']);
        ans = spellAbove(from, IV[ivk].num, IV[ivk].semis);
        ask = { en: `${spEn(from)} transposed up a ${IV[ivk].name.en}?`, he: `${spHe(from)} בטרנספוזיציה ${IV[ivk].name.he} למעלה?` };
        text = { en: `${spEn(from)} + ${IV[ivk].name.en}`, he: `${spHe(from)} + ${IV[ivk].name.he}` };
      } else {
        const ins = pickR(rnd, INSTR);
        if (level === 2) {
          ans = spellAbove(from, ins.num, ins.semis);
          ask = { en: `Concert ${spEn(from)} — what does the ${ins.en} read?`, he: `${spHe(from)} אמיתי — מה כתוב ל${ins.he}?` };
          text = { en: `${ins.en}: concert ${spEn(from)} → written ?`, he: `${ins.he}: אמיתי ${spHe(from)} ← כתוב ?` };
        } else {
          // Down: the inverse interval spelled from the other side.
          ans = spellAbove(from, 9 - ins.num, 12 - ins.semis);
          ask = { en: `The ${ins.en} reads ${spEn(from)} — which note sounds?`, he: `ב${ins.he} כתוב ${spHe(from)} — איזה צליל נשמע?` };
          text = { en: `${ins.en}: written ${spEn(from)} → concert ?`, he: `${ins.he}: כתוב ${spHe(from)} ← אמיתי ?` };
        }
      }
    } while (!ans || Math.abs(ans.a) > 1);
    const q = spChoicesQ(ans, noteChoices(rnd, ans));
    return choiceQ({ id, topic: 'transposition', level, seed, skill: 'transpose', difficulty: 1150 + 170 * level, ask: ask!, text: text!, ...q, stimulus: [] });
  },
};

// ---------------------------------------------------------------- chord-scale

const SCALES: Record<string, ReturnType<typeof nm>> = {
  ionian: nm('Ionian (major)', 'יוני (מז׳ור)', 'ionian', 'major scale'),
  dorian: nm('Dorian', 'דורי', 'dorian'),
  phrygian: nm('Phrygian', 'פריגי', 'phrygian'),
  lydian: nm('Lydian', 'לידי', 'lydian'),
  mixolydian: nm('Mixolydian', 'מיקסולידי', 'mixolydian'),
  aeolian: nm('Aeolian (natural minor)', 'איאולי (מינור טבעי)', 'aeolian', 'natural minor'),
  locrian: nm('Locrian', 'לוקרי', 'locrian'),
  altered: nm('Altered (super-Locrian)', 'אלטרד (סופר־לוקרי)', 'altered', 'super locrian', 'alt'),
  hw: nm('Half-whole diminished', 'דימיניש חצי־שלם', 'half whole', 'diminished scale', 'octatonic'),
  lydom: nm('Lydian dominant', 'לידי דומיננטי', 'lydian dominant', 'lydian flat seven', 'overtone'),
  wholetone: nm('Whole tone', 'טון שלם', 'whole tone'),
  melmin: nm('Melodic minor', 'מינור מלודי', 'melodic minor', 'jazz minor'),
  phrygdom: nm('Phrygian dominant', 'פריגי דומיננטי', 'phrygian dominant', 'spanish', 'freygish', 'פריגיש'),
};
const DIATONIC = [
  ['maj7', 'ionian'], ['m7', 'dorian'], ['m7', 'phrygian'], ['maj7', 'lydian'], ['dom7', 'mixolydian'], ['m7', 'aeolian'], ['hd', 'locrian'],
] as const;
const JAZZ: { sym: string; quality: number[]; scale: string; hint: { en: string; he: string } }[] = [
  { sym: '7alt', quality: [0, 4, 10, 15, 20], scale: 'altered', hint: { en: 'all tensions altered', he: 'כל הטנשנים אלטרד' } },
  { sym: '13♭9', quality: [0, 4, 10, 13, 21], scale: 'hw', hint: { en: '♭9 with natural 13', he: '♭9 עם 13 טבעי' } },
  { sym: '7♯11', quality: [0, 4, 10, 14, 18], scale: 'lydom', hint: { en: 'not resolving down a fifth', he: 'לא נפתר קווינטה למטה' } },
  { sym: '7♯5', quality: [0, 4, 8, 10, 14], scale: 'wholetone', hint: { en: 'natural 9, ♯5', he: '9 טבעי, ♯5' } },
  { sym: 'm(maj7)', quality: [0, 3, 7, 11, 14], scale: 'melmin', hint: { en: 'tonic minor', he: 'טוניקה מינורית' } },
  { sym: 'maj7♯11', quality: [0, 4, 7, 11, 18], scale: 'lydian', hint: { en: '♯11', he: '♯11' } },
  { sym: '7♭9', quality: [0, 4, 7, 10, 13], scale: 'phrygdom', hint: { en: 'going to a minor chord, ♭13', he: 'הולך לאקורד מינורי, ♭13' } },
];

TOPIC_GEN['chord-scale'] = {
  title: { en: 'Chord–scale', he: 'אקורד–סולם' },
  skill: 'theory',
  levels: [
    { en: 'The modes of the major scale', he: 'המודוסים של המז׳ור' },
    { en: 'Jazz chord-scales', he: 'אקורד־סולם בג׳אז' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const k = pickR(rnd, MAJOR_KEYS.filter((x) => Math.abs(x.sig) <= 4));
    if (level === 1) {
      const deg = Math.floor(rnd() * 7);
      const root = spellAbove(k.tonic, deg + 1, MAJ_STEPS[deg])!;
      const [q, scale] = DIATONIC[deg];
      const sym = `${spEn(root)}${CHORDS[q].en}`;
      const pool = shuffleR(rnd, [scale, ...shuffleR(rnd, DIATONIC.map((d) => d[1] as string).filter((s) => s !== scale)).slice(0, 3)]);
      const names: ChoiceQuestion['names'] = {};
      for (const p of pool) names[p] = SCALES[p];
      const base = 48 + spPc(root);
      return choiceQ({ id, topic: 'chord-scale', level, seed, skill: 'theory', difficulty: 1300, ask: { en: `${sym} in ${spEn(k.tonic)} major — which scale?`, he: `${sym} ב${spHe(k.tonic)} מז׳ור — איזה סולם?` }, text: { en: `${sym} (${RN_MAJ[deg]} in ${spEn(k.tonic)})`, he: `${sym} (${RN_MAJ[deg]} ב${spHe(k.tonic)})` }, names, answer: scale, choices: pool, stimulus: [chordStim(CHORDS[q].tones.map(([, s]) => base + s), 1.6)] });
    }
    const j = pickR(rnd, JAZZ);
    const root = sp(pickR(rnd, ['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭']));
    const sym = `${spEn(root)}${j.sym}`;
    const pool = shuffleR(rnd, [j.scale, ...shuffleR(rnd, JAZZ.map((x) => x.scale).filter((s) => s !== j.scale)).slice(0, 3)]);
    const names: ChoiceQuestion['names'] = {};
    for (const p of pool) names[p] = SCALES[p];
    const base = 48 + spPc(root);
    return choiceQ({ id, topic: 'chord-scale', level, seed, skill: 'theory', difficulty: 1550, ask: { en: `${sym} (${j.hint.en}) — which scale?`, he: `${sym} (${j.hint.he}) — איזה סולם?` }, text: { en: sym, he: sym }, names, answer: j.scale, choices: pool, stimulus: [chordStim(j.quality.map((s) => base + s), 1.6)] });
  },
};

// ---------------------------------------------------------------- note reading

const CLEF_RANGE: Record<number, { clef: 'treble' | 'bass' | 'alto' | 'tenor'; lo: number; hi: number }[]> = {
  1: [{ clef: 'treble', lo: 64, hi: 77 }],
  2: [{ clef: 'bass', lo: 43, hi: 57 }],
  3: [{ clef: 'alto', lo: 53, hi: 67 }],
  4: [{ clef: 'treble', lo: 55, hi: 86 }, { clef: 'bass', lo: 36, hi: 64 }, { clef: 'alto', lo: 48, hi: 72 }],
  5: [{ clef: 'tenor', lo: 50, hi: 64 }],
};

TOPIC_GEN['note-reading'] = {
  title: { en: 'Reading notes', he: 'קריאת תווים' },
  skill: 'notes',
  levels: [
    { en: 'Treble clef', he: 'מפתח סול' },
    { en: 'Bass clef', he: 'מפתח פה' },
    { en: 'Alto clef', he: 'מפתח דו (אלט)' },
    { en: 'Ledger lines, any clef', he: 'קווי עזר, כל מפתח' },
    { en: 'Tenor clef', he: 'מפתח דו (טנור)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const r = pickR(rnd, CLEF_RANGE[level]);
    const naturals: number[] = [];
    for (let m = r.lo; m <= r.hi; m++) if (MAJ_STEPS.includes(m % 12)) naturals.push(m);
    const m = pickR(rnd, naturals);
    const l = MAJ_STEPS.indexOf(m % 12);
    const ans: Sp = { l, a: 0 };
    const opts = shuffleR(rnd, [ans, { l: (l + 1) % 7, a: 0 }, { l: (l + 6) % 7, a: 0 }, { l: (l + 2) % 7, a: 0 }]);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const o of opts) {
      names[spEn(o)] = spName(o);
      const near = m + ((((NAT[o.l] - (m % 12)) % 12) + 18) % 12) - 6;
      choiceStim[spEn(o)] = [{ kind: 'note', midi: near, duration: 0.9 }];
    }
    return choiceQ({
      id, topic: 'note-reading', level, seed, skill: 'notes', difficulty: 1000 + 120 * level,
      ask: { en: 'Which note is this?', he: 'איזה תו זה?' },
      names, answer: spEn(ans), choices: opts.map(spEn), stimulus: [], choiceStim,
      show: { midis: [m], clef: r.clef, key: null },
    });
  },
};

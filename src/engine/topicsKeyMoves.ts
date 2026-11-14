// Modulation by ear: by what means, and where to (docs/AUDIT-GAPS-2.md High #5, Medium #19). The `modulation` topic
// asks only whether / where to among close keys; these two topics hear HOW and the distant keys:
//   modulation-means  1 pivot chord or direct? · 2 + a ii–V of the new key · 3 + the common diminished
//                     · 4 + a tritone sub (all five) · 5 the means and the new key together
//   key-centres       1 where to: distant keys (a half step, minor / major 3rds, a tritone, a whole step down)
//                     · 2 name the new key (the first is named) · 3 a tune's key centres in order (advanced)
// Every phrase opens in key A with a ii–V–I, then the move (src/engine/keyMoves.ts, the same chords the k-keys /
// g-keys / b-keys drills play). Pure, seeded generators like every topic.

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { nearVoicing } from './topicsHarris2';
import { chordPcs, DEVICE_NAME, dimMove, directMove, iiVMove, KEY_NAMES, KEY_NAMES_HE, moveName, pivotMove, tritoneMove, type Device, type KChord, type KeyMove } from './keyMoves';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Key A's ii–V before a move (the move itself starts on A's I). */
const homeIiV = (A: number): KChord[] => [
  { root: mod12(A + 2), q: 'm7', name: '', beats: 2, role: 'A' },
  { root: mod12(A + 7), q: '7', name: '', beats: 2, role: 'A' },
];

/** Chords as sound: the bass on the root (any note of a diminished), close voicings led by step above it. */
export function playKChords(cs: KChord[], beatSec = 0.3): Stimulus[] {
  const out: Stimulus[] = [];
  let prev: number[] | null = null;
  let lastBass = 45;
  cs.forEach((c, i) => {
    const up = nearVoicing(chordPcs(c), prev, 55, 79, 72);
    prev = up;
    let b = 36 + mod12(c.root - 36);
    if (b + 12 <= 52 && Math.abs(b + 12 - lastBass) < Math.abs(b - lastBass)) b += 12;
    while (b > up[0] - 3) b -= 12;
    lastBass = b;
    out.push(chordStim([b, ...up], c.beats * beatSec + (i === cs.length - 1 ? 0.7 : 0)));
  });
  return out;
}
const phraseOf = (m: KeyMove): Stimulus[] => playKChords([...homeIiV(m.from), ...m.chords]);

/** A move by a means, from key A (the target chosen from the means' usual distances). */
function moveBy(dev: Device, A: number, rnd: () => number, off?: number): KeyMove {
  switch (dev) {
    case 'pivot':
      return pivotMove(A, Math.floor(rnd() * 4));
    case 'direct':
      return directMove(A, A + (off ?? pickR(rnd, [2, 3, 5, 7, 8, 10])));
    case 'iiv':
      return iiVMove(A, A + (off ?? pickR(rnd, [1, 3, 4, 8, 10])));
    case 'tritone':
      return tritoneMove(A, A + (off ?? pickR(rnd, [3, 5, 8, 10])));
    default:
      return dimMove(A, A + (off ?? pickR(rnd, [3, 6, 9])));
  }
}

const DEV_SAY: Record<string, string[]> = { pivot: ['pivot', 'pivot chord', 'ציר'], direct: ['direct', 'no preparation', 'ישירות'], iiv: ['two five', 'ii V'], dim: ['diminished', 'dim', 'דימיניש'], tritone: ['tritone', 'tritone sub', 'טריטון'] };
const devName = (d: Device) => nm(DEVICE_NAME[d].en, DEVICE_NAME[d].he, ...(DEV_SAY[d] ?? []));
const POOLS: Device[][] = [['pivot', 'direct'], ['pivot', 'direct', 'iiv'], ['pivot', 'direct', 'iiv', 'dim'], ['pivot', 'direct', 'iiv', 'dim', 'tritone']];
const KEYS_A = [0, 2, 3, 5, 7, 8, 10];

TOPIC_GEN['modulation-means'] = {
  title: { en: 'How did it change key?', he: 'איך עבר הסולם?' },
  skill: 'cadences',
  levels: [
    { en: 'A pivot chord, or direct?', he: 'אקורד ציר, או ישירות?' },
    { en: '… or a ii–V of the new key?', he: '… או ii–V של הסולם החדש?' },
    { en: '… or the common diminished?', he: '… או הדימיניש המשותף?' },
    { en: 'All five, with the tritone sub', he: 'כל החמישה, עם תחליף הטריטון' },
    { en: 'How, and where to', he: 'איך, ולאן' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const A = pickR(rnd, KEYS_A);
    if (level <= 4) {
      const pool = POOLS[level - 1];
      const answer = pickR(rnd, pool);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const d of pool) {
        names[d] = devName(d);
        choiceStim[d] = phraseOf(moveBy(d, A, rng(seed * 7 + d.length)));
      }
      return choiceQ({
        id, topic: 'modulation-means', level, seed, skill: 'cadences', difficulty: [1300, 1380, 1450, 1520][level - 1],
        ask: { en: 'A ii–V–I, then a new key. How did it get there?', he: 'ii–V–I, ואז סולם חדש. איך הגיע לשם?' },
        names, answer, choices: pool, stimulus: choiceStim[answer], choiceStim,
      });
    }
    // Level 5: the means and the distance together (jazz moves: up a half step, minor / major 3rds, down a whole step).
    const devs: Device[] = ['iiv', 'dim', 'tritone'];
    const offs = [1, 3, 4, 9, 10];
    const dev = pickR(rnd, devs);
    const off = pickR(rnd, offs);
    const otherDev = pickR(rnd, devs.filter((d) => d !== dev));
    const otherOff = pickR(rnd, offs.filter((o) => o !== off));
    const combos: [Device, number][] = [[dev, off], [dev, otherOff], [otherDev, off], [otherDev, otherOff]];
    const key = ([d, o]: [Device, number]) => `${d}:${o}`;
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const c of combos) {
      names[key(c)] = nm(`${DEVICE_NAME[c[0]].en}, ${moveName(c[1]).en}`, `${DEVICE_NAME[c[0]].he}, ${moveName(c[1]).he}`);
      choiceStim[key(c)] = phraseOf(moveBy(c[0], A, rnd, c[1]));
    }
    const choices = shuffleR(rnd, combos.map(key));
    return choiceQ({
      id, topic: 'modulation-means', level, seed, skill: 'cadences', difficulty: 1600,
      ask: { en: 'How did it change key, and where to?', he: 'איך עבר הסולם, ולאן?' },
      names, answer: key([dev, off]), choices, stimulus: choiceStim[key([dev, off])], choiceStim,
    });
  },
};
TOPIC_TAGS['modulation-means'] = tg(['cadences', 'modulation', 1]);

// ---------------------------------------------------------------- key-centres

const FAR = [1, 3, 4, 6, 8, 9, 10];
const keyNm = (pc: number) => nm(KEY_NAMES[mod12(pc)], KEY_NAMES_HE[mod12(pc)], KEY_NAMES[mod12(pc)].replace('♭', ' flat'));
/** One key centre of a tune: its ii–V–I (the I held a bar). */
const centre = (k: number): KChord[] => [
  { root: mod12(k + 2), q: 'm7', name: '', beats: 2, role: 'B' },
  { root: mod12(k + 7), q: '7', name: '', beats: 2, role: 'B' },
  { root: mod12(k), q: 'maj7', name: '', beats: 4, role: 'B' },
];
const MOVES = [2, 10, 3, 9, 4, 8, 5, 7];

TOPIC_GEN['key-centres'] = {
  title: { en: 'Key centres', he: 'מרכזים טונליים' },
  skill: 'cadences',
  levels: [
    { en: 'Where to: distant keys', he: 'לאן: סולמות רחוקים' },
    { en: 'Name the new key', he: 'מה הסולם החדש?' },
    { en: 'A tune’s key centres, in order', he: 'המרכזים הטונליים של שיר, לפי הסדר' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const A = pickR(rnd, KEYS_A);
    if (level <= 2) {
      const off = pickR(rnd, FAR);
      const others = shuffleR(rnd, FAR.filter((o) => o !== off)).slice(0, 3);
      const offered = shuffleR(rnd, [off, ...others]);
      const names: Names = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      const k = (o: number) => (level === 1 ? `o${o}` : `k${mod12(A + o)}`);
      for (const o of offered) {
        const mn = moveName(o);
        names[k(o)] = level === 1 ? nm(mn.en[0].toUpperCase() + mn.en.slice(1), mn.he) : keyNm(A + o);
        choiceStim[k(o)] = phraseOf(iiVMove(A, A + o));
      }
      return choiceQ({
        id, topic: 'key-centres', level, seed, skill: 'cadences', difficulty: level === 1 ? 1420 : 1500,
        ask: level === 1 ? { en: 'Home first, then a ii–V to a new key. How far did it go?', he: 'קודם הבית, ואז ii–V לסולם חדש. כמה רחוק הלך?' } : { en: `Home is ${KEY_NAMES[A]}. Which key does it end in?`, he: `הבית הוא ${KEY_NAMES_HE[A]}. באיזה סולם זה נגמר?` },
        ...(level === 2 ? { text: { en: `Home: ${KEY_NAMES[A]}`, he: `הבית: ${KEY_NAMES_HE[A]}` } } : {}),
        names, answer: k(off), choices: offered.map(k), stimulus: choiceStim[k(off)], choiceStim,
      });
    }
    // Level 3: three key centres (like Tune Up's whole steps down, or a bridge a 3rd away); the first is named.
    const m1 = pickR(rnd, MOVES);
    const m2 = pickR(rnd, MOVES.filter((x) => mod12(m1 + x) !== 0));
    const b = mod12(A + m1);
    const c = mod12(b + m2);
    const seqOf = (x: number, y: number) => `s${x}-${y}`;
    const set = new Map<string, [number, number]>();
    set.set(seqOf(b, c), [b, c]);
    const alts: [number, number][] = shuffleR(rnd, [
      [b, mod12(c + pickR(rnd, [1, 2, -1, -2]))],
      [mod12(b + pickR(rnd, [1, 2, -1, -2])), c],
      [c, b],
      [mod12(A + m2), mod12(A + m2 + m1)],
      [mod12(b + 3), mod12(c + 3)],
    ]);
    for (const [x, y] of alts) {
      if (set.size >= 4) break;
      if (x === A || y === A || x === y || set.has(seqOf(x, y))) continue;
      set.set(seqOf(x, y), [x, y]);
    }
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const [k, [x, y]] of set) {
      names[k] = nm(`${KEY_NAMES[A]} → ${KEY_NAMES[x]} → ${KEY_NAMES[y]}`, `${KEY_NAMES_HE[A]} → ${KEY_NAMES_HE[x]} → ${KEY_NAMES_HE[y]}`);
      choiceStim[k] = playKChords([...centre(A), ...centre(x), ...centre(y)], 0.26);
    }
    const answer = seqOf(b, c);
    return choiceQ({
      id, topic: 'key-centres', level, seed, skill: 'cadences', difficulty: 1600,
      ask: { en: `Three key centres, each with its ii–V–I. It starts in ${KEY_NAMES[A]}. Which order?`, he: `שלושה מרכזים טונליים, כל אחד עם ii–V–I. מתחיל ב${KEY_NAMES_HE[A]}. באיזה סדר?` },
      text: { en: `1st: ${KEY_NAMES[A]}`, he: `ראשון: ${KEY_NAMES_HE[A]}` },
      names, answer, choices: shuffleR(rnd, [...set.keys()]), stimulus: choiceStim[answer], choiceStim,
    });
  },
};
TOPIC_TAGS['key-centres'] = (l) => (l === 3 ? tg(['cadences', 'modulation', 0.6], ['form', 'song', 0.4]) : tg(['cadences', 'modulation', 0.8], ['degrees', 'find-tonic', 0.2]));

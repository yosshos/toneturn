// Voice leading by ear (docs/AUDIT-CONTENT-THEORY.md §ה.2): voice leading lived only as performed drills (k-vl, g-vl,
// drills/voiceLead.ts). This Ear & theory topic hears it, four levels:
//   1 which voice moved — soprano, alto, tenor or bass (one voice steps to the next scale note)
//   2 how many upper notes held — a diatonic chord change over a moving bass: 0 (roots a step apart), 1 (a 5th),
//     2 (a 3rd), all 3 (the bass falls a 3rd under the same triad: I → vi7)
//   3 a ii–V–I, smooth (each voice to the nearest note) or jumpy (every chord in root position)
//   4 the same ii–V–I in close position or in drop 2 (the second voice from the top an octave down)
// Pure, seeded generators like every topic; the answer of level 2 is counted from the voicings themselves.

import type { ChoiceQuestion, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, choiceQ, chordStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { nearVoicing } from './topicsHarris2';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const rest = (d = 0.3): Stimulus => ({ kind: 'rest', duration: d });
const MAJ = [0, 2, 4, 5, 7, 9, 11];

/** The diatonic triad on degree d (0 = I) of a major key, as pitch classes. */
export const triadPcs = (key: number, d: number): number[] => [0, 2, 4].map((k) => mod12(key + MAJ[(d + k) % 7]));
/** The bass of a pitch class nearest `near` inside 38–54 (the bass moves as little as it can). */
export function bassNear(pc: number, near = 46): number {
  let best = -1;
  for (let m = 38; m <= 54; m++) if (mod12(m) === mod12(pc) && (best < 0 || Math.abs(m - near) < Math.abs(best - near))) best = m;
  return best;
}
/** The next note of the major scale above (dir 1) or below (dir −1) a pitch. */
export function scaleStep(m: number, key: number, dir: 1 | -1): number {
  let x = m + dir;
  while (!MAJ.includes(mod12(x - key))) x += dir;
  return x;
}
/** Voices held from one voicing to the next (same pitch, same voice; voices paired low → high). */
export const heldCount = (a: number[], b: number[]): number => a.filter((m, i) => b[i] === m).length;
/** Total motion (semitones) between two voicings of the same size, voices paired low → high. */
export const totalMotion = (a: number[], b: number[]): number => a.reduce((s, m, i) => s + Math.abs(m - b[i]), 0);

// ---------------------------------------------------------------- ii–V–I voicings (levels 3 and 4)

/** The upper-voice pitch classes of a ii–V–I (major: ii7 V7 Imaj7; minor: iiø7 V7 im7) in a key. */
export function twoFiveOne(key: number, minor: boolean): { bass: number[]; pcs: number[][] } {
  const ii = (minor ? [2, 5, 8, 0] : [2, 5, 9, 0]).map((x) => mod12(key + x));
  const V = [7, 11, 2, 5].map((x) => mod12(key + x));
  const I = (minor ? [0, 3, 7, 10] : [0, 4, 7, 11]).map((x) => mod12(key + x));
  return { bass: [2, 7, 0].map((x) => mod12(key + x)), pcs: [ii, V, I] };
}
/** Close voicings, each voice to the nearest note of the next chord. */
export function smoothVoicings(pcs: number[][], aimTop = 72): number[][] {
  const out = [nearVoicing(pcs[0], null, 57, 79, aimTop)];
  for (const p of pcs.slice(1)) out.push(nearVoicing(p, out[out.length - 1], 55, 79));
  return out;
}
/** Every chord in root position (the root at the bottom, close above it), the root inside 55–66: the hand jumps. */
export function rootPositionVoicings(pcs: number[][]): number[][] {
  return pcs.map((p) => {
    let r = 55;
    while (mod12(r) !== p[0]) r++;
    const v = [r];
    for (const x of p.slice(1)) {
      let m = v[v.length - 1] + 1;
      while (mod12(m) !== x) m++;
      v.push(m);
    }
    return v;
  });
}
/** Drop 2: the second voice from the top of a close voicing an octave down. */
export const drop2 = (v: number[]): number[] => [v[2] - 12, v[0], v[1], v[3]].sort((a, b) => a - b);

/** A chord progression: bass + upper voices, each chord held. */
export function vlProg(bass: number[], upper: number[][], each = 1.15): Stimulus[] {
  const out: Stimulus[] = [];
  let lastBass = 45;
  upper.forEach((u, i) => {
    let b = bassNear(bass[i], lastBass);
    // The bass stays under the voicing (a drop-2 voicing reaches down into the bass register).
    while (b > u[0] - 3) b -= 12;
    lastBass = b;
    out.push(chordStim([b, ...u], i === upper.length - 1 ? each + 0.6 : each));
  });
  return out;
}
/** For the quick lesson: a ii–V–I in C, smooth or jumpy, close or drop 2. */
export function vl251Stim(key: number, how: 'smooth' | 'jumpy' | 'drop2', minor = false): Stimulus[] {
  const p = twoFiveOne(key, minor);
  const up = how === 'jumpy' ? rootPositionVoicings(p.pcs) : smoothVoicings(p.pcs);
  return vlProg(p.bass, how === 'drop2' ? up.map(drop2) : up);
}

// ---------------------------------------------------------------- names

const VOICE: Names = {
  s: nm('Soprano (top)', 'סופרן (עליון)', 'soprano', 'top', 'סופרן'),
  a: nm('Alto', 'אלט', 'alto', 'אלט'),
  t: nm('Tenor', 'טנור', 'tenor', 'טנור'),
  b: nm('Bass (bottom)', 'בס (תחתון)', 'bass', 'bottom', 'בס'),
};
const HELD: Names = {
  h0: nm('None', 'אף אחד', 'none', 'zero', 'אף אחד'),
  h1: nm('One', 'אחד', 'one', 'אחד'),
  h2: nm('Two', 'שניים', 'two', 'שניים'),
  h3: nm('All three', 'שלושתם', 'three', 'all', 'שלושה'),
};

TOPIC_GEN['vl-ear'] = {
  title: { en: 'Voice leading by ear', he: 'הובלת קולות בשמיעה' },
  skill: 'chords',
  levels: [
    { en: 'Which voice moved?', he: 'איזה קול זז?' },
    { en: 'How many notes held?', he: 'כמה צלילים נשארו?' },
    { en: 'ii–V–I: smooth or jumpy?', he: 'ii–V–I: חלקה או קופצנית?' },
    { en: 'Close or drop 2?', he: 'מצב קרוב או דרופ 2?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    if (level === 1) {
      // A diatonic triad in four voices (root in the bass, close above); one voice steps to the next scale note.
      const d = pickR(rnd, [0, 1, 3, 4, 5]);
      const pcs = triadPcs(key, d);
      const upper = nearVoicing(pcs, null, 55, 79, 66 + Math.floor(rnd() * 8));
      const A = [bassNear(pcs[0]), ...upper];
      const dir: 1 | -1 = rnd() < 0.5 ? 1 : -1;
      const moved = (k: number) => A.map((m, i) => (i === k ? scaleStep(m, key, dir) : m));
      const keys = ['b', 't', 'a', 's'];
      const k = Math.floor(rnd() * 4);
      const play = (j: number): Stimulus[] => [chordStim(A, 1.3), rest(), chordStim(moved(j), 1.6)];
      return choiceQ({
        id, topic: 'vl-ear', level, seed, skill: 'chords', difficulty: 1200,
        ask: { en: 'Two chords. Which voice moved?', he: 'שני אקורדים. איזה קול זז?' },
        names: VOICE, answer: keys[k], choices: ['s', 'a', 't', 'b'], stimulus: play(k),
        choiceStim: Object.fromEntries(keys.map((v, j) => [v, play(j)])),
      });
    }
    if (level === 2) {
      // 0: roots a step apart · 1: a 5th · 2: a 3rd · 3: the same triad over a bass a 3rd lower (I → vi7).
      const target = Math.floor(rnd() * 4);
      const d1 = target === 3 ? pickR(rnd, [0, 2, 3, 4, 5]) : pickR(rnd, [0, 1, 2, 3, 4, 5]);
      const deltas = target === 0 ? [1, 6] : target === 1 ? [3, 4] : target === 2 ? [2, 5] : [5];
      const opts = deltas.map((x) => (d1 + x) % 7).filter((x) => x !== 6);
      const d2 = opts.length ? pickR(rnd, opts) : (d1 + 3) % 7;
      const up1 = nearVoicing(triadPcs(key, d1), null, 57, 77, 66 + Math.floor(rnd() * 8));
      const up2 = target === 3 ? up1.slice() : nearVoicing(triadPcs(key, d2), up1, 55, 79);
      const b1 = bassNear(triadPcs(key, d1)[0]);
      const b2 = bassNear(mod12(key + MAJ[d2]), b1);
      const held = heldCount(up1, up2);
      const play: Stimulus[] = [chordStim([b1, ...up1], 1.3), rest(), chordStim([b2, ...up2], 1.6)];
      return choiceQ({
        id, topic: 'vl-ear', level, seed, skill: 'chords', difficulty: 1300,
        ask: { en: 'The bass moves. How many upper notes stay?', he: 'הבס זז. כמה צלילים למעלה נשארים?' },
        names: HELD, answer: `h${held}`, choices: ['h0', 'h1', 'h2', 'h3'], stimulus: play,
      });
    }
    const minor = rnd() < 0.35;
    const p = twoFiveOne(key, minor);
    const smooth = smoothVoicings(p.pcs, 68 + Math.floor(rnd() * 7));
    if (level === 3) {
      const isSmooth = rnd() < 0.5;
      const st = (s: boolean) => vlProg(p.bass, s ? smooth : rootPositionVoicings(p.pcs));
      return choiceQ({
        id, topic: 'vl-ear', level, seed, skill: 'chords', difficulty: 1400,
        ask: { en: `${minor ? 'Minor' : 'Major'} ii–V–I. Smooth or jumpy?`, he: `ii–V–I ${minor ? 'במינור' : 'במז׳ור'}. חלקה או קופצנית?` },
        names: { smooth: nm('Smooth: steps and held notes', 'חלקה: צעדים וצלילים שנשארים', 'smooth', 'חלקה'), jumpy: nm('Jumpy: the hand leaps', 'קופצנית: היד קופצת', 'jumpy', 'leaps', 'קופצנית') },
        answer: isSmooth ? 'smooth' : 'jumpy', choices: ['smooth', 'jumpy'], stimulus: st(isSmooth),
        choiceStim: { smooth: st(true), jumpy: st(false) },
      });
    }
    // Level 4: the same voice-led ii–V–I, close or drop 2 (same top line, so only the spread differs).
    const isDrop = rnd() < 0.5;
    const st = (dr: boolean) => vlProg(p.bass, dr ? smooth.map(drop2) : smooth);
    return choiceQ({
      id, topic: 'vl-ear', level, seed, skill: 'chords', difficulty: 1650,
      ask: { en: 'ii–V–I: close or drop 2?', he: 'ii–V–I: מצב קרוב או דרופ 2?' },
      names: { close: nm('Close: inside an octave', 'קרוב: בתוך אוקטבה', 'close', 'קרוב'), drop2: nm('Drop 2: wider, open', 'דרופ 2: רחב ופתוח', 'drop two', 'drop', 'דרופ') },
      answer: isDrop ? 'drop2' : 'close', choices: ['close', 'drop2'], stimulus: st(isDrop),
      choiceStim: { close: st(false), drop2: st(true) },
    });
  },
};
TOPIC_TAGS['vl-ear'] = (l) => (l === 3 ? tg(['chords', 'voice-leading', 0.7], ['cadences', 'progression', 0.3]) : l === 4 ? tg(['chords', 'voicing', 1]) : tg(['chords', 'voice-leading', 1]));

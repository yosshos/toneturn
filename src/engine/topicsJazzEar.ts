// Advanced jazz ear and rock / prog rhythm (EAR_THEORY_AUDIT, owner 2026-11-10: "pop is the on-ramp; the top levels
// bring people to a jazz-level ear — dense harmony — and rock / prog rhythm"). Own material only: every progression,
// voicing and phrase below is generated from rules, nothing is copied from a recording or a book.
//
// Ear & theory course (no pack):
//   · extensions 5–8  — minor colours, dominant chords by name (9, 13, 7♭9, 7♯9, 7♯11, 7alt, 13♭9), near neighbours,
//                       the V of a ii–V–I
//   · voicings 4–5    — rootless A or B, which upper-structure triad
//   · modes-ear       — church modes by ear over a drone, modal melodies, melodic-minor modes
//   · prog-meter      — 5/4 and 9/8 / 11/8 groupings, polymeter (riff length over 4/4), metric modulation
// Jazz & improv course (pack 'jazz'):
//   · jazz-changes    — what the changes do: major / minor ii–V, tritone sub, backdoor, where the next ii–V goes,
//                       modal interchange, Coltrane changes
//   · reharm-spot     — the same tune reharmonised: tritone sub, secondary dominant, backdoor, diminished passing,
//                       Coltrane substitution
//   · guide-line      — guide-tone line dictation over ii–V–I, I–vi–ii–V, a cycle of seven chords
//   · jazz-phrase     — transcribe a short phrase as degrees (arpeggio, line, enclosure, bebop)
//   · jazz-form       — major or minor blues, rhythm changes A or bridge, which blues
// Pure, seeded generators like every topic; tags here; path pack in path.ts (PACK_TOPICS).

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, eventsStim, nm, pcName, pcNameHe, pcNameKey } from './topicKit';
import { TOPIC_TAGS, tg, type Tag } from './taxonomy';
import './topicsHarmony'; // extensions, voicings (deepened below)

type Names = ChoiceQuestion['names'];
type Bi = { en: string; he: string };
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const rest = (d = 0.45): Stimulus => ({ kind: 'rest', duration: d });

// ================================================================ chord qualities (jazz symbols)

/** Upper-voice offsets above the root (a pianist's voicing; the root is the bass's). */
export const JQ = {
  maj7: { up: [4, 7, 11, 16], n: nm('maj7', 'maj7', 'major seven') },
  dom7: { up: [4, 7, 10, 16], n: nm('7', '7', 'seven', 'dominant') },
  m7: { up: [3, 7, 10, 15], n: nm('m7', 'm7', 'minor seven') },
  m7b5: { up: [3, 6, 10, 15], n: nm('m7♭5', 'm7♭5', 'half diminished', 'minor seven flat five') },
  dim7: { up: [3, 6, 9, 15], n: nm('°7', '°7', 'diminished seven') },
  mmaj7: { up: [3, 7, 11, 15], n: nm('m(maj7)', 'm(maj7)', 'minor major seven') },
  maj7s5: { up: [4, 8, 11, 16], n: nm('maj7♯5', 'maj7♯5', 'major seven sharp five') },
  m6: { up: [3, 7, 9, 15], n: nm('m6', 'm6', 'minor six') },
  six: { up: [4, 7, 9, 16], n: nm('6', '6', 'six', 'major six') },
  maj9: { up: [4, 7, 11, 14], n: nm('maj9', 'maj9', 'major nine') },
  nine: { up: [4, 7, 10, 14], n: nm('9', '9', 'nine', 'dominant nine') },
  m9: { up: [3, 7, 10, 14], n: nm('m9', 'm9', 'minor nine') },
  six9: { up: [4, 9, 14, 19], n: nm('6/9', '6/9', 'six nine') },
  m11: { up: [3, 10, 14, 17], n: nm('m11', 'm11', 'minor eleven') },
  m69: { up: [3, 9, 14, 19], n: nm('m6/9', 'm6/9', 'minor six nine') },
  thirteen: { up: [4, 10, 14, 21], n: nm('13', '13', 'thirteen') },
  sus9: { up: [5, 10, 14, 19], n: nm('9sus4', '9sus4', 'nine sus', 'sus') },
  maj7s11: { up: [4, 11, 14, 18], n: nm('maj7♯11', 'maj7♯11', 'lydian', 'major seven sharp eleven') },
  b9: { up: [4, 10, 13, 19], n: nm('7♭9', '7♭9', 'seven flat nine') },
  s9: { up: [4, 10, 15, 19], n: nm('7♯9', '7♯9', 'seven sharp nine') },
  s11: { up: [4, 10, 14, 18], n: nm('7♯11', '7♯11', 'seven sharp eleven', 'lydian dominant') },
  alt: { up: [4, 10, 15, 20], n: nm('7alt', '7alt', 'alt', 'altered') },
  t13b9: { up: [4, 10, 13, 21], n: nm('13♭9', '13♭9', 'thirteen flat nine') },
} as const;
export type JQId = keyof typeof JQ;

/** Bass note of a root pitch class: E1–D♯2 (low, but in the upright's range). */
const bassOf = (pc: number) => 28 + mod12(pc - 28) + (mod12(pc - 28) < 8 ? 12 : 0);
/** Upper voices of a chord near `center` (mean pitch), lowest voice not under E3. */
function upper(pc: number, up: readonly number[], center = 62): number[] {
  let best: number[] = [];
  let cost = Infinity;
  for (let base = 36 + mod12(pc); base <= 72; base += 12) {
    const ms = up.map((x) => base + x);
    if (ms[0] < 52 || ms[ms.length - 1] > 84) continue;
    const c = Math.abs(ms.reduce((a, b) => a + b, 0) / ms.length - center);
    if (c < cost) {
      cost = c;
      best = ms;
    }
  }
  return best.length ? best : up.map((x) => 48 + mod12(pc) + x);
}

/** One chord of a progression: root pitch class (absolute), quality, length in beats. */
export interface JChord {
  pc: number;
  q: JQId;
  beats: number;
}
/** A jazz trio texture: upright bass (root on 1, the fifth or an approach on 3), a comped voicing, swung ride. */
function comp(chords: JChord[], bpm: number, o: { ride?: boolean; voicings?: number[][]; top?: number[]; hold?: boolean } = {}): NoteEvent[] {
  const q = 60 / bpm;
  const ev: NoteEvent[] = [];
  let t = 0;
  let prevMean = 62;
  chords.forEach((c, i) => {
    const v = o.voicings?.[i] ?? upper(c.pc, JQ[c.q].up, prevMean);
    prevMean = v.reduce((a, b) => a + b, 0) / v.length;
    const b = bassOf(c.pc);
    ev.push({ midi: b, start: t, duration: q * Math.min(2, c.beats) * 0.92, velocity: 0.7, inst: 'bass' });
    if (c.beats >= 4) {
      const next = chords[i + 1];
      // beat 3: the fifth; beat 4 (long chords): a half step into the next root
      ev.push({ midi: b + 7 <= 52 ? b + 7 : b - 5, start: t + 2 * q, duration: q * 0.9, velocity: 0.6, inst: 'bass' });
      if (next) {
        const nb = bassOf(next.pc);
        ev.push({ midi: nb + (nb > b ? -1 : 1), start: t + 3 * q, duration: q * 0.9, velocity: 0.55, inst: 'bass' });
      }
    }
    // the comp: on 1 (held) — or Charleston-like on 1 and the "and" of 2 when there is room
    const hits = o.hold || c.beats < 2 ? [[0, c.beats * 0.95]] : [[0, 1.2], [1 + 2 / 3, Math.max(0.6, c.beats - 1.8)]];
    for (const [at, len] of hits) for (const m of v) ev.push({ midi: m, start: t + at * q, duration: len * q, velocity: 0.42 });
    if (o.top?.[i] !== undefined) ev.push({ midi: o.top[i], start: t, duration: c.beats * q * 0.95, velocity: 0.85 });
    if (o.ride !== false)
      for (let k = 0; k < c.beats; k++) {
        ev.push({ midi: 60, start: t + k * q, duration: 0.1, velocity: k % 2 ? 0.42 : 0.3, perc: 'ride' });
        if (k % 2 === 1) ev.push({ midi: 60, start: t + (k + 2 / 3) * q, duration: 0.08, velocity: 0.26, perc: 'ride' });
        if (k % 2 === 1) ev.push({ midi: 60, start: t + k * q, duration: 0.05, velocity: 0.3, perc: 'hat-foot' });
      }
    t += c.beats * q;
  });
  return ev;
}
const prog = (chords: JChord[], bpm: number, o?: Parameters<typeof comp>[2]): Stimulus => {
  const ev = comp(chords, bpm, o);
  return eventsStim(ev, chords.reduce((a, c) => a + c.beats, 0) * (60 / bpm) + 0.4);
};
/** One chord, held: bass and voicing (for chord-colour questions). */
const held = (pc: number, up: number[], len = 1.8): Stimulus => {
  const ev: NoteEvent[] = [{ midi: bassOf(pc), start: 0, duration: len, velocity: 0.7, inst: 'bass' }, ...up.map((m) => ({ midi: m, start: 0.02, duration: len, velocity: 0.48 }))];
  return eventsStim(ev, len + 0.2);
};
const J = (pc: number, q: JQId, beats = 4): JChord => ({ pc: mod12(pc), q, beats });
const sym = (pc: number, q: JQId, key: number) => `${pcNameKey(pc, key)}${JQ[q].n.en}`;

function fromPool(rnd: () => number, pool: readonly string[], answer: string, n = 4): string[] {
  return shuffleR(rnd, [answer, ...shuffleR(rnd, pool.filter((k) => k !== answer)).slice(0, n - 1)]);
}

// ================================================================ extensions 5–8 (Ear & theory)

/** Wrap a topic with more levels (the base levels stay as they are). */
function deepen(topic: string, levels: Bi[], more: (seed: number, level: number, id: string, full: number) => ReturnType<(typeof TOPIC_GEN)[string]['gen']>, tags?: (l: number) => Tag[]) {
  const base = TOPIC_GEN[topic];
  const baseN = base.levels.length;
  TOPIC_GEN[topic] = { ...base, levels: [...base.levels, ...levels], gen: (seed, level, id) => (level <= baseN ? base.gen(seed, level, id) : more(seed, level - baseN, id, level)) };
  if (tags) {
    const bt = TOPIC_TAGS[topic];
    TOPIC_TAGS[topic] = (l) => (l <= baseN ? (typeof bt === 'function' ? bt(l) : (bt ?? [])) : tags(l - baseN));
  }
}

const EXT_GROUPS: JQId[][] = [
  ['maj7s5', 'maj7s11', 'maj9', 'six9'],
  ['m7b5', 'dim7', 'm6', 'm7'],
  ['mmaj7', 'm6', 'm9', 'm7'],
  ['sus9', 'nine', 'thirteen', 'dom7'],
  ['b9', 's9', 'alt', 't13b9'],
];
deepen(
  'extensions',
  [
    { en: 'Minor colors: m7, m9, m11, m6/9', he: 'צבעים של מינור: m7, m9, m11, m6/9' },
    { en: 'Dominants by name: 9, 13, 7♭9, 7♯9, 7♯11, alt', he: 'דומיננטים בשם: 9, 13, 7♭9, 7♯9, 7♯11, alt' },
    { en: 'Near neighbors', he: 'שכנים קרובים' },
    { en: 'In a ii–V–I: which V?', he: 'בתוך ii–V–I: איזה V?' },
  ],
  (seed, l, id) => {
    const rnd = rng(seed);
    const r = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    if (l === 4) {
      // The V of a ii–V–I, voiced the way a pianist would (the ii and the I stay the same).
      const pool: JQId[] = ['nine', 'thirteen', 'b9', 's9', 'alt', 's11'];
      const ans = pickR(rnd, pool);
      const choices = fromPool(rnd, pool, ans);
      const play = (v: JQId) => [prog([J(r + 2, 'm9', 2), J(r + 7, v, 2), J(r, 'maj9', 4)], 116, { hold: true })];
      const names: Names = {};
      for (const k of choices) names[k] = nm(`V${JQ[k as JQId].n.en}`, `V${JQ[k as JQId].n.en}`, ...(JQ[k as JQId].n.say ?? []));
      return choiceQ({ id, topic: 'extensions', level: 8, seed, skill: 'chords', difficulty: 1900, ask: { en: 'ii–V–I: which V?', he: 'ii–V–I: איזה V?' }, names, answer: ans, choices, stimulus: play(ans), choiceStim: Object.fromEntries(choices.map((k) => [k, play(k as JQId)])) });
    }
    const pool: JQId[] = l === 1 ? ['m7', 'm9', 'm11', 'm69'] : l === 2 ? ['nine', 'thirteen', 'b9', 's9', 's11', 'alt', 't13b9'] : pickR(rnd, EXT_GROUPS);
    const ans = pickR(rnd, pool);
    const choices = pool.length > 4 ? fromPool(rnd, pool, ans) : shuffleR(rnd, pool.slice());
    const names: Names = {};
    for (const k of choices) names[k] = JQ[k as JQId].n;
    const pc = mod12(r + 5);
    const st = (k: string) => [held(pc, upper(pc, JQ[k as JQId].up))];
    return choiceQ({
      id, topic: 'extensions', level: 4 + l, seed, skill: 'chords', difficulty: [1760, 1800, 1850][l - 1],
      ask: { en: 'Which chord?', he: 'איזה אקורד?' }, names, answer: ans, choices, stimulus: st(ans), choiceStim: Object.fromEntries(choices.map((k) => [k, st(k)])),
    });
  },
);

// ================================================================ voicings 4–5 (Ear & theory)

const ROOTLESS: Record<'maj7' | 'm7' | 'dom7', { a: number[]; b: number[]; n: Bi }> = {
  maj7: { a: [4, 7, 11, 14], b: [11, 14, 16, 19], n: { en: 'maj9', he: 'maj9' } },
  m7: { a: [3, 7, 10, 14], b: [10, 14, 15, 19], n: { en: 'm9', he: 'm9' } },
  dom7: { a: [4, 9, 10, 14], b: [10, 14, 16, 21], n: { en: '13', he: '13' } },
};
/** Upper-structure triads over a dominant: the triad's root above the chord root, and what its notes are. */
const UST: Record<string, { at: number; tri: number[]; n: ReturnType<typeof nm> }> = {
  II: { at: 2, tri: [0, 4, 7], n: nm('II (9 ♯11 13)', 'II (9 ♯11 13)', 'two', 'two triad') },
  bVI: { at: 8, tri: [0, 4, 7], n: nm('♭VI (♭13 1 ♯9)', '♭VI (♭13 1 ♯9)', 'flat six', 'flat six triad') },
  VI: { at: 9, tri: [0, 4, 7], n: nm('VI (13 ♭9 3)', 'VI (13 ♭9 3)', 'six', 'six triad') },
  bV: { at: 6, tri: [0, 4, 7], n: nm('♭V (♯11 ♭7 ♭9)', '♭V (♯11 ♭7 ♭9)', 'flat five', 'flat five triad') },
};
deepen(
  'voicings',
  [
    { en: 'Rootless: A or B?', he: 'בלי שורש: A או B?' },
    { en: 'Which upper-structure triad?', he: 'איזה משולש עליון?' },
  ],
  (seed, l, id) => {
    const rnd = rng(seed);
    const pc = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    if (l === 1) {
      const kind = pickR(rnd, ['maj7', 'm7', 'dom7'] as const);
      const R = ROOTLESS[kind];
      const ans = rnd() < 0.5 ? 'a' : 'b';
      const v = (k: 'a' | 'b') => upper(pc, R[k], 60);
      const names: Names = { a: nm('A: the 3rd at the bottom', 'A: הטרצה למטה', 'a', 'third'), b: nm('B: the 7th at the bottom', 'B: הספטימה למטה', 'b', 'seventh') };
      return choiceQ({
        id, topic: 'voicings', level: 4, seed, skill: 'chords', difficulty: 1700,
        ask: { en: `Rootless ${pcName(pc)}${R.n.en}: A or B?`, he: `${pcNameHe(pc)} ${R.n.he} בלי שורש: A או B?` },
        names, answer: ans, choices: ['a', 'b'], stimulus: [held(pc, v(ans))], choiceStim: { a: [held(pc, v('a'))], b: [held(pc, v('b'))] },
      });
    }
    const keys = Object.keys(UST);
    const ans = pickR(rnd, keys);
    const shell = (k: string) => {
      const u = UST[k];
      const lo = upper(pc, [4, 10], 56); // the 3rd and the ♭7 in the left hand
      const top = upper(mod12(pc + u.at), u.tri, 72).filter((m) => m > lo[lo.length - 1]);
      return [...lo, ...top];
    };
    const names: Names = {};
    for (const k of keys) names[k] = UST[k].n;
    return choiceQ({
      id, topic: 'voicings', level: 5, seed, skill: 'chords', difficulty: 1800,
      ask: { en: `${pcName(pc)}7: which triad on top?`, he: `${pcNameHe(pc)} 7: איזה משולש למעלה?` },
      names, answer: ans, choices: keys, stimulus: [held(pc, shell(ans), 2.2)], choiceStim: Object.fromEntries(keys.map((k) => [k, [held(pc, shell(k), 2)]])),
    });
  },
);

// ================================================================ upper-rootless (Ear & theory, EAR_THEORY_AUDIT §6)
// A topic of its own for the two pianist's sounds that voicings 4–5 only touch: rootless A / B voicings (which chord,
// and how A and B alternate through a ii–V–I) and upper-structure triads over a dominant (the common pair, then all
// five inside a ii–V–I). The bass always plays the root — as on the bandstand, where the pianist leaves it out.

/** Rootless voicings above the root (the bass plays the root). */
const RL: Record<'maj9' | 'm9' | 'thirteen' | 'alt', { up: number[]; n: ReturnType<typeof nm> }> = {
  maj9: { up: [4, 7, 11, 14], n: nm('maj9 (3 5 7 9)', 'maj9 (3 5 7 9)', 'major nine') },
  m9: { up: [3, 7, 10, 14], n: nm('m9 (♭3 5 ♭7 9)', 'm9 (♭3 5 ♭7 9)', 'minor nine') },
  thirteen: { up: [4, 9, 10, 14], n: nm('13 (3 13 ♭7 9)', '13 (3 13 ♭7 9)', 'thirteen', 'dominant') },
  alt: { up: [4, 10, 15, 20], n: nm('7alt (3 ♭7 ♯9 ♭13)', '7alt (3 ♭7 ♯9 ♭13)', 'altered', 'alt') },
};
/** Upper-structure triads over a dominant, the commonest five (the triad's root above the chord root). */
export const UST5: Record<string, { at: number; n: ReturnType<typeof nm> }> = {
  II: { at: 2, n: nm('II (9 ♯11 13)', 'II (9 ♯11 13)', 'two') },
  bIII: { at: 3, n: nm('♭III (♯9 5 ♭7)', '♭III (♯9 5 ♭7)', 'flat three') },
  bV: { at: 6, n: nm('♭V (♯11 ♭7 ♭9)', '♭V (♯11 ♭7 ♭9)', 'flat five') },
  bVI: { at: 8, n: nm('♭VI (♭13 1 ♯9)', '♭VI (♭13 1 ♯9)', 'flat six') },
  VI: { at: 9, n: nm('VI (13 ♭9 3)', 'VI (13 ♭9 3)', 'six') },
};
/** The 3rd and ♭7 in the left hand, the major triad `at` semitones above the root over them. */
export function ustVoicing(pc: number, at: number): number[] {
  const lo = upper(pc, [4, 10], 56);
  const top = upper(mod12(pc + at), [0, 4, 7], 72).filter((m) => m > lo[lo.length - 1]);
  return [...lo, ...top];
}
/**
 * A ii–V–I in rootless voicings, the forms alternating so the hand barely moves: starting in A = ii (♭3 5 ♭7 9) →
 * V (♭7 9 3 13) → I (3 5 7 9); starting in B = ii (♭7 9 ♭3 5) → V (3 13 ♭7 9) → I (7 9 3 5). Each chord is placed
 * nearest the one before.
 */
export function rootless251(key: number, startA: boolean): number[][] {
  const ii = mod12(key + 2);
  const v = mod12(key + 7);
  const forms: [number, number[]][] = startA
    ? [[ii, [3, 7, 10, 14]], [v, [10, 14, 16, 21]], [key, [4, 7, 11, 14]]]
    : [[ii, [10, 14, 15, 19]], [v, [4, 9, 10, 14]], [key, [11, 14, 16, 19]]];
  const out = [upper(forms[0][0], forms[0][1], 62)];
  for (const [pc, up] of forms.slice(1)) {
    const prev = out[out.length - 1];
    out.push(upper(pc, up, prev.reduce((a, b) => a + b, 0) / prev.length));
  }
  return out;
}
TOPIC_GEN['upper-rootless'] = {
  title: { en: 'Upper structures and rootless voicings', he: 'מבנים עליונים ווויסינגים בלי שורש' },
  skill: 'chords',
  levels: [
    { en: 'Rootless: which chord?', he: 'בלי שורש: איזה אקורד?' },
    { en: 'A rootless ii–V–I: does the ii start in A or B?', he: 'ii–V–I בלי שורש: ה־ii מתחיל ב־A או ב־B?' },
    { en: 'Upper structure: II or ♭VI?', he: 'מבנה עליון: II או ♭VI?' },
    { en: 'The upper structure on the V of a ii–V–I', he: 'המבנה העליון על ה־V של ii–V–I' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pc = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    if (level === 1) {
      const keys = Object.keys(RL) as (keyof typeof RL)[];
      const ans = pickR(rnd, keys);
      const names: Names = {};
      for (const k of keys) names[k] = RL[k].n;
      const v = (k: keyof typeof RL) => upper(pc, RL[k].up, 60);
      return choiceQ({
        id, topic: 'upper-rootless', level, seed, skill: 'chords', difficulty: 1650,
        ask: { en: `Rootless, ${pcName(pc)} in the bass: which chord?`, he: `בלי שורש, ${pcNameHe(pc)} בבס: איזה אקורד?` },
        names, answer: ans, choices: shuffleR(rnd, keys.slice()), stimulus: [held(pc, v(ans))], choiceStim: Object.fromEntries(keys.map((k) => [k, [held(pc, v(k))]])),
      });
    }
    if (level === 2) {
      const startA = rnd() < 0.5;
      const play = (a: boolean) => [rootless251Stim(pc, a)];
      const names: Names = { a: nm('A: the ii’s ♭3 at the bottom', 'A: ה־♭3 של ה־ii למטה', 'a'), b: nm('B: the ii’s ♭7 at the bottom', 'B: ה־♭7 של ה־ii למטה', 'b') };
      return choiceQ({
        id, topic: 'upper-rootless', level, seed, skill: 'chords', difficulty: 1720,
        ask: { en: `ii–V–I in ${pcNameKey(pc, pc)}: the ii in A or B?`, he: `ii–V–I ב־${pcNameKey(pc, pc)}: ה־ii ב־A או ב־B?` },
        names, answer: startA ? 'a' : 'b', choices: ['a', 'b'], stimulus: play(startA), choiceStim: { a: play(true), b: play(false) },
      });
    }
    if (level === 3) {
      const ans = rnd() < 0.5 ? 'II' : 'bVI';
      const st = (k: string) => [held(pc, ustVoicing(pc, UST5[k].at), 2.2)];
      return choiceQ({
        id, topic: 'upper-rootless', level, seed, skill: 'chords', difficulty: 1760,
        ask: { en: `${pcName(pc)}7: which triad on top?`, he: `${pcNameHe(pc)} 7: איזה משולש למעלה?` },
        names: { II: UST5.II.n, bVI: UST5.bVI.n }, answer: ans, choices: ['II', 'bVI'], stimulus: st(ans), choiceStim: { II: st('II'), bVI: st('bVI') },
      });
    }
    const keys = Object.keys(UST5);
    const ans = pickR(rnd, keys);
    const names: Names = {};
    for (const k of keys) names[k] = UST5[k].n;
    const v = mod12(pc + 7);
    const st = (k: string) => [prog([J(pc + 2, 'm7', 4), J(v, 'dom7', 4), J(pc, 'maj9', 4)], 100, { hold: true, voicings: [upper(mod12(pc + 2), [3, 7, 10, 14], 62), ustVoicing(v, UST5[k].at), upper(pc, [4, 7, 11, 14], 64)] })];
    return choiceQ({
      id, topic: 'upper-rootless', level, seed, skill: 'chords', difficulty: 1860,
      ask: { en: `ii–V–I in ${pcNameKey(pc, pc)}: which triad over the V?`, he: `ii–V–I ב־${pcNameKey(pc, pc)}: איזה משולש מעל ה־V?` },
      names, answer: ans, choices: keys, stimulus: st(ans), choiceStim: Object.fromEntries(keys.map((k) => [k, st(k)])),
    });
  },
};
TOPIC_TAGS['upper-rootless'] = (l) => (l === 2 ? tg(['chords', 'voicing', 0.7], ['cadences', 'progression', 0.3]) : tg(['chords', 'voicing', 1]));

// ================================================================ modes-ear (Ear & theory)

const MODES: Record<string, { steps: number[]; n: ReturnType<typeof nm>; color: number }> = {
  ionian: { steps: [0, 2, 4, 5, 7, 9, 11], n: nm('Ionian (major)', 'יוני (מז׳ור)', 'ionian', 'major'), color: 4 },
  lydian: { steps: [0, 2, 4, 6, 7, 9, 11], n: nm('Lydian', 'לידי', 'lydian'), color: 6 },
  mixolydian: { steps: [0, 2, 4, 5, 7, 9, 10], n: nm('Mixolydian', 'מיקסולידי', 'mixolydian'), color: 10 },
  dorian: { steps: [0, 2, 3, 5, 7, 9, 10], n: nm('Dorian', 'דורי', 'dorian'), color: 9 },
  aeolian: { steps: [0, 2, 3, 5, 7, 8, 10], n: nm('Aeolian (natural minor)', 'איאולי (מינור טבעי)', 'aeolian', 'minor'), color: 8 },
  phrygian: { steps: [0, 1, 3, 5, 7, 8, 10], n: nm('Phrygian', 'פריגי', 'phrygian'), color: 1 },
  locrian: { steps: [0, 1, 3, 5, 6, 8, 10], n: nm('Locrian', 'לוקרי', 'locrian'), color: 6 },
  melmin: { steps: [0, 2, 3, 5, 7, 9, 11], n: nm('Melodic minor', 'מינור מלודי', 'melodic minor', 'jazz minor'), color: 11 },
  lyddom: { steps: [0, 2, 4, 6, 7, 9, 10], n: nm('Lydian dominant', 'לידי דומיננטי', 'lydian dominant'), color: 6 },
  altered: { steps: [0, 1, 3, 4, 6, 8, 10], n: nm('Altered', 'אלטרד', 'altered', 'super locrian'), color: 3 },
  mixb6: { steps: [0, 2, 4, 5, 7, 8, 10], n: nm('Mixolydian ♭6', 'מיקסולידי ♭6', 'mixolydian flat six'), color: 8 },
  phrdom: { steps: [0, 1, 4, 5, 7, 8, 10], n: nm('Phrygian dominant', 'פריגי דומיננטי', 'phrygian dominant', 'spanish'), color: 1 },
};
/** A drone on the tonic (low fifth), and over it the scale up and down, or a modal tune. */
function modal(tonic: number, steps: number[], tune: number[] | null, each = 0.3): Stimulus {
  const notes = tune ?? [...steps.map((_, i) => i), 7, ...steps.map((_, i) => 6 - i)];
  const midi = (d: number) => tonic + Math.floor(d / 7) * 12 + steps[((d % 7) + 7) % 7];
  const ev: NoteEvent[] = [];
  const len = notes.length * each + 0.6;
  ev.push({ midi: tonic - 24, start: 0, duration: len, velocity: 0.42 }, { midi: tonic - 17, start: 0, duration: len, velocity: 0.3 });
  notes.forEach((d, i) => ev.push({ midi: midi(d), start: 0.5 + i * each, duration: each * (i === notes.length - 1 ? 2.2 : 0.92), velocity: 0.62 }));
  return eventsStim(ev, len + 0.3);
}
/** A modal tune that leans on the mode's colour note (degree index `color` of the mode). */
function modalTune(rnd: () => number, colorIdx: number): number[] {
  const t = [0, pickR(rnd, [2, 4]), colorIdx, pickR(rnd, [4, 3]), colorIdx, pickR(rnd, [2, 1]), 1, 0];
  return t;
}
TOPIC_GEN['modes-ear'] = {
  title: { en: 'Modes by ear', he: 'מודוסים בשמיעה' },
  skill: 'modes',
  levels: [
    { en: 'Bright modes: Ionian, Lydian, Mixolydian', he: 'מודוסים בהירים: יוני, לידי, מיקסולידי' },
    { en: 'Dark modes: Dorian, Aeolian, Phrygian', he: 'מודוסים כהים: דורי, איאולי, פריגי' },
    { en: 'All seven', he: 'כל השבעה' },
    { en: 'In a tune over a drone', he: 'במנגינה מעל צליל ממושך' },
    { en: 'Melodic-minor and harmonic-minor modes', he: 'מודוסים של המינור המלודי וההרמוני' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = 60 + pickR(rnd, [-3, -1, 0, 2, 3, 5]);
    const pool =
      level === 1 ? ['ionian', 'lydian', 'mixolydian'] : level === 2 ? ['dorian', 'aeolian', 'phrygian'] : level === 3 ? ['ionian', 'lydian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian'] : level === 4 ? ['lydian', 'mixolydian', 'dorian', 'aeolian', 'phrygian'] : ['melmin', 'lyddom', 'altered', 'mixb6', 'phrdom'];
    const ans = pickR(rnd, pool);
    const choices = pool.length > 4 ? fromPool(rnd, pool, ans) : shuffleR(rnd, pool.slice());
    const colorIdx = (m: string) => Math.max(1, MODES[m].steps.indexOf(MODES[m].color));
    // Level 4: the same tune shape in every mode, leaning on that mode's colour note.
    const st = (m: string) => [modal(tonic, MODES[m].steps, level === 4 ? modalTune(rng(seed + 7), colorIdx(m)) : null, level === 4 ? 0.42 : 0.28)];
    const names: Names = {};
    for (const k of choices) names[k] = MODES[k].n;
    return choiceQ({
      id, topic: 'modes-ear', level, seed, skill: 'modes', difficulty: [1300, 1400, 1520, 1600, 1720][level - 1],
      ask: { en: 'Which mode?', he: 'איזה מודוס?' }, names, answer: ans, choices, stimulus: st(ans), choiceStim: Object.fromEntries(choices.map((k) => [k, st(k)])),
    });
  },
};
TOPIC_TAGS['modes-ear'] = tg(['modes', 'modes', 1]);

// ================================================================ prog-meter (Ear & theory)

/** A kit groove in eighths (or quarters): kick on the bar, snare on each later group start, hats on every pulse. */
function groupsBeat(groups: number[], step: number, bars: number): NoteEvent[] {
  const ev: NoteEvent[] = [];
  const len = groups.reduce((a, b) => a + b, 0);
  for (let b = 0; b < bars; b++) {
    let i = 0;
    groups.forEach((g, gi) => {
      for (let k = 0; k < g; k++, i++) {
        const t = (b * len + i) * step;
        if (k === 0) ev.push({ midi: 60, start: t, duration: 0.12, velocity: gi === 0 ? 0.95 : 0.72, perc: gi === 0 ? 'kick' : 'snare' });
        ev.push({ midi: 60, start: t, duration: 0.04, velocity: k === 0 ? 0.62 : 0.34, perc: 'hat' });
      }
    });
  }
  return ev;
}
const GROUPS: Record<string, { g: number[]; n: ReturnType<typeof nm> }> = {
  q32: { g: [3, 2], n: nm('3 + 2', '3 + 2', 'three two') },
  q23: { g: [2, 3], n: nm('2 + 3', '2 + 3', 'two three') },
  n2223: { g: [2, 2, 2, 3], n: nm('2+2+2+3', '2+2+2+3', 'aksak', 'two two two three') },
  n333: { g: [3, 3, 3], n: nm('3+3+3 (compound)', '3+3+3 (מורכב)', 'three three three', 'compound') },
  n3222: { g: [3, 2, 2, 2], n: nm('3+2+2+2', '3+2+2+2', 'three two two two') },
  e3332: { g: [3, 3, 3, 2], n: nm('3+3+3+2', '3+3+3+2', 'three three three two') },
  e22322: { g: [2, 2, 3, 2, 2], n: nm('2+2+3+2+2', '2+2+3+2+2', 'two two three two two') },
  e443: { g: [4, 4, 3], n: nm('4+4+3', '4+4+3', 'four four three') },
};
const RATIO: Record<string, { r: number; pivot: number; n: ReturnType<typeof nm> }> = {
  // pivot: the old pulse's subdivision (in old beats) that becomes the new beat
  up32: { r: 3 / 2, pivot: 2 / 3, n: nm('Tempo ×3/2', 'טמפו פי 3/2', 'three halves', 'triplets') },
  up43: { r: 4 / 3, pivot: 3 / 4, n: nm('Tempo ×4/3', 'טמפו פי 4/3', 'four thirds', 'dotted eighth') },
  dn23: { r: 2 / 3, pivot: 3 / 2, n: nm('Tempo ×2/3', 'טמפו פי 2/3', 'two thirds', 'dotted quarter') },
  dn34: { r: 3 / 4, pivot: 4 / 3, n: nm('Tempo ×3/4', 'טמפו פי 3/4', 'three quarters') },
};
TOPIC_GEN['prog-meter'] = {
  title: { en: 'Prog & odd-time grooves', he: 'גרוב פרוג ומשקלים מורכבים' },
  skill: 'meter',
  levels: [
    { en: '5/4: 3+2 or 2+3?', he: '5/4: ‏3+2 או 2+3?' },
    { en: 'How is the 9/8 grouped?', he: 'איך מחולק ה־9/8?' },
    { en: 'How is the 11/8 grouped?', he: 'איך מחולק ה־11/8?' },
    { en: 'Polymeter: how long is the riff?', he: 'פולימטר: כמה ארוך הריף?' },
    { en: 'Metric modulation: how did the pulse change?', he: 'מודולציה מטרית: איך השתנתה הפעמה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level <= 3) {
      const pool = level === 1 ? ['q32', 'q23'] : level === 2 ? ['n2223', 'n333', 'n3222'] : ['e3332', 'e22322', 'e443'];
      const ans = pickR(rnd, pool);
      const step = level === 1 ? 0.4 : 0.165;
      const st = (k: string, bars: number) => [eventsStim(groupsBeat(GROUPS[k].g, step, bars), bars * GROUPS[k].g.reduce((a, b) => a + b, 0) * step + 0.2)];
      const names: Names = {};
      for (const k of pool) names[k] = GROUPS[k].n;
      return choiceQ({
        id, topic: 'prog-meter', level, seed, skill: 'meter', difficulty: [1450, 1550, 1650][level - 1],
        ask: { en: 'How is the bar grouped?', he: 'איך התיבה מחולקת?' }, names, answer: ans, choices: shuffleR(rnd, pool.slice()), stimulus: st(ans, 4), choiceStim: Object.fromEntries(pool.map((k) => [k, st(k, 2)])),
      });
    }
    if (level === 4) {
      // A bass riff of n beats loops over a 4/4 kit groove for four bars; the downbeats drift and realign.
      const n = pickR(rnd, [3, 5, 7]);
      const q = 0.36;
      const root = 33 + pickR(rnd, [0, 2, 4, 5]);
      const shape = shuffleR(rnd, [0, 7, 10, 12, 5, 3, 7]).slice(0, n - 1);
      const riff = [0, ...shape];
      const ev: NoteEvent[] = [];
      for (let b = 0; b < 16; b++) {
        ev.push({ midi: 60, start: b * q, duration: 0.1, velocity: b % 4 === 0 ? 0.95 : 0.55, perc: b % 2 === 0 ? 'kick' : 'snare' });
        ev.push({ midi: 60, start: b * q, duration: 0.04, velocity: 0.4, perc: 'hat' }, { midi: 60, start: (b + 0.5) * q, duration: 0.04, velocity: 0.28, perc: 'hat' });
        ev.push({ midi: root + riff[b % n], start: b * q, duration: q * 0.85, velocity: b % n === 0 ? 0.82 : 0.6, inst: 'bass' });
      }
      const names: Names = { '3': nm('3 beats', '3 פעמות', 'three'), '5': nm('5 beats', '5 פעמות', 'five'), '7': nm('7 beats', '7 פעמות', 'seven') };
      return choiceQ({ id, topic: 'prog-meter', level, seed, skill: 'meter', difficulty: 1700, ask: { en: 'The kit is in 4. How long is the riff?', he: 'התופים ב־4. כמה ארוך הריף?' }, names, answer: String(n), choices: ['3', '5', '7'], stimulus: [eventsStim(ev, 16 * q + 0.3)] });
    }
    // Level 5: metric modulation — the old pulse with its pivot subdivision on the hat, then the new pulse.
    const keys = Object.keys(RATIO);
    const ans = pickR(rnd, keys);
    const st = (k: string) => {
      const { r, pivot } = RATIO[k];
      const q0 = 60 / pickR(rng(seed + 1), [84, 92, 100]);
      const q1 = q0 / r;
      const ev: NoteEvent[] = [];
      for (let b = 0; b < 8; b++) ev.push({ midi: 60, start: b * q0, duration: 0.1, velocity: b % 4 === 0 ? 0.9 : 0.6, perc: b % 4 === 0 ? 'kick' : 'rim' });
      for (let p = 0; p * pivot < 8 - 1e-6; p++) ev.push({ midi: 60, start: p * pivot * q0, duration: 0.04, velocity: 0.45, perc: 'hat' });
      const t1 = 8 * q0;
      for (let b = 0; b < 8; b++) {
        ev.push({ midi: 60, start: t1 + b * q1, duration: 0.1, velocity: b % 4 === 0 ? 0.9 : 0.6, perc: b % 4 === 0 ? 'kick' : 'rim' });
        ev.push({ midi: 60, start: t1 + b * q1, duration: 0.04, velocity: 0.45, perc: 'hat' });
      }
      return [eventsStim(ev, t1 + 8 * q1 + 0.3)];
    };
    const names: Names = {};
    for (const k of keys) names[k] = RATIO[k].n;
    return choiceQ({ id, topic: 'prog-meter', level, seed, skill: 'meter', difficulty: 1800, ask: { en: 'Two bars, then a new pulse. How did it change?', he: 'שתי תיבות, ואז פעמה חדשה. איך היא השתנתה?' }, names, answer: ans, choices: keys, stimulus: st(ans), choiceStim: Object.fromEntries(keys.map((k) => [k, st(k)])) });
  },
};
TOPIC_TAGS['prog-meter'] = (l) => (l === 4 ? tg(['meter', 'odd', 0.6], ['rhythm-dictation', 'poly', 0.4]) : l === 5 ? tg(['meter', 'odd', 0.6], ['tempo', 'compare', 0.4]) : tg(['meter', 'odd', 0.8], ['rhythm-dictation', 'dictate', 0.2]));

// ================================================================ jazz-changes (Jazz & improv)

type Prog = { ch: [number, JQId, number][]; n: ReturnType<typeof nm> };
const P = (n: ReturnType<typeof nm>, ...ch: [number, JQId, number][]): Prog => ({ ch, n });
const CHANGES: Record<string, Prog>[] = [
  {
    maj: P(nm('Major ii–V–I', 'ii–V–I מז׳ורי', 'major'), [2, 'm9', 2], [7, 'thirteen', 2], [0, 'maj9', 4]),
    min: P(nm('Minor ii–V–i', 'ii–V–i מינורי', 'minor'), [2, 'm7b5', 2], [7, 'b9', 2], [0, 'm69', 4]),
  },
  {
    iiv: P(nm('ii–V–I', 'ii–V–I', 'two five one'), [2, 'm9', 2], [7, 'nine', 2], [0, 'maj9', 4]),
    tri: P(nm('Tritone sub (ii–♭II7–I)', 'תחליף טריטון', 'tritone'), [2, 'm9', 2], [1, 's11', 2], [0, 'maj9', 4]),
    back: P(nm('Backdoor (iv–♭VII7–I)', 'דלת אחורית', 'backdoor'), [5, 'm9', 2], [10, 'nine', 2], [0, 'maj9', 4]),
  },
  {
    // ii–V–I, then the next ii–V: where does it point?
    toIV: P(nm('To IV', 'אל IV', 'four'), [2, 'm9', 2], [7, 'nine', 2], [0, 'maj9', 4], [7, 'm9', 2], [0, 'nine', 2], [5, 'maj9', 4]),
    tovi: P(nm('To vi (minor)', 'אל vi (מינורי)', 'six', 'relative minor'), [2, 'm9', 2], [7, 'nine', 2], [0, 'maj9', 4], [11, 'm7b5', 2], [4, 'b9', 2], [9, 'm69', 4]),
    down2: P(nm('A whole step down', 'טון שלם למטה', 'whole step down'), [2, 'm9', 2], [7, 'nine', 2], [0, 'maj9', 4], [0, 'm9', 2], [5, 'nine', 2], [10, 'maj9', 4]),
    upm3: P(nm('Up a minor 3rd', 'טרצה קטנה למעלה', 'minor third up'), [2, 'm9', 2], [7, 'nine', 2], [0, 'maj9', 4], [5, 'm9', 2], [10, 'nine', 2], [3, 'maj9', 4]),
  },
  {
    // Imaj7 – X – Imaj7: a chord borrowed from the parallel minor
    ivm6: P(nm('iv m6', 'iv m6', 'minor four'), [0, 'maj9', 4], [5, 'm6', 4], [0, 'maj9', 4]),
    bVI: P(nm('♭VImaj7', '♭VImaj7', 'flat six'), [0, 'maj9', 4], [8, 'maj7', 4], [0, 'maj9', 4]),
    bVII: P(nm('♭VII7', '♭VII7', 'flat seven'), [0, 'maj9', 4], [10, 'nine', 4], [0, 'maj9', 4]),
    bIII: P(nm('♭IIImaj7', '♭IIImaj7', 'flat three'), [0, 'maj9', 4], [3, 'maj7', 4], [0, 'maj9', 4]),
    iiø: P(nm('iiø7', 'iiø7', 'half diminished two'), [0, 'maj9', 4], [2, 'm7b5', 4], [0, 'maj9', 4]),
  },
  {
    colt: P(nm('Coltrane changes', 'שינויי קולטריין', 'coltrane', 'giant steps'), [0, 'maj7', 2], [3, 'dom7', 2], [8, 'maj7', 2], [11, 'dom7', 2], [4, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]),
    iivi: P(nm('ii–Vs in one key', 'ii–V בסולם אחד', 'one key'), [0, 'maj7', 2], [9, 'm7', 2], [2, 'm7', 2], [7, 'dom7', 2], [4, 'm7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4]),
    chrom: P(nm('Dominants falling by half steps', 'דומיננטים יורדים בחצאי טונים', 'chromatic', 'tritone chain'), [0, 'maj7', 2], [6, 'dom7', 2], [5, 'dom7', 2], [4, 'dom7', 2], [3, 'dom7', 2], [2, 'dom7', 2], [1, 'dom7', 2], [0, 'maj7', 4]),
    cycle: P(nm('Dominants around the cycle of 5ths', 'דומיננטים במעגל הקווינטות', 'cycle', 'dominant cycle'), [0, 'maj7', 2], [11, 'dom7', 2], [4, 'dom7', 2], [9, 'dom7', 2], [2, 'dom7', 2], [7, 'dom7', 2], [0, 'maj7', 4]),
  },
];
const progStim = (p: Prog, key: number, bpm: number) => [prog(p.ch.map(([d, q, b]) => J(key + d, q, b)), bpm)];
TOPIC_GEN['jazz-changes'] = {
  title: { en: 'What the changes do', he: 'מה המהלך עושה' },
  skill: 'cadences',
  levels: [
    { en: 'Major or minor ii–V?', he: 'ii–V מז׳ורי או מינורי?' },
    { en: 'ii–V, tritone sub or backdoor?', he: 'ii–V, תחליף טריטון או דלת אחורית?' },
    { en: 'Where does the next ii–V go?', he: 'לאן הולך ה־ii–V הבא?' },
    { en: 'Modal interchange: which borrowed chord?', he: 'שאילה מודלית: איזה אקורד שאול?' },
    { en: 'Coltrane changes, chains and cycles', he: 'שינויי קולטריין, שרשראות ומעגלים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    const set = CHANGES[level - 1];
    const keys = Object.keys(set);
    const ans = pickR(rnd, keys);
    const choices = keys.length > 4 ? fromPool(rnd, keys, ans) : shuffleR(rnd, keys.slice());
    const bpm = level === 5 ? 168 : 132;
    const names: Names = {};
    for (const k of choices) names[k] = set[k].n;
    return choiceQ({
      id, topic: 'jazz-changes', level, seed, skill: 'cadences', difficulty: [1300, 1420, 1540, 1620, 1760][level - 1],
      ask: level === 3 ? { en: 'Where does the second ii–V lead?', he: 'לאן מוביל ה־ii–V השני?' } : level === 4 ? { en: 'Which borrowed chord?', he: 'איזה אקורד שאול?' } : { en: 'What are the changes?', he: 'מה המהלך?' },
      names, answer: ans, choices, stimulus: progStim(set[ans], key, bpm), choiceStim: Object.fromEntries(choices.map((k) => [k, progStim(set[k], key, bpm)])),
    });
  },
};
TOPIC_TAGS['jazz-changes'] = tg(['cadences', 'progression', 0.7], ['chords', 'seventh', 0.3]);

// ================================================================ reharm-spot (Jazz & improv)

const BASE: [number, JQId, number][] = [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 4]];
const REHARM: Record<string, { ch: [number, JQId, number][]; n: ReturnType<typeof nm> }> = {
  tritone: { ch: [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [1, 'dom7', 4], [0, 'maj7', 4]], n: nm('Tritone sub (V7 → ♭II7)', 'תחליף טריטון', 'tritone', 'tritone sub') },
  secdom: { ch: [[0, 'maj7', 4], [9, 'dom7', 4], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 4]], n: nm('Secondary dominant (vi7 → VI7)', 'דומיננטה משנית', 'secondary dominant') },
  backdoor: { ch: [[0, 'maj7', 4], [9, 'm7', 4], [5, 'm7', 4], [10, 'dom7', 4], [0, 'maj7', 4]], n: nm('Backdoor (iv7–♭VII7)', 'דלת אחורית', 'backdoor') },
  dimpass: { ch: [[0, 'maj7', 4], [1, 'dim7', 4], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 4]], n: nm('Diminished passing chord (♯I°7)', 'אקורד מעבר מוקטן', 'diminished', 'passing') },
  coltrane: { ch: [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 2], [3, 'dom7', 2], [8, 'maj7', 2], [11, 'dom7', 2], [4, 'maj7', 2], [7, 'dom7', 2], [0, 'maj7', 4]], n: nm('Coltrane substitution', 'תחליף קולטריין', 'coltrane') },
};
const REHARM_LEVELS = [['tritone', 'secdom'], ['tritone', 'secdom', 'backdoor'], ['tritone', 'secdom', 'backdoor', 'dimpass'], ['tritone', 'secdom', 'backdoor', 'dimpass', 'coltrane']];
TOPIC_GEN['reharm-spot'] = {
  title: { en: 'Spot the reharmonization', he: 'לזהות את הרה־הרמוניזציה' },
  skill: 'cadences',
  levels: [
    { en: 'Tritone sub or secondary dominant?', he: 'תחליף טריטון או דומיננטה משנית?' },
    { en: '… or the backdoor', he: '… או דלת אחורית' },
    { en: '… or a diminished passing chord', he: '… או אקורד מעבר מוקטן' },
    { en: '… or a Coltrane substitution', he: '… או תחליף קולטריין' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    const pool = REHARM_LEVELS[level - 1];
    const ans = pickR(rnd, pool);
    const choices = pool.length > 4 ? fromPool(rnd, pool, ans) : shuffleR(rnd, pool.slice());
    const st = (k: string) => [prog(BASE.map(([d, q, b]) => J(key + d, q, b)), 152), rest(0.6), prog(REHARM[k].ch.map(([d, q, b]) => J(key + d, q, b)), 152)];
    const names: Names = {};
    for (const k of choices) names[k] = REHARM[k].n;
    return choiceQ({
      id, topic: 'reharm-spot', level, seed, skill: 'cadences', difficulty: [1380, 1480, 1580, 1720][level - 1],
      ask: { en: 'The tune, then reharmonized. How?', he: 'המהלך, ואז ברה־הרמוניזציה. איך?' }, names, answer: ans, choices, stimulus: st(ans),
      // auditions: only the new version (the original is the same every time)
      choiceStim: Object.fromEntries(choices.map((k) => [k, [prog(REHARM[k].ch.map(([d, q, b]) => J(key + d, q, b)), 152)]])),
    });
  },
};
TOPIC_TAGS['reharm-spot'] = tg(['cadences', 'reharm', 0.7], ['chords', 'seventh', 0.3]);

// ================================================================ guide-line (Jazz & improv)

const GUIDE: [number, JQId][][] = [
  [[2, 'm7'], [7, 'dom7'], [0, 'maj7']],
  [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, 'dom7'], [0, 'maj7']],
  [[2, 'm7'], [7, 'dom7'], [0, 'maj7'], [5, 'maj7'], [11, 'm7b5'], [4, 'dom7'], [9, 'm6']],
];
const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LET_PC = [0, 2, 4, 5, 7, 9, 11];
const LET_HE = ['דו', 'רה', 'מי', 'פה', 'סול', 'לה', 'סי'];
const ACC_EN: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
const ACC_HE: Record<number, string> = { [-2]: ' במול כפול', [-1]: ' במול', 0: '', 1: ' דיאז', 2: ' דיאז כפול' };
/** Letter steps of a chord member by its size in semitones (root, 3rd, 5th, 6th, 7th). */
const STEPS: Record<number, number> = { 0: 0, 3: 2, 4: 2, 6: 4, 7: 4, 8: 4, 9: 5, 10: 6, 11: 6 };
/** A chord member spelled from its root (the root as the key writes it). */
export function spellAbove(rootPc: number, key: number, semis: number, he = false): string {
  const rootName = pcNameKey(rootPc, key);
  const letter = (LET.indexOf(rootName[0]) + (STEPS[semis] ?? 0)) % 7;
  const acc = mod12(rootPc + semis - LET_PC[letter] + 6) - 6;
  return he ? LET_HE[letter] + ACC_HE[acc] : LET[letter] + ACC_EN[acc];
}
const third = (q: JQId) => JQ[q].up[0];
const seventh = (q: JQId) => (q === 'm6' ? 9 : q === 'dim7' ? 9 : JQ[q].up.find((x) => x >= 9 && x <= 11) ?? 10);
/** The guide-tone line: from the 3rd or 7th of chord 1, each next note the nearest 3rd or 7th of the next chord. */
export function guideLine(chords: [number, JQId][], key: number, startOnSeventh: boolean): number[] {
  const [d0, q0] = chords[0];
  let m = 60 + mod12(key + d0 + (startOnSeventh ? seventh(q0) : third(q0)));
  if (m < 64) m += 12;
  const out = [m];
  for (const [d, q] of chords.slice(1)) {
    const pcs = [mod12(key + d + third(q)), mod12(key + d + seventh(q))];
    const cands: number[] = [];
    for (const p of pcs) for (let x = 58; x <= 80; x++) if (mod12(x) === p) cands.push(x);
    // nearest; a tie goes down (the line falls by half steps and common tones)
    cands.sort((a, b) => Math.abs(a - m) - Math.abs(b - m) || a - b);
    m = cands[0];
    out.push(m);
  }
  return out;
}
TOPIC_GEN['guide-line'] = {
  title: { en: 'Write the guide-tone line', he: 'לכתוב את קו הצלילים המנחים' },
  skill: 'sequences',
  levels: [
    { en: 'ii–V–I', he: 'ii–V–I' },
    { en: 'I–vi–ii–V–I', he: 'I–vi–ii–V–I' },
    { en: 'Seven chords around the cycle', he: 'שבעה אקורדים במעגל' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = pickR(rnd, [0, 5, 10, 3, 7]);
    const chords = GUIDE[level - 1];
    const fromSeventh = rnd() < 0.5;
    const right = guideLine(chords, key, fromSeventh);
    const other = guideLine(chords, key, !fromSeventh);
    // A line with one wrong note: the root or the 5th of a chord instead of its guide tone.
    const slip = (base: number[]) => {
      const out = base.slice();
      const i = 1 + Math.floor(rnd() * (out.length - 1));
      const [d] = chords[i];
      const alt = [mod12(key + d), mod12(key + d + 7)].map((p) => out[i] - 6 + mod12(p - (out[i] - 6)));
      out[i] = pickR(rnd, alt);
      return out;
    };
    // Each note spelled from its own chord (in C: E7's 3rd is G♯, Am6's 6th is F♯).
    const label = (ms: number[], he = false) => ms.map((m, i) => spellAbove(key + chords[i][0], key, mod12(m - key - chords[i][0]), he)).join(' – ');
    const opts: number[][] = [right, other];
    for (let k = 0; k < 12 && opts.length < 4; k++) {
      const s = slip(k % 2 ? other : right);
      if (!opts.some((o) => label(o) === label(s))) opts.push(s);
    }
    const order = shuffleR(rnd, opts.map((_, i) => i));
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    // Bass, a soft 5th + 9th under the line (no guide tones doubled), and the line on top.
    const play = (line: number[]) => [prog(chords.map(([d, q]) => J(key + d, q, 4)), 140, { top: line, voicings: chords.map(([d, q]) => upper(key + d, [q === 'm7b5' ? 6 : 7, 14], 54)) })];
    order.forEach((i, k) => {
      names[`g${k}`] = nm(label(opts[i]), label(opts[i], true));
      choiceStim[`g${k}`] = play(opts[i]);
    });
    const ansKey = `g${order.indexOf(0)}`;
    const symbols = chords.map(([d, q]) => sym(key + d, q, key)).join('  ');
    return choiceQ({
      id, topic: 'guide-line', level, seed, skill: 'sequences', difficulty: [1450, 1560, 1680][level - 1],
      ask: { en: 'Which guide-tone line is on top?', he: 'איזה קו צלילים מנחים למעלה?' }, text: { en: symbols, he: symbols },
      names, answer: ansKey, choices: order.map((_, k) => `g${k}`), stimulus: play(right), choiceStim,
    });
  },
};
TOPIC_TAGS['guide-line'] = tg(['sequences', 'lines', 0.6], ['dictation', 'melodic', 0.4]);

// ================================================================ jazz-phrase (Jazz & improv)

/** Degree names above a chord root (semitones), with the chromatic approach tones as jazz players name them. */
const DEG = ['1', '♭2', '2', '♯2', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
const DEG_MIN = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
const SCALE: Record<'maj7' | 'm7' | 'dom7', number[]> = { maj7: [0, 2, 4, 5, 7, 9, 11], m7: [0, 2, 3, 5, 7, 9, 10], dom7: [0, 2, 4, 5, 7, 9, 10] };
const TONES: Record<'maj7' | 'm7' | 'dom7', number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], dom7: [0, 4, 7, 10] };
/** Swung eighths over the chord (bass + voicing on 1), the phrase in the middle register. */
function phraseStim(pc: number, q: 'maj7' | 'm7' | 'dom7', semis: number[], bpm = 132): Stimulus {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = comp([J(pc, q, 2 + Math.ceil(semis.length / 2))], bpm, { hold: true });
  const base = 60 + mod12(pc - 60) + (mod12(pc) > 5 ? -12 : 0);
  semis.forEach((s, i) => {
    const at = (Math.floor(i / 2) + (i % 2 ? 2 / 3 : 0)) * beat + beat;
    ev.push({ midi: base + 12 + s, start: at, duration: beat * (i === semis.length - 1 ? 1.4 : 0.55), velocity: i % 2 ? 0.62 : 0.78 });
  });
  return eventsStim(ev, (2 + Math.ceil(semis.length / 2)) * beat + 0.5);
}
/** Semitones (may exceed an octave or go below 0) as degree names. */
const degLabel = (semis: number[], q: 'maj7' | 'm7' | 'dom7') => semis.map((s) => (q === 'm7' ? DEG_MIN : DEG)[mod12(s)]).join(' ');
TOPIC_GEN['jazz-phrase'] = {
  title: { en: 'Transcribe the phrase', he: 'לתמלל את הפראזה' },
  skill: 'dictation',
  levels: [
    { en: 'Arpeggios: four chord tones', he: 'ארפג׳ים: ארבעה צלילי אקורד' },
    { en: 'Lines over a dominant', he: 'קווים מעל דומיננט' },
    { en: 'Enclosures', he: 'הקפות (אנקלוז׳ר)' },
    { en: 'Bebop lines (the passing half step)', he: 'קווי ביבופ (חצי הטון המעביר)' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pc = pickR(rnd, [0, 2, 3, 5, 7, 8, 10]);
    const q: 'maj7' | 'm7' | 'dom7' = level === 1 ? pickR(rnd, ['maj7', 'm7', 'dom7'] as const) : 'dom7';
    let right: number[];
    let others: number[][];
    if (level === 1) {
      const T = TONES[q];
      const start = Math.floor(rnd() * 4);
      const up = rnd() < 0.5;
      const run = (s: number, u: boolean) => Array.from({ length: 4 }, (_, i) => {
        const k = u ? s + i : s - i;
        return T[((k % 4) + 4) % 4] + 12 * Math.floor(k / 4);
      });
      right = run(start, up);
      others = [run(start, !up), run((start + 1) % 4, up), run((start + 3) % 4, !up), right.map((x, i) => (i === 2 ? x + (q === 'maj7' ? -1 : 2) : x))];
    } else if (level === 2) {
      const S = SCALE[q];
      // A line of five: steps and thirds, never a repeated note, at least four different notes (no "3 2 3 2 3").
      let idx: number[] = [];
      for (let tries = 0; tries < 30; tries++) {
        let k = pickR(rnd, [0, 2, 4, 6]); // start on a chord tone (1 3 5 ♭7)
        idx = [k];
        for (let i = 1; i < 5; i++) {
          k += pickR(rnd, [-2, -1, -1, 1, 1, 2]);
          idx.push(k);
        }
        if (new Set(idx).size >= 4) break;
      }
      const toS = (ix: number[]) => ix.map((x) => S[((x % 7) + 7) % 7] + 12 * Math.floor(x / 7));
      right = toS(idx);
      const bends: number[][] = [];
      for (const j of [1, 2, 3, 4])
        for (const d of [1, -1]) {
          const v = idx[j] + d;
          if (v !== idx[j - 1] && v !== idx[j + 1]) bends.push(toS(idx.map((x, i) => (i === j ? v : x))));
        }
      others = shuffleR(rnd, bends);
    } else if (level === 3) {
      // Enclosure: a scale step above, a half step below, then the target chord tone (3, 5 or 1 of the dominant).
      const target = pickR(rnd, [4, 7, 12]);
      const above = target === 4 ? 5 : target === 7 ? 9 : 14;
      // two lead-in notes that don't already sound the note above the target
      const lead = pickR(rnd, [[0, 2], [7, 5], [10, 9]].filter((l) => mod12(l[1]) !== mod12(above)));
      right = [...lead, above, target - 1, target];
      others = [
        [...lead, target - 1, above, target], // below first
        [...lead, above, target - 2, target], // whole step below
        [...lead, above + 1, target - 1, target], // chromatic above
        [...lead, above, target + 1, target],
      ];
    } else {
      // Bebop dominant, descending from a chord tone on the beat: the half step between 1 and ♭7 keeps chord tones on beats.
      const BEBOP = [12, 11, 10, 9, 7, 5, 4, 2, 0, -1, -2, -3, -5, -7, -8, -10];
      const MIXO = [12, 10, 9, 7, 5, 4, 2, 0, -2, -3, -5, -7, -8, -10];
      // the same descent with the passing half step in the wrong place (between 6 and 5)
      const LATE = [12, 10, 9, 8, 7, 5, 4, 2, 0, -2, -3, -4, -5, -7, -8, -10];
      const from = pickR(rnd, [12, 7, 4]);
      const slice8 = (xs: number[], f: number) => xs.slice(xs.indexOf(f), xs.indexOf(f) + 8);
      right = slice8(BEBOP, from);
      others = [slice8(MIXO, from), slice8(LATE, from), slice8(BEBOP, from === 12 ? 10 : 9)];
    }
    const lab = (s: number[]) => degLabel(s, q);
    const opts: number[][] = [right];
    for (const o of others) if (opts.length < 4 && !opts.some((x) => lab(x) === lab(o))) opts.push(o);
    const order = shuffleR(rnd, opts.map((_, i) => i));
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    order.forEach((i, k) => {
      names[`p${k}`] = nm(lab(opts[i]), lab(opts[i]));
      choiceStim[`p${k}`] = [phraseStim(pc, q, opts[i])];
    });
    const chordSym = `${pcName(pc)}${q === 'maj7' ? 'maj7' : q === 'm7' ? 'm7' : '7'}`;
    return choiceQ({
      id, topic: 'jazz-phrase', level, seed, skill: 'dictation', difficulty: [1380, 1480, 1580, 1680][level - 1],
      ask: { en: `Over ${chordSym}: which degrees?`, he: `מעל ${chordSym}: אילו דרגות?` },
      names, answer: `p${order.indexOf(0)}`, choices: order.map((_, k) => `p${k}`), stimulus: [phraseStim(pc, q, right)], choiceStim,
    });
  },
};
TOPIC_TAGS['jazz-phrase'] = (l) => (l === 1 ? tg(['dictation', 'melodic', 0.6], ['chords', 'seventh', 0.4]) : tg(['dictation', 'melodic', 0.6], ['sequences', 'lines', 0.4]));

// ================================================================ jazz-form (Jazz & improv)

const BL = (c: [number, JQId][]) => c.map(([d, q]) => [d, q, 4] as [number, JQId, number]);
const FORMS: Record<string, { ch: [number, JQId, number][]; n: ReturnType<typeof nm> }> = {
  major: { ch: BL([[0, 'dom7'], [5, 'dom7'], [0, 'dom7'], [0, 'dom7'], [5, 'dom7'], [5, 'dom7'], [0, 'dom7'], [0, 'dom7'], [7, 'dom7'], [5, 'dom7'], [0, 'dom7'], [7, 'dom7']]), n: nm('Major blues', 'בלוז מז׳ורי', 'major blues') },
  minor: { ch: BL([[0, 'm7'], [0, 'm7'], [0, 'm7'], [0, 'm7'], [5, 'm7'], [5, 'm7'], [0, 'm7'], [0, 'm7'], [8, 'dom7'], [7, 'b9'], [0, 'm7'], [7, 'b9']]), n: nm('Minor blues', 'בלוז מינורי', 'minor blues') },
  jazz: {
    ch: [...BL([[0, 'dom7'], [5, 'dom7'], [0, 'dom7']]), [7, 'm7', 2], [0, 'dom7', 2], ...BL([[5, 'dom7'], [6, 'dim7'], [0, 'dom7'], [9, 'dom7'], [2, 'm7'], [7, 'dom7']]), [0, 'dom7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2]],
    n: nm('Jazz blues (with ii–Vs)', 'בלוז ג׳אז (עם ii–V)', 'jazz blues'),
  },
  bird: {
    ch: [[0, 'maj7', 4], [11, 'm7b5', 2], [4, 'dom7', 2], [9, 'm7', 2], [2, 'dom7', 2], [7, 'm7', 2], [0, 'dom7', 2], [5, 'dom7', 4], [5, 'm7', 2], [10, 'dom7', 2], [4, 'm7', 2], [9, 'dom7', 2], [3, 'm7', 2], [8, 'dom7', 2], [2, 'm7', 4], [7, 'dom7', 4], [0, 'maj7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2]],
    n: nm('Bird blues (Parker changes)', 'בלוז של בירד (מהלכי פארקר)', 'bird blues', 'parker'),
  },
  rcA: { ch: [[0, 'maj7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'dom7', 2], [0, 'dom7', 2], [5, 'maj7', 2], [6, 'dim7', 2], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2]], n: nm('An A section', 'חלק A', 'a', 'a section') },
  rcB: { ch: BL([[4, 'dom7'], [4, 'dom7'], [9, 'dom7'], [9, 'dom7'], [2, 'dom7'], [2, 'dom7'], [7, 'dom7'], [7, 'dom7']]), n: nm('The bridge (III7–VI7–II7–V7)', 'הגשר', 'bridge', 'b') },
};
TOPIC_GEN['jazz-form'] = {
  title: { en: 'Jazz forms', he: 'צורות בג׳אז' },
  skill: 'form',
  levels: [
    { en: 'Major or minor blues?', he: 'בלוז מז׳ורי או מינורי?' },
    { en: 'Rhythm changes: an A or the bridge?', he: 'ריתם צ׳יינג׳ס: A או הגשר?' },
    { en: 'Which blues: major, jazz or Bird?', he: 'איזה בלוז: מז׳ורי, ג׳אז או בירד?' },
    { en: 'A whole 32-bar AABA: where are we at the bell?', he: 'AABA שלם של 32 תיבות: איפה אנחנו בפעמון?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level === 4) return aabaItem(rnd, seed, id);
    const key = pickR(rnd, [0, 3, 5, 7, 10]);
    const pool = level === 1 ? ['major', 'minor'] : level === 2 ? ['rcA', 'rcB'] : ['major', 'jazz', 'bird'];
    const ans = pickR(rnd, pool);
    const bpm = level === 2 ? 200 : 184;
    const st = (k: string) => [prog(FORMS[k].ch.map(([d, q, b]) => J(key + d, q, b)), bpm)];
    const names: Names = {};
    for (const k of pool) names[k] = FORMS[k].n;
    return choiceQ({
      id, topic: 'jazz-form', level, seed, skill: 'form', difficulty: [1350, 1450, 1600][level - 1],
      ask: level === 2 ? { en: 'Rhythm changes: which part?', he: 'ריתם צ׳יינג׳ס: איזה חלק?' } : { en: 'Which blues?', he: 'איזה בלוז?' },
      names, answer: ans, choices: shuffleR(rnd, pool.slice()), stimulus: st(ans),
    });
  },
};
TOPIC_TAGS['jazz-form'] = tg(['form', 'song', 0.7], ['cadences', 'progression', 0.3]);

/**
 * Two 32-bar AABA forms (bars as degree / quality / beats). Each A ends differently, as on the bandstand: the first
 * turns around to the top, the second closes on I into the bridge, the last ends the chorus. The bridge moves away
 * from home (rhythm changes: III7–VI7–II7–V7; the ballad form: to IV and back by a ii–V).
 */
type Bar = [number, JQId, number][];
const RC_A1: Bar = [[0, 'maj7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'dom7', 4], [5, 'maj7', 2], [6, 'dim7', 2], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2]];
const RC_A2: Bar = [...RC_A1.slice(0, 11), [2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4]];
const RC_B: Bar = [[4, 'dom7', 8], [9, 'dom7', 8], [2, 'dom7', 8], [7, 'dom7', 8]];
const BAL_A1: Bar = [[0, 'maj7', 4], [9, 'm7', 4], [2, 'm7', 4], [7, 'dom7', 4], [4, 'm7', 2], [9, 'dom7', 2], [2, 'm7', 2], [7, 'dom7', 2], [0, 'maj7', 4], [2, 'm7', 2], [7, 'dom7', 2]];
const BAL_A2: Bar = [...BAL_A1.slice(0, 8), [0, 'maj7', 8]];
const BAL_B: Bar = [[7, 'm7', 2], [0, 'dom7', 2], [5, 'maj7', 4], [5, 'm7', 2], [10, 'dom7', 2], [0, 'maj7', 4], [4, 'm7b5', 2], [9, 'dom7', 2], [2, 'm7', 4], [2, 'm7', 2], [7, 'dom7', 2], [7, 'dom7', 4]];
export const AABA_FORMS: Record<'rhythm' | 'ballad', { a1: Bar; a2: Bar; b: Bar; a3: Bar; bpm: number }> = {
  rhythm: { a1: RC_A1, a2: RC_A2, b: RC_B, a3: RC_A2, bpm: 216 },
  ballad: { a1: BAL_A1, a2: BAL_A2, b: BAL_B, a3: BAL_A2, bpm: 200 },
};
/** Where the bell rings (the bar it marks, 1-based) for each answer; "mid" is the middle of a section. */
const AABA_AT: Record<'a2' | 'bridge' | 'lastA' | 'mid', number[]> = { a2: [9], bridge: [17], lastA: [25], mid: [5, 13, 21, 29] };
function aabaItem(rnd: () => number, seed: number, id: string) {
  const key = pickR(rnd, [0, 3, 5, 7, 10]);
  const form = pickR(rnd, ['rhythm', 'ballad'] as const);
  const F = AABA_FORMS[form];
  const pool = ['a2', 'bridge', 'lastA', 'mid'] as const;
  const ans = pickR(rnd, pool);
  const bar = pickR(rnd, AABA_AT[ans]);
  const chords = [...F.a1, ...F.a2, ...F.b, ...F.a3].map(([d, q, b]) => J(key + d, q, b));
  const beat = 60 / F.bpm;
  // a melody note on each chord: its 3rd, so the A sections sound alike and the bridge stands apart
  const top = chords.map((c) => 67 + mod12(c.pc + JQ[c.q].up[0] - 67));
  const ev = comp(chords, F.bpm, { top });
  const at = (bar - 1) * 4 * beat;
  ev.push({ midi: 96, start: at, duration: 0.3, velocity: 0.75, perc: 'bell' }, { midi: 96, start: at + 0.16, duration: 0.3, velocity: 0.6, perc: 'bell' });
  const stim = eventsStim(ev, 32 * 4 * beat + 0.5);
  const names: Names = {
    a2: nm('The second A begins', 'מתחיל ה־A השני', 'second a'),
    bridge: nm('The bridge begins', 'מתחיל הגשר', 'bridge', 'b'),
    lastA: nm('The last A returns', 'חוזר ה־A האחרון', 'last a'),
    mid: nm('The middle of a section', 'אמצע של חלק', 'middle'),
  };
  return choiceQ({
    id, topic: 'jazz-form', level: 4, seed, skill: 'form', difficulty: 1700,
    ask: { en: '32 bars, AABA: what happens at the bell?', he: '32 תיבות, AABA: מה קורה בפעמון?' },
    names, answer: ans, choices: [...pool], stimulus: [stim],
  });
}

// ================================================================ for the quick lessons (content/mini/jazzEar.ts)

/** A progression in a key (degrees above the tonic) in the trio texture. */
export const jazzProgStim = (key: number, chords: [number, JQId, number][], bpm = 132): Stimulus => prog(chords.map(([d, q, b]) => J(key + d, q, b)), bpm);
/** A mode over a drone (scale up and down). */
export const modeStim = (tonic: number, mode: keyof typeof MODES, each = 0.3): Stimulus => modal(tonic, MODES[mode].steps, null, each);
/** A kit groove grouped as given (eighths at `step` seconds). */
export const groupStim = (groups: number[], step = 0.165, bars = 2): Stimulus => eventsStim(groupsBeat(groups, step, bars), bars * groups.reduce((a, b) => a + b, 0) * step + 0.2);
/** A phrase (semitones above the chord root) over a chord. */
export const phraseOver = (pc: number, q: 'maj7' | 'm7' | 'dom7', semis: number[]): Stimulus => phraseStim(pc, q, semis);
/** A rootless voicing over its root in the bass (offsets above the root). */
export const rootlessStim = (pc: number, up: number[]): Stimulus => held(pc, upper(pc, up, 60));
/** A ii–V–I in rootless voicings, the ii in A or B. */
export const rootless251Stim = (key: number, startA: boolean): Stimulus => prog([J(key + 2, 'm9', 4), J(key + 7, 'thirteen', 4), J(key, 'maj9', 4)], 112, { voicings: rootless251(key, startA), hold: true });
/** A dominant with an upper-structure triad (3rd and ♭7 below, the triad `at` semitones above the root on top). */
export const ustStim = (pc: number, at: number): Stimulus => held(pc, ustVoicing(pc, at), 2.2);
/** Bars `from`–`to` (1-based, inclusive) of a 32-bar AABA form in the trio texture (no bell). */
export const aabaStim = (key: number, form: keyof typeof AABA_FORMS, from = 1, to = 32): Stimulus => {
  const F = AABA_FORMS[form];
  const out: JChord[] = [];
  let beat = 0;
  for (const [d, q, b] of [...F.a1, ...F.a2, ...F.b, ...F.a3]) {
    const a = Math.max(beat, (from - 1) * 4);
    const z = Math.min(beat + b, to * 4);
    if (z > a) out.push(J(key + d, q, z - a));
    beat += b;
  }
  return prog(out, F.bpm);
};

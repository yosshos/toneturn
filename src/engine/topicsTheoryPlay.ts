// Theory you play — the ear and theory side (docs/AUDIT-CONTENT-THEORY.md §ז.2 TP-1…TP-4), Jazz & improv course:
//   · triad-pairs  — which pair for a chord, which colour by ear (over its chord, over a dominant, over maj7), the scale
//                    tone a pair leaves out
//   · pent-super   — which pentatonic for a colour, its degrees over the chord, inside vs lydian / altered by ear
//   · polychords   — inversion vs upper structure vs sus (C/E, D/C, F/G) on paper and by ear; an upper structure's
//                    chord; natural / lydian dominant / altered by ear; upper structures over maj7 and m7
//   · reharm-own   — name the device; which substitute holds the melody; play the reharm on the keys (any octave):
//                    graded by pitch classes, every voicing that holds the melody and does the job is accepted
// The music is in theoryPlay.ts. Pure and seeded like every topic.

import type { ChoiceQuestion, NoteEvent, PlaceQuestion, Stimulus } from './lesson';
import { placeKey } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, eventsStim, pcName, pcNameHe } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import {
  DEVICE_NAME, LINE_CLICHE, PENTS, TP_SCALES, RQ_SYM, RQ_TONES, SHELL, SLASH_NAME, SLOT_CHORDS, TRIAD_PAIRS, USTS, degName, domColour, hexatonic, holdsMelody, mod12, pairById, pairName, pairTriads, pentDegrees,
  pentName, pentNotes, reharmValid, slashKind, triadOf, voicingSets,
  type Device, type PairId, type PentSuper, type RChord, type TriadPair, type Ust,
} from './theoryPlay';

type Names = ChoiceQuestion['names'];
type Bi = { en: string; he: string };
const KEYS = [0, 2, 3, 5, 7, 8, 10];

// ---------------------------------------------------------------- sound helpers

/** A chord held under a line: bass root, the chord in the middle register, then the line in 8ths above it. */
function lineOver(root: number, chordIvs: number[], line: number[], each = 0.3): Stimulus {
  const bass = 36 + mod12(root);
  const mid = chordIvs.map((x) => 48 + mod12(root) + x).map((m) => (m < 52 ? m + 12 : m));
  const len = 0.7 + line.length * each + 0.8;
  const ev: NoteEvent[] = [{ midi: bass, start: 0, duration: len, velocity: 0.7 }, ...mid.map((m) => ({ midi: m, start: 0, duration: len, velocity: 0.45 }))];
  line.forEach((m, i) => ev.push({ midi: m, start: 0.7 + i * each, duration: i === line.length - 1 ? 0.8 : each * 1.1, velocity: 0.8 }));
  return eventsStim(ev, len);
}
/** Pitch classes as a rising line from about G4. */
function rising(pcs: number[], from = 67): number[] {
  const out: number[] = [];
  let p = from - 1;
  for (const pc of pcs) {
    p++;
    while (mod12(p) !== mod12(pc)) p++;
    out.push(p);
  }
  return out;
}
/** The pair as a line: triad A up, triad B up, A's next inversion, B's next inversion, and down again. */
export function pairLine(p: TriadPair, root: number): number[] {
  const [a, b] = pairTriads(p, root);
  const up = rising([...a, ...b, a[1], a[2], a[0], b[1], b[2], b[0]], 62);
  return [...up, ...up.slice(0, -1).reverse().slice(0, 5)];
}
const CHORD_IVS: Record<string, number[]> = { maj7: [4, 7, 11], m7: [3, 7, 10], '7': [4, 7, 10], '7alt': [4, 10, 15], '7♯11': [4, 10, 18], 'maj7♯11': [4, 11, 18], 'maj7♯5': [4, 8, 11] };
const pairStim = (p: TriadPair, root: number) => lineOver(root, CHORD_IVS[p.chord], pairLine(p, root));
/** A slash chord: bass low, the triad above. */
function slashStim(triRoot: number, minor: boolean, bass: number): Stimulus {
  const b = 36 + mod12(bass);
  const t = rising(triadOf(triRoot, minor), 58);
  return { kind: 'events', events: [{ midi: b, start: 0, duration: 2.2, velocity: 0.75 }, ...t.map((m) => ({ midi: m, start: 0.05, duration: 2.1, velocity: 0.6 }))], length: 2.3 };
}
/** An upper structure: root low, shell in the left hand, the triad on top. */
function ustStim(u: Ust, root: number): Stimulus {
  const r = 36 + mod12(root);
  const shell = SHELL[u.q].slice(1).map((x) => 48 + mod12(root) + x).map((m) => (m < 50 ? m + 12 : m));
  const top = rising(triadOf(root + u.t, u.minor), Math.max(...shell) + 1);
  const ms = [r, ...shell, ...top];
  return { kind: 'events', events: ms.map((m, i) => ({ midi: m, start: i < 3 ? 0 : 0.04, duration: 2.4, velocity: i === 0 ? 0.75 : 0.55 })), length: 2.5 };
}
const nameOf = (pc: number) => pcName(pc);

// ================================================================ triad-pairs (TP-1)

const PAIR_COLOUR = (p: TriadPair): Bi => p.colour;
TOPIC_GEN['triad-pairs'] = {
  title: { en: 'Triad pairs', he: 'זוגות משולשים' },
  skill: 'modes',
  levels: [
    { en: 'Which pair for the chord?', he: 'איזה זוג לאקורד?' },
    { en: 'Which colour? Dorian, lydian, altered', he: 'איזה צבע? דורי, לידי, אלטרד' },
    { en: 'Over a dominant: mixolydian, lydian dominant, altered', he: 'מעל דומיננט: מיקסולידי, לידי דומיננטי, אלטרד' },
    { en: 'Over maj7: lydian or lydian augmented', he: 'מעל maj7: לידי או לידי מוגדל' },
    { en: 'Which scale tone does the pair leave out?', he: 'איזה צליל של הסולם הזוג משמיט?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = pickR(rnd, KEYS);
    const base = { id, topic: 'triad-pairs', level, seed, skill: 'modes' as const, difficulty: [1500, 1540, 1580, 1620, 1660][level - 1] };
    if (level === 1) {
      const pool: PairId[] = ['dorian', 'lydian', 'altered', 'lydian-dom', 'mixolydian'];
      const ans = pickR(rnd, pool);
      const choices = shuffleR(rnd, [ans, ...shuffleR(rnd, pool.filter((x) => x !== ans)).slice(0, 3)]);
      const names: Names = {};
      for (const c of choices) {
        const nm = pairName(pairById(c), root, nameOf);
        names[c] = { en: nm, he: nm };
      }
      const p = pairById(ans);
      return choiceQ({
        ...base,
        ask: { en: `${nameOf(root)}${p.chord}: which pair?`, he: `${nameOf(root)}${p.chord}: איזה זוג?` },
        names, answer: ans, choices, stimulus: [lineOver(root, CHORD_IVS[p.chord], [])],
        choiceStim: Object.fromEntries(choices.map((c) => [c, [lineOver(root, CHORD_IVS[p.chord], pairLine(pairById(c), root))]])),
      });
    }
    const pools: Record<number, PairId[]> = { 2: ['dorian', 'lydian', 'altered'], 3: ['mixolydian', 'lydian-dom', 'altered'], 4: ['lydian', 'lydian-aug'] };
    if (level <= 4) {
      const pool = pools[level];
      const ans = pickR(rnd, pool);
      const names: Names = {};
      for (const c of pool) names[c] = PAIR_COLOUR(pairById(c));
      // Levels 3–4: every choice over the same chord (a dominant / a maj7), so only the pair tells them apart.
      const under = (c: PairId) => (level === 3 ? CHORD_IVS['7'] : level === 4 ? CHORD_IVS.maj7 : CHORD_IVS[pairById(c).chord]);
      const stim = (c: PairId) => lineOver(root, under(c), pairLine(pairById(c), root));
      return choiceQ({ ...base, ask: { en: 'Which colour?', he: 'איזה צבע?' }, names, answer: ans, choices: shuffleR(rnd, pool), stimulus: [stim(ans)], choiceStim: Object.fromEntries(pool.map((c) => [c, [stim(c)]])) });
    }
    // 5: the scale tone the pair leaves out (a degree over the chord).
    const p = pickR(rnd, TRIAD_PAIRS.filter((x) => x.id !== 'lydian-aug'));
    const opts = ['1', '9', '3', '13', '♭7'];
    const ans = degName(p.missing, p.q);
    const choices = shuffleR(rnd, [ans, ...shuffleR(rnd, opts.filter((x) => x !== ans)).slice(0, 3)]);
    const names: Names = Object.fromEntries(choices.map((c) => [c, { en: c, he: c }]));
    const nm = pairName(p, root, nameOf);
    return choiceQ({ ...base, ask: { en: `${nm} over ${nameOf(root)}${p.chord}: which ${TP_SCALES[p.scale].n.en} tone is missing?`, he: `${nm} מעל ${nameOf(root)}${p.chord}: איזה צליל חסר?` }, names, answer: ans, choices, stimulus: [pairStim(p, root)] });
  },
};
TOPIC_TAGS['triad-pairs'] = (l) => (l === 1 || l === 5 ? tg(['modes', 'scales', 0.6], ['chords', 'extension', 0.4]) : tg(['modes', 'scales', 0.5], ['improv', 'vocab', 0.5]));

// ================================================================ pent-super (TP-2)

const pentLine = (p: PentSuper, root: number): number[] => {
  const up = rising([...pentNotes(p, root), ...pentNotes(p, root)], 64);
  return [...up, ...up.slice(0, -1).reverse().slice(0, 4)];
};
const pentStim = (p: PentSuper, root: number) => lineOver(root, CHORD_IVS[p.chord], pentLine(p, root), 0.26);
TOPIC_GEN['pent-super'] = {
  title: { en: 'Pentatonic superimposition', he: 'פנטטוני מוסט' },
  skill: 'modes',
  levels: [
    { en: 'Which pentatonic for the colour?', he: 'איזה פנטטוני לצבע?' },
    { en: 'Its degrees over the chord', he: 'הדרגות שלו מעל האקורד' },
    { en: 'Over maj7: inside or lydian?', he: 'מעל maj7: פנימי או לידי?' },
    { en: 'Inside, lydian, dorian or altered?', he: 'פנימי, לידי, דורי או אלטרד?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = pickR(rnd, KEYS);
    const base = { id, topic: 'pent-super', level, seed, skill: 'modes' as const, difficulty: [1420, 1450, 1500, 1540][level - 1] };
    if (level === 1) {
      const p = pickR(rnd, PENTS);
      const others = shuffleR(rnd, PENTS.filter((x) => x.id !== p.id)).slice(0, 3);
      const choices = shuffleR(rnd, [p, ...others]).map((x) => x.id);
      const names: Names = Object.fromEntries(PENTS.filter((x) => choices.includes(x.id)).map((x) => [x.id, { en: pentName(x, root, nameOf), he: pentName(x, root, pcNameHe, true) }]));
      return choiceQ({
        ...base,
        ask: { en: `${nameOf(root)}${p.chord}, ${p.colour.en.split(':')[0]}: which pentatonic?`, he: `${nameOf(root)}${p.chord}, ${p.colour.he.split(':')[0]}: איזה פנטטוני?` },
        names, answer: p.id, choices, stimulus: [lineOver(root, CHORD_IVS[p.chord], [])],
        choiceStim: Object.fromEntries(choices.map((c) => [c, [lineOver(root, CHORD_IVS[p.chord], pentLine(PENTS.find((x) => x.id === c)!, root), 0.26)]])),
      });
    }
    if (level === 2) {
      const p = pickR(rnd, PENTS);
      const others = shuffleR(rnd, PENTS.filter((x) => x.id !== p.id)).slice(0, 3);
      const choices = shuffleR(rnd, [p, ...others]).map((x) => x.id);
      const names: Names = Object.fromEntries(PENTS.filter((x) => choices.includes(x.id)).map((x) => [x.id, { en: pentDegrees(x).join(' '), he: pentDegrees(x).join(' ') }]));
      return choiceQ({ ...base, ask: { en: `${pentName(p, root, nameOf)} over ${nameOf(root)}${p.chord}: which degrees?`, he: `${pentName(p, root, pcNameHe, true)} מעל ${nameOf(root)}${p.chord}: אילו דרגות?` }, names, answer: p.id, choices, stimulus: [pentStim(p, root)] });
    }
    const pool = level === 3 ? PENTS.filter((x) => x.id === 'inside-maj' || x.id === 'lydian') : PENTS.filter((x) => x.id !== 'inside-dom');
    const p = pickR(rnd, pool);
    const names: Names = Object.fromEntries(pool.map((x) => [x.id, { en: x.colour.en.split(':')[0], he: x.colour.he.split(':')[0] }]));
    return choiceQ({ ...base, ask: { en: 'Which colour?', he: 'איזה צבע?' }, names, answer: p.id, choices: shuffleR(rnd, pool.map((x) => x.id)), stimulus: [pentStim(p, root)], choiceStim: Object.fromEntries(pool.map((x) => [x.id, [pentStim(x, root)]])) });
  },
};
TOPIC_TAGS['pent-super'] = (l) => (l <= 2 ? tg(['modes', 'scales', 0.6], ['improv', 'vocab', 0.4]) : tg(['modes', 'scales', 0.5], ['improv', 'vocab', 0.5]));

// ================================================================ polychords (TP-3)

type SK = 'inversion' | 'lydian' | 'sus';
/** A slash chord of a kind over a bass: its triad root and quality. */
function slashOf(kind: SK, bass: number, rnd: () => number): { t: number; minor: boolean } {
  if (kind === 'lydian') return { t: mod12(bass + 2), minor: false };
  if (kind === 'sus') return { t: mod12(bass - 2), minor: false };
  // inversion: the bass is the triad's 3rd or 5th (a major triad)
  return { t: mod12(bass - (rnd() < 0.5 ? 4 : 7)), minor: false };
}
const DOM_COLOUR_NAME: Record<'natural' | 'lydian-dom' | 'altered', Bi> = {
  natural: { en: 'natural (9, 13)', he: 'טבעי (9, 13)' },
  'lydian-dom': { en: 'lydian dominant (♯11)', he: 'לידי דומיננטי (♯11)' },
  altered: { en: 'altered (♭9, ♯9, ♭13)', he: 'אלטרד (♭9, ♯9, ♭13)' },
};
const triName = (u: Ust, root: number) => `${nameOf(root + u.t)}${u.minor ? 'm' : ''}`;
const qSym = (q: Ust['q']) => (q === '7' ? '7' : q);
TOPIC_GEN.polychords = {
  title: { en: 'Polychords and what they do', he: 'פוליאקורדים ותפקידם' },
  skill: 'chords',
  levels: [
    { en: 'C/E, D/C, F/G: what is it?', he: 'C/E‏, D/C‏, F/G: מה זה?' },
    { en: 'Inversion, upper structure or sus, by ear', he: 'היפוך, מבנה עליון או sus, בשמיעה' },
    { en: 'A triad over a dominant: which chord?', he: 'משולש מעל דומיננט: איזה אקורד?' },
    { en: 'Natural, lydian dominant or altered?', he: 'טבעי, לידי דומיננטי או אלטרד?' },
    { en: 'Upper structures over maj7 and m7', he: 'מבנים עליונים מעל maj7 ו־m7' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const root = pickR(rnd, KEYS);
    const base = { id, topic: 'polychords', level, seed, skill: 'chords' as const, difficulty: [1440, 1500, 1540, 1580, 1600][level - 1] };
    if (level <= 2) {
      const kinds: SK[] = ['inversion', 'lydian', 'sus'];
      const kind = pickR(rnd, kinds);
      const { t, minor } = slashOf(kind, root, rnd);
      const names: Names = Object.fromEntries(kinds.map((k) => [k, SLASH_NAME[k]]));
      const sym = `${nameOf(t)}/${nameOf(root)}`;
      const choiceStim = Object.fromEntries(kinds.map((k) => {
        const s = slashOf(k, root, rng(seed + 1));
        return [k, [slashStim(s.t, s.minor, root)]];
      }));
      if (slashKind(t, minor, root) !== kind) throw new Error('polychord label');
      return choiceQ({ ...base, ask: level === 1 ? { en: `${sym}: what is it?`, he: `${sym}: מה זה?` } : { en: 'Inversion, upper structure or sus?', he: 'היפוך, מבנה עליון או sus?' }, names, answer: kind, choices: kinds, stimulus: [slashStim(t, minor, root)], choiceStim });
    }
    if (level === 3) {
      const pool = USTS.filter((u) => u.q === '7' && ['ii-dom', 'vi-dom', 'biii-dom', 'bv-dom', 'bvi-dom'].includes(u.id));
      const u = pickR(rnd, pool);
      const choices = shuffleR(rnd, [u, ...shuffleR(rnd, pool.filter((x) => x.id !== u.id)).slice(0, 3)]).map((x) => x.id);
      const names: Names = Object.fromEntries(pool.filter((x) => choices.includes(x.id)).map((x) => [x.id, { en: `${nameOf(root)}${x.sym}`, he: `${nameOf(root)}${x.sym}` }]));
      return choiceQ({ ...base, ask: { en: `${triName(u, root)} over ${nameOf(root)}7: which chord?`, he: `${triName(u, root)} מעל ${nameOf(root)}7: איזה אקורד?` }, names, answer: u.id, choices, stimulus: [ustStim(u, root)], choiceStim: Object.fromEntries(choices.map((c) => [c, [ustStim(USTS.find((x) => x.id === c)!, root)]])) });
    }
    if (level === 4) {
      const pool = USTS.filter((u) => ['vm-dom', 'vim-dom', 'ii-dom', 'bvi-dom'].includes(u.id));
      const u = pickR(rnd, pool);
      const cls = domColour(u);
      const keys: ('natural' | 'lydian-dom' | 'altered')[] = ['natural', 'lydian-dom', 'altered'];
      const rep = { natural: USTS.find((x) => x.id === 'vim-dom')!, 'lydian-dom': USTS.find((x) => x.id === 'ii-dom')!, altered: USTS.find((x) => x.id === 'bvi-dom')! };
      return choiceQ({ ...base, ask: { en: 'Which dominant colour?', he: 'איזה צבע דומיננטי?' }, names: Object.fromEntries(keys.map((k) => [k, DOM_COLOUR_NAME[k]])), answer: cls, choices: keys, stimulus: [ustStim(u, root)], choiceStim: Object.fromEntries(keys.map((k) => [k, [ustStim(rep[k], root)]])) });
    }
    // 5: over maj7 and m7.
    const pool = USTS.filter((u) => u.q !== '7');
    const u = pickR(rnd, pool);
    const same = pool.filter((x) => x.q === u.q && x.id !== u.id);
    const choices = shuffleR(rnd, [u, ...shuffleR(rnd, same).slice(0, 3)]).map((x) => x.id);
    const names: Names = Object.fromEntries(pool.filter((x) => choices.includes(x.id)).map((x) => [x.id, { en: `${nameOf(root)}${x.sym}`, he: `${nameOf(root)}${x.sym}` }]));
    return choiceQ({ ...base, ask: { en: `${triName(u, root)} over ${nameOf(root)}${qSym(u.q)}: which chord?`, he: `${triName(u, root)} מעל ${nameOf(root)}${qSym(u.q)}: איזה אקורד?` }, names, answer: u.id, choices, stimulus: [ustStim(u, root)], choiceStim: Object.fromEntries(choices.map((c) => [c, [ustStim(USTS.find((x) => x.id === c)!, root)]])) });
  },
};
TOPIC_TAGS.polychords = (l) => (l <= 2 ? tg(['chords', 'inversion', 0.6], ['theory', 'harmony', 0.4]) : tg(['chords', 'extension', 0.7], ['theory', 'harmony', 0.3]));

// ================================================================ reharm-own (TP-4)

const sym = (tonic: number, c: RChord) => `${nameOf(tonic + c.d)}${RQ_SYM[c.q]}`;
/** Before → after of each device in a key (chord symbols only). */
function deviceCharts(dev: Device, k: number): [string, string] {
  const n = (d: number) => nameOf(k + d);
  switch (dev) {
    case 'tritone':
      return [`${n(2)}m7 ${n(7)}7 | ${n(0)}maj7`, `${n(2)}m7 ${n(1)}7 | ${n(0)}maj7`];
    case 'backdoor':
      return [`${n(2)}m7 ${n(7)}7 | ${n(0)}maj7`, `${n(5)}m7 ${n(10)}7 | ${n(0)}maj7`];
    case 'added-ii':
      return [`${n(0)}maj7 | ${n(7)}7 | ${n(0)}maj7`, `${n(0)}maj7 | ${n(2)}m7 ${n(7)}7 | ${n(0)}maj7`];
    case 'passing-dim':
      return [`${n(0)}maj7 | ${n(2)}m7 ${n(7)}7`, `${n(0)}maj7 ${n(1)}°7 | ${n(2)}m7 ${n(7)}7`];
    case 'line-cliche': {
      const L = LINE_CLICHE.minor.syms;
      return [`${n(0)}m | ${n(0)}m`, `${n(0)}${L[0]} ${n(0)}${L[1]} | ${n(0)}${L[2]} ${n(0)}${L[3]}`];
    }
  }
}
const melHe = (pc: number) => pcNameHe(pc);
function placeQ(p: Omit<PlaceQuestion, 'kind' | 'answer' | 'choices' | 'stimulus' | 'as' | 'match'> & { stimulus?: Stimulus[]; sets: number[][] }): PlaceQuestion {
  const { sets, ...rest } = p;
  const q = { kind: 'place', choices: [], as: 'set', match: 'pc', ...rest, stimulus: p.stimulus ?? [], answer: '' } as PlaceQuestion;
  q.answer = placeKey(q, q.target);
  q.alts = [...new Set(sets.map((s) => placeKey(q, s)))].filter((k) => k !== q.answer);
  return q;
}
/** A held chord with the melody note on top (the sound of an answer). */
function chordWithMelody(pcs: number[], melody: number): Stimulus {
  const mel = 72 + mod12(melody);
  const low = rising(pcs.filter((x) => mod12(x) !== mod12(melody)), 55).filter((m) => m < mel);
  return { kind: 'chord', midis: [...low, mel], duration: 1.8 };
}
TOPIC_GEN['reharm-own'] = {
  title: { en: 'Reharmonise it yourself', he: 'ריהרמנו בעצמכם' },
  skill: 'cadences',
  levels: [
    { en: 'Name the device', he: 'מה הטכניקה?' },
    { en: 'Which substitute holds the melody?', he: 'איזה תחליף מחזיק את המנגינה?' },
    { en: 'Play the tritone sub under the melody', he: 'נגנו את תחליף הטריטון מתחת למנגינה' },
    { en: 'Lead into ii under the melody', he: 'הובילו ל־ii מתחת למנגינה' },
    { en: 'Reharmonise the V your way', he: 'ריהרמנו את ה־V בדרך שלכם' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const k = pickR(rnd, KEYS);
    const difficulty = [1520, 1560, 1600, 1640, 1700][level - 1];
    if (level === 1) {
      const devs: Device[] = ['tritone', 'backdoor', 'added-ii', 'passing-dim', 'line-cliche'];
      const ans = pickR(rnd, devs);
      const choices = shuffleR(rnd, [ans, ...shuffleR(rnd, devs.filter((x) => x !== ans)).slice(0, 3)]);
      const [a, b] = deviceCharts(ans, k);
      return choiceQ({ id, topic: 'reharm-own', level, seed, skill: 'cadences', difficulty, ask: { en: 'Which device?', he: 'איזו טכניקה?' }, text: { en: `${a}  →  ${b}`, he: `${a}  →  ${b}` }, names: Object.fromEntries(choices.map((c) => [c, DEVICE_NAME[c]])), answer: ans, choices, stimulus: [] });
    }
    if (level === 2) {
      // The melody note that exactly one of the two dominant substitutes holds (1, ♭3, ♭5, 6 of the key).
      const mel = pickR(rnd, [0, 3, 6, 9].filter((m) => holdsMelody(1, '7', m) !== holdsMelody(10, '7', m)));
      const cands: { key: string; c: RChord }[] = [
        { key: 'tritone', c: { d: 1, q: '7' } },
        { key: 'backdoor', c: { d: 10, q: '7' } },
        { key: 'ii7', c: { d: 2, q: '7' } },
        { key: 'iii7', c: { d: 4, q: '7' } },
      ];
      const ans = cands.find((x) => reharmValid('dominant', x.c, mel))!.key;
      const choices = shuffleR(rnd, cands.map((x) => x.key));
      const names: Names = Object.fromEntries(cands.map((x) => [x.key, { en: sym(k, x.c), he: sym(k, x.c) }]));
      return choiceQ({
        id, topic: 'reharm-own', level, seed, skill: 'cadences', difficulty,
        ask: { en: `Melody ${nameOf(k + mel)}, ${nameOf(k + 7)}7 → ${nameOf(k)}maj7: which sub holds it?`, he: `מנגינה ${melHe(k + mel)}, ${nameOf(k + 7)}7 → ${nameOf(k)}maj7: איזה תחליף מחזיק אותה?` },
        names, answer: ans, choices, stimulus: [chordWithMelody(RQ_TONES['7'].map((i) => k + 7 + i), k + mel)],
        choiceStim: Object.fromEntries(cands.map((x) => [x.key, [chordWithMelody(RQ_TONES[x.c.q].map((i) => k + x.c.d + i), k + mel)]])),
      });
    }
    const base = { id, topic: 'reharm-own', level, seed, skill: 'cadences' as const, difficulty, surface: 'keys' as const };
    if (level === 3) {
      const c: RChord = { d: 1, q: '7' };
      const mel = pickR(rnd, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11].filter((m) => reharmValid('dominant', c, m)));
      const sets = voicingSets(c, k, mel);
      return placeQ({ ...base, ask: { en: `Melody ${nameOf(k + mel)} over ${nameOf(k + 7)}7: play ${sym(k, c)} holding it.`, he: `מנגינה ${melHe(k + mel)} מעל ${nameOf(k + 7)}7: נגנו ${sym(k, c)} שמחזיק אותה.` }, text: { en: 'Root, 3, 7 + melody (5th optional)', he: 'יסוד, 3, 7 + מנגינה (קווינטה לבחירה)' }, target: sets[0], sets, given: { midis: [72 + mod12(k + mel)], key: null } });
    }
    if (level === 4) {
      const slot = SLOT_CHORDS['into-ii'];
      const mel = pickR(rnd, Array.from({ length: 12 }, (_, i) => i).filter((m) => slot.some((x) => reharmValid('into-ii', x.c, m))));
      const valid = slot.filter((x) => reharmValid('into-ii', x.c, mel));
      const sets = valid.flatMap((x) => voicingSets(x.c, k, mel));
      return placeQ({ ...base, ask: { en: `Melody ${nameOf(k + mel)}: ${nameOf(k)}maj7 → ? → ${nameOf(k + 2)}m7. Play a chord that leads to ${nameOf(k + 2)}m7.`, he: `מנגינה ${melHe(k + mel)}: ${nameOf(k)}maj7 → ? → ${nameOf(k + 2)}m7. נגנו אקורד שמוביל ל־${nameOf(k + 2)}m7.` }, text: { en: '♯I°7, VI7 or ♭III7: root, 3, 7 + melody', he: '‏♯I°7, ‏VI7 או ♭III7: יסוד, 3, 7 + מנגינה' }, target: sets[0], sets, given: { midis: [72 + mod12(k + mel)], key: null } });
    }
    // 5: replace V7 by any dominant that resolves to I and holds the melody (tritone sub or backdoor).
    const subs = SLOT_CHORDS.dominant.filter((x) => x.device !== 'original');
    const mel = pickR(rnd, Array.from({ length: 12 }, (_, i) => i).filter((m) => subs.some((x) => reharmValid('dominant', x.c, m))));
    const sets = subs.filter((x) => reharmValid('dominant', x.c, mel)).flatMap((x) => voicingSets(x.c, k, mel));
    return placeQ({ ...base, ask: { en: `Melody ${nameOf(k + mel)}, ${nameOf(k + 7)}7 → ${nameOf(k)}maj7: replace ${nameOf(k + 7)}7.`, he: `מנגינה ${melHe(k + mel)}, ${nameOf(k + 7)}7 → ${nameOf(k)}maj7: החליפו את ${nameOf(k + 7)}7.` }, text: { en: 'A dominant into I: root, 3, 7 + melody', he: 'דומיננט אל ה־I: יסוד, 3, 7 + מנגינה' }, target: sets[0], sets, given: { midis: [72 + mod12(k + mel)], key: null } });
  },
};
TOPIC_TAGS['reharm-own'] = (l) => (l === 1 ? tg(['cadences', 'reharm', 0.7], ['theory', 'harmony', 0.3]) : tg(['cadences', 'reharm', 0.6], ['chords', 'voicing', 0.4]));

/** Tests and lessons: a pair's stimulus. */
export const pairStimOf = (id: PairId, root: number): Stimulus => pairStim(pairById(id), root);
export { hexatonic };

// AUDIT-SCALES (owner 2026-11-14): Barry Harris borrowing by ear — a 4-note chord of the 6th-diminished scale holds
// while one voice steps away and comes back (oblique motion). Jazz & improv course (pack 'jazz').
//   L1 which voice borrowed (soprano / alto / tenor / bass)?
//   L2 from where — the other chord a step down, the chord above, another diminished, or passing through the scale?
//   L3 which two voices borrowed together?
// The music comes from harmLadder.ts borrowSeq (the same notes the keys and guitar levels play).

import type { NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { borrowSeq, H_SCALES, H_HARRIS, partDEvents, type BKind, type DEv } from './drills/harmLadder';

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const EACH = 0.5;

/** The first chord of a borrowing walk with its moving voice, as sound (a beat = EACH seconds). */
export function borrowStim(key: number, kind: BKind, voice: number, minor = false): Stimulus {
  const sc = H_SCALES[H_HARRIS[minor ? 1 : 0]];
  const seq = borrowSeq(key, sc, kind, voice, 64 + mod12(key - 64));
  const len = kind === 'scale' ? 4 : 3;
  const ev: NoteEvent[] = seq.notes.filter((n) => n.beat < len - 1e-9).map((n) => ({ midi: n.p, start: n.beat * EACH, duration: n.dur * EACH * 0.95, velocity: n.chord ? 0.42 : 0.66 }));
  return eventsStim(ev, len * EACH + 0.4);
}

const VOICES = {
  v0: nm('Soprano', 'סופרן', 'soprano', 'top'),
  v1: nm('Alto', 'אלט', 'alto', 'second'),
  v2: nm('Tenor', 'טנור', 'tenor', 'third'),
  v3: nm('Bass', 'בס', 'bass', 'bottom'),
};
const SOURCES = {
  one: nm('The other chord, a step down', 'האקורד השני, צעד למטה', 'step down', 'diminished'),
  chord: nm('The chord above', 'האקורד שמעל', 'chord above', 'neighbour'),
  out: nm('Another diminished (a half step outside)', 'מוקטן אחר (חצי טון בחוץ)', 'outside', 'other diminished'),
  scale: nm('Passing through the scale', 'מעבר דרך הסולם', 'scale', 'passing'),
};

TOPIC_GEN['bh-borrow'] = {
  title: { en: 'Barry Harris: borrowing', he: 'בארי האריס: השאלה' },
  skill: 'chords',
  levels: [
    { en: 'Which voice borrowed?', he: 'איזה קול שאל?' },
    { en: 'Borrowed from where?', he: 'שאל מאיפה?' },
    { en: 'Which two voices borrowed?', he: 'אילו שני קולות שאלו?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const minor = rnd() < 0.3;
    const base = { id, topic: 'bh-borrow', level, seed, skill: 'chords' as const };
    const sym = `${ROOTS[key]}${minor ? 'm6' : '6'}`;
    if (level === 1) {
      const v = Math.floor(rnd() * 4);
      return choiceQ({
        ...base, difficulty: 1380,
        ask: { en: `${sym}: which voice stepped away and came back?`, he: `${sym}: איזה קול זז וחזר?` },
        text: { en: sym, he: sym },
        names: VOICES, answer: `v${v}`, choices: ['v0', 'v1', 'v2', 'v3'],
        stimulus: [borrowStim(key, 'one', v, minor)],
        choiceStim: Object.fromEntries([0, 1, 2, 3].map((x) => [`v${x}`, [borrowStim(key, 'one', x, minor)]])),
      });
    }
    if (level === 3) {
      // Two voices borrow together: soprano + alto, alto + tenor or tenor + bass.
      const pr = Math.floor(rnd() * 3);
      const PAIRS = {
        p0: nm('Soprano and alto', 'סופרן ואלט', 'soprano and alto', 'top two'),
        p1: nm('Alto and tenor', 'אלט וטנור', 'alto and tenor', 'middle two'),
        p2: nm('Tenor and bass', 'טנור ובס', 'tenor and bass', 'bottom two'),
      };
      return choiceQ({
        ...base, difficulty: 1520,
        ask: { en: `${sym}: which two voices moved together and came back?`, he: `${sym}: אילו שני קולות זזו יחד וחזרו?` },
        text: { en: sym, he: sym },
        names: PAIRS, answer: `p${pr}`, choices: ['p0', 'p1', 'p2'],
        stimulus: [borrowStim(key, 'two', pr, minor)],
        choiceStim: Object.fromEntries([0, 1, 2].map((x) => [`p${x}`, [borrowStim(key, 'two', x, minor)]])),
      });
    }
    // Level 2: the soprano borrows — from the other chord a step down, the chord above, another diminished, or the scale.
    const kinds: BKind[] = ['one', 'chord', 'out', 'scale'];
    const k = pickR(rnd, kinds);
    return choiceQ({
      ...base, difficulty: 1460,
      ask: { en: `${sym}: the top voice borrowed — from where?`, he: `${sym}: הקול העליון שאל — מאיפה?` },
      text: { en: sym, he: sym },
      names: SOURCES, answer: k, choices: shuffleR(rnd, kinds),
      stimulus: [borrowStim(key, k, 0, minor)],
      choiceStim: Object.fromEntries(kinds.map((x) => [x, [borrowStim(key, x, 0, minor)]])),
    });
  },
};
TOPIC_TAGS['bh-borrow'] = tg(['chords', 'barry', 1]);

// ───────────────────────────── eight expressions of one dominant by ear (BARRY-HARRIS-THEORY.md §4, §6.7) ─────────────────────────────
//   L1 over the V: the important minor (natural) or the tritone's minor / the tritone brother (altered)?
//   L2 which family played the V: a brother dominant or a minor 6th?
//   L3 which of the eight did the comp use (four choices)?

const pcs6 = (ints: number[], r: number) => ints.map((x) => mod12(x + r));
/** A close voicing of pcs under a top near `aim`, with a bass note. */
function voiced(pcs: number[], bass: number, aim = 72): number[] {
  let top = aim;
  for (let d = 0; d <= 6; d++) if (pcs.includes(mod12(aim - d))) { top = aim - d; break; }
  const v = [top];
  for (let p = top - 1; v.length < 4; p--) if (pcs.includes(mod12(p))) v.push(p);
  return [bass, ...v.sort((a, b) => a - b)];
}
function chordsStim(chs: number[][], each = 0.9): Stimulus {
  const ev: NoteEvent[] = chs.flatMap((c, i) => c.map((m) => ({ midi: m, start: i * each, duration: each * 0.95, velocity: 0.5 })));
  return eventsStim(ev, chs.length * each + 0.4);
}
const bassIn = (pc: number) => 36 + mod12(pc - 36);

TOPIC_GEN['bh-sixfive'] = {
  // Not "Barry Harris:" — the eight-row table is the app's arrangement of his two ideas (BARRY-HARRIS-THEORY §4).
  title: { en: 'Eight expressions of one dominant', he: 'שמונה ביטויים לדומיננט אחד' },
  skill: 'chords',
  levels: [
    { en: 'Natural or altered over the V?', he: 'טבעי או אלטרד על ה־V?' },
    { en: 'Which family: a dominant or a minor 6th?', he: 'איזו משפחה: דומיננט או מינור 6?' },
    { en: 'Which of the eight did the comp use?', he: 'באיזה מהשמונה השתמש הליווי?' },
    { en: 'On the V: itself, the family, the important minor or the tritone’s minor?', he: 'על ה־V: עצמו, המשפחה, המינור החשוב או המינור של הטריטון?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const V = mod12(key + 7);
    const base = { id, topic: 'bh-sixfive', level, seed, skill: 'chords' as const };
    const I6 = voiced(pcs6([0, 4, 7, 9], key), bassIn(key));
    const v7 = `${ROOTS[V]}7`;
    // the eight expressions (docs/BARRY-HARRIS-THEORY.md §4): the brothers G7 B♭7 D♭7 E7, the m6s Dm6 Fm6 A♭m6 Bm6
    // (Bm6 with the bass on the 6th, as its 9th chord); the others over the V's bass
    const EX = [
      { r: 0, m6: false, bass: 0 },
      { r: 3, m6: false, bass: 0 },
      { r: 6, m6: false, bass: 0 },
      { r: 9, m6: false, bass: 0 },
      { r: 7, m6: true, bass: 0 },
      { r: 10, m6: true, bass: 0 },
      { r: 1, m6: true, bass: 0 },
      { r: 4, m6: true, bass: 9 },
    ];
    const chordOf = (i: number) => voiced(pcs6(EX[i].m6 ? [0, 3, 7, 9] : [0, 4, 7, 10], V + EX[i].r), bassIn(V + EX[i].bass));
    const nameOf = (i: number) => `${ROOTS[mod12(V + EX[i].r)]}${EX[i].m6 ? 'm6' : '7'}`;
    if (level === 1) {
      // natural: the important minor; altered: the tritone's minor or the tritone brother
      const k = pickR(rnd, ['nat', 'alt']);
      const alt = pickR(rnd, [6, 2]);
      const names = { nat: nm('The important minor (9, 13)', 'המינור החשוב (9, 13)', 'important minor', 'natural'), alt: nm('Altered (♭9, ♭13)', 'אלטרד (♭9, ♭13)', 'altered', 'tritone') };
      return choiceQ({
        ...base, difficulty: 1560,
        ask: { en: `${v7} → ${ROOTS[key]}6: natural or altered?`, he: `${v7} ← ${ROOTS[key]}6: טבעי או אלטרד?` },
        text: { en: v7, he: v7 },
        names, answer: k, choices: ['nat', 'alt'],
        stimulus: [chordsStim([chordOf(k === 'nat' ? 4 : alt), I6])],
        choiceStim: { nat: [chordsStim([chordOf(4), I6])], alt: [chordsStim([chordOf(alt), I6])] },
      });
    }
    if (level === 2) {
      const i = Math.floor(rnd() * 7);
      const k = i < 4 ? 'dom' : 'm6';
      const names = { dom: nm('A brother dominant', 'דומיננט אח', 'dominant', 'brother'), m6: nm('A minor 6th', 'מינור 6', 'minor six', 'minor sixth') };
      return choiceQ({
        ...base, difficulty: 1620,
        ask: { en: `${v7} → ${ROOTS[key]}6: which family played the V?`, he: `${v7} ← ${ROOTS[key]}6: איזו משפחה ניגנה את ה־V?` },
        text: { en: v7, he: v7 },
        names, answer: k, choices: ['dom', 'm6'],
        stimulus: [chordsStim([chordOf(i), I6])],
        choiceStim: { dom: [chordsStim([chordOf(i < 4 ? i : 0), I6])], m6: [chordsStim([chordOf(i >= 4 ? i : 4), I6])] },
      });
    }
    if (level === 4) {
      // choosing a substitute on the V (BARRY-HARRIS-METHOD.md F1.4): itself, the family (the tritone brother), the
      // important minor, the tritone's minor — in a ii–V–I
      const menu: [string, number][] = [['self', 0], ['family', 2], ['important', 4], ['tritone', 6]];
      const [ans, idx] = pickR(rnd, menu);
      const ii4 = voiced(pcs6([0, 4, 7, 9], key + 5), bassIn(key + 2));
      const names = { self: nm(`${v7} itself`, `${v7} עצמו`, 'itself', 'dominant'), family: nm('The family (the tritone brother)', 'המשפחה (האח בטריטון)', 'family', 'tritone sub'), important: nm('The important minor', 'המינור החשוב', 'important minor', 'natural'), tritone: nm('The tritone’s minor', 'המינור של הטריטון', 'tritones minor', 'altered') };
      return choiceQ({
        ...base, difficulty: 1700,
        ask: { en: `ii–V–I in ${ROOTS[key]}: what was chosen for the V?`, he: `ii–V–I ב־${ROOTS[key]}: מה נבחר ל־V?` },
        names, answer: ans, choices: menu.map((m) => m[0]),
        stimulus: [chordsStim([ii4, chordOf(idx), I6])],
        choiceStim: Object.fromEntries(menu.map(([n, x]) => [n, [chordsStim([ii4, chordOf(x), I6])]])),
      });
    }
    const i = Math.floor(rnd() * 8);
    const others = shuffleR(rnd, [0, 1, 2, 3, 4, 5, 6, 7].filter((x) => x !== i)).slice(0, 3);
    const opts = shuffleR(rnd, [i, ...others]);
    const ii = voiced(pcs6([0, 4, 7, 9], key + 5), bassIn(key + 2));
    const names = Object.fromEntries(opts.map((x) => [`e${x}`, nm(nameOf(x), nameOf(x), nameOf(x), x < 4 ? 'dominant' : 'minor six')]));
    return choiceQ({
      ...base, difficulty: 1680,
      ask: { en: `ii–V–I in ${ROOTS[key]}: which chord played the V?`, he: `ii–V–I ב־${ROOTS[key]}: איזה אקורד ניגן את ה־V?` },
      text: { en: `${ROOTS[mod12(key + 2)]}m7 – ${v7} – ${ROOTS[key]}6`, he: `${ROOTS[mod12(key + 2)]}m7 – ${v7} – ${ROOTS[key]}6` },
      names, answer: `e${i}`, choices: opts.map((x) => `e${x}`),
      stimulus: [chordsStim([ii, chordOf(i), I6])],
      choiceStim: Object.fromEntries(opts.map((x) => [`e${x}`, [chordsStim([ii, chordOf(x), I6])]])),
    });
  },
};
TOPIC_TAGS['bh-sixfive'] = tg(['chords', 'barry', 1]);

// ───────────────────────────── Harris's moves by ear (BARRY-HARRIS-THEORY.md §10) ─────────────────────────────
//   L1 which move: the first movement, the next move, or major – minor – minor/6?
//   L2 from the diminished one note falls a half step: which dominant (the four brothers)?
//   L3 two neighbouring notes of the diminished rise a half step: which 6 chord?

const evStim = (evs: DEv[], each = 0.42): Stimulus => {
  const ev: NoteEvent[] = evs.flatMap((e) => [...(e.bass !== undefined ? [e.bass] : []), ...e.ps].map((m) => ({ midi: m, start: e.beat * each, duration: e.dur * each * 0.95, velocity: 0.5 })));
  const end = Math.max(...evs.map((e) => e.beat + e.dur));
  return eventsStim(ev, end * each + 0.4);
};
const dimV = (root: number) => {
  const v: number[] = [];
  for (let p = 64; v.length < 4; p++) if ([0, 3, 6, 9].includes(mod12(p - root))) v.push(p);
  return v;
};

TOPIC_GEN['bh-moves'] = {
  title: { en: "Barry Harris's moves", he: 'המהלכים של בארי האריס' },
  skill: 'chords',
  levels: [
    { en: 'Which move?', he: 'איזה מהלך?' },
    { en: 'One note down: which dominant?', he: 'צליל אחד למטה: איזה דומיננט?' },
    { en: 'Two notes up: which 6 chord?', he: 'שני צלילים למעלה: איזה אקורד 6?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const base = { id, topic: 'bh-moves', level, seed, skill: 'chords' as const };
    if (level === 1) {
      const kinds = ['mv-first', 'mv-next', 'mv-mmm'];
      const k = pickR(rnd, kinds);
      const names = { 'mv-first': nm('First movement', 'התנועה הראשונה', 'first movement', 'm6 dim 7 6'), 'mv-next': nm('Next move', 'המהלך הבא', 'next move', 'two notes'), 'mv-mmm': nm('Major – minor – minor/6', 'מז׳ור – מינור – מינור/6', 'major minor minor six', 'bass down') };
      const stim = (kind: string) => evStim(partDEvents(key, kind, 0).evs.slice(0, kind === 'mv-next' ? 4 : kind === 'mv-first' ? 4 : 6));
      return choiceQ({
        ...base, difficulty: 1500,
        ask: { en: 'Which of Barry’s moves is this?', he: 'איזה מהמהלכים של בארי זה?' },
        names, answer: k, choices: kinds,
        stimulus: [stim(k)],
        choiceStim: Object.fromEntries(kinds.map((x) => [x, [stim(x)]])),
      });
    }
    const dim = dimV(key);
    if (level === 2) {
      // lower note j of the diminished a half step: a dominant 7th on that lowered note
      const j = Math.floor(rnd() * 4);
      const chordOf = (x: number) => dim.map((p, i) => (i === x ? p - 1 : p));
      const nameOf = (x: number) => `${ROOTS[mod12(dim[x] - 1)]}7`;
      const names = Object.fromEntries([0, 1, 2, 3].map((x) => [`d${x}`, nm(nameOf(x), nameOf(x), nameOf(x), 'dominant')]));
      const stim = (x: number): Stimulus => evStim([{ beat: 0, dur: 2, ps: dim }, { beat: 2, dur: 2, ps: chordOf(x), bass: 36 + mod12(dim[x] - 1 - 36) }]);
      return choiceQ({
        ...base, difficulty: 1540,
        ask: { en: `${ROOTS[key]}°7, one note down a half step: which dominant?`, he: `${ROOTS[key]}°7, צליל אחד יורד חצי טון: איזה דומיננט?` },
        names, answer: `d${j}`, choices: shuffleR(rnd, [0, 1, 2, 3].map((x) => `d${x}`)),
        stimulus: [stim(j)],
        choiceStim: Object.fromEntries([0, 1, 2, 3].map((x) => [`d${x}`, [stim(x)]])),
      });
    }
    // raise the neighbouring pair (j, j+1) of the diminished: a major 6 chord
    const j = Math.floor(rnd() * 4);
    const up = (x: number) => dim.map((p, i) => (i === x || i === (x + 1) % 4 ? p + 1 : p)).sort((a, b) => a - b);
    const sixName = (x: number) => {
      const v = up(x).map(mod12);
      const r = v.find((c) => [0, 4, 7, 9].every((iv) => v.includes(mod12(c + iv))))!;
      return `${ROOTS[r]}6`;
    };
    const names = Object.fromEntries([0, 1, 2, 3].map((x) => [`u${x}`, nm(sixName(x), sixName(x), sixName(x), 'six')]));
    const stim = (x: number): Stimulus => evStim([{ beat: 0, dur: 2, ps: dim }, { beat: 2, dur: 2, ps: up(x) }]);
    return choiceQ({
      ...base, difficulty: 1580,
      ask: { en: `${ROOTS[key]}°7, two neighbouring notes up a half step: which 6 chord?`, he: `${ROOTS[key]}°7, שני צלילים שכנים עולים חצי טון: איזה אקורד 6?` },
      names, answer: `u${j}`, choices: shuffleR(rnd, [0, 1, 2, 3].map((x) => `u${x}`)),
      stimulus: [stim(j)],
      choiceStim: Object.fromEntries([0, 1, 2, 3].map((x) => [`u${x}`, [stim(x)]])),
    });
  },
};
TOPIC_TAGS['bh-moves'] = tg(['chords', 'barry', 1]);

// ───────────────────────────── the 16 chords around one diminished (Echols's tesseract, BARRY-HARRIS-METHOD.md F1.3) ─────────────────────────────
//   L1 how many notes of the dim moved down a half step: one (a dom7), two neighbours (a major 6), two opposite
//      (a dom7♭5), three (a minor 6)?
//   L2 which chord is it (four of the 16)?
//   L3 the dim moved by one note: which family did it become — dominant (down) or minor 6th (up)? (Harris's half steps)

/** The 16 chords between a dim on `root` and the dim a half step lower: lower the notes in `idx` (sorted dim voicing). */
export function tesseract(root: number): { name: string; kind: 'dom' | 'six' | 'b5' | 'm6' | 'dim'; lowered: number[]; ps: number[] }[] {
  const dim = dimV(root);
  const out: { name: string; kind: 'dom' | 'six' | 'b5' | 'm6' | 'dim'; lowered: number[]; ps: number[] }[] = [];
  const subsets: number[][] = [[], [0], [1], [2], [3], [0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3], [0, 1, 2], [1, 2, 3], [2, 3, 0], [3, 0, 1], [0, 1, 2, 3]];
  for (const sub of subsets) {
    const ps = dim.map((p, i) => (sub.includes(i) ? p - 1 : p));
    const pcs = ps.map(mod12);
    const has = (r: number, ivs: number[]) => ivs.every((iv) => pcs.includes(mod12(r + iv)));
    let name = '';
    let kind: 'dom' | 'six' | 'b5' | 'm6' | 'dim' = 'dim';
    for (let r = 0; r < 12 && !name; r++) {
      if (sub.length === 1 && has(r, [0, 4, 7, 10])) [name, kind] = [`${ROOTS[r]}7`, 'dom'];
      else if (sub.length === 2 && Math.abs(sub[0] - sub[1]) !== 2 && has(r, [0, 4, 7, 9])) [name, kind] = [`${ROOTS[r]}6`, 'six'];
      else if (sub.length === 2 && Math.abs(sub[0] - sub[1]) === 2 && has(r, [0, 4, 6, 10])) [name, kind] = [`${ROOTS[r]}7♭5`, 'b5'];
      else if (sub.length === 3 && has(r, [0, 3, 7, 9])) [name, kind] = [`${ROOTS[r]}m6`, 'm6'];
    }
    if (!name) name = `${ROOTS[mod12(ps[0])]}°7`;
    out.push({ name, kind, lowered: sub, ps });
  }
  return out;
}

TOPIC_GEN['bh-tesseract'] = {
  title: { en: 'The 16 chords around one diminished', he: '16 האקורדים סביב מוקטן אחד' },
  skill: 'chords',
  levels: [
    { en: 'How many notes moved?', he: 'כמה צלילים זזו?' },
    { en: 'Which chord?', he: 'איזה אקורד?' },
    { en: 'One note down or up: dominant or minor 6th?', he: 'צליל אחד למטה או למעלה: דומיננט או מינור 6?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const base = { id, topic: 'bh-tesseract', level, seed, skill: 'chords' as const };
    const all = tesseract(key).filter((c) => c.kind !== 'dim');
    const dim = dimV(key);
    const stim = (ps: number[]): Stimulus => evStim([{ beat: 0, dur: 2, ps: dim }, { beat: 2, dur: 2, ps }]);
    if (level === 1) {
      const kinds = ['dom', 'six', 'b5', 'm6'] as const;
      const k = pickR(rnd, [...kinds]);
      const c = pickR(rnd, all.filter((x) => x.kind === k));
      const names = { dom: nm('One (a dominant 7th)', 'אחד (דומיננט 7)', 'one', 'dominant'), six: nm('Two neighbours (a major 6th)', 'שני שכנים (מז׳ור 6)', 'two neighbours', 'major six'), b5: nm('Two opposite (a 7♭5)', 'שניים מנוגדים (7♭5)', 'two opposite', 'flat five'), m6: nm('Three (a minor 6th)', 'שלושה (מינור 6)', 'three', 'minor six') };
      return choiceQ({
        ...base, difficulty: 1520,
        ask: { en: `${ROOTS[key]}°7: how many notes moved down a half step?`, he: `${ROOTS[key]}°7: כמה צלילים ירדו חצי טון?` },
        names, answer: k, choices: [...kinds],
        stimulus: [stim(c.ps)],
        choiceStim: Object.fromEntries(kinds.map((x) => [x, [stim(all.find((y) => y.kind === x)!.ps)]])),
      });
    }
    if (level === 2) {
      const pick = shuffleR(rnd, all).slice(0, 4);
      const ans = pick[0];
      const idOf = (c: (typeof all)[number]) => `c${all.indexOf(c)}`;
      const names = Object.fromEntries(pick.map((c) => [idOf(c), nm(c.name, c.name, c.name, c.kind)]));
      return choiceQ({
        ...base, difficulty: 1580,
        ask: { en: `From ${ROOTS[key]}°7: which chord?`, he: `מ־${ROOTS[key]}°7: איזה אקורד?` },
        names, answer: idOf(ans), choices: shuffleR(rnd, pick.map(idOf)),
        stimulus: [stim(ans.ps)],
        choiceStim: Object.fromEntries(pick.map((c) => [idOf(c), [stim(c.ps)]])),
      });
    }
    // one note down a half step → a dominant on it; three notes down = one note up → a minor 6th (Harris's half steps)
    const j = Math.floor(rnd() * 4);
    const up = rnd() < 0.5;
    const ps = dim.map((p, i) => (i === j ? p + (up ? 1 : -1) : p));
    const names = { dom: nm('A dominant (one note down)', 'דומיננט (צליל אחד למטה)', 'dominant', 'down'), m6: nm('A minor 6th (one note up)', 'מינור 6 (צליל אחד למעלה)', 'minor six', 'up') };
    return choiceQ({
      ...base, difficulty: 1620,
      ask: { en: `${ROOTS[key]}°7, one note moves a half step: what does it become?`, he: `${ROOTS[key]}°7, צליל אחד זז חצי טון: למה הוא הופך?` },
      names, answer: up ? 'm6' : 'dom', choices: ['dom', 'm6'],
      stimulus: [stim(ps)],
      choiceStim: { dom: [stim(dim.map((p, i) => (i === j ? p - 1 : p)))], m6: [stim(dim.map((p, i) => (i === j ? p + 1 : p)))] },
    });
  },
};
TOPIC_TAGS['bh-tesseract'] = tg(['chords', 'barry', 1]);

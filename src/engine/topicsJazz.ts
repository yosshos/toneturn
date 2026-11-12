// Jazz & Barry Harris, round 2 (owner 2026-11-08: "check jazz and Barry Harris in depth"). New topics:
//  · bh-family   — same notes, other names (C6 = Am7, Cm6 = Am7♭5, B°7 = G7♭9 without its root), on paper and by ear
//  · bh-block    — the harmonised 6th-diminished scale in drop-2 block chords
//  · comping     — comping rhythms (Charleston, reverse Charleston, Red Garland, anticipation, four to the bar)
//  · turnarounds — I–vi–ii–V and its substitutes (iii–vi, VI7, all dominants, tritone, Ladybird)
//  · guide-tones — the 3rd / 7th line through ii–V–I (major and minor)
// Pure, seeded generators like every topic; tags via taxonomy.ts.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, eventsStim, nm, pcName, pcNameHe } from './topicKit';

type Names = ChoiceQuestion['names'];
const fit = (ms: number[], lo = 50, hi = 79) => ms.map((m) => (m < lo ? m + 12 : m > hi ? m - 12 : m)).sort((a, b) => a - b);
const rest = (d = 0.4): Stimulus => ({ kind: 'rest', duration: d });

// ---------------------------------------------------------------- bh-family

const NAME = (pc: number, q: string) => ({ en: `${pcName(pc)}${q}`, he: `${pcNameHe(pc)} ${q}` });

TOPIC_GEN['bh-family'] = {
  title: { en: 'Barry Harris: same notes, other names', he: 'בארי האריס: אותם צלילים, שמות אחרים' },
  skill: 'theory',
  levels: [
    { en: 'Major 6 = minor 7', he: 'מז׳ור 6 = מינור 7' },
    { en: 'Minor 6 = half-diminished', he: 'מינור 6 = חצי מוקטן' },
    { en: 'Diminished = 7♭9 without its root', he: 'דימיניש = 7♭9 בלי השורש' },
    { en: 'By ear: the bass names the chord', he: 'בשמיעה: הבס קובע את השם' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const r = Math.floor(rnd() * 12);
    if (level <= 2) {
      const six = level === 1 ? '6' : 'm6';
      const other = level === 1 ? 'm7' : 'm7♭5';
      const fwd = rnd() < 0.5;
      // C6 = Am7 (root a minor third below); Cm6 = Am7♭5
      const ans = fwd ? (r + 9) % 12 : (r + 3) % 12;
      const offs = shuffleR(rnd, [2, 4, 5, 7, 8].map((x) => (ans + x) % 12)).slice(0, 3);
      const opts = shuffleR(rnd, [ans, ...offs]);
      const q = fwd ? NAME(r, six) : NAME(r, other);
      const names: Names = {};
      for (const o of opts) {
        const n = NAME(o, fwd ? other : six);
        names[`r${o}`] = nm(n.en, n.he, `${pcName(o).replace('♭', ' flat')} ${fwd ? (level === 1 ? 'minor seven' : 'half diminished') : level === 1 ? 'six' : 'minor six'}`);
      }
      const notes = (pc: number, ivs: number[]) => fit(ivs.map((x) => 60 + pc + x));
      const sixIv = level === 1 ? [0, 4, 7, 9] : [0, 3, 7, 9];
      const otherIv = level === 1 ? [0, 3, 7, 10] : [0, 3, 6, 10];
      return choiceQ({
        id, topic: 'bh-family', level, seed, skill: 'theory', difficulty: 1150 + 120 * level,
        ask: { en: `${q.en} has the same four notes as which chord?`, he: `ל־${q.he} יש אותם ארבעה צלילים כמו לאיזה אקורד?` },
        text: q,
        names, answer: `r${ans}`, choices: opts.map((o) => `r${o}`),
        stimulus: [],
        choiceStim: Object.fromEntries(opts.map((o) => [`r${o}`, [chordStim([36 + o, ...notes(o, fwd ? otherIv : sixIv)], 1.4)]])),
      });
    }
    if (level === 3) {
      // G7♭9 without G = B D F A♭ = B°7: the diminished chord a half step above the root (= its 3rd).
      const fwd = rnd() < 0.5;
      const fam = (f: number) => [0, 3, 6, 9].map((x) => (f + x) % 12);
      const famName = (f: number) => ({ en: fam(f).map((p) => pcName(p)).join(' '), he: fam(f).map((p) => pcNameHe(p)).join(' ') });
      if (fwd) {
        const ansF = (r + 1) % 3;
        const names: Names = {};
        for (const f of [0, 1, 2]) names[`f${f}`] = nm(`${famName(f).en} (°7)`, `${famName(f).he} (°7)`, `${pcName(f).replace('♭', ' flat')} diminished`);
        return choiceQ({
          id, topic: 'bh-family', level, seed, skill: 'theory', difficulty: 1450,
          ask: { en: `${pcName(r)}7♭9 without its root is which diminished chord?`, he: `${pcNameHe(r)} 7♭9 בלי השורש הוא איזה דימיניש?` },
          text: { en: `${pcName(r)}7♭9 − ${pcName(r)}`, he: `${pcNameHe(r)} 7♭9 − ${pcNameHe(r)}` },
          names, answer: `f${ansF}`, choices: ['f0', 'f1', 'f2'], stimulus: [],
          choiceStim: Object.fromEntries([0, 1, 2].map((f) => [`f${f}`, [chordStim(fit(fam(f).map((p) => 60 + p)), 1.3)]])),
        });
      }
      // A diminished chord: which four dominants (7♭9) does it belong to? Ask for one of them.
      const f = r % 3;
      const doms = fam(f).map((p) => (p + 11) % 12); // root a half step below each note
      const ans = pickR(rnd, doms);
      const wrong = shuffleR(rnd, Array.from({ length: 12 }, (_, k) => k).filter((k) => !doms.includes(k))).slice(0, 3);
      const opts = shuffleR(rnd, [ans, ...wrong]);
      const names: Names = {};
      for (const o of opts) names[`d${o}`] = nm(`${pcName(o)}7♭9`, `${pcNameHe(o)} 7♭9`, `${pcName(o).replace('♭', ' flat')} seven flat nine`);
      return choiceQ({
        id, topic: 'bh-family', level, seed, skill: 'theory', difficulty: 1500,
        ask: { en: `${famName(f).en} — which dominant 7♭9 contains this diminished chord?`, he: `${famName(f).he} — איזה דומיננט 7♭9 מכיל את הדימיניש הזה?` },
        text: { en: `${pcName(f)}°7`, he: `${pcNameHe(f)}°7` },
        names, answer: `d${ans}`, choices: opts.map((o) => `d${o}`), stimulus: [],
      });
    }
    // Level 4 — by ear: the same four notes over two different basses.
    const minor = rnd() < 0.5;
    const sixIv = minor ? [0, 3, 7, 9] : [0, 4, 7, 9];
    const upper = fit(sixIv.map((x) => 60 + r + x), 55, 79);
    const lowRoot = (pc: number) => 36 + (((pc - 36) % 12) + 12) % 12 + (pc % 12 < 4 ? 12 : 0);
    const onSix = rnd() < 0.5;
    const bass = lowRoot(onSix ? r : (r + 9) % 12);
    const keys = ['six', 'm7', 'msix', 'hd'];
    const names: Names = {
      six: nm(`${pcName(r)}6`, `${pcNameHe(r)} 6`, 'six', 'major six'),
      m7: nm(`${pcName((r + 9) % 12)}m7`, `${pcNameHe((r + 9) % 12)} מינור 7`, 'minor seven'),
      msix: nm(`${pcName(r)}m6`, `${pcNameHe(r)} מינור 6`, 'minor six'),
      hd: nm(`${pcName((r + 9) % 12)}m7♭5`, `${pcNameHe((r + 9) % 12)} חצי מוקטן`, 'half diminished'),
    };
    const answer = minor ? (onSix ? 'msix' : 'hd') : onSix ? 'six' : 'm7';
    return choiceQ({
      id, topic: 'bh-family', level, seed, skill: 'chords', difficulty: 1550,
      ask: { en: 'Four notes over a bass — what is the chord called?', he: 'ארבעה צלילים מעל בס — מה שם האקורד?' },
      names, answer, choices: keys, stimulus: [chordStim([bass, ...upper], 1.8)],
      choiceStim: {
        six: [chordStim([lowRoot(r), ...fit([0, 4, 7, 9].map((x) => 60 + r + x), 55, 79)], 1.4)],
        m7: [chordStim([lowRoot((r + 9) % 12), ...fit([0, 4, 7, 9].map((x) => 60 + r + x), 55, 79)], 1.4)],
        msix: [chordStim([lowRoot(r), ...fit([0, 3, 7, 9].map((x) => 60 + r + x), 55, 79)], 1.4)],
        hd: [chordStim([lowRoot((r + 9) % 12), ...fit([0, 3, 7, 9].map((x) => 60 + r + x), 55, 79)], 1.4)],
      },
    });
  },
};

// ---------------------------------------------------------------- bh-block: the harmonised 6th-diminished scale

/** Scale degrees (semitones) of the 6th-diminished scale; 6-chord tones and diminished tones alternate. */
const SIXDIM_MAJ = [0, 2, 4, 5, 7, 8, 9, 11];
const SIXDIM_MIN = [0, 2, 3, 5, 7, 8, 9, 11];
/** A drop-2 block chord with `top` on top: the chord's close voicing under it, second voice dropped an octave. */
export function dropTwo(top: number, pcs: number[]): number[] {
  const below: number[] = [top];
  let m = top;
  while (below.length < 4) {
    m--;
    if (pcs.includes(((m % 12) + 12) % 12)) below.push(m);
  }
  const [a, b, c, d] = below; // top, 2nd, 3rd, 4th from the top
  return [b - 12, d, c, a].sort((x, y) => x - y);
}
/** Block chord for a step of the scale: a 6-chord tone gets the 6 chord, a diminished tone the diminished chord. */
function blockAt(tonic: number, minor: boolean, step: number): { midis: number[]; six: boolean } {
  const sc = minor ? SIXDIM_MIN : SIXDIM_MAJ;
  const oct = Math.floor(step / 8);
  const s = sc[((step % 8) + 8) % 8] + 12 * oct;
  const top = tonic + s;
  const sixPcs = (minor ? [0, 3, 7, 9] : [0, 4, 7, 9]).map((x) => (tonic + x) % 12);
  const dimPcs = [11, 2, 5, 8].map((x) => (tonic + x) % 12);
  const six = sixPcs.includes(((top % 12) + 12) % 12);
  return { midis: dropTwo(top, six ? sixPcs : dimPcs), six };
}

TOPIC_GEN['bh-block'] = {
  title: { en: 'Barry Harris: block chords', he: 'בארי האריס: אקורדי בלוק' },
  skill: 'chords',
  levels: [
    { en: '6 chord or diminished?', he: 'אקורד 6 או דימיניש?' },
    { en: 'Where did the chords stop?', he: 'איפה האקורדים נעצרו?' },
    { en: 'Major or minor 6th-diminished?', he: '6 דימיניש מז׳ורי או מינורי?' },
    { en: 'How many diminished chords?', he: 'כמה אקורדי דימיניש?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const tonic = 64 + Math.floor(rnd() * 6);
    const minor = level === 3 ? rnd() < 0.5 : rnd() < 0.3;
    const ref = chordStim(blockAt(tonic, minor, 0).midis, 1);
    const names2: Names = { six: nm('The 6 chord', 'אקורד ה־6', 'six', 'שש'), dim: nm('The diminished chord', 'הדימיניש', 'diminished', 'dim', 'דימיניש') };
    if (level === 1) {
      const step = 1 + Math.floor(rnd() * 7);
      const b = blockAt(tonic, minor, step);
      return choiceQ({
        id, topic: 'bh-block', level, seed, skill: 'chords', difficulty: 1250,
        ask: { en: 'A block chord: 6 chord or diminished?', he: 'אקורד בלוק: 6 או דימיניש?' },
        names: names2, answer: b.six ? 'six' : 'dim', choices: ['six', 'dim'], stimulus: [ref, rest(0.4), chordStim(b.midis, 1.4)],
      });
    }
    if (level === 2) {
      const stop = 2 + Math.floor(rnd() * 7);
      const run = Array.from({ length: stop + 1 }, (_, k) => chordStim(blockAt(tonic, minor, k).midis, k === stop ? 1.5 : 0.42));
      return choiceQ({
        id, topic: 'bh-block', level, seed, skill: 'chords', difficulty: 1350,
        ask: { en: 'They stop on a 6 chord or a diminished?', he: 'הם נעצרים על 6 או על דימיניש?' },
        names: names2, answer: blockAt(tonic, minor, stop).six ? 'six' : 'dim', choices: ['six', 'dim'], stimulus: run,
      });
    }
    if (level === 3) {
      const run = (mi: boolean) => Array.from({ length: 9 }, (_, k) => chordStim(blockAt(tonic, mi, k).midis, k === 8 ? 1.4 : 0.38));
      return choiceQ({
        id, topic: 'bh-block', level, seed, skill: 'chords', difficulty: 1400,
        ask: { en: 'The harmonized scale: major 6th-diminished or minor 6th-diminished?', he: 'הסולם המהורמן: 6 דימיניש מז׳ורי או מינורי?' },
        names: { maj: nm('Major (6 chord)', 'מז׳ורי (אקורד 6)', 'major'), min: nm('Minor (minor 6 chord)', 'מינורי (מינור 6)', 'minor') },
        answer: minor ? 'min' : 'maj', choices: ['maj', 'min'], stimulus: run(minor), choiceStim: { maj: run(false), min: run(true) },
      });
    }
    // Level 4: a short melody harmonised in block chords — how many diminished chords?
    let step = Math.floor(rnd() * 4);
    const steps: number[] = [];
    for (let k = 0; k < 5; k++) {
      steps.push(step);
      step = Math.max(0, Math.min(10, step + pickR(rnd, [-2, -1, 1, 1, 2])));
    }
    const n = steps.filter((s) => !blockAt(tonic, minor, s).six).length;
    const ok = n >= 1 && n <= 3;
    const fixed = ok ? steps : [0, 1, 2, 4, 3];
    const nn = fixed.filter((s) => !blockAt(tonic, minor, s).six).length;
    return choiceQ({
      id, topic: 'bh-block', level, seed, skill: 'chords', difficulty: 1550,
      ask: { en: 'A melody in block chords: how many of the chords are diminished?', he: 'מנגינה באקורדי בלוק: כמה מהאקורדים הם דימיניש?' },
      names: { n1: nm('One', 'אחד', 'one', '1'), n2: nm('Two', 'שניים', 'two', '2'), n3: nm('Three', 'שלושה', 'three', '3') },
      answer: `n${Math.max(1, Math.min(3, nn))}`, choices: ['n1', 'n2', 'n3'],
      stimulus: [ref, rest(0.5), ...fixed.map((s, k) => chordStim(blockAt(tonic, minor, s).midis, k === fixed.length - 1 ? 1.3 : 0.6))],
    });
  },
};

// ---------------------------------------------------------------- comping rhythms

const COMP: Record<string, { hits: number[]; name: { en: string; he: string }; say: string[] }> = {
  charleston: { hits: [0, 1.5], name: { en: 'Charleston (1, and of 2)', he: 'צ׳רלסטון (1, ו־2)' }, say: ['charleston'] },
  reverse: { hits: [0.5, 2], name: { en: 'Reverse Charleston (and of 1, 3)', he: 'צ׳רלסטון הפוך (ו־1, 3)' }, say: ['reverse', 'reverse charleston'] },
  garland: { hits: [1.5, 3.5], name: { en: 'Red Garland (and of 2, and of 4)', he: 'רד גרלנד (ו־2, ו־4)' }, say: ['red garland', 'garland'] },
  anticip: { hits: [3.5], name: { en: 'Anticipation (and of 4)', he: 'הקדמה (ו־4)' }, say: ['anticipation', 'push'] },
  four: { hits: [0, 1, 2, 3], name: { en: 'Four to the bar', he: 'ארבע לתיבה' }, say: ['four', 'four to the bar', 'quarters'] },
};
/** Swing: an "and" falls 2/3 through the beat. */
const swingAt = (b: number) => Math.floor(b) + (b % 1 ? 2 / 3 : 0);

function compBars(pattern: string, chords: { root: number; iv: number[] }[], bpm: number): Stimulus {
  const beat = 60 / bpm;
  const ev: NoteEvent[] = [];
  const bars = chords.length;
  for (let bar = 0; bar < bars; bar++) {
    const c = chords[bar];
    const nx = chords[(bar + 1) % bars];
    for (let k = 0; k < 4; k++) {
      const t = (bar * 4 + k) * beat;
      // walking bass: root, 3rd, 5th, approach to the next root
      const bassPc = k === 0 ? c.root : k === 1 ? c.root + c.iv[1] : k === 2 ? c.root + c.iv[2] : nx.root - 1;
      ev.push({ midi: 36 + ((((bassPc - 36) % 12) + 12) % 12) + (((bassPc % 12) + 12) % 12 < 4 ? 12 : 0), start: t, duration: beat * 0.85, velocity: 0.62, inst: 'bass' });
      ev.push({ midi: 42, start: t, duration: 0.05, velocity: k % 2 ? 0.3 : 0.18, perc: 'hat' });
    }
    for (const h of COMP[pattern].hits) {
      // an anticipation sounds the NEXT chord early
      const ch = pattern === 'anticip' ? nx : c;
      const tones = [ch.iv[1], ch.iv[3] ?? ch.iv[2], 14].map((x) => 55 + ((((ch.root + x - 55) % 12) + 12) % 12));
      for (const m of tones) ev.push({ midi: m, start: (bar * 4 + swingAt(h)) * beat, duration: beat * (pattern === 'four' ? 0.7 : 0.45), velocity: 0.48 });
    }
  }
  return eventsStim(ev, bars * 4 * beat + 0.3);
}

TOPIC_GEN['comping'] = {
  title: { en: 'Comping rhythms', he: 'מקצבי ליווי (קומפינג)' },
  skill: 'rhythm-dictation',
  levels: [
    { en: 'Charleston or four to the bar?', he: 'צ׳רלסטון או ארבע לתיבה?' },
    { en: 'Charleston, reverse, Red Garland', he: 'צ׳רלסטון, הפוך, רד גרלנד' },
    { en: 'All five, over a ii–V–I', he: 'כל החמישה, מעל ii–V–I' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const bpm = level === 1 ? 112 : level === 2 ? 132 : 152;
    const pool = level === 1 ? ['charleston', 'four'] : level === 2 ? ['charleston', 'reverse', 'garland'] : Object.keys(COMP);
    const chords = level === 3 ? [{ root: key + 2, iv: [0, 3, 7, 10] }, { root: key + 7, iv: [0, 4, 7, 10] }, { root: key, iv: [0, 4, 7, 11] }, { root: key, iv: [0, 4, 7, 11] }] : [{ root: key, iv: [0, 4, 7, 10] }, { root: key, iv: [0, 4, 7, 10] }];
    const answer = pickR(rnd, pool);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const p of pool) {
      names[p] = nm(COMP[p].name.en, COMP[p].name.he, ...COMP[p].say);
      choiceStim[p] = [compBars(p, chords.slice(0, 2), bpm)];
    }
    return choiceQ({
      id, topic: 'comping', level, seed, skill: 'rhythm-dictation', difficulty: 1150 + 150 * level,
      ask: { en: 'Bass and hi-hat keep time — which rhythm is the piano comping?', he: 'הבס וההיי־האט שומרים על הזמן — באיזה מקצב הפסנתר מלווה?' },
      names, answer, choices: pool, stimulus: [compBars(answer, chords, bpm)], choiceStim,
    });
  },
};

// ---------------------------------------------------------------- turnarounds

type Ch = [number, number[]];
const MAJ7 = [0, 4, 7, 11];
const M7 = [0, 3, 7, 10];
const D7 = [0, 4, 7, 10];
const TURN: Record<string, { chords: Ch[]; en: string; he: string; say: string[] }> = {
  'i-vi': { chords: [[0, MAJ7], [9, M7], [2, M7], [7, D7]], en: 'I–vi–ii–V', he: 'I–vi–ii–V', say: ['one six two five', 'I vi ii V'] },
  'iii-vi': { chords: [[4, M7], [9, M7], [2, M7], [7, D7]], en: 'iii–vi–ii–V', he: 'iii–vi–ii–V', say: ['three six two five'] },
  'vi7': { chords: [[0, MAJ7], [9, D7], [2, M7], [7, D7]], en: 'I–VI7–ii–V', he: 'I–VI7–ii–V', say: ['six dominant', 'secondary dominant'] },
  'all-dom': { chords: [[4, D7], [9, D7], [2, D7], [7, D7]], en: 'III7–VI7–II7–V7', he: 'III7–VI7–II7–V7', say: ['all dominants', 'dominants'] },
  tritone: { chords: [[0, MAJ7], [3, D7], [2, M7], [1, D7]], en: 'I–♭III7–ii–♭II7', he: 'I–♭III7–ii–♭II7', say: ['tritone', 'tritone turnaround'] },
  ladybird: { chords: [[0, MAJ7], [3, D7], [8, MAJ7], [1, D7]], en: 'I–♭III7–♭VImaj7–♭II7', he: 'I–♭III7–♭VImaj7–♭II7', say: ['ladybird'] },
};
function playTurn(key: number, chords: Ch[], each = 0.75): Stimulus[] {
  const all: Ch[] = [...chords, [0, MAJ7]];
  return all.map(([d, iv], k) => {
    const root = key + d;
    const bass = 36 + ((((root - 36) % 12) + 12) % 12) + (((root % 12) + 12) % 12 < 4 ? 12 : 0);
    // guide tones + the 5th / 9th, close around middle C
    const up = [iv[1], iv[3], iv === D7 ? 14 : iv[2]].map((x) => 55 + ((((root + x - 55) % 12) + 12) % 12));
    return chordStim([bass, ...up], k === all.length - 1 ? 1.4 : each);
  });
}

TOPIC_GEN['turnarounds'] = {
  title: { en: 'Turnarounds', he: 'טרנאראונדים' },
  skill: 'cadences',
  levels: [
    { en: 'I–vi–ii–V or iii–vi–ii–V?', he: 'I–vi–ii–V או iii–vi–ii–V?' },
    { en: 'With secondary dominants', he: 'עם דומיננטות משניות' },
    { en: 'Tritone and Ladybird', he: 'טריטון ולידיבירד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const pool = level === 1 ? ['i-vi', 'iii-vi'] : level === 2 ? ['i-vi', 'iii-vi', 'vi7', 'all-dom'] : ['i-vi', 'vi7', 'tritone', 'ladybird'];
    const answer = pickR(rnd, pool);
    const names: Names = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const p of pool) {
      names[p] = nm(TURN[p].en, TURN[p].he, ...TURN[p].say);
      choiceStim[p] = playTurn(key, TURN[p].chords);
    }
    return choiceQ({
      id, topic: 'turnarounds', level, seed, skill: 'cadences', difficulty: 1250 + 140 * level,
      ask: { en: 'Four chords back home — which turnaround?', he: 'ארבעה אקורדים חזרה הביתה — איזה טרנאראונד?' },
      names, answer, choices: pool, stimulus: playTurn(key, TURN[answer].chords, level === 3 ? 0.62 : 0.75), choiceStim,
    });
  },
};

// ---------------------------------------------------------------- guide-tone lines

TOPIC_GEN['guide-tones'] = {
  title: { en: 'Guide-tone lines', he: 'קווי צלילים מנחים' },
  skill: 'sequences',
  levels: [
    { en: 'ii–V–I: which line is on top?', he: 'ii–V–I: איזה קו למעלה?' },
    { en: 'Minor ii–V–i', he: 'ii–V–i מינורי' },
    { en: 'At tempo, with comping', he: 'בטמפו, עם ליווי' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const minor = level === 2 || (level === 3 && rnd() < 0.4);
    // shells: ii (3, 7), V (7, 3), I (3, 7) — two lines: top starts on the 7th of ii (7–3–7) or on its 3rd (3–7–3)
    const ii = key + 2;
    const v = key + 7;
    const third = (r: number, m: boolean) => r + (m ? 3 : 4);
    const sev = (r: number, maj: boolean) => r + (maj ? 11 : 10);
    const lineA = [sev(ii, false), third(v, false), sev(key, !minor)]; // 7–3–7: C–B–B (B♭ in minor)
    const lineB = [third(ii, true), sev(v, false), third(key, minor)]; // 3–7–3: F–F–E (E♭)
    const place = (pcs: number[], lo: number) => pcs.map((p) => lo + ((((p - lo) % 12) + 12) % 12));
    const voice = (topIsA: boolean): Stimulus[] => {
      const top = place(topIsA ? lineA : lineB, 64);
      const low = place(topIsA ? lineB : lineA, 55).map((m, k) => (m >= top[k] ? m - 12 : m));
      const roots = [ii, v, key].map((r) => 36 + ((((r - 36) % 12) + 12) % 12) + (((r % 12) + 12) % 12 < 4 ? 12 : 0));
      const dur = level === 3 ? 0.55 : 0.9;
      return roots.map((b, k) => chordStim([b, low[k], top[k]], k === 2 ? 1.5 : dur));
    };
    const a = rnd() < 0.5;
    const names: Names = {
      a: nm('From the 7th: 7 → 3 → 7', 'מהספטימה: 7 ← 3 ← 7', 'seven three seven', 'from the seventh'),
      b: nm('From the 3rd: 3 → 7 → 3', 'מהטרצה: 3 ← 7 ← 3', 'three seven three', 'from the third'),
    };
    return choiceQ({
      id, topic: 'guide-tones', level, seed, skill: 'sequences', difficulty: 1300 + 120 * level,
      ask: minor ? { en: 'Minor ii–V–i in shells — which guide-tone line is on top?', he: 'ii–V–i מינורי בקונכיות — איזה קו צלילים מנחים למעלה?' } : { en: 'ii–V–I in shells — which guide-tone line is on top?', he: 'ii–V–I בקונכיות — איזה קו צלילים מנחים למעלה?' },
      names, answer: a ? 'a' : 'b', choices: ['a', 'b'], stimulus: voice(a), choiceStim: { a: voice(true), b: voice(false) },
    });
  },
};

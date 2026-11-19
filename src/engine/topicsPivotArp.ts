// BH-G (docs/AUDIT-CONTENT-THEORY.md §ז.2): the pivot (Barry Harris's pivot arpeggio — some notes moved an octave,
// same order, new contour), by ear and on paper. Jazz & improv course (pack 'jazz'), before the scale line with a pivot
// (bh-pivot, path.ts STEP_PREREQ). The theory is in pivotArp.ts; every fact is checked in tests/pivotArp.test.ts.
//   L1 straight arpeggio or pivot?
//   L2 which chord tone is on top before the drop (1 / 3 / 5 / 7)?
//   L3 the chord's quality, heard as a pivot (maj7 / m7 / 7 / m7♭5)
//   L4 inside a ii–V–I line: over which chord is the pivot?
//   L5 inside a descending Harris scale line: on which beat does the pivot start?

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { ROOT } from './topicsHarris2';
import { ARP_QUALITY, ARP_SYM, rootNear, scalePivotLine, straightArp, pivotArp, type ArpQuality } from './pivotArp';

type Names = ChoiceQuestion['names'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const rest = (d = 0.3): Stimulus => ({ kind: 'rest', duration: d });
const chordName = (pc: number, q: ArpQuality) => `${ROOT[mod12(pc)]}${ARP_SYM[q]}`;
/** The chord under a line, close and low (the context pad). */
const pad = (root: number, q: ArpQuality) => ARP_QUALITY[q].map((x) => root - 12 + x);

export const TONE_NAMES: Names = {
  t0: nm('Root', 'שורש', 'root', 'one'),
  t1: nm('3rd', 'טרצה', 'third', 'three'),
  t2: nm('5th', 'קווינטה', 'fifth', 'five'),
  t3: nm('7th', 'ספטימה', 'seventh', 'seven'),
};

/** One ii–V–I as arpeggio bars (2 beats each, 8ths) with the pivot over chord `at` (0, 1, 2), the rest straight. */
export function iiViLine(key: number, at: number, minor = false): { midis: number[][]; roots: number[]; qs: ArpQuality[] } {
  const qs: ArpQuality[] = minor ? ['m7b5', '7', 'm6'] : ['m7', '7', 'maj7'];
  const pcs = [key + 2, key + 7, key].map(mod12);
  const midis: number[][] = [];
  const roots: number[] = [];
  let aim = 67;
  pcs.forEach((pc, i) => {
    const top = i === at;
    // a straight bar climbs from the root in G3…F♯4; the pivot puts its top root just above the last note
    const root = top ? rootNear(pc, qs[i], aim + 4) : 55 + mod12(pc - 55);
    const line = top ? pivotArp(root, qs[i]) : straightArp(root, qs[i]);
    midis.push(line);
    roots.push(root);
    aim = line[line.length - 1];
  });
  return { midis, roots, qs };
}
function lineEvents(bars: number[][], roots: number[], qs: ArpQuality[], each = 0.3): Stimulus {
  const ev: NoteEvent[] = [];
  bars.forEach((b, i) => {
    const t0 = i * 4 * each;
    ev.push(...pad(roots[i], qs[i]).map((m) => ({ midi: m, start: t0, duration: 4 * each * 0.95, velocity: 0.3 })));
    b.forEach((m, j) => ev.push({ midi: m, start: t0 + j * each, duration: each * 0.95, velocity: 0.62 }));
  });
  return eventsStim(ev, bars.length * 4 * each + 0.6);
}

TOPIC_GEN['bh-pivot-arp'] = {
  title: { en: 'Barry Harris: the pivot', he: 'בארי האריס: הפיבוט' },
  skill: 'chords',
  levels: [
    { en: 'Straight or pivot?', he: 'ישר או פיבוט?' },
    { en: 'Which chord tone is on top?', he: 'איזה צליל אקורד למעלה?' },
    { en: 'Which chord is the pivot on?', he: 'על איזה אקורד הפיבוט?' },
    { en: 'In a ii–V–I: where is the pivot?', he: 'ב־ii–V–I: איפה הפיבוט?' },
    { en: 'In a scale line: where is the pivot?', he: 'בקו סולם: איפה הפיבוט?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const base = { id, topic: 'bh-pivot-arp', level, seed, skill: 'chords' as const };
    if (level === 1) {
      const q = pickR(rnd, ['maj7', 'm7', '7', 'm7b5', '6', 'dim7'] as ArpQuality[]);
      const root = 55 + mod12(key - 55);
      const top = rnd() < 0.5;
      const lines = { straight: straightArp(root, q), top: pivotArp(root, q) };
      const names: Names = { straight: nm('Straight', 'ישר', 'straight', 'up'), top: nm('Pivot', 'פיבוט', 'pivot', 'drop') };
      return choiceQ({
        ...base, difficulty: 1260,
        ask: { en: `${chordName(key, q)}: straight or pivot?`, he: `${chordName(key, q)}: ישר או פיבוט?` },
        names, answer: top ? 'top' : 'straight', choices: ['straight', 'top'],
        stimulus: [notesStim(top ? lines.top : lines.straight, 0.34)],
        choiceStim: { straight: [notesStim(lines.straight, 0.34)], top: [notesStim(lines.top, 0.34)] },
      });
    }
    if (level === 2) {
      const q = pickR(rnd, ['maj7', 'm7', '7'] as ArpQuality[]);
      const rot = Math.floor(rnd() * 4);
      const root = rootNear(key, q, 72, rot);
      const line = pivotArp(root, q, rot);
      return choiceQ({
        ...base, difficulty: 1290,
        ask: { en: `${chordName(key, q)} pivot: which tone is on top?`, he: `פיבוט ${chordName(key, q)}: איזה צליל למעלה?` },
        text: { en: chordName(key, q), he: chordName(key, q) },
        names: TONE_NAMES, answer: `t${rot}`, choices: ['t0', 't1', 't2', 't3'],
        stimulus: [chordStim(pad(root, q), 0.9), rest(), notesStim(line, 0.36)],
        choiceStim: Object.fromEntries([0, 1, 2, 3].map((r) => [`t${r}`, [notesStim(pivotArp(rootNear(key, q, 72, r), q, r), 0.36)]])),
      });
    }
    if (level === 3) {
      const opts: ArpQuality[] = ['maj7', 'm7', '7', 'm7b5'];
      const q = pickR(rnd, opts);
      const root = 55 + mod12(key - 55);
      const names: Names = Object.fromEntries(opts.map((o) => [o, nm(ARP_SYM[o], ARP_SYM[o], { maj7: 'major seven', m7: 'minor seven', '7': 'dominant seven', m7b5: 'half diminished' }[o as string]!)]));
      return choiceQ({
        ...base, difficulty: 1340,
        ask: { en: `A pivot on ${ROOT[key]}: which chord?`, he: `פיבוט על ${ROOT[key]}: איזה אקורד?` },
        names, answer: q, choices: shuffleR(rnd, opts),
        stimulus: [notesStim(pivotArp(root, q), 0.36)],
        choiceStim: Object.fromEntries(opts.map((o) => [o, [notesStim(pivotArp(root, o), 0.36)]])),
      });
    }
    if (level === 5) {
      // A descending Harris scale line (chord tones on the beats) with a pivot on beat 2, 3 or 4.
      const q: '6' | '7' = rnd() < 0.5 ? '6' : '7';
      const top = 67 + mod12(key - 67);
      const at = 1 + Math.floor(rnd() * 3);
      const ev = (k: number): Stimulus => {
        const each = 0.27;
        const l = scalePivotLine(top, q, k).line;
        const evs: NoteEvent[] = [...pad(top - 12, q).map((m) => ({ midi: m, start: 0, duration: 7 * 2 * each, velocity: 0.28 })), ...l.map((n) => ({ midi: n.p, start: n.beat * 2 * each, duration: n.dur * 2 * each * 0.95, velocity: 0.62 }))];
        return eventsStim(evs, 8 * 2 * each + 0.4);
      };
      const names: Names = { b1: nm('Beat 2', 'פעמה 2', 'two', 'beat two'), b2: nm('Beat 3', 'פעמה 3', 'three', 'beat three'), b3: nm('Beat 4', 'פעמה 4', 'four', 'beat four') };
      return choiceQ({
        ...base, difficulty: 1480,
        ask: { en: 'The scale comes down. On which beat is the pivot?', he: 'הסולם יורד. באיזו פעמה הפיבוט?' },
        text: { en: chordName(key, q), he: chordName(key, q) },
        names, answer: `b${at}`, choices: ['b1', 'b2', 'b3'],
        stimulus: [ev(at)],
        choiceStim: Object.fromEntries([1, 2, 3].map((k) => [`b${k}`, [ev(k)]])),
      });
    }
    // Level 4 — a ii–V–I of arpeggio bars; one is a pivot.
    const minor = rnd() < 0.35;
    const at = Math.floor(rnd() * 3);
    const qs: ArpQuality[] = minor ? ['m7b5', '7', 'm6'] : ['m7', '7', 'maj7'];
    const pcs = [key + 2, key + 7, key].map(mod12);
    const names: Names = {};
    ['ii', 'V', minor ? 'i' : 'I'].forEach((rn, i) => {
      names[`p${i}`] = nm(`${rn} · ${chordName(pcs[i], qs[i])}`, `${rn} · ${chordName(pcs[i], qs[i])}`, rn, chordName(pcs[i], qs[i]));
    });
    const stim = (k: number) => {
      const l = iiViLine(key, k, minor);
      return lineEvents(l.midis, l.roots, l.qs);
    };
    return choiceQ({
      ...base, difficulty: 1420,
      ask: { en: 'Which chord is the pivot?', he: 'איזה אקורד הוא הפיבוט?' },
      text: { en: names.p0.en.split(' · ')[1] + ' – ' + names.p1.en.split(' · ')[1] + ' – ' + names.p2.en.split(' · ')[1], he: names.p0.he.split(' · ')[1] + ' – ' + names.p1.he.split(' · ')[1] + ' – ' + names.p2.he.split(' · ')[1] },
      names, answer: `p${at}`, choices: ['p0', 'p1', 'p2'],
      stimulus: [stim(at)],
      choiceStim: Object.fromEntries([0, 1, 2].map((k) => [`p${k}`, [stim(k)]])),
    });
  },
};
TOPIC_TAGS['bh-pivot-arp'] = tg(['chords', 'barry', 1]);

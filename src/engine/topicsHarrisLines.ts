// Barry Harris lines by ear (docs/research/BARRY-HARRIS-METHOD.md Part D: D1, D8, D9, D14). Jazz & improv course (pack
// 'jazz'), Barry Harris group. Every stimulus is built by src/engine/harrisLines.ts, the same functions as the drills.
//   L1 Barry's chromatic scale: which scale degree does the skip-back lead to?
//   L2 which chromatic scale: major, dominant or minor 6th-diminished?
//   L3 the major / minor rules: how many extra half steps?
//   L4 which of the three important arpeggios on the dominant?
//   L5 seven down to the 3rd, or the plain scale down?

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';
import { ROOT } from './topicsHarris2';
import { CHROM_SCALE, IMPORTANT_ARPS, chromaticScale, ruleLine, sevenDownLine, mod12, type ChromKind, type LineNote, type RuleKind } from './harrisLines';

type Names = ChoiceQuestion['names'];
const rest = (d = 0.3): Stimulus => ({ kind: 'rest', duration: d });
/** A line with a pad under it, in 8ths at `each` seconds. */
function lineStim(line: LineNote[], pad: number[], each = 0.26): Stimulus {
  const end = Math.max(...line.map((n) => n.beat + n.dur));
  const ev: NoteEvent[] = [...pad.map((m) => ({ midi: m, start: 0, duration: end * 2 * each, velocity: 0.26 })), ...line.map((n) => ({ midi: n.p, start: n.beat * 2 * each, duration: n.dur * 2 * each * 0.95, velocity: 0.62 }))];
  return eventsStim(ev, end * 2 * each + 0.5);
}
const DEG_LABEL: Record<number, string> = { 0: '1', 2: '2', 3: '♭3', 4: '3', 5: '4', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7' };

TOPIC_GEN['bh-line-ear'] = {
  title: { en: 'Barry Harris lines by ear', he: 'הקווים של בארי האריס בשמיעה' },
  skill: 'sequences',
  levels: [
    { en: 'The chromatic scale: where is the skip-back?', he: 'הסולם הכרומטי: איפה הדילוג חזרה?' },
    { en: 'Which chromatic scale?', he: 'איזה סולם כרומטי?' },
    { en: 'The major and minor rules: how many extra notes?', he: 'חוקי המז׳ור והמינור: כמה צלילים נוספים?' },
    { en: 'Which important arpeggio?', he: 'איזה ארפג׳ חשוב?' },
    { en: 'Seven down to the 3rd, or not?', he: 'שבע למטה לטרצה, או לא?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const root = 55 + mod12(key - 55);
    const base = { id, topic: 'bh-line-ear', level, seed, skill: 'sequences' as const };
    if (level === 1) {
      // A stretch of the ascending chromatic scale with one skip; which degree does it come back to?
      const kind = pickR(rnd, ['maj', 'maj', 'dom'] as ChromKind[]);
      const { line, skips } = chromaticScale(root, kind, 'up');
      const sk = pickR(rnd, skips);
      const from = Math.max(0, sk - 3 - (sk % 2 === 1 ? 0 : 1));
      const frag = line.slice(from, Math.min(line.length, from + 8)).map((n, i) => ({ ...n, beat: i / 2, dur: 0.5 }));
      const target = mod12(line[sk + 1].p - root);
      const degs = [...new Set(frag.filter((n) => n.ct).map((n) => mod12(n.p - root)))];
      const choices = degs.slice(0, 4).map((d) => `d${d}`);
      if (!choices.includes(`d${target}`)) choices[choices.length - 1] = `d${target}`;
      const names: Names = Object.fromEntries(choices.map((c) => {
        const d = Number(c.slice(1));
        return [c, nm(`${DEG_LABEL[d]} (${ROOT[mod12(key + d)]})`, `${DEG_LABEL[d]} (${ROOT[mod12(key + d)]})`, DEG_LABEL[d])];
      }));
      return choiceQ({
        ...base, difficulty: 1300,
        ask: { en: `${ROOT[key]}${kind === 'dom' ? '7' : ''}: the skip-back returns to which degree?`, he: `${ROOT[key]}${kind === 'dom' ? '7' : ''}: הדילוג חוזר לאיזו דרגה?` },
        names, answer: `d${target}`, choices,
        stimulus: [lineStim(frag, [root - 12, root - 12 + (kind === 'dom' ? 10 : 4)])],
      });
    }
    if (level === 2) {
      const kinds: ChromKind[] = ['maj', 'dom', 'm6dim'];
      const kind = pickR(rnd, kinds);
      const names: Names = { maj: nm('Major', 'מז׳ור', 'major'), dom: nm('Dominant', 'דומיננט', 'dominant', 'seven'), m6dim: nm('Minor 6th-dim', 'מינור שישית־מוקטן', 'minor', 'minor six') };
      const stim = (k: ChromKind) => [lineStim(chromaticScale(root, k, 'up').line, [root - 12])];
      return choiceQ({
        ...base, difficulty: 1350,
        ask: { en: "Barry's chromatic scale on " + ROOT[key] + ': which scale?', he: 'הסולם הכרומטי של בארי על ' + ROOT[key] + ': איזה סולם?' },
        names, answer: kind, choices: kinds, stimulus: stim(kind),
        choiceStim: Object.fromEntries(kinds.map((k) => [k, stim(k)])),
      });
    }
    if (level === 3) {
      // the major / minor rule lines (C B A A♭ G … ; E E♭ D D♭ C …): odd from 1 3 5 6, even from 2 4
      const rk: RuleKind = rnd() < 0.7 ? 'maj' : 'min';
      const opts: [number, 0 | 1 | 2 | 3][] = rk === 'maj' ? [[0, 1], [4, 1], [7, 1], [9, 1], [4, 3], [7, 3], [2, 2], [5, 2], [2, 0]] : [[0, 1], [7, 1], [9, 1], [2, 2], [5, 2]];
      const [deg, count] = pickR(rnd, opts);
      const ps = ruleLine(root, rk, root + 12 + deg, count);
      const names: Names = { c0: nm('None', 'אף אחד', 'none', 'zero'), c1: nm('One', 'אחד', 'one'), c2: nm('Two', 'שניים', 'two'), c3: nm('Three', 'שלושה', 'three') };
      const sym = rk === 'maj' ? `${ROOT[key]}6` : `${ROOT[key]}m6`;
      return choiceQ({
        ...base, difficulty: 1400,
        ask: { en: `${sym}, down from ${DEG_LABEL[deg]}: how many extra half steps?`, he: `${sym}, למטה מ־${DEG_LABEL[deg]}: כמה חצאי טון נוספים?` },
        text: { en: sym, he: sym },
        names, answer: `c${count}`, choices: rk === 'maj' ? ['c0', 'c1', 'c2', 'c3'] : ['c0', 'c1', 'c2'],
        stimulus: [chordStim([root - 12, root - 12 + (rk === 'maj' ? 4 : 3), root - 12 + 9], 0.8), rest(), notesStim(ps, 0.24)],
      });
    }
    if (level === 4) {
      const which = Math.floor(rnd() * 3);
      const r = 48 + mod12(key - 48);
      const arp = (w: number) => IMPORTANT_ARPS[w].ints.map((x) => r + IMPORTANT_ARPS[w].on + x);
      const names: Names = { a0: nm('On 1', 'על 1', 'one', 'root'), a1: nm('The minor on 5', 'המינור על 5', 'five', 'minor'), a2: nm('The major on ♭7', 'המז׳ור על ♭7', 'flat seven', 'seven') };
      return choiceQ({
        ...base, difficulty: 1430,
        ask: { en: `Over ${ROOT[key]}7: which important arpeggio?`, he: `מעל ${ROOT[key]}7: איזה ארפג׳ חשוב?` },
        text: { en: `${ROOT[key]}7`, he: `${ROOT[key]}7` },
        names, answer: `a${which}`, choices: shuffleR(rnd, ['a0', 'a1', 'a2']),
        stimulus: [chordStim([r - 12, r - 8, r - 2], 0.9), rest(), notesStim(arp(which), 0.34)],
        choiceStim: Object.fromEntries([0, 1, 2].map((w) => [`a${w}`, [notesStim(arp(w), 0.34)]])),
      });
    }
    // Level 5: over a minor ii–V, does the line land on the V's 3rd (seven down to the 3rd) or run on down the scale?
    const tonic = 60 + mod12(key - 60) - (mod12(key) > 6 ? 12 : 0);
    const good = rnd() < 0.5;
    const line = sevenDownLine(tonic, 'full');
    const plain = line.map((n, i) => (i === 13 ? { ...n, p: tonic - 2 } : n));
    const names: Names = { yes: nm('Lands on the 3rd', 'נוחת על הטרצה', 'yes', 'third'), no: nm('Plain scale', 'סולם רגיל', 'no', 'plain') };
    const pad = [tonic - 22, tonic - 19, tonic - 16];
    void CHROM_SCALE;
    return choiceQ({
      ...base, difficulty: 1460,
      ask: { en: `${ROOT[mod12(key + 2)]}ø7 – ${ROOT[mod12(key + 7)]}7: seven down to the 3rd, or the plain scale?`, he: `${ROOT[mod12(key + 2)]}ø7 – ${ROOT[mod12(key + 7)]}7: שבע למטה לטרצה, או הסולם הרגיל?` },
      names, answer: good ? 'yes' : 'no', choices: ['yes', 'no'],
      stimulus: [lineStim(good ? line : plain, pad)],
      choiceStim: { yes: [lineStim(line, pad)], no: [lineStim(plain, pad)] },
    });
  },
};
TOPIC_TAGS['bh-line-ear'] = tg(['sequences', 'lines', 1]);

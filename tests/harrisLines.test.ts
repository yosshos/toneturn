// Barry Harris lines (src/engine/harrisLines.ts): the exact notes of the devices the research found missing
// (docs/research/BARRY-HARRIS-METHOD.md Part D), checked against the sources' own examples in C.
import { describe, expect, it } from 'vitest';
import {
  abcThirds,
  arpIntoScale,
  chromaticTwoVoices,
  eightWays,
  outlineFromChart,
  TUNE_CHARTS,
  chromaticArpsDown,
  chromaticScale,
  chromaticUpDown,
  feelSixLine,
  importantArps,
  lick5432,
  miscRuleLine,
  moveModel,
  MOVES,
  mod12,
  OUTLINES,
  phrase5432,
  ruleLine,
  RULE_CT,
  scaleOutline,
  sevenDownLine,
  threeToFlatNine,
  tripletLine,
  type LineNote,
} from '../src/engine/harrisLines';

const N = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const names = (ps: number[]) => ps.map((p) => N[mod12(p)]).join(' ');
const ln = (l: LineNote[]) => names(l.map((n) => n.p));
const onBeats = (l: LineNote[]) => l.filter((n) => Math.abs(n.beat - Math.round(n.beat)) < 1e-6).map((n) => n.p);

describe("Barry's chromatic scale (D1)", () => {
  it('ascending in C major: C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C (the sources)', () => {
    const { line, skips } = chromaticScale(60, 'maj', 'up');
    expect(ln(line)).toBe('C C♯ D E♭ E G F F♯ G A♭ A B♭ B D C');
    expect(names(onBeats(line))).toBe('C D E F G A B C');
    expect(skips.map((i) => N[mod12(line[i].p)])).toEqual(['G', 'D']);
  });
  it('descending in C major mirrors it: the skip goes below and comes back up (verify)', () => {
    const { line, skips } = chromaticScale(60, 'maj', 'down');
    expect(ln(line)).toBe('C A B B♭ A A♭ G F♯ F D E E♭ D C♯ C');
    expect(names(onBeats(line))).toBe('C B A G F E D C');
    expect(skips.map((i) => N[mod12(line[i].p)])).toEqual(['A', 'D']);
  });
  it('the dominant: C C♯ D D♯ E G F F♯ G G♯ A C B♭ B C, and down', () => {
    expect(ln(chromaticScale(60, 'dom', 'up').line)).toBe('C C♯ D E♭ E G F F♯ G A♭ A C B♭ B C');
    expect(ln(chromaticScale(60, 'dom', 'down').line)).toBe('C B B♭ G A A♭ G F♯ F D E E♭ D C♯ C');
  });
  it('the minor 6th-diminished: every degree on a beat, four skips', () => {
    const { line, skips } = chromaticScale(60, 'm6dim', 'up');
    expect(names(onBeats(line))).toBe('C D E♭ F G A♭ A B C');
    expect(skips.length).toBe(4);
  });
  it('up and down: 33 notes, the scale degrees on every beat, in all 12 keys', () => {
    for (let k = 0; k < 12; k++)
      for (const kind of ['maj', 'dom', 'm6dim'] as const) {
        const l = chromaticUpDown(60 + k, kind);
        expect(l[l.length - 1].p).toBe(60 + k);
        for (const n of l) if (Number.isInteger(n.beat)) expect(n.ct, `${kind} ${k} ${n.beat}`).toBe(true);
      }
  });
});

describe('the extra-note rules (D14, D10)', () => {
  it('dominant from 1 (one) and from 3 (three), as the sources write them', () => {
    expect(names(ruleLine(60, 'dom', 72, 1))).toBe('C B B♭ A G F E D C');
    expect(names(ruleLine(60, 'dom', 76, 3))).toBe('E E♭ D C♯ C B B♭ A G');
    expect(names(ruleLine(60, 'dom', 74, 2))).toBe('D C♯ C B B♭ A G F E');
  });
  it('major: one at 6–5, three from the 3rd, two from the 2nd; minor from the root = the m6-dim scale', () => {
    expect(names(ruleLine(60, 'maj', 72, 1))).toBe('C B A A♭ G F E D C');
    expect(names(ruleLine(60, 'maj', 76, 3))).toBe('E E♭ D C♯ C B A A♭ G');
    expect(names(ruleLine(60, 'maj', 74, 2))).toBe('D C♯ C B A A♭ G F E');
    expect(names(ruleLine(60, 'min', 72, 1))).toBe('C B A A♭ G F E♭ D C');
  });
  it('from every chord tone the beats are chord tones, in all 12 keys', () => {
    for (let k = 0; k < 12; k++)
      for (const kind of ['dom', 'maj', 'min'] as const)
        for (const st of RULE_CT[kind]) {
          const ps = ruleLine(60 + k, kind, 72 + k + st, 1);
          ps.forEach((p, i) => {
            if (i % 2 === 0) expect(RULE_CT[kind].includes(mod12(p - k)), `${kind} ${k} ${st} ${i}`).toBe(true);
          });
        }
  });
  it('the miscellaneous rule: G up to C, down by G\'s rule, the extra note in the bottom octave', () => {
    const l = miscRuleLine(60, 'dom', 7, 3);
    expect(ln(l)).toBe('G A B♭ C B♭ A G F E D C B B♭');
    for (const p of onBeats(l)) expect([0, 4, 7, 10]).toContain(mod12(p));
  });
  it('triplets: an 8th triplet follows its middle note, a 16th triplet its first note', () => {
    // a rising 8th triplet from the 9th: middle = the 3rd (a chord tone) → one half step
    const rise = tripletLine(60, 'dom', 4, 'eighth-rise');
    expect(ln(rise)).toBe('D E F E D C B B♭ A G F E');
    // a falling 8th triplet from the 3rd: middle = the 9th → two half steps
    const fall = tripletLine(60, 'dom', 2, 'eighth-fall');
    expect(ln(fall)).toBe('E D C♯ C B B♭ A G F E');
    // a 16th triplet on the root: the root's rule (one)
    const six = tripletLine(60, 'dom', 0, 'sixteenth');
    expect(ln(six)).toBe('C B B♭ A G F E D C');
    for (const l of [rise, fall, six]) for (const p of onBeats(l).slice(1)) expect([0, 4, 7, 10]).toContain(mod12(p));
  });
});

describe('scale outlines (D2)', () => {
  it('Indiana: each chord two bars, up from the root then down by the rule; 1 3 5 7 on the beats going up', () => {
    const { line } = scaleOutline(0, OUTLINES.indiana.chords, 55);
    expect(line.filter((n) => n.beat < 4).map((n) => mod12(n.p))).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(line.filter((n) => n.beat >= 4 && n.beat < 8).map((n) => mod12(n.p))).toEqual([0, 11, 9, 8, 7, 5, 4, 2]);
    for (const n of line) if (Number.isInteger(n.beat)) expect(n.ct, `beat ${n.beat}`).toBe(true);
  });
  it('the blues marks the related diminished in bar 6; every outline fills its form', () => {
    expect(OUTLINES.blues.chords.findIndex((c) => c.dimBar)).toBe(5);
    for (const o of Object.values(OUTLINES)) {
      const beats = o.chords.reduce((a, c) => a + c.beats, 0);
      expect(beats % 4).toBe(0);
      for (let k = 0; k < 12; k++) {
        const { line } = scaleOutline(k, o.chords, 52);
        for (const n of line) if (Number.isInteger(n.beat)) expect(n.ct).toBe(true);
      }
    }
  });
});

describe('Part F: tune outlines in Parks\'s order, two voices, the dominant eight ways', () => {
  it('chart outlines: ii is V, m7♭5 → the dominant a major 3rd down, two-bar chords come back down; beats are chord tones', () => {
    const tun = outlineFromChart(TUNE_CHARTS.tunisia.text, TUNE_CHARTS.tunisia.key);
    expect(tun[6]).toMatchObject({ deg: 10, play: 'dom', beats: 2 }); // Em7♭5 in D minor → C7 (a major 3rd down)
    const hhtm = outlineFromChart(TUNE_CHARTS.hhtm.text, TUNE_CHARTS.hhtm.key);
    expect(hhtm[1].down).toBe(true);
    expect(hhtm[2]).toMatchObject({ deg: 5, play: 'dom' }); // Gm7 in G → the C7 scale (ii is V)
    for (const c of Object.values(TUNE_CHARTS))
      for (let k = 0; k < 12; k++) {
        const { line } = scaleOutline(k, outlineFromChart(c.text, c.key), 52);
        for (const n of line) if (Number.isInteger(n.beat)) expect(n.ct, `${c.name.en} ${k} ${n.beat}`).toBe(true);
      }
  });
  it('the chromatic scale in two voices: along one floor (the A–G pair of the 6 chord is the floor of 2nds)', () => {
    const { pairs } = chromaticTwoVoices(60, 'sixdim', 'up', '3rds');
    for (const [a, b] of pairs) expect([2, 3, 4]).toContain(a - b);
    const six = chromaticTwoVoices(60, 'sixdim', 'up', '6ths').pairs;
    for (const [a, b] of six) expect([8, 9, 10]).toContain(a - b);
  });
  it('the dominant eight ways: up from each degree, down by its rule (verify)', () => {
    expect(ln(eightWays(65, 0)).startsWith('F G A B♭ C D E♭ F E E♭ D')).toBe(true);
    expect(eightWays(65, 7).length).toBe(11);
  });
});

describe('the 5-4-3-2 phrases (D5, verify)', () => {
  it('on C7', () => {
    expect(ln(phrase5432(60, 'dom', 5))).toBe('G B C F E');
    expect(ln(phrase5432(60, 'dom', 4))).toBe('G F D E♭ E');
    expect(ln(phrase5432(60, 'dom', 3))).toBe('E G B♭ D');
    expect(ln(phrase5432(60, 'dom', 2))).toBe('D B♭ B C');
    expect(ln(lick5432(60))).toBe('G B C F D E♭ E G B♭ D B♭ B C');
  });
  it('chord tones land on the beats (the major "2" ends on the 9th, as the attendee notes have it)', () => {
    for (const q of ['dom', 'maj', 'min'] as const)
      for (const n of [5, 3, 2] as const)
        for (const x of phrase5432(60, q, n)) if (Number.isInteger(x.beat) && x.beat > 0 && !(q === 'maj' && n === 2)) expect(x.ct, `${q} ${n} ${x.beat}`).toBe(true);
    expect(ln(phrase5432(60, 'maj', 2))).toBe('D B C C♯ D');
  });
});

describe('the three important arpeggios (D8)', () => {
  it('C7: C E G C, G B♭ D G, B♭ D F B♭', () => {
    expect(ln(importantArps(60, 'up'))).toBe('C E G C G B♭ D G B♭ D F B♭ C');
    expect(ln(importantArps(60, 'down'))).toBe('C G E C G D B♭ G B♭ F D B♭ C');
  });
  it('into the scale: C E G C | E D C B B♭ A G F E', () => {
    expect(ln(arpIntoScale(60, 0))).toBe('C E G C E D C B B♭ A G F E');
    expect(ln(arpIntoScale(60, 1))).toBe('G B♭ D G B♭ A G F E D C B B♭');
    expect(ln(arpIntoScale(60, 2))).toBe('B♭ D F B♭ C B B♭ A G F E D C');
  });
});

describe('seven down to the 3rd (D9)', () => {
  it('Dø–G7 in C minor: B♭7 up, down from A♭ landing on B, then C', () => {
    const l = sevenDownLine(60, 'full');
    expect(ln(l)).toBe('B♭ C D E♭ F G A♭ A♭ G F E♭ D C B C');
    // bar 2's beats are B°7 = G7♭9
    expect(names(l.filter((n) => n.beat >= 4 && n.beat < 8 && Number.isInteger(n.beat)).map((n) => n.p))).toBe('A♭ F D B');
    for (const n of l) if (Number.isInteger(n.beat)) expect(n.ct).toBe(true);
  });
});

describe('3-to-♭9 over the family (D15)', () => {
  it('G7, B♭7, D♭7, E7: always the same four notes, the dim on the 3rd', () => {
    const { line } = threeToFlatNine(60, 'up');
    const sets = [0, 1, 2, 3].map((k) => new Set(line.filter((n) => n.beat >= k * 2 && n.beat < k * 2 + 2).map((n) => mod12(n.p))));
    for (const s of sets) expect([...s].sort((a, b) => a - b)).toEqual([2, 5, 8, 11]);
    expect([0, 4, 7, 9]).toContain(mod12(line[line.length - 1].p));
  });
});

describe('rhythm, arpeggios down, the ABCs, compose (D16, D19, D17)', () => {
  it('feel 6 in 4: dotted quarters over three bars', () => {
    expect(feelSixLine(60, 'dotted').map((n) => n.beat)).toEqual([0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5]);
    expect(feelSixLine(60, 'cells').length).toBe(24);
  });
  it('major arpeggios chromatically down: C G E C, B F♯ D♯ B …', () => {
    expect(ln(chromaticArpsDown(60, 2, 0)).startsWith('C G E C B F♯ E♭ B')).toBe(true);
  });
  it('the ABCs: 3rds with a half step below, as transcribed from the 7th (B C E | C♯ D F | D♯ E G)', () => {
    expect(ln(abcThirds(60, 'half')).startsWith('B C E C♯ D F E♭ E G')).toBe(true);
    expect(ln(abcThirds(60, 'plain')).startsWith('C E D F E G')).toBe(true);
  });
  it('the model line over a move puts a chord tone on every beat', () => {
    for (const m of Object.values(MOVES)) {
      const l = moveModel(0, m.chords, 58, 84, 76);
      let at = 0;
      for (const [d, q, beats] of m.chords) {
        const ct = { '6': [0, 4, 7, 9], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10] }[q].map((x) => mod12(x + d));
        for (const n of l.filter((x) => Number.isInteger(x.beat) && x.beat >= at && x.beat < at + beats)) expect(ct).toContain(mod12(n.p));
        at += beats;
      }
    }
  });
});

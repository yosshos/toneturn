// Barry Harris lines (src/engine/harrisLines.ts): the exact notes of the devices the research found missing
// (docs/research/BARRY-HARRIS-METHOD.md Part D), checked against the sources' own examples in C.
import { describe, expect, it } from 'vitest';
import {
  abcThirds,
  arpIntoScale,
  chromaticTwoVoices,
  DOM_RULE_WAYS,
  CHROM_SCALE,
  ruleDrillLine,
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
  it('the chromatic scale in two voices: a diatonic 3rd / 6th / 10th under every scale degree, chromatics in parallel', () => {
    const SPAN = { '3rds': [3, 4], '6ths': [8, 9], '10ths': [15, 16], '2nds': [1, 2], '4ths': [5, 6], '5ths': [6, 7], '7ths': [10, 11], octaves: [12] } as const;
    for (const kind of ['maj', 'dom'] as const)
      for (const iv of Object.keys(SPAN) as (keyof typeof SPAN)[])
        for (let k = 0; k < 12; k++) {
          const { pairs, line } = chromaticTwoVoices(60 + k, kind, iv);
          expect(pairs.length).toBe(line.length);
          pairs.forEach(([a, b], i) => {
            expect(a).toBe(line[i].p);
            // every interval is the diatonic one (a chromatic pair copies the next pair's interval)
            expect(SPAN[iv] as readonly number[], `${kind} ${iv} ${k} ${i}`).toContain(a - b);
            // the lower voice of a scale degree is itself in the scale
            if (CHROM_SCALE[kind].includes(mod12(a - 60 - k))) expect(CHROM_SCALE[kind]).toContain(mod12(b - 60 - k));
          });
        }
    // C major in 3rds: C/A, C♯/A♯, D/B, D♯/B, E/C, G/E, F/D
    const { pairs } = chromaticTwoVoices(60, 'maj', '3rds');
    expect(pairs.slice(0, 7).map(([a, b]) => `${N[mod12(a)]}/${N[mod12(b)]}`).join(' ')).toBe('C/A C♯/B♭ D/B E♭/B E/C G/E F/D');
  });
  it('the dominant rules from every degree (Barry\'s half-step rules, §8)', () => {
    // each degree once; one from 1, one or three from 3 / 5 / ♭7, none or two from 2 / 4 / 6
    const allowed: Record<number, number[]> = { 0: [1], 4: [1, 3], 7: [1, 3], 10: [1, 3], 2: [0, 2], 5: [0, 2], 9: [0, 2] };
    for (const [deg, count] of DOM_RULE_WAYS) expect(allowed[deg], `${deg} ${count}`).toContain(count);
    expect(new Set(DOM_RULE_WAYS.map((w) => w[0])).size).toBe(7);
    const line = (deg: number, c: 0 | 1 | 2 | 3) => names(ruleDrillLine(60, 'dom', deg + 12, c).slice(0, 12).map((n) => n.p));
    expect(line(0, 1).startsWith('C B♭ A G F E D C B B♭')).toBe(false); // the 1–♭7 half step: C B B♭
    expect(line(0, 1).startsWith('C B B♭ A G F E D C')).toBe(true);
    expect(line(4, 3).startsWith('E E♭ D C♯ C B B♭ A G')).toBe(true);
    expect(line(10, 1).startsWith('B♭ A G F E D C B B♭')).toBe(true);
    expect(line(2, 0).startsWith('D C B♭ A G F E D C')).toBe(true);
    expect(line(2, 2).startsWith('D C♯ C B B♭ A G F E')).toBe(true);
    // in every key, from a chord tone with one half step, the chord tones land on every beat (with three, the run's middle note falls on a beat until the chord tones resume)
    for (const [deg, count] of DOM_RULE_WAYS.filter(([d, c]) => RULE_CT.dom.includes(d) && c === 1))
      for (let k = 0; k < 12; k++)
        for (const n of ruleDrillLine(60 + k, 'dom', deg + 12, count)) if (Number.isInteger(n.beat)) expect(RULE_CT.dom, `${deg} ${count} ${k} ${n.beat}`).toContain(mod12(n.p - 60 - k));
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
  it('G7, B♭7, D♭7, E7: always the same four notes, the dim on the 3rd — one dominant per bar (owner 2026-11-23)', () => {
    for (const dir of ['up', 'down'] as const) {
      const { line } = threeToFlatNine(60, dir);
      const bars = [0, 1, 2, 3].map((k) => line.filter((n) => n.beat >= k * 4 && n.beat < k * 4 + 4));
      for (const b of bars) expect([...new Set(b.map((n) => mod12(n.p)))].sort((a, z) => a - z)).toEqual([2, 5, 8, 11]);
      // each bar starts on its own dominant's 3rd (up) or its ♭9 an octave up (down): B, D, F, A♭
      expect(bars.map((b) => mod12(b[0].p))).toEqual([11, 2, 5, 8]);
      expect(line[line.length - 1].beat).toBe(16);
      expect([0, 4, 7, 9]).toContain(mod12(line[line.length - 1].p));
    }
  });
  it('two dominants a bar at the advanced level (owner 2026-11-23): two beats each, home on beat 8', () => {
    for (const dir of ['up', 'down'] as const) {
      const { line } = threeToFlatNine(60, dir, 2);
      expect(line.length).toBe(17);
      for (let k = 0; k < 4; k++) expect(line.filter((n) => n.beat >= k * 2 && n.beat < k * 2 + 2).length).toBe(4);
      expect(line[line.length - 1].beat).toBe(8);
      expect([0, 4, 7, 9]).toContain(mod12(line[line.length - 1].p));
    }
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
  it('the ABCs: note by note, in 3rds, then a half step below the first note of each 3rd, up and down', () => {
    expect(ln(abcThirds(60, 'notes'))).toBe('C D E F G A B C B A G F E D C');
    expect(ln(abcThirds(60, 'plain')).startsWith('C E D F E G')).toBe(true);
    expect(ln(abcThirds(60, 'half-up'))).toBe('B C E C♯ D F E♭ E G E F A F♯ G B A♭ A C B♭ B D B C E C');
    expect(ln(abcThirds(60, 'half-down'))).toBe('B C A B♭ B G A♭ A F F♯ G E E F D E♭ E C C♯ D B C');
    // triplets: three notes a beat, the half step on the beat
    const l = abcThirds(60, 'half-up');
    expect(l.slice(0, 3).map((n) => n.beat)).toEqual([0, 0.333333, 0.666667]);
    // every key: the first note of each cell is a half step below the second, the third a diatonic 3rd from it
    for (let k = 0; k < 12; k++)
      for (const shape of ['half-up', 'half-down'] as const) {
        const x = abcThirds(60 + k, shape);
        for (let i = 0; i + 2 < x.length - 1; i += 3) {
          expect(x[i + 1].p - x[i].p).toBe(1);
          expect([3, 4]).toContain(Math.abs(x[i + 2].p - x[i + 1].p));
        }
      }
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

describe("Barry's chromatic scale, owner-confirmed (2026-11-15): every scale tone on a beat", () => {
  it('major, dominant and minor 6-dim, up, down and up-and-down, in all 12 keys', () => {
    for (const kind of ['maj', 'dom', 'm6dim'] as const)
      for (let k = 0; k < 12; k++) {
        const root = 60 + k;
        const sc = CHROM_SCALE[kind];
        const inSc = (p: number) => sc.includes(mod12(p - root));
        const forms = [chromaticScale(root, kind, 'up').line, chromaticScale(root, kind, 'down').line, chromaticUpDown(root, kind)];
        for (const line of forms) {
          // every note on a beat is a scale tone (the chromatic notes and the skips fall between)
          for (const n of line) if (Number.isInteger(n.beat)) expect(inSc(n.p), `${kind} ${k} ${n.beat}`).toBe(true);
          // and every scale degree of the octave lands on a beat
          const onBeat = new Set(line.filter((n) => Number.isInteger(n.beat)).map((n) => mod12(n.p - root)));
          for (const d of sc) expect(onBeat.has(d), `${kind} ${k} degree ${d}`).toBe(true);
          // in even 8ths
          line.forEach((n, i) => expect(n.beat).toBeCloseTo(i / 2));
        }
      }
    expect(ln(chromaticScale(60, 'maj', 'down').line)).toBe('C A B B♭ A A♭ G F♯ F D E E♭ D C♯ C');
    expect(ln(chromaticScale(60, 'dom', 'up').line)).toBe('C C♯ D E♭ E G F F♯ G A♭ A C B♭ B C');
  });
});

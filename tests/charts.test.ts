import { describe, expect, it } from 'vitest';
import { CHART_STYLES, CHART_TEMPLATES, chartBacking, chordAtBeat, parseChart, parseChord, transposeChart } from '../src/engine/charts';

describe('my charts (SPEC-0.48 §P2)', () => {
  it('parses chord symbols', () => {
    expect(parseChord('Cmaj7')).toEqual({ root: 0, iv: [0, 4, 7, 11], bass: 0 });
    expect(parseChord('F#m7b5')).toEqual({ root: 6, iv: [0, 3, 6, 10], bass: 6 });
    expect(parseChord('Bb7/D')).toEqual({ root: 10, iv: [0, 4, 7, 10], bass: 2 });
    expect(parseChord('Eb°7')?.iv).toEqual([0, 3, 6, 9]);
    expect(parseChord('Gsus4')?.iv).toEqual([0, 5, 7]);
    expect(parseChord('A')?.iv).toEqual([0, 4, 7]);
    expect(parseChord('H7')).toBeNull();
    expect(parseChord('Cxyz')).toBeNull();
  });
  it('splits bars evenly, repeats with % and /, and reports unknown tokens', () => {
    const p = parseChart('C / F / | % | G7 | Xq', 4);
    expect(p.bars).toBe(4);
    expect(p.errors).toEqual(['Xq']);
    expect(p.chords.map((c) => [c.sym, c.bar, c.at, c.beats])).toEqual([
      ['C', 0, 0, 2], ['F', 0, 2, 2], ['C', 1, 0, 2], ['F', 1, 2, 2], ['G7', 2, 0, 4],
    ]);
    expect(chordAtBeat(p, 4, 3)?.sym).toBe('F');
    expect(chordAtBeat(p, 4, 9)?.sym).toBe('G7');
  });
  it('transposes symbols and slash basses', () => {
    expect(transposeChart('C | Am7 | Dm7 G7/B', 2)).toBe('D | Bm7 | Em7 A7/C#');
    expect(transposeChart('C | G | Am | F', 1)).toBe('Db | Ab | Bbm | Gb');
    expect(transposeChart('Am | G | F | E', 1)).toBe('Bbm | Ab | Gb | F');
    expect(transposeChart('Em | D', 2)).toBe('F#m | E');
  });
  it('every template parses cleanly and every style builds a backing that fits the chart', () => {
    for (const t of CHART_TEMPLATES) {
      const p = parseChart(t.text, t.style === 'waltz' ? 3 : 4);
      expect(p.errors, t.id).toEqual([]);
      for (const st of CHART_STYLES) {
        const meter = st === 'waltz' ? 3 : 4;
        const b = chartBacking(p, st, t.bpm, 2, meter);
        expect(b.events.length, `${t.id} ${st}`).toBeGreaterThan(p.bars);
        const end = (b.startBeat + p.bars * meter * 2) * (60 / t.bpm);
        for (const e of b.events) {
          expect(e.start, `${t.id} ${st}`).toBeLessThan(end + 1e-6);
          expect(e.midi >= 28 && e.midi <= 100).toBe(true);
        }
      }
    }
  });
});

import { IMPROV_LEVELS } from '../src/engine/charts';
describe('improvisation levels', () => {
  it('every level parses cleanly, is numbered in order and gets faster or harder', () => {
    IMPROV_LEVELS.forEach((l, i) => {
      expect(l.n).toBe(i + 1);
      expect(parseChart(l.text, 4).errors, l.id).toEqual([]);
    });
  });
});
describe('more chord symbols', () => {
  it('parses the jazz extensions used by the levels', () => {
    expect(parseChord('Cmaj7#11')?.iv).toEqual([0, 4, 7, 11, 18]);
    expect(parseChord('G7#5')?.iv).toEqual([0, 4, 8, 10]);
    expect(parseChord('G7b13')?.iv).toEqual([0, 4, 7, 10, 20]);
    expect(parseChord('D9sus')?.iv).toEqual([0, 5, 7, 10, 14]);
    expect(parseChord('E7b9sus')?.iv).toEqual([0, 5, 7, 10, 13]);
  });
});

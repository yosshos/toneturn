import { describe, expect, it } from 'vitest';
import '../src/engine/topicsChartAnalysis';
import { functionOf, twoFives } from '../src/engine/topicsChartAnalysis';
import { TOPIC_GEN } from '../src/engine/topicKit';
import { parseChart } from '../src/engine/charts';

describe('lead-sheet analysis', () => {
  it('finds ii–Vs by bar, inside a bar and across the bar line', () => {
    expect(twoFives(parseChart('Dm7 | G7 | Cmaj7 | Em7 A7 | Dm7 G7')).map((x) => `${x.from}-${x.to}`)).toEqual(['1-2', '4-4', '5-5']);
  });
  it('names what a chord does from where it goes', () => {
    const p = parseChart('Cmaj7 | A7 | Dm7 | G7 | Cmaj7 | Db7 | Cmaj7');
    const c = p.chords;
    expect(functionOf(c[1], c[2], 0)).toBe('secondary');
    expect(functionOf(c[2], c[3], 0)).toBe('two');
    expect(functionOf(c[3], c[4], 0)).toBe('dominant');
    expect(functionOf(c[5], c[6], 0)).toBe('tritone');
  });
  it('every level makes answerable items with the chart on the page', () => {
    const T = TOPIC_GEN['chart-analysis'];
    for (let level = 1; level <= T.levels.length; level++)
      for (let s = 1; s <= 30; s++) {
        const q = T.gen(s * 31, level, 'q') as { choices: string[]; answer: string; text?: { en: string } };
        expect(q.choices, `L${level} s${s}`).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        expect((q as { chart?: { bars: string[] } }).chart?.bars.length).toBeGreaterThan(3);
      }
  });
});

import { describe, expect, it } from 'vitest';
import { parseChart, sliceChart } from '../src/engine/charts';

describe('sliceChart (COURSE-FEEDBACK-UI slice 3: the chart player loop)', () => {
  const p = parseChart('Dm7 | G7 | Cmaj7 | Cmaj7 A7 | Dm7 | G7 | C6 | C6', 4);
  it('takes the bars, re-based to bar 0', () => {
    const s = sliceChart(p, 2, 3, 4);
    expect(s.bars).toBe(2);
    expect(s.chords.map((c) => [c.sym, c.bar, c.at])).toEqual([
      ['Cmaj7', 0, 0],
      ['Cmaj7', 1, 0],
      ['A7', 1, 2],
    ]);
  });
  it('a range given backwards is the same range; out of range is clamped', () => {
    expect(sliceChart(p, 3, 2, 4)).toEqual(sliceChart(p, 2, 3, 4));
    expect(sliceChart(p, 6, 99, 4).bars).toBe(2);
  });
  it('a bar with no chord of its own gets the chord sounding into it', () => {
    const q = parseChart('C | % | F | G', 4);
    const s = sliceChart(q, 1, 1, 4);
    expect(s.chords.length).toBeGreaterThan(0);
    expect(s.chords[0].bar).toBe(0);
    expect(s.chords[0].at).toBe(0);
    expect(s.chords[0].beats).toBeLessThanOrEqual(4);
  });
  it('no chord lasts past the loop', () => {
    const s = sliceChart(p, 0, 0, 4);
    for (const c of s.chords) expect(c.bar * 4 + c.at + c.beats).toBeLessThanOrEqual(4);
  });
});

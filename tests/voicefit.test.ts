import { describe, expect, it } from 'vitest';
import { fitLessonToRange, fitQuestion, octaveShiftInto, sungNotes } from '../src/engine/voiceFit';
import { makeLesson, singSeqQuestion, type Question } from '../src/engine/lesson';
import { pc } from '../src/engine/pitch';
import { melodyGame } from '../src/engine/memory';

const inRange = (q: Question, r: { low: number; high: number }) => (sungNotes(q) ?? []).every((m) => m >= r.low && m <= r.high);

describe('sung exercises stay inside the range', () => {
  it('octave shift picks the fit nearest the centre', () => {
    expect(octaveShiftInto([60, 64, 67], { low: 43, high: 57 })).toBe(-12);
    expect(octaveShiftInto([60, 72], { low: 50, high: 60 })).toBeNull();
  });
  it('every sung question of every singing lesson fits a low voice and a high voice', () => {
    for (const r of [{ low: 43, high: 57 }, { low: 60, high: 76 }, { low: 52, high: 64 }]) {
      for (const id of ['sing-home-five', 'sing-names', 'sing-degrees', 'runs', 'songs', 'note-sequences'] as const) {
        const def = fitLessonToRange(makeLesson(id, 7), r);
        for (const q of def.questions) if (sungNotes(q)) expect(inRange(q, r)).toBe(true);
      }
    }
  });
  it('the reference moves with the sung notes; intervals are unchanged', () => {
    const q = singSeqQuestion('a', pc('C'), [1, 3, 5]);
    const f = fitQuestion(q, { low: 40, high: 55 })!;
    expect(f.kind).toBe('sing-seq');
    const before = (q as { midis: number[] }).midis;
    const after = (f as { midis: number[] }).midis;
    expect(after.map((m, i) => m - before[i]).every((d) => d === after[0] - before[0])).toBe(true);
    expect(Math.abs((after[0] - before[0]) % 12)).toBe(0);
  });
  it('Echo Chain pads sit inside the range when sung', () => {
    const g = melodyGame(5, [1, 2, 3, 5], { low: 45, high: 58 });
    for (const p of g.pads) {
      expect(p.midi).toBeGreaterThanOrEqual(45);
      expect(p.midi).toBeLessThanOrEqual(58);
    }
  });
});

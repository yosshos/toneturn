import { describe, expect, it } from 'vitest';
import { answerFormat, pcToMidi } from '../src/engine/answerFormat';

const many = (n: number, rate: number) => Array.from({ length: n }, (_, i) => i / n < rate);

describe('the answer ladder (names → hint → staff)', () => {
  it('new material and little evidence stay on names', () => {
    expect(answerFormat({ recent: many(40, 1), seed: 'a', isNew: true })).toBe('names');
    expect(answerFormat({ recent: many(5, 1), seed: 'a' })).toBe('names');
    expect(answerFormat({ recent: many(20, 0.5), seed: 'a' })).toBe('names');
  });
  it('solid but not yet 80 % → names with a staff hint', () => {
    expect(answerFormat({ recent: many(20, 0.7), seed: 'a' })).toBe('hint');
  });
  it('weak reading keeps it on the hint', () => {
    expect(answerFormat({ recent: many(40, 1), reading: many(20, 0.3), seed: 'x' })).toBe('hint');
  });
  it('once unlocked, staves mix in — about a third, never three in a row', () => {
    const fmts = Array.from({ length: 300 }, (_, i) => answerFormat({ recent: many(25, 0.85), seed: `s${i}` }));
    const staff = fmts.filter((f) => f === 'staff').length / fmts.length;
    expect(staff).toBeGreaterThan(0.2);
    expect(staff).toBeLessThan(0.5);
    expect(answerFormat({ recent: many(25, 0.85), seed: 'z', prev: ['hint', 'hint'] })).not.toBe('hint');
  });
  it('a pitch class lands on the treble staff', () => {
    expect(pcToMidi('E', -1)).toBe(63);
    expect(pcToMidi('C', 0)).toBe(60);
  });
});

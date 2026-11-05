import { describe, expect, it } from 'vitest';
import { FIRST_TRIO, randomTrio, spellUp } from '../src/engine/heroTrio';
import { mulberry32 } from '../src/engine/lesson';
import { pcValue } from '../src/engine/pitch';

const SEMIS: Record<string, number> = { m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, '♯4': 6, '♭5': 6, P5: 7, m6: 8, M6: 9, m7: 10, M7: 11 };
const SIZE: Record<string, number> = { m2: 2, M2: 2, m3: 3, M3: 3, P4: 4, '♯4': 4, '♭5': 5, P5: 5, m6: 6, M6: 6, m7: 7, M7: 7 };
const LET = 'CDEFGAB';

describe('home art: notes and intervals', () => {
  it('spells intervals correctly (B→F is a ♭5, F→A♭ is a minor 3rd)', () => {
    expect(spellUp({ letter: 'B', acc: 0 }, 5, 6)).toEqual({ letter: 'F', acc: 0 });
    expect(spellUp({ letter: 'F', acc: 0 }, 3, 3)).toEqual({ letter: 'A', acc: -1 });
    expect(FIRST_TRIO.intervalLeft).toBe('♭5');
  });
  it('every random trio is consistent: semitones and letter distance match the labels', () => {
    const rnd = mulberry32(5);
    for (let i = 0; i < 300; i++) {
      const t = randomTrio(rnd);
      for (const [a, b, lab] of [
        [t.left, t.mid, t.intervalLeft],
        [t.mid, t.right, t.intervalRight],
      ] as const) {
        expect((pcValue(b) - pcValue(a) + 12) % 12).toBe(SEMIS[lab]);
        expect(((LET.indexOf(b.letter) - LET.indexOf(a.letter) + 7) % 7) + 1).toBe(SIZE[lab]);
        expect(Math.abs(b.acc)).toBeLessThanOrEqual(1);
      }
    }
  });
});

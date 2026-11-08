import { describe, expect, it } from 'vitest';
import { ensureGates, flightRange, makeCourse } from '../src/engine/flight';

describe('Voice Flight stays inside the singer’s range (0.52)', () => {
  it('never widens a narrow range, and every gate is a note the singer can sing', () => {
    for (const r of [{ low: 48, high: 57 }, { low: 43, high: 62 }, { low: 60, high: 79 }]) {
      const fr = flightRange(r, 'voice');
      expect(fr).toEqual(r);
      for (let seed = 1; seed <= 20; seed++) {
        const c = makeCourse(seed, 3, fr);
        for (const g of ensureGates(c, 40)) {
          expect(g.center, `seed ${seed}`).toBeGreaterThanOrEqual(r.low);
          expect(g.center, `seed ${seed}`).toBeLessThanOrEqual(r.high);
        }
      }
    }
  });
});

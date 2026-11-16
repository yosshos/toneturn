import { describe, expect, it } from 'vitest';
import { limbChips } from '../src/engine/drills/review';

describe('limbChips (COURSE-FEEDBACK-UI slice 6)', () => {
  it('splits by drum in kit order: early, on time, late, missed', () => {
    const chips = limbChips({
      windowMs: 45,
      voices: [
        { voice: 'kick', mean: -22, n: 8, of: 8 },
        { voice: 'snare', mean: 4, n: 4, of: 4 },
        { voice: 'hihat', mean: 30, n: 6, of: 8 },
        { voice: 'hhOpen', mean: 10, n: 2, of: 2 },
        { voice: 'tom1', mean: null, n: 0, of: 3 },
      ],
    });
    expect(chips.map((c) => c.voice)).toEqual(['hihat', 'snare', 'tom1', 'kick']);
    // open hat folds into the hat: (30·6 + 10·2) / 8 = 25 → late beyond a third of the window (15)
    expect(chips[0]).toEqual({ voice: 'hihat', mean: 25, state: 'late' });
    expect(chips[1].state).toBe('ok');
    expect(chips[2].state).toBe('miss');
    expect(chips[3]).toEqual({ voice: 'kick', mean: -22, state: 'early' });
  });
  it('a tight window still allows 8 ms either side; under half hit is a miss', () => {
    const chips = limbChips({ windowMs: 12, voices: [{ voice: 'snare', mean: -7, n: 5, of: 5 }, { voice: 'kick', mean: 2, n: 1, of: 4 }] });
    expect(chips.find((c) => c.voice === 'snare')!.state).toBe('ok');
    expect(chips.find((c) => c.voice === 'kick')!.state).toBe('miss');
  });
  it('at most four chips', () => {
    const vs = (['crash', 'ride', 'hihat', 'snare', 'tom1', 'kick'] as const).map((voice) => ({ voice, mean: 0, n: 2, of: 2 }));
    expect(limbChips({ windowMs: 40, voices: vs })).toHaveLength(4);
  });
});

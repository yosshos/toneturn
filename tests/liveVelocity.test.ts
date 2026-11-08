import { describe, expect, it } from 'vitest';
import { liveVelocity } from '../src/audio/piano';

describe('MIDI touch response', () => {
  it('normal is linear, light lifts soft notes, heavy lowers them, fixed ignores velocity', () => {
    expect(liveVelocity(127, 'normal')).toBe(1);
    expect(liveVelocity(64, 'normal')).toBeCloseTo(64 / 127, 3);
    expect(liveVelocity(40, 'light')).toBeGreaterThan(liveVelocity(40, 'normal'));
    expect(liveVelocity(40, 'heavy')).toBeLessThan(liveVelocity(40, 'normal'));
    expect(liveVelocity(10, 'fixed')).toBe(liveVelocity(120, 'fixed'));
    expect(liveVelocity(1, 'heavy')).toBeGreaterThanOrEqual(0.08);
  });
});

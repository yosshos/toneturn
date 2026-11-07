import { describe, expect, it } from 'vitest';
import { analyzePedal } from '../src/engine/drills/pedal';

const beat = 1000; // bpm 60
describe('sustain pedal grading (CC64)', () => {
  const changes = [0, 4, 8, 12];
  it('legato pedal: up at the change, down just after → clean', () => {
    const ev = changes.flatMap((b, i) => (i === 0 ? [{ at: 100, down: true }] : [{ at: b * beat + 10, down: false }, { at: b * beat + 150, down: true }]));
    const r = analyzePedal({ style: 'legato', changes }, ev, 60);
    expect(r.pass).toBe(true);
    expect(r.ok).toBe(4);
  });
  it('legato pedal pressed together with the chord → early-down; never lifted → no-up', () => {
    const early = changes.flatMap((b) => [{ at: b * beat - 50, down: false }, { at: b * beat + 5, down: true }]);
    expect(analyzePedal({ style: 'legato', changes }, early, 60).perChange.slice(1).every((c) => c.why === 'early-down')).toBe(true);
    const held = [{ at: 0, down: true }];
    const r = analyzePedal({ style: 'legato', changes }, held, 60);
    expect(r.pass).toBe(false);
    expect(r.perChange[1].why).toBe('no-up');
  });
  it('direct pedal: down with the bass, up before the next; holding through blurs', () => {
    const good = changes.flatMap((b) => [{ at: b * beat + 20, down: true }, { at: b * beat + 3800, down: false }]);
    expect(analyzePedal({ style: 'direct', changes }, good, 60).pass).toBe(true);
    const blur = [{ at: 10, down: true }];
    expect(analyzePedal({ style: 'direct', changes }, blur, 60).perChange[0].why).toBe('blur');
  });
});

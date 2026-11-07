import { describe, expect, it } from 'vitest';
import { inputLatency, latencyFrom } from '../src/engine/latency';

describe('input latency calibration', () => {
  const beat = 60000 / 90;
  const clicks = (n: number, off: number, jitter: (i: number) => number = () => 0) => Array.from({ length: n }, (_, i) => 1000 + i * beat + off + jitter(i));
  it('a steady player 60 ms late → 60 ms, saved', () => {
    const r = latencyFrom(1000, clicks(16, 60, (i) => ((i * 7) % 5) - 2), 90)!;
    expect(r.ms).toBeGreaterThanOrEqual(58);
    expect(r.ms).toBeLessThanOrEqual(62);
    expect(r.ok).toBe(true);
    expect(r.n).toBe(12); // 4 warm-up clicks skipped
  });
  it('one stray hit does not move it; an unsteady take is not saved', () => {
    const one = latencyFrom(1000, [...clicks(16, 40), 1000 + 9 * beat + 200], 90)!;
    expect(one.ms).toBe(40);
    const shaky = latencyFrom(1000, clicks(16, 40, (i) => (i % 2 ? 80 : -80)), 90)!;
    expect(shaky.ok).toBe(false);
  });
  it('too few hits → null; defaults per input', () => {
    expect(latencyFrom(1000, clicks(5, 0), 90)).toBeNull();
    expect(inputLatency({}, 'mic')).toBe(70);
    expect(inputLatency({ midiLatencyMs: 25 }, 'midi')).toBe(25);
    expect(inputLatency({ tapLatencyMs: 30 }, 'tap')).toBe(30);
  });
});

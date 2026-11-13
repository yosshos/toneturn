import { describe, expect, it } from 'vitest';
import { dueIndex, pulseClicks, type Pulse } from '../src/ui/PulseNotes';

const p: Pulse = { beat: 0.5, onsets: [0, 0.5, 1, 1.5], countIn: 4, length: 2 };

describe('pulse now-cue', () => {
  it('counts in a full bar, accent first', () => {
    const { events } = pulseClicks(p, false);
    expect(events).toHaveLength(4);
    expect(events[0].perc).toBe('accent');
    expect(events.map((e) => e.start)).toEqual([0, 0.5, 1, 1.5]);
  });
  it('keeps clicking through the take when the click is on', () => {
    const { events, length } = pulseClicks(p, true);
    const through = events.slice(4);
    expect(through[0].start).toBe(2); // first beat right after the count-in
    expect(through.length).toBeGreaterThanOrEqual(p.length / p.beat);
    expect(length).toBeGreaterThan(2 + p.length);
  });
  it('lights the note that is due', () => {
    expect(dueIndex(p.onsets, -0.3, 0.5)).toBe(-1);
    expect(dueIndex(p.onsets, 0, 0.5)).toBe(0);
    expect(dueIndex(p.onsets, 0.74, 0.5)).toBe(1);
    expect(dueIndex(p.onsets, 1.6, 0.5)).toBe(3);
    expect(dueIndex(p.onsets, 2.2, 0.5)).toBe(4); // past the end: nothing lit
  });
});

import { describe, expect, it } from 'vitest';
import { backingTrack, chartBeats, checkVoicing, chordAt, chordSymbol, hasGuideTones, improvReport, scaleEvenness, synthImprov, CIRCLE_KEYS } from '../src/engine/perform';
import { synthHold } from '../src/engine/vocal';

describe('performance (spec V.4–V.7)', () => {
  it('charts and symbols', () => {
    expect(chartBeats('ii-V-I')).toBe(16);
    expect(chartBeats('blues')).toBe(48);
    expect(chordSymbol(0, chordAt('ii-V-I', 0))).toBe('Dm7');
    expect(chordSymbol(0, chordAt('ii-V-I', 5))).toBe('G7');
    expect(chordSymbol(5, chordAt('blues', 4 * 4))).toBe('B♭7');
  });
  it('the backing track has a count-in, a bass note on every beat, and fits its length', () => {
    const b = backingTrack('ii-V-I', 0, 120, 2);
    const beat = 0.5;
    const bass = b.events.filter((e) => e.velocity === 0.7 && e.start >= 4 * beat - 1e-6);
    expect(bass.length).toBe(32);
    expect(Math.max(...b.events.map((e) => e.start))).toBeLessThan(b.length);
    expect(bass[0].midi % 12).toBe(2); // D under Dm7
  });
  it('a chord-tone line with approaches scores well; a single held note does not', () => {
    const good = improvReport(synthImprov('ii-V-I', 0, 100, 2), 'ii-V-I', 0, 100);
    expect(good.strongChordTones).toBeGreaterThan(0.8);
    expect(good.endsOnChordTone).toBe(true);
    expect(good.rhythmicVariety).toBeGreaterThanOrEqual(2);
    expect(good.score).toBeGreaterThan(0.7);
    const flat = improvReport(synthHold(61, { seconds: 8 }), 'ii-V-I', 0, 100);
    expect(flat.score).toBeLessThan(0.4);
  });
  it('voicing checks', () => {
    expect(checkVoicing([50, 53, 57, 60], 2, 'm7', 'any').ok).toBe(true); // D F A C
    expect(checkVoicing([50, 53, 60], 2, 'm7', 'shell').ok).toBe(true); // D F C
    expect(checkVoicing([53, 50, 60, 64], 2, 'm7', 'shell').ok).toBe(false);
    expect(checkVoicing([53, 57, 60, 64], 2, 'm7', 'rootless').ok).toBe(true); // F A C E
    expect(hasGuideTones([59, 65], 7, 'dom7')).toBe(true); // B and F over G7
    expect(CIRCLE_KEYS.slice(0, 3)).toEqual([0, 5, 10]);
  });
  it('scale evenness', () => {
    expect(scaleEvenness([0, 250, 500, 750, 1000])).toBeCloseTo(0, 5);
    expect(scaleEvenness([0, 100, 500, 600, 1000])).toBeGreaterThan(0.5);
  });
});

import { clockPlan, clockReport } from '../src/engine/perform';
describe('internal clock', () => {
  const p = clockPlan(100, 4);
  it('steady taps score high; a slowly rushing player is told so; no taps = lost', () => {
    const steady = Array.from({ length: p.totalBeats }, (_, i) => i * p.beat + 0.01);
    expect(clockReport(p, steady).verdict).toBe('steady');
    expect(clockReport(p, steady).score).toBeGreaterThan(0.9);
    const rush = Array.from({ length: p.totalBeats }, (_, i) => i * p.beat * 0.99);
    expect(clockReport(p, rush).verdict).toBe('rushing');
    expect(clockReport(p, []).verdict).toBe('lost');
    expect(p.audible.length).toBe(12);
  });
});

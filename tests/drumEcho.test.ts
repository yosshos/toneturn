import { describe, expect, it } from 'vitest';
import { drumPattern, gradeRhythm, rhythmPattern, rhythmTimeline, splitRhythm } from '../src/engine/memory';

describe('Drum Echo (kick & snare)', () => {
  it('builds a groove: kick on 1, both drums in every phrase, the same seed gives the same phrase', () => {
    for (let seed = 1; seed < 40; seed++) {
      const p = drumPattern(rhythmPattern(seed, 4), seed);
      expect(p.drums).toHaveLength(p.onsets.length);
      expect(p.drums![0]).toBe('k');
      if (p.onsets.length > 1) expect(p.drums).toContain('s');
      expect(drumPattern(rhythmPattern(seed, 4), seed).drums).toEqual(p.drums);
    }
  });

  it('the timeline carries the drum of each hit', () => {
    const p = drumPattern(rhythmPattern(7, 4), 7);
    const tl = rhythmTimeline(p);
    expect(tl.drums).toEqual(p.drums);
    expect(tl.wood).toHaveLength(p.onsets.length);
  });

  it('right times on the wrong drum do not pass', () => {
    const p = drumPattern(rhythmPattern(3, 4), 3);
    const beatMs = 60000 / p.bpm;
    const taps = p.onsets.map((o) => o * beatMs);
    expect(gradeRhythm(p, taps, undefined, p.drums).pass).toBe(true);
    const swapped = p.drums!.map((d) => (d === 'k' ? 's' : 'k'));
    const g = gradeRhythm(p, taps, undefined, swapped);
    expect(g.pass).toBe(false);
    expect(g.hits.every((h) => h.offsetMs === null)).toBe(true);
    expect(splitRhythm(p, taps, swapped).memoryPass).toBe(false);
    // Without drum info (one pad) only timing counts, as before.
    expect(gradeRhythm(p, taps).pass).toBe(true);
  });
});

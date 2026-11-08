import { describe, expect, it } from 'vitest';
import { addPerformance, emptyGroove, grooveFindings, weekKey } from '../src/engine/analysis/groove';

describe('groove fingerprint (0.50)', () => {
  it('finds rushing after rests and speeding up across a phrase; a steady player is steady', () => {
    let g = emptyGroove();
    let s = emptyGroove();
    let x = 3;
    const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647 - 0.5) * 10;
    for (let k = 0; k < 30; k++) {
      // quarter, quarter, rest (2 beats), then eighths: the note after the rest comes 35 ms early; the phrase drifts early
      const onsets = [0, 1, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5];
      const offs = onsets.map((b, i) => (i === 2 ? -35 : 0) - b * 4 + rnd());
      g = addPerformance(g, onsets, offs, 100, 4, new Date('2026-11-08'));
      s = addPerformance(s, onsets, onsets.map(() => rnd()), 100, 4, new Date('2026-11-08'));
    }
    const kinds = grooveFindings(g).map((f) => `${f.kind}:${f.ctx}`);
    expect(kinds).toContain('rush:after-rest');
    expect(kinds).toContain('speeds-up:drift');
    expect(grooveFindings(s).map((f) => f.kind)).toEqual(['steady']);
    expect(weekKey(new Date('2026-11-08'))).toBe('2026-W45');
  });
});

import { fadePlan, heldSilent, matchTaps, pocketScore, swingOf } from '../src/engine/analysis/grooveTrainer';
describe('groove trainer (0.50)', () => {
  it('the fading click grows the silence', () => {
    expect(fadePlan(2)).toEqual([true, true, false, true, true, false, false, true, true]);
  });
  it('matches taps to beats and judges a silent stretch', () => {
    const beat = 600;
    const taps = [10, 590, 1220, 1830, 2400];
    expect(matchTaps(taps, 0, beat, 5)).toEqual([10, -10, 20, 30, 0]);
    expect(heldSilent([10, -10, 20, 30, 0], beat).held).toBe(true);
    expect(heldSilent([10, 60, 120, 170, 230], beat).held).toBe(false); // drifting late
  });
  it('pocket and swing', () => {
    expect(pocketScore([28, 32, 25, 47, 31], 30).share).toBe(0.8);
    const beat = 600;
    const taps: number[] = [];
    for (let b = 0; b < 6; b++) taps.push(b * beat, b * beat + beat * 0.66);
    expect(swingOf(taps, 0, beat)).toBe(0.66);
  });
});

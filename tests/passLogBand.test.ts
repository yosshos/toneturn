// SPEC-HOLISTIC-2 §1.6 V1 (warm half): a clean take at ≥ 95 % of the catalogue target counts toward the pass, whatever the
// stored goal tempo says. Live bug 2026-11-28: Drills.tsx marks a take under 0.99 × goalBpm "slower", and applyTake kept
// every "slower" take out of the pass log - key-session takes between 0.95 × target and 0.99 × goal never counted.
// And the rounding on the way: a take aimed at the band must land in it (keyCoach's snapDown and whole ♩, the old coach).
import { describe, expect, it } from 'vitest';
import { applyTake, newItem, PASS_SHARE, wholeBpm } from '../src/engine/drills/ladder';
import { climbFrom } from '../src/engine/drills/coach';
import { pulseBpm } from '../src/engine/drills/keyCoach';
import { MAELZEL } from '../src/engine/drills/stages';
import { generate } from '../src/engine/drills/generate';
import { DEFAULT_DRILL_SETTINGS, type DrillSpec, type TakeMetrics } from '../src/engine/drills/types';

const drill = generate({ family: 'scales', kind: 'scale', key: 2, hands: 'RL', octaves: 2 } as DrillSpec);
const clean = (bpm: number) => ({ verdict: 'clean', bpm, accuracy: 1, wrong: 0, missing: 0, timingMean: 0, timingSD: 5, cvR: null, cvL: null, handsMean: null, handsAbs: null, chordSpread: null, velSD: null, velMean: null, bandHit: null, slope: null, r2: null, accentGap: null, hesitations: 0 }) as unknown as TakeMetrics;
const AT = '2026-11-28T10:00:00.000Z';

describe('the pass log admits every clean take in the pass band', () => {
  it('a take between 0.95 × target and 0.99 × goal counts, though Drills marks it "slower"', () => {
    const st = { ...newItem(drill), goalBpm: 120 };
    const bpm = 114; // band 0.95 × 118 = 112.1; under 0.99 × 120 = 118.8
    const r = applyTake(st, clean(bpm), bpm, AT, DEFAULT_DRILL_SETTINGS, { targetBpm: 118, slower: bpm < st.goalBpm * 0.99 });
    expect(r.state.passLog).toEqual([{ at: AT, bpm: 114 }]);
  });

  it('"slower" keeps its meaning under the band: a slow take at the goal but under the band does not count', () => {
    const st = { ...newItem(drill), goalBpm: 100 };
    const r = applyTake(st, clean(99.6), 99.6, AT, DEFAULT_DRILL_SETTINGS, { targetBpm: 160, slower: true });
    expect(r.state.passLog).toEqual([]);
    const r2 = applyTake(st, clean(100), 100, AT, DEFAULT_DRILL_SETTINGS, { targetBpm: 160 });
    expect(r2.state.passLog).toEqual([{ at: AT, bpm: 100 }]);
  });

  it('a microphone take where MIDI is expected still never counts', () => {
    const st = { ...newItem(drill), goalBpm: 120 };
    const r = applyTake(st, { ...clean(118), nc: true } as TakeMetrics, 118, AT, DEFAULT_DRILL_SETTINGS, { targetBpm: 118, slower: true });
    expect(r.state.passLog).toEqual([]);
  });
});

describe('a take aimed at the band lands in it', () => {
  it('wholeBpm: rounds, but never from inside the band to below it', () => {
    expect(wholeBpm(53.33, 55.8)).toBe(54); // band 53.01
    expect(wholeBpm(53.33)).toBe(53);
    expect(wholeBpm(52.9, 55.8)).toBe(53); // under the band: plain rounding
    expect(wholeBpm(114.4, 118)).toBe(114);
  });

  it('the key session: the speed stage’s target mark, logged as the item’s whole ♩, is in the band (every target, note value)', () => {
    const top = MAELZEL[MAELZEL.length - 1];
    const bad: string[] = [];
    for (let t10 = 300; t10 <= 2400; t10++) {
      const T = t10 / 10; // the catalogue target, in the item's own note value
      for (const npb of [1, 2, 3, 4])
        for (const per of [1, 2, 3, 4]) {
          if (per > npb && !(npb === 2 && per === 3)) continue;
          const tn = (T * npb) / 60;
          const tb = (tn * 60) / per;
          if (tb > top + 0.5 || tb < 39.5) continue;
          // setPulse's ♩ for the target pulse (the stage passes at the mark at or below it, snapDown(♩ + 0.5))
          const mark = pulseBpm(tn, per, 0);
          const own = wholeBpm((mark * per) / npb, T);
          if (own < PASS_SHARE * T - 1e-9) bad.push(`T=${T} npb=${npb} per=${per}: ♩${mark} → ${own}`);
        }
    }
    expect(bad.slice(0, 10), `${bad.length}`).toEqual([]);
  });

  it('the old coach: a climb capped at the target plays the target, rounded into the band', () => {
    for (let t10 = 300; t10 <= 2400; t10 += 7) {
      const T = t10 / 10;
      const at = climbFrom(Math.floor(T * 0.97), clean(T), drill, T);
      // coach tempoOf: Math.max(30, Math.min(cap, Math.round(c.at)))
      expect(Math.max(30, Math.min(T, Math.round(at)))).toBeGreaterThanOrEqual(PASS_SHARE * T - 1e-9);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { splitRhythm, timingDifficulty, beatSec } from '../src/engine/memory';
import { foldRatings, rate } from '../src/engine/rating';
import { ProgressStore, ratingsOf } from '../src/storage/progress';
import { memoryKV } from '../src/storage/kv';

const p = { bpm: 90, beats: 3, onsets: [0, 1, 1.5, 2] };
const ms = (b: number) => b * beatSec(90) * 1000;

describe('rhythmic memory vs rhythmic precision', () => {
  it('right pattern with sloppy timing: remembered, low precision', () => {
    const s = splitRhythm(p, p.onsets.map((o, i) => ms(o) + (i % 2 ? 120 : -120)));
    expect(s.memoryPass).toBe(true);
    expect(s.meanAbsMs).toBe(120);
    expect(s.precision!).toBeLessThan(0.3);
  });
  it('right pattern, tight timing: remembered, high precision', () => {
    const s = splitRhythm(p, p.onsets.map((o) => ms(o) + 10));
    expect(s.memoryPass).toBe(true);
    expect(s.precision!).toBeGreaterThan(0.9);
  });
  it('wrong pattern: memory fails and precision is not graded at all', () => {
    const s = splitRhythm(p, [ms(0), ms(1), ms(2)]);
    expect(s.memoryPass).toBe(false);
    expect(s.precision).toBeNull();
  });
  it('faster tempo and off-beats make precision harder', () => {
    expect(timingDifficulty({ bpm: 110, beats: 3, onsets: [0, 1, 1.5, 2] })).toBeGreaterThan(timingDifficulty({ bpm: 75, beats: 3, onsets: [0, 1, 2] }));
  });
  it('graded scores move the rating proportionally', () => {
    const hi = rate(undefined, { difficulty: 1000, correct: true, score: 0.9, at: '' });
    const lo = rate(undefined, { difficulty: 1000, correct: false, score: 0.2, at: '' });
    expect(hi.r).toBeGreaterThan(1000);
    expect(lo.r).toBeLessThan(1000);
    expect(foldRatings([{ id: 'a', skill: 'timing', difficulty: 1000, correct: true, score: 0.5, at: '' }]).timing!.r).toBe(1000);
  });
  it('a Beat Echo game rates memory and precision as separate skills', async () => {
    const store = new ProgressStore(memoryKV());
    const pr = await store.recordGameRounds('rhythm', 9, [
      { length: 2, pass: true, memoryPass: true, precision: 0.9, timingDifficulty: 950 },
      { length: 3, pass: false, memoryPass: true, precision: 0.2, timingDifficulty: 1000 }, // remembered, but too imprecise for the game
      { length: 4, pass: false, memoryPass: false, precision: null, timingDifficulty: 1050 }, // forgot → no precision event
    ]);
    const r = ratingsOf(pr);
    expect(r.rhythm!.n).toBe(3);
    expect(r.rhythm!.correct).toBe(2); // the imprecise round still counts as remembered
    expect(r.timing!.n).toBe(2);
  });
});

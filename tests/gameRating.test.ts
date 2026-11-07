import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { gameAccuracy, gameEvents } from '../src/engine/gameRating';
import { foldRatings, type RatingEvent } from '../src/engine/rating';
import { buildPath, stepCatalogue, type PathInput } from '../src/engine/path';

const now = new Date('2026-11-07T12:00:00Z');
const pin = (events: RatingEvent[]): PathInput => ({ track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [], packs: [], plays: [], minutes: 10, ratings: foldRatings(events), events, facts: {}, keep: [], reviewDue: 0, now });

describe('single-player games count (0.38)', () => {
  it('right / wrong become that many events (≤ 12), tagged with the skill', () => {
    const ev = gameEvents('rush-chord', 200, { right: 9, wrong: 3, level: 2 }, now.toISOString(), 's1');
    expect(ev).toHaveLength(12);
    expect(ev.filter((e) => e.correct)).toHaveLength(9);
    expect(ev[0].skill).toBe('chords');
    expect(ev[0].tags?.[0].sub).toBe('chords/quality');
    expect(ev.every((e) => e.id.startsWith('g:'))).toBe(true);
  });
  it('accuracy-only games spread a graded score; touch Flight trains no pitch', () => {
    const ev = gameEvents('highway', 92, { level: 3 }, now.toISOString(), 's2');
    expect(ev.length).toBeGreaterThanOrEqual(3);
    expect(ev[0].score).toBeCloseTo(0.92);
    expect(gameEvents('flight', 300, { input: 'touch', gates: 20 }, now.toISOString(), 's3')).toEqual([]);
    expect(gameAccuracy('tuneup', 0, { meanCents: 3 })).toBe(1);
  });
  it('a few good games move the ratings and the path (✓ evidence)', () => {
    const before = buildPath(pin([]));
    const events: RatingEvent[] = [];
    for (const [day, k] of [['2026-11-05', 'a'], ['2026-11-06', 'b'], ['2026-11-07', 'c']] as const)
      for (const lv of [1, 2, 3]) events.push(...gameEvents('rush-chord', 300, { right: 12, wrong: 0, level: lv }, `${day}T10:00:00Z`, `${k}${lv}`));
    const r = foldRatings(events);
    expect(r.chords!.r).toBeGreaterThan(1000);
    const after = buildPath(pin(events));
    const chordSteps = stepCatalogue().filter((s) => s.skill === 'chords' && s.sub === 'chords/quality').map((s) => s.id);
    const tested = after.units.flatMap((u) => u.steps).filter((x) => chordSteps.includes(x.step.id) && x.state === 'tested').length;
    expect(after.progress.checked).toBeGreaterThan(before.progress.checked);
    expect(tested + after.progress.checked).toBeGreaterThan(0);
  });
});

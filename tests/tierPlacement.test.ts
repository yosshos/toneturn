import { describe, expect, it } from 'vitest';
import { mergePriors, tierPlacement } from '../src/engine/tierPlacement';
import { planPlacement, placementLesson } from '../src/engine/placement';
import type { GameTiers } from '../src/engine/gameTiers';
import type { Ratings } from '../src/engine/rating';

const st = (cleared: GameTiers[string]['cleared']): GameTiers[string] => ({ cleared, recent: {}, best: {}, runs: 3 });
const rated = (r: number, n: number) => ({ r, n }) as unknown as NonNullable<Ratings[keyof Ratings]>;

describe('placement skip from cleared tiers', () => {
  it('below mf nothing changes', () => {
    expect(tierPlacement({ 'rush-chord': st('mp') }, 'ear')).toEqual({ priors: {}, skip: [], from: {} });
  });
  it('mf and above start the skill at the top of the cleared band; the highest game wins', () => {
    const t = tierPlacement({ 'rush-chord': st('mf'), 'rush-voicing': st('f') }, 'ear');
    expect(t.priors.chords).toBe(1400);
    expect(t.from.chords).toEqual({ game: 'rush-voicing', tier: 'f' });
    expect(t.skip).toEqual([]);
  });
  it('instrument sub-skills are not placement sections', () => {
    expect(tierPlacement({ 'rush-fretboard': st('ff') }, 'guitar').priors).toEqual({});
  });
  it('f and above with an established rating in the band skips the section', () => {
    expect(tierPlacement({ 'rush-interval': st('f') }, 'ear', { intervals: rated(1300, 20) } as Ratings).skip).toEqual(['intervals']);
    expect(tierPlacement({ 'rush-interval': st('f') }, 'ear', { intervals: rated(1300, 3) } as Ratings).skip).toEqual([]);
  });
  it('the search starts higher: fewer easy items', () => {
    const t = tierPlacement({ 'rush-interval': st('ff') }, 'ear');
    const plain = planPlacement([], ['intervals']).next!;
    const fromTier = planPlacement([], ['intervals'], { priors: t.priors }).next!;
    expect(fromTier.level).toBeGreaterThan(plain.level);
    const l = placementLesson(1, { only: ['intervals', 'chords'], priors: t.priors });
    expect(l.placementSkills).toEqual(['intervals', 'chords']);
  });
  it('merging keeps the higher prior', () => {
    expect(mergePriors({ chords: 1250 }, { chords: 1100, intervals: 900 })).toEqual({ chords: 1250, intervals: 900 });
  });
});

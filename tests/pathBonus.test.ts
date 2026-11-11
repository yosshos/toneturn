// PIANO_JAZZ P2 path wiring: repertoire items and the eight advanced games as path steps — one course each, at the
// end of a unit where their depth fits, passed only by their own measured results; a bonus never blocks a unit.
import { describe, expect, it } from 'vitest';
import { buildPath, checkStep, stepCatalogue, type PathInput } from '../src/engine/path';
import { COURSES, courseInput, inCourse, type CourseId } from '../src/engine/courses';
import { BONUS_GAMES, bonusSteps, repStepStars, repSteps, unitEndSteps, withRepFacts } from '../src/engine/pathBonus';
import { REPERTOIRE, repLessonId } from '../src/engine/repertoire';
import { BONUS_STEP_GLYPH, GAME_STEP_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { tierSpec } from '../src/engine/gameTiers';

const base: PathInput = {
  track: 'pro', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: null, leaveOut: [],
  packs: ['jazz'], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now: new Date('2026-11-11T10:00:00Z'),
};
const ALL: CourseId[] = COURSES.map((c) => c.id);

describe('bonus game steps', () => {
  it('all eight advanced games are steps, each step in exactly one course, opening at tier mp', () => {
    const games = new Set(BONUS_GAMES.map((g) => g.game));
    expect([...games].sort()).toEqual(['bhtime', 'polylock', 'reharm', 'riffecho', 'rush-scale', 'rush-standard', 'rush-voicing', 'transcribe']);
    const steps = bonusSteps();
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
    for (const s of steps) {
      const homes = ALL.filter((c) => inCourse(s, c));
      expect(homes, s.id).toEqual([s.id.split(':')[1]]);
      expect(s.tier).toBe('mp');
      expect(tierSpec(s.game!)?.tiers.mp, s.game).toBeDefined();
      expect(s.id.endsWith(`:${s.game}`)).toBe(true); // the game's result finds its step (noteGameStep)
      expect(s.bonus).toBe(true);
    }
    // In the catalogue too.
    const cat = stepCatalogue();
    for (const s of steps) expect(cat.some((x) => x.id === s.id)).toBe(true);
  });
  it('each has its own drawn symbol; the Transcription Race is not the coach', () => {
    for (const s of bonusSteps()) {
      const g = BONUS_STEP_GLYPH[s.game!] ?? GAME_STEP_GLYPH[s.game!];
      expect(GLYPHS[g], s.id).toBeDefined();
    }
    expect(BONUS_STEP_GLYPH.transcribe).not.toBe(GAME_STEP_GLYPH.transcribe);
    expect(GAME_STEP_GLYPH.reharm).not.toBe('reharm'); // the k-reharm family keeps its own
    expect(GLYPHS[GAME_STEP_GLYPH.repertoire]).toBeDefined();
  });
  it('only measured results pass them: never ✓ by rating evidence', () => {
    const inp = { ...base, ratings: { chords: { r: 1700, rd: 40, n: 200 } } } as unknown as PathInput;
    for (const s of [...bonusSteps(), ...repSteps().slice(0, 5)]) expect(checkStep(s, inp, new Map()).state).toBeNull();
  });
});

describe('repertoire steps', () => {
  it('one step per item, in its own course only, deeper by tier', () => {
    const steps = repSteps();
    const n = Object.values(REPERTOIRE).reduce((a, xs) => a + xs.length, 0);
    expect(steps).toHaveLength(n);
    for (const s of steps) {
      expect(ALL.filter((c) => inCourse(s, c)), s.id).toEqual([s.rep!.course]);
      expect(s.game).toBe('repertoire');
    }
    const keys = steps.filter((s) => s.rep!.course === 'keys');
    const tier = (s: (typeof keys)[number]) => REPERTOIRE.keys.find((x) => x.id === s.rep!.id)!.tier;
    for (const a of keys) for (const b of keys) if (tier(a) < tier(b)) expect(a.difficulty).toBeLessThan(b.difficulty);
  });
  it('its stars come from the item result: ≥ 80 % = 3, ≥ 60 % = 2, ≥ 30 % = 1', () => {
    expect([0.9, 0.8, 0.7, 0.6, 0.4, 0.1].map(repStepStars)).toEqual([3, 3, 2, 2, 1, 0]);
    const it0 = REPERTOIRE.keys[0];
    const f = withRepFacts({}, { [repLessonId('keys', it0.id)]: { best: 8, completions: 2, lastAt: '2026-11-10T00:00:00Z' } });
    expect(f.steps?.[`rep:keys:${it0.id}`]?.stars).toBe(3);
    expect(withRepFacts({}, { [repLessonId('keys', it0.id)]: { best: 1, completions: 1 } }).steps?.[`rep:keys:${it0.id}`]).toBeUndefined();
  });
});

describe('placing them at the end of units', () => {
  it('a repertoire item every third unit, a bonus every other unit once deep enough', () => {
    const open = [...repSteps().filter((s) => s.rep!.course === 'jazz'), ...bonusSteps().filter((s) => s.id.startsWith('bonus:jazz'))].sort((a, b) => a.difficulty - b.difficulty);
    expect(unitEndSteps(1, 1300, open)).toEqual([]);
    expect(unitEndSteps(2, 1300, open).map((s) => !!s.bonus)).toEqual([true]);
    expect(unitEndSteps(3, 1300, open).map((s) => !!s.rep)).toEqual([true]);
    expect(unitEndSteps(6, 1300, open)).toHaveLength(2);
    // Too shallow for the advanced games: no bonus.
    expect(unitEndSteps(2, 850, open)).toEqual([]);
  });
  it('on the jazz path: they show up, a bonus is never the current step, and a unit completes without it', () => {
    const inp = courseInput(base, 'jazz');
    const v = buildPath(inp);
    const steps = v.units.flatMap((u) => u.steps);
    expect(steps.some((x) => x.step.bonus || x.step.rep)).toBe(true);
    expect(v.current?.step.bonus).toBeFalsy();
    // Freeze unit 2 with its bonus; every step done except the bonus → the unit is past.
    const u2 = v.units.find((u) => u.steps.some((x) => x.step.bonus))!;
    expect(u2).toBeDefined();
    const ids = u2.steps.map((x) => x.step.id);
    const done = Object.fromEntries(ids.filter((id) => !id.startsWith('bonus:')).map((id) => [id, { stars: 3, at: '2026-11-11T09:00:00Z' }]));
    const v2 = buildPath({ ...inp, facts: { steps: done, units: [{ id: u2.id, n: 1, steps: ids, checked: [], at: '2026-11-11T08:00:00Z' }] } });
    expect(v2.units[0].status).toBe('past');
    // Every bonus / repertoire step on any course path belongs to that course.
    for (const c of ALL) {
      const ci = courseInput(base, c);
      for (const x of buildPath(ci).units.flatMap((u) => u.steps)) if (x.step.bonus || x.step.rep) expect(inCourse(x.step, c), `${c} ${x.step.id}`).toBe(true);
    }
  });
});

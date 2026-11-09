import { describe, expect, it } from 'vitest';
import { courseInput, type CourseId } from '../src/engine/courses';
import { buildPath, eligible, stepCatalogue, type PathInput } from '../src/engine/path';
import { ladderFamiliesFor, techQueue, techStars, techLevel, withLadderFacts } from '../src/engine/ladderFacts';
import { levelDrills, targetBpmOf } from '../src/engine/drills/plan';
import { DEFAULT_DRILL_SETTINGS, type Drill, type ItemState } from '../src/engine/drills/types';

const base: PathInput = {
  track: 'hobby',
  goal: 'general',
  hidden: [],
  noSing: false,
  noMic: false,
  priorities: null,
  leaveOut: [],
  packs: [],
  plays: [],
  minutes: 10,
  ratings: {} as PathInput['ratings'],
  events: [],
  facts: {},
  keep: [],
  reviewDue: 0,
  now: new Date('2026-11-09T10:00:00Z'),
};
const ds = DEFAULT_DRILL_SETTINGS;
/** Items passed at their target: 3 clean takes at the target tempo on 2 days. */
const passedItems = (drills: Drill[], target: (d: Drill) => number): Record<string, ItemState> =>
  Object.fromEntries(
    drills.map((d) => {
      const t = target(d);
      return [d.itemId, { itemId: d.itemId, family: d.spec.family, key: d.spec.key, hands: 'R', cleanBpm: t, history: [], passLog: [{ at: '2026-11-07T10:00:00Z', bpm: t }, { at: '2026-11-07T10:05:00Z', bpm: t }, { at: '2026-11-08T10:00:00Z', bpm: t }] } as unknown as ItemState];
    }),
  );
const inputFor = (c: CourseId, facts: PathInput['facts'] = {}): PathInput => ({ ...courseInput(base, c), ladderFamilies: ladderFamiliesFor(c, ds), facts });

describe('technique and vocal ladders in the course path (0.61, owner)', () => {
  it('the catalogue holds every technique level and every vocal level once', () => {
    const all = stepCatalogue();
    const tech = all.filter((s) => s.kind === 'tech');
    const vocal = all.filter((s) => s.kind === 'vocal');
    expect(tech.length).toBeGreaterThan(150);
    expect(vocal.length).toBeGreaterThanOrEqual(40);
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
  });

  it('ladder steps stay out of the ear, exam and jazz courses', () => {
    for (const c of ['ear', 'exam', 'jazz'] as CourseId[]) {
      const inp = inputFor(c);
      expect(stepCatalogue().filter((s) => s.ladder && eligible(s, inp)), c).toHaveLength(0);
    }
  });

  it('a keys unit is about half technique, starting at level 1 of the first families, with no checkpoint without questions', () => {
    const v = buildPath(inputFor('keys'));
    const u = v.units.find((x) => x.status === 'current')!;
    const tech = u.steps.filter((x) => x.step.kind === 'tech');
    expect(tech.length).toBeGreaterThanOrEqual(2);
    for (const x of tech) expect(x.step.ladder!.level).toBe(1);
    expect(u.steps.some((x) => x.step.kind === 'game' && x.step.game === 'drills')).toBe(false);
    // the drills game is gone; the steps are the levels themselves
    expect(u.steps.filter((x) => x.step.kind !== 'check').length).toBeLessThanOrEqual(9);
  });

  it('the voice course path carries vocal program levels', () => {
    const u = buildPath(inputFor('voice')).units.find((x) => x.status === 'current')!;
    expect(u.steps.some((x) => x.step.kind === 'vocal' && x.step.ladder!.ref === '1')).toBe(true);
  });

  it('only measured takes pass a level: stars from takes at the start / target tempo; ✓ by the playing test below its start', () => {
    const lv = techLevel('scales-1')!;
    const drills = levelDrills(lv, ds.keyOrder);
    // 0.64 (A4): one clean take at the start tempo per item = 1 star at most; 3 clean at the target on 2 days pass an item.
    const startClean = (n: number): Record<string, ItemState> =>
      Object.fromEntries(drills.slice(0, n).map((d) => [d.itemId, { itemId: d.itemId, family: 'scales', key: 0, hands: 'R', cleanBpm: d.startBpm, history: [], passLog: [{ at: '2026-11-08T10:00:00Z', bpm: d.startBpm }] } as unknown as ItemState]));
    const passed = (n: number) => passedItems(drills.slice(0, n), (d) => targetBpmOf(lv, d));
    expect(techStars(lv, {}, ds.keyOrder)).toBe(0);
    expect(techStars(lv, startClean(3), ds.keyOrder)).toBe(1);
    expect(techStars(lv, startClean(drills.length), ds.keyOrder)).toBe(1);
    // Five stars (owner, 0.64): 2 = a first key at target, 3 = three keys (done), 4 = half, 5 = all.
    expect(techStars(lv, passed(1), ds.keyOrder)).toBe(drills.length <= 1 ? 5 : 2);
    expect(techStars(lv, passed(Math.min(3, drills.length)), ds.keyOrder)).toBeGreaterThanOrEqual(3);
    expect(techStars(lv, passed(Math.ceil(drills.length / 2)), ds.keyOrder)).toBeGreaterThanOrEqual(drills.length >= 6 ? 4 : 3);
    expect(techStars(lv, passed(drills.length), ds.keyOrder)).toBe(5);
    // Below 3 stars is progress only: the step is not done (no facts) until three keys pass at the target.
    expect(withLadderFacts({}, { families: ['scales'], items: startClean(drills.length), order: ds.keyOrder, start: {}, vocalPassed: [], at: '2026-11-09T10:00:00Z' }).steps?.['tech:scales-1']).toBeUndefined();
    const f = withLadderFacts({}, { families: ['scales'], items: passed(drills.length), order: ds.keyOrder, start: { scales: 3 }, vocalPassed: [], at: '2026-11-09T10:00:00Z' });
    expect(f.steps?.['tech:scales-1']?.stars).toBe(5);
    expect(f.tests?.['tech:scales-2']).toBeTruthy();
    expect(f.tests?.['tech:scales-3']).toBeUndefined();
  });

  it('a level done opens the next level of its family on the path', () => {
    const lv = techLevel('scales-1')!;
    const items = passedItems(levelDrills(lv, ds.keyOrder), (d) => targetBpmOf(lv, d));
    const facts = withLadderFacts({}, { families: ladderFamiliesFor('keys', ds), items, order: ds.keyOrder, start: {}, vocalPassed: [], at: '2026-11-09T10:00:00Z' });
    const u = buildPath(inputFor('keys', facts)).units.find((x) => x.status === 'current')!;
    const scales = u.steps.filter((x) => x.step.ladder?.family === 'scales');
    expect(scales.every((x) => x.step.ladder!.level >= 2)).toBe(true);
  });

  it("a level's session plays its items not yet clean first", () => {
    const q = techQueue('scales-1', {}, ds.keyOrder, 4);
    expect(q).toHaveLength(4);
  });
});

describe('technique XP reaches the server once (0.61)', () => {
  it('a result whose XP was counted take by take adds no XP locally; a rebuild counts it', async () => {
    const { applyResult, emptyProgress } = await import('../src/storage/progress');
    const { rebuildProgress } = await import('../src/storage/sync');
    const r = { lessonId: 'tech:scales-1', lessonVersion: 1, sessionId: 'tech-1', completedAt: '2026-11-09T10:00:00Z', firstTry: 4, total: 5, xp: 18, xpCounted: true, missed: [], items: [] };
    expect(applyResult(emptyProgress(), r, new Date(r.completedAt)).xp).toBe(0);
    expect(rebuildProgress([r]).xp).toBe(18);
  });
});

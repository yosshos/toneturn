// SPEC-PATH-ROLE (owner 2026-11-14): the path teaches what is new, the workout builds depth (new / strengthen /
// review), the checkpoint is promotion and never a gate, opened vs mastered on one star scale.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { buildPath, masteryStars, pendingChecks, recordStep, topicMarks, type PathFacts, type PathInput, type PathStep, type PathUnit, type PathView, type UnitStep } from '../src/engine/path';
import { nextForBlock, openedCount, SHARES, splitShares, suggestWorkout, total, type Block } from '../src/engine/workout2';
import { catalog, type LevelDef } from '../src/engine/drills/generate';
import { levelDrills, levelKeys, levelStars, targetBpmOf } from '../src/engine/drills/plan';
import { DEFAULT_DRILL_SETTINGS, type Drill, type ItemState } from '../src/engine/drills/types';
import { TECH_DONE_STARS, withLadderFacts } from '../src/engine/ladderFacts';
import { checkpointTech, checkTechStars, decorateMastery, FADE_BELOW, leadsTo, masteryLine, missingFor, nearMastery, rankHold, sampleKeys, strengthenDrills, unitMastery, type MasteryCtx } from '../src/engine/pathMastery';
import { updateRanks } from '../src/engine/ranks';
import { profileDigest } from '../src/engine/analysis/profile';

const now = new Date('2026-11-14T12:00:00Z');
const pin: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now };
const order = DEFAULT_DRILL_SETTINGS.keyOrder;
const fresh = buildPath(pin);
const sugg = (t: number, extra: Partial<Parameters<typeof suggestWorkout>[0]> = {}) => suggestWorkout({ total: t, goal: 'general', priorities: pin.priorities, leaveOut: [], reviewsDue: 0, singer: false, view: fresh, ...extra });
const mins = (bs: Block[], k: string) => bs.filter((b) => b.target.kind === k).reduce((a, b) => a + b.minutes, 0);
const iso = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

/** The current unit with every non-checkpoint step done (frozen as a fact), so its checkpoint waits. */
function waitingCheck(): { view: PathView; facts: PathFacts; unit: PathUnit } {
  const u = fresh.units.find((x) => x.status === 'current')!;
  let facts: PathFacts = { units: [{ id: u.id, n: u.n, steps: u.steps.map((x) => x.step.id), checked: [], at: iso(5) }] };
  for (const x of u.steps) if (x.step.kind !== 'check' && x.step.kind !== 'review') facts = recordStep(facts, x.step.id, 2, iso(1));
  const view = buildPath({ ...pin, facts });
  return { view, facts, unit: view.units.find((x) => x.id === u.id)! };
}

/** A piano level with 12 keys and a single spec (the star scale is read per key). */
function twelveKeyLevel(): LevelDef {
  for (const f of catalog()) for (const lv of f.levels) if (lv.specs.length === 1 && levelKeys(lv, order).length >= 12 && levelDrills(lv, order).length === levelKeys(lv, order).length) return lv;
  throw new Error('no 12-key level');
}
const passLog = (bpm: number, at = '2026-11-08') => [{ at: `${at}T10:00:00Z`, bpm }, { at: `${at}T10:05:00Z`, bpm }, { at: '2026-11-07T10:00:00Z', bpm }];
const itemsFor = (lv: LevelDef, keys: { key: number; at: 'start' | 'target' }[], last = iso(1)): Record<string, ItemState> => {
  const out: Record<string, ItemState> = {};
  for (const d of levelDrills(lv, order)) {
    const k = keys.find((x) => x.key === ((d.spec.key % 12) + 12) % 12);
    if (!k) continue;
    const bpm = k.at === 'target' ? targetBpmOf(lv, d) : d.startBpm;
    out[d.itemId] = { itemId: d.itemId, family: d.spec.family, key: d.spec.key, hands: 'R', cleanBpm: bpm, goalBpm: bpm, takes: 6, last, history: [], passLog: k.at === 'target' ? passLog(bpm) : [{ at: last, bpm }], ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.95 } } as unknown as ItemState;
  }
  return out;
};

describe('workout = new + strengthen + review (§3)', () => {
  const opened = { opened: 5 };
  it('guide me: new ≈ 22 %, strengthen ≈ 48 %, review ≈ 30 % (whole minutes, sums to the total)', () => {
    for (const t of [10, 15, 20, 30, 45, 60]) {
      const bs = sugg(t, opened);
      expect(total(bs), `total ${t}`).toBe(t);
      expect(bs.every((b) => b.minutes >= 2 && b.minutes <= 30)).toBe(true);
      const n = mins(bs, 'path');
      const s = mins(bs, 'strengthen');
      const r = t - n - s;
      expect(Math.abs(n / t - SHARES.new), `new ${t}`).toBeLessThanOrEqual(0.12);
      expect(Math.abs(s / t - SHARES.strengthen), `strengthen ${t}`).toBeLessThanOrEqual(0.12);
      expect(Math.abs(r / t - SHARES.review), `review ${t}`).toBeLessThanOrEqual(0.12);
    }
    // Review first (the warm-up), then new, then strengthen.
    expect(sugg(10, opened).map((b) => b.target.kind)).toEqual(['warmup', 'path', 'strengthen']);
  });
  it('a new player with nothing opened: the path takes the strengthen share too', () => {
    expect(openedCount(fresh)).toBe(0);
    const bs = sugg(20);
    expect(mins(bs, 'strengthen')).toBe(0);
    expect(mins(bs, 'path')).toBeGreaterThanOrEqual(Math.round(20 * (SHARES.new + SHARES.strengthen)) - 1);
  });
  it('"I choose": no New block — strengthen + review only', () => {
    for (const t of [5, 10, 20, 60]) {
      const bs = sugg(t, { ...opened, pathMode: 'choose' });
      expect(bs.some((b) => b.target.kind === 'path'), `t ${t}`).toBe(false);
      expect(mins(bs, 'strengthen')).toBeGreaterThan(0);
      expect(total(bs)).toBe(t);
    }
  });
  it('a unit waiting for its checkpoint: the checkpoint takes the New block', () => {
    const { view, unit } = waitingCheck();
    const got = nextForBlock({ id: 'p', target: { kind: 'path' }, minutes: 3 }, view, new Set());
    expect(got && 'step' in got && got.step.step.kind).toBe('check');
    expect(got && 'step' in got && got.unitId).toBe(unit.id);
    // Strengthen and review never take path steps.
    expect(nextForBlock({ id: 's', target: { kind: 'strengthen' }, minutes: 3 }, view, new Set())).toEqual({ free: { kind: 'strengthen' } });
  });
  it('saved templates the player made are kept as they are (only generated suggestions use the shares)', () => {
    const template: Block[] = [{ id: 'a', target: { kind: 'area', area: 'pitch' }, minutes: 6 }, { id: 'b', target: { kind: 'path' }, minutes: 4 }];
    const bs = sugg(10, { ...opened, template });
    expect(bs.map((b) => b.target)).toEqual(template.map((b) => b.target));
    expect(bs.map((b) => b.minutes)).toEqual([6, 4]);
  });
  it('splitShares drops review first when the total is tiny', () => {
    const s = splitShares(5, SHARES);
    expect(s.review).toBe(0);
    expect(s.new + s.strengthen).toBe(5);
  });
});

describe('the checkpoint is promotion, never a gate (§4, §6 Q2)', () => {
  it('a unit whose steps are done is past; the next unit opens; its checkpoint stays open', () => {
    const { view, unit } = waitingCheck();
    expect(unit.status).toBe('past');
    expect(view.units.some((u) => u.status === 'current' && u.id !== unit.id)).toBe(true);
    expect(view.freeze?.id).not.toBe(unit.id);
    expect(pendingChecks(view).map((p) => p.unit.id)).toEqual([unit.id]);
  });
  it('the rank waits for it: areas of an open checkpoint keep their division', () => {
    const { view } = waitingCheck();
    const hold = rankHold(view);
    expect(hold.length).toBeGreaterThan(0);
    const area = hold.find((a) => a !== 'technique')!;
    const prev = { [area]: { div: 2, since: iso(1), best: 2, floor: -1 } };
    const ratings = { intervals: { r: 1300, n: 400 }, degrees: { r: 1300, n: 400 }, chords: { r: 1300, n: 400 }, cadences: { r: 1300, n: 400 }, notes: { r: 1300, n: 400 }, timing: { r: 1300, n: 400 }, rhythm: { r: 1300, n: 400 } } as never;
    const events = Array.from({ length: 400 }, (_, i) => ({ id: `e${i}`, skill: ['intervals', 'degrees', 'chords', 'cadences', 'notes', 'timing', 'rhythm'][i % 7], difficulty: 1200, correct: true, at: iso(1) })) as never;
    const free = updateRanks(prev as never, ratings, events, now.toISOString(), undefined, []);
    const held = updateRanks(prev as never, ratings, events, now.toISOString(), undefined, hold);
    expect((held.ranks as Record<string, { div: number }>)[area].div).toBe(2);
    expect((free.ranks as Record<string, { div: number }>)[area].div).toBeGreaterThanOrEqual(2);
  });
  it('a unit of technique only gets a checkpoint (its technique part)', () => {
    const keys = buildPath({ ...pin, plays: ['keys'], ladderFamilies: ['scales', 'fingers'], course: 'keys' });
    const withTech = keys.units.flatMap((u) => u.steps).filter((x) => x.step.kind === 'check');
    expect(withTech.length).toBeGreaterThan(0);
  });
});

describe('checkpoint technique part: random keys at the target tempo (§4)', () => {
  it('samples distinct keys, seeded, 4 per level (2 in a short unit)', () => {
    const ks = Array.from({ length: 12 }, (_, i) => i);
    const a = sampleKeys(ks, 4, 7);
    expect(new Set(a).size).toBe(4);
    expect(sampleKeys(ks, 4, 7)).toEqual(a);
    expect(a.every((k) => ks.includes(k))).toBe(true);
    expect(sampleKeys([0, 7], 4, 1).sort()).toEqual([0, 7]);
    const lv = twelveKeyLevel();
    const step = (n: number): UnitStep => ({ step: { id: `tech:${lv.id}`, kind: 'tech', ladder: { family: 'x', level: lv.level, ref: lv.id }, skill: 'instrument', sub: 'instrument/piano-tech', domain: 'instrument', difficulty: 900, choices: 0, title: { en: 't', he: 't' } } as PathStep, state: n ? 'done' : 'open' });
    const filler = (i: number): UnitStep => ({ step: { id: `topic:f:${i}`, kind: 'topic', skill: 'intervals', sub: 'intervals/melodic', domain: 'pitch', difficulty: 900, choices: 4, title: { en: 'f', he: 'f' } } as PathStep, state: 'done' });
    const long: PathUnit = { id: 'u9', n: 9, steps: [step(1), ...Array.from({ length: 7 }, (_, i) => filler(i))], difficulty: 900, section: 'developing', areas: [], status: 'past' };
    const short: PathUnit = { ...long, steps: long.steps.slice(0, 5) };
    const L = checkpointTech(long, order, 3);
    const S = checkpointTech(short, order, 3);
    expect(L.perLevel).toBe(4);
    expect(S.perLevel).toBe(2);
    expect(L.drills).toHaveLength(4);
    expect(new Set(L.drills.map((d) => d.spec.key)).size).toBe(4);
    expect(L.keys[`tech:${lv.id}`]).toHaveLength(4);
  });
  it('its stars: all clean = 3, ≥ 87 % = 2, ≥ 75 % = 1, less = 0', () => {
    expect(checkTechStars(4, 4)).toBe(3);
    expect(checkTechStars(7, 8)).toBe(2);
    expect(checkTechStars(3, 4)).toBe(1);
    expect(checkTechStars(2, 4)).toBe(0);
  });
});

describe('one star scale (§8)', () => {
  it('technique: ✓ (1★) at three keys at the base tempo; 4★ half the keys at the target; 5★ all keys', () => {
    const lv = twelveKeyLevel();
    const K = levelKeys(lv, order).map((k) => ((k % 12) + 12) % 12);
    const at = (n: number, w: 'start' | 'target') => K.slice(0, n).map((key) => ({ key, at: w }));
    expect(levelStars(lv, {}, order)).toBe(0);
    expect(levelStars(lv, itemsFor(lv, at(2, 'start')), order)).toBe(0);
    expect(levelStars(lv, itemsFor(lv, at(3, 'start')), order)).toBe(1);
    expect(TECH_DONE_STARS).toBe(1);
    expect(levelStars(lv, itemsFor(lv, at(1, 'target')), order)).toBe(2);
    expect(levelStars(lv, itemsFor(lv, at(3, 'target')), order)).toBe(3);
    expect(levelStars(lv, itemsFor(lv, at(6, 'target')), order)).toBe(4);
    expect(levelStars(lv, itemsFor(lv, at(12, 'target')), order)).toBe(5);
  });
  it('ear / theory: 1–3 from the run, 4 = a second clean run, 5 = spaced, accurate and at speed', () => {
    const s = { id: 'topic:x:1', kind: 'topic', skill: 'intervals', sub: 'intervals/melodic', domain: 'pitch', difficulty: 900, choices: 4, title: { en: '', he: '' } } as PathStep;
    expect(masteryStars(s, { stars: 2, at: iso(0) }, undefined, undefined)).toBe(2);
    expect(masteryStars(s, { stars: 3, at: iso(0), times: 1 }, undefined, undefined)).toBe(3);
    expect(masteryStars(s, { stars: 3, at: iso(0), times: 2, firstAt: iso(1) }, undefined, undefined)).toBe(4);
    expect(masteryStars(s, { stars: 3, at: iso(0), times: 2, firstAt: iso(5) }, { n: 20, ewma: 0.9 }, 0.9)).toBe(5);
    expect(masteryStars(s, { stars: 3, at: iso(0), times: 2, firstAt: iso(5) }, { n: 20, ewma: 0.7 }, 0.9)).toBe(4);
    expect(masteryStars(s, { stars: 3, at: iso(0), times: 2, firstAt: iso(5) }, { n: 20, ewma: 0.9 }, 1.4)).toBe(4);
  });
});

describe('unit mastery, the seal and the silver refresh (§8)', () => {
  const lv = twelveKeyLevel();
  const techStep = { id: `tech:${lv.id}`, kind: 'tech', ladder: { family: 'scales', level: lv.level, ref: lv.id }, skill: 'instrument', sub: 'instrument/piano-tech', domain: 'instrument', difficulty: 900, choices: 0, title: { en: 'Scales', he: 'סולמות' } } as PathStep;
  const earStep = { id: 'topic:intervals-all:1', kind: 'topic', topic: 'intervals-all', level: 1, skill: 'intervals', sub: 'intervals/melodic', domain: 'pitch', difficulty: 900, choices: 4, title: { en: 'Intervals', he: 'מרווחים' } } as PathStep;
  const checkStep = { id: 'check:u1', kind: 'check', skill: 'intervals', sub: 'intervals/melodic', domain: 'pitch', difficulty: 900, choices: 0, title: { en: 'Checkpoint', he: '' } } as PathStep;
  const unit = (facts: PathFacts): PathView => {
    const steps: UnitStep[] = [
      { step: techStep, state: 'done', stars: 1, mstars: 1 },
      { step: earStep, state: facts.steps?.[earStep.id] ? 'done' : 'open', stars: 3, mstars: masteryStars(earStep, facts.steps?.[earStep.id], undefined, undefined) },
      { step: checkStep, state: (facts.steps?.[checkStep.id]?.stars ?? 0) > 0 ? 'done' : 'open' },
    ];
    return { units: [{ id: 'u1', n: 1, no: 1, steps, difficulty: 900, section: 'developing', areas: ['pitch', 'instrument'], status: 'past' }], history: [], current: null, progress: { done: 0, checked: 0, total: 0 }, sections: { beginner: { known: 0, total: 0 }, developing: { known: 0, total: 0 }, solid: { known: 0, total: 0 }, advanced: { known: 0, total: 0 } }, freeze: null };
  };
  const K = levelKeys(lv, order).map((k) => ((k % 12) + 12) % 12);
  const earDone: PathFacts['steps'] = { [earStep.id]: { stars: 3, at: iso(2), times: 2, firstAt: iso(9) } };

  it('opened is not mastered: the step keeps its ✓ and shows its stars; the missing keys are named with the tempo', () => {
    const facts: PathFacts = { steps: { ...earDone } };
    const ctx: MasteryCtx = { items: itemsFor(lv, K.slice(0, 3).map((key) => ({ key, at: 'start' }))), order, now, facts };
    const v = decorateMastery(unit(facts), ctx);
    const t = v.units[0].steps[0];
    expect(t.state).toBe('done');
    expect(t.mstars).toBe(1);
    const m = missingFor(t, ctx);
    expect(m.kind).toBe('tech');
    expect(m.keys).toHaveLength(12);
    expect(m.text.en).toMatch(/^Missing: .+ at ♩\d+$/);
    expect(unitMastery(v.units[0], facts)).toMatchObject({ mastered: 1, total: 2, sealed: false });
    // One step and the checkpoint to go: the strengthen block names what it leads to; the AI digest lists it.
    expect(nearMastery(v, facts)).toHaveLength(1);
    expect(leadsTo(v, facts, (u) => String(u.no))?.en).toBe('1 more step and unit 1 is mastered');
    const line = masteryLine(v, ctx, (u) => String(u.no), (s) => s.title.en);
    expect(line).toContain('unit 1: 1/2 mastered, checkpoint not passed');
    expect(profileDigest({ strengths: [], patterns: [], gone: [] } as never, { nearMastery: line }).nearMastery).toBe(line);
  });

  it('every step at 5★ and the checkpoint passed: the unit is sealed', () => {
    const facts: PathFacts = { steps: { ...earDone, [checkStep.id]: { stars: 2, at: iso(1) } } };
    const ctx: MasteryCtx = { items: itemsFor(lv, K.map((key) => ({ key, at: 'target' }))), order, now, facts };
    const v = decorateMastery(unit(facts), ctx);
    expect(v.units[0].steps[0]).toMatchObject({ state: 'mastered', mstars: 5, fade: false });
    expect(unitMastery(v.units[0], facts)).toMatchObject({ mastered: 2, total: 2, checkPassed: true, sealed: true });
    // Without the checkpoint the unit is not sealed (the checkpoint is the promotion).
    const noCheck: PathFacts = { steps: { ...earDone } };
    expect(unitMastery(decorateMastery(unit(noCheck), { ...ctx, facts: noCheck }).units[0], noCheck).sealed).toBe(false);
  });

  it('mastery decays with keyMastery recency: a stale mastered step turns silver (refresh) and leaves the unit count — never its ✓', () => {
    const facts: PathFacts = { steps: { ...earDone, [checkStep.id]: { stars: 2, at: iso(1) } } };
    const stale: MasteryCtx = { items: itemsFor(lv, K.map((key) => ({ key, at: 'target' })), iso(90)), order, now, facts };
    const v = decorateMastery(unit(facts), stale);
    const t = v.units[0].steps[0];
    expect(t.fade).toBe(true);
    expect(t.state).not.toBe('open');
    expect(t.mstars).toBe(5);
    expect(missingFor(t, stale).kind).toBe('refresh');
    expect(unitMastery(v.units[0], facts)).toMatchObject({ mastered: 1, faded: 1, sealed: false });
    // A recently played ear step stays fresh; one untouched for 3 months fades too.
    expect(FADE_BELOW).toBeGreaterThan(0.6);
    const oldEar: PathFacts = { steps: { [earStep.id]: { stars: 3, at: iso(100), times: 2, firstAt: iso(110) } } };
    const ve = decorateMastery(unit(oldEar), { ...stale, facts: oldEar });
    expect(ve.units[0].steps[1].fade).toBe(true);
  });

  it('the strengthen queue draws from opened, unmastered technique levels — weak keys first', () => {
    const facts: PathFacts = {};
    const ctx: MasteryCtx = { items: itemsFor(lv, K.slice(0, 3).map((key) => ({ key, at: 'start' }))), order, now, facts };
    const v = decorateMastery(unit(facts), ctx);
    const q: Drill[] = strengthenDrills(v, ctx, 5);
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((d) => levelDrills(lv, order).some((x) => x.itemId === d.itemId))).toBe(true);
    const done = decorateMastery(unit(facts), { ...ctx, items: itemsFor(lv, K.map((key) => ({ key, at: 'target' }))) });
    expect(strengthenDrills(done, { ...ctx, items: itemsFor(lv, K.map((key) => ({ key, at: 'target' }))) })).toHaveLength(0);
  });
});

describe('migration: saved progress stays valid', () => {
  it('a technique ✓ given under the old rule stays ✓ although its keys now count fewer stars', () => {
    const lv = twelveKeyLevel();
    const facts: PathFacts = { steps: { [`tech:${lv.id}`]: { stars: 3, at: iso(30), times: 1, firstAt: iso(30) } } };
    // Nothing measured now (e.g. items reset): withLadderFacts never lowers, and the path keeps the step done.
    const f2 = withLadderFacts(facts, { families: ['scales'], items: {}, order, start: {}, vocalPassed: [], at: now.toISOString() });
    expect(f2.steps?.[`tech:${lv.id}`]?.stars).toBe(3);
    // A grandfathered 1-star fact (before 0.64) stays done too.
    const old: PathFacts = { steps: { [`tech:${lv.id}`]: { stars: 1, at: iso(300) } } };
    expect(withLadderFacts(old, { families: ['scales'], items: {}, order, start: {}, vocalPassed: [], at: now.toISOString() }).steps?.[`tech:${lv.id}`]?.stars).toBe(1);
    const view = decorateMastery({ ...fresh, history: [{ id: 'h1', n: 1, steps: [{ step: { id: `tech:${lv.id}`, kind: 'tech', ladder: { family: 'scales', level: 1, ref: lv.id }, skill: 'instrument', sub: 's', domain: 'instrument', difficulty: 700, choices: 0, title: { en: '', he: '' } } as PathStep, state: 'done', stars: 3, mstars: 3 }], difficulty: 700, section: 'beginner', areas: [], status: 'past' }] }, { items: {}, order, now, facts });
    expect(view.history[0].steps[0].state).toBe('done');
    expect(view.history[0].steps[0].mstars).toBeGreaterThanOrEqual(1);
  });
  it('a checkpoint taken under the old rule (unit was current until it) now lets the next unit open', () => {
    const { view } = waitingCheck();
    expect(view.units.filter((u) => u.status === 'current')).toHaveLength(1);
  });
});

describe('Practice: "ahead of the path" (§5)', () => {
  it('levels above the topic’s highest level on the road, and on coming units, are ahead', () => {
    const m = topicMarks(fresh, () => 6);
    const ahead = [...m.entries()].filter(([, v]) => v === 'ahead');
    expect(ahead.length).toBeGreaterThan(0);
    const cur = fresh.current?.step;
    if (cur?.topic) expect(m.get(`${cur.topic}:${cur.level}`)).toBe('current');
  });
});

// BASS_AUDIT A4 (every technique ladder): a level passes on clean takes at its target tempo, on ≥ 2 days; "Slower"
// never counts; the ladder's goal stops at the target.
import { describe, expect, it } from 'vitest';
import { applyTake, itemPass, newItem } from '../src/engine/drills/ladder';
import { itemTargetBpm, levelDone, levelDrills, levelOfDrill, levelStars, targetBpmOf } from '../src/engine/drills/plan';
import { techLevel, techQueue } from '../src/engine/ladderFacts';
import { guitarCatalog, type GuitarLevelDef } from '../src/engine/drills/guitar';
import { DEFAULT_DRILL_SETTINGS, type ItemState, type TakeMetrics } from '../src/engine/drills/types';

const take = (verdict: TakeMetrics['verdict']): TakeMetrics => ({ verdict, accuracy: 1, cvR: 0.02, cvL: null, timingSD: 10, velSD: null, handsAbs: null } as unknown as TakeMetrics);
const order = DEFAULT_DRILL_SETTINGS.keyOrder;
const pluck1 = guitarCatalog().find((f) => f.id === 'b-pluck')!.levels[0] as GuitarLevelDef;

describe('level target tempo per item', () => {
  it('bass levels use their stated target; other levels the start + 25 %', () => {
    const d = levelDrills(pluck1, order)[0];
    expect(levelOfDrill(d)?.id).toBe(pluck1.id);
    expect(itemTargetBpm(d)).toBe(pluck1.tempo![1]);
    const sc = levelDrills(techLevel('scales-1')!, order)[0];
    expect(levelOfDrill(sc)?.id).toBe('scales-1');
    expect(itemTargetBpm(sc)).toBe(Math.round(sc.startBpm * 1.25));
    expect(targetBpmOf(undefined, sc)).toBe(Math.round(sc.startBpm * 1.25));
  });
});

describe('the ladder with a target tempo', () => {
  const d = levelDrills(pluck1, order)[0];
  const target = itemTargetBpm(d);

  it('the goal climbs to the target and stops there ("level tempo reached")', () => {
    let st: ItemState = { ...newItem(d), goalBpm: target - 2 };
    let r = applyTake(st, take('clean'), target - 2, '2026-11-07T10:00:00Z', DEFAULT_DRILL_SETTINGS, { targetBpm: target });
    r = applyTake(r.state, take('clean'), target - 2, '2026-11-07T10:01:00Z');
    r = applyTake(r.state, take('clean'), target - 2, '2026-11-07T10:02:00Z');
    expect(r.state.goalBpm).toBe(target);
    expect(r.targetReached).toBe(true);
    st = r.state;
    for (let k = 0; k < 3; k++) r = applyTake(r.state, take('clean'), target, `2026-11-07T11:0${k}:00Z`);
    expect(r.state.goalBpm).toBe(target);
    expect(r.next.action).toBe('again');
    expect(r.message.en).toMatch(/Level tempo reached/);
    // continuous raise-tempo mode is capped too
    const c = applyTake(st, take('clean'), target, '2026-11-07T12:00:00Z', { ...DEFAULT_DRILL_SETTINGS, continuous: 'raise-tempo' });
    expect(c.state.goalBpm).toBe(target);
  });

  it('3 clean at the target on one day are not a pass; on 2 days they are', () => {
    let st: ItemState = { ...newItem(d), goalBpm: target };
    for (let k = 0; k < 3; k++) st = applyTake(st, take('clean'), target, `2026-11-07T10:0${k}:00Z`, DEFAULT_DRILL_SETTINGS, { targetBpm: target }).state;
    expect(itemPass(st, d.startBpm, target)).toMatchObject({ start: true, target: false, takes: 3, days: 1 });
    st = applyTake(st, take('clean'), target, '2026-11-08T10:00:00Z').state;
    expect(itemPass(st, d.startBpm, target).target).toBe(true);
  });

  it('"Slower" takes and takes under the goal never count', () => {
    let st: ItemState = { ...newItem(d), goalBpm: target };
    st = applyTake(st, take('clean'), 30, '2026-11-07T10:00:00Z', DEFAULT_DRILL_SETTINGS, { targetBpm: target }).state;
    st = applyTake(st, take('clean'), target, '2026-11-07T10:01:00Z', DEFAULT_DRILL_SETTINGS, { slower: true }).state;
    expect(st.cleanBpm).toBe(target);
    expect(st.passLog ?? []).toHaveLength(0);
    expect(itemPass(st, d.startBpm, target)).toMatchObject({ start: false, target: false });
  });

  it('one clean take at 30 bpm gives 0 stars; 3 clean at the target on 2 days pass the item', () => {
    const items: Record<string, ItemState> = {};
    for (const x of levelDrills(pluck1, order)) {
      let st: ItemState = newItem(x);
      st = applyTake({ ...st, goalBpm: 30 }, take('clean'), 30, '2026-11-07T10:00:00Z', DEFAULT_DRILL_SETTINGS, { targetBpm: itemTargetBpm(x) }).state;
      items[x.itemId] = st;
    }
    expect(levelStars(pluck1, items, order)).toBe(0);
    expect(levelDone(pluck1, items, order)).toBe(false);
    for (const x of levelDrills(pluck1, order)) {
      const t = itemTargetBpm(x);
      let st: ItemState = { ...items[x.itemId], goalBpm: t };
      for (const at of ['2026-11-07T11:00:00Z', '2026-11-07T11:05:00Z', '2026-11-08T11:00:00Z']) st = applyTake(st, take('clean'), t, at, DEFAULT_DRILL_SETTINGS, { targetBpm: t }).state;
      items[x.itemId] = st;
    }
    expect(levelStars(pluck1, items, order)).toBe(5);
    expect(levelDone(pluck1, items, order)).toBe(true);
  });

  it('older items count one take per day of their clean-tempo history', () => {
    const { passLog: _none, ...fresh } = newItem(d);
    const old: ItemState = { ...fresh, cleanBpm: target, history: [{ at: '2026-10-01T10:00:00Z', bpm: target, cv: 0 }, { at: '2026-10-02T10:00:00Z', bpm: target, cv: 0 }] };
    expect(itemPass(old, d.startBpm, target)).toMatchObject({ start: true, target: false, takes: 2 });
    // the first new take turns that history into the log
    const next = applyTake({ ...old, goalBpm: target }, take('clean'), target, '2026-11-07T10:00:00Z').state;
    expect(next.passLog).toHaveLength(3);
    expect(itemPass(next, d.startBpm, target).target).toBe(true);
  });

  it("a level step's session plays the items not yet passed first", () => {
    const sc = techLevel('scales-1')!;
    const ds = levelDrills(sc, order);
    const first = ds[0];
    const t = targetBpmOf(sc, first);
    const items: Record<string, ItemState> = { [first.itemId]: { ...newItem(first), cleanBpm: t, passLog: [{ at: '2026-11-07T10:00:00Z', bpm: t }, { at: '2026-11-07T10:01:00Z', bpm: t }, { at: '2026-11-08T10:00:00Z', bpm: t }] } };
    expect(techQueue('scales-1', items, order, ds.length).map((x) => x.itemId).indexOf(first.itemId)).toBe(ds.length - 1);
  });
});

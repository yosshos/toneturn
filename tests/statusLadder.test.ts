// The one status ladder (BUILD-PLAN-2026-11 D4) and the one item page's plumbing (SPEC-PATH-TODAY-PRACTICE §2–§5):
// the ladder per kind, the item ↔ assignment mapping, a step's required channel, the step in the key of the week, and
// the ladder beside a path node's ✓.
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { catalog, type LevelDef } from '../src/engine/drills/generate';
import { levelDrills, levelKeys, targetBpmOf } from '../src/engine/drills/plan';
import { DEFAULT_DRILL_SETTINGS, type ItemState } from '../src/engine/drills/types';
import { improvLadder, ladderOf, ladderWord, levelLadder, lickLadder, nextRung, pieceLadder, stepLadder } from '../src/engine/statusLadder';
import { assignmentFor, assignRefOf, channelMet, itemOfAssign, type ItemRef } from '../src/engine/itemAssign';
import { cleanIn, inChannel, stepChannelOf } from '../src/engine/stepChannel';
import { techQueue, withLadderFacts } from '../src/engine/ladderFacts';
import { LICK_KEYS, LICKS, lickItemId, lickTempos } from '../src/engine/licks';
import { runPresentation } from '../src/engine/channelPlan';
import { buildPath, type PathInput } from '../src/engine/path';
import { decorateMastery } from '../src/engine/pathMastery';

const order = DEFAULT_DRILL_SETTINGS.keyOrder;
function twelveKeyLevel(): LevelDef {
  for (const f of catalog()) for (const lv of f.levels) if (lv.specs.length === 1 && levelKeys(lv, order).length >= 12 && levelDrills(lv, order).length === levelKeys(lv, order).length) return lv;
  throw new Error('no 12-key level');
}
const closedLog = (bpm: number) => [{ at: '2026-11-08T10:00:00Z', bpm }, { at: '2026-11-08T10:05:00Z', bpm }, { at: '2026-11-07T10:00:00Z', bpm }];
const item = (id: string, key: number, bpm: number, how: 'closed' | 'almost' | 'learning', memory = false): ItemState =>
  ({ itemId: id, key, hands: 'R', cleanBpm: bpm, takes: 5, last: '2026-11-08T10:05:00Z', history: [], passLog: how === 'closed' ? closedLog(bpm) : [{ at: '2026-11-08T10:00:00Z', bpm }], ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.95 }, ...(memory ? { channels: { unaided: { n: 1, clean: 1, best: bpm } } } : {}) }) as unknown as ItemState;

describe('the ladder (D4)', () => {
  it('each kind stops where it makes sense', () => {
    expect(ladderOf('technique', 'new').rungs).toEqual(['new', 'learning', 'almost', 'closed', 'keys12', 'fingers']);
    expect(ladderOf('lick', 'new').rungs).toEqual(['new', 'learning', 'almost', 'closed', 'keys12', 'language', 'fingers']);
    expect(ladderOf('piece', 'new').rungs).toEqual(['new', 'learning', 'almost', 'closed', 'fingers']);
    expect(ladderOf('improv', 'new').rungs).toEqual(['new', 'learning', 'almost', 'closed']);
  });
  it('the base lights every rung up to its status; the upper rungs need "closed" (in my language does not)', () => {
    expect(ladderOf('technique', 'almost', { keys12: true }).lit).toEqual(['new', 'learning', 'almost']);
    const l = ladderOf('lick', 'learning', { language: true });
    expect(l.lit).toEqual(['new', 'learning', 'language']);
    expect(l.top).toBe('language');
    expect(ladderWord(l, 'he')).toBe('בשפה שלי');
    expect(nextRung(ladderOf('piece', 'closed'))).toBe('fingers');
    expect(nextRung(ladderOf('piece', 'closed', { fingers: true }))).toBeNull();
  });
  it('a technique level: best key is the base, every key closed = 12 keys, memory in every key = in the fingers', () => {
    const lv = twelveKeyLevel();
    const ds = levelDrills(lv, order);
    expect(levelLadder(lv, {}, order).top).toBe('new');
    const one = Object.fromEntries([[ds[0].itemId, item(ds[0].itemId, ds[0].spec.key, ds[0].startBpm, 'learning')]]);
    expect(levelLadder(lv, one, order).top).toBe('learning');
    const t0 = targetBpmOf(lv, ds[0]);
    expect(levelLadder(lv, { [ds[0].itemId]: item(ds[0].itemId, ds[0].spec.key, t0, 'almost') }, order).top).toBe('almost');
    expect(levelLadder(lv, { [ds[0].itemId]: item(ds[0].itemId, ds[0].spec.key, t0, 'closed') }, order).top).toBe('closed');
    const all = Object.fromEntries(ds.map((d) => [d.itemId, item(d.itemId, d.spec.key, targetBpmOf(lv, d), 'closed')]));
    const l12 = levelLadder(lv, all, order);
    expect(l12.top).toBe('keys12');
    expect(l12.lit).not.toContain('fingers');
    const mem = Object.fromEntries(ds.map((d) => [d.itemId, item(d.itemId, d.spec.key, targetBpmOf(lv, d), 'closed', true)]));
    expect(levelLadder(lv, mem, order).top).toBe('fingers');
  });
  it('a lick: closed keys, all 12, and "in my language" as a rung', () => {
    const l = LICKS[0];
    const t = lickTempos(l);
    expect(lickLadder(l, 'piano', {}).top).toBe('new');
    const k0 = LICK_KEYS[0];
    const one = { [lickItemId(l, 'piano', k0)]: item(lickItemId(l, 'piano', k0), k0, t[3], 'closed') };
    expect(lickLadder(l, 'piano', one).top).toBe('closed');
    expect(lickLadder(l, 'piano', one, true).lit).toEqual(['new', 'learning', 'almost', 'closed', 'language']);
    const all = Object.fromEntries(LICK_KEYS.map((k) => [lickItemId(l, 'piano', k), item(lickItemId(l, 'piano', k), k, t[3], 'closed')]));
    expect(lickLadder(l, 'piano', all, true).lit).toEqual(['new', 'learning', 'almost', 'closed', 'keys12', 'language']);
  });
  it('pieces, improvisation levels and other path steps', () => {
    expect(pieceLadder('closed', true).top).toBe('fingers');
    expect(pieceLadder('almost', true).top).toBe('almost');
    expect(improvLadder(undefined).top).toBe('new');
    expect(improvLadder(0.5).top).toBe('learning');
    expect(improvLadder(0.85).top).toBe('almost');
    expect(improvLadder(0.95).top).toBe('closed');
    expect(stepLadder(false, 0).top).toBe('new');
    expect(stepLadder(true, 1).top).toBe('learning');
    expect(stepLadder(true, 3).top).toBe('almost');
    expect(stepLadder(true, 5).top).toBe('closed');
  });
});

describe('the item ↔ assignment (§5.2)', () => {
  const refs: ItemRef[] = [{ k: 'level', id: 'scales-3' }, { k: 'lick', id: 'maj-arp' }, { k: 'piece', key: 'rep:keys:blues-f' }, { k: 'improv', n: 4 }];
  it('every item page maps to a row on today\'s server and back', () => {
    for (const r of refs) {
      const a = assignRefOf(r);
      expect(['drill', 'piece', 'chart']).toContain(a.kind);
      expect(itemOfAssign(a)).toEqual(r);
    }
    expect(itemOfAssign({ kind: 'piece', ref: 'bars 1-8 slowly' })).toBeNull();
    expect(itemOfAssign({ kind: 'topic', ref: 'topic:intervals:2' })).toBeNull();
  });
  it('the newest open assignment for an item; one long past its date drops', () => {
    const base = { ...assignRefOf(refs[1]), createdAt: '2026-11-10T00:00:00Z' };
    const as = [
      { ...base, id: 'old', dueOn: '2026-11-01' },
      { ...base, id: 'new', dueOn: null, createdAt: '2026-11-20T00:00:00Z' },
    ];
    expect(assignmentFor(as, refs[1], '2026-11-23')?.id).toBe('new');
    expect(assignmentFor([as[0]], refs[1], '2026-11-23')).toBeNull();
    expect(assignmentFor(as, refs[0], '2026-11-23')).toBeNull();
  });
  it('the channel the take must meet: notation shown never meets "by ear"', () => {
    expect(channelMet('ear', 'page-known')).toBe(false);
    expect(channelMet('ear', 'ear-known')).toBe(true);
    expect(channelMet('memory', 'unaided')).toBe(true);
    expect(channelMet('memory', 'ear-fresh')).toBe(false);
    expect(channelMet('free', 'page-sight')).toBe(true);
  });
});

describe('a step that requires a channel (§4.4)', () => {
  const lv = twelveKeyLevel();
  const ds = levelDrills(lv, order).slice(0, 3);
  const items = Object.fromEntries(ds.map((d) => [d.itemId, item(d.itemId, d.spec.key, d.startBpm, 'learning')]));
  const at = '2026-11-14T12:00:00Z';
  const opts = { families: [] as string[], items, order, start: {}, vocalPassed: [], at };
  it('without a channel three clean keys open it; "by ear" needs clean ear takes', () => {
    const fam = catalog().find((f) => f.levels.some((l) => l.id === lv.id))!;
    const free = withLadderFacts({}, { ...opts, families: [fam.id] });
    expect(free.steps?.[`tech:${lv.id}`]?.stars ?? 0).toBeGreaterThanOrEqual(1);
    const byEar = withLadderFacts({}, { ...opts, families: [fam.id], channels: { [`tech:${lv.id}`]: 'ear' } });
    expect(byEar.steps?.[`tech:${lv.id}`]).toBeUndefined();
    const heard = Object.fromEntries(Object.entries(items).map(([k, st]) => [k, { ...st, channels: { 'ear-known': { n: 1, clean: 1, best: st.cleanBpm } } } as ItemState]));
    const ok = withLadderFacts({}, { ...opts, items: heard, families: [fam.id], channels: { [`tech:${lv.id}`]: 'ear' } });
    expect(ok.steps?.[`tech:${lv.id}`]?.stars ?? 0).toBeGreaterThanOrEqual(1);
  });
  it('the items as the step sees them, and its run plays it that way', () => {
    const st = items[ds[0].itemId];
    expect(cleanIn(st, 'ear')).toBe(false);
    expect(inChannel(items, 'memory')[ds[0].itemId].cleanBpm).toBe(0);
    expect(stepChannelOf({ id: 'x', channel: 'ear' })).toBe('ear');
    expect(stepChannelOf({ id: 'tech:a' }, { 'tech:a': 'memory' })).toBe('memory');
    const d = levelDrills(lv, order)[0];
    const p = runPresentation({ drill: d, items: {}, targetBpm: targetBpmOf(lv, d), strong: 'page', day: '2026-11-23', force: 'ear' });
    if (p.why !== 'off') expect(p.byEar).toBe(true);
    const m = runPresentation({ drill: d, items: {}, targetBpm: targetBpmOf(lv, d), strong: 'page', day: '2026-11-23', force: 'memory' });
    if (m.why !== 'off') expect(m.fade).toBe('none');
  });
});

describe('a technique step opens the rung in the key of the week (§3.3)', () => {
  it("the week key's open items lead the step's queue", () => {
    const lv = twelveKeyLevel();
    const keys = levelKeys(lv, order).map((k) => ((k % 12) + 12) % 12);
    const wk = keys[5];
    const q = techQueue(lv.id, {}, order, 5, wk);
    expect(((q[0].spec.key % 12) + 12) % 12).toBe(wk);
    const plain = techQueue(lv.id, {}, order, 5);
    expect(((plain[0].spec.key % 12) + 12) % 12).toBe(keys[0]);
    expect(techQueue(lv.id, {}, order, 5, null).map((d) => d.itemId)).toEqual(plain.map((d) => d.itemId));
  });
});

describe('the ladder beside the path node ✓ (§4.2)', () => {
  it('every opened step carries a ladder; the stars stay internal', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    const pin: PathInput = { track: 'hobby', goal: 'general', hidden: [], noSing: false, noMic: false, priorities: ['time', 'pitch', 'memory', 'reading', 'voice', 'creative', 'instrument'], leaveOut: [], packs: [], plays: [], minutes: 10, ratings: {}, events: [], facts: {}, keep: [], reviewDue: 0, now };
    const view0 = buildPath(pin);
    const u = view0.units.find((x) => x.status === 'current')!;
    const x = u.steps.find((y) => y.step.kind !== 'check' && y.step.kind !== 'review')!;
    const view = decorateMastery({ ...view0, units: [{ ...u, steps: [{ ...x, state: 'done', mstars: 3 }] }] }, { items: {}, order, now, facts: {} });
    const s = view.units[0].steps[0];
    expect(s.mstars).toBe(3);
    expect(s.ladder?.top).toBe('almost');
  });
});

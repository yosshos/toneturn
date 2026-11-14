import { describe, expect, it } from 'vitest';
import { FIFTHS, instrumentKeys, keyMastery, recency, skillKeysOf, weakKeysLine } from '../src/engine/analysis/keyMastery';
import { emphasizeWeakKeys, familyById, levelDrills, planWithFocus, WEAK_KEY_CAP } from '../src/engine/drills/plan';
import type { Drill, FamilyId, ItemState } from '../src/engine/drills/types';
import { buildProfile, emptyHistory, keyCounters, keyLineOf, profileDigest, profileItems, withSnapshot } from '../src/engine/analysis/profile';

const NOW = '2026-11-14T10:00:00Z';
const ago = (days: number) => new Date(Date.parse(NOW) - days * 86400000).toISOString();

function item(family: FamilyId, key: number, o: Partial<ItemState> = {}, kind = 'scale'): ItemState {
  return {
    itemId: `${family}:${kind}:${key}:R`,
    family,
    key,
    hands: 'R',
    cleanBpm: 100,
    goalBpm: 100,
    streak: 0,
    fails: 0,
    ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: 0.98 },
    takes: 6,
    last: ago(1),
    history: [],
    targetBpm: 100,
    ...o,
  };
}
const asMap = (xs: ItemState[]) => Object.fromEntries(xs.map((s) => [s.itemId, s]));

describe('key mastery', () => {
  it('a key with too few takes is untried, not weak', () => {
    const items = [item('scales', 0), item('scales', 7), item('scales', 2), item('scales', 1, { takes: 2, cleanBpm: 30, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 0.2 } })];
    const [sk] = keyMastery(items, NOW);
    expect(sk.cells[1].status).toBe('untried');
    expect(sk.weak).not.toContain(1);
    expect(sk.cells[0].status).toBe('strong');
    expect(sk.cells[6].status).toBe('untried');
    expect(sk.tried).toBe(3);
  });

  it('slow and inaccurate keys are weak, also relative to the other keys', () => {
    const items = [0, 7, 2, 9].map((k) => item('scales', k));
    items.push(item('scales', 1, { cleanBpm: 40, ewma: { cv: 0.1, sd: 30, vsd: 10, hands: 0, acc: 0.6 } }));
    items.push(item('scales', 6, { cleanBpm: 70, ewma: { cv: 0.1, sd: 30, vsd: 10, hands: 0, acc: 0.7 } }));
    const sk = skillKeysOf('scales', asMap(items), NOW)!;
    expect(sk.cells[1].status).toBe('weak');
    expect(sk.cells[6].status).toBe('weak'); // 0.7 alone is fine, but far below the other keys
    expect(sk.weak).toEqual([1, 6]);
  });

  it('decays with time since the last take, never below 60 %', () => {
    expect(recency(ago(0), NOW)).toBeCloseTo(1);
    expect(recency(ago(30), NOW)).toBeCloseTo(0.8);
    expect(recency(ago(3000), NOW)).toBeCloseTo(0.6);
    const fresh = keyMastery([item('scales', 0)], NOW)[0].cells[0].mastery;
    const stale = keyMastery([item('scales', 0, { last: ago(60) })], NOW)[0].cells[0].mastery;
    expect(stale).toBeLessThan(fresh);
    expect(stale).toBeGreaterThan(0.6 * fresh - 1e-9);
  });

  it('can split a family by its drill kind', () => {
    const items = [item('jazz', 0, {}, 'ii-v'), item('jazz', 3, {}, 'shell')];
    expect(keyMastery(items, NOW, 'kind').map((s) => s.skill).sort()).toEqual(['jazz:ii-v', 'jazz:shell']);
    expect(keyMastery(items, NOW)).toHaveLength(1);
  });

  it('summarises per instrument and phrases a short line for the coach', () => {
    const items = [0, 7, 2, 9, 4].map((k) => item('jazz', k, { goalBpm: 80 }, 'ii-v'));
    for (const k of [3, 8, 1]) items.push(item('jazz', k, { cleanBpm: 40, goalBpm: 80, ewma: { cv: 0.1, sd: 30, vsd: 10, hands: 0, acc: 0.5 } }, 'ii-v'));
    items.push(item('g-scales', 4));
    const insts = instrumentKeys(items, NOW);
    expect(insts.map((i) => i.instrument)).toEqual(['piano', 'guitar']);
    expect(insts[0].weakest.sort()).toEqual([1, 3, 8]);
    const line = weakKeysLine(insts, (f) => (f === 'jazz' ? 'ii–V lines' : f));
    expect(line).toContain('piano: weakest');
    expect(line).toContain('ii–V lines weak in');
    expect(line).toContain('E♭');
    expect(line).toContain('♩80');
    expect(line).not.toContain('guitar'); // nothing weak there
  });

  it('drums and the player’s own drills have no key map', () => {
    expect(keyMastery([item('d-strokes', 0), item('custom', 0)], NOW)).toHaveLength(0);
  });
});

describe('weak keys in the player profile', () => {
  const weakSet = () => {
    const items = [0, 7, 2, 9, 4].map((k) => item('jazz', k, { goalBpm: 80 }, 'ii-v'));
    for (const k of [3, 8]) items.push(item('jazz', k, { cleanBpm: 40, goalBpm: 80, ewma: { cv: 0.1, sd: 30, vsd: 10, hands: 0, acc: 0.5 } }, 'ii-v'));
    return items;
  };
  const title = (f: FamilyId) => ({ en: f === 'jazz' ? 'ii–V lines' : f, he: f });

  it('adds a weak-key row per weak key and a short line to the digest', () => {
    const items = weakSet();
    const keys = instrumentKeys(items, NOW);
    const rows = profileItems({ model: null, groove: null, pairs: [], ear: [], now: new Date(NOW), keys, titleOf: title });
    expect(rows.map((r) => r.id).sort()).toEqual(['k:jazz:3', 'k:jazz:8']);
    expect(rows[0]).toMatchObject({ source: 'keys', tone: 'pattern', action: { kind: 'drills', family: 'jazz' } });
    const c = { takes: 20, taps: 0, misses: 0, ...keyCounters(items, keys) };
    const h = withSnapshot(emptyHistory(), rows, c, new Date(NOW));
    const prof = { ...buildProfile(rows, h, c), keyLine: keyLineOf(keys, title) };
    const d = profileDigest(prof);
    expect(d.weakKeys).toMatch(/^piano: weakest (E♭, A♭|A♭, E♭); ii–V lines weak in .*♩80/);
    expect(d.patterns.some((p) => p.area === 'keys')).toBe(true);
    // A digest without weak keys has no line.
    expect(profileDigest({ strengths: [], patterns: [], gone: [], ready: true })).not.toHaveProperty('weakKeys');
  });

  it('a weak key is gone only after enough clean takes in that key, and once it is no longer weak', () => {
    const items = weakSet();
    const keys = instrumentKeys(items, NOW);
    const rows = profileItems({ model: null, groove: null, pairs: [], ear: [], now: new Date(NOW), keys, titleOf: title });
    let h = withSnapshot(emptyHistory(), rows, { takes: 20, taps: 0, misses: 0, ...keyCounters(items, keys) }, new Date('2026-11-07T10:00:00Z'));
    expect(h.snaps[0].keyClean).toEqual({ 'k:jazz:3': 0, 'k:jazz:8': 0 });
    expect(h.snaps[0]).not.toHaveProperty('weakKeys');
    // E♭ fixed with 6 clean takes; A♭ still weak.
    const fixed = items.map((s) => (s.key === 3 ? { ...s, cleanBpm: 100, ewma: { ...s.ewma, acc: 0.98 }, history: Array.from({ length: 6 }, (_, i) => ({ at: ago(i), bpm: 100, cv: 0.03 })) } : s));
    const keys2 = instrumentKeys(fixed, NOW);
    const rows2 = profileItems({ model: null, groove: null, pairs: [], ear: [], now: new Date(NOW), keys: keys2, titleOf: title });
    const c2 = { takes: 30, taps: 0, misses: 0, ...keyCounters(fixed, keys2) };
    h = withSnapshot(h, rows2, c2, new Date(NOW));
    const prof = buildProfile(rows2, h, c2);
    expect(prof.gone.map((g) => g.id)).toEqual(['k:jazz:3']);
    expect(prof.patterns.map((p) => p.id)).toContain('k:jazz:8');
    // Not enough clean takes: not gone.
    const few = items.map((s) => (s.key === 3 ? { ...s, cleanBpm: 100, ewma: { ...s.ewma, acc: 0.98 }, history: [{ at: ago(0), bpm: 100, cv: 0.03 }] } : s));
    const k3 = instrumentKeys(few, NOW);
    const r3 = profileItems({ model: null, groove: null, pairs: [], ear: [], now: new Date(NOW), keys: k3, titleOf: title });
    const c3 = { takes: 30, taps: 0, misses: 0, ...keyCounters(few, k3) };
    const h3 = withSnapshot(withSnapshot(emptyHistory(), rows, { takes: 20, taps: 0, misses: 0, ...keyCounters(items, keys) }, new Date('2026-11-07T10:00:00Z')), r3, c3, new Date(NOW));
    expect(buildProfile(r3, h3, c3).gone).toHaveLength(0);
  });
});

describe('weak-key emphasis in the plan', () => {
  const lvl = familyById('scales')!.levels[0];
  const pool = levelDrills(lvl, 'fifths-up');
  const playedAll = (weak: number[]): Record<string, ItemState> => {
    const out: Record<string, ItemState> = {};
    for (const d of pool) {
      const w = weak.includes(d.spec.key);
      out[d.itemId] = { ...item('scales', d.spec.key), itemId: d.itemId, hands: d.spec.hands, cleanBpm: w ? 40 : 100, goalBpm: w ? 50 : 100, ewma: { cv: 0.03, sd: 10, vsd: 5, hands: 0, acc: w ? 0.6 : 0.98 } };
    }
    return out;
  };
  const isWeak = (weak: number[]) => (d: Drill) => (weak.includes(d.spec.key) ? 0 : 2) as 0 | 2;

  it('respects the key order when nothing is known yet', () => {
    const plain = planWithFocus({}, pool, 5, NOW, false).map((x) => x.drill.itemId);
    const focus = planWithFocus({}, pool, 5, NOW, true).map((x) => x.drill.itemId);
    expect(focus).toEqual(plain);
  });

  it('weak keys come in, but never more than 60 % of the slots', () => {
    const weak = [1, 6, 8, 3, 10];
    const items = playedAll(weak);
    const got = planWithFocus(items, pool, 5, NOW, true);
    const nWeak = got.filter((x) => weak.includes(x.drill.spec.key)).length;
    expect(nWeak).toBeGreaterThanOrEqual(2);
    expect(nWeak).toBeLessThanOrEqual(Math.floor(5 * WEAK_KEY_CAP));
  });

  it('cuts an all-weak pick down to the cap and tops up a pick without weak keys', () => {
    const weak = [1, 6, 8, 3, 10];
    const items = playedAll(weak);
    const weakDrills = pool.filter((d) => weak.includes(d.spec.key)).slice(0, 5);
    const capped = emphasizeWeakKeys(weakDrills.map((d) => ({ drill: d, role: 'weak' as const })), pool, items, 5, isWeak(weak));
    expect(capped).toHaveLength(5);
    expect(capped.filter((x) => weak.includes(x.drill.spec.key)).length).toBe(3);
    const strong = pool.filter((d) => !weak.includes(d.spec.key)).slice(0, 5);
    const topped = emphasizeWeakKeys(strong.map((d) => ({ drill: d, role: 'maintenance' as const })), pool, items, 5, isWeak(weak));
    expect(topped.filter((x) => weak.includes(x.drill.spec.key)).length).toBe(2);
  });

  it('every one of the 12 keys still rotates in over a few weeks', () => {
    const weak = [1, 6, 11];
    let items = playedAll(weak);
    const seen = new Set<number>();
    for (let day = 0; day < 21; day++) {
      const at = new Date(Date.parse(NOW) + day * 86400000).toISOString();
      const got = planWithFocus(items, pool, 5, at, true);
      expect(got.filter((x) => weak.includes(x.drill.spec.key)).length).toBeLessThanOrEqual(3);
      items = { ...items };
      for (const x of got) {
        seen.add(x.drill.spec.key);
        items[x.drill.itemId] = { ...items[x.drill.itemId], takes: items[x.drill.itemId].takes + 1, last: at };
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(FIFTHS.slice().sort((a, b) => a - b));
  });
});

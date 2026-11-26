import { beforeEach, describe, expect, it } from 'vitest';
import type { ItemState } from '../src/engine/drills/types';
import { mergeItem, mergeItems, sameItem } from '../src/storage/drillMerge';

// SPEC-CLIMB-SYNC §3: drill items sync across devices (owner 2026-11-26: "I switch devices sometimes").
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => void (mem[k] = v),
  removeItem: (k: string) => void delete mem[k],
};

const item = (o: Partial<ItemState> = {}): ItemState => ({
  itemId: 'scales:scale:0:RL:o2',
  family: 'scales',
  key: 0,
  hands: 'RL',
  cleanBpm: 60,
  goalBpm: 63,
  streak: 0,
  fails: 0,
  ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 1 },
  takes: 5,
  last: '2026-11-25T10:00:00Z',
  history: [{ at: '2026-11-25', bpm: 60, cv: 0 }],
  ...o,
});

describe('mergeItem (§3.3)', () => {
  it('the copy with more takes is the base; tempi max, stages union, logs union by moment', () => {
    const a = item({ takes: 9, goalBpm: 66, cleanBpm: 63, stages: ['A-1', 'A-2'], history: [{ at: '2026-11-24', bpm: 58, cv: 0 }, { at: '2026-11-25', bpm: 63, cv: 0 }] });
    const b = item({ takes: 4, goalBpm: 80, cleanBpm: 72, stages: ['A-3'], history: [{ at: '2026-11-23', bpm: 72, cv: 0 }] });
    const m = mergeItem(a, b);
    expect(m.goalBpm).toBe(66);
    expect(m.cleanBpm).toBe(72);
    expect(m.takes).toBe(9);
    expect(m.stages!.sort()).toEqual(['A-1', 'A-2', 'A-3']);
    expect(m.history.map((h) => h.at)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
  });

  it('a tie in takes goes to the later play', () => {
    const a = item({ takes: 5, last: '2026-11-25T10:00:00Z', goalBpm: 63 });
    const b = item({ takes: 5, last: '2026-11-26T10:00:00Z', goalBpm: 69 });
    expect(mergeItem(a, b).goalBpm).toBe(69);
    expect(mergeItem(b, a).goalBpm).toBe(69);
  });

  it('idempotent, and the same both ways round', () => {
    const a = item({ takes: 9, stages: ['A-1'], ceil: { nps: 3.2, at: '2026-11-25T10:00:00Z' } });
    const b = item({ takes: 4, stages: ['A-3'], cleanBpm: 66 });
    const m = mergeItem(a, b);
    expect(sameItem(mergeItem(m, b), m)).toBe(true);
    expect(sameItem(mergeItem(m, m), m)).toBe(true);
    expect(sameItem(mergeItem(b, a), m)).toBe(true);
  });

  it('a ceiling: the lower of two recent ones; gone once the clean tempo reached it', () => {
    const a = item({ ceil: { nps: 3.0, at: '2026-11-25T10:00:00Z', npb: 2 } });
    const b = item({ ceil: { nps: 2.6, at: '2026-11-24T10:00:00Z', npb: 2 } });
    expect(mergeItem(a, b).ceil?.nps).toBe(2.6);
    // eighths ♩84 = 2.8 nps: the 2.6 ceiling is passed and drops out first; the 3.0 one (not reached) stays (review 2)
    expect(mergeItem(a, { ...b, cleanBpm: 84 }).ceil?.nps).toBe(3.0);
    expect(mergeItem({ ...a, cleanBpm: 92 }, { ...b, cleanBpm: 92 }).ceil).toBeUndefined();
  });

  it('mergeItems: new remote items come in; unchanged ones are not counted', () => {
    const local = { [item().itemId]: item() };
    const other = item({ itemId: 'scales:scale:7:RL:o2', key: 7 });
    const r = mergeItems(local, [item(), other]);
    expect(r.changed).toEqual([other.itemId]);
    expect(Object.keys(r.items)).toHaveLength(2);
  });
});

describe('the sync client (§3.2, review 1)', () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
  });

  /** A server like 20261212000000: rows with updated_at; a put with an old `base` is refused. */
  function server() {
    const rows = new Map<string, { state: ItemState; at: string }>();
    let clock = Date.parse('2026-11-26T09:00:00Z');
    const fn = async (name: string, args: Record<string, unknown>) => {
      if (name === 'toneturn_drill_items_get') {
        const since = (args.p_since as string | null) ?? '';
        return [...rows].filter(([, r]) => r.at > since).map(([id, r]) => ({ item_id: id, state: r.state, updated_at: r.at }));
      }
      const out: { item_id: string; updated_at: string }[] = [];
      for (const x of args.p_items as { id: string; state: ItemState; base: string | null }[]) {
        const cur = rows.get(x.id);
        if (cur && !(x.base && cur.at <= x.base)) continue;
        clock += 1000;
        const at = new Date(clock).toISOString();
        rows.set(x.id, { state: x.state, at });
        out.push({ item_id: x.id, updated_at: at });
      }
      return out;
    };
    return { rows, fn };
  }
  /** A device: its own items and its own sync bookkeeping (swapped into the shared localStorage while it runs). */
  function device(items0: Record<string, ItemState>) {
    let ls: Record<string, string> = {};
    const swapIn = () => {
      for (const k of Object.keys(mem)) delete mem[k];
      Object.assign(mem, ls);
    };
    const swapOut = () => (ls = { ...mem });
    const d = {
      items: items0,
      async sync(S: typeof import('../src/cloud/drillSync')) {
        swapIn();
        const ok = await S.drillSync({
          epoch: 'E',
          userId: 'u',
          items: async () => d.items,
          merge: async (remote) => {
            const r = mergeItems(d.items, remote);
            d.items = r.items;
            return r;
          },
        });
        swapOut();
        return ok;
      },
      save(D: typeof import('../src/storage/drillDirty'), st: ItemState) {
        swapIn();
        d.items = { ...d.items, [st.itemId]: st };
        D.markDrillDirty([st.itemId]);
        swapOut();
      },
    };
    return d;
  }

  it('a device that syncs for the first time never overwrites newer takes from the other device', async () => {
    const S = await import('../src/cloud/drillSync');
    const srv = server();
    S.setDrillSyncBackend(srv.fn);
    const id = item().itemId;
    const A = device({ [id]: item({ takes: 50, stages: ['A-1', 'A-2', 'A-3'], cleanBpm: 72 }) });
    const B = device({ [id]: item({ takes: 40, stages: ['A-1'], cleanBpm: 60 }) });
    expect(await A.sync(S)).toBe(true);
    expect(await B.sync(S)).toBe(true);
    // B pulled first and merged: it holds A's 50 takes and stages; the row holds them too
    expect(B.items[id].takes).toBe(50);
    expect(B.items[id].stages!.sort()).toEqual(['A-1', 'A-2', 'A-3']);
    expect(srv.rows.get(id)!.state.takes).toBe(50);
    S.setDrillSyncBackend(null);
  });

  it('two devices playing the same item: a push over an unseen row is refused, then merged; both converge, no ping-pong', async () => {
    const D = await import('../src/storage/drillDirty');
    const S = await import('../src/cloud/drillSync');
    const srv = server();
    S.setDrillSyncBackend(srv.fn);
    const id = item().itemId;
    const A = device({ [id]: item({ takes: 5 }) });
    const B = device({});
    await A.sync(S);
    await B.sync(S);
    // both play it offline
    A.save(D, { ...A.items[id], takes: 8, stages: ['A-3'], last: '2026-11-26T10:00:00Z' });
    B.save(D, { ...B.items[id], takes: 7, stages: ['A-4'], last: '2026-11-26T10:30:00Z', cleanBpm: 80 });
    await A.sync(S);
    await B.sync(S);
    await A.sync(S);
    for (const d of [A, B]) {
      expect(d.items[id].stages!.slice().sort()).toEqual(['A-3', 'A-4']);
      expect(d.items[id].cleanBpm).toBe(80);
    }
    expect(sameItem(A.items[id], B.items[id])).toBe(true);
    const before = srv.rows.get(id)!.at;
    await A.sync(S);
    await B.sync(S);
    expect(srv.rows.get(id)!.at).toBe(before);
    S.setDrillSyncBackend(null);
  });

  it('a failed push stays dirty; a save during a push stays dirty', async () => {
    const D = await import('../src/storage/drillDirty');
    const S = await import('../src/cloud/drillSync');
    const items = { a: item({ itemId: 'a' }), b: item({ itemId: 'b' }) };
    D.markDrillDirty(['a', 'b']);
    let fail = true;
    S.setDrillSyncBackend(async (fn, args) => {
      if (fn !== 'toneturn_drill_items_put') return [];
      if (fail) throw new Error('offline');
      D.markDrillDirty(['b']);
      return (args.p_items as { id: string }[]).map((x) => ({ item_id: x.id, updated_at: '2026-11-26T09:00:00Z' }));
    });
    expect((await S.pushDrillItems(async () => items, 'E', 'E|u')).ok).toBe(false);
    expect(Object.keys(D.drillDirty()).sort()).toEqual(['a', 'b']);
    fail = false;
    expect((await S.pushDrillItems(async () => items, 'E', 'E|u')).ok).toBe(true);
    expect(Object.keys(D.drillDirty())).toEqual(['b']);
    S.setDrillSyncBackend(null);
  });

  it('bookkeeping is per epoch and account', async () => {
    const D = await import('../src/storage/drillDirty');
    D.setDrillPulledAt('E|u', '2026-11-26T09:00:00Z');
    expect(D.drillPulledAt('E|u')).toBe('2026-11-26T09:00:00Z');
    expect(D.drillPulledAt('E|v')).toBeNull();
    expect(D.drillPulledAt('F|u')).toBeNull();
  });
});

describe('merge details (review 1)', () => {
  it('history: one entry per day, the higher tempo; pulling its own row back changes nothing', () => {
    const pushed = item({ history: [{ at: '2026-11-26T10:00:00Z', bpm: 60, cv: 0 }] });
    const now = item({ takes: 6, history: [{ at: '2026-11-26T10:05:00Z', bpm: 66, cv: 0 }] });
    const m = mergeItem(now, pushed);
    expect(m.history).toEqual([{ at: '2026-11-26T10:05:00Z', bpm: 66, cv: 0 }]);
    expect(sameItem(m, now)).toBe(true);
  });
  it('the pass log keeps the ladder cap of 60', () => {
    const log = (n: number, from: number) => Array.from({ length: n }, (_, k) => ({ at: new Date(Date.parse('2026-11-01T00:00:00Z') + (from + k) * 3_600_000).toISOString(), bpm: 60 }));
    const m = mergeItem(item({ takes: 9, passLog: log(60, 10) }), item({ passLog: log(60, 0) }));
    expect(m.passLog).toHaveLength(60);
  });
  it('a tie in takes and moment: both devices pick the same copy', () => {
    const a = item({ goalBpm: 63, ceiling: { bpm: 60, until: '2026-11-28' } });
    const b = item({ goalBpm: 66 });
    expect(sameItem(mergeItem(a, b), mergeItem(b, a))).toBe(true);
  });
  it('a ceiling clears only at its own notes per beat', () => {
    // quarters (1 per beat): ♩120 = 2.0 nps, under a 3.0 ceiling
    const q = item({ itemId: 'x:y:0:R', cleanBpm: 120, ceil: { nps: 3.0, at: '2026-11-25T10:00:00Z', npb: 1 } });
    expect(mergeItem(q, q).ceil?.nps).toBe(3.0);
    expect(mergeItem(q, { ...q, cleanBpm: 180 }).ceil).toBeUndefined();
  });
});

describe('the store never lets a stale copy undo a merge (review 2)', () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
  });

  it('a take built on the copy from before a merge is merged onto the merged item (its own tempo and goal kept)', async () => {
    const { ProgressStore, emptyProgress } = await import('../src/storage/progress');
    const { memoryKV } = await import('../src/storage/kv');
    const store = new ProgressStore(memoryKV());
    const id = item().itemId;
    const mine = item({ takes: 10, cleanBpm: 100, goalBpm: 104 });
    await store.saveProgress({ ...emptyProgress(), drillItems: { [id]: mine } }, true);
    // another device's row comes in: more stages and a faster clean tempo
    await store.mergeDrillItems([item({ takes: 8, cleanBpm: 110, stages: ['A-3'], history: [{ at: '2026-11-20', bpm: 110, cv: 0 }] })]);
    const merged = (await store.loadProgress()).drillItems![id];
    expect(merged.rev).toBeTruthy();
    // the screen still holds `mine` (no rev): its next take has 11 takes and a new goal
    await store.recordDrill({ ...mine, takes: 11, goalBpm: 108, last: '2026-11-26T11:00:00Z' });
    const after = (await store.loadProgress()).drillItems![id];
    expect(after.takes).toBe(11);
    expect(after.goalBpm).toBe(108);
    expect(after.cleanBpm).toBe(110);
    expect(after.stages).toEqual(['A-3']);
    expect(after.history.some((h) => h.bpm === 110)).toBe(true);
  });

  it('a whole-progress save from an older copy keeps the drill items as stored', async () => {
    const { ProgressStore, emptyProgress } = await import('../src/storage/progress');
    const { memoryKV } = await import('../src/storage/kv');
    const store = new ProgressStore(memoryKV());
    const old = { ...emptyProgress(), drillItems: { a: item({ itemId: 'a', takes: 1 }) } };
    await store.saveProgress(old, true);
    await store.recordDrill(item({ itemId: 'a', takes: 2 }));
    await store.saveProgress({ ...old, xp: 99 });
    const p = await store.loadProgress();
    expect(p.xp).toBe(99);
    expect(p.drillItems!.a.takes).toBe(2);
  });

  it('the pull pages until a short page', async () => {
    const S = await import('../src/cloud/drillSync');
    const all = Array.from({ length: 1203 }, (_, k) => ({ item_id: `i${String(k).padStart(5, '0')}`, state: item({ itemId: `i${k}` }), updated_at: '2026-11-26T09:00:00.000Z' }));
    const calls: unknown[] = [];
    S.setDrillSyncBackend(async (_fn, args) => {
      calls.push(args.p_after);
      const after = (args.p_after as string | null) ?? '';
      return all.filter((r) => !args.p_since || r.item_id > after).slice(0, args.p_limit as number);
    });
    let got = 0;
    await S.pullDrillItems('E', 'E|u', async (remote) => {
      got = remote.length;
      return { items: {}, changed: [] };
    });
    expect(got).toBe(1203);
    expect(calls.length).toBe(3);
    S.setDrillSyncBackend(null);
  });
});

import { expect, it } from 'vitest';

// SPEC-WEEK-PLAN-TILT §1.3: the device queue. A storage write that fails (full or blocked) must not make the rest of a
// send disappear: the window's own copy goes on, every item is sent or stays listed.
it('a full localStorage: a send still goes through every item; a failed one stays waiting', async () => {
  const mem: Record<string, string> = {};
  let full = false;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => {
      if (full && k === 'toneturn.weekPlanQueue.v1') throw new Error('QuotaExceeded');
      mem[k] = v;
    },
    removeItem: (k: string) => void delete mem[k],
  };
  const W = await import('../src/engine/weekPlan');
  const Q = await import('../src/storage/weekPlanQueue');
  Q.resetWeekPlanQueue();
  full = true;
  const item = (ref: string) => ({ kind: 'piece' as const, lessonId: null, ref, strictness: 'moderate' as const, targetBpm: null, note: null, channel: 'free' as const, minutes: null, ifShort: 'spread' as const, dueAfter: 2 });
  let n = 0;
  const entries = W.queueOf([item('a'), item('b'), item('c')], '2026-11-26', () => `p${n++}`);
  Q.updateQueue((q) => W.beginSend(q, 'P', 'C', entries));
  const assigned: string[] = [];
  const r = await W.sendItems(
    entries,
    'C',
    {
      assign: async (p) => {
        assigned.push(p.ref!);
        if (p.ref === 'c') throw new Error('net');
        return `id-${p.ref}`;
      },
      setOpts: async () => {},
    },
    {
      created: (e) => Q.updateQueue((q) => W.itemDone(q, 'P', 'C', e.pid)),
      keep: (e) => W.pendingOf(Q.queueNow(), 'P', 'C').some((x) => x.pid === e.pid),
      done: (e) => Q.updateQueue((q) => W.itemDone(q, 'P', 'C', e.pid)),
    },
  );
  expect(assigned).toEqual(['a', 'b', 'c']);
  expect(r.sent).toHaveLength(2);
  expect(W.pendingOf(Q.queueNow(), 'P', 'C').map((x) => x.item.ref)).toEqual(['c']);
});

it('deleting a plan keeps the entries whose options are still to be saved', async () => {
  const W = await import('../src/engine/weekPlan');
  const item = { kind: 'drill' as const, lessonId: null, ref: 'x', strictness: 'moderate' as const, targetBpm: null, note: null, channel: 'ear' as const, minutes: 5, ifShort: 'spread' as const, dueAfter: 2 };
  const [a, b] = W.queueOf([item, { ...item, ref: 'y' }], '2026-12-01', (() => {
    let k = 0;
    return () => `d${k++}`;
  })());
  let q = W.beginSend({}, 'P', 'C', [a, b]);
  q = W.withMade(q, 'P', 'C', a.pid, 'A1');
  q = W.dropPlan(q, 'P');
  expect(W.pendingOf(q, 'P', 'C').map((x) => x.made)).toEqual(['A1']);
});

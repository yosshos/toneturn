import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { addDays, addPlan, beginSend, canAddPlan, defaultPick, deletePlan, dropPlan, DUE_DEFAULT, itemDone, itemOf, markSentDay, matchMade, moveItem, withMade, pendingCount, pendingOf, PLAN_MAX, PLAN_MAX_ITEMS, planOf, queueOf, refusalOf, removeItem, renamePlan, sameItem, saveProblem, scheduleOf, sendItems, sentOn, withoutDemo, type PendingItem, type Queue, type SourceAssignment, type WeekPlan } from '../src/engine/weekPlan';
import { encodePhraseRef, decodePhraseRef, assignmentOf, defaultAssignPlan } from '../src/engine/encore/assign';
import { DEFAULT_SETTINGS, DEVICE_SETTINGS } from '../src/storage/progress';
import { KEEP_SETTINGS } from '../src/storage/freshStart';
import { dailyMinutesOf } from '../src/engine/practiceSession';

// SPEC-WEEK-PLAN-TILT (owner 2026-11-25)

const A = (o: Partial<SourceAssignment> = {}): SourceAssignment => ({ kind: 'drill', lessonId: 'drill', ref: 'scales-1', dueOn: '2026-11-28', strictness: 'moderate', targetBpm: 80, note: ' slow first ', createdAt: '2026-11-25T09:00:00Z', ...o });
const NOW = '2026-11-25T10:00:00Z';

describe('§1 the teacher weekly plan', () => {
  it('an assignment becomes a plan item: due offset from the day it was assigned, options kept, no demo', () => {
    const it0 = itemOf({ ...A(), opts: { channel: 'ear', minutes: 10, ifShort: 'today' } });
    expect(it0).toEqual({ kind: 'drill', lessonId: null, ref: 'scales-1', strictness: 'moderate', targetBpm: 80, note: 'slow first', channel: 'ear', minutes: 10, ifShort: 'today', dueAfter: 3 });
    expect(itemOf(A({ dueOn: null })).dueAfter).toBe(DUE_DEFAULT);
    expect(itemOf(A({ dueOn: '2027-01-30' })).dueAfter).toBe(14);
    expect(itemOf(A({ dueOn: '2026-11-20' })).dueAfter).toBe(0);
    expect(itemOf(A({ kind: 'lesson', lessonId: 'intervals-1', ref: null })).lessonId).toBe('intervals-1');
    expect(itemOf(A()).channel).toBe('free');
    expect(itemOf(A({ note: '   ' })).note).toBeNull();
  });
  it('a plan needs a name and an item; at most 12 items; names trimmed to 40', () => {
    expect(planOf('  ', [A()], 'p1', NOW)).toBeNull();
    expect(planOf('W', [], 'p1', NOW)).toBeNull();
    const p = planOf('x'.repeat(60), Array.from({ length: 20 }, () => A()), 'p1', NOW)!;
    expect(p.items).toHaveLength(PLAN_MAX_ITEMS);
    expect(p.name).toHaveLength(40);
  });
  it('the list: newest first, at most 30 and never dropped silently; rename, remove (the last stays), move, delete', () => {
    let list: WeekPlan[] = [];
    for (let i = 0; i < 35; i++) list = addPlan(list, planOf(`P${i}`, [A()], `p${i}`, NOW)!);
    expect(list).toHaveLength(PLAN_MAX);
    expect(list[0].id).toBe('p29');
    expect(list.some((p) => p.id === 'p0')).toBe(true);
    expect(canAddPlan(list)).toBe(false);
    list = deletePlan(list, 'p0');
    expect(canAddPlan(list)).toBe(true);
    const two = planOf('Two', [A({ ref: 'a' }), A({ ref: 'b' })], 'two', NOW)!;
    list = addPlan(list, two);
    list = renamePlan(list, 'two', '  New  name ');
    expect(list[0].name).toBe('New name');
    expect(renamePlan(list, 'two', '   ')[0].name).toBe('New name');
    list = moveItem(list, 'two', 0, 1);
    expect(list[0].items.map((x) => x.ref)).toEqual(['b', 'a']);
    expect(moveItem(list, 'two', 1, 1)).toEqual(list);
    list = removeItem(list, 'two', 0);
    expect(list[0].items.map((x) => x.ref)).toEqual(['a']);
    list = removeItem(list, 'two', 0);
    expect(list[0].items.map((x) => x.ref)).toEqual(['a']);
    expect(deletePlan(list, 'two').some((p) => p.id === 'two')).toBe(false);
  });
  it('saving checks the newest 12 by default, in assigned order', () => {
    const many = Array.from({ length: 20 }, (_, i) => A({ ref: `r${i}`, createdAt: `2026-11-${String(i + 1).padStart(2, '0')}T09:00:00Z` }));
    const pick = defaultPick([...many].reverse());
    expect(pick.map((a) => a.ref)).toEqual(Array.from({ length: 12 }, (_, i) => `r${i + 8}`));
  });
  let n = 0;
  const pid = () => `q${++n}`;
  type St = { list: WeekPlan[]; q: Queue };
  /** The UI's send: queue on the device, send, take each item off the queue and record its day the moment it goes out. */
  const run = async (st: St, id: string, classId: string, entries: PendingItem[], fresh: boolean, calls: Parameters<typeof sendItems>[2]) => {
    let { list, q } = st;
    if (fresh) q = beginSend(q, id, classId, entries);
    const r = await sendItems(entries, classId, calls, {
      created: (e, aid) => {
        q = withMade(q, id, classId, e.pid, aid);
        list = markSentDay(list, id, classId, e.start);
      },
      done: (e) => (q = itemDone(q, id, classId, e.pid)),
    });
    return { st: { list, q }, r };
  };
  it('sending: due dates from the start day, in order, options only when not the default', async () => {
    const p = planOf('W', [A({ dueOn: '2026-11-25' }), { ...A({ ref: 'b', dueOn: '2026-12-02' }), opts: { channel: 'memory', minutes: null, ifShort: 'spread' } }], 'w', NOW)!;
    expect(scheduleOf(p, '2026-12-01').map((x) => x.dueOn)).toEqual(['2026-12-01', '2026-12-08']);
    const calls: string[] = [];
    const { st, r } = await run({ list: [p], q: {} }, 'w', 'c1', queueOf(p.items, '2026-12-01', pid), true, {
      assign: async (a) => (calls.push(`assign ${a.ref} ${a.dueOn} ${a.classId}`), `id-${a.ref}`),
      setOpts: async (id, o) => void calls.push(`opts ${id} ${o.channel}`),
    });
    expect(r.sent).toHaveLength(2);
    expect(r.optsFailed).toEqual([]);
    expect(calls).toEqual(['assign scales-1 2026-12-01 c1', 'assign b 2026-12-08 c1', 'opts id-b memory']);
    expect(st.q).toEqual({});
    expect(sentOn(st.list[0], 'c1', '2026-12-01')).toBe(true);
  });
  it('failed items stay waiting by identity; a retry after an edit sends exactly them; options that fail keep the item listed until saved', async () => {
    let st: St = { list: [planOf('W', [A({ ref: 'a' }), A({ ref: 'b' }), { ...A({ ref: 'c' }), opts: { channel: 'ear', minutes: 5, ifShort: 'spread' } }], 'w', NOW)!], q: {} };
    const made: string[] = [];
    const opts: string[] = [];
    let failB = true;
    let optsDown = true;
    const calls = {
      assign: async (a: { ref: string | null }) => {
        if (a.ref === 'b' && failB) throw new Error('net');
        made.push(a.ref!);
        return `id-${a.ref}`;
      },
      setOpts: async (id: string) => {
        if (optsDown) throw new Error('opts down');
        opts.push(id);
      },
    };
    const first = await run(st, 'w', 'c1', queueOf(st.list[0].items, '2026-12-01', pid), true, calls);
    st = first.st;
    expect(pendingOf(st.q, 'w', 'c1').map((x) => [x.item.ref, x.made ?? null])).toEqual([['b', null], ['c', 'id-c']]);
    expect(first.r.optsFailed.map((x) => x.made)).toEqual(['id-c']);
    expect(sentOn(st.list[0], 'c1', '2026-12-01')).toBe(true);
    st = { ...st, list: removeItem(moveItem(st.list, 'w', 2, -1), 'w', 0) };
    failB = false;
    optsDown = false;
    st = (await run(st, 'w', 'c1', pendingOf(st.q, 'w', 'c1'), false, calls)).st;
    // b created once; c never created again, only its options saved
    expect(made).toEqual(['a', 'c', 'b']);
    expect(opts).toEqual(['id-c']);
    expect(st.q).toEqual({});
  });
  it('the server check: one assignment matches at most one waiting item, exactly (target, due, strictness, tempo, note), made since queued', () => {
    let q: Queue = {};
    // a tempo ladder: the same drill twice, at 60 then 90
    const p = planOf('W', [A({ ref: 'a' }), A({ ref: 'x', targetBpm: 60 }), A({ ref: 'x', targetBpm: 90 }), A({ ref: 'y' }), A({ ref: 'z' })], 'w', NOW)!;
    const e = queueOf(p.items, '2026-12-01', pid, '2026-11-25T10:00:00Z');
    q = beginSend(q, 'w', 'c1', e);
    q = itemDone(q, 'w', 'c1', e[0].pid);
    const due = addDays('2026-12-01', 3);
    const server = [
      { id: 's1', kind: 'drill', ref: 'x', dueOn: due, strictness: 'moderate', targetBpm: 60, note: 'slow first', createdAt: '2026-11-25T10:00:05Z' },
      { id: 's2', kind: 'drill', ref: 'y', dueOn: due, strictness: 'moderate', targetBpm: 80, note: 'slow first', createdAt: '2026-11-01T10:00:00Z' }, // older: not this send
      { id: 's3', kind: 'drill', ref: 'z', dueOn: due, strictness: 'strict', targetBpm: 80, note: 'slow first', createdAt: '2026-11-25T10:00:06Z' }, // another strictness
    ];
    const m = matchMade(pendingOf(q, 'w', 'c1'), server);
    const refOf = (pid: string) => pendingOf(q, 'w', 'c1').find((x) => x.pid === pid)!.item;
    expect([...m.entries()].map(([k, v]) => [refOf(k).ref, refOf(k).targetBpm, v])).toEqual([['x', 60, 's1']]);
    // two identical waiting items and one made: only one matches
    const twins = queueOf([p.items[1], p.items[1]], '2026-12-01', pid, '2026-11-25T10:00:00Z');
    expect(matchMade(twins, server).size).toBe(1);
  });
  it('waiting items of another day or class survive later sends; a whole-plan resend for that day replaces them; discard; drop with the plan', async () => {
    let st: St = { list: [planOf('W', [A({ ref: 'a' }), A({ ref: 'b' })], 'w', NOW)!], q: {} };
    const fail = { assign: async () => Promise.reject(new Error('offline')), setOpts: async () => {} };
    const ok = { assign: async () => 'id', setOpts: async () => {} };
    st = (await run(st, 'w', 'c1', queueOf(st.list[0].items, '2026-12-01', pid), true, fail)).st;
    expect(pendingOf(st.q, 'w', 'c1')).toHaveLength(2);
    expect(sentOn(st.list[0], 'c1', '2026-12-01')).toBe(false);
    st = (await run(st, 'w', 'c1', queueOf(st.list[0].items, '2026-12-08', pid), true, ok)).st;
    expect(pendingOf(st.q, 'w', 'c1').map((x) => x.start)).toEqual(['2026-12-01', '2026-12-01']);
    st = (await run(st, 'w', 'c2', queueOf(st.list[0].items, '2026-12-01', pid), true, fail)).st;
    expect(pendingCount(st.q, 'w')).toBe(4);
    st = (await run(st, 'w', 'c1', queueOf(st.list[0].items, '2026-12-01', pid), true, ok)).st;
    expect(pendingOf(st.q, 'w', 'c1')).toEqual([]);
    expect(sentOn(st.list[0], 'c1', '2026-12-01')).toBe(true);
    const one = pendingOf(st.q, 'w', 'c2')[0];
    st = { ...st, q: itemDone(st.q, 'w', 'c2', one.pid) };
    expect(pendingOf(st.q, 'w', 'c2')).toHaveLength(1);
    expect(dropPlan(st.q, 'w')).toEqual({});
  });
  it('an assignment already accounted for never stands for another item; a resend keeps entries already made; a skipped entry is not sent', async () => {
    const p = planOf('W', [A({ ref: 'x' }), A({ ref: 'x' })], 'w', NOW)!;
    const e = queueOf(p.items, '2026-12-01', pid, '2026-11-25T10:00:00Z');
    const due = addDays('2026-12-01', 3);
    const server = [{ id: 'X', kind: 'drill', ref: 'x', dueOn: due, strictness: 'moderate', targetBpm: 80, note: 'slow first', createdAt: '2026-11-25T10:00:05Z' }];
    // X is item 1 (created here, or held by its made entry): item 2 must still be created
    expect(matchMade([e[1]], server, new Set(['X'])).size).toBe(0);
    expect(matchMade([e[1]], server).size).toBe(1);
    let q: Queue = beginSend({}, 'w', 'c1', e);
    q = withMade(q, 'w', 'c1', e[0].pid, 'X');
    const again = queueOf(p.items, '2026-12-01', pid);
    q = beginSend(q, 'w', 'c1', again);
    expect(pendingOf(q, 'w', 'c1').map((x) => x.made ?? x.pid)).toEqual(['X', again[0].pid, again[1].pid]);
    const made: string[] = [];
    const r = await sendItems(again, 'c1', { assign: async (a) => (made.push(String(a.ref)), 'id'), setOpts: async () => {} }, { created: () => {}, done: () => {}, keep: (x) => x.pid !== again[0].pid });
    expect(made).toEqual(['x']);
    expect(r.sent).toHaveLength(1);
  });
  it('a resend replaces only waiting entries of the same item and day; a waiting item removed from the plan stays listed', () => {
    const a = A({ ref: 'a' }), b = A({ ref: 'b' }), c = A({ ref: 'c' });
    const p = planOf('W', [a, b, c], 'w', NOW)!;
    const first = queueOf(p.items, '2026-12-01', pid);
    let q: Queue = beginSend({}, 'w', 'c1', first);
    q = itemDone(itemDone(q, 'w', 'c1', first[0].pid), 'w', 'c1', first[2].pid); // b waits
    const edited = removeItem(addPlan([], p), 'w', 1)[0]; // b removed from the plan
    const again = queueOf(edited.items, '2026-12-01', pid);
    q = beginSend(q, 'w', 'c1', again);
    expect(pendingOf(q, 'w', 'c1').map((x) => x.item.ref)).toEqual(['b', 'a', 'c']);
    expect(pendingOf(q, 'w', 'c1')[0].pid).toBe(first[1].pid);
  });
  it('matching by the send’s "before" list, not by clocks: an assignment that existed before the send is never the item', () => {
    const p = planOf('W', [A({ ref: 'x' })], 'w', NOW)!;
    // queued with a device clock far ahead of the server
    const [e] = queueOf(p.items, '2026-12-01', pid, '2026-11-25T12:00:00Z').map((x) => ({ ...x, batch: 'B1' }));
    const due = addDays('2026-12-01', 3);
    const row = (id: string, at: string) => ({ id, kind: 'drill', ref: 'x', dueOn: due, strictness: 'moderate', targetBpm: 80, note: 'slow first', createdAt: at });
    const before = (b: string | undefined) => (b === 'B1' ? new Set(['OLD']) : null);
    expect([...matchMade([e], [row('OLD', '2026-11-20T10:00:00Z'), row('NEW', '2026-11-25T10:00:00Z')], new Set(), before).values()]).toEqual(['NEW']);
    expect(matchMade([e], [row('OLD', '2026-11-20T10:00:00Z')], new Set(), before).size).toBe(0);
  });
  it('the same item after a cloud round trip (jsonb reorders keys) is still the same item; a resend stands in for it', () => {
    const item = itemOf(A({ ref: 'x' }));
    const jsonb = Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.length - b.length || a.localeCompare(b))) as typeof item;
    expect(JSON.stringify(jsonb)).not.toBe(JSON.stringify(item));
    expect(sameItem(item, jsonb)).toBe(true);
    expect(sameItem(item, { ...jsonb, targetBpm: 90 })).toBe(false);
    const [old] = queueOf([item], '2026-12-01', pid);
    const again = queueOf([jsonb], '2026-12-01', pid);
    const q = beginSend(beginSend({}, 'w', 'c1', [old]), 'w', 'c1', again);
    expect(pendingOf(q, 'w', 'c1').map((x) => x.pid)).toEqual([again[0].pid]);
  });
  it('a stated refusal (class full, too long) is told apart from a connection failure', () => {
    expect(refusalOf(new Error('too many assignments'))).toBe('full');
    expect(refusalOf(new Error('ref too long'))).toBe('long');
    expect(refusalOf(new Error('phrase too long'))).toBe('long');
    expect(refusalOf(new Error('Failed to fetch'))).toBeNull();
  });
  it('the waiting queue is never part of the synced plan', () => {
    const p = planOf('W', [A()], 'w', NOW)!;
    expect(Object.keys(markSentDay([p], 'w', 'c1', '2026-12-01')[0]).sort()).toEqual(['createdAt', 'id', 'items', 'name', 'sent']);
  });
  it('size: a plan and all plans together are bounded in the synced settings', () => {
    const big = 'phrase1:' + JSON.stringify({ n: 'x', r: 'A'.repeat(5000) });
    const p = planOf('Big', Array.from({ length: 12 }, () => A({ kind: 'phrase', ref: big })), 'big', NOW)!;
    expect(saveProblem([], p)).toBe('plan');
    const mid = planOf('Mid', Array.from({ length: 8 }, () => A({ kind: 'phrase', ref: big })), 'm', NOW)!;
    expect(saveProblem([], mid)).toBeNull();
    const many = Array.from({ length: 6 }, (_, i) => ({ ...mid, id: `m${i}` }));
    expect(saveProblem(many, mid)).toBe('total');
  });
  it('a phrase item keeps its notes but never the teacher demo', () => {
    const lick = { id: 'x', name: 'Riff', notes: [{ midi: 60, beat: 0, dur: 1 }, { midi: 62, beat: 1, dur: 1 }], chords: [], key: 0, meter: 4 } as never;
    let ref: string;
    try {
      ref = encodePhraseRef({ ...assignmentOf(lick, defaultAssignPlan(lick)), audio: 'class-a/demo.webm' });
    } catch {
      ref = 'phrase1:' + JSON.stringify({ n: 'Riff', k: 0, m: 4, c: [], r: 'AAAA', i: 'p', p: [100, 0, 'a', 0, 0, 0], au: 'class-a/demo.webm' });
    }
    const out = withoutDemo(ref)!;
    expect(out).not.toContain('demo.webm');
    expect(itemOf(A({ kind: 'phrase', ref })).ref).not.toContain('demo.webm');
    const back = decodePhraseRef(out);
    if (decodePhraseRef(ref)) expect(back?.name).toBe(decodePhraseRef(ref)!.name);
    expect(withoutDemo('scales-1')).toBe('scales-1');
  });
  it('plans are the teacher’s own material: synced (not a device key) and kept through a fresh start', () => {
    expect(DEVICE_SETTINGS).not.toContain('teacherPlans');
    expect(KEEP_SETTINGS).toContain('teacherPlans');
  });
});

describe('§2 the coach suggestion on Today', () => {
  it('the Today card sits under the workout card, tilt only, gone once answered', () => {
    const app = readFileSync(new URL('../src/ui/App.tsx', import.meta.url), 'utf8');
    expect(app).toMatch(/focusLabel=\{focusLabelOf\(wFocus\)\}\s*\/>(\s*\{\/\*[^*]*\*\/\})+\s*\{wFocus === 'plan' && !todayEdits && !tmplRaw && s\.drills\?\.inWorkout !== false && !\(wrun && wrun\.day === today\) && <CoachTilt today_/);
    const ui = readFileSync(new URL('../src/ui/CoachTilt.tsx', import.meta.url), 'utf8');
    expect(ui).toContain('if (today_ && (answered || !tilt)) return null;');
    expect(ui).toContain('{nudge && !today_ && (');
  });
});

describe('§3 the new player window', () => {
  it('is 30 minutes for every new player, a jazz-focused one too', () => {
    expect(dailyMinutesOf(DEFAULT_SETTINGS)).toBe(30);
    expect(dailyMinutesOf({ ...DEFAULT_SETTINGS, styleFocus: { keys: { main: 'jazz' } } } as never)).toBe(30);
  });
  it('voiceRange, mixer and theme survive a fresh start (owner 2026-11-25)', () => {
    for (const k of ['voiceRange', 'mixer', 'theme'] as const) expect(KEEP_SETTINGS).toContain(k);
    expect(DEVICE_SETTINGS).not.toContain('mixer');
    expect(DEVICE_SETTINGS).not.toContain('theme');
  });
});

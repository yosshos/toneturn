// The teacher's weekly plan (SPEC-WEEK-PLAN-TILT §1; SPEC-PATH-TODAY-PRACTICE §5.2 "a weekly plan"): several
// assignments saved together in the teacher's own settings and sent to any class in one action. A plan item is an
// assignment without its class, its dates or its recorded demo: the kind and target, strictness, tempo, note, the
// options (channel, minutes a day, spread / all today) and "due after N days". Sending turns each item into the
// ordinary assignment calls — no server change. Pure, except `sendItems`, which takes the calls as arguments.

import type { AssignChannel } from './assignChannel';
import { isPhraseRef, REF_PREFIX } from './encore/assign';

export type PlanKind = 'lesson' | 'topic' | 'drill' | 'chart' | 'piece' | 'phrase' | 'focus';
export type PlanStrictness = 'lenient' | 'moderate' | 'strict';

export const PLAN_MAX_ITEMS = 12;
export const PLAN_MAX = 30;
export const PLAN_NAME_MAX = 40;
export const DUE_MAX = 14;
/** An assignment without a due date gets a week in the plan. */
export const DUE_DEFAULT = 7;

export interface PlanItem {
  kind: PlanKind;
  lessonId: string | null;
  ref: string | null;
  strictness: PlanStrictness;
  targetBpm: number | null;
  note: string | null;
  channel: AssignChannel;
  minutes: number | null;
  ifShort: 'spread' | 'today';
  /** Due this many days after the start day (0–14). */
  dueAfter: number;
}

export interface WeekPlan {
  id: string;
  name: string;
  items: PlanItem[];
  createdAt: string;
  /** Start day (YYYY-MM-DD) per class id it was sent to — the duplicate guard. */
  sent?: Record<string, string[]>;
}

/**
 * An item waiting to go out to a class. Waiting items live in a queue on THIS device (storage/weekPlanQueue.ts), not in
 * the synced plans: the device that sends is the one that knows what did not go out, and a cloud copy (last write
 * wins, pushes in any order) must never bring back an item that went out, or drop one that did not.
 */
export interface PendingItem {
  pid: string;
  start: string;
  item: PlanItem;
  /** When it was queued (an assignment made after this with the same item and due date is this item, already sent). */
  at: string;
  /** Its assignment exists (this id) but its options are not saved yet. */
  made?: string;
  /** The send it belongs to: the class's assignment ids that existed before it (storage/weekPlanQueue.ts keeps them).
   *  Only an assignment NOT among them can be this item — no clock is compared. */
  batch?: string;
}

/** planId → classId → the items waiting to go out, in the order they were queued. */
export type Queue = Record<string, Record<string, PendingItem[]>>;

/** A plan's size in the synced settings is bounded (phrase codes can be several KB each). */
export const PLAN_BYTES_MAX = 48_000;
export const PLANS_BYTES_MAX = 240_000;
const bytes = (x: unknown) => new TextEncoder().encode(JSON.stringify(x)).length;
export const planBytes = (p: WeekPlan): number => bytes(p);

/** What the plan is made from: one of the class's assignments and its options. */
export interface SourceAssignment {
  kind: PlanKind;
  lessonId: string;
  ref: string | null;
  dueOn: string | null;
  strictness: PlanStrictness;
  targetBpm: number | null;
  note: string | null;
  createdAt: string;
  opts?: { channel: AssignChannel; minutes: number | null; ifShort: 'spread' | 'today' } | null;
}

const DAY = 86400000;
const pad = (n: number) => String(n).padStart(2, '0');
/** The local day of a moment (an assignment made after local midnight belongs to that day). */
const dayOf = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const addDays = (day: string, n: number): string => new Date(Date.parse(day + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string): number => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export const cleanName = (name: string): string => name.replace(/\s+/g, ' ').trim().slice(0, PLAN_NAME_MAX);

/** A phrase's ref without the teacher's recorded demo (it belongs to one class's assignment, §1.1). */
export function withoutDemo(ref: string | null): string | null {
  if (!ref || !isPhraseRef(ref)) return ref;
  // the wrapper is plain JSON after the prefix (encore/assign.ts): drop only the demo's path, keep every other field as is
  try {
    const o = JSON.parse(ref.slice(REF_PREFIX.length)) as Record<string, unknown>;
    if (!('au' in o)) return ref;
    delete o.au;
    return REF_PREFIX + JSON.stringify(o);
  } catch {
    return ref;
  }
}

/** One assignment → a plan item: its due date becomes "due after N days" from the day it was assigned. */
export function itemOf(a: SourceAssignment): PlanItem {
  const due = a.dueOn ? clamp(daysBetween(dayOf(a.createdAt), a.dueOn), 0, DUE_MAX) : DUE_DEFAULT;
  return {
    kind: a.kind,
    lessonId: a.kind === 'lesson' ? a.lessonId : null,
    ref: withoutDemo(a.ref ?? null),
    strictness: a.strictness,
    targetBpm: a.targetBpm ?? null,
    note: a.note?.trim() ? a.note.trim() : null,
    channel: a.opts?.channel ?? 'free',
    minutes: a.opts?.minutes ?? null,
    ifShort: a.opts?.ifShort ?? 'spread',
    dueAfter: Number.isFinite(due) ? due : DUE_DEFAULT,
  };
}

/** The assignments checked by default when saving: the newest 12, in the order they were assigned. */
export function defaultPick<T extends { createdAt: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-PLAN_MAX_ITEMS);
}

/** A new plan from the checked assignments (in their order, at most 12). Null without a name or an item. */
export function planOf(name: string, from: SourceAssignment[], id: string, now: string): WeekPlan | null {
  const n = cleanName(name);
  const items = from.slice(0, PLAN_MAX_ITEMS).map(itemOf);
  if (!n || !items.length) return null;
  return { id, name: n, items, createdAt: now };
}

/** Room for another plan? (At most 30: the teacher deletes one first — a plan is never dropped silently.) */
export const canAddPlan = (list: WeekPlan[] | undefined): boolean => (list?.length ?? 0) < PLAN_MAX;

/** Why a new plan cannot be saved, or null: too many plans, the plan itself too large, or all plans together too large. */
export function saveProblem(list: WeekPlan[] | undefined, p: WeekPlan): 'count' | 'plan' | 'total' | null {
  if (!canAddPlan(list)) return 'count';
  if (planBytes(p) > PLAN_BYTES_MAX) return 'plan';
  if (bytes(list ?? []) + planBytes(p) > PLANS_BYTES_MAX) return 'total';
  return null;
}

/** Add a plan to the teacher's list (newest first). A full list is left as it is (see canAddPlan). */
export function addPlan(list: WeekPlan[] | undefined, p: WeekPlan): WeekPlan[] {
  const rest = (list ?? []).filter((x) => x.id !== p.id);
  return rest.length >= PLAN_MAX ? rest : [p, ...rest];
}

export function renamePlan(list: WeekPlan[], id: string, name: string): WeekPlan[] {
  const n = cleanName(name);
  return n ? list.map((p) => (p.id === id ? { ...p, name: n } : p)) : list;
}

/** Remove one item. The last item stays (removing the whole plan is Delete, which asks first). */
export function removeItem(list: WeekPlan[], id: string, i: number): WeekPlan[] {
  return list.map((p) => (p.id !== id || p.items.length <= 1 ? p : { ...p, items: p.items.filter((_, k) => k !== i) }));
}

export function moveItem(list: WeekPlan[], id: string, i: number, by: -1 | 1): WeekPlan[] {
  return list.map((p) => {
    if (p.id !== id) return p;
    const j = i + by;
    if (i < 0 || i >= p.items.length || j < 0 || j >= p.items.length) return p;
    const items = [...p.items];
    [items[i], items[j]] = [items[j], items[i]];
    return { ...p, items };
  });
}

export const deletePlan = (list: WeekPlan[], id: string): WeekPlan[] => list.filter((p) => p.id !== id);

/** The plan's items with their due dates from a start day (the preview and the send). */
export const scheduleOf = (p: WeekPlan, start: string): { item: PlanItem; dueOn: string }[] => p.items.map((item) => ({ item, dueOn: addDays(start, clamp(item.dueAfter, 0, DUE_MAX)) }));

/** Already sent to this class on this start day? */
export const sentOn = (p: WeekPlan, classId: string, start: string): boolean => !!p.sent?.[classId]?.includes(start);

/** The items waiting to go out to this class from this plan, in the order they were queued. */
export const pendingOf = (q: Queue, planId: string, classId: string): PendingItem[] => q[planId]?.[classId] ?? [];

const withPending = (q: Queue, planId: string, classId: string, items: PendingItem[]): Queue => {
  const byClass = { ...(q[planId] ?? {}) };
  if (items.length) byClass[classId] = items;
  else delete byClass[classId];
  const out = { ...q };
  if (Object.keys(byClass).length) out[planId] = byClass;
  else delete out[planId];
  return out;
};

/** The entries of a send (each with its own id), made before the send so every update can name them. */
export const queueOf = (items: PlanItem[], start: string, newPid: () => string, at = new Date().toISOString()): PendingItem[] => items.map((item) => ({ pid: newPid(), start, item, at }));

/**
 * A send begins: its entries are queued as waiting for this class (a whole-plan send for a start day replaces what was
 * still waiting for that same day — those items are part of it).
 */
export function beginSend(q: Queue, planId: string, classId: string, queued: PendingItem[]): Queue {
  // a resend stands in for the waiting entries of the same item and day, one for one; an entry whose assignment
  // already exists (made) stays, and so does a waiting item the resend does not contain (removed from the plan meanwhile)
  const left = [...queued];
  const kept = pendingOf(q, planId, classId).filter((x) => {
    if (x.made) return true;
    const k = left.findIndex((n) => n.start === x.start && sameItem(n.item, x.item));
    if (k < 0) return true;
    left.splice(k, 1);
    return false;
  });
  return withPending(q, planId, classId, [...kept, ...queued]);
}

/** The same assignment content (everything that goes to the server and its options). */
export const sameItem = (a: PlanItem, b: PlanItem): boolean =>
  // field by field: a copy back from the cloud (jsonb) has its keys in another order, so no JSON text is compared
  a.kind === b.kind &&
  (a.lessonId ?? null) === (b.lessonId ?? null) &&
  (a.ref ?? null) === (b.ref ?? null) &&
  a.strictness === b.strictness &&
  (a.targetBpm ?? null) === (b.targetBpm ?? null) &&
  (a.note ?? null) === (b.note ?? null) &&
  a.channel === b.channel &&
  (a.minutes ?? null) === (b.minutes ?? null) &&
  a.ifShort === b.ifShort &&
  a.dueAfter === b.dueAfter;

/** Why the server refused an item, when it says so (not a connection problem): the class is full, or it is too long. */
export type Refusal = 'full' | 'long';
export function refusalOf(err: unknown): Refusal | null {
  const m = String((err as { message?: string })?.message ?? err ?? '').toLowerCase();
  if (/too many assignments/.test(m)) return 'full';
  if (/too long|ref too|phrase too|toneturn_assign_ref/.test(m)) return 'long';
  return null;
}

/** An item went out (or the teacher let it go): it leaves the queue. */
export const itemDone = (q: Queue, planId: string, classId: string, pid: string): Queue => withPending(q, planId, classId, pendingOf(q, planId, classId).filter((x) => x.pid !== pid));

/** All waiting items of a plan, over every class (the delete question mentions them). */
export const pendingCount = (q: Queue, planId: string): number => Object.values(q[planId] ?? {}).reduce((n, x) => n + x.length, 0);

/** A deleted plan's waiting items go with it — except those whose assignment exists and only their options are
 *  missing: they stay listed (under "A deleted plan") until saved or let go. */
export const dropPlan = (q: Queue, planId: string): Queue => {
  const out = { ...q };
  const byClass = Object.fromEntries(Object.entries(q[planId] ?? {}).map(([c, xs]) => [c, xs.filter((x) => x.made)]).filter(([, xs]) => (xs as PendingItem[]).length));
  if (Object.keys(byClass).length) out[planId] = byClass as Record<string, PendingItem[]>;
  else delete out[planId];
  return out;
};

/** The duplicate guard (synced with the plan): this start day went out to this class (the last 10 days kept). */
export function markSentDay(list: WeekPlan[], id: string, classId: string, start: string): WeekPlan[] {
  return list.map((p) => (p.id === id ? { ...p, sent: { ...(p.sent ?? {}), [classId]: [...new Set([...(p.sent?.[classId] ?? []), start])].slice(-10) } } : p));
}

/** An assignment the class already has, as the server lists it. */
export interface MadeAssignment {
  id?: string;
  kind: string;
  ref: string | null;
  lessonId?: string | null;
  dueOn: string | null;
  strictness?: string;
  targetBpm?: number | null;
  note?: string | null;
  createdAt: string;
}

/** The item needs its options saved after the assignment (anything but the defaults). */
export const needsOpts = (item: PlanItem): boolean => item.channel !== 'free' || item.minutes !== null || item.ifShort !== 'spread';

/**
 * Which waiting items the class already has (a send cut off between the server's answer and the record, or another
 * tab): pid → the assignment's id. One assignment matches at most one item, and only an exact one — kind, target,
 * due date, strictness, tempo and note — made since the item was queued (a minute's grace for clocks). Entries that
 * already have their assignment (`made`) are not matched again.
 */
export function matchMade(entries: PendingItem[], made: MadeAssignment[], taken: ReadonlySet<string> = new Set(), beforeOf: (batch: string | undefined) => ReadonlySet<string> | null = () => null): Map<string, string> {
  // an assignment already accounted for (another entry's, or one this device created) never stands for a second item
  const used = new Set<number>(made.flatMap((a, i) => (a.id && taken.has(a.id) ? [i] : [])));
  const out = new Map<string, string>();
  for (const e of entries) {
    if (e.made) continue;
    const dueOn = addDays(e.start, clamp(e.item.dueAfter, 0, DUE_MAX));
    // the assignments that existed before this item's send cannot be it; without that list (an entry from before it
    // was kept) fall back to "made since it was queued", with a minute's grace
    const before = beforeOf(e.batch);
    const since = Date.parse(e.at) - 60_000;
    const k = made.findIndex(
      (a, i) =>
        !used.has(i) &&
        a.kind === e.item.kind &&
        (a.ref ?? null) === (e.item.ref ?? null) &&
        (e.item.kind !== 'lesson' || a.lessonId === e.item.lessonId) &&
        a.dueOn === dueOn &&
        (a.strictness ?? e.item.strictness) === e.item.strictness &&
        (a.targetBpm ?? null) === (e.item.targetBpm ?? null) &&
        (a.note ?? null) === (e.item.note ?? null) &&
        (before ? !!a.id && !before.has(a.id) : Date.parse(a.createdAt) >= since),
    );
    if (k >= 0) {
      used.add(k);
      out.set(e.pid, made[k].id ?? '');
    }
  }
  return out;
}

/** An entry's assignment exists but its options are not saved yet (it stays queued until they are). */
export const withMade = (q: Queue, planId: string, classId: string, pid: string, id: string): Queue =>
  withPending(q, planId, classId, pendingOf(q, planId, classId).map((x) => (x.pid === pid ? { ...x, made: id } : x)));

export interface SendCalls {
  assign: (p: { classId: string; kind: PlanKind; lessonId: string | null; ref: string | null; dueOn: string; strictness: PlanStrictness; targetBpm: number | null; note: string | null }) => Promise<string | null | undefined>;
  setOpts: (assignmentId: string, o: { channel: AssignChannel; minutes: number | null; ifShort: 'spread' | 'today' }) => Promise<void>;
}

/** The result of a send: the entries whose assignment now exists, the ones that failed to be created (still waiting),
 *  and the ones created whose options were not saved (still waiting, marked `made`). */
export interface SendResult {
  sent: PendingItem[];
  failed: PendingItem[];
  optsFailed: PendingItem[];
  /** Items the server refused for a stated reason (they fail on every retry until the teacher acts). */
  refused: { e: PendingItem; why: Refusal }[];
}

export interface SendHooks {
  /** The assignment exists (record it at once: a reload a second later never creates it again). */
  created: (e: PendingItem, id: string) => void;
  /** Still to be sent? (Another window may have sent or discarded it meanwhile: then it is skipped.) */
  keep?: (e: PendingItem) => boolean;
  /** The entry is complete: assignment and options. */
  done: (e: PendingItem) => void;
}

/**
 * Send queued entries to a class, in order, each from its own start day. An entry that already has its assignment
 * (`made`: created earlier, options not saved) only gets its options. An entry leaves the queue (`done`) only when its
 * options are saved too, so a failure or a reload between the two leaves it listed as "options not saved".
 */
export async function sendItems(entries: PendingItem[], classId: string, calls: SendCalls, hooks: SendHooks = { created: () => {}, done: () => {} }): Promise<SendResult> {
  const out: SendResult = { sent: [], failed: [], optsFailed: [], refused: [] };
  for (const e of entries) {
    const { item, start } = e;
    let id = e.made ?? null;
    if (hooks.keep && !hooks.keep(e)) continue;
    if (!e.made) {
      const dueOn = addDays(start, clamp(item.dueAfter, 0, DUE_MAX));
      try {
        id = (await calls.assign({ classId, kind: item.kind, lessonId: item.lessonId, ref: item.ref, dueOn, strictness: item.strictness, targetBpm: item.targetBpm, note: item.note })) ?? '';
      } catch (err) {
        out.failed.push(e);
        const why = refusalOf(err);
        if (why) out.refused.push({ e, why });
        continue;
      }
      out.sent.push(e);
      hooks.created(e, id);
    }
    if (id && needsOpts(item)) {
      try {
        await calls.setOpts(id, { channel: item.channel, minutes: item.minutes, ifShort: item.ifShort });
      } catch {
        out.optsFailed.push({ ...e, made: id });
        continue;
      }
    }
    hooks.done(e);
  }
  return out;
}

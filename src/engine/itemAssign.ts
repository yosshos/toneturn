// An item and its assignment (docs/SPEC-PATH-TODAY-PRACTICE.md §5.1–§5.2): the teacher assigns from the item's own page
// and the student sees the assignment there and in the places. One mapping between the four kinds of item page and the
// teacher loop's assignment rows, on today's server (no new kind: a lick travels as a 'piece' row whose ref is
// "lick:<id>", as phrases and focus suggestions did; a piece as a 'piece' row with its piece key). Pure.

import { chartKind, parseChartKind, RHYTHMS, VOICINGS } from './drills/chartDrills';

/** The four item pages (§2): a technique level (its rung in a key), a lick, a piece, an improvisation level. */
export type ItemRef = { k: 'level'; id: string } | { k: 'lick'; id: string } | { k: 'piece'; key: string } | { k: 'improv'; n: number };

/** The assignment row's kind and ref for an item. */
export function assignRefOf(r: ItemRef): { kind: 'drill' | 'piece' | 'chart'; ref: string } {
  switch (r.k) {
    case 'level':
      return { kind: 'drill', ref: `drill:${r.id}` };
    case 'lick':
      return { kind: 'piece', ref: `lick:${r.id}` };
    case 'piece':
      return { kind: 'piece', ref: r.key };
    case 'improv':
      return { kind: 'chart', ref: chartKind(`lv:${r.n}`, VOICINGS[0], RHYTHMS[0], 'improv') };
  }
}

/**
 * A technique level's assignment ref: "drill:<level id>", optionally with the teacher's key ("@<pitch class>", the rung
 * in that key) and a timed session ("/<minutes>": the coach on that rung in that key for so many minutes).
 */
export interface DrillRef {
  id: string;
  key: number | null;
  minutes: number | null;
  /** "!" after the minutes: exactly this exercise for the whole session (no forms of it after the target). */
  exact: boolean;
}
export function parseDrillRef(ref: string | null | undefined): DrillRef {
  const m = /^(?:drill:)?([^@/!]*)(?:@(\d{1,2}))?(?:\/(\d{1,3}))?(!)?$/.exec(ref ?? '');
  if (!m) return { id: (ref ?? '').replace(/^drill:/, ''), key: null, minutes: null, exact: false };
  const k = m[2] !== undefined ? Number(m[2]) : null;
  const min = m[3] !== undefined ? Number(m[3]) : null;
  return { id: m[1], key: k !== null && k >= 0 && k < 12 ? k : null, minutes: min !== null && min >= 1 && min <= 120 ? min : null, exact: !!m[4] };
}
export function drillRef(id: string, key: number | null = null, minutes: number | null = null, exact = false): string {
  return `drill:${id}${key !== null ? `@${((key % 12) + 12) % 12}` : ''}${minutes ? `/${Math.max(1, Math.min(120, Math.round(minutes)))}${exact ? '!' : ''}` : ''}`;
}

/**
 * Owner 2026-11-27 ("ten minutes of the same scale is boring"): a timed scale assignment, once its scale passes the
 * target, goes on with forms of the same scale in the same key — contrary motion, rhythm variations, a third / sixth /
 * tenth apart — only forms at most two tiers above the assigned one. Unless the teacher asked for exactly it ("!").
 */
export const SCALE_FORMS = ['scales-4', 'scales-11', 'scales-8'] as const;
export function scaleFormsFor(id: string, tierOf: (rung: string) => number | null): string[] {
  if (!/^scales-\d+$/.test(id)) return [];
  const t0 = tierOf(id);
  if (t0 === null) return [];
  return SCALE_FORMS.filter((r) => r !== id).filter((r) => {
    const t = tierOf(r);
    return t !== null && t <= t0 + 2;
  });
}

/** The item an assignment row names (null for lessons, topics, phrases, free-text pieces …). */
export function itemOfAssign(a: { kind: string; ref: string | null }): ItemRef | null {
  const ref = a.ref ?? '';
  if (a.kind === 'drill' && ref) return { k: 'level', id: parseDrillRef(ref).id };
  if (a.kind === 'piece' && /^lick:./.test(ref)) return { k: 'lick', id: ref.slice(5) };
  if (a.kind === 'piece' && /^(rep:(ear|jazz|voice|keys|guitar|bass|drums)|std|chart|tpl|score|rec):./.test(ref)) return { k: 'piece', key: ref };
  if (a.kind === 'chart') {
    const c = parseChartKind(ref);
    const m = c && c.mode === 'improv' ? /^lv:(\d+)$/.exec(c.ref) : null;
    if (m) return { k: 'improv', n: Number(m[1]) };
  }
  return null;
}

export const sameItem = (a: ItemRef, b: ItemRef): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The newest open assignment (not past its due date by more than a week) for an item, or null. `key`: the rung's key
 *  on a key page — an assignment for another key of the level is not this page's. */
export function assignmentFor<A extends { kind: string; ref: string | null; dueOn: string | null; createdAt: string }>(as: A[] | null | undefined, r: ItemRef, today: string, key?: number): A | null {
  const open = (as ?? []).filter((a) => {
    const it = itemOfAssign(a);
    if (!it || !sameItem(it, r)) return false;
    if (key !== undefined && a.kind === 'drill') {
      const k = parseDrillRef(a.ref).key;
      if (k !== null && k !== key) return false;
    }
    if (!a.dueOn) return true;
    return Date.parse(`${today}T12:00:00Z`) - Date.parse(`${a.dueOn}T12:00:00Z`) <= 7 * 86400000;
  });
  return open.sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0] ?? null;
}

/** The assignment's channel requirement met by a take's channel (§5.2: notation shown never meets "by ear"). */
export function channelMet(required: 'free' | 'page' | 'ear' | 'memory' | undefined, take: 'page-sight' | 'page-known' | 'ear-fresh' | 'ear-known' | 'unaided'): boolean {
  if (!required || required === 'free') return true;
  if (required === 'ear') return take === 'ear-fresh' || take === 'ear-known';
  if (required === 'memory') return take === 'unaided';
  return take === 'page-sight' || take === 'page-known';
}

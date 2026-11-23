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

/** The item an assignment row names (null for lessons, topics, phrases, free-text pieces …). */
export function itemOfAssign(a: { kind: string; ref: string | null }): ItemRef | null {
  const ref = a.ref ?? '';
  if (a.kind === 'drill' && ref) return { k: 'level', id: ref.replace(/^drill:/, '') };
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

/** The newest open assignment (not past its due date by more than a week) for an item, or null. */
export function assignmentFor<A extends { kind: string; ref: string | null; dueOn: string | null; createdAt: string }>(as: A[] | null | undefined, r: ItemRef, today: string): A | null {
  const open = (as ?? []).filter((a) => {
    const it = itemOfAssign(a);
    if (!it || !sameItem(it, r)) return false;
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

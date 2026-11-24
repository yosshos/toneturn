// The measured signals behind the coach's need-based moves (docs/SPEC-PRACTICE-SESSION.md §3.2). Pure: the caller
// passes the practice-time ledger, the drill items and the improvisation bests; workout2 turns them into shares.
//
// - Neglect: the area's active minutes in the last 7 days (this course) against its planned share.
// - Gap: how close each area is to its target — technique by tempo against target, improvisation by the level's score.
// - Slipping: a closed item that failed twice this week goes into the warm-up.

import type { CourseId } from './courses';
import type { ItemState } from './drills/types';
import { itemPass } from './drills/ladder';
import { addDay, summarize, type PracticeLedger } from './practiceTime';
import type { NeedSignals } from './workout2';

const MIN = 60_000;
/** Days the closeness reads back (an item not played in a month says little about today). */
const CLOSE_DAYS = 30;
/** Misses this week that make a closed item "slipping". */
export const SLIP_MISSES = 2;

/** §3.2 Neglect: active minutes in the last 7 days (today included) per area of the course's split. */
export function weekAreaMinutes(l: PracticeLedger, today: string, course: CourseId, instrument: boolean): NonNullable<NeedSignals['week']> {
  const s = summarize(l, addDay(today, -6), today, course);
  if (!instrument) return { review: s.byQuality.review / MIN, work: Math.max(0, s.inApp - s.byQuality.review) / MIN };
  const k = s.byKind;
  // the improvisation share: improvising, repertoire (the pieces coach) — on the drums grooves, fills and trading run as games
  const imp = (k.improv ?? 0) + (k.piece ?? 0) + (course === 'drums' ? (k.game ?? 0) : 0);
  return { tech: (k.technique ?? 0) / MIN, improv: imp / MIN };
}

/** An item closed by the one rule (3 clean takes at its target on 2 days). */
const closedItem = (st: ItemState): boolean => !!st.targetBpm && itemPass(st, 0, st.targetBpm).target;

/**
 * §3.2 Gap for an instrument: technique = the mean share of target tempo of the items played in the last 30 days that
 * are not closed yet (closed: 1); improvisation = the score of the first improvisation level not closed (≥ 90 %).
 * Undefined where nothing was measured.
 */
export function closeness(items: Record<string, ItemState>, today: string, improv?: { levels: readonly { id: string }[]; best?: Record<string, number> }): NonNullable<NeedSignals['close']> {
  const from = addDay(today, -CLOSE_DAYS);
  const xs = Object.values(items).filter((st) => st.takes > 0 && !!st.targetBpm && (st.last ?? '').slice(0, 10) >= from);
  const out: NonNullable<NeedSignals['close']> = {};
  if (xs.length) out.tech = xs.reduce((a, st) => a + (closedItem(st) ? 1 : Math.min(1, (st.cleanBpm ?? 0) / st.targetBpm!)), 0) / xs.length;
  const played = improv?.levels.filter((lv) => improv.best?.[lv.id] !== undefined) ?? [];
  if (played.length) {
    const cur = improv!.levels.find((lv) => (improv!.best?.[lv.id] ?? -1) < 0.9);
    out.improv = cur ? Math.max(0, improv!.best?.[cur.id] ?? 0) : 1;
  }
  return out;
}

/**
 * §3.2 Slipping: closed items with at least two missed takes in the last 7 days (the quality ledger: takes − clean),
 * the most missed first, then the most recent.
 */
export function slippingItems(items: Record<string, ItemState>, l: PracticeLedger, today: string): string[] {
  const from = addDay(today, -6);
  const out: { id: string; miss: number; last: string }[] = [];
  for (const st of Object.values(items)) {
    if (!st.takes || !closedItem(st)) continue;
    const days = (l.items[`d:${st.itemId}`] ?? []).filter((d) => d.d >= from && d.d <= today);
    const miss = days.reduce((a, d) => a + Math.max(0, (d.of || d.n) - d.c), 0);
    if (miss >= SLIP_MISSES) out.push({ id: st.itemId, miss, last: st.last ?? '' });
  }
  return out.sort((a, b) => b.miss - a.miss || b.last.localeCompare(a.last) || a.id.localeCompare(b.id)).map((x) => x.id);
}

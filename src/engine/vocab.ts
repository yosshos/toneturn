// The player's vocabulary in improvisation (docs/SPEC-LICKS-IN-IMPROV.md, BUILD-PLAN-2026-11 §0.2; owner 2026-11-22):
// - the pool: every lick played at all (any take) — library licks and the player's own; it enters Improvise's lick
//   cards and "today's lick" at once (and Technique's language block);
// - the usage log: each clean use found in an improvisation (the lick, its key, exact / varied / shape, via a tritone
//   sub), kept in the lick book (bounded);
// - "in my language": used in improvisation in at least 3 different sessions and at least 2 keys;
// - a clean use counts as a successful spaced review once the lick is closed in one key (before that it is practice);
// - XP per use: full, then half, then nothing for the same lick again in one chorus; more for a new key or a variation.
// Pure.

import type { ItemState } from './drills/types';
import { LICKS, type Lick, type LickBook } from './licks';
import { findLick, qualityOfIntervals, type ImpNote, type LickHit } from './lickDetect';
import { itemStatus } from './drills/itemStatus';

export interface LickUse {
  id: string;
  key: number;
  kind: LickHit['kind'];
  viaSub?: boolean;
  at: string;
  session: string;
}

/** The lick items of one lick: "lick:<id>:<key>…" (licks.ts lickDrill item ids start so). */
const itemsOfLick = (items: Record<string, ItemState>, id: string): ItemState[] => Object.values(items).filter((s) => s.itemId?.startsWith(`lick:${id}:`));

/** Every lick played at all (any take): library licks and the player's own (owner 2026-11-22: "even a little"). */
export function lickPool(items: Record<string, ItemState>, book: LickBook | undefined): Lick[] {
  const own = book?.own ?? [];
  return [...LICKS, ...own].filter((l) => itemsOfLick(items, l.id).some((s) => s.takes > 0) || (book?.mine ?? []).includes(l.id));
}

/** Keys in which a lick is closed (the one status rule). */
export function closedKeys(items: Record<string, ItemState>, id: string): number[] {
  return [...new Set(itemsOfLick(items, id).filter((s) => s.targetBpm && itemStatus(s, 0, s.targetBpm) === 'closed').map((s) => ((s.key % 12) + 12) % 12))];
}

/** "In my language": used in improvisation in ≥ 3 different sessions and ≥ 2 keys. */
export function inMyLanguage(uses: LickUse[] | undefined, id: string): boolean {
  const u = (uses ?? []).filter((x) => x.id === id);
  return new Set(u.map((x) => x.session)).size >= 3 && new Set(u.map((x) => x.key)).size >= 2;
}

export const USES_CAP = 400;

/** The uses found in one improvisation: each lick of the pool over its chord, clean in time; one per occurrence. */
export function findUses(pool: Lick[], notes: ImpNote[], chart: { root: number; iv: number[]; at: number; beats: number }[], session: string, at: string): LickUse[] {
  const spans = chart.map((s) => ({ root: s.root, q: qualityOfIntervals(s.iv), at: s.at, beats: s.beats }));
  const out: LickUse[] = [];
  for (const l of pool)
    for (const h of findLick(l, notes, spans, { shape: true, varied: true }))
      if (h.overChord && h.tight !== false) out.push({ id: l.id, key: h.transpose, kind: h.kind, ...(h.viaSub ? { viaSub: true } : {}), at, session });
  return out;
}

/** XP for one take's uses: full (6), then half, then 0 for the same lick in the take; +3 a new key, +2 a variation. */
export function usesXp(uses: LickUse[], before: LickUse[] | undefined): number {
  const seen: Record<string, number> = {};
  const oldKeys = new Map<string, Set<number>>();
  for (const u of before ?? []) (oldKeys.get(u.id) ?? oldKeys.set(u.id, new Set()).get(u.id)!).add(u.key);
  let xp = 0;
  for (const u of uses) {
    const n = (seen[u.id] = (seen[u.id] ?? 0) + 1);
    const base = n === 1 ? 6 : n === 2 ? 3 : 0;
    if (!base) continue;
    xp += base + (oldKeys.get(u.id)?.has(u.key) ? 0 : 3) + (u.kind === 'varied' ? 2 : 0);
  }
  return xp;
}

/** Book the uses: append to the log (bounded); licks closed in a key get a passed review. */
export function bookUses(book: LickBook | undefined, uses: LickUse[], items: Record<string, ItemState>, review: (b: LickBook, id: string) => LickBook): LickBook {
  let b: LickBook = { ...(book ?? {}) };
  const log = [...(b.uses ?? []), ...uses];
  b.uses = log.slice(Math.max(0, log.length - USES_CAP));
  for (const id of new Set(uses.map((u) => u.id))) if (closedKeys(items, id).length) b = review(b, id);
  return b;
}

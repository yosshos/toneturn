// The take's channel (docs/SPEC-EAR-AND-READING.md §1, BUILD-PLAN-2026-11 §0.2). Kept apart from itemStatus.ts so
// ladder.ts can tally channels without an import cycle. Pure.

import type { Drill, ItemState } from './types';

// ───────────────────────────── channels ─────────────────────────────

export type Channel = 'page-sight' | 'page-known' | 'ear-fresh' | 'ear-known' | 'unaided';
export const CHANNELS: Channel[] = ['page-sight', 'page-known', 'ear-fresh', 'ear-known', 'unaided'];

/** Families whose takes are heard, not read (hear it and play it). */
const EAR_FAMILIES = new Set(['k-ear', 'k-phrase', 'g-ear', 'g-phrase', 'b-ear', 'b-phrase']);
/** Families of fresh reading material (sight-reading). */
const READ_FAMILIES = new Set(['k-read', 'g-reading', 'b-read', 'b-posread', 'b-up-read', 'd-read']);

/**
 * The channel of a take when the caller does not say: an ear family is ear (fresh on the item's first take), a reading
 * family is read at sight on its first take; everything else is played with its notation on screen after a demo, so
 * it is "page, known" — never sight (BUILD-PLAN §0.2: a coached take after a demo is not sight reading).
 */
export function defaultChannel(drill: Pick<Drill, 'spec'>, st: ItemState | undefined): Channel {
  const first = !st || !st.takes;
  const fam = drill.spec.family as string;
  if (EAR_FAMILIES.has(fam)) return first ? 'ear-fresh' : 'ear-known';
  if (READ_FAMILIES.has(fam)) return first ? 'page-sight' : 'page-known';
  return 'page-known';
}

/** Per-channel tally kept on the item (bounded: counts and the best clean tempo). */
export type ChannelTally = Partial<Record<Channel, { n: number; clean: number; best: number }>>;

export function tallyChannel(t: ChannelTally | undefined, ch: Channel, clean: boolean, bpm: number): ChannelTally {
  const out: ChannelTally = { ...(t ?? {}) };
  const cur = out[ch] ?? { n: 0, clean: 0, best: 0 };
  out[ch] = { n: cur.n + 1, clean: cur.clean + (clean ? 1 : 0), best: clean ? Math.max(cur.best, Math.round(bpm)) : cur.best };
  return out;
}

/**
 * The player's two channel numbers (SPEC-EAR-AND-READING §2.1), 0..1 or null without enough measured takes: by ear
 * from fresh ear takes, reading from sight takes — the clean share, shrunk toward the self-rating (1–5) while there
 * are few takes. Known-material takes never count.
 */
export function channelProfile(items: Record<string, ItemState>, self: { ear?: number; reading?: number } = {}): { ear: number | null; reading: number | null } {
  let en = 0, ec = 0, rn = 0, rc = 0;
  for (const st of Object.values(items)) {
    const t = st.channels;
    if (!t) continue;
    if (t['ear-fresh']) (en += t['ear-fresh'].n), (ec += t['ear-fresh'].clean);
    if (t['page-sight']) (rn += t['page-sight'].n), (rc += t['page-sight'].clean);
  }
  const PRIOR = 6;
  const blend = (n: number, c: number, s?: number): number | null => {
    const prior = s ? (Math.max(1, Math.min(5, s)) - 1) / 4 : null;
    if (prior === null && n < 3) return null;
    if (prior === null) return c / n;
    return (c + prior * PRIOR) / (n + PRIOR);
  };
  return { ear: blend(en, ec, self.ear), reading: blend(rn, rc, self.reading) };
}

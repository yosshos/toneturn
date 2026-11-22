// Daily progress snapshots (docs/SPEC-PROGRESS-CHARTS.md §1, BUILD-PLAN-2026-11 phase 1b): one small summary per day,
// so the over-time charts have history for the new measures (the status ladder, the channels, the keys). Computed
// from the drill items and the practice ledger; the past is back-filled from what the items remember (the dates a
// pass was logged, the best clean tempo per day) and the ledger's minutes. Pure.

import type { ItemState } from './drills/types';
import { itemStatus, type ItemStatus } from './drills/itemStatus';
import { channelProfile } from './drills/channel';
import { PASS_DAYS, PASS_SHARE, PASS_TAKES } from './drills/ladder';
import { sectionOfFamily } from './courseSections';
import type { CourseId } from './courses';

export interface Snapshot {
  day: string;
  /** Item counts per status, per area ("keys:technique", "guitar:harmony", "lick"). */
  status: Record<string, Partial<Record<ItemStatus, number>>>;
  /** Median share of target among the played, not-closed items, per area (0..1+). */
  tempo: Record<string, number>;
  /** Active minutes that day per ledger bucket. */
  minutes: Record<string, number>;
  /** The channel profile (null without enough measured takes). */
  channels: { ear: number | null; reading: number | null };
  /** Per key (0–11): items closed ÷ items played. */
  keys: Record<number, number>;
  /** Licks: played / closed. */
  vocab: { played: number; closed: number };
  /** A practice day (any minutes). */
  practised: boolean;
}

/** The course a drill family belongs to (by its prefix). */
export function courseOfFamily(f: string): CourseId {
  if (f.startsWith('g-')) return 'guitar';
  if (f.startsWith('b-')) return 'bass';
  if (f.startsWith('d-')) return 'drums';
  return 'keys';
}

/** The area an item counts in: the course section of its family, or "lick" for the lick book. */
export function areaOf(st: Pick<ItemState, 'family' | 'itemId'>): string {
  const f = String(st.family ?? '');
  if (st.itemId?.startsWith('lick:') || f === 'licks' || f === 'lick') return 'lick';
  const c = courseOfFamily(f);
  return `${c}:${sectionOfFamily(c, f)?.id ?? 'other'}`;
}

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Today's snapshot from the current items (statuses by the one rule) and the ledger's minutes for that day. */
export function daySnapshot(day: string, items: Record<string, ItemState>, minutesOfDay: Record<string, number> = {}): Snapshot {
  const status: Snapshot['status'] = {};
  const shares: Record<string, number[]> = {};
  const keyN: Record<number, { n: number; c: number }> = {};
  let lp = 0, lc = 0;
  for (const st of Object.values(items)) {
    if (!st || !st.takes) continue;
    const a = areaOf(st);
    const target = st.targetBpm ?? 0;
    const s = target > 0 ? itemStatus(st, 0, target) : st.cleanBpm > 0 ? 'learning' : 'new';
    (status[a] ??= {})[s] = (status[a][s] ?? 0) + 1;
    if (target > 0 && s !== 'closed') (shares[a] ??= []).push(Math.min(1.5, (st.cleanBpm ?? 0) / target));
    if (typeof st.key === 'number' && a !== 'lick') {
      const k = ((st.key % 12) + 12) % 12;
      keyN[k] ??= { n: 0, c: 0 };
      keyN[k].n++;
      if (s === 'closed') keyN[k].c++;
    }
    if (a === 'lick') {
      lp++;
      if (s === 'closed') lc++;
    }
  }
  const minutes: Record<string, number> = {};
  let total = 0;
  for (const [b, ms] of Object.entries(minutesOfDay)) {
    const m = Math.round((ms / 60000) * 10) / 10;
    if (m > 0) (minutes[b] = m), (total += m);
  }
  return {
    day,
    status,
    tempo: Object.fromEntries(Object.entries(shares).map(([a, xs]) => [a, Math.round(median(xs) * 1000) / 1000])),
    minutes,
    channels: channelProfile(items),
    keys: Object.fromEntries(Object.entries(keyN).map(([k, v]) => [k, Math.round((v.c / v.n) * 1000) / 1000])),
    vocab: { played: lp, closed: lc },
    practised: total > 0,
  };
}

/** The day an item closed (the qualifying take that made 3 at ≥ 95 % of target on 2 days), or null. */
export function closedOn(st: ItemState): string | null {
  const target = st.targetBpm ?? 0;
  if (!target) return null;
  const log = (st.passLog ?? (st.history ?? []).map((h) => ({ at: h.at, bpm: h.bpm }))).filter((x) => x.bpm >= PASS_SHARE * target - 1e-9).sort((a, b) => a.at.localeCompare(b.at));
  const days = new Set<string>();
  for (let i = 0; i < log.length; i++) {
    days.add(log[i].at.slice(0, 10));
    if (i + 1 >= PASS_TAKES && days.size >= PASS_DAYS) return log[i].at.slice(0, 10);
  }
  return null;
}

/**
 * Back-fill the snapshots of past days from the items' memory (best clean tempo per day, the pass log) and the ledger's
 * minutes: statuses as they stood at each day's end (an item counts from its first day; closed from the day it closed),
 * the tempo index from the best tempo reached by then. Channels and keys start with the live snapshots.
 */
export function backfillSnapshots(items: Record<string, ItemState>, ledgerDays: Record<string, Record<string, number>>, until: string, existing: Record<string, Snapshot> = {}): Record<string, Snapshot> {
  const per = Object.values(items)
    .filter((st) => st && st.takes > 0)
    .map((st) => {
      const hist = [...(st.history ?? [])].sort((a, b) => a.at.localeCompare(b.at));
      const first = [hist[0]?.at, st.passLog?.[0]?.at, st.last].filter(Boolean).sort()[0]?.slice(0, 10) ?? null;
      return { st, area: areaOf(st), first, closed: closedOn(st), hist };
    })
    .filter((x) => x.first);
  const daysSet = new Set<string>(Object.keys(ledgerDays));
  for (const x of per) for (const h of x.hist) daysSet.add(h.at.slice(0, 10));
  const days = [...daysSet].filter((d) => d < until && !existing[d]).sort();
  const out: Record<string, Snapshot> = {};
  for (const day of days) {
    const status: Snapshot['status'] = {};
    const shares: Record<string, number[]> = {};
    let lp = 0, lc = 0;
    for (const x of per) {
      if (x.first! > day) continue;
      const target = x.st.targetBpm ?? 0;
      const best = Math.max(0, ...x.hist.filter((h) => h.at.slice(0, 10) <= day).map((h) => h.bpm));
      const s: ItemStatus = x.closed && x.closed <= day ? 'closed' : target > 0 && best >= PASS_SHARE * target - 1e-9 ? 'almost' : 'learning';
      (status[x.area] ??= {})[s] = (status[x.area][s] ?? 0) + 1;
      if (target > 0 && s !== 'closed') (shares[x.area] ??= []).push(Math.min(1.5, best / target));
      if (x.area === 'lick') (lp++, s === 'closed' && lc++);
    }
    const minutes: Record<string, number> = {};
    let total = 0;
    for (const [b, ms] of Object.entries(ledgerDays[day] ?? {})) {
      const m = Math.round((ms / 60000) * 10) / 10;
      if (m > 0) (minutes[b] = m), (total += m);
    }
    out[day] = {
      day,
      status,
      tempo: Object.fromEntries(Object.entries(shares).map(([a, xs]) => [a, Math.round(median(xs) * 1000) / 1000])),
      minutes,
      channels: { ear: null, reading: null },
      keys: {},
      vocab: { played: lp, closed: lc },
      practised: total > 0,
    };
  }
  return out;
}

/** Keep a year daily, then one snapshot per week (the latest of each ISO week) before that. */
export function pruneSnapshots(all: Record<string, Snapshot>, today: string, keepDays = 400): Record<string, Snapshot> {
  const cut = new Date(new Date(today + 'T00:00:00Z').getTime() - keepDays * 86400000).toISOString().slice(0, 10);
  const out: Record<string, Snapshot> = {};
  const weekly = new Map<string, Snapshot>();
  for (const s of Object.values(all)) {
    if (s.day >= cut) out[s.day] = s;
    else {
      const d = new Date(s.day + 'T00:00:00Z');
      const wk = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
      const cur = weekly.get(wk);
      if (!cur || s.day > cur.day) weekly.set(wk, s);
    }
  }
  for (const s of weekly.values()) out[s.day] = s;
  return out;
}

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
import { parseBucket } from './practiceTime';

export interface Snapshot {
  day: string;
  /** Item counts per status, per area ("keys:technique", "guitar:harmony", "lick"). */
  status: Record<string, Partial<Record<ItemStatus, number>>>;
  /** Median share of target among the played, not-closed items, per area (0..1+). */
  tempo: Record<string, number>;
  /** Active minutes that day per kind of practice (minuteArea: technique, improv, repertoire, ear, games, other). */
  minutes: Record<string, number>;
  /** The channel profile (null without enough measured takes). */
  channels: { ear: number | null; reading: number | null };
  /** Per key (0–11): items closed ÷ items played. */
  keys: Record<number, number>;
  /** Licks: played / closed; §1 also learned (closed in a key) / in practice / in my language, and Encore phrases. */
  vocab: { played: number; closed: number; learned?: number; practice?: number; language?: number; encore?: number };
  /** A practice day (any minutes). */
  practised: boolean;
  /** SPEC-PROGRESS-CHARTS §4.1 (phase 8): items stuck at the limit (the coach's ceiling held over the last 3 sessions) —
   *  the teacher's alert "stuck at the limit for 3 sessions", with the tempo line and the ceiling. At most 3. */
  stuck?: StuckItem[];
  /** §1, the full ladder above "closed" (BUILD-PLAN D4): of the closed items per area, how many stand at each upper step
   *  (each item at its highest: all 12 keys → in my language → in the fingers). `status.closed` stays the total closed. */
  ladder?: Record<string, Partial<Record<UpperStep, number>>>;
  /** The Ear course's areas (ear:pitch, ear:harmony …): the level per area, 0..1 (the ratings, as its radar). */
  level?: Record<string, number>;
  /** Takes by channel, cumulative (ear = by ear, page = from the page, memory = unaided): the week's mix is a difference. */
  chTakes?: ChannelMix;
  /** §1 "minutes per channel": the day's technique minutes split by the day's takes per channel. */
  chMinutes?: ChannelMix;
  /** §1 / chart 6: the week's actual mix (shares of the last 7 days' takes) and the target mix (presentation.targetMix). */
  mix?: ChannelMix | null;
  mixTarget?: ChannelMix;
  /** §1 / chart 9: improvisation — colour coverage (the mode × function stats), the in-scale rate of the day's takes, and
   *  the mode × function map summarised ("fn|mode" → coverage, the most played). */
  improv?: { cov: number | null; inScale: number | null; map: Record<string, number> };
}

/** The ladder's steps above "closed" (BUILD-PLAN D4), lowest first. */
export type UpperStep = 'keys12' | 'language' | 'fingers';
export const UPPER_STEPS: UpperStep[] = ['keys12', 'language', 'fingers'];
export const UPPER_WORD: Record<UpperStep, { en: string; he: string }> = {
  keys12: { en: 'All 12 keys', he: 'בכל 12 הסולמות' },
  language: { en: 'In my language', he: 'בשפה שלי' },
  fingers: { en: 'In the fingers', he: 'באצבעות' },
};
export interface ChannelMix {
  ear: number;
  page: number;
  memory: number;
}

/**
 * The Ear course's areas (its radar, Stats.courseAxes): which skills count in each. A path step of the Ear course counts
 * in the area of its skill; the level of an area is the ratings' value over its skills.
 */
export const EAR_AREAS: { id: string; skills: string[]; name: { en: string; he: string } }[] = [
  { id: 'ear:pitch', skills: ['degrees', 'intervals', 'pitch', 'absolute'], name: { en: 'Ear', he: 'שמיעה' } },
  { id: 'ear:harmony', skills: ['chords', 'cadences', 'modes'], name: { en: 'Harmony', he: 'הרמוניה' } },
  { id: 'ear:rhythm', skills: ['rhythm-dictation', 'rhythm-reading', 'timing', 'tempo', 'meter'], name: { en: 'Rhythm', he: 'קצב' } },
  { id: 'ear:memory', skills: ['sequences', 'rhythm', 'form'], name: { en: 'Memory', he: 'זיכרון' } },
  { id: 'ear:reading', skills: ['notes', 'theory', 'sight', 'dictation'], name: { en: 'Reading', he: 'קריאה' } },
  { id: 'ear:expression', skills: ['transpose', 'expression'], name: { en: 'Expression', he: 'ביטוי' } },
  { id: 'ear:improv', skills: ['improv'], name: { en: 'Improvisation', he: 'אלתור' } },
];
/** The Ear area of a skill (null: the skill is not the Ear course's — voice, instrument). */
export const earAreaOfSkill = (skill: string): string | null => EAR_AREAS.find((a) => a.skills.includes(skill))?.id ?? null;
/** An Ear path step's status from its best stars (3 = closed, 2 = almost, else learning). */
export const earStepStatus = (stars: number): ItemStatus => (stars >= 3 ? 'closed' : stars >= 2 ? 'almost' : 'learning');

/** Ear steps for the snapshot: the course's finished steps (path facts) with their skill (resolved by the caller). */
export interface EarStep {
  skill: string;
  stars: number;
  /** First and last time played (ISO). */
  firstAt?: string;
  at: string;
}
/** The Ear course's status per area from its finished steps (as they stood at the end of `day`, when given). */
export function earStatus(steps: EarStep[], day?: string): Snapshot['status'] {
  const out: Snapshot['status'] = {};
  for (const s of steps) {
    const a = earAreaOfSkill(s.skill);
    if (!a) continue;
    const first = (s.firstAt ?? s.at).slice(0, 10);
    if (day && first > day) continue;
    // back-filled days: closed only from the step's last play (conservative), learning before
    const st = day && s.at.slice(0, 10) > day ? 'learning' : earStepStatus(s.stars);
    (out[a] ??= {})[st] = (out[a][st] ?? 0) + 1;
  }
  return out;
}

/** What the day's snapshot reads beyond the items and the minutes (each optional: absent = that part is left out). */
export interface SnapExtra {
  /** The lick book: in my language, Encore phrases. */
  book?: { own?: unknown[]; uses?: { id: string; key: number; session: string }[] };
  /** The mode × function stats (Settings.rotationStats). */
  modeStats?: Record<string, { n: number; cov: number; last: string }>;
  /** The day's improvisation takes (storage/snapshots noteImprovTake): their count and summed in-scale share. */
  improvDay?: { n: number; inSet: number };
  /** The Ear course: its finished steps and its levels per area. */
  ear?: { steps: EarStep[]; level?: Record<string, number> };
  /** The latest snapshot before this day and the one about a week before it (the channel deltas). */
  prior?: Snapshot;
  weekAgo?: Snapshot;
  /** The target mix of channels (presentation.targetMix), as ear / page / memory shares. */
  mixTarget?: ChannelMix;
}

export interface StuckItem {
  id: string;
  area: string;
  ceiling: number;
  target: number;
  /** The best clean tempo per session day, oldest first (at most 10). */
  pts: { day: string; bpm: number }[];
}

/** Sessions at the ceiling before an item counts as stuck (SPEC-PROGRESS-CHARTS §4.1). */
export const STUCK_SESSIONS = 3;

/**
 * Items stuck at the limit: the coach's ceiling is set (BUILD-PLAN §0.2), the item is not closed, and its best clean
 * tempo on each of its last 3 session days stayed at or under the ceiling. The most recent first, at most 3.
 */
export function stuckItems(items: Record<string, ItemState>): StuckItem[] {
  const out: (StuckItem & { last: string })[] = [];
  for (const st of Object.values(items)) {
    const c = st?.ceiling;
    const target = st?.targetBpm ?? 0;
    if (!c || !target || itemStatus(st, 0, target) === 'closed') continue;
    const best = new Map<string, number>();
    for (const h of st.history ?? []) best.set(h.at.slice(0, 10), Math.max(best.get(h.at.slice(0, 10)) ?? 0, h.bpm));
    const pts = [...best.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, bpm]) => ({ day, bpm }));
    const lastN = pts.slice(-STUCK_SESSIONS);
    if (lastN.length < STUCK_SESSIONS || lastN.some((p) => p.bpm > c.bpm + 0.5) || (st.cleanBpm ?? 0) > c.bpm + 0.5) continue;
    out.push({ id: st.itemId, area: areaOf(st), ceiling: c.bpm, target, pts: pts.slice(-10), last: lastN[lastN.length - 1].day });
  }
  return out
    .sort((a, b) => b.last.localeCompare(a.last))
    .slice(0, 3)
    .map(({ last: _l, ...x }) => x);
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

/** A ledger bucket's kind of practice, as the daily plan names it (the minutes chart's few categories). */
export function minuteArea(bucket: string): 'technique' | 'improv' | 'repertoire' | 'ear' | 'games' | 'other' {
  const k = parseBucket(bucket).kind;
  if (k === 'technique' || k === 'vocal') return 'technique';
  if (k === 'improv') return 'improv';
  if (k === 'song' || k === 'chart' || k === 'piece') return 'repertoire';
  if (k === 'ear' || k === 'lesson') return 'ear';
  if (k === 'game') return 'games';
  return 'other';
}

const minutesOf = (byBucket: Record<string, number>): { minutes: Record<string, number>; total: number } => {
  const minutes: Record<string, number> = {};
  let total = 0;
  for (const [b, ms] of Object.entries(byBucket)) {
    const m = ms / 60000;
    if (m <= 0) continue;
    const a = minuteArea(b);
    minutes[a] = (minutes[a] ?? 0) + m;
    total += m;
  }
  for (const a of Object.keys(minutes)) minutes[a] = Math.round(minutes[a] * 10) / 10;
  return { minutes, total };
};

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Today's snapshot from the current items (statuses by the one rule) and the ledger's minutes for that day. */
export function daySnapshot(day: string, items: Record<string, ItemState>, minutesOfDay: Record<string, number> = {}, extra: SnapExtra = {}): Snapshot {
  const status: Snapshot['status'] = {};
  const ladder: NonNullable<Snapshot['ladder']> = {};
  const shares: Record<string, number[]> = {};
  const keyN: Record<number, { n: number; c: number }> = {};
  // the keys each pattern (an item id without its key) is closed in — "all 12 keys" (D4)
  const closedSt = (st: ItemState) => !!st.takes && (st.targetBpm ?? 0) > 0 && itemStatus(st, 0, st.targetBpm!) === 'closed';
  const patKeys = new Map<string, Set<number>>();
  for (const st of Object.values(items)) if (st && closedSt(st) && typeof st.key === 'number') (patKeys.get(patternOf(st.itemId)) ?? patKeys.set(patternOf(st.itemId), new Set()).get(patternOf(st.itemId))!).add(((st.key % 12) + 12) % 12);
  // licks: the lick of an item ("lick:<id>:<key>…"), its closed keys, and the licks in my language
  const lickOf = (id: string) => (id.startsWith('lick:') ? id.split(':')[1] : null);
  const lang = languageLicks(extra.book?.uses);
  const lickPlayed = new Set<string>(), lickClosed = new Set<string>();
  let lp = 0, lc = 0;
  const ch: ChannelMix = { ear: 0, page: 0, memory: 0 };
  for (const st of Object.values(items)) {
    if (!st || !st.takes) continue;
    const a = areaOf(st);
    const target = st.targetBpm ?? 0;
    const s = target > 0 ? itemStatus(st, 0, target) : st.cleanBpm > 0 ? 'learning' : 'new';
    (status[a] ??= {})[s] = (status[a][s] ?? 0) + 1;
    if (s === 'closed') {
      const lk = lickOf(st.itemId);
      const up: UpperStep | null = (st.channels?.unaided?.clean ?? 0) > 0 ? 'fingers' : lk && lang.has(lk) ? 'language' : (patKeys.get(patternOf(st.itemId))?.size ?? 0) >= 12 ? 'keys12' : null;
      if (up) (ladder[a] ??= {})[up] = (ladder[a][up] ?? 0) + 1;
    }
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
      const lk = lickOf(st.itemId);
      if (lk) (lickPlayed.add(lk), s === 'closed' && lickClosed.add(lk));
    }
    const c = st.channels;
    if (c) {
      ch.ear += (c['ear-fresh']?.n ?? 0) + (c['ear-known']?.n ?? 0);
      ch.page += (c['page-sight']?.n ?? 0) + (c['page-known']?.n ?? 0);
      ch.memory += c.unaided?.n ?? 0;
    }
  }
  // the Ear course: its finished steps per area (its own "closed by area"), and its levels
  if (extra.ear) for (const [a, st] of Object.entries(earStatus(extra.ear.steps))) status[a] = st;
  const { minutes, total } = minutesOf(minutesOfDay);
  // minutes per channel: the day's technique minutes split by the day's takes per channel (the delta to the last snapshot)
  const prevCh = extra.prior?.chTakes;
  const dayCh = prevCh ? { ear: Math.max(0, ch.ear - prevCh.ear), page: Math.max(0, ch.page - prevCh.page), memory: Math.max(0, ch.memory - prevCh.memory) } : null;
  const dayN = dayCh ? dayCh.ear + dayCh.page + dayCh.memory : 0;
  const tech = minutes.technique ?? 0;
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const chMinutes = dayCh && dayN > 0 && tech > 0 ? { ear: r1((tech * dayCh.ear) / dayN), page: r1((tech * dayCh.page) / dayN), memory: r1((tech * dayCh.memory) / dayN) } : undefined;
  // the week's actual mix: the takes since the snapshot about a week ago
  const wk = extra.weekAgo?.chTakes;
  const wkCh = wk ? { ear: Math.max(0, ch.ear - wk.ear), page: Math.max(0, ch.page - wk.page), memory: Math.max(0, ch.memory - wk.memory) } : null;
  const wkN = wkCh ? wkCh.ear + wkCh.page + wkCh.memory : 0;
  const mix = wkCh && wkN > 0 ? { ear: r3(wkCh.ear / wkN), page: r3(wkCh.page / wkN), memory: r3(wkCh.memory / wkN) } : wkCh ? null : undefined;
  const ownN = extra.book?.own?.length;
  return {
    day,
    status,
    tempo: Object.fromEntries(Object.entries(shares).map(([a, xs]) => [a, Math.round(median(xs) * 1000) / 1000])),
    minutes,
    channels: channelProfile(items),
    keys: Object.fromEntries(Object.entries(keyN).map(([k, v]) => [k, Math.round((v.c / v.n) * 1000) / 1000])),
    vocab: { played: lp, closed: lc, learned: lickClosed.size, practice: [...lickPlayed].filter((x) => !lickClosed.has(x)).length, language: [...lickPlayed].filter((x) => lang.has(x)).length, ...(ownN !== undefined ? { encore: ownN } : {}) },
    practised: total > 0,
    ...stuckField(items),
    ...(Object.keys(ladder).length ? { ladder } : {}),
    ...(extra.ear?.level && Object.keys(extra.ear.level).length ? { level: extra.ear.level } : {}),
    ...(ch.ear + ch.page + ch.memory > 0 ? { chTakes: ch } : {}),
    ...(chMinutes ? { chMinutes } : {}),
    ...(mix !== undefined ? { mix } : {}),
    ...(extra.mixTarget ? { mixTarget: extra.mixTarget } : {}),
    ...improvField(extra),
  };
}

/** The pattern of an item: its id without the key (channelPlan.patternIdOf; repeated so this module stays light). */
const patternOf = (itemId: string): string => {
  const p = itemId.split(':');
  return p.length > 3 ? [p[0], p[1], ...p.slice(3)].join(':') : itemId;
};
/** Licks "in my language" (vocab.inMyLanguage): used in improvisation in ≥ 3 sessions and ≥ 2 keys. */
function languageLicks(uses: { id: string; key: number; session: string }[] | undefined): Set<string> {
  const by = new Map<string, { s: Set<string>; k: Set<number> }>();
  for (const u of uses ?? []) {
    const e = by.get(u.id) ?? by.set(u.id, { s: new Set(), k: new Set() }).get(u.id)!;
    e.s.add(u.session);
    e.k.add(u.key);
  }
  return new Set([...by.entries()].filter(([, e]) => e.s.size >= 3 && e.k.size >= 2).map(([id]) => id));
}
/** Improvisation: colour coverage over the mode × function stats (weighted by takes), the day's in-scale rate, the map. */
function improvField(extra: SnapExtra): Pick<Snapshot, 'improv'> {
  const st = extra.modeStats ?? {};
  const ents = Object.entries(st).filter(([, v]) => v && v.n > 0);
  const day = extra.improvDay && extra.improvDay.n > 0 ? extra.improvDay : null;
  if (!ents.length && !day) return {};
  const n = ents.reduce((a, [, v]) => a + v.n, 0);
  const cov = n ? Math.round((ents.reduce((a, [, v]) => a + v.cov * v.n, 0) / n) * 1000) / 1000 : null;
  const map = Object.fromEntries(ents.sort((a, b) => b[1].n - a[1].n).slice(0, 24).map(([k, v]) => [k, Math.round(v.cov * 100) / 100]));
  return { improv: { cov, inScale: day ? Math.round((day.inSet / day.n) * 1000) / 1000 : null, map } };
}

const stuckField = (items: Record<string, ItemState>): { stuck?: StuckItem[] } => {
  const stuck = stuckItems(items);
  return stuck.length ? { stuck } : {};
};

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
export function backfillSnapshots(items: Record<string, ItemState>, ledgerDays: Record<string, Record<string, number>>, until: string, existing: Record<string, Snapshot> = {}, ear: EarStep[] = []): Record<string, Snapshot> {
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
  for (const e of ear) (daysSet.add((e.firstAt ?? e.at).slice(0, 10)), daysSet.add(e.at.slice(0, 10)));
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
    // the Ear course's steps as they stood that day (SPEC-PROGRESS-CHARTS §1: whatever history can tell)
    if (ear.length) Object.assign(status, earStatus(ear, day));
    const { minutes, total } = minutesOf(ledgerDays[day] ?? {});
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

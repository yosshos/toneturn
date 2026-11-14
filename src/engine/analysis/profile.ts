// The player profile (docs/SPEC-AI.he.md §8, owner 2026-11-14): one picture from every measure the app already keeps —
// the technique model, the groove fingerprint, the confusion map and the Ear Index — with a timeline. Each week keeps a
// small snapshot of the patterns that were showing, so a pattern can be "new", "recurring for N weeks", or "gone"
// (and gone only counts when the player kept practising: no practice proves nothing). Only measured, repeated
// findings make it in (the models' own sample thresholds, plus a confidence floor). Pure.
//
// The digest at the end is what a coach (stage B) would phrase — never more than what was measured here.

import { findings, type PlayerModel } from './model';
import { grooveFindings, weekKey, type GrooveModel } from './groove';
import type { Confusion } from '../../storage/confusion';

type Bi = { en: string; he: string };

export type ProfileSource = 'technique' | 'groove' | 'confusions' | 'ear';
export type ProfileAction = { kind: 'topic'; id: string; level: number } | { kind: 'drills' } | { kind: 'groove' };

export interface ProfileItem {
  /** Stable across weeks (the timeline is keyed by it). */
  id: string;
  source: ProfileSource;
  tone: 'pattern' | 'strength';
  text: Bi;
  note?: Bi;
  /** 0..1. */
  confidence: number;
  action?: ProfileAction;
}

/** How much practice stood behind the measures (to tell "gone" from "not practised"). */
export interface ProfileCounters {
  takes: number;
  taps: number;
  /** Wrong answers ever logged in the confusion map. */
  misses: number;
}

export interface ProfileSnap extends ProfileCounters {
  week: string;
  /** The patterns showing that week (text kept, so a gone pattern can still be named). */
  items: Record<string, Bi>;
}
export interface ProfileHistory {
  v: 1;
  snaps: ProfileSnap[];
}
export const emptyHistory = (): ProfileHistory => ({ v: 1, snaps: [] });

export interface ProfileRow extends ProfileItem {
  /** Weeks in a row the pattern has shown (this week included). */
  weeks: number;
  status: 'new' | 'recurring' | 'strength';
}
export interface GoneRow {
  id: string;
  source: ProfileSource;
  text: Bi;
  /** The week it was last seen. */
  since: string;
}
export interface Profile {
  strengths: ProfileRow[];
  patterns: ProfileRow[];
  gone: GoneRow[];
  /** Enough measured practice to say anything at all. */
  ready: boolean;
}

/** A finding needs at least this confidence to be called a pattern (the models already demand enough notes). */
export const MIN_CONFIDENCE = 0.4;
/** A confusion pair counts when mixed up this often, and lately. */
export const PAIR_MIN = 4;
export const PAIR_RECENT_DAYS = 21;
/** "Gone" needs this much practice of the same kind after it was last seen. */
const GONE_AFTER: Record<Exclude<ProfileSource, 'ear'>, { key: keyof ProfileCounters; n: number }> = {
  technique: { key: 'takes', n: 15 },
  groove: { key: 'taps', n: 150 },
  confusions: { key: 'misses', n: 15 },
};
const KEEP_WEEKS = 26;
const DAY = 86400000;

const pairId = (c: Confusion) => {
  const [x, y] = [c.right.en, c.given.en].sort();
  return `c:${c.topic}|${x}|${y}`;
};

export interface ProfileInput {
  model: PlayerModel | null;
  groove: GrooveModel | null;
  /** Merged pairs (topConfusions), most frequent first. */
  pairs: (Confusion & { both: number })[];
  /** Ear Index by day (earIndexHistory). */
  ear: { day: string; r: number }[];
  now: Date;
}

/** Everything the measures say right now, as profile items. */
export function profileItems({ model, groove, pairs, ear, now }: ProfileInput): ProfileItem[] {
  const out: ProfileItem[] = [];
  if (model)
    for (const f of findings(model)) {
      if (f.confidence < MIN_CONFIDENCE) continue;
      out.push({
        id: `t:${f.kind}:${f.ctx}`,
        source: 'technique',
        tone: 'pattern',
        text: f.text,
        note: f.prescribe.note,
        confidence: f.confidence,
        action: f.prescribe.topic ? { kind: 'topic', id: f.prescribe.topic, level: 1 } : { kind: 'drills' },
      });
    }
  if (groove)
    for (const f of grooveFindings(groove)) {
      const steady = f.kind === 'steady';
      out.push({
        id: `g:${f.kind}:${f.ctx}`,
        source: 'groove',
        tone: steady ? 'strength' : 'pattern',
        text: f.text,
        note: f.practice,
        confidence: Math.min(1, (groove.stats.all?.n ?? 0) / 150),
        action: { kind: 'groove' },
      });
    }
  for (const c of pairs) {
    if (c.both < PAIR_MIN || now.getTime() - Date.parse(c.last) > PAIR_RECENT_DAYS * DAY) continue;
    out.push({
      id: pairId(c),
      source: 'confusions',
      tone: 'pattern',
      text: { en: `You mix up ${c.right.en} and ${c.given.en} (${c.both} times)`, he: `מתבלבלים בין ${c.right.he} ל־${c.given.he} (${c.both} פעמים)` },
      note: { en: 'Practise the two side by side until they sound different', he: 'לתרגל את שניהם זה לצד זה עד שהם נשמעים שונים' },
      confidence: Math.min(1, c.both / 10),
      action: c.gen ? { kind: 'topic', id: c.gen.id, level: c.gen.level } : undefined,
    });
  }
  // The Ear Index over four weeks: a clear rise is a strength.
  if (ear.length >= 2) {
    const cut = new Date(now.getTime() - 28 * DAY).toISOString().slice(0, 10);
    const from = [...ear].reverse().find((p) => p.day <= cut) ?? ear[0];
    const to = ear[ear.length - 1];
    const d = to.r - from.r;
    if (d >= 10 && from !== to)
      out.push({ id: 'e:up', source: 'ear', tone: 'strength', text: { en: `Ear Index up ${d} in four weeks`, he: `מדד האוזן עלה ב־${d} בארבעה שבועות` }, confidence: 1 });
  }
  return out;
}

/** This week's snapshot written in (replacing an earlier one of the same week); the oldest weeks drop off. */
export function withSnapshot(h: ProfileHistory, items: ProfileItem[], c: ProfileCounters, now: Date): ProfileHistory {
  const week = weekKey(now);
  const snap: ProfileSnap = { week, ...c, items: Object.fromEntries(items.filter((i) => i.tone === 'pattern').map((i) => [i.id, i.text])) };
  const snaps = [...h.snaps.filter((s) => s.week !== week), snap].sort((a, b) => a.week.localeCompare(b.week)).slice(-KEEP_WEEKS);
  return { v: 1, snaps };
}

/** Weeks in a row (back from the latest snapshot) that a pattern showed. */
function streak(h: ProfileHistory, id: string): number {
  let n = 0;
  for (let i = h.snaps.length - 1; i >= 0; i--) {
    if (!h.snaps[i].items[id]) break;
    n++;
  }
  return n;
}

/**
 * The profile as shown: strengths, patterns (recurring ones first) and patterns that went away while the player kept
 * practising. `h` should already hold this week's snapshot (withSnapshot).
 */
export function buildProfile(items: ProfileItem[], h: ProfileHistory, c: ProfileCounters, k = { strengths: 2, patterns: 3, gone: 2 }): Profile {
  const rows: ProfileRow[] = items.map((i) => {
    const weeks = i.tone === 'pattern' ? Math.max(1, streak(h, i.id)) : 0;
    return { ...i, weeks, status: i.tone === 'strength' ? 'strength' : weeks >= 2 ? 'recurring' : 'new' };
  });
  const patterns = rows.filter((r) => r.tone === 'pattern').sort((a, b) => b.weeks - a.weeks || b.confidence - a.confidence);
  const strengths = rows.filter((r) => r.tone === 'strength').sort((a, b) => b.confidence - a.confidence);
  const now = new Set(items.map((i) => i.id));
  const gone: GoneRow[] = [];
  const seen = new Set<string>();
  const latest = h.snaps[h.snaps.length - 1];
  // Newest first: the last week each pattern was seen.
  for (let i = h.snaps.length - 2; i >= 0 && i >= h.snaps.length - 9; i--) {
    const s = h.snaps[i];
    for (const [id, text] of Object.entries(s.items)) {
      if (now.has(id) || seen.has(id) || (latest && latest.items[id])) continue;
      seen.add(id);
      const source = (id[0] === 't' ? 'technique' : id[0] === 'g' ? 'groove' : 'confusions') as Exclude<ProfileSource, 'ear'>;
      const need = GONE_AFTER[source];
      if (c[need.key] - s[need.key] >= need.n) gone.push({ id, source, text, since: s.week });
    }
  }
  return {
    strengths: strengths.slice(0, k.strengths),
    patterns: patterns.slice(0, k.patterns),
    gone: gone.slice(0, k.gone),
    ready: c.takes + c.misses >= 10 || c.taps >= 50 || items.length > 0,
  };
}

/** Weeks a confusion pair has shown in a row (for the after-session line), by its two English labels. */
export function pairWeeks(h: ProfileHistory, topic: string, a: string, b: string): number {
  const [x, y] = [a, b].sort();
  return streak(h, `c:${topic}|${x}|${y}`);
}

/** What a coach would phrase (stage B): only measured items, no raw data. */
export function profileDigest(p: Profile) {
  const row = (r: ProfileRow) => ({ id: r.id, area: r.source, finding: r.text.en, weeks: r.weeks || undefined, practise: r.note?.en });
  return {
    strengths: p.strengths.map(row),
    patterns: p.patterns.map(row),
    resolved: p.gone.map((g) => ({ id: g.id, area: g.source, finding: g.text.en, lastSeen: g.since })),
  };
}

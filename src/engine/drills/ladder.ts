// Technique drills: the tempo ladder per item, "what to work on today" and the family level (spec AI §7–§9). Pure.

import type { Drill, DrillSettings, FamilyId, ItemState, TakeMetrics } from './types';
import { DEFAULT_DRILL_SETTINGS } from './types';
import { median, tempoBand, npsOf } from './analyze';

export { tempoBand, npsOf, bandOfBpm } from './analyze';

export type LadderAction = 'again' | 'raise' | 'lower' | 'next-key' | 'next-drill';
export interface LadderResult {
  state: ItemState;
  next: { bpm: number; action: LadderAction };
  message: { en: string; he: string };
  /** The goal has reached the level's target tempo (it stops climbing there). */
  targetReached?: boolean;
}

/** How a take was played (BASS_AUDIT A4): the level's target tempo for the item, and whether "Slower" was pressed. */
export interface TakeOpts {
  /** The level's target tempo (plan.itemTargetBpm); stored on the item. */
  targetBpm?: number;
  /** The player pressed "Slower" for this take: it never counts toward the level. */
  slower?: boolean;
}

/** Level pass (A4): 3 clean takes at ≥ 95 % of the target tempo, on at least 2 different days. */
export const PASS_TAKES = 3;
export const PASS_DAYS = 2;
export const PASS_SHARE = 0.95;

/**
 * Where an item stands for its level (A4): clean at the start tempo (a take counted at ≥ 95 % of it), and passed at
 * the target (3 counted clean takes at ≥ 95 % of the target on ≥ 2 days). Only takes in `passLog` count — clean, at
 * or above the ladder's goal, never after "Slower" — plus, for items older than the log, one take per day of the
 * clean-tempo history.
 */
export function itemPass(st: ItemState | undefined, startBpm: number, targetBpm: number): { start: boolean; target: boolean; takes: number; days: number } {
  if (!st) return { start: false, target: false, takes: 0, days: 0 };
  const all = st.passLog ?? (st.history ?? []).map((h) => ({ at: h.at, bpm: h.bpm }));
  const atT = all.filter((x) => x.bpm >= PASS_SHARE * targetBpm - 1e-9);
  const days = new Set(atT.map((x) => x.at.slice(0, 10))).size;
  const target = atT.length >= PASS_TAKES && days >= PASS_DAYS;
  const start = target || all.some((x) => x.bpm >= PASS_SHARE * startBpm - 1e-9);
  return { start, target, takes: atT.length, days };
}

const ALPHA = 0.3;
const CLEAN_IN_A_ROW = 3;
const FAILS_TO_LOWER = 2;
const MIN_BPM = 30;

/** One ladder step: ≈ 4 % of the tempo, whole bpm, at least +2. */
export function ladderStep(bpm: number): number {
  return Math.max(2, Math.round(bpm * 0.04));
}

/** A fresh item (goal = the drill's suggested start tempo). */
export function newItem(drill: Drill): ItemState {
  return {
    itemId: drill.itemId,
    family: drill.spec.family,
    key: drill.spec.key,
    hands: drill.spec.hands,
    cleanBpm: 0,
    goalBpm: drill.startBpm,
    streak: 0,
    fails: 0,
    ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 0 },
    takes: 0,
    last: '',
    history: [],
    passLog: [],
  };
}

const worstCv = (m: TakeMetrics): number | null => {
  const xs = [m.cvR, m.cvL].filter((x): x is number => x !== null);
  return xs.length ? Math.max(...xs) : null;
};

/**
 * Apply one take: EWMAs, history, the ladder (3 clean → +1 step, 2 failed → −10 %) and the continuous modes. With a
 * target tempo (opts / the item) the goal stops at the target ("level tempo reached"). A clean take at or above the
 * goal, not after "Slower", goes into the pass log (A4).
 */
export function applyTake(state: ItemState, metrics: TakeMetrics, bpm: number, at: string, settings: DrillSettings = DEFAULT_DRILL_SETTINGS, opts: TakeOpts = {}): LadderResult {
  const s: ItemState = {
    ...state,
    ewma: { ...state.ewma },
    history: state.history.slice(),
    // Older items (no log yet): their clean-tempo history becomes the log, one take per day.
    passLog: state.passLog ? state.passLog.slice() : state.history.map((h) => ({ at: h.at, bpm: h.bpm })),
  };
  if (opts.targetBpm && opts.targetBpm > 0) s.targetBpm = Math.round(opts.targetBpm);
  const target = s.targetBpm;
  /** The next goal after a raise, never past the target. */
  const capped = (g: number) => (target ? Math.min(g, Math.max(target, s.goalBpm)) : g);
  const first = s.takes === 0;
  const upd = (k: keyof ItemState['ewma'], v: number | null) => {
    if (v === null || !Number.isFinite(v)) return;
    s.ewma[k] = first ? v : s.ewma[k] + ALPHA * (v - s.ewma[k]);
  };
  const cv = worstCv(metrics);
  upd('cv', cv);
  upd('sd', metrics.timingSD);
  upd('vsd', metrics.velSD);
  upd('hands', metrics.handsAbs);
  upd('acc', metrics.accuracy);
  s.takes += 1;
  s.last = at;
  const B = Math.round(bpm);
  const goal0 = s.goalBpm;
  const clean = metrics.verdict === 'clean';
  const atGoal = bpm >= goal0 - 0.5;

  if (clean) {
    s.cleanBpm = Math.max(s.cleanBpm, B);
    const day = at.slice(0, 10);
    const lastH = s.history[s.history.length - 1];
    if (lastH && lastH.at.slice(0, 10) === day) {
      if (B >= lastH.bpm) s.history[s.history.length - 1] = { at, bpm: B, cv: cv ?? 0 };
    } else s.history.push({ at, bpm: B, cv: cv ?? 0 });
    if (s.history.length > 200) s.history.splice(0, s.history.length - 200);
    // A4: only takes at the goal (or above, or already at the level's target), never after "Slower", count.
    if ((atGoal || (target && bpm >= PASS_SHARE * target - 1e-9)) && !opts.slower) {
      s.passLog!.push({ at, bpm: B });
      if (s.passLog!.length > 60) s.passLog!.splice(0, s.passLog!.length - 60);
    }
  }

  let action: LadderAction = 'again';
  let message: { en: string; he: string };
  if (clean) {
    s.fails = 0;
    if (atGoal) {
      s.streak += 1;
      if (s.streak >= CLEAN_IN_A_ROW && target && goal0 >= target) {
        // The level's tempo: stay here (3 clean on 2 days pass the item).
        s.streak = 0;
        message = {
          en: `Level tempo reached: ♩ ${goal0}`,
          he: `הגעתם לטמפו של השלב: ♩ ${goal0}`,
        };
      } else if (s.streak >= CLEAN_IN_A_ROW) {
        s.goalBpm = capped(Math.max(goal0, B) + ladderStep(Math.max(goal0, B)));
        s.streak = 0;
        action = 'raise';
        message = {
          en: `3 clean at ♩ ${B} → ♩ ${s.goalBpm}`,
          he: `3 נקיים ב-♩ ${B} → ♩ ${s.goalBpm}`,
        };
      } else
        message = {
          en: `Clean ${s.streak}/3 at ♩ ${B}`,
          he: `נקי ${s.streak}/3 ב-♩ ${B}`,
        };
    } else
      message = {
        en: `Clean at ♩ ${B} — today's goal ♩ ${goal0}`,
        he: `נקי ב-♩ ${B} — היעד היום ♩ ${goal0}`,
      };
  } else if (metrics.verdict === 'not') {
    s.streak = 0;
    s.fails += 1;
    if (s.fails >= FAILS_TO_LOWER) {
      s.goalBpm = Math.max(MIN_BPM, Math.round(goal0 * 0.9));
      s.fails = 0;
      action = 'lower';
      message = {
        en: `Two misses — down to ♩ ${s.goalBpm}, then climb again`,
        he: `שתי החמצות — יורדים ל-♩ ${s.goalBpm} ומטפסים שוב`,
      };
    } else
      message = {
        en: `Not yet — again at ♩ ${goal0}`,
        he: `עוד לא — שוב ב-♩ ${goal0}`,
      };
  } else {
    s.streak = 0;
    message = {
      en: `Almost — again at ♩ ${goal0}`,
      he: `כמעט — שוב ב-♩ ${goal0}`,
    };
  }

  // Continuous practice: a passing take moves on at once.
  if (settings.continuous !== 'off') {
    const pass = metrics.accuracy >= settings.continuousAccuracy && metrics.verdict !== 'not' && (cv === null || cv < 0.07);
    if (pass) {
      if (settings.continuous === 'raise-tempo') {
        if (action !== 'raise') {
          const from = Math.max(goal0, B);
          s.goalBpm = capped(from + ladderStep(from));
          s.streak = 0;
        }
        if (s.goalBpm > goal0) {
          action = 'raise';
          message = {
            en: `Good — up to ♩ ${s.goalBpm}`,
            he: `טוב — עולים ל-♩ ${s.goalBpm}`,
          };
        }
      } else if (settings.continuous === 'next-key') {
        action = 'next-key';
        message = { en: 'Good — next key', he: 'טוב — לטונליות הבאה' };
      } else {
        action = 'next-drill';
        message = { en: 'Good — next drill', he: 'טוב — לתרגיל הבא' };
      }
    }
  }
  const res: LadderResult = { state: s, next: { bpm: s.goalBpm, action }, message };
  if (target && s.goalBpm >= target) res.targetReached = true;
  return res;
}

// ───────────────────────────── weakness and today's items ─────────────────────────────

const toTime = (x: number | string): number => (typeof x === 'number' ? x : Date.parse(x));
const daysSince = (last: string, now: number | string): number => (last ? Math.max(0, (toTime(now) - Date.parse(last)) / 86400000) : 30);

function comps(s: ItemState) {
  return {
    gap: s.cleanBpm > 0 ? Math.max(0, (s.goalBpm - s.cleanBpm) / Math.max(1, s.goalBpm)) : 1,
    cv: s.ewma.cv,
    vsd: s.ewma.vsd,
    hands: s.ewma.hands,
    err: 1 - s.ewma.acc,
  };
}
const FLOOR = { gap: 0.05, cv: 0.01, vsd: 2, hands: 5, err: 0.02 };
const W = { gap: 0.35, cv: 0.25, vsd: 0.15, hands: 0.15, err: 0.1 };

/**
 * Weakness of an item (research §6.1): weighted robust z-scores against the player's own peers
 * (e.g. the same family across keys) × staleness. Higher = weaker / more due.
 */
export function weakness(state: ItemState, peers: ItemState[], now: number | string = Date.now()): number {
  const ps = peers.length ? peers : [state];
  const me = comps(state);
  const all = ps.map(comps);
  let z = 0;
  for (const k of Object.keys(W) as (keyof typeof W)[]) {
    const xs = all.map((c) => c[k]);
    const med = median(xs);
    const mad = median(xs.map((x) => Math.abs(x - med))) * 1.4826;
    z += W[k] * ((me[k] - med) / Math.max(mad, FLOOR[k]));
  }
  const days = daysSince(state.last, now);
  const staleness = 1 + Math.min(1.5, Math.log2(1 + days) / 3);
  return Math.max(0, z + 2) * staleness;
}

export type TodayRole = 'warm-up' | 'weak' | 'maintenance' | 'variant' | 'new';
export interface TodayItem {
  drill: Drill;
  role: TodayRole;
  state?: ItemState;
}

const isVariant = (d: Drill): boolean => {
  const s = d.spec;
  return (!!s.variant && s.variant !== 'even') || (!!s.articulation && s.articulation !== 'legato') || (!!s.dynamics && s.dynamics !== 'even-mf');
};

/**
 * Today's Technique block (spec §9): 1 warm-up (known, easy) → 2–3 weakest → 1 maintenance (mastered, longest unseen)
 * → 1 variant; new items fill the gaps. Keys are interleaved (no two neighbours in the same key when avoidable).
 */
export function todaysItems(states: ItemState[] | Record<string, ItemState>, candidates: Drill[], n = 5, now: number | string = Date.now()): TodayItem[] {
  const map: Record<string, ItemState> = Array.isArray(states) ? Object.fromEntries(states.map((s) => [s.itemId, s])) : states;
  const stOf = (d: Drill): ItemState | undefined => (map[d.itemId] && map[d.itemId].takes > 0 ? map[d.itemId] : undefined);
  const known = candidates.filter((d) => stOf(d));
  const fresh = candidates.filter((d) => !stOf(d));
  const peers = (f: FamilyId) => Object.values(map).filter((s) => s.family === f && s.takes > 0);
  const scored = known.map((d) => {
    const st = stOf(d)!;
    return {
      d,
      st,
      w: weakness(st, peers(st.family), now),
      mastery: st.cleanBpm / Math.max(1, st.goalBpm),
      days: daysSince(st.last, now),
    };
  });
  const picked: TodayItem[] = [];
  const has = (d: Drill) => picked.some((p) => p.drill.itemId === d.itemId);
  const push = (d: Drill, role: TodayRole) => {
    if (!has(d) && picked.length < n) picked.push({ drill: d, role, state: stOf(d) });
  };

  // 1. Warm-up: the most mastered known item (least weak on ties); else the first new one.
  const warm = scored.filter((x) => x.st.cleanBpm > 0).sort((a, b) => b.mastery - a.mastery || a.w - b.w)[0];
  if (warm) push(warm.d, 'warm-up');
  else if (fresh.length) push(fresh[0], 'new');

  // 2. The weakest 2–3, preferring distinct keys.
  const nWeak = Math.max(1, Math.min(3, n - 3));
  const weakSorted = scored.filter((x) => !has(x.d)).sort((a, b) => b.w - a.w);
  const usedKeys = new Set<number>();
  let added = 0;
  for (const x of weakSorted) {
    if (added >= nWeak) break;
    if (usedKeys.has(x.d.spec.key) && weakSorted.some((y) => !has(y.d) && !usedKeys.has(y.d.spec.key) && y !== x)) continue;
    push(x.d, 'weak');
    usedKeys.add(x.d.spec.key);
    added++;
  }
  for (const x of weakSorted) if (added < nWeak && !has(x.d)) (push(x.d, 'weak'), added++);

  // 3. Maintenance: mastered (clean at ≥ 90 % of goal), longest since practised.
  const maint = scored.filter((x) => !has(x.d) && x.st.cleanBpm >= 0.9 * x.st.goalBpm).sort((a, b) => b.days - a.days)[0];
  if (maint) push(maint.d, 'maintenance');

  // 4. A variant (rhythm / articulation / dynamics), preferably of a picked family + key.
  const variants = candidates.filter((d) => !has(d) && isVariant(d));
  const near = variants.find((d) => picked.some((p) => p.drill.spec.family === d.spec.family && p.drill.spec.key === d.spec.key));
  if (near ?? variants[0]) push((near ?? variants[0])!, 'variant');

  // 5. Fill: new items, then the next weakest.
  for (const d of fresh) push(d, 'new');
  for (const x of weakSorted) push(x.d, 'weak');

  // Interleave keys after the warm-up.
  const out = picked.slice(0, 1);
  const rest = picked.slice(1);
  while (rest.length) {
    const prevKey = out.length ? out[out.length - 1].drill.spec.key : -1;
    const k = rest.findIndex((p) => p.drill.spec.key !== prevKey);
    out.push(rest.splice(k >= 0 ? k : 0, 1)[0]);
  }
  return out;
}

/**
 * Family level for the Technique map: the mean tempo band (1–7) of the clean tempos of the family's practised items
 * (0 = nothing clean yet), one decimal. Pass the drills to convert bpm → notes/s exactly; otherwise 8ths are assumed.
 */
export function familyLevel(states: ItemState[] | Record<string, ItemState>, family: FamilyId, drills?: Drill[] | Record<string, Drill>): number {
  const list = (Array.isArray(states) ? states : Object.values(states)).filter((s) => s.family === family && s.takes > 0);
  if (!list.length) return 0;
  const dmap: Record<string, Drill> = !drills ? {} : Array.isArray(drills) ? Object.fromEntries(drills.map((d) => [d.itemId, d])) : drills;
  const bands = list.map((s) => {
    if (s.cleanBpm <= 0) return 0;
    const d = dmap[s.itemId];
    const nps = d ? npsOf(d, s.cleanBpm) : (s.cleanBpm / 60) * 2;
    return tempoBand(nps);
  });
  return Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10;
}

// Opened vs mastered (docs/SPEC-PATH-ROLE.md §2, §4, §8, owner 2026-11-14). Pure.
//
// The path teaches what is new: a step is done when it is OPENED (technique: three keys clean at the base tempo). The
// workout builds the depth — 4★ = half the keys at the target tempo, 5★ = every key there (mastered). Mastery decays
// without practice (keyMastery recency): a mastered step whose items went stale turns silver ("refresh") and stops
// counting toward its unit's mastery, but never loses its ✓. A unit is sealed when every step is at 5★ and its
// checkpoint passed. Rank stays the hardest item beaten; unit mastery is a separate completion axis (it may be full).

import type { DrillSettings, Drill, ItemState } from './drills/types';
import { levelDrills, levelKeyProgress, levelKeys, planWithFocus } from './drills/plan';
import { generate } from './drills/generate';
import { techLevel } from './ladderFacts';
import { recency, KEY_LABEL } from './analysis/keyMastery';
import { levelKeyRows, levelLadder, stepLadder } from './statusLadder';
import { MASTER_STARS, pendingChecks, type PathFacts, type PathStep, type PathUnit, type PathView, type UnitStep } from './path';
import type { DomainId } from './rating';

type Order = DrillSettings['keyOrder'];
type Bi = { en: string; he: string };

/** A mastered step whose practice recency (keyMastery.recency, 0.6..1) fell below this turns silver: ≈ 30 days unplayed. */
export const FADE_BELOW = 0.8;

export interface MasteryCtx {
  items: Record<string, ItemState>;
  order: Order;
  now: Date | string | number;
  facts: PathFacts;
}

const nowOf = (t: MasteryCtx['now']): string | number => (t instanceof Date ? t.getTime() : t);

const doneState = (x: UnitStep) => x.state === 'done' || x.state === 'mastered' || x.state === 'tested';
/** Steps that count toward a unit's mastery: not the checkpoint, not a review, not an optional bonus. */
export const countsForMastery = (x: UnitStep) => x.step.kind !== 'check' && x.step.kind !== 'review' && !x.step.bonus;

/** The live stars of a technique step (its level's keys now) and whether its practice went stale. */
function techLive(step: PathStep, ctx: MasteryCtx): { stars: number; fresh: number } | null {
  const lv = step.ladder ? techLevel(step.ladder.ref) : undefined;
  if (!lv) return null;
  const kp = levelKeyProgress(lv, ctx.items, ctx.order);
  const n = kp.keys.filter((k) => k.target).length;
  const K = kp.keys.length;
  // The same five-star scale as plan.levelStars, read per key (the strip on the sheet shows the same keys).
  const raw = !K ? 0 : n >= K ? 5 : n >= Math.ceil(K / 2) ? 4 : n >= Math.min(3, K) ? 3 : n >= 1 ? 2 : kp.keys.filter((k) => k.start).length >= Math.min(3, K) ? 1 : 0;
  // BUILD-PLAN D1/D4: the gold node ("Mastered", 5★) is the status ladder's "all keys" — every key closed (3 clean takes
  // at ≥ 95 % of the target on 2 days); never gold beside a ladder still saying learning / almost / closed in one key
  const allClosed = levelLadder(lv, ctx.items, ctx.order).lit.includes('keys12');
  const stars = allClosed ? 5 : Math.min(raw, 4);
  const lasts = levelDrills(lv, ctx.order)
    .map((d) => ctx.items[d.itemId]?.last ?? '')
    .filter(Boolean)
    .sort();
  // The median item's recency: a level half played last week is not stale.
  const fresh = lasts.length ? recency(lasts[lasts.length >> 1], nowOf(ctx.now)) : 0.6;
  return { stars, fresh };
}

/**
 * The view with the one star scale on every step (mstars 0–5) and the silver refresh (fade). Technique steps read their
 * keys live; a ✓ is never removed (state stays done / tested), only the stars and the mastered look follow the keys.
 */
export function decorateMastery(view: PathView, ctx: MasteryCtx): PathView {
  const deco = (x: UnitStep): UnitStep => {
    if (!doneState(x)) return x;
    let ms = x.mstars ?? 0;
    let fresh = 1;
    if (x.step.kind === 'tech') {
      const live = techLive(x.step, ctx);
      if (live) {
        // The stored facts only rise; the live keys decide the depth (a ✓ by test or under the old rule stays opened).
        ms = Math.max(live.stars, x.state === 'tested' ? 0 : Math.min(ms, 1));
        fresh = live.fresh;
      }
    } else {
      const d = ctx.facts.steps?.[x.step.id];
      if (d?.at) fresh = recency(d.at, nowOf(ctx.now));
    }
    const fade = ms >= MASTER_STARS && fresh < FADE_BELOW;
    const state = x.state === 'tested' ? 'tested' : ms >= MASTER_STARS ? 'mastered' : 'done';
    return { ...x, mstars: ms, fade, state, ladder: ladderOfStep(x.step, true, ms, ctx) };
  };
  const units = view.units.map((u) => ({ ...u, steps: u.steps.map(deco) }));
  const history = view.history.map((u) => ({ ...u, steps: u.steps.map(deco) }));
  const cur = view.current ? units.flatMap((u) => u.steps).find((x) => x.step.id === view.current!.step.id) ?? view.current : null;
  return { ...view, units, history, current: cur };
}

/**
 * The one status ladder beside a step's ✓ (SPEC-PATH-TODAY-PRACTICE §4.2, BUILD-PLAN D4): a technique step reads its
 * level's keys live (closed in a key, all keys, in the fingers); any other step from its stars (stepLadder). An opened
 * technique step is at least "learning" (its ✓ stays even under a stored fact).
 */
export function ladderOfStep(step: PathStep, opened: boolean, mstars: number, ctx: MasteryCtx) {
  const lv = step.kind === 'tech' && step.ladder ? techLevel(step.ladder.ref) : undefined;
  if (lv) {
    const l = levelLadder(lv, ctx.items, ctx.order);
    return opened && l.top === 'new' ? { ...l, lit: [...l.lit, 'learning' as const], top: 'learning' as const } : l;
  }
  return stepLadder(opened, mstars);
}

export interface UnitMastery {
  unitId: string;
  mastered: number;
  total: number;
  /** Steps mastered once but faded (silver refresh). */
  faded: number;
  checkPassed: boolean;
  /** Every step at 5★ (not faded) and the checkpoint passed. */
  sealed: boolean;
}

/** A unit's mastery (the header's "mastered 5/9" and the seal). */
export function unitMastery(u: PathUnit, facts: PathFacts): UnitMastery {
  const xs = u.steps.filter(countsForMastery);
  const mastered = xs.filter((x) => (x.mstars ?? 0) >= MASTER_STARS && !x.fade).length;
  const faded = xs.filter((x) => x.fade).length;
  const chk = u.steps.find((x) => x.step.kind === 'check');
  const checkPassed = !chk || (facts.steps?.[chk.step.id]?.stars ?? 0) > 0 || doneState(chk);
  return { unitId: u.id, mastered, total: xs.length, faded, checkPassed, sealed: xs.length > 0 && mastered === xs.length && checkPassed };
}

/** What a step is missing to be mastered, in concrete terms (the sheet). */
export interface Missing {
  kind: 'tech' | 'ear' | 'open' | 'refresh' | 'mastered';
  /** Technique: keys not yet at the target tempo, in the player's key order. */
  keys?: number[];
  /** Technique: keys done at the target tempo. */
  keysDone?: number[];
  bpm?: number;
  /** Ear / theory: the next concrete need. */
  need?: 'again' | 'spaced' | 'accuracy' | 'speed';
  text: Bi;
}

export function missingFor(x: UnitStep, ctx: MasteryCtx): Missing {
  const ms = x.mstars ?? 0;
  if (!doneState(x)) return { kind: 'open', text: { en: 'Not opened yet: the first clean pass opens it.', he: 'עוד לא נפתח: מעבר נקי ראשון פותח אותו.' } };
  if (x.step.kind === 'tech' && x.step.ladder) {
    const lv = techLevel(x.step.ladder.ref);
    if (lv) {
      const kp = levelKeyProgress(lv, ctx.items, ctx.order);
      const orderKeys = levelKeys(lv, ctx.order).map((k) => ((k % 12) + 12) % 12);
      const rank = (k: number) => (orderKeys.indexOf(k) < 0 ? 99 : orderKeys.indexOf(k));
      const keys = kp.keys.filter((k) => !k.target).map((k) => k.key).sort((a, b) => rank(a) - rank(b));
      const keysDone = kp.keys.filter((k) => k.target).map((k) => k.key).sort((a, b) => rank(a) - rank(b));
      const names = keys.map((k) => KEY_LABEL[k]).join(', ');
      if (x.fade) return { kind: 'refresh', keys: kp.keys.map((k) => k.key), keysDone, bpm: kp.targetBpm, text: { en: `Refresh: play it again at ♩${kp.targetBpm}.`, he: `רענון: לנגן שוב ב־♩${kp.targetBpm}.` } };
      // D1: every key at the target once is not yet mastered — each key closes after clean takes on two days
      const rows = levelKeyRows(lv, ctx.items, ctx.order);
      const open = kp.keys.map((k) => k.key).filter((k) => rows.get(k)?.status !== 'closed').sort((a, b) => rank(a) - rank(b));
      if (!keys.length && open.length) {
        const on = open.map((k) => KEY_LABEL[k]).join(', ');
        return { kind: 'tech', keys: open, keysDone: keysDone.filter((k) => !open.includes(k)), bpm: kp.targetBpm, text: { en: `Missing: ${on} closed — clean at ♩${kp.targetBpm} on another day`, he: `חסר: ${on} סגורים — נקי ב־♩${kp.targetBpm} ביום אחר` } };
      }
      if (!keys.length) return { kind: 'mastered', keys, keysDone, bpm: kp.targetBpm, text: { en: 'Mastered: every key closed at the target tempo.', he: 'נשלט: כל הסולמות סגורים בטמפו היעד.' } };
      return { kind: 'tech', keys, keysDone, bpm: kp.targetBpm, text: { en: `Missing: ${names} at ♩${kp.targetBpm}`, he: `חסר: ${names} ב־♩${kp.targetBpm}` } };
    }
  }
  if (x.fade) return { kind: 'refresh', text: { en: 'Refresh: one clean run brings it back.', he: 'רענון: ריצה נקייה אחת מחזירה אותו.' } };
  if (ms >= MASTER_STARS) return { kind: 'mastered', text: { en: 'Mastered.', he: 'נשלט.' } };
  const d = ctx.facts.steps?.[x.step.id];
  if (ms < 3) return { kind: 'ear', need: 'accuracy', text: { en: 'Missing: a run with every answer right.', he: 'חסר: ריצה שכל התשובות בה נכונות.' } };
  if ((d?.times ?? 1) < 2) return { kind: 'ear', need: 'again', text: { en: 'Missing: one more clean run, another day.', he: 'חסר: עוד ריצה נקייה, ביום אחר.' } };
  const spaced = !!d?.firstAt && new Date(d.at).getTime() - new Date(d.firstAt).getTime() >= 3 * 86400000;
  if (!spaced) return { kind: 'ear', need: 'spaced', text: { en: 'Missing: a clean run 3 days after the first.', he: 'חסר: ריצה נקייה 3 ימים אחרי הראשונה.' } };
  return { kind: 'ear', need: 'speed', text: { en: 'Missing: the same accuracy, a little faster.', he: 'חסר: אותו דיוק, קצת יותר מהר.' } };
}

/** Units close to mastery (current and past, not sealed): at most `left` steps (or the checkpoint) to go, fewest first. */
export function nearMastery(view: PathView, facts: PathFacts, left = 2): { unit: PathUnit; m: UnitMastery; toGo: number }[] {
  return view.units
    .filter((u) => u.status !== 'projected')
    .map((u) => ({ unit: u, m: unitMastery(u, facts) }))
    .map((r) => ({ ...r, toGo: r.m.total - r.m.mastered + (r.m.checkPassed ? 0 : 1) }))
    .filter((r) => r.m.total > 0 && !r.m.sealed && r.m.mastered > 0 && r.toGo <= left)
    .sort((a, b) => a.toGo - b.toGo || b.unit.n - a.unit.n);
}

/** The strengthen block's "what it leads to" (§8 Drive): "2 more steps and unit C is mastered". */
export function leadsTo(view: PathView, facts: PathFacts, unitName: (u: PathUnit) => string): Bi | null {
  const r = nearMastery(view, facts)[0];
  if (!r) return null;
  const name = unitName(r.unit);
  const steps = r.m.total - r.m.mastered;
  if (steps === 0) return { en: `Pass the checkpoint and unit ${name} is mastered`, he: `לעבור את נקודת הביקורת, ויחידה ${name} נשלטת` };
  return steps === 1 ? { en: `1 more step and unit ${name} is mastered`, he: `עוד צעד אחד, ויחידה ${name} נשלטת` } : { en: `${steps} more steps and unit ${name} is mastered`, he: `עוד ${steps} צעדים, ויחידה ${name} נשלטת` };
}

/** The weekly AI digest's line (profileDigest): units close to mastery and what each is missing (measured data only). */
export function masteryLine(view: PathView, ctx: MasteryCtx, unitName: (u: PathUnit) => string, titleOf: (s: PathStep) => string): string {
  const parts = nearMastery(view, ctx.facts, 3)
    .slice(0, 2)
    .map((r) => {
      const miss = r.unit.steps
        .filter((x) => countsForMastery(x) && ((x.mstars ?? 0) < MASTER_STARS || x.fade))
        .slice(0, 3)
        .map((x) => `${titleOf(x.step)} (${missingFor(x, ctx).text.en.replace(/^Missing: /, '')})`);
      return `unit ${unitName(r.unit)}: ${r.m.mastered}/${r.m.total} mastered${r.m.checkPassed ? '' : ', checkpoint not passed'}${miss.length ? `; left: ${miss.join('; ')}` : ''}`;
    });
  return parts.join(' | ').slice(0, 400);
}

/** Opened steps on the road and in the history (✓ done or tested), excluding checkpoints and reviews. */
export function openedSteps(view: PathView): UnitStep[] {
  return [...view.history, ...view.units.filter((u) => u.status !== 'projected')].flatMap((u) => u.steps).filter((x) => doneState(x) && x.step.kind !== 'check' && x.step.kind !== 'review');
}

/**
 * The strengthen block's technique queue (§3): drills of the opened technique levels not yet mastered (or faded), weak
 * keys first and untried keys of a known skill next (plan.planWithFocus), so a take there raises the step's stars.
 */
export function strengthenDrills(view: PathView, ctx: MasteryCtx, n = 6): Drill[] {
  const pool: Drill[] = [];
  const seen = new Set<string>();
  for (const x of openedSteps(view)) {
    if (x.step.kind !== 'tech' || !x.step.ladder || seen.has(x.step.id)) continue;
    seen.add(x.step.id);
    if ((x.mstars ?? 0) >= MASTER_STARS && !x.fade) continue;
    const lv = techLevel(x.step.ladder.ref);
    if (lv) pool.push(...levelDrills(lv, ctx.order));
  }
  if (!pool.length) return [];
  return planWithFocus(ctx.items, pool, n, nowOf(ctx.now)).map((t) => t.drill);
}

/** The weakest opened ear / theory step to strengthen (lowest stars first, then the oldest practice). */
export function strengthenStep(view: PathView, facts: PathFacts): { x: UnitStep; unit: PathUnit } | null {
  const units = [...view.history, ...view.units.filter((u) => u.status !== 'projected')];
  let best: { x: UnitStep; unit: PathUnit; k: [number, string] } | null = null;
  for (const u of units)
    for (const x of u.steps) {
      if (!doneState(x) || x.step.kind !== 'topic' || ((x.mstars ?? 0) >= MASTER_STARS && !x.fade)) continue;
      const k: [number, string] = [x.fade ? -1 : x.mstars ?? 0, facts.steps?.[x.step.id]?.at ?? ''];
      if (!best || k[0] < best.k[0] || (k[0] === best.k[0] && k[1] < best.k[1])) best = { x, unit: u, k };
    }
  return best ? { x: best.x, unit: best.unit } : null;
}

/** Can the workout strengthen anything yet (§3: a new player with nothing opened → the path takes the share)? */
export const canStrengthen = (view: PathView): boolean => openedSteps(view).length > 0;

// ---------------------------------------------------------------- the checkpoint's technique part (§4)

/** Keys per technique level at a checkpoint: 4, or 2 for a short unit (≤ 6 steps, the 5-minute units). */
export const CHECK_KEYS = 4;
export const CHECK_KEYS_SHORT = 2;
export const SHORT_UNIT = 6;

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Random keys of a level for the checkpoint (seeded; distinct; every key when the level has fewer). */
export function sampleKeys(keys: number[], k: number, seed: number): number[] {
  const r = rng(seed);
  const pool = [...new Set(keys)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(k, pool.length));
}

/**
 * The checkpoint's technique part: each technique level of the unit in 4 random keys (2 in a short unit), one drill per
 * key (the level's first spec), played at the level's target tempo. At most 8 drills.
 */
export function checkpointTech(unit: PathUnit, order: Order, seed: number): { drills: Drill[]; keys: Record<string, number[]>; perLevel: number } {
  const per = unit.steps.length <= SHORT_UNIT ? CHECK_KEYS_SHORT : CHECK_KEYS;
  const drills: Drill[] = [];
  const keys: Record<string, number[]> = {};
  unit.steps
    .map((x) => x.step)
    .filter((s) => s.kind === 'tech' && s.ladder)
    .forEach((s, i) => {
      const lv = techLevel(s.ladder!.ref);
      if (!lv || !lv.specs.length) return;
      const ks = sampleKeys(levelKeys(lv, order), per, (seed + i * 7919) >>> 0);
      keys[s.id] = ks;
      for (const key of ks) {
        if (drills.length >= 8) break;
        try {
          drills.push(generate({ ...lv.specs[0], key }));
        } catch {
          /* a key the level can't build */
        }
      }
    });
  return { drills, keys, perLevel: per };
}

/** The technique part's stars from its takes: every drill clean = 3, ≥ 87 % = 2, ≥ 75 % = 1 (the checkpoint's own scale). */
export function checkTechStars(cleanDrills: number, drills: number): number {
  if (!drills) return 3;
  const r = cleanDrills / drills;
  return r >= 1 ? 3 : r >= 0.87 ? 2 : r >= 0.75 ? 1 : 0;
}

// ---------------------------------------------------------------- rank waits for the checkpoint (§6 Q2)

/** Areas whose promotion waits for an open checkpoint (the checkpoint's areas; technique for its technique part). */
export function rankHold(view: PathView): (DomainId | 'technique')[] {
  const out = new Set<DomainId | 'technique'>();
  for (const { unit } of pendingChecks(view))
    for (const x of unit.steps) {
      if (x.step.kind === 'tech') out.add('technique');
      else if (x.step.kind === 'topic' || x.step.kind === 'lesson') out.add(x.step.domain);
    }
  return [...out];
}

/** Bonus for sealing a unit (§8 Drive): XP that also counts in the weekly league. */
export const UNIT_MASTERY_XP = 50;

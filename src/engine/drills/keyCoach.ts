// The coach over a key session of stages (SPEC-KEY-SESSION-2 §2–§5, §10, owner 2026-11-25): it climbs each rung stage
// by stage like a teacher — right notes, a steady pulse, coordination, range, then speed. Coordination and range stages
// are played at the player's comfort tempo and pass on two clean takes (or one easy one); only the speed stage climbs, in
// notes per second, by a step graded on how well the take went (smaller when fast or near the best), on the metronome
// marks, never more than 10 % a take, alternating eighths and triplet eighths, to the target or the player's limit. A
// step back that fails again is the limit for today. Evidence skips what is known (the probe, stages passed before in this
// key). Each visit has a budget; spare time goes to open stages, and the session closes on the scale. Its lines are fixed
// phrases (coachPhrases.ts), spoken one by one. Pure: coach.ts hands a staged ladder (stages.ts) to these functions.

import type { Drill, DrillSettings, ItemState, TakeMetrics } from './types';
import type { FamilyDef, LevelDef } from './generate';
import { bandOfBpm, notesPerBeat, thresholds } from './analyze';
import { hasRubato } from './rubato';
import { newItem } from './ladder';
import { bestCleanNps, CLOSING_MIN, comfortKey, comfortNps, FRESH_NPS, heightFactor, kindClean, kindOf, kindPlayed, lastCleanNps, LOOSE_STEP, MAELZEL, markStage, markUp, MAX_JUMP, passedElsewhere, playOf, SHARE, snapDown, snapNear, speedStep, stageDrill, stagePassed, STEP_UP, stretchTarget, subDrill, targetNps, withStage, type StageInfo } from './stages';
import { line, PHRASES, tempoText, type CoachLine, type LinePart, type PhraseId, type T2 } from './coachPhrases';
import type { CoachBackground, CoachNext, CoachState, CoachTake, FreeOk } from './coach';
import { easyTake } from './coach';

type Order = DrillSettings['keyOrder'];

/** The key session's default length (minutes) when the caller gives none (the screen passes the daily practice length). */
export const KS_MINUTES = 30;
/** A rung already known, a closing review, a stage at its limit reopened: this many takes. */
export const WARM_TAKES = 2;
/** "Almost" takes in a row at one tempo before it steps back one metronome mark (S4). */
export const ALMOSTS_BACK = 3;
/** Takes on one tempo step without passing before it counts as today's limit (review 3, #3). */
export const STEP_TAKES = 6;
/** Misses at the lowest tempo before the coach changes the task (hands separately, free time), then lets it be (#5). */
export const FLOOR_MISSES = 4;
/** No ♩ below this (B2): the metronome's lowest mark. */
export const MIN_BPM = 40;

type Pulse = { nps: number; per: number; bpm: number };

/** The coach's state over a staged ladder (CoachState.ks). */
export interface KsState {
  /** Comfort per comfort kind (kind + hands) this session (nps); the scale's; the lowest per rung (a struggling hand). */
  comfort: Record<string, number>;
  scaleComfort: number;
  rungMin: Record<string, number>;
  /** The next pulsed take: notes per second, note value, ♩ (on the metronome marks). */
  nps: number;
  per: number;
  bpm: number;
  /** The last pulsed take of each exercise (kind and hands; each item of a rotating rung): the 10 % rule. */
  lastBy: Record<string, number>;
  /** Comfort kinds (an item's kind and hands) that reached eighths: they stay in eighths / triplets (U7, B2, S9). */
  eighths: string[];
  /** Rungs whose triplet feel has been explained once ("Triplets." after that); rungs whose limit was said today. */
  tripSaid: string[];
  limitSaid: string[];
  /** The next take is in free time / the rung's probe (the right hand's probe after a missed hands-together one); the
   *  scale's probe was missed (no probe on the next rung). */
  free: boolean;
  probe: boolean;
  probeRH: boolean;
  probeFailed: boolean;
  /** In this stage item: clean / easy takes, misses in a row, "almost" in a row, takes on this tempo step, stepped back
   *  already (the next failure is the limit), misses at the lowest tempo. */
  clean: number;
  easy: number;
  bad: number;
  almost: number;
  stepTakes: number;
  stepped: boolean;
  floor: number;
  /** At the lowest tempo: the hands-separately takes still to play, and whether the floor's help (hands apart / free time) was given. */
  sep: ('R' | 'L')[];
  floorHelp: boolean;
  /** Free-time misses in a row on this item (three: let it be for today). */
  freeMiss: number;
  /** Speed: the last clean pulse in this item, its (lowered, U4) start, back at the last clean tempo after two misses. */
  good: Pulse | null;
  start: number;
  back: boolean;
  /** The speed target (nps) and the best clean nps on this item before the stage began (the step halves near it). */
  target: number;
  prior: number;
  /** Best clean nps on this item this visit; best per item this session; the session's best anywhere; the last clean pulse per item. */
  best: number;
  bestBy: Record<string, number>;
  sessionBest: number;
  lastGood: Record<string, Pulse>;
  /** A rotating rung (several items): each item's own pulse, and the items that reached their target (#6). */
  itemPulse: Record<string, Pulse>;
  itemDone: string[];
  /** Rungs played clean this session (no more free time on them). */
  cleanRungs: string[];
  /** Stage level ids passed this session (closing clones by their base id); passed before it; at their limit today. */
  passed: string[];
  known: string[];
  limited: string[];
  /** The visit: when it began, its budget (ms), its takes, the stages passed in it (sentence names), the best clean pulse of each
   *  speed item in it (S3). */
  visitAt: number;
  visitBudget: number;
  visitTakes: number;
  visitPassed: T2[];
  visitBests: Record<string, Pulse & { target: number; hands: string; targetPer: number }>;
  /** Visits opened this session, how often each was reopened to finish its open stages (B1), and the ones finished today
   *  (a rung without stages at its target or its limit: not reopened, #8). */
  visited: number[];
  finished: number[];
  revisits: Record<string, number>;
  /** A warm-up / review: takes left, then the next open stage of the visit (or leave). */
  warmLeft: number;
  warmNext: number;
  /** The closing visit has begun; it is a review (at the target, or at the tempo of today's limit). */
  closing: boolean;
  review: boolean;
  reviewHere: boolean;
  /** A rung without stages with several items: how many were met at the comfort tempo before the rotating climb. */
  meet: number;
  /** Owner 2026-11-26: per rung, the next stage's lowest pulse (nps) — one metronome mark above the last clean take, so the
   *  challenge rises a little after every clean take and carries from stage to stage (absent in runs saved before it). */
  flow?: Record<string, number>;
  /** SPEC-CLIMB-SYNC §1: the first pulsed take of each rung today (nps): the climb slows once 25 % above it. */
  dayStart?: Record<string, number>;
  /** SPEC-CLIMB-SYNC §1 (review 1): the best clean nps per comfort kind in any key as the session began (the "near best"
   *  factor: the take just played must not count as the best it is measured against). */
  bestAt?: Record<string, number>;
  /** SPEC-CLIMB-SYNC §2: the challenge takes — the take number of the last one, eligible takes counted, challenges had,
   *  missed ones per comfort kind, the tidy streak per rung, the pending one (the pulse to go back to), and this session's
   *  ceilings per comfort kind (the lowest missed challenge). */
  chal?: { seed: number; lastAt: number; eligible: number; had: number; fails: Record<string, number>; tidy: Record<string, number>; pending: Pulse | null; ceil: Record<string, number> };
}

/** The best clean nps per comfort kind of the ladder's stages, in any key, now. */
function bestsAt(fam: FamilyDef, items: Record<string, ItemState>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of fam.levels) {
    if (!l.stage || l.stage.code === 'run') continue;
    for (let k = 0; k < l.specs.length; k++) {
      const d = stageDrill(l, k);
      const key = comfortKey(d);
      if (out[key] === undefined) out[key] = bestCleanNps(items, key, notesPerBeat(d));
    }
  }
  return out;
}

/** SPEC-CLIMB-SYNC §1: how well a clean take was played — 1 tidy and tight, 0.6 within 0.8 of the timing limit, 0.3 looser. */
export function stepQuality(m: TakeMetrics, drill: Drill): number {
  if (m.verdict !== 'clean') return 0;
  const th = thresholds(bandOfBpm(drill, m.bpm || drill.startBpm));
  const sd = m.timingSD;
  const tidy = (m.wrong ?? 0) === 0 && (m.hesitations ?? 0) === 0 && (m.handsAbs === null || m.handsAbs === undefined || m.handsAbs <= 0.6 * th.hands);
  if (tidy && sd !== null && sd !== undefined && sd <= 0.5 * th.sd) return 1;
  if (sd !== null && sd !== undefined && sd <= 0.8 * th.sd) return 0.6;
  return 0.3;
}

const CEIL_MS = 30 * 86_400_000;
/** The ceiling known for this item: this session's for its comfort kind, or the item's own (30 days); 0 = none. */
function ceilOf(c: CoachState, d: Drill, items: Record<string, ItemState>, now: number): number {
  const s = c.ks!.chal?.ceil[comfortKey(d)] ?? 0;
  const it = items[d.itemId]?.ceil;
  const own = it && now - Date.parse(it.at) <= CEIL_MS ? it.nps : 0;
  return s && own ? Math.min(s, own) : s || own;
}

/**
 * SPEC-CLIMB-SYNC §1: the next pulse after a clean take — at × (1 + 0.08 × quality × height × near × fresh), on the
 * marks at note value `per`: at least one mark up, never more than 10 %.
 */
export function gradedUp(at: number, per: number, q: number, o: { best?: number; ceil?: number; start?: number }): number {
  let p = 0.08 * q * heightFactor(at);
  const raw = at * (1 + p);
  const near = (ref?: number) => !!ref && ref > 0 && Math.abs(raw - ref) / ref <= 0.1;
  if (near(o.best)) p *= 0.5;
  if (near(o.ceil)) p *= 0.5;
  if (o.start && at >= o.start * 1.25) p *= 0.6;
  const cur = (at * 60) / per;
  const top = (at * (1 + p) * 60) / per;
  const cap = (at * MAX_JUMP * 60) / per;
  const under = MAELZEL.filter((g) => g > cur + 0.5 && g <= Math.min(top, cap) + 1e-9);
  let g = under.length ? under[under.length - 1] : MAELZEL.find((x) => x > cur + 0.5);
  if (g === undefined || g > cap + 1e-9) g = Math.min(cap, cur * 1.03);
  return Math.round(((g * per) / 60) * 100) / 100;
}

/** SPEC-CLIMB-SYNC §2.2: a deterministic draw in [0, 1) from the session start and the take number. */
export function chalDraw(startedAt: number, takes: number): number {
  let h = (Math.floor(startedAt / 1000) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (takes + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** SPEC-CLIMB-SYNC §2.3: the challenge's pulse — +20 % / 15 % / 12 % by height, or halfway to a known ceiling above. */
export function chalTarget(at: number, ceil: number): number {
  if (ceil > at * 1.12) return (at + ceil) / 2;
  return at * (1 + (at < 3 ? 0.2 : at <= 5 ? 0.15 : 0.12));
}
export const CHAL_GAP = 6;
export const CHAL_P = 1 / 3;
export const CHAL_SURE = 4;
export const CHAL_FAILS = 2;

const lv = (fam: FamilyDef, c: CoachState): LevelDef => fam.levels[c.step];
const inf = (l: LevelDef): StageInfo => l.stage!;
const baseId = (l: LevelDef) => l.id.replace(/~closing$/, '');
const visitSteps = (fam: FamilyDef, v: number): number[] => fam.levels.map((l, i) => (l.stage?.visit === v ? i : -1)).filter((i) => i >= 0);
const visits = (fam: FamilyDef): number => Math.max(...fam.levels.map((l) => l.stage?.visit ?? 0)) + 1;
const passedNow = (c: CoachState, l: LevelDef, items: Record<string, ItemState>) => c.ks!.passed.includes(baseId(l)) || c.ks!.known.includes(baseId(l)) || stagePassed({ ...l, stage: { ...inf(l), closing: false } }, items);
/** A stage is open: not passed, and its gate (A-7 after A-6) passed. */
function isOpen(fam: FamilyDef, c: CoachState, l: LevelDef, items: Record<string, ItemState>): boolean {
  if (passedNow(c, l, items)) return false;
  const a = inf(l).after;
  if (!a) return true;
  const g = fam.levels.find((x) => x.stage?.rung === inf(l).rung && x.stage.code === a && !x.stage.closing);
  return !g || passedNow(c, g, items);
}
/** Open and not at its limit today (#8: a stage at its limit comes back only as a short review). */
const playable = (fam: FamilyDef, c: CoachState, l: LevelDef, items: Record<string, ItemState>) => isOpen(fam, c, l, items) && !c.ks!.limited.includes(baseId(l));
const rungKinds = (fam: FamilyDef, rung: string): string[] => [...new Set(fam.levels.filter((l) => l.stage?.rung === rung).map((l) => kindOf(stageDrill(l, 0))))];
const minutesOf = (c: CoachState) => c.minutes ?? KS_MINUTES;
const closingMs = (c: CoachState) => Math.min(CLOSING_MIN, minutesOf(c) * SHARE.closing) * 60_000;
const npsOf = (bpm: number, per: number) => (bpm * per) / 60;
const gridBelow = (bpm: number) => {
  const xs = MAELZEL.filter((m) => m < bpm - 1e-6);
  return xs.length ? xs[xs.length - 1] : Math.max(20, Math.floor(bpm - 1));
};
const closingVisitOf = (fam: FamilyDef) => fam.levels.find((l) => !!l.stage?.closing)?.stage!.visit ?? -1;
/** The 10 % rule's exercise: kind and hands (a rotating rung's items too: none jumps more than 10 % over the last take). */
const capKeyOf = (d: Drill, _s: StageInfo) => comfortKey(d);
const scaleLevel = (fam: FamilyDef, code: string) => fam.levels.find((l) => l.stage?.rung === 'scale' && l.stage.code === code && !l.stage.closing);
/** S10: the harmonised rungs wait until the scale has passed A-3 (piano). */
const harmGated = (fam: FamilyDef, c: CoachState, items: Record<string, ItemState>) => {
  const a3 = scaleLevel(fam, 'A-3');
  return !!a3 && !passedNow(c, a3, items);
};
const isHarm = (fam: FamilyDef, v: number) => {
  const s = inf(fam.levels[visitSteps(fam, v)[0]]);
  return s.code !== 'run' && s.rung !== 'scale';
};
/** The drill of the take now: the stage's item, or (at the lowest tempo, #5) one hand of a hands-together item. */
function takeDrill(fam: FamilyDef, c: CoachState): Drill {
  const l = lv(fam, c);
  const h = c.ks!.sep[0];
  return h ? stageDrill({ ...l, specs: [{ ...l.specs[c.spec], hands: h }] }, 0) : stageDrill(l, c.spec);
}

/** Set the next take's pulse (U7, U11, B2): its note value — a hand that reached eighths stays in them, never quarters again,
 *  but no ♩ under 40 (quarters then); triplets only at ♩40 or more — its ♩ on the metronome marks, never more than 10 %
 *  (nps) above the last take of the same exercise. */
function setPulse(fam: FamilyDef, c: CoachState, nps: number, per?: number, noCap = false): void {
  const ks = c.ks!;
  const l = lv(fam, c);
  const s = inf(l);
  const d = stageDrill(l, c.spec);
  const key = comfortKey(d);
  let p = per ?? playOf(d, nps, s.sub, ks.eighths.includes(key)).per;
  if (p === 3 && (nps * 60) / 3 < MIN_BPM - 0.5) p = 2;
  if (p > 1 && s.sub && (nps * 60) / p < MIN_BPM - 0.5 && notesPerBeat(d) >= 1.99) p = (nps * 60) / 2 >= MIN_BPM - 0.5 ? 2 : 1;
  let bpm = Math.max(MIN_BPM, snapDown((nps * 60) / p + 0.5));
  const last = ks.lastBy[capKeyOf(d, s)] ?? 0;
  if (last > 0 && !noCap) while (npsOf(bpm, p) > last * MAX_JUMP + 1e-9 && gridBelow(bpm) >= MIN_BPM) bpm = gridBelow(bpm);
  if (bpm !== ks.bpm || p !== ks.per) ks.stepTakes = 0;
  ks.per = p;
  ks.bpm = bpm;
  ks.nps = npsOf(bpm, p);
  ks.almost = 0;
}

/** A comfort tempo; `struggle` (a step back, a missed probe) also caps the rung's fresh kinds (the struggling hand). */
const setComfort = (c: CoachState, rung: string, key: string, v: number, struggle = false) => {
  const ks = c.ks!;
  ks.comfort[key] = v;
  if (struggle) ks.rungMin[rung] = Math.min(ks.rungMin[rung] ?? Infinity, v);
};

/** The comfort tempo of the stage's item (§3.2, U6, S5): this session's for its comfort kind, else the last clean one × 0.9
 *  (capped by the tier benchmark and the item's target; a rung without stages by the session's best); a fresh kind starts at
 *  the scale's comfort and no faster than the rung's struggling hand. */
function comfortOf(c: CoachState, l: LevelDef, items: Record<string, ItemState>): number {
  const ks = c.ks!;
  const d = stageDrill(l, c.spec);
  const key = comfortKey(d);
  const s = inf(l);
  const npb = notesPerBeat(d);
  // S9: a hand that played clean in eighths before stays in eighths
  if (s.sub && npb >= 1.99 && !ks.eighths.includes(key) && lastCleanNps(items, key, npb) >= 1.99) ks.eighths.push(key);
  if (ks.comfort[key] === undefined) {
    if (s.code === 'run') {
      const st = items[d.itemId];
      const own = ((st?.goalBpm ?? d.startBpm) * npb) / 60;
      const last = lastCleanNps(items, key, npb);
      const cap = Math.min(targetNps(l, d), ks.sessionBest > 0 ? Math.max(ks.sessionBest, own) : Infinity);
      setComfort(c, s.rung, key, Math.round(Math.min(cap, last > 0 ? last * 0.9 : own) * 100) / 100);
    } else {
      let fresh = ks.scaleComfort > 0 ? ks.scaleComfort * (npb <= 1.01 ? 0.75 : 1) : FRESH_NPS;
      fresh = Math.min(fresh, ks.rungMin[s.rung] ?? Infinity);
      setComfort(c, s.rung, key, comfortNps(items, key, npb, s.tier, targetNps(l, d), fresh));
    }
  }
  return ks.comfort[key];
}

/** Begin a stage (or the next item of one): its counters and pulse; free time only on a rung never played clean. */
function enter(fam: FamilyDef, c: CoachState, step: number, items: Record<string, ItemState>, spec = 0, at?: { nps: number; per?: number; known?: boolean }): void {
  const ks = c.ks!;
  c.step = step;
  c.spec = spec;
  const l = lv(fam, c);
  c.keys = [l.keys === 'major' || l.keys === 'minor' ? 0 : l.keys[0]];
  c.keyIdx = 0;
  ks.clean = 0;
  ks.easy = 0;
  ks.bad = 0;
  ks.stepped = false;
  ks.stepTakes = 0;
  ks.floor = 0;
  ks.sep = [];
  ks.floorHelp = false;
  ks.freeMiss = 0;
  ks.good = null;
  ks.start = 0;
  ks.back = false;
  ks.review = false;
  const s = inf(l);
  const d = stageDrill(l, spec);
  ks.target = s.kind === 'speed' ? stretchTarget(l, d, items) : 0;
  const st = items[d.itemId];
  ks.prior = st?.cleanBpm ? npsOf(st.cleanBpm, notesPerBeat(d)) : 0;
  if (spec === 0) {
    ks.best = 0;
    ks.meet = 0;
  }
  const comfort = Math.max(comfortOf(c, l, items), (s.code !== 'run' && ks.flow?.[s.rung]) || 0);
  // a review at a tempo already played (the target reached) is not a jump: no 10 % cap
  setPulse(fam, c, at?.nps ?? comfort, at?.per, !!at?.known);
  if (s.what === 'scale' && !at) ks.scaleComfort = ks.nps;
  // a stage that only adds range (A-7 after A-6, two octaves after one): k × the tempo reached there, in its note value
  if (!at && s.from) {
    const src = fam.levels.find((x) => x.stage?.rung === s.rung && x.stage.code === s.from!.code && !x.stage.closing);
    if (src) {
      const sd = stageDrill(src, 0);
      const st0 = items[sd.itemId];
      const g = ks.lastGood[sd.itemId] ?? (st0?.cleanBpm ? { nps: npsOf(st0.cleanBpm, notesPerBeat(sd)), per: playOf(sd, npsOf(st0.cleanBpm, notesPerBeat(sd)), s.sub, ks.eighths.includes(comfortKey(sd))).per, bpm: 0 } : null);
      if (g && g.nps * s.from.k > ks.nps) setPulse(fam, c, g.nps * s.from.k, g.per === 3 ? 2 : g.per);
    }
  }
  ks.free = !ks.probe && hasRubato(d) && !ks.cleanRungs.includes(s.rung) && !rungKinds(fam, s.rung).some((k) => kindClean(items, k));
}

/** Switch to another item of a rotating rung at that item's own pulse (#6). */
function switchSpec(fam: FamilyDef, c: CoachState, spec: number, items: Record<string, ItemState>): void {
  const ks = c.ks!;
  c.spec = spec;
  const l = lv(fam, c);
  const d = stageDrill(l, spec);
  ks.target = targetNps(l, d);
  ks.bad = 0;
  ks.back = false;
  ks.clean = 0;
  ks.stepped = false;
  ks.good = ks.lastGood[d.itemId] ?? null;
  ks.prior = ks.bestBy[d.itemId] ?? 0;
  const own = ks.itemPulse[d.itemId];
  setPulse(fam, c, own?.nps ?? comfortOf(c, l, items), own?.per);
}

/** One take of the next pulse, in milliseconds (the count-in and the line included): what a stage needs to be worth opening (S2). */
function takeMs(fam: FamilyDef, c: CoachState): number {
  const ks = c.ks!;
  const d = stageDrill(lv(fam, c), c.spec);
  if (ks.free) return (d.notes.length * 1.1 + 8) * 1000;
  const p = subDrill(d, ks.per);
  return (((p.beats + 4) * 60) / Math.max(20, ks.bpm) + 8) * 1000;
}

/** Open a visit: the probe on a fresh rung, else its first playable stage; a known rung warms up first (U1); the closing (U1, #4). */
function openVisit(fam: FamilyDef, c: CoachState, v: number, items: Record<string, ItemState>, now: number): void {
  const ks = c.ks!;
  const idx = visitSteps(fam, v);
  ks.visitAt = now;
  ks.visitTakes = 0;
  ks.visitPassed = [];
  ks.visitBests = {};
  ks.warmLeft = 0;
  ks.warmNext = -1;
  ks.probe = false;
  ks.probeRH = false;
  if (!ks.visited.includes(v)) ks.visited.push(v);
  const s0 = inf(fam.levels[idx[0]]);
  const remaining = minutesOf(c) * 60_000 - (now - c.startedAt);
  ks.visitBudget = s0.closing ? remaining : Math.min(s0.share * minutesOf(c) * 60_000, Math.max(0, remaining - closingMs(c)));
  if (s0.closing) {
    // #4: the scale's first open stage; A-6 below its target resumes where it stopped; passed → 3–4 octaves; else (or at
    // today's limit) two takes of review (U1, #7, #8)
    ks.closing = true;
    c.demo = false;
    const sv = fam.levels.findIndex((l) => l.stage?.rung === 'scale' && !l.stage.closing);
    const scaleIdx = sv >= 0 ? visitSteps(fam, inf(fam.levels[sv]).visit) : [];
    const first = scaleIdx.find((i) => isOpen(fam, c, fam.levels[i], items));
    const a6 = idx.find((i) => inf(fam.levels[i]).kind === 'speed')!;
    const a7 = idx.find((i) => inf(fam.levels[i]).kind === 'coord');
    const review = (step: number, at: { nps: number; per?: number; known?: boolean }, here: boolean) => {
      enter(fam, c, step, items, 0, at);
      ks.free = false;
      ks.warmLeft = WARM_TAKES;
      ks.review = true;
      ks.reviewHere = here;
    };
    if (first !== undefined && inf(fam.levels[first]).kind === 'coord' && inf(fam.levels[first]).code !== 'A-7') {
      const lim = ks.limited.includes(baseId(fam.levels[first]));
      if (lim) review(first, { nps: ks.comfort[comfortKey(stageDrill(fam.levels[first], 0))] ?? FRESH_NPS }, true);
      else {
        enter(fam, c, first, items);
        ks.free = false;
      }
      return;
    }
    const d6 = stageDrill(fam.levels[a6], 0);
    const g = ks.lastGood[d6.itemId];
    if (!passedNow(c, fam.levels[a6], items)) {
      if (ks.limited.includes(baseId(fam.levels[a6])) && g) review(a6, { nps: g.nps, per: g.per === 3 ? 2 : g.per }, true);
      else {
        enter(fam, c, a6, items, 0, g ? { nps: g.nps, per: g.per === 3 ? 2 : g.per } : undefined);
        ks.free = false;
      }
      return;
    }
    if (a7 !== undefined && playable(fam, c, fam.levels[a7], items)) {
      enter(fam, c, a7, items);
      ks.free = false;
      return;
    }
    review(a6, { nps: stretchTarget(fam.levels[a6], d6, items), known: true }, false);
    // held under the target by the 10 % rule (a slower take just before): then it is a review at this tempo
    if (ks.nps < stretchTarget(fam.levels[a6], d6, items) - 0.01) ks.reviewHere = true;
    return;
  }
  const open = idx.filter((i) => playable(fam, c, fam.levels[i], items));
  const played = rungKinds(fam, s0.rung).some((k) => kindPlayed(items, k));
  c.demo = !played;
  const sp = idx.find((i) => inf(fam.levels[i]).kind === 'speed');
  if (!open.length || (sp !== undefined && open[0] > sp)) {
    // U1: the rung is known up to its speed stage — two takes there at 0.9 × the best, then the next open stage (or on)
    const at = sp ?? idx[idx.length - 1];
    const d = stageDrill(fam.levels[at], 0);
    const st = items[d.itemId];
    const best = st?.cleanBpm ? npsOf(st.cleanBpm, notesPerBeat(d)) : 0;
    const g = ks.lastGood[d.itemId];
    c.demo = false;
    enter(fam, c, at, items, 0, g ? { nps: g.nps, per: g.per === 3 ? 2 : g.per } : best ? { nps: best * 0.9 } : undefined);
    ks.free = false;
    ks.warmLeft = WARM_TAKES;
    ks.warmNext = open.length ? open[0] : -1;
    ks.review = !!g;
    ks.reviewHere = !!g;
    return;
  }
  const pr = idx.find((i) => !!inf(fam.levels[i]).probe);
  // §4.2: the probe once per kind on a fresh rung; after a missed scale probe the next rung starts at its first stage (S8)
  // owner 2026-11-26: a rung whose probe stage passed in another key opens with the same check at the comfort tempo (a new
  // key is not a new start: right hand, left hand, … again every day was the complaint)
  const fresh = idx.every((i) => !passedNow(c, fam.levels[i], items));
  const transfer = pr !== undefined && played && fresh && passedElsewhere(fam.levels[pr], items);
  if (pr !== undefined && fresh && ((!played && !(ks.probeFailed && s0.what !== 'scale')) || transfer)) {
    ks.probe = true;
    c.demo = false;
    enter(fam, c, pr, items, 0, transfer ? undefined : { nps: inf(fam.levels[pr]).probe!.nps });
    return;
  }
  // a speed stage reopened in this session resumes at its last clean pulse (never a second climb from scratch)
  const g = inf(fam.levels[open[0]]).kind === 'speed' ? ks.lastGood[stageDrill(fam.levels[open[0]], 0).itemId] : undefined;
  enter(fam, c, open[0], items, 0, g ? { nps: g.nps, per: g.per === 3 ? 2 : g.per } : undefined);
  if (g) ks.free = false;
}

/**
 * The next visit (§5, B1, S10): the planned ones in order (the scale, the harmonised rung — not before the scale passed A-3
 * — the rotating block); then, while time remains before the closing, the open stages of rungs already visited, then the
 * next rungs in the ladder (the next harmonised rung, then more rungs without stages), then any visited rung again; the
 * closing when nothing else fits; -1 = nothing left at all (the session ends early).
 */
function nextVisit(fam: FamilyDef, c: CoachState, items: Record<string, ItemState>, cur: number, now: number): number {
  const ks = c.ks!;
  const closingV = closingVisitOf(fam);
  const left = minutesOf(c) * 60_000 - (now - c.startedAt) - closingMs(c);
  if (left < 90_000) return closingV;
  const gated = harmGated(fam, c, items);
  const all = [...Array(visits(fam)).keys()].filter((v) => v !== closingV && !(gated && isHarm(fam, v)));
  const staged = (v: number) => inf(fam.levels[visitSteps(fam, v)[0]]).code !== 'run';
  const openIn = (v: number) => visitSteps(fam, v).some((i) => playable(fam, c, fam.levels[i], items));
  const unvisited = all.filter((v) => !ks.visited.includes(v));
  // the scale's open stages are the closing's (it returns there) — never reopened before it
  const reopen = (max: number) => ks.visited.filter((v) => v !== 0 && v !== cur && v !== closingV && all.includes(v) && !ks.finished.includes(v) && (ks.revisits[v] ?? 0) < max && (staged(v) ? openIn(v) : true));
  const PLANNED = 2;
  let v: number | undefined;
  if (cur < PLANNED) v = unvisited.find((x) => x > cur);
  if (v === undefined) v = reopen(1).find((x) => staged(x));
  if (v === undefined) v = unvisited[0];
  if (v === undefined) v = reopen(3)[0];
  if (v === undefined) return closingV;
  if (ks.visited.includes(v)) ks.revisits[v] = (ks.revisits[v] ?? 0) + 1;
  return v;
}

/** The coach's start over a staged ladder: the scale's visit (§5), the session's minutes (the caller's, else 30). */
export function ksStart(fam: FamilyDef, items: Record<string, ItemState>, now: number, bg: CoachBackground = {}): CoachState {
  const c: CoachState = {
    family: fam.id,
    steps: fam.levels.map((l) => l.id),
    step: 0,
    keys: [0],
    keyIdx: 0,
    spec: 0,
    passed: [],
    passedNow: 0,
    misses: 0,
    slower: 0,
    weak: [],
    side: null,
    demo: false,
    takes: 0,
    clean: 0,
    promoted: 0,
    sinceReview: 0,
    startedAt: now,
    skilled: !!bg.skilled,
    up: 0,
    run: 0,
    almost: 0,
    easy: 0,
    carry: 0,
    probe: null,
    minutes: bg.minutes && bg.minutes > 0 ? bg.minutes : KS_MINUTES,
    ks: {
      comfort: {},
      scaleComfort: 0,
      rungMin: {},
      nps: 1,
      per: 1,
      bpm: 60,
      lastBy: {},
      eighths: [],
      tripSaid: [],
      limitSaid: [],
      free: false,
      probe: false,
      probeRH: false,
      probeFailed: false,
      clean: 0,
      easy: 0,
      bad: 0,
      almost: 0,
      stepTakes: 0,
      stepped: false,
      floor: 0,
      sep: [],
      floorHelp: false,
      freeMiss: 0,
      good: null,
      start: 0,
      back: false,
      target: 0,
      prior: 0,
      best: 0,
      bestBy: {},
      sessionBest: 0,
      lastGood: {},
      itemPulse: {},
      itemDone: [],
      cleanRungs: [],
      passed: [],
      known: fam.levels.filter((l) => !l.stage?.closing && stagePassed(l, items)).map((l) => l.id),
      limited: [],
      visitAt: now,
      visitBudget: 0,
      visitTakes: 0,
      visitPassed: [],
      visitBests: {},
      visited: [],
      finished: [],
      revisits: {},
      warmLeft: 0,
      warmNext: -1,
      closing: false,
      review: false,
      reviewHere: false,
      meet: 0,
      flow: {},
      chal: { seed: now, lastAt: -CHAL_GAP, eligible: 0, had: 0, fails: {}, tidy: {}, pending: null, ceil: {} },
      bestAt: bestsAt(fam, items),
    },
  };
  openVisit(fam, c, 0, items, now);
  return c;
}

/** The take the coach asks for now: free time, or the pulse at its note value and ♩ (§3). */
export function ksTake(fam: FamilyDef, c: CoachState, _items: Record<string, ItemState>, _order: Order, freeOk: FreeOk = () => true): CoachTake {
  const ks = c.ks!;
  const level = lv(fam, c);
  const s = inf(level);
  const drill = takeDrill(fam, c);
  const base = { drill, level, demo: c.demo && c.spec === 0, kind: 'main' as const, spec: c.spec, stageInfo: s, ...(ks.probe ? { probe: true } : {}), ...(ks.chal?.pending ? { challenge: true } : {}) };
  if (ks.free && freeOk(drill) && hasRubato(drill)) return { ...base, stage: 'free', bpm: drill.startBpm };
  const nps = npsOf(ks.bpm, ks.per);
  return { ...base, stage: null, bpm: Math.max(20, Math.round((nps * 60) / notesPerBeat(drill))), play: { per: ks.per, bpm: ks.bpm }, nps };
}

/**
 * The size of a tempo step on the speed stage (owner 2026-11-25): by how well the clean take was played — no wrong notes,
 * no stops and the timing SD within half the band's limit: +10 % (MAX_JUMP); within 0.8 of it: +6 %; looser: +3 %.
 */
export function climbStep(m: TakeMetrics, drill: Drill): number {
  if (m.verdict !== 'clean') return 1;
  const th = thresholds(bandOfBpm(drill, m.bpm || drill.startBpm));
  const sd = m.timingSD;
  const tidy = (m.wrong ?? 0) === 0 && (m.hesitations ?? 0) === 0;
  if (tidy && sd !== null && sd !== undefined && sd <= 0.5 * th.sd) return MAX_JUMP;
  if (sd !== null && sd !== undefined && sd <= 0.8 * th.sd) return STEP_UP;
  return LOOSE_STEP;
}

/** The speed stage alternates eighths and triplet eighths (owner 2026-11-25): items in eighths, once played in eighths. */
export const canTrip = (d: Drill, s: StageInfo): boolean => s.kind === 'speed' && s.sub && Math.abs(notesPerBeat(d) - 2) < 0.01 && !d.spec.swing;

const NEXT_OF: Record<StageInfo['what'], PhraseId> = { scale: 'nextScale', thirds: 'nextThirds', triads: 'nextTriads', sevenths: 'nextSevenths', other: 'nextOther' };
/** A rung's short name in the session's last line ("Next time: broken thirds, the speed."). */
const SHORT: Record<StageInfo['what'], T2 | null> = {
  scale: null,
  thirds: { en: 'broken thirds', he: 'טרצות שבורות' },
  triads: { en: 'broken triads', he: 'משולשים שבורים' },
  sevenths: { en: 'broken seventh chords', he: 'ספטאקורדים שבורים' },
  other: null,
};
const PRAISE: PhraseId[] = ['clean', 'nice', 'great'];
const PER_PHRASE: Record<number, PhraseId> = { 1: 'quarters', 2: 'eighths', 3: 'triplets', 4: 'sixteenths' };
const HAND_PHRASE: Record<string, PhraseId> = { R: 'right', L: 'left', RL: 'both' };
const HAND_NAME: Record<string, T2> = { R: { en: 'right hand', he: 'יד ימין' }, L: { en: 'left hand', he: 'יד שמאל' }, RL: { en: 'both hands', he: 'שתי ידיים' } };
const OCT_PHRASE: Record<number, PhraseId> = { 1: 'oct1', 2: 'oct2', 3: 'oct3', 4: 'oct4' };
const join = (...ls: (CoachLine | null | undefined)[]): CoachLine => {
  const xs = ls.filter((x): x is CoachLine => !!x && !!(x.en || x.he));
  return { en: xs.map((x) => x.en).join(' '), he: xs.map((x) => x.he).join(' '), say: xs.flatMap((x) => x.say ?? []), sayHe: xs.flatMap((x) => x.sayHe ?? []) };
};

/** What changes from one item of a stage to the next (S7, S11): the hand, the octaves, the motion, double notes / blocks — or the next one. */
function itemSwitch(l: LevelDef, from: number, to: number): PhraseId[] {
  const a = l.specs[from] as { hands?: string; octaves?: number; motion?: string; family?: string; kind?: string };
  const b = l.specs[to] as typeof a;
  const out: PhraseId[] = [];
  if (a.hands !== b.hands && b.hands) out.push(HAND_PHRASE[b.hands]);
  if ((a.octaves ?? 2) !== (b.octaves ?? 2)) out.push(OCT_PHRASE[b.octaves ?? 2] ?? 'nextOne');
  if (a.motion !== b.motion && b.motion === 'contrary') out.push('contrary');
  if (a.kind !== b.kind && b.kind === 'hl-3t') out.push('doubleThirds');
  else if (a.kind !== b.kind && /^hl-(tb|7b)$/.test(b.kind ?? '')) out.push('blockChords');
  if (!out.length) out.push(/cad/.test(b.family ?? '') ? 'nextVoicing' : 'nextOne');
  return out;
}

/** The note value a tempo is shown in (#9): the one it would be played in — eighths above ♩120 quarters, eighths over triplets. */
function unitAt(d: Drill, s: StageInfo, nps: number, eighthsLocked: boolean): number {
  const p = playOf(d, nps, s.sub, eighthsLocked).per;
  return p === 3 ? 2 : p;
}

/** The end of a rung's visit (§6, S2, S3, S10): "C major scale: both hands, two octaves, contrary motion. ♩84 of ♩96
 *  eighths." — each hand's best in its own note value — then, when time stopped it and this session won't come back to it,
 *  the stage it resumes at next time. */
function visitLine(fam: FamilyDef, c: CoachState, done: boolean, now: number): CoachLine {
  const ks = c.ks!;
  const l = lv(fam, c);
  const s = inf(l);
  const names = ks.visitPassed;
  const parts: LinePart[] = [];
  const sep = names.some((x) => x.en.includes(',')) ? '; ' : ', ';
  parts.push(names.length ? { en: `${s.title.en}: ${names.map((x) => x.en).join(sep)}.`, he: `${s.title.he}: ${names.map((x) => x.he).join(sep)}.` } : { en: `${s.title.en}.`, he: `${s.title.he}.` });
  // the best of each hand: one per hand, the faster item of a hand; eighths rather than triplets (#9)
  const byHand = new Map<string, Pulse & { target: number; hands: string; targetPer: number }>();
  for (const b of Object.values(ks.visitBests)) {
    const cur = byHand.get(b.hands);
    if (!cur || b.nps > cur.nps) byHand.set(b.hands, b);
  }
  const bs = [...byHand.values()];
  const txt = (b: Pulse & { target: number; targetPer: number }, lang: 'en' | 'he') => {
    const per = b.per === 3 ? 2 : b.per;
    const bb = b.per === 3 ? snapNear(b.nps * 30) : b.bpm;
    const t = snapDown((b.target * 60) / b.targetPer + 0.5);
    const best = per === b.targetPer ? tempoText(bb, undefined, lang) : tempoText(bb, per, lang);
    return lang === 'en' ? `${best} of ${tempoText(t, b.targetPer, 'en')}` : `${best} מתוך ${tempoText(t, b.targetPer, 'he')}`;
  };
  if (bs.length === 1) parts.push({ en: `${txt(bs[0], 'en')}.`, he: `${txt(bs[0], 'he')}.` });
  else if (bs.length > 1) parts.push({ en: `${bs.map((b) => `${HAND_NAME[b.hands]?.en ?? ''} ${txt(b, 'en')}`.trim()).join('; ').replace(/^./, (x) => x.toUpperCase())}.`, he: `${bs.map((b) => `${HAND_NAME[b.hands]?.he ?? ''} ${txt(b, 'he')}`.trim()).join('; ')}.` });
  const out = line(...parts);
  if (done || s.closing || ks.limited.includes(baseId(l))) return out;
  // S2: no "Next time" for a stage this session comes back to (the closing returns to the scale; spare time reopens rungs)
  if (s.rung === 'scale' && closingVisitOf(fam) >= 0) return out;
  // nextVisit reopens a staged rung with open stages once, and planned visits may finish early: any spare time can bring it
  // back, so "Next time" only when none is left
  const left = minutesOf(c) * 60_000 - (now - c.startedAt) - closingMs(c);
  if (s.code === 'run' || ((ks.revisits[s.visit] ?? 0) < 1 && left > 90_000)) return out;
  const pick = line('pickUp');
  const said: PhraseId[] = s.kind === 'speed' ? ['theSpeed'] : s.say;
  return join(out, { en: `${pick.en} ${s.long.en}.`, he: `${pick.he} ${s.long.he}.`, say: [...(pick.say ?? []), ...said.map((p) => PHRASES[p].en)], sayHe: [...(pick.sayHe ?? []), ...said.map((p) => PHRASES[p].he)] });
}

/** After a take: the next stage, tempo or visit, and the line (SPEC-KEY-SESSION-2 §3, §5, §6, §10). */
export function ksAfter(fam: FamilyDef, c0: CoachState, take: CoachTake, m: TakeMetrics, items0: Record<string, ItemState>, order: Order, now: number, freeOk: FreeOk = () => true): CoachNext {
  const verdict = m.verdict === 'clean' ? 'clean' : m.verdict === 'almost' ? 'almost' : 'miss';
  const clean = verdict === 'clean';
  const ks0 = c0.ks!;
  const ks: KsState = { ...ks0, comfort: { ...ks0.comfort }, rungMin: { ...ks0.rungMin }, lastBy: { ...ks0.lastBy }, bestBy: { ...ks0.bestBy }, lastGood: { ...ks0.lastGood }, itemPulse: { ...ks0.itemPulse }, itemDone: [...ks0.itemDone], eighths: [...ks0.eighths], tripSaid: [...ks0.tripSaid], limitSaid: [...ks0.limitSaid], cleanRungs: [...ks0.cleanRungs], passed: [...ks0.passed], limited: [...ks0.limited], visitPassed: [...ks0.visitPassed], visitBests: { ...ks0.visitBests }, visited: [...ks0.visited], finished: [...ks0.finished], revisits: { ...ks0.revisits }, sep: [...ks0.sep], ...(ks0.dayStart ? { dayStart: { ...ks0.dayStart } } : {}), ...(ks0.chal ? { chal: { ...ks0.chal, fails: { ...ks0.chal.fails }, tidy: { ...ks0.chal.tidy }, ceil: { ...ks0.chal.ceil } } } : {}) };
  const c: CoachState = { ...c0, ks, takes: c0.takes + 1, clean: c0.clean + (clean ? 1 : 0), demo: false };
  const items: Record<string, ItemState> = { ...items0 };
  const marks: ItemState[] = [];
  const saveMark = (st: ItemState) => {
    items[st.itemId] = st;
    const k = marks.findIndex((x) => x.itemId === st.itemId);
    if (k >= 0) marks[k] = st;
    else marks.push(st);
  };
  const level = lv(fam, c);
  const s = inf(level);
  const d = take.drill;
  const easy = clean && take.stage === null && easyTake(m, d);
  const rotating = s.code === 'run' && level.specs.length > 1;
  const sepTake = ks.sep.length > 0;
  ks.visitTakes++;
  let ceiling: CoachNext['ceiling'];
  // the line: the verdict, then what comes next — a directive, or the next stage's phrases; the tempo once, at the end
  const head: PhraseId = clean ? PRAISE[c.takes % PRAISE.length] : verdict === 'almost' ? 'almost' : 'notYet';
  let dir: LinePart[] = [];
  let tempo = false;
  let leave: 'done' | 'budget' | null = null;
  let headX: PhraseId | null = null;
  let limitLine: CoachLine | null = null;
  let extra: PhraseId | null = null;
  let newStage = false;

  const enterAnnounce = (step: number, spec = 0, at?: { nps: number; per?: number }, say?: PhraseId[]) => {
    enter(fam, c, step, items, spec, at);
    dir = [...(say ?? inf(lv(fam, c)).say)];
    tempo = true;
    if (fam.levels[step] !== take.level) newStage = true;
  };
  const nextStage = (): void => {
    if (s.closing) {
      leave = 'done';
      return;
    }
    const idx = visitSteps(fam, s.visit).filter((i) => i > c.step && playable(fam, c, fam.levels[i], items));
    if (!idx.length) {
      leave = 'done';
      return;
    }
    enterAnnounce(idx[0]);
  };
  const specPassed = (): void => {
    // the stage item passed: its code on the item (per key); the next item of the stage, or the stage is passed
    if (s.code !== 'run') saveMark(withStage(items[d.itemId] ?? newItem(d), s.code));
    if (c.spec + 1 < level.specs.length) {
      const from = c.spec;
      enterAnnounce(c.step, c.spec + 1, undefined, itemSwitch(level, from, c.spec + 1));
      return;
    }
    if (s.code !== 'run' && !ks.passed.includes(baseId(level))) ks.passed.push(baseId(level));
    ks.visitPassed.push(s.long);
    nextStage();
  };
  /** Today's limit on this stage (§3.8, #3): the stage stays open (it resumes next session); the visit moves on. */
  const limit = (bpm: number | null) => {
    if (bpm !== null) ceiling = { itemId: d.itemId, bpm };
    if (!ks.finished.includes(s.visit) && (s.kind === 'coord' || rotating || bpm === null)) ks.finished.push(s.visit);
    // said once per rung and visit (a rotating rung's other items move on quietly)
    if (!ks.limitSaid.includes(s.rung) && bpm !== null) limitLine = line('limit');
    ks.limitSaid.push(s.rung);
    if (!ks.limited.includes(baseId(level))) ks.limited.push(baseId(level));
    // a free-time give-up leaves the whole rung for today; a tempo limit leaves only this item of a rotating rung
    if (rotating && bpm !== null) {
      ks.itemDone.push(d.itemId);
      const rest = level.specs.map((_, k) => k).filter((k) => !ks.itemDone.includes(stageDrill(level, k).itemId));
      if (rest.length) {
        const from = c.spec;
        switchSpec(fam, c, rest[0], items);
        dir = itemSwitch(level, from, c.spec);
        tempo = true;
        ks.limited = ks.limited.filter((x) => x !== baseId(level));
        return;
      }
    }
    if (bpm === null && s.code === 'run') leave = 'done';
    else if (s.kind === 'speed' && c.spec + 1 < level.specs.length && !rotating) {
      ks.limited = ks.limited.filter((x) => x !== baseId(level));
      enterAnnounce(c.step, c.spec + 1, undefined, itemSwitch(level, c.spec, c.spec + 1));
    } else if (s.kind === 'speed') nextStage();
    else leave = 'budget';
  };
  /** A step back (10 % or one mark); at the lowest tempo there is none (#5): the floor's help instead. */
  const stepBack = (to: number, per: number): boolean => {
    const was = ks.bpm;
    setPulse(fam, c, to, per);
    if (ks.bpm < was) {
      ks.stepped = true;
      dir = ['slower'];
      tempo = true;
      return true;
    }
    return false;
  };
  /** At the lowest tempo (#5): after FLOOR_MISSES misses, both hands play hands separately once (then together again), other
   *  items one take in free time; failing after that, the coach lets it be for today. */
  const floorMiss = (): boolean => {
    if (ks.bpm > MIN_BPM) return false;
    ks.floor++;
    if (ks.floor < FLOOR_MISSES) {
      dir = [ks.floor % 2 ? 'noRush' : 'again'];
      return true;
    }
    if (!ks.floorHelp) {
      ks.floorHelp = true;
      ks.floor = FLOOR_MISSES - 2;
      if (d.spec.hands === 'RL' && (d.spec.instrument ?? 'piano') === 'piano') {
        ks.sep = ['R', 'L'];
        dir = ['handsSep', 'right'];
      } else {
        ks.free = true;
        dir = ['free'];
      }
      return true;
    }
    extra = 'leaveIt';
    limit(ks.bpm);
    return true;
  };

  if (sepTake) {
    // hands separately at the lowest tempo: right, then left, then together again
    ks.sep.shift();
    dir = ks.sep.length ? ['left'] : ['both'];
    tempo = true;
  } else if (take.stage === 'free') {
    if (clean) {
      ks.free = false;
      ks.freeMiss = 0;
      dir = ['pulse'];
      tempo = true;
    } else if (++ks.freeMiss >= 3) {
      // three free-time misses in a row: let it be for today (the stage at its limit, not reopened today)
      extra = 'leaveIt';
      ks.free = false;
      limit(null);
    } else dir = ['noRush', 'free'];
  } else if (ks.probe) {
    // §4.2 (U2, S1): clean and easy skips to the stage after the probe; clean skips the stages before it and stays at the
    // probe's tempo; a miss: the right hand alone once (a strong right hand isn't held at ♩60), then the first stage at
    // min(1.0, 0.9 × the scale's comfort, 0.9 × the probe) (#2), in free time; the next rung is not probed (S8)
    ks.probe = false;
    ks.lastBy[capKeyOf(d, s)] = take.nps ?? 0;
    const probeNps = take.nps ?? 1;
    if (ks.probeRH) {
      ks.probeRH = false;
      if (clean) {
        ks.cleanRungs.push(s.rung);
        setComfort(c, s.rung, comfortKey(d), probeNps);
        ks.lastGood[d.itemId] = { nps: probeNps, per: take.play?.per ?? ks.per, bpm: take.play?.bpm ?? ks.bpm };
        for (const st of markStage(level, items)) saveMark(st);
        if (!ks.passed.includes(baseId(level))) ks.passed.push(baseId(level));
        nextStage();
      } else {
        setComfort(c, s.rung, comfortKey(d), Math.min(FRESH_NPS, 0.9 * probeNps), true);
        enterAnnounce(c.step);
      }
    } else {
      const pr = s.probe!;
      if (clean) {
        ks.cleanRungs.push(s.rung);
        setComfort(c, s.rung, comfortKey(d), probeNps);
        if (s.what === 'scale') ks.scaleComfort = probeNps;
        ks.sessionBest = Math.max(ks.sessionBest, probeNps);
        ks.lastGood[d.itemId] = { nps: probeNps, per: take.play?.per ?? ks.per, bpm: take.play?.bpm ?? ks.bpm };
        if ((take.play?.per ?? 1) >= 2 && s.sub && !ks.eighths.includes(comfortKey(d))) ks.eighths.push(comfortKey(d));
        // owner 2026-11-26: one clean take passes the probe's own stage too (no "again" at the same tempo)
        const codes = new Set([...(easy ? pr.easy : pr.clean), s.code]);
        for (const i of visitSteps(fam, s.visit)) {
          const x = fam.levels[i];
          if (!codes.has(inf(x).code)) continue;
          for (const st of markStage(x, items)) saveMark(st);
          if (!ks.passed.includes(baseId(x))) ks.passed.push(baseId(x));
        }
        ks.flow = { ...(ks.flow ?? {}), [s.rung]: markUp(probeNps, take.play?.per ?? ks.per) };
        if (easy) {
          headX = 'easy';
          dir = ['known'];
        }
        nextStage();
      } else {
        if (s.what === 'scale') ks.probeFailed = true;
        const firstIdx = visitSteps(fam, s.visit)[0];
        const first = fam.levels[firstIdx];
        const fd = stageDrill(first, 0);
        const start = Math.min(FRESH_NPS, ks.scaleComfort > 0 && s.what !== 'scale' ? 0.9 * ks.scaleComfort : Infinity, 0.9 * probeNps);
        setComfort(c, s.rung, comfortKey(fd), start, true);
        if (s.what === 'scale' && (fd.spec.hands === 'R') && (fd.spec.instrument ?? 'piano') === 'piano') {
          // the right hand alone once, at the probe's tempo
          enter(fam, c, firstIdx, items, 0, { nps: probeNps });
          ks.probe = true;
          ks.probeRH = true;
          ks.free = false;
          dir = [...inf(first).say];
          tempo = true;
          newStage = true;
        } else enterAnnounce(firstIdx);
      }
    }
  } else {
    // a take at a pulse
    const ck = capKeyOf(d, s);
    ks.lastBy[ck] = take.nps ?? 0;
    ks.stepTakes++;
    const per = take.play?.per ?? ks.per;
    if (per >= 2 && s.sub && !ks.eighths.includes(comfortKey(d))) ks.eighths.push(comfortKey(d));
    const at = take.nps ?? 0;
    const here: Pulse = { nps: at, per, bpm: take.play?.bpm ?? take.bpm };
    const q = stepQuality(m, d);
    const ckey = comfortKey(d);
    ks.dayStart = { ...(ks.dayStart ?? {}) };
    if (ks.dayStart[s.rung] === undefined) ks.dayStart[s.rung] = at;
    const chal = (ks.chal ??= { seed: c.startedAt, lastAt: -CHAL_GAP, eligible: 0, had: 0, fails: {}, tidy: {}, pending: null, ceil: {} });
    const pend = chal.pending;
    chal.pending = null;
    chal.tidy[s.rung] = clean && q >= 0.6 ? (chal.tidy[s.rung] ?? 0) + 1 : 0;
    /** SPEC-CLIMB-SYNC §1: the graded next pulse after a clean take at `at`. */
    const upFrom = (x: number, p: number) => gradedUp(x, p, q, { best: ks.bestAt?.[ckey], ceil: ceilOf(c, d, items, now), start: ks.dayStart![s.rung] });
    // §2.4 (review 1): any clean take at or above a ceiling clears it (the session's and the item's)
    if (clean) {
      if ((chal.ceil[ckey] ?? Infinity) <= at + 1e-6) delete chal.ceil[ckey];
      const it0 = items[d.itemId];
      if (it0?.ceil && it0.ceil.nps <= at + 1e-6) {
        const { ceil: _gone, ...rest } = it0;
        saveMark(rest as ItemState);
      }
    }
    pulse: {
    if (pend) {
      chal.lastAt = c.takes;
      if (clean) {
        // §2.4: clean — this is the level now; a ceiling at or under it goes
        headX = 'newLevel';
      } else {
        // §2.4: missed — back to the pulse before it, nothing counted; the ceiling is noted (session and item)
        chal.fails[ckey] = (chal.fails[ckey] ?? 0) + 1;
        chal.ceil[ckey] = Math.min(chal.ceil[ckey] ?? Infinity, at);
        const it = items[d.itemId] ?? newItem(d);
        const npb = notesPerBeat(d);
        // a ceiling the clean tempo already passed is replaced (review 1)
        const passed = !!it.ceil && (it.cleanBpm * npb) / 60 >= it.ceil.nps - 1e-6;
        // a miss under the item's own best is today's ceiling only (review 3): the item keeps ceilings above its best
        const underBest = (it.cleanBpm * npb) / 60 >= 0.98 * at;
        if (!underBest && (!it.ceil || passed || at < it.ceil.nps || now - Date.parse(it.ceil.at) > CEIL_MS)) saveMark({ ...it, ceil: { nps: Math.round(at * 100) / 100, at: new Date(now).toISOString(), npb } });
        ks.lastBy[ck] = pend.nps;
        ks.stepTakes = Math.max(0, ks.stepTakes - 1);
        setPulse(fam, c, pend.nps, pend.per === 3 ? 2 : pend.per, true);
        dir = ['backTo'];
        tempo = true;
        break pulse;
      }
    }
    if (clean) {
      if (!ks.cleanRungs.includes(s.rung)) ks.cleanRungs.push(s.rung);
      if (s.code !== 'run') ks.flow = { ...(ks.flow ?? {}), [s.rung]: Math.max(ks.flow?.[s.rung] ?? 0, upFrom(at, per)) };
      ks.bestBy[d.itemId] = Math.max(ks.bestBy[d.itemId] ?? 0, at);
      ks.sessionBest = Math.max(ks.sessionBest, at);
      ks.lastGood[d.itemId] = here;
    }
    if (ks.warmLeft > 0) {
      // a known rung's warm-up, a review: two takes, then the next open stage (or on)
      ks.warmLeft--;
      if (clean) ks.best = Math.max(ks.best, at);
      if (ks.warmLeft === 0) {
        if (ks.warmNext >= 0) enterAnnounce(ks.warmNext);
        else leave = 'done';
      } else if (clean && !ks.limited.includes(baseId(level))) {
        // owner 2026-11-26: a clean review take is followed by one a mark faster, not the same take again
        setPulse(fam, c, upFrom(at, per), per);
        dir = ['faster'];
        tempo = true;
      } else dir = clean ? ['again'] : ['noRush'];
    } else if (s.kind === 'coord') {
      // §3.6: coordination and range at the comfort tempo — two clean takes, or one easy one; no climbing. "Almost" holds
      // (three in a row: one mark back); two misses: 10 % slower; failing again after a step back = today's limit (#3)
      if (clean) {
        ks.clean++;
        ks.almost = 0;
        if (easy) ks.easy++;
        ks.bad = 0;
        // owner 2026-11-26: one clean take passes (two at the same tempo was the same exercise twice)
        specPassed();
      } else if (ks.stepped || ks.stepTakes >= STEP_TAKES) {
        if (!floorMiss()) limit(here.bpm);
      } else if (verdict === 'almost') {
        ks.almost++;
        if (ks.almost >= ALMOSTS_BACK && stepBack(npsOf(gridBelow(ks.bpm), ks.per), ks.per)) setComfort(c, s.rung, comfortKey(d), ks.nps, true);
        else if (!(ks.bpm <= MIN_BPM && floorMiss())) dir = ['again'];
      } else {
        ks.bad++;
        ks.almost = 0;
        if (ks.bad >= 2) {
          ks.bad = 0;
          if (stepBack(Math.max(0.5, ks.nps * 0.9), ks.per)) setComfort(c, s.rung, comfortKey(d), ks.nps, true);
          else if (!floorMiss()) dir = ['noRush'];
        } else if (!(ks.bpm <= MIN_BPM && floorMiss())) dir = ['again'];
      }
    } else {
      // §3.7–§3.8: the speed stage climbs to its target by the graded step (U3); "almost" holds; two misses at a new step go
      // back to the last clean pulse and a clean take there is the limit; missing the start lowers it 10 % (U4); failing
      // again after a step back is the limit (#3)
      const tp = unitAt(d, s, ks.target, ks.eighths.includes(comfortKey(d)));
      const targetBpm = snapDown((ks.target * 60) / per + 0.5);
      if (clean) {
        ks.bad = 0;
        ks.almost = 0;
        ks.good = here;
        ks.best = Math.max(ks.best, at);
        const vb = ks.visitBests[d.itemId];
        if (!vb || at > vb.nps) ks.visitBests[d.itemId] = { ...here, target: ks.target, hands: d.spec.hands, targetPer: tp };
        if (!ks.start) ks.start = at;
        if (ks.back) {
          ks.back = false;
          limit(take.bpm);
        } else if (rotating && ks.meet < level.specs.length - 1) {
          // meet every item once at its own comfort before the climb
          const from = c.spec;
          ks.meet++;
          ks.itemPulse[d.itemId] = here;
          switchSpec(fam, c, (c.spec + 1) % level.specs.length, items);
          dir = itemSwitch(level, from, c.spec);
          tempo = true;
        } else if (rotating && (here.bpm >= targetBpm || at >= ks.target - 1e-6)) {
          ks.itemDone.push(d.itemId);
          const rest = level.specs.map((_, k) => k).filter((k) => !ks.itemDone.includes(stageDrill(level, k).itemId));
          if (!rest.length) {
            dir = ['target'];
            ks.visitPassed.push(s.long);
            nextStage();
          } else {
            const from = c.spec;
            switchSpec(fam, c, rest.find((k) => k > c.spec) ?? rest[0], items);
            dir = ['target', ...itemSwitch(level, from, c.spec)];
            tempo = true;
          }
        } else if (here.bpm >= targetBpm || at >= ks.target - 1e-6) {
          dir = ['target'];
          specPassed();
          if (!leave && dir[0] !== 'target') dir = ['target', ...dir];
        } else {
          // SPEC-CLIMB-SYNC §1: the graded step, slower once today climbed 25 % and near a known ceiling
          let q0 = climbStep(m, d);
          const st0 = ks.dayStart?.[s.rung];
          if (st0 && at >= st0 * 1.25) q0 = 1 + (q0 - 1) * 0.6;
          const cl = ceilOf(c, d, items, now);
          if (cl && Math.abs(at * q0 - cl) / cl <= 0.1) q0 = 1 + (q0 - 1) * 0.5;
          const q = q0;
          // U7, B2: triplets only after an eighths take and at ♩40 or more
          let nextPer = canTrip(d, s) && (per === 2 || per === 3) ? (per === 2 ? 3 : 2) : playOf(d, at * q, s.sub, ks.eighths.includes(comfortKey(d))).per;
          if (nextPer === 3 && (at * q * 60) / 3 < MIN_BPM - 0.5) nextPer = 2;
          const nps = speedStep(at, q, { per: nextPer, target: ks.target, best: ks.prior });
          const from = c.spec;
          if (rotating) {
            // #6: this item's own tempo rises one step; the next item plays at its own
            setPulse(fam, c, nps, nextPer);
            ks.itemPulse[d.itemId] = { nps: ks.nps, per: ks.per, bpm: ks.bpm };
            const rest = level.specs.map((_, k) => k).filter((k) => !ks.itemDone.includes(stageDrill(level, k).itemId));
            const nk = rest.find((k) => k > c.spec) ?? rest[0];
            if (nk !== c.spec) switchSpec(fam, c, nk, items);
            // the raise is this item's (heard next round); the next item plays at its own tempo
            dir = c.spec !== from ? itemSwitch(level, from, c.spec) : ['faster'];
          } else {
            setPulse(fam, c, nps, nextPer);
            if (ks.nps <= at + 1e-9 && ks.per === per) dir = ['hold'];
            else {
              const perPhrase: PhraseId[] = [];
              if (ks.per !== per) {
                if (ks.per === 3) {
                  perPhrase.push(ks.tripSaid.includes(s.rung) ? 'tripletsAgain' : 'triplets');
                  if (!ks.tripSaid.includes(s.rung)) ks.tripSaid.push(s.rung);
                } else perPhrase.push(PER_PHRASE[ks.per]);
              }
              dir = ['faster', ...perPhrase];
            }
          }
          tempo = true;
        }
      } else if ((ks.stepped && !ks.back) || ks.stepTakes >= STEP_TAKES) {
        // a step back that fails again, or too many takes on one step: today's limit, at this tempo (#3)
        if (!floorMiss()) limit(ks.good?.bpm ?? take.bpm);
      } else if (verdict === 'almost') {
        ks.almost++;
        if (ks.almost >= ALMOSTS_BACK) {
          if (!stepBack(npsOf(gridBelow(ks.bpm), ks.per), ks.per) && !floorMiss()) dir = ['hold'];
        } else dir = ['hold'];
      } else {
        ks.bad++;
        ks.almost = 0;
        const g = ks.good;
        if (ks.back && g) {
          // not clean at the last clean pulse either: 10 % below it, and the start lowers with it
          ks.back = false;
          ks.good = null;
          ks.bad = 0;
          if (stepBack(g.nps * 0.9, g.per === 3 ? 2 : g.per)) ks.start = Math.min(ks.start || ks.nps, ks.nps);
          else if (!floorMiss()) dir = ['noRush'];
        } else if (g && at > g.nps + 1e-6) {
          if (ks.bad >= 2) {
            ks.back = true;
            ks.bad = 0;
            ks.per = g.per === 3 ? 2 : g.per;
            ks.bpm = g.per === 3 ? snapNear(g.nps * 30) : g.bpm;
            ks.nps = npsOf(ks.bpm, ks.per);
            ks.stepTakes = 0;
            dir = ['backTempo'];
            tempo = true;
          } else dir = ['again'];
        } else if (ks.bad >= 2) {
          ks.bad = 0;
          if (stepBack(at * 0.9, per === 3 ? 2 : per)) ks.start = ks.nps;
          else if (!floorMiss()) dir = ['noRush'];
        } else if (!(ks.bpm <= MIN_BPM && floorMiss())) dir = ['again'];
      }
    }
    }
  }

  /** SPEC-CLIMB-SYNC §2: after a tidy clean take, now and then (⅓, the 4th eligible one for sure) the next take is a
   *  challenge well above the climb — never on a new stage, the probe, free time, hands apart, a review or the closing. */
  function maybeChallenge(): void {
    const ch = ks.chal;
    if (!ch || take.stage !== null || !clean || ks.probe || ks.free || ks.sep.length || ks.warmLeft > 0 || ks.review || ks.closing || newStage) return;
    const l = lv(fam, c);
    const s1 = inf(l);
    if (s1.code === 'run' || l !== take.level || c.spec !== take.spec || take.probe || ch.pending) return;
    const d1 = stageDrill(l, c.spec);
    const k1 = comfortKey(d1);
    if ((ch.tidy[s1.rung] ?? 0) < 2 || c.takes - ch.lastAt < CHAL_GAP || (ch.fails[k1] ?? 0) >= CHAL_FAILS) return;
    ch.eligible++;
    const go = chalDraw(ch.seed, c.takes) < CHAL_P || (ch.had === 0 && ch.eligible >= CHAL_SURE);
    if (!go) return;
    const at = take.nps ?? ks.nps;
    const per0 = take.play?.per ?? ks.per;
    const from: Pulse = { nps: ks.nps, per: ks.per, bpm: ks.bpm };
    setPulse(fam, c, chalTarget(at, ceilOf(c, d1, items, now)), undefined, true);
    // at least two marks above the take just played
    const two = markUp(markUp(at, per0), per0);
    if (ks.nps < two - 1e-6) setPulse(fam, c, two, per0, true);
    ch.pending = from;
    ch.had++;
    ch.lastAt = c.takes;
    dir = ['challenge'];
    tempo = true;
  }

  const elapsed = now - c.startedAt;
  const total = minutesOf(c) * 60_000;
  const closingV = closingVisitOf(fam);
  const stopped = lv(fam, c);
  // §5: the visit's budget ran out — it stops at this stage and resumes there; a new stage that can't get two takes in the
  // time left isn't opened (S2). S10: the scale's budget stretches to half the session while A-3 is open.
  if (!leave && !ks.closing && now - ks.visitAt >= ks.visitBudget) {
    const a3 = scaleLevel(fam, 'A-3');
    const half = c.startedAt + total / 2;
    if (inf(stopped).rung === 'scale' && a3 && !passedNow(c, a3, items) && !ks.limited.includes(baseId(a3)) && now < half - 60_000) ks.visitBudget = half - ks.visitAt;
    else leave = 'budget';
  }
  if (!leave && !ks.closing && newStage && now + 2 * takeMs(fam, c) > ks.visitAt + ks.visitBudget) leave = 'budget';
  if ((leave === 'done' || ks.limited.includes(baseId(level))) && s.code === 'run' && !ks.finished.includes(s.visit)) ks.finished.push(s.visit);
  const closingDue = closingV >= 0 && !ks.closing && total - elapsed <= closingMs(c);
  const timeUp = elapsed >= total;
  const verdictLine = line(headX ?? head);
  const lim = limitLine ? join(limitLine, extra ? line(extra) : null) : extra ? line(extra) : null;
  // B3: leaving a rung never says "faster" / "again" first — only the verdict, the limit, the target
  const keptDir = dir.filter((p) => p === 'target' || p === 'known');

  // the closing ends the session (B1): its stage passed, at today's limit, its review done, or the time is up
  if (timeUp || (ks.closing && leave)) {
    const fin = ks.closing ? null : visitLine(fam, c, leave === 'done', now);
    return { state: c, line: ksSummary(fam, c, join(verdictLine, lim, line(...keptDir), fin)), end: true, items: marks, ...(ceiling ? { ceiling } : {}) };
  }
  if (leave || closingDue) {
    const fin = visitLine(fam, c, leave === 'done', now);
    const cur = inf(stopped).visit;
    const nv = closingDue ? closingV : nextVisit(fam, c, items, cur, now);
    if (nv < 0) return { state: c, line: ksSummary(fam, c, join(verdictLine, lim, line(...keptDir), fin)), end: true, items: marks, ...(ceiling ? { ceiling } : {}) };
    const again = ks.visited.includes(nv);
    openVisit(fam, c, nv, items, now);
    const ns = inf(lv(fam, c));
    const t = ksTake(fam, c, items, order, freeOk);
    const intro = line(ks.closing ? 'backScale' : again ? 'resume' : NEXT_OF[ns.what], t.probe ? 'check' : null, ks.review ? (ks.reviewHere ? 'reviewHere' : 'review') : ks.warmLeft > 0 ? 'warm' : null, ...ns.say, t.stage === 'free' ? 'free' : { bpm: t.play?.bpm ?? t.bpm, per: t.play?.per });
    return { state: c, line: join(verdictLine, lim, line(...keptDir), fin, intro), end: false, items: marks, ...(ceiling ? { ceiling } : {}) };
  }
  maybeChallenge();
  const t = ksTake(fam, c, items, order, freeOk);
  const tail: LinePart[] = [...dir];
  if (t.stage === 'free' && take.stage !== 'free' && !tail.includes('free')) tail.push('free');
  // the tempo once, with its note value — unless "Now in eighths." / "Triplets." just said it
  else if (t.stage === null && (tempo || (t.play && take.play && t.play.bpm !== take.play.bpm)))
    tail.push({ bpm: t.play?.bpm ?? t.bpm, per: tail.some((p) => typeof p === 'string' && ([...Object.values(PER_PHRASE), 'tripletsAgain'] as string[]).includes(p)) ? undefined : t.play?.per });
  return { state: c, line: join(verdictLine, lim, line(...tail)), end: false, items: marks, ...(ceiling ? { ceiling } : {}) };
}

/** The strip above the music (§6): the rung's stages — passed, now, to come — and the speed stage's tempo bar, every tempo
 *  in the note value it is played in (U9, #9). */
export interface StageView {
  stages: { code: string; name: T2; state: 'done' | 'now' | 'todo' }[];
  tempo: { now: number; target: number; best: number; nowNps: number; targetNps: number; bestNps: number; startNps: number; per: number; targetPer: number } | null;
  title: T2;
  closing: boolean;
  /** SPEC-CLIMB-SYNC §2.4: the take is a challenge (the tempo bar says so). */
  challenge?: boolean;
}

export function stageView(fam: FamilyDef, c: CoachState, items: Record<string, ItemState>, take?: CoachTake | null): StageView | null {
  if (!c.ks) return null;
  const l = lv(fam, c);
  const s = inf(l);
  // the closing visit shows the scale's own stages
  const v = s.closing ? (fam.levels.find((x) => x.stage?.rung === s.rung && !x.stage.closing)?.stage!.visit ?? s.visit) : s.visit;
  const idx = visitSteps(fam, v);
  const stages = idx.map((i) => {
    const x = fam.levels[i];
    const now = baseId(x) === baseId(l);
    return { code: x.stage!.code, name: x.stage!.name, state: (now ? 'now' : passedNow(c, x, items) ? 'done' : 'todo') as 'done' | 'now' | 'todo' };
  });
  let tempo: StageView['tempo'] = null;
  if (s.kind === 'speed' && take?.play && take.nps) {
    const per = take.play.per;
    const d = stageDrill(l, c.spec);
    const tn = c.ks.target || targetNps(l, d);
    const tp = unitAt(d, s, tn, c.ks.eighths.includes(comfortKey(d)));
    const best = c.ks.bestBy[take.drill.itemId] ?? 0;
    tempo = { now: take.play.bpm, target: snapDown((tn * 60) / tp + 0.5), best: best > 0 ? Math.max(MIN_BPM, snapNear((best * 60) / per)) : 0, nowNps: take.nps, targetNps: tn, bestNps: best, startNps: c.ks.start || take.nps, per, targetPer: tp };
  }
  return { stages, tempo, title: s.title, closing: !!s.closing, challenge: !!take?.challenge };
}

/** The session's closing line over a staged ladder (S2, S11, #10): once, always naming the next stage of the key — the scale's
 *  first open stage, else a harmonised rung's, else the next rung's speed ("Next time: broken thirds, the speed."). */
export function ksSummary(fam: FamilyDef, c: CoachState, last: T2 & Partial<CoachLine>): CoachLine {
  if (/That's the session/.test(last.en)) return last as CoachLine;
  const ks = c.ks!;
  const n = ks.passed.length;
  const items: Record<string, ItemState> = {};
  let next: StageInfo | null = null;
  const order = [...Array(visits(fam)).keys()].filter((v) => v !== closingVisitOf(fam));
  for (const v of order) {
    const i = visitSteps(fam, v).find((k) => inf(fam.levels[k]).code !== 'run' && isOpen(fam, c, fam.levels[k], items));
    if (i !== undefined) {
      next = inf(fam.levels[i]);
      break;
    }
  }
  if (!next) {
    const r = fam.levels.find((l) => l.stage?.code === 'run');
    if (r) next = inf(r);
  }
  const name = next ? (SHORT[next.what] ?? next.title) : null;
  const nx = next && name ? { en: ` Next time: ${name.en}, ${next.long.en}.`, he: ` בפעם הבאה: ${name.he}, ${next.long.he}.` } : { en: '', he: '' };
  const done = line('done');
  const en = `${last.en ? `${last.en} ` : ''}${done.en.replace(/\.$/, ':')} ${c.clean} clean of ${c.takes}.${n ? ` ${n} ${n === 1 ? 'stage' : 'stages'} passed.` : ''}${nx.en}`;
  const he = `${last.he ? `${last.he} ` : ''}${done.he.replace(/\.$/, ':')} ${c.clean} נקיים מתוך ${c.takes}.${n ? ` ${n === 1 ? 'שלב אחד עבר' : `${n} שלבים עברו`}.` : ''}${nx.he}`;
  // read / spoken phrase by phrase: the session phrase, the count, and the next stage (its fixed phrases in English)
  const nextSay: string[] = next ? [PHRASES.pickUp.en, ...(next.kind === 'speed' ? [PHRASES.theSpeed.en] : next.say.map((p) => PHRASES[p].en))] : [];
  const countHe = `${c.clean} נקיים מתוך ${c.takes}.${n ? ` ${n === 1 ? 'שלב אחד עבר' : `${n} שלבים עברו`}.` : ''}`;
  return { en, he, say: [...(last.say ?? []), PHRASES.done.en, ...nextSay], sayHe: [...(last.sayHe ?? []), PHRASES.done.he, countHe, ...(nx.he ? [nx.he.trim()] : [])] };
}

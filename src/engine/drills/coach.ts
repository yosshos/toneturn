// The practice coach (owner 2026-11-21, docs/SPEC-COACH.md): a technique family played as one continuous session that
// climbs — RH, LH → hands together → contrary motion → thirds … — instead of one level walked key by key with a click
// after every take. The coach picks the next take after each one (the same item at the next tempo step, the other hand,
// the next key, a harder step, slower, or a weak spot to revisit) and says so in one short line; the screen moves on by
// itself. Pure: the screen keeps the state and plays the takes.

import type { Drill, DrillSettings, FamilyId, ItemState, TakeMetrics } from './types';
import type { FamilyDef, LevelDef } from './generate';
import { levelKeys, specDrills, targetBpmOf } from './plan';
import { newItem } from './ladder';
import { bandOfBpm, thresholds } from './analyze';
import { hasQuarters, hasRubato, QUARTERS_BPM, QUARTERS_CLEAN, RUBATO_CLEAN, rubatoStage, type RubatoStage } from './rubato';
import { isStaged, stepCap, type StageInfo } from './stages';
import { ksAfter, ksStart, ksSummary, ksTake, stepQuality, type KsState } from './keyCoach';
import { notesPerBeat } from './analyze';
import { tempoText, type CoachLine } from './coachPhrases';

type T2 = { en: string; he: string };
type Order = DrillSettings['keyOrder'];

/** Keys clean at tempo (every item of the step in that key) before the coach moves up a step. */
export const KEYS_TO_PROMOTE = 2;
/** Misses on one item before the coach parks it as a weak spot and moves on. */
export const MISSES_TO_PARK = 3;
/** A weak spot comes back after this many takes. */
export const REVIEW_EVERY = 5;
/** The session's default length (minutes); the coach wraps up after the take that crosses it. A run from today's
 *  workout passes its block's minutes instead (CoachBackground.minutes, BUILD-PLAN phase 2). */
export const SESSION_MIN = 12;
/** "Slower" steps: −10 % each, never below ♩30. */
const SLOWER = 0.9;
/**
 * SPEC-COACH-2 stage 1 (owner 2026-11-21, "I was bored"): the tempo climbs inside the session. One step ≈ +6 %; a take
 * that was clean with room to spare ("easy") climbs two. Two clean takes in a row climb one.
 */
export const TEMPO_STEP = 1.06;
/** Easy takes in a session before the coach treats the player as past the basics (no rubato, pass at the target). */
export const EASY_TO_SKILLED = 2;
/** "Almost" takes at one tempo before the coach eases off a step (never a miss, never parked). */
const ALMOSTS_TO_EASE = 3;

export interface CoachSpot {
  step: number;
  key: number;
}

export interface CoachState {
  family: FamilyId;
  /** The family's level ids, easiest first. */
  steps: string[];
  step: number;
  /** The keys of the current step, in the session's order. */
  keys: number[];
  keyIdx: number;
  /** The item of the step's level being played in this key (RH, then LH …). */
  spec: number;
  /** Keys of the current step clean at tempo (before or in this session). */
  passed: number[];
  /** …of which in this session. */
  passedNow: number;
  misses: number;
  slower: number;
  weak: CoachSpot[];
  /** A warm-up take (the step below, a key the player knows) or a weak spot being revisited. */
  side: (CoachSpot & { kind: 'warmup' | 'review'; spec: number }) | null;
  /** The step's first take: the coach plays it once before asking for it. */
  demo: boolean;
  takes: number;
  clean: number;
  promoted: number;
  sinceReview: number;
  startedAt: number;
  /**
   * Past the basics (self-report, the level test, or easy takes in this session): no free time / quarters, and an item
   * passes only at its target tempo (SPEC-COACH-2 §3).
   */
  skilled: boolean;
  /** Tempo steps above the item's start in this visit; clean takes in a row at this tempo; "almost" takes at it. */
  up: number;
  run: number;
  almost: number;
  /** Easy takes this session. */
  easy: number;
  /** The share of its target the last passed item was played at: the next item starts near it (tempo carried over). */
  carry: number;
  /** This visit's best clean tempo on the current item, and takes at the top since it last went up (the limit). */
  peak?: number;
  stall?: number;
  /**
   * The placement probe (SPEC-COACH-2 §3.2): the first session on a family jumps levels by the takes — easy → two up,
   * clean → one up, almost → stay, a miss → one down and the probe ends — for at most PROBE_TAKES takes. null = off.
   */
  probe: { takes: number } | null;
  /** The session's length in minutes (default SESSION_MIN): today's technique block gives its own. */
  minutes?: number;
  /** SPEC-KEY-SESSION-2: the coach over a key session of stages (keyCoach.ts). */
  ks?: KsState;
  /**
   * Owner 2026-11-27: the current item's next tempo, set by the last take (a clean take climbs from it, never the same
   * tempo twice; "slower" eases from it). Cleared when the item changes.
   */
  at?: number;
  /** Past the target with nowhere else to go (one item, one key: a teacher's timed key assignment): the climb goes on. */
  over?: boolean;
  /** Today's limit on that item (the wave's top): the next wave climbs to just above it, in small steps. */
  limit?: number;
}

/** Above its target, how far the climb may go (a ceiling for the arithmetic, never a goal). */
const OVER_MAX = 1.6;
/** After the limit with nowhere else to go: back to this share of it, and up again (a wave, never the same take). */
const WAVE_BACK = 0.94;
/** A key whose pattern is clean in another key starts at this share of that tempo (owner 2026-11-27: not from ♩60 again). */
const CARRY_KEYS = 0.85;

/** Takes in the placement probe. */
export const PROBE_TAKES = 4;
/**
 * The player's limit (owner 2026-11-22, SPEC-KEY-SESSION §2): takes at the top without a new best clean tempo before
 * the coach moves on to the next exercise (the best and the ceiling stay saved on the item).
 */
export const PLATEAU_TAKES = 3;

export interface CoachTake {
  drill: Drill;
  level: LevelDef;
  /** Free time / quarters (rubato first), or null = the item's tempo. */
  stage: RubatoStage | null;
  bpm: number;
  /** Play it to the player first (a new step). */
  demo: boolean;
  kind: 'warmup' | 'review' | 'main';
  /** The item's index among its level's specs (RH / LH …). */
  spec: number;
  /** SPEC-KEY-SESSION-2 §3: how the take is played — its note value per beat (1 quarters, 2 eighths, 3 triplets …) and
   *  its ♩ — while `bpm` stays the item's own tempo (what the ladder records); its notes per second. */
  play?: { per: number; bpm: number };
  nps?: number;
  /** The stage being played (the strip, the brief). */
  stageInfo?: StageInfo;
  /** The rung's placement probe (SPEC-KEY-SESSION-2 §4.2): announced as a quick check. */
  probe?: boolean;
  /** SPEC-CLIMB-SYNC §2: a challenge take ("Let's try something harder"): well above the climb, to find the ceiling. */
  challenge?: boolean;
}

const levelOf = (fam: FamilyDef, id: string): LevelDef => fam.levels.find((l) => l.id === id) ?? fam.levels[0];
const drillOf = (level: LevelDef, spec: number, key: number, order: Order): Drill => {
  const ds = specDrills(level, spec, order);
  return ds.find((d) => d.spec.key === key) ?? ds[0];
};
const st = (items: Record<string, ItemState>, d: Drill): ItemState => items[d.itemId] ?? newItem(d);
/** Played clean at its own tempo at least once (a slowed take never counts: SPEC-COACH-2 A4). */
const cleanAtTempo = (s: ItemState | undefined, d: Drill): boolean => !!s && s.cleanBpm > 0 && s.cleanBpm >= d.startBpm - 0.5;

/** Item ids that differ only by their key field: the same pattern in other keys. */
function sameInOtherKeys(id: string, items: Record<string, ItemState>): ItemState[] {
  const a = id.split(':');
  const out: ItemState[] = [];
  for (const [k, v] of Object.entries(items)) {
    if (k === id) continue;
    const b = k.split(':');
    if (b.length !== a.length) continue;
    let diff = -1;
    let n = 0;
    for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) (diff = j, n++);
    if (n === 1 && /^\d+$/.test(a[diff]) && /^\d+$/.test(b[diff])) out.push(v);
  }
  return out;
}

/** The best clean tempo of the item's pattern in other keys (0 = none). */
export function patternBest(d: Drill, items: Record<string, ItemState>): number {
  return Math.max(0, ...sameInOtherKeys(d.itemId, items).map((x) => x.cleanBpm || 0));
}

/** Every item of the level clean at tempo in this key. */
function keyClean(level: LevelDef, key: number, items: Record<string, ItemState>, order: Order): boolean {
  return level.specs.every((_, k) => {
    const d = drillOf(level, k, key, order);
    return cleanAtTempo(items[d.itemId], d);
  });
}

/** A step is solid when it is clean at tempo in KEYS_TO_PROMOTE keys. */
function solid(level: LevelDef, items: Record<string, ItemState>, order: Order): boolean {
  // a one-key level (the key session's ladder, SPEC-PRACTICE-KEYS) is solid once that key is clean
  const ks = levelKeys(level, order);
  return ks.filter((k) => keyClean(level, k, items, order)).length >= Math.min(KEYS_TO_PROMOTE, ks.length);
}

/** The step's keys: unplayed-or-unclean first in the player's order (the familiar first keys lead). */
function keysOf(level: LevelDef, items: Record<string, ItemState>, order: Order): { keys: number[]; passed: number[] } {
  const all = levelKeys(level, order);
  const passed = all.filter((k) => keyClean(level, k, items, order));
  return { keys: [...all.filter((k) => !passed.includes(k)), ...passed], passed };
}

/** Where the player stands before the session: the course self-report and the level test (SPEC-COACH-2 §3). */
export interface CoachBackground {
  /** Past the basics: the course self-report ("some" / "a lot" of experience) or a level test placed past level 1. */
  skilled?: boolean;
  /** The level test's start level in this family (drillStart), when there is one. */
  from?: number;
  /** Skip the placement probe (the intro's "No check"); a family already played never probes. */
  noProbe?: boolean;
  /** The session's length (minutes): today's workout block's minutes (default SESSION_MIN). */
  minutes?: number;
  /**
   * Walk the steps in order, solid or not, starting at `resumeAt` (today's plan of matrix cells: review cells are closed
   * ones on purpose, and a stopped run resumes at the cell it reached).
   */
  walk?: boolean;
  resumeAt?: number;
}

/** The first level of the family with a hands-together item: where a player past the basics starts. */
function firstTogether(fam: FamilyDef): number {
  const l = fam.levels.find((x) => x.specs.some((sp) => (sp as { hands?: string }).hands === 'RL'));
  return l ? l.level : 1;
}

/** The family's first level the player is not yet solid in, from their background (no background → the first level). */
export function coachStart(fam: FamilyDef, items: Record<string, ItemState>, order: Order, now = Date.now(), bg: CoachBackground = {}): CoachState {
  if (isStaged(fam)) return ksStart(fam, items, now, bg);
  const steps = fam.levels.map((l) => l.id);
  const skilled = !!bg.skilled || (bg.from ?? 1) > 1;
  const from = bg.from ?? (skilled ? firstTogether(fam) : 1);
  let step = bg.walk ? Math.max(0, Math.min(steps.length - 1, bg.resumeAt ?? 0)) : fam.levels.findIndex((l) => l.level >= from && !solid(l, items, order));
  if (step < 0) step = fam.levels.findIndex((l) => !solid(l, items, order));
  if (step < 0) step = steps.length - 1;
  const { keys, passed } = keysOf(fam.levels[step], items, order);
  // Warm up on the step below, in the first key it is clean in (a teacher's opening scale).
  let side: CoachState['side'] = null;
  if (step > 0 && !bg.walk) {
    const below = fam.levels[step - 1];
    const k = levelKeys(below, order).find((x) => keyClean(below, x, items, order));
    if (k !== undefined) side = { kind: 'warmup', step: step - 1, key: k, spec: below.specs.length - 1 };
  }
  // The probe only on a family never played, without a level test start, and not skipped.
  const fresh = !Object.values(items).some((x) => x.family === fam.id && x.takes > 0);
  const probe = fresh && bg.from === undefined && !bg.noProbe ? { takes: 0 } : null;
  return { family: fam.id, steps, step, keys, keyIdx: 0, spec: 0, passed, passedNow: 0, misses: 0, slower: 0, weak: [], side: probe ? null : side, demo: true, takes: 0, clean: 0, promoted: 0, sinceReview: 0, startedAt: now, skilled, up: 0, run: 0, almost: 0, easy: 0, carry: 0, probe, ...(bg.minutes && bg.minutes > 0 ? { minutes: bg.minutes } : {}) };
}

/** Move the session to another step (promotion or the probe): its keys, starting in a key just played. */
function toStep(fam: FamilyDef, c: CoachState, step: number, items: Record<string, ItemState>, order: Order): LevelDef {
  c.step = step;
  c.at = undefined;
  const nl = levelOf(fam, c.steps[c.step]);
  const kp = keysOf(nl, items, order);
  const first = c.keys[0];
  c.keys = [first, ...kp.keys.filter((k) => k !== first)].filter((k) => levelKeys(nl, order).includes(k));
  if (!c.keys.length) c.keys = kp.keys;
  c.passed = kp.passed;
  c.passedNow = 0;
  c.keyIdx = 0;
  c.spec = 0;
  c.up = 0;
  c.run = 0;
  c.slower = 0;
  c.misses = 0;
  c.almost = 0;
  return nl;
}

/**
 * The stage of an item in the coach: rubato first (2 clean free takes, 1 in quarters) for the step's first key; a key
 * after it shares the motion and the fingering pattern — one clean free take, then its tempo.
 */
export function coachStage(level: LevelDef, spec: number, drill: Drill, items: Record<string, ItemState>, order: Order): RubatoStage | null {
  const base = rubatoStage(items[drill.itemId], drill);
  if (!base) return null;
  // owner 2026-11-27: also the same pattern in a key outside this level (a one-key assignment in E♭ after B♭)
  const known = specDrills(level, spec, order).some((d) => d.itemId !== drill.itemId && (cleanAtTempo(items[d.itemId], d) || (items[d.itemId]?.rubato?.free ?? 0) >= RUBATO_CLEAN)) || patternBest(drill, items) >= drill.startBpm - 0.5;
  if (!known) return base;
  return (items[drill.itemId]?.rubato?.free ?? 0) >= 1 ? null : 'free';
}

/** After a clean free take that finishes the coach's shortened rubato: the item's rubato marked done. */
export function rubatoDoneByCoach(s: ItemState, drill: Drill): ItemState {
  return { ...s, rubato: { free: Math.max(RUBATO_CLEAN, s.rubato?.free ?? 0), quarters: hasQuarters(drill) ? Math.max(QUARTERS_CLEAN, s.rubato?.quarters ?? 0) : s.rubato?.quarters ?? 0 } };
}

/** Whether an item can be played in free time here (a microphone can't follow chords in free time …); default yes. */
export type FreeOk = (d: Drill) => boolean;

/** The take the coach asks for now. */
export function coachTake(fam: FamilyDef, c: CoachState, items: Record<string, ItemState>, order: Order, freeOk: FreeOk = () => true): CoachTake {
  if (c.ks) return ksTake(fam, c, items, order, freeOk);
  if (c.side) {
    const level = levelOf(fam, c.steps[c.side.step]);
    const drill = drillOf(level, c.side.spec, c.side.key, order);
    const stage = c.side.kind === 'warmup' || !freeOk(drill) ? null : coachStage(level, c.side.spec, drill, items, order);
    return { drill, level, stage, bpm: stage === 'quarters' ? QUARTERS_BPM : st(items, drill).goalBpm, demo: false, kind: c.side.kind, spec: c.side.spec };
  }
  const level = levelOf(fam, c.steps[c.step]);
  const drill = drillOf(level, c.spec, c.keys[c.keyIdx], order);
  // Past the basics: straight to the item's tempo (SPEC-COACH-2 §3.3).
  const stage = !c.skilled && freeOk(drill) ? coachStage(level, c.spec, drill, items, order) : null;
  const bpm = stage === 'quarters' ? QUARTERS_BPM : tempoOf(c, level, drill, st(items, drill), patternBest(drill, items));
  return { drill, level, stage, bpm, demo: c.demo && c.spec === 0, kind: 'main', spec: c.spec };
}

/**
 * The tempo of a main take: the item's start point — its goal, or just under its best clean tempo, or (past the basics)
 * near the share of the target the last passed item reached — climbed by this visit's steps, eased by "slower", never
 * past the target.
 */
function tempoOf(c: CoachState, level: LevelDef, drill: Drill, s: ItemState, otherKeys = 0): number {
  const target = targetBpmOf(level, drill);
  const cap = c.over ? Math.round(target * OVER_MAX) : target;
  // the last take set it: a clean one climbed, a slower one eased (owner 2026-11-27: never the same tempo twice)
  if (c.at) return Math.max(30, Math.min(cap, Math.round(c.at)));
  const base = Math.min(target, Math.max(s.goalBpm, Math.round(s.cleanBpm * 0.94), c.skilled ? Math.round(target * c.carry * 0.94) : 0, Math.round(otherKeys * CARRY_KEYS)));
  return Math.max(30, Math.min(cap, Math.round(base * TEMPO_STEP ** c.up * SLOWER ** c.slower)));
}

/**
 * The next tempo after a clean take (owner 2026-11-26/27): every clean take climbs, by how clean it was and from where
 * (stepCap: up to +20 % at 2 notes a second, less when faster), and always at least 2 ♩ — never the same tempo again.
 */
export function climbFrom(bpm: number, m: TakeMetrics, drill: Drill, cap: number): number {
  const q = Math.max(0.25, stepQuality(m, drill));
  const nps = (bpm * Math.max(0.25, notesPerBeat(drill))) / 60;
  return Math.min(cap, Math.max(bpm + 2, Math.round(bpm * (1 + stepCap(nps) * q))));
}

/** Clean with room to spare: the timing well inside its limits, no stops, no wrong notes. */
export function easyTake(m: TakeMetrics, drill: Drill): boolean {
  if (m.verdict !== 'clean' || m.timingSD === null || m.timingSD === undefined) return false;
  const th = thresholds(bandOfBpm(drill, m.bpm || drill.startBpm));
  return (m.wrong ?? 0) === 0 && (m.hesitations ?? 0) === 0 && m.timingSD <= 0.6 * th.sd && (m.handsAbs === null || m.handsAbs === undefined || m.handsAbs <= 0.6 * th.hands);
}

/** What a missed take missed, in a few words. */
export function missLine(m: TakeMetrics): T2 {
  const n = (m.wrong ?? 0) + (m.missing ?? 0);
  if (n === 1) return { he: 'פספסת תו אחד', en: 'One note missed' };
  if (n > 1 && n <= 3) return { he: `פספסת ${n} תווים`, en: `${n} notes missed` };
  if (n > 3) return { he: 'עוד לא בידיים', en: 'Not in the fingers yet' };
  if ((m.hesitations ?? 0) > 0) return { he: 'היו עצירות', en: 'A few stops' };
  return { he: 'הקצב לא יציב', en: 'The time wavered' };
}

const PRAISE: T2[] = [
  { he: 'נקי.', en: 'Clean.' },
  { he: 'יפה.', en: 'Nice.' },
  { he: 'מצוין.', en: 'Great.' },
];

export interface CoachNext {
  state: CoachState;
  /** The coach's line: how it went, and what comes next (`say`: its fixed phrases, spoken one by one). */
  line: CoachLine;
  /** The session is over (its time is up). */
  end: boolean;
  /** The limit rule fired on this item (BUILD-PLAN §0.2): its best clean tempo becomes "a ceiling for now". */
  ceiling?: { itemId: string; bpm: number };
  /** SPEC-KEY-SESSION-2 §4.3: items whose passed stages changed (the screen saves them). */
  items?: ItemState[];
}

/** The next key of the step that is not yet passed (wrapping); the current one when all are. */
function nextKeyIdx(c: CoachState): number {
  for (let k = 1; k <= c.keys.length; k++) {
    const j = (c.keyIdx + k) % c.keys.length;
    if (!c.passed.includes(c.keys[j])) return j;
  }
  return (c.keyIdx + 1) % c.keys.length;
}

/**
 * After a take: the coach's next state and line. `items` = the item states after the take was saved (its ladder,
 * its rubato stage).
 */
export function coachAfter(fam: FamilyDef, c0: CoachState, take: CoachTake, m: TakeMetrics, items: Record<string, ItemState>, order: Order, now = Date.now(), freeOk: FreeOk = () => true): CoachNext {
  if (c0.ks) return ksAfter(fam, c0, take, m, items, order, now, freeOk);
  const clean = m.verdict === 'clean';
  const c: CoachState = { ...c0, takes: c0.takes + 1, clean: c0.clean + (clean ? 1 : 0), sinceReview: c0.sinceReview + 1, demo: false };
  const praise = PRAISE[c.takes % PRAISE.length];
  const timeUp = now - c.startedAt >= (c.minutes ?? SESSION_MIN) * 60_000;
  const next = (line: T2): CoachNext => {
    // A weak spot comes back every few takes (never over a new step's first take).
    if (!timeUp && !c.side && !c.demo && c.weak.length && c.sinceReview >= REVIEW_EVERY) {
      const w = c.weak[0];
      c.side = { kind: 'review', step: w.step, key: w.key, spec: 0 };
      c.sinceReview = 0;
      const lv = levelOf(fam, c.steps[w.step]);
      const d = drillOf(lv, 0, w.key, order);
      return { state: c, line: { he: `${line.he} חוזרים לנקודה קשה: ${d.title.he}.`, en: `${line.en} Back to a hard spot: ${d.title.en}.` }, end: false };
    }
    if (timeUp) return { state: c, line: summary(fam, c, line), end: true };
    const t = coachTake(fam, c, items, order, freeOk);
    return { state: c, line: { he: `${line.he} ${announce(t, 'he')}`, en: `${line.en} ${announce(t, 'en')}` }, end: false };
  };

  // A warm-up: whatever happened, on to the session's step.
  if (c.side?.kind === 'warmup') {
    c.side = null;
    c.demo = true;
    return next(clean ? { he: 'חימום נקי.', en: 'Warm-up clean.' } : { he: 'זה החימום.', en: 'That was the warm-up.' });
  }
  // A weak spot revisited: back to where the session was.
  if (c.side?.kind === 'review') {
    const spot = c.side;
    const level = levelOf(fam, c.steps[spot.step]);
    const stillLearning = clean && take.stage !== null;
    if (clean && !stillLearning) {
      if (spot.spec + 1 < level.specs.length) {
        c.side = { ...spot, spec: spot.spec + 1 };
        return next(praise);
      }
      c.weak = c.weak.filter((w) => !(w.step === spot.step && w.key === spot.key));
      c.side = null;
      return next({ he: 'עכשיו זה יושב.', en: 'That one sits now.' });
    }
    if (stillLearning) return next(praise);
    c.side = null;
    c.weak = [...c.weak.filter((w) => !(w.step === spot.step && w.key === spot.key)), spot];
    return next({ he: `${missLine(m).he}. נחזור אליו שוב.`, en: `${missLine(m).en}. We'll come back to it.` });
  }

  // The placement probe: jump levels by the take, then climb as usual (SPEC-COACH-2 §3.2).
  if (c.probe && take.kind === 'main') {
    const easyP = clean && easyTake(m, take.drill);
    const n = c.probe.takes + 1;
    const last = c.steps.length - 1;
    const jump = easyP ? 2 : clean ? 1 : m.verdict === 'almost' ? 0 : -1;
    const done = n >= PROBE_TAKES || jump < 0 || (jump > 0 && c.step >= last);
    if (easyP) c.skilled = true;
    const target = Math.max(0, Math.min(last, c.step + jump));
    c.probe = done ? null : { takes: n };
    if (target !== c.step) {
      const nl = toStep(fam, c, target, items, order);
      c.demo = true;
      return next(
        done
          ? { he: `מצאנו את הרמה: ${nl.title.he}. ממשיכים מכאן.`, en: `Found your level: ${nl.title.en}. On from here.` }
          : jump > 0
            ? { he: `${PRAISE[0].he} קופצים ל־${nl.title.he}.`, en: `${PRAISE[0].en} Up to ${nl.title.en}.` }
            : { he: `נשארים ב־${nl.title.he}.`, en: `Staying at ${nl.title.en}.` },
      );
    }
    if (done) return next({ he: `מצאנו את הרמה: ${levelOf(fam, c.steps[c.step]).title.he}. ממשיכים מכאן.`, en: `Found your level: ${levelOf(fam, c.steps[c.step]).title.en}. On from here.` });
  }

  const level = levelOf(fam, c.steps[c.step]);
  // The limit: a new best clean tempo resets it; a clean take that is no faster, or a miss at a tempo above the best,
  // counts a take at the top. After PLATEAU_TAKES the coach saves the best and moves on (SPEC-KEY-SESSION §2).
  if (take.stage === null && take.kind === 'main') {
    const peak = c.peak ?? 0;
    if (clean && take.bpm > peak + 0.5) {
      c.peak = take.bpm;
      c.stall = 0;
    } else if (peak > 0) c.stall = (c.stall ?? 0) + 1;
    if ((c.stall ?? 0) >= PLATEAU_TAKES && peak > 0) {
      const best = Math.round(peak);
      c.peak = 0;
      c.stall = 0;
      c.misses = 0;
      c.almost = 0;
      c.up = 0;
      c.run = 0;
      c.slower = 0;
      const said = { he: `זה הגבול שלך היום כאן: ♩${best}. ממשיכים לתרגיל הבא.`, en: `That is your limit here today: ♩${best}. On to the next exercise.` };
      // "a ceiling for now" on the item (BUILD-PLAN §0.2): the screen saves it, the matrix rests the cell for a few days
      const ceiling = { itemId: take.drill.itemId, bpm: best };
      const withCeil = (n: CoachNext): CoachNext => ({ ...n, ceiling });
      // one item, one key, nothing after it (a teacher's timed key assignment): back a little and build up again
      if (c.step + 1 >= c.steps.length && c.keys.length === 1 && c.spec + 1 >= level.specs.length) {
        c.at = Math.max(30, Math.round(best * WAVE_BACK));
        c.limit = Math.max(c.limit ?? 0, best);
        // owner 2026-11-27: a drop with no word why felt arbitrary — say what set the limit, and come back to it soon
        return withCeil(next({ he: `${PLATEAU_TAKES} נגינות בלי שיא חדש: ♩${best} הוא הגבול שלך היום. עכשיו ♩${c.at}, ומתקרבים אליו שוב בצעדים קטנים.`, en: `${PLATEAU_TAKES} takes without a new best: ♩${best} is your limit today. Now ♩${c.at}, then back toward it in small steps.` }));
      }
      c.at = undefined;
      if (c.spec + 1 < level.specs.length) {
        c.spec++;
        return withCeil(next(said));
      }
      // one-key ladders (the key session) go to the next step; a family goes to its next key
      if (c.keys.length === 1 && c.step + 1 < c.steps.length) {
        toStep(fam, c, c.step + 1, items, order);
        c.demo = true;
        return withCeil(next(said));
      }
      c.spec = 0;
      c.keyIdx = nextKeyIdx(c);
      return withCeil(next(said));
    }
  }
  if (clean) {
    c.misses = 0;
    c.almost = 0;
    const easy = easyTake(m, take.drill);
    if (easy) c.easy++;
    // The coach learns the level from the takes (SPEC-COACH-2 §3.4): easy takes → past the basics.
    const nowSkilled = !c.skilled && c.easy >= EASY_TO_SKILLED;
    if (nowSkilled) c.skilled = true;
    // Free time / quarters: the same item again at its next stage (the item state moved it on).
    // owner 2026-11-27: ♩60 in quarters → ♩66 in eighths more than doubled the notes; the first tempo take stays at ♩60
    if (take.stage === 'quarters') c.at = Math.min(QUARTERS_BPM, c.at ?? QUARTERS_BPM);
    if (take.stage !== null) return next(nowSkilled ? { he: `${praise.he} זה קל לך — לטמפו.`, en: `${praise.en} This is easy for you — to tempo.` } : praise);
    // Below the tempo the item passes at (its target past the basics, its own tempo before), or eased by "slower":
    // climb and play it again (SPEC-COACH-2 §4.1).
    // SPEC-KEY-SESSION-2 §3.4: the same climb for everyone — an item passes at its target (no pass at the start tempo)
    const target = targetBpmOf(level, take.drill);
    const passAt = target;
    // owner 2026-11-26/27: every clean take climbs (never the same tempo twice) — below the target, and past it when
    // there is nowhere else to go
    if (c.over || c.slower > 0 || take.bpm < passAt - 0.5) {
      c.slower = 0;
      c.run = 0;
      const was = c.over;
      // after a limit, the next wave goes to just above it (a few ♩ at a time there), not past it in one jump
      const top = c.over ? (c.limit ? Math.max(c.limit + 2, Math.round(c.limit * 1.03), take.bpm + 2) : Math.round(target * OVER_MAX)) : target;
      c.at = climbFrom(take.bpm, m, take.drill, Math.min(top, Math.round(target * OVER_MAX)));
      if (c.limit && take.bpm > c.limit) c.limit = take.bpm;
      const nb = coachTake(fam, c, items, order, freeOk).bpm;
      // at the top of the arithmetic with nowhere to go: back a little and up again (never the same take)
      if (nb <= take.bpm && was) {
        c.at = Math.max(30, Math.round(take.bpm * WAVE_BACK));
        return next({ he: `${praise.he} יורדים קצת ובונים שוב למעלה.`, en: `${praise.en} A little slower, then up again.` });
      }
      if (nb <= take.bpm) return next(praise);
      if (!was && nb >= target - 0.5 && take.bpm < target - 0.5) return next({ he: `${praise.he} עכשיו ביעד.`, en: `${praise.en} Now at the target.` });
      return next({ he: `${praise.he} מהר יותר.`, en: `${praise.en} Faster.` });
    }
    c.carry = Math.max(c.carry, take.bpm / target);
    c.up = 0;
    c.run = 0;
    c.slower = 0;
    c.peak = 0;
    c.stall = 0;
    c.at = undefined;
    // one item, one key, nothing after it (owner 2026-11-27: it repeated ♩83 for minutes): past the target, on up
    if (c.step + 1 >= c.steps.length && c.keys.length === 1 && c.spec + 1 >= level.specs.length && (c.passed.includes(c.keys[c.keyIdx]) || level.specs.length === 1)) {
      if (!c.passed.includes(c.keys[c.keyIdx])) c.passed = [...c.passed, c.keys[c.keyIdx]];
      c.passedNow++;
      c.over = true;
      c.peak = take.bpm;
      c.at = climbFrom(take.bpm, m, take.drill, Math.round(target * OVER_MAX));
      return next({ he: `${praise.he} עברת את היעד (♩${Math.round(target)}). ממשיכים מעליו.`, en: `${praise.en} Past the target (♩${Math.round(target)}). On above it.` });
    }
    // The other hand / the next item of the step, same key.
    if (c.spec + 1 < level.specs.length) {
      c.spec++;
      return next(praise);
    }
    // The key is done (a key with several items: the next lap of them goes on above the target).
    if (c.step + 1 >= c.steps.length && c.keys.length === 1) c.over = true;
    const key = c.keys[c.keyIdx];
    if (!c.passed.includes(key)) c.passed = [...c.passed, key];
    c.passedNow++;
    c.spec = 0;
    if (c.passed.length >= Math.min(KEYS_TO_PROMOTE, c.keys.length) && c.passedNow >= 1) {
      if (c.step + 1 < c.steps.length) {
        c.promoted++;
        const nl = toStep(fam, c, c.step + 1, items, order);
        c.demo = true;
        return next({ he: `${praise.he} שלב חדש: ${nl.title.he}. קודם נקשיב.`, en: `${praise.en} New step: ${nl.title.en}. Listen first.` });
      }
      // The family's top step is solid: keep going through its keys.
    }
    c.keyIdx = nextKeyIdx(c);
    return next(praise);
  }

  // "Almost": the same tempo again — not a miss, never parked; after a few, one step easier (SPEC-COACH-2 A5).
  if (m.verdict === 'almost' && take.stage === null) {
    c.run = 0;
    c.almost++;
    const al = missLine(m);
    if (c.almost < ALMOSTS_TO_EASE) return next({ he: `כמעט. ${al.he} — שוב.`, en: `Almost. ${al.en} — again.` });
    c.almost = 0;
    if (c.up > 0) c.up--;
    else c.slower++;
    if (c.at) c.at = Math.max(30, Math.round(take.bpm * 0.95));
    return next({ he: 'כמעט. קצת לאט יותר.', en: 'Almost. A little slower.' });
  }

  // A miss.
  c.misses++;
  c.run = 0;
  const ml = missLine(m);
  if (c.misses === 1) return next({ he: `${ml.he} — שוב.`, en: `${ml.en} — again.` });
  if (c.misses === 2 && take.stage === null) {
    if (c.up > 0) c.up = Math.max(0, c.up - 2);
    else c.slower++;
    if (c.at) c.at = Math.max(30, Math.round(take.bpm * SLOWER));
    return next({ he: `${ml.he}. לאט יותר.`, en: `${ml.en}. Slower.` });
  }
  if (c.misses < MISSES_TO_PARK) return next({ he: `${ml.he}. שוב, בלי למהר.`, en: `${ml.en}. Again, no rush.` });
  // Parked: a weak spot to revisit; on to the next key.
  const key = c.keys[c.keyIdx];
  if (!c.weak.some((w) => w.step === c.step && w.key === key)) c.weak = [...c.weak, { step: c.step, key }];
  c.misses = 0;
  c.slower = 0;
  c.up = 0;
  c.almost = 0;
  c.spec = 0;
  c.at = undefined;
  c.keyIdx = nextKeyIdx(c);
  return next({ he: 'נחזור לזה אחר כך.', en: "We'll come back to this." });
}

/** "Now: G major · hands together · ♩80" (free time: "in free time"). */
export function announce(t: CoachTake, lang: 'he' | 'en'): string {
  // a key-session stage: its one-line brief and the pulse as played (SPEC-KEY-SESSION-2 §6, no level titles)
  // (the tempo isolated left-to-right so "♩90" never flips in a Hebrew line)
  if (t.stageInfo) return `${t.probe ? (lang === 'he' ? 'קודם בדיקה קצרה. ' : 'A quick check first. ') : ''}${t.stageInfo.brief[lang]} ${t.stage === 'free' ? (lang === 'he' ? 'בקצב חופשי.' : 'In free time.') : tempoText(t.play?.bpm ?? t.bpm, t.play?.per, lang)}`;
  const title = t.drill.title[lang];
  const how =
    t.stage === 'free'
      ? lang === 'he'
        ? 'בלי קצב'
        : 'in free time'
      : `♩${t.bpm}`;
  return lang === 'he' ? `עכשיו: ${title}, ${how}.` : `Now: ${title}, ${how}.`;
}

/** The session's closing line (also when the player ends it). */
export function summary(fam: FamilyDef, c: CoachState, last: T2): CoachLine {
  if (c.ks) return ksSummary(fam, c, last);
  const lv = levelOf(fam, c.steps[c.step]);
  const up = c.promoted ? { he: ` עלית ${c.promoted === 1 ? 'שלב' : `${c.promoted} שלבים`}.`, en: ` ${c.promoted === 1 ? 'One step up' : `${c.promoted} steps up`}.` } : { he: '', en: '' };
  return {
    he: `${last.he} זה הסשן: ${c.clean} נקיים מתוך ${c.takes}.${up.he} בפעם הבאה ממשיכים מ${lv.title.he}.`,
    en: `${last.en} That's the session: ${c.clean} clean of ${c.takes}.${up.en} Next time from ${lv.title.en}.`,
  };
}

/** The coach runs on families whose items have notes to play (not ear call-and-response, writing, singing). */
export function coachable(fam: FamilyDef, order: Order): boolean {
  const l = fam.levels[0];
  if (!l) return false;
  const d = specDrills(l, 0, order)[0];
  return !!d && !d.sung && !d.write && !d.listen && (hasRubato(d) || d.notes.length > 0);
}

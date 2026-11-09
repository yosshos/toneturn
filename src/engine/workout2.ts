// Today's workout (spec AH, docs/SPEC-WORKOUT.md): suggested from the player's preferences and the path, then
// theirs to edit — total time, minutes per block, order, remove / add / swap, presets, today-only or default.
// The path is WHAT to learn, the workout is HOW MUCH TODAY (§9): blocks serve path steps first. Pure.

import type { DomainId } from './rating';
import { DOMAINS } from './rating';
import type { SkillId } from './lesson';
import { GOAL_WEIGHTS, type Goal, type PathStep, type PathView, type UnitStep } from './path';

export type BlockTarget =
  | { kind: 'path' }
  | { kind: 'warmup' }
  | { kind: 'area'; area: DomainId }
  | { kind: 'skill'; skill: SkillId }
  | { kind: 'topic'; topic: string }
  | { kind: 'game'; game: string }
  | { kind: 'vocal' }
  /** Off-app practice on the player's own instrument: a timer, the metronome, a note (W12). */
  | { kind: 'practice' }
  /** Reviews + the weakest sub-skills only ("Fix my mistakes", W14). */
  | { kind: 'mistakes' };

export interface Block {
  id: string;
  target: BlockTarget;
  minutes: number;
  locked?: boolean;
}

export const LIMITS = { minTotal: 5, maxTotal: 60, minBlock: 2, maxBlock: 30, maxBlocks: 12 };
/** Minutes a path step takes, a checkpoint (§9.2). */
export const STEP_MIN = 1.5;
export const CHECK_MIN = 2;
const AREAS: DomainId[] = DOMAINS.map((d) => d.id);

export const total = (bs: Block[]) => bs.reduce((a, b) => a + b.minutes, 0);
const clampM = (m: number) => Math.max(LIMITS.minBlock, Math.min(LIMITS.maxBlock, Math.round(m)));
const uid = (bs: Block[], base: string) => {
  let i = 1;
  while (bs.some((b) => b.id === `${base}-${i}`)) i++;
  return `${base}-${i}`;
};
export const targetKey = (t: BlockTarget) => (t.kind === 'area' ? `area:${t.area}` : t.kind === 'skill' ? `skill:${t.skill}` : t.kind === 'topic' ? `topic:${t.topic}` : t.kind === 'game' ? `game:${t.game}` : t.kind);

// ---------------------------------------------------------------- the suggestion (§3, §9.2)

export interface SuggestInput {
  total: number;
  goal: Goal;
  priorities: DomainId[] | null;
  leaveOut: DomainId[];
  reviewsDue: number;
  singer: boolean;
  view: PathView;
  /** A saved default structure (targets + minutes): used instead of the generated one, rescaled to `total`. */
  template?: Block[] | null;
  /** Keys player with technique drills in the workout (spec AI): the game slot becomes a Technique block. */
  technique?: boolean;
}

/** Open steps of the current unit (and the checkpoint), per area. */
export function unitRemaining(view: PathView): { byArea: Map<DomainId, number>; check: boolean; unitN: number | null; steps: number; done: number } {
  const unit = view.units.find((u) => u.status === 'current');
  const byArea = new Map<DomainId, number>();
  if (!unit) return { byArea, check: false, unitN: null, steps: 0, done: 0 };
  let check = false;
  let done = 0;
  for (const x of unit.steps) {
    const open = x.state === 'current' || x.state === 'open' || x.state === 'quick' || x.state === 'refresh';
    if (!open) {
      done++;
      continue;
    }
    if (x.step.kind === 'check') check = true;
    else if (x.step.kind !== 'review') byArea.set(x.step.domain, (byArea.get(x.step.domain) ?? 0) + 1);
  }
  return { byArea, check, unitN: unit.no ?? unit.n, steps: unit.steps.length, done };
}

/** W4: exact shapes for the common totals (path minutes, area minutes in weight order, warm-up, game). */
const SHAPES: Record<number, { warm: number; path: number; areas: number[]; game: number }> = {
  5: { warm: 0, path: 3, areas: [2], game: 0 },
  10: { warm: 2, path: 4, areas: [2, 2], game: 0 },
  15: { warm: 2, path: 5, areas: [3, 2], game: 3 },
  20: { warm: 2, path: 6, areas: [4, 3, 2], game: 3 },
};

/** W6: drop or replace blocks whose target no longer exists for this player. */
export function validateTemplate(bs: Block[], ok: { leaveOut: DomainId[]; topics: Set<string>; hidden: string[]; games: Set<string> }): Block[] {
  const out: Block[] = [];
  for (const b of bs) {
    const t = b.target;
    if (t.kind === 'area' && ok.leaveOut.includes(t.area)) continue;
    if (t.kind === 'topic' && (!ok.topics.has(t.topic) || ok.hidden.includes(t.topic))) continue;
    if (t.kind === 'game' && !ok.games.has(t.game)) continue;
    out.push({ ...b, minutes: Math.max(LIMITS.minBlock, b.minutes) });
  }
  return out.length ? out : bs.filter((b) => b.target.kind === 'path').slice(0, 1);
}

export function suggestWorkout(inp: SuggestInput): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(inp.total)));
  if (inp.template?.length) return rescale(inp.template.map((b) => ({ ...b })), T);
  const out: Block[] = [];
  const push = (target: BlockTarget, minutes: number) => out.push({ id: uid(out, target.kind), target, minutes });
  const shape = SHAPES[T];
  if (shape) {
    // Areas: the current unit's open areas first (§9.2), then the player's top areas by weight.
    const rem0 = unitRemaining(inp.view);
    const gw0 = GOAL_WEIGHTS[inp.goal] ?? GOAL_WEIGHTS.general;
    const w0 = (a: DomainId) => (gw0[AREAS.indexOf(a)] ?? 1) * (inp.priorities ? Math.max(1, 5 - Math.max(0, inp.priorities.indexOf(a))) : 2);
    const cand = [...new Set([...[...rem0.byArea.keys()].sort((x, y) => w0(y) - w0(x)), ...AREAS.slice().sort((x, y) => w0(y) - w0(x))])].filter((a) => !inp.leaveOut.includes(a) && w0(a) > 0);
    if (inp.singer && T >= 15) push({ kind: 'vocal' }, 2);
    // 0.61 (owner): an instrument course warms up on its own technique (today's measured drills), and its path —
    // about half technique levels — does the rest; no second drills block.
    const warmT: BlockTarget = inp.technique ? { kind: 'game', game: 'drills' } : { kind: 'warmup' };
    if (shape.warm && (inp.reviewsDue > 0 || T >= 10 || inp.technique)) push(warmT, shape.warm);
    const warmed = out.some((b) => b.target.kind === 'warmup' || (b.target.kind === 'game' && b.target.game === 'drills'));
    push({ kind: 'path' }, shape.path + (shape.warm && !warmed ? shape.warm : 0) + (inp.technique ? shape.game : 0));
    shape.areas.forEach((m, i) => cand[i] && push({ kind: 'area', area: cand[i] }, m));
    if (shape.game && !inp.technique) push({ kind: 'game', game: 'highway' }, shape.game);
    const diff = T - total(out);
    if (diff !== 0) {
      const p = out.find((b) => b.target.kind === 'path')!;
      p.minutes = Math.max(LIMITS.minBlock, p.minutes + diff);
    }
    return out;
  }
  if (inp.singer && T >= 10) push({ kind: 'vocal' }, 3);
  if (inp.technique) push({ kind: 'game', game: 'drills' }, 2);
  else if (inp.reviewsDue > 0 || T >= 10) push({ kind: 'warmup' }, 2);
  const rem = unitRemaining(inp.view);
  // §9.2: minutes for the current unit, area by area (each step ≈ 1.5 min, the checkpoint ≈ 2).
  const fixed = total(out);
  const game = T >= 15 && !inp.technique ? 3 : 0;
  let left = T - fixed - game;
  const gw = GOAL_WEIGHTS[inp.goal] ?? GOAL_WEIGHTS.general;
  const weight = (a: DomainId) => {
    const g = gw[AREAS.indexOf(a)] ?? 1;
    const r = inp.priorities ? Math.max(1, 5 - Math.max(0, inp.priorities.indexOf(a))) : 2;
    return g * r;
  };
  const areas = [...rem.byArea.entries()].filter(([a]) => !inp.leaveOut.includes(a)).sort((x, y) => weight(y[0]) - weight(x[0]) || x[0].localeCompare(y[0]));
  if (rem.check && !areas.length) {
    push({ kind: 'path' }, Math.min(left, Math.max(CHECK_MIN, 3)));
    left -= Math.min(left, Math.max(CHECK_MIN, 3));
  }
  for (const [a, n] of areas.slice(0, 4)) {
    if (left < 2) break;
    const want = Math.max(2, Math.round(n * STEP_MIN));
    const m = Math.min(left, want);
    push({ kind: 'area', area: a }, m);
    left -= m;
  }
  if (rem.check && areas.length && left >= CHECK_MIN) {
    push({ kind: 'path' }, CHECK_MIN);
    left -= CHECK_MIN;
  }
  // The remainder: more of the top areas by weight (free practice once their path steps are done).
  const top = AREAS.filter((a) => !inp.leaveOut.includes(a)).sort((x, y) => weight(y) - weight(x));
  for (let i = 0; left >= 2 && i < top.length && out.length < LIMITS.maxBlocks - (game ? 1 : 0); i++) {
    const ex = out.find((b) => b.target.kind === 'area' && b.target.area === top[i]);
    const m = Math.min(left, Math.max(2, Math.round(left / 2)));
    if (ex) ex.minutes = clampM(ex.minutes + m);
    else push({ kind: 'area', area: top[i] }, m);
    left -= m;
  }
  if (left > 0 && out.length) {
    const last = [...out].reverse().find((b) => b.target.kind === 'area') ?? out[out.length - 1];
    last.minutes = clampM(last.minutes + left);
  }
  if (game) push({ kind: 'game', game: 'highway' }, game);
  return out;
}

// ---------------------------------------------------------------- editing (§4)

/** W5: can the blocks take this total? (locked minutes must fit, every unlocked block keeps ≥ 2). */
export function canRescale(bs: Block[], newTotal: number): boolean {
  const locked = total(bs.filter((b) => b.locked));
  const free = bs.filter((b) => !b.locked).length;
  return newTotal >= LIMITS.minTotal && newTotal <= LIMITS.maxTotal && newTotal - locked >= free * LIMITS.minBlock;
}

/** Scale the unlocked blocks to a new total (locked keep their minutes; each ≥ 2; sums exactly; largest remainder). */
export function rescale(bs: Block[], newTotal: number): Block[] {
  const T = Math.max(LIMITS.minTotal, Math.min(LIMITS.maxTotal, Math.round(newTotal)));
  if (!canRescale(bs, T)) return bs.map((b) => ({ ...b }));
  const locked = bs.filter((b) => b.locked);
  const free = bs.filter((b) => !b.locked);
  const room = Math.max(free.length * LIMITS.minBlock, T - total(locked));
  if (!free.length) return bs.map((b) => ({ ...b }));
  const cur = total(free) || 1;
  const raw = free.map((b) => ({ id: b.id, q: (b.minutes * room) / cur }));
  const m = new Map(raw.map((r) => [r.id, Math.max(LIMITS.minBlock, Math.floor(r.q))]));
  let diff = room - [...m.values()].reduce((a, x) => a + x, 0);
  const order = [...raw].sort((a, b) => b.q - Math.floor(b.q) - (a.q - Math.floor(a.q)));
  for (let i = 0; diff > 0; i = (i + 1) % order.length, diff--) m.set(order[i].id, m.get(order[i].id)! + 1);
  for (let i = order.length - 1; diff < 0 && i >= 0; i--) {
    const id = order[i].id;
    if (m.get(id)! > LIMITS.minBlock) {
      m.set(id, m.get(id)! - 1);
      diff++;
      i++;
      if (i > order.length - 1) i = order.length - 1;
    }
  }
  return bs.map((b) => (b.locked ? { ...b } : { ...b, minutes: Math.min(LIMITS.maxBlock, m.get(b.id)!) }));
}

/** One block's minutes; with keepTotal the other unlocked blocks absorb the change. */
export function setMinutes(bs: Block[], id: string, minutes: number, keepTotal = false): Block[] {
  const m = clampM(minutes);
  const next = bs.map((b) => (b.id === id ? { ...b, minutes: m } : { ...b }));
  if (!keepTotal) return next;
  const T = total(bs);
  const others = next.filter((b) => b.id !== id && !b.locked);
  if (!others.length) return next;
  const fixedOthers = next.filter((b) => b.id !== id && b.locked);
  const room = Math.max(others.length, T - m - total(fixedOthers));
  const scaled = rescale(others.map((b) => ({ ...b })), Math.max(LIMITS.minTotal, room)).map((b, i) => ({ ...b, minutes: i === 0 ? b.minutes + (room - Math.max(LIMITS.minTotal, room)) : b.minutes }));
  const byId = new Map(scaled.map((b) => [b.id, b]));
  return next.map((b) => byId.get(b.id) ?? b);
}

export const move = (bs: Block[], id: string, dir: -1 | 1): Block[] => {
  const i = bs.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= bs.length) return bs;
  const a = bs.slice();
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};
export const moveTo = (bs: Block[], id: string, to: number): Block[] => {
  const i = bs.findIndex((b) => b.id === id);
  if (i < 0) return bs;
  const a = bs.slice();
  const [x] = a.splice(i, 1);
  a.splice(Math.max(0, Math.min(a.length, to)), 0, x);
  return a;
};
export const remove = (bs: Block[], id: string): Block[] => (bs.length <= 1 ? bs : bs.filter((b) => b.id !== id));
export function add(bs: Block[], target: BlockTarget, minutes = 3, at?: number): Block[] {
  if (bs.length >= LIMITS.maxBlocks) return bs;
  const b: Block = { id: uid(bs, target.kind), target, minutes: clampM(minutes) };
  const a = bs.slice();
  a.splice(at ?? a.length, 0, b);
  return a;
}
export const toggleLock = (bs: Block[], id: string): Block[] => bs.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b));
/** "Less today": −50 % (≥ 1). */


export type Preset = 'suggested' | 'ear' | 'rhythm' | 'reading' | 'voice' | 'instrument' | 'quick5' | 'mistakes';
/** A preset replaces the blocks and keeps the total (§4). */
export function preset(p: Preset, totalMin: number, suggested: Block[]): Block[] {
  const T = Math.max(LIMITS.minTotal, totalMin);
  const focus = (area: DomainId, also: DomainId[]): Block[] => {
    const bs: Block[] = [{ id: 'warmup-1', target: { kind: 'warmup' }, minutes: 2 }, { id: 'area-1', target: { kind: 'area', area }, minutes: 6 }, ...also.map((a, i) => ({ id: `area-${i + 2}`, target: { kind: 'area' as const, area: a }, minutes: 2 }))];
    return rescale(bs, T);
  };
  switch (p) {
    case 'ear':
      return focus('pitch', ['memory']);
    case 'rhythm':
      return focus('time', ['memory']);
    case 'reading':
      return focus('reading', ['pitch']);
    case 'voice':
      return focus('voice', ['pitch']);
    case 'instrument':
      return focus('instrument', ['pitch']);
    case 'quick5':
      return [
        { id: 'path-1', target: { kind: 'path' }, minutes: 3 },
        { id: 'warmup-1', target: { kind: 'warmup' }, minutes: 2 },
      ];
    case 'mistakes':
      return rescale([{ id: 'warmup-1', target: { kind: 'warmup' }, minutes: 2 }, { id: 'mistakes-1', target: { kind: 'mistakes' }, minutes: 6 }], T);
    default:
      return rescale(suggested.map((b) => ({ ...b })), T);
  }
}

// ---------------------------------------------------------------- the path link (§9)

/** What a block serves next: a path step (current unit first, then the next unit), or free practice. */
export function nextForBlock(b: Block, view: PathView, done: Set<string>): { step: UnitStep; unitId: string } | { free: BlockTarget } | null {
  const cur = view.units.find((u) => u.status === 'current');
  const next = view.units.find((u) => u.status === 'projected');
  const open = (x: UnitStep) => !done.has(x.step.id) && (x.state === 'current' || x.state === 'open' || x.state === 'quick' || x.state === 'refresh' || x.state === 'locked');
  const fits = (s: PathStep): boolean => {
    const t = b.target;
    if (t.kind === 'path') return true;
    if (t.kind === 'area') return s.domain === t.area && s.kind !== 'check';
    if (t.kind === 'skill') return s.skill === t.skill && s.kind !== 'check';
    if (t.kind === 'topic') return s.topic === t.topic;
    return false;
  };
  if (b.target.kind === 'warmup' || b.target.kind === 'game' || b.target.kind === 'vocal' || b.target.kind === 'practice' || b.target.kind === 'mistakes') return { free: b.target };
  for (const u of [cur, next]) {
    if (!u) continue;
    // Inside the current unit any order; the checkpoint only when the rest is done (Path block).
    const rest = u.steps.filter((x) => x.step.kind !== 'check' && open(x));
    const pick = u.steps.find((x) => open(x) && fits(x.step) && (x.step.kind !== 'check' || rest.length === 0));
    if (pick) return { step: pick, unitId: u.id };
    if (b.target.kind === 'path') break; // the Path block never works ahead
  }
  return { free: b.target };
}

/** §9.3: how many steps of the current unit this workout should finish, by area. */
export function coverage(bs: Block[], view: PathView): { unitN: number | null; covered: number; open: number; total: number; done: number; waiting: Map<DomainId, number> } {
  const rem = unitRemaining(view);
  const open = [...rem.byArea.values()].reduce((a, x) => a + x, 0) + (rem.check ? 1 : 0);
  // Minutes that can go to path steps: the Path block (any area, in order) + each area block up to its own steps.
  let pathMin = bs.filter((b) => b.target.kind === 'path').reduce((s, b) => s + b.minutes, 0);
  let covered = 0;
  const waiting = new Map<DomainId, number>();
  const left = new Map(rem.byArea);
  for (const [a, n] of rem.byArea) {
    const mins = bs.filter((b) => b.target.kind === 'area' && b.target.area === a).reduce((s, b) => s + b.minutes, 0);
    const can = Math.min(n, Math.floor(mins / STEP_MIN));
    covered += can;
    left.set(a, n - can);
  }
  for (const [a, n] of left) {
    const can = Math.min(n, Math.floor(pathMin / STEP_MIN));
    covered += can;
    pathMin -= can * STEP_MIN;
    if (n - can > 0) waiting.set(a, n - can);
  }
  if (rem.check && waiting.size === 0 && pathMin >= CHECK_MIN) covered++;
  return { unitN: rem.unitN, covered, open, total: rem.steps, done: rem.done, waiting };
}

// ---------------------------------------------------------------- the run (§5)

export interface WorkoutRun {
  day: string;
  blocks: Block[];
  /** Index of the block in progress. */
  at: number;
  /** Active ms used per block id. */
  used: Record<string, number>;
  /** Path steps finished inside the workout. */
  steps: string[];
  /** Items answered and right, per block id. */
  items: Record<string, [number, number]>;
  finished?: boolean;
}

export const startRun = (day: string, blocks: Block[]): WorkoutRun => ({ day, blocks, at: 0, used: {}, steps: [], items: {} });
export const blockLeftMs = (r: WorkoutRun, i = r.at) => (r.blocks[i] ? Math.max(0, r.blocks[i].minutes * 60000 - (r.used[r.blocks[i].id] ?? 0)) : 0);
export const runLeftMs = (r: WorkoutRun) => r.blocks.slice(r.at).reduce((a, _b, k) => a + blockLeftMs(r, r.at + k), 0);
/** Count a session's active time (capped at 60 s per item: pauses and wandering off don't count). */
export function addSession(r: WorkoutRun, ms: number, items: number, right: number, stepId?: string): WorkoutRun {
  const b = r.blocks[r.at];
  if (!b) return r;
  const active = Math.min(ms, Math.max(1, items) * 60000);
  const cur = r.items[b.id] ?? [0, 0];
  const next: WorkoutRun = { ...r, used: { ...r.used, [b.id]: (r.used[b.id] ?? 0) + active }, items: { ...r.items, [b.id]: [cur[0] + items, cur[1] + right] }, steps: stepId ? [...r.steps, stepId] : r.steps };
  return blockLeftMs(next) <= 0 ? nextBlock(next) : next;
}
export const nextBlock = (r: WorkoutRun): WorkoutRun => (r.at + 1 >= r.blocks.length ? { ...r, at: r.blocks.length, finished: true } : { ...r, at: r.at + 1 });
export const extendBlock = (r: WorkoutRun, min = 2): WorkoutRun => ({ ...r, blocks: r.blocks.map((b, i) => (i === r.at ? { ...b, minutes: b.minutes + min } : b)) });

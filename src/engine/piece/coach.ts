// The piece coach (SPEC-PIECE §2): chunks, an accuracy-gated tempo ladder, step-back loops on the bar with the
// error, adding and joining chunks with a seam, interleaving, a warm-up on a new day, and the finish. Pure:
// every function takes the plan state and returns a new one plus what happened (for the coach's words).

import type { Piece } from './score';

export interface CoachOpts {
  /** Target tempo (quarter bpm). */
  target: number;
  /** Bars per chunk (default 4). */
  chunkBars?: number;
  /** Start from the end and work backwards (backward chaining). */
  backward?: boolean;
  /** Start tempo as a share of the target (default 0.55; spot chunks 0.4). */
  startPct?: number;
}

export type ChunkKind = 'chunk' | 'spot' | 'seam' | 'join';
export interface Chunk {
  id: string;
  kind: ChunkKind;
  from: number;
  to: number;
  /** Working tempo (bpm). */
  tempo: number;
  status: 'locked' | 'open' | 'done';
  /** Clean / not for the latest reps at this tempo (newest last, at most 5). */
  recent: boolean[];
  /** Failed reps in a row. */
  fails: number;
  /** Step-backs in a row. */
  downs: number;
  /** Highest tempo with a passed criterion. */
  best: number;
}

export interface RepResult {
  /** Share of notes right (0..1). */
  acc: number;
  /** Timing inside the tolerance. */
  timingOk: boolean;
  /** The player stopped / broke off. */
  stopped?: boolean;
  /** Bar (piece index) with the most errors, when known. */
  errorBar?: number | null;
}

export interface RepLog {
  at: string;
  chunk: string;
  tempo: number;
  acc: number;
  clean: boolean;
  /** The bar with the most errors in this rep (when known). */
  bar?: number | null;
}

/** Trouble bars (0.49): a bar that keeps failing across sessions — failures, clean passes since, the days it failed. */
export interface Trouble {
  fails: number;
  clean: number;
  days: string[];
}

export interface PlanState {
  target: number;
  backward: boolean;
  chunks: Chunk[];
  /** Base chunk ids in learning order. */
  order: string[];
  cursor: string;
  upsInRow: number;
  repsOnCursor: number;
  totalUps: number;
  /** Fix-the-bar loop after a step back. */
  loop: { chunk: string; bar: number; tempo: number; clean: number } | null;
  /** One short burst at target tempo is due (every 5th step up). */
  burst: { chunk: string } | null;
  /** Warm-up queue on a new day (chunk ids). */
  warm: string[];
  /** Trouble bars by piece bar index (0.49). */
  trouble?: Record<number, Trouble>;
  /** Trouble-bar drills queued for this session (bar indexes). */
  troubleQueue?: number[];
  day: string;
  /** Days with a clean full run at target. */
  fullRuns: string[];
  done: boolean;
  log: RepLog[];
  /**
   * Maintenance after the piece is done (SPEC-PIECE §2.10): the next spaced review run. `step` indexes MAINT_DAYS; a
   * clean run moves it on, a run that breaks down brings the piece back tomorrow one step lower. Absent on a plan
   * finished before maintenance existed — it is then due the day after its last full run.
   */
  maint?: { step: number; due: string; runs: number };
}

export type CoachEvent =
  | { k: 'stepUp'; chunk: string; tempo: number }
  | { k: 'stepBack'; chunk: string; bar: number; tempo: number }
  | { k: 'loopDone'; chunk: string }
  | { k: 'slower'; chunk: string; tempo: number }
  | { k: 'newChunk'; chunk: string }
  | { k: 'seam'; chunk: string }
  | { k: 'join'; chunk: string }
  | { k: 'rotate'; chunk: string }
  | { k: 'chunkDone'; chunk: string }
  | { k: 'burst'; chunk: string }
  | { k: 'rest' }
  | { k: 'fullRun' }
  | { k: 'pieceDone' }
  /** A maintenance run: clean → the next review in `days`; not clean → tomorrow. */
  | { k: 'reviewRun'; clean: boolean; days: number };

export interface Task {
  chunk: string;
  kind: ChunkKind | 'loop' | 'burst' | 'warm' | 'trouble' | 'review';
  from: number;
  to: number;
  tempo: number;
}

// ---------------------------------------------------------------- tuning (⚙ research defaults, SPEC-PIECE §2)

export const CLEAN_ACC = 0.95;
const FAIL_ACC = 0.8;
const UP_STREAK = 3;
const MAX_UPS_IN_ROW = 3;
const UNLOCK_AT = 0.7;
const ROTATE_EVERY = 3;
const r = (x: number) => Math.round(x);
/** Step size by how close the tempo is to the target. */
export const stepPct = (tempo: number, target: number) => (tempo < 0.7 * target ? 0.05 : tempo < 0.9 * target ? 0.03 : 0.02);

// ---------------------------------------------------------------- segmentation

/** Per-bar difficulty at the target tempo: notes per second, chord size, leaps, both hands. */
export function barDifficulty(p: Piece, target: number): number[] {
  return p.bars.map((b, i) => {
    const ns = p.notes.filter((n) => n.bar === i);
    if (!ns.length) return 0;
    const sec = (b.beats * 60) / target;
    const onsets = new Set(ns.map((n) => Math.round(n.start * 48))).size;
    const chord = ns.length / Math.max(1, onsets);
    const byHand = (h: 'R' | 'L') => ns.filter((n) => n.hand === h).sort((a, c) => a.start - c.start);
    let leaps = 0;
    for (const h of ['R', 'L'] as const) {
      const xs = byHand(h);
      for (let k = 1; k < xs.length; k++) if (Math.abs(xs[k].midi - xs[k - 1].midi) > 7) leaps++;
    }
    const hands = byHand('R').length && byHand('L').length ? 1.25 : 1;
    return (onsets / sec) * (1 + 0.15 * (chord - 1)) * hands + 0.3 * leaps;
  });
}

/** Chunks: up to `size` bars, cut at section boundaries; the hardest bars become their own spot chunk. */
export function segment(p: Piece, target: number, size = 4): { from: number; to: number; spot: boolean }[] {
  const d = barDifficulty(p, target);
  const sorted = [...d].filter((x) => x > 0).sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const hard = (i: number) => med > 0 && d[i] > 1.7 * med && d[i] - med > 1;
  const out: { from: number; to: number; spot: boolean }[] = [];
  let from = 0;
  for (let i = 0; i < p.bars.length; i++) {
    const len = i - from + 1;
    const nextBoundary = i + 1 < p.bars.length && p.bars[i + 1].boundary;
    if (hard(i) && !(len === 1 && i === from)) {
      // close the chunk before the hard bar, then the hard bar (+ a hard neighbour) as a spot
      if (i > from) out.push({ from, to: i - 1, spot: false });
      const end = i + 1 < p.bars.length && hard(i + 1) ? i + 1 : i;
      out.push({ from: i, to: end, spot: true });
      from = end + 1;
      i = end;
      continue;
    }
    if (hard(i)) {
      const end = i + 1 < p.bars.length && hard(i + 1) ? i + 1 : i;
      out.push({ from: i, to: end, spot: true });
      from = end + 1;
      i = end;
      continue;
    }
    if (len >= size || (nextBoundary && len >= 2) || i === p.bars.length - 1) {
      out.push({ from, to: i, spot: false });
      from = i + 1;
    }
  }
  // fold a dangling 1-bar chunk into its neighbour (spots stay)
  const merged: typeof out = [];
  for (const c of out) {
    const prev = merged[merged.length - 1];
    if (prev && !c.spot && !prev.spot && c.to - c.from === 0 && prev.to - prev.from + 1 < size + 1) prev.to = c.to;
    else merged.push({ ...c });
  }
  return merged;
}

// ---------------------------------------------------------------- the plan

export function initPlan(p: Piece, o: CoachOpts, day: string): PlanState {
  const segs = segment(p, o.target, o.chunkBars ?? 4);
  const start = o.startPct ?? 0.55;
  const chunks: Chunk[] = segs.map((s, i) => ({
    id: `c${i}`,
    kind: s.spot ? 'spot' : 'chunk',
    from: s.from,
    to: s.to,
    tempo: Math.max(30, r(o.target * (s.spot ? 0.4 : start))),
    status: 'locked',
    recent: [],
    fails: 0,
    downs: 0,
    best: 0,
  }));
  const order = chunks.map((c) => c.id);
  if (o.backward) order.reverse();
  chunks.find((c) => c.id === order[0])!.status = 'open';
  return { target: o.target, backward: !!o.backward, chunks, order, cursor: order[0], upsInRow: 0, repsOnCursor: 0, totalUps: 0, loop: null, burst: null, warm: [], day, fullRuns: [], done: false, log: [] };
}

const byId = (s: PlanState, id: string) => s.chunks.find((c) => c.id === id)!;
const clone = (s: PlanState): PlanState => ({ ...s, chunks: s.chunks.map((c) => ({ ...c, recent: [...c.recent] })), order: [...s.order], warm: [...s.warm], fullRuns: [...s.fullRuns], log: [...s.log], trouble: Object.fromEntries(Object.entries(s.trouble ?? {}).map(([k, v]) => [k, { ...v, days: [...v.days] }])), troubleQueue: [...(s.troubleQueue ?? [])] });

/** Bars that failed on at least two different days and are not yet clean three times since — worst first. */
export function troubleBars(s: PlanState): number[] {
  return Object.entries(s.trouble ?? {})
    .filter(([, t]) => t.days.length >= 2 && t.clean < 3)
    .sort((a, b) => b[1].fails - b[1].clean - (a[1].fails - a[1].clean))
    .map(([k]) => Number(k));
}
const share = (s: PlanState, c: Chunk) => c.tempo / s.target;

// ---------------------------------------------------------------- maintenance (SPEC-PIECE §2.10)

/** Days between review runs of a learned piece: 1, 3, 7, 14, then longer (the last gap repeats). */
export const MAINT_DAYS = [1, 3, 7, 14, 30, 60, 90];
const addDay = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day; // not a calendar day (tests use 'd1', 'd2' …)
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};
/** The maintenance state of a done plan (a plan finished before maintenance existed starts at step 0). */
export function maintOf(s: PlanState): { step: number; due: string; runs: number } | null {
  if (!s.done) return null;
  if (s.maint) return s.maint;
  const lastRun = [...s.fullRuns].sort().pop() ?? s.day;
  return { step: 0, due: addDay(lastRun, MAINT_DAYS[0]), runs: 0 };
}
/** A learned piece whose review run is due on `day`. */
export const reviewDue = (s: PlanState, day: string): boolean => {
  const m = maintOf(s);
  return !!m && m.due <= day;
};

/** A new practice day: yesterday's open chunks first, a little slower (retrieval warm-up). */
export function startDay(st: PlanState, day: string): PlanState {
  if (st.day === day) return st;
  if (st.done) {
    // A learned piece: on a review day, its weakest bars first (weighted to weak bars), then one full run.
    if (!reviewDue(st, day)) return st;
    const s = clone(st);
    s.day = day;
    s.maint = maintOf(st)!;
    s.troubleQueue = troubleBars(s).slice(0, 2);
    s.warm = [];
    s.loop = null;
    s.burst = null;
    return s;
  }
  const s = clone(st);
  s.day = day;
  s.warm = s.chunks.filter((c) => c.status !== 'locked' && c.best > 0).sort((a, b) => a.from - b.from).map((c) => c.id).slice(0, 3);
  s.loop = null;
  s.burst = null;
  s.upsInRow = 0;
  s.troubleQueue = troubleBars(s).slice(0, 2);
  return s;
}

/** What to play next. */
export function nextTask(s: PlanState): Task | null {
  if (s.done) {
    if (!reviewDue(s, s.day)) return null;
    if (s.troubleQueue?.length) {
      const bar = s.troubleQueue[0];
      const c = s.chunks.find((x) => x.kind !== 'join' && bar >= x.from && bar <= x.to) ?? s.chunks[0];
      return { chunk: c.id, kind: 'trouble', from: Math.max(c.from, bar - (bar > c.from ? 1 : 0)), to: bar, tempo: Math.max(30, r(s.target * 0.85)) };
    }
    const end = lastBar(s);
    const whole = s.chunks.find((x) => x.kind === 'join' && x.from === 0 && x.to === end) ?? s.chunks[0];
    return { chunk: whole.id, kind: 'review', from: 0, to: end, tempo: s.target };
  }
  if (s.warm.length) {
    const c = byId(s, s.warm[0]);
    return { chunk: c.id, kind: 'warm', from: c.from, to: c.to, tempo: Math.max(30, r(c.tempo * 0.95)) };
  }
  if (s.troubleQueue?.length) {
    const bar = s.troubleQueue[0];
    const c = s.chunks.find((x) => x.kind !== 'join' && bar >= x.from && bar <= x.to) ?? s.chunks[0];
    return { chunk: c.id, kind: 'trouble', from: Math.max(c.from, bar - (bar > c.from ? 1 : 0)), to: bar, tempo: Math.max(30, r(Math.max(c.best, c.tempo) * 0.85)) };
  }
  if (s.loop) {
    const c = byId(s, s.loop.chunk);
    // the error bar with one beat of lead-in is shown as the bar before it when there is one
    return { chunk: c.id, kind: 'loop', from: Math.max(c.from, s.loop.bar - (s.loop.bar > c.from ? 1 : 0)), to: s.loop.bar, tempo: s.loop.tempo };
  }
  if (s.burst) {
    const c = byId(s, s.burst.chunk);
    return { chunk: c.id, kind: 'burst', from: c.from, to: c.from, tempo: s.target };
  }
  const c = byId(s, s.cursor);
  return { chunk: c.id, kind: c.kind, from: c.from, to: c.to, tempo: c.tempo };
}

/** The open chunk that needs work most (lowest share of the target), other than `not`. */
function weakest(s: PlanState, not?: string): Chunk | null {
  const open = s.chunks.filter((c) => c.status === 'open' && c.id !== not);
  if (!open.length) return null;
  return open.sort((a, b) => share(s, a) - share(s, b) || a.from - b.from)[0];
}

/** Record one rep of the current task. */
export function recordRep(st: PlanState, task: Task, res: RepResult, now: Date): { state: PlanState; events: CoachEvent[] } {
  const s = clone(st);
  const ev: CoachEvent[] = [];
  const clean = res.acc >= CLEAN_ACC && res.timingOk && !res.stopped;
  s.log = [...s.log, { at: now.toISOString(), chunk: task.chunk, tempo: task.tempo, acc: Math.round(res.acc * 1000) / 1000, clean, bar: res.errorBar ?? null }].slice(-2000);
  const c = byId(s, task.chunk);
  // trouble memory: a failing bar is remembered with the day; clean passes over it count down
  s.trouble ??= {};
  if (!clean && res.errorBar !== null && res.errorBar !== undefined) {
    const t = (s.trouble[res.errorBar] ??= { fails: 0, clean: 0, days: [] });
    t.fails++;
    t.clean = 0;
    if (!t.days.includes(s.day)) t.days = [...t.days, s.day].slice(-10);
  } else if (clean) for (let b = task.from; b <= task.to; b++) if (s.trouble[b]) s.trouble[b].clean++;
  if (task.kind === 'review') {
    const m = maintOf(s) ?? { step: 0, due: s.day, runs: 0 };
    const step = clean ? Math.min(MAINT_DAYS.length - 1, m.step + 1) : Math.max(0, m.step - 1);
    const days = clean ? MAINT_DAYS[step] : 1;
    s.maint = { step, due: addDay(s.day, days), runs: m.runs + 1 };
    s.troubleQueue = [];
    ev.push({ k: 'reviewRun', clean, days });
    return { state: s, events: ev };
  }
  if (task.kind === 'trouble') {
    // two clean takes of the trouble bar retire it for today
    const bar = task.to;
    const lastTwo = s.log.filter((x) => x.chunk === task.chunk).slice(-2);
    if (clean && lastTwo.length === 2 && lastTwo.every((x) => x.clean)) s.troubleQueue = (s.troubleQueue ?? []).filter((x) => x !== bar);
    return { state: s, events: ev };
  }

  if (task.kind === 'warm') {
    s.warm.shift();
    if (!clean) {
      c.tempo = Math.max(30, r(c.tempo * (1 - stepPct(c.tempo, s.target))));
      ev.push({ k: 'slower', chunk: c.id, tempo: c.tempo });
    }
    return { state: s, events: ev };
  }
  if (task.kind === 'burst') {
    s.burst = null;
    return { state: s, events: ev };
  }
  if (task.kind === 'loop' && s.loop) {
    if (clean) s.loop.clean++;
    if (s.loop.clean >= 2) {
      s.loop = null;
      ev.push({ k: 'loopDone', chunk: c.id });
    }
    return { state: s, events: ev };
  }

  s.repsOnCursor++;
  c.recent = [...c.recent, clean].slice(-5);
  if (clean) {
    c.fails = 0;
    c.downs = 0;
  } else c.fails++;

  const streak = (() => {
    let k = 0;
    for (let i = c.recent.length - 1; i >= 0 && c.recent[i]; i--) k++;
    return k;
  })();
  const passed = streak >= UP_STREAK || (c.recent.length >= 5 && c.recent.filter(Boolean).length >= 4 && clean);

  if (passed) {
    c.best = Math.max(c.best, c.tempo);
    c.recent = [];
    const isWhole = c.kind === 'join' && c.from === 0 && c.to === lastBar(s);
    if (c.tempo >= s.target) {
      // the whole piece stays open until two clean full runs on different days (below)
      if (c.status !== 'done' && !isWhole) {
        c.status = 'done';
        ev.push({ k: 'chunkDone', chunk: c.id });
      }
    } else {
      c.tempo = Math.min(s.target, Math.max(c.tempo + 1, r(c.tempo * (1 + stepPct(c.tempo, s.target)))));
      s.upsInRow++;
      s.totalUps++;
      ev.push({ k: 'stepUp', chunk: c.id, tempo: c.tempo });
      if (s.totalUps % 5 === 0 && c.kind !== 'seam') {
        s.burst = { chunk: c.id };
        ev.push({ k: 'burst', chunk: c.id });
      }
    }
    grow(s, c, ev);
  } else if (!clean && (c.fails >= 2 || res.acc < FAIL_ACC)) {
    c.fails = 0;
    c.downs++;
    c.recent = [];
    const bar = res.errorBar ?? c.from;
    s.loop = { chunk: c.id, bar: Math.max(c.from, Math.min(c.to, bar)), tempo: Math.max(30, r(c.tempo * 0.9)), clean: 0 };
    ev.push({ k: 'stepBack', chunk: c.id, bar: s.loop.bar, tempo: s.loop.tempo });
    if (c.downs >= 3) {
      c.downs = 0;
      c.tempo = Math.max(30, r(c.tempo * 0.95));
      ev.push({ k: 'slower', chunk: c.id, tempo: c.tempo });
    }
  }

  // Whole piece at target: a clean full run counts once per day; two days → done.
  const whole = s.chunks.find((x) => x.kind === 'join' && x.from === 0 && x.to === lastBar(s));
  if (whole && whole.id === c.id && clean && c.tempo >= s.target && !s.fullRuns.includes(s.day)) {
    s.fullRuns = [...s.fullRuns, s.day];
    ev.push({ k: 'fullRun' });
    if (s.fullRuns.length >= 2) {
      s.done = true;
      s.maint = { step: 0, due: addDay(s.day, MAINT_DAYS[0]), runs: 0 };
      ev.push({ k: 'pieceDone' });
      return { state: s, events: ev };
    }
  }

  // Interleave: after a few step-ups in a row, or a few reps, move to the weakest other open chunk.
  const open = s.chunks.filter((x) => x.status === 'open');
  const due = s.upsInRow >= MAX_UPS_IN_ROW || (open.length >= 3 && s.repsOnCursor >= ROTATE_EVERY + (clean ? 1 : 0));
  if ((due || c.status === 'done') && !s.loop) {
    const w = weakest(s, c.id);
    if (w) {
      s.cursor = w.id;
      s.upsInRow = 0;
      s.repsOnCursor = 0;
      ev.push({ k: 'rotate', chunk: w.id });
    } else if (c.status === 'done') {
      const any = s.chunks.find((x) => x.status === 'open');
      if (any) s.cursor = any.id;
    }
  }

  // Fatigue: the last 9 reps in 3 blocks, each block worse than the one before → suggest a break.
  const last = s.log.slice(-9);
  if (last.length === 9) {
    const blk = [0, 3, 6].map((k) => last.slice(k, k + 3).reduce((a, x) => a + x.acc, 0) / 3);
    if (blk[0] > blk[1] + 0.02 && blk[1] > blk[2] + 0.02) ev.push({ k: 'rest' });
  }
  return { state: s, events: ev };
}

const lastBar = (s: PlanState) => Math.max(...s.chunks.filter((c) => c.kind === 'chunk' || c.kind === 'spot').map((c) => c.to));

/** After a step up: open the next base chunk, then a seam, then the joined block. */
function grow(s: PlanState, c: Chunk, ev: CoachEvent[]) {
  const base = s.order.map((id) => byId(s, id));
  const idx = base.findIndex((b) => b.id === c.id);
  // 1. the next base chunk opens when this one reaches 70 % of the target
  if (idx >= 0 && share(s, c) >= UNLOCK_AT) {
    const next = base[idx + 1];
    if (next && next.status === 'locked') {
      next.status = 'open';
      next.tempo = Math.max(next.tempo, Math.min(r(c.tempo * 0.9), s.target));
      if (next.kind === 'spot') next.tempo = Math.max(30, r(next.tempo * 0.85));
      s.cursor = next.id;
      s.upsInRow = 0;
      s.repsOnCursor = 0;
      ev.push({ k: 'newChunk', chunk: next.id });
      return;
    }
  }
  // 2. a base chunk that just passed its first step, and whose predecessor is open → the seam between them
  if (idx > 0 && c.best > 0) {
    const prev = base[idx - 1];
    const [a, b] = prev.from < c.from ? [prev, c] : [c, prev];
    const seamId = `s${a.id}-${b.id}`;
    if (!s.chunks.some((x) => x.id === seamId)) {
      s.chunks.push({ id: seamId, kind: 'seam', from: a.to, to: b.from, tempo: Math.min(a.tempo, b.tempo), status: 'open', recent: [], fails: 0, downs: 0, best: 0 });
      s.cursor = seamId;
      s.upsInRow = 0;
      s.repsOnCursor = 0;
      ev.push({ k: 'seam', chunk: seamId });
      return;
    }
  }
  // 3. a seam that passed → the joined block of everything learned so far (replaces the previous join)
  if (c.kind === 'seam' && c.best > 0) {
    const learned = base.filter((b) => b.status !== 'locked');
    const from = Math.min(...learned.map((b) => b.from));
    const to = Math.max(...learned.map((b) => b.to));
    const joinId = `j${from}-${to}`;
    if (!s.chunks.some((x) => x.id === joinId)) {
      for (const old of s.chunks) if (old.kind === 'join' && old.status === 'open') old.status = 'done';
      c.status = 'done';
      s.chunks.push({ id: joinId, kind: 'join', from, to, tempo: Math.min(...learned.map((b) => b.tempo)), status: 'open', recent: [], fails: 0, downs: 0, best: 0 });
      s.cursor = joinId;
      s.upsInRow = 0;
      s.repsOnCursor = 0;
      ev.push({ k: 'join', chunk: joinId });
    }
  }
}

// ---------------------------------------------------------------- views

/** Per bar: the best tempo any chunk covering it reached, as a share of the target (0..1) — the heat-map. */
export function barMastery(s: PlanState, bars: number): number[] {
  const out = new Array<number>(bars).fill(0);
  for (const c of s.chunks) for (let b = c.from; b <= c.to && b < bars; b++) out[b] = Math.max(out[b], Math.min(1, (c.status === 'done' ? s.target : c.best) / s.target));
  return out;
}

/** Overall progress 0..1 (the mean bar mastery; 1 only when the piece is done). */
export function planProgress(s: PlanState, bars: number): number {
  if (s.done) return 1;
  const m = barMastery(s, bars);
  return Math.min(0.99, m.reduce((a, b) => a + b, 0) / Math.max(1, bars));
}

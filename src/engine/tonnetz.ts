// Tonnetz (Symmetry unit, owner 2026-11-19): a single-player game on the Tonnetz — the grid of fifths (across) and
// major thirds (up to the right), where every triangle is a triad (pointing up: major, down: minor) and P, L, R flip
// a triangle over one of its edges. Start on a triad, reach the target triad with the fewest P / L / R moves; every
// move plays the chord. A round is right when it reaches the target in the fewest moves possible (its par).
//
// Tiers: pp one move · p two · mp three (the chromatic mediants and beyond), the target named and shown on the grid;
// mf one or two · f two or three · ff three or four, the target heard only (no name, not shown). Distances and the
// shortest chains come from src/engine/symmetry.ts (breadth first over the 24 triads). Pure.

import { ALL_TRIADS, applyChain, applyOp, chainPath, distance, mod12, OPS, sameTriad, shortestChains, triadName, type Op, type Triad } from './symmetry';
import { itemSeed, pickOf, rng } from './newGamesKit';
import type { DynName } from './courseSocial';

export const TZ_ITEMS = 6;
export const tzLevel = (t: DynName): number => ({ pp: 1, p: 2, mp: 3, mf: 4, f: 5, ff: 6 })[t];
/** The distances a level asks (moves at par) and whether the target is heard only. */
export const TZ_LEVELS: { dist: number[]; ear: boolean }[] = [
  { dist: [1], ear: false },
  { dist: [2], ear: false },
  { dist: [3], ear: false },
  { dist: [1, 2], ear: true },
  { dist: [2, 3], ear: true },
  { dist: [3, 4], ear: true },
];
const spec = (level: number) => TZ_LEVELS[Math.max(1, Math.min(6, Math.round(level))) - 1];
/** Moves allowed in a round before it ends unsolved: par + 3. */
export const tzLimit = (par: number): number => par + 3;

export interface TzItem {
  start: Triad;
  target: Triad;
  /** The fewest moves from start to target. */
  par: number;
  /** The target is heard only (not named, not shown). */
  ear: boolean;
}
/** Round i of a run: a start triad and a target at one of the level's distances. */
export function tzItem(seed: number, level: number, i: number): TzItem {
  const sp = spec(level);
  const rnd = rng(itemSeed(seed, i) ^ 0x7012);
  const start: Triad = { root: Math.floor(rnd() * 12), minor: rnd() < 0.4 };
  const par = pickOf(rnd, sp.dist);
  const target = pickOf(rnd, ALL_TRIADS.filter((t) => distance(start, t) === par));
  return { start, target, par, ear: sp.ear };
}

// ---------------------------------------------------------------- the grid

/** The pitch class at node (i, j): i steps of a fifth across, j steps of a major third up to the right, from `base`. */
export const nodePc = (base: number, i: number, j: number): number => mod12(base + 7 * i + 4 * j);
/** Screen position of a node on a unit grid (y grows down). */
export const nodeXY = (i: number, j: number): [number, number] => [i + j / 2, (-j * Math.sqrt(3)) / 2];
/** The triangle up from node (i, j) is the major triad on that node; the one down from it (nodes (i+1, j), (i, j+1),
 *  (i+1, j+1)) is the minor triad on (i, j+1)'s note. */
export const upTriad = (base: number, i: number, j: number): Triad => ({ root: nodePc(base, i, j), minor: false });
export const downTriad = (base: number, i: number, j: number): Triad => ({ root: nodePc(base, i, j + 1), minor: true });
/** The base that puts triad `t` in the centre triangle (up at (0, 0) for major, down at (0, 0) for minor). */
export const baseFor = (t: Triad): number => mod12(t.minor ? t.root - 4 : t.root);
export interface TzCell {
  i: number;
  j: number;
  up: boolean;
  triad: Triad;
  /** Corner nodes (i, j pairs). */
  nodes: [number, number][];
}
/** The triangles of a window around the centre (rows −2 … 2, columns that fit the width), for a base. */
export function tzCells(base: number, half = 3): TzCell[] {
  const out: TzCell[] = [];
  for (let j = -2; j <= 2; j++)
    for (let i = -half - 2; i <= half + 2; i++) {
      const up: [number, number][] = [[i, j], [i + 1, j], [i, j + 1]];
      const dn: [number, number][] = [[i + 1, j], [i, j + 1], [i + 1, j + 1]];
      const inside = (ns: [number, number][]) => ns.every(([a, b]) => Math.abs(nodeXY(a, b)[0]) <= half + 0.01);
      if (inside(up)) out.push({ i, j, up: true, triad: upTriad(base, i, j), nodes: up });
      if (inside(dn)) out.push({ i, j, up: false, triad: downTriad(base, i, j), nodes: dn });
    }
  return out;
}
/** The triangle a move from the centre lands on (P across the fifth edge, R across the third edge, L across the other). */
export function neighbourCell(t: Triad, op: Op): { i: number; j: number; up: boolean } {
  if (!t.minor) return op === 'P' ? { i: 0, j: -1, up: false } : op === 'R' ? { i: -1, j: 0, up: false } : { i: 0, j: 0, up: false };
  return op === 'P' ? { i: 0, j: 1, up: true } : op === 'R' ? { i: 1, j: 0, up: true } : { i: 0, j: 0, up: true };
}

// ---------------------------------------------------------------- the run

export interface TzSave {
  v: 1;
  game: 'tonnetz';
  seed: number;
  tier?: DynName;
  level: number;
  /** Round index. */
  i: number;
  /** The moves made so far in round i (resumes mid-round). */
  moves: Op[];
  right: number;
  wrong: number;
  score: number;
}
export const newTzSave = (seed: number, level: number, tier?: DynName): TzSave => ({ v: 1, game: 'tonnetz', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), i: 0, moves: [], right: 0, wrong: 0, score: 0, ...(tier ? { tier } : {}) });
export function isTzSave(x: unknown): x is TzSave {
  const s = x as TzSave | null;
  return !!s && s.v === 1 && s.game === 'tonnetz' && typeof s.seed === 'number' && typeof s.i === 'number' && s.i < TZ_ITEMS && Array.isArray(s.moves) && s.moves.every((m) => (OPS as string[]).includes(m));
}
export const tzOver = (s: TzSave): boolean => s.i >= TZ_ITEMS;
/** Where the player stands in the current round. */
export const tzCurrent = (s: TzSave): Triad => applyChain(tzItem(s.seed, s.level, s.i).start, s.moves);
/** Points for a round: 10 a move at par (× the level), 3 a move when reached over par, none when unsolved. */
export const tzPoints = (par: number, moves: number, reached: boolean, level: number): number => (!reached ? 0 : moves <= par ? Math.round(10 * par * (1 + 0.1 * (level - 1))) : 3 * par);

export interface TzStep {
  save: TzSave;
  /** The triad after the move. */
  now: Triad;
  /** The round ended with this move (reached, or out of moves). */
  ended: boolean;
  reached: boolean;
  /** Reached at par. */
  perfect: boolean;
  gained: number;
  /** The moves of the finished round (for the feedback line). */
  used: number;
}
/** One move: apply it; the round ends on the target (right at par) or when the moves run out. */
export function tzMove(s: TzSave, op: Op): TzStep {
  const item = tzItem(s.seed, s.level, s.i);
  const moves = [...s.moves, op];
  const now = applyChain(item.start, moves);
  const reached = sameTriad(now, item.target);
  const out = !reached && moves.length >= tzLimit(item.par);
  if (!reached && !out) return { save: { ...s, moves }, now, ended: false, reached: false, perfect: false, gained: 0, used: moves.length };
  const perfect = reached && moves.length <= item.par;
  const gained = tzPoints(item.par, moves.length, reached, s.level);
  return {
    save: { ...s, i: s.i + 1, moves: [], right: s.right + (perfect ? 1 : 0), wrong: s.wrong + (perfect ? 0 : 1), score: s.score + gained },
    now,
    ended: true,
    reached,
    perfect,
    gained,
    used: moves.length,
  };
}
export function tzResult(s: TzSave) {
  return { game: 'tonnetz' as const, score: s.score, detail: { right: s.right, wrong: s.wrong, level: s.level, items: s.i, ...(s.tier ? { tier: s.tier } : {}) } };
}
/** One line on a round not at par ("Why?"): a shortest way. */
export function tzWhy(item: TzItem, lang: 'en' | 'he'): string {
  const w = shortestChains(item.start, item.target)[0] ?? [];
  const path = chainPath(item.start, w).map(triadName).join(' → ');
  return lang === 'he' ? `הדרך הקצרה (${w.length}): ${w.join(' ')} · ${path}` : `Shortest (${w.length}): ${w.join(' ')} · ${path}`;
}
/** The triad an operation would reach from here (for the move buttons' hints). */
export const tzPreview = (t: Triad, op: Op): Triad => applyOp(t, op);

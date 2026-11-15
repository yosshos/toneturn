// A run of cases with three lives (shared by the 2026-11-15 new games: Border Control, Which Brother?, Elevator): a
// seeded run (the same seed and case index give the same case, so a saved run resumes exactly), a speed factor, a
// score, right / wrong counts and the result detail every game reports (tier, right, wrong, level, accuracy). Pure.

import type { DynName } from './courseSocial';

export const CASE_LIVES = 3;

export interface CaseRun<G extends string = string> {
  v: 1;
  game: G;
  seed: number;
  tier: DynName;
  level: number;
  /** Cases answered (= the index of the current case). */
  i: number;
  /** Cases in a full run (the run ends there, or when the lives run out). */
  cases: number;
  lives: number;
  right: number;
  wrong: number;
  score: number;
  /** Units right / asked inside the cases (Border Control: two stamps a case). */
  parts: { right: number; total: number };
  over: boolean;
  /** How the run was answered: 'choice' (ear), 'midi' or 'touch' (on-screen keys, practice). */
  input?: string;
}

export function newCaseRun<G extends string>(game: G, seed: number, tier: DynName, level: number, cases: number, input?: string): CaseRun<G> {
  return { v: 1, game, seed: seed >>> 0, tier, level, i: 0, cases, lives: CASE_LIVES, right: 0, wrong: 0, score: 0, parts: { right: 0, total: 0 }, over: false, ...(input ? { input } : {}) };
}

export function isCaseRun<G extends string>(x: unknown, game: G): x is CaseRun<G> {
  const s = x as CaseRun<G> | null;
  return !!s && s.v === 1 && s.game === game && typeof s.seed === 'number' && typeof s.i === 'number' && !s.over && s.lives > 0 && s.i < s.cases;
}

/** Speed factor: 1.5 when answered within 3 s of the end of the sound, falling to 1 at 20 s. */
export const speedFactor = (ms: number) => 1 + 0.5 * Math.max(0, Math.min(1, 1 - (ms - 3000) / 17000));

/**
 * Answer the current case. `got` / `of`: units right of the case's units (a case is right when all are right); `base`:
 * points for a fully right case (a part-right case earns its share). A wrong case costs a life.
 */
export function answerCaseRun<G extends string>(s: CaseRun<G>, got: number, of: number, ms: number, base = 10): { save: CaseRun<G>; ok: boolean; gained: number } {
  const ok = got >= of;
  const gained = Math.round(base * (of ? got / of : 0) * speedFactor(ms) * (1 + 0.1 * (s.level - 1)));
  const lives = ok ? s.lives : Math.max(0, s.lives - 1);
  const i = s.i + 1;
  const save: CaseRun<G> = {
    ...s,
    i,
    lives,
    score: s.score + gained,
    right: s.right + (ok ? 1 : 0),
    wrong: s.wrong + (ok ? 0 : 1),
    parts: { right: s.parts.right + got, total: s.parts.total + of },
    over: lives === 0 || i >= s.cases,
  };
  return { save, ok, gained };
}

/** The result every game records (XP, tiers, ratings, boards read it). */
export function caseRunResult<G extends string>(s: CaseRun<G>, extra: Record<string, unknown> = {}) {
  const accuracy = s.parts.total ? Math.round((100 * s.parts.right) / s.parts.total) : 0;
  return { game: s.game, score: s.score, detail: { tier: s.tier, right: s.right, wrong: s.wrong, level: s.level, accuracy, cases: s.i, ...(s.input ? { input: s.input } : {}), ...extra } };
}

/** A seeded generator for case `i` of a run (attempt `a` for re-draws). */
export const caseSeed = (seed: number, i: number, a = 0) => (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(a + 1, 0xc2b2ae35)) >>> 0;

export const mod12 = (n: number) => ((n % 12) + 12) % 12;

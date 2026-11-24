// The stretch factor (docs/SPEC-PRACTICE-SESSION.md §11.3, owner-approved 2026-11-24). Pure.
//
// XP = effort that stretches. A take or an answer earns its base XP × a band factor:
//   stretch ×1.5   leaving the comfort zone (a new clean best, at or above the last clean tempo while not closed, a tier
//                  above the player's, a rarely played key not closed yet, the weaker channel or area, a first clean take);
//   work    ×1     learning / almost at the working tempo, the rubato and slow stages of an item not yet closed, due reviews;
//   comfort ×0.3   a closed item not due, more than 10 % under the clean best, two tiers or more below, the 4th easy take
//                  in a row on the same item.
// The first rule that applies wins (stretch, then work, then comfort). The same item pays full for 6 takes a day, half
// up to 15, then nothing (the daily cap). Lessons and ear answers follow the Elo expected score instead.

import type { ItemStatus } from './drills/itemStatus';

export type Band = 'stretch' | 'work' | 'comfort';
export const BAND_FACTOR: Record<Band, number> = { stretch: 1.5, work: 1, comfort: 0.3 };

/** Why the band was given (the first rule that applied), for the take's line and the tests. */
export type BandReason =
  | 'record' // a new clean best tempo
  | 'push' // at or above the item's previous clean tempo while it is not closed
  | 'tierUp' // the item is a tier above the player's
  | 'rareKey' // a key / scale not closed yet and played in fewer than 3 sessions
  | 'weakChannel'
  | 'weakArea'
  | 'firstClean' // the first clean take of a new item
  | 'slowStage' // the rubato or slow stage of an item not closed yet
  | 'due' // a due review
  | 'working' // learning / almost at the working tempo
  | 'closed' // a closed item that is not due
  | 'slow' // more than 10 % under the clean best
  | 'tierDown' // two tiers or more below the player's
  | 'easyRun' // the 4th easy take in a row
  | 'other'; // nothing above applied (work)

/** Everything the band reads; all of it exists in the app already (see each field). */
export interface TakeBandInput {
  /** The item's status BEFORE this take (drills/itemStatus.ts itemStatus). */
  status: ItemStatus;
  /** The take was clean (TakeMetrics.verdict === 'clean'). */
  clean: boolean;
  /** The take's tempo (♩). */
  takeBpm: number;
  /** The item's clean best tempo BEFORE this take (ItemState.cleanBpm; 0 = none yet). */
  bestBpm: number;
  /** The tempo of the item's previous clean take (ItemState.history's last entry; 0 / absent = none). */
  prevCleanBpm?: number;
  /** The item's target tempo (ItemState.targetBpm / itemTargetBpm). */
  targetBpm?: number;
  /** A spaced review is due on the item or its cell (keyMatrix cellDue ≤ today, or the FSRS due date). */
  due?: boolean;
  /** drills/tiers.ts itemTier. */
  itemTier?: number;
  /** drills/tiers.ts playerTier (−1 = unknown: the tier rules are skipped). */
  playerTier?: number;
  /** Easy takes in a row on this item, this one included (coach.ts easyTake per take; 0 when this take was not easy). */
  easyRun?: number;
  /** Sessions in which the player played this key / scale (the key of the item). */
  keySessions?: number;
  /** The key / scale is closed (its cells closed at the player's level). */
  keyClosed?: boolean;
  /** The take was in the player's weaker channel (SPEC-EAR-AND-READING §5). */
  weakerChannel?: boolean;
  /** The take was in the course's weaker area, beyond its planned share (§11.5). */
  weakerArea?: boolean;
  /** The coach's stage for the item (rubato.ts / coachStage): 'rubato' and 'slow' are the method, not comfort. */
  stage?: 'rubato' | 'slow' | 'tempo';
}

export interface TakeBand {
  band: Band;
  factor: number;
  reason: BandReason;
  /** For comfort: the tempo to try next (♩) — the line always says how to stretch. */
  tryBpm?: number;
}

/** A take at least this share of the clean best is at the working tempo; under it the take is "slow" (comfort). */
export const SLOW_SHARE = 0.9;
/** A key / scale played in fewer sessions than this is "rarely played". */
export const RARE_KEY_SESSIONS = 3;
/** The easy take in a row from which the item is comfort. */
export const EASY_RUN = 4;

const band = (b: Band, reason: BandReason, tryBpm?: number): TakeBand => ({ band: b, factor: BAND_FACTOR[b], reason, ...(tryBpm ? { tryBpm } : {}) });

/** The tempo the comfort line suggests: back to the clean best, or a step (6 %) above it. */
export function stretchTempo(x: Pick<TakeBandInput, 'takeBpm' | 'bestBpm' | 'targetBpm' | 'status'>): number {
  const best = Math.max(0, x.bestBpm || 0);
  if (best > 0 && x.takeBpm < SLOW_SHARE * best) return Math.round(best);
  return Math.round(Math.max(best, x.takeBpm || 0, 30) * 1.06);
}

/** The take's band (§11.3): the first rule that applies wins — stretch, then work, then comfort. */
export function takeBand(x: TakeBandInput): TakeBand {
  const best = Math.max(0, x.bestBpm || 0);
  const prev = Math.max(0, x.prevCleanBpm ?? 0);
  const closed = x.status === 'closed';
  const tiers = x.playerTier !== undefined && x.playerTier >= 0 && x.itemTier !== undefined;
  // ---- stretch
  if (x.clean && best > 0 && x.takeBpm > best + 0.5) return band('stretch', 'record');
  if (!closed && prev > 0 && x.takeBpm >= prev - 0.5) return band('stretch', 'push');
  if (tiers && x.itemTier! >= x.playerTier! + 1) return band('stretch', 'tierUp');
  if (!x.keyClosed && x.keySessions !== undefined && x.keySessions < RARE_KEY_SESSIONS) return band('stretch', 'rareKey');
  if (x.weakerChannel) return band('stretch', 'weakChannel');
  if (x.weakerArea) return band('stretch', 'weakArea');
  if (x.clean && best <= 0) return band('stretch', 'firstClean');
  // ---- work
  if (!closed && (x.stage === 'rubato' || x.stage === 'slow')) return band('work', 'slowStage');
  if (x.due) return band('work', 'due');
  const atWorking = best <= 0 || x.takeBpm >= SLOW_SHARE * best - 1e-9;
  if ((x.status === 'learning' || x.status === 'almost') && atWorking && (x.easyRun ?? 0) < EASY_RUN) return band('work', 'working');
  // ---- comfort
  const tryBpm = stretchTempo(x);
  if (closed) return band('comfort', 'closed', tryBpm);
  if (!atWorking) return band('comfort', 'slow', tryBpm);
  if (tiers && x.itemTier! <= x.playerTier! - 2) return band('comfort', 'tierDown', tryBpm);
  if ((x.easyRun ?? 0) >= EASY_RUN) return band('comfort', 'easyRun', tryBpm);
  return band('work', 'other');
}

/** Lessons and ear questions (§11.3): by the Elo expected score (rating.ts expected). */
export function answerFactor(expected: number): number {
  if (!Number.isFinite(expected)) return 1;
  if (expected >= 0.95) return 0.5;
  if (expected < 0.6) return 1.3;
  return 1;
}

/** The daily cap per item (§11.3): takes 1–6 full, 7–15 half, then nothing. `nth` counts from 1. */
export function dailyRepeatFactor(nth: number): number {
  if (!(nth > 6)) return 1;
  if (nth <= 15) return 0.5;
  return 0;
}

/** The Momentum boost (§11.4): +10 % on stretch XP the week after a week at ≥ 80; never compounding. */
export function stretchXp(base: number, b: Pick<TakeBand, 'band' | 'factor'>, nthToday = 1, boost = 0): number {
  if (!(base > 0)) return 0;
  const up = b.band === 'stretch' ? 1 + Math.max(0, Math.min(0.1, boost)) : 1;
  return Math.round(base * b.factor * dailyRepeatFactor(nthToday) * up);
}

/** An answer's XP (lessons, ear): base × answerFactor × the daily cap. */
export const answerXp = (base: number, expected: number, nthToday = 1): number => (base > 0 ? Math.round(base * answerFactor(expected) * dailyRepeatFactor(nthToday)) : 0);

// ---------------------------------------------------------------- the take's line

export type T2 = { he: string; en: string };

/** The small line after a take (§11.3): the band is never hidden, and comfort always says how to stretch. */
export function bandLine(b: TakeBand): T2 {
  if (b.band === 'stretch') return { he: 'מתיחה ×1.5', en: 'Stretch ×1.5' };
  if (b.band === 'comfort') {
    const bpm = b.tryBpm ? ` ♩${b.tryBpm}` : '';
    return { he: `אזור נוחות: נסו${bpm}`, en: `Comfort zone: try${bpm}` };
  }
  return { he: 'עבודה ×1', en: 'Work ×1' };
}

// ---------------------------------------------------------------- today's counts (the cap) and the band minutes

/** Takes per item today (the daily cap). A new day starts empty. */
export interface TakeCounts {
  day: string;
  n: Record<string, number>;
}

/** Count one take of an item: the new counts and this take's place today (1 = the first). */
export function bumpTake(c: TakeCounts | undefined, day: string, itemId: string): [TakeCounts, number] {
  const n = c && c.day === day ? { ...c.n } : {};
  n[itemId] = (n[itemId] ?? 0) + 1;
  return [{ day, n }, n[itemId]];
}

/** Active time per band (§11.6: "18 of them outside your comfort zone"), per session or per day. */
export type BandMs = Record<Band, number>;
export const emptyBandMs = (): BandMs => ({ stretch: 0, work: 0, comfort: 0 });
export const addBandMs = (t: BandMs | undefined, b: Band, ms: number): BandMs => {
  const out = { ...(t ?? emptyBandMs()) };
  if (ms > 0) out[b] += Math.round(ms);
  return out;
};

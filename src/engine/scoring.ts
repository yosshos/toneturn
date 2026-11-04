// Scoring model (spec addendum J): one evidence record per answer → three scores
// (skill rating, XP, tournament points). All weights live in SCORING; records are stored raw.

import type { Answer, Question } from './lesson';
import { gradeMelody } from './memory';
import type { SungResult } from './sing';

export const SCORING = {
  /** Sung pitch: full credit within ±tolerance, linear to 0 at ±zeroAt cents. */
  pitch: { tolerance: 35, zeroAt: 100 },
  /** Attempt credit for graded items (no guessing correction): index = attempt number − 1. */
  gradedAttempts: [1, 0.5, 0.25],
  /** Reference answer times (ms). */
  tRef: { buttons: 1500, perExtraChoice: 300, voice: 2000, sing: 1000, perExtraNote: 600, symbolic: 1000 },
  /** f(t) = clamp(1 − slope·log2(t / Tref), floor, 1). */
  speed: { slope: 0.25, floor: 0.5 },
  /** Rating: S = a · g(k) · (base + weight·f) · replayFactor^replays (floored). */
  rating: { timeBase: 0.8, timeWeight: 0.2, replayFactor: 0.95, replayFloor: 0.8 },
  /** XP: max(min, round(base·a·g)) + speed bonus 0..maxSpeedBonus (timed, a ≥ bonusMinAccuracy). */
  xp: { min: 1, maxSpeedBonus: 3, bonusMinAccuracy: 0.8 },
  /** Tournament: 1000 · a · (0.5 + 0.5·f_T) · streak, streak multiplier 1.0 → 1.5. */
  tournament: { max: 1000, streakStep: 0.1, streakMax: 1.5 },
  /** Untimed by default during the first days (spec J.5). */
  untimedDays: 7,
} as const;

export type Modality = 'buttons' | 'voice' | 'sing' | 'tap' | 'knock';

/** Raw evidence for one answer attempt. */
export interface AttemptEvidence {
  correct: boolean;
  accuracy: number; // 0..1
  timeMs: number | null; // null = no reliable timing
  modality: Modality;
}

/** Items with a small closed answer set get a guessing correction on retries. */
export const isCategorical = (q: Question) => q.kind !== 'sing' && q.kind !== 'degree-seq' && q.kind !== 'sing-seq' && q.kind !== 'sing-run';

// ---------------------------------------------------------------- accuracy a ∈ [0, 1]

export function pitchAccuracy(cents: number | null): number {
  if (cents === null) return 0;
  const c = Math.abs(cents);
  if (c <= SCORING.pitch.tolerance) return 1;
  if (c >= SCORING.pitch.zeroAt) return 0;
  return (SCORING.pitch.zeroAt - c) / (SCORING.pitch.zeroAt - SCORING.pitch.tolerance);
}

/** Accuracy of a given answer to a question (categorical = 0/1; graded items partial). */
export function accuracyFor(q: Question, answer: Answer, sung?: SungResult): number {
  if (q.kind === 'sing') {
    if (!sung || sung.status === 'wrong' || sung.status === 'unclear') return 0;
    return pitchAccuracy(sung.cents);
  }
  if (q.kind === 'degree-seq') {
    const given = String(answer)
      .split('-')
      .map(Number)
      .filter((d) => d >= 1 && d <= 7);
    const g = gradeMelody(q.degrees, given);
    const ok = g.notes.filter((n) => n.status === 'ok').length;
    return ok / (q.degrees.length + g.extra);
  }
  return answer === q.answer ? 1 : 0;
}

// ---------------------------------------------------------------- attempts g(k)

/**
 * Credit for being right on attempt k. Categorical items: after a wrong answer the chance of guessing
 * among the remaining m−1 options is 1/(m−1), so a correct 2nd try earns 0.5·(1 − 1/(m−1)).
 */
export function attemptCredit(k: number, categorical: boolean, choices: number): number {
  if (k <= 1) return 1;
  if (categorical) {
    if (k > 2 || choices <= 2) return 0;
    return 0.5 * (1 - 1 / (choices - 1));
  }
  return SCORING.gradedAttempts[k - 1] ?? 0;
}

// ---------------------------------------------------------------- time f(t)

export function referenceTime(q: Question, modality: Modality): number {
  const r = SCORING.tRef;
  let t = modality === 'voice' ? r.voice : modality === 'sing' ? r.sing : r.buttons;
  if (modality === 'buttons') t += Math.max(0, q.choices.length - 2) * r.perExtraChoice;
  if (q.kind === 'degree-seq' || q.kind === 'sing-seq') t += (q.degrees.length - 1) * r.perExtraNote;
  if (q.kind === 'sing-run') t += q.midis.length / q.run.nps * 1000;
  // Symbolic conversions (no sound) need a moment of thought.
  if ((q.kind === 'degree' && q.direction === 'name→degree') || (q.kind === 'note-name' && q.direction === 'degree→name')) t += r.symbolic;
  return t;
}

/** Relative, log-scaled, never harsh: 1 at/below Tref, 0.75 at 2×, 0.5 floor at 4× and slower. */
export function speedFactor(timeMs: number | null, tRef: number): number {
  if (timeMs === null || !(timeMs > 0)) return 1;
  const f = 1 - SCORING.speed.slope * Math.log2(timeMs / tRef);
  return Math.max(SCORING.speed.floor, Math.min(1, f));
}

// ---------------------------------------------------------------- the three scores

export interface ItemOutcome {
  /** 1-based attempt on which it became correct; null = never (revealed). */
  correctOn: number | null;
  attempts: AttemptEvidence[];
  replays: number;
  timed: boolean;
}

/** Best partial accuracy among attempts and the attempt it came from (for revealed graded items). */
function best(o: ItemOutcome): { a: number; k: number } {
  if (o.correctOn !== null) return { a: o.attempts[o.correctOn - 1]?.accuracy ?? 1, k: o.correctOn };
  let a = 0;
  let k = o.attempts.length || 1;
  o.attempts.forEach((x, i) => {
    if (x.accuracy > a) {
      a = x.accuracy;
      k = i + 1;
    }
  });
  return { a, k };
}

function timeTerm(q: Question, o: ItemOutcome, k: number): number {
  if (!o.timed) return 1;
  const at = o.attempts[k - 1];
  if (!at || at.timeMs === null) return 1;
  return speedFactor(at.timeMs, referenceTime(q, at.modality));
}

/** Graded Elo score S ∈ [0, 1] for the skill rating. */
export function ratingScore(q: Question, o: ItemOutcome): number {
  if (!o.attempts.length) return 0;
  const cat = isCategorical(q);
  const { a, k } = best(o);
  if (o.correctOn === null && cat) return 0;
  const g = attemptCredit(k, cat, q.choices.length);
  const time = SCORING.rating.timeBase + SCORING.rating.timeWeight * timeTerm(q, o, k);
  const replay = Math.max(SCORING.rating.replayFloor, Math.pow(SCORING.rating.replayFactor, o.replays));
  return Math.max(0, Math.min(1, a * g * time * replay));
}

/** XP for a completed item (skipped items earn nothing; the caller decides). */
export function xpFor(q: Question, o: ItemOutcome, baseXp: number): number {
  if (baseXp <= 0) return 0;
  const cat = isCategorical(q);
  const { a, k } = best(o);
  const g = o.correctOn === null && cat ? 0 : attemptCredit(k, cat, q.choices.length);
  let xp = Math.max(SCORING.xp.min, Math.round(baseXp * a * g));
  if (o.timed && a >= SCORING.xp.bonusMinAccuracy && g > 0) {
    const f = timeTerm(q, o, k);
    xp += Math.round(SCORING.xp.maxSpeedBonus * Math.max(0, (f - 0.5) * 2));
  }
  return xp;
}

/** Tournament points: single attempt, linear speed over the answer window, streak multiplier. */
export function tournamentPoints(accuracy: number, timeMs: number, windowMs: number, streak: number): number {
  if (accuracy <= 0 || timeMs > windowMs) return 0;
  const fT = Math.max(0, Math.min(1, 1 - timeMs / windowMs));
  const mult = Math.min(SCORING.tournament.streakMax, 1 + SCORING.tournament.streakStep * Math.max(0, streak));
  return Math.round(SCORING.tournament.max * accuracy * (0.5 + 0.5 * fT) * mult);
}

/** Untimed scoring by default during the first days of use. */
export function isTimed(pref: boolean | null, firstUseAt: string | null, now: Date): boolean {
  if (pref !== null) return pref;
  if (!firstUseAt) return false;
  return now.getTime() - new Date(firstUseAt).getTime() >= SCORING.untimedDays * 86400000;
}

/** Median of numbers (null when empty). */
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

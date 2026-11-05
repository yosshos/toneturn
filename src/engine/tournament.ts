// Tournament rules (spec addendum I): same item for every player at the same moment, scored on
// accuracy and speed (spec J tournament points). Pure: set generation, round scoring, standings, share text.

import {
  cadenceQuestion,
  DEGREE_KEYS,
  degreeQuestion,
  intervalQuestion,
  mulberry32,
  pick,
  qualityQuestion,
  ROOT_NAMES,
  type Question,
  type Quality,
} from './lesson';
import { pc } from './pitch';
import { tournamentPoints } from './scoring';

export const ROUND_WINDOW_MS = 10_000;
export const MIN_HUMAN_MS = 150; // faster than this is not a reaction to the sound

export type SetKind = 'mixed' | 'degrees' | 'chords' | 'intervals';

/** A tournament item must be answerable by buttons (≤ 4 choices) and fair for everyone. */
export function tournamentItem(kind: Exclude<SetKind, 'mixed'> | 'cadences', seed: number, id: string): Question {
  const rnd = mulberry32(seed);
  switch (kind) {
    case 'degrees':
      return degreeQuestion(id, pick(rnd, DEGREE_KEYS), pick(rnd, [1, 3, 5]), [1, 3, 5], 1050);
    case 'chords':
      return qualityQuestion(id, pc(pick(rnd, ROOT_NAMES)), pick(rnd, ['maj', 'min', 'dim', 'aug'] as Quality[]), ['maj', 'min', 'dim', 'aug'], false, 1250);
    case 'intervals':
      return intervalQuestion(id, 53 + Math.floor(rnd() * 10), pick(rnd, ['M3', 'P5', 'P8'] as const), rnd() < 0.5 ? 'melodic' : 'harmonic');
    case 'cadences':
      return cadenceQuestion(id, pick(rnd, DEGREE_KEYS), pick(rnd, ['resolved', 'open'] as const));
  }
}

export function tournamentSet(kind: SetKind, rounds: number, seed: number): Question[] {
  const mix = ['degrees', 'chords', 'intervals', 'cadences'] as const;
  return Array.from({ length: rounds }, (_, i) => tournamentItem(kind === 'mixed' ? mix[i % mix.length] : kind, seed * 131 + i * 7919, `t${i + 1}`));
}

/** Daily challenge: one set per local calendar day, the same for everyone (versioned). */
export const DAILY_VERSION = 1;
export function dailySeed(day: string): number {
  let h = 2166136261;
  for (const ch of `${DAILY_VERSION}|${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
export const dailySet = (day: string) => tournamentSet('mixed', 5, dailySeed(day));

export interface PlayerAnswer {
  player: number;
  answer: string | number | null; // null = no answer in time
  /** ms from the end of the stimulus as heard on this device. */
  timeMs: number | null;
}

export interface RoundResult {
  item: Question;
  answers: { player: number; answer: string | number | null; timeMs: number | null; correct: boolean; points: number }[];
  /** Fastest correct player (null when nobody was right). */
  fastest: number | null;
}

/** Score one round. Streaks are consecutive correct rounds before this one, per player. */
export function scoreRound(item: Question, answers: PlayerAnswer[], streaks: number[], windowMs = ROUND_WINDOW_MS): RoundResult {
  const scored = answers.map((a) => {
    const plausible = a.timeMs !== null && a.timeMs >= MIN_HUMAN_MS && a.timeMs <= windowMs;
    const correct = a.answer !== null && a.answer === item.answer && plausible;
    const points = correct ? tournamentPoints(1, a.timeMs!, windowMs, streaks[a.player] ?? 0) : 0;
    return { player: a.player, answer: a.answer, timeMs: a.timeMs, correct, points };
  });
  const right = scored.filter((s) => s.correct).sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
  return { item, answers: scored, fastest: right[0]?.player ?? null };
}

export interface Standing {
  player: number;
  points: number;
  correct: number;
  totalTimeMs: number;
  streak: number;
}

/** Totals after rounds; ties broken by total response time of correct answers (spec I). */
export function standings(players: number, rounds: RoundResult[]): Standing[] {
  const st: Standing[] = Array.from({ length: players }, (_, p) => ({ player: p, points: 0, correct: 0, totalTimeMs: 0, streak: 0 }));
  for (const r of rounds) {
    for (const a of r.answers) {
      const s = st[a.player];
      s.points += a.points;
      if (a.correct) {
        s.correct++;
        s.totalTimeMs += a.timeMs ?? 0;
        s.streak++;
      } else s.streak = 0;
    }
  }
  return [...st].sort((a, b) => b.points - a.points || a.totalTimeMs - b.totalTimeMs);
}

export const currentStreaks = (players: number, rounds: RoundResult[]) => {
  const st = standings(players, rounds);
  return Array.from({ length: players }, (_, p) => st.find((s) => s.player === p)!.streak);
};

/** Spoiler-free share text (Wordle-style): no answers, just how it went. */
export function shareText(day: string, round: RoundResult[], points: number, lang: 'he' | 'en'): string {
  const squares = round
    .map((r) => {
      const a = r.answers[0];
      if (!a.correct) return '⬜';
      return (a.timeMs ?? 99999) <= 2000 ? '🟩' : '🟨';
    })
    .join('');
  return lang === 'en' ? `Ninth Sense Daily ${day}\n${squares}  ${points.toLocaleString('en')} pts` : `Ninth Sense יומי ${day}\n${squares}  ${points.toLocaleString('he')} נק׳`;
}

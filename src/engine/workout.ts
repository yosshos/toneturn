// Daily workout planner (spec S.1): "I have 5 / 10 / 20 minutes" → a short plan that mixes the weakest
// skill, due reviews, a vocal warm-up (voice mode) and one game. Pure: the plan is a function of the
// ratings, the review queue and the day, so it does not change while the player works through it.

import type { LessonId, SkillId } from './lesson';
import { recommendFor } from './recommend';
import { SKILLS, type Ratings } from './rating';

export type WorkoutStep =
  | { kind: 'lesson'; lessonId: LessonId; skill: SkillId; minutes: number }
  | { kind: 'review'; minutes: number }
  | { kind: 'vocal-warmup'; minutes: number }
  | { kind: 'vocal'; minutes: number }
  | { kind: 'modes'; level: number; minutes: number }
  | { kind: 'runs'; minutes: number }
  | { kind: 'game'; game: 'truefalse' | 'echo' | 'beat'; minutes: number };

export interface WorkoutInput {
  minutes: 5 | 10 | 20;
  ratings: Ratings;
  reviewsDue: number;
  voice: boolean;
  mastered: (id: LessonId) => boolean;
  day: string; // local day — seeds the variety
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** Skills ordered weakest first: unmeasured ones count as weakest (to measure them). */
export function weakestSkills(ratings: Ratings, voice: boolean): SkillId[] {
  const usable = SKILLS.filter((k) => k !== 'absolute' && (voice || !['singing', 'agility', 'technique'].includes(k)));
  return [...usable].sort((a, b) => (ratings[a]?.n ? ratings[a]!.r : 0) - (ratings[b]?.n ? ratings[b]!.r : 0));
}

function stepFor(skill: SkillId, input: WorkoutInput): WorkoutStep {
  const rec = recommendFor(skill, input.ratings, input.mastered);
  switch (rec.kind) {
    case 'lesson':
      return { kind: 'lesson', lessonId: rec.lessonId, skill, minutes: 4 };
    case 'modes':
      return { kind: 'modes', level: rec.level, minutes: 3 };
    case 'vocal':
      return { kind: 'vocal', minutes: 4 };
    case 'runs-workshop':
      return { kind: 'runs', minutes: 3 };
    case 'rhythm-game':
      return { kind: 'game', game: 'beat', minutes: 3 };
    default:
      return { kind: 'review', minutes: 3 };
  }
}

export function planWorkout(input: WorkoutInput): WorkoutStep[] {
  const plan: WorkoutStep[] = [];
  const used = new Set<string>();
  const add = (s: WorkoutStep) => {
    const key = s.kind === 'lesson' ? s.lessonId : s.kind;
    if (used.has(key)) return;
    used.add(key);
    plan.push(s);
  };
  const total = () => plan.reduce((a, s) => a + s.minutes, 0);
  if (input.voice && input.minutes >= 10) add({ kind: 'vocal-warmup', minutes: 3 });
  if (input.reviewsDue > 0) add({ kind: 'review', minutes: 2 });
  const weak = weakestSkills(input.ratings, input.voice);
  for (const k of weak) {
    if (total() >= input.minutes - 2) break;
    add(stepFor(k, input));
  }
  const games = ['truefalse', 'echo', 'beat'] as const;
  if (total() < input.minutes) add({ kind: 'game', game: games[hash(input.day) % games.length], minutes: Math.max(2, Math.min(3, input.minutes - total())) });
  // Never longer than asked by more than a couple of minutes: drop from the end.
  while (plan.length > 1 && total() > input.minutes + 2) plan.pop();
  return plan;
}

export const stepKey = (s: WorkoutStep) => (s.kind === 'lesson' ? `lesson:${s.lessonId}` : s.kind === 'game' ? `game:${s.game}` : s.kind === 'modes' ? `modes:${s.level}` : s.kind);

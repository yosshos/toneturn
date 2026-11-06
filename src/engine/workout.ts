import { priorityBoost, type Track } from './intake';
import { exerciseFor, subPriorities } from './scheduler';
import type { SubStat } from './taxonomy';
import { domainOf, type DomainId } from './rating';
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
  /** Spec AD: a topic level chosen for a sub-skill (why: new / weak / review). */
  | { kind: 'topic'; topic: string; level: number; skill: SkillId; sub: string; why: 'new' | 'weak' | 'review'; minutes: number }
  | { kind: 'game'; game: 'truefalse' | 'echo' | 'beat'; minutes: number };

export interface WorkoutInput {
  minutes: 5 | 10 | 20;
  ratings: Ratings;
  reviewsDue: number;
  voice: boolean;
  mastered: (id: LessonId) => boolean;
  day: string; // local day — seeds the variety
  /** The player's order of practice areas (intake); their skills come first. */
  priorities?: DomainId[] | null;
  /** Spec AD: sub-skill stats and the track — when given, the priority scheduler picks the practice. */
  subs?: Record<string, SubStat>;
  track?: Track | null;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** Skills ordered weakest first: unmeasured ones count as weakest (to measure them). */
export function weakestSkills(ratings: Ratings, voice: boolean, priorities?: DomainId[] | null): SkillId[] {
  const usable = SKILLS.filter((k) => k !== 'absolute' && (voice || !['singing', 'agility', 'technique'].includes(k)));
  const score = (k: SkillId) => (ratings[k]?.n ? ratings[k]!.r : 0) - priorityBoost(priorities, domainOf(k));
  return [...usable].sort((a, b) => score(a) - score(b));
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
    const key = s.kind === 'lesson' ? s.lessonId : s.kind === 'topic' ? `topic:${s.topic}` : s.kind;
    if (used.has(key)) return;
    used.add(key);
    plan.push(s);
  };
  const total = () => plan.reduce((a, s) => a + s.minutes, 0);
  if (input.voice && input.minutes >= 10) add({ kind: 'vocal-warmup', minutes: 3 });
  if (input.reviewsDue > 0) add({ kind: 'review', minutes: 2 });
  if (input.subs) {
    // Spec AD §5: sub-skills by priority, a little shuffled by the day (soft-max-like variety among close scores).
    const pr = subPriorities({ ratings: input.ratings, subs: input.subs, track: input.track, priorities: input.priorities, voice: input.voice, now: new Date(`${input.day}T12:00:00`) });
    const h = hash(input.day);
    const jittered = pr.map((p, i) => ({ p, s: p.score * (0.85 + 0.3 * (((h >>> (i % 24)) & 7) / 7)) })).sort((a, b) => b.s - a.s).map((x) => x.p);
    const skillsUsed = new Set<SkillId>();
    for (const p of jittered) {
      if (total() >= input.minutes - 2) break;
      if (skillsUsed.has(p.skill)) continue; // one step per skill: variety
      const rec = recommendFor(p.skill, input.ratings, input.mastered);
      const ex = exerciseFor(p.sub, input.ratings);
      const before = plan.length;
      if (rec.kind === 'lesson' && !input.mastered(rec.lessonId) && p.why !== 'review') add(stepFor(p.skill, input));
      else if (ex) add({ kind: 'topic', topic: ex.topic, level: ex.level, skill: p.skill, sub: p.sub, why: p.why, minutes: 3 });
      else add(stepFor(p.skill, input));
      if (plan.length > before) skillsUsed.add(p.skill);
    }
  } else {
    const weak = weakestSkills(input.ratings, input.voice, input.priorities);
    for (const k of weak) {
      if (total() >= input.minutes - 2) break;
      add(stepFor(k, input));
    }
  }
  const games = ['truefalse', 'echo', 'beat'] as const;
  if (total() < input.minutes) add({ kind: 'game', game: games[hash(input.day) % games.length], minutes: Math.max(2, Math.min(3, input.minutes - total())) });
  // Never longer than asked by more than a couple of minutes: drop from the end.
  while (plan.length > 1 && total() > input.minutes + 2) plan.pop();
  return plan;
}

export const stepKey = (s: WorkoutStep) => (s.kind === 'lesson' ? `lesson:${s.lessonId}` : s.kind === 'game' ? `game:${s.game}` : s.kind === 'modes' ? `modes:${s.level}` : s.kind === 'topic' ? `topic:${s.topic}:${s.level}` : s.kind);

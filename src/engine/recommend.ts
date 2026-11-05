// What to practise next, per skill and level: each skill has a ladder of lessons from easiest to
// hardest; the player's rating picks the rung. Placement also unlocks the path below that rung.

import type { LessonId, SkillId } from './lesson';
import { band, type Ratings } from './rating';

/** Lessons that train a skill, easiest first. */
export const SKILL_LADDER: Partial<Record<SkillId, LessonId[]>> = {
  degrees: ['bflat-two-homes', 'degrees-135', 'notes-degrees', 'note-sequences'],
  notes: ['notes-degrees', 'note-sequences'],
  intervals: ['intervals'],
  chords: ['major-minor', 'inversions', 'slash-chords', 'jazz-1'],
  cadences: ['cadences', 'jazz-1'],
  sequences: ['degrees-135', 'songs', 'note-sequences'],
  singing: ['sing-home-five', 'sing-names', 'sing-degrees'],
  'rhythm-dictation': ['rhythm-r1', 'rhythm-r2', 'rhythm-r3', 'rhythm-r4', 'rhythm-r5', 'rhythm-r6', 'rhythm-r7', 'rhythm-r8'],
  'rhythm-reading': ['rhythm-r1', 'rhythm-r2', 'rhythm-r3', 'rhythm-r4', 'rhythm-r5', 'rhythm-r6', 'rhythm-r7', 'rhythm-r8'],
  agility: ['runs'],
};

const BAND_INDEX = { beginner: 0, developing: 1, solid: 2, advanced: 3 } as const;

/** Rung of a skill's ladder that fits a rating (null rating = first rung). */
export function ladderIndex(skill: SkillId, rating: number | null): number {
  const ladder = SKILL_LADDER[skill] ?? [];
  if (!ladder.length || rating === null) return 0;
  const b = BAND_INDEX[band(rating)];
  return Math.min(ladder.length - 1, Math.round((b * (ladder.length - 1)) / 3));
}

export type Recommendation =
  | { kind: 'lesson'; lessonId: LessonId }
  | { kind: 'puzzle' }
  | { kind: 'runs-workshop' }
  | { kind: 'vocal' }
  | { kind: 'modes'; level: number }
  | { kind: 'rhythm-game' };

/**
 * The exercise to suggest for a skill: the lesson at the player's rung, or the next one up if that was
 * already completed with full marks. Memory / precision axes point to their games and tools.
 */
export function recommendFor(skill: SkillId, ratings: Ratings, mastered: (id: LessonId) => boolean): Recommendation {
  if (skill === 'rhythm' || skill === 'timing') return { kind: 'rhythm-game' };
  if (skill === 'technique') return { kind: 'vocal' };
  if (skill === 'modes') return { kind: 'modes', level: modesLevelFor(ratings.modes?.n ? ratings.modes.r : null) };
  const ladder = SKILL_LADDER[skill];
  const r = ratings[skill];
  const rating = r && r.n > 0 ? r.r : null;
  if (!ladder) return { kind: 'puzzle' };
  let i = ladderIndex(skill, rating);
  while (i < ladder.length - 1 && mastered(ladder[i])) i++;
  if (mastered(ladder[i])) {
    if (skill === 'agility') return { kind: 'runs-workshop' };
    if (skill === 'sequences') return { kind: 'puzzle' };
  }
  return { kind: 'lesson', lessonId: ladder[i] };
}

/** Path lessons a placement result opens: every rung below the player's level, for every measured skill. */
export function placementUnlocks(ratings: Ratings): LessonId[] {
  const out = new Set<LessonId>();
  for (const [skill, ladder] of Object.entries(SKILL_LADDER) as [SkillId, LessonId[]][]) {
    const r = ratings[skill];
    if (!r || r.n === 0) continue;
    const top = ladderIndex(skill, r.r);
    ladder.slice(0, top + 1).forEach((id) => out.add(id));
  }
  return [...out];
}

/** The path grouped into topics (every path lesson in exactly one) — for "done X of Y" bars. */
export const TOPICS: { id: 'degrees' | 'harmony' | 'intervals' | 'singing' | 'rhythm'; lessons: LessonId[] }[] = [
  { id: 'degrees', lessons: ['bflat-two-homes', 'degrees-135', 'notes-degrees', 'note-sequences'] },
  { id: 'harmony', lessons: ['major-minor', 'cadences', 'inversions', 'jazz-1', 'slash-chords'] },
  { id: 'intervals', lessons: ['intervals', 'songs'] },
  { id: 'singing', lessons: ['sing-home-five', 'sing-names', 'sing-degrees', 'runs'] },
  { id: 'rhythm', lessons: ['rhythm-r1', 'rhythm-r2', 'rhythm-r3', 'rhythm-r4', 'rhythm-r5', 'rhythm-r6', 'rhythm-r7', 'rhythm-r8'] },
];

export function topicProgress(done: (id: LessonId) => boolean) {
  return TOPICS.map((tp) => ({ id: tp.id, done: tp.lessons.filter(done).length, total: tp.lessons.length }));
}

/** "Modes by ear" level (1–8) for a rating (null = not measured yet → level 1). */
export function modesLevelFor(rating: number | null): number {
  if (rating === null) return 1;
  return rating < 950 ? 1 : rating < 1080 ? 2 : rating < 1180 ? 3 : rating < 1250 ? 4 : rating < 1350 ? 5 : rating < 1480 ? 6 : rating < 1580 ? 7 : 8;
}

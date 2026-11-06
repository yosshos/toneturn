// Catching up (product owner, 0.35.1): players who started before the intake questionnaire or before the
// placement covered every skill never see the first-run flow again. This tells them what is new for them:
// the questionnaire (never taken, put off, or missing a newer practice area) and the skills the placement
// has not measured yet. Pure; the card is src/ui/CatchUp.tsx.

import { AREAS, type Intake } from './intake';
import type { SkillId } from './lesson';
import { placementSkills } from './placement';
import { foldRatings, type RatingEvent } from './rating';

export type IntakeNeed = 'missing' | 'later' | 'outdated' | null;

export interface CatchUp {
  intake: IntakeNeed;
  /** Placement sections this player has no measurement for (in placement order). */
  unmeasured: SkillId[];
  /** Never took the placement at all. */
  neverPlaced: boolean;
  /** Changes when what is offered changes (a hidden card comes back then). */
  key: string;
}

/** A skill counts as measured once the placement set it, or after enough practice to rate it on its own. */
const PRACTICE_ENOUGH = 12;

export function catchUp(
  s: { intake?: Intake | null; mode?: string },
  p: { ratingEvents?: RatingEvent[]; lessons: Record<string, { completions?: number } | undefined> },
): CatchUp {
  const intake: IntakeNeed =
    s.intake === undefined ? 'missing' : s.intake === null ? 'later' : s.intake.priorities && AREAS.some((a) => !s.intake!.priorities!.includes(a)) ? 'outdated' : null;
  const events = p.ratingEvents ?? [];
  const placed = new Set(events.filter((e) => e.set !== undefined).map((e) => e.skill));
  const ratings = foldRatings(events);
  const unmeasured = placementSkills({ singing: s.mode === 'voice' }).filter((k) => !placed.has(k) && (ratings[k]?.n ?? 0) < PRACTICE_ENOUGH);
  const neverPlaced = !(p.lessons.placement?.completions ?? 0);
  return { intake, unmeasured, neverPlaced, key: `${intake ?? '-'}|${unmeasured.join(',')}` };
}

export const hasCatchUp = (c: CatchUp) => c.intake !== null || c.unmeasured.length > 0;

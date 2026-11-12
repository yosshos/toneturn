// Placement skip from cleared game tiers (GAMES_TIERS_PLAN §5.2 "Level test / placement", P3). A tier is cleared only by
// measured play at its rating band (2 of the last 3 runs met the rule), so it is evidence the placement may use:
//   * cleared ≥ mf  → the game's skill starts its placement search at the top of the cleared band (the easier items
//     below it are skipped; a miss still gallops down, so a lucky clear costs nothing);
//   * cleared ≥ f and the skill's own rating is already established (not provisional) and inside or above that band →
//     the skill's section is skipped altogether (its rating stays as it is).
// Only skills that are placement sections count (instrument sub-skills such as instrument/guitar-tech are not). Pure.

import { GAME_TIERS, TIER_BANDS, tierIndex, type DynName, type GameTiers } from './gameTiers';
import { PLACEMENT_ORDER } from './placement';
import { PROVISIONAL_UNTIL, type Ratings } from './rating';
import type { CourseId } from './courses';
import type { SkillId } from './lesson';

export const PRIOR_FROM: DynName = 'mf';
export const SKIP_FROM: DynName = 'f';

export interface TierPlacement {
  /** Starting ratings for the placement search (the top of the highest cleared band per skill). */
  priors: Partial<Record<SkillId, number>>;
  /** Sections to leave out. */
  skip: SkillId[];
  /** Which game's tier gave each skill its prior (for a "from your games" line). */
  from: Partial<Record<SkillId, { game: string; tier: DynName }>>;
}

export function tierPlacement(tiers: GameTiers | undefined, course: CourseId, ratings: Ratings = {}): TierPlacement {
  const priors: TierPlacement['priors'] = {};
  const from: TierPlacement['from'] = {};
  const top: Partial<Record<SkillId, DynName>> = {};
  for (const spec of Object.values(GAME_TIERS)) {
    if (spec.clear === 'social') continue;
    const cleared = tiers?.[spec.game]?.cleared;
    if (!cleared || tierIndex(cleared) < tierIndex(PRIOR_FROM)) continue;
    const skill = spec.source(course);
    if (typeof skill !== 'string' || skill.includes('/') || !PLACEMENT_ORDER.includes(skill as SkillId)) continue;
    const k = skill as SkillId;
    const v = TIER_BANDS[cleared][1];
    if ((priors[k] ?? 0) < v) {
      priors[k] = v;
      from[k] = { game: spec.game, tier: cleared };
      top[k] = cleared;
    }
  }
  const skip = (Object.keys(top) as SkillId[]).filter((k) => {
    const t = top[k]!;
    const r = ratings[k];
    return tierIndex(t) >= tierIndex(SKIP_FROM) && !!r && r.n >= PROVISIONAL_UNTIL && r.r >= TIER_BANDS[t][0];
  });
  return { priors, skip, from };
}

/** Merge starting ratings: the higher of each (a measured rating and a cleared tier both say "at least here"). */
export function mergePriors(...ps: Partial<Record<SkillId, number>>[]): Partial<Record<SkillId, number>> {
  const out: Partial<Record<SkillId, number>> = {};
  for (const p of ps) for (const [k, v] of Object.entries(p) as [SkillId, number][]) if (typeof v === 'number') out[k] = Math.max(out[k] ?? -Infinity, v);
  return out;
}

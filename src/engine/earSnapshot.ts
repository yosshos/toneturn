// The Ear course in the daily snapshots (docs/SPEC-PROGRESS-CHARTS.md §1–2): the course has no drill items, so its
// "closed by area" comes from its finished path steps (topics, lessons, games) — each counted in the area of its skill
// (snapshot.EAR_AREAS, the same groups as the course's radar) — and its level per area from the ratings. Pure.

import type { PathFacts, PathStep } from './path';
import { stepCatalogue } from './path';
import { skillsValue, type Ratings } from './rating';
import type { SkillId } from './lesson';
import { EAR_AREAS, earAreaOfSkill, type EarStep } from './snapshot';

let byId: Map<string, PathStep> | null = null;
/** A step of the catalogue by id (a topic step "topic:<id>:<level>", a lesson, a game …). */
function stepOf(id: string): PathStep | undefined {
  byId ??= new Map(stepCatalogue().map((s) => [s.id, s]));
  return byId.get(id) ?? (id.split(':').length > 3 ? byId.get(id.split(':').slice(0, 3).join(':')) : undefined);
}

/** The Ear course's finished steps with their skill (steps whose skill is not an Ear area — voice, instrument — drop out). */
export function earSteps(facts: PathFacts | undefined, skillOf: (id: string) => string | undefined = (id) => stepOf(id)?.skill): EarStep[] {
  const out: EarStep[] = [];
  for (const [id, f] of Object.entries(facts?.steps ?? {})) {
    if (!f || id.startsWith('check:') || id.startsWith('review:')) continue;
    const skill = skillOf(id);
    if (!skill || !earAreaOfSkill(skill)) continue;
    out.push({ skill, stars: f.stars, at: f.at, ...(f.firstAt ? { firstAt: f.firstAt } : {}) });
  }
  return out;
}

/** The Ear course's level per area (0..1, the ratings' value over the area's skills); areas with no rating drop out. */
export function earLevels(ratings: Ratings): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of EAR_AREAS) {
    const v = skillsValue(ratings, a.skills as SkillId[]);
    if (v) out[a.id] = Math.round(v.v * 1000) / 1000;
  }
  return out;
}

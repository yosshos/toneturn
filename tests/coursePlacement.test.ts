// Owner 2026-11-19: "the level test must check everything the course covers" — the Ear test asked nothing about
// harmony (chords and cadences were inferred from degrees and intervals), and the Jazz test measured only improvising.
import { describe, expect, it } from 'vitest';
import type { SkillId } from '../src/engine/lesson';
import { COURSE_PLACEMENT_SKILLS, coursePlacementSkills } from '../src/engine/courses';
import { LADDERS, placementAreaOf, placementSkills, placementTestBudget, planPlacement, type PlacementAnswer } from '../src/engine/placement';

function play(order: SkillId[], can: (k: SkillId) => number) {
  const answers: PlacementAnswer[] = [];
  for (let g = 0; g < 200; g++) {
    const plan = planPlacement(answers, order);
    if (!plan.next) return { plan, answers };
    const { skill, level } = plan.next;
    answers.push({ skill, level, outcome: LADDERS[skill]![level - 1].difficulty <= can(skill) ? 'correct' : 'wrong' });
  }
  throw new Error('no end');
}

describe('each course measures what it teaches', () => {
  // SPEC-JAZZ-FOLD: the Jazz test folded into Ear's — Ear without and with the jazz pack.
  for (const [course, jazz] of [['ear', false], ['ear', true]] as const) {
    const order = placementSkills({ skills: coursePlacementSkills(course, jazz)! });
    it(`${course}${jazz ? ' (jazz pack open)' : ''}: every area is asked, for every kind of player`, () => {
      for (const lv of [700, 950, 1200, 1450, 1700]) {
        for (const shape of [() => lv, (k: SkillId) => (order.indexOf(k) % 2 ? lv : lv + 400)]) {
          const { answers } = play(order, shape);
          const askedAreas = new Set(answers.map((a) => placementAreaOf(a.skill)));
          for (const a of new Set(order.map(placementAreaOf))) expect(askedAreas.has(a), `${course}${jazz ? '+jazz' : ''} ${lv}: ${a}`).toBe(true);
          expect(answers.length).toBeLessThanOrEqual(placementTestBudget(order));
        }
      }
    });
  }
  it('ear: harmony is asked (chords and cadences), and transposing and expression are measured; no improvising', () => {
    const order = placementSkills({ skills: COURSE_PLACEMENT_SKILLS.ear! });
    expect(order).not.toContain('improv');
    const { answers } = play(order, () => 1200);
    const asked = new Set(answers.map((a) => a.skill));
    for (const k of ['chords', 'cadences'] as SkillId[]) expect(asked.has(k), k).toBe(true);
    expect(asked.has('transpose') || asked.has('expression')).toBe(true);
  });
  it('ear with the jazz pack: the old Jazz radar skills are all in its test (improvising added)', () => {
    const order = placementSkills({ skills: coursePlacementSkills('ear', true)! });
    for (const k of ['improv', 'chords', 'cadences', 'modes', 'rhythm-dictation', 'form'] as SkillId[]) expect(order, k).toContain(k);
  });
});

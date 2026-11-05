import { describe, expect, it } from 'vitest';
import { planWorkout, weakestSkills } from '../src/engine/workout';
import { achievements } from '../src/engine/achievements';
import { emptyProgress } from '../src/storage/progress';
import { thenAndNow } from '../src/storage/takes';

describe('workout planner', () => {
  const base = { ratings: {}, reviewsDue: 0, voice: true, mastered: () => false, day: '2026-11-05' };
  it('fits the time and mixes kinds', () => {
    for (const minutes of [5, 10, 20] as const) {
      const plan = planWorkout({ ...base, minutes });
      const total = plan.reduce((a, s) => a + s.minutes, 0);
      expect(total).toBeLessThanOrEqual(minutes + 2);
      expect(plan.length).toBeGreaterThan(0);
      expect(new Set(plan.map((s) => (s.kind === 'lesson' ? s.lessonId : s.kind))).size).toBe(plan.length);
    }
    expect(planWorkout({ ...base, minutes: 10 })[0].kind).toBe('vocal-warmup');
    expect(planWorkout({ ...base, minutes: 10, voice: false }).some((s) => s.kind === 'vocal-warmup')).toBe(false);
    expect(planWorkout({ ...base, minutes: 10, reviewsDue: 3 }).some((s) => s.kind === 'review')).toBe(true);
  });
  it('weakest skills first; singing skills only with the voice', () => {
    const w = weakestSkills({ degrees: { r: 1300, n: 10, correct: 8, recent: [] }, chords: { r: 900, n: 10, correct: 3, recent: [] } }, false);
    expect(w).not.toContain('technique');
    expect(w.indexOf('chords')).toBeLessThan(w.indexOf('degrees'));
  });
});

describe('achievements', () => {
  it('none on an empty profile; progress values in range', () => {
    const a = achievements(emptyProgress());
    expect(a.every((x) => !x.got && x.progress >= 0 && x.progress <= 1)).toBe(true);
  });
  it('a vocal take unlocks the steady-hold badge', () => {
    const p = emptyProgress();
    p.vocal = { best: {}, passed: [], takes: [{ at: '', item: 'v1-3', level: 1, score: 0.9, m: { duration: 8.4, stability: 5 } }] };
    expect(achievements(p).find((x) => x.id === 'steady-8')!.got).toBe(true);
  });
});

describe('then and now', () => {
  it('pairs the oldest and newest take of items kept in two weeks', () => {
    const b = new Blob();
    const rows = thenAndNow([
      { item: 'a', week: '2026-W40', score: 0.5, at: '1', blob: b },
      { item: 'a', week: '2026-W44', score: 0.8, at: '2', blob: b },
      { item: 'b', week: '2026-W44', score: 0.8, at: '3', blob: b },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].then.week).toBe('2026-W40');
  });
});

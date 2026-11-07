// Find my level 3.0 (docs/SPEC-PLACEMENT.md): the accelerating search, budgets, ranges, inference by area,
// the fast-converging rating after a placement, and the re-calibration signals.
import { describe, expect, it } from 'vitest';
import type { SkillId } from '../src/engine/lesson';
import {
  adaptPlacement, AGREE, LADDERS, NOT_DERIVED, PLACEMENT_BUDGET, PLACEMENT_EVIDENCE, PLACEMENT_ORDER, placementLesson, placementResults, placementSkills, planPlacement,
  ratingDrift, recalibration, RECAL, rungDifficulty, searchSkill, skillForm, type PlacementAnswer,
} from '../src/engine/placement';
import { DOMAINS, K_ESTABLISHED, K_PROVISIONAL, rate, type RatingEvent, type SkillRating } from '../src/engine/rating';
import { createSession, grade, newTurn, advance } from '../src/engine/session';

/** Asked rungs of one skill when the player answers `pattern` (true = right) from `start`. */
function walk(M: number, start: number, budget: number, right: (level: number, i: number) => boolean) {
  const answers: { level: number; outcome: PlacementAnswer['outcome'] }[] = [];
  for (let i = 0; i < 20; i++) {
    const s = searchSkill(M, start, budget, answers);
    if (s.done) return { asked: answers.map((a) => a.level), s };
    answers.push({ level: s.next, outcome: right(s.next, i) ? 'correct' : 'wrong' });
  }
  throw new Error('no end');
}

describe('the accelerating search (§3.2)', () => {
  it('gallops up 1 → 2 → 4 rungs while right, then bisects after the first miss', () => {
    expect(walk(12, 1, 6, () => true).asked).toEqual([1, 2, 4, 8, 12]); // top reached → done
    const w = walk(12, 1, 6, (lv) => lv <= 5);
    expect(w.asked).toEqual([1, 2, 4, 8, 6, 5]); // 8 ✗ → bisect 6 ✗ → 5 ✓: bracket [5, 6]
    expect([w.s.lo, w.s.hi]).toEqual([5, 6]);
  });
  it('gallops down the same way while wrong', () => {
    expect(walk(12, 9, 6, () => false).asked).toEqual([9, 8, 6, 2, 1]); // bottom failed → done
    const w = walk(12, 9, 6, (lv) => lv <= 3);
    expect(w.asked).toEqual([9, 8, 6, 2, 4, 3]);
    expect([w.s.lo, w.s.hi]).toEqual([3, 4]);
  });
  it('never asks more than its budget, and never repeats a rung', () => {
    for (let M = 4; M <= 8; M++)
      for (let start = 1; start <= M; start++)
        for (let budget = 1; budget <= 5; budget++)
          for (let mask = 0; mask < 32; mask++) {
            const { asked } = walk(M, start, budget, (_lv, i) => ((mask >> i) & 1) === 1);
            expect(asked.length).toBeLessThanOrEqual(budget);
            expect(new Set(asked).size).toBe(asked.length);
            asked.forEach((lv) => expect(lv >= 1 && lv <= M).toBe(true));
          }
  });
  it('every rung of every ladder is reachable', () => {
    for (const k of PLACEMENT_ORDER) {
      const M = LADDERS[k]!.length;
      const seen = new Set<number>();
      for (let start = 1; start <= M; start++) for (let mask = 0; mask < 16; mask++) walk(M, start, PLACEMENT_BUDGET.anchor, (_lv, i) => ((mask >> i) & 1) === 1).asked.forEach((lv) => seen.add(lv));
      expect(seen.size, k).toBe(M);
    }
  });
});

/** Play a whole test with a deterministic player: right below `can[skill]` (rating), else wrong. */
function play(order: SkillId[], can: (k: SkillId) => number, opts: { sung?: boolean; skipped?: SkillId[] } = {}) {
  const answers: PlacementAnswer[] = [];
  for (let g = 0; g < 200; g++) {
    const plan = planPlacement(answers, order, opts);
    if (!plan.next) return { plan, answers };
    const { skill, level } = plan.next;
    answers.push({ skill, level, outcome: LADDERS[skill]![level - 1].difficulty <= can(skill) ? 'correct' : 'wrong' });
  }
  throw new Error('no end');
}
const areaOf = (k: SkillId) => (k === 'rhythm-reading' ? 'time' : DOMAINS.find((d) => d.skills.includes(k))!.id);

describe('budgets, ranges and inference (§3.3–§3.5)', () => {
  const order = placementSkills({ singing: true });
  const levels = [600, 800, 950, 1100, 1250, 1400, 1550, 1700, 1900];
  it('per skill, per area and per test budgets hold for every kind of player', () => {
    for (const a of levels)
      for (const b of levels) {
        // Two very different profiles alternating by skill: the worst case for inference.
        const { plan, answers } = play(order, (k) => (order.indexOf(k) % 2 ? a : b), { sung: true });
        expect(answers.length).toBeLessThanOrEqual(PLACEMENT_BUDGET.testSung);
        for (const s of plan.skills) expect(s.asked, s.skill).toBeLessThanOrEqual(PLACEMENT_BUDGET.anchor);
        const per = new Map<string, number>();
        answers.forEach((x) => per.set(areaOf(x.skill), (per.get(areaOf(x.skill)) ?? 0) + 1));
        for (const [d, n] of per) expect(n, d).toBeLessThanOrEqual(PLACEMENT_BUDGET.area);
      }
    for (const a of levels) expect(play(placementSkills(), () => a).answers.length).toBeLessThanOrEqual(PLACEMENT_BUDGET.test);
  });
  it('every skill ends with a range around a lower-middle rating; asked or inferred', () => {
    for (const a of levels) {
      const { plan } = play(order, () => a, { sung: true });
      for (const s of plan.skills) {
        expect(s.rating, s.skill).not.toBeNull();
        expect(s.low!).toBeLessThanOrEqual(s.rating!);
        expect(s.rating!).toBeLessThanOrEqual(s.high!);
        expect(s.rating!).toBeLessThanOrEqual((s.low! + s.high!) / 2);
        if (s.role === 'derived') expect(s.asked).toBe(0);
      }
    }
  });
  it('once two skills of an area agree, the rest of it is inferred (never absolute pitch or rhythm reading)', () => {
    const { plan } = play(order, () => 1200, { sung: true });
    const pitch = plan.skills.filter((s) => areaOf(s.skill) === 'pitch');
    const measured = pitch.filter((s) => s.role !== 'derived');
    expect(Math.abs(measured[0].rating! - measured[1].rating!)).toBeLessThanOrEqual(AGREE);
    expect(pitch.filter((s) => s.role === 'derived').map((s) => s.skill)).toEqual(['chords', 'cadences', 'modes', 'pitch']);
    for (const s of plan.skills) if (NOT_DERIVED.includes(s.skill)) expect(s.role, s.skill).toBe('own');
  });
  it('a skill unlike its area is still measured and placed apart', () => {
    const { plan } = play(placementSkills({ domain: 'pitch' }), (k) => (k === 'intervals' ? 700 : 1500));
    const iv = plan.skills.find((s) => s.skill === 'intervals')!;
    const dg = plan.skills.find((s) => s.skill === 'degrees')!;
    expect(iv.role).toBe('follow');
    expect(dg.rating! - iv.rating!).toBeGreaterThan(AGREE);
  });
  it('is deterministic', () => {
    const a = placementLesson(5, { singing: true });
    expect(placementLesson(5, { singing: true })).toEqual(a);
    const p = play(order, (k) => 900 + order.indexOf(k) * 30, { sung: true });
    expect(planPlacement(p.answers, order, { sung: true })).toEqual(p.plan);
  });
  it('every skill is reachable: catch-up and area tests start on it; a prior starts at its rung', () => {
    for (const k of placementSkills({ singing: true })) {
      expect(placementLesson(1, { singing: true, only: [k] }).questions[0].id.startsWith(`p:${k}:`), k).toBe(true);
    }
    const l = placementLesson(1, { only: ['chords'], priors: { chords: 1450 } });
    expect(l.questions[0].id).toBe('p:chords:5:1');
  });
});

describe('through the session (adaptPlacement / placementResults)', () => {
  it('a full session ends inside the budget, results carry ranges and evidence', () => {
    let s = newTurn(createSession(placementLesson(3)), 'listening');
    for (let g = 0; g < 100; g++) {
      const q = s.lesson.questions[s.index];
      const right = q.difficulty <= 1150;
      [s] = grade(s, s.turn, s.index, right ? q.answer : (q.choices.find((c) => c !== q.answer) ?? '__'), 'buttons');
      const next = adaptPlacement(s, 3);
      s = { ...s, lesson: { ...s.lesson, questions: next }, records: next.map((_, i) => s.records[i] ?? { attempts: [], outcome: 'pending', xp: 0, unclear: 0 }) };
      if (next.length === s.index + 1) break;
      s = newTurn(advance(s), 'listening');
    }
    expect(s.lesson.questions.length).toBeLessThanOrEqual(PLACEMENT_BUDGET.test);
    const res = placementResults(s);
    expect(res.length).toBeGreaterThanOrEqual(placementSkills().length);
    for (const r of res) {
      expect(r.low).toBeLessThanOrEqual(r.high);
      expect(r.n).toBe(r.derived ? PLACEMENT_EVIDENCE.derived : r.n);
      expect(r.fast).toBe(PLACEMENT_EVIDENCE.fast);
      if (r.derived) expect(r.asked).toBe(0);
    }
    expect(res.some((r) => r.derived)).toBe(true);
  });
});

describe('the rating after a placement converges fast (rating.ts setN / fast, §5)', () => {
  const at = (i: number) => `2026-11-07T10:00:${String(i).padStart(2, '0')}Z`;
  it('the next `fast` answers use the provisional K, then the usual one', () => {
    let r: SkillRating = { r: 1000, n: 40, correct: 30, recent: [] };
    r = rate(r, { difficulty: 1100, correct: true, set: 1100, setN: PLACEMENT_EVIDENCE.anchor, fast: PLACEMENT_EVIDENCE.fast, at: at(0) });
    expect(r.r).toBe(1100);
    expect(r.n).toBe(40); // evidence is never lowered
    const ks: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const before = r.r;
      r = rate(r, { difficulty: r.r, correct: true, at: at(i) });
      ks.push(Math.round((r.r - before) * 2)); // E = 0.5 → K = 2·Δ
    }
    expect(ks.slice(0, PLACEMENT_EVIDENCE.fast).every((k) => Math.abs(k - K_PROVISIONAL) <= 2)).toBe(true);
    expect(ks.slice(PLACEMENT_EVIDENCE.fast).every((k) => Math.abs(k - K_ESTABLISHED) <= 2)).toBe(true);
  });
  it('without the new fields a set behaves as before', () => {
    const r = rate(undefined, { difficulty: 1200, correct: true, set: 1200, at: at(0) });
    expect(r.n).toBe(6);
    expect(r.fast).toBeUndefined();
    expect(rate(undefined, { difficulty: 1200, correct: true, set: 1200, setN: 2, at: at(0) }).n).toBe(2);
  });
});

describe('re-calibration signals (§6)', () => {
  const ev = (i: number, skill: SkillId, d: number, correct: boolean, set?: number): RatingEvent => ({
    id: `e${i}`, skill, difficulty: d, correct, at: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString(), ...(set !== undefined ? { set, fast: 8 } : {}),
  });
  it('a player well above the placement is offered to test out, one below gets easier steps', () => {
    const up = [ev(0, 'chords', 1000, true, 1000), ...Array.from({ length: 8 }, (_, i) => ev(i + 1, 'chords', 1150, true))];
    const down = [ev(0, 'degrees', 1200, true, 1200), ...Array.from({ length: 8 }, (_, i) => ev(i + 1, 'degrees', 1100, i % 4 === 0))];
    const events = [...up, ...down];
    const fold = (k: SkillId) => events.filter((e) => e.skill === k).reduce<SkillRating | undefined>((r, e) => rate(r, e), undefined)!;
    const ratings = { chords: fold('chords'), degrees: fold('degrees') };
    const f = skillForm(events, 'chords');
    expect(f.placed).toBe(1000);
    expect(f.since).toBe(8);
    expect(f.gap).toBeGreaterThan(RECAL.promoteGap);
    const r = recalibration(events, ratings, new Date('2026-11-02T00:00:00Z'), ['chords', 'degrees']);
    expect(r.promote).toEqual(['chords']);
    expect(r.demote).toEqual(['degrees']);
    expect(r.drifted.map((x) => x.skill).sort()).toEqual(['chords', 'degrees']);
    expect(r.redrawProjected).toBe(true);
    expect(recalibration(events, ratings, new Date('2026-11-02T00:00:00Z'), ['chords', 'degrees'], ['chords']).promote).toEqual([]);
  });
  it('unit drift: only skills that moved at least the threshold', () => {
    const before = { chords: { r: 1000, n: 9, correct: 5, recent: [] }, degrees: { r: 1000, n: 9, correct: 5, recent: [] } };
    const now = { chords: { r: 1120, n: 15, correct: 9, recent: [] }, degrees: { r: 1040, n: 12, correct: 6, recent: [] } };
    expect(ratingDrift(before, now, ['chords', 'degrees'])).toEqual([{ skill: 'chords', from: 1000, to: 1120, drift: 120 }]);
  });
  it('rung difficulties have open ends', () => {
    expect(rungDifficulty('degrees', 0)).toBe(LADDERS.degrees![0].difficulty - 150);
    expect(rungDifficulty('degrees', 99)).toBe(LADDERS.degrees![LADDERS.degrees!.length - 1].difficulty + 150);
  });
});

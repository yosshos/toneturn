// Find my level 3.0 (docs/SPEC-PLACEMENT.md §7): simulated players answer with a logistic model; the new
// accelerating search must stay inside its budgets and land within about one rung of the truth, using far
// fewer items than the 2.0 staircase to failure (re-implemented here as the "before").
import { describe, expect, it } from 'vitest';
import { mulberry32, type SkillId } from '../src/engine/lesson';
import { LADDERS, PLACEMENT_BUDGET, placementEstimate, placementSkills, planPlacement, rungDifficulty, type PlacementAnswer } from '../src/engine/placement';
import { DOMAINS, type DomainId } from '../src/engine/rating';

/** P(right) = guess + (1 − guess) / (1 + 10^((d − θ)/S)). */
export const MODEL = { S: 200, guess: 0.2 };
const pRight = (theta: number, d: number, m = MODEL) => m.guess + (1 - m.guess) / (1 + Math.pow(10, (d - theta) / m.S));

/** A player: a level θ and per-skill offsets (spread `sd`, deterministic from the seed). */
function player(theta: number, sd: number, seed: number, skills: SkillId[]) {
  const rnd = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  return { th: Object.fromEntries(skills.map((k) => [k, theta + sd * gauss()])) as Record<SkillId, number>, rnd: mulberry32(seed * 31 + 7) };
}
/** Truth clamped to what a ladder can show (its open ends). */
const truth = (k: SkillId, th: number) => Math.max(rungDifficulty(k, 0), Math.min(rungDifficulty(k, LADDERS[k]!.length + 1), th));

/** 2.0: from rung 1, +2 while right, back one after the first miss, stop at the second miss. */
function oldRun(k: SkillId, answer: (d: number) => boolean) {
  const M = LADDERS[k]!.length;
  let passed = 0, misses = 0, next = 1, asked = 0, climbing = true;
  for (;;) {
    asked++;
    const lv = next;
    if (answer(LADDERS[k]![lv - 1].difficulty)) {
      passed = Math.max(passed, lv);
      if (lv >= M) break;
      next = climbing ? Math.min(M, lv + 2) : lv + 1;
    } else {
      misses++;
      climbing = false;
      if (misses >= 2) break;
      next = lv - 1 > passed ? lv - 1 : lv;
    }
  }
  return { asked, rating: placementEstimate(k, passed) };
}

export interface SimOut {
  items: number;
  measured: number[];
  derived: number[];
  perArea: Partial<Record<DomainId, number>>;
  unmeasured: number;
}

export function simulate(version: 'old' | 'new', theta: number, sd: number, seed: number, opts: { singing?: boolean; domain?: DomainId | null } = {}): SimOut {
  const order = placementSkills({ singing: opts.singing, domain: opts.domain });
  const p = player(theta, sd, seed, order);
  const answer = (k: SkillId) => (d: number) => p.rnd() < pRight(p.th[k], d);
  const area = (k: SkillId) => (k === 'rhythm-reading' ? 'time' : DOMAINS.find((x) => x.skills.includes(k))!.id);
  const out: SimOut = { items: 0, measured: [], derived: [], perArea: {}, unmeasured: 0 };
  if (version === 'old') {
    for (const k of order) {
      const r = oldRun(k, answer(k));
      out.items += r.asked;
      out.perArea[area(k)] = (out.perArea[area(k)] ?? 0) + r.asked;
      out.measured.push(Math.abs(r.rating - truth(k, p.th[k])));
    }
    return out;
  }
  const answers: PlacementAnswer[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const plan = planPlacement(answers, order, { sung: opts.singing });
    if (!plan.next) {
      for (const s of plan.skills) {
        if (s.rating === null) {
          out.unmeasured++;
          continue;
        }
        (s.role === 'derived' ? out.derived : out.measured).push(Math.abs(s.rating - truth(s.skill, p.th[s.skill])));
      }
      break;
    }
    const { skill, level } = plan.next;
    answers.push({ skill, level, outcome: answer(skill)(LADDERS[skill]![level - 1].difficulty) ? 'correct' : 'wrong' });
    out.perArea[area(skill)] = (out.perArea[area(skill)] ?? 0) + 1;
  }
  out.items = answers.length;
  return out;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);
export function table(version: 'old' | 'new', sd: number, opts: { singing?: boolean; domain?: DomainId | null } = {}, runs = 200) {
  return [700, 1000, 1300, 1600].map((theta) => {
    const sims = Array.from({ length: runs }, (_, i) => simulate(version, theta, sd, 1000 + i, opts));
    const items = sims.map((s) => s.items);
    return {
      theta,
      meanItems: Math.round(mean(items) * 10) / 10,
      maxItems: Math.max(...items),
      errMeasured: Math.round(mean(sims.flatMap((s) => s.measured))),
      errDerived: Math.round(mean(sims.flatMap((s) => s.derived))),
      errAll: Math.round(mean(sims.flatMap((s) => [...s.measured, ...s.derived]))),
      asked: Math.round(mean(sims.map((s) => s.measured.length)) * 10) / 10,
      inferred: Math.round(mean(sims.map((s) => s.derived.length)) * 10) / 10,
      unmeasured: Math.round(mean(sims.map((s) => s.unmeasured)) * 10) / 10,
    };
  });
}

describe('Find my level 3.0: simulation (SPEC-PLACEMENT §7)', () => {
  it('prints before / after (see the spec)', () => {
    // 2.0 worst case per skill: every answer pattern enumerated.
    const worst = (k: SkillId) => {
      let w = 0;
      for (let mask = 0; mask < 1 << 12; mask++) {
        let i = 0;
        w = Math.max(w, oldRun(k, () => ((mask >> i++) & 1) === 1).asked);
      }
      return w;
    };
    const sum = (ks: SkillId[]) => ks.reduce((a, k) => a + worst(k), 0);
    console.log(`2.0 worst case: full ${sum(placementSkills())}, with voice ${sum(placementSkills({ singing: true }))}; by area ${JSON.stringify(Object.fromEntries(DOMAINS.map((d) => [d.id, sum(placementSkills({ singing: true, domain: d.id }))])))}`);
    for (const sd of [0, 100]) {
      for (const [name, opts] of [['full', {}], ['full+voice', { singing: true }], ['pitch area', { domain: 'pitch' as DomainId }], ['time area', { domain: 'time' as DomainId }]] as const) {
        console.log(`sd=${sd} ${name}\n old ${JSON.stringify(table('old', sd, opts, 100))}\n new ${JSON.stringify(table('new', sd, opts, 100))}`);
      }
    }
  });
  it('the full test stays inside its budget and is much shorter than 2.0', () => {
    for (const sd of [0, 100]) {
      const before = table('old', sd, {}, 100);
      const after = table('new', sd, {}, 100);
      after.forEach((a, i) => {
        expect(a.maxItems, `θ=${a.theta}`).toBeLessThanOrEqual(PLACEMENT_BUDGET.test);
        expect(a.meanItems, `θ=${a.theta}`).toBeLessThanOrEqual(35);
        expect(a.meanItems, `θ=${a.theta}`).toBeLessThan(before[i].meanItems * 0.6);
      });
      for (const a of table('new', sd, { singing: true }, 50)) expect(a.maxItems).toBeLessThanOrEqual(PLACEMENT_BUDGET.testSung);
    }
  });
  it('one area takes about 8 items at most', () => {
    for (const d of DOMAINS) for (const a of table('new', 100, { domain: d.id, singing: true }, 40)) expect(a.maxItems, `${d.id} θ=${a.theta}`).toBeLessThanOrEqual(PLACEMENT_BUDGET.area);
  });
  it('lands within about one rung band of the truth (mean |error| ≤ 150)', () => {
    for (const sd of [0, 100]) for (const a of table('new', sd, {}, 100)) {
      expect(a.errMeasured, `sd=${sd} θ=${a.theta} measured`).toBeLessThanOrEqual(150);
      expect(a.errAll, `sd=${sd} θ=${a.theta} all`).toBeLessThanOrEqual(160);
    }
  });
});

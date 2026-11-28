// SPEC-HOLISTIC-2 v12 §9.1 (+ round 17): the measurement simulation harness. Unit tests of each rule, then the spec's stated targets
// on synthetic learners (fixed seeds, modest run counts). A target that fails is marked it.fails with the measured
// number in the comment — the rule is never weakened to make it pass (owner: the harness validates the rules).
import { describe, expect, it } from 'vitest';
import {
  admitLook, betaCdf, breadthOk, climb, defaultCatalogue, deriveRank, designEffect, entryCeiling, gamingOneExercise, initCurrentForm, initPlacement,
  itemPassAt, itemPassFlow, marginalP, muForMarginal, nonTempoPlacementDay, pPairWithin, placementRun, readingFalsePass, readingPassed, stepCurrentForm,
  snapToNonEmpty, syntheticCatalogue, type NonTempoMode, tempoPlacementDay, RANK_V12, updateRankHW, wrongDemotion, type Exercise, type Look, type PassRecord, type Take,
  H10_ON, h10Study, mulberry32, RANK_FIX, RANK_GUARDED, RHO_CELL, RHO_CELL_TIER, SHARED_SUPPLY, stationaryHonesty, THRESHOLD, thresholdEstimate, TIER_GUARD, tierGuardOk,
  childSeed, DEFAULT_RANK, DEFAULT_SUPPLY, H10_OFF, h10Default, simulate, STEADY_LEARNER,
  DEFAULT_LEARNER, guardLo, h10Overshoot, H10_V14, ItemPassTracker, PENDING_MAX_DAYS, V14_GUARD_PLANNER, type CountingCheck,
} from '../src/engine/measure/sim';
const DEFAULT_LEARNER_FOR_TEST = { ...DEFAULT_LEARNER, rate: 0 };
import { realCatalogues } from '../src/engine/measure/sim/realCatalogue';

const SEED = 20261127;
const H = (day: number, hour: number) => day * 24 + hour;
const take = (day: number, hour: number, clean: boolean, cold: boolean, firstColdOfDay = cold): Take => ({ at: H(day, hour), day, clean, cold, firstColdOfDay, atTarget: true });

describe('stats', () => {
  it('beta CDF matches closed forms', () => {
    expect(betaCdf(0.3, 1, 1)).toBeCloseTo(0.3, 10);
    expect(betaCdf(0.5, 2, 2)).toBeCloseTo(0.5, 10);
    expect(betaCdf(0.6, 3, 1)).toBeCloseTo(0.216, 10); // x^3
    expect(betaCdf(0.6, 1, 3)).toBeCloseTo(1 - 0.4 ** 3, 10);
  });
  it('design effect: §1.7 formula', () => {
    expect(designEffect(10, 10, 10)).toBe(1);
    expect(designEffect(10, 5, 10)).toBeCloseTo(1 + 1 * 0.15, 10);
    expect(designEffect(12, 6, 3)).toBeCloseTo(1 + 0.15 + 3 * 0.2, 10);
  });
  it('marginal p inverts', () => {
    expect(marginalP(muForMarginal(0.75, 1.06), 1.06)).toBeCloseTo(0.75, 6);
  });
});

describe('item pass (§1.6; the default V1 agrees with V0 on these logs)', () => {
  it('3 counted cleans on 2 days + 2 first-cold cleans on two later days', () => {
    const t = [take(0, 18, true, true), take(0, 18.1, true, false), take(0, 18.2, true, false), take(1, 18, true, true), take(2, 18, true, true)];
    expect(itemPassAt(t)).toBe(H(2, 18));
  });
  it('one session (even with a 1 h break) cannot pass', () => {
    const t = [take(0, 10, true, true), take(0, 10.1, true, false), take(0, 12, true, true), take(0, 14, true, true)];
    expect(itemPassAt(t)).toBeNull();
  });
  it('the midnight hole is closed: < 8 h after the first target does not count', () => {
    const t = [take(0, 23.5, true, true), take(0, 23.6, true, false), take(0, 23.7, true, false), take(1, 7, true, true), take(2, 7, true, true)];
    expect(itemPassAt(t)).toBeNull(); // day 1 at 07:00 is 7.5 h later: only day 2 counts → one counting take
    expect(itemPassAt([...t, take(3, 9, true, true)])).toBe(H(3, 9));
  });
  it('a cold miss between the two resets the pair', () => {
    const t = [take(0, 18, true, true), take(0, 18.1, true, false), take(0, 18.2, true, false), take(1, 18, true, true), take(2, 18, false, true), take(3, 18, true, true)];
    expect(itemPassAt(t)).toBeNull();
    expect(itemPassAt([...t, take(4, 18, true, true)])).toBe(H(4, 18));
  });
  it('only first cold takes of the day count', () => {
    const t = [take(0, 18, true, true), take(0, 18.1, true, false), take(0, 18.2, true, false), take(1, 9, true, true), take(1, 12, true, true, false)];
    expect(itemPassAt(t)).toBeNull();
  });
  it('pair probability: exact DP agrees with the tracker flow at the extremes', () => {
    expect(pPairWithin(1, 2)).toBe(1);
    expect(pPairWithin(0.5, 2)).toBeCloseTo(0.25, 10);
    expect(pPairWithin(0.5, 3)).toBeCloseTo(0.375, 10);
    expect(itemPassFlow(0.98, 28, 50, SEED, { sdDay: 0 })).toBe(1);
  });
});

describe('reading / transfer pass (§1.6)', () => {
  const att = (days: number[], clean: boolean[]) => days.map((day, i) => ({ day, clean: clean[i] }));
  it('needs ≥ 8 attempts on ≥ 3 days', () => {
    expect(readingPassed(att([0, 0, 0, 0, 1, 1, 1, 1, 1, 1], Array(10).fill(true)))).toBe(false); // 2 days
    expect(readingPassed(att([0, 0, 1, 1, 2, 2, 2], Array(7).fill(true)))).toBe(false); // 7 attempts
    expect(readingPassed(att([0, 0, 0, 1, 1, 1, 2, 2, 2, 2], Array(10).fill(true)))).toBe(true);
  });
  it('an old miss fades (half-life 10 attempts); a recent one does not', () => {
    const days = Array.from({ length: 40 }, (_, i) => Math.floor(i / 4));
    const early = Array(40).fill(true);
    early[0] = false;
    early[1] = false;
    const late = Array(40).fill(true);
    late[38] = false;
    late[39] = false;
    expect(readingPassed(att(days, early))).toBe(true);
    expect(readingPassed(att(days, late))).toBe(false);
  });
});

describe('rank H8 and the entry ceiling (§1.3, §1.7)', () => {
  const cat = syntheticCatalogue('t', [3, 3, 0, 3, 2, 3], 12).exercises;
  const pass = (id: string, tier: number, key: number | null): PassRecord => ({ exerciseId: id, tier, key, at: 0 });
  it('three exercises in two keys with one at the tier → rank', () => {
    const p = [pass('t:T1:0', 1, 0), pass('t:T1:1', 1, 1), pass('t:T1:2', 1, 1)];
    expect(updateRankHW(cat, p, 0, null)).toBe(1);
  });
  it('one exercise in many keys never raises rank', () => {
    const p = Array.from({ length: 12 }, (_, k) => pass('t:T1:0', 1, k));
    expect(updateRankHW(cat, p, 0, null)).toBeNull();
  });
  it('three passes all in one key do not raise it', () => {
    const p = [pass('t:T1:0', 1, 3), pass('t:T1:1', 1, 3), pass('t:T1:2', 1, 3)];
    expect(updateRankHW(cat, p, 0, null)).toBeNull();
  });
  it('passes above count; ≥ 1 pass at the tier itself is needed', () => {
    const p = [pass('t:T3:0', 3, 0), pass('t:T4:0', 4, 1), pass('t:T5:0', 5, 2)];
    expect(deriveRank(cat, p, 5)).toBe(3);
  });
  it('an empty tier is skipped, never passed by default', () => {
    const p = [pass('t:T1:0', 1, 0), pass('t:T1:1', 1, 1), pass('t:T1:2', 1, 1)];
    const r = updateRankHW(cat, p, 0, null);
    expect(r).toBe(1);
    expect(entryCeiling(cat, 0, r, new Set(p.map((x) => x.exerciseId)))).toBe(3); // T2 empty: +1 = T3
  });
  it('the t + 2 opening once every exercise at + 1 is passed', () => {
    const passed = new Set(['t:T1:0', 't:T1:1', 't:T1:2']);
    expect(entryCeiling(cat, 0, 0, passed)).toBe(3);
    expect(entryCeiling(cat, 0, 0, new Set())).toBe(1);
  });
  it('a 2-exercise tier needs min(3, available in t … ceiling): passing both opens T5, so a third pass is needed', () => {
    const p = [pass('t:T4:0', 4, 0), pass('t:T4:1', 4, 1)];
    // From rankHW 3 the ceiling is T4; passing both T4 exercises opens T5 (t + 2), so available in T4…T5 = 5 → need 3.
    expect(updateRankHW(cat, p, 0, 3)).toBe(3);
    expect(updateRankHW(cat, [...p, pass('t:T5:0', 5, 2)], 0, 3)).toBe(4);
    // With only one T4 pass the ceiling stays T4: available 2 → need 2.
    expect(updateRankHW(cat, [p[0]], 0, 3)).toBe(3);
  });
  it('rank never falls; unavailable exercises are not counted', () => {
    expect(updateRankHW(cat, [], 0, 3)).toBe(3);
    const mic: Exercise[] = cat.map((e) => (e.tier === 1 && e.id !== 't:T1:0' ? { ...e, available: false } : e));
    // A mic learner whose T1 holds one available exercise: passing it opens T3 (t + 2 over non-empty tiers), so the
    // bar at T1 becomes min(3, 1 + 3) = 3 exercises at tiers ≥ T1 — one pass is not enough, two T3 passes complete it.
    expect(updateRankHW(mic, [pass('t:T1:0', 1, 0)], 0, null)).toBeNull();
    expect(updateRankHW(mic, [pass('t:T1:0', 1, 0), pass('t:T3:0', 3, 1), pass('t:T3:1', 3, 2)], 0, null)).toBe(1);
  });
  it('coverage-only passes (teacher target, loose voice band) never count', () => {
    const p = [pass('t:T1:0', 1, 0), pass('t:T1:1', 1, 1), { ...pass('t:T1:2', 1, 1), countsForRank: false }];
    expect(updateRankHW(cat, p, 0, null)).toBeNull();
  });
});

describe('placement correction (§1.3)', () => {
  it('tempo: ≥ 2 tiers below on 5 offered days drops one tier, count restarts', () => {
    let s = initPlacement(5);
    for (let i = 0; i < 4; i++) s = tempoPlacementDay(s, 3);
    expect(s.placedTier).toBe(5);
    s = tempoPlacementDay(s, 4); // only 1 below: not counted
    s = tempoPlacementDay(s, 2);
    expect(s.placedTier).toBe(4);
    expect(s.count).toBe(0);
  });
  it('non-tempo N0: ≥ 8 attempts on ≥ 3 offered days with a clean share < 35 % drops one tier', () => {
    let s = initPlacement(4);
    s = nonTempoPlacementDay(s, [false, false, true, false], undefined, 'N0', 0);
    s = nonTempoPlacementDay(s, [false, false, false, false], undefined, 'N0', 1);
    expect(s.placedTier).toBe(4); // 8 attempts but only 2 days
    s = nonTempoPlacementDay(s, [false], undefined, 'N0', 2);
    expect(s.placedTier).toBe(3); // 1 / 9 clean on 3 days
    expect(s.hist.length).toBe(0);
    let ok = initPlacement(4);
    for (let i = 0; i < 30; i++) ok = nonTempoPlacementDay(ok, [true, false], undefined, 'N0', i); // 50 %
    expect(ok.placedTier).toBe(4);
  });
  it('non-tempo N1 (default) / N2 / N3', () => {
    const days = (mode: NonTempoMode, perDay: boolean[][]) => perDay.reduce((s, d, i) => nonTempoPlacementDay(s, d, undefined, mode, i), initPlacement(4)).placedTier;
    const f3 = [false, false, false];
    expect(days('N1', [f3, f3, f3])).toBe(4); // 9 attempts
    expect(days('N1', [f3, f3, f3, [true, false, false]])).toBe(3); // 12 attempts, 4 days, 1/12
    expect(days('N1', [[true, true, false], f3, f3, f3])).toBe(3); // 2/12 = 17 %
    expect(days('N1', [[true, true, true, true], f3, f3, [false, false]])).toBe(4); // 4/12 = 33 %
    // N3: no improvement — the last 6 no better than the first 6
    expect(days('N3', [f3, f3, [true, false, false], [true, false, false]])).toBe(4); // last 6: 2/6 > first 6: 0/6
    expect(days('N3', [[true, false, false], f3, f3, [true, false, false]])).toBe(3); // 1/6 ≤ 1/6
    // N2: the last 10 attempts over ≥ 3 days, after ≥ 12 in all
    expect(days('N2', [[true, true, true, true, true], f3, f3, [false, true]])).toBe(4); // last 10: 3/10 = 30 %, not < 30 %
    expect(days('N2', [[true, true, true, true, true], f3, f3, f3])).toBe(3); // last 10: 1/10 over 4 days
    expect(days('N2', [f3, f3, f3])).toBe(4); // < 12 attempts in all
  });
  it('fix 2: a placement or a drop onto an empty tier snaps down to a non-empty tier', () => {
    expect(snapToNonEmpty(5, [0, 1, 2, 3, 4, 6])).toBe(4);
    expect(initPlacement(5, [0, 1, 2, 3, 4, 6]).placedTier).toBe(4);
    expect(snapToNonEmpty(1, [3, 4])).toBe(3);
    let s = initPlacement(6, [0, 1, 2, 3, 4, 6]);
    for (let i = 0; i < 5; i++) s = tempoPlacementDay(s, 1, [0, 1, 2, 3, 4, 6]);
    expect(s.placedTier).toBe(4); // 6 − 1 = 5 is empty → 4
  });
});

describe('item-pass variants (V0–V3)', () => {
  const warm = [take(0, 18, true, true), take(0, 18.1, true, false), take(0, 18.2, true, false)];
  const cold = (seq: boolean[]) => seq.map((c, i) => take(i + 1, 18, c, true));
  it('V0: the pair; V1: pair + ≥ 2/3 of the last ≤ 6', () => {
    expect(itemPassAt([...warm, ...cold([true, true])], 'anyCold', 'V0')).toBe(H(2, 18));
    expect(itemPassAt([...warm, ...cold([true, true])], 'anyCold', 'V1')).toBe(H(2, 18));
    // F F F T T: the pair completes at check 5, share 2/5 < 2/3 → V1 waits; T at 6 → 3/6 still < 2/3; T at 7 → 4/6
    expect(itemPassAt([...warm, ...cold([false, false, false, true, true])], 'anyCold', 'V0')).toBe(H(5, 18));
    expect(itemPassAt([...warm, ...cold([false, false, false, true, true, true])], 'anyCold', 'V1')).toBeNull();
    expect(itemPassAt([...warm, ...cold([false, false, false, true, true, true, true])], 'anyCold', 'V1')).toBe(H(7, 18));
  });
  it('V2: 3 of the last 4 counting checks; V3: Beta posterior, ≥ 3 checks', () => {
    expect(itemPassAt([...warm, ...cold([true, false, true, true])], 'anyCold', 'V2')).toBe(H(4, 18));
    expect(itemPassAt([...warm, ...cold([true, true])], 'anyCold', 'V2')).toBeNull();
    expect(itemPassAt([...warm, ...cold([true, true, true])], 'anyCold', 'V3')).toBe(H(3, 18)); // Beta(4,1): 0.87
    expect(itemPassAt([...warm, ...cold([true, false, true, true])], 'anyCold', 'V3')).toBeNull(); // Beta(4,2): 0.66
  });
  it('stricter variants pass weak cells less often (28 days, 4 days/wk)', () => {
    const v0 = itemPassFlow(0.4, 28, 300, SEED, { variant: 'V0' });
    const v3 = itemPassFlow(0.4, 28, 300, SEED, { variant: 'V3' });
    expect(v3).toBeLessThan(v0);
  });
});

describe('current form (§1.7)', () => {
  const lk = (day: number, cell: string, ex: string, key: number, clean: boolean, tier = 3): Look => ({ at: H(day, 18), day, cell, exerciseId: ex, key, tier, clean });
  it('≤ 2 looks per area per day, the second from another exercise', () => {
    const a = lk(0, 'c1', 'e1', 0, true);
    expect(admitLook([a], { cell: 'c2', exerciseId: 'e1' })).toBe(false);
    expect(admitLook([a], { cell: 'c3', exerciseId: 'e2' })).toBe(true);
    expect(admitLook([a, lk(0, 'c3', 'e2', 1, true)], { cell: 'c4', exerciseId: 'e3' })).toBe(false);
  });
  it('breadth: min(3, passed exercises) and min(2, keys)', () => {
    const passed = [{ cell: 'c1', exerciseId: 'e1', key: 0, tier: 3 }, { cell: 'c2', exerciseId: 'e2', key: 1, tier: 3 }, { cell: 'c3', exerciseId: 'e3', key: 1, tier: 3 }];
    expect(breadthOk([lk(0, 'c1', 'e1', 0, true), lk(1, 'c2', 'e2', 1, true)], passed, 3)).toBe(false);
    expect(breadthOk([lk(0, 'c1', 'e1', 0, true), lk(1, 'c2', 'e2', 1, true), lk(2, 'c3', 'e3', 1, true)], passed, 3)).toBe(true);
  });
  it('a clear slump drops exactly one tier; follows rank up; needs ≥ 8 fresh looks', () => {
    const passed = [0, 1, 2].map((i) => ({ cell: `c${i}`, exerciseId: `e${i}`, key: i % 2, tier: 3 }));
    let s = stepCurrentForm(initCurrentForm(), [], passed, 3, 0).state;
    expect(s.cf).toBe(3);
    const bad: Look[] = [];
    for (let d = 1; d <= 6; d++) for (let i = 0; i < 2; i++) bad.push(lk(d, `c${(d + i) % 3}`, `e${(d + i) % 3}`, (d + i) % 2, false));
    const r = stepCurrentForm(s, bad.slice(0, 7), passed, 3, H(7, 0));
    expect(r.event).toBeNull(); // 7 looks
    const r2 = stepCurrentForm(s, bad, passed, 3, H(7, 0));
    expect(r2.event).toBe('slump');
    expect(r2.state.cf).toBe(2);
    s = r2.state;
    expect(stepCurrentForm(s, bad, passed, 3, H(7, 1)).event).toBeNull(); // no fresh looks since the decision
  });
});

// ---------------------------------------------------------------- the §9.1 targets on synthetic learners

describe('§9.1 targets (synthetic learners)', () => {
  it('reading / transfer false pass < 10 % at true p = 0.5, day SD 0.8 (90 days, 4 attempts/day, 4 days/week)', () => {
    expect(readingFalsePass(0.5, 90, 300, SEED)).toBeLessThan(0.1);
  });

  it('wrong demotion < 5 % per 90 days at true p ≥ 0.75', () => {
    expect(wrongDemotion(0.75, 60, SEED).wrongRate).toBeLessThan(0.05);
  }, 60000);

  it('a correctly placed learner is never corrected (tempo and non-tempo areas)', () => {
    expect(placementRun(0, true, 40, SEED).corrected).toBe(0);
    expect(placementRun(0, false, 40, SEED).corrected).toBe(0);
  }, 60000);

  it('an over-placed learner (+3 tiers) is corrected (tempo area)', () => {
    expect(placementRun(3, true, 30, SEED).corrected).toBeGreaterThan(0.9);
  }, 60000);

  it('a steadily improving learner climbs T0 → T5 on rotation alone, with no stall (synthetic catalogue: an empty tier, a 2-exercise tier)', () => {
    const c = climb(defaultCatalogue(), 20, SEED);
    expect(c.reachedTarget).toBe(1);
    expect(c.stalls).toBe(0);
  }, 60000);

  it('per area, on the real catalogue (piano), rotation-only climbs reach every tier that has content, with no stall', () => {
    for (const cat of realCatalogues('piano')) {
      const c = climb(cat, 8, SEED, 540);
      expect(c.reachedAll, cat.name).toBe(1);
      expect(c.stalls, cat.name).toBe(0);
    }
  }, 60000);

  it('one exercise in many keys never raises rank (rank-gaming guard)', () => {
    expect(gamingOneExercise(10, SEED).every((r) => r === null)).toBe(true);
  }, 60000);
});

// ---------------------------------------------------------------- the three findings, with the coordinator's fixes

describe('§9.1 findings, fixed (coordinator 2026-11-27)', () => {
  // Fix 1. Under v12 as written, a range t … ceiling with ONE available exercise needs min(3, 1) = 1 exercise in
  // min(2, 12) = 2 keys, so one exercise in 2 keys gave the tier (the guard failed). Now rank needs >= 2 distinct
  // exercises; such a range is grouped with the next non-empty tier above, or, for a 1-exercise top tier, below.
  it('one exercise in two keys never raises rank, even on a 1-exercise tier', () => {
    const top = syntheticCatalogue('one', [3, 1], 12).exercises; // T1 = a 1-exercise top tier
    const p: PassRecord[] = [{ exerciseId: 'one:T1:0', tier: 1, key: 0, at: 0 }, { exerciseId: 'one:T1:0', tier: 1, key: 5, at: 1 }];
    expect(updateRankHW(top, p, 0, 0, RANK_V12)).toBe(1); // the v12 hole
    expect(updateRankHW(top, p, 0, 0)).toBe(0); // fixed: grouped with T0, one exercise is not enough
    expect(updateRankHW(top, [p[0], { exerciseId: 'one:T0:1', tier: 0, key: 3, at: 2 }], 0, 0)).toBe(1); // T0 + T1 → T1
    expect(updateRankHW(top, [{ exerciseId: 'one:T0:1', tier: 0, key: 3, at: 2 }, { exerciseId: 'one:T0:2', tier: 0, key: 4, at: 3 }], 0, 0)).toBe(0); // ≥ 1 at T1 needed
    // A 1-exercise tier below others: rank 0, ceiling T1 (1 exercise) → grouped with T2 (2 more): 2 distinct needed.
    const mid = syntheticCatalogue('mid', [3, 1, 2], 12).exercises;
    const one: PassRecord = { exerciseId: 'mid:T1:0', tier: 1, key: 0, at: 0 };
    expect(updateRankHW(mid, [one, { ...one, key: 5 }], 0, 0, RANK_V12)).toBe(0); // passing T1 opened T2 already
    expect(updateRankHW(mid, [one, { exerciseId: 'mid:T2:0', tier: 2, key: 3, at: 2 }, { exerciseId: 'mid:T2:1', tier: 2, key: 3, at: 3 }], 0, 0)).toBe(1); // T2: both in one key → T1
  });

  // Fix 2. A learner placed on an EMPTY tier (T5 of the synthetic catalogue, true level T2) was never offered an item
  // at placedTier, so the correction never ran. Now the placement snaps down to T4 and is corrected.
  it('an over-placed learner placed on an empty tier is corrected', () => {
    expect(placementRun(3, true, 20, SEED, { trueAt: 2 }).corrected).toBeGreaterThan(0.9);
  }, 60000);

  // Fix 3. The posterior rule P(p < 0.4) >= 0.9 rarely fired (0–4 % of +2 over-placed reading learners corrected).
  // Now N1: >= 12 attempts on >= 4 offered days with a clean share < 30 %.
  it('an over-placed learner (+2 tiers) is corrected in a non-tempo (reading) area', () => {
    expect(placementRun(2, false, 40, SEED, { rate: 0 }).corrected).toBeGreaterThan(0.75); // measured 85.5 % (400 runs)
  }, 60000);

  // §9.1 "a correctly placed learner is never corrected": N0 (the first fix 3) corrected 1.3–1.8 %; N1 0 / 800.
  it('a correctly placed reading learner is never corrected (N1, 300 learners)', () => {
    expect(placementRun(0, false, 300, SEED + 70, { rate: 0 }).corrected).toBe(0);
  }, 60000);
  it('N0 did correct some correctly placed learners (the reason it is not the default)', () => {
    expect(placementRun(0, false, 300, SEED + 70, { rate: 0, mode: 'N0' }).corrected).toBeGreaterThan(0);
  }, 60000);
});

// ---------------------------------------------------------------- round 17 (docs/REVIEW-HOLISTIC-round17-measurement.md)

describe('round 17: pass evidence, keys union, tier guard, threshold estimate (units)', () => {
  const warm = (d: number) => [take(d, 18, true, true), take(d, 18.1, true, false), take(d, 18.2, true, false)];
  const cold = (from: number, seq: boolean[]) => seq.map((c, i) => take(from + i, 18, c, true));
  it('P1: a new key of the same exercise does not reset its misses; P0 does', () => {
    const a = [...warm(0), ...cold(1, [false, false, false, false])];
    const b = [...warm(10), ...cold(11, [true, true])];
    expect(itemPassAt(b, 'anyCold', 'V1', 'P0')).toBe(H(12, 18)); // a fresh key passes on 2 / 2
    const pool: boolean[] = [];
    expect(itemPassAt(a, 'anyCold', 'V1', 'P1', pool)).toBeNull();
    expect(itemPassAt(b, 'anyCold', 'V1', 'P1', pool)).toBeNull(); // pooled last 6: 2 / 6 < 2 / 3
  });
  it('P2: >= 4 counting checks before the share test', () => {
    expect(itemPassAt([...warm(0), ...cold(1, [true, true])], 'anyCold', 'V1', 'P2')).toBeNull();
    expect(itemPassAt([...warm(0), ...cold(1, [true, true, true, true])], 'anyCold', 'V1', 'P2')).toBe(H(4, 18));
  });
  it('§1.7 step 4: available keys = the union of the exercises\' keys', () => {
    const ex: Exercise[] = [
      { id: 'z0', tier: 0, keys: 12, available: true }, { id: 'z1', tier: 0, keys: 12, available: true },
      { id: 'a', tier: 1, keys: 1, keySet: [0], available: true }, { id: 'b', tier: 1, keys: 1, keySet: [5], available: true },
      { id: 'c', tier: 2, keys: 12, available: true }, { id: 'd', tier: 2, keys: 12, available: true },
    ];
    const p: PassRecord[] = [{ exerciseId: 'a', tier: 1, key: 0, at: 0 }, { exerciseId: 'c', tier: 2, key: 0, at: 1 }];
    expect(updateRankHW(ex, p, 0, 0)).toBe(0); // union: 2 keys available (C, F), 1 covered
    expect(updateRankHW(ex, p, 0, 0, { ...RANK_FIX, keysUnion: false })).toBe(1); // the earlier max rule
  });
  it('rank tier guard: the pooled record of every counting check at the tier', () => {
    const ck = (n: number, clean: number) => Array.from({ length: n }, (_, i) => ({ tier: 2, day: Math.floor(i / 3), cell: `c${i % 6}`, clean: i < clean }));
    expect(tierGuardOk(ck(12, 10), 2, 2, TIER_GUARD)).toBe(true);
    expect(tierGuardOk(ck(12, 5), 2, 2, TIER_GUARD)).toBe(false);
    expect(tierGuardOk(ck(5, 5), 2, 2, TIER_GUARD)).toBe(false); // < 6 checks
    expect(tierGuardOk(ck(12, 12), 3, 3, TIER_GUARD)).toBe(false); // no checks at T3
  });
  it('§1.9 threshold estimate recovers a known threshold', () => {
    const rng = mulberry32(SEED);
    const tau = Math.log(0.85);
    const trials = Array.from({ length: 300 }, () => {
      const f = 0.65 + rng() * 0.4;
      return { day: 0, f, clean: rng() < 1 / (1 + Math.exp(-(Math.log(0.707 / 0.293) + THRESHOLD.slope * (tau - Math.log(f))))) };
    });
    const e = thresholdEstimate(trials, 0, 0.7);
    expect(e.f).toBeGreaterThan(0.8);
    expect(e.f).toBeLessThan(0.9);
    expect(e.provisional).toBe(false);
    expect(thresholdEstimate(trials.slice(0, 5), 0, 0.7).provisional).toBe(true);
  });
});

describe('v14 / v15 defaults (owner 2026-11-28; round 18 fixes)', () => {
  it('rank = H8 + the tier guard G; supply = shared slots + FSRS reviews; planner = H10 in full', () => {
    expect(DEFAULT_RANK).toBe(RANK_GUARDED);
    expect(DEFAULT_RANK.tierGuard).toEqual({ bar: 0.5, conf: 0.8, halfLife: 24, minChecks: 6 });
    expect(DEFAULT_SUPPLY).toBe(SHARED_SUPPLY);
    expect(h10Default(defaultCatalogue())).toEqual(H10_ON);
    expect(h10Default(syntheticCatalogue('fixed', [3, 3], 12, false))).toEqual({ ...H10_ON, tempo: false }); // no tempo axis
    expect(RHO_CELL).toBe(0.2); // current form stays cautious (owner 2026-11-28)
  });
  it('a default run uses all three: guard checks logged, FSRS-review looks, the H10 frontier recorded', () => {
    const r = simulate({ catalogue: defaultCatalogue(), learner: STEADY_LEARNER(), days: 120, seed: SEED, recordDaily: true });
    expect(r.checks.length).toBeGreaterThan(0);
    expect(r.reviewLooks).toBeGreaterThan(0);
    expect(r.daily.some((d) => d.frontier !== undefined)).toBe(true);
    const v13 = simulate({ catalogue: defaultCatalogue(), learner: STEADY_LEARNER(), days: 120, seed: SEED, recordDaily: true, rank: RANK_FIX, supply: { mode: 'perArea', reviews: false }, h10: H10_OFF });
    expect(v13.reviewLooks).toBe(0);
    expect(v13.daily.some((d) => d.frontier !== undefined)).toBe(false);
  });
  it('the real catalogue scores bass with the spec\'s 3 laddered areas (§1.10), piano and guitar with 5', () => {
    expect(realCatalogues('bass').map((c) => c.name).sort()).toEqual(['bass/arpeggios', 'bass/scales', 'bass/walking']);
    expect(realCatalogues('piano').length).toBe(5);
    expect(realCatalogues('guitar').length).toBe(5);
  });
  it('the guard holds rank that ungated H8 would give (the record of every counting check, not only passes)', () => {
    const ex = syntheticCatalogue('g', [3, 3], 12).exercises;
    const p: PassRecord[] = [0, 1, 2].map((i) => ({ exerciseId: `g:T0:${i}`, tier: 0, key: i, at: 0 }));
    const bad = Array.from({ length: 12 }, (_, i) => ({ tier: 0, day: i, cell: `c${i}`, clean: i % 3 === 0 }));
    expect(updateRankHW(ex, p, 0, null, RANK_FIX)).toBe(0);
    expect(updateRankHW(ex, p, 0, null, DEFAULT_RANK, bad)).toBeNull();
  });
});

describe('round 17 targets (on the v15 defaults)', () => {
  // Review #1: learners who never improve. Rank never falls, so every rise above the true level is permanent. Ungated H8
  // inflates it (round 17 report: 22 % of rises at tier p < 0.5 at p 0.75); the tier guard G, now the default, meets it.
  it('stationary learners: rank rises at tier p < 0.5 <= 10 % over 365 days at p 0.5 and 0.75 (default, G)', () => {
    expect(stationaryHonesty(0.5, 12, SEED + 1).risesBelowHalf).toBeLessThanOrEqual(0.1);
    expect(stationaryHonesty(0.75, 12, SEED + 1).risesBelowHalf).toBeLessThanOrEqual(0.1);
  }, 120000);
  it('stationary learners: ungated H8 (RANK_FIX, selectable) does not meet it (why G is the default)', () => {
    expect(stationaryHonesty(0.75, 12, SEED + 1, { sim: { rank: RANK_FIX } }).risesBelowHalf).toBeGreaterThan(0.1);
  }, 60000);

  // The round 17 stall (1 / 300 climbs under G): the guard's record at the first rankable tier held the misses from before
  // the learner could play it, and nothing re-offered that tier. The guard reserve gives it fresh checks.
  it('improving learners, the round 17 §1b setup (15 areas, bass scored with 5 areas, 20 climbs each, the report seeds): no stall >= 42 days, every tier reached', () => {
    let stalls = 0;
    let missed = 0;
    for (const cat of [...realCatalogues('piano'), ...realCatalogues('guitar'), ...realCatalogues('bass', true)]) {
      const c = climb(cat, 20, SEED + 60);
      stalls += c.stalls;
      missed += c.reachedAll < 1 ? 1 : 0;
    }
    expect(stalls).toBe(0);
    expect(missed).toBe(0);
  }, 300000);
  // With bass on the spec's 3 areas (v14), bass/walking holds 1 exercise at T1 and T2 and none at T3: rank T1 then needs a
  // T4 pass (breadth 3 over T1 … the opened ceiling), which no planner can make easy. A catalogue gap, not a rule fault
  // (ungated H8 stalls there too); the §1.2 catalogue rule asks >= 3 exercises per tier and no lone 1-exercise tiers at the bottom of an area.
  it('v14 areas: every stall is in bass/walking (the catalogue gap), none elsewhere', () => {
    for (const cat of [...realCatalogues('piano'), ...realCatalogues('guitar'), ...realCatalogues('bass')]) {
      if (cat.name === 'bass/walking') continue;
      const c = climb(cat, 20, SEED + 60);
      expect(c.stalls, cat.name).toBe(0);
      expect(c.reachedAll, cat.name).toBe(1);
    }
  }, 300000);
  it('the round 17 stall reproduces without the guard reserve (bass/scales as scored in round 17, climb 2)', () => {
    const cat = realCatalogues('bass', true).find((c) => c.name === 'bass/scales')!;
    const o = { catalogue: cat, learner: STEADY_LEARNER(), days: 365, seed: childSeed(SEED + 60, 2), rank: RANK_GUARDED, supply: { mode: 'perArea' as const, reviews: false }, h10: H10_OFF };
    expect(simulate({ ...o, planner: { guardReserve: false } }).longestStall).toBeGreaterThanOrEqual(42);
    expect(simulate(o).longestStall).toBeLessThan(42);
  }, 60000);

  // Review #3: the spec's supply (a per-session cap shared by the instrument's areas, plus FSRS-review looks), the default.
  it('wrong demotion < 5 % per 90 days at true p >= 0.75 under the default (shared) supply, against both truths', () => {
    const r = wrongDemotion(0.75, 40, SEED);
    expect(r.wrongRate).toBeLessThan(0.05);
    expect(r.wrongRateTier).toBeLessThan(0.05);
  }, 60000);

  // Review #4: the estimand is the tier's fresh-cell p. The owner kept ρ_c 0.20 (cautious, 2026-11-28): its 80 % interval
  // OVER-covers that estimand (fewer wrong slumps, slower re-promotion). This stays it.fails on purpose: 0.20 is not
  // "calibrated" in the 77-83 % sense and the spec no longer claims it is. The positive test below pins the decided
  // behaviour (coverage >= 80 %).
  const cal = (() => {
    let r: ReturnType<typeof wrongDemotion> | null = null;
    return () => (r ??= wrongDemotion(0.85, 40, SEED + 60, { sim: { calibRhoC: [RHO_CELL, RHO_CELL_TIER] } }));
  })();
  it.fails('the window posterior is calibrated for the tier estimand at ρ_c 0.20 (80 % interval covers 77-83 %)', () => {
    const c = cal().grid[0].tierCoverage;
    expect(c).toBeGreaterThanOrEqual(0.77);
    expect(c).toBeLessThanOrEqual(0.83);
  }, 60000);
  it('at ρ_c 0.20 (the decision value) the 80 % interval over-covers the tier estimand: cautious by design', () => {
    expect(cal().grid[0].tierCoverage).toBeGreaterThanOrEqual(0.8);
  }, 60000);
  it('the alternative not adopted: the re-tuned ρ_c (0.08) is calibrated for the tier estimand', () => {
    const c = cal().grid[1].tierCoverage;
    expect(c).toBeGreaterThanOrEqual(0.77);
    expect(c).toBeLessThanOrEqual(0.83);
  }, 60000);

  // Review #2 / H10: offered frontier difficulty tracks θ (up to the +2 cap) while rank is flat; the default planner.
  it('H10 (default planner): offered difficulty tracks θ while rank is flat, never above the +2 cap, target never falls', () => {
    const r = h10Study('H10', 20, SEED + 90);
    expect(r.flatSlope).toBeGreaterThanOrEqual(0.7);
    expect(r.flatPlateau).toBeLessThanOrEqual(0.15);
    expect(r.overCap).toBe(0);
    expect(r.targetFell).toBe(0);
  }, 60000);

  // Minor: N1 counts every cell at placedTier (spec), confirmation looks of passed cells included.
  it('N1 over all cells at placedTier never corrects a correctly placed learner (fixed-tempo area)', () => {
    expect(placementRun(0, false, 100, SEED + 70, { rate: 0, fixedTempoSim: true }).corrected).toBe(0);
  }, 60000);
});

// ---------------------------------------------------------------- round 18 (docs/REVIEW-HOLISTIC-round18-measurement.md), v15

describe('round 18 #1: the guard in areas without fresh cells (keyless, few keys)', () => {
  const keyless = syntheticCatalogue('keyless', [3, 3, 3, 3, 3, 3, 3], 0, false);
  const oneKey = syntheticCatalogue('one-key', [3, 3, 3, 3, 3, 3, 3], 1, true);
  it('cells are unique per exercise × key: a shelved cell is resumed, never duplicated', () => {
    const r = simulate({ catalogue: oneKey, learner: STEADY_LEARNER(), days: 365, seed: SEED });
    expect(r.cellCount).toBeLessThanOrEqual(oneKey.exercises.length);
    const k = simulate({ catalogue: keyless, learner: { ...STEADY_LEARNER(), rate: 0 }, days: 200, seed: SEED });
    expect(k.cellCount).toBeLessThanOrEqual(keyless.exercises.length);
    // the gaming probe uses every key once, then resumes, never a second cell in a used key
    const g = simulate({ catalogue: defaultCatalogue(), learner: { ...DEFAULT_LEARNER_FOR_TEST, theta0: 4 }, days: 180, seed: SEED, onlyExercise: 'synthetic:T1:0' });
    expect(g.cellCount).toBeLessThanOrEqual(12);
  }, 60000);
  it('keyless and 1-key catalogues: rotation-only climbs reach the top tier with no stall >= 42 days (v15)', () => {
    for (const cat of [keyless, oneKey, syntheticCatalogue('keyless-real-ish', [3, 4, 2, 3, 0, 2, 2], 0, true)]) {
      const c = climb(cat, 10, SEED + 4242);
      expect(c.reachedAll, cat.name).toBe(1);
      expect(c.stalls, cat.name).toBe(0);
    }
  }, 120000);
  it('the v14 guard deadlocks there (why v15 reads passed-cell looks at tiers with no fresh cell left)', () => {
    const c = climb(keyless, 6, SEED + 4242, 365, STEADY_LEARNER(), {}, 'V1', { planner: V14_GUARD_PLANNER });
    expect(c.reachedAll).toBeLessThan(0.5);
    expect(c.stalls).toBeGreaterThan(3);
  }, 60000);
  it('the guard reads looks only at exhausted tiers: in a 12-key area the record is the counting checks alone', () => {
    const r = simulate({ catalogue: defaultCatalogue(), learner: STEADY_LEARNER(), days: 150, seed: SEED });
    expect(r.lookChecks.length).toBeGreaterThan(0);
    // every rise is derivable from the counting-check record alone (no tier of a 12-key, 3–5 exercise area is exhausted in 150 days)
    expect(r.cellCount).toBeLessThan(defaultCatalogue().exercises.length * 12);
  }, 60000);
  it('step 6 lo: the guard range of a 1-exercise top tier grouped downward starts at the tier below', () => {
    const ex = syntheticCatalogue('top1', [3, 3, 1], 12).exercises;
    expect(guardLo(ex, 2, 2)).toBe(1);
    expect(guardLo(ex, 1, 2)).toBe(1);
  });
});

describe('round 18 #2: skipped due checks', () => {
  it('a skipped due check is a counting miss: it resets the pending pair and enters the share', () => {
    const tr = new ItemPassTracker();
    for (const t of [take(0, 18, true, true), take(0, 18.1, true, false), take(0, 18.2, true, false), take(1, 18, true, true)]) tr.add(t);
    expect(tr.pendingDay).toBe(1);
    expect(tr.addSkip(H(2, 18), 2)).toBe(true);
    expect(tr.pendingDay).toBeNull();
    expect(tr.counting).toEqual([true, false]);
    tr.add(take(3, 18, true, true));
    expect(tr.passedAt).toBeNull(); // the pair restarts
    expect(new ItemPassTracker().addSkip(H(2, 18), 2)).toBe(false); // nothing due before the target was reached
  });
  it('a pending first clean expires after 60 days (a long break cannot complete a pair)', () => {
    const t = [take(0, 18, true, true), take(0, 18.1, true, false), take(0, 18.2, true, false), take(1, 18, true, true), take(1 + PENDING_MAX_DAYS + 1, 18, true, true)];
    expect(itemPassAt(t)).toBeNull();
    expect(itemPassAt([...t, take(PENDING_MAX_DAYS + 3, 18, true, true)])).toBe(H(PENDING_MAX_DAYS + 3, 18));
  });
  it('a day picker (warms up first on bad days) does not gain rank under v15; under the v14 rules it did', () => {
    const honest = stationaryHonesty(0.75, 12, SEED + 5);
    const picker = stationaryHonesty(0.75, 12, SEED + 5, { sim: { dayPicker: 'warmFirst' } });
    const v14 = stationaryHonesty(0.75, 12, SEED + 5, { sim: { dayPicker: 'warmFirst', planner: V14_GUARD_PLANNER, h10: H10_V14 } });
    expect(picker.finalRankMedian).toBeLessThanOrEqual(honest.finalRankMedian);
    expect(picker.finalBelowHalfProbe).toBeLessThanOrEqual(0.1);
    expect(v14.finalRankMedian).toBeGreaterThan(honest.finalRankMedian);
  }, 120000);
  it('a learner who senses a bad day and leaves the area is held by the skip share (unplayed due checks become misses)', () => {
    const picker = stationaryHonesty(0.75, 12, SEED + 5, { sim: { dayPicker: 'senseSkip' } });
    expect(picker.finalBelowHalfProbe).toBeLessThanOrEqual(0.1);
  }, 120000);
});

describe('round 18 #4–#6: per-learner honesty, estimand, teacher targets, records', () => {
  it('stationary learners, per learner: final rank at a tier whose probe-band p < 0.5 in <= 10 % (p 0.5, 0.75; no item gain)', () => {
    expect(stationaryHonesty(0.5, 20, SEED + 1).finalBelowHalfProbe).toBeLessThanOrEqual(0.1);
    expect(stationaryHonesty(0.75, 20, SEED + 1).finalBelowHalfProbe).toBeLessThanOrEqual(0.1);
  }, 120000);
  it('the estimand: the p 0.85 learner\'s T4 is p 0.44 at target but 0.50 at the probe band, so its rank is not false', () => {
    const r = stationaryHonesty(0.85, 12, SEED + 1);
    expect(r.finalBelowHalfProbe).toBe(0);
  }, 60000);
  it('the guard ignores records that never count for rank, and the candidate corrections are pure', () => {
    const ck = (n: number, clean: number, extra: Partial<CountingCheck> = {}): CountingCheck[] => Array.from({ length: n }, (_, i) => ({ tier: 2, day: Math.floor(i / 2), cell: `c${i % 6}`, clean: i < clean, ...extra }));
    expect(tierGuardOk(ck(12, 11), 2, 2, TIER_GUARD)).toBe(true);
    expect(tierGuardOk(ck(12, 11, { countsForRank: false }), 2, 2, TIER_GUARD)).toBe(false); // teacher target / loose voice band / not comparable
    expect(tierGuardOk(ck(12, 11), 2, 2, { ...TIER_GUARD, minDays: 7 })).toBe(false); // 6 days
    // persist: a record carried by its last 6 entries passes the plain guard but not the persistence rule
    const run: CountingCheck[] = Array.from({ length: 16 }, (_, i) => ({ tier: 2, day: i, cell: `c${i}`, clean: i >= 6 }));
    expect(tierGuardOk(run, 2, 2, TIER_GUARD)).toBe(true);
    expect(tierGuardOk(run, 2, 2, { ...TIER_GUARD, persist: 6 })).toBe(false);
  });
  it('a lowered teacher target: its passes are coverage only and its checks never enter the guard', () => {
    const cat = syntheticCatalogue('tt', [3, 3, 3], 12);
    const teacherTarget = Object.fromEntries(cat.exercises.map((e) => [e.id, 0.8]));
    const r = simulate({ catalogue: cat, learner: { ...STEADY_LEARNER(), rate: 0.4 }, days: 200, seed: SEED, teacherTarget });
    expect(r.passes.length).toBeGreaterThan(0);
    expect(r.passes.every((p) => p.countsForRank === false)).toBe(true);
    expect(r.checks.every((c) => c.countsForRank === false)).toBe(true);
    expect(r.finalRank).toBeNull();
  }, 60000);
});

describe('round 18 #3: H10 readiness and the challenge point', () => {
  it('evidence readiness and the struggle exemption: a plateaued learner is not served hopeless items at the cap (fixed-tempo and tempo)', () => {
    for (const cat of [defaultCatalogue(), { ...defaultCatalogue(), name: 'fixed', tempo: false }]) {
      const v15 = h10Overshoot(0.75, 12, 99, { cat });
      const v14 = h10Overshoot(0.75, 12, 99, { cat, sim: { h10: { ...H10_V14, tempo: cat.tempo } } });
      expect(v15.pProbe, cat.name).toBeGreaterThan(v14.pProbe);
      expect(v15.hopeless, cat.name).toBeLessThan(v14.hopeless);
      expect(v15.pProbe, cat.name).toBeGreaterThanOrEqual(0.35);
      expect(v15.hopeless, cat.name).toBeLessThanOrEqual(0.35);
    }
  }, 120000);
  it('fixed-tempo areas: the flat-rank slope is >= 0.6 with the offer within 0.5 tier of ability (the v15 target there)', () => {
    const r = h10Study('fixed', 20, SEED + 90, { cat: { ...defaultCatalogue(), name: 'fixed', tempo: false } });
    expect(r.flatSlope).toBeGreaterThanOrEqual(0.6);
    expect(Math.abs(r.meanLag)).toBeLessThanOrEqual(0.5);
    expect(r.overCap).toBe(0);
    expect(r.targetFell).toBe(0);
  }, 120000);
});

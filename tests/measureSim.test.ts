// SPEC-HOLISTIC-2 v12 §9.1: the measurement simulation harness. Unit tests of each rule, then the spec's stated targets
// on synthetic learners (fixed seeds, modest run counts). A target that fails is marked it.fails with the measured
// number in the comment — the rule is never weakened to make it pass (owner: the harness validates the rules).
import { describe, expect, it } from 'vitest';
import {
  admitLook, betaCdf, breadthOk, climb, defaultCatalogue, deriveRank, designEffect, entryCeiling, gamingOneExercise, initCurrentForm, initPlacement,
  itemPassAt, itemPassFlow, marginalP, muForMarginal, nonTempoPlacementDay, pPairWithin, placementRun, readingFalsePass, readingPassed, stepCurrentForm,
  snapToNonEmpty, syntheticCatalogue, tempoPlacementDay, RANK_V12, updateRankHW, wrongDemotion, type Exercise, type Look, type PassRecord, type Take,
} from '../src/engine/measure/sim';
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

describe('item pass (§1.6)', () => {
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
  it('non-tempo (fix 3): ≥ 8 attempts on ≥ 3 offered days with a clean share < 35 % drops one tier', () => {
    let s = initPlacement(4);
    s = nonTempoPlacementDay(s, [false, false, true, false]);
    s = nonTempoPlacementDay(s, [false, false, false, false]);
    expect(s.placedTier).toBe(4); // 8 attempts but only 2 days
    s = nonTempoPlacementDay(s, [false]);
    expect(s.placedTier).toBe(3); // 1 / 9 clean on 3 days
    expect(s.attempts).toBe(0);
    let e = initPlacement(4);
    for (let i = 0; i < 10; i++) e = nonTempoPlacementDay(e, [true, false, false]); // 1/3 = 33 % < 35 %
    expect(e.placedTier).toBeLessThan(4);
    let ok = initPlacement(4);
    for (let i = 0; i < 30; i++) ok = nonTempoPlacementDay(ok, [true, false]); // 50 %
    expect(ok.placedTier).toBe(4);
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
  // exercises; such a range is grouped with the next non-empty tier above.
  it('one exercise in two keys never raises rank, even on a 1-exercise tier', () => {
    const top = syntheticCatalogue('one', [3, 1], 12).exercises; // T1 = a 1-exercise top tier
    const p: PassRecord[] = [{ exerciseId: 'one:T1:0', tier: 1, key: 0, at: 0 }, { exerciseId: 'one:T1:0', tier: 1, key: 5, at: 1 }];
    expect(updateRankHW(top, p, 0, 0, RANK_V12)).toBe(1); // the v12 hole
    expect(updateRankHW(top, p, 0, 0)).toBe(0); // fixed: nothing above to group with, so T1 is never ranked alone
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
  // Now: >= 8 attempts on >= 3 offered days with a clean share < 35 %.
  it('an over-placed learner (+2 tiers) is corrected in a non-tempo (reading) area', () => {
    expect(placementRun(2, false, 20, SEED, { rate: 0 }).corrected).toBeGreaterThan(0.9); // a learner who stays over-placed
  }, 60000);

  // FAILS (fix 3 side effect, §9.1 target "a correctly placed learner is never corrected"): with true cold p 0.75 at
  // placedTier, the cumulative clean share over the first ≥ 8 attempts on ≥ 3 days falls below 35 % for ~1.3 % of
  // learners (day SD 0.8, item SD 0.7): measured 2 of 150 at seed SEED + 70. The 40-run check above misses it.
  it.fails('a correctly placed reading learner is never corrected under fix 3 (150 learners)', () => {
    expect(placementRun(0, false, 150, SEED + 70, { rate: 0 }).corrected).toBe(0);
  }, 60000);
});

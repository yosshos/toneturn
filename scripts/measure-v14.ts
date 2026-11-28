// SPEC-HOLISTIC-2 v14: the harness report on the final defaults (owner 2026-11-28): rank = H8 + the tier guard G,
// current form at rho_c 0.20 (cautious), the H10 planner in full, shared slot supply + FSRS-review looks.
// Report: docs/MEASURE-V14-REPORT.txt. Every number quoted in SPEC-HOLISTIC-2 v14 §1 / §9.1 comes from it.
// Usage: npm run measure-v14               (full precision, ~25-40 min)
//        npm run measure-v14 -- --quick    (fewer runs)
//        npm run measure-v14 -- --only=1,2 (some sections)
import {
  climb, daysPerTier, defaultCatalogue, gamingOneExercise, H10_OFF, H10_PLANNERS, h10Study, PER_AREA_SUPPLY, placementRun, quantile, RANK_FIX, RANK_GUARDED,
  repromotion, RHO_CELL, RHO_DAY, SHARED_SUPPLY, stationaryHonesty, STEADY_LEARNER, syntheticCatalogue, TIER_GUARD, updateRankHW, variantStudy,
  wrongDemotion, DEFAULT_LEARNER, Learner, mulberry32, thetaForP, type SimOptions, type SupplyOpts,
} from '../src/engine/measure/sim';
import { realCatalogues } from '../src/engine/measure/sim/realCatalogue';

const quick = process.argv.includes('--quick');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (s: string) => !only || only.has(s);
const N = (full: number) => (quick ? Math.max(8, Math.round(full / 5)) : full);
const SEED = 20261127;
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const line = (s = '') => console.log(s);
const t0 = Date.now();
const real = [...realCatalogues('piano'), ...realCatalogues('guitar'), ...realCatalogues('bass')];
const ITEM_GAIN = { itemGain: 1.0, itemHalf: 6.7 }; // ≈ 0.3 logit per 10 takes early on, saturating at 1 logit

/** The round 17 G study's planner: v13 planner (no H10), per-area slots, passed exercises re-offered always, no reserved guard slot. */
const R17_G: Partial<SimOptions> = { rank: RANK_GUARDED, supply: PER_AREA_SUPPLY, h10: H10_OFF, planner: { guardReserve: false } };
const CONFIGS: { name: string; sim: Partial<SimOptions> }[] = [
  { name: 'DEFAULT (G + H10 + shared supply)', sim: {} },
  { name: 'ungated H8 (RANK_FIX) + H10 + shared', sim: { rank: RANK_FIX } },
  { name: 'round 17 G row (v13 planner, per-area slots, no guard reserve)', sim: R17_G },
  { name: 'proposal, not adopted: G at P >= 0.9 (+ H10 + shared)', sim: { rank: { ...RANK_GUARDED, tierGuard: { ...TIER_GUARD, conf: 0.9 } } } },
];

line(`# Measurement harness report, SPEC-HOLISTIC-2 v14 defaults${quick ? ' — QUICK' : ''}`);
line(`seed ${SEED}. Defaults (owner 2026-11-28): item pass V1; rank = H8 (>= 2 exercises, grouped tiers, keys = union) + tier guard G (bar ${TIER_GUARD.bar}, P >= ${TIER_GUARD.conf}, half-life ${TIER_GUARD.halfLife} checks, >= ${TIER_GUARD.minChecks} checks; one reserved working slot while it fails at a tier holding a pass);`);
line(`current form rho_d ${RHO_DAY}, rho_c ${RHO_CELL} (cautious); planner = H10 in full (readiness entry, challenge point, no-easier; tempo model in tempo areas); supply = ${SHARED_SUPPLY.sessionCap} slots per session shared by ${SHARED_SUPPLY.areas} areas + FSRS-review looks (<= ${SHARED_SUPPLY.reviewsPerSession} per session); N1 over all cells at placedTier.`);
line('Learners: day SD 0.8, cell SD 0.7 (logit), beta 1.2 logit per tier, warm +0.8 logit.');
line('Truths: "tier p" = cold p on a FRESH cell of the tier (marginal over day and cell effects, no item practice) — the estimand rank and current form are about;');
line('"catalogue p" = the mean over every exercise x key of the tier of the cold p with that cell\'s own item-practice gain (unoffered cells at 0 gain) — equals tier p when item gain is 0;');
line('"probe-band p" = fresh-cell tier p at 0.95 x target, the floor of the probe band, where the tempo model plays counting checks and pass probes (the pass rule counts >= 0.95 x target as target);');
line('"cell p" = a passed cell\'s own cold p (its cell effect and item practice included).');

if (want('1')) {
  line('\n## 1. Stationary-learner honesty: rate 0, from scratch (placedTier 0, rank none), 365 days, 4 d/wk, synthetic catalogue (100 learners per row)');
  line('Start tier T2; true tier = the highest tier with tier p >= 0.75. Target (§9.1): rank rises at tier p < 0.5 <= 10 % over 365 days, at p 0.5 and 0.75.');
  line('| rule | item gain | tier p at T2 | true tier | final rank median / p90 | tier p at final rank (median) | final rank above true tier | rank rises at tier p < 0.5 | rank rises at catalogue p < 0.5 | median catalogue p at a rise | rank rises at probe-band p < 0.5 | passes at cell p < 0.5 |');
  line('|---|---|---|---|---|---|---|---|---|---|---|---|');
  const rows = [
    { ...CONFIGS[0], lp: {}, gain: '0' }, { ...CONFIGS[0], lp: ITEM_GAIN, gain: '0.3 / 10 takes' },
    { ...CONFIGS[1], lp: {}, gain: '0' }, { ...CONFIGS[1], lp: ITEM_GAIN, gain: '0.3 / 10 takes' },
    { ...CONFIGS[2], lp: {}, gain: '0' }, { ...CONFIGS[2], lp: ITEM_GAIN, gain: '0.3 / 10 takes' },
    { ...CONFIGS[3], lp: {}, gain: '0' }, { ...CONFIGS[3], lp: ITEM_GAIN, gain: '0.3 / 10 takes' },
  ];
  for (const c of rows) {
    for (const p of [0.5, 0.75, 0.85]) {
      const r = stationaryHonesty(p, N(100), SEED + 1, { sim: c.sim, lp: c.lp });
      const target = p <= 0.75 ? (r.risesBelowHalf <= 0.1 ? ' PASS' : ' FAIL') : '';
      line(`| ${c.name} | ${c.gain} | ${p} | ${r.trueTier === null ? 'none' : 'T' + r.trueTier} | T${r.finalRankMedian} / T${r.finalRankP90} | ${r.pAtFinalRankMedian.toFixed(2)} | ${pct(r.aboveTrueTier)} | ${pct(r.risesBelowHalf)}${target} | ${pct(r.risesBelowHalfCat)} | ${r.risesCatMedian.toFixed(2)} | ${pct(r.risesBelowHalfProbe)} | ${pct(r.passesCellBelowHalf)} |`);
    }
  }
  {
    const L = { ...DEFAULT_LEARNER, rate: 0 };
    L.theta0 = thetaForP(0.85, 2, L);
    const lr = new Learner(L, mulberry32(1));
    line(`\nThe p 0.85 learner's tiers (fresh cell, at target / at 0.95 x target): ${[2, 3, 4].map((t) => `T${t} ${lr.trueTierP(t).toFixed(2)} / ${lr.trueTierP(t, 0, 0.95).toFixed(2)}`).join('; ')}.`);
  }
  line('\nThe same on the real piano areas (tier p 0.75 at each area\'s 2nd non-empty tier), pooled over the 5 areas (30 learners per area):');
  line('| rule | rank rises at tier p < 0.5 | final rank above true tier | passes at cell p < 0.5 |');
  line('|---|---|---|---|');
  for (const c of CONFIGS.slice(0, 2)) {
    let rises = 0, below = 0, above = 0, n = 0, passes = 0, pb = 0;
    for (const cat of realCatalogues('piano')) {
      const ts = [...new Set(cat.exercises.map((e) => e.tier))].sort((a, b) => a - b);
      const r = stationaryHonesty(0.75, N(30), SEED + 2, { sim: c.sim, cat, startTier: ts[Math.min(1, ts.length - 1)] });
      rises += r.rises;
      below += r.risesBelowHalf * r.rises;
      above += r.aboveTrueTier * N(30);
      n += N(30);
      passes += r.passes;
      pb += r.passesCellBelowHalf * r.passes;
    }
    line(`| ${c.name} | ${pct(below / Math.max(1, rises))} | ${pct(above / n)} | ${pct(pb / Math.max(1, passes))} |`);
  }
}

if (want('1b')) {
  const runs = quick ? { flowRuns: 300, tierRuns: 8, climbRuns: 8 } : { flowRuns: 1000, tierRuns: 20, climbRuns: 20 };
  line(`\n## 1b. Improving learners, real catalogue (13 areas: piano 5, guitar 5, bass 3 per §1.10): days per tier, honesty, stalls (${runs.tierRuns} runs per transition, ${runs.climbRuns} climbs per area)`);
  line('Days per tier: fixed ability, true tier p 0.75 / 0.85 at the next tier, from rank = placedTier = the tier below; median / p90 calendar days (share reached in 240 d when < 99.5 %).');
  line('Climbs: steadily improving learner (cold p 0.6 at T0, +0.25 tiers per practice hour, 4 d/wk), 365 days from T0. Stall = >= 42 days at tier p >= 0.85 on the next tier without a rank rise.');
  line('| rule | item gain | p 0.75, 3 d/wk | p 0.75, 5 d/wk | p 0.85, 3 d/wk | p 0.85, 5 d/wk | rank rises at tier p < 0.5 (climbs) | median tier p at a new rank | passes at cell p < 0.5 | stalls >= 42 d | longest stall (days) | climbs missing a tier |');
  line('|---|---|---|---|---|---|---|---|---|---|---|---|');
  const rows = [{ ...CONFIGS[0], lp: {}, gain: '0' }, { ...CONFIGS[0], lp: ITEM_GAIN, gain: '0.3 / 10 takes' }, { ...CONFIGS[1], lp: {}, gain: '0' }, { ...CONFIGS[2], lp: {}, gain: '0' }, { ...CONFIGS[3], lp: {}, gain: '0' }];
  for (const c of rows) {
    const r = variantStudy('V1', real, SEED, runs, c.sim, c.lp);
    line(`| ${c.name} | ${c.gain} | ${r.tierDays.map((t) => `${t.median} / ${Math.round(t.p90)}${t.reached < 0.995 ? ` (${pct(t.reached)})` : ''}`).join(' | ')} | ${pct(r.rankUpBelowHalf)} | ${r.medianPAtRankUp.toFixed(2)} | ${pct(r.passBelowHalf)} | ${r.stalls} / ${r.climbs} | ${r.worstStall} | ${r.missedTop} / ${r.climbs} |`);
  }
  line('\nThe round 17 stall and its fix (climbs only, same learners and seeds): the G guard\'s pooled record at the first rankable tier held old misses from the weeks before the learner could play it, and the planner never offered that tier again (its exercises were passed; the working slots were taken by hard cells two tiers up), so the guard could not clear even at tier p 0.95. Fix: one working slot per session goes to a fresh cell at the lowest tier above rank that holds a pass but fails the guard, and passed exercises are re-offered in new keys only while their tier needs it (key rule or guard).');
  line('| planner | stalls >= 42 d | longest stall | 95th pct of the longest stall per climb |');
  line('|---|---|---|---|');
  const stallRows: { name: string; sim: Partial<SimOptions> }[] = [
    { name: 'round 17 G: v13 planner, per-area slots, re-offer always, no reserve', sim: R17_G },
    { name: 'round 17 G planner + the guard reserve', sim: { ...R17_G, planner: { guardReserve: true } } },
    { name: 'v14 defaults without the guard reserve', sim: { planner: { guardReserve: false } } },
    { name: 'v14 defaults (with the guard reserve)', sim: {} },
  ];
  for (const s of stallRows) {
    let stalls = 0;
    const longest: number[] = [];
    for (const cat of real) {
      const c = climb(cat, runs.climbRuns, SEED + 60, 365, STEADY_LEARNER(), {}, 'V1', s.sim);
      stalls += c.stalls;
      longest.push(...c.longestStalls);
    }
    line(`| ${s.name} | ${stalls} / ${longest.length} | ${Math.max(...longest)} | ${Math.round(quantile(longest, 0.95))} |`);
  }
}

const SUPPLIES: { name: string; s: Partial<SupplyOpts> }[] = [
  { name: 'DEFAULT: 3 slots/session over 4 areas + FSRS reviews (<= 2/session)', s: SHARED_SUPPLY },
  { name: 'shared 3 over 4 areas, no reviews', s: { ...SHARED_SUPPLY, reviews: false } },
  { name: 'shared 2 over 6 areas + FSRS reviews (<= 1/session)', s: { ...SHARED_SUPPLY, sessionCap: 2, areas: 6, reviewsPerSession: 1 } },
  { name: 'shared 4 over 3 areas + FSRS reviews (<= 2/session)', s: { ...SHARED_SUPPLY, sessionCap: 4, areas: 3 } },
  { name: 'v13 harness: 2 slots/session for this area, no reviews', s: PER_AREA_SUPPLY },
];
const GRID = [0, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3];

if (want('2')) {
  line('\n## 2. Look supply and current form (rank R = T3 placed, fixed ability; 60-day burn-in, 90-day window; 200 learners per row)');
  line('Wrong demotion = a slump while the truth >= 0.75. Truths: "window" = mean fresh-cell p over the decision window\'s own looks (each at its tier; the window at tier t reads passed cells at tiers >= t), the tier estimand as calibration scores it; "tier t" = fresh-cell p at the tier left only; "cells" = mean cell p of the passed cells at tiers >= the tier left (v13). Target < 5 %, judged on the window estimand.');
  line('| supply | tier p at R | d/wk | looks / 90 d (share from reviews) | wrong demotion / 90 d (window; tier t; cells) | any slump | rank rose above R | 80 % coverage vs tier: n_eff / naive | vs cells: n_eff / naive |');
  line('|---|---|---|---|---|---|---|---|---|');
  for (const sp of SUPPLIES) {
    for (const p of [0.75, 0.85]) {
      for (const dpw of [3, 5]) {
        const r = wrongDemotion(p, N(200), SEED + 40, { dpw, sim: { supply: sp.s } });
        line(`| ${sp.name} | ${p} | ${dpw} | ${r.looksPer90.toFixed(0)} (${pct(r.reviewShare)}) | ${pct(r.wrongRateWindow)}; ${pct(r.wrongRateTier)}; ${pct(r.wrongRate)} ${r.wrongRateWindow < 0.05 ? 'PASS' : 'FAIL'} | ${pct(r.anySlump)} | ${pct(r.rankRose)} | ${pct(r.tierCoverage)} / ${pct(r.naiveTierCoverage)} | ${pct(r.coverage)} / ${pct(r.naiveCoverage)} |`);
      }
    }
  }
}

if (want('2') || want('2r')) {
  const L = { ...DEFAULT_LEARNER, rate: 0 };
  L.theta0 = thetaForP(0.85, 3, L);
  const lr = new Learner(L, mulberry32(1));
  line(`\nRe-promotion after a 4-week dip of −3 logits (tier p 0.85 at R = T3, 4 d/wk; 200 learners; fresh-cell p ${[3, 4, 6].map((t) => `T${t} ${lr.trueTierP(t).toFixed(2)}`).join(', ')}; T5 is empty): days from the dip\'s end until current form is back at (a) its pre-dip value, (b) the pre-dip value capped at the highest tier with fresh-cell p >= 0.6 (the re-promotion bar), (c) the pre-dip value capped at the learner's true tier (fresh-cell p >= 0.75). 120 = not back within 120 days.`);
  line('| supply | slumped in the dip | pre-dip current form above (b) / above (c) | (a) back within 120 d; median / p90 days | (b) back within 120 d; median / p90 | (c) back within 120 d; median / p90 |');
  line('|---|---|---|---|---|---|');
  for (const sp of SUPPLIES) {
    const r = repromotion(N(200), SEED + 50, { sim: { supply: sp.s } });
    line(`| ${sp.name} | ${pct(r.slumped)} | ${pct(r.preCfAboveHonest)} / ${pct(r.preCfAboveTrue)} | ${pct(r.recovered)}; ${r.medianDays} / ${r.p90Days} | ${pct(r.recoveredHonest)}; ${r.medianDaysHonest} / ${r.p90DaysHonest} | ${pct(r.recoveredTrue)}; ${r.medianDaysTrue} / ${r.p90DaysTrue} |`);
  }
}

if (want('3')) {
  line('\n## 3. Calibration (estimand: tier p on fresh cells). Decisions use rho_c 0.20 (owner 2026-11-28: cautious); the grid is evaluation only.');
  line('80 % interval coverage at the default supply, pooled over tier p 0.75 / 0.85 and 3 / 5 d/wk (120 learners each).');
  line(`| estimand | naive (raw n) | ${GRID.map((g) => `rho_c ${g}`).join(' | ')} |`);
  line(`|---|---|${GRID.map(() => '---').join('|')}|`);
  const acc = GRID.map(() => ({ c: 0, t: 0 }));
  let nc = 0, nt = 0, k = 0, tb = 0, tr = 0;
  for (const p of [0.75, 0.85]) {
    for (const dpw of [3, 5]) {
      const r = wrongDemotion(p, N(120), SEED + 60, { dpw, sim: { calibRhoC: GRID } });
      r.grid.forEach((g, i) => {
        acc[i].c += g.coverage;
        acc[i].t += g.tierCoverage;
      });
      nc += r.naiveCoverage;
      nt += r.naiveTierCoverage;
      tb += r.tierBias;
      tr += r.tierRmse;
      k++;
    }
  }
  line(`| tier (fresh cells) | ${pct(nt / k)} | ${acc.map((a) => pct(a.t / k)).join(' | ')} |`);
  line(`| window's own cells | ${pct(nc / k)} | ${acc.map((a) => pct(a.c / k)).join(' | ')} |`);
  let bi = 0;
  acc.forEach((a, i) => {
    if (Math.abs(a.t / k - 0.8) < Math.abs(acc[bi].t / k - 0.8)) bi = i;
  });
  line(`- Tier coverage closest to 80 % at rho_c = ${GRID[bi]} (${pct(acc[bi].t / k)}); at the decision value 0.20: ${pct(acc[GRID.indexOf(0.2)].t / k)} (over-covering by design). Tier bias of the posterior mean ${(tb / k).toFixed(3)}, RMSE ${(tr / k).toFixed(3)}.`);
}

if (want('4')) {
  line('\n## 4. H10: offered frontier vs true θ (tempo model: new items start at 0.7 x target or at the borrowed threshold edge, 2-up-1-down cold staircase, warm climb, §1.9 threshold estimates)');
  line('Learner: tier p 0.6 at T0, +0.15 tiers per practice hour (≈ 0.2 tier / week at 4 x 20 min), θ capped at the top tier; 280 days; 60 learners.');
  line('difficulty = content tier + ln(tempo) / ln(1.2). θ = the difficulty at which a fresh cold take succeeds half the time.');
  line('"flat-rank slope" = Σ Δ(offered difficulty) / Σ Δ min(θ, cap) over 4-week windows in which rank did not move and θ rose >= 0.1; cap = the +2 entry cap. Target >= 0.7.');
  for (const cat of [defaultCatalogue(), realCatalogues('piano').find((c) => c.name === 'piano/scales')!]) {
    line(`\n### ${cat.name}`);
    line('| planner | flat-rank slope | windows | windows with no rise in offer | mean lag min(θ, cap) − offer | target tier fell (non-exempt sessions) | offer fell > 0.5 tier day to day (non-exempt) | days offering above the +2 cap | median days to top rank |');
    line('|---|---|---|---|---|---|---|---|---|');
    const reps = H10_PLANNERS.map((pl) => h10Study(pl.name, N(60), SEED + 90, { h10: pl.h10, cat }));
    for (const r of reps) line(`| ${r.name} | ${r.flatSlope.toFixed(2)} ${r.flatSlope >= 0.7 ? 'PASS' : 'FAIL'} | ${r.flatWindows} | ${pct(r.flatPlateau)} | ${r.meanLag.toFixed(2)} | ${pct(r.targetFell)} | ${pct(r.difficultyFell)} | ${r.overCap} | ${r.medianDaysToTop} |`);
    line('\nWeekly means, default planner: θ, rank (−1 = none), cap, content edge, entered top, offered tier, offered cold tempo, offered difficulty');
    line('| week | θ | rank | cap | edge | entered top | offered tier | tempo | difficulty |');
    line('|---|---|---|---|---|---|---|---|---|');
    for (const w of reps[2].weeks.filter((x) => x.week % 4 === 0)) {
      line(`| ${w.week} | ${w.theta.toFixed(2)} | ${w.rank.toFixed(2)} | ${w.cap.toFixed(1)} | ${w.contentEdge.toFixed(2)} | ${w.enteredTop.toFixed(2)} | ${w.tier.toFixed(2)} | ${w.tempo.toFixed(2)} | ${w.difficulty.toFixed(2)} |`);
    }
  }
}

if (want('5')) {
  line('\n## 5. Placement, gaming and minor rules on the v14 defaults');
  const c0 = placementRun(0, true, N(200), SEED + 70);
  const c2 = placementRun(2, true, N(200), SEED + 70);
  const c3 = placementRun(3, true, N(200), SEED + 70);
  const ce = placementRun(3, true, N(200), SEED + 71, { trueAt: 2 });
  line(`- Tempo area: correctly placed corrected ${pct(c0.corrected)} ${c0.corrected === 0 ? 'PASS' : 'FAIL'}; +2 corrected ${pct(c2.corrected)} (median first drop day ${c2.medianFirstDrop}); +3 corrected ${pct(c3.corrected)}; placed on an empty tier (+3, true T2) corrected ${pct(ce.corrected)} (median day ${ce.medianFirstDrop}).`);
  for (const all of [true, false]) {
    const f0 = placementRun(0, false, N(300), SEED + 70, { rate: 0, fixedTempoSim: true, n1AllCells: all });
    const f2 = placementRun(2, false, N(300), SEED + 70, { rate: 0, fixedTempoSim: true, n1AllCells: all });
    line(`- N1 in a fixed-tempo (harmony-like) area, ${all ? 'ALL cells at placedTier (spec and harness default)' : 'working cells only (v13 harness)'}: correctly placed corrected ${pct(f0.corrected)} ${f0.corrected === 0 ? 'PASS' : 'FAIL'}; +2 corrected ${pct(f2.corrected)} (median first drop day ${f2.medianFirstDrop}).`);
  }
  const g = gamingOneExercise(N(50), SEED);
  line(`- Rank-gaming guard (one exercise, a new key every session, 180 days): ${g.every((r) => r === null) ? 'rank none in every run PASS' : 'FAIL'}.`);
  const ex = [
    { id: 'z0', tier: 0, keys: 12, available: true }, { id: 'z1', tier: 0, keys: 12, available: true },
    { id: 'a', tier: 1, keys: 1, keySet: [0], available: true }, { id: 'b', tier: 1, keys: 1, keySet: [5], available: true },
    { id: 'c', tier: 2, keys: 12, available: true }, { id: 'd', tier: 2, keys: 12, available: true },
  ];
  const p = [{ exerciseId: 'a', tier: 1, key: 0, at: 0 }, { exerciseId: 'c', tier: 2, key: 0, at: 1 }];
  line(`- §1.7 step 4 "available keys" = union: two 1-key exercises at T1 (C and F), passes in C only → rank ${updateRankHW(ex, p, 0, 0)} (union: 2 keys available, 1 covered); ${updateRankHW(ex, p, 0, 0, { ...RANK_FIX, keysUnion: false })} with the earlier max rule.`);
  const s2 = syntheticCatalogue('x', [3, 3], 12);
  line(`- Guard minimum: three T0 passes and no counting checks → rank ${updateRankHW(s2.exercises, [0, 1, 2].map((i) => ({ exerciseId: `x:T0:${i}`, tier: 0, key: i, at: 0 })), 0, null, RANK_GUARDED, [])} (the guard needs >= ${TIER_GUARD.minChecks} checks).`);
}

if (want('6')) {
  line('\n## 6. Exercises per tier (catalogue rule): synthetic areas with k exercises at every tier T0-T6 (12 keys), days per tier on the v14 defaults');
  line('Fixed ability, tier p at the next tier as given, from rank = placedTier = the tier below; median / p90 days pooled over the 6 transitions (40 runs each).');
  line('| exercises per tier | p 0.75, 3 d/wk | p 0.75, 5 d/wk | p 0.85, 3 d/wk | p 0.85, 5 d/wk |');
  line('|---|---|---|---|---|');
  for (const k of [2, 3, 4, 5, 6]) {
    const cat = syntheticCatalogue(`k${k}`, [k, k, k, k, k, k, k], 12);
    const out: string[] = [];
    for (const pNext of [0.75, 0.85]) {
      for (const dpw of [3, 5]) {
        const all = daysPerTier(cat, pNext, dpw, N(40), SEED + 80).flatMap((t) => (t.from === null ? [] : t.days));
        out.push(`${quantile(all, 0.5)} / ${Math.round(quantile(all, 0.9))}`);
      }
    }
    line(`| ${k} | ${out.join(' | ')} |`);
  }
}

line(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);

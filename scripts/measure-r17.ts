// Round 17 measurement review (docs/REVIEW-HOLISTIC-round17-measurement.md): the studies behind the answers to
// review items #1-#4 and the minor notes. Report: docs/MEASURE-R17-REPORT.txt (run on the v13 harness defaults).
// Since v14 the harness defaults are G + H10 + shared supply, so "P0" rows here now run on those; the v14 numbers are in
// scripts/measure-v14.ts / docs/MEASURE-V14-REPORT.txt.
// Usage: npm run measure-r17               (full precision, ~15-25 min)
//        npm run measure-r17 -- --quick    (fewer runs)
//        npm run measure-r17 -- --only=1,3 (some sections)
import {
  climb, defaultCatalogue, H10_PLANNERS, h10Study, PER_AREA_SUPPLY, placementRun, quantile, RANK_FIX, RANK_GUARDED, repromotion, SHARED_SUPPLY,
  stationaryHonesty, syntheticCatalogue, updateRankHW, variantStudy, wrongDemotion, type SimOptions, type SupplyOpts,
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
const ONE_ITEM_GAIN = { itemGain: 1.0, itemHalf: 6.7 }; // ≈ 0.15 logit per visit early on = 0.3 logit per 10 takes, saturating at 1 logit

const CONFIGS: { name: string; sim: Partial<SimOptions> }[] = [
  { name: 'P0 (V1 as approved, per cell)', sim: {} },
  { name: 'P1 (pooled per exercise)', sim: { evidence: 'P1' } },
  { name: 'P2 (>= 4 checks)', sim: { evidence: 'P2' } },
  { name: 'P3 (P1 + P2)', sim: { evidence: 'P3' } },
  { name: 'P4 (pooled per tier, >= 4)', sim: { evidence: 'P4' } },
  { name: 'G (P0 + rank tier guard)', sim: { rank: RANK_GUARDED } },
];

line(`# Round 17 measurement studies (SPEC-HOLISTIC-2 v13 harness + round 17 options)${quick ? ' — QUICK' : ''}`);
line(`seed ${SEED}; defaults: item pass V1, rank fix 1 (keys = union), N1 (all cells at placedTier), day SD 0.8, cell SD 0.7, β 1.2, warm +0.8.`);
line('Truths: "tier p" = the learner\'s cold p on a FRESH cell of that tier (marginal over day and cell effects); "cell p" = that cell\'s own cold p (its cell effect and item practice included).');

if (want('1')) {
  line('\n## 1. Stationary-learner honesty (review #1): rate 0, from scratch (placedTier 0, rank none), 365 days, 4 d/wk, synthetic catalogue');
  line('Start tier T2; true tier = the highest tier with tier p >= 0.75. Target suggested by the review: rank rises at tier p < 0.5 <= 10 % over 365 days.');
  line('| option | item gain | tier p at T2 | true tier | final rank median / p90 | tier p at final rank (median) | final rank above true tier | rank rises at tier p < 0.5 | passes at cell p < 0.5 | passes at tier p < 0.5 |');
  line('|---|---|---|---|---|---|---|---|---|---|');
  const rows = [...CONFIGS.map((c) => ({ ...c, lp: {}, gain: '0' })), { ...CONFIGS[0], lp: ONE_ITEM_GAIN, gain: '0.3 / 10 takes' }, { ...CONFIGS[5], lp: ONE_ITEM_GAIN, gain: '0.3 / 10 takes' }];
  for (const c of rows) {
    for (const p of [0.5, 0.75, 0.85]) {
      const r = stationaryHonesty(p, N(100), SEED + 1, { sim: c.sim, lp: c.lp });
      line(`| ${c.name} | ${c.gain} | ${p} | ${r.trueTier === null ? 'none' : 'T' + r.trueTier} | T${r.finalRankMedian} / T${r.finalRankP90} | ${r.pAtFinalRankMedian.toFixed(2)} | ${pct(r.aboveTrueTier)} | ${pct(r.risesBelowHalf)} ${r.risesBelowHalf <= 0.1 ? 'PASS' : 'FAIL'} | ${pct(r.passesCellBelowHalf)} | ${pct(r.passesTierBelowHalf)} |`);
    }
  }
  line('\nThe same on the real piano areas (tier p 0.75 at each area\'s 2nd non-empty tier), pooled over the 5 areas:');
  line('| option | rank rises at tier p < 0.5 | final rank above true tier | passes at cell p < 0.5 |');
  line('|---|---|---|---|');
  for (const c of [CONFIGS[0], CONFIGS[3], CONFIGS[5]]) {
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
  line(`\n## 1b. Improving learners, real catalogue (15 piano/guitar/bass areas): days per tier, honesty, stalls (runs: ${runs.tierRuns} per transition, ${runs.climbRuns} climbs per area)`);
  line('| option | item gain | days/tier p 0.75, 3 d/wk | p 0.75, 5 d/wk | p 0.85, 3 d/wk | p 0.85, 5 d/wk | rank rises at tier p < 0.5 (steady climb) | median tier p at a new rank | passes at cell p < 0.5 | stalls >= 42 d | climbs missing a tier |');
  line('|---|---|---|---|---|---|---|---|---|---|---|');
  const rows = [...CONFIGS.map((c) => ({ ...c, lp: {}, gain: '0' })), { ...CONFIGS[0], lp: ONE_ITEM_GAIN, gain: '0.3 / 10 takes' }, { ...CONFIGS[5], lp: ONE_ITEM_GAIN, gain: '0.3 / 10 takes' }];
  for (const c of rows) {
    const r = variantStudy('V1', real, SEED, runs, c.sim, c.lp);
    line(`| ${c.name} | ${c.gain} | ${r.tierDays.map((t) => `${t.median} / ${Math.round(t.p90)}${t.reached < 0.995 ? ` (${pct(t.reached)})` : ''}`).join(' | ')} | ${pct(r.rankUpBelowHalf)} | ${r.medianPAtRankUp.toFixed(2)} | ${pct(r.passBelowHalf)} | ${r.stalls} / ${r.climbs} | ${r.missedTop} / ${r.climbs} |`);
  }
}

const SUPPLIES: { name: string; s: Partial<SupplyOpts> }[] = [
  { name: 'v13 harness: 2 slots/session for this area, no reviews', s: PER_AREA_SUPPLY },
  { name: 'shared: 3 slots/session over 4 areas, no reviews', s: { ...SHARED_SUPPLY, reviews: false } },
  { name: 'shared: 3 over 4 areas + FSRS reviews (<= 2/session)', s: SHARED_SUPPLY },
  { name: 'shared: 2 over 6 areas + FSRS reviews (<= 1/session)', s: { ...SHARED_SUPPLY, sessionCap: 2, areas: 6, reviewsPerSession: 1 } },
  { name: 'shared: 4 over 3 areas + FSRS reviews (<= 2/session)', s: { ...SHARED_SUPPLY, sessionCap: 4, areas: 3 } },
];
const GRID = [0, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.3];

if (want('2')) {
  line('\n## 2. Look supply (review #3): current form under a per-SESSION slot cap shared across areas, plus FSRS-review looks (rank R = T3 at burn-in start; 60-day burn-in, 90-day window)');
  line('Wrong demotion = a slump while the truth >= 0.75: "cells" = mean cell p of the passed cells at tiers >= the tier left (v13 definition); "tier" = fresh-cell p at the tier left.');
  line('| supply | tier p at R | d/wk | looks / 90 d (from reviews) | wrong demotion / 90 d (cells; tier) | any slump | rank rose above R | coverage vs cells: n_eff / naive | coverage vs tier: n_eff / naive |');
  line('|---|---|---|---|---|---|---|---|---|');
  for (const sp of SUPPLIES) {
    for (const p of [0.75, 0.85]) {
      for (const dpw of [3, 5]) {
        const r = wrongDemotion(p, N(200), SEED + 40, { dpw, sim: { supply: sp.s } });
        line(`| ${sp.name} | ${p} | ${dpw} | ${r.looksPer90.toFixed(0)} (${pct(r.reviewShare)}) | ${pct(r.wrongRate)}; ${pct(r.wrongRateTier)} ${r.wrongRate < 0.05 ? 'PASS' : 'FAIL'} | ${pct(r.anySlump)} | ${pct(r.rankRose)} | ${pct(r.coverage)} / ${pct(r.naiveCoverage)} | ${pct(r.tierCoverage)} / ${pct(r.naiveTierCoverage)} |`);
      }
    }
  }
  line('\nRe-promotion after a 4-week dip of −3 logits (tier p 0.85 at R = T3, 4 d/wk): days from the dip\'s end until current form is back at its pre-dip value');
  line('| supply | slumped in the dip | back within 120 d | median days | p90 days |');
  line('|---|---|---|---|---|');
  for (const sp of SUPPLIES) {
    const r = repromotion(N(200), SEED + 50, { sim: { supply: sp.s } });
    line(`| ${sp.name} | ${pct(r.slumped)} | ${pct(r.recovered)} | ${r.medianDays} | ${r.p90Days} |`);
  }
}

if (want('3')) {
  line('\n## 3. Calibration estimand (review #4): 80 % interval coverage by ρ_c (ρ_d 0.15), against the window\'s cells and against the tier (fresh cells)');
  line('Evaluation only (decisions use ρ_c 0.20 here); learners as in section 2, pooled over tier p 0.75 / 0.85 and 3 / 5 d/wk.');
  line(`| supply | naive (raw n) cells / tier | ${GRID.map((g) => `ρ_c ${g}: cells / tier`).join(' | ')} |`);
  line(`|---|---|${GRID.map(() => '---').join('|')}|`);
  const best: { name: string; rho: number; cov: number }[] = [];
  for (const sp of [SUPPLIES[0], SUPPLIES[2], SUPPLIES[3]]) {
    const acc = GRID.map(() => ({ c: 0, t: 0 }));
    let nc = 0, nt = 0, k = 0;
    for (const p of [0.75, 0.85]) {
      for (const dpw of [3, 5]) {
        const r = wrongDemotion(p, N(120), SEED + 60, { dpw, sim: { supply: sp.s, calibRhoC: GRID } });
        r.grid.forEach((g, i) => {
          acc[i].c += g.coverage;
          acc[i].t += g.tierCoverage;
        });
        nc += r.naiveCoverage;
        nt += r.naiveTierCoverage;
        k++;
      }
    }
    line(`| ${sp.name} | ${pct(nc / k)} / ${pct(nt / k)} | ${acc.map((a) => `${pct(a.c / k)} / ${pct(a.t / k)}`).join(' | ')} |`);
    let bi = 0;
    acc.forEach((a, i) => {
      if (Math.abs(a.t / k - 0.8) < Math.abs(acc[bi].t / k - 0.8)) bi = i;
    });
    best.push({ name: sp.name, rho: GRID[bi], cov: acc[bi].t / k });
  }
  for (const b of best) line(`- ${b.name}: tier coverage closest to 80 % at ρ_c = ${b.rho} (${pct(b.cov)})`);
  const rho = best[1].rho;
  line(`\nRe-tuned ρ_c = ${rho} (the spec's shared supply), decisions now use it — wrong demotion, coverage and re-promotion:`);
  line('| supply | ρ_c | tier p at R | d/wk | wrong demotion / 90 d (cells; tier) | any slump | coverage vs tier (n_eff) | tier bias | tier RMSE |');
  line('|---|---|---|---|---|---|---|---|---|');
  for (const r0 of [0.2, rho]) {
    for (const p of [0.75, 0.85]) {
      for (const dpw of [3, 5]) {
        const r = wrongDemotion(p, N(200), SEED + 40, { dpw, sim: { supply: SHARED_SUPPLY, currentForm: { rhoC: r0 } } });
        line(`| shared + reviews | ${r0} | ${p} | ${dpw} | ${pct(r.wrongRate)}; ${pct(r.wrongRateTier)} ${r.wrongRate < 0.05 ? 'PASS' : 'FAIL'} | ${pct(r.anySlump)} | ${pct(r.tierCoverage)} | ${r.tierBias.toFixed(3)} | ${r.tierRmse.toFixed(3)} |`);
      }
    }
  }
  for (const r0 of [0.2, rho]) {
    const r = repromotion(N(200), SEED + 50, { sim: { supply: SHARED_SUPPLY, currentForm: { rhoC: r0 } } });
    line(`- Re-promotion, shared + reviews, ρ_c ${r0}: ${pct(r.slumped)} slumped; ${pct(r.recovered)} back within 120 d; median ${r.medianDays} d, p90 ${r.p90Days} d.`);
  }
  const rg = wrongDemotion(0.75, N(200), SEED + 40, { dpw: 4, sim: { supply: SHARED_SUPPLY, rank: RANK_GUARDED, currentForm: { rhoC: rho } } });
  line(`- With the rank tier guard (G) as well, shared + reviews, ρ_c ${rho}, tier p 0.75, 4 d/wk: wrong demotion ${pct(rg.wrongRate)}; tier coverage ${pct(rg.tierCoverage)}; rank rose above R in ${pct(rg.rankRose)} (P0: see section 2).`);
}

if (want('4')) {
  line('\n## 4. H10 (review #2): offered frontier vs true θ, tempo model on (new items start at 0.7 × target, 2-up-1-down cold staircase, warm climb, §1.9 threshold estimates)');
  line('Learner: tier p 0.6 at T0, +0.15 tiers per practice hour (≈ 0.2 tier / week at 4 × 20 min), θ capped at the top tier; 280 days; synthetic catalogue.');
  line('difficulty = content tier + ln(tempo) / ln(1.2) (a 0.83 × target take is one tier easier). θ = the difficulty at which a fresh cold take succeeds half the time, so the 70.7 % working point sits ≈ 0.8 tier below θ.');
  line('"flat-rank slope" = Σ Δ(offered difficulty) / Σ Δ min(θ, cap) over 4-week windows in which rank did not move and θ rose; cap = the +2 entry cap (2nd non-empty tier above max(placedTier, rank)).');
  for (const cat of [defaultCatalogue(), realCatalogues('piano').find((c) => c.name === 'piano/scales')!]) {
    line(`\n### ${cat.name}`);
    line('| planner | flat-rank slope | windows | windows with no rise in offer | mean lag min(θ, cap) − offer | target tier fell (non-exempt sessions) | offer fell > 0.5 tier day to day (non-exempt) | days offering above the +2 cap | median days to top rank |');
    line('|---|---|---|---|---|---|---|---|---|');
    const reps = H10_PLANNERS.map((pl) => h10Study(pl.name, N(60), SEED + 90, { h10: pl.h10, cat }));
    for (const r of reps) line(`| ${r.name} | ${r.flatSlope.toFixed(2)} ${r.flatSlope >= 0.7 ? 'PASS' : 'FAIL'} | ${r.flatWindows} | ${pct(r.flatPlateau)} | ${r.meanLag.toFixed(2)} | ${pct(r.targetFell)} | ${pct(r.difficultyFell)} | ${r.overCap} | ${r.medianDaysToTop} |`);
    line('\nWeekly means (H10 planner | v13 planner): θ, rank (−1 = none), cap, content edge, entered top, offered tier, offered cold tempo, offered difficulty');
    line('| week | θ | rank | cap | edge | entered top | offered tier | tempo | difficulty | v13: rank | v13: offered tier | v13: tempo | v13: difficulty |');
    line('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    const h = reps[2];
    const b = reps[0];
    for (const w of h.weeks.filter((x) => x.week % 2 === 0)) {
      const v = b.weeks.find((x) => x.week === w.week);
      line(`| ${w.week} | ${w.theta.toFixed(2)} | ${w.rank.toFixed(2)} | ${w.cap.toFixed(1)} | ${w.contentEdge.toFixed(2)} | ${w.enteredTop.toFixed(2)} | ${w.tier.toFixed(2)} | ${w.tempo.toFixed(2)} | ${w.difficulty.toFixed(2)} | ${v ? v.rank.toFixed(2) : '-'} | ${v ? v.tier.toFixed(2) : '-'} | ${v ? v.tempo.toFixed(2) : '-'} | ${v ? v.difficulty.toFixed(2) : '-'} |`);
    }
  }
}

if (want('5')) {
  line('\n## 5. Minor notes');
  const ex = [
    { id: 'z0', tier: 0, keys: 12, available: true },
    { id: 'z1', tier: 0, keys: 12, available: true },
    { id: 'a', tier: 1, keys: 1, keySet: [0], available: true },
    { id: 'b', tier: 1, keys: 1, keySet: [5], available: true },
    { id: 'c', tier: 2, keys: 12, available: true },
    { id: 'd', tier: 2, keys: 12, available: true },
  ];
  const p = [{ exerciseId: 'a', tier: 1, key: 0, at: 0 }, { exerciseId: 'c', tier: 2, key: 0, at: 1 }];
  line(`- §1.7 step 4 "available keys" = union: T1 holds two 1-key exercises (C and F); rank 0, entry ceiling T1; passes: the C exercise at T1 and a T2 exercise (a manual pass above the ceiling), both in C → rank ${updateRankHW(ex, p, 0, 0)} with the union rule (2 keys available, 1 covered); ${updateRankHW(ex, p, 0, 0, { ...RANK_FIX, keysUnion: false })} with the earlier max rule (max 1 key → 1 needed). The union is now the default.`);
  for (const all of [false, true]) {
    const c0 = placementRun(0, false, N(300), SEED + 70, { rate: 0, fixedTempoSim: true, n1AllCells: all });
    const c2 = placementRun(2, false, N(300), SEED + 70, { rate: 0, fixedTempoSim: true, n1AllCells: all });
    line(`- N1 in a fixed-tempo (harmony-like) area through the simulator, ${all ? 'ALL cells at placedTier (spec)' : 'working cells only (v13 harness)'}: correctly placed corrected ${pct(c0.corrected)} ${c0.corrected === 0 ? 'PASS' : 'FAIL'}; +2 corrected ${pct(c2.corrected)} (median first drop day ${c2.medianFirstDrop}).`);
  }
  const g = syntheticCatalogue('x', [3, 3], 12);
  line(`- (sanity) a 2-tier catalogue with rank guard: rank from no checks → ${updateRankHW(g.exercises, [{ exerciseId: 'x:T0:0', tier: 0, key: 0, at: 0 }, { exerciseId: 'x:T0:1', tier: 0, key: 1, at: 0 }, { exerciseId: 'x:T0:2', tier: 0, key: 2, at: 0 }], 0, null, RANK_GUARDED, [])} (the guard needs >= 6 checks).`);
  void climb;
  void quantile;
}

line(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);

// SPEC-HOLISTIC-2 v16: the harness report on the v16 defaults, after the owner's §17.4 decisions of 2026-11-28:
// (1) the rank tier guard G at P >= 0.9 (option B; the v15 P >= 0.8 stays selectable as RANK_GUARDED_P80);
// (2) a warm-first skip is always a miss (guard record + V1 share), whatever the skip share; the 20 % skip share gates
//     only due checks offered and left unplayed; (3) a merge downgrade within 24 h re-derives rank (pure helper,
//     rankAfterMergeDowngrade; not a simulated flow); (4) the H10 targets per kind of area are accepted.
// Report: docs/MEASURE-V16-REPORT.txt. Every number quoted in SPEC-HOLISTIC-2 v16 §1 / §9.1 / §17.4 comes from it.
// Usage: npm run measure-v16               (full precision)
//        npm run measure-v16 -- --quick    (fewer runs)
//        npm run measure-v16 -- --only=1,d (some sections: 1 1g 1b k d 2 2r 3 4 5 6 w g)
import {
  climb, daysPerTier, defaultCatalogue, gamingOneExercise, guardRepeatedTest, H10_ON, h10Overshoot, h10Study, PER_AREA_SUPPLY, placementRun, quantile, RANK_FIX, RANK_GUARDED_P80,
  repromotion, RHO_CELL, RHO_DAY, SHARED_SUPPLY, stationaryHonesty, STEADY_LEARNER, syntheticCatalogue, TIER_GUARD, TIER_GUARD_P80, updateRankHW, RANK_GUARDED, variantStudy,
  wrongDemotion, DEFAULT_LEARNER, DEFAULT_PLANNER, Learner, mulberry32, thetaForP, type DayPicker, type SimOptions, type SupplyOpts, type TierGuard, type AreaCatalogue,
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
const P80: Partial<SimOptions> = { rank: RANK_GUARDED_P80 };
const CONFIGS: { name: string; sim: Partial<SimOptions> }[] = [
  { name: 'DEFAULT v16 (G P 0.9)', sim: {} },
  { name: 'v15 default (G P 0.8)', sim: P80 },
  { name: 'ungated H8 (RANK_FIX)', sim: { rank: RANK_FIX } },
];
const keyless3 = syntheticCatalogue('keyless-3', [3, 3, 3, 3, 3, 3, 3], 0, false);
const keyless2 = syntheticCatalogue('keyless-2', [2, 2, 2, 2, 2, 2, 2], 0, false);
const keylessReal = syntheticCatalogue('keyless-real-ish (tempo)', [3, 4, 2, 3, 0, 2, 2], 0, true);
const oneKey = syntheticCatalogue('1-key-3', [3, 3, 3, 3, 3, 3, 3], 1, true);
const twoKey = syntheticCatalogue('2-key-2', [2, 2, 2, 2, 2, 2, 2], 2, true);
const fixedSyn: AreaCatalogue = { ...defaultCatalogue(), name: 'synthetic fixed-tempo', tempo: false };

line(`# Measurement harness report, SPEC-HOLISTIC-2 v16 defaults${quick ? ' — QUICK' : ''}`);
line(`seed ${SEED}. Defaults: item pass V1 (+ a pending pair expires after 60 days); rank = H8 (>= 2 exercises, grouped tiers, keys = union) + tier guard G (bar ${TIER_GUARD.bar}, P >= ${TIER_GUARD.conf}, half-life ${TIER_GUARD.halfLife} checks, >= ${TIER_GUARD.minChecks} checks; the guard reserve);`);
line('v16 (owner 2026-11-28, §17.4): (1) G at P >= 0.9 (v15: 0.8, kept as a variant); (2) a warm-first skip is always a miss in the guard record and the V1 share, whatever the skip share;');
line(`    due checks offered and left unplayed are misses only while the skip share over ${DEFAULT_PLANNER.skipWindowDays} days > ${DEFAULT_PLANNER.skipShareMax}; (3) a merge downgrade within 24 h re-derives rank (unit-tested, not simulated); (4) H10 targets per kind of area accepted.`);
line('Round 18 rules (v15) unchanged: cells unique per exercise x key; at a tier with no fresh cell left the guard also reads the passed cells\' probe-band looks, and the reserve plays a guard probe there;');
line(`H10: evidence readiness (>= 2 clean of the last <= 3 probe-band cold takes, or a non-provisional threshold >= 0.95), content edge capped at the entered top, struggle step-down (probe-band p estimate < ${H10_ON.struggleP} over ${H10_ON.struggleDays} days and not rising, lifts at >= ${H10_ON.recoverP});`);
line(`current form rho_d ${RHO_DAY}, rho_c ${RHO_CELL} (cautious); supply = ${SHARED_SUPPLY.sessionCap} slots per session shared by ${SHARED_SUPPLY.areas} areas + FSRS-review looks (<= ${SHARED_SUPPLY.reviewsPerSession} per session per area); N1 over all cells at placedTier.`);
line('Learners: day SD 0.8, cell SD 0.7 (logit), beta 1.2 logit per tier, warm +0.8 logit.');
line('Truths: "probe-band p" = cold p on a FRESH cell of the tier at the floor of the probe band (0.95 x target in tempo areas, the fixed tempo in fixed-tempo areas) — the RANK ESTIMAND (§1.1);');
line('"tier p at target" = the same at 1.0 x target; "catalogue p" = mean over every exercise x key of the tier with that cell\'s own item-practice gain (unoffered cells at 0);');
line('"practised p" = the recency-weighted mean probe-band p of the cells behind the guard\'s record, with their item practice (what the guard actually measured).');
line('Each table carries the v15 default (G P 0.8) beside the v16 default, same seeds, so every before/after pair is from this run.');

if (want('1')) {
  line('\n## 1. Stationary-learner honesty: rate 0, from scratch (placedTier 0, rank none), 365 days, 4 d/wk, synthetic catalogue (tempo area; 100 learners per row)');
  line('Start tier T2. Per rise = share of rank rises at p < 0.5. PER LEARNER = share of learners whose final, permanent rank sits at a tier with p < 0.5. Target (§9.1): per learner, probe-band p, <= 10 % at p 0.5 and 0.75 without item gain.');
  line('| rule | item gain | tier p at T2 | final rank median / p90 | per learner: final rank at probe-band p < 0.5 | at target p < 0.5 | at catalogue p < 0.5 | per rise: probe-band | at target | false rises (probe) whose practised p >= 0.5 (median practised p) |');
  line('|---|---|---|---|---|---|---|---|---|---|');
  for (const c of CONFIGS) {
    for (const [lp, gain] of [[{}, '0'], [ITEM_GAIN, '0.3 / 10 takes']] as const) {
      for (const p of [0.5, 0.75, 0.85]) {
        const r = stationaryHonesty(p, N(100), SEED + 1, { sim: c.sim, lp });
        const target = p <= 0.75 && gain === '0' ? (r.finalBelowHalfProbe <= 0.1 ? ' PASS' : ' FAIL') : '';
        line(`| ${c.name} | ${gain} | ${p} | T${r.finalRankMedian} / T${+r.finalRankP90.toFixed(2)} | ${pct(r.finalBelowHalfProbe)}${target} | ${pct(r.finalBelowHalf)} | ${pct(r.finalBelowHalfCat)} | ${pct(r.risesBelowHalfProbe)} | ${pct(r.risesBelowHalf)} | ${pct(r.falseRisesPractisedOk)} (${Number.isFinite(r.falseRisesPractisedMedian) ? r.falseRisesPractisedMedian.toFixed(2) : '-'}) |`);
      }
    }
  }
  const L = { ...DEFAULT_LEARNER, rate: 0 };
  const lines: string[] = [];
  for (const p of [0.5, 0.75, 0.85]) {
    L.theta0 = thetaForP(p, 2, L);
    const lr = new Learner(L, mulberry32(1));
    lines.push(`p ${p}: ${[2, 3, 4].map((t) => `T${t} ${lr.trueTierP(t).toFixed(2)} / ${lr.trueTierP(t, 0, 0.95).toFixed(2)}`).join('; ')}`);
  }
  line(`\nThe learners' tiers, fresh-cell p at target / at 0.95 x target: ${lines.join(' | ')}.`);
  line('\nThe same on the real piano areas (p 0.75 at each area\'s 2nd non-empty tier), 30 learners per area, pooled over the 5 areas:');
  line('| rule | per learner: final rank at probe-band p < 0.5 | per rise (probe-band) |');
  line('|---|---|---|');
  for (const c of CONFIGS) {
    let fl = 0, n = 0, rises = 0, below = 0;
    for (const cat of realCatalogues('piano')) {
      const ts = [...new Set(cat.exercises.map((e) => e.tier))].sort((a, b) => a - b);
      const r = stationaryHonesty(0.75, N(30), SEED + 2, { sim: c.sim, cat, startTier: ts[Math.min(1, ts.length - 1)] });
      fl += r.finalBelowHalfProbe * N(30);
      n += N(30);
      rises += r.rises;
      below += r.risesBelowHalfProbe * r.rises;
    }
    line(`| ${c.name} | ${pct(fl / n)} | ${pct(below / Math.max(1, rises))} |`);
  }
}

if (want('1g')) {
  line('\n## 1g. The guard as a repeated test: a stream of counting checks at a fixed true probe-band p (day / cell SD 0.8 / 0.7, 2 checks a day, a new cell every 6 checks), the guard tested after every check; 4000 streams per row');
  line('"single" = P(the guard passes at the one test after n checks); "ever" = P(it has passed at any test up to n) — what a high-water rank sees.');
  const ns = [12, 24, 48, 96];
  const guards: [string, TierGuard][] = [['G P 0.9 (v16 default)', TIER_GUARD], ['G P 0.8 (v15)', TIER_GUARD_P80]];
  line(`| true p | guard | single at n = ${ns.join(' / ')} | ever by n = ${ns.join(' / ')} |`);
  line('|---|---|---|---|');
  for (const p of [0.3, 0.4, 0.45, 0.5, 0.6, 0.7]) {
    for (const [name, g] of guards) {
      const r = guardRepeatedTest(p, g, N(4000), SEED + 3, ns);
      line(`| ${p} | ${name} | ${r.single.map(pct).join(' / ')} | ${r.ever.map(pct).join(' / ')} |`);
    }
  }
}

if (want('1b')) {
  const runs = quick ? { flowRuns: 300, tierRuns: 8, climbRuns: 8 } : { flowRuns: 1000, tierRuns: 20, climbRuns: 20 };
  line(`\n## 1b. Improving learners, real catalogue (13 areas: piano 5, guitar 5, bass 3 per §1.10): days per tier, honesty, stalls (${runs.tierRuns} runs per transition, ${runs.climbRuns} climbs per area)`);
  line('Days per tier: fixed ability, true tier p 0.75 / 0.85 at the next tier, from rank = placedTier = the tier below; median / p90 calendar days (share reached in 240 d when < 99.5 %).');
  line('Climbs: steadily improving learner (cold p 0.6 at T0, +0.25 tiers per practice hour, 4 d/wk), 365 days from T0. Stall = >= 42 days at tier p >= 0.85 on the next tier without a rank rise. Target: no stall (§9.1).');
  line('| rule | item gain | p 0.75, 3 d/wk | p 0.75, 5 d/wk | p 0.85, 3 d/wk | p 0.85, 5 d/wk | rank rises at tier p < 0.5 (climbs) | median tier p at a new rank | passes at cell p < 0.5 | stalls >= 42 d | longest stall (days) | climbs missing a tier |');
  line('|---|---|---|---|---|---|---|---|---|---|---|---|');
  const rows = [{ ...CONFIGS[0], lp: {}, gain: '0' }, { ...CONFIGS[0], lp: ITEM_GAIN, gain: '0.3 / 10 takes' }, { ...CONFIGS[1], lp: {}, gain: '0' }, { ...CONFIGS[1], lp: ITEM_GAIN, gain: '0.3 / 10 takes' }, { ...CONFIGS[2], lp: {}, gain: '0' }];
  for (const c of rows) {
    const r = variantStudy('V1', real, SEED, runs, c.sim, c.lp);
    line(`| ${c.name} | ${c.gain} | ${r.tierDays.map((t) => `${t.median} / ${Math.round(t.p90)}${t.reached < 0.995 ? ` (${pct(t.reached)})` : ''}`).join(' | ')} | ${pct(r.rankUpBelowHalf)} | ${r.medianPAtRankUp.toFixed(2)} | ${pct(r.passBelowHalf)} | ${r.stalls} / ${r.climbs} | ${r.worstStall} | ${r.missedTop} / ${r.climbs} |`);
  }
  for (const c of CONFIGS.slice(0, 2)) {
    line(`\nStalls per area (${c.name}, the climbs above):`);
    const per: string[] = [];
    for (const cat of real) {
      const cl = climb(cat, runs.climbRuns, SEED + 60, 365, STEADY_LEARNER(), {}, 'V1', c.sim);
      if (cl.stalls || cl.reachedAll < 1) per.push(`${cat.name}: ${cl.stalls} stalls (longest ${cl.worstStall} d at rank ${cl.worstStallTier}), reached all ${pct(cl.reachedAll)}`);
    }
    line(per.length ? per.map((s) => `- ${s}`).join('\n') : '- none');
  }
}

if (want('k')) {
  line('\n## K. Areas without keys and exercises with few keys: rotation-only climbs, steadily improving learner, 365 days, 20 climbs per row (seed 4242)');
  line('| catalogue | rule | reach the top tier | reach T5 (median day) | stalls >= 42 d | longest stall | rises at tier p < 0.5 |');
  line('|---|---|---|---|---|---|---|');
  for (const cat of [keyless3, keyless2, keylessReal, oneKey, twoKey]) {
    for (const c of CONFIGS) {
      const r = climb(cat, N(20), 4242, 365, STEADY_LEARNER(), {}, 'V1', c.sim);
      line(`| ${cat.name} | ${c.name} | ${pct(r.reachedAll)} | ${pct(r.reachedTarget)} (${r.medianDaysToTarget}) | ${r.stalls} / ${N(20)} | ${r.worstStall} | ${pct(r.rankUpBelowHalf)} |`);
    }
  }
  line('\nStationary learners in the keyless area (keyless-3, fixed-tempo; per learner, probe-band p = target p there; 60 learners):');
  line('| rule | p 0.5: per learner / per rise | p 0.75: per learner / per rise | p 0.75 with item gain: per learner |');
  line('|---|---|---|---|');
  for (const c of CONFIGS) {
    const a = stationaryHonesty(0.5, N(60), SEED + 4, { cat: keyless3, sim: c.sim });
    const b = stationaryHonesty(0.75, N(60), SEED + 4, { cat: keyless3, sim: c.sim });
    const g = stationaryHonesty(0.75, N(60), SEED + 4, { cat: keyless3, sim: c.sim, lp: ITEM_GAIN });
    line(`| ${c.name} | ${pct(a.finalBelowHalfProbe)} / ${pct(a.risesBelowHalfProbe)} | ${pct(b.finalBelowHalfProbe)} / ${pct(b.risesBelowHalfProbe)} | ${pct(g.finalBelowHalfProbe)} |`);
  }
  line('\nDays per tier in the keyless area (fixed ability, p 0.75 / 0.85 at the next tier, 3 d/wk, 30 runs per transition):');
  for (const c of CONFIGS.slice(0, 2)) {
    const out: string[] = [];
    for (const pNext of [0.75, 0.85]) {
      const all = daysPerTier(keyless3, pNext, 3, N(30), SEED + 31, 240, {}, {}, 'V1', c.sim).flatMap((t) => (t.from === null ? [] : t.days));
      out.push(`p ${pNext}: ${quantile(all, 0.5)} / ${Math.round(quantile(all, 0.9))}`);
    }
    line(`- ${c.name}: ${out.join('; ')}`);
  }
}

if (want('d')) {
  line('\n## D. Learners who choose the day for cold checks: stationary, synthetic catalogue, 60 learners per row');
  line('warmFirst = on every below-average day (day effect < 0) the learner warms each cell up first; warmFirst20 = only on the worst 20 % of days; senseSkip = on a bad day, warms up the first item, then leaves the area;');
  line('careless = the honest 20 % warm-first learner: honest, but warms up first (ignores the cold-first order) on a random 20 % of days; quitter = honest, leaves the area after the first item on a random 20 % of days.');
  line('Rule 2 (owner 2026-11-28): every warm-first skip is a miss (guard record + V1 share), whatever the skip share; the 20 % skip share gates only due checks left unplayed (quitter, senseSkip after leaving).');
  line('| rule | learner | p 0.5: final rank median / p90; per learner (probe) | p 0.75: final rank median / p90; per learner (probe) | skipped due checks per learner |');
  line('|---|---|---|---|---|');
  const modes: (DayPicker | undefined)[] = [undefined, 'careless', 'quitter', 'warmFirst', 'warmFirst20', 'senseSkip'];
  const rules: [string, Partial<SimOptions>][] = [['DEFAULT v16 (G P 0.9; warm-first skip always a miss)', {}], ['v15 default (G P 0.8; warm-first skip always a miss)', P80], ['not adopted: G P 0.9, warm-first skips gated by the skip share', { planner: { warmSkipGated: true } }]];
  for (const [rn, sim] of rules) {
    for (const m of modes) {
      const s = [0.5, 0.75].map((p) => stationaryHonesty(p, N(60), SEED + 5, { sim: { ...sim, dayPicker: m } }));
      line(`| ${rn} | ${m ?? 'honest'} | T${s[0].finalRankMedian} / T${+s[0].finalRankP90.toFixed(2)}; ${pct(s[0].finalBelowHalfProbe)} | T${s[1].finalRankMedian} / T${+s[1].finalRankP90.toFixed(2)}; ${pct(s[1].finalBelowHalfProbe)} | ${s[1].skipsPerLearner.toFixed(0)} |`);
    }
  }
  line('\nCost to honest deviators in days per tier (fixed ability p 0.75 at the next tier, 3 d/wk, 13 real areas, 8 runs per transition): median / p90');
  for (const [rn, sim] of rules.slice(0, 2)) {
    for (const m of [undefined, 'careless', 'quitter'] as (DayPicker | undefined)[]) {
      const all: number[] = [];
      for (const cat of real) for (const t of daysPerTier(cat, 0.75, 3, N(8), SEED + 32, 240, {}, {}, 'V1', { ...sim, dayPicker: m })) all.push(...t.days);
      line(`- ${rn}, ${m ?? 'honest'}: ${quantile(all, 0.5)} / ${Math.round(quantile(all, 0.9))}`);
    }
  }
}

const SUPPLIES: { name: string; s: Partial<SupplyOpts> }[] = [
  { name: 'DEFAULT: 3 slots/session over 4 areas + FSRS reviews (<= 2/session/area)', s: SHARED_SUPPLY },
  { name: 'shared 3 over 4 areas, no reviews', s: { ...SHARED_SUPPLY, reviews: false } },
  { name: 'v13 harness: 2 slots/session for this area, no reviews', s: PER_AREA_SUPPLY },
];
const GRID = [0, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3];

if (want('2')) {
  line('\n## 2. Look supply and current form (rank R = T3 placed, fixed ability; 60-day burn-in, 90-day window; 200 learners per row)');
  line('Wrong demotion = a slump while the truth >= 0.75 ("window" = mean fresh-cell p over the decision window\'s own looks; "tier t" = the tier left only; "cells" = the passed cells). Target < 5 %, judged on the window estimand.');
  line('| supply | rank rule | tier p at R | d/wk | looks / 90 d (share from reviews) | wrong demotion / 90 d (window; tier t; cells) | any slump | 80 % coverage vs tier: n_eff / naive |');
  line('|---|---|---|---|---|---|---|---|');
  const rows: [string, Partial<SupplyOpts>, string, Partial<SimOptions>][] = [
    ...SUPPLIES.map((sp) => [sp.name, sp.s, 'v16 (G P 0.9)', {}] as [string, Partial<SupplyOpts>, string, Partial<SimOptions>]),
    [SUPPLIES[0].name, SUPPLIES[0].s, 'v15 (G P 0.8)', P80],
  ];
  for (const [name, s, rn, sim] of rows) {
    for (const p of [0.75, 0.85]) {
      for (const dpw of [3, 5]) {
        const r = wrongDemotion(p, N(200), SEED + 40, { dpw, sim: { ...sim, supply: s } });
        line(`| ${name} | ${rn} | ${p} | ${dpw} | ${r.looksPer90.toFixed(0)} (${pct(r.reviewShare)}) | ${pct(r.wrongRateWindow)}; ${pct(r.wrongRateTier)}; ${pct(r.wrongRate)} ${r.wrongRateWindow < 0.05 ? 'PASS' : 'FAIL'} | ${pct(r.anySlump)} | ${pct(r.tierCoverage)} / ${pct(r.naiveTierCoverage)} |`);
      }
    }
  }
}

if (want('2') || want('2r')) {
  line('\nRe-promotion after a 4-week dip of −3 logits (tier p 0.85 at R = T3, 4 d/wk; 200 learners): (a) back at the pre-dip current form, (b) capped at the highest tier with p >= 0.6, (c) at the true tier (p >= 0.75); 120 = not back within 120 days.');
  line('| supply | rank rule | slumped in the dip | (a) back within 120 d; median / p90 | (b) | (c) |');
  line('|---|---|---|---|---|---|');
  for (const [rn, sim] of [['v16 (G P 0.9)', {}], ['v15 (G P 0.8)', P80]] as [string, Partial<SimOptions>][]) {
    const r = repromotion(N(200), SEED + 50, { sim: { ...sim, supply: SUPPLIES[0].s } });
    line(`| ${SUPPLIES[0].name} | ${rn} | ${pct(r.slumped)} | ${pct(r.recovered)}; ${r.medianDays} / ${r.p90Days} | ${pct(r.recoveredHonest)}; ${r.medianDaysHonest} / ${r.p90DaysHonest} | ${pct(r.recoveredTrue)}; ${r.medianDaysTrue} / ${r.p90DaysTrue} |`);
  }
}

if (want('3')) {
  line('\n## 3. Calibration (estimand: tier p on fresh cells). Decisions use rho_c 0.20 (H12: cautious); the grid is evaluation only. 120 learners per cell, pooled over p 0.75 / 0.85 x 3 / 5 d/wk.');
  line(`| estimand | naive (raw n) | ${GRID.map((g) => `rho_c ${g}`).join(' | ')} |`);
  line(`|---|---|${GRID.map(() => '---').join('|')}|`);
  const acc = GRID.map(() => ({ c: 0, t: 0 }));
  let nc = 0, nt = 0, k = 0, tb = 0, tr = 0;
  for (const p of [0.75, 0.85]) {
    for (const dpw of [3, 5]) {
      const r = wrongDemotion(p, N(120), SEED + 60, { dpw, sim: { calibRhoC: GRID } });
      r.grid.forEach((g, i) => { acc[i].c += g.coverage; acc[i].t += g.tierCoverage; });
      nc += r.naiveCoverage; nt += r.naiveTierCoverage; tb += r.tierBias; tr += r.tierRmse; k++;
    }
  }
  line(`| tier (fresh cells) | ${pct(nt / k)} | ${acc.map((a) => pct(a.t / k)).join(' | ')} |`);
  line(`| window's own cells | ${pct(nc / k)} | ${acc.map((a) => pct(a.c / k)).join(' | ')} |`);
  line(`- Tier bias of the posterior mean ${(tb / k).toFixed(3)}, RMSE ${(tr / k).toFixed(3)}.`);
}

if (want('4')) {
  line('\n## 4. H10: offered challenge vs ability (targets per kind of area accepted by the owner 2026-11-28)');
  line('Improving learners: tier p 0.6 at T0, +0.15 tiers per practice hour, 280 days, 60 learners. difficulty = content tier + ln(tempo) / ln(1.2). "flat-rank slope" = Σ Δ(offered difficulty) / Σ Δ min(θ, cap) over 4-week windows with rank flat and θ rising >= 0.1; cap = the +2 entry cap.');
  line('Targets (§9.1): tempo areas slope >= 0.7; fixed-tempo areas slope >= 0.6 with a mean lag min(θ, cap) − offer within ± 0.5 tier (integer content steps are the only axis there); no offer above the cap; no target fall in a non-exempt session.');
  const rules: [string, Partial<SimOptions>][] = [['H10 default, rank v16 (G P 0.9)', {}], ['H10 default, rank v15 (G P 0.8)', P80]];
  for (const cat of [defaultCatalogue(), realCatalogues('piano').find((c) => c.name === 'piano/scales')!, fixedSyn, realCatalogues('piano').find((c) => c.name === 'piano/harmony')!]) {
    line(`\n### ${cat.name} (${cat.tempo ? 'tempo' : 'fixed-tempo'})`);
    line('| rule | flat-rank slope | windows | mean lag | target fell (non-exempt) | days above the +2 cap | median days to top rank |');
    line('|---|---|---|---|---|---|---|');
    for (const [name, sim] of rules) {
      const r = h10Study(name, N(60), SEED + 90, { h10: { ...H10_ON, tempo: cat.tempo }, cat, sim });
      const tgt = cat.tempo ? r.flatSlope >= 0.7 : r.flatSlope >= 0.6 && Math.abs(r.meanLag) <= 0.5;
      line(`| ${name} | ${r.flatSlope.toFixed(2)} ${tgt ? 'PASS' : 'FAIL'} | ${r.flatWindows} | ${r.meanLag.toFixed(2)} | ${pct(r.targetFell)} | ${r.overCap} | ${r.medianDaysToTop} |`);
    }
  }
  line('\nPlateaued learners (rate 0, from scratch, tier p at T2 as given), last 90 of 365 days, 60 learners: where the planner aims. "hopeless" = practice days whose offered items have a fresh-cell probe-band p < 0.3. Target: offered probe-band p >= 0.35 and hopeless days <= 35 %.');
  line('| area | rule | tier p at T2 | rank | content edge | target | offered tier | offered p at its tempo | offered probe-band p | hopeless days | days offering at the +2 cap | days under a struggle step-down |');
  line('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const cat of [defaultCatalogue(), fixedSyn]) {
    for (const [name, sim] of rules) {
      for (const p of [0.5, 0.75]) {
        const r = h10Overshoot(p, N(60), SEED + 91, { cat, sim: { ...sim, h10: { ...H10_ON, tempo: cat.tempo } } });
        const ok = r.pProbe >= 0.35 && r.hopeless <= 0.35 ? ' PASS' : ' FAIL';
        line(`| ${cat.name} | ${name} | ${p} | ${r.rank.toFixed(2)} | ${r.contentEdge.toFixed(2)} | ${r.target.toFixed(2)} | ${r.tier.toFixed(2)} | ${r.pOffer.toFixed(2)} | ${r.pProbe.toFixed(2)}${ok} | ${pct(r.hopeless)} | ${pct(r.atCap)} | ${pct(r.struggleDays)} |`);
      }
    }
  }
}

if (want('5')) {
  line('\n## 5. Placement, gaming, teacher targets and minor rules on the v16 defaults');
  const c0 = placementRun(0, true, N(200), SEED + 70);
  const c2 = placementRun(2, true, N(200), SEED + 70);
  const c3 = placementRun(3, true, N(200), SEED + 70);
  const ce = placementRun(3, true, N(200), SEED + 71, { trueAt: 2 });
  line(`- Tempo area: correctly placed corrected ${pct(c0.corrected)} ${c0.corrected === 0 ? 'PASS' : 'FAIL'}; +2 corrected ${pct(c2.corrected)} (median first drop day ${c2.medianFirstDrop}); +3 corrected ${pct(c3.corrected)}; placed on an empty tier (+3, true T2) corrected ${pct(ce.corrected)} (median day ${ce.medianFirstDrop}).`);
  const f0 = placementRun(0, false, N(300), SEED + 70, { rate: 0, fixedTempoSim: true });
  const f2 = placementRun(2, false, N(300), SEED + 70, { rate: 0, fixedTempoSim: true });
  line(`- N1 in a fixed-tempo (harmony-like) area, all cells at placedTier: correctly placed corrected ${pct(f0.corrected)} ${f0.corrected === 0 ? 'PASS' : 'FAIL'}; +2 corrected ${pct(f2.corrected)} (median first drop day ${f2.medianFirstDrop}).`);
  const g = gamingOneExercise(N(50), SEED);
  line(`- Rank-gaming guard (one exercise, a new key every session, 180 days): ${g.every((r) => r === null) ? 'rank none in every run PASS' : 'FAIL'}.`);
  const s2 = syntheticCatalogue('x', [3, 3], 12);
  line(`- Guard minimum: three T0 passes and no counting checks → rank ${updateRankHW(s2.exercises, [0, 1, 2].map((i) => ({ exerciseId: `x:T0:${i}`, tier: 0, key: i, at: 0 })), 0, null, RANK_GUARDED, [])} (the guard needs >= ${TIER_GUARD.minChecks} checks).`);
}

if (want('6')) {
  line('\n## 6. Exercises per tier (catalogue rule): synthetic areas with k exercises at every tier T0-T6 (12 keys), days per tier on the v16 defaults');
  line('Fixed ability, tier p at the next tier as given, from rank = placedTier = the tier below; median / p90 days pooled over the 6 transitions (40 runs each).');
  line('| exercises per tier | p 0.75, 3 d/wk | p 0.75, 5 d/wk | p 0.85, 3 d/wk | p 0.85, 5 d/wk |');
  line('|---|---|---|---|---|');
  for (const k of [2, 3, 4, 6]) {
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

if (want('w')) {
  line('\n## W. Proposed fixes for the targets P >= 0.9 misses (NOT defaults): a window of the newest W entries, or the design effect from the weighted count');
  line('Why: the §1.7 design effect counts RAW entries per cell (m_c = entries / cells) over the whole record, while the recency weights (half-life 24) cap the weighted count near 35;');
  line('in an area with few cells (keyless, few keys) a long record drives m_c up without bound: a 3-cell record, all clean, 1.5 entries a day, gives n_eff 6.8 and P(p >= 0.5) 0.996 at 40 entries, 3.2 and 0.945 at 150, 1.7 and 0.844 at 300 (below 0.9 with no miss at all; computed with the harness designEffect / betaCdf).');
  line('Windowing the record at W entries (3 half-lives = 72, or 2 = 48) bounds m_c; so does computing m_d and m_c from the recency-weighted count (Σw / days, Σw / cells; `weightedDeff`). Same seeds and run counts as sections 1, 1b, K and 4.');
  const W = (w: number): Partial<SimOptions> => ({ rank: { ...RANK_GUARDED, tierGuard: { ...TIER_GUARD, window: w } } });
  const rows: [string, Partial<SimOptions>][] = [['DEFAULT v16 (G P 0.9)', {}], ['G P 0.9 + window 72', W(72)], ['G P 0.9 + window 48', W(48)], ['v15 default (G P 0.8)', P80], ['G P 0.9 + weighted design effect', { rank: { ...RANK_GUARDED, tierGuard: { ...TIER_GUARD, weightedDeff: true } } }]];
  line('| rule | per learner p 0.5 / 0.75 (no gain) | per learner p 0.5 / 0.75 (item gain) | keyless-3 / keyless-2 / keyless-real-ish: reach top; stalls (longest) | keyless-3 stationary per learner p 0.5 / 0.75 / 0.75 gain | real areas: stalls (longest); rises at tier p < 0.5 | days per tier p 0.75, 3 d/wk (13 real areas) | piano/harmony H10 slope; lag |');
  line('|---|---|---|---|---|---|---|---|');
  const wArg = process.argv.find((a) => a.startsWith('--wrows='));
  const wRows = wArg ? new Set(wArg.slice(8).split(',').map(Number)) : null;
  for (const [i, [name, sim]] of rows.entries()) {
    if (wRows && !wRows.has(i)) continue;
    const s0 = [0.5, 0.75].map((p) => stationaryHonesty(p, N(100), SEED + 1, { sim }));
    const s1 = [0.5, 0.75].map((p) => stationaryHonesty(p, N(100), SEED + 1, { sim, lp: ITEM_GAIN }));
    const kl = [keyless3, keyless2, keylessReal].map((cat) => climb(cat, N(20), 4242, 365, STEADY_LEARNER(), {}, 'V1', sim));
    const ks = [stationaryHonesty(0.5, N(60), SEED + 4, { cat: keyless3, sim }), stationaryHonesty(0.75, N(60), SEED + 4, { cat: keyless3, sim }), stationaryHonesty(0.75, N(60), SEED + 4, { cat: keyless3, sim, lp: ITEM_GAIN })];
    let stalls = 0, worst = 0, rises = 0, below = 0;
    for (const cat of real) {
      const c = climb(cat, N(20), SEED + 60, 365, STEADY_LEARNER(), {}, 'V1', sim);
      stalls += c.stalls; worst = Math.max(worst, c.worstStall); rises += c.rankUps.length; below += c.rankUpBelowHalf * c.rankUps.length;
    }
    const all: number[] = [];
    for (const cat of real) for (const t of daysPerTier(cat, 0.75, 3, N(20), SEED + 30, 240, {}, {}, 'V1', sim)) all.push(...t.days);
    const harm = realCatalogues('piano').find((c) => c.name === 'piano/harmony')!;
    const h = h10Study(name, N(60), SEED + 90, { h10: { ...H10_ON, tempo: harm.tempo }, cat: harm, sim });
    line(`| ${name} | ${s0.map((x) => pct(x.finalBelowHalfProbe)).join(' / ')} | ${s1.map((x) => pct(x.finalBelowHalfProbe)).join(' / ')} | ${kl.map((c) => `${pct(c.reachedAll)}; ${c.stalls} (${c.worstStall})`).join(' / ')} | ${ks.map((x) => pct(x.finalBelowHalfProbe)).join(' / ')} | ${stalls} / ${real.length * N(20)} (${worst}); ${pct(below / Math.max(1, rises))} | ${quantile(all, 0.5)} / ${Math.round(quantile(all, 0.9))} | ${h.flatSlope.toFixed(2)}; ${h.meanLag.toFixed(2)} |`);
  }
}

if (want('g')) {
  line('\n## G. W1 grid (coordinator request, NOT defaults): the weighted design effect (W1) at P 0.9 / 0.93 / 0.95 / 0.97, and W1 + P 0.9 + >= 3 distinct days among the newest 24 entries');
  line('Same seeds and run counts as sections 1, 1b, K, 4 and W. Per learner = final rank at probe-band p < 0.5 (stationary, 100 learners; real piano areas 30 per area, p 0.75 at the 2nd tier). Days per tier: 13 real areas, 3 d/wk, 20 runs per transition, median / p90 (share within 240 d when < 99.5 %).');
  line('Stalls >= 42 d: 13 real areas x 20 climbs (longest; areas); keyless-3 / keyless-2 / keyless-real-ish / 1-key-3 / 2-key-2 x 20 climbs (stalls; longest; share reaching the top when < 100 %). H10: flat-rank slope; mean lag (60 learners).');
  const G = (g: Partial<TierGuard>): Partial<SimOptions> => ({ rank: { ...RANK_GUARDED, tierGuard: { ...TIER_GUARD, ...g } } });
  const rows: [string, Partial<SimOptions>][] = [
    ['DEFAULT v16 (P 0.9, raw design effect)', {}],
    ['W1 P 0.9', G({ weightedDeff: true })],
    ['W1 P 0.93', G({ weightedDeff: true, conf: 0.93 })],
    ['W1 P 0.95', G({ weightedDeff: true, conf: 0.95 })],
    ['W1 P 0.97', G({ weightedDeff: true, conf: 0.97 })],
    ['W1 P 0.9 + >= 3 recent days', G({ weightedDeff: true, minDaysRecent: 3 })],
    ['W1 P 0.9 + only the first 3 counting checks per cell', { ...G({ weightedDeff: true }), planner: { guardPerCell: 3 } }],
  ];
  line('| setting | per learner p 0.5 / 0.75, no gain | per learner p 0.5 / 0.75, item gain | real piano per learner (per rise) | days per tier p 0.75 | days per tier p 0.85 | real areas: stalls (longest; where) | keyless / few-key: stalls (longest) | harmony slope; lag | synthetic fixed-tempo slope; lag |');
  line('|---|---|---|---|---|---|---|---|---|---|');
  const gArg = process.argv.find((a) => a.startsWith('--grows='));
  const gRows = gArg ? new Set(gArg.slice(8).split(',').map(Number)) : null;
  for (const [i, [name, sim]] of rows.entries()) {
    if (gRows && !gRows.has(i)) continue;
    const s0 = [0.5, 0.75].map((p) => stationaryHonesty(p, N(100), SEED + 1, { sim }));
    const s1 = [0.5, 0.75].map((p) => stationaryHonesty(p, N(100), SEED + 1, { sim, lp: ITEM_GAIN }));
    let fl = 0, n = 0, rises = 0, below = 0;
    for (const cat of realCatalogues('piano')) {
      const ts = [...new Set(cat.exercises.map((e) => e.tier))].sort((a, b) => a - b);
      const r = stationaryHonesty(0.75, N(30), SEED + 2, { sim, cat, startTier: ts[Math.min(1, ts.length - 1)] });
      fl += r.finalBelowHalfProbe * N(30); n += N(30); rises += r.rises; below += r.risesBelowHalfProbe * r.rises;
    }
    const tier: string[] = [];
    for (const pNext of [0.75, 0.85]) {
      const all: number[] = [];
      let reached = 0, k = 0;
      for (const cat of real) for (const t of daysPerTier(cat, pNext, 3, N(20), SEED + 30, 240, {}, {}, 'V1', sim)) { all.push(...t.days); reached += t.reached * t.days.length; k += t.days.length; }
      tier.push(`${quantile(all, 0.5)} / ${Math.round(quantile(all, 0.9))}${reached / k < 0.995 ? ` (${pct(reached / k)})` : ''}`);
    }
    let stalls = 0, worst = 0;
    const where: string[] = [];
    for (const cat of real) {
      const c = climb(cat, N(20), SEED + 60, 365, STEADY_LEARNER(), {}, 'V1', sim);
      stalls += c.stalls; worst = Math.max(worst, c.worstStall);
      if (c.stalls) where.push(`${cat.name} ${c.stalls}`);
    }
    const kl = [keyless3, keyless2, keylessReal, oneKey, twoKey].map((cat) => climb(cat, N(20), 4242, 365, STEADY_LEARNER(), {}, 'V1', sim));
    const harm = realCatalogues('piano').find((c) => c.name === 'piano/harmony')!;
    const h = h10Study(name, N(60), SEED + 90, { h10: { ...H10_ON, tempo: false }, cat: harm, sim });
    const f = h10Study(name, N(60), SEED + 90, { h10: { ...H10_ON, tempo: false }, cat: fixedSyn, sim });
    line(`| ${name} | ${s0.map((x) => pct(x.finalBelowHalfProbe)).join(' / ')} | ${s1.map((x) => pct(x.finalBelowHalfProbe)).join(' / ')} | ${pct(fl / n)} (${pct(below / Math.max(1, rises))}) | ${tier[0]} | ${tier[1]} | ${stalls} / ${real.length * N(20)} (${worst}; ${where.join(', ') || '-'}) | ${kl.map((c) => `${c.stalls} (${c.worstStall})${c.reachedAll < 1 ? ` ${pct(c.reachedAll)}` : ''}`).join(' / ')} | ${h.flatSlope.toFixed(2)}; ${h.meanLag.toFixed(2)} | ${f.flatSlope.toFixed(2)}; ${f.meanLag.toFixed(2)} |`);
  }
}

line(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);

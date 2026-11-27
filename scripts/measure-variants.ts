// Item-pass variants V0–V3 (coordinator 2026-11-27, finding 4 of the §9.1 harness) and the three re-tested fixes.
// Usage: npm run measure-variants            (20 runs per tier transition / climb, 1000 per flow cell)
//        npm run measure-variants -- --quick (12 / 400)
import { PASS_VARIANTS, placementRun, updateRankHW, syntheticCatalogue, variantStudy } from '../src/engine/measure/sim';
import { realCatalogues } from '../src/engine/measure/sim/realCatalogue';

const quick = process.argv.includes('--quick');
const SEED = 20261127;
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const line = (s = '') => console.log(s);
const t0 = Date.now();
const cats = [...realCatalogues('piano'), ...realCatalogues('guitar'), ...realCatalogues('bass')];
const runs = quick ? { flowRuns: 400, tierRuns: 12, climbRuns: 12 } : { flowRuns: 1000, tierRuns: 20, climbRuns: 20 };

line(`# Item-pass variants (15 real piano/guitar/bass areas; rank with fix 1)${quick ? ' — QUICK' : ''}`);
line(`runs: ${runs.flowRuns} per flow cell, ${runs.tierRuns} per tier transition, ${runs.climbRuns} climbs per area; seed ${SEED}`);
const reps = PASS_VARIANTS.map((v) => variantStudy(v, cats, SEED, runs));

line('\n## (a) P(pass within 28 days, 4 days/wk) by cold clean rate');
line(`| variant | ${[0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((p) => `p ${p}`).join(' | ')} |`);
line('|---|---|---|---|---|---|---|');
for (const r of reps) line(`| ${r.variant} | ${r.pass28.map((x) => pct(x.rate)).join(' | ')} |`);

line('\n## (b) Calendar days per tier, pooled over every transition of every real area (median / p90; share reached in 240 d)');
line('| variant | p 0.75, 3 d/wk | p 0.75, 5 d/wk | p 0.85, 3 d/wk | p 0.85, 5 d/wk |');
line('|---|---|---|---|---|');
for (const r of reps) line(`| ${r.variant} | ${r.tierDays.map((t) => `${t.median} / ${Math.round(t.p90)}${t.reached < 0.995 ? ` (${pct(t.reached)})` : ''}`).join(' | ')} |`);

line('\n## (c) Honesty of rank rises, and (d) stalls (steady learner, 365 d, 4 d/wk)');
line('| variant | rank rises at true p < 0.5 | median true p at a new tier | learners with a stall ≥ 42 d | climbs missing a rankable tier |');
line('|---|---|---|---|---|');
for (const r of reps) line(`| ${r.variant} | ${pct(r.rankUpBelowHalf)} | ${r.medianPAtRankUp.toFixed(2)} | ${r.stalls} / ${r.climbs} | ${r.missedTop} / ${r.climbs} |`);

line('\n## Fixes re-tested');
const one = syntheticCatalogue('one', [3, 1], 12).exercises;
const two = [{ exerciseId: 'one:T1:0', tier: 1, key: 0, at: 0 }, { exerciseId: 'one:T1:0', tier: 1, key: 5, at: 1 }];
line(`- Fix 1 (≥ 2 distinct exercises): one exercise in 2 keys on a 1-exercise tier → rank ${updateRankHW(one, two, 0, 0)} (v12 gave 1).`);
const e = placementRun(3, true, quick ? 60 : 150, SEED + 71, { trueAt: 2, rate: 0 });
line(`- Fix 2 (snap empty placed tier down): placed T5 (empty), true T2 → ${pct(e.corrected)} corrected, first drop median day ${e.medianFirstDrop}; ${pct(e.settled)} settled at ≤ T3, median day ${e.medianSettled}.`);
for (const rate of [0, 0.05]) {
  for (const off of [0, 2, 3]) {
    const r = placementRun(off, false, quick ? 60 : 150, SEED + 70, { rate });
    line(`- Fix 3 (reading, < 35 % clean over ≥ 8 attempts on ≥ 3 days), learning rate ${rate} tiers/h, placed +${off}: ${pct(r.corrected)} corrected${off ? `, first drop median day ${r.medianFirstDrop}, ${pct(r.settled)} settled (median day ${r.medianSettled})` : ''}.`);
  }
}
line(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);

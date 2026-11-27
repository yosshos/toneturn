// The SPEC-HOLISTIC-2 §9.1 / §17.4 harness report: every number the owner sees before step 1 ships.
// Usage: npm run measure-sim            (full precision, a few minutes)
//        npm run measure-sim -- --quick (fewer runs)
import {
  climb, daysPerTier, defaultCatalogue, gamingOneExercise, itemPassFlow, placementRun, pPairWithin, READING_SCHEDULE, readingFalsePass,
  readingTimeToPass, repromotion, TRANSFER_SCHEDULE, wrongDemotion, quantile,
} from '../src/engine/measure/sim';
import { perTierCounts, realCatalogues } from '../src/engine/measure/sim/realCatalogue';

const quick = process.argv.includes('--quick');
const N = (full: number) => (quick ? Math.max(20, Math.round(full / 5)) : full);
const SEED = 20261127;
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const t0 = Date.now();
const line = (s = '') => console.log(s);
const verdict = (ok: boolean) => (ok ? 'PASS' : 'FAIL');

line(`# Measurement harness report (SPEC-HOLISTIC-2 v12 §9.1 / §17.4)${quick ? ' — QUICK' : ''}`);
line('Defaults: item pass V1 (owner 2026-11-27); rank needs ≥ 2 distinct exercises (1-exercise tiers grouped up, or down at the top); empty placed tier snaps down; non-tempo placement correction N1.');
line(`seed ${SEED}; day SD 0.8, cell SD 0.7 (logit); ρ_d 0.15, ρ_c 0.20; β 1.2 logit/tier; warm +0.8 logit`);

line('\n## 1. P(item pass | cold clean rate) (§1.6)');
line('k columns: the exact V0 pair rule (two consecutive clean counting cold checks within k checks), warm half already met. Flow columns: the default rule (V1) through the tracker.');
line('| p | k=2 | k=3 | k=5 | k=10 | E[checks] | flow 14 d | flow 28 d |');
line('|---|---|---|---|---|---|---|---|');
for (const p of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
  const f14 = itemPassFlow(p, 14, N(2000), SEED + 1);
  const f28 = itemPassFlow(p, 28, N(2000), SEED + 2);
  line(`| ${p} | ${pct(pPairWithin(p, 2))} | ${pct(pPairWithin(p, 3))} | ${pct(pPairWithin(p, 5))} | ${pct(pPairWithin(p, 10))} | ${((1 + p) / (p * p)).toFixed(1)} | ${pct(f14)} | ${pct(f28)} |`);
}
line('flow = full default (V1) rule through the tracker: a visit on each practice day (4/wk), cold check + 4 warm takes (warm +0.8 logit), day SD 0.8.');

line('\n## 2. Reading / transfer pass (§1.6): false passes (target < 10 % at p = 0.5, day SD 0.8)');
line('| schedule | true p | 30 d | 60 d | 90 d | 180 d |');
line('|---|---|---|---|---|---|');
for (const [name, s] of [['reading 4/day', READING_SCHEDULE], ['transfer 2/day', TRANSFER_SCHEDULE]] as const) {
  for (const p of [0.4, 0.5]) {
    const r = [30, 60, 90, 180].map((d, i) => readingFalsePass(p, d, N(2000), SEED + 10 + i, s));
    line(`| ${name}, 4 d/wk | ${p} | ${r.map(pct).join(' | ')} |`);
  }
}
line('\nTime to pass, learner improving 0.3 → 0.85 (linear in logit over 6 weeks, then flat):');
for (const [name, s] of [['reading 4/day', READING_SCHEDULE], ['transfer 2/day', TRANSFER_SCHEDULE]] as const) {
  const r = readingTimeToPass(N(1000), SEED + 20, { s });
  line(`- ${name}: median ${r.medianDay} d (90th pct ${r.p90Day} d), ${pct(r.passed)} passed by day 120, median true p at pass ${r.medianPAtPass.toFixed(2)}, median ${r.medianAttempts} attempts`);
}

line('\n## 3. Calendar days per tier (rank, H8), fixed ability, no item-practice gain');
const cats = [defaultCatalogue(), ...realCatalogues('piano'), ...realCatalogues('guitar'), ...realCatalogues('bass')];
line('| area | exercises per tier T0.. | p_next | d/wk | median days per tier (each transition) | median of medians |');
line('|---|---|---|---|---|---|');
for (const cat of cats) {
  for (const pNext of [0.75, 0.85]) {
    for (const dpw of [3, 5]) {
      const tt = daysPerTier(cat, pNext, dpw, N(60), SEED + 30);
      const cells = tt.map((t) => `${t.from === null ? '—' : 'T' + t.from}→T${t.to}: ${t.median}${t.reached < 1 ? ` (${pct(t.reached)} reached)` : ''}`).join('; ');
      line(`| ${cat.name} | ${perTierCounts(cat).join(' ')} | ${pNext} | ${dpw} | ${cells} | ${quantile(tt.map((t) => t.median), 0.5)} |`);
    }
  }
}

line('\n## 4. Current form (§1.7): wrong demotions (target < 5 % per 90 days at true p ≥ 0.75), calibration');
line('| true p at rank | d/wk | slots | wrong demotion / 90 d | any slump / 90 d | median true p at slump | rank rose above R | 80 % CI coverage (n_eff) | coverage (naive n) | bias | RMSE |');
line('|---|---|---|---|---|---|---|---|---|---|---|');
for (const p of [0.75, 0.85]) {
  for (const [dpw, slots] of [[4, 2], [5, 4]]) {
    const r = wrongDemotion(p, N(300), SEED + 40, { dpw, slots });
    line(`| ${p} | ${dpw} | ${slots} | ${pct(r.wrongRate)} ${verdict(r.wrongRate < 0.05)} | ${pct(r.anySlump)} | ${r.slumpTruthMedian.toFixed(2)} | ${pct(r.rankRose)} | ${pct(r.coverage)} | ${pct(r.naiveCoverage)} | ${r.bias.toFixed(3)} | ${r.rmse.toFixed(3)} |`);
  }
}
const rp = repromotion(N(200), SEED + 50);
line(`\nRe-promotion: p 0.85 at rank T3, a 4-week dip of −3 logits then back: ${pct(rp.slumped)} slumped; of those ${pct(rp.recovered)} back at their pre-dip current form within 120 d, median ${rp.medianDays} d (90th pct ${rp.p90Days} d) after the dip. Before the dip, ${pct(rp.cfBelowRankBefore)} already had current form below rank.`);

line('\n## 5. Rotation-only climbs and stalls (§1.3, §9.1), steady learner (p 0.6 at T0, ≈ 1 tier / 3 weeks of ability), 365 d, 4 d/wk');
line('| area | exercises per tier | target | reached target | median days to target | reached top tier | learners with a stall ≥ 42 d | worst stall (days, at rank) | median true cold p at the new tier when rank rises | rank rises with true p < 0.5 |');
line('|---|---|---|---|---|---|---|---|---|---|');
for (const cat of cats) {
  const c = climb(cat, N(60), SEED + 60);
  line(`| ${c.name} | ${c.perTier.join(' ')} | T${c.target} | ${pct(c.reachedTarget)} | ${c.medianDaysToTarget} | ${pct(c.reachedAll)} | ${c.stalls} | ${c.worstStall} (T${c.worstStallTier ?? '-'}) | ${c.medianPAtRankUp.toFixed(2)} | ${pct(c.rankUpBelowHalf)} |`);
}

line('\n## 6. Placement correction (§1.3)');
line('| area kind | placed − true | corrected | median day of first drop | settled (placed ≤ true + 1) | median day settled |');
line('|---|---|---|---|---|---|');
for (const tempo of [true, false]) {
  for (const off of [0, 2, 3]) {
    const r = placementRun(off, tempo, N(150), SEED + 70);
    line(`| ${tempo ? 'tempo (synthetic)' : 'non-tempo (reading)'}, true T1 | +${off} | ${pct(r.corrected)}${off === 0 ? ` ${verdict(r.corrected === 0)}` : ''} | ${off === 0 ? '—' : r.medianFirstDrop} | ${pct(r.settled)} | ${off === 0 ? '—' : r.medianSettled} |`);
  }
}

const empty = placementRun(3, true, N(150), SEED + 71, { trueAt: 2 });
line(`| tempo (synthetic), true T2, placed on the EMPTY tier T5 | +3 | ${pct(empty.corrected)} | ${empty.medianFirstDrop} | ${pct(empty.settled)} | ${empty.medianSettled} |`);

line('\n## 7. Rank-gaming guard (§1.7)');
const g = gamingOneExercise(N(100), SEED + 80);
line(`One exercise, a new key every session, 180 d, able learner: max rank ${g.some((x) => x !== null) ? 'RAISED ' + verdict(false) : 'none ' + verdict(true)}`);

line(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);

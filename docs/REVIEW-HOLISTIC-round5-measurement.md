# Round 5: measurement / adaptivity review (HOLISTIC-2 v6 + SP v6)

## (1) Verdict: NOT CLEAN

The structure is now coherent: there is one statistic, confirmations are counted on both sides, the threshold estimate is separate from the tempo choice, rank uses a high-water mark and current form is shown separately. Five substantive problems remain. One is a blocker, the placement path, and one is a statistical error. I simulated the HOLISTIC §19.1 rule: window 20, Beta(1,1) prior, at most 1 look per day, evaluated after every look. It promotes after 8/8, 12/13, 15/16 or 18/20 clean confirmations. It demotes at 1 or fewer clean out of 8, 2/10, 3/12 or 6/20.

| True p | Looks | Promoted |
|---|---|---|
| 0.55 | 180 (6 mo) | **5.3–5.8 %** (target < 5 %) |
| 0.55 | 365 | 11 % |
| 0.55 | 730 | **19–20 %** |
| 0.60 / 0.65 | 180 | 17 % / 38 % (gap zone, by design) |
| 0.75 | — | median **49–52 looks**; 6.6 % not promoted after 200 |
| 0.85 | — | median 18 looks; minimum 8 |

At p = 0.75, wrong demotion is 0.3 % over 180 looks and 0.5 % over 365 looks, so the demotion side meets its target.

## (2) Substantive issues

**S1. Placement → confirmation path is undefined (HOLISTIC §1.3, §1.6, §19.7; SP A8). BLOCKER.**
- **Problem:** §19.7 limits entry to tiers at or below min(high-water + 1, current form + 1). Nothing says what high-water and current form are for a learner who is "placed, to confirm":
  - If the placement counts as high-water, rank shows a tier that was never confirmed cold, which breaks §19.9.
  - If it does not count, a learner placed at T5 can only enter items up to T1. They can never produce the T5 confirmations needed to confirm the placement. That is a stall, and in practice a lock.
- **Also undefined:**
  - Which tier the test runs on while placed: the placed tier or placed + 1? §19.1 only says "candidate tier".
  - What happens when the placement is never confirmed, or meets the demotion criterion.
  - Whether SP A8's switch after "≥ 3 cold takes" still applies.
- **Why it matters:** placement is the main way in, and `areaTier` can't be built without this rule.
- **Fix:** define `placedTier` as a separate field:
  - entry ≤ max(placedTier, min(high-water, current form)) + 1;
  - the test runs at placedTier itself until it is confirmed;
  - rank = confirmed high-water only, and the placement shows as "placed";
  - if the demotion criterion fires at placedTier, set placedTier one tier lower (this never touches rank);
  - delete A8's 3-take switch.

**S2. Dropping the passing take biases confirmations toward misses (HOLISTIC §1.6, §19.2). MAJOR (statistical error).**
- **Problem:** each unpassed item at the candidate tier gets cold takes in the probe band until one of them completes the pass. The rule keeps the misses before the pass and drops the success that ends the run. That is selection on outcome, the thing §19.1-b was meant to remove.
- **Size:** about (1−p)/p unbalanced misses per item, which is 0.33 at p = 0.75. At the candidate tier most items are by definition still unpassed or newly passed, so this bias is largest where promotion is decided.
- **Fix:** include the passing take. Under the likelihood principle, a Bayesian beta-binomial posterior ignores the stopping rule, so nothing needs to be dropped. The alternative, excluding every take before the pass for that item, throws away data.

**S3. "p" is not tied to a set of items, and the counted look is not specified, so the rule can be gamed (§1.1, §19.1). MAJOR.**
- **Problem:** level is defined as cold p ≥ 0.7 "at a tier", but a tier is a mix of items of different difficulty. The confirmation window only needs ≥ 2 keys.
  - List runs and hands-free lists may pass `coldOk` (SP §4.1). A learner can open each day on the easiest T+1 item in 2 keys and get promoted on that one item.
  - The 1-look-per-day cap does not say which confirmation counts: the first, the planner's, or the best. An implementation that picks the best would be selection on success.
- **Fix:**
  - the counted look is the first eligible confirmation of the day, in time order;
  - the window must hold ≥ 3 distinct items (or ≥ ½ of the area's items at that tier, whichever is fewer) besides ≥ 2 keys;
  - add a guard test with a learner who games the easiest item.

**S4. The false-promotion target only covers 6 months, but rank is permanent (§19.1, §9.1). MAJOR.**
- **Problem:** the sliding window keeps testing for as long as the learner stays at a tier, while the high-water rank never falls. A plateaued learner at p = 0.55 is falsely promoted 11 % of the time by one year and 20 % by two years, so these errors pile up permanently. Plateaued learners are exactly the people this app is built for.
- Even at 180 looks the default rule misses its own target (5.3–5.8 %).
- Leaving it to "harness tuning" hides the horizon problem: no tuning of the thresholds fixes an unbounded number of looks.
- **Fix:** set the target over a 2-year horizon, or as a per-look rate. In my runs, W = 30 with a 0.975 posterior threshold gives 1.5 % at 180 looks and about 5 % at 730. Median looks to promote are then 76 at p = 0.75 and 26 at p = 0.85. Write the horizon into §9.1.

**S5. No confirmation definition for areas without a target tempo (§19.2, §1.2, §1.6). MAJOR.**
- **Problem:** §19.2 defines a confirmation only as a cold take at 0.95–1.0 × target. These areas have no such band, yet §1.2 and §1.6 give them a level:
  - harmony/voicing, whose rungs are fixed-tempo (SP A1; §1.9 says their cold measure is accuracy);
  - voice (cents × timing bands, `cellPass`);
  - rhythm (SD band);
  - reading (sight takes).
- Also undefined: how the voice "item level → cents band → timing band" ordering maps onto one 0–8 tier where the test runs.
- **Fix:** add a table with one row per area giving:
  - what counts as a confirmation (first cold take per cell per session, at the item's own grading band);
  - what counts as success;
  - the tier key the posterior is indexed by.

**S6. The rank-lag figure in the owner question is wrong (§19.9). MAJOR.**
- **Problem:** §19.9 tells the owner that rank lags passed items by "days or weeks". The real figures:
  - the minimum is 8 confirmation days per tier, because of the look cap;
  - at p = 0.75 the median is about 50 practice days, roughly 3 months at 4 days a week;
  - the climb from T0 to T5 takes at least 40 practice days, even for a perfect learner.
- This sits against owner memory key-session-must-develop (stuck for 3 days was not acceptable).
- **Fix:** the owner question should quote the harness's real operating-characteristic numbers. Consider showing the posterior as the bar to next (already in §1.10), so progress is visible every practice day.

## (3) Minor notes

- **Max over inputs (§19.6):** rank takes the best tier over all inputs, so the most lenient input sets rank. That is fine if per-input jitter only widens thresholds by measured noise; add a harness check.
- **Re-entry window (§19.8):** a single FSRS-good review on day 1 ends the re-entry window for the whole area. Make it per item, or require ≥ 2 good reviews.
- **Body text superseded by §19.1:** the §1.7 demotion rule ("failed twice in a row …") and §1.9 "counts only when clean" should be deleted at consolidation so nobody builds both.
- **SP §9 "promotion by day 2–3":** this means the item pass. Call it the item pass, so it isn't read as a tier promotion, which now takes at least 8 days.
- **The "≥ 2 days" condition (§19.1)** is redundant under the 1-look-per-day cap. That is harmless.
- **MAP estimate (§19.3):** with a prior at the start tempo and recency weights, the estimate drifts toward the start tempo during a break. Momentum "cold rise" must read the all-time high-water mark of the estimate (§3 says so for promotion; state it for the estimate too).
- **Staircase on passed non-anchors:** after a miss, the next takes fall below 0.95 × target and drop out of confirmations until 2 clean takes bring the tempo back into the band. That is acceptable, but say it explicitly.
- **Buildability:** none of the new state exists yet. `ItemState` (types.ts:1080) has no `lastQual`, `cold[]`, `passedAt`, `lastSound` or `cellPass`; `RatingEvent` (rating.ts:42) has no `item`, `src` or `cold`; `playerTier` (tiers.ts:35) is still warm and breadth-only. All of it is new but derivable, and it is covered by the fresh-start epoch. The cell key can be derived from `family` + itemId + `key` + `hands`. No impossibility found.

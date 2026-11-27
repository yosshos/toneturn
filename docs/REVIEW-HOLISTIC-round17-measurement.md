# Round 17: measurement / adaptivity review of SPEC-HOLISTIC-2 v13 + SP v6

**Verdict: NOT CLEAN**

`npx vitest run tests/measureSim.test.ts` passes (42/42). The reports match the spec tables. The item pass, rank (grouping and ceiling), N1 placement and current-form code agree with §1.3, §1.6 and §1.7 apart from what is listed below. The main problem is something the harness never measured, not a coding error.

## Substantive issues

**1. §1.6 / §1.7 / §9.1: a plateaued learner's permanent rank is inflated, and the validation never tested it (major, close to blocker).**
The 9.2 % honesty figure, which was the basis for H9, comes from a learner who keeps improving. In that case passes lag ability, which hides the bias. I ran the harness defaults (V1, default planner, synthetic catalogue, 365 days) on a learner who does not improve (rate 0). Scratch scripts: plateau.ts and plateau2.ts in the scratchpad folder.
- True cold p 0.5 at T2: median final rank T3 (p90 T4). True tier p at that rank is 0.27. Of the passes at T3, 86 % are cells whose true cold p is below 0.5 (median 0.36). At T4 the figure is 99 % (median 0.19).
- True cold p 0.75 at T2: rank T4 (tier p 0.30). Of the T4 passes, 80 % have true cell p below 0.5.
- Rank rises at true p < 0.5 for these learners: 22–40 %, against the reported 9 %.
- The existing current-form run shows the same thing: "rank rose above R" is 100 % for a learner whose ability is fixed.

Mechanism: the evidence is kept per cell. A new key, or a shelved cell's exercise offered again, starts a fresh tracker. V1's "last ≤ 6" share can be met with only 2/2 checks. Over months of fresh cells (exercise × 12 keys, 12-visit shelving), the multiple tries make a pass all but certain. Rank never falls, so the inflation is permanent, and it lands exactly on the plateaus that §6.2 expects.

**Fix:**
- Pool the counting cold checks per exercise across its keys, so a new key never resets misses. Or require ≥ 3–4 counting checks before the share test.
- Add a stationary-learner honesty metric and target to §9.1 (for example, rank rises at true p < 0.5 at most about 10 % over 365 days).
- Show the owner the new numbers before step 1, since H9 was chosen on incomplete evidence.

**2. §1.7a / §5 / §1.7: the H10 "challenge point" can't be computed from the specified state, and its monotone clause contradicts other rules (major).**
- **The content edge is pinned to rank.** The challenge point is built "from current form and the threshold estimates". But current form is initialised from rank and capped at it (§1.1, §1.7), so its content edge never rises above rank. Threshold estimates exist only for tempo items (§1.9: fixed-tempo items have no staircase). So for harmony, voicing, reading, voice and rhythm, nothing in the state rises while rank is flat. §5's 0.45 distance term then favours rank-tier items over the r+1 and r+2 items that H10 wants.
- **"Never served a session easier than their last one" contradicts other rules:**
  - the re-entry session after a break (§5);
  - a slump, which lowers current form and so the challenge point (§1.7);
  - the review and confirmation quotas at the probe band.

  As a ratchet on noisy estimates it also drifts upward.
- **The H10 test is unsatisfiable as worded.** "Mean content and tempo keep rising with ability while rank is flat" can't hold for long. Content is capped at max(placedTier, rankHW) + 2, and non-anchor tempo stops at target (anchors at 1.25×).

**Fix:**
- Define the working edge explicitly: content = the highest entered tier at which the learner has non-provisional thresholds at the probe band, or `established` items; tempo = the threshold estimate.
- Apply the no-easier rule only to the new/strengthen quota, with re-entry and slump exempt.
- State the H10 metric as "offered frontier difficulty tracks θ, up to the +2 cap".
- The harness has no H10 code or test yet (grep finds none), so step 1 needs this defined first.

**3. §9.1 vs harness: look supply (major).**
- **Spec:** 2–4 confirmation slots per session across all areas.
- **Harness:** gives one area 2–4 slots per session (`confirmSlots: 2` in DEFAULT_PLANNER; 4 in some runs). It models no FSRS-review looks.

With 5–7 areas per instrument, the real supply per area is several times lower. So the current-form figures (0 % wrong demotion, calibration, re-promotion median 94 days) were validated at a supply the spec doesn't give.

**Fix:** re-run with the slot cap shared across areas, plus modelled FSRS-review looks. Or specify a minimum number of looks per area.

**4. §9.1: the "calibrated" claim is a statistical error (major).**
An 80 % interval covering 93–94 % is over-conservative, not calibrated. Naive n gives 80–81 %. Two causes:
- **Wrong estimand.** The harness's truth is the mean p of the window's own cells, yet n_eff also corrects for cell clustering (ρ_c 0.20). With few cells, the design effect roughly halves the information.
- **Visible effect.** This also slows decisions: it is a likely cause of the 94-day re-promotion "soft spot".

**Fix:** choose the estimand the slump and re-promotion decisions are about:
- if it is the tier's p (fresh cells), score coverage against `trueTierP`;
- if it is the window's cells, drop ρ_c.

Then restate the result and re-tune ρ.

## Minor notes
- §1.7 step 4 counts "available keys" as the union of the exercises' keys. `deriveRank` uses the max of `e.keys`. These differ only when key sets differ (for example, two 1-key exercises). Align them.
- §1.7a "the current tier's exercises" (readiness) is ambiguous: rank tier, base tier, or highest entered tier?
- In the harness, N1 counts only working (unpassed) cells at `placedTier`. The spec counts all cells at `placedTier`. Clarify which.
- Manual play can still choose the days for cold checks (day SD 0.8 is large), for example by playing RH first on bad days. This is optional stopping by day. Consider logging skipped due checks.
- The harness models no item-specific learning (`itemGain` 0), forgetting, input noise or readiness entry. Issue 1 should be re-checked with `itemGain` > 0, because some of the inflation could then be genuine item learning.

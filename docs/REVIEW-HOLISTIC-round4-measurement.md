# Round 4 — measurement / adaptivity review (SPEC-HOLISTIC-2 v5 + SPEC-SPIRAL-PRACTICE v6)

**NOT CLEAN**

Most of the structure is now sound: a cold flag on every event, `lastSound` closing warm-up laundering, the high-water rank kept apart from current form, the staircase kept apart from the threshold estimate, censoring above target, confirmations not selected on success, the re-entry window, and Phase A exempted from the reliability gate. The issues below are in the core statistics and in a few rules that clash, and all of them are in build step 1, so they need fixing before step 1 starts.

## Substantive issues

### 1. §1.7: the promotion test is not well defined, and its stated target can't be met (blocker)
- **The problem:**
  - "A cumulative LLR over a sliding window of the last 12, floored at the lower bound and never restarted" describes two different statistics. A windowed sum has no state to floor or restart. A floored cumulative sum (CUSUM) has no window. Two developers would build two different tests.
  - Whichever is meant, the <5 % false-promotion target (p ≤ 0.55, 6-month horizon of looks) can't be met with a window of 12. With the given parameters, +0.53 per clean and −1.20 per miss against an upper bound of ln 16 = 2.77, promotion needs 6 clean in a row, or 10 of the last 12. At p = 0.55, a run of 6 clean comes after about 80 confirmations on average, so a daily player is almost sure to be falsely promoted within 6 months.
  - Even the strictest rule a 12-window allows, 12 of 12 clean, gives about 300 × 0.45 × 0.55¹² ≈ 10 % false promotions over about 300 looks. At that bound, a learner at p = 0.7 almost never promotes. So "the harness tunes the bounds" has no solution: either false promotions break the target, or learners at and just above p* stall.
- **Why it matters:** rank is high-water and sticky (§1.10), so every false promotion is permanent.
- **The fix:**
  - Choose one statistic. The best fit is a Bayesian beta-binomial posterior over the last N cold confirmations: promote when P(p ≥ p* | data) ≥ 0.95, which covers the time-varying θ. Alternatively, a windowed SPRT with N fixed by simulation.
  - Size N, or the threshold, from the harness against a stated maximum number of looks. For example, cap the looks per tier per day, and state the expected looks over 6 months.
  - Publish the operating characteristic: the expected confirmations to promote at p = 0.75 / 0.85, and the false-promotion rate at p = 0.55.

### 2. §1.9 vs §1.6: one-sided confirmations above target (blocker)
- **The problem:** for passed anchors, "a miss above target is censored … the above-target staircase take … counts as a confirmation only when clean." That records only successes. Each such clean adds +0.53 to the LLR and nothing can subtract, so repeated cold anchor takes must eventually cross the bound. It directly contradicts §1.6 ("not selected on success"), and it is a gaming route: assign yourself an anchor at the candidate tier and play it cold every hour.
- **The fix:**
  - Above-target staircase takes are excluded from confirmations both ways, and feed only the staircase and the threshold estimate.
  - Alternatively, count a clean above target as a clean at target, and give every such cold attempt a scheduled at-target probe whose result always counts.

### 3. §1.7 / §9.1: the wrong-demotion target has no definition and the rule breaks it (major)
- **The problem:** §9.1 asks for wrong demotions < 5 % but gives no indifference zone and no horizon. Take a learner at p = 0.72:
  - the demotion rule (2 failed in a row on 2 days, and a clean share < ½ over ≥ 4 confirmations) fires with a per-look chance of about 8 % (P(≤ 1 of 4)) times the two-in-a-row condition;
  - over months of looks it fires almost surely.

  Current form then flickers down and back up. This is visible oscillation, and it changes the entry gate (§1.3 reads `areaTier.content`).
- **The fix:**
  - Define the zone: a wrong demotion is a drop when true p ≥ 0.75, over the same horizon.
  - Use the same posterior with a lower threshold, e.g. P(p < 0.5) ≥ 0.95 over ≥ 8 confirmations.
  - Make the §1.3 entry gate read the high-water tier, or max(current form, high-water − 1), so a dip in form can't shrink the pool.

### 4. §1.9: the ML threshold estimate can't be identified at the data sizes given (major)
- **The problem:**
  - A two-parameter logistic fit over 6+ cold trials per item, from about one cold trial per item per day, is very often perfectly separated: all clean, or clean below and miss above. The MLE is then infinite or undefined.
  - "Discard the first 2 reversals" is a convention for averaging staircase reversals. It has no meaning for an ML fit over actual tempos.
  - A 30-day window over a learner who is improving lags by about 2 weeks, and §6.2 then takes the slope of this already-smoothed series.
- **Why it matters:** Momentum "cold rise", record XP, G, the plateau and Phase B all read this number, so it decides rewards.
- **The fix:**
  - Use a MAP / Bayesian fit with the slope fixed (or given a prior) from the catalogue tier, and a prior on the threshold at the item's start tempo.
  - Weight trials by recency (a half-life of about 10 days) instead of a hard 30-day window.
  - Drop the reversal discard, and report the posterior SD.
  - The plateau test should use the raw cold points, a slope with its CI, not the smoothed estimate.

### 5. §1.4: "only the first cold take in a session counts toward level" has no scope, and clashes with SP's pass rule (major)
- **The problem:**
  - It does not say whether this applies per session, per area or per tier. If per session, a 4-exercise rotation gives one confirmation a day, and promotion takes weeks per tier, much slower than the statistics in issue 1 assume.
  - It also says later cold takes count "only toward FSRS and the staircase", which reads as excluding them from `itemPass`. But SP §4.2 and the SP §9 3-day simulation ("every exercise gets a qualifying cold take each day; promotion by day 2–3") need the 2nd–4th cold takes of a session to count toward passes.
- **The fix:**
  - State "first cold take per area per session counts as a level confirmation".
  - State that every cold take counts toward `itemPass`, FSRS and the staircase.
  - Reconcile the rhythm rule ("first 2 takes" in the same paragraph).

### 6. §1.6 / §5 `established` gate vs owner decision D2 and SP A10 (major)
- **The problem:**
  - HOLISTIC says SP §14 / §15.5 prerequisites read `established`, a clean cold take on a later day.
  - D2 (owner) says a timed assignment's forms join once the anchor is acquired, in the same session, and A10 gates forms on the prerequisite being acquired.
  - Under `established`, item 35 (prerequisite scales-8 at that offset) and every anchor-dependent form are skipped on the first day of any assignment. That breaks D2 and the SP §9 test "a second exercise within about 10 takes after acquisition".
- **The fix:**
  - Within an assignment or session, forms and same-session entry follow D2 / A10 (`acquired`).
  - `established` gates cross-session pool entry, need readiness and the strengthen pool only.
  - State this split in both specs.

### 7. §1.12 vs the guarantee that rank never falls (major)
- **The problem:** "Level and rank read the current input's series", and a change of input starts a new series. A MIDI player who plugs in a mic, or a new keyboard, sees their rank drop at once. The drop comes from neither a break nor a measurement, which breaks promotion-not-full-bars and the owner's breaks rule.
- **The fix:**
  - Rank, DYN and friend level = the maximum high-water over inputs, shown with the input.
  - Current form and the cold series stay per input.
  - Strands the mic can't measure stay excluded, as now.

## Minor notes

- **Governance scope.**
  - HOLISTIC line 9 says it governs SP §4 and §17 only. Yet it also amends SP §3 (`lastSound`, the cold check), §14 / §15.5 (`established`, the content+1 entry gate) and A8 (`areaTier`). Widen the statement.
  - Stale SP text then remains to clean up: the §3 0.9 × best cold check, the §17.3 R row and the A3/minor note on it, and §14's "acquired".
- **Entry gate vs forms:** SP §2.6 lets forms be "at most 2 tiers up", but the entry gate allows content + 1. Say whether teacher-assigned forms are exempt.
- **Band → content tier seeding (§1.2):** band 2 = T2–3 has no single T. State the rule (e.g. the band's lower T).
- **Staircase step (§1.9):** "2 marks, then 1" conflicts with "R drives 0.5–1.5 marks". A half mark is not on the metronome grid (SP §1 "one mark"). Define the step as marks × R, snapped to the grid, with a minimum of 1 mark.
- **Range top (§1.7):** one lucky clean cold take on a high item, opened freely (no locks), sets the top of the range. Require ≥ 2 clean on ≥ 2 days, or cap the range at the candidate tier + 1.
- **Breadth (§1.6):** the ≥ 2-keys condition is not in the §1.7 promotion test. Add it there explicitly. It also doesn't apply to keyless families.
- **Re-entry window:** "3 practice days … or until the first FSRS-good review". Say whichever comes first.
- **`lastSound` per cell (§1.4):** ItemState (types.ts:1080) has no cell id, and cells are derived (keyMatrix.ts). Define a cell key derivable from any take (family + level + key), including list runs, licks and key-session stages, or fall back to the item.
- **Provisional estimate (§1.9):** before 6 trials it reads "highest clean cold tempo", so one outlier can set the Momentum high-water. Pay Momentum only from the non-provisional estimate.
- **Rank semantics:** rank (statistically confirmed tier) will often lag passed items (`passedAt`) by weeks. Promotion-not-full-bars said "hardest items beaten". Have the owner acknowledge that "beaten" now means cold-confirmed at the tier, and let the path and matrix show passes so nothing looks lost.
- **Buildability:** the RatingEvent (rating.ts:42) and ItemState additions are purely additive, and the fresh-start epoch makes migration trivial. `playerTier` (tiers.ts:35) still reads the warm `cleanBpm`, so it is on the §1.5 guard list. No other state the code can't supply.

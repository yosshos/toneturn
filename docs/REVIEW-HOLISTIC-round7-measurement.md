# Round 7: measurement / adaptivity review (HOLISTIC-2 v8 + SP v6)

**Verdict: NOT CLEAN**

How I checked: I simulated §1.7 as written. Settings: a sliding window of the last 30 looks; Beta(1,1); promote at P(p≥0.7) ≥ t, checked after every look; breadth of ≥3 exercises and ≥2 keys; 2 looks a day, the second from another exercise, with a shared day effect; the demotion rule; the §9.1 default dependence (day SD 0.8, cell SD 0.7 on the logit scale), with true p taken as the average over the day and cell effects. The scripts are sim.py, placed.py and s2.py in the scratchpad.

| t (min clean of 30) | False promotion in 730 looks, true p = 0.55 | Median to promote at p = 0.75 |
|---|---|---|
| 0.975 (26), independent looks | 4.6 % | 79 looks = **40 practice days** |
| 0.975, with dependence | **16.6 %** | 68 looks = 34 days |
| 0.99 (27), with dependence | 5.2 % | 131 looks = 66 days (95 % ever promoted) |
| 0.995 (28), with dependence | 1.2 % | 248 looks = 124 days (84 % ever promoted) |

## Substantive issues

**1. §0 "Rank speed", §1.7, §1.10, §9.1: the approved speed and the false-promotion target can't both hold (blocker).**
- The 2-look cap allows at most 28–42 looks in 2–3 weeks. Even with independent looks, the median at p = 0.75 is about 79 looks, so the "about 2–3 weeks per tier" in §0 and §1.10 is impossible.
- With dependence, the threshold is the only knob, because the owner fixed the window at 30. Under 5 % false promotion means t ≈ 0.99–0.995. That is about 2–4 months per tier at p = 0.75, and 5–16 % of p = 0.75 learners are never promoted.
- A 30-look window covers only about 15 days, so the day effects never average out. An iid binomial posterior on overdispersed data is miscalibrated: the posterior is too narrow, which is why false promotion is 16.6 % at t = 0.975 instead of about 5 %.
- Why it matters: the harness gate in §17.4 is set up to fail, or to bring the owner a number far from what was approved.
- Fix:
  - Use a model that accounts for overdispersion: beta-binomial with a day-level random effect, or count days rather than looks.
  - Or let the harness also widen the window or the time span.
  - Take the trade-off back to the owner now, and remove "2–3 weeks" from §0 and §1.10 until the harness has run.

**2. §1.3 and §1.7: the placed state stalls, and there is no rank while placed (major).**
- While placed, the test runs only at `placedTier`. The demotion criterion barely fires for p between 0.55 and 0.7.
- The absence-of-evidence drop needs "no probe-band take" or "staircase estimate below 0.95 × target". A learner at p = 0.6–0.7 at target meets neither.
- In the simulation, after 90 days (180 looks) with dependence, 66 % (p = 0.6), 61 % (0.65) and 44 % (0.7) are still unresolved. These learners have no confirmed high-water mark, so rank is empty, even though they would confirm `placedTier`−1 easily.
- The same loop confirms 4.7 % of p = 0.55 learners within 90 days.
- Fix: while placed, also run the promotion test at every tier below `placedTier`. A confirmation there sets the high-water mark. Also time-box the placed state, for example drop one tier after 20 practice days without confirmation.

**3. §1.7: the 2-looks-per-area-per-day cap competes across tiers (major).**
- The cap is per area. Looks are counted "first eligible in time order", and the review block comes first (workout2).
- So probe-band FSRS reviews of passed cells at the high-water tier, or lower, use up both looks, and the candidate tier gets none. The "guaranteed supply" (§1.7, §5) is then empty in practice.
- Fix: apply the cap per area × tier (that is, per posterior). Count the guaranteed slots at the candidate tier.

**4. §1.7 window and §9.1: the estimand is undefined, and looks are selected by cell (major).**
- Looks come mostly from passed cells. Those are the learner's strongest cells, and with cell SD 0.7 that effect persists, so "p at the tier" is measured on a cell set selected by earlier success.
- The minimum breadth (3 exercises × 2 keys) lets a learner be promoted on the 3 easiest exercises of the tier.
- "true p ≤ 0.55" in §9.1 has no stated population, so the 5 % target can't be tested.
- Fix: define p as the average over the tier's available exercises (or over a stated sampling rule). Have need() draw at least one look in 3 from an exercise not yet in the window, or weight the posterior by exercise. Add a guard test for "3 easiest exercises".

**5. §18 ordering: the look supply depends on need(), which is built in step 6 (major).**
- Step 1 promises "the guaranteed look supply (through need, §5)", but §5 is step 6. Steps 1–5 would ship with no supply mechanism, so promotion stalls in areas the learner doesn't happen to play.
- Fix: put a minimal confirmation-slot injector in workout2/todayPlan in step 1, and fold it into need() in step 6.

**6. §1.7 breadth for areas without keys: "all of their exercises" (major).**
- Read literally, a tier with an unavailable exercise can never promote. Unavailable means "needs MIDI" on mic or acoustic kit, "teacher or recording needed" (§8.9), region-denied, or the small-hands variant.
- This contradicts §8.9's "never a gap in the bar to next".
- Fix: require min(available exercises, N), with unavailable ones excluded and N set (for example 4).

**7. §1.10 bar vs "nothing ever looks lost" (major, a guarantee conflict).**
- The bar is the raw posterior over a sliding window. It falls after misses, and also when old clean looks leave the window.
- At p = 0.75 it random-walks around 0.5–0.7 for weeks. That breaks "nothing ever looks lost" (§1.10) and the intent of promotion-not-full-bars.
- Fix: show the posterior's running maximum since the tier became the candidate, or a monotone transform, as display only. Promotion keeps the raw value.

## Minor notes
- **Midnight hole:** "later local day" (`established`, the SP §4.2 pass, the look per day) can be met about 1 h apart across midnight. Require ≥ 8 h, or a sleep gap, for the later-day rules.
- **Momentum "cold rise" ratchet:** it pays on the all-time maximum of a noisy MAP estimate, so it rewards noise as new records (they grow like log n). Require the rise to exceed about 1 posterior SD.
- **Probe takes on days a review isn't due:** "outside FSRS" should say whether these takes are graded into FSRS. Grading them would distort the intervals.
- **Candidate tier:** undefined if a learner confirms a tier above high-water+1 by manual practice. State whether the high-water mark can jump.
- **Starting state:** the initial high-water mark (T0 assumed confirmed?) for non-placed beginners isn't stated.
- **Voice sub-band:** pooling the cents sub-bands lets a learner collect looks at 60 ¢ only. Decide whether that is intended.
- **Stale cross-references:** SP §22 cites "HOLISTIC §19.8, §20", which no longer exist in v8.
- **Buildability:** the current code (RatingEvent, ItemState, playerTier, plateau.ts) has none of the new fields. All are additive, and the fresh-start epoch makes that fine.

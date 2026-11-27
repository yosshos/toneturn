# Round 9: measurement / adaptivity review (HOLISTIC v10 + SP v6)

**Verdict: NOT CLEAN.** I found 2 blockers and 2 majors. All four are fixable in a few lines each. Everything else is buildable as specified. None of `passedAt`, `lastSound`, `cellPass`, `rankHW`, `placedTier` or `exerciseIdOf` exists yet in src/, so all of it is new work. `itemPass` (ladder.ts:41), `familyLevel`, `playerTier` and `courseRating` (courseSocial.ts:125) are where the spec says.

## Substantive issues

**1. §1.7 rank × §1.3 entry: the rotation can deadlock (blocker).**
- **Problem:** Rank t needs min(3, available exercises at tiers ≥ t) passes at tiers ≥ t. But entry is rank + 1, so the rotation never offers anything above t + 1. Take an area where tier t+1 has only 1–2 available exercises and tiers above it have more. The required count is still 3. The missing pass(es) must come from tier t+2 or higher, which the rotation can't offer until rank reaches t+1.
- **Why it matters:** A rotation-only learner stalls for good. Manual play is the only way out. This is likely in thin areas: reading (exercise = generator × tier, so few per tier), transfer forms (one exercise per tier pass), fixed-tempo areas and keyless drum or voice areas. The §1.3 climb test would fail, but by construction.
- **Fix:** Count "available" only over what the planner can actually offer: min(3, available exercises in tiers t .. entry ceiling). Or let entry open tier t+2 once every available exercise at t+1 is passed. Add a guard test: a tier with 2 exercises and a rotation-only climb.

**2. §1.7 current-form window breadth can't be met (blocker).**
- **Problem:** The window needs ≥ 3 distinct exercises at the tier (or all of them if fewer). But only passed and established cells produce looks. Rank t can rest on a single pass at t, with the other two passes higher up. The tier may also hold many unpassed exercises.
- **Why it matters:** The window then fails breadth forever, so it makes no decision and a slump can never fire. Meanwhile the slot injector keeps "picking the missing exercise". That exercise is unpassed, so its takes feed only the staircase and never become looks. The result is a loop that spends slots and never fills the window.
- **Fix:** Measure breadth over the passed-and-established exercises at the tier: min(3, that count). Also say which tier those looks belong to. Either current form at t reads only cells at tier t, or it reads passed cells at tiers ≥ t, matching rank. The injector should target only passed cells.

**3. §1.6 / SP §4.2 passes allow optional stopping, and rank never falls (major).**
- **Problem:** Every pass rule lets the learner retry as often as they like:
  - **Technique and fixed-tempo pass:** 3 clean takes (warm takes allowed) plus any one clean cold take on a later day. A new cold take is available every hour, and "every cold take counts". The chance of at least one clean in k cold tries is 1 − (1 − p)^k. At p = 0.3 that is 0.66 for k = 3 and 0.88 for k = 6.
  - **Reading and transfer "3 of the last 5":** this is a sliding window with unlimited attempts. Simulated: at p = 0.4 the pass rate is 0.63 within 10 attempts and 0.89 within 20. At p = 0.3 it is 0.68 within 20. The spec's claim that "a lucky streak can't pass it" is false.
- **Why it matters:** Under H8 a pass is permanent rank. Learners well below the 0.7 criterion get promoted, and current form is the only thing that can show it afterwards.
- **Fix (keeps H8):**
  - Technique: the counting cold take must be the cell's **first cold take of that day**, the same eligibility already used for looks. A cold miss that day blocks the pass until another day.
  - Reading and transfer: replace the sliding window with a test over all cold attempts at the tier since the tier started. Use either a Bayesian test (P(p ≥ 0.6) ≥ 0.9 from Beta(1, 1)) or a Wald SPRT (p0 = 0.4 vs p1 = 0.75) on ≥ 2 days.
  - Have the harness report the false-pass rate at p = 0.4 and p = 0.5.

**4. §1.7 n_eff ignores cell clustering (major).**
- **Problem:** n_eff = n / (1 + (m − 1)ρ) corrects only for looks on the same day. But the window spans about 3 cells, and §9.1's own harness uses a cell SD of 0.7 logit. The quantity being estimated is the tier mean over cells. With 3 cells, most of its uncertainty comes from cell-to-cell differences, which this formula leaves out.
- **Why it matters:** The posterior is overconfident. A single hard cell can trigger slumps against learners whose true p is ≥ 0.75. The spec's own calibration and < 5 % wrong-demotion criteria in §9.1 then can't be met by the model it specifies.
- **Fix:** Add cell clustering to the design effect, n / (1 + (m_d − 1)ρ_d + (m_c − 1)ρ_c), or cap each cell's share of the window. Better still, use a two-level beta-binomial (cell within tier). Estimate ρ from pooled calibration traces with a stated default, not per learner.

## Minor notes
- **Window has no recency limit (§1.7).** As FSRS intervals grow, the last 30 looks at a tier can stretch over months, so old successes hide a current slump. Add a time limit, such as looks from the last 90 days, or recency weighting.
- **Wrong-demotion target has no horizon.** "< 5 %" means nothing for a rule tested after every look. State a horizon, for example per 90 days of practice.
- **Dead clause (§1.3).** The over-placement trigger "or on the posterior slump rule at `placedTier`" can never fire: while rank < `placedTier` there are no passed cells there, so no looks. Delete it, or say it uses probe takes.
- **Voice sub-bands (§1.7).** A 60 ¢ pass counts fully toward rank. A pass at a lowered teacher target counts only as coverage. If each item has one catalogue target band, a pass at a looser band should also be coverage only. Otherwise state that the band never affects rank.
- **Thresholds versus the definition.** Current form is defined at p* = 0.7, but re-promotion uses P(p ≥ 0.6) ≥ 0.9 and it is initialised from rank, which proves nothing about p. That is acceptable as hysteresis, but the §1.1 definition should say so.
- **Post-slump tier with no passed cells.** After a slump, current form can sit at a tier with no passed cells (placed learners, or skipped tiers). Then it is unmeasured, and only re-promotion at the tier above can move it. Show "unmeasured" in that case.
- **Cross-device merge.** A cold take downgraded to warm at merge time may already have produced a sticky `passedAt`. Decide whether that pass stands.
- **Momentum high-water.** The high-water on a recency-weighted MAP estimate can pay out on noise peaks as the posterior SD widens. Measure the false-payout rate in the Q6 test.
- **Catalogue target.** "Catalogue target" for rank needs one definition when SP §17.3's ±1 band step changes an item's entry band, and with it the A7 target.

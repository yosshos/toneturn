# Round 10: measurement, adaptivity and learning organisation (independent review)

**Verdict: NOT CLEAN.** There is 1 blocker and 6 majors. The rank rule (H8) itself is sound and hard to game. The problems sit in placement, entry across empty tiers, current-form mechanics, and the pass statistics.

## Substantive issues

**1. §1.3 over-placement correction demotes learners who are placed correctly. (Blocker)**
- **Problem:** the rule compares a learning-in-progress quantity with the final target. A new item starts at start = factor × the player's tempo, often about 0.7 × target (SP §14 item 35: ♩60→84). Before 6 trials the MAP threshold estimate stays near its prior, which §1.9 centres on the start tempo. Over 5 offered days, at about 1 cold trial per day, it is still provisional and still below 0.8 × target.
- **Why it matters:** a learner placed correctly at T5 loses one tier after about 5 offered days. The count restarts and the next drop follows the same way, so placement unwinds tier by tier. The 20-day slow path has the same flaw where one tier takes more than 20 offered days, and H8's own estimate is 1–3 weeks per tier.
- **Fix:** judge over-placement against the expected trajectory, not the target. Two options:
  - In tempo areas, compare the cold scale benchmark (`paceTier`) with the tier's benchmark.
  - Require a non-provisional estimate, below the start tempo or with a G projection that misses the target within N weeks.
- Add a harness case: a learner placed correctly is never corrected.

**2. §1.3 entry ceiling stalls at two consecutive empty tiers. (Major)**
- **Problem:** entry reaches at most base + 2, and the +2 step opens only after every exercise at +1 is passed (vacuously true when +1 is empty). With two empty tiers above the base, the rotation can never offer the next content.
- **Why it matters:** this is likely, because rank and `placedTier` are per area. Jazz rungs sit at `min` 5–6 (keyIndex.ts: g-harris, g-tpair, k-tpair, b-barry). An area with no level-test section starts at `placedTier` T0, so content at T3 or above in it is unreachable on rotation alone. The T0→T5 climb test would not catch this if it runs on one area.
- **Fix:** count +1 and +2 over non-empty tiers (skip empty tiers when computing the ceiling). Add a guard test per area on the real catalogue.

**3. §1.7 slump size, evaluation tier and nested windows are undefined, so slumps cascade. (Major)**
- **Problem:** the text says "current form drops" but not by how much. The window at tier t reads looks from all passed cells at tiers ≥ t, so the windows at t and t − 1 often hold identical data. Example: a placed learner whose only passed cells are T5. A slump at 5 re-evaluates at 4 on the same looks, slumps again, and so on down to T0.
- **Re-promotion** then cascades back up on the same "looks since the slump". Current form becomes effectively binary.
- **Also unclear:** whether "unmeasured" means no passed cells at t itself or at tiers ≥ t.
- **Fix:**
  - A slump drops exactly one tier.
  - After any drop or rise, the next decision at the new tier needs ≥ 8 fresh looks on ≥ 2 days.
  - "Unmeasured" = no passed cell at tiers ≥ t.

**4. §1.3 and §16a: current form while placed is undefined in most areas. (Major)**
- **Problem:** "min(tier from threshold estimates, placedTier)" has two gaps:
  - Threshold estimates exist only for laddered tempo items (§1.9: fixed-tempo items have no staircase). Harmony, voicing, reading, voice, rhythm and drum grooves have none.
  - No rule maps a set of per-item threshold tempos to a tier.
- **Why it matters:** §5's distance term reads current form, so the planner has no input for placed learners in these areas.
- **Fix:** define the tier mapping, for example the highest tier where ≥ min(3, offered) exercises have a non-provisional estimate ≥ 0.95 × target. Use `placedTier` as current form in non-laddered areas until they have passed cells.

**5. §1.6 reading and transfer Bayesian pass misses its own < 10 % target and stalls learners who improve. (Major)**
- I simulated the rule as specced: Beta(1, 1), P(p ≥ 0.6) ≥ 0.9, ≥ 5 attempts on ≥ 2 days, checked after every attempt, over 90 days.

  | Day SD (logit) | Attempts per day | False-pass rate at p = 0.5 |
  |---|---|---|
  | 0 | 3–8 | 7–9 % |
  | 0.8 (the harness default) | 3 | 14 % |
  | 0.8 | 8 | 18 % |

- Unlike the posterior, this test has no n_eff correction.
- **Cumulative history:** "all attempts since the tier started" also delays honest passes. A learner who improves from 0.3 to 0.85 over 40 days passes at a median of day 56 under the cumulative rule, against day 23 with a window of the last 20 attempts.
- **Fix:**
  - Apply the §1.7 day-clustering n_eff here.
  - Raise the floor (for example ≥ 8 attempts on ≥ 3 days) or the threshold to 0.95.
  - Use a recency window instead of "since the tier started".
  - The harness reports both the false-pass rate and the time to pass for an improving learner.

**6. §1.6 technique, voice and rhythm item pass: retries across days are unbounded, and rank never falls. (Major)**
- **Problem:** "first cold take of the day" closes farming within a day only. The pass needs a single clean first-cold take on any later day, plus 3 clean takes that may be warm. The chance of passing within 14 days is 1 − (1 − p)^13:

  | Cold clean rate p | P(pass within 14 days) |
  |---|---|
  | 0.2 | 94 % |
  | 0.3 | 99 % |

- **Why it matters:** three such passes give a permanent rank. The spec holds reading and transfer to a Bayesian standard but leaves this unmeasured: §9.1 reports no technique false-pass rate.
- **Fix:**
  - Minimum: §9.1 reports P(pass | p_cold) for technique, voice and rhythm, and the owner sees it.
  - Better: require 2 clean first-cold takes on distinct later days, or no cold miss between them.

**7. §1.4 cell identity and session ordering can block passes and looks. (Major)**
- **Problem:** the cell key adds "(+ hand group)", which is undefined. If RH, LH and HT are separate cells, warm-up laundering reopens, contrary to §1.4's own intent. If they share one cell, an SP A4 LH visit, a lead-in or a list-run RH take played before the HT cold check becomes "the cell's first cold take of the day". The HT item then can't pass or confirm that day.
- §1.4 fixes this ordering only for the key session, not for the rotation or list runs.
- **Fix:**
  - Define the hand group, or drop it from the key.
  - Make "first cold take of the day" refer to the cell's main item.
  - Require every planner and the rotation to play the main item's cold check before any other sounding take of the cell.

## Minor notes
- **§1.7 voice:** "a pass counts toward rank only at the cents band its tier requires" should read "at that band or tighter".
- **§1.7 rank is circular:** rank reads the entry ceiling, which reads rank. State that the ceiling is computed from the stored `rankHW` or `placedTier`.
- **§1.7 slump "≥ 8 looks":** say whether this is the raw n or n_eff.
- **§1.7 window breadth:** "at the tier" vs "tiers ≥ t" is mixed. §16a should say "≥ t".
- **§1.6 transfer:** say whether one tier pass of a transfer family counts as one exercise per family or per area, and how its keys enter rank's key breadth.
- **§1.12:** after a change of input, current form has no looks on the new series. State whether it starts from rank or as "unmeasured".
- **Buildability:** none of SP step 1 exists yet (`passedAt`, `lastQual` and `cold` are absent; `RatingEvent` has no `item`, `src` or `cold`). That is consistent with the plan, but the step is large, so build issues 1–7 into the harness first.

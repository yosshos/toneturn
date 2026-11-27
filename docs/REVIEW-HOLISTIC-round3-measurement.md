# Round 3 measurement review: SPEC-HOLISTIC-2 v3 + SPEC-SPIRAL-PRACTICE v6

**NOT CLEAN**

## Substantive issues

### 1. The SPRT has no restart policy, and the <5 % target can't be met as stated (HOL §18.3, §9.1). Blocker
**Problem.** Wald SPRT with p0 0.5, p1 0.85, α 0.05, β 0.2. Clean adds +0.53 and a miss −1.20; the bounds are +2.77 and −1.56. So two early misses accept H0 almost at once. The spec never says what happens next: does the test restart, slide, or stop? I simulated it (20k runs per row):

| true p | promoted, one run | promoted within 5 restarts |
|---|---|---|
| 0.50 | 4 % | 18 % |
| 0.60 | 15 % | 57 % |
| 0.65 | 27 % | 80 % |
| 0.70 (= p*) | 42 % | 94 % |

**Why it matters.** Restarting forever means a learner at p = 0.6 is eventually promoted almost surely. Also, "< 5 % wrong promotions" can't hold for learners just below p* = 0.7 under any finite test. The harness has no criterion it can actually pass.

**Fix.**
- Define false promotion over an indifference zone, for example "< 5 % for p ≤ 0.55, averaged over the passed-item prior", and say it out loud.
- Make the test cumulative with memory, not restarted. One option: a log-likelihood ratio over a sliding window of the last N cold confirmations (N about 12), floored at the lower bound instead of reset. Then tune it in the harness against a lifetime horizon (for example 6 months of looks), not a single run.
- State that §18.3 replaces B2's "last ≤ 6" window. With that window, one miss makes promotion impossible: after a miss you need 8 cleans.

### 2. The confirmation set is selected on success (HOL §17.1 B2, §18.3). Major
**Problem.** Tier evidence counts only items that have `passedAt`. Passing needs a clean cold take (SP §4.2), so every passed item brings at least one guaranteed clean confirmation. Cold misses on items at that tier that never passed are left out. This is survivorship bias: a learner who tries 10 T4 items and luck-passes 3 starts the SPRT with 3 free cleans.

**Why it matters.** False promotion rises in exactly the region where issue 1 is already weak.

**Fix.** Count every cold take at ≥ 0.95 × target on any item of that content tier, passed or not. Or exclude each item's passing take from the confirmations. Model whichever you choose in the harness.

### 3. The entry gate stalls at band edges, and its units don't match (SP §14, §15.5; HOL §17.2 M2, §18.2). Blocker
**Problem.**
- To be promoted to tier T+1, the learner needs passed items at T+1 (issue 2's rule).
- But the rotation only draws items whose band ≤ the area tier, and SP bands span two tiers (band 2 = T2–3, band 3 = T4–5).
- A learner confirmed at T1 or T3 is never served the next band's items, so they can never collect evidence for it. The beginner case is the worst: band 1 holds only items 1, 3, 17, 27 and 30. Non-anchor scale items stop at their band's target (HOL §18.1).
- Entry also compares a band number with a tier.
- §18.2 sends SP §15.5 entry to `areaTier.band`, which is "the take's own nps tier capped by the learner's confirmed band". That is a per-take tempo value, and "confirmed band" is defined nowhere.
- So a harmony item (item 6, 10) would be gated by tempo, which contradicts SP A8 (harmony is measured by rungs passed).

The current code has the same shape (`keyIndex.ts:688`, `t >= r.min`), but today `t` is a warm `playerTier`, so the stall is new with cold content levels.

**Why it matters.** Hands-free learners plateau for structural reasons. The plateau escalation (HOL §6.2) then fires on a stall the app itself caused.

**Fix.**
- Gate entry on content: item entry tier ≤ `areaTier.content + 1` (the candidate tier), keeping prerequisites.
- Define "confirmed band" as the tempo tier of the area's confirmed scale benchmark, used only for timing tolerances, the beginner definition and stretch.
- Add a harness test: a simulated learner who improves steadily climbs from T0 to T5 on rotation alone.

### 4. The reversal-mean threshold freezes for improving learners (HOL §18.1). Major
**Problem.** G, R, the plateau slope and Momentum's "cold rise" all read "the mean of the last 4 reversals".
- A learner who keeps improving produces up-steps and few reversals, so the estimate stays at old reversals.
- HOL §6.2 needs ≥ 6 cold points over ≥ 10 days with slope ≈ 0. A frozen estimate reads as a plateau, so the escalation fires on learners who are progressing.
- G reads ≈ 0, and SP §17.3 applies a slow-down at once.
- Cold takes are about one per item per day, so 4 reversals take weeks. Nothing says what the readers use before that.
- The pass-probe branch (tempo = max(staircase, 0.95 × target)) plays tempos the staircase didn't choose. The spec never says whether those results move the staircase from its own position or from the tempo actually played. That breaks the reversal bookkeeping.
- Starting at the normal start (well below threshold) biases the first reversals low, and those aren't discarded.

**Fix.**
- For estimation, fit a logistic or ML threshold over all recent cold trials with their actual tempos. Keep the staircase only for choosing the tempo.
- Or: use the staircase position for the slope, discard the first 2 reversals, and give a fallback before 4 reversals exist.
- After a probe take, reset the staircase to the tempo played.

### 5. One cold window can't serve both the FSRS probe and the above-target staircase (HOL §17.1 B4 vs §18.1). Major
**Problem.**
- B4 says a passed item "keeps a cold staircase above its target through maintenance reviews".
- §18.1 says FSRS grades only the take at ≤ target (0.95–1.0 × target), and a miss above target is censored.
- A passed anchor's cold take is played at its staircase tempo (up to 1.25 × target). That take uses up the cold window, so an anchor never produces a gradable maintenance take. It never lapses, and `cellDue` (HOL §17.3) replays nothing gradable.

**Fix.** On FSRS-due days the cold take is the review probe at 0.95–1.0 × target. The staircase take is the next cold take on another day. Its result counts as a confirmation only when clean. Write this into §18.1 and delete B4's sentence.

### 6. Demotion conflicts with "rank = hardest items beaten", and a break can still drop the level (HOL §17.2 M1, §18.3, §18.6, §5). Major
**Problem.**
- Rank = the content level of the 2nd-best area, and that level can drop through §18.3 demotion. Items stay passed, so rank can fall while the hardest items beaten stay the same. That breaks the stated guarantee.
- After a break of ≥ 7 days, the re-entry session (HOL §5) runs cold checks only. Those checks measure the break decrement, so a 3-week break followed by 2–3 days of misses meets the demotion rule. In practice that is "a drop from a break".

**Fix.**
- Make rank, course DYN and friend level read a sticky high-water confirmed tier. §18.7 already keeps a high-water mark for XP.
- Show the current cold level as a separate "current form" value that can show refresh.
- Exclude cold takes from demotion counts during a re-entry window: the first 3 practice days after a break of ≥ 7 days, or until the first FSRS-good review. Those takes still mark "refresh".

### 7. Areas without `passedAt` have no Phase A evidence (HOL §1.1, §17.1 B2, §18.6, §18.8). Major
**Problem.**
- Phase A's evidence is "items with `passedAt` (SP §4.2)". SP §4.2 covers technique drill families only.
- That leaves voice (pitch, time, range, harmony), rhythm and reading (an area on every instrument per §18.6) without a level rule.
- Reading items are generated fresh by rule ("no memorizable items"), so per-item `passedAt` can't exist for them.
- `VoiceItemState` and `RhythmItemState`, named in §18.8, don't exist anywhere in `src/`. The voice course level comes from the Elo area today (`courseSocial.ts:125–136`), which §18.8 stops anything from reading for level.
- "Games: low-weight evidence" has no place in a count-based rule.

**Fix.** Give each non-technique area its evidence unit:
- reading: cold sight takes per complexity tier;
- voice and rhythm: item-level × band cells with a sticky pass;
- games: one sentence (excluded from Phase A, or counted as half a confirmation).

Specify the new stores, their sync and the fresh-start epoch.

### 8. Two meanings of "acquired" (SP §1, §14, §15.5; HOL §17.3, §18.8). Major
**Problem.**
- SP's "acquired" = 2 clean pulsed takes, in-session (warm). It gates prerequisites, entry and HOL's need readiness gate.
- HOL §17.3 says a path ✓ needs a later-day cold confirmation before the strengthen pool treats it as acquired.
- So prerequisite gating still treats in-session performance as learning, while the pool uses cold.

**Fix.** Name them separately:
- `acquired` (warm, D1) is for moving from blocked to rotation;
- `established` (cold, later day) is for prerequisites, readiness and the strengthen pool.

## Minor notes
- SP §17.3's R-driven "cold-check tempo, 0.9 × best term" row now has nothing to act on. HOL §18.1 replaced the key-session check, and §21 already removed it from the old coach. Delete the row. R could instead drive the staircase step.
- SP §4.1 says non-qualifying takes don't touch `lastQual`. SP §3 says coordination takes "do not close the 1-hour gap". HOL §18.7 resets the gap on any sounding take of the item or its cell. The code needs a second per-cell timestamp (`lastSound`). Amend SP §4.1 and §3 explicitly.
- The input rule exists in three versions: HOL §1.7 (best series), M7 (current series) and §18.7 ("the stricter calibrated input"). "Stricter calibrated" is undefined. Pick one.
- Voice cold is per session in HOL §1.2 ("first 3 sung items") but a per-item store in §18.8. Align them, or defer both to one definition.
- Warm-up via neighbouring cells (a form or contrary motion, then the anchor cold) is still possible. Log `sessionMs` and use it as a Phase B covariate. Consider counting only the first cold take in a session toward level.
- The guarantees hold as written for passed-stays-passed, hands-free (with the opt-in §7 tap) and no locks. The Ear decay deferral is explicit and acceptable.
- HOL §1.1's technique row ("tierBounds × band") and §5's product formula survive as stale text under §17/§18. Mark them superseded.

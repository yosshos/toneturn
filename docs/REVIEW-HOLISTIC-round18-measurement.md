# Round 18: measurement / adaptivity review of SPEC-HOLISTIC-2 v14

**Verdict: NOT CLEAN**

`npx vitest run tests/measureSim.test.ts` passes (61 passed, plus 1 expected fail: the ρ_c 0.20 calibration test, which is meant to fail). I re-ran four §9.1 rows with the report seeds and got the same numbers:
- stationary learners: 2.0 / 2.0 / 14.2 % without item gain, 11.6 / 11.1 / 22.4 % with it;
- H10 flat-rank slope on the synthetic area: 0.88;
- N1 at +2 over-placement: 82.0 %.

The harness matches the §1.6 item pass, the §1.7 rank steps 1–6, the entry ceiling, N1, the current-form posterior and the bass 3-area mapping, apart from the minor notes at the end.

Three problems remain:
- The tier guard deadlocks in areas without keys.
- A learner who picks which days to play cold inflates rank, and nothing stops it.
- The H10 readiness rule ratchets on noise.

The harness never tests these situations. The headline honesty number is also stated per rise, which hides a per-learner rate 3–4 times higher.

Scratch scripts for every number below are in the session scratchpad (`e1.ts` to `e8.ts`, plus `simManip.ts`, a patched copy of simulate.ts). No app code was changed.

## Substantive issues

**1. The tier guard deadlocks in areas without keys, and in exercises with few keys (blocker).**
- **Spec:** §1.7 step 6 (lines 196–201) reads counting checks of working cells only. The fresh-check re-offer and the guard reserve (lines 211–212) supply fresh cells only "in a new key".
- **Code:** the harness re-offers only `e.keys > 0` (simulate.ts:548, :566).

In a keyless area (rhythm, voice, drum rudiments, keyless fixed-tempo tiers) each exercise is one cell. Once a tier's exercises are passed, its guard record is frozen forever. An improving learner's record holds the misses from before they could play the tier, so the guard can never clear: this is the round 17 stall with no way out.

Rotation-only climbs, steady learner, 365 days, v14 defaults (`e2.ts`):

| catalogue | reach the top tier | stalls ≥ 42 days |
|---|---|---|
| keyless, 3 exercises per tier (default) | 0 / 20 | 20 / 20 (median longest stall 324 days) |
| keyless, 2 exercises per tier (default) | 0 / 20 | 20 / 20 |
| keyless, real-ish counts (default) | 0 / 20 | 20 / 20 |
| the same three, ungated H8 | 20 / 20 | 0 / 20 |

One run (`e3.ts`): T1 has 27 checks, 15 clean, all 3 exercises passed, guard false. Rank skips T1 and T3 and stalls at T2.

The harness hides the same problem for 1-key exercises. When an exercise has no free key left, simulate.ts:581 reuses a key and creates a second cell for the same exercise × key, with a fresh tracker. The app cannot do this: the cell key is family + level + key. So the "1-key, 3 exercises per tier" climb passes (20 / 20) only because of this artefact. The same artefact affects any 12-key exercise whose keys run out.

No test uses a keyless or few-key catalogue: realCatalogue.ts:36 gives every rung 12 keys, and drums, voice and rhythm are not scored.

**Fix:**
- Where a tier has no fresh cell left to offer (keyless, or all keys used), the guard also reads the probe-band cold takes of that tier's passed cells (confirmation looks and FSRS reviews).
- I tested this candidate fix (`e8.ts`, 30 learners per row):

  | catalogue | climbs reach T6 | stalls ≥ 42 days | stationary false rises, p 0.5 / 0.75 |
  |---|---|---|---|
  | keyless, guard as in v14 | 0 % | 30 / 30 | 0 % / 7 % of learners |
  | keyless, with the fix | 100 % | 4 / 30 | 0 % / 7 % of learners (unchanged) |
  | keyed, with the fix applied everywhere | — | — | 10 % / 3 % of learners (3 % / 0 % without it) |

  The keyed row shows the cost of applying it everywhere, so restrict it to tiers with no fresh cell left.
- Remove the key reuse from the harness.
- Add keyless and 1-key catalogues to the §9.1 climb and stationary tests and to the guard tests.

**2. A learner can choose the day for cold checks and inflate rank permanently (major).**
§1.7 line 288 logs skipped due checks, but "the rules do not read it". The harness's learners never skip.

I modelled a learner who warms the cell up first on below-average days (day effect < 0). On those days the cell gives no cold take; on other days they play cold as usual. Stationary learners, 365 days, same seeds (`e5.ts`, 40 per row):

| learner | tier p at T2 | final rank median / p90 | learners with a false rise |
|---|---|---|---|
| honest | 0.5 | T2 / T2 | 5 % |
| day-picker | 0.5 | T2 / T3 | 33 % |
| honest | 0.75 | T3 / T3 | 5 % |
| day-picker | 0.75 | T4 / T4 (tier p 0.30) | 53 % |

Rank never falls, so these ranks stay. This is a path by which warm play raises rank (question 4).

**Fix:**
- A practice day on which a working cell at the probe band was sounded but gave no cold check enters the guard record (and the V1 share) as a miss.
- Alternatively, rank's guard requires a skip share ≤ 20 % at the tier.
- Add the day-picker learner to §9.1 with a target.

**3. H10 readiness ratchets on one lucky take, so a learner who stops improving is served hopeless items forever (major, adaptivity).**
- **The rule:** a "ready cell" (§1.7a line 303) includes `established`, which is one clean counting check ever (itemPass.ts:103). Readiness is sticky, and readiness entry and the content edge rise on it. The no-easier rule then holds the target there.
- **Result:** a learner whose ability is fixed ratchets up to the +2 cap on noise.

Last 90 of 365 days, 30 learners each (`e4.ts`, `e4b.ts`):

| area | tier p at T2 | rank | content edge | offered tier | fresh-cell cold p of new / strengthen items |
|---|---|---|---|---|---|
| fixed-tempo | 0.5 (θ 2.0) | 1.5 | 3.5 | 3.2 | 0.20, below 0.3 on 100 % of days |
| fixed-tempo | 0.75 (θ 3.1) | 2.75 | 5.4 | 4.9 | 0.13 |
| tempo | 0.5 | 2.0 | 3.8 | 3.6 | ≈ 0.45, but only by playing items 1.6–2 tiers above θ at about 0.6 × target, which never reach the probe band |

The H10 metric is measured only on improving learners in tempo areas. On a fixed-tempo area the required flat-rank slope is **0.61 < 0.7** (`e6.ts`, report seeds); §9.1 does not report it.

**Fix:**
- Make readiness evidence-based: a cell is ready when it is passed, or has a non-provisional threshold ≥ 0.95, or (fixed-tempo) has ≥ 2 clean of its last 3 counting checks.
- Let the challenge point fall back when the offered cold p of new / strengthen items stays below about 0.3 over 2 weeks. This is an exemption like re-entry, and it keeps H10's "never easier" for learners who are progressing.
- Add a stationary-learner overshoot metric, and the H10 slope on a fixed-tempo area, to §9.1.

**4. §9.1 states stationary honesty per rise, not per learner, and the guard's 80 % is not a confidence level (major, honesty).**
`stationaryHonesty` divides false rises by all rises (metrics.ts:549–559). The honest early rises to T0, T1 and T2 dilute it, about 3.5 rises per learner.

Per learner, same seeds, 100 learners per row (`e1.ts`):

| item gain | tier p at T2 | per rise (§9.1) | learners whose final rank sits at tier p < 0.5 |
|---|---|---|---|
| 0 | 0.5 | 2.0 % | 5 % |
| 0 | 0.75 | 2.0 % | 7 % |
| 0 | 0.85 | 14.2 % | 57 % |
| 0.3 / 10 takes | 0.5 | 11.6 % | 35 % |
| 0.3 / 10 takes | 0.75 | 11.1 % | 43 % |
| 0.3 / 10 takes | 0.85 | 22.4 % | 100 % |

The owner's 2026-11-28 acceptance of "11.1–11.6 %" (§17.4 line 1119) was given on the per-rise number.

The guard is also re-evaluated after every session, and rank keeps its high-water. So "P(p ≥ 0.5) ≥ 0.8" is a repeated test. Its real bar is lower than the 0.8 suggests, which is why the p 0.85 learner reaches T4 at p 0.44.

**Fix:**
- State the target and the results per learner ("share of learners whose permanent rank sits at tier p < 0.5").
- Show the owner the per-learner item-gain figures. This is not re-arguing decision (1); the owner saw only half of the number.
- Describe the guard as a repeated check, not as 80 % confidence.

**5. The estimand of rank is stated "at target", but the guard tests the probe band (moderate).**
§9.1 line 777 says tier p is "at target". The counting checks are played at 0.95–1.0 × target. §9.1 line 797 then explains away the p 0.85 row as "a boundary of the truth's tempo".

**Fix:** state in §1.1 / §1.7 that rank certifies p ≥ about 0.5 at the probe band (≥ 0.95 × target), and score honesty against that truth. Or play counting checks at target.

**6. Rules a builder cannot implement without guessing (moderate; question 5).**
- **Shelving.** The spec never defines when a working cell is "set aside". The guard (line 197) and every harness number depend on it (`maxVisitsPerCell` 12, simulate.ts:667). It also does not say whether a re-offered cell keeps its tracker: in the app it must, because the cell key is fixed. Define it.
- **Inputs.** It is not stated whether the item pass and the guard record split by input. §1.12 says "a cold series never mixes inputs", but the cell key has no input, and rank is not split by input. State which. The §9.1 per-input jitter test (line 788) is listed as a pass criterion but is not modelled (line 776). Implement it, or move it out of step 1's done-condition.
- **Teacher targets.** Under a lowered teacher target, which target's probe band defines a counting check for the guard and for the rank-counting pass? Line 219 covers only the pass. State: always the catalogue target. Add a test that checks at a teacher target never enter the guard.
- **Voice.** A voice cell = item level × cents band. Do checks at a looser band than the tier requires enter the guard? Presumably not; state it.
- **Reading and transfer.** These areas have no counting cold checks, so step 6 has no defined record for them. Say whether the reading / transfer pass test replaces the guard, or which attempts it reads.
- **Cross-device downgrade.** A check downgraded to warm at merge should also leave the guard record (§1.4 line 123 revokes only passes).

## Round 17: is each issue closed?

| R17 | Status |
|---|---|
| #1 plateaued learner | Closed for keyed areas with honest learners (the guard). Open for keyless areas (issue 1), for the day-picker (issue 2) and in how the number is stated (issue 4). |
| #2 H10 undefined | Defined and implemented. Its readiness half ratchets on noise and fails the metric on fixed-tempo areas (issue 3). |
| #3 supply | Closed. The shared cap is modelled. The review volume per area (2 per session per area) is not in the spec (minor note); the no-review rows also pass, so this is not a blocker. |
| #4 calibration | Closed. The estimand is stated, and over-coverage is a stated decision (H12). |
| minors | Union of keys, the "current tier" wording, N1 over all cells, the item-gain re-check: closed. The skip log: added but inert (issue 2). |

## Minor notes
- **Guard reserve trigger.** The spec (line 212) reserves when the guard fails "at the lowest tier above rank that holds a pass". The code (simulate.ts:532) takes the lowest tier that holds a pass *and* fails. Both reserve and re-offer test the guard at (t, t) and ignore `lo` when R is grouped downward (simulate.ts:532, :563). Align one to the other.
- **Readiness wording.** "≥ min(2, its available exercises)" (§1.7a line 307): "its" reads as the next tier, while the code uses the highest entered tier (simulate.ts:378). Reword.
- **Content edge.** The code does not cap it at the entered top (simulate.ts:391), so after a placedTier drop it can sit above entry. The spec says "highest entered tier".
- **Review probes.** The spec's "at most the workout2 review quota per session" does not say per area. The harness gives 2 per area per session (simulate.ts:475), and these give 86–93 % of looks. State the per-area allowance.
- **Re-entry window.** The spec ends it per item (first FSRS-good review); the harness uses 3 practice days for all items. This only affects current form.
- **`offerNewKeys`.** It is ignored when the guard is on (simulate.ts:554–566).
- **bass/walking placement.** The area is a tempo area for placement, but it has no "scale benchmark". Say what its `paceTier` is.
- **Learner who uses only one key.** They can never rank (step 4). That is correct, but the UI and the bar to next should say why.
- **Long breaks.** A pending pair and the V1 share window have no maximum age: two checks months apart can complete a pass. Forgetting is not modelled. Consider a 60-day age limit on a pending pair.

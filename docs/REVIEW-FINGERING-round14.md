# Review: SPEC-FINGERING v14, round 14 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

R13-1 and all six round-13 minor notes are fixed. R13-2 and R13-3 are fixed in substance, but each fix leaves an edge that breaks its own guarantee. A fourth gap is new: a limited A-6. All four are local, one-paragraph fixes. None needs research or an owner decision.
- **R14-1.** The closing's recovery take is floored at the comfort pulse. On most days the comfort pulse is the day's lowest straight tempo, because visit 0's ordinary A-6 starts there. The recovery then repeats it, so "unplayed by construction" is false.
- **R14-2.** The spec does not say what a held cell does when A-6 hit a KS2 limit today on a below-cap day. The code's limited review repeats `lastGood`, which breaks G12. The spec's below-cap climb would instead play above a limit the player has just shown.
- **R14-3.** G12 asserts that no closing A-6 take repeats a tempo played earlier that day. Attempts are closing A-6 takes, and they legitimately repeat the in-band cold check's mark, or an earlier session's attempt. If a builder enforces the assertion, `preTop` cells get k = 0 and can never pass.
- **R14-4.** In the old coach and list runs, attempt 2 is "the next playable tempo below". On their integer grid that is attempt 1 − 1 ♩, a near-repeat. The rule also contradicts its own worked example (108).

**What I checked:**
- The spec v14 in full, the v13 → v14 diff, round 13 and §20.
- `keyCoach.ts`: `gradedUp` 174, `closingMs` 232, `setPulse` 261–278, `enter` 315 (the start at `comfortOf`), `openVisit` and the closing 388–448 (the limited `review(a6, lastGood)` branch at 434), `canTrip` 621, the speed path 1010–1110 (the flip at 1048, the step-back to `ks.good`, `limit`), `closingDue` 1166 and the exits 1174.
- `coach.ts`: `tempoOf` 353–360 (`Math.round`, integer grid) and `climbFrom` (a 2 ♩ minimum step).
- `Drills.tsx`: `bpmOf` 1651, `done()` 1748–1808 (kind, `slower`, `hfMiss`, `lad.next`, `setBpm`).
- `ladder.ts`: `applyTake` 125–165 (the `passLog` gate at 143).

## Round 13: status

| R13 | Status in v14 |
|---|---|
| R13-1 the climb repeated played tempi | **Fixed.** There is one step function for the start and each later take: the lowest mark in the speed path's note value, above `prev`, ∉ `fgDay.played` (in nps), ≤ the cap, set with `noCap`. It replaces `gradedUp` for held closings. I checked the worked examples against MAELZEL: eighths ♩152 = 5.07 nps, then triplet ♩104 = 5.2 (played), then ♩108. G12 has both cases. |
| R13-2 attempt 2 snapped below the band | **Fixed for the key session**: tempi are chosen as marks, and `snapDown(bpm + 0.5)` keeps an exact mark. k = 1 is modelled in the delay text and in G3. **The old-coach and list-run grid is ambiguous** (R14-4). The dependencies on the in-flight fixes are in §17 F6. |
| R13-3 a miss ended the climb | **Fixed in rule:** a recovery take, "almost" once, then window → A-7 → end. **Its floor breaks the no-repeat claim** (R14-1). |
| Minor 1 (window time in short sessions) | Fixed: `closingDue` adds the window's `budgetMs`. G12 has a 5-minute case. |
| Minor 2 (take sets) | Fixed: capped plain takes for "highest" and "reached"; all straight takes for "played". |
| Minor 3, 4 (G12 wording) | Fixed: the cell's last item in the queue; "no clean cap take is followed by another take at the cap". |
| Minor 5 (G1 vs G16(a)) | Fixed: G1 compares passes distributionally and reports the excess. |
| Minor 6 (yield before the first take) | Fixed. |

**Answers to the brief:**
- **G1 and G16:** both are satisfiable as now worded.
- **G24 holds.** The `done()` top branch still bypasses everything §9.8 lists, and attempts pass `slower: false`.
- **G4 holds** inside visits and blocks.
- **G3:**
  - It is fine for the key session.
  - Its k for the old coach depends on R14-4. Read literally, k is always 2 there, with a 1 ♩ gap.
  - Under R14-3, a literal build drives k to 0 for `preTop` cells.
- **G12 can fail** on three paths: R14-1, R14-2, and its own attempt clause (R14-3).
- **Fingering-take leaks:** none found.
- **Legitimate data lost:** only if R14-3 is built literally. Then `preTop` cells' attempts are suppressed and their warm half never completes.
- **Consistency:**
  - H2 v16, SP §21, KS2 (its amendment text matches §9.2.2) and IS R3–R5 are unchanged and consistent.
  - The R14-2 fix needs one more line in the KS2 amendment.
- **Buildable without guessing:** yes, apart from R14-2 (which branch runs) and R14-4 (which grid step).

---

## Substantive issues

### R14-1. The recovery take's comfort-pulse floor can repeat a played tempo

**Evidence.**
- §9.2.2 (line 474) defines the recovery take as "one mark below the lowest straight tempo of the cell today (floor the comfort pulse), which is unplayed by construction".
- On a day without a fingering visit, a held cell's visit 0 is the ordinary A-6 climb. §7.1 forces this on at least every third visit.
- That climb starts at `comfortOf` (`enter`, keyCoach 342–344, `setPulse(at?.nps ?? comfort)`). So the day's lowest straight tempo is usually the comfort pulse itself, unless a step-back went lower. `setComfort(…, struggle)` lowers `ks.comfort` to a tempo that was also played.
- One mark below the comfort pulse, floored at the comfort pulse, is the comfort pulse. That is a repeat, and G12's assertion fails.
- §5.5's in-visit version has the same flaw: "a second miss goes down again, floor the comfort pulse".
- The rule also does not say which note value "one mark below" is in, when the lowest tempo was played in triplets.

**Fix (§9.2.2, §5.5, KS2 amendment, G12).**
- **The recovery take:** the highest mark, in the take's note value, whose nps is below the lowest straight nps of the cell today (for §5.5, of the visit), is ∉ `fgDay.played`, and is ≥ the comfort pulse's nps.
- If no mark qualifies, there is no recovery take: the climb ends (window, else A-7, else the end). The same applies to the second miss.
- **G12:** add a case in which visit 0 started at the comfort pulse, then the first closing take misses. Assert that the next take is unplayed, or that there is none.

### R14-2. A held A-6 that hit a KS2 limit today: the closing branch is unspecified

**Evidence.**
- On a held cell, the ordinary visit-0 climb (not a fingering visit) keeps KS2's limit logic. Only cap hits and missed attempts are exempt (§9.2.2 "A cap hit is not a limit", §9.2.3).
- Two misses at a new step lead to the back-step, and a clean take there leads to `limit()` (keyCoach ≈ 1090–1105). So `ks.limited` gets A-6 below the cap.
- In the closing, `openVisit` (434) then runs `review(a6, lastGood)`: two warm takes at `lastGood`. Both repeat a played tempo, so G12 fails.
- The spec's below-cap rule says nothing about `limited`. Line 472 even lists "the limited review" as a consumer of `lastGood`, which implies it still runs.
- The alternative reading, the below-cap climb, starts above the highest clean tempo. That is above a limit the player has just shown, and it contradicts KS2 #8: "a stage at its limit comes back only as a short review".

**Fix (§9.2.2, KS2 amendment, G12).**
- State it: **a held cell whose A-6 is in `ks.limited` today skips A-6 in the closing, like a cap day.** The closing plays the window if allowed, else A-7, else the end with the summary.
- Alternative: a short review at unplayed marks below the limit. Skipping is simpler, and it keeps the window.
- **G12:** add the case.

### R14-3. G12's no-repeat assertion covers the attempts, which must be allowed to repeat across takes and sessions

**Evidence.**
- G12, and §9.2.2's "the test", say: "every closing A-6 take other than an 'almost' hold ∉ the set of tempi (nps) played straight in the cell earlier that day".
- The attempts window runs in the closing, so its takes are closing A-6 takes.
- A `preTop` cell's cold check plays at max(staircase, 0.95 × target). The in-flight band-landing fix exists precisely so that this tempo lands in the band.
- §9.2.3 says the band often holds one mark (k = 1). So attempt 1 = the cold check's mark, which the assertion forbids.
- A second session the same day gets its own window (§9.2.3), and its attempts also repeat the first session's attempt tempo.
- A builder who enforces the assertion, or who applies `fgDay.played` to attempts, removes every attempt in these cases. The warm half then never completes, which is a §9.6 path effect.
- §9.2.2's own reasoning ("only attempts, at target and above the cap") already treats attempts as outside the rule. Only the test text includes them.

**Fix (§9.2.2 "the test", §9.2.3, G12).**
- **Attempts are exempt from the day's no-repeat set:** they may sit on a mark played earlier that day (a cold check, or an earlier session's attempt).
- The only no-repeat rule for attempts stays: never two at one tempo within a window (N7).
- Reword G12 to say "every closing A-6 **climb** take (not an attempt) other than an 'almost' hold ∉ …".
- Add a G12 case: a `preTop` cell with an in-band cold check at the band's only mark still gets attempt 1 at that mark.

### R14-4. Old coach and list runs: "the next playable tempo below" is 1 ♩ on an integer grid

**Evidence.**
- `tempoOf` (coach 357–359) and the list runs (`bpmOf`, `setBpm`, `Math.round`) play any integer ♩. So "attempt 2 = the next playable tempo below [attempt 1] that is still ≥ 0.95 × target" (§9.2.3, line 507) is target − 1. For a target of ♩113 that gives 113, then 112.
- The same paragraph's example, "0.95 × 113 = 107.35 → 108", implies attempt 2 = ⌈0.95 × target⌉. The rule and the example disagree.
- 1 ♩ apart is the same tempo in effect. The code's own distinctness floor is 2 ♩ (`climbFrom`: "always at least 2 ♩ — never the same tempo again").
- G3's k for these planners is undefined: k is always 2 under the literal reading.

**Fix (§9.2.3, G3, G24).**
- In the old coach and list runs: attempt 1 = the target (integer), and attempt 2 = ⌈0.95 × target⌉.
- There is no attempt 2 when the band is narrower than 2 ♩, that is, when ⌈0.95 × target⌉ > target − 2. This applies only to targets below about ♩40.
- G3 then uses k = 2 for these planners. G24's example already matches.

---

## Minor notes

1. **"At the cap" with the note-value alternation.**
   - Triplet marks rarely equal the cap's nps. For example, an eighths cap of ♩116 (3.87 nps) lies between triplet ♩76 and ♩80. So a climb can become "held at the cap" without ever playing the cap.
   - State that "held at the cap" and "reached the cap today" mean "the step function finds no qualifying mark ≤ the cap", compared in nps. Then the cap visit and the cap-day test use one definition.
2. **The recovery after the recovery.**
   - "A second miss goes down once more" leaves a third miss undefined.
   - Say: after the second miss the climb ends, then window → A-7 → end. This matches §5.5's intent and keeps the session from ending on the climb while time remains only when a window or A-7 is available. State that a session with neither may end on that miss.
3. **List-run attempt misses.** `hfMiss` n = 1 replays the same tempo (`'again'`). State that `hfMiss` never acts while the attempts `fg` is open. G4 says this for visits; say it for the attempts-only window too, since a replayed attempt would be two attempts at one tempo.
4. **§1 version line.** v14's header lists the code it checked, but not `enter`/`comfortOf`, which R13-3's floor depends on. That is cosmetic, and it is relevant to R14-1.

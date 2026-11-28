# Review: SPEC-FINGERING v4, round 4 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** v4 fixes M1–M7 in substance, and the §11.3 numbers and the §16.2 posterior examples check out. Four new gaps remain, and each would let a builder produce a measurement or data error:
- **P1.** The `~fg` route is specified against a take path that does not exist as described, so fingering takes would still earn result XP and record bonuses.
- **P2.** v15 shelving and the struggle step-down can strand a held cell.
- **P3.** The new-key block exception can now cause a v15 warm-first skip, which counts as a miss.
- **P4.** A slip-mark double press made inside a report window is read as "slipped, left hand".

All four fixes are local. None needs new research or a new owner decision.

**What I checked**
- The spec v4, the three earlier reviews, and H2 **v15**: §1.4, §1.6 (including the new skip and expiry rules), §1.7 (guard, shelving, reserve), §1.7a (v15 readiness, step-down, appropriateness) and §1.9.
- SP §16.3–16.4 and KS2 §§ on the probe and A-3.
- Code:
  - `Drills.tsx` `done()` (1748–1790);
  - `App.tsx` `take()` / `afterTake()` (2183–2230);
  - `ladder.ts` `applyTake` (110–160);
  - `events.ts` `drillXp`, `stretch.ts` `stretchXp`;
  - `analysis/model.ts` `addTake`;
  - `keyMatrix.ts` `takeSeconds`;
  - `tendency.ts` `takeTrace` (classes, `sidePredict`, edges) and `noteLog`;
  - `keyCoach.ts` constants.
- The calibration DB, read-only. It still holds 157 v1 traces and none with `nl`. I recomputed the D-major LH `xu` rows (33 MIDI takes):
  - ♩125–156, T1-eligible: n 14, mean +4.41, SD 10.50, threshold +14.91, 12 of 14 pass;
  - ♩100–125: mean +11.3, SD 11.45.
  - Both match §11.3.
- The Beta(1, 1) gate by simulation: 5/10 vs 2/10 → 0.909 (fails), 6/10 vs 1/10 → 0.988 (passes), 6/10 vs 2/10 → 0.960.

---

## Round 3: status

| R3 | Status in v4 |
|---|---|
| M1 isolation | **Fixed in principle** (§9.8, G24). The mechanism does not match the real take path (P1). |
| M2 attempts everywhere | **Fixed** (§9.2.3, §7.2, G3, G12). |
| M3 silent days | **Fixed** (asked-and-unanswered days, `quiet`, one end-line question, G20). |
| M4 slip per state | **Fixed** (§3.4 table, G21). |
| M5 day-1 without E | **Fixed** (the day-1 reference, §5.5, §6.2). |
| M6 check, references, numbers | **Fixed.** The numbers are verified. The band anchor is ambiguous (minor). |
| M7 shadow gate | **Fixed.** The examples are verified. |
| Minor notes | All addressed. |

---

## Substantive issues

### P1. The `~fg` route leaks XP and bonuses through the real take path, and "practice-time XP" does not exist
- **Evidence.**
  - `Drills.tsx` `done()` passes the ladder state from `applyTake` to `onTake(lad.state, drillEvents(…), drillXp(m), …)`. `App.tsx` `take()` keys everything by `st.itemId`. If §9.8 is followed literally (`applyTake` on `stateOf('<itemId>~fg')`), the `~fg` state goes through `take()`. There:
    - **XP** = `stretchXp(xp, bandOfTake(st, m, ch), nth, boost)`. The band comes from the `~fg` state, so a fingering take can be paid at the stretch factor.
    - **`afterTake`** pays `recordBonus` (+5) whenever `st.cleanBpm > prev.cleanBpm`. A C take at its click tempo raises `~fg.cleanBpm` on almost every visit (cap + 1 to cap + 3), so it pays a record bonus.
    - `afterTake` also pays the "cell closed" bonus (+20) and Momentum cell/key gains through `itemStatus(st, 0, target)`. `~fg` gets a `passLog` and a target if `applyTake` receives `targetBpm`.
    - `store.recordDrill` writes `~fg` into the synced `drillItems`. Every reader of that map sees it unless each one filters it out: matrix, `projectionInput`, rank and `exerciseIdOf`, plateau, Momentum.
  - **"Practice-time XP … from its active time (`drillTakeMs`)" (§9.8, §14.1) is not in the code.** `drillTakeMs` only feeds `activeMs`. All take XP is `drillXp` (4 / 2 / 1) × band × the daily repeat factor. A builder must invent the rule.
  - **`activeMs` on the main item** (§9.8) adds time without a take. `keyMatrix.takeSeconds` estimates a take's length as `activeMs / takes`, so long P1 takes would inflate the item's estimated take length and skew planner budgets. `take()` also measures session band time from the `activeMs` delta of the state it receives, so writing `activeMs` to both records double-counts it, and writing it to the main item outside `take()` loses it.
  - `recordTakeAnalysis` (the player model's per-note error and timing contexts, used by the AI coach) is called for every take. Block chords, metered pauses and bursts would enter long-term error patterns.
  - H2 v15 §1.6 lists `~feel`, burst, link and challenge takes as never counting. It does not list `~fg`.
- **Fix (§9.8, §14.1, F6, G24).**
  - Give fingering takes their own path, `takeFingering()`:
    - `applyTake` on `~fg` **with no `targetBpm`** (no `passLog`, no "closed");
    - `onTake` with a `fingering` flag that skips `bandOfTake` (comfort factor 1), `afterTake` bonuses, Momentum gains and `drillEvents`.
  - **Define the XP number.** Recommended: the base `drillXp` value for a miss (1) per take, × the daily repeat factor, whatever the verdict. That is "effort only", and it never depends on the result.
  - Keep **`activeMs` on `~fg` only**. Drop it from the main item's write list. Session time already comes from the state that `take()` receives.
  - Filter pseudo items in one place (an `isPseudoItem(id)` helper for `~feel` and `~fg`), used by every `drillItems` reader.
  - Fingering takes do not call `recordTakeAnalysis`.
  - Add `~fg` to H2 §1.6's exclusion list in the H2 amendment entry, beside the §1.7a entry.
  - **G24 additions:** no `recordBonus` or close bonus, no stretch factor, `~fg` absent from the matrix, rank, `exerciseIdOf` breadth and plateau, `takeSeconds` unchanged for the main item, and the player model unchanged.

### P2. H2 v15 shelving and the struggle step-down can strand a held cell
- **Evidence.** v15 §1.7 shelves a working cell after 12 visits without a pass. The struggle step-down (§1.7a) shelves working cells above a stepped-down target.
  - A non-`preTop` held cell cannot pass until the cap or the staircase reaches the probe band (§9.2.3), so the hold itself drives it toward shelving.
  - A shelved cell is not offered. That means no visits, no touch points and no cold checks at ≥ G, so no retirement. No window is shown either, so the §11.5 count never advances and the hold never times out.
  - The cell can be resumed later, still held.
  - Shelving also moves the challenge point and the guard reserve. That is a planner outcome the feature-off arm would not have had at that time, which §9.6 does not allow.
- **Fix.**
  - Visits of a held cell do not count toward the 12-visit shelving rule while it is held.
  - If the step-down shelves a cell in `retraining`, its fingering state freezes: no `quiet` count, no recheck clock, E kept. It resumes unchanged with the cell.
  - Add both to the H2 amendment entry.
  - G3 and G12: model shelving and the step-down, and report P(shelved while held) on and off.

### P3. The new-key block exception can produce a v15 warm-first skip
- **Evidence.**
  - v15 §1.6 counts a due counting check as a **miss** (it also resets the pair and enters the guard record) when the cell is sounded first that day.
  - §10 lets the new-key blocks "come first in the cell" on "the first appearance of a scale rung in a key **in the key session**", skipped only when A-1/A-2 passed or the probe ran.
  - The same cell (for example `scales:scale:2:RL:o2`) is also played in the old coach and in list runs, which do not set KS stage passes.
  - A player who reached the target in D in the old coach but never passed A-3 in any key (so there is no probe, KS2 line 285) gets blocks before a due cold check. The result is a counting miss caused by this feature.
- **Fix (§9.1, §10, G2).**
  - Add a skip condition to §10: the cell has any cold result or `lastSound` history. That is, the cell is new everywhere, not only in the key session.
  - Otherwise the blocks run after the cold check.

### P4. A slip-mark double press inside a report window is read as "slipped, left hand"
- **Evidence.** The two windows overlap: the report window runs 3 s from decay, and the slip mark is accepted up to 4 s after decay.
  - In a report window, one bottom press = "slipped", and on HT takes a second bottom press within 2 s = **left hand** (§8.3).
  - The briefs teach "press your lowest key twice" (§14.3). A player who slipped with the **right** hand and uses that gesture during a touch point records a left-hand slip.
  - That lowers the wrong hand's E, can add a hold for the wrong hand, and clears the wrong hand's confirmations through `lastSlipAt`.
- **Fix (§3.4, §8.3, G8, G21).**
  - The hand question is shown as its own line and accepts presses only **≥ 0.5 s after it appears**.
  - Two bottom presses within 1 s are read as one "slipped" (a slip mark) with the hand unknown (§9.4 rule), never as a hand answer.
  - While a report window is open, the slip mark and the "slipped" answer are the same event: one T3, at most once per cell per day.

---

## Minor notes
- **Version references.** The header and "Integrates with" cite H2 **v14**. Update them to v15. The H10 exclusion should also cover v15's appropriateness metric (§1.7a): held cells are reported apart there too.
- **Band anchor (§11.3).** "The lowest eligible row's mark": the lowest D row is ♩83. The example anchors at ♩80, but 84 is the nearest mark and gives different bands. Write "the Maelzel mark at or below the lowest eligible row".
- **Units.** `preTop` is stored in nps and compared with "0.95 × target" in bpm. State the conversion.
- **Non-take notes are not sounding.** State that range-learning presses (the brief shown before a cell's first take), zone answers and slip-mark presses never set `lastSound` and never count as "sounded" under v15's skip rule.
- **Due checks before fingering work.** Planners keep every cell's due cold checks (counting checks, slots, reviews, guard probes) ahead of the 8-minute block and the visits in the session budget. A due check pushed to the end and left unplayed counts as a guard miss when the skip share is above 20 % (v15 step 6).
- **T1 confound.** The upper band's takes are mostly newer (the climb), so a crossing residual that drifts across days reads as a tempo shift. Welch's t also treats same-session takes as independent. That is acceptable for an offer with a shadow gate, but put "the split holds on ≥ 2 distinct days per band" on the re-fit list.
- **G3** should also report how often a pending first clean expires under a long hold (v15's 60-day expiry).
- **Small text fixes.**
  - §15.4's v4 field list omits `cd`.
  - §14.6: the "End" and "empty list" bullets sit under item 4 ("Learn keyboard range"). They belong to item 3.
- **Dependencies.**
  - `lastSound` (H2 §1.4) and the `<item>~feel` pattern are not in the code yet. F6 depends on H2 step 1 (`lastSound`). Say so in §17.
  - Drums are MIDI only, except T3 through the menu. Say so in §12.
- **Copy.**
  - "One fingering, slow first" / "אצבוע אחד, קודם לאט" reads oddly. Suggested: "Stick to one fingering, slow first." / "רק אצבוע אחד, קודם לאט."
  - The R2 line "נשאר ב-♩116 עד שהאצבוע מתייצב" has no subject. Suggested: "הטמפו נשאר ב-♩116 עד שהאצבוע מתייצב".
  - The gender of "אצבוע" is masculine and consistent throughout. Good.

---

## Q8
**Recommend (a), now more strongly because of v15.**
- Under (b), a lucky attempt at target opens the pass-probe branch (`cleanBpm` ≥ 0.95 × target) while the cell's true cold ability is still below the band.
- In v15, every later counting cold check of that cell enters the V1 share, resets pairs on a miss, and **enters the tier guard record**. It also enters v15 readiness (2 of the last 3 probe-band cold takes).
- So (b)'s early opening adds probe-band cold misses that can **delay rank for the whole tier** and lower the content edge. That is the opposite of O5's intent.
- (a) opens the branch only when the cap is within 2 marks of the band, where the cold checks have a fair chance.
- Keep G16 (a)'s reporting of the excess, and add the guard-record miss count on and off to G3's output for the owner.

## Q9
**Accept the proposal.**
- For triplet items: P2 = ⅔ beat (8 twelfths), P3 = ⅓ beat (4 twelfths), with a triplet click. P1 stays 1 beat. Every shifted note then sits on the triplet grid.
- The ladder is 1 → ⅔ → ⅓ → 0: evenly spaced, and gentler at the first step than the duple 1 → ½ → ¼.
- The verification floor is easily met: P3 at ♩120 gives 0.5 p ≈ 83 ms.
- Sixteenth-note items need nothing new: 6 and 3 twelfths already sit on their grid.
- Add one G6 case for a triplet item.

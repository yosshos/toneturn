# Review: SPEC-FINGERING v1, round 1 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** The overall design (mixed block then visits, R1/R2/R3, report earns nothing, per item = per key) follows the research and the binding owner decisions. But a builder following v1 as written would get measurement errors (R2 blocks passes; reports can steer a qualifying cold take) and some pedagogical ones (the pause ladder runs at the wrong tempo and breaks R2; mic players and T2/T3 flags can never retire), and several triggers cannot be computed from the trace as it stands. Nine substantive issues follow. Each has a concrete fix, and none needs new research.

Checked: the spec, RF1, RF2, H2 v14 §1.4–§1.9 and §7, SP §1–§3 and §15–§16, KS2, IS, `tendency.ts` (`noteLog`, `TAKE_KIND`), `tests/noteLog.test.ts`, `storage/takeTraces.ts`, `stages.ts` (MAELZEL), `speech/midi.ts`. The calibration DB holds 157 traces, all v1 and none with `nl`, so T1 was replayed on the class means. Citations re-checked: Hardwick et al. 2019 (*Nat Hum Behav* 3:1252–1262, a forced-response paradigm) and Abushanab & Bishara 2013 (*Mem Cognit* 41:928–937, 25 pianists, random order faster at 2 days, illusion of competence). Both are cited correctly.

---

## Substantive issues

### S1. R2 blocks the V1 pass and the A-6 → A-7 gate, which contradicts O5
- **What H2 requires.** The H2 §1.6 item pass has a **warm half**: "3 counted clean takes at ≥ 95 % of target on ≥ 2 days". Those are plain straight climb takes.
- **What R2 does.** §9.2 caps every plain straight take at E + 1 mark. It exempts only cold takes, confirmations, the probe, the level test and teacher targets.
- **The result.** For a retraining item with E + 1 mark < 0.95 × target, the warm half is impossible. So the pass, and therefore rank, waits until retirement.
  - KS2 has the same problem: A-7 opens only when A-6 passes its target. A-6 never reaches it under the cap.
  - The spec says "rank and passes are never affected" (O5, §9.2, G3). That is false, and G3 as written ("equal with and without R2 on the same take results") cannot detect it, because R2 changes which takes happen.
- **Fix.**
  - (a) Add a **pass-evidence exemption**: at most one plain take per session per retraining item at 0.95–1.0 × target. Do it only once `cleanBpm` had already reached the probe band before retraining, or once the cold staircase is there. Follow it with touch point 2.
  - (b) Treat A-6 as "held, not failed" while retraining. The end line names the hold, and A-7 may open on the item pass.
  - (c) Rewrite G3 as a **planner-level** invariant: over a simulated month, P(pass by day N) with fingering on may be lower only by the exemption's dose, and the gap must be reported. Alternatively, state in plain words to the owner that R2 delays the warm half, and ask.

### S2. §11.2 lets a report steer a qualifying cold take, and it cites a superseded rule
- **The superseded rule.** H2 §1.9 says the non-confirmation cold tempo is chosen **only** by the 2-up-1-down staircase, which supersedes the "SP cold tempo". §11.2 overrides that staircase with G and never says how the staircase continues after a take at G.
- **The path from a report.** G = E0 + 2 marks, and E0 can come from a **T3 report**. That gives a chain:
  1. a report;
  2. the cold tempo;
  3. a clean cold take at a higher tempo;
  4. the MAP threshold estimate;
  5. the Momentum "cold rise" XP, readiness entry and the challenge point (H2 §1.7a, §1.9).
- **Why G1 misses it.** G1 compares runs "with the same takes", but this path changes the takes.
- **Fix.**
  - Derive G **only from MIDI sources**: T1 c*, the T2 tempo, or the last clean session tempo. Never from a report.
  - Model the take at G on H2's pass-probe branch: "after this take, the staircase resets to the tempo actually played". Cite H2 §1.9, not the SP cold tempo.
  - Add a guard test: no report value reaches the tempo choice of any qualifying take (cold, confirmation, pass probe, FSRS review).
  - Restate G1 as "reports may only lift restrictions the feature added; no measured outcome may exceed the feature-off baseline". Then test it at planner level with seeded learners.

### S3. The vanishing-pause ladder runs at the wrong tempo, breaks R2, and is not on the score grid
- **Wrong tempo.** T_w starts at snapDown(0.9 × E) and rises one mark per ~3 clean visits. O2 says the rungs vanish "at the item's tempo". RF2 §9 says "C at the item's session tempo". At 0.9 × E the main ladder practises *below* the edge for weeks, which is the opposite of the Hardwick rationale (train where preparation time runs out). §9.2 also has a second C tempo (cap + 1 mark), so two C tempos are now undefined against each other.
- **Breaks R2.** "Clean at P0 → T_w up one mark" lets P0, a plain straight run, climb past E + 1 mark. R2 allows only P3 or longer above the cap.
- **Contradicts §8.1.** The ladder row "'slipped' at P0 (touch point 2)" conflicts with §8.1, which says no fingering take asks.
- **Off the grid.** The rungs P3 and P4 (½ and ¼ IOI) are 1.5 and 0.75 twelfths of a beat for sixteenth-note scales, and P4 in eighths is 1.5 twelfths. `b` and the score are on a 1/12-beat grid. Each pause also shifts every later note off the beat click cumulatively, so P3 and P4 become syncopated reading against the click. That timing load has nothing to do with fingering, and timing grading will fail for rhythmic reasons. A "comma" (breath mark) suggests an unmeasured lift, but the pause here is metered.
- **Fix.**
  - One C tempo: **min(the session tempo, cap + 1 mark)**, starting at P2. P0 is allowed only at ≤ the cap.
  - Every rung must be a whole number of twelfths for the item's note value (see Q1). Notate the real lengthened value, such as a dotted note, not a comma.
  - Choose and state one of two options: either the click subdivides on fingering takes so the shifted notes stay on a click, or each pause is padded to the next beat (the pause plus a filler rest) so the run realigns.
  - Delete touch point 2 at P0. Its slip handling belongs to the visit's straight take.

### S4. Retention of the per-note log does not cover the trigger window
- **The window does not fit.** `NOTE_LOG_KEEP = 500` is global across all items, newest first. At the owner's rate (157 MIDI takes in about 1.5 days) that is about 5 days of `nl`, spread over every item. T1 asks for 21 days and ≥ 5 + 5 takes per item per split, so in practice it runs on 5 days.
- **Device-only.** Traces are device-only, so flags differ by device. The synced `FingerItem` does not carry the evidence.
- **Fix.** Either compute the per-take summaries T1 and T2 need **when the trace is kept** and store them in trace v4, or keep `nl` per item. Store per hand per group: R_g, n, the break flag, the site, and `fs`; these are tiny. For per-item retention, keep the last 40 eligible takes per item, or 21 days. State that flags are per device until the summaries sync.

### S5. T1 and T2 are not computable "exactly as written" from v3
1. **Feels are invisible.** §3.1 should exclude feel takes: accents, dotted, articulation, groove. Rate-keeping feels share the item id (SP §16.4), and the trace records only `swing`, not `spec.variant` or the feel. **Add `feel`/`variant` to v4** and exclude anything that is not straight.
2. **Thinned click.** Thinned-click takes (`click`) grow with familiarity and therefore with tempo, which confounds the band split. Exclude them, or require the split's two bands to match on click.
3. **Wrong-key notes.** `d` is filled for wrong-key matches (`p ≠ 0`). Residuals must use `p === 0` only.
4. **T2 has no plain-note residual.** T2's "largest |r_k| over all notes" needs residuals for plain notes, but §1.2 defines r_k only for crossing notes. Define r_j for every non-edge note: against the nearest plain notes of its run, itself excluded. Also define which `sd` is used. `HandTrace.sd` comes from a whole-run line fit, which is a different reference.
5. **T2 drops the best evidence.** T2 reads only clean or almost takes. The owner's clearest break (D ♩124, RH `xo` +96 ms, RH SD 55) was on a **failed** take (RF1 §3.2). Include "not" takes whose failure is timing only: all `p === 0` and no misses.
6. **No `fsig` on the trace.** v3 traces carry no `fsig`; it would have to be re-derived from the truncated `f`. Define `fsig` from the drill's full expected-finger string, and write it as `fs` on v4.
   - A change to the **suggestion code** (`generate.ts`) would silently trigger R3 and wipe a retraining state. Reset only on the player's own changes. A suggestion change should re-key the state without losing it.
7. **The local residual is not the trace's rule.** §1.2 claims to "mirror the trace's class rule", but it does not. The trace uses levels by place in the beat and drops a note when the two sides disagree in sign; its end edge is max(5, 2 × notes per beat). Mixing on- and off-beat neighbours adds lilt into r_k. Either implement the trace's two-sided, place-matched rule, or drop the claim and test the simpler rule in shadow mode.
8. **The replay gives ♩100, not ♩104.** Replaying T1 on the class means gives D LH `xu` firing at **c\* = ♩100** (Δ +31 ms, t 5.9, 100 % on Δ's side). C, E♭, G and B♭ stay quiet, and so does D RH `xo`. So the edge is ♩96, and G5 as written ("D at ♩104") would fail. Fix the text, or state that G5 checks the key only, not the mark.
9. **Shadow mode collects no labels.** F3 promises thresholds tuned on real slips. But touch points fire only on flagged, retraining or recheck items, and shadow flags offer nothing. Fix: on the calibration accounts during shadow, ask touch point 1 on every shadow-flagged item, plus a random 1 in 3 of unflagged scale items, once a day each.
   - Also give the false-offer target that shadow must meet. Proposal: ≥ 50 % of offers followed by a "slipped" or T2 within 14 days.
   - The cost of false offers is bounded (one per session, a 14-day snooze), but T1 measures a tempo shift that correct fingering also shows (RF1 §3.2). Its precision is unknown until labelled.

### S6. Identity: item vs cell
- **The mismatch.** H2 §1.4 keys cold evidence by **cell** (family + level + key, no hand group, the HT main item). The spec keys `FingerItem` by itemId and talks about "the item's cold take".
- **Where it bites.** RH/LH lead-in items and the HT item of one key are different ids that share one fingering line. R1 and R2 need one owner.
- **Fix.** Key the store by the cell's main item, with hands inside. Pool traces across the cell's items per hand, because the RH line of an RH item and of the HT item is the same fingering. Word R1 and G2 as "the cell's main-item cold check" (H2 §1.4 "cold check first").
- **Data model gaps.**
  - Merging by `since` loses later edge, pause and confirmation updates. Add `upd`.
  - The snooze, the decline and T3 are per hand in the text but per item in the model.
  - The model has no T3 date, which the §7.1 7-day rule needs.
  - It has no slip count at T_w today, which the §5.3 second-slip rule needs.
  - It has no flag stats (group, c\*, t, Δ) for the offer ranking and the line.
  - `asked.unanswered` is per item, but §8.2 counts per day across items.

### S7. Retirement and rechecks: too low, unseeing, and impossible for some flags
- **Too low.** G = min(E0 + 2 marks, 0.95 × target). RF2 §8.3 and RF1 §6.3 retire at **the item's target**, and the spec does not give a reason for lowering it. Retiring at E0 + 2 marks lifts R2, and the plain climb then re-enters the band where the habit returns (Hardwick).
- **Unseeing.** The 7- and 21-day rechecks are "the first cold take", at the staircase tempo. That can sit below the old edge, so it cannot see a relapse at speed. T1 and T2 are muted for 21 days.
- **Impossible for some flags.**
  - The confirmation's "MIDI half" uses "the T1 lower band", which does not exist for T2 or T3 flags.
  - Mic players have no MIDI half, so they can never retire.
  - The §5 table says C on mic makes "no ladder move", but §6.1 runs C on mic. A mic player therefore repeats the same rung at the same tempo every visit, which breaks key-session-must-develop.
- **Fix.**
  - Set G = max(E0 + 2 marks, min(target, the item's pre-flag climb top)) under the 0.95 × target cap, or ask the owner.
  - Play rechecks at ≥ G, using the S2 mechanism, and keep touch point 2 on the first climb that passes E0 after retirement.
  - MIDI-half fallback: the group's mean residual over clean takes ≥ 2 marks below E in the last 21 days.
  - Mic: let rhythm-verified pause placement move the ladder on hands-separate takes. Onsets are reliable for one line, and RF2 table C says "Mic? Yes". Allow report-only retirement on mic. That is safe because R2 only restricts.

### S8. R2 inside the key session is under-specified
- **What comes next.** After "straight at the cap, then a variant at cap + 1", the next take is not stated. A variant at cap + 2? Straight at the cap again? Repeating the cap take within a visit breaks "never the same take twice at one tempo", and G4 checks only consecutive takes.
  - Fix: once at the cap, the visit climbs **variants only**, with one straight take at the cap as the visit's last take (touch point 2).
- **"Limit for today".** KS2 must not read a cap hit as a limit ("the limit for today", reopen rules, "no more than six takes on one step").
- **B on the shared ladder.** B is a rate-keeping feel, and that group shares one ladder. R2 caps rate-keeping feels but lets B go above, so B needs its own feel-group state, or the clash must be named.
- **One cold "right" lifts the cap.** A "right" at touch point 1 on a probe-band cold take (exempt, far above E) sets E = max(E, t) and removes the cap at once. Fix: one "right" raises E by at most 1 mark per day, unless that take is MIDI-clean at the flagged group (no break, residual in band).
- **The H10 harness.** State that fingering variants count as offered difficulty in the H10 flat-rank slope. Otherwise retraining items read as flat.

### S9. Drums: the orchestration idea is sound, but four details are wrong
- **D-T1 is circular.** Orchestrated takes exist only inside retraining, so D-T1 can never raise the first flag. Either orchestrated takes join the drum feel pool for sticking rudiments, or drop D-T1 as a first trigger.
- **The plain cap is too low.** The orchestrated edge as the plain cap (+ 1 mark) under-reads one-surface ability. Moving between floor tom and snare adds travel, the same way blocks prove knowledge but not execution. Cap the plain climb at the orchestrated edge + 2 marks, or at the D-T2 edge on plain takes, whichever is higher.
- **Crosstalk.** On mesh kits, rack crosstalk can fire the snare from a floor-tom hit. Count a wrong-pad stroke only when the expected pad had **no** hit within ±30 ms and the stray hit is above the crosstalk velocity filter (`crosstalk` option). It must be a substitution, not an extra.
- **The site is ambiguous.** "A double or the stroke after it": pick one. Proposal: the site is the first stroke after each change of hand. Also fix the field types: `f` holds 'R'/'L' and not a digit, and `x` gets a new class char. Update the `NoteLog` type.
- **Report gesture.** Two kicks: require 80–400 ms apart, as a debounce against kick double-triggering.
- The floor tom on R and the snare on L is a standard orchestration and fine for a right-handed setup. Let the player pick V_R in the drum settings. The high-tom fallback can mean a reach for some setups.

---

## UX (fix before F8)
- **"מנחים" collides** with "צלילים מנחים" (guide tones), which appears dozens of times in the app. The chip "מנחים" reads as "guides". Use **"מנחי יד"** for the chip and "מנח יד" in the lines.
- **"right" is ambiguous in English:** "top key = right", followed by the hand question "top = right". Use "OK" or "correct" for the verdict ("Fingering OK? top key = yes · bottom key = slipped").
- **Zones on small boards.** The defaults devTop 96 and devBottom 36 are unreachable on 49-, 37- and 25-key boards, but the zone is not "empty" by the rule. Learn the range first, and until both extremes have been seen, treat MIDI keys as non-answering (pedal, keys, voice). Compute zones after the octave shift (`midi.ts` `octave`), and reset `fgZones` when the shift changes.
- **The spot-check question is ambiguous.** "It caught. Thumb?" / "זה נתקע. אגודל?" does not say what top or bottom means. Use "Way down at F♯ it caught. Fingering OK there?"
- **The verdict line.** The report line replaces it. Show the verdict first and the report line after it, so the take result is never hidden.
- **Hebrew wording.** "מחזיק קר יומיים" is a calque. Consider "האצבוע ברה מז'ור יציב גם בנגינה הראשונה של היום, יומיים". The app uses both "התפרצויות" and "פרצים" for bursts; pick one.

## Minor
- **Block take counts.** Step 3, P1 → P0, needs ≥ 5 clean takes, not "3–6". Step 5, P2 → P0, needs ≥ 4, not "2–4". With S3's start at P2 the counts change again.
- **4-octave truncation.** `NOTE_LOG_MAX = 96` truncates 4-octave hands-together scales (114 notes). Notes are interleaved by beat, so the last ~9 descending notes per hand, with 2–3 descending crossings, are lost, and the descent is the place of interest. Raise it to 120 for scales, or say that 4-octave items log partially.
- **T2 flags have no t** for the §4 offer ranking. Define their rank, for example by the number of break takes.
- **`!` and pins.** A "Positions" pin overriding `!` departs from SP §16.7 ("`!` means straight"). Say so explicitly in SP's amendment list.
- **Citations.** Abushanab & Bishara compares random-order with fixed-order practice *across melodies*. Using it for "blocked on day 1, spaced later" for one item is an analogy; label it so in §6.3. Hardwick is an arbitrary stimulus–response remap, not a motor sequence; RF2 already marks it "indirect".
- **Spoken numbers.** §14.4 lines carry ♩ numbers. G14's `speakable` must cover "♩116" and "F♯".

---

## Q1–Q7: recommendations
- **Q1, the fourth rung.** **Drop P4**, so the ladder is 1 beat → ½ → ¼ → none. ⅛ beat is off the 1/12 grid and below the verification floor at most tempi (0.5 p < 20–30 ms), so it adds a take that verifies nothing. If a fourth step is wanted, use ⅙ beat (2 twelfths).
- **Q2, the drum report.** Crash = right is good: it is distinct and never in rudiments. For "slipped", two kicks 80–400 ms apart is fine with the debounce. Prefer the ride bell if the kit maps it. Avoid the hi-hat foot, which moves incidentally.
- **Q3, R2 in `!`.** Keep the cap; teacher submission targets are already exempt. Show "held while the fingering settles" in the teacher digest. Give the teacher an explicit "don't hold" switch on the assignment rather than inferring it from `!`.
- **Q4, the snooze.** 14 days is fine. Make a second "Not now" on the same item and hand snooze for 28 days.
- **Q5, the cold take at G.** Accept **only** with the S2 conditions: G from MIDI only, the H2 §1.9 pass-probe-style staircase reset, and a guard test. Without it, retirement and rechecks cannot work.
- **Q6, D (accent the position start).** Keep it out of v1. Log velocity first, which `nl.v` now does, and test the thumb-bump hypothesis on labelled data. Add it later as a rate-keeping feel.
- **Q7, visits without an offer.** **No.** R2 restricts the player's climb, so consent matters. A strong flag (t ≥ 5) may be offered at the next session end even inside a snooze, and still waits for Yes.

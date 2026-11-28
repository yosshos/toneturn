# Review: SPEC-FINGERING v2, round 2 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** v2 fixes most of round 1. The cell identity, the evidence store, the whole-twelfth ladder at the item's tempo, the cap visit, G at the probe band, the drum crosstalk rule and the Settings card are all sound. Nine problems remain, and a builder would hit each of them:
- G16 cannot pass as written.
- The pass-delay claims in §9.2.3 are not true.
- The MIDI retirement condition compares a fast take with a slow reference, so it can block retirement for good. The owner's own D-major data fails it.
- The crossing groups in the spec differ from the trace's class rule, which the ♩100 replay was run on.
- Shadow mode cannot measure the precision that its go criterion needs.
- A player who never answers is held at the cap for good.
- The block and the visit repeat straight takes at one tempo, which breaks G4 and key-session-must-develop.

Every fix below is local. None needs new research or a new owner decision, apart from Q8.

**Checked:**
- the spec, RF1 and RF2;
- the H2 v14 sections: §1.4, §1.6, §1.7 (the rank guard), §1.7a and §1.9;
- SP §2.5 and §16, KS2 (A-6/A-7, D3–D6, U1, review 3) and IS;
- `tendency.ts`: `takeTrace`, `sidePredict`, `noteLog`, `TAKE_KIND`;
- the `midi.ts` crosstalk filter, `touch.ts` `afterCrossing`, and the `SettingsScreen.tsx` Learning group (line 552, `PracticeLength` at 561: the placement is correct);
- the calibration DB: 157 traces, all v1, none with `nl`. No v3 trace has reached the server yet, so nothing per-note could be replayed.

---

## Round 1: status

| R1 issue | Status in v2 |
|---|---|
| S1 R2 blocks passes | **Partly.** The pass-evidence take, "held" and A-7 on `passedAt` are right. The delay claims are wrong (N1, N2). |
| S2 report steers a cold take | **Fixed in mechanism.** G comes from the catalogue target and the H2 §1.9 reset is cited. But G16 is worded too strongly (N1). |
| S3 pause ladder | **Fixed.** The closing and P0 repeat tempos (N7). |
| S4 retention | **Fixed.** The T1 reference ages out before retirement (N3). |
| S5 computability | **Mostly fixed.** The class-rule mismatch remains (N4). `xs` cannot name the place as written (minor). |
| S6 identity, model | **Fixed.** Slips between confirmations are not stored (minor). |
| S7 retirement | **Fixed in structure.** The MIDI condition is not tempo-matched (N3). Mic `sdl` is missing (minor). |
| S8 key session | **Fixed.** H10 is satisfied by an inflated metric (N9). |
| S9 drums | **Fixed.** Two small gaps remain (minor). |
| UX, minor | **Fixed.** A few copy and grammar gaps (minor). |

---

## Substantive issues

### N1. G16 is false as written: E reaches the pass-probe branch through `cleanBpm`, and the cold half is delayed too
- **The path.** H2 §1.9 says that for an unpassed item, the cold tempo = max(staircase, 0.95 × target) **once `cleanBpm` ≥ 0.95 × target**. Under R2, `cleanBpm` grows only up to the cap = E + 1 mark. So E decides when the pass-probe branch opens, and with it the tempo of a qualifying cold take.
- **Reports are on that path.** An OK report raises E (§9.4). A "slipped" lowers E. Both change the qualifying tempo.
- **What that breaks:**
  - G16 ("the chosen tempo is identical with any sequence of reports (and any E)") will fail for every cell whose `preTop` < 0.95 × target.
  - §9.2.3 says "the cold half is unchanged". That is true only for `preTop` cells. For the others, the counting cold checks need the probe band and "a later day than the target was first reached" (H2 §1.6). So the cold half waits as well.
- **§9.6 still holds.** A lying OK can only bring the branch forward to the feature-off time, never earlier. The principle is right; the test and the prose are not.
- **Fix:**
  - Restate G16 as two properties:
    - (a) given the same `cleanBpm`, staircase state and pass state, the qualifying tempo is identical for any reports and any E;
    - (b) over seeded learners, the day the pass-probe branch opens with fingering on (with any report script) is never earlier than with fingering off.
  - In §9.2.3 and Q8, say that for non-`preTop` cells **both halves** wait until the cap or the cold staircase reaches the probe band.

### N2. The pass-evidence take: the "≤ about 1 practice day" claim depends on the clean rate, and it conflicts with the cap visit's last take
- **One attempt per session.** At most one attempt per session means the warm half needs about 3 / p sessions, where p is the clean rate at 0.95–1.0 × target. At p = 0.5 that is about 6 sessions. Without fingering, the learner gets several attempts in one session.
  - The cold half needs about 3 days of its own (the day the target is reached plus 2 later days), so it often hides the gap. But G3's "median delay ≤ 1 practice day" is a hope, not a property, and it will fail at low p.
- **Two "last takes".** §9.2.2 makes "one straight take at the cap" the visit's last take. §9.2.3 makes the pass-evidence take "the visit's last straight take". Both carry touch point 2. The order is undefined.
- **Fix:**
  - Allow up to **2 pass-evidence attempts per session, stopping at the first clean one**. Make it the visit's last take, followed by touch point 2.
  - On days when it runs, drop the closing straight take at the cap.
  - G3: state the bound conditionally (median delay ≤ 1 practice day at p ≥ 0.6) and report it at other values of p.

### N3. The MIDI condition compares a probe-band take with a slow reference; the reference also ages out and stays on one device
- **The mismatch.** The confirmation take is a cold check at ≥ 0.95 × target. The T1 reference is the **lower band**, below c\*, which can sit 30 % or more slower.
  - RF1 §3.2 says correct fingering can also shift with tempo.
  - The owner's D-major LH `xu` is −16.5 ms (SD 9.8) below ♩104 and +4.6 ms at ≥ ♩126 (RF1 §3.2). The band "mean ± max(20, 2 SD)" is −36.5 … +3.5, so **the owner's own fast takes fail it**.
  - A MIDI player whose fingering is fixed may therefore never retire. R2 then holds them for good.
- **The reference is lost.**
  - `fingerEvidence` keeps 28 days on the device and is not synced. Retirement can take weeks, so the T1 rows have aged out by then.
  - On a second device the condition silently falls back to "not a break take only".
  - `FlagStat` stores no reference.
- **Fix:**
  - Freeze the reference in the synced `FlagStat` at flag time: `{refMean, refSd, refN, upperMean}`.
  - Until shadow labels show that R_g carries meaning at the probe band, define the v1 condition as: **not a break take, and R_g no further on Δ's side than the T1 upper-band mean** (no worse than the flagged state).
  - For T2, T3 and manual flags: not a break take only.
  - Tighten the condition only after the §16.2 analysis, and add this to the re-fit list.

### N4. The spec's crossing groups are not the trace's classes, so the ♩100 replay and G5 do not test what F3 builds
- **The difference.** `takeTrace` gives the figure's boundary priority (`if (onBoundary) return 'oct'` comes before the crossing test), while `noteLog` lets the crossing win. The spec takes crossings from `nl.x`.
  - In D major, the RH thumb on D and the LH descending thumb on D are boundary crossings. They are `oct` in the class means that produced "c\* = ♩100", but they are inside g in the spec.
  - So G5's fixture ("the owner's five-key class means") checks a different statistic from the one F3 computes.
- **The reference set is ambiguous.** §1.3 says "plain played notes". It does not say whether a boundary crossing, or a note the trace calls `oct`, is plain, and the trace's `sidePredict` references use `cls[j] === null`.
- **Fix:**
  - Define one class array for `xs`.
  - Keep boundary crossings as their **own sites** (the site already carries the pitch class). Exclude them from R_g by default, as the trace does, and log them separately.
  - References = notes with no class under that array.
  - Mark G5 as a fixture-only test, and add G5b: recompute T1 from v3/v4 `nl` once traces exist, and check it against the class-mean result.

### N5. Shadow mode cannot measure precision as specified
- **Labels at the wrong tempo.** Touch point 1 fires only after a **clean cold check at the staircase tempo**, which is often below c\*. Below the edge the slip "gets away" (RF1 §3.3: recall about 0 % below the edge). True flags will collect OK labels, so precision is underestimated.
- **Leading wording.** §8.1 names the flagged place for flagged cells only. The owner can then tell flagged cells from the controls, which biases the label.
- **A circular label.** "Followed by a T2 break within 14 days" counts as confirmation. For T2 flags, and largely for T1, that is the same signal again.
- **No sample size or base rate.** "Precision ≥ 50 %" over perhaps 3–6 flags from two accounts says nothing, unless it is compared with the slip rate on the 1-in-3 control cells.
- **Fix:**
  - In shadow, also ask at **touch point 2** (the top straight take of the climb, at ≥ c\*/1.25) on shadow-flagged and control cells.
  - Use one neutral wording for every shadow question.
  - Count only "slipped" reports as positives.
  - Go criterion: ≥ 10 flags, precision ≥ 50 %, **and** ≥ 2 × the control cells' slip rate. Otherwise extend shadow mode.

### N6. E rises only on answered reports, so a silent player is capped for good; and T3 cannot start a flag
- **The silent player.** E rises only on an OK report (§9.4), and retirement needs OK. A hands-free player who ignores the window gets 2 + 2 unanswered windows and then no questions. That player is capped forever, and passes wait with no limit. "Stop" exists but is never suggested.
- **T3 is circular.** Touch points fire only on cells that are already flagged, retraining or due for a recheck. So T3 never flags a new cell. "Flags on mic come from T3" (§3.5) is therefore circular, and on mic only manual starts remain.
- **Fix:**
  - (a) A clean top take that is MIDI-clean at the group (N3 condition) raises E by 1 mark a day even without a report. This only lifts the feature's own restriction, so §9.6 allows it.
  - (b) After 5 practice days in retraining with no answered window, the end line offers "Keep the fingering hold? Yes · Stop".
  - (c) Strike "from T3" in §3.5, or let the item page's "Retrain this fingering" be named as the mic route.

### N7. The block and the visit repeat straight takes at one tempo
- **Where it happens.**
  - §6.2 step 6 plays "2–3 straight takes at T_S", and step 3/5 P0 is also at T_S.
  - §7.2 has "one or two straight takes at T_S".
  - §9.2.2 has a closing that resumes at the cap and then ends with a straight take at the cap.
- **What it breaks.** Each of these repeats a take with the same structure and tempo. That fails G4 and key-session-must-develop ("never the same take twice at one tempo"), and it ignores KS2 D3 (a clean take is followed by one a mark faster).
- **P0 is undefined.** The spec does not say whether P0 is kind `fingering` with `vr: 'C'` or an ordinary straight take. That changes `cleanBpm`, the warm half and the evidence.
- **Fix:**
  - Straight takes after the first rise one mark per clean take, up to the cap. At the cap, they switch to variants (§9.2.2).
  - P0 is an **ordinary straight take of its normal kind**, with no `vr`. It is then counted, and it is eligible evidence.
  - Say this in §5.3 and §6.2, and extend G4 to the block.

### N8. A teacher pin imposes R2 with no evidence of a problem
- **What happens.** A pin runs the block, and then the cell is in `retraining` (§6.3). The manual E is "the last clean session tempo". So every pinned scale is held at that tempo + 1 mark until two cold confirmations at 0.95 × target. The pin works as a silent pass delay, unless the teacher knew to set "Don't hold".
- **The research meant less.** RF2 §9 treats a pin as an angle, like pinning a feel.
- **Fix:** a pin without a flag or report runs the block and the visits **without R2**. R2 starts only on a flag, a T3 report or the teacher's explicit "Hold the tempo" (default off for pins). Update G12 and G19.

### N9. H10: counting pause variants as offered difficulty inflates the metric; H2 has no amendment entry
- **The inflation.** §9.2.2 counts C, B and G at "content tier + ln(tempo / target) / ln 1.2". A P1 take at cap + 3 marks, with a one-beat hold before every crossing, is far easier than a straight run at that tempo. Counting it makes the flat-rank slope pass by construction.
- **No amendment.** R2 also departs from H2 §1.7a ("the tempo climb … runs whatever the rank"), and the spec has no amendment entry for it. SP §16.7 got one.
- **Fix:**
  - Exclude retraining cells from the flat-rank windows, and report them separately ("held cells: n, days").
  - Add an H2 §1.16 amendment line next to the SP §21 entry.

---

## Minor notes
- **C grading.** "Each segment against its own line": scale segments have 3–4 notes, so a free line per segment hides rushing. Use the take's single IOI with one offset per segment.
- **Verification floor.**
  - "Always verifiable at P1–P3 at ≤ 8 nps" is false for eighths near ♩240: 0.5 p = 31 ms, below 3 × `sdl` once `sdl` > 10 ms.
  - Define what happens when placement is not verifiable (count the take on evenness only and keep the rung).
  - Mic takes have no `sdl` (G9), so give mic a fixed floor (e.g. 0.5 p ≥ 60 ms).
- **Tempo limits.**
  - The T_C fallback "the item's last clean tempo" is not capped; write min(·, cap + 1 mark).
  - §5.3 caps T_C at cap + 1, but §9.2.2 lets C climb to cap + 3. State which applies.
- **`xs` cannot name the place.** "The site with the largest mean |r| in the upper band" needs a per-site mean |r|; `xs` stores only `siteMaxPc`/`maxAbs`. Store `[pc, r]` per site (≤ 3 per group), or define the place as the most frequent `siteMaxPc`.
- **Slips between confirmations.** Nothing stores a slip from an earlier day, and the `confirms` union on merge can bring back a confirmation that a slip on the other device should have cleared. Add `lastSlipAt` per hand, and count only confirmations after it.
- **T1 bands mix cold takes.** Cold checks cluster in the probe band and carry the cold effect. Exclude cold takes from the T1 bands (they remain the confirmation evidence), or stratify by cold/warm.
- **E jumps.** One MIDI-clean OK take can raise E without limit (§9.4). Bound it at 2 marks per day.
- **Report grammar.**
  - Say that the hand press follows only "slipped".
  - The prompt must name only the inputs that work (pedal or tap when the zones are empty or the range is not learned yet).
  - Two-button page turners often send ←/→, so map ← to "slipped" on the first press.
- **Copy.**
  - The Settings hint says "the last 60 days", but §14.6 clears **every** snooze and decline. Align the two.
  - Hebrew "החליק" reads as "skidded". "לא" (parallel to "כן") is clearer.
- **States.** `declined` and `offered` are cell states, but the decline is per hand. Keep `declined` per hand only, as `snoozeUntil` already does.
- **Block closing.** RF2 §8.3 closes the block "below the edge", but T_S may equal the cap = E + 1 mark. Cap the day-1 closing at E.
- **T3 visits.** Visits started by a T3 report without a Yes run with no plan check and no block. Say so, or add the P1 plan check to the first such visit.
- **Drums.**
  - "From the first session" conflicts with SP §16.1 (no feels during acquisition). Write "once acquired".
  - A D-T3 flag before any orchestrated edge exists has no defined cap. Start E from the report, as piano does.
- **Numbering.** G19 is listed before G18.

---

## Q8 recommendation
**Accept the delay (the default), in a narrower form.**
1. Widen the pass-evidence take to cells whose **cap is within 2 marks of the probe band**. The rehearsal risk there is small, and it cuts the tail.
2. Fix N6(a), so that E can rise without an answer. Otherwise the "unknown length" includes "forever".
3. Fix N8, so that pins do not add delay.
4. Before F6, show the owner G3's P(pass by day N) on and off for both groups, at p = 0.5 and 0.7. Make the decision on those numbers, not on the prose.

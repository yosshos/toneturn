# Review: SPEC-FINGERING v16, round 16 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

Both remaining issues are small and local, and neither needs research or an owner decision:
- **R16-1.** R15-3's rule (attempts never sit on a tempo of the day's capped plain or recovery takes) was carried into the key session's attempt tempi and G3's key-session k, but not into the old coach or list runs. There, attempt 2 is still a fixed ⌈0.95 × target⌉. The spec does not say what happens when a capped take blocks that tempo, and G3 still counts k = 2 for these planners.
- **R16-2.** The 2 ♩ "distinct" rule (R15-2) is defined in §9.2.2 but missing from four places that still say "compared in nps": the KS2 amendment entry, F6, G12's general no-repeat assertion, and §9.2.2's "testable" paragraph. A guard written from G12's general clause would accept the 0.5 ♩ near-repeats R15-2 removed. Only the listed example cases would catch them.

**What I checked:**
- The spec v16 in full: §5.3–§5.5, §9.2.0–§9.2.5, §9.8, §17, G1–G24, and the v16 log.
- Round 15.
- `keyCoach.ts`:
  - `setPulse` 261–278 (`snapDown(… + 0.5)`, `noCap`);
  - `comfortOf` 290–312;
  - `enter` 315–359 (max(`comfortOf`, `flow`) at 344);
  - `openVisit` and the closing 388–448 (the limited `review(a6, g)`);
  - `canTrip` 621 and the flip at 1055;
  - `STEP_TAKES` / `ALMOSTS_BACK` 1084–1092 and the back-to-good branch;
  - `closingDue` 1166.
- `coach.ts`: `tempoOf` 353–360 and `climbFrom` 366–370 (integer grid, ≥ 2 ♩).
- `ladder.ts` 130–146: the `passLog` fix is in (`target && bpm ≥ PASS_SHARE × target`, `!slower`).
- `Drills.tsx` 1772 (`slower: bpm < goalBpm × 0.99`).
- SP §1 ("at least 2 ♩").

I re-derived every worked example in §9.2.2 under the 2 ♩ rule:
- the miss case: start ♩120, recovery ♩92;
- the fast line: ♩126, then ♩132;
- the alternation: eighths ♩152 is exactly 2 ♩ above eighths 150, so it counts as distinct under the strict `<`; then triplet ♩108;
- the missed cold check: ♩116, then ♩126;
- R15-2's case: eighths ♩100, then triplet ♩69, then eighths ♩108.

All of them are correct.

## Round 15: status

| R15 | Status in v16 |
|---|---|
| R15-1 stale closing-start text | **Fixed.** §9.8 item 9 now states the step rule. G12's R11-1 case now expects ♩120. No other v12 closing-start text remains outside the change logs. |
| R15-2 near-repeats across note values | **Fixed in the rule** (§9.2.2 "Distinct tempi", §5.3's table row, key-session attempt 2, G3's key-session k, the G12 and G24 cases). It did not reach four restatements (R16-2). Attempt 2 is measured "in item ♩", while everything else is measured in the take's note value (minor 1). |
| R15-3 attempts repeating capped takes | **Fixed for the key session** (the ♩112 / cap ♩108 case in §9.2.3, G4 and G12). **Not carried to the old coach or list runs, nor to G3's k for them** (R16-1). |
| Minors 1–6 | All fixed: the comfort pulse is `comfortOf`; a second "almost" is a miss (§5.3, §5.5, §9.2.2); G4 has the recovery exception; "at the cap" is scoped per planner, with the below-cap case accepted; the limited-A-6 cost is accepted and the `STEP_TAKES` line is narrowed; the worked-example assumption is stated; the ",," in F6 is gone. |

**Answers to the brief:**
- **G1, G16 (a)/(b), G24:** satisfiable on every path. v16 does not touch their paths.
- **G4 / G12:** satisfiable once the 2 ♩ rule is in G12's general assertion (R16-2). The attempt checks in G4 already read correctly.
- **G3:** its k is optimistic for the old coach and list runs when the cap lies in the probe band (R16-1). So the bound for `preTop` cells could pass on k = 2 where the real planner plays 1.
- **Fingering-take leaks:** none. §9.8 is unchanged and still matches `done()`.
- **Legitimate loss:** none new. A blocked attempt only ever loses a tempo whose clean capped take already entered `passLog` (≥ 0.95 × target; `slower` is compared against the clamped goal).
- **Consistency:**
  - H2 v16 and IS: unchanged and consistent.
  - SP: §1's mark is now applied in the key session.
  - KS2: the amendment entry lags the rule (R16-2).
- **Buildable without guessing:** not quite. Old-coach and list-run attempt 2 is ambiguous when blocked (R16-1).

---

## Substantive issues

### R16-1. R15-3's exclusion is not applied to the old coach, list runs or G3's k for them

**Evidence.**
- **§9.2.3, old coach and list runs:** "attempt 1 = the target, attempt 2 = ⌈0.95 × target⌉".
- **The R15-3 sentence** then says attempts "never sit on a tempo of the day's capped plain takes or recovery takes (distinct by the 2 ♩ rule)" and "if attempt 2 has no *such* tempo in the band, there is no attempt 2".
- **The clash, on the integer grid:**
  - **Example:** target ♩112, so ⌈0.95 × 112⌉ = 107, and cap ♩108. Q8 (a) allows attempts once the cap is within 2 marks of the band, so a cap in the band is a normal case.
  - The old coach's `climbFrom` reaches ♩108 at the cap (`capHeld`), and a list run reaches it with min(raise, cap). ♩107 lies within 2 ♩ of ♩108.
  - **One reading:** there is no attempt 2.
  - **The other reading:** "such tempo" means any integer in the band ≥ 2 ♩ from the capped takes and from attempt 1. That gives ♩110, which is 2 ♩ from both ♩108 and ♩112.
  - A builder has to guess between them.
- **G3** still defines k for these planners as "k = 2 (the target and ⌈0.95 × target⌉), k = 1 only when the band is narrower than 2 ♩". It ignores the exclusion, which its key-session k does apply. In the case above the simulation counts 2 attempts where the planner plays 1 (or 2 at another tempo), so the `preTop` bound is measured on the wrong k. This is R15-2's G3 point in another planner.
- **Attempt 1 can also be blocked** in any planner: when a capped plain take was played within 2 ♩ of the target (cap ≥ about target − 2, e.g. a capped ♩112 that missed). §9.2.3 never says what attempt 1 is then. It also still says "so a `preTop` cell always gets attempt 1", which is true only for the cold-check case it was written for.

**Fix (§9.2.3, G3, G12).**
- Make both attempts one rule in every planner. **Attempt 1** = the highest playable tempo in [0.95, 1.0] × target that is ≥ 2 ♩ from every capped plain or recovery take of the day. **Attempt 2** = the next such tempo ≥ 2 ♩ below attempt 1. If no tempo qualifies, there is no attempt, and none for that window.
- For the old coach and list runs, either keep ⌈0.95 × target⌉ as the only candidate for attempt 2 (simplest: "else none"), or let it slide to the highest qualifying integer. Pick one and write it down.
- Narrow "always gets attempt 1" to "an in-band cold check never blocks attempt 1".
- **G3:** for the old coach and list runs, k = the number of the planner's attempt tempi left after the exclusion (at most 2).
- **G12:** add the old-coach case: target ♩112, cap ♩108. Attempt 1 is ♩112, and attempt 2 follows the chosen rule (none, or ♩110), never ♩107.

### R16-2. The 2 ♩ rule is missing from four restatements

**Evidence.** §9.2.2 "Distinct tempi" defines "played", "above `prev`" and "below the lowest" with the 2 ♩ rule. Four places still state the exact-nps version:
- **The KS2 amendment entry** (the text to be pasted into KS2): "the lowest mark … above the cell's highest clean capped plain tempo today, not played today (in nps)". It does not mention the 2 ♩ rule, and in KS2 it stands alone.
- **F6:** "not in `fgDay.played` in nps".
- **§9.2.2, "Why G4 and G12 are satisfiable and testable":** the closing takes are chosen "compared in nps". The test it states is "∉ the set of tempi (nps) played straight".
- **G12, general clause:** "no closing take other than an 'almost' hold is a tempo (nps) played straight earlier that day".

A guard written from the general clause passes eighths ♩104 after triplet ♩69 (item ♩103.5). Only the one listed R15-2 example would catch it, not the property across all keys and tempi.

**Fix.**
- In all four places, replace "in nps" / "(nps)" with "by the 2 ♩ rule (§9.2.2, distinct tempi)".
- In the KS2 entry, add "at least 2 ♩ above the previous take in the take's note value".
- Make G12's general assertion: "no closing take other than an 'almost' hold lies within 2 ♩, in its own note value, of a tempo played straight earlier that day."

---

## Minor notes

1. **One unit for "2 ♩ apart".** Key-session attempt 2 must be "≥ 2 ♩ below attempt 1 in item ♩", while §9.2.2 and SP §1 measure in the take's note value. A triplet step of 2 ♩ is 3 item ♩.
   - Example: attempt 1 is eighths ♩92 and the candidate is triplet ♩60 (item ♩90). It is distinct in item ♩ but not in triplet ♩.
   - The "prefer attempt 1's note value" clause hides this in almost every case.
   - Use the take's note value everywhere, or say why attempts differ.
2. **The note value of a visit's straight takes.** §5.5 and §7.2 do not say whether `fingerAfter`'s in-visit straight ladder keeps T_S's note value or alternates like the speed path (`canTrip`).
   - The worked example (visit 0: triplet ♩100, then triplet ♩104) implies it keeps T_S's note value.
   - The 2 ♩ rule makes either choice safe, but state one so G4's "one mark faster" is testable.
3. **§9.2.2, "testable" paragraph:** "only attempts, at target and above the cap" should read "at 0.95–1.0 × target". Attempt 2 can be below the target.
4. **§9.8 item 9:** stray punctuation, "(R11-1, R12 minor 1, R15-1). (so the first straight take …".

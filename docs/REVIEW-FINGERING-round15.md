# Review: SPEC-FINGERING v15, round 15 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

All four round-14 issues and the four minor notes are fixed as written. Three gaps remain. Each is local and needs no research or owner decision:
- **R15-1.** Two older passages still describe the v12 closing start, and they contradict the v14 step rule. One is §9.8 item 9's `fgStart`; the other is G12's R11-1 case. A builder following G12 would build and test the wrong rule.
- **R15-2.** No-repeat and "rise" are compared by exact nps equality. The step function, the recovery take and the key-session attempts all mix eighths and triplets, so the spec allows 0.5–1 ♩ "rises" and near-repeats. That breaks SP §1's ≥ 2 ♩ mark and the principle R14-4 fixed for the old coach.
- **R15-3.** R14-3 exempts attempts from the **whole** day's no-repeat set. When the cap reaches the probe band, attempt 2 can repeat a clean capped take played moments earlier in the same closing or visit. G4 forbids exactly that.

**What I checked:**
- The spec v15 in full, the v14 → v15 log (§20), round 14, and G1–G24.
- `keyCoach.ts`:
  - `setPulse` 261–278 and `comfortOf` 290–312;
  - `enter` 315–359 (comfort = max(`comfortOf`, `flow`) at 344);
  - `openVisit` and the closing 388–448 (the limited `review(a6, lastGood)` at 432; the plain entry at 434);
  - `limit` 766–792 (A-6 → `ks.limited`, then `nextStage`);
  - the warm-up 970–982;
  - the speed path 1008–1119 (the `canTrip` flip at 1055, `STEP_TAKES`/step-back limit at 1084, back-to-good at 1103);
  - `closingDue` 1166 and the exits 1174.
- `coach.ts`: `tempoOf` 353–360 and `climbFrom` 366.
- `ladder.ts`: line 143. The in-flight `passLog` fix is already in the code: `target && bpm ≥ PASS_SHARE × target`.
- `Drills.tsx`: `applyTake` 1772 (`slower`).
- `stages.ts`: `MAELZEL`.
- KS2 review 3 ("a stage at its limit comes back … only as a two-take review"); SP §1 ("One mark … at least 2 ♩").

## Round 14: status

| R14 | Status in v15 |
|---|---|
| R14-1 recovery floor repeated the comfort pulse | **Fixed** (§5.5, §9.2.2, KS2 amendment, G12). The recovery is the highest mark below the day's (or the visit's) lowest straight nps, unplayed, and ≥ the comfort pulse; there is none if no mark qualifies. When visit 0 started from `comfortOf`, its first take is snapped down to ≤ comfort, so no recovery qualifies, as G12 now expects. The comfort pulse needs a definition (minor 1). |
| R14-2 limited held A-6 | **Fixed:** the closing skips A-6 (window, else A-7, else the end). The step is also in the KS2 amendment and G12. This matches the code: `limit()` puts A-6 in `ks.limited` (772) and the closing's branch at 432 is bypassed. The cost in session time is minor 5. |
| R14-3 G12 forbade attempts | **Fixed for the cold check and earlier sessions**, but the exemption is too broad (R15-3). |
| R14-4 1 ♩ attempt 2 | **Fixed for the old coach and list runs:** attempt 1 = the target, attempt 2 = ⌈0.95 × target⌉, and none below a 2 ♩ band. G3's k is defined. **The same flaw remains in the key session** through mixed note values (R15-2). |
| Minors 1–4 | Fixed: "at the cap" by the step function, the climb ends after the second miss, `hfMiss` is off in the window (§9.8 item 9), and the header is updated. Minor 1 needs scoping (minor 4 below). |

**Answers to the brief:**
- **G1, G16 (a)/(b), G24:** satisfiable. v15 changes nothing on their paths.
- **G3:** its key-session k counts tempi under 2 ♩ apart as two countable attempts (R15-2). It must use distinct tempi, or the bound is measured on an optimistic k.
- **G4 / G12:** can fail on R15-1 (the test and the rule disagree), R15-2 (near-repeats pass the equality test) and R15-3 (an attempt repeats the closing's clean cap-band take).
- **Fingering-take leaks:** none found.
- **Legitimate loss:** only closing time on a limited held A-6 (minor 5).
- **Consistency:**
  - H2 v16 and IS: unchanged and consistent.
  - KS2: the amendment text matches §9.2.2. The R14-2 skip departs from KS2 review 3's two-take review and is listed as an amendment.
  - SP: §1's "at least 2 ♩" mark is what R15-2 restores.
- **Buildable without guessing:** not yet. R15-1 leaves two contradictory closing-start rules.

---

## Substantive issues

### R15-1. Stale v12 closing-start text in §9.8 item 9 and G12

**Evidence.**
- **§9.2.2 (v14 rule)** starts the closing at the lowest qualifying mark above `prev` that was not played today. Its worked example (♩100–112 clean, ♩116 missed, ♩96 clean, cap ♩132) gives **start ♩120**.
- **§9.8 item 9, key session (line 623)** still describes `ks.fgStart` as "one mark above the highest clean straight tempo of the cell today, if unplayed today and ≤ the cap … otherwise A-6 is skipped". With the same data, one mark above 112 is 116, which was played, so A-6 is **skipped**.
- **G12, "R11-1 cases"** asserts that the same scenario "skips A-6 in the closing". Two clauses later, G12's R13-1 cases expect the v14 rule.
- Rounds 13 and 14 changed §9.2.2 but did not touch these two places.

**Fix.**
- **§9.8 item 9:** replace the parenthesis with "§9.2.2's step rule: the lowest mark, in the speed path's note value, above the highest clean capped plain nps today, not played today, ≤ the cap; none → A-6 skipped".
- **G12, R11-1 case:** change it to "enters at ♩120 with `known: true`, never ♩100 or ♩116".

### R15-2. Mixed note values defeat the "one mark" and the no-repeat test

**Evidence.**
- The step function takes "the lowest mark in the take's note value whose nps is above `prev`". `fgDay.played` is compared by exact nps equality. The speed path flips eighths ↔ triplets on every clean take (`canTrip`, keyCoach 1055), and triplet marks × 1.5 sit 0.5–1.5 ♩ from eighths marks:

  | Triplet mark × 1.5 | Nearby eighths mark |
  |---|---|
  | 69 × 1.5 = 103.5 | 104 |
  | 66 × 1.5 = 99 | 100 |
  | 63 × 1.5 = 94.5 | 96 |
  | 58 × 1.5 = 87 | 88 |

- **The climb:** eighths ♩100 (3.33 nps) clean → triplet ♩69 (3.45) → eighths ♩104 (3.467). That is a **+0.5 %** "rise" on a clean take.
  - KS2 D3 and §5.5 require a mark, and SP §1 defines a mark as "at least 2 ♩". The pending key-session climb fix exists so that every clean take rises by a minimum step.
- **The recovery:** a mark "below the lowest nps" can be 0.5 ♩ below a played take (triplet ♩69 under eighths ♩104). Exact-nps exclusion lets it through.
- **The key-session attempts:** "either note value may supply the mark".
  - For a target of eighths ♩100: attempt 1 = ♩100, attempt 2 = triplet ♩66 = item ♩99, which is 1 ♩ lower.
  - For a target of ♩104: attempt 2 = triplet ♩69 = 103.5.
  - This is the near-repeat R14-4 removed from the old coach.
  - G3 counts it as k = 2, which overstates the countable attempts.

**Fix (§9.2.2, §5.5, §9.2.3, G3, G12, G24).**
- **"Distinct" means at least 2 ♩ apart in the take's note value.** A mark x (♩ in note value `per`) counts as **played** if any played take's nps lies within 2 ♩ of x converted into the same note value: |nps − nps(x)| < 2 × per / 60.
- **"Above `prev`"** means at least 2 ♩ above `prev`'s tempo converted into the take's note value. "Below the lowest" for the recovery is the mirror rule.
- **Key-session attempts:** attempt 2 must be ≥ 2 ♩ below attempt 1 in item ♩. Prefer attempt 1's note value. If no such mark is in the band, there is no attempt 2.
- **G3:** k counts only tempi that pass this rule.
- **G12:** add the ♩100 → ♩104 case. The next take after eighths ♩100 and triplet ♩69 must be ♩108.
- **G24:** add target ♩100: attempts 100, then 96 (eighths) or none, never 99.

### R15-3. The attempts exemption lets attempt 2 repeat a capped take of the same closing or visit

**Evidence.**
- §9.2.3 (R14-3) says attempts "are exempt from the day's no-repeat set". The only remaining limit is N7: never two attempts at one tempo within a window.
- Under Q8 (a), attempts run once the cap is within 2 marks of the band, so **the cap can sit inside the band**.
- **Example:** target ♩112 (band ≥ 106.4), cap ♩108. The held closing climbs to ♩108, clean, which is at the cap. Then the window: attempt 1 = ♩112, missed. Attempt 2 = "the next playable tempo below, ≥ 0.95 × target" = **♩108** (eighths, or triplet ♩72, the same nps). That repeats the clean take played seconds earlier in the same closing.
- The same happens in a fingering visit whose straight ladder reaches a band-level cap.
- This violates G4 ("no straight take repeats a tempo already played straight in the visit … the pass-evidence attempts included") and the owner's no-repeat rule.
- Nothing is gained: the ♩108 capped take already entered `passLog` (it is ≥ 0.95 × the catalogue target).
- The exemption is only needed for **exempt** takes (an in-band cold check) and **earlier sessions'** attempts.

**Fix (§9.2.3, §9.2.2 "the test", G4, G12).**
- Attempts may repeat the day's exempt takes and earlier sessions' attempts. They **never** sit on a tempo of the day's capped plain takes (or recovery takes), distinct by R15-2's 2 ♩ rule.
- If attempt 2 has no such tempo in the band, there is no attempt 2.
- **G12:** add the cap-♩108 case: no attempt at ♩108.
- **G4:** say that attempts are checked against the visit's plain takes, not against its cold check.

---

## Minor notes

1. **Which "comfort pulse".** `enter` uses max(`comfortOf`, `ks.flow[rung]`) (344). Record-only sets `flow` to one mark above the visit's top clean tempo. If the floor reads that maximum, the recovery never qualifies. State that the floor is `comfortOf` (`ks.comfort[comfortKey]`), as it stands when the recovery is chosen.
2. **A second "almost".** "Almost holds once" (§5.3, §5.5, the closing) leaves a second consecutive "almost" undefined. The code's `ALMOSTS_BACK` holds again. State that a second "almost" is treated as a miss.
3. **G4's wording.** "Each clean straight take below the ceiling is followed by one a mark faster" contradicts §5.5, where a clean recovery take ends the straight part. Add "except a recovery take".
4. **Scope of "at the cap".**
   - The step-function definition (§9.2.2) is a key-session notion. Say that in the old coach and list runs "at the cap" means the take tempo equals min(…, cap) on the integer grid.
   - Note that the definition can hold after a clean take below the cap, when every mark up to the cap was played, for example missed. That take then opens the cap visit and counts as "reached the cap today". This is acceptable, but say it.
5. **Lost closing time (R14-2).**
   - A limited, non-`preTop` held A-6 whose A-7 is not playable now ends the session at the closing's start.
   - With the feature off, it gets KS2's two-take review.
   - This is the same trade as the cap day. State it as accepted, or use one review take at the highest unplayed mark below the limit.
   - Line 460 also says "`STEP_TAKES` never sets a limit on a held cell", while R14-2 relies on the step-back limit at 1084, which sits in the same condition as `STEP_TAKES`. Say that line 460 applies to clean holds at the cap.
6. **Cosmetic.**
   - §9.2.2's miss-case worked example assumes visit 0 started above the comfort pulse (for the ♩96 recovery). Say so.
   - F6 has a stray ",," after `technique-fingering`.

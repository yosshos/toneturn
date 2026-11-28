# Review: SPEC-FINGERING v17, round 17 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

One substantive issue is left. It is new, local, and needs no research or owner decision:
- **R17-1.** In the key session, the spec never says that the pass-evidence attempts bypass `setPulse`'s step limit (`pulseBpm` → `upLimit(lastBy)`). §9.2.3 protects them only from `snapDown`. Under Q8 (a) the jump from the cap to the target is usually larger than one step limit, so a literal build pulls attempt 1 down, often below 0.95 × target. Then the clean attempt never enters `passLog`. This breaks G24 ("never below 0.95 × target") and the G3 `preTop` bound on the main planner.

R16-1, R16-2 and round 16's minor notes are fixed. A few small leftovers are listed as minor notes.

**What I checked:**
- **The spec v17:** §0, §1, §5.3–§5.5, §7.2, §9.1–§9.2.5, §9.8, §17, §18 (G1–G24), §19 and the v17 log.
- **Round 16.**
- **Code:**
  - `stages.ts`: `markUp` / `markAbove` 160–168, `upLimit` 175–178, `stepCap` 216.
  - `keyCoach.ts`:
    - `gradedUp` 175–196 (the `upLimit` floor);
    - `pulseBpm` / `setPulse` 266–290;
    - `enter` 358 (`known` → `noCap`);
    - the target review 456 (`known: true`);
    - `canTrip` 634 and the flip at 1069;
    - the clean branch 1060–1097;
    - `STEP_TAKES` 1098–1100;
    - `closingDue` 1180.
  - `ladder.ts`: `wholeBpm` 61–66, and `passLog` 156, which now admits any clean non-`nc` take at ≥ 0.95 × `targetBpm`, whatever `slower` is.
  - `coach.ts`: `tempoOf` 353–360 and `climbFrom` 366–370.
  - `Drills.tsx` 1772: `targetBpm: itemTargetBpm(drill)`, `slower` against `goalBpm`.
  - `quests.ts` `tech3` (unchanged, and the spec handles it).

## Round 16: status

| R16 | Status in v17 |
|---|---|
| R16-1 one attempt rule | **Fixed.** §9.2.3 has one rule for every planner: the highest unblocked tempo in [0.95, 1.0] × target, attempt 2 at least 2 ♩ below, none rather than sliding. "Always gets attempt 1" is narrowed. G3's k counts only yielded tempi, and G12 has the target ♩112 / cap ♩108 cases. I re-derived both: old coach 112 → 110; key session 112, no attempt 2 (eighths ♩108 and triplet ♩72 are both blocked). |
| R16-2 2 ♩ restatements | **Fixed** in the KS2 entry's climb, F6, the "testable" paragraph and G12's general clause. A small residue remains in the recovery wording (minor 5). |
| Minor 1 one unit | **Fixed in §9.2.2 and §9.2.3.** G3 still says "in item ♩" (minor 2). |
| Minors 2–4 | Fixed: §5.5 note value, "0.95–1.0 × target", and the §9.8 item 9 punctuation. |

## The case asked about: a missed capped take blocks the whole band

**Legitimate, but the wording is wrong.**
- **Why it is legitimate:**
  - The band is fully blocked only when the day's capped plain takes already played every band tempo within 2 ♩. On the key session's grid this is often one mark.
  - A clean blocking take is already in `passLog`. The code now admits any clean take at ≥ 0.95 × `targetBpm`, and `Drills.tsx` passes the catalogue target.
  - A missed one means the player has just had a probe-band try at that tempo today. Replaying it would break the key-session-must-develop rule.
  - The feature-off key session would not replay that tempo in the same session either, because a miss steps back.
- **What the wording gets wrong:** the block is day-scoped ("the day's capped plain or recovery takes", `fgDay.played`). So a second session the same day, which §9.2.3 says "gets its own window", is blocked too. The attempt waits for the **next day**, not the next session (minor 1).
- **What G3 must model:** k can be 0 on such a day, and clean capped takes in the band count as countable warm-half takes (minor 3).

## Answers to the brief

- **G1, G16 (a)/(b):** satisfiable on every path. Attempts open the branch earlier, and that excess is reported, not bounded.
- **G4, G12:** satisfiable. The general clauses carry the 2 ♩ rule.
- **G3 and G24:** **not met in the key session as written** (R17-1). A clamped attempt lands below the band: G24's band assertion fails, and the `preTop` warm half stalls.
- **Fingering-take leaks:** none. §9.8 still matches `done()`.
- **Legitimate loss:**
  - None from v17's rule.
  - R17-1 would lose real pass evidence, because clamped "attempts" below 0.95 × target do not count.
- **Consistency:**
  - **H2 v16 and IS:** consistent.
  - **SP §1's mark:** used everywhere.
  - **KS2:** consistent, except that the 10 % rule needs a stated exemption for attempts (R17-1). The target review already uses `known: true` (`keyCoach.ts` 456), which is the precedent.
- **§17 dependencies:** all three code fixes are in redesign-v2 and match the spec's assumptions:
  - the climb rises by at least one mark (`upLimit` in `gradedUp` and `pulseBpm`);
  - `passLog` admits band takes;
  - `wholeBpm` keeps band takes in the band.

  §17 still calls them "in flight" (minor 6).
- **Buildable without guessing:** everything except the key-session attempt pulse (R17-1).

---

## Substantive issues

### R17-1. Key-session attempts are clamped by the 10 % step limit

**Evidence.**
- **§9.2.3** picks key-session attempts "as marks so `setPulse`'s `snapDown(… + 0.5)` (≈ 270) cannot move them". This implies they are set through `setPulse`.
- **`pulseBpm` also clamps:** it lowers the ♩ while `npsOf(bpm, p) > upLimit(last, p)`, where `last = ks.lastBy[capKey]`. That is the last take of the same kind and hands, here the capped climb or a recovery take. Only `noCap` / `known: true` skips this.
- **No such flag for attempts:** the spec gives `noCap` to the closing's step rule (§9.2.2), but never to attempts. Nor does it say anywhere that fingering-chosen straight takes bypass the limit.
- **The gap is normal under Q8 (a):** the cap may be 2 marks below the probe band, and for `preTop` cells it may be anywhere below it. So the jump to the target is typically 10–25 %, while `upLimit` allows max(`stepCap`, one mark): about 10 % at 3.6 nps and 4.5 % at 7.2 nps.

**Worked cases (current code):**

| Case | Last take | `upLimit` | Attempt 1 | Attempt 2 | Result |
|---|---|---|---|---|---|
| Eighths, target ♩120 (band [114, 120]) | eighths ♩108 | ♩118.9 | 120 → **116** | none (116 is played) | In the band, but not the tempo the spec and G12/G24 expect; one attempt instead of two |
| Sixteenths, target ♩120 | ♩108 (7.2 nps, `stepCap` 0.045) | ♩112.9 | 120 → **112** | — | **Below 0.95 × target.** A clean attempt adds no `passLog` entry, and G24 fails |
| `preTop` cell, cap ♩96, target ♩120 | ♩96 | — | about ♩104–108, every session | — | The warm half never advances in the key session until E climbs, so G3's "≤ 1 practice day" bound fails |

**Fix (§9.2.3, §9.8 item 9, KS2 amendment entry, G24):**
- **The rule:** key-session attempts are set with `noCap` (`known: true`). The 10 % rule does not apply to them. They are target-level takes, like the passed A-6 target review (`keyCoach.ts` 456, `known: true`) and the H2 §1.9 probes, which play at 0.95 × target whatever came before.
- **State the pulse path:** say whether `fingerAfter`'s other straight takes (P0, the ladder, the recovery) go through `setPulse` with or without the step limit. The simplest choice is `noCap` for every `fg`-chosen straight take, since `fingerAfter` already bounds rises to one mark. P0 at T_S after a slow cold check is the only other jump.
- **KS2 entry:** add one clause, "the pass-evidence attempts are set with `known: true`, exempt from the 10 % rule".
- **G24:** add the case "sixteenths target ♩120, last take ♩108: attempt 1 is played at ♩120".

---

## Minor notes

1. **"Waits for the next session" should say "next day"** (§9.2.3, the "in-band cold check never blocks" bullet). Blocking is by the day's takes, so a second session that day is blocked too. Say so, and note that the second session's window then has k = 0.
2. **G3's key-session k still measures "≥ 2 ♩ apart in item ♩"**, against the v17 unit rule (candidate's own note value).
   - Example: target ♩94, band [89.3, 94].
   - Attempt 1 is eighths ♩92. The candidate is triplet ♩60, which is item ♩90.
   - In item ♩ it is 2 ♩ below, so G3 counts k = 2. In triplet ♩, 61.3 − 60 = 1.3, so the planner plays k = 1.
   - Fix: change "in item ♩" to "in the candidate's own note value".
3. **The §9.2.3 delay paragraph** says "k is 2 when the grid has two tempi in the band and 1 when it has one". Add "after the exclusion; 0 when the band is blocked". G3 should also count clean capped plain takes in the band as countable warm-half takes, or a fully blocked day looks like a loss that isn't one.
4. **G24 "target ♩110: attempt 1 ♩108, no attempt 2 at ♩104"** holds only for the key session. On the integer grid the old coach and list runs play 110, then 108. Scope the case to the key session, or give both.
5. **The recovery wording** in §5.5 ("whose nps is below the lowest straight nps … not in `fgDay.played`") and in the KS2 entry ("the highest unplayed mark below the day's lowest straight nps") is still the exact-nps version.
   - The v17 log says the remaining "nps" mentions are only units, but these two are comparisons.
   - §9.2.2's mirror rule and G12 (the triplet ♩66 under eighths ♩100 case) cover it, so a builder reading §9.2.2 is safe.
   - Add "by the 2 ♩ rule" in both places.
6. **§17 F6 still says "two code fixes in flight"** and the climb fix is "needed". All three have landed in redesign-v2 (`upLimit` in `gradedUp` / `pulseBpm`, the `passLog` band, `wholeBpm`). Reword to "landed; verified". Note also that `passLog` now ignores `slower` for band takes altogether. `slower: false` on attempts is then redundant for `passLog`, though harmless, and the clamped-goal `slower` still matters for the `'slow'` trace kind.
7. **§9.2.2's reason for "`markUp` and the unfixed `gradedUp` are not it (both have a `stepCap` minimum)" is stale.** `markUp` is now `markAbove`, the next mark above ♩ + 0.5. That can be a 0.5 ♩ rise across note values (e.g. 103.5 → 104), which is why it is still not SP's 2 ♩ mark. `gradedUp` is fixed. The conclusion stands; update the reason.
8. **Line references have drifted:**

   | Reference | Spec says | Now |
   |---|---|---|
   | `canTrip` | ≈ 621 | 634 |
   | The flip | ≈ 1048 | 1069 |
   | The `STEP_TAKES` limit | ≈ 1084 | 1098–1100 |
   | `closingDue` | ≈ 1166 | 1180 |
   | `gradedUp` | ≈ 174–193 | 175–196 |

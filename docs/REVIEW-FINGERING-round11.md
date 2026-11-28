# Review: SPEC-FINGERING v11, round 11 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

Both round-10 fixes are right in direction, and every round-10 minor note is addressed. Three gaps remain. All three are local and need no research or owner decision:
- **R11-1.** The new record-only `lastGood` collides with the key session's own 10 % step rule, so the closing's first A-6 take can still repeat a tempo.
- **R11-2.** Cap-hit behaviour exists only for A-6 and the old coach. Held cells on run rungs, which are now in scope through R10-2, and held cells in list runs have none.
- **R11-3.** On a below-cap day, the closing's order is undefined: does the attempts window come before or after the capped A-6 climb?

**What I checked:**
- The spec v11 in full, and round 10.
- `keyCoach.ts`: `setPulse` 261–278, `enter` 314–356, `openVisit` 388–483 (closing 403–448), `nextVisit` 493–520, the speed path 1008–1095, and the leave / time paths 1152–1189.
- `stages.ts`: `markUp` 158, `MAELZEL` 181, `snapDown` 184 and `stepCap` 200.
- `keyIndex.ts` 485–551.
- `coach.ts`: `coachTake` 329–346, `tempoOf`, `nextKeyIdx` 408–414, and `coachAfter` / `next()` 420–480.
- `Drills.tsx`: `hfSchedule` 1627, the any-note Next 1721, `go` 1731, `done()` 1748–1803, and `coachNext` / `coachGo`.
- `ladder.ts` `applyTake` 96–170, App `techResult` 2250 and its callers, `rowCounts`, the Stats / Recap / teacher readers, and the head of H2 v16 together with its H15 text.

## Round 10: status

| R10 | Status in v11 |
|---|---|
| R10-1 held closing | **Fixed for the cap-reached case.** The skip, the passed-A-6 review skip, one cap visit per cell per day with the day's pairs, and the KS2 amendment are all right. **The below-cap case is not fixed:** see R11-1 and R11-3. |
| R10-2 exits and counting | **Fixed** as hooks. The run-rung exit matches `ksAfter` 1178–1181. The time-up check sits before `next()` (coach 468). `go(j)` covers Next, the any-note Next, `hfSchedule` and the third `hfMiss`. Counting through `peDone`, plus the `pe` merge rule, is consistent. Two placement details are in minor notes 3–5. |
| Minor notes 1–8 | All addressed. Some v10 text is still stale elsewhere (minor note 1). |

**Leaks.** No fingering-take leak is left: the §9.8 branch at the top of `done()` still bypasses everything listed. **There is one new R2 leak, through plain straight takes:** list runs (R11-2).

**Lost legitimate data.** Only the accepted xp clamp. The R10-1 skip drops only closing takes that would have repeated a tempo.

**Consistency:**
- H2 v16 (H14–H17) agrees with §9.9, and its section numbers are unchanged.
- SP §21, IS R3–R5 and KS2 agree, given the U1 amendment.
- The he/en terms are consistent.

---

## Substantive issues

### R11-1. The closing's A-6 entry goes through the 10 % rule, so `lastGood` = "one mark above the highest" is clamped back onto a played tempo

**Evidence.**
- The closing enters an unpassed A-6 through `enter(a6, …, { nps: g.nps, per })` (keyCoach 430–434). `enter` calls `setPulse(…, !!at.known)` (345) with `known` unset, so the step cap applies (272):
  ```
  while (npsOf(bpm, p) > last * (1 + stepCap(last))) bpm = gridBelow(bpm)
  ```
  - `last` is `ks.lastBy[comfortKey(d)]`, and record-only mode updates it (§9.8 item 9).
  - `gridBelow` steps down by Maelzel marks.
- **Case 1: the straight part ended after a miss.** §5.5: after a miss, one mark below the lowest tempo played, and a clean take there ends the part.
  - So `lastBy` is the low recovery tempo, while `lastGood` is the highest + 1 mark.
  - Example: 100, 104, 108, 112 clean, 116 missed, then 96 clean. `lastGood` is ♩120, but the cap from 96 is about 1.06 × 96 ≈ 102, so `gridBelow` gives **♩100**, which was played straight.
  - It also starts the closing above a tempo the player has just missed, which KS2 never does.
- **Case 2: no miss, but a fast line.** `stepCap(nps)` = 0.2 · (2 / nps)^1.16 falls below 5 % above about 6.6 nps, while Maelzel steps from ♩120 up are 4.5–5.6 %.
  - Example: sixteenths at ♩120 (8 nps) gives a cap of 4.0 %, so ♩126 is clamped back to **♩120**, the highest tempo played.
  - This is the owner's own range (D major ♩100–124 in sixteenths).
- **Result:** G4 ("after a visit the first straight take never repeats a tempo played straight") and G12's R10-1 case ("the closing's first A-6 take is above every straight tempo played in visit 0") fail on real paths. §9.2.2's "Why G4 and G12 are satisfiable" is therefore not true as written.

**Fix (§9.2.2, §9.8 item 9 `lastGood`, G4, G12).**
- **Closing start** = one mark above the visit's highest **clean** straight tempo, when that mark was **not** played straight in the visit and is ≤ the cap (with no hold, ≤ the normal ceiling). The closing enters A-6 there with `known: true`, so it uses `setPulse`'s `noCap`.
  - This is safe: the start is one SP mark above a clean take played today, the same step the fingering straight ladder itself takes.
  - Say explicitly that the fingering straight ladder and this entry use SP's mark, not `stepCap`.
- **Otherwise** (that mark was played, which means it was missed, or it would pass the cap), **skip A-6 in the closing** exactly as on a cap day.
- Add two cases to G12: a visit whose straight part ended after a miss, and a scale at ≥ 7 nps. In both, the closing's first take is new or A-6 is skipped.

### R11-2. Held cells have no cap-hit rule on key-session run rungs or in list runs

**Evidence.**
- **§9.2.2's cap visit and "held" covers A-6 only.** It says "A cap visit that starts inside A-6's own climb", and the A-6 strip shows "held". The old coach has `capHeld`.
- **Key-session run rungs.** These are the scale-mode and minor run rungs of `keyIndex.ts` 493–551, which R10-2 now hooks. They climb through the same speed path (keyCoach 1048–1078).
  - With `gradedUp` clamped at the cap, `setPulse` returns the same tempo, so `ks.nps <= at` sets `dir = ['hold']` and the next take repeats the cap. This goes on until `STEP_TAKES` triggers `limit()`.
  - That is a repeat at one tempo, and a cap-made limit, which "A cap hit is not a limit" forbids but does not replace with any other behaviour.
  - Run visits left on `'budget'` are not in `ks.finished` (1164), so `nextVisit`'s `reopen(3)` can revisit them the same day. `openVisit` then resumes "at its last clean pulse" (482), which is the cap, and repeats it.
- **List runs.**
  - The hands-free raise plays `lad.next.bpm` (Drills 1796), and `applyTake` raises the stored `goalBpm` after 3 clean takes at the goal (ladder 154–157). `go` and `bpmOf` start an item at `goalBpm` (1742, 1648).
  - §9.2.1 lists no list-run climb, so a held cell in a list run plays above the cap (an R2 leak, contrary to O5).
  - If a builder clamps the raise, it repeats at the cap instead.

**Fix (§9.2.1, §9.2.2, G4, G12, G17).** Make "held at cap" one rule for every planner: a clean plain straight take at the cap of a held cell is held.
- **Key session, any rung:**
  - the first time today, it opens the cap visit;
  - after that, the visit is left as `leave = 'done'`, and a run rung is pushed to `ks.finished`;
  - the cell is not entered straight again that day except for its attempts window. This includes `nextVisit` revisits, which skip run rungs whose held cell reached the cap today.
  - A run rung shows "held", never a limit.
- **List runs:**
  - the take tempo is min(`bpmOf` or `lad.next.bpm`, cap). The stored `goalBpm` may stay as `applyTake` sets it, because it is clamped where it is read;
  - a clean take at the cap gets no raise and moves to the attempts window (if one is due), then `go(i + 1)`.
- **Old coach:** the existing `tempoOf` base from `goalBpm` is also clamped at read time.
- **Add cases:** a held mode cell's run rung reaching the cap and then revisited; and a hands-free list run with a held cell, where no take is above the cap and none repeats the cap.

### R11-3. The below-cap closing: where the attempts window sits, and what follows it, are undefined

**Evidence.**
- The main-scale hook is "at the start of the held cell's closing" (§9.2.3). On a below-cap day, §9.2.2 then enters A-6 at `lastGood` for a capped climb.
- This contradicts §9.2.3's "they are **the last straight takes** of the cell's last visit".
- The window "ends through the planner's own visit-end path", and inside the closing that path is `ks.closing && leave → end` (keyCoach 1174). So the capped climb would never run.
- A clean attempt also marks A-6 passed (§9.8 record-only), which changes what `openVisit` would do next.
- A builder has to guess, and each guess changes pass evidence. The attempts also play best warm, after the climb.

**Fix (§9.2.2, §9.2.3 key-session hook, G12).**
- **Below-cap day:** the capped A-6 climb from the R11-1 start; then the window as the cell's last straight takes; then A-7 if it is playable and time remains; otherwise the end.
  - If the climb reaches the cap inside the closing, its cap visit's variants come first and then the window, as §9.2.2 already says.
- **Cap day:** as in v11.
- Also state which visit gets the window when visit 0 itself reached the cap: the visit-0 cap visit, or the closing. Recommended: the closing, so the hook is a single one.

---

## Minor notes

1. **Stale v10 text contradicts v11:**
   - §9.2.2 ("A cap hit is not a limit"): "KS2 U1's closing plays at most at the cap, and one mark below when the cap was already played straight". After R10-1 that closing is skipped.
   - §17 F6 row: "record-only `lastGood` (one mark below a cap top)".
   - The §9.2.2 H2 amendment says "added to H2 v15". It should say v16, which is now on disk.
2. **The `technique-fingering` override:**
   - `techResult` receives its lesson id from the caller: a path step's `tech.id`, `technique-assign`, `checkpoint-tech`, or `technique` (App 2553, 2580, 2742, 2760, 5027). Say that the override happens inside `techResult`, for every caller, when there are no measured takes.
   - Then a path step's post-processing (`lessonMastered`, step stars, `pathSheetFor`) never sees a "0 of N" result under the step id.
   - No teacher screen reads `firstTry` (`TeacherProgress.tsx` doesn't). Name the real readers, Stats 900 and Recap 225, or say what the teacher sees.
   - `quests.ts` `tech3` counts every id starting with `technique`. State whether a fingering-only session counts toward "3 technique sessions".
3. **The `go(j)` hook:**
   - Fire it only when `queue[j]` (or the list's end) is not an item of the same cell, so RH → HT of one cell is not treated as "leaving" the cell.
   - Place it before the `j >= queue.length` end branch.
4. **Old-coach park path:**
   - A parked held cell goes to `c.weak` and comes back as a side review after its window, which means straight takes after the "last" attempts.
   - Let the side review also skip cells in `peDone`, or limit it to one capped take at an unplayed tempo.
5. **Run-rung window time:**
   - Neither the run-rung visit budget nor the `closingDue` test reserves the window's `budgetMs`, so a window opened at `closingDue` eats `closingMs`.
   - Include `budgetMs` in both for a held cell whose attempts are allowed.
6. **The interim drums O take** has no stated tempo. Recommended: the `orch` group's tempo, one mark up per clean take, at most the rudiment's session tempo, so D-T1's 1.25× band fills.
7. **`fgDay.played` and `capVisit` are device-only.** Two devices on one day can repeat a pair or open a second cap visit. Accept this explicitly as interim, as §9.8 item 7 does for the sounding mark.

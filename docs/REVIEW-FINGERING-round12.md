# Review: SPEC-FINGERING v12, round 12 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

The three round-11 fixes are right as rules, and every round-11 minor note is addressed. Four gaps remain. All are local and need no research. R12-4 needs one product call.
- **R12-1.** On a below-cap day, the main scale's attempts window comes after the closing climb, but nothing reserves its time or hooks the climb's own exits. So the window is usually lost.
- **R12-2.** `done()` derives `slower` and kind `'slow'` from the stored `goalBpm`. This silently drops pass-evidence attempts from `passLog`, and it turns capped list-run takes into non-evidence.
- **R12-3.** After the `known: true` entry, the closing's climb runs through `gradedUp` + `setPulse`, which stall at ≥ ♩120 in sixteenths. The §9.2.2 worked example ("climbs to ♩132") is false. Feature-off this is a key-session bug in its own right.
- **R12-4.** Checkpoint technique runs (`atTarget`, every item at target) are neither capped nor exempt.

**What I checked:**
- The spec v12 in full, and round 11.
- `keyCoach.ts`: `setPulse` 261–278, `enter` 315–359, `openVisit` 388–485 (the closing 403–448), `nextVisit` 493–514, `lastGood` writes 860/875/968, the speed path 1008–1121, and the exits 1152–1189.
- `stages.ts`: `markUp` 158, `MAELZEL`, `snapDown` and `stepCap`.
- `gradedUp` (keyCoach 174–193), simulated over ♩96–138 at 2 and 4 notes per beat.
- `coach.ts`: `coachTake` 329–346, `tempoOf` 353–360, `nextKeyIdx` 408–414, and `coachAfter` / `next()` 420–488.
- `Drills.tsx`: `bpmOf` 1651, `go` 1731, `done()` 1748–1808 (kind 1760–1762, `applyTake` 1772, the hands-free branch 1791–1806, the manual branch 1807).
- `ladder.ts` `applyTake` 96–207, `tendency.ts` `TAKE_KIND` / `eligible`, App `techResult` 2250 and the `atTarget` host (5046), and `quests.ts` 63.

## Round 11: status

| R11 | Status in v12 |
|---|---|
| R11-1 the closing's entry clamped back | **Fixed for the first take.** The start is one mark above the highest clean tempo, used only if unplayed and ≤ cap, entered with `known: true`. `enter` passes it to `setPulse(…, noCap)` (346), and the 10 % loop at 272 is skipped. Otherwise A-6 is skipped. Both worked entries hold. **The climb after the entry does not hold:** see R12-3. |
| R11-2 held at cap, every planner | **Fixed** for the key session (any rung, `leave = 'done'`, `ks.finished`, no reopen), hands-free list runs and the old coach. Read points: see minor note 5. |
| R11-3 below-cap closing order | **The order is fixed** (climb → window → A-7 or the end). **The window's time and entry are not fixed:** see R12-1. |
| Minor notes 1–7 | All addressed. `fgDay` device-only: accepted (see below). |

**Answers to the brief:**
- **G4 / G12 on every path:** yes for the first take after a visit. No for the closing's later takes at ≥ 8 nps (R12-3). The G12 window assertion fails on below-cap days (R12-1).
- **"Held at cap" complete for every planner:** yes, except checkpoints (R12-4) and two read points (minor note 5).
- **Fingering-take leaks:** none. The `done()` top branch still bypasses everything §9.8 lists.
- **Legitimate data lost:** yes, through R12-2: attempt `passLog` entries, and list-run evidence on held cells.
- **Device-only `fgDay.played` / `capVisit`:** acceptable as interim. The cost is a repeated tempo or one extra cap visit, never a measured outcome. It holds only if `played` records every straight take (minor note 2).
- **Consistency:**
  - H2 v16 (§9.9), SP §21 and IS R3–R5 agree.
  - KS2: the amendment entry misses the below-cap change (minor note 8).
  - he/en: consistent.

---

## Substantive issues

### R12-1. The below-cap closing's attempts window has no reserved time and no entry from the climb's exits

**Evidence.**
- In the closing, `openVisit` sets `visitBudget = remaining` (keyCoach 402). The budget check is skipped there (`!ks.closing`, 1158).
- Every exit of the climb (target, KS2 limit, time) returns at 1174: `if (timeUp || (ks.closing && leave)) … end: true`.
- v12 places the main-scale window **after** the climb on a below-cap day (§9.2.2 "closing order", §9.2.3 hook). It only says that the window's own end does not take that path.
- So in practice the climb runs until `timeUp` or a limit, and the session ends without the window.
  - The run rungs and the old coach reserve `budgetMs` explicitly. The main-scale closing does not.
  - This is the main path for `preTop` held cells, and those cells rely on one window per session (G3's ≤ 1-day bound).

**Fix (§9.2.2, §9.2.3 key-session hook, G12).**
- On a below-cap day, for a held cell whose attempts are allowed and whose window is still due, the closing's climb **yields when the remaining time ≤ the window's `budgetMs` + one take**.
- At 1174, `ks.closing && leave` and that yield open the window instead of `end`. Only after the window do A-7 or the end follow.
- G12: a below-cap closing that climbs until time is short still plays exactly one window inside the session.

### R12-2. `slower` and kind `'slow'` read the stored `goalBpm`, which drops attempts from `passLog` and list-run takes from evidence

**Evidence.**
- `done()` passes `slower: bpm < st0.goalBpm * 0.99` to `applyTake` (Drills 1772). `applyTake` logs `passLog` only when `!opts.slower` (ladder 143), whatever the ≥ `PASS_SHARE` × target clause says.
  - `goalBpm` rises to the target through raises (`capped`, ladder 107/163), and v12 lets it stay there ("clamped at read").
  - Example: a `preTop` cell with target ♩110 and `goalBpm` 110. Attempt 1 at the highest mark ≤ target (♩108) and attempt 2 one mark lower are both "slower", so **neither enters `passLog`**.
  - The spec says the attempts "feed the warm half of the V1 pass". G3 models each clean attempt as counted, so G3's delay bound would be computed on evidence the code discards.
- In list runs, the kind is `'slow'` when `bpm < goalBpm * 0.99` (Drills 1762).
  - With the cap clamp at `bpmOf`, every straight take of a held cell whose stored goal is above the cap traces as `'slow'`.
  - `TAKE_KIND.slow` is all false (`tendency.ts` 29), and §3.1 admits only normal, retention, review, challenge and probe.
  - So these takes leave `fingerEvidence`: they cannot feed T1/T2, the §11.3 check, confirmations, or the no-answer E rise (§9.4). That is the very evidence that lifts the hold.

**Fix (§9.2.1, §9.2.3, §9.8, G24/G12).**
- In `done()`, for a held cell, `slower` and the list-run kind compare against the **clamped** goal, min(`goalBpm`, cap).
- Pass-evidence attempts always pass `slower: false`, because they are planned target takes, not "Slower".
- Add `done()` (1762, 1772) to the list of `goalBpm` read points.
- Test: two missed-then-clean attempts below 0.99 × `goalBpm` each push one `passLog` entry, and a capped list-run take traces `normal`.

### R12-3. The closing's capped climb stalls at ≥ 8 nps, so the worked example is false (and the same stall exists feature-off)

**Evidence.**
- After a clean take, the speed path calls `gradedUp(at, …)` (keyCoach 1057). When no mark lies within `stepCap(at)`, it returns an off-grid value `min(cap, cur × 1.03)` (190).
- `setPulse` then snaps it down with `snapDown(… + 0.5)` (270), back to the same mark, and 1070 sets `dir = ['hold']`.
- Simulated: at 4 notes per beat, ♩116 → 120 works, but **♩120, 126, 132 and 138 all stay put**. Clean holds never hit `STEP_TAKES` (1084 is the not-clean branch), so they repeat until the time runs out.
- §9.2.2's example ("enters at ♩126 … and climbs (capped) to ♩132") therefore repeats ♩126 in the closing.
- Feature-off, the same stall pins every sixteenth-note speed stage at ♩120. Even the `o.target` return is clamped back by the 10 % loop at 272. This breaks key-session-must-develop ("rise every clean take"), and it is the owner's own range (D major in sixteenths).
- `markUp` (stages 158) has the same `stepCap` minimum. A builder who uses it for "SP's mark" in the fingering straight ladder gets the same repeat.

**Fix.**
- **This spec (§9.2.2, §5.5):** the held closing's climb steps one SP mark (the next Maelzel mark, ≤ cap) per clean take with `noCap`, the same as the fingering straight ladder. Name `markUp` and `gradedUp` as **not** the SP mark. Correct the worked example. In G12, add the closing's second and third takes at ≥ 8 nps.
- **Separately, to the owner:** a key-session fix. When no mark fits under `stepCap`, `gradedUp` should take the next mark, and `setPulse`'s 10 % loop should allow one mark. This needs its own small spec note and test, because it changes feature-off climbs.

### R12-4. Checkpoint technique runs are neither capped nor exempt

**Evidence.**
- `atTarget` (App 5046, `drillFrom === 'check'`) makes `bpmOf` return `itemTargetBpm` for every item (Drills 1651). The result is `checkpoint-tech` (App 2553).
- §9.2.1 caps "every plain straight take", and §9.2.3's exemption list names the level test and the placement probe but not checkpoints.
- Capping makes a held cell's checkpoint unpassable at target, which is a path effect that §9.6 forbids. Exempting plays the slip above the edge.
- A builder has to guess, and the two answers change path progress differently. It is also unstated whether a checkpoint hosts fingering visits or windows.

**Fix (§9.2.3, G12).**
- Recommended: **exempt** checkpoint takes like level-test takes (one take per item, at target, a test), with no fingering visits, blocks or windows inside a checkpoint.
- Alternative: cap them, and let the checkpoint read a held cell as "held" rather than failed.
- Either way, state it and add a G12 case.

---

## Minor notes

1. **`lastGood` is overloaded.**
   - Record-only mode sets it to an *unplayed* mark (§9.8 item 9), and leaves it undefined when A-6 is skipped. Other readers expect the last clean pulse: A-7's `from` start (keyCoach 354), `switchSpec` (372), the limited review (432), the known-rung warm-up (459) and the reopen resume (482).
   - Keep `lastGood` as the last clean pulse, and store the closing start in its own field (e.g. `ks.fgStart[itemId]`).
2. **`fgDay.played` must record every straight take of a held cell, in every planner,** including the ordinary A-6 and run-rung climbs outside `fg`.
   - Say that the below-cap closing rule also applies on non-visit days, where "the visit" is visit 0's climb, and that it reads `fgDay.played`, never `ks.lastGood`.
   - Otherwise G12's check runs on incomplete data.
3. **Compare tempi in nps after the per conversion.**
   - The closing converts triplets to eighths (`g.per === 3 ? 2`, keyCoach 434) and snaps them. Triplet ♩100 (5 nps) becomes eighths ♩150, which snaps to ♩144, the nps of triplet ♩96.
   - The "not played today" test must use the converted, snapped nps.
4. **Text: `STEP_TAKES` does not fire on clean holds.** §9.2.2 says `dir = ['hold']` repeats "until `STEP_TAKES` fires `limit()`", but 1084 fires only on a not-clean take. The rule is right; the explanation is wrong.
5. **Read points that the clamp list misses.**
   - The manual list path `setBpm(lad.next.bpm)` (Drills 1807).
   - `lad.message` ("Clean at ♩X, today's goal ♩Y", with Y above the cap) on a clean cap take: use the hold line instead.
   - `tempoOf`'s base also takes `cleanBpm × 0.94`, `target × carry × 0.94` and `otherKeys × CARRY_KEYS` (coach 358). For `preTop` cells these exceed the cap, so clamp the **result**, not only `goalBpm`.
6. **The list-run window placement.** The queue is known up front, so place the window after the **last** queue item of the cell. Otherwise a later LH or HT item of the same cell plays straight after the "last straight takes".
7. **G12 wording:** "plays no take above the cap" should read "no plain take above the cap other than the attempts".
8. **The KS2 amendment entry** (§9.2.2) covers only the cap-reached case. Add the below-cap change: start one mark above the highest clean tempo with `known: true`, else skip A-6.
9. **The drums O take after a miss:** the tempo rule is unstated (stay, or one mark down). Recommended: one mark down, floor the comfort pulse, never a repeat of a missed tempo.

# Review: SPEC-FINGERING v9, round 9 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

R8-1 and R8-4 are fixed. The R8-2 and R8-3 fixes are right in intent, but each still misses one fact in the code:
- **R8-2:** the key-session visit inherits visit 0's warm-up state. Also, the closing re-enters A-6 at `lastGood`.
- **R8-3:** the old coach's `nextKeyIdx` wraps back to the held key.

The round-8 fix to R8-1 brings in a new reward side effect: putting fingering takes in the result's `total` changes gems, the "perfect" counters and badges. Separately, the pass-evidence attempts have no driver outside a fingering visit, and Q8 (a) depends on them in every session.

All four are local fixes. None needs research or an owner decision.

**What I checked:**
- The spec v9 and round 8.
- `cloud.ts` `rowCounts`.
- `keyCoach.ts`: `openVisit`, `nextVisit`, `ksAfter` (the warm-up branch 970–982, the visit tail 1152–1197, `maybeChallenge`), `WARM_TAKES` = 2.
- `coach.ts`: `coachAfter` in full (plateau, pass, park, almost), `nextKeyIdx`.
- `Drills.tsx`: `go`, `done()` (the `kind` rule at 1761, the hands-free branch), `coachNext`, `coachGo`, `persistCoach`.
- App: `take()`, `noteTake`, `techResult`, `notePathResult`, `drillFamilies`.
- `drillMerge.ts` `mergeItem` / `sameItem`, `types.ts` `ItemState`, `coachRun.ts` queue saves, `tendency.ts` `TAKE_KIND`.
- The result readers in `stats.ts`, `progress.ts`, `achievements.ts`, `ladderFacts.ts`, `practice.ts`.

## Round 8: status

| R8 | Status in v9 |
|---|---|
| R8-1 result sync | **Fixed for sync.** `rowCounts` (cloud.ts 89–94) clamps rows to `total` 1–50, `first_try ≤ total` and `xp ≤ total × 20`, so a fingering-only result uploads. The fix itself creates R9-1. |
| R8-2 key-session open/close | **Partly fixed.** It is right not to call `openVisit` and to leave by the `leave = 'budget'` path. What is still wrong: the leftover `warmLeft`, `warmNext` and `review`; a cold take whose own `ksAfter` already leaves the visit; and the closing's re-entry at `lastGood` (R9-2). |
| R8-3 old-coach end of visit | **Partly fixed.** The record-only rule (no `c.at`/`peak`) and the park-path reset are correct. "Done for the session" has no mechanism: `nextKeyIdx` serves the held key again (R9-4). G12 still carries the v8 sentence (minor 1). |
| R8-4 queue continuation | **Fixed** for fingering visits. The attempts outside a visit are R9-3. |
| Minor notes 1–8 | All addressed. The stand-in is complete. On an old client, `mergeItem` keeps the newer-`last` copy whole with `history: []`, so `sameItem` holds. `drillFamilies` is filtered. |

**Leaks.**
- No fingering take reaches `applyTake`, `take()`, `recordDrill`, `coachAfter`, the badges, Momentum or `noteTake` (the §9.8 branch at the top of `done()` holds).
- The one new indirect effect is R9-1: fingering takes counted in `total` lower measured reward counters.
- **Lost legitimate data:**
  - R9-3: pass-evidence attempts that never run in the key session's closing, or on rationed days. This delays passes beyond what G3 models.
  - R9-2: straight takes inside the visit are labelled `retention`/`review`.

---

## Substantive issues

### R9-1. Fingering takes in `total` cost gems, "perfect" counts and badges

**Evidence.** The technique result written by `techResult` (App 2250–2257) feeds every history reader that uses `firstTry / total`:
- `addSessionStats` (progress.ts 1497): `goodSessions` needs ≥ 80 %, and `gemsOf` (1532–1537) turns it into **gems**;
- `stats.ts` 400–403: `counts.perfect` and `records.fastPerfect` need `firstTry === total`;
- `achievements.ts` 84: `historyPerfect`, a badge counter;
- `bestSessions` (stats.ts 630), the Recap's `firstTry/total`, and `lessonQuality` (practiceTime 240) where results are booked.

Technique path steps are safe: `notePathResult` returns early for `tech`, and `workoutCreditsStep` uses the level rule.

**The effect.** Take a session of 10 clean straight takes and 4 fingering takes:
- with the feature off it is perfect: 10/10, a gem-eligible good session, and it counts toward the perfect counters;
- under v9 it is 10/14 = 71 %: no good session, no gem, no perfect count.

So doing the fingering work the coach asked for removes rewards. That is a feature effect on rewards, which §8.5 and §14.1 exclude. It also teaches the player to decline fingering work (§14.2 says escaping is free; it should also be free to stay). And it shows the teacher fingering takes as failures, although they are not graded on the item.

**Fix (§9.8 item 5, G24).**
- **When measured takes exist:** the result's `total` and `firstTry` stay **measured-only**. The fingering XP still rides in `xp`. If `xp` would pass `total × 20`, `rowCounts` clamps it; state that this is accepted, or raise `total` only by what the XP needs.
- **A fingering-only session** (measured = 0) writes `total = fgTakes` and `firstTry = 0`. It is never good or perfect, which is neutral because the session would not exist with the feature off. It still counts as a practice day and as league XP.
- G24 adds:
  - a mixed perfect session stays perfect, and its `goodSessions`, `counts.perfect` and `historyPerfect` are unchanged against the feature-off run;
  - a fingering-only session uploads (as now).

### R9-2. The key-session visit still inherits visit 0's warm-up state, and the closing repeats a tempo

**Evidence.**
1. **The leftover warm-up.** On an acquired (known) rung, `openVisit` for visit 0 takes the U1 branch (keyCoach 453–467): `warmLeft = WARM_TAKES` (= 2), `warmNext = open[0]`, and `review = !!g`.
   - After the cold take, `ksAfter` (970–982) leaves `warmLeft = 1`.
   - v9 opens `fg` without `openVisit` and resets only `visitAt`, `visitTakes` and `visitBudget`. So `warmLeft` stays at 1 for the whole visit, because record-only never decrements it.
   - In `done()` (Drills 1761) every straight take in `fg` (P0, the ladder, the attempts) is therefore labelled **`retention`** or **`review`**. This is the exact mislabel that R8-2 named as the reason to avoid `openVisit`.
   - `TAKE_KIND.retention` and `TAKE_KIND.review` carry `passes: false` (tendency 27, 32). If H2 step 1 reads `passes` from the kind, a clean attempt at target inside the visit would not count.
2. **The cold take can already leave the visit.** v9 runs the cold take through `ksAfter` in normal mode, then opens `fg`. But that call can itself return a visit change, which runs `nextVisit` and then `openVisit(nv)` (1178–1188), or `end` (1174). This happens when `closingDue`, at `timeUp`, or when the warm-up count reaches 0 with `warmNext < 0`.
   - "The rest of the current visit" would then run inside the next rung's visit.
   - The end's `nextVisit(cur)` would skip that rung.
   - In a fresh-entered (rotating or run) visit, the cold take's `maybeChallenge` can also leave `chal.pending` set.
3. **The closing starts on a tempo already played.** For an unpassed A-6, the closing enters at `ks.lastGood[d6.itemId]` (openVisit 430–434), not at `flow`. Record-only sets `lastGood` to the visit's top clean straight take. So the closing's first take repeats that tempo, and at the cap the closing can only repeat. This contradicts §9.8 item 9 ("never repeats a tempo played straight in the visit") and G4 ("after a visit the first straight take never repeats").

**Fix (§9.8 item 9 "Opening and closing", §9.2.2, G4, G12).**
- **At `fg` open,** also set `ks.warmLeft = 0`, `ks.warmNext = -1`, `ks.review = false` and `ks.reviewHere = false`, and clear `ks.chal.pending`. Straight takes inside `fg` are then `normal`.
- **`fg` opens only when** the cold take's `ksAfter` result has no `end`, the same visit (`inf(lv(fam, c)).visit` unchanged) and `!ks.closing`. Otherwise the fingering visit moves to the cell's next visit that day (in practice the closing case below), or it does not run today.
- **Record-only `lastGood` for the main item** = the next tempo to serve: one mark above the visit's top clean straight tempo, at most the cap. When the top take was at the cap, use one mark below it, so the closing's A-6 entry never repeats a tempo. Alternatively, the closing of a held cell skips A-6's straight climb when the cap was played straight today (see R9-3).
- G4 and G12 add three cases: a known rung (`WARM_TAKES` = 2) whose visit's straight takes trace as `normal`; a cold take that triggers `closingDue`, where no `fg` opens; and the closing's first A-6 take, which is never a tempo played straight in visit 0.

### R9-3. The pass-evidence attempts have no driver outside a fingering visit

**Evidence.**
- Q8 (a), §9.2.3 (M2) and G3 need the attempts **in every session in which a held cell is played**. They are "the last straight takes of the cell's last visit". In v9 only `fingerAfter` drives attempts, and it runs only while `fg` is open.
- **Key session.** The scale cell's last visit of every session is the **closing** (`nextVisit` never reopens visit 0, and the closing returns to the scale), not the fingering visit in visit 0. The closing runs in normal `ksAfter`, which knows nothing of attempts. A cap visit opens inside it only if the closing's A-6 climb reaches the cap.
  - If it misses first, if A-7 or a review opens instead, or if the closing ends at `timeUp` (1174), no attempt runs.
  - No time is reserved: the closing is `closingMs` (≤ 3 min), and a cap visit with up to 2 variants plus 2 attempts can overrun it.
- **Old coach, linear path and list runs on days without a fingering visit.** §7.1 rations visits ("at least every third visit straight", ≥ 10 min, ≤ 2 cells), so many sessions have none. The cell then leaves by the existing `coachAfter` paths (pass, park, plateau, `capHeld`) or by `go(i + 1)` / the third `hfMiss`. None of these has a hook for "the attempts before moving on". `capHeld` says "after the planned attempts", but nothing plans them there.
- **The consequence:** in the main planner the attempts run rarely, so the warm half of a held cell's pass waits longer than G3 models. G3's ≤ 1-day bound for `preTop` cells would then not describe the built system.

**Fix (§9.2.3, §9.8 item 9, G3, G4, G12).** Add one rule: **an attempts-only `fg`** (`kind: 'attempts'`, `budgetTakes` 2, `budgetMs` = 2 take lengths with count-ins), run by `fingerAfter` and ended by the planner's own visit-end path. It opens when a held cell with attempts allowed and none clean today (`pe`) is about to be left for the session:
- **Key session:** at the start of the held cell's closing, the closing plays the attempts first and then ends, or plays A-7 if it is open and time remains. The capped A-6 climb in the closing is skipped on such days, since it could only repeat tempi below the cap. Without allowed attempts, the closing is as now (capped, with no repeated tempo, R9-2).
- **Old coach:** before any path that leaves the cell (pass, park, plateau, `capHeld`), when the cell's run has had no fingering visit today. The park and plateau resets run after the attempts.
- **List runs:** before `go(i + 1)` from the held item, including after the third `hfMiss`. Standalone runs before they end.

G3 models this exact placement. G4 and G12 assert one attempts window per session per held cell in each planner, inside its time.

### R9-4. Old coach: "done for the session" has no mechanism, because `nextKeyIdx` wraps back

**Evidence.**
- §9.8 item 9 ends a held cell's visit with `keyIdx = nextKeyIdx(c)` and claims the cell "is not served straight again in the session".
- But `nextKeyIdx` (coach 408–414) loops k = 1…n over all keys, **including the current one at k = n**. It returns the held key itself when every other key is passed. Later laps (all keys passed: `(keyIdx + 1) % n`) also come back to it.
- So in a family run where the other keys are done, the held cell is served straight again at once. With `c.at` reset it starts over from `tempoOf`, which repeats straight tempi already played in the visit (key-session-must-develop) and replays the climb to the cap.
- The one-cell rule does not catch this case: it tests only `c.keys.length === 1` or a standalone run.

**Fix (§9.2.2, §9.8 item 9, G12, G17).**
- `CoachState` gains `fgDone: string[]`, the cell keys finished for the session; it is saved with the run.
- `nextKeyIdx` and the weak-spot review skip keys whose cell is in `fgDone`, and so does the step's key choice in `coachTake`.
- **One-cell is defined as "no key or item left that is not in `fgDone`"**, which includes the multi-key case above. The §9.2.2 rule then applies (fingering takes only, then the hold line).
- G12 adds: a three-key run with two keys passed never serves the held key straight after its visit.

---

## Minor notes

1. **Stale v8 text that contradicts v9:**
   - G12 still says "the old coach updates `c.at`, `peak` and `c.passed` / `passedNow`" in its record-only sentence, and two sentences later says "record-only never touches `c.at` or `peak`".
   - §17 F6 still lists "`openVisit` / `ks.finished` / `nextVisit` around a key-session visit" beside the v9 "opened without `openVisit`".
   - Delete the v8 phrases.
2. **A cap visit inside the closing.** State three things:
   - its end is the session's end (`ks.closing && leave` → `end`, as at 1174);
   - "yield when less than `closingMs` remains" does not apply inside the closing;
   - its budget is min(§7.2's cap budget, the time left).
3. **Upgraded old clients.** A device that ran an old version holds `fg:` rows in `drillItems`, and `rebuildProgress` keeps them. On load, move them into `progress.fingering` through `mergeFingerCell` and delete them from `drillItems`, so a stale copy can never be loaded and pushed.
4. **Drums depend on the SP feel pool.** That pool is not built (§2.4 says the rotation is not in `coach.ts`). Until it exists, either name a host for orchestrated takes (for example one O take after the cold check every fourth session of an acquired sticking rudiment, in the old coach), or state that D-T1 waits and that v1 drum flags come from D-T2 and D-T3 only.
5. **The closing's A-6 item.** The closing enters `stageDrill(a6, 0)`, spec 0, which may not be the cell's main (HT) item. State which item the capped closing and the attempts play: the main item, as §9.8 says for the old coach.
6. **Consistency checks.**
   - SP §21 (visit-budget entry, §16.7 `!` entry), KS2 (U1 closing, D3 flow, limit rules) and IS R3–R5 agree with v9.
   - H2 on disk is still v15. §9.9's v16 alignment is consistent.
   - The he/en copy is consistent: "אצבוע" is masculine, "מנח יד", "השהיה" vs "עצירת טמפו", "פרצים".
   - Statistics: the T1/T2 thresholds, the §11.3 check and the Beta-gate examples (5/10 vs 2/10 ≈ 0.91 fails; 6/10 vs 1/10 passes) are unchanged and correct.

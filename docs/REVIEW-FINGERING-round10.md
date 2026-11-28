# Review: SPEC-FINGERING v10, round 10 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

All four round-9 fixes are right in direction. R9-1 and R9-4 are fixed. Two gaps remain:
- **R9-2:** the closing fix still repeats tempi, and on every held day there is no legal tempo for it to play.
- **R9-3:** the attempts-only window has no hook at three real exits: the key session's run rungs, the old coach's time-up, and the manual or any-note `go(i + 1)` in list runs.

Both are local fixes. Neither needs research or an owner decision.

**What I checked:**
- The spec v10 and round 9.
- `keyCoach.ts`: `enter` 300–356, `openVisit` 388–483, `nextVisit` 493–520, `ksAfter` 950–985 and 1150–1197.
- `coach.ts`: `coachTake` 329–346, `tempoOf`, `nextKeyIdx` 408–414, `coachAfter` 420–680 (side review, plateau, pass, almost, park, time-up in `next()`).
- `Drills.tsx`: `persistCoach` 1583, `hfSchedule` 1627, the `useAnyNote` Next 1721, `go` 1731, `done()` 1748–1814, `coachNext` / `coachGo` 1817–1883.
- `App.tsx`: `noteTake` / `techResult` 2244–2257 and every `techResult` / `recordCompletion` caller (path, checkpoint, repertoire, real / taste starts).
- `cloud.ts` `rowCounts` 89–95.
- The result readers: `progress.ts` 871, 1497, 1532; `stats.ts` 394–403, 630; `achievements.ts` 84; `practice.ts` `bookResult` 233–250; `practiceTime.ts` `lessonQuality`; `ladderFacts.ts` `workoutCreditsStep`; `path.ts` `stepStars`.
- `coachRun.ts`: day and version filters.
- `keyIndex.ts` 490–551: the scale rungs in the key ladder.

## Round 9: status

| R9 | Status in v10 |
|---|---|
| R9-1 rewards | **Fixed.** With measured takes, `total` and `firstTry` stay measured-only, so `goodSessions` / `gemsOf`, `counts.perfect`, `records.fastPerfect`, `historyPerfect`, `stepStars` and `lessonQuality` match the feature-off run. A fingering-only session (`firstTry` 0) is never good or perfect. `workoutCreditsStep` uses the level rule for tech steps, and `markRealDone` / `markTasteDone` still need measured `t0 > 0`. The xp clamp (`rowCounts` 93) touches only the server copy; it is accepted and stated. G24 still has one stale v9 sentence (minor 1). |
| R9-2 warm-up / cold take / closing | **Warm-up and cold take fixed.** The reset matches `openVisit` 395–396, 416–418 and 463–466, and the `kind` rule (Drills 1761) then gives `normal`. The same-visit gate covers the `ksAfter` exits at 1174 and 1178. **The closing is not fixed: R10-1.** |
| R9-3 attempts driver | **Partly fixed.** The window and the hooks named in v10 are right, but three exits have no hook, and the open condition counts per day while the rule counts per session (R10-2). |
| R9-4 `fgDone` | **Fixed** for the case raised. The fallback branch of `nextKeyIdx` and the "one-cell" definition contradict each other (minor 3). |
| Round-9 minor notes | All addressed. On drums, the interim host has a statistics problem (minor 4). |

**Leaks.**
- None found. The §9.8 branch at the top of `done()` bypasses `applyTake`, `onTake` / `take()`, `recordDrill`, `afterTake`, `coachAfter`, `recordTakeAnalysis`, `noteChannel` and the badges.
- Results are measured-only, and `fgTakes` is used only for a fingering-only session.

**Lost legitimate data.**
- The accepted xp clamp only.
- R10-2: pass-evidence attempts that never run in sessions that end on time or on a held run-rung cell. This delays passes beyond what G3 models.

---

## Substantive issues

### R10-1. A held cell's closing has no tempo it may play, so the v10 `lastGood` rule repeats tempi

**Evidence.**
- **The straight ladder climbs one mark at a time.** §5.5: start at T_S, "each clean straight take is followed by one a mark faster, up to the ceiling". So every mark from T_S to the cap has been played straight in a visit that reached the cap.
  - v10 sets record-only `lastGood` to "one mark below the cap" when the top take was the cap.
  - `openVisit` (keyCoach 430–434) enters an unpassed A-6 at exactly `lastGood` (`enter(..., at)` → `setPulse(at.nps)`, 345).
  - So the closing's first take repeats cap − 1. The next clean take climbs to the cap, which is a repeat too. Then a cap visit opens inside the closing (§9.8 item 9) and plays variants again.
  - `FgVisit.played` is per visit, so nothing stops those variants repeating visit 0's (structure, rung, tempo) pairs.
- **This happens on every held day on which visit 0 reached the cap,** with or without a planned fingering visit, because a cap visit inside A-6's own climb "uses the same opening and the same end".
  - v10 skips the capped A-6 climb only when attempts are allowed (§9.2.3 key-session hook).
  - Non-`preTop` cells far from the band, the long-hold case, therefore repeat the visit in the closing every session.
- **When the top is below the cap** (the ladder stopped on a miss at top + 1 mark, then stepped down per §5.5), `lastGood` = top + 1 mark is the tempo that was just missed, played straight in the visit.
- **A passed A-6 on a held cell** (a relapse on a passed item): the closing takes the `review(a6, stretchTarget)` branch (keyCoach 446), which plays plain straight takes at the target, above the cap. §9.2.1 lists the closing as capped, but no rule covers this branch.
- **So G4's rule cannot be met by any build:** G4 says "after a visit the first straight take never repeats a tempo played straight", and G12 R9-2 says "the closing's first A-6 take is never a tempo played straight in visit 0". §9.2.3's phrase "capped, no repeated tempo" has no tempo left to use.

**Fix (§9.2.2, §9.2.3 key-session hook, §9.8 item 9, G4, G12).**
- **The rule:** a held cell whose straight takes reached the cap today **skips A-6 in the closing, every day,** whether or not attempts are allowed. Its closing plays, in this order:
  - the attempts window, if attempts are allowed and none ran today;
  - A-7, if it is open and time remains;
  - otherwise it ends at once with the summary and the hold line.
- **A passed A-6 on a held cell** also skips the `review(a6, target)` branch.
- **A cap visit opens at most once per cell per day.** Keep the (structure, rung, tempo) pairs played per cell per day (in `fgDay`, or by carrying `played` over), not per visit.
- **Define record-only `lastGood` for the main item** as one mark above the highest straight tempo played in the visit, clean or missed, at most the cap. If that would pass the cap, the skip above applies.
- Restate G4 and G12 in these terms. Add a case: a non-`preTop` held cell, attempts not allowed, visit 0 reaches the cap, and the closing plays no A-6 take.
- Add the closing skip to the KS2 amendment list, since it changes KS2 U1's "A-6 resumes where it stopped".

### R10-2. The attempts window is missing at three exits, and "per session" vs "per day" is undefined

**Evidence.**
1. **Key session, held cells on run rungs.**
   - v1 scope is every scale mode (§1.5). The key ladder holds several scale-kind run rungs besides the main scale: melodic and natural minor `scales-18/33/35/17`, the modes `scales-19/21/22/24/26`, and `scales-4/8/11/13` (keyIndex 493–551).
   - The spec already gives these cells fingering visits ("a rotating/run rung's visit", §9.8 item 9).
   - The only key-session hook is "at the start of the held cell's closing", and the closing returns only to the main scale (`openVisit` 405–407).
   - So a held mode cell gets attempts only on days with a fingering visit. On rationed days it gets none: the gap R9-3 named, still open for these cells.
2. **Old coach and linear path, the time-up exit.**
   - `coachAfter`'s `next()` ends the session at `timeUp` (coach 468) while the coach is on whatever cell is current. That exit is not in the hook list (pass, park, plateau, `capHeld`).
   - "The time is reserved before it opens" leaves no time once `timeUp` holds.
   - A timed one-key assignment whose held cell never reaches the cap therefore never runs the attempts, and neither does a family run that ends on the held key.
3. **List runs: Next and any-note.** In manual runs `go(i + 1)` is called from the review's Next button and from `useAnyNote(... () => go(i + 1, true))` (Drills 1721), not only from `hfSchedule`. A hook placed "before `go(i + 1)`" in the hands-free branch misses these, and a stray note in a manual run skips the open `fg`.
4. **Counting.**
   - §9.2.3 says "up to 2 attempts **per session**". The open condition says "no clean attempt **today** (`pe`)". `FingerCell.pe` is `{ day, n, clean }` (§15.1), and `pe` has no merge rule in the §15.1 merge list.
   - A second session the same day after two misses is allowed by one rule and blocked by the other. G3's "every session" model depends on which rule holds.
   - In the key session, line 56 ("no second window that day") and the `pe` condition disagree when the cap-visit attempts missed: the first allows no second window, the second allows one.

**Fix (§9.2.3, §15.1, G3, G12).**
- **Key session, run rungs:** for a held cell on a run rung, the window opens **when its visit is left** (`leave` = `'done'` or `'budget'`, or `closingDue`), before `nextVisit` or `openVisit(closingV)`. It opens once per session: a later revisit does not open another.
- **Old coach and linear path:** add the time-up exit. When `fingerAfter` / `coachAfter` sees that the remaining time is ≤ the window's `budgetMs` while on a held cell with allowed attempts and none run this session, it opens the window instead of the next ordinary take. The session then ends after the window.
- **List runs:** put the hook **inside `go(j)`** for `j > i` while the current item is a held cell (it then runs `fg` and calls `go` again at its end), so the Next button, the any-note Next, `hfSchedule` and the third `hfMiss` are all covered.
- **Counting:** one window per **session** per held cell, at most 2 attempts, stopping at the first clean one. Track it in the run state: `CoachState.peDone: string[]`, and in the queue save for list runs.
  - Keep `pe` as the per-day record for touch point 2 and telemetry only. Give it a merge rule: newest `day`; within a day, max `n` and OR of `clean`.
  - State whether a second session the same day gets a window. Recommended: yes, as G3 models "every session". A clean attempt still feeds V1's "≥ 2 days" rule correctly.
- G3 places the window at these exits. G12 adds three cases: a held mode cell on a rationed day gets its window, a timed one-key held run that never reaches the cap gets its window before the end, and a manual list run's any-note Next runs the window.

---

## Minor notes

1. **Stale v9 text in G24.**
   - The isolation list says "`drillSession.fgTakes` grows by one (so the result's `total` grows and `firstTry` does not)". That contradicts R9-1 and the later G24 case "10 clean + 4 fingering write `total` 10".
   - Replace it with "`fgTakes` grows by one; the result's `total` / `firstTry` are unchanged when measured takes exist".
   - Also: `drillSession` is reset to `{ takes: 0, clean: 0 }` at about 20 places in App. Give the ref a type that includes `fgTakes`, so that `tsc` flags every reset.
2. **A fingering-only session reads as "0 of N" to the teacher and in Stats / Recap** (Stats 900, Recap 225). It also books a ledger item `l:technique` with `c: 0` (`bookResult`, practice.ts 248).
   - Write it under its own lesson id, for example `technique-fingering`. Show it as "Fingering work · N takes" in the teacher view and Stats instead of a share.
   - Skip the `l:` item entry for it. `bookFingerTime` already booked the time.
3. **`nextKeyIdx` fallback vs "one-cell".**
   - When every unpassed key is in `fgDone`, the fallback `(keyIdx + 1) % n` (coach 413) laps over passed keys, as the feature-off run does.
   - The definition "no key left that is not in `fgDone`" therefore makes a run whose other keys are passed **not** one-cell. But §9.2.2 and §9.8 list exactly that case as one-cell.
   - Choose one. Recommended: lap over the passed keys, skipping `fgDone`, as with the feature off. One-cell then means only "every key is in `fgDone`", and the third example is deleted.
   - Also state that the fallback skips `fgDone`. A new day's run starts with empty `fgDone`: `coachRun.ts` already drops other days' runs.
4. **Interim drums host: D-T1 almost cannot fire.** One O take in every fourth session of a rudiment, while D-T1 needs ≥ 2 orchestrated takes with a wrong pad within 7 days. That means at least 8 sessions of one rudiment in a week. Use **one O take after the cold check in every session** of an acquired, consented rudiment until the feel pool ships (1 XP, a few seconds), or widen D-T1's window to 28 days for the interim. Otherwise "D-T1 has data in v1" is true but no flag ever results.
5. **Plain straight takes outside the listed climbs.** The old coach's side takes, `c.side` `review` and `warmup`, play at `goalBpm` (coach 335), which can be above the cap. Add them to §9.2.1's capped list, or exempt them explicitly, and make the side review skip `fgDone` cells (already stated) and cap held ones.
6. **The closing after the attempts.** In `ksAfter` the closing ends the session on any `leave` (1174). Say that the attempts window inside the closing returns to `openVisit`'s A-7 branch (`enter(a7)`) when A-7 is playable and time remains, and otherwise ends the session.
7. **Copy for the attempts window.** There is no line for it. Add one, for example en "Two tries at the target, ♩120." / he "שני ניסיונות ביעד, ♩120.", with `speakable` covering it. State that it is not a new task kind, so there is no brief.
8. **Consistency.**
   - SP §21 (visit budget, `!` pin), KS2 (U1 closing apart from R10-1's skip, D3 flow, limit rules) and IS R3–R5 agree.
   - H2 on disk is still v15, and §9.9's v16 alignment is consistent with the four stated v16 changes.
   - The he/en terms are consistent: "אצבוע" is masculine, "מנח יד", "השהיה" vs "עצירת טמפו", "פרצים".
   - The statistics (the T1/T2 thresholds, §11.3, the Beta-gate examples) are unchanged and correct.

# Review: SPEC-FINGERING v13, round 13 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

All four round-12 issues are fixed as rules, and every round-12 minor note is addressed. Three gaps remain. All are local and need no research or owner decision.
- **R13-1.** The held closing's climb ("one mark per clean take") can land on a tempo already played today. This happens when the eighths/triplet alternation is on, or when a missed or cold take sits between the start and the cap. "One mark" is also undefined across note values. G12's own assertion can fail.
- **R13-2.** In the key session, attempt 2 "at 0.95 × target" snaps **below** the probe band, so it can never enter `passLog`. Marks near the target are 4–5 % apart, so the band often holds only one mark. G3 assumes 2 countable attempts.
- **R13-3.** The new rule "a miss ends the climb" can end the session on a miss, with most of the closing unused. §5.5 already has a no-repeat recovery take for exactly this case.

**What I checked:**
- The spec v13 in full, the v12 → v13 diff, and round 12.
- `keyCoach.ts`: `gradedUp` 174–193, `closingMs` 232, `setPulse` 261–278, `enter` 315–359, `openVisit` and the closing 388–448, the speed path 1008–1100 (`canTrip` alternation, `'again'` after a miss), and the exits 1152–1189.
- `stages.ts`: `MAELZEL`, `snapDown`, `markUp`, `SHARE.closing`, `CLOSING_MIN`.
- `practiceSession.ts`: `DAILY.min` = 5.
- `Drills.tsx`: `bpmOf` 1651, `go` 1731, `done()` 1748–1808 (kind 1762, `applyTake` 1772, `hfMiss`, `lad.next`, the manual `setBpm` path 1807).
- `ladder.ts`: `applyTake` 96–170 (`atGoal`, the `passLog` gate at 143).
- `coach.ts`: `coachTake`, `tempoOf` 353–360, `next()` and time-up.
- App: `techResult` 2250, `checkpoint-tech` 2553 and `atTarget` 5046.
- `quests.ts`: `tech3`.

## Round 12: status

| R12 | Status in v13 |
|---|---|
| R12-1 the below-cap window had no time | **Fixed** as a rule. The climb yields at time left ≤ the window plus one take, and the exits at 1174 open the window. Short sessions are not covered: see minor notes 1 and 6. |
| R12-2 `slower` / `'slow'` read the stored goal | **Fixed.** `slower` and the list-run kind use min(`goalBpm`, cap), attempts pass `slower: false`, and `done()` is added to the read points. Checked against `ladder.ts` 143: a clean attempt at ≥ 0.95 × target now logs. The snapping gap in R13-2 is separate. |
| R12-3 the climb stalled at fast tempos | **Fixed** for the stall, given the key-session climb fix (§17 F6). The worked example (126 → 132) is now true. The new step rule has its own gap: see R13-1. |
| R12-4 checkpoint runs | **Fixed** (exempt, no visits or windows). It is consistent with `bpmOf`'s `atTarget` branch and `checkpoint-tech`. H2, SP and KS2 never mention checkpoints, so there is no conflict. |
| Minor notes 1–9 | All addressed: `ks.fgStart`, the nps comparison, `fgDay.played` coverage, the `STEP_TAKES` text, the read points, the list-run window, the G12 wording, the KS2 amendment, drums O. **Two leftovers** in G12's text: see minor notes 3 and 4. |

**Answers to the brief:**
- **G3, G4, G12 and G24 on every path:**
  - **G24 holds:** the `done()` top branch still bypasses everything §9.8 lists.
  - **G4 holds** inside visits and blocks.
  - **G12 can fail** in the held closing (R13-1) and in 5–10-minute key sessions (minor note 1).
  - **G3's model** of 2 countable attempts per session is false in the key session (R13-2).
- **The new rule "a miss ends the climb":** it avoids repeats, but it drops end-on-success and wastes the closing (R13-3). It also leaves "almost" undefined.
- **Fingering-take leaks:** none found.
- **Legitimate data lost:**
  - Key-session attempt 2 entries (R13-2).
  - The closing's below-cap practice after one miss (R13-3).
  - The A-6 climb, whenever triplet conversion makes the start collide with a played tempo. That case is avoidable (R13-1 fix, point 1).
- **Consistency:**
  - H2 v16 (§9.9), SP §21, KS2 (amendment updated) and IS R3–R5 agree.
  - G1 conflicts with G16(a) on passes (minor note 5).
- **Buildable without guessing:** yes, apart from R13-1's note-value question and minor note 2's take set.

---

## Substantive issues

### R13-1. The held closing's climb can repeat a tempo played today, and "one mark" has no note value

**Evidence.**
- The speed path alternates the note value on every clean take of a scale A-6. `canTrip` (keyCoach 621) is true for a speed stage with `sub` at 2 notes per beat, and 1048 flips per 2 ↔ 3.
- §9.2.2 says each later take is "one mark up from a clean take", hence "not in the day's played straight tempi". That inference only shows the take is above the *previous* take. It does not show the take is unplayed.
- **Counter-example (alternation):**
  - Visit 0 is clean at triplet ♩100 (5.0 nps). The next mark, triplet ♩104 (5.2 nps), is missed, then the recovery take is clean. The budget ends.
  - The closing start converts to eighths, at a 5.07-nps mark (♩152 eighths). That mark is unplayed, so the closing enters there.
  - Clean → the next take is triplets, and the next triplet mark above 101.3 is ♩104 = **5.2 nps, the missed tempo**.
- **Counter-example (cold check):** the cold check at the staircase tempo missed at ♩120. The visit was clean to ♩112 and stopped on the budget. The closing enters at ♩116, clean → ♩120 = a repeat.
- **Related waste:** the start is "one mark above" *in the played note value*, then converted and snapped. Triplet ♩96 → triplet ♩100 → eighths ♩150 → snap ♩144 = 4.8 nps, which is played, so A-6 is skipped. The eighths mark ♩152 was free.

**Fix (§9.2.2, KS2 amendment, G12).**
1. **The start:** the lowest Maelzel mark in the closing's entry note value whose nps is above the cell's highest clean straight nps today, is not in `fgDay.played` (converted nps), and is ≤ the cap. If there is none, skip A-6.
2. **Each later take:** in the note value the speed path picks (alternation kept), the lowest mark whose nps is above the previous take and not in `fgDay.played`. If that mark is above the cap, the cell is held at the cap (a cap visit if none opened today), then the window.
3. State that this replaces `gradedUp` for held closings, so there is one rule and no dependence on its `q` scaling. The climb fix is then needed only for feature-off.
4. G12: add an alternating-note-value case with a missed take above the highest clean take, and a missed cold check between the start and the cap.

### R13-2. Key-session attempt 2 at "0.95 × target" snaps below the band and never counts

**Evidence.**
- Key-session takes are snapped by `setPulse`: `snapDown(nps·60/p + 0.5)` (keyCoach 270).
- `applyTake` logs `passLog` only when `atGoal || bpm ≥ PASS_SHARE × target` (ladder 143). `atGoal` is false at these tempi, because `goalBpm` sits at or near the target.
- **Example:** target ♩110.
  - Attempt 1 is at ♩108, the highest mark ≤ the target.
  - One mark lower is ♩104, which is < 104.5, so attempt 2 goes "at 0.95 × target" = 104.5. `setPulse` snaps that to **♩104 < 104.5**: a planned pass-evidence take that cannot count.
  - The same happens near ♩140, where the band [133, 140] holds only ♩138.
- Marks above ♩100 are 4–5 % apart, so a 5 % band often holds **one** mark. In practice there is no valid attempt 2.
- §9.2.3's delay estimate and G3 assume 2 countable attempts: 3 / (1 − (1 − p)²) sessions. With one countable attempt it is 3 / p (6 sessions at p = 0.5, not 4).
- The old coach rounds tempi (`tempoOf`, `Math.round`). So 0.95 × 113 = 107.35 → 107 also misses the band.

**Fix (§9.2.3, G3, G24).**
- **Attempt tempi are chosen on the planner's real grid:**
  - Attempt 1 = the highest playable tempo whose item ♩ (after the note-value conversion) is ≤ the target and ≥ 0.95 × target.
  - Attempt 2 = the next playable tempo below it that is still ≥ 0.95 × target.
  - In the key session, either note value may supply the mark: eighths or triplets, whichever has a mark in the band.
  - In the old coach and list runs, round up (`ceil`), never to nearest.
  - If the band holds one tempo only, there is no attempt 2. Say so.
- **G3:** model the actual number of countable attempts per planner and tempo.
- **G24:** an attempt is never played below 0.95 × target in item ♩.

### R13-3. "A miss ends the climb" can end the session on a miss with most of the closing unused

**Evidence.**
- For a non-`preTop` held cell, attempts are usually not allowed, and A-7 is not playable: A-6 is not passed and there is no `passedAt`. So "the window, A-7 or the end" is **the end**.
- The closing has `closingMs` = min(3 min, 0.1 × minutes) (keyCoach 232). A miss on the first closing take therefore ends the session on a failure, with up to about 2.5 minutes unused.
- Feature-off, the same miss gets `'again'`.
- §5.5 already solves this without a repeat: after a miss, one take one mark below the **lowest** straight tempo played. That tempo is unplayed by construction. A clean take there ends the part, which is end-on-success (SP §1, Duke 2009).
- "Almost" in the closing climb is undefined. §5.5 holds it once.

**Fix (§9.2.2, KS2 amendment, G12).**
- After a miss in the held closing's climb, play one take one mark below the lowest straight tempo of the cell today (floor: the comfort pulse). A second miss goes down once more.
- Then: the window, else A-7, else the end.
- "Almost" holds once, at the same tempo, as in §5.5.
- G12: a closing miss is followed by an unplayed lower tempo, and the session never ends directly on the climb's miss while closing time remains.

---

## Minor notes

1. **The main scale's window has no reserved closing time in short sessions.**
   - `closingMs` is 30 s in a 5-minute session (`DAILY.min` = 5) and 60 s at 10 minutes. The window takes 2 takes plus count-ins plus report windows, about 40–60 s.
   - The yield fires at once and the window overruns the session. G12's "always inside reserved time" fails.
   - Fix: as already done for run rungs, the main scale's `closingDue` test (1166) adds the window's `budgetMs` while the held main scale has allowed attempts and no window yet.
2. **Define the take set** for "highest clean straight tempo today" and "reached the cap today".
   - The question is whether a clean cold check in the probe band, a checkpoint take at target or an attempt counts. If they count, every `preTop` cell with a clean cold check skips the closing climb as a "cap day".
   - Recommended: use only capped plain takes for those two tests, and use **all** straight takes (exempt, attempts, misses) for "played".
3. **G12's list-run wording is stale.** It says "only when the next item is another cell". §9.2.3 now says "only when the current item is the cell's last item in the queue". Align G12.
4. **G12 "none repeats the cap"** conflicts with the hands-free miss path: `hfMiss` n = 1 replays a missed cap take (`'again'`). Reword it as "no **clean** cap take is followed by another take at the cap".
5. **G1 versus G16(a).**
   - G1 says passes never "come before" the feature-off baseline. G16(a) concedes that, under Q8 (a), the attempts can open the branch earlier.
   - R12-2's `slower: false` also counts attempts at tempi where an off-arm key-session take would be `slower` (below 0.99 × `goalBpm`).
   - Restate G1's pass clause like G16(a): distributional, with the excess reported.
   - Side observation for the owner, feature-off: key-session takes in [0.95 × target, 0.99 × `goalBpm`) never enter `passLog`.
6. **The yield check runs before the first closing take too.** If time left at the closing start is ≤ the window plus one take, skip A-6 and play the window first.
   - G12's "the time-up exit opens the window" should apply only if the yield never fired. With minor note 1 applied, it never fires late. Otherwise there is no time left to play the window in.

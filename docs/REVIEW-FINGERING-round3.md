# Review: SPEC-FINGERING v3, round 3 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** v3 fixes all nine round-2 issues in substance, and the ♩100 replay holds when recomputed from the server traces. But one measurement hole is new and serious: the spec never isolates fingering takes from the item's ladder state, and the current take path writes `cleanBpm` and the pass log for **every** take. Five smaller gaps would force a builder to guess (M2 to M7). Every fix is local. None needs new research or a new owner decision beyond Q8.

**What I checked**
- The spec itself, RF1 §3.2, RF2 §13, and the round 1 and round 2 reviews.
- H2 v14: §1.4, §1.6, §1.7 (including the guard), §1.7a and §1.9.
- SP §1, §16.1–16.7; SPEC-CLIMB-SYNC §2.
- Code: `tendency.ts` (`TAKE_KIND`, `takeTrace` classes and `sidePredict`, `noteLog`), `ladder.ts` `applyTake`, `Drills.tsx` `done()`, `keyCoach.ts` constants, and `stages.ts` `subDrill`.
- The calibration DB, read-only: still 157 v1 traces and none with `nl`, so G5b cannot run yet. I recomputed T1 from the 34 MIDI takes of D major LH `xu`.

---

## Round 2: status

| R2 | Status in v3 |
|---|---|
| N1 G16 | **Fixed.** (a) still needs a testable definition; see the minor notes. |
| N2 pass-evidence | **Fixed for the key session.** Where the attempts run in other planners is undefined (M2). |
| N3 MIDI condition | **Fixed in mechanism** (tempo-matched, frozen, synced). It still compares a cold take with a warm reference, and the example numbers are off (M6). |
| N4 classes | **Fixed.** I checked the class mapping line by line: `noteLog` `u`/`o` with `bd` false = `takeTrace` `xu`/`xo`, and `.` = `cls === null` (tendency.ts:239–248 vs 497–504). The residual wording is slightly off (minor). |
| N5 shadow | **Fixed in design.** The gate is statistically weak (M7). |
| N6 silent / T3 | **Fixed in mechanism.** The silent-day count is wrong (M3), and a slip mark on a cell with no state is undefined (M4). |
| N7 repeats | **Fixed.** I walked the day-1 block, the visit, the cap visit and the C failure cycles, and found no repeated (structure, rung, tempo). |
| N8 pin | **Fixed.** The day-1 block has no E without a hold (M5). |
| N9 H10 | **Fixed.** Whether held cells sit inside the slope is unclear (minor). |
| R2 minor notes | All addressed. |

**T1 replay, recomputed from the traces.** Lower band [80, 100): 5 clean takes, mean −19.6 ms, SD 8.4. Upper band [100, 125]: 10 clean or almost takes, mean +11.3 ms, SD 11.4. That gives Δ = +30.9 ms and Welch t = 5.92, with 10/10 takes on Δ's side. c = 96 gives t ≈ 4.2, so c\* = ♩100 is right. One property matters: **each take has exactly one LH `xu` note** (`[x, 1]` on every trace), so in this item R_g is a single note's residual.

---

## Substantive issues

### M1. Fingering takes write `cleanBpm`, the pass log and the session tempo. Nothing in the spec stops it.
- **Evidence.**
  - `TAKE_KIND` has only `history`, `staircase`, `passes` and `tendencies`. It is read in exactly one place: the tendency filter `eligible` (tendency.ts:641).
  - `Drills.tsx:1772` calls `applyTake` for every take.
  - `applyTake` sets `cleanBpm = max(cleanBpm, bpm)` on any clean take (ladder.ts:134). It also pushes a `passLog` entry whenever the take is at ≥ `PASS_SHARE` × target and not "slower" (ladder.ts:143–145). The pass log is what the warm half of the pass reads.
  - XP per result comes from `drillXp(m)` (Drills.tsx:1785).
  - So the spec's "same zeros as `form`" stops none of these.
- **Consequences, if a builder follows the spec as written:**
  - A clean C take at P1 at cap + 3 marks, at its **click** tempo, lifts `cleanBpm` above the cap. The cap stops nothing, and the H2 §1.9 pass-probe branch can open from a take with a one-beat hold before each crossing.
  - If that click tempo is ≥ 0.95 × target, the take also adds a **warm-half pass entry**.
  - G bursts at 1.25 × T_C do the same, although H2 §1.6 excludes bursts from counting.
  - The variants also move SP §1's session tempo, which T_C and T_S are built from.
  - Every clean fingering take earns result XP, which breaks §14.1.
- **Fix.**
  - State that a `fingering` take never touches the main item's ladder state. Use one of two routes:
    - its own pseudo item id, `<item>~fg`, as SP §16.4 does for rate-changing feels;
    - or an `applyTake` path that writes only `activeMs` (practice-time XP) and `lastSound`.
  - Excluded, explicitly: `cleanBpm`, `passLog`, goal and streak, history, channels, session tempo, KS2 stage counters, limit and step budgets, the challenge `ceil`, plateau, and the "today's best" display. B already has its own feel group; give C and G theirs as well.
  - A **missed pass-evidence attempt** must also be exempt from KS2's limit, `STEP_TAKES` and `ALMOSTS_BACK`, as cap hits already are.
  - Add **G24**: no `fingering` take changes any of these fields. Extend G16(b) to say no fingering take's tempo reaches `cleanBpm`.

### M2. Pass-evidence attempts are placed only in the key session's cap visit
- **The gap.** §9.2.3 puts them at "the visit's last takes, after the variants (§9.2.2)", and §9.2.2 is the key session only.
- **Why it matters.**
  - Fingering visits are rationed by §7.1: a session of ≥ 10 min, ≤ 2 cells, never on consecutive visits of the cell, and at least every third visit straight.
  - So in the rotation and the old coach, the attempts would run in perhaps half of the sessions.
  - G3's estimate of 3 / (1 − (1 − p)²) assumes attempts in **every** session, so the delay bound is optimistic.
- **Fix.**
  - Run the attempts in every session in which a held cell is played: every planner, any visit kind, short sessions included, and `!` sessions unless "Don't hold" is set.
  - Place them as the last straight takes of that cell's last visit of the session.
  - Put this in G12 (the mirror test) and simulate it in G3 with realistic visit frequencies.

### M3. The silent-hold count includes days on which the player was never asked
- **The rule.** §11.5 counts "practice days … with no answered window", which includes days with no window at all.
- **Windows are rare:**
  - TP1 fires only after a **clean** cold check.
  - TP2 fires only after a visit's top take when it is the day's highest.
  - The 2 + 2 daily fatigue limit is shared **across cells** (§8.2).
  - Visits skip sessions.
- **The effect.** A cooperative player can reach 10 such days without one question. The hold then ends, and the item page says "no answers", which is false.
- **Fix.**
  - Count only days on which at least one window for the cell was shown and none was answered (store this in `quiet`).
  - Keep 5 and 10 on that count.
  - Say how the keep-hold question shares the end line with the offer. My suggestion: one end-line question per session, the keep-hold question first.

### M4. A slip on a cell with no state, or on a `flagged` cell, is undefined
- **The contradiction.**
  - §9.2.0 says a reported slip (a slip mark included) is evidence that adds the hold.
  - §9.2.1 applies R2 only to `retraining` cells.
  - §7.1 gives a `flagged` cell with a T3 in the last 7 days visits without a Yes.
- **Undefined:**
  - whether such a cell gets `hold`;
  - how it ever reaches `retraining`: there is no Yes, no block, and no transition;
  - what happens after the 7 days.
- **Why it matters.** Q7 says R2 needs consent. As written, a builder must guess whether one accidental double press caps the climb and delays the pass.
- **Fix.** State the path:
  - A T3 slip on a cell that is not in `retraining` → `flagged` with `t3At`. It gets visits **without a hold** for 7 days, and the next end line carries the offer (T3 is ranked first).
  - Yes → `offered` → block → `retraining`, with the hold.
  - With no Yes in 7 days, the visits stop and the flag stays.
  - A T3 slip on a cell already in `retraining` adds the hold at once, as now.

### M5. The day-1 block has no E when there is no hold
- **The gap.** §5.5 sets the day-1 ceiling at E, and §6.2 plays P0 "2 marks below E". But §9.2.0 and §9.4 say a manual start or pin without data has no E.
- **Fix.** Without E, the day-1 reference is the item's session tempo, else its last clean tempo:
  - P0 at that tempo − 2 marks;
  - the closing ceiling at that tempo.

### M6. The MIDI condition compares a cold take with a warm reference, and its example numbers do not follow its own rule
- **Cold against warm.** §3.1 drops cold takes from T1 because they "carry the cold effect". §11.3 then compares the **cold** confirmation take with a reference frozen from **warm** takes only. A cold-late thumb would fail confirmations systematically.
- **The reference is the flagged state itself.** A band's mean + 1 SD passes about 84 % of takes played with the **unchanged** fingering. In the probe band, "MIDI-clean" therefore means "no break".
  - That is what §9.4's "2 marks a day with MIDI agreement", the N6 silent rise, and §14.2's "OK cannot retire a MIDI player alone" actually rest on.
  - In practice the silent rise is a ramp of 1 mark a day of clean play.
- **The example numbers.** The ♩125–156 row in §11.3 (n 17, mean +4.6, SD 12.1) includes 3 failed takes. Built from T1-eligible rows (clean or almost), the traces give:
  - ♩125–156: n 14, mean +4.4, SD 10.5, so the threshold is +14.9 ms, and 12 of the 14 takes pass;
  - ♩100–125, with the ♩103 take included: mean +11.3, SD 11.4.
  - G10's "≥ 80 %" on "mean +4.6, SD 12.1" is tautological: the rule is applied to its own reference.
- **Fix.**
  - (a) Name it honestly in §9.4, §11.3 and §14.2: "no break and not worse than the flagged state".
  - (b) Freeze the reference from T1-eligible rows only. Anchor the bands at the lowest eligible row's mark, half-open.
  - (c) For cold confirmations, use a cold reference when ≥ 5 cold rows exist in the band. Otherwise use the break check only, until shadow labels exist.
  - (d) Rewrite G10 on the recomputed numbers and add a cold-take case.

### M7. The shadow gate passes on weak evidence
- **Gate cases that pass, with their one-sided Fisher exact p:**

  | Flags slipped | Controls slipped | Passes the gate? | Fisher p |
  |---|---|---|---|
  | 5 / 10 | 2 / 10 | yes | 0.175 |
  | 6 / 10 | 3 / 10 | yes | 0.185 |
  | 5 / 10 | 0 / 10 | yes | 0.016 |

  A precision of 5/10 has a 95 % interval of about 19–81 %.
- **One rater.** All units come from one person on two accounts, so they are not independent.
- **Fix.**
  - Add P(p_flag > p_control) ≥ 0.95 under Beta(1, 1) posteriors. 5/10 vs 2/10 gives about 0.91 and fails; 6/10 vs 1/10 passes.
  - Allow one control unit per (cell, hand) per 14 days.
  - State that the gate may never be met in 6 weeks, because T1 fired on 1 of 5 keys in the owner's data. Then "T3 and manual starts only" is the expected outcome, not a failure.

---

## Minor notes
- **The residual rule (§1.3).**
  - The trace keeps a note whose residual comes from **one** side only (tendency.ts:339–341). Write: "both sides, when both exist, must agree in sign; one side suffices".
  - The reference notes are the 6 nearest on each side, **at any place in the beat**, with one level per place, and ≥ 2 of them at j's own place.
  - **`sdl`:** say which rule it uses. The two-sided-agreement filter drops near-zero residuals and inflates the SD. I recommend side-0, the 8 nearest, as `pc` already uses.
- **"`cleanBpm` grows only up to the cap" (§9.2.3) is false.** The exempt takes (cold checks, FSRS probes, placement, level test, submissions) all go through `applyTake`.
- **"The cap only removes takes" is false too.** The pass-evidence attempts add takes at target.
  - G16(a)'s "never earlier" needs a definition: paired seeds with common random numbers, or a distributional bound P_on(open by day N) ≤ P_off + ε.
  - Under Q8 (a) or (b), the attempts can open the branch before the feature-off climb would.
- **Triplet items (`subDrill`, stages.ts:204).**
  - P2 and P3 shift the following notes to 4k + 6 and 4k + 3 twelfths, which sit off the eighth and sixteenth click. §5.3's "every shifted note sits on a click" fails there.
  - Propose for triplet items: P2 = ⅔ beat, P3 = ⅓ beat, with a triplet click. Q1 did not cover triplets, so confirm with the owner.
- **Mic fallback.** "Uses G and B in place of C" cannot apply on mic, because B is not offered there. On mic the fallback is G only.
- **TP2 and the silent rise** are defined through §5.5, which covers fingering blocks and visits only. Say whether the top take at the cap in a held cell's ordinary speed visit also triggers them.
- **Slip mark.**
  - Nothing introduces it to the player. Add a one-time brief line, he and en.
  - The key zones are learned only at the first report brief, which needs a cell with a state, so on MIDI the double press cannot work for a player with no state yet. Learn the range at the slip-mark brief or in the Settings card.
  - Zone notes during a hands-free countdown must neither start a take nor count as count-in input.
  - The drum slip-mark gesture is not specified.
- **Merge.**
  - `hold` and `quiet` "follow `stateUpd`", but both change without a state change. Give each its own `upd`.
  - Take `preTop` at the start of the hold, not of retraining (the pin-then-slip case).
  - The daily E limits need a per-day "MIDI-supported" bit beside `edgeRaisedMarks`.
- **Settings.** §14.6 item 2, third bullet, restores only "Stop" stops, while the hint and G19 also undo "End" and the silent timeout. Align them.
- **H10.** Say whether held cells are excluded from the flat-rank slope. G22 implies they are reported apart.
- **The label "your report".** Use it only when E came from a report. Otherwise write "from your playing" / "לפי הנגינה שלך".
- **Copy.**
  - Hebrew retired line → "האצבוע ברה מז'ור החזיק בנגינה הראשונה של היום, ביומיים שונים. חוזרים לתרגול רגיל."
  - English offer → "Above ♩100, your left hand's way down in D major changes. A fingering block next time?"
- **R_g per take** is a single note in a two-octave HT scale (see the replay above). Say so in §3.3, so that T2 rates are read as per-note.

---

## Q8
- **O5 was approved on the premise "rank and passes are never affected".**
  - **(a)** keeps a delay for cells far below the band.
  - **(b)** honours O5, but each attempt is a **planned jump to target that counts toward the warm half**. H2 §1.6 excludes challenge takes, which are jumps, from counting. So (b) needs an explicit H2 amendment, and it rehearses above the edge in every session.
- **My recommendation: (a), together with M2** (attempts in every session). Then show the owner G3. If the owner holds O5 literally, take (b) with the H2 entry, and allow one attempt only while the cap is more than 3 marks below the band.
- Either option needs the G16(a) wording above.

## The author's three choices
1. **Silent thresholds of 5 and 10 practice days.** The size is right: about 2–3 weeks at 4 days a week, and on MIDI E rises anyway. But the days must be days that were **asked and unanswered** (M3).
2. **Retirement tolerance of mean + 1 SD.** Acceptable for v1, because it restricts only the player. But it is a "no worse than flagged" check, about 84 % permissive against an unchanged fingering. Describe it that way, build it from clean or almost rows, and handle cold against warm (M6).
3. **No hold on manual starts and pins, with no teacher "hold" switch.** Agree. A hold without evidence would be a silent pass delay. A player who knows they slip has the slip mark, which adds the hold at once (once M4 is clarified). Mention the slip mark in the "Retrain this fingering" brief.

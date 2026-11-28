# Review: SPEC-FINGERING v5, round 5 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** v5 fixes P3 and P4. P2's mechanism is right. Three substantive gaps remain:
- **F1.** P1 is only half closed. §9.8 re-routes the item's *record*, but the fingering take still runs through `take()` → `store.recordDrill`, which pays Momentum gains and badge counters, and through the coach's `coachAfter`, which can set a limit or ceiling on the main item.
- **F2.** §9.2.5 Rule 1 claims equality with the feature-off arm. It actually creates the opposite divergence, and G12 asserts that false equality.
- **F3.** Stale evidence re-fires T1/T2 right after retirement, which collapses the 7- and 21-day rechecks into consecutive days.

All three fixes are local. None needs new research or an owner decision.

**What I checked**
- Spec v5, review round 4, H2 v15 (§1.4, §1.6, §1.7 shelving and reserve, §1.7a readiness and step-down, §1.9), and SPEC-PRACTICE-SESSION §11.
- Code:
  - `Drills.tsx` `done()` (1748–1800), `coachNext` (1817–1870), `notePresented`;
  - `App.tsx` `take()` and `afterTake()` (2183–2250), `noteTake` and `techResult`;
  - `ladder.ts` `applyTake` (96–160);
  - `stretch.ts` `dailyRepeatFactor`, `stretchXp`, `bumpTake`;
  - `progress.ts` `recordDrillNow` (1026–1052) and `drillGains`;
  - `practice.ts` `bookDrillTake`;
  - `tendency.ts` `TAKE_KIND`/`eligible`;
  - `keyCoach.ts` constants and the ceiling paths;
  - `coach.ts` `coachAfter`;
  - the `toneturn_drill_items` migrations.

---

## Round 4: status

| R4 | Status in v5 |
|---|---|
| P1 `~fg` leaks | **Partly fixed.** `recordTakeAnalysis`, `bandOfTake`, the boost, `MEMORY_XP`, `drillEvents` and `afterTake` are handled, and `activeMs` is correct. Still open: `recordDrill`'s own writes, the coach and list-run continuation, and a false "no `passLog`" claim (F1). |
| P2 shelving and step-down | **Mechanism fixed** (§9.2.5, `frozenAt`, the H2 entry). The claim and the guard test are wrong (F2). |
| P3 new-key blocks | **Fixed** (§9.1, §10, G2: "new everywhere"). |
| P4 report and slip overlap | **Fixed.** One timing ambiguity remains (minor). |
| Minor notes | All addressed. |

The flat XP checks out: `stretchXp(1, factor 1, nth)` = `Math.round(1 × 0.5)` = 1 for takes 7–15 and 0 from take 16, so the total is 15 per count key. See the minor note on which key that is.

---

## Substantive issues

### F1. The fingering take still leaks through `recordDrill` and the coach continuation
**Evidence.** §9.8 step 3 still sends the take to `onTake(…, { fingering: true })`, and `take()` always calls `store.recordDrill(st, …)` (App.tsx 2202). `recordDrillNow` (progress.ts 1026–1052) does more than store the state:
- **Momentum Progress half.** `withDrillGains(p, prev, state)` → `drillGains` counts `records` when `state.cleanBpm > prev.cleanBpm`, plus `statusUps`. On `~fg` a C or G take at a higher click tempo raises `cleanBpm` on almost every visit, so SP §11.4's "new tempo records" gains rise through the weekly gains. The spec counts this as Momentum (§8.5, §14.1), so it is a leak. It happens even though `afterTake` is skipped.
- **Badges.** `bumpCount('drillClean')` runs on every clean take, `'tempoRecords'` on the same `cleanBpm` rise, and `'evenCv'` (the best HT evenness) on clean HT block or C takes. §14.1 says a fingering verdict earns no badge.
- **The channel balance.** `take()` calls `noteChannel(takeChannelOf(prev?.channels, st.channels))`, and `applyTake` tallies a channel on `~fg`. Fingering takes therefore enter the week's channel balance, which sets the weaker-channel ×1.5 for other takes.
- **The ledger.** `bookDrillTake` books item `d:<item>~fg` with its own clean count and tempo. Time booking is fine. A pseudo item in the ledger's item stats is not.

The continuation after the take is not specified either:
- **Coach runs.** `done()` ends with `coachNext(m, xp)` → `coachAfter(coach, state, cTake, m, …)` (coach.ts 420). That function moves `stepTakes` and `almost`, may set the limit, notes comfort ceilings (`setComfort`), and returns `nx.ceiling`, which `coachNext` writes with `withCeiling` on that item. The matrix then rests the item for days. A fingering drill generated from the main item carries that item's id. §9.8 lists these fields as never written, but it never says what replaces `coachAfter` for a fingering take, and that function is the only path into keyCoach.
- **Non-coach runs.** Hands-free list runs raise the tempo from `lad.next.action === 'raise'` (Drills.tsx 1796). With `~fg` that is `applyTake`'s generic 3-clean ladder, not §5.3's rung ladder. `setRes({ m, lad })` also shows `applyTake`'s "Clean 2/3 at ♩…" message.
- **The `passLog` claim is false.** "`applyTake` … with no `targetBpm`: so `~fg` gets no `passLog`" is wrong. `ladder.ts` 140 pushes to `passLog` on any clean take with `atGoal`, whatever the target, and the log is seeded from `history`. G24's "`~fg` has no `passLog`" would fail. It is harmless only because nothing reads it.
- **The trace.** "Branch before `recordTakeAnalysis`" also skips the trace code that follows it. The spec needs a v4 trace with kind `fingering` (`fg`, `vr`, labels). `TAKE_KIND` already keeps it out of `sessionTendency` and `cTraces` pooling.

**Fix (§9.8, F6, G24).**
- `takeFingering()` does **not** call `onTake`/`take()`. It calls a new `store.recordFingering(fgState, xp, takeCounts)`, which writes:
  - `drillItems['<id>~fg']`;
  - `xp`, `stats.xpByDay` and `takeCounts`;
  - ledger time under `d:<mainItem>`, with no item clean count or tempo.

  It writes nothing else: no `withDrillGains`, no `bumpCount`, no `noteChannel`.
- The session's band time is added directly, as `work`, from `~fg`'s `activeMs` delta.
- Pass `channel: undefined` and strip `passLog` on `~fg`, or change G24 to "nothing reads `~fg.passLog`".
- **Continuation:**
  - In coach runs: `fingerAfter(cellState, take, m)` in `fingerLadder.ts`. It returns the next fingering or straight take and a line. It never calls `coachAfter`, and it never touches `stepTakes`, `almost`, the limit, comfort ceilings, `withCeiling` or the challenge `ceil`. When the visit's fingering part ends, control returns to `coachAfter` with the visit's next straight take.
  - In list runs: the next take comes from `fingerLadder`, and the verdict line comes from the structure's grading, never from `lad.next` or `lad.message`.
- Write the trace with `kind: 'fingering'`.
- **G24 additions:**
  - weekly gains (`records`, `statusUps`) unchanged;
  - `counts.drillClean`, `tempoRecords` and `evenCv` unchanged;
  - the channel balance unchanged;
  - no ledger item `d:*~fg`;
  - no `withCeiling` or `setComfort` call;
  - a failed P1 run never sets a KS2 limit or a ceiling;
  - a hands-free list run's next tempo follows §5.3.

### F2. §9.2.5 Rule 1 swaps one divergence for another and claims equality
**Evidence.** Rule 1 stops held visits from counting toward H2 v15's 12-visit shelving. That prevents shelvings caused by the hold. But a held cell that would also fail with fingering off (true probe-band ability below the band, which is common for non-`preTop` cells) is shelved after 12 visits in the off arm and stays a working cell indefinitely in the on arm.
- The challenge point, the guard reserve (which resumes shelved cells), and the working-slot supply therefore differ from the off arm, in the other direction.
- §9.2.5 still says they "move only as they would with fingering off".
- G12 asserts that "the challenge point and guard reserve match the feature-off run". That is false by construction, so the test either fails or gets weakened ad hoc.

**Fix.**
- Count a held visit toward shelving only when the cell **could pass that visit**: the pass-evidence attempts are allowed (§9.2.3), or the cap is within the probe band. While the hold is the binding reason the cell cannot pass, the count pauses. Once it is not, the cell is judged like any other.
- Replace the equality claim with: "the hold neither causes nor prevents a shelving while it is the binding constraint". In G3, report the divergence: P(shelved while held) and P(working past the off arm's shelving day).
- G12 asserts the rule (the count pauses only while the attempts are disallowed), not equality.
- Update the H2 amendment wording to match.

### F3. Stale evidence re-fires T1/T2 after retirement and collapses the rechecks
**Evidence.**
- §3.1 uses rows from the last 21 days. §2.3 keeps them for at least 21 days.
- A `preTop` cell can retire 2–4 days after its block, with confirmations on 2 days (§11.4).
- The upper-band rows that produced the flag are still inside T1's window, and T2's 7-day break pair may be too. T1 or T2 therefore "fires during the recheck period" at once, and §11.4 pulls the recheck forward to the next cold check at ≥ G, which is the next day.
- After an OK, `recheckDue` = +21 days is pulled forward the same way, so the cell reaches `done` about 4 days after the first confirmation.
- The spaced 7- and 21-day relapse checks (§11.4; RF2 §8.3) never happen. On a fast retirement, a `done` cell can also be re-offered on the same old data.

**Fix (§3.5, §11.4, §15.1, G10).**
- Add `retiredAt` per cell.
- For recheck pull-forward, and for offers on a `retired` or `done` cell, T1 and T2 are computed **only over rows after `retiredAt`**, with their normal minimums (≥ 5 per band; 2 break takes).
- More generally: a fire counts as new only if its evidence contains rows after the cell's last state change.
- Add a G10 case: retire on day 3 with the flag's rows still in the window. The recheck stays at day 10, and there is no re-offer.

---

## Minor notes
- **The 15-XP cap's key.** "15 XP per cell per day" does not match "`bumpTake` under `<itemId>~fg`". `~fg` is per take item: RH, LH and HT C takes give three keys, so up to 45 XP. Count under `<mainItem>~fg` (or `cellKey~fg`), or say "per item".
- **P4 timing.** The hand question accepts presses from 0.5 s, but a bottom press within 1 s of the first press is always "the same slip". So between 0.5 and 1 s a bottom press is not a hand answer, while a top press is. State it: a bottom-zone hand answer counts only ≥ 1 s after the "slipped" press. Simpler still: show the hand line 1 s after that press.
- **"Hold" / "עצירה" means two things.** It is used for the R2 tempo cap ("Held at ♩116", "Keep the fingering hold", "בלי עצירה", "העצירה בגלל האצבוע הסתיימה") and for the C pause ("Hold before each change", "Next: the hold, down to a quarter beat", "הבא: העצירה, עד רבע פעמה"). Use **pause / השהיה** for C, and keep **hold / עצירת טמפו** for R2.
- **Session counts.** `noteTake` → `techResult` (`firstTry`/`total` in the completion record, which the teacher's view sees) and `count.current` (`onEnd`) count fingering takes as takes and as clean ones. Easy block chords inflate the clean share. Count them in `total` and exclude them from `firstTry`, or keep them out of both. Say which.
- **Drums pool takes without consent.** Orchestrated takes run on every fourth visit of an acquired sticking rudiment, with no flag (§12.3). They pay 1 XP instead of the normal band XP, and the spec does not say whether "Suggest fingering work" off stops them. Recommend: they stay (they are D-T1's only data), are named in the drum feel pool's brief, and pay through `recordFingering` like other fingering takes.
- `refineCal` (velocity range) also runs on fingering takes. Harmless, but say so or skip it for A.
- `~fg` adds one server row per item, against the 5000-row limit (`toneturn_drill_items_guard`). Negligible; note it.

---

## Q8
**Recommend (a)**, for the round-4 reason (v15 guard record and readiness).
- F2's fix fits (a): the shelving count resumes when the attempts become allowed, so (a) also bounds how long a hopeless held cell stays unshelved.
- Under (b), Rule 1 as revised would count every held visit from the start, which is fine, but the early pass-probe opening still feeds probe-band misses into the guard record.

## Q9
**Accept** ⅔ and ⅓ beat with a triplet click for triplet items. Duple items are unchanged. G6's triplet case covers it.

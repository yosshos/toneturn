# Review: SPEC-FINGERING v6, round 6 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** The round-5 fixes are right in substance. F2 is fully fixed, F1 is fixed at the record level, and F3 is fixed for retired cells.

v6's main move was to take fingering state out of `drillItems` and into a new path that bypasses `take()`. That move opened four new gaps in plumbing and ownership, and F3 is incomplete for one exit route:
- **N1.** The new synced store has no way to sync.
- **N2.** The write path can reset the 15-XP cap and can lose writes.
- **N3.** In coach runs, nothing owns the visit's sequence or its persistence.
- **N4.** A stopped cell can be re-offered on the old evidence.
- **N5.** D-T1 for drums has no data source.

All five fixes are local. None needs research or an owner decision.

**What I checked**
- Spec v6 and round 5, with H2 v15 §1.6, §1.7 (shelving, reserve) and §1.7a (step-down), and SP §1, §16 and `VISIT_TAKES`.
- Code:
  - `Drills.tsx`: `done()` (1748–1808), `coachNext` / `coachGo` (1817–1883), `persistCoach` (1584);
  - `App.tsx`: `take()`, `afterTake()`, `noteTake` and `techResult` (2183–2258);
  - `progress.ts`: `recordDrillNow` (1026–1052), `mergeRewards`;
  - `sync.ts`: `rebuildProgress`;
  - `cloud/drillSync.ts` and `cloud.ts` (`portableSettings`);
  - `practice.ts`: `book` / `bookDrillTake`;
  - `stretch.ts`: `bumpTake`, `dailyRepeatFactor`;
  - `coach.ts`: `coachAfter` (420–462);
  - `keyCoach.ts`: limits, time and closing;
  - `tendency.ts`: `TAKE_KIND` / `eligible`;
  - `momentum.ts`: `MomentumInput`.

## Round 5: status

| R5 | Status in v6 |
|---|---|
| F1 `recordDrill` and coach leaks | **Fixed for the item record, badges, gains, channel balance and `coachAfter`.** G24 is thorough. The new route has its own gaps (N1–N3, minor note 1). |
| F2 shelving equality | **Fixed.** The rule, the honest claim, G3 reporting, G12 asserting the rule, and the H2 §1.7 entry. |
| F3 stale evidence | **Fixed for `retired`.** Not for `done` reached by Stop, End or the silent timeout (N4). |
| Minor notes | All addressed. P4 timing, pause vs hold, session counts, drums consent and the 5000-row limit are correct. |

---

## Substantive issues

### N1. The `fingering` store is "synced", but nothing carries it
**Evidence.**
- Progress is not a synced blob. `rebuildProgress` (`sync.ts`) rebuilds it from lesson results. It keeps only the local fields it lists (`drillItems`, `counts`, `stats`, `mergeRewards`' fields, …), so a new `Progress.fingering` field is **dropped on every rebuild**.
- The only per-item cross-device transport is `drillSync.ts` → `toneturn_drill_items`. v6 deliberately left it (§9.8 item 5).
- Settings sync through `toneturn_profiles.settings` via `portableSettings`, and v6 does not say that `fingeringOffer` / `fingeringOrch` are added there.

The result: §15.1's merge rules, the cross-device `lastSlipAt` rule (§11.4, G10), the shared flag and frozen reference (§2.3, §11.3, "the same on every device"), and G19's "the store syncs across two devices" have no transport.

**Fix (§15.1, F7, G19).** Pick one transport and name it:
- **(a)** A new table `toneturn_fingering` (user, epoch, `cellKey`, jsonb, version), with the same pull / dirty / `base`-version push protocol as `drillSync.ts`. It needs a dry-run migration, RLS, and fresh-start epoch deletion.
- **(b)** Rows in `toneturn_drill_items` under a key that cannot collide (`fg:<cellKey>`), skipped by every `drillItems` reader through `isPseudoItem`. That brings back the reader filter that v6 removed.

Either way:
- add `fingering` to `rebuildProgress`' kept fields, merged by §15.1's rules;
- add `fingeringOffer` and `fingeringOrch` to `portableSettings`;
- G19 runs through the real sync path.

### N2. The fingering write cannot live in `Drills.tsx` + `store` alone: the XP cap resets, and writes race
**Evidence.**
- `Drills.tsx` has no `store`; every take goes through the `onTake` prop to App.
- App keeps today's take counts in a ref. `take()` calls `bumpTake(takeCounts.current?.day === day ? takeCounts.current : progress.takeCounts, …)` (App 2190), and `recordDrillNow` writes `extra.takeCounts` **wholesale** (progress.ts 1032).
- So if `takeFingering` bumps `<mainItem>~fg` anywhere other than in that ref, the next straight take overwrites `progress.takeCounts` with a ref that lacks the `~fg` key. The count restarts at 1, and the 15-XP cap (§9.8 item 6, G24) is broken every time a straight take follows a fingering take, which is every visit.
- `recordDrill` also runs under `drillLock`, and `take()` chains writes (`drillWrites`). A `recordFingering` outside that lock does a load-modify-put that can lose `xp`, `stats` or a `drillItems` write from the straight take just before it.
- §9.8 item 7 relies on App-only state: `drillSessionXp`, `wrunRef` / `saveRun` and `setProgress`.

**Fix (§9.8, F6, G24).**
- `takeFingering()` calls a **new App prop `onFingerTake(cellKey, fgLadder, ms)`**.
- App bumps `takeCounts.current` (key `<mainItem>~fg`), computes the XP, adds `drillSessionXp` and band `work`, and calls `store.recordFingering(…, { takeCounts: tc })` inside `drillWrites` and under `drillLock`.
- Add to G24:
  - "fingering take → straight take → fingering take: the `~fg` count keeps rising and the 16th fingering take of the day pays 0";
  - "interleaved writes lose no XP and no `drillItems` change".

### N3. Coach runs: no owner for the visit's sequence, its straight takes, its budget or its resume
**Evidence.**
- `coachGo` always takes the next take from `coachTake(coach, coachRef.current, …)`, that is, from the coach state. `fingerAfter` returns `next`, but v6 never says how that take becomes `cTake`, or where the visit's progress lives.
- That progress is the step, the (rung, tempo) pairs already played (needed for the N7 no-repeat rule), the lowest straight tempo, and the planned pass-evidence attempts. `FgLadder` holds only per-group tempo, peak and limit.
- `persistCoach` / `saveCoachRun` save only `coachRef.current`, so a reload mid-visit loses the visit. That breaks never-lose-progress and the no-repeat rule.
- §9.8 item 9 hands the visit's straight takes (P0, the §5.5 ladder, the pass-evidence attempts) back to `coachAfter`. But `ksAfter` / `coachAfter` choose the next take by their own rules (KS2 flow pulse, `stepTakes`, old-coach `up`/`run`), not by §5.5: rise one mark per clean take to the ceiling, go one mark below the lowest played after a miss, and end with the attempts. Two rule sets would compete over the same takes.
- `coachAfter` is also the only place where `timeUp` (coach.ts 425) and the key-session closing (keyCoach 1152–1167) are checked. A long fingering stretch runs without either check.
- The budget contradicts itself:
  - §7.2 says "3–4 takes, about 1–1.5 min";
  - in the key session the same visit gets "Budget `VISIT_TAKES` + extension", and SP sets `VISIT_TAKES` = 3;
  - but the content counts G (1) + C from the rung (1–3) + straight (1–3) + up to 2 attempts, plus variants in the cap visit: 3–9+ takes.

**Fix (§7.2, §9.8 item 9, F5/F6, G4, G12).**
- Add a **`fg` sub-state to `CoachState`**: visit id, step, played pairs, lowest straight tempo, attempts left and budget. It is saved with the coach run.
- `coachTake` returns `fg`'s next take while a visit is open.
- **`fingerAfter` owns the whole fingering visit or block, its straight takes included.** Straight takes still go through the record path (`applyTake` → `take()` → `recordDrill`), so they count. `coachAfter` is called for them in a **record-only mode**: counters, thinning, `timeUp` and closing, but no next take, no limit or ceiling at the cap, and no `stepTakes` from held takes.
- At the end of the visit, control returns to `coachTake`.
- `fingerAfter` also checks the session time and the closing before each take.
- State one budget, in takes and in milliseconds, for:
  - a visit (for example: at most 7 takes, attempts included);
  - a cap visit (for example: at most 9).

  Drop the "3–4 takes" and `VISIT_TAKES` wording.
- Add to G4/G12:
  - a reload in the middle of a visit resumes at the same step, with no repeated pair;
  - time-up during a fingering visit ends the session.

### N4. F3 is incomplete: a `done` cell without `retiredAt` re-fires on the old evidence
**Evidence.**
- §3.5 limits offers on a `retired` or `done` cell to rows after `retiredAt`.
- But `done` is also reached by **Stop / End** and by the **silent timeout** (§4, §11.5, `stoppedAt`), which never set `retiredAt`. For those cells the rule is undefined.
- The fallback ("a fire counts as new if its evidence contains rows after `stateUpd`") is met by **one** new take added to the old flag's rows. So the next session re-offers the same flag right after the player said Stop. §11.5 says "a later fire is offered as usual", which makes it worse.

**Fix (§3.5, §11.5, §15.1, G10, G19).**
- Use **`exitAt` = max(`retiredAt`, `stoppedAt`)**, and compute T1/T2 for any `done` cell only over rows after it, with the normal minimums.
- Merge `stoppedAt` by max.
- Add a G10 case: Stop on day 3 with the flag's rows still in the window; no offer until ≥ 5 rows per band (or 2 break takes) after `stoppedAt` exist.

### N5. Drums: D-T1 has no data
**Evidence.**
- D-T1 is defined on **orchestrated** takes (§12.3). Those are fingering takes with `vr = 'O'`.
- §3.1 and §9.8 item 3 exclude every `vr` take from `fingerEvidence`.
- `done()` writes **no trace at all** for drums (`isDrumDrill(drill) ? null`, Drills 1764). F9 lists only "the drum `nl`", not a drum trace builder or a store for wrong-pad events.

So D-T1, the first-flag path that O9 and S9 rely on, can never fire.

**Fix (§12.3, F9, G13).**
- F9 adds a drum trace (v4 with `nl`, `vr`, `cell`) and a **drum evidence stream**: per cell and site, the orchestrated takes' crosstalk-safe wrong-pad strokes `{at, nps, site, wrongPad}`. It is exempt from the `vr` exclusion, which stays for the D-T2 plain-take rows.
- Add to G13: two orchestrated takes in 7 days, each with a wrong-pad stroke at one site → a D-T1 flag.

---

## Minor notes
1. **Branch point.** §9.8 says `takeFingering` branches "right after the trace". But `refineCal` (1751) and `recordTakeAnalysis` (1756) run **before** the trace (1764). The branch belongs at the top of `done()`. It must skip `refineCal` for A, skip `recordTakeAnalysis`, then build the trace with `kind: 'fingering'`. G24's "`recordTakeAnalysis` never called" would otherwise fail.
2. **Ledger wording.** "Time only, under `d:<mainItem>` (`book()` with no item entry)" cannot be done. `book()` files time by course, kind, skill, key and `q`; only the item entry carries `d:<id>`. Say instead:
   - export a `bookFingerTime(skill, key)` with kind `technique` and a named `q` (for example `work`);
   - there is no `d:` entry;
   - G24 asserts "time booked, no item entry".
3. **G1 and Momentum.** Momentum's persistence half reads weekly minutes, and fingering time legitimately counts there. Restrict G1's "Momentum never exceeds" to the **progress half** (gains), or state that session length is equal in both arms.
4. **Cold marking before H2 step 1.** Until per-cell `lastSound` exists, the history-based code will mark the first straight take after new-key blocks (§10) as cold (`cd`), and it then enters `refCold`. Gate §10 on H2 step 1, or have `takeFingering` record a sounding mark that the cold flag reads.
5. **Orchestrated edge.** "The highest clean orchestrated tempo on 2 distinct days" cannot be stored in `FgGroup` (one `day`). Add `orchDays: {day, nps}[]` (the last 2).
6. **`stoppedAt` / `stopWhy` merge** are not in §15.1's merge list (see N4).
7. **Hebrew copy** is fine.
   - Consider "בלוק אצבוע" → "תרגול אצבוע מרוכז" (plainer), and "נגינה מפוצלת בין התופים" → "כל יד על תוף אחר", which says what O is.
   - Optional, not blocking.

## Q8 and Q9
- **Q8: (a)**, for the reasons in rounds 4 and 5: the v15 guard record and readiness, and the F2 shelving rule resuming. Nothing in v6 changes that. Note: under N3's fix, the attempts belong to `fingerAfter`'s visit plan, so (a) is a single condition check there.
- **Q9: accept** ⅔ and ⅓ beat with a triplet click for triplet items. Duple items are unchanged.

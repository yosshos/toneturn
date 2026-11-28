# Review: SPEC-FINGERING v7, round 7 (independent, 2026-11-28)

**Verdict: NOT CLEAN.** The round-6 fixes are right. N1, N2, N4 and N5 are fixed, and so is every minor note except one leftover sentence in G24. N3 is fixed inside the visit: `CoachState.fg`, `coachTake` serving it, one budget, and time and closing checks before each take.

What is still missing is the edges of the visit. Nothing defines what the host coach knows when the visit hands control back, and nothing says what the old coach does at the cap. Fingering-only stretches also fall through two existing gates. One new rule contradicts SP. All three fixes are local, and none needs research or an owner decision.

**What I checked:**
- Spec v7, the round-6 review, SP §1, §16 and §21 (A2), and H2 v15 §1.6.
- `cloud/drillSync.ts`: push, pull, `markAllIfFirst` and the repush check.
- `storage/drillMerge.ts`: `mergeItems`, `portable` and `sameItem`.
- `progress.ts`:
  - `recordDrillNow` (1026–1052), `mergeDrillItemsNow`, `drillLock`;
  - `DEVICE_SETTINGS` and `withoutDeviceSettings`;
  - `mergeRewards`.
- `sync.ts` `rebuildProgress`, and `cloud.ts` `portableSettings`.
- The server migrations 20261211–13.
- App.tsx:
  - `drillSyncNow` (365);
  - `take()`, `afterTake`, `noteTake` and `techResult` (2183–2258);
  - every `onTake=` host.
- `practice.ts` `book` and `bookDrillTake`, and `practiceTime.ts` `QUALITIES`.
- `stretch.ts`: `stretchXp`, `dailyRepeatFactor` and `bumpTake`.
- `coach.ts`: `CoachState`, `coachTake` and `coachAfter` (420–600, the plateau and ceiling).
- `keyCoach.ts`: `KsState`, `closingMs` and the tail of `ksAfter` (1140–1190).
- `Drills.tsx`: `persistCoach` (1583), `done()` (1748), `coachNext` / `coachGo` (1817–1883).
- `coachRun.ts`: `OpenRun`.

## Round 6: status

| R6 | Status in v7 |
|---|---|
| N1 transport | **Fixed.** Option (b) works with the real code. `pushDrillItems` loads through the loader and drops ids it cannot load, so the loader must include `fg:` rows, and v7 says so. The server's `put` accepts any id of ≤ 200 characters and any object of ≤ 32 KB. `portable()` only strips `rev`. `rebuildProgress` keeps `fingering`. `portableSettings` = `withoutDeviceSettings`, so new keys sync by default and `fingeringVoice` must be added to `DEVICE_SETTINGS`, which v7 does. Three small gaps are in minor notes 2–3. |
| N2 cap reset and races | **Fixed.** `bumpTake` works on the shared ref (App 2190), and `recordDrillNow` writes `takeCounts` wholesale (1032), so the `~fg` key survives. JS `Math.round(0.5)` = 1, so takes 7–15 pay 1, and the cap of 15 holds. `recordDrill` runs under `drillLock`, and `recordFingering` under the same lock serializes against it, even though App's `take()` is never `chained` (all hosts pass 4 args). |
| N3 visit owner | **Fixed inside the visit.** The hand-back is not specified, and neither is the old coach at the cap (S1). Fingering-only stretches miss the persistence and result gates (S2). |
| N4 `exitAt` | **Fixed** (§3.5, §11.5, §15.1, G10). |
| N5 drum data | **Fixed** (§12.3, F9, G13). |
| Minor notes | All addressed (branch point, `bookFingerTime`, G1 Momentum, interim sounding mark, `orchDays`, the `stoppedAt` merge, Hebrew). `q: 'consolidation'` is a valid `Quality`. One leftover is in minor note 1. |

**Leak questions.**
- Through `takeFingering` → `onFingerTake` → `recordFingering`, a fingering take can reach none of these:
  - XP above the cap, a band factor, the boost or `MEMORY_XP`;
  - `withDrillGains`, the badge counters, `afterTake` bonuses or Momentum gains;
  - `passLog`, `cleanBpm`, a ceiling or `drillItems` (so no H10 or rank evidence);
  - `noteTake` or `count.current`.
- I found no route around the dedicated path.
- Cold status is covered by the interim mark (device-only; see minor note 10).
- The losses of legitimate data are in S1 (stage marks and old-coach key passes from straight takes inside a visit) and S2 (XP from a fingering-only session).

---

## Substantive issues

### S1. The hand-back to the host coach and the old coach at the cap are undefined, so a builder must guess, and the obvious guesses repeat tempi, lose legitimate passes, or rest the item

**Evidence.**
- **Record-only `coachAfter` does not exist** (`coach.ts:420` and `ksAfter` mix counters with all next-take logic), so it must be added. §9.8 item 9 lists what it does: counters, thinning, `timeUp` and closing. Nothing else.
- The host's tempo memory is therefore never told about the visit's straight takes:
  - key session: `ks.nps/bpm`, `lastBy` (the 10 % rule), `best`, `bestBy`, `sessionBest`, `lastGood`, `flow[rung]`;
  - old coach: `c.at`, `up`, `run`, `peak`.
- When `fg` clears, `coachTake` → `ksTake` / `tempoOf` serves the cell again from the pre-visit pulse. That can repeat a tempo just played straight in the visit, which breaks key-session-must-develop ("never the same take twice at one tempo").
- **Legitimate effects are lost:**
  - In the key session, `ksAfter` returns stage `marks` (`CoachNext.items`, which `coachNext` saves into `stages`). A clean pass-evidence attempt at target inside a visit would mark A-6 passed with fingering off. In record-only mode it marks nothing.
  - In the old coach, the same take would add the key to `c.passed` and move on. In record-only mode the coach stays on the key.
- **The replaced key-session visit has no defined close.** §6.1 and §7.2 say a fingering visit "replaces the rung's next speed or review visit". The spec never says whether it is opened through `openVisit` / `nextVisit`, or whether it is pushed to `ks.visited` / `ks.finished` at the end. So after the visit, `ksTake` returns the same speed stage of the same cell.
- **The old coach at the cap.** §9.2.2 exempts held takes from the limit logic **in the key session only**. In `coach.ts` the plateau rule runs after `PLATEAU_TAKES` takes at the top without a rise (`stall`, ≈ coach.ts 520–545). It returns `ceiling`, which `coachNext` saves with `withCeiling`, and the matrix then rests the cell for days. Under the cap the climb cannot rise, so a held cell in the old coach is rested for days by the feature. That is a planner effect §9.6 forbids. Nothing in the old coach says what comes after a clean take at the cap (§7.2: "the climb resumes").
- G12's mirror test cannot check this, because the old coach has no cap-visit concept.

**Fix (§9.2.1, §9.2.2, §9.8 item 9, G4, G12, G17).**
1. **Define record-only per coach.**
   - **Key session:** it updates `lastBy`, `best` / `bestBy` / `sessionBest`, `lastGood`, `dayStart`, and `flow[rung]`, set one mark above the visit's top clean straight tempo and never above the cap. It **emits stage `marks`** for straight takes (a legitimate stage pass stays a pass). It never updates `stepTakes`, `almost`, the limit, `ceiling` or the challenge.
   - **Old coach:** it updates `takes` / `clean`, thinning, and `c.passed` / `passedNow` when a straight take passes the key by the usual rule. It never updates `stall`, `ceiling` or `setComfort`.
2. **Define the end of a visit.**
   - **Key session:** the replaced visit is opened by `openVisit` (so it is in `ks.visited`). At the end it is pushed to `ks.finished`, and control continues with `nextVisit` (or the closing, if it is due).
   - **Old coach:** the cell is done for the session, unless it passed the key, in which case it advances as on a pass. `coachTake` moves to the next key or item, and the cell is not served straight again that session, except for the closing in the key session and the planned attempts.
3. **Old coach at the cap.** Add the §9.2.2 rule to `coach.ts`: a clean straight take at the cap is "held". It never counts toward `stall`, `PLATEAU_TAKES` or `ceiling`, and it ends the cell's run for the session (after the attempts, when they are planned). The end line names the hold.
4. **Tests.**
   - G12 asserts items 1–3 in both coaches.
   - G4 adds: "the first straight take of a cell after its visit never repeats a tempo played straight in that visit; a clean attempt at target inside a visit marks A-6 (KS) / passes the key (old coach) exactly as with fingering off".
   - G17 adds: "a held cell in the old coach never gets a ceiling from takes at the cap".

### S2. Fingering-only stretches fall through two existing gates, and the wiring of their continuation is unstated

**Evidence.**
- **`persistCoach`** (Drills 1583) returns early when `count.current.takes === 0`. By §9.8 item 5, fingering takes never increment `count.current`.
  - New-key blocks (§10) can be the first takes of a key session, and a standalone or non-cold block starts with A. A reload there saves nothing, so the visit is lost and the blocks replay. That breaks never-lose-progress, which N3's fix was meant to secure.
  - Fingering takes also never pass through `coachNext`, the only caller of `persistCoach`. The spec says `fingerAfter` returns `{state, line, end?}`, but not that Drills then sets `coachRef.current`, calls `persistCoach`, adds to `cXp`, sets `cLine`, speaks, and schedules `coachGo`.
- **`techResult`** (App ≈ 2238) returns null when `t0` (the session's counted takes) is 0. The XP of a session that ended after only fingering takes was written to `progress.xp`, but no result carries it. `rebuildProgress` recomputes XP from results, so it vanishes on the next rebuild, and the streak and the teacher's view miss the session. Example: a block left after A and C.
- **List runs and standalone runs:** §9.8 says list runs keep `FgVisit` "in their open-run save (`saveOpenRun`)". But `OpenRun` (`coachRun.ts:162`) holds only `key`, `day` and flags. A list run's position lives in `saveQueueAt`. Standalone "Retrain this fingering" has no named store at all.

**Fix (§9.8 items 5 and 9, G4, G24).**
- Drills gets a `fingerNext(r)`, the fingering counterpart of `coachNext`. It sets `coachRef.current` (with `fg`), calls `persistCoach`, sets the line, speaks it and schedules `coachGo`.
- `persistCoach`'s gate becomes `count.current.takes + fgTakes === 0`, with `fgTakes` kept in the run save.
- `techResult`'s gate counts fingering takes for **existence** only: `firstTry` / `total` stay measured-only, `xp` includes the fingering XP.
- Add an `fg?: FgVisit` field to the list run's saved position (`saveQueueAt` or a new field), and name the standalone store (the same field, keyed by the item page run).
- G4 adds: a reload after only fingering takes resumes the visit.
- G24 adds: a session of only fingering takes records one result whose `xp` equals the fingering XP and whose `total` is 0. That needs the result writer to accept `total` 0 when `xp` > 0.

### S3. `isPseudoItem` covers `<item>~feel`, which contradicts SP's binding amendment A2

**Evidence.**
- §9.8 makes `isPseudoItem` true for `~feel`, and says every `drillItems` reader skips pseudo ids, naming the key matrix, the path and the stars, Momentum, H10 readiness and item lists.
- SP §21 A2 (binding) says `~feel` items "appear in the matrix and the path as levels of the parent family, never in the parent's rank". It also says their own clean cold takes count as cold and as pass takes **under their own id**.
- A builder who follows this spec makes feel items invisible to the matrix, the path, Momentum and readiness when SP's feel layer ships. That is a measurement error in another spec's feature.

**Fix.**
- Restrict the filter to fingering rows: `isFingerRow(id)` = `id.startsWith('fg:')`.
- Leave `~feel` to SP A2's own rules (excluded from the parent's rank and breadth only).
- Change the F6 and §20 wording.
- G24 adds: a `~feel` item still appears in the matrix and the path.

---

## Minor notes
1. **G24 leftover.** It still says "the ledger gains time under `d:<mainItem>`", which contradicts §9.8 item 6 (no `d:` entry). Change it to "time by skill and key, no `d:` entry".
2. **Two sync details.**
   - `drillSyncNow`'s `merge` returns only `drillItems` (App 373), so `pullDrillItems`' repush check never sees `fg:` rows. The callback must return the merged `fg:` rows in `items` too.
   - §9.8 lists `markAllIfFirst` among the readers that **skip** pseudo ids. That is backwards: it must mark `fg:` rows dirty, or a device's fingering state never goes up on its first sync in a scope.
3. **Older app versions.** An older version that pulls `fg:` rows puts them into `drillItems` through `mergeItems` (the `itemId` check passes), and its readers then see a FingerCell where they expect an `ItemState`. Two options:
   - give each row harmless `ItemState` fields (`takes: 0`, `cleanBpm: 0`, `history: []`), or
   - write `fg:` rows only after a version gate.

   This matters for the owner's own devices while a PWA update is pending.
4. **Make `onFingerTake` a required prop**, wired at every Drills host (App ≈ 4747, 4773, 4804, 4821, 5115). If it is optional, a missing host silently drops fingering takes.
5. **Have `recordFingering` apply the take's delta to the stored ladder under the lock,** rather than writing the screen's `FgLadder` wholesale. `FgLadder.takes` and `activeMs` should merge by max, not by whole-ladder `upd`.
6. **The closing check** should use `keyCoach`'s `closingMs(c)` = min(`CLOSING_MIN`, 10 % of the session), not a flat 3 minutes.
7. **The time budget vs the reserved attempts.** §7.2 sends a visit that has run out of time to its attempts, so G4's "never over 2.5 minutes" can fail. Two options:
   - reserve the attempts' time (2 take lengths) inside the 2.5 / 3.5 minutes, or
   - let G4 allow the attempts to overrun.

   Day-1 timing (about 25 s per take) means about 6 takes fit in 2.5 minutes. The time budget, not the take count, usually binds.
8. **SP amendment.** The 7- and 9-take visit budgets replace SP's `VISIT_TAKES` = 3 for fingering visits and exceed SP §9's return-test bound (3–6). Add this to the SP §21 entry beside §16.7.
9. **Ledger quality.** `q: 'consolidation'` is quality time (`isQuality`), so fingering minutes raise the deliberate-practice share. That is defensible; state it, or use `'review'`.
10. **The interim sounding mark (`fgDay.sounded`) is device-only.** A fingering take on one device and a straight take on another the same day still marks `cd`. This is acceptable for an interim rule; one sentence would cover it.
11. **Hebrew** reads correctly and consistently ("אצבוע" is masculine throughout, "מנח יד", "עצירת טמפו" vs "השהיה").

## Q8 and Q9
- **Q8: (a)**, for the reasons in rounds 4–6:
  - the v15 guard record and readiness exposure under (b);
  - the shelving count resuming exactly when the attempts become allowed;
  - a single condition check in `fingerAfter`'s plan.

  Decide it on G3's numbers as planned.
- **Q9: accept** ⅔ and ⅓ beat with a triplet click for triplet items. Duple items are unchanged.

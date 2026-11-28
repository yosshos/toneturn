# Review: SPEC-FINGERING v8, round 8 (independent, 2026-11-28)

**Verdict: NOT CLEAN.**

The round-7 fixes are mostly right. S3 is fixed. Most of S2 is fixed. S1's record-only mode is now defined, and the old coach's `capHeld` rule is sound.

Four problems remain, and each comes from checking the spec against the real code:
- One S2 fix collides with the server schema (R8-1).
- The key-session open and close rule does not match how `keyCoach.ts` lays out visits (R8-2).
- The old coach's end of visit carries tempo memory to the wrong item and has no rule for one-cell runs (R8-3).
- List and standalone runs have a place to save the visit but nothing that drives it (R8-4).

All four are local fixes. None needs research or an owner decision; R8-1 needs a dry-run migration, which the owner has already OK'd.

**What I checked:**
- The spec v8 and the decisions commit 27e87ecd.
- Rounds 1–7, SP §3 and §21 (A1–A13), H2 §1.4 (on-disk v15; v16 decisions as briefed), and SPEC-INPUT-SOURCE R1–R6.
- `keyCoach.ts`: `KsState`, `setPulse`, `enter`, `openVisit`, `nextVisit`, `ksStart`, `ksTake`, and the whole of `ksAfter`.
- `coach.ts`: `coachTake`, `tempoOf`, and the whole of `coachAfter` (plateau, `held`, pass and park paths).
- `Drills.tsx`: `persistCoach`, `go`, `done()`, `coachNext`, `coachGo`, `stageDone`.
- App: `take()`, `afterTake`, `noteTake`, `techResult`, `drillWrites`.
- `drillSync.ts`, `drillMerge.ts`, `coachRun.ts`, `cloud.ts` `syncProgress`, `sync.ts` `rebuildProgress`, `stretchTarget`.
- The `toneturn_lesson_results` migrations.

## Round 7: status

| R7 | Status in v8 |
|---|---|
| S1 hand-back, old coach at the cap | **Partly fixed.** Three parts are right and buildable: record-only per coach, stage marks (A-6 passes only at `ks.target` = `stretchTarget`, same as with the feature off, and A-7 also opens on `passedAt`), and `capHeld`. Two parts are not. The key-session open and close (`openVisit` → `ks.finished` → `nextVisit`) does not fit the code (R8-2). The old coach's end of visit leaks `c.at` and `peak` and has no one-cell rule (R8-3). |
| S2 fingering-only stretches | **Mostly fixed.** `fingerNext`, the `persistCoach` gate with `fgTakes`, and the queue save's `fg` all work with the code. Two gaps remain. The `techResult` "total 0" result cannot be stored on the server and blocks every later result upload (R8-1). List and standalone runs have no driver (R8-4). |
| S3 `~feel` | **Fixed.** `isFingerRow` = `fg:` only. This matches SP A2. |
| Minor notes 1–11 | All addressed. `markAllIfFirst` needs no change: `drillSync` calls it with the `items()` loader, which already includes the `fg:` rows. |

**Leaks.**
- A fingering take still has no path to the item's record, `passLog`, `cleanBpm`, the badges, Momentum or `noteTake`.
- Inside a visit, record-only mode leaks nothing to rank.
- The one new leak is R8-3: old-coach tempo memory crossing to another item, which can write a false `ceiling`.
- **Lost legitimate data:**
  - R8-1: fingering-only XP never reaches the server, and later results are blocked too.
  - R8-2: the scale rung's remaining stages are skipped on visit days, which is acceptable but unstated.

---

## Substantive issues

### R8-1. A fingering-only result breaks result sync

**Evidence.**
- The schema in the repo has two checks on `toneturn_lesson_results`:
  - `total int not null check (total between 1 and 50)` (20261104000000);
  - `xp_plausible check (xp <= total * 20)` (20261108000000).
- No later migration loosens either one. A row with `total = 0` and `xp > 0` fails both.
- `syncProgress` (`cloud.ts`) sends all pending results in **one** `upsert` and throws on error. So once the §9.8 item 5 result exists:
  - it is pending on every sync;
  - the batch fails every time;
  - **no result from this device reaches the server again.**
- The effects: streak, league XP and the teacher's view are stale everywhere else. `rebuildProgress` on other devices never sees these sessions.
- The spec says only "the result writer accepts `total` 0", and that is not true of the server.

**Fix (§9.8 item 5, F6/F7, G24).**
1. Add a migration (dry-run first, per the owner's blanket OK):
   - `total between 0 and <a real ceiling>`;
   - `xp_plausible check (xp <= greatest(total, 1) * 20 + 15 * <cells>)`, or simply `xp <= greatest(total,1) * 20 + 60`;
   - keep `first_try <= total`.
2. `syncProgress` uploads row by row (or bisects) after a batch error, so one bad row can never block the others.
3. G24 adds: a fingering-only result uploads and a later normal result still uploads.
4. Separately, outside this spec: `total ≤ 50` also rejects any technique session with more than 50 measured takes. A 30-minute key session can pass that, so verify it on the live DB and fix it in the same migration.

### R8-2. The key-session open and close rule does not match `keyCoach.ts`

**Evidence.**
- **The scale rung is played twice per session in the current code:** visit 0 (opened in `ksStart`), and the closing.
  - `nextVisit`'s `reopen` filters out `v !== 0` ("the scale's open stages are the closing's").
  - SP §3's returns, "`nextVisit` may reopen the scale's speed stage", are **not built**.
  - So "replaces the rung's **next** speed or review visit" (§6.1, §7.2, §7.4) has no target, except the closing, which the spec excludes.
- **The cold check is the first take of visit 0** (H2 §1.4 "cold check first"; SP §3). So a fingering visit can only take **the rest of visit 0** after that take.
- **`openVisit(fam, c, 0, …)` is the wrong opener.**
  - It re-runs the rung's opening logic:
    - the probe flags;
    - `warmLeft = WARM_TAKES` and `review` on a known rung;
    - `enter()`, which resets `stepTakes`, `good`, `start` and `back`, and sets a new pulse.
  - It also sets `visitBudget = s0.share × minutes`, not §7.2's 2.5 / 3.5 minutes.
  - The straight takes inside the visit are then labelled `review`/`retention` in `done()`, because `kind` reads `warmLeft`.
  - `ks.finished.push(0)` changes nothing, because visit 0 is never reopened anyway.
- **What a builder needs to know:**
  - who starts `fg` after the cold take: `ksAfter` in normal mode on the cold take, or `fingerAfter`;
  - how the visit ends;
  - that on visit days the scale's own A-6 climb and A-7 move to the closing.

**Fix (§6.1, §7.2, §9.8 item 9 "Opening and closing the visit in the host", G4, G12).**

Replace the key-session bullet with this:
- *In the key session, a fingering visit (or block) takes **the rest of the cell's current visit after its cold-check take**: visit 0 for the scale; any rung visit for a v1 scale cell in a rotating or run rung; an SP §3 return visit once that is built.*
- *After the cold take, `ksAfter` runs in normal mode. `fingerAfter` then opens `fg` and sets `ks.visitAt = now`, `ks.visitTakes = 0` and `ks.visitBudget` = the §7.2 or §6.2 budget. It does **not** call `openVisit` on the rung.*
- *At the end it clears `fg` and leaves the rung exactly as `leave = 'budget'` does: `nextVisit(cur)` → `openVisit(nv)`, or the closing if it is due.*
- *The rung's other open stages (A-6's own climb, A-7) resume at the closing by its existing rules. The closing is capped (§9.2.2).*
- *A cap visit that starts inside A-6's own climb (a session without a fingering visit) uses the same opening (budget reset, `fg`) and the same end.*

G12 adds:
- the first take of a cold scale cell is never a fingering take or a straight take inside `fg`;
- the visit's budget is §7.2's;
- after the visit, the next take belongs to `nextVisit`'s rung or to the closing.

### R8-3. The old coach's end of visit: tempo memory leaks to the next item, and one-cell runs have no rule

**Evidence.**
- **The leak.** §9.8 item 9 lets record-only mode update `c.at` and `peak`, and then makes the cell "done for the session; `coachTake` moves to the next key or item". But:
  - `tempoOf` returns `c.at` for **whatever item is current** (`if (c.at) return …`).
  - The plateau rule compares every later clean take with `c.peak` (`coach.ts` 518–523).
  - The existing advance paths reset `c.at`, `peak`, `stall`, `up`, `run` and `slower`. The spec's advance does not say to.
- **The result:** carried over, the next key starts at the held cell's tempo. After 3 clean takes below the carried peak (e.g. ♩116), the plateau rule returns `ceiling = { itemId: <next key's item>, bpm: 116 }`. `coachNext` saves it with `withCeiling`, so the matrix rests **a different cell** for days with a false best. That is a measurement error caused by the feature.
- **One-cell runs.** There is no "next key or item" in:
  - a teacher's timed one-key assignment (`c.keys.length === 1`, last step, last spec: the case `coach.ts` handles with `WAVE_BACK`);
  - a standalone run.

  The spec does not say whether the run then ends, waves below the cap (which would repeat straight tempi from the visit), or plays variants. The same holds for `capHeld` "ends the cell's run for the session".
- **Blocks contradict this.** §6.1 says for the old coach that "the next take of the cell starts the block, then the climb resumes". §9.8 says the cell is done after a visit. A resumed climb after the block's closing ladder repeats tempi already played straight in the block.

**Fix (§6.1, §9.2.2, §9.8 item 9, G12, G17).**
- **Record-only in the old coach** updates `takes`/`clean`, thinning and `c.passed`/`passedNow` only. **No `c.at` or `peak`**: the cell does not continue, so they have nothing to do.
- **At the end of a block or visit,** the old coach advances exactly as its park path does, without adding to `weak`: it resets `misses`, `slower`, `up`, `almost`, `run`, `peak` and `stall`, sets `c.at = undefined` and `spec = 0`, and sets `keyIdx = nextKeyIdx(c)`. On a key pass it takes the existing pass path.
- **Blocks:** §6.1 changes to "then the cell is done for the session", the same as visits.
- **One-cell runs** (no other key or item): after the visit the run continues with **fingering takes only** (C or B above the cap, G), each at an unplayed (structure, rung, tempo), until time is up or nothing new is left. Then it ends with the hold line. It never plays a straight take again.
  - The alternative is to end at once. That needs a rule for the assignment's minutes.
  - Pick one and state it. I recommend the variants: the session keeps its length, and it adds no repeated straight takes.
- **G12 and G17 add:**
  - after a held cell's visit, the next key's first tempo and its plateau state equal those of a run in which that key comes first;
  - no `ceiling` is ever written for an item other than the one whose takes produced it;
  - a one-cell held run never plays two straight takes at one tempo.

### R8-4. List and standalone runs have a saved place but no driver

**Evidence.**
- v8 gives list runs `fg?: FgVisit` in the queue save, and standalone runs the key `fgq:<cellKey>`. But the continuation is defined only for coach runs:
  - `fingerNext` sets `coachRef.current`, calls `persistCoach` and schedules `coachGo`;
  - "while `fg` is open, `coachTake` returns `fg`'s next take".
- A list run has no `coachRef` and no `coachTake`. After a straight take, `done()` goes to `hfSchedule` with `lad.next.action === 'raise'` (hands-free) or `setBpm(lad.next.bpm)`, and to `go(i + 1)`.
- So inside a list-run visit:
  - the straight ladder (§5.5), the attempts (§9.2.3) and the cap would be chosen by `lad.next`, not by `fingerAfter`;
  - a fingering take has no defined next step at all.
- §9.2.3 puts the attempts "at the end of the cell's run" in list runs, and §6.1 runs blocks standalone. Both depend on this.

**Fix (§9.8 item 9, G4, G12).**

Add a "queue continuation" bullet. In a list or standalone run with `fg` open:
- `done()` and `takeFingering()` call **`fingerAfter(null, take, verdict, ctx)`**, with the queue's `fg` as its state (a `CoachState` is not needed).
- The returned next take sets the drill (structure, rung, hands) and the bpm through the same setters `go`/`hfSchedule` use, after the line (hands-free) or on Next (manual).
- `lad.next` and the hands-free miss ladder (`hfMiss`) are bypassed while `fg` is open.
- At `end`, `fg` is cleared and the run goes on with `go(i + 1, auto)`; a standalone run ends.
- The queue save is written after every take.

G4 and G12 run their list-run and standalone cases through this path.

---

## Minor notes

1. **Make the `fg:` shell a complete `ItemState`.** `ItemState` requires `key`, `hands`, `goalBpm`, `streak`, `fails` and `ewma`.
   - `takes: 0` keeps almost every old reader away, because they filter on `takes > 0` or `family`.
   - Still, `App.tsx` 359 (`drillFamilies`) adds `'fg'` to the profile's family list.
   - Any unfiltered reader of `ewma.*` would throw (`ladder.ts` `comps` reads `s.ewma.cv` without `?`).
   - Add `key: 0, hands: 'RL', goalBpm: 0, streak: 0, fails: 0, ewma: {cv:0,sd:0,vsd:0,hands:0,acc:0}`, and filter `fg` in `drillFamilies`.
2. **Make the shell deterministic and idempotent.**
   - `pullDrillItems` repushes any row whose merged shell differs from the remote one in stable JSON (`sameItem`).
   - So `mergeFingerCell(x, x)` must equal `x`, and the shell builder must always emit the same keys.
   - Otherwise the two devices repush each other forever. Add this to G19.
3. **`techResult`'s existence gate.** Fingering takes 16 and later on a cell pay 0 XP, so an XP-based gate misses that session. `onFingerTake` should bump a session fingering-take counter, and the gate should read it.
4. **Old-coach key pass with several specs.** "Passes the key by the usual rule" only passes it on the level's last spec (`c.spec + 1 < specs.length → c.spec++`). State which spec the visit's straight takes use (the main item), and that a pass on it advances the way the existing pass path does from the current `c.spec`.
5. **Two item marks under key-session record-only.** A clean take at or above an item's `ceil` clears it (`saveMark`), and challenge `chal.ceil` session ceilings exist too. Say that the item-`ceil` clear stays (it is a legitimate item mark) and that `chal` is untouched.
6. **§5.5 typo.** "Start: P0 at T_S (or at T_S when C did not run)" should read "the straight part starts at T_S (P0 when C ran)".
7. **H2 on disk** still reads v15 (expected). §9.9's section references hold.
8. **Hebrew and English copy** is consistent: "אצבוע" is masculine throughout, "מנח יד", "השהיה" vs "עצירת טמפו", "פרצים". The drums are buildable as written.

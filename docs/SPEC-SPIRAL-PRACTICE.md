# Spiral practice: a key from several angles, measured cold (v6, 2026-11-27)

Owner request, 2026-11-27: today the technique coach is linear. One scale climbs RH → LH → hands together → octaves →
tempo to the target, and only then do forms, arpeggios and licks come. Instead, a session should visit one key's material
from several angles and return to each exercise after a break. The research is in docs/RESEARCH-SPIRAL-PRACTICE.md.
Its findings:
- Interleaving lowers in-session performance and modestly raises retention.
- First exposure should stay blocked.
- Mini-blocks of 2–4 takes are better than switching every take.
- Spacing across days is the stronger effect.
- Promotion should rest on cold evidence, not on the in-session peak (Abushanab & Bishara 2013).

**v2:** review round 1 (independent, spec + code) found 6 blockers and 9 major issues. All of them are addressed below,
and the log in §11 maps each one to its fix.

## 0. Owner decisions (2026-11-27)

| # | Decision |
|---|---|
| D1 | First exposure stays blocked until 2 clean pulsed takes at a comfortable tempo. Then the exercise joins a rotation of 3–4 exercises, about 3 takes per visit. |
| D2 | A timed scale assignment's forms join the rotation once the assigned scale is acquired. These are contrary motion, rhythm variations, and 3rd/6th/10th apart. They no longer wait for its target. |
| D3 | The level and the path go by the **cold take**, the first take of an item after a break (§4). The session's best take is kept and shown, but it does not promote. The end of a session compares the cold take now with a week ago. |
| D4 | Rotation is on by default everywhere: the key session, timed teacher assignments, today's plan and workout blocks. A teacher's "exactly this exercise" (`!`) turns it off, and that session runs linear exactly as today. |
| D5 *(owner approved 2026-11-27)* | The brief page shows the **first time** a slot (§13a) appears in a run; a return visit gets no brief page, only the coach line. This is already how `useBriefGate` works (its `seen` set, taskBrief.ts:72). The one change: save the kinds already seen in CoachSave, so a reload doesn't brief a returning kind again. |

## 1. Terms

- **Exercise (the unit of rotation):** one matrix cell, or one step of a non-walked family, in one key. It holds its specs, such as RH, LH and RL items.
  - **The main item** of an exercise is its last spec: the hands-together item when there is one.
  - The hands-separate specs are blocked lead-in steps. They are played only while the main item is not acquired, and then the exercise rotates on its main item.
- **Acquired (main item):** 2 clean pulsed takes. A pulsed take is one with `take.stage === null`, so neither free time (`'free'`) nor quarters (`'quarters'`).
  - The takes may come from this session, or from before it: ≥ 2 passLog entries.
  - Beginners need 3 clean takes in both cases. A beginner here is `!skilled && tier ≤ 1`, with the tier passed in CoachBackground.
- **Slot** (§13a; was "kind" until v5; not the code fields `DrillSpec.kind` / `TakeTrace.kind`): `drill.spec.family` + the cell's `rung` + its hands group. Scale forms differ by rung. The order rule uses **angle** (§13a), not slot.
- **Visit:** consecutive takes on one exercise. The default is `VISIT_TAKES = 3`.
  - A visit that would end on a miss or an "almost" is extended by up to 2 takes until a clean one, so it ends on a success (Duke et al. 2009).
  - A pending thinning hold (0.145.7) extends the visit by that one take.
- **Session tempo (per item):** the item's last clean pulsed tempo in this session. Without one, use `at`, or the normal start minus one mark.
- **One mark:** `snapDown` to the metronome grid, at least 2 ♩ down. This is used everywhere the spec says "a step/mark below".
- **Visit cap:** 3 takes + up to 2 to end on a clean one + 1 for a thinning hold = at most 6. The close does not cut a visit short; the close starts at the next boundary.
- **Cold take:** see §4.1.

## 2. The rotation (old coach, `coach.ts`)

### 2.1 When it runs
- It runs on a coach session with ≥ 2 exercises: a walked plan, or a family's steps × keys.
- It is off in these cases:
  - `bg.exact` is set. The session is linear exactly as today, including hands-separate steps and the 0.145.6 over-target climb.
  - During the placement probe, which comes first and is unchanged.
  - When only one exercise exists: it plays as today, with the climb, the waves and the over-target climb.

### 2.2 Per-item and per-session state
- A new record, `CoachState.rot`. Old fields stay for the linear path.
  - `rot.items: Record<itemId, ItemRun>`, where ItemRun is:
    - `at`: the next tempo;
    - `sessionTempo`;
    - `peak`;
    - `stall`;
    - `limit`;
    - `over`;
    - `misses`;
    - `almost`;
    - `slower`;
    - `thinLv` and `thinRun`;
    - `cleanNow`: clean pulsed takes this session;
    - `coldDone: boolean`;
    - `state: 'blocked' | 'rot' | 'done' | 'rested' | 'parked'`.
  - `rot.set: number[]`: the exercise indices currently rotating.
  - `rot.cur`, `rot.visitTakes`, `rot.visits`: the visit counter.
  - `rot.entered`: the highest plan index that has entered.
- **On the session:** takes, clean, startedAt, minutes, the weak list, the probe, skilled, and the thinning ladder choice (jazz).
- `c.thin` (0.145.7) moves into `ItemRun` when rotation is on. On the linear path it stays as it is.

### 2.3 The set and its size
- **Size:** `min(ROT_MAX = 4, max(2, ⌊minutes / 4⌋))`. A 10-minute assignment gets 2 exercises, a 20-minute one 4. Beginners get at most 2.
- **Filling:** exercises enter in plan order.
  - One that is not acquired is played **blocked** first, as one visit, including its hands-separate lead-in.
  - **The lead-in:** each separate hand moves on after 2 clean pulsed takes at its comfort tempo, or 1 easy take. It never climbs to its target. Lead-in takes are not counted toward ACQUIRE_MAX.
  - The blocked visit ends after `ACQUIRE_MAX = 8` pulsed takes of the main item; rubato takes are not counted. MISSES_TO_PARK still applies within it, whichever comes first. The exercise is then parked as today.
  - A new item's click level starts at 0 (every beat).
  - With less than 3 minutes left, no new acquisition starts. One already started is finished.
- **Leaving the set:**
  - Target reached (a clean take at the target this session) → `done`. **The anchor is the exception (§2.6).**
  - The limit fired → `rested` for today, and the ceiling is saved. Its normal 3-day cooldown applies. **Not the anchor:** at its limit the anchor waves as on the linear path (WAVE_BACK, the limit line). It is never rested.
  - Parked → added to the weak list.
- **When the set shrinks to 1** with nothing left to enter, the session goes on linear on that exercise, as today: climb, waves and over-target.
- **When everything is done, rested or parked,** the session ends early with its summary, as today's coach does when nothing is left.
- **The weak-spot review** (REVIEW_EVERY) and the warm-up side take happen only at visit boundaries, and count as a visit.

### 2.4 The order
- Round robin over the set.
- A visit never follows one of the same **angle** (§13a) while another angle is in the set. The exception: anchor → form → anchor is allowed while another angle waits.
- **The close:**
  - In an assignment, the last visit, when 2 minutes are left, goes to the anchor.
  - Elsewhere it goes to the exercise closest to its next step: the highest `sessionTempo / target` below 1.
- `summary()` names what comes next time from the plan: the first exercise not done.

### 2.5 Tempo
- **The cold check:** the first take of an exercise chosen when the item is cold (§4.1, the 1-hour test, checked when the take is chosen). This applies on the **linear path too** (a set of 1, a single-cell assignment) and in `!` sessions; `!` is byte-for-byte the same as before except this one take's tempo. It uses the full click and is never a challenge take. Its tempo:
  - if `cleanBpm ≥ 0.95 × target`: `max(normal start, round(0.95 × target))`;
  - otherwise: the normal start (`tempoOf`).
  - Its result is recorded whatever it is (§4.1).
  - **Clean:** the climb continues from it.
  - **Missed or "almost":** graced, like a re-entry miss. It counts toward nothing (misses, park, stall); it is kept only as the measurement. The next take goes to the normal start, with the line "First take after a break. Now from ♩<start>."
- **Re-entry** (a later visit in the same session):
  - The first take is **one metronome mark below** the session tempo (`ladderStep` down; at least 2 ♩).
  - If it is clean, the next take climbs from the session tempo.
  - **Grace:** a miss or "almost" on the re-entry take counts toward nothing: not toward slower, the stall count, parking or a thinning step back. The next take repeats it. A second miss counts normally.
  - The re-entry take never counts toward the limit.
- **Over the target:**
  - Only the anchor climbs over its target (`over`, per item).
  - After a re-entry its climb keeps the cap `max(limit + 2, round(limit × 1.03))` once a limit exists. It does not take a full `climbFrom` step past it.
- **Thinning (0.145.7) per item:**
  - Re-entry keeps the item's level, but the re-entry take itself plays with a full click.
  - `thinRun` carries across visits.
  - A hold never carries to another item.

### 2.6 Forms and the anchor (D2)
- In a timed assignment (no `!`), the anchor is the assigned exercise.
- The forms from `scaleFormsFor` enter one at a time, starting once the anchor is acquired. They are still at most 2 tiers up.
- **Below its target,** the anchor gets at least every second visit.
- **At its target,** the anchor is not `done`. It stays in the set with its over-target climb on its own visits, and every third visit is enough.

### 2.7 Lines
- Each switch gets one short line that combines what happened with what comes next. Examples:
  - "Clean. Now 10ths apart, ♩72."
  - "Back to the scale, a step below ♩88: ♩84."
- A visit that ends by the mini-block rule adds nothing extra.
- A graced re-entry miss: "First take after a break — once more."
- A new slot shows its brief once (D5).

## 3. The key session (`keyCoach.ts`)

- **Coordination stages** (A-1…A-5, B-1…B-5) stay blocked, with a minute budget, as now.
- **Speed and review visits** (A-6, B-6, the scale's forms once A-3 has passed, and passed stages) get a budget of `VISIT_TAKES` takes. The end-on-success extension (§1) applies.
- **Returns:**
  - `nextVisit` may reopen the scale's speed stage, and the B rung's, before the closing, at least every third visit.
  - The once-only reopen (`reopen(1)`) becomes up to 3 reopens per 30 minutes for speed and review visits. Coordination visits stay at 1.
- **Filling the time:** when the returns are used up, open stages first, then the next rotating rung (block C/D/E).
- **The closing** is unchanged: it stays the scale's closing (`visitLine` S2).
- **Re-entry:**
  - One metronome mark below the item's last clean pulse (`itemPulse` / `lastGood`).
  - It **replaces** the WARM_TAKES easing for that visit; the tempo is never eased twice.
  - Grace as in §2.5.
- **The first visit of a known rung when cold (§4.1) opens with the cold check,** at `max(0.9 × best, 0.95 × target)` when best ≥ 0.95 × target. The target here is the **item's** target (`itemTargetBpm`, the one `itemPass` uses), converted through nps. It is not the stage's stretch target.
  - A clean cold check sets `warmLeft = 0` and climbs from it.
  - A missed one is graced and goes to the 0.9 × best warm-up as now.
- **Coordination-stage takes (A-1…A-5, B-1…B-5) never qualify as cold** and do not close the 1-hour gap. Example: A-4 and A-6 may be the same item.
- **Stage passes** (`specPassed`, A-6 at the target) stay **session-level gates** for moving between stages. Only `itemPass` (§4.2) drives the rank, the matrix and the path.

## 4. Cold takes and the level (D3)

### 4.1 Recording
- **A cold take** is the first **qualifying** take of an item when `now − lastQual ≥ 1 h` (owner 2026-11-27) and no cold take has been recorded since then.
  - **New fields on ItemState:**
    - `lastQual`: the time of the item's last qualifying take;
    - `coldAt`: the time of the last cold take.
  - Non-qualifying takes do not touch `lastQual`.
  - **Qualifying:**
    - pulsed (`stage === null`) and full click;
    - not a challenge, probe or coordination-stage take;
    - not a "Slower" take.
  - **Stopping:**
    - once the first note has been played, a stopped take counts as a missed cold take;
    - stopping during the count-in is free.
- **Who passes `TakeOpts.coldOk` to `applyTake`:**
  - the coach;
  - list runs, keyless level assignments and hands-free lists (Drills.tsx `applyTake` call) when the take is pulsed, full click and not a challenge;
  - so technique items practised outside the coach can pass as well.
- **Storage:**
  - `ItemState.cold?: { at: string; bpm: number; clean: boolean }[]`, newest last, at most 60 entries;
  - a `passLog` entry gets `cold: true` when the take was cold and clean.
- **Days:** coldness uses the 1-hour gap, not the day boundary. `itemPass` keeps counting distinct days the way it does now.
- **Each cold entry stores `gap`,** the ms since the previous qualifying take (the learning rate, §17.1).
- **`ItemState.firstTargetDay`** is the local day of the first clean take at ≥ 95 % of the target.

### 4.2 The pass rule (`itemPass`), technique drill families only
- **Target passed** needs both:
  - 3 counted clean takes at ≥ 95 % of the target, on ≥ 2 days, as today;
  - **and** at least one of them is cold (`cold: true`) **and on a later local day than `firstTargetDay`** (D6). One session can't pass an item by itself, even with a 1-hour break.
- **Passed stays passed:**
  - new `ItemState.passedAt` is set the first time the target passes, and `itemPass` returns target = true whenever it is set;
  - items passed before the release get `passedAt` on load. That is the legacy rule evaluated once, with passLog entries before `COLD_SINCE` counting as cold-eligible;
  - the passLog trim never drops the newest cold entry.
- **Scope:**
  - A family check on `ItemState.family`, inside `itemPass`, so every caller agrees: licks.ts, phrase.ts, repertoireDrills.ts, channelPlan.ts, sessionNeed.ts.
  - Technique drill families need the cold take.
  - Licks, encore phrases and repertoire keep today's rule.
- **Start passed:** unchanged.

### 4.3 What the player sees
- **The end line, for the anchor:**
  - It shows the verdict, not only the tempo, for example: "First take today: clean at ♩88 · a week ago: missed at ♩84. Today's best: ♩96."
  - "A week ago" is the cold entry 5–10 days back, the one closest to 7 days. Without one, the earliest entry is used, with its date. Without any, the comparison is left out.
- **The item page:** the history chart plots **clean cold takes** as the main line, and the session bests as faint dots.
- **Submission metrics** add `{ coldBpm, coldClean, bestBpm }` for the anchor. The closing line is already sent (0.145.8).

## 5. Spacing across days
- **Cells played today, not passed, not resting:** a ranking boost on day +2 in today's plan ("strengthen"). This is a new derived field, `need.back2`, from the item's `last`.
  - They are not excluded on day +1. A player who plays every day still gets a daily cold take.
- **Limited cells:** they keep the existing 3-day cooldown (`COOLDOWN_DAYS`). The 1-day rule of v1 is dropped.
- **Passed cells:** FSRS maintenance, as now.
- **The key of the week:** the first session of the week opens with one cold review take of last week's key-of-the-week scale cell (`why: 'review'`).

## 6. What does not change
- The climb within a visit, `climbFrom`, step quality, rubato first, and the by-ear demo once per item.
- The clock and score, and the hands-free flow.
- The probe. The level test.
- `!` assignments, including the calibration ones: they stay linear with a full click. Cold recording applies to them too, which is harmless.

## 7. Resume
- Saved runs from an older app version are already dropped (`readRuns`: `ver !== APP_VERSION`), so no migration is needed.
- A run reopened the same day restores `rot` from CoachSave.
- A cold restart from today's plan: `FrozenPlan.at` is the highest plan index that entered. The set is rebuilt from cells ≤ `at` that are not passed or rested today, plus the next one.

## 8. Telemetry
- Each take trace gets these fields:
  - `visit`: the session's visit index;
  - `vt`: the take's index in the visit;
  - `gap`: seconds since the item's previous take this session, or null;
  - `cold`: bool.
- They stay on the device, plus the calibration upload for calibration accounts.

## 9. Proof before release
- **Unit simulations** on the real catalogue, in the style of tests/coachAssign.test.ts:
  - **Timed assignment with forms, 10 and 20 minutes:**
    - after acquisition, visits hold 3–6 takes;
    - in every 6 consecutive takes after the 2nd form is acquired, there are ≥ 2 slots (within the anchor's forms), and ≥ 2 angles across the set once a non-scale item is in it;
    - at 10 minutes, every exercise that entered the set returns ≥ 2 times;
    - the anchor gets every second visit below its target.
  - **Re-entry:** one mark below; a miss there is graced; it is never counted toward the limit.
  - **Thinning moves forward across visits.** A hold never leaks to another item.
  - **`!` stays linear,** byte-for-byte the same sequence as before the change.
  - **Beginner:** 2 exercises, 3 clean takes to acquire.
  - **Edge cases:**
    - set of 1 → linear;
    - all items limited → the session ends early;
    - no acquisition starts with less than 3 minutes left;
    - review side takes fall only at visit boundaries.
  - **Cold:**
    - recorded once per 1-hour break; never twice without a qualifying take between them;
    - a pass needs a clean cold take on a day after `firstTargetDay`;
    - it skips free, quarters, thinned, challenge and probe takes;
    - an aborted take with no metrics doesn't use up the slot;
    - `itemPass` needs a cold take; legacy passLog entries stay eligible;
    - licks keep the old rule.
  - **A 3-day, several-keys simulation** (key-session-must-develop): every exercise gets a qualifying cold take each day, and promotion happens by day 2–3 for a player who is clean at the target.
  - **Resume:** a same-day reopen restores the rotation; a cold restart rebuilds the set; a reload doesn't re-brief a seen slot.
  - **Passed stays passed:** after 70 over-target takes, the item is still passed.
  - **A cold check that misses:** graced; the exercise is not parked by it.
  - **Lead-in:** RH → LH → RL within ACQUIRE_MAX for a player clean at comfort.
  - **List runs:** an item practised only in a list run can pass.
- **Key-session simulation:** the speed stages return 2–3 times in 30 minutes; coordination stays blocked; re-entry replaces the warm-up; the closing is unchanged.
- **e2e (MIDI simulated):** a timed assignment with forms shows a second exercise within about 10 takes after acquisition; the end line shows the cold comparison; a return visit shows no brief page.
- **Review:** an independent spec-only round 2 before building, and a review of the build before release.

## 10. Order of work
1. Cold takes and the pass rule (§4.1–4.2): `coldOk`, the cutoff, tests.
2. The rotation state and the old coach (§2, §7), including forms and the anchor, with simulations.
3. The brief rule (D5), once the owner OKs it.
4. The end line and the metrics (§4.3).
5. The key session (§3).
6. Spacing (§5) and telemetry (§8).

## 11. Review round 1 → v2

| # | Finding | Fix |
|---|---|---|
| B1 | The cold take may never qualify, so items never pass. | A cold check at ≥ 0.95 × target, full click (§2.5, §3) |
| B2 | Per-item state was only partly specified. | The ItemRun record (§2.2) |
| B3 | Thinning could never move forward. | Re-entry keeps the level, `thinRun` carries, a hold extends the visit (§1, §2.5) |
| B4 | The brief rule would show the brief on every visit. | D5, flagged to the owner |
| B5 | v1's 1-day return contradicted the cooldown. | Limited cells keep the 3-day cooldown (§5) |
| B6 | "Kind" was the family id, the same for every cell. | family + rung + hands (§1) |
| M7 | Hand items rotated as equals. | The cell is the unit; RH/LH are a blocked lead-in (§1) |
| M8 | Short sessions barely rotated. | The set size follows the minutes (§2.3) |
| M9 | Undefined cases. | §2.3, §2.4 |
| M10 | Resuming saved states. | §7 |
| M11 | The anchor at its target. | §2.6 |
| M12 | Key-session code mismatches. | §3 |
| M13 | Grandfathering was fragile. | `COLD_SINCE` cutoff (§4.2) |
| M14 | Recording details: the opts, days, aborts, scope. | §4.1, §4.2 |
| M15 | The cold tempo was the coach's choice. | Show the verdict; plot only clean cold takes (§4.3) |
| minor | Beginner definition, ACQUIRE_MAX counting, end on success, line merge, closing on the anchor, wording of `!`, key-of-week timing. | Applied |

## 12. Review round 2 → v3

| # | Finding | Fix |
|---|---|---|
| 1 | The cold check was missing on the linear path and in `!` sessions; the key session used the wrong target. | §2.5 linear + `!`; the item's target via nps (§3) |
| 2 | Two easings in the key session. | A clean cold check sets `warmLeft = 0` (§3) |
| 3 | "Previous take" was ambiguous. | `lastQual` / `coldAt`; coordination takes never qualify (§4.1, §3) |
| 4 | The passLog trim un-passes items. | `passedAt`, sticky (§4.2) |
| 5 | List runs were never cold. | `coldOk` from list runs (§4.1) |
| 6 | The lead-in had no rule for moving on. | 2 clean / 1 easy per hand, not counted in ACQUIRE_MAX (§2.3) |
| 7 | §5 contradicted §9. | A day +2 ranking boost, `need.back2` (§5) |
| 8 | Stopping a take gamed the cold slot. | Stopping after the first note counts as missed (§4.1) |
| + | A cold-check miss led to a park. | Graced (§2.5) |
| minor | No session tempo; the anchor rested at its limit; day vs 8 hours; visit length and "one mark"; unstated defaults; the scope check; the key-of-week anchor; the §9 wording. | Applied |
| info | D5 already worked this way in the code. | Only CoachSave persistence of seen kinds is added |
| info | Old saved runs are dropped, not migrated. | §7 rewritten |
| owner | A return drops one mark after a clean take. | This is part of the proposal the owner approved (2026-11-27, item 1: "start one step below on return"). The line says why. |

---

# Part II: the content, the levels, the feel and the learning rate (v6, 2026-11-27)

Part I (§0–§12) defines the rotation and the cold measurement. Part II says what the rotation plays and how it paces
each learner. Sources:
- docs/RESEARCH-KEY-EXERCISES.md (R1);
- docs/RESEARCH-KEY-EXERCISES-AUDIT.md (R2), with its final list, tempo table and feel layer;
- docs/RESEARCH-LEARNING-RATE.md (R3).

**v5:** this round fixes the completeness review of v4 (B1–B2, M1–M10, and the minor points). The log is in §20.

## 13. Owner decisions, part II (2026-11-27)

| # | Decision |
|---|---|
| D6 | A cold measurement is a qualifying take ≥ **1 hour** after the item's last qualifying take. A level pass also needs one clean cold take on a **later day** than the day the target was first reached (§4.2). |
| D7 | Every exercise has an entry band, prerequisites and a tempo band per band (§14, §15). Not everyone plays everything, and not at every tempo. |
| D8 | Feel variations apply to any exercise, the plain scale included (§16). |
| D9 | Swing grading: lines ≈ 1.5:1 (0.60); shuffle and ride feels 2:1 (0.667). |
| D10 | A **small-hands** profile flag, synced like other profile settings (§15.3). |
| D11 | **Learning rate** per learner × area × instrument (§17). It works fully without a teacher and changes pacing, never standards. Students see only themselves. Teachers see the rates and can override the pace. A weak global factor. |
| D12 | Scales **and arpeggios** with the hands a 3rd / 6th / 10th apart, and contrary motion from other degrees (items 35–36). |
| D13 | Register jumps (item 37). |
| D14 | Two-hand arpeggios, a family at high priority (item 26). |
| D15 *(my default, no lock)* | A self-learner gets the same pace control as a teacher override: **Auto / Steady / Reset my pace** (§17.4). A player or teacher can turn the feel layer off, or pick one feel for an item (§16.7). |

## 13a. Two words: slot and angle (fixes B1)

- **Slot:** `drill.spec.family` + the cell's rung + its hands group, as in §1. A slot drives:
  - the brief (D5): it shows on a slot's first appearance in a run;
  - the coach lines ("Same exercise");
  - item identity.
- **Angle:** the musical role, one of 14 values.
  - line-scale, line-interval, arpeggio-degree, arpeggio-progression, finger, independence, touch, harmony-voicing, harmony-colour, line-jazz, improv-prep, ear, read, classical-closer.
- **The order rule in §2.4 uses angle:** never two visits of the same angle in a row while another angle is in the set.
- **Exception:** the anchor and its forms are one angle, yet they still alternate as visits. The §9 variety test counts *slots* within the anchor's forms and *angles* across the set.
- **A feel or a burst** is neither a slot nor an angle. It is a modifier of a visit.

## 14. The exercise list

**Bands** (fixes M7): band 1 = T0–1, band 2 = T2–3, band 3 = T4–5, band 4 = T6+. The learner's **area tier** is the highest app tier whose scale benchmark the learner's cold scale tempo in that area meets.

**How to read the table:**
- **Tempo** is start → target at the item's entry band, as a factor of the player's scale tempo (§15.1). "Fixed" means not laddered (§15.2).
- **R2** points to the row in R2 §4.2 that holds the per-band tempi.
- **Prereq** is acquired in **any key**, unless "same key" is written.

| # | Item | Angle | Band | Pri | Prereq | Tempo | R2 |
|---|---|---|---|---|---|---|---|
| 1 | Scale in 4-note / 3-note groups | line-scale | 1 | H | scale HS | 0.9–1.0 | R1-#7 |
| 2 | Broken 4ths → 5ths, 6ths, 8ves | line-interval | 2/3 | H | 1 | 0.8 / 0.75 | R1-#1 |
| 3 | Rolling broken chords / Alberti per degree; RH scale over LH broken chord (3b) | arpeggio-progression | 1 (3b: 2) | H | triads blocked; 3b: + scale HT | 0.9 | R1-#9 |
| 4 | Cycle-of-5ths arpeggios, triads → 7ths | arpeggio-progression | 2 | H | k-sharm triads/7ths | 0.75–0.8 | R1-#2 |
| 5 | 7th chords, all inversions, every degree | arpeggio-degree | 2 | H | 4 (triads) | 0.8 | R1-#5 |
| 6 | Guide-tone lines through the cycle (+ approach at band 3) | line-jazz | 2 | H | 7ths known | Fixed | R1-#3 |
| 7 | RH line over LH guide tones | independence | 3 | H | 6, 11 | RH 0.85 | R1-#4 |
| 8 | Held notes walking the key | independence | 2 | H | five-finger | Fixed | R1-#6 |
| 9 | Voicing one finger louder | touch | 2 | H | velocity calibration | Fixed | R1-#8 |
| 10 | Shells → rootless through the cycle, comping cells | harmony-voicing | 2 | H | 6 | Fixed | R1-#10 |
| 11 | Digital permutations | line-jazz | 2 | H | k-sharm 45 | 0.85 | R1-#13 |
| 12 | The key's pentatonics in groups | line-jazz | 2 | H | 1 | 0.85 | R1-#11 |
| 13 | Burst practice (§15.4) | — (modifier) | 2 | H | item acquired | 1.10–1.25 × current | N1 |
| 14 | Feel layer (§16) | — (modifier) | 1–4 | H | item acquired straight | per feel | §3 |
| 15 | 4-5 / 3-4 pairs, trills, turns | finger | 2 | M | five-finger | trill n/s, capped | R1-#12 |
| 16 | Secondary dominants: shell → arpeggio → resolution | harmony-voicing | 2 | M | cadences | Fixed (voicing); arpeggio as 4 | R1-#14 |
| 17 | Hear-and-sequence motif (degree numbers or letters; **no movable do**) | ear | 1 | M | — | Fixed | R1-#15 |
| 18–21 | Line clichés; triads over a pedal; modal interchange; sus/add9 | harmony-colour | 2 | M | triads, cadences | Fixed | N8–N11 |
| 22–24 | Rhythm-cell improv; space drill; target notes on beats 1 & 3 | improv-prep | 2 | M | scale; 6 for 24 | Fixed | N12, N13, N19 |
| 25 | Blues in the key | line-jazz | 2 | M | scale; F1/F2 | 0.9 | N20 |
| 26 | Two-hand arpeggios: 26a split → 26b hand over hand → 26c interlocking | arpeggio-progression | 26a: 2, 26b: 2, 26c: 3 | **H** | 4 (triads) | 0.75, **capped** ♩=88 16ths | R1-#16 |
| 27 | LH tempo ladder (§15.6) | — (system) | 1 | M | — | LH 0.85–0.9 × RH | N4 |
| 28 | Broken alternate-note 4-note chords | arpeggio-degree | 2 | M | 5 | 0.8 | N3 |
| 29 | Key-complex closer (fixed; scale → arpeggio → V7 → cadence) | classical-closer | 2 | M | its parts, same key | Fixed, each part at 0.9 × its own clean tempo | N2 |
| 30 | Memory take | — (modifier) | 1 | L | item acquired | as the item | N5 |
| 31 | Motivic development | improv-prep | 3 | L | 17 | Fixed | N14 |
| 32–34 | 13ths; quartal arpeggios; dim / whole-tone on V | arpeggio-degree / line-jazz | 3 | L | 5; 2; V7 | 0.75 / 0.7 / 0.85 | R1-#17, #18, N18 |
| 35 | Arpeggios, hands a **3rd, 6th or 10th** apart (triads, then 7ths) | arpeggio-degree | 2 (3rd/10th), 3 (6th) | H | scales-8 at the same offset; 5 for 7ths | 0.8 × the 0.87 offset factor ≈ 0.7 | new: band 2 ♩=60→84 (8), band 3 ♩=56→72 (16), band 4 cap ♩=84 (16) [E] |
| 36 | Contrary motion from other degrees: scale (36a) and arpeggio (36b) | line-scale / arpeggio-degree | 2 | M | contrary from the tonic | 36a 0.9, 36b 0.75 | new: as items 1 / 4 [E] |
| 37 | Register jumps (§15.7) | independence | 2/3 | H | the figure acquired in place | Fixed tempo; laddered by distance and figure | new |
| L | Backdoor / tritone-sub cadences; pedal on key items; chromatic octaves; slow double 3rds; reading seeded to the key | various | 2–4 | L | per R2 | per R2 | N17, N6, N15, I6 |
| G/B | Guitar: single-string scale, position linking. Bass: walking through the cycle. Transfer items 1, 2, 4, 5, 6, 11, 12, 16, 22–25, 35, 37 | — | 2 | M | — | §15.8 | N21–23 |

- Every item runs in all 12 keys, in major and minor where that applies.
- **Excluded:** everything in R2 §6, Barry Harris claims that are not shown or confirmed, and the content of copyrighted method books.
- **Entry orders suggestions only.** It is not a lock (style-focus rule: NO locks). A player can open any item from its page. The rotation draws only from items whose band ≤ the area tier and whose prerequisites are acquired.

## 15. Levels and tempo

### 15.1 Tempo source (fixes M1)
- **The reference:** the player's **cold** scale tempo, in notes per second, in that key, for that hand. The fallback chain is:
  1. the same key and hand;
  2. the median of the other keys × the key's difficulty offset. The offset is the player's own per-key ratio when ≥ 3 keys are known, otherwise 1.0;
  3. the band's reference value from R2 §4.2.
- **HT items** use min(RH, LH).
- **A factor range** uses its midpoint.
- **Note value:** the factor applies to notes per second. The written note value follows the item's own rung (8ths or 16ths), as in SPEC-KEY-SESSION-2 §3.
- **Start** = factor × the reference. **Target** = factor × the band's scale target.
- **Existing items** keep `passedAt` (§4.2). Only unpassed items are re-targeted when the factors land, and `goalBpm` is clamped into the new start → target range.

### 15.2 Fixed-tempo items (fixes M4)
- **Which items:** 6, 8, 9, 10, 16 (voicing), 17–24, 29, 31, 37, and the L pedal item.
- **Each rung is its own item at a fixed tempo:** a harmonic rhythm or complexity step, e.g. "2 bars per chord", "1 bar", "inner voice".
- **Inside the rotation:**
  - **Re-entry** is at the same tempo. No mark down.
  - **The cold check** is the first take at the fixed tempo, graded on accuracy. A clean cold take counts toward the pass in the same way.
  - **They are never the anchor** for the over-target climb, and are excluded from the plateau/limit rule.
  - **The close** ranks them by clean-take share.
  - **Learning rate:** they feed only an accuracy-based acquisition rate (§17.1), never the tempo-gain rate.
- **Rubato-then-tempo:** their first take of a new rung is untimed (free time) only when the rung has pitch content new to the player (8, 9, 10, 16, 18–21). Cards and ear items (17, 22–24, 31) start at the pulse. This is the existing rule applied, not an exemption.
- **Lines:** a "climb" line is never said. They say, for example, "Same exercise, 1 bar per chord."

### 15.3 Caps and the small-hands flag
- **Capped below the scale target:**
  - 26 at ♩=88 16ths;
  - octaves at ≤ 2 octaves, with a limited number of reps;
  - trills: evenness gate first;
  - double 3rds.
- **Small hands** (D10) changes:
  - blocked octaves → broken legato;
  - item 2's 8ves → 6ths;
  - 10ths → 3rds (35, scales-8);
  - spread voicings drop the 10th;
  - item 37's leaps stay ≤ 2 octaves.
- It is a synced profile setting.

### 15.4 Burst practice (fixes M3)
- **Trigger:**
  - for the anchor: its limit fired twice this session;
  - for any item: no new clean session peak in 3 sessions on ≥ 2 days (matches §21 A9).
- **When it plays:** automatically, as the item's next visit (hands-free, no offer card). The coach says "Short bursts, then we join them." The burst is a visit of its slot, not a new slot or angle.
- **The visit:**
  - Groups of 2 → 4 → 8 notes. Each burst is followed by a one-beat rest, with the click going on through the rest.
  - The first burst is at 1.10 × the current tempo. Every clean burst take rises one mark, up to 1.25 ×, so a clean take is never repeated.
  - The visit ends with one **link** take of the full item, at min(current + one mark, the over cap §2.5, the item cap §15.3).
  - **Stop-and-go** (from R2 N1): a variant that rests on the beat after every group, used when the link take misses.
- **Burst takes are non-qualifying.** They are not cold and do not count toward the pass. They sit outside the plateau/limit count, peak and stall. The link take counts normally.
- **Grading:** the evenness inside each burst, and each burst landing on its beat. This is a new `burst` goal, a `TakeKind` `burst`, and telemetry.
- It is not offered before band 2.

### 15.5 Entry
- An item enters a learner's rotation when its band ≤ the area tier and its prerequisites are acquired.
- The learning rate can move entry by one band step, ± (§17.3). It never skips a prerequisite.

### 15.6 LH ladder (fixes M8)
- The LH tempo is tracked from HT takes: the per-hand timing in the take trace gives an LH-clean tempo.
- When the LH-clean tempo lags RH by > 12 %, the rotation adds an **LH visit**: the item's LH spec as its own slot, laddered from 0.85–0.9 × the RH tempo. It lasts until the gap is ≤ 5 %.
- HT starts at min(RH, LH factor tempo).

### 15.7 Register jumps (item 37)
- **The rungs:**
  1. a triad, 1-octave leap, one hand;
  2. 2-octave leap;
  3. 3-octave leap;
  4. a broken-chord figure leaping;
  5. one hand leaps while the other holds a pattern.
- **Played** at a fixed pulse: the figure on beat 1, the landing on the next beat 1.
- **Graded:**
  - landing pitches all correct;
  - landing onset within the band's timing window;
  - no gap greater than one beat before the landing.
- **Small hands:** at most 2 octaves.
- **Notation** shows the register change with an 8va/8vb mark, within one screen.
- `advanced-9` / `k-keyx` leaps stay. Item 37 is the per-key, laddered form.

### 15.8 Guitar and bass
- Factors apply in notes per second, like piano.
- The position model follows SPEC-KEY-SESSION-2 §2.3: one position → two positions → a full neck run.
- The transfer items use their existing guitar and bass generators where they exist (g-scales-10, b-scale-6, g-arps, b-chord).

## 16. The feel layer (fixes M2)

### 16.1 Where it runs
- It runs in the old-coach rotation (§2) and in the key session's speed and review visits.
- It never runs in coordination stages, in `!` sessions, in cold checks, or during acquisition (D1).

### 16.2 Which feels
- R2 §3.2, F1–F15, with their bands and grading.
- **By band:**
  - band 1 gets only F2 at ♩ ≤ 110, plus F5, F12, F13, F14 and F15;
  - swing (F1) starts from ♩ ≈ 90, and below that 12/8 (F5) is used;
  - F1's feel goal turns off above ♩ 260.
- **Tempo bands** for 16th items are stated in pair rate, not ♩.

### 16.3 Choosing the feel of a visit
- **Straight is part of the pool.** At least every third visit of an item is straight.
- No feel repeats on consecutive visits of the same item. Aim for 3–4 feels in a session.
- **Weighting by style focus:**
  - jazz → F1, F3, F14-swing;
  - Latin → F4, F11;
  - pop / funk → F7, F14;
  - classical → F12, F13, F15.

### 16.4 Ladders per feel group
- Each item keeps `sessionTempo`, peak and limit **per (item, feel group)**. The groups are:
  - straight;
  - rate-keeping feels: swing, accents, articulation, dynamics, groove. They share one group;
  - each rate-changing feel separately.
- Feel takes never set the plateau or the limit of the straight ladder.
- **The first take in a feel group** is at min(0.85 × that group's session tempo or the straight tempo, the re-entry tempo). It is never eased twice.
- **Rate-changing feels** (triplets F5 as 12/8, double-time F6, odd metres F8–F9) are separate **item ids** (`<item>~feel`). Each has its own D1 acquisition and no rubato.

### 16.5 Counting
- Only straight takes are cold or pass takes.
- Rate-keeping feel takes count toward the straight ladder's **best** for display, but never for passing.

### 16.6 The click and the feels
- With a groove (F14), the click stops after the count-in, as today.
- **Click thinning (0.145.7):**
  - **4/4 feels:** thinning as now. A swing visit uses the 2 & 4 ladder for every learner, because the backbeat is the swing reference.
  - **3/4:** 1 → 1 every other bar.
  - **5/4 and 7/8:** group starts → bar 1 only.
  - **Fixed-tempo items and bursts:** never thinned.

### 16.7 Control (D15)
- In settings and per item: the feel layer on/off (on by default).
- A teacher can pin one feel for an assignment, e.g. "swing this scale". `!` means straight.

### 16.8 On screen
- The feel shows as one chip on the stage strip, e.g. "Swing", "3/4" or "12/8".
- The score shows a swing marking or a time signature only. It stays within one screen.

### 16.9 Swing grading (D9)
- `swingBand` for lines:
  - target 0.60 at ♩ ≤ 160, sliding to 0.55 at ♩ ≥ 240;
  - accept 0.53–0.68 below ♩ 200, and 0.50–0.62 above.
- Shuffle and ride feels keep 0.667.
- **Regression check:** items with `spec.swing` move to the line target. Re-run their tests and their sample traces.

## 17. The learning rate (fixes M5, M6, M10)

### 17.1 The rates
- Each rate is per learner × instrument × area.
- **Areas:** scales, arpeggios, independence/finger, harmony, line-jazz, ear. They map to the skill-map areas. The Ear course keeps its own level model (ear-intelligence decisions), and its rate feeds only pacing there.
- **The four rates** (R3 §3a):
  1. **Acquisition (A):** the clean takes needed to reach 2 clean pulsed takes on a new item, measured at **2 clean whatever D1 is set to**, so it doesn't feed back on itself.
     - Fixed-tempo items use the takes needed to reach 2 accurate takes.
  2. **Climb efficiency (C):** a weak signal.
  3. **Cold gain per practice-hour (G):** the primary signal. Measured on pairs of cold takes ≥ 8 h apart, against the expected gain on an exponential curve.
  4. **Retention (R):** the cold take ÷ the previous session best, binned by gap.
- **Data for it** (fixes M10):
  - each cold entry stores its `gap` (ms since the previous qualifying take);
  - traces add `feel`, `burst` and `engineVer`.

### 17.2 Estimation
- Shrinkage to a prior (§9א).
- Assumed between-learner spread ±30 % until real users exist.
- **Before acting:** ≥ 6 cold pairs on ≥ 3 days across ≥ 2 exercises.
- **Down-weighted:** takes after 45 minutes of active practice (fatigue).
- **Reset** when the input device changes.
- **Breaks:** after a break > 10 days, speed-ups pause until 2 new cold pairs. After > 21 days, the multipliers return halfway to 1.0 (R3).

### 17.3 What the rates change
- **Never changed:** pass rules, verdicts, guards, the cold-check floor of 0.95 × target, and the beginner floors.
- **Limits on every multiplier:**
  - clamped to 0.67–1.28;
  - a speed-up ≤ +0.05 a week;
  - a slow-down at once;
  - a session's clean share < 50 % → 1.0 for that session.

| Parameter | Driven by | Range | Notes |
|---|---|---|---|
| D1 criterion | A | 1–3 clean | **Beginners: floor 2.** Speeding up needs an easy take (q ≥ 0.8). A missed first visit sends the item back to blocked (R3). |
| `VISIT_TAKES` | A + R | 2–4 | The §9 test bound becomes `VISIT_TAKES`–(`VISIT_TAKES` + 3). |
| When new items enter | G | earlier or later, by one boundary | **Set size never above ROT_MAX (beginners: 2).** |
| Band entry | G | ± 1 step | Prerequisites still hold. |
| Challenges (`CHAL_P`, gap) | G + C | 0.25–0.45, 4–8 | |
| `dayStart` brake | C | 1.15–1.35 | |
| Cold-check tempo | R | the 0.9 × best term moves 0.82–0.95 | The 0.95 × target floor stays (fixes M5). |
| Spacing | R | FSRS-style | The §5 boost day moves 1–3. |
| `skilled` per area | A | bool | Kept per area. **It never changes the beginner definition**: a beginner is a band-1 area tier, whatever `skilled` says. |
| Tempo step | G | 0.85–1.15 | Last in the build order. |

- The mapping formulas follow R3 §3(c).

### 17.4 Pace control (D11, D15)
- **The teacher and the self-learner see the same three choices:**
  - **Auto** (default): the rates act.
  - **Steady:** the multipliers are 1.0.
  - **Reset my pace:** clears the estimates back to the prior.
- A teacher's choice overrides the student's. `!` ignores the rates.

### 17.5 What people see
- **Student:** at most once a week, one self-comparison line, e.g. "Scales: your first-take tempo rose 9 % over your last 3 practice hours, faster than in October." No labels, percentiles or badges.
- **Teacher:** per area, the trend, the confidence and the retention.

### 17.6 Privacy, build order, validation
- **Privacy:** computed on the device. A small record per area syncs. The priors ship with the app.
- **Build order:**
  1. retention;
  2. `skilled` per area;
  3. shadow rates;
  4. structural multipliers;
  5. the tempo step.
- **Validation (R3):**
  - synthetic learners: fast learners gain ≥ 15 % more per hour, slow learners are no worse off, fewer than 5 % are wrongly sped up;
  - replay on the calibration traces: split-half reliability ≥ 0.4, otherwise keep only the retention features;
  - shadow mode, then an A/B test.

## 18. Integration checklist (each new family, level or modifier)

1. **Everything connects:**
   - path units: the new families slot into the existing key units by angle;
   - the skill map: each angle maps to an area;
   - the level test: each area samples its band's items;
   - the workout and today's plan;
   - XP and leagues: feel takes and link takes earn XP like normal takes; burst takes earn none (practice only).
2. **Course change:** course opener, unit openers, guard tests.
3. **Path step symbols:** a FAMILY_GLYPH entry per family, in the Paper icon language.
4. **Rubato then tempo** for laddered items. Fixed-tempo items follow §15.2.
5. **Timing cue always:** count-in, click and visual now-cue. Burst rests keep the click.
6. **One screen on a phone.** For leaps and 3–4-octave arpeggios: an 8va/8vb mark and a compressed system, never a scroll.
7. **Notation:**
   - 26 and 37 mark the hand per note (R/L);
   - held notes are tied;
   - voicing marks the voice to bring out.
8. **i18n:** every new line and title.
9. **Teacher assignment:**
   - every family is assignable, timed and with `!`;
   - the assignment form groups the families by band;
   - **forms per family** (fixes M9):
     - scale → `scaleFormsFor`;
     - arpeggio (4, 5) → 35 at the same tier, then 36b;
     - two-hand arpeggios → 26a → 26b → 26c;
     - fixed-tempo families → their next rung;
     - others → no forms: the anchor plus same-key rotation.
   - The anchor's target comes from §15.1.
10. **Hands-free:** bursts and LH visits come in automatically.
11. **Only verified theory.**
12. **Calibration thresholds per tempo band,** with position-locked bumps kept apart from drift.
13. **Guitar / bass:** §15.8.
14. **Small hands:** §15.3.
15. **No movable do** in any sung or spoken degree item.

## 19. Order of work
1. Cold takes, the pass rule and D6 (§4).
2. The rotation in `coach.ts` (§2, §13a).
3. Bands, tempo source, prerequisites and fixed-tempo items (§14, §15.1, §15.2, §15.5). The existing items get factors and fixed flags first.
4. The feel layer and the swing re-centring (§16).
5. New items by priority: 1, 2, 3, 4, 5, 26, 35, 37, 6, 7, 8, 9, 10, 11, 12, then burst practice and the LH ladder.
6. The key session (§3).
7. The learning rate (§17.6).
8. Spacing and telemetry.
9. The M and L items.

**Tests for each step:**
- the §9-style simulations for that step;
- for Part II:
  - bands gate the pool;
  - the tempo fallback chain;
  - fixed items never climb or plateau;
  - feel groups never touch the straight ladder;
  - no straight-only cold or pass leak;
  - burst takes are never cold or plateau;
  - the LH visit triggers at a > 12 % lag;
  - the per-family forms;
  - the rate multipliers respect every floor and clamp;
  - the pace control.
- An independent build review, and the §18 checklist.

## 20. Review round 3 (v4 completeness) → v5

| # | Finding | Fix |
|---|---|---|
| B1 | "Kind" had two meanings. | slot / angle (§13a) |
| B2 | Stale 8 h text; the later-day rule was missing from §4.2. | §2.5, §4.1, §4.2, §9 rewritten (1 h; `firstTargetDay`) |
| M1 | The tempo source was undefined. | §15.1 fallback chain |
| M2 | The feel layer conflicted with the ladder. | §16.1–16.5 |
| M3 | Burst practice conflicted with Part I. | §15.4 |
| M4 | Fixed-tempo items in the rotation. | §15.2 |
| M5 | The cold-check floor. | §17.3 |
| M6 | Rates against the beginner rules. | §17.3 table |
| M7 | Tier scales collided. | Bands (§14) |
| M8 | The LH ladder could not run. | §15.6 |
| M9 | Teacher assignment forms. | §18.9 |
| M10 | Rate data was missing. | §17.1 |
| minor | Closer fixed; thinning in odd metres; small-hands storage; R3 break rules; the visit bound; Part II tests; stop-and-go. | Applied |
| C | Student pace control; feel off or pick; feel shown on screen; XP for feel and burst; the ear-course interaction; guitar/bass factors; arpeggios a 6th apart. | §17.4, §16.7, §16.8, §18.1, §17.1, §15.8, item 35 |

## 21. Review round 4 → v6: binding amendments (they override any earlier text they contradict)

**A1. Fixed-tempo items** (§15.2) inside Part I:
- **No repeated take.** A clean take on a fixed item advances one of two things:
  - to its next rung, when the rung's pass needs are met today;
  - otherwise to a new **variant** at the same tempo: another voicing, inversion, seed or start degree.
- The visit ends after `VISIT_TAKES` or when no variant is left. The same take is never repeated at the same tempo.
- **When a fixed item is done:** its rung passed today → `done`. MISSES_TO_PARK parks it as usual.
- **A fixed anchor** (a teacher can assign one):
  - once its rung passes, the anchor moves to its next rung;
  - there is no over-target climb and no wave;
  - after the top rung it stays the anchor, as two-take reviews.
- **The tempo of each rung:** the lower end of R2's range at the item's entry band, then +10 % per rung up to the top of the range. For example, guide tones run swung ♩=80 → 140 and shells ♩=100 → 160.

**A2. Rate-changing feel items** (`<item>~feel`):
- They are their own items, played in their own feel.
- Their own clean cold takes count as cold and pass takes **under their own id**.
- They appear in the matrix and the path as levels of the parent family, never in the parent's rank.
- §16.1's rule "no feels during acquisition" applies to the parent item. A ~feel item has its own D1.

**A3. One beginner definition:** area band 1 (T0–1) by the placement tier, until cold data exists. `skilled` never overrides it.
- **D1 floors:** beginners 3 clean takes; everyone else 2, the owner's D1.
- **The rate may raise D1** by one, to 3 (or 4 for beginners). It **never lowers it below the floor.**
- The §17.3 table's "1–3" row becomes "floor … floor + 1".

**A4. The LH visit** (§15.6):
- **New data:** a per-hand verdict in the analysis and in `HandTrace`: `ok`, the hand's clean flag, using the hand's own evenness and timing limits.
- **"LH-clean tempo"** = the fastest HT take whose LH alone was clean.
- **The LH visit:**
  - at most **one per session**;
  - it counts toward ROT_MAX (it takes the item's slot for that visit);
  - it exits when the LH alone is clean at ≥ 0.95 × RH, or after its visit.
- §1 is amended: hands-separate specs also play as LH visits after acquisition.

**A5. Per-feel-group state.** ItemRun holds, per (item, feel group):
- `sessionTempo`, `peak`, `stall`, `limit`, `limitHits`;
- `thinLv` and `thinRun`. A swing visit's 2 & 4 ladder is its own.

In addition:
- A feel group hitting its limit **drops that feel for today**. It never sets the item to `rested`.
- **The anchor climbs over its target only when straight.**

**A6. Passing and legacy items:**
- `firstTargetDay` is **derived, not stored**: the earliest passLog day with a straight, qualifying clean take at ≥ 95 % of the current target. The new pass needs a clean cold take on a later day.
- **Legacy items:** the old rule is evaluated once at load under a stored `passMigrated` flag. If they pass, they get `passedAt`. If not, they follow the new rule, with pre-`COLD_SINCE` entries counting as cold-eligible.
- **Re-targeting** (§15.1) never touches:
  - `passedAt`;
  - a teacher's explicit `targetBpm`;
  - `!` (calibration) assignments.

**A7. The tempo source** (§15.1):
- **"Cold scale tempo"** = the best clean cold take, in notes per second, in the last 14 days.
- **Missing key:** the median of the other keys × a **catalogue** difficulty offset for that key. It is not the player's per-key ratio.
- **Hands:** use the HT tempo for both hands until the LH visit gives real per-hand data.
- **Target:** the factor × the scale target of the **item's entry band**. R2's explicit per-band ♩ wins when it is given. The start is clamped ≤ the target.

**A8. The area tier:**
- The placement tier (level test or self-report) until ≥ 3 cold takes exist in the area.
- After that, each area uses its own benchmark:
  - scales and arpeggios: tempo;
  - harmony, ear and improv-prep: their rungs passed.
- A band shift from the rates never changes the area tier or who counts as a beginner.

**A9. Bursts** (§15.4):
- **Never in:** `!`, the linear path, fixed-tempo items, `rested` items or ~feel items.
- **Trigger:**
  - for the anchor, `limitHits ≥ 2`;
  - for any item, **no new clean session peak in 3 sessions on ≥ 2 days**.
- **Groups:** 2 → 4 → 8, advancing after 2 clean bursts at a size. A missed burst repeats once, then drops one size.
- **The link take** is capped at min(the over cap for the anchor, the item's target for others, the item cap).
- A `TAKE_KIND` row: `burst`, with history, staircase and passes all false.

**A10. Forms and prerequisites:**
- A form whose prerequisite is not acquired is skipped. Example: item 35 needs scales-8 at that offset.
- When all forms are skipped, the session is the anchor plus same-key rotation.

**A11. Where Part II items come from:**
- **Today's plan:** matrix cells, with the new families as cells in the existing blocks by angle.
- **A timed assignment:** its anchor + forms (§18.9) + same-key cells drawn from the matrix for that key, filtered by band and prerequisites, to fill the set.
- **The key session:** its rungs, with the new families added to the ladder by angle.

**A12. The G rate:**
- Use only cold takes at a **known tempo relative to the previous best**: the verdict at 0.95 × target, or the peak of the first visit after a break of ≥ 8 h, divided by the previous session best.
- Never use the coach-chosen cold tempo itself.

**A13. Angles for existing families:**
- an angle table is built before step 3, covering every existing family and level;
- scales-8 and contrary motion → line-scale;
- k-sharm arpeggio levels → arpeggio-degree;
- k-sharm 3rds and drops → harmony-voicing;
- and so on, as a reviewed table in code.

**Minor:**
- A session's clean share < 50 % sets the multipliers to min(m, 1.0).
- The old coach's cold check has no "0.9 × best" term, so the R-driven row applies to the key session only.
- `swingBand` re-centring keeps the `drill.swingRatio` override and leaves voiceGrade's swingBand untouched.
- The §9 return test scales with `VISIT_TAKES`.
- `firstTargetDay` and "best" use straight, qualifying takes only.

## 22. Pointer: superseded by SPEC-HOLISTIC-2 (2026-11-27)
These SP rules are governed by docs/SPEC-HOLISTIC-2.md (v14: §1, governance list §1.16; v14 keeps v13's section numbers). Where they differ, HOLISTIC wins:
- **§2.5 / §3 cold check:** HOLISTIC §1.9's cold staircase. The key session's `max(0.9 × best, 0.95 × target)` is superseded, and the cell's main-item cold check is played before any other sounding take of the cell, in every planner (HOLISTIC §1.4).
- **§4.1 coldness:** `lastSound`, per cell, from any sounding take (HOLISTIC §1.4). `lastQual` remains only for the ≥ 1 h re-measure rule.
- **§4.2:** passes are kept, `passedAt` sticky. Rank comes from passed exercises plus the tier guard over every counting cold check at the tier (HOLISTIC §1.7 steps 1–6, owner decisions H8 and H11); the posterior drives only current form and adaptivity. The later-day cold take needs ≥ 8 h and a different local day (HOLISTIC §1.6).
- **§9:** "promotion by day 2–3" means the **item pass**, not a tier promotion.
- **§14 area-tier definition superseded** by HOLISTIC §1.3 (`areaTier`) and §1.7 (rank).
- **§14 / §15.5 entry:** HOLISTIC §1.3's entry formula and `placedTier`, with readiness entry (HOLISTIC §1.7a, owner decision H10); entry never exceeds max(`placedTier`, `rankHW`) + 2.
  - Prerequisites cross-session read `established` (HOLISTIC §1.6).
  - In-session forms follow D2 / A10 (`acquired`).
- **§15.4 burst trigger:** no new clean session peak in 3 sessions on ≥ 2 days (HOLISTIC §6.2).
- **§16.5 straight-only:** native feel counts as straight (HOLISTIC §1.4).
- **§17.3:** the "cold-check tempo, 0.9 × best" row is deleted; R drives the staircase step (HOLISTIC §1.9).
- **A3 / A8:** the beginner by placement content band; `paceTier` only for timing tolerances and stretch (HOLISTIC §1.3). The A8 "≥ 3 cold takes" switch is deleted.
- **A12:** G reads HOLISTIC §1.9's threshold estimate.
- **§4.2 (v13, owner decision H9 = variant V1):** a pass needs 3 counted clean takes at ≥ 95 % of target on ≥ 2 days, 2 clean first-cold takes of the cell's main item on two distinct later days (each ≥ 8 h after the first clean take at target and on a different local day; any cold miss of the main item at the probe band between them resets the pair), and a clean share ≥ 2/3 over the last ≤ 6 counting cold checks of the cell (HOLISTIC §1.6). The reference implementation is src/engine/measure/sim/itemPass.ts (HOLISTIC §9.1). Licks, Encore phrases and repertoire drills keep the old rule and count as coverage only for rank.
- **§15.5 / §17.3:** the rate's "band step" is a tier step, capped at +1.
- **§14 items 35 and 37 for guitar and bass:** item 35 → harmonised arpeggios in 3rds and 6ths across two strings or two positions; item 37 → position-shift leaps (HOLISTIC §13.1). Piano keeps the originals.

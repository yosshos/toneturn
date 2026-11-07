# Find my level 3.0 — a range, fast (spec addendum, 2026-11-07)

Product owner, 2026-11-07 (translated): *"Find my level has become very long — we have many areas and
sub-areas. Make the step from level to level in each sub-area of the test grow bigger and bigger as you climb,
so a player never answers 20 questions right in one area until failing #21. The system gets a range where the
player is (a bit lower is fine); fine-tuning comes later from exercises, lessons, drills, games. Maybe the
re-calibration of the path, the daily-workout recommendations and the level should happen more often than we
planned."*

Engine: `src/engine/placement.ts` (pure). Rating hand-off: `src/engine/rating.ts` (`setN`, `fast`).
Tests: `tests/placement.test.ts`, `tests/placementSim.test.ts`, the placement parts of `tests/skills.test.ts`.

---

## 1. Today (2.0): measured

2.0 climbs every skill's ladder from rung 1 (+2 rungs while right; after the first miss one rung at a time;
the second miss ends the skill). 26 skills (23 without the microphone), ladders of 4–8 rungs.

| | full test | full + voice | pitch area | time area |
|---|---|---|---|---|
| **worst case** (every answer pattern enumerated) | **171** | **193** | 52 | 34 |
| simulated player θ = 700 (mean / max) | 62 / 72 | 70 / 82 | 19 / 26 | 11 / 15 |
| θ = 1000 | 86 / 98 | 97 / 111 | 26 / 32 | 15 / 24 |
| θ = 1300 | 110 / 121 | 125 / 134 | 34 / 41 | 21 / 25 |
| θ = 1600 | 109 / 120 | 122 / 134 | 34 / 41 | 23 / 26 |

A strong player answers ~110 items, and in a 7–8-rung skill typically 5–6 right in a row before the first miss.
Mean |error| of the result: 100–160 rating points (§7).

## 2. Goals

1. A **range** per skill, not a point: where the player is, a bit low rather than high.
2. **Short**: ~25–35 items for a full test, ≤ 8 for one area; never more than 4 items in one skill.
3. **No long right-streaks**: the step between rungs grows while the player is right.
4. **Fine-tuning afterwards**: lessons, drills and games move a fresh placement fast (§5), and the path, the
   workout and the level re-plan more often (§6).

## 3. The design

### 3.1 Order and roles

Sections keep the 2.0 order (by area; the player's priority areas first; sung skills last). Inside an area:

| Role | Which skill | Budget | Starts at |
|---|---|---|---|
| **anchor** | the first skill of the area | 4 items | the area's prior (§3.6) |
| **follow** | each later skill | 2 items (4 when it disagrees, §3.3) | the area's estimate so far |
| **own** | `absolute`, `rhythm-reading` — never inferred (absolute pitch is unrelated to relative skills; rhythm reading feeds the timing rating) | 2 items | own prior (absolute: 1000) or the area's estimate |
| **derived** | a later skill once the area agrees (§3.5), or when the budget is spent | 0 items | — |

### 3.2 The accelerating search (one skill)

`searchSkill(M, start, budget, answers)`:

1. Ask rung `start`.
2. **Galloping**: while nothing has been missed, a right answer climbs **1, then 2, then 4** rungs; while nothing
   has been passed, a miss descends the same way (1, 2, 4).
3. **Bisection**: once a passed rung sits under a missed rung, ask the middle (rounded down — a bit lower).
4. **Stop** when the bracket is one rung wide, the top is passed, the bottom is failed, the item is skipped, or
   the budget is spent.
5. A noisy pass above a miss is ignored (the miss wins).

Example (12 rungs, true edge at 5): 1 ✓ → 2 ✓ → 4 ✓ → 8 ✗ → 6 ✗ → 5 ✓ ⇒ between 5 and 6. With a 4-item anchor
budget on a typical 7-rung ladder from rung 2: 2 → 3 → 5 → 7 reaches the top in 4 items.

### 3.3 Budgets (hard)

| Budget | Value | Constant |
|---|---|---|
| anchor | 4 | `PLACEMENT_BUDGET.anchor` |
| follow | 2, raised to 4 when its two answers go the same way (no bracket) and the area has room | `.follow` |
| own | 2 | `.own` |
| area | 8 items, all its skills together; room for its *own* skills is reserved | `.area` |
| test | 34 without the microphone, 40 with the sung area | `.test`, `.testSung` |

A skill's budget = min(its own, what the area has left, what the test has left). A skipped section's items still
count. When nothing is left: the skill is **derived** (area estimate, else the test's estimate − 100), and an
*own* skill is left **unmeasured** (the catch-up card offers it later, as for skills added since a placement).

### 3.4 The range and the set rating

Rungs have difficulties on the rating scale; virtual rungs 0 and M+1 sit 150 below / above the ends (`EDGE`).

- `low` = difficulty of the highest passed rung (none passed → virtual rung 0: *a bit lower is fine*).
- `high` = difficulty of the lowest failed rung (none failed → where the next gallop step would have gone,
  capped at virtual rung M+1).
- **rating = low + 0.4 · (high − low)** (`SET_AT`): the lower-middle of the range.

### 3.5 Inferring from the area

Once the area's **last two measured skills agree within 150** (`AGREE`, about one rung band), its remaining
skills (except *own* ones) are not asked: they are **derived** at the area mean − 50 (`DERIVE_DISCOUNT`), with a
300-point range placed the same way (rating at 0.4 of it). The same applies when the area or test budget is spent.

Typical full test: ~14 skills asked, ~9 inferred (pitch: degrees + intervals + absolute asked; chords,
cadences, modes and fine pitch inferred).

### 3.6 Priors (where a search starts)

- The first skill of the test: 950 (low-mid, `FIRST_PRIOR`) → e.g. degrees rung 2.
- A later area's anchor: the test's estimate so far − 100 (`CROSS_AREA_DISCOUNT`).
- A follow: the area's estimate so far.
- A re-test (a domain test or catch-up by a player who already has ratings): `placementLesson(seed, { priors })`
  — the player's current ratings start each search where they are (§8, wiring).
- The start rung is the highest rung at or below the prior.

## 4. API (placement.ts)

Unchanged and compatible: `placementLesson`, `adaptPlacement`, `placementState`, `placementResults`,
`placementSkills`, `lessonSections`, `LADDERS`, `PLACEMENT_ORDER`, `placementEstimate` (kept, no longer used for
results). Question ids keep `p:<skill>:<rung>:<n>` (PlacementMeter, TopicStrip, resume work as before; an old
2.0 save resumes — its answers are replayed by rung).

New:
- `placementResults(s)` items gain `low`, `high`, `derived`, `n` (evidence to credit), `fast` (fast-K window);
  derived skills appear with `asked: 0`.
- `planPlacement(answers, order, { skipped, sung, priors })` → per-skill plan (role, start, budget, lo/hi, range)
  and the next item; `placementPlanOf(session)` for the result screen.
- `searchSkill`, `searchRange`, `rungDifficulty`, `rungAt`; constants `PLACEMENT_BUDGET`, `AGREE`, `SET_AT`,
  `EDGE`, `DERIVE_*`, `NOT_DERIVED`, `PLACEMENT_EVIDENCE`, `RECAL`.
- `placementLesson(seed, { …, priors })` stores `placementPriors` on the lesson (type `PlacementLessonDef`).
- Re-calibration (§6): `recalibration`, `skillForm`, `ratingDrift`.

## 5. After the placement: a rating that converges fast

A short placement is a range; practice must move it quickly. `rating.ts` gets two optional fields on a `set`
event (no change for any other event, nor for a set without them):

| Field | Meaning | Placement values (`PLACEMENT_EVIDENCE`) |
|---|---|---|
| `setN` | evidence credited by the set (default 6 as before; never lowers what the skill has) | anchor 6, follow / own 4, **derived 2** (stays *provisional* on the map) |
| `fast` | the next *fast* rated answers in the skill use K = 64 (provisional) instead of 24 | **8** |

So after a placement — also a re-test of an experienced player — the next 8 answers in each skill move it up to
±32 each (MAX_STEP 60 unchanged): a placement that was one rung low is corrected within one or two path steps.

## 6. Re-calibration: more often (thresholds in `RECAL`)

| Trigger | When | Action |
|---|---|---|
| **Daily** | the first app open of a local day | rebuild the workout suggestion (§6.3); recompute `recalibration` |
| **After every session** (lesson, path step, drill, game, workout block) | `notePathResult` | recompute `recalibration`; refresh the workout suggestion; the path rebuilds as below |
| **After a placement / area re-test** | at once | path rebuild (P14 as today), workout rebuilt |

### 6.1 The path

- **Current unit** (frozen): when a skill of the unit moved **≥ 100** (`RECAL.unitDrift`) since the unit was
  frozen — `ratingDrift(ratingsAtFreeze, ratingsNow, unitSkills)` — its **unplayed** steps of that skill are
  re-chosen from the new frontier (done steps stay). Today this happens only after a placement / questionnaire.
- **Projected units**: redrawn whenever a frontier moved ≥ 75 (P5, unchanged) **or** `recalibration().redrawProjected`
  (a skill moved ≥ 100 from its placement after ≥ 6 answers).
- **Inferred skills** (`derived`): their first step on the road is the 4-item **probe** of P6 (as for an
  unmeasured skill), so they are measured by practice before steps are skipped or ✓'d.

### 6.2 Promotion / demotion prompts

`skillForm(events, skill)` replays the skill's last 8 answers since its placement and compares them with what
the rating expected at the time (gap = mean(score − expected)).

| Prompt | Condition | Offer |
|---|---|---|
| **"You seem above this — test out?"** | gap ≥ +0.15 and ≥ 7 of the last 8 right (`promoteGap`, `promoteRight`) | the current unit's Jump-ahead test (P16); declining snoozes the skill 7 days |
| **"This seems hard — easier steps?"** | gap ≤ −0.20 and ≤ 4 of 8 right (`demoteGap`, `demoteRight`) | rebuild the current unit's unplayed steps of that skill from the new frontier (one tap; snooze 7 days) |
| **Area re-test** ("Check your level in Rhythm? 8 questions") | ≥ 2 skills of the area drifted ≥ 150 from their placement, or the area's placement is ≥ 30 days old and one of its skills drifted / is promoted | `placementLesson(seed, { domain, priors })` |

At most one prompt per session end (promotion first), never during a session.

### 6.3 The workout

`suggestWorkout` is pure; it is simply called more often: on the first open of a day, after every finished
session (the current unit's remaining steps changed), and after a placement or a path rebuild. An edited template
keeps its structure (W6/W11 unchanged); only its content is refreshed.

### 6.4 The level (overall / ranks)

Nothing extra to store: ratings are folded from events, so the fast-K window (§5) makes the overall level and the
rank follow practice right after a placement; derived skills count with low confidence (n = 2 → weight 2/12 in
the overall) until practised.

## 7. Simulation (tests/placementSim.test.ts)

Players of true level θ, each skill θ + N(0, sd), answer with
`P(right) = 0.2 + 0.8 / (1 + 10^((d − θ)/200))` (guessing floor 0.2). 100 players per cell. Error = |set
rating − truth clamped to the ladder's open ends|. Items mean / max; error measured / inferred / all.

**sd = 0 (same level in every skill)**

| θ | 2.0 items | 2.0 error | **3.0 items** | **3.0 error** (asked / inferred / all) |
|---|---|---|---|---|
| 700 | 62 / 72 | 143 | **21 / 34** | 116 / 94 / 108 |
| 1000 | 86 / 98 | 161 | **32 / 34** | 125 / 86 / 111 |
| 1300 | 111 / 121 | 146 | **34 / 34** | 125 / 97 / 113 |
| 1600 | 109 / 120 | 100 | **30 / 34** | 106 / 88 / 99 |

**sd = 100 (skills differ)**

| θ | 2.0 items | 2.0 error | **3.0 items** | **3.0 error** (asked / inferred / all) |
|---|---|---|---|---|
| 700 | 63 / 75 | 145 | **21 / 34** | 113 / 96 / 107 |
| 1000 | 86 / 99 | 159 | **32 / 34** | 127 / 125 / 126 |
| 1300 | 109 / 118 | 141 | **34 / 34** | 127 / 132 / 129 |
| 1600 | 108 / 116 | 96 | **31 / 34** | 113 / 130 / 119 |

With voice (sd = 100): 2.0 71–124 items → 3.0 24–40 (max 40). One area (sd = 100): pitch 2.0 19–33 → **5–8**
(max 8), time 2.0 11–22 → **3–7** (max 8); errors 97–150.

Reading: **~3× shorter**, never above budget, and no less accurate (the 2.0 point estimate from a staircase
to failure was noisier than it looked: one lucky or unlucky answer moved it a rung). Errors are about one rung
band (~120), biased low by design; §5 removes them within ~8 answers per skill.

Test targets (CI): full test max ≤ 34 / 40, mean ≤ 35 and < 60 % of 2.0; one area ≤ 8; mean |error| ≤ 150
(asked) and ≤ 160 (all).

## 8. Wiring (outside the engine)

1. **progress.ts** (`resultFromSession`, the placement `sets`): add `setN: x.n, fast: x.fast` to each set item
   (and to the result item type); in `applyResult`, copy `setN` / `fast` into the set `RatingEvent`.
2. **lesson.ts**: add `placementPriors?: Partial<Record<SkillId, number>>` to `LessonDef` (the engine reads it
   through `PlacementLessonDef` already). **App.tsx** `openPlacement` / `openCatchUpPlacement`: pass
   `priors` = current ratings of skills with `evidence(r) === 'measured'`.
3. **path.ts** `placed()` / `frontierOf`: a set event with `setN === PLACEMENT_EVIDENCE.derived` counts as
   *not placed* for P6 (probe first). P2's "placement rung counts only with ≥ 3 items at ≥ 80 %" no longer
   fires (one item per rung); ✓ from a placement then comes through the quick check (P3) — intended.
4. **App.tsx** `notePathResult` (after every session): `recalibration(p.ratingEvents, ratingsOf(p), new Date(),
   PLACEMENT_ORDER, snoozed)` → prompt card (promote → `openTestOut(currentUnit)`; demote → rebuild unplayed
   steps; retest → `openPlacement(domain)`); `ratingDrift(foldFromMemo(p.ratingBase, events ≤ frozenAt),
   ratingsOf(p), unitSkills)` non-empty → rebuild the frozen unit's unplayed steps. Snoozes:
   `settings.recalSnooze: Partial<Record<SkillId, string>>` (7 days).
5. **Workout**: recompute the suggestion on day change and after each session / rebuild (§6.3).
6. **UI** (Lesson TopicStrip / result screen): inferred sections show "≈ from your <area> answers" instead of ✓;
   the result lists each skill's range (`low`–`high`) with the set rating; PlacementMeter needs no change (bigger
   jumps already read as *up2*; a bisect step reads as *edge*).
7. **Technique staircase** (SPEC-TECHNIQUE §13): same rule — tempo steps +15 %, +30 %, +60 % while clean, then
   one bisect take; ≤ 4 takes per family.

# The learning path — an adaptive spiral (spec addendum AF, part of 0.38)

Product owner, 2026-11-07: *"Under Your path I still get the same path as the first time I opened the app,
although I took the level test. The questionnaire should set the order of topics; maybe every unit covers all the
chosen topics in a spiral; maybe some content can be left out; difficulty keeps rising. Exercises the player
already knows are marked ✓ (like Duolingo's skip after a test) — decided gently, by the difficulty of what they
passed, the time against the target and a minimum number of repetitions. After the test and the questionnaire —
also when they are taken again — the path changes."*

## 0. What is wrong today

| Today | Effect |
|---|---|
| The path is a fixed list of ~30 hand-made lessons; the questionnaire only reorders that list by area | most of the app's 300+ exercise levels (topics) never appear on the path |
| *Find my level* only **unlocks** lessons (`placementUnlocks`) | nothing is marked as known; a strong player still walks the same road from lesson 1 |
| Ratings, sub-skill accuracy and speed never touch the path | the path doesn't get harder or easier with the player |
| Nothing can be left out | a guitarist who never sings still gets singing lessons in line |
| The path is built once from settings | retaking the questionnaire or the test changes little or nothing |

## 1. What others do (and what we take)

| Model | Idea | We take |
|---|---|---|
| **Bruner's spiral curriculum**, Kodály sequence, ABRSM / RCM grades | every strand comes back at every level, each time deeper; a grade covers all strands | **units = one level step across all chosen areas** |
| **Interleaving** and **spacing** research (Rohrer & Taylor; Cepeda et al.) | mixed practice and spaced returns beat blocks | areas interleaved inside a unit; review steps spaced |
| **"85 % rule"** (Wilson et al., 2019) — the best learning at about 15 % errors | target difficulty where success ≈ 0.8–0.85 | each step is chosen at the player's level + a stretch, aiming at P(correct) ≈ 0.8 |
| **Duolingo** path | units of mixed lessons, jump-ahead test to skip a unit, legendary level, practice / review steps, path redrawn after a section test | ✓ *tested out*, **jump-ahead test** per unit, ★ *mastered*, review steps |
| **Khan Academy** mastery | per skill: attempted → familiar → proficient → mastered; a course or unit challenge can raise many skills at once; mastery decays if later wrong | per-step states from evidence; the level test raises many at once; ✓ can be withdrawn |
| **ALEKS** (knowledge space theory) | an initial assessment finds what you know and the "ready to learn" frontier; periodic knowledge checks re-test and remove or restore topics | the path is built from the **frontier** per skill; periodic re-checks (light) |
| **IXL diagnostic** | a level per strand; recommendations per strand | a frontier per skill, not one global level |
| **Brilliant**, **Babbel**, **Simply Piano**, **Yousician** | choose a course focus; skip with a test; leave out what you don't need | **content choices**: areas off, optional packs (jazz, maqam, production…) |
| **Anki / FSRS** | spaced repetition by predicted forgetting | review steps from the existing review queue, spaced by recall |

## 2. Words

- **Step** — one node on the road: a topic at a level (e.g. *Intervals · level 2*), or a hand-made lesson
  (e.g. *Home, third, fifth*). Every step has a domain, a skill, a sub-skill, a **difficulty** (the app's rating
  scale), prerequisites, and a filter (instrument, track).
- **Unit** — 6–10 steps at one **level step** across the player's chosen areas, ending in a **checkpoint**
  (a short mixed test of the unit).
- **Frontier** of a skill — the difficulty the player is ready for next: their rating in that skill (measured), or
  the track's starting point (not measured yet).

## 3. Inputs

| Input | From | Effect |
|---|---|---|
| Areas in order of importance | questionnaire (*rank the areas*) | how many steps each area gets in a unit (§5.2) |
| Areas left out, optional packs | questionnaire (new question) + Settings → *My path* | steps of those areas / packs never appear |
| What you play | questionnaire | instrument steps (neck / keys / play-back); vocal-technique steps only for singers |
| Track (explorer / hobby / student / pro) | questionnaire | starting frontier, importance of skills, how much explanation |
| Minutes a day | questionnaire | unit length (5 → 6 steps, 10 → 8, 20 → 10) and steps per day |
| Ratings per skill + sub-skill accuracy | *Find my level*, every answer | frontier per skill; ✓ decisions (§6) |
| Speed (fluency) per skill | every answer (0.36 pace profile) | ✓ decisions; mastery |
| Review queue | wrong answers (existing) | review steps (§7) |

## 4. The catalogue of steps

All of it, built automatically:

- every **topic level** (`TOPIC_GEN`, ~70 topics × their levels, incl. 0.38) → one step, difficulty = the level's
  item difficulty, sub-skill = its primary tag;
- every **hand-made path lesson** (the existing ~30 + the 0.38 ones) → one step (difficulty = mean of its items);
  they become the *teaching* steps: the first time a sub-skill appears on the road, its hand-made lesson (or the
  topic's quick lesson) comes first;
- **vocal ladders** (technique, harmony, sight-singing) → steps for singers;
- **checkpoints** and **review** steps are generated per unit.

Prerequisites: `SUB_PREREQ` (sub-skill graph) + the lesson prerequisites (`PREREQ`) + "level n before level n+1
of the same topic".

Optional **packs** (off by default unless the questionnaire turns them on): *Jazz & Barry Harris*, *Maqam &
Middle-Eastern rhythm*, *Absolute pitch*, *Production ear*, *Post-tonal* (set classes, atonal dictation).
Questionnaire defaults: pro / student → Jazz on; *plays production* → Production on; Hebrew interface → Maqam
offered (asked, not on); absolute pitch is always opt-in.

## 5. Building the path

`buildPath(input) → Path` is a **pure function** of the questionnaire, settings, ratings, sub-skill stats, pace
and the step history. It runs whenever any input changes (§8).

### 5.1 The frontier

For each skill *s*: `frontier(s) = rating(s)` when measured (n ≥ 3 or placed), else `START[track]`
(explorer 850, hobby 950, student 1100, pro 1250). Sub-skill nudge: `+150·(ewma − 0.75)` (clamped ±100) when the
sub-skill has ≥ 3 answers.

### 5.2 Units (the spiral)

Unit *u* is built from the steps still open (not done, not ✓, filters passed, prerequisites met by earlier
units or ✓):

1. **Areas share the unit by rank**: weights 5, 4, 3, 2, 2, 1, 1 for the 1st…7th area (left-out areas: 0);
   *n_a = max(1, round(L · w_a / Σw))* for every included area with steps left, L = unit length; the top area gets
   the remainder.
2. **Inside an area**, skills take turns (round-robin by importance × gap, the scheduler's score) so the spiral also
   turns over the skills of an area.
3. **Which step of a skill**: the open step with the lowest difficulty ≥ `frontier(s) − 150`, preferring
   difficulty ≈ `frontier(s) + 50` (P ≈ 0.8). Steps far below the frontier that are not ✓ are *review-level* and
   only enter if the sub-skill is weak (ewma < 0.7).
4. **Teaching first**: a sub-skill met for the first time brings its teaching step (hand-made lesson / quick
   lesson) in front of it.
5. **Order inside the unit**: interleaved by area (never two steps of the same area in a row when avoidable),
   rising in difficulty; then the **checkpoint** (8 mixed items from the unit's steps, 2–3 per area).
6. Units are numbered and titled by their level (e.g. *Unit 4 · around 1150*), with the area chips they contain.

Difficulty rises because the frontier rises with every success, and every new unit is built from the new
frontier. A skill whose rating falls gets easier steps in the next unit (never in a unit already started).

### 5.3 Stability

- **Done** steps stay where they were, forever (history).
- The **current unit** (the one with the current step) is **frozen** once started: its steps don't change under
  the player, except that a step can turn ✓ (§6) after a placement.
- Units after the current one are **projected**: shown, but rebuilt on every change. The next 2 units are shown;
  further ones are not drawn (they would change anyway).
- After a rebuild that changes anything visible, a small card says what changed (§8).

## 6. ✓ "You already know this" (test-out) — the gentle rule

A step turns **✓** (skipped, not required, still playable) when the evidence says the player would pass it.
For a step of sub-skill *b* of skill *s* at difficulty *d*:

| Factor | Formula | Needed |
|---|---|---|
| **Predicted success** | `P = 1 / (1 + 10^((d − r_b)/400))`, `r_b` = frontier with the sub-skill nudge | P ≥ 0.85 |
| **Evidence ceiling** — never skip above what was actually shown | `h` = highest difficulty answered correctly in *b* (or in *s* by placement) | d ≤ h + 50 |
| **Repetitions** — the minimum number of times the skill was shown | n_b = answers in the sub-skill; placement counts its passed rungs | n_b ≥ 3 (or placement passed a rung ≥ d), and ≥ 2 distinct sessions unless from the level test |
| **Speed** — answered at the player's fluency target or faster | median time / target for the skill (0.36 pace profile) | ≤ 1.25 (no time data: neutral) |
| **Recency** | days since the last evidence | ≤ 60, else needs one fresh correct answer |
| **Not on a slide** | the sub-skill's accuracy now | ewma ≥ 0.75 |

All six → ✓. The check runs per step; ✓ steps show a ✓ medallion and can be played ("practice anyway").

**Withdrawing ✓** ("needs a refresh"): if later the sub-skill ewma < 0.65 over ≥ 3 new answers, or P falls
under 0.7, the ✓ is removed and the step comes back into the next unit (never mid-unit). Done steps never
revert; they can become *review due*.

**Mastered ★** (gold): a step done with 3 stars twice, ≥ 3 days apart, with speed ≤ 1.0 of target; or ✓ with
P ≥ 0.95, n_b ≥ 8, speed ≤ 1.0.

**Jump-ahead test** (Duolingo): on any projected unit, *"Test out of this unit"* — 10 items from its steps at their
difficulty; ≥ 80 % correct (speed counts as in scoring) → all its steps ✓ and the player lands at the next unit.
Two tries a day.

## 7. Review in the path

- A **review step** appears in a unit when ≥ 3 review items are due (existing queue, spaced) or a done step's
  sub-skill decayed (ewma < 0.7 with ≥ 7 days since the last answer). It uses the due items.
- The checkpoint at the end of each unit is itself spaced practice of the unit.

## 8. When the path is rebuilt

| Event | What changes | Card after it |
|---|---|---|
| Questionnaire (first time or again) | order and share of areas, left-out areas, packs, instrument steps, unit length, starting frontier | "Your path now follows your answers: rhythm first, singing left out." |
| *Find my level* (full or one area), again any time | frontier per skill; many steps turn ✓ | "Your level test marked 23 steps ✓. You start at Unit 5." |
| A step or checkpoint finished | frontier moves; ✓ / withdraw checks; next units rebuilt | (no card; the next step just fits) |
| Settings → *My path* (areas, packs) | filters | "Path updated." |
| Weekly | recency checks | — |

Retaking the questionnaire never deletes done steps or ✓ earned by evidence; it changes what comes next.

## 9. Content choices

Questionnaire, after *rank the areas*: **"Anything to leave out?"** — chips for every area and every optional
pack (pre-selected by the rules in §4), plus *Singing* (off → vocal technique and singing steps out; pitch steps
answered by playing or buttons). Settings → **My path**: the same chips, the area order (drag), unit length, and
*"Rebuild my path"*. Leaving out an area also removes it from Today's plan and from the area tiles' "weakest"
nudges, never from the Skill Map (it shows "not in your path").

## 10. Screens

- **Path tab**: units as banners (*Unit 4 · around 1150* + area chips), steps on the winding road, coloured by
  domain; states: done (stars), ★ mastered, ✓ tested out (small check medallion, dim), current (big pulsing),
  open, locked, review (↻). Past units can collapse; a ✓-only stretch collapses into "✓ 12 steps you already
  know" (tap to expand). The checkpoint is a trophy node. Projected units carry *Test out*.
- **Home**: the mission card points to the current step (as today).
- **Recap**: "Next on your path: …".
- RTL: the road mirrors; numbers in LTR islands (as in 0.37).

### 10.1 Scrolling and motion (product owner: "the animation usual in such scrolls")

- **Arriving**: opening the Path tab glides (eased, ~600 ms) to the current step, centred a little above the
  middle; after finishing a step, the road scrolls on to the next one and the new current node "lands" (scale
  0.6 → 1.08 → 1, the pulse starts).
- **Sticky unit header**: the banner of the unit under the top edge sticks under the app header and swaps with a
  short slide/fade as the next unit's banner pushes it up (Duolingo-style), coloured by the unit's main area.
- **Steps enter**: nodes and road segments fade-and-rise in (≈ 250 ms, staggered 40 ms) as they enter the
  viewport (IntersectionObserver), once per session; finished-step stars pop in.
- **Back to my step**: when the current step is off screen, a floating round button (↑ or ↓ toward it, with the
  step's area colour) appears; tapping it glides back.
- **Native momentum** and overscroll are kept (no scroll-jacking); `scroll-behavior: smooth` only for programmatic
  scrolls; the header shadow grows with scroll.
- **Reduced motion** (setting or OS): no glide (instant jump), no stagger, no landing bounce; the sticky header
  swaps without animation.

## 11. Data

- `progress.path`: `{ v: 1, builtAt, units: { id, steps: StepRef[], frozen: boolean }[], tested: Record<stepId,
  string /* ISO */>, testedOut: Record<unitId, string>, lastChange?: { at, text } }` — synced like the rest of
  progress.
- Step id: `lesson:<LessonId>` or `topic:<topic>:<level>` or `vocal:<track>:<level>`; checkpoint
  `check:<unitId>`; review `review:<unitId>`.
- A finished topic step = a 6-item `topicLesson` of that topic/level reaching ≥ 60 % (1 star); stars as lessons.
- Migration: completed lessons → done steps; `placementUnlocks` → ignored (✓ now comes from ratings).

## 12. Tests

Pure tests: spiral shares by rank; left-out areas never appear; prerequisites hold; difficulty rises unit to unit
for a steadily improving player; a strong placement turns low steps ✓ and starts later; ✓ needs every factor
(each factor alone blocks it); ✓ withdrawn on a slide, never mid-unit; frozen current unit; retake of the
questionnaire keeps done / ✓; determinism. E2E: placement → path shows ✓ and a later current unit; questionnaire
leave-out → no singing steps; test-out of a unit.

---

## 13. Review pass (binding — overrides the sections above where they differ)

Compared again with Duolingo, Khan Academy, ALEKS, IXL, Anki / FSRS, Brilliant, Babbel, Busuu, Simply Piano,
Yousician and learning-science findings.

| # | Rule |
|---|---|
| P1 | **Small units**: when Σ max(1, n_a) > L, the lowest-ranked areas take turns across units (each appears at least every 2nd unit); the remainder for the top area is max(0, …). `priorities = null` → equal weights. |
| P2 | **No ✓ on luck**: `h` = the highest difficulty with ≥ 2 of the last 3 answers correct in the sub-skill; a placement rung counts only with ≥ 3 items at ≥ 80 %. P uses a guessing floor: `P' = g + (1 − g)·P`, g = 1/choices, and the test is on the *skill* part `P ≥ 0.85`. |
| P3 | **Placement doesn't leak across sub-skills**: a ✓ needs ≥ 1 correct answer in that sub-skill (or its prerequisite sub-skill); otherwise the step stays open, labelled **Quick check** (a 3-item probe; passing it ✓s the step). |
| P4 | **Speed** is measured against the absolute reference time (`referenceTime`), median ≤ 1.25 ×; the personal pace goal is only for scoring. |
| P5 | **No churn**: "measured" = `evidence() === 'measured'` (n ≥ 8) or placed. Projected units are redrawn only at a unit boundary, after the questionnaire / level test, or when a frontier moved ≥ 75 since they were drawn. |
| P6 | **Cold start**: an unmeasured skill starts at `START[track] − 150`, and its first step on the road is a 4-item **probe** that sets the frontier before the other steps of that skill. |
| P7 | **Checkpoint**: 8 items; pass ≥ 75 % (3 stars at 100 %, 2 at ≥ 87 %); not a hard gate; a fail puts the weak areas' steps back into the next unit; correct answers count as evidence for ✓. |
| P8 | **Keeping ✓ honest**: each checkpoint and review step samples 1–2 items from ✓ steps older than 30 days; > 60 days without fresh evidence → **needs a refresh** (open, not locked, not ✓). |
| P9 | **Sync**: store facts only — done steps (stars, time), test-out events, the frozen unit (id, step list, time; last writer wins). ✓, ★ and projections are always derived by `buildPath` from the merged rating events; never stored. |
| P10 | **Done** = ≥ 4 / 6 correct (≈ 65 %); less keeps the step current. A step ≈ 6 items ≈ 90 s; unit length L from minutes a day: 5 → 6, 10 → 8, 20 → 10 steps (≈ 1 unit a day). |
| P11 | **Cognitive load**: at most 2 new sub-skills per unit; teaching steps count toward L. |
| P12 | **Motivation**: ✓ steps count in the progress % and section %; no XP or gems for ✓; the first unit after a placement starts at frontier − 50 (a warm win). |
| P13 | **Long-term skeleton — sections** by band: *Beginner* (< 900), *Developing* (900–1150), *Solid* (1150–1400), *Advanced* (≥ 1400); each unit belongs to the section of its median difficulty; a section banner shows "x % of this section". |
| P14 | **Questionnaire mid-unit**: if the current unit is < 50 % done it is rebuilt too; otherwise the card says "from the next unit". |
| P15 | **Left-out areas**: prerequisites in a left-out area count as met; steps that need a left-out modality (singing) are dropped. |
| P16 | **Jump-ahead test**: ≥ 1 item per step (min 8, max 12); each step whose item was right becomes **✓ by test** (withdrawable as any ✓); missed ones stay open. |
| P17 | **Numbers**: step window `[frontier − 150, frontier + 200]`, prefer `frontier + 50`; ties by step id; unit title = median difficulty of its steps; the change card appears when the next 5 step ids changed; a review slot is reserved at freeze time and filled with due items at play time; order inside a unit: interleave areas first, then rising difficulty inside each area. |
| P18 | **Calibration log**: per topic level, the mean of (expected − actual); |mean| > 0.15 after 50 answers is flagged (Diagnostics) for re-calibration. |
| P19 | **Transparency**: a ✓ step explains itself ("✓ because: 6 right, at your speed, within 3 weeks") and offers *Keep it on my path* (the step becomes open again). `buildPath` is memoised on an input hash. |

---

## 14. Product-owner decisions (2026-11-07): all recommendations accepted

| # | Decision | Definition for the build |
|---|---|---|
| D1 | **Units = a theme + the spiral** | 10 themes rotate (below). A unit takes its theme's sub-skills first (score bonus), every chosen area still appears by share; a theme with nothing to offer at the player's level is skipped. Each section passes through the themes again, one level deeper. |
| D2 | **A goal + the area ranking** | Questionnaire asks *What's your goal?* (one): General · Sing in tune · An ear for jazz · Read & write music · A guitarist's ear · A producer's ear · Exam prep (aural & theory) · Maqam & Mizrahi music. The goal gives area weights, packs and skill boosts; the ranking multiplies the area weights (final = goal × rank, normalised). |
| D3 | **Cautious ✓ + quick check** | §6 + §13 as written; borderline steps become 3-item *quick checks*. |
| D4 | **Leave out: area, pack, mode, single topic** | Settings → *My path* and the questionnaire: areas; packs; modes *no singing* (drops sung steps) and *no microphone* (drops sung + play-back steps; taps and buttons stay); a step's ⋯ menu → *Hide this topic* (all its levels; undo in My path). |
| D5 | **Sections skeleton + 2 detailed units** | Beginner / Developing / Solid / Advanced banners with % known; the current section shows its units (past collapsed, current, 2 projected); later sections appear as locked silhouettes listing their themes. |
| D6 | **Rebuild at the unit boundary**, at once after questionnaire / level test (P5, P14) | as §13. |
| D7 | **Path and Today's plan merged** | Home: the mission card = the next path step; a **2-minute warm-up** card (due reviews or the weakest sub-skill, 4 items) before it when something is due; the old Today's plan becomes **Practice** (free practice: topics, tools, weak spots) in the menu / Practice tools. |
| D8 | **Learn first** | A sub-skill met for the first time opens with its teaching step (a hand-made lesson, or the topic's quick lesson + its first items). |
| D9 | **Checkpoints, no hard gate** | P7. Projected units offer *Test out*. |
| D10 | **Unit size from minutes a day** | 5 → 6, 10 → 8, 20 → 10 steps (P10). |

### 14.1 Themes (rotation order)

| Theme | EN / HE | Sub-skills it favours |
|---|---|---|
| T1 | Home & away / בית ויציאה | degrees/home, degrees/find-tonic, cadences/cadence, timing/steady, singing/match, instrument/echo |
| T2 | Steps & leaps / צעדים וקפיצות | intervals/*, sequences/contour, sequences/melody, singing/intervals, instrument/shapes, notes/staff |
| T3 | Bright & dark / בהיר וכהה | chords/quality, modes/*, expression/mood, degrees/chromatic |
| T4 | Pulse & meter / דופק ומשקל | meter/*, tempo/*, timing/subdivide, timing/backbeat, timing/gap, rhythm-reading/read |
| T5 | Building chords / לבנות אקורדים | chords/inversion, chords/seventh, chords/extension, instrument/shapes, theory/spelling, singing/harmony |
| T6 | Remember & write / לזכור ולכתוב | sequences/*, rhythm/memory, dictation/*, sequences/inner |
| T7 | Harmony moves / הרמוניה בתנועה | cadences/progression, cadences/modulation, cadences/harmonize, cadences/chromatic, dictation/bass |
| T8 | Groove & feel / גרוב ותחושה | rhythm-dictation/*, transpose/displacement, transpose/rhythmic, timing/poly, rhythm-reading/drums |
| T9 | Read & transform / לקרוא ולהזיז | notes/*, theory/*, sight/*, transpose/* |
| T10 | Colour & sound / צבע וסאונד | expression/*, form/*, timbre/*, chords/voicing, improv/* |

### 14.2 Goals

| Goal | Area weights (pitch, time, memory, voice, reading, creative, instrument) | Packs on | Skill boosts (× importance) |
|---|---|---|---|
| General | 3 3 2 2 2 2 1 | — | — |
| Sing in tune | 3 2 2 5 1 1 0 | — | singing, technique, pitch × 1.5 |
| An ear for jazz | 5 3 2 1 2 3 1 | jazz | chords, cadences, modes × 1.4 |
| Read & write music | 2 3 2 1 5 1 1 | — | notes, theory, sight, dictation × 1.5 |
| A guitarist's ear | 4 3 2 1 1 2 4 | — | instrument, chords × 1.4 |
| A producer's ear | 3 3 1 0 1 2 5 | production | timbre, rhythm-dictation × 1.5 |
| Exam prep | 4 3 3 2 5 1 0 | — | cadences, dictation, theory, sight × 1.3 |
| Maqam & Mizrahi | 4 3 2 3 1 2 0 | maqam | modes, rhythm-dictation × 1.4 |

Weight 0 = the area is left out unless the player ranks it in.

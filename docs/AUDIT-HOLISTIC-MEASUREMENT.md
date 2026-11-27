# ToneTurn: a holistic audit of measurement, adaptivity, learning rate and learning organisation

2026-11-27. Read-only audit of docs/ and src/ on branch redesign-v2 (HEAD 36bd00a0). No repo files changed.

**Source tags:**
- **[B]:** the citation is confirmed in the repo's own research docs (RESEARCH-LEARNING-RATE, RESEARCH-SPIRAL-PRACTICE, SPEC-EAR-INTELLIGENCE, SPEC-PRACTICE-INTELLIGENCE), but I did not re-check it this session.
- **[U]:** from memory, not checked.
- Nothing is tagged [V]. I did no web verification in this session.

---

## 1. Executive summary

1. **The app measures a lot, but "level" means at least seven different things.**
   - **Closed:** 3 clean takes at ≥ 95 % of the target on 2 days, warm evidence.
   - **Family level, and the technique rank built on it:** the *mean* tempo band of each item's all-time best clean tempo.
   - **Course level (pp…ff):** an Elo whose difficulty is *only the tempo band*.
   - **Ear course level:** the Elo average over *all* skills, instrument technique included.
   - **Game tiers:** 2 of the last 3 runs, never demoted.
   - **Voice:** per-take pass marks.
   - **Path ✓:** a careful evidence rule.

   None of them is the stated principle ("level = hardest content beaten, cold"). Fixing that semantics is the first job, before learning rate.
2. **Performance in session is still taken for learning almost everywhere.** SPEC-SPIRAL v6 (cold take, later-day rule) is not built yet; `coldOk`, `lastQual` and `passedAt` do not exist in src. Even when it is built, it covers only the technique `itemPass`. These all keep reading warm session peaks:
   - `cleanBpm`, `familyLevel`, the technique rank;
   - the instrument Elo;
   - the daily snapshots and teacher charts;
   - the plateau detector;
   - Momentum "tempo records" and the stretch-XP "record/push" bands.
3. **The reward system works against the spiral design.** Interleaving and cold measurement lower in-session performance, as the research says they should. XP ("record", "push") and Momentum (+5 per tempo record) pay for in-session peaks. Once rotation ships, a learner who follows it earns *less*. The rewards have to be re-based on cold gains and on following the plan.
4. **The instrument course level is content-blind and can be farmed.**
   - `drillDifficulty` = 640 + 120 × tempo band (+60 for hands together) (events.ts:12). A fast C-major scale outranks slow rootless voicings.
   - `drillScore` = accuracy × evenness, so the score ignores the verdict and the timing. A "not yet" take with all notes right scores about 1.0.
   - Every take is its own rated event, so one session of repeats saturates the rating at the top band played + 50.
5. **The Ear course level is contaminated.** `courseRating('ear')` = `overallRating()` over all SKILLS (courseSocial.ts:125). That includes `instrument` (weight 1), `timbre` and `singing`, so piano takes move the Ear level. This looks unintended.
6. **Spacing and retention are patchy, and where they exist they cannot see forgetting:**
   - **Technique (closed cells):** FSRS is fed only "good" grades, one per pass day. A lapse is never recorded (keyMatrix.ts:155), and v6's "passed stays passed" makes the item sticky too.
   - **Ear reviews:** only *missed* questions enter the queue, with good/again grades only, graduating at 35 days, capped at 80 (progress.ts:701).
   - **Games, voice and the Elo ratings:** no retention model and no time decay at all.
7. **Several signals are collected and never steer the next task:**
   - the confusion map (Ear);
   - tendencies (P1, shadow only);
   - the weekly profile patterns (AI text only);
   - calibration jitter (thresholds stay fixed);
   - the Ear Index;
   - response time (it shapes the score and XP, not the item choice).
8. **The learning-rate model (§17) is well designed for technique tempo, and it transfers to Ear, reading, rhythm and voice.** What it needs there:
   - a modality-specific definition of "cold first exposure";
   - a difficulty-calibrated ability scale (the Ear spec's feature-based difficulty plus a guess floor);
   - the active-minute ledger, which already exists.

   Ear actually has *better* data for a rate (many trials) than technique does.
9. **Day and week organisation is spread over about 10 planners:**
   - the path;
   - workout2 shares and need signals;
   - todayPlan (the matrix, the key of the week, FSRS maintenance);
   - the legacy `todaysItems`;
   - legacy `workout.ts` (still in Extras);
   - `scheduler.subPriorities`;
   - `recommend.ts`;
   - teacher assignments and weekly plans;
   - the AI tilt;
   - quests;
   - the key session and coach.

   At least 7 different "weakness" functions rank items or areas. Each block does have a reason line (good), but the reasons can contradict each other across screens.
10. **Goal-setting is mostly about time (minutes and days a week); skill goals are implicit.** Plateau handling exists in three places with three definitions: `plateau.ts` (21 days, warm best), the coach's limit/cooldown, and the planned bursts. None of them uses cold evidence.
11. **Validity infrastructure is good on paper but unmeasured:**
    - latency calibration per input;
    - velocity calibration;
    - device profiles;
    - take traces;
    - TAKE_KIND rules.

    No metric has a measured test-retest or split-half reliability yet. The only data source is one person on two accounts, and teacher-agreement validation (SPEC-PRACTICE-INTELLIGENCE §3.5) is planned, not done.
12. **The path's non-ladder ✓ rule (path.ts `checkStep`) is the most principled measurement in the app.** It uses expected success ≥ 0.85, an evidence ceiling of 2 of 3, ≥ 3 answers in ≥ 2 sessions, a no-slide check, a speed check and a 60-day refresh. It is a good template for the rest.
13. **The single biggest lever is one statistical model per item family.** P(clean | log tempo, coldness, input, fatigue) per learner, fitted from all qualifying takes, gives these at once:
    - a cold level with uncertainty;
    - the warm-up decrement;
    - retention;
    - the learning rate, as threshold shift per practice-hour.

    It replaces several ad-hoc rules (passLog counting, `cleanBpm` max, the plateau window) with one estimate.

---

## 2. What is measured today: a map

"Warm" = may come from takes after warm-up in the same session. "Cold" = first qualifying take after a break. No area has cold evidence in code today.

| Area | Raw signal | Becomes level/rank via | Adapts next task via | Stored | Cold/warm | Retention model |
|---|---|---|---|---|---|---|
| **Piano/guitar/bass technique (drills)** | per-take metrics: accuracy, timing SD, evenness CV, hand sync, velocity SD (MIDI), touch; verdict clean/almost/not (analyze.ts:1161) | (a) `itemPass` → status/closed (ladder.ts:31); (b) path stars per key; (c) `familyLevel` = mean tempo band of `cleanBpm` (max ever) → technique rank (ranks.ts); (d) `instrument/*-tech` Elo → course pp…ff | ladder (3 clean → +4 %, 2 misses → −10 %); coach `climbFrom`, `stepQuality`, challenges, plateau limit, 3-day cooldown; `weakness()` z-scores; todayPlan matrix | `ItemState` (history 200, passLog 60, EWMAs, activeMs), ratings events, take traces (device) | warm everywhere | FSRS on closed cells, "good" grades only, no lapses |
| **Drums** | per-limb timing, hit rate, wrong voice, velocity bands, silent-bar offset (drumAnalyze.ts) | same drill path (itemPass, drum-tech Elo) | same ladder | same | warm | as technique |
| **Ear/theory (lessons, path)** | correct/retry/reveal, response time, replays, modality (scoring.ts) | Elo per skill (K 64→24, ceiling capGain +50); Ear Index; path ✓ (checkStep); ranks by domain | path frontier = rating; scheduler gap × freshness; `weakestSkill`; 6 fixed questions per step | rating events (synced) | n/a (trial-based; no "first trial of the day" notion) | review queue: missed only, FSRS good/again, 35-day graduation, cap 80 |
| **Games** | answers/accuracy per run, tier (gameRating.ts, gameTiers.ts) | tier cleared = 2 of last 3 runs, never demoted; events into Elo at the tier band | opens at the rating tier | progress.gameTiers, events | warm | none |
| **Rhythm/time (Ear, bass, drums)** | tap/onset timing vs click, latency removed; groove fingerprint (analysis/groove.ts) | Elo `timing`, `rhythm-*` skills; drill verdicts | rhythm levels R1–R8 by rating | events, traces | warm | review queue only on misses |
| **Reading** | sight-channel takes only (itemStatus channel) | `sight` Elo, **difficulty = tempo band**, not reading complexity | daily sight dose (channelPlan) | events, channel tallies | first-sight by design (good) | none |
| **Voice** | cents on stable part, timing grade, holds, vibrato, glides (vocal.ts, voiceGrade.ts) | per-take pass mark (60/65 ¢), level test → drillStart; `singing` Elo | level ladders | events | warm | none |
| **Licks/phrases (Encore)** | drill metrics + chord-tone rules | itemPass (old rule kept in v6) | FSRS pass/fail review | lick store | warm | FSRS pass/fail (has lapses: good) |
| **Pieces** | per-chunk accuracy and tempo (piece/coach.ts) | chunk tempo ladder to target | step-back loops, interleaving, warm-up on a new day | piece state | partly (the new-day warm-up exists) | none explicit |
| **Improvisation** | rule-based scores (chord tones on beats, etc.) | level score (`improvLevelToday`) | the workout improv share | bests | warm | none |
| **Level test** | one take per step, bisection | sets drillStart and ratings (`set`, fast K) | starting points | facts.tests, events | effectively cold (first take) | n/a |
| **Habit** | active minutes, days | streak, weekly goal, Momentum | share moves by neglect | ledger, snapshots | n/a | n/a |

---

## 3. Gaps

### 3.1 Practised but not measured, or measured only as right/wrong

| Skill | What is missing | Consequence |
|---|---|---|
| Content difficulty in technique | Elo difficulty = tempo band only (events.ts:12) | Hard material played slowly reads as low level. Rank and course level reward speed on easy content. |
| Timing in the Elo score | `drillScore` ignores timing and the verdict | A rushed, uneven take with all notes right counts as a win. |
| Reading complexity | `sight` difficulty is again tempo-based | Reading level does not track rhythmic/pitch complexity, ledger lines or accidentals. |
| Ear item difficulty | hand-written per lesson; no guess floor (the spec admits this) | 2-choice items move the rating as much as 6-choice ones. Staircased accuracy (~80 %) carries no level information. |
| Partial knowledge | multi-chord answers graded whole (partial credit is spec'd in E1) | Slow detection of which chord in a progression is the problem. |
| Dynamics, articulation, pedal | MIDI only (correct; the microphone is excluded) | Mic learners have whole skill strands unmeasured, and their rank looks thinner for no fault of theirs. |
| Tone/sound quality, tension, posture | not measured | Acceptable, but the app should say so explicitly in the level semantics. |
| Self-assessment accuracy | not measured (P4 planned) | Self-regulated learning research ranks calibration of self-judgement as central (Zimmerman [U]; Kornell & Bjork on judgements of learning [U]). |
| Transfer | no probe of "first take in a new key / new item of a known family" | The best evidence of a general skill (as opposed to item memorisation) goes unused, though the channel model already distinguishes sight vs known. |
| Off-app practice | timer only | Fine. Just keep it out of level evidence (it is). |
| Improvisation | rule compliance (chord tones on beats) | Measures constraint-following, not vocabulary breadth, rhythmic variety or motivic development. A "variety" metric would be cheap to compute from the notes. |

### 3.2 Measurements that never reach adaptation

| Signal | Collected in | Used for | Should feed |
|---|---|---|---|
| Confusion map | storage/confusion.ts | display | contrast drills, distractor choice, SRS cards (Ear E1) |
| Tendencies (rushing at the turn, LH late …) | tendency.ts traces | end-of-session line (shadow) | the next take's cue; which forms to rotate in; LH visit (v6 A4) |
| Weekly profile patterns | analysis/profile.ts | AI coach text | the planner's priority (a recurring pattern = a need) |
| Latency/jitter per input | latency.ts, device profiles | latency subtraction only | timing thresholds (calibrate the noise, §9א, not built) |
| Response time | scoring.ts | 20 % of the rating score; fluency/XP | SRS grade (hard/good/easy); readiness to remove scaffolds |
| Plateau findings | plateau.ts | diary card; one block lead (App.tsx:3572) | automatic change of method (bursts, variation, rest) across all areas |
| Retention (cold ÷ last best) | not computed | — | cold-check tempo; spacing; the learning rate R |
| Learning rate | not computed | — | pacing (v6 §17) |
| Momentum progress | momentum.ts | reward only | the AI weekly plan: "progress slowed in X" |
| Teacher notes/ratings | teacher spec | display | weighting of the learner's areas |

### 3.3 Inconsistent level semantics

| Construct | Rule today | Evidence type | Can it go down? | Matches "hardest beaten, cold"? |
|---|---|---|---|---|
| Item closed | 3 clean ≥ 95 % target, ≥ 2 days | warm | no (sticky in v6) | partly (later-day + cold in v6) |
| Path technique ✓ | 3 keys clean at the start tempo | warm | no (✓ stays; stars silver after 30 d) | no |
| Path stars 4–5 | half / all keys closed | warm | stars yes, ✓ no | partly |
| Family level / technique rank | **mean** tempo band of all-time max clean tempo; T = mean of best 3 families | warm peak | no | **no:** a mean, not the hardest; speed, not content |
| Instrument course level | Elo on tempo-band difficulty, every take | warm | only by failures | **no** |
| Ear course level | `overallRating` over all skills incl. instrument | mixed | only by failures | **no** (and mixes courses) |
| Ear path ✓ | P ≥ 0.85, evidence ceiling, 2 sessions, 60-day refresh | warm-ish, but multi-session | ✓ becomes "refresh" | **closest** |
| Game tier | 2 of last 3 runs | warm | never | partly |
| Voice family start | level test, one take per step | cold-ish | — | yes, for the placement |

**Recommendation:** write one definition and implement it as one function family:

> **Level in area A** = the hardest content tier at which the learner's *cold* success probability is ≥ p* (e.g. 0.7), estimated with uncertainty. **Rank** = that level, shown with a range until the uncertainty is small.

- **Technique:** the tier is content × tempo.
- **Ear:** the tier is the feature-based difficulty.
- **Voice:** the tier is the item level × the cents band.
- **Games:** low-weight evidence into the same ability.
- **Separate axes:** keep "mastery/coverage" (stars, 12 keys) and "maintenance" (fresh vs refresh) apart from level. The path already does this for opened vs mastered.

### 3.4 Performance mistaken for learning (Soderstrom & Bjork 2015 [U]; Kantak & Winstein 2012 [U])

| Place | What reads the warm peak |
|---|---|
| `ItemState.cleanBpm` | the max clean ever. Shown as "best"; feeds `familyLevel`, `weakness()` gap, `keyMastery`, stretch "record" |
| `history` | the daily *best* clean tempo → item chart, snapshots tempo index, teacher class charts, plateau |
| `itemPass` | any 3 takes at the goal, warm-up included. The same session can supply 2 of the 3 |
| Momentum | "new tempo records" +5 XP each; "cells closed" +20 (warm rule) |
| Stretch XP | "record" (a new best), "push" (≥ previous clean tempo; **does not require a clean take**, stretch.ts:101) |
| Instrument Elo | every warm repeat is a new rated event |

v6 fixes only `itemPass` for technique families. Extend the cold principle to every row above: the display can keep the best, but levels, trends, teacher charts and rewards should read cold.

### 3.5 Spacing and retention by area

| Area | Spacing exists? | Problem |
|---|---|---|
| Technique closed cells | FSRS due date | Only pass days enter, as "good". No lapse grade ever, so intervals only grow. A review take is not required to be cold. FSRS default weights were fitted to declarative flash-card recall (Ye et al. [B]), not motor retention. |
| Technique open cells | v6 §5 day +2 boost (spec) | Not built. |
| Ear | FSRS on missed questions only | Correctly answered items are never scheduled, so retention of *known* material is unmeasured. Only good/again grades; RT unused; 35 d graduation and cap 80 (spec E1 removes these). |
| Licks | FSRS pass/fail with lapses | The best-designed one; copy it. |
| Pieces | warm-up on a new day | No interval model for repertoire maintenance. |
| Games, voice | none | Tiers never demote; voice levels never re-checked. |
| Elo ratings | none | No time decay or uncertainty growth. Pelánek's Elo variants with decay [B], or a Glicko-style rating deviation that grows with time (Glickman 1999 [U]), would let the rating say "not seen for 2 months, unsure". |
| Path ✓ | 60-day refresh | Good. |

The spacing literature is consistent that distribution across days beats massing for retention (Cepeda et al. 2006 meta-analysis [U]), and that the optimal gap scales with the retention interval. The app spaces review well only for licks and (partly) the Ear queue.

### 3.6 Does the learning-rate model (§17) generalise beyond technique?

§17 defines A (acquisition), C (climb efficiency), G (cold gain per practice-hour, primary) and R (retention), with shrinkage, guards and pacing-only effects. It is sound. Stark-Inbar 2017 [B] supports per-area estimation, and Yudelson et al. 2013 [B] support a per-student speed parameter. The pieces generalise as follows:

| Area | Cold definition | Ability scale (the y-axis of G) | A | R | Feasibility |
|---|---|---|---|---|---|
| Technique | first qualifying take ≥ 1 h (v6) | log nps at P(clean) = p* | takes to D1 | cold ÷ last best | as spec'd |
| Ear | first ~5 trials of a skill/contrast after ≥ 8 h | θ from a feature-difficulty Elo/IRT with guess floor (Ear spec §4) | trials to ~70 % on a new contrast in pairs (spec §5.4) | FSRS stability per contrast card (a per-user FSRS fit *is* a forgetting rate) | **High:** many trials, cheap |
| Reading | sight takes are fresh by definition | θ on reading-complexity features | n/a | n/a (fresh items) | Medium: needs content-difficulty features first |
| Rhythm/time | first takes of the day per subdivision type | timing SD at tempo, or the tempo at the SD threshold | takes to criterion | cold SD ÷ last session SD | Medium |
| Voice | first sung items of the day | cents accuracy and consistency separately (Pfordresher 2010 [B]) | items to pass | cold vs last | Medium; vocal warm-up and fatigue are a *physiological* confound, so cold is not purely "learning" |
| Games | first run of a game per day | the tier band → θ | runs to clear | first run ÷ last best | Low-weight only |

**What is needed:**
1. A per-modality "cold" flag on every rating event (not only on `ItemState`).
2. Difficulty calibrated by features, so that θ gains mean the same across items.
3. The active-minute ledger per area (`practiceTime` exists).
4. The same shrinkage and gating rules.
5. Separate the vocal warm-up effect from forgetting, with a covariate for minutes since the session start.

---

## 4. Learning organisation

### 4.1 How a day is composed today

| Layer | Decides | Source |
|---|---|---|
| Teacher assignments | first in the workout, up to ½ the window; spread or "all today" | workout2 `teacherToday`, `withTeacher` |
| Workout shares | instrument: path 20 % / tech 70 % (beginner 85 %) / improv 30 % of the rest; ear: new 22 / strengthen 48 / review 30; ±15 by need (neglect, gap, due, slipping, AI tilt ±10, feedback nudge) | workout2 `suggestInstrument`, `suggestEar`, `techShareByNeed` |
| Block shape by length | 1–8 blocks, warm-up 10 %, pleasant ending | `shapeCore` |
| Tech block content | matrix cells: ½ key of the week, rest weakest-first; FSRS maintenance 15–20 %; style block 60/30/10 | todayPlan.ts |
| Inside a cell | coach/key session: ladder, challenges, limit, (spec) rotation | coach.ts, keyCoach.ts |
| Path | the next step(s); checkpoint not a gate | path.ts |
| Ear strengthen | weakest opened sub-skills | scheduler / path |
| Side planners | quests (2/day, activity), practice-session focus, `recommend.ts` rungs, `adaptive.reviewLesson`, legacy `workout.ts` (Extras), legacy `todaysItems` | various |

### 4.2 Conflicts and duplications

| Issue | Detail | Fix |
|---|---|---|
| Many "weakness" definitions | `ladder.weakness` (robust z × staleness), `keyMastery` 0–1, `sessionNeed.closeness`, `scheduler.gap`, `rating.weakestSkill`, `areaStretch` weak/strong, the path frontier | One need model per item: (distance to next level) × (P(forgotten)) × (importance/goal) × (readiness). Every planner reads it. |
| Legacy planners alive | `workout.ts` (S.1) still imported by Extras; `todaysItems` still referenced from plan.ts; `recommend.ts` and `scheduler.ts` overlap | Retire them or route them through the need model. |
| Key of the week vs weakest key vs teacher key | three sources can each claim half the tech block | Precedence (teacher > key of week > weakest) stated in the reason line. v6 adds a cold review of last week's key, good. |
| Path "new" vs workout "strengthen" | the path's ✓ = opened (warm 3 keys); the strengthen pool follows | Fine by design. Make sure "opened" requires a later-day confirmation before the strengthen pool treats it as acquired, or the learner moves on with fragile skills. |
| Quests vs plan | quests reward activity ("10 right in a row", "3 technique sessions") unrelated to today's plan | Make quests derive from the plan ("finish today's first-take check", "a cold take in the key of last week"). |
| Teacher plan vs learning rate | v6 §17.4: the teacher overrides the pace | Good. Teacher assignments must also produce cold evidence (v6 does this). |

### 4.3 Does the learner always know what to do next and why?

Mostly yes. `whyOf`, `reasonLine`, the brief page and the coach lines exist, and the "one reason per change" rule is good feedback design (Hattie & Timperley's "where to next" [U]). Three gaps remain:
- **No visible long-term goal.** Nothing says "you are working toward X by date Y, and this block moves you Z". Goal-setting theory says specific, challenging, proximal goals with feedback on progress raise performance (Locke & Latham 2002 [U]).
  - The projection (projection.ts) exists but only on Progress.
  - It uses warm closing and minutes.
- **Conflicting screens.** Path, Today and Practice can show different "next things"; the reason lines don't reference each other.
- **No fallback after a skipped day or week.** The return path (v6 §17.2 break rules) exists only for the rate. The plan itself does not shrink scope after a break (e.g. a re-entry session of cold checks only).

### 4.4 Plateau handling

There are three uncoordinated mechanisms:
1. `plateau.ts`: 21 days with < 3 % gain on the warm best, then a suggestion.
2. The coach's limit → rested, plus a 3-day cooldown (in-session).
3. v6 bursts: no new peak in 3 sessions.

**Proposal:** define a plateau once, on the *cold* series: the slope of cold log-tempo or θ over practice-hours ≈ 0, with confidence. Escalate:
1. variation (feel, key, form);
2. bursts or slow accuracy blocks (practice-intel §6.3);
3. a rest of 3–5 days with spacing;
4. a teacher flag.

Ericsson's "OK plateau" framing [U] is already cited. Note that deliberate-practice effects are smaller than claimed (Macnamara et al. 2014 meta-analysis [U]), which argues for measuring whether each intervention works rather than assuming it.

### 4.5 "Everything connects": the 6-point check

| Point | State |
|---|---|
| Path | Technique and ear feed it; ladder steps only by measured playing (good). |
| Map/radar | Every take tags skills, but the instrument radar is content-blind. |
| XP | Everything pays XP; stretch bands exist. |
| Leagues | XP-driven, so effort. Fine, given its incentives (§6). |
| Level test | Takes go through the same record. |
| Workout | Every block maps to path or matrix. |

The connections exist; the problem is that what flows through them is inconsistent evidence. Connecting warm peaks everywhere spreads the warm-peak bias everywhere.

---

## 5. Measurement validity and reliability

| Threat | Where | Status | What to do |
|---|---|---|---|
| Single-take noise in binary verdicts | `itemPass`, the cold check, the level test | One cold take decides a pass (v6). A binary "clean" at a hard threshold has high variance near the learner's limit. | Fit a psychometric curve per item family: P(clean) vs log tempo, with covariates for cold, input, minutes-in-session and day. Report the tempo at p* with a CI. Pass when the lower CI bound ≥ 95 % target, or keep the count rule but feed it the model's estimate. Spearman–Brown says ~5 takes are needed for 0.8 if a single take is 0.5 (practice-intel §3.3) [B]. |
| MIDI vs microphone | all instrument areas | Latency median subtraction, sd ≤ 35 ms gate (latency.ts); mic excluded from dynamics/pedal (good); guitar thresholds are "research starting points", with the calibration log local-only and off by default | Store `src` (input) on every `ItemState` take and passLog entry. Never mix inputs in one cold series (v6 resets the rate on a device change; do the same for level series). Per-input noise model (§9א). Upload the guitar/bass calibration logs from calibration accounts like the piano traces. |
| Bluetooth MIDI jitter | timing SD thresholds 20–30 ms (analyze.ts:71) | BLE jitter can be 10–30 ms [U], the same order as the thresholds | Measure jitter per input in calibration and widen thresholds by the measured noise only (calibrate the noise, not the standard). |
| Mic onset detection on piano chords and fast runs | pianoMic, micTouch | unvalidated | Synthetic injection test (practice-intel §9: 0/8/15/25 ms shifts) across inputs. |
| Gaming | XP, Elo | Takes repeated at the same item: per-take Elo; the "push" band pays misses; quests "10 in a row" on easy items; game tiers: lower tiers allowed as warm-up | One rated event per item per session (its cold take or session result); push requires ≥ almost; quests from the plan. |
| Fatigue | everything | v6 §17 down-weights after 45 min, for the rate only | Record minutes-in-session on each take (traces have `at`; add a session start) and use it as a covariate in the level model too. |
| Day effects (sleep, time of day) | cold takes | not modelled | Time-of-day covariate; never act on one cold take (v6 needs ≥ 6 pairs for rates; levels should use a similar rule). |
| Small samples | all calibration | 1 person, 2 accounts | Use them only for within-person noise and estimator checks (RESEARCH-LEARNING-RATE says the same) [B]. Population priors must be conservative until real users arrive. |
| Construct validity | technique verdicts, Ear levels | Teacher agreement planned (§3.5): ≥ teacher-teacher agreement, 80 % same verdict, never clean when any teacher rejects (Bergee 2003 [B]) | Run it before any absolute claim. Ear: linking study before "grade 6" claims (Ear spec decision 2, good). |
| Staircase accuracy is uninformative | Ear | Spec §4.8 knows | Stars by difficulty reached, θ not % correct. |

**A validation programme:**
1. **Simulation harness:** synthetic learners with known θ, learning rate, forgetting, warm-up decrement, fatigue and input noise. Run every planner and level rule on them. Check that the level tracks θ_cold (bias, RMSE), that wrong promotions stay < 5 %, and that wrong demotions are rare.
2. **Calibration-trace replay:** split-half and test-retest of cold levels and rates. Ship a metric to the UI only above a reliability bar (≥ 0.7 for levels shown as numbers; the rate already uses ≥ 0.4).
3. **Shadow mode:** compute the new cold levels alongside the old ones for 2–4 weeks of real users, then compare against teacher judgements.
4. **A/B tests once users exist:**
   - rotation vs linear, on 7-day cold retention;
   - reward re-basing, on practice minutes and cold gain;
   - FSRS lapse-aware maintenance vs current.

   The primary outcome is always a *delayed cold* measure, never in-session performance.

---

## 6. Motivation and feedback as they interact with measurement

| Mechanism | What it rewards | Risk | Fix |
|---|---|---|---|
| Stretch XP "record" | a new best tempo (warm) | Pushes peak-chasing after warm-up and conflicts with rotation, where in-session peaks fall by design (RESEARCH-SPIRAL [B]) | Pay "record" only on cold takes or cold-level rises. |
| Stretch "push" | a take ≥ previous clean tempo, **even if missed** (stretch.ts:101) | A missed fast take (1 × 1.5 = 1.5 XP) out-earns a clean closed-item take (4 × 0.3 = 1.2 XP). That rewards sloppy speed. | Require ≥ almost, and pay misses at ×1 at most. |
| Momentum progress | tempo records (+5), cells closed (+20, warm 2-day rule), rating gained | Same peak bias; rating gains are content-blind (§3.3) | Re-base on cold gains, cold-confirmed closes and retention held (a due review passed cold). |
| League | weekly XP (effort, capped) | Social comparison on volume. Leaderboard effects on intrinsic motivation can be negative for lower-ranked learners (Hanus & Fox 2015 [U]). Fine if it stays effort-only. | Keep it effort-only; never let league XP enter levels. |
| Course levels shown to friends | DYN pp…ff | Content-blind and contaminated (§1.4–1.5), so friend comparisons are on a flawed metric | Fix the semantics first. |
| Streak | showing up | Healthy for habit; can push "minimum viable practice" | Fine. Pair it with a weekly "cold progress" line (§17.5 self-comparison). |
| Quests | activity counts | Goodhart/Campbell: the counted thing becomes the goal [U]. "10 right in a row" invites easy material. | Plan-derived quests. |
| Self-comparison line (v6 §17.5) | cold rate vs own past | Good: mastery-oriented, avoids labels (Mueller & Dweck 1998 [B]) | Extend it to every area. |
| Comfort-zone lines ("try ♩96") | teaching good practice | Good. Make sure the suggested tempo respects the cold level and fatigue, not the warm best. | — |

**The principle to adopt:** *XP pays for effort spent as planned. Level pays for cold evidence. Momentum pays for cold progress.* None of them should read the in-session peak.

---

## 7. Prioritised top 15

| # | Change | Impact | Effort | Concrete action |
|---|---|---|---|---|
| 1 | One level semantics across the app | H | M | A short SPEC-LEVEL-SEMANTICS: level = hardest tier with cold P(success) ≥ p*, with a range. Replace `familyLevel` (a mean of max tempos) with "hardest content × tempo tier passed cold"; derive the technique rank, course DYN, badges and friend levels from it. Keep stars/coverage and fresh/refresh as separate axes. |
| 2 | Build v6 cold measurement, then extend it beyond `itemPass` | H | M | §4 as spec'd, plus cold-flagged entries in history/snapshots. Teacher charts, plateau, Momentum and the "record" band read cold; "best" stays display-only. |
| 3 | Fix the instrument Elo | H | M | Difficulty = the level's content difficulty (catalogue tier) + tempo offset. The score respects the verdict (clean 1, almost 0.5, not 0) with timing included. **One rated event per item per session** (its cold take, else the session's first qualifying take). |
| 4 | Fix the Ear course level | M | L | `courseRating('ear')` from `EAR_SKILLS` (or the Ear areas) only, not `overallRating`. Add a guard test so instrument takes never move it. |
| 5 | Re-base rewards to cold, plan-following and clean | H | L | "push" requires ≥ almost; "record" only cold; Momentum tempo records → cold records; add XP for completing today's planned rotation and cold checks; quests derived from the plan. Simulate that a rotation-following learner earns ≥ a linear peak-chaser. |
| 6 | Lapse-aware technique maintenance | H | M | Review takes of closed cells are cold. Grade them into FSRS (clean at ≥ 95 % = good, almost = hard, miss = again). A lapse sets "refresh" (passedAt kept, scheduled sooner, shown silver). Later, fit FSRS weights per user from these logs. |
| 7 | Ear E1: use what is collected | H | M | Guess floor in the Elo; contrast cards from the confusion map; every encounter (correct ones too) feeds FSRS; RT-graded hard/good/easy; drop the 35-day/80-item caps (as spec'd). |
| 8 | Uncertainty and time decay on every rating | M | M | Glicko-style RD per skill that grows with time since the last evidence. Display ranges; the planner raises priority when RD is high (the "refresh" probe). The Ear spec's "level with a range" is the same idea. |
| 9 | One need model and planner consolidation | M | H | A single `need(item)` = distance-to-next-level × P(forgotten) × goal weight × readiness. workout2, todayPlan, the scheduler, the AI tilt and quests all read it. Retire `workout.ts` and `todaysItems`; fold `recommend.ts` in. Reason lines quote the need component. |
| 10 | Psychometric level model per family | H | H | Per learner × family: logistic P(clean) in log nps with covariates (cold, input, minutes-in-session, time of day), hierarchical prior from the catalogue tier. Outputs: cold level with CI, warm-up decrement, fatigue slope, retention, and G (threshold shift per practice-hour). It replaces passLog counting and `cleanBpm` max as the source of truth, while the count rule stays as a transparent gate. |
| 11 | Validation programme | H | M | Synthetic-learner harness for every level and planner rule; split-half/test-retest on calibration traces; the teacher agreement study (§3.5); injection tests per input. Gate every on-screen number on reliability. |
| 12 | Input-aware measurement | M | M | `src` on every take record; separate cold series per input; per-input noise from calibration (§9א); upload guitar/bass/drum calibration logs for calibration accounts. |
| 13 | Learning rate beyond technique | M | H | Shadow-compute A/G/R for Ear (θ from feature-difficulty Elo, cold = the first trials after ≥ 8 h), rhythm (timing SD) and voice (cents, with a warm-up covariate). The same guards as §17. Ear first, since it has the most data. |
| 14 | Goals and plateaus | M | M | Learner goals (a target tier/tempo by a date; exam date in exam mode), with a projection from cold rate × actual minutes. One plateau definition on the cold series, with an escalation protocol (variation → bursts/slow block → rest → teacher flag) in every area. |
| 15 | Measure self-assessment and transfer | M | L | (a) Before 1 take in ~10: "will this be clean?" or "did it rush?". Track calibration (Brier score) and feed the Ear rating via the spec's "ear question about your own take". (b) Transfer probes: the first take in an untried key or a new item of an acquired family, recorded as a generalisation index per family. |

---

## Appendix: key code references

- C:\Users\user\Documents\Projects\ToneTurn\src\engine\drills\ladder.ts:31–48: `itemPass` (warm, 3/2 rule); 108–222: `applyTake`; 237–256: `weakness`; 330–343: `familyLevel` (mean of max-tempo bands)
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\drills\events.ts:12–25: `drillDifficulty` (tempo band only) and `drillScore` (no timing/verdict); 233–238: one rated event per take
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\rating.ts: Elo, capGain, no decay, no guess floor; `overallRating` weights (instrument = 1)
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\courseSocial.ts:125: Ear course level = `overallRating`
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\drills\keyMatrix.ts:153–164: `cellDue` (FSRS good-only)
- C:\Users\user\Documents\Projects\ToneTurn\src\storage\progress.ts:663–730: Ear review queue (missed-only, 35 d, 80 cap)
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\stretch.ts:94–118: stretch bands ("push" without clean)
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\momentum.ts, sessionReward.ts, league.ts, quests.ts: the reward layer
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\path.ts:1033–1095: `checkStep` (the best evidence rule)
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\workout2.ts:389–520: shares and need signals; C:\Users\user\Documents\Projects\ToneTurn\src\engine\drills\todayPlan.ts: matrix plan
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\plateau.ts: 21-day warm plateau; C:\Users\user\Documents\Projects\ToneTurn\src\engine\ranks.ts: technique rank = mean of the 3 best family levels
- C:\Users\user\Documents\Projects\ToneTurn\src\engine\drills\tendency.ts: TAKE_KIND, traces (piano MIDI only for tendencies)

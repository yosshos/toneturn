# Learning rate as a second-order trait: research and design proposal

2026-11-27. Research only; no repo files changed.

## Executive summary

1. **The idea is sound, and the field has precedent.** Intelligent tutors gained more accuracy from a per-student *learning-speed* parameter than from a per-student prior-knowledge parameter (Yudelson, Koedinger & Gordon 2013). Duolingo models how fast each learner forgets each item (half-life regression). As far as I know, no music-practice app measures a persistent per-learner rate of *motor* improvement and paces practice by it. That makes it a plausible differentiator. I have not checked competitors this session.
2. **The app already adapts in the moment, but it forgets the learner between sessions.** In-take, the step size is weighted by take quality (`stepQuality` × `stepCap`). In-session there are `skilled`, `dayStart`, challenges, ceilings and the plateau rule. Cross-session there is only *level* (`cleanBpm`, `passLog`, `ceil`, cold log). Nothing stores *how fast this person improves*. `skilled` resets every session. The weekly profile tracks patterns, not rates.
3. **Measure four rates, not one number.** (a) Acquisition: takes to the D1 criterion on a new exercise. (b) In-session climb efficiency. (c) Cold gain per practice-hour: the main signal. (d) Retention: cold take ÷ previous session best, by gap length. Keep them per skill area and per instrument, under a global prior.
4. **Primary signal = cold-to-cold gain, measured against the expected curve.** In-session peaks are performance, not learning. Raw slopes also punish anyone near their ceiling, because practice curves flatten (exponential/APEX law). The estimate should be *observed gain ÷ expected gain* for that item and starting point, in log-tempo.
5. **Estimate with Bayesian shrinkage to a population prior**, the same rule as calibration in §9א. Weight w = n/(n+k). Act only after ≥ 6 cold pairs on ≥ 3 days across ≥ 2 exercises in an area. Reset on an input change. Leave out fatigued and post-break takes.
6. **The calibration accounts cannot set the between-learner spread.** They are one person on two accounts. They can set the *within-learner noise* and test the estimator, but the population spread has to be a conservative assumption until real users arrive (~early December).
7. **Rate changes pacing, never standards.** Pass rules stay fixed: `PASS_TAKES`, `PASS_DAYS`, the cold-day rule, clean verdicts and the safety guards. The rate moves the D1 criterion (1–3), `VISIT_TAKES` (2–4), when new exercises enter, challenge frequency, the cold-start tempo, review spacing, and only slightly the tempo step.
8. **Avoid double counting.** `stepQuality` already climbs a fast learner faster within a take. So the cross-session rate should mostly act on *structure* (blocked phase, rotation, entry, challenges, spacing). The step multiplier should stay small, about ×0.85–1.15.
9. **Asymmetric and bounded.** All multipliers are clamped. A downward move applies at once. An upward move is capped at +5 % per week. Everything stays gated on clean takes.
10. **Show self-comparison only.** For example: "Scales: your cold tempo rose 9 % over your last 3 practice hours, faster than in October." Never "fast/slow learner" and never a percentile. Teachers see trend, confidence and a pace override.
11. **Validate before shipping.** Simulate synthetic learners first. Then replay the calibration traces offline and check whether the estimate is stable on split halves. Ship only if split-half reliability is ≥ 0.4 within an area. A/B test once real users arrive.

---

## 1. What exists now

| Layer | Piece | File | What it adapts | Persists across sessions? |
|---|---|---|---|---|
| In-take | `stepQuality(m, drill)` 0.15–1: the weakest of timing SD, hands and evenness against the limits; ≤ 0.3 with stops or wrong notes | keyCoach.ts:149 | Step size after a clean take | No |
| In-take | `stepCap(nps)`: up to +20 % at 2 nps, falling as a power law (floor 3.5 %) | stages.ts:200 | Largest step at this speed | No (constant) |
| In-take | `climbFrom` (old coach): `bpm × (1 + stepCap × max(0.25, q))`, at least +2 ♩ | coach.ts:366 | Next tempo | No |
| In-take | `gradedUp` (key coach): the same on Maelzel marks; ×0.5 within 10 % of best / ceiling / target; ×0.6 once ≥ 25 % above `dayStart` | keyCoach.ts:174 | Next pulse | No |
| In-session | `skilled` from `EASY_TO_SKILLED = 2` easy takes, or the probe, self-report or level test: drops rubato and quarters | coach.ts:38, 565 | Skips scaffolding | **No: re-derived each session** (only a `bg.skilled` hint passes in) |
| In-session | `dayStart[rung]`: today's first pulsed take; the climb slows above +25 % | keyCoach.ts:120, 921 | Guards against a hot-streak runaway | No |
| In-session | Challenges: `CHAL_P = 1/3`, `CHAL_GAP = 6`, `CHAL_SURE = 4`, `CHAL_FAILS = 2`; `chal.ceil` per comfort kind | keyCoach.ts:209 | Probes above the climb | Session ceilings no; item `ceil` 30 days yes |
| In-session | Plateau: `PLATEAU_TAKES` with no new best → "your limit today", the ceiling is saved, move on | coach.ts | Avoids stuck loops | Ceiling yes |
| In-session | Almost/miss: `ALMOSTS_TO_EASE = 3`, `MISSES_TO_PARK = 3`, `SLOWER = 0.9`, `REVIEW_EVERY = 5` | coach.ts | Slows down quickly | Weak spots per session |
| In-session (spec) | D1: blocked until 2 clean pulsed takes, then rotation of 3–4, `VISIT_TAKES = 3` | SPEC-SPIRAL-PRACTICE | Interleaving | Stage-passed per key, yes |
| Cross-session | `ItemState`: `cleanBpm`, `goalBpm`, EWMAs (cv, sd, hands, acc), `history` (200), `passLog` (60), `activeMs`, `takes` | ladder.ts:96 | Level, start tempo | Yes |
| Cross-session | `itemPass`: 3 clean takes at ≥ 95 % of target on ≥ 2 days; spec adds a cold take on a later day | ladder.ts:31–41 | Promotion | Yes |
| Cross-session (spec) | Cold take: first qualifying take after a ≥ 1 h gap; `ItemState.cold[]` (60); week-ago comparison | SPEC-SPIRAL §4 | Level by cold evidence | Yes |
| Cross-session | Key session tiers T0–T6 from the level test or self-report; fresh probe | SPEC-KEY-SESSION-2 §4 | Starting point | Yes (tier) |
| Cross-session | Weekly profile snapshots: patterns new / recurring / gone, with counters | analysis/profile.ts, storage/profile.ts | Coach text | Yes, but **patterns, not rates** |
| Cross-session | P1 take traces (`TakeTrace`, `TAKE_KIND` rules on what may change history, staircase, passes) | tendency.ts | Tendencies; calibration upload | Yes (device; allow-listed upload) |
| Spec | §9א dynamic calibration: per user and input, Bayesian shrinkage from default to personal; "calibrate the noise, not the standard"; reset on input change | SPEC-PRACTICE-INTELLIGENCE | Measurement noise | Planned |

**What is missing:**
- There is no persistent per-learner, per-area estimate of improvement rate, acquisition speed or retention. `skilled` is a per-session boolean.
- `activeMs` and the cold log hold the raw material for a rate, but nothing reads them as one.
- Every pacing constant is the same for everyone: `TEMPO_STEP`, D1 = 2, `VISIT_TAKES`, `CHAL_*`, the 25 % `dayStart` brake, cold-check tempo `max(0.9 × best, 0.95 × target)`.
- Spacing of passed items is a fixed rule, not a per-learner forgetting estimate.

## 2. Evidence and models

Tags: **[V]** verified this session (primary source or its abstract found); **[B]** citation confirmed, content secondhand; **[U]** from memory, not checked.

### 2.1 Individual differences in learning rate, and how stable they are

- People differ reliably in learning rate *within* a task, but the rates often **do not correlate across tasks**. Stark-Inbar et al. (2017) measured visuomotor adaptation, the alternating serial reaction time task (ASRT) and the serial reaction time task (SRT). Individual learning was reliable in adaptation and the ASRT, but not in the SRT, and the tasks did not correlate with each other. **[B]**
- Wu et al. (2014, *Nature Neuroscience*): task-relevant motor variability predicted faster learning across people and across two paradigms. This is a counterpoint suggesting some shared factor. **[B]** I found the PMC copy in search but did not read the full text.
- Han, Thompson & Reber (2025): in parallel versions of an implicit sequence task, learning showed no rank-order stability. **[B]**
- Ackerman (1988 onward): which abilities predict performance shifts during skill acquisition, from general cognitive ability early to perceptual-speed and psychomotor ability late. **[U]**
- **Design consequence:** do not assume one global "learner speed". Estimate per area (scales, arpeggios, independence, ear …) and per instrument. A global factor should be only a weak prior, with its weight learned from data.

### 2.2 The shape of practice curves

- Newell & Rosenbloom (1981): the power law of practice. **[U]** The citation is standard; I did not re-check it this session.
- Heathcote, Brown & Mewhort (2000, *Psychonomic Bulletin & Review* 7:185–207): across 7,910 learning series from 475 subjects, the **exponential fit individual series better than the power law**. A power law appears when exponentials are averaged across people. They proposed the APEX function. **[V]** (abstract)
- Evans, Brown, Mewhort & Heathcote (2018): a "delayed exponential" fits most paradigms. **[B]**
- **Design consequence:**
  - Fit learning per individual. A per-learner exponential rate parameter is the natural "rate" quantity.
  - Gains near the asymptote are small by nature. So a raw slope makes advanced players and items near target look "slow". Compare observed gain with the gain *expected* from the current distance to that learner's asymptote.
  - Since the app caps at a target, and `OVER_MAX` above it, the distance to target is a usable proxy.

### 2.3 Learning-rate estimation in adaptive systems

- **BKT:** standard per-skill parameters are prior knowledge, learning probability, slip and guess (Corbett & Anderson 1995). **[U]**
- **Individualized BKT** (Yudelson, Koedinger & Gordon 2013, AIED): student-specific parameters improved prediction on unseen students, and the *speed-of-learning* parameter helped more than prior knowledge. **[V]** (abstract) This is the strongest direct support for the owner's idea.
- **Elo in education** (Pelánek 2016, *Computers & Education*): each answer is treated as a match between student and item. Simple and robust, it estimates skill and item difficulty together. Variants use uncertainty-based K-factors, and Glicko-like rating deviations play the same role. **[V]** (abstract) Learning is modelled as drift in the student's rating. Pelánek also has an Elo-with-decay paper. **[B]**
- **IRT with growth** (explanatory or longitudinal IRT, e.g. Embretson's multidimensional Rasch model for learning and change): ability over time = intercept + person-specific slope, with random slopes shrunk to the population. **[U]**
- **Design consequence:**
  - The cleanest formal home is a hierarchical growth model. Each learner and area has a random intercept (level) and a random slope (rate), and items have a difficulty (an Elo-like offset per item kind and tier).
  - On device it can be approximated with a running precision-weighted update rather than a full fit.

### 2.4 Acquisition rate vs retention (forgetting) rate

- **Half-life regression** (Settles & Meeder 2016, ACL): recall p = 2^(−Δ/h), with half-life h regressed on features. Error fell 45 %+ compared with baselines, and daily engagement rose 12 % in an operational study. **[V]** (abstract)
- A 2026 mixed-effects HLR adds per-learner random effects. **[B]**
- **FSRS** (Ye, Su & Cao 2022, KDD; in Anki since 23.10): per card, the memory state is difficulty, stability and retrievability. Review is scheduled when predicted retention falls to a target, about 90 %. Parameters are optimised per user from their own review log. **[B]**
- **Design consequence:**
  - Retention is a separate trait from acquisition. A learner can acquire quickly and forget quickly.
  - Measure it separately, per area: cold take ÷ last session best, binned by gap.
  - Use it for spacing and the cold-start tempo, not for step size.
  - The motor analogue of "recall" is how much of the session best returns cold. Motor skills usually decay less than declarative items and show warm-up decrement (Adams; Schmidt & Lee). **[U]**

### 2.5 The target: challenge point

- Guadagnoli & Lee (2004, *J. Motor Behavior* 36:212–224): learning depends on the information a practice condition yields. That is a function of task difficulty relative to the learner's skill, and there is an **optimal challenge point** per learner. **[V]** (abstract) A 2025 scoping review covers its applications. **[B]**
- Related: the **learning vs performance** distinction (Soderstrom & Bjork 2015) **[U]**, and Abushanab & Bishara (2013) on blocked vs interleaved practice, already cited in SPEC-SPIRAL. **[U]**
- **Design consequence:**
  - What the rate controls is *how fast the challenge point moves*. The coach should keep each learner at a roughly constant clean / almost / miss mix, with a target band of about 60–80 % clean on climbing takes, rather than at a constant tempo step. This target band is my proposal, not a literature value.
  - A faster learner's challenge point moves faster between sessions, so structural steps can be bigger.
  - Contextual interference (rotation) helps retention but costs in-session performance. Faster learners tolerate earlier interleaving: a shorter blocked phase.

### 2.6 Risks noted in the literature

- **Regression to the mean:** extreme early estimates are mostly noise. Shrinkage is the standard remedy. **[U]**
- **Day-to-day variability:** sleep, time of day and warm-up. Motor-sequence consolidation work (Walker et al. 2002, offline gains after sleep) has been contested on methodological grounds (Rickard et al. 2008). **[U]**
- **Labelling and motivation:** ability labels can lower effort and persistence after setbacks (Mueller & Dweck 1998). Feedback that compares to others changes motivation (Kluger & DeNisi 1996, feedback intervention theory). **[U]**
- **Fairness:** the measured rate partly reflects input quality (mic vs MIDI latency and jitter), instrument, practice context and age, not just learning ability. **[U]** This is a reasoned point, not from a specific study.

## 3. Design

### 3(a) What to measure

All tempos in **log nps** (log notes per second), so that gains are relative and comparable across note values. All rates are per **(learner, instrument, area)**. Area follows the family/skill-map grouping: scales, arpeggios/chords, harmonised (3rds/6ths), independence/coordination, licks/vocabulary, ear (per game family), voice. A global (learner, instrument) level sits above as a prior.

| Rate | Definition | Source data | Unit / normalisation |
|---|---|---|---|
| **A: acquisition** | Pulsed takes from an exercise's first take to the D1 criterion (2 clean pulsed takes at comfort tempo); also minutes | Run/visit logs, `TakeTrace.kind` | log(observed takes ÷ expected takes for that item kind × tier); negative = faster |
| **E: in-session climb efficiency** | log-nps gained per climbing take on rungs not yet at target, counting only `TAKE_KIND.staircase` takes, through the first plateau | Session take sequence | Ratio to the expected gain at that nps: mean `stepCap(nps) × q̄_pop` |
| **G: cold gain per practice-hour (primary)** | For consecutive cold takes on the same item: Δ log-nps (cold) ÷ active minutes on that item (or area) between them | `ItemState.cold[]`, `activeMs` | Ratio to the expected gain under the population exponential: E[Δ] = (L_target − L_prev) × (1 − e^(−β_pop × Δt_active)); report log(observed ÷ expected) |
| **R: retention** | cold log-nps − previous session best log-nps, binned by gap (1–8 h, 8–36 h, 1.5–4 d, 4–10 d, > 10 d) | Cold log + session bests | Per bin: shrunk mean; summarised as a half-life-like parameter h in r(Δ) = r∞ + (1 − r∞) × 2^(−Δ/h) |

Notes:
- **G is the one that matters.** It is what "learning" means in SPEC-SPIRAL D3: promotion by cold evidence. E is fast to observe but is performance, so use it mainly as a within-session correction and as a weak early prior for G. A has few events per area. R drives spacing.
- **Item difficulty must be factored out.** A learner doing harder items should not look slower. Keep a per (item kind, tier, hands, broken/together) expected-gain and expected-takes table, the "comfort kind" key already used in keyCoach. Seed it from the calibration accounts and update it population-wide later, Elo-style.
- **Only qualifying takes count**, per `TAKE_KIND`: challenge, slow, form, remedy and free takes do not feed G or E. Probe takes feed A only as "already acquired".
- **The 1 h cold rule** (owner, 2026-11-27) means some "cold" takes are only 1–8 h after the last one, and these sit close to warm performance. The gap must be stored with every cold entry. G should use cold pairs whose second take is ≥ 8 h after the previous qualifying take, or include the gap bin as a covariate. Otherwise a player who returns after lunch inflates G and deflates R's short-gap bin.

### 3(b) Robust estimation from sparse, noisy data

**Model, conceptually:** for learner j, area a, the score z_ja = log(observed ÷ expected), averaged over events with weights.

- **Prior:** z_ja ~ N(μ_a + g_j, τ_a²). Here g_j is a global learner factor with its own prior N(0, τ_g²), and τ_a is the between-learner spread for the area.
- **Event noise:** each event (a cold pair, an acquisition, a session's climb) has variance σ_e². Estimate it from the calibration traces. This is the one thing the two calibration accounts *can* measure well: repeated cold takes on the same items show the within-person noise.
- **Posterior mean** (closed form, cheap on device): ẑ = (Σ w_i z_i / σ_e² + (μ_a + ĝ_j) / τ_a²) ÷ (Σ w_i / σ_e² + 1/τ_a²). The global ĝ_j comes from the same formula pooled across areas, with τ_g small.
- **τ_a cannot be estimated from one person.** Until there are ~20+ real learners, set τ_a conservatively. For example, a prior spread of rates of ±30 % (τ ≈ 0.25 in log space) implies heavy shrinkage. After that, use empirical Bayes: the method-of-moments between-learner variance, floored.

**Event weights:**
- Cold pairs: w = 1. Pairs whose gap includes a break > 10 days: w = 0 for G; they go to R.
- Acquisition events: w = 0.7.
- Session climb efficiency: w = 0.3 per session, capped. It is performance, so it informs only weakly.
- Fatigue: takes after minute 40 of a session, or after the `dayStart` brake triggered, get w × 0.5. Another option is a session-minute covariate.
- Day effects: aggregate to one value per (item, day) before weighting, so a single bad day counts once.

**Minimum evidence before acting:** in an area, ≥ 6 cold pairs on ≥ 3 distinct days across ≥ 2 exercises, and posterior SD < 0.15. Before that, the multipliers stay at 1.0. That is today's behaviour, exactly.
- With a 30-min key session touching 4–6 exercises, the threshold is reached in about 3–4 sessions per area.
- The effective weight w_eff = n ÷ (n + k), with k = σ_e²/τ_a² (about 8 with the numbers above). It also scales how far multipliers move.

**Update:**
- Recompute after each session, on device, from the item logs. No new heavy state is needed, only a small `rates` record per (instrument, area): {ẑ, sd, n, updatedAt, inputId}.
- The estimate is an exponentially weighted window, about a 6-week half-life, so the rate can drift as the learner changes. Rates do change: early learning is fast, a plateau is slow.

**Breaks:**
- After a > 10-day gap, the first session's cold takes feed R only.
- G pauses until two post-break cold pairs exist.
- Multipliers fall back halfway toward 1.0 after a > 21-day break.

**Input changes:**
- As in §9א, a change of MIDI device or mic (a new `inputId`) starts a fresh estimate for that input, seeded at 50 % weight from the old one.
- Verdicts depend on calibration. A changed noise floor changes "clean", which would masquerade as a rate change.

**Guarding against artefacts:**
- A version bump that changes thresholds or verdict logic (`MEASUREMENT-AUDIT`-type changes) should mark old events w × 0.5. Store an `engineVer` with each rate event.

### 3(c) Mapping rates to coach parameters

Principles:
1. **Pacing only.** The rate never changes what counts as clean, passed, or a level. Fixed: `PASS_TAKES`, `PASS_SHARE`, `PASS_DAYS`, the cold-day rule, `thresholds()`, `MISSES_TO_PARK`, `ALMOSTS_TO_EASE`, `SLOWER`, `PLATEAU_TAKES`, `CHAL_FAILS`, `OVER_MAX`.
2. **Clean-gated.** A speed-up applies only on the clean-take paths that exist today. Any miss or almost uses the existing slow-down logic unchanged.
3. **Slow down quickly, speed up slowly.** A downward multiplier change applies at once. An upward one moves at most 0.05 per week. In-session, if the clean share of climbing takes falls below 50 % over the last 8, all "fast" multipliers drop to 1.0 for the rest of the session.
4. **Bounded and smooth.** m = exp(clamp(w_eff × ẑ, −0.4, +0.25)), giving m ∈ [0.67, 1.28]. Each parameter maps m through its own range below. A positive "fast" ẑ means sign-flipped for acquisition, where fewer takes is faster.
5. **Don't double count.** `stepQuality` already speeds up a learner whose takes are clean. Most of the rate effect therefore goes to structure, and the tempo step changes only slightly.
6. **Teacher's `!` sessions ignore the rate entirely**, consistent with D4.

| Parameter (today) | Driven by | Mapping | Range | Notes |
|---|---|---|---|---|
| `stepCap(nps)` multiplier k in `climbFrom` / `gradedUp` (1.0) | G, then E | k = m^0.5 | 0.85–1.15 | Small, to avoid double counting q. The absolute cap of +22 % at ≤ 2 nps stays a hard ceiling. |
| D1 acquisition criterion (2 clean pulsed takes) | A | fast with ẑ_A ≤ −0.25 and the take q ≥ 0.8 → 1; slow with ẑ_A ≥ +0.25 → 3 | 1–3 | "1" only on an easy take. A missed first rotation visit goes back to blocked. |
| `VISIT_TAKES` (3) | G and A | round(3 ÷ m), clamped | 2–4 | Faster learners rotate sooner (more contextual interference). The end-on-success extension is unchanged. |
| New-exercise entry (rotation of 3–4; next enters when the set is acquired) | A | fast: enters when all but one of the set are acquired; slow: set of 3 and all acquired + 1 cold pass | set 3–4 | Never more than 4 in rotation (cognitive load). |
| Tier gate (opening the next tier's rungs or forms, e.g. contrary at T2) | G | fast: open after N−1 of N gate rungs pass; slow: N plus one cold review | ±1 rung | The pass definition is unchanged; only how many passes open the gate. Fits "NO locks": this changes the suggestion order, not access. |
| `dayStart` brake (×0.6 above +25 %) | E and R | threshold = 1.25 × m^0.5 | 1.15–1.35 | A slow-retention learner gets an earlier brake (less same-day overreach that fails cold). |
| Cold-check tempo `max(0.9 × best, 0.95 × target)` | R (gap bin) | 0.9 → predicted cold fraction r̂(gap) − 0.02, clamped | 0.82–0.95 | Uses the per-learner forgetting curve. Fewer missed cold checks for fast forgetters, less wasted warm-up for strong retainers. |
| Review spacing of passed items / key-of-the-week review | R | next review when predicted r̂ falls to 0.92 of the pass tempo (FSRS-style target retention) | 2–30 d | Replaces the fixed rule only after R has ≥ 2 bins with evidence. |
| `CHAL_P` (1/3), `CHAL_GAP` (6) | G | P = 1/3 × m (0.25–0.45); GAP = round(6 ÷ m) (4–8) | see left | `CHAL_FAILS = 2` and the ceiling logic are unchanged. |
| `EASY_TO_SKILLED` (2) | A | unchanged; but a learner with ẑ_A ≤ −0.25 and ≥ 2 sessions of `skilled` starts the next session `skilled` in that area | — | Fixes the "re-derived every session" waste without lowering any standard. |
| Session start tempo `base` (`0.94 × cleanBpm`, carry) | R | 0.94 → r̂(gap since last session) | 0.88–0.97 | The same idea as the cold check, for non-cold starts. |

**Worked example (fast, scales).** ẑ_G = +0.3, w_eff = 0.7 → m = exp(0.21) ≈ 1.23.
- k ≈ 1.11.
- `VISIT_TAKES` = round(3 ÷ 1.23) = 2.
- `CHAL_P` ≈ 0.41, gap 5.
- `dayStart` brake at about +39 %, clamped to 1.35.
- D1 = 1 on an easy first clean take.

The new rung therefore enters a rotation about one visit sooner, and the learner meets their edge (challenges, a ceiling) about 30 % sooner in takes. Pass rules are untouched.

### 3(d) What the student and teacher see

**Student:**
- Nothing until the minimum evidence exists.
- Then at most one line in the end-of-session summary (beside the cold-now vs week-ago line in SPEC-SPIRAL §4), self-referential and concrete. For example:
  - "Scales: your cold tempo rose 9 % over your last 3 practice hours, faster than in October."
  - "Arpeggios come back strongly after a day off: today's first take was 96 % of Monday's best."
- Toni may say "I'm moving you along a little faster in scales" when a multiplier crosses 1.15, so the change in pace isn't mysterious. This follows the owner's 2026-11-27 lesson that a drop with no reason felt arbitrary.

**Never shown:**
- labels ("fast learner"), percentiles, comparisons with friends or the league, or a "learning speed score";
- rate-based badges or XP. Rewards stay effort- and evidence-based, as in practice-session-rewards.

When the rate dips, say nothing comparative. Treat the dip as a plateau and keep to the existing "limit today" language.

**Teacher (class view, SPEC-TEACHER-CLASS):**
- Per student and area: trend arrow (G over the last 4 weeks vs the previous 4), confidence (n, days), and retention band.
- A *pace* control: auto (default) / standard (all multipliers 1.0) / gentler.
- Phrased as practice efficiency ("gains per practice hour"), never as aptitude.
- No class rankings by rate.

### 3(e) Validation

1. **Synthetic learners (before any code goes to users).** Build a simulator for each learner and area with:
   - a per-item delayed-exponential curve with learner rate β_j drawn from log-normal(0, 0.3);
   - asymptote, warm-up decrement and forgetting half-life h_j;
   - day noise σ_d and take noise σ_e;
   - a fatigue drift within a session.

   Run the actual coach code (`coachNext`/keyCoach) with rates off vs on. Metrics:
   - cold log-nps gain per active hour (primary);
   - time to pass;
   - clean share of climbing takes (should stay in 60–80 % for all β);
   - missed cold checks;
   - overshoot rate (miss immediately after an increase);
   - **false-fast rate**: the share of slow learners whose multiplier ever exceeds 1.1;
   - convergence time of ẑ.

   Success: fast learners gain ≥ 15 % more per hour, slow learners are no worse than with rates off, and false-fast stays < 5 %.
2. **Offline replay on the calibration traces** (allow-listed uploads, 0.145.8):
   - estimate σ_e from repeated cold takes;
   - estimate split-half reliability: G from odd vs even weeks, or two items in the same area;
   - check the cross-area correlation, to see whether a global g_j is worth keeping at all.

   Kill criterion: split-half r < 0.4 within an area → keep only R (retention-based spacing and cold start) and drop the acquisition and gain multipliers. Note that both accounts are one player, so this tests the estimator and noise, not the population spread.
3. **Shadow mode in production:**
   - compute and log rates and the multipliers they *would* set, without applying them, for the first 4–6 weeks of real users;
   - check how stable they are and how often they hit the clamps.
4. **A/B test**, once there are enough users (roughly ≥ 100 active per arm for a G effect of about 0.3 SD):
   - assign per learner, not per session;
   - primary outcome = cold-tempo gain per practice-hour over 4 weeks;
   - guardrails = retention (7-day return), clean share and missed cold checks.

### 3(f) Data and privacy

- **Computed on device** from data already on device (`ItemState`, the cold log, traces), as a pure function in `src/engine/analysis/`, like profile.ts.
- **Synced:** only the small `rates` record (per instrument and area: ẑ, sd, n, updatedAt, inputId, engineVer), so that pacing follows the learner across devices and the teacher sees trend and confidence. Merge rule: newest wins per area.
- **Not synced:** raw traces, except for the existing allow-listed calibration accounts.
- **Population priors** (μ_a, τ_a, the expected-gain table per item kind) ship in the app bundle. They are seeded from the calibration accounts and the literature-informed τ. Later they are updated server-side from aggregated per-area statistics, never per-user rows, and disclosed in the privacy policy. Opt-out = priors stay at the bundled defaults.
- Rates follow the same device vs synced split as `device-settings`: input-specific measurement stays local, while learner-level traits sync.
- A "reset my pace" control in settings clears the `rates` record.

## 4. Risks and mitigations

| Risk | Mechanism | Mitigation |
|---|---|---|
| Noise / early luck | Few cold pairs; one great day | Minimum evidence; shrinkage with w_eff; per-day aggregation; slow upward drift (+0.05/week) |
| Regression to the mean | A bad setup in the first sessions (wrong mic latency, unfamiliar keyboard) → later looks "fast" | Reset per inputId; down-weight the first 2 sessions per input; shrinkage |
| Ceiling artefact | Near target or asymptote, gains shrink → advanced players look slow | Expected-gain normalisation (exponential distance to target) |
| Item mix | Harder items, slower gains | Expected gain and takes per comfort kind × tier |
| Fatigue / day effects | Late-session takes, tired days | Session-minute weighting; per-day aggregation; the `dayStart` brake |
| Warm vs cold confusion | 1 h "cold" takes are near-warm | Store the gap; G uses ≥ 8 h pairs or a gap covariate |
| Double counting | `stepQuality` already speeds clean players | k on stepCap ≤ 1.15; rate acts mainly on structure |
| Overreach injury / tension | Faster tempo steps for motor skills | Hard step cap unchanged; dayStart brake; an in-session clean-share drop resets to 1.0 |
| Motivation from labels | Fixed-mindset effects, comparison | No labels or percentiles; self-comparison only; dips unannounced |
| Fairness | Mic users, cheaper gear, children → noisier verdicts → "slower" | Per-input estimates; calibration first (§9א); rate never locks content or changes standards; teacher override |
| Engine changes | Verdict logic changes alter measured rates | `engineVer` on events; down-weight old events |
| Gaming / sandbagging | Playing badly early to get easier pacing | Low payoff (standards fixed); downward moves affect only pacing |

## 5. Suggested build order (for the owner to approve)

1. **R first** (lowest risk, clear value): per-learner retention bins → cold-check tempo and review spacing. The cold log from SPEC-SPIRAL already supplies the data.
2. **Persist `skilled` per area** (from A), so the session stops re-deriving it.
3. **G and A in shadow mode**, with the end-of-session self-comparison line.
4. **Structural multipliers** (D1, `VISIT_TAKES`, entry, challenges, tier gate) after the offline replay passes.
5. **Small step multiplier k** last, only if the simulation shows a gain beyond structure.

### Questions for the owner
- Should the per-learner pace be visible as a setting ("pace: auto / steady"), or only for teachers?
- Is "never changes pass standards" the rule he intends? It is my recommendation.
- Is the global learner factor wanted? The evidence suggests rates are largely task-specific.

## 6. References

- Ackerman, P. L. (1988). Determinants of individual differences during skill acquisition. *J. Exp. Psychol.: General*, 117, 288–318. [U]
- Abushanab, B., & Bishara, A. J. (2013). Memory and metacognition for piano melodies: illusory advantages of fixed- over random-order practice. *Memory & Cognition*. [U]
- Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing. *User Modeling and User-Adapted Interaction*, 4, 253–278. [U]
- Evans, N. J., Brown, S. D., Mewhort, D. J. K., & Heathcote, A. (2018). Refining the law of practice. *Psychological Review*. [B] https://figshare.utas.edu.au/articles/journal_contribution/Refining_the_Law_of_Practice/22964183
- Guadagnoli, M. A., & Lee, T. D. (2004). Challenge point. *J. Motor Behavior*, 36(2), 212–224. doi:10.3200/JMBR.36.2.212-224. [V] https://experts.mcmaster.ca/scholarly-works/1313883
- Thomas et al. (2025). Challenge Accepted: scoping review of the challenge point framework. *J. Motor Behavior*, 57(4). [B] https://eprints.leedsbeckett.ac.uk/id/eprint/12281/
- Han, Thompson & Reber (2025). Individual differences in implicit perceptual-motor learning, parallel assessments. *J. Intelligence*. [B] https://pmc.ncbi.nlm.nih.gov/articles/PMC12470835
- Heathcote, A., Brown, S., & Mewhort, D. J. K. (2000). The power law repealed. *Psychonomic Bulletin & Review*, 7(2), 185–207. [V] https://link.springer.com/article/10.3758/BF03212979
- Kluger, A. N., & DeNisi, A. (1996). Feedback intervention theory. *Psychological Bulletin*, 119, 254–284. [U]
- Mueller, C. M., & Dweck, C. S. (1998). Praise for intelligence can undermine motivation. *JPSP*, 75, 33–52. [U]
- Newell, A., & Rosenbloom, P. S. (1981). Mechanisms of skill acquisition and the law of practice. [U]
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. *Computers & Education*. doi:10.1016/j.compedu.2016.03.017. [V] https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL*, 1848–1858. [V] https://aclanthology.org/P16-1174
- Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance. *Perspectives on Psych. Science*. [U]
- Stark-Inbar, A., Raza, M., Taylor, J. A., & Ivry, R. B. (2017). Individual differences in implicit motor learning: task specificity. *J. Neurophysiology*. [B] https://pmc.ncbi.nlm.nih.gov/articles/PMC5253399
- Wu, H. G., Miyamoto, Y. R., Gonzalez Castro, L. N., Ölveczky, B. P., & Smith, M. A. (2014). Temporal structure of motor variability predicts motor learning ability. *Nature Neuroscience*. [B] https://pmc.ncbi.nlm.nih.gov/articles/PMC4442489
- Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling (FSRS). *KDD*, 4381–4390. [B] https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm
- Yudelson, M. V., Koedinger, K. R., & Gordon, G. J. (2013). Individualized Bayesian knowledge tracing models. *AIED*, 171–180. doi:10.1007/978-3-642-39112-5_18. [V] https://kilthub.cmu.edu/articles/journal_contribution/Individualized_Bayesian_Knowledge_Tracing_Models/6475793

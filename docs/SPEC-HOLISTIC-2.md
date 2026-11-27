# Holistic round 2: one level, honest rewards, real music (v5, consolidated, 2026-11-27)

This spec implements the two whole-app audits of 2026-11-27:
- docs/AUDIT-HOLISTIC-MEASUREMENT.md (AM);
- docs/AUDIT-HOLISTIC-PEDAGOGY.md (AP);

and the three re-audit rounds that followed (round 1: RP / RM; round 2: RP2 / RM2; round 3: fresh independent reviewers).

It sits beside docs/SPEC-SPIRAL-PRACTICE.md (SP, v6). Where they overlap, this spec says which one governs. It governs SP §4 and SP §17 where they touch level.

v5 is the consolidation asked for in v4 §20: the v2–v4 amendment layers are merged into the body, superseded text is removed, and no rule is changed. Appendix A maps every amendment item to its place here.

---

## 0. Owner decisions (2026-11-27)

| # | Decision |
|---|---|
| H1 | **The order of work:** (1) one level semantics on cold evidence, built with SP step 1; (2) quick fixes (Ear level, rewards); (3) the SP rotation; (4) real heads, learn-a-tune, unit capstones, accompanying a singer; (5) listening lab, pop chord library, voice registration and text, how to practise, composition. The full merged steps are §18. |
| H2 | **Music rights follow US law** (memory: us-copyright-law). Compositions published in 1930 or earlier are public domain in the US as of 2026-01-01. Sound recordings published in 1925 or earlier are PD in the US. `heads.ts`'s "PD worldwide" rule is replaced by US PD, with per-head region tiers (§8.1). Every melody is verified note by note against period sheet music (LoC, IMSLP), never a modern fake book (owner rule 2026-11-15). |
| H3 | **Listening assignments may embed YouTube recordings** (embed only; no download, no extraction). Transcription is done from the student's own copy or from US-PD recordings. |
| H4 | **Answered (owner 2026-11-27):** (a) **Songbook:** the existing traditional or classical songs are public domain (checked: Happy Birthday has been PD since the 2016 ruling; the rest are traditional or pre-1900). The 7 originals are OK. (b) **Voice-course songs:** app-written diatonic, tonal practice melodies built to train one vocal element are OK, and new ones may be written for that purpose. (c) **Rule-generated licks:** OK, because the owner gave the rules; any lick whose rule origin is unclear is flagged for the owner. (d) **Still not allowed:** Claude-composed music as demos, backing tracks or an "AI band" (no-claude-composed-music). These items serve every region as the region-safe pool, alongside the 1A heads. Each lick and original head records where it came from. |
| Breaks | **A level never drops from a break, only from measurement** (owner 2026-11-27). Inactivity shows "refresh" and a wider range (§1.7, §1.11). |
| Pop | **The pop chord library is global and jazz-adjacent, not Israeli-focused** (owner 2026-11-27; §11.1). |

---

## 1. One level semantics (AM #1, #2, #3, #10)

### 1.1 Definition and separate axes
- **Level in an area** = the hardest **content tier** at which the learner's **cold** success probability is ≥ p* = 0.7. It is shown with a range until the uncertainty is small.
- Level is estimated by the Phase A rule (§1.7) until Phase B (§1.8) is validated.
- **Not measured:** tone, posture and tension are not measured by the level. They come only from teacher rubrics (§12.1).
- **Separate axes, never mixed into level:**
  - **Coverage:** stars, 12 keys, forms played.
  - **Maintenance:** fresh / refresh.
  - **Effort:** XP, streak, minutes.

### 1.2 Content tier
- **`contentTier`** (0–8, the app's T scale) is a field on the **spec / option** (`SpecTemplate`), not on `LevelDef`, because `LadderRung.min` varies per option (e.g. `b-scale-6` 1 or 3).
  - Seeded from `LadderRung.min` (keyIndex.ts) and the SP §14 entry bands.
  - Hand-set for families neither covers. **A guard test fails on any spec / option without one.**
- **`tierBounds` (tempo) is the band, never the content tier.**
- **Ordering is lexicographic: content first, then the band.**

| Area | Content tier | Ordering |
|---|---|---|
| Technique (piano, guitar, bass, drums) | `contentTier` of the spec / option. **Scales and arpeggios:** content = their nps tier (their content is the tempo, consistent with SP A8). | content tier → tempo band. A T4 item at a slow band ranks above a T2 item at a fast band. |
| Ear | the feature-based difficulty (SPEC-EAR-INTELLIGENCE §4), with a guess floor per answer count. SPEC-EAR-INTELLIGENCE governs the Ear level itself (§1.14). | — |
| Reading | **reading complexity** = a weighted sum of subdivision level, accidentals, ledger lines, density and key distance. Each feature is normalised to 0–1 over the catalogue range before the sum. Equal weights to start; the weights are fitted later. | complexity score → tempo |
| Voice | item level × cents band (60/45/30 ¢) × timing band | item level → cents band → timing band |
| Rhythm / time | subdivision type × timing SD band | subdivision → SD band |
| Games | excluded from Phase A level evidence. Games are practice only (they may feed need, §5) and never set a level. | — |

### 1.3 `areaTier` = {content, band}
- **`areaTier(area)`** replaces `playerTier`, SP A8 and any separate level function. It returns `{content, band}`, plus placement until confirmed.
- **`content`** is the §1 level. **Level, rank, course DYN and friend level read content** (rank and its derivatives through the high-water mark, §1.10).
- **`band`** is the tempo tier: the take's own nps tier, capped by the learner's **confirmed band**.
  - **Confirmed band** = the tempo tier of the area's confirmed scale benchmark (from placement until confirmed).
  - It is used **only** for: timing tolerances (`tierTiming`, analyze.ts:838), the beginner definition (SP A3), and stretch `tierUp` / `tierDown`.
  - Harmony and other fixed-tempo areas are never gated by tempo.
- The units never mix, so promotion and tolerance can't oscillate.
- **Entry gate (content-based):** an item may enter when its entry content tier ≤ `areaTier.content + 1` (the candidate tier) and its prerequisites are `established` (§1.6). This is how SP §15.5 entry reads the tier.
  - **Harness test:** a steadily improving simulated learner climbs from T0 to T5 on rotation alone (§9).

### 1.4 Cold evidence everywhere
- **The cold flag** (`ev.cold: boolean`) is written on every rating event in every area, at creation; refolds keep it.
- **Technique cold take:** SP §4.1 as amended here:
  - the item's take is cold when **≥ 1 h has passed since any sounding take of the item or of any item in its cell**: RH, LH, slower, burst, challenge and coordination takes included. This closes warm-up laundering.
  - The gap is timed by a per-cell **`lastSound`** (any sounding take). SP §4.1 and SP §3 are amended to read `lastSound`. `lastQual` remains for the ≥ 1 h re-measure rule.
  - The take must still qualify per SP §4.1: full click, straight, not a challenge, burst or probe.
  - `sessionMs` (minutes since the session start) is logged on every cold entry. It is a Phase B covariate.
- **Only the first cold take in a session counts toward level.** Later cold takes in that session (neighbouring cells warm the hands) count only toward FSRS and the staircase.
- **Per modality:**
  - **Ear:** the first 5 trials of a skill/contrast after ≥ 8 h. Where SPEC-EAR-INTELLIGENCE's own cold definition differs, it governs.
  - **Voice:** per item, after ≥ 1 h, kept in the `cellPass` store (§1.6). `sessionMs` is its warm-up covariate (vocal warm-up is physiological; AM §3.6).
  - **Rhythm:** the first 2 takes of a subdivision type after ≥ 1 h, kept in the `cellPass` store.
  - **Reading:** sight takes are cold by design.
  - **Games:** the first run of a game after ≥ 8 h (used for game refresh, §4.3; games are not level evidence).
- **Cross-device:** `lastQual`, `lastSound` and the cold entries sync with timestamps. On merge, a second "cold" within 1 h of another device's qualifying take is downgraded to warm.

### 1.5 Cold readers
Every warm-peak reader (AM §3.4) moves to a cold reading, and **every move gets a guard test**.

| Reader | Change |
|---|---|
| `familyLevel`, the technique rank, the course level, badges, friend levels | read the new level (§1.7, §1.10) |
| `history` and snapshots | a daily **cold** entry beside the daily best. Trends and teacher charts read cold. The best stays display-only ("today's best"). |
| The end-screen graph | labelled "today's best"; the SP §4.3 cold line is shown first |
| `plateau.ts` | replaced by one plateau definition on the cold series (§6.2) |
| Momentum tempo records, the stretch "record" band, Momentum `statusUps` and `rating` | cold only (§3) |
| Stretch `tierUp` / `tierDown` | read `areaTier.band` (§1.3) |
| Path technique ✓ | the strengthen pool treats it as acquired only once `established` (a later-day cold confirmation, §1.6) |
| The AI coach, the weekly profile, the teacher digest | get the cold series |

### 1.6 Evidence, passes, `acquired` and `established`
- **Confirmations at a tier** are **every cold take at ≥ 0.95 × target on any item of that content tier, passed or not, excluding each item's own passing take.** They are not selected on success.
- **Breadth:** confirmations are needed in ≥ 2 keys where keys apply (`playerTier`'s breadth, now `areaTier`). *(See the report note: kept from v2 B2; no later amendment struck it.)*
- **Not enough:** a clean take at an item's start tempo never counts toward level.
- **Exclusions:** `~feel`, burst, link and challenge takes never count.
- **The level test** places a learner as "placed, to confirm" until the promotion test (§1.7) is met.
- **Items stay passed** (SP §4.2, `passedAt`). The level can fall to "refresh", but a closed item never reopens on its own.
- **Areas without `passedAt`:**
  - **Reading:** cold sight takes per complexity tier. A tier "passes" after 3 clean first-sight takes on ≥ 2 days. The §1.7 test runs on sight takes.
  - **Voice and rhythm:** each item level × band cell has a sticky pass. A new synced store **`cellPass`** (under the fresh-start epoch) holds `{passedAt, cold[]}` for voice and rhythm cells. It is the per-item cold store for voice and rhythm.
  - **Games:** excluded from Phase A. Practice only (they may feed need).
- **`acquired` vs `established`:**
  - `acquired` (warm, D1) moves an item from blocked to the rotation;
  - **`established`** = a clean cold take on a later day than acquisition. It gates prerequisites, need readiness (§5) and the strengthen pool.
  - SP §14 / §15.5 prerequisites read `established`.

### 1.7 Phase A: a transparent rule, no model (ships first)
- **Promotion test (sliding window):**
  - A cumulative log-likelihood ratio over a **sliding window of the last 12 cold confirmations** at the candidate tier, starting from SPRT parameters p0 = 0.5, p1 = 0.85, α = 0.05, β = 0.2.
  - The ratio is floored at the lower bound and **never restarted**.
  - **Promote** when the upper bound is crossed **and ≥ 2 days** are in the window.
  - **False-promotion target, over an indifference zone:** < 5 % for true p ≤ 0.55 over a 6-month horizon of looks, averaged over the harness's prior. It does not cover learners just below p* (0.55 < p < 0.7), which no finite test can promise. The §9.1 harness tunes the bounds to this target under sequential looks. The horizon is 6 months (decided, v5).
- **Range:** the highest tier with ≥ 1 clean cold take is the top of the range; the width also follows §1.11.
- **Staleness:** a tier without cold evidence for 60 days shows "refresh" only. It never lowers the level.
- **Demotion (hysteresis: the bars for promotion and demotion differ):**
  - A failed cold check of the level tier, and inactivity, only mark "refresh".
  - The **current form** (§1.10) drops one tier only when the tier's confirmation has failed twice in a row on 2 days **and** the clean share is < 1/2 over ≥ 4 cold confirmations on ≥ 2 days.
  - **Re-entry window:** the first 3 practice days after a break of ≥ 7 days, or until the first FSRS-good review. Cold takes in that window never count toward demotion, though they still mark refresh. **A break never causes a drop** (owner).
- **§9.2's reliability gate exempts Phase A**, which is a transparent count rule shown as such.

### 1.8 Phase B (later, shadow first): a psychometric model per learner × family
- P(clean | log nps, cold, input, minutes-in-session (`sessionMs`), time of day), with a hierarchical prior from the catalogue tier (AM #10).
- **Outputs:** the cold level with a confidence interval, the warm-up decrement, the fatigue slope, retention, and the SP §17 G rate.
- It is promoted to the source of truth only after the §9 validation shows split-half reliability ≥ 0.7. Until then Phase A is shown.

### 1.9 The cold staircase and the threshold estimate
- **The staircase only chooses the cold tempo.** It replaces SP §2.5's cold-check tempo for every item that has a previous cold result, and the key-session cold check (SP §3, max(0.9 × best, 0.95 × target)). **The first cold check of an item uses SP §2.5.**
  - SP §17.3's "cold-check tempo, 0.9 × best" row is deleted.
- **It moves from the previous cold results, never from the warm best.** The rule is **2-up-1-down** (Levitt), which tracks ≈ 70.7 % ≈ p*:
  - 2 consecutive clean cold takes → +1 step;
  - 1 miss → −1 step;
  - steps are 2 marks until the first reversal, then 1 mark;
  - **the learning rate R drives the step size (0.5–1.5 marks)**; the step size is re-fit later from the trace SD of the cold tempo.
- **Unpassed items:** the cold tempo = max(staircase, round(0.95 × target)) once `cleanBpm` ≥ 0.95 × target. That branch is the pass probe, and it stays. **After a pass-probe take, the staircase resets to the tempo actually played.**
- **Floor for passing:** a cold take below 0.95 × target can't pass (SP §4.2 unchanged).
- **Above target (passed items, anchors only):**
  - **the cold cap** = min(the item cap from SP §15.3, 1.25 × target). It is never the warm session `limit`;
  - **non-anchor passed items stop at target.** They are excluded from the plateau measure;
  - **a miss above target is censored:** no FSRS lapse, no confirmation miss, no drop. It only moves the staircase.
- **FSRS vs staircase:**
  - on an FSRS-due day, an item's cold take is the **review probe at 0.95–1.0 × target**, and it is graded into FSRS (§4.1). FSRS maintenance grades only this take at ≤ target;
  - the above-target staircase take is the next cold take on another day. It counts as a confirmation only when clean.
- **The threshold estimate is separate from the tempo choice:**
  - the **estimate** is a maximum-likelihood logistic fit over all cold trials from the last 30 days, at their actual tempos;
  - the first 2 reversals are discarded;
  - before 6 trials, the readers use the highest clean cold tempo, labelled **provisional**.
- **What reads the estimate:** Momentum "cold rise", the cold "record", SP G and R, the plateau measure (§6.2) and Phase B. SP A12 is amended: G reads the threshold estimate.
- **Fixed-tempo items have no staircase.** Their cold measure is accuracy (SP §15.2).

### 1.10 Rank, current form and display
- **The areas per instrument:**

| Instrument | Areas |
|---|---|
| Piano | scales, arpeggios, independence/finger, harmony/voicing, line-jazz, reading |
| Guitar | the same as piano |
| Bass | scales, arpeggios/chord tones, walking/groove, reading |
| Drums | rudiments, coordination, grooves/styles, reading |
| Voice | pitch, time, range/agility, harmony |

- **Rank stays sticky:** rank, course DYN and friend level read the **high-water confirmed tier**, which never falls. So rank = hardest items beaten holds (promotion-not-full-bars).
- **Current form:** the current cold level shows separately as "current form". It can show refresh, or a lower tier after demotion (§1.7).
- **Technique rank** = the 2nd-best instrument area's content level (high-water), so one narrow area can't carry it. With one area only, that area.
- **Course DYN** = the same value mapped T → DYN:

| T | DYN |
|---|---|
| T0–1 | pp |
| T2 | p |
| T3 | mp |
| T4 | mf |
| T5–6 | f |
| T7–8 | ff |

  This keeps the 6 names that exist. *(Owner may adjust.)*
- **Friend level** = the course DYN.
- **The bar to next** shows the promotion test's progress as a share, "confirmations toward the next tier", never "k of n". It is never full below Master.
- **Friend comparisons** show level and effort separately (§3).

### 1.11 Uncertainty, refresh and breaks (AM #8)
- **Level never falls from inactivity** (owner: a drop comes only from measurement, never from a break). This is consistent with promotion-not-full-bars and SP "passed stays passed".
- Each area level carries a Glicko-style deviation that grows with the time since the last cold evidence: +1 tier of range per 60 days without evidence, at most ± 2.
- Inactivity shows "refresh" and a wider range, and the planner raises a **refresh probe** when the range is wide: one cold check of the level tier. The probe is absorbed into need (§5).
- **One break table:**

| Break | Effect |
|---|---|
| ≥ 7 days | re-entry session (§5) and the demotion re-entry window (§1.7) |
| > 10 days | rate speed-ups paused |
| > 21 days | rate multipliers halfway back |

### 1.12 Input awareness (AM #12)
- `src` (the input) is stored on every take record, passLog entry, cold entry and rating event.
- A cold series never mixes inputs. A change of input starts a new series, and the old one is kept.
- **Level and rank read the current input's series.** Another input's higher level is shown as a note, e.g. "ff on MIDI".
- **Mic learners:** dynamics, pedal and release strands are excluded from their level and labelled "needs MIDI". They are never counted as missing.
- **Per-input jitter** widens timing thresholds by the measured noise only (SPEC-PRACTICE-INTELLIGENCE §9א).
- Guitar, bass and drum calibration logs upload for calibration accounts, like the piano traces (0.145.8).

### 1.13 The instrument Elo
- **It is kept only as a smooth "practice form" signal on the item page. Nothing reads it for level.**
- **Difficulty** = the item's content tier c (scales: the nps tier) mapped 600 + 100 · c, with the band term 40 × (band − c), clamped to ± 2 bands. The RL +60 is kept. The phrase formula is mapped onto the same scale. The 100 and 40 coefficients are fitted later by a logistic fit on the traces.
- **Score** follows the verdict: clean 1, almost 0.5, not 0. Timing is part of the verdict.
- **One rated event per item per 1-hour cold window** (not per session, because a restart can't create a new window). This applies to instrument areas only; Ear trials keep per-trial events. **Only cold events feed the instrument Elo.**
- Old events are refolded under the fresh-start epoch (§1.15).

### 1.14 The Ear course level and evidence routing (AM #4, a bug)
- **`courseRating('ear')`** reads only **`EAR_COURSE_SKILLS`** = EAR_SKILLS + theory, notes, rhythm-reading, transpose. It never reads `overallRating`.
- **SPEC-EAR-INTELLIGENCE governs the Ear level itself**; §1 applies to the instrument areas.
- **The `*-ear` instrument families** (`k-ear`, `g-ear`, `b-ear`, `d-ear`: intervals, dictation, transpose, tonic) are **whitelisted** into the Ear course skills, weighted by trial difficulty. They are real ear evidence.
- **Other drill and lick events never write Ear course skills.** Their secondary tags (`secondTag`: timing, meter, chords, cadences, form, dictation, rhythm-dictation) go to instrument sub-skills instead (e.g. `instrument/timing`).
- **Self-prediction (§7)** feeds its own skill, `self-calibration`, never the Ear rating.
- **Head-slice dictation and "tunes you know"** write to a `repertoire-memory` skill, never the Ear course skills (§13.5).
- **Guard tests:**
  - a non-`*-ear` drill take changes no Ear course skill, no Ear Index and no Ear path frontier;
  - a `k-ear` take does change the Ear course skills;
  - theory and exam-prep evidence still moves the Ear level.
- **The Elo of Ear skills still never decays;** this is deferred explicitly to SPEC-EAR-INTELLIGENCE.

### 1.15 Data model and migration
- **`RatingEvent` gains** `item` (item or contrast id), `src` (input) and `cold` (written at creation; refolds keep it).
- **New per-cell `lastSound`** (§1.4) and **`cellPass`** for voice and rhythm (§1.6).
- These are synced fields. **No users yet, so a fresh-start epoch** (memory: fresh-start-round) is the migration. It is done once, when §1 ships.

---

## 2. Quick fixes (H1 step 2)

| # | Fix | Where |
|---|---|---|
| Q1 | The Ear course level reads only the Ear course skills (§1.14) | courseSocial.ts:125 |
| Q2 | The stretch "push" band requires ≥ almost. A miss pays ×1 at most. | stretch.ts:101 |
| Q3 | "Record" XP and Momentum tempo records count only cold takes (reading the §1.9 estimate) | stretch.ts, momentum.ts |
| Q4 | **The plan bonus:** finishing today's planned rotation visits and their cold checks earns a Momentum `BONUS_XP` entry, once a day. It requires the session's planned length (`sessionBonus`); `WEEKLY_LIMIT.plan = 7`; its size is the smallest value that passes Q6. | momentum.ts (`BONUS_XP`), sessionReward.ts |
| Q5 | Quests come from today's plan, e.g. "Today's first-take check in your key of the week" or "The cold take of last week's key", instead of activity counts. The drum "rhythm 5×" quest counts drum takes, not rating events. | quests.ts |
| Q6 | **A simulation test, Momentum included:** a learner who follows the rotation earns ≥ the XP of a linear peak-chaser over 10 sessions; and the test fails a player who out-earns real practice with cold checks only. | tests |

Contour Draw (§13.2) and the physical-approach briefs (§15) also ship in step 2.

---

## 3. Rewards follow the plan, levels follow cold evidence (AM §6)
- **XP pays for effort spent as planned.** Clean and almost takes earn XP; misses earn the base only. Burst takes earn nothing (SP §18.1).
- **Level and rank** come only from §1.
- **Momentum pays for cold progress:**
  - a rise in the cold level;
  - a cold-confirmed close;
  - a due review passed cold.
- **Promotion XP and Momentum "cold rise" pay only above the all-time high-water mark.** Dropping and re-promoting earns nothing.
- `GAIN_WEIGHT.rating` reads the §1 level's rises. Momentum `statusUps` and `rating` read cold.
- **Leagues** stay effort-only (capped weekly XP). League XP never enters a level.
- **Friend comparisons** show level (§1) and effort separately.

---

## 4. Retention and spacing everywhere (AM #6, #7)

### 4.1 Technique maintenance
- **Every review take of a closed cell is a cold take** (SP §4). On an FSRS-due day it is the review probe at 0.95–1.0 × target (§1.9).
- **It is graded into FSRS:**
  - clean at ≥ 95 % → good;
  - almost → hard;
  - not → again (a lapse).
- A miss above target is censored and is never a lapse (§1.9).
- **`cellDue`** replays the cell's `cold[]` entries.
- **A cell's grade** is its HT item's grade (RH/LH are lead-ins). **A cell without an HT item** (one-hand levels, guitar, bass) is graded by its main item: the last spec.
- **A lapse** marks the cell "refresh": `passedAt` is kept and the next review comes sooner. **The lapse visual is distinct from stale:** a small "refresh" mark, not silver.
- **Later:** per-user FSRS weights fitted from these logs (shadow, then on).

### 4.2 Ear
SPEC-EAR-INTELLIGENCE E1 as specced:
- a guess floor;
- **every** encounter, correct ones included, feeds FSRS per contrast card;
- an RT-graded hard / good / easy;
- the 35-day and 80-item caps removed;
- contrast cards from the confusion map.

### 4.3 Games, voice, pieces
- **Games:** a tier not played cold for 60 days shows "refresh". Tiers stay open (no locks), and a refresh run counts as a cold check.
- **Voice:** each family's level is re-checked cold after 30 days, as one probe item.
- **Pieces:** a maintenance interval per learned piece (FSRS on the whole piece, graded by the chunk accuracy of its first run after a break). Learned tunes return this way with a new layer each time (§8.5).

---

## 5. One need model and fewer planners (AM #9)
- **The workout2 shares stay as quotas** (new / strengthen / review).
- **Readiness is a gate,** not a weight: prerequisites `established` (§1.6), not resting.
- **Inside a quota, `need(item)`** = a weighted sum of normalised components, each normalised to 0–1 over the candidate set:

| Component | Weight | Definition |
|---|---|---|
| Distance | 0.45 | the gap to the next tier at the cold level |
| Forgetting | 0.35 | from FSRS or the §1.11 deviation. **Unpassed items:** time since the last qualifying take ÷ the R-by-gap curve (this carries `back2`). |
| Goal | 0.2 | the learner's goal (§6.1) and the style focus. A recurring weekly-profile pattern adds to the goal weight of matching items; a low teacher rubric score (§12.1) adds to it too. |

- **New items** are ranked by goal, behind the readiness gate, so a new item can always be chosen.
- **It absorbs** SP `back2` and the refresh probe (§1.11).
- **The rotation set** fills in need order.
- **These read it:** workout2, todayPlan, the scheduler, the AI tilt and quests (Q5). The reason line quotes its largest factor: "due for review", "closest to your next level", "for your goal".
- **One "next" across screens:** Today, Path and Practice show the same top item when they show one.
- **Retired:**
  - `workout.ts`: the Extras entry routes to workout2;
  - `todaysItems`;
  - `recommend.ts`: only `recommendFor` folds into need. TOPICS, `placementUnlocks`, `topicProgress` and `modesLevelFor` stay.
- **Precedence, stated in the reason line:** teacher > key of the week > need.
- **After a break of ≥ 7 days,** the first session is a re-entry session: cold checks of the last week's items only, plus one new item. The plan grows again from those results.
- **Tendencies feed the next take:** a confirmed tendency (P1, ≥ 10 takes) chooses the next form in the rotation (e.g. rushing at the turn → a form that isolates the turn), within SP's rules.
- **Momentum slowdowns** become a line to the AI weekly plan.
- **Tune of the week** takes ~10 % of the technique block, capped at 5 minutes (§8.5).

---

## 6. Goals and plateaus (AM #14, AP §4)

### 6.1 Goals
- At onboarding, and anytime in settings, the learner sets:
  - **a goal tune or goal skill with a date**, e.g. "My Blue Heaven by June" (a served tune from the learner's region pool, §8.1), a target tier in an area, or an exam date in exam mode (optional);
  - **minutes per week.**
- **A goal tune is complete** when the memory step of the learner's band variant of learn-a-tune (§8.4) passes cold.
- **The projection** (projection.ts) reads the cold rate × the actual minutes, using the prior rate (SP §17.2) until G is estimated. It shows on Today as one line, "On track for June" or "2 weeks behind at this pace", and gives `need` its goal weight.

### 6.2 Plateaus
- **One definition, on the cold series:** the slope of the cold threshold estimate (§1.9, continuous, not tiers) over practice-hours is ≈ 0, with confidence: ≥ 6 cold points over ≥ 10 days.
  - Passed anchors count through their above-target staircase. Non-anchor passed items are excluded.
  - Fixed-tempo items use the accuracy rate instead.
- **The escalation, automatic and hands-free:**
  1. variation: feel, key, form (SP §16);
  2. bursts or a slow accuracy block (SP §15.4);
  3. rest of 3–5 days with spacing;
  4. a teacher flag, or for self-learners, a suggested listening model (§10).
- **It replaces `plateau.ts` only.** The coach's in-session limit and 3-day cooldown (SP §5) stay, and the SP burst trigger keeps its own short-term rule. **Precedence:** the in-session limit → the cooldown → the cold plateau escalation.
- **SP §15.4 / A9 wording** (already in SP v6): "no new clean session peak in 3 sessions on ≥ 2 days", in place of "no new cold best".

---

## 7. Self-assessment and transfer (AM #15, AP #9)
- **Self-prediction:** about once in 10 takes, before the take: "Will this be clean?", or after it: "Did you rush?". Calibration is tracked as a Brier score per area, and the result is shown monthly as a self-comparison.
  - **Input:** a MIDI key (low = no, high = yes) or a voice "yes/no" works as well as the tap, to stay hands-free.
  - The tap is the only exception to hands-free; the step is optional and can be turned off in settings.
  - It feeds its own skill, `self-calibration`, never the Ear rating (§1.14).
  - The §11.3 strategy choice uses this same slot.
- **The self-comparison line** (SP §17.5) runs in every area, at most weekly.
- **Transfer probes:** the **transfer index** per family = the clean share of first takes in an untried key, or on a new item of an acquired family, at the item's start tempo, over the last 10 such takes. It is shown to the teacher.

---

## 8. Real music (H1 step 4)

### 8.1 Rights and the region gate
- **Tiers:** every served melody, lyric and recording carries a tier: **1A** (public domain worldwide) or **1B** (US-only). `heads.ts` entries carry `tier` and `pdWorldwideFrom`.
- **`servable(content, region)` is the only path to playback or display.**
  - **The region signal** = the stricter of the account country and the store/IP country. **Unknown → 1A only.**
  - 1A content serves everywhere; 1B serves only in the US allow-list (STANDARDS_LEGAL).
  - **A rule with a guard test:** every real-music feature draws from the learner's region pool: learn-a-tune, capstones, tune of the week, head dictation, the level-test tune section, contrafact pairs, goals. The guard test walks every content consumer, including lyrics (§11.2), First-phrase recall, "tunes you know", EAR v2 songs-by-ear and sight-singing, recordings of 1B compositions, and the per-language folk songs.
  - **A verify / preview mode** lets the owner see 1B heads from Israel while checking them.
- **Denied regions keep "learn it by ear":** an embed, a chords-only chart, and a self or teacher check, with no melody served. (The by-ear mode is also offered everywhere, §8.4.)
- **Content served is the ≤ 1930 print's only,** with its print year and publisher recorded. Later verses and later lyrics are left out.
- **"Folk/trad" entries** get the same print-year and author check as heads (e.g. the Hava Nagila lyric credit).
- **A lyric curation pass** removes period lyrics that are offensive today. It applies to 1A songs too.
- **Lyrics:** only for songs published ≤ 1930, verified against the period sheet, used in voice items (§11.2).
- **The region-safe pool** (every region): the 1A heads plus the H4 items (songbook, voice-course songs, rule-generated licks, the 7 originals).

### 8.2 Real heads (AP #1)
- **About 20 heads, each transcribed and verified against a period sheet. 1A first.** The core and beginner heads come from STANDARDS_LEGAL §2.1, public domain worldwide. Each must be confirmed 1A and verified:
  - **beginner:** Bill Bailey, Ain't We Got Fun, Yes Sir That's My Baby, Somebody Stole My Gal, Nobody Knows You When You're Down and Out, spirituals, When the Saints;
  - **core:** Rose Room, Avalon, Japanese Sandman, Love Me or Leave Me, Mean to Me, My Blue Heaven, If I Could Be with You, King Porter Stomp, Charleston, Indiana.
- **1B (US-only)** is an additional layer on top for US users, e.g. Body and Soul, Star Dust, I Got Rhythm.
- **The US-PD candidate list, each to be checked and given its tier:** Indiana, Sweet Georgia Brown, Tea for Two, Honeysuckle Rose, Ain't Misbehavin', What Is This Thing Called Love, Softly as in a Morning Sunrise, Lover Come Back to Me, Star Dust, Body and Soul, I Got Rhythm, Embraceable You, But Not for Me, Georgia on My Mind, St. Louis Blues, Basin Street Blues, Bye Bye Blackbird, Blue Skies, Someone to Watch Over Me, 'S Wonderful. Mood Indigo (1930/31) is checked for its print year.
- **The workflow** is the `verify` flag in heads.ts: I transcribe, and the owner checks each note before the head is served (owner task, §17).
- **The legal note** in heads.ts changes from "PD worldwide" to "US PD (published ≤ 1930)", with the per-head tier.
- **Each head stores** an "as printed" melody, a jazz chart, and a reconciliation note. Swing comes from the feel layer (SP §16), not from rewriting the melody.
- **H4 filler:** the app-written heads, songbook originals, voice songs and lick bank are the region-safe filler (§0 H4). Each lick and original head records where it came from.

### 8.3 Chord charts
- **The chord charts grow to about 120 standards**, chords only, which is legal (AP §2.9). For the bebop tunes the chart is chords only; **the melodies of post-1930 heads are never served.**
- **Chart policy:**
  - every chart, the 120 and the pop ones, has a **source and a human verifier**, like heads;
  - chord charts are not copied from fake books or chord sites;
  - **a verify screen** shows the source scan beside the engraving;
  - the verification time is budgeted as an owner task (§17, §18 step 5).
- **"Harmony is the work" care** (§11.1) extends to post-bop and Shorter charts.

### 8.4 Learn a tune (AP #2)
- **One protocol per head, in all courses (band 2+):**
  1. listen: the YouTube embed of a recording first (H3), then the app's clean version;
  2. sing it (§16 syllable rule);
  3. play the melody;
  4. roots;
  5. guide tones;
  6. melody + shells (piano / guitar), or melody + roots / walking (bass), or melody over the band (voice, horn-style);
  7. **from memory**: the chart and melody hidden, graded on the same items, **cold, ≥ 8 h after step 6**. It creates a **pending memory check** that shows on Today and resumes there;
  8. in 2 more keys. **Voice:** "find your key" from voiceRange, then one more key;
  9. solo on it (§10.3).
- **Per band:**

| Band | Steps |
|---|---|
| 1 | listen (embed) → sing → melody → roots → melody + LH roots (bass: roots on 1) → triads → memory (cold) |
| 2+ | the full protocol above, with guide tones and shells gated on the k-sharm 7ths / shell families (guitar `g-shells`; bass walking) |

  - A step whose prerequisite isn't `established` is skipped, never locked.
  - **Goal completion** = the memory step of the learner's band variant (§6.1).
- **A by-ear mode** is offered everywhere: embed → sing → find → play, with the score hidden. It is not only the denied-region fallback.
- **Drums:** sing the head while keeping time, then kicks and set-ups from the head, then trading 4s inside the form.
- Each step is a fixed-tempo or laddered item per SP §15. Step 7 is the memory modifier (SP item 30), raised to H for tunes.
- **The score** shows in 4–8-bar windows with the playhead (one screen).
- **A harmonic map page per tune:** key areas, ii–V brackets, the turnaround, the form. It is shown before step 4 and hidden at step 7.
- **Contrafact pairs,** each shown only where both sides can be served; their chord charts (chords only) serve everywhere:
  - Hot House ↔ What Is This Thing Called Love;
  - Donna Lee ↔ Indiana;
  - Anthropology ↔ I Got Rhythm;
  - Scrapple from the Apple ↔ Honeysuckle Rose (Scrapple uses the I Got Rhythm bridge, so it is shown only where both of its sources can be served);
  - Dig ↔ Sweet Georgia Brown.

### 8.5 Tune of the week and revisits
- **Tune of the week in the key of the week** (RP N1): a served head in the SP key of the week, or a transposition. It gets ~10 % of the technique block, capped at 5 minutes.
- **Revisits:** a learned tune returns via piece FSRS (§4.3) with a new layer each time: reharm, solo, arrangement. This is the repertoire spiral.

### 8.6 Unit capstones (AP #3)
- Every path unit ends with a music step: a tune slice, a duet or a performance take using the unit's skills. It uses the `repItem` / `openRepWay` hooks.
- The capstone counts as the unit's last step, and is **skippable**, never a lock.
- **Capstone mapping:** a table per unit and theme in the path content, written with the capstones.
- **Ear capstones:** a short real-recording task per Ear unit (embed + annotation, §10.1).
- **A ballad capstone** on a 1A ballad.

### 8.7 Accompanying a singer or soloist (AP #4)
- **New family `k-accomp-voice`, and `g-accomp-voice` on guitar.** The levels:
  1. intro in the singer's key (the last 4 bars, or a I–vi–ii–V vamp);
  2. comping under a sung melody, keeping out of the melody's register (graded by register overlap);
  3. fills only at phrase ends (graded by note density inside sung phrases vs at their ends);
  4. following rubato: the comping must follow the singer. **The rubato comes only from human takes:** teacher recordings, calibration-account takes, the human model bank (§8.9), or a voice student's take via §12.3. Never an algorithmic rubato curve (no-claude-composed-music; the humanize layer was rejected). Labelled "teacher or recording needed" until the bank exists;
  5. transposing the chart at sight by ±2 semitones;
  6. endings with the singer's fermata.
- **Grading:** chord onsets against the singer's **beat map**, not the melody onsets. Comp velocity is graded below the melody. Register overlap stays.
- **Comp dynamics** are graded against the singer's phrase envelope, MIDI only, and mapped through the synth's rendered loudness. "Teacher or recording needed" until the bank exists.
- **Duet assignments:** a voice student's take is the melody track for a keys student, using SPEC-TEACHER-CLASS async layering (§12.3).
- **Responsive comping:** comping behind a soloist that answers phrase ends.

### 8.8 Idiomatic jazz ladders per instrument (AP #15)
- The k/g/b jazz ladders keep a shared spine, and gain instrument-specific levels:
  - **bass:** lines that carry the harmony alone, a duo with no comping;
  - **guitar:** slides, articulation, Freddie Green four-to-the-bar;
  - **piano:** comping while soloing;
  - **drums:** their idiom, form-keeping and set-ups.
- **Post-bop:** 3 tune-based levels (chords only). Prerequisites: the modal and slash-chord families.
- **Free improvisation:** 3 levels graded by variety metrics (dynamics/register only, a texture call-and-response, a rhythm-only solo).
- **Jazz-bridge links,** each tagged: Joplin → stride (`accomp`, `k-nola`); Debussy and Satie → planing and constant structure (`k-reharm`, `planing`).

### 8.9 The human model bank
- **An owner production task in steps 5 and 7:** recordings of 1A heads by real singers and players, several rubato and dynamic renditions each, with performer releases.
- **Until the bank exists,** each level that depends on it is labelled "teacher or recording needed". Those levels:
  - accompaniment L4;
  - comp dynamics against the singer;
  - expression model curves (§14);
  - diction models (§11.2);
  - drum "supporting a soloist" (PD lines, or rule-generated licks per H4, which is allowed).
- **Such a level** is skippable, never a gap in the bar to next, and never sampled by the level test.

---

## 9. Validation programme (AM #11)
1. **The synthetic-learner harness (part of step 1):** learners with known θ, learning rate, forgetting, warm-up decrement, fatigue and input noise. Every level rule (§1), planner (§5) and SP rule runs on them. The test passes when:
   - the level tracks θ_cold (bias and RMSE reported);
   - wrong promotions stay < 5 % (defined over the §1.7 indifference zone: true p ≤ 0.55, 6-month horizon of looks, averaged over the harness prior, under sequential looks);
   - wrong demotions stay < 5 %;
   - a steadily improving learner climbs from T0 to T5 on rotation alone (§1.3).
2. **The calibration-trace replay:** split-half and test-retest of the cold levels. A number appears on screen only when its reliability is ≥ 0.7 (levels) or ≥ 0.4 (rates). **This gate exempts Phase A** (a transparent count rule shown as such); it gates Phase B, the rates and any model number.
3. **Shadow mode:** the new levels are computed beside the old ones for 2–4 weeks of real users.
4. **The teacher agreement study** (SPEC-PRACTICE-INTELLIGENCE §3.5) before any absolute claim.
5. **Injection tests per input:** 0/8/15/25 ms shifts.
6. **Shadow learning rates** for Ear, rhythm and voice (A/G/R, with their cold definitions, §1.4) are logged from step 1 and never act until §9 validates them.
7. **Later A/B tests:**
   - rotation vs linear;
   - re-based rewards;
   - FSRS with lapses.

   The primary outcome is always a delayed cold measure.

---

## 10. Listening lab and transcription (H1 step 5, AP #5)

### 10.1 The lab
- **Prerequisite: an owner or teacher annotation tool** that marks form, choruses and changes on an embed's timeline.
- **Sources:**
  - a YouTube embed (H3), **official channels only** (artist, label, YouTube "Topic"), with the channel id stored in the embed registry;
  - the learner's own audio, on the device (My-song infra);
  - US-PD recordings (≤ 1925), shipped where verified, through the region gate (§8.1).
- **The player:** visible, at least 200×200, fitting one phone screen; youtube-nocookie with click-to-load; 78-rpm transfers for pre-1925 recordings. Loop and slow via the IFrame API's seekTo and setPlaybackRate. No audio extraction.
- Start with one recording per path theme. **Removed or region-blocked videos** fall back to the next annotated recording.
- **Tasks:**
  - track the form (tap at each chorus);
  - count choruses;
  - name the soloist's instrument;
  - tap the changes;
  - "listen for": one prompt per path unit, e.g. "the walking bass on beats 1–4", "the ii–V in bar 5".
- **Embed tasks are graded by taps against a timeline the teacher or the app marks.** The app does not analyse the embedded audio (H3: no extraction).
- **A listening canon** per instrument and era, using US-PD sides where verified: Armstrong Hot Five (Nov 1925; see the release-date lawyer question, §17), King Oliver 1923, Jelly Roll Morton 1923–24, James P. Johnson (to check).

### 10.2 Guided transcription (own audio only)
- **The steps:**
  1. loop a bar;
  2. slow it down (time-stretch on the device);
  3. sing it (§16 syllable rule);
  4. find it on the instrument;
  5. write it (staff dictation input);
  6. play along at full speed.
- Uses the existing My-song stems and transcription infra.
- **Bass:** learn a real line by ear from the learner's own copy.

### 10.3 Improvisation story ladder (AP #8)
- **The ladder:**
  1. paraphrase the head;
  2. one motif per chorus;
  3. sequence it;
  4. displace it;
  5. answer it;
  6. build an arc (density and register rising, e.g. to bar 25 of 32).
- **Arc grading:** "a clear peak in the last third, then a release". Descriptive feedback, not pass/fail, until teacher agreement (§9.4).
- The analysis exists (`improvPhrasing`). This promotes SP item 31 from L to H, and adds the paraphrase step for all instruments, which needs §8.2.
- **Sing what you play:** a 2-bar phrase sung, then played (hear → sing → play), with the §16 syllable rule.

---

## 11. Pop chord library, voice, how to practise, composition (H1 step 5)

### 11.1 Pop chord library (AP #6; owner 2026-11-27)
- **Global and jazz-adjacent, not Israeli-focused.** The app is multilingual, so the library draws from global top-chart pop that is harmonically rich: extended chords, ii–V motion, modal interchange and sophisticated grooves.
  - Examples of the kind of artists, to be curated: Stevie Wonder, Steely Dan, Burt Bacharach, Michael Jackson / Quincy Jones productions, Earth Wind & Fire, Jamiroquai, Norah Jones, John Mayer, Bruno Mars, Jacob Collier.
- **Each entry has:** a title (named exactly, e.g. Billy Joel's "Just the Way You Are"), key, changes, form and an original-recording link (official-channel embed). **No lyrics, no melody.**
- **Chord symbols at lead-sheet level only,** with no voicings.
- **The riff guard** (no signature riffs or bass lines) extends to pop: e.g. Superstition, Jamiroquai bass lines.
- **Artists whose harmony itself is the work** (Collier, Steely Dan) get extra care: few songs, chords only, and the lawyer question (§17).
- **A source and a human verifier for every chart** (§8.3).
- **Each entry names the jazz concept it bridges to,** e.g. I–vi–IV–V → I–vi–ii–V, the ii–V in "Just the Way You Are", modal interchange in Stevie Wonder.
- **Pop charts** show a bar grid with sections synced to the embed.
- **`k-pop` grows to about 15 levels:**
  - inversions for smooth changes;
  - slash chords and pedal bass;
  - add9 / sus;
  - ballad arpeggiation;
  - "4 chords in every key";
  - Nashville numbers;
  - playing from a chart against the original;
  - comping patterns and anticipations.
- **The guitar version:** capo, open-string colours, DADGAD.
- **Collecting societies:** there are no Israeli songs, so the ACUM note no longer blocks anything. The general question "do collecting societies claim chord charts" is asked once, before charging (§17).

### 11.2 Voice (AP #7)
- **Registration:**
  - a guided family with SOVT warm-ups (straw, lip trill);
  - measurable proxies: pitch steadiness across the passaggio, and a **register-break** detector (pitch discontinuity + level dip), **hint-only** until validated against teacher labels;
  - **belting is teacher-assigned only;**
  - name-only coaching where nothing is measurable;
  - the framework terms are checked with a voice teacher before release (owner task, §17).
- **Vowels:** hold a pitch while changing the vowel, graded on pitch steadiness and transition smoothness, with a level tolerance per vowel (no "no level change").
- **Level-based voice proxies** need AGC off and per-device relative levels.
- **Text and interpretation,** with PD lyrics (§8.1):
  - mark the breaths;
  - sing with the planned breaths;
  - phrase-end release timing;
  - **back-phrasing:** a deliberately late start + the target note landing on time. Descriptive until validated against teacher labels.
- **PD lyrics in each of the 7 voice languages** (PD folk songs per language, through the folk/trad check, §8.1).
- **Diction:** diction and consonant timing on the beat; diction help for every non-native English singer, with a teacher or human audio model ("teacher or recording needed" until the bank, §8.9).
- **Mic technique:** a brief + a proximity/dynamics exercise.
- **Vocal health:** a short mandatory card, and a session-length guard for long sung sessions (a break suggested after 20 minutes of singing).
- **The singer leads the band:**
  - count-off accuracy against the requested tempo;
  - calling the key;
  - cueing the tag.

### 11.3 How to practise (AP #9)
- **A 6-card micro-course:**
  1. find the exact error spot;
  2. slow and correct;
  3. vary the tempo;
  4. chunk;
  5. interleave;
  6. record and evaluate.
- **The coach sometimes lets the player choose the strategy**, about once a week, using the §7 slot (no extra tap). The choice ("slow" / "chunk" / "vary tempo") is then applied, and its effect on the next cold take is shown, aggregated over ≥ 5 uses.
- The strategy is also taught just in time at a detected error.
- **A self-rating step before feedback** is §7.

### 11.4 Composition (AP #11)
- **Contrafact capstone:** write a head over a chart's changes (a PD tune or the blues), then play it.
  - The line is played in (phrase studio) and notated automatically, 8 bars per screen.
  - Feedback, not pass/fail, on guide tones, repetition/form, rhythm and range.
  - Models come from teachers or PD only.
  - Saved to "My recordings".
- **Write a 12-bar blues head.**
- **Voice:** set a 4-bar phrase to words.
- **Trio arranging (`k-arrange`):** a chart road map (intro, head, solos, out-head, ending) used by keys, bass and drums together.

---

## 12. Teacher and ensemble (AP #12, AP §2.15)

### 12.1 Teacher rubrics
- A 4-point scale per quality the app can't measure: tone, phrasing, interpretation, registration (and posture/tension, §1.1).
- Each rubric is tied to the saved take.
- The student self-rates first, then sees the teacher's rating.
- A low score adds to the goal weight in need (§5).

### 12.2 The teacher as the model
- **The flow:** the teacher records a phrase, the student imitates it, and the two are compared.
- It is a first-class assignment type on every instrument (Encore capture exists).

### 12.3 Async ensemble
- In a studio, one student's take (bass, or a sung melody) becomes the backing track for another's. This is the latency-safe way to "play with others".
- **Grading:** the first take has a click and a calibrated round trip; later takes are graded against the first take's beat map.

### 12.4 Ensemble, performance and lesson plans
- **An ensemble-roles unit:** bass = harmony and time, drums = form, comping = space. Role-swap listening.
- **Performance ritual:** announce → one take, no restarts → listen back with one question (time / sound / shape) → self-rate → compare with the teacher. It resumes after a reload (never-lose-progress), and a reload does not count as a restart.
- **Lesson-plan templates:** a learn-a-tune week, a transcription week.

---

## 13. Curriculum flow and area additions (AP §4, #15)

### 13.1 Flow
- **The bin families get the flow audit:** voicings, k-reharm, jazz, accomp, g-scales (curriculum-flow rule). Each is split into 2–3 coherent ladders, or given explicit cross-family prerequisites in place of in-family order.
- **A "use it" step for advanced theory topics:** each one (negative harmony, twelve-tone, neo-Riemannian…) gets at least one instrument or composition step, tagged.
- **A tune suggestion at each section boundary:** passing "developing" on an instrument course suggests one real tune (from the region pool), learned to the memory step. It is skippable, never a lock.
- **The level test and skill map get a tune section per course:** an opt-in "tunes I know" pick, and a chart at sight. It is never "from memory" for new users, and never samples a "teacher or recording needed" level (§8.9).

### 13.2 Games
- **Contour Draw:** fills the open beginner Ear gap (beginner-game-gap memory): trace a tune's shape. **Ships early, in step 2,** with generated 4–6-note contours from the existing Ear melody generator (random stimulus generation, not composition). Head slices join in step 5, under §13.5.
- **First-phrase recall:** title → play the first 4 bars of a learned head.
- **Groove Match:** drums, copy a 2-bar groove, scored per limb ("needs MIDI", §13.6).
- **A pitch-steered line game** for voice, in the serious visual style.

### 13.3 Reading
- **A jazz reading ladder:** written 8ths played straight vs swung; articulation marks; big-band kicks and set-ups.
- **A gig sight-read capstone:** lead sheet + road map.
- **The transposing-instruments ladder is deferred** until a horn audience exists.

### 13.4 Rhythm
- Deliberately behind or ahead of the beat on keys and guitar comping (b-swing levels 2–3 copied).
- **The swing band (SP §16.9) applies app-wide,** not only on key-session lines, with tolerances per tier.

### 13.5 Ear
- **Line-implication ear:** name the chord a line implies.
- **"Tunes you know" is audiation:** from the title, sing or play the first phrase (and its starting degree), graded by pitch.
- **Dictation of 2-bar slices of served heads.**
- **Ballad / rubato harmonic rhythm.**
- **EAR v2's songs-by-ear and sight-singing** draw from served heads (through `servable`, §8.1).
- **No memorizable Ear evidence:**
  - head dictation, sight-singing and Contour Draw use heads the learner hasn't learned, as random slices, transposed;
  - head-slice dictation and "tunes you know" write to the `repertoire-memory` skill, never the Ear course skills;
  - head dictation is capped at 20 % of dictation trials. Generated items are the measured core;
  - when the learner's unlearned-head pool is < 5, head-slice items step aside.

### 13.6 Drums
- **Balance:** ride above snare comping, kick under the bass, by per-pad velocity ratios.
- **Supporting a soloist:** density follows the soloist, using the lick bank's lines (PD, teacher, or rule-generated per H4), never Claude-composed. "Teacher or recording needed" until the bank (§8.9).
- **Melodic soloing:** a motif on the toms, developed and returned, using the `improvPhrasing` analysis; graded by motif matching on pad and rhythm.
- **A tuning brief** (not graded).
- **Balance, Groove Match and singing while drumming are "needs MIDI".** On an acoustic kit they get a self or teacher rating.
- Drums join learn-a-tune (§8.4) and the idiomatic ladders (§8.8).

### 13.7 Voice additions
See §11.2 (diction, mic technique, English diction, PD lyrics per language).

---

## 14. Expression (AP #14)
- **A style-interpretation brief** per period on PD pieces, presented as "a common starting choice" and graded on the instruction given:
  - Baroque: detached 8ths, terraced dynamics;
  - Classical: slurred pairs, Alberti balance;
  - Romantic: rubato, pedal;
  - jazz: accented upbeats, ghosted notes.
- Graded by measurable proxies: articulation length and the dynamics contour. **Articulation and pedal grading are MIDI only.**
- **Expressive-contour feedback:** the player's velocity and timing curve drawn over the model's, for ballads, PD pieces and voice phrases. **Model curves come from human takes only** ("teacher or recording needed" until the bank, §8.9).
- **PD repertoire per instrument** (AP #13):
  - piano: Joplin, Satie, early Debussy, Burgmüller, Czerny, the Anna Magdalena notebook, Schumann Op. 68;
  - guitar: Sor, Carcassi, Giuliani;
  - voice: Vaccai, Concone;
  - bass: Simandl, Bach.
- **Each piece:** published ≤ 1930, generated from verified notes. Never a scan of a modern edition.

---

## 15. Physical approach and injury prevention
- **A short brief per instrument,** shown once: posture, relaxed release, and a stop-on-pain rule.
- **A refresher** on the first burst and leap visits.
- **A 1-minute release break** is offered after ~25 minutes of continuous technique in a time-first session (hands-free: it starts by itself, and any note resumes).
- **A drums hearing card** for acoustic kits.
- All of these are briefs, not grading. They ship in step 2.

---

## 16. Integration (every item above)
- **SP §18 applies:**
  - everything connects;
  - path glyphs;
  - rubato-then-tempo;
  - timing cue;
  - one screen;
  - i18n;
  - teacher assignable;
  - hands-free (the §7 tap is the one optional exception);
  - only verified theory;
  - all 12 keys where it applies;
  - guitar/bass parity;
  - small hands;
  - no movable do.
- **The syllable rule:** every sung step (learn-a-tune, transcription, sing-what-you-play and the rest) uses a neutral syllable, degree numbers or letters. No movable do.
- **No memorizable items** (§13.5).
- **Course change checklist:** openers, unit openers, skill map, the level test per area.
- **No locks.** No change notices before real users.

---

## 17. Open questions and owner tasks

### 17.1 Lawyer questions (before charging money)
- The rule of the shorter term (serving 1B content and the region gate).
- **Songs whose composer died by 1955 but whose lyricist died later** (Tea for Two, Honeysuckle Rose, Ain't Misbehavin'): may a melody-only use serve them? The EU joins the two terms for songs with words, and Israel is unclear.
- **US recordings become PD from their release date:** the Hot Five sides recorded in Nov 1925 but released in 1926 are PD only from 2027.
- **A PD recording of a 1B composition** needs the same region gate.
- Mexico and other long-term countries.
- Whether collecting societies claim chord charts (asked once, generally).
- "Harmony is the work" artists (Collier, Steely Dan; and post-bop / Shorter charts).

### 17.2 Items to check
- Each 1A head confirmed 1A and verified; each candidate head given its tier; Mood Indigo's print year; James P. Johnson's sides; folk/trad print years and authors (e.g. the Hava Nagila lyric credit); any lick whose rule origin is unclear (flagged for the owner).

### 17.3 Owner tasks
- Note-by-note verification of every head (the `verify` flag) and every chart (the verify screen); the verification time is budgeted.
- Annotation of embeds (owner or teacher, with the annotation tool).
- The human model bank (§8.9), steps 5 and 7, with performer releases.
- The voice-registration framework terms checked with a voice teacher before release.
- Owner may adjust the T → DYN mapping (§1.10).

---

## 18. Order of work
1. **Level semantics, built with SP step 1 (cold takes, pass rule):**
   - §1.1–§1.6 and §1.12–§1.14: definition, `contentTier` per spec / option, `areaTier` {content, band}, the content-based entry gate and the climb test, cold flags with the ≥ 1 h any-sounding-take gap (`lastSound`), first-cold-take-per-session, cross-device downgrade, `cellPass`, `established`, input series, the Elo as practice form, the Ear course skills and `*-ear` routing;
   - §1.7 the Phase A sliding-window test and its §9.1 harness (indifference-zone target, 6-month horizon);
   - §1.9 the staircase and the ML threshold estimate;
   - §1.10 high-water rank and current form; §1.11 the re-entry window;
   - §1.15 the M4 event fields and the fresh-start epoch;
   - guard tests for every warm-peak reader (§1.5) and the Ear guard tests (§1.14).
2. **§2 quick fixes and §3 reward re-base:** Q4 at its Momentum location with the reward limits (high-water mark, `sessionBonus`, `WEEKLY_LIMIT.plan`), Q6 with Momentum; Contour Draw (generated, §13.2); the physical-approach briefs (§15).
3. **SP §2 rotation** (and the rest of SP in its own order).
4. **§4 retention:** technique lapses, Ear E1, games / voice / pieces.
5. **§8 real music.** It starts with:
   - the 1A list and its verification;
   - the region pool, `servable()` and its guard test;
   - the official-channel embed registry;
   - the annotation tool;
   - the verify screen;
   - the chart / head policy;
   - the folk-song checks;
   - the owner's verification time and the human model bank, budgeted as owner tasks.

   Then: heads (owner verifies), learn-a-tune, capstones, accompanying a singer.
6. **§5 need model and planner retirement; §6 goals and plateaus.**
7. **§10–§11 and §13:** lab, transcription, story ladder, pop library, voice, how to practise, composition; the drums, games, reading, rhythm, ear and voice items of §13; the human model bank (owner task) continues.
8. **§12–§14:** teacher rubrics, ensemble, flow audit, expression, PD repertoire.
9. **§1.8 Phase B, §1.11, §7, §9** validation steps as their data arrives.

Each step gets:
- simulations;
- an independent build review;
- the §16 checklist.

**Done when:** an independent spec-only round finds no new blocker in this spec (and the SP §15.4 edit) before step 1 starts.

---

## Appendix A. Traceability

Every amendment item of v4 §17–§19 and where it now lives. "Struck" items are superseded and appear only in their final form.

### A.1 v2 (§17)

| Item | Content | v5 section |
|---|---|---|
| B1 | `contentTier`, seeding, guard test, `tierBounds` = band, lexicographic ordering, reading complexity | §1.2 (location per 18.4) |
| B2 | Phase A evidence, confirmation, start-tempo rule, exclusions, "placed, to confirm" | §1.6, §1.7 (window/selection replaced per 19.1-a, 19.1-b; ≥ 2 keys kept in §1.6) |
| B3 | `EAR_COURSE_SKILLS`, secondary tags to sub-skills, guard tests, EAR-INTELLIGENCE governs | §1.14 (guard test per 18.5) |
| B4 | cold staircase from previous cold result, pass floor, readers, first check uses SP §2.5 | §1.9 (rule per 18.1; maintenance sentence struck per 19.1-e) |
| M1 | no decay from inactivity; refresh; two-fail demotion | §1.7, §1.11, §0 "Breaks" |
| M2 | `areaTier` replaces `playerTier` / A8 / level; placement until confirmed; tolerances | §1.3 |
| M3 | technique rank 2nd-best; DYN; friend level; bar to next | §1.10 (DYN table per 18.6; high-water per 19.1-f) |
| M4 | `RatingEvent` item/src/cold; fresh-start epoch | §1.4, §1.15 |
| M5 | one rated event per item per 1-h window | §1.13 (scope per 18.7) |
| M6 | need quotas, weighted sum, new items, absorbs back2/probe, rotation order, recommend.ts, one "next" | §5 (weights per 18.8) |
| M7 | current input's series; note for other input; mic strands "needs MIDI" | §1.12 |
| M8 | plateau slope on continuous cold measure; fixed-tempo accuracy | §6.2 (reads the 19.1 estimate) |
| M9 | plateau replaces plateau.ts only; precedence | §6.2 |
| Q1 | Ear course level | §2, §1.14 |
| Q2 | stretch push ≥ almost | §2 |
| Q3 | cold-only records | §2, §3 |
| Q4 | plan bonus (location 17.3-c; limits 18.7-d) | §2 |
| Q5 | quests from plan; drum quest | §2 |
| Q6 | simulation incl. cold-checks-only and Momentum | §2 |
| 17.3-a | cold readers added | §1.5 |
| 17.3-b | Elo units, refold | §1.13 |
| 17.3-c | Q4 location (Momentum `BONUS_XP`, once a day) | §2 Q4 |
| 17.3-d | Q6 extended | §2 Q6 |
| 17.3-e | lapses: `cellDue`, HT grade, refresh mark not silver | §4.1 |
| 17.3-f | signals feeding need (profile, rubric, jitter, slowdowns) | §5, §1.12 |
| 17.3-g | self-comparison line in every area | §7 |
| 17.3-h | break table | §1.11 |
| 17.3-i | §9.2 gate exempts Phase A | §1.7, §9 |
| 17.3-j | shadow learning rates Ear/rhythm/voice | §9 item 6 |
| 17.3-k | transfer index | §7 |
| 17.3-l | self-prediction MIDI/voice input (Ear-rating feed struck per 18.5) | §7 |
| 17.3-m | goal tune complete = step 7 cold | §6.1 (band variant per 19.2-b) |
| 17.3-n | projection prior rate | §6.1 |
| 17.3-o | SP §15.4 edit | §6.2 |
| 17.4-a | region tiers, verify mode, lawyer, print content, lyric curation | §8.1, §17.1 ("unknown → deny 1B" restated per 19.2-d) |
| 17.4-b | beginner heads list | struck per 19.1-l; replaced by 18.9-a list in §8.2; Mood Indigo check kept in §8.2 |
| 17.4-c | head stores as printed / chart / note | §8.2 |
| 17.4-d | learn-a-tune: embed first, step 7 cold ≥ 8 h, voice keys, 4–8-bar windows, syllables, drums, revisits | §8.4, §8.5, §16 |
| 17.4-e | contrafact pairs added | §8.4 |
| 17.4-f | accompanying: human rubato, beat-map grading | §8.7 |
| 17.4-g | listening lab: annotation tool, one per theme, fallback, official channels, IFrame loop/slow, canon | §10.1 |
| 17.4-h | chart policy, ACUM, verify screen, owner time | §8.3, §11.1 (ACUM per 17.7), §17.3 |
| 17.4-i | pop charts bar grid; comping patterns | §11.1 |
| 17.4-j | grading measures: vowels, register break, back-phrasing, arc, composition, async, expression | §11.2, §10.3, §11.4, §12.3, §14 |
| 17.4-k | strategy choice in §7 slot, ≥ 5 uses, just in time | §11.3 |
| 17.4-l | capstones and tune suggestion skippable | §8.6, §13.1 |
| 17.4-m | §8.2 reference fixed to §10.3 | §8.4 step 9 |
| 17.5-a | drums: balance, soloist, toms, tuning, joins §8.2/§8.5 | §13.6, §8.4, §8.8 |
| 17.5-b | games: Contour Draw, First-phrase recall, Groove Match, voice line game | §13.2 |
| 17.5-c | reading: jazz ladder, gig capstone, transposing ladder | §13.3 (transposing deferred per 18.10) |
| 17.5-d | rhythm: behind/ahead; swing band app-wide | §13.4 |
| 17.5-e | ear: line-implication, tunes you know, head dictation, rubato harmonic rhythm, EAR v2 | §13.5 |
| 17.5-f | voice: diction, mic technique, English diction | §11.2 |
| 17.5-g | performance ritual | §12.4 |
| 17.5-h | ensemble-roles unit | §12.4 |
| 17.5-i | responsive comping | §8.7 |
| 17.5-j | free improvisation | §8.8 |
| 17.5-k | post-bop | §8.8 |
| 17.5-l | lesson-plan templates | §12.4 |
| 17.5-m | tune of the week in key of the week | §8.5 |
| 17.5-n | level test / skill map tune section | §13.1 (opt-in per 18.10) |
| 17.5-o | goal example served tune | §6.1 (example per 18.9-d) |
| 17.6 | order of work amended (steps 1, 2, 5, 7; done-when) | §18 |
| 17.7 | pop library global, jazz-adjacent; legal pattern; jazz bridge; ACUM no longer blocks | §0, §11.1, §17.1 |

### A.2 v3 (§18)

| Item | Content | v5 section |
|---|---|---|
| 18.1-a | unpassed pass-probe branch | §1.9 |
| 18.1-b | 2-up-1-down, step sizes, re-fit | §1.9 |
| 18.1-c | above target: cold cap, non-anchors stop, censored miss, FSRS at ≤ target | §1.9, §4.1 |
| 18.1-d | threshold = mean of last 4 reversals | struck per 19.1-d (ML fit); "G reads the estimate" kept in §1.9 |
| 18.1-e | key-session cold check replaced | §1.9 |
| 18.1-f | fixed-tempo items no staircase | §1.9 |
| 18.2 | `areaTier` {content, band}; readers | §1.3 (SP §15.5 entry moved to content per 19.1-c) |
| 18.3-a | SPRT promotion + ≥ 2 days | §1.7 (window per 19.1-a; SPRT parameters kept) |
| 18.3-b | demotion, hysteresis | §1.7 |
| 18.3-c | 60-day clause deleted | §1.7 (staleness "refresh" only) |
| 18.3-d | harness part of step 1 | §9 item 1, §18 step 1 |
| 18.4-a | `contentTier` on spec / option | §1.2 |
| 18.4-b | scales / arpeggios content = nps tier | §1.2 |
| 18.4-c | reading features normalised | §1.2 |
| 18.5-a | `*-ear` whitelist | §1.14 |
| 18.5-b | other secondary tags to sub-skills | §1.14 |
| 18.5-c | self-prediction → `self-calibration` | §1.14, §7 |
| 18.5-d | guard test revised | §1.14 |
| 18.5-e | Ear Elo decay deferred | §1.14 |
| 18.6-a | areas per instrument | §1.10 |
| 18.6-b | rank = 2nd-best area | §1.10 |
| 18.6-c | T → DYN table | §1.10 |
| 18.6-d | bar to next as share | §1.10 |
| 18.7-a | cold gap: any sounding take in cell; `sessionMs` | §1.4 |
| 18.7-b | rewards above high-water mark | §3 |
| 18.7-c | stricter calibrated input | struck per 19.1-i; §1.12 |
| 18.7-d | Q4 limits | §2 Q4 |
| 18.7-e | cross-device sync downgrade | §1.4 |
| 18.7-f | M5 scope instrument only; Ear per trial; cold-only Elo | §1.13 |
| 18.8-a | Elo practice form only; difficulty mapping; coefficients | §1.13 |
| 18.8-b | readiness gate; weights 0.45/0.35/0.2; unpassed forgetting; normalisation | §5 |
| 18.8-c | cell without HT item | §4.1 |
| 18.8-d | voice / rhythm per-item cold store | §1.6 (as `cellPass`, per 19.1-g) |
| 18.8-e | drum quest; `GAIN_WEIGHT.rating` | §2 Q5, §3 |
| 18.8-f | tone/posture/tension not measured | §1.1, §12.1 |
| 18.8-g | tendencies feed next take | §5 |
| 18.8-h | Ear cold rule defers to EAR-INTELLIGENCE | §1.4 |
| 18.9-a | 1A first; beginner and core lists | §8.2 |
| 18.9-b | 1B layer | §8.2 |
| 18.9-c | region pool rule + guard test | §8.1 |
| 18.9-d | examples 1A (goal; contrafacts only where both servable) | §6.1, §8.4 |
| 18.9-e | denied regions learn by ear | §8.1 |
| 18.9-f | lawyer question widened | §17.1 |
| 18.9-g | lyric curation for 1A | §8.1 |
| 18.9-h | H4 open, filler, provenance | §0 H4 (answered per 18.12), §8.2 |
| 18.10-a | back-phrasing | §11.2 |
| 18.10-b | comp dynamics vs phrase envelope, MIDI only | §8.7 |
| 18.10-c | drums "needs MIDI"; tom motif matching | §13.6 |
| 18.10-d | no memorizable items; level-test tune section opt-in | §13.5, §13.1 |
| 18.10-e | syllable rule to integration | §16 |
| 18.10-f | "unknown region → US" struck | §8.1 (unknown → 1A only) |
| 18.10-g | Scrapple note | §8.4 |
| 18.10-h | pop: lead-sheet symbols, riff guard, extra care, exact names | §11.1 |
| 18.10-i | SP fit: tune-of-week share, swing tolerances per tier, step 5 registry/1A, Contour Draw step 2 | §5, §8.5, §13.4, §18 |
| 18.10-j | fresh items: PD lyrics 7 languages + diction | §11.2 |
| 18.10-k | Ear capstones | §8.6 |
| 18.10-l | jazz-bridge links | §8.8 |
| 18.10-m | ballad capstone | §8.6 |
| 18.10-n | performance ritual resumes | §12.4 |
| 18.10-o | post-bop prerequisites | §8.8 |
| 18.10-p | transposing ladder deferred | §13.3 |
| 18.10-q | pending memory check | §8.4 step 7 |
| 18.11 | order of work (steps 1, 2, 5) | §18 |
| 18.12 | H4 answered | §0 H4, §8.1, §8.2 |

### A.3 v4 (§19)

| Item | Content | v5 section |
|---|---|---|
| 19.1-a | sliding-window LLR, ≥ 2 days, indifference-zone target; replaces ≤ 6 window | §1.7, §9 |
| 19.1-b | confirmations not selected on success | §1.6 |
| 19.1-c | entry gate; confirmed band; climb test | §1.3, §9 |
| 19.1-d | threshold estimation separate (ML fit, provisional, reset, discard 2 reversals) | §1.9 |
| 19.1-e | FSRS vs staircase; B4 maintenance sentence deleted | §1.9, §4.1 |
| 19.1-f | sticky high-water rank; current form; re-entry window | §1.10, §1.7, §1.11 |
| 19.1-g | areas without `passedAt`: reading, `cellPass`, games excluded | §1.6, §1.2 |
| 19.1-h | `acquired` vs `established` | §1.6, §1.5, §5 |
| 19.1-i | `lastSound` gap timestamp | §1.4 |
| 19.1-j | first cold take per session counts toward level | §1.4 |
| 19.1-k | input rule: current input; "stricter calibrated" struck | §1.12 |
| 19.1-l | voice cold per item; per-session rule struck | §1.4 |
| 19.1-m | SP §17.3 cold-check row deleted; R drives step size | §1.9 |
| 19.1-n | stale text superseded (technique row, 60-day clause, §5 product formula, 17.4 beginner list, §8.1 region default) | removed: §1.2, §1.7, §5, §8.2, §8.1 |
| 19.2-a | Contour Draw generated, step 2; head slices step 5 | §13.2, §18 |
| 19.2-b | learn-a-tune per band; skip not lock; goal = band memory step; by-ear mode | §8.4, §6.1 |
| 19.2-c | human model bank; dependent levels labelled; skippable, not in bar or level test | §8.9, §8.7, §11.2, §13.6, §14, §13.1 |
| 19.2-d | region gate on content: tiers, `servable()`, guard test, folk/trad check, region signal | §8.1 |
| 19.2-e | no memorizable Ear evidence: `repertoire-memory`, 20 % cap, pool < 5, audiation | §13.5, §1.14 |
| 19.2-f | physical approach briefs | §15 |
| 19.2-g | minor: YouTube player | §10.1 |
| 19.2-h | minor: lawyer list adds Mexico etc. | §17.1 |
| 19.2-i | minor: "harmony is the work" to post-bop / Shorter | §8.3, §17.1 |
| 19.2-j | minor: capstone mapping table | §8.6 |
| 19.2-k | minor: voice proxies AGC off, per-device levels | §11.2 |
| 19.2-l | minor: comp dynamics via synth rendered loudness | §8.7 |
| 19.3 | order of work (steps 1, 2, 5) | §18 |
| §20 | consolidation | this document |

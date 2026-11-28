# Holistic round 2: one level, honest rewards, real music (v16, 2026-11-28)

This spec implements the two whole-app audits of 2026-11-27:
- docs/AUDIT-HOLISTIC-MEASUREMENT.md (AM);
- docs/AUDIT-HOLISTIC-PEDAGOGY.md (AP);

and the review rounds that followed (round 1: RP / RM; round 2: RP2 / RM2; round 3; round 4; round 5: RM5 / RP5; round 6: RM6 / RP6; round 7; round 8: RM8 / RP8; rounds 9–17).

It sits beside docs/SPEC-SPIRAL-PRACTICE.md (SP, v6). Where they overlap, this spec says which one governs. It governs SP §4 and SP §17 where they touch level, and the SP sections listed in §1.16. SP §22 points here.

v13 consolidates the binding content changes of rounds 11–16 (v12 §19–§24) into the v12 body, keeping v12's section numbers, and enters the owner decisions taken on the measurement-harness results: **H9** (the item pass = variant V1), the harness decisions on rank, placement and the planner (§1.3, §1.7), and **H10** (challenge keeps rising even when rank does not, §1.7a). The measurement rules of §1 are now validated by a simulation harness (src/engine/measure/sim, tests/measureSim.test.ts; reports docs/MEASURE-SIM-REPORT.txt and docs/MEASURE-VARIANTS-REPORT.txt), which is the reference implementation of §1 (§9.1). Where the spec had been silent, the harness's stated assumptions are adopted as clarifications (§1.3, §1.6, §1.7). Superseded text is removed: the single-pair item pass, the "min(3, available)" rank that let one exercise rank a 1-exercise tier, the posterior and 20-offered-day non-tempo placement correction, the recording tests (b) and (c), "a new key at sight", the earlier "tunes you know" phrasings, and Groove Match as level evidence. Earlier consolidations (v8–v12: rounds 4–10, owner decisions H5–H8) are mapped in Appendix A; A.12 maps rounds 11–16 and the harness decisions.

v14 enters the round 17 measurement review (docs/REVIEW-HOLISTIC-round17-measurement.md) and the owner decisions of 2026-11-28 taken on its harness results: **H11** (the rank tier guard G is the rank rule), **H12** (current form stays cautious at ρ_c 0.20) and **H13** (H10 in full: readiness entry, challenge point and no-easier planner, with the shared slot supply and FSRS-review looks). It defines the H10 working edge, the readiness rule and the challenge point exactly (§1.7a), adds the stationary-learner honesty target (§9.1), and states calibration against the tier estimand honestly. Every number quoted in §1 and §9.1 comes from the harness on the v14 defaults, docs/MEASURE-V14-REPORT.txt (`npm run measure-v14`). Section numbers are unchanged.

v15 enters the round 18 measurement review (docs/REVIEW-HOLISTIC-round18-measurement.md). It takes no new owner decision: it fixes the rules under H11 and H13 so that they do what the owner approved, and it defines what a builder had to guess. **The guard in areas without fresh cells** (keyless areas, exercises with few keys) also reads the passed cells' probe-band looks, so it no longer deadlocks (§1.7 step 6). **Skipped due checks** are misses, so choosing the day for cold checks cannot raise rank (§1.6, §1.7). **H10 readiness** rests on recent evidence and can decay, and a learner who struggles at the challenge point gets a step down, so a plateaued learner is no longer served hopeless items (§1.7a). **Rank's estimand** is p ≥ 0.5 at the probe band, and stationary honesty is stated **per learner** (§1.1, §9.1). Shelving, inputs, teacher targets, voice bands, reading and transfer, and merge downgrades are specified (§1.4, §1.6, §1.7, §1.12). The owner chooses the guard setting on the per-learner numbers (§17.4). Every number quoted in §1 and §9.1 now comes from the harness on the v15 defaults, docs/MEASURE-V15-REPORT.txt (`npm run measure-v15`); MEASURE-V14-REPORT stays as history. Section numbers are unchanged.

v16 enters the owner's decisions of 2026-11-28 on the four §17.4 questions of v15: **H14** (the rank tier guard at P ≥ 0.9), **H15** (a warm-first skip is always a miss; the 20 % skip share gates only unplayed due checks), **H16** (a merge downgrade within 24 h re-derives rank) and **H17** (the H10 targets per kind of area). The rules are merged into the body (§0, §1.1, §1.4, §1.6, §1.7, §1.7a), §17.4 marks the four questions decided, and every number in §1 and §9.1 comes from the harness on the v16 defaults, docs/MEASURE-V16-REPORT.txt (`npm run measure-v16`); MEASURE-V15-REPORT stays as history. **P ≥ 0.9 does what it was chosen for** (stationary learners: 3.0 % / 4.0 % per learner without item gain, 13.0 % / 10.0 % with it, against 6.0 % / 10.0 % and 39.0 % / 60.0 % at 0.8), **but it misses three targets that P ≥ 0.8 met:** stalls in keyless and few-cell areas, one stall in a real area that is not a catalogue gap (guitar/arpeggios, 46 days), and the fixed-tempo H10 lag at piano/harmony (0.53 against ± 0.5). The cause and a proposed fix (the guard's design effect from the recency-weighted count), with its measured cost, are a new owner question (§9.1, §17.4). Section numbers are unchanged.

---

## 0. Owner decisions (2026-11-27, 2026-11-28)

| # | Decision |
|---|---|
| H1 | **The order of work:** (1) one level semantics on cold evidence, built with SP step 1; (2) quick fixes (Ear level, rewards); (3) the SP rotation; (4) real heads, learn-a-tune, unit capstones, accompanying a singer; (5) listening lab, pop chord library, voice registration and text, how to practise, composition. The full merged steps are §18. |
| H2 | **Music rights follow US law** (memory: us-copyright-law). Compositions published in 1930 or earlier are public domain in the US as of 2026-01-01. Sound recordings published in 1925 or earlier are PD in the US. `heads.ts`'s "PD worldwide" rule is replaced by US PD, with per-head region tiers and term classes (§8.1). Every melody is verified note by note against period sheet music (LoC, IMSLP), never a modern fake book (owner rule 2026-11-15). |
| H3 | **Listening assignments may embed YouTube recordings** (embed only; no download, no extraction). Transcription is done from the student's own copy or from US-PD recordings. |
| H4 | **Answered (owner 2026-11-27):** (a) **Songbook:** the existing traditional or classical songs are public domain (checked: the Happy Birthday ruling was in 2015, settled in 2016; the rest are traditional or pre-1900). The 7 originals are OK. (b) **Voice-course songs:** app-written diatonic, tonal practice melodies built to train one vocal element are OK, and new ones may be written for that purpose. (c) **Rule-generated licks:** OK, because the owner gave the rules; any lick whose rule origin is unclear is flagged for the owner. (d) **Still not allowed:** Claude-composed music as demos, backing tracks or an "AI band" (no-claude-composed-music). These items serve every region as the region-safe pool, alongside the 1A heads. Each lick and original head records where it came from. |
| H5 | **The 5 app-written jazz heads** (Corner Bench, Long Way Round, Back Porch Blues, Night Ferry, Quiet Hours) **are approved as clearly labelled practice tunes** (owner 2026-11-27). They are never presented as real repertoire. They join the region-safe pool as practice material (§8.1, §8.2). This closes the H4 question about them. |
| H6 | **Standards by title, with our own charts** (owner 2026-11-27, chosen because it gives the most freedom): any standard may be used by title, with the app's own chord charts, built from analysis and never copied from fake books or chord sites, each with its provenance and a human verifier. Official-recording embeds and the by-ear learn-a-tune variant go with them. The charted-standards library grows broadly, beyond about 120, under this policy (§8.3, §8.4). |
| H7 | **Chord charts are not blocked by collecting societies; the question is closed** (owner 2026-11-27, checked): chord progressions are not copyrightable, and the app gives many variations per standard, never one fixed reharm or voicing. **All the major standards in every genre, Latin included, may be in the app** as the app's own chord charts with many variations, plus official-recording embeds and the by-ear variant (§8.3, §8.4). **The melodies of protected tunes are never served.** The "harmony is the work" care (few songs, chords only) stays only as a note on very idiosyncratic modern writers (§8.3, §11.1). |
| H8 | **Rank by passed exercises** (owner 2026-11-27; replaces the earlier "rank speed" row): rank = the highest tier with ≥ 3 distinct passed exercises in ≥ 2 keys (cold-guarded passes). It never falls, and takes about 1–3 weeks per tier. The statistical posterior drives only current form and adaptivity (§1.7, §1.10). The exact rule (passes at higher tiers count, empty tiers are skipped, "available" counts only what the planner can offer, **≥ 2 distinct exercises always**, small tiers grouped) is in §1.7. |
| H9 | **The item pass = variant V1** (owner 2026-11-27, on the harness results): 3 counted clean takes at ≥ 95 % of target on ≥ 2 days, **plus** 2 clean first-cold takes of the cell's main item on two distinct later days (each ≥ 8 h after, and on a different local day from, the day the target was first reached), **and** a clean share ≥ 2/3 over the last ≤ 6 counting cold checks of that cell (§1.6). In the harness, rank rises at a true cold p < 0.5 fell from about 23 % (v12's pair rule) to about 9 %, at a cost of about 1–2 days per tier and with no stalls (§9.1). |
| H10 | **Challenge keeps rising even when formal rank doesn't** (owner 2026-11-27). Rank is a reporting milestone; difficulty follows the learner's working edge. The tempo climb, forms, feels and bursts continue whatever the rank; entry to the next tier's items opens on readiness, not only on rank (capped at max(`placedTier`, `rankHW`) + 2); the planner aims each session at the challenge point, so a learner whose rank is flat is never served a session easier than their last one; the §9.1 harness gets a required metric and test for it (§1.7a, §1.3, §5, §9.1). |
| H11 | **Rank tier guard G is the rank rule** (owner 2026-11-28, on the round 17 results). Rank at tier t needs, besides H8's passes, the pooled record of every counting cold check at the tier to show P(p ≥ 0.5) ≥ 0.9 (H14; 0.8 until v15) (§1.7 step 6). H9 was approved on improving-learner numbers; a learner who stops improving had a permanently inflated rank under ungated H8, and G closes that gap (§9.1). Ungated H8 stays only as a harness variant. |
| H12 | **Current form stays cautious: ρ_c = 0.20** (owner 2026-11-28). The estimand of the slump and re-promotion decisions is the learner's p on fresh cells of the tier; at ρ_c 0.20 the 80 % interval over-covers it by design: fewer wrong slumps, slower re-promotion. ρ_c 0.08 (calibrated for that estimand) was not adopted (§1.7, §9.1). |
| H13 | **H10 in full** (owner 2026-11-28): readiness entry, the challenge point and the no-easier rule are the planner (§1.7a, §5); the supply of looks is a per-session slot cap shared across the areas practised, with FSRS-review probes counting as looks (§1.7 "Supply and slots", §9.1). |
| H14 | **The rank tier guard G at P ≥ 0.9** (owner 2026-11-28, §17.4 question 1 of v15, option B; was 0.8). Chosen on the per-learner numbers: the guard is a repeated test, so at 0.8 about 1 plateaued learner in 10 (no item gain) to 1 in 2 (item gain) kept a rank one tier above their cold level at the probe band. P ≥ 0.8 stays selectable as a harness variant (`RANK_GUARDED_P80`) (§1.7 step 6, §9.1). |
| H15 | **A warm-first skip is always a miss** (owner 2026-11-28, §17.4 question 2 of v15): in the guard record and in the item pass's clean share, whatever the learner's skip share. Before such a take the app warns: he "זה יחמם את הבדיקה הקרה של היום, והיא תיחשב כהחטאה." / en "This will warm up today's cold check — it will count as a miss." The 20 % skip share applies **only to due checks that go unplayed** (offered, then the learner leaves) (§1.6, §1.7 step 6). |
| H16 | **A merge downgrade within 24 h re-derives rank** (owner 2026-11-28, §17.4 question 3 of v15): when a merge downgrades a counting cold check and a rank rise set within the last 24 h no longer derives, `rankHW` is re-derived from the pre-rise rank; an older rise stands. A sync correction, not a drop (§1.4). |
| H17 | **The H10 targets per kind of area are accepted** (owner 2026-11-28, §17.4 question 4 of v15): tempo areas flat-rank slope ≥ 0.7; fixed-tempo areas ≥ 0.6 with a mean lag within ± 0.5 tier; plateaued learners offered probe-band p ≥ 0.35 with ≤ 35 % hopeless days (§1.7a, §9.1). |
| Breaks | **A level never drops from a break, only from measurement** (owner 2026-11-27). Inactivity shows "refresh" and a wider range (§1.7, §1.11). |
| Pop | **The pop chord library is global and jazz-adjacent, not Israeli-focused** (owner 2026-11-27; §11.1). |

**Harness decisions entered with H9 (owner 2026-11-27, binding):** rank needs ≥ 2 distinct exercises, with small tiers grouped (§1.7); `placedTier` always sits on a non-empty tier (§1.3); the non-tempo placement correction is rule N1 (§1.3); the planner re-offers a passed exercise in a new key when the passes above rank cover fewer than 2 keys (§1.7). **Entered with H11–H13 (2026-11-28):** the planner gives the tier guard the fresh checks it needs (one reserved working slot, §1.7 step 6); N1 counts all cells at `placedTier` (§1.3). **Entered in v15 as fixes under H11 and H13 (round 18), binding:** at a tier with no fresh cell left, the guard also reads that tier's passed-cell probe-band looks; skipped due checks are misses; H10 readiness is evidence-based with a struggle step-down; rank's estimand is the probe band (§1.1, §1.6, §1.7, §1.7a). **Entered in v16 (owner 2026-11-28):** H14–H17 above. Owner decisions take precedence over any earlier text.

---

## 1. One level semantics (AM #1, #2, #3, #10)

### 1.1 Definition and separate axes
- **Rank in an area** (owner decision H8) = the highest non-empty **content tier** t at which enough distinct exercises are passed at tiers ≥ t (at least 2, normally min(3, the available exercises in tiers t … the entry ceiling), with small tiers grouped), in ≥ min(2, available keys) keys where keys apply, with ≥ 1 pass at tier t itself, **and the tier guard** (owner decisions H11, H14): the pooled record of every counting cold check at the tier shows P(p ≥ 0.5) ≥ 0.9. The exact rule is in §1.7. "Available" counts only what the planner can offer (§1.3, §1.7). It never falls. Rank is a reporting milestone: challenge follows the working edge, not rank (H10, §1.7a).
  - **What rank certifies (its estimand, v15):** the learner's cold p on fresh cells of the tier is about 0.5 or more **at the probe band**: at 0.95 × the catalogue target in tempo areas (where counting checks are played), at the rung's fixed tempo in fixed-tempo areas. The harness scores rank's honesty against this truth (§9.1). The guard's "P ≥ 0.9" is **not** a 90 % confidence level: the guard is re-tested after every session and rank keeps its high-water, so it is a repeated check; its real error rate per learner is measured in §9.1 (on those numbers the owner raised it from 0.8 to 0.9, H14).
- **Current form in an area** = the learner's **cold** level from the posterior, with **hysteresis:** it re-promotes at P(p ≥ 0.6) ≥ 0.9 and slumps at P(p < 0.5) ≥ 0.95 (§1.7). It is initialised from rank and capped at it. Current form at tier t reads passed cells at tiers ≥ t, matching rank; a tier t with no passed cell at tiers ≥ t shows "unmeasured" (§1.7). While placed, and after a change of input, it follows §1.7. It is shown with a range until the uncertainty is small. It is estimated by the Phase A posterior (§1.7) until Phase B (§1.8) is validated. It drives adaptivity and reporting, never rank or entry (§1.7).
- **Not measured:** tone, posture and tension are not measured by the level. They come only from teacher rubrics (§12.1).
- **Separate axes, never mixed into level:**
  - **Coverage:** stars, 12 keys, forms played, and the "coverage only" families (§1.10).
  - **Maintenance:** fresh / refresh.
  - **Effort:** XP, streak, minutes.
  - **Repertoire:** tunes and pieces completed and kept up (§1.10).

### 1.2 Content tier
- **`contentTier`** (0–8, the app's T scale) is a field on the **spec / option** (`SpecTemplate`), not on `LevelDef`, because `LadderRung.min` varies per option (e.g. `b-scale-6` 1 or 3).
  - Seeded from `LadderRung.min` (keyIndex.ts) and the SP §14 entry bands. **Seeding from an SP band uses the band's lower T** (band 2 → T2).
  - Hand-set for families neither covers. **A guard test fails on any spec / option without one.**
- **"Band" keeps SP §14's meaning** (a group of tiers: band 1 = T0–1 …). The tempo axis is **`paceTier`** (§1.3). **`tierBounds` (tempo) is the pace, never the content tier.**
- **Ordering is lexicographic: content first, then the pace or sub-band.**
- **Catalogue rule (exercises per tier):** every non-empty tier of a laddered area should hold **≥ 3 available exercises** (floor 2). In the harness (§9.1), 2 exercises per tier cost about 6 days per tier (median 30.5 against 24 days at p 0.75, 3 d/wk, v16), while 3, 4 and 6 exercises climb alike (24–25 days); the content-research claim that 3 climbs slower than 4–6 is not borne out there, so 4 is not required. In keyless areas few cells also hold the guard: under the v16 guard 16 of 20 climbs with 2 exercises per tier stall (longest 233 days) and 3 of 20 with 3 per tier (longest 103 days), a known soft spot with a proposed fix (§9.1, §17.4). **An area should not start with lone 1-exercise tiers followed by an empty tier:** bass walking/groove (1 exercise at T1, 1 at T2, none at T3) can hold the first rank until a T4 pass (1 climb in 20 stalled, 58 days, v16, §9.1). Grouping (§1.7) keeps such tiers rankable but slow; filling them is the fix.

| Area | Content tier | Ordering |
|---|---|---|
| Technique (piano, guitar, bass, drums) | `contentTier` of the spec / option. **Scales and arpeggios:** content = their nps tier (their content is the tempo, consistent with SP A8); each nps rung is its own exercise (§1.7). **Drum rudiments:** `contentTier` seeds rudiment complexity (single / double / diddle / flam / drag families), then nps within the family; buzz rolls are graded on evenness and sustain quality, not on a rate (§13.6). | content tier → tempo. A T4 item at a slow tempo ranks above a T2 item at a fast tempo. |
| Ear | the feature-based difficulty (SPEC-EAR-INTELLIGENCE §4), with a guess floor per answer count. SPEC-EAR-INTELLIGENCE governs the Ear level itself (§1.14). | — |
| Reading | **reading complexity** = a weighted sum of these features: subdivision level, accidentals, ledger lines, density, key distance, a **syncopation index** (ties across beats, off-beat onsets, rests), **mean absolute interval and leap share**, and a **texture count** (voices, staves or hands, chords). Each feature is normalised to 0–1 over the catalogue range before the sum. Equal weights to start; the weights are fitted later. **The score is mapped to T by catalogue quantiles:** the reading items of each existing reading level set the cut points. Head difficulty cards use the same features (§8.2). **Reading items are rule-generated per tier** (random stimulus), so the supply of first-sight items never runs out. | complexity tier → tempo |
| Voice | the **item level** is the content tier. The cents band (60/45/30 ¢) is a **sub-band shown within it** ("T3, ±30 ¢"). It is never added to T; each tier requires a cents band (or tighter) for a pass to count toward rank (§1.7). Cents are measured on each note's steady-state mean pitch, with vibrato averaged out. | item level → cents band → timing band |
| Rhythm / time | subdivision level → T, with the timing SD band | subdivision → SD band |
| Games | excluded from Phase A level evidence. Games are practice only (they may feed need, §5) and never set a level. Groove Match is a game (§13.2). | — |

### 1.3 `areaTier` = {content, pace}; placement and entry
- **`areaTier(area)`** replaces `playerTier`, SP A8 and any separate level function. It returns `{content, pace}`, plus `placedTier` while placed.
- **`content`** is the §1 content-tier level. **Rank, course DYN and friend level read rank** (§1.7, §1.10); current form is shown separately.
- **`paceTier`** = the tempo tier of the area's confirmed scale benchmark (from placement until confirmed). **An area with no scale benchmark of its own** (bass walking/groove, piano and guitar harmony/voicing played in time, line-jazz) uses the instrument's scales-area benchmark; the over-placement correction of a tempo area without one reads that benchmark too. A take's tolerance uses the take's own nps tier, capped by `paceTier`.
  - It is used **only** for timing tolerances (`tierTiming`, analyze.ts:838) and stretch `tierUp` / `tierDown`.
  - **The beginner definition stays SP A3:** band 1 by the placement content tier (`placedTier`). `paceTier` never decides who is a beginner. Beginner status in an area ends when rank in that area reaches T2, or placedTier is band 2 or above.
  - Harmony and other fixed-tempo areas are never gated by tempo.
- The units never mix, so promotion and tolerance can't oscillate.
- **`placedTier`** is a separate field per area, set by the level test or self-report. **It sets entry only, never rank.**
  - The UI shows "placed: T5" until rank reaches it.
  - **`placedTier` always sits on a non-empty tier:** a placement, or a drop, onto an empty tier snaps down to the nearest non-empty tier at or below it (up to the lowest non-empty tier when none is below).
  - **Over-placement correction uses the expected trajectory, not the target.** Rank is never touched. It applies only while placed (rank = none or below `placedTier`).
    - **Tempo areas:** `placedTier` drops one tier when the area's cold scale benchmark (`paceTier`) has been ≥ 2 tiers below `placedTier` on ≥ 5 offered days, counted cumulatively (not necessarily consecutive) since the last drop.
    - **Non-tempo areas (rule N1):** `placedTier` drops one tier when, at `placedTier`, ≥ 12 cold attempts on ≥ 4 offered days have a clean share < 30 %. The attempts are the first cold takes of the day of **all** cells at `placedTier`, at the probe band (sight takes for reading), counted since the last drop: working cells and passed cells alike (a passed cell's confirmation look or FSRS review there counts). The harness implements exactly this (its earlier working-cells-only count is a variant).
    - **The count restarts at each drop.** It counts only offered days: days on which items at `placedTier` were offered.
    - **A drop below band 2 restores beginner status,** with D1 floor 3. This is intended.
    - **Harness case:** a correctly placed learner is never corrected (§9.1: 0 of 800 under N1).
  - **While placed** (rank = none or below `placedTier`), current form follows the placed rule in §1.7.
  - **Initial state:** rank = none until the first tier is reached; a non-placed beginner starts with `placedTier` = T0 (snapped to the lowest non-empty tier).
  - SP A8's "≥ 3 cold takes" switch is deleted.
- **One entry rule (content-based):** with t = max(`placedTier`, `rankHW`), entry = t + 1: an item may enter when its entry content tier ≤ that value. **Entry also opens tier t + 2** once every available exercise at t + 1 is passed. The highest tier this tier-wide rule allows is the **entry ceiling**, which bounds rank's "available" (§1.7). **Readiness entry (H10, §1.7a):** the next non-empty tier above the highest entered tier also enters once ≥ min(2, available) exercises at the highest entered tier have a ready cell, without waiting on rank; it is re-evaluated each session and can close again when readiness decays (§1.7a). **Nothing enters above t + 2** (the no-stacking cap). Entry falls only through the placedTier over-placement correction (§1.3); items already in the rotation stay, and manual choice is never limited (no locks). Current form never sets entry (§1.7).
  - **The entry ceiling** counts + 1 and + 2 over **non-empty tiers**: empty tiers are skipped when computing it. It is computed from the stored `rankHW` (§1.7) and `placedTier`, not from the derived rank, so it is not circular. With no non-empty tier above the base, the ceiling is the top non-empty tier.
  - **The t + 2 opening** and readiness entry are planner-availability rules. The base is max(`placedTier`, `rankHW`).
  - **The rate's entry shift works in tiers,** capped at +1 (SP §15.5 / §17.3 "band step" means a tier step). Together with the entry rule it never takes entry beyond t + 2.
  - **Prerequisites:** cross-session they read `established` (§1.6); inside an assignment or session they follow §1.6 (D2 / SP A10, `acquired`).
  - **Teacher-assigned forms are exempt** from the entry rule; SP §2.6's "at most 2 tiers up" governs them.
  - **No locks:** the entry rule limits only the rotation and the planner, never manual choice.
  - This is how SP §14 / §15.5 entry reads the tier.
  - **Harness test:** a steadily improving simulated learner climbs from T0 to T5 on rotation alone (§9). **Guard tests:** a tier with 2 exercises is climbed rotation-only (§1.7); per area, on the real catalogue, rotation-only climbs reach every tier that has content.

### 1.4 Cold evidence and cells
- **The cold flag** (`ev.cold: boolean`) is written on every rating event in every area, at creation; refolds keep it.
- **The cell key** = family + level id + key, derivable from any take: list runs, licks and key-session stages included. If none is derivable, the item id is used. **There is no hand group:** RH, LH and HT share one cell.
- **The cell's main item** is its HT item where one exists (otherwise the last spec, §4.1). **"First cold take of the day"** always refers to the cell's main item.
- **Technique cold take:** SP §4.1 as amended here:
  - the item's take is cold when **≥ 1 h has passed since any sounding take of the item or of any item in its cell**: RH, LH, slower, burst, challenge and coordination takes included. This closes warm-up laundering.
  - The gap is timed by a per-cell **`lastSound`** (any sounding take). SP §4.1 and SP §3 are amended to read `lastSound`. `lastQual` remains only for the ≥ 1 h re-measure rule.
  - The take must still qualify per SP §4.1: full click, straight, not a challenge, burst or probe.
  - `sessionMs` (minutes since the session start) is logged on every cold entry. It is a Phase B covariate.
- **Native feel:** each item has a native feel. Swing applies for `spec.swing` and jazz-native items such as guide tones, shells and lines. **A take in the native feel counts as "straight"** for coldness, passes and confirmations. Feel-layer modifiers stay non-qualifying. SP §16.5 is amended to point here (§1.16).
- **What counts where:**
  - **For confirmations (looks for the current-form posterior):** the first cold take (of the main item) **per cell per day**, in passed and established cells only (§1.6, §1.7).
  - **For FSRS and the staircase:** every cold take counts.
  - **For the item pass:** the **counting cold checks** are first cold takes of the cell's main item at the probe band, on later days (§1.6). The SP §9 3-day test stands.
  - **General hand warm-up is not penalised.** Coldness is per item and cell (`lastSound`).
- **Cold check first, in every planner:** every planner, the rotation, the key session and list runs play the main item's cold check **before any other sounding take of that cell** in a session: lead-ins, LH visits, list-run hand takes and coordination stages included. Warm-up work never steals the cold take.
- **Per modality:**
  - **Ear:** the first 5 trials of a skill/contrast after ≥ 8 h. Where SPEC-EAR-INTELLIGENCE's own cold definition differs, it governs.
  - **Voice:** per item, after ≥ 1 h, kept in the `cellPass` store (§1.6). `sessionMs` is its warm-up covariate (vocal warm-up is physiological; AM §3.6). **A voice cell's cold check is never scheduled before ≥ 2–3 minutes of warm-up in that session** (SOVT, or other voice cells): vocal health, and the measurement is then of a warmed voice.
  - **Rhythm:** per subdivision cell, after ≥ 1 h, kept in the `cellPass` store. First cold take per cell per day for confirmations; passes follow the item pass rule (§1.6).
  - **Reading:** sight takes are cold by design, kept in the `cellPass` store (§1.6).
  - **Games:** the first run of a game after ≥ 8 h (used for game refresh, §4.3; games are not level evidence).
- **Cross-device:** `lastQual`, `lastSound` and the cold entries sync with timestamps. On merge, a second "cold" within 1 h of another device's qualifying take is downgraded to warm.
  - **Optional stopping on merge:** a pass whose counting take is downgraded to warm at merge is revoked if it was set within the last 24 h. Older passes stand.
  - **Merge downgrades and the records (v15; rank re-derivation decided, H16):** a counting cold check downgraded to warm at merge also leaves the tier guard's record and the cell's V1 share (§1.6, §1.7), whatever its age; it was never a cold take. If a rank rise set within the last 24 h no longer derives after the merge (a revoked pass, or a guard record that no longer passes), `rankHW` is re-derived from the rank held before that rise and the merged records: it may return to that rank, never below it. This corrects a sync error inside the same 24 h window as pass revocation; it is not a drop from measurement or from a break (owner decision H16, 2026-11-28). Older rank stands. The harness's pure helper `rankAfterMergeDowngrade` is the reference (tested; merges are not simulated).

### 1.5 Cold readers
Every warm-peak reader (AM §3.4) moves to a cold reading, and **every move gets a guard test**.

| Reader | Change |
|---|---|
| `familyLevel`, the technique rank, the course level, badges, friend levels | read rank (§1.7, §1.10) |
| `playerTier` (tiers.ts) | replaced by `paceTier` / content (§1.3) |
| `history` and snapshots | a daily **cold** entry beside the daily best. Trends and teacher charts read cold. The best stays display-only ("today's best"). |
| The end-screen graph | labelled "today's best"; the SP §4.3 cold line is shown first |
| `plateau.ts` | replaced by one plateau definition on the cold series (§6.2) |
| Momentum tempo records, the stretch "record" band, Momentum `statusUps` and `rating` | cold only (§3) |
| Stretch `tierUp` / `tierDown` | read `paceTier` (§1.3) |
| Path technique ✓ | the strengthen pool treats it as acquired only once `established` (a later-day cold confirmation, §1.6) |
| The AI coach, the weekly profile, the teacher digest | get the cold series |

### 1.6 Confirmations, passes, `acquired` and `established`
- **Confirmations per area** (each is the area's cold evidence for the current-form posterior, which counts only passed and established cells, §1.7; rank comes from passes, §1.7):

| Area | Confirmation | Success | Posterior indexed by |
|---|---|---|---|
| Technique, laddered | first cold take per cell per day in the probe band (0.95–1.0 × target) | clean | content tier |
| Fixed-tempo (harmony, voicing, guide tones, held notes, cards) | first cold take per cell per day at the rung's fixed tempo | accurate (the rung's own pass criterion) | content tier of the rung |
| Voice | first cold sung item per cell per day; a voice cell = item level × its target cents band (60/45/30 ¢), and a take is one look for its own cell only | passes the item's cents band and timing band | the item level (content tier); the cents band is a sub-band within it (§1.2) |
| Rhythm | first cold take per subdivision cell per day | within the cell's SD band | rhythm tier: subdivision level → T |
| Reading | every cold first-sight take (one per item by nature) | clean | reading complexity tier (§1.2) |

- **Confirmations are not selected on success:** every eligible take counts, passed or not, in time order (never the best). **Each item's own passing take is included** (the likelihood principle; the posterior ignores the stopping rule): it is the cell's first confirmation in the current-form posterior, which counts only passed and established cells (§1.7). Probes of unpassed items feed only the staircase and threshold.
- **Above-target staircase takes are excluded from confirmations, both clean and miss.** They feed only the staircase and the threshold estimate (§1.9).
- **Passed cells always confirm in the probe band:** every scheduled confirmation take of a passed cell plays at 0.95–1.0 × target (§1.9).
- **Breadth is counted in exercises,** not item ids. An exercise (`exerciseId`) = spec template + level/option (+ the nps rung for scales and arpeggios), with key and hand removed (exercise identity in full: §1.7). Rank's breadth rule and the posterior window's breadth are in §1.7.
- **Not enough:** a clean take at an item's start tempo never counts toward level.
- **Exclusions:** `~feel`, burst, link and challenge takes never count. (A take in the item's native feel counts as straight, §1.4.)
- **The level test** sets `placedTier`, shown "placed: T5" until rank reaches it. It sets entry only, never rank (§1.3).
- **The item pass** (technique, fixed-tempo, voice and rhythm; owner decision H9, variant V1) = `passedAt`, per SP §4.2 as amended. It needs both halves:
  - **the warm half:** 3 counted clean takes at ≥ 95 % of target on ≥ 2 days;
  - **the cold half:**
    - **the pair:** 2 clean **counting cold checks** on two distinct later days. A counting cold check = the first cold take of the day of the cell's main item, at the probe band (≥ 0.95 × target), on a **later day**: a different local day from the day the target was first reached, **and ≥ 8 h after the first clean take at ≥ 95 % of target**;
    - **a cold miss between the two resets the pair** (strict): any cold miss of the main item at the probe band after the target was first reached, counting or not;
    - **the clean share:** at a counting cold check that completes or follows the pair, the clean share over **the last ≤ 6 counting cold checks** of the cell, clean or not, is **≥ 2/3**. Once met, the cold half stays met.
    - **a skipped due check is a counting miss (v15):** a counting cold check is **due** on a day when the planner offers the cell's cold check at the probe band on a later day (≥ 8 h after, and a different local day from, the first target). It is **skipped** when the cell is **sounded** that day before, or without, that cold take: "sounded" = any sounding take of any item in the cell (hands separate, slower, lead-in, burst, list-run and coordination takes included), the same takes that set `lastSound` (§1.4). A skipped due check enters the clean share as a miss and resets a pending pair; no later take that day counts as the day's check. **A warm-first skip is always a miss, whatever the learner's skip share** (owner decision H15; the 20 % skip share of §1.7 step 6 applies only to due checks that go unplayed). An honest learner who plays the cold check first (§1.4 "cold check first, in every planner") never produces one. **The UI warns before any take that would warm up a due cold check** (the learner opens a warm-up, a slower take, a lead-in or another item of the cell before its due check): he "זה יחמם את הבדיקה הקרה של היום, והיא תיחשב כהחטאה." / en "This will warm up today's cold check — it will count as a miss.", with "Play the cold check first" as the default action and "Warm up anyway" as the other.
    - **a pending first clean expires after 60 days (v15):** a long break cannot complete a pair with checks months apart (forgetting is not modelled; the V1 share keeps its last ≤ 6 checks).
  - `passedAt` = the later of the two halves' times. Every other cold take still feeds FSRS and the staircase.
  - **Harness results** (§9.1): P(pass within 28 days, 4 days/wk) is about 36 % at a cold clean rate of 0.3, 84 % at 0.5 and 99 % at 0.7; the owner saw these numbers and chose V1 (H9).
- **"Later day" rules** (`established`, the SP §4.2 later-day cold take, `firstTargetDay`) need **≥ 8 h and a different local day.** That closes the midnight hole.
- **Items stay passed** (SP §4.2, `passedAt`). Passed items show as passed on the path and the matrix at once, and passes raise rank directly (§1.7). Current form can fall to "refresh", but a closed item never reopens on its own.
- **Areas without `passedAt`:**
  - **The reading and transfer pass test:** a posterior over **recency-discounted counts** of the tier's cold attempts:
    - half-life 10 attempts (weight 0.5^(age / 10), newest age 0); every attempt is kept, in order, so there is no window that can be cherry-picked;
    - the counts are corrected with the §1.7 day-clustering n_eff: **the design effect is computed from the raw counts** (m_d = attempts per distinct day; m_c = 1, since every attempt is a distinct item) **and applied to the discounted counts**;
    - pass when **P(p ≥ 0.6) ≥ 0.95**, with **≥ 8 attempts on ≥ 3 days**; the test is checked after every attempt.
  - **Reading:** cold first-sight takes per complexity tier, under the reading and transfer pass test. A reading exercise = reading generator × tier. The §1.7 posterior runs on sight takes.
  - **Transfer forms** (learn-a-tune transfer steps, chart at sight, k-accomp-voice and k-pop at sight, an unseen head, and unseen rule-generated licks at sight, §1.10): a tier passes under the reading and transfer pass test over its cold attempts (each attempt a distinct unseen item: a chart, key or head at that tier's difficulty card (§8.2, §8.3), or a generated lick). **"An unseen head"** means a head presented at sight outside the learn-a-tune protocol (reading or the level test).
    - **A transfer tier pass counts as one exercise per family** toward rank (§1.7): chart at sight, learn-a-tune transfer, k-accomp-voice, k-pop, generated licks. Its keys are the keys of the clean attempts.
    - **The transfer pool** is filled by keys and charts. The §9.1 harness checks that every transfer tier is reachable.
  - **False passes and time to pass** (§9.1): at true p = 0.5 (day SD 0.8) the false-pass rate is ≤ 1.3 % (reading) and ≤ 2.3 % (transfer), against a target of < 10 %; a learner improving from p = 0.3 to 0.85 passes in a median of 46 days (reading) or 52 days (transfer).
  - **Voice and rhythm:** each cell has a sticky pass under the item pass rule above, where "clean" means within the cell's cents and timing band (voice) or SD band (rhythm).
  - **Storage:** a new synced store **`cellPass`** (under the fresh-start epoch) holds `{passedAt, cold[]}` for voice, rhythm, reading and transfer. It is the per-item cold store for voice and rhythm.
  - **Games:** excluded from Phase A. Practice only (they may feed need).
- **`acquired` vs `established`:**
  - `acquired` (warm, D1) moves an item from blocked to the rotation. **Inside an assignment or a session,** forms and same-session entry follow owner decision D2 and SP A10: the anchor `acquired` opens its forms.
  - **`established`** = a clean cold take on a later day than acquisition (≥ 8 h and a different local day). It gates cross-session pool entry and prerequisites (including readiness entry, §1.7a), need readiness (§5) and the strengthen pool.
  - SP §14 / §15.5 cross-session prerequisites read `established`. Both specs say this (SP §22).

### 1.7 Phase A: rank by passed exercises, and the current-form posterior (ships first)
- **Why (round 7):** the round-7 simulations found that v8's statistical rank (a posterior promotion test, 2 looks a day, with day and cell dependence) needs 2–4 months per tier to keep false promotion under 5 %, and that 5–16 % of p = 0.75 learners never promote. The owner chose a rank built from passed exercises (H8).

**Rank (owner decision H8, with the harness decisions)**
- **Rank in an area** = the highest non-empty tier t that passes this test:
  1. **The range** R starts as tiers t … max(t, the entry ceiling) (§1.3). A tier above the entry ceiling (a manual pass) uses tiers t … t.
  2. **Grouping:** while R holds < 2 available exercises, it is extended up to the next non-empty tier above it. If nothing is above (a **1-exercise top tier**), it is extended down to the next non-empty tier below, until it holds ≥ 2.
  3. **Breadth:** the distinct exercises passed at tiers ≥ the lowest tier of R number **≥ max(2, min(3, available exercises in R))**. When R was extended downward, the need is 2 distinct exercises across the grouped tiers.
  4. **Keys:** those passes cover ≥ min(2, available keys) keys where keys apply. "Available keys" = the union of the keys of the available exercises in R (as in the harness's `deriveRank`; the earlier "largest key count of one exercise" reading is struck — they differ when key sets differ, e.g. two 1-key exercises in C and F need 2 keys).
  5. **≥ 1 pass at tier t itself.**
  6. **The tier guard (owner decision H11):** the **guard record** at tiers lo … t (lo = the lowest tier of R when R was grouped downward, else t) gives P(p ≥ 0.5) ≥ 0.9 (owner decision H14; 0.8 until v15) under a Beta(1, 1) prior, with **≥ 6 entries**. Exactly:
     - **the guard record** holds, in time order:
       - every **counting cold check** = a cold check that the item pass's cold half reads (§1.6: the first cold take of the day of a working cell's main item, at the probe band, on a later day), from **every** cell at those tiers: all exercises, all keys, cells later passed, and **shelved** cells (below). Passes alone can be picked from the easiest of many cells; this record cannot;
       - every **skipped due check** of those cells (the cell was sounded before, or without, its due cold check: a warm-first skip), as a miss, **always, whatever the skip share** (owner decision H15; §1.6);
       - every **unplayed due check** (offered in a session, then not played because the learner left the area or the session; the cell was not sounded), as a miss, **only while the learner's skip share** (skipped plus unplayed due checks over all due checks offered, in the area, over the last 30 days) **is above 20 %**; below that share they are only logged (an honest learner who sometimes stops early is not penalised; a learner who leaves on bad days is);
       - **at a tier with no fresh cell left** (every available exercise × key of the tier already has a cell: keyless areas such as rhythm, voice, drum rudiments and keyless fixed-tempo tiers, and exercises whose few keys are all used), also the **probe-band cold looks of that tier's passed cells** (confirmation slots, FSRS review probes, guard probes; the first cold take per cell per day, each a look whether or not current form admits it), with skipped and unplayed looks as above. At a tier that still has fresh cells, confirmation looks stay out (they feed current form): there the record keeps getting fresh checks from the reserve, and a passed cell's looks would favour the cells that passed (the harness measured that cost when applied everywhere, §9.1);
     - **never in the record:** a check at a lowered teacher target (the probe band is always the catalogue target's, below), a voice check at a looser cents band than the tier requires, a take from a not-comparable input (SPEC-INPUT-SOURCE R5: a mic take on a keys item that expects MIDI), and a check downgraded to warm at merge (§1.4);
     - **recency weighting:** the i-th most recent check (i = 0 the newest) has weight 0.5^(i / 24) (a half-life of 24 checks, counted in checks, not days); s and f are the weighted clean and miss counts;
     - **n_eff:** s and f are divided by the §1.7 design effect 1 + (m_d − 1) ρ_d + (m_c − 1) ρ_c over those checks (m_d = checks per distinct day, m_c = checks per distinct cell, ρ_d 0.15, ρ_c 0.20); the posterior is Beta(1 + s / deff, 1 + f / deff);
     - **minimum:** ≥ 6 entries (raw count) at tiers lo … t.
     Like the other steps it is evaluated whenever rank is derived; rank never falls, so a guard that later fails changes nothing already earned. Because it is re-tested after every session against a high-water rank, it is a **repeated check**, not a 90 % confidence level (§1.1, §9.1).
  - **Reading and transfer areas:** they have no counting cold checks and no step 6. **The reading and transfer pass test replaces the guard there** (§1.6): it already reads every cold first-sight attempt at the tier, each a distinct item, recency-weighted and day-clustered, so no attempt can be picked; a transfer tier pass counts as one exercise per family.
  - **Inputs:** passes and the guard record are per cell and **not split by input**: comparable takes from any input count in the same cell (rank is not split by input, §1.12). A take that is not comparable (SPEC-INPUT-SOURCE R5/R6) never counts as a counting cold check, a pass take or a guard entry. Current form and its display read the current input's series (§1.12).
  - Breadth is the union over those exercises. A pass = `passedAt`, per SP §4.2 as amended (§1.6).
  - **Rank needs ≥ 2 distinct exercises, always.** One exercise, in any number of keys, never gives rank. Every tier with content stays rankable; only an area whose whole catalogue holds a single available exercise can never rank.
  - **"Available" counts only what the planner can offer:** the exercises in R, less the unavailable ones below. With entry opening t + 2 (§1.3), rank and entry cannot deadlock.
  - **Passes above a tier count toward it,** so scattered passes at T4, T5 and T6 give at least T4.
  - **Tiers with no available exercise** are skipped, never passed by default.
  - **Keyed and keyless areas** use the same rule. Exercises that are unavailable are excluded from "available": "needs MIDI", "teacher or recording needed", region-denied, and small-hands-replaced.
  - **Fixed-tempo areas** count rung passes.
  - **Voice, rhythm, reading and transfer forms** count `cellPass` passes, using §1.6's per-area pass definitions. **A transfer tier pass counts as one exercise per family** (chart at sight, learn-a-tune transfer, k-accomp-voice, k-pop, generated licks); its keys are the keys of the clean attempts (§1.6).
  - **Voice sub-bands and intonation:** passes are recorded per cell (item level × cents band). Rank uses the item level, and **a pass counts toward rank only at the cents band its tier requires, or tighter:** T0–2: 60 ¢; T3–4: 45 ¢; T5+: 30 ¢. A pass at a looser band than the tier requires is coverage only, **and so is a check: a voice cold check scored at a looser cents band than its tier requires never enters the guard record** (a check in a band at or tighter than the required one does; one take is one check, for its own cell). The planner offers a voice item at its tier's required band by default. The display shows the sub-band.
- **New keys and fresh checks (planner):** a passed exercise at a tier above rank (≤ the entered top) is re-offered in a new key **while that tier needs it**: its passes and those above cover fewer than 2 keys (step 4), **or** the tier guard (step 6, on its range lo … t) is not met at that tier. Without this, a 1-exercise tier or two passes in one key could deadlock rank, and a fully passed small tier could never gather the guard's checks (found by the harness). Re-offering a passed exercise when its tier no longer needs it only crowds out the new exercises that breadth (step 3) needs.
- **The guard reserve (planner):** at the lowest tier t above rank (t ≤ the entered top) that holds a pass **and** whose guard (on its range lo … t) fails, **one working slot per session** goes to a fresh check at t: a working cell there if one exists, else an unpassed exercise at t (a new key, or its shelved cell resumed), else a passed exercise in a new key, else, **at a tier with no fresh cell left, a guard probe**: probe-band cold looks of up to 3 passed cells at t (one per cell, least recently looked first; short takes that share the reserved slot), which the guard reads at such a tier (step 6). Without the reserve the harness found 1 climb in 300 stalled for 43 days: the guard's record at the first rankable tier held the misses from the weeks before the learner could play it, while the working slots were taken by hard cells two tiers up (§9.1). Without the guard probe and the passed-cell looks, every keyless climb deadlocked (round 18: 0 of 20 reached the top, a median longest stall of 324 days).
- **Cells, shelving and resuming (v15):** a cell is unique per exercise × key (§1.4: family + level + key), so the planner never opens a second cell for an exercise in a key it already has. **A working cell is shelved** (set aside) after **12 visits since it was last offered** without a pass, or when a struggle step-down moves the challenge point below its tier (§1.7a). A shelved cell **keeps its tracker** (its pass progress and its counting checks, which stay in the guard record) and **may be resumed** later; an exercise is offered in a key it has no cell in yet first (preferring keys the passes at its tier and above do not cover), else its shelved cell is resumed, else it is not offered.
- **What counts as a distinct exercise:**
  - **`exerciseId`** = spec template + level/option, without key or hand. Its derivation from `itemId` is specified in code (`exerciseIdOf`) and covered by a test.
  - **Scales and arpeggios:** exercise = spec + option + **nps rung**, with one `passedAt` per rung.
  - **An exercise's pass is its cell's main item:** the hands-together item where one exists. Hand-separate passes never count alone.
  - **Fixed-tempo rungs** pass only under the §1.6 item pass rule. Variants (voicing, inversion, seed, start degree) are **not** distinct exercises, and an in-session "rung passed today" moves the rotation but is not a `passedAt`.
  - **The voice cents band is not part of exercise identity.**
- **Teacher targets:** a pass counts for rank only at ≥ the option's catalogue target (= the option's target at its catalogue entry band, before any rate shift). A pass at a teacher's lower target counts as coverage only (and toward that assignment). **The probe band that defines a counting cold check for rank (the rank-counting pass and the guard record) is always the catalogue target's** (0.95–1.0 × the catalogue target); a check played at a lowered teacher target counts toward the assignment's pass only and never enters the guard record. A teacher target above the catalogue target changes nothing for rank (checks at ≥ 0.95 × the catalogue target count).
- **Stored state:** each `passedAt` record stores `{contentTier, target, exerciseId, src, at}` at pass time. A synced `rankHW` per area stores the high-water (§1.15).
- **Rank = max(`rankHW`, derived).** Rank never falls; a pass stays a pass. Re-tiering, re-targeting or catalogue edits can never lower rank.
- **Rank can jump:** passes at a higher tier raise rank directly (high-water).
- **Promotion XP** pays once per tier gained, under the Q6 caps (§3).
- **Inputs:** passes from any input count toward rank; changing input never lowers rank. Passes and the guard record are not split by input; a not-comparable take never counts (step 6 "Inputs"). That a lenient input can't inflate rank is checked by the SPEC-INPUT-SOURCE guard tests (the expected-MIDI guard and the not-comparable flag, R3/R5) and by the §9 injection tests per input; the synthetic harness does not model input noise (§9.1).
- **Memorised material never feeds rank or area level** (§1.10, §8.4). **Licks, Encore phrases and repertoire drills** are coverage only for rank: they keep SP §4.2's old pass rule and are memorised material. Rule-generated licks count only as unseen generated licks at sight, under the transfer pass rule (§1.6); they feed the instrument's line-jazz area.
- **The bar to next** = the passed exercises toward the next tier ("2 of 3", plus the keys). It never moves backward, and it is never full below Master. **It says what is missing:** a learner whose passes are all in one key sees "a second key is needed" (step 4; one key alone can never give rank), and a learner held by the guard sees "more cold checks at this tier" (step 6), never a bar that looks full.
- **Calendar time** is about 1–3 weeks per tier, depending on practice. The §9.1 harness reports it per area from the real catalogue, on the v16 defaults (guard at P ≥ 0.9 with the round 18 fixes, H10 planner with the tempo model, shared supply): pooled medians of 13–26 days per tier (p90 22–64 days; 13 areas: piano and guitar 5, bass 3) for learners at a cold p of 0.75–0.85 on the next tier, 3–5 practice days a week.
- **Guard tests:**
  - one exercise in many keys and hands never raises rank, even on a 1-exercise tier;
  - three passes all in one key don't raise it either, where keys apply;
  - three exercises in two keys with one at the tier give rank;
  - scattered passes; passes above count, but ≥ 1 pass at the tier itself is needed;
  - an empty tier is skipped, never passed by default;
  - a mic learner whose tier is all "needs MIDI";
  - three RH-only passes;
  - three variants of one rung;
  - one voice item in three cents bands;
  - a lowered teacher target; coverage-only passes (teacher target, loose voice band) never count;
  - re-tiering never lowers rank; rank never falls; unavailable exercises are not counted;
  - a tier with 2 exercises, climbed rotation-only; passing both opens the next tier, so a third pass is needed (min(3, available in t … ceiling));
  - the t + 2 opening once every exercise at + 1 is passed;
  - a 1-exercise top tier is ranked only with a pass at the tier below in a second exercise (grouped downward);
  - a warm lick pass never raises rank;
  - one scale passed at 3 tempo tiers = 1 exercise per tier, never 3 at one tier;
  - per area, on the real catalogue: rotation-only climbs reach every tier that has content, with no stall (§1.3);
  - the rank-gaming guard: one exercise in a new key every session for 180 days never gives rank;
  - the tier guard: three passes in two keys with a counting-check record of 4 / 12 clean give no rank; fewer than 6 checks give no rank;
  - stationary learners (rate 0) at true p 0.5 and 0.75: the final rank sits at a tier whose probe-band p < 0.5 for ≤ 10 % of learners over 365 days (per learner, §9.1);
  - improving learners on the real catalogue: no stall ≥ 42 days, including the round 17 case (the guard reserve);
  - keyless and 1-key catalogues: rotation-only climbs reach the top tier with no stall ≥ 42 days (the passed-cell looks at tiers with no fresh cell left, the guard probe); a cell is never duplicated for one exercise × key;
  - a skipped due check is a miss (V1 share and guard record); a day picker who warms up first on bad days, or leaves the area on them, gains no rank;
  - checks at a lowered teacher target, a looser voice band or a not-comparable input never enter the guard record;
  - a pending first clean of the pair expires after 60 days.

**Current form: the posterior**
- **The Bayesian posterior** (the window below, Beta(1, 1), dependence aware) drives only these:
  - **current form**, shown beside rank;
  - **adaptivity:** §5's distance (the working edge, §1.7a), need weights, spacing, tempo choice and the refresh probe;
  - **reporting** (the teacher's view).

  None of these is permanent, so no false-promotion horizon target applies. The §9.1 harness reports the posterior's calibration under day and cell dependence (a beta-binomial with a day effect).
- **Who drives what:**
  - **entry** = max(`placedTier`, `rankHW`) + 1, opening + 2 once every available exercise at + 1 is passed, plus readiness entry (§1.7a), never above + 2, falling only through the placedTier correction; no locks (§1.3);
  - **current form** sets §5's distance, need weights, spacing and tempo choice. It does not set entry.
- **The posterior counts only passed and established cells.** Probes of unpassed items feed the staircase and threshold only (§1.9). A learner working on new exercises is never marked as slumping.
- **A look** is one confirmation (§1.6), counted only as the **first eligible confirmation of the day per cell**, in time order (never the best).
  - **FSRS review probes and pass probes outside the slots also count as looks,** within the passed-and-established rule above. The slots guarantee a minimum supply.
  - **The day is the unit:** at most **2 looks per area per day** count. **A second look must come from a different exercise.**
- **"Dependence aware"** = an effective-n design effect with day and cell clustering, n_eff = n / (1 + (m_d − 1)ρ_d + (m_c − 1)ρ_c), where m_d is looks per day (n / distinct days), m_c looks per cell (n / distinct cells), and ρ_d and ρ_c the intra-day and intra-cell correlations, with pooled defaults from the calibration traces (ρ_d and ρ_c are stated in §9.1; until fitted, ρ_d = 0.15 and ρ_c = 0.20). The posterior uses n_eff.
  - **The estimand** of the slump and re-promotion decisions is the learner's cold p on **fresh cells** of the tier (not the mean of the window's own cells). **ρ_c = 0.20 is kept by owner decision H12 as a cautious value:** against that estimand its 80 % interval over-covers (§9.1), which means fewer wrong slumps and a slower re-promotion. It is not "calibrated"; a value near 0.08 would be, and was not adopted. Refitting ρ from the calibration traces keeps this caution unless the owner decides otherwise.
- **The window** at tier t reads looks from passed cells at tiers ≥ t, matching rank. It holds looks from the last **90 days** only, and the last **30** looks within that. **Each decision uses only looks after the last decision.** It must contain:
  - ≥ min(3, the passed and established exercises at tiers ≥ t) distinct exercises;
  - ≥ min(2, the keys of those cells) keys, where keys apply, counting passed and established cells only.
  - **Areas without keys** (rhythm, voice, drum rudiments, small fixed-tempo tiers): breadth = min(3, the passed and established exercises at tiers ≥ t).
  - **If the window fails breadth,** no decision is made, and the slot injector picks the missing exercise or key among passed cells.
- **The posterior:** beta-binomial, prior Beta(1, 1), over the window, using n_eff.
- **Slump (current form drops):** when P(p < 0.5 | data) ≥ 0.95 over ≥ 8 looks on ≥ 2 days. **A slump drops exactly one tier.** Current form never slumps below T0. **Never inside a re-entry window.** Rank is never touched.
- **Fresh looks after each decision:** after any drop or rise, **including the rise when current form follows rank up**, the next decision at the new tier needs **≥ 8 fresh looks (raw n) on ≥ 2 days**, plus the n_eff-corrected posterior rule.
- **One decision per evaluation,** in this order: follow rank up; else the slump test at current form; else re-promotion toward rank.
- **Current form follows rank up:** current form is initialised from rank and capped at it. On a rank rise, current form = the new rank.
- **While placed** (rank = none or below `placedTier`):
  - current form = the highest tier where ≥ min(3, offered) exercises have a non-provisional threshold estimate (§1.9) ≥ 0.95 × target, capped at `placedTier`;
  - **non-laddered areas** (harmony, voicing, reading, voice, rhythm, grooves) use `placedTier` as current form until they have passed cells.
- **Re-promotion after a slump:** current form rises to current form + 1, capped at rank, when P(p ≥ 0.6 | data) ≥ 0.9 at current form + 1 (the harness may tune this). There is no 30-look cap for re-promotion; all looks since the slump within the last 90 days count (the ≥ 8 fresh looks rule above applies). Current form is not permanent, so no horizon target applies. It pays no XP.
- **Hysteresis:** re-promotion at P(p ≥ 0.6) ≥ 0.9 and the slump at P(p < 0.5) ≥ 0.95 are the two thresholds of current form (§1.1).
- **Unmeasured:** "unmeasured" at tier t = no passed cell at tiers ≥ t. Only re-promotion at the tier above moves it.
- **Inputs:** current form and display read the current input's series (§1.12). **After a change of input,** current form on the new series starts at rank and shows "new input" until 8 looks exist.
- **Wrong demotion** (current form dropped while the true p of the decision window's own tiers, on fresh cells, is ≥ 0.75): target < 5 % per 90 days of practice (§9.1; the harness measures 0.0 % at the v16 defaults).
- **Range:** the top of the range needs ≥ 2 clean cold takes on ≥ 2 days at that tier, and is capped at rank + 1. The width also follows §1.11.
- **Staleness:** a tier without cold evidence for 60 days shows "refresh" only. It never lowers rank.
- **Refresh, not demotion:** a failed cold check, and inactivity, only mark "refresh". Only the slump rule above lowers current form.
- **Skipped due checks are logged and read (v15; optional stopping by day):** when a session offered a due cold check (a working cell's counting check, a confirmation slot, an FSRS review probe, a guard probe or a pass probe) and the learner played the cell warm first, or left without playing it, the event log records `{cell, kind, day, skipped: true, how: 'warm-first' | 'unplayed'}`. **The rules read it:** a warm-first skip is always a miss, in the V1 share and the guard record, whatever the skip share (H15; §1.6, step 6); an unplayed due check is a miss in the guard record only while the skip share over 30 days is above 20 % (step 6). The skip share (warm-first and unplayed skips over due checks offered) is the gate for unplayed checks only. The skip share is also shown in the teacher view and kept for the calibration traces. Current form does not read skips (a slump needs real misses). The harness models these learners (§9.1).
- **Re-entry window:** it opens with the first practice day after a break of ≥ 7 days. It ends **per item** at that item's first FSRS-good review, or after 3 practice days for the area, whichever comes first per item (the harness implements it per item since v15). Cold takes in the window never count toward a slump, though they still mark refresh. **A break never causes a drop** (owner).

**Supply and slots**
- **A cap on confirmation slots across all areas (owner decision H13):** 2–4 **per session**, scaled by session length, **shared** by the areas practised in that session. The slots rotate across those areas by need and goal; with 5–7 areas per instrument, one area gets a slot only every few sessions.
- **The slots guarantee a minimum supply of looks;** FSRS review probes (passed cells due for review, a cold take at the probe band, **at most 2 per area per session**: the workout2 review quota is per area, which is what the harness models) and pass probes outside the slots also count as looks (above), under the same "first per cell per day, ≤ 2 per area per day" rule. Most of an area's looks therefore come from FSRS reviews (measured share in §9.1).
- **A minimal slot injector ships in step 1,** in workout2 / todayPlan. It is folded into need() (§5) in step 6. **The slot injector targets only passed cells.**
- **The probe band** is the only confirmation tempo: 0.95–1.0 × target.
- **Probe takes on non-due days** are not graded into FSRS (§1.9, §4.1).

- **§9.2's reliability gate exempts Phase A**, which is a transparent rule shown as such.

### 1.7a Challenge follows the working edge (owner decision H10)
- **Rank is a reporting milestone; difficulty follows the learner's working edge.** A flat rank never flattens the challenge.
- **The climb continues whatever the rank:** the tempo climb (a rise on every clean take; the over-target climb for anchors, §1.9), forms, feels and bursts (SP §15, §16) run as specified, whether rank moves or not.
- **A ready cell (v15: evidence, not one lucky take):** a cell is ready when **≥ 2 of its last ≤ 3 probe-band cold takes are clean** (its first cold takes of the day at the probe band: counting checks while working, looks and reviews once passed, skipped due checks as misses; at least 2 such takes, so on ≥ 2 days), **or** it has a non-provisional threshold estimate (§1.9) ≥ 0.95 × target. **Readiness is re-evaluated every session:** it decays when the evidence turns (two misses among the last three takes, or the recency-weighted threshold estimate falling below 0.95). A passed cell is ready at its pass (the V1 share) and stays ready while its looks hold. v14's sticky readiness on `established` (one clean counting check, ever) ratcheted a learner who stopped improving up to the + 2 cap on noise (round 18 #3; §9.1).
- **The working edge** has two parts, both computed from stored state (never from rank alone):
  - **content edge** = the highest **entered** tier holding a ready cell, and never below max(`placedTier`, current form); **it is capped at the highest entered tier** (after a `placedTier` drop it never sits above entry). (Current form is capped at rank, so it is only the floor; the ready cells above it are what let the edge rise while rank is flat.) Fixed-tempo areas (harmony, voicing, reading, voice, rhythm) have no threshold estimates, so their content edge rises through the recent clean probe-band takes of working and passed cells;
  - **tempo edge** = the cell's threshold estimate (§1.9); a new cell borrows the median non-provisional estimate of the same exercise, else of the same tier, else of the tier below scaled down one tempo tier per content tier (× 1/1.2), and starts at max(that, the item's start tempo), never above target. Fixed-tempo items have no tempo edge.
- **Readiness entry:** the next non-empty tier above the highest entered tier opens when ≥ min(2, the available exercises **of the highest entered tier**) distinct exercises **at that highest entered tier** have a ready cell. "The current tier" in earlier text means this: the highest entered tier (the entry ceiling of §1.3, plus any tier already opened on readiness), not the rank tier and not the base. It repeats tier by tier. Because readiness is re-evaluated, **readiness entry is re-evaluated each session** and can close again when the readiness behind it decays; cells already in the rotation stay, the tier-wide entry ceiling (§1.3) never falls (except through the placement correction), and manual choice is never limited. **The no-stacking cap is kept:** entry ≤ the second non-empty tier above max(`placedTier`, `rankHW`) (the "+ 2"). The tier-wide t + 2 opening (§1.3) still applies. Rank's "available" stays bounded by the tier-wide entry ceiling (§1.3, §1.7); passes on readiness-entered items count toward rank like any pass above (passes above count).
- **The challenge point** (the new / strengthen target tier) = the lowest entered tier at or above the content edge that still holds an available unpassed exercise (else the highest entered tier). New exercises are drawn with weight 6 at the target tier, 2 at the next non-empty tier above it, 0.5 below it, 1 elsewhere (harness weights, tunable); a new cell starts at the tempo edge.
- **No easier session:** the new / strengthen target never falls below the previous session's target (capped at the entered top). **This applies only to the new / strengthen quota.** The review and confirmation quotas (probe band, FSRS reviews, slots), the re-entry session after a break (§5), the first session after a slump of current form, the first session after a `placedTier` drop, **a session in which the entered top fell (readiness decayed, v15) and the struggle step-down below** are exempt; there the target is recomputed from the working edge.
- **The struggle step-down (v15):** the challenge must rise with ability, but stay appropriate: a learner who has stopped improving must not be held at items they fail. Every 21 days at most, the planner estimates the learner's **probe-band p at the current target tier** from its working cells over the last 21 days (a non-provisional threshold estimate read at 0.95 × target, else the clean share of their first cold takes of the day at the probe band; ≥ 8 cold takes needed). **When that estimate is < 0.25 and not higher than in the 21 days before** (a learner who is rising is progressing, not struggling), the challenge point **steps down one tier**: to the highest entered tier below the target, at or above current form, that holds an unpassed exercise or a passed exercise in a fresh key (strengthen work in new keys). Working cells above the new target are shelved (resumable, §1.7). The step holds, exempt from no-easier, until the estimate at the stepped-down tier reaches **0.5**; then the target rises one tier at a time, and the step ends when it meets the edge-based target. A further step down needs another 21-day window. (Harness: struggle 0.25, 21 days, recover 0.5; §9.1.)
- **Harness requirement and metric (§9.1, §18 step 1; the targets per kind of area accepted by the owner, H17):** offered frontier difficulty tracks true ability **up to the + 2 cap**. Difficulty of an offered take = content tier + ln(tempo / target) / ln(1.2). Over 4-week windows in which rank did not move and min(θ, cap) rose by ≥ 0.1 tier, the **flat-rank slope** Σ Δ(offered difficulty) / Σ Δ min(θ, cap) must be **≥ 0.7 in tempo areas**, and **≥ 0.6 in fixed-tempo areas with a mean lag min(θ, cap) − offered difficulty within ± 0.5 tier** (there the content tier, in whole steps, is the only axis, so a 4-week window often sees no step even while the offer sits at θ: v14 measured 0.61–0.67 with a lag of 0.1 tier), with no offer above the + 2 cap and no fall of the target in a non-exempt session. (Ability capped at the + 2 entry cap, and non-anchor tempo capped at target, mean "keeps rising forever" cannot hold; the metric is bounded accordingly.) **Appropriateness (v15):** for learners who do not improve (rate 0, tier p 0.5 and 0.75 at T2, the last 90 of 365 days), the offered items' mean fresh-cell probe-band p must be **≥ 0.35**, with **≤ 35 % of practice days** offering items below 0.3 (hopeless), in tempo and fixed-tempo areas. The measured values are in §9.1.

### 1.8 Phase B (later, shadow first): a psychometric model per learner × family
- P(clean | log nps, cold, input, minutes-in-session (`sessionMs`), time of day), with a hierarchical prior from the catalogue tier (AM #10).
- **Outputs:** the cold level with a confidence interval, the warm-up decrement, the fatigue slope, retention, and the SP §17 G rate.
- It is promoted to the source of truth only after the §9 validation shows split-half reliability ≥ 0.7. Until then Phase A is shown. Like the Phase A posterior, it drives only current form and adaptivity; rank stays H8 (§1.7).

### 1.9 The cold staircase and the threshold estimate
- **The staircase only chooses the non-confirmation cold tempo.** It replaces SP §2.5's cold-check tempo for every item that has a previous cold result, and the key-session cold check (SP §3's `max(0.9 × best, 0.95 × target)` is superseded). **The first cold check of an item uses SP §2.5.**
  - SP §17.3's "cold-check tempo, 0.9 × best" row is deleted; R drives the staircase step.
- **It moves from the previous cold results, never from the warm best.** The rule is **2-up-1-down** (Levitt), which tracks ≈ 70.7 % cold success:
  - 2 consecutive clean cold takes → +1 step;
  - 1 miss → −1 step;
  - **step** = round(base marks × R multiplier), snapped to the metronome grid, minimum 1 mark. The base is 2 marks until the first reversal, then 1;
  - the step size is re-fit later from the trace SD of the cold tempo.
- **Unpassed items:** the cold tempo = max(staircase, round(0.95 × target)) once `cleanBpm` ≥ 0.95 × target. That branch is the pass probe, and it stays. **After a pass-probe take, the staircase resets to the tempo actually played.**
- **Floor for passing:** a cold take below 0.95 × target can't pass (SP §4.2 unchanged).
- **Passed cells:** every scheduled confirmation take plays in the probe band (0.95–1.0 × target). The staircase moves only the non-confirmation cold tempo.
- **Above target (passed items, anchors only):**
  - **the cold cap** = min(the item cap from SP §15.3, 1.25 × target). It is never the warm session `limit`;
  - **non-anchor passed items stop at target.** They are excluded from the plateau measure;
  - **above-target takes, clean or miss, are never confirmations** (§1.6). **A miss above target is censored:** no FSRS lapse, no confirmation miss, no drop. It only moves the staircase.
- **FSRS vs staircase:**
  - on an FSRS-due day, an item's cold take is the **review probe at 0.95–1.0 × target**, and it is graded into FSRS (§4.1). FSRS maintenance grades only this take at ≤ target. **Probe takes on non-due days are not graded into FSRS** (§1.7);
  - the above-target staircase take is the next cold take on another day. It feeds only the staircase and the threshold estimate.
- **The threshold estimate is separate from the tempo choice:** a **MAP logistic fit** over the cold trials at their actual tempos:
  - the slope is fixed from the catalogue tier (a prior);
  - the threshold prior is centred on the item's start tempo;
  - trials are recency-weighted, with a half-life of 10 days;
  - the posterior SD is reported;
  - **before 6 trials** the estimate is "provisional". Momentum and record XP never pay from a provisional estimate.
- **What reads the estimate:** Momentum "cold rise" (the all-time high-water of the non-provisional estimate, paid only on a rise of more than 1 posterior SD above its previous high, §3), the cold "record", SP G and R, readiness entry and the challenge point (§1.7a), and Phase B. SP A12 is amended: G reads the threshold estimate. **The plateau test reads the raw cold points, not the estimate** (§6.2).
- **Fixed-tempo items have no staircase.** Their cold measure is accuracy (SP §15.2).

### 1.10 Rank, current form and display
- **The areas per instrument:**

| Instrument | Areas |
|---|---|
| Piano | scales, arpeggios, independence/finger, harmony/voicing, line-jazz, reading, rhythm/time |
| Guitar | the same as piano |
| Bass | scales, arpeggios/chord tones, walking/groove, reading, rhythm/time (3 laddered areas; the key ladder maps the scale's forms, the hands and Harris's scale language → scales, the spine and arpeggios → arpeggios/chord tones, the changes and walking → walking/groove; the harness scores bass this way since v14) |
| Drums | rudiments, coordination, grooves/styles (timing SD is folded into grooves: time is part of the groove level), reading |
| Voice | pitch, time, range/agility (comfortable tessitura, never extremes), harmony (round 10's "pitch and time" applies to the mapping of voice learn-a-tune steps only) |

- **New families map to an area, or are "coverage only"** (coverage never enters level). **Guard test:** every family × instrument resolves to an existing area, or to coverage.

| Family | Area |
|---|---|
| Learn-a-tune steps | transfer forms only: the instrument's line or harmony area, by step (see below). **Voice:** pitch (melody) and time (rhythmic placement); a sung new key is not counted as transfer. The non-transfer steps are coverage on every head |
| Accompanying a singer | harmony / voicing (transfer forms only; see below) |
| Pop levels | harmony / voicing (transfer forms only; see below) |
| Bass transfer evidence | melody or lick at sight → scales; roots, guide tones or walking at sight, and chart at sight → walking/groove |
| Drums transfer evidence | kicks and set-ups inside the form → grooves/styles; head or chart at sight → reading |
| Drum balance and soloist work | drums grooves/styles |
| Groove Match | a game: need and coverage only, never level (§1.2, §13.2) |
| Jazz reading ladder | reading |
| Capstones, composition | coverage only |
| Voice registration, text and diction | coverage only (hint-only) |
| Improvisation story ladder | coverage only (descriptive) |
| Free improvisation | coverage only |
| Trading 4s (§8.4) | coverage only |
| Listening lab and Ear capstones | `repertoire-memory` and coverage, never the Ear course skills |
| §14 PD repertoire and piece-coach pieces | coverage only |
| Licks, Encore phrases, repertoire drills | coverage only (memorised material; SP §4.2's old pass rule) |
| Unseen rule-generated licks at sight | the instrument's line-jazz area (transfer forms, §1.6) |

- **Memorised material never feeds level:** the non-transfer learn-a-tune steps go to coverage on every head, a first-time head included; on a head the learner has already played, learn-a-tune steps, k-pop and k-accomp-voice go to coverage and `repertoire-memory`. They never feed area level or rank. Licks, Encore phrases and repertoire drills are coverage only for rank (they keep SP §4.2's old pass rule). **Only transfer forms feed level:** a new key from memory (learn-a-tune step 8, §8.4; not on voice, where relative pitch makes a sung new key trivial), a chart at sight, an unseen head (§1.6), an unseen rule-generated lick at sight. They pass by the transfer pass rule (§1.6), and a tier pass counts as one exercise per family toward rank. **Guard tests** check this, including that a warm lick pass never raises rank.
- **Rank** = the highest tier t passing the §1.7 test (owner decision H8 with the harness decisions: ≥ 2 distinct exercises always, normally min(3, available exercises in tiers t … the entry ceiling), small tiers grouped, ≥ min(2, available keys) keys, ≥ 1 pass at t). Rank, course DYN and friend level read rank, which never falls. So rank = hardest items beaten holds (promotion-not-full-bars).
  - Passes (`passedAt`) show at once on the path and the matrix, and raise rank directly. Rank takes about 1–3 weeks per tier, depending on practice (the harness reports it per area, §9.1). Nothing ever looks lost.
- **Rank over inputs:** changing input never lowers rank; a lenient input can't inflate it (§1.7, §9.1).
- **Current form:** the current cold level, per input, shows separately beside rank as "current form" (the posterior, §1.7). It can show refresh, a lower tier after a confirmed slump, or "unmeasured" on a tier with no passed cells.
- **Placement** shows as "placed: T5" until rank reaches it (§1.3). It sets entry only, never rank.
- **Technique rank** = the 2nd-best instrument area's rank, so one narrow area can't carry it. With one area only, that area.
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
- **Top tiers:** T7–8 has no content today (`LadderRung.min` runs 0–6). Until it does, the DYN table caps at the highest tier with content, so "ff" means the top content tier. Adding T7–8 content is an owner backlog item (§17.5).
- **Friend level** = the course DYN.
- **The bar to next** = the passed exercises toward the next tier ("2 of 3", plus the keys). It never moves backward, and it is never full below Master (§1.7).
- **Friend comparisons** show level and effort separately (§3).
- **Repertoire** (an axis beside rank, never mixed into it):
  - **per course:** the hardest difficulty card, plus the number of tunes and pieces completed to the cold memory step and kept up by piece FSRS (§4.3);
  - **shown** on the profile and the course page as "Repertoire: N tunes, hardest T4";
  - **it feeds** Momentum (a new tune completed, §3) and goals (§6.1). Never rank.

### 1.11 Uncertainty, refresh and breaks (AM #8)
- **Nothing falls from inactivity** (owner: a drop comes only from measurement, never from a break). Rank never falls at all; current form drops only by the slump rule (§1.7). This is consistent with promotion-not-full-bars and SP "passed stays passed".
- Each area's current form carries a Glicko-style deviation that grows with the time since the last cold evidence: +1 tier of range per 60 days without evidence, at most ± 2.
- Inactivity shows "refresh" and a wider range, and the planner raises a **refresh probe** when the range is wide: one cold check of the level tier. The probe is absorbed into need (§5).
- **One break table:**

| Break | Effect |
|---|---|
| ≥ 7 days | re-entry session (§5) and the slump re-entry window (§1.7) |
| > 10 days | rate speed-ups paused |
| > 21 days | rate multipliers halfway back |

### 1.12 Input awareness (AM #12)
- `src` (the input) is stored on every take record, passLog entry, cold entry and rating event.
- **A cold series never mixes inputs.** A change of input starts a new series, and the old one is kept. Current form and display read the current input's series; another input's higher level is shown as a note, e.g. "ff on MIDI". After a change of input, current form on the new series starts at rank and shows "new input" until 8 looks exist (§1.7).
- **Rank is not split by input:** changing input never lowers it (§1.7, §1.10). **Passes and the tier guard's record are per cell, not per input:** comparable takes from any input build one cell's pass and one guard record; "a cold series never mixes inputs" governs current form and its display. **A not-comparable take** (SPEC-INPUT-SOURCE R5/R6: a mic take on a keys item that expects MIDI, or a mic take with < 40 % of notes matched where MIDI was expected) **never counts**: not as a counting cold check, a pass take, a guard entry or a look.
- **Mic learners:** dynamics, pedal and release strands are excluded from their level and labelled "needs MIDI". They are never counted as missing, and stay excluded for mic series.
- **Per-input jitter** widens timing thresholds by the measured noise only (SPEC-PRACTICE-INTELLIGENCE §9א).
- Guitar, bass and drum calibration logs upload for calibration accounts, like the piano traces (0.145.8).

### 1.13 The instrument Elo
- **It is kept only as a smooth "practice form" signal on the item page. Nothing reads it for level.**
- **Difficulty** = the item's content tier c (scales: the nps tier) mapped 600 + 100 · c, with the tempo term 40 × (pace − c), clamped to ± 2 tiers. The RL +60 is kept. The phrase formula is mapped onto the same scale. The 100 and 40 coefficients are fitted later by a logistic fit on the traces.
- **Score** follows the verdict: clean 1, almost 0.5, not 0. Timing is part of the verdict.
- **One rated event per item per 1-hour cold window** (not per session, because a restart can't create a new window). This applies to instrument areas only; Ear trials keep per-trial events. **Only cold events feed the instrument Elo.**
- Old events are refolded under the fresh-start epoch (§1.15).

### 1.14 The Ear course level and evidence routing (AM #4, a bug)
- **`courseRating('ear')`** reads only **`EAR_COURSE_SKILLS`** = EAR_SKILLS + theory, notes, rhythm-reading, transpose. It never reads `overallRating`.
- **SPEC-EAR-INTELLIGENCE governs the Ear level itself**; §1 applies to the instrument areas.
- **The `*-ear` instrument families** (`k-ear`, `g-ear`, `b-ear`, `d-ear`: intervals, dictation, transpose, tonic) are **whitelisted** into the Ear course skills, weighted by trial difficulty. They are real ear evidence.
- **Other drill and lick events never write Ear course skills.** Their secondary tags (`secondTag`: timing, meter, chords, cadences, form, dictation, rhythm-dictation) go to instrument sub-skills instead (e.g. `instrument/timing`).
- **Self-prediction (§7)** feeds its own skill, `self-calibration`, never the Ear rating.
- **Head-slice dictation, head-based sight-singing, "tunes you know", the listening lab and Ear capstones** write to a `repertoire-memory` skill (and coverage), never the Ear course skills (§13.5, §1.10).
- **Guard tests:**
  - a non-`*-ear` drill take changes no Ear course skill, no Ear Index and no Ear path frontier;
  - a `k-ear` take does change the Ear course skills;
  - theory and exam-prep evidence still moves the Ear level.
- **The Elo of Ear skills still never decays;** this is deferred explicitly to SPEC-EAR-INTELLIGENCE.

### 1.15 Data model and migration
- **`RatingEvent` gains** `item` (item or contrast id), `src` (input) and `cold` (written at creation; refolds keep it).
- **Each cold entry stores** `{at, bpm, clean, gap, src, cell, contentTier, target, inBand}` at the time of the take. **Re-targeting never rewrites history.**
- **The look log** (§1.7, for the current-form posterior) is derived per area from the cold entries. It is not stored separately.
- **Each `passedAt` record stores** `{contentTier, target, exerciseId, src, at}` at pass time (§1.7).
- **New per-cell `lastSound`** (§1.4), **`cellPass`** for voice, rhythm, reading and transfer (§1.6), **`placedTier`** per area (§1.3), and a synced **`rankHW`** per area (§1.7).
- These are synced fields. **No users yet, so a fresh-start epoch** (memory: fresh-start-round) is the migration. It is done once, when §1 ships.

### 1.16 Governance: SP sections amended
This spec amends these SP sections. SP is edited to point here at each of them (SP §22, updated to the v9 section numbers, which v10–v13 keep); **the pointer edits are done before step 1 starts, as a doc commit**:
- §2.5 (cold check: the staircase, §1.9);
- §3 (`lastSound`; the cold check order: the main item's cold check before any other sounding take of the cell, coordination stages included, §1.4; `max(0.9 × best, 0.95 × target)` superseded);
- §4.1 (`lastSound`, per cell; the `lastQual` gap superseded, `lastQual` kept only for the ≥ 1 h re-measure rule);
- §4.2 (passes kept, `passedAt` sticky; passes set rank, §1.7 (H8); the later-day cold take needs ≥ 8 h and a different local day; the pass is variant V1 (H9): 3 counted clean on ≥ 2 days, 2 clean first-cold takes of the cell's main item on two distinct later days, and a clean share ≥ 2/3 over the last ≤ 6 counting cold checks, §1.6; licks, Encore phrases and repertoire keep the old rule and are coverage only for rank, §1.7, §1.10);
- §9 ("promotion by day 2–3" means the **item pass**, not a tier promotion);
- §14 (the area-tier definition is superseded by §1.3 `areaTier` and §1.7 rank);
- §14 / §15.5 (the entry rule, readiness entry and `placedTier`, §1.3, §1.7a; cross-session prerequisites read `established`, in-session forms follow D2 / A10 `acquired`; "acquired" as the cross-session gate superseded);
- §14 items 35 and 37 for guitar and bass (§13.1);
- §15.4 (burst trigger: no new clean session peak in 3 sessions on ≥ 2 days);
- §15.5 / §17.3 ("band step" means a tier step; the rate's entry shift is capped at +1, and entry never exceeds max(`placedTier`, `rankHW`) + 2, §1.3);
- §16.5 (straight-only: a take in the item's native feel counts as straight, §1.4);
- §17.3 (the "cold-check tempo, 0.9 × best" row deleted; R drives the staircase step);
- A3 / A8 (the beginner by placement content band; `paceTier` only for timing tolerances and stretch; the A8 "≥ 3 cold takes" switch deleted);
- A12 (G reads the threshold estimate).

---

## 2. Quick fixes (H1 step 2)

| # | Fix | Where |
|---|---|---|
| Q1 | The Ear course level reads only the Ear course skills (§1.14) | courseSocial.ts:125 |
| Q2 | The stretch "push" band requires ≥ almost. A miss pays ×1 at most. | stretch.ts:101 |
| Q3 | "Record" XP and Momentum tempo records count only cold takes, reading the §1.9 threshold estimate; never from a provisional estimate | stretch.ts, momentum.ts |
| Q4 | **The plan bonus:** finishing today's planned rotation visits and their cold checks earns a Momentum `BONUS_XP` entry, once a day. It requires the session's planned length (`sessionBonus`); `WEEKLY_LIMIT.plan = 7`; its size is the smallest value that passes Q6. | momentum.ts (`BONUS_XP`), sessionReward.ts |
| Q5 | Quests come from today's plan, e.g. "Today's first-take check in your key of the week" or "The cold take of last week's key", instead of activity counts. The drum "rhythm 5×" quest counts drum takes, not rating events. | quests.ts |
| Q6 | **A simulation test, Momentum included:** a learner who follows the rotation earns ≥ the XP of a linear peak-chaser over 10 sessions; and the test fails a player who out-earns real practice with cold checks only. It also measures the Momentum high-water false-payout rate. | tests |

Contour Draw (§13.2) and the physical-approach briefs (§15) also ship in step 2.

---

## 3. Rewards follow the plan, levels follow cold evidence (AM §6)
- **XP pays for effort spent as planned.** Clean and almost takes earn XP; misses earn the base only. Burst takes earn nothing (SP §18.1).
- **Level and rank** come only from §1.
- **Momentum pays for cold progress:**
  - a rise in the cold level;
  - a cold-confirmed close;
  - a due review passed cold;
  - a new tune completed (the repertoire axis, §1.10).
- **Promotion XP and Momentum "cold rise" pay only above the all-time high-water mark.** Promotion XP pays once per rank tier gained, under the Q6 caps (rank never falls, §1.7); current-form re-promotion pays no XP (§1.7).
  - **Momentum "cold rise"** reads the all-time high-water of the **non-provisional** threshold estimate (§1.9), and pays only when the estimate rises by more than 1 posterior SD above its previous high. Momentum and record XP never pay from a provisional estimate.
- `GAIN_WEIGHT.rating` reads rank's rises (§1.7). Momentum `statusUps` and `rating` read cold.
- **Leagues** stay effort-only (capped weekly XP). League XP never enters a level.
- **Friend comparisons** show level (§1) and effort separately.

---

## 4. Retention and spacing everywhere (AM #6, #7)

### 4.1 Technique maintenance
- **Every review take of a closed cell is a cold take** (SP §4). On an FSRS-due day it is the review probe at 0.95–1.0 × target (§1.9). Probe takes on non-due days are not graded into FSRS (§1.7).
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
| Distance | 0.45 | the gap between the item's difficulty (content tier, then tempo) and the learner's **working edge**: the content edge (the highest entered tier with a ready cell, floored at max(`placedTier`, current form)) and the tempo edge (the threshold estimate, §1.9), never rank alone (H10, §1.7a). Items at the challenge point score highest. In the new / strengthen quota the target never falls below the last session's (re-entry, the session after a slump and the session after a `placedTier` drop exempt); the review and confirmation quotas are not bound by it. |
| Forgetting | 0.35 | from FSRS or the §1.11 deviation. **Unpassed items:** time since the last qualifying take ÷ the R-by-gap curve (this carries `back2`). |
| Goal | 0.2 | the learner's goal (§6.1) and the style focus. A recurring weekly-profile pattern adds to the goal weight of matching items; a low teacher rubric score (§12.1) adds to it too. |

- **New items** are ranked by goal, behind the readiness gate, so a new item can always be chosen.
- **It absorbs** SP `back2` and the refresh probe (§1.11).
- **Confirmation slots:** a cap across all areas of 2–4 per session, scaled by session length, shared by and rotating across the areas practised that session by need and goal; FSRS review probes count as looks besides the slots; confirmation takes play only in the probe band (0.95–1.0 × target) (§1.7).
- **The guard reserve:** one working slot per session for a fresh check at a tier where the rank tier guard still fails (§1.7 step 6). The minimal step-1 slot injector (workout2 / todayPlan) is folded into need() here, in step 6.
- **The rotation set** fills in need order. The entry rule (§1.3), with readiness entry (§1.7a), limits only the rotation and the planner, never manual choice.
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
  - **a goal tune or goal skill with a date**, e.g. "My Blue Heaven by June" (a served 1A head; goal tunes come from the learner's region pool, 1B included for US learners, §8.1), "Autumn Leaves with a singer by June" (a charted standard in the by-ear variant, §8.4), a target tier in an area, or an exam date in exam mode (optional);
  - **minutes per week.**
- **The repertoire axis** (§1.10) feeds goals.
- **A goal tune is complete** when the memory step of the learner's band variant of learn-a-tune (§8.4) passes cold. **In the by-ear variant** (any charted standard, §8.3), completion = chords from memory (cold), graded against the learner's "my chart" with functional equivalents accepted (§8.4), + a self or teacher melody check.
- **A goal "with a singer"** is offered only when a studio singer, or a bank take for that head (§8.9), exists. It completes only with a human singer's take (§12.3).
- **The projection** (projection.ts): a target-tier goal projects by passes per practice hour; a tempo goal by G (the cold rate × the actual minutes, using the prior rate, SP §17.2, until G is estimated). It shows on Today as one line, "On track for June" or "2 weeks behind at this pace", and gives `need` its goal weight.

### 6.2 Plateaus
- **One definition, on the raw cold points:** the slope of the cold tempo (continuous, not tiers) over practice-hours, with its CI, is ≈ 0, with confidence: ≥ 6 cold points over ≥ 10 days. It uses the raw cold points, not the smoothed threshold estimate (§1.9).
  - Passed anchors count through their above-target staircase takes. Non-anchor passed items are excluded.
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
  - **Input:** a MIDI key (low = no, high = yes) or a voice "yes/no" works as well as the tap, to stay hands-free. **The same input** serves the by-ear melody self-check (§8.4), the performance self-rate (§12.4) and the rubric self-rating (§12.1).
  - The tap is the only exception to hands-free; the step is optional and can be turned off in settings.
  - It feeds its own skill, `self-calibration`, never the Ear rating (§1.14).
  - The §11.3 strategy choice uses this same slot.
- **The self-comparison line** (SP §17.5) runs in every area, at most weekly.
- **Transfer probes:** the **transfer index** per family = the clean share of first takes in an untried key, or on a new item of an acquired family, at the item's start tempo, over the last 10 such takes. It is shown to the teacher.

---

## 8. Real music (H1 step 4)

### 8.1 Rights and the region gate
- **Tiers:** every served melody, lyric and recording carries a tier:
  - **1A** = US PD + life+70, by default. `servable()` checks `pdFrom` per term class;
  - **1B** = US-only.
  - `heads.ts` entries carry `tier` and **`pdFrom` per term class:** life+70, life+75, life+80, life+99, life+100. (life+75: Guatemala, Honduras, Samoa.)
  - **The tier uses every credited author:** the **latest death year among all credited authors, lyricists included**, unless the lawyer rules otherwise (§17.1). E.g. Honeysuckle Rose (Razaf, died 1973) is **1B**: US only, protected in life+70 countries until 2044. **Guard test:** a head credited to authors who died in 1943 and 1973 is never 1A.
- **`servable(content, region)` is the only path to playback or display.**
  - **The region signal** = the stricter of the account country and the store/IP country.
  - **Unknown region →** only items PD under the longest term class (life+100), plus the H4/H5 region-safe pool. The region-safe pool (practice heads, songbook, voice melodies, licks, charts) carries these users.
  - 1A content serves everywhere except where a long term still runs; 1B serves only in the US allow-list (STANDARDS_LEGAL).
  - **Long-term countries:** `servable()` denies 1A heads in long-term countries (Mexico, Colombia, Côte d'Ivoire, Spain for authors who died before 1987, the life+75 countries, and others on the list) when the author died within that term, until the lawyer clears the rule of the shorter term (§17.1).
  - **A rule with a guard test:** every real-music feature draws from the learner's region pool: learn-a-tune, capstones, tune of the week, head dictation, the level-test tune section, contrafact pairs, goals. The guard test walks every content consumer, including lyrics (§11.2), First-phrase recall, "tunes you know", EAR v2 songs-by-ear and sight-singing, recordings of 1B compositions, and the per-language folk songs.
  - **A verify / preview mode** lets the owner see 1B heads from Israel while checking them.
- **The recording test (§303), one rule for every work on the recording.** `servable(recording)` requires all of:
  - (a) the recording itself was released in 1925 or earlier, by **release date**;
  - (b) **every author of every work on it** (composition, arrangement or improvisation), not only featured soloists, either:
    - published or registered that work in 1930 or earlier; or
    - **if the work is unpublished** (§303(b): selling a pre-1978 record did not publish it), died in 1955 or earlier (e.g. Baby Dodds, died 1959, and Armstrong, died 1971, among the improvisers on the King Oliver sides);
  - (c) **for every unpublished work on it** (17 U.S.C. §303(a); PD-JAZZ-SOURCES §3.3):
    - **no authorized publication between 1978 and 2002;** if there was one, the work is protected through 2047;
    - **not a work made for hire;** if it is, the term is 120 years from creation (a 1925 work runs to the end of 2045);
  - **where any of these facts is unknown, the recording is not servable** (conservative, like the rest of §8.1);
  - in long-term countries, `pdFrom` uses the latest of those authors' death years;
  - 78-rpm transfers must come from a PD-clean source;
  - phrase source flags follow the same test (§8.10).
  - **Guard tests:** a 1924 band side whose arranger died in 1964 is never servable; a side whose improvisation was published in 1982 is never servable; a side carrying a 1925 work-for-hire arrangement is never servable before 2046.
- **Denied regions keep "learn it by ear":** an embed, a chords-only chart, and a self or teacher check, with no melody served. (The by-ear mode is also offered everywhere, §8.4.)
- **Content served is the ≤ 1930 print's only,** with its print year and publisher recorded. Later verses and later lyrics are left out.
- **"Folk/trad" entries** get the same print-year and author check as heads (e.g. the Hava Nagila lyric credit).
- **A lyric curation pass** removes period lyrics that are offensive today. It applies to 1A songs too.
- **Lyrics:** only for songs published ≤ 1930, verified against the period sheet, used in voice items (§11.2).
- **The region-safe pool** (every region): the 1A heads (where no long term runs) plus the H4 items (songbook incl. its 7 originals, voice-course songs, rule-generated licks) and the 5 app-written practice tunes (H5).
- **Chord-only charts of standards** (H6, H7) serve everywhere; protected melodies are never served.

### 8.2 Real heads (AP #1)
- **About 20 heads, each transcribed and verified against a period sheet. 1A first.** The core and beginner heads come from STANDARDS_LEGAL §2.1, as "US PD + tier". Each must be confirmed 1A and verified:
  - **beginner:** Bill Bailey, Ain't We Got Fun, Yes Sir That's My Baby, Somebody Stole My Gal, Nobody Knows You When You're Down and Out, spirituals, When the Saints;
  - **core:** Rose Room, Avalon, Japanese Sandman, Love Me or Leave Me, Mean to Me, My Blue Heaven, If I Could Be with You, King Porter Stomp, Charleston, Indiana.
  - The served "beginner" and "core" labels are derived from each head's difficulty card (below), not hand labels.
- **1B (US-only)** is an additional layer on top for US users, e.g. Body and Soul, Star Dust, I Got Rhythm.
- **King Porter Stomp** is used through its trio strain for non-piano learn-a-tune; its difficulty card places it.
- **Traditional tunes with no period print** (When the Saints and some spirituals): the verification source is a hymnal or jubilee print from 1930 or earlier, **or** a transcription from a recording that passes the §8.1 recording test. If neither exists, the tune is not served as a head.
- **The US-PD candidate list, each to be checked and given its tier** (by the latest credited author, §8.1): Sweet Georgia Brown, Tea for Two, Honeysuckle Rose (**1B**: Razaf died 1973), Ain't Misbehavin' (**1B**: the governing year is Razaf's, died 1973, with `pdFrom` set from 1973; co-composer Harry Brooks died 1970), What Is This Thing Called Love, Softly as in a Morning Sunrise, Lover Come Back to Me, Star Dust, Body and Soul, I Got Rhythm, Embraceable You, But Not for Me, Georgia on My Mind, St. Louis Blues, Basin Street Blues, Bye Bye Blackbird, Blue Skies, Someone to Watch Over Me, 'S Wonderful. Mood Indigo (1930/31) is checked for its print year.
- **1A heads for the other styles, to verify:** choro (Ernesto Nazareth, died 1934, and Chiquinha Gonzaga, died 1935; Pixinguinha died 1973, so his prints are not 1A until 2044), tango ("La Cumparsita" 1916: check its author term class), blues (W. C. Handy, died 1958: 1B, so other blues for 1A).
- **The workflow** is the `verify` flag in heads.ts: I transcribe, and the owner checks each note before the head is served (owner task, §17).
- **The legal note** in heads.ts changes from "PD worldwide" to "US PD (published ≤ 1930)", with the per-head tier and `pdFrom` per term class. **`HeadLicence`** gains `tier` / `pdFrom`, replacing `pd-worldwide`. The superseded comment banning I Got Rhythm and Body and Soul is removed (build task, step 5).
- **Each head stores** an "as printed" melody, a jazz chart, and a reconciliation note. Swing comes from the feel layer (SP §16), not from rewriting the melody. **Period-print dotted pairs** are accepted played straight-dotted or swung under the feel layer.
- **Each head gets a difficulty card,** computed from the §1.2 reading features (syncopation, intervals and texture included) + range + harmonic rhythm + chromatic-note share, mapped to a content tier.
  - Learn-a-tune, goal tunes, tune of the week and section suggestions match heads to the learner by this tier.
  - It joins the course-change checklist (§16).
- **Region-safe filler:** the songbook originals, voice songs and lick bank (§0 H4), and the 5 app-written jazz heads (Corner Bench, Long Way Round, Back Porch Blues, Night Ferry, Quiet Hours) as **clearly labelled practice tunes, never presented as real repertoire** (§0 H5). Each lick and original head records where it came from.
- **STANDARDS_LEGAL gets a note** (a doc edit): its proposed app-written contrafact heads (e.g. row 46) are **not approved**; only the 5 labelled practice heads are (H5).

### 8.3 Chord charts
- **The charted-standards library grows broadly, beyond about 120 standards** (H6): all the major standards in every genre, Latin included (H7). Charts are chords only. **The melodies of protected (post-1930 or 1B-elsewhere) tunes are never served.**
- **Chart policy (H6, H7):**
  - any standard may be used **by title**, with the app's own chord chart, **built from analysis, never copied from fake books or chord sites**;
  - **many variations per standard,** never one fixed reharm or voicing;
  - every chart, standards and pop, has a **source (provenance) and a human verifier**, like heads;
  - **a verify screen** shows the source beside the engraving;
  - the verification time is budgeted as an owner task (§17, §18 step 5);
  - each chart goes with official-recording embeds (§10.1) and the by-ear learn-a-tune variant (§8.4).
- **The chart difficulty card** (for charts with no served melody) is computed from harmonic rhythm, the share of non-diatonic chords, key-centre changes, the set of chord qualities, form length and key distance, mapped to T by quantiles. It feeds transfer tiers (§1.6), by-ear goals (§6.1) and section suggestions (§13.1), and joins the course-change checklist (§16).
- **"Harmony is the work" care** (few songs, chords only) is kept only as a note on very idiosyncratic modern writers (e.g. Collier, Steely Dan, some post-bop / Shorter charts) (H7, §11.1).

### 8.4 Learn a tune (AP #2)
- **One protocol per head, in all courses (band 2+):**
  1. listen: the YouTube embed of a recording first (H3), then the app's clean version; **click-to-play only** (an allowed listening exception to hands-free, §16). An item without an official recording uses the app's clean version only;
  2. sing it (§16 syllable rule); instrumentalists' singing is graded octave-equivalent, with the lenient singing tolerance (singing-timing-first), so non-singers are never stalled;
  3. play the melody;
  4. roots;
  5. guide tones;
  6. melody + shells (piano), or, on guitar, melody and shells alternating at band 2 and played together (chord-melody) at band 3; on bass, the bassist walks or plays roots while the app plays the melody, or while singing it, and only the bass line is graded, against the chart; or melody over the band (voice, horn-style);
  7. **from memory**: the chart and melody hidden, graded on the same items, **cold, ≥ 8 h after step 6**. It creates a **pending memory check** that shows on Today and resumes there. **At bands 1–2** the step is "as printed"; **at band 3+** structural notes are graded (paraphrase DTW alignment), so idiomatic embellishment is accepted;
  8. **a new key from memory**, in 2 more keys: the chart and the melody stay hidden, as in step 7; only the new tonic is given. It is transposing by ear and from memory, not reading, and it is a valid key-transfer form (§1.10). **Voice:** "find your key" from voiceRange, then one more key (a sung new key is not counted as transfer, §1.10);
  9. solo on it (§10.3).
  - **Head melody timing at band 3+** has a loose-timing tolerance: anticipations and laid-back entries are accepted. Interpretation is left to rubrics (§12.1) and the story ladder (§10.3).
  - **Voice variant:** steps 3–5 = sing the melody, then the roots (a sung bass line; octave displacement into voiceRange is accepted), then the guide tones (sung). **Sung guide tones** are gated on a voice harmony-area 7th-chord item (sing the 7th-chord arpeggio), the equivalent of the piano k-sharm gate. **Melody passes:** the syllable or degree-number pass comes first, then **"sing with the lyric"**, wherever a servable lyric exists (the region gate applies); the memory step includes the text.
- **Per band:** band 1 uses its table; band 2+ uses the full protocol.

| Band | Steps |
|---|---|
| 1 | listen (embed) → sing → melody → roots → melody + LH roots → triads → memory (cold). **Variants:** voice: sung melody → sung roots → sung guide tones; guitar: bass notes on strings 6/5 + triads; bass: roots on 1. |
| 2+ | the full protocol above, with guide tones and shells gated on the k-sharm 7ths / shell families (guitar `g-shells`; bass walking) |

  - A step whose prerequisite isn't `established` is skipped, never locked.
  - **Goal completion** = the memory step of the learner's band variant (§6.1).
- **A by-ear mode** is offered everywhere: embed → sing → find → play, with the score hidden. It is not only the denied-region fallback.
- **The by-ear variant for every charted standard** (H6): any charted standard (§8.3) can be a goal or a learn-a-tune target in a by-ear variant: embed + chords-only chart.
  - **The reference:** the learner (or the teacher) picks one chart variation as **"my chart"**. Grading accepts functional equivalents: a tritone sub for V7, ii–V for V, inversions, extensions;
  - **melody steps** are self- or teacher-checked (the self-check uses the §7 MIDI-key or voice yes/no input), never served or graded against a stored melody;
  - **graded steps:** roots, guide tones, shells, chords from memory;
  - **completion** = chords from memory (cold) + a self or teacher melody check (§6.1).
- **Modal and Coltrane forms** are learned only through the by-ear variant, in every region: their melodies are protected in the US too.
- **Rhythm changes:** the I Got Rhythm melody (1B) is served in the US only; elsewhere rhythm changes are learned by ear.
- **Drums:** sing the head while keeping time, then kicks and set-ups from the head, then trading 4s inside the form.
- **Trading 4s inside the form** is also added for keys, guitar, bass and voice. It is coverage only (§1.10), like the story ladder and free improvisation.
  - **The other player** (trading 4s and responsive comping, §8.7) comes from the §13.6 sources: rule-generated licks, PD lines, or a teacher or the human model bank (§8.9). Otherwise the learner trades against drums only, or the 4 bars are left silent. **Never an app-improvised soloist.**
  - **The lick-bank "soloist"** plays bank licks **as they are**: no generative phrasing, no reactive density. This keeps it out of the forbidden AI band.
  - **It must fit the changes:** only a lick whose source progression matches the 4 bars' chords (a functional match) is chosen, then transposed to the key. Choosing and transposing are not generative phrasing. If no lick matches, it falls back to drums only or silence.
- Each step is a fixed-tempo or laddered item per SP §15. Step 7 is the memory modifier (SP item 30), raised to H for tunes.
- **The score** shows in 4–8-bar windows with the playhead (one screen).
- **A harmonic map page per tune:** key areas, ii–V brackets, the turnaround, the form. It is shown before step 4 and hidden at step 7.
- **Area:** only transfer forms feed level (a new key from memory in step 8, except on voice; a chart at sight; an unseen head), passing by the transfer pass rule and mapped to the instrument's line or harmony area by step (§1.6, §1.10). **The non-transfer steps go to coverage on every head,** a first-time head included; on a head the learner has already played they also go to `repertoire-memory`. They never feed area level or rank. **Voice** learn-a-tune steps map to pitch (melody) and time (rhythmic placement).
- **Contrafact pairs** show the PD head's melody (region-gated), the bebop tune's chord chart only, and an official embed and a by-ear option. **The gate depends only on the PD side,** whose tier follows the latest credited author (§8.1). **The contrafact card says that outside the US most pairs are by-ear:** only the Indiana side is 1A.
  - Hot House ↔ What Is This Thing Called Love;
  - Donna Lee ↔ Indiana;
  - Anthropology ↔ I Got Rhythm;
  - Scrapple from the Apple ↔ Honeysuckle Rose (the card notes that only the A sections match; the bridge is I Got Rhythm; Honeysuckle Rose is 1B, so outside the US this pair is by-ear);
  - Dig ↔ Sweet Georgia Brown.

### 8.5 Tune of the week and revisits
- **Tune of the week in the key of the week** (RP N1): a served head in the SP key of the week, or a transposition. It gets ~10 % of the technique block, capped at 5 minutes. **For voice,** the transposition is picked from voiceRange.
- **Revisits:** a learned tune returns via piece FSRS (§4.3) with a new layer each time: reharm, solo, arrangement. This is the repertoire spiral.

### 8.6 Unit capstones (AP #3)
- Every path unit ends with a music step: a tune slice, a duet or a performance take using the unit's skills. It uses the `repItem` / `openRepWay` hooks.
- The capstone counts as the unit's last step, and is **skippable**, never a lock. Capstones are coverage only (§1.10).
- **Capstone mapping:** a table per unit and theme in the path content, written with the capstones.
- **Ear capstones:** a short real-recording task (embed + annotation, §10.1), **scoped to path themes first** (one annotated embed per theme). They write to `repertoire-memory` and coverage, never the Ear course skills.
- **A ballad capstone** on a 1A ballad (If I Could Be with You, or spirituals), or the labelled practice ballad Quiet Hours.

### 8.7 Accompanying a singer or soloist (AP #4)
- **New family `k-accomp-voice`, and `g-accomp-voice` on guitar** (area: harmony / voicing; on a head the learner has already played, `k-accomp-voice` goes to coverage and `repertoire-memory`, never level, §1.10). **The levels are referred to by name, not number** (§8.9, §13.1). In order:
  1. **intro** in the singer's key (the last 4 bars, or a I–vi–ii–V vamp);
  2. **register:** comping under a sung melody, keeping out of the melody's register (graded by register overlap);
  3. **fills at phrase ends** (graded by note density inside sung phrases vs at their ends);
  4. **transposing at sight:** the chart transposed at sight by ±2 semitones (measurable);
  5. **following human rubato:** the comping must follow the singer. **The rubato comes only from human takes:** teacher recordings, calibration-account takes, the human model bank (§8.9), or a voice student's take via §12.3. Never an algorithmic rubato curve (no-claude-composed-music; the humanize layer was rejected). Labelled "teacher or recording needed" until the bank exists;
  6. **fermata endings:** graded only as release-on-cue against a notated, fixed hold, in the measurable version. A human take is used when one exists. Never an app-chosen "human" hold length.
  - **Register and fills at phrase ends:** the app's playback of a served head is the melody source; only following human rubato needs a human take.
- **Grading:** chord onsets against the singer's **beat map**, not the melody onsets. Comp velocity is graded below the melody, **MIDI only;** `g-accomp-voice` on a mic is graded on register and timing only. Register overlap stays.
- **Comp dynamics** are graded against the singer's phrase envelope, MIDI only, and mapped through the synth's rendered loudness. "Teacher or recording needed" until the bank exists.
- **Duet assignments:** a voice student's take is the melody track for a keys student, using SPEC-TEACHER-CLASS async layering (§12.3).
- **Responsive comping:** comping behind a soloist that answers phrase ends. The soloist comes from the §13.6 sources (rule-generated licks, PD lines, or a teacher or the human model bank, §8.4); otherwise drums only or silence. The lick-bank soloist plays bank licks as they are, chosen to fit the changes (§8.4). **Never an app-improvised soloist.**

### 8.8 Idiomatic jazz ladders per instrument (AP #15)
- The k/g/b jazz ladders keep a shared spine, and gain instrument-specific levels:
  - **bass:** lines that carry the harmony alone, a duo with no comping;
  - **guitar:** slides, articulation, Freddie Green four-to-the-bar;
  - **piano:** comping while soloing;
  - **drums:** their idiom, form-keeping and set-ups.
- **Post-bop:** 3 tune-based levels (chords only). Prerequisites: the modal and slash-chord families.
- **Free improvisation:** 3 levels (dynamics/register only, a texture call-and-response, a rhythm-only solo), **graded on task compliance only**, e.g. "only register and dynamics changed", "rhythm only". Variety is descriptive feedback. It counts as coverage only.
- **Jazz-bridge links,** each tagged: Joplin → stride (`accomp`, `k-nola`); Debussy and Satie → planing and constant structure (`k-reharm`, `planing`).

### 8.9 The human model bank
- **An owner production task in steps 5 and 7:** recordings of 1A heads by real singers and players, several rubato and dynamic renditions each, with performer releases.
- **Until the bank exists,** each level that depends on it is labelled "teacher or recording needed". Those levels:
  - accompaniment "following human rubato" (§8.7);
  - comp dynamics against the singer;
  - expression model curves, including Romantic rubato (§14);
  - diction models (§11.2).
- **Such a level** is skippable, never a gap in the bar to next, and never sampled by the level test.
- **Drum "supporting a soloist"** uses rule-generated licks as the soloist (allowed by H4), so it is not "teacher or recording needed" (§13.6).

### 8.10 User-made content and sharing
- **Every user-made phrase and recording carries a source flag.** It defaults to **"unknown → private"** unless the user declares it their own or PD. The flag follows the §8.1 recording test (one rule for every work on the recording; an unknown fact means not servable).
- **Content transcribed from a protected recording, or carrying a protected or US-only melody,** stays on the device or in private studio exchange (below). It is never sent to the community, challenges or gifts.
- **Studio sharing:**
  - **private 1:1 studio exchange is allowed both ways,** teacher ↔ their own student: user content, private, not distributed;
  - **student ↔ student studio exchange** (duets, §12.3) is private within the studio, like the 1:1 teacher rule. It is not class-wide distribution;
  - only community, challenges, gifts and class-wide distribution go through `servable()` for the recipient's region;
  - this rule is on the §17 lawyer list.
- **Community, challenge and gift distribution of melody-bearing content requires,** before it is enabled:
  - user-responsibility terms;
  - a registered DMCA agent;
  - notice-and-takedown;
  - a repeat-infringer policy;
  - EU DSA notice-and-action.

---

## 9. Validation programme (AM #11)
1. **The synthetic-learner harness (§9.1, part of step 1).** It exists: **src/engine/measure/sim/** (pure TypeScript, not wired into the app). **The v16 report is docs/MEASURE-V16-REPORT.txt** (`npm run measure-v16`), on the v16 defaults: item pass V1, rank H8 + the tier guard (H11, at P ≥ 0.9 by H14) with the guard reserve and the round 18 fixes (passed-cell looks and guard probes at tiers with no fresh cell left, warm-first skips always misses by H15, unplayed due checks as misses only above a 20 % skip share), current form at ρ_d 0.15 / ρ_c 0.20 (H12), the H10 planner in full with evidence readiness and the struggle step-down (the tempo model in tempo areas), and the shared slot supply with FSRS-review looks (H13). The earlier reports (docs/MEASURE-SIM-REPORT.txt, docs/MEASURE-VARIANTS-REPORT.txt, docs/MEASURE-R17-REPORT.txt, docs/MEASURE-V14-REPORT.txt, docs/MEASURE-V15-REPORT.txt) stay as history; every table of the v16 report carries the v15 default (P ≥ 0.8) beside the v16 default on the same seeds, so each before / after pair below comes from one run. The reading / transfer pass and P(item pass) numbers below come from MEASURE-SIM-REPORT, which the v16 defaults do not touch (they run outside rank, planner and supply). **The harness is the reference implementation of §1's measurement rules** (the item pass, the reading and transfer pass test, rank with the tier guard and the entry ceiling, the placement correction, the current-form posterior, the §1.7a planner, the shared supply), and **its tests (tests/measureSim.test.ts) must stay green;** a change to a §1 rule changes the harness and its tests in the same commit. Earlier rule versions stay selectable as variants (the v15 guard at P ≥ 0.8 `RANK_GUARDED_P80`, ungated H8 `RANK_FIX`, the v13 planner `H10_OFF`, the v14 H10 `H10_V14`, the v14 guard planner `V14_GUARD_PLANNER`, the v13 supply `PER_AREA_SUPPLY`, warm-first skips gated by the skip share `warmSkipGated`, not adopted by H15).
   - **The learners:** known θ, learning rate and warm-up decrement (warm takes +0.8 logit), **with day and cell random effects** (look dependence): day SD 0.8 and cell SD 0.7 on the logit scale, β = 1.2 logit per tier, until the calibration traces give fitted values. **It states ρ_d and ρ_c,** the pooled day and cell correlations that n_eff uses (§1.7): ρ_d = 0.15 (same day) and ρ_c = 0.20 (same cell, cautious by H12). The tempo model: one content tier ≈ one tempo step of × 1.2; new cells start at 0.7 × target or at the borrowed tempo edge, a 2-up-1-down cold staircase, a warm climb, §1.9 threshold estimates. The planner model: practice days per week, 1–2 sessions a day, the §1.7a planner, a per-session slot cap of 3 shared by 4 areas, ≤ 2 FSRS review probes per session in the area, the §1.7 re-offer and guard reserve. The real catalogue is scored with the §1.10 areas: piano and guitar 5 laddered areas, bass 3 (scales, arpeggios/chord tones, walking/groove; reading and rhythm/time are not on the key ladder).
   - **Modelled since v15:** keyless and few-key catalogues; cells unique per exercise × key with shelving and resuming; learners who choose the day for cold checks (warm-first on bad days, on the worst 20 % of days, or leaving the area after sensing a bad day) and honest deviators (warm-first on a random 20 % of days, leaving early on a random 20 % of days); lowered teacher targets; the re-entry window per item.
   - **Not yet modelled, to add:** forgetting, fatigue within a session and input noise (the per-input checks belong to SPEC-INPUT-SOURCE's guard tests and the §9 injection tests, not to this harness); transfer-tier reachability from the transfer pool (§1.6); voice cents bands (the band rule is a guard test).
   - **Truths it scores against:** **probe-band p** = the learner's cold p on a fresh cell of the tier at the floor of the probe band (0.95 × target in tempo areas, the fixed tempo in fixed-tempo areas): **the rank estimand** (§1.1, v15); **tier p** = the same at 1.0 × target (current form's estimand); **catalogue p** = the mean over every exercise × key of the tier with each cell's own item-practice gain; **practised p** = the recency-weighted mean probe-band p of the cells behind the guard's record, with their item practice (what the guard measures); **cell p** = a passed cell's own cold p.
   - **The test passes when:**
     - **stationary-learner honesty (per learner, v15):** for learners who do not improve (rate 0) with true tier p 0.5 and 0.75 at T2, from scratch, 365 days, the final (permanent) rank sits at a tier whose **probe-band p < 0.5** for **≤ 10 % of learners** (no item-practice gain); the same is reported with item gain, at p 0.85, per rise (the v14 statement), on the real piano areas and in a keyless area;
     - **day pickers (v15):** a learner who warms up first on bad days, or leaves the area on them, ends no higher than an honest learner, and per learner no less honest than the target above;
     - improving learners: rank rises at a true tier p < 0.5 as low as practical, reported;
     - current form tracks θ_cold (bias and RMSE reported);
     - the current-form posterior's 80 % interval **covers the tier estimand at ≥ 80 %** (cautious by H12; the exact coverage is reported, and it is not claimed to be calibrated);
     - wrong demotions of current form stay < 5 % per 90 days of practice (true p ≥ 0.75, scored on the decision window's own tiers);
     - the reading and transfer false-pass rate stays < 10 % at true p = 0.5 with day SD 0.8 (reported at 0.4 and 0.5, §1.6);
     - every transfer tier is reachable from the transfer pool (§1.6);
     - a steadily improving learner climbs from T0 to T5 on rotation alone, with no stall, and per area, on the real catalogue, rotation-only climbs reach every tier that has content, with no stall ≥ 42 days except where the catalogue rule (§1.2) is not met (§1.3); **the same in keyless and 1-key catalogues** (v15);
     - a correctly placed learner is never corrected by the over-placement rule, in tempo and non-tempo areas; an over-placed learner is corrected, including one placed on an empty tier (§1.3);
     - the rank guard tests hold, including the rank-gaming guard (§1.7);
     - **H10 (required):** the flat-rank slope of offered difficulty against min(θ, the + 2 cap) is ≥ 0.7 in tempo areas and ≥ 0.6 in fixed-tempo areas with a mean lag within ± 0.5 tier, with no offer above the + 2 cap and no fall of the new / strengthen target in a non-exempt session; **and appropriateness:** plateaued learners are offered items with a mean probe-band p ≥ 0.35 and ≤ 35 % hopeless days (§1.7a).
   - **Validated numbers (2026-11-28, v16 defaults, seed 20261127; docs/MEASURE-V16-REPORT.txt unless marked; "v15" = the v15 default, P ≥ 0.8, same run):**

     | Measure | Target | Result |
     |---|---|---|
     | Stationary learners, **per learner**: final rank at a tier whose probe-band p < 0.5, 365 days, p 0.5 / 0.75 at T2 (100 learners each) | ≤ 10 % | **3.0 % / 4.0 %** (v15 6.0 % / 10.0 %; ungated H8 100 % / 99 %); final rank median T2 / T3 |
     | The same per rise | reported | 1.3 % / 1.2 % (v15 2.2 % / 2.8 %) |
     | The same with item-practice gain (0.3 logit per 10 takes, saturating at 1), per learner / per rise | reported | **13.0 % / 10.0 %**; 4.7 % / 2.8 % per rise (v15 39.0 % / 60.0 %; 12.9 % / 14.6 %). The guard's own cells, as practised, sat at practised p 0.46–0.49 |
     | The same at p 0.85 (no gain / gain), per learner at the probe band | reported | 0.0 % / 1.0 % (at target 24 % / 92 %, v15 66 % / 100 %: T4 is p 0.44 at target and 0.50 at 0.95 × target; the probe band is the estimand) |
     | Stationary learners on the real piano areas (p 0.75 at each area's 2nd tier), per learner / per rise | reported | 8.7 % / 3.7 % (v15 16.0 % / 6.0 %; ungated H8 57.3 % / 17.9 %) |
     | Stationary learners in a keyless area (keyless-3), per learner p 0.5 / 0.75 (with gain at p 0.75) | ≤ 10 % | 0.0 % / 1.7 % (0.0 %) (v15 0.0 % / 0.0 % (5.0 %)) |
     | The guard as a repeated test: P(ever passed within 96 checks) at a true probe-band p of 0.4 / 0.45 / 0.5 (single test at 96 checks) | reported | P ≥ 0.9: 7.2 % / 14.6 % / 28.8 % (0.0 % / 0.4 % / 1.6 %); v15 P ≥ 0.8: 21.3 % / 38.4 % / 61.0 % (0.4 % / 1.9 % / 8.1 %) |
     | Day pickers (60 learners, p 0.5 / 0.75): final rank median, per learner | no higher than honest | honest T2 / T3 (3.3 % / 3.3 %); warm-first on every bad day none / T1 (0 % / 0 %); on the worst 20 % of days T1 / T2 (0 % / 3.3 %); sense-and-leave T0 / T2 (0 % / 0 %); the honest 20 % warm-first learner (careless) T1 / T2 (0 % / 1.7 %); leaving early on a random 20 % of days T2 / T3 (0 % / 5.0 %) |
     | Honest deviators: days per tier, p 0.75, 3 d/wk, 13 real areas (median / p90) | reported | honest 26 / 70; **the honest 20 % warm-first learner (H15) 47 / 240** (some transitions not reached within 240 days); leaving early on a random 20 % of days 35 / 94. v15: 23 / 56; 34 / 157; 30 / 75 |
     | Rank rises at true tier p < 0.5 at the new tier, improving learners, 13 real areas | as low as practical | 0.8 % (with item gain 4.5 %; v15 2.1 % / 8.9 %; ungated H8 6.8 %); median tier p at a new rank 0.83 (v15 0.77) |
     | Calendar days per tier, 13 real areas pooled, median / p90 | about 1–3 weeks | p 0.75: 26 / 64 (3 d/wk; 98.9 % within 240 days), 16 / 39 (5 d/wk); p 0.85: 21 / 37, 13 / 22 (v15 24 / 55, 14 / 32; 20 / 35, 12 / 21) |
     | Stalls ≥ 42 days at true p ≥ 0.85 on the next tier; climbs missing a tier with content (20 climbs per area, 13 areas) | 0 except catalogue gaps | **FAILS:** 2 / 260: bass/walking 58 days (the §1.2 catalogue gap) and **guitar/arpeggios 46 days at rank none (not a catalogue gap)**; 0 / 260 missing a tier. v15 2 / 260, both bass/walking (47 days) |
     | **Keyless and few-key catalogues**: rotation-only climbs reaching the top tier; stalls ≥ 42 days (20 climbs each) | all; 0 | **FAILS:** keyless 3 per tier 100 %, 3 / 20 (longest 103 d); keyless 2 per tier 90 %, 16 / 20 (233 d); keyless real-ish 85 %, 11 / 20 (252 d); 1 key 100 %, 0 / 20 (39 d); 2 keys × 2 exercises 100 %, 0 / 20. v15: all 100 %, 0 / 20 except keyless 2 per tier 1 / 20 (60 d) |
     | Days per tier in a keyless area (p 0.75 / 0.85, 3 d/wk) | reported | 21.5 / 240; 16 / 26 (v15 19 / 36; 16 / 23) |
     | Wrong demotion of current form per 90 days, true p 0.75 and 0.85, 3 and 5 d/wk | < 5 % | 0.0 % in every supply row on the window estimand (the tier-left-only truth 0.5 % in two rows) |
     | Looks per area per 90 days at the shared supply (share from FSRS reviews) | reported | 76 at 3 d/wk, 126 at 5 d/wk (93.5–94.5 % from reviews); without reviews 32–33 / 55 |
     | Posterior 80 % interval coverage of the tier estimand, n_eff at ρ_c 0.20 (naive n) | ≥ 80 % | 80.7–83.4 % per row at the default supply (72.2–76.1 %); pooled 84.7 %; ρ_c 0.10 would give 82.0 %, 0.08 81.3 %; bias 0.001, RMSE 0.095. One non-default supply row (shared, no reviews, p 0.75, 5 d/wk) covers 78.2 % |
     | Re-promotion after a 4-week dip of −3 logits (p 0.85 at T3, 4 d/wk) | reported | 79.5 % slumped; 47.8 % back at their pre-dip current form within 120 days; 94.3 % back at their true tier (p ≥ 0.75), median 0 days, p90 88 (v15 91.8 %, p90 91) |
     | H10 flat-rank slope, tempo areas (synthetic; piano scales) | ≥ 0.7 | **0.80; 0.82** (v15 0.79; 0.81); 0 days above the + 2 cap; target fell in 0.0 % of non-exempt sessions |
     | H10 flat-rank slope, fixed-tempo areas (synthetic; piano harmony), mean lag | ≥ 0.6, lag within ± 0.5 | synthetic 0.61, lag 0.49; **piano harmony 0.63, lag 0.53: FAILS (lag)** (v15 0.60, 0.35; 0.69, 0.41). At the test's 20 learners the synthetic slope is 0.58 |
     | H10 appropriateness: plateaued learners (rate 0, p 0.5 / 0.75 at T2), last 90 of 365 days: offered probe-band p; hopeless days (offer p < 0.3) | ≥ 0.35; ≤ 35 % | tempo area 0.43 / 0.42; 13.4 % / 24.9 %; fixed-tempo 0.44 / 0.44; 13.2 % / 19.1 % (v15 0.39 / 0.39; 22.4–29.1 %; 0.39 / 0.39; 27.0–28.2 %) |
     | Correctly placed learner corrected (tempo; fixed-tempo N1; reading N1) | 0 | 0.0 %; 0.0 % of 300; 0 of 800 (MEASURE-VARIANTS-REPORT) |
     | Over-placed by +2 / +3 corrected (tempo); placed on an empty tier (+3) | reported | 100 % (median first drop day 10) / 100 %; 99.5 %, median day 9 |
     | Over-placed by +2 corrected (fixed-tempo, N1 over all cells) | reported | 86.3 % (median first drop day 10) |
     | Rank-gaming guard (one exercise, a new key every session, 180 days) | rank none | rank none |
     | Reading false pass at true p = 0.4 / 0.5 (30–180 days, 4 a day, 4 days/wk) (MEASURE-SIM-REPORT) | < 10 % at 0.5 | ≤ 0.1 % / ≤ 1.3 % |
     | Transfer false pass at true p = 0.4 / 0.5 (2 a day) (MEASURE-SIM-REPORT) | < 10 % at 0.5 | ≤ 0.4 % / ≤ 2.3 % |
     | Time to pass, learner improving p 0.3 → 0.85 (MEASURE-SIM-REPORT) | reported | reading median 46 days (p90 60); transfer 52 (p90 72) |
     | P(item pass within 28 days, 4 days/wk) at cold p 0.3 / 0.5 / 0.7 / 0.8 (V1) (MEASURE-SIM-REPORT) | reported | 36 % / 84 % / 99 % / 100 % |
     | Exercises per tier (synthetic, k at every tier): median / p90 days per tier, p 0.75, 3 d/wk | reported | k 2: 30.5 / 54; k 3: 24 / 46; k 4: 24 / 42; k 6: 25 / 48 |

   - **Notes on the numbers:**
     - **What P ≥ 0.9 bought (H14):** per-learner honesty now has a margin without item gain (3.0 % / 4.0 %, 8.7 % on the real piano areas) and with it (13.0 % / 10.0 %, against 39 % / 60 %); the repeated-test inflation at a true probe-band p of 0.45 falls from 38.4 % to 14.6 % of streams by 96 checks. Its price on the real areas: about 2 days on the median tier at p 0.75 (24 → 26, p90 55 → 64) and 1 at p 0.85.
     - **Why the per-learner figures are higher than the per-rise ones (round 18 #4):** about 3–4 honest early rises per learner dilute the per-rise share; the estimand (at p 0.85 the "false" T4 sits exactly at the guard's bar at the probe band), repeated testing, and item gain on the record's own cells explain the rest (v15 analysis, unchanged).
     - **Why P ≥ 0.9 stalls where cells are few (the cause of the three failures):** the guard's design effect (§1.7: m_d = entries per day, m_c = entries per cell) counts **raw** entries over the whole record, while the recency weights (half-life 24) cap the weighted evidence near 35 entries. With many cells (12-key areas) m_c stays small. With few cells (keyless tiers, few-key exercises, a tier where the guard reads 2–3 passed cells' looks) a long record drives m_c up without bound and n_eff down: a 3-cell record, all clean, 1.5 entries a day, gives n_eff 6.8 and P(p ≥ 0.5) 0.996 at 40 entries, 3.2 and 0.945 at 150, 1.7 and 0.844 at 300 (computed with the harness's functions). At 0.9 one miss, or simply a long record, then holds the rise; at 0.8 the margin hid it. guitar/arpeggios' stall at rank none and the piano/harmony lag (rank held longer, so the + 2 cap and readiness entry lag) come from the same tightening.
     - **Proposed fix (owner question, §17.4): the design effect from the recency-weighted count** (m_d = Σw / days, m_c = Σw / cells; harness option `weightedDeff`), measured on the same seeds (report section W): every keyless and few-key climb reaches the top with no stall (longest 29 / 32 / 40 days); the real areas keep 1 stall in 260, bass/walking (58 days, the catalogue gap), guitar/arpeggios none; piano/harmony slope 0.67, lag 0.48 (meets the target); days per tier at p 0.75 26 / 59; per learner without item gain 1.0 % / 6.0 % (meets the target). **Its cost:** per learner with item gain 23.0 % / 38.0 % (P ≥ 0.9 as decided: 13.0 % / 10.0 %; v15: 39.0 % / 60.0 %). A window of the newest 48 entries fixes the keyless stalls (keyless 2 per tier 1 / 20, 49 days) but not guitar/arpeggios or the harmony lag (0.69, 0.52), at 18.0 % / 24.0 % with item gain; a window of 72 leaves 9 / 20 keyless-2 stalls. **A P grid with W1** (0.9 / 0.93 / 0.95 / 0.97, plus a recent-days rule and a first-3-checks-per-cell rule; report section G, §17.4) finds no P that restores item-gain honesty without new stalls: item-gain honesty under the guard is a bias of what it reads, not noise.
     - **Day pickers and H15:** no picking strategy measured raises rank (all end at or below the honest learner, per learner 0–5 %). The cost of "always a miss" falls on an honest learner who warms up first on a random 20 % of days, and under P ≥ 0.9 it is larger than in v15: median 47 days per tier against 26 (v15: 34 against 23), p90 at the 240-day cap. The UI warning (H15, §1.6) is what keeps honest learners out of this row; the harness's careless learner ignores it by construction. The gated alternative (not adopted) at P ≥ 0.9 gives that learner T2 / T3 at 1.7 % / 0.0 % per learner.
     - **The keyless 2-per-tier wait** (v15: 1 / 20, 60 days) is the statistics of a 2-item tier; under P ≥ 0.9 it became most climbs (16 / 20), the design-effect cause above.
     - **Wrong demotion and calibration:** unchanged in substance; ρ_c 0.20 over-covers the tier estimand by design (H12).
   - **Known soft spots (backlog for later tuning, not blockers):**
     - **targets missed under P ≥ 0.9 (owner question, §17.4):** keyless and few-cell stalls; the guitar/arpeggios stall (46 days); the piano/harmony lag (0.53); the synthetic fixed-tempo slope at the floor (0.61; 0.58 at the test's 20 learners). The harness tests for them are `it.fails` with the measured numbers; the proposed fix has positive tests;
     - **the honest 20 % warm-first learner** loses about 3 weeks per tier under H15 + H14 (median 47 against 26 days) if the UI warning is ignored;
     - **item-practice gain** still lifts per-learner false ranks to 13.0 % / 10.0 % (10 % of the false rises at p 0.75 rest on practised cells at the bar);
     - **bass/walking** (1 exercise at T1 and T2, none at T3) can stall the first rank (§1.2 catalogue rule): 1 / 260 climbs, 58 days.
   - **It reports, before step 1 ships, and on every change to a §1 rule:** the table above, per area from the real catalogue, and P(item pass | cold clean rate) for p = 0.2–0.9. The owner sees these numbers (§17.4).
2. **The calibration-trace replay:** split-half and test-retest of the cold levels. A number appears on screen only when its reliability is ≥ 0.7 (levels) or ≥ 0.4 (rates). **This gate exempts Phase A** (a transparent rule shown as such); it gates Phase B, the rates and any model number.
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
  - US-PD recordings that pass the §8.1 recording test, shipped where verified, through the region gate.
- **The player:** visible, at least 200×200, fitting one phone screen; youtube-nocookie with click-to-load; 78-rpm transfers (from a PD-clean source) for pre-1925 recordings. Loop and slow via the IFrame API's seekTo and setPlaybackRate. No audio extraction.
- Start with one recording per path theme. **Removed or region-blocked videos** fall back to the next annotated recording.
- **Tasks:**
  - track the form (tap at each chorus);
  - count choruses;
  - name the soloist's instrument;
  - tap the changes;
  - "listen for": one prompt per path unit, e.g. "the walking bass on beats 1–4", "the ii–V in bar 5".
- **Embed tasks are graded by taps against a timeline the teacher or the app marks,** using beat-level windows plus a per-device offset. The app does not analyse the embedded audio (H3: no extraction). **Embed tap grading never feeds level;** the lab writes to `repertoire-memory` and coverage (§1.10).
- **A listening canon** per instrument and era, using US-PD sides that pass the §8.1 recording test. Candidates, to check: Jelly Roll Morton solo piano 1923–24, and James P. Johnson solo piano (died 1955, term ended 2025).

### 10.2 Guided transcription (own audio only)
- **The steps:**
  1. loop a bar;
  2. slow it down (time-stretch on the device);
  3. sing it (§16 syllable rule);
  4. find it on the instrument;
  5. write it (staff dictation input);
  6. play along at full speed.
- Uses the existing My-song stems and transcription infra. Transcribed content carries a source flag (§8.10).
- **Bass:** learn a real line by ear from the learner's own copy.

### 10.3 Improvisation story ladder (AP #8)
- **The ladder:**
  1. paraphrase the head;
  2. one motif per chorus;
  3. sequence it;
  4. displace it;
  5. answer it;
  6. build an arc (density and register rising, e.g. to bar 25 of 32).
- **Detectors** (new code in step 7, not existing analysis). All are descriptive, not pass/fail, until teacher agreement (§9.4):
  - **motif:** a recurring interval + inter-onset n-gram of ≥ 3 notes;
  - **sequence:** the same interval pattern transposed;
  - **displacement:** the same pattern at a different beat offset;
  - **answer:** a contour-inverted or rhythm-matched reply after a rest;
  - **paraphrase:** structural head notes hit (DTW alignment) within a rhythmic-deviation band;
  - **drum motif:** a pad sequence + an IOI n-gram, using the same detectors on pad ids (§13.6);
  - **arc:** "a clear peak in the last third, then a release".
- This promotes SP item 31 from L to H, and adds the paraphrase step for all instruments, which needs §8.2. The ladder is coverage only (§1.10).
- **Sing what you play:** a 2-bar phrase sung, then played (hear → sing → play), with the §16 syllable rule.

---

## 11. Pop chord library, voice, how to practise, composition (H1 step 5)

### 11.1 Pop chord library (AP #6; owner 2026-11-27)
- **Global and jazz-adjacent, not Israeli-focused.** The app is multilingual, so the library draws from global top-chart pop that is harmonically rich: extended chords, ii–V motion, modal interchange and sophisticated grooves.
  - Examples of the kind of artists, to be curated: Stevie Wonder, Steely Dan, Burt Bacharach, Michael Jackson / Quincy Jones productions, Earth Wind & Fire, Jamiroquai, Norah Jones, John Mayer, Bruno Mars, Jacob Collier.
- **Each entry has:** a title (named exactly, from a curated artist), key, changes, form and an original-recording link (official-channel embed). **No lyrics, no melody.**
- **Chord symbols at lead-sheet level only,** with no voicings.
- **The riff guard** (no signature riffs or bass lines) extends to pop: e.g. Superstition, Jamiroquai bass lines.
- **"Harmony is the work" note:** very idiosyncratic modern writers (e.g. Collier, Steely Dan) get extra care: few songs, chords only (H7).
- **A source and a human verifier for every chart** (§8.3).
- **Each entry names the jazz concept it bridges to,** e.g. I–vi–IV–V → I–vi–ii–V, modal interchange in Stevie Wonder.
- **Pop charts** show a bar grid with sections synced to the embed, in 4–8-bar windows beside the player (one screen).
- **`k-pop` grows to about 15 levels** (area: harmony / voicing; memorised material never feeds level, §1.10):
  - inversions for smooth changes;
  - slash chords and pedal bass;
  - add9 / sus;
  - ballad arpeggiation;
  - "4 chords in every key";
  - Nashville numbers;
  - playing from a chart against the original;
  - comping patterns and anticipations.
- **The guitar version:** capo, open-string colours, DADGAD.
- **Collecting societies:** closed (H7). Chord progressions are not copyrightable, and the app gives many variations per chart.

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
- **Registration, text and diction are coverage only** (hint-only, §1.10).
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
- Composition is coverage only (§1.10).

---

## 12. Teacher and ensemble (AP #12, AP §2.15)

### 12.1 Teacher rubrics
- A 4-point scale per quality the app can't measure: tone, phrasing, interpretation, registration (and posture/tension, §1.1). **Guitar tone** (pick attack, vibrato quality, dynamics) is assessed here.
- Each rubric is tied to the saved take.
- The student self-rates first (the §7 MIDI-key or voice yes/no input, hands-free), then sees the teacher's rating.
- A low score adds to the goal weight in need (§5).

### 12.2 The teacher as the model
- **The flow:** the teacher records a phrase, the student imitates it, and the two are compared.
- It is a first-class assignment type on every instrument (Encore capture exists).

### 12.3 Async ensemble
- In a studio, one student's take (bass, or a sung melody) becomes the backing track for another's. This is the latency-safe way to "play with others". Student ↔ student exchange is private within the studio (§8.10).
- **Grading:** the first take has a click and a calibrated round trip; later takes are graded against the first take's beat map.

### 12.4 Ensemble, performance and lesson plans
- **An ensemble-roles unit:** bass = harmony and time, drums = form, comping = space. Role-swap listening.
- **Performance ritual:** announce → one take, no restarts → listen back with one question (time / sound / shape) → self-rate (the §7 MIDI-key or voice yes/no input) → compare with the teacher. It resumes after a reload (never-lose-progress), and a reload does not count as a restart.
- **Lesson-plan templates:** a learn-a-tune week, a transcription week.

---

## 13. Curriculum flow and area additions (AP §4, #15)

### 13.1 Flow
- **The curriculum-flow audit is a gate:** every new or changed ladder in steps 5, 7 and 8 passes a flow audit (no gaps, no topic hopping, several success items per stage) before it ships. The upper Ear levels, voice, drums, bass and guitar get their audits scheduled across those steps (curriculum-flow rule).
- **The bin families get the flow audit:** voicings, k-reharm, jazz, accomp, g-scales (curriculum-flow rule). Each is split into 2–3 coherent ladders, or given explicit cross-family prerequisites in place of in-family order.
- **Latin rhythm** (clave, bossa, montuno comping) is covered by the style-focus families (k-montuno, k-brazil and their guitar / bass equivalents). It is on the flow-audit list.
- **SP §14 items 35 and 37 for guitar and bass:** item 35 → harmonised arpeggios in 3rds and 6ths across two strings or two positions; item 37 → position-shift leaps. Piano keeps the originals.
- **A "use it" step for advanced theory topics:** each one (negative harmony, twelve-tone, neo-Riemannian…) gets at least one instrument or composition step, tagged.
- **A tune suggestion at each section boundary:** passing "developing" on an instrument course suggests one real tune (from the region pool, matched by difficulty card: heads §8.2, charts §8.3), learned to the memory step. It is skippable, never a lock.
- **The level test and skill map get a tune section per course:** an opt-in "tunes I know" pick, and a chart at sight. It is never "from memory" for new users, and never samples a "teacher or recording needed" level (§8.9).
- **Klezmer / Israeli idioms** (AP §2.14) are deferred, by the global positioning decision.

### 13.2 Games
- **Contour Draw:** fills the open beginner Ear gap (beginner-game-gap memory): trace a tune's shape. **Ships early, in step 2,** with generated 4–6-note contours from the existing Ear melody generator (random stimulus generation, not composition). Head slices join in step 5, under §13.5.
- **First-phrase recall:** title → play the first 4 bars of a learned head.
- **Groove Match:** drums, copy a 2-bar groove, scored per limb ("needs MIDI", §13.6). It is a game: need and coverage only, never the drums grooves area (§1.2, §1.10).
- **A pitch-steered line game** for voice, in the serious visual style.

### 13.3 Reading
- **A jazz reading ladder** (area: reading): written 8ths played straight vs swung; articulation marks; big-band kicks and set-ups.
- **A gig sight-read capstone:** lead sheet + road map.
- **The transposing-instruments ladder is deferred** until a horn audience exists.

### 13.4 Rhythm
- Deliberately behind or ahead of the beat on keys and guitar comping (b-swing levels 2–3 copied).
- **The swing band (SP §16.9) applies app-wide,** not only on key-session lines, with tolerances per tier. The accept band widens upward below ♩ 110 (ballads). D9's target is unchanged.
- **Native swing below ♩ 90** is graded only where an item has 8ths. Long-note items are graded straight.

### 13.5 Ear
- **Line-implication ear:** name the chord a line implies.
- **"Tunes you know" is audiation:** from the title, sing or play the first phrase. **One rule:** the tonic reference is played, then the sung phrase is graded on its starting degree plus intervals in that key; **the octave is free; the key is not free.**
- **Dictation of 2-bar slices of served heads.**
- **Ballad / rubato harmonic rhythm.**
- **EAR v2's songs-by-ear and sight-singing** draw from served heads (through `servable`, §8.1). **Head-based sight-singing goes to `repertoire-memory`;** generated items stay the measured core of Ear sight-singing. Well-known heads carry a **`familiar` tag** (Saints, spirituals, Bill Bailey, Ain't We Got Fun and similar) and are excluded from any Ear evidence.
- **No memorizable Ear evidence:**
  - head dictation, sight-singing and Contour Draw use heads the learner hasn't learned, as random slices, transposed;
  - head-slice dictation, head-based sight-singing and "tunes you know" write to the `repertoire-memory` skill, never the Ear course skills;
  - head dictation is capped at 20 % of dictation trials. Generated items are the measured core;
  - when the learner's unlearned-head pool is < 5, head-slice items step aside.

### 13.6 Drums
- **Balance:** ride above snare comping, kick under the bass, by per-pad velocity ratios. **Calibrated per kit** (per-pad gain), or labelled as intent, not loudness.
- **Supporting a soloist:** density follows the soloist. The soloist is the lick bank's rule-generated licks (allowed by H4), played as they are with no generative phrasing and no reactive density, chosen to fit the changes (§8.4), or PD or teacher lines, never Claude-composed. It is not "teacher or recording needed".
- **Melodic soloing:** a motif on the toms, developed and returned, graded by motif matching on pad and rhythm with the drum-motif detector (pad sequence + IOI n-gram, §10.3).
- **A tuning brief** (not graded).
- **Jazz brushes:** a brief, plus a self- or teacher-rated item ("needs MIDI" / acoustic).
- **Buzz rolls** are graded on evenness and sustain quality, not on a rate: a quality criterion within the rudiment family (§1.2).
- **Balance, Groove Match and singing while drumming are "needs MIDI".** On an acoustic kit they get a self or teacher rating.
- Balance and soloist work map to drums grooves/styles (§1.10).
- Drums join learn-a-tune (§8.4) and the idiomatic ladders (§8.8).

### 13.7 Voice additions
See §11.2 (diction, mic technique, English diction, PD lyrics per language).

---

## 14. Expression (AP #14)
- **A style-interpretation brief** per period on PD pieces, presented as "a common starting choice" and graded on the instruction given:
  - Baroque: detached 8ths; terraced dynamics (**a brief, not graded**);
  - Classical: slurred pairs, Alberti balance;
  - Romantic: rubato (**"teacher or recording needed"**, §8.9), pedal;
  - jazz: accented upbeats, ghosted notes.
- Graded by measurable proxies: articulation length and the dynamics contour. **Articulation and pedal grading are MIDI only.**
- **Expressive-contour feedback:** the player's velocity and timing curve drawn over the model's, for ballads, PD pieces and voice phrases. **Model curves come from human takes only** ("teacher or recording needed" until the bank, §8.9).
- **PD repertoire per instrument** (AP #13):
  - piano: Joplin, Satie, early Debussy, Burgmüller, Czerny, the Anna Magdalena notebook, Schumann Op. 68;
  - guitar: Sor, Carcassi, Giuliani, Tárrega;
  - voice: Vaccai, Concone, the 1894 Schirmer Italian arias (Parisotti), which carry an "edited 1894 version" label in the style brief; the brief also notes the "Se tu m'ami" misattribution;
  - bass: Simandl, Bach.
- **Each piece:** published ≤ 1930, generated from verified notes, and served through `servable()` and term classes, like heads (§8.1). Never a scan of a modern edition. Each piece needs note-by-note verification (owner task, §17.5, in the time budget).
- **PD repertoire and piece-coach pieces are coverage only** (§1.10).

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
  - hands-free (the §7 tap is the one optional input exception; the learn-a-tune step 1 click-to-play embed, §8.4, is an allowed listening exception beside it);
  - only verified theory;
  - all 12 keys where it applies;
  - guitar/bass parity;
  - small hands;
  - no movable do.
- **The syllable rule:** every sung **pitch-training** step (learn-a-tune, transcription, sing-what-you-play and the rest) uses a neutral syllable, degree numbers or letters. **"Letters" means localized note names, fixed do included in Romance locales** (ear-intelligence decision). Its purpose is to keep movable do out. It covers pitch-training steps only: the voice learn-a-tune lyric pass (§8.4) and scat syllables are exempt.
- **No memorizable items** (§13.5).
- **Course change checklist:** openers, unit openers, skill map, the level test per area, the head difficulty cards (§8.2) and the chart difficulty cards (§8.3).
- **No locks.** The entry rule limits only the rotation and the planner (§1.3). No change notices before real users.

---

## 17. Open questions and owner tasks

### 17.1 Lawyer and policy questions (before charging money)
- The rule of the shorter term (serving 1B content, the region gate, and 1A heads in long-term countries, §8.1).
- **Songs whose composer died by 1955 but whose lyricist died later** (e.g. Tea for Two: lyricist Irving Caesar died 1996; Honeysuckle Rose: Waller died 1943, lyricist Andy Razaf died 1973; Ain't Misbehavin': Razaf died 1973, co-composer Brooks died 1970): may a melody-only use serve them? The EU joins the two terms for songs with words, and Israel is unclear. Until the lawyer rules otherwise, the tier uses the latest death year among all credited authors (§8.1).
- **A PD recording of a 1B composition** needs the same region gate.
- Mexico and other long-term countries (incl. the life+75 class).
- **The studio sharing rule** (§8.10): private 1:1 and within-studio exchange vs distribution.
- **The YouTube API monetisation policy:** whether embeds may sit behind a subscription, or must stay outside the paywall.

### 17.2 Prerequisites before enabling community sharing of melody-bearing content (§8.10)
- User-responsibility terms; a registered DMCA agent; notice-and-takedown; a repeat-infringer policy; EU DSA notice-and-action.

### 17.3 Items to check
- Each 1A head confirmed 1A, with `pdFrom` per term class, and verified; each candidate head given its tier; Mood Indigo's print year.
- The other-style 1A heads: Nazareth and Gonzaga choro prints, "La Cumparsita" (author term class), non-Handy blues.
- The listening-canon candidates: Jelly Roll Morton solo piano 1923–24 and James P. Johnson solo piano, each through the §8.1 recording test (release date; every author of every work on it; for unpublished works, no authorized 1978–2002 publication and not a work made for hire).
- **The canon checklist:** whether Dapogny's 1982 *Collected Piano Music* of Morton (Smithsonian / G. Schirmer) was authorized. If it was, the transcribed improvised passages on Morton's 1923–24 solo sides are protected through 2047, and those sides leave the canon.
- Folk/trad print years and authors (e.g. the Hava Nagila lyric credit).
- Any lick whose rule origin is unclear (flagged for the owner).

### 17.4 Owner questions and decisions to see
- **Seen and decided (2026-11-27):** the harness's report (docs/MEASURE-SIM-REPORT.txt, docs/MEASURE-VARIANTS-REPORT.txt): calendar time per tier per area, the posterior's calibration, the wrong-demotion rate, the reading and transfer false-pass rates and time to pass, P(item pass | cold clean rate), the re-promotion time, and the item-pass and placement variants. The owner chose V1 (H9), ≥ 2 exercises for rank with grouped tiers, the empty-tier snap, N1 and the new-key re-offer (§0), and H10. The validated numbers are in §9.1.
- **Seen and decided (2026-11-28):** the round 17 measurement review and its harness results (docs/MEASURE-R17-REPORT.txt): the owner chose the rank tier guard G (H11), kept ρ_c 0.20 as a cautious value (H12) and took H10 in full with the shared supply (H13). The report on the final v14 defaults is docs/MEASURE-V14-REPORT.txt; its numbers are in §9.1.
- **Owner decisions 2026-11-28 (were open in v14; question (1) superseded by H14 the same day):** (1) keep the guard at P >= 0.8 (the 11.1-11.6 % with item gain is accepted; part of it is genuine item learning); (2) accept the slow re-promotion to the pre-dip current form (the cautious choice; 67.6 % are back at their true tier). The questions as asked: (1) with item-practice gain switched on in the harness, stationary learners' rank rises at a true p < 0.5 in 11.1–11.6 % (target 10 %; 2.0 % without item gain); G at P ≥ 0.9 brings this to 2.5–5.1 % but adds 3 days to the median tier at p 0.75, 3 d/wk (23 → 26), and gives 5 stalls in 260 climbs — keep 0.8 or move to 0.9 (§9.1)? (2) Re-promotion after a dip is slow on the v14 defaults: 16.9 % are back at their pre-dip current form within 120 days, because that form sat at a tier the learner holds at p 0.67, just above the 0.6 re-promotion bar; 67.6 % are back at their true tier (§9.1) — accept, or lower the re-promotion confidence?
- **Decided by the owner, 2026-11-28 (the four v15 questions, asked on docs/MEASURE-V15-REPORT.txt; v16 numbers from docs/MEASURE-V16-REPORT.txt):**
  1. **The guard setting:** **B, P ≥ 0.9** (H14). v16 measures 3.0 % / 4.0 % per learner without item gain and 13.0 % / 10.0 % with it (asked on 3.3 % / 5.0 % and 11.7 % / 10.0 % from 60 learners), at 26 / 64 days per tier at p 0.75, 3 d/wk (asked on 26 / 64), but with stalls the question's table did not show (keyless and few-cell areas, guitar/arpeggios): see the new question below.
  2. **Warm-first skips:** **always a miss** (H15), in the guard record and the clean share, whatever the skip share; the UI warns before such a take (he / en text in §0 H15 and §1.6). The 20 % skip share applies only to unplayed due checks. Measured cost to an honest learner who warms up first on a random 20 % of days, under P ≥ 0.9: 47 / 240 days per tier against an honest 26 / 70.
  3. **Merge downgrades:** **a downgrade within 24 h re-derives rank** (H16, §1.4).
  4. **H10 targets per kind of area:** **accepted** (H17). Under P ≥ 0.9 the tempo areas meet them (0.80 / 0.82) and plateaued learners meet the appropriateness target (0.42–0.44, 13–25 % hopeless days); the fixed-tempo lag at piano/harmony does not (0.53), see below.
- **Open for the owner (v16):**
  1. **The guard's design effect in areas with few cells.** At P ≥ 0.9 the targets that P ≥ 0.8 met fail in three places: rotation-only climbs in keyless areas (keyless 3 per tier: 3 / 20 stalls, up to 103 days; 2 per tier: 16 / 20, up to 233 days, 90 % reach the top; a real-ish keyless area: 11 / 20, 85 % reach the top), one real area outside a catalogue gap (guitar/arpeggios, 1 / 20 climbs stalled 46 days at rank none), and the fixed-tempo H10 lag at piano/harmony (0.53, target ± 0.5). The cause is the guard's design effect counting raw entries per cell over a long record (§9.1 note). Options, measured on the same seeds (report section W):

     | Option | Per learner p 0.5 / 0.75, no gain / item gain | Keyless 3 / 2 / real-ish: reach top; stalls (longest) | Real areas: stalls (longest) | Days per tier p 0.75 (median / p90) | piano/harmony slope; lag |
     |---|---|---|---|---|---|
     | **As decided: P ≥ 0.9** | 3.0 / 4.0 %; 13.0 / 10.0 % | 100 %, 3 (103) / 90 %, 16 (233) / 85 %, 11 (252) | 2 (58: bass/walking; guitar/arpeggios 46) | 26 / 64 | 0.63; 0.53 |
     | **W1. P ≥ 0.9 + weighted design effect (recommended)** | 1.0 / 6.0 %; 23.0 / 38.0 % | all 100 %, 0 stalls (29 / 32 / 40) | 1 (58: bass/walking, the catalogue gap) | 26 / 59 | 0.67; 0.48 |
     | W2. P ≥ 0.9 + the newest 48 entries only | 3.0 / 4.0 %; 18.0 / 24.0 % | all 100 %; 0 / 1 (49) / 0 | 2 (58) | 26 / 63 | 0.69; 0.52 |
     | v15: P ≥ 0.8 | 6.0 / 10.0 %; 39.0 / 60.0 % | all 100 %; 0 / 1 (60) / 0 | 2 (47, both bass/walking) | 24 / 55 | 0.69; 0.41 |

     **W1 is a correction, not a policy:** a design effect that counts entries the recency weighting no longer retains overstates the dependence in the record, so W1 is the statistically correct reading of §1.7's n_eff over a weighted record. The question is therefore which P to use with it. **The P grid with W1** (same seeds; report section G; per learner = final rank at probe-band p < 0.5; days per tier over the 13 real areas, 3 d/wk; stalls ≥ 42 days):

     | Setting | Per learner p 0.5 / 0.75: no gain; item gain | Real piano areas, per learner | Days per tier p 0.75; p 0.85 (median / p90) | Real areas: stalls (longest; where) | Keyless-3 / keyless-2 / keyless real-ish / 1-key / 2-key: stalls (longest) | Harmony slope; lag | Fixed-tempo synthetic slope; lag |
     |---|---|---|---|---|---|---|---|
     | Default (P 0.9, raw design effect) | 3 / 4 %; 13 / 10 % | 8.7 % | 26 / 64; 21 / 37 | 2 (58; guitar/arpeggios, bass/walking) | 3 (103) / 16 (233) / 11 (252) / 0 / 0; 90 % and 85 % reach the top in keyless-2 / real-ish | 0.63; **0.53** | 0.61; 0.49 |
     | **W1, P 0.9** | 1 / 6 %; **23 / 38 %** | **20.0 %** | 26 / 59; 21 / 37 | 1 (58; bass/walking only) | 0 / 0 / 0 / 0 / 0 | 0.67; 0.48 | 0.64; 0.42 |
     | W1, P 0.93 | 2 / 2 %; 11 / 20 % | 15.3 % | 27 / 68; 21 / 39 | 1 (46; guitar/arpeggios) | 0 / 1 (42) / 2 (46) / 0 / 0 | 0.67; **0.57** | 0.62; 0.48 |
     | W1, P 0.95 | 0 / 1 %; 3 / 19 % | 14.7 % | 30 / 77; 22 / 41 | 3 (71; piano/scales, guitar/harmony, guitar/arpeggios) | 0 / 4 (50) / 1 (42) / 0 / 0 | 0.67; **0.58** | 0.66; **0.52** |
     | W1, P 0.97 | 2 / 1 %; 6 / 10 % | 10.0 % | 34 / 94; 24 / 44 | 6 (52; 5 areas) | 0 / 4 (52) / 2 (46) / 0 / 0 | 0.70; **0.60** | 0.62; **0.60** |
     | W1, P 0.9 + ≥ 3 distinct days among the newest 24 entries | 1 / 8 %; 26 / 34 % | 17.3 % | 26 / 59; 21 / 37 | 1 (58; bass/walking) | 0 / 0 / 0 / 0 / 0 | 0.71; 0.48 | 0.65; 0.41 |
     | W1, P 0.9 + only the first 3 counting checks per cell | 4 / 3 %; 20 / 22 % | 18.0 % | 27 / 66; 21 / 39 | 1 (58; bass/walking) | 0 / 0 / 0 / 0 / 0 | 0.62; **0.52** | 0.64; 0.43 |

     **No setting meets all three of "item gain ≤ about 12 %, no new stalls, reasonable days".** Item-gain honesty is not monotone in P (0.93: 11 / 20 %; 0.95: 3 / 19 %; 0.97: 6 / 10 %) because it is a bias, not noise: the record's practised cells sit at the bar while fresh cells of the tier do not, and a stricter test of a biased record mostly adds waiting. Every step above 0.9 brings stalls back (in real areas outside the catalogue gap and in keyless areas), moves the harmony lag out of the ± 0.5 band, and slows the median tier (27, 30, 34 days); only P 0.97 reaches item gain ≤ 12 % at both p, at 34 / 94 days per tier and 6 real-area stalls. The two extra rules change little at P 0.9. **Recommendation: W1 at P 0.9**, the only setting that meets every §9.1 target (no-gain honesty, no stall outside the bass/walking catalogue gap, the fixed-tempo lag) at no cost in days. **Its open price is honesty under item gain** (23 % / 38 % per learner, 20.0 % on the real piano areas, against 13 % / 10 % and 8.7 % for the current default): it should be addressed as its own problem (what the guard reads, e.g. weighting each check by how practised its cell is, or a fresh-cell share in the record), not through P; that needs a design and a harness round of its own. **Until the owner decides, the default stays P ≥ 0.9 with the raw design effect** (H14 as decided).
- **Backlog for later tuning (not blockers):** the §9.1 known soft spots.
- Owner may adjust the T → DYN mapping (§1.10).

### 17.5 Owner tasks
- Note-by-note verification of every head (the `verify` flag), every chart (the verify screen) and every PD repertoire piece (§14); the verification time is budgeted.
- Annotation of embeds (owner or teacher, with the annotation tool).
- The human model bank (§8.9), steps 5 and 7, with performer releases.
- The voice-registration framework terms checked with a voice teacher before release.
- **T7–8 content backlog:** T7–8 has no content today (`LadderRung.min` runs 0–6); until it does, the DYN table caps at the highest tier with content (§1.10).

---

## 18. Order of work
1. **Level semantics, built with SP step 1 (cold takes, pass rule).** **Before it starts:** the SP pointer edits (§1.16) as a doc commit. Then:
   - §1.1–§1.6 and §1.12–§1.14: definition; `contentTier` per spec / option (band seeding at the band's lower T; drum rudiments by complexity family, then nps); the voice sub-band and reading quantile tiers (with the syncopation, interval and texture features); `areaTier` {content, pace} and `paceTier`; `placedTier` (entry only, always on a non-empty tier: snapped down), the over-placement correction by the expected trajectory (tempo areas: `paceTier` ≥ 2 tiers below on ≥ 5 offered days, cumulative since the last drop; non-tempo areas: rule N1, ≥ 12 attempts on ≥ 4 offered days with a clean share < 30 %; count restarts at each drop; the correctly-placed harness case); the one entry rule (t + 1, and t + 2 once every available exercise at t + 1 is passed; the entry ceiling over non-empty tiers from the stored `rankHW` and `placedTier`; the rate shift in tiers, capped at +1; never above t + 2) with the climb tests; cold flags with the ≥ 1 h any-sounding-take gap (`lastSound`); native feel counting as straight; cell keys without a hand group, and the main item; first cold take per cell per day for confirmations; the item pass V1 (H9: the warm half; the pair of clean counting cold checks on two distinct later days, ≥ 8 h after the first clean take at target, reset by any cold miss of the main item at the probe band; the clean share ≥ 2/3 over the last ≤ 6 counting cold checks); later-day rules at ≥ 8 h and a different local day; the main-item cold-first ordering in every planner, the rotation and list runs; the voice warm-up before voice cold checks; cross-device downgrade and the 24-h revocation of a downgraded pass; the per-area confirmation table; `cellPass` (voice, rhythm, reading, transfer) with the reading and transfer pass test (recency-discounted counts, half-life 10 attempts, n_eff from the raw counts applied to the discounted counts, P(p ≥ 0.6) ≥ 0.95, ≥ 8 attempts on ≥ 3 days), the voice and rhythm pass rule, transfer counted one exercise per family, and the transfer pool; `established` vs `acquired`; input series; the Elo as practice form; the Ear course skills and `*-ear` routing;
   - §1.7 rank by passed exercises (H8 with the harness decisions): the exact rule (passes at tiers ≥ t; ≥ 2 distinct exercises always, normally min(3, available in tiers t … the entry ceiling); small tiers grouped up, a 1-exercise top tier grouped down; min(2, available keys) over the union of keys; ≥ 1 pass at t; empty tiers skipped; unavailable exercises excluded), the planner's new-key re-offer while the passes above rank cover < 2 keys, `exerciseId` / `exerciseIdOf` (with the nps rung for scales and arpeggios), main-item passes, fixed-tempo rung passes and variants, `cellPass` passes, voice sub-bands with the cents band per tier (or tighter; offered at the required band by default), teacher targets at the catalogue target, licks / Encore phrases / repertoire drills coverage only, stored `passedAt` records and `rankHW` (rank = max(`rankHW`, derived); never falls, can jump), promotion XP once per tier, the "2 of 3" bar, the rank guard tests; the current-form posterior: passed and established cells only, looks (first per cell per day, FSRS review and pass probes outside the slots included, ≤ 2 per area per day, second from another exercise), n_eff with day and cell clustering, the window (tiers ≥ t, last 30 looks within 90 days, only looks after the last decision, breadth over passed and established exercises at tiers ≥ t; no decision on failed breadth), the slump rule (exactly one tier, never below T0), ≥ 8 fresh looks on ≥ 2 days after any drop or rise (a rank-driven rise included), one decision per evaluation, current form following rank up and capped at it, current form while placed and after an input change, hysteresis, "unmeasured", re-promotion after a slump, the re-entry window per item; entry vs current-form roles; the confirmation-slot cap (2–4 per session) with the minimal slot injector in workout2 / todayPlan (passed cells only), probe band only; the simplified placement (§1.3);
   - §1.7 step 6, the rank tier guard (H11), with the planner's fresh-check re-offer and the guard reserve; the shared slot cap with FSRS review probes as looks (H13); ρ_c 0.20 (H12); the skipped-due-check log;
   - v15 (round 18): cells unique per exercise × key, shelving and resuming; the guard record with skipped due checks (misses), unplayed due checks above a 20 % skip share, and the passed cells' looks at tiers with no fresh cell left, plus the guard probe; the guard range lo … t in the reserve and re-offer; teacher-target, loose-voice-band and not-comparable checks out of the record; merge downgrades out of the record; the 60-day pending-pair expiry; evidence readiness, the capped content edge and the struggle step-down (§1.7a); the "cold check first" UI line and the bar-to-next reasons;
   - §1.7a (H10, H13): ready cells; the content edge and the tempo edge; readiness entry from the highest entered tier (≥ min(2, available) exercises with a ready cell), capped at + 2; the challenge point; the no-easier rule on the new / strengthen quota only (re-entry, slump and drop exempt);
   - v16 (owner 2026-11-28): the guard at P ≥ 0.9 (H14); warm-first skips always misses, with the he / en warning before such a take, and the skip share gating only unplayed due checks (H15); rank re-derivation on a merge downgrade within 24 h (H16); the H10 targets per kind of area (H17);
   - §9.1 the harness (src/engine/measure/sim; the reference implementation of §1, its tests green (targets missed are `it.fails` with the measured numbers), the v16 defaults), with the H10 flat-rank slope and appropriateness tests, the per-learner stationary honesty test, the keyless and day-picker tests, and its report (docs/MEASURE-V16-REPORT.txt) re-run on any change to a §1 rule;
   - §1.9 the staircase (R-multiplier step, probe-band confirmations for passed cells) and the MAP threshold estimate;
   - §1.10 rank, current form, the area table and the new-family area mapping, memorised material out of level (guard test), the passed-exercise bar, the DYN top-tier cap;
   - §1.11 the break table;
   - §1.15 the event fields, the cold-entry fields, the `passedAt` record fields, `rankHW`, the derived look log and the fresh-start epoch;
   - guard tests for every warm-peak reader (§1.5, incl. `playerTier`) and the Ear guard tests (§1.14).
2. **§2 quick fixes and §3 reward re-base:** Q4 at its Momentum location with the reward limits (high-water mark, `sessionBonus`, `WEEKLY_LIMIT.plan`), Q6 with Momentum (incl. the high-water false-payout rate); no pay from provisional estimates; Contour Draw (generated, §13.2); the physical-approach briefs (§15).
3. **SP §2 rotation** (and the rest of SP in its own order).
4. **§4 retention:** technique lapses, Ear E1, games / voice / pieces.
5. **§8 real music.** It starts with:
   - the 1A list and its verification;
   - heads.ts `HeadLicence` `tier` / `pdFrom` (replacing `pd-worldwide`), and removal of the superseded comment banning I Got Rhythm and Body and Soul;
   - the region pool, `servable()` and its guard test, `pdFrom` per term class (incl. life+75), the unknown-region rule;
   - the latest-credited-author tier rule and its guard test;
   - the recording test (one rule for every work on the recording: release ≤ 1925; every author published or registered ≤ 1930, or, if unpublished, died ≤ 1955; no authorized 1978–2002 publication; not a work made for hire; unknown → not servable) and its guard tests;
   - the STANDARDS_LEGAL note (app-written contrafact heads not approved) and the `familiar` tag on well-known heads;
   - head difficulty cards and chart difficulty cards;
   - phrase source flags (default "unknown → private"), the sharing gate and the studio sharing rule; community melody sharing stays off until the §17.2 prerequisites exist;
   - the official-channel embed registry;
   - the annotation tool;
   - the verify screen;
   - the chart / head policy (H6, H7: own charts by title, many variations, provenance and verifier);
   - the folk-song checks;
   - the owner's verification time and the human model bank, budgeted as owner tasks.

   Then: heads (owner verifies), the charted-standards library growing beyond about 120, learn-a-tune incl. the band-1 variants and the by-ear variant for every charted standard, capstones, accompanying a singer.
6. **§5 need model and planner retirement** (the step-1 slot injector folds into need()); **§6 goals and plateaus.**
7. **§10–§11 and §13:** lab, transcription, story ladder with its detectors (new code), pop library, voice, how to practise, composition; the drums, games, reading, rhythm, ear and voice items of §13; the human model bank (owner task) continues.
8. **§12–§14:** teacher rubrics, ensemble, flow audit, expression, PD repertoire.
9. **§1.8 Phase B, §1.11, §7, §9** validation steps as their data arrives.

Each step gets:
- simulations;
- an independent build review;
- the §16 checklist;
- in steps 5, 7 and 8, the curriculum-flow audit gate for every new or changed ladder (§13.1).

- in step 1 and on any later change to a §1 rule, the §9.1 harness tests green and its report re-run.

**Done when:** an independent spec-only round on v15 finds no new blocker in this spec (and the SP pointer edits) before step 1 starts. (Round 16 found v12 clean on content; round 17 found four measurement issues in v13, answered in v14 by H11–H13; round 18 found a guard deadlock in keyless areas, the day-picker path, the H10 readiness ratchet and the per-rise statement of honesty in v14, answered in v15.)

---

## Appendix A. Traceability

Every amendment item and where it now lives. v14 keeps v13's section numbers, and v13 kept v12's (adding §1.7a for H10), so the "v12 section" columns of A.1–A.11 still hold in v14; A.12 maps rounds 11–16 (v12 §19–§24, merged and removed) and the harness decisions; A.13 maps round 17 and H11–H13; A.14 maps round 18 (v15). Earlier history: v12 kept v11's, v10's, v9's and v8's section numbers; v11 §16a was folded in and removed; round-7 changes are noted "per R7 19.x" and mapped in A.8; round-8 changes, from v9 §19, are noted "per R8 19.x" and mapped in A.9; round-9 changes, from v10 §19, are noted "per R9 19.x" and mapped in A.10; round-10 changes, from v11 §19, are noted "per R10 19.x" and mapped in A.11). "Struck" items are superseded and appear only in their final form. Two numbering schemes used "19.x": items from the v4 amendment layer are prefixed **v4-** (A.3); the round-4 binding changes are **R4 19.x** (A.4).

### A.1 v2 (§17 of v2–v4)

| Item | Content | v12 section |
|---|---|---|
| B1 | `contentTier`, seeding, guard test, `tierBounds` = tempo, lexicographic ordering, reading complexity | §1.2 |
| B2 | Phase A evidence, confirmation, start-tempo rule, exclusions, "placed, to confirm" | §1.6, §1.7 (statistic per R4 19.1 / R5 20.1 / R6 21.1; breadth now exercises per R6 21.1; placement as `placedTier` per R5 20.2; rank by passed exercises per R7 19.1; placement sets entry only per R7 19.2) |
| B3 | `EAR_COURSE_SKILLS`, secondary tags to sub-skills, guard tests, EAR-INTELLIGENCE governs | §1.14 |
| B4 | cold staircase from previous cold result, pass floor, readers, first check uses SP §2.5 | §1.9 |
| M1 | no decay from inactivity; refresh; two-fail demotion | §1.7, §1.11, §0 "Breaks" (two-fail demotion struck; posterior slump of current form only, per R4 19.1, R5 20.4, R7 19.1) |
| M2 | `areaTier` replaces `playerTier` / A8 / level; placement until confirmed; tolerances | §1.3 (`paceTier` per R4 19.7; placement per R7 19.2) |
| M3 | technique rank 2nd-best; DYN; friend level; bar to next | §1.10 (bar = passed exercises per R7 19.1) |
| M4 | `RatingEvent` item/src/cold; fresh-start epoch | §1.4, §1.15 |
| M5 | one rated event per item per 1-h window | §1.13 |
| M6 | need quotas, weighted sum, new items, absorbs back2/probe, rotation order, recommend.ts, one "next" | §5 |
| M7 | current input's series; note for other input; mic strands "needs MIDI" | §1.12 (rank by passes per R7 19.1) |
| M8 | plateau slope on continuous cold measure; fixed-tempo accuracy | §6.2 (raw cold points per R4 19.3) |
| M9 | plateau replaces plateau.ts only; precedence | §6.2 |
| Q1 | Ear course level | §2, §1.14 |
| Q2 | stretch push ≥ almost | §2 |
| Q3 | cold-only records | §2, §3 |
| Q4 | plan bonus | §2 |
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
| 17.3-l | self-prediction MIDI/voice input | §7 |
| 17.3-m | goal tune complete = memory step cold | §6.1 |
| 17.3-n | projection prior rate | §6.1 |
| 17.3-o | SP §15.4 edit | §6.2, §1.16 |
| 17.4-a | region tiers, verify mode, lawyer, print content, lyric curation | §8.1, §17.1 (unknown region per R6 21.2) |
| 17.4-b | beginner heads list | struck; replaced by the 18.9-a list in §8.2 |
| 17.4-c | head stores as printed / chart / note | §8.2 |
| 17.4-d | learn-a-tune: embed first, memory step cold ≥ 8 h, voice keys, 4–8-bar windows, syllables, drums, revisits | §8.4, §8.5, §16 |
| 17.4-e | contrafact pairs | §8.4 (display and PD-side gate per R7 19.5) |
| 17.4-f | accompanying: human rubato, beat-map grading | §8.7 |
| 17.4-g | listening lab: annotation tool, one per theme, fallback, official channels, IFrame loop/slow, canon | §10.1 (Hot Five / Oliver struck per R5 20.6) |
| 17.4-h | chart policy, ACUM, verify screen, owner time | §8.3, §11.1, §17.5 (collecting societies closed per H7) |
| 17.4-i | pop charts bar grid; comping patterns | §11.1 |
| 17.4-j | grading measures: vowels, register break, back-phrasing, arc, composition, async, expression | §11.2, §10.3, §11.4, §12.3, §14 |
| 17.4-k | strategy choice in §7 slot, ≥ 5 uses, just in time | §11.3 |
| 17.4-l | capstones and tune suggestion skippable | §8.6, §13.1 |
| 17.4-m | reference fixed to §10.3 | §8.4 step 9 |
| 17.5-a | drums: balance, soloist, toms, tuning, joins learn-a-tune / ladders | §13.6, §8.4, §8.8 |
| 17.5-b | games: Contour Draw, First-phrase recall, Groove Match, voice line game | §13.2 |
| 17.5-c | reading: jazz ladder, gig capstone, transposing ladder | §13.3 |
| 17.5-d | rhythm: behind/ahead; swing band app-wide | §13.4 |
| 17.5-e | ear: line-implication, tunes you know, head dictation, rubato harmonic rhythm, EAR v2 | §13.5 |
| 17.5-f | voice: diction, mic technique, English diction | §11.2 |
| 17.5-g | performance ritual | §12.4 |
| 17.5-h | ensemble-roles unit | §12.4 |
| 17.5-i | responsive comping | §8.7 |
| 17.5-j | free improvisation | §8.8 (task-compliance grading per R6 21.2) |
| 17.5-k | post-bop | §8.8 |
| 17.5-l | lesson-plan templates | §12.4 |
| 17.5-m | tune of the week in key of the week | §8.5 |
| 17.5-n | level test / skill map tune section | §13.1 |
| 17.5-o | goal example served tune | §6.1 |
| 17.6 | order of work amended | §18 |
| 17.7 | pop library global, jazz-adjacent; legal pattern; jazz bridge; ACUM no longer blocks | §0, §11.1 |

### A.2 v3 (§18 of v3–v4)

| Item | Content | v12 section |
|---|---|---|
| 18.1-a | unpassed pass-probe branch | §1.9 |
| 18.1-b | 2-up-1-down, step sizes, re-fit | §1.9 (step formula per R4 19.8) |
| 18.1-c | above target: cold cap, non-anchors stop, censored miss, FSRS at ≤ target | §1.9, §4.1 |
| 18.1-d | threshold = mean of last 4 reversals | struck (MAP fit per R4 19.3); "G reads the estimate" in §1.9 |
| 18.1-e | key-session cold check replaced | §1.9 |
| 18.1-f | fixed-tempo items no staircase | §1.9 |
| 18.2 | `areaTier` {content, band}; readers | §1.3 (band → `paceTier` per R4 19.7) |
| 18.3-a | SPRT promotion + ≥ 2 days | struck (posterior per R4 19.1, R5 20.1, R6 21.1; rank by passes per R7 19.1) |
| 18.3-b | demotion, hysteresis | struck (posterior slump of current form, §1.7) |
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
| 18.6-a | areas per instrument | §1.10 (rhythm/time added per R6 21.2) |
| 18.6-b | rank = 2nd-best area | §1.10 |
| 18.6-c | T → DYN table | §1.10 |
| 18.6-d | bar to next as share | struck (posterior bar per R5 20.1, then passed-exercise bar per R7 19.1); "never full below Master" in §1.10 |
| 18.7-a | cold gap: any sounding take in cell; `sessionMs` | §1.4 |
| 18.7-b | rewards above high-water mark | §3 |
| 18.7-c | stricter calibrated input | struck; §1.12 |
| 18.7-d | Q4 limits | §2 Q4 |
| 18.7-e | cross-device sync downgrade | §1.4 |
| 18.7-f | M5 scope instrument only; Ear per trial; cold-only Elo | §1.13 |
| 18.8-a | Elo practice form only; difficulty mapping; coefficients | §1.13 |
| 18.8-b | readiness gate; weights 0.45/0.35/0.2; unpassed forgetting; normalisation | §5 |
| 18.8-c | cell without HT item | §4.1 |
| 18.8-d | voice / rhythm per-item cold store | §1.6 (`cellPass`) |
| 18.8-e | drum quest; `GAIN_WEIGHT.rating` | §2 Q5, §3 |
| 18.8-f | tone/posture/tension not measured | §1.1, §12.1 |
| 18.8-g | tendencies feed next take | §5 |
| 18.8-h | Ear cold rule defers to EAR-INTELLIGENCE | §1.4 |
| 18.9-a | 1A first; beginner and core lists | §8.2 (labels from difficulty cards per R4 19.10; Indiana duplicate struck per R5 20.6) |
| 18.9-b | 1B layer | §8.2 |
| 18.9-c | region pool rule + guard test | §8.1 |
| 18.9-d | examples 1A (goal; contrafacts only where both servable) | §6.1, §8.4 (both-sides rule struck: gate on the PD side only per R7 19.5) |
| 18.9-e | denied regions learn by ear | §8.1 |
| 18.9-f | lawyer question widened | §17.1 |
| 18.9-g | lyric curation for 1A | §8.1 |
| 18.9-h | H4 open, filler, provenance | §0 H4, H5, §8.2 (app-written heads approved per H5) |
| 18.10-a | back-phrasing | §11.2 |
| 18.10-b | comp dynamics vs phrase envelope, MIDI only | §8.7 |
| 18.10-c | drums "needs MIDI"; tom motif matching | §13.6 (drum-motif detector per R5 20.6) |
| 18.10-d | no memorizable items; level-test tune section opt-in | §13.5, §13.1 |
| 18.10-e | syllable rule to integration | §16 |
| 18.10-f | "unknown region → US" struck | §8.1 (unknown → life+100 + H4/H5 pool per R6 21.2) |
| 18.10-g | Scrapple note | struck (gate on the PD side only per R7 19.5) |
| 18.10-h | pop: lead-sheet symbols, riff guard, extra care, exact names | §11.1 (extra care as a note per H7) |
| 18.10-i | SP fit: tune-of-week share, swing tolerances per tier, step 5 registry/1A, Contour Draw step 2 | §5, §8.5, §13.4, §18 |
| 18.10-j | PD lyrics 7 languages + diction | §11.2 |
| 18.10-k | Ear capstones | §8.6 |
| 18.10-l | jazz-bridge links | §8.8 |
| 18.10-m | ballad capstone | §8.6 (titles per R7 19.5) |
| 18.10-n | performance ritual resumes | §12.4 |
| 18.10-o | post-bop prerequisites | §8.8 |
| 18.10-p | transposing ladder deferred | §13.3 |
| 18.10-q | pending memory check | §8.4 step 7 |
| 18.11 | order of work | §18 |
| 18.12 | H4 answered | §0 H4, §8.1, §8.2 |

### A.3 v4 amendment layer (v4 §19)

| Item | Content | v12 section |
|---|---|---|
| v4-19.1-a | sliding-window LLR, ≥ 2 days | struck (rank by passes, §1.7, per R7 19.1) |
| v4-19.1-b | confirmations not selected on success | §1.6 |
| v4-19.1-c | entry gate; confirmed band; climb test | §1.3 (entry rule per R5 20.2, R7 19.2; `paceTier` per R4 19.7), §9 |
| v4-19.1-d | threshold estimation separate (ML fit, provisional, reset, discard 2 reversals) | §1.9 (MAP per R4 19.3; reversal discard dropped; reset kept) |
| v4-19.1-e | FSRS vs staircase | §1.9, §4.1 |
| v4-19.1-f | sticky high-water rank; current form; re-entry window | §1.10, §1.7, §1.11 (window per item per R5 20.4; rank by passes per R7 19.1) |
| v4-19.1-g | areas without `passedAt`: reading, `cellPass`, games excluded | §1.6, §1.2 |
| v4-19.1-h | `acquired` vs `established` | §1.6, §1.5, §5 (in-session per R4 19.5) |
| v4-19.1-i | `lastSound` gap timestamp | §1.4 |
| v4-19.1-j | first cold take per session counts toward level | struck (first per cell per day, §1.4, §1.6) |
| v4-19.1-k | input rule: current input | §1.12 (rank by passes per R7 19.1) |
| v4-19.1-l | voice cold per item | §1.4 |
| v4-19.1-m | SP §17.3 cold-check row deleted; R drives step size | §1.9, §1.16 |
| v4-19.1-n | stale text superseded | removed |
| v4-19.2-a | Contour Draw generated, step 2; head slices step 5 | §13.2, §18 |
| v4-19.2-b | learn-a-tune per band; skip not lock; goal = band memory step; by-ear mode | §8.4, §6.1 |
| v4-19.2-c | human model bank; dependent levels labelled | §8.9 (drum soloist removed per R6 21.2), §8.7, §11.2, §14, §13.1 |
| v4-19.2-d | region gate on content: tiers, `servable()`, guard test, folk/trad, region signal | §8.1 |
| v4-19.2-e | no memorizable Ear evidence | §13.5, §1.14 |
| v4-19.2-f | physical approach briefs | §15 |
| v4-19.2-g | YouTube player | §10.1 |
| v4-19.2-h | lawyer list adds Mexico etc. | §17.1 |
| v4-19.2-i | "harmony is the work" to post-bop / Shorter | §8.3 (as a note per H7) |
| v4-19.2-j | capstone mapping table | §8.6 |
| v4-19.2-k | voice proxies AGC off, per-device levels | §11.2 |
| v4-19.2-l | comp dynamics via synth rendered loudness | §8.7 |
| v4-19.3 | order of work | §18 |

### A.4 Round 4 (R4, §19 of v6–v7)

| Item | Content | v12 section |
|---|---|---|
| R4 19.1 | beta-binomial posterior, prior Beta(1, 1), demotion P(p < 0.5) ≥ 0.95 over ≥ 8 on ≥ 2 days, indifference zones, operating characteristic | §1.7 (window 30 / 0.975 per R5 20.1; promotion "≥ 2 days" struck per R6 21.3; 1-per-tier-per-day look cap struck per R6 21.1; promotion as the rank source, 0.975 and the horizon target struck per R7 19.1: the posterior drives current form only) |
| R4 19.2 | above-target takes excluded from confirmations both ways; probe-band confirmations | §1.6, §1.9 (passing-take exclusion struck per R5 20.1) |
| R4 19.3 | MAP threshold estimate; provisional; no pay from provisional; plateau on raw points | §1.9, §2 Q3, §3, §6.2 |
| R4 19.4 | cold take counting: level vs pass/FSRS/staircase; warm-up not penalised; rhythm reconciled | §1.4 (per cell per day per R5 20.3) |
| R4 19.5 | `acquired` in-session (D2 / A10), `established` cross-session | §1.6, §1.3 |
| R4 19.6 | rank over inputs | §1.10, §1.12 ("max over inputs, shown with input" struck; pooled posterior struck per R7 19.1) |
| R4 19.7 | `paceTier`; band = SP §14; beginner = A3; entry formula; prerequisites; teacher forms exempt; band seeding at lower T | §1.2, §1.3 (entry formula per R5 20.2) |
| R4 19.8 | range top; re-entry end; cell key; staircase step; key-session cold-first; SP governance list; `playerTier` guard | §1.7, §1.4, §1.9, §1.16, §1.5 (re-entry per item per R5 20.4; hand group struck and cold-first in every planner per R10 19.2) |
| R4 19.9 | rank semantics owner question | §0 H8, §1.10 (answered per R5 20.8; replaced by H8 per R7 19.7) |
| R4 19.10 (area mapping) | new families → area or coverage only | §1.10 table |
| R4 19.10 (difficulty card) | head difficulty card; beginner/core derived; matching; checklist | §8.2, §13.1, §16 |
| R4 19.10 (term classes) | `pdFrom` per term class; long-term denial; 1A = US + life+70 | §8.1 |
| R4 19.10 (phrases) | source flags; protected content private; teacher/ensemble via `servable()` | §8.10 (teacher/ensemble rule narrowed per R5 20.6, R6 21.2) |
| R4 19.10 (minor) | step 1 click-to-play; Hot Five date fact; 78-rpm PD-clean; other-style 1A heads; Tárrega, Schirmer arias; accompaniment L2–3 melody source; curated pop example | §8.4, §8.1, §8.2, §14, §8.7, §11.1 (Hot Five struck per R5 20.6) |
| R4 19.11 | order of work step 1 / step 5 adds | §18 |

### A.5 Round 5 (R5, §20 of v7)

| Item | Content | v12 section |
|---|---|---|
| R5 20.1 (looks) | look = first eligible confirmation per cell per day, time order | §1.7, for the current-form posterior (6-per-day cap struck; 2 per area per day per R6 21.1) |
| R5 20.1 (window) | window 30; breadth; promote at 0.975 | §1.7, posterior window (item breadth struck: exercises per R6 21.1; 0.975 struck per R7 19.1; rank breadth per R7 19.1) |
| R5 20.1 (passing take) | passing take included | §1.6 |
| R5 20.1 (target) | < 5 % at p ≤ 0.55 over 730 looks | struck (no false-promotion horizon target per R7 19.1) |
| R5 20.1 (OC) | round-5 operating characteristic; guard test on easiest item | struck (round-5 OC and "2–3 weeks" per R7 19.1); guard tests per R7 19.1 in §1.7 |
| R5 20.1 (bar) | bar shows posterior every practice day | struck (bar = passed exercises per R7 19.1) |
| R5 20.2 | `placedTier`; entry rule; placed test; demotion at placedTier; A8 switch deleted | §1.3, §1.7, §1.16 (placed test struck; entry and correction per R7 19.2; posterior-slump correction struck per R9 19.4) |
| R5 20.3 | per-area confirmation table | §1.6 (voice row per R6 21.1) |
| R5 20.4 | re-entry per item; cold rise non-provisional; SP §9 = item pass; jitter check; SP pointer edits before step 1; superseded text | §1.7, §3, §1.16, §1.10, §9.1 ("drop below the band" struck per R6 21.1) |
| R5 20.5 Q1 | rank speed question | §0 H8 (answered per R5 20.8; replaced by H8 per R7 19.7) |
| R5 20.5 Q2 | the 5 app-written heads | §0 H5, §8.1, §8.2 (answered by owner, H5) |
| R5 20.6 (recordings) | `servable(recording)` (a)–(c); canon replaced | §8.1, §10.1 |
| R5 20.6 (detectors) | story-ladder detectors; new code in step 7 | §10.3, §13.6, §18 step 7 |
| R5 20.6 (studio) | private 1:1 exchange; distribution through `servable()`; lawyer list | §8.10, §17.1 |
| R5 20.6 (mapping) | voice text/registration/diction, story ladder, lab, jazz reading, Groove Match | §1.10, §11.2, §10.1, §10.3, §13.2, §13.3 |
| R5 20.6 (minor) | Ain't Misbehavin' 1B; syllable "letters"; learn-a-tune band/voice/octave-equivalent; Romantic rubato, Baroque brief; Ear capstones per theme; Indiana duplicate removed | §8.2, §17.1, §16, §8.4, §14, §8.6 |
| R5 20.7 | order of work adds | §18 |
| R5 20.8 | owner answer: accurate rank approved; Q2 open at the time | struck (replaced by H8 per R7 19.7); Q2 closed by H5 |

### A.6 Round 6 (R6, §21 of v7-pre)

| Item | Content | v12 section |
|---|---|---|
| R6 21.1 (dependence) | harness day/cell random effects; 2 looks per area per day, second from another exercise; threshold raised under dependence; owner sees real numbers | §1.7, §9.1, §17.4 (threshold struck and report contents per R7 19.1) |
| R6 21.1 (breadth) | breadth in exercises; guard test one exercise | §1.6, §1.7 |
| R6 21.1 (over-placement) | absence-of-evidence drop of `placedTier` | §1.3 (replaced by the 20-practice-day correction per R7 19.2) |
| R6 21.1 (current form) | re-promotion, no XP, initialisation | §1.7, §3 (initialised as rank per R7 19.1) |
| R6 21.1 (supply) | ≥ 2 confirmation slots per day via need; calendar report; keyless areas | §1.7, §5, §9.1 (slots replaced by the daily cap per R7 19.3) |
| R6 21.1 (probe band) | passed cells confirm in the probe band | §1.6, §1.9, §1.7 (probe band the only confirmation tempo per R7 19.3) |
| R6 21.1 (inputs) | pooled promotion posterior | struck (rank by passes per R7 19.1) |
| R6 21.1 (voice) | voice cell; one look per own cell; cents sub-band, never added | §1.2, §1.6 |
| R6 21.1 (reading) | reading T by catalogue quantiles | §1.2 |
| R6 21.1 (data) | cold-entry fields; derived look log; no history rewrite | §1.15 |
| R6 21.1 (no locks) | entry rule limits only rotation and planner | §1.3, §5, §16 |
| R6 21.2 (free improv) | task-compliance grading, coverage only | §8.8, §1.10 |
| R6 21.2 (region) | unknown → life+100 + H4 pool; 1A definition; life+75 class | §8.1, §17.1 |
| R6 21.2 (sharing) | distribution prerequisites; "unknown → private"; student ↔ student private | §8.10, §17.2, §12.3 |
| R6 21.2 (by-ear goals) | by-ear variant for every charted standard | §8.4, §6.1 (extended to the full library per H6) |
| R6 21.2 (YouTube) | monetisation policy question | §17.1 |
| R6 21.2 (minor) | recording test (c) every ensemble member; band-1 variants; drum soloist via licks; embed tap windows; pop bar grid windows; dotted pairs; area mapping (§14, piece coach, rhythm/time area); drum balance per kit; klezmer deferred; Happy Birthday date | §8.1, §8.4, §8.9, §13.6, §10.1, §11.1, §8.2, §1.10, §14, §13.1, §0 H4 |
| R6 21.3 | consolidation and the stale-line list | this document (all listed lines removed) |

### A.7 Owner decisions entered during the consolidation

| Item | Content | v12 section |
|---|---|---|
| H5 | 5 app-written jazz heads approved as labelled practice tunes | §0, §8.1, §8.2 |
| H6 | standards by title with own charts; embeds; by-ear variant; library beyond ~120 | §0, §8.3, §8.4, §6.1, §18 step 5 |
| H7 | collecting-society question closed; all major standards incl. Latin; many variations; protected melodies never served; "harmony is the work" as a note | §0, §8.3, §11.1, §17.1 |

### A.8 Round 7 (R7, §19 of v8)

| Item | Content | v12 section |
|---|---|---|
| R7 19.1 (rank) | rank = highest tier with ≥ 3 distinct passed exercises in ≥ 2 keys; pass definition; keyless areas min(3, available), unavailable exercises excluded; fixed-tempo rung passes; voice/rhythm/reading `cellPass` passes | §1.1, §1.6, §1.7, §1.10 ("at that tier" wording struck: tiers ≥ t and one rule for keyed and keyless areas per R8 19.1) |
| R7 19.1 (never falls, bar, time) | high-water, a pass stays a pass; bar "2 of 3" plus keys, never backward; about 1–3 weeks per tier, harness reports per area | §1.7, §1.10, §0 H8, §9.1 |
| R7 19.1 (posterior) | posterior (window 30, Beta(1, 1), day-dependence aware) drives only current form, adaptivity (entry, need, spacing, refresh probe) and reporting; slump rule; no horizon target; harness reports calibration | §1.1, §1.7, §1.8, §1.11, §9.1, §17.4 (entry struck from the posterior's roles; passed and established cells only; n_eff; re-promotion at P(p ≥ 0.6) ≥ 0.9, per R8 19.3; 90-day window, cell clustering, hysteresis per R9 19.3) |
| R7 19.1 (removed) | posterior promotion as rank source, "2–3 weeks", 0.975, false-promotion horizon target | removed from §0, §1.7, §1.10, §9.1, §17.4, §18 |
| R7 19.1 (guard tests) | one exercise in many keys/hands never raises rank; three passes in one key don't either | §1.7, §9.1 |
| R7 19.2 | `placedTier` sets entry only (≤ max(placedTier, rank) + 1); "placed: T5" until rank reaches it; 20-practice-day / slump correction; initial state | §1.3, §1.6, §1.10, §1.7 (count restart at each drop per R8 19.4; slump correction struck, threshold-estimate rule per R9 19.4) |
| R7 19.3 | daily slot cap 2–4 per session across areas; minimal injector in step 1, folded into need() in step 6; probe band only ("near the band" struck); non-due probe takes not graded into FSRS | §1.7, §5, §1.9, §4.1, §18 steps 1 and 6 ("daily" struck: 2–4 per session per R8 19.6) |
| R7 19.4 | memorised material (played heads: learn-a-tune, k-pop, k-accomp-voice) → coverage and `repertoire-memory`; only transfer forms feed level; guard test | §1.10, §8.4, §8.7, §11.1, §1.7 |
| R7 19.5 (contrafacts) | PD head melody (region-gated) + bebop chart only + embed + by-ear; gate on the PD side only | §8.4 (Scrapple both-sources note struck) |
| R7 19.5 (by-ear) | "my chart"; functional equivalents | §8.4, §6.1 |
| R7 19.5 (native feel) | native feel counts as straight; feel-layer modifiers non-qualifying; SP §16.5 amended | §1.4, §1.6, §1.16, SP §22 |
| R7 19.5 (reading) | reading items rule-generated per tier | §1.2 |
| R7 19.5 (goals) | "My Blue Heaven by June" (served 1A head); "with a singer" needs a human singer's take | §6.1 (goal tunes from the region pool, 1B for US learners, per R8 19.5) |
| R7 19.5 (ballad) | 1A ballad (If I Could Be with You, spirituals) or practice ballad Quiet Hours | §8.6 |
| R7 19.5 (drums, voice) | timing SD folded into drum grooves; voice range/agility at comfortable tessitura | §1.10 (voice areas = pitch and time per R10 19.5) |
| R7 19.5 (owner tasks) | PD repertoire note-by-note verification | §14, §17.5 |
| R7 19.5 (non-US) | rhythm changes, modal and Coltrane forms only by ear outside the US | struck (modal and Coltrane by ear everywhere; rhythm changes 1B in the US only, per R8 19.5), §8.4 |
| R7 19.6 (later day) | ≥ 8 h and a different local day for `established`, SP §4.2 later-day take, `firstTargetDay` | §1.6, §1.16, §18 step 1 |
| R7 19.6 (cold rise) | Momentum "cold rise" only on a rise > 1 posterior SD above the previous high | §3, §1.9 |
| R7 19.6 (rank jump, voice sub-bands) | passes at a higher tier raise rank directly; voice passes per cell, rank by item level, 60 ¢ sub-band shown | §1.7 (cents band not part of exercise identity per R8 19.1; "60 ¢ pass at the 60 ¢ sub-band only" replaced by the cents band per tier per R9 19.5) |
| R7 19.6 (SP pointer) | SP §22 updated to v9 numbers; SP §14 area-tier definition superseded | §1.16, SP §22 (v10 keeps the v9 numbers, so the pointers stand) |
| R7 19.7 | owner decision H8 replaces the "rank speed" row | §0 H8 |

### A.9 Round 8 (R8, §19 of v9)

| Item | Content | v12 section |
|---|---|---|
| R8 19.1 (rule) | rank = highest t with ≥ min(3, available at tiers ≥ t) distinct exercises passed at tiers ≥ t, in ≥ min(2, available keys) keys, ≥ 1 pass at t; breadth = union; passes above count; empty tiers skipped; keyed and keyless same rule | §0 H8, §1.1, §1.7, §1.10 ("at that tier" and keyless-only min(3, available) struck; "available" = planner-offerable per R9 19.2) |
| R8 19.1 (stored state) | `passedAt` record `{contentTier, target, exerciseId, src, at}`; synced `rankHW`; rank = max(`rankHW`, derived); re-tiering never lowers rank | §1.7, §1.15, §18 step 1 |
| R8 19.1 (exercise identity) | `exerciseId` / `exerciseIdOf` with a test; pass = the cell's main (HT) item, hand-separate never alone; fixed-tempo rungs under the §1.6 rule; variants not distinct; in-session "rung passed today" not a `passedAt`; cents band not part of identity | §1.6, §1.7 |
| R8 19.1 (teacher targets) | rank only at ≥ the catalogue target; a lower teacher target = coverage and the assignment | §1.7 ("catalogue target" defined per R9 19.9) |
| R8 19.1 (promotion XP) | once per tier gained, under the Q6 caps | §1.7, §3 |
| R8 19.1 (guard tests) | scattered passes; empty tier; all-"needs MIDI" mic tier; three RH-only passes; three variants of one rung; one voice item in three cents bands; lowered teacher target; re-tiering never lowers rank | §1.7 |
| R8 19.1 (top tiers) | T7–8 has no content; DYN caps at the top content tier; T7–8 content an owner backlog item | §1.10, §17.5 ("T7–8 content backlog") |
| R8 19.2 (transfer) | ≥ 3 clean of the last 5 distinct unseen items on ≥ 2 days; one exercise per tier pass | §1.6, §1.7, §1.10, §8.4 ("3 of the last 5" struck: Bayesian test per R9 19.1, then recency-discounted posterior and one exercise per family per R10 19.1) |
| R8 19.2 (reading) | ≥ 3 clean in the last 5 cold first-sight takes on ≥ 2 days; reading exercise = generator × tier | §1.6 ("3 clean first-sight takes" struck; "3 of the last 5" struck: Bayesian test per R9 19.1) |
| R8 19.2 (storage) | `cellPass` covers voice, rhythm, reading and transfer | §1.4, §1.6, §1.7, §1.15, §18 step 1 ("voice and rhythm only" struck) |
| R8 19.3 (follows rank) | on a rank rise, current form = the new rank | §1.7 |
| R8 19.3 (re-promotion) | P(p ≥ 0.6 \| data) ≥ 0.9 (harness may tune); no 30-look cap, all looks since the slump | §1.7 (P(p ≥ 0.7) ≥ 0.95 struck) |
| R8 19.3 (passed cells only) | posterior counts only passed and established cells; unpassed probes feed staircase and threshold only; new work never a slump | §1.4, §1.6, §1.7 |
| R8 19.3 (n_eff) | n_eff = n / (1 + (m − 1)ρ) defines "day-dependence aware" | §1.7 (cell clustering added per R9 19.3) |
| R8 19.3 (roles) | entry = max(`placedTier`, rank) + 1, never shrinks; current form sets §5 distance, need weights, spacing, tempo choice, not entry | §1.1, §1.3, §1.7, §5 ("posterior drives entry" struck) |
| R8 19.4 | over-placement count restarts at each drop, only days with `placedTier` items offered; a drop below band 2 restores beginner status, D1 floor 3 | §1.3, §18 step 1 |
| R8 19.5 (forms) | modal and Coltrane by ear everywhere; rhythm changes melody (1B) US only, by ear elsewhere | §8.4 ("Non-US regions: … modal and Coltrane forms …" struck) |
| R8 19.5 (flow audit) | flow-audit gate for every new or changed ladder in steps 5, 7, 8; upper Ear, voice, drums, bass, guitar audits scheduled | §13.1, §18 |
| R8 19.5 (goal projection) | target-tier goal by passes per practice hour; tempo goal by G | §6.1 |
| R8 19.5 (drum rudiments) | content tier = nps tier, like scales | §1.2 (struck: complexity family, then nps, per R9 19.9) |
| R8 19.5 (swing band) | accept band widens upward below ♩ 110; D9 target unchanged | §13.4 |
| R8 19.5 (trading 4s) | inside the form for keys, guitar, bass and voice; graded by form position and density, improv-prep in line-jazz | §8.4 (line-jazz grading struck: coverage only per R10 19.5) |
| R8 19.5 (goal tunes) | from the learner's region pool (1B for US learners) | §6.1 |
| R8 19.5 (no official recording) | the app's clean version only | §8.4 step 1 |
| R8 19.5 (Scrapple) | only the A sections match; the bridge is I Got Rhythm | §8.4 |
| R8 19.5 (§9.1 report) | re-promotion time per area | §9.1, §17.4 |
| R8 19.6 (slot cap) | 2–4 per session | §1.7, §5, §18 step 1 ("daily" / "2–4 per session" ambiguity struck) |
| R8 19.6 (looks) | FSRS review probes and pass probes outside the slots count as looks; slots guarantee a minimum supply | §1.7 |
| R8 19.6 (breadth fail) | no decision; the slot injector picks the missing exercise or key | §1.7 |
| R8 (consolidation) | v9 §19 merged and removed; done-when moved to round 9 on v10 | this document, §18 |

### A.10 Round 9 (R9, §19 of v10)

| Item | Content | v12 section |
|---|---|---|
| R9 19.1 (technique pass) | the counting cold take is the cell's first cold take of that local day; a cold miss that day blocks the pass until another day; every other cold take still feeds FSRS and the staircase | §1.4, §1.6, §1.16, §18 step 1 ("every cold take counts" for the pass and "SP §4.2 unchanged" struck; single first-cold-take pass and "a cold miss that day blocks" struck: 2 first-cold takes of the main item on two distinct later days per R10 19.1) |
| R9 19.1 (reading, transfer) | Bayesian test over all cold attempts at the tier since it started: Beta(1, 1), pass at P(p ≥ 0.6 \| data) ≥ 0.9, ≥ 5 attempts on ≥ 2 days; harness false-pass rate at true p = 0.4 and 0.5, target < 10 % at 0.5 | §1.6, §1.10, §8.4, §9.1, §17.4, §18 step 1 ("≥ 3 clean in the last 5", "rate rule" and "a lucky streak can't pass it" struck; "all attempts since the tier started", Beta(1, 1), 0.9, ≥ 5 on ≥ 2 days struck per R10 19.1) |
| R9 19.1 (voice, rhythm) | the technique rule; clean = within the cents and timing band (voice) or SD band (rhythm); 3 clean on ≥ 2 days incl. the first cold take of a later day | §1.4, §1.6 ("all cold takes for passes" struck; pass rule per R10 19.1) |
| R9 19.2 | "available" = min(3, available exercises in tiers t … entry ceiling); entry also opens t + 2 once every available exercise at t + 1 is passed; guard test: a 2-exercise tier climbed rotation-only | §0 H8, §1.1, §1.3, §1.7, §1.10, §18 step 1 ("available exercises at tiers ≥ t" struck; entry ceiling over non-empty tiers from stored `rankHW` per R10 19.3; ≥ 2 exercises and grouped tiers per the harness decisions, A.12) |
| R9 19.3 (breadth, tiers, injector) | breadth over passed and established exercises, min(3, that count); current form at t reads passed cells at tiers ≥ t; the slot injector targets passed cells only | §1.1, §1.7, §5, §18 step 1 (breadth over all exercises at the tier struck) |
| R9 19.3 (window, n_eff) | looks from the last 90 days, the last 30 within that; n_eff with day and cell clustering; ρ_d and ρ_c stated in §9.1 | §1.7, §9.1 ("window 30" alone and n / (1 + (m − 1)ρ) struck) |
| R9 19.3 (wrong demotion) | < 5 % per 90 days of practice at true p ≥ 0.75 | §1.7, §9.1 |
| R9 19.3 (unmeasured, hysteresis) | no passed cells → "unmeasured", moved only by re-promotion at the tier above; hysteresis: re-promotion at P(p ≥ 0.6) ≥ 0.9, slump at P(p < 0.5) ≥ 0.95; initialised from rank and capped at it | §1.1, §1.7, §1.10 (current form as plain "p ≥ p* = 0.7" and "initialised as `placedTier` while placed" struck) |
| R9 19.4 | the posterior-slump clause for `placedTier` deleted; drop on staircase or threshold estimates < 0.8 × target on ≥ 3 exercises over ≥ 5 offered days; 20-offered-day slow path stays; current form from threshold estimates while placed | §1.3, §1.7, §18 step 1 (0.8 × target rule and the slow path struck: trajectory rule per R10 19.3; placed current form per R10 19.4) |
| R9 19.5 | cents band per tier for rank: T0–2 60 ¢, T3–4 45 ¢, T5+ 30 ¢; a looser-band pass is coverage only | §1.2, §1.7, §18 step 1 ("60 ¢ pass at the 60 ¢ sub-band only" struck) |
| R9 19.6 | licks, Encore phrases, repertoire drills coverage only for rank (SP §4.2's old rule, memorised); rule-generated licks only as unseen generated licks at sight, in the transfer class; guard test: a warm lick pass never raises rank | §1.6, §1.7, §1.10, §1.16, §18 step 1 |
| R9 19.7 | trading 4s and responsive comping: the other player from the §13.6 sources, else drums only or silent; never an app-improvised soloist | §8.4, §8.7 |
| R9 19.8 | repertoire axis per course: hardest difficulty card + tunes and pieces completed to the cold memory step and kept up by piece FSRS; "Repertoire: N tunes, hardest T4"; feeds Momentum and goals, never rank | §1.1, §1.10, §3, §6.1 |
| R9 19.9 (merge) | a pass whose counting take is downgraded at merge is revoked if set within 24 h | §1.4, §18 step 1 |
| R9 19.9 (catalogue target) | the option's target at its catalogue entry band, before any rate shift | §1.7 |
| R9 19.9 (STANDARDS_LEGAL) | the heads are "US PD + tier" | §8.2 ("public domain worldwide" struck) |
| R9 19.9 (heads.ts) | `HeadLicence` `tier` / `pdFrom` replacing `pd-worldwide`; the superseded I Got Rhythm / Body and Soul comment removed | §8.2, §18 step 5 |
| R9 19.9 (self-checks) | by-ear melody self-check, performance self-rate and rubric self-rating use the §7 MIDI-key or voice yes/no input | §7, §8.4, §12.1, §12.4 |
| R9 19.9 (rate shift) | the rate's entry shift works in tiers, capped at +1; SP "band step" = tier step | §1.3, §1.16 |
| R9 19.9 (transfer pool) | filled by keys and charts; harness checks every transfer tier is reachable | §1.6, §9.1 |
| R9 19.9 (unknown region) | the region-safe pool (practice heads, songbook, voice melodies, licks, charts) carries these users | §8.1 |
| R9 19.9 (drum rudiments) | `contentTier` seeds rudiment complexity (single / double / diddle / flam / drag), then nps within the family | §1.2, §18 step 1 ("content = nps tier, like scales" struck) |
| R9 19.9 (Momentum) | the high-water false-payout rate measured in the Q6 test | §2 Q6, §18 step 2 |
| R9 (consolidation) | v10 §19 merged and removed; done-when moved to round 10 on v11 | this document, §18 |

### A.11 Round 10 (R10, §19 of v11) and the v11 clarifications (v11 §16a)

| Item | Content | v12 section |
|---|---|---|
| R10 19.1 (item pass) | technique, voice and rhythm item pass: 3 clean on ≥ 2 days plus 2 clean first-cold takes of the main item on two distinct later days; a cold miss between resets the pair; harness reports P(pass \| cold clean rate), p = 0.2–0.9, to the owner | §1.4, §1.6, §1.7, §1.16, §9.1, §17.4, §18 step 1 (single cold take pass struck; fixed-tempo rungs follow the same item pass rule; the pair alone struck: V1 per H9, A.12) |
| R10 19.1 (reading, transfer) | recency-discounted posterior (half-life 10 attempts, all attempts in order), day-clustering n_eff, P(p ≥ 0.6) ≥ 0.95, ≥ 8 attempts on ≥ 3 days; false-pass rate at p = 0.5 < 10 % with day SD 0.8; time to pass 0.3 → 0.85 | §1.6, §9.1, §17.4, §18 step 1 (Beta(1, 1), 0.9, ≥ 5 on ≥ 2 days, "all attempts since the tier started" struck) |
| R10 19.1 (transfer counting) | one exercise per family (chart at sight, learn-a-tune transfer, k-accomp-voice, k-pop, generated licks); keys = keys of the clean attempts | §1.6, §1.7, §1.10, §18 step 1 |
| R10 19.1 (scale identity) | exercise = spec + option + nps rung, one `passedAt` per rung; guard test: 3 tempo tiers = 1 exercise per tier | §1.2, §1.6, §1.7, §18 step 1 |
| R10 19.1 (voice band) | pass counts at the tier's band or tighter; planner offers the required band by default | §1.2, §1.7, §18 step 1 |
| R10 19.2 (cell key) | family + level id + key, no hand group; "first cold take of the day" = the main item | §1.4, §1.6, §18 step 1 ("+ hand group" struck) |
| R10 19.2 (cold-first) | every planner, the rotation and list runs play the main item's cold check before any other sounding take of the cell | §1.4, §1.16, §18 step 1 |
| R10 19.2 (voice warm-up) | voice cold check never before ≥ 2–3 min of warm-up (SOVT or other voice cells) | §1.4, §18 step 1 |
| R10 19.3 (over-placement) | tempo areas: `paceTier` ≥ 2 tiers below on ≥ 5 offered days; non-tempo areas: no non-provisional estimate or rung pass in 20 offered days and posterior P(p < 0.4) ≥ 0.9; never the provisional estimate; harness: a correctly placed learner never corrected | §1.3, §9.1, §18 step 1 ("below 0.8 × target" and the 20-practice-day slow path struck; the non-tempo posterior and 20-offered-day rule struck: N1, A.12) |
| R10 19.3 (entry ceiling) | + 1 and + 2 over non-empty tiers; from stored `rankHW` and `placedTier`; guard test per area on the real catalogue | §1.3, §1.7, §9.1, §18 step 1 (ceiling over all tiers struck) |
| R10 19.4 (slump) | exactly one tier; ≥ 8 fresh looks (raw n) on ≥ 2 days after any drop or rise, plus the n_eff rule | §1.7, §18 step 1 |
| R10 19.4 (windows, unmeasured) | tiers ≥ t; each decision uses only looks after the last decision; "unmeasured" = no passed cell at tiers ≥ t | §1.1, §1.7, §18 step 1 |
| R10 19.4 (while placed) | highest tier with ≥ min(3, offered) exercises at a non-provisional estimate ≥ 0.95 × target, capped at `placedTier`; non-laddered areas use `placedTier` until passed cells | §1.3, §1.7, §18 step 1 ("min(threshold tier, placedTier)" struck) |
| R10 19.4 (input change) | new series starts at rank, "new input" until 8 looks | §1.1, §1.7, §1.12 |
| R10 19.5 (trading 4s) | coverage only, in the §1.10 table | §1.10, §8.4 (graded by density in line-jazz struck) |
| R10 19.5 (chart card) | chart difficulty card: harmonic rhythm, non-diatonic share, key-centre changes, chord qualities, form length, key distance → T by quantiles; feeds transfer tiers, by-ear goals, section suggestions; course-change checklist | §8.3, §1.6, §13.1, §16, §18 step 5 |
| R10 19.5 (soloist) | lick-bank soloist plays bank licks as they are | §8.4, §8.7, §13.6 |
| R10 19.5 (voice areas) | pitch and time; voice learn-a-tune steps → pitch and time; a sung new key is not transfer | §1.10, §8.4 (range/agility and harmony kept as voice areas; v12 editor's note) |
| R10 19.5 (Latin rhythm) | covered by k-montuno, k-brazil and guitar / bass equivalents; on the flow-audit list | §13.1 |
| R10 19.5 (§17.1 example) | Tea for Two (Irving Caesar, died 1996); Honeysuckle Rose corrected to such a case (Razaf died 1973, round 11) | §17.1 |
| v11 §16a (t + 2) | planner-availability exception outside the "+1" stacking limit; base max(placedTier, rank) | §1.3 |
| v11 §16a (90 days) | the 90-day window applies during re-promotion | §1.7 |
| v11 §16a (while placed) | min(threshold tier, placedTier); rank cap once rank exists | struck (placed rule per R10 19.4, §1.7) |
| v11 §16a (keyless, keys) | keyless breadth = min(3, passed + established at the tier); keys count passed and established cells only | §1.7 |
| v11 §16a (licks) | unseen generated licks at sight feed the line-jazz area | §1.7, §1.10 |
| v11 §16a (ρ) | ρ_d = 0.15, ρ_c = 0.20 until fitted | §1.7, §9.1 |
| R10 (consolidation) | v11 §19 and §16a merged and removed; done-when moved to round 11 on v12 | this document, §18 |

### A.12 Rounds 11–16 (v12 §19–§24), owner decisions H9–H10 and the harness decisions

| Item | Content | v13 section |
|---|---|---|
| R11 §19 (authors) | tier by the latest death year of all credited authors, lyricists included; Honeysuckle Rose 1B; Scrapple PD side outside the US; guard test 1943 / 1973 | §8.1, §8.2, §8.4, §17.1, §18 step 5 |
| R11 §19 (syllables) | syllable rule covers pitch-training steps only; voice "sing with the lyric", memory step includes the text; scat exempt | §16, §8.4 |
| R11 §19 (soloist) | lick-bank soloist must fit the changes (functional match, transposed); else drums only or silence | §8.4, §8.7, §13.6 |
| R11 §19 (tunes you know) | graded by intervals, any key | struck (one rule per R13 §21) |
| R11 §19 (timing) | head melody loose timing at band 3+ | §8.4 |
| R11 §19 (King Porter) | trio strain for non-piano learn-a-tune; difficulty card places it | §8.2 |
| R11 §19 (brushes) | brief + self- or teacher-rated item | §13.6 |
| R11 §19 (swing) | native swing below ♩ 90 graded only with 8ths | §13.4 |
| R11 §19 (§14) | PD repertoire through `servable()` and term classes | §14 |
| R11 §19 (coverage) | non-transfer steps to coverage on a first-time head too | §1.10, §8.4 |
| R12 §20 (Groove Match) | a game: need and coverage only | §1.2, §1.10, §13.2 (also the first §24 merge edit) |
| R12 §20 (sight-singing) | head-based sight-singing → `repertoire-memory`; `familiar` tag | §13.5, §1.14, §18 step 5 |
| R12 §20 (step 6) | bass step 6 (bass line graded against the chart); guitar alternation at band 2, chord-melody at band 3 | §8.4 |
| R12 §20 (reading features) | syncopation index, mean interval and leap share, texture count; head cards use them | §1.2, §8.2, §18 step 1 |
| R12 §20 (minor) | "tunes you know" degree relative to the tonic (struck: one rule per R13 §21); "an unseen head" defined; transposing at sight before rubato; comp velocity MIDI only, `g-accomp-voice` on mic register and timing; lenient instrumentalist singing; voice tune of the week from voiceRange; guitar tone in rubrics; cents on steady-state mean pitch; Armstrong named on the Oliver sides | §1.6, §8.7, §8.4, §8.5, §12.1, §1.2, §8.1 (the Oliver note sits in the §8.1 recording test, where the example lives) |
| R13 §21 (mapping) | bass and drums transfer evidence → areas; guard test family × instrument | §1.10 |
| R13 §21 (accompanying) | levels by name: intro, register, fills at phrase ends, transposing at sight, following human rubato, fermata endings; fermata as release-on-cue on a notated hold | §8.7, §8.9 |
| R13 §21 (tunes you know) | tonic reference, starting degree plus intervals in that key, octave free, key not free | §13.5 |
| R13 §21 (minor) | contrafact card (only the Indiana side is 1A outside the US); voice sung guide tones gated on a 7th-chord item; step 1 embed a hands-free listening exception; SP §14 items 35 / 37 for guitar and bass; buzz rolls by quality; STANDARDS_LEGAL note | §8.4, §16, §13.1, §1.16, §1.2, §13.6, §8.2, §18 step 5 |
| R14 §22 (recording test) | one rule for every work on the recording; `pdFrom` by the latest death year; guard test 1924 / 1964 | §8.1, §8.10, §17.3, §18 step 5 (tests (b) and (c) of v12 struck) |
| R14 §22 (step 8) | chart and melody hidden, only the new tonic given | §8.4 |
| R14 §22 (Ain't Misbehavin') | Razaf (1973) governs; `pdFrom` from 1973 | §8.2, §17.1 |
| R14 §22 (traditional) | hymnal or jubilee print ≤ 1930, or a transcription from a recording passing the test; else not served | §8.2 |
| R15 §23 (recording test) | no authorized 1978–2002 publication; not a work made for hire; unknown → not servable; guard tests 1982 / 2046; Dapogny checklist | §8.1, §17.3, §18 step 5 |
| R15 §23 (step 8 name) | "a new key from memory", still key transfer | §1.10, §8.4 ("a new key at sight" struck) |
| R15 §23 (§8.2, §14) | Ain't Misbehavin' clean-up; Parisotti label and "Se tu m'ami" note | §8.2, §14 |
| R16 §24 (merge edits) | §8.1 (b)/(c), §8.10 phrase flags, §18 step 5 → the recording test; Ain't Misbehavin' → Razaf; Groove Match rows → game | §8.1, §8.10, §18, §8.2, §1.10, §13.2 |
| R16 §24 (minor) | "with a singer" goals only with a studio singer or bank take; memory step structural notes at band 3+, "as printed" at bands 1–2; voice sung roots octave displacement; syllable or degree pass before the lyric pass | §6.1, §8.4 |
| H9 | item pass = V1: warm half + the pair + clean share ≥ 2/3 over the last ≤ 6 counting cold checks | §0, §1.6, §1.16, §9.1, §17.4, §18 step 1, SP §22 (the pair alone, R10 19.1, struck) |
| H10 | challenge follows the working edge: the climb continues, readiness entry capped at + 2, the planner's challenge point, the required harness metric | §0, §1.7a, §1.3, §1.7, §1.9, §5, §9.1, §17.4, §18 step 1 |
| Harness (rank) | ≥ 2 distinct exercises; small tiers grouped up; a 1-exercise top tier grouped down; available keys = union; a tier above the ceiling uses tiers t … t | §0, §1.1, §1.7, §1.10, §18 step 1 (plain min(3, available), R8 19.1 / R9 19.2, struck) |
| Harness (snap) | `placedTier` on an empty tier, or after a drop onto one, snaps down to the nearest non-empty tier | §1.3 |
| Harness (N1) | non-tempo correction: ≥ 12 attempts on ≥ 4 offered days, clean share < 30 %, count resets at each drop | §1.3, §9.1, §18 step 1 (posterior P(p < 0.4) ≥ 0.9 and the 20-offered-day part, R10 19.3, struck) |
| Harness (new keys) | the planner re-offers a passed exercise in a new key while the passes above rank cover < 2 keys | §0, §1.7, §18 step 1 |
| Harness (clarifications) | ≥ 8 h measured from the first clean take at target; strict reset on any cold miss of the main item at the probe band; reading n_eff from raw counts applied to discounted counts; available keys = union; current-form breadth over tiers ≥ t; a rank-driven rise counts as a decision; no slump below T0; one decision per evaluation; tempo-area offered days cumulative since the last drop; ceiling = top non-empty tier when none is above | §1.6, §1.7, §1.3 |
| Harness (validation) | the harness is the reference implementation of §1; tests green; validated numbers; known soft spots; not-yet-modelled list | §9.1, §17.4, §18 |
| R16 (consolidation) | v12 §19–§24 merged and removed; done-when moved to a spec-only round on v13 | this document, §18 |

### A.13 Round 17 (measurement review of v13) and owner decisions H11–H13 (2026-11-28)

| Item | Content | v14 section |
|---|---|---|
| R17 #1 (stationary honesty) | the plateaued learner's inflated rank; the stationary-learner metric and target (≤ 10 % at p 0.5 and 0.75); H11 tier guard as rank step 6; the fresh-check re-offer and the guard reserve (the round 17 stall); item-gain and probe-band truths reported | §0, §1.1, §1.7, §9.1, §17.4, §18 step 1 (P1–P4 pass-evidence options: harness variants only) |
| R17 #2 (H10) | ready cell, content and tempo edges defined; readiness entry from the highest entered tier; the challenge point; no-easier on the new / strengthen quota only, re-entry / slump / drop exempt; the metric = flat-rank slope up to the + 2 cap | §1.7a, §1.3, §5, §9.1, §18 step 1 ("keeps rising with ability while rank is flat" without the cap, struck) |
| R17 #3 (supply) | the slot cap shared across the areas practised; FSRS review probes as looks; numbers re-measured at that supply (H13) | §1.7, §5, §9.1 (2 slots per session for one area, the v13 harness's assumption, struck) |
| R17 #4 (calibration) | estimand = tier p on fresh cells; ρ_c 0.20 kept as cautious (H12); "calibrated" struck, over-coverage stated | §0, §1.7, §9.1 |
| R17 minor | available keys = union in spec and harness; N1 over all cells at `placedTier`; skipped due checks logged; item-gain re-check | §1.7, §1.3, §9.1 |
| v14 (coordinator) | the harness scores bass with the §1.10 3 laddered areas (no longer the piano's 5); the catalogue rule: ≥ 3 exercises per tier (floor 2), no lone 1-exercise tiers at the bottom of an area | §1.2, §1.10, §9.1 |

### A.14 Round 18 (measurement review of v14), v15 (2026-11-28)

| Item | Content | v15 section |
|---|---|---|
| R18 #1 (blocker: guard deadlock without fresh cells) | at a tier with no fresh cell left the guard record also holds the passed cells' probe-band looks; the guard probe in the reserve; cells unique per exercise × key (the harness's duplicate-cell key reuse removed); keyless and 1-key climb tests | §1.7 step 6, reserve, cells and shelving; §9.1 |
| R18 #2 (day picker) | "skipped due check" defined (due, sounded); a warm-first skip is a miss in the V1 share and the guard record; unplayed due checks are misses above a 20 % skip share; the skip log is read; day-picker and honest-deviator learners in the harness | §1.6, §1.7, §9.1, §17.4 |
| R18 #3 (H10 ratchet) | evidence readiness that decays; content edge capped at the entered top; readiness entry re-evaluated; the struggle step-down; fixed-tempo slope target; plateaued-learner appropriateness target | §1.7a, §1.3, §9.1 |
| R18 #4 (honesty per learner) | per-learner target and results; the guard described as a repeated check; the repeated-test table; why the item-gain figures are high; owner question on the guard setting | §1.1, §1.7, §9.1, §17.4 |
| R18 #5 (estimand) | rank certifies p ≥ about 0.5 at the probe band; honesty scored there | §1.1, §9.1 |
| R18 #6 (underspecified) | shelving and resuming; inputs not split, not-comparable takes never count; the catalogue target's probe band under teacher targets; voice checks at a looser band out of the record; reading / transfer: the pass test replaces the guard; merge downgrades leave the record, 24 h re-derivation (owner question) | §1.4, §1.6, §1.7, §1.12, §17.4 |
| R18 minors | reserve trigger and lo aligned (lowest tier holding a pass whose guard fails, on lo … t); readiness wording; review allowance per area; re-entry window per item in the harness; `offerNewKeys` respected with the guard; walking's paceTier from the scales benchmark; bar-to-next reasons; 60-day pending-pair expiry | §1.3, §1.6, §1.7, §1.7a |

### A.15 Owner decisions on the v15 questions, v16 (2026-11-28)

| Item | Content | v16 section |
|---|---|---|
| H14 (§17.4 v15 q1) | the rank tier guard at P ≥ 0.9 (option B); P ≥ 0.8 selectable as `RANK_GUARDED_P80`; "90 %" is a repeated check, not a confidence level | §0, §1.1, §1.7 step 6, §9.1 |
| H15 (§17.4 v15 q2) | a warm-first skip is always a miss in the guard record and the clean share; the he / en warning before such a take; the 20 % skip share only for unplayed due checks | §0, §1.6, §1.7 step 6, the skip log, §9.1 |
| H16 (§17.4 v15 q3) | a merge downgrade within 24 h re-derives `rankHW` from the pre-rise rank; older rises stand; `rankAfterMergeDowngrade` | §0, §1.4 |
| H17 (§17.4 v15 q4) | the H10 targets per kind of area accepted | §0, §1.7a, §9.1 |
| v16 harness | docs/MEASURE-V16-REPORT.txt (`npm run measure-v16`): all report sections re-run on the v16 defaults with the v15 default beside them; three targets missed under P ≥ 0.9 (keyless / few-cell stalls, guitar/arpeggios stall, piano/harmony lag) and the proposed fix (weighted design effect) measured (section W), with a P grid for it (section G) | §9.1, §17.4 |

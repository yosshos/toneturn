# Holistic round 2: one level, honest rewards, real music (v10, 2026-11-27)

This spec implements the two whole-app audits of 2026-11-27:
- docs/AUDIT-HOLISTIC-MEASUREMENT.md (AM);
- docs/AUDIT-HOLISTIC-PEDAGOGY.md (AP);

and the review rounds that followed (round 1: RP / RM; round 2: RP2 / RM2; round 3; round 4; round 5: RM5 / RP5; round 6: RM6 / RP6; round 7; round 8: RM8 / RP8).

It sits beside docs/SPEC-SPIRAL-PRACTICE.md (SP, v6). Where they overlap, this spec says which one governs. It governs SP §4 and SP §17 where they touch level, and the SP sections listed in §1.16. SP §22 points here.

v10 consolidates the round-8 binding changes (v9 §19) into the v9 body, keeping v9's section numbers. It makes the rank rule exact (passes at tiers ≥ t count, empty tiers are skipped, a stored `rankHW` and stored pass records, exercise identity, teacher targets) (§1.7); gives transfer forms and reading a rate-based pass in `cellPass` (§1.6); fixes current form (it follows rank up, counts only passed and established cells, uses n_eff, and re-promotes on its own rule) and separates entry from current form (§1.3, §1.7); restarts the over-placement count at each drop (§1.3); makes modal and Coltrane forms by-ear everywhere (§8.4); makes the curriculum-flow audit a gate (§13.1); and enters the round-8 minor items and the slot and look rules (§1.7). Superseded text is removed; no other rule is changed. v9 had consolidated round 7 (owner decision H8: **rank is built from passed exercises**; the Bayesian posterior drives only current form and adaptivity), and v8 had merged rounds 4–6 and owner decisions H5–H7. Appendix A maps every amendment item to its place here.

---

## 0. Owner decisions (2026-11-27)

| # | Decision |
|---|---|
| H1 | **The order of work:** (1) one level semantics on cold evidence, built with SP step 1; (2) quick fixes (Ear level, rewards); (3) the SP rotation; (4) real heads, learn-a-tune, unit capstones, accompanying a singer; (5) listening lab, pop chord library, voice registration and text, how to practise, composition. The full merged steps are §18. |
| H2 | **Music rights follow US law** (memory: us-copyright-law). Compositions published in 1930 or earlier are public domain in the US as of 2026-01-01. Sound recordings published in 1925 or earlier are PD in the US. `heads.ts`'s "PD worldwide" rule is replaced by US PD, with per-head region tiers and term classes (§8.1). Every melody is verified note by note against period sheet music (LoC, IMSLP), never a modern fake book (owner rule 2026-11-15). |
| H3 | **Listening assignments may embed YouTube recordings** (embed only; no download, no extraction). Transcription is done from the student's own copy or from US-PD recordings. |
| H4 | **Answered (owner 2026-11-27):** (a) **Songbook:** the existing traditional or classical songs are public domain (checked: the Happy Birthday ruling was in 2015, settled in 2016; the rest are traditional or pre-1900). The 7 originals are OK. (b) **Voice-course songs:** app-written diatonic, tonal practice melodies built to train one vocal element are OK, and new ones may be written for that purpose. (c) **Rule-generated licks:** OK, because the owner gave the rules; any lick whose rule origin is unclear is flagged for the owner. (d) **Still not allowed:** Claude-composed music as demos, backing tracks or an "AI band" (no-claude-composed-music). These items serve every region as the region-safe pool, alongside the 1A heads. Each lick and original head records where it came from. |
| H5 | **The 5 app-written jazz heads** (Corner Bench, Long Way Round, Back Porch Blues, Night Ferry, Quiet Hours) **are approved as clearly labelled practice tunes** (owner 2026-11-27). They are never presented as real repertoire. They join the region-safe pool as practice material (§8.1, §8.2). This closes the H4 question about them. |
| H6 | **Standards by title, with our own charts** (owner 2026-11-27, chosen because it gives the most freedom): any standard may be used by title, with the app's own chord charts, built from analysis and never copied from fake books or chord sites, each with its provenance and a human verifier. Official-recording embeds and the by-ear learn-a-tune variant go with them. The charted-standards library grows broadly, beyond about 120, under this policy (§8.3, §8.4). |
| H7 | **Chord charts are not blocked by collecting societies; the question is closed** (owner 2026-11-27, checked): chord progressions are not copyrightable, and the app gives many variations per standard, never one fixed reharm or voicing. **All the major standards in every genre, Latin included, may be in the app** as the app's own chord charts with many variations, plus official-recording embeds and the by-ear variant (§8.3, §8.4). **The melodies of protected tunes are never served.** The "harmony is the work" care (few songs, chords only) stays only as a note on very idiosyncratic modern writers (§8.3, §11.1). |
| H8 | **Rank by passed exercises** (owner 2026-11-27; replaces the earlier "rank speed" row): rank = the highest tier with ≥ 3 distinct passed exercises in ≥ 2 keys (cold-guarded passes). It never falls, and takes about 1–3 weeks per tier. The statistical posterior drives only current form and adaptivity (§1.7, §1.10). The exact rule (passes at higher tiers count, empty tiers are skipped) is in §1.7. |
| Breaks | **A level never drops from a break, only from measurement** (owner 2026-11-27). Inactivity shows "refresh" and a wider range (§1.7, §1.11). |
| Pop | **The pop chord library is global and jazz-adjacent, not Israeli-focused** (owner 2026-11-27; §11.1). |

---

## 1. One level semantics (AM #1, #2, #3, #10)

### 1.1 Definition and separate axes
- **Rank in an area** (owner decision H8) = the highest **content tier** t such that ≥ min(3, available exercises at tiers ≥ t) distinct exercises are passed at tiers ≥ t, in ≥ min(2, available keys) keys where keys apply, with ≥ 1 pass at tier t itself (§1.7). It never falls.
- **Current form in an area** = the hardest content tier at which the learner's **cold** success probability is ≥ p* = 0.7. It is shown with a range until the uncertainty is small. It is estimated by the Phase A posterior (§1.7) until Phase B (§1.8) is validated. It drives adaptivity and reporting, never rank or entry (§1.7).
- **Not measured:** tone, posture and tension are not measured by the level. They come only from teacher rubrics (§12.1).
- **Separate axes, never mixed into level:**
  - **Coverage:** stars, 12 keys, forms played, and the "coverage only" families (§1.10).
  - **Maintenance:** fresh / refresh.
  - **Effort:** XP, streak, minutes.

### 1.2 Content tier
- **`contentTier`** (0–8, the app's T scale) is a field on the **spec / option** (`SpecTemplate`), not on `LevelDef`, because `LadderRung.min` varies per option (e.g. `b-scale-6` 1 or 3).
  - Seeded from `LadderRung.min` (keyIndex.ts) and the SP §14 entry bands. **Seeding from an SP band uses the band's lower T** (band 2 → T2).
  - Hand-set for families neither covers. **A guard test fails on any spec / option without one.**
- **"Band" keeps SP §14's meaning** (a group of tiers: band 1 = T0–1 …). The tempo axis is **`paceTier`** (§1.3). **`tierBounds` (tempo) is the pace, never the content tier.**
- **Ordering is lexicographic: content first, then the pace or sub-band.**

| Area | Content tier | Ordering |
|---|---|---|
| Technique (piano, guitar, bass, drums) | `contentTier` of the spec / option. **Scales and arpeggios:** content = their nps tier (their content is the tempo, consistent with SP A8). **Drum rudiments:** content = their nps tier, like scales. | content tier → tempo. A T4 item at a slow tempo ranks above a T2 item at a fast tempo. |
| Ear | the feature-based difficulty (SPEC-EAR-INTELLIGENCE §4), with a guess floor per answer count. SPEC-EAR-INTELLIGENCE governs the Ear level itself (§1.14). | — |
| Reading | **reading complexity** = a weighted sum of subdivision level, accidentals, ledger lines, density and key distance. Each feature is normalised to 0–1 over the catalogue range before the sum. Equal weights to start; the weights are fitted later. **The score is mapped to T by catalogue quantiles:** the reading items of each existing reading level set the cut points. **Reading items are rule-generated per tier** (random stimulus), so the supply of first-sight items never runs out. | complexity tier → tempo |
| Voice | the **item level** is the content tier. The cents band (60/45/30 ¢) is a **sub-band shown within it** ("T3, ±30 ¢"). It is never added to T. | item level → cents band → timing band |
| Rhythm / time | subdivision level → T, with the timing SD band | subdivision → SD band |
| Games | excluded from Phase A level evidence. Games are practice only (they may feed need, §5) and never set a level. | — |

### 1.3 `areaTier` = {content, pace}; placement and entry
- **`areaTier(area)`** replaces `playerTier`, SP A8 and any separate level function. It returns `{content, pace}`, plus `placedTier` while placed.
- **`content`** is the §1 content-tier level. **Rank, course DYN and friend level read rank** (§1.7, §1.10); current form is shown separately.
- **`paceTier`** = the tempo tier of the area's confirmed scale benchmark (from placement until confirmed). A take's tolerance uses the take's own nps tier, capped by `paceTier`.
  - It is used **only** for timing tolerances (`tierTiming`, analyze.ts:838) and stretch `tierUp` / `tierDown`.
  - **The beginner definition stays SP A3:** band 1 by the placement content tier (`placedTier`). `paceTier` never decides who is a beginner. Beginner status in an area ends when rank in that area reaches T2, or placedTier is band 2 or above.
  - Harmony and other fixed-tempo areas are never gated by tempo.
- The units never mix, so promotion and tolerance can't oscillate.
- **`placedTier`** is a separate field per area, set by the level test or self-report. **It sets entry only, never rank.**
  - The UI shows "placed: T5" until rank reaches it.
  - **Over-placement correction:** after 20 practice days in an area without a pass at `placedTier`, or on the posterior slump rule (§1.7) at `placedTier`, `placedTier` drops one tier. Rank is never touched.
    - **The count restarts at each drop.** It counts only days on which items at `placedTier` were offered.
    - **A drop below band 2 restores beginner status,** with D1 floor 3. This is intended.
  - **Initial state:** rank = none until the first tier is reached; a non-placed beginner starts with `placedTier` = T0.
  - SP A8's "≥ 3 cold takes" switch is deleted.
- **One entry rule (content-based):** entry = max(`placedTier`, rank) + 1: an item may enter when its entry content tier ≤ that value. Entry falls only through the placedTier over-placement correction (§1.3); items already in the rotation stay, and manual choice is never limited (no locks). Current form never sets entry (§1.7).
  - The rate's ±1 band step (SP §17.3) and this +1 never stack beyond one tier above that base.
  - **Prerequisites:** cross-session they read `established` (§1.6); inside an assignment or session they follow §1.6 (D2 / SP A10, `acquired`).
  - **Teacher-assigned forms are exempt** from the entry rule; SP §2.6's "at most 2 tiers up" governs them.
  - **No locks:** the entry rule limits only the rotation and the planner, never manual choice.
  - This is how SP §14 / §15.5 entry reads the tier.
  - **Harness test:** a steadily improving simulated learner climbs from T0 to T5 on rotation alone (§9).

### 1.4 Cold evidence and cells
- **The cold flag** (`ev.cold: boolean`) is written on every rating event in every area, at creation; refolds keep it.
- **The cell key** = family + level id + key (+ hand group), derivable from any take: list runs, licks and key-session stages included. If none is derivable, the item id is used.
- **Technique cold take:** SP §4.1 as amended here:
  - the item's take is cold when **≥ 1 h has passed since any sounding take of the item or of any item in its cell**: RH, LH, slower, burst, challenge and coordination takes included. This closes warm-up laundering.
  - The gap is timed by a per-cell **`lastSound`** (any sounding take). SP §4.1 and SP §3 are amended to read `lastSound`. `lastQual` remains only for the ≥ 1 h re-measure rule.
  - The take must still qualify per SP §4.1: full click, straight, not a challenge, burst or probe.
  - `sessionMs` (minutes since the session start) is logged on every cold entry. It is a Phase B covariate.
- **Native feel:** each item has a native feel. Swing applies for `spec.swing` and jazz-native items such as guide tones, shells and lines. **A take in the native feel counts as "straight"** for coldness, passes and confirmations. Feel-layer modifiers stay non-qualifying. SP §16.5 is amended to point here (§1.16).
- **What counts where:**
  - **For confirmations (looks for the current-form posterior):** the first cold take **per cell per day**, in passed and established cells only (§1.6, §1.7).
  - **For the item pass, FSRS and the staircase:** every cold take counts (SP §4.2 unchanged; the SP §9 3-day test stands).
  - **General hand warm-up is not penalised.** Coldness is per item and cell (`lastSound`).
- **The key session** plays a cell's cold check **before** any coordination stage of that cell in a session, so coordination work never steals the cold take.
- **Per modality:**
  - **Ear:** the first 5 trials of a skill/contrast after ≥ 8 h. Where SPEC-EAR-INTELLIGENCE's own cold definition differs, it governs.
  - **Voice:** per item, after ≥ 1 h, kept in the `cellPass` store (§1.6). `sessionMs` is its warm-up covariate (vocal warm-up is physiological; AM §3.6).
  - **Rhythm:** per subdivision cell, after ≥ 1 h, kept in the `cellPass` store. First cold take per cell per day for confirmations; all cold takes for passes.
  - **Reading:** sight takes are cold by design, kept in the `cellPass` store (§1.6).
  - **Games:** the first run of a game after ≥ 8 h (used for game refresh, §4.3; games are not level evidence).
- **Cross-device:** `lastQual`, `lastSound` and the cold entries sync with timestamps. On merge, a second "cold" within 1 h of another device's qualifying take is downgraded to warm.

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
- **Breadth is counted in exercises,** not item ids. An exercise (`exerciseId`) = spec template + level/option, with key and hand removed (exercise identity in full: §1.7). Rank's breadth rule and the posterior window's breadth are in §1.7.
- **Not enough:** a clean take at an item's start tempo never counts toward level.
- **Exclusions:** `~feel`, burst, link and challenge takes never count. (A take in the item's native feel counts as straight, §1.4.)
- **The level test** sets `placedTier`, shown "placed: T5" until rank reaches it. It sets entry only, never rank (§1.3).
- **The pass** = `passedAt`, per SP §4.2 as amended: 3 counted clean takes at ≥ 95 % of target on ≥ 2 days, including a clean cold take on a later day (≥ 8 h after, and on a different local day from, the day the target was first reached).
- **"Later day" rules** (`established`, the SP §4.2 later-day cold take, `firstTargetDay`) need **≥ 8 h and a different local day.** That closes the midnight hole.
- **Items stay passed** (SP §4.2, `passedAt`). Passed items show as passed on the path and the matrix at once, and passes raise rank directly (§1.7). Current form can fall to "refresh", but a closed item never reopens on its own.
- **Areas without `passedAt`:**
  - **Reading:** cold sight takes per complexity tier. A tier passes by a rate rule, so a lucky streak can't pass it: **≥ 3 clean in the last 5 cold first-sight takes at the tier, on ≥ 2 days.** A reading exercise = reading generator × tier. The §1.7 posterior runs on sight takes.
  - **Transfer forms** (learn-a-tune transfer steps, chart at sight, k-accomp-voice and k-pop at sight): a tier passes when **≥ 3 clean out of the last 5 distinct unseen items** (charts, keys or heads at that tier's difficulty card) land on **≥ 2 days**. Each such tier pass counts as one exercise toward rank (§1.7).
  - **Voice and rhythm:** each cell has a sticky pass.
  - **Storage:** a new synced store **`cellPass`** (under the fresh-start epoch) holds `{passedAt, cold[]}` for voice, rhythm, reading and transfer. It is the per-item cold store for voice and rhythm.
  - **Games:** excluded from Phase A. Practice only (they may feed need).
- **`acquired` vs `established`:**
  - `acquired` (warm, D1) moves an item from blocked to the rotation. **Inside an assignment or a session,** forms and same-session entry follow owner decision D2 and SP A10: the anchor `acquired` opens its forms.
  - **`established`** = a clean cold take on a later day than acquisition (≥ 8 h and a different local day). It gates **only** cross-session pool entry and prerequisites, need readiness (§5) and the strengthen pool.
  - SP §14 / §15.5 cross-session prerequisites read `established`. Both specs say this (SP §22).

### 1.7 Phase A: rank by passed exercises, and the current-form posterior (ships first)
- **Why (round 7):** the round-7 simulations found that v8's statistical rank (a posterior promotion test, 2 looks a day, with day and cell dependence) needs 2–4 months per tier to keep false promotion under 5 %, and that 5–16 % of p = 0.75 learners never promote. The owner chose a rank built from passed exercises (H8).

**Rank (owner decision H8)**
- **Rank in an area** = the highest tier t such that **≥ min(3, available exercises at tiers ≥ t) distinct exercises are passed at tiers ≥ t**, in **≥ min(2, available keys)** keys where keys apply, with **≥ 1 pass at tier t itself**. Breadth is the union over those exercises. A pass = `passedAt`, per SP §4.2 as amended (§1.6).
  - **Passes above a tier count toward it,** so scattered passes at T4, T5 and T6 give at least T4.
  - **Tiers with no available exercise** are skipped, never passed by default.
  - **Keyed and keyless areas** use the same min(3, available) rule. Exercises that are unavailable are excluded from "available": "needs MIDI", "teacher or recording needed", region-denied, and small-hands-replaced.
  - **Fixed-tempo areas** count rung passes.
  - **Voice, rhythm, reading and transfer forms** count `cellPass` passes, using §1.6's per-area pass definitions.
  - **Voice sub-bands:** passes are recorded per cell (item level × cents band). Rank uses the item level. A 60 ¢ pass counts as that item's pass at the 60 ¢ sub-band only, and the display shows the sub-band.
- **What counts as a distinct exercise:**
  - **`exerciseId`** = spec template + level/option, without key or hand. Its derivation from `itemId` is specified in code (`exerciseIdOf`) and covered by a test.
  - **An exercise's pass is its cell's main item:** the hands-together item where one exists. Hand-separate passes never count alone.
  - **Fixed-tempo rungs** pass only under the §1.6 rule (2 days, including a later-day cold take). Variants (voicing, inversion, seed, start degree) are **not** distinct exercises, and an in-session "rung passed today" moves the rotation but is not a `passedAt`.
  - **The voice cents band is not part of exercise identity.**
- **Teacher targets:** a pass counts for rank only at ≥ the option's catalogue target. A pass at a teacher's lower target counts as coverage only (and toward that assignment).
- **Stored state:** each `passedAt` record stores `{contentTier, target, exerciseId, src, at}` at pass time. A synced `rankHW` per area stores the high-water (§1.15).
- **Rank = max(`rankHW`, derived).** Rank never falls; a pass stays a pass. Re-tiering, re-targeting or catalogue edits can never lower rank.
- **Rank can jump:** passes at a higher tier raise rank directly (high-water).
- **Promotion XP** pays once per tier gained, under the Q6 caps (§3).
- **Inputs:** passes from any input count toward rank; changing input never lowers rank. The harness checks that per-input jitter only widens thresholds by the measured noise, so a lenient input can't inflate rank (§9.1).
- **Memorised material never feeds rank or area level** (§1.10, §8.4).
- **The bar to next** = the passed exercises toward the next tier ("2 of 3", plus the keys). It never moves backward, and it is never full below Master.
- **Calendar time** is about 1–3 weeks per tier, depending on practice. The §9.1 harness reports it per area from the real catalogue.
- **Guard tests:**
  - one exercise in many keys and hands never raises rank;
  - three passes all in one key don't raise it either, where keys apply;
  - scattered passes;
  - an empty tier;
  - a mic learner whose tier is all "needs MIDI";
  - three RH-only passes;
  - three variants of one rung;
  - one voice item in three cents bands;
  - a lowered teacher target;
  - re-tiering never lowers rank.

**Current form: the posterior**
- **The Bayesian posterior** (window 30, Beta(1, 1), day-dependence aware) drives only these:
  - **current form**, shown beside rank;
  - **adaptivity:** §5's distance ("at the cold level" = current form), need weights, spacing, tempo choice and the refresh probe;
  - **reporting** (the teacher's view).

  None of these is permanent, so no false-promotion horizon target applies. The §9.1 harness reports the posterior's calibration under day and cell dependence (a beta-binomial with a day effect).
- **Who drives what:**
  - **entry** = max(`placedTier`, rank) + 1, falling only through the placedTier correction; no locks (§1.3);
  - **current form** sets §5's distance, need weights, spacing and tempo choice. It does not set entry.
- **The posterior counts only passed and established cells.** Probes of unpassed items feed the staircase and threshold only (§1.9). A learner working on new exercises is never marked as slumping.
- **A look** is one confirmation (§1.6), counted only as the **first eligible confirmation of the day per cell**, in time order (never the best).
  - **FSRS review probes and pass probes outside the slots also count as looks,** within the passed-and-established rule above. The slots guarantee a minimum supply.
  - **The day is the unit:** at most **2 looks per area per day** count. **A second look must come from a different exercise.**
- **"Day-dependence aware"** = an effective-n design effect, n_eff = n / (1 + (m − 1)ρ), where m is looks per day and ρ is the intra-day correlation estimated from the traces. The posterior uses n_eff.
- **The window** is the last **30** looks at the tier. It must contain:
  - ≥ 3 distinct exercises at the tier, or all of them if the tier has fewer than 3;
  - ≥ 2 keys, where keys apply.
  - **Areas without keys** (rhythm, voice, drum rudiments, small fixed-tempo tiers) widen breadth by using all of their exercises.
  - **If the window fails breadth,** no decision is made, and the slot injector picks the missing exercise or key.
- **The posterior:** beta-binomial, prior Beta(1, 1), over the window, using n_eff.
- **Slump (current form drops):** when P(p < 0.5 | data) ≥ 0.95 over ≥ 8 looks on ≥ 2 days. **Never inside a re-entry window.** The same rule at `placedTier` drops `placedTier` one tier (§1.3). Rank is never touched.
- **Current form follows rank up:** current form is initialised as rank, or as `placedTier` while placed. On a rank rise, current form = the new rank.
- **Re-promotion after a slump:** current form rises to current form + 1, capped at rank, when P(p ≥ 0.6 | data) ≥ 0.9 at current form + 1 (the harness may tune this). There is no 30-look cap for re-promotion; all looks since the slump count. Current form is not permanent, so no horizon target applies. It pays no XP.
- **Inputs:** current form and display read the current input's series (§1.12).
- **Wrong demotion** (current form dropped at true p ≥ 0.75): target < 5 % (§9.1).
- **Range:** the top of the range needs ≥ 2 clean cold takes on ≥ 2 days at that tier, and is capped at rank + 1. The width also follows §1.11.
- **Staleness:** a tier without cold evidence for 60 days shows "refresh" only. It never lowers rank.
- **Refresh, not demotion:** a failed cold check, and inactivity, only mark "refresh". Only the slump rule above lowers current form.
- **Re-entry window:** it opens with the first practice day after a break of ≥ 7 days. It ends **per item** at that item's first FSRS-good review, or after 3 practice days for the area, whichever comes first per item. Cold takes in the window never count toward a slump, though they still mark refresh. **A break never causes a drop** (owner).

**Supply and slots**
- **A cap on confirmation slots across all areas:** 2–4 **per session**, scaled by session length. The slots rotate across areas by need and goal, and go only to areas practised that day.
- **The slots guarantee a minimum supply of looks;** FSRS review probes and pass probes outside the slots also count as looks (above).
- **A minimal slot injector ships in step 1,** in workout2 / todayPlan. It is folded into need() (§5) in step 6.
- **The probe band** is the only confirmation tempo: 0.95–1.0 × target.
- **Probe takes on non-due days** are not graded into FSRS (§1.9, §4.1).

- **§9.2's reliability gate exempts Phase A**, which is a transparent rule shown as such.

### 1.8 Phase B (later, shadow first): a psychometric model per learner × family
- P(clean | log nps, cold, input, minutes-in-session (`sessionMs`), time of day), with a hierarchical prior from the catalogue tier (AM #10).
- **Outputs:** the cold level with a confidence interval, the warm-up decrement, the fatigue slope, retention, and the SP §17 G rate.
- It is promoted to the source of truth only after the §9 validation shows split-half reliability ≥ 0.7. Until then Phase A is shown. Like the Phase A posterior, it drives only current form and adaptivity; rank stays H8 (§1.7).

### 1.9 The cold staircase and the threshold estimate
- **The staircase only chooses the non-confirmation cold tempo.** It replaces SP §2.5's cold-check tempo for every item that has a previous cold result, and the key-session cold check (SP §3's `max(0.9 × best, 0.95 × target)` is superseded). **The first cold check of an item uses SP §2.5.**
  - SP §17.3's "cold-check tempo, 0.9 × best" row is deleted; R drives the staircase step.
- **It moves from the previous cold results, never from the warm best.** The rule is **2-up-1-down** (Levitt), which tracks ≈ 70.7 % ≈ p*:
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
- **What reads the estimate:** Momentum "cold rise" (the all-time high-water of the non-provisional estimate, paid only on a rise of more than 1 posterior SD above its previous high, §3), the cold "record", SP G and R, and Phase B. SP A12 is amended: G reads the threshold estimate. **The plateau test reads the raw cold points, not the estimate** (§6.2).
- **Fixed-tempo items have no staircase.** Their cold measure is accuracy (SP §15.2).

### 1.10 Rank, current form and display
- **The areas per instrument:**

| Instrument | Areas |
|---|---|
| Piano | scales, arpeggios, independence/finger, harmony/voicing, line-jazz, reading, rhythm/time |
| Guitar | the same as piano |
| Bass | scales, arpeggios/chord tones, walking/groove, reading, rhythm/time |
| Drums | rudiments, coordination, grooves/styles (timing SD is folded into grooves: time is part of the groove level), reading |
| Voice | pitch, time, range/agility (tied to comfortable tessitura and agility, never extremes: vocal health), harmony |

- **New families map to an area, or are "coverage only"** (coverage never enters level):

| Family | Area |
|---|---|
| Learn-a-tune steps | the instrument's line or harmony area, by step (transfer forms only; see below) |
| Accompanying a singer | harmony / voicing (transfer forms only; see below) |
| Pop levels | harmony / voicing (transfer forms only; see below) |
| Drum balance and soloist work | drums grooves/styles |
| Groove Match | drums grooves |
| Jazz reading ladder | reading |
| Capstones, composition | coverage only |
| Voice registration, text and diction | coverage only (hint-only) |
| Improvisation story ladder | coverage only (descriptive) |
| Free improvisation | coverage only |
| Listening lab and Ear capstones | `repertoire-memory` and coverage, never the Ear course skills |
| §14 PD repertoire and piece-coach pieces | coverage only |

- **Memorised material never feeds level:** on a head the learner has already played, learn-a-tune steps, k-pop and k-accomp-voice go to coverage and `repertoire-memory`. They never feed area level or rank. **Only transfer forms feed level:** a new key at sight (learn-a-tune step 8), a chart at sight, an unseen head. They pass by the transfer rate rule (§1.6), and each tier pass counts as one exercise toward rank. **A guard test** checks this.
- **Rank** = the highest tier t with ≥ min(3, available) distinct exercises passed at tiers ≥ t, in ≥ min(2, available keys) keys, with ≥ 1 pass at t (owner decision H8; the exact rule is in §1.7). Rank, course DYN and friend level read rank, which never falls. So rank = hardest items beaten holds (promotion-not-full-bars).
  - Passes (`passedAt`) show at once on the path and the matrix, and raise rank directly. Rank takes about 1–3 weeks per tier, depending on practice (the harness reports it per area, §9.1). Nothing ever looks lost.
- **Rank over inputs:** changing input never lowers rank; a lenient input can't inflate it (§1.7, §9.1).
- **Current form:** the current cold level, per input, shows separately beside rank as "current form" (the posterior, §1.7). It can show refresh, or a lower tier after a confirmed slump.
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
- **A cold series never mixes inputs.** A change of input starts a new series, and the old one is kept. Current form and display read the current input's series; another input's higher level is shown as a note, e.g. "ff on MIDI".
- **Rank is not split by input:** changing input never lowers it (§1.7, §1.10).
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
- **Head-slice dictation, "tunes you know", the listening lab and Ear capstones** write to a `repertoire-memory` skill (and coverage), never the Ear course skills (§13.5, §1.10).
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
This spec amends these SP sections. SP is edited to point here at each of them (SP §22, updated to the v9 section numbers, which v10 keeps); **the pointer edits are done before step 1 starts, as a doc commit**:
- §2.5 (cold check: the staircase, §1.9);
- §3 (`lastSound`; the cold check order, cold before coordination; `max(0.9 × best, 0.95 × target)` superseded);
- §4.1 (`lastSound`, per cell; the `lastQual` gap superseded, `lastQual` kept only for the ≥ 1 h re-measure rule);
- §4.2 (passes kept, `passedAt` sticky; passes set rank, §1.7 (H8); the later-day cold take needs ≥ 8 h and a different local day, §1.6);
- §9 ("promotion by day 2–3" means the **item pass**, not a tier promotion);
- §14 (the area-tier definition is superseded by §1.3 `areaTier` and §1.7 rank);
- §14 / §15.5 (the entry rule and `placedTier`, §1.3; cross-session prerequisites read `established`, in-session forms follow D2 / A10 `acquired`; "acquired" as the cross-session gate superseded);
- §15.4 (burst trigger: no new clean session peak in 3 sessions on ≥ 2 days);
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
| Distance | 0.45 | the gap to the next tier at the cold level ("the cold level" = current form, §1.7) |
| Forgetting | 0.35 | from FSRS or the §1.11 deviation. **Unpassed items:** time since the last qualifying take ÷ the R-by-gap curve (this carries `back2`). |
| Goal | 0.2 | the learner's goal (§6.1) and the style focus. A recurring weekly-profile pattern adds to the goal weight of matching items; a low teacher rubric score (§12.1) adds to it too. |

- **New items** are ranked by goal, behind the readiness gate, so a new item can always be chosen.
- **It absorbs** SP `back2` and the refresh probe (§1.11).
- **Confirmation slots:** a cap across all areas of 2–4 per session, scaled by session length, rotating across areas by need and goal, only to areas practised that day; confirmation takes play only in the probe band (0.95–1.0 × target) (§1.7). The minimal step-1 slot injector (workout2 / todayPlan) is folded into need() here, in step 6.
- **The rotation set** fills in need order. The entry rule (§1.3) limits only the rotation and the planner, never manual choice.
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
- **A goal tune is complete** when the memory step of the learner's band variant of learn-a-tune (§8.4) passes cold. **In the by-ear variant** (any charted standard, §8.3), completion = chords from memory (cold), graded against the learner's "my chart" with functional equivalents accepted (§8.4), + a self or teacher melody check.
- **A goal "with a singer"** completes only with a human singer's take (§12.3).
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
  - **Input:** a MIDI key (low = no, high = yes) or a voice "yes/no" works as well as the tap, to stay hands-free.
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
- **`servable(content, region)` is the only path to playback or display.**
  - **The region signal** = the stricter of the account country and the store/IP country.
  - **Unknown region →** only items PD under the longest term class (life+100), plus the H4/H5 region-safe pool.
  - 1A content serves everywhere except where a long term still runs; 1B serves only in the US allow-list (STANDARDS_LEGAL).
  - **Long-term countries:** `servable()` denies 1A heads in long-term countries (Mexico, Colombia, Côte d'Ivoire, Spain for authors who died before 1987, the life+75 countries, and others on the list) when the author died within that term, until the lawyer clears the rule of the shorter term (§17.1).
  - **A rule with a guard test:** every real-music feature draws from the learner's region pool: learn-a-tune, capstones, tune of the week, head dictation, the level-test tune section, contrafact pairs, goals. The guard test walks every content consumer, including lyrics (§11.2), First-phrase recall, "tunes you know", EAR v2 songs-by-ear and sight-singing, recordings of 1B compositions, and the per-language folk songs.
  - **A verify / preview mode** lets the owner see 1B heads from Israel while checking them.
- **Recordings and §303(b).** `servable(recording)` requires all of:
  - (a) release ≤ 1925, by **release date**;
  - (b) every composition on it published or registered ≤ 1930, with its tier;
  - (c) **every improvising ensemble member** died ≤ 1955 (the term for unpublished works), not only featured soloists (e.g. Baby Dodds, died 1959, on the Oliver sides). In long-term countries, `pdFrom` uses the improviser's death year.
  - 78-rpm transfers must come from a PD-clean source.
  - Phrase source flags follow the same test (§8.10).
- **Denied regions keep "learn it by ear":** an embed, a chords-only chart, and a self or teacher check, with no melody served. (The by-ear mode is also offered everywhere, §8.4.)
- **Content served is the ≤ 1930 print's only,** with its print year and publisher recorded. Later verses and later lyrics are left out.
- **"Folk/trad" entries** get the same print-year and author check as heads (e.g. the Hava Nagila lyric credit).
- **A lyric curation pass** removes period lyrics that are offensive today. It applies to 1A songs too.
- **Lyrics:** only for songs published ≤ 1930, verified against the period sheet, used in voice items (§11.2).
- **The region-safe pool** (every region): the 1A heads (where no long term runs) plus the H4 items (songbook incl. its 7 originals, voice-course songs, rule-generated licks) and the 5 app-written practice tunes (H5).
- **Chord-only charts of standards** (H6, H7) serve everywhere; protected melodies are never served.

### 8.2 Real heads (AP #1)
- **About 20 heads, each transcribed and verified against a period sheet. 1A first.** The core and beginner heads come from STANDARDS_LEGAL §2.1, public domain worldwide. Each must be confirmed 1A and verified:
  - **beginner:** Bill Bailey, Ain't We Got Fun, Yes Sir That's My Baby, Somebody Stole My Gal, Nobody Knows You When You're Down and Out, spirituals, When the Saints;
  - **core:** Rose Room, Avalon, Japanese Sandman, Love Me or Leave Me, Mean to Me, My Blue Heaven, If I Could Be with You, King Porter Stomp, Charleston, Indiana.
  - The served "beginner" and "core" labels are derived from each head's difficulty card (below), not hand labels.
- **1B (US-only)** is an additional layer on top for US users, e.g. Body and Soul, Star Dust, I Got Rhythm.
- **The US-PD candidate list, each to be checked and given its tier:** Sweet Georgia Brown, Tea for Two, Honeysuckle Rose, Ain't Misbehavin' (**1B**: co-composer Harry Brooks died 1981), What Is This Thing Called Love, Softly as in a Morning Sunrise, Lover Come Back to Me, Star Dust, Body and Soul, I Got Rhythm, Embraceable You, But Not for Me, Georgia on My Mind, St. Louis Blues, Basin Street Blues, Bye Bye Blackbird, Blue Skies, Someone to Watch Over Me, 'S Wonderful. Mood Indigo (1930/31) is checked for its print year.
- **1A heads for the other styles, to verify:** choro (Pixinguinha pre-1931 prints, life term permitting), tango ("La Cumparsita" 1916: check its author term class), blues (W. C. Handy, died 1958: 1B, so other blues for 1A).
- **The workflow** is the `verify` flag in heads.ts: I transcribe, and the owner checks each note before the head is served (owner task, §17).
- **The legal note** in heads.ts changes from "PD worldwide" to "US PD (published ≤ 1930)", with the per-head tier and `pdFrom` per term class.
- **Each head stores** an "as printed" melody, a jazz chart, and a reconciliation note. Swing comes from the feel layer (SP §16), not from rewriting the melody. **Period-print dotted pairs** are accepted played straight-dotted or swung under the feel layer.
- **Each head gets a difficulty card,** computed from the §1.2 reading features + range + harmonic rhythm + chromatic-note share, mapped to a content tier.
  - Learn-a-tune, goal tunes, tune of the week and section suggestions match heads to the learner by this tier.
  - It joins the course-change checklist (§16).
- **Region-safe filler:** the songbook originals, voice songs and lick bank (§0 H4), and the 5 app-written jazz heads (Corner Bench, Long Way Round, Back Porch Blues, Night Ferry, Quiet Hours) as **clearly labelled practice tunes, never presented as real repertoire** (§0 H5). Each lick and original head records where it came from.

### 8.3 Chord charts
- **The charted-standards library grows broadly, beyond about 120 standards** (H6): all the major standards in every genre, Latin included (H7). Charts are chords only. **The melodies of protected (post-1930 or 1B-elsewhere) tunes are never served.**
- **Chart policy (H6, H7):**
  - any standard may be used **by title**, with the app's own chord chart, **built from analysis, never copied from fake books or chord sites**;
  - **many variations per standard,** never one fixed reharm or voicing;
  - every chart, standards and pop, has a **source (provenance) and a human verifier**, like heads;
  - **a verify screen** shows the source beside the engraving;
  - the verification time is budgeted as an owner task (§17, §18 step 5);
  - each chart goes with official-recording embeds (§10.1) and the by-ear learn-a-tune variant (§8.4).
- **"Harmony is the work" care** (few songs, chords only) is kept only as a note on very idiosyncratic modern writers (e.g. Collier, Steely Dan, some post-bop / Shorter charts) (H7, §11.1).

### 8.4 Learn a tune (AP #2)
- **One protocol per head, in all courses (band 2+):**
  1. listen: the YouTube embed of a recording first (H3), then the app's clean version; **click-to-play only**. An item without an official recording uses the app's clean version only;
  2. sing it (§16 syllable rule); instrumentalists' singing is graded octave-equivalent;
  3. play the melody;
  4. roots;
  5. guide tones;
  6. melody + shells (piano / guitar), or melody + roots / walking (bass), or melody over the band (voice, horn-style);
  7. **from memory**: the chart and melody hidden, graded on the same items, **cold, ≥ 8 h after step 6**. It creates a **pending memory check** that shows on Today and resumes there;
  8. in 2 more keys. **Voice:** "find your key" from voiceRange, then one more key;
  9. solo on it (§10.3).
  - **Voice variant:** steps 3–5 = sing the melody, then the roots (a sung bass line), then the guide tones (sung).
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
  - **melody steps** are self- or teacher-checked, never served or graded against a stored melody;
  - **graded steps:** roots, guide tones, shells, chords from memory;
  - **completion** = chords from memory (cold) + a self or teacher melody check (§6.1).
- **Modal and Coltrane forms** are learned only through the by-ear variant, in every region: their melodies are protected in the US too.
- **Rhythm changes:** the I Got Rhythm melody (1B) is served in the US only; elsewhere rhythm changes are learned by ear.
- **Drums:** sing the head while keeping time, then kicks and set-ups from the head, then trading 4s inside the form.
- **Trading 4s inside the form** is also added for keys, guitar, bass and voice. It is graded by form position and density, as improv-prep in the line-jazz area (voice, which has no line-jazz area: coverage only).
- Each step is a fixed-tempo or laddered item per SP §15. Step 7 is the memory modifier (SP item 30), raised to H for tunes.
- **The score** shows in 4–8-bar windows with the playhead (one screen).
- **A harmonic map page per tune:** key areas, ii–V brackets, the turnaround, the form. It is shown before step 4 and hidden at step 7.
- **Area:** learn-a-tune steps map to the instrument's line or harmony area by step (§1.10). **On a head the learner has already played,** the steps go to coverage and `repertoire-memory` and never feed area level or rank; only transfer forms feed level (a new key at sight in step 8, a chart at sight, an unseen head), passing by the transfer rate rule (§1.6, §1.10).
- **Contrafact pairs** show the PD head's melody (region-gated), the bebop tune's chord chart only, and an official embed and a by-ear option. **The gate depends only on the PD side.**
  - Hot House ↔ What Is This Thing Called Love;
  - Donna Lee ↔ Indiana;
  - Anthropology ↔ I Got Rhythm;
  - Scrapple from the Apple ↔ Honeysuckle Rose (the card notes that only the A sections match; the bridge is I Got Rhythm);
  - Dig ↔ Sweet Georgia Brown.

### 8.5 Tune of the week and revisits
- **Tune of the week in the key of the week** (RP N1): a served head in the SP key of the week, or a transposition. It gets ~10 % of the technique block, capped at 5 minutes.
- **Revisits:** a learned tune returns via piece FSRS (§4.3) with a new layer each time: reharm, solo, arrangement. This is the repertoire spiral.

### 8.6 Unit capstones (AP #3)
- Every path unit ends with a music step: a tune slice, a duet or a performance take using the unit's skills. It uses the `repItem` / `openRepWay` hooks.
- The capstone counts as the unit's last step, and is **skippable**, never a lock. Capstones are coverage only (§1.10).
- **Capstone mapping:** a table per unit and theme in the path content, written with the capstones.
- **Ear capstones:** a short real-recording task (embed + annotation, §10.1), **scoped to path themes first** (one annotated embed per theme). They write to `repertoire-memory` and coverage, never the Ear course skills.
- **A ballad capstone** on a 1A ballad (If I Could Be with You, or spirituals), or the labelled practice ballad Quiet Hours.

### 8.7 Accompanying a singer or soloist (AP #4)
- **New family `k-accomp-voice`, and `g-accomp-voice` on guitar** (area: harmony / voicing; on a head the learner has already played, `k-accomp-voice` goes to coverage and `repertoire-memory`, never level, §1.10). The levels:
  1. intro in the singer's key (the last 4 bars, or a I–vi–ii–V vamp);
  2. comping under a sung melody, keeping out of the melody's register (graded by register overlap);
  3. fills only at phrase ends (graded by note density inside sung phrases vs at their ends);
  4. following rubato: the comping must follow the singer. **The rubato comes only from human takes:** teacher recordings, calibration-account takes, the human model bank (§8.9), or a voice student's take via §12.3. Never an algorithmic rubato curve (no-claude-composed-music; the humanize layer was rejected). Labelled "teacher or recording needed" until the bank exists;
  5. transposing the chart at sight by ±2 semitones;
  6. endings with the singer's fermata.
  - **Levels 2–3:** the app's playback of a served head is the melody source; only level 4 needs a human take.
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
- **Free improvisation:** 3 levels (dynamics/register only, a texture call-and-response, a rhythm-only solo), **graded on task compliance only**, e.g. "only register and dynamics changed", "rhythm only". Variety is descriptive feedback. It counts as coverage only.
- **Jazz-bridge links,** each tagged: Joplin → stride (`accomp`, `k-nola`); Debussy and Satie → planing and constant structure (`k-reharm`, `planing`).

### 8.9 The human model bank
- **An owner production task in steps 5 and 7:** recordings of 1A heads by real singers and players, several rubato and dynamic renditions each, with performer releases.
- **Until the bank exists,** each level that depends on it is labelled "teacher or recording needed". Those levels:
  - accompaniment L4;
  - comp dynamics against the singer;
  - expression model curves, including Romantic rubato (§14);
  - diction models (§11.2).
- **Such a level** is skippable, never a gap in the bar to next, and never sampled by the level test.
- **Drum "supporting a soloist"** uses rule-generated licks as the soloist (allowed by H4), so it is not "teacher or recording needed" (§13.6).

### 8.10 User-made content and sharing
- **Every user-made phrase and recording carries a source flag.** It defaults to **"unknown → private"** unless the user declares it their own or PD. The flag follows the §8.1 recording test.
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
1. **The synthetic-learner harness (part of step 1):** learners with known θ, learning rate, forgetting, warm-up decrement, fatigue and input noise, **with day and cell random effects** (look dependence). Their SDs are estimated from the calibration traces; until then the harness uses day SD 0.8 and cell SD 0.7 on the logit scale. Every level rule (§1), planner (§5) and SP rule runs on them. The test passes when:
   - current form tracks θ_cold (bias and RMSE reported);
   - the current-form posterior is calibrated under day and cell dependence (a beta-binomial with a day effect) (§1.7);
   - wrong demotions of current form stay < 5 % (true p ≥ 0.75);
   - a steadily improving learner climbs from T0 to T5 on rotation alone (§1.3);
   - per-input jitter only widens thresholds by the measured noise, so a lenient input can't inflate rank (§1.10);
   - the rank guard tests hold (§1.7).
   - **It reports, before step 1 ships:** calendar time per tier per area for rank (H8) from the real catalogue, the posterior's calibration, the wrong-demotion rate, and the re-promotion time per area. The owner sees these numbers (§17.4).
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
- A 4-point scale per quality the app can't measure: tone, phrasing, interpretation, registration (and posture/tension, §1.1).
- Each rubric is tied to the saved take.
- The student self-rates first, then sees the teacher's rating.
- A low score adds to the goal weight in need (§5).

### 12.2 The teacher as the model
- **The flow:** the teacher records a phrase, the student imitates it, and the two are compared.
- It is a first-class assignment type on every instrument (Encore capture exists).

### 12.3 Async ensemble
- In a studio, one student's take (bass, or a sung melody) becomes the backing track for another's. This is the latency-safe way to "play with others". Student ↔ student exchange is private within the studio (§8.10).
- **Grading:** the first take has a click and a calibrated round trip; later takes are graded against the first take's beat map.

### 12.4 Ensemble, performance and lesson plans
- **An ensemble-roles unit:** bass = harmony and time, drums = form, comping = space. Role-swap listening.
- **Performance ritual:** announce → one take, no restarts → listen back with one question (time / sound / shape) → self-rate → compare with the teacher. It resumes after a reload (never-lose-progress), and a reload does not count as a restart.
- **Lesson-plan templates:** a learn-a-tune week, a transcription week.

---

## 13. Curriculum flow and area additions (AP §4, #15)

### 13.1 Flow
- **The curriculum-flow audit is a gate:** every new or changed ladder in steps 5, 7 and 8 passes a flow audit (no gaps, no topic hopping, several success items per stage) before it ships. The upper Ear levels, voice, drums, bass and guitar get their audits scheduled across those steps (curriculum-flow rule).
- **The bin families get the flow audit:** voicings, k-reharm, jazz, accomp, g-scales (curriculum-flow rule). Each is split into 2–3 coherent ladders, or given explicit cross-family prerequisites in place of in-family order.
- **A "use it" step for advanced theory topics:** each one (negative harmony, twelve-tone, neo-Riemannian…) gets at least one instrument or composition step, tagged.
- **A tune suggestion at each section boundary:** passing "developing" on an instrument course suggests one real tune (from the region pool, matched by difficulty card, §8.2), learned to the memory step. It is skippable, never a lock.
- **The level test and skill map get a tune section per course:** an opt-in "tunes I know" pick, and a chart at sight. It is never "from memory" for new users, and never samples a "teacher or recording needed" level (§8.9).
- **Klezmer / Israeli idioms** (AP §2.14) are deferred, by the global positioning decision.

### 13.2 Games
- **Contour Draw:** fills the open beginner Ear gap (beginner-game-gap memory): trace a tune's shape. **Ships early, in step 2,** with generated 4–6-note contours from the existing Ear melody generator (random stimulus generation, not composition). Head slices join in step 5, under §13.5.
- **First-phrase recall:** title → play the first 4 bars of a learned head.
- **Groove Match:** drums, copy a 2-bar groove, scored per limb ("needs MIDI", §13.6). Area: drums grooves (§1.10).
- **A pitch-steered line game** for voice, in the serious visual style.

### 13.3 Reading
- **A jazz reading ladder** (area: reading): written 8ths played straight vs swung; articulation marks; big-band kicks and set-ups.
- **A gig sight-read capstone:** lead sheet + road map.
- **The transposing-instruments ladder is deferred** until a horn audience exists.

### 13.4 Rhythm
- Deliberately behind or ahead of the beat on keys and guitar comping (b-swing levels 2–3 copied).
- **The swing band (SP §16.9) applies app-wide,** not only on key-session lines, with tolerances per tier. The accept band widens upward below ♩ 110 (ballads). D9's target is unchanged.

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
- **Balance:** ride above snare comping, kick under the bass, by per-pad velocity ratios. **Calibrated per kit** (per-pad gain), or labelled as intent, not loudness.
- **Supporting a soloist:** density follows the soloist. The soloist is the lick bank's rule-generated licks (allowed by H4), or PD or teacher lines, never Claude-composed. It is not "teacher or recording needed".
- **Melodic soloing:** a motif on the toms, developed and returned, graded by motif matching on pad and rhythm with the drum-motif detector (pad sequence + IOI n-gram, §10.3).
- **A tuning brief** (not graded).
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
  - voice: Vaccai, Concone, the 1894 Schirmer Italian arias;
  - bass: Simandl, Bach.
- **Each piece:** published ≤ 1930, generated from verified notes. Never a scan of a modern edition. Each piece needs note-by-note verification (owner task, §17.5, in the time budget).
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
  - hands-free (the §7 tap is the one optional exception);
  - only verified theory;
  - all 12 keys where it applies;
  - guitar/bass parity;
  - small hands;
  - no movable do.
- **The syllable rule:** every sung step (learn-a-tune, transcription, sing-what-you-play and the rest) uses a neutral syllable, degree numbers or letters. **"Letters" means localized note names, fixed do included in Romance locales** (ear-intelligence decision). Movable do stays out.
- **No memorizable items** (§13.5).
- **Course change checklist:** openers, unit openers, skill map, the level test per area, and the head difficulty cards (§8.2).
- **No locks.** The entry rule limits only the rotation and the planner (§1.3). No change notices before real users.

---

## 17. Open questions and owner tasks

### 17.1 Lawyer and policy questions (before charging money)
- The rule of the shorter term (serving 1B content, the region gate, and 1A heads in long-term countries, §8.1).
- **Songs whose composer died by 1955 but whose lyricist died later** (Tea for Two, Honeysuckle Rose): may a melody-only use serve them? The EU joins the two terms for songs with words, and Israel is unclear.
- **A PD recording of a 1B composition** needs the same region gate.
- Mexico and other long-term countries (incl. the life+75 class).
- **The studio sharing rule** (§8.10): private 1:1 and within-studio exchange vs distribution.
- **The YouTube API monetisation policy:** whether embeds may sit behind a subscription, or must stay outside the paywall.

### 17.2 Prerequisites before enabling community sharing of melody-bearing content (§8.10)
- User-responsibility terms; a registered DMCA agent; notice-and-takedown; a repeat-infringer policy; EU DSA notice-and-action.

### 17.3 Items to check
- Each 1A head confirmed 1A, with `pdFrom` per term class, and verified; each candidate head given its tier; Mood Indigo's print year.
- The other-style 1A heads: Pixinguinha prints (life term), "La Cumparsita" (author term class), non-Handy blues.
- The listening-canon candidates: Jelly Roll Morton solo piano 1923–24 and James P. Johnson solo piano, each through the recording test (release date, compositions, every improvising ensemble member's death year).
- Folk/trad print years and authors (e.g. the Hava Nagila lyric credit).
- Any lick whose rule origin is unclear (flagged for the owner).

### 17.4 Owner questions and decisions to see
- **Before step 1 ships:** the harness's report (calendar time per tier per area for rank, from the real catalogue; the posterior's calibration under day and cell dependence; the wrong-demotion rate; the re-promotion time per area) (§1.7, §9.1).
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
   - §1.1–§1.6 and §1.12–§1.14: definition; `contentTier` per spec / option (band seeding at the band's lower T); the voice sub-band and reading quantile tiers; `areaTier` {content, pace} and `paceTier`; `placedTier` (entry only), the over-placement correction (count restarts at each drop, only days with `placedTier` items offered) and the one entry rule with the climb test; cold flags with the ≥ 1 h any-sounding-take gap (`lastSound`); native feel counting as straight; cell keys; first cold take per cell per day for confirmations; later-day rules at ≥ 8 h and a different local day; the key-session cold-first ordering; cross-device downgrade; the per-area confirmation table; `cellPass` (voice, rhythm, reading, transfer) with the reading and transfer rate passes; `established` vs `acquired`; input series; the Elo as practice form; the Ear course skills and `*-ear` routing;
   - §1.7 rank by passed exercises (H8): the exact rule (passes at tiers ≥ t, min(3, available), min(2, available keys), ≥ 1 pass at t, empty tiers skipped, unavailable exercises excluded), `exerciseId` / `exerciseIdOf`, main-item passes, fixed-tempo rung passes and variants, `cellPass` passes, voice sub-bands, teacher targets, stored `passedAt` records and `rankHW` (rank = max(`rankHW`, derived); never falls, can jump), promotion XP once per tier, the "2 of 3" bar, the rank guard tests; the current-form posterior: passed and established cells only, looks (first per cell per day, FSRS review and pass probes outside the slots included, ≤ 2 per area per day, second from another exercise), n_eff, window 30 with exercise breadth (no decision on failed breadth), the slump rule, current form following rank up, re-promotion after a slump, the re-entry window per item; entry vs current-form roles; the confirmation-slot cap (2–4 per session) with the minimal slot injector in workout2 / todayPlan, probe band only; the simplified placement (§1.3);
   - §9.1 the harness with day and cell random effects, and its report to the owner before step 1 ships;
   - §1.9 the staircase (R-multiplier step, probe-band confirmations for passed cells) and the MAP threshold estimate;
   - §1.10 rank, current form, the area table and the new-family area mapping, memorised material out of level (guard test), the passed-exercise bar, the DYN top-tier cap;
   - §1.11 the break table;
   - §1.15 the event fields, the cold-entry fields, the `passedAt` record fields, `rankHW`, the derived look log and the fresh-start epoch;
   - guard tests for every warm-peak reader (§1.5, incl. `playerTier`) and the Ear guard tests (§1.14).
2. **§2 quick fixes and §3 reward re-base:** Q4 at its Momentum location with the reward limits (high-water mark, `sessionBonus`, `WEEKLY_LIMIT.plan`), Q6 with Momentum; no pay from provisional estimates; Contour Draw (generated, §13.2); the physical-approach briefs (§15).
3. **SP §2 rotation** (and the rest of SP in its own order).
4. **§4 retention:** technique lapses, Ear E1, games / voice / pieces.
5. **§8 real music.** It starts with:
   - the 1A list and its verification;
   - the region pool, `servable()` and its guard test, `pdFrom` per term class (incl. life+75), the unknown-region rule;
   - the recording test (a)–(c), every improvising ensemble member;
   - head difficulty cards;
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

**Done when:** an independent spec-only round on v10 (round 9) finds no new blocker in this spec (and the SP pointer edits) before step 1 starts.

---

## Appendix A. Traceability

Every amendment item and where it now lives in v10 (v10 keeps v9's and v8's section numbers; round-7 changes are noted "per R7 19.x" and mapped in A.8; round-8 changes, from v9 §19, are noted "per R8 19.x" and mapped in A.9). "Struck" items are superseded and appear only in their final form. Two numbering schemes used "19.x": items from the v4 amendment layer are prefixed **v4-** (A.3); the round-4 binding changes are **R4 19.x** (A.4).

### A.1 v2 (§17 of v2–v4)

| Item | Content | v10 section |
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

| Item | Content | v10 section |
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

| Item | Content | v10 section |
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

| Item | Content | v10 section |
|---|---|---|
| R4 19.1 | beta-binomial posterior, prior Beta(1, 1), demotion P(p < 0.5) ≥ 0.95 over ≥ 8 on ≥ 2 days, indifference zones, operating characteristic | §1.7 (window 30 / 0.975 per R5 20.1; promotion "≥ 2 days" struck per R6 21.3; 1-per-tier-per-day look cap struck per R6 21.1; promotion as the rank source, 0.975 and the horizon target struck per R7 19.1: the posterior drives current form only) |
| R4 19.2 | above-target takes excluded from confirmations both ways; probe-band confirmations | §1.6, §1.9 (passing-take exclusion struck per R5 20.1) |
| R4 19.3 | MAP threshold estimate; provisional; no pay from provisional; plateau on raw points | §1.9, §2 Q3, §3, §6.2 |
| R4 19.4 | cold take counting: level vs pass/FSRS/staircase; warm-up not penalised; rhythm reconciled | §1.4 (per cell per day per R5 20.3) |
| R4 19.5 | `acquired` in-session (D2 / A10), `established` cross-session | §1.6, §1.3 |
| R4 19.6 | rank over inputs | §1.10, §1.12 ("max over inputs, shown with input" struck; pooled posterior struck per R7 19.1) |
| R4 19.7 | `paceTier`; band = SP §14; beginner = A3; entry formula; prerequisites; teacher forms exempt; band seeding at lower T | §1.2, §1.3 (entry formula per R5 20.2) |
| R4 19.8 | range top; re-entry end; cell key; staircase step; key-session cold-first; SP governance list; `playerTier` guard | §1.7, §1.4, §1.9, §1.16, §1.5 (re-entry per item per R5 20.4) |
| R4 19.9 | rank semantics owner question | §0 H8, §1.10 (answered per R5 20.8; replaced by H8 per R7 19.7) |
| R4 19.10 (area mapping) | new families → area or coverage only | §1.10 table |
| R4 19.10 (difficulty card) | head difficulty card; beginner/core derived; matching; checklist | §8.2, §13.1, §16 |
| R4 19.10 (term classes) | `pdFrom` per term class; long-term denial; 1A = US + life+70 | §8.1 |
| R4 19.10 (phrases) | source flags; protected content private; teacher/ensemble via `servable()` | §8.10 (teacher/ensemble rule narrowed per R5 20.6, R6 21.2) |
| R4 19.10 (minor) | step 1 click-to-play; Hot Five date fact; 78-rpm PD-clean; other-style 1A heads; Tárrega, Schirmer arias; accompaniment L2–3 melody source; curated pop example | §8.4, §8.1, §8.2, §14, §8.7, §11.1 (Hot Five struck per R5 20.6) |
| R4 19.11 | order of work step 1 / step 5 adds | §18 |

### A.5 Round 5 (R5, §20 of v7)

| Item | Content | v10 section |
|---|---|---|
| R5 20.1 (looks) | look = first eligible confirmation per cell per day, time order | §1.7, for the current-form posterior (6-per-day cap struck; 2 per area per day per R6 21.1) |
| R5 20.1 (window) | window 30; breadth; promote at 0.975 | §1.7, posterior window (item breadth struck: exercises per R6 21.1; 0.975 struck per R7 19.1; rank breadth per R7 19.1) |
| R5 20.1 (passing take) | passing take included | §1.6 |
| R5 20.1 (target) | < 5 % at p ≤ 0.55 over 730 looks | struck (no false-promotion horizon target per R7 19.1) |
| R5 20.1 (OC) | round-5 operating characteristic; guard test on easiest item | struck (round-5 OC and "2–3 weeks" per R7 19.1); guard tests per R7 19.1 in §1.7 |
| R5 20.1 (bar) | bar shows posterior every practice day | struck (bar = passed exercises per R7 19.1) |
| R5 20.2 | `placedTier`; entry rule; placed test; demotion at placedTier; A8 switch deleted | §1.3, §1.7, §1.16 (placed test struck; entry and correction per R7 19.2) |
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

| Item | Content | v10 section |
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

| Item | Content | v10 section |
|---|---|---|
| H5 | 5 app-written jazz heads approved as labelled practice tunes | §0, §8.1, §8.2 |
| H6 | standards by title with own charts; embeds; by-ear variant; library beyond ~120 | §0, §8.3, §8.4, §6.1, §18 step 5 |
| H7 | collecting-society question closed; all major standards incl. Latin; many variations; protected melodies never served; "harmony is the work" as a note | §0, §8.3, §11.1, §17.1 |

### A.8 Round 7 (R7, §19 of v8)

| Item | Content | v10 section |
|---|---|---|
| R7 19.1 (rank) | rank = highest tier with ≥ 3 distinct passed exercises in ≥ 2 keys; pass definition; keyless areas min(3, available), unavailable exercises excluded; fixed-tempo rung passes; voice/rhythm/reading `cellPass` passes | §1.1, §1.6, §1.7, §1.10 ("at that tier" wording struck: tiers ≥ t and one rule for keyed and keyless areas per R8 19.1) |
| R7 19.1 (never falls, bar, time) | high-water, a pass stays a pass; bar "2 of 3" plus keys, never backward; about 1–3 weeks per tier, harness reports per area | §1.7, §1.10, §0 H8, §9.1 |
| R7 19.1 (posterior) | posterior (window 30, Beta(1, 1), day-dependence aware) drives only current form, adaptivity (entry, need, spacing, refresh probe) and reporting; slump rule; no horizon target; harness reports calibration | §1.1, §1.7, §1.8, §1.11, §9.1, §17.4 (entry struck from the posterior's roles; passed and established cells only; n_eff; re-promotion at P(p ≥ 0.6) ≥ 0.9, per R8 19.3) |
| R7 19.1 (removed) | posterior promotion as rank source, "2–3 weeks", 0.975, false-promotion horizon target | removed from §0, §1.7, §1.10, §9.1, §17.4, §18 |
| R7 19.1 (guard tests) | one exercise in many keys/hands never raises rank; three passes in one key don't either | §1.7, §9.1 |
| R7 19.2 | `placedTier` sets entry only (≤ max(placedTier, rank) + 1); "placed: T5" until rank reaches it; 20-practice-day / slump correction; initial state | §1.3, §1.6, §1.10, §1.7 (count restart at each drop per R8 19.4) |
| R7 19.3 | daily slot cap 2–4 per session across areas; minimal injector in step 1, folded into need() in step 6; probe band only ("near the band" struck); non-due probe takes not graded into FSRS | §1.7, §5, §1.9, §4.1, §18 steps 1 and 6 ("daily" struck: 2–4 per session per R8 19.6) |
| R7 19.4 | memorised material (played heads: learn-a-tune, k-pop, k-accomp-voice) → coverage and `repertoire-memory`; only transfer forms feed level; guard test | §1.10, §8.4, §8.7, §11.1, §1.7 |
| R7 19.5 (contrafacts) | PD head melody (region-gated) + bebop chart only + embed + by-ear; gate on the PD side only | §8.4 (Scrapple both-sources note struck) |
| R7 19.5 (by-ear) | "my chart"; functional equivalents | §8.4, §6.1 |
| R7 19.5 (native feel) | native feel counts as straight; feel-layer modifiers non-qualifying; SP §16.5 amended | §1.4, §1.6, §1.16, SP §22 |
| R7 19.5 (reading) | reading items rule-generated per tier | §1.2 |
| R7 19.5 (goals) | "My Blue Heaven by June" (served 1A head); "with a singer" needs a human singer's take | §6.1 (goal tunes from the region pool, 1B for US learners, per R8 19.5) |
| R7 19.5 (ballad) | 1A ballad (If I Could Be with You, spirituals) or practice ballad Quiet Hours | §8.6 |
| R7 19.5 (drums, voice) | timing SD folded into drum grooves; voice range/agility at comfortable tessitura | §1.10 |
| R7 19.5 (owner tasks) | PD repertoire note-by-note verification | §14, §17.5 |
| R7 19.5 (non-US) | rhythm changes, modal and Coltrane forms only by ear outside the US | struck (modal and Coltrane by ear everywhere; rhythm changes 1B in the US only, per R8 19.5), §8.4 |
| R7 19.6 (later day) | ≥ 8 h and a different local day for `established`, SP §4.2 later-day take, `firstTargetDay` | §1.6, §1.16, §18 step 1 |
| R7 19.6 (cold rise) | Momentum "cold rise" only on a rise > 1 posterior SD above the previous high | §3, §1.9 |
| R7 19.6 (rank jump, voice sub-bands) | passes at a higher tier raise rank directly; voice passes per cell, rank by item level, 60 ¢ sub-band shown | §1.7 (cents band not part of exercise identity per R8 19.1) |
| R7 19.6 (SP pointer) | SP §22 updated to v9 numbers; SP §14 area-tier definition superseded | §1.16, SP §22 (v10 keeps the v9 numbers, so the pointers stand) |
| R7 19.7 | owner decision H8 replaces the "rank speed" row | §0 H8 |

### A.9 Round 8 (R8, §19 of v9)

| Item | Content | v10 section |
|---|---|---|
| R8 19.1 (rule) | rank = highest t with ≥ min(3, available at tiers ≥ t) distinct exercises passed at tiers ≥ t, in ≥ min(2, available keys) keys, ≥ 1 pass at t; breadth = union; passes above count; empty tiers skipped; keyed and keyless same rule | §0 H8, §1.1, §1.7, §1.10 ("at that tier" and keyless-only min(3, available) struck) |
| R8 19.1 (stored state) | `passedAt` record `{contentTier, target, exerciseId, src, at}`; synced `rankHW`; rank = max(`rankHW`, derived); re-tiering never lowers rank | §1.7, §1.15, §18 step 1 |
| R8 19.1 (exercise identity) | `exerciseId` / `exerciseIdOf` with a test; pass = the cell's main (HT) item, hand-separate never alone; fixed-tempo rungs under the §1.6 rule; variants not distinct; in-session "rung passed today" not a `passedAt`; cents band not part of identity | §1.6, §1.7 |
| R8 19.1 (teacher targets) | rank only at ≥ the catalogue target; a lower teacher target = coverage and the assignment | §1.7 |
| R8 19.1 (promotion XP) | once per tier gained, under the Q6 caps | §1.7, §3 |
| R8 19.1 (guard tests) | scattered passes; empty tier; all-"needs MIDI" mic tier; three RH-only passes; three variants of one rung; one voice item in three cents bands; lowered teacher target; re-tiering never lowers rank | §1.7 |
| R8 19.1 (top tiers) | T7–8 has no content; DYN caps at the top content tier; T7–8 content an owner backlog item | §1.10, §17.5 ("T7–8 content backlog") |
| R8 19.2 (transfer) | ≥ 3 clean of the last 5 distinct unseen items on ≥ 2 days; one exercise per tier pass | §1.6, §1.7, §1.10, §8.4 |
| R8 19.2 (reading) | ≥ 3 clean in the last 5 cold first-sight takes on ≥ 2 days; reading exercise = generator × tier | §1.6 ("3 clean first-sight takes" struck) |
| R8 19.2 (storage) | `cellPass` covers voice, rhythm, reading and transfer | §1.4, §1.6, §1.7, §1.15, §18 step 1 ("voice and rhythm only" struck) |
| R8 19.3 (follows rank) | on a rank rise, current form = the new rank | §1.7 |
| R8 19.3 (re-promotion) | P(p ≥ 0.6 \| data) ≥ 0.9 (harness may tune); no 30-look cap, all looks since the slump | §1.7 (P(p ≥ 0.7) ≥ 0.95 struck) |
| R8 19.3 (passed cells only) | posterior counts only passed and established cells; unpassed probes feed staircase and threshold only; new work never a slump | §1.4, §1.6, §1.7 |
| R8 19.3 (n_eff) | n_eff = n / (1 + (m − 1)ρ) defines "day-dependence aware" | §1.7 |
| R8 19.3 (roles) | entry = max(`placedTier`, rank) + 1, never shrinks; current form sets §5 distance, need weights, spacing, tempo choice, not entry | §1.1, §1.3, §1.7, §5 ("posterior drives entry" struck) |
| R8 19.4 | over-placement count restarts at each drop, only days with `placedTier` items offered; a drop below band 2 restores beginner status, D1 floor 3 | §1.3, §18 step 1 |
| R8 19.5 (forms) | modal and Coltrane by ear everywhere; rhythm changes melody (1B) US only, by ear elsewhere | §8.4 ("Non-US regions: … modal and Coltrane forms …" struck) |
| R8 19.5 (flow audit) | flow-audit gate for every new or changed ladder in steps 5, 7, 8; upper Ear, voice, drums, bass, guitar audits scheduled | §13.1, §18 |
| R8 19.5 (goal projection) | target-tier goal by passes per practice hour; tempo goal by G | §6.1 |
| R8 19.5 (drum rudiments) | content tier = nps tier, like scales | §1.2 |
| R8 19.5 (swing band) | accept band widens upward below ♩ 110; D9 target unchanged | §13.4 |
| R8 19.5 (trading 4s) | inside the form for keys, guitar, bass and voice; graded by form position and density, improv-prep in line-jazz | §8.4 |
| R8 19.5 (goal tunes) | from the learner's region pool (1B for US learners) | §6.1 |
| R8 19.5 (no official recording) | the app's clean version only | §8.4 step 1 |
| R8 19.5 (Scrapple) | only the A sections match; the bridge is I Got Rhythm | §8.4 |
| R8 19.5 (§9.1 report) | re-promotion time per area | §9.1, §17.4 |
| R8 19.6 (slot cap) | 2–4 per session | §1.7, §5, §18 step 1 ("daily" / "2–4 per session" ambiguity struck) |
| R8 19.6 (looks) | FSRS review probes and pass probes outside the slots count as looks; slots guarantee a minimum supply | §1.7 |
| R8 19.6 (breadth fail) | no decision; the slot injector picks the missing exercise or key | §1.7 |
| R8 (consolidation) | v9 §19 merged and removed; done-when moved to round 9 on v10 | this document, §18 |

---

## 19. Round 9 → v11: binding changes (merge into the body)

### 19.1 Passes cannot be farmed by retrying (both reviewers)
- **The technique and fixed-tempo pass:** the counting cold take must be the cell's **first cold take of that local day**. A cold miss that day blocks the pass until another day. Every other cold take still feeds FSRS and the staircase.
- **Reading and transfer** replace "3 of the last 5" with a test over **all cold attempts at the tier since the tier started**:
  - prior Beta(1, 1);
  - pass when P(p ≥ 0.6 | data) ≥ 0.9;
  - with ≥ 5 attempts on ≥ 2 days.
  - The §9.1 harness reports the false-pass rate at true p = 0.4 and 0.5 (target < 10 % at 0.5).
- **Voice and rhythm pass rule:** the technique rule, where "clean" means within the cell's cents and timing band (voice) or SD band (rhythm). That is 3 clean on ≥ 2 days, including the first cold take of a later day (≥ 8 h and a different local day).

### 19.2 Rank and entry cannot deadlock
- **"Available" in the rank rule counts only what the planner can offer:** min(3, available exercises in tiers t … entry ceiling).
- **Entry also opens tier t+2** once every available exercise at t+1 is passed.
- **Guard test:** a tier with 2 exercises, climbed rotation-only.

### 19.3 Current form: buildable window
- **Breadth** is measured over the passed and established exercises at the tier: min(3, that count).
- **Current form at tier t** reads passed cells at tiers ≥ t, matching rank.
- **The slot injector** targets only passed cells.
- **The window** holds looks from the last 90 days only, the last 30 within that.
- **n_eff** includes cell clustering: n / (1 + (m_d − 1)ρ_d + (m_c − 1)ρ_c), with pooled defaults from the calibration traces (ρ_d and ρ_c stated in §9.1).
- **The wrong-demotion target** is < 5 % per 90 days of practice at true p ≥ 0.75.
- **A tier with no passed cells** shows current form as "unmeasured". Only re-promotion at the tier above moves it.
- **§1.1** says current form uses hysteresis: re-promotion at P(p ≥ 0.6) ≥ 0.9, a slump at P(p < 0.5) ≥ 0.95. It is initialised from rank and capped at it.

### 19.4 Placement correction that works
- **The posterior-slump clause for placedTier is deleted.**
- **The placement rule instead:** placedTier drops one tier if the staircase or threshold estimates sit below 0.8 × target on ≥ 3 exercises at placedTier over ≥ 5 offered days. The 20-offered-day rule stays as the slow path.
- **While placed,** current form comes from the threshold estimates.

### 19.5 Voice pitch rank includes intonation
- **A required cents band per tier** for a pass to count toward rank:
  - T0–2: 60 ¢;
  - T3–4: 45 ¢;
  - T5+: 30 ¢.
- A pass at a looser band than the tier requires is coverage only.

### 19.6 Licks, Encore phrases, repertoire drills
- **Coverage only for rank.** These keep SP §4.2's old pass rule and are memorised material.
- **Rule-generated licks count only as unseen generated licks at sight,** under the cold pass rule. They join the transfer class.
- **Guard test:** a warm lick pass never raises rank.

### 19.7 The other player in trading and comping
- **Trading 4s** (keys, guitar, bass, voice) and **responsive comping** use the §13.6 sources for the other player:
  - rule-generated licks;
  - PD lines;
  - a teacher or the human model bank.
- Otherwise they trade against drums only, or leave the 4 bars silent. **Never an app-improvised soloist.**

### 19.8 A repertoire axis (beside rank, never mixed into it)
- **Per course:** the hardest difficulty card, plus the number of tunes and pieces completed to the cold memory step and kept up by piece FSRS.
- **Shown** on the profile and the course page as "Repertoire: N tunes, hardest T4".
- **It feeds** Momentum (a new tune completed) and goals. Never rank.

### 19.9 Minor items
- **Optional stopping on cross-device merge:** a pass whose counting take is downgraded to warm at merge is revoked if it was set within the last 24 h. Older passes stand.
- **"Catalogue target"** = the option's target at its catalogue entry band, before any rate shift.
- **§8.2:** the STANDARDS_LEGAL heads are "US PD + tier".
- **heads.ts:** `HeadLicence` gains `tier` / `pdFrom`, replacing `pd-worldwide`. The superseded comment banning I Got Rhythm and Body and Soul is removed (build task, step 5).
- **The by-ear melody self-check, the performance self-rate and the rubric self-rating** use the §7 MIDI-key or voice yes/no input, staying hands-free.
- **The rate's entry shift works in tiers,** capped at +1 (SP §15.5 / §17.3 "band step" means tier step).
- **The transfer pool** is filled by keys and charts. The harness checks that every transfer tier is reachable.
- **Unknown region:** the region-safe pool (practice heads, songbook, voice melodies, licks, charts) carries these users.
- **Drum rudiments:** contentTier seeds rudiment complexity (single / double / diddle / flam / drag families), then nps within the family.
- **The Momentum high-water false-payout rate** is measured in the Q6 test.

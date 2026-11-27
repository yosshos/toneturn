# Holistic round 2: one level, honest rewards, real music (v4, 2026-11-27)

This spec implements the two whole-app audits of 2026-11-27:
- docs/AUDIT-HOLISTIC-MEASUREMENT.md (AM);
- docs/AUDIT-HOLISTIC-PEDAGOGY.md (AP).

It sits beside docs/SPEC-SPIRAL-PRACTICE.md (SP, v6). Where they overlap, this spec says which one governs.

## 0. Owner decisions (2026-11-27)

| # | Decision |
|---|---|
| H1 | **The order of work:** (1) one level semantics on cold evidence, built with SP step 1; (2) quick fixes (Ear level, rewards); (3) the SP rotation; (4) real heads, learn-a-tune, unit capstones, accompanying a singer; (5) listening lab, pop chord library, voice registration and text, how to practise, composition. |
| H2 | **Music rights follow US law** (memory: us-copyright-law). Compositions published in 1930 or earlier are public domain in the US as of 2026-01-01. Sound recordings published in 1925 or earlier are PD in the US. `heads.ts`'s "PD worldwide" rule is replaced by US PD. Every melody is verified note by note against period sheet music (LoC, IMSLP), never a modern fake book (owner rule 2026-11-15). |
| H3 | **Listening assignments may embed YouTube recordings** (embed only; no download, no extraction). Transcription is done from the student's own copy or from US-PD recordings. |
| H4 *(open; my assumption)* | The app-written melodies stay: the 5 own heads, the songbook originals and the voice songs. New melodic content comes from verified PD heads. No new Claude-composed melodies are added (memory: no-claude-composed-music) until the owner says otherwise. |

## 1. One level semantics (AM #1, #2, #3, #10; governs SP §4 and §17 where they touch level)

### 1.1 Definition
- **Level in an area** = the hardest **content tier** at which the learner's **cold** success probability is ≥ p* = 0.7. It is shown with a range until the uncertainty is small.
- **Content tier, per area:**

| Area | Content tier |
|---|---|
| Technique (piano, guitar, bass, drums) | the catalogue level's content difficulty (its tier in `tierBounds`) × the tempo band. Content first: a T4 item at a slow band ranks above a T2 item at a fast band, as long as both are at their own start tempo or above. |
| Ear | the feature-based difficulty (SPEC-EAR-INTELLIGENCE §4), with a guess floor per answer count. |
| Reading | reading-complexity features: rhythm subdivisions, accidentals, ledger lines, density, key. Not tempo. |
| Voice | the item level × the cents band (60/45/30 ¢) × the timing band. |
| Rhythm / time | the subdivision type × the timing SD band. |
| Games | low-weight evidence into the area's ability. Games never set the level alone. |

- **Separate axes, never mixed into level:**
  - **Coverage:** stars, 12 keys, forms played.
  - **Maintenance:** fresh / refresh.
  - **Effort:** XP, streak, minutes.

### 1.2 Cold evidence everywhere
- **SP §4 defines the cold take for technique:** ≥ 1 h since the last qualifying take, full click, straight, and not a challenge, burst or probe.
- **The same flag is added to every rating event** (`ev.cold: boolean`) in every area. Per modality:
  - **Ear:** the first 5 trials of a skill/contrast after ≥ 8 h.
  - **Voice:** the first 3 sung items after ≥ 1 h, plus a covariate for minutes since the session start (vocal warm-up is physiological; AM §3.6).
  - **Rhythm:** the first 2 takes of a subdivision type after ≥ 1 h.
  - **Reading:** sight takes are cold by design.
  - **Games:** the first run of a game after ≥ 8 h.
- **Each warm-peak reader** (AM §3.4) moves to a cold reading, and every move gets a guard test:

| Reader | Change |
|---|---|
| `familyLevel`, the technique rank, the course level, badges, friend levels | read the new level (§1.3) |
| `history` and snapshots | a daily **cold** entry beside the daily best. Trends and teacher charts read cold. The best stays display-only ("today's best"). |
| `plateau.ts` | one plateau definition on the cold series (§6) |
| Momentum tempo records, the stretch "record" band | cold only (§3) |

### 1.3 The estimator
- **Phase A (ships first): a transparent rule, no model.**
  - **Level:** the highest content tier with ≥ 2 clean cold takes on ≥ 2 days in the last 60 days. The candidate tier is checked first, then the tiers below it.
  - **Range:** the highest tier with ≥ 1 clean cold take is the top of the range.
  - **Staleness:** a tier without cold evidence for 60 days shows "refresh" (the path's rule, AM §1 #12).
- **Phase B (later, shadow first): a psychometric model per learner × family.**
  - P(clean | log nps, cold, input, minutes-in-session, time of day), with a hierarchical prior from the catalogue tier (AM #10).
  - Outputs: the cold level with a confidence interval, the warm-up decrement, the fatigue slope, retention, and the SP §17 G rate.
  - It is promoted to the source of truth only after the §9 validation shows split-half reliability ≥ 0.7. Until then Phase A is shown.
- **Items stay passed (SP §4.2, `passedAt`).** The level can fall to "refresh", but a closed item never reopens on its own.

### 1.4 The instrument Elo (AM #3)
- **Difficulty** = the content difficulty of the level (catalogue tier) + a tempo offset. It is no longer the tempo band alone.
- **Score** follows the verdict: clean 1, almost 0.5, not 0. Timing is part of the verdict.
- **One rated event per item per session:** the item's cold take, or else the session's first qualifying take.
- **The Elo becomes evidence into §1.1.** The displayed course level comes from §1.3.

### 1.5 The Ear course level (AM #4, a bug)
- `courseRating('ear')` reads only EAR_SKILLS (the Ear areas), never `overallRating`.
- A guard test: an instrument take never moves the Ear level.

### 1.6 Uncertainty and decay (AM #8)
- Each area level carries a Glicko-style deviation that grows with the time since the last cold evidence: +1 tier of range per 60 days without evidence, at most ± 2.
- The planner raises a "refresh probe" when the range is wide: one cold check of the level tier.

### 1.7 Input awareness (AM #12)
- `src` (the input) is stored on every take record, passLog entry, cold entry and rating event.
- A cold series never mixes inputs. A change of input starts a new series, and the old one is kept.
- **The level shows the best series** and names its input when it is not the current one, e.g. "measured on MIDI".
- Guitar, bass and drum calibration logs upload for calibration accounts, like the piano traces (0.145.8).

## 2. Quick fixes (H1 step 2)

| # | Fix | Where |
|---|---|---|
| Q1 | The Ear course level reads only the Ear areas (§1.5) | courseSocial.ts:125 |
| Q2 | The stretch "push" band requires ≥ almost. A miss pays ×1 at most. | stretch.ts:101 |
| Q3 | "Record" XP and Momentum tempo records count only cold takes | stretch.ts, momentum.ts |
| Q4 | XP for following the plan: finishing today's planned rotation visits and cold checks earns the "plan" bonus, the same size as today's "push" | sessionReward.ts |
| Q5 | Quests come from today's plan, e.g. "Today's first-take check in your key of the week" or "The cold take of last week's key", instead of activity counts | quests.ts |
| Q6 | **A simulation test:** a learner who follows the rotation earns ≥ the XP of a linear peak-chaser over 10 sessions | tests |

## 3. Rewards follow the plan, levels follow cold evidence (AM §6)
- **XP pays for effort spent as planned.** Clean and almost takes earn XP; misses earn the base only. Burst takes earn nothing (SP §18.1).
- **Level and rank** come only from §1.
- **Momentum pays for cold progress:**
  - a rise in the cold level;
  - a cold-confirmed close;
  - a due review passed cold.
- **Leagues** stay effort-only (capped weekly XP). League XP never enters a level.
- **Friend comparisons** show level (§1) and effort separately.

## 4. Retention and spacing everywhere (AM #6, #7)

### 4.1 Technique maintenance
- **Every review take of a closed cell is a cold take** (SP §4).
- **It is graded into FSRS:**
  - clean at ≥ 95 % → good;
  - almost → hard;
  - not → again (a lapse).
- **A lapse** marks the cell "refresh": `passedAt` is kept, the next review comes sooner, and the cell is drawn silver.
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
- **Pieces:** a maintenance interval per learned piece (FSRS on the whole piece, graded by the chunk accuracy of its first run after a break).

## 5. One need model and fewer planners (AM #9)
- **`need(item)`** = distance to the next level × P(forgotten) × goal weight × readiness.
  - **Distance:** the gap to the next tier at the cold level.
  - **P(forgotten):** from FSRS or the §1.6 deviation.
  - **Goal weight:** the learner's goal (§6) and the style focus.
  - **Readiness:** prerequisites acquired; not resting.
- **These read it:** workout2, todayPlan, the scheduler, the AI tilt and quests (Q5). The reason line quotes its largest factor: "due for review", "closest to your next level", "for your goal".
- **Retired:**
  - `workout.ts`: the Extras entry routes to workout2;
  - `todaysItems`;
  - `recommend.ts`, folded into need.
- **Precedence, stated in the reason line:** teacher > key of the week > need.
- **After a break of ≥ 7 days,** the first session is a re-entry session: cold checks of the last week's items only, plus one new item. The plan grows again from those results.

## 6. Goals and plateaus (AM #14, AP §4)

### 6.1 Goals
- At onboarding, and anytime in settings, the learner sets:
  - **a goal tune or goal skill with a date**, e.g. "Autumn Leaves with a singer by June", a target tier in an area, or an exam date in exam mode (optional);
  - **minutes per week.**
- The projection (projection.ts) reads the cold rate × the actual minutes. It shows on Today as one line, "On track for June" or "2 weeks behind at this pace", and gives `need` its goal weight.

### 6.2 Plateaus
- **One definition, on the cold series:** the slope of the cold level over practice-hours is ≈ 0, with confidence: ≥ 6 cold points over ≥ 10 days.
- **The escalation, automatic and hands-free:**
  1. variation: feel, key, form (SP §16);
  2. bursts or a slow accuracy block (SP §15.4);
  3. rest of 3–5 days with spacing;
  4. a teacher flag, or for self-learners, a suggested listening model (§10).
- It replaces the three current mechanisms (plateau.ts, the coach cooldown, the SP burst trigger keeps its own short-term rule).

## 7. Self-assessment and transfer (AM #15, AP #9)
- **Self-prediction:** about once in 10 takes, before the take: "Will this be clean?" (one tap), or after it: "Did you rush?". Calibration is tracked as a Brier score per area, and the result is shown monthly as a self-comparison.
  - **This adds one tap.** It is the only exception to hands-free, it is optional, and it can be turned off in settings.
- **Transfer probes:** the first take in an untried key, or of a new item of an acquired family, is recorded as a generalisation index per family. It is shown to the teacher.

## 8. Real music (H1 step 4)

### 8.1 Real heads (AP #1)
- **About 20 heads, US-PD (H2),** each transcribed and verified against a period sheet.
- **The list, each to be checked:** Indiana, Sweet Georgia Brown, Tea for Two, Honeysuckle Rose, Ain't Misbehavin', What Is This Thing Called Love, Softly as in a Morning Sunrise, Lover Come Back to Me, Star Dust, Body and Soul, I Got Rhythm, Embraceable You, But Not for Me, Georgia on My Mind, St. Louis Blues, Basin Street Blues, Bye Bye Blackbird, Blue Skies, Someone to Watch Over Me, 'S Wonderful.
- **The workflow** is the `verify` flag in heads.ts: I transcribe, and the owner checks each note before the head is served.
- The legal note in heads.ts changes from "PD worldwide" to "US PD (published ≤ 1930)". **The app does not serve these heads in regions with a longer term:** a region flag per head; unknown region → US.
- **Lyrics:** only for songs published ≤ 1930, verified against the period sheet, used in voice items (§11.2).

### 8.2 Learn a tune (AP #2)
- **One protocol per head, in all courses:**
  1. listen to it (the app plays the head; plus a YouTube embed of a recording, H3);
  2. sing it;
  3. play the melody;
  4. roots;
  5. guide tones;
  6. melody + shells (piano / guitar), or melody + roots / walking (bass), or melody over the band (voice, horn-style);
  7. **from memory**: the chart and melody hidden, graded on the same items;
  8. in 2 more keys;
  9. solo on it (§10.1).
- Each step is a fixed-tempo or laddered item per SP §15. Step 7 is the memory modifier (SP item 30), raised to H for tunes.
- **A harmonic map page per tune:** key areas, ii–V brackets, the turnaround, the form. It is shown before step 4 and hidden at step 7.
- **Contrafact pairs:**
  - Hot House ↔ What Is This Thing Called Love;
  - Donna Lee ↔ Indiana;
  - Anthropology ↔ I Got Rhythm.

  For the bebop tunes the chart is chords only; the melodies of post-1930 heads are never served.
- **The chord charts grow to about 120 standards**, chords only, which is legal (AP §2.9).

### 8.3 Unit capstones (AP #3)
- Every path unit ends with a music step: a tune slice, a duet or a performance take using the unit's skills.
- It uses the `repItem` / `openRepWay` hooks.
- The capstone counts as the unit's last step, and is never a lock (no locks).

### 8.4 Accompanying a singer or soloist (AP #4)
- **New family `k-accomp-voice`, and `g-accomp-voice` on guitar.** The levels:
  1. intro in the singer's key (the last 4 bars, or a I–vi–ii–V vamp);
  2. comping under a sung melody, keeping out of the melody's register (graded by register overlap);
  3. fills only at phrase ends (graded by note density inside sung phrases vs at their ends);
  4. following rubato: the app's sung melody, from the voice course's own recordings, speeds and slows, and the comping must follow the onsets;
  5. transposing the chart at sight by ±2 semitones;
  6. endings with the singer's fermata.
- **Duet assignments:** a voice student's take is the melody track for a keys student. This uses SPEC-TEACHER-CLASS async layering (§12.3).

### 8.5 Idiomatic jazz ladders per instrument (AP #15)
- The k/g/b jazz ladders keep a shared spine, and gain instrument-specific levels:
  - **bass:** lines that carry the harmony alone, a duo with no comping;
  - **guitar:** slides, articulation, Freddie Green four-to-the-bar;
  - **piano:** comping while soloing.

## 9. Validation programme (AM #11)
1. **The synthetic-learner harness:** learners with known θ, learning rate, forgetting, warm-up decrement, fatigue and input noise. Every level rule (§1), planner (§5) and SP rule runs on them. The test passes when:
   - the level tracks θ_cold (bias and RMSE reported);
   - wrong promotions stay < 5 %;
   - wrong demotions stay < 5 %.
2. **The calibration-trace replay:** split-half and test-retest of the cold levels. A number appears on screen only when its reliability is ≥ 0.7 (levels) or ≥ 0.4 (rates).
3. **Shadow mode:** the new levels are computed beside the old ones for 2–4 weeks of real users.
4. **The teacher agreement study** (SPEC-PRACTICE-INTELLIGENCE §3.5) before any absolute claim.
5. **Injection tests per input:** 0/8/15/25 ms shifts.
6. **Later A/B tests:**
   - rotation vs linear;
   - re-based rewards;
   - FSRS with lapses.

   The primary outcome is always a delayed cold measure.

## 10. Listening lab and transcription (H1 step 5, AP #5)

### 10.1 The lab
- **Sources:**
  - a YouTube embed (H3);
  - the learner's own audio, on the device (My-song infra);
  - US-PD recordings (≤ 1925), shipped where verified.
- **Tasks:**
  - track the form (tap at each chorus);
  - count choruses;
  - name the soloist's instrument;
  - tap the changes;
  - "listen for": one prompt per path unit, e.g. "the walking bass on beats 1–4", "the ii–V in bar 5".
- **Embed tasks are graded by taps against a timeline the teacher or the app marks.** The app does not analyse the embedded audio (H3: no extraction).

### 10.2 Guided transcription (own audio only)
- **The steps:**
  1. loop a bar;
  2. slow it down (time-stretch on the device);
  3. sing it;
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
  6. build an arc (density and register rising to bar 25 of 32).
- The analysis exists (`improvPhrasing`). This promotes SP item 31 from L to H, and adds the paraphrase step for all instruments, which needs §8.1.
- **Sing what you play:** a 2-bar phrase sung, then played (hear → sing → play).

## 11. Pop chord library, voice, how to practise, composition (H1 step 5)

### 11.1 Pop / rock / Israeli chord library (AP #6)
- **Each entry has:** a title, key, changes, form and an original-recording link. **No lyrics, no melody.**
- Each entry is bridged to a jazz concept, e.g. I–vi–IV–V → I–vi–ii–V.
- **`k-pop` grows to about 15 levels:**
  - inversions for smooth changes;
  - slash chords and pedal bass;
  - add9 / sus;
  - ballad arpeggiation;
  - "4 chords in every key";
  - Nashville numbers;
  - playing from a chart against the original.
- **The guitar version:** capo, open-string colours, DADGAD.

### 11.2 Voice (AP #7)
- **Registration:**
  - a guided family with SOVT warm-ups (straw, lip trill);
  - measurable proxies: pitch steadiness across the passaggio, and a register-break detector (a spectral-slope or level jump);
  - name-only coaching where nothing is measurable;
  - the framework terms are checked with a voice teacher before release.
- **Vowels:** hold a pitch while changing the vowel, with no pitch or level change (measurable).
- **Text and interpretation**, with US-PD lyrics (§8.1):
  - mark the breaths;
  - sing with the planned breaths;
  - phrase-end release timing;
  - back-phrasing, measured as the onset offset.
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
- **The coach sometimes lets the player choose the strategy**, about once a week. The choice ("slow" / "chunk" / "vary tempo") is then applied, and its effect on the next cold take is shown.
- **A self-rating step before feedback** is §7.

### 11.4 Composition (AP #11)
- **Contrafact capstone:** write a head over a chart's changes (a PD tune or the blues) in the staff input, then play it.
  - Graded with the lick checker: chord tones on strong beats, and the rule cards.
  - Saved to "My recordings".
- **Write a 12-bar blues head.**
- **Voice:** set a 4-bar phrase to words.
- **Trio arranging (`k-arrange`):** a chart road map (intro, head, solos, out-head, ending) used by keys, bass and drums together.

## 12. Teacher and ensemble (AP #12, AP §2.15)

### 12.1 Teacher rubrics
- A 4-point scale per quality the app can't measure: tone, phrasing, interpretation, registration.
- Each rubric is tied to the saved take.
- The student self-rates first, then sees the teacher's rating.

### 12.2 The teacher as the model
- **The flow:** the teacher records a phrase, the student imitates it, and the two are compared.
- It is a first-class assignment type on every instrument (Encore capture exists).

### 12.3 Async ensemble
- In a studio, one student's take (bass, or a sung melody) becomes the backing track for another's.
- This is the latency-safe way to "play with others".

## 13. Curriculum flow (AP §4, #15)
- **The bin families get the flow audit:** voicings, k-reharm, jazz, accomp, g-scales (curriculum-flow rule). Each is split into 2–3 coherent ladders, or given explicit cross-family prerequisites in place of in-family order.
- **A "use it" step for advanced theory topics:** each one (negative harmony, twelve-tone, neo-Riemannian…) gets at least one instrument or composition step, tagged.
- **A tune suggestion at each section boundary:** passing "developing" on an instrument course suggests one real tune, learned to the memory step. It is a suggestion, never a lock.

## 14. Expression (AP #14)
- **A style-interpretation brief** per period on PD pieces:
  - Baroque: detached 8ths, terraced dynamics;
  - Classical: slurred pairs, Alberti balance;
  - Romantic: rubato, pedal;
  - jazz: accented upbeats, ghosted notes.
- Graded by measurable proxies: articulation length and the dynamics contour.
- **Expressive-contour feedback:** the player's velocity and timing curve drawn over the model's, for ballads, PD pieces and voice phrases.
- **PD repertoire per instrument** (AP #13):
  - piano: Joplin, Satie, early Debussy, Burgmüller, Czerny, the Anna Magdalena notebook, Schumann Op. 68;
  - guitar: Sor, Carcassi, Giuliani;
  - voice: Vaccai, Concone;
  - bass: Simandl, Bach.
- **Each piece:** published ≤ 1930, generated from verified notes. Never a scan of a modern edition.

## 15. Integration (every item above)
- **SP §18 applies:**
  - everything connects;
  - path glyphs;
  - rubato-then-tempo;
  - timing cue;
  - one screen;
  - i18n;
  - teacher assignable;
  - hands-free (§7 is the one optional exception);
  - only verified theory;
  - all 12 keys where it applies;
  - guitar/bass parity;
  - small hands;
  - no movable do.
- **Course change checklist:** openers, unit openers, skill map, the level test per area.
- **No locks.** No change notices before real users.

## 16. Order of work
1. §1.1–§1.5 and §1.7 (phase A level, cold flags, Elo fix, Ear level), built with SP step 1 (cold takes, pass rule). Guard tests for every warm-peak reader.
2. §2 quick fixes and §3 reward re-base, including the Q6 simulation.
3. SP §2 rotation (and the rest of SP in its own order).
4. §4 retention (technique lapses, Ear E1, games/voice/pieces).
5. §8: heads (owner verifies), learn-a-tune, capstones, accompanying a singer.
6. §5 need model and planner retirement; §6 goals and plateaus.
7. §10–§11: lab, transcription, story ladder, pop library, voice, how to practise, composition.
8. §12–§14: teacher rubrics, ensemble, flow audit, expression, PD repertoire.
9. §1.3 phase B, §1.6, §7, §9 validation steps as their data arrives.

Each step gets:
- simulations;
- an independent build review;
- the §15 checklist.

---

## 17. Re-audit round 1 → v2: binding amendments

These override any earlier text they contradict. The re-audits are pedagogy (RP) and measurement (RM), 2026-11-27.

### 17.1 Measurement blockers
- **B1: content tier.**
  - A new `contentTier` field (0–8, the app's T scale) on `LevelDef`.
    - Seeded from `LadderRung.min` (keyIndex.ts) and the SP §14 entry bands.
    - Hand-set for families neither covers. A guard test fails on any level without one.
  - `tierBounds` (tempo) is the **band**, never the content tier.
  - **Ordering** is lexicographic: content tier first, then the tempo band. Voice is item level → cents band → timing band. Rhythm is subdivision → SD band. Reading is complexity score → tempo.
  - **Reading complexity** = a weighted sum of subdivision level, accidentals, ledger lines, density and key distance. The weights are fitted later; equal weights to start.
- **B2: phase A on passed items, with misses counted.**
  - **Tier evidence** = items with `passedAt` (SP §4.2) at that content tier.
  - **Confirmation:**
    - over the last ≤ 6 cold takes of those items, at ≥ 0.95 × their target;
    - ≥ 2 clean, and a clean share ≥ 2/3;
    - in ≥ 2 keys where keys apply (`playerTier`'s breadth).
  - **Not enough:** a clean take at an item's start tempo never counts toward level.
  - **k-of-n:** 2-of-≤6 at ≥ 2/3 is provisional. It is tuned in the §9.1 harness to < 5 % false promotion.
  - **Exclusions:** ~feel, burst, link and challenge takes never count.
  - **The level test** places a learner as "placed, to confirm" until the confirmation is met.
- **B3: the Ear course skill set.**
  - **`EAR_COURSE_SKILLS`** = EAR_SKILLS + theory, notes, rhythm-reading, transpose.
  - **Drill and lick events never write these skills.** Their secondary tags (`secondTag`: timing, meter, chords, cadences, form, dictation, rhythm-dictation) go to instrument sub-skills instead (e.g. `instrument/timing`).
  - **Guard tests:**
    - a drill take changes no Ear course skill, no Ear Index and no Ear path frontier;
    - theory and exam-prep evidence still moves the Ear level.
  - SPEC-EAR-INTELLIGENCE governs the Ear level itself (§1 applies to the instrument areas).
- **B4: the cold staircase.**
  - The cold-check tempo moves from the **previous cold result**, never from the warm best.
    - Clean cold → next cold +1 mark.
    - Miss → −1 mark.
    - Capped at the item's over cap (SP §2.5).
  - **Floor for passing:** a cold take below 0.95 × target can't pass (SP §4.2 unchanged).
  - **What reads the cold staircase tempo:** Momentum "cold rise", the cold "record", SP G and R, the plateau measure (§6.2) and phase B.
  - **A passed item** keeps a cold staircase above its target through maintenance reviews. That gives a continuous cold measure.
  - SP §2.5's cold check tempo is replaced by this for every item that has a previous cold result. The first cold check of an item uses SP §2.5.

### 17.2 Measurement majors
- **M1: decay.** Level never falls from inactivity, consistent with promotion-not-full-bars and SP "passed stays passed".
  - Inactivity shows "refresh" and a wider range, and the planner runs a probe.
  - A failed cold check of the level tier also only marks "refresh". The level drops one tier only after the tier's confirmation fails twice in a row on 2 days (B2's rule run downward).
  - *(Owner question, my default as written.)*
- **M2: one tier function.**
  - `areaTier(area)` replaces `playerTier`, SP A8 and the §1 level. It returns the §1 level, plus placement until confirmed.
  - **Timing tolerances** keep reading the tier: from the confirmed level, else placement.
- **M3: aggregation.**
  - **Technique rank** = the 2nd-best instrument area level, so one narrow area can't carry it. With one area only, that area.
  - **Course DYN pp…ff** = the same value mapped T0–T8 → pp…fff.
  - **Friend level** = the course DYN.
  - **"Bar to next"** = cold confirmations collected toward the next tier (e.g. "2 of 3"). It is never a full bar below Master.
- **M4: event fields.** `RatingEvent` gains:
  - `item` (item or contrast id);
  - `src` (input);
  - `cold` (written at creation; refolds keep it).

  These are synced fields. **No users yet, so a fresh-start epoch** (memory: fresh-start-round) is the migration. It is done once, when §1 ships.
- **M5: one rated event per item per 1-hour cold window.** It is not per session, because a restart can't create a new window.
- **M6: need.**
  - The workout2 shares stay as **quotas** (new / strengthen / review).
  - **Inside a quota,** need = a weighted sum of normalised components (distance, forgetting, goal, readiness). The weights are 0.4 / 0.3 / 0.2 / 0.1 to start.
  - **New items** are ranked by goal + readiness only, so a new item can always be chosen.
  - **It absorbs** SP `back2` and the refresh probe.
  - **The rotation set** fills in need order.
  - **`recommend.ts`:** only `recommendFor` folds in. TOPICS, `placementUnlocks`, `topicProgress` and `modesLevelFor` stay.
  - **One "next" across screens:** Today, Path and Practice show the same top item when they show one.
- **M7: input.** The level shown is the **current input's** series. Another input's higher level is a note ("ff on MIDI").
  - **Mic learners:** dynamics, pedal and release strands are excluded from their level and labelled "needs MIDI". They are never counted as missing.
- **M8: plateau measure.** §6.2's slope is on the B4 cold staircase tempo (continuous), not on tiers. Passed items count through their maintenance staircase. Fixed-tempo items use the accuracy rate instead.
- **M9: the plateau replaces `plateau.ts` only.** The coach's in-session limit and 3-day cooldown (SP §5) stay. Precedence: the in-session limit → the cooldown → the cold plateau escalation.

### 17.3 Measurement: the rest
- **Cold readers added:**
  - path technique ✓ needs a later-day cold confirmation before the strengthen pool treats it as acquired;
  - the stretch tierUp/tierDown read `areaTier`;
  - the end-screen graph is labelled "today's best", and the SP §4.3 cold line is shown first;
  - Momentum `statusUps` and `rating` read cold;
  - the AI coach, the weekly profile and the teacher digest get the cold series.
- **Elo units:**
  - difficulty = 600 + 100 × contentTier + 40 × (band − contentTier), clamped to ±2 bands;
  - old events are refolded under the fresh-start epoch (M4).
- **Q4 location:** the plan bonus is a Momentum `BONUS_XP` entry (+15 per completed planned rotation and its cold checks, once a day).
- **Q6** also fails a player who out-earns real practice with cold checks only. Momentum is included.
- **Lapses:**
  - `cellDue` replays the cell's `cold[]` entries;
  - a cell's grade is its HT item's grade (RH/LH are lead-ins);
  - **the lapse visual is distinct from stale:** a small "refresh" mark, not silver.
- **Signals that now feed need:**
  - weekly profile patterns: a recurring pattern adds to the goal weight of matching items;
  - teacher rubric scores: a low score adds to the goal weight;
  - per-input jitter: it widens timing thresholds by the measured noise only (SPEC-PRACTICE-INTELLIGENCE §9א);
  - Momentum slowdowns: a line to the AI weekly plan.
- **The self-comparison line** (SP §17.5) runs in every area, at most weekly.
- **One break table:**

| Break | Effect |
|---|---|
| ≥ 7 days | re-entry session (§5) |
| > 10 days | rate speed-ups paused |
| > 21 days | rate multipliers halfway back |

- **§9.2's reliability gate** exempts phase A, which is a transparent count rule shown as such. It gates phase B, the rates and any model number.
- **Shadow learning rates** for Ear, rhythm and voice (A/G/R, with their cold definitions §1.2) are logged from step 1 and never act until §9 validates them.
- **Transfer index** = clean share of first takes in an untried key, or on a new item of an acquired family, at the item's start tempo, over the last 10 such takes.
- **Self-prediction input:** a MIDI key (low = no, high = yes) or a voice "yes/no" works as well as the tap, to stay hands-free. It also feeds the Ear rating as "ear question about your own take".
- **A goal tune is complete** when learn-a-tune step 7 (from memory) passes cold.
- **The projection** uses the prior rate (SP §17.2) until G is estimated.
- **SP §15.4 edit:** "no new cold best" becomes "no new clean session peak in 3 sessions on ≥ 2 days" (matching SP A9).

### 17.4 Pedagogy fixes (RP)
- **Region (RP #1):**
  - `heads.ts` entries carry `tier` (1A worldwide / 1B US-only) and `pdWorldwideFrom`.
  - **Unknown region → deny for 1B** (STANDARDS_LEGAL's US allow-list). 1A heads serve everywhere.
  - **A verify / preview mode** lets the owner see 1B heads from Israel while checking them.
  - Before charging money, a lawyer question on the rule of the shorter term.
  - **Content:** only the ≤ 1930 print's content is served, with its print year and publisher recorded. Later verses and later lyrics are left out.
  - **A lyric curation pass** removes period lyrics that are offensive today.
- **Beginner heads (RP #5),** to check, from 1A where possible:
  - Memphis Blues, St. Louis Blues, Royal Garden Blues;
  - When the Saints, Bill Bailey;
  - Ain't She Sweet, Five Foot Two, Dinah, Sweet Sue;
  - Bye Bye Blackbird, Blue Skies, Muskrat Ramble.

  Mood Indigo (1930/31) is checked for its print year.
- **Each head stores** an "as printed" melody, a jazz chart, and a reconciliation note. Swing comes from the feel layer (SP §16), not from rewriting the melody.
- **Learn a tune (RP #4):**
  - step 1 = the YouTube embed (H3) first, then the app's clean version;
  - step 7 (from memory) is graded **cold, ≥ 8 h** after step 6;
  - voice: "2 more keys" becomes **"find your key"** from voiceRange, then one more key;
  - the score shows in **4–8-bar windows** with the playhead (one screen);
  - sung steps use a neutral syllable, degree numbers or letters (no movable do).
  - **Drums:** sing the head while keeping time, then kicks and set-ups from the head, then trading 4s inside the form.
  - **Revisits:** a learned tune returns via piece FSRS (§4.3) with a new layer each time: reharm, solo, arrangement. This is the repertoire spiral.
- **Contrafact pairs** add Scrapple from the Apple ↔ Honeysuckle Rose and Dig ↔ Sweet Georgia Brown.
- **Accompanying (RP #2):**
  - **Rubato (§8.4 L4) comes only from human takes:** teacher recordings, calibration-account takes, or a voice student's take via §12.3. Never an algorithmic rubato curve (no-claude-composed-music; the humanize layer was rejected).
  - **Grading:** chord onsets against the singer's **beat map**, not the melody onsets. Comp velocity is graded below the melody. Register overlap stays.
- **Listening lab (RP #6):**
  - **A prerequisite:** an owner or teacher **annotation tool** that marks form, choruses and changes on an embed's timeline.
  - Start with one recording per path theme.
  - **Removed or region-blocked videos** fall back to the next annotated recording.
  - **Official channels only** (artist, label, YouTube "Topic"), with the channel id stored.
  - Loop and slow via the IFrame API's seekTo and setPlaybackRate. No audio extraction.
  - **A listening canon** per instrument and era, using US-PD sides where verified: Armstrong Hot Five (Nov 1925), King Oliver 1923, Jelly Roll Morton 1923–24, James P. Johnson (to check).
- **Chart policy (RP #6):**
  - Every chart, the 120 and the pop ones, has a **source and a human verifier**, like heads.
  - Chord charts are not copied from fake books or chord sites.
  - **No Israeli copyrighted songs** until ACUM is asked whether it claims chord charts.
  - **A verify screen** shows the source scan beside the engraving.
  - The verification time is budgeted in §16 as an owner task.
- **Pop charts** show a bar grid with sections synced to the embed. `k-pop` adds comping patterns and anticipations.
- **Grading measures (RP #3):**
  - **Vowels:** pitch steadiness and transition smoothness; level tolerance per vowel (no "no level change").
  - **Register break:** pitch discontinuity + level dip, **hint-only** until validated against teacher labels. Belting is teacher-assigned only.
  - **Back-phrasing:** a low SD of the lag + landing on the phrase target, never lateness itself.
  - **Story arc:** "a clear peak in the last third, then a release". Descriptive feedback, not pass/fail, until teacher agreement (§9.4).
  - **Composition:** the line is played in (phrase studio) and notated automatically, 8 bars per screen. Feedback, not pass/fail, on guide tones, repetition/form, rhythm and range. Models from teachers or PD only.
  - **Async layering (§12.3):** the first take has a click and a calibrated round trip; later takes are graded against the first take's beat map.
  - **Expression (§14):** a style brief is "a common starting choice", graded on the instruction given. Articulation and pedal grading are MIDI only. Model curves come from human takes only.
- **§11.3 strategy choice** uses the §7 slot (no extra tap). Its effect is shown aggregated over ≥ 5 uses. The strategy is also taught just in time at a detected error.
- **Capstones and the tune suggestion** are explicitly **skippable** (no locks).
- **The §8.2 reference** "§10.1" reads §10.3.

### 17.5 Areas the first draft left out (RP)
- **Drums:**
  - **balance:** ride above snare comping, kick under the bass, by per-pad velocity ratios;
  - **supporting a soloist:** density follows the soloist, using the lick bank's lines (PD or teacher), never Claude-composed;
  - **melodic soloing:** a motif on the toms, developed and returned, using the `improvPhrasing` analysis;
  - **a tuning brief** (not graded);
  - drums join §8.2 (above) and §8.5 (their idiom: form-keeping, set-ups).
- **Games:**
  - **Contour Draw:** fills the open beginner Ear gap (beginner-game-gap memory); trace a tune's shape;
  - **First-phrase recall:** title → play the first 4 bars of a learned head;
  - **Groove Match:** drums, copy a 2-bar groove, scored per limb;
  - **a pitch-steered line game** for voice, in the serious visual style.
- **Reading:**
  - **a jazz reading ladder:** written 8ths played straight vs swung; articulation marks; big-band kicks and set-ups;
  - **a gig sight-read capstone:** lead sheet + road map;
  - **a transposing-instruments ladder.**
- **Rhythm:** deliberately behind or ahead of the beat on keys and guitar comping (b-swing levels 2–3 copied). The swing band (SP §16.9) applies app-wide, not only on key-session lines.
- **Ear:**
  - **line-implication ear:** name the chord a line implies;
  - **a "tunes you know" bank** (recall a head's first phrase and its starting degree from the title);
  - **dictation of 2-bar slices of served heads;**
  - **ballad / rubato harmonic rhythm;**
  - EAR v2's songs-by-ear and sight-singing draw from served heads.
- **Voice:**
  - diction and consonant timing on the beat;
  - a mic technique brief + a proximity/dynamics exercise;
  - English-diction help for Hebrew-first singers, with a teacher or human audio model.
- **Performance ritual:** announce → one take, no restarts → listen back with one question (time / sound / shape) → self-rate → compare with the teacher.
- **An ensemble-roles unit:** bass = harmony and time, drums = form, comping = space. Role-swap listening.
- **Responsive comping:** comping behind a soloist that answers phrase ends.
- **Free improvisation:** 3 levels graded by variety metrics (dynamics/register only, a texture call-and-response, a rhythm-only solo).
- **Post-bop:** 3 tune-based levels (chords only).
- **Lesson-plan templates:** a learn-a-tune week, a transcription week.
- **Tune of the week in the key of the week** (RP N1): a served head in the SP key of the week, or a transposition.
- **The level test and skill map get a tune section per course:** a head slice from memory, and a chart at sight.
- **The §6.1 goal example** becomes a served tune (e.g. "Body and Soul by June"). Autumn Leaves (1945) can't be served as a melody.

### 17.6 Order of work, amended
- **Step 1 adds:**
  - B1–B4, M2, M4 (fresh-start epoch), M5, M7;
  - the Ear guard tests.
- **Step 2 adds:** Q4 at its new location, and Q6 with Momentum.
- **Step 5 starts with:**
  - the verify screen;
  - the annotation tool;
  - the chart/head policy;
  - the owner's verification time budgeted as an owner task.
- **Step 7 adds:** the drums, games, reading, rhythm, ear and voice items of §17.5.
- **Done when:** an independent spec-only round finds no new blocker in this spec (and the SP §15.4 edit) before step 1 starts.

### 17.7 Owner 2026-11-27: the pop library is global and jazz-adjacent
- **The pop chord library (§11.1) is not Israeli-focused.**
  - The app is now multilingual, so the library draws from **global top-chart pop** that is harmonically rich and jazz-adjacent: songs with extended chords, ii–V motion, modal interchange and sophisticated grooves.
  - Examples of the kind of artists, to be curated: Stevie Wonder, Steely Dan, Burt Bacharach, Michael Jackson / Quincy Jones productions, Earth Wind & Fire, Jamiroquai, Norah Jones, John Mayer, Bruno Mars, Jacob Collier.
- **The legal pattern stays:**
  - chords only, with no lyrics and no melody;
  - an official-channel embed;
  - a source and a human verifier for every chart.
- **Each entry names the jazz concept it bridges to.** Examples: the ii–V in "Just the Way You Are", modal interchange in Stevie Wonder.
- **The ACUM note no longer blocks anything**, because there are no Israeli songs. The same "do collecting societies claim chord charts" question is asked once, generally, before charging.

---

## 18. Re-audit round 2 → v3: binding amendments

They override §1–§17 where they differ. The sources are the round 2 pedagogy re-audit (RP2) and the round 2 measurement re-audit (RM2).

### 18.1 The cold staircase, reworked (RM2 C1)
- **Unpassed items:** the cold tempo = max(staircase, round(0.95 × target)) once `cleanBpm` ≥ 0.95 × target. That branch is the pass probe, and it stays.
- **The rule is 2-up-1-down** (Levitt), which tracks ≈ 70.7 % ≈ p*.
  - 2 consecutive clean cold takes → +1 step.
  - 1 miss → −1 step.
  - Steps are 2 marks until the first reversal, then 1 mark.
  - The step size is re-fit later from the trace SD of the cold tempo.
- **Above target (passed items, anchors only):**
  - **The cold cap** = min(the item cap from SP §15.3, 1.25 × target). It is never the warm session `limit`.
  - **Non-anchor passed items** stop at target. They are excluded from the plateau measure.
  - **A miss above target is censored:** no FSRS lapse, no confirmation miss, no drop. It only moves the staircase.
  - **FSRS maintenance grades only the take at ≤ target** (the review probe at 0.95–1.0 × target).
- **The threshold estimate** = the mean of the last 4 reversals, not the current position. G, R, the plateau and Momentum read this estimate.
  - SP A12 is amended: G reads the staircase threshold.
- **The key-session cold check** (SP §3, max(0.9 × best, 0.95 × target)) is replaced by the same staircase.
- **Fixed-tempo items have no staircase.** Their cold measure is accuracy (SP §15.2).

### 18.2 `areaTier` = {content, band} (RM2 C2)
- **`band`** is the tempo tier: the take's own nps tier, capped by the learner's confirmed band. These read band:
  - timing tolerances (`tierTiming`, analyze.ts:838);
  - SP §15.5 entry;
  - the beginner definition (A3);
  - stretch `tierUp` / `tierDown`.
- **`content`** is the §1 level. Level, rank, course DYN and friend level read content.
- The units never mix, so promotion and tolerance can't oscillate.

### 18.3 Phase A, sequential (RM2 B2, §2.4)
- **Promotion to a tier** needs a **sequential test** on the cold confirmations at that tier:
  - SPRT with p0 = 0.5, p1 = 0.85, α = 0.05, β = 0.2;
  - **and ≥ 2 days.**
- **Demotion** needs a clean share < 1/2 over ≥ 4 cold confirmations on ≥ 2 days, after the confirmation of that tier has failed twice (M1, owner 2026-11-27: a drop comes only from measurement, never from a break).
  - **This is hysteresis:** the bars for promotion and demotion differ.
- **§1.3's "last 60 days" clause is deleted.** Staleness shows "refresh" only.
- **The §9.1 harness is part of step 1.** It tunes the SPRT bounds to < 5 % false promotion under sequential looks, with a realistic prior over passed items.

### 18.4 Content tier, per option (RM2 B1)
- **`contentTier` lives on the spec / option** (`SpecTemplate`), not on `LevelDef`, because `LadderRung.min` varies per option (e.g. `b-scale-6` 1 or 3).
- **Scales and arpeggios:** content = their nps tier. Their content is the tempo, consistent with SP A8 ("scales: tempo").
- **The reading complexity features** are each normalised to 0–1 over the catalogue range before the weighted sum.

### 18.5 Ear evidence routing (RM2 B3)
- **The `*-ear` instrument families** (`k-ear`, `g-ear`, `b-ear`, `d-ear`: intervals, dictation, transpose, tonic) are **whitelisted** into the Ear course skills, weighted by trial difficulty. They are real ear evidence.
- **Other drill families' secondary tags** go to instrument sub-skills (§17.1 B3).
- **Self-prediction (§7)** feeds its own skill, `self-calibration`, never the Ear rating.
- **The guard test** becomes:
  - a non-`*-ear` drill take changes no Ear course skill;
  - a `k-ear` take does.
- **The Elo of Ear skills** still never decays; this is deferred explicitly to SPEC-EAR-INTELLIGENCE.

### 18.6 Aggregation and display (RM2 M3)
- **The areas per instrument:**
  - Piano: scales, arpeggios, independence/finger, harmony/voicing, line-jazz, reading.
  - Guitar: the same.
  - Bass: scales, arpeggios/chord tones, walking/groove, reading.
  - Drums: rudiments, coordination, grooves/styles, reading.
  - Voice: pitch, time, range/agility, harmony.
- **Rank** = the 2nd-best area's content level (one area only → that area).
- **T → DYN:**

| T | DYN |
|---|---|
| T0–1 | pp |
| T2 | p |
| T3 | mp |
| T4 | mf |
| T5–6 | f |
| T7–8 | ff |

  This keeps the 6 names that exist. *(Owner may adjust.)*
- **The bar to next** shows the SPRT's progress as a share: "confirmations toward the next tier", never "k of n". It is never full below Master.

### 18.7 Anti-gaming (RM2 §2.5)
- **Cold = ≥ 1 h since any sounding take of the item or of any item in its cell.** That covers RH, LH, slower, burst, challenge and coordination takes. It closes warm-up laundering.
  - `sessionMs` (minutes since the session start) is logged on every cold entry.
- **Promotion XP and Momentum "cold rise"** pay only above the **all-time high-water mark**. Dropping and re-promoting earns nothing.
- **Rank and friend level read the stricter calibrated input** when both exist. The current input's level shows for practice.
- **Q4 plan bonus:**
  - requires the session's planned length (`sessionBonus`);
  - `WEEKLY_LIMIT.plan = 7`;
  - its size is the smallest value that passes Q6.
- **Cross-device:** `lastQual` and the cold entries sync with timestamps. On merge, a second "cold" within 1 h of another device's qualifying take is downgraded to warm.
- **M5 scope:** the 1-hour one-event rule applies to instrument areas only. Ear trials keep per-trial events. Only cold events feed the instrument Elo.

### 18.8 The rest of RM2
- **The instrument Elo** is kept only as a smooth "practice form" signal on the item page. Nothing reads it for level.
  - Its difficulty = the item's content tier (scales: the nps tier) mapped 600 + 100·c. The RL +60 is kept.
  - The phrase formula is mapped onto the same scale.
  - The 100 and 40 coefficients are fitted by a logistic fit on the traces later.
- **Readiness is a gate** (prerequisites acquired, not resting), not a term in the need weights. The remaining weights are distance, forgetting and goal at 0.45 / 0.35 / 0.2.
  - **Unpassed items:** "forgetting" = time since the last qualifying take ÷ the R-by-gap curve. This carries `back2`.
  - **Components:** each is normalised to 0–1 over the candidate set.
- **A cell without an HT item** (one-hand levels, guitar, bass) is graded by its main item: the last spec.
- **Voice and rhythm** get a per-item cold store like `ItemState.cold`: `VoiceItemState.cold` and `RhythmItemState.cold`.
- **Quests and Momentum sources after the rerouting:**
  - the drum "rhythm 5×" quest counts drum takes, not rating events;
  - `GAIN_WEIGHT.rating` reads the §1 level's rises.
- **The level semantics state outright that tone, posture and tension are not measured.** They come only from teacher rubrics (§12.1).
- **Tendencies feed the next take:** a confirmed tendency (P1, ≥ 10 takes) chooses the next form in the rotation (e.g. rushing at the turn → a form that isolates the turn), within SP's rules.
- **Ear:** HOL §1.2's Ear cold rule defers to SPEC-EAR-INTELLIGENCE's own definition where they differ.

### 18.9 Real music, region-safe (RP2 #1, #2, #3)
- **1A first.** The core and beginner heads come from STANDARDS_LEGAL §2.1, public domain worldwide:
  - beginner: Bill Bailey, Ain't We Got Fun, Yes Sir That's My Baby, Somebody Stole My Gal, Nobody Knows You When You're Down and Out, spirituals, When the Saints;
  - core: Rose Room, Avalon, Japanese Sandman, Love Me or Leave Me, Mean to Me, My Blue Heaven, If I Could Be with You, King Porter Stomp, Charleston, Indiana.
  - Each must be confirmed 1A and verified.
- **1B (US-only)** is an additional layer on top for US users, e.g. Body and Soul, Star Dust, I Got Rhythm.
- **A rule with a guard test:** every real-music feature draws from **the learner's region pool**. The features: learn-a-tune, capstones, tune of the week, head dictation, the level-test tune section, contrafact pairs and goals.
- **Examples use 1A tunes:**
  - the goal example: "My Blue Heaven by June";
  - the contrafact pairs are shown only where both sides can be served. Their chord charts (chords only) serve everywhere.
- **Denied regions keep "learn it by ear":** an embed, a chords-only chart, and a self or teacher check, with no melody served.
- **The lawyer question is widened** (before charging):
  - **songs whose composer died by 1955 but whose lyricist died later** (Tea for Two, Honeysuckle Rose, Ain't Misbehavin'): may a melody-only use serve them? The EU joins the two terms for songs with words, and Israel is unclear;
  - **US recordings become PD from their release date:** the Hot Five sides recorded in Nov 1925 but released in 1926 are PD only from 2027;
  - **a PD recording of a 1B composition** needs the same region gate.
- **Lyric curation applies to 1A songs too.**
- **H4 is still an open owner question.** The app-written heads, songbook originals, voice songs and lick bank are the region-safe filler. Until the owner answers, they stay in use as they are, and nothing new is composed. Each lick and original head records where it came from.

### 18.10 Pedagogy: the rest (RP2)
- **Back-phrasing:** a deliberately late start + the target note landing on time. Descriptive until validated against teacher labels.
- **Comp dynamics:** graded against the singer's phrase envelope, MIDI only.
- **Drums:** balance, Groove Match and singing while drumming are "needs MIDI". On an acoustic kit they get a self or teacher rating. Tom soloing is graded by motif matching on pad and rhythm.
- **No memorizable items:** head dictation, sight-singing and Contour Draw use heads the learner hasn't learned, as random slices, transposed.
  - **The level-test tune section** becomes an opt-in "tunes I know" pick, never "from memory" for new users.
- **The syllable rule** (neutral syllable / degree numbers / letters, no movable do) moves to §15, so it covers every sung step: transcription and sing-what-you-play included.
- **§8.1's "unknown region → US" is struck.**
- **Note:** Scrapple from the Apple uses the I Got Rhythm bridge. It is shown only where both of its sources can be served.
- **Pop library (§17.7):**
  - chord symbols at lead-sheet level only, with no voicings;
  - the riff guard (no signature riffs or bass lines) extends to pop: e.g. Superstition, Jamiroquai bass lines;
  - artists whose harmony itself is the work (Collier, Steely Dan) get extra care: few songs, chords only, and the lawyer question;
  - songs are named exactly, e.g. Billy Joel's "Just the Way You Are".
- **SP fit:**
  - tune of the week gets a share of the session: ~10 % of the technique block, capped at 5 minutes;
  - the app-wide swing band has tolerances per tier;
  - step 5 adds the official-channel embed registry and the 1A list;
  - **Contour Draw ships early,** in step 2, because it needs nothing else.
- **Fresh items:**
  - **PD lyrics in each of the 7 voice languages** (PD folk songs per language), and diction help for every non-native English singer;
  - **Ear capstones:** a short real-recording task per Ear unit (embed + annotation);
  - **jazz-bridge links,** each tagged: Joplin → stride (`accomp`, `k-nola`), Debussy and Satie → planing and constant structure (`k-reharm`, `planing`);
  - **a ballad capstone on a 1A ballad;**
  - **the performance ritual resumes after a reload** (never-lose-progress), and does not count as a restart;
  - **post-bop prerequisites:** modal and slash-chord families;
  - **the transposing-instruments ladder is deferred** until a horn audience exists;
  - **learn-a-tune step 7** (≥ 8 h later) creates a **pending memory check** that shows on Today and resumes there.

### 18.11 Order of work, amended again
- **Step 1:**
  - cold takes with the §18.7 gap;
  - the §18.1 staircase;
  - §18.2 `areaTier`;
  - §18.3 SPRT and its harness;
  - §18.4 content per option;
  - §18.5 Ear routing and guard tests;
  - the M4 events;
  - the fresh-start epoch.
- **Step 2:** the quick fixes, with the §18.7 reward limits and Contour Draw.
- **Step 5 starts with:**
  - the 1A list and its verification;
  - the region pool + guard test;
  - the embed registry;
  - the annotation tool;
  - the verify screen.

### 18.12 H4 answered (owner 2026-11-27)
- **Songbook:** the existing traditional or classical songs are public domain (checked: Happy Birthday has been PD since the 2016 ruling, and the rest are traditional or pre-1900). The 7 originals are OK.
- **Voice-course songs:** app-written diatonic, tonal practice melodies built to train one vocal element are OK, and new ones may be written for that purpose.
- **Rule-generated licks:** OK, because the owner gave the rules. Any lick whose rule origin is unclear is flagged for the owner.
- **Still not allowed:** Claude-composed music as demos, backing tracks or an "AI band" (no-claude-composed-music).
- These items serve every region as the region-safe pool, alongside the 1A heads.

---

## 19. Round 3 (fresh independent reviewers) → v4: binding amendments

### 19.1 Measurement
- **Phase A promotion test (fixes the restart problem).**
  - A cumulative log-likelihood ratio over a **sliding window of the last 12 cold confirmations** at the candidate tier. It is floored at the lower bound and never restarted.
  - Promote when the upper bound is crossed **and ≥ 2 days** are in the window.
  - **The false-promotion target is defined over an indifference zone:** < 5 % for true p ≤ 0.55 over a 6-month horizon of looks, averaged over the harness's prior. It does not cover learners just below p* (0.55 < p < 0.7), which no finite test can promise.
  - This replaces §17.1 B2's "last ≤ 6" window.
- **The confirmations are not selected on success.** They are every cold take at ≥ 0.95 × target on any item of that content tier, passed or not, **excluding each item's own passing take**.
- **Entry gate (fixes the stall at band edges):**
  - item entry content tier ≤ `areaTier.content + 1` (the candidate tier), with prerequisites `established` (below);
  - **"Confirmed band"** = the tempo tier of the area's confirmed scale benchmark. It is used only for timing tolerances, the beginner definition and stretch. Harmony and other fixed-tempo areas are never gated by tempo;
  - **a harness test:** a steadily improving simulated learner climbs from T0 to T5 on rotation alone.
- **Threshold estimation is separated from tempo choice:**
  - the staircase only **chooses** the cold tempo;
  - the **estimate** is a maximum-likelihood logistic fit over all cold trials from the last 30 days, at their actual tempos;
  - before 6 trials, the readers (G, R, the plateau, Momentum) use the highest clean cold tempo, labelled provisional;
  - after a pass-probe take, the staircase resets to the tempo actually played;
  - the first 2 reversals are discarded.
- **FSRS vs staircase:**
  - on an FSRS-due day, an item's cold take is the review probe at 0.95–1.0 × target, and it is graded into FSRS;
  - the above-target staircase take is the next cold take on another day. It counts as a confirmation only when clean;
  - §17.1 B4's sentence "keeps a cold staircase above its target through maintenance reviews" is deleted.
- **Rank stays sticky:**
  - rank, course DYN and friend level read the **high-water confirmed tier**, which never falls;
  - the current cold level shows separately as **"current form"**. It can show refresh, or a lower tier after demotion;
  - so rank = hardest items beaten holds.
  - **Re-entry window:** the first 3 practice days after a break of ≥ 7 days, or until the first FSRS-good review. Cold takes in that window never count toward demotion, though they still mark refresh. A break never causes a drop (owner).
- **Evidence for areas without `passedAt`:**
  - **reading:** cold sight takes per complexity tier. A tier "passes" after 3 clean first-sight takes on ≥ 2 days. The test above runs on sight takes;
  - **voice and rhythm:** each item level × band cell has a sticky pass. A new store `cellPass` (synced, under the fresh-start epoch) holds `{passedAt, cold[]}` for voice and rhythm cells;
  - **games:** excluded from Phase A. They are practice only (they may feed need).
  - The voice and rhythm stores named in §18.8 are defined here as `cellPass`.
- **`acquired` vs `established`:**
  - `acquired` (warm, D1) moves an item from blocked to the rotation;
  - **`established`** (a clean cold take on a later day than acquisition) gates prerequisites, need readiness and the strengthen pool;
  - SP §14/§15.5 prerequisites read `established`.
- **The gap timestamp:** a per-cell `lastSound` (any sounding take) defines coldness (§18.7). SP §4.1 and §3 are amended to read `lastSound`; `lastQual` remains for the ≥ 1 h re-measure rule.
- **Only the first cold take in a session counts toward level.** Later cold takes in that session (neighbouring cells warm the hands) count only toward FSRS and the staircase. `sessionMs` is a Phase B covariate.
- **The input rule:** level and rank read the **current input's** series. Another input's higher level is a note. "Stricter calibrated" in §18.7 is struck.
- **Voice cold:** per item, after ≥ 1 h (the `cellPass` store). The per-session "first 3 sung items" rule in §1.2 is struck.
- **SP §17.3's "cold-check tempo, 0.9 × best" row is deleted.** R drives the staircase step size instead (0.5–1.5 marks).
- **Stale text is superseded:** §1.1's technique row ("tierBounds × band"), §1.3's 60-day clause, §5's product formula, §17.4's beginner-heads list and §8.1's region default. The consolidated spec (§20) removes them.

### 19.2 Pedagogy
- **Contour Draw in step 2** uses generated 4–6-note contours from the existing Ear melody generator. That is random stimulus generation, not composition. Head slices join in step 5.
- **Learn-a-tune per band:**

| Band | Steps |
|---|---|
| 1 | listen (embed) → sing → melody → roots → melody + LH roots (bass: roots on 1) → triads → memory (cold) |
| 2+ | the full §8.2 protocol, with guide tones and shells gated on the k-sharm 7ths / shell families (guitar g-shells; bass walking) |

  - A step whose prerequisite isn't `established` is skipped, never locked.
  - **Goal completion** = the memory step of the learner's band variant.
  - **A by-ear mode** is offered everywhere: embed → sing → find → play, with the score hidden. It is not only the denied-region fallback.
- **The human model bank** is an owner production task in steps 5 and 7: recordings of 1A heads by real singers and players, several rubato and dynamic renditions each, with performer releases.
  - **Until the bank exists,** each level that depends on it is labelled "teacher or recording needed". Those levels:
    - accompaniment L4;
    - comp dynamics against the singer;
    - expression model curves;
    - diction models;
    - drum "supporting a soloist" (PD lines, or rule-generated licks per H4 §18.12, which is allowed).
  - **Such a level** is skippable, never a gap in the bar to next, and never sampled by the level test.
- **The region gate belongs to the content:**
  - every served melody, lyric and recording carries a tier;
  - `servable(content, region)` is the only path to playback or display;
  - the guard test walks every content consumer, including lyrics (§11.2), First-phrase recall, "tunes you know", EAR v2 songs-by-ear and sight-singing, recordings of 1B compositions, and per-language folk songs;
  - **"folk/trad" entries** get the same print-year and author check as heads (e.g. the Hava Nagila lyric credit);
  - **the region signal** = the stricter of account country and store/IP country. Unknown → 1A only.
- **No memorizable Ear evidence:**
  - head-slice dictation and "tunes you know" write to a **`repertoire-memory`** skill, never the Ear course skills;
  - head dictation is capped at 20 % of dictation trials. Generated items are the measured core;
  - when the learner's unlearned-head pool is < 5, head-slice items step aside;
  - **"tunes you know" becomes audiation:** sing or play the first phrase, graded by pitch.
- **Physical approach and injury prevention:**
  - **a short brief per instrument,** shown once: posture, relaxed release, and a stop-on-pain rule;
  - **a refresher** on the first burst and leap visits;
  - **a 1-minute release break** is offered after ~25 minutes of continuous technique in a time-first session (hands-free: it starts by itself, and any note resumes);
  - **a drums hearing card** for acoustic kits;
  - all of these are briefs, not grading.
- **The minor items, adopted:**
  - **YouTube:** a visible player of at least 200×200 that fits one phone screen, youtube-nocookie with click-to-load, and 78-rpm transfers for pre-1925 recordings;
  - **lawyer list:** adds Mexico and other long-term countries;
  - **"harmony is the work" care** extends to post-bop and Shorter charts;
  - **capstone mapping:** a table per unit and theme in the path content, written with the capstones;
  - **level-based voice proxies** need AGC off and per-device relative levels;
  - **comp dynamics** are mapped through the synth's rendered loudness.

### 19.3 Order of work, amended
- **Step 1 adds:**
  - the sliding-window test and its harness (indifference-zone target, lifetime horizon);
  - the ML threshold estimate;
  - `lastSound`;
  - `cellPass`;
  - `established`;
  - the content-based entry gate and the climb test;
  - high-water rank and current form;
  - the re-entry window.
- **Step 2 adds:** Contour Draw (generated) and the physical-approach briefs.
- **Step 5 adds:**
  - `servable()` and its guard test;
  - the human model bank (owner task);
  - the folk-song checks.

## 20. Consolidation
- Before the next independent round, this spec is **rewritten as one consolidated document** (v5). §17–§19 are merged into the body, superseded text is removed, and the amendment layers are gone.
- No rule changes in the rewrite. A diff check confirms every binding rule survives.

# Review of RESEARCH-TOP-TIERS.md, round 1 (2026-11-28)

**Verdict: NOT CLEAN.**

The §1 counts are right. I re-ran `realCatalogues()` on this branch and every cell of the §1 table matches. The bass harness figures in §3.2 match docs/MEASURE-SIM-REPORT.txt:82–97. The tierBounds, BENCH_NPS, SPEED_NPS and EXAM_NPS values quoted are correct. But the plan was not revised after the owner's decisions. Several of its T7–T8 items are hidden, missing, or mis-tiered under the rules it adopts. A builder following it would ship wrong tempos on guitar and bass, an unverified Harris level, empty voice and drum tiers, and a tempo ladder on voicings.

---

## Substantive issues

### 1. The plan still uses the shared speed scale that the owner rejected in Q2
- **Evidence.** Owner Q2 (l. 218): "no shared speed scale … guitar and bass by their own grade syllabi". The body still applies the shared scale:
  - §2.1 table (l. 61–69);
  - §2.4 guitar scales: "Shared nps bounds: T7 = 16ths ♩=88" (l. 100);
  - §2.5 bass: "Fingerstyle 16ths ♩=88 (T7), ♩=105 (T8)" (l. 112);
  - the Q2 recommendation itself (l. 204).
- **What the syllabi say:**
  - RSL Bass Grade 8 (2012 syllabus): scales and arpeggios at 100 bpm in **8ths**, i.e. 3.3 n/s. Grade 5 is 80 bpm in 8ths. That is about half the plan's bass T7 (5.9 n/s).
  - ABRSM guitar Grade 8 is about 4.8 n/s (SPEC-GUITAR-TECHNIQUE.md:306).
  - RSL electric guitar Grade 6–8 scales are at 100 bpm. The note value is not verified.
  - Under Q2, `g-speed-1` (16ths ♩96 = 6.4 n/s at the *start*, guitarTop) is far above guitar T8. It is not a "T7–T8 rung".
- **Code impact the plan omits.** `tierOfNps` (tierBounds.ts BOUNDS), `BENCH_NPS` / `SPEED_NPS` (stages.ts:68–70) and `EXAM_NPS` (generate.ts:5469) are piano-only, single tables. Q2 needs a per-instrument table or a per-instrument factor in all four. The decision also re-bands guitar and bass **T0–T6**, not only the top. That changes the §3 bass T0/T1 analysis, which was tiered on the piano scale.
- **Fix:**
  - Add a per-instrument band table: guitar from ABRSM, RSL and LCM grades 1–8 plus a diploma level (RSL / LCM DipLCM) for T8; bass from RSL and LCM bass grades plus a diploma level.
  - Re-tier the guitar and bass rungs against it.
  - Add the four code tables to §4.
  - Re-run the §3 harness check on the new bands.
  - Rewrite the Q2 row to match the decision.

### 2. Q1 (scale-equivalent arpeggios) is applied with piano factors on every instrument
- **Evidence.**
  - The 0.78 / 0.63 / 0.87 factors come from RCM piano ratios (RESEARCH-KEY-EXERCISES-AUDIT §4.1).
  - RSL bass uses the same tempo for scales and arpeggios at Grades 6–8 (100 bpm, 8ths), so the bass ratio is about 1.0.
  - The owner's Q1 wording (l. 217) names only "/ 0.78", but the plan also uses ÷ 0.63 (octaves) and ÷ 0.87 (hands a 3rd apart).
- **Fix:**
  - State a factor per material **per instrument**, sourced from that instrument's syllabus (Q2 requires this).
  - Confirm with the owner that octaves use 0.63 and hands a 3rd / 6th apart use 0.87, since the decision text says 0.78 only.

### 3. A hidden, not-pursued Harris level is listed as guitar T7 content
- **Evidence.** §2.4 line-jazz T7 lists "`g-harrisline-9` (grade 10)" (l. 104). In code, `g-harrisline-9` is "Compose a line over a move, then in a tune" (`hl-compose`, grade 9; harrisLineDrills.ts:752–762). It is hidden as **notPursued** (verifiedContent.ts `bh-compose`; BARRY-HARRIS-THEORY §12: "Compose a line: it duplicates the app's rule-based improv"). It is absent from the gated catalogue. This also contradicts the plan's own "Not in the plan" line (l. 214).
- **Result.** Guitar T7 line-jazz falls to 3 items (`g-harrisline-7`, `g-fusion-3`, `g-fusion-4`). That is the floor, below the owner's "aim ≥ 4".
- **Fix:** remove it and add a shown item. Candidates: `g-tpair-6` / `-7`, or the shown `g-harrisline` rows played at a tempo band.

### 4. Bass line-jazz T8 holds one exercise, and the bass "lines area" does not exist
- **Evidence:**
  - Q6 decision (l. 222): "Harris lines at bebop tempo as a bass T8 item in the lines area".
  - The §2.5 T8 line cell has only **new** `b-hlfast`, which is 1 exercise against a floor of 3.
  - SPEC-HOLISTIC-2 §1.10 (l. 327) gives bass no line area, and the plan's S1 maps bass F-block items to *scales*. The plan contradicts itself and the spec.
  - The harness's bass line-jazz rungs are `b-barry-1` / `-3`, yet `b-barry` is never mentioned. `b-barry-4` (the rule in a walk) and `b-barry-6` (a chorus of bebop lines, ♩120–200) are natural T6–T7 items.
  - "`b-harrisline` rule levels at swung ♩168–195" are not existing levels: `b-harrisline` runs at ♩60–120. They are new but not marked **new**.
  - `b-harrisline` 5 and 9 are hidden, but the plan cites "1–10" (l. 51).
- **Fix:**
  - Amend §1.10 (S1) to give bass a line area, or put Q6's item under scales and tell the owner.
  - Fill bass line T7 and T8 with ≥ 3–4 shown items: `b-barry-4` / `-6`, `b-tpair-3` / `-4` / `-5`, `b-harrisline` at a tempo band, and `b-hlfast` split into 2–3 levels (as `g-hlfast` 1–4 are).
  - Mark every new level as new.

### 5. The Q4 rating seed contradicts the hand-set tiers, and would empty T7 for voice and drums
- **Evidence.** The rule is G(g) = 700 + 90g (stageCPlacement.ts:5): grade 8 = 1420–1509 maps to T7, and ≥ 1510 maps to T8. Owner Q4 adopts it.
- **Piano harmony.** Against `K_HARM_DIFF` (harmLadder.ts:729), the plan's hand placements disagree with the seed for 6 of the 20 `k-sharm` levels:
  - `k-sharm-17` (1520) and `-18` (1600) are placed at T6; the seed gives T8;
  - `-36` (1460) and `-41` (1420) are placed at T6; the seed gives T7;
  - `-26` (1560) and `-32` (1700) are placed at T7; the seed gives T8.
- **The "about one tier" offset is not constant.** `k-sharm-11` (1230) seeds to T4 against ladder T1, three tiers. `k-sharm-3` (980) seeds to T2 against T0. `k-sharm-15` (1380) seeds to T6 against T5. So the ratings are not a calibrated tier scale.
- **Voice.** Every `VOICE_TOP_PLACEMENT` rating is ≥ G(8) + 280 = 1700, so all of it seeds to **T8** and voice T7 is **empty**. The code comment (stageCPlacement.ts:85–89) also says these include RSL G6–G8 material (dim / aug arpeggios, quick study, style studies), not only "grade 8 and beyond" as §2.6 claims.
- **Drums.** The seed puts `d-pas-1` buzz roll, `-2` triple-stroke roll and `-3` triple paradiddle (G8 + 0…50) at **T7**. These are early-grade PAS rudiments. The plan's own RSL grade-8 set (combined rolls `d-pas-6`, pataflafla `-7`, triple ratamacue `-11`) seeds to T8. SPEC-HOLISTIC-2 §1.2 also says drum rudiments are tiered by **complexity family, then nps**, not by path rating.
- **Fix:**
  - Publish the tier table as the seed actually produces it, with each flow-audit override and its reason listed (the owner asked that "the flow audit confirms each placement").
  - Or calibrate the rating→tier map per family against existing ladder mins before seeding.
  - For drums, follow §1.2 and re-tier `d-pas` by family.
  - For voice, map G6–G8 items to T5–T7 under Q2 (RSL Vocals grades).

### 6. Voice and drum tiers fail the ≥ 3 / ≥ 4 rule, and the voice plan breaks the vocal-health rule
- **Voice health.** `VOICE_TOP_PLACEMENT` includes `v-top` ("The edge, held steady", "Above the top, then a phrase to it", "The top-floor goal": voiceTop.ts:180–182). SPEC-HOLISTIC-2 §1.10 says range / agility is "comfortable tessitura, never extremes". Seeding `v-top` into rank tiers makes extremes the top of the range area. **Fix:** make `v-top` coverage only, or exclude it from rank, with a warm-up gate and a stop-on-strain brief.
- **Voice coverage.** Only `v-part` (3 levels) serves the harmony area, so "≥ 3 per voice area at T7 and T8" (§2.6) is impossible there. `v-quick` (quick study) is reading, which is not a voice area. **Fix:** give the area mapping of each `v-*` family, and count per area per tier.
- **Drums.** The grooves / styles row gets only `d-synco` 3–6 (four levels across two tiers, which all seed to T8). `d-linear` 1–5, `d-oddtempo` 1–5 and `d-brush` 1–4 exist (stageCPlacement.ts:44–58) but are not used. `d-stick-6` is counted in both rudiments T8 and coordination, which is double counting. `d-trade` is coverage only (§1.10 Trading 4s) and must not be counted. **Fix:** a per-area, per-tier list for drums with ≥ 4 items each and no double use.

### 7. The plan tempo-ladders voicings and treats walking tempo as content
- **Drop-2 voicings.** §2.4 extends `g-harm-8` / `-16` "(max → 8)" and `g-harm-7` "(→ 7)" in the arpeggio area. `g-harm-7` and `-8` are **drop-2 chords** on every degree (tempo ♩40–76). The never-ladder list (RESEARCH-KEY-EXERCISES-AUDIT, after §4.2) says "all comping and voicing". **Fix:** keep `g-harm-7` / `-8` as fixed-tempo harmony rungs. Re-check the existing B-block membership of every voicing rung.
- **Walking tempo.** §2.1 sets "♩200–240 at T7, 240–300 at T8 for up-tempo exercises", and §2.5 adds "**new** `b-walk-12` at ♩240–300 (its own exercise)" as T8 content. SPEC-HOLISTIC-2 §1.3 says fixed-tempo areas are "never gated by tempo", and §1.2 orders content first, tempo as a sub-band. A level that differs only by tempo promotes by tempo. **Fix:**
  - Either define T8 walking by content (forms, cycles, the duo line, Coltrane changes) with up-tempo as a sub-band;
  - or record an explicit owner exception.
  - Under Q2, cite a bass standard for ♩300.

### 8. "More keys" is used as a content step
- **Evidence.**
  - "Their T8 exercise is a content step (more keys, …)" (l. 73).
  - Piano independence T8 `advanced-7` "polyrhythm in all keys" (catalogue: 11 keys) after `advanced-6` at T7.
  - `advanced-8` "… in more keys".
  - SPEC-HOLISTIC-2 §1.1: 12 keys is **coverage**, never level. Every rung already runs in 12 keys.
- **Fix:** drop "more keys" as a tier step. Give `advanced-7` a real content difference (e.g. scale figures over 3:4), or keep it at T7 with `advanced-6` as a single exercise. Piano independence T8 then needs a third and fourth item: N15, RH line over LH walking, plus 1–2 more.

### 9. The Harris track breaks its own §6 order, and leaves levels unplaced
- **Order.** §2.2 says the Harris track follows BARRY-HARRIS-THEORY §6: scales → moving inversions → borrowing → the 8 expressions → in context. The plan puts the 8 expressions (`k-sharm-26`, `-29`) at T7. It then puts borrowing in drop 2 / drop 3 (`-24`, `-25`), borrowing inside the substitutions (`-31`) and three-voice borrowing (`-38`) at T8. Borrowing comes back after the expressions, which is topic hopping.
- **Unplaced levels.**
  - `k-sharm-20` (borrowing, one voice, other scales: the step between `-19` and `-21`), `-23` (borrowing while walking the scale), `-39` and `-40` are never placed. `-40` is still named as a T7–T8 row in §4 (l. 188).
  - `-41` sits at T6 in §2.3 but at T7–T8 in §4.
  - The guitar twin of `-23` (`g-harm-12`) *is* placed, at T8.
- **Fix:**
  - Order T6 → T8 as: all borrowing (`-19`, `-20`, `-21`, `-22`, `-24`, `-25`, `-38`), then the expressions (`-26`, `-29`), then in context (`-30`, `-31`, `-32`, `-42`).
  - Place or explicitly exclude `-20`, `-23`, `-39`, `-40`.
  - Make §4 match §2.3.

### 10. Reading and rhythm / time are left without T7–T8, and the scope does not say so
- **Evidence.**
  - §1.10 lists reading and rhythm / time as areas for piano, guitar and bass, and reading for drums.
  - Reading T comes from catalogue quantiles (§1.2), so with no grade-8 reading level, T7–T8 reading stays empty.
  - The plan never mentions either area. Its scope (l. 3) claims to cover advanced players having "nowhere to climb".
- **Fix:** add T7–T8 reading items (rule-generated per tier) and rhythm items per instrument, or state the exclusion and log it as a §17.5 backlog item.

### 11. Bass first-tier fix: unkeyed rungs, a too-early harmonic minor, and tiers at the floor
- **Unkeyed rungs.**
  - `b-pluck-3` (adjacent crossing) has `keys` = 1, open strings, in the gated catalogue. It cannot be a rung in a 12-key ladder, and the harness counts it as 12 keys.
  - `b-fret-6` (proposed T3) has 4 keys. The plan's "widen to 12" list names levels that already show 12 keys at runtime (`b-chord` 7 / 11–13, `b-pluck-11`, `b-scale` 5 / 10 / 11). It omits these two.
- **Harmonic minor.** `b-scale-7` harmonic minor is placed at T1–3 (l. 162). The RSL bass syllabus has harmonic minor at Grade 5, and Q2 now requires the bass syllabus.
- **Floor tiers.** Hands 3 / 3 / 3 / 3 and walking T0 = 3 sit at the floor. The plan's own lesson (l. 176) and the owner's catalogue rule say aim for ≥ 4.
- **Fix:**
  - Swap `b-pluck-3` for a keyed item (e.g. `b-legato-1` slides).
  - Key `b-fret-6` in 12 keys.
  - Move harmonic minor to the bass-syllabus tier.
  - Add a 4th item per first tier (e.g. `b-walk-3` arpeggio walk, `b-scale-6` 3rds), then re-run the harness under S1's bass areas. The current check used the piano mapping, which the spec does not use.

### 12. The course-change checklist has errors and gaps
- **`TIER_NAME`.** §4 (l. 189) takes the section names "Grade 8" / "Diploma" from `TIER_NAME`. `TIER_NAME` (ranks.ts:44) is Bronze…Master, the 6-step rank-badge scale. It is not T names.
- **Master.** Q5's "T8 = Master" collides with ranks.ts `master`. **Fix:** define where the T-tier labels live, and the T8 ↔ Master mapping, so badges (badges.ts:206 "Reach {TIER_NAME}") stay consistent.
- **Missing items:**
  - path ratings / `levelPlacement` for the new levels (`k-hlfast`, `b-hlfast`, N3, N15, the duo line, comping while soloing, the at-tempo line levels);
  - level badges, whose counts are test-checked per catalogue level (badges.ts:569, 696);
  - the brief / gate page per new exercise (path-names-and-brief, brief-before-task);
  - the SPEC-HOLISTIC-2 §1.10 "Top tiers" text (l. 373), which must be amended once content exists.

---

## Minor notes
- `g-harrisline-7` is grade 8 in harrisLineDrills.ts:758 but 9 in guitarTop.ts:50. The plan says 9. Fix the code or the doc.
- `g-hlfast` runs at ♩140–240, not ♩160–240 (l. 104). `g-hlfast-1` starts at ♩140, which is T5 by the plan's own swung band.
- `g-arps-5` is genre-tagged (jazz, rock, blues). By the plan's own rule (l. 102) it should not count as core T7.
- `k-sharm-47` / `-48` and the `arpeggios-*` levels need stated T7 / T8 nps targets. Today their maxima are 3.73–4.4 (ABRSM G7–G8 arpeggios). A "max → 8" alone does not define the target.
- Q1 check: ABRSM G7 arpeggio 3.73 ÷ 0.78 = 4.78 is T5, while the G7 scale is T6. Say "matches RCM", not "every level checked".
- "Fm6 / Bm6 only at the top tier" (l. 93): BARRY-HARRIS-THEORY §4 means the Harris-way tier H-5. Say which T this is.
- Swung-line bands (♩168–195 / 195–260) are [E]. No syllabus covers them. Mark them as a harness / owner value, and under Q2 give guitar and bass their own bands. Bass 8th-note lines at ♩240 are about 8 n/s.
- `b-scale-2` becoming a rung while it stays the warm-up: say whether warm-up takes can be cold passes (§1.4 cold flags).
- Copyright and composition: no protected melodies found. Charts only (Coltrane changes, rhythm changes, outlines); heads (`g-cmarr`, `sj-head`) are correctly coverage only. Every new item is rule-generated or player-improvised. OK.
- Rubato first: correct for new laddered rungs. Say explicitly that "at tempo" twins (`k-hlfast`, `b-hlfast`) inherit the rubato stage of their source rows, so no untimed start is needed.

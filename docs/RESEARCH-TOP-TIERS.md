# Top tiers T7–T8, per-instrument bands and the bass first tiers (research + spec proposal, v4, 2026-11-28)

Scope: SPEC-HOLISTIC-2 v14 §1 rank (T0–T8) caps at the top content tier, and `LadderRung.min` runs 0–6, so advanced players have nowhere to climb (§1.10 "Top tiers", §17.5 backlog). This doc:
- sets the tier rules from the owner decisions (rounds 1 and 2, at the end);
- re-bands guitar and bass on their own syllabi;
- plans T7–T8 per instrument × area;
- fixes the bass first tiers and the bass walking gap;
- maps Ear, voice and drums, and scopes reading and rhythm;
- lists the course-change checklist impacts and the remaining owner questions.

No code was changed. Every count and harness figure below was re-run on this branch (redesign-v2 with v14): `realCatalogues()` for today's counts, and the §9.1 harness (`daysPerTier`, `climb`; 60 runs; the report's seed; v14 defaults) on the proposed catalogues.

Marks: [V] verified source, [R] repo, [E] estimate (a harness or owner value). **new** = a level that does not exist yet.

---

## 0. Summary

1. **Each instrument is tiered by its own syllabus (Q2).**
   - Piano: ABRSM / RCM.
   - Guitar: the ABRSM 2019 guitar speeds, plus the guitar levels' own `grade` field.
   - Bass: RSL Bass 2018.
   - T8 is grade 8 × 1.2 on guitar and bass (Q10, [E]).
   - Six code tables become per-instrument (§2.4).
2. **Bass has a flat syllabus tempo.** RSL plays scales and arpeggios at 100 bpm in 8ths from Grade 6 to 8 [V]. So bass tiers come from content (scale type, chord type per RSL grade). Tempo rungs exist only at the RSL tempo steps (§2.3).
3. **One rule splits harmony from arpeggios (§1.5).**
   - **Harmony** (content tier only): struck chords, and harmonised-scale degree sequences.
   - **Arpeggios** (may carry tempo rungs): a single chord type's broken arpeggio.
   - Items move to match, and a guard test checks the rule (§7).
4. **One style rule.** Untagged, "all" and jazz-tagged material is core for every learner (the jazz core is the backbone, SPEC-STYLE-FOCUS §8). Other genre tags and the non-jazz add-ons count only for learners with that style. Every tier meets the floor on core items alone. The jazz focus's early opening is capped at T5 and by v14 entry (§1.3).
5. **One rule for line rungs.** Lines are tiered by content on all three instruments; tempo is a sub-band (§1.4).
6. **Most T7–T8 content exists already** (Q3). A short list of **new** rule-generated levels fills the gaps (§4).
7. **Bass first tiers and the walking gap are fixed** with existing 12-key levels. In today's walking area only 47 % of runs reach the first rank within 240 days, and one climb in 60 stalls for 44 days. Proposed: 16 days, no stall. Scales and arpeggios reach their first rank in 14 days, against 36–36.5 today (§5).
8. **Voice is capped at T7 (Q11) and full there.** The existing voice levels hold content up to T7 in all four voice areas, and some rate as T8. Q12 (open T8?) is pending; Appendix A lists what opening T8 would need. Drums reach T8 by rudiment family (§6.3). Reading and rhythm T7–T8 are out of scope and logged as backlog (§6.4).

---

## 1. Rules this plan follows

### 1.1 Decisions in force

| Rule | Source |
|---|---|
| Each instrument is tiered by its own standards, so T7 means the same skill level within each instrument | Q2 |
| Scale-equivalent tempo: arpeggios ÷ the instrument's factor (§2.5); blocked octaves ÷ **0.63**; hands a 3rd / 6th apart at raw tempo | Q1, Q8 |
| T7–T8 is mostly existing grade-8-plus levels wired into the ladders | Q3 |
| Content tier from the rating where no syllabus grade exists, with the flow audit confirming each placement (§1.2) | Q4 |
| Rank T8 is the "Master" of "never full below Master" (naming: §7) | Q5 |
| Harris lines at bebop tempo are a bass T8 item. v14 gives bass no line area, so the item sits in **bass / scales**, where v14 puts Harris's scale language (one-line notice to the owner, §8) | Q6, v14 §1.10 |
| **Catalogue rule:** ≥ 3 available exercises per non-empty tier, floor 2, and no lone 1-exercise tier at the bottom of an area | Q7, v14 §1.2 |
| Guitar beginners start on pentatonics, blues shells and picking | Q9 |
| The diploma tempo for guitar and bass is grade 8 × 1.2 [E] | Q10 |
| Voice tops out at T7 for now; voice T8 goes to the backlog | Q11 |
| Bass areas: scales (A, D, F), arpeggios / chord tones (S, B), walking / groove (E) | v14 §1.10 |
| **Harmony vs arpeggios:** the §1.5 rule | this plan |
| **Never tempo-ladder** voicings, comping, walking, ear or held-note items. Fixed-tempo areas climb by content; tempo is a sub-band, never a tier step | RESEARCH-KEY-EXERCISES-AUDIT §4.2; v14 §1.2–§1.3 |
| **Twelve keys are coverage, never a tier** | v14 §1.1 |
| Only verified theory. No Claude-composed music. Chord charts only, no protected melodies | owner rules |

### 1.2 Where a level's content tier comes from (Q4)

1. **Ladder rungs keep `LadderRung.min`** as the seed (spec §1.2). Guitar and bass are the exception: step 2 re-tiers them.
2. **A syllabus grade, where one is stated.** Grade → T: Debut / pre-grade → T0, G1 → T1, G2–3 → T2, G4 → T3, G5 → T4, G6 → T5, G7 → T6, G8 → T7, diploma (guitar grades 9–11) → T8.
   - **Guitar:** the level's `grade` field after `GUITAR_GRADE_UP`.
   - **Bass:** the RSL Bass 2018 grade where the material first appears: scale type (§2.3) or chord type (§5.2).
   - **Voice:** the RSL grade the family names, where it names one.
   - **Drums:** the rudiment family (§6.3).
3. **Otherwise, the path rating** r gives the candidate: grade = ⌊(r − 700) / 90⌋, mapped through step 2.
4. **Overrides, each listed with its reason:**
   - the Harris order (BARRY-HARRIS-THEORY §6: scales → moving inversions → borrowing → the 8 expressions → in context);
   - the catalogue rule;
   - the never-ladder list;
   - v14 §1.2 drum rudiments (complexity family, then nps);
   - the Q11 voice cap.
5. **Ratings never re-tier an existing ladder rung.** They are not a calibrated tier scale: `k-sharm-11` rates 1230 (≈ T4) but sits at ladder T1.

### 1.3 Core vs style-only material, and the jazz early opening

**The rule.** SPEC-STYLE-FOCUS §8 says: no locks; a main style plus up to 2 more; "the jazz core is the backbone of the shared curriculum for everyone"; focus weights apply only to style-specific content.

| Kind | Examples | Counts toward a tier's minimum |
|---|---|---|
| Untagged or genre `all` | `g-speed` (`rock, metal, all`), `g-fusion`, `g-picking-10` | every learner |
| Jazz-tagged, or the guitar jazz add-on (`ADDON_FAMILY` = jazz) | `g-jblues`, `g-harris`, `g-harrisline`, `g-cadlib`, `g-tpair`, `g-hlfast`, `g-solojazz`, `g-arps-5` (`jazz, rock, blues`) | **every learner** (the backbone) |
| Any other genre tag, a non-jazz add-on, or the country flag | `g-picking-5` / `6`, `g-legato-6` (rock, metal); `g-picking-7` (country); prog add-ons `g-picking-8` / `9`, `g-legato-8`; flamenco, fingerstyle | only learners whose main or "also" styles include it. Still open by hand (no locks) |

- **Every tier in §4 meets the floor on core items alone.** No exception is needed.
- **Code impact: no locks at all** (SPEC-STYLE-FOCUS §8.1). `guitarLevelShown` (guitar.ts:2887) today hides an add-on level unless its add-on is ticked, and hides country levels without the country style. **Both gates go, for every add-on.**
  - Every level stays visible and openable.
  - Style-only items are only unweighted (they are offered through the 10 % exposure, §9 of SPEC-STYLE-FOCUS).
  - They are excluded from rank "available" for learners without that style.

**The jazz early opening (keyIndex.ts:688).** `openKeyRungs` opens a `jazz: true` rung two tiers early when the main style is jazz. New rule:
- The shift applies only to rungs with `min` ≤ 5, and it stays capped by v14 entry (content ≤ max(placedTier, rankHW) + 1; + 2 only once every exercise at + 1 is passed).
- **T6–T8 rungs open at their own `min` for everyone.** They may carry `jazz: true` for the style weight, but not for the shift.
- So a jazz-focus player at T5 never gets T7 borrowing early, and the Harris order holds.

### 1.4 Line rungs: one rule on every instrument

- **Line rungs** (`k-hlfast`, `g-hlfast`, `b-hlfast`, `k-harrisline`, `g-harrisline`, `b-harrisline`, `b-barry`, the triad pairs and similar) **are tiered by content**: their family, grade or rating under §1.2.
- **Tempo is a sub-band inside the tier.** It never sets the tier.
- **The start tempo:** each line item starts at its own catalogue start tempo, after its rubato stage (SP §15.2).
- **The climb:** it keeps rising inside the tier (H10).
- **Swing bands follow each instrument's bounds** (8ths, n/s = ♩ ÷ 30). **They set only the take's tolerance tier** [E]. A start below the band is allowed:

| Instrument | T7 band (bench range) | T8 band | At-tempo level |
|---|---|---|---|
| Piano | ♩ 168–194 (5.6–6.5 n/s) | ♩ ≥ 195 | `k-hlfast`: catalogue start ♩160, climbs to ♩240–260 inside T8 |
| Guitar | ♩ 135–158 (4.5–5.3) | ♩ ≥ 159 | `g-hlfast`: catalogue start ♩140, climbs to ♩240 (content T8: grades 9–11) |
| Bass | ♩ 100–119 (3.33–4.0) | ♩ ≥ 120 (bench 4.0) | `b-hlfast`: catalogue start ♩120, climbs to ♩200–240 inside T8 (Q6's "bebop tempo" is its top). `b-barry-6` (T7) starts at its catalogue ♩120 |

### 1.5 Harmony vs arpeggios: one rule

A rung's area follows **what is drilled**. It is decided by the generator kind, never by the old code block.

| The rung is… | Area | Tempo rungs (nps spans) | Examples |
|---|---|---|---|
| **A struck chord form:** block, drop 2 / 3 / 2&4, shells, rootless, comping, double stops | harmony / voicing | **never** (fixed tempo; never-ladder list) | `k-sharm-9` / `10` / `13`–`16` / `43` / `44`; `g-harm-3` / `5` / `7`–`9` / `14`; `k-cadlib`, `g-cadlib` |
| **A harmonised-scale degree sequence:** one chord (or cell) per scale degree, broken or struck. The skill is the chord on each degree | harmony / voicing. **Bass: arpeggios / chord tones**, since v14 gives bass no harmony area | **never.** Content tier only; a broken sequence keeps an in-tier tempo climb (H10) as a sub-band | `k-sharm-3` / `5` / `7` / `11` / `45`–`48`; `g-harm-2` / `4` / `6` / `15` / `16`; `b-scale-6` (3rds), `b-chord-15` / `16` / `17` / `18` |
| **A single chord type's broken arpeggio:** one chord, or one chord quality moved through keys or inversions, across octaves or hands, played for speed and evenness | arpeggios | **yes** (scale-equivalent tempo, §2.5) | `arpeggios-*`, N3, `g-arps-*`, `g-speed-3`, `b-chord-2`–`7`, `-11`–`13` |

**Guard test (§7):**
- A rung may carry `max` (nps rungs) only if it is block A (scales), or its spec kind is a single-chord arpeggio kind (an allow-list).
- Every chord-step kind (struck) and every degree-sequence kind (`hl-*` ladder steps, `dia7` / `dia9` / `dia1235`, `g-harm` / `k-sharm` options) has no `max`. It maps to harmony (bass: arpeggios / chord tones).

**Order within a tier.** Rank does not order the items inside a tier, so the Harris order inside a tier comes from the rung order. The rungs must be listed in the order the tables below give:
- piano T6: moving inversions before borrowing;
- piano T8: the expressions before "in context";
- guitar T7: `g-harm-9` before `-10` / `-11` / `-13`.

---

## 2. Tempo bands per instrument

### 2.1 Piano (unchanged)

| T | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| Scale bench, n/s (`BENCH_NPS`) | 1.8 | 2.0 | 2.5 | 3.3 | 4.0 | 4.8 | 5.3 | 5.9 | 7.0 |
| Bound above (`tierBounds`) | 1.9 | 2.1 | 2.8 | 3.6 | 4.4 | 5.0 | 5.6 | 6.5 | — |
| `SPEED_NPS` | 2.2 | 2.67 | 3.47 | 4.2 | 5.07 | 5.33 | 5.87 | 6.5 | 7.5 |

- **Sources:** ABRSM grade speeds [R]; RCM 2022 L8 ♩=88 16ths (5.9), L9 ♩=104 (6.9), L10 ♩=120 (8.0) [V].
- **`EXAM_NPS`** stops at grade 8 (5.87). It needs the diploma entry: 7.0 bench / 7.5 speed.

### 2.2 Guitar (new table)

Source: ABRSM Guitar 2019, "Guitar grades: requirements and information", p. 11 speed table [V]:
- scales G1–G5: ♩ 48 / 56 / 66 / 80 / 96;
- 2-octave scales G6–G8: ♩ 112 / 126 / 144;
- arpeggios G6–G8: ♩ 96 / 104 / 116.

Read in quavers, G8 = 4.8 n/s, which matches SPEC-GUITAR-TECHNIQUE.md:306 [R]. The table's note-value glyphs did not survive text extraction, so quavers is inferred.

| T | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| Scale bench, n/s | 1.3 [E] | 1.6 | 2.0 | 2.67 | 3.2 | 3.73 | 4.2 | 4.8 | 5.8 [E] |
| Bound above | 1.45 | 1.8 | 2.35 | 2.93 | 3.47 | 3.97 | 4.5 | 5.3 | — |
| `SPEED_NPS` (the next bench; T8 × 1.1) | 1.6 | 2.0 | 2.67 | 3.2 | 3.73 | 4.2 | 4.8 | 5.8 | 6.4 |

`g-speed-1` starts at 16ths ♩96 = 6.4 n/s, above the guitar T8 bench. It is a grade-9 (T8) exercise whose tempo climbs inside T8.

### 2.3 Bass (new table)

Source: RSL (Rockschool) Bass Syllabus Specification 2018, Technical Exercises [V]. The 2012–2018 guide gives the same tempos.

| RSL grade | T | Tempo | n/s | Scales added | Arpeggios added |
|---|---|---|---|---|---|
| Debut | T0 | 70 (note value not stated; quarters inferred) | 1.17 | major, minor pentatonic | major, minor (2012–2018 guide p. 26; the 2018 spec's Debut Group B is the same chords strummed in open position) |
| G1 | T1 | 70 | 1.17 | natural minor, major pentatonic | — |
| G2 | T2 | 80 | 1.33 | — | — |
| G3 | T2 | 90 | 1.5 | blues | dominant 7th |
| G4 | T3 | 80, one octave in **8ths** | 2.67 | (8th notes) | (8th notes) |
| G5 | T4 | 80, 8ths; arpeggios two octaves | 2.67 | harmonic minor | major 7th, minor 7th |
| G6 | T5 | 100, 8ths | 3.33 | minor pentatonic in 5 positions; Dorian, Mixolydian (two positions) | m7♭5 (printed "Major 7 b 5" in 2018; the 2012 guide reads Minor 7♭5), diminished; double-stop chords dom7, m7 (Group C) |
| G7 | T6 | 100, 8ths | 3.33 | major two octaves; Lydian, Phrygian, jazz melodic minor | maj9, m9, dom9; **high-register** chords (dom7, maj7, m7; 2018 Group C) |
| G8 | T7 | 100, 8ths | 3.33 | whole-tone, diminished, altered; natural minor two octaves | 7♯5, 7♭5, 7♯9, 7♭9 |
| Diploma | T8 | 120, 8ths [E] | 4.0 | (beyond RSL) the melodic- and harmonic-minor modes; Harris lines at tempo (Q6) | — |

**The bass tier rule.**
- **Content first.** A bass rung's tier is the RSL grade of its material.
- **One exercise, one cell.** The major row's Aeolian (`b-scale-3` option 5, `b-scale-12` option 0, `b-chord-16` option 5) is the same exercise as the minor row's natural minor (same `exerciseId`, v14 §1.7). It is counted once, in the minor row. The major row shows it as a view of that cell, with the same passes.
- **nps rungs only at the RSL tempo steps: T2, T3, T5, T8.** The harness's span rule (one exercise per tier min…max) must skip T1, T4, T6 and T7 for bass, or it creates tempo-identical exercises.
- **Which bass rungs span which steps:**

| Rung | Home tier | Extra nps rungs at |
|---|---|---|
| major (`b-scale-2`), minor pentatonic | T0 | T2, T3, T5 |
| natural minor (`b-scale-3` option 5) | T1 | T2, T3, T5 |
| major pentatonic | T1 | T2, T3 |
| blues | T2 | T3, T5 |
| harmonic minor (`b-scale-7`) | T4 | T5 |
| triads (`b-chord-4`), inversions (`b-chord-5`) | T0 / T1 | T2, T3 |
| dom7 (`b-chord-6` option 2) | T2 | T3 |
| two-octave triads and 7ths (`b-chord-7`, `-11`) | T4 | T5 (`-11` also T8) |
| G7–G8 scales (`b-fret-5`, Lydian, Phrygian, melodic minor, `b-scale-9`, natural minor 2 octaves) | T6 / T7 | T8 |
| 9ths, altered (`b-chord-12`, `-13` by option) | T6 / T7 | T8 |
| degree sequences (`b-scale-6`, `b-chord-15`–`18`) | their tier | **none** (§1.5) |

**Bass tables:**
- **bench:** [1.17, 1.17, 1.4 [E: a blend of G2 1.33 and G3 1.5], 2.67, 2.67, 3.33, 3.33, 3.33, 4.0];
- **`SPEED_NPS`** (the next RSL step; T8 × 1.1): [1.33, 1.5, 2.67, 3.33, 3.33, 4.0, 4.0, 4.0, 4.4];
- **`tierOfNps`** returns band floors, used only for tolerance: < 1.25 → T0, < 2.0 → T2, < 3.0 → T3, < 3.7 → T5, else T8.

### 2.4 Code tables that must become per-instrument

| Table | File | Change |
|---|---|---|
| `BOUNDS` / `tierOfNps` | src/engine/drills/tierBounds.ts | `tierOfNps(nps, inst)`: piano / guitar / bass tables (§2.1–§2.3) |
| `BENCH_NPS`, `SPEED_NPS` | src/engine/drills/stages.ts:68–70 | `benchNps(tier, inst)`, `speedNps(tier, inst)` |
| `EXAM_NPS` | src/engine/drills/generate.ts:5469 | piano + diploma; guitar (ABRSM, arpeggios × 0.8); bass (RSL, arpeggios × 1.0) |
| `itemTier` | src/engine/drills/tiers.ts | the instrument's table. The arpeggio / octave factor applies to the content tier only; tolerance keeps the raw tempo |
| `tierTiming` callers | src/engine/drills/analyze.ts | the instrument's tier |
| `itemTargetBpm` / target tempo | src/engine/drills/plan.ts, targetTempo.ts | the instrument's bench × the material's factor |

### 2.5 Scale-equivalent factors (Q1, Q8, decided)

| Material | Piano | Guitar | Bass |
|---|---|---|---|
| Arpeggios | 0.78 (RCM ratios [V]) | 0.8 (ABRSM 2019 G6–8 arpeggios ÷ scales: 0.81–0.86) | 1.0 (RSL: arpeggios at scale tempo, G4–G8 [V]) |
| Blocked octaves | **0.63** (RCM, Q8) | raw (no syllabus octave scales) | raw |
| Hands a 3rd / 6th apart | **raw tempo** (Q8) | — | — |

- **The rung target at tier t** = the bench at t × the factor.
- **Piano arpeggio targets:** T3 2.57, T4 3.12, T5 3.74, T6 4.13, T7 4.6 (16ths ♩69), T8 5.46 n/s (16ths ♩82).
- **Piano octave targets:** T5 3.0 (8ths ♩90), T6 3.34, T7 3.72 (16ths ♩56), T8 4.41 n/s (16ths ♩66).
- **Check:** the piano arpeggio factor matches **RCM**: L8 arpeggios 4.6 → T7; L9 5.6 and L10 6.1 → T8. It does not match every ABRSM grade (ABRSM G7 arpeggio 3.73 ÷ 0.78 → T5, while the G7 scale is T6).
- **Octaves check:** RCM L9 octaves 16ths ♩60 (4.0 ÷ 0.63 = 6.35 → T7); L10 ♩80 (8.5 → T8).
- **Scope:** the factor sets the content tier of **nps rungs**. Existing rungs keep their ladder mins.

---

## 3. Current counts (code, this branch)

`realCatalogues()`; piano and guitar on 5 areas, bass on v14's 3.

| Instrument / area | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|---|
| piano / scales | 0 | 1 | 2 | 3 | 7 | 5 | 2 | 0 | 0 |
| piano / arpeggios | 0 | 0 | 0 | 8 | 5 | 6 | 1 | 0 | 0 |
| piano / harmony | 6 | 5 | 2 | **0** | 8 | 2 | 3 | 0 | 0 |
| piano / independence | 0 | 2 | 4 | 9 | 2 | 3 | 2 | 0 | 0 |
| piano / line-jazz | 0 | 0 | 0 | 0 | 0 | 4 | 3 | 0 | 0 |
| guitar / scales | 0 | 1 | 2 | 2 | 6 | 3 | 1 | 0 | 0 |
| guitar / arpeggios | 0 | 1 | 1 | 8 | 5 | 4 | 0 | 0 | 0 |
| guitar / harmony | 4 | 5 | 2 | 1 | 8 | 2 | 1 | 0 | 0 |
| guitar / independence | 2 | 3 | **0** | 2 | **0** | 2 | 0 | 0 | 0 |
| guitar / line-jazz | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 |
| bass / scales | 1 | 2 | 3 | 4 | 5 | 6 | 2 | 0 | 0 |
| bass / arpeggios | 1 | 2 | 5 | 3 | **1** | 3 | 0 | 0 | 0 |
| bass / walking | **0** | **1** | **1** | **0** | 2 | 2 | 0 | 0 | 0 |

**What these counts hide:**
- **Piano block B is mostly voicings and degree sequences:** `k-sharm-5` / `6`, `-9` / `10`, `-13` / `-14`, `-15` / `-16`, `-43` / `-44`, `-45`–`48`. Today's arpeggio counts at T3–T6 include them.
- **Today's guitar ladder mins sit 1–3 tiers below the levels' syllabus grades.** For example, `g-harm-2` is grade 4 (T3) but at ladder T0.

---

## 4. The proposal

Proposed counts (all core, 12-key rungs, unless marked as area only), with the §9.1 harness on each proposed area:

| Instrument / area | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | First rank, days (p 0.75, 3 d/wk) | Median transition, days | Climb stalls ≥ 42 d |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| piano / scales | 0 | 1 | 2 | 3 | 7 | 6 | 7 | 7 | 7 | 35 (T1, unchanged) | 21 | 0 |
| piano / arpeggios | 0 | 0 | 0 | 4 | 8 | 8 | 7 | 5 | 4 | 20 (T3) | 23.5 | 0 |
| piano / harmony | 6 | 5 | 2 | 11 | 13 | 8 | 9 | 15 | 10 | 14 | 23 | 0 |
| piano / independence | 0 | 2 | 4 | 9 | 2 | 3 | 2 | 6 | 3 | 20 | 23 | 0 |
| piano / line-jazz | 0 | 0 | 0 | 0 | 0 | 4 | 6 | 8 | 8 | 17 (T5) | 19 | 0 |
| guitar / scales | 0 | 2 | 4 | 6 | 8 | 12 | 16 | 17 | 15 | 21 (T1) | 21 | 0 |
| guitar / arpeggios | 0 | 0 | 2 | 3 | 5 | 4 | 3 | 3 | 4 | 20 (T2) | 24 | 0 |
| guitar / harmony | 0 | 0 | 3 | 4 | 7 | 9 | 18 | 11 | 10 | 16.5 (T2) | 19 | 0 |
| guitar / independence | 0 | 2 | 5 | 3 | 3 | 3 | 2 | 3 | 4 | 21 (T1) | 25.25 | 0 |
| guitar / line-jazz | 0 | 0 | 0 | 0 | 0 | 2 | 7 | 8 | 12 | 21.5 (T5) | 19.5 | 0 |
| bass / scales | 5 | 4 | 8 | 9 | 5 | 12 | 9 | 11 | 13 | 14 | 21 | 0 |
| bass / arpeggios | 4 | 3 | 4 | 4 | 5 | 8 | 3 | 4 | 6 | 14 | 21 | 0 |
| bass / walking | 3 | 3 | 4 | 3 | 4 | 4 | 4 | 5 | 3 | 16 | 22.5 | 0 |

- **Every proposed climb reaches every rankable tier,** T8 included, within 365 days (steady learner, 60 runs), with no stall ≥ 42 days.
- **Every tier meets the floor (2) on core items.** These tiers sit at the floor, below the ≥ 3 target:
  - piano harmony T2, piano independence T1 and T6 (all inherited);
  - guitar arpeggios T2, guitar independence T1 and T6, guitar line-jazz T5 (bottom or near-bottom tiers of the re-banded guitar).
- **Counting:** one exercise per rung (conservative; v14 §1.7 counts each option). The exception is `b-chord-6` and `b-chord-13`: their options are different chord types at different RSL grades, so they are listed as one rung per option at every tier where they appear.

### 4.1 Piano

**Scales** (nps rungs; targets: the bench):

| T7 and T8 rungs | Notes |
|---|---|
| `scales-10` major 4 octaves HT 16ths (new rung 6–8); `aeolian:scales-33` and `melodic:scales-33` (max → 8); `scales-36` harmonic minor 4 octaves (minor rows, 6–8); `scales-32` the modes 4 octaves HT (6–8, counted once); `scales-8` a 3rd / 6th / 10th apart (span 4–8, raw tempo per Q8); `scales-14` chromatic a m3 / M6 apart (6–8) | RCM L8–L10 [V]. Small hands: `scales-8` 10ths → 3rds |

**Arpeggios** (single-chord arpeggios only, §1.5; factor 0.78; targets in §2.5):

| Tier | Exercises | Count |
|---|---|---|
| T3 | `arpeggios-8` broken chords through the inversions, `arpeggios-3` HT 2 octaves (span 3–5); `arpeggios-10` dom7 from every chord tone, minor `arpeggios-11` dim7 from every note (span 3–6) | 4 |
| T4 | the T3 spans; `arpeggios-12` 3 octaves HT / jazz 7ths HT, `arpeggios-15` contrary motion, `arpeggios-16` dom7 and dim7 4 octaves HT (span 4–8); `arpeggios-6` 4 octaves contrary (span 4–7) | 8 |
| T5 | the spans | 8 |
| T6 | `arpeggios-10`, `-11`, `-12`, `-15`, `-16`, `-6`; **new** N3 broken alternate-note four-note chords on I, V7, vii°7 (span 6–8; RCM L9–10 ♩80 / ♩96 16ths [V]) | 7 |
| T7 | `arpeggios-12`, `-15`, `-16`, `-6`; N3 | 5 |
| T8 | `arpeggios-12`, `-15`, `-16`; N3 | 4 |

- Hand-over-hand stays capped below T7.
- `k-sharm-5` / `6` (3rds together), `-45` / `46` (cells) and `-47` / `48` (9ths on every degree) are degree sequences, so they move to harmony (§1.5).

**Harmony / voicing** (fixed tempo, no nps rungs; the Harris track in §6 order):

| Tier | Exercises | Count |
|---|---|---|
| T3 | moved from B (§1.5): `k-sharm-5` 3rds together (major, Aeolian), minor `-6`, `-45` 1-2-3-5 cells, minor `-46`, `-9` block triads (major, Aeolian), minor `-10`; gap fill: `k-cadlib-1` shells, `-2` guide tones, `-3` shells over substitutes | 11 |
| T4 | + `k-sharm-13` block 7ths (major, Aeolian), minor `-14`, `-43` triad inversions, minor `-44` | 13 |
| T5 | + `k-sharm-15` drop 2 (major, Aeolian), minor `-16`, melodic `-14`, `-47` 9ths on every degree, minor `-48` | 8 |
| T6 (moving inversions, then first borrowing) | melodic `k-sharm-16` drop 2; `-17` drop 3, minor `-18`; `-35` drop 2&4; then `-19` borrowing one voice (6th-dim), `-20` borrowing one voice (m6, 7, 7♭5-dim); existing `k-cadlib-23` / `24` / `26` | 9 |
| T7 (borrowing completed, the elevator, the moves) | `k-sharm-21` two voices, `-22` the chord above / another dim / passing, `-24` in drop 2, `-25` in drop 3, `-38` three voices; `-33` the elevator from the tonic, `-40` the minor 6-dim elevator from the tonic; `-34` 7th-dim / 7♭5-dim scales in drop 2 / 3 over V7 → I; `-37` Harris's moves; `-36` the sixth on the fifth; `-41` Echols's shells (shown items only); `k-cadlib-17` / `18` four-way close, `-20` / `21` two-hand voicings | 15 |
| T8 (the 8 expressions, then in context) | `k-sharm-26` the eight expressions in drop 2 → I6, `-39` the related dominants over a shell / the tritone's minor, `-29` mixing the expressions per bar; in context: `-30` comping a turnaround and a jazz blues with the substitutions, `-31` borrowing inside the substitutions, `-23` borrowing while walking over ii–V–I and a turnaround, minor rows `-32` minor ii–V–i (Harris), `-42` a substitute on each V of a tune (area only, chord charts); `k-cadlib-22`, `k-reharm-8` upper structures over a pedal, `k-reharm-4` reharmonising in the key | 10 |

**Rating seed vs placement** (`K_HARM_DIFF`, harmLadder.ts). The overrides:

| Level | Rating → seed | Placed | Reason |
|---|---|---|---|
| `k-sharm-17`, `-18` | 1520, 1600 → T8 | T6 | §6.3: moving inversions (drop 3) precede borrowing (`-19`, seed T6) |
| `k-sharm-35` | 1620 → T8 | T6 | §6.3: drop 2&4 is a moving-inversion step, so it goes with `-17` / `-18`, before borrowing |
| `k-sharm-24`, `-25`, `-38` | 1600, 1650, 1520 → T8 | T7 | §6: borrowing finishes before the 8 expressions (T8) |

- Every other `k-sharm` placement equals its seed: `-19`, `-20` T6; `-21`, `-22`, `-33`, `-34`, `-36`, `-37`, `-40`, `-41` T7; `-23`, `-26`, `-29`–`-32`, `-39`, `-42` T8. `-27` and `-28` are lines.
- **The rungs moved from B keep their ladder mins** (§1.2 step 1).
- **Rung order inside a tier** follows the table (§1.5).
- **Fm6 / Bm6** appear only inside `-26` / `-29`, at T8. That is the Harris way's H-5 (BARRY-HARRIS-THEORY §4), at low weight.

**Independence** (content steps; "more keys" is never a step):

| Tier | Exercises |
|---|---|
| T7 | `advanced-3` staccato, chromatic and HT octaves (octave factor: target 3.72 n/s = 16ths ♩56, start 0.85 × target; ≤ 2 octaves, capped reps); `advanced-6` polyrhythm 2:3 / 3:4 hands swapped (`advanced-7` "in more keys" folds in as coverage); `advanced-8` hand crossing, leaps, double 6ths (capped); `fingers-13` Czerny-style velocity runs over the LH; SP item 37 rung 5 (one hand leaps, the other holds a pattern); **new** N15 chromatic scale in octaves, T7 rung (target 16ths ♩56; RCM L9 ♩60 [V]) |
| T8 | **new** N15, T8 rung (target 16ths ♩66, climbing inside T8 to ♩80 = RCM L10 [V]); **new** RH generated line over a LH walking bass (SP item 7 extended); **new** polyrhythm with moving figures (a RH scale in 3 against a LH broken chord in 4, then swapped) |

**Line-jazz** (content tier, tempo a sub-band, §1.4):

| Tier | Exercises |
|---|---|
| T6 | existing `k-tpair-2`, m6dim `scales-31`, m6dim `k-sharm-12`; `harris-25` minor 6th-dim scale, `harris-26` dominant 7 / 7♭5-dim scales, `k-harrisline-19` the chromatic scale in two voices |
| T7 | `k-harrisline-33` the dominant rule from every degree (three or two), `-16` the minor rule from every degree, `-12` the major rule (three, and two from 2 and 4), `-20` 3 to ♭9 over the family, `-21` seven down to the 3rd, `-34` the chromatic scale in two voices, every interval; `harris-22` the pivot through ii–V–I; `harris-15` ii–V–I lines by the rules |
| T8 | **new** `k-hlfast-1` … `-4` Harris lines at bebop tempo (chromatic scales and outlines; the rules from every degree; seven down / 3 to ♭9 / the triplet rules; lines through whole outlines; shown devices only; mirrors `g-hlfast`); `k-sharm-27` / `-28` each expression's scale over V–I (lines go with the expressions at T8); **new** comping while soloing (RH line card over LH rootless comping cells, §8.8); `k-bebop-9` lines over whole forms (area only, chord charts) |

### 4.2 Guitar (re-banded, T0–T8)

**Rule:**
- Content tier = the level's `grade` tier (§1.2).
- Scale and arpeggio rungs start at their grade tier, and their nps rungs climb the guitar bench (§2.2).
- §1.5 applies. **Harmony (no nps rungs):**
  - struck chords: `g-harm-3`, `-5`, `-7`–`-9`, `-14`, `g-vl-*`, `g-harris-2`, `-7`, `g-tpair-5`, `g-harrisline-8`;
  - degree sequences: `g-harm-2`, `-4`, `-6`, `-15`, `-16`.
- **Arpeggios (nps rungs):** `g-arps-*` and `g-speed-3`.
- There is no guitar key-ladder content at T0, because the grade-0 material (`g-first`) is keyless. A beginner places at T1 (Q9).
- All items below are core (§1.3).

| Area | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|
| Scales | `g-scales-1` minor pentatonic box 1 (minor rows); `g-scales-3` blues + major pentatonic *(override G3 → T1: the pentatonic pair; catalogue rule)* | + `g-scales-12` interval shapes, `g-harm-1` every scale note by note (G3) | + `g-scales-4` E / A shapes, `-2` boxes 2–5 | + `-5` 5 CAGED, `-8` connecting, Aeolian / harmonic `-13` | + `g-picking-3` 3nps, Dorian / Mixolydian `-14`, Aeolian `-16`, harmonic `-17`, `-11` Segovia | + Lydian / Phrygian / melodic `-15`, melodic `-18`, `-9` 3nps whole neck, `-6` 7 patterns | + `-10` interval sequences, Locrian `-7`, `-19` / `-20` minor modes, `-21` dim W–H | + `g-speed-1` |
| Arpeggios (×0.8) | — | `g-arps-1` major and minor triads (two rows) | + `g-arps-2` CAGED triads | + `-3` inversions, `g-arps-4` 7ths | + `g-arps-6` 7ths in 5 shapes | (spans only) | + `g-arps-7` 9 / 13 / upper structures, `g-arps-5` dim7 / altered / ii–V–I | + `g-speed-3` sweeps at speed |
| Harmony (fixed) | — | `g-jblues-2` shells, `-3` guide tones, `-4` Charleston (blues in the key) | `g-harm-2` (3 rows), `g-vl-1` | `g-harm-4` (3 rows), `g-harm-3` 3rds as double stops (2 rows), `g-harm-15` cells (2 rows) | `g-harm-6` (major, minor, Aeolian, **Dorian, Mixolydian**), `g-cadlib-1` (2 rows), `g-harm-5` block triads, `g-vl-2` drop 2 by step | **Lydian / Phrygian** `g-harm-6`, melodic `g-harm-2` / `4` / `6`, `g-cadlib-2`–`5`, `g-harm-7` drop 2, `g-harm-14` triads and inversions (2 rows), `g-harm-16` 9ths on every degree (2 rows), `g-vl-3` drop 3 by step, `g-harrisline-8` upbeat comping, `g-harris-2` the scale of chords | **Locrian** `g-harm-6`, `g-cadlib-6`–`9`, `g-harm-8` drop 2, `-9` drop 3 and drop 2&4, `-10` / `-11` borrowing, `-13` borrowing on other string sets *(override: grade 10 → T7, Harris order: borrowing finishes before the expressions)*, `g-harris-7` | `g-harris-11` the 8 expressions / moves, `-12` the expressions' scales / elevator, then in context: `g-harm-12`, `g-harris-13`, `g-cadlib-10`, `g-harris-6`, `g-tpair-5` comping with pair shapes, `g-solojazz-1` / `2` / `3` (walking bass with guide tones / shells: ii–V–I, blues, rhythm changes; charts) |
| Independence | `g-picking-1`; `g-fretting-1` *(override G2 → T1: no lone bottom tier)* | `g-legato-1` / `2`, `g-fretting-2` / `3`, `g-picking-2` | `g-fretting-4`, `g-legato-3`; **new** two-string picking sequences in 8ths (planned fill) | `g-picking-4`, `g-legato-4`, `g-fretting-6` (widen to 12) | `g-fretting-5`, `g-picking-10`; **new** legato sequences in 8ths (planned fill) | `g-legato-5`; **new** picked 3nps sequences (groups of 3 / 4, inside and outside crossing), 8ths | `g-legato-7`; **new** legato sequences in 16ths; **new** picked sequences in 16ths | `g-speed-2`, `-4`, `-5`, `g-fusion-2` (capped stretch) |
| Line-jazz | — | — | — | — | `g-harris-1`, `g-harrisline-10` ABCs | `g-tpair-1` / `2`, `g-harrisline-1`–`4`, `g-harris-3` the dominant scale with the half-step rules | `g-scales-21` bebop dominant on V, `g-harrisline-6`, `g-tpair-3` / `4`, `g-harris-4` / `5` / `8` / `9` | `g-harrisline-7`, `g-tpair-6` / `7`, `g-harris-10`, `g-hlfast-1`–`4`, `g-fusion-1` / `3` / `4` / `5` |

Notes:
- **Modal harmony follows its scale's grade:** Dorian / Mixolydian G6 → T5; Lydian / Phrygian / melodic minor G7 → T6; Locrian G8 → T7.
- **`g-harrisline-7`** is grade 8 in harrisLineDrills.ts but 9 via `GUITAR_GRADE_UP`. The effective grade is 9. Align the code comment.
- **The guitar Harris track differs from the piano's, and that is intended for now.** On guitar, the moves, the sixth on the fifth and the elevator arrive at T8, bundled in `g-harris-11` / `12` (grade 10). The piano has them separately at T7. Splitting `g-harris-11` / `12` into single-topic levels is a later content item.
- **Not counted:** `g-harrisline-9` (compose a line: hidden, not pursued); `g-solojazz-4` (a whole head with its melody: memorised, coverage only).
- **Guitar independence:** T6 sits at the floor. Its planned fill is the new 8th-note sequence levels above. The T3 and T5 fills are new rule-generated sequence levels, named in the table.

### 4.3 Bass (RSL-banded, v14 areas, T0–T8)

- All rungs are 12-key at runtime. `b-fret-6` (4 keys) widens to 12.
- Open-string levels (`b-pluck-1`–`3`, `b-legato-5`) are not rungs.
- nps rungs follow §2.3.

| Area | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|---|
| Scales (A, D, F) | `b-scale-2` major; `b-scale-1` minor pentatonic; `b-fret-1` chromatic; `b-fret-2` permutations; `b-legato-1` slides | natural minor `b-scale-3` (minor rows; the major row's Aeolian is the same exercise, §2.3); major pentatonic; `b-fret-3` Simandl; `b-legato-2` | nps rungs (§2.3); blues; `b-pluck-4` skipping; `b-fret-4` shifts; `b-pluck-5` 16ths | nps rungs (8ths); `b-scale-6` in 4ths; `b-fret-7` octaves and 10ths; `b-pluck-6` accents; `b-pluck-10` | harmonic minor `b-scale-7` (minor rows); `b-fret-8` upper register; `b-pluck-7` raking; `b-pluck-11` i-m-a; `b-fret-6` | nps rungs at 100; Dorian / Mixolydian `b-scale-4`; `b-scale-10` five pentatonic positions; `b-scale-5` linked; `b-barry-1` 6th-dim scale; `b-barry-3` half-step rules; `b-tpair-1` | Lydian / Phrygian `b-scale-8`; melodic minor `b-scale-7`; `b-fret-5` major 2 octaves; `b-tpair-2`; `b-barry-7` / `8` pivots; `b-harrisline-1` chromatic scale, `-10` ABCs | `b-scale-9` WT / dim / altered on V; natural minor 2 octaves `b-scale-12` (minor rows; one exercise); `b-scale-13` Locrian, dim W–H, bebop dominant on V *(Locrian has no RSL grade; [E], kept with its level)*; `b-harrisline-3` / `4` / `6` / `7` rules; `b-barry-5` / `6`; `b-tpair-3` / `4` | `b-scale-14` / `15` melodic- and harmonic-minor modes; harmonic / melodic 2 octaves `b-scale-12`; `b-tpair-5` side-slip; **new** `b-hlfast-1` / `2` / `3` Harris lines at tempo (§1.4; shown devices); the G7–G8 scales at the diploma tempo |
| Arpeggios (S, B; ×1.0) | `b-chord-2` R–5; `b-chord-3` R–5–8 [E: no RSL grade]; `b-chord-4` triads, both rows (RSL Debut) | `b-scale-6` diatonic 3rds; `b-chord-5` inversions; `b-chord-17` 1-2-3-5 cells (major rows) [E] (degree sequences: no nps rungs) | nps rungs; `b-chord-6` **dom7** option (G3) | nps rungs (8ths) | `b-chord-6` **maj7** and **m7** options (G5); `b-chord-7` two-octave triads / dom7; `b-chord-11` two-octave 7ths (G5); minor `b-chord-17` (harmonic minor) | `b-chord-6` **m7♭5** and **dim7** options (G6); `b-chord-15` diatonic 7ths through major (has viiø7); natural-minor and harmonic-minor `b-chord-16` (minor rows; have iiø7, vii°7); nps rungs at 100; `b-chord-14` high-register chords *(fixed tempo; RSL 2018 puts high-register chords at G7 and plain double-stop chords at G6; placed at T5, a judgment call [E])* | `b-chord-12` 9ths; `b-chord-18` 9ths through the scale (both rows) | `b-chord-13` 7♯5, 7♭5, 7♯9, 7♭9 (four options = four exercises, §1.7 `exerciseId`) | `b-chord-11`, `-12` and `-13` (four options) at the diploma tempo [E] |
| Walking (E) | `b-chord-1` roots of a chart; `b-walk-1` two-feel; `b-walk-2` quarter roots and 5ths | `b-chord-8` chord tones; `b-walk-21` first blues line; `b-walk-3` arpeggio walk | `b-chord-9` nearest chord tone; `b-walk-4` chromatic approach; `b-walk-5` dominant approach; `b-chord-10` slash / pedal | `b-walk-6` scale-step approach; `b-walk-7` mixed approaches; `b-walk-8` ghosted skips and triplet drops | `b-cadlib-1` (both rows); `b-walk-14` in 2, ballads, bossa; `b-harrisline-8` ties on the upbeats | `b-cadlib-3` (both rows); `b-barry-4` the rule in a walk; `b-walk-19` jazz waltz | `b-cadlib-2` / `4` approach over substitutes / longer forms; `b-walk-10` rhythm changes; `b-walk-20` blues-waltz chorus | `b-cadlib-5` / `6` free walking over substitutes / longer forms + pedal; `b-walk-11` / `13` walking a standard from its chart, one chorus; `b-walk-16` sight-read and improvise the walk | **new** the duo line over the ii–V family; **new** the duo line over longer forms; `b-walk-18` forms, cycles, Coltrane changes (area only) |

- **`b-walk-12` (up-tempo, ♩160–240) is not a rung.** Its only content step, the two-feel, is already at T0 and T4. Its tempo serves as the up-tempo sub-band of the T7 walking items (the H10 climb).
- **The duo line rule.** With no comping, every chord must sound its quality notes:
  - a chord of a bar or more: the root, the 3rd and the 7th;
  - a 2-beat chord: the root plus one guide tone (3rd or 7th), and across its next appearance the other guide tone.
  - Checked with `rulesOf` (cadenceLibrary.ts "every chord sounds its quality note"), §8.8.

### 4.4 Harness detail (fixed ability; 60 runs)

| Area | Each transition, days (p 0.75, 3 d/wk) | Median at p 0.85, 5 d/wk |
|---|---|---|
| piano / scales | —→T1 35, 21, 20.5, 19, 21, 21, T6→T7 23, T7→T8 26 | 12 |
| piano / arpeggios | —→T3 20, 19, 23, 24, T6→T7 28, T7→T8 27.5 | 11.5 |
| piano / harmony | —→T0 14, 21.5, 34, 19, 20.5, 24.5, 26.5, T6→T7 23, T7→T8 29.5 | 12 |
| piano / independence | —→T1 20, 19.5, 18, T3→T4 41, 25.5, T5→T6 34.5, T6→T7 20.5, T7→T8 33 | 12.5 |
| piano / line-jazz | —→T5 17, 19, T6→T7 19, T7→T8 25 | 11 |
| guitar / scales | —→T1 21, 19, 19.5, 21, 19, 21, T6→T7 23.5, T7→T8 27 | 11 |
| guitar / arpeggios | —→T2 20, 20, 19, 24, 26, T6→T7 26.5, T7→T8 24 | 12 |
| guitar / harmony | —→T2 16.5, 19, 18, 20.5, 19, T6→T7 23.5, T7→T8 26.5 | 11 |
| guitar / independence | —→T1 21, 18, 24, 27.5, 25.5, T5→T6 34, T6→T7 25, T7→T8 25.5 | 12.5 |
| guitar / line-jazz | —→T5 21.5, 17, T6→T7 19, T7→T8 20 | 11 |
| bass / scales | —→T0 14, 20, 19, 21, 29, 21, 29, T6→T7 24, T7→T8 24.5 | 11 |
| bass / arpeggios | —→T0 14, 21, 20, 24, 21, 21, **T5→T6 40.5**, T6→T7 28, T7→T8 27 | 12 |
| bass / walking | —→T0 16, 20.5, 20, 27, 21, 22.5, 26, T6→T7 24, T7→T8 34.5 | 12 |

- **Slow transitions.**
  - The 34–41-day transitions in piano and guitar independence come from inherited or floor tiers (piano T3→T4 and T5→T6; guitar T5→T6). They are flagged for the flow audit.
  - **Bass arpeggios T5→T6 (40.5 days)** reflects RSL G7, whose arpeggios are only the 9ths (3 rungs, two of them degree sequences). The fix, if the flow audit wants one, is to count `b-chord-12`'s three chord types (maj9, m9, 9) by option, as `b-chord-6` / `-13` are.
- **The figures are the conservative fixed-ability case,** on the v14 harness defaults. v14's pooled 12–23 days span p 0.75–0.85 and 3–5 d/wk. These runs give 11–12.5 days at p 0.85 / 5 d/wk, and 19–25.25 days (median) at p 0.75 / 3 d/wk.

---

## 5. Bass first tiers and the walking gap (diagnosis)

### 5.1 Today (v14 areas, re-run on this branch)

| Area | Counts T0… | p 0.75, 3 d/wk | p 0.85, 5 d/wk | Climb |
|---|---|---|---|---|
| bass / scales | 1 2 3 4 5 6 2 | —→T0 **36**; T0→T1 20.5; then 20–32 | —→T0 15; then 11–16 | 0 stalls |
| bass / arpeggios | 1 2 5 3 1 3 | —→T0 **36.5**; T3→T4 **38** (T4 has 1) | —→T0 15; T3→T4 20 | 0 stalls (worst 36 d) |
| bass / walking | 0 1 1 0 2 2 | —→T1 **240 (47 % reached)**; T1→T2 **118.5 (88 %)** | —→T1 44; T1→T2 31 | **1 stall of 44 d** |

**Causes:**
1. **Lone 1-exercise first tiers** (scales T0, arpeggios T0, walking T1 and T2, arpeggios T4), and **walking T3 is empty**. Grouping (§1.7) then needs a pass several tiers up: rank T1 in walking needs a T4 pass, which is the stall v14 §9.1 found.
2. **The bass beginner material exists but is not a rung:** the major scale (only the warm-up), the pentatonics, natural minor (only as an Aeolian from the 6th), roots / R–5 / R–5–8, chromatic, Simandl, slides, and the first walks (`b-walk-1` / `2` / `3` / `21`).
3. **Minor rows have nothing below T2,** and the minor triad sits at T2 while the major triad is at T0.
4. **The ladder mins ignore the bass syllabus:**
   - harmonic-minor material sits at T2–T3 in today's minor rows (`b-chord-16` option 7, minor `b-chord-17`); RSL puts harmonic minor at G5 (T4);
   - Dorian / Mixolydian sit at T4; RSL puts them at G6 (T5);
   - `b-chord-15` / `-16` (with their ø7 / °7 chords) sit at T2; RSL puts m7♭5 and dim at G6 (T5).

### 5.2 The fix and its effect

The fix is §4.3, using existing 12-key levels only below T8. **Chord types by RSL grade** [V]: major / minor G1; dominant 7 G3; maj7 and m7 G5; m7♭5 and dim G6; maj9 / m9 / dom9 G7; 7♯5 / 7♭5 / 7♯9 / 7♭9 G8. `b-chord-6` is split by option (maj7, m7, 7, m7♭5, dim7 = options 0–4), since each option is its own exercise (§1.7).

| Area | Counts T0… (proposed) | First rank, today → proposed (p 0.75, 3 d/wk) | p 0.85, 5 d/wk | Median transition, today → proposed | Stalls, today → proposed |
|---|---|---|---|---|---|
| bass / scales | 5 4 8 9 5 12 9 11 13 | 36 → **14** d | 15 → 7 | 20.5 → 21 (now 9 tiers) | 0 → 0 |
| bass / arpeggios | 4 3 4 4 5 8 3 4 6 | 36.5 → **14** d | 15 → 7 | 23.5 → 21 (the 38-day T3→T4 jump is gone: 21) | 0 → 0 |
| bass / walking | 3 3 4 3 4 4 4 5 3 | 240 (47 % reached) → **16** d | 44 → 9 | 70.25 → 22.5 | **1 (44 d) → 0** |

**`b-scale-2` stays the warm-up and becomes a rung.**
- Its warm-up take is the cell's cold check when it is the first sounding take of that cell that day and qualifies under §1.4: ≥ 1 h gap, full click, probe band. Otherwise it is warm.
- The key session already plays the warm-up first, so "cold check first" holds.

---

## 6. Ear, voice, drums; reading and rhythm

### 6.1 Ear

**No T7–T8 content from this doc.** The Ear level is SPEC-EAR-INTELLIGENCE's feature-based difficulty (v14 §1.2, §1.14). In the Ear audit, check that the two top difficulty bands mapped to T7–T8 each hold ≥ 3 skills.

### 6.2 Voice: full at T7, capped there (Q11)

**Area mapping** (v14 voice areas: pitch, time, range / agility, harmony). Tiers come from the path rating (`stepCatalogue`, §1.2 step 3), except `voiceTop` (RSL grade where named, [E] per item) and the Q11 cap at T7.

| Area | Families | T5 | T6 | T7 |
|---|---|---|---|---|
| pitch | `v-pitch`, `v-scale`, `v-ear` (the singer's ear), `v-barry`, `v-arp2` (RSL G6–8 → T5–T7 [E]), `v-leaps` (by interval order with `v-arp2` [E]) | 6 | 10 | 8 |
| time | `v-time` | 1 | 4 | 6 (1109, 1107, 1110; 1111–1113 capped) |
| range / agility | `v-range`, `v-breath`, `v-vib`, `v-agility`, `v-runs` (2221 T6, 2222–2223 T7 [E]) | 7 | 6 | 10 (incl. 1611, 1601, 1602 capped) |
| harmony | `v-harmony`, `v-part` (2241 T6, 2242–2243 T7; read from a score, but the graded skill is holding one part against the others, so it is harmony; harmony T7 keeps ≥ 9 items without it), `v-scat` and `v-scat2` 2261–2262 (chord-tone landing; trading-fours levels excluded) | 3 | 4 | ≥ 9 |

- **Not voice areas:**
  - `v-sight` (reading / Ear sight-singing);
  - `v-quick` (reading);
  - `v-songs`, `v-standards`, `v-style`, `v-pop`, `v-impro`, `v-jazz1` (learned or memorised material: coverage);
  - `v-inflect`, `v-dyn` (hint-only proxies: coverage);
  - `v-scat2-3` and other trading fours (coverage);
  - `v-top` (coverage only, vocal health: "comfortable tessitura, never extremes", §1.10; a warm-up gate and a stop-on-strain brief).
- **Flow audit item:** check that no `v-range` level used for rank pushes the range to its extremes.
- **Inherited below-floor tiers.** By rating, voice time holds only 1 exercise at each of T2–T5 (one `v-time` level per tier). That is below the v14 floor, but it predates this plan and sits outside the T7–T8 scope. It goes to the voice flow audit; §1.7 grouping keeps those tiers rankable meanwhile.
- **The 30 ¢ band** applies from T5.
- **Content exists above T7.** Existing levels rate as T8 by their path rating: `v-time` 1111–1113, `v-agility` 1611 / 1601 / 1602, `v-scat` 1504–1510, `v-barry` 307, `v-scale` 108. `voiceTop` also rates as T8, but it keeps its RSL-based T5–T7 tiers. Q11 caps the rest at T7. Whether to open voice T8 now is Q12 (§8), still pending. T7 stays the default in this plan; Appendix A lists what opening T8 would need.

### 6.3 Drums

- Rudiments follow v14 §1.2: complexity family, then nps.
- Ratings come from `DRUM_TOP_PLACEMENT`; overrides are listed.
- **Not counted:** `d-trade` (coverage only) and `d-brush` (acoustic, self- or teacher-rated, §13.6: unavailable on an e-kit, not in the core floor).
- Each level is counted in one area only.

| Area | T7 | T8 | Overrides and notes |
|---|---|---|---|
| Rudiments | `d-pas-7` pataflafla, `-10` double ratamacue, `-11` triple ratamacue (the RSL grade-8 set, AUDIT-5-INSTRUMENTS.md:349, :399 [R]); `d-pas-6` 17-stroke and combined rolls *(judgment call [E]: combined rolls are a grade-8 item in the stageCPlacement comment, not in the AUDIT-5 list)*; `d-stick-1` every 4-note sticking in 8ths, `d-stick-2` in 16ths (rating seed T7) | `d-stick-3` 8-note stickings in 16ths, `-4` 6-note stickings in triplets, `-5` moving accent; the T7 rudiments at the diploma rate [E] | Family overrides: `d-pas-6`, `-7`, `-10`, `-11` seed to T8 (G8 + 140 … 290) but are placed at T7, as the grade-8 set. `d-pas-1`–`5`, `-8`, `-9`, `-12` go below T7 by family (their seed of T7–T8 is overridden: early PAS rudiments). Their T3–T6 placement is the drum flow audit's. Buzz rolls are graded on quality, not rate |
| Coordination | `d-chapin-1`, `-2`, `-3` | `d-chapin-4`, `-5`, `-6` four-way, `d-stick-6` around the kit | `d-chapin-2` / `-3`: seed T8 → T7 (ladder order, catalogue floor) |
| Grooves / styles | `d-synco-1`, `-2`, `d-linear-1`, `d-oddtempo-1` (5/4 at tempo, RSL G8) | `d-synco-3`–`6`, `d-linear-2`–`5`, `d-oddtempo-2`–`5` | — |

### 6.4 Reading and rhythm / time: out of scope (logged)

These areas are in §1.10 for piano, guitar and bass (reading for drums); this plan does not give them T7–T8. **Add to the SPEC-HOLISTIC-2 §17.5 backlog:**
- **Reading.** Reading T comes from catalogue quantiles (§1.2). T7 needs a grade-8 reading level per instrument: piano `k-read` reaches the ABRSM G8 quick study; guitar `g-reading-8` and bass reading stop near G7. T8 needs a diploma parameter set for the rule-generated reading items.
- **Rhythm / time.** Candidates exist (`b-time-12` / `13`, `g-meter`, piano polyrhythm). They need a subdivision mapping to T7–T8.
- **Voice T8** (Q11, or Q12 if opened).

---

## 7. Course-change checklist

| Item | Impact |
|---|---|
| Ladders (`keyIndex.ts`) | Piano T6–T8 rungs; the piano and guitar voicings leave block B for S (harmony, fixed tempo); guitar and bass re-tiered (§4.2, §4.3). Arpeggio rungs gain nps spans (piano, guitar; bass only at the RSL steps). The bass warm-up becomes a rung. |
| Jazz early opening | keyIndex.ts:688: the 2-tier shift only for rungs with `min` ≤ 5, capped by v14 entry; T6–T8 rungs open at `min` (§1.3). |
| Style gate | `guitarLevelShown`: remove the add-on gate for **every** add-on and the country-flag gate (SPEC-STYLE-FOCUS §8.1: no locks). Style-only items stay visible and openable, unweighted. Rank "available" counts them only for learners with that style (§1.3). |
| Per-instrument tables | `tierOfNps`, `BENCH_NPS`, `SPEED_NPS`, `EXAM_NPS`, `itemTier`, target tempo (§2.4). |
| `contentTier` | Set by §1.2. Guards: every spec has one; guitar and bass `contentTier` = syllabus tier unless the override list names the level; **the §1.5 guard:** `max` only on block A or allow-listed single-chord arpeggio kinds, and every chord-step / degree-sequence kind maps to harmony (bass: arpeggios / chord tones); the major-row Aeolian and the minor-row natural minor share one `exerciseId`. |
| Harness | `realCatalogue.ts`: spans for arpeggio rungs only; struck chords and degree sequences mapped to harmony (§1.5); per-instrument bands; the bass span steps (T2, T3, T5, T8 only); the warm-up rung; the new rungs; style-only items unavailable. Re-run `npm run measure-sim`. The guard "rotation-only climbs reach every tier with content, no stall ≥ 42 d" now covers T7–T8. Check the H10 rising-challenge metric at T6–T8. |
| `verifiedContent.ts` | Hidden items are unavailable for counting. Every T7–T8 Harris tier meets the floor with shown items only: `k-sharm-40` / `41` (shown parts), `g-hlfast`, `b-harrisline` (5, 9 hidden), the new `k-hlfast` / `b-hlfast`. |
| T names vs badge ranks | Two exports are named `TIER_NAME`: `drills/tiers.ts` (First steps … Diploma: the T scale) and `ranks.ts:44` (Bronze … Master: the rating-division badges, `badges.ts:206`). Rename the T-scale export (`T_TIER_NAME`). Course sections use its names ("Grade 8" T7, "Diploma" T8). |
| "Master" (Q5) | §1.10 "never full below Master" means rank T8. Amend the text to "never full below T8 (Diploma), or below the course's top tier (voice: T7 while Q11 stands)", so it does not read as the badge rank `master` (`MASTER_AT` 1550). The top tier's bar may show full. |
| Spec text | SPEC-HOLISTIC-2 §1.10 "Top tiers" and the §17.5 backlog line are replaced once the content ships. §1.2 gains the per-instrument bands, the bass content-first rule, the factors (§2.5), the style rule (§1.3) and the line rule (§1.4). |
| Path ratings | `LEVEL_PLACEMENT` entries for each new level: `k-hlfast`, `b-hlfast`, N3, N15, the RH line over a walking bass, polyrhythm with figures, comping while soloing, the bass duo lines, and the guitar sequence levels. |
| Level badges | Badge counts per catalogue level are test-checked (`badges.ts:569`, `:696`). New levels update those counts. |
| Brief / gate page | Each new exercise gets its gate page (text, refresher, Play). |
| Rubato first | New laddered rungs start untimed. The at-tempo levels (`k-hlfast`, `b-hlfast`, `g-hlfast`) inherit the rubato stage of their source rows, which are their prerequisite. Fixed-tempo rungs start untimed only with new pitch content (SP §15.2). |
| Openers | Course openers name the top sections. Unit openers for the new units: piano / guitar "Harris harmony at the top", "Lines at tempo"; bass "Walking at the top", "The duo line"; guitar "Sequences". |
| Skill map / radar | Axis to T8; DYN "ff" (T7–8) becomes real. Voice shows T7 as its top. |
| Level test | A T7 and a T8 probe step per area (breadth-first, one take per step, SPEC-LEVEL-TEST). **Voice: a T7 probe per area, no T8 probe** (Q11). **Drum probes:** rudiments T7 `d-pas-7`, T8 `d-stick-5`; coordination T7 `d-chapin-2`, T8 `d-chapin-6`; grooves T7 `d-oddtempo-1`, T8 `d-linear-4`. Guitar already places the diploma jazz families via Harris lines at tempo (`levelTest.ts:336`); add the same for piano and bass. Re-check the guitar and bass placement probes against the new bands. |
| Glyphs | `FAMILY_GLYPH` / `TOPIC_GLYPH` for the new families, in the Paper icon language. |
| Everything-connects | Every new rung feeds path, map, XP (promotion XP per tier, §3 caps), leagues, level test, workout / key session. |
| i18n | Hebrew and English titles; catalogue entries per offered locale. |
| Flow audit (§13.1) | Every changed ladder passes it before shipping: the gap fills, the Harris order (including the rung order inside a tier, §1.5), the guitar re-tier, the §1.5 moves, the drum T3–T6 rudiment placement, the voice range check. |

---

## 8. Owner questions and notices

| # | Question | My recommendation |
|---|---|---|
| Q12 (pending) | **Voice T8 content already exists.** The Q11 answer rested on my earlier, wrong reading that voice had no grade-8 material. Existing voice levels rate as T8 by their path rating: `v-time` 1111–1113, `v-agility` 1611 / 1601 / 1602, `v-scat` 1504–1510, `v-barry` 307, `v-scale` 108 (`voiceTop` keeps T5–T7). None is a range extreme. Keep voice capped at T7 (Q11), or open voice T8 with these levels? | Open T8 for time, agility, pitch and harmony with these levels; Appendix A has the full change list. Keep `v-top` coverage only. |
| Notice (Q6) | You wrote "in the lines area". v14 gives bass no line area, so the Harris lines at bebop tempo sit in **bass / scales**, where v14 puts Harris's scale language. A separate bass line area would need a v14 change. | No change needed unless you want a bass line area. |

**Not in the plan (only verified theory):**
- the elevator with borrowing (`el-borrow`);
- the voicing ladder's thirds / triads / octave chords (`vl-ladder`);
- the 5-4-3-2 phrases;
- compose a line (`g-harrisline-9`, `b-harrisline-9`);
- the blues outline (`b-harrisline-5`);
- Echols's octave chord;
- the family movement inside one V;
- major arpeggios chromatically down.

All stay hidden (BARRY-HARRIS-THEORY §12). Every new item is rule-generated, a card the player improvises on, or a chord chart. No Claude-composed demos or backing.

## Appendix A. If voice T8 opens (Q12)

T7 stays the default in this plan. If the owner opens voice T8, these changes make it ready:

| Item | What changes |
|---|---|
| Which levels move | The rating-T8 levels of the core families move to T8: `v-time` 1111–1113 (time); `v-agility` 1611 / 1601 / 1602 (range / agility); `v-scat` 1504–1510 minus the trading-fours levels (harmony); `v-barry` 307, `v-scale` 108 (pitch) |
| `voiceTop` | `v-arp2`, `v-leaps`, `v-runs`, `v-part` keep their T5–T7 RSL-based tiers. They do not move. `v-top` stays coverage only (vocal health) |
| Resulting counts | **T8:** pitch 2 (the floor), time 3, agility 3, harmony about 4–5. **T7:** pitch 6, time 3, agility 7, harmony ≥ 4. All are at or above the floor |
| Cents band | T8 requires **25 ¢**, one step tighter than T5–T7's 30 ¢ [E: a harness / owner value; 30 ¢ is the fallback if the harness finds 25 ¢ too strict for the pitch tracker] |
| Level test | Add a voice T8 probe per area (breadth-first, one take, after a ≥ 2–3 min warm-up, §1.4) |
| Label | Voice T8 is **rating-only**. No vocal syllabus defines a technical diploma tier (the diplomas are performance-based). The course page says so |
| Text | §1.10 "never full below T8" then applies to voice too; the "course's top tier" clause becomes unnecessary for voice |

## Owner decisions (2026-11-28)
- Q1: yes. Arpeggios and blocked octaves are tiered by scale-equivalent tempo (notes/s / 0.78).
- Q2: no shared speed scale. Each instrument is tiered by its own standards (guitar and bass by their own grade syllabi), so T7 means the same skill level within each instrument.
- Q3: yes. T7-T8 is mostly existing grade-8+ levels wired into the ladders, plus the few new rule-generated levels.
- Q4: yes. Non-ladder levels get their content tier from their path rating, and the flow audit confirms each placement.
- Q5: yes. Rank T8 is the "Master" in "never full below Master".
- Q6: include Harris lines at bebop tempo as a bass T8 item in the lines area.
- Catalogue rule: aim for >= 4 exercises per tier, floor 3.

## Sources
- RSL (Rockschool) Bass Syllabus Specification 2018, Technical Exercises, Debut–Grade 8 (RSL_Bass_Syllabus_Guide_2018, as hosted by newschool.ie). Also the Rockschool Bass Syllabus Guide 2012–2018, p. 25–27 (cloud.rslawards.com/file/download/rockschoolbass2012syllabus.pdf).
- ABRSM, Guitar syllabus from 2019, "Guitar grades: requirements and information", p. 11 speed table (complete_guitar_syllabus.pdf, as hosted by newschool.ie).
- RCM 2022 Piano Syllabus technical requirements, via J. Morin's ColorInMyPiano charts (in docs/RESEARCH-KEY-EXERCISES-AUDIT.md references).
- Repo: SPEC-HOLISTIC-2 v14, SPEC-STYLE-FOCUS §8, BARRY-HARRIS-THEORY, RESEARCH-KEY-EXERCISES-AUDIT, SPEC-GUITAR-TECHNIQUE, keyIndex.ts, harmLadder.ts (`K_HARM_DIFF`), guitarMeta.ts (`ADDON_FAMILY`), guitar.ts (`guitarLevelShown`), guitarTop.ts, bass.ts (`genChord` options), stageCPlacement.ts, voiceTop.ts, voiceFamilies.ts, path.ts (`stepCatalogue`), verifiedContent.ts, ranks.ts, tiers.ts.

## Owner decisions, round 2 (2026-11-28)
- Q7: yes. v14's catalogue rule (>= 3 per tier, floor 2, no lone 1-exercise bottom tier) replaces "aim for 4, floor 3".
- Q8: blocked octaves use 0.63 (RCM). Hands a 3rd/6th apart use raw tempo.
- Q9: yes. Guitar beginners start on pentatonics, blues shells and picking, as the syllabi do.
- Q10: yes. The diploma tempo for guitar and bass is grade 8 x 1.2, labelled an estimate.
- Q11: yes. Voice tops out at T7 for now; voice T8 goes to the backlog.

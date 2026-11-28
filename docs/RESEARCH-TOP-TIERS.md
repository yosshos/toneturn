# Top tiers T7–T8, per-instrument bands and the bass first tiers (research + spec proposal, v2, 2026-11-28)

Scope: SPEC-HOLISTIC-2 v14 §1 rank (T0–T8) caps at the top content tier, and `LadderRung.min` runs 0–6, so advanced players have nowhere to climb (§1.10 "Top tiers", §17.5 backlog). This doc:
- sets the tier rules the owner decided (2026-11-28, at the end);
- re-bands guitar and bass on their own syllabi;
- plans T7–T8 per instrument × area;
- fixes the bass first tiers and the bass walking gap;
- maps Ear, voice and drums;
- scopes reading and rhythm;
- lists the course-change checklist impacts and the remaining owner questions.

No code was changed. Every count and harness figure below was re-run on this branch (redesign-v2 with v14 merged): `realCatalogues()` for today's counts, and the §9.1 harness (`daysPerTier`, `climb`, 60 runs, the report's seed) on the proposed catalogues.

Marks: [V] verified source, [R] repo, [E] estimate (a harness or owner value). **new** = a level that does not exist yet.

---

## 0. Summary

1. **Each instrument is tiered by its own syllabus (Q2).** Piano: ABRSM / RCM. Guitar: the ABRSM 2019 guitar speeds plus the guitar levels' own `grade` field. Bass: RSL Bass 2018. Each takes a diploma step [E] for T8. Four code tables become per-instrument (§2.4).
2. **Bass has a flat syllabus tempo.** RSL bass plays scales and arpeggios at 100 bpm in 8ths from Grade 6 to Grade 8 [V], so bass tiers above T4 come from **content**. Tempo-only rungs exist only where RSL steps the tempo up (§2.3).
3. **Most T7–T8 content exists already** (Q3): the piano Harris harmonisation track (`k-sharm` 17–42), cadence charts, the guitar grade-8 to grade-11 levels (`g-harm`, `g-harris`, `g-cadlib`, guitarTop), and the bass `b-scale` / `b-chord` / `b-walk` / `b-cadlib` / `b-barry` / `b-harrisline` top levels. A short list of **new** rule-generated levels fills the remaining gaps (§4).
4. **Where tiers come from (Q4, made precise).** A syllabus grade, where the code states one, gives the candidate tier; otherwise the path rating does. The Harris order, the never-ladder list and the catalogue rule then override it, and every override is listed with its reason (§1.2).
5. **Bass: the first tiers and the walking gap are fixed** by wiring existing 12-key levels in. Under v14's 3 bass areas, today's walking area reaches its first rank in only 47 % of runs within 240 days (median 240 days, the cap), and stalls 1 climb in 60 for 44 days. Proposed: 16 days to the first rank, no stall. Scales and arpeggios now reach their first rank in 14–14.5 days, against 36–36.5 days today (§5).
6. **Voice and drums are mapped by syllabus grade and family.** Voice tops out at **T7**: its top items are RSL grade 6–8 work, and extremes of range are coverage only, for vocal health. Drums reach T8 (§6). **Reading and rhythm T7–T8 are out of scope** and logged as a backlog item (§6.4).

---

## 1. Rules this plan follows

### 1.1 Owner decisions and v14

| Rule | Source |
|---|---|
| Each instrument is tiered by its own standards: guitar and bass by their own grade syllabi, so that T7 means the same skill level within each instrument | Owner Q2 |
| Arpeggios and blocked octaves are tiered by scale-equivalent tempo (notes/s ÷ factor). Factors are per instrument (§2.5) | Owner Q1 |
| T7–T8 is mostly existing grade-8-plus levels wired into the ladders | Owner Q3 |
| Non-ladder levels: the rating gives a candidate tier, and the flow audit confirms each placement (§1.2) | Owner Q4 |
| Rank T8 is the "Master" of "never full below Master". Naming is in §7 | Owner Q5 |
| Harris lines at bebop tempo are a bass T8 item. v14 has no bass line area; the item sits in **bass / scales**, where v14 maps Harris's scale language | Owner Q6 + v14 §1.10 |
| **Catalogue rule (v14 §1.2):** every non-empty tier holds **≥ 3 available exercises, floor 2**. No lone 1-exercise tier at the bottom of an area followed by an empty tier. The harness found 3 to 6 per tier climb alike, so 4 is not required. The owner's earlier "aim ≥ 4, floor 3" is superseded by v14 (Q7 confirms) | v14 §1.2 |
| **Bass areas (v14 §1.10):** scales (A the scale's forms, D the hands, F Harris's scale language), arpeggios / chord tones (S, B), walking / groove (E) | v14 §1.10 |
| **Never tempo-ladder** voicings, comping, walking, ear or held-note items. Fixed-tempo areas climb by content; tempo is a sub-band, never a tier step | RESEARCH-KEY-EXERCISES-AUDIT §4.2; v14 §1.2–§1.3 |
| **Twelve keys are coverage, never a tier.** Every rung runs in 12 keys; "more keys" is never a content step | v14 §1.1 |
| Only verified theory. No Claude-composed music. Chord charts only, no protected melodies | owner rules |

### 1.2 Where a level's content tier comes from (Q4, precise)

Steps, in order:
1. **Ladder rungs keep `LadderRung.min`** as the seed (§1.2 of the spec). That is, except for guitar and bass, which are re-tiered by step 2.
2. **Syllabus grade, where the code or the syllabus states one.** Grade → T: Debut / pre-grade → T0, G1 → T1, G2–3 → T2, G4 → T3, G5 → T4, G6 → T5, G7 → T6, G8 → T7, diploma → T8.
   - **Guitar:** the level's `grade` field after `GUITAR_GRADE_UP`; grades 9–11 → T8.
   - **Bass:** the RSL Bass 2018 grade where the material first appears (§2.3).
   - **Voice:** the RSL grade the family names (`voiceTop.ts`: "v-arp2 … RSL G6–8").
   - **Drums:** the RSL grade of the rudiment family (§6.3).
3. **Otherwise, the path rating** gives the candidate: G(g) = 700 + 90·g. A rating < 1420 → the grade below; 1420–1509 → T7; ≥ 1510 → T8.
4. **Overrides, each listed:**
   - **the Harris order** (BARRY-HARRIS-THEORY §6: scales → moving inversions → borrowing → the 8 expressions → in context) beats steps 2–3;
   - **the catalogue rule** (no lone bottom tier; floor 2);
   - **the never-ladder list:** no tempo-only tier steps in fixed-tempo areas;
   - **§1.2 drum rudiments:** complexity family, then nps.
5. **The path rating is not a calibrated tier scale.** `k-sharm-11` rates 1230 (≈ T4) but sits at ladder T1; `k-sharm-3` rates 980 (≈ T2) at T0. So ratings never re-tier an existing ladder rung.

---

## 2. Tempo bands per instrument

### 2.1 Piano (unchanged)

| T | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| Scale bench, n/s (`BENCH_NPS`) | 1.8 | 2.0 | 2.5 | 3.3 | 4.0 | 4.8 | 5.3 | 5.9 | 7.0 |
| Bound above (`tierBounds`) | 1.9 | 2.1 | 2.8 | 3.6 | 4.4 | 5.0 | 5.6 | 6.5 | — |
| Grade | pre | G1 | G2–3 | G4 | G5 | G6 | G7 | G8 | diploma |

- **Sources:** ABRSM grade speeds [R]; RCM 2022 L8 ♩=88 16ths (5.9), L9 ♩=104 (6.9), L10 ♩=120 (8.0) [V].
- **`EXAM_NPS` (generate.ts:5469)** stops at grade 8 (5.87). It needs the diploma entry: 7.0 bench / 7.5 speed.

### 2.2 Guitar (new table)

Source: ABRSM Guitar 2019, "Guitar grades: requirements and information", p. 11 speed table [V]. Scales G1–G5 at ♩ 48 / 56 / 66 / 80 / 96, and 2-octave scales G6–G8 at ♩ 112 / 126 / 144. Read in quavers, this gives G8 = 4.8 n/s, which matches SPEC-GUITAR-TECHNIQUE.md:306 [R].

| T | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| Scale bench, n/s | 1.3 [E] | 1.6 | 2.0 | 2.67 | 3.2 | 3.73 | 4.2 | 4.8 | 5.8 [E] |
| Bound above | 1.45 | 1.8 | 2.35 | 2.93 | 3.47 | 3.97 | 4.5 | 5.3 | — |
| 8ths ♩ at the bench | 39 | 48 | 60 | 80 | 96 | 112 | 126 | 144 | 174 |

- **T8 = G8 × 1.2,** the v14 tempo model's one-tier step. No guitar diploma scale-speed table was found.
- **Guitar `SPEED_NPS`** = the next tier's bench, with T7 5.3 and T8 6.4.
- **Note value caveat.** The table glyphs did not survive text extraction, so quavers is an inference. It is cross-checked by the repo's 4.8 n/s and by ABRSM's 3-octave scales being given in dotted crotchets (triplets).
- **Consequence:** `g-speed-1` starts at 16ths ♩96 = 6.4 n/s, above the guitar T8 bench. It is a T8 (diploma-grade) exercise whose tempo climbs inside T8.

### 2.3 Bass (new table)

Source: RSL (Rockschool) Bass Syllabus Specification 2018, Technical Exercises [V]. The 2012–2018 guide gives the same tempos.

| RSL grade | Tempo, scales and arpeggios | n/s | Content added |
|---|---|---|---|
| Debut | 70 bpm (note value not stated; quarters inferred) | 1.17 | major, minor pentatonic; major and minor triads |
| G1 | 70 | 1.17 | natural minor, major pentatonic |
| G2 | 80 | 1.33 | (same, more keys) |
| G3 | 90 | 1.5 | blues; dominant-7th arpeggio |
| G4 | 80, **one octave in 8ths** | 2.67 | 8th-note subdivision |
| G5 | 80, 8ths; arpeggios two octaves | 2.67 | harmonic minor |
| G6 | 100, 8ths | 3.33 | minor pentatonic in all 5 positions; Dorian and Mixolydian in two positions; m7♭5 and dim arpeggios |
| G7 | 100, 8ths | 3.33 | major two octaves; Lydian, Phrygian, jazz melodic minor; maj9 / m9 / dom9 arpeggios; high-register chords |
| G8 | 100, 8ths | 3.33 | whole-tone, diminished, altered; natural minor two octaves; 7♯5 / 7♭5 / 7♯9 / 7♭9 arpeggios |
| Diploma | 120, 8ths [E] (G8 × 1.2) | 4.0 | beyond RSL: the melodic- and harmonic-minor modes, Harris lines at bebop tempo (Q6) |

**Bass tier rule (consequence of Q2):**
- **Content first.** A bass rung's tier is the RSL grade where its material first appears.
- **nps rungs only where RSL steps the tempo:** T2 (80–90 bpm), T3 (8ths at 80), T5 (8ths at 100) and T8 (diploma [E]).
- **Elsewhere, tiers differ by content only.** T0 = T1 tempo, T3 = T4, T5 = T6 = T7.
- **Bass `tierOfNps`** therefore returns band floors, used only for tolerance: < 1.25 → T0, < 2.0 → T2, < 3.0 → T3, < 3.7 → T5, else T8.
- **Bass bench:** [1.17, 1.17, 1.4, 2.67, 2.67, 3.33, 3.33, 3.33, 4.0].

**Swung lines** (8ths, n/s = ♩ ÷ 30) have no syllabus. Their bands are harness / owner values [E]:

| Instrument | T7 | T8 |
|---|---|---|
| Piano | ♩ 168–195 | ♩ ≥ 195 |
| Guitar (from its bounds) | ♩ 135–159 | ♩ ≥ 159 |
| Bass | ♩ 160–200 (cf. `b-barry-6` ♩120–200) | ♩ 200–240 (bass 8ths at ♩240 ≈ 8 n/s) |

### 2.4 Code tables that must become per-instrument

| Table | File | Today | Change |
|---|---|---|---|
| `BOUNDS` / `tierOfNps` | src/engine/drills/tierBounds.ts | one piano table | `tierOfNps(nps, inst)`: piano / guitar / bass tables (§2.1–§2.3) |
| `BENCH_NPS`, `SPEED_NPS` | src/engine/drills/stages.ts:68–70 | one piano table | per instrument, `benchNps(tier, inst)` / `speedNps(tier, inst)` |
| `EXAM_NPS` | src/engine/drills/generate.ts:5469 | piano G1–8 only | piano + diploma; guitar (ABRSM scales, arpeggios × 0.8); bass (RSL, arpeggios × 1.0) |
| `itemTier` | src/engine/drills/tiers.ts | `tierOfNps` of the raw nps | the instrument's table, and for content tier only the arpeggio / octave factor (§2.5); tolerance keeps the raw tempo |
| `tierTiming` callers | src/engine/drills/analyze.ts | piano tiers | the instrument's tier |
| `itemTargetBpm` / target tempo | src/engine/drills/plan.ts, targetTempo.ts | piano bench | the instrument's bench |

### 2.5 Scale-equivalent factors (Q1, per instrument)

| Material | Piano | Guitar | Bass |
|---|---|---|---|
| Arpeggios | 0.78 (RCM ratios [V]) | 0.8 (ABRSM 2019: G6–G8 arpeggios ♩96 / 104 / 116 against scales ♩112 / 126 / 144, 0.81–0.86; same table caveat) | **1.0** (RSL 2018: arpeggios at the scale tempo, G4–G8 [V]) |
| Blocked octaves | **Q8:** the decision text says ÷ 0.78; RCM gives 0.63 | — (no syllabus octave scales; raw tempo) | — |
| Hands a 3rd / 6th apart | raw tempo unless the owner approves 0.87 (Q8) | — | — |

- **Check:** the piano factor matches **RCM** (L8 arpeggios 4.6 ÷ 0.78 = 5.9 → T7; L9 5.6 → T8; L10 6.1 → T8).
- **It does not match ABRSM at every grade.** The ABRSM G7 arpeggio, 3.73 ÷ 0.78 = 4.78, lands at T5 while the G7 scale is T6.
- **Scope:** the factor sets the content tier of **nps rungs**. Existing arpeggio rungs keep their ladder mins.

---

## 3. Current counts (code, this branch)

`realCatalogues()`; piano and guitar on the 5 areas, bass on v14's 3.

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

**Guitar ladder mins disagree with the guitar grades.** Today's guitar ladder mins sit 1–3 tiers below the levels' own syllabus grades. For example, `g-harm-2` diatonic 3rds is grade 4 (T3) but at ladder T0; `g-picking-3` 3nps is grade 6 (T5) but at T2. Q2 re-tiers them up (§3.2).

---

## 4. The proposal

Proposed counts (all 12-key rungs, unless marked as area only), with the §9.1 harness on each proposed area (p 0.75 at the next tier, 3 days a week):

| Instrument / area | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | First rank, days | Median transition, days | Climb stalls ≥ 42 d |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| piano / scales | 0 | 1 | 2 | 3 | 7 | 6 | 7 | 7 | 7 | 35 (T1, unchanged) | 21 | 0 |
| piano / arpeggios | 0 | 0 | 0 | 8 | 5 | 6 | 7 | 6 | 6 | 13 (T3) | 24 | 0 |
| piano / harmony | 6 | 5 | 2 | 3 | 8 | 2 | 7 | 16 | 10 | 14 | 21.5 | 0 |
| piano / independence | 0 | 2 | 4 | 9 | 2 | 3 | 2 | 5 | 3 | 20 | 23.25 | 0 |
| piano / line-jazz | 0 | 0 | 0 | 0 | 0 | 4 | 6 | 8 | 8 | 17 (T5) | 19 | 0 |
| guitar / scales | 0 | 2 | 3 | 5 | 7 | 12 | 16 | 17 | 15 | 20 (T1) | 20 | 0 |
| guitar / arpeggios | 0 | 0 | 2 | 3 | 9 | 6 | 9 | 4 | 5 | 20 (T2) | 21 | 0 |
| guitar / harmony | 0 | 0 | 3 | 4 | 3 | 8 | 13 | 9 | 8 | 16.5 (T2) | 20 | 0 |
| guitar / independence | 0 | 2 | 5 | 2 | 3 | 2 | 2 | 3 | 4 | 21 (T1) | 25 | 0 |
| guitar / line-jazz | 0 | 0 | 0 | 0 | 0 | 2 | 6 | 7 | 13 | 21 (T5) | 19.5 | 0 |
| bass / scales | 5 | 5 | 8 | 8 | 5 | 9 | 10 | 12 | 7 | 14.5 | 21.5 | 0 |
| bass / arpeggios | 4 | 3 | 6 | 5 | 3 | 3 | 4 | 4 | 4 | 14 | 26.5 | 0 |
| bass / walking | 3 | 3 | 4 | 3 | 4 | 4 | 4 | 4 | 3 | 16 | 22.5 | 0 |

- **Every proposed climb reaches every rankable tier,** T8 included, within 365 days (steady learner, 60 runs), with no stall ≥ 42 days.
- **Floor-2 tiers** (v14 floor, below the ≥ 3 target): piano harmony T2 and T5, piano independence T1 and T6, guitar arpeggios T2, guitar independence T1, T3, T5 and T6, guitar line-jazz T5. All but piano harmony T5 / independence T6 are inherited or bottom tiers.

### 4.1 Piano

**Scales** (nps rungs; T7 target 5.9, T8 7.0 n/s):

| T7 and T8 rungs | Notes |
|---|---|
| `scales-10` major 4 octaves HT 16ths (new rung 6–8); `aeolian:scales-33` and `melodic:scales-33` (max → 8); `scales-36` harmonic minor 4 octaves (minor rows, 6–8); `scales-32` the modes 4 octaves HT (6–8, counted once); `scales-8` a 3rd / 6th / 10th apart (span 4–8, raw tempo per Q8); `scales-14` chromatic a m3 / M6 apart (6–8) | RCM L8–L10 [V]. Small hands: `scales-8` 10ths → 3rds |

**Arpeggios** (factor 0.78: T7 target 4.6 n/s = 16ths ♩69, T8 5.5 = 16ths ♩82; RCM L8 ♩69, L9 ♩84 [V]):

| T7 and T8 rungs | Notes |
|---|---|
| `k-sharm-47` 9ths on every degree, minor `k-sharm-48` (span 5–8); `arpeggios-12` 3 octaves HT, jazz 7ths HT (6–8); `arpeggios-15` contrary motion: minor, dom7, dim7 (6–8); `arpeggios-16` dom7 and dim7 4 octaves HT (6–8); **new** N3 broken alternate-note four-note chords on I, V7, vii°7 (6–8) | N3: RCM L9–10 ♩80 / ♩96 16ths [V]. Hand-over-hand stays capped below T7 |

**Harmony / voicing** (fixed tempo; the Harris track in §6 order; seed = rating, overrides listed):

| Tier | Exercises | Count |
|---|---|---|
| T3 (gap fill) | `k-cadlib-1` shells, `-2` guide tones, `-3` shells over substitutes | 3 |
| T6 (moving inversions, first borrowing) | `k-sharm-17` drop 3 (major), minor `k-sharm-18` drop 3 (minor and Harris scales), `k-sharm-19` borrowing one voice (6th-dim), `k-sharm-20` borrowing one voice (m6, 7, 7♭5-dim); existing `k-cadlib-23` / `24` / `26` | 7 |
| T7 (borrowing completed, the elevator, the moves) | `k-sharm-21` two voices, `-22` the chord above / another dim / passing, `-24` in drop 2, `-25` in drop 3, `-38` three voices, `-35` drop 2&4, `-33` the elevator from the tonic, `-40` the minor 6-dim elevator from the tonic, `-34` 7th-dim / 7♭5-dim scales in drop 2 / 3 over V7 → I, `-37` Harris's moves, `-36` the sixth on the fifth, `-41` Echols's shells (shown items only); `k-cadlib-17` / `18` four-way close, `-20` / `21` two-hand voicings | 16 |
| T8 (the 8 expressions, then in context) | `k-sharm-26` the eight expressions in drop 2 → I6, `-39` the related dominants over a shell / the tritone's minor, `-29` mixing the expressions per bar, then in context: `-30` comping a turnaround and a jazz blues with the substitutions, `-31` borrowing inside the substitutions, `-23` borrowing while walking over ii–V–I and a turnaround, minor rows `-32` minor ii–V–i (Harris), `-42` a substitute on each V of a tune (area only, chord charts); `k-cadlib-22` four-way close + two-hand over longer forms, `k-reharm-8` upper structures over a pedal, `k-reharm-4` reharmonising in the key | 10 |

**Rating seed vs placement** (`K_HARM_DIFF`, harmLadder.ts). The overrides:

| Level | Rating → seed | Placed | Reason |
|---|---|---|---|
| `k-sharm-17`, `-18` | 1520, 1600 → T8 | T6 | §6 order: moving inversions (drop 3) precede borrowing (`-19`, seed T6) |
| `k-sharm-24`, `-25`, `-38` | 1600, 1650, 1520 → T8 | T7 | §6 order: borrowing finishes before the 8 expressions (T8) |
| `k-sharm-35` | 1620 → T8 | T7 | moving inversions (drop 2&4) precede the expressions |

Every other `k-sharm` placement equals its seed (`-19`, `-20` T6; `-21`, `-22`, `-33`, `-34`, `-36`, `-37`, `-40`, `-41` T7; `-23`, `-26`, `-29`–`-32`, `-39`, `-42` T8). `-27` and `-28` are lines (below). Fm6 / Bm6 appear only inside `-26` / `-29` at T8, which is the Harris way's H-5 (BARRY-HARRIS-THEORY §4), at low weight.

**Independence** (content steps only; "more keys" is never a step):

| Tier | Exercises |
|---|---|
| T7 | `advanced-3` chromatic and HT octaves (capped, ≤ 2 octaves); `advanced-6` polyrhythm 2:3 / 3:4 hands swapped (`advanced-7` "in more keys" is folded in as coverage, not a tier); `advanced-8` hand crossing, leaps, double 6ths (capped); `fingers-13` Czerny-style velocity runs over the LH; SP item 37 rung 5 (one hand leaps, the other holds a pattern) |
| T8 | **new** N15 chromatic scale in octaves, 16ths ♩60 → 80 (RCM L10 [V]; capped reps); **new** RH generated line over a LH walking bass (SP item 7 extended); **new** polyrhythm with moving figures: a RH scale in 3 against a LH broken chord in 4, then swapped |

**Line-jazz:**

| Tier | Exercises |
|---|---|
| T6 | existing `k-tpair-2`, m6dim `scales-31`, m6dim `k-sharm-12`; `harris-25` minor 6th-dim scale, `harris-26` dominant 7 / 7♭5-dim scales, `k-harrisline-19` the chromatic scale in two voices |
| T7 | `k-harrisline-33` the dominant rule from every degree (three or two), `-16` the minor rule from every degree, `-12` the major rule (three, and two from 2 and 4), `-20` 3 to ♭9 over the family, `-21` seven down to the 3rd, `-34` the chromatic scale in two voices, every interval; `harris-22` the pivot through ii–V–I, `harris-15` ii–V–I lines by the rules |
| T8 | **new** `k-hlfast-1` … `-4`: Harris lines at bebop tempo, piano swung band (chromatic scales and outlines; the rules from every degree; seven down / 3 to ♭9 / the triplet rules; lines through whole outlines). Shown devices only; mirrors `g-hlfast`. Also `k-sharm-27` / `-28` each expression's scale over V–I (lines go with the expressions at T8); **new** comping while soloing (RH line card over LH rootless comping cells, §8.8); `k-bebop-9` lines over whole forms (area only, chord charts) |

Harness: §4.4.

### 4.2 Guitar (re-banded, T0–T8)

**Rule:** content tier = the level's `grade` tier (§1.2). Scale and arpeggio rungs start at their grade tier, and their nps rungs then climb the guitar bench (§2.2). There is **no guitar key-ladder content at T0**: the grade-0 material (`g-first`) is keyless. A beginner places at T1, since `placedTier` snaps to a non-empty tier.

| Area | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|
| Scales | `g-scales-1` min. penta box 1 (minor rows); `g-scales-3` blues + maj. penta *(override G3 → T1: the pentatonic pair; catalogue rule)* | + `g-scales-12` interval shapes | + `g-scales-4` E/A shapes, `g-scales-2` boxes 2–5 | + `g-scales-5` 5 CAGED, `-8` connecting, aeolian / harmonic `-13` | + `g-picking-3` 3nps, Dorian / Mixolydian `-14`, aeolian `-16`, harmonic `-17`, `-11` Segovia | + Lydian / Phrygian / melodic `-15`, melodic `-18`, `-9` 3nps whole neck, `-6` 7 patterns | + `-10` interval sequences, Locrian `-7`, `-19` / `-20` minor modes, `-21` dim W–H | + `g-speed-1` |
| Arpeggios (×0.8) | — | `g-arps-1` major and minor triads (two rows) | + `g-arps-2` CAGED triads | + `g-arps-3` inversions, `g-harm-3` 3rds double stops, `g-harm-15` cells, `g-arps-4` 7ths | + `g-arps-6` 7ths in 5 shapes | + `g-harm-14` triads and inversions, `g-harm-16` 9ths | + `g-arps-7` 9 / 13 / upper structures | + `g-speed-3` sweeps at speed |
| Harmony (fixed) | — | `g-jblues-2` shells, `-3` guide tones, `-4` Charleston (blues in the key) | `g-harm-2` (3 rows), `g-vl-1` | `g-harm-4` (3 rows) | `g-harm-6` (5 rows), `g-cadlib-1` (2 rows), `g-harm-5` block triads | modal / melodic `g-harm-2` / `4` / `6` *(override: the mode follows its scale's grade, G7)*, `g-cadlib-2`–`5`, `g-harm-7` drop 2, `g-harris-2` scale of chords | `g-cadlib-6`–`9`, `g-harm-8` drop 2, `-9` drop 3 and drop 2&4, `-10` / `-11` borrowing, `g-harris-7` | `g-cadlib-10`, `g-harm-13` borrowing on other sets, `g-harris-11` the 8 expressions / moves, `-12` the expressions' scales / elevator, `g-harm-12` and `g-harris-13` in context, `g-harris-6`, `g-solojazz-1` |
| Independence | `g-picking-1`; `g-fretting-1` *(override G2 → T1: no lone bottom tier)* | `g-legato-1` / `2`, `g-fretting-2` / `3`, `g-picking-2` | `g-fretting-4`, `g-legato-3` | `g-picking-4`, `g-legato-4`, `g-fretting-6` (widen to 12) | `g-fretting-5`, `g-picking-10` | `g-legato-5`; **new** picked 3nps sequences (groups of 3 / 4, inside and outside crossing), 8ths | `g-legato-7`; **new** legato sequences in 16ths; **new** picked sequences in 16ths | `g-speed-2`, `-4`, `-5`, `g-fusion-2` (capped stretch) |
| Line-jazz | — | — | — | — | `g-harris-1`, `g-harrisline-10` ABCs | `g-tpair-1` / `2`, `g-harrisline-1`–`4` | `g-scales-21` bebop dominant on V, `g-harrisline-6`, `g-tpair-3` / `4`, `g-harris-4` / `8` / `9` | `g-harrisline-7` (effective grade 9), `g-tpair-5`–`7`, `g-harris-10`, `g-hlfast-1`–`4` (♩140–240, tier by content, tempo climbs inside T8), `g-fusion-1` / `3` / `4` / `5` |

Notes:
- **Voicings are fixed-tempo harmony rungs, never nps rungs:** `g-harm-5` / `7` / `8` / `9`, `g-harris-2` / `7`. `g-harm-7` / `8` move out of the arpeggio block, where today's ladder has them as B rungs.
- **Not counted in the core:**
  - genre-tagged levels: `g-arps-5` (jazz, rock, blues), `g-picking-5` / `6`, `g-legato-6`, `g-picking-7` (style focus only);
  - prog add-ons (`g-picking-8` / `9`, `g-legato-8`);
  - `g-harrisline-9` (compose a line: hidden, not pursued).
- **`g-harrisline-7`** is grade 8 in harrisLineDrills.ts but 9 via `GUITAR_GRADE_UP`. The effective grade is 9. Align the code comment.

### 4.3 Bass (RSL-banded, v14 areas, T0–T8)

All rungs are 12-key at runtime. `b-fret-6` (4 keys) widens to 12. Open-string levels (`b-pluck-1`–`3`, `b-legato-5`, 1 key) are not rungs.

| Area | T0 (Debut) | T1 (G1) | T2 (G2–3) | T3 (G4, 8ths) | T4 (G5) | T5 (G6) | T6 (G7) | T7 (G8) | T8 (diploma) |
|---|---|---|---|---|---|---|---|---|---|
| Scales (A, D, F) | `b-scale-2` major; `b-scale-1` minor penta; `b-fret-1` chromatic; `b-fret-2` permutations; `b-legato-1` slides | natural minor `b-scale-3` (minor rows); major penta; aeolian `b-scale-3` (major rows); `b-fret-3` Simandl; `b-legato-2` | the T0–T1 scales at the T2 tempo (nps rungs); blues; `b-pluck-4` skipping; `b-fret-4` shifts; `b-pluck-5` 16ths | the scales in 8ths (nps rungs); `b-scale-6` in 4ths; `b-fret-7` octaves and 10ths; `b-pluck-6` accents; `b-pluck-10` | harmonic minor `b-scale-7` (minor rows); `b-fret-8` upper register; `b-pluck-7` raking; `b-pluck-11` i-m-a; `b-fret-6` | Dorian / Mixolydian `b-scale-4`; `b-scale-10` five penta positions; `b-scale-5` linked; `b-barry-1` 6th-dim scale; `b-barry-3` half-step rules; `b-tpair-1`; harmonic minor at 100 | Lydian / Phrygian `b-scale-8`; Locrian; melodic minor `b-scale-7`; `b-fret-5` major 2 octaves; `b-tpair-2`; `b-barry-7` / `8` pivots; `b-harrisline-1` chromatic scale, `-10` ABCs | `b-scale-9` WT / dim / altered on V; natural minor 2 octaves `b-scale-12` (both rows); `b-scale-13` dim W–H and bebop dominant on V; `b-harrisline-3` / `4` / `6` / `7` rules; `b-barry-5` / `6` (a chorus of bebop lines); `b-tpair-3` / `4` | `b-scale-14` / `15` melodic- and harmonic-minor modes; harmonic / melodic 2 octaves `b-scale-12`; `b-tpair-5` side-slip; **new** `b-hlfast-1` / `2` / `3` Harris lines at ♩200–240 (Q6; shown devices) |
| Arpeggios (S, B; ×1.0) | `b-chord-2` R–5; `b-chord-3` R–5–8; `b-chord-4` triads (both rows; minor lowered from T2) | `b-scale-6` diatonic 3rds; `b-chord-5` inversions; `b-chord-17` 1-2-3-5 cells (major rows) | triads at T2 tempo; `b-chord-6` 7ths (dom7 first, RSL G3); `b-chord-15` diatonic 7ths; natural-minor `b-chord-16` (both rows) | the T2 arpeggios in 8ths (nps rungs) | `b-chord-7` two octaves; harmonic-minor `b-chord-16` and `b-chord-17` (minor rows) | `b-chord-6` at 100 (incl. m7♭5, dim); `b-chord-11` 7ths 2 octaves; `b-chord-7` at 100 | `b-chord-12` 9ths; `b-chord-18` 9ths through the scale (both rows); `b-chord-14` high-register chords (fixed tempo) | `b-chord-13` 7♯5, 7♭5, 7♯9, 7♭9 (four options = four exercises, §1.7 `exerciseId`) | `b-chord-11` / `12` / `13` / `18` at the diploma tempo [E] |
| Walking (E) | `b-chord-1` roots of a chart; `b-walk-1` two-feel; `b-walk-2` quarter roots and 5ths | `b-chord-8` chord tones; `b-walk-21` first blues line; `b-walk-3` arpeggio walk | `b-chord-9` nearest chord tone; `b-walk-4` chromatic approach; `b-walk-5` dominant approach; `b-chord-10` slash / pedal | `b-walk-6` scale-step approach; `b-walk-7` mixed approaches; `b-walk-8` ghosted skips and triplet drops | `b-cadlib-1` (both rows); `b-walk-14` in 2, ballads, bossa; `b-harrisline-8` ties on the upbeats | `b-cadlib-3` (both rows); `b-barry-4` the rule in a walk; `b-walk-19` jazz waltz | `b-cadlib-2` / `4` approach over substitutes / longer forms; `b-walk-10` rhythm changes; `b-walk-20` blues-waltz chorus | `b-cadlib-5` / `6` free walking over substitutes / longer forms + pedal; `b-walk-12` in 2 and in 4 (the two-feel switch is the content; ♩160–240 is a sub-band); `b-walk-16` sight-read and improvise the walk | **new** the duo line over the ii–V family; **new** the duo line over longer forms (no comping; every chord's 3rd and 7th sounded; `rulesOf`, §8.8); `b-walk-18` forms, cycles, Coltrane changes (area only) |

- **No tempo-only walking tier.** The old "`b-walk-12` at ♩240–300" exercise is dropped. T8 walking is content: the duo line and the Coltrane cycles.
- **Harmonic minor is T4,** per RSL G5. Melodic minor, Lydian and Phrygian are T6 (G7); Dorian and Mixolydian T5 (G6).

### 4.4 Harness detail (p 0.75 at the next tier, 3 d/wk; fixed ability)

| Area | Each transition, days (p 0.75, 3 d/wk) | p 0.85, 5 d/wk median |
|---|---|---|
| piano / scales | —→T1 35, 21, 20.5, 19, 21, 21, T6→T7 23, T7→T8 26 | 12 |
| piano / arpeggios | —→T3 13, 24, 24, 21.5, T6→T7 25, T7→T8 25.5 | 12 |
| piano / harmony | —→T0 14, 21.5, 35.5, 25, 19, T4→T5 43, 20, T6→T7 21, T7→T8 28 | 12 |
| piano / independence | —→T1 20, 19.5, 18, T3→T4 41, 25.5, T5→T6 35, T6→T7 21, T7→T8 31 | 12.5 |
| piano / line-jazz | —→T5 17, 19, T6→T7 19, T7→T8 25 | 11 |
| guitar / scales | —→T1 20, 20, 19, 20, 19, 21, T6→T7 25, T7→T8 27 | 11 |
| guitar / arpeggios | —→T2 20, 20, 18, 25, 21, T6→T7 30.5, T7→T8 24 | 11 |
| guitar / harmony | —→T2 16.5, 19, 24, 20, 19, T6→T7 22, T7→T8 26.5 | 11 |
| guitar / independence | —→T1 21, 18, 32, 23, 32, 32.5, T6→T7 25, T7→T8 25 | 13.25 |
| guitar / line-jazz | —→T5 21, 17, T6→T7 19, T7→T8 20 | 11 |
| bass / scales | —→T0 14.5, 20, 19, 21.5, 27, 21, 26.5, T6→T7 25.5, T7→T8 32 | 12 |
| bass / arpeggios | —→T0 14, 21, 19, 26.5, 28.5, 28.5, 25.5, T6→T7 28, T7→T8 28 | 13 |
| bass / walking | —→T0 16, 20.5, 20, 27, 21, 22.5, 26, T6→T7 28, T7→T8 33 | 12 |

- **The 35–43-day transitions are today's tiers with 2 exercises,** not new content: piano harmony T4→T5 and T1→T2, piano independence T3→T4 and T5→T6. They are outside this plan's scope; they are flagged for the flow audit.
- **The figures are the conservative fixed-ability case,** on the v14 harness defaults. v14's pooled 12–23 days span p 0.75–0.85 and 3–5 d/wk. These runs give 11–13.25 days at p 0.85 / 5 d/wk and 19–26.5 at p 0.75 / 3 d/wk.

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
4. **The ladder mins ignore the bass syllabus.** Harmonic-minor material sits at T2–T3 in today's minor rows (`b-chord-16` option 7, minor `b-chord-17`), while RSL puts harmonic minor at G5 (T4). Dorian / Mixolydian sit at T4, while RSL puts them at G6 (T5).

### 5.2 The fix and its effect

The fix is §4.3: about 25 existing 12-key levels wired in, with no new generators below T8.

| Area | First rank, today → proposed (p 0.75, 3 d/wk) | p 0.85, 5 d/wk | Median transition, today → proposed | Stalls, today → proposed |
|---|---|---|---|---|
| bass / scales | 36 → **14.5** d | 15 → 8 | 20.5 → 21.5 (now 9 tiers) | 0 → 0 |
| bass / arpeggios | 36.5 → **14** d | 15 → 7 | 23.5 → 26.5 (now 9 tiers; the T3→T4 jump of 38 d is gone, 28.5) | 0 → 0 |
| bass / walking | 240 (47 % reached) → **16** d | 44 → 9 | 70.25 → 22.5 | **1 (44 d) → 0** |

- The proposed T6→T7 and T7→T8 transitions take 25.5–33 days at p 0.75 / 3 d, and 12.5–17 days at p 0.85 / 5 d.
- That is close to v14's pooled 12–23 days. This is the conservative fixed-ability case.

**`b-scale-2` stays the warm-up and becomes a rung.** Its warm-up take is the cell's cold check when it is the first sounding take of that cell that day and qualifies under §1.4 (≥ 1 h gap, full click, probe band). Otherwise it is warm. The key session already plays the warm-up first, so "cold check first" holds.

---

## 6. Ear, voice, drums; reading and rhythm

### 6.1 Ear

**No T7–T8 content from this doc.** The Ear level is SPEC-EAR-INTELLIGENCE's feature-based difficulty (v14 §1.2, §1.14), not `LadderRung`. In the Ear audit, check that the two top difficulty bands mapped to T7–T8 each hold ≥ 3 skills (the 8 expressions by ear, line-implication ear, upper structures).

### 6.2 Voice: tops out at T7

**Area mapping of the top families** (`voiceTop.ts`; voice areas per v14 §1.10: pitch, time, range / agility, harmony):

| Family | Area | Tier (RSL Vocals grade; §1.2) |
|---|---|---|
| `v-arp2` 2201 / 2202 / 2203 (dim / aug; dim7 / ø; arpeggios that resolve) | pitch | T5 / T6 / T7 (the code names RSL G6–8) |
| `v-leaps` 2211 / 2212 / 2213 (6ths / 7ths; 9ths / 10ths kept inside the singer's range by octaves; tritones and chromatic leaps) | pitch | T5 / T6 / T7 *(override: no grade stated; rating seed T8; placed with `v-arp2` by interval order)* [E] |
| `v-runs` 2221 / 2222 / 2223 (pentatonic run in 16ths; chromatic runs; a blues melisma at tempo) | range / agility | T6 / T7 / T7 [E] |
| `v-part` 2241 / 2242 / 2243 (one part from the score) | harmony | T6 / T7 / T7 (ABRSM G7–8 aural) |
| `v-scat2` 2261 / 2262 (landing; approach and tensions) | harmony (chord-tone landing) | T7 / T7 |
| `v-scat2` 2263 trading fours | coverage only (Trading 4s, §1.10) | — |
| `v-quick` 2231–2233 quick study | reading, not a voice area | — |
| `v-style` 2251–2253 style studies (own melodies, learned) | coverage only (memorised material) | — |
| `v-top` 2271–2273 (the edge, above the top, the top-floor goal) | **coverage only.** Vocal health: range / agility is "comfortable tessitura, never extremes" (§1.10). A warm-up gate (≥ 2–3 min, §1.4) and a stop-on-strain brief apply | — |

**Per area at T7:**
- **pitch: 2** (floor met);
- **harmony: 4;**
- **agility: 2;**
- **time: none.** No grade-8 voice time item exists; the time area tops out at its current top.

**Voice T8: none.** Voice tops out at T7. Voice T8 and voice time T7 are logged as backlog (§6.4), never by extremes. The 30 ¢ band applies from T5.

### 6.3 Drums

Rudiments follow v14 §1.2: complexity family, then nps. Ratings from `DRUM_TOP_PLACEMENT`; overrides listed. `d-trade` is coverage only and not counted. `d-brush` is acoustic, self- or teacher-rated (§13.6), so it is unavailable on an e-kit and not counted in the core floor. Each level is counted in one area only.

| Area | T7 | T8 | Overrides |
|---|---|---|---|
| Rudiments | `d-pas-6` 17-stroke and combined rolls, `-7` pataflafla, `-10` double ratamacue, `-11` triple ratamacue (the RSL grade-8 set [R AUDIT-5, stageCPlacement]) | `d-stick-3` 8-note stickings in 16ths, `-4` 6-note stickings in triplets, `-5` moving accent; the T7 rudiments at the diploma rate [E] | `d-pas-1`–`5`, `-8`, `-9`, `-12` go **below T7 by family** (rating seed T7–T8 overridden: early PAS rudiments). Their T3–T6 placement is the drum flow audit's. Buzz rolls are graded on quality, not rate |
| Coordination | `d-chapin-1`, `-2`, `-3` | `d-chapin-4`, `-5`, `-6` (four-way), `d-stick-6` around the kit | `d-chapin-2` / `-3` seed T8 → T7: ladder order and catalogue floor |
| Grooves / styles | `d-synco-1`, `-2`, `d-linear-1`, `d-oddtempo-1` (5/4 at tempo, RSL G8) | `d-synco-3`–`6`, `d-linear-2`–`5`, `d-oddtempo-2`–`5` | — |

### 6.4 Reading and rhythm / time: out of scope (logged)

These areas are in §1.10 for piano, guitar and bass (reading for drums), but this plan does not give them T7–T8. **Add to SPEC-HOLISTIC-2 §17.5 backlog:**
- **Reading.** Reading T comes from catalogue quantiles of existing reading levels (§1.2). T7 needs a grade-8 reading level per instrument: piano `k-read` reaches the ABRSM G8 quick study; guitar `g-reading-8` and bass reading stop near G7. T8 needs a diploma parameter set (density, key distance, syncopation) for the rule-generated reading items.
- **Rhythm / time.** Candidates exist: `b-time-12` / `13` (displacement, 5 and 7 over the bar, 5 against 3), `g-meter`, piano polyrhythm. They need a subdivision-level mapping to T7–T8.
- **Voice T8 and voice time T7** (§6.2).

---

## 7. Course-change checklist

| Item | Impact |
|---|---|
| Ladders (`keyIndex.ts`) | Piano T6–T8 rungs (§4.1). Guitar and bass re-tiered by the syllabus rule (§4.2, §4.3). Voicing rungs leave block B. B rungs gain nps spans (piano, guitar; bass only at the RSL steps). The bass warm-up becomes a rung. |
| Per-instrument tables | `tierOfNps`, `BENCH_NPS`, `SPEED_NPS`, `EXAM_NPS`, `itemTier`, target tempo (§2.4). |
| `contentTier` | Set by §1.2. The §1.2 guard test covers every spec. Add a guard: guitar and bass `contentTier` = syllabus tier unless the override list names the level. |
| Harness | `realCatalogue.ts`: spans for B rungs, the warm-up rung, per-instrument bands, the new rungs. Re-run `npm run measure-sim`. The guard "rotation-only climbs reach every tier with content, no stall ≥ 42 d" now covers T7–T8. Check the H10 rising-challenge metric at T6–T8. |
| `verifiedContent.ts` | Hidden items are unavailable for counting. Every T7–T8 Harris tier meets the floor with shown items only: `k-sharm-40` / `41` (shown parts only), `g-hlfast`, `b-harrisline` (5, 9 hidden), the new `k-hlfast` / `b-hlfast`. |
| **T names vs badge ranks** | Two exports are both named `TIER_NAME`: `drills/tiers.ts` (First steps … Diploma: the T scale) and `ranks.ts:44` (Bronze … Master: the rating-division badges, `badges.ts:206` "Reach {TIER_NAME}"). Rename the T-scale export (`T_TIER_NAME`). Course sections use its names ("Grade 8" T7, "Diploma" T8). The badge ranks stay as they are. |
| **"Master" (Q5)** | §1.10 "never full below Master" means rank **T8**. Amend the text to "never full below T8 (Diploma)" so it does not read as the badge rank `master` (`MASTER_AT` 1550, a rating division). The T8 bar may show full. |
| Spec text | SPEC-HOLISTIC-2 §1.10 "Top tiers" (T7–8 has no content) and §17.5's backlog line are replaced once the content ships. §1.2 gains the per-instrument bands, the bass content-first rule and the per-instrument factors. |
| Path ratings | `levelPlacement` / `LEVEL_PLACEMENT` entries for each new level: `k-hlfast`, `b-hlfast`, N3, N15, the RH line over a walking bass, polyrhythm with figures, comping while soloing, the bass duo lines, and the guitar sequence levels. |
| Level badges | Badge counts per catalogue level are test-checked (`badges.ts:569`, `:696`). New levels update those counts. |
| Brief / gate page | Each new exercise gets its gate page (text, refresher, Play; path-names-and-brief, brief-before-task). |
| Rubato first | New laddered rungs start untimed. The "at tempo" twins (`k-hlfast`, `b-hlfast`, `g-hlfast`) inherit the rubato stage of their source rows, which are their prerequisite, so no untimed start. Fixed-tempo rungs start untimed only with new pitch content (SP §15.2). |
| Openers | Course openers name the top sections; unit openers for the new units: piano / guitar "Harris harmony at the top", "Lines at tempo"; bass "Walking at the top", "The duo line"; guitar "Sequences". |
| Skill map / radar | Axis to T8. DYN "ff" (T7–8) becomes real. Voice shows T7 as its top. |
| Level test | A T7 and a T8 probe step per area (breadth-first, one take per step, SPEC-LEVEL-TEST). Guitar already places the diploma jazz families via Harris lines at tempo (`levelTest.ts:336`); add the same for piano and bass. Re-check the guitar and bass placement probes against the new bands. |
| Glyphs | `FAMILY_GLYPH` / `TOPIC_GLYPH` for the new families in the Paper icon language. |
| Everything-connects | Every new rung feeds path, map, XP (promotion XP per tier, §3 caps), leagues, level test, workout / key session. |
| i18n | Hebrew and English titles; catalogue entries per offered locale. |
| Flow audit (§13.1) | Every changed ladder passes it before shipping: the gap fills (piano harmony T3, guitar independence, bass walking T3), the Harris order, the guitar re-tier (a large move at the bottom: beginners get blues shells before diatonic 3rds), and the drum T3–T6 rudiment placement. |

---

## 8. Owner questions

| # | Question | My recommendation |
|---|---|---|
| Q7 | **Catalogue rule:** v14 sets ≥ 3 per tier, floor 2, since the harness found 3–6 per tier climb alike. Your 2026-11-28 note said "aim ≥ 4, floor 3". Which governs? | v14's rule. This plan meets ≥ 3 nearly everywhere; the exceptions are a few floor-2 tiers listed in §4 counts. |
| Q8 | **Factors beyond arpeggios:** your decision names ÷ 0.78 for arpeggios **and** blocked octaves. RCM's octave ratio is 0.63. Hands a 3rd / 6th apart (RCM 0.87) are not in the decision. Use 0.78 or 0.63 for octaves? Approve 0.87 for hands apart? | Octaves 0.63 (it matches RCM at L9–L10). Hands apart at raw tempo, which already reaches T8 at RCM L10 (6.9 n/s). |
| Q9 | **Guitar re-tier at the bottom:** Q2 moves today's guitar ladder up 1–3 tiers (e.g. diatonic 3rds T0 → T3). A guitar beginner then starts on pentatonics, blues shells and picking at T1–T2. OK? | Yes. It is what the syllabus says, and the T1–T2 items exist. |
| Q10 | **Diploma tempo:** with no guitar or bass diploma scale-speed table found, T8 = G8 × 1.2 (guitar 5.8 n/s, bass 120 bpm 8ths). OK, or do you have a diploma syllabus to use? | Use × 1.2 until a source is found. |
| Q11 | **Voice tops out at T7,** and its time area lower. Build voice T8 later (new non-extreme content), or accept T7 as the voice top? | Accept T7 for now. Log T8 and time T7 as backlog. |

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

## Owner decisions (2026-11-28)
- Q1: yes. Arpeggios and blocked octaves are tiered by scale-equivalent tempo (notes/s / 0.78).
- Q2: no shared speed scale. Each instrument is tiered by its own standards (guitar and bass by their own grade syllabi), so T7 means the same skill level within each instrument.
- Q3: yes. T7-T8 is mostly existing grade-8+ levels wired into the ladders, plus the few new rule-generated levels.
- Q4: yes. Non-ladder levels get their content tier from their path rating, and the flow audit confirms each placement.
- Q5: yes. Rank T8 is the "Master" in "never full below Master".
- Q6: include Harris lines at bebop tempo as a bass T8 item in the lines area.
- Catalogue rule: aim for >= 4 exercises per tier, floor 3.

## Sources
- RSL (Rockschool) Bass Syllabus Specification 2018, Technical Exercises, Debut–Grade 8 (as hosted by a school: newschool.ie, RSL_Bass_Syllabus_Guide_2018). Also the Rockschool Bass Syllabus Guide 2012–2018, p. 25–27 (cloud.rslawards.com/file/download/rockschoolbass2012syllabus.pdf).
- ABRSM, Guitar syllabus from 2019, "Guitar grades: requirements and information", p. 11 speed table (newschool.ie, complete_guitar_syllabus.pdf).
- RCM 2022 Piano Syllabus technical requirements, via J. Morin's ColorInMyPiano charts (in docs/RESEARCH-KEY-EXERCISES-AUDIT.md references).
- Repo: SPEC-HOLISTIC-2 v14, BARRY-HARRIS-THEORY, RESEARCH-KEY-EXERCISES-AUDIT, SPEC-GUITAR-TECHNIQUE, keyIndex.ts, harmLadder.ts (`K_HARM_DIFF`), guitarTop.ts, stageCPlacement.ts, voiceTop.ts, verifiedContent.ts, ranks.ts, tiers.ts.

## Owner decisions, round 2 (2026-11-28)
- Q7: yes. v14's catalogue rule (>= 3 per tier, floor 2, no lone 1-exercise bottom tier) replaces "aim for 4, floor 3".
- Q8: blocked octaves use 0.63 (RCM). Hands a 3rd/6th apart use raw tempo.
- Q9: yes. Guitar beginners start on pentatonics, blues shells and picking, as the syllabi do.
- Q10: yes. The diploma tempo for guitar and bass is grade 8 x 1.2, labelled an estimate.
- Q11: yes. Voice tops out at T7 for now; voice T8 goes to the backlog.

# Top tiers T7–T8, per-instrument bands and the bass first tiers (research + spec proposal, v13, 2026-11-28)

Scope: SPEC-HOLISTIC-2 v16 §1 rank (T0–T8) caps at the top content tier, and `LadderRung.min` runs 0–6, so advanced players have nowhere to climb (§1.10 "Top tiers", §17.5 backlog). This doc:
- sets the tier rules from the owner decisions (rounds 1 and 2, at the end);
- re-bands guitar and bass on their own syllabi;
- plans T7–T8 per instrument × area;
- fixes the bass first tiers and the bass walking gap;
- maps Ear, voice and drums, and scopes reading and rhythm;
- lists the course-change checklist impacts and the remaining owner questions.

No code was changed. Every count and harness figure below was re-run on this branch (redesign-v2): `realCatalogues()` for today's counts, and the §9.1 harness (`daysPerTier`, `climb`; 60 runs; the report's seed) on today's code, which is the SPEC-HOLISTIC-2 v16 harness (the tier guard at P ≥ 0.9, owner decision H14), on the proposed catalogues. The v15 figures of v12 are kept as history in §4.4. The scripts are committed under `scripts/top-tiers/` (`prop.ts` the catalogues and harness run, `guard.ts`, `tonality.ts`, `labelcheck.ts`, `offset.ts`; run each with `npx tsx` from the repo root).

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
3. **One rule assigns every rung to harmony, arpeggios or line-jazz (§1.5),** keyed on family + kind + option.
   - **Harmony** (content tier only): struck chords, and harmonised-scale degree sequences.
   - **Arpeggios** (may carry tempo rungs): a single chord type's broken arpeggio, or one arpeggio pattern through a fixed progression.
   - **Line-jazz** (content tier, tempo a sub-band): Harris and jazz line devices, even when arpeggiated.
   - Items move to match, and a guard test checks the rule (§7).
4. **One style rule.** Untagged, "all" and jazz-tagged material is core for every learner (the jazz core is the backbone, SPEC-STYLE-FOCUS §8). Other genre tags and the non-jazz add-ons count only for learners with that style. Every tier meets the floor on core items alone. The jazz focus's early opening is capped at T5 and by v15 entry (§1.3).
5. **One rule for line rungs.** Lines are tiered by content on all three instruments; tempo is a sub-band (§1.4).
6. **Most T7–T8 content exists already** (Q3). A short list of **new** rule-generated levels fills the gaps (§4).
7. **Bass first tiers and the walking gap are fixed** with existing 12-key levels. On the v16 harness, today's walking area reaches its first rank in only 42 % of runs within 240 days, and 1 climb in 60 stalls (worst 58 days). Proposed: 18.5 days, no stall. Scales and arpeggios reach their first rank in 16.5–17 days, against 37.5–42.5 today (§5).
8. **Voice is capped at T7 (Q11) and full there.** The existing voice levels hold content up to T7 in all four voice areas, and some rate as T8. Q12 is decided: voice stays at T7. Appendix A is the plan for later, not to be built until the owner opens voice T8. Drums reach T8 by rudiment family (§6.3). Reading and rhythm T7–T8 are out of scope and logged as backlog (§6.4).

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
| Harris lines at bebop tempo are a bass T8 item. v15 gives bass no line area, so the item sits in **bass / scales**, where v15 puts Harris's scale language (one-line notice to the owner, §8) | Q6, v15 §1.10 |
| **Catalogue rule:** ≥ 3 available exercises per non-empty tier, floor 2, and no lone 1-exercise tier at the bottom of an area | Q7, v15 §1.2 |
| Guitar beginners start on pentatonics, blues shells and picking | Q9 |
| The diploma tempo for guitar and bass is grade 8 × 1.2 [E] | Q10 |
| Voice tops out at T7 for now; voice T8 goes to the backlog | Q11 |
| Bass areas: scales (A, D, F), arpeggios / chord tones (S, B), walking / groove (E) | v15 §1.10 |
| **Harmony vs arpeggios:** the §1.5 rule | this plan |
| **Never tempo-ladder** voicings, comping, walking, ear or held-note items. Fixed-tempo areas climb by content; tempo is a sub-band, never a tier step | RESEARCH-KEY-EXERCISES-AUDIT §4.2; v15 §1.2–§1.3 |
| **Twelve keys are coverage, never a tier** | v15 §1.1 |
| Only verified theory. No Claude-composed music. Chord charts only, no protected melodies | owner rules |

### 1.2 Where a level's content tier comes from (Q4)

1. **Ladder rungs keep `LadderRung.min`** as the seed (spec §1.2). Guitar and bass are the exception: step 2 re-tiers them.
2. **A syllabus grade, where one is stated.** Grade → T: Debut / pre-grade → T0, G1 → T1, G2–3 → T2, G4 → T3, G5 → T4, G6 → T5, G7 → T6, G8 → T7, diploma → T8. Grade ≥ 9 → T8 on every instrument: guitar grades 9–11, and rating grades ≥ 9 on piano and voice (e.g. `k-sharm-26`–`-42`, `k-harrisline-28` / `-34`, `harris-22`).
   - **Guitar:** the level's `grade` field after `GUITAR_GRADE_UP`.
   - **Bass:** the RSL Bass 2018 grade where the material first appears: scale type (§2.3) or chord type (§5.2).
   - **Voice:** the RSL grade the family names, where it names one.
   - **Drums:** the rudiment family (§6.3).
3. **Otherwise, the path rating** r gives the candidate: grade = ⌊(r − 700) / 90⌋, mapped through step 2.
4. **Overrides, each listed with its reason:**
   - the Harris order (BARRY-HARRIS-THEORY §6: scales → moving inversions → borrowing → the 8 expressions → in context);
   - the catalogue rule;
   - the never-ladder list;
   - v15 §1.2 drum rudiments (complexity family, then nps);
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
- **Code impact: no locks at all** (SPEC-STYLE-FOCUS §8.1).
  - `guitarLevelShown` and `guitarStyleMatch` (guitar.ts:2887–2900) have **no callers**; ladderFacts.ts notes that the path no longer reads them. They are dead code: **delete both**.
  - No other add-on or country gate remains. Every level stays visible and openable.
  - Style-only items are only unweighted (they are offered through the 10 % exposure, §9 of SPEC-STYLE-FOCUS).
  - They are excluded from rank "available" for learners without that style.

**The jazz early opening (keyIndex.ts:688).** `openKeyRungs` opens a `jazz: true` rung two tiers early when the main style is jazz. New rule:
- The shift applies only to rungs with `min` ≤ 5, and it stays capped by v15 entry (content ≤ max(placedTier, rankHW) + 1; + 2 only once every exercise at + 1 is passed).
- **T6–T8 rungs open at their own `min` for everyone.** They may carry `jazz: true` for the style weight, but not for the shift.
- So a jazz-focus player at T5 never gets T7 borrowing early, and the Harris order holds.

**Style rungs stay capped at T5 (intended).** `styleRungTier` (keyIndex.ts:268) caps block H style rungs at T5.
- Block H holds style content: comping patterns and grooves. It is style-weighted and never counted toward a tier's floor.
- T6–T8 come from the core ladders, so the cap stays.

### 1.4 Line rungs: one rule on every instrument

- **Line rungs** (`k-hlfast`, `g-hlfast`, `b-hlfast`, `k-harrisline`, `g-harrisline`, `b-harrisline`, `b-barry`, the triad pairs and similar) **are tiered by content**: their family, grade or rating under §1.2.
- **Tempo is a sub-band inside the tier.** It never sets the tier.
- **The start tempo:** each line item starts at its own catalogue start tempo, after its rubato stage (SP §15.2).
- **The climb:** it keeps rising inside the tier (H10).
- **Swing bands follow each instrument's bounds** (8ths, n/s = ♩ ÷ 30). **They set only the take's tolerance tier** [E], and they are the same cuts as the instrument's `tierOfNps` (§2.1–§2.3).
- **A take's tolerance** uses its own nps tier capped by `paceTier` (v15 §1.3). So a T7 item started above its band (bass `b-barry-6` at ♩120) is held to at most the learner's pace tier. A start below the band is allowed:

| Instrument | T7 band (bench range) | T8 band | At-tempo level |
|---|---|---|---|
| Piano | ♩ 168–194 (5.6–6.5 n/s) | ♩ ≥ 195 | `k-hlfast`: catalogue start ♩160, climbs to ♩240–260 inside T8 |
| Guitar | ♩ 135–158 (4.5–5.3) | ♩ ≥ 159 | `g-hlfast`: catalogue start ♩140, climbs to ♩240 (content T8: grades 9–11) |
| Bass | **T5–T7 share ♩ 100–109** (n/s < 11/3; RSL has no G6–G8 tempo step) | ♩ ≥ 110 (n/s ≥ 11/3; bench 4.0) | `b-hlfast`: catalogue start ♩120, climbs to ♩200–240 inside T8 (Q6's "bebop tempo" is its top). `b-barry-6` (T7) starts at its catalogue ♩120 |

### 1.5 Areas by family + kind + option: one closed rule

**The rule.**
- A rung's area follows **what is drilled**. It is decided by **family + generator kind + option**. The old code block never decides it, and neither does a kind prefix: `hl-` is shared by the `harmLadder` steps and every Harris line kind (harrisLineDrills.ts:73).
- **The table is closed literally.** Every kind is listed by name, and a kind not listed under its family fails the guard, even in a listed family. The single exception is chart kinds: their cadence id is data from the cadence library, while the voicing / mode part is a closed list.
- **Precedence: the first row that matches wins.**

| # | Area | Tempo rungs (`max`) | Family: kinds (+ option), closed |
|---|---|---|---|
| 1 | **walking / groove** (bass) | never | `b-walk`: `arpwalk`, `blues-chrom`, `blues-waltz`, `chrom`, `cycle`, `dom`, `free`, `lowb`, `r5walk`, `rhythm`, `scaleapp`, `sight-impro`, `skips`, `solo`, `standard`, `two-feel`, `two-four`, `waltz`. `b-cadlib`: `cad~<cadence>~approach`, `~walk`, `~pedal`. `b-chord`: `roots`, `ctline`, `nearest`, `slash`. `b-harrisline`: `hl-walkties`. `b-barry`: `walk13`, `dimpass` (the diminished as a passing chord, a walking drill) |
| 2 | **harmony / voicing** (the shared ladder) | never; content tier only (a broken degree sequence keeps an in-tier tempo climb, H10) | `k-sharm`, `g-harm`, `g-harris`: the steps `hl-3b`, `hl-3t`, `hl-ta`, `hl-tb`, `hl-7a`, `hl-7b`, `hl-d2`, `hl-d3`, `hl-d24`, `hl-ti`, `hl-c4`, `hl-9a`; borrowing `bw-chord`, `bw-chord-d2`, `bw-chord-d3`, `bw-iivi`, `bw-iivi-d2`, `bw-iivi-d3`, `bw-one`, `bw-one-d2`, `bw-one-d3`, `bw-out`, `bw-root`, `bw-scale`, `bw-scale-d2`, `bw-scale-d3`, `bw-std`, `bw-std-d3`, `bw-three`, `bw-two`, `bw-two-d2`, `bw-two-d3`, `bw-walk`, `bw-walk-d2`, `bw-walk-d3`; `cm-expand`; `v7-d2`; `vl-ladder`; `sf-voice`; `sf-comp`; `sf-borrow`; `sf-minor` **option 0**; `sixth5`; `mv-first`, `mv-next`, `mv-mmm`; `shell4`; `tm-res`; `sub-tune`. `g-harris` also: `sixdim-chords`, `sixdim-sets` |
| 3 | **line-jazz** (the shared ladder) | never as tier steps; content tier, tempo a sub-band (§1.4) | `k-sharm`, `g-harris`: `sf-line`; `sf-minor` **option 1**. `g-harris`: `sixdim-scale`, `dom-scale`, `triads-3to9`, `enclosure`, `brothers`, `pivot-arp`, `scale-pivot`, `pivot-encl` |
| 4 | **scales** (the shared ladder) | yes | `k-sharm`, `g-harm`: `hl-line` |
| 5 | **line-jazz** (bass: **scales**), ahead of the scale rows: the Harris line families, the 6th-dim and bebop scales | never as tier steps | `k-harrisline`: `hl-3b9`, `hl-abc`, `hl-chrom`, `hl-chrom2`, `hl-eight`, `hl-imp-arps`, `hl-imp-scale`, `hl-misc`, `hl-outline`, `hl-rules`, `hl-sevendown`, `hl-triplet`. `g-harrisline`, `b-harrisline`: the same without `hl-chrom2`. `g-hlfast`: `g-harrisline>hl-3b9`, `>hl-chrom`, `>hl-outline`, `>hl-rules`, `>hl-sevendown`, `>hl-triplet` (the new `k-hlfast` / `b-hlfast` take the same list). `harris`: `h1-linear`, `h2-dominant`, `h6-approach`, `h8-brothers`, `h11-arp-scale`, `h14-rules`, `h15-iivi`, `h16-chains`, `h17-chromatic`, `h18-sixfive`, `h19-pivot`, `h20-pivotrot`, `h21-pivotiivi`, `h22-scalepivot`, `h23-pivotencl`. `b-barry`: `sixdim`, `halfstep`, `pivot`, `bebop`, `pivot-arp`, `scale-pivot`. `k-tpair`: `tpk-pat`, `tpk-vamp`, `tpk-iivi`, `tpk-blues`, `tpk-slip`, `tpk-form`, `tpk-sym`. `g-tpair`: `gtp-line`, `gtp-hex`, `gtp-iivi`, `gtp-slip`. `b-tpair`: `btp-arp`, `btp-blues`, `btp-iivi`, `btp-inv`, `btp-slip`. `g-bebop`: `v-3b9`, `v-digit`, `v-lead`, `v-line`, `v-minor`, `v-trip`. `k-bebop`: `bb-251`, `bb-alt`, `bb-blues`, `bb-form`, `bb-hands`, `bb-matrix`, `bb-minor`, `bb-rhythm`, `bb-standard`. `g-fusion`: `fu-slip`, `fu-pair`, `fu-vamp`, `g-prog>fusion`. `g-jazz`: `guide-tones`. `k-dimcol`: `dc-run`. `scales`: `scale` with `scale` = `six-dim`, `six-dim-m`, `bebop-dom`. `k-modes`: `mode` **option 7**. `g-scales`: `mode` **option 24**. `b-scale`: `scale` **option 27** |
| 6 | **harmony / voicing** (other families) | never | `k-cadlib`: `chart~<cadence>~<voicing>~<rhythm>~comp`, voicing ∈ {`barron`, `close4`, `drop2`, `drop3`, `guide`, `rootless`, `shell`, `sowhat1`, `sowhat2`, `stride-tenth`, `two-hand`, `walk-lh`}, rhythm ∈ {`whole`, `charleston`, `four`}. `g-cadlib`: `cad~<cadence>~` {`drop2`, `drop3`, `rootless`, `shell`}. `cadences`: `cadence-1`, `-64`, `-aug6`, `-circle`, `-deceptive`, `-ii6`, `-n6`, `-picardy`, `-plagal`, `-vofv`. `k-reharm`: `rh-altered`, `rh-approach`, `rh-ballad`, `rh-borrowed`, `rh-chains`, `rh-dev`, `rh-maj7s5`, `rh-mi`, `rh-minor`, `rh-modal`, `rh-modern`, `rh-pedal`, `rh-pedalpt`, `rh-planemel`, `rh-planing`, `rh-reharm`, `rh-slip`, `rh-solo`, `rh-sus`. `g-vl`: `gvl-drop2`, `gvl-drop3`, `gvl-triads`. `g-solojazz`: `g-jazz>solo-texture`, `sj-blues`, `sj-rhythm`. `g-jblues`: `blues-comp`, `blues-guide`, `blues-shells`. `k-dimcol`: `dc-lower`, `dc-raise`, `dc-whole`, `dc-two`. `g-jazz`: `chord-melody`, `comp`, `comp-chart`, `comp-std`, `drop2`, `drop3`, `harmonized`, `iivi-drop2`, `octaves`, `rhythm-changes`, `shells`, `solo-texture`, `vl-ear`. `harris`: `h3-triads`, `h4-chords`, `h5-pivots` (degree sequences), `h9-sixdim`, `h10-minor6dim`, `h13-dimmoves`. `k-harrisline`: `hl-upbeat`, `hl-ands`; `g-harrisline`: `hl-upbeat`. `k-tpair`: `tpk-close`, `tpk-spread`, `tpk-block`, `tpk-comp`. `g-tpair`: `gtp-shapes`, `gtp-comp`. `arpeggios`: `blocked` |
| 7 | **arpeggios** (a single chord type's broken arpeggio, or one arpeggio pattern through a fixed progression) | **yes** (scale-equivalent tempo, §2.5) | `arpeggios`: `arp-dim7`, `arp-dom7`, `arp-hd7`, `arp-m7`, `arp-maj7`, `arp-triad`, `broken`. `g-arps`: `triad`, `caged-arp`, `caged7`, `inversions`, `seventh`, `ext-arp`, `ust`, `iivi-arp`. `g-speed`: `g-picking>sweep3`, `g-picking>sweep5`, `g-legato>tap`. `g-picking`: `sweep3`, `sweep5`, `sweep7`. `g-legato`: `tap-arp`. `b-chord`: `r5`, `r58`, `triad`, `inv`, `sev`, `arp2`, `arp7x2`, `arp9`, `arpalt` |
| 8 | **arpeggios / chord tones, bass degree sequences and chords** (v15 gives bass no harmony area) | **never** | `b-chord`: `dia7`, `dia9`, `dia1235`, `hichords`. `b-scale`: `seq` **option 0** (diatonic 3rds) |
| 9 | **scales** | yes | `scales`: `scale` (all other `scale` values), `jscale`. `k-modes`: `mode` (other options), `mode-der`, `mode-par`. `g-scales`: `3nps`, `3nps-neck`, `blues`, `caged`, `caged-connect`, `caged-minor`, `interval-seq`, `interval-shapes`, `mode` (other options), `one-string`, `penta`, `segovia`, `seq-g3`, `seq3`, `seq4`. `b-scale`: `scale` (other options), `scale2`, `penta-pos`, `penta5`, `nps3`, `seq` **option 1** (4ths). `control`: `balance`, `melody-alberti`, `pedal`, `reading`, `scale`, `voicing` (the piano `control` family; `control-8` is the scales rung). `g-picking`: `3nps`, `3nps-economy`. `g-speed`: `g-picking>3nps`, `g-picking>3nps-economy`. `b-fret`: `2oct`, `oct10`, `one-string`, `simandl`, `spider`, `stretch`, `upper`. `b-pluck`: `accent16`, `cross`, `gallop`, `ima`, `open`, `rake`, `skip`, `skip2`, `stamina`, `thumb`, `zone`. `b-legato`: `harm`, `hp`, `legline`, `octslide`, `pedal`, `slide`, `vib` (bass hands, v15) |
| 10 | **independence** (piano, guitar) | no, except the octave items: N15 (new, the chromatic scale in octaves) carries nps rungs at scale-equivalent tempo (÷ 0.63, §2.5), as RCM grades octaves by tempo | `fingers`: `arp-dim7`, `arp-dom7`, `arp-triad`, `five`, `hanon`, `hanon-1`, `hanon-style`, `held`, `ornament`, `rep-chords`, `repeated`, `rotation`, `scale`, `thumb-under`, `trill`, `velocity`. `advanced`: `double-notes`, `leaps`, `octaves`, `polyrhythm`. `k-indep`: `ind-all`, `ind-dyn`, `ind-hold`, `ind-ostinato`, `ind-poly`, `ind-touch`, `ind-voices`. `k-keyx`: `kx-boct`, `kx-canon`, `kx-leap`, `kx-ost`, `kx-ost3`, `kx-stride`, `kx-waltz`. `g-fretting`: `cross`, `spider`, `stretch`, `walk`. `g-legato`: `3nps-legato`, `hammer`, `legato-shift`, `penta-legato`, `pull`, `tap`, `tap8`, `trill`. `g-picking`: `banjo`, `chicken`, `cross`, `fusion-pick`, `hybrid`, `hybrid-riff`, `pedal`, `single-string`, `skip`, `tremolo`. `g-speed`: `g-legato>3nps-legato`, `g-picking>skip`, `g-picking>tremolo`. `g-fusion`: `fu-4nps` |
| — | **coverage / not a key-ladder area** | — | `harris`: `h7-line` (a lick + line: memorised material, §1.10); `k-bebop`: `bb-trade`; `g-solojazz`: `sj-head`; `g-jblues`: `blues-head`; `g-jazz`: `walking`; `g-bebop`: `v-time` (rhythm / time, out of scope, §6.4) |

**One classification for broken diatonic 3rds.**
- `hl-3b` (piano, guitar) and `b-scale-6` option 0 (bass) are the **first step of the harmonised-scale spine** (3rds → triads → 7ths on every degree, the `harmLadder` order). So they sit with the spine: harmony, or bass arpeggios / chord tones, with no nps rungs.
- `g-scales-10` / `-12` (interval sequences and shapes: 3rds, 4ths, 6ths, octaves, 1-3-2-4 groups) and `b-scale-6` option 1 (4ths) are **interval technique on the scale**. They are scales, with nps rungs.

**A rung's picked options never open before their scale's tier.**
- This applies to rungs that carry several scales' options, such as `g-harm-1` (§4.2).
- The guard checks every picked option against its scale's tier.

**Rows, mode views and modal options.**
- **Appendix B classifies options; it is not the pick list.** It lists every option of every placed level with its class. What a rung actually picks is set by the rung tables in §4 (and by the existing `pick` of today's rungs); the row filter then admits only the picked options whose class fits the row. So an option shown in Appendix B is not thereby picked. Examples: `g-harm-1` never picks the Harris options 9–12 (they are line-jazz scales, §4.2), and the T6 Harris rung of `k-sharm-12` picks only options 9–12, never the melodic / harmonic options 7–8.
- **Tagged mode views keep their rows.** Today `laterRungs` builds the modes from the root as **parallel-mode views** (C Dorian on the C-major row) and the relative Aeolian (offset 9) as a major-row view, each with `tag: mode`; they stay there. A view's pick must equal its mode's option, and the guard checks it (0 mismatches today).
- **Modal options of untagged rungs** go where that instrument's scale rung for the mode lives: modes from the root (Dorian … Locrian) → the major row as parallel-mode views (C Dorian on the C-major row); the Aeolian → as that instrument's Aeolian rung (guitar and piano: the major-row view at offset 9; bass: the minor row, where it is the same exercise as natural minor, §2.3); melodic- and harmonic-minor modes (`pminor`) → the minor rows.
- **Rows follow the parent-scale family, not the 3rd.** `pminor` is a convention: Lydian augmented, Mixolydian ♭6, Ionian ♯5 and Lydian ♯2 have a major 3rd but go to the minor rows, because their parent scale (melodic or harmonic minor) is a minor-row scale. This mirrors the major rows carrying the parallel Dorian, Phrygian and Locrian, which have a minor 3rd. So "tonality matches its row" in the guard means "the option's parent-scale family matches its row".
- **Blues material is neutral** and may sit on both rows, except the minor blues (`m-blues-ending`), which is minor. That is consistent with the §7 guitar warm-up, which plays `g-scales-3` (major pentatonic and blues) on the major rows and the minor pentatonic on the minor rows.
- **Dominant-on-root material is neutral** (whole-tone, diminished, altered, bebop dominant, the dominant rule), so it sits on both rows. Rungs per tier on the major row / the minor row (neutral and split levels count on both; `labelcheck.ts` prints this):
  - piano line-jazz: T5 11 / 5, T6 10 / 9, T7 12 / 11, T8 21 / 15;
  - guitar line-jazz: T5 5 / 2, T6 5 / 5, T7 8 / 7, T8 13 / 12 (with `g-harrisline-3` at T5, §4.2);
  - bass scales (lines included): T0 4 / 4, T1 3 / 3, T2 6 / 5, T3 7 / 5, T4 4 / 5, T5 8 / 7, T6 9 / 8, T7 9 / 7, T8 9 / 11;
  - bass walking: T0 3 / 2, T1 3 / 2, **T2 4 / 0**, T3 3 / 2, T4 3 / 4, T5 3 / 3, T6 5 / 3, T7 5 / 5, T8 3 / 3.
- **The thin minor rows.**
  - **Guitar line-jazz T5** had one minor-row rung in v12 (the minor 6th-dim scale, `g-harris-1` options 2 / 3), and no neutral rung: guitar line-jazz has no tier below T5, and its dominant material sat at T6. v13 moves `g-harrisline-3` (the dominant rule, the important arpeggios, the ♭7-major pivot; every option neutral) to T5 as an override (G7 → T5), mirroring piano T5's `k-harrisline-3` / `-4` after the ABCs. Rung order: `g-harris-1` → `g-harrisline-10` → `g-harrisline-3`. The minor row now has 2 rungs at T5.
  - **Bass walking T2** has no minor-row rung: `b-chord-9`, `b-walk-4` / `-5` (the major ii–V approach drills) and `b-chord-10` are major. No new content is proposed. Rank counts distinct exercises per area across both rows (v16 §1), so the thin row does not change a climb, and a minor-row session at T2 still draws the neutral walks below it (two-feel, root–5th, the arpeggio walk, the first blues line). Minor ii–V walking starts at T4 with the cadence library (`m:b-cadlib-1`); a minor ii–V approach drill at T2 would be a new generated level, and the plan does not need it.

**Mixed levels are split by option** (a `pick` per area, as `b-chord-6` is split by chord type). The guard finds exactly these mixed levels:
- **Plan rungs:**
  - `k-sharm-32`: `sf-minor` 0 → harmony T8; 1 → line-jazz T8.
  - `g-harris-12`: `sf-line` → line-jazz T8; `cm-expand`, `v7-d2`, `vl-ladder` (shown parts) → harmony T8.
  - `g-scales-21`: option 23 (dim W–H) → scales T7; option 24 (bebop dominant) → line-jazz T7.
  - `b-scale-13`: options 14 / 15 (Locrian, dim W–H) → scales T7; option 27 (bebop dominant) → line, bass scales T7, no `max`.
  - `b-scale-6`: option 0 → bass arpeggios T1; option 1 → bass scales T3.
- **Not rungs, split if ever used:**
  - `scales-12`, `-33`, `-34`, `k-modes-8`, `-11` (their 6th-dim or bebop parts are line-jazz);
  - `arpeggios-14` (its blocked part is harmony);
  - `harris-12` (its `h3` / `h5` parts are harmony);
  - `g-legato-6` (its `tap-arp` part is arpeggios; style-only).
  - The plan's `scales-33` rungs pick only the natural- and melodic-minor options.
- **Same area, split by tier** (the Harris order): `k-sharm-23`, `-24`, `-25`, `g-harm-12`, `-13`, `g-harris-13`. Their borrowing items go to T7. Their ii–V–I / turnaround items (`bw-iivi*`, `bw-std*`), and `g-harris-13`'s substitution comping, go to T8.

**Guard test (§7).**
- **The builder codes this table, not a script.** The test enumerates family + kind + option (+ `scale`) for every spec of every ladder rung. It fails on:
  - any triple not in the table;
  - a `max` outside rows 4, 7 and 9, other than N15 in row 10;
  - a mixed level that is not on the split list;
  - a picked option that opens before its scale's tier;
  - **a picked option whose tonality does not match its row**, compared exactly: every option the rung's `pick` admits is classified, and each must be allowed on that row (minor / pminor → minor rows; major → major rows; neutral → both; a mode → the major row as a mode view). A rung that admits a minor option on a major row fails even if its other options match;
  - **a mode view whose pick is not its mode:** a rung tagged with a mode (`tag: mode`, the Aeolian at offset 9, the modes from the root) keeps the row `laterRungs` gives it today, and each option it picks must classify as that mode (the relative Aeolian may also read as natural minor). A rung tagged `melodic` / `m6dim` must pick only minor options;
  - **a rung labelled "on V" without `off: 7`** (§4.3), or `off: 7` on a rung not built on the dominant. Levels that already render on V at key 0 (`g-harris-3`, `g-harris-4`: G7 on the C row) take no offset;
  - **a classifier result that is `unresolved`:** it fails and is listed for a human decision; the guard never falls back to the key signature or to "has a minor 3rd";
  - **a chart or tune rung whose rendered tonic differs from the row's tonic** (the `standard` offset above).
- **The tonality reference is the classifier** (`scripts/top-tiers/tonality.ts`, committed with this doc; it replaces v11's script). It generates every option of every placed rung in C and reads it in this order; the first rule that answers wins:
  1. **declared neutral:** key-neutral technique families (`fingers`, `advanced`, `g-fretting`, `g-picking`, `g-legato`, `g-speed`, `g-fusion`, `b-fret`, `b-pluck`, `b-legato`), chord-quality arpeggios (`arpeggios` `arp-*` / `broken` / `blocked`, the `b-chord` broken arpeggios, `g-arps` except `iivi-arp`), the pivot and brothers arpeggios (`h19` / `h20`, `pivot-arp`, `brothers`), the chromatic scale, and **blues material** (the blues scale, blues heads / comping / walking, `blues-turnaround` cadences): neutral, on both rows. The exception is the minor blues (`m-blues-ending` cadences), which reads as minor from its tonic chord;
  2. **declared scale or mode data:** `drill.tonic.minor` and the spec's `minor` flag; for `hl-*` steps, the `H_SCALES` / `RULE_OPTS` entry of the picked option; the spec's `scale` id. Modes from the root read as `mode:X`; melodic- and harmonic-minor modes read as `pminor` (minor rows); dominant-on-root material (whole-tone, diminished, altered, Lydian / Phrygian dominant, bebop dominant, the dominant scale and rules, 7♭5-dim) is neutral;
  3. **human decisions** (listed below, with the reason for each);
  4. **the tonic chord anywhere in the chart** (not only the last chord): minor tonic chords only → minor; major only → major; dominant only → neutral;
  5. **the title lexicon** (scale and mode names; "minor" phrases that do not name the key, such as "important minor", are stripped first);
  6. **the key label**, only when the pitch content confirms it (a major 3rd for a major label);
  7. otherwise **unresolved** → the guard fails and lists the option for a person to decide.
- **Human decisions in the classifier** (23 keys, which apply to 32 specs; 26 of those specs would be unresolved without them, and the other 6 would get the same class from a later rule; each decided from the drill source): `mv-next:0` major; `sf-borrow:0` / `:1` neutral (borrowing on a dominant); `dc-lower:0` neutral; `hl-outline:5` minor (Night in Tunisia), `:4` major; `standard:2` / `:13` / `:27` major (their charts end on a major tonic); `sight-impro:0` neutral; `btp-slip:0` minor; `pivot-encl:0` / `:1` and `h23-pivotencl:0` / `:1` major; `sixth5:0` / `:1` major; `sf-comp:0` major; `h6-approach:0` major; `penta5:0` minor (`SCALES.pentaMinor`, bass.ts:1196); `interval-shapes:1` / `:2` / `:4` neutral.
- **A cross-instrument check:** the same kind + option must classify the same on every instrument (the Harris line, `hlfast`, `sharm` / `harm` / `harris` and `tpair` families). The guard fails on any disagreement.
- **The classifier's results (v13 rerun):**
  - 416 placed levels, 2,028 option specs; 172 levels with a minor option, 134 split;
  - **moves against v11: 449 options.** v11 had no mode class, so every option that is now a mode counts as a move:
    - 222 major → neutral (mostly dominant-on-root and blues material, and the `H_SCALES` 7-dim / 7♭5-dim options 11–12);
    - 120 minor → mode and 82 major → mode (the parallel-mode and Aeolian views, R11-2);
    - 8 minor → pminor and 8 major → pminor;
    - 7 minor → neutral (the blues scale in `g-scales-3` and `b-scale-3` option 10, `b-scale-13` option 15, `g-scales-21` option 23, `b-walk-18` option 33, `sf-borrow:1`);
    - 2 major → minor (`b-walk-19` option 1, the minor waltz; `g-harm-12` `bw-iivi:1`, which now matches piano);
    - `b-scale-15` option 26 (altered) is neutral;
  - **unresolved: 0**;
  - **cross-instrument disagreements: 0**;
  - **the plan's row labels** (`labelcheck.ts`): 77 labelled rungs, 0 mismatches; 351 unlabelled or major-labelled rungs, each with a major-row option. **This is a level-level check:** a label passes when the level has at least one option whose class fits the row, because `prop.ts` carries rung ids, not picks. It is safe because the build's row filter admits only the picked options that fit; the exact per-pick check is the builder's guard above, which `tonality.ts` already runs on today's rungs. The check found nine rungs whose options are all minor but which carried no row label; v13 labels them and states it: **they sit on the minor rows only**. They are `b-scale-10` (the five minor pentatonic positions), `b-scale-5` (linked minor pentatonic), `b-tpair-5`, `k-tpair-14` and `g-tpair-7` (side-slip over the tonic m7), `k-bebop-2` (minor ii–V–i), `k-sharm-32` option 1 (the minor lines), `k-harrisline-15` (the chromatic scale, minor 6th-dim) and `k-harrisline-16` (the minor rules);
  - **view mismatches in today's key-ladder rungs: 0;**
  - **row mismatches in today's key-ladder picks: 4**, which the build fixes by splitting the rung by option: guitar `g-harris-1` options 2 and 3 and `g-harris-2` option 2 on the major row; bass `b-barry-1` option 1 on the major row.
- **A strict prototype of the table** (`scripts/top-tiers/guard.ts`; it holds exact kind lists and no patterns, except the cadence id inside chart kinds) ran over every level of the 45 families:
  - 2,533 specs, 0 unlisted;
  - the mixed levels it reports are exactly the two split lists above.

**Order within a tier.** Rank does not order the items inside a tier, so the Harris order inside a tier comes from the rung order. The rungs must be listed in the order the tables below give:
- piano T6: the 6th-dim harmonisation (arpeggiated → block → drop 2 → drop 3), then drop 2&4, then borrowing;
- piano T8: the expressions before "in context";
- piano line-jazz:
  - scales and the simple rules before the hard variants;
  - the enclosure (`harris-6`) before `harris-24`;
  - the pivot (`harris-19` → `-24`) in order;
  - `k-bebop-1` → `-9` in order;
  - `k-bebop-7` before comping while soloing;
- guitar T5 line-jazz: `g-harris-1` → `g-harrisline-10` → `g-harrisline-3`;
- guitar T7: `g-harm-9` before the borrowing rungs; in line-jazz the pivot arpeggio `g-harris-8` first, then `-9` (the scale with a pivot inside), then `-4` (its option 2, the dominant line with a pivot);
- bass scales T5: the 6th-dim scale (`b-barry-1`) → the ABCs (`b-harrisline-10`) → the half-step rules (`b-barry-3`); T6: the chromatic scale `b-harrisline-1` → the dominant rule and the important arpeggios `b-harrisline-3` → the major / minor rules `b-harrisline-4` → the pivot arpeggio `b-barry-7` → the scale with a pivot `b-barry-8` (which applies the major rule's extra note); `b-tpair-2` anywhere. Rules before devices.

**Across areas,** the Harris prerequisites are v15 §1.6 `established` prerequisites (§7). The planner skips a step until its prerequisite is established; this is never a lock.

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
| Scale bench, n/s | 1.3 [E] | 1.6 | 2.0 [E: a blend of G2 1.87 and G3 2.2] | 2.67 | 3.2 | 3.73 | 4.2 | 4.8 | 5.8 [E] |
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
- **One exercise, one cell.** The major row's Aeolian (`b-scale-3` option 5, `b-scale-12` option 0, `b-chord-16` option 5) is the same exercise as the minor row's natural minor (same `exerciseId`, v15 §1.7). It is counted once, in the minor row. The major row shows it as a view of that cell, with the same passes.
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
| degree sequences (`b-scale-6` option 0, `b-chord-15`–`18`) | their tier (`b-chord-17` T3) | **none** (§1.5) |

**Bass tables:**
- **bench:** [1.17, 1.17, 1.4 [E: a blend of G2 1.33 and G3 1.5], 2.67, 2.67, 3.33, 3.33, 3.33, 4.0];
- **`SPEED_NPS`** (the next RSL step; T8 × 1.1): [1.33, 1.5, 2.67, 3.33, 3.33, 4.0, 4.0, 4.0, 4.4];
- **`tierOfNps`** returns band floors, used only for tolerance: < 1.25 → T0, < 2.0 → T2, < 3.0 → T3, below ♩110 (n/s < 11/3) → T5 (T5–T7 share this band), ♩ ≥ 110 (n/s ≥ 11/3) → T8. §1.4's bass swing band uses the same cuts.

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

`realCatalogues()`; piano and guitar on 5 areas, bass on v15's 3.

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

Proposed counts (all core, 12-key rungs at runtime), with the §9.1 harness (v16) on each proposed area. **Chart and tune rungs: the key convention.**
- Most chart-based rungs take `spec.key` as the tonic: `k-sharm-42`, `k-bebop-9`, the cadence charts, `g-solojazz-2` / `3`, the outlines. They render in the row's key as they are.
- **The bass `standard` walks** (`b-walk-11` / `-13` / `-14` / `-18`) take `spec.key` as an **offset from the lead sheet's key** (bass.ts:1471–1477; `drill.tonic` is the real key).
  - As a rung, they must pass the offset `(row tonic − std.key) mod 12`.
  - A minor tune uses the row's minor tonic, and sits on a minor row (Appendix B).
  - A scan of every placed chart or tune rung (`scripts/top-tiers/offset.ts`: generate at key 2, compare `drill.tonic.key`) found these four levels as the only offset users.
- All are 12-key rungs and are counted like any other:

| Instrument / area | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | First rank, days (p 0.75, 3 d/wk) | Median transition, days | Climb stalls ≥ 42 d |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| piano / scales | 0 | 1 | 2 | 3 | 7 | 6 | 7 | 7 | 7 | 38 (T1, unchanged) | 24 | 0 |
| piano / arpeggios | 0 | 0 | 0 | 4 | 8 | 8 | 7 | 5 | 4 | 21.5 (T3) | 25 | 0 |
| piano / harmony | 6 | 5 | 2 | 11 | 13 | 10 | 14 | 17 | 12 | 17 | 25.5 | 0 |
| piano / independence | 0 | 2 | 4 | 9 | 4 | 3 | 4 | 6 | 3 | 24 (T1) | 26 | 0 |
| piano / line-jazz | 0 | 0 | 0 | 0 | 0 | 12 | 13 | 12 | 23 | 17 (T5) | 23.25 | 0 |
| guitar / scales | 0 | 2 | 4 | 6 | 8 | 12 | 16 | 17 | 15 | 24.5 (T1) | 23.25 | 0 |
| guitar / arpeggios | 0 | 0 | 2 | 3 | 5 | 4 | 3 | 3 | 5 | 21 (T2) | 23 | 0 |
| guitar / harmony | 0 | 0 | 3 | 3 | 9 | 9 | 19 | 13 | 10 | 18.5 (T2) | 21 | 0 |
| guitar / independence | 0 | 2 | 5 | 3 | 3 | 3 | 2 | 3 | 3 | 25 (T1) | 26.75 | 0 |
| guitar / line-jazz | 0 | 0 | 0 | 0 | 0 | 5 | 5 | 8 | 14 | 18 (T5) | 20 | 0 |
| bass / scales | 5 | 4 | 8 | 9 | 5 | 13 | 10 | 10 | 13 | 16.5 | 25 | 0 |
| bass / arpeggios | 4 | 3 | 5 | 6 | 5 | 8 | 5 | 4 | 8 | 17 | 25.5 | 0 |
| bass / walking | 3 | 3 | 4 | 3 | 4 | 4 | 5 | 5 | 3 | 18.5 | 26 | 0 |

- **Every proposed climb reaches every rankable tier,** T8 included, within 365 days (steady learner, 60 runs), with no stall ≥ 42 days.
- **Every tier meets the floor (2) on core items.** These tiers sit at the floor, below the ≥ 3 target:
  - piano harmony T2, piano independence T1 (both inherited);
  - guitar arpeggios T2, guitar independence T1 and T6.
- **Counting:** one exercise per rung (conservative; v15 §1.7 counts each option). The exceptions are `b-chord-5` (1st, 2nd inversion), `b-chord-6`, `b-chord-12` and `b-chord-13`: their options are different chord types or inversions (RSL G7 lists maj9, m9 and dom9 as three arpeggios), so they are listed as one rung per option at every tier where they appear. Levels split by option (§1.5) count once per area part.

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
| T5 | + `k-sharm-15` drop 2 (major, Aeolian), minor `-16`, melodic `-14`, `-47` 9ths on every degree, minor `-48`; `k-dimcol-1` the colours of the diminished (struck; moved from line-jazz); `k-harrisline-8` upbeat comping on 2+ and 4+ (seed T5) | 10 |
| T6 (the 6th-dim harmonisation, moving inversions, then first borrowing) | in rung order: the Harris options 9–12 (6th-dim, minor 6th-dim, 7-dim, 7♭5-dim) of `k-sharm-12` (chord and dim in turn, arpeggiated; one rung, which includes the minor 6th-dim option 10 that used to be a separate line-jazz rung), `-14` (block, moving inversions), `-16` (drop 2), `-18` (drop 3), per BARRY-HARRIS-THEORY §6.3; melodic `-16` drop 2; `-17` drop 3, minor `-18`; `-35` drop 2&4; then `-19` borrowing one voice (6th-dim), `-20` borrowing one voice (m6, 7, 7♭5-dim); existing `k-cadlib-23` / `24` / `26`; `k-harrisline-9` hit only the "ands" (Harris upbeat comping, seed T6) | 14 |
| T7 (borrowing completed, the elevator, the moves) | `k-sharm-21` two voices, `-23` borrowing while walking the scale (its walking items), `k-tpair-3` triad pairs in close position (struck), `-22` the chord above / another dim / passing, `-24` in drop 2, `-25` in drop 3 (their borrowing items), `-38` three voices; `-33` the elevator from the tonic, `-40` the minor 6-dim elevator from the tonic; `-34` 7th-dim / 7♭5-dim scales in drop 2 / 3 over V7 → I; `-37` Harris's moves; `-36` the sixth on the fifth; `-41` Echols's shells (shown items only); `k-cadlib-17` / `18` four-way close, `-20` / `21` two-hand voicings | 17 |
| T8 (the 8 expressions, then in context) | `k-sharm-26` the eight expressions in drop 2 → I6, `-39` the related dominants over a shell / the tritone's minor; in context: `-30` comping a turnaround and a jazz blues with the substitutions, `-31` borrowing inside the substitutions, `-23`, `-24` (`bw-iivi-d2`) and `-25` (`bw-std-d3`) their ii–V–I and turnaround items, minor rows `-32` minor ii–V–i (its voicings), `-42` a substitute on each V of a tune (chord charts); `k-cadlib-22`, `k-reharm-8` upper structures over a pedal, `k-reharm-4` reharmonising in the key | 12 |

**Rating seed vs placement** (`K_HARM_DIFF`, harmLadder.ts). The overrides:

| Level | Rating → seed | Placed | Reason |
|---|---|---|---|
| `k-sharm-17`, `-18` | 1520, 1600 → T8 | T6 | §6.3: moving inversions (drop 3) precede borrowing (`-19`, seed T6) |
| `k-sharm-35` | 1620 → T8 | T6 | §6.3: drop 2&4 is a moving-inversion step, so it goes with `-17` / `-18`, before borrowing |
| `k-sharm-24`, `-25`, `-38` | 1600, 1650, 1520 → T8 | T7 | §6: borrowing finishes before the 8 expressions (T8) |
| `k-sharm-23` (walking items) | 1540 → T8 | T7 | split by option: borrowing while walking is step 4 (borrowing); its ii–V–I / turnaround items stay T8 (step 6) |
| `k-sharm-24`, `-25` (context items `bw-iivi-d2`, `bw-std-d3`) | 1600, 1650 → T8 | T8 | the same split, applied evenly: their borrowing items T7 (override above), their context items T8 (= seed) |
| `k-sharm-12` / `-14` / `-16` / `-18`, Harris options | 1260 / 1340 / 1450 / 1600 → T5 / T6 / T7 / T8 | T6 | §6.3: the 6th-dim harmonisation (arpeggiated, block, drop 2, drop 3) is one step, before drop 2&4 and borrowing |

- Every other `k-sharm` placement equals its seed: `-19`, `-20` T6; `-21`, `-22`, `-33`, `-34`, `-36`, `-37`, `-40`, `-41` T7; `-26`, `-30`–`-32`, `-39`, `-42` T8. `-27`, `-28`, `-29` and `-32`'s lines are line-jazz T8 (§1.5).
- `harris-9` / `-10` (6th-dim and minor 6th-dim block chords) duplicate the Harris options above. They stay path levels, not rungs, so nothing is counted twice.
- **The rungs moved from B keep their ladder mins** (§1.2 step 1).
- **Rung order inside a tier** follows the table (§1.5).
- **Harmony rows:** row classes are **generated, not hand-written**: Appendix B classifies every option with the tonality classifier (§1.5), and the rung tables below say what is picked. Minor and `pminor` options go on the minor rows, major options on the major rows, modes on the major rows as views, and neutral options (chord quality, key-neutral technique, blues, dominant-on-root material) on both rows. For example, the Harris option 10 (minor 6th-dim) of `k-sharm-12` / `-14` / `-16` / `-18` and `-35`, all of `-40`, and `-41` options 6 and 9 are minor.
- **Fm6 / Bm6** appear only inside `-26` / `-29`, at T8. That is the Harris way's H-5 (BARRY-HARRIS-THEORY §4), at low weight.

**Independence** (content steps; "more keys" is never a step):

| Tier | Exercises |
|---|---|
| T4, T6 (fills) | T4: `k-indep-4` left-hand ostinato under a right-hand melody, `fingers-8` thumb under (both seed T4). T6: `k-indep-8` all at once (a touch per hand, a held note over triplets), `fingers-10` held notes, Pischna / Dohnányi style (both seed T6). Added because on the v15 harness T3→T4 measured 46 days, above the 42-day stall line |
| Rows | Rows are **generated, not hand-written**: Appendix B, from the tonality classifier (§1.5). Minor options go on the minor rows, major and modal options on the major rows, and neutral options (chord quality or key-neutral technique) on both rows. Key-neutral hand technique (`fingers-8`, `fingers-10`, `advanced-3` / `-6` / `-8`, `fingers-13`, SP item 37, N15, polyrhythm) is neutral, so it sits on both rows; `k-indep-4` / `-8` and the RH line over a LH walking bass are major. Minor-row sessions get independence at T4, T6 and T7–T8 |
| T7 | `advanced-3` staccato and diatonic HT octaves (octave factor: target 3.72 n/s = 16ths ♩56, start 0.85 × target; ≤ 2 octaves, capped reps; its chromatic-octave items fold into N15, so the two never overlap); `advanced-6` polyrhythm 2:3 / 3:4 hands swapped (`advanced-7` "in more keys" folds in as coverage); `advanced-8` hand crossing, leaps, double 6ths (capped); `fingers-13` Czerny-style velocity runs over the LH; SP item 37 rung 5 (one hand leaps, the other holds a pattern); **new** N15 chromatic scale in octaves, **hands together** (the main item v15 counts), nps rungs T7–T8 (§1.5 row 10's octave exception): T7 rung (target 16ths ♩56; RCM L9 ♩60 [V]) |
| T8 | **new** N15, T8 rung (target 16ths ♩66, climbing inside T8 to ♩80 = RCM L10 [V]); **new** RH generated line over a LH walking bass (SP item 7 extended); **new** polyrhythm with moving figures (a RH scale in 3 against a LH broken chord in 4, then swapped) |

**Line-jazz** (content tier, tempo a sub-band, §1.4; Harris order scales → rules → devices, simple before hard):

| Tier | Exercises (rung order) | Count |
|---|---|---|
| T5 | existing `harris-1` the 6th-dim scale, `k-tpair-1`, `k-modes-3` the bebop dominant on V; `k-harrisline-2` the ABCs, `-6` Barry's chromatic scale (major), `-3` the dominant rule (one, or none), `-7` the major rule from 1, 3, 5, 6, `-4` the three important arpeggios; `harris-6` half step below, enclosures; the bebop-line ladder begins: `k-bebop-1` lines over ii–V–I, `-2` minor ii–V–i, `-3` altered dominants | 12 |
| T6 | existing `k-tpair-2`, m6dim `scales-31` the minor 6th-dim scale; `harris-26` the dominant 7 / 7♭5-dim scales; `k-harrisline-11` / `-15` the chromatic scale (dominant, minor 6th-dim), `-13` arpeggio into the scale / the ♭7-major pivot, then `-33` the dominant rule (three, or two), `-12` the major rule (three, and two from 2 and 4), `-16` the minor rule from every degree; the scale outlines `-10` (rhythm changes), `-14` (Cherokee, Donna Lee); `k-bebop-4` lines over the jazz blues, `-5` over rhythm changes | 13 |
| T7 | `k-harrisline-19` the chromatic scale in two voices (3rds, 6ths, 10ths), `-20` 3 to ♭9 over the family, `-21` seven down to the 3rd, `-25` the triplet rules, `-18` the outlines of How High the Moon / Night in Tunisia; `harris-15` ii–V–I lines by the rules; then the pivot: `harris-19` (maj7, m7, 7, m7♭5), `-20` (6 and dim7); triad-pair lines `k-tpair-4`, `-5`; `k-bebop-6` lines over standards, `-7` both hands: shells and a line (the precursor of comping while soloing) | 12 |
| T8 | **new** `k-hlfast-1` … `-4` Harris lines at bebop tempo (chromatic scales and outlines; the rules from every degree; seven down / 3 to ♭9 / the triplet rules; lines through whole outlines; shown devices only; mirrors `g-hlfast`); `k-sharm-27` / `-28` / `-29` the expressions' scales and mixing them per bar (lines; with the expressions at T8); `k-sharm-32` (its lines); the pivot continued, in rung order: `harris-21` from every chord tone and the mirror, `-22` through ii–V–I, `-23` a descending scale with a pivot inside, `-24` pivot and enclosure down the bebop scale; `harris-17` chromatic runs between chord tones, `-18` the important minor (lines through each chord's 6th-dim scale), `-16` the family of dominants as lines (one dominant a bar, `h16-chains`); triad-pair lines `k-tpair-11` (through ii–V–I) and `-14` (side-slip), mirroring `g-tpair-6` / `-7` and `b-tpair-5`; the outlines `k-harrisline-30` (All the Things You Are, Giant Steps); `-35` 3 to ♭9, two dominants a bar; `k-harrisline-34` the chromatic scale in two voices, every interval; `k-harrisline-28` the miscellaneous rule; `k-bebop-9` lines over whole forms (chord charts); then **new** comping while soloing (RH line card over LH rootless comping cells, SPEC-HOLISTIC-2 §8.8; after `k-bebop-7`) | 23 |

Moved out (§1.5): `k-dimcol-1` (struck) and m6dim `k-sharm-12` (a degree sequence) go to harmony T5 / T6.

**Line-jazz rating seed vs placement** (path.ts `HL_LEVEL_DIFF` / `KEYS_LEVEL_DIFF`). The overrides:

| Level | Rating → seed | Placed | Reason |
|---|---|---|---|
| `k-harrisline-2`, `-3` | 1180, 1230 → T4 | T5 | the key-ladder jazz line track starts at T5 (`harris-1`); the precursors sit at its first tier |
| `harris-26` | 1100 → T3 | T6 | Harris order: the dominant 6th-dim scales follow the 6th-dim scale (`harris-1`, T5) and come with the chromatic scales |
| `harris-6` | 1180 → T4 | T5 | the track starts at T5; the enclosure must precede `harris-24` (pivot and enclosure, T8) |
| `k-bebop-1`, `-2` | 1120, 1190 → T3, T4 | T5 | the track starts at T5; the bebop-line ladder must precede `k-bebop-9` (whole forms, T8) |
| `k-bebop-7` | 1540 → T8 | T7 | the precursor of comping while soloing (T8) |

- **Every other placement equals its seed:** `-4`, `-6`, `-7` T5; `-10`, `-11`, `-12`, `-13`, `-14`, `-15`, `-16`, `-33` T6; `-18`, `-19`, `-20`, `-21`, `-25`, `harris-15`, `-19`, `-20` T7; `-28`, `-30`, `-34`, `-35`, `harris-17`, `-18`, `-21`–`-24` T8. `harris-16` (1680), `k-tpair-11`, `-14` (T8), `k-bebop-3` (T5), `-4`, `-5` (T6), `-6` (T7) and `-9` (T8) equal their seeds.
- `k-tpair-4` / `-5` follow their seeds (T7). `k-tpair-3` (close position, struck) is harmony T7 by §1.5.
- **The k-bebop choice: the ladder is placed** rather than `k-bebop-9` dropped.
  - Placing it keeps the flow: a learner meets the `bebopLine` generator on ii–V–I before whole forms.
  - It raises every count, so the floor holds.
  - It gives comping while soloing its precursor (`k-bebop-7`).
- **Rows (major / minor):** row classes are **generated, not hand-written**: Appendix B classifies every option with the tonality classifier (§1.5), and the rung tables below say what is picked. Minor and `pminor` options go on the minor rows, major options on the major rows, modes on the major rows as views, and neutral options (chord quality, key-neutral technique, blues, dominant-on-root material) on both rows. Examples: `k-harrisline-21` options 0 and 2, `harris-17` option 2, `harris-22` option 1, `k-tpair-11` option 2 and `k-bebop-9` option 2 are minor; `harris-15`, `k-bebop-6`, `harris-18` and `k-harrisline-18` split by option. The new `k-hlfast` levels take the `g-hlfast` rows option by option. Minor-row key sessions get line-jazz from T5 (`k-bebop-2`).
- **One cell, not two:** m6dim `scales-31` (the existing ladder rung) and `harris-25` drill the same minor 6th-dim scale. They are counted once, as `scales-31`; `harris-25` stays a path level of that cell.
- **Not rungs (every shown `harris` / `k-bebop` / `k-harrisline` level not placed), with the reason:**

| Level | Disposition | Reason |
|---|---|---|
| `harris-2` dominant scale down from each chord tone | not a rung | duplicate of `k-harrisline-3` / `-33` (the dominant rule from every degree) |
| `harris-3` triads on every degree | not a rung | a degree sequence (harmony, §1.5), duplicate of the spine (`k-sharm-7`) |
| `harris-4` 4-note chords and "3 to 9" | not a rung | duplicate of the spine (`k-sharm-11`) and of `k-harrisline-4` / `-20` |
| `harris-5` "Pivots" (1-3-5-7 up, turn at the octave) | not a rung | **not** the owner-confirmed pivot arpeggio (BARRY-HARRIS-THEORY §7, "there is no second pivot"). Kept out; its title should be renamed (e.g. "Chord tones up, turn at the octave") |
| `harris-7` lick + line over V7, then ii–V | coverage | a lick is memorised material (§1.10); `h7-line` is on the §1.5 coverage row |
| `harris-8` brothers: **two dominants a bar** (each brother gets two beats, a 3-5-7-9 arpeggio; generate.ts:1863–1876) | not a rung | the dense form. The owner's order is one dominant a bar first (`k-harrisline-20`, T7), two a bar at the advanced level (`k-harrisline-35`, T8). `harris-8` duplicates `-35`'s dense form, so it is kept out |
| `harris-9`, `-10` 6th-dim / minor 6th-dim block chords | not rungs | duplicates of the `k-sharm-14` / `-16` / `-18` Harris options (harmony T6) |
| `harris-11` arpeggio up, dominant scale down | not a rung | duplicate of `k-harrisline-13` (arpeggio into the scale) |
| `harris-12` Harris lines with the left hand and hands together | not a rung | a hands variant of `harris-2` / `-3` / `-5` / `-6` (mixed; split if ever used) |
| `harris-13` diminished moves | not a rung | duplicate of `k-sharm-37` (Harris's moves, harmony T7) |
| `harris-14` the half-step rules from any start | not a rung | duplicate of `k-harrisline-33` / `-12` / `-16` |
| `harris-25` minor 6th-dim scale | not a rung | the same cell as `scales-31` (above) |
| `k-tpair-6`, `-8`, `-9`, `-13`, `-15`, `-16` (pair patterns, vamp, blues, form, symmetric pairs) | not rungs | beyond the per-key core; T8 line-jazz already holds 23 rungs, and `-11` / `-14` mirror the guitar and bass pair tracks. Candidates if a flow audit wants more triad-pair depth |
| `k-tpair-7`, `-10`, `-12` (spread, block, comping) | not rungs | struck pair voicings (§1.5 row 6); the piano harmony ladder already holds `k-tpair-3` |
| `k-bebop-8` trading fours | coverage | Trading 4s is coverage only (§1.10) |
| `k-bebop-10` the Coltrane matrix | not a rung | multi-key; RESEARCH-KEY-EXERCISES-AUDIT §6 keeps it in its family, outside the per-key ladder |
| hidden `k-harrisline` rows (5-4-3-2, compose, the blues outline) | out | hidden (BARRY-HARRIS-THEORY §12) |
| `k-harrisline-8`, `-9` | placed in harmony | upbeat comping (§1.5 row 6) |
- The existing ladder rungs (`harris-1`, `k-tpair-1` / `-2`, `k-modes-3`) keep their ladder mins (§1.2 step 1).

### 4.2 Guitar (re-banded, T0–T8)

**Rule:**
- Content tier = the level's `grade` tier (§1.2).
- Scale and arpeggio rungs start at their grade tier, and their nps rungs climb the guitar bench (§2.2).
- §1.5 applies. **Harmony (no nps rungs):**
  - struck chords: `g-harm-3`, `-5`, `-7`–`-9`, `-14`, `g-vl-*`, `g-harris-2`, `-7`, `g-tpair-1` (strummed shapes), `g-tpair-5`, `g-harrisline-8`;
  - degree sequences: `g-harm-2`, `-4`, `-6`, `-15`, `-16`.
- **Arpeggios (nps rungs):** `g-arps-*` (including `g-arps-5`'s ii–V–I option, an arpeggio pattern through a fixed progression), `g-speed-3` and `g-speed-4` (sweeps and tapped arpeggios).
- **Line-jazz:** `g-harris-6` (the brothers' arpeggios: one brother per bar, R-3-5-♭7 up and down, from one diminished chord; not the dense two-a-bar form kept out on piano. Its option 1 is the four minor 6ths from one diminished chord (in C: Fm6, A♭m6, Bm6, Dm6). It includes Fm6 / Bm6, which the owner calls rare, so option 1 gets the same low weight as piano's H-5 note) and the lines of `g-harris-12` (split by option).
- **Guitar rows (every area):** row classes are **generated, not hand-written**: Appendix B classifies every option with the tonality classifier (§1.5), and the rung tables below say what is picked. Minor and `pminor` options go on the minor rows, major options on the major rows, modes on the major rows as views, and neutral options (chord quality, key-neutral technique, blues, dominant-on-root material) on both rows. Examples: `g-harris-1` options 2 / 3, `g-harris-2` option 2, `g-harris-7` options 1 / 2, `g-harrisline-1` option 2, `-2` option 5, `-4` options 9 / 13, `-6` option 0, `g-hlfast-1` option 2, `-2` options 9 / 13, `-3` option 0, `-4` option 5, `g-tpair-5` / `-6` option 2 are minor. The pivot order at T7 is `g-harris-8` → `-9` → `-4` (§1.5).
- There is no guitar key-ladder content at T0, because the grade-0 material (`g-first`) is keyless. A beginner places at T1 (Q9).
- All items below are core (§1.3).

| Area | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|
| Scales | `g-scales-1` minor pentatonic box 1 (minor rows); `g-scales-3` blues + major pentatonic *(override G3 → T1: the pentatonic pair; catalogue rule)* | + `g-scales-12` interval shapes, `g-harm-1` every scale note by note (G3; **major rows only**, option 0, nps rungs 2–4) | + `g-scales-4` E / A shapes, `-2` boxes 2–5 | + `-5` 5 CAGED, `-8` connecting, Aeolian / harmonic `-13` | + `g-picking-3` 3nps, Dorian / Mixolydian `-14`, Aeolian `-16`, harmonic `-17`, `-11` Segovia | + Lydian / Phrygian / melodic `-15`, melodic `-18`, `-9` 3nps whole neck, `-6` 7 patterns | + `-10` interval sequences, Locrian `-7`, `-19` / `-20` minor modes, `-21` dim W–H | + `g-speed-1` |
| Arpeggios (×0.8) | — | `g-arps-1` major and minor triads (two rows) | + `g-arps-2` CAGED triads | + `-3` inversions, `g-arps-4` 7ths | + `g-arps-6` 7ths in 5 shapes | (spans only) | + `g-arps-7` 9 / 13 / upper structures, `g-arps-5` dim7 / altered / ii–V–I | + `g-speed-3` sweeps at speed, `g-speed-4` tapped arpeggios and sweeps |
| Harmony (fixed) | — | `g-jblues-2` shells, `-3` guide tones, `-4` Charleston (blues in the key) | `g-harm-2` (major rows), `g-vl-1`, `g-jazz-1` shell voicings ii–V–I, four to the bar and comping rhythms (G4; major-row items) | `g-harm-2` minor and Aeolian rows (after their scales, guitar scales T4), `g-harm-4` (3 rows), `g-harm-3` 3rds as double stops (2 rows), `g-harm-15` cells (2 rows) | `g-harm-6` (major, minor, Aeolian, **Dorian, Mixolydian**), `g-cadlib-1` (2 rows), `g-harm-5` block triads, `g-vl-2` drop 2 by step | **Lydian / Phrygian** `g-harm-6`, melodic `g-harm-2` / `4` / `6`, `g-cadlib-2`–`5`, `g-harm-7` drop 2, `g-harm-14` triads and inversions (2 rows), `g-harm-16` 9ths on every degree (2 rows), `g-vl-3` drop 3 by step, `g-harrisline-8` upbeat comping, `g-tpair-1` pair shapes (strummed), `g-harris-2` the scale of chords | **Locrian** `g-harm-6`, `g-cadlib-6`–`9`, `g-harm-8` drop 2, `-9` drop 3 and drop 2&4, `-10` / `-11` borrowing, `-13` borrowing on other string sets *(override: grade 10 → T7, Harris order: borrowing finishes before the expressions)*, `g-harm-12` its borrowing-while-walking items *(override: grade 9 → T7, same reason; split by option)*, `g-harris-13` its borrowing items (`bw-three`, `bw-root`) *(override: grade 10 → T7, same reason)*, `g-harris-7` | `g-harris-11` the 8 expressions / moves, `-12` its voicing items (contrary motion, drop 2 over V7, the shells), then in context: `g-harm-12` and `g-harm-13` (`bw-iivi-d3`) their ii–V–I / turnaround items, `g-harris-13` (its substitution comping), `g-cadlib-10`, `g-tpair-5` comping with pair shapes, `g-solojazz-1` / `2` / `3` (walking bass with guide tones / shells: ii–V–I, blues, rhythm changes; charts) |
| Independence | `g-picking-1`; `g-fretting-1` *(override G2 → T1: no lone bottom tier)* | `g-legato-1` / `2`, `g-fretting-2` / `3`, `g-picking-2` | `g-fretting-4`, `g-legato-3`; **new** two-string picking sequences in 8ths (planned fill) | `g-picking-4`, `g-legato-4`, `g-fretting-6` (widen to 12) | `g-fretting-5`, `g-picking-10`; **new** legato sequences in 8ths (planned fill) | `g-legato-5`; **new** picked 3nps sequences (groups of 3 / 4, inside and outside crossing), 8ths | `g-legato-7`; **new** legato sequences in 16ths; **new** picked sequences in 16ths | `g-speed-2`, `-5`, `g-fusion-2` (capped stretch) |
| Line-jazz | — | — | — | — | in rung order `g-harris-1`, `g-harrisline-10` ABCs, `g-harrisline-3` the dominant rule and the important arpeggios *(override G7 → T5, mirroring piano T5's `k-harrisline-3` / `-4`; every option neutral)*; `g-jazz-5` guide-tone lines, `g-bebop-6` digital patterns through the changes | `g-tpair-2`, `g-harrisline-1` / `2` / `4`, `g-harris-3` the dominant scale with the half-step rules | `g-scales-21` bebop dominant on V, `g-harrisline-6`, `g-tpair-3` / `4`, `g-harris-4` / `5` / `8` / `9` | `g-harrisline-7`, `g-tpair-6` / `7`, `g-harris-10`, `g-hlfast-1`–`4`, `g-fusion-1` / `3` / `4` / `5`, `g-harris-6` the brothers' arpeggios, `g-harris-12` its lines |

Notes:
- **`g-harm-1`'s row rule.** It carries every `H_SCALES` option, so its picks follow their scales:
  - major rows at T2 (option 0);
  - the minor row (option 7, harmonic) from T4, and the Aeolian (option 5) from T4 as the major-row view at offset 9, as `g-scales-13`'s Aeolian is (§1.5 modal options);
  - melodic (option 8) from T6;
  - the modes with their scales: Dorian and Mixolydian (options 1, 4) from T5; Phrygian and Lydian (2, 3) from T6; Locrian (6) from T7;
  - **never** the Harris options 9–12 here, because those are line-jazz scales (Appendix B lists them, classified, but does not pick them).
  - The §1.5 guard checks it.
- **Modal harmony follows its scale's grade:** Dorian / Mixolydian G6 → T5; Lydian / Phrygian / melodic minor G7 → T6; Locrian G8 → T7.
- **`g-harrisline-7`** is grade 8 in harrisLineDrills.ts but 9 via `GUITAR_GRADE_UP`. The effective grade is 9. Align the code comment.
- **The guitar Harris track differs from the piano's, and that is intended for now.** On guitar, the moves, the sixth on the fifth and the elevator arrive at T8, bundled in `g-harris-11` / `12` (grade 10). The piano has them separately at T7. Splitting `g-harris-11` / `12` into single-topic levels is a later content item.
- **The scale with a pivot inside sits at different tiers per instrument,** and that is intended under Q2 (each instrument by its own standards): bass T6 (`b-barry-8`), guitar T7 (`g-harris-9`), piano T8 (`harris-23`, seed T8). Likewise **the miscellaneous rule**: bass T7 (`b-harrisline-7`, bundled with the triplet rules) vs piano T8 (`k-harrisline-28`, alone). A flow audit should not "fix" either.
- **Not counted:** `g-harrisline-9` (compose a line: hidden, not pursued); `g-solojazz-4` (a whole head with its melody: memorised, coverage only).
- **Guitar independence:** T6 sits at the floor. Its planned fill is the new 8th-note sequence levels above. The T3 and T5 fills are new rule-generated sequence levels, named in the table.

### 4.3 Bass (RSL-banded, v15 areas, T0–T8)

- **Keys.** A key rung renders in its row's key (keyIndex.ts:683, `keys: [root]`), so every rung is 12-key whatever its path level's list says. Per the all-12-keys rule, the path levels with short lists widen to 12: `b-fret-6` (4), and the K4 / K6 levels `b-scale-1`, `-5`, `-10`, `b-chord-12`, `-13`, `b-barry-1`–`6`.
- Open-string levels (`b-pluck-1`–`3`, `b-legato-5`) are not rungs.
- nps rungs follow §2.3.

| Area | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|---|
| Scales (A, D, F) | `b-scale-2` major; `b-scale-1` minor pentatonic; `b-fret-1` chromatic; `b-fret-2` permutations; `b-legato-1` slides | natural minor `b-scale-3` (minor rows; the major row's Aeolian is the same exercise, §2.3); major pentatonic; `b-fret-3` Simandl; `b-legato-2` | nps rungs (§2.3); blues; `b-pluck-4` skipping; `b-fret-4` shifts; `b-pluck-5` 16ths | nps rungs (8ths); `b-scale-6` in 4ths; `b-fret-7` octaves and 10ths; `b-pluck-6` accents; `b-pluck-10` | harmonic minor `b-scale-7` (minor rows); `b-fret-8` upper register; `b-pluck-7` raking; `b-pluck-11` i-m-a; `b-fret-6` | nps rungs at 100; Dorian / Mixolydian `b-scale-4`; `b-scale-10` five pentatonic positions; `b-scale-5` linked; `b-barry-1` 6th-dim scale; `b-harrisline-10` the ABCs; `b-barry-3` half-step rules; `b-tpair-1` | Lydian / Phrygian `b-scale-8`; melodic minor `b-scale-7`; `b-fret-5` major 2 octaves; `b-tpair-2`; in rung order: `b-harrisline-1` chromatic scale, `-3` the dominant rule and the important arpeggios, `-4` the major and minor rules, then `b-barry-7` the pivot arpeggio, `-8` the scale with a pivot | `b-scale-9` WT / dim / altered on V; natural minor 2 octaves `b-scale-12` (minor rows; one exercise); `b-scale-13` Locrian, dim W–H, bebop dominant on V *(Locrian has no RSL grade; [E], kept with its level)*; `b-harrisline-6` seven down / 3 to ♭9, `-7` the triplet rules; `b-harrisline-2` the scale outlines (rhythm changes, Donna Lee); `b-barry-5` / `6`; `b-tpair-3` / `4` | `b-scale-14` / `15` melodic- and harmonic-minor modes; harmonic / melodic 2 octaves `b-scale-12` [E: beyond RSL, which lists only natural minor over two octaves]; `b-tpair-5` side-slip; **new** `b-hlfast-1` / `2` / `3` Harris lines at tempo (§1.4; shown devices); the G7–G8 scales at the diploma tempo |
| Arpeggios (S, B; ×1.0) | `b-chord-2` R–5; `b-chord-3` R–5–8 [E: no RSL grade]; `b-chord-4` triads, both rows (RSL Debut) | `b-scale-6` diatonic 3rds (the spine's first step, no nps rungs) [E: no RSL grade]; `b-chord-5` 1st and 2nd inversion (two options = two exercises) [E: no RSL grade] | nps rungs; `b-chord-6` **dom7** option (G3) | nps rungs (8ths); `b-chord-17` 1-2-3-5 cells (major rows; its ladder min, matching piano T3 / guitar T4; no nps rungs) | `b-chord-6` **maj7** and **m7** options (G5); `b-chord-7` two-octave triads / dom7; `b-chord-11` two-octave 7ths (G5); minor `b-chord-17` (harmonic minor) | `b-chord-6` **m7♭5** and **dim7** options (G6); `b-chord-15` diatonic 7ths through major (has viiø7); natural-minor and harmonic-minor `b-chord-16` (minor rows; have iiø7, vii°7; the harmonic-minor form also has mMaj7 and maj7♯5, which no RSL grade lists [E], order accepted); nps rungs at 100; `b-chord-14` high-register chords *(fixed tempo; RSL 2018 puts high-register chords at G7 and plain double-stop chords at G6; placed at T5, a judgment call [E])* | `b-chord-12` maj9, m9, 9 (three options = three exercises); `b-chord-18` 9ths through the scale (both rows; the harmonic-minor form has V7♭9, an RSL G8 type [E], order accepted) | `b-chord-13` 7♯5, 7♭5, 7♯9, 7♭9 (four options = four exercises, §1.7 `exerciseId`) | `b-chord-11`, `-12` (three options) and `-13` (four options) at the diploma tempo [E] |
| Walking (E) | `b-chord-1` roots of a chart; `b-walk-1` two-feel; `b-walk-2` quarter roots and 5ths | `b-chord-8` chord tones; `b-walk-21` first blues line; `b-walk-3` arpeggio walk | `b-chord-9` nearest chord tone; `b-walk-4` chromatic approach; `b-walk-5` dominant approach; `b-chord-10` slash / pedal | `b-walk-6` scale-step approach; `b-walk-7` mixed approaches; `b-walk-8` ghosted skips and triplet drops | `b-cadlib-1` (both rows); `b-walk-14` in 2, ballads, bossa; `b-harrisline-8` ties on the upbeats | `b-cadlib-3` (both rows); `b-barry-4` the rule in a walk; `b-walk-19` jazz waltz | `b-cadlib-2` / `4` approach over substitutes / longer forms; `b-walk-10` rhythm changes; `b-walk-20` blues-waltz chorus; `b-barry-2` the diminished as a passing chord (a walking drill, `dimpass`) | `b-cadlib-5` / `6` free walking over substitutes / longer forms + pedal; `b-walk-11` / `13` walking a standard from its chart, one chorus; `b-walk-16` sight-read and improvise the walk | **new** the duo line over the ii–V family; **new** the duo line over longer forms; `b-walk-18` forms, cycles, Coltrane changes (charts, 12 keys at runtime) |

- **The bass Harris track: placement vs rating seed.**
  - The bass Harris ratings (`B_LEVEL_DIFF`) are not on the piano scale. They run 1150–1900 for material whose piano equivalents seed T5–T8.
  - So the bass Harris track is placed by the Harris order against the bass Harris-scale tier (T5: `b-barry-1`, the 6th-dim scale; §1.4 line rule).
  - Every listed level departs from its seed for that one reason:

| Level | Rating → seed | Placed |
|---|---|---|
| `b-barry-1` 6th-dim scale | 1540 → T8 | scales T5 |
| `b-harrisline-10` the ABCs | 1150 → T4 | scales T5 (the track starts at T5) |
| `b-barry-3` half-step rules | 1643 → T8 | scales T5 |
| `b-tpair-1` pair lines | 1400 → T6 | scales T5 |
| `b-tpair-2` alternating inversions | 1460 → T7 | scales T6 |
| `b-barry-7` the pivot arpeggio | 1849 → T8 | scales T6 |
| `b-barry-8` scale with a pivot | 1900 → T8 | scales T6 |
| `b-barry-2` dim as a passing chord (`dimpass`) | 1591 → T8 | walking T6 |
| `b-harrisline-3` the dominant rule, the important arpeggios | 1280 → T5 | scales T6 (after the ABCs and the half-step rules at T5; before the pivot devices) |
| `b-harrisline-2` the outlines | 1300 → T5 | scales T7 (after the rules, as on piano) |
| `b-barry-5` pivots: break the line (the octave break inside a descending dominant line: "a scale line with a pivot", BARRY-HARRIS-THEORY.md:121, verified; not a second pivot arpeggio) | 1746 → T8 | scales T7 |
| `b-barry-6` a chorus of bebop lines | 1797 → T8 | scales T7 |
| `b-harrisline-7` the triplet rules | 1520 → T8 | scales T7 |
| `b-tpair-3`, `-4` | 1580, 1640 → T8 | scales T7 |
| `b-barry-4` the rule in a walk | 1694 → T8 | walking T5 |
| `b-harrisline-8` ties on the upbeats | 1380 → T6 | walking T4 |

  - **The remaining bass Harris levels equal their seeds:** `b-harrisline-1` 1330 → T6, `-4` 1380 → T6, `-6` 1460 → T7, `b-tpair-5` 1720 → T8; `b-hlfast` is new (T8).
  - **Bass rows (every area):** row classes are **generated, not hand-written**: Appendix B classifies every option with the tonality classifier (§1.5), and the rung tables below say what is picked. Minor and `pminor` options go on the minor rows, major options on the major rows, modes on the major rows as views, and neutral options (chord quality, key-neutral technique, blues, dominant-on-root material) on both rows. Examples: `b-barry-1` option 1, `b-harrisline-1` option 2, `-4` options 9 / 14, `-6` option 0, `b-tpair-3` option 2 are minor; `b-barry-2` / `-4` and `b-tpair-4` are major; each `BASS_STD` option of `b-walk-11` / `-13` / `-14` / `-18` goes on the row of its own mode. `b-walk-19` option 1 (the minor waltz) is minor. The new `b-hlfast` levels take the `g-hlfast` rows. Bass minor-row walking gets its Harris-free minor content from `m:b-cadlib-1` / `-3`, the minor waltz and the minor standards.
  - **"On V" rungs carry `off: 7`.** `V:b-scale-9` (whole-tone, diminished, altered) and `V:b-scale-13` option 27 (bebop dominant) are dominant scales built on the row tonic's 5th, so the rung passes `off: 7` and the scale is the row key's V (in C: G7 material). Today's `g-scales-21` and `k-modes-3` rungs already pass `off: 7` (keyIndex.ts:386, :615). **`g-harris-3` and `g-harris-4` already render on V** (G7 at key 0, while `k-harrisline-3` and `b-harrisline-3` render C7), so they take no offset: `off: 7` would give D7 on the C row. Guitar's dominant-rule material therefore sits on V while piano's and bass's sit on the root; both are neutral, and either is fine as coverage. The guard checks the label against the offset (§1.5). Their class is neutral, so they sit on both rows; on a minor row the V is the minor key's dominant.
- **`b-walk-12` (up-tempo, ♩160–240) is not a rung.** Its only content step, the two-feel, is already at T0 and T4. Its tempo serves as the up-tempo sub-band of the T7 walking items (the H10 climb).
- **The duo line rule.** With no comping, every chord must sound its quality notes:
  - a chord of a bar or more: the root, the 3rd and the 7th;
  - a 2-beat chord: the root plus one guide tone (3rd or 7th), and across its next appearance the other guide tone.
  - Checked with `rulesOf` (cadenceLibrary.ts "every chord sounds its quality note"), SPEC-HOLISTIC-2 §8.8.

### 4.4 Harness detail (fixed ability; 60 runs; v16 harness)

| Area | Each transition, days (p 0.75, 3 d/wk; v16 harness) | Median at p 0.85, 5 d/wk |
|---|---|---|
| piano / scales | —→T1 38, 24.5, 22, 19.5, 23, 23.5, T6→T7 24.5, T7→T8 28 | 12.25 |
| piano / arpeggios | —→T3 21.5, 19, 24, 26, T6→T7 30.5, T7→T8 30.5 | 11.75 |
| piano / harmony | —→T0 17, 25.5, 38.5, 19.5, 25, 27, 25, T6→T7 26, T7→T8 30.5 | 12 |
| piano / independence | —→T1 24, 19, 20, 33, 27, 28, T6→T7 25, T7→T8 36 | 13.5 |
| piano / line-jazz | —→T5 17, 24.5, T6→T7 24, T7→T8 22.5 | 12 |
| guitar / scales | —→T1 24.5, 19, 20, 22.5, 21.5, 24, T6→T7 27, T7→T8 29 | 11.75 |
| guitar / arpeggios | —→T2 21, 20, 20, 26, 28.5, T6→T7 29, T7→T8 23 | 11.5 |
| guitar / harmony | —→T2 18.5, 21, 19, 26, 20, T6→T7 28, T7→T8 32.5 | 11 |
| guitar / independence | —→T1 25, 18, 26, 28, 26, 37.5, T6→T7 27.5, T7→T8 33 | 13 |
| guitar / line-jazz | —→T5 18, 21, T6→T7 20, T7→T8 20 | 11 |
| bass / scales | —→T0 16.5, 21, 19, 25, 30, 20.5, 31, T6→T7 27, T7→T8 27 | 11 |
| bass / arpeggios | —→T0 17, 21, 20, 26, 26.5, 23.5, 34, T6→T7 35, T7→T8 25.5 | 12 |
| bass / walking | —→T0 18.5, 21, 20.5, 28.5, 25, 26, 26, T6→T7 27, T7→T8 36 | 13 |

- **No median transition reaches 42 days** on the v16 harness. The largest are 38.5 (piano harmony T1→T2, inherited), 37.5 (guitar independence T5→T6, a floor tier), 36 (piano independence T7→T8; bass walking T7→T8) and 35 (bass arpeggios T6→T7).
- **0 stalls** on every proposed area; the worst single climb is 41 days (guitar arpeggios).
- **Piano independence T3→T4.** On v15 it measured 46 days before the fill (T4 held 2: `k-keyx-2`, `fingers-16`). With `k-indep-4` and `fingers-8` at T4 (seed T4), and `k-indep-8`, `fingers-10` at T6 (seed T6), it is 33 days on v16 (31 on v15).
- **Guitar line-jazz** with `g-harrisline-3` at T5 (§4.2): counts 0 0 0 0 0 5 5 8 14; first rank 18 days in every run; transitions 21 / 20 / 20. In v12 (4 rungs at T5) the report's seed reached the first rank in 98 % of runs on v16 (one tail run in 60, not a stall).
- **The bass arpeggio slow spots stay fixed by counting options** (v15 §1.7): `b-chord-12` (maj9, m9, 9) and `b-chord-5` (1st, 2nd inversion), as `b-chord-6` / `-13` are.
- **The figures are the conservative fixed-ability case.** The area medians run 11–13.5 days at p 0.85 / 5 d/wk, and 20–26.75 days at p 0.75 / 3 d/wk.
- **History: the v15 run (v12 catalogue).** Every criterion held on v15 too. v16's stricter guard makes most transitions 0.5–3 days slower.

| Area (v12 catalogue; `g-harrisline-3` at T6) | Each transition, days (p 0.75, 3 d/wk; v15 harness) | Median at p 0.85, 5 d/wk |
|---|---|---|
| piano / scales | —→T1 37, 23.5, 20, 19, 22, 22.5, T6→T7 24, T7→T8 27 | 12 |
| piano / arpeggios | —→T3 20, 19, 23, 25, T6→T7 30, T7→T8 28 | 11.5 |
| piano / harmony | —→T0 14, 23, 35, 19, 24, 25, 25, T6→T7 24.5, T7→T8 28.5 | 12 |
| piano / independence | —→T1 21, 19, 19, T3→T4 31, 26, T5→T6 28, T6→T7 24.5, T7→T8 35.5 | 13 |
| piano / line-jazz | —→T5 14, 21, T6→T7 23, T7→T8 20 | 11.75 |
| guitar / scales | —→T1 21, 19, 20, 21, 21, 21.5, T6→T7 25, T7→T8 28 | 11.25 |
| guitar / arpeggios | —→T2 20, 20, 19, 24.5, 27, T6→T7 26.5, T7→T8 22 | 11 |
| guitar / harmony | —→T2 15, 20, 18, 26, 19, T6→T7 26.5, T7→T8 31 | 11 |
| guitar / independence | —→T1 20, 18, 25, 27, 26, T5→T6 37, T6→T7 25, T7→T8 30 | 13 |
| guitar / line-jazz | —→T5 16, 19, T6→T7 20, T7→T8 20 | 11 |
| bass / scales | —→T0 14, 21, 19, 22, 29.5, 20, 31, T6→T7 26, T7→T8 26 | 11 |
| bass / arpeggios | —→T0 14, 21, 19, 25, 26, 22, 32, T6→T7 32.5, T7→T8 25 | 12 |
| bass / walking | —→T0 15, 20, 20, 27.5, 23, 25, 25, T6→T7 26, T7→T8 36 | 13 |

---

## 5. Bass first tiers and the walking gap (diagnosis)

### 5.1 Today (v15 areas, re-run on this branch, v16 harness)

| Area | Counts T0… | p 0.75, 3 d/wk | p 0.85, 5 d/wk | Climb |
|---|---|---|---|---|
| bass / scales | 1 2 3 4 5 6 2 | —→T0 **42.5**; T0→T1 25; then 20–34.5 | —→T0 16.5; then 11–17 | 0 stalls |
| bass / arpeggios | 1 2 5 3 1 3 | —→T0 **37.5**; T3→T4 **47** (T4 has 1) | —→T0 16; T3→T4 21 | 0 stalls |
| bass / walking | 0 1 1 0 2 2 | —→T1 **240 (42 % reached)**; T1→T2 **107 (92 %)** | —→T1 48.5 (97 %); T1→T2 29 | **1 stall, worst 58 d** |

**Causes:**
1. **Lone 1-exercise first tiers** (scales T0, arpeggios T0, walking T1 and T2, arpeggios T4), and **walking T3 is empty**. Grouping (§1.7) then needs a pass several tiers up: rank T1 in walking needs a T4 pass, which is the stall v15 §9.1 found.
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
| bass / scales | 5 4 8 9 5 13 10 10 13 | 42.5 → **16.5** d | 16.5 → 8 | 23 → 25 (now 9 tiers) | 0 → 0 |
| bass / arpeggios | 4 3 5 6 5 8 5 4 8 | 37.5 → **17** d | 16 → 8 | 25 → 25.5 (the 47-day T3→T4 jump is gone: 26.5) | 0 → 0 |
| bass / walking | 3 3 4 3 4 4 5 5 3 | 240 (42 % reached) → **18.5** d | 48.5 → 9 | 67.75 → 26 | **1 (worst 58 d) → 0** |

**`b-scale-2` stays the warm-up and becomes a rung.**
- Its warm-up take is the cell's cold check when it is the first sounding take of that cell that day and qualifies under §1.4: ≥ 1 h gap, full click, probe band. Otherwise it is warm.
- The key session already plays the warm-up first, so "cold check first" holds.

---

## 6. Ear, voice, drums; reading and rhythm

### 6.1 Ear

**No T7–T8 content from this doc.** The Ear level is SPEC-EAR-INTELLIGENCE's feature-based difficulty (v15 §1.2, §1.14). In the Ear audit, check that the two top difficulty bands mapped to T7–T8 each hold ≥ 3 skills.

### 6.2 Voice: full at T7, capped there (Q11, Q12)

**Area mapping** (v15 voice areas: pitch, time, range / agility, harmony). Tiers come from the path rating (`stepCatalogue`, §1.2 step 3), except `voiceTop` (RSL grade where named, [E] per item) and the Q11 cap at T7.

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
- **Inherited below-floor tiers.** By rating, voice time holds only 1 exercise at each of T2–T5 (one `v-time` level per tier). That is below the v15 floor, but it predates this plan and sits outside the T7–T8 scope. It goes to the voice flow audit; §1.7 grouping keeps those tiers rankable meanwhile.
- **The 30 ¢ band** applies from T5.
- **Content exists above T7.** Existing levels rate as T8 by their path rating: `v-time` 1111–1113, `v-agility` 1611 / 1601 / 1602, `v-scat` 1504–1510, `v-barry` 307, `v-scale` 108. `voiceTop` also rates as T8, but it keeps its RSL-based T5–T7 tiers. Q11 caps the rest at T7. **Q12 is decided: voice stays at T7.** Appendix A is the plan for later, not to be built until the owner opens voice T8.

### 6.3 Drums

- Rudiments follow v15 §1.2: complexity family, then nps.
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
- **Voice T8** (Q11 and Q12: voice stays at T7; Appendix A is the later plan).

---

## 7. Course-change checklist

| Item | Impact |
|---|---|
| Ladders (`keyIndex.ts`) | Piano T6–T8 rungs; rungs re-assigned by §1.5 (harmony / arpeggios / line-jazz); guitar and bass re-tiered (§4.2, §4.3). Arpeggio rungs gain nps spans (piano, guitar; bass only at the RSL steps). The bass warm-up becomes a rung. |
| Warm-up per instrument (`warmOf`, keyIndex.ts:331) | Re-key on the new tiers. **Guitar:** major rows T1–T2 `g-scales-3` (major pentatonic and blues), T3 `g-scales-4`, T4–T5 `g-scales-5`, T6+ `g-scales-9`; minor rows T1–T3 `g-scales-1` (minor pentatonic), T4 harmonic `g-scales-13`, T5+ `g-scales-17`. **Bass:** major rows T0–T5 `b-scale-2`, T6+ `b-fret-5`; minor rows T0 minor pentatonic `b-scale-1` (`pick: optIs(8)`; option 9 is the major pentatonic), T1–T3 natural minor `b-scale-3` option 5, T4–T5 harmonic `b-scale-7` option 6, T6 melodic `b-scale-7` option 7, T7+ `b-scale-12` option 0. **Piano:** unchanged. **Code change: the warm-up cell counts.** Today `openKeyRungs` drops the warm-up level from `built` (`r.id !== w.id`), and `WeekCoverage` excludes it. The warm-up is the same cell as its rung, so rank, coverage (`WeekCoverage`) and `realCatalogue` must all count it. The filter may stay only to avoid playing it twice. |
| Later-rung mins per instrument (keyIndex.ts:303–307, 461) | `AEOLIAN_FROM_TIER`, `MELODIC_FROM_TIER`, `MODES_FROM_TIER` and the `MODES` mins become per-instrument. **Guitar and bass:** Dorian / Mixolydian T5; Lydian / Phrygian / melodic minor T6; Locrian T7 (guitar Aeolian T4; the bass major-row Aeolian is a view of the minor row's natural minor, §2.3). **Piano:** unchanged (melodic and modes T4, Phrygian / Locrian T5). |
| Jazz early opening | keyIndex.ts:688: the 2-tier shift only for rungs with `min` ≤ 5, capped by v15 entry; T6–T8 rungs open at `min` (§1.3). |
| Style gate | `guitarLevelShown` and `guitarStyleMatch` are dead code (no callers): delete them. No add-on or country gate remains (SPEC-STYLE-FOCUS §8.1). Style-only items stay visible and openable, unweighted. Rank "available" counts them only for learners with that style (§1.3). |
| Per-instrument tables | `tierOfNps`, `BENCH_NPS`, `SPEED_NPS`, `EXAM_NPS`, `itemTier`, target tempo (§2.4). |
| `contentTier` | Set by §1.2. Guards: every spec has one; guitar and bass `contentTier` = syllabus tier unless the override list names the level; **the §1.5 guard:** the builder codes the closed table itself, keyed on family + kind + option (never a kind prefix), not the prototype script. It fails on any unlisted triple, a `max` outside rows 4 / 7 / 9, an unlisted mixed level, and a picked option that opens before its scale's tier. A strict prototype with the exact kind lists found 2,533 specs, 0 unlisted, and exactly the listed mixed levels. The cross-area Harris prerequisites (row below) are checked as well; the major-row Aeolian and the minor-row natural minor share one `exerciseId`. |
| Harness | `realCatalogue.ts`: spans for arpeggio rungs only; struck chords and degree sequences mapped to harmony (§1.5); per-instrument bands; the bass span steps (T2, T3, T5, T8 only); the warm-up rung; the new rungs; style-only items unavailable. Re-run `npm run measure-sim`. The guard "rotation-only climbs reach every tier with content, no stall ≥ 42 d" now covers T7–T8. Check the H10 rising-challenge metric at T6–T8. |
| `verifiedContent.ts` | Hidden items are unavailable for counting. Every T7–T8 Harris tier meets the floor with shown items only: `k-sharm-33` and `g-harris-12` (shown parts: `cm-expand`; `item:cm-elevator` is hidden), `k-sharm-40` / `41` (shown parts), `g-hlfast`, `b-harrisline` (5, 9 hidden), the new `k-hlfast` / `b-hlfast`. |
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
| Rows by tonality (code change) | Each rung picks what its §4 rung table says; Appendix B gives the class of each picked option, and the row admits it only if the class fits (minor / pminor → minor rows, major → major rows, mode → major-row view, neutral → both). Tagged mode views keep today's rows and must pick their mode's option. Rungs labelled "on V" get `off: 7`. Today's mismatches to fix: `g-harris-1` options 2 / 3, `g-harris-2` option 2 (guitar major row), `b-barry-1` option 1 (bass major row). The guard checks all of it exactly (§1.5), with `scripts/top-tiers/tonality.ts` as the reference; an unresolved option fails the guard until a person decides it |
| Chart-tune key offset (code change) | The bass `standard` walk rungs (`b-walk-11` / `-13` / `-14` / `-18`) pass `(row tonic − std.key) mod 12`, with the row's minor tonic for minor tunes. The guard checks that the rendered tonic equals the row's tonic. Every other chart / tune rung takes the key as its tonic (scan: `offset.ts`) |
| Cross-area Harris prerequisites | v15 §1.6 `established` prerequisites (planner rule, never a lock; manual play stays open):
- each Harris harmonisation rung (`k-sharm-12` / `14` / `16` / `18` options 9–12, `-35`; `g-harris-2`, `-7`; `g-harm-9`'s drop 2&4 options) needs its scale rung `established` (`harris-1` / `-25` / `-26`; `g-harris-1`);
- the planner skips the step until then. |
| Flow audit (§13.1) | Every changed ladder passes it before shipping: the gap fills, the Harris order (including the rung order inside a tier, §1.5), the guitar re-tier, the §1.5 moves, the drum T3–T6 rudiment placement, the voice range check. |

---

## 8. Owner questions and notices

| # | Question | My recommendation |
|---|---|---|
| Q12 (decided) | Voice T8: **decided, voice stays at T7** (owner, round 3). Appendix A is the plan for later. | — |
| Notice (Q6) | You wrote "in the lines area". v15 gives bass no line area, so the Harris lines at bebop tempo sit in **bass / scales**, where v15 puts Harris's scale language. A separate bass line area would need a v15 change. | No change needed unless you want a bass line area. |

**Not in the plan (only verified theory):**
- the elevator with borrowing (`el-borrow`), and the elevator under a melody (`cm-elevator`, hidden as `echols-elevator-melody`);
- the voicing ladder's thirds / triads / octave chords (`vl-ladder`);
- the 5-4-3-2 phrases;
- compose a line (`g-harrisline-9`, `b-harrisline-9`);
- the 5-4-3-2 phrases and lick (`b-harrisline-5`, hidden as `bh-5432`);
- the blues outline (`hl-outline:0`, hidden as `bh-outline-blues`). It is an item inside placed rungs (`b-harrisline-2`, `g-harrisline-2`, `g-hlfast-1`). `gateLevel` (verifiedContent.ts:304) already drops it from the gated catalogue, as Appendix B shows. The rung must be built from the gated catalogue, so no raw `pick` re-adds it while it is hidden;
- Echols's octave chord;
- the family movement inside one V;
- major arpeggios chromatically down.

All stay hidden (BARRY-HARRIS-THEORY §12). Every new item is rule-generated, a card the player improvises on, or a chord chart. No Claude-composed demos or backing.

## Appendix A. If voice T8 opens later (Q12): not to be built until the owner opens voice T8

Q12 is decided: voice stays at T7. This appendix is kept only so that a later decision has a ready plan:

| Item | What changes |
|---|---|
| Which levels move | The rating-T8 levels of the core families move to T8: `v-time` 1111–1113 (time); `v-agility` 1611 / 1601 / 1602 (range / agility); `v-scat` 1504–1510 minus the trading-fours levels (harmony); `v-barry` 307, `v-scale` 108 (pitch) |
| `voiceTop` | `v-arp2`, `v-leaps`, `v-runs`, `v-part` keep their T5–T7 RSL-based tiers. They do not move. `v-top` stays coverage only (vocal health) |
| Resulting counts | **T8:** pitch 2 (the floor), time 3, agility 3, harmony about 4–5. **T7:** pitch 6, time 3, agility 7, harmony ≥ 4. All are at or above the floor |
| Cents band | T8 requires **25 ¢**, one step tighter than T5–T7's 30 ¢ [E: a harness / owner value; 30 ¢ is the fallback if the harness finds 25 ¢ too strict for the pitch tracker] |
| Level test | Add a voice T8 probe per area (breadth-first, one take, after a ≥ 2–3 min warm-up, §1.4) |
| Label | Voice T8 is **rating-only**. No vocal syllabus defines a technical diploma tier (the diplomas are performance-based). The course page says so |
| Text | §1.10 "never full below T8" then applies to voice too; the "course's top tier" clause becomes unnecessary for voice |

## Appendix B. Option classes by tonality (generated)

- **Generated by `scripts/top-tiers/tonality.ts --appendix`** (the §1.5 guard's tonality reference) from today's code. It covers every placed rung of all three instruments (line-jazz, harmony, walking, scales, independence, arpeggios), and the existing key-ladder rungs.
- **This table classifies options; it is not the pick list.** What a rung picks comes from the §4 rung tables (and today's `pick`); the row then admits only picked options whose class fits it (§1.5). For example, `g-harm-1` options 9–12 and `k-sharm-12` options 7–8 are listed here but are not picked by those rungs.
- **The rule:**
  - minor and `pminor` options (marked "(pminor)": modes of melodic / harmonic minor) → minor rows;
  - major options → major rows; modes (marked with the mode name) → major rows as mode views (§1.5 modal options);
  - neutral options (chord quality, key-neutral technique, blues, dominant-on-root material) → both rows.
- **Option names** are `kind:option` as in the catalogue, plus `/scale` where the spec names a scale id (so `scales-14`'s `scale/harmonic` and `scale/chromatic` are told apart). "(minor)" marks a spec with the `minor` flag.
- **Placed levels whose options are all major or modal** sit on the major rows only. There are 108 of them: `b-barry-2`, `b-barry-3`, `b-barry-4`, `b-barry-5`, `b-barry-6`, `b-chord-1`, `b-chord-8`, `b-chord-9`, `b-chord-10`, `b-chord-15`, `b-harrisline-2`, `b-harrisline-10`, `b-scale-2`, `b-scale-4`, `b-scale-6`, `b-scale-8`, `b-walk-4`, `b-walk-5`, `b-walk-6`, `b-walk-10`, `cadences-1`, `cadences-2`, `control-8`, `g-bebop-6`, `g-harris-5`, `g-harris-10`, `g-harris-12`, `g-harrisline-8`, `g-harrisline-10`, `g-jazz-1`, `g-jazz-5`, `g-scales-4`, `g-scales-5`, `g-scales-6`, `g-scales-8`, `g-scales-9`, `g-scales-10`, `g-scales-14`, `g-solojazz-1`, `g-solojazz-3`, `g-vl-1`, `g-vl-2`, `g-vl-3`, `harris-1`, `harris-6`, `harris-16`, `harris-24`, `k-bebop-1`, `k-bebop-3`, `k-bebop-5`, `k-cadlib-23`, `k-cadlib-24`, `k-cadlib-26`, `k-harrisline-2`, `k-harrisline-6`, `k-harrisline-7`, `k-harrisline-8`, `k-harrisline-10`, `k-harrisline-12`, `k-harrisline-14`, `k-harrisline-20`, `k-harrisline-30`, `k-harrisline-34`, `k-harrisline-35`, `k-indep-1`, `k-indep-3`, `k-indep-4`, `k-indep-6`, `k-indep-7`, `k-indep-8`, `k-keylick-19`, `k-keyx-1`, `k-keyx-2`, `k-keyx-3`, `k-keyx-4`, `k-keyx-5`, `k-reharm-4`, `k-sharm-3`, `k-sharm-5`, `k-sharm-7`, `k-sharm-9`, `k-sharm-11`, `k-sharm-13`, `k-sharm-15`, `k-sharm-17`, `k-sharm-19`, `k-sharm-26`, `k-sharm-27`, `k-sharm-28`, `k-sharm-29`, `k-sharm-33`, `k-sharm-34`, `k-sharm-36`, `k-sharm-37`, `k-sharm-39`, `k-sharm-42`, `k-sharm-43`, `k-sharm-45`, `k-sharm-47`, `scales-4`, `scales-8`, `scales-11`, `scales-19`, `scales-21`, `scales-22`, `scales-24`, `scales-26`, `scales-32`.

| Level | Minor rows (minor options) | Major rows (major / modal options) | Both rows (neutral) |
|---|---|---|---|
| `advanced-1` | — | — | octaves |
| `advanced-3` | — | — | octaves, octaves/chromatic |
| `advanced-4` | — | — | double-notes:0, double-notes:1, double-notes:0 (minor) |
| `advanced-6` | — | — | polyrhythm:2, polyrhythm:3 |
| `advanced-8` | — | — | leaps:3, leaps:0, leaps:2, double-notes:1 (minor) |
| `advanced-9` | — | — | octaves (minor), double-notes:0 (minor) |
| `arpeggios-3` | — | — | arp-triad, arp-triad (minor) |
| `arpeggios-6` | — | — | arp-triad |
| `arpeggios-8` | — | — | broken, broken:1 |
| `arpeggios-10` | — | — | arp-dom7:1, arp-dom7:2, arp-dom7:3 |
| `arpeggios-11` | — | — | arp-dim7:1, arp-dim7:2, arp-dim7:3, arp-dim7 |
| `arpeggios-12` | — | — | arp-triad, arp-triad (minor), arp-maj7, arp-m7, arp-hd7 |
| `arpeggios-15` | — | — | arp-triad (minor), arp-dom7, arp-dim7 |
| `arpeggios-16` | — | — | arp-dom7, arp-dim7 |
| `b-barry-1` | sixdim:1 | sixdim | — |
| `b-barry-7` | — | — | pivot-arp:0, pivot-arp:1, pivot-arp:2, pivot-arp:3 |
| `b-barry-8` | — | scale-pivot | scale-pivot:1 |
| `b-cadlib-1` | cad~m-ii-v-i~approach, cad~m-turnaround~approach, cad~m-deceptive~approach | cad~ii-v-i~approach, cad~half-dim-to-major~approach, cad~turnaround~approach, cad~long-turnaround~approach, cad~vi7-turnaround~approach, cad~secondary~approach, cad~extended-dominants~approach, cad~chain-whole~approach, cad~chain-half~approach, cad~deceptive~approach | — |
| `b-cadlib-2` | cad~m-tritone-sub~approach, cad~m-plagal~approach, cad~m-flat-six-seven~approach, cad~m-sus~approach | cad~tritone-sub~approach, cad~tritone-ii-v~approach, cad~tritone-turnaround~approach, cad~lady-bird~approach, cad~chromatic-dominants~approach, cad~backdoor~approach, cad~plagal-borrowed~approach, cad~borrowed-approach~approach, cad~ending-dominants~approach, cad~ending-maj7~approach, cad~sus~approach, cad~sus-9~approach, cad~deceptive-flat-six~approach | — |
| `b-cadlib-3` | cad~m-ii-v-i~walk, cad~m-turnaround~walk, cad~m-deceptive~walk | cad~ii-v-i~walk, cad~half-dim-to-major~walk, cad~turnaround~walk, cad~long-turnaround~walk, cad~vi7-turnaround~walk, cad~secondary~walk, cad~extended-dominants~walk, cad~chain-whole~walk, cad~chain-half~walk, cad~deceptive~walk | — |
| `b-cadlib-4` | cad~m-blues-ending~approach | cad~coltrane~approach, cad~passing-dim-up~approach, cad~dim-walkdown~approach, cad~bird-blues~approach | cad~blues-turnaround~approach |
| `b-cadlib-5` | cad~m-tritone-sub~walk, cad~m-plagal~walk, cad~m-flat-six-seven~walk, cad~m-sus~walk | cad~tritone-sub~walk, cad~tritone-ii-v~walk, cad~tritone-turnaround~walk, cad~lady-bird~walk, cad~chromatic-dominants~walk, cad~backdoor~walk, cad~plagal-borrowed~walk, cad~borrowed-approach~walk, cad~ending-dominants~walk, cad~ending-maj7~walk, cad~sus~walk, cad~sus-9~walk, cad~deceptive-flat-six~walk | — |
| `b-cadlib-6` | cad~m-blues-ending~walk | cad~coltrane~walk, cad~passing-dim-up~walk, cad~dim-walkdown~walk, cad~bird-blues~walk, cad~dom-pedal~pedal | cad~blues-turnaround~walk |
| `b-chord-2` | — | — | r5 |
| `b-chord-3` | — | — | r58 |
| `b-chord-4` | — | — | triad, triad (minor) |
| `b-chord-5` | — | — | inv:1, inv:2 |
| `b-chord-6` | — | — | sev:0, sev:1, sev:2, sev:3, sev:4 |
| `b-chord-7` | — | — | arp2:0, arp2:1, arp2:2 |
| `b-chord-11` | — | — | arp7x2:0, arp7x2:1, arp7x2:2 |
| `b-chord-12` | — | — | arp9:0, arp9:1, arp9:2 |
| `b-chord-13` | — | — | arpalt:0, arpalt:1, arpalt:2, arpalt:3 |
| `b-chord-14` | — | — | hichords, hichords:1 |
| `b-chord-16` | dia7:5 (minor), dia7:7 (minor) | — | — |
| `b-chord-17` | dia1235:7 (minor) | dia1235:0 | — |
| `b-chord-18` | dia9:7 (minor) | dia9:0 | — |
| `b-fret-1` | — | — | spider:0 |
| `b-fret-2` | — | — | spider:1, spider:2, spider:3, spider:4, spider:5 |
| `b-fret-3` | — | — | simandl |
| `b-fret-4` | — | — | one-string, one-string:1 |
| `b-fret-5` | — | — | 2oct |
| `b-fret-6` | — | — | stretch, stretch:1 |
| `b-fret-7` | — | — | oct10, oct10:1 |
| `b-fret-8` | — | — | upper |
| `b-harrisline-1` | hl-chrom:2 | hl-chrom:0 | hl-chrom:1 |
| `b-harrisline-3` | — | — | hl-eight:0, hl-eight:4, hl-imp-arps:0, hl-imp-arps:1, hl-imp-scale:0, hl-imp-scale:1, hl-imp-scale:2 |
| `b-harrisline-4` | hl-rules:9, hl-rules:14 | hl-rules:0, hl-rules:4, hl-rules:8 | — |
| `b-harrisline-6` | hl-sevendown:0 | hl-sevendown:1, hl-3b9:0 | — |
| `b-harrisline-7` | — | — | hl-triplet:0, hl-triplet:3, hl-misc:0 |
| `b-harrisline-8` | — | — | hl-walkties:0, hl-walkties:1 |
| `b-legato-1` | — | — | slide |
| `b-legato-2` | — | — | hp |
| `b-phrase-1` | ph-ct:1 | ph-ct:0 | ph-ct:2 |
| `b-pluck-4` | — | — | skip |
| `b-pluck-5` | — | — | stamina |
| `b-pluck-6` | — | — | accent16:0, accent16:1, accent16:2, accent16:3, accent16:4 |
| `b-pluck-7` | — | — | rake |
| `b-pluck-10` | — | — | skip2, skip2:1 |
| `b-pluck-11` | — | — | ima, ima:1 |
| `b-scale-1` | scale:8 | scale:9 | — |
| `b-scale-3` | scale:5 | — | scale:10 |
| `b-scale-5` | penta5 | — | — |
| `b-scale-7` | scale:6, scale:7 | — | — |
| `b-scale-9` | — | — | scale:11, scale:12, scale:13 |
| `b-scale-10` | penta-pos (minor) | — | — |
| `b-scale-12` | scale2:0 (minor), scale2:1 (minor), scale2:2 (minor) | — | — |
| `b-scale-13` | — | scale:14 (locrian) | scale:15, scale:27 |
| `b-scale-14` | scale:16 (pminor), scale:17 (pminor), scale:19 (pminor), scale:20 (pminor) | — | scale:18 |
| `b-scale-15` | scale:21 (pminor), scale:22 (pminor), scale:23 (pminor), scale:25 (pminor) | — | scale:24, scale:26 |
| `b-tpair-1` | btp-arp:0 | btp-arp:2 | btp-arp:5 |
| `b-tpair-2` | — | btp-inv:3 | btp-inv:5, btp-inv:7 |
| `b-tpair-3` | btp-iivi:2 | btp-iivi:0, btp-iivi:1 | — |
| `b-tpair-4` | — | — | btp-blues:0 |
| `b-tpair-5` | btp-slip:0 | — | — |
| `b-walk-1` | — | — | two-feel |
| `b-walk-2` | — | — | r5walk, r5walk:1 |
| `b-walk-3` | — | — | arpwalk, arpwalk:1 |
| `b-walk-7` | — | — | free, free:1 |
| `b-walk-8` | — | — | skips |
| `b-walk-11` | standard:1, standard:3 | standard:0, standard:2 | — |
| `b-walk-13` | standard:6, standard:15, standard:21 | standard:7, standard:8, standard:11, standard:12, standard:13, standard:14 | standard:4 |
| `b-walk-14` | standard:17, standard:19, standard:20, standard:22 | standard:9, standard:10, standard:16, standard:18 | standard:5 |
| `b-walk-16` | — | sight-impro:1 | sight-impro |
| `b-walk-18` | standard:28, standard:34, standard:35 | standard:24, standard:25, standard:26, standard:27, standard:29, standard:30, standard:31, standard:32 | standard:23, standard:33 |
| `b-walk-19` | waltz:1 | waltz | — |
| `b-walk-20` | — | — | blues-waltz |
| `b-walk-21` | — | — | blues-chrom |
| `cadences-3` | cadence-64 (minor) | cadence-64 | — |
| `cadences-7` | cadence-deceptive (minor), cadence-plagal (minor), cadence-picardy (minor), cadence-ii6 (minor), cadence-circle (minor) | — | — |
| `fingers-8` | — | — | thumb-under, thumb-under:1 |
| `fingers-10` | — | — | held:1, held:2 |
| `fingers-13` | — | — | velocity, velocity:1 |
| `fingers-15` | — | — | hanon:2, hanon:3, hanon:4, hanon:5 |
| `fingers-16` | — | — | hanon:6, hanon:7, hanon:8, hanon:9, hanon:10 |
| `fingers-17` | — | — | hanon:11, hanon:12, hanon:13, hanon:14, hanon:15 |
| `fingers-18` | — | — | hanon:16, hanon:17, hanon:18, hanon:19, hanon:20 |
| `g-arps-1` | — | — | triad, triad (minor) |
| `g-arps-2` | — | — | caged-arp |
| `g-arps-3` | — | — | inversions |
| `g-arps-4` | — | — | seventh:0, seventh:1, seventh:2, seventh:3 |
| `g-arps-5` | — | iivi-arp | seventh:4, seventh:5, seventh:6, seventh:7, seventh:8 |
| `g-arps-6` | — | — | caged7:0, caged7:1, caged7:2, caged7:3 |
| `g-arps-7` | — | — | ext-arp:0, ext-arp:1, ext-arp:2, ext-arp:3, ust:0, ust:1, ust:2 |
| `g-cadlib-1` | cad~m-ii-v-i~shell, cad~m-turnaround~shell, cad~m-deceptive~shell | cad~ii-v-i~shell, cad~half-dim-to-major~shell, cad~turnaround~shell, cad~long-turnaround~shell, cad~vi7-turnaround~shell, cad~secondary~shell, cad~extended-dominants~shell, cad~chain-whole~shell, cad~chain-half~shell, cad~deceptive~shell | — |
| `g-cadlib-2` | cad~m-tritone-sub~shell, cad~m-plagal~shell, cad~m-flat-six-seven~shell, cad~m-sus~shell | cad~tritone-sub~shell, cad~tritone-ii-v~shell, cad~tritone-turnaround~shell, cad~lady-bird~shell, cad~chromatic-dominants~shell, cad~backdoor~shell, cad~plagal-borrowed~shell, cad~borrowed-approach~shell, cad~ending-dominants~shell, cad~ending-maj7~shell, cad~sus~shell, cad~sus-9~shell, cad~deceptive-flat-six~shell | — |
| `g-cadlib-3` | cad~m-blues-ending~shell | cad~coltrane~shell, cad~passing-dim-up~shell, cad~dim-walkdown~shell, cad~bird-blues~shell | cad~blues-turnaround~shell |
| `g-cadlib-4` | cad~m-ii-v-i~drop2, cad~m-turnaround~drop2, cad~m-deceptive~drop2 | cad~ii-v-i~drop2, cad~half-dim-to-major~drop2, cad~turnaround~drop2, cad~long-turnaround~drop2, cad~vi7-turnaround~drop2, cad~secondary~drop2, cad~extended-dominants~drop2, cad~chain-whole~drop2, cad~chain-half~drop2, cad~deceptive~drop2 | — |
| `g-cadlib-5` | cad~m-tritone-sub~drop2, cad~m-plagal~drop2, cad~m-flat-six-seven~drop2, cad~m-sus~drop2 | cad~tritone-sub~drop2, cad~tritone-ii-v~drop2, cad~tritone-turnaround~drop2, cad~lady-bird~drop2, cad~chromatic-dominants~drop2, cad~backdoor~drop2, cad~plagal-borrowed~drop2, cad~borrowed-approach~drop2, cad~ending-dominants~drop2, cad~ending-maj7~drop2, cad~sus~drop2, cad~sus-9~drop2, cad~deceptive-flat-six~drop2 | — |
| `g-cadlib-6` | cad~m-blues-ending~drop2 | cad~coltrane~drop2, cad~passing-dim-up~drop2, cad~dim-walkdown~drop2, cad~bird-blues~drop2 | cad~blues-turnaround~drop2 |
| `g-cadlib-7` | cad~m-ii-v-i~drop3, cad~m-turnaround~drop3, cad~m-deceptive~drop3 | cad~ii-v-i~drop3, cad~half-dim-to-major~drop3, cad~turnaround~drop3, cad~long-turnaround~drop3, cad~vi7-turnaround~drop3, cad~secondary~drop3, cad~extended-dominants~drop3, cad~chain-whole~drop3, cad~chain-half~drop3, cad~deceptive~drop3 | — |
| `g-cadlib-8` | cad~m-tritone-sub~drop3, cad~m-plagal~drop3, cad~m-flat-six-seven~drop3, cad~m-sus~drop3, cad~m-blues-ending~drop3 | cad~tritone-sub~drop3, cad~tritone-ii-v~drop3, cad~tritone-turnaround~drop3, cad~lady-bird~drop3, cad~chromatic-dominants~drop3, cad~backdoor~drop3, cad~plagal-borrowed~drop3, cad~borrowed-approach~drop3, cad~ending-dominants~drop3, cad~ending-maj7~drop3, cad~sus~drop3, cad~sus-9~drop3, cad~deceptive-flat-six~drop3, cad~coltrane~drop3, cad~passing-dim-up~drop3, cad~dim-walkdown~drop3, cad~bird-blues~drop3 | cad~blues-turnaround~drop3 |
| `g-cadlib-9` | cad~m-ii-v-i~rootless, cad~m-turnaround~rootless, cad~m-deceptive~rootless | cad~ii-v-i~rootless, cad~half-dim-to-major~rootless, cad~turnaround~rootless, cad~long-turnaround~rootless, cad~vi7-turnaround~rootless, cad~secondary~rootless, cad~extended-dominants~rootless, cad~chain-whole~rootless, cad~chain-half~rootless, cad~deceptive~rootless | — |
| `g-cadlib-10` | cad~m-tritone-sub~rootless, cad~m-plagal~rootless, cad~m-flat-six-seven~rootless, cad~m-sus~rootless, cad~m-blues-ending~rootless | cad~tritone-sub~rootless, cad~tritone-ii-v~rootless, cad~tritone-turnaround~rootless, cad~lady-bird~rootless, cad~chromatic-dominants~rootless, cad~backdoor~rootless, cad~plagal-borrowed~rootless, cad~borrowed-approach~rootless, cad~ending-dominants~rootless, cad~ending-maj7~rootless, cad~sus~rootless, cad~sus-9~rootless, cad~deceptive-flat-six~rootless, cad~coltrane~rootless, cad~passing-dim-up~rootless, cad~dim-walkdown~rootless, cad~bird-blues~rootless | cad~blues-turnaround~rootless |
| `g-fretting-1` | — | — | spider:0 |
| `g-fretting-2` | — | — | spider:1, spider:2, spider:3, spider:4, spider:5 |
| `g-fretting-3` | — | — | cross |
| `g-fretting-4` | — | — | walk |
| `g-fretting-5` | — | — | spider:0, spider:1, spider:2, spider:3, spider:4, spider:5, spider:6, spider:7, spider:8, spider:9, spider:10, spider:11, spider:12, spider:13, spider:14, spider:15, spider:16, spider:17, spider:18, spider:19, spider:20, spider:21, spider:22, spider:23 |
| `g-fretting-6` | — | — | stretch |
| `g-fusion-1` | — | — | g-prog>fusion:0, g-prog>fusion:3 |
| `g-fusion-2` | — | — | fu-4nps:0, fu-4nps:1 |
| `g-fusion-3` | — | — | fu-slip:0, fu-slip:1 |
| `g-fusion-4` | — | — | fu-pair:0, fu-pair:1 |
| `g-fusion-5` | — | — | fu-vamp:0, fu-vamp:1 |
| `g-harm-1` | hl-line:7, hl-line:8, hl-line:10 | hl-line:0, hl-line:1 (dorian), hl-line:2 (phrygian), hl-line:3 (lydian), hl-line:4 (mixolydian), hl-line:5 (aeolian), hl-line:6 (locrian), hl-line:9 | hl-line:11, hl-line:12 |
| `g-harm-2` | hl-3b:7, hl-3b:8, hl-3b:10 | hl-3b:0, hl-3b:1 (dorian), hl-3b:2 (phrygian), hl-3b:3 (lydian), hl-3b:4 (mixolydian), hl-3b:5 (aeolian), hl-3b:6 (locrian), hl-3b:9 | hl-3b:11, hl-3b:12 |
| `g-harm-3` | hl-3t:7, hl-3t:8, hl-3t:10 | hl-3t:0, hl-3t:1 (dorian), hl-3t:2 (phrygian), hl-3t:3 (lydian), hl-3t:4 (mixolydian), hl-3t:5 (aeolian), hl-3t:6 (locrian), hl-3t:9 | hl-3t:11, hl-3t:12 |
| `g-harm-4` | hl-ta:7, hl-ta:8, hl-ta:10 | hl-ta:0, hl-ta:1 (dorian), hl-ta:2 (phrygian), hl-ta:3 (lydian), hl-ta:4 (mixolydian), hl-ta:5 (aeolian), hl-ta:6 (locrian), hl-ta:9 | hl-ta:11, hl-ta:12 |
| `g-harm-5` | hl-tb:7, hl-tb:8, hl-tb:10 | hl-tb:0, hl-tb:1 (dorian), hl-tb:2 (phrygian), hl-tb:3 (lydian), hl-tb:4 (mixolydian), hl-tb:5 (aeolian), hl-tb:6 (locrian), hl-tb:9 | hl-tb:11, hl-tb:12 |
| `g-harm-6` | hl-7a:7, hl-7a:8, hl-7a:10 | hl-7a:0, hl-7a:1 (dorian), hl-7a:2 (phrygian), hl-7a:3 (lydian), hl-7a:4 (mixolydian), hl-7a:5 (aeolian), hl-7a:6 (locrian), hl-7a:9 | hl-7a:11, hl-7a:12 |
| `g-harm-7` | hl-7b:7, hl-7b:8, hl-7b:10 | hl-7b:0, hl-7b:1 (dorian), hl-7b:2 (phrygian), hl-7b:3 (lydian), hl-7b:4 (mixolydian), hl-7b:5 (aeolian), hl-7b:6 (locrian), hl-7b:9 | hl-7b:11, hl-7b:12 |
| `g-harm-8` | hl-d2:7, hl-d2:8, hl-d2:10 | hl-d2:0, hl-d2:1 (dorian), hl-d2:2 (phrygian), hl-d2:3 (lydian), hl-d2:4 (mixolydian), hl-d2:5 (aeolian), hl-d2:6 (locrian), hl-d2:9 | hl-d2:11, hl-d2:12 |
| `g-harm-9` | hl-d3:7, hl-d3:8, hl-d3:10, hl-d24:10 | hl-d3:0, hl-d3:1 (dorian), hl-d3:2 (phrygian), hl-d3:3 (lydian), hl-d3:4 (mixolydian), hl-d3:5 (aeolian), hl-d3:6 (locrian), hl-d3:9, hl-d24:9 | hl-d3:11, hl-d3:12, hl-d24:11, hl-d24:12 |
| `g-harm-10` | bw-one:10 | bw-one:0, bw-one:1, bw-one:2, bw-one:3 | bw-one:20, bw-one:30 |
| `g-harm-11` | bw-two:11, bw-chord:10 | bw-two:0, bw-chord:0, bw-out:0, bw-scale:0 | — |
| `g-harm-12` | bw-walk:10, bw-iivi:1 | bw-walk:0, bw-iivi:0, bw-std:0 | bw-walk:20, bw-walk:30 |
| `g-harm-13` | bw-walk:10, bw-walk-d3:10 | bw-walk:0, bw-walk-d3:0, bw-iivi-d3:0 | — |
| `g-harm-14` | hl-ti:7, hl-ti:8 | hl-ti:0, hl-ti:1 (dorian), hl-ti:2 (phrygian), hl-ti:3 (lydian), hl-ti:4 (mixolydian), hl-ti:5 (aeolian), hl-ti:6 (locrian) | — |
| `g-harm-15` | hl-c4:7, hl-c4:8 | hl-c4:0, hl-c4:1 (dorian), hl-c4:2 (phrygian), hl-c4:3 (lydian), hl-c4:4 (mixolydian), hl-c4:5 (aeolian), hl-c4:6 (locrian) | — |
| `g-harm-16` | hl-9a:7, hl-9a:8 | hl-9a:0, hl-9a:1 (dorian), hl-9a:2 (phrygian), hl-9a:3 (lydian), hl-9a:4 (mixolydian), hl-9a:5 (aeolian), hl-9a:6 (locrian) | — |
| `g-harris-1` | sixdim-scale:2, sixdim-scale:3 | sixdim-scale:0, sixdim-scale:1 | — |
| `g-harris-2` | sixdim-chords:2 | sixdim-chords:0, sixdim-chords:1 | — |
| `g-harris-3` | — | — | dom-scale:0, dom-scale:1, dom-scale:2, dom-scale:3, dom-scale:4, dom-scale:5, dom-scale:6 |
| `g-harris-4` | — | triads-3to9:1 | triads-3to9:0, triads-3to9:2 |
| `g-harris-6` | — | — | brothers:0, brothers:1 |
| `g-harris-7` | sixdim-sets:1, sixdim-sets:2 | sixdim-sets:0 | — |
| `g-harris-8` | — | — | pivot-arp:0, pivot-arp:1, pivot-arp:2, pivot-arp:3 |
| `g-harris-9` | — | scale-pivot:0 | scale-pivot:1 |
| `g-harris-11` | sf-minor:0 | sf-voice:0, sf-voice:1, mv-first:0, mv-next:0, mv-mmm:0, sixth5:0 | — |
| `g-harris-13` | — | sf-comp:0, shell4:0, tm-res:0, bw-three:3, bw-root:0, sub-tune:0 | sf-comp:1, sf-borrow:0, sf-borrow:1 |
| `g-harrisline-1` | hl-chrom:2 | hl-chrom:0 | hl-chrom:1 |
| `g-harrisline-2` | hl-outline:5 | hl-outline:1, hl-outline:2, hl-outline:3, hl-outline:4 | — |
| `g-harrisline-3` | — | — | hl-eight:0, hl-eight:2, hl-imp-arps:0, hl-imp-arps:1, hl-imp-scale:0, hl-imp-scale:3 |
| `g-harrisline-4` | hl-rules:9, hl-rules:13 | hl-rules:1, hl-rules:4, hl-rules:7 | — |
| `g-harrisline-6` | hl-sevendown:0 | hl-sevendown:1, hl-3b9:0, hl-3b9:1 | — |
| `g-harrisline-7` | — | hl-misc:3 | hl-triplet:0, hl-triplet:1, hl-triplet:3, hl-misc:0 |
| `g-hlfast-1` | g-harrisline>hl-chrom:2 | g-harrisline>hl-chrom:0, g-harrisline>hl-outline:1 | g-harrisline>hl-chrom:1 |
| `g-hlfast-2` | g-harrisline>hl-rules:9, g-harrisline>hl-rules:13 | g-harrisline>hl-rules:4 | — |
| `g-hlfast-3` | g-harrisline>hl-sevendown:0 | g-harrisline>hl-sevendown:1, g-harrisline>hl-3b9:1 | g-harrisline>hl-triplet:1, g-harrisline>hl-triplet:3 |
| `g-hlfast-4` | g-harrisline>hl-outline:5 | g-harrisline>hl-outline:2, g-harrisline>hl-outline:3, g-harrisline>hl-outline:4 | — |
| `g-jblues-2` | — | — | blues-shells |
| `g-jblues-3` | — | — | blues-guide:0, blues-guide:1 |
| `g-jblues-4` | — | — | blues-comp |
| `g-legato-1` | — | — | hammer:0, hammer:1, hammer:2, hammer:3, hammer:4, hammer:5 |
| `g-legato-2` | — | — | pull:0, pull:1, pull:2, pull:3, pull:4, pull:5 |
| `g-legato-3` | — | — | trill:0, trill:1, trill:2, trill:3, trill:4, trill:5 |
| `g-legato-4` | — | — | penta-legato |
| `g-legato-5` | — | — | 3nps-legato:0, 3nps-legato:1, 3nps-legato:4 |
| `g-legato-7` | — | — | legato-shift:0, legato-shift:4 |
| `g-phrase-1` | ph-ct:1 | ph-ct:0 | ph-ct:2 |
| `g-picking-1` | — | — | single-string, single-string:2 |
| `g-picking-2` | — | — | cross:0, cross:1, pedal |
| `g-picking-3` | — | — | 3nps:0, 3nps-economy:0, 3nps:4, 3nps-economy:1 |
| `g-picking-4` | — | — | skip, skip:1 |
| `g-picking-6` | — | — | sweep3, sweep5, sweep5 (minor), sweep3 (minor) |
| `g-picking-10` | — | — | hybrid-riff:0, hybrid-riff:1 |
| `g-scales-1` | penta (minor) | — | — |
| `g-scales-2` | penta (minor) | — | — |
| `g-scales-3` | — | penta | blues |
| `g-scales-7` | — | mode:6 (locrian), seq3, seq4, seq-g3 | mode:9, mode:10, mode:11 |
| `g-scales-11` | segovia:1 | segovia:0, segovia:2 | — |
| `g-scales-12` | — | interval-shapes:0, interval-shapes:3 | interval-shapes:1, interval-shapes:2, interval-shapes:4 |
| `g-scales-13` | mode:7 | mode:5 (aeolian) | — |
| `g-scales-15` | mode:8 | mode:3 (lydian), mode:2 (phrygian) | — |
| `g-scales-16` | caged-minor:0 (minor) | — | — |
| `g-scales-17` | caged-minor:1 (minor) | — | — |
| `g-scales-18` | caged-minor:2 (minor) | — | — |
| `g-scales-19` | mode:12 (pminor), mode:13 (pminor), mode:15 (pminor), mode:16 (pminor) | — | mode:14 |
| `g-scales-20` | mode:17 (pminor), mode:18 (pminor), mode:19 (pminor), mode:21 (pminor) | — | mode:20, mode:22 |
| `g-scales-21` | — | — | mode:23, mode:24 |
| `g-solojazz-2` | — | — | sj-blues:0, sj-blues:1 |
| `g-speed-1` | — | — | g-picking>3nps:0, g-picking>3nps-economy:1, g-picking>3nps:4 |
| `g-speed-2` | — | — | g-legato>3nps-legato:0, g-legato>3nps-legato:1, g-legato>3nps-legato:4 |
| `g-speed-3` | — | — | g-picking>sweep5, g-picking>sweep5 (minor), g-picking>sweep3, g-picking>sweep3 (minor) |
| `g-speed-4` | — | — | g-legato>tap, g-legato>tap (minor), g-picking>sweep5:1 (minor) |
| `g-speed-5` | — | — | g-picking>skip, g-picking>skip:1, g-picking>tremolo:1, g-picking>tremolo:2 |
| `g-tpair-1` | gtp-shapes:20 | gtp-shapes:22, gtp-shapes:3 | gtp-shapes:5 |
| `g-tpair-2` | gtp-line:0 | gtp-line:3 | gtp-line:5 |
| `g-tpair-3` | gtp-line:29 | gtp-line:22 | gtp-line:26 |
| `g-tpair-4` | — | gtp-hex:2 | gtp-hex:7, gtp-hex:11 |
| `g-tpair-5` | gtp-comp:2 | gtp-comp:0, gtp-comp:1 | — |
| `g-tpair-6` | gtp-iivi:2 | gtp-iivi:0, gtp-iivi:1 | — |
| `g-tpair-7` | gtp-slip:0 | — | — |
| `harris-15` | h15-iivi:1 | h15-iivi | — |
| `harris-17` | h17-chromatic:2 | h17-chromatic:1 | h17-chromatic:0, h17-chromatic |
| `harris-18` | h18-sixfive:2 | h18-sixfive:0, h18-sixfive:1 | — |
| `harris-19` | — | — | h19-pivot:0, h19-pivot:1, h19-pivot:2, h19-pivot:3 |
| `harris-20` | — | — | h19-pivot:4, h19-pivot:5 |
| `harris-21` | — | — | h20-pivotrot:0, h20-pivotrot:1, h20-pivotrot:2, h20-pivotrot:3 |
| `harris-22` | h21-pivotiivi:1 | h21-pivotiivi | — |
| `harris-23` | — | h22-scalepivot | h22-scalepivot:1 |
| `harris-26` | — | — | h1-linear:2, h1-linear:3 |
| `k-bebop-2` | bb-minor, bb-minor:1 | — | — |
| `k-bebop-4` | — | — | bb-blues:0, bb-blues:1, bb-blues:2 |
| `k-bebop-6` | bb-standard:1 | bb-standard | — |
| `k-bebop-7` | — | bb-hands | bb-hands:1 |
| `k-bebop-9` | bb-form:2 | bb-form:0, bb-form:1 | — |
| `k-cadlib-1` | chart~cad:m-ii-v-i~shell~whole~comp, chart~cad:m-turnaround~shell~whole~comp, chart~cad:m-deceptive~shell~whole~comp | chart~cad:ii-v-i~shell~whole~comp, chart~cad:half-dim-to-major~shell~whole~comp, chart~cad:turnaround~shell~whole~comp, chart~cad:long-turnaround~shell~whole~comp, chart~cad:vi7-turnaround~shell~whole~comp, chart~cad:secondary~shell~whole~comp, chart~cad:extended-dominants~shell~whole~comp, chart~cad:chain-whole~shell~whole~comp, chart~cad:chain-half~shell~whole~comp, chart~cad:deceptive~shell~whole~comp | — |
| `k-cadlib-2` | chart~cad:m-ii-v-i~guide~whole~comp, chart~cad:m-turnaround~guide~whole~comp, chart~cad:m-deceptive~guide~whole~comp | chart~cad:ii-v-i~guide~whole~comp, chart~cad:half-dim-to-major~guide~whole~comp, chart~cad:turnaround~guide~whole~comp, chart~cad:long-turnaround~guide~whole~comp, chart~cad:vi7-turnaround~guide~whole~comp, chart~cad:secondary~guide~whole~comp, chart~cad:extended-dominants~guide~whole~comp, chart~cad:chain-whole~guide~whole~comp, chart~cad:chain-half~guide~whole~comp, chart~cad:deceptive~guide~whole~comp | — |
| `k-cadlib-3` | chart~cad:m-tritone-sub~shell~whole~comp, chart~cad:m-plagal~shell~whole~comp, chart~cad:m-flat-six-seven~shell~whole~comp, chart~cad:m-sus~shell~whole~comp | chart~cad:tritone-sub~shell~whole~comp, chart~cad:tritone-ii-v~shell~whole~comp, chart~cad:tritone-turnaround~shell~whole~comp, chart~cad:lady-bird~shell~whole~comp, chart~cad:chromatic-dominants~shell~whole~comp, chart~cad:backdoor~shell~whole~comp, chart~cad:plagal-borrowed~shell~whole~comp, chart~cad:borrowed-approach~shell~whole~comp, chart~cad:ending-dominants~shell~whole~comp, chart~cad:ending-maj7~shell~whole~comp, chart~cad:sus~shell~whole~comp, chart~cad:sus-9~shell~whole~comp, chart~cad:deceptive-flat-six~shell~whole~comp | — |
| `k-cadlib-6` | chart~cad:m-ii-v-i~rootless~whole~comp, chart~cad:m-turnaround~rootless~whole~comp, chart~cad:m-deceptive~rootless~whole~comp | chart~cad:ii-v-i~rootless~whole~comp, chart~cad:half-dim-to-major~rootless~whole~comp, chart~cad:turnaround~rootless~whole~comp, chart~cad:long-turnaround~rootless~whole~comp, chart~cad:vi7-turnaround~rootless~whole~comp, chart~cad:secondary~rootless~whole~comp, chart~cad:extended-dominants~rootless~whole~comp, chart~cad:chain-whole~rootless~whole~comp, chart~cad:chain-half~rootless~whole~comp, chart~cad:deceptive~rootless~whole~comp | — |
| `k-cadlib-17` | chart~cad:m-ii-v-i~close4~whole~comp, chart~cad:m-turnaround~close4~whole~comp, chart~cad:m-deceptive~close4~whole~comp | chart~cad:ii-v-i~close4~whole~comp, chart~cad:half-dim-to-major~close4~whole~comp, chart~cad:turnaround~close4~whole~comp, chart~cad:long-turnaround~close4~whole~comp, chart~cad:vi7-turnaround~close4~whole~comp, chart~cad:secondary~close4~whole~comp, chart~cad:extended-dominants~close4~whole~comp, chart~cad:chain-whole~close4~whole~comp, chart~cad:chain-half~close4~whole~comp, chart~cad:deceptive~close4~whole~comp | — |
| `k-cadlib-18` | chart~cad:m-tritone-sub~close4~whole~comp, chart~cad:m-plagal~close4~whole~comp, chart~cad:m-flat-six-seven~close4~whole~comp, chart~cad:m-sus~close4~whole~comp | chart~cad:tritone-sub~close4~whole~comp, chart~cad:tritone-ii-v~close4~whole~comp, chart~cad:tritone-turnaround~close4~whole~comp, chart~cad:lady-bird~close4~whole~comp, chart~cad:chromatic-dominants~close4~whole~comp, chart~cad:backdoor~close4~whole~comp, chart~cad:plagal-borrowed~close4~whole~comp, chart~cad:borrowed-approach~close4~whole~comp, chart~cad:ending-dominants~close4~whole~comp, chart~cad:ending-maj7~close4~whole~comp, chart~cad:sus~close4~whole~comp, chart~cad:sus-9~close4~whole~comp, chart~cad:deceptive-flat-six~close4~whole~comp | — |
| `k-cadlib-20` | chart~cad:m-ii-v-i~two-hand~charleston~comp, chart~cad:m-turnaround~two-hand~charleston~comp, chart~cad:m-deceptive~two-hand~charleston~comp | chart~cad:ii-v-i~two-hand~charleston~comp, chart~cad:half-dim-to-major~two-hand~charleston~comp, chart~cad:turnaround~two-hand~charleston~comp, chart~cad:long-turnaround~two-hand~charleston~comp, chart~cad:vi7-turnaround~two-hand~charleston~comp, chart~cad:secondary~two-hand~charleston~comp, chart~cad:extended-dominants~two-hand~charleston~comp, chart~cad:chain-whole~two-hand~charleston~comp, chart~cad:chain-half~two-hand~charleston~comp, chart~cad:deceptive~two-hand~charleston~comp | — |
| `k-cadlib-21` | chart~cad:m-tritone-sub~two-hand~charleston~comp, chart~cad:m-plagal~two-hand~charleston~comp, chart~cad:m-flat-six-seven~two-hand~charleston~comp, chart~cad:m-sus~two-hand~charleston~comp | chart~cad:tritone-sub~two-hand~charleston~comp, chart~cad:tritone-ii-v~two-hand~charleston~comp, chart~cad:tritone-turnaround~two-hand~charleston~comp, chart~cad:lady-bird~two-hand~charleston~comp, chart~cad:chromatic-dominants~two-hand~charleston~comp, chart~cad:backdoor~two-hand~charleston~comp, chart~cad:plagal-borrowed~two-hand~charleston~comp, chart~cad:borrowed-approach~two-hand~charleston~comp, chart~cad:ending-dominants~two-hand~charleston~comp, chart~cad:ending-maj7~two-hand~charleston~comp, chart~cad:sus~two-hand~charleston~comp, chart~cad:sus-9~two-hand~charleston~comp, chart~cad:deceptive-flat-six~two-hand~charleston~comp | — |
| `k-cadlib-22` | chart~cad:m-blues-ending~close4~whole~comp, chart~cad:m-blues-ending~two-hand~charleston~comp | chart~cad:coltrane~close4~whole~comp, chart~cad:passing-dim-up~close4~whole~comp, chart~cad:dim-walkdown~close4~whole~comp, chart~cad:bird-blues~close4~whole~comp, chart~cad:coltrane~two-hand~charleston~comp, chart~cad:passing-dim-up~two-hand~charleston~comp, chart~cad:dim-walkdown~two-hand~charleston~comp, chart~cad:bird-blues~two-hand~charleston~comp | chart~cad:blues-turnaround~close4~whole~comp, chart~cad:blues-turnaround~two-hand~charleston~comp |
| `k-dimcol-1` | — | dc-lower:1, dc-lower:2 | dc-lower:0 |
| `k-harrisline-3` | — | — | hl-eight:0, hl-eight:1, hl-eight:3, hl-eight:5, hl-eight:7, hl-eight:9, hl-eight:11 |
| `k-harrisline-4` | — | — | hl-imp-arps:0, hl-imp-arps:1, hl-imp-arps:2 |
| `k-harrisline-9` | — | — | hl-ands:0 |
| `k-harrisline-11` | — | — | hl-chrom:1 |
| `k-harrisline-13` | — | — | hl-imp-scale:0, hl-imp-scale:1, hl-imp-scale:2, hl-imp-scale:3, hl-imp-scale:4 |
| `k-harrisline-15` | hl-chrom:2 | — | — |
| `k-harrisline-16` | hl-rules:9, hl-rules:10, hl-rules:11, hl-rules:12, hl-rules:13, hl-rules:14 | — | — |
| `k-harrisline-18` | hl-outline:5 | hl-outline:4 | — |
| `k-harrisline-19` | — | hl-chrom2:0, hl-chrom2:1, hl-chrom2:2 | hl-chrom2:3, hl-chrom2:4, hl-chrom2:5 |
| `k-harrisline-21` | hl-sevendown:0, hl-sevendown:2 | hl-sevendown:1 | — |
| `k-harrisline-25` | — | — | hl-triplet:0, hl-triplet:1, hl-triplet:2, hl-triplet:3, hl-triplet:4 |
| `k-harrisline-28` | — | hl-misc:3 | hl-misc:0, hl-misc:1, hl-misc:2 |
| `k-harrisline-33` | — | — | hl-eight:2, hl-eight:4, hl-eight:6, hl-eight:8, hl-eight:10, hl-eight:12 |
| `k-indep-9` | ind-hold:0 (minor), ind-hold:1 (minor) | — | — |
| `k-indep-10` | ind-voices:0 (minor), ind-voices:1 (minor) | — | — |
| `k-indep-11` | ind-touch:0 (minor), ind-touch:1 (minor) | — | — |
| `k-indep-12` | ind-dyn:0 (minor), ind-dyn:1 (minor) | — | — |
| `k-keylick-1` | kl-1-1-up:7 (minor), kl-1-1-down:7 (minor) | kl-1-1-up:0, kl-1-1-down:0 | — |
| `k-keylick-2` | kl-1-3-up:7 (minor), kl-1-3-down:7 (minor) | kl-1-3-up:0, kl-1-3-down:0 | — |
| `k-keylick-3` | kl-1-t-up:7 (minor), kl-1-t-down:7 (minor) | kl-1-t-up:0, kl-1-t-down:0 | — |
| `k-keylick-4` | kl-1-7-up:7 (minor), kl-1-7-down:7 (minor) | kl-1-7-up:0, kl-1-7-down:0 | — |
| `k-keylick-5` | kl-2ba-1-up:7 (minor), kl-2ba-1-down:7 (minor), kl-2ab-1-up:7 (minor), kl-2ab-1-down:7 (minor) | kl-2ba-1-up:0, kl-2ba-1-down:0, kl-2ab-1-up:0, kl-2ab-1-down:0 | — |
| `k-keylick-6` | kl-2ba-3-up:7 (minor), kl-2ba-3-down:7 (minor), kl-2ab-3-up:7 (minor), kl-2ab-3-down:7 (minor) | kl-2ba-3-up:0, kl-2ba-3-down:0, kl-2ab-3-up:0, kl-2ab-3-down:0 | — |
| `k-keylick-7` | kl-2ba-t-up:7 (minor), kl-2ba-t-down:7 (minor), kl-2ab-t-up:7 (minor), kl-2ab-t-down:7 (minor) | kl-2ba-t-up:0, kl-2ba-t-down:0, kl-2ab-t-up:0, kl-2ab-t-down:0 | — |
| `k-keylick-8` | kl-2ba-7-up:7 (minor), kl-2ba-7-down:7 (minor), kl-2ab-7-up:7 (minor), kl-2ab-7-down:7 (minor) | kl-2ba-7-up:0, kl-2ba-7-down:0, kl-2ab-7-up:0, kl-2ab-7-down:0 | — |
| `k-keylick-9` | kl-3-1-up:7 (minor), kl-3-1-down:7 (minor) | kl-3-1-up:0, kl-3-1-down:0 | — |
| `k-keylick-10` | kl-3-3-up:7 (minor), kl-3-3-down:7 (minor) | kl-3-3-up:0, kl-3-3-down:0 | — |
| `k-keylick-11` | kl-3-t-up:7 (minor), kl-3-t-down:7 (minor) | kl-3-t-up:0, kl-3-t-down:0 | — |
| `k-keylick-12` | kl-3-7-up:7 (minor), kl-3-7-down:7 (minor) | kl-3-7-up:0, kl-3-7-down:0 | — |
| `k-keylick-13` | kl-1-1-up:7 (minor), kl-1-1-down:7 (minor), kl-1-t-up:7 (minor), kl-1-t-down:7 (minor), kl-1-7-up:7 (minor), kl-1-7-down:7 (minor) | kl-1-1-up:0, kl-1-1-down:0, kl-1-t-up:0, kl-1-t-down:0, kl-1-7-up:0, kl-1-7-down:0 | — |
| `k-keylick-14` | kl-2ba-1-up:7 (minor), kl-2ba-1-down:7 (minor), kl-2ba-t-up:7 (minor), kl-2ba-t-down:7 (minor), kl-2ba-7-up:7 (minor), kl-2ba-7-down:7 (minor), kl-2ab-1-up:7 (minor), kl-2ab-1-down:7 (minor), kl-2ab-t-up:7 (minor), kl-2ab-t-down:7 (minor), kl-2ab-7-up:7 (minor), kl-2ab-7-down:7 (minor) | kl-2ba-1-up:0, kl-2ba-1-down:0, kl-2ba-t-up:0, kl-2ba-t-down:0, kl-2ba-7-up:0, kl-2ba-7-down:0, kl-2ab-1-up:0, kl-2ab-1-down:0, kl-2ab-t-up:0, kl-2ab-t-down:0, kl-2ab-7-up:0, kl-2ab-7-down:0 | — |
| `k-keylick-15` | kl-3-1-up:7 (minor), kl-3-1-down:7 (minor), kl-3-t-up:7 (minor), kl-3-t-down:7 (minor), kl-3-7-up:7 (minor), kl-3-7-down:7 (minor) | kl-3-1-up:0, kl-3-1-down:0, kl-3-t-up:0, kl-3-t-down:0, kl-3-7-up:0, kl-3-7-down:0 | — |
| `k-keylick-16` | kl-1-3-up:5, kl-1-3-down:5, kl-1-t-up:5, kl-1-t-down:5, kl-1-7-up:5, kl-1-7-down:5 | — | — |
| `k-keylick-17` | kl-2ba-t-up:5, kl-2ba-t-down:5, kl-2ba-7-up:5, kl-2ba-7-down:5, kl-2ab-t-up:5, kl-2ab-t-down:5, kl-2ab-7-up:5, kl-2ab-7-down:5 | — | — |
| `k-keylick-18` | kl-3-t-up:5, kl-3-t-down:5, kl-3-7-up:5, kl-3-7-down:5 | — | — |
| `k-keylick-20` | kl-1-t-up:8, kl-1-t-down:8, kl-1-7-up:8, kl-1-7-down:8, kl-2ba-t-up:8, kl-2ba-t-down:8, kl-2ba-7-up:8, kl-2ba-7-down:8, kl-2ab-t-up:8, kl-2ab-t-down:8, kl-2ab-7-up:8, kl-2ab-7-down:8 | — | — |
| `k-keyx-6` | kx-boct:7 (minor), kx-leap:7 (minor) | — | — |
| `k-keyx-7` | kx-canon:7 (minor), kx-canon:107 (minor), kx-ost:7 (minor), kx-ost3:7 (minor) | — | — |
| `k-modes-3` | — | — | mode:7 |
| `k-phrase-1` | ph-ct:1 | ph-ct:0 | ph-ct:2 |
| `k-reharm-8` | rh-pedal:1 | rh-pedal (lydian) | — |
| `k-sharm-4` | hl-3b:7, hl-3b:8, hl-3b:10 | hl-3b:9 | hl-3b:11, hl-3b:12 |
| `k-sharm-6` | hl-3t:7, hl-3t:8, hl-3t:10 | hl-3t:9 | hl-3t:11, hl-3t:12 |
| `k-sharm-8` | hl-ta:7, hl-ta:8, hl-ta:10 | hl-ta:9 | hl-ta:11, hl-ta:12 |
| `k-sharm-10` | hl-tb:7, hl-tb:8, hl-tb:10 | hl-tb:9, hl-tb:0 | hl-tb:11, hl-tb:12 |
| `k-sharm-12` | hl-7a:7, hl-7a:8, hl-7a:10 | hl-7a:9 | hl-7a:11, hl-7a:12 |
| `k-sharm-14` | hl-7b:7, hl-7b:8, hl-7b:10 | hl-7b:9 | hl-7b:11, hl-7b:12 |
| `k-sharm-16` | hl-d2:7, hl-d2:8, hl-d2:10 | hl-d2:9 | hl-d2:11, hl-d2:12 |
| `k-sharm-18` | hl-d3:7, hl-d3:8, hl-d3:10 | hl-d3:9 | hl-d3:11, hl-d3:12 |
| `k-sharm-20` | bw-one:10, bw-one:13 | — | bw-one:20, bw-one:23, bw-one:30, bw-one:33 |
| `k-sharm-21` | bw-two:10, bw-two:11, bw-two:12 | bw-two:0, bw-two:1, bw-two:2 | — |
| `k-sharm-22` | bw-chord:10, bw-scale:10 | bw-chord:0, bw-chord:1, bw-out:0, bw-out:2, bw-scale:0, bw-scale:3 | — |
| `k-sharm-23` | bw-walk:10, bw-iivi:1 | bw-walk:0, bw-iivi:0, bw-std:0 | bw-walk:20, bw-walk:30 |
| `k-sharm-24` | bw-walk-d2:10 | bw-one-d2:1, bw-two-d2:0, bw-chord-d2:0, bw-scale-d2:0, bw-walk-d2:0, bw-iivi-d2:0 | bw-walk-d2:20, bw-walk-d2:30 |
| `k-sharm-25` | bw-walk-d3:10 | bw-one-d3:2, bw-two-d3:1, bw-chord-d3:0, bw-scale-d3:0, bw-walk-d3:0, bw-std-d3:0 | bw-walk-d3:20, bw-walk-d3:30 |
| `k-sharm-30` | — | sf-comp:0 | sf-comp:1 |
| `k-sharm-31` | — | — | sf-borrow:0, sf-borrow:1 |
| `k-sharm-32` | sf-minor:0, sf-minor:1 | — | — |
| `k-sharm-35` | hl-d24:10 | hl-d24:9 | hl-d24:11, hl-d24:12 |
| `k-sharm-38` | bw-three:10 | bw-three:3, bw-root:0 | bw-root:20 |
| `k-sharm-40` | cm-expand:8 | — | — |
| `k-sharm-41` | vl-ladder:6, vl-ladder:9 | vl-ladder:2, vl-ladder:8 | — |
| `k-sharm-44` | hl-ti:7, hl-ti:8 | — | — |
| `k-sharm-46` | hl-c4:7, hl-c4:8 | — | — |
| `k-sharm-48` | hl-9a:7, hl-9a:8 | — | — |
| `k-tpair-1` | tpk-pat:0 | tpk-pat:2 | tpk-pat:5 |
| `k-tpair-2` | tpk-pat:20, tpk-pat:24 | tpk-pat:43 | tpk-pat:45 |
| `k-tpair-3` | tpk-close:0 | tpk-close:2 | tpk-close:1, tpk-close:7 |
| `k-tpair-4` | tpk-pat:69 | tpk-pat:62 | tpk-pat:66 |
| `k-tpair-5` | tpk-pat:80, tpk-pat:109 | tpk-pat:82 | tpk-pat:107 |
| `k-tpair-11` | tpk-iivi:2 | tpk-iivi:0, tpk-iivi:1 | — |
| `k-tpair-14` | tpk-slip:0 | — | — |
| `scales-10` | scale/harmonic (minor) | scale | — |
| `scales-13` | scale/harmonic (minor), scale/melodic (minor) | — | — |
| `scales-14` | scale/harmonic (minor) | scale | scale/chromatic |
| `scales-17` | scale/harmonic (minor), scale/natural (minor), scale/melodic (minor) | — | — |
| `scales-18` | scale/natural (minor), scale/melodic (minor) | — | — |
| `scales-31` | scale/six-dim-m (minor) | — | — |
| `scales-33` | scale/natural (minor), scale/melodic (minor), scale/six-dim-m (minor) | scale/pentatonic, scale/six-dim | scale/blues |
| `scales-35` | scale/melodic (minor) | — | — |
| `scales-36` | scale/harmonic (minor) | — | — |

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
- Repo: SPEC-HOLISTIC-2 v15, SPEC-STYLE-FOCUS §8, BARRY-HARRIS-THEORY, RESEARCH-KEY-EXERCISES-AUDIT, SPEC-GUITAR-TECHNIQUE, keyIndex.ts, harmLadder.ts (`K_HARM_DIFF`), guitarMeta.ts (`ADDON_FAMILY`), guitar.ts (`guitarLevelShown`), guitarTop.ts, bass.ts (`genChord` options), stageCPlacement.ts, voiceTop.ts, voiceFamilies.ts, path.ts (`stepCatalogue`), verifiedContent.ts, ranks.ts, tiers.ts.

## Owner decisions, round 2 (2026-11-28)
- Q7: yes. v14's catalogue rule (>= 3 per tier, floor 2, no lone 1-exercise bottom tier) replaces "aim for 4, floor 3".
- Q8: blocked octaves use 0.63 (RCM). Hands a 3rd/6th apart use raw tempo.
- Q9: yes. Guitar beginners start on pentatonics, blues shells and picking, as the syllabi do.
- Q10: yes. The diploma tempo for guitar and bass is grade 8 x 1.2, labelled an estimate.
- Q11: yes. Voice tops out at T7 for now; voice T8 goes to the backlog.

## Owner decision, round 3 (2026-11-28)
- Q12: keep voice capped at T7 for now. Appendix A stays as the ready plan for opening voice T8 once there is enough content.

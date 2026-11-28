# Review of RESEARCH-TOP-TIERS.md v5, round 5 (2026-11-28)

**Verdict: NOT CLEAN.**

All six round-4 issues and all nine minor notes are addressed, and the counts reproduce. Four problems remain that a builder would carry into code:
- the §1.5 guard's lists are open-ended, and two of its rows send rungs to the wrong area;
- guitar minor harmony comes before the scales it harmonises;
- the piano pivot has no precursor;
- the Q12 text still recommends opening voice T8, against the binding owner decision.

Each fix is a text change, and none needs new content.

What I checked:
- **Counts.** I re-ran `prop5.mjs --counts`. All 13 rows of §4 match.
- **The harness.** I re-ran the bass §4.4 rows (60 runs, the report's seed), plus three variants of my own (below).
- **The §1.5 rule.** I re-applied it, by family + kind + option, to every listed item:
  - `harmLadder.ts` steps and options (`H_HARRIS` 9–12);
  - `guitarHarmLevels`, `g-harris`, the `g-scales` levels;
  - `harrisLineDrills.ts` (`HL_ROWS`, `B_ROWS`);
  - the bass `b-chord`, `b-scale` and `b-barry` kinds.
- **Seeds.** Every piano line-jazz and `k-sharm` seed (`HL_LEVEL_DIFF`, `K_HARM_DIFF`, path.ts `harris-*`), checked against §4.1.
- **Code.** `keyIndex.ts`: `warmOf`, the `r.id !== w.id` filter, `laterRungs` / `aeol()`, `AEOLIAN_FROM_TIER`, `openKeyRungs` (the jazz shift), and `guitarRungs` (minor = option 7).

---

## Round-4 status

| Item | Status |
|---|---|
| R4-1 the guard's `hl-*` prefix | Fixed: the steps are named, the rule is keyed on family + kind + option, and `hl-line` is a scale. New gaps in the lists: issue 2 |
| R4-2 §1.5 not applied; no line-jazz row | Fixed. Row 4 is added, and all six items moved: `k-dimcol-1` and m6dim `k-sharm-12` to harmony, `g-tpair-1` to harmony T6, `k-sharm-29` and `g-harris-6` to line-jazz T8, `k-sharm-32` / `g-harris-12` split |
| R4-3 the 6th-dim harmonisation step | Fixed. The `H_HARRIS` options of `k-sharm-12` / `14` / `16` / `18` come first at T6, are listed as overrides, and match the seeds (1260 / 1340 / 1450 / 1600) |
| R4-4 piano line-jazz precursors and overrides | Fixed. `-2`, `-3`, `-4`, `-6`, `-7` at T5 and `-11`, `-13`, `-15` at T6 come before the hard variants. Every placement equals its seed except the four listed overrides; I checked all 22. One gap remains (issue 4) |
| R4-5 `warmOf`, later-rung mins | Fixed (§7). One conflict remains (issue 3) |
| R4-6 bass bands vs `tierOfNps` | Fixed. A rounding nit remains (minor 2) |
| R4 minor 1–9 | All fixed |

---

## Substantive issues

### 1. Q12 is decided, but the text still says it is pending and recommends opening T8
- **Evidence.** The round-3 owner decision reads: "Q12: keep voice capped at T7 for now". But:
  - §0 item 8 says Q12 "is pending";
  - §6.2 says it is "still pending";
  - §6.4 says "Q11, or Q12 if opened";
  - the §8 row "Q12 (pending)" still recommends "Open T8 … with these levels".
- **Risk.** A builder who reads §8 would implement Appendix A.
- **Fix.**
  - Mark Q12 decided (voice T7) in §0, §6.2, §6.4 and §8, and drop the recommendation.
  - Keep Appendix A as the plan for later, headed "not to be built until the owner opens voice T8".

### 2. The §1.5 guard lists are not closed, and two rows misroute bass rungs
§7 says that "any rung whose triple is on no list fails". As written, the guard therefore either fails the build or misplaces rungs:
- **(a) Bass walking has no clause.**
  - Row 4 sends every `isHarrisLineKind` kind and every `b-barry` line kind to bass scales.
  - That captures `b-harrisline-8` (`hl-walkties`, harrisLineDrills.ts:779, 843) and `b-barry-4` (`walk13`, bassNiche.ts:1132).
  - §4.3 places both in bass **walking** (T4, T5).
- **(b) Scale-shaped Harris and bebop rungs match two rows.** Row 5 says a scale played note by note goes to scales, with nps rungs. Row 4 says the 6th-dim scales go to line-jazz, without them. No precedence is stated. The affected rungs:
  - `harris-1`, `-25`, `-26` (`h1-linear`);
  - `scales-31` (family `scales`, m6dim);
  - `k-modes-3`;
  - `g-harris-1` (`sixdim-scale`);
  - `b-barry-1` (`sixdim`).

  `g-scales-21` is split by option (bebop, option 24 → line-jazz T7; dim W–H, option 23 → scales T7), but it is missing from the §1.5 split list. The same goes for `b-scale-13`'s bebop option 27.
- **(c) Harmony kinds that no row lists.** `sf-voice`, `sf-borrow`, `sixth5`, `mv-first` / `mv-next` / `mv-mmm`, `shell4`, `tm-res`, `sub-tune` (`k-sharm-26` / `31` / `36` / `37` / `39` / `42`); the `cad~*` kinds of `k-cadlib` / `g-cadlib` / `b-cadlib`; `k-reharm`, `g-jblues`, `g-solojazz`, `g-vl`, `g-harris` `sixdim-chords` / `sixdim-sets`; the `*-hlfast` kinds.
- **Fix.**
  - Make each row a closed per-family table of kind (+ option) entries, as §1.5 promises, with no "…".
  - Add a bass walking row: `b-walk-*`, `b-chord-1` / `8` / `9` / `10`, `b-cadlib`, `hl-walkties`, `walk13` → walking, with no `max`.
  - State the precedence: the Harris 6th-dim scales and the bebop scales go to line-jazz (bass: scales) with no `max`, ahead of row 5.
  - Add `g-scales-21` and `b-scale-13` to the split-by-option list.

### 3. Guitar minor and Aeolian harmony come before their scales, and §4.2 conflicts with §7
- **Evidence.**
  - Guitar harmony T3 holds `g-harm-2` "(3 rows)". Those rows are major, minor and Aeolian (`prop5.ts`: `m:g-harm-2`, `aeol:g-harm-2` at T3).
  - The guitar minor row is harmonic minor (keyIndex.ts:348, `h = minor ? 7 : 0`).
  - But the harmonic- and natural-minor scales open only at guitar scales T4 (`g-scales-13`). The minor rows hold only minor pentatonic below T4 (the §7 warm-up).
  - §7 also sets the guitar Aeolian later rungs from T4. `aeol()` clamps `min` to that value (keyIndex.ts:465), so a builder gets T4 regardless and the §4 count is wrong.
  - This breaks the doc's own rule, "modal harmony follows its scale's grade".
- **Fix.**
  - Move `m:g-harm-2` and `aeol:g-harm-2` to T4. Guitar harmony becomes 0 0 3 **2** **9** 9 19 12 9. T3 sits at the floor (2): `g-harm-2` major and `g-vl-1`.
  - My re-run (60 runs): T2→T3 29 d, then 16.5 / 24.5 / 19 / 22.5 / 29.5, no stall (worst 36 d).
  - Alternatively, justify a lower guitar minor-scale tier. The tier would come from the syllabus, and it is an [E] until checked.

### 4. Piano: the pivot through ii–V–I without the pivot
- **Evidence.**
  - Piano line-jazz T8 places `harris-22`, "The pivot through ii–V–I, the scale down by the rules".
  - The pivot arpeggio itself, `harris-19` (maj7, m7, 7, m7♭5), `-20` (6 and dim7) and `-21` (from every chord tone, the mirror), is placed nowhere. All three are shown (BARRY-HARRIS-THEORY §7 and §12: "the pivot arpeggio" is owner-confirmed).
  - `k-harrisline-13` is the ♭7-major pivot with the important arpeggios. That is a different device.
  - Guitar and bass place the plain pivot first (`g-harris-8` T7, `b-barry-7` / `8` T6).
  - The seeds: 1440 / 1480 / 1520 → T7 / T7 / T8.
- **Fix.**
  - Add `harris-19` and `-20` at T7, and `-21` at T7 as a listed override (or at T8, ahead of `-22` in rung order).
  - Piano line-jazz becomes T7 9–10.
  - Optionally add `harris-23` / `-24` (scale with a pivot; pivot and enclosure; seeds T8), to mirror `g-harris-9` / `-10`.

### 5. The Harris order across areas is not enforced
- **Evidence.**
  - Step 2 (the scales) must come before step 3 (the harmonisation) (BARRY-HARRIS-THEORY §6).
  - On piano, the four scales are line-jazz rungs (`harris-1` T5; `harris-25` / `-26` T6), while their harmonisation is harmony T6.
  - On guitar, the scales are `g-harris-1` (line-jazz T5) and the harmonisation `g-harris-2` (harmony T6).
  - Areas climb independently (v14 §1.3), so a learner can reach harmony T6 before line-jazz T5. The in-tier "rung order" rule (§1.5) does not cover this.
- **Fix.** State cross-session prerequisites (v14 §1.6, `established`). Each Harris harmonisation option (`k-sharm-12` / `14` / `16` / `18` options 9–12, `-35`, `g-harris-2` / `-7`, `g-harm-9`'s drop 2&4) needs its scale rung established: `harris-1` / `-25` / `-26`, or `g-harris-1`. Per v14, the step is skipped, never locked. Add this to the flow-audit row and the guard.

### 6. The context split is applied to `-23` / `g-harm-12` only
- **Evidence.** §1.5 splits `k-sharm-23` / `g-harm-12`: the ii–V–I and turnaround items go to T8 (step 6). But these levels also hold such items:
  - `k-sharm-24` (`iivi-d2`);
  - `k-sharm-25` (`std-d3`);
  - `g-harm-13` (`bw-iivi-d3`).

  They stay whole at T7 (harmLadder.ts:768–769, 830).
- **Fix.** Split them the same way (their borrowing parts T7, their context parts T8). Piano harmony T7 keeps 16 and T8 gains 2; guitar T8 gains 1. Or drop the split everywhere and note the exception once.

---

## The two slow spots (bass arpeggios)

| Change (my re-runs, 60 runs, seed as the report) | Counts T0… | T0→T1 | T5→T6 | T6→T7 | T7→T8 | Stalls |
|---|---|---|---|---|---|---|
| v5 as written | 4 2 4 5 5 8 3 4 6 | 29 | **40.5** | 28 | 27 | 0 |
| A: `b-chord-12` counted by option (maj9 / m9 / 9) at T6 and T8 | 4 2 4 5 5 8 5 4 8 | 29 | **30** | 29 | 22.5 | 0 |
| B: A + `b-chord-5` by option (1st / 2nd inversion), T1–T3 | 4 3 5 6 5 8 5 4 8 | **21** | 30 | 32 | 21.5 | 0 |

- **T5→T6: fix it before the build.**
  - The fix costs nothing. v14 §1.7 counts each option as its own exercise anyway, and the plan already does this for `b-chord-6` / `-13`.
  - 40.5 d is within 1.5 d of the 42-day stall guard.
  - Reword §4's reason for the exception, "different chord types at different RSL grades", to "different chord types". RSL G7 lists maj9, m9 and dom9 as three arpeggios.
- **T0→T1: optional.** 29 d is not a stall, and it matches other first transitions. Variant B is the cheap fix, on the same §1.7 principle. If minor 4 below is adopted (moving `b-scale-6` 3rds out of arpeggios), T1 needs B to stay at the floor (2), and T0→T1 stays at 29 d.

---

## Minor notes
1. **Double count.** Piano harmony T6 counts `harris:k-sharm-12` and `minor:m6dim:k-sharm-12` as two rungs (`prop5.ts`). The text says the m6dim option is one of the Harris options. By "one exercise, one cell", T6 is 13, not 14.
2. **Bass `tierOfNps` cut.** "< 3.67 → T5" puts ♩110 (3.667 n/s) in T5, but §1.4 puts ♩110 in T8. Write the cut as ♩ ≥ 110 (n/s ≥ 11/3).
3. **§1.2 step 2** maps only "guitar grades 9–11" to T8. Rating grades ≥ 9 (piano `k-sharm-26`–`-42`, `k-harrisline-28` / `-34`, `harris-22`) need "grade ≥ 9 → T8" stated for every instrument.
4. **Broken diatonic 3rds sit in three areas:**
   - `hl-3b` (piano and guitar) → harmony, no nps rungs;
   - `b-scale-6` 3rds → bass arpeggios, no nps rungs, while its 4ths option (same kind, `seq`) is a scale with nps rungs;
   - `g-scales-10` / `-12` (3rds, 4ths, 6ths as interval sequences) → guitar scales, with nps rungs.

   A dyad is not "the chord on each degree". Treat broken interval sequences as scale patterns (row 5), or give the reason for the difference. Either way, mark `b-scale-6` 3rds at T1 as [E] (no RSL grade).
5. **Restricted-key levels.** §4.3 says only `b-fret-6` (4 keys) widens to 12. But these levels are also K4 / K6: `b-scale-1`, `b-scale-5`, `b-scale-10`, `b-chord-12`, `b-chord-13` and `b-barry-1`–`6`. A key rung renders in its row's key either way (keyIndex.ts:683, `keys: [root]`). So either drop the `b-fret-6` exception or list them all, and widen the path levels (all-12-keys rule).
6. **The warm-up cell.** §7 says the warm-up "stays available for rank", but `openKeyRungs` drops it from `built`, and `WeekCoverage` excludes it. Say explicitly that rank, coverage and `realCatalogue` count the warm-up's cell; this is a code change.
7. **Bass harmonic-minor 9ths.** Minor `b-chord-18` (harmonic-minor 9ths through the scale, T6) contains V7♭9, which RSL places at G8 (T7). Minor `b-chord-16` (T5) contains mMaj7 and maj7♯5, which no RSL grade lists. Mark both [E], or say in one line that the order is accepted.
8. **Shown piano line rows placed nowhere:** `k-harrisline-8` (upbeats), `-9` (ands), the outlines `-10` / `-14` / `-18` / `-30`, `-35` (3 to ♭9, options 2–3). Say whether this is deliberate (coverage only) or place them.

## Checks passed
- **Counts.** §3 and §4 reproduce. Every `k-sharm` placement equals its `K_HARM_DIFF` seed or is a listed override.
- **Guitar grades.** I re-checked the §4.2 cells touched in v5 (`g-harris-1` / `2` / `3` / `6` / `8`–`10`, `g-tpair-1`, `g-harm-12` / `13`).
- **Tempo arithmetic.** The §1.4 swing bands, guitar SPEED T8 6.4, bass SPEED T8 4.4, and `g-speed-1` at 6.4 n/s.
- **Appendix A.** Its T7 / T8 voice counts are consistent with §6.2.
- **The jazz early opening.** The ≤ T5 shift matches keyIndex.ts:688's structure. `styleRungTier` stays capped at T5.
- **Only verified theory.** Hidden items stay out (`el-borrow`, `cm-elevator`, `vl-ladder` thirds / triads, `hl-5432`, `hl-feel6`, `hl-compose`, `hl-arps-down`, `hl-outline:0`, `b-harrisline-5` / `9`). 3 to ♭9 over the family gives each dominant its own bar, as BARRY-HARRIS-THEORY §9 requires.
- **No Claude-composed music. US copyright.** New items are rule-generated, improvised cards or chord charts.
- **Vocal health.** `v-top` is coverage only, and voice stays at T7.
- **Rubato first. Twelve keys as coverage.** No tempo steps in walking, voicings, Ear or line rungs.
- **The checklist.** It is complete apart from the items above (the guard lists, the prerequisites, the warm-up cell).

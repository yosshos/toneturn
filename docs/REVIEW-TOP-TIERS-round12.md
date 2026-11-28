# Review of RESEARCH-TOP-TIERS.md v12, round 12 (2026-11-28)

**Verdict: CLEAN.** Round 11's two issues are fixed, and so are three of its four minor notes. The classifier is hardened as round 11 asked. The guard, the classifier, the label check and the harness all reproduce exactly on today's tree. The 30+ spot checks of reclassified options found no misclassification that moves content to the wrong row.

What remains are minor notes. The most useful one is note 1: the stated reason for leaving the guitar minor-row line-jazz T5 thin is factually wrong for guitar. The decision still stands on the plan's other two reasons. One measured override improves that tier, but the build does not need it.

## What I ran

- **Guard** (`guard2.ts`, re-bundled on today's tree): 45 families, 2,533 specs, 0 unlisted. The 13 mixed levels are exactly §1.5's 5 plan splits and 8 "not rungs".
- **Classifier** (`tonality2.ts`, run as is, plus a copy that prints each option's title, chart and pitch set):
  - 2,028 specs, 248 reclassified against v11, 0 unresolved;
  - 0 cross-instrument disagreements, 0 view mismatches;
  - 4 row mismatches in today's rungs (the four §1.5 names);
  - the regenerated table is byte-identical to `tonality2-table.md`.
- **Appendix B** against the generated table, by a script: every level and every option is in the right column. The 108 all-major levels are exactly the generated all-major or modal levels.
- **Label check** (`labelcheck.py`): 61 labels, 0 mismatches; 230 unlabelled rungs, each with a major-row option.
- **Harness** (`prop11.ts`, re-bundled on today's tree, so v16 by default; 60 runs, the report's seed): piano, guitar, bass and bass-now are byte-identical to the author's `out11-*.txt`.
  - The largest median transition is 38.5 days on piano, 37.5 on guitar and 36 on bass. None reaches 42, and the climb metric shows 0 stalls.
  - Round 11 confirmed that the doc's v15 table reproduces `r10/*.txt`.
- **Spot checks.** I read every one of the 248 reclassified options (title, chart, pitch set), plus about 60 unchanged ones. They include:
  - all 136 "tonic chord dominant" moves, the 25 "dominant scale" title moves and the 8 → pminor;
  - the 23 human-decision keys, which cover 32 specs;
  - every `BASS_STD` option (36 standards);
  - the guitar line-jazz T5, bass walking T2 and bass scales rungs.

## Round-11 status

| Item | Status |
|---|---|
| R11-1: misclassified items | **Fixed.** `b-walk-19` op 1 is minor (minor tonic chord ×4). `g-harm-12` `bw-iivi:1` is minor and now matches piano. The blues scale is neutral. The classifier reads semantic data first, then the tonic chord anywhere. It never falls back on `keySig` or "has a minor 3rd", fails on `unresolved`, and the cross-instrument check exists |
| R11-2: Appendix B vs the mode views | **Fixed.** Appendix B "classifies, not the pick list" (§1.5, the Appendix B header). Tagged views keep their rows, and a view's pick must be its mode. That check is implemented and shows 0 mismatches. The rule for untagged modal options is stated (§1.5, §4.2 `g-harm-1`). The label check now covers `dor` / `phr` / `loc` / `lyd` / `mix` |
| R11 minor 1: dominant material neutral | Fixed (§1.5, with per-row counts) |
| R11 minor 2: `b-scale-15` op 26 | Fixed (neutral) |
| R11 minor 3: "on V" offsets | Fixed. §4.3 gives `off: 7` to `V:b-scale-9` and to `b-scale-13` op 27, and the guard ties the label to the offset. Checked: at key 0 both render on C, and today's `g-scales-21` / `k-modes-3` already use `off: 7` (keyIndex.ts:386, :615) |
| R11 minor 4: exact label check | **Not fixed in the script** (minor note 2) |

---

## Minor notes

1. **Guitar line-jazz T5 on the minor rows: the stated reason is wrong for guitar.**
   - **The claim (§1.5):** "a minor-row session at those tiers still draws the neutral rungs of its own and the tiers below (guitar: the T5 dominant material is neutral …)".
   - **What the catalogue says.** Guitar line-jazz T5 is `g-harris-1`, `g-harrisline-10`, `g-jazz-5` and `g-bebop-6`. Every option of these is major, except `g-harris-1` options 2 / 3 (minor). That matches the doc's own "4 / 1": there is no neutral rung at T5, and guitar line-jazz has no tier below T5. The guitar dominant material (`g-harrisline-3`, `g-harris-3`) is at T6.
   - So at T5, a minor-row guitar session has one line-jazz rung, the minor 6th-dim scale.
   - The bass half of the claim is true: the T0–T1 blues walks are neutral. The decision still stands on the other two reasons: rank counts both rows, and the minor rules come after the major rules.
   - **On the v16 harness with the report's seed,** guitar line-jazz first rank is reached in 98 % of runs (`->T5 20(98%)`), and the doc does not report it. On two other seeds it is 100 % (19 days), so this is one tail run in 60, not a stall. Still, say so in the v16 note.
   - **Fix:** correct the §1.5 sentence.
   - **Optional improvement (measured on v16):** place `g-harrisline-3` at T5. It is all neutral: the dominant rule, the important arpeggios and the ♭7-major pivot. Override grade 7 → T5, mirroring piano T5's `k-harrisline-3` / `-4` after the ABCs. Rung order: `g-harris-1` → `g-harrisline-10` → `g-harrisline-3`. Result:
     - counts become 0 0 0 0 0 5 5 8 14;
     - first rank 17 days, 100 %;
     - transitions 20 / 20 / 20, 0 stalls;
     - minor-row T5 gains a neutral rung.
2. **The label check is still a level-level "any" check, not exact.**
   - `labelcheck.py` passes a label when *some* option of the level has a fitting class, and prop11 carries no picks.
   - §1.5 calls it an "exact check". Reword it as "a level-level check". The exact per-pick check belongs to the builder's guard, which §1.5 specifies correctly.
   - No build impact, because the row filter admits only fitting options.
3. **The reclassification counts are off.**
   - The script finds 222 major → neutral, not 217. The doc's own breakdown sums to 243 of 248.
   - The script treats a v11 "minor" that is now `mode:dorian` / `phrygian` / `locrian` / `aeolian` as unchanged. That is the R11-2 fix, about 100 options, and they are not counted.
   - "9 options settled by the human decisions" is also off: the list has 23 keys, which apply to 32 specs. Say how many of them were otherwise unresolved.
4. **The bass per-row line counts at T5 and T8 do not reproduce.**
   - Using the doc's own method (neutral and split rungs counted on both rows), bass scales T5 is 8 / 8, not 11 / 7, and T8 is 9 / 11, not 10 / 11.
   - The piano and guitar figures and bass T6–T7 reproduce. Not a thin row either way.
5. **The v16 note's ranges are loose.** At p 0.75 / 3 d/wk the area medians run 20–26.75 days (guitar line-jazz 20, guitar harmony 21), not "about 24–26". At p 0.85 / 5 d/wk they run 11–13.5, not 11–13.
6. **Keeping the v15 table with a v16 note is acceptable,** because every criterion holds on both harnesses. But the reason given ("SPEC-HOLISTIC-2 v15 is the cited model") is stale. The spec is v16, and H14 (P ≥ 0.9) is a binding owner decision. Better: make the v16 run the table, keep v15 as the note, and update the header's "v15" references.
7. **`g-harris-3` and `g-harris-4` already render on V.** At key 0 they render G7, while `k-harrisline-3` and `b-harrisline-3` render C7.
   - Say this next to the "on V" rule, so a builder does not add `off: 7` (which would give D7 on the C row).
   - Also note that guitar dominant-rule material sits on V while piano and bass sit on the root. That is fine as coverage, and both are neutral.
8. **Two §1.5 wordings to tighten.**
   - Rule 1 says "all blues material" is declared neutral. Add "except the minor blues (`m-blues-ending`), which is minor", as the classifier does.
   - The modes from the root are "views of the row tonic's scale". They are parallel modes (C Dorian on the C-major row), as `laterRungs` builds them. Say "parallel-mode views".
9. **The `pminor` rows are a convention, not a key match.**
   - Lydian augmented, Mixolydian ♭6, Ionian ♯5 and Lydian ♯2 have a major 3rd but go to the minor rows.
   - That mirrors the major rows carrying the parallel Dorian / Phrygian / Locrian, so it is consistent.
   - State it as "parent-scale family" in §1.5 so the guard's "tonality matches its row" wording is not read literally.
10. **The bass walking T2 reason is only partly accurate.** "Minor ii–V walking starts at T4 … together with its major ii–V" is not quite right: the major ii–V approach drills (`b-walk-4` / `-5`) are at T2. The decision still stands, because the neutral blues walks below cover the minor rows. Reword the reason.
11. **Appendix B typos and collisions.**
    - "There are 108: of them:" needs fixing.
    - `scales-14` and `scales-33` show the bare option name `scale` in two columns (major vs chromatic or blues). Add the `scale` id.

## Checks passed

- **Classifier audit.**
  - The 136 "tonic chord dominant" moves are C7-only charts: dominant rules, important arpeggios, triplet / miscellaneous rules, the chromatic scale over C7, blues heads / comps / walks / turnarounds, and dominant tpairs.
  - The other major → neutral moves are dominant scales (whole-tone, H-W / W-H diminished, altered, bebop dominant, Lydian / Phrygian dominant, altered ♭♭7), `H_SCALES` 11–12, the chromatic scale, and 4th / 5th / octave interval shapes.
  - All are truly key-neutral. No minor-row content is lost: the only moves away from minor are the 7 minor → neutral (blues, W-H diminished, Maiden Voyage, `sf-borrow:1`), and those now sit on both rows.
  - The human decisions are each correct from the source: Tune Up in D, Stella in B♭, Night in Tunisia minor, How High the Moon major, `penta5` = `SCALES.pentaMinor` (bass.ts:1196), the `mv-next` 6-chords, `dc-lower`'s four dominants.
  - Every `BASS_STD` option classifies by its minor flag or by its final tonic chord.
- **Mode views.** These match keyIndex.ts:450–528: views keep their rows, the pick check passes, and `g-harm-1` follows its scales with options 9–12 excluded.
- **Offsets.** The standard-walk formula and the "on V" offsets are verified.
- **The other criteria hold as in round 11:**
  - curriculum flow and the Harris order;
  - 12 keys as coverage;
  - untimed first;
  - `max` only on rows 4 / 7 / 9 plus N15;
  - verified theory only (gated catalogue; `hl-outline:0` dropped);
  - no Claude-composed music;
  - US copyright (chord-only charts, titles, rule-generated lines);
  - vocal health (voice capped at T7, `v-top` coverage only, the range audit);
  - a complete §7 checklist;
  - no median transition ≥ 42 days on v15 or v16.
- **Owner decisions.** All three blocks are respected.

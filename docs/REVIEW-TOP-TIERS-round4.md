# Review of RESEARCH-TOP-TIERS.md v4, round 4 (2026-11-28)

**Verdict: NOT CLEAN.**

Every round-3 issue is fixed, and the counts and the bass harness figures reproduce. The new §1.5 rule is the right idea, but its guard is written so that it would sweep every Harris line rung into harmony. The rule is also not applied to six of the items the plan lists. Checking §1.5 against the Harris order also turned up two gaps in the piano Harris track. Finally, two code paths the re-band depends on are missing from the checklist.

What I checked:
- **Counts.** I re-ran `prop4.mjs --counts`; all 13 rows of the §4 table match. I re-ran the bass harness (60 runs, the report's seed); every §4.4 bass figure matches, including T5→T6 40.5 and T7→T8 34.5.
- **The §1.5 rule.** I applied it to every listed item, against its generator kind: `harmLadder.ts` steps, `genHarmGuitar` / `genHarmPiano` chordStep, `tpairDrills.ts`, `guitarJazz.ts`, `dimColours.ts`, `harrisLineDrills.ts` and the bass `genChord` kinds.
- **Seeds and grades.** The path-rating seeds (path.ts `KEYS_LEVEL_DIFF`, `HL_LEVEL_DIFF`) for every new piano line-jazz rung, and the guitar grades after `GUITAR_GRADE_UP`.
- **Code paths.** `verifiedContent.ts`, `keyIndex.ts` (`warmOf`, `laterRungs`, `openKeyRungs`), `realCatalogue.ts`, and the callers of `guitarLevelShown`.

---

## Rounds 1–3 status

| Item | Status |
|---|---|
| R3-1 bass Aeolian / natural minor counted twice | Fixed (§2.3 "one exercise, one cell"; scales 5 4 8 9 5 12 9 11 13) |
| R3-2 `g-harm-13` after the expressions | Fixed (T7, listed as an override) |
| R3-3 RSL Debut row | Fixed; `b-chord-14` labelled [E] |
| R3-4 style lock | Fixed in the text (but see minor note 1: the function has no callers) |
| R3-5 voicing vs arpeggio rule | Rule stated (§1.5), but the guard and its application are flawed (issues 1–2) |
| R3 minor 1–8 | All fixed. Bass bands: the gap is closed, but they now conflict with `tierOfNps` (issue 6) |
| Q12 gaps | Appendix A covers `voiceTop`, the cents band, the probe and the "rating-only" label |
| Rounds 1–2 (spot-checked) | Still fixed: Q8 0.63, `k-sharm-35` at T6, `g-harrisline-9` out, `b-walk-12` not a rung, "more keys" never a step, reading / rhythm logged |

---

## Substantive issues

### 1. The §1.5 guard's "`hl-*` kinds" also matches every Harris line kind
- **Evidence.**
  - §1.5 and §7 say every degree-sequence kind ("`hl-*` ladder steps, …") has no `max` and maps to harmony (bass: arpeggios / chord tones).
  - But `hl-` is also the prefix of every Harris line kind: harrisLineDrills.ts:73 `isHarrisLineKind = kind.startsWith('hl-')`. That covers `hl-chrom`, `hl-eight`, `hl-rules`, `hl-3b9`, `hl-abc`, `hl-walkties` and the rest.
- **What a literal build would do.** It moves into harmony (bass: arpeggios):
  - every `k-harrisline` rung (piano line-jazz T6–T7);
  - every `g-harrisline` rung;
  - `b-harrisline-1` / `3` / `4` / `6` / `7` / `10`, which belong in bass scales;
  - `b-harrisline-8`, which belongs in bass walking.
- **A second collision.** `g-harm-1` is kind `hl-line`, a scale played note by note. The plan gives it nps rungs 2–4 in guitar scales, but the guard forbids that.
- **Fix.** Name the steps: family `k-sharm` / `g-harm`, kind `hl-{3b,3t,ta,tb,7a,7b,d2,d3,d24,ti,c4,9a}`. `hl-line` is a scale. Key the rule on kind + option, not kind alone: `b-scale-6` `seq` option 0 (3rds) is a degree sequence, but option 1 (4ths) is a scale rung.

### 2. §1.5 is not applied to six listed items, and it has no line-jazz clause
| Item | Generator | Plan puts it in | §1.5 says |
|---|---|---|---|
| `k-dimcol-1` (piano line-jazz T5, existing rung) | `dc-lower`: struck chords (events.ts:166, skill "chords") | line-jazz | harmony T5 |
| m6dim `k-sharm-12` (opt 10, line-jazz T6) | `hl-7a` on the minor 6th-dim scale: a degree sequence | line-jazz | harmony T6 |
| `g-tpair-1` (line-jazz T6) | `gtp-shapes`: strummed shapes (`strum(x)`, quarters) | line-jazz | harmony T6 |
| `k-sharm-29` (harmony T8) | `sf-line` ×2, right hand, ♩60–120: a line | harmony | line-jazz T8, with `-27` / `-28`, which are the same kind |
| `g-harris-6` (harmony T8, "in context") | `brothers`: four dom7 (or m6) arpeggios in 8ths. One chord quality moved through keys, not context | harmony | not harmony. Line-jazz T8 (Harris language), or arpeggios |
| `g-harris-12` (T8), `k-sharm-32` (T8) | mixed kinds: `sf-line` lines plus `cm-expand` / `v7-d2` / `vl-ladder` voicings; `sf-minor` voicings and lines | harmony | split by kind (a `pick` per area, as `b-chord-6` is split), or state the exception |

- **The missing clause.** §1.5 covers harmony vs arpeggios only. Pivot arpeggios (`g-harris-8`, `b-barry-7`), the important arpeggios, triad-pair lines and `g-harris-6` are all broken single-quality arpeggios. Read literally, §1.5 row 3 sends them to arpeggios with nps rungs.
- **Fix.** Add a row: Harris and jazz line devices (blocks F / line families) go to line-jazz (bass: scales). They are tiered by content, with tempo as a sub-band (§1.4), even when they are arpeggiated. Then move the items in the table.
- **Recount.** All tiers stay at or above the floor:
  - piano line-jazz T5 3, T6 5, T8 9; piano harmony T5 9, T6 10, T8 9;
  - guitar line-jazz T6 6, T8 13; guitar harmony T6 19, T8 9.

### 3. The piano Harris track skips step 3 on the Harris scales
- **Evidence.**
  - BARRY-HARRIS-THEORY §6.3: the chord alternates with its diminished, "arpeggiated and block, then drop 2, drop 3 and drop 2&4" (drop 2 "the most useful"). Borrowing (§6.4) comes after.
  - Piano T6 places `k-sharm-35`, drop 2&4 on the four Harris scales, and `-19`, borrowing on the 6th-diminished scale.
  - No piano rung ever drills the 6th-diminished harmonisation itself:
    - the ladder picks only options 0 / 5 / 7 / 8 (and modes) of `k-sharm-14` / `16` / `18`, never the `H_HARRIS` options 9–12;
    - `harris-9` (6th-dim block chords, drop 2 / drop 3) and `harris-10` (minor 6th-dim block chords) are placed nowhere;
    - only the minor 6th-dim arpeggiated form exists (`k-sharm-12` opt 10).
  - Guitar has the step (`g-harris-2` drop 2 at T6, `g-harris-7` at T7, both before borrowing).
- **Fix.** Add these at piano harmony T6, in rung order, before `-35` and `-19`:
  - the 6th-dim arpeggiated, then block, drop 2 and drop 3;
  - use `harris-9` / `harris-10`, or the Harris options of `k-sharm-12` / `14` / `16` / `18` (all shown);
  - list them in the §4.1 override table.

### 4. Piano line-jazz: hard variants without their precursors, and overrides that are not listed
- **The precursors are missing.**
  - T7 places `k-harrisline-33` (the dominant rule: three, or two), `-12` (the major rule: three, and two from 2 and 4) and `-34` (two voices, every interval). T6 places `-19` (the chromatic scale in two voices).
  - Their precursors appear nowhere: `-3` (the dominant rule: one, or none), `-7` (the major rule from 1, 3, 5, 6), `-6` / `-11` / `-15` (Barry's chromatic scale itself), `-2` (the ABCs), `-4` / `-13` (the important arpeggios, into the scale).
  - All of them are shown (verifiedContent: `hl-abc`, `hl-chrom`, `hl-eight` switched on).
  - Guitar and bass do place their equivalents first (`g-harrisline-10` / `-1` / `-3` / `-4`; `b-harrisline-10` / `-1` at T6). This breaks the curriculum-flow rule.
- **The overrides are not listed.** §1.2 step 4 promises every override with its reason. Path-rating seeds (grade = ⌊(r − 700) / 90⌋) against the placements:

  | Level | Rating | Seed | Placed |
  |---|---|---|---|
  | `harris-25` | 1020 | T2 | T6 |
  | `harris-26` | 1100 | T3 | T6 |
  | `k-harrisline-19` | 1445 | T7 | T6 |
  | `-33` | 1330 | T6 | T7 |
  | `-12` | 1360 | T6 | T7 |
  | `-16` | 1410 | T6 | T7 |
  | `-34` | 1560 | T8 | T7 |
  | `harris-22` | 1560 | T8 | T7 |
- **Fix.**
  - Add `-2`, `-6` / `-11` / `-15`, `-3`, `-7`, `-4` at T5–T6, ahead of `-19` / `-33` / `-12` in rung order.
  - Add a piano line-jazz override table: the Harris order, scales → rules → devices.

### 5. The re-band misses two code paths, so beginners would get above-tier content
- **`warmOf` (keyIndex.ts:331).** The warm-up is the first take of every session, and the cell's cold check (§5.2). Its tier thresholds are the old ladder's:
  - **Guitar major.** A T1 beginner warms up on `g-scales-4` (grade 4 → T3), and T2–T3 on `g-scales-5` (T4). This contradicts Q9 (pentatonics first).
  - **Guitar minor.** T0–T3 warms up on harmonic minor `g-scales-13` (T4).
  - **Bass major.** T2–T5 warms up on `b-fret-5`, major in two octaves (the plan's T6).
  - **Bass minor.** T0–T3 warms up on harmonic minor `b-scale-7` (RSL G5, T4).
  - The warm id is also dropped from the rungs (`r.id !== w.id`). So, for example, guitar T6+ loses `g-scales-9` as a rung.
- **The later-rung mins (keyIndex.ts:303–307, 461).** `MELODIC_FROM_TIER` 4, `MODES_FROM_TIER` 4 and the `MODES` mins (Phrygian / Locrian at D + 1 = 5) are shared by all three instruments. The plan needs these guitar / bass mins:
  - Dorian / Mixolydian T5;
  - Lydian / Phrygian / melodic minor T6;
  - Locrian T7.

  Piano keeps today's values.
- **Fix.** Add both to §7 "Ladders":
  - a per-instrument `warmOf` on the new tiers (guitar: minor pentatonic / pentatonic + blues T1–T2, then `g-scales-4` T3, `-5` T4 …; bass: `b-scale-2` T0–T5 and `b-fret-5` T6+; minor rows: natural minor T1–T3, harmonic minor T4–T5);
  - per-instrument later-rung mins.

### 6. The bass tolerance bands contradict `tierOfNps`
- **The conflict.**
  - §1.4: bass T7 band ♩100–119 (3.33–3.97 n/s), T8 ≥ ♩120.
  - §2.3 `tierOfNps` (bass, "used only for tolerance"): < 3.7 → T5, else T8. So ♩111–119 is T8 tolerance in one place and T7 in the other.
  - Both claim to set only the tolerance tier, so a builder cannot satisfy both.
- **Fix.** Bass has no G6–G8 tempo step, so make one table the source:
  - T5–T7 share ♩100–110, and T8 is ≥ ♩111 (the 3.67 midpoint);
  - or move the `tierOfNps` cut to 4.0.

  Restate `b-barry-6`'s ♩120 start under the result.

---

## Minor notes
1. **`guitarLevelShown` has no callers.** `git grep` finds only its definition. ladderFacts.ts already says the path "no longer reads it (every family is open)". §1.3 says it "today hides" levels; say instead that it is dead code to delete. `guitarStyleMatch` is also unused.
2. **"Area only" is counted inconsistently.** `k-sharm-42` is left out of the piano harmony T8 count. But `k-bebop-9` (piano line-jazz T8) and `b-walk-18` (bass walking T8) are counted. Define the term and count it one way. Excluding all three gives piano line-jazz T8 7 (8 after issue 2) and bass walking T8 2 (the floor).
3. **N15 vs `advanced-3`.** `advanced-3` already holds chromatic octaves (hands separate) at T7. Say that N15 is hands together, since v14 counts only the hands-together main item. Or fold `advanced-3`'s chromatic items into N15.
4. **Bass arpeggios T1.** `b-chord-17` (1-2-3-5 cells through the scale) sits at T1 [E], below the dom7 arpeggio (T2). The same material is piano T3 and guitar T4. `b-chord-5` (inversions) at T1 has no RSL grade and is not marked [E]. Consider keeping `b-chord-17` at its ladder T3. T1 then holds 2 (the floor), which v14 allows.
5. **Guitar T2 bench 2.0** blends ABRSM G2 1.87 and G3 2.2. Mark it [E], as the bass T2 1.4 is.
6. **`k-sharm-33` shows only `cm-expand`.** `item:cm-elevator` is hidden (`echols-elevator-melody`). Add `-33` (and `g-harris-12`'s `cm-elevator:0`) to the §7 "shown parts" list, and add "the elevator under a melody" to §8 "Not in the plan".
7. **`k-sharm-23` / `g-harm-12` at T8 "in context".** Four of their seven items are borrowing while walking the scale: pure step 4, after the expressions. The ii–V–I and turnaround items fit step 6. Split them by `pick`, or note the exception.
8. **`g-arps-5`'s ii–V–I option** is a three-chord arpeggio sequence. It fits neither §1.5 row 2 nor row 3 as worded. Allow "arpeggios through a progression" in row 3, or split the option.
9. **`styleRungTier` caps style rungs at T5** (keyIndex.ts:268). Say whether block H stays capped once T6–T8 exist.

## Checks passed
- **Counts and harness:** §3, §4 and the bass §4.4 / §5.2 figures reproduce on this branch.
- **Guitar grade → T:** every cell in §4.2, including the overrides (`g-scales-3`, `g-fretting-1`, `g-harm-13`) and `GUITAR_GRADE_UP` (`g-harm-13` 10, `g-harrisline-7` 9, `g-harris-11` / `12` / `13` 10).
- **Tempo arithmetic:**
  - guitar bench, bounds and SPEED from ABRSM quavers;
  - piano arpeggio targets (T7 4.6, T8 5.46) and octave targets (T7 3.72, T8 4.41);
  - the piano and guitar §1.4 bands, which match the bounds.
- **Only verified theory:** apart from minor note 6, no hidden item is counted (`el-borrow`, `vl-ladder` thirds / triads, `hl-arps-down`, `hl-feel6`, `hl-outline:0`, `hl-compose`, `hl-5432` stay out).
- **No Claude-composed music. US copyright:** charts only; heads stay coverage only.
- **Vocal health:** `v-top` is coverage only, and no moved voice level is a range extreme.
- **Rubato first. 12 keys as coverage. No tempo steps** in walking, voicings or Ear.
- **The checklist:** openers, unit openers, skill map, level test (with voice and drum probes), guards, glyphs, badges and i18n are present. The only gaps are issue 5's.

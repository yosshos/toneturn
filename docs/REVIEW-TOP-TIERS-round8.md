# Review of RESEARCH-TOP-TIERS.md v8, round 8 (2026-11-28)

**Verdict: NOT CLEAN.**

All three round-7 issues and all eight round-7 minor notes are fixed. The guard matches the code and §1.5. Every harness figure in §4, §4.4 and §5 reproduces exactly on today's code (v15). Two new problems remain, both in the newly placed bass Harris track, and both are text fixes:
1. `b-barry-2` is a quarter-note walk, but it is classed as line-jazz and placed in bass scales;
2. bass puts the pivot devices (T6) before the rules from every degree, the important arpeggios and the major / minor rules (T7). That reverses the plan's own order (scales → rules → devices), which piano and guitar follow. It also leaves one override unlisted.

What I checked:
- **The guard.** I re-bundled `guard2.ts` against today's tree (f927dcd1) and ran it: 45 families, 2,533 specs, 0 unlisted, 13 mixed levels. These are exactly the 5 plan splits plus the 8 "not rungs" splits in §1.5. The guard's table equals §1.5 row by row: `h7-line` is on the coverage row, and the option rules are in place.
- **The harness.** I re-bundled `prop8.ts` and ran it (60 runs, the report's seed) on piano, guitar, bass and bass-now. Every count, first-rank figure, transition and median in §4, §4.4 and §5.1–5.2 matches to the half-day. There are 0 stalls, every tier is reached, and the largest median transition is 37 days (guitar independence T5→T6), so none reaches 42.
- **Seeds.** I checked the bass overrides against `B_HL_RATING` (harrisLineDrills.ts:848), `BTP_ROWS` (tpairDrills.ts:621) and the §1.2 step-3 formula.
- **Generators.** I read the generators behind the new bass placements: `genBarry` (bassNiche.ts:632–744), `scalePivotLine` (pivotArp.ts:110–131), `B_ROWS`, `brothers` (guitarJazz.ts:512) and `h16-chains`.

---

## Round-7 status

| Item | Status |
|---|---|
| R7-1 `harris-8` | Fixed. It is described as two dominants a bar (generate.ts:1863–1876) and is a "not a rung" entry (the dense form, which duplicates `-35`). Line-jazz T5 holds 12, as stated |
| R7-2 bass Harris order and overrides | Partly fixed. `b-harrisline-10` is at T5, the T5 / T6 rung order is stated, and there is an override table with one shared reason. However, `b-harrisline-4` is missing from the table, and the T6 / T7 order has the inversion described in issue 2 |
| R7-3 N15 `max` | Fixed with option (a). Row 10 names N15 as the only octave exception, the guard clause names it too, and prop8 models it as `['N15', 7, 8]`. **Judged sound.** RCM grades octaves by tempo, the targets come from the decided 0.63 factor (T7 3.72 = 16ths ♩56; T8 4.41 = ♩66; RCM L9 ♩60 → 6.35 → T7, L10 ♩80 → T8, all arithmetically right), and independence is not one of the fixed-tempo areas. `advanced-3` stays a single T7 rung with a target, with its chromatic items folded into N15 |
| R7 minor 1 `harris-16` | Fixed. Placed at T8 (seed 1680), described as `h16-chains`, one dominant a bar |
| R7 minor 2 `harris-7` | Fixed. `h7-line` is on the coverage row |
| R7 minor 3 row picks | Fixed for piano (§4.1 "Rows") and guitar (§4.2). Not stated for bass (minor note 2) |
| R7 minor 4 guitar pivot order | Fixed. `g-harris-8` → `-9` → `-4` is in §1.5 and §4.2 |
| R7 minor 5 dispositions | Fixed. `k-tpair-6`–`-16` are in "Not rungs"; `b-barry-2` and `b-harrisline-2` are placed. `b-barry-2`'s area is wrong (issue 1) |
| R7 minor 6 `g-harm-1` modes | Fixed. Options 1 and 4 from T5, 2 and 3 from T6, 6 from T7, never 9–12 |
| R7 minor 7 v15 figures | Fixed. They are the v15 figures, which I reproduced; v15 is cited throughout. The piano independence fill (`k-indep-4`, `fingers-8` at T4; `k-indep-8`, `fingers-10` at T6) brings T3→T4 down from 46 to 31 days |
| R7 minor 8 "§8.8" | Fixed. It now reads "SPEC-HOLISTIC-2 §8.8" |

---

## Substantive issues

### 1. `b-barry-2` ("dim as a passing chord") is a walking exercise, but it is classed as line-jazz in bass scales

**Evidence.**
- bassNiche.ts:1130 builds the level with `BH('dimpass', { perBeat: 1 })`.
- The generator (bassNiche.ts:672–679) plays `ctWalk(tu, cs)`: quarter notes, R – chord tone – chord tone – approach per bar (bassNiche.ts:291–304), over I – ♯I° – ii – V. It grades with `rulesFor(cs, 'walk')` over a swing groove.
- That is the same drill type as `walk13` (`b-barry-4`), which §1.5 row 1 puts in walking.
- §1.5's own rule is "a rung's area follows what is drilled". Yet row 5 lists `dimpass` under `b-barry` as line-jazz, and §4.3 places `b-barry-2` in bass scales T6.
- A builder following the table would put a quarter-note walk in the scales area. Its takes would count toward the scales rank, and the walking rank would never see it.

**Fix.**
- Move `dimpass` from row 5 to row 1 (`b-barry`: `walk13`, `dimpass`).
- Place `b-barry-2` in bass walking. T6 fits: next to `b-cadlib-2` / `-4` (approaches over substitutes) and after `b-barry-4` (T5). Its seed is 1591 → T8, so list it as a walking override with that reason.
- Counts: bass scales T6 goes from 9 to 8 (10 with issue 2's fix), and walking T6 from 4 to 5.
- My re-run with issues 1 and 2 both applied:
  - scales 5 4 8 9 5 13 10 10 13, median 22, T5→T6 31;
  - walking 3 3 4 3 4 4 5 5 3, median 25, T7→T8 36;
  - 0 stalls, every tier reached.

### 2. Bass Harris track: the pivot devices come before the rules, against the plan's own order

**Evidence.**
- §4.1 states the line order "scales → rules → devices, simple before hard". Piano and guitar both follow it:

  | Material | Piano | Guitar |
  |---|---|---|
  | Important arpeggios, dominant rule | `k-harrisline-4` / `-3` / `-33`, T5–T6 | `g-harrisline-3`, T6 |
  | Major / minor rules | `-7` / `-12` / `-16`, T5–T6 | `g-harrisline-4`, T6 |
  | Pivot arpeggio | `harris-19`, T7 | `g-harris-8`, T7 |
  | Scale with a pivot inside | `harris-23`, T8 | `g-harris-9`, T7 |

- Bass reverses this:
  - **T6:** `b-barry-7` (the pivot arpeggio) and `b-barry-8` (the scale with a pivot inside);
  - **T7:** `b-harrisline-3` (the dominant rule from every degree, the three important arpeggios, into the scale) and `b-harrisline-4` (the major and minor rules from every degree).
- This is a real precursor problem, not only a matter of symmetry. `b-barry-8` option 0 is the 6 chord, and it runs "the scale down by the half-step rules with a pivot inside" (bassNiche.ts:684–689). The descent uses the major rule's 6–5 extra note ("C B A A♭ | G …", pivotArp.ts:118). So the T6 pivot drill applies the major rule, which bass first teaches at T7 (`b-harrisline-4`).
- The stated reason for `b-harrisline-3`'s placement, "scales T7 (after the ABCs and the half-step rules)", does not support T7. Both prerequisites are at T5, so T6 already satisfies it.
- **Unlisted override.** `b-harrisline-4` rates 1380 (`B_HL_RATING[3]`), which is grade 7 → **T6**. It is placed at T7, and the table does not list it. §4.3 says the remaining levels "equal the track tier above", which is false for `-4`. (The other bass seeds in the table check out: `-1` 1330 → T6, `-6` 1460 → T7, `b-tpair-5` 1720 → T8.)

**Fix.**
- Move `b-harrisline-3` and `-4` to bass scales T6, placed ahead of `b-barry-7` / `-8` in rung order.
  - `-4` then equals its seed (T6).
  - List `-3` as an override, seed T5 → T6, with the reason "after the ABCs and the half-step rules (T5)".
- State the bass T6 rung order: the chromatic scale `b-harrisline-1` → `-3` (the dominant rule from every degree, the important arpeggios) → `-4` (the major / minor rules) → `b-barry-7` (the pivot arpeggio) → `-8` (the scale with a pivot); `b-tpair-2` may go anywhere.
- Add this to the §1.5 "order within a tier" list.
- Counts with issue 1: bass scales T6 9 → 10 and T7 12 → 10. Both stay ≥ 3, and the harness is clean (figures under issue 1).

---

## Minor notes

1. **The §4.3 sentence "The remaining bass Harris levels (…) equal the track tier above"** is ambiguous. It is meant as "equal their seeds". Write that and list the seeds (`-1` T6, `-6` T7, `b-tpair-5` T8, `b-hlfast` new). This becomes true once `-4` moves (issue 2).
2. **Bass row picks for the Harris items.** These levels carry minor options:
   - `b-barry-1` option 1 (the minor 6th-dim scale);
   - `b-harrisline-1` option 2 (the minor 6th-dim chromatic scale);
   - `b-harrisline-4` (the minor rules: `hl-rules` options 8, 9, 14);
   - `b-barry-2` option 1, `b-barry-4` option 1.

   State major / minor / both per bass Harris rung, as §4.1 now does for piano. Otherwise every bass Harris rung defaults to major rows.
3. **Independence row picks.** Today most piano independence rungs are major-row only (keyIndex.ts:570–581, `minor ? [] : …`). Minor rows have their own set (`k-indep-9`–`12`, `advanced-9`, `k-keyx-6` / `7`), with nothing at T4 or T6. State the rows for the new independence rungs: the T4 / T6 fills, `advanced-3` / `-6` / `-8`, `fingers-13`, SP 37, N15 and the T8 items. Otherwise minor-row sessions get no independence content above T5.
4. **Pivot tier differs across instruments.** The scale with a pivot inside is at bass T6, guitar T7 and piano T8 (`harris-23`, seed T8). This is acceptable under Q2 (each instrument by its own standards). Note it as intended next to the guitar Harris-track note in §4.2, so a flow audit does not "fix" it.
5. **`g-harris-6`** ("the brothers' arpeggios", guitar T8) gives each brother R-3-5-♭7-5-3-R, about 3½ beats each (guitarJazz.ts:512–527). That is close to the owner's one-a-bar form, unlike piano's `harris-8`. T8 is fine. The parenthesis "the brothers' arpeggios" could add "one brother per bar, from one diminished chord", so it is not mistaken for the dense form kept out on piano.

## Checks passed

- **Counts.** All §4 counts equal `prop8.ts`. Piano line-jazz is 12 / 13 / 12 / 23, harmony T5–T8 is 10 / 14 / 17 / 12, and independence T7 / T8 is 6 / 3 (N15 counted at both tiers).
- **Harness (v15).** Every §4 / §4.4 / §5 figure reproduces. The largest transition is 37 days, below the 42-day line. Today's bass walking gives 240 days (40 % reached) with 2 stalls (worst 47 days), as stated.
- **N15 exception.** It is sound (see the round-7 table), and the guard text and §1.5 agree.
- **Only verified theory.**
  - Hidden items stay out (`b-harrisline-5` / `-9`, the blues outline, `hl-feel6`, `hl-arps-down`).
  - `k-harrisline-35` (two a bar) is owner-approved.
  - `harris-5` is kept out with the pivot term respected.
  - Fm6 / Bm6 appear only at T8.
- **Rubato first; no tempo gating** on voicings, walking or fixed-tempo areas. Twelve keys count as coverage only.
- **No Claude-composed music; US copyright.** The new items are rule-generated, cards or chord charts.
- **Vocal health.** Voice is capped at T7 (Q12 binding), `v-top` is coverage only, and Appendix A is not to be built.
- **The checklist.** It is complete, apart from the §1.5 row-1 / row-5 move and the bass rung order that issues 1 and 2 require, and the row picks in minor notes 2 and 3.

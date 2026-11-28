# Review of RESEARCH-TOP-TIERS.md v9, round 9 (2026-11-28)

**Verdict: NOT CLEAN.** One substantive issue remains, and it is a text fix: the new bass row-pick list (§4.3, "Rows for the bass Harris rungs") puts three **major** options on the minor rows. The list was copied from the round-8 minor note 2, and that note itself named these options wrongly. Everything else checks out. Both round-8 issues are fixed, as are minor notes 1 and 3–5. The guard matches §1.5, and every harness figure reproduces on today's code (v15).

What I checked:
- **The guard.** I re-bundled `guard2.ts` against today's tree (cc8bcdc9) and ran it: 45 families, 2,533 specs, 0 unlisted, 13 mixed levels. These are exactly the 5 plan splits and the 8 "not rungs" splits in §1.5. `dimpass` is now on the walking row in both the guard and the §1.5 table.
- **The harness.** I re-bundled `prop9.ts` and ran it (60 runs, the report's seed) on bass, bass-now, guitar and piano.
  - My bass output is byte-identical to the author's `out9-bass.txt`.
  - Every guitar and piano count, first-rank figure, transition and median in §4, §4.4 and §5 matches.
  - There are 0 stalls on every proposed area, and every tier is reached.
  - The largest median transition is 37 days (guitar independence T5→T6), so none reaches 42.
  - Today's bass walking still gives 240 days (40 % reached) and 2 stalls (worst 47 days), as §5.1 states.
- **The source code** behind the bass row picks: `genBarry` (bassNiche.ts:634–744), `PROGS` (bass.ts:202–207), `B_ROWS` and `RULE_OPTS` (harrisLineDrills.ts:78–84, :835–848), and `verifiedContent.ts` `SWITCHED_ON`.

---

## Round-8 status

| Item | Status |
|---|---|
| R8-1 `b-barry-2` | Fixed. `dimpass` is on §1.5 row 1. `b-barry-2` is in bass walking T6, with the walking override (1591 → T8, placed T6). Counts: walking T6 is 5 and scales T6 is 10 |
| R8-2 bass order | Fixed. `b-harrisline-3` and `-4` are in scales T6. The rung order `-1` → `-3` → `-4` → `b-barry-7` → `-8` is in §1.5 and §4.3, marked "rules before devices". `-3` is an override (1280 → T5, placed T6, with the reason). `-4` equals its seed (1380 → T6) |
| R8 minor 1 "equal the track tier" | Fixed. The text now reads "equal their seeds" and lists them. I checked them against the §1.2 formula: `-1` T6, `-4` T6, `-6` T7, `b-tpair-5` T8 |
| R8 minor 2 bass row picks | Added, but **three of its entries are wrong** (issue 1) |
| R8 minor 3 independence rows | Fixed (§4.1 "Rows"). Minor rows now get `fingers-8` at T4, `fingers-10` at T6, and T7–T8 content |
| R8 minor 4 pivot tier | Fixed. The note in §4.2 says the difference is intended under Q2 |
| R8 minor 5 `g-harris-6` | Fixed. The text now reads "one brother per bar … not the dense two-a-bar form" |

---

## Substantive issue

### 1. The bass row picks put major options on the minor rows

§4.3 lists these entries for the minor rows. The code shows three of them are major:

| Plan entry (minor rows) | What the code generates | Correct row |
|---|---|---|
| `b-barry-2` option 1 | `dimpass` op 1 is **IV – ♯IV° – I/5 – V** with a maj7 IV (bassNiche.ts:672–676). This is a major-key passing diminished | major |
| `b-barry-4` option 1 | `walk13` op 1 walks `PROGS.jazz` = **Imaj7 – vi7 – ii7 – V7** (bassNiche.ts:723; bass.ts:207). This is major | major |
| `b-harrisline-4` option 8 | `RULE_OPTS[8]` = `['maj', 5, 2]`, **the major rule, two half steps from 4** (harrisLineDrills.ts:81–82). Only options 9 and 14 are minor (`['min', 0, 1]`, `['min', 5, 2]`) | major |
| `b-barry-1` option 1, `b-harrisline-1` option 2 | the minor 6th-dim scale and the minor 6th-dim chromatic scale | minor (correct) |

**Why this matters.** A builder who follows the list will render the major progressions in a minor-row session. For example, in A minor the drill plays Dmaj7 – D♯°7 – A/E – E7. The minor-rule rung would also carry a major-rule line. This is a factual error in tonality, not a missing detail. (The round-8 minor note proposed these option numbers, and I am correcting that note here.)

**Fix.** In §4.3, "Rows for the bass Harris rungs":
- **minor rows:** `b-barry-1` option 1, `b-harrisline-1` option 2, `b-harrisline-4` options 9 and 14 (the minor rule from 1, and two from 4);
- **major rows:** every other option, including `b-harrisline-4` options 0, 4 and 8, and `b-barry-2` / `-4` options 0 and 1 (each option is a major-key walk);
- **both rows:** `b-tpair-3` / `-4` (unchanged).

The consequence is that bass minor-row walking gets no Harris walking rung. Its minor content at T4–T5 comes from `m:b-cadlib-1` / `-3`. The counts in §4 do not change, because `prop9` counts each rung once.

---

## Minor notes

1. **The miscellaneous rule's tier differs across instruments.** `b-harrisline-7` (bass T7) bundles `hl-misc` with the triplet rules. Piano puts the miscellaneous rule alone at T8 (`k-harrisline-28`). Under Q2 this is acceptable, but add it to the §4.2 note on tier differences that are intended ("the scale with a pivot inside …"), so a flow audit does not "fix" it.
2. **The guitar row note** says "`g-harrisline-4`'s minor rule". Name the options as §4.3 will: 9 and 13. `g-harrisline-4` holds `hl-rules` 1, 4, 7, 9 and 13 (harrisLineDrills.ts:756), and 7 is the major rule from 2. Likewise "`g-harris-1`'s minor 6th-dim option" means options 2 and 3 (guitarJazz.ts:379).
3. **`b-barry-5`** ("Pivots: break the line", bass T7) is the octave break inside a descending dominant line. BARRY-HARRIS-THEORY.md:121 calls that "a scale line with a pivot", so the item is verified theory. It is not a second pivot arpeggio. One clause in §4.3 would save a theory audit from questioning it.

## Checks passed

- **Counts and harness (v15).** They reproduce exactly, as listed above. The figures in §4, §4.4 and §5 stand.
- **Seeds.** Every bass override and seed matches `B_HL_RATING` and the §1.2 step-3 formula.
- **Only verified theory.**
  - The hidden items stay out: `b-harrisline-5` and `-9`, `hl-outline:0` (the blues outline), `hl-feel6`, `hl-arps-down`, `cm-elevator` and `el-borrow`.
  - `hl-eight`, `hl-sevendown`, `hl-3b9`, `hl-abc` and the tune outlines are switched on (`SWITCHED_ON`).
- **Pedagogy.**
  - Rubato comes first, then a tempo ladder.
  - Walking, voicings and the fixed-tempo areas have no tempo gating. N15 is the only octave exception, stated in both the guard and §1.5.
  - Twelve keys count as coverage only.
  - The bass order is scales → rules → devices.
- **No Claude-composed music; US copyright.** The plan uses only rule-generated items, cards and chord charts.
- **Vocal health.** Voice is capped at T7 (Q12). `v-top` is coverage only, and Appendix A is not to be built.
- **The checklist (§7)** is complete. Only the row-pick correction in issue 1 is needed.

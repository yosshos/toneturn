# Review of RESEARCH-TOP-TIERS.md v7, round 7 (2026-11-28)

**Verdict: NOT CLEAN.**

Both round-6 issues and all six round-6 minor notes are fixed. The strict guard matches the code and §1.5. Three new problems remain that a builder would carry into code. All three are text fixes of the same kind that blocked rounds 5 and 6 (order inside a line track, and a table rule that a placed rung breaks):
1. `harris-8` is described wrongly, and its dense form is placed before the simple form;
2. the bass Harris track puts the ABCs after the half-step rules, and its overrides are not listed;
3. N15 is given tempo-tier rungs in independence, but §1.5 row 10 says independence has none.

What I checked:
- **The guard.** I re-bundled and ran `guard2.ts`: 45 families, 2,533 specs, 0 unlisted, 13 mixed levels. These are exactly the 5 plan splits plus the 8 "not rungs" splits in §1.5.
- **Guard vs §1.5.** I dumped every distinct kind of every family from `catalog()` / `guitarCatalog()` and checked each against the backticked tokens in §1.5. Every kind is named; the only differences are abbreviations (`>hl-chrom`, `-64`). The guard's table and §1.5 agree row by row, including the option rules (`sf-minor` 0/1, `scales` `scale` values, `k-modes` 7, `g-scales` 24, `b-scale` 27 and `seq` 0/1).
- **Seeds.** I computed `stepCatalogue()` ratings for `harris`, `k-bebop`, `k-harrisline`, `k-tpair`, `k-dimcol`, `b-barry`, `b-harrisline`, `b-tpair` and `b-walk`, and checked every §4.1 seed claim and override.
- **Generators.** I read the generators behind the new line-jazz placements (`h8-brothers`, `h16-chains`, `hl-3b9`, `h5-pivots`, `triads-3to9`, bass `pivot` / `halfstep`).
- **The harness.** I re-ran `prop7.ts` (60 runs, the report's seed) on today's code, which is the v15 harness. Results are below.

---

## Round-6 status

| Item | Status |
|---|---|
| R6-1 piano line-jazz precursors and disposition | Fixed. `harris-6` is at T5 (override listed). The `k-bebop` ladder is placed: `-1`/`-2` raised to T5, `-3` T5, `-4`/`-5` T6, `-6` T7, `-7` T7 (override, precursor of comping while soloing), `-9` T8. These match the seeds (1120 / 1190 / 1260 / 1330 / 1400 / 1470 / 1540 / 1680). The rung order is stated in §1.5. The "Not rungs" table covers every shown `harris` / `k-bebop` / `k-harrisline` level |
| R6-2 `g-harm-1` row rule | Fixed. §4.2 notes give option 0 at T2, options 5 and 7 from T4, option 8 from T6, and never 9–12. The guard clause is in §1.5 and §7 |
| R6 minor 1 (`scales-31` / `harris-25`) | Fixed: one cell |
| R6 minor 2 (`optIs(8)`) | Fixed. `b-scale-1` option 8 is the minor pentatonic (bass.ts:1144) |
| R6 minor 3 (`b-scale-12` [E]) | Fixed |
| R6 minor 4 ("closed") | Fixed. The table is closed literally, with chart cadence ids as the one exception, and the guard implements exactly that |
| R6 minor 5 (odd assignments) | Fixed. `h3`/`h4`/`h5` are now harmony (row 6); `g-picking` sweeps and `g-legato` `tap-arp` are arpeggios (row 7); `control` lists all six kinds |
| R6 minor 6 (`harris-5`) | Fixed. It is kept out, with a rename suggested |

## The new tables

- **"Not rungs".** Each of the 13 `harris` and 2 `k-bebop` entries has a reason. The kinds confirm them: `harris-25` / `-26` are `h1-linear` options 1 and 2–3; `harris-12` mixes `h2`/`h3`/`h5`/`h6`. Two reasons need correcting (minor notes 1 and 2).
- **The `k-bebop` ladder flows:**
  - ii–V–I, minor, altered (T5);
  - blues, rhythm changes (T6);
  - standards, both hands (T7);
  - whole forms, then comping while soloing (T8).

  `k-modes-3` (the bebop dominant) comes before `k-bebop-1` inside T5. The LH rootless cells that comping while soloing needs are on the harmony ladder already (`k-cadlib-6`, T4).

---

## Substantive issues

### 1. `harris-8` is the dense form of the brothers line, placed before the simple form

**Evidence.**
- §4.1 T5 describes `harris-8` as "the brothers (dominants a minor 3rd apart, one per bar)".
- The generator gives each brother **two beats**: `beat: g * 2 + i / 2` (generate.ts:1863–1876). That is four dominants in two bars, a 3-5-7-9 arpeggio on each.
- So the plan has the two-a-bar form at T5 (`harris-8`), then the one-a-bar form at T7 (`k-harrisline-20`, `hl-3b9` ops 0–1, "one dominant per bar", harrisLineDrills.ts:388), then the two-a-bar form again at T8 (`k-harrisline-35`).
- The owner's order is "one a bar first, two at the advanced levels" (harrisLineDrills.ts:643). The plan breaks that order and "simple before hard", and its description contradicts the code.

**Fix.**
- Correct the description to "two dominants a bar, 3-to-9".
- Then either move `harris-8` to line-jazz T8 next to `-35` (an override, seed 1240 → T5 raised to T8; reason: the owner's one-a-bar-first order), or make it a "not a rung" entry (the dense form of the same family line as `-35`).
- T5 goes from 13 to 12 (still ≥ 3), and T8 from 20 to 21 or stays at 20.

### 2. Bass Harris track: the ABCs come after the half-step rules, and the overrides are unlisted

**Evidence.**
- §4.3 bass scales has `b-barry-3` "Half-step rules: chord tones on the beats" at T5, but `b-harrisline-10` "The ABCs: note by note, then in 3rds" at T6.
- Piano and guitar both put the ABCs first, with the scale step and before the rules: piano `k-harrisline-2` T5, rules T5–T6; guitar `g-harrisline-10` T5, rules T6.
- BARRY-HARRIS-THEORY §11 defines the ABCs as scale preparation. This is the "precursor after its successor" pattern again.
- §1.2 step 4 requires every override to be listed with its reason. The bass Harris placements depart from their seeds in both directions, and none is listed:

  | Level | Rating | Seed | Placed |
  |---|---|---|---|
  | `b-barry-1` | 1540 | T8 | T5 |
  | `b-barry-3` | 1643 | T8 | T5 |
  | `b-barry-7` | 1849 | T8 | T6 |
  | `b-barry-8` | 1900 | T8 | T6 |
  | `b-barry-5` | 1746 | T8 | T7 |
  | `b-barry-6` | 1797 | T8 | T7 |
  | `b-tpair-1` | 1400 | T6 | T5 |
  | `b-tpair-2` | 1460 | T7 | T6 |
  | `b-tpair-3` | 1580 | T8 | T7 |
  | `b-tpair-4` | 1640 | T8 | T7 |
  | `b-harrisline-10` | 1150 | T4 | T6 |
  | `b-harrisline-3` | 1280 | T5 | T7 |
  | `b-harrisline-7` | 1520 | T8 | T7 |
  | `b-barry-4` (walking) | 1694 | T8 | T5 |
  | `b-harrisline-8` (walking) | 1380 | T6 | T4 |

**Fix.**
- Move `b-harrisline-10` to bass scales T5, ahead of `b-barry-3` in rung order (an override, seed T4 → T5, track start, as for `k-harrisline-2`). T5 goes from 12 to 13 and T6 from 9 to 8.
- State the bass rung order: the 6th-dim scale → ABCs → half-step rules (T5); the pivot arpeggio `b-barry-7` before the scale with a pivot `b-barry-8` (T6).
- Add a bass Harris override table. One shared reason is enough if it is true: B_LEVEL_DIFF ratings are not on the piano scale, so the bass Harris track is placed by the Harris order against the bass Harris-scale tier (T5, from §1.5's line rule). Name each level.

### 3. N15 has tempo-tier rungs in a "no tempo rungs" area

**Evidence.**
- §4.1 independence places N15 (the chromatic scale in octaves, HT) as a "T7 rung (target 16ths ♩56)" and a "T8 rung (target 16ths ♩66)". The content is the same and only the tempo differs, so that is a tier step by tempo.
- The scratch catalogue models it as one rung with a max (`['N15', 7, 8]`).
- §1.5 row 10 (independence) says "Tempo rungs: no". The guard fails on "a `max` outside rows 4, 7 and 9", so a builder who follows prop7 breaks the guard. A builder who follows the table has no T8 N15.

**Fix.** Choose one:
- (a) Allow `max` on row 10 for the octave items only. Name N15 (and `advanced-3` if it gains a span), and add it to the guard's allowed-`max` list. The octave factor (§2.5) already gives the targets, and RCM grades octaves by tempo, so this is the honest reading.
- (b) Move N15 to piano scales (row 9). Piano independence T8 then drops to 2, which is the floor, so add a T8 content step if you choose this.

---

## Minor notes

1. **`harris-16`'s reason is wrong.** "Held back: it must give each dominant its own bar" does not match the code. `h16-chains` already gives each dominant a bar (`b0 = i * 4`, generate.ts:3881–3890). That is the owner-approved one-a-bar form (BARRY-HARRIS-THEORY §9). Either place it at line-jazz T8 (seed 1680 = T8), or give a true reason (for example, overlap with `k-harrisline-20`).
2. **`harris-7` is "coverage" in the table but line-jazz in §1.5.** Row 5 lists `h7-line` as line-jazz. If a lick is coverage, move `h7-line` to the coverage row (it has no other users).
3. **Row picks for line-jazz rungs.** Today every piano line-jazz rung is major-rows only (keyIndex.ts:607–616), except `scales-31` (minor). §4.1 line-jazz gives no row rule. `k-bebop-2` (minor ii–V–i), `k-harrisline-16` (the minor rule) and `harris-18` (the important minor) belong on minor rows. Without a rule, minor-row key sessions get no line-jazz below T6. State major / minor / both per rung, as §4.1 harmony does. The guitar line-jazz table needs the same.
4. **Pivot order on guitar.** Guitar T7 holds `g-harris-8` (the pivot arpeggio), `-9` (the scale with a pivot inside) and `-4` (option 2: the dominant line with a pivot). Add them to the §1.5 "order within a tier" list: `-8` first.
5. **Other unplaced line levels have no disposition.**
   - Piano: `k-tpair-6`–`-16` (the hexatonic scale, pair lines through ii–V–I, side-slip, symmetric pairs). Guitar places `g-tpair-6` / `-7` and bass places `b-tpair-5` at T8.
   - Bass: `b-barry-2` (dim as a passing chord) and `b-harrisline-2` (outlines). Bass has no outline anywhere, unlike piano and guitar.
   - Add them to the "Not rungs" table or place them. Nothing blocks: every tier is above the floor.
6. **`g-harm-1`'s mode options.** It carries options 1–4 and 6 too (Dorian, Phrygian, Lydian, Mixolydian, Locrian; harmLadder.ts:815–818). The general clause covers them, but list them in the §4.2 note: 1 and 4 from T5, 2 and 3 from T6, 6 from T7.
7. **The harness figures are v14; the code and the spec are now v15.** My re-run of `prop7.ts` on today's code gives the same counts, 0 stalls and every tier reached, but different medians and transitions:

   | Area | Doc | Now |
   |---|---|---|
   | piano scales: first rank / median | 35 / 21 | 37 / 23 |
   | piano harmony: median | 22 | 24.5 |
   | piano independence: T3→T4 | 41 | **46** |
   | piano independence: T5→T6 | 34.5 | 36 |
   | guitar independence: T5→T6 | 34 | 37 |
   | bass arpeggios: median | 21 | 25 |
   | bass walking: median | 22.5 | 25 |

   Update §4 / §4.4 and the "34–41-day" sentence (now 36–46). Also cite SPEC-HOLISTIC-2 v15 in place of v14 throughout; v15 §1.2 keeps the same catalogue rule.
8. **"§8.8".** It appears in §4.1 (comping while soloing) and §4.3 (the duo line). It means SPEC-HOLISTIC-2 §8.8, because this doc's §8 has no subsections. Write it out.

## Checks passed

- **Counts.** §4 matches `prop7.ts`: piano line-jazz 13 / 13 / 12 / 20 (each listed rung counted once), guitar harmony 3 3 9 9 19 13 10 with `g-jazz-1`, and the bass rows.
- **The guard.** It reproduces 2,533 / 0 / exactly the §1.5 split lists. Its table equals §1.5.
- **Seeds and overrides.** Every §4.1 piano seed claim holds, including the `k-bebop`, `harris-6` and `harris-26` overrides. The issue-2 bass list is the exception.
- **Only verified theory.**
  - `k-harrisline-35` (two dominants a bar) was owner-approved as the advanced form.
  - The bass `pivot` kind is "a scale line with a pivot" (§7), not a second pivot.
  - Hidden items stay out.
  - Fm6 / Bm6 appear only at T8.
- **No Claude-composed music; US copyright.** New items are rule-generated, cards or chord charts.
- **Vocal health.** Voice stays at T7, `v-top` is coverage, and Appendix A is not to be built (Q12 binding).
- **Rubato first; no tempo gating** on voicings, walking or fixed-tempo areas (apart from issue 3, which is independence, not a fixed-tempo area). Twelve keys count as coverage only.
- **The checklist.** It is complete, apart from the issue-2 override table, the issue-3 guard exception and minor note 3's row picks.

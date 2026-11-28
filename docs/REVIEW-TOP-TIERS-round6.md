# Review of RESEARCH-TOP-TIERS.md v6, round 6 (2026-11-28)

**Verdict: NOT CLEAN.**

All six round-5 issues and all eight round-5 minor notes are fixed. The §1.5 table now matches the code. Two problems remain that a builder would carry into code, and both are text fixes:
- the piano line-jazz track places T8 items whose shown precursors it leaves out, and it says nothing about some 18 shown levels;
- the new guitar rung `g-harm-1` has no row rule, so the minor row would get harmonic minor at T2.

Both are the same kind of issue as round-5 issues 3 and 4, which blocked last round.

What I checked:
- **The guard.** I bundled and re-ran `guard.ts` (2,533 specs, 0 unlisted; the same 11 mixed levels).
- **Every kind against §1.5.** I dumped every distinct family + kind (+ option, + `scale`) in the 44 families from `catalog()` / `guitarCatalog()` (556 rows) and checked each against the §1.5 table by hand.
- **Counts.** I checked `prop6.ts` against §4 and printed today's piano harmony ids, to make sure `addTo` does not count anything twice.
- **Guitar grades.** I checked `topGrade` for every guitar harmony, scale, arpeggio and line level placed in §4.2.
- **Piano seeds.** I computed `stepCatalogue()` difficulties for `harris-*`, `k-harrisline-*`, `k-bebop-*` and `g-jazz-*`, and checked every §4.1 seed claim.
- **Tempo tables.** I re-did the §2.2 bench and bound arithmetic and the §2.5 targets.
- **The harness.** One variant run (guitar harmony, below).

---

## Round-5 status

| Item | Status |
|---|---|
| R5-1 Q12 text | Fixed. §0, §6.2, §6.4 and §8 say "decided"; Appendix A is headed "not to be built until the owner opens voice T8". No "pending" remains |
| R5-2 guard lists | Fixed. There is a walking row (row 1), the precedence is stated, and the split list includes `g-scales-21` / `b-scale-13`. Every kind in code is on the table (see the guard section below) |
| R5-3 guitar minor / Aeolian harmony | Fixed. `m:` / `aeol:g-harm-2` are at T4, §7 has guitar Aeolian at T4, and the counts are 0 0 3 2 9 9 19 13 10. A new instance of the same problem: issue 2 |
| R5-4 the pivot precursor | Fixed. `harris-19` / `-20` are at T7 and `-21` to `-24` at T8, in rung order, matching the seeds (1440 / 1480 → T7; 1520–1650 → T8). The same pattern remains elsewhere: issue 1 |
| R5-5 cross-area Harris order | Fixed. It is in §1.5 and as a §7 row (v14 §1.6 `established`, never a lock) |
| R5-6 context split | Fixed. `k-sharm-24` / `-25` and `g-harm-13` are split. The kinds confirm it: `bw-iivi-d2`, `bw-std-d3`, `bw-iivi-d3` |
| R5 bass slow spots | Fixed. `b-chord-12` and `b-chord-5` are counted by option, with 30 d / 21 d recorded |
| R5 minor 1–8 | All fixed (the `k-sharm-12` double count, the bass cut written as ♩ ≥ 110, grade ≥ 9 → T8, the 3rds classification, the K4 / K6 list, the warm-up cell, the [E] marks, `k-harrisline-8` / `-9` and the outlines placed) |

---

## The §1.5 guard: is every rung matched once and correctly?

**Once: yes.** The table is first-match, and every family + kind in code appears in it:
- `b-cadlib` has exactly the three `cad~*~approach` / `walk` / `pedal` kinds;
- `b-chord` has 17 kinds = row 1 (4) + row 7 (9) + row 8 (4);
- the 12 `hl-` steps plus `hl-line`;
- every `g-harris`, `k-tpair`, `g-tpair`, `g-fusion`, `k-dimcol` and `g-jazz` kind;
- the `scales` `scale` values `six-dim`, `six-dim-m` and `bebop-dom`, and options 7 / 24 / 27.

The mixed levels the prototype reports are exactly the §1.5 split list.

**Correctly: yes for every plan rung.** I found no rung in §4 sent to the wrong area. Three caveats, none of which affects a rung today:
1. **The prototype is looser than the table.** Several of its clauses are catch-alls:
   - `harris` matches `/^h\d+-/`;
   - any `k-cadlib` / `b-cadlib` / `k-reharm` / `g-vl` kind is accepted;
   - any non-`fu-4nps` `g-fusion` kind → line;
   - any non-`dc-run` `k-dimcol` kind → harmony.

   So part of "0 unlisted" holds by construction. The builder must code the table, not the prototype.
2. **The table's patterns are still open.** `bw-*`, `cm-*`, `h*-`, `chart~*`, `rh-*` and "all kinds" classify future kinds automatically. If "closed" is meant literally, list exact kinds. Otherwise say the wildcards are intended (minor note 4).
3. **Assignments that would be wrong if they ever became rungs** (minor note 5):
   - `harris` `h3-triads` / `h4-chords` / `h5-pivots` are degree sequences played as lines. Row 5 sends them to line-jazz, while row 2's principle sends degree sequences to harmony.
   - `g-picking` `sweep3` / `5` / `7` and `g-legato` `tap-arp` go to independence, while the same techniques in `g-speed` go to arpeggios.

---

## Substantive issues

### 1. Piano line-jazz: T8 items without their shown precursors, and about 18 shown levels with no disposition

**Evidence** (`stepCatalogue()` difficulty → §1.2 step 3 tier; none of these levels is hidden in `verifiedContent.ts`):
- **`harris-24` "Pivot and enclosure down the bebop scale"** is at T8. The enclosure itself, `harris-6` "Half step below, enclosures" (1180 → T4), is placed nowhere.
  - Guitar does this correctly: `g-harris-5` (enclosure) at T7 comes before `g-harris-10` (pivot and enclosure) at T8.
  - This is round-5 issue 4 again, with the enclosure in place of the pivot.
- **`k-bebop-9` "Lines over whole forms"** is at T8 (1680). Its own family's earlier levels are placed nowhere: `k-bebop-1` ii–V–I lines (1120 → T3), `-2` minor (T4), `-3` altered (T5), `-4` blues (1330 → T6), `-5` rhythm changes (1400 → T6), `-6` standards (1470 → T7).
  - So a learner's first contact with the `bebopLine` generator would be a whole rhythm-changes form.
  - The Harris outlines (`k-harrisline-10`) use a different generator and are no substitute.
- **The new "comping while soloing"** (RH line over LH rootless cells, T8) has no precursor. The existing `k-bebop-7` "Both hands: shells and a line" (1540 → T8) is the natural step before it, and it is placed nowhere.
- **No disposition** is given for `harris-2`–`-8`, `-11`, `-14`, `-16`–`-18` or `k-bebop-1`–`-7` / `-10`. Round-5 minor 8 asked this for `k-harrisline`; the `harris` and `k-bebop` families were missed.
  - Several duplicate placed rows. `harris-2` (dominant scale from each chord tone) ≈ `k-harrisline-3`. `harris-11` (arpeggio up, scale down) ≈ `-13`. `harris-14` (the rules from any start) ≈ `-33` / `-12` / `-16`. `harris-8` (brothers, 3-to-9) ≈ `-20`.
  - Others are unique on piano: `harris-6` enclosures, `harris-16` the family of dominants as lines, `harris-18` the important minor as lines. Guitar places brothers (`g-harris-6`) and enclosures.

**Fix (text and the scratch catalogue only):**
- Place `harris-6` at line-jazz T5 (seed T4, raised because the track starts at T5, like `k-harrisline-2` / `-3`; add it to the override table), before `harris-24` in rung order.
- Either place the `k-bebop` ladder by seed, clamped to T5+ (`-1` T5 as an override; `-4`, `-5` T6; `-6` T7; `-7` T7 as an override, ahead of comping while soloing), or drop `k-bebop-9` from T8 (T8 → 17) and name `k-bebop-7` as comping while soloing's precursor.
- Add one "Not rungs" line that gives every unplaced `harris` / `k-bebop` level a reason: a duplicate of row X, coverage, or placed. Then re-run the line-jazz harness. The counts only rise, so the floor holds.

### 2. Guitar `g-harm-1` (new scales rung at T2) needs a row rule

**Evidence.**
- `g-harm-1` "Every scale note by note" (G3) carries every `H_SCALES` option (`hl('line')` over all 13 scales; harmLadder.ts:819).
- The only per-row pick in `guitarRungs` is `harm()`: `optIs(minor ? 7 : 0)`. Built that way, the minor row gets harmonic minor at T2, but the guitar harmonic-minor scale opens at T4 (`g-scales-13`).
- A natural Aeolian later rung (option 5) would also land at T2, against §7's guitar Aeolian at T4.
- §4.2 says only "`g-harm-1` every scale note by note (G3)". `prop6.ts` counts it once (`['g-harm-1', 2, 4]`), which implies major only.

**Fix.** State it in §4.2:
- the major rows only at T2 (option 0, nps rungs 2–4);
- the minor row (option 7) and Aeolian (option 5) from T4, with their scales;
- melodic (option 8) from T6;
- never the Harris options 9–12 here, because they are line-jazz scales.

The counts stay the same (major only is what was counted). Add this to the guard as "a rung's picked options must not open before their scale's tier".

---

## Guitar harmony T2→T3 at 29 days: acceptable

- **It is not a stall.** No climb stalls ≥ 42 d, and T3 meets the floor (2) with core items whose grade is right: `g-harm-2` major (G4), `g-vl-1` (G4).
- **It is in range.** 29 d is within the spread of other inherited or first transitions (piano harmony T1→T2 34; bass scales 29). The cause is the floor tier, which the plan names in §4.4.
- **Optional improvement.** Add `g-jazz-1` "Shell voicings ii–V–I, four to the bar and comping rhythms": G4 → T3, path rating 1092 (G4), 12 keys (`CYC4`), core (jazz-tagged). Take its major-row items only. It is placed nowhere today.
  - My re-run (60 runs, the report's seed): guitar harmony becomes 0 0 3 **3** 9 9 19 13 10. —→T2 16, **T2→T3 21**, then 18 / 24 / 19 / 22 / 29.5 (median 21).
  - It also adds a comping-rhythm step between the blues shells (T2) and `g-cadlib-1` (T5).

---

## Minor notes
1. **A near-duplicate at piano line-jazz T6.** `m6dim:scales-31` (minor 6th-dim, each hand / HT / contrary) and `harris-25` (minor 6th-dim scale, R / L / RL) drill the same scale. Count them as one cell, or say why there are two. T6 stays ≥ 11.
2. **The bass warm-up.** `b-scale-1` holds both pentatonics (options 8, 9). §7's "minor rows T0 minor pentatonic `b-scale-1`" needs `pick: optIs(8)`.
3. **Bass `b-scale-12` harmonic / melodic two octaves at T8.** RSL G8 lists only natural minor over two octaves, so mark these [E] (beyond RSL), as §2.3 does for the modes.
4. **§1.5 "closed".** Say whether the wildcards (`bw-*`, `cm-*`, `h*-`, `chart~*`, `rh-*`, "all kinds") are intended to classify new kinds. If not, list exact kinds, and make the guard reject unknown kinds even in those families.
5. **Odd assignments outside the plan's rungs** (the guard section, caveat 3). Also, `control`'s row text says "dynamics on scales", but the family also has `reading`, `voicing`, `pedal`, `melody-alberti` and `balance` (`control-8` is a piano scales rung at T3). Reword it to "control: all kinds".
6. **`harris-5` is titled "Pivots"** (1-3-5-7 up, turn at the octave). That is not the owner-confirmed pivot arpeggio (BARRY-HARRIS-THEORY §7: "There is no second pivot"). It is not a rung, but if issue 1's disposition places it, rename it or keep it out.

## Checks passed
- **Counts.** §4 matches `prop6.ts`. The piano harmony totals (6 5 2 11 13 10 14 17 12) include today's `k-sharm-3` / `-7` / `-11` spine and cadences, with no double ids.
- **Guitar grades.** Every §4.2 cell equals its `topGrade` tier or is a listed override.
- **Piano seeds.** All §4.1 seed claims (`K_HARM_DIFF`, `KEYS_LEVEL_DIFF`) hold.
- **Tempo tables.** §2.2 bench / bounds / SPEED, the §1.4 swing bands, the §2.5 piano arpeggio and octave targets, and the bass `tierOfNps` cuts all hold.
- **Only verified theory.** Hidden items stay out. 3 to ♭9 gives one dominant a bar.
- **No Claude-composed music; US copyright.** New items are rule-generated, cards or chord charts.
- **Vocal health.** Voice stays at T7, `v-top` is coverage, and Appendix A is not to be built.
- **Rubato first, no tempo gating.** Fixed-tempo areas and voicings carry no tier tempo steps. Twelve keys count as coverage only.
- **The checklist.** It is complete apart from issue 1's disposition line and issue 2's row rule (and its guard clause).

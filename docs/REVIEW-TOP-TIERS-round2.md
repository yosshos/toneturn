# Review of RESEARCH-TOP-TIERS.md v2, round 2 (2026-11-28)

**Verdict: NOT CLEAN.**

v2 is a real revision, not a rewording. Most of round 1 is fixed. The per-instrument bands, the bass rebuild, the voice and drum mapping, the Harris placement table and the checklist are now concrete.

What I checked:
- I re-ran `realCatalogues()` on this branch. Every cell of the §3 table matches.
- Every level id the plan names exists in the catalogue. The exceptions are the ones marked **new** (`k-hlfast`, `b-hlfast`) and `g-harrisline-9`, which is correctly gone.
- The only hidden ids the plan names are `b-harrisline-5` and `-9`, and it names them only as excluded.
- The `K_HARM_DIFF` ratings and seeds in the §4.1 override table are correct, for all 26 levels.
- The guitar `grade` → T mapping is correct for every level I checked.

Six problems remain. A builder following the plan would still tempo-ladder voicings, apply the genre rule two ways, tier the new line levels without a rule, and break the plan's own bass content-first rule.

---

## Round 1 status

| R1 # | Status |
|---|---|
| 1 shared speed scale | Fixed (§2.2–§2.4). Small gaps in the SPEED tables (minor note 4). |
| 2 per-instrument factors | Fixed in principle. **The owner's Q8 answer is not applied** (issue 6). |
| 3 `g-harrisline-9` | Fixed. |
| 4 bass lines | Fixed: placed under scales, `b-hlfast` split into 3 levels, `b-barry` used, new levels marked. The owner, who wrote "lines area", was never told (minor note 5). |
| 5 rating seed | Fixed: overrides listed, voice by RSL grade, drums by family. |
| 6 voice / drums | Fixed: `v-top` is coverage only, areas are mapped, no double use. `d-stick-1` / `-2` are unplaced (minor). |
| 7 voicings / walking tempo | **Partly fixed.** `g-harm-7` / `-8` moved, but other voicings stay in block B (issue 1). `b-walk-12` is relabelled, not changed (issue 5). |
| 8 more keys | Fixed (`advanced-7` folded in; piano independence T8 now has 3 items). |
| 9 Harris order | Fixed, apart from one level (`k-sharm-35`, minor note 2). |
| 10 reading / rhythm | Fixed (logged as backlog). |
| 11 bass first tiers | Fixed (`b-pluck-3` out, `b-fret-6` widened, harmonic minor at T4, harness re-run on the v14 areas). |
| 12 checklist | Fixed. |

---

## Substantive issues

### 1. Voicings are still in block B, and §7 gives block B tempo ranges (nps spans)
- **Evidence.**
  - §7 says "B rungs gain nps spans (piano, guitar …)", and v14 §1.2 makes the arpeggios' content tier their nps tier. Only the guitar voicings `g-harm-5` / `7` / `8` / `9` are moved out (§4.2 note).
  - **Piano block B is mostly voicings today:** `k-sharm-9` / `10` (block triads), `-13` / `-14` (block 7ths), `-15` / `-16` (drop 2) and `-43` / `-44` (triad inversions; step `ti` is a `chordStep`, harmLadder.ts:456).
  - **Guitar `g-harm-14`** is also step `ti`, block triads on 3-string sets in quarters. §4.2 places it in guitar *arpeggios* T6.
  - The never-ladder list (RESEARCH-KEY-EXERCISES-AUDIT, after §4.2) says "all comping and voicing".
- **Effect on the counts.** Taking the voicings out empties piano arpeggios T4: `aeolian:k-sharm-13`, `-13`, `-14`, `-43` and `-44` are all voicings. T5 drops to 2 (`-47`, `-48`) and T6 loses `melodic:-16`. So the §4 piano arpeggio row (8 5 6 7 6 6) and its harness figures do not hold.
- **Fix:**
  - Move every voicing rung (piano `k-sharm` 9 / 10 / 13–16 / 43 / 44 in all rows; guitar `g-harm-14`) into harmony as fixed-tempo rungs.
  - Fill piano arpeggios T4–T6 with real arpeggio rungs. For example, give `arpeggios-12` / `15` / `16` and `k-sharm-45` / `46` nps spans from T4.
  - Recount piano harmony and arpeggios, and re-run the harness.

### 2. Guitar: the genre / add-on rule is applied two ways, and the jazz-rung shift is not addressed
- **The two ways.**
  - §4.2 leaves out "genre-tagged levels: `g-arps-5` (jazz, rock, blues)".
  - Yet it counts `g-jblues` (genres jazz/blues), which is all of guitar harmony T2.
  - It also counts `g-harris`, `g-harrisline`, `g-tpair`, `g-cadlib`, `g-hlfast` and `g-solojazz`, all with genres = jazz. They are also jazz add-ons (guitarMeta.ts:132 `ADDON_FAMILY`), and `guitarLevelShown` (guitar.ts:2887) hides add-on levels unless the add-on is ticked.
  - Read literally, the plan's rule empties guitar harmony T2 and most of line-jazz.
- **The jazz-rung shift.** Separately, `openKeyRungs` opens `jazz: true` rungs **two tiers early** when the main style is jazz (keyIndex.ts:688). The plan does not say whether the new T6–T8 Harris rungs carry `jazz: true`. If they do, a jazz-focus player at T5 gets T7 borrowing rungs. That is above v14's entry rule (content ≤ t + 1, nothing above t + 2), and it skips the Harris order the plan just fixed.
- **Fix:**
  - State one rule: for example, jazz-tagged = core (the style-focus decision: the jazz core is the backbone), and every other genre tag = style only. Apply it to every guitar cell and recount.
  - Say how the early opening for jazz rungs interacts with v14 entry for T6–T8. Either it is capped by the entry rule, or it does not apply above T5.

### 3. Line rungs have no tiering rule, and the bass swing bands contradict the bass bench
- **Line rungs.**
  - `g-hlfast` is "tier by content, tempo climbs inside T8" (♩140–240). But ♩140 is guitar T7 by its own swing band (♩135–159).
  - `k-hlfast` is described only by "piano swung band".
  - Line-jazz is a tempo area in the harness (realCatalogue.ts `tempo: true`).
  - So a builder cannot tell whether line rungs are nps rungs (like scales) or content rungs that use tempo only as a sub-band.
- **Bass swing bands.** The bass T7 band is ♩160–200 = 5.3–6.7 n/s, and `b-hlfast` runs at ♩200–240 = 6.7–8 n/s. The bass T8 scale bench is 4.0 n/s [E], and the T7 bench is 3.33. A bass T7 line would then need more speed than a bass T8 scale. That is the opposite of Q2's "T7 means the same skill level within each instrument". The guitar band is derived from the guitar bounds; the bass band is derived from `b-barry-6`'s range.
- **Fix:**
  - Say once that line rungs are tiered by content, with tempo as a sub-band, the same on all three instruments. Then the swing table only sets each tier's start tempo and tolerance.
  - Derive the bass band from the bass bounds (about ♩100–120 at T7 and ♩≥ 120 at T8, [E]).
  - Start `b-hlfast` around ♩120–160 and let it climb to ♩200–240 inside T8. That still meets Q6's "bebop tempo", since the top of the range is bebop tempo.

### 4. Bass arpeggios break the plan's own RSL content-first rule
- **Evidence.**
  - §2.3 puts m7♭5 and dim arpeggios at RSL G6 (T5).
  - §4.3 still places at T2: `b-chord-15`, diatonic 7ths through the major scale, which includes viiø7; and natural-minor `b-chord-16`, which includes iiø7.
  - It places harmonic-minor `b-chord-16` at T4, and that includes vii°7.
  - The RSL table gives no grade for maj7 or m7 arpeggios at all, so `b-chord-6` / `15` / `16` cannot be checked against it.
- **Fix:**
  - Add the RSL grade of each arpeggio type (maj7, m7, dom7, m7♭5, dim7) with its source.
  - Then split by option, or move `b-chord-15` / `16` (or their ø / °7 degrees) to T5, or list them as overrides with a reason.
  - Recount bass arpeggios T2 and T4, which are at 6 and 3 today and may fall to the floor.

### 5. `b-walk-12` at T7 is a tempo gate with a new label
- **Evidence.**
  - The level's own range is ♩160–240 (bass.ts), so its slowest pass is ♩160.
  - The "two-feel switch" that §4.3 calls its content already exists at T0 (`b-walk-1`) and T4 (`b-walk-14`, in 2).
  - So the T7 placement is set by tempo, in a fixed-tempo area (v14 §1.3; never-ladder list).
- **Fix:** replace it with a content item. `b-walk-11` / `13` (walking one chorus of a standard from its chart, 12 keys at runtime) are unplaced today. Or define the T7 exercise as switching feel inside a form at the same sub-band as the other T7 walking items (♩80–160), with ♩160–240 as its upper sub-band.

### 6. The owner's Q8 answer is not applied
- **Evidence.**
  - §2.5 still shows Q8 as open: "the decision text says ÷ 0.78; RCM gives 0.63", and "raw tempo unless the owner approves 0.87".
  - No octave item has a target derived from 0.63.
  - **N15** (chromatic scale in octaves, 16ths ♩60 → 80) starts at 4.0 n/s. 4.0 ÷ 0.63 = 6.35, which is **T7** by the piano bounds (< 6.5), not the T8 that §4.1 gives. `advanced-3` (octaves, T7) has no target at all.
- **Fix:** rewrite §2.5 to the decision (octaves 0.63; hands a 3rd / 6th apart at raw tempo). Give N15 and `advanced-3` their start and target n/s through 0.63, and re-tier N15 (its T8 part starts at about 16ths ♩62).

---

## Minor notes
1. **Guitar modal harmony override.** "The mode follows its scale's grade, G7" is wrong for two cases. Dorian / Mixolydian (`g-scales-14`, grade 6) gives T5. Locrian (`g-scales-7`, grade 8) gives T7. So `dorian:` / `mixolydian:g-harm-6` belong at T5 and `locrian:g-harm-6` at T7.
2. **`k-sharm-35`** (drop 2&4) is a moving-inversion step (BARRY-HARRIS-THEORY §6.3), but it sits at T7, after borrowing starts at T6 (`-19`, `-20`). That breaks the plan's own Harris-order override. Move it to T6 with `-17` / `-18`.
3. **Bass nps rungs.**
   - The step tiers are used unevenly. T2 and T3 list "the earlier scales at this tempo", but T5 lists only harmonic minor at 100, and T8 lists no scale at the diploma tempo.
   - The realCatalogue span rule ("one exercise per tier min…max") must skip T1, T4, T6 and T7 for bass. Otherwise it makes tempo-identical exercises at two tiers.
   - State which bass rungs span which steps.
4. **SPEED tables.**
   - Guitar `SPEED_NPS` "= the next tier's bench, with T7 5.3" contradicts itself: the next bench is 5.8. Give the full array.
   - The bass `SPEED_NPS` array is missing.
5. **Q6.** The owner wrote "in the lines area". The plan puts the item under bass / scales (v14). Tell the owner in one line, as round 1 asked.
6. **Drums.**
   - `d-pas-6` (17-stroke and combined rolls) is not in the cited grade-8 set: AUDIT-5-INSTRUMENTS.md:349 and :399 name only the pataflafla and the double and triple ratamacues. Label it as a judgment call.
   - `d-stick-1` / `-2` are neither placed nor excluded.
7. **Unsourced tiers.**
   - Bass Locrian at T6 has no RSL source in §2.3. Mark it [E], or put it with the rest of `b-scale-13` at T7.
   - The one-to-one item → grade mapping of `v-arp2` (G6 / G7 / G8) is an estimate. Mark it [E].
8. **Voice counts.** Voice T5–T6 counts per area are not checked after adding `v-arp2` / `v-leaps` / `v-runs` / `v-part` there.
9. **`g-tpair-5`** ("Comping ii–V–I with pair shapes") is counted in guitar line-jazz, which is a tempo area. Comping belongs in harmony at fixed tempo. Line-jazz T8 still has 12 items after the move.
10. **The Harris track differs between instruments.** On guitar, Harris's moves, the sixth on the fifth and the elevator arrive at T8, bundled into `g-harris-11` / `12`. On piano they are T7 (`k-sharm-33`, `-36`, `-37`, `-40`). Say this is intended, or split the guitar levels.
11. **The bass duo line.** "Every chord's 3rd and 7th sounded" needs a rule for 2-beat chords, for example the root plus one guide tone.
12. **§1.2 step 3.** "< 1420 → the grade below" is ambiguous. Write grade = ⌊(r − 700) / 90⌋, then map the grade to T.
13. **Level test.** Say that voice has no T8 probe, and list the drum T7 / T8 probes per area.
14. **Checks passed:**
    - copyright (chord charts only; the outlines and Coltrane changes are charts);
    - no Claude-composed music;
    - vocal health (`v-top` is coverage only; wide leaps stay in range by octaves);
    - rubato first, with the at-tempo levels inheriting their source rows' stage;
    - only verified theory (the hidden `b-harrisline-5` / `-9`, `el-borrow`, Echols's thirds and triads ladder and his octave chord all stay out).

# Review of RESEARCH-TOP-TIERS.md v10, round 10 (2026-11-28)

**Verdict: NOT CLEAN.** The round-9 issue is fixed, as are its three minor notes. The guard and the harness reproduce exactly on today's code. But checking the row picks option by option against the generators turned up two more problems:

1. **Minor options still sit on the major rows** on all three instruments. They occur in line-jazz, harmony and walking rungs that the row lists never mention.
2. **The chart-tune walking rungs would play in the wrong key.** In a key row they would not render in the row's key.

Both are factual tonality errors that a builder following the text would ship. Both are text fixes plus one guard check. No count or harness figure changes, because `prop9` counts each rung once, whatever its row.

What I ran and read:
- **The guard.** I re-bundled `guard2.ts` against today's tree (c12f275e) and ran it: 45 families, 2,533 specs, 0 unlisted. It reports 13 mixed levels, exactly the 5 plan splits and 8 "not rungs" in §1.5.
- **The harness.** I re-bundled `prop9.ts` and ran it with 60 runs and the report's seed, on bass, bass-now, guitar and piano. All four outputs are **byte-identical** to round 9's (`r9/*.txt`). So every figure in §4, §4.4 and §5 stands, the largest median is 37 days (none reaches 42), and there are 0 stalls on the proposed areas.
- **The code.** I read every row-pick source:
  - `RULE_OPTS`, `HL_ROWS`, `G_ROWS`, `B_ROWS` and `lineItem` (harrisLineDrills.ts);
  - `HLFAST_ROWS` (guitarTop.ts:119–126);
  - `KTP_ROWS`, `GTP_ROWS`, `BTP_ROWS` and `genLines` / `genComp` (tpairDrills.ts);
  - `genBebop` / `genBebopForm` and the harris family with `harrisChromatic` / `harrisPivot` / `H18_FORMS` (generate.ts);
  - the g-harris cases (guitarJazz.ts:378–580);
  - `genBarry` (bassNiche.ts:634–744);
  - `BSCALES`, `genChord`, `BASS_STD` and the `standard` walk (bass.ts);
  - `H_SCALES` and the `vl-ladder` / `cm-expand` levels (harmLadder.ts);
  - `openKeyRungs` / `warmOf` (keyIndex.ts);
  - `verifiedContent.ts`.

---

## Round-9 status

| Item | Status |
|---|---|
| R9-1: bass row picks | Fixed. `b-harrisline-4` options 9 and 14 are minor and 0, 4, 8 major (`RULE_OPTS`:78–84). `b-barry-2` and `-4` are both major (`dimpass` op 1 IV–♯IV°–I/5; `walk13` op 1 `PROGS.jazz`). The new `b-tpair-3` option 2 = `iivi-min` is correct (tpairDrills.ts:607) |
| R9 minor 1: the miscellaneous rule's tier | Fixed (§4.2 note) |
| R9 minor 2: the guitar options named | Fixed. `g-harrisline-4` 9 and 13, `g-harris-1` 2 and 3, `g-hlfast-2` 9 and 13, `g-tpair-6` 2 are all correct |
| R9 minor 3: `b-barry-5` clause | Fixed. It matches BARRY-HARRIS-THEORY.md:121 |

**Every other row-pick and option claim I checked is correct.** The option claims:
- `harris-15` op 1, `k-bebop-6` op 1, `harris-18` op 2, `k-harrisline-18` op 5, `-15` op 2 and `-16` ops 9–14;
- `b-barry-1` op 1 and `b-harrisline-1` op 2;
- the warm-up picks `b-scale-1` op 8 and `b-scale-3` op 5, `b-scale-7` ops 6 and 7, and `b-scale-12` op 0;
- `b-scale-13` ops 14, 15 and 27, `b-scale-6` ops 0 and 1, `b-chord-6` ops 0–4, and `b-chord-16` op 7;
- `g-scales-21` ops 23 and 24;
- `g-harm-1`'s `H_SCALES` indices.

The outline claims also hold: `-10`, `-14` and `-30` are major tunes.

---

## Substantive issues

### 1. Many minor options are left on the major rows

§4.1 and §4.2 say the row lists were "each checked against its generator", and their fallback is "major rows: every other option". The generators show these options are in a minor key. Most have a minor-key chart or tonic and a key signature of `key + 3`:

| Instrument | Rung (tier, area) | Minor option(s) | Evidence |
|---|---|---|---|
| piano | `k-harrisline-21` seven down (T7 line) | ops **0, 2** | `hl-sevendown`: `minor = op !== 1`, iiø–V7 → Im6, `sigOf: 3` (harrisLineDrills.ts:366–385) |
| piano | `harris-17` chromatic runs (T8 line) | op **2** | `h17-chromatic` op 2 = `km m6`, sig key+3 (generate.ts:3901–3905) |
| piano | `harris-22` pivot through ii–V–I (T8 line) | op **1** | `h21-pivotiivi` op 1 = minor ii–V–i (generate.ts harrisPivot, "minor ii–V–i in …m") |
| piano | `k-tpair-11` pair lines through ii–V–I (T8 line) | op **2** | `tpk-iivi` → `['iivi','iivi-col','iivi-min'][op]` (tpairDrills.ts:316, :372) |
| piano | `k-bebop-9` whole forms (T8 line) | op **2** | `['rhythm-aaba','rhythm-bridge','minor-blues'][op]`, `minor: true` (generate.ts:4614, :4640) |
| piano | `k-sharm-12` / `-14` / `-16` / `-18` Harris options (T6 harmony, "one rung") | op **10** | `H_SCALES[10]` = six-dim-m, `minor: true` (harmLadder.ts:61). Today's code already puts `k-sharm-12` op 10 on a minor row (keyIndex.ts:502); the plan names no row |
| piano | `k-sharm-35` drop 2&4 (T6 harmony) | op **10** | `hl-d24:9–12` |
| piano | `k-sharm-40` minor 6-dim elevator (T7 harmony) | **whole rung** | `cm-expand:8`. `prop9` even lists it as `major:k-sharm-40` |
| piano | `k-sharm-41` Echols shells (T7 harmony) | ops **6, 9** | `vl-ladder`: "+4 = minor; 9 = lower shell minor" (harmLadder.ts:1311–1318) |
| guitar | `g-harrisline-1` chromatic scales (T6 line) | op **2** | `hl-chrom` 2 = m6dim (harrisLineDrills.ts:185, :753). Bass `b-harrisline-1` op 2 and piano `-15` are already minor rows |
| guitar | `g-harrisline-2` outlines (T6 line) | op **5** | Night in Tunisia, `sigOf: 3`. This is the same item as piano `-18` op 5 (minor) |
| guitar | `g-harrisline-6` (T7 line), `g-hlfast-3` (T8 line) | `hl-sevendown` op **0** | as `k-harrisline-21` |
| guitar | `g-hlfast-1` (T8 line) | `hl-chrom` op **2** | guitarTop.ts:122 |
| guitar | `g-hlfast-4` (T8 line) | `hl-outline` op **5** | guitarTop.ts:125 |
| guitar | `g-harris-2` (T6 harmony), `g-harris-7` (T7 harmony) | `sixdim-chords` op **2**; `sixdim-sets` ops **1, 2** | "Op 2: the minor 6th-diminished"; `SETS[1]` and `[2]` are minor (guitarJazz.ts:391–399) |
| guitar | `g-tpair-5` comping with pair shapes (T8 harmony) | op **2** | `gtp-comp` → `iivi-min` (tpairDrills.ts:502) |
| bass | `b-harrisline-6` seven down / 3 to ♭9 (T7 scales) | `hl-sevendown` op **0** | as above |
| bass | `b-walk-11` (T7), `-13` (T7), `-14` (T4), `-18` (T8) walking | every `BASS_STD` option with `minor: true` | e.g. `-11` op 1 Blue Bossa and op 3 Autumn Leaves; `-13` Minor Blues; `-14` Valentine, Song for My Father, minor bossa, Cantaloupe; `-18` Solar, So What … (bass.ts:1279–1312) |

**Why this matters.** Take a C-major row session. It would play Dø–G7 → Cm6, a C minor blues chorus, Cm6 chord scales, and Blue Bossa. These are parallel-minor items inside a major-key session, and the minor rows would lack them. This is the same class of tonality error as R9-1, in the other direction, and the planned `k-hlfast` / `b-hlfast` copy the `g-hlfast` lists, so they would inherit it.

**Fix.**
1. Add the options above to the minor-row lists:
   - §4.1 line-jazz: `k-harrisline-21` 0 and 2, `harris-17` 2, `harris-22` 1, `k-tpair-11` 2, `k-bebop-9` 2.
   - §4.2: `g-harrisline-1` 2, `-2` 5, `-6` 0, `g-hlfast-1` 2, `-3` 0, `-4` 5.
   - §4.3: `b-harrisline-6` 0.
2. Add a **harmony rows** line to §4.1 and §4.2: `k-sharm-12` / `14` / `16` / `18` and `-35` op 10, `-40` (whole rung), `-41` ops 6 and 9; `g-harris-2` op 2, `-7` ops 1 and 2, `g-tpair-5` op 2.
3. Add a **walking rows** line to §4.3: each `BASS_STD` option goes on the row of its own mode (`minor: true` → minor).
4. State that `k-hlfast` / `b-hlfast` follow the `g-hlfast` row picks.
5. **Make it mechanical, since three rounds have now found row errors.** Add to the §1.5 / §7 guard:
   - **The check:** every picked option's tonality must match its row.
   - **How to read the tonality:** generate the drill in C and read its tonic from `keySig` / `sigOf` (key + 3 = minor), from `H_SCALES[o].minor`, from the spec's `minor` flag, or from `BASS_STD[o].minor`.
   - **Exempt** single-chord-quality drills, such as `b-chord-6` m7 or `harris-19` m7♭5, where the chord type and not the key is the content.

### 2. The chart-tune walking rungs would not play in the row's key

**The code.**
- The `standard` walk treats the spec key as an **offset from the lead sheet's key**: "0 = the tune's own key" (bass.ts:1471–1477).
- `openKeyRungs` sets `keys: [root]` (keyIndex.ts:683).

**The effect.** As a rung, `b-walk-11` / `-13` / `-14` / `-18` would play in `std.key + root`, not in the row's key. In the D-major row, Autumn Leaves would play in A minor and All the Things You Are in B♭.

**Where the plan is wrong.** §4 says these levels "are 12-key at runtime (stdKey offsets), so they are ordinary rungs". That is true of `k-bebop-9`, `k-sharm-42` and `g-solojazz-2` / `3`, whose key is the tonic. It is not true of the bass `standard` kind.

**Fix.** In §4 and §7 (Ladders), say that a `standard` rung passes the offset `root − std.key`. For a minor tune on a minor row, use the row's minor tonic. The rung then renders in the row's key, as the `b-cadlib` rungs do (keyIndex.ts:402). Add this to the guard as well: the rendered tonic equals the row's tonic.

---

## Minor notes

1. **§8 "the blues outline (`b-harrisline-5`)" is mislabelled.**
   - `b-harrisline-5` is the 5-4-3-2 phrases and lick (hidden as `bh-5432`).
   - The blues outline is `hl-outline:0` (hidden, `bh-outline-blues`). It sits **inside** placed rungs: `b-harrisline-2`, `g-harrisline-2` and `g-hlfast-1` all carry it unconditionally, and the `pick` changes only the title.
   - **Fix:** say that the rung `pick` must drop `hl-outline:0` while it is hidden.
2. **`g-harris-6` is two items.** §4.2 describes it as "the brothers' arpeggios", but option 1 is "four minor 6ths from one diminished chord". In C those are Fm6, A♭m6, Bm6 and Dm6 (guitarJazz.ts:512–527), which include the Fm6 / Bm6 the owner calls rare (Harris answers 2026-11-23). It sits at T8, which is consistent. Give it the same low weight as piano's H-5 note (§4.1), and describe both options.
3. **`prop9` row labels.** `major:k-sharm-40` (and `-41`) should be relabelled once issue 1 is applied. The counts are unaffected.

## Checks passed

- **Curriculum flow.**
  - The Harris order is scales → rules → devices on bass. On piano it is the 6th-dim harmonisation → drop 2&4 → borrowing → expressions → context.
  - The rung order inside each tier is stated.
  - The cross-area prerequisites are planner rules, not locks.
- **All 12 keys.** Every rung is 12-key (`keys: [root]`). The short-list widenings are listed, and "more keys" is never a tier step. Issue 2 is the one exception to rendering.
- **Untimed first; no tempo gating.**
  - Rubato comes first, then the ladder. The `hlfast` levels inherit the rubato stage of their sources.
  - `max` appears only on rows 4, 7 and 9, plus N15. The guard confirms this.
  - Walking, voicings and the fixed-tempo areas climb by content.
- **Only verified theory.**
  - The hidden items stay out: `el-borrow`, `cm-elevator`, `vl-ladder` 0, 1, 3, 4, 5, 7, `hl-5432`, `hl-feel6`, `hl-arps-down`, and `hl-outline:0` (with minor note 1).
  - `bh-seven-down`, `bh-3-to-b9`, `tune-charts` and `echols-voicing-ladder` are in `SWITCHED_ON`.
- **No Claude-composed music; US copyright.** The plan uses only rule-generated lines, cards and chord-only charts.
- **Vocal health.** Voice is capped at T7 (Q12). `v-top` is coverage only, Appendix A is not built, and a range-extremes audit item is in place.
- **Checklist (§7).** It is complete, apart from adding the row-tonality guard (issue 1) and the `standard` offset (issue 2).
- **Transitions.** Every median is under 42 days. The largest is 37 (guitar independence T5→T6).

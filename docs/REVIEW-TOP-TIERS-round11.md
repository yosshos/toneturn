# Review of RESEARCH-TOP-TIERS.md v11, round 11 (2026-11-28)

**Verdict: NOT CLEAN.** Round 10's two issues and its three minor notes are fixed in the text. The guard, the classifier, the offset scan and the harness all reproduce exactly on today's tree (db811f86). But the new tonality classifier, which now generates the binding row picks (Appendix B, §7 "Rows by tonality"), has two problems:

1. **It misclassifies some items, so they land on the wrong row.** Two minor-key items go to the major rows, and the blues scale goes to the minor rows only, which contradicts the plan's own warm-up.
2. **Appendix B contradicts the plan's mode views.** It puts the Aeolian, Dorian, Phrygian and Locrian options in the minor column, while the plan and today's code keep them as tagged views on the major rows. §7 tells the builder to follow Appendix B.

Both are fixes to the text and the classifier. No count or harness figure changes, because the harness counts each rung once, whatever its row.

## What I ran

- **The guard.** I re-bundled `guard2.ts` (rolldown) and ran it. Result: 45 families, 2,533 specs, 0 unlisted. It reports 13 mixed levels, which are exactly §1.5's 5 plan splits and 8 "not rungs".
- **The classifier.** I re-bundled and ran `tonality.ts`. Result: 416 levels classified, 195 with a minor option, 152 split. Today's picks show 4 mismatches, the same four the doc names, and the plan labels show 0. Its table matches Appendix B line for line; the 133 all-major levels sit in the inline list.
- **The offset scan.** I ran `offset.ts` over **every** level. The only placed offset users are `b-walk-11` / `-13` / `-14` / `-18` (`harris-8` and `g-jazz-13` offset too, but neither is placed). `std.key` holds the minor tonic for minor tunes (Autumn Leaves, key 2 → A minor), so the §4 formula `(row tonic − std.key) mod 12` is right.
- **A second offset check of my own.** It covers the 322 placed chart specs that carry no `drill.tonic`, which `offset.ts` cannot see. Each one transposes by exactly the spec key. The scan's conclusion holds.
- **The harness.** I ran `prop10.ts` with 60 runs and the report's seed on piano, guitar, bass and bass-now. All four outputs are **byte-identical** to the round-10 outputs (`tt/r10/*.txt`). The largest median is 37 days (none reaches 42), and there are 0 stalls.
- **Spot checks.** I generated each option of every placed level in C (2,028 specs) and printed its title, key signature, tonic, pitch set and chart beside the classifier's verdict. I read about 120 of them closely, including:
  - `scales-19` / `-21` / `-22` / `-24` / `-26`, `k-sharm-10` / `-40` / `-41` / `-42`;
  - `harris-15` to `-18` and `-22`, `k-bebop-2` / `-4` / `-6` / `-9`, `k-tpair-1`, `g-tpair-1`, `b-tpair-1`;
  - `k-harrisline-21`, `cadences-3` / `-7`, `k-reharm-8`;
  - `b-walk-11` / `-19` / `-20`, `b-barry-2` / `-4`;
  - `g-solojazz-2` / `-3`, `g-scales-3` / `-7` / `-19` / `-20`, `b-scale-1` / `-3` / `-9` / `-14` / `-15`, `g-harm-12`.

  All are correct except the cases in issue 1 and minor note 2. I also checked every pair where the same kind and option appears on two instruments; issue 1 lists the one disagreement.

---

## Round-10 status

| Item | Status |
|---|---|
| R10-1: minor options on the major rows | Fixed for every option round 10 listed: Appendix B puts each one on the minor rows. But the generated rows bring new errors (issue 1) |
| R10-2: the `standard` walk offset | Fixed in §4 and §7, with a guard. The formula and its minor-tonic rule check out against `BASS_STD` |
| R10 minor 1: `hl-outline:0` | Fixed. §8 now says `gateLevel` drops it (verifiedContent.ts:304, applied by `gateFamilies` in every catalogue). It is absent from Appendix B |
| R10 minor 2: `g-harris-6` is two items | Fixed (§4.2) |
| R10 minor 3: the `prop9` labels | Fixed (`minor:k-sharm-40`, `split:k-sharm-41` in prop10) |

---

## Substantive issues

### 1. The classifier misclassifies some items, so they land on the wrong row

The classifier reads tonality in this order: `tonic.minor` / `spec.minor`, then the chart's last chord *if it is on the tonic*, then the pitch set (a minor 3rd without a major 3rd), then `keySig`. The last two steps fail in three ways:

| Item (plan placement) | Classified | Should be | Why |
|---|---|---|---|
| `b-walk-19` op 1 "Jazz waltz in minor · Cm" (walking T5) | major (in the 133 all-major list) | minor | The chart ends on G7, not the tonic. A passing E puts both 3rds in the pitch set. The generator's `keySig` is `C`, not `E♭`, so the fallback says major |
| `g-harm-12` `bw-iivi:1` "Borrowing in C: minor ii–V–i" (guitar harmony T8, the context items) | major | minor | The guitar generator returns `keySig` `C`. The piano's identical `k-sharm-23` `bw-iivi:1` returns `E♭` and is classified minor. So the same item sits on different rows on the two instruments |
| The blues scale: `g-scales-3` `blues` (guitar scales T1) and `b-scale-3` op 10 (bass scales T2) | minor rows only | both rows (or the major rows) | It has a ♭3 and no ♮3, so the classifier calls it minor. The blues scale is played over the dominant blues, and the plan's blues material is all major-row: `g-jblues-2`–`4`, `b-walk-21`, `b-walk-20`. **It also contradicts §7's guitar warm-up** ("major rows T1–T2 `g-scales-3` (major pentatonic and blues)"), so the §1.5 guard would fail the plan's own warm-up |

**The root cause.** `keySig` and "any minor 3rd" are not reliable signals:
- Several generators leave the signature at the tonic for minor material.
- Chromatic passing notes put both 3rds into the pitch set.
- Blue notes add a ♭3 without the key being minor.

`k-keylick-19` shows how fragile the pitch-set step is. Its C Dorian, Phrygian and Locrian options come out "modal", because their approach notes put both 3rds in the set. The same modes as plain scales (`scales-19`, `-24`, `-26`) come out "minor". That one is harmless today, because the `k-keylick-19` rungs are tagged views.

**Fix.**
1. Correct the three rows in Appendix B: `b-walk-19` op 1 → minor; `g-harm-12` `bw-iivi:1` → minor; `g-scales-3` `blues` and `b-scale-3` op 10 → both rows. Or, if the owner prefers, put the blues scale on the major rows, matching §7's warm-up, and say so.
2. Harden the classifier before it becomes the guard reference:
   - Read the semantic data first: `H_SCALES[o].minor`, the spec's `scale` / mode name, and the `BASS_STD` / cadence `minor` flags.
   - Then read the chart's **tonic chord anywhere** (the first chord, or the majority of the tonic chords), not only the last chord.
   - Declare a **blues** kind list (the `blues` scale, `b-scale-3` op 10) as neutral.
   - When both 3rds are present and no semantic signal exists, return **unresolved**, and fail the guard so a person decides. Do not fall back on `keySig`.
3. Add a guard check: **the same kind and option must classify the same on every instrument.** That check would have caught `bw-iivi:1`.

### 2. Appendix B contradicts the plan's mode views

**What the code and the plan do.**
- In today's code (`laterRungs`, keyIndex.ts:450–528), the major rows carry the **relative Aeolian** as a tagged view (`tag: 'aeolian'`, `off: 9`: A Aeolian in C).
- They also carry the **modes from the root** as tagged views (Dorian, Mixolydian, Lydian, Phrygian, Locrian).
- The plan keeps these views: §4.1 has `k-sharm-5` / `-9` / `-13` "(major, Aeolian)"; prop10 has `aeol:`, `dor:`, `phr:` and `loc:` labels on `g-scales-13` / `-14` / `-15` / `-7` and `g-harm-6`; §7 has `MODES_FROM_TIER`.

**What Appendix B does.**
- It lists the Aeolian, Dorian, Phrygian and Locrian options (`H_SCALES` 1, 2, 5, 6; `g-scales-13` / `-14` / `-15` / `-7` mode 5 / 1 / 2 / 6; `scales-19` / `-24` / `-26`) in the **minor-rows** column.
- But its header and §7 say "major / modal options → major rows", and §7 says "Every rung's `pick` follows Appendix B".

**The checks do not cover the gap.**
- The classifier **exempts** tagged views from the today-check: `VIEW_TAGS`, both directions.
- It never checks prop10's view labels: only `major|minor|m|M|mel|aeol` labels are tested, and even those only for "some option of that tonality exists".
- So "0 mismatches" says nothing about the views. §1.5's "mode-tagged views … are checked against their mode" describes a check that does not exist.

**Where a builder goes wrong.**
- **`g-harm-1` (new, untagged).** Appendix B would put its Dorian, Phrygian, Locrian and Aeolian options (1, 2, 6, 5) on the **minor** row. Their scale rungs (`g-scales-14` / `-15` / `-7` / `-13` views) sit on the **major** row. So the harmonised mode would open on a row with no matching scale, and the "picked option never before its scale's tier" check cannot be evaluated per row.
- **The Harris options.** Appendix B also lists `g-harm-1` options 9–12, which §4.2 excludes ("never the Harris options 9–12 here"). It lists `k-sharm-12` options 7 and 8 next to the T6 Harris rung (options 9–12). Read as a pick list, it would add those options to the wrong rungs.

**Fix.**
1. State that **Appendix B classifies options; it is not the pick list.**
   - The rung picks are those in §4, with a row filter by Appendix B.
   - **Tagged view rungs** (`aeolian`, `melodic`, `m6dim`, `hc`, the five modes) keep the row `laterRungs` gives them.
   - A view's pick must equal its mode's option (`aeolian` → 5, `dorian` → 1, …). That is the check §1.5 should describe, and it is what the guard tests.
2. Decide where the modal options of **untagged** multi-scale rungs go (`g-harm-1`, and `b-scale-14` / `-15`, `g-scales-19` / `-20`, which the classifier splits by the mode's own 3rd). The recommendation: put each on the row where its scale rung lives (the major row for the modes from the root), and list that in §4.2 / §4.3.
3. Fix the Appendix B header, or mark the modal entries "(major-row view)", so the column names and §7 agree.
4. Extend the tonality check in `tonality.ts` to the view labels (`dor:`, `phr:`, `loc:`, `lyd:`, `mix:`, `harris:`, `m6dim:`, `V:`, `split:`).

---

## Minor notes

1. **Dominant-on-the-root material is "major" only.** This covers `harris-26`, `k-harrisline-3` / `-4` / `-13`, `g-harris-3`, `harris-16`, `k-bebop-3` and `b-scale-9`. A C7 line fits a C-minor session no worse than a C-major one, and minor rows get no dominant-rule item before the minor rule. Consider declaring them neutral, so minor-row line-jazz is not thin. Per-row floors are not measured (the harness counts rows together).
2. **`b-scale-15` op 26 (altered ♭♭7)** is classified major because pitch classes merge ♭4 with ♮3. Its 3rd is E♭ and its chord is a diminished 7th. Make it neutral or minor. It sits at T8, so the impact is low.
3. **"On V" bass rungs need an offset.** `b-scale-9` (WT / dim / altered "on V") and `b-scale-13` op 27 (bebop dominant "on V") render on the root. §4.3 should give them `off: 7`, as `g-scales-21` and `k-modes-3` have (keyIndex.ts:386, :615), or drop "on V". The classifier ignores `off`, so a rung with an offset should be classified after the offset is applied.
4. **The plan-label check is weak.** It passes a label when the level has *any* option of that tonality, not when the picked options match. Check each picked option against the classifier instead.

## Checks passed

- **Curriculum flow.** The Harris order holds and the rung order inside each tier is stated. The prerequisites are planner rules, never locks. The bass track is in order: scales → rules → devices.
- **All 12 keys.** Every rung is `keys: [root]`. The `standard` offset (now specified) makes the chart walks render in the row's key. Every other chart rung transposes by the spec key (checked on 322 tonic-less specs).
- **Untimed first; no tempo gating.** Rubato comes first, and the `hlfast` levels inherit their sources' rubato stage. The guard confirms `max` only on rows 4, 7 and 9, plus N15.
- **Only verified theory.** The catalogue is gated (`gateFamilies`). The hidden items stay out, and §8 is accurate.
- **No Claude-composed music; US copyright.** The plan uses rule-generated lines, cards and chord-only charts, and keeps the PD classics out of the ladders.
- **Vocal health.** Voice stays at T7 (Q12), `v-top` is coverage only, and the range audit item is present.
- **Checklist (§7).** It is complete, apart from the clarifications in issues 1 and 2.
- **Transitions.** Every proposed median is under 42 days (the largest is 37). There are 0 stalls, and every tier is reached.
- **Owner decisions.** The plan agrees with all three blocks. Q7 supersedes the first block's "floor 3", and Q6 is handled by the notice.

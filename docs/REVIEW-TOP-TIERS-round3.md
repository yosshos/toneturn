# Review of RESEARCH-TOP-TIERS.md v3, round 3 (2026-11-28)

**Verdict: NOT CLEAN.** The plan is close. Every round-2 issue is fixed, and the structure is sound. Each problem below needs only a text edit or a recount, not a redesign. But a builder following v3 as written would still:
- count one bass exercise twice in five tiers;
- break the plan's own Harris-order override on guitar;
- ship a misquoted RSL Debut row;
- keep a style lock that SPEC-STYLE-FOCUS §8.1 removed.

What I checked:
- **Every level id the plan names**, against `catalog()`, `guitarCatalog()`, `bassFamilies()`, `pianoScaleHarmFamily()`, `guitarHarmLevels()` and `stepCatalogue()`.
- **The guitar `grade` → T mapping (after `GUITAR_GRADE_UP`)** for every guitar cell in §4.2. All correct, overrides included.
- **The voice per-area counts at T5–T7.** All match a rerun of the author's `voice.ts`.
- **The drum seeds**, against `DRUM_TOP_PLACEMENT`.
- **The §4 counts and the bass harness lines**, against `prop3.ts` and `out3-bass.txt`. Both match.
- **N15's tiers under 0.63.** ♩56 16ths = 3.73 n/s, ÷ 0.63 = 5.93 → T7. ♩66 = 4.4 n/s, ÷ 0.63 = 6.98 → T8. Both correct.
- **The RSL 2012–2018 bass Technical Work tables** (pp. 26–27 of the cited PDF).

---

## Round 2 status

| R2 # | Status |
|---|---|
| 1 voicings in block B | Fixed. Every piano voicing (`k-sharm` 9/10/13–16/43/44) and `g-harm-14` is in harmony. Piano arpeggios are refilled with real arpeggio rungs. |
| 2 genre rule, jazz shift | Fixed (§1.3). One leftover lock remains (issue 4). |
| 3 line rule, bass bands | Fixed (§1.4). The start-tempo wording is inconsistent (minor note 1). |
| 4 bass arpeggios vs RSL | Fixed. `b-chord-6` is split by option (code order maj7, m7, 7, m7♭5, dim7 confirmed in `genChord`). `b-chord-15`/`16` are at T5. |
| 5 `b-walk-12` | Fixed. It is not a rung. `b-walk-11`/`13` are 12-key at runtime (b-walk is a `TWELVE_KEY_FAMILIES` family; stdKey offsets). |
| 6 Q8 | Fixed. |
| Minor 1–13 | All fixed (modal harmony, `k-sharm-35`, bass span table, SPEED arrays, Q6 notice, drums, [E] labels, voice counts, `g-tpair-5`, the Harris-track note, the duo rule, the grade formula, the level-test probes). |

---

## Substantive issues

### 1. Bass: the same exercise is counted twice, as an Aeolian rung and as a natural-minor rung
- **Evidence.** `exerciseId` is the spec template plus the level/option, with the key removed (v14 §1.7).
  - **Scales.** The Aeolian rung is `b-scale-3` option 5, played from the major row's 6th (keyIndex.ts `aeol`, `off: 9`). The new minor-row "natural minor" is the same level and option (`b-scale-3` = `scale:5`, `scale:10`).
  - **Scales, two octaves.** `aeol:b-scale-12` picks option 0, and `m:b-scale-12nat` is also option 0 (`scale2:0m`).
  - **Arpeggios.** `aeol:b-chord-16` picks option 5, and the natural-minor `b-chord-16` is `dia7:5m`.
- **Effect.**
  - `prop3.ts` counts these as distinct exercises: bass scales T1, T2, T3, T7 and T8 each get +1, and bass arpeggios T5 gets +1.
  - The true counts are scales 5 **4** **8** **9** 5 12 9 **11** **13**, and arpeggios T5 **7**.
  - Every tier still meets the floor. But the §4 / §5.2 tables and harness figures are slightly optimistic.
  - A learner is also offered A natural minor twice in one tier, from the C major row and the A minor row.
  - §4.3 says "natural minor 2 octaves `b-scale-12` (both rows)", which is this duplicate.
- **Fix.** Keep one of each pair, or define the minor-row rung as a different option. For example, use the minor-row natural minor in a different position (`b-scale-12` is two octaves). Then recount and re-run bass scales and arpeggios.

### 2. Guitar breaks the plan's own Harris-order override (`g-harm-13`)
- **Evidence.**
  - §1.2 step 4 lists the Harris order as an override, and on piano it moves `k-sharm-24`/`-25` (borrowing in drop 2 / drop 3) down to T7, because "borrowing finishes before the 8 expressions".
  - `g-harm-13`, "Borrowing on other string sets: drop 2 on 5-4-3-2 and 6-5-4-3, drop 3 …", is grade 10 via `GUITAR_GRADE_UP`. §4.2 places it at **T8**, beside `g-harris-11` (the 8 expressions).
  - So borrowing comes back after the expressions on guitar. That is the topic hop the piano override exists to prevent.
- **Fix.** Place `g-harm-13` at T7 with `g-harm-10`/`-11` (override; reason: Harris order). Guitar harmony becomes T7 11, T8 8.

### 3. The RSL bass Debut / Grade 1 row is misquoted
- **Evidence.** The cited 2012–2018 guide, Technical Work p. 26, lists:
  - **Debut** (♩70): major, minor pentatonic, **Arpeggios – Major, Arpeggios – Minor** (E, A).
  - **Grade 1** adds natural minor and major pentatonic. It adds no new arpeggios.
- **What §2.3 says instead.** The Debut arpeggios are "(open-position major and minor chords, strummed)", and G1 adds "major, minor" arpeggios.
- **Consequence.** §4.3 then needs a made-up override for `b-chord-4`: "G1 → T0: Debut's Group B is the same major and minor chords in open position".
- **Fix.**
  - Correct the row: Debut has major and minor arpeggios; G1 adds no new arpeggios.
  - Drop the override. `b-chord-4` both rows is T0 by syllabus.
- **While editing §2.3:** in the 2012 table, double-stop "Chords" (dom7, m7) start at **G6**, not G7. Either check the 2018 spec for "high-register chords", or tier `b-chord-14` from G6 (T5) and label it.

### 4. The style-only add-ons keep a lock that SPEC-STYLE-FOCUS §8.1 removed
- **Evidence.**
  - The §7 checklist says that in `guitarLevelShown` (guitar.ts:2888), "the style-only add-ons keep it", meaning the gate. That function returns `false`, so the level is hidden.
  - SPEC-STYLE-FOCUS §8.1: "No locks … The jazz pack is removed as a lock in every course."
  - The plan's own §1.3 table says style-only items are "still open by hand (no locks)".
- **Fix.**
  - Remove the add-on gate for every add-on, and the country flag as well.
  - Style-only items stay visible and openable. They are only unweighted, and they are excluded from rank "available" for learners without that style.
  - Update the §7 "Style gate" row to say this.

### 5. "Voicing vs arpeggio" has no stated rule, and the same material is split across areas
- **Evidence.**
  - The harmony area (fixed tempo, "no nps rungs") holds broken diatonic chords on every degree:
    - piano `k-sharm-11` (7ths arpeggiated), modes included;
    - guitar `g-harm-2` (3rds, broken), `g-harm-4` (triads, arpeggiated) and `g-harm-6` (7th arpeggios on every degree). These fill guitar harmony T3–T7: 15 of its cells.
  - The arpeggio area (nps spans) holds the same kind of material one step up: `k-sharm-47`/`-48` and `g-harm-16` (9th chords on every degree, **arpeggiated**).
  - The split follows today's code blocks (S → harmony, B → arpeggios; realCatalogue.ts calls this mapping "an assumption"). §4.2's own "Rule" lists only struck voicings as harmony rungs.
- **Why it matters.**
  - A builder cannot tell whether "arpeggiated 7ths on every degree" gets nps rungs.
  - The §7 guard "no voicing has an nps span" cannot be written without a definition of a voicing.
- **Fix.**
  - State the rule once. For example: struck chords (block, drop, shells, comping) are voicings, in harmony at fixed tempo. Broken chords are arpeggios, which may carry nps rungs. Or: broken chords on every degree belong to the harmonised-scale spine and stay in harmony.
  - Then move `k-sharm-47`/`-48`/`g-harm-16` or the S-block broken chords to match, and recount piano and guitar arpeggios and harmony.
  - Either choice is defensible; the inconsistency is not.

---

## Minor notes
1. **Line start tempos vs §1.4.**
   - §1.4 says the swing band "sets the start tempo". But `k-hlfast` starts at ♩160–170, below the piano **T7** band (168–195), for a T8 item, and `g-hlfast-1` starts at ♩140, inside the guitar T7 band.
   - `b-barry-6` (bass T7, scales) has a catalogue floor of ♩120, which is the bass **T8** band.
   - The bass bands leave ♩110–120 unassigned.
   - Fix: say that each line item starts at its own catalogue start, capped at its tier's band top, and that the band sets only the tolerance. Or give one start formula. Close the bass gap (for example T7 ♩100–119).
2. **Unplaced shown guitar levels.** These are neither placed nor excluded:
   - `g-harris-3` (grade 7 → T6 line);
   - `g-harris-5` (grade 8 → T7 line);
   - `g-vl-2` (drop 2 by step, grade 6 → T5 harmony, before `g-harm-7`);
   - `g-vl-3` (grade 7 → T6);
   - `g-harrisline-8` (upbeat comping, grade 7 → T6 harmony);
   - `g-solojazz-2`–`4` (T8);
   - `g-harm-1` (grade 3).

   Place them, or list them as not rungs. `g-vl-2` would also smooth the drop-2 entry.
3. **Floor tiers created by the re-band.**
   - Guitar independence has 4 of 8 tiers at the floor (T1, T3, T5, T6), with 32-day transitions.
   - T5 depends on `g-picking-10` (chicken-pickin', untagged, so core). That item is correct under the §1.3 rule.
   - This is allowed by v14. Name the new rule-generated sequence levels as the planned fill, rather than leaving it to the flow audit.
4. **Bass span table details.**
   - `b-chord-17` (cells, home T1) gets nps rungs only at T3. The other T1 rungs also get T2. Add T2, or say why not.
   - `b-chord-13` counts as 4 exercises at T7 (by option) but as 1 at T8. Count it the same way in both.
   - The bass T2 bench of 1.4 is a blend of G2 (1.33) and G3 (1.5). Mark it [E].
5. **Drum seeds.** `d-pas-6`, `-7`, `-10` and `-11` seed to **T8** (G8 + 140…290), yet they are placed at T7. List them as family overrides, as `d-pas-1`–`5` are.
6. **Voice top and "never full".** The amended §1.10 rule, "never full below T8", would leave a voice rank bar that can never be full, because voice tops out at T7. Add: "or below the course's top tier (voice: T7)".
7. **`v-part`** ("One part from the score", ABRSM aural B) is read from notation. §6.2 counts it as harmony while excluding `v-quick` as reading. Say why: the graded skill is holding the part. Harmony T7 has ≥ 9 items without it.
8. **Same-tier order.** Harris order inside a tier (piano T8: the expressions before "in context"; guitar T7: `g-harm-9` moving inversions before `g-harm-10` borrowing) depends on rung order, because rank does not order items within a tier. State that the rungs must be listed in that order.

## Q12 (still open)
- **Keep the cap (Q11).** This is consistent and safe. Voice T7 is full: pitch 8, time 6, range/agility 10, harmony ≥ 9. The cost is minor note 6 and a voice radar that stops at T7.
- **Open T8.** Moving the rating-T8 levels up leaves:
  - pitch T8 = 2 (`v-barry` 307, `v-scale` 108): the floor, below the ≥ 3 target;
  - time 3, agility 3, harmony about 4–5 (`v-scat` 1504–1510, minus trading fours).

  T7 falls to pitch 6, time 3 and agility 7, all still above the floor.
- **Gaps in the "open T8" option.** It needs:
  - **a decision on `voiceTop`.** The Q12 text says "plus `voiceTop`", but §6.2 maps `v-arp2`/`v-leaps`/`v-runs`/`v-part` to T5–T7 [E]. Say whether they move to T8.
  - **a cents band for T8** (30 ¢, or tighter);
  - **a T8 voice probe** in the level test;
  - **a label that it is rating-only.** No vocal syllabus defines a technical diploma tier; the diplomas are performance-based.

  No level that would move is a range extreme (`v-top` stays coverage only), so vocal health is not an obstacle.

## Checks passed
- **Copyright.** Chord charts only. The standards in `b-walk-11`/`13`/`14`/`18` use stdKey offsets on charts. No protected melodies.
- **No Claude-composed music.** Every new item is rule-generated or a card the player improvises on.
- **Only verified theory.** Hidden items stay out. The shown parts of `k-sharm-40`/`41` are the only parts used.
- **All 12 keys.** "More keys" is never used as a tier step.
- **Rubato first,** including the at-tempo twins.
- **No tempo gating** in walking or voicings (apart from issue 5's definition gap).
- **The course-change checklist** is complete: openers, unit openers, skill map, level test, guards, glyphs, badges, i18n and placement.
- **The jazz early opening** is capped by v14 entry.
- **The RSL G2–G8 rows, the ABRSM guitar speeds and the factor arithmetic** are correct, and the estimates are labelled [E].

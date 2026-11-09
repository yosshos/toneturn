# Bass course: second-round validation (2026-11-09)

This is a read-only check of `redesign-v2` at `33b406f` ("bass: merge the measurement (A) and content/app (B) tracks…").
It is measured against `BASS_AUDIT.md` (first audit, fix list §5) and `BASS_CURRICULUM.md`. No app code or tests were
changed.

Every claim was checked in code. Claims marked **[run]** were also confirmed by a throw-away vitest script
(`tests/_audit2/`, now deleted) that did four things:

- ran YIN on synthetic bass tones;
- generated every bass level in every key on the `bass`, `bass5`, `bass6` and `bass-dropd` tunings;
- fed made-up takes to `analyzeGuitarTake`;
- drove `applyTake` → `levelStars` → `withLadderFacts`, and the placement functions.

**[e2e]** means `e2e/bass.spec.ts` was run and passed (4/4, Chrome, 375 px). The existing unit suites also pass
(`tests/bass*.test.ts`, `levelPass`, `guitarDrills`: 114 tests), and `npx tsc -b` is clean.

**Short version.** Almost all of the first audit's P0s are fixed and work:

- the low register is heard;
- thumps and missing ghosts fail;
- the pass rule is 3 clean takes at the target tempo on 2 days;
- notation uses the bass clef and the tab shows the whole drill;
- free levels are judged by rules and show only the chart;
- drums sit behind a headphones gate;
- placement uses the doc's rules.

The merge and wiring introduced **three new P0 bugs**:

1. **Four levels can't be passed.** One of them is `b-pluck-2` on the main path.
2. **Walking placement is broken.** It is capped at L2 now. After the obvious fix, a player who plays only roots would
   be placed at L7.
3. **The first reading exercise can't hear the low notes.** Its untimed note-naming takes still use the 70 Hz / 2048
   capture.

Each fix is small.

---

## 1. Fix-list status (BASS_AUDIT §5)

### Track A (analysis and measurement)

| ID | Status | Verified |
|---|---|---|
| A1 Bass pitch tracking | **done** | **[run]** `bassPitchOpts`: MIDI 23 (B0), 26, 28 (E1), 31, 33, 35 read exactly, both with a full spectrum and with a weak fundamental (the 22 Hz floor and the 28 Hz floor both read B0). The guitar default still can't read 28–36 (unchanged by design). `DrillTake` passes `captureOptsFor(drill)` (DrillTake.tsx:437). `withBassTuning` sets `spec.tuning`, so a 5-string player gets the 22 Hz floor **[run]**. **Exception:** the untimed take doesn't use it (new bug N3) |
| A2 Unpitched onsets are timing only | **done** | **[run]** All-thump takes on generated drills come out **not** ("N notes not heard clearly"): chord L1, walk L2, pocket L1, walk L7 and time L1 |
| A3 Ghost classification | **partial** | **[run]** All-pitched takes come out **not** on ghost L1, L2, L3, L5, slap L3 and styles L5. The right mix (pitched + dead) comes out clean. But ghost L6 (32 dead notes, the RSL 6–8 study), styles L10 (12 dead), read L9 (14 dead) and ghost L4 have **no `ghostClass` goal**: an all-pitched take is **clean** **[run]** (N8) |
| A4 Pass = 3 clean takes at target on 2 days, Slower never counts | **done in the engine, partly broken by the target lookup** | **[run]** One clean take after "Slower" at 30 bpm on every item gives 0 stars and no path step (pluck L1, chord L1, read L1, time L10). An honest climb, then 3 clean takes at target on 2 days, gives 3 stars and step `tech:…` done. `App.notePathResult` returns early for `tech` steps (App.tsx:1007), so only `withLadderFacts` (≥ 2 stars) passes a step. **But** `levelOfDrill` returns the wrong level for 4 levels, so their ladder goal stops below the level's target and they can never pass (N1) |
| A5 Free choice judged by rules | **done, with gaps** | **[run]** Walk L7: the model line is clean; a valid alternative line (3rd on beat 1, other chord tones, chromatic approach into each change) is **clean**; a ♭9 on beat 1 of bar 2 gives **almost** ("chord tone on 85 % of the changes"). Same on walk L13, L16, chord L8, read L8, walk L14 and upright walk L5. **Gaps:** (a) on long charts one "other" note on beat 1 stays **clean** (Tune Up, walk L11: 1 of 16+ changes is under the 10 % margin, as the doc's ≥ 90 % allows); (b) a roots-only line in alternating octaves passes walk L11, L13, L16 and upright walk L5 (N6); (c) the "written" bars of read L8 and read L12 are judged by chord-tone rules, not note for note (N5) |
| A6 \|mean offset\| rule + pocket targets | **done** | Code: guitarAnalyze.ts:746–753, ≤ 25 ms on mic and ≤ 15 ms on MIDI. Pocket L6 has `pocket: [0, 15, −10]` and a 70 % share |
| A7 Bass mic thresholds | **done** | `bassThresholds(band, mic)` in `analyzeGuitarTake`. Unit-tested |
| A8 Shift gap, drift, swing, per-subdivision bias | **partial** | Wired: `shiftGap` (fret L4–5, chord L7/L11, scale L5), `swing` (pocket L3/L5, swung styles), `subBias` (time L2/L3/L9), `drift` (**pluck L5 only**). Time L6 (one click per bar, doc: drift ≤ 20 ms/bar) has no drift gate |
| A9 Ring-through, release, overlap, MIDI note-off | **done** | Length L3 (`ringThrough: 0`), L4 (`release ±40`), L5 (`overlap 30`). With MIDI, `soundedMs` uses `p.off` |
| A10 Parity by expected index; crossing with open strings | **done** | Unit tests in `bassMeasure.test.ts` |
| A11 Bass into skills | **done** | `events.ts` secondTag: b-time / b-pocket → timing, b-walk / b-chord → harmony, sub `instrument/bass-tech` |
| A12 Plucking-zone gate | **partial (not wired)** | `zoneShift` exists and is tested, but **pluck L9 (`kind 'zone'`, bass.ts:406–411) never sets `goal.bass.zone`**, so the level still passes on timing alone |
| A13 Slap advice | **done** (advice only, as designed) | `slapAdvice` on the slap styles (bass.ts:1955) |
| A14 Groove fingerprint from bass onsets | **done** | `recordTakeAnalysis` in `DrillRun.done` (commit 9927064). Not run |

### Track B (content, UI and placement)

| ID | Status | Verified |
|---|---|---|
| B1 Bass clef, an octave up | **done** | **[e2e]** read L3 → `.drill-staff[data-clef="bass"]`. DrillTake.tsx:169–174: tenor clef for the upright's upper register. The untimed take draws `clef="bass"` +12 |
| B2 Whole tab, paged and following the beat | **done** | **[e2e]** walk L2 has 7 lines, pager 1–2 / 7 → 3–4 / 7, one screen. No 32-note cap left |
| B3 Free levels show only the chart; the model line is opt-in | **done** | **[e2e]** walk L7. Unit: chord L1/L8/L9, walk L7/L11, read L6–8 have `show: 'chart'` |
| B4 Wrong notes (B9–B13) | **done** | Unit tests, plus **[run]** a sweep of every level × key × 4 tunings: **0** notes below the lowest string and **0** string/fret ≠ pitch |
| B5 Headphones gate + drums | **partial** | **[e2e]** gate shown before drums, speaker → click. Drums play only with headphones or MIDI (DrillTake.tsx:374), and pocket L8 plays real fills. **But the kick lock is still measured against the written notes**: `goal.bass.kickLane` is computed (bass.ts:221) and **never read** (grep: no consumer; guitarAnalyze.ts:791). On styles L1 the line has 33 onsets and the kick lane 17 **[run]**, so "Locked with the kick" is plain timing against the bass part. There is no landing score for pocket L8 (doc: ±15 ms) |
| B6 Placement by the doc's rules + task 0 | **partial (P0 bug)** | Pocket → L3, scale → L4, pluck → L6, ear → L5 and slap → L3 can all place above L2 **[run]**. Pluck no longer seeds `b-length`. Task 0 reads B0 with the 28 Hz floor **[run]**. **The walk task is broken** (N2): **[run]** the probe's own model line scores beat-1 chord tones of 0.75 and lands at walk L2 |
| B7 Eighth-note meters | **done (display)** | `pulse: 8`, ♪ in the header, x/8 signature. **Leftover:** the target lookup ignores `pulse`, so the 7/8 and 10/8 items start *at* their target, with no ladder: time L10 op2 140 → 140, styles L12 op12 180 → 180, styles L13 op14 180 → 180 **[run]** (N9) |
| B8 Duplicates and leaps | **done** | Unit tests: no duplicate items, no 7-fret leaps in ½ beat |
| B9 Swung 16ths that swing | **done** | Unit test: ≥ 4 late "e"/"a" per bar, swing goal set |
| B10 Reading forces notation; untimed level | **partial (P0 bug)** | Notation is forced (unit test + e2e). Read L1 `clef-name` is untimed with 2 s per note, but **its mic capture is the guitar default** (N3). Also, its "tempo" ladder still runs 40 → 60: about 30 meaningless clean takes per item before it can pass **[run]** |
| B11 Bass ear family | **done** | 8 levels after `b-chord`. Band part plays, onsets in band bars are ignored, answers are hidden (unit tests) |
| B12 Own bass tuning + migration | **done** | `bassTuning`, `bassTuningOf`, migration in progress.ts:388. `tests/bassSettings`. Minor: `Instrument.tsx:189` bass diagrams use `defaultTuning('bass')`, not `bassTuning` |
| B13 Low B | **done** | **[run]** 5-string walk L17 goes below E1. On a 4-string, walk L17 and styles L14 fall back to E1 but **keep the "low B" title** and stay on the 4-string path (N10) |
| B14 Badges + exam tags | **done** | Unit test, all 5 boards |
| B15 Missing curriculum content | **done** | Chord L11–14 (2-octave 7ths, 9ths, altered, high-register chords), scale L10 (5 positions as items), styles L13 (Hijaz, 10/8), read L10 (Nashville key switch), read L11 (roadmaps), read L12 (quick study) |
| B16 Upright track | **done, with 3 unpassable levels** | 6 families on the `upright` (fretless) tuning, a cents gate on mic and a bow flag. On the path only for upright / fretless **[run]** (`ladderFamiliesFor`). But up-scales L3 and up-pizz L2–3 can't be passed (N1) |
| B17 Topics | **done** | **[e2e]** time / reading / ear / upright tabs |
| B18 More standards | **partial** | 23 tunes (doc: 36), each in its own key and feel (walk, two-feel, bossa, ballad) |

---

## 2. New bugs from the merge and the wiring

| # | Sev | Where | Scenario / evidence | Fix |
|---|---|---|---|---|
| **N1** | **P0** | `plan.ts:72` `levelOfDrill` | It matches a level when every key *of the template* equals the drill's spec. A template that is a subset of a later level's spec matches first. Wrong level for **b-pluck-2** (→ pluck-1), **b-up-pizz-2/3** (→ pizz-1), **b-up-scales-3** (→ scales-1/2) and b-ear-4 (→ ear-3; harmless, same target). `DrillRun` passes `itemTargetBpm(drill)` (Drills.tsx:570), so the ladder goal stops at the *wrong* target, while `levelStars` asks for the *right* one. **[run]** 600 clean takes at the goal over 10 days: pluck-2 goal stuck at 100 (needs ≥ 104.5), up-pizz-3 stuck at 140 (needs 190), up-scales-3 stuck at 52 (needs 57) → **stars 1, never passes**. Pluck-2 is the second step of the bass path | Match exactly: compare the union of keys, ignoring `key`, `tempo` and `tuning`. Or keep the level id on the drill when `levelDrills` builds it, and look it up instead of matching. Add a test: for every level and item, `levelOfDrill(d).id === level.id` |
| **N2** | **P0** | `Drills.tsx:732` `bassMeasure` (walk task) | Since the merge, `rules.chart[].tones` are **intervals** (bass.ts:1097–1098), but `bassMeasure` subtracts the root again. On Dm7 the root then "isn't a chord tone". **[run]** The probe's own model line gives beat1Ct 0.75 → walk L2 / chord L2, so the walk task can never place above L2 | `iv: c.tones` |
| **N2b** | **P0** (shows once N2 is fixed) | `bassAnalyze.ts:510–517` `walkRules`, `bassProbes.ts:131` `placeWalk` | An "approach" is counted for *any* note a 5th / step / half-step from the next root, chord tones included. On Dm7–G7–C a roots-only line has every root a 5th above the next. **[run]** with correct intervals, roots only gives beat1Ct 1, approach 0.67, rootShare 1 → **walk L7 + chord L8** (levels 1–6 marked done by test) | Count an approach only when the note isn't a chord tone of its own chord (`lab` other/tension). Require `rootShare < 0.5` for L7, and `< 0.75` for L4 as now |
| **N3** | **P0** | `DrillTake.tsx:663` `UntimedTake` | `listenLoop(new BrowserPitchCapture(), …)` without `captureOptsFor(drill)` uses the 70 Hz floor / 2048 window. Read L1 `clef-name` asks for 36, 33, 29, 43, 28, 31, 47, 38, 29, 33: **7 of 10 notes (E1–C2) return no pitch on a mic** **[run]**, so every mic user fails this item. The level can still reach 2★ through its 3 timed `clef` items, but the first reading exercise is broken | Pass `{ ...(captureOptsFor(drill) ?? {}) }` as `listenLoop`'s 5th argument (as at line 437). Read the median pitch 40–120 ms after the first stable frame |
| N4 | P1 | `guitarAnalyze.ts:790–797` | The kick lock is timing against `drill.notes`. `goal.bass.kickLane` is unused (B5 is only half done) | Lock = share of `kickLane` hits that coincide with a written bass onset and have a played onset within ±tol. Strays = played onsets on no written note |
| N5 | P1 | `guitarAnalyze.ts applyRules` (514–545) | `freeFrom` only affects the display (Drills.tsx:95). Read L8 (`freeFrom 8`) and read L12 (`freeFrom 16`) accept any chord tone in the **written** bars **[run]**: a fully re-invented line is clean | In `applyRules`, slots with `beat < drill.freeFrom` keep the written pitch (no substitution, no rule) |
| N6 | P1 | `ruleCheck` kind `walk` | Roots only, alternating octaves (no exact repeats), is **clean** on walk L11, L13, L16 and upright walk L5 **[run]**. Walk L7 only fails it by chance (8 % repeats) | For `walk`: `rootShare ≤ 0.5` and ≥ 25 % approach/passing labels; add a "Why?" line |
| N7 | P1 | bass.ts:406 (pluck L9) | A12 not wired (see §1) | `bass: { zone: 1.15 }` on `kind 'zone'` (with calibration) |
| N8 | P1 | ghost L4, L6; styles L10; read L9 | Dead notes are written, but there is no `ghostClass` goal: all-pitched takes are clean **[run]** | Add `ghostClass: 0.9` (0.85 for styles) |
| N9 | P2 | `plan.targetBpmOf` | Eighth-pulse items have start = target (no ladder) **[run]** | For `pulse: 8`, target = `tempo[1] × 2`, or state the level range in eighths |
| N10 | P2 | walk L17, styles L14 | On a 4-string they duplicate E-floor content under a "low B" title | Hide them when `lowest(tu) ≥ 28` (path and hub), or retitle |
| N11 | P2 | the A4 design | **[run]** The minimum clean takes for 2★ is **≈ 24,000** across the 176 bass levels. Chord L6 alone needs ≥ 1,440 (60 items, 15 raises each); scale L4 ≥ 576; walk L16 ≥ 540. That's correct for a coach but heavy for a path step | 2★ = half of a *sample* of the keys (e.g. 6 of 12, rotated), or start items at 80–85 % of target, or +6 % steps above 80 bpm. Product call |
| N12 | P2 | `App.tsx:982–983` | The workout still credits a tech step from one session's first-try share (`stepStars`). That's workout credit only, not the path | Use `techStars ≥ 2` for tech steps too |
| N13 | P2 | stored `pathFacts.steps` | Tech steps saved at 1★ by builds before 0.64 stay "done" (`path.isDone` = stars > 0; `withLadderFacts` only raises) | One-off migration: drop `tech:b-*` step facts below 2★ |

---

## 3. Curriculum re-validation

Status is ours vs the requirement. "Covered" means the drill exists, it is judged by a measure that matches the
requirement, and it can be passed. Exam tags are on the level cards (B14).

### RSL Rockschool bass, Debut–Grade 8

| Requirement | Our family / level | Status | Reason |
|---|---|---|---|
| Debut: maj/min pentatonic E, A at 70 | scale L1 (70 → 110) | covered | Low register now heard |
| Debut: 4-bar rhythm reading on E | read L2 | covered | Bass clef, drums with headphones |
| Debut–3: rhythmic recall (echo 2 bars to drums) | ear L5 | covered | Band part, answer bars after it |
| Gr 1–3: major, natural minor, pentatonic, blues; triad + dom7 arpeggios at 70–90 | scale L1–3, chord L4, L6 | covered | |
| Gr 1–3: riff over a backing track | styles L1–4 | partial | Drums only, no harmony band under the take |
| Gr 3–6: melodic recall | ear L6 | covered | |
| Gr 4–6: harmonic recall (roots of I-IV-V-vi) | ear L3–4 | covered | |
| Gr 4–5: 1-octave scales in 8ths at 80; harmonic minor (Gr 5) | scale L2–7 | covered | |
| Gr 5: 2-octave maj7 / m7 / dom7 arpeggios | chord L11 | covered | |
| Gr 4–5: Improvisation & Interpretation (written + improvised bars) | read L8 | partial | Written bars not judged as written (N5) |
| Gr 6: 5 minor-pentatonic positions | scale L10 (5 items), L5 linked | covered | |
| Gr 6: Dorian / Mixolydian, 2 positions, at 100 | scale L4 (target 110) | covered | |
| Gr 6: m7♭5, dim arpeggios; 7th shapes | chord L6 | covered | |
| Gr 6–8: stylistic studies (rock 16ths, funk slap, jazz upper register) | ghost L6, slap L5–6, legato L3, fret L8 | partial | 8-bar studies; ghost L6 doesn't classify ghosts (N8); no 16–32-bar study with a band |
| Gr 7: Lydian, Phrygian, melodic minor | scale L7–8 | covered | |
| Gr 7: 9th arpeggios; high-register chords | chord L12, L14 | covered | |
| Gr 7–8: natural harmonics | legato L5 | covered | 1 item |
| Gr 8: whole-tone, diminished, altered | scale L9 | covered | |
| Gr 8: 7♯5 / 7♭5 / 7♯9 / 7♭9 arpeggios at 100 | chord L13 (target 100) | covered | |
| Gr 8: odd-time grooves; up-tempo walking | time L10, styles L12–13; walk L12 | covered | 7/8 items have no ladder (N9) |
| Gr 6–8: Quick Study Piece (lead sheet + improvised bars) | read L12 | partial | Written bars rule-judged (N5) |
| Ear tests Gr 6–8 (chord quality / inversions) | ear L4, L8 | partial | Roots and slash bass by ear; no chord-quality recognition in the bass course (the general ear games have it) |

### Trinity Rock & Pop bass

| Requirement | Ours | Status | Reason |
|---|---|---|---|
| Technical focus Gr 2: slides, rests, dynamics | legato L1, length L1, pluck L6 | covered | |
| Technical focus Gr 4: 16ths with crescendo, articulation, note lengths, stamina | pluck L5 (drift), L6, length L2 / L7 | covered | |
| Technical focus Gr 7: feel changes, sliding octave double-stops, slap accents, fast picking | pocket L7, legato L4, slap L5, pick L5 | covered | |
| Scales / arpeggios per grade | scale, chord families | covered | |
| Session skills: playback | ear L5–6 | covered | |
| Session skills: improvising over a rock/pop chart | read L8, chord L8–9, walk L16 | partial | Rule-judged free bars exist, but the pop/rock one (read L8) has N5, and the rest are jazz/walking charts |

### ABRSM double bass (upright track)

| Requirement | Ours | Status | Reason |
|---|---|---|---|
| Scales / arpeggios from memory, Gr 1–8, ♩ 40 → 76 | up-scales L1–9 | partial | Content and tempi right; **up-scales L3 can't be passed** (N1) |
| Arco: separate / slurred / hooked bows | up-arco L1–6 | partial | Bow flag and timing only; the bowing itself can't be heard |
| Simandl positions, half → thumb | up-pos L1–6 | covered | Cents gate on mic |
| 3rds, dominant 7ths, diminished 7ths | up-scales L5–8 | covered | |
| Intonation | `goal.bass.cents` on every upright drill (mic) | covered | |
| Studies / pieces (lists A–C) | none | missing | Piece coach could host them; out of the technique track |
| Sight-reading incl. tenor clef; treble clef (Gr 8 thumb) | up-read L1–4 (tenor in L4) | partial | No treble clef |
| Jazz pizz / walking (ABRSM jazz bass) | up-pizz L1–3, up-walk L1–5 | partial | **up-pizz L2–3 can't be passed** (N1); free walk has the roots-only hole (N6) |

### Israeli bagrut, 5 units, pop-rock bass

| Requirement | Ours | Status | Reason |
|---|---|---|---|
| Memorised transcription played with the recording | ear L7 (short walking line) | partial | Short, engine-made line; no real-recording transcription |
| 2-chorus solo | walk L15 (blues, chord-scale rule) | covered | Any scale tone passes; no phrasing judgment (by design) |
| Blues / ballad / medium / fast pieces with a band | styles L4, L2; walk L11/L13; walk L12 | partial | Drums only, with headphones; no harmony band |
| Sight-read improvisation over a progression | walk L16 (new chart per key) | partial | A roots-only line passes (N6) |
| Improvisation in every piece | walk L11, L13, L14 rule-judged | partial | Same N6 hole |
| Theory (intervals, scales, modes, key signatures, chord types, tensions) | general theory course | partial | Not tied to the bass course |
| Ensemble interaction | none | missing | Out of scope for a solo app |

### Berklee / MI core

| Requirement | Ours | Status | Reason |
|---|---|---|---|
| Walking construction (Friedland order) | walk L1–10, L12, L16 | covered | Free levels rule-judged; N6 |
| Chord tones / voice leading | chord L1–14 (L8–9 rules) | covered | |
| Reading (Appleman-style, charts, Nashville, roadmaps) | read L1–12 | covered | N3 / N5 aside |
| Styles (rock … Latin, gospel, metal, odd meter) | styles L1–14 | covered | |
| Time and groove with a drummer | time L1–10, pocket L1–8 (drums with headphones) | partial | Kick lock not measured against the drum kick lane (N4); no landing score for fills |
| Standards repertoire | walk L11, L13, L14 (23 tunes) | partial | Doc asks for 36 |

---

## 4. Verdict

**Not yet "complete and correct" for a public beta. It is close: three small P0 fixes away.** The measurement and pass
path that made the first audit fail now works on real generated content [run]. The content sweep is clean on all
tunings [run], and the UI acceptance tests pass [e2e]. What blocks a beta is the new wiring bugs, each a few lines.

**Must fix (P0)**

1. **N1 `levelOfDrill`** (plan.ts:72): match on the exact spec (union of keys, ignoring key, tempo and tuning), or carry
   the level id on generated drills. Test: every item of every level maps back to its own level. This unblocks pluck L2
   (main path), up-pizz L2–3 and up-scales L3.
2. **N2 + N2b walking placement**:
   - in Drills.tsx:732 use `iv: c.tones`;
   - in `walkRules`, count approaches only on notes that aren't chord tones;
   - in `placeWalk`, require `rootShare < 0.5` for L7.

   Tests: the probe's model line → L7; roots only → ≤ L2.
3. **N3 untimed capture**: pass `captureOptsFor(drill)` into `UntimedTake`'s `listenLoop` (DrillTake.tsx:663).
   Test: an E1 / A1 tone through the same options gives a pitch. Ideally also take untimed items off the tempo ladder
   (target = start), so read L1 passes on 3 clean takes on 2 days.

**P1 leftovers:**

- N4: kick lock against `kickLane`.
- N5: written bars exact in read L8 and L12.
- N6: roots-only walking must fail.
- N7: pluck L9 zone gate.
- N8: ghost class on ghost L4/L6, styles L10, read L9.
- A8: drift on time L6.
- B5: pocket L8 landing score.

**P2 leftovers:**

- N9: 7/8 and 10/8 targets.
- N10: low-B levels on 4-string.
- N11: path effort (≈ 24k clean takes to 2★ everywhere; chord L6 ≥ 1,440). Product call.
- N12: workout credit for tech steps.
- N13: migrate old 1★ tech facts.
- B12 neck diagrams.
- B18: 13 more standards.
- Content still missing: ABRSM pieces, the treble clef, bagrut real-recording transcription and ensemble (out of
  scope).

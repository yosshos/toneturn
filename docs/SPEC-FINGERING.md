# SPEC-FINGERING: training correct fingering inside normal practice (v15, 2026-11-28)

**v15** resolves review round 14 (`docs/REVIEW-FINGERING-round14.md`): R14-1 to R14-4 and its minor notes, checked against `keyCoach.ts` (`enter` ≈ 315–344 starting at `comfortOf`, the limited `review(a6, lastGood)` branch ≈ 434, the speed path's step-back and `limit`) and `coach.ts` (`tempoOf`'s integer grid, `climbFrom`'s 2 ♩ minimum). **v14** resolved review round 13 (`docs/REVIEW-FINGERING-round13.md`): R13-1 to R13-3 and its six minor notes, checked against `keyCoach.ts` (`enter` / `comfortOf` ≈ 315–344, `canTrip` ≈ 621, the note-value flip ≈ 1048, `setPulse`'s `snapDown` ≈ 270, `closingMs` ≈ 232, `closingDue` ≈ 1166, the exits ≈ 1174), `ladder.ts` ≈ 143 and `coach.ts` `tempoOf`. It is written against two code fixes in flight (§17): `passLog` admits clean takes at ≥ 0.95 × the catalogue target regardless of `goalBpm`, and band-landing rounding is fixed. **v13** resolved review round 12 (`docs/REVIEW-FINGERING-round12.md`): R12-1 to R12-4 and every minor note, checked against `keyCoach.ts` (the closing's `visitBudget = remaining`, the exits at ≈ 1174, `gradedUp` ≈ 174–193, `setPulse`), `Drills.tsx` `done()` (kind ≈ 1762, `applyTake` ≈ 1772, `setBpm(lad.next.bpm)` ≈ 1807), `ladder.ts` ≈ 143 (`passLog` only when `!slower`) and `coach.ts` `tempoOf` ≈ 358. **R12-4 is a coordinator decision** (checkpoint runs exempt, following the owner's level-test pattern). **v12** resolved review round 11 (`docs/REVIEW-FINGERING-round11.md`): R11-1 to R11-3 and every minor note, checked against the code (`keyCoach.ts` `setPulse` ≈ 261–278 with its 10 % step cap and Maelzel snapping and `known`/`noCap`, `enter` ≈ 345, the run-rung speed path with `dir = 'hold'` and `STEP_TAKES`, `nextVisit`; `Drills.tsx` `lad.next`, `go` / `bpmOf` and `goalBpm` in list runs; App `techResult` and its callers' ids; `quests.ts` `tech3`). **v11** resolved review round 10 (`docs/REVIEW-FINGERING-round10.md`): R10-1, R10-2 and every minor note, checked against the code (`keyCoach.ts` `openVisit` ≈ 430–434 and its `review(a6, stretchTarget)` branch ≈ 446, `keyIndex.ts` ≈ 493–551 run rungs, `coach.ts` ≈ 468 time-up and ≈ 335 side takes, `Drills.tsx` ≈ 1721 any-note Next and `go()`). **v10** resolved review round 9 (`docs/REVIEW-FINGERING-round9.md`): R9-1 to R9-4 and every minor note, checked against the code (`progress.ts` `addSessionStats` / `goodSessions` / `gemsOf`, `stats.ts` `counts.perfect` and `records.fastPerfect`, `achievements.ts` `historyPerfect`, `keyCoach.ts` `warmLeft` / `warmNext` / `review` / `chal` / `lastGood` / the closing, `coach.ts` `nextKeyIdx` and the weak-spot review). **v9** resolved review round 8 (`docs/REVIEW-FINGERING-round8.md`): R8-1 to R8-4 and every minor note, checked against the code (`cloud.ts` `rowCounts` as shipped in 0.145.17, `keyCoach.ts` `ksAfter` / `nextVisit` / `openVisit` and its `leave = 'budget'` path, `coach.ts` `coachAfter`'s pass and park paths and `nextKeyIdx`, `Drills.tsx` `go` / `done()` / `hfSchedule` / `hfMiss`, `types.ts` `ItemState`, App `drillFamilies`). **v8** resolved review round 7 (`docs/REVIEW-FINGERING-round7.md`): the 3 issues S1–S3 (round-7 numbering) and every minor note, checked against `keyCoach.ts` (`KsState`, `openVisit`, `nextVisit`, `ks.finished`, `closingMs`), `coach.ts` (`c.at`, the plateau rule, `ceiling`), `Drills.tsx` (`persistCoach`, `coachNext`), `coachRun.ts` (`OpenRun`, the queue save), App `techResult`, and SP §21 A2. **v7** resolved review round 6 (`docs/REVIEW-FINGERING-round6.md`): the 5 issues N1–N5 (round-6 numbering) and every minor note, checked against the code (`drillSync.ts`, `rebuildProgress`, `portableSettings`, App `take()` and `drillWrites`, `drillLock`, `CoachState` and `coachGo`, `done()`). **v6** resolved review round 5 (`docs/REVIEW-FINGERING-round5.md`): the 3 issues F1–F3 and every minor note. **v5** resolved review round 4 (`docs/REVIEW-FINGERING-round4.md`): the 4 issues P1–P4 and every minor note, and cites **H2 v16** throughout (section numbers re-checked against the v15 text: §1.4, §1.6, §1.7, §1.7a, §1.9, §1.16 are unchanged in number). **v4** resolved review round 3 (`docs/REVIEW-FINGERING-round3.md`): the 7 issues M1–M7 and every minor note. The reviewer confirmed v3's three author choices (silent thresholds 5 and 10, the mean + 1 SD tolerance, no hold on manual starts and pins), with the M3 and M6 adjustments applied. **v3** resolved round 2 (`docs/REVIEW-FINGERING-round2.md`, N1–N9) and **v2** round 1 (`docs/REVIEW-FINGERING-round1.md`, S1–S9). All change logs are in §20. The owner accepted the reviewer's defaults for Q1–Q7 on 2026-11-28 (§19, decided) and added one requirement: a fingering-coach setting in Settings (§14.6). **Q8 and Q9 were decided by the owner on 2026-11-28** (§19): Q8 = (a), Q9 = the triplet rungs. **H2 moves to v16** with four owner decisions (the tier guard at P ≥ 0.9; a warm-first skip always counts as a miss, with a UI warning before the take; a merge downgrade within 24 h re-derives rank; H10 targets per area kind); this spec is aligned with them in §9.9.

**Sources.** `docs/RESEARCH-FINGERING.md` (RF1) and `docs/RESEARCH-FINGERING-2.md` (RF2). This spec does not re-research; every evidence claim cites a section there.

**Integrates with:** the key session (`keyCoach.ts`, SPEC-KEY-SESSION-2 = KS2), the spiral rotation (SPEC-SPIRAL-PRACTICE = SP), cold evidence, the cold staircase, the V1 pass and rank (SPEC-HOLISTIC-2 v16 = H2; section numbers as in v15), teacher assignments (`coach.ts`), hands-free runs, SPEC-INPUT-SOURCE (IS), the take traces (`tendency.ts`), the calibration upload (`calibUpload.ts`).

**The problem in one line.** A wrong fingering survives at slow tempo and breaks where the preparation time runs out, mostly on descents (RF1 §1.1; RF2 §2). Hardwick et al. 2019 is an arbitrary stimulus–response remap, not a motor sequence, so it is indirect evidence (RF2 §5). The owner's D-major descent shift does **not** repeat in C, E♭, G or B♭ (RF2 §2), so everything here is **per cell, which includes the key**.

---

## 0. Owner decisions (2026-11-28)

| # | Decision | Where |
|---|---|---|
| O1 | **Mixed design.** One focused 6–8 min block on the day a fingering is learned or retrained, replacing that item's visit. Then short fingering visits in the rotation while the item is flagged. Retired after confirmations on 2 different days. | §6, §7, §11 |
| O2 | **The vanishing pause is the main fingering ladder** (1 beat → ½ → ¼ → a sixteenth → none at the item's tempo), beside the normal tempo ladder. | §5.3, Q1 |
| O3 | **Position rhythm with player-placed long notes** (the score does not show them) is a variant. | §5.2 |
| O4 | **Self-report only twice a day per item:** after the day's cold take of a flagged item, and after the top take of a climb. Highest key = OK, lowest key = slipped, plus a second press for the hand. A pedal tap also means OK. Spoken input is optional, and only after the piano has decayed. | §8 |
| O5 | **R2:** while an item is in retraining, its plain straight climb stops at the reported fingering edge + 1 metronome mark and continues above that only in variants. Rank and passes are never affected. | §9.2. R2 applies only with evidence, a data flag or a reported slip (§9.2.0, N8). The honest limit of "never affected" is §9.2.3, Q8. |
| O6 | **Per-note logging** starts now on the calibration accounts (built: F1, trace v3, shipped in 0.145.16). | §2.1 |
| O7 | **Blocks on a new key's first appearance** (one take per hand), skipped when the probe marks A-1/A-2 passed. | §10 |
| O8 | **Scales first;** arpeggios in a later step. | §1.5 |
| O9 | **Drums orchestrated stickings** (R on one pad, L on another) are the second instrument. | §12 |
| O10 | **Guitar picking and bass plucking direction are skipped** until a data signature exists. | §13 |
| O11 | **A fingering-coach setting** (owner 2026-11-28): undo an accidental "Not now" or "Stop", turn offers off, list the cells in retraining with a way to end each. | §14.6 |
| Q1–Q7 | **Decided** with the review's defaults (owner 2026-11-28). | §19 |
| Q8 | **Decided (owner 2026-11-28): option (a).** Pass-evidence attempts run only once the cap is within 2 marks of the probe band (or the cell is `preTop`, or its threshold estimate is in the band), in every session in which a held cell is played. | §9.2.3, §19 |
| R12-4 | **Coordinator decision (2026-11-28), following the owner's level-test pattern:** checkpoint technique runs (`checkpoint-tech`, `atTarget`) are exempt: no hold cap, no fingering visits, blocks or attempts windows inside a checkpoint. | §9.2.3 |
| Q9 | **Decided (owner 2026-11-28): accepted.** Triplet items use P2 = ⅔ beat and P3 = ⅓ beat with a triplet click. | §5.3, §19 |
| RF1 | Also accepted from round 1: XP from practice time only, never from reports; the pause-at-crossing check once per new item and band; reports may label calibration traces; the camera later; an auto-offer at the session end that the player can decline. | §14, §5.3, §16, §4 |

---

## 1. Terms

### 1.1 Cell and identity (S6)
- **Cell** = H2 §1.4: family + level id + key, with no hand group. RH, LH and HT items of one key share one cell. **The cell's main item** is its HT item where one exists.
- **All fingering state is keyed by the cell** (`cellKey`), with the hands inside. "The item" in this spec means the cell's main item, unless a hand item is named.
- **Evidence is pooled across the cell's items per hand.** The RH line of the RH item and of the HT item is the same fingering. Sites are identified by pitch, not by note index, because the index differs between items (§1.3).
- **R1 reads "the cell's main-item cold check"** (H2 §1.4, "cold check first").

### 1.2 Expected fingering and signatures
- **Expected fingering** of a note = the player's own number where entered (`ownFingering.ts`), else, when the item is not marked own, the suggested `ExpNote.finger`. An item marked own **with no number at a note** has no expected finger there, and no crossing is claimed at that note (owner 2026-11-17: a suggestion is never a fact).
- **Two signatures (S5.6)**, computed from the drill's **full** note list (never the truncated `nl.f`):
  - `fsOwn` = a hash of the own-fingering mark plus the player's numbers. **A change is a new fingering** (R3, §9.3): the state resets.
  - `fsSug` = a hash of the suggested finger string. A change comes only from the generator code (`generate.ts`). **It re-keys the state without losing it:** evidence before the change leaves T1/T2 (the map differs), and E, the confirmations and the state stay. The block is offered again only when the flagged group's crossing pitch moved.
  - `fs` = `fsOwn` when the item is marked own, else `fsSug`. It is written on every v4 trace (F1b).

### 1.3 Crossings, sites, groups, residuals
- **One class array (N4).** Every class in this spec is `noteLog`'s `x` (`tendency.ts`), **unchanged**: `u`/`o` come from the expected fingering with `afterCrossing` (`touch.ts`), and **the crossing wins over the boundary** (`c`). `takeTrace` does the opposite (`if (onBoundary) return 'oct'` runs before the crossing test). This spec keeps `noteLog`'s mapping and handles the difference with one derived bit per crossing note, **`bd`** = its pitch class equals the hand line's boundary (the line's first pitch class, the trace's `boundary`):
  - **Crossing note** = class `u` (thumb under, going out) or `o` (3/4 over the thumb, coming back) with `bd` false.
  - **Boundary crossing** = class `u`/`o` with `bd` true (in D major: the RH thumb on D going up, the LH thumb on D going down). It is a **site of its own** (its group carries a boundary mark) and is logged separately in `xs` (§2.2). It is **excluded from R_g, T1 and T2** by default, as `takeTrace` excludes it (it is `oct` there). Whether it joins later is a shadow-mode question (§16.2).
  - **For the suggested fingering** the crossing notes are therefore exactly `takeTrace`'s `xu`/`xo` notes, and the reference notes below are exactly its `cls[j] === null` notes, so R_g is the statistic of the trace's class means, on which the ♩100 replay ran (§3.2). **For own fingering** `takeTrace` claims no crossings while `noteLog` uses the player's numbers; there is no class-mean counterpart.
- **Direction** = down when the written pitch is below the previous note of the same hand's line. LH `u` and RH `o` are descents (RF2 §2).
- **Group** = (hand, class, direction) over crossing notes, e.g. "LH thumb-under going down". **Site** = (group, pitch class of the crossing note). A site names the place ("at F♯") and recurs per octave.
- **Reference notes** = notes of the hand's single line whose class is `.` (not `u`, `o`, `c`, `t`, `b`, `l`, nor a chord note `-`), not an edge, with `p === 0`.
- **Residual of any note (S5.4, S5.7)**: r_j for every non-edge note j whose played pitch is right (`p === 0`, S5.3) is computed **at trace time with the trace's own rule** (`tendency.ts` `sidePredict`, as `takeTrace` uses it for class notes):
  - from each side of j separately: the 6 nearest reference notes of j's run on that side, **at any place in the beat**, fitted with one level per place in the beat and one shared slope, and **≥ 2 of them at j's own place**; j's prediction is the level at its place;
  - **both sides, when both exist, must agree in sign**, otherwise j has no residual; **one side suffices** when the other has too few references (`tendency.ts` keeps such notes); r_j is the mean of the available sides;
  - j itself is excluded from its own reference.
  - Edges: the first 2 notes and the last max(5, 2 × notes per beat) notes of a line (the trace's `EDGE_START`/`EDGE_END`).
- **The hand's local SD** `sdl` = the SD, over the hand's reference notes in the take, of each reference note's **side-0 residual**: the 8 nearest reference notes of its run on both sides together, one level per place and one shared slope, ≥ 2 at its own place (the rule `pc` already uses). The two-sided sign filter is **not** applied here: it would drop near-zero residuals and inflate the SD (minor). It is not `HandTrace.sd`, which uses a whole-run line fit.
- **Group residual of a take** R_g = the mean r_j over g's crossing notes in the take (boundary crossings excluded).

### 1.4 Edges, states, takes
- **Fingering edge** E(cell, hand) = the highest tempo at which the expected fingering is believed to hold. It is kept in **notes per second** (KS2 §3) and shown as ♩ in the note value played (KS2 U9). Its sources are in §9.4.
- **One mark** = SP §1: one Maelzel mark, at least 2 ♩, on the played ♩.
- **Cap** = E + 1 mark (R2, §9.2).
- **Goal** G = 0.95 × the item's target (§11.1).
- **State per cell:** `none` → `flagged` → `offered` → `retraining` → `retired` → `done`, with rechecks as sub-states of `retired` (§11). **A decline is per hand** (`snoozeUntil`, `declines`), never a cell state.
- **Hold** = R2 applies to a `retraining` cell. Only a cell with evidence of a slip is held (§9.2.0, N8).
- **Fingering take** = a take played as one of the §5 structures (A, B, C at P1–P3, G, drums O). New `TakeKind` **`fingering`** with the same zeros as `form`. **`TAKE_KIND` alone isolates nothing** (it is read only by the tendency filter, `tendency.ts:641`), so a fingering take is kept off the item's record, the progress writes and the coach by its own path, `takeFingering()` → `store.recordFingering` → `fingerAfter()` (§9.8, M1, F1). Straight takes inside a block or visit, **P0 included** (§5.3), are ordinary takes of their normal kind with no `vr`: they count as usual and are eligible evidence (N7).
- **Touch point** = one of the two moments in a day when the report is asked (§8.1).
- **Non-take notes are not sounding (minor).** Range-learning presses, report and hand answers, zone notes and slip-mark presses are never takes: they never set `lastSound` (H2 §1.4) and never make the cell "sounded" under H2 v16 §1.6's skipped-check rule.

### 1.5 Scope of v1
- **Piano:** family `scales`, kind `scale`, every mode with expected fingering, all 12 keys, every hands option. **Not** chromatic (no thumb-under pattern), not swung items.
- **Arpeggios:** a later step (O8, F11).
- **Drums:** orchestrated stickings (O9, §12).
- **Out:** guitar and bass fretting position (later, RF2 §10), picking and plucking direction (O10), voice.

---

## 2. What exists, and the small trace additions (F1b)

### 2.1 F1 (built, 0.145.16): the per-note log (trace v3)
`TakeTrace.v = 3` with `nl: NoteLog` (`tendency.ts` `noteLog()`), parallel arrays, one entry per written note of a hand, in score order, at most `NOTE_LOG_MAX = 96`:

| Field | Content |
|---|---|
| `h` | hand per note (`R`/`L`) |
| `b` | written onset in twelfths of a beat |
| `e` | written pitch |
| `p` | played pitch minus written (0 = right key; null = not matched) |
| `d` | onset residual vs the grid (ms) = deviation − the take's `lead` |
| `v` | velocity (0 = not matched) |
| `o` | note-off − the next same-hand note-on (ms) |
| `x` | class from the expected fingering: `u o t b c l .`, `-` for chord notes |
| `f` | expected finger digit (`0` = none) |

MIDI piano, comparable takes only. On the device, the newest 500 traces keep `nl` (`trimNoteLogs`). Upload only through the calibration path (`toneturn_calib_traces.trace`), `nc` excluded.

### 2.2 F1b: trace v4 (a build step; no code in this spec)
v3 cannot run the triggers as specified (S4, S5). F1b adds, all computed when the trace is built from the full `perNote` and the drill:

| Field | Content | Why |
|---|---|---|
| `fs` | the fingering signature (§1.2) | evidence selection; R3 vs re-key |
| `vr` | the take's variant and feel: `drill.spec.variant` when not `even`, the SP feel id when the feel layer ships, `B`/`C`/`G`/`A`/`O` for fingering structures | exclude non-straight takes (S5.1) |
| `cell` | the cell key (§1.1) | pooling across the cell's items |
| `xs` | per hand, per group present: `[R_g, n, brk, maxAbs]` and up to 3 sites `[pc, r]` (the group's sites with the largest mean \|r\| in the take); boundary-crossing groups (§1.3) logged the same way under their own key; `sdl` per hand | T1/T2 inputs (§3), the named place (§3.2); tiny |
| `cd` | `true` when the take was the cell's cold take (H2 §1.4) | T1 bands exclude cold takes (§3.1) |
| `to` | `true` when the take failed on timing only (every matched note `p === 0`, no misses) | T2 includes these (S5.5) |
| `fg` | fingering content and the report (§15.4) | labels, ladder telemetry |

- `click` (the thinned-click marker) already exists and is read as "not full click".
- `NOTE_LOG_MAX` rises to **120**, so a 4-octave hands-together scale (114 notes) logs whole and keeps its descent (minor note).
- **The trace version becomes 4.** v3 traces stay readable. Their `xs` can be recomputed from `nl` (`bd` from `e`, the line's first pitch class) with a documented approximation (calibration export only, and G5b); live triggers read v4 only.

### 2.3 The evidence store (S4)
`nl` is trimmed after 500 traces, which is about 5 days at the owner's rate. That cannot carry a 21-day trigger. So:
- **`fingerEvidence`** (device IndexedDB, separate from the trace list and its trim): per cell, per hand, per group, the eligible takes' rows `{at, nps, R_g, n, brk, sites, maxAbs, sdl, verdict, to, cd, fs}` (≈ 40 B each). It keeps the **last 60 rows or 28 days**, whichever holds more, and never less than 21 days.
- Written at trace time from `xs`, for eligible takes only (§3.1).
- **Flags are computed per device** from this store. The flag **result** (state, group, c*, t, Δ, and the frozen MIDI reference of §11.3) lives in the synced `fingering` store (§15.1), so the offer and the retraining state are shared across devices. The evidence itself is not synced in v1.
- **Calibration accounts:** the server copy (`toneturn_calib_traces`, now with `xs`) is the reference for the shadow analysis (§16.2). The client never reads it back.

### 2.4 Reused pieces
| Piece | Where | Use here |
|---|---|---|
| Suggested and own fingering | `generate.ts`, `ownFingering.ts` | the expected fingering |
| `afterCrossing` | `touch.ts:388` | crossing classes |
| `sidePredict`, edges | `tendency.ts` | residuals (§1.3) |
| Rolled-chord spread | `touch.ts` | blocks grading |
| Take kinds, traces | `tendency.ts` | `fingering` kind, v4 fields |
| Stage ladder, flow pulse, marks | `keyCoach.ts`, `stages.ts` | tempo side |
| Old coach, assignments, `!` | `coach.ts` | the mirror rule |
| Rotation, visits, feels, bursts | SP §2, §15.4, §16 (spec; the rotation is not yet in `coach.ts`) | fingering visit = an angle |
| Cold evidence, staircase, pass, rank, H10 | H2 §1.4–§1.9, §1.7a | R1, §9.2, §11 |
| CC listener, pedal invert, octave shift, crosstalk filter, Web Speech | `speech/midi.ts`, `speech/webspeech.ts` | report input, drums |
| Brief gate, auto count-in | `useBriefGate`, KS2 D6 | briefs |
| Self-prediction slot | H2 §7 | one question per take (§8.6) |

---

## 3. When a cell gets flagged

A flag is an **offer**, never a verdict. MIDI cannot see the finger (RF1 §3.3, RF2 §3), and a correct fingering can also shift with tempo (RF1 §3.2). T1's precision is unknown until labelled (§16.2).

### 3.1 Eligible takes (per cell, per hand)
Rows of `fingerEvidence` from the last 21 days whose take was:
- v4; `src = 'midi'`; not `nc`, `other` or `swing`;
- **straight**: `vr` absent (no variant, no feel, no fingering structure) (S5.1);
- **full click**: no `click` marker (S5.2). Thinned clicks grow with familiarity, so with tempo; they would confound the band split;
- **for T1, not a cold take** (`cd` absent): cold checks cluster in the probe band and carry the cold effect. They stay the confirmation evidence (§11), and T2 keeps them;
- kind ∈ {normal, retention, review, challenge, probe};
- verdict clean or almost; **for T2 also** "not" with `to` (timing-only failure) (S5.5);
- `fs` = the cell's current `fs`.

Only right-key notes have residuals (`p === 0`, S5.3). **Never pooled across keys** (RF2 §2). A constant lean at all tempi is the tendency line's business (`sessionTendency`), not a fingering flag.

### 3.2 T1: a crossing shift across tempo bands
For each group g of a hand:
- for each Maelzel mark c (the take's played ♩ converted to nps), the **lower band** is the takes with nps in [c/1.25, c), the **upper band** those in [c, 1.25 c], each with ≥ 5 takes (clean or almost);
- Δ = mean R_g (upper) − mean R_g (lower); t = Welch's t.
- **Fires** at some c when:
  - |Δ| ≥ max(20 ms, 8 % of the written IOI at c);
  - |t| ≥ 3 (several splits are tried);
  - ≥ 70 % of the upper-band takes lie on Δ's side of the lower band's mean.
- **c\*** = the firing mark with the largest |t|. **The MIDI edge** = one mark below c*.
- **The place named** = the site of g with the largest mean |r| over the upper band's rows (the per-site `[pc, r]` in `xs`).

**Replay (S5.8):** on the owner's D-major class means (RF2 §2), LH `xu` fires at **c\* = ♩100** (Δ ≈ +31 ms, t ≈ 5.9, 100 % on Δ's side), so the MIDI edge is ♩96. D RH `xo`, and C, E♭, G and B♭ stay quiet. The thresholds are provisional until shadow mode (§16.2).
- **The tempo/date confound (minor).** The upper band's takes are mostly newer (the climb), so a crossing residual that drifts across days can read as a tempo shift, and Welch's t treats same-session takes as independent. That is acceptable for an **offer** behind the shadow gate (§16.2). Two remedies are on the re-fit list, evaluated on shadow data: require **both bands to hold takes from ≥ 2 distinct days within the same 7-day window**, or **detrend** (a day term beside the band term). The owner's D-major data come from one day, so the ♩100 replay cannot test either.
- **It is the same statistic (N4).** Those class means are `takeTrace`'s `xu`/`xo`, which equal R_g for the suggested fingering (§1.3). The one difference is the cold-take exclusion, which v1 traces cannot apply.
- **A per-note replay waits for v3/v4 traces.** The server holds 157 v1 traces and none with `nl` yet (round 2). G5 is a fixture test on the class means; G5b repeats it from `nl` once traces exist (§18).

### 3.3 T2: break takes at a crossing
- A take is a **break take** for hand h when its largest |r_j| over all non-edge right-key notes of the hand line falls on a crossing note of group g and is ≥ max(30 ms, 3.5 × `sdl`) (RF1 §3.3).
- Eligible: clean, almost, and timing-only failures (`to`). The owner's clearest break (D ♩124, RH `xo` +96 ms) was a failed take (RF1 §3.2).
- **Fires:** 2 break takes of the same group within 7 days in one 1.25× tempo band. The MIDI edge = one mark below the slower of the two.
- **Strength for offer ranking:** 3 + the number of break takes of g in 21 days (a t-equivalent, minor note).
- **R_g can rest on one note.** In the owner's D-major two-octave HT scale every take has **exactly one** LH `xu` note (round 3 recomputed this from the traces: `[x, 1]` on every take), so R_g there is a single note's residual, and break and T2 rates read **per note**, not per crossing group.

### 3.4 T3: a report
- A "slipped" at any touch point flags the cell and hand at once, with its date (`t3At`).
- **The slip mark (N6).** Touch points ask only on cells that already have a state, so they cannot start a flag. Any in-scope cell, with or without a state, can get a **slip mark** that the player gives without being asked:
  - **when:** within 4 s after any straight take of an in-scope cell (§1.5) has decayed (the §8.2 decay rule); no window is shown;
  - **how:** a **double press in the bottom zone** within 1 s (zones learned, §8.3; a single press does nothing, so noodling after a take never flags), or ←, ↓ or PageUp on computer keys or a page turner, or "לא"/"no" when voice is on, or the item menu's **"My fingering slipped"** in any run (the tap route, also on mic);
  - on HT takes the hand question follows as in §8.3 (its own line, shown 1 s after the "slipped" press);
  - **inside an open report window (P4)** the slip mark and the "slipped" answer are **the same event**: one T3, at most once per cell per day. **Two bottom presses within 1 s are always one slip with the hand unknown**, never "slipped" plus a left-hand answer (§8.3, §9.4);
  - **the end line confirms it** with one clause, "Noted: left hand slipped in D major.", and an **Undo** chrome button. Nothing needs a tap to keep it;
  - at most one slip mark per cell per day. It is a report (T3), with the take's tempo as the slipped tempo (§9.4);
  - **introduced once** (minor): the first time a session plays an in-scope cell, a one-line brief (§14.3) names the gesture; on MIDI that brief also learns the keyboard range when it is not yet known (§8.3), so the double press works before any cell has a state. The Settings card can learn it too (§14.6). The "Retrain this fingering" brief names the slip mark as well;
  - zone notes during a hands-free countdown neither start a take nor count as count-in input;
  - **drums:** the ride bell when the kit maps one, else two kicks 80–400 ms apart, within 4 s after the last stroke has decayed (§12.3).
- **What a slip does, by state (M4).** One path, used by §4, §7.1 and §9.2.0:

  | Cell state when the slip arrives | Result |
  |---|---|
  | none, `flagged`, or `done` | → `flagged` with `t3At` (T3 ends a snooze). **No hold.** Visits **without a hold** for 7 days (§7.1). The next end line carries the offer (T3 ranks first; after a keep-hold question, §11.5). With "Suggest fingering work" off: recorded only, no visits, no offer. |
  | `flagged`, Yes given | → `offered` → day-1 block → `retraining` **with the hold** (the slip is the evidence), E from the slip (§9.4). |
  | `flagged`, no Yes within 7 days of `t3At` | the visits stop; the flag stays (`flagged`) and can be offered again. |
  | `offered` (block pending) | recorded; the block runs; `retraining` starts with the hold. |
  | `retraining` without a hold | **adds the hold at once** (the cell is in retraining by the player's choice or the teacher's pin); E from the slip. |
  | `retraining` with a hold | lowers E (§9.4). |
  | `retired` (recheck period) | a failed recheck: back to `retraining` with the hold (§11.4). |

  So **a slip alone never caps a cell that has not been through Yes, a manual start or a pin** (Q7): one accidental double press costs at most 7 days of visits and one offer.
- The slip mark works on mic too.

### 3.5 Guards
- No expected finger at a site: T1/T2 skip it.
- The cell's main item must be **acquired** (SP §1, D1).
- v1 scope only (§1.5).
- **Snooze per hand:** "Not now" snoozes T1/T2 for that cell and hand for 14 days; a second "Not now" on the same cell and hand, 28 days (Q4, decided). T3 always flags and ends a snooze. A T1 flag with t ≥ 5 may be offered once inside a snooze; it still waits for Yes (Q7, decided).
- **After retirement** T1/T2 keep running. A fire during the recheck period brings the next recheck forward (§11.4); it does not re-offer until `done`.
- **Only new evidence fires (F3, N4).** Let **`exitAt` = max(`retiredAt`, `stoppedAt`)**. For a recheck pull-forward and for an offer on any `retired` or `done` cell (retired, or stopped by "Stop", "End" or the silent timeout), T1 and T2 are computed **only over rows after `exitAt`** (§15.1), with their normal minimums (≥ 5 takes per band; 2 break takes). v6 covered only `retiredAt`; its fallback ("rows after `stateUpd`") was met by one new take added to the old rows, so a stopped cell was re-offered the next session. For other states, a fire counts as new only when it meets its minimums on rows after the cell's last state change. Otherwise the rows that produced the flag, still inside the 21-day window, would re-fire at once and collapse the 7- and 21-day rechecks into consecutive days.
- **Mic setups:** T1/T2 need MIDI. Flags on mic come from T3 (the slip mark, §3.4) or a manual start (the item page's "Retrain this fingering").

---

## 4. The offer
- **Where:** one clause in the end line of a session (coach, key session, list run) in which the flagged cell was played. Never mid-session, never in the level test, never in a `!` assignment.
  - At most **one end-line question per session** (M3): the keep-hold question (§11.5) first; otherwise one offer, ranked T3 first, then by t (T1) or the T2 strength. A deferred offer waits for the next session.
  - Off when **Settings → Learning → Fingering coach → "Suggest fingering work"** is off (default on; synced; §14.6).
- **Line:** "Above ♩100, your left hand's way down in D major changes. A fingering block next time?" Two small chrome buttons, **Yes** and **Not now**. In hands-free runs the answer keys also work within 6 s (top = yes, bottom = not now). No answer = not now, without the snooze.
- **Yes** → `offered`. The day-1 block replaces that cell's next visit in the next session where it appears; if it is not in today's plan, the planner adds it once.
- **Not now** → that hand is declined and snoozed (§3.5); the cell stays `flagged`.
- **No auto-start (Q7, decided):** visits never start from a data flag alone. R2 restricts the player's climb, so it needs consent.
- **Manual entries (no flag needed):** the item page ("Retrain this fingering", a standalone block now, §6.1), the item menu in a coach run ("Fingering block next"), a teacher pin (§9.5). **A manual start or pin without a flag or a reported slip runs the block and the visits without a hold** (no R2) until evidence arrives (§9.2.0, N8).
- **An honest exit:** "Stop fingering work on this item" on the item page (or "End" in the settings list, §14.6) sets `done` with `stoppedAt`, lifts R2 at once, and costs nothing (§14.2). Settings → "Offer again" reverses it.

---

## 5. The structures and what MIDI verifies

Each structure turns the *position map* into something MIDI can see (RF2 §3). None verifies the finger at speed.

| | Structure | Written as | MIDI verifies | Graded on | Mic |
|---|---|---|---|---|---|
| A | **Blocks** (§5.1) | each hand position as one chord | grouping: notes within 40 ms, exact pitch set, nothing extra | grouping | not offered |
| B | **Position rhythm** (§5.2) | even notes; "long on the last note of each position" | where the long notes fall | map match | not offered |
| C | **Vanishing pause** (§5.3) | the note before each crossing lengthened (its real value), click subdivided | the pause placement | segment evenness + pause placement | **HS only:** placement verified from onsets (one line); HT C is MIDI only |
| G | **Crossing cell** (§5.4) | 2 notes before to 2 after one crossing, as bursts | burst evenness and landing | SP §15.4 burst goal | yes |

### 5.1 A: Blocks
- **Generator** `positionBlocks(drill, hand, fingers)`: cut the hand's line at each crossing note; each segment is one chord (`chordId`). Example, RH D major: D-E-F♯ ▸ G-A-B-C♯ ▸ D. One chord per beat at min(♩60, comfort), full click, count-in, now-cue. Up, then down with the descending map.
- **Grading:** each chord's onset spread ≤ 40 ms (`touch.ts` rolled-chord measure), the exact pitch set, no extra notes. A miss names the group.
- **Limit (RF2 §3 A):** any three fingers can block three notes. It proves knowledge of the map, not execution.
- One take per hand. Kind `fingering`.

### 5.2 B: Position rhythm (variant)
- **Generator** `positionRhythm(drill, hand)`: written even. The score **does not mark** the long notes; the brief says once: "Make the last note of each position long."
- **Long note** = IOI ≥ 1.5 × the take's median IOI. **Map match** = the set of long notes equals the set of notes just before a crossing, across the take. A misplaced one is named.
- **Grading:** the map match is the verdict; wrong notes fail as usual; timing loosely (the SD against the player's own long/short pattern ≤ the band threshold × 1.5).
- **Its own feel group** `positions` (S8): its own session tempo, peak and limit (SP §16.4 style), never shared with the rate-keeping group. It runs only inside fingering visits. Chip "Positions" / "מנחי יד". Kind `fingering`.

### 5.3 C: The vanishing pause (the main ladder)
- **The rungs (Q1: P4 dropped):**

  | Rung | Added pause | Twelfths of a beat |
  |---|---|---|
  | P1 | 1 beat | 12 |
  | P2 | ½ beat | 6 |
  | P3 | ¼ beat | 3 |
  | P0 | none: the straight run | 0 |

  Every rung is a whole number of twelfths, on `b`'s grid.
  - **Triplet items** (`subDrill` triplet eighths, `stages.ts:204`; minor): P2 = ½ beat and P3 = ¼ beat would put the following notes at 4k + 6 and 4k + 3 twelfths, off the eighth and sixteenth click. For triplet items **P2 = ⅔ beat (8 twelfths) and P3 = ⅓ beat (4 twelfths), with a triplet click**. **Decided by the owner on 2026-11-28 (Q9, §19).** P1 stays 1 beat; duple items are unchanged.
- **Generator** `pauseAtCrossings(drill, hands, rung)`:
  - the note before each crossing of the trained hand(s) gets its **real lengthened value**: e.g. in eighths, P2 makes it a quarter and P3 a dotted eighth. No comma or breath mark: the pause is metered;
  - on hands-together items both hands hold;
  - **the click subdivides** on C takes to the rung's grid (eighths at P2, sixteenths at P3; triplet eighths at both for triplet items), so every shifted note sits on a click (S3). Count-in and now-cue as usual.
- **Grading (S3, minor):** the take has **one IOI** (the written grid) with **one offset per segment** between pauses. The shifted grid is not a reading test, but a free line per 3–4-note segment would hide rushing. Evenness = the SD of the onsets against that grid after each segment's offset. Each pause's length must be within ±max(25 ms, 25 % of p). Wrong notes and misses as usual.
- **Placement verified** when each crossing's IOI ≥ IOI + 0.5 p and every other IOI < IOI + 0.5 p.
  - **The floor:** 0.5 p ≥ max(20 ms, 3 × `sdl`) on MIDI; 0.5 p ≥ 60 ms on mic (mic takes have no `sdl`).
  - **It is not always met** (v2 said it was): in eighths near ♩240, P3's 0.5 p is 31 ms, below 3 × `sdl` once `sdl` > 10 ms.
  - **When the floor is not met,** the take is graded on evenness and pause length only, the rung is kept (an unverified take never shortens it), and the next C take plays **one mark slower**, where p is longer. If the floor is still not met at T_C − 2 marks, the visit uses G and B in place of C that day; **on mic, G only** (B is not offered on mic; minor).
- **Two tempos, defined (S3):**
  - **C tempo** T_C = min(the item's session tempo, cap + 1 mark). Without a session tempo yet, min(the item's last clean tempo, cap + 1 mark). Without a hold (§9.2.0) there is no cap, and T_C is the session tempo. This is the item's tempo, as O2 and RF2 §9 say. T_C is where C starts; **only in the key session's cap visit** may C and B climb above it, to cap + 3 marks (§9.2.2). G keeps its own range (§5.4).
  - **Straight start tempo** T_S = min(the session tempo − 1 mark, cap); on day 1 see §6.2. P0 is the first straight take, at T_S, **never above the cap**.
  - **P0 is an ordinary straight take of its normal kind, with no `vr`** (N7). It counts as usual (`cleanBpm`, the warm half) and is eligible evidence. The straight takes after it follow the straight ladder (§5.5). P1–P3 are fingering takes and never touch the item's record (§9.8).
- **The ladder within a visit or block:**

  | Take result | Next take |
  |---|---|
  | clean, placement verified | the next shorter rung (P2 → P3 → P0) at the same tempo; P0 at T_S |
  | clean, placement not verifiable | the same rung one mark slower (the floor rule above) |
  | clean at P0 | the C sequence is done for this visit; the straight ladder continues (§5.5) |
  | not clean, or placement wrong | the same rung **one mark slower**; a second failure → one rung longer at that slower tempo (P1 stays P1 and goes one more mark down) |
  | failures at P1 | down one mark each time, floor the comfort pulse, then ♩40, then free time (KS2 review 3) |
  | "almost" | holds once at the same rung and tempo; counts toward nothing (KS2 U3). The only repeat G4 allows. |

- **No (rung, tempo) pair is played twice in a visit or block (N7).** When the table lands on a pair already played, the take moves to the nearest unplayed tempo within ±1 mark, faster first (never above T_C); if there is none, the visit goes on to its next step.

- **Across visits:** the cell remembers per hand the shortest rung cleared last time (`rung`). The next visit starts there, or one rung longer if the last visit failed it. **Tempo progress comes from the item's own session tempo and the cap**, not from the pause ladder, so the ladder always works at the item's tempo.
- **No touch point at P0 itself (S3).** Slips are reported at the top straight take (§5.5, §8.1).
- **The plan check** (RF1 accepted, once per new item and band): one P1 take when the cell enters retraining, and again when T_C first exceeds 1.25 × the last plan-check tempo. A wrong placement gets one line naming the places, then one repeat. A second wrong placement suggests marking own fingering. Never a grade.
- **Develops (key-session-must-develop):** within a visit every clean take shortens the pause or raises the tempo, and no take repeats its structure, rung and tempo, except one "almost" hold (G4). The visit's tempo is the session tempo, which rises by the normal rules up to the cap.

### 5.4 G: The crossing cell
- **Generator** `crossingCell(drill, site)`: from 2 notes before the crossing to 2 after (Engel 1997: 1–2 keystrokes ahead; RF2 §5). SP §15.4 bursts: the cell, a one-beat rest with the click going on, 4 times.
- **Tempo:** first take at 1.10 × T_C; each clean take +1 mark, up to 1.25 × T_C. After a miss: stop-and-go.
- **Grading:** the `burst` goal. Kind `fingering`. Full click.

### 5.5 The straight ladder in a block or visit (N7)
Every block and visit ends with straight takes. One rule governs them, so a straight take never plays twice at one tempo (key-session-must-develop; KS2 D3: a clean take is followed by one a mark faster):
- **The ceiling:** the cap with a hold; the session's normal limit without one; **on day 1, E** (the block's closing stays below the edge, RF2 §8.3), or **the day-1 reference** when there is no E (§6.2, M5).
- **Start:** the straight part starts at T_S (with P0 when C ran).
- **Each clean straight take is followed by one a mark faster**, up to the ceiling.
- **At the ceiling** the straight part stops. In the key session's cap visit the variants take over (§9.2.2); elsewhere the visit ends. The clean take at the ceiling is the visit's **top take** (touch point 2, §8.1), and it meets end-on-success (SP §1).
- **After a miss (R14-1),** the next straight take is the recovery take: **the highest mark, in the take's note value, whose nps is below the lowest straight nps of the cell's visit (or block), is not in `fgDay.played`, and is ≥ the comfort pulse's nps**. A clean take there ends the straight part, end-on-success. A second miss takes the next such mark down by the same rule. **If no mark qualifies** (the visit started at the comfort pulse, as visit 0's ordinary climb does, `enter` → `comfortOf`), there is no recovery take and the straight part ends. After the second miss the straight part ends. (v14's "one mark below, floor the comfort pulse" repeated the comfort pulse.)
- "Almost" holds once (the only repeat).
- **Never a tempo already played straight in the same visit or block.** The pass-evidence attempts (§9.2.3) are the only straight takes above the ceiling, each at its own tempo.

---

## 6. The day-1 block (O1)

### 6.1 When it runs
Always **after the cell's main-item cold check of the day** (R1). **Due checks come first in the budget (minor):** every planner keeps every cell's due cold checks (counting checks, slots, FSRS reviews, guard probes; H2 v16 §1.6, §1.7) ahead of the 8-minute block and the visits in the session budget. A due check pushed to the end and left unplayed is a skip, which counts as a guard miss once the skip share passes 20 % (H2 v16 §1.7 step 6).
- **Key session (R8-2):** it takes **the rest of the cell's current visit after its cold-check take** (visit 0 for the scale), exactly like a fingering visit (§9.8 item 9). Never inside coordination stages.
- **Rotation (SP §2, once built):** it replaces the cell's next visit. It counts as one visit with its own budget.
- **Old coach, linear path, assignments (R8-3):** the next take of the cell starts the block; **then the cell is done for the session**, as after a visit (§9.8 item 9). v8 said "then the climb resumes", which would have repeated tempi already played straight in the block.
- **Standalone (item page):** the cold check first if the cell is cold, then the block.
- **Not** when the main item is not acquired, in the level test, or in a `!` session (unless a teacher pinned it).
- **Mic:** A and B are skipped; C runs hands separately (onset-verified); HT C is skipped.

### 6.2 Steps (budget 8 minutes, hard)

| # | Step | Clean takes needed | Tempo |
|---|---|---|---|
| 0 | Brief (first appearance only) and the fingering numbers on the score | — | — |
| 1 | Cold check if due (R1); touch point 1 after it if clean | 1 | H2 §1.9 |
| 2 | Blocks A, the flagged hand first (both if unknown, RH first) | 1 per hand | min(♩60, comfort) |
| 3 | C, the flagged hand alone: P1 (plan check) → P2 → P3 → P0 | ≥ 4 | T_C (P0 at T_S) |
| 4 | Cell G at the named site | 2 | 1.10–1.25 × T_C |
| 5 | HT items only: C P2 → P3 → P0 | ≥ 3 | T_C (P0 at T_S) |
| 6 | **Closing:** the straight ladder (§5.5) from one mark above the block's last P0 of the main item, up to **E**, ending on a clean one (end-on-success +2, SP §1); touch point 2 after the top one | 2–3 | ≤ E |

- **Day-1 tempi:** P0 plays 2 marks below E (floor the comfort pulse), so the closing can rise to E without repeating a tempo. The hand-alone P0 (step 3) and the HT P0 (step 5) are different items, so different takes.
- **Without E (M5)** (a manual start or a pin with no evidence, §9.2.0): the **day-1 reference** is the item's session tempo, else its last clean tempo. P0 plays 2 marks below it (floor the comfort pulse), the closing ceiling is the reference itself, and T_C is the reference. Step 6's "≤ E" reads "≤ the reference".
- About 13–20 takes, 6–8 minutes for a two-octave scale with count-in (RF2 §8.2).
- When the budget runs out, the current take finishes, then step 6 (≥ 2 takes).
- One closing line (§14.4).

### 6.3 After the block
State → `retraining`, `blockDay` = today, with a hold only when the cell has evidence (§9.2.0). Visits from the next day (§7). The block does not repeat unless the fingering changes (R3), the player asks, or a second recheck fails (§11.4).
- **Why mixed and not a daily block:** blocked practice retains worse after first acquisition (Shea & Morgan 1979; RF2 §8.2). Abushanab & Bishara 2013 compared random and fixed order *across melodies*; applying it to "blocked on day 1, spaced later" for one item is **an analogy**.

---

## 7. The fingering visits (from day 2, while retraining)

### 7.1 Eligibility
A cell gets a fingering visit in a session when all hold:
- state `retraining`, or `flagged` with a T3 report in the last 7 days (`t3At`), the latter **without a hold** (§3.4 table; the visits stop after 7 days without a Yes). A data-only flag without Yes gets **no** visits (Q7, decided);
- its main-item cold check of the day is done (R1);
- the session has ≥ 10 minutes;
- **at most 1** fingering visit per cell per session, and at most **2 cells** per session;
- the feel-pool order (SP §16.3): never on consecutive visits of the cell; at least every third visit of the cell straight.

### 7.2 Content and budget (N3)
1. **G** on the flagged group's site (kind `fingering`).
2. **C** from the remembered rung at T_C (kind `fingering`). The plan check replaces it when due, and **always on the first visit of a cell that reached visits through a T3 report without a block** (minor). **B** replaces C on every third fingering visit (variety; RF2 §5, Bangert 2014: partial support).
3. **The straight ladder (§5.5)** from T_S: 1–3 ordinary takes of their normal kind, counted as usual, each at a new tempo. **Touch point 2** follows the top straight take (§8.1). In the key session's cap visit the variants follow (§9.2.2). The pass-evidence attempts follow in whichever visit is the held cell's last of the session (§9.2.3, M2).

- **One budget for a visit:** at most **7 takes and 2.5 minutes** (takes plus count-ins): G 1, C (or B) at most 2, the straight ladder at most 2, the pass-evidence attempts at most 2. **The attempts fit inside the budget:** when attempts are planned, `fingerAfter` reserves their 2 slots **and their time** (2 take lengths at the attempt tempo, with count-ins) inside the 7 takes and 2.5 minutes; the non-attempt steps stop as soon as the remaining time is below that reserve, so the attempts never overrun the budget (minor: v7 let them overrun, which G4's bound contradicted). Without planned attempts, the straight ladder may use one end-on-success extension (still ≤ 7). At about 25 s per take, the time usually binds before the count.
- **One budget for a cap visit** (§9.2.2): at most **9 takes and 3.5 minutes**: the visit's 7 plus at most 2 variant takes above the cap.
- **The day-1 block** keeps its own 8-minute budget (§6.2).
- These budgets replace v6's "3–4 takes, about 1–1.5 min" and SP's `VISIT_TAKES`, which contradicted the content. `fingerAfter` enforces them (§9.8 item 9).
- **SP amendment entry (minor),** added to SP §21 beside the §16.7 entry: *for fingering visits (SPEC-FINGERING §7.2) the visit budget is 7 takes and 2.5 minutes (a cap visit 9 takes and 3.5 minutes), replacing `VISIT_TAKES` = 3; these visits are outside SP §9's return-test bound (`VISIT_TAKES`–`VISIT_TAKES` + 3), which applies to the rotation's own visits.*
- **Key session (R8-2):** a fingering visit takes **the rest of the cell's current visit after its cold-check take**. In the current `keyCoach.ts` the scale rung is played twice per session, visit 0 (opened in `ksStart`) and the closing (`nextVisit` never reopens visit 0; SP §3's returns are not built), so in practice a fingering visit occupies **only the rest of visit 0** or, for a v1 scale cell in a rotating or run rung, the rest of that rung's visit; it never replaces the closing and never runs inside coordination stages. Once SP §3's returns are built, a return visit can host it too.
- **Old coach, linear path:** the same steps, once per session, after the cell's first clean straight take that is not its cold check.

---

## 8. The report (O4)

### 8.1 The two touch points, per cell, per day
1. **Cold:** after the day's main-item cold check of a cell that is `flagged`, `retraining` or recheck-due, **only when that take is clean**. The habit is strongest cold (RF2 §9).
2. **Top:** after the **top straight take** of **any** visit of a `flagged` or `retraining` cell (a fingering visit, or an ordinary speed visit or climb, e.g. the key session's A-6 at the cap; minor): the clean straight take at which the straight climb stops (§5.5: the ceiling, the target, the budget, or the clean take after a miss), when it is the cell's highest clean straight tempo today. In the block, it is the closing's top take. **When pass-evidence attempts are planned for the visit (§9.2.3), touch point 2 moves to the clean attempt;** if neither attempt is clean, touch point 2 is not asked that visit. After retirement it also fires once on the first climb that passes E0 (§11.4).

- Each touch point fires **at most once per cell per day**. No fingering take asks.
- **Shadow mode (S5.9, N5):** on calibration accounts while F3 runs in shadow, extra label questions fire at the flag's tempo band, on shadow-flagged and control cells, with one neutral wording (§16.2).
- **The question is narrow** (RF2 §6.1): it names the flagged place when there is one. Shadow questions never name a place (§16.2).

### 8.2 The window
- **The verdict line comes first** (UX). The report line appears under it once the piano has decayed: no key held and ≥ 0.8 s since the last note-off, or 2 s after the last written onset, whichever comes first.
- **It lasts 3 s.**
- **Hands-free:** the next count-in waits until the window closes or is answered; KS2 D6's countdown starts after that. A note **outside** the answer zones closes the window as no answer and acts as "continue". Notes in the zones never start a take.
- **No answer** = nothing. After 2 unanswered windows in a day (counted **across all cells**, in `fgDay`), one reminder line. After 2 more, no questions that day. A player who stays silent across days is handled in §11.5 (N6).

### 8.3 The grammar
| Input | OK | Slipped | Hand (HT takes, after "slipped" only) |
|---|---|---|---|
| **MIDI keys** | a key in the **top zone** | a key in the **bottom zone** | a press within 2 s **of the hand question appearing; it appears 1 s after the "slipped" press** (P4): bottom zone = left, top zone = right. None = hand unknown (§9.4). |
| **Sustain pedal** (CC64) | full press and release < 600 ms (`pedalInvert` respected) | — | — |
| **Computer keys / foot switch / page turner** | Space, PageDown, → | ←, ↓, PageUp (two-button page turners send ←/→) | ← left, → right |
| **Voice** (optional; off by default) | "כן" / "yes" | "לא" / "no" | "שמאל" / "left", "ימין" / "right" |
| On-screen tap (fallback) | ✓ | ✗ | L / R |

- **Zones (UX):**
  - **The keyboard's range is learned first.** The report brief's first appearance on a MIDI input asks for one step: "Press your highest key, then your lowest." That sets devTop and devBottom for the input, after the octave shift (`midi.ts` `octave`). They are stored per MIDI input name in the device profile (never synced), and reset when the octave shift changes.
  - **Until both are set, MIDI keys don't answer** (pedal, computer keys, voice, tap do). The defaults 96/36 are never assumed.
  - Top zone = notes ≥ max(the item's highest note + 7, devTop − 5). Bottom zone = notes ≤ min(the item's lowest note − 7, devBottom + 5).
  - If a zone is empty (25-, 37-, 49-key boards with a wide item), MIDI keys don't answer for that item.
- **The hand press follows only "slipped"** (minor). An OK needs no hand.
- **The hand question is its own line (P4)**, shown **1 s after the "slipped" press**, and only presses after it appears answer it. **Before it appears** (0–1 s after the "slipped" press): a second **bottom** press is the same slip (the double press, hand unknown); a **top** press is ignored (minor: v5's 0.5 s left the 0.5–1 s interval ambiguous, bottom vs top). **Two bottom presses within 1 s** (the slip-mark gesture the briefs teach) are read as **one "slipped" with the hand unknown**, never as "slipped, left hand"; a hand-unknown slip never lowers the other hand's edge (§9.4).
- **The prompt names only the inputs that work** on this setup (minor): the key zones once the range is learned and both zones are non-empty; otherwise the pedal, computer keys or the on-screen tap (§14.4 variants).
- **Voice** listens only after the decay, with a closed vocabulary, and fails silently back to keys (RF1 §2.1).
- Report notes are never part of a take.

### 8.4 The spot check (RF1 §2.2)
When the report is OK but the take is a **break take** at a crossing (§3.3, from that take's `xs`), one follow-up question with the same keys: "Way down at F♯ it caught. Fingering OK there?" The answer replaces the report. At most once per cell per day.

### 8.5 What a report changes
Only the cell's fingering state: E within the §9.4 limits, retirement (§11), the T3 flag. **Never** a take's verdict, history, passes, cold record, staircase, tempo of any qualifying take, rank, XP, stars, Momentum, leagues or badges (§9.6, §14).

### 8.6 One question per take
A take with a touch point never also gets H2 §7's self-prediction question; that moves to a later take.

---

## 9. Rules

### 9.1 R1: after the cold check
- **No fingering take of a cell comes before that cell's main-item cold check of the day** (RF2 §8.2; H2 §1.4 "cold check first").
- Fingering takes are sounding takes: they update the cell's `lastSound` (H2 §1.4) and are never cold.
- **The only exception:** the new-key blocks (§10), only for a cell that is **new everywhere** (no cold result and no `lastSound` history in any planner), which therefore has no due cold check to skip (P3).
- Every planner (key session, rotation, old coach, list runs, standalone) asserts this before a fingering take.

### 9.2 R2: the plain-climb cap while retraining

#### 9.2.0 When R2 applies: the hold (N8)
- **R2 applies only with evidence of a slip:** a data flag (T1, T2) that the player accepted with Yes, or a reported slip (T3: a "slipped" at a touch point, or a slip mark, §3.4).
- **Without evidence** (a teacher pin, or a manual "Retrain this fingering" with no flag) the cell gets the block and the visits **with no hold**: no cap, the climb unchanged, no pass delay. The visits work as an angle, like a pinned feel (RF2 §9).
- **A hold starts later when evidence arrives:** a "slipped" or a slip mark on a cell **already in `retraining`** adds it at once (the cell is in retraining by the player's choice or the teacher's pin); a T1/T2 fire is offered in the end line as usual, and Yes adds it. E starts from that evidence (§9.4). `preTop` is taken when the hold starts, not when retraining starts (the pin-then-slip case; minor).
- **A slip on a cell not in `retraining` never holds by itself** (M4): it flags, gives 7 days of visits without a hold and an offer; the hold starts only through Yes and the block (§3.4 table).
- `hold` is stored on the cell (§15.1). The teacher's "Don't hold" switch still lifts a hold for that assignment's sessions (§9.2.3).

#### 9.2.1 What it caps
- **Who:** a cell in `retraining` **with a hold** (§9.2.0), per flagged hand. The cap is the lowest over the flagged hands.
- **Cap** = E + 1 mark.
- **Capped:** every plain straight take of the cell, on all its items:
  - the key session's speed-stage climb (A-6, B-6), the flow pulse (KS2 D3), D5 targets, the closing;
  - the old coach's climb and over-target climb (SP §2.5), and **its side takes** (`c.side` `review` and `warmup`, which play at `goalBpm`, `coach.ts` ≈ 335): on a held cell they play at min(`goalBpm`, cap), and the side review skips cells in `fgDone` **or `peDone`**, so a parked held cell never returns as a side review after its attempts (minor);
  - rate-keeping feels (SP §16.4);
  - **list runs** (R11-2): the take tempo is min(`bpmOf` / `go`'s start at `goalBpm`, or the hands-free raise `lad.next.bpm`, cap). The stored `goalBpm` may stay as `applyTake` sets it (it raises after 3 clean takes at the goal), because **`goalBpm` is clamped at the cap wherever it is read for a held cell**: `bpmOf`, `go`, the manual list path's `setBpm(lad.next.bpm)` (`Drills.tsx` ≈ 1807), the old coach's side takes and `coachTake`, and **`done()`** (≈ 1762, 1772, below). **The old coach's `tempoOf` clamps its result**, not only `goalBpm`, because its base also takes `cleanBpm × 0.94`, `target × carry × 0.94` and other keys × `CARRY_KEYS` (`coach.ts` ≈ 358), which exceed the cap for `preTop` cells. On a clean take at the cap, the list-run result line is the hold line, never `lad.message`'s "today's goal ♩Y" with Y above the cap (minor);
  - **`slower` and the take kind (R12-2):** for a held cell, `done()` compares `slower` (passed to `applyTake`, ≈ 1772) and the list-run kind `'slow'` (≈ 1762) against the **clamped** goal, min(`goalBpm`, cap). Otherwise `applyTake` logs no `passLog` entry (it logs only when `!opts.slower`, `ladder.ts` ≈ 143), and capped list-run takes would trace as `'slow'` (`TAKE_KIND.slow` all false), leaving `fingerEvidence`, T1/T2, the §11.3 check and the no-answer E rise. **Pass-evidence attempts always pass `slower: false`**: they are planned target takes, not "Slower";
  - **challenge takes** (SPEC-CLIMB-SYNC §2) are off for the cell.
- **Allowed above the cap:** C at P1–P3, B, G (variants change the movement context; RF2 §8.2).

#### 9.2.2 In the key session, precisely (S8)
- **The visit at the cap:** the straight ladder (§5.5) stops at the cap. The visit continues with **variants only**, at most **2 variant takes** within the cap visit's budget (§7.2: 9 takes, 3.5 minutes), climbing: C at cap + 1 mark from the remembered rung, then B or G, each clean variant take one mark higher; C and B go up to **cap + 3 marks**, G keeps its own range (§5.4).
- **Which take ends the visit (N2, N7).** v2 closed with one more straight take at the cap, which repeated a tempo. v3 has no closing straight take at the cap: the clean cap take was already the straight end-on-success and the top take (touch point 2). **When the pass-evidence take runs (§9.2.3), its attempts are the visit's last takes**, after the variants, and touch point 2 moves to the clean attempt. Otherwise the last variant take ends the visit.
- **"Held at cap": one rule for every planner (R11-2).** A clean plain straight take at the cap of a held cell is **held**:
  - **Key session, any rung** (A-6 and the run rungs alike): the first such take today opens the cap visit (once per cell per day, `fgDay.capVisit`); after it, the visit is left as **`leave = 'done'`**, a run rung is pushed to **`ks.finished`**, and the cell is **not entered straight again that day** except for its attempts window: `nextVisit`'s `reopen` skips run rungs whose held cell reached the cap today, and `openVisit` never resumes such a rung "at its last clean pulse". Without this, `gradedUp` clamped at the cap makes `setPulse` return the same tempo and `dir = ['hold']` repeats the cap on every clean take (`STEP_TAKES` fires `limit()` only on a not-clean take, ≈ 1084, so clean holds repeat until the time runs out; minor), and a `'budget'` exit (not in `ks.finished`) lets `reopen(3)` revisit and repeat it. **`STEP_TAKES` never sets a limit on a held cell**; a run rung shows "held", never a limit.
  - **List runs:** the take tempo is min(raise, cap) (§9.2.1); a clean take at the cap gets no raise and moves to the attempts window (if due), then `go(i + 1)`.
  - **Old coach:** `capHeld` (below), with `goalBpm` clamped at read time.
- **The old coach at the cap (S1).** §9.2.2's rule is added to `coach.ts`: a clean plain straight take at the cap of a held cell is **"held at cap"** (a new take flag `capHeld`, distinct from the existing `held`, which means a thinned-click tempo hold). It **never counts toward `stall` or `PLATEAU_TAKES`, never produces a `ceiling`** (so `withCeiling` and the matrix's rest never fire on it), and it **ends the cell's run for the session** (after the planned attempts), by the end-of-visit advance of §9.8 item 9 (the park-path reset, R8-3). **In a one-cell run** (every key of the step is in `fgDone`, §9.8 item 9: a timed one-key assignment or a standalone run) there is no next key or item: the run **continues with fingering takes only** (C or B above the cap, G), each at an unplayed (structure, rung, tempo), until the time is up or no new combination is left, then ends with the hold line. It never plays a straight take of the cell again. (Ending at once was the alternative; it was rejected because the assignment's minutes would then need a rule, and the variants keep the session's length without repeating a straight take.) The end line names the hold ("Held at ♩116 while the fingering settles."). Without this, the plateau rule would rest a held cell for days, a planner effect §9.6 forbids.
- **The closing of a held cell (R10-1).** The straight ladder climbs one mark per clean take (§5.5), so a visit that reached the cap has played every mark from T_S to the cap straight; no tempo is left for the closing's A-6 climb that would not repeat one. **"At the cap" and "reached the cap today" are defined by the step function, in nps (minor 1):** a held cell is at the cap when the step function below finds no qualifying mark ≤ the cap (so a triplet climb whose marks straddle an eighths cap is at the cap without playing it). Therefore **a held cell whose capped plain takes reached the cap today skips A-6 in the closing, every day, whether or not attempts are allowed**, and the closing plays, in this order:
  1. the attempts window, if attempts are allowed and the cell has not had its window this session (§9.2.3);
  2. **A-7**, if it is playable and time remains: the closing returns to `openVisit`'s A-7 branch (`enter(a7)`) (minor);
  3. otherwise the session ends at once with the summary and the hold line.

  **A held A-6 that hit a KS2 limit today (R14-2)** (`ks.limited` holds A-6, after the step-back and `limit()`) **also skips A-6 in the closing**, like a cap day: the closing plays the window if allowed, else A-7, else the end with the summary. The code's limited `review(a6, lastGood)` branch (`keyCoach.ts` ≈ 434) would repeat `lastGood`, and the below-cap climb would start above a limit the player has just shown (KS2 #8: a stage at its limit comes back only as a short review). Skipping keeps the window.
  **A passed A-6 on a held cell** (a relapse on a passed item) also skips the `review(a6, stretchTarget)` branch (`keyCoach.ts` ≈ 446), whose plain takes at the target would exceed the cap. **A below-cap day (R11-1, R11-3, R13-1).** If the cell's capped plain takes did **not** reach the cap today:
  - **Which takes count (minor 2).** "The highest clean straight tempo today" and "reached the cap today" read **only the cell's capped plain takes** (the straight ladder, the A-6 and run-rung climbs, the old coach's and list runs' plain takes): never a cold check or other exempt take (pass probe, FSRS probe, confirmation, checkpoint, level test), and never an attempt. Otherwise a clean probe-band cold check, which every `preTop` cell plays, would make every such day a "cap day" and skip the closing climb for good. **"Played today"** (the no-repeat set, `fgDay.played`) reads **all** straight takes of the cell: exempt takes, attempts, misses and "almost" included, in every planner, outside `fg` too.
  - **The rule, one step function for the start and every later take (R13-1).** Let `prev` be the cell's highest clean capped plain nps today (for the start) or the previous closing take's nps (for each later take). The next closing take is **the lowest Maelzel mark, in the note value the speed path picks for that take** (the entry note value for the start, after the closing's `g.per === 3 ? 2` conversion; then the eighths/triplet alternation the speed path applies on every clean take of a scale A-6, `canTrip`, `keyCoach.ts` ≈ 621, flipped at ≈ 1048), **whose nps is above `prev`, is not in `fgDay.played` (compared in nps), and is ≤ the cap** (without a hold, ≤ the normal ceiling). It is set with `noCap` (`known: true` at the entry), so neither the 10 % step cap nor a snap can move it. **This rule replaces `gradedUp` for held closings**, so it does not depend on `gradedUp`'s scaling; the key-session climb fix (a separate code change: at fast tempos the next mark is the minimum rise per clean take) remains needed only for feature-off climbs.
    - **The start:** if no mark qualifies, **A-6 is skipped in the closing**, as on a cap day. It is stored in **its own field `ks.fgStart[itemId]`** (`lastGood` stays the last clean pulse, which A-7's start, `switchSpec`, the limited review, the known-rung warm-up and the reopen resume expect).
    - **After a clean take:** the next take by the rule; if the lowest qualifying mark would be above the cap, the cell is held at the cap (a cap visit only if none opened today; `fgDay.capVisit`), then the window.
    - **After a miss (R13-3, R14-1):** §5.5's recovery take: **the highest mark, in the speed path's note value, whose nps is below the lowest straight nps of the cell today, is not in `fgDay.played`, and is ≥ the comfort pulse's nps**; a second miss takes the next such mark down by the same rule. **If no mark qualifies, there is no recovery take** and the climb ends. A clean recovery take ends the climb on success (end-on-success, SP §1). **After the second miss the climb ends** (minor 2). Then the window, else A-7, else the end; a session with neither may end on that miss. v13's "a miss ends the climb" could end the session on a miss with most of the closing unused (for a non-`preTop` cell attempts are usually not allowed and A-7 is not playable).
    - **"Almost"** holds once at the same tempo, as in §5.5; it is the only repeat, and it is not added to the no-repeat comparison a second time.
    - The fingering straight ladder uses the same notion of a mark (one Maelzel mark, ≥ 2 ♩, in the take's note value); **`markUp` and the unfixed `gradedUp` are not it** (both have a `stepCap` minimum).
  - **The window's time (R12-1, minor 1, minor 6):** in the closing `openVisit` sets `visitBudget = remaining` and skips the budget check, and every exit of the climb (target, limit, time-up) returns `end` at `ksAfter` ≈ 1174. So, for a held cell whose attempts are allowed and whose window is still due:
    - **the main scale's `closingDue` test (≈ 1166) adds the window's `budgetMs`**, as for run rungs, so the closing starts early enough to hold the window even in a 5-minute session (`closingMs` is 30 s there, the window about 40–60 s);
    - **the yield check runs before the first closing take too:** if the time left at the closing's start is ≤ the window's `budgetMs` + one take, A-6 is skipped and the window plays first;
    - during the climb it yields when the time left ≤ the window's `budgetMs` + one take, and at ≈ 1174 `ks.closing && leave` and that yield open the window instead of `end`; the time-up exit opens the window only if the yield never fired (with the `closingDue` reserve, it never fires late). Only after the window do A-7 or the end follow.
  - **The closing order:** the capped A-6 climb by the rule above (with its recovery take after a miss); **then the attempts window as the cell's last straight takes** (if allowed and not yet had this session); **then A-7** if it is playable and time remains; otherwise the end. If the climb reaches the cap inside the closing, its cap visit's variants come first (if no cap visit opened today), then the window.
  - **Worked example, the miss case:** visit 0's straight part played ♩100, 104, 108, 112 clean, ♩116 missed, then ♩96 clean (§5.5's recovery), budget over; cap ♩132. `prev` = ♩112 (the highest clean); ♩116 is played, so the start is **♩120**, entered with `known: true` (v11 would have been clamped by `setPulse` from `lastBy` = 96 to **♩100**, a repeat). Clean ♩120 → ♩126 → ♩132 (cap) → the window. A miss at ♩120 instead → the recovery take is the highest unplayed mark below ♩96 (the day's lowest) and ≥ the comfort pulse: **♩92** if the comfort pulse is ≤ ♩92, otherwise none and the climb ends; a clean ♩92 ends the climb on success, then the window, A-7 or the end.
  - **Worked example, a fast line:** sixteenths ♩112, 116, 120 clean (♩120 = 8 nps), stopped on the budget, cap ♩132. `stepCap(8)` ≈ 0.040 while the next mark ♩126 is 5 % up, so without `noCap` `setPulse` would clamp ♩126 back to **♩120**. By the rule the closing enters at **♩126** and, clean, plays **♩132** (the cap), then the window.
  - **Worked example, the note-value alternation (R13-1):** visit 0: triplet ♩100 (5.0 nps) clean, triplet ♩104 (5.2 nps) missed, recovery clean, budget over. The closing enters in eighths: the lowest eighths mark above 5.0 nps not played is **♩152** (5.07 nps) (v13's "one mark above in the played note value, then converted and snapped" gave ♩144 = 4.8 nps, played, and skipped A-6). Clean → the speed path flips to triplets: the lowest triplet mark above 5.07 nps is ♩104 = 5.2 nps, **played (missed)**, so the rule takes the next, **triplet ♩108** (5.4 nps).
  - **Worked example, a missed cold check:** the cold check missed at ♩120 (exempt, but in `fgDay.played`); the visit's plain takes were clean to ♩112, budget over. The start is ♩116; clean → ♩120 is played, so the next take is **♩126**.
  - **When visit 0 itself reached the cap**, the cell's attempts window is placed **in the closing** (one hook), and the closing follows the cap-day order above.
  **A cap visit opens at most once per cell per day;** the (structure, rung, tempo) pairs played are kept **per cell per day** (`fgDay.played[cellKey]`), not per visit, so a later variant never repeats one played earlier that day.
  **Why G4 and G12 are satisfiable and testable:** after a day whose capped plain takes reached the cap, the closing plays no straight take of the cell (only attempts, at target and above the cap, or A-7, another stage); on a below-cap day every closing A-6 take is chosen by a rule that **excludes `fgDay.played` by construction** (the start and each later take: the lowest qualifying mark not in it, in the speed path's note value, compared in nps; after a miss, an unplayed mark below the day's lowest straight nps and ≥ the comfort pulse, or none; "almost" the only, stated repeat); variants are checked against the day's pairs. The test: for every held cell and day, **every closing A-6 climb, recovery and fingering take** (not an attempt) other than an "almost" hold ∉ the set of tempi (nps) played straight in the cell earlier that day, and no clean cap take is followed by another take at the cap.
- **KS2 amendment entry (R10-1).** This changes KS2 U1's "A-6 resumes where it stopped" for held cells only: *a held cell whose straight takes reached the cap today skips A-6 (and a passed A-6's target review) in the closing; the closing plays the attempts window, else A-7, else ends with the hold line. A held A-6 in `ks.limited` today is treated the same (R14-2). On a below-cap day the closing enters A-6 at the lowest mark, in the speed path's note value, above the cell's highest clean capped plain tempo today, not played today (in nps) and ≤ the cap (`ks.fgStart`, `known: true`), else skips A-6; each later take is the lowest such mark above the previous take (replacing `gradedUp` for held closings); after a miss it plays a recovery take at the highest unplayed mark below the day's lowest straight nps and ≥ the comfort pulse (none if no mark qualifies; the climb ends after a second miss); "almost" holds once; it yields for the attempts window when the time left ≤ the window plus one take (checked before the first take too, with the window's time added to `closingDue`), and plays the window before A-7 or the end (R11-1, R12-1, R13-1, R13-3).* Added to KS2's amendment list with this spec, beside the SP §21 and H2 entries.
- **A cap hit is not a limit.** KS2's limit ("that's your limit today"), reopen rules, "no more than six takes on one step" and the WAVE/limit logic ignore takes held at the cap. A-6 shows **"held"**, not failed or limited; the end line names the hold. For a held cell, KS2 U1's closing follows the held-closing rule above (R10-1, R11-1).
- **A-7 opens** when A-6 passes its target as now, **or** when the cell's main item has `passedAt` (H2 §1.6). Under the cap, A-6 may never reach its target in session (S1b).
- **H10 (N9):** a held cell's fingering variants count as offered difficulty at their **effective tempo**, never at the click tempo:
  - T_eff = the tempo of a straight take of the same notes in the same total time. C and B: the written beats over the written beats plus the added pauses or long notes. G: min(the burst tempo, T_S), since a 5-note cell is not a run. Blocks (A) count nothing;
  - difficulty = content tier + ln(T_eff / target) / ln 1.2, as in H2 §1.7a. A P1 take at cap + 3 marks therefore counts well below the cap; P3 and P0 count near their tempo;
  - **held cells are excluded from the flat-rank slope and from v15's appropriateness metric** (H2 v16 §1.7a) for the days they are held, and **reported separately** in both ("held cells: n, days held"; minor). The harness asserts that a held cell's effective difficulty rises across visits (shorter rungs, E rising), so the slope cannot pass by construction (G22).
- **H2 amendment entry (N9, P1, P2).** This entry is added to H2 v16 with this spec, beside the SP §21 entry:
  - *H2 §1.7a is amended for held cells (SPEC-FINGERING §9.2): their plain straight climb stops at E + 1 mark; their variants count at effective difficulty; they are excluded from the flat-rank slope and the appropriateness metric while held and reported apart; passes and rank are untouched except for the delay stated in SPEC-FINGERING §9.2.3.*
  - *H2 §1.6's list of takes that never count gains fingering takes (kind `fingering`, SPEC-FINGERING §9.8): never a confirmation, a pass entry, a counting check, a guard record entry or readiness evidence; they create no drill item.*
  - *H2 §1.7's shelving rule: a held cell's visit counts toward the 12 visits only when the cell could pass in that visit (its pass-evidence attempts are allowed, or its cap reaches the probe band); while the hold is the binding reason it cannot pass, the count pauses. A cell in `retraining` shelved by the struggle step-down freezes its fingering state until it resumes (SPEC-FINGERING §9.2.5).*

#### 9.2.3 Passes: the pass-evidence take, and the honest limit (S1, N1, N2)
- **Exempt from the cap (they play at their own tempo):**
  - the cold check and every counting cold check, pass probe, confirmation and FSRS review probe (H2 §1.6, §1.9);
  - the placement probe; level-test takes; teacher submission targets;
  - **checkpoint technique runs** (`checkpoint-tech`, `atTarget`, where `bpmOf` returns `itemTargetBpm` for every item; App ≈ 5046, 2553): exempt like level-test takes (one take per item, at target, a test). **No fingering visits, blocks or attempts windows run inside a checkpoint.** (R12-4, coordinator decision 2026-11-28, following the owner's level-test pattern: capping would make a held cell's checkpoint unpassable at target, a path effect §9.6 forbids.)
- **The pass-evidence take (N2):** up to **2 plain straight attempts per session per held cell at 0.95–1.0 × target, stopping at the first clean one.** They feed the warm half of the V1 pass (3 counted clean takes at ≥ 95 % of target on ≥ 2 days, H2 §1.6), and a clean one is "the target first reached" for the cold half's later-day rule.
  - **Tempi, on each planner's real grid (R13-2):** attempt 1 = the highest playable tempo whose item ♩ (after the note-value conversion and the planner's own snap or rounding) is **≤ the target and ≥ 0.95 × target**; attempt 2 (after a miss) = the next playable tempo below it that is **still ≥ 0.95 × target**. In the key session **either note value may supply the mark** (eighths or triplets, whichever has a mark in the band), and the tempo is chosen as a mark, so `setPulse`'s `snapDown(… + 0.5)` (≈ 270) cannot move it below 0.95 × target (v13's "0.95 × target" for attempt 2, e.g. 104.5 for a target of ♩110, snapped to ♩104 and could never count). **In the old coach and list runs** (integer ♩ grid, `tempoOf` / `bpmOf` / `Math.round`): **attempt 1 = the target, attempt 2 = ⌈0.95 × target⌉** (target ♩113: 113, then 108, never 112); **there is no attempt 2 when the band is narrower than 2 ♩** (⌈0.95 × target⌉ > target − 2, only for targets below about ♩40), matching `climbFrom`'s 2 ♩ minimum ("never the same tempo again") (R14-4). **If the band holds only one playable tempo, there is no attempt 2** (marks above ♩100 are 4–5 % apart, so this is common). Never two attempts at one tempo within a window (N7). An attempt is never played below 0.95 × target in item ♩. **Attempts are exempt from the day's no-repeat set (R14-3):** they may sit on a mark played earlier that day (a `preTop` cell's in-band cold check at the band's only mark, or an earlier session's attempt), so a `preTop` cell always gets its attempts; the only no-repeat rule for attempts is N7 within a window. **Each attempt passes `slower: false` to `applyTake`** (R12-2), so a clean attempt below 0.99 × the stored `goalBpm` still enters `passLog`.
  - **Where (M2): in every session in which a held cell is played, in every planner** (key session, rotation, old coach, linear path, list runs, standalone), in any visit kind (a fingering visit or an ordinary speed visit), short sessions included, and in `!` sessions unless "Don't hold" is set. They are **the last straight takes of the cell's last visit of the session**: planners that build a plan (key session, rotation) reserve them in that visit; planners without one (old coach, linear path, list runs) put them at the end of the cell's run, before moving on. In the cap visit they come after the variants (§9.2.2). On a day they run there is no closing straight take at the cap. Touch point 2 follows the clean attempt (once a day). They are not limited by §7.1's visit rationing.
  - **The attempts-only window (R9-3, R10-2).** Outside a fingering visit nothing else would drive them, so `fingerAfter` also runs **an attempts-only `fg`** (`kind: 'attempts'`, `budgetTakes` 2, `budgetMs` = 2 take lengths at the attempt tempo with count-ins; the time is reserved **before** it is needed). It opens when a held cell whose attempts are allowed and that has **not had its window this session** is **about to be left for the session**, and it ends through the planner's own visit-end path.
  - **Counting (R10-2): one window per session per held cell**, at most 2 attempts, stopping at the first clean one. It is tracked in **the run state**: `CoachState.peDone: string[]` (cell keys that had their window this session, saved with the run) and `peDone` in the queue save for list and standalone runs. **A second session the same day gets its own window** (as G3 models "every session"); a clean attempt still feeds V1's "≥ 2 days" rule correctly, since the warm half counts days. A fingering visit's own attempts count as that session's window. `FingerCell.pe` stays only as the per-day record for touch point 2 and telemetry (merge rule in §15.1); it never gates a window.
  - **The hook at every exit (R10-2):**
    - **Key session, the main scale:** in the held cell's closing (the scale cell's last visit of every session: `nextVisit` never reopens visit 0): **on a cap day at its start; on a below-cap day after the capped A-6 climb**, as the cell's last straight takes (§9.2.2, R11-3). When visit 0 reached the cap, the window is still placed in the closing.
    - **Key session, run rungs** (scale modes, melodic and natural minor and the other scale-kind run rungs of the key ladder, `keyIndex.ts` ≈ 493–551, which the closing never returns to): when the held cell's visit is left (`leave` = `'done'` or `'budget'`, or `closingDue`), **before** `nextVisit` or `openVisit(closingV)`. Once per session: a later revisit opens no second window. **Its time is reserved (minor):** for a held cell whose attempts are allowed, the run-rung visit budget and the `closingDue` test both include the window's `budgetMs`, so a window opened at `closingDue` never eats `closingMs`.
    - **Old coach and linear path:** before every path that leaves the held cell (the pass path, the park path, the plateau path, `capHeld`), and **before time-up**: when `fingerAfter` / `coachAfter` sees that the remaining session time is ≤ the window's `budgetMs` while on a held cell with allowed attempts and no window yet this session, it opens the window **instead of the next ordinary take**; the session ends after the window (time is reserved before time-up, not after: `coachAfter`'s `next()` would otherwise end the session at `timeUp`, `coach.ts` ≈ 468). The park and plateau resets run after the attempts.
    - **List runs:** **inside `go(j)`**, **before the `j >= queue.length` end branch**, for `j > i`, **only when the current item is the cell's last item in the queue** (the queue is known up front, so a later LH or HT item of the same cell never plays straight after the "last straight takes"; minor), while the current item is a held cell without its window this session: `go` opens the window, runs it through the queue continuation, and calls `go(j)` again at its end. So the review's Next button, the any-note Next (`useAnyNote(… () => go(i + 1, true))`, `Drills.tsx` ≈ 1721), `hfSchedule` and the third `hfMiss` are all covered.
    - **Standalone runs:** before the run ends.
    - In a fingering visit the attempts are the visit's last takes, as above, and count as the session's window.
    - G3 models exactly this placement and counting; G4 and G12 assert one attempts window per session per held cell in each planner, inside its time.
  - **A missed attempt is not a limit** (M1): like a cap hit, it is ignored by KS2's limit, `STEP_TAKES` and `ALMOSTS_BACK` (`keyCoach.ts`), the reopen rules and the WAVE logic.
  - **Allowed when (Q8 decided 2026-11-28: option (a)):** the cell's **cap is within 2 marks of the probe band** (cap ≥ 0.95 × target − 2 marks), **or**, as before, when the hold began, the main item's `cleanBpm` had already reached the probe band (`preTop` ≥ 0.95 × target; `preTop` is stored in nps and the target is converted at the item's note value, nps = bpm × notes per beat / 60; minor), **or** the cell's non-provisional threshold estimate is ≥ 0.95 × target (H2 §1.9). When allowed, the attempts run in **every** session in which the held cell is played (M2). Option (b), the take in every held cell from the start, was rejected.
- **How E reaches the qualifying tempi (N1).** H2 §1.9 plays an unpassed item's cold check at max(staircase, 0.95 × target) **once `cleanBpm` ≥ 0.95 × target**. Under a hold, **plain straight takes** raise `cleanBpm` only up to the cap (E + 1 mark). Three kinds of take still raise it as with the feature off: the exempt takes (cold checks, FSRS probes, placement, level test, submissions all go through `applyTake`), and the pass-evidence attempts, which **add** takes at target. Fingering takes never raise it (§9.8). So E, and the reports that move E, decide **when** the pass-probe branch opens, together with those takes. A "slipped" can delay it. An OK can bring it forward. **No report value is ever itself used as a qualifying tempo** (G16 b). Whether the branch can open **before** the feature-off arm is a distributional question, because the attempts add jumps to target: G16 (a) bounds it for the v5 rule, and Q8's options are judged on it (§19).
- **The remaining delay, stated honestly:**
  - **`preTop` cells.** The cold half is unchanged: their `cleanBpm` had already opened the branch. The warm half gets at most k countable attempts a session instead of several, where **k is 2 when the planner's grid has two tempi in the band and 1 when it has one** (R13-2), so it needs about 3 / (1 − (1 − p)^k) sessions, where p is the clean rate at 0.95–1.0 × target: with k = 2, about 4 sessions at p = 0.5 and 3.3 at p = 0.7; **with k = 1, about 6 at p = 0.5 and 4.3 at p = 0.7** (feature off: often 2). The cold half needs about 3 days of its own and often hides the gap. **The expected delay is about 1 practice day at p ≥ 0.6 when k = 2, and longer with k = 1 or at lower p.** G3 measures it with the real k per planner and tempo.
  - **Cells that had not reached the probe band: both halves of the pass wait** (v2 said only the warm half did). The warm half needs a clean straight take in the probe band, which only the pass-evidence take can give, and that waits for the threshold estimate to reach the band or the cap to come within 2 marks of it (Q8 (a)). The cold half's counting cold checks need the pass-probe branch (`cleanBpm` ≥ 0.95 × target) and a day later than the target was first reached. **Both wait until the cap or the cold staircase reaches the probe band, or until retirement.** On MIDI, E rises by up to 1 mark a day on clean top takes even without answers (§9.4, N6), so in the clean case the wait is roughly the number of marks from the cap to the probe band, in practice days. On mic it needs reports, and §11.5 ends a silent hold. **This is a real delay of the pass, and so possibly of rank.** It is the price of not rehearsing the slip above the edge (RF2 §8.2). Under Q8 (a) it ends, at the latest, when the cap comes within 2 marks of the band.
- **G3 is a harness simulation that must run before F6** (§17, §18): seeded learners over 28 days, fingering on and off, at clean rates **p = 0.5 and 0.7**, for `preTop` and non-`preTop` cells, under the decided rule (Q8 (a)), **with realistic visit frequencies per planner** and the attempts in every session in which the held cell is played (M2). It reports P(pass by day N) for every combination. **The bound:** for `preTop` cells at p ≥ 0.6, the median pass delay ≤ 1 practice day. Every other case is reported, not bounded. Q8 is decided (a); G3 now checks that decision's cost before F6 and its numbers go to the owner.
- **`!` sessions:** the cap still applies (Q3, decided). The take line and the teacher digest say "Held at ♩116 while the fingering settles." The teacher has an explicit **"Don't hold"** switch on the assignment, which lifts R2 for that assignment's sessions.

#### 9.2.4 When the cap moves
- With E (§9.4). A rise applies from the cell's next visit, never inside the visit that raised it.
- **Lifted** at retirement, at "Stop fingering work", by the teacher's "Don't hold" switch, at the silent timeout (§11.5), or when the fingering changes (R3).

#### 9.2.5 Shelving and the struggle step-down (P2, H2 v16 §1.7, §1.7a)
- **The risk.** H2 v16 shelves a working cell after 12 visits without a pass, and the struggle step-down shelves working cells above a stepped-down target. A non-`preTop` held cell cannot pass until the cap or the staircase reaches the probe band, so the hold alone would push it toward shelving; once shelved it gets no visits, no touch points and no cold checks at ≥ G, so it can neither retire nor time out, and it would resume still held. Shelving also moves the challenge point and the guard reserve, which §9.6 forbids as a feature effect.
- **Rule 1 (F2): a held visit counts toward shelving only when the cell could pass in it.** A visit of a held cell counts toward the 12-visit rule when **the cell could pass that visit**: its pass-evidence attempts are allowed (§9.2.3) or its cap reaches the probe band (cap ≥ 0.95 × target). Otherwise, while the hold is the binding reason it cannot pass, **the count pauses**. Once the hold no longer binds, the cell is judged like any other.
- **What this does and does not claim.** The hold **neither causes nor prevents a shelving while it is the binding constraint**. It does not make the on arm equal to the off arm: a held cell whose true cold ability is below the band would be shelved after 12 visits with fingering off, but stays a working cell while its count is paused, so the challenge point, the guard reserve and the working-slot supply can differ in that direction for as long as the hold binds (v5 claimed equality; that was false). G3 reports this divergence; Q8 (a), now decided, bounds it: the attempts, and so the count, resume once the cap is within 2 marks of the band.
- **Rule 2: a step-down shelving freezes the fingering state.** The step-down is a planner decision taken on cold evidence the feature does not touch. If it shelves a cell in `retraining` (or `retired` with a recheck pending), the cell's fingering state **freezes**: no `quiet` count, no recheck clock (`recheckDue` moves by the shelved time), no 60-day break rule (§11.4), E and the hold kept but not applied. It resumes unchanged when the cell is resumed.
- **Checked** in G3 and G12: shelving and the step-down are modelled. G3 **reports** the divergence on and off (P(shelved while held), P(a held cell still working past the off arm's shelving day), the challenge point and the guard reserve); G12 asserts the rule, not equality.

### 9.3 R3: one fingering per cell
- Never alternate the old and new fingering "to compare" (RF1 §1.1, Brashers-Krug 1996).
- A change of `fsOwn` resets the cell's state. A retraining cell restarts with a block on its next appearance; the old state is archived in telemetry.
- A change of `fsSug` re-keys without losing state (§1.2).

### 9.4 The edge
Per cell and hand, in nps.
- **Start:** from T1, one mark below c*; from T2, one mark below the slower break take; from T3, one mark below the slipped tempo. A manual start or pin with no data has no E and no hold (§9.2.0); E starts when evidence arrives.
- **OK at tempo t** (touch point 1 or 2): E rises toward t, by **at most 1 mark per day** (S8). An OK on a take that passes the **"no break, no worse than flagged" check** (§11.3) may raise it by **at most 2 marks per day**. On mic, always at most 1 mark per day.
- **Without an answer (N6):** a clean top take at t > E that passes the same check raises E by 1 mark that day, with no report. It only lifts this feature's own restriction, so §9.6 allows it. **Read honestly (M6):** the check passes about 84 % of takes played with an unchanged fingering, so in practice this is a ramp of 1 mark per day of clean play without a break. That is its purpose: silence must not trap the player (§11.5).
- **The day's total rise** from all sources is ≤ 2 marks, and ≤ 1 mark unless a take that passed the check supports it (the per-day `midi` bit, §15.1).
- **The label "your report"** is used only when the current E came from a report; otherwise the edge is shown "from your playing" (`edgeSrc`, §14.4; minor).
- **Slipped at t:** E = min(E, one mark below t), floor the comfort pulse. It sets the hand's `lastSlipAt` (§11.4).
- **Hand unknown on an HT take (P4):** a hand-unknown slip **never lowers the edge of a hand it cannot be attributed to**. With exactly one hand flagged, it applies to that hand. With both flagged, it lowers neither edge and leaves both `lastSlipAt` unchanged; it counts for the cell only (a T3, the hold where §3.4 adds one) and the next touch point asks the hand. With neither flagged (a new flag), it starts E for both hands from the slip, since no existing edge is lowered.
- **Slips today** at a tempo are counted per hand (`slipsToday`). A second slip at the same T_S today makes that day's edge one mark below and adds a G take to the next visit.
- **E0** = E when the cell entered `retraining`.
- E and the cap only restrict plain straight takes. **No E, report or G value is ever used as the tempo of a qualifying take** (cold check, confirmation, pass probe, FSRS review): those follow H2 §1.9 alone (S2). E reaches them only by holding `cleanBpm` lower, which can delay the pass-probe branch but never open it before the feature-off time (§9.2.3; G16 a and b).

### 9.5 Teacher assignments and the mirror rule
- **Every rule exists in both coaches** (`keyCoach.ts`, `coach.ts`; memory: key-session-must-develop), checked by a shared test (G12).
- **A teacher can pin "Positions"** on an assigned piano scale. The first session of the assignment runs the day-1 block after the cold check, even without a flag. Later sessions run one fingering visit each. **Without a flag or a reported slip the pin adds no hold** (§9.2.0, N8): the block and the visits only, no cap, no pass delay.
- **`!`:** no fingering visits or blocks unless pinned. R2 applies to held cells (§9.2.0) unless "Don't hold" is set (§9.2.3).
  - **This departs from SP §16.7 ("`!` means straight") for a pinned "Positions" only.** It is added to SP's amendment list (SP §21) with this spec.
- **The submission** adds `{ fgRung, fgEdge, fgReports, fgHeld }` for a pinned or retraining cell, the edge labelled "the student's report". No teacher text in push.

### 9.6 Honesty principle (G1 restated, S2)
**Reports may only lift restrictions this feature added. No measured outcome may exceed the feature-off baseline.** Measured outcomes are passes, rank, cold results, the staircase, the threshold estimate, Momentum, XP beyond practice time, history and confirmations. **Through the cap, reports can move measured outcomes only lower or later** (a slip lowers E and holds `cleanBpm` back), never above or before the feature-off baseline (G1, G16).

### 9.7 The other existing rules, checked
| Rule | How this spec keeps it |
|---|---|
| Count-in + click + now-cue on every timed take | Every structure is timed. C uses a subdivided click (§5.3). |
| Click thinning | Fingering takes always use the full (or subdivided) click. Thinning state is untouched; it resumes on the next straight take. Thinned takes are excluded from triggers. |
| D1 floors | Nothing during acquisition. New-key blocks never count toward the 2 (3) clean takes. |
| Brief on first appearance only | §14.3. |
| Hands-free | No taps; the report window delays the next count-in by ≤ 3 s. |
| 12 keys | The map comes from each key's fingering; all state is per cell. |
| Rubato then tempo | A new item still starts in free time. The block needs an acquired main item, so it starts pulsed. |
| IS input rules | Verified checks need MIDI. A MIDI-expecting profile without a keyboard does not start the take (IS R3). A mid-take loss moves no fingering state (IS R4). `nc` takes have no `nl` or `xs` and move no state (IS R5). |
| One screen | Chords, lengthened notes and the chip add no height. |
| No toasts | End-line clauses and the item page only (no-active-users rule). |
| Rank by passes, V1, guard G | `fingering` kind never passes; straight takes count as they are; exemptions and the pass-evidence take (§9.2.3). |

### 9.8 Fingering takes never touch the item's own record (M1)
- **The hole.** The take path writes the item's ladder state for **every** take: `Drills.tsx:1772` calls `applyTake(st0, …)` on the item; `applyTake` sets `cleanBpm = max(cleanBpm, bpm)` on any clean take (`ladder.ts:134`) and pushes a `passLog` entry when the take is at ≥ `PASS_SHARE` × target and not "slower" (`ladder.ts:143–145`), which the warm half of the pass reads; result XP comes from `drillXp(m)` (`Drills.tsx:1785`). A clean C take at P1 at cap + 3 marks would lift `cleanBpm` above the cap at its click tempo, could add a warm-half entry, and G bursts would count although H2 §1.6 excludes bursts.
- **The real take path, read from the code (F1).** `Drills.tsx` `done()` (≈ 1748–1808) runs, in order:
  1. `refineCal` (MIDI velocity range, piano);
  2. `recordTakeAnalysis` (the player model, the AI coach's error and timing contexts);
  3. `takeTrace` → `recordTrace` (device and calibration upload) and the coach's `cTraces`;
  4. `applyTake(st0, …)` (`ladder.ts` 96–160): `channels`, `activeMs`, `takes`, `cleanBpm` (134), `history`, and **`passLog` on any clean take at the goal** (`atGoal`, 140–145, whatever the target), the goal streak and `lad.next` / `lad.message`;
  5. `notePresented` (the by-ear reveal and the "missed" flag), `newBestOf` / `setBest` / `cBests` (today's best), `local.current[itemId]`;
  6. `count.current` takes and clean (the run's `onEnd` totals);
  7. `onTake(lad.state, drillEvents(…), drillXp(m), takeInfo(…))` = `App.tsx` `take()` (≈ 2183): `noteChannel` (the week's channel balance, which sets the weaker-channel ×1.5 for other takes), `bandOfTake`, `bumpTake`, `stretchXp(…, boostFor(momentum))`, `MEMORY_XP`, `noteTake` (the session's take and clean counts, which `techResult` writes as `firstTry` / `total` into the completion record the teacher sees), the session band time from the `activeMs` delta, `bookTake` for improvisation lines, then **`store.recordDrill`** (`progress.ts` `recordDrillNow`, 1026–1052): `withDrillGains` (the weekly Momentum gains `records` and `statusUps`), the badge counters **`drillClean`**, **`tempoRecords`** and **`evenCv`**, `xp`, `stats.days` / `xpByDay`, rating events and snapshots, `drillItems[itemId]` with `markDrillDirty` (a server row), and `bookDrillTake` (the ledger: time **and** an item entry `d:<itemId>` with its clean count and tempo); then **`afterTake()`** (≈ 2209): record +5, cell closed +20, key filled +50 and Momentum cell/key gains;
  8. `setPrior` / `lastTake`, `setRes({ m, lad })` (the result line from `lad.message`);
  9. the continuation: in a coach run `coachNext` → **`coachAfter`** (`coach.ts:420`: `stepTakes`, `almost`, the limit, `setComfort`, and `nx.ceiling`, which `coachNext` writes with **`withCeiling`** so the matrix rests the item for days; `nx.items` stage and `ceil` writes); in a hands-free list run the next tempo from **`lad.next`** (`action === 'raise'`, ≈ 1796); otherwise `setBpm(lad.next.bpm)`.

  Every one of these, except the trace, must be bypassed for a fingering take. Pointing `applyTake` at another id is not enough (v5 did that): `recordDrill`, the badges, the channel balance, the ledger and `coachAfter` would still run, and `applyTake` itself writes `passLog` on a clean take at its goal (v5 wrongly said "no `targetBpm`, so no `passLog`").
- **The rule: a dedicated path, `takeFingering()`, that never calls `applyTake`, `onTake`/`take()`, `store.recordDrill` or `coachAfter`.** A take whose `cTake` (or list item) is a fingering take (A, B, C at P1–P3, G, drums O) branches **at the top of `done()`**, before `refineCal` (≈ 1751) and `recordTakeAnalysis` (≈ 1756) (minor: v6 said "after the trace", but both run before it):
  1. **`refineCal`:** skipped for A (block chords have unrepresentative velocities); kept for B, C, G and O, where it is harmless (it only widens the range, a quarter step).
  2. **No `recordTakeAnalysis`:** blocks, metered pauses and bursts never enter the player model or the AI coach's long-term patterns.
  3. **The trace is built and written** with `kind: 'fingering'`, as a v4 trace with `vr`, `fg` and the labels (§2.2, §15.4); drums get theirs from F9's drum trace builder (§12.3), since `done()` writes no trace for drums today (`isDrumDrill(drill) ? null`, ≈ 1764). `TAKE_KIND.fingering` is all false, so `sessionTendency`, `eligible` and the `cTraces` pooling ignore it; `fingerEvidence` ignores it too (`vr` is present, §3.1). The drum evidence stream is the one exception (§12.3).
  4. **No `applyTake`.** The structure's own grading (§5) gives the verdict; **`fingerLadder.ts`** updates a minimal **`FgLadder`** state for the cell (§15.1): per structure group **`positions`** (B), **`pause`** (C), **`cell`** (G), **`blocks`** (A) and **`orch`** (O), each `{ tempo, peak, limit, day }`, plus `takes`, `activeMs` and, for drums, `orchDays`. It has no `cleanBpm`, `passLog`, `history`, `channels`, goal or target, so nothing can pass, close or set a record.
  5. **The write goes through App (N2).** `Drills.tsx` has no `store`; every take reaches App through a prop. `takeFingering()` calls a **new, required App prop `onFingerTake(cellKey, mainItemId, ladderDelta, ms, skill, key)`**, wired at **every** Drills host (App ≈ 4747, 4773, 4804, 4821, 5115; required in the props type, so a missing host fails `tsc`; minor). App, in one place:
     - bumps **the same today-counts ref** as `take()` (`takeCounts.current`, App ≈ 2190, falling back to `progress.takeCounts` on a new day) under the key **`<mainItemId>~fg`**, so the next straight take's wholesale `takeCounts` write (`recordDrillNow`, progress.ts ≈ 1032) carries the fingering count and the cap can never reset;
     - computes the XP: `stretchXp(1, { band: 'work', factor: 1 }, nth, 0)`, i.e. **1 XP per fingering take** whatever the verdict, × `dailyRepeatFactor`: takes 1–6 of the day pay 1, takes 7–15 pay `Math.round(0.5)` = 1, takes 16 and later pay 0. **Cap: 15 XP per cell per day**, one key per cell (the cell's main item, §1.1), shared by its RH, LH and HT items. No band factor, no boost, no `MEMORY_XP`;
     - adds the XP to `drillSessionXp` and the session band time as band `work` from `ms` (`drillTakeMs`), once (`wrunRef` / `saveRun`); **fingering takes are counted apart (R8-1, R9-1)**: `onFingerTake` bumps a session counter `drillSession.fgTakes` (the `drillSession` ref gets a type that includes `fgTakes`, so `tsc` flags each of the ≈ 20 resets in App that would drop it; minor) (not `noteTake`'s `takes` / `clean`, and not `count.current`); the session result uses it only when the session has no measured takes (below); the run's `onEnd` totals stay measured-only; no `noteChannel`;
     - chains **`store.recordFingering(cellKey, ladderDelta, xp, { takeCounts: tc }, skill, key)`** on **`drillWrites`** (always, not only for chained takes) and then `setProgress`; `recordFingering` runs **under `drillLock`** like `recordDrill`, so a fingering write and the straight take before or after it never lose each other's `xp`, `stats`, `takeCounts` or item. **It applies the take's delta to the stored ladder under the lock** (the touched group's tempo, peak, limit and day; `takes` + 1; `activeMs` + ms), never the screen's whole `FgLadder` (minor);
     - **the session result (S2, R8-1):** `techResult` writes a result when **takes** happened, main or fingering: its gate is `drillSession.takes + drillSession.fgTakes > 0` (not XP: fingering takes 16 and later on a cell pay 0 XP, and the session still happened). **Two cases (R9-1):**
       - **When the session has measured takes,** `total` and `firstTry` stay **measured-only** (as with the feature off), and the fingering XP rides in `xp`. Counting fingering takes in `total` (v9) would have cost rewards: the result feeds `addSessionStats` (`goodSessions` needs ≥ 80 %, and `gemsOf` turns good sessions into gems), `stats.ts`'s `counts.perfect` and `records.fastPerfect` (`firstTry === total`), `achievements.ts`'s `historyPerfect` badge counter (`total ≥ 3 && firstTry === total`), `bestSessions`, the Recap and `lessonQuality`. So 10 clean straight takes plus 4 fingering takes stay a perfect 10/10 session. If `xp` would exceed `total × 20` (only with very few measured takes and much fingering XP, e.g. 1 measured take and 15 fingering XP), `rowCounts` clamps the server copy's `xp`; that small loss is accepted rather than raising `total`, which would break "perfect".
       - **A fingering-only session** (no measured takes) writes `total = fgTakes` and `firstTry = 0`, under **its own lesson id `technique-fingering`** (minor). **The override happens inside `techResult`, for every caller** (a path step's `tech.id`, `technique-assign`, `checkpoint-tech`, `technique`; App ≈ 2553, 2580, 2742, 2760, 5027) whenever the session has no measured takes, so a path step's post-processing (`lessonMastered`, step stars, `pathSheetFor`) never sees a "0 of N" result under the step id. **`quests.ts` `tech3`** ("3 technique sessions", which counts ids starting with `tech` / `technique`) **excludes `technique-fingering`**: quests reward measured practice, and a fingering-only session is extra work on a held cell, not a technique session in that sense. The readers that show a share are Stats (≈ 900) and the Recap (≈ 225), which show it as "Fingering work · N takes" / "עבודת אצבוע · N נגינות" instead of a "0 of N" share (the teacher screens, e.g. `TeacherProgress.tsx`, read no `firstTry`, so they need no change), and `bookResult` skips its `l:` ledger item entry (`bookFingerTime` already booked the time). It is never good or perfect (`firstTry ≠ total`; `historyPerfect` needs `firstTry === total`), which is neutral: the session would not exist with the feature off. It still counts as a practice day and as league XP. **No migration is needed:** the server checks on `toneturn_lesson_results` are `total` 1–50, `first_try ≤ total` and `xp ≤ total × 20`, and since 0.145.17 the client's **`rowCounts()`** (`cloud.ts`) clamps every row to them (total 1–50, `first_try ≤ total`, `xp ≤ total × 20`), and after a batch error the upload retries row by row, so one bad row can no longer block the others. A fingering-only session has `total` ≥ 1, and at 1 XP per fingering take its XP is far below `total × 20`; a mixed session's `total` is its measured takes, also ≥ 1. So fingering XP survives `rebuildProgress`, and the streak and the teacher's view see the session (the teacher's clean share is the measured share, unchanged by fingering work).
  6. **`store.recordFingering`** is the only progress write. It writes:
     - `progress.fingering[cellKey].ladder` (§15.1) and marks **`fg:<cellKey>`** dirty for the sync (§15.1 transport);
     - `xp`, `stats.days` and `stats.xpByDay` (a fingering take is practice, and its XP counts toward the daily goal and the league like any XP), and `takeCounts`;
     - **ledger time** through a new export **`bookFingerTime(skill, key)`** in `practice.ts`, which calls `book({ kind: 'technique', skill, key, q: 'consolidation' })` with **no item entry** (`consolidation` counts as quality time, so fingering minutes raise the deliberate-practice share; that is intended: slow, structured fingering work is deliberate practice; minor): time by skill and key, no `d:` entry, no clean count or tempo (minor: v6's "`book()` under `d:<mainItem>`" cannot be done, since only the item entry carries `d:`).

     It writes **nothing else**: no `withDrillGains`, no `bumpCount` (`drillClean`, `tempoRecords`, `evenCv`), no rating events or snapshots, no `bookDrillTake`, no `drillItems` entry, no `afterTake` bonuses.
  7. **Interim cold marking (minor).** Until H2 step 1 gives every cell `lastSound`, the history-based cold rule would mark the first straight take after fingering takes (or after new-key blocks, §10) as cold (`cd`), and that take would enter `refCold`. So `takeFingering()` writes a device **sounding mark** `fgDay.sounded[cellKey] = today` (§15.2), and F1b's `cd` is true only when the existing cold rule says cold **and** the cell has no sounding mark today. Once `lastSound` exists, it replaces the mark. The mark is device-only: a fingering take on one device and a straight take on another the same day can still be marked cold. That is accepted for an interim rule (minor).
  8. **`lastSound`** of the cell (H2 §1.4; a per-cell field, H2 step 1) is set: fingering takes are sounding takes (§9.1).
  9. **The continuation, `fingerAfter()`** in `fingerLadder.ts` (N3, S1, S2). It **owns the whole fingering visit or block, its straight takes included**:
     - **State:** a **`fg` sub-state in `CoachState`** (`FgVisit`, §15.1): visit id, cell, kind (`block`, `visit`, `cap`), the plan, the current step, the (structure, rung, tempo) pairs played (for the no-repeat rule), the lowest and the top clean straight tempo played, the ceiling, the pass-evidence attempts left and their tempi, takes used, the take and time budget, and whether touch point 2 was asked. It is saved with the coach run (`saveCoachRun` saves `coachRef.current`, which holds `fg`).
     - **Next take:** while `fg` is open, **`coachTake` returns `fg`'s next take** (`coachGo` reads the next take from `coachTake`, ≈ 1875). `fingerAfter(c, take, verdict, ctx) → { state, line, end? }` advances `fg` after every take of the visit, fingering or straight, by §5.3–§5.5, §9.2.2 and §9.2.3.
     - **After a fingering take: `fingerNext(r)` in `Drills.tsx` (S2)**, the counterpart of `coachNext`: it sets `coachRef.current = r.state` (with `fg`), adds the take's XP to `cXp`, adds 1 to the run's **`fgTakes`**, calls `persistCoach`, sets `cLine`, speaks the line as `coachNext` does, and schedules `coachGo` (or ends the run on `r.end`). Fingering takes never call `coachNext` or `coachAfter`.
     - **After a straight take of the visit** (P0, the straight ladder, the closing, the pass-evidence attempts): the take goes through the record path (`applyTake` → `take()` → `recordDrill`), so it counts. `coachNext` then calls **`coachAfter(…, { recordOnly: true })`** and, with its result, `fingerAfter`, which chooses the next take. **Record-only is defined per coach (S1):**
       - **Key session (`ksAfter`):** it updates the counters and click thinning, and **the tempo memory**: `lastBy` (the 10 % rule), `best`, `bestBy`, `sessionBest`, `lastGood`, `dayStart`, and **`flow[rung]` = one mark above the visit's top clean straight tempo, never above the cap**. **`lastGood` stays the last clean pulse**, as with the feature off; **the closing start is stored in its own field `ks.fgStart[itemId]`** (§9.2.2: one mark above the highest clean straight tempo of the cell today, if unplayed today and ≤ the cap, entered with `known: true`; otherwise A-6 is skipped in the closing) (R11-1, R12 minor 1). (so the first straight take served after the visit never repeats a tempo played straight in it). It **emits stage `marks`** for straight takes as it would with the feature off (`CoachNext.items`, which `coachNext` saves into `stages`): a clean pass-evidence attempt at target marks A-6 passed exactly as without fingering. It never updates `stepTakes`, `almost`, the limit, `ceiling`, the challenge (`chal`, including its session ceilings `chal.ceil`), or the visit's choice of next take. **The item-`ceil` clear stays:** a clean take at or above an item's `ceil` still clears it through the marks (`saveMark`), as with the feature off, because that is a legitimate item mark (minor). It checks `timeUp` and the closing.
       - **Old coach (`coachAfter`, R8-3):** it updates `takes` / `clean`, click thinning, and **`c.passed` / `passedNow`** when a straight take passes the key by the usual rule. **It never updates `c.at` or `peak`** (v8 did: `tempoOf` returns `c.at` for whatever item is current and the plateau rule compares later takes with `c.peak`, so the next key would start at the held cell's tempo and could get a false `ceiling`), nor `stall`, `ceiling` or `setComfort`, and never chooses the next take. It checks `timeUp`.
         - **Which item (minor):** with several items per level (RH, LH, HT specs), the visit's straight takes use **the cell's main item** (§1.1). The existing pass path runs from the current `c.spec` only when the main item is the current spec's item; a pass on the level's last spec passes the key (`c.passed`), as now (`c.spec + 1 < specs.length → c.spec++` otherwise). A clean take of the main item while `c.spec` points at another item still counts on the item's record, but takes no old-coach pass path.
     - **Time and closing:** `fingerAfter` checks **before every take** the session time (`now − startedAt ≥ minutes`, as `coachAfter`'s `timeUp`) and, in the key session, whether the closing is due by **`keyCoach`'s `closingMs(c)`** = min(`CLOSING_MIN`, the session's minutes × `SHARE.closing`) (minor: not a flat 3 minutes). If either holds, the visit ends after the current take (end-on-success is not required) and control returns to `coachTake`, which ends or closes the session by its own rules.
     - **Opening and closing the visit in the host (S1):**
       - **Key session (R8-2), matching `keyCoach.ts`:** the visit takes **the rest of the cell's current visit after its cold-check take** (§7.2). The cold take runs through `ksAfter` in **normal** mode (it is never a fingering take or a straight take inside `fg`). **`fg` opens only when** that `ksAfter` result has no `end`, stays in **the same visit** (`inf(lv(fam, c)).visit` unchanged) and `!ks.closing`; otherwise (the cold take triggered `closingDue`, `timeUp`, or the warm-up count reached 0 with `warmNext < 0`, so `ksAfter` already moved on) the fingering visit does not run in visit 0: on a held cell it moves to the attempts-only window at the closing (§9.2.3), and otherwise it does not run today (R9-2). When it opens, `fingerAfter` **opens `fg` without calling `openVisit`** on the rung (which would re-run the probe flags, `warmLeft`/`review`, `enter()` and its own `visitBudget = share × minutes`, and would label the visit's straight takes `review`/`retention` in `done()`): it sets `ks.visitAt = now`, `ks.visitTakes = 0` and `ks.visitBudget` = the §7.2 budget (or §6.2's for a block), and **clears the inherited warm-up and challenge state (R9-2)**: `ks.warmLeft = 0`, `ks.warmNext = -1`, `ks.review = false`, `ks.reviewHere = false`, and `ks.chal.pending = null`. On a known rung `openVisit` for visit 0 set `warmLeft = WARM_TAKES` (= 2) and `review`, and the cold take left `warmLeft = 1`; without this reset every straight take in `fg` would be labelled `retention` / `review` in `done()` (whose `kind` reads `warmLeft`), kinds whose `TAKE_KIND.passes` is false. After the reset they are `normal`. **At the end** it clears `fg` and leaves the rung **exactly as `leave = 'budget'` does** (`ksAfter` ≈ 1162–1187): `nextVisit(fam, c, items, cur, now)` → `openVisit(nv)`, or the closing (`closingV`) when `closingDue`; `nv < 0` ends the session with the summary. It does not push to `ks.finished` (visit 0 is never reopened anyway). **On visit days the scale's own A-6 climb and A-7 move to the closing** by its existing rules; the closing is capped (§9.2.2). **The capped closing and the attempts play the cell's main item** (its HT item where one exists), not `stageDrill(a6, 0)`'s spec 0 (minor). **The closing of a held cell follows §9.2.2** (A-6 skipped when the cap was reached today; attempts, else A-7, else the end). **A cap visit inside the closing** ends with the session (`ks.closing && leave` → `end`, as at `ksAfter` ≈ 1174); the "yield when less than `closingMs` remains" check does not apply inside the closing; its budget is min(§7.2's cap-visit budget, the session time left) (minor). A cap visit that starts inside A-6's own climb (a session without a planned fingering visit) uses the same opening (budget reset, `fg`) and the same end.
       - **Old coach (R8-3):** at the end of a block or visit the cell is **done for the session**. On a key pass the existing pass path runs. Otherwise the coach advances **exactly as its park path does, without adding to `weak`**: `misses = 0`, `slower = 0`, `up = 0`, `almost = 0`, `run = 0`, `peak = 0`, `stall = 0`, `spec = 0`, `c.at = undefined`, `keyIdx = nextKeyIdx(c)`, and **the cell key is added to `c.fgDone`** (R9-4). So the next key's first tempo and plateau state are those of a run in which it comes first, and no `ceiling` is ever written for an item other than the one whose takes produced it. **`fgDone` makes "done for the session" real (R9-4).** `CoachState` gains `fgDone: string[]`, the cell keys finished for the session, saved with the run. `nextKeyIdx` (which loops over all keys and returns the first unpassed one, else the current one, and otherwise wraps) **skips keys whose cell is in `fgDone`**, **including its fallback**: when every unpassed key is in `fgDone`, it laps over the passed keys as the feature-off run does (`(keyIdx + 1) % n`), skipping `fgDone`. So do the weak-spot review (`c.weak`) and the step's key choice in `coachTake`. **A one-cell run** is defined as **"every key of the step is in `fgDone`"** (a single-key assignment, a standalone run): only then is there nothing to lap over, and it continues with fingering takes only, as in §9.2.2, and ends with the hold line. (v10 also counted a multi-key run whose other keys are passed as one-cell; that contradicted the fallback, which laps over passed keys.) A new day's run starts with empty `fgDone` and `peDone` (`coachRun.ts` drops other days' runs) (minor).
       - In both coaches the cell is not served straight again in the session except the key session's closing, which plays at most at the cap and never repeats a tempo played straight in the visit (§9.2.2).
     - **Persistence (S2):** `persistCoach`'s gate becomes **`count.current.takes + fgTakes === 0`** (it returned early when `count.current.takes === 0`, which a session of only fingering takes, e.g. new-key blocks or a block left after A and C, never passes); `fgTakes` is kept in the run save beside `takes`. So a reload after only fingering takes resumes the visit.
     - **List runs and standalone runs (S2):** a list run's position lives in the queue save (`saveQueueAt` in `coachRun.ts`; `OpenRun` holds only key, day and flags). The queue save gains **`fg?: FgVisit`**, written after every take of a visit and cleared when it ends. **The standalone run** ("Retrain this fingering" on the item page) uses the same queue save under the key **`fgq:<cellKey>`**, so it resumes the same way. The verdict line comes from the structure's grading, never `lad.next` or `lad.message`.
     - **The queue continuation (R8-4).** In a list or standalone run with `fg` open, after every take of the visit (fingering or straight), `done()` / `takeFingering()` call **`fingerAfter(null, take, verdict, ctx)`** with the queue save's `fg` as its state (no `CoachState` is needed). The returned next take sets the drill (structure, rung, hands) and the bpm through the same setters `go` and `hfSchedule` use, after the spoken line in hands-free runs or on Next in manual runs. **While `fg` is open (a fingering visit or the attempts-only window), `lad.next` (the raise ladder, `setBpm(lad.next.bpm)`) and the hands-free miss ladder (`hfMiss`) are bypassed**; in the attempts window this matters because `hfMiss`'s replay would be two attempts at one tempo (minor 3). At `end`, `fg` is cleared and the list run continues with **`go(i + 1, auto)`**; a standalone run ends. The queue save is written after every take.
  10. **Display:** no `notePresented`, `newBestOf`, `setBest`, `cBests`, `setPrior` or `lastTake` update; the result line is the structure's own (§14.4).
- **Never written by a fingering take**, anywhere: the main item's `drillItems` record (all fields: `cleanBpm`, `passLog`, `goalBpm`, the goal streak, `history`, `channels`, `activeMs`, `takes`, `stages`, `ceil`), any `drillItems` entry, the SP §1 session tempo, KS2 stage counters (`stepTakes`, `almost`, the limit, reopen and WAVE state), comfort ceilings, the challenge `ceil`, plateau state, the week's channel balance, the weekly Momentum gains, the badge counters, rating events, the ledger's item stats, today's best, the session's take and clean counts, the player model.
- **`isFingerRow(id)` = `id.startsWith('fg:')`** (S3). It covers **only** fingering rows. `<item>~feel` items are **not** filtered: SP §21 A2 (binding) keeps them in the matrix and the path as levels of the parent family, with their own cold and pass takes under their own id, excluded only from the parent's rank and breadth by SP's own rules (v7 wrongly put `~feel` under the filter). Locally, fingering state lives in `progress.fingering`, never in `drillItems`; the `fg:` ids exist only on the sync path (§15.1). As a guard, every `drillItems` reader skips `isFingerRow` ids: the key matrix (`keyMatrix`, including `takeSeconds`), `projectionInput`, rank and `exerciseIdOf` breadth, the plateau detector, Momentum (`afterTake`'s cells and keys), H10 readiness and the working edge, item lists, the path and the stars, the teacher submission, `refreshProfile`'s item merge, and `mergeItems` (which dispatches `fg:` rows to the fingering merge instead). **`markAllIfFirst` does the opposite: it also marks every `fg:` row dirty** on a device's first sync in a scope, so its fingering state goes up (minor).
- **Straight takes stay on the item:** P0, the straight ladder, the closing and the pass-evidence attempts are ordinary takes and go through the normal path.
- Checked by **G24** (one case per leak listed above); G16 (b) also asserts that no fingering take's tempo reaches `cleanBpm`.

### 9.9 Consistency with H2 v16 (owner decisions 2026-11-28)
- **The tier guard at P ≥ 0.9.** Nothing here reads or sets the guard. Fingering takes never enter the guard record (the H2 §1.6 amendment entry, §9.2.2). Held cells' counting cold checks enter it exactly as with fingering off; Q8 (a) keeps the pass-evidence attempts from opening the pass-probe branch far below the band, which would otherwise add probe-band misses to the stricter guard. G3 reports the guard-record miss count on and off.
- **A warm-first skip always counts as a miss, with a UI warning before the take.** Fingering work is always planned **after** the cell's cold check (R1, §6.1, §9.1), and due cold checks are kept ahead of blocks and visits in every budget (§6.1). So **the warm-first warning must never fire before a fingering take**, and a fingering take can never cause a skip: every planner asserts R1 before a fingering take (G2), and the warning's check treats a planned fingering take after a done cold check as allowed. The only fingering takes that may come first in a cell are new-key blocks on a cell that is new everywhere, which has no due cold check (§10), so no warning applies there either. Range-learning, answer and slip-mark presses are not takes and never count as "sounded" (§1.4).
- **A merge downgrade within 24 h re-derives rank.** Fingering rows (`fg:`) never carry rank evidence and are skipped by rank's readers (`isFingerRow`, §9.8), so merging them never triggers or affects a rank re-derivation. Straight takes inside a visit are ordinary takes and follow v16's rule like any other.
- **H10 targets per area kind.** Held cells are excluded from the flat-rank slope and the appropriateness metric while held (§9.2.2), whatever the area kind's target; fingering variants count at effective difficulty. G22 checks this against the per-area-kind targets. The H2 §1.6 amendment entry (§9.2.2) adds fingering takes to the takes that never count.

---

## 10. Blocks on a new key's first appearance (O7)
- **When:** the first appearance of a scale rung in a key in the key session, before A-1/A-2.
- **What:** one Blocks take (A) per hand at comfort, kind `fingering`, RH then LH. With own fingering, the blocks follow it.
- **Skipped when:**
  - **the cell has any cold result or any `lastSound` history, in any planner** (P3): the blocks are only for a cell that is new everywhere. The same cell (e.g. `scales:scale:2:RL:o2`) is also played in the old coach and list runs, which set no KS stage passes, so "first appearance in the key session" alone could put a sounding take before a due cold check, which H2 v16 §1.6 counts as a **miss**;
  - the probe marks A-1/A-2 passed (KS2 U2/D2; D4's probe in a new key);
  - A-1/A-2 were passed before in this key;
  - the setup is on mic;
  - expected fingering is missing at any crossing of the line;
  - the session is `!` (unless pinned).
- **Order:** the probe (A-3) runs first. Only a missed probe, or no probe, leads to the blocks, then A-1.
- **Counts toward nothing:** not D1, not a coordination pass, not cold. It may come first only in a cell that is new everywhere, which has no due cold check (§9.1); any due cold check of the cell is always played first (R1, G2).
- A failed grouping shows the groups once and moves on. It is never a gate.

---

## 11. Across days: goal, confirmation, retirement, rechecks (S7)

### 11.1 The goal
- **G = 0.95 × the item's target**: the H2 probe band, which H2 treats as "at target". RF1 §6.3 and RF2 §8.3 retire at the item's target. Retiring lower would lift R2 and let the plain climb re-enter the band where the habit returns.
- G comes from the catalogue target only, never from E or a report (S2).
- **No cold-tempo override (Q5, resolved by S2):** v1's "cold take at G" is removed. With G in the probe band, every confirmation and recheck lands on a cold take H2 §1.9 already plays there: the pass probe for unpassed items with `cleanBpm` ≥ 0.95 × target (after which the staircase resets to the tempo played, as H2 says), or the probe-band confirmation for passed cells. A cell whose climb is below the probe band cannot confirm yet. It climbs first, under the cap that rises with E.

### 11.2 Confirmation (per hand)
A **clean cold check at ≥ G**, reported **OK** at touch point 1, which also passes the **"no break, no worse than flagged" check** (MIDI setups, §11.3).

### 11.3 The "no break, no worse than flagged" check (N3, M6)
- **Tempo-matched.** The confirmation take plays in the probe band, often 30 % or more above the T1 lower band, and a correct fingering also shifts with tempo (RF1 §3.2). So the take is compared with **the flagged state at its own tempo band**, never with a slow reference (v2 did, and failed the owner's own fast takes).
- **Its honest name (M6).** The reference is the flagged state itself, so the check asks only "**no break, and no worse than flagged**". About 84 % of takes played with an **unchanged** fingering pass it; in the probe band it means, in practice, "no break". It cannot show that the fingering changed. That is acceptable in v1 because it only restricts the player (§9.6), and it is how §9.4's E rises, §11.5 and §14.2 are worded.
- **The frozen reference.** At flag time (any source) F3 freezes in the synced flag record (`FlagStat.ref`, §15.1) the flagged group's R_g per 1.25× tempo band, **from T1-eligible rows only** (§3.1: straight, full click, clean or almost; failed takes excluded): `{lo, mean, sd, n}` for each band with n ≥ 5, at most 6 bands. **Bands are anchored at the Maelzel mark at or below the lowest eligible row, and half-open** (minor): [lo · 1.25^k, lo · 1.25^(k+1)). In the D-major data the lowest row is ♩83, so lo = ♩80.
- **Two references, warm and cold (M6).** T1 drops cold takes because they carry the cold effect, so a warm reference would fail a cold-late thumb systematically. F3 therefore freezes **`ref`** from warm rows and **`refCold`** from cold rows (`cd`), the same way. A **cold** take (a confirmation or recheck) is compared with `refCold` when its band has ≥ 5 cold rows; **otherwise the check is the break check only**, until shadow labels exist. A **warm** take (the top take of §9.4) is compared with `ref`. It also freezes Δ's side (`dir`): the sign of Δ for T1, of the break residuals for T2, and for T3 and manual flags the sign of the highest band's mean minus the lowest band's, when both exist. The reference never ages out and is the same on every device.
- **The v1 condition**, until the shadow analysis shows what R_g means at the probe band:
  - **not a break take** for that hand (§3.3), **and**
  - **no worse than flagged at the same tempo band:** R_g lies no further on Δ's side than that band's frozen mean + 1 frozen SD (of the matching reference, warm or cold). The band is the one that holds the take's tempo; if it has no row, the nearest band below within one band; if there is none, or no `dir`, the check is "not a break take" only.
- **On the owner's D-major numbers** (LH `xu`, T1 at c* = ♩100, Δ > 0; T1-eligible rows recomputed from the traces in round 3; bands anchored at ♩80):
  - ♩100–125, the ♩103 take included: mean +11.3 ms, SD 11.4, so a warm take there passes at R_g ≤ +22.7 ms;
  - ♩125–156: n 14, mean +4.4 ms, SD 10.5, so a warm take passes at R_g ≤ +14.9 ms; 12 of the 14 reference takes pass (that is the check's permissiveness, not evidence of a fix);
  - a take with a break (the +96 ms take at ♩124) fails;
  - **cold confirmations:** v1 traces do not mark cold takes, so no cold rows exist yet, and a cold confirmation today would get the break check only;
  - in this item R_g is **one note per take** (§3.3), so the check rests on a single LH `xu` residual.
  - **Honest reading:** at ♩126+ the owner's group shows almost no shift, so in the probe band the check is mostly the break check. That is why it is tightened only on shadow labels.
- **Tightened only after §16.2**, with the owner (on the re-fit list).
- OK alone still cannot retire a MIDI player whose confirmation take shows a break (§14.2). It can retire one whose fingering did not change but who did not break; the check does not claim otherwise.

### 11.4 Retirement, rechecks, relapse
- **Retired** when every flagged hand has confirmations on **2 distinct days** (≥ 8 h apart, different local days; H2 §1.6 "later day"), with no slipped on that hand between them: **only confirmations after the hand's `lastSlipAt` count** (strict, like H9's reset). `lastSlipAt` is synced, so a slip on one device clears the other device's earlier confirmations on merge (minor). Then R2 is lifted, visits stop, `retiredAt` = now (F3), and `recheckDue` = +7 days.
- **Rechecks at speed:**
  - The recheck is the first cold check **at ≥ G** on or after `recheckDue`. Touch point 1 asks, with the §11.3 check.
  - Touch point 2 also fires once on the first climb that passes E0 after retirement.
  - A T1 or T2 fire during the recheck period brings the next recheck forward to the next cold check at ≥ G, **counting only rows after `retiredAt`** (§3.5, F3), so the 7- and 21-day spacing holds unless new evidence arrives.
  - OK (and the §11.3 check) → `recheckDue` = +21 days; after that recheck → `done`.
  - **Slipped, or a failed §11.3 check** → back to `retraining` from the next session (visits, R2), E from the slipped tempo (or one mark below the take), **no new block**. A second failed recheck of the same fingering → a block on the next appearance.
- **Mic players (honest fallback):** there is no §11.3 check on mic. Retirement and rechecks are **report-only**: two clean cold checks at ≥ G reported OK on distinct days. This is safe because R2 only restricts the player, and nothing measured depends on it. The item page labels it "by your report". The mic C ladder moves on onset-verified placement in hands-separate takes (§5.3), so a mic visit never repeats the same take at one tempo.
- **Breaks:** time away never changes the state. After 60 days without a cold check, a state returns to `flagged` with E kept, and asks nothing until the cell is played.
- **Nothing is promised about duration** (RF2 §5: no piano study; 4 days was not enough in Hardwick).

### 11.5 A player who never answers (N6)
v2 raised E only on answered reports, so a silent player stayed capped for good.
- **On MIDI,** E rises without answers on top takes that pass the §11.3 check (§9.4), so the cap climbs with clean playing.
- **Only asked-and-unanswered days count (M3).** A **silent day** for a cell = a day on which **at least one window for that cell was shown** (touch point, spot check) **and none was answered**. Days with no window (TP1 fires only after a clean cold check, TP2 only after the day's highest clean top take, the 2 + 2 daily limit is shared across cells, and visits skip sessions) do not count. `quiet` stores the count (§15.1).
- **After 5 silent days in retraining**, the end line asks once: "Keep the fingering hold on D major? Yes · Stop". Hands-free: top key = yes, bottom key = stop, within 6 s. Yes resets the count. **It shares the end line by priority:** one end-line question per session, the keep-hold question first; an offer waits for the next session (§4).
- **After 10 silent days** (that question unanswered too), **the hold ends by itself:** state `done`, `stoppedAt`, `stopWhy: 'silent'`. R2 lifts at once. The item page says "Fingering hold ended: no answers". Settings → "Offer again" undoes it (§14.6). T1 and T2 keep running; a later fire is offered only when it meets its minimums on rows after `stoppedAt` (§3.5, N4).
- Any answered window or slip mark resets the count.
- A cell without a hold (§9.2.0) has nothing to lift; its visits end with the assignment or at "Stop".

---

## 12. Drums: orchestrated stickings (O9, S9)

### 12.1 The idea
On an e-kit the MIDI carries the pad, not the hand. **Orchestration** plays each hand on its own voice, so the pad proves the hand (RF2 §10). The owner tests on an e-kit over MIDI. **Drums are MIDI only** in this feature, except T3 through the item menu's "My fingering slipped" (minor).

### 12.2 Mapping
| Shared design | Piano | Drums |
|---|---|---|
| Assignment per note | expected finger | expected hand (`ExpNote.hand`, the sticking) |
| Site | a crossing note | **the first stroke after each change of hand** (S9) |
| Verified structure | A, B, C | **O** = orchestration: R strokes on V_R, L strokes on V_L |
| Pause ladder | C before each crossing | C before each site (P1–P3) |
| Cell | G around a crossing | G around a site |

- **Items:** sticking rudiments with mixed stickings: paradiddles (single, double, triple, paradiddle-diddle), doubles, six-stroke rolls. Not flams or drags in v1.
- **Orchestration:** V_R is chosen by the player in the drum settings (default floor tom; high tom when the kit map has no floor tom). V_L defaults to snare. A swap switch for left-handed setups.
- **Generator** `orchestrate(drill, { R, L })`: same rhythm, each stroke on its hand's voice. Graded by `drumAnalyze` on voice and timing.
- **A wrong-pad stroke (crosstalk-safe):** a stroke at an expected onset counts as a sticking slip only when the **expected pad had no hit within ±30 ms**, the other hand's pad had one, and that hit passes the crosstalk velocity filter (`midi.ts` `crosstalk`). It must be a **substitution, not an extra**. Mesh-kit crosstalk otherwise fires the snare from a floor-tom hit.

### 12.3 Flags, ladder, cap
- **Orchestrated takes join the drum feel pool** for sticking rudiments: every fourth visit of a sticking rudiment is orchestrated (kind `fingering`), once the rudiment is acquired (SP §16.1: no feels during acquisition; minor). So D-T1 can raise a first flag (S9: it was circular in v1).
  - **Consent (minor):** they need the player's consent once per account: a one-time end-line offer on the first acquired sticking rudiment, "Add orchestrated takes to check your sticking? Yes · Not now". They run only after Yes, and **"Suggest fingering work" off stops them** (§14.6). Without consent, drum flags come from D-T2 (plain takes) and D-T3 only.
  - They are named in the drum feel pool's brief and pay through `store.recordFingering` like every fingering take (1 XP, §9.8).
  - **Until the SP feel pool exists** (the rotation is not in `coach.ts`, §2.4), the host is the old coach: with consent, **one O take after the cold check in every session of an acquired sticking rudiment**, run as a one-take `fg` (`kind: 'orch'`) through `fingerAfter` (1 XP, a few seconds), **at the `orch` group's tempo: one mark up per clean O take, at most the rudiment's session tempo; after a miss, one mark down, floor the comfort pulse, never a repeat of a missed tempo** (its start is the rudiment's comfort pulse), so D-T1's 1.25× band fills (minor). **Why every session (minor):** D-T1 needs ≥ 2 orchestrated takes with a wrong pad at one site within 7 days; at one O take every fourth session that needs about 8 sessions of one rudiment a week, so no flag would ever result, while one per session makes 2 in a week reachable by a player who practises the rudiment on 2 days. Widening D-T1's window to 28 days was the alternative; it was rejected because it would mix evidence across tempo progress. When the feel pool ships, it takes over the "every fourth visit" rule and the interim host stops.
- **The drum per-note log** (F9): drums get `nl` with `h` = expected hand, `e` = expected voice note, `p` = played voice note − expected, `d`, `v`, `o` = null, `x` = **`h`** (a new class char: hand-change site) or `.`, and `f` = `R`/`L` characters. The `NoteLog` type documents both meanings of `f` (digit for piano, hand letter for drums).
- **The drum trace and the drum evidence stream (N5).** `done()` writes no trace for drums today (`isDrumDrill(drill) ? null`, Drills ≈ 1764), and every `vr` take is excluded from `fingerEvidence` (§3.1), so v6's D-T1 had no data. F9 adds:
  - a **drum trace builder**: a v4 trace with the drum `nl` (above), `vr` (`O` for orchestrated takes), `cell`, kind and verdict, written for drum sticking takes, plain and orchestrated, on MIDI;
  - a **drum evidence stream** `drumEvidence` (device IndexedDB, the same retention as `fingerEvidence`, §2.3): per cell and site, each orchestrated take's crosstalk-safe wrong-pad strokes `{at, nps, site, wrongPad}` (plus a row with `wrongPad: 0` for a clean orchestrated take, so rates exist). **It is exempt from the `vr` exclusion**; the exclusion stays for the D-T2 plain-take rows in `fingerEvidence`.
- **Triggers:**
  - D-T1: from `drumEvidence`, orchestrated takes with a crosstalk-safe wrong-pad stroke at the same site, in ≥ 2 takes within 7 days in one 1.25× band;
  - D-T2: the T1 split test on plain (one-surface) takes, on the site strokes' residuals;
  - D-T3: a report.
- **The orchestrated edge** = the highest clean orchestrated tempo reached on 2 distinct days, from `FgLadder.orchDays` (the last clean orchestrated tempo per day, the newest days kept; minor: one `day` in `FgGroup` could not hold two days). **The plain cap while retraining** = max(orchestrated edge + 2 marks, the D-T2 plain edge). The 2 marks allow for travel between two surfaces, which under-reads one-surface ability (S9). **A D-T3 flag before any orchestrated edge exists** starts E from the report (one mark below the slipped tempo), as on piano (minor). The hold rule (§9.2.0) applies as on piano.
- **Block and visits:** as piano, with O in place of A and B. Block: O at comfort → C on O (P1 → P0 at ≤ cap) → G → plain closing at T_S.
- **Report (Q2):**
  - **crash** = OK;
  - **two kicks 80–400 ms apart** = slipped (debounced against kick double-triggering), or the **ride bell** when the kit map has one;
  - never the hi-hat foot, which moves incidentally;
  - no hand question: the orchestrated takes locate the hand;
  - window: 3 s after the last stroke has decayed (≥ 0.8 s);
  - **slip mark** (no window, §3.4): the ride bell when mapped, else two kicks 80–400 ms apart, within 4 s after the last stroke has decayed.

---

## 13. Guitar and bass
- **Picking and plucking direction:** skipped until a data signature exists (O10). When `nl` covers guitar/bass (a later step), an odd/even timing or velocity split is tested offline first.
- **Fretting position** (MIDI guitar `string/fret`): third in order, after drums. Not in v1.

---

## 14. Honesty, rewards and what the player sees

### 14.1 Reports earn nothing
- **No XP, rank, pass, star, Momentum, league, badge, streak or cap** comes from a report or from a `fingering` take's verdict (RF1 §2.2).
- **XP:** a fingering take earns a flat **1 XP**, whatever the verdict, × the daily repeat factor counted under `<mainItem>~fg` (one key per cell, shared by its RH, LH and HT items): at most **15 XP per cell per day** (§9.8 item 6), written by `store.recordFingering`. No stretch band, no Momentum boost, no record, close or key bonus, nothing per result or report (P1).
- **A slipped never cancels anything** (RF1 §6.5).

### 14.2 Why lying doesn't pay
- OK cannot retire a MIDI player alone (§11.3).
- OK raises E by at most 1 mark per day, 2 when the take passes the "no break, no worse than flagged" check (§9.4, §11.3). That check is permissive (about 84 % of unchanged-fingering takes pass); what it reliably stops is an OK on a take with a break.
- Silence never traps the player: E rises on takes that pass the check, and a hold ends after 10 asked-and-unanswered days (§11.5).
- Escaping is free: "Stop fingering work on this item".
- The spot check catches OK on an audible break (§8.4).
- Questions are rare and narrow.
- **A per-player agreement score** κ (reports against T2 break takes) is kept once ≥ 20 reports exist. It weights only the offer ranking (RF2 §6.3).
- **The harness** (G1, G16) proves §9.6.

### 14.3 Briefs (first appearance per run only; KS2 D6 countdown)
| Kind | en | he |
|---|---|---|
| Day-1 block | Stick to one fingering, slow first. We'll shrink the pause before each hand-position change. | רק אצבוע אחד, קודם לאט. נקצר את ההשהיה לפני כל מעבר מנח יד. |
| First report on this keyboard | Press your highest key, then your lowest. | לחצו על הקליד הכי גבוה, ואז על הכי נמוך. |
| Slip mark (first in-scope cell; M4, minor) | Fingering slipped? Press your lowest key twice after the take. | האצבוע לא יצא נכון? לחצו פעמיים על הקליד הכי נמוך אחרי הנגינה. |
| Slip mark, no keyboard range yet | First, press your highest key, then your lowest. | קודם, לחצו על הקליד הכי גבוה, ואז על הכי נמוך. |
| Slip mark, mic or no zones | Fingering slipped? Use "My fingering slipped" in the menu. | האצבוע לא יצא נכון? בתפריט: "האצבוע שלי לא יצא נכון". |
| Retrain this fingering (manual start) | Stick to one fingering, slow first. If it slips, press your lowest key twice after the take. | רק אצבוע אחד, קודם לאט. אם הוא לא יוצא נכון, לחצו פעמיים על הקליד הכי נמוך אחרי הנגינה. |
| Blocks (A) | Each hand position as one chord: you'll see where the hand moves. | כל מנח יד כאקורד אחד: תראו איפה היד זזה. |
| Position rhythm (B) | Make the last note of each hand position long. | הצליל האחרון בכל מנח יד: ארוך. |
| Vanishing pause (C) | Pause before each hand-position change and place the hand. | השהו לפני כל מעבר מנח יד והניחו את היד. |
| Cell (G) | Just the change, in short bursts. | רק המעבר, בפרצים קצרים. |
| Drums, orchestrated (O) | Right hand on the floor tom, left on the snare. | יד ימין על הטום הרצפתי, שמאל על הסנר. |

### 14.4 Lines (one line each; matter-of-fact; no emoji)
| Moment | en | he |
|---|---|---|
| Report prompt | Fingering OK? Top key = yes · bottom key = no. | האצבוע תקין? קליד עליון = כן · קליד תחתון = לא. |
| Report prompt, pedal only (range not learned, or empty zones) | Fingering OK? Tap the pedal for yes. | האצבוע תקין? הקשה על הדוושה = כן. |
| Report prompt, tap fallback | Fingering OK? ✓ · ✗ | האצבוע תקין? ✓ · ✗ |
| Report prompt, with a place | Way down at F♯: fingering OK? | בירידה, ב-F♯: האצבוע תקין? |
| Hand question (HT; its own line, shown 1 s after "slipped") | Which hand? Bottom key = left · top key = right. | איזו יד? קליד תחתון = שמאל · קליד עליון = ימין. |
| Spot check | Way down at F♯ it caught. Fingering OK there? | בירידה ב-F♯ זה נתקע. האצבוע שם תקין? |
| Reminder | Top or bottom key after the take; or let it be. | קליד עליון או תחתון אחרי הנגינה; או לוותר. |
| Slip mark, end-line clause | Noted: left hand slipped in D major. | נרשם: האצבוע ביד שמאל ברה מז'ור לא יצא נכון. |
| Slip mark, undo | Undo | ביטול |
| Item menu, slip mark | My fingering slipped | האצבוע שלי לא יצא נכון |
| Silent hold, question | Keep the fingering hold on D major? Yes · Stop | להמשיך לעצור את הטמפו בגלל האצבוע ברה מז'ור? כן · להפסיק |
| Silent hold, ended | Fingering hold ended: no answers. | עצירת הטמפו בגלל האצבוע הסתיימה: אין תשובות. |
| Settings button (device) | Learn keyboard range | ללמוד את טווח המקלדת |
| Item page, no hold | Fingering visits · no hold | ביקורי אצבוע · בלי עצירת טמפו |
| Offer | Above ♩100, your left hand's way down in D major changes. A fingering block next time? | הירידה של יד שמאל ברה מז'ור משתנה מעל ♩100. תרגול אצבוע מרוכז בפעם הבאה? |
| Offer buttons | Yes · Not now | כן · לא עכשיו |
| Drums, orchestrated takes offer (once) | Add orchestrated takes to check your sticking? Yes · Not now | להוסיף נגינה שבה כל יד על תוף אחר, כדי לבדוק את הסטיקינג? כן · לא עכשיו |
| Plan check, wrong | The pauses fell on E and B. The hand positions end on F♯ and C♯. Once more. | ההשהיות נפלו על E ועל B. מנחי היד נגמרים ב-F♯ וב-C♯. עוד פעם. |
| Plan check, second miss | Your hand positions end elsewhere. Mark your own fingering? | מנחי היד שלך נגמרים במקום אחר. לסמן אצבוע משלך? |
| Rhythm map miss | Long on E; the hand position ends on F♯. | ארוך על E; מנח היד נגמר ב-F♯. |
| Block end | Left hand's fingering stays steady to ♩116. Next: the pause, down to a quarter beat. | האצבוע ביד שמאל יציב עד ♩116. הבא: ההשהיה, עד רבע פעמה. |
| End-line clause | Left hand, way down at F♯: pause down to a quarter beat. | יד שמאל, בירידה ב-F♯: השהיה עד רבע פעמה. |
| Attempts window (not a new task kind: no brief) | Two tries at the target, ♩120. | שני ניסיונות ביעד, ♩120. |
| R2 hold | Held at ♩116 while the fingering settles. | הטמפו נשאר ב-♩116 עד שהאצבוע מתייצב. |
| Retired | The D major fingering held in the first take of the day, on two days. Back to normal practice. | האצבוע ברה מז'ור החזיק בנגינה הראשונה של היום, ביומיים שונים. חוזרים לתרגול רגיל. |
| Recheck relapse | The old fingering came back in the first take of the day. Short fingering visits again. | האצבוע הישן חזר בנגינה הראשונה של היום. שוב ביקורי אצבוע קצרים. |
| Item page | Fingering ♩116 · your report | אצבוע ♩116 · לפי הדיווח שלך |
| Item page, E not from a report | Fingering ♩116 · from your playing | אצבוע ♩116 · לפי הנגינה שלך |
| Item page, mic retirement | Fingering settled · by your report | האצבוע התייצב · לפי הדיווח שלך |
| Item page actions | Retrain this fingering · Stop fingering work | לאמן מחדש את האצבוע · להפסיק עבודת אצבוע |
| Settings card title | Fingering coach | מאמן האצבוע |
| Settings switch | Suggest fingering work | להציע עבודת אצבוע |
| Settings switch (device) | Answer by voice (this device) | לענות בקול (במכשיר הזה) |
| Settings button | Offer again | להציע שוב |
| Settings button hint | Clears every "Not now", and undoes "Stop" from the last 60 days. | מבטל כל "לא עכשיו", ומבטל "הפסקה" מ-60 הימים האחרונים. |
| Settings list title | In retraining now | באימון מחדש עכשיו |
| Settings list row | D major scale · left hand · ♩116 · your report | סולם רה מז'ור · יד שמאל · ♩116 · לפי הדיווח שלך |
| Settings row, recheck | recheck | בדיקה חוזרת |
| Settings row, no hold | no hold | בלי עצירת טמפו |
| Settings row button | End | לסיים |
| Settings empty | No fingering work right now. | אין עבודת אצבוע כרגע. |
| Teacher switch | Don't hold the tempo for fingering | לא לעצור את הטמפו בגלל אצבוע |

- **Terms:** **the C pause is "pause" / "השהיה"** and **the R2 cap is "hold" / "עצירת טמפו"**, never swapped (minor: v5 used "hold" / "עצירה" for both). "אצבוע" for fingering; **"מנח יד"** for hand position, never bare "מנח"/"מנחים", which collides with "צלילים מנחים" (guide tones). The chip is **"מנחי יד"**. Bursts are **"פרצים"** (the app's majority form; `התפרצויות` is replaced where it occurs).
- Every line is translated whole. **`speakable` covers "♩116" and "F♯"** (G14).

### 14.5 On screen
- **The take screen is unchanged.** Fingering takes show the chip "Positions" / "מנחי יד". The score shows the fingering numbers, chords (A), lengthened notes (C), or nothing extra (B).
- **The verdict line first, the report line under it**, gone on an answer or after 3 s. No new buttons in MIDI runs.
- **Item page:** one small line under the speed best, once a state exists.
- No new badge, star or celebration.

### 14.6 The fingering-coach setting (O11)
- **Where (checked in the code):** there is no per-course settings screen. `SettingsScreen.tsx` groups its cards, and the **Learning** group (`Group id="learning"`) already holds the practice cards (`PracticeLength`, exam prep, style focus). The new card **"Fingering coach" / "מאמן האצבוע"** goes there, right after `PracticeLength` (`data-fingering-settings="1"`). It shows only when the profile has a piano or drums course.
- **Controls:** the existing `toggle-row` checkbox switch and small text buttons. No new control style.
  1. **Switch: "Suggest fingering work"** (`fingeringOffer`).
     - Off = no offers at all, the t ≥ 5 exception included, and **no drum orchestrated pool takes** (§12.3).
     - T1 and T2 keep computing silently, and T3 still records the slip as data.
     - Cells already in retraining continue until ended (the list below).
  2. **Small button: "Offer again"**, shown when any hand is snoozed or declined, or a cell was stopped (by "Stop", "End" or the silent timeout, §11.5) in the last 60 days. It:
     - turns `fingeringOffer` on;
     - clears every hand's `snoozeUntil` and `declines`;
     - returns cells stopped in the last 60 days, by "Stop fingering work", "End" or the silent timeout (§11.5), to `flagged` if they still have a flag, otherwise to no state (minor: now matches the hint and G19).

     Nothing restarts by itself: the next offer still waits for Yes (Q7, decided).
  3. **List: "In retraining now"**, one row per cell in `retraining`, plus `retired` cells with a recheck pending (marked "recheck").
     - Each row shows the item title in its key, the hand(s), and the edge ("♩116 · your report", or "· from your playing" when E did not come from a report), or "no hold" for a cell without a hold (§9.2.0).
     - A small **"End"** button on each row does "Stop fingering work" for that cell and lifts R2 at once.
     - An empty list shows one muted line: "No fingering work right now."
  4. **Small button: "Learn keyboard range"** (device; MIDI only): the two-press range step of §8.3, so the slip mark's double press works before any report (§3.4). Its presses are not takes (§1.4).
- **Sync rule (decided; transport in §15.1, N1):** `fingeringOffer`, `fingeringOrch`, the snoozes, the stops and the list are **synced per account**: the two settings through `toneturn_profiles.settings` (`portableSettings` sends every setting not in `DEVICE_SETTINGS`), the per-cell state through `fg:<cellKey>` rows. They are practice preferences and progress, the same on every device. Two fingering preferences stay **on the device**, because they depend on the hardware: "Answer by voice" (`fingeringVoice`) and the learned key zones (`fgZones`) (device-settings rule). "Answer by voice" sits in this card too, labelled "this device".
- **Copy:** the Settings rows in §14.4.

---

## 15. Data model

### 15.1 Synced progress: `fingering` (under the fresh-start epoch), keyed by `cellKey`

**Transport (N1).** Progress is not a synced blob: `rebuildProgress` (`sync.ts`) rebuilds it from lesson results and keeps only the local fields it lists, and the only per-item cross-device transport is `drillSync.ts` → `toneturn_drill_items`. v6 named a "synced store" with no transport. v7 uses **option (b): rows in `toneturn_drill_items` under the key `fg:<cellKey>`**, through `drillSync`:
- **Why (b), not a new table:** it reuses the tested protocol as it is: paged pulls, the dirty list, `base`-version pushes that the server refuses when stale (20261212000000), the epoch paging and the fresh-start epoch deletion (20261213000000), RLS, the 32 KB row limit; no migration. A new `toneturn_fingering` table would duplicate all of that and need its own dry-run migration. The costs of (b) are a row filter (`isFingerRow`) and the shared row budget, both small.
- **Locally** the state stays in `progress.fingering` (never in `drillItems`). The sync adapter maps `progress.fingering[cellKey]` ↔ row `fg:<cellKey>`.
- **The row is a harmless `ItemState` shell (minor 3: older app versions).** An older version (a PWA update pending on one of the owner's devices) pulls `fg:` rows into `drillItems` through its `mergeItems`. So each row's state is a **complete `ItemState` stand-in** carrying every required field (minor): **`{ itemId: 'fg:<cellKey>', family: 'fg', key: 0, hands: 'RL', cleanBpm: 0, goalBpm: 0, streak: 0, fails: 0, ewma: { cv: 0, sd: 0, vsd: 0, hands: 0, acc: 0 }, takes: 0, last: <the cell's newest upd>, history: [], fg: <FingerCell> }`**. Catalogue readers never match family `fg`; zero takes and empty history add nothing to any count; an unfiltered reader of `ewma.*` (e.g. `ladder.ts` `comps`) finds numbers; and an old `mergeItem` picks the copy with the newer `last` as its base and keeps its `fg` whole, while its computed fields stay equal to the row, so `sameItem` holds and the old device never pushes a changed copy back. **App's `drillFamilies`** (App ≈ 359) filters `isFingerRow` ids, so `'fg'` never enters the profile's family list.
- **Deterministic and idempotent (minor).** `pullDrillItems` repushes any row whose merged copy differs from the remote one in stable JSON (`sameItem`). So **`mergeFingerCell(x, x)` = `x`** for every cell, the merge is commutative (the same result whichever device merges), and the stand-in builder always emits the same keys in the same shape (no optional keys that appear or vanish, no timestamps added on merge). Two devices therefore never repush a row back and forth. (A version gate was rejected: a client cannot know which versions the player's other devices run.)
  - `drillSyncNow`'s `items` loader returns `{ ...drillItems, ...fgRows(progress.fingering) }`, so `pushDrillItems` finds every dirty `fg:` id (it drops ids it cannot load);
  - the pull's `merge` dispatches rows with `isFingerRow(id)` to **`mergeFingerCell`** (the rules below, on the `fg` payload) and stores them in `progress.fingering`, never in `drillItems`; every other row goes to `mergeItems` as now. **The callback returns the merged `fg:` rows in its `items` too** (as shells), beside `drillItems`, so `pullDrillItems`' repush check sees them (minor 2);
  - `markAllIfFirst` marks every `fg:` row dirty on a first sync in a scope (minor 2);
  - every write of the fingering store (`recordFingering`, flags, reports, offers, Settings actions) marks `fg:<cellKey>` dirty (`markDrillDirty`).
- **Rebuild:** `rebuildProgress` keeps `fingering: local.fingering` beside `drillItems` (it would otherwise be dropped on every rebuild).
- **Settings:** `fingeringOffer` and `fingeringOrch` reach the cloud through `portableSettings` (`toneturn_profiles.settings`), which sends every setting not in `DEVICE_SETTINGS`; `fingeringVoice` is **added to `DEVICE_SETTINGS`**, and `fgZones` stays in the device profile.
- **Upgrade migration (minor).** A device that ran an older version may hold `fg:` stand-ins in `drillItems` (pulled by its old `mergeItems`), and `rebuildProgress` keeps `drillItems`. **On load** (`loadProgress`, once per version), every `isFingerRow` entry in `drillItems` is merged into `progress.fingering` through `mergeFingerCell` (from its `fg` payload) and **deleted from `drillItems`**, so a stale copy can never be loaded and pushed as an item.
- **Rows:** one row per cell with fingering state, against the 5000-row limit (`toneturn_drill_items_guard`): a few dozen at most for one player (scale cells in retraining or flagged). A `FingerCell` stays far below 32 KB (`confirms` is pruned to the last 10 per hand; `ref` and `refCold` have ≤ 6 bands each).
```ts
type Hand = 'R' | 'L';
interface RefBand { lo: number; mean: number; sd: number; n: number }   // lo = band floor (nps), 1.25× bands (§11.3)
interface FlagStat {
  src: 'T1' | 'T2' | 'T3' | 'manual' | 'teacher'; group: string; sitePc: number;
  c?: number; t?: number; delta?: number; brk?: number; at: string;
  dir?: 1 | -1;                                       // Δ's side (§11.3)
  ref?: RefBand[];                                    // warm, T1-eligible rows, frozen at flag time, never ages out (N3, M6)
  refCold?: RefBand[];                                // cold rows (`cd`), same rule; used for cold takes when n ≥ 5 (M6)
}
interface HandState {
  upd: string;                                        // ISO, per-hand merge key
  flag?: FlagStat;
  t3At?: string;
  snoozeUntil?: string; declines: number;             // §3.5, Q4
  edge?: number; edge0?: number;                      // nps
  edgeSrc?: 'report' | 'play';                        // shown "your report" only when 'report' (§9.4)
  edgeRaise?: { day: string; marks: number; midi: boolean };  // the daily limits; midi = a take passed the §11.3 check that day (§9.4)
  lastSlipAt?: string;                                // only confirmations after it count (§11.4)
  slipsToday?: { day: string; nps: number; n: number };
  rung?: 1 | 2 | 3 | 0; planAt?: number;              // C ladder memory
  confirms: { day: string; nps: number; midi: boolean }[];
}
interface FingerCell {
  v: 3;
  cellKey: string;                                    // family + level + key
  mainItem: string;
  fsOwn: string; fsSug: string;                       // §1.2
  state: 'flagged' | 'offered' | 'retraining' | 'retired' | 'done';   // a decline is per hand (§1.4)
  stateUpd: string;                                   // ISO
  hold?: boolean; holdUpd?: string;                   // R2 applies (§9.2.0, N8); own merge key
  hands: Partial<Record<Hand, HandState>>;
  preTop?: number;                                    // cleanBpm in nps when the hold starts (§9.2.0, §9.2.3)
  blockDay?: string;
  recheckDue?: string; recheckStep?: 7 | 21; failedRechecks: number;
  asked: { day: string; cold?: boolean; top?: boolean; spot?: boolean; mark?: boolean };  // mark = the day's slip mark (§3.4)
  pe?: { day: string; n: number; clean: boolean };    // per-day record for touch point 2 and telemetry only; never gates a window (§9.2.3)
  quiet?: { days: number; lastDay?: string; asked?: boolean; upd: string };  // asked-and-unanswered days (§11.5, M3)
  dontHold?: string[];                                // assignment ids with the teacher's switch
  frozenAt?: string;                                  // shelved by the step-down: state frozen (§9.2.5)
  retiredAt?: string;                                 // T1/T2 for rechecks and re-offers read only rows after it (§3.5, F3)
  ladder?: FgLadder;                                  // the fingering structures' own state, written only by store.recordFingering (§9.8)
  stoppedAt?: string; stopWhy?: 'player' | 'silent'; // "Stop fingering work", Settings "End", or §11.5; reversible for 60 days (§14.6)
}
interface FgGroup { tempo: number; peak: number; limit?: number; day: string }   // nps
interface FgLadder { groups: Partial<Record<'blocks' | 'positions' | 'pause' | 'cell' | 'orch', FgGroup>>; takes: number; activeMs: number; upd: string;
  orchDays?: { day: string; nps: number }[] }        // drums: last clean orchestrated tempo per day, newest 2 days (§12.3)
interface FgVisit {                                   // CoachState.fg and the open-run save (§9.8 item 9, N3)
  id: string; cellKey: string; kind: 'block' | 'visit' | 'cap' | 'attempts' | 'orch'; plan: string[]; step: number;
  played: [string, number, number][];                 // (structure, rung, nps) pairs played: the no-repeat rule
  lowStraight?: number; ceiling: number; attemptsLeft: number; attemptNps: number[];
  takes: number; budgetTakes: number; budgetMs: number; startedAt: number; tp2Asked: boolean }
// CoachState gains: fg?: FgVisit; fgTakes: number; fgDone: string[] (cell keys finished for the session, R9-4);
//   peDone: string[] (cell keys that had their attempts window this session, R10-2). The queue save gains fg?, fgTakes, peDone.
// KsState gains: fgStart?: Record<itemId, Pulse>   // the held closing's A-6 start (§9.2.2, R12 minor 1); lastGood is untouched
type FingerStore = Record<string /* cellKey */, FingerCell>;
```
- **Merge (S6):** per cell, `state` by the newest `stateUpd`; each hand by its newest `upd`; `confirms` is the union by (hand, day); `failedRechecks` and `declines` by max; `asked` by the newest day, OR-ing the flags of the same day; **`pe` by the newest `day`, and within a day max `n` and OR of `clean`** (R10-2). A merge that brings two confirmations closer than 8 h keeps only the earlier (H2 §1.4 cross-device rule). `lastSlipAt` by max, after which confirmations older than it are dropped; `hold` by `holdUpd` and `quiet` by its own `upd` (both change without a state change; minor); `FlagStat.ref` and `refCold` travel with their flag; `ladder` by its `upd`; `retiredAt` by max; **`stoppedAt` by max, with `stopWhy` from the same side** (N4, minor). **Drums orchestrated-take consent** (`fingeringOrch: boolean`) is a synced account setting beside `fingeringOffer` (§15.3).
- R2 and the planners read it. Rank, passes, the staircase, XP and history never read it (G1, G16).

### 15.2 Device only
- `fingerEvidence` (§2.3).
- `fgZones[midiInputName] = { top, bottom, octave }` (§8.3), never synced.
- `fgDay = { day, unanswered, asked: number, offers: …, sounded: Record<cellKey, day>, played: Record<cellKey, [string, number, number][]>, capVisit: Record<cellKey, boolean>, … }` (`played` = the day's (structure, rung, tempo) pairs per cell, `capVisit` = a cap visit already opened today, R10-1). **`played` and `capVisit` are device-only, accepted as interim (minor):** two devices on one day can repeat a pair or open a second cap visit; the cost is one repeated tempo or one extra short cap visit, never a measured outcome (R2 only restricts the player), the same trade-off as the interim sounding mark (§9.8 item 7). Syncing them through the `fg:` row was rejected: a per-day, per-take log would churn the row on every take. (§8.2, §16; `sounded` = the interim sounding mark, §9.8 item 7).
- `drumEvidence` (§12.3).
- The voice switch `fingeringVoice` (a device preference, §14.6).

### 15.3 Settings
- **Synced:** `fingeringOffer: boolean` (default true); `fingeringOrch: boolean` (default false: the drums orchestrated-take consent, §12.3). The Settings card's "Offer again" and "End" write the synced `fingering` store, never a device key.
- **Device:** `fingeringVoice: boolean` (default false) in the device profile, and `fgZones`.

### 15.4 Take kinds and traces
- `TakeKind` gains **`fingering`**: all false.
- **Trace v4 (F1b):** `fs`, `vr`, `cell`, `xs`, `to`, `cd` (§2.2), and on takes with fingering content:
  ```ts
  fg?: { s: 'A' | 'B' | 'C' | 'G' | 'O' | 'straight'; p?: 0 | 1 | 2 | 3; plan?: boolean;
         map?: number[];                 // expected long or pause notes missed (indices), B/C
         rep?: 'ok' | 'sR' | 'sL' | 's?'; tp?: 'cold' | 'top' | 'spot' | 'shadow' | 'mark'; held?: boolean }
  ```
- The report labels the take's own trace (RF1 Q5, accepted). `calibUpload` is unchanged.

### 15.5 Teacher
- Assignment options: `fingering: 'pin'` and `dontHold: true`. Submission fields (§9.5).

---

## 16. Telemetry and shadow mode

### 16.1 Telemetry
On the take traces (SP §8: device plus the calibration upload); no new tables.
- **Per take:** `nl`, `xs`, `fg`.
- **`fgDay`:** offers shown, accepted and declined; touch points asked and answered by input; slip marks and undos; silent-hold questions and timeouts; spot checks fired and flipped; the rung reached per cell; R2 holds; pass-evidence takes; unanswered windows.

### 16.2 Shadow mode (F3; S5.9, N5)
- **Who:** the calibration accounts only. **Length:** 2–3 weeks.
- T1 and T2 compute flags and log them (`fgShadow` on the trace: group, c*, Δ, t, strength) **without offering**. Nothing changes state.
- **Labels at the flag's tempo (N5).** Below the edge the slip "gets away" (RF1 §3.3: recall about 0 %), so cold labels at the staircase tempo would undercount true flags. Shadow labels are asked at **the top straight take** (touch point 2's moment) **when its tempo is in the flag's band**: [c*, 1.25 c*] for T1, the 1.25× band of the two break takes for T2.
- **Controls:** each day a random 1 in 3 of the eligible scale cells with no shadow flag, **at most one control unit per (cell, hand) per 14 days** (M7). A control is asked at its top straight take when that take is in **its own upper band** (the top 1.25× band of the cell's eligible takes in the last 21 days), the band where flags fire.
- **Neutral wording:** every shadow question, on flagged and control cells alike, is "Fingering OK?" with no place, and **no spot check runs in shadow** (it names a place). The owner cannot tell flagged cells from controls.
- At most one shadow label per cell per day. Answers are written as `fg.rep` with `tp: 'shadow'` and change nothing (no edge, no state). Touch point 1 answers are still logged for RF2 §7's questions, but they are **not** used for precision.
- **Positives are "slipped" answers only.** A later T2 break does **not** count as confirmation: it is the same signal again (v2 counted it).
- **The unit** = one flag on (cell, hand, group), or one control draw on (cell, hand), with its first **3** answered in-band labels within 14 days. A unit with no answered in-band label is excluded and counted as unlabelled.
- **Precision** = (flag units with ≥ 1 "slipped" among their ≤ 3 labels) ÷ (flag units with ≥ 1 label). **Control rate** = the same ratio over control units. The 3-label cap gives both the same exposure.
- **The gate for offering (M7):** all of
  - ≥ **10** labelled flag units and ≥ 10 labelled control units;
  - precision ≥ **50 %** and ≥ **2 × the control rate** (a control rate of 0 needs precision ≥ 50 % only);
  - **P(p_flag > p_control) ≥ 0.95**, with independent Beta(1, 1) priors: p_flag ~ Beta(1 + s_f, 1 + n_f − s_f), p_control ~ Beta(1 + s_c, 1 + n_c − s_c), where s = units with a "slipped" and n = labelled units. Examples: 5/10 vs 2/10 gives about 0.91 and **fails**; 6/10 vs 1/10 passes. (v3's gate passed 5/10 vs 2/10, one-sided Fisher p = 0.175.)
  Otherwise shadow mode extends by 2 weeks, up to 6 weeks in all. If the gate still fails, offers run on T3 and manual starts only, and T1/T2 stay silent telemetry.
- **The expected outcome may be "T3 and manual only".** T1 fired on 1 of 5 keys in the owner's data, so 10 labelled flag units may not exist within 6 weeks. That outcome is a valid result of the gate, not a failure of the feature: T3, manual starts and the slip mark carry it.
- **One labeller (M7).** Every label comes from one person on two accounts, so units are not independent and the gate measures agreement with **this** player. It is re-run when real users exist (≥ 5 players with labels) before data-flag offers reach them.
- **Recall** (reported, not gated): the share of in-band "slipped" units on cells that were shadow-flagged before the slip.
- **The re-fit list,** with the owner, before the offer turns on: the thresholds (20 ms, 8 %, t 3, 30 ms, 3.5 SD), the §11.3 "no break, no worse than flagged" check and its cold reference (N3, M6), whether boundary crossings (§1.3) join R_g (tested here as a separate group), and **the T1 tempo/date confound** (§3.2): whether to require each band's takes on ≥ 2 distinct days within one 7-day window, or to detrend by day.
- RF2 §7's three questions (does structure H flag reported slips; do velocity bumps fall at slips; at what pause length the map breaks) are answered from the same data.
- The camera stays a later spike (RF1 §4, RF2 §4).

---

## 17. Build steps

| Step | Content | Size |
|---|---|---|
| F1 | **Done (0.145.16):** the per-note log, trace v3, the device trim, tests. | S |
| **F1b** | **Trace v4:** `fs`, `vr`, `cell`, `xs` (residuals by the trace's own rule, `sdl`, break flag, `bd`, per-site `[pc, r]`), `to`, `cd` (cold only when the cell has no fingering sounding mark today, §9.8 item 7); `NOTE_LOG_MAX` 120; the `fingerEvidence` store with its retention. Tests: residuals equal the trace rule; wrong-key notes excluded; thinned and feel takes excluded; a 4-octave HT scale logs whole; retention ≥ 21 days at 200 takes a day. | S–M |
| F2 | **Report input:** the window (decay, 3 s, verdict first), zones learned per input (octave-aware), the HT second press (after "slipped" only), pedal, keys, foot switch and page turner, optional voice, the any-time slip mark with Undo, prompts that name only working inputs, the count-in hold, one question per take, reminder and fatigue across cells. `fg` on traces. | M |
| F3 | **Flags:** T1, T2, T3 (pure `fingerFlags.ts`), per cell and hand, guards, snoozes, the frozen warm and cold references (T1-eligible rows, anchored half-open bands). **Shadow mode with in-band neutral labels and controls** (§16.2), the precision analysis, then the gate with the owner. | S–M |
| F4 | **Structures:** `positionBlocks`, `positionRhythm`, `pauseAtCrossings` (whole-twelfth rungs, lengthened notes, the subdivided click, segment grading), `crossingCell`; grading. Tests in 12 keys, both hands, own fingering. | M |
| F5 | **The ladder and the block:** `fingerLadder.ts` (rungs, rung memory, drop-back one mark slower, the verification floor, plan check, T_C/T_S, the straight ladder with distinct tempi, E rules incl. the daily limits and the no-answer rise) and the block composer with its budget. A 3-day simulation. | M |
| F6 | **Integration** (after the G3 simulation; Q8 decided (a)): **`takeFingering()` branching at the top of `done()` (kind `fingering`); no `applyTake`, `onTake`/`take()`, `store.recordDrill`, `recordTakeAnalysis` or `coachAfter`; the App prop `onFingerTake` (the shared today-counts ref, session XP and band time, `drillWrites` chain) and `store.recordFingering` under `drillLock` (the `fingering` store's `ladder`, XP, `takeCounts`, `bookFingerTime`); `fingerAfter()` owning the visit through `CoachState.fg` (saved with the run), `fingerNext` in Drills, `coachAfter` / `ksAfter` in record-only mode defined per coach (tempo memory, stage marks, key passes), the old coach's `capHeld` rule, `persistCoach`'s gate with `fgTakes`, `techResult`'s gate on takes (main + fingering), `total`/`firstTry` measured-only when measured takes exist and `total = fgTakes` only for a fingering-only session (`rowCounts` already clamps rows; no migration), the key-session visit opened without `openVisit` (only when the cold take stayed in the same visit; warm-up and `chal.pending` cleared) and left like `leave = 'budget'`, the held closing's step rule (start in `ks.fgStart` and every later take: the lowest mark in the speed path's note value above the previous, not in `fgDay.played` in nps, ≤ cap; recovery take after a miss; "almost" once; capped plain takes only for "highest clean" and "reached the cap", all straight takes for "played"), the attempt tempi on each planner's grid (either note value in the key session, rounded up elsewhere, no attempt 2 when the band holds one tempo), the main scale's window time in `closingDue` and the yield before the first closing take, the closing's yield for the window (time left ≤ window + one take) and its exits at ≈ 1174 opening the window, `slower` against min(`goalBpm`, cap) and `slower: false` for attempts, the checkpoint exemption, the below-cap closing order (climb → window → A-7 or end), "held at cap" in every planner (`leave = 'done'`, `ks.finished`, no `STEP_TAKES` limit, no `nextVisit` revisit; list runs min(raise, cap); `goalBpm` clamped at read), `quests.ts` `tech3` excluding `technique-fingering`,, the attempts-only `fg` with its hook at every exit (KS main-scale closing, KS run-rung visit exit, old coach and linear path leave paths and before time-up, list runs inside `go(j)`, standalone end) counted per session in `peDone`, the held-cell closing rule (A-6 skipped after a cap day, then attempts, A-7 or the end; one cap visit per cell per day), the `technique-fingering` lesson id, `fgDone` in `CoachState`, the upgrade migration of stale `fg:` items, the old coach's park-path reset and one-cell rule, the queue continuation (`fingerAfter(null, …)`, `lad.next` and `hfMiss` bypassed, `go(i + 1)`), the queue save's `fg` field and the standalone `fgq:` key, the time (`closingMs`) and closing checks, the visit and cap-visit budgets with the attempts' time reserved; the required `onFingerTake` prop at all 5 hosts; the SP §21 visit-budget entry; the flat 1-XP rule per cell (§7.2, §9.8, G24)**; the held-visit shelving count (paused only while the attempts are disallowed) and the step-down freeze (§9.2.5); `retiredAt` and new-evidence-only fires (§3.5); the pass-evidence attempts in every planner and visit kind; the key session (block, visits, the variants-only cap visit, "held" vs limit, A-7 on `passedAt`, new-key blocks), the old coach and assignments (mirror, pin without a hold, `!`, "Don't hold"), R1 in every planner, the hold rule and R2 in every climb, the pass-evidence take (2 attempts), challenge takes off, H10 at effective difficulty with held cells apart. SP rotation hooks behind its own build. SP §16.7 and H2 §1.6 / §1.7 / §1.7a amendment entries. **Depends on two code fixes in flight (R13-2):** `passLog` admits clean takes at ≥ 0.95 × the catalogue target regardless of `goalBpm` (feature-off, key-session takes in [0.95 × target, 0.99 × `goalBpm`) never entered `passLog`), and band-landing rounding is fixed, so the attempts' band tempi land in the band. The key-session climb fix (the next mark is the minimum rise per clean take) is needed for feature-off climbs only: the held closing uses its own step rule (§9.2.2, R13-1). **Depends on H2 step 1** (`lastSound` per cell, the v15 skip rule) and on the `<item>~feel` pattern, neither of which is in the code yet (minor). | M–L |
| F7 | **Across days:** confirmations with the "no break, no worse than flagged" check (warm and cold references), `lastSlipAt`, retirement, rechecks at ≥ G, relapse, the mic report-only path, the silent-hold question and timeout on asked-and-unanswered days, the slip path per state, breaks, `exitAt` = max(`retiredAt`, `stoppedAt`), the `fingering` store with its merge and **its transport: `fg:<cellKey>` rows through `drillSync` (loader, the complete ItemState stand-in, `drillFamilies` filter, deterministic merge, merge dispatch to `mergeFingerCell` with the `fg:` rows returned, `markAllIfFirst`, dirty marks), `rebuildProgress` keeping `fingering`, `fingeringVoice` in `DEVICE_SETTINGS`** (§15.1). | S–M |
| F8 | **UI and copy:** chip, report line, offer, item page, **the Fingering coach card in Settings → Learning (§14.6: switch, "Offer again", the retraining list with End, the device voice switch)**, briefs, the teacher switch; he + en; `speakable` for ♩ and ♯; screenshots at 320/390 widths; the contrast sweep. | S–M |
| F9 | **Drums:** the drum `nl`, **the drum trace builder** (v4 with `nl`, `vr`, `cell`) and **the `drumEvidence` stream** of orchestrated wrong-pad strokes (exempt from the `vr` exclusion), `orchestrate`, the crosstalk-safe wrong pad, orchestrated takes in the feel pool (with consent), `orchDays`, the drum flags, cap and report. | M |
| F10 | **Harness and review:** independent review rounds until clean before F1b (owner rules); G1 and G16 at planner level with seeded learners; **the G3 simulation (p = 0.5 and 0.7, on vs off, both cell groups, under Q8 (a)) before F6**, its numbers shown to the owner. | — |
| F11 (later) | Arpeggios, with the held-key constraint (RF2 §3 F). | M |
| Later | Structure H offline on labelled logs (RF2 §12.4); accent feel D (Q6) after the thumb-bump test on `nl.v`; the camera spike. | L |

Order: F10 review → F1b → F3 shadow (it needs F1b and F2's top-take label question) → F2 rest → F4 → F5 → **G3 simulation (numbers to the owner)** → F6 → F7 → F8 → F9. `npx tsc -b` before every commit.

---

## 18. Guard tests

| # | Test |
|---|---|
| G1 | **Honesty (planner level):** seeded learners over 28 days with reports scripted to lie OK at every touch point vs honest vs no reports vs random slip marks. The learner's skill trajectory is the same in both arms (the model gives fingering takes no extra skill), so differences come from the planner only. Rank, cold results, staircase, threshold estimate, **Momentum's progress half (the weekly gains)**, XP beyond practice time and history never exceed the feature-off baseline (§9.6). **Passes are compared like G16 (a)** (minor 5): distributionally, on paired seeds with common random numbers; under Q8 (a) the attempts (which pass `slower: false`) can open the pass-probe branch and complete the warm half earlier than the feature-off arm, so the excess is reported for the owner, not bounded. Momentum's persistence half reads weekly minutes, where fingering time legitimately counts, so it is not compared (minor). |
| G2 | **R1 (P3):** in every planner, no `fingering` take precedes the cell's main-item cold check on a cold day; new-key blocks are the only exception, and only for a cell with no cold result and no `lastSound` history anywhere; a cell that reached the target in the old coach and never passed A-3 gets no blocks before its due cold check (no v15 skip miss is ever caused by the feature); due cold checks are planned ahead of blocks and visits in every session budget; range-learning, answer and slip-mark presses never set `lastSound`; **H2 v16's warm-first warning never fires before a fingering take** in any planner (§9.9). |
| G3 | **R2 vs passes: a harness simulation that runs before F6** (N2, M2). Seeded learners over 28 days, fingering on and off, at clean rates **p = 0.5 and 0.7** at 0.95–1.0 × target, for `preTop` and non-`preTop` cells, under the decided Q8 (a) rule, with the attempts placed exactly as §9.2.3's attempts-only window (key session: the main scale's closing and the run-rung visit exit; old coach and linear path: before every leave path and before time-up; list runs: inside `go(j)`), one per session, **with realistic visit frequencies per planner** (key session, rotation, old coach), the pass-evidence attempts in every session in which the held cell is played, and **H2 v16's shelving and struggle step-down modelled** (P2). **It models the real number of countable attempts per planner and tempo** (R13-2, R14-4): **key session**, k = the number of marks (eighths or triplets) in [0.95, 1.0] × target in item ♩, at most 2; **old coach and list runs**, k = 2 (the target and ⌈0.95 × target⌉), k = 1 only when the band is narrower than 2 ♩. It reports, on and off, for every combination: P(pass by day N); **P(shelved while held)** and **P(a held cell still working past the off arm's shelving day)** (the F2 divergence, reported, not bounded); the challenge point and guard reserve over time; **the guard-record miss count**; and **how often a pending first clean expires** (v15's 60-day rule) under a long hold. The numbers go to the owner for Q8. **Bound:** for `preTop` cells at p ≥ 0.6, the median pass delay ≤ 1 practice day; every other case is reported, not bounded. Also: plain straight takes never exceed the cap outside the exemptions and the pass-evidence attempts (≤ 2 per session, stopping at the first clean one, never two at one tempo); a missed attempt never sets a KS2 limit or consumes `STEP_TAKES`/`ALMOSTS_BACK`. |
| G4 | **Develops (N7):** in the 3-day simulation (MIDI and mic), **in every block and visit**, no two takes of one cell have the same structure, rung and tempo, except one "almost" hold; no straight take repeats a tempo already played straight in the visit or block (P0, the closing, the cap visit and the pass-evidence attempts included). Each clean straight take below the ceiling is followed by one a mark faster. At the cap, clean takes are followed by variants that rise. P0 is an ordinary straight take with no `vr` and is counted. **Resume and budgets (N3):** a reload in the middle of a visit resumes at the same step from `CoachState.fg`, with no repeated (structure, rung, tempo) pair; no visit exceeds 7 takes or 2.5 minutes, no cap visit 9 takes or 3.5 minutes, attempts included (their slots and time are reserved inside the budget); **after a visit (S1)** the first straight take of the cell never repeats a tempo played straight in that visit, and a clean pass-evidence attempt at target inside a visit marks A-6 (key session) or passes the key (old coach) exactly as with fingering off; **a reload after only fingering takes** (new-key blocks, a block left after A and C) resumes the visit (S2); **list and standalone runs** run their visits through the queue continuation (`fingerAfter(null, …)`; `lad.next` and `hfMiss` never act while `fg` is open; the run continues with `go(i + 1)` at the end) (R8-4); a one-cell held run never plays two straight takes at one tempo (R8-3); time-up during a fingering visit ends the visit after the current take and the session ends; in the key session the visit yields when less than `closingMs(c)` remains, so the closing runs. |
| G5 | **Per key (fixture only, N4):** on the owner's five-key class means (`takeTrace` `xu`/`xo`, which equal R_g for the suggested fingering, §1.3), T1 fires on **D at ♩100** (edge ♩96) and nowhere else; a constant early lean in E♭ flags nothing; an injected shift in one key flags only that key. |
| G5b | **Per key from per-note logs** (once v3/v4 traces reach the server): recompute `xs` and T1 from `nl` with the §1.3 class array (boundary crossings excluded) and check the result against G5's class-mean result; report any difference before F3 leaves shadow mode. |
| G6 | **Structures in 12 keys:** every major and minor scale, both hands, 1–4 octaves: `pauseAtCrossings` lengthens exactly the notes before the crossings by whole twelfths; `positionBlocks` groups match the fingering; own fingering moves both; no crossing where the expected finger is missing. **A triplet case (Q9):** a triplet-eighth item at P2 and P3 uses ⅔ and ⅓ beat (8 and 4 twelfths) with a triplet click, and every shifted note lies on the triplet grid; sixteenth-note items keep 6 and 3 twelfths. |
| G7 | **Verification:** B passes the correct long-note set and names a misplaced one; C detects a pause one note early, and grades segments without cumulative offset; A fails a roll > 40 ms and an extra note. |
| G8 | **Report grammar:** no MIDI answers before the range is learned; zones after the octave shift; reset on a shift change; empty zones fall back; the HT hand question as its own line, shown 1 s after the "slipped" press, with only later presses answering it; before it appears a second bottom press is the same slip and a top press is ignored; two bottom presses within 1 s read as one "slipped" with the hand unknown, never a left-hand answer (P4); pedal < 600 ms; zone notes never start a take; a non-zone note closes as no answer; the verdict is shown before the report line; one question per take with H2 §7. |
| G9 | **Input source:** mic takes have no `nl`/`xs`; mic C moves the ladder only on HS onset placement; `nc` takes move nothing; a mid-take MIDI loss leaves the state unchanged; A and B never on mic. |
| G10 | **Retirement (M6, not self-referential):** OK alone with a break take never retires a MIDI player; two clean confirmed cold days at ≥ G retire; a slip between resets, also when it happened on another device (`lastSlipAt` on merge); rechecks only at ≥ G; a recheck slip → retraining without a block, a second → a block; mic retires by report only and is labelled. **The check, on fixtures held out from the reference:** the reference is built only from T1-eligible rows (adding failed takes to the evidence leaves `ref` unchanged); bands are anchored at the Maelzel mark at or below the lowest eligible row (♩83 → ♩80), half-open; on the recomputed D-major rows (♩125–156: n 14, mean +4.4, SD 10.5) a warm take at +14.0 ms passes and one at +16.0 ms fails, and a take with a break fails at any R_g; **a cold case:** a cold confirmation in a band with < 5 cold rows gets the break check only, and with ≥ 5 cold rows (cold mean +20, SD 8) a cold take at +25 ms passes against `refCold` where the warm `ref` would fail it; the reference survives 60 days and a second device. **Stale evidence (F3):** a `preTop` cell retires on day 3 with the flag's T1 upper-band rows and a T2 break pair still inside their windows; no recheck is pulled forward (the next recheck stays at day 10, the following one 21 days after it), and there is no re-offer; T1/T2 fire again only once ≥ 5 rows per band (or 2 break takes) after `retiredAt` exist. **Stopped cells (N4):** "Stop" on day 3, "End" in Settings, and the silent timeout, each with the flag's rows still in the window: no offer until ≥ 5 rows per band (or 2 break takes) after `stoppedAt` exist; one new take added to the old rows does not re-offer; `stoppedAt` merges by max across two devices. |
| G11 | **Signatures:** an `fsOwn` change resets; an `fsSug` change keeps E, the confirmations and the state, and drops older evidence from T1/T2. |
| G12 | **Mirror:** one scripted player through `keyCoach` and `coach.ts` assignments gets the same R1, R2, hold, cap-visit and eligibility decisions, and **the same pass-evidence attempts in every session in which the held cell is played** (M2), including the old coach, the linear path and short sessions. **Shelving (P2, F2):** a held visit advances the 12-visit shelving count only when the cell could pass in it (attempts allowed, or cap ≥ 0.95 × target), and the count pauses otherwise; a step-down shelving of a retraining cell freezes its state (no `quiet` count, no recheck clock, no break rule) and it resumes unchanged. G12 asserts this rule; it does not assert equality with the feature-off run (G3 reports the divergence). **The visit owner (N3):** in both coaches, the visit's straight takes call `coachAfter` only in record-only mode (counters, thinning, time and closing; no next take, no limit or ceiling, no `stepTakes`), and `fingerAfter` alone picks every take of the visit. **Record-only per coach (S1):** the key session updates `lastBy`, `best` / `bestBy` / `sessionBest`, `lastGood`, `dayStart` and `flow[rung]` (one mark above the visit's top clean straight tempo, ≤ cap) and emits stage marks; the old coach updates `c.passed` / `passedNow` only (never `c.at` or `peak`); neither touches `stepTakes`, `almost`, `stall`, the limit, `ceiling` or `setComfort`. **Key session (R8-2):** the first take of a cold scale cell is never a fingering take or a straight take inside `fg`; the visit is opened without `openVisit`, with the §7.2 budget (`visitAt`, `visitTakes`, `visitBudget` reset); after it, the next take belongs to `nextVisit`'s rung or to the closing. **Old coach (R8-3):** record-only never touches `c.at` or `peak`; at the end of a block or visit the coach resets as its park path does (without `weak`); after a held cell's visit, the next key's first tempo and its plateau state equal those of a run in which that key comes first; no `ceiling` is ever written for an item other than the one whose takes produced it; with several specs per level, straight takes use the main item and pass the key only through the existing pass path. **R9-2:** on a known rung (`WARM_TAKES` = 2) the visit's straight takes trace as `normal`; a cold take that triggers `closingDue` opens no `fg`; **R10-1:** a non-`preTop` held cell, attempts not allowed, whose visit 0 reached the cap: the closing plays no A-6 take and ends with the hold line (or plays A-7); with attempts allowed it plays the window, then A-7 or the end; a passed A-6 on a held cell never plays its target review above the cap; when visit 0 stopped below the cap, the closing's first A-6 take (if any) is not among the day's straight tempi of the cell; **R11-1 cases:** a straight part that ended after a miss (♩100–112 clean, ♩116 missed, ♩96 clean) skips A-6 in the closing; a sixteenth-note scale at ≥ 7 nps (♩112–120 clean, stopped on the budget) enters the closing at ♩126 with `known: true`, never clamped back to ♩120; **R11-3, R12-1:** on a below-cap day the closing plays the capped climb, then the window, then A-7 or the end; a below-cap closing that climbs until time is short still plays exactly one window inside the session, and the climb's target, limit and time-up exits open the window instead of ending; **R12-3, R13-1:** at ≥ 8 nps the closing's second A-6 take is the next mark (♩126 → ♩132); **with the eighths/triplet alternation and a missed take above the highest clean** (triplet ♩100 clean, triplet ♩104 missed) the closing enters at eighths ♩152 and, clean, plays triplet ♩108, never the missed triplet ♩104; **with a missed cold check between the start and the cap** (♩120 missed cold, plain takes clean to ♩112) the closing plays ♩116 then ♩126, never ♩120; no closing take other than an "almost" hold is a tempo (nps) played straight earlier that day; a clean probe-band cold check never makes a `preTop` cell's day a "cap day"; **R13-3, R14-1:** a closing miss is followed by the highest unplayed mark below the day's lowest straight nps and ≥ the comfort pulse, or by no recovery take when none qualifies; **visit 0 started at the comfort pulse and the first closing take misses: the next take is unplayed, or there is none**; after a second miss the climb ends; the session never ends directly on the climb's miss while a window or A-7 is available; **R14-2:** a held A-6 in `ks.limited` today plays no A-6 take in the closing (window, else A-7, else the end), and the limited review never repeats `lastGood`; **R14-3:** a `preTop` cell whose in-band cold check played the band's only mark still gets attempt 1 at that mark; attempts are outside the no-repeat test, and never two attempts at one tempo within a window; **R14-4:** in the old coach, target ♩113 gives attempts 113 and 108, never 112; **minor 1:** a triplet climb under an eighths cap is "at the cap" when no triplet mark ≤ the cap qualifies; **minor 1, 6:** in a 5-minute key session with a held main scale due its window, the window fits (its time is in `closingDue`), and if the time left at the closing's start is ≤ the window plus one take, the window plays first; **R12-4:** a checkpoint run with a held cell plays every item at target, uncapped, with no fingering visit, block or window; **R11-2:** a held mode cell's run rung that reaches the cap opens one cap visit, is then left as done and pushed to `ks.finished`, is never revisited straight that day, and never gets a `STEP_TAKES` limit; a hands-free list run with a held cell plays no plain take above the cap other than the attempts, and **no clean cap take is followed by another take at the cap** (the `hfMiss` replay of a *missed* cap take is allowed; minor 4) (a clean cap take goes to the window, then `go(i + 1)`); `goalBpm` is clamped at every read for a held cell; a parked held cell never returns as a side review after its window; at most one cap visit per cell per day, and no variant repeats a pair played that day; the capped closing plays the main item. **R9-4:** a three-key run with two keys passed never serves the held key straight after its visit (`fgDone`); the weak-spot review skips `fgDone` cells. **R9-3, R10-2:** exactly one attempts window per session per held cell with allowed attempts, counted in `peDone` (a second session the same day gets its own), in each planner: the key session's main scale at the closing; **a held mode cell on a run rung on a rationed day gets its window when its visit is left**; the old coach and linear path before every leave path, and **a timed one-key held run that never reaches the cap gets its window before time-up**; list runs inside `go(j)` before the end branch and only when the current item is the cell's last item in the queue, so **a manual list run's any-note Next runs the window** after that item and an earlier RH or LH item of the same cell does not (minor 3); standalone runs before the end; always inside reserved time. A three-key run whose other keys are passed laps over them (skipping `fgDone`) rather than counting as one-cell. A clean straight take at the cap is `capHeld` in the old coach. **A teacher pin or manual start without a flag or a reported slip never holds** (N8): the plain climb, `cleanBpm` and the pass are identical to the feature-off run; a later slip adds the hold. |
| G13 | **Drums:** orchestration maps each stroke's hand to its voice; a crosstalk hit with the expected pad also struck is not a slip; a substitution is; orchestrated takes appear in the pool before any flag; the plain cap is max(orchestrated edge + 2 marks, plain edge). **D-T1 has data (N5):** two orchestrated takes within 7 days in one 1.25× band, each with a crosstalk-safe wrong-pad stroke at the same site, are written to `drumEvidence` by the drum trace path and raise a D-T1 flag; the same strokes on plain takes do not; the orchestrated edge needs clean orchestrated takes on 2 distinct days (`orchDays`); without consent (`fingeringOrch` off) no orchestrated take runs; until the SP feel pool exists the old coach hosts one O take after the cold check in every session of an acquired, consented sticking rudiment, so two sessions in a week can raise D-T1. |
| G14 | **Copy:** every line in he and en; `speakable` reads "♩116" and "F♯"; no bare "מנח"/"מנחים". |
| G15 | **F1 (exists):** `tests/noteLog.test.ts`. |
| G16 | **Reports and qualifying tempi, two properties (N1, minor).** **(a) No report raises any qualifying tempo above the feature-off baseline**, tested on **paired seeds with common random numbers** (each learner's take outcomes drawn from one stream indexed by day, tempo band and take ordinal, the same in both arms) over ≥ 2000 learners and 28 days: for any report script (lying OK at every touch point included), P_on(pass-probe branch open by day N) ≤ P_off(open by day N) + ε, ε = 0.02, for every N, under the v5 rule; every qualifying take (cold check, confirmation, pass probe, FSRS review probe) is chosen by the same H2 §1.9 function of (`cleanBpm`, staircase, pass state) as with fingering off. Under Q8 (a) the attempts can open the branch earlier than the feature-off arm; the excess is reported for the owner, not bounded. **(b) No report value is ever used as a qualifying tempo:** that function has no report, E, cap, rung or G input (a property test: any E and any reports give the identical tempo for identical H2 inputs); no report's tempo is written into `cleanBpm`, the staircase or the threshold estimate; and **no fingering take's tempo reaches `cleanBpm`** (§9.8). After a pass-probe take the staircase resets to the tempo played (H2 §1.9). |
| G17 | **Key session at the cap:** a cap hit never sets "limit", never consumes reopen or six-take budgets; A-6 shows "held"; A-7 opens on `passedAt`; no closing straight take repeats the cap; one OK raises E by ≤ 1 mark, ≤ 2 when the take passes the §11.3 check, and the day's total rise is ≤ 2 marks. **Old coach (S1):** a held cell's clean takes at the cap are `capHeld`: they never advance `stall` or `PLATEAU_TAKES`, never return a `ceiling`, so `withCeiling` and the matrix rest never fire on them, and they end the cell's run for the session with the hold named; in a one-cell run the session continues with fingering takes only, each at an unplayed (structure, rung, tempo), and never plays two straight takes at one tempo (R8-3). |
| G18 | **Evidence retention:** after 25 days at the owner's take rate, T1 sees ≥ 21 days of rows for a cell, independent of the 500-trace `nl` trim. |
| G19 | **The Settings card (§14.6):** the switch off suppresses every offer (T1, T2, T3, and the t ≥ 5 exception) while retraining cells continue. "Offer again" turns offers on, clears all snoozes and declines, and returns cells stopped ≤ 60 days ago to `flagged` (when they have a flag) without starting any visit. The list shows exactly the `retraining` cells plus pending rechecks. "End" equals "Stop fingering work" (R2 lifted on the next take). `fingeringOffer`, `fingeringOrch` and the store sync across two devices **through the real paths** (`portableSettings` → `toneturn_profiles.settings`; `fg:<cellKey>` rows through `drillSync`, merged by `mergeFingerCell`; a `rebuildProgress` keeps `fingering`) (N1); `fingeringVoice` and `fgZones` do not. The he and en strings exist. The card renders at 320/390 px in the existing switch style. A cell without a hold shows "no hold". "Offer again" also undoes a silent-timeout stop. |
| G20 | **Silence (N6, M3):** a scripted MIDI player who never answers and plays clean top takes that pass the §11.3 check sees E rise 1 mark a day. Only days with ≥ 1 window shown for the cell and none answered count: a cooperative player with no window for 10 days keeps the hold and is never told "no answers". After 5 silent days the keep-hold question appears once, ahead of any offer, as the session's only end-line question; after 10 the hold ends (`stopWhy: 'silent'`), R2 lifts, and nothing is ever capped for good. An answer at any point resets the count. |
| G21 | **The slip mark (N6, M4):** a bottom-zone double press within 1 s, ←/↓/PageUp, "לא" with voice on, or the item menu after a straight take flags the cell (T3) with the take's tempo; a single bottom-zone press does nothing; one per cell per day; Undo removes it; works on mic through the menu; the first-use brief learns the keyboard range; zone notes in a hands-free countdown start nothing and are not count-in input; the drum gesture is the ride bell or two kicks 80–400 ms apart. **Inside an open report window (P4; the hand question appears 1 s after "slipped"):** a right-hand slip made with the double press records one hand-unknown slip, never a left-hand slip; it lowers no edge of an unflagged hand and, with both hands flagged, neither edge nor `lastSlipAt`; the slip mark and the "slipped" answer are one T3. **Per state (§3.4 table):** on no state, `flagged` or `done` it flags with no hold, gives visits for 7 days and an offer, and the visits stop after 7 days without Yes; Yes → block → retraining with the hold; on `retraining` without a hold it adds the hold; it never caps a cell that has not been through Yes, a manual start or a pin. |
| G22 | **H10 with held cells (N9):** C, B and G count at effective tempo (a P1 take at cap + 3 marks counts below the cap); held cells are excluded from the flat-rank slope while held and reported apart; a held cell's effective difficulty rises across visits in the 3-day simulation; held cells stay excluded under H2 v16's per-area-kind H10 targets (§9.9). |
| G23 | **Shadow analysis (N5, M7):** on synthetic labels, the precision and control-rate formulas of §16.2 give the expected values; labels outside the flag band, T2 "confirmations" and touch point 1 answers are not counted; at most one control unit per (cell, hand) per 14 days; the gate fails below 10 units, below 2 × the control rate, or when P(p_flag > p_control) < 0.95 under Beta(1, 1) posteriors (5/10 vs 2/10 fails, 6/10 vs 1/10 passes); shadow questions never name a place and no spot check fires in shadow. |
| G24 | **Fingering takes are isolated (M1, P1, F1), one case per leak**, for every structure (A, B, C at P1–P3, G, drums O), clean and failed, at tempi below, at and above target, through the real path (`done()` → `takeFingering()` → `store.recordFingering` → `fingerAfter()`): **`applyTake`, `onTake`/`take()`, `store.recordDrill`, `afterTake`, `coachAfter` and `recordTakeAnalysis` are never called**; no `drillItems` key changes and none is a pseudo id; the only dirty mark is `fg:<cellKey>` (the fingering row, §15.1); the main item's record is byte-identical; the weekly gains (`records`, `statusUps`) are unchanged; `counts.drillClean`, `tempoRecords` and `evenCv` are unchanged; the week's channel balance is unchanged (`noteChannel` not called); no rating events or snapshots; the ledger gains time by skill and key through `bookFingerTime` and **no item entry** (no `d:` entry, no clean count or tempo; minor 1); no `withCeiling` or `setComfort` call, no `nx.items` write, no challenge `ceil`; **a failed P1 run never sets a KS2 limit or a ceiling**; **a hands-free list run's next tempo follows §5.3's rung ladder**, and the verdict line is the structure's, never `lad.next` or `lad.message`; no `notePresented`, today's best or `lastTake` update; `noteTake`'s take and clean counts and `count.current` are unchanged, `drillSession.fgTakes` grows by one, and the result's `total` / `firstTry` are unchanged when measured takes exist, and the session band time (as `work`) and XP total grow once; XP is exactly 1 per take for the cell's takes 1–15 of the day across RH, LH and HT (key `<mainItem>~fg`) and 0 after (≤ 15 per cell per day), with no stretch, comfort, boost or `MEMORY_XP`; the trace is written with kind `fingering` and is ignored by `eligible`, `sessionTendency` and `fingerEvidence`; `refineCal` is skipped for A; the cell's `lastSound` is set. P0, the straight ladder and the pass-evidence attempts do change the item as ordinary takes. **The write path (N2):** fingering take → straight take → fingering take: the `<mainItem>~fg` count keeps rising through the straight take's wholesale `takeCounts` write, and the 16th fingering take of the day pays 0; interleaved fingering and straight writes on the `drillWrites` chain under `drillLock` lose no XP, no `stats` and no `drillItems` change; the trace is built at the top of `done()` with `recordTakeAnalysis` never called; **R12-2, R13-2:** two attempts below 0.99 × the stored `goalBpm` (a miss, then a clean one) push exactly one `passLog` entry for the clean one; **an attempt is never played below 0.95 × target in item ♩** (target ♩110: attempt 1 ♩108, no attempt 2 at ♩104; key session may use a triplet or eighths mark in the band; old coach and list runs play the target, then ⌈0.95 × target⌉); when the band holds one tempo there is no attempt 2; and a capped list-run take of a held cell traces as `normal`, not `'slow'`; **a mixed session stays perfect (R9-1):** 10 clean straight takes plus 4 fingering takes write `total` 10, `firstTry` 10, and `goodSessions`, gems, `counts.perfect`, `records.fastPerfect` and `historyPerfect` are unchanged against the feature-off run; `bookFingerTime` books time with no item entry. **Sessions of only fingering takes (S2, R8-1, R9-1):** they record one result under the lesson id `technique-fingering` (set inside `techResult` for every caller; not counted by `quests.ts` `tech3`), shown as "Fingering work · N takes" (no "0 of N", no `l:` ledger item), whose `total` is the number of fingering takes (≥ 1), whose `firstTry` is 0 (never good or perfect) and whose `xp` equals the fingering XP (≤ `total` × 20); it passes `rowCounts()` unchanged, uploads, and survives `rebuildProgress`; a later normal result still uploads; a session whose fingering takes all paid 0 XP (16th and later) still writes its result; `persistCoach` saves them. **`~feel` stays visible (S3):** a `~feel` item still appears in the matrix and the path; only `fg:` rows are filtered. **Sync (minor):** the merge callback returns `fg:` rows, `markAllIfFirst` marks them dirty, an older client stores the complete stand-in without changing any count, never throws on `ewma.*`, never adds `'fg'` to `drillFamilies`, and never pushes it back changed; `mergeFingerCell(x, x)` = `x` and two devices never repush a row back and forth; on load, stale `fg:` entries in `drillItems` move into `progress.fingering` and are deleted, and `recordFingering` applies deltas (`takes`, `activeMs` never lost to a stale screen copy). |

---

## 19. Questions: Q1–Q9 decided (owner 2026-11-28)

| # | Question | Decision (the review's default, accepted by the owner 2026-11-28) |
|---|---|---|
| Q1 (decided) | The fourth rung | **Drop P4:** 1 beat → ½ → ¼ → none. ⅛ beat is off the 1/12 grid and below the verification floor at most tempi. If a fourth step is wanted later: ⅙ beat (2 twelfths). |
| Q2 (decided) | Drum report gesture | **Crash = OK; two kicks 80–400 ms apart = slipped**, or the ride bell if the kit maps it. Never the hi-hat foot. |
| Q3 (decided) | R2 in `!` sessions | **The cap holds in `!`** (submission targets are already exempt), shown in the teacher digest, with an explicit teacher **"Don't hold"** switch on the assignment. |
| Q4 (decided) | Snooze after "Not now" | **14 days; 28 days after a second decline** of the same cell and hand. A self-reported slip ends a snooze. |
| Q5 (decided) | The cold take at G | **Accepted with the S2 fixes, which make the override unnecessary:** G = 0.95 × target from the catalogue; confirmations and rechecks use the probe-band cold takes H2 §1.9 already plays; no report or E reaches a qualifying tempo (G16). |
| Q6 (decided) | Accent the position start (D) | **Not in v1.** Test the thumb-bump hypothesis on `nl.v` with labelled slips first; add later as a rate-keeping feel. |
| Q7 (decided) | Visits without an offer | **No auto-start.** A strong T1 flag (t ≥ 5) may be offered once inside a snooze, and still waits for Yes. |
| Q8 (decided 2026-11-28) | Where may the pass-evidence take run? (§9.2.3) | **Option (a).** Pass-evidence attempts run only once the cap is within 2 marks of the probe band (or the cell is `preTop`, or its threshold estimate is in the band), in every session in which a held cell is played. Option (b), the take in every held cell from the start, was rejected: a lucky attempt would open the pass-probe branch early and feed probe-band cold misses into the tier guard record and v15/v16 readiness, and it would need an H2 §1.6 amendment. Recommended by review rounds 3–7. |
| Q9 (decided 2026-11-28) | Pause rungs for triplet items (§5.3) | **Accepted.** Triplet items use P2 = ⅔ beat (8 twelfths) and P3 = ⅓ beat (4 twelfths) with a triplet click; P1 stays 1 beat; duple items are unchanged. G6 has a triplet case. |

---

## 20. Change logs

### 20.000000000000 v14 → v15 (review round 14)

| Issue | Resolution |
|---|---|
| R14-1 recovery floor repeated the comfort pulse | The recovery take is the highest mark, in the speed path's (take's) note value, below the lowest straight nps played that day (visit, for §5.5), not in `fgDay.played`, ≥ the comfort pulse; none if no mark qualifies; same rule in §5.5's in-visit recovery (§5.5, §9.2.2, KS2 amendment, G12). |
| R14-2 a limited held A-6 | A held A-6 in `ks.limited` today skips A-6 in the closing like a cap day: window, else A-7, else the end; added to the KS2 amendment (§9.2.2, G12). |
| R14-3 G12 forbade attempts | Attempts exempt from the day's no-repeat set (never two at one tempo within a window); G12 covers climb, recovery and fingering takes only; `preTop` cells always get their attempts (§9.2.2, §9.2.3, G12). |
| R14-4 1 ♩ attempt 2 | Old coach and list runs: attempt 1 = target, attempt 2 = ⌈0.95 × target⌉; no attempt 2 when the band is narrower than 2 ♩ (`climbFrom`'s 2 ♩ minimum); G3's k defined per planner (§9.2.3, G3, G12). |
| Minor 1: "at the cap" | Defined by the step function in nps (no qualifying mark ≤ the cap) (§9.2.2, G12). |
| Minor 2: third miss | After the second miss the climb ends (window, A-7 or the end; a session with neither may end on it) (§5.5, §9.2.2). |
| Minor 3: `hfMiss` in the window | Inactive inside the list-run attempts window (§9.8 item 9). |
| Minor 4: header code list | `enter` / `comfortOf` added to the v14 line. |

### 20.00000000000 v13 → v14 (review round 13)

| Issue | Resolution |
|---|---|
| R13-1 the closing climb could repeat; "one mark" had no note value | One step function for the start and each later take: the lowest Maelzel mark, in the note value the speed path picks (entry conversion, then `canTrip` alternation), above the previous take, not in `fgDay.played` (nps), ≤ cap; set with `noCap`; replaces `gradedUp` for held closings; worked examples for the alternation and a missed cold check; G12 cases (§9.2.2, KS2 amendment, G12). |
| R13-2 attempt 2 snapped below the band | Attempt tempi on each planner's real grid (either note value in the key session, chosen as marks so `snapDown` cannot drop them; rounded up in the old coach and list runs); no attempt 2 when the band holds one tempo; delay restated with k countable attempts (k = 1: about 6 sessions at p = 0.5); G3 models real k; written against the in-flight `passLog` (≥ 0.95 × catalogue target regardless of `goalBpm`) and band-landing fixes, listed in §17 (§9.2.3, G3, G24). |
| R13-3 a miss ended the climb | §5.5's recovery take: one mark below the day's lowest straight tempo (floor the comfort pulse), a second miss once more; ends on success; "almost" holds once (§9.2.2, G12). |
| Minor 1: main-scale window time | The window's `budgetMs` added to the main scale's `closingDue` (§9.2.2, G12). |
| Minor 2: which takes count | "Highest clean" and "reached the cap" read capped plain takes only (never cold checks, other exempt takes or attempts, so a probe-band cold check cannot make every `preTop` day a cap day); "played" reads all straight takes (§9.2.2, G12). |
| Minor 3: stale list-run wording | G12 aligned with "the cell's last item in the queue". |
| Minor 4: cap repeat vs `hfMiss` | "No clean cap take is followed by another take at the cap" (G12). |
| Minor 5: G1 vs G16 (a) | G1's pass clause distributional, excess reported (G1). |
| Minor 6: yield before the first closing take | Checked at the closing's start; the window plays first when time is short; time-up opens the window only if the yield never fired (§9.2.2, G12). |

### 20.0000000000 v12 → v13 (review round 12)

| Issue | Resolution |
|---|---|
| R12-1 the below-cap window had no time | The closing's climb yields when time left ≤ the window's `budgetMs` + one take; the climb's exits at ≈ 1174 (target, limit, time-up) open the window instead of `end`; then A-7 or the end (§9.2.2, G12). |
| R12-2 `slower` / `'slow'` from the stored goal | For a held cell, `slower` and the list-run kind compare against min(`goalBpm`, cap); attempts always pass `slower: false`; `done()` added to the read points (§9.2.1, §9.2.3, G24). |
| R12-3 the climb stalled at fast tempos | Written against the key-session climb fix (separate agent: the next mark is the minimum rise per clean take); the held closing climbs one SP mark per clean take with `noCap`, ends after a miss rather than step onto a played tempo; `markUp`/unfixed `gradedUp` named as not SP's mark; worked example corrected; dependency in §17 (§9.2.2, G12). |
| R12-4 checkpoint runs | **Coordinator decision:** exempt like level-test takes; no fingering visits, blocks or windows inside a checkpoint (§0, §9.2.3, G12). |
| Minor: `lastGood` overloaded | The closing start lives in `ks.fgStart[itemId]`; `lastGood` stays the last clean pulse (§9.2.2, §9.8, §15.1). |
| Minor: nps comparison | "Not played today" in nps after the per conversion and snap (§9.2.2). |
| Minor: `fgDay.played` coverage | Records every straight take of a held cell in every planner; the rule reads it, never `lastGood`; non-visit days use visit 0's climb (§9.2.2). |
| Minor: `STEP_TAKES` text | Fires only on a not-clean take; clean holds repeat until time runs out (§9.2.2). |
| Minor: read points | Manual `setBpm(lad.next.bpm)`, `done()`, the hold line instead of `lad.message`, `tempoOf`'s result clamped (§9.2.1). |
| Minor: list-run window | After the cell's last queue item (§9.2.3). |
| Minor: G12 wording | "No plain take above the cap other than the attempts" (G12). |
| Minor: KS2 amendment | Below-cap change added (§9.2.2). |
| Minor: drums O after a miss | One mark down, floor the comfort pulse, never a missed tempo (§12.3). |

### 20.000000000 v11 → v12 (review round 11)

| Issue | Resolution |
|---|---|
| R11-1 the closing's A-6 entry clamped back | Closing start = one mark above the highest clean straight tempo, only if unplayed today and ≤ cap, entered with `known: true` (`setPulse` `noCap`); otherwise A-6 skipped as on a cap day; SP's mark, never `stepCap`; worked examples for the miss case and ♩120 sixteenths; G4/G12 testable against `fgDay.played` (§9.2.2, §9.8 item 9, G12). |
| R11-2 no cap rule on run rungs and list runs | "Held at cap" for every planner: key session any rung (first cap hit opens the cap visit, then `leave = 'done'`, run rung to `ks.finished`, no straight re-entry, no `nextVisit` revisit, no `STEP_TAKES` limit); list runs min(raise, cap) and a clean cap take goes to the window then `go(i + 1)`; `goalBpm` clamped at every read (§9.2.1, §9.2.2, G12). |
| R11-3 below-cap closing order | Capped climb → attempts window as the last straight takes → A-7 or the end; the window never ends the session before the climb; when visit 0 reached the cap the window is in the closing (§9.2.2, §9.2.3, G12). |
| Minor: stale text | U1 sentence and F6 `lastGood` wording replaced; "H2 v15" → "H2 v16" in the body (H2 v16 now on disk). |
| Minor: `technique-fingering` | Overridden inside `techResult` for every caller; `quests.ts` `tech3` excludes it (quests reward measured practice); readers named (Stats, Recap; teacher screens read no `firstTry`) (§9.8 item 5, G24). |
| Minor: `go(j)` hook | Only when the next item is another cell, before the end branch (§9.2.3, G12). |
| Minor: parked held cells | The side review skips `fgDone` and `peDone` cells (§9.2.1, G12). |
| Minor: run-rung window time | `budgetMs` included in the run-rung visit budget and the `closingDue` test (§9.2.3). |
| Minor: drums O tempo | The `orch` group's tempo, one mark up per clean take, at most the rudiment's session tempo (§12.3). |
| Minor: `fgDay` sync | `played` and `capVisit` device-only, accepted as interim with the two-device cost stated (§15.2). |

### 20.00000000 v10 → v11 (review round 10)

| Issue | Resolution |
|---|---|
| R10-1 the held closing has no legal tempo | A held cell whose straight takes reached the cap today skips A-6 in the closing every day (and a passed A-6's target review); the closing plays the attempts window, else A-7 (`enter(a7)`), else ends with the hold line; one cap visit per cell per day with the day's pairs in `fgDay.played`; record-only `lastGood` = one mark above the highest straight tempo played, clean or missed, at most the cap; KS2 amendment entry; why G4/G12 are satisfiable stated (§9.2.2, §9.8 item 9, §15.2, G12). |
| R10-2 missing exits and counting | Hooks at the KS run-rung visit exit (before `nextVisit` / `openVisit(closingV)`), the old coach and linear path before time-up (time reserved before, window instead of the next ordinary take), and inside `go(j)` for list runs (Next, any-note Next, `hfSchedule`, third `hfMiss`); one window per session per held cell in `CoachState.peDone` and the queue save (a second session the same day gets one); `pe` kept for touch point 2 and telemetry with a merge rule (§9.2.3, §15.1, G3, G12). |
| Minor: stale G24 sentence | Replaced: `total` / `firstTry` unchanged when measured takes exist (G24); `drillSession` typed with `fgTakes`. |
| Minor: fingering-only display | Lesson id `technique-fingering`, shown as "Fingering work · N takes", no `l:` ledger item (§9.8 item 5, G24). |
| Minor: `nextKeyIdx` vs one-cell | The fallback laps over passed keys skipping `fgDone`; one-cell = every key in `fgDone` (§9.2.2, §9.8 item 9, G12). |
| Minor: drums interim host | One O take after the cold check in every session of an acquired, consented rudiment, so D-T1 can fire; a 28-day window rejected (§12.3, G13). |
| Minor: old coach side takes | Capped at min(`goalBpm`, cap) on held cells; the side review skips `fgDone` (§9.2.1). |
| Minor: closing after the window | Returns to `openVisit`'s A-7 branch when playable and time remains, else ends (§9.2.2). |
| Minor: attempts copy | "Two tries at the target, ♩120." / "שני ניסיונות ביעד, ♩120."; no brief (§14.4). |

### 20.0000000 v9 → v10 (review round 9)

| Issue | Resolution |
|---|---|
| R9-1 fingering takes in `total` cost rewards | With measured takes, `total` / `firstTry` stay measured-only and the fingering XP rides in `xp` (a rare `rowCounts` xp clamp accepted); only a fingering-only session writes `total = fgTakes`, `firstTry = 0` (never good or perfect: neutral). Readers checked: `addSessionStats`/`goodSessions`/`gemsOf`, `counts.perfect`, `records.fastPerfect`, `historyPerfect` (§9.8 item 5). G24: 10 clean + 4 fingering stays perfect. |
| R9-2 inherited warm-up, cold take leaving, closing repeat | At `fg` open: `warmLeft = 0`, `warmNext = -1`, `review` / `reviewHere` false, `chal.pending` cleared, so straight takes are `normal`; `fg` opens only if the cold take's `ksAfter` stayed in the same visit (no `end`, not closing), else the cell's attempts move to the closing window or nothing runs today; record-only `lastGood` = one mark above the top, at most the cap, one mark below when the top was the cap; the capped closing and the attempts play the main item (§9.8 item 9, G12). |
| R9-3 no driver for attempts outside a visit | The attempts-only `fg` (2 takes, time reserved) with its hook in every planner: KS at the start of the held cell's closing (capped A-6 climb skipped that day), old coach and linear path before every leave path, list runs before `go(i + 1)` (also after the third `hfMiss`), standalone before the end; G3 models this placement (§9.2.3, G3, G12). |
| R9-4 `nextKeyIdx` wraps back | `CoachState.fgDone`; `nextKeyIdx`, the weak-spot review and `coachTake`'s key choice skip it; "one-cell" = nothing left outside `fgDone` (§9.2.2, §9.8 item 9, §15.1, G12). |
| Minor: stale v8 text | Removed from G12 and §17 F6. |
| Minor: cap visit inside the closing | Ends with the session; no `closingMs` yield inside the closing; budget min(cap-visit budget, time left) (§9.8 item 9). |
| Minor: upgraded old clients | On load, `fg:` entries in `drillItems` move to `progress.fingering` via `mergeFingerCell` and are deleted (§15.1, G24). |
| Minor: drums host | Until the SP feel pool exists, the old coach hosts one O take after the cold check every fourth session of an acquired sticking rudiment (§12.3, G13). |
| Minor: closing item | The main item (§9.8 item 9). |

### 20.000000 v8 → v9 (review round 8)

| Issue | Resolution |
|---|---|
| R8-1 fingering-only results vs the server checks | No migration: since 0.145.17 `rowCounts()` (`cloud.ts`) clamps rows to the server checks (total 1–50, `first_try ≤ total`, `xp ≤ total × 20`) and the upload retries row by row after a batch error. Fingering takes count in the result's `total` (a take, not clean) through `drillSession.fgTakes`; `techResult` gates on takes (main + fingering), not XP (§9.8 item 5, G24). |
| R8-2 key-session open and close | The visit takes the rest of the cell's current visit after its cold-check take (in practice the rest of visit 0, or a rotating/run rung's visit; never the closing). No `openVisit`: `fingerAfter` resets `visitAt`, `visitTakes`, `visitBudget` to §7.2's budget and opens `fg`; at the end the rung is left exactly as `leave = 'budget'` does (`nextVisit` → `openVisit(nv)`, or the closing); A-6's own climb and A-7 move to the closing (§6.1, §7.2, §9.8 item 9, G12). |
| R8-3 old coach end of visit | Record-only never touches `c.at` or `peak`; the end of a block or visit resets as the park path does (without `weak`); blocks also end the cell for the session (§6.1's "climb resumes" removed); one-cell runs continue with fingering takes only, then end with the hold line (§6.1, §9.2.2, §9.8 item 9, G12, G17). |
| R8-4 queue continuation | `fingerAfter(null, take, verdict, ctx)` on the queue save's `fg`; next take through `go`/`hfSchedule`'s setters; `lad.next` and `hfMiss` bypassed while `fg` is open; `go(i + 1, auto)` at the end; standalone runs the same and then end (§9.8 item 9, G4). |
| Minor: complete stand-in | Every required `ItemState` field (`key`, `hands`, `goalBpm`, `streak`, `fails`, `ewma`, …); `drillFamilies` filters `fg:` (§15.1, G24). |
| Minor: deterministic merge | `mergeFingerCell(x, x)` = `x`, commutative, fixed shape: no ping-pong (§15.1, G24). |
| Minor: which item in the old coach | The main item; the existing pass path from the current `c.spec` (§9.8 item 9, G12). |
| Minor: item `ceil` in KS record-only | The item-`ceil` clear stays (`saveMark`); `chal` untouched (§9.8 item 9). |
| Minor: §5.5 typo | "The straight part starts at T_S (with P0 when C ran)" (§5.5). |

### 20.00000 v8, owner decisions (2026-11-28)

| Item | Change |
|---|---|
| Q8 decided: (a) | Pass-evidence attempts only once the cap is within 2 marks of the probe band (or `preTop`, or the threshold estimate in the band), in every session in which a held cell is played; (b) rejected (§0, §9.2.3, §9.2.5, §17, G3, G16, §19). |
| Q9 decided: accepted | Triplet items: P2 = ⅔ beat, P3 = ⅓ beat, triplet click (§0, §5.3, §19). |
| H2 v16 | Cited as v16; new §9.9: the guard at P ≥ 0.9 (fingering takes never in the guard record), the warm-first warning never fires for fingering takes (planned after the cold check; G2), merges of `fg:` rows never affect rank re-derivation, held cells excluded under per-area-kind H10 targets (G22). |

### 20.0000 v7 → v8 (review round 7; its issues are numbered S1–S3, not round 1's)

| Issue | Resolution |
|---|---|
| S1 hand-back and the old coach at the cap | Record-only defined per coach: the key session updates `lastBy`, `best`/`bestBy`/`sessionBest`, `lastGood`, `dayStart`, `flow[rung]` (one mark above the visit's top clean straight tempo, ≤ cap) and emits stage marks; the old coach updates `c.at`, `peak`, `c.passed`/`passedNow`; neither touches `stepTakes`, `almost`, `stall`, the limit, `ceiling` or `setComfort`. A key-session visit opens through `openVisit`, ends in `ks.finished`, continues with `nextVisit`; in the old coach the cell is done for the session unless it passed the key. New `capHeld` rule in `coach.ts`: no `stall`, `PLATEAU_TAKES` or `ceiling` at the cap, the run ends with the hold named (§9.2.2, §9.8 item 9, G4, G12, G17). |
| S2 fingering-only stretches | `fingerNext` in Drills (state, `cXp`, `fgTakes`, `persistCoach`, line, speech, `coachGo`); `persistCoach`'s gate `count.current.takes + fgTakes`; `techResult` writes a result when fingering XP exists (`total` 0 accepted); the queue save gains `fg?: FgVisit`, and standalone runs use the key `fgq:<cellKey>` (§9.8 items 5 and 9, G4, G24). |
| S3 `~feel` wrongly filtered | `isFingerRow(id)` = `id.startsWith('fg:')` only; `~feel` stays visible per SP §21 A2 (§9.8, §15.1, G24). |
| Minor: G24 booking text | Time by skill and key through `bookFingerTime`, no `d:` entry (G24). |
| Minor: sync details | The merge callback returns `fg:` rows; `markAllIfFirst` marks them dirty (§9.8, §15.1). |
| Minor: older app versions | The `fg:` row is a harmless `ItemState` shell (family `fg`, zero takes, empty history, `last` = newest upd, payload under `fg`); a version gate rejected (§15.1). |
| Minor: `onFingerTake` | Required, wired at all 5 Drills hosts (§9.8 item 5). |
| Minor: delta writes | `recordFingering` applies the take's delta under the lock (§9.8 item 5). |
| Minor: closing check | `closingMs(c)` (§9.8 item 9, G4). |
| Minor: attempts vs budget | The attempts' slots and time are reserved inside the 7-take / 2.5-minute budget (§7.2, G4). |
| Minor: SP amendment | SP §21 entry for the visit budgets replacing `VISIT_TAKES` (§7.2). |
| Minor: ledger quality | `consolidation` kept, stated as quality time (§9.8 item 6). |
| Minor: interim mark | Device-only limitation stated (§9.8 item 7). |
| Q8 / Q9 | Round 7's (a) and triplet-rung acceptance recorded; both still open (§19). |

### 20.000 v6 → v7 (review round 6; its issues are numbered N1–N5, not round 2's)

| Issue | Resolution |
|---|---|
| N1 the fingering store had no transport | Option (b): `fg:<cellKey>` rows in `toneturn_drill_items` through `drillSync` (the loader adds them, the pull dispatches them to `mergeFingerCell`, every store write marks them dirty); locally in `progress.fingering`, never `drillItems`; `isPseudoItem` covers `fg:` and `~feel` and every named reader skips them (superseded in v8: `isFingerRow`, `fg:` only; `~feel` stays visible per SP §21 A2); justified against a new table (no migration, the tested base-version, epoch and RLS protocol). `rebuildProgress` keeps `fingering`; `fingeringOffer` and `fingeringOrch` sync through `portableSettings`; `fingeringVoice` joins `DEVICE_SETTINGS` (§9.8, §14.6, §15.1, F7, G19). |
| N2 cap reset and write races | New App prop `onFingerTake`: the same `takeCounts.current` ref as `take()`, session XP and band time, `store.recordFingering` chained on `drillWrites` and run under `drillLock` (§9.8 item 5). G24 cases: the count survives a straight take's wholesale write; interleaved writes lose nothing. |
| N3 no owner for the coach visit | `CoachState.fg` (`FgVisit`), saved with the run (and with the open run in list runs); `coachTake` returns its next take; `fingerAfter` owns the whole visit, straight takes included, which call `coachAfter` in record-only mode; time-up and the closing (`CLOSING_MIN`) are checked before each take; one budget per visit (7 takes, 2.5 min, attempts reserved) and per cap visit (9 takes, 3.5 min), replacing "3–4 takes" and `VISIT_TAKES` (§7.2, §9.2.2, §9.8 item 9, §15.1, F6, G4, G12). |
| N4 a stopped cell re-offered on old evidence | `exitAt` = max(`retiredAt`, `stoppedAt`) for every `retired` or `done` cell; `stoppedAt` (with `stopWhy`) merged by max; §11.5's later fire needs rows after `stoppedAt` (§3.5, §11.5, §15.1). G10 cases for Stop, End and the timeout. |
| N5 D-T1 had no data | F9 adds a drum trace builder and the `drumEvidence` stream of orchestrated wrong-pad strokes, exempt from the `vr` exclusion (§12.3, §15.2, F9). G13 case. |
| Minor: branch point | `takeFingering()` branches at the top of `done()`, before `refineCal` and `recordTakeAnalysis` (§9.8). |
| Minor: ledger | New export `bookFingerTime(skill, key)`: kind `technique`, `q: 'consolidation'`, no item entry (§9.8 item 6, G24). |
| Minor: G1 and Momentum | G1 compares Momentum's progress half (weekly gains) only (G1). |
| Minor: interim cold marking | A device sounding mark `fgDay.sounded` that F1b's `cd` reads until H2 step 1's `lastSound` exists (§9.8 item 7, §15.2, F1b). |
| Minor: orchestrated edge | `FgLadder.orchDays`, the newest 2 days (§12.3, §15.1). |
| Minor: `stoppedAt` merge | By max, with `stopWhy` (§15.1). |
| Minor: Hebrew | "תרגול אצבוע מרוכז" in the offer; "כל יד על תוף אחר" in the orchestration offer (§14.4). |
| Q8 / Q9 | The reviewer's (a) and the triplet rungs recorded again; both still open (§19). |

### 20.00 v5 → v6 (review round 5)

| Issue | Resolution |
|---|---|
| F1 leaks through `recordDrill` and the coach | §9.8 re-read from the code (`done()` → `take()` → `recordDrillNow` → `afterTake()`, `coachNext` → `coachAfter`, the list-run `lad.next`). `takeFingering()` branches after the trace and never calls `applyTake`, `onTake`/`take()`, `store.recordDrill`, `afterTake`, `coachAfter` or `recordTakeAnalysis`. `store.recordFingering` writes only the `fingering` store's `ladder` (a minimal `FgLadder`, no `cleanBpm`/`passLog`), XP, `stats.days`/`xpByDay`, `takeCounts` and ledger time under `d:<mainItem>`: no `withDrillGains`, badge counters (`drillClean`, `tempoRecords`, `evenCv`), `noteChannel`, rating events, ledger item stats or drill item. `fingerAfter()` in `fingerLadder.ts` drives coach and hands-free list runs (no `stepTakes`, `almost`, limit, `setComfort`, `withCeiling`, `ceil`); the verdict line comes from the structure. Trace kind `fingering`. v5's false "no `passLog`" claim (`ladder.ts` 140) corrected by not calling `applyTake`. Session take/clean counts exclude fingering takes. `refineCal` skipped for A. G24 has one case per leak; F6. |
| F2 shelving equality claim | A held visit counts toward the 12-visit shelving only when the cell could pass in it (attempts allowed, or cap ≥ 0.95 × target); the count pauses only while the hold binds. The claim is now "neither causes nor prevents a shelving while it is the binding constraint"; G3 reports the divergence (P(shelved while held), P(working past the off arm's shelving day)); G12 asserts the rule, not equality; the H2 §1.7 amendment reworded (§9.2.2, §9.2.5). |
| F3 stale evidence after retirement | `retiredAt` per cell; recheck pull-forward and offers on `retired`/`done` cells use only rows after it, with normal minimums; a fire counts as new only with rows after the last state change (§3.5, §11.4, §15.1). G10 case: retire on day 3, the recheck stays at day 10, no re-offer. |
| Minor: XP cap key | Counted under `<mainItem>~fg`, one key per cell across RH, LH and HT: 15 XP per cell per day (§9.8, §14.1, G24). |
| Minor: P4 timing | The hand line appears 1 s after the "slipped" press; before it, a second bottom press is the same slip and a top press is ignored (§3.4, §8.3, §14.4, G8, G21). |
| Minor: "hold" vs "pause" | C = "pause" / "השהיה"; R2 = "hold" / "עצירת טמפו"; copy updated (§14.3, §14.4 terms and lines). |
| Minor: session counts | Fingering takes are kept out of the session's take and clean counts (`firstTry` / `total`), and their XP and band time still count (§9.8). |
| Minor: drums consent | Orchestrated pool takes need a one-time consent (`fingeringOrch`); "Suggest fingering work" off stops them; named in the pool brief; paid through `recordFingering` (§12.3, §14.4, §14.6, §15.3). |
| Minor: `refineCal` | Skipped for A, kept (harmless) for B, C, G, O (§9.8). |
| Minor: 5000-row limit | Fingering state lives in the synced `fingering` store, not `drillItems`, so it adds no `toneturn_drill_items` row (§9.8). |
| Q8 | The reviewer's renewed recommendation of (a), now also because it fits F2's shelving rule; still open (§19). |
| Q9 | The reviewer's acceptance recorded; still open (§19). |

### 20.0 v4 → v5 (review round 4)

| Issue | Resolution |
|---|---|
| P1 `~fg` leaks through the real take path | §9.8 traces `done()` → `take()` → `afterTake()` with line references and defines `takeFingering()`: no `recordTakeAnalysis`; `applyTake` on `~fg` with no `targetBpm`; `activeMs` on `~fg` only (no double count, `takeSeconds` unchanged); `onTake` with a fingering flag that skips `bandOfTake`, the boost, `MEMORY_XP`, `drillEvents` and `afterTake` (no record +5, close +20, key +50, Momentum). XP = a flat 1 per take × the daily repeat factor under `<itemId>~fg`, cap 15 per cell per day (§9.8, §14.1). One `isPseudoItem` filter, applied by each named `drillItems` reader (superseded in v6 and v8: `isFingerRow`, `fg:` only). H2 §1.6 amendment (`~fg` never counts, §9.2.2). G24 extended per leak; F6. |
| P2 v15 shelving and step-down | §9.2.5: held visits do not count toward the 12-visit shelving; a step-down shelving of a retraining cell freezes its fingering state (no `quiet`, no recheck clock, no break rule) until it resumes; the challenge point and guard reserve move only as with fingering off (§9.6). H2 §1.7 amendment; `frozenAt` (§15.1); G3 reports P(shelved while held) and the challenge point/guard reserve on and off; G12. |
| P3 new-key blocks vs the v15 skip rule | §10 skips the blocks when the cell has any cold result or `lastSound` history anywhere; they come first only in a cell that is new everywhere, which has no due check; any due check is played first (§9.1, G2). |
| P4 report/slip overlap | The hand question is its own line and accepts presses only ≥ 0.5 s after it appears; two bottom presses within 1 s are one slip with the hand unknown, never a left-hand answer; a hand-unknown slip never lowers an unattributable hand's edge or `lastSlipAt`; inside a report window the slip mark and "slipped" are one T3 (§3.4, §8.3, §9.4, §14.4, G8, G21). |
| Minor: H2 v15 | Cited throughout; section numbers re-checked (unchanged); held cells also excluded from v15's appropriateness metric (§9.2.2). |
| Minor: band anchor | "The Maelzel mark at or below the lowest eligible row" (♩83 → ♩80) (§11.3, G10). |
| Minor: `preTop` units | Stored in nps; the target converted at the item's note value (§9.2.3). |
| Minor: non-take notes | Range-learning, answer, zone and slip-mark presses never set `lastSound` or make the cell "sounded" (§1.4, §14.6, G2). |
| Minor: due checks first | Due cold checks (counting, slots, reviews, guard probes) are planned ahead of blocks and visits; an unplayed one is a skip (§6.1, G2). |
| Minor: T1 confound | Stated in §3.2; "both bands on ≥ 2 distinct days within one 7-day window" or a day detrend on the re-fit list (§16.2). |
| Minor: G3 outputs | Also the pending-first-clean expiry rate under a long hold and the guard-record miss count (G3). |
| Minor: text fixes | `cd` in §15.4; the "End" and empty-list bullets moved under item 3 (§14.6). |
| Minor: dependencies | F6 depends on H2 step 1 (`lastSound`, the skip rule) and the `<item>~feel` pattern (§17); drums are MIDI only except T3 through the menu (§12.1). |
| Minor: copy | "Stick to one fingering, slow first." / "רק אצבוע אחד, קודם לאט."; "הטמפו נשאר ב-♩116 עד שהאצבוע מתייצב." (§14.3, §14.4). |
| Q8 | The reviewer's stronger recommendation of (a), with the v15 reason (early opening under (b) feeds probe-band misses into the guard and readiness); still open (§19). |
| Q9 | The reviewer's support for ⅔ / ⅓ beat with a triplet click recorded; a triplet case in G6; still open (§19). |

### 20.1 v3 → v4 (review round 3)

| Issue | Resolution |
|---|---|
| M1 fingering takes write the item's record | §9.8: fingering takes (A, B, C at P1–P3, G, O) are applied to `<itemId>~fg` (the SP §16.4 pattern), bypassing `applyTake` on the item (`Drills.tsx:1772`; `ladder.ts:134` `cleanBpm`, `:143–145` `passLog`) and `drillXp` (`Drills.tsx:1785`); on the item they write only `activeMs` and `lastSound`; the excluded fields listed; C and G get their own feel groups (`pause`, `cell`); a missed pass-evidence attempt is exempt from the KS2 limit, `STEP_TAKES` and `ALMOSTS_BACK` (§9.2.3). G24 added; G16 (b) extended. §1.4, §5.3, §14.1, F6. |
| M2 attempts only in the cap visit | Pass-evidence attempts run in every session in which a held cell is played, in every planner and visit kind, short and `!` sessions included (unless "Don't hold"), as the last straight takes of the cell's last visit of the session (§9.2.3, §7.2). G3 restated with realistic visit frequencies; G12 covers it. |
| M3 silent days | Only days with ≥ 1 window shown for the cell and none answered count (`quiet`, §11.5, §15.1); one end-line question per session, keep-hold first, offer deferred (§4, §11.5). G20. |
| M4 slip on a cell with no state or `flagged` | One path per state (§3.4 table): no state / `flagged` / `done` → `flagged` with `t3At`, visits without a hold for 7 days, an offer; Yes → block → `retraining` with the hold; no Yes in 7 days → visits stop, flag stays; `retraining` without a hold → hold at once. §7.1, §9.2.0 aligned. G21. |
| M5 day-1 block without E | The day-1 reference = the session tempo, else the last clean tempo; P0 at reference − 2 marks; closing ceiling = the reference (§5.5, §6.2). |
| M6 cold vs warm, naming, numbers | Renamed the "no break, no worse than flagged" check everywhere (§9.4, §11.2–§11.4, §14.2); its ~84 % permissiveness stated; references frozen from T1-eligible rows, bands anchored at the lowest eligible mark, half-open; `refCold` for cold takes when ≥ 5 cold rows, else break check only; §11.3 example recomputed (♩125–156: n 14, mean +4.4, SD 10.5, threshold +14.9; ♩100–125: +11.3, SD 11.4); R_g = one LH `xu` note per take in the D-major item (§3.3, §11.3); G10 rewritten on held-out fixtures with a cold case. |
| M7 weak shadow gate | Added P(p_flag > p_control) ≥ 0.95 under Beta(1, 1) posteriors; one control unit per (cell, hand) per 14 days; the single-labeller limitation and a re-run with real users; "T3 and manual only" named as an expected outcome (§16.2, G23). |
| Minor: residual rule | One side suffices, both must agree when both exist; references at any place in the beat with ≥ 2 at j's place; `sdl` uses the side-0 rule, 8 nearest, no sign filter (§1.3). |
| Minor: `cleanBpm` and "only removes takes" | Corrected: exempt takes and the attempts still raise `cleanBpm`, and the attempts add takes; G16 (a) defined on paired seeds with an ε bound, the Q8 excess reported (§9.2.3, G16). |
| Minor: triplet rungs | P2 = ⅔, P3 = ⅓ beat with a triplet click proposed; Q9 for the owner (§5.3, §19). |
| Minor: mic fallback | G only on mic (§5.3). |
| Minor: TP2 and the silent rise | Fire on the top straight take of any visit of the cell, ordinary speed visits included (§8.1). |
| Minor: slip mark | One-time brief, he + en; the range learned at that brief or in Settings ("Learn keyboard range"); zone notes in a countdown start nothing; drum gesture defined; the slip mark named in the "Retrain this fingering" brief (§3.4, §12.3, §14.3, §14.6). |
| Minor: merge | `hold` with `holdUpd`, `quiet` with its own `upd`; `preTop` at the start of the hold; `edgeRaise` with a per-day `midi` bit (§9.2.0, §15.1). |
| Minor: Settings | "Offer again" restores stops by "Stop", "End" and the silent timeout, as the hint and G19 say (§14.6). |
| Minor: H10 | Held cells excluded from the flat-rank slope while held, reported apart (§9.2.2, G22). |
| Minor: "your report" | Only when E came from a report; else "from your playing" / "לפי הנגינה שלך" (`edgeSrc`, §9.4, §14.4, §14.6). |
| Minor: copy | Hebrew retired line and English offer line as proposed (§4, §14.4). |
| Minor: R_g per take | Stated in §3.3: one note per take in the two-octave HT D-major scale; T2 rates per note. |
| Q8 | Kept open with (a) and (b); the reviewer's recommendation of (a) with M2 noted; (b) needs an H2 amendment (§19). |
| Author choices | Silent thresholds 5/10, the mean + 1 SD tolerance and no hold without evidence: confirmed by the reviewer, with M3 (asked-and-unanswered days) and M6 (naming, T1-eligible rows, cold reference) applied. |

### 20.2 v2 → v3 (review round 2)

| Issue | Resolution |
|---|---|
| N1 G16 false as written | G16 restated as two properties: (a) no report raises any qualifying tempo above (or before) the feature-off baseline, (b) no report value is ever used as a qualifying tempo (§18). §9.2.3 explains the path through `cleanBpm`, and says that for non-`preTop` cells both halves of the pass wait (§9.2.3, §9.4, §9.6). Q8 text corrected (§19). |
| N2 pass-evidence take | Up to 2 attempts per session, distinct tempi, stopping at the first clean one; they are the visit's last takes, with no closing straight take at the cap and touch point 2 on the clean attempt (§9.2.2, §9.2.3, §8.1). G3 bounded by clean rate (p ≥ 0.6) and run as a simulation at p = 0.5 and 0.7, on vs off, before F6 (§17, §18). |
| N3 MIDI condition | Tempo-matched: the reference is frozen per 1.25× band in the synced `FlagStat.ref` (with `dir`); v1 condition = not a break take and not worse than the flagged state at the take's band (mean + 1 SD). Checked on the owner's D-major LH `xu` numbers: the fast takes pass about 84 % of the time, where v2's band failed most (§11.3, §15.1, G10). On the re-fit list (§16.2). |
| N4 class mismatch | One class array: `noteLog`'s `x`, unchanged (crossing wins); the derived `bd` bit marks boundary crossings, which are their own sites and excluded from R_g, T1 and T2, as `takeTrace` excludes them; references = class `.`. R_g then equals `takeTrace`'s class means for the suggested fingering, so the ♩100 replay and G5 test the same statistic. Per-note replay waits for v3 traces (G5b) (§1.3, §2.2, §3.2, §18). |
| N5 shadow precision | Labels at the top take in the flag's band; controls at their own upper band; one neutral wording, no spot check in shadow; positives are "slipped" only, no T2 confirmation; units with ≤ 3 labels; precision and control-rate formulas; gate ≥ 10 units, ≥ 50 %, ≥ 2 × control; extension up to 6 weeks (§16.2, G23). |
| N6 silent player, T3 circular | E rises 1 mark a day on MIDI-clean top takes without an answer (§9.4); the keep-hold question after 5 silent practice days and the automatic end after 10 (§11.5); the any-time slip mark starts T3 flags, on mic too (§3.4, §3.5). G20, G21. |
| N7 repeated straight takes | The straight ladder (§5.5): a mark up per clean take to the ceiling, down below the lowest after a miss, never a repeated tempo; the C ladder drops a mark instead of repeating (§5.3); no closing at the cap (§9.2.2); P0 is an ordinary straight take with no `vr` (§1.4, §5.3). G4 extended to the block and every straight take. |
| N8 pin imposes R2 | The hold rule (§9.2.0): R2 only with a data flag accepted by Yes or a reported slip; pins and manual starts without evidence get visits only (§4, §6.3, §9.4, §9.5, §15.1, G12). |
| N9 H10 inflation | Variants count at effective tempo (C/B by total time, G at min(burst, T_S), A nothing); held cells reported apart; G22; the H2 §1.7a amendment entry (§9.2.2). |
| Minor: C grading | One IOI with one offset per segment (§5.3). |
| Minor: verification floor | The false "always verifiable" claim removed; mic floor 60 ms; an unverifiable take keeps the rung and the next is one mark slower (§5.3). |
| Minor: tempo limits | T_C fallback capped at cap + 1 mark; T_C is C's start, cap + 3 only in the cap visit (§5.3). |
| Minor: naming the place | Per-site `[pc, r]` in `xs` (§2.2, §3.2). |
| Minor: slips between confirmations | `lastSlipAt` per hand, synced, merge drops earlier confirmations (§11.4, §15.1). |
| Minor: cold takes in T1 | `cd` on the trace; T1 bands exclude cold takes (§2.2, §3.1). |
| Minor: E jumps | ≤ 2 marks a day with MIDI agreement; the day's total ≤ 2 (§9.4, G17). |
| Minor: report grammar | The hand press only after "slipped"; prompts name only working inputs; ← = slipped for page turners (§8.3, §14.4). |
| Minor: copy | Settings hint aligned with what "Offer again" does; Hebrew "לא" for the bottom key (§14.4). |
| Minor: states | `declined` removed as a cell state; per hand only (§1.4, §4, §15.1). |
| Minor: block closing | Day-1 ceiling = E; P0 two marks below E (§5.5, §6.2). |
| Minor: T3 visits | The plan check on the first visit of a cell that came through T3 without a block (§7.2). |
| Minor: drums | Orchestrated takes once acquired; a D-T3 flag before an orchestrated edge starts E from the report (§12.3). |
| Minor: numbering | G18 before G19 (§18). |
| Q8 | Kept open with options (a) cap within 2 marks of the probe band and (b) every held cell from the start, with trade-offs; decided on the G3 numbers (§19). |

### 20.3 v1 → v2 (review round 1)

| Issue | Resolution |
|---|---|
| S1 R2 blocks passes | Pass-evidence take (§9.2.3); A-6 "held", A-7 on `passedAt` (§9.2.2); G3 planner-level; the remaining delay stated, Q8. |
| S2 report steers a cold take | G from the catalogue target only; the cold-tempo override removed; H2 §1.9 cited; §9.6 principle; G16. |
| S3 pause ladder | Runs at the item's tempo (T_C), P0 only ≤ the cap at T_S; whole-twelfth rungs, P4 dropped; real lengthened notes, subdivided click, segment grading; no touch point at P0. |
| S4 log retention | `fingerEvidence` per cell ≥ 21 days, separate from the `nl` trim; flags per device, results synced; server copy for calibration. |
| S5 computability | F1b trace v4 (`fs`, `vr`, `cell`, `xs`, `to`); thinned and feel takes excluded; `p === 0` only; residuals for every note by the trace's own rule, `sdl`; T2 includes timing-only failures; `fsOwn`/`fsSug`; G5 at ♩100; shadow collects labels with a precision go criterion. |
| S6 identity | State keyed by cell, hands inside, evidence pooled across the cell's items; per-hand fields; merge by `upd`; T3 date, slips today, flag stats; cross-cell `fgDay`. |
| S7 retirement | G = 0.95 × target; rechecks at ≥ G plus touch point 2 past E0; MIDI condition with references for T2/T3/manual; mic: report-only, labelled, and an onset-verified HS ladder. |
| S8 key session | Variants-only after the cap, one straight take at the cap last; cap ≠ limit; B in its own feel group; E ≤ 1 mark a day from OK unless MIDI-clean; H10 offered difficulty. |
| S9 drums | Orchestrated takes in the feel pool; cap = max(orchestrated + 2 marks, plain edge); crosstalk-safe substitution; site = first stroke after a hand change; `x` `h`, `f` letters; report debounce, ride bell. |
| UX | "מנחי יד" / "מנח יד"; "OK"/"yes" in English; range learned per input, octave-aware; unambiguous spot check; verdict first; Hebrew retirement line; "פרצים". |
| O11 | The Fingering coach card in Settings → Learning (§14.6), the data model, F8, G19. Q1–Q7 marked decided. |
| Minor | Block take counts; `NOTE_LOG_MAX` 120; T2 strength; `!` pin in SP's amendment list; Abushanab as an analogy, Hardwick indirect; `speakable` for ♩ and ♯. |

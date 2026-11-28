# SPEC-FINGERING: training correct fingering inside normal practice (v4, 2026-11-28)

**v4** resolves review round 3 (`docs/REVIEW-FINGERING-round3.md`): the 7 issues M1–M7 and every minor note. The reviewer confirmed v3's three author choices (silent thresholds 5 and 10, the mean + 1 SD tolerance, no hold on manual starts and pins), with the M3 and M6 adjustments applied. **v3** resolved round 2 (`docs/REVIEW-FINGERING-round2.md`, N1–N9) and **v2** round 1 (`docs/REVIEW-FINGERING-round1.md`, S1–S9). All change logs are in §20. The owner accepted the reviewer's defaults for Q1–Q7 on 2026-11-28 (§19, decided) and added one requirement: a fingering-coach setting in Settings (§14.6). **Q8 stays open** with two options (§19), to be decided on the numbers of the G3 simulation, which runs before F6 (§18).

**Sources.** `docs/RESEARCH-FINGERING.md` (RF1) and `docs/RESEARCH-FINGERING-2.md` (RF2). This spec does not re-research; every evidence claim cites a section there.

**Integrates with:** the key session (`keyCoach.ts`, SPEC-KEY-SESSION-2 = KS2), the spiral rotation (SPEC-SPIRAL-PRACTICE = SP), cold evidence, the cold staircase, the V1 pass and rank (SPEC-HOLISTIC-2 v14 = H2), teacher assignments (`coach.ts`), hands-free runs, SPEC-INPUT-SOURCE (IS), the take traces (`tendency.ts`), the calibration upload (`calibUpload.ts`).

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
- **Fingering take** = a take played as one of the §5 structures (A, B, C at P1–P3, G, drums O). New `TakeKind` **`fingering`** with the same zeros as `form`. **`TAKE_KIND` alone isolates nothing** (it is read only by the tendency filter, `tendency.ts:641`), so a fingering take is also kept off the item's own record by a separate path (§9.8, M1). Straight takes inside a block or visit, **P0 included** (§5.3), are ordinary takes of their normal kind with no `vr`: they count as usual and are eligible evidence (N7).
- **Touch point** = one of the two moments in a day when the report is asked (§8.1).

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
  - on HT takes the hand press follows as in §8.3;
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
  - **Triplet items** (`subDrill` triplet eighths, `stages.ts:204`; minor): P2 = ½ beat and P3 = ¼ beat would put the following notes at 4k + 6 and 4k + 3 twelfths, off the eighth and sixteenth click. For triplet items **P2 = ⅔ beat (8 twelfths) and P3 = ⅓ beat (4 twelfths), with a triplet click**. Q1 did not cover triplets, so this is **Q9** for the owner (§19); until decided, the triplet rungs above are the proposal.
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
- **Start:** P0 at T_S (or at T_S when C did not run).
- **Each clean straight take is followed by one a mark faster**, up to the ceiling.
- **At the ceiling** the straight part stops. In the key session's cap visit the variants take over (§9.2.2); elsewhere the visit ends. The clean take at the ceiling is the visit's **top take** (touch point 2, §8.1), and it meets end-on-success (SP §1).
- **After a miss,** the next straight take is one mark **below the lowest straight tempo played in this visit** (a new tempo). A clean take there ends the straight part, end-on-success; a second miss goes down again, floor the comfort pulse.
- "Almost" holds once (the only repeat).
- **Never a tempo already played straight in the same visit or block.** The pass-evidence attempts (§9.2.3) are the only straight takes above the ceiling, each at its own tempo.

---

## 6. The day-1 block (O1)

### 6.1 When it runs
Always **after the cell's main-item cold check of the day** (R1).
- **Key session:** it replaces the rung's next speed or review visit for that cell. Never inside coordination stages.
- **Rotation (SP §2, once built):** it replaces the cell's next visit. It counts as one visit with its own budget.
- **Old coach, linear path, assignments:** the next take of the cell starts the block, then the climb resumes.
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

### 7.2 Content (3–4 takes, about 1–1.5 min)
1. **G** on the flagged group's site (kind `fingering`).
2. **C** from the remembered rung at T_C (kind `fingering`). The plan check replaces it when due, and **always on the first visit of a cell that reached visits through a T3 report without a block** (minor). **B** replaces C on every third fingering visit (variety; RF2 §5, Bangert 2014: partial support).
3. **The straight ladder (§5.5)** from T_S: 1–3 ordinary takes of their normal kind, counted as usual, each at a new tempo. **Touch point 2** follows the top straight take (§8.1). In the key session's cap visit the variants follow (§9.2.2). The pass-evidence attempts follow in whichever visit is the held cell's last of the session (§9.2.3, M2).

- **Key session:** a fingering visit may replace one speed or review visit of the flagged cell (not the closing, never coordination stages). Budget `VISIT_TAKES` + the end-on-success extension.
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
| **MIDI keys** | a key in the **top zone** | a key in the **bottom zone** | a second press within 2 s: bottom zone = left, top zone = right. None = hand unknown (§9.4). |
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
- **The only exception:** the new-key blocks (§10), on a first appearance, when the cell has no history to protect.
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
  - the old coach's climb and over-target climb (SP §2.5);
  - rate-keeping feels (SP §16.4);
  - **challenge takes** (SPEC-CLIMB-SYNC §2) are off for the cell.
- **Allowed above the cap:** C at P1–P3, B, G (variants change the movement context; RF2 §8.2).

#### 9.2.2 In the key session, precisely (S8)
- **The visit at the cap:** the straight ladder (§5.5) stops at the cap. The visit continues with **variants only**, climbing: C at cap + 1 mark from the remembered rung, then B or G, each clean variant take one mark higher; C and B go up to **cap + 3 marks**, G keeps its own range (§5.4).
- **Which take ends the visit (N2, N7).** v2 closed with one more straight take at the cap, which repeated a tempo. v3 has no closing straight take at the cap: the clean cap take was already the straight end-on-success and the top take (touch point 2). **When the pass-evidence take runs (§9.2.3), its attempts are the visit's last takes**, after the variants, and touch point 2 moves to the clean attempt. Otherwise the last variant take ends the visit.
- **A cap hit is not a limit.** KS2's limit ("that's your limit today"), reopen rules, "no more than six takes on one step" and the WAVE/limit logic ignore takes held at the cap. A-6 shows **"held"**, not failed or limited; the end line names the hold. KS2 U1's closing plays at most at the cap, and one mark below when the cap was already played straight in the same visit (N7).
- **A-7 opens** when A-6 passes its target as now, **or** when the cell's main item has `passedAt` (H2 §1.6). Under the cap, A-6 may never reach its target in session (S1b).
- **H10 (N9):** a held cell's fingering variants count as offered difficulty at their **effective tempo**, never at the click tempo:
  - T_eff = the tempo of a straight take of the same notes in the same total time. C and B: the written beats over the written beats plus the added pauses or long notes. G: min(the burst tempo, T_S), since a 5-note cell is not a run. Blocks (A) count nothing;
  - difficulty = content tier + ln(T_eff / target) / ln 1.2, as in H2 §1.7a. A P1 take at cap + 3 marks therefore counts well below the cap; P3 and P0 count near their tempo;
  - **held cells are excluded from the flat-rank slope** for the days they are held, and **reported separately** ("held cells: n, days held"; minor). The harness asserts that a held cell's effective difficulty rises across visits (shorter rungs, E rising), so the slope cannot pass by construction (G22).
- **H2 amendment entry (N9).** R2 departs from H2 §1.7a ("the climb continues whatever the rank"). This entry is added to H2 with this spec, beside the SP §21 entry: *H2 §1.7a is amended for held cells (SPEC-FINGERING §9.2): their plain straight climb stops at E + 1 mark; their variants count at effective difficulty; they are reported apart in the H10 metric; passes and rank are untouched except for the delay stated in SPEC-FINGERING §9.2.3.*

#### 9.2.3 Passes: the pass-evidence take, and the honest limit (S1, N1, N2)
- **Exempt from the cap (they play at their own tempo):**
  - the cold check and every counting cold check, pass probe, confirmation and FSRS review probe (H2 §1.6, §1.9);
  - the placement probe; level-test takes; teacher submission targets.
- **The pass-evidence take (N2):** up to **2 plain straight attempts per session per held cell at 0.95–1.0 × target, stopping at the first clean one.** They feed the warm half of the V1 pass (3 counted clean takes at ≥ 95 % of target on ≥ 2 days, H2 §1.6), and a clean one is "the target first reached" for the cold half's later-day rule.
  - **Tempi:** attempt 1 at the highest mark ≤ target. Attempt 2, after a miss, one mark lower if that is still ≥ 0.95 × target, else at 0.95 × target; there is no attempt 2 when that equals attempt 1's tempo. Never two attempts at one tempo (N7).
  - **Where (M2): in every session in which a held cell is played, in every planner** (key session, rotation, old coach, linear path, list runs, standalone), in any visit kind (a fingering visit or an ordinary speed visit), short sessions included, and in `!` sessions unless "Don't hold" is set. They are **the last straight takes of the cell's last visit of the session**: planners that build a plan (key session, rotation) reserve them in that visit; planners without one (old coach, linear path, list runs) put them at the end of the cell's run, before moving on. In the cap visit they come after the variants (§9.2.2). On a day they run there is no closing straight take at the cap. Touch point 2 follows the clean attempt (once a day). They are not limited by §7.1's visit rationing.
  - **A missed attempt is not a limit** (M1): like a cap hit, it is ignored by KS2's limit, `STEP_TAKES` and `ALMOSTS_BACK` (`keyCoach.ts`), the reopen rules and the WAVE logic.
  - **Allowed when** (v4 rule, pending Q8): when the hold began, the main item's `cleanBpm` had already reached the probe band (`preTop` ≥ 0.95 × target), **or** the cell's non-provisional threshold estimate is ≥ 0.95 × target (H2 §1.9). Q8 decides whether it widens (§19).
- **How E reaches the qualifying tempi (N1).** H2 §1.9 plays an unpassed item's cold check at max(staircase, 0.95 × target) **once `cleanBpm` ≥ 0.95 × target**. Under a hold, **plain straight takes** raise `cleanBpm` only up to the cap (E + 1 mark). Three kinds of take still raise it as with the feature off: the exempt takes (cold checks, FSRS probes, placement, level test, submissions all go through `applyTake`), and the pass-evidence attempts, which **add** takes at target. Fingering takes never raise it (§9.8). So E, and the reports that move E, decide **when** the pass-probe branch opens, together with those takes. A "slipped" can delay it. An OK can bring it forward. **No report value is ever itself used as a qualifying tempo** (G16 b). Whether the branch can open **before** the feature-off arm is a distributional question, because the attempts add jumps to target: G16 (a) bounds it for the v4 rule, and Q8's options are judged on it (§19).
- **The remaining delay, stated honestly:**
  - **`preTop` cells.** The cold half is unchanged: their `cleanBpm` had already opened the branch. The warm half gets at most 2 attempts a session instead of several, so it needs about 3 / (1 − (1 − p)²) sessions, where p is the clean rate at 0.95–1.0 × target: about 4 sessions at p = 0.5, about 3.3 at p = 0.7 (feature off: often 2). The cold half needs about 3 days of its own and often hides the gap. **The expected delay is about 1 practice day at p ≥ 0.6, and more at lower p.** G3 measures it.
  - **Cells that had not reached the probe band: both halves of the pass wait** (v2 said only the warm half did). The warm half needs a clean straight take in the probe band, which only the pass-evidence take can give, and that waits for the threshold estimate (or, under Q8, the cap) to reach the band. The cold half's counting cold checks need the pass-probe branch (`cleanBpm` ≥ 0.95 × target) and a day later than the target was first reached. **Both wait until the cap or the cold staircase reaches the probe band, or until retirement.** On MIDI, E rises by up to 1 mark a day on clean top takes even without answers (§9.4, N6), so in the clean case the wait is roughly the number of marks from the cap to the probe band, in practice days. On mic it needs reports, and §11.5 ends a silent hold. **This is a real delay of the pass, and so possibly of rank.** It is the price of not rehearsing the slip above the edge (RF2 §8.2). Owner question **Q8**.
- **G3 is a harness simulation that must run before F6** (§17, §18): seeded learners over 28 days, fingering on and off, at clean rates **p = 0.5 and 0.7**, for `preTop` and non-`preTop` cells, under the v4 rule and both Q8 options, **with realistic visit frequencies per planner** and the attempts in every session in which the held cell is played (M2). It reports P(pass by day N) for every combination. **The bound:** for `preTop` cells at p ≥ 0.6, the median pass delay ≤ 1 practice day. Every other case is reported, not bounded. The owner decides Q8 on these numbers.
- **`!` sessions:** the cap still applies (Q3, decided). The take line and the teacher digest say "Held at ♩116 while the fingering settles." The teacher has an explicit **"Don't hold"** switch on the assignment, which lifts R2 for that assignment's sessions.

#### 9.2.4 When the cap moves
- With E (§9.4). A rise applies from the cell's next visit, never inside the visit that raised it.
- **Lifted** at retirement, at "Stop fingering work", by the teacher's "Don't hold" switch, at the silent timeout (§11.5), or when the fingering changes (R3).

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
- **Hand unknown on an HT take:** the slip applies to the flagged hand; if both or neither are flagged, to both.
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
- **The rule.** A take of kind `fingering` (A, B, C at P1–P3, G, drums O) is applied to its own pseudo item **`<itemId>~fg`** (the SP §16.4 pattern for `<item>~feel`): `applyTake` runs on `stateOf('<itemId>~fg')`, never on the item's `st0`. On the **main item** it writes only:
  - `activeMs` (practice-time XP, `drillTakeMs`, §14.1);
  - `lastSound` (H2 §1.4: fingering takes are sounding takes, §9.1).
- **Never written by a fingering take**, on the main item: `cleanBpm`, `passLog`, `goalBpm` and the goal streak, `history`, `channels`, the SP §1 session tempo, KS2 stage counters (`stepTakes`, `almost`, the limit, reopen and WAVE state, `STEP_TAKES`, `ALMOSTS_BACK`), the challenge `ceil`, plateau state, the "today's best" display (`newBestOf`), and result XP (`drillXp` is replaced by practice-time XP only). `drillEvents` for goals and streaks are not emitted.
- **The `~fg` record** carries the fingering ladders' own state: one feel group per structure, **`positions`** (B, §5.2), **`pause`** (C) and **`cell`** (G), each with its own session tempo, peak and limit, never shared with the item's groups. Nothing reads its `cleanBpm` or `passLog`: not passes, rank, the staircase, the threshold estimate, readiness or H10's working edge. It never appears in lists, the path, the matrix or rank's exercise count, and it has no D1.
- **Straight takes stay on the item:** P0, the straight ladder, the closing and the pass-evidence attempts are ordinary takes and go through the normal path.
- Checked by **G24**; G16 (b) also asserts that no fingering take's tempo reaches `cleanBpm`.

---

## 10. Blocks on a new key's first appearance (O7)
- **When:** the first appearance of a scale rung in a key in the key session, before A-1/A-2.
- **What:** one Blocks take (A) per hand at comfort, kind `fingering`, RH then LH. With own fingering, the blocks follow it.
- **Skipped when:**
  - the probe marks A-1/A-2 passed (KS2 U2/D2; D4's probe in a new key);
  - A-1/A-2 were passed before in this key;
  - the setup is on mic;
  - expected fingering is missing at any crossing of the line;
  - the session is `!` (unless pinned).
- **Order:** the probe (A-3) runs first. Only a missed probe, or no probe, leads to the blocks, then A-1.
- **Counts toward nothing:** not D1, not a coordination pass, not cold. It may come first in the cell (§9.1).
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
- **The frozen reference.** At flag time (any source) F3 freezes in the synced flag record (`FlagStat.ref`, §15.1) the flagged group's R_g per 1.25× tempo band, **from T1-eligible rows only** (§3.1: straight, full click, clean or almost; failed takes excluded): `{lo, mean, sd, n}` for each band with n ≥ 5, at most 6 bands. **Bands are anchored at the lowest eligible row's mark and half-open**: [lo · 1.25^k, lo · 1.25^(k+1)).
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
- **Retired** when every flagged hand has confirmations on **2 distinct days** (≥ 8 h apart, different local days; H2 §1.6 "later day"), with no slipped on that hand between them: **only confirmations after the hand's `lastSlipAt` count** (strict, like H9's reset). `lastSlipAt` is synced, so a slip on one device clears the other device's earlier confirmations on merge (minor). Then R2 is lifted, visits stop, and `recheckDue` = +7 days.
- **Rechecks at speed:**
  - The recheck is the first cold check **at ≥ G** on or after `recheckDue`. Touch point 1 asks, with the §11.3 check.
  - Touch point 2 also fires once on the first climb that passes E0 after retirement.
  - A T1 or T2 fire during the recheck period brings the next recheck forward to the next cold check at ≥ G.
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
- **After 10 silent days** (that question unanswered too), **the hold ends by itself:** state `done`, `stoppedAt`, `stopWhy: 'silent'`. R2 lifts at once. The item page says "Fingering hold ended: no answers". Settings → "Offer again" undoes it (§14.6). T1 and T2 keep running, and a later fire is offered as usual.
- Any answered window or slip mark resets the count.
- A cell without a hold (§9.2.0) has nothing to lift; its visits end with the assignment or at "Stop".

---

## 12. Drums: orchestrated stickings (O9, S9)

### 12.1 The idea
On an e-kit the MIDI carries the pad, not the hand. **Orchestration** plays each hand on its own voice, so the pad proves the hand (RF2 §10). The owner tests on an e-kit over MIDI.

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
- **The drum per-note log** (F9): drums get `nl` with `h` = expected hand, `e` = expected voice note, `p` = played voice note − expected, `d`, `v`, `o` = null, `x` = **`h`** (a new class char: hand-change site) or `.`, and `f` = `R`/`L` characters. The `NoteLog` type documents both meanings of `f` (digit for piano, hand letter for drums).
- **Triggers:**
  - D-T1: orchestrated takes with a crosstalk-safe wrong-pad stroke at the same site, in ≥ 2 takes within 7 days in one 1.25× band;
  - D-T2: the T1 split test on plain (one-surface) takes, on the site strokes' residuals;
  - D-T3: a report.
- **The orchestrated edge** = the highest clean orchestrated tempo on 2 distinct days. **The plain cap while retraining** = max(orchestrated edge + 2 marks, the D-T2 plain edge). The 2 marks allow for travel between two surfaces, which under-reads one-surface ability (S9). **A D-T3 flag before any orchestrated edge exists** starts E from the report (one mark below the slipped tempo), as on piano (minor). The hold rule (§9.2.0) applies as on piano.
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
- **XP:** fingering takes earn the practice-time XP every take earns from its active time (`drillTakeMs`), and nothing per result or report: `drillXp(m)` is not called for them (§9.8, M1).
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
| Day-1 block | One fingering, slow first. We'll shrink the pause before each hand-position change. | אצבוע אחד, קודם לאט. נקצר את העצירה לפני כל מעבר מנח יד. |
| First report on this keyboard | Press your highest key, then your lowest. | לחצו על הקליד הכי גבוה, ואז על הכי נמוך. |
| Slip mark (first in-scope cell; M4, minor) | Fingering slipped? Press your lowest key twice after the take. | האצבוע לא יצא נכון? לחצו פעמיים על הקליד הכי נמוך אחרי הנגינה. |
| Slip mark, no keyboard range yet | First, press your highest key, then your lowest. | קודם, לחצו על הקליד הכי גבוה, ואז על הכי נמוך. |
| Slip mark, mic or no zones | Fingering slipped? Use "My fingering slipped" in the menu. | האצבוע לא יצא נכון? בתפריט: "האצבוע שלי לא יצא נכון". |
| Retrain this fingering (manual start) | One fingering, slow first. If it slips, press your lowest key twice after the take. | אצבוע אחד, קודם לאט. אם הוא לא יוצא נכון, לחצו פעמיים על הקליד הכי נמוך אחרי הנגינה. |
| Blocks (A) | Each hand position as one chord: you'll see where the hand moves. | כל מנח יד כאקורד אחד: תראו איפה היד זזה. |
| Position rhythm (B) | Make the last note of each hand position long. | הצליל האחרון בכל מנח יד: ארוך. |
| Vanishing pause (C) | Hold before each hand-position change and place the hand. | החזיקו לפני כל מעבר מנח יד והניחו את היד. |
| Cell (G) | Just the change, in short bursts. | רק המעבר, בפרצים קצרים. |
| Drums, orchestrated (O) | Right hand on the floor tom, left on the snare. | יד ימין על הטום הרצפתי, שמאל על הסנר. |

### 14.4 Lines (one line each; matter-of-fact; no emoji)
| Moment | en | he |
|---|---|---|
| Report prompt | Fingering OK? Top key = yes · bottom key = no. | האצבוע תקין? קליד עליון = כן · קליד תחתון = לא. |
| Report prompt, pedal only (range not learned, or empty zones) | Fingering OK? Tap the pedal for yes. | האצבוע תקין? הקשה על הדוושה = כן. |
| Report prompt, tap fallback | Fingering OK? ✓ · ✗ | האצבוע תקין? ✓ · ✗ |
| Report prompt, with a place | Way down at F♯: fingering OK? | בירידה, ב-F♯: האצבוע תקין? |
| Hand question (HT) | Which hand? Bottom key = left · top key = right. | איזו יד? קליד תחתון = שמאל · קליד עליון = ימין. |
| Spot check | Way down at F♯ it caught. Fingering OK there? | בירידה ב-F♯ זה נתקע. האצבוע שם תקין? |
| Reminder | Top or bottom key after the take; or let it be. | קליד עליון או תחתון אחרי הנגינה; או לוותר. |
| Slip mark, end-line clause | Noted: left hand slipped in D major. | נרשם: האצבוע ביד שמאל ברה מז'ור לא יצא נכון. |
| Slip mark, undo | Undo | ביטול |
| Item menu, slip mark | My fingering slipped | האצבוע שלי לא יצא נכון |
| Silent hold, question | Keep the fingering hold on D major? Yes · Stop | להמשיך לעצור את הטמפו בגלל האצבוע ברה מז'ור? כן · להפסיק |
| Silent hold, ended | Fingering hold ended: no answers. | העצירה בגלל האצבוע הסתיימה: אין תשובות. |
| Settings button (device) | Learn keyboard range | ללמוד את טווח המקלדת |
| Item page, no hold | Fingering visits · no hold | ביקורי אצבוע · בלי עצירה |
| Offer | Above ♩100, your left hand's way down in D major changes. A fingering block next time? | הירידה של יד שמאל ברה מז'ור משתנה מעל ♩100. בלוק אצבוע בפעם הבאה? |
| Offer buttons | Yes · Not now | כן · לא עכשיו |
| Plan check, wrong | The holds fell on E and B. The hand positions end on F♯ and C♯. Once more. | העצירות נפלו על E ועל B. מנחי היד נגמרים ב-F♯ וב-C♯. עוד פעם. |
| Plan check, second miss | Your hand positions end elsewhere. Mark your own fingering? | מנחי היד שלך נגמרים במקום אחר. לסמן אצבוע משלך? |
| Rhythm map miss | Long on E; the hand position ends on F♯. | ארוך על E; מנח היד נגמר ב-F♯. |
| Block end | Left hand holds to ♩116. Next: the hold, down to a quarter beat. | יד שמאל מחזיקה עד ♩116. הבא: העצירה, עד רבע פעמה. |
| End-line clause | Left hand, way down at F♯: hold down to a quarter beat. | יד שמאל, בירידה ב-F♯: עצירה עד רבע פעמה. |
| R2 hold | Held at ♩116 while the fingering settles. | נשאר ב-♩116 עד שהאצבוע מתייצב. |
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
| Settings row, no hold | no hold | בלי עצירה |
| Settings row button | End | לסיים |
| Settings empty | No fingering work right now. | אין עבודת אצבוע כרגע. |
| Teacher switch | Don't hold the tempo for fingering | לא לעצור את הטמפו בגלל אצבוע |

- **Terms:** "אצבוע" for fingering; **"מנח יד"** for hand position, never bare "מנח"/"מנחים", which collides with "צלילים מנחים" (guide tones). The chip is **"מנחי יד"**. Bursts are **"פרצים"** (the app's majority form; `התפרצויות` is replaced where it occurs).
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
     - Off = no offers at all, the t ≥ 5 exception included.
     - T1 and T2 keep computing silently, and T3 still records the slip as data.
     - Cells already in retraining continue until ended (the list below).
  2. **Small button: "Offer again"**, shown when any hand is snoozed or declined, or a cell was stopped (by "Stop", "End" or the silent timeout, §11.5) in the last 60 days. It:
     - turns `fingeringOffer` on;
     - clears every hand's `snoozeUntil` and `declines`;
     - returns cells stopped in the last 60 days, by "Stop fingering work", "End" or the silent timeout (§11.5), to `flagged` if they still have a flag, otherwise to no state (minor: now matches the hint and G19).

     Nothing restarts by itself: the next offer still waits for Yes (Q7, decided).
  3. **List: "In retraining now"**, one row per cell in `retraining`, plus `retired` cells with a recheck pending (marked "recheck").
     - Each row shows the item title in its key, the hand(s), and the edge ("♩116 · your report", or "· from your playing" when E did not come from a report), or "no hold" for a cell without a hold (§9.2.0).
  4. **Small button: "Learn keyboard range"** (device; MIDI only): the two-press range step of §8.3, so the slip mark's double press works before any report (§3.4).
     - A small **"End"** button on each row does "Stop fingering work" for that cell and lifts R2 at once.
     - An empty list shows one muted line: "No fingering work right now."
- **Sync rule (decided):** `fingeringOffer`, the snoozes, the stops and the list are **synced per account**. They are practice preferences and progress, the same on every device. Two fingering preferences stay **on the device**, because they depend on the hardware: "Answer by voice" (`fingeringVoice`) and the learned key zones (`fgZones`) (device-settings rule). "Answer by voice" sits in this card too, labelled "this device".
- **Copy:** the Settings rows in §14.4.

---

## 15. Data model

### 15.1 Synced progress: `fingering` (under the fresh-start epoch), keyed by `cellKey`
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
  pe?: { day: string; n: number; clean: boolean };    // pass-evidence attempts today (§9.2.3)
  quiet?: { days: number; lastDay?: string; asked?: boolean; upd: string };  // asked-and-unanswered days (§11.5, M3)
  dontHold?: string[];                                // assignment ids with the teacher's switch
  stoppedAt?: string; stopWhy?: 'player' | 'silent'; // "Stop fingering work", Settings "End", or §11.5; reversible for 60 days (§14.6)
}
type FingerStore = Record<string /* cellKey */, FingerCell>;
```
- **Merge (S6):** per cell, `state` by the newest `stateUpd`; each hand by its newest `upd`; `confirms` is the union by (hand, day); `failedRechecks` and `declines` by max; `asked` by the newest day, OR-ing the flags of the same day. A merge that brings two confirmations closer than 8 h keeps only the earlier (H2 §1.4 cross-device rule). `lastSlipAt` by max, after which confirmations older than it are dropped; `hold` by `holdUpd` and `quiet` by its own `upd` (both change without a state change; minor); `FlagStat.ref` and `refCold` travel with their flag.
- R2 and the planners read it. Rank, passes, the staircase, XP and history never read it (G1, G16).

### 15.2 Device only
- `fingerEvidence` (§2.3).
- `fgZones[midiInputName] = { top, bottom, octave }` (§8.3), never synced.
- `fgDay = { day, unanswered, asked: number, offers: …, … }` (§8.2, §16).
- The voice switch `fingeringVoice` (a device preference, §14.6).

### 15.3 Settings
- **Synced:** `fingeringOffer: boolean` (default true). The Settings card's "Offer again" and "End" write the synced `fingering` store, never a device key.
- **Device:** `fingeringVoice: boolean` (default false) in the device profile, and `fgZones`.

### 15.4 Take kinds and traces
- `TakeKind` gains **`fingering`**: all false.
- **Trace v4 (F1b):** `fs`, `vr`, `cell`, `xs`, `to` (§2.2), and on takes with fingering content:
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
- **The re-fit list,** with the owner, before the offer turns on: the thresholds (20 ms, 8 %, t 3, 30 ms, 3.5 SD), the §11.3 "no break, no worse than flagged" check and its cold reference (N3, M6), and whether boundary crossings (§1.3) join R_g (tested here as a separate group).
- RF2 §7's three questions (does structure H flag reported slips; do velocity bumps fall at slips; at what pause length the map breaks) are answered from the same data.
- The camera stays a later spike (RF1 §4, RF2 §4).

---

## 17. Build steps

| Step | Content | Size |
|---|---|---|
| F1 | **Done (0.145.16):** the per-note log, trace v3, the device trim, tests. | S |
| **F1b** | **Trace v4:** `fs`, `vr`, `cell`, `xs` (residuals by the trace's own rule, `sdl`, break flag, `bd`, per-site `[pc, r]`), `to`, `cd`; `NOTE_LOG_MAX` 120; the `fingerEvidence` store with its retention. Tests: residuals equal the trace rule; wrong-key notes excluded; thinned and feel takes excluded; a 4-octave HT scale logs whole; retention ≥ 21 days at 200 takes a day. | S–M |
| F2 | **Report input:** the window (decay, 3 s, verdict first), zones learned per input (octave-aware), the HT second press (after "slipped" only), pedal, keys, foot switch and page turner, optional voice, the any-time slip mark with Undo, prompts that name only working inputs, the count-in hold, one question per take, reminder and fatigue across cells. `fg` on traces. | M |
| F3 | **Flags:** T1, T2, T3 (pure `fingerFlags.ts`), per cell and hand, guards, snoozes, the frozen warm and cold references (T1-eligible rows, anchored half-open bands). **Shadow mode with in-band neutral labels and controls** (§16.2), the precision analysis, then the gate with the owner. | S–M |
| F4 | **Structures:** `positionBlocks`, `positionRhythm`, `pauseAtCrossings` (whole-twelfth rungs, lengthened notes, the subdivided click, segment grading), `crossingCell`; grading. Tests in 12 keys, both hands, own fingering. | M |
| F5 | **The ladder and the block:** `fingerLadder.ts` (rungs, rung memory, drop-back one mark slower, the verification floor, plan check, T_C/T_S, the straight ladder with distinct tempi, E rules incl. the daily limits and the no-answer rise) and the block composer with its budget. A 3-day simulation. | M |
| F6 | **Integration** (after the G3 simulation and the owner's Q8 decision): **the `<item>~fg` path, so fingering takes write only `activeMs` and `lastSound` on the item (§9.8, G24)**; the pass-evidence attempts in every planner and visit kind; the key session (block, visits, the variants-only cap visit, "held" vs limit, A-7 on `passedAt`, new-key blocks), the old coach and assignments (mirror, pin without a hold, `!`, "Don't hold"), R1 in every planner, the hold rule and R2 in every climb, the pass-evidence take (2 attempts), challenge takes off, H10 at effective difficulty with held cells apart. SP rotation hooks behind its own build. SP §16.7 and H2 §1.7a amendment entries. | M–L |
| F7 | **Across days:** confirmations with the "no break, no worse than flagged" check (warm and cold references), `lastSlipAt`, retirement, rechecks at ≥ G, relapse, the mic report-only path, the silent-hold question and timeout on asked-and-unanswered days, the slip path per state, breaks, the `fingering` store with its merge. | S–M |
| F8 | **UI and copy:** chip, report line, offer, item page, **the Fingering coach card in Settings → Learning (§14.6: switch, "Offer again", the retraining list with End, the device voice switch)**, briefs, the teacher switch; he + en; `speakable` for ♩ and ♯; screenshots at 320/390 widths; the contrast sweep. | S–M |
| F9 | **Drums:** the drum `nl`, `orchestrate`, the crosstalk-safe wrong pad, orchestrated takes in the feel pool, the drum flags, cap and report. | M |
| F10 | **Harness and review:** independent review rounds until clean before F1b (owner rules); G1 and G16 at planner level with seeded learners; **the G3 simulation (p = 0.5 and 0.7, on vs off, both cell groups, both Q8 options) before F6**, its numbers shown to the owner for Q8. | — |
| F11 (later) | Arpeggios, with the held-key constraint (RF2 §3 F). | M |
| Later | Structure H offline on labelled logs (RF2 §12.4); accent feel D (Q6) after the thumb-bump test on `nl.v`; the camera spike. | L |

Order: F10 review → F1b → F3 shadow (it needs F1b and F2's top-take label question) → F2 rest → F4 → F5 → **G3 simulation → owner decides Q8** → F6 → F7 → F8 → F9. `npx tsc -b` before every commit.

---

## 18. Guard tests

| # | Test |
|---|---|
| G1 | **Honesty (planner level):** seeded learners over 28 days with reports scripted to lie OK at every touch point vs honest vs no reports vs random slip marks. The learner's skill trajectory is the same in both arms (the model gives fingering takes no extra skill), so differences come from the planner only. Passes, rank, cold results, staircase, threshold estimate, Momentum, XP beyond practice time and history never exceed, or come before, the feature-off baseline (§9.6). |
| G2 | **R1:** in every planner, no `fingering` take precedes the cell's main-item cold check on a cold day; new-key blocks are the only exception, on a first appearance. |
| G3 | **R2 vs passes: a harness simulation that runs before F6** (N2, M2). Seeded learners over 28 days, fingering on and off, at clean rates **p = 0.5 and 0.7** at 0.95–1.0 × target, for `preTop` and non-`preTop` cells, under the v4 rule and Q8 options (a) and (b), **with realistic visit frequencies per planner** (key session, rotation, old coach) and the pass-evidence attempts in every session in which the held cell is played. It reports P(pass by day N) for every combination, and the numbers go to the owner for Q8. **Bound:** for `preTop` cells at p ≥ 0.6, the median pass delay ≤ 1 practice day; every other case is reported, not bounded. Also: plain straight takes never exceed the cap outside the exemptions and the pass-evidence attempts (≤ 2 per session, stopping at the first clean one, never two at one tempo); a missed attempt never sets a KS2 limit or consumes `STEP_TAKES`/`ALMOSTS_BACK`. |
| G4 | **Develops (N7):** in the 3-day simulation (MIDI and mic), **in every block and visit**, no two takes of one cell have the same structure, rung and tempo, except one "almost" hold; no straight take repeats a tempo already played straight in the visit or block (P0, the closing, the cap visit and the pass-evidence attempts included). Each clean straight take below the ceiling is followed by one a mark faster. At the cap, clean takes are followed by variants that rise. P0 is an ordinary straight take with no `vr` and is counted. |
| G5 | **Per key (fixture only, N4):** on the owner's five-key class means (`takeTrace` `xu`/`xo`, which equal R_g for the suggested fingering, §1.3), T1 fires on **D at ♩100** (edge ♩96) and nowhere else; a constant early lean in E♭ flags nothing; an injected shift in one key flags only that key. |
| G5b | **Per key from per-note logs** (once v3/v4 traces reach the server): recompute `xs` and T1 from `nl` with the §1.3 class array (boundary crossings excluded) and check the result against G5's class-mean result; report any difference before F3 leaves shadow mode. |
| G6 | **Structures in 12 keys:** every major and minor scale, both hands, 1–4 octaves: `pauseAtCrossings` lengthens exactly the notes before the crossings by whole twelfths; `positionBlocks` groups match the fingering; own fingering moves both; no crossing where the expected finger is missing. |
| G7 | **Verification:** B passes the correct long-note set and names a misplaced one; C detects a pause one note early, and grades segments without cumulative offset; A fails a roll > 40 ms and an extra note. |
| G8 | **Report grammar:** no MIDI answers before the range is learned; zones after the octave shift; reset on a shift change; empty zones fall back; the HT second press; pedal < 600 ms; zone notes never start a take; a non-zone note closes as no answer; the verdict is shown before the report line; one question per take with H2 §7. |
| G9 | **Input source:** mic takes have no `nl`/`xs`; mic C moves the ladder only on HS onset placement; `nc` takes move nothing; a mid-take MIDI loss leaves the state unchanged; A and B never on mic. |
| G10 | **Retirement (M6, not self-referential):** OK alone with a break take never retires a MIDI player; two clean confirmed cold days at ≥ G retire; a slip between resets, also when it happened on another device (`lastSlipAt` on merge); rechecks only at ≥ G; a recheck slip → retraining without a block, a second → a block; mic retires by report only and is labelled. **The check, on fixtures held out from the reference:** the reference is built only from T1-eligible rows (adding failed takes to the evidence leaves `ref` unchanged); bands are anchored at the lowest eligible mark, half-open; on the recomputed D-major rows (♩125–156: n 14, mean +4.4, SD 10.5) a warm take at +14.0 ms passes and one at +16.0 ms fails, and a take with a break fails at any R_g; **a cold case:** a cold confirmation in a band with < 5 cold rows gets the break check only, and with ≥ 5 cold rows (cold mean +20, SD 8) a cold take at +25 ms passes against `refCold` where the warm `ref` would fail it; the reference survives 60 days and a second device. |
| G11 | **Signatures:** an `fsOwn` change resets; an `fsSug` change keeps E, the confirmations and the state, and drops older evidence from T1/T2. |
| G12 | **Mirror:** one scripted player through `keyCoach` and `coach.ts` assignments gets the same R1, R2, hold, cap-visit and eligibility decisions, and **the same pass-evidence attempts in every session in which the held cell is played** (M2), including the old coach, the linear path and short sessions. **A teacher pin or manual start without a flag or a reported slip never holds** (N8): the plain climb, `cleanBpm` and the pass are identical to the feature-off run; a later slip adds the hold. |
| G13 | **Drums:** orchestration maps each stroke's hand to its voice; a crosstalk hit with the expected pad also struck is not a slip; a substitution is; orchestrated takes appear in the pool before any flag; the plain cap is max(orchestrated edge + 2 marks, plain edge). |
| G14 | **Copy:** every line in he and en; `speakable` reads "♩116" and "F♯"; no bare "מנח"/"מנחים". |
| G15 | **F1 (exists):** `tests/noteLog.test.ts`. |
| G16 | **Reports and qualifying tempi, two properties (N1, minor).** **(a) No report raises any qualifying tempo above the feature-off baseline**, tested on **paired seeds with common random numbers** (each learner's take outcomes drawn from one stream indexed by day, tempo band and take ordinal, the same in both arms) over ≥ 2000 learners and 28 days: for any report script (lying OK at every touch point included), P_on(pass-probe branch open by day N) ≤ P_off(open by day N) + ε, ε = 0.02, for every N, under the v4 rule; every qualifying take (cold check, confirmation, pass probe, FSRS review probe) is chosen by the same H2 §1.9 function of (`cleanBpm`, staircase, pass state) as with fingering off. Under Q8 (a) and (b) the attempts can open the branch earlier; the excess is reported for the owner, not bounded. **(b) No report value is ever used as a qualifying tempo:** that function has no report, E, cap, rung or G input (a property test: any E and any reports give the identical tempo for identical H2 inputs); no report's tempo is written into `cleanBpm`, the staircase or the threshold estimate; and **no fingering take's tempo reaches `cleanBpm`** (§9.8). After a pass-probe take the staircase resets to the tempo played (H2 §1.9). |
| G17 | **Key session at the cap:** a cap hit never sets "limit", never consumes reopen or six-take budgets; A-6 shows "held"; A-7 opens on `passedAt`; no closing straight take repeats the cap; one OK raises E by ≤ 1 mark, ≤ 2 when the take passes the §11.3 check, and the day's total rise is ≤ 2 marks. |
| G18 | **Evidence retention:** after 25 days at the owner's take rate, T1 sees ≥ 21 days of rows for a cell, independent of the 500-trace `nl` trim. |
| G19 | **The Settings card (§14.6):** the switch off suppresses every offer (T1, T2, T3, and the t ≥ 5 exception) while retraining cells continue. "Offer again" turns offers on, clears all snoozes and declines, and returns cells stopped ≤ 60 days ago to `flagged` (when they have a flag) without starting any visit. The list shows exactly the `retraining` cells plus pending rechecks. "End" equals "Stop fingering work" (R2 lifted on the next take). `fingeringOffer` and the store sync across two devices; `fingeringVoice` and `fgZones` do not. The he and en strings exist. The card renders at 320/390 px in the existing switch style. A cell without a hold shows "no hold". "Offer again" also undoes a silent-timeout stop. |
| G20 | **Silence (N6, M3):** a scripted MIDI player who never answers and plays clean top takes that pass the §11.3 check sees E rise 1 mark a day. Only days with ≥ 1 window shown for the cell and none answered count: a cooperative player with no window for 10 days keeps the hold and is never told "no answers". After 5 silent days the keep-hold question appears once, ahead of any offer, as the session's only end-line question; after 10 the hold ends (`stopWhy: 'silent'`), R2 lifts, and nothing is ever capped for good. An answer at any point resets the count. |
| G21 | **The slip mark (N6, M4):** a bottom-zone double press within 1 s, ←/↓/PageUp, "לא" with voice on, or the item menu after a straight take flags the cell (T3) with the take's tempo; a single bottom-zone press does nothing; one per cell per day; Undo removes it; works on mic through the menu; the first-use brief learns the keyboard range; zone notes in a hands-free countdown start nothing and are not count-in input; the drum gesture is the ride bell or two kicks 80–400 ms apart. **Per state (§3.4 table):** on no state, `flagged` or `done` it flags with no hold, gives visits for 7 days and an offer, and the visits stop after 7 days without Yes; Yes → block → retraining with the hold; on `retraining` without a hold it adds the hold; it never caps a cell that has not been through Yes, a manual start or a pin. |
| G22 | **H10 with held cells (N9):** C, B and G count at effective tempo (a P1 take at cap + 3 marks counts below the cap); held cells are excluded from the flat-rank slope while held and reported apart; a held cell's effective difficulty rises across visits in the 3-day simulation. |
| G23 | **Shadow analysis (N5, M7):** on synthetic labels, the precision and control-rate formulas of §16.2 give the expected values; labels outside the flag band, T2 "confirmations" and touch point 1 answers are not counted; at most one control unit per (cell, hand) per 14 days; the gate fails below 10 units, below 2 × the control rate, or when P(p_flag > p_control) < 0.95 under Beta(1, 1) posteriors (5/10 vs 2/10 fails, 6/10 vs 1/10 passes); shadow questions never name a place and no spot check fires in shadow. |
| G24 | **Fingering takes are isolated (M1):** for every structure (A, B, C at P1–P3, G, drums O), clean and failed, at tempi below, at and above target: the main item's `cleanBpm`, `passLog`, `goalBpm` and streak, `history`, `channels`, session tempo, KS2 counters (`stepTakes`, `almost`, limit, reopen, WAVE), challenge `ceil`, plateau state and "today's best" are unchanged; only `activeMs` and `lastSound` change; no `drillXp` result XP is granted; the take lands on `<itemId>~fg`, whose state nothing in passes, rank, the staircase, readiness or H10 reads. P0, the straight ladder and the pass-evidence attempts do change the item as ordinary takes. |

---

## 19. Questions: Q1–Q7 decided (owner 2026-11-28), Q8 and Q9 open

| # | Question | Decision (the review's default, accepted by the owner 2026-11-28) |
|---|---|---|
| Q1 (decided) | The fourth rung | **Drop P4:** 1 beat → ½ → ¼ → none. ⅛ beat is off the 1/12 grid and below the verification floor at most tempi. If a fourth step is wanted later: ⅙ beat (2 twelfths). |
| Q2 (decided) | Drum report gesture | **Crash = OK; two kicks 80–400 ms apart = slipped**, or the ride bell if the kit maps it. Never the hi-hat foot. |
| Q3 (decided) | R2 in `!` sessions | **The cap holds in `!`** (submission targets are already exempt), shown in the teacher digest, with an explicit teacher **"Don't hold"** switch on the assignment. |
| Q4 (decided) | Snooze after "Not now" | **14 days; 28 days after a second decline** of the same cell and hand. A self-reported slip ends a snooze. |
| Q5 (decided) | The cold take at G | **Accepted with the S2 fixes, which make the override unnecessary:** G = 0.95 × target from the catalogue; confirmations and rechecks use the probe-band cold takes H2 §1.9 already plays; no report or E reaches a qualifying tempo (G16). |
| Q6 (decided) | Accent the position start (D) | **Not in v1.** Test the thumb-bump hypothesis on `nl.v` with labelled slips first; add later as a rate-keeping feel. |
| Q7 (decided) | Visits without an offer | **No auto-start.** A strong T1 flag (t ≥ 5) may be offered once inside a snooze, and still waits for Yes. |
| **Q8 (open)** | **Where may the pass-evidence take run?** (§9.2.3) | **The problem (N1):** for held cells whose climb had not reached the probe band before retraining, **both halves** of the pass wait until the cap or the cold staircase reaches the band, or until retirement. N6 bounds this on MIDI in the clean case (E rises about 1 mark a clean day), but the delay can still be weeks, and it can delay rank. O5 was approved on the premise "rank and passes are never affected". Today (v4 rule) the take runs only for `preTop` cells or once the threshold estimate is in the band, and since M2 it runs in **every** session in which a held cell is played. Two options; **no default until the G3 numbers exist** (p = 0.5 and 0.7, on vs off, shown to the owner before F6). **(a) The reviewer's: the take also runs once the cap is within 2 marks of the probe band.** *For:* the extra straight takes sit at most about 3 marks above the edge, where the rehearsal risk is small, and the long tail of the delay is cut. *Against:* a cell far below the band still waits for E to climb (on MIDI about 1 mark a clean day; on mic only by report), so some delay remains, and O5 holds only approximately. **(b) The take runs in every held cell from the start.** *For:* honours O5: no pass delay beyond the clean-rate effect of 2 attempts a session; the simplest rule; a clean attempt sets `cleanBpm` in the band and opens the cold half at once. *Against:* each attempt is a **planned jump to target that counts toward the warm half**, while H2 §1.6 excludes challenge takes (also jumps) from counting, so **(b) needs an explicit H2 amendment entry**; it rehearses above the edge in every session (RF2 §8.2), possibly many marks above it; for a cell far below target the attempts mostly fail, about 2 takes a session for nothing; and it can open the pass-probe branch before the feature-off arm (G16 a reports the excess). **The round-3 reviewer recommends (a) together with M2**, then G3 to the owner; if the owner holds O5 literally, (b) with the H2 entry, allowing **one** attempt only while the cap is more than 3 marks below the band. Either option keeps the G16 (a) wording (paired seeds, ε bound). |
| **Q9 (open, small)** | **Pause rungs for triplet items** (§5.3) | Q1 set ½ and ¼ beat, which put triplet items' following notes off the click. **Proposal:** for triplet items P2 = ⅔ beat (8 twelfths) and P3 = ⅓ beat (4 twelfths) with a triplet click; P1 stays 1 beat. Duple items are unchanged. |

---

## 20. Change logs

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

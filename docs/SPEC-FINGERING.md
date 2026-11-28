# SPEC-FINGERING: training correct fingering inside normal practice (v2, 2026-11-28)

**v2** resolves review round 1 (`docs/REVIEW-FINGERING-round1.md`): the 9 substantive issues S1–S9, the UX notes and the minor notes. The change log is §20. The owner accepted the reviewer's defaults for Q1–Q7 on 2026-11-28 (§19, decided) and added one requirement: a fingering-coach setting in Settings (§14.6).

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
| O5 | **R2:** while an item is in retraining, its plain straight climb stops at the reported fingering edge + 1 metronome mark and continues above that only in variants. Rank and passes are never affected. | §9.2. The honest limit of "never affected" is §9.2.3, Q8. |
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
- **Crossing note** = a note whose per-note class is `u` (thumb under, going out) or `o` (3/4 over the thumb, coming back), from the expected fingering with `afterCrossing` (`touch.ts`).
- **Direction** = down when the written pitch is below the previous note of the same hand's line. LH `u` and RH `o` are descents (RF2 §2).
- **Group** = (hand, class, direction), e.g. "LH thumb-under going down". **Site** = (group, pitch class of the crossing note). A site names the place ("at F♯") and recurs per octave.
- **Residual of any note (S5.4, S5.7)**: r_j for every non-edge note j whose played pitch is right (`p === 0`, S5.3) is computed **at trace time with the trace's own rule** (`tendency.ts` `sidePredict`):
  - up to 6 nearest plain played notes of j's run on each side, at **the same place in the beat**, one shared slope;
  - the two sides' residuals must agree in sign, otherwise j has no residual;
  - j itself is excluded from its own reference.
  - Edges: the first 2 notes and the last max(5, 2 × notes per beat) notes of a line (the trace's `EDGE_START`/`EDGE_END`).
- **The hand's local SD** `sdl` = the SD of r_j over the plain notes of the hand in that take. It is not `HandTrace.sd`, which uses a whole-run line fit.
- **Group residual of a take** R_g = the mean r_j over g's crossing notes in the take.

### 1.4 Edges, states, takes
- **Fingering edge** E(cell, hand) = the highest tempo at which the expected fingering is believed to hold. It is kept in **notes per second** (KS2 §3) and shown as ♩ in the note value played (KS2 U9). Its sources are in §9.4.
- **One mark** = SP §1: one Maelzel mark, at least 2 ♩, on the played ♩.
- **Cap** = E + 1 mark (R2, §9.2).
- **Goal** G = 0.95 × the item's target (§11.1).
- **State per cell:** `none` → `flagged` → (`offered` / `declined`) → `retraining` → `retired` → `done`, with rechecks as sub-states of `retired` (§11).
- **Fingering take** = a take played as one of the §5 structures. New `TakeKind` **`fingering`** with the same zeros as `form`: no history, staircase, passes or tendencies. Straight takes inside a fingering visit are ordinary takes of their normal kind.
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
| `xs` | per hand, per group present: `[R_g, n, brk, siteMaxPc, maxAbs]`, plus `sdl` per hand | T1/T2 inputs (§3), tiny |
| `to` | `true` when the take failed on timing only (every matched note `p === 0`, no misses) | T2 includes these (S5.5) |
| `fg` | fingering content and the report (§15.4) | labels, ladder telemetry |

- `click` (the thinned-click marker) already exists and is read as "not full click".
- `NOTE_LOG_MAX` rises to **120**, so a 4-octave hands-together scale (114 notes) logs whole and keeps its descent (minor note).
- **The trace version becomes 4.** v3 traces stay readable. Their `xs` can be recomputed from `nl` with a documented approximation (calibration export only); live triggers read v4 only.

### 2.3 The evidence store (S4)
`nl` is trimmed after 500 traces, which is about 5 days at the owner's rate. That cannot carry a 21-day trigger. So:
- **`fingerEvidence`** (device IndexedDB, separate from the trace list and its trim): per cell, per hand, per group, the eligible takes' rows `{at, nps, R_g, n, brk, site, maxAbs, sdl, verdict, to, fs}` (≈ 40 B each). It keeps the **last 60 rows or 28 days**, whichever holds more, and never less than 21 days.
- Written at trace time from `xs`, for eligible takes only (§3.1).
- **Flags are computed per device** from this store. The flag **result** (state, group, c*, t, Δ) lives in the synced `fingering` store (§15.1), so the offer and the retraining state are shared across devices. The evidence itself is not synced in v1.
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
- **The place named** = the site of g with the largest mean |r| in the upper band.

**Replay (S5.8):** on the owner's D-major class means (RF2 §2), LH `xu` fires at **c\* = ♩100** (Δ ≈ +31 ms, t ≈ 5.9, 100 % on Δ's side), so the MIDI edge is ♩96. D RH `xo`, and C, E♭, G and B♭ stay quiet. The thresholds are provisional until shadow mode (§16.2).

### 3.3 T2: break takes at a crossing
- A take is a **break take** for hand h when its largest |r_j| over all non-edge right-key notes of the hand line falls on a crossing note of group g and is ≥ max(30 ms, 3.5 × `sdl`) (RF1 §3.3).
- Eligible: clean, almost, and timing-only failures (`to`). The owner's clearest break (D ♩124, RH `xo` +96 ms) was a failed take (RF1 §3.2).
- **Fires:** 2 break takes of the same group within 7 days in one 1.25× tempo band. The MIDI edge = one mark below the slower of the two.
- **Strength for offer ranking:** 3 + the number of break takes of g in 21 days (a t-equivalent, minor note).

### 3.4 T3: a report
A "slipped" at any touch point flags the cell and hand at once, with its date (`t3At`).

### 3.5 Guards
- No expected finger at a site: T1/T2 skip it.
- The cell's main item must be **acquired** (SP §1, D1).
- v1 scope only (§1.5).
- **Snooze per hand:** "Not now" snoozes T1/T2 for that cell and hand for 14 days; a second "Not now" on the same cell and hand, 28 days (Q4, decided). T3 always flags and ends a snooze. A T1 flag with t ≥ 5 may be offered once inside a snooze; it still waits for Yes (Q7, decided).
- **After retirement** T1/T2 keep running. A fire during the recheck period brings the next recheck forward (§11.4); it does not re-offer until `done`.
- **Mic setups:** T1/T2 need MIDI. Flags on mic come from T3 or a manual start.

---

## 4. The offer
- **Where:** one clause in the end line of a session (coach, key session, list run) in which the flagged cell was played. Never mid-session, never in the level test, never in a `!` assignment.
  - At most **one offer per session**, ranked T3 first, then by t (T1) or the T2 strength.
  - Off when **Settings → Learning → Fingering coach → "Suggest fingering work"** is off (default on; synced; §14.6).
- **Line:** "Your left hand's way down in D major changes above ♩100. A fingering block next time?" Two small chrome buttons, **Yes** and **Not now**. In hands-free runs the answer keys also work within 6 s (top = yes, bottom = not now). No answer = not now, without the snooze.
- **Yes** → `offered`. The day-1 block replaces that cell's next visit in the next session where it appears; if it is not in today's plan, the planner adds it once.
- **Not now** → `declined` for that hand, snoozed (§3.5).
- **No auto-start (Q7, decided):** visits never start from a data flag alone. R2 restricts the player's climb, so it needs consent.
- **Manual entries (no flag needed):** the item page ("Retrain this fingering", a standalone block now, §6.1), the item menu in a coach run ("Fingering block next"), a teacher pin (§9.5).
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

  Every rung is a whole number of twelfths, on `b`'s grid, for duple and triplet note values alike.
- **Generator** `pauseAtCrossings(drill, hands, rung)`:
  - the note before each crossing of the trained hand(s) gets its **real lengthened value**: e.g. in eighths, P2 makes it a quarter and P3 a dotted eighth. No comma or breath mark: the pause is metered;
  - on hands-together items both hands hold;
  - **the click subdivides** on C takes to the rung's grid (eighths at P2, sixteenths at P3), so every shifted note sits on a click (S3). Count-in and now-cue as usual.
- **Grading (S3):** each segment between pauses is graded for evenness against its own line (the shifted grid is not a reading test). Each pause's length must be within ±max(25 ms, 25 % of p). Wrong notes and misses as usual.
- **Placement verified** when each crossing's IOI ≥ IOI + 0.5 p and every other IOI < IOI + 0.5 p, as long as 0.5 p ≥ max(20 ms, 3 × `sdl`). It is always verifiable at P1–P3 for scales at ≤ 8 nps.
- **Two tempos, defined (S3):**
  - **C tempo** T_C = min(the item's session tempo, cap + 1 mark). Without a session tempo yet, the item's last clean tempo. This is the item's tempo, as O2 and RF2 §9 say.
  - **Straight tempo** T_S = min(the session tempo − 1 mark, cap). P0 is always played at T_S, **never above the cap**.
- **The ladder within a visit or block:**

  | Take result | Next take |
  |---|---|
  | clean, placement verified | the next shorter rung (P2 → P3 → P0); P0 at T_S |
  | clean at P0 | the C sequence is done for this visit |
  | not clean, or placement wrong | the same rung once more; a second failure → one rung longer (P1 stays P1) |
  | two failures at P1 | T_C down one mark, floor the comfort pulse, then ♩40, then free time (KS2 review 3) |
  | "almost" | holds; counts toward nothing (KS2 U3) |

- **Across visits:** the cell remembers per hand the shortest rung cleared last time (`rung`). The next visit starts there, or one rung longer if the last visit failed it. **Tempo progress comes from the item's own session tempo and the cap**, not from the pause ladder, so the ladder always works at the item's tempo.
- **No touch point at P0 (S3).** Slips are reported on the visit's straight take (§7.2).
- **The plan check** (RF1 accepted, once per new item and band): one P1 take when the cell enters retraining, and again when T_C first exceeds 1.25 × the last plan-check tempo. A wrong placement gets one line naming the places, then one repeat. A second wrong placement suggests marking own fingering. Never a grade.
- **Develops (key-session-must-develop):** within a visit every clean take shortens the pause. The visit's tempo is the session tempo, which rises by the normal rules up to the cap.

### 5.4 G: The crossing cell
- **Generator** `crossingCell(drill, site)`: from 2 notes before the crossing to 2 after (Engel 1997: 1–2 keystrokes ahead; RF2 §5). SP §15.4 bursts: the cell, a one-beat rest with the click going on, 4 times.
- **Tempo:** first take at 1.10 × T_C; each clean take +1 mark, up to 1.25 × T_C. After a miss: stop-and-go.
- **Grading:** the `burst` goal. Kind `fingering`. Full click.

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
| 6 | **Closing:** straight takes at T_S, ending on a clean one (end-on-success +2, SP §1); touch point 2 after the top one | 2–3 | T_S |

- About 13–20 takes, 6–8 minutes for a two-octave scale with count-in (RF2 §8.2).
- When the budget runs out, the current take finishes, then step 6 (≥ 2 takes).
- One closing line (§14.4).

### 6.3 After the block
State → `retraining`, `blockDay` = today. Visits from the next day (§7). The block does not repeat unless the fingering changes (R3), the player asks, or a second recheck fails (§11.4).
- **Why mixed and not a daily block:** blocked practice retains worse after first acquisition (Shea & Morgan 1979; RF2 §8.2). Abushanab & Bishara 2013 compared random and fixed order *across melodies*; applying it to "blocked on day 1, spaced later" for one item is **an analogy**.

---

## 7. The fingering visits (from day 2, while retraining)

### 7.1 Eligibility
A cell gets a fingering visit in a session when all hold:
- state `retraining`, or `flagged` with a T3 report in the last 7 days (`t3At`). A data-only flag without Yes gets **no** visits (Q7, decided);
- its main-item cold check of the day is done (R1);
- the session has ≥ 10 minutes;
- **at most 1** fingering visit per cell per session, and at most **2 cells** per session;
- the feel-pool order (SP §16.3): never on consecutive visits of the cell; at least every third visit of the cell straight.

### 7.2 Content (3–4 takes, about 1–1.5 min)
1. **G** on the flagged group's site (kind `fingering`).
2. **C** from the remembered rung at T_C (kind `fingering`). The plan check replaces it when due. **B** replaces C on every third fingering visit (variety; RF2 §5, Bangert 2014: partial support).
3. **One or two straight takes at T_S.** Ordinary takes of their normal kind, counted as usual. The visit ends on a straight take. **Touch point 2** follows the last one if it was clean and it is the cell's top take today (§8.1).

- **Key session:** a fingering visit may replace one speed or review visit of the flagged cell (not the closing, never coordination stages). Budget `VISIT_TAKES` + the end-on-success extension.
- **Old coach, linear path:** the same steps, once per session, after the cell's first clean straight take that is not its cold check.

---

## 8. The report (O4)

### 8.1 The two touch points, per cell, per day
1. **Cold:** after the day's main-item cold check of a cell that is `flagged`, `retraining` or recheck-due, **only when that take is clean**. The habit is strongest cold (RF2 §9).
2. **Top:** after the top take of a climb of a `flagged` or `retraining` cell: the last straight pulsed take of the cell's visit, when clean and at the visit's highest straight tempo. The coach knows this when it decides to leave the visit (limit, target, budget, or the cap). In the block, it is the closing's top take. After retirement it also fires once on the first climb that passes E0 (§11.4).

- Each touch point fires **at most once per cell per day**. No fingering take asks.
- **Shadow mode (S5.9):** on calibration accounts while F3 runs in shadow, touch point 1 also fires on every **shadow-flagged** cell and on a random 1 in 3 of unflagged eligible scale cells, once a day each (§16.2).
- **The question is narrow** (RF2 §6.1): it names the flagged place when there is one.

### 8.2 The window
- **The verdict line comes first** (UX). The report line appears under it once the piano has decayed: no key held and ≥ 0.8 s since the last note-off, or 2 s after the last written onset, whichever comes first.
- **It lasts 3 s.**
- **Hands-free:** the next count-in waits until the window closes or is answered; KS2 D6's countdown starts after that. A note **outside** the answer zones closes the window as no answer and acts as "continue". Notes in the zones never start a take.
- **No answer** = nothing. After 2 unanswered windows in a day (counted **across all cells**, in `fgDay`), one reminder line. After 2 more, no questions that day.

### 8.3 The grammar
| Input | OK | Slipped | Hand (HT takes only) |
|---|---|---|---|
| **MIDI keys** | a key in the **top zone** | a key in the **bottom zone** | a second press within 2 s: bottom zone = left, top zone = right. None = hand unknown (§9.4). |
| **Sustain pedal** (CC64) | full press and release < 600 ms (`pedalInvert` respected) | — | — |
| **Computer keys / foot switch** | Space, PageDown, → | ↓, PageUp | ← left, → right |
| **Voice** (optional; off by default) | "כן" / "yes" | "לא" / "no" | "שמאל" / "left", "ימין" / "right" |
| On-screen tap (fallback) | ✓ | ✗ | L / R |

- **Zones (UX):**
  - **The keyboard's range is learned first.** The report brief's first appearance on a MIDI input asks for one step: "Press your highest key, then your lowest." That sets devTop and devBottom for the input, after the octave shift (`midi.ts` `octave`). They are stored per MIDI input name in the device profile (never synced), and reset when the octave shift changes.
  - **Until both are set, MIDI keys don't answer** (pedal, computer keys, voice, tap do). The defaults 96/36 are never assumed.
  - Top zone = notes ≥ max(the item's highest note + 7, devTop − 5). Bottom zone = notes ≤ min(the item's lowest note − 7, devBottom + 5).
  - If a zone is empty (25-, 37-, 49-key boards with a wide item), MIDI keys don't answer for that item.
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

#### 9.2.1 What it caps
- **Who:** a cell in `retraining`, per flagged hand. The cap is the lowest over the flagged hands.
- **Cap** = E + 1 mark.
- **Capped:** every plain straight take of the cell, on all its items:
  - the key session's speed-stage climb (A-6, B-6), the flow pulse (KS2 D3), D5 targets, the closing;
  - the old coach's climb and over-target climb (SP §2.5);
  - rate-keeping feels (SP §16.4);
  - **challenge takes** (SPEC-CLIMB-SYNC §2) are off for the cell.
- **Allowed above the cap:** C at P1–P3, B, G (variants change the movement context; RF2 §8.2).

#### 9.2.2 In the key session, precisely (S8)
- **The visit at the cap:** once a straight take is clean at the cap, the visit continues with **variants only**, climbing: C at cap + 1 mark from the remembered rung, then B or G, each clean variant take one mark higher, up to **cap + 3 marks**. The visit's **last take is one straight take at the cap** (touch point 2 if not yet asked today). No straight take repeats at the cap within a visit.
- **A cap hit is not a limit.** KS2's limit ("that's your limit today"), reopen rules, "no more than six takes on one step" and the WAVE/limit logic ignore takes held at the cap. A-6 shows **"held"**, not failed or limited; the end line names the hold. KS2 U1's closing at the cap plays at the cap.
- **A-7 opens** when A-6 passes its target as now, **or** when the cell's main item has `passedAt` (H2 §1.6). Under the cap, A-6 may never reach its target in session (S1b).
- **H10:** fingering variants count as offered difficulty in the H2 §1.7a flat-rank slope, at their played tempo (content tier + ln(tempo / target) / ln 1.2). A retraining cell therefore does not read as flat.

#### 9.2.3 Passes: the pass-evidence take, and the honest limit (S1)
- **Exempt from the cap (they play at their own tempo):**
  - the cold check and every counting cold check, pass probe, confirmation and FSRS review probe (H2 §1.6, §1.9);
  - the placement probe; level-test takes; teacher submission targets.
- **The pass-evidence take:** at most **one plain straight take per session per retraining cell at 0.95–1.0 × target**, to feed the warm half of the V1 pass (3 counted clean takes at ≥ 95 % of target on ≥ 2 days, H2 §1.6). Allowed only when, before retraining began, the main item's `cleanBpm` had already reached the probe band (`preTop` ≥ 0.95 × target), **or** the cell's non-provisional threshold estimate is ≥ 0.95 × target (H2 §1.9). It is the visit's last straight take that session, and touch point 2 follows it (once a day).
- **The remaining delay, stated honestly:**
  - For a cell whose climb had reached the probe band before retraining, the warm half needs 3 sessions on ≥ 2 days instead of possibly 2 sessions. **A delay of at most about 1 practice day.** The cold half is unchanged.
  - For a cell whose climb had **not** reached the probe band, the warm half waits until the cap (E + 1 mark) reaches the probe band, or until retirement. **That is a real delay of the pass, and so possibly of rank**, of unknown length. It is the price of not rehearsing the slip above the edge (RF2 §8.2). Owner question **Q8**.
- **G3 is a planner-level test** (§18): seeded learners over 28 days, with fingering on and off. It reports P(pass by day N) for both. For learners with `preTop` in the probe band, the median pass delay must be ≤ 1 practice day. For the others, the delay is reported, not bounded.
- **`!` sessions:** the cap still applies (Q3, decided). The take line and the teacher digest say "Held at ♩116 while the fingering settles." The teacher has an explicit **"Don't hold"** switch on the assignment, which lifts R2 for that assignment's sessions.

#### 9.2.4 When the cap moves
- With E (§9.4). A rise applies from the cell's next visit, never inside the visit that raised it.
- **Lifted** at retirement, at "Stop fingering work", by the teacher's "Don't hold" switch, or when the fingering changes (R3).

### 9.3 R3: one fingering per cell
- Never alternate the old and new fingering "to compare" (RF1 §1.1, Brashers-Krug 1996).
- A change of `fsOwn` resets the cell's state. A retraining cell restarts with a block on its next appearance; the old state is archived in telemetry.
- A change of `fsSug` re-keys without losing state (§1.2).

### 9.4 The edge
Per cell and hand, in nps.
- **Start:** from T1, one mark below c*; from T2, one mark below the slower break take; from T3, one mark below the slipped tempo; from a manual start with no data, the last clean session tempo.
- **OK at tempo t** (touch point 1 or 2): E rises toward t, by **at most 1 mark per day** (S8). A single take can raise E more only if it is **MIDI-clean at the flagged group**: not a break take, and R_g within the MIDI reference band (§11.3). On mic, always at most 1 mark per day.
- **Slipped at t:** E = min(E, one mark below t), floor the comfort pulse.
- **Hand unknown on an HT take:** the slip applies to the flagged hand; if both or neither are flagged, to both.
- **Slips today** at a tempo are counted per hand (`slipsToday`). A second slip at the same T_S today makes that day's edge one mark below and adds a G take to the next visit.
- **E0** = E when the cell entered `retraining`.
- E and the cap only restrict plain straight takes. **No E, report or G value reaches the tempo choice of any qualifying take** (cold check, confirmation, pass probe, FSRS review): those follow H2 §1.9 alone (S2, guard G16).

### 9.5 Teacher assignments and the mirror rule
- **Every rule exists in both coaches** (`keyCoach.ts`, `coach.ts`; memory: key-session-must-develop), checked by a shared test (G12).
- **A teacher can pin "Positions"** on an assigned piano scale. The first session of the assignment runs the day-1 block after the cold check, even without a flag. Later sessions run one fingering visit each.
- **`!`:** no fingering visits or blocks unless pinned. R2 applies unless "Don't hold" is set (§9.2.3).
  - **This departs from SP §16.7 ("`!` means straight") for a pinned "Positions" only.** It is added to SP's amendment list (SP §21) with this spec.
- **The submission** adds `{ fgRung, fgEdge, fgReports, fgHeld }` for a pinned or retraining cell, the edge labelled "the student's report". No teacher text in push.

### 9.6 Honesty principle (G1 restated, S2)
**Reports may only lift restrictions this feature added. No measured outcome may exceed the feature-off baseline.** Measured outcomes are passes, rank, cold results, the staircase, the threshold estimate, Momentum, XP beyond practice time, history and confirmations.

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
A **clean cold check at ≥ G**, reported **OK** at touch point 1, which also meets the **MIDI condition** (MIDI setups).

### 11.3 The MIDI condition
- Not a break take for that hand (§3.3), **and** R_g of the flagged group within the **reference band**: reference mean ± max(20 ms, 2 × reference SD).
- **The reference:**
  - T1 flags: the T1 lower band;
  - T2, T3 and manual flags: the group's R_g over clean takes at ≥ 2 marks below E in the last 21 days (`fingerEvidence`), with ≥ 5 takes.
- With fewer than 5 reference takes, the condition is "not a break take" only.
- The condition means OK alone cannot retire a MIDI player (§14.2).

### 11.4 Retirement, rechecks, relapse
- **Retired** when every flagged hand has confirmations on **2 distinct days** (≥ 8 h apart, different local days; H2 §1.6 "later day"), with no slipped on that hand between them (strict, like H9's reset). Then R2 is lifted, visits stop, and `recheckDue` = +7 days.
- **Rechecks at speed:**
  - The recheck is the first cold check **at ≥ G** on or after `recheckDue`. Touch point 1 asks, with the MIDI condition.
  - Touch point 2 also fires once on the first climb that passes E0 after retirement.
  - A T1 or T2 fire during the recheck period brings the next recheck forward to the next cold check at ≥ G.
  - OK (and the MIDI condition) → `recheckDue` = +21 days; after that recheck → `done`.
  - **Slipped, or a failed MIDI condition** → back to `retraining` from the next session (visits, R2), E from the slipped tempo (or one mark below the take), **no new block**. A second failed recheck of the same fingering → a block on the next appearance.
- **Mic players (honest fallback):** there is no MIDI condition on mic. Retirement and rechecks are **report-only**: two clean cold checks at ≥ G reported OK on distinct days. This is safe because R2 only restricts the player, and nothing measured depends on it. The item page labels it "by your report". The mic C ladder moves on onset-verified placement in hands-separate takes (§5.3), so a mic visit never repeats the same take at one tempo.
- **Breaks:** time away never changes the state. After 60 days without a cold check, a state returns to `flagged` with E kept, and asks nothing until the cell is played.
- **Nothing is promised about duration** (RF2 §5: no piano study; 4 days was not enough in Hardwick).

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
- **Orchestrated takes join the drum feel pool** for sticking rudiments: every fourth visit of a sticking rudiment is orchestrated (kind `fingering`), from the first session. So D-T1 can raise a first flag (S9: it was circular in v1).
- **The drum per-note log** (F9): drums get `nl` with `h` = expected hand, `e` = expected voice note, `p` = played voice note − expected, `d`, `v`, `o` = null, `x` = **`h`** (a new class char: hand-change site) or `.`, and `f` = `R`/`L` characters. The `NoteLog` type documents both meanings of `f` (digit for piano, hand letter for drums).
- **Triggers:**
  - D-T1: orchestrated takes with a crosstalk-safe wrong-pad stroke at the same site, in ≥ 2 takes within 7 days in one 1.25× band;
  - D-T2: the T1 split test on plain (one-surface) takes, on the site strokes' residuals;
  - D-T3: a report.
- **The orchestrated edge** = the highest clean orchestrated tempo on 2 distinct days. **The plain cap while retraining** = max(orchestrated edge + 2 marks, the D-T2 plain edge). The 2 marks allow for travel between two surfaces, which under-reads one-surface ability (S9).
- **Block and visits:** as piano, with O in place of A and B. Block: O at comfort → C on O (P1 → P0 at ≤ cap) → G → plain closing at T_S.
- **Report (Q2):**
  - **crash** = OK;
  - **two kicks 80–400 ms apart** = slipped (debounced against kick double-triggering), or the **ride bell** when the kit map has one;
  - never the hi-hat foot, which moves incidentally;
  - no hand question: the orchestrated takes locate the hand;
  - window: 3 s after the last stroke has decayed (≥ 0.8 s).

---

## 13. Guitar and bass
- **Picking and plucking direction:** skipped until a data signature exists (O10). When `nl` covers guitar/bass (a later step), an odd/even timing or velocity split is tested offline first.
- **Fretting position** (MIDI guitar `string/fret`): third in order, after drums. Not in v1.

---

## 14. Honesty, rewards and what the player sees

### 14.1 Reports earn nothing
- **No XP, rank, pass, star, Momentum, league, badge, streak or cap** comes from a report or from a `fingering` take's verdict (RF1 §2.2).
- **XP:** fingering takes earn the practice-time XP every take earns from its active time (`drillTakeMs`), and nothing per result or report.
- **A slipped never cancels anything** (RF1 §6.5).

### 14.2 Why lying doesn't pay
- OK cannot retire a MIDI player alone (§11.3).
- OK raises E by at most 1 mark per day unless MIDI agrees (§9.4).
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
| Blocks (A) | Each hand position as one chord: you'll see where the hand moves. | כל מנח יד כאקורד אחד: תראו איפה היד זזה. |
| Position rhythm (B) | Make the last note of each hand position long. | הצליל האחרון בכל מנח יד: ארוך. |
| Vanishing pause (C) | Hold before each hand-position change and place the hand. | החזיקו לפני כל מעבר מנח יד והניחו את היד. |
| Cell (G) | Just the change, in short bursts. | רק המעבר, בפרצים קצרים. |
| Drums, orchestrated (O) | Right hand on the floor tom, left on the snare. | יד ימין על הטום הרצפתי, שמאל על הסנר. |

### 14.4 Lines (one line each; matter-of-fact; no emoji)
| Moment | en | he |
|---|---|---|
| Report prompt | Fingering OK? Top key = yes · bottom key = slipped. | האצבוע תקין? קליד עליון = כן · קליד תחתון = החליק. |
| Report prompt, with a place | Way down at F♯: fingering OK? | בירידה, ב-F♯: האצבוע תקין? |
| Hand question (HT) | Which hand? Bottom key = left · top key = right. | איזו יד? קליד תחתון = שמאל · קליד עליון = ימין. |
| Spot check | Way down at F♯ it caught. Fingering OK there? | בירידה ב-F♯ זה נתקע. האצבוע שם תקין? |
| Reminder | Top or bottom key after the take; or let it be. | קליד עליון או תחתון אחרי הנגינה; או לוותר. |
| Offer | Your left hand's way down in D major changes above ♩100. A fingering block next time? | הירידה של יד שמאל ברה מז'ור משתנה מעל ♩100. בלוק אצבוע בפעם הבאה? |
| Offer buttons | Yes · Not now | כן · לא עכשיו |
| Plan check, wrong | The holds fell on E and B. The hand positions end on F♯ and C♯. Once more. | העצירות נפלו על E ועל B. מנחי היד נגמרים ב-F♯ וב-C♯. עוד פעם. |
| Plan check, second miss | Your hand positions end elsewhere. Mark your own fingering? | מנחי היד שלך נגמרים במקום אחר. לסמן אצבוע משלך? |
| Rhythm map miss | Long on E; the hand position ends on F♯. | ארוך על E; מנח היד נגמר ב-F♯. |
| Block end | Left hand holds to ♩116. Next: the hold, down to a quarter beat. | יד שמאל מחזיקה עד ♩116. הבא: העצירה, עד רבע פעמה. |
| End-line clause | Left hand, way down at F♯: hold down to a quarter beat. | יד שמאל, בירידה ב-F♯: עצירה עד רבע פעמה. |
| R2 hold | Held at ♩116 while the fingering settles. | נשאר ב-♩116 עד שהאצבוע מתייצב. |
| Retired | The D major fingering held in the first take of the day, on two days. Back to normal practice. | האצבוע ברה מז'ור יציב גם בנגינה הראשונה של היום, יומיים. חוזרים לתרגול רגיל. |
| Recheck relapse | The old fingering came back in the first take of the day. Short fingering visits again. | האצבוע הישן חזר בנגינה הראשונה של היום. שוב ביקורי אצבוע קצרים. |
| Item page | Fingering ♩116 · your report | אצבוע ♩116 · לפי הדיווח שלך |
| Item page, mic retirement | Fingering settled · by your report | האצבוע התייצב · לפי הדיווח שלך |
| Item page actions | Retrain this fingering · Stop fingering work | לאמן מחדש את האצבוע · להפסיק עבודת אצבוע |
| Settings card title | Fingering coach | מאמן האצבוע |
| Settings switch | Suggest fingering work | להציע עבודת אצבוע |
| Settings switch (device) | Answer by voice (this device) | לענות בקול (במכשיר הזה) |
| Settings button | Offer again | להציע שוב |
| Settings button hint | Clears "Not now" and "Stop" from the last 60 days. | מבטל "לא עכשיו" ו"הפסקה" מ-60 הימים האחרונים. |
| Settings list title | In retraining now | באימון מחדש עכשיו |
| Settings list row | D major scale · left hand · ♩116 · your report | סולם רה מז'ור · יד שמאל · ♩116 · לפי הדיווח שלך |
| Settings row, recheck | recheck | בדיקה חוזרת |
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
  2. **Small button: "Offer again"**, shown only when something was snoozed, declined or stopped in the last 60 days. It:
     - turns `fingeringOffer` on;
     - clears every hand's `snoozeUntil` and `declines`;
     - returns cells stopped by "Stop fingering work" in the last 60 days to `flagged` if they still have a flag, otherwise to no state.

     Nothing restarts by itself: the next offer still waits for Yes (Q7, decided).
  3. **List: "In retraining now"**, one row per cell in `retraining`, plus `retired` cells with a recheck pending (marked "recheck").
     - Each row shows the item title in its key, the hand(s), and the edge ("♩116 · your report").
     - A small **"End"** button on each row does "Stop fingering work" for that cell and lifts R2 at once.
     - An empty list shows one muted line: "No fingering work right now."
- **Sync rule (decided):** `fingeringOffer`, the snoozes, the stops and the list are **synced per account**. They are practice preferences and progress, the same on every device. Two fingering preferences stay **on the device**, because they depend on the hardware: "Answer by voice" (`fingeringVoice`) and the learned key zones (`fgZones`) (device-settings rule). "Answer by voice" sits in this card too, labelled "this device".
- **Copy:** the Settings rows in §14.4.

---

## 15. Data model

### 15.1 Synced progress: `fingering` (under the fresh-start epoch), keyed by `cellKey`
```ts
type Hand = 'R' | 'L';
interface FlagStat { src: 'T1' | 'T2' | 'T3' | 'manual' | 'teacher'; group: string; sitePc: number; c?: number; t?: number; delta?: number; brk?: number; at: string }
interface HandState {
  upd: string;                                        // ISO, per-hand merge key
  flag?: FlagStat;
  t3At?: string;
  snoozeUntil?: string; declines: number;             // §3.5, Q4
  edge?: number; edge0?: number;                      // nps
  edgeRaisedDay?: string;                             // the 1-mark-a-day limit
  slipsToday?: { day: string; nps: number; n: number };
  rung?: 1 | 2 | 3 | 0; planAt?: number;              // C ladder memory
  confirms: { day: string; nps: number; midi: boolean }[];
}
interface FingerCell {
  v: 2;
  cellKey: string;                                    // family + level + key
  mainItem: string;
  fsOwn: string; fsSug: string;                       // §1.2
  state: 'flagged' | 'offered' | 'declined' | 'retraining' | 'retired' | 'done';
  stateUpd: string;                                   // ISO
  hands: Partial<Record<Hand, HandState>>;
  preTop?: number;                                    // cleanBpm in nps at retraining start (§9.2.3)
  blockDay?: string;
  recheckDue?: string; recheckStep?: 7 | 21; failedRechecks: number;
  asked: { day: string; cold?: boolean; top?: boolean; spot?: boolean };
  dontHold?: string[];                                // assignment ids with the teacher's switch
  stoppedAt?: string;                                 // "Stop fingering work" / Settings "End"; reversible for 60 days (§14.6)
}
type FingerStore = Record<string /* cellKey */, FingerCell>;
```
- **Merge (S6):** per cell, `state` by the newest `stateUpd`; each hand by its newest `upd`; `confirms` is the union by (hand, day); `failedRechecks` and `declines` by max; `asked` by the newest day, OR-ing the flags of the same day. A merge that brings two confirmations closer than 8 h keeps only the earlier (H2 §1.4 cross-device rule).
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
         rep?: 'ok' | 'sR' | 'sL' | 's?'; tp?: 'cold' | 'top' | 'spot' | 'shadow'; held?: boolean }
  ```
- The report labels the take's own trace (RF1 Q5, accepted). `calibUpload` is unchanged.

### 15.5 Teacher
- Assignment options: `fingering: 'pin'` and `dontHold: true`. Submission fields (§9.5).

---

## 16. Telemetry and shadow mode

### 16.1 Telemetry
On the take traces (SP §8: device plus the calibration upload); no new tables.
- **Per take:** `nl`, `xs`, `fg`.
- **`fgDay`:** offers shown, accepted and declined; touch points asked and answered by input; spot checks fired and flipped; the rung reached per cell; R2 holds; pass-evidence takes; unanswered windows.

### 16.2 Shadow mode (F3; S5.9)
- **Who:** the calibration accounts only. **Length:** 2–3 weeks.
- T1 and T2 compute flags and log them (`fgShadow` on the trace: group, c*, Δ, t, strength) **without offering**.
- **Labels are collected:** touch point 1 fires on every shadow-flagged cell and on a random 1 in 3 of unflagged eligible scale cells, once a day each (§8.1). The answers are written as `fg.rep` with `tp: 'shadow'`. They change nothing (no edge, no state).
- **The analysis** runs offline on the server copy:
  - precision: the share of T1/T2 flags followed by a "slipped" or a T2 break within 14 days;
  - recall: the share of "slipped" reports on cells that were flagged;
  - RF2 §7's three questions (does structure H flag reported slips; do velocity bumps fall at slips; at what pause length the map breaks).
- **Go criterion for offering:** precision ≥ 50 %. The thresholds (20 ms, 8 %, t 3, 30 ms, 3.5 SD) are re-fit with the owner before the offer turns on. If precision stays below 50 %, the offer runs on T3 and manual starts only.
- The camera stays a later spike (RF1 §4, RF2 §4).

---

## 17. Build steps

| Step | Content | Size |
|---|---|---|
| F1 | **Done (0.145.16):** the per-note log, trace v3, the device trim, tests. | S |
| **F1b** | **Trace v4:** `fs`, `vr`, `cell`, `xs` (residuals by the trace's own rule, `sdl`, break flag), `to`; `NOTE_LOG_MAX` 120; the `fingerEvidence` store with its retention. Tests: residuals equal the trace rule; wrong-key notes excluded; thinned and feel takes excluded; a 4-octave HT scale logs whole; retention ≥ 21 days at 200 takes a day. | S–M |
| F2 | **Report input:** the window (decay, 3 s, verdict first), zones learned per input (octave-aware), the HT second press, pedal, keys and foot switch, optional voice, the count-in hold, one question per take, reminder and fatigue across cells. `fg` on traces. | M |
| F3 | **Flags:** T1, T2, T3 (pure `fingerFlags.ts`), per cell and hand, guards, snoozes. **Shadow mode with label collection** (§16.2), then the go decision with the owner. | S–M |
| F4 | **Structures:** `positionBlocks`, `positionRhythm`, `pauseAtCrossings` (whole-twelfth rungs, lengthened notes, the subdivided click, segment grading), `crossingCell`; grading. Tests in 12 keys, both hands, own fingering. | M |
| F5 | **The ladder and the block:** `fingerLadder.ts` (rungs, rung memory, drop-back, plan check, T_C/T_S, E rules incl. 1 mark a day) and the block composer with its budget. A 3-day simulation. | M |
| F6 | **Integration:** the key session (block, visits, the variants-only cap visit, "held" vs limit, A-7 on `passedAt`, new-key blocks), the old coach and assignments (mirror, pin, `!`, "Don't hold"), R1 in every planner, R2 in every climb, the pass-evidence take, challenge takes off, H10 offered difficulty. SP rotation hooks behind its own build. SP §16.7 amendment entry. | M–L |
| F7 | **Across days:** confirmations with the MIDI condition and the references, retirement, rechecks at ≥ G, relapse, the mic report-only path, breaks, the `fingering` store with its merge. | S–M |
| F8 | **UI and copy:** chip, report line, offer, item page, **the Fingering coach card in Settings → Learning (§14.6: switch, "Offer again", the retraining list with End, the device voice switch)**, briefs, the teacher switch; he + en; `speakable` for ♩ and ♯; screenshots at 320/390 widths; the contrast sweep. | S–M |
| F9 | **Drums:** the drum `nl`, `orchestrate`, the crosstalk-safe wrong pad, orchestrated takes in the feel pool, the drum flags, cap and report. | M |
| F10 | **Harness and review:** G1, G3 and G16 at planner level with seeded learners; independent review rounds until clean before F1b (owner rules). | — |
| F11 (later) | Arpeggios, with the held-key constraint (RF2 §3 F). | M |
| Later | Structure H offline on labelled logs (RF2 §12.4); accent feel D (Q6) after the thumb-bump test on `nl.v`; the camera spike. | L |

Order: F10 review → F1b → F3 shadow (it needs only F1b and F2's touch point 1) → F2 rest → F4 → F5 → F6 → F7 → F8 → F9. `npx tsc -b` before every commit.

---

## 18. Guard tests

| # | Test |
|---|---|
| G1 | **Honesty (planner level):** seeded learners over 28 days with reports scripted to lie OK at every touch point vs honest vs no reports. Passes, rank, cold results, staircase, threshold estimate, Momentum, XP beyond practice time and history never exceed the feature-off baseline (§9.6). |
| G2 | **R1:** in every planner, no `fingering` take precedes the cell's main-item cold check on a cold day; new-key blocks are the only exception, on a first appearance. |
| G3 | **R2 vs passes (planner level):** seeded learners, fingering on and off. Reports P(pass by day N) for both. For `preTop` in the probe band, the median pass delay ≤ 1 practice day. The others' delay is reported in the build PR. Also: plain straight takes never exceed the cap outside the exemptions and the pass-evidence take (≤ 1 per session). |
| G4 | **Develops:** in the 3-day simulation (MIDI and mic), no two takes of one cell in a visit have the same structure, rung and tempo, except an "almost" hold. At the cap, clean takes are followed by variants that rise. |
| G5 | **Per key:** on the owner's five-key class means, T1 fires on **D at ♩100** (edge ♩96) and nowhere else; a constant early lean in E♭ flags nothing; an injected shift in one key flags only that key. |
| G6 | **Structures in 12 keys:** every major and minor scale, both hands, 1–4 octaves: `pauseAtCrossings` lengthens exactly the notes before the crossings by whole twelfths; `positionBlocks` groups match the fingering; own fingering moves both; no crossing where the expected finger is missing. |
| G7 | **Verification:** B passes the correct long-note set and names a misplaced one; C detects a pause one note early, and grades segments without cumulative offset; A fails a roll > 40 ms and an extra note. |
| G8 | **Report grammar:** no MIDI answers before the range is learned; zones after the octave shift; reset on a shift change; empty zones fall back; the HT second press; pedal < 600 ms; zone notes never start a take; a non-zone note closes as no answer; the verdict is shown before the report line; one question per take with H2 §7. |
| G9 | **Input source:** mic takes have no `nl`/`xs`; mic C moves the ladder only on HS onset placement; `nc` takes move nothing; a mid-take MIDI loss leaves the state unchanged; A and B never on mic. |
| G10 | **Retirement:** OK alone with break takes never retires a MIDI player; two clean confirmed cold days at ≥ G retire; a slip between resets; rechecks only at ≥ G; a recheck slip → retraining without a block, a second → a block; mic retires by report only and is labelled. |
| G11 | **Signatures:** an `fsOwn` change resets; an `fsSug` change keeps E, the confirmations and the state, and drops older evidence from T1/T2. |
| G12 | **Mirror:** one scripted player through `keyCoach` and `coach.ts` assignments gets the same R1, R2, cap-visit and eligibility decisions. |
| G13 | **Drums:** orchestration maps each stroke's hand to its voice; a crosstalk hit with the expected pad also struck is not a slip; a substitution is; orchestrated takes appear in the pool before any flag; the plain cap is max(orchestrated edge + 2 marks, plain edge). |
| G14 | **Copy:** every line in he and en; `speakable` reads "♩116" and "F♯"; no bare "מנח"/"מנחים". |
| G15 | **F1 (exists):** `tests/noteLog.test.ts`. |
| G16 | **No report reaches a qualifying tempo:** for the cold check, confirmation, pass probe and FSRS review probe, the chosen tempo is identical with any sequence of reports (and any E), across 28 seeded days; after a pass-probe take the staircase resets to the tempo played (H2 §1.9). |
| G17 | **Key session at the cap:** a cap hit never sets "limit", never consumes reopen or six-take budgets; A-6 shows "held"; A-7 opens on `passedAt`; one OK at a probe-band cold check raises E by ≤ 1 mark unless MIDI-clean at the group. |
| G19 | **The Settings card (§14.6):** the switch off suppresses every offer (T1, T2, T3, and the t ≥ 5 exception) while retraining cells continue. "Offer again" turns offers on, clears all snoozes and declines, and returns cells stopped ≤ 60 days ago to `flagged` (when they have a flag) without starting any visit. The list shows exactly the `retraining` cells plus pending rechecks. "End" equals "Stop fingering work" (R2 lifted on the next take). `fingeringOffer` and the store sync across two devices; `fingeringVoice` and `fgZones` do not. The he and en strings exist. The card renders at 320/390 px in the existing switch style. |
| G18 | **Evidence retention:** after 25 days at the owner's take rate, T1 sees ≥ 21 days of rows for a cell, independent of the 500-trace `nl` trim. |

---

## 19. Questions: Q1–Q7 decided (owner 2026-11-28), Q8 open

| # | Question | Decision (the review's default, accepted by the owner 2026-11-28) |
|---|---|---|
| Q1 (decided) | The fourth rung | **Drop P4:** 1 beat → ½ → ¼ → none. ⅛ beat is off the 1/12 grid and below the verification floor at most tempi. If a fourth step is wanted later: ⅙ beat (2 twelfths). |
| Q2 (decided) | Drum report gesture | **Crash = OK; two kicks 80–400 ms apart = slipped**, or the ride bell if the kit maps it. Never the hi-hat foot. |
| Q3 (decided) | R2 in `!` sessions | **The cap holds in `!`** (submission targets are already exempt), shown in the teacher digest, with an explicit teacher **"Don't hold"** switch on the assignment. |
| Q4 (decided) | Snooze after "Not now" | **14 days; 28 days after a second decline** of the same cell and hand. A self-reported slip ends a snooze. |
| Q5 (decided) | The cold take at G | **Accepted with the S2 fixes, which make the override unnecessary:** G = 0.95 × target from the catalogue; confirmations and rechecks use the probe-band cold takes H2 §1.9 already plays; no report or E reaches a qualifying tempo (G16). |
| Q6 (decided) | Accent the position start (D) | **Not in v1.** Test the thumb-bump hypothesis on `nl.v` with labelled slips first; add later as a rate-keeping feel. |
| Q7 (decided) | Visits without an offer | **No auto-start.** A strong T1 flag (t ≥ 5) may be offered once inside a snooze, and still waits for Yes. |
| **Q8 (open)** | **R2 delays some passes** (§9.2.3) | For cells whose climb had not reached the probe band before retraining, the warm half of the pass waits until the cap reaches the probe band or retirement: a real, unbounded delay of the pass, and possibly of rank. **Default: accept it** (the evidence says the plain climb above the edge rehearses the slip), with the delay reported by G3. Alternative: allow the pass-evidence take for every retraining cell once its threshold estimate (not only `preTop`) reaches the probe band. That is already included; a wider alternative is to allow it once the cap is within 2 marks of the probe band. |

---

## 20. Change log v1 → v2 (review round 1)

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

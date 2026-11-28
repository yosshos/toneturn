# SPEC-FINGERING: training correct fingering inside normal practice (v1, 2026-11-28)

**Sources.** `docs/RESEARCH-FINGERING.md` (RF1) and `docs/RESEARCH-FINGERING-2.md` (RF2). This spec does not re-research; every evidence claim cites a section there. The owner accepted all ten RF2 §13 recommendations and the RF1 items listed in §0 on 2026-11-28.

**Integrates with:** the key session (`keyCoach.ts`, SPEC-KEY-SESSION-2 = KS2), the spiral rotation (SPEC-SPIRAL-PRACTICE = SP), cold takes, the V1 pass and rank (SPEC-HOLISTIC-2 v14 = H2), teacher assignments (`coach.ts`), hands-free runs, SPEC-INPUT-SOURCE (IS), the take traces (`tendency.ts`), the calibration upload (`calibUpload.ts`).

**The problem in one line.** A wrong fingering survives at slow tempo and breaks where the preparation time runs out, mostly on descents (RF1 §1.1, Hardwick 2019; RF2 §2). The owner's D-major descent shift does **not** repeat in C, E♭, G or B♭ (RF2 §2), so everything here is **per item, which means per key**.

---

## 0. Owner decisions (2026-11-28)

| # | Decision | Where |
|---|---|---|
| O1 | **Mixed design.** One focused 6–8 min block on the day a fingering is learned or retrained, replacing that item's visit. Then short fingering visits in the rotation while the item is flagged. Retired after confirmations on 2 different days. | §6, §7, §11 |
| O2 | **The vanishing pause is the main fingering ladder** (1 beat → ½ → ¼ → a sixteenth → none at the item's tempo), beside the normal tempo ladder. | §5.3 |
| O3 | **Position rhythm with player-placed long notes** (the score does not show them) is a variant. | §5.2 |
| O4 | **Self-report only twice a day per item:** after the day's cold take of a flagged item, and after the top take of a climb. Highest key = "right"; lowest key = "slipped", plus a second press for the hand. A pedal tap also means "right". Spoken input is optional, and only after the piano has decayed. | §8 |
| O5 | **R2:** while an item is in retraining, its plain straight climb stops at the reported fingering edge + 1 metronome mark and continues above that only in variants. Rank and passes are never affected. | §9.2 |
| O6 | **Per-note logging** starts now on the calibration accounts (built: F1, trace v3). | §2.1 |
| O7 | **Blocks on a new key's first appearance** (one take per hand), skipped when the probe marks A-1/A-2 passed. | §10 |
| O8 | **Scales first;** arpeggios in a later step. | §1.4 |
| O9 | **Drums orchestrated stickings** (R on one pad, L on another) are the second instrument. | §12 |
| O10 | **Guitar picking and bass plucking direction are skipped** until a data signature exists. | §13 |
| RF1 | Also accepted from round 1: XP from practice time only, never from reports; the pause-at-crossing check once per new item and band; reports may label calibration traces; the camera later; an auto-offer at the session end that the player can decline. | §14, §5.3, §16, §4 |

---

## 1. Terms

### 1.1 Expected fingering
- **Expected fingering** of a note = the player's own number where entered (`ownFingering.ts`), else, when the item is not marked own, the suggested `ExpNote.finger`.
- An item marked own fingering **with no number at a note** has no expected finger there. No crossing is claimed at that note: the owner's rule that a suggestion is never a fact (2026-11-17).
- **Fingering signature** `fsig` = a short hash of the expected finger string of the item (the per-note log's `f`). A change of `fsig` is a new fingering (R3, §9.3).

### 1.2 Crossings, sites and groups
- **Crossing note** = a note whose per-note log class is `u` (thumb under, going out) or `o` (3/4 over the thumb, coming back). It is computed from the expected fingering with `afterCrossing` (`touch.ts`), the same test the trace classes use.
- **Direction** of a crossing = down when its written pitch is below the previous note of the same hand's line. LH `u` and RH `o` are descents (RF2 §2).
- **Site** = (hand, the note's index in the item). **Group** = (hand, class, direction), e.g. "LH thumb-under going down". Sites of one group recur in each octave.
- **Local residual** r_k of a crossing note k = its `d` minus the mean `d` of the nearest plain (`.`) notes of the same run in the same hand line, up to 2 before and 2 after, with at least 1 on each side (otherwise no residual). This mirrors the trace's class rule (`tendency.ts`, review round 4), computed from the per-note log. The first 2 and last 5 notes of a line are edges and never get a residual.

### 1.3 Edges, states and takes
- **Fingering edge** E(item, hand) = the highest tempo at which the expected fingering is believed to hold, kept in **notes per second** (KS2 §3: nps is the measure) and shown as ♩ in the note value played (KS2 U9). Its sources are in §9.4.
- **One mark** = SP §1: one metronome (Maelzel) mark, at least 2 ♩, on the played ♩.
- **Item fingering state:** `none` → `flagged` → (`offered` / `declined`) → `retraining` → `retired` → `recheck` → `done` (§11).
- **Fingering take** = a take played as one of the §5 structures. New `TakeKind` **`fingering`**, with the same zeros as `form`: no history, staircase, passes or tendencies (`TAKE_KIND`). The straight takes inside a fingering visit are ordinary takes of their normal kind (§7.2).
- **Touch point** = one of the two moments in a day when the report is asked (§8.1).

### 1.4 Scope of v1
- **Piano:** family `scales`, kind `scale`, every mode that has expected fingering, all 12 keys, every hands option. **Not** chromatic: it has no thumb-under pattern (`tendency.ts`). Not swung items: their off-beats sit on the player's ratio.
- **Arpeggios** are a later step (O8, F11 in §17). The engine is written to take them: RF2 §3 F (held-key) suits them.
- **Drums:** orchestrated stickings (O9, §12).
- **Out:** guitar and bass fretting position (later; RF2 §10, third in order); picking and plucking direction (O10); voice.

---

## 2. What exists (code facts, 2026-11-28)

### 2.1 F1, built with this spec: the per-note log (trace v3)
`TakeTrace.v = 3` adds `nl: NoteLog` (`src/engine/drills/tendency.ts`, `noteLog()`). Parallel arrays, one entry per written note of a hand, in score order, at most `NOTE_LOG_MAX = 96` notes:

| Field | Content |
|---|---|
| `h` | the hand per note, one character (`R`/`L`) |
| `b` | the written onset in twelfths of a beat |
| `e` | the written pitch |
| `p` | the played pitch minus the written one (0 = right key; null = not matched) |
| `d` | the onset residual vs the grid (ms, integer) = the deviation from the click minus the take's `lead`. The session-relative value = `d` + `sessionRelativeLead` of the take. |
| `v` | the velocity (0 = not matched) |
| `o` | the note-off minus the next same-hand note's note-on (ms; + = overlap, − = gap) |
| `x` | the class from the **expected** fingering: `u o t b c l .`, and `-` for a chord note. Unlike the trace's class means, a crossing wins over the boundary here. |
| `f` | the expected finger per note, one digit (`0` = none) |

- About 1.3 KB for a two-octave hands-together scale; at most about 2.3 KB (tests: `tests/noteLog.test.ts`).
- It is written only on MIDI keys takes: `src = 'midi'`, a piano take, not `nc`. Microphone, guitar, bass, drum and voice takes have none.
- On the device, only the newest 500 traces keep `nl` (`trimNoteLogs`, `storage/takeTraces.ts`).
- It reaches the server only through the calibration upload (`toneturn_calib_traces.trace`), which is gated to the calibration accounts on the server. Not-comparable takes are excluded there, as before. No schema change.

### 2.2 Reused pieces
| Piece | Where | Use here |
|---|---|---|
| Suggested and own fingering | `generate.ts` (`ExpNote.finger`), `ownFingering.ts` | the expected fingering (§1.1) |
| `afterCrossing` | `touch.ts:388` | the crossing classes |
| Crossing velocity bump, late crossing | `touch.ts` (`fingers`, `lateCross`) | supporting evidence only (RF1 §3.3) |
| Rolled-chord onset spread | `touch.ts` | grading of the blocks (§5.1) |
| Take kinds, traces, pooling | `tendency.ts` | the new kind `fingering`; the `fg` trace field (§15) |
| The stage ladder, `stepQuality`, `gradedUp`, `snapDown`, Maelzel marks, the flow pulse (D3) | `keyCoach.ts`, `stages.ts` | the tempo side; the one-mark unit |
| The old coach, teacher assignments, `!` exact | `coach.ts` | the mirror rule (§9.5) |
| The rotation, visits, feels, bursts | SP §2, §15.4, §16 (spec; the rotation is not in `coach.ts` yet) | the fingering visit is an angle (§7) |
| Cold takes, `lastSound`, the V1 pass, rank | H2 §1.4–§1.7 | R1 and the "never affects rank" rules (§9) |
| CC listener, pedal invert, Web Speech | `speech/midi.ts`, `speech/webspeech.ts` | the report input (§8) |
| The brief gate, the auto count-in | `useBriefGate`, KS2 D6 | briefs on first appearance only (§14.3) |
| The self-prediction slot (MIDI low = no, high = yes) | H2 §7 | the same key grammar; never two questions on one take (§8.6) |

---

## 3. When an item gets flagged (the data trigger)

A flag is an **offer**, never a verdict. MIDI cannot see the finger (RF1 §3.3, RF2 §3). A correct fingering can also shift with tempo, because the thumb's preparation time shrinks (RF1 §3.2). The flag only decides when to propose work.

### 3.1 Input set (per item = per key, per hand)
Traces of the item from the last 21 days that meet all of these:
- `v ≥ 3` with `nl`; `src = 'midi'`; not `nc`, `other` or `swing`;
- kind ∈ {normal, retention, review, challenge, probe}. Fingering, form, burst, slow and free takes are left out;
- verdict clean or almost;
- the take's `fsig` = the item's current `fsig`. A new fingering starts a new set.

**Never pooled across keys** (RF2 §2: E♭ and G lean early at every tempo, D swings from early to late, C and B♭ don't move). A constant lean at all tempi is the tendency line's business (`sessionTendency`), not a fingering flag.

### 3.2 Trigger T1: a crossing shift across tempo bands
For each group g (§1.2) of a hand, each take gives R_g = the mean local residual of g's crossing notes in that take.
- **Split test.** For each Maelzel mark c (on the take's played ♩, converted to nps):
  - the **lower band** is the takes with nps in [c / 1.25, c);
  - the **upper band** is the takes with nps in [c, 1.25 × c];
  - each band needs ≥ 5 takes.
  - Δ = mean(R_g, upper) − mean(R_g, lower); t = Welch's t.
- **Fires** when, at some c:
  - |Δ| ≥ max(20 ms, 8 % of the written IOI at c);
  - |t| ≥ 3 (several splits are tried, hence 3, not 2.5);
  - ≥ 70 % of the upper-band takes lie on Δ's side of the lower band's mean (the CONSISTENT rule, `tendency.ts`).
- **The MIDI edge** c* = the mark with the largest |t| among those that fire.
- **The place named** = the site of g with the largest mean |r_k| in the upper band. Its pitch and direction give the line ("the left hand's way down, at F♯").

Check against the owner's D-major class means (RF2 §2): LH `xu` −16.5 ms below ♩104 against about +11.7 at ♩104–125 gives Δ ≈ 28 ms and t ≈ 5. **T1 fires on D at ♩104.** C, E♭, G and B♭ don't. These are class means, so the thresholds are provisional. F3 runs in shadow on the calibration accounts first (§17).

### 3.3 Trigger T2: break takes at a crossing
A take is a **break take** for hand h when its largest |r_k| over all notes of the hand line falls on a crossing note and is ≥ max(30 ms, 3.5 × the hand's plain SD `sd` in that trace) (RF1 §3.3). **Fires:** 2 break takes of the same group within 7 days, in one 1.25× tempo band. The MIDI edge = one mark below the slower of the two takes.

### 3.4 Trigger T3: a report
A "slipped" report at any touch point (§8.1) flags the item and hand at once, whether or not T1 or T2 fired.

### 3.5 Guards
- **No expected finger at the site** (the suggestion omits uncertain notes, or own fingering without a number): T1 and T2 skip that site.
- The item must be **acquired** (SP §1, D1). Nothing about fingering runs during acquisition.
- **v1 scope** only (§1.4).
- **A declined offer** snoozes T1 and T2 for that item and hand for 14 days. T3 always flags, and it ends a snooze.
- After **retirement**, T1 and T2 stay quiet for 21 days on that item. The 7- and 21-day rechecks cover that time (§11.3).
- **Mic setups:** T1 and T2 need the per-note log, so MIDI only. T3 works from any input (§8.3).

---

## 4. The offer

- **Where:** one clause in the end line of a session (coach, key session or list run) in which the flagged item was played. Never mid-session. Never in the level test. Never in a `!` assignment.
  - At most **one offer per session**: the flag with the largest t, with T3 flags first.
  - Off when **Settings → Practice → "Suggest fingering work"** is off (default on; synced).
- **Line:** "Your left hand's way down in D major changes above ♩104. A fingering block next time?" Two small chrome buttons, **Yes** and **Not now** (minimal-buttons rule). In hands-free runs, the report keys answer it too: top key = yes, bottom key = not now, within 6 s. No answer = not now, **without** the snooze.
- **Yes** → state `offered`. The day-1 block (§6) replaces that item's next visit in the next session where it appears. If the item is not in today's plan, the planner adds it once.
- **Not now** → `declined`, snoozed 14 days (§3.5).
- **Manual entries (no flag needed):**
  - the item page: "Retrain this fingering". It starts a standalone block now (§6.1);
  - the item menu inside a coach run: "Fingering block next" (next visit);
  - a teacher pin (§9.5).
- **An honest exit:** "Stop fingering work on this item" on the item page. It sets `done`, lifts R2 at once, and costs nothing. Nobody needs to report "right" falsely to get out (§14.2).

---

## 5. The structures and what MIDI verifies

Each structure turns the *position map* into something MIDI can see (RF2 §3). None verifies the finger at speed. MIDI is required for every verified check (IS R1–R5).

| | Structure | Written as | MIDI verifies | Graded on | Mic |
|---|---|---|---|---|---|
| A | **Blocks** (§5.1) | each hand position as one chord, in order | the grouping: each group's notes within 40 ms, the exact pitch set, nothing extra | grouping only | not offered |
| B | **Position rhythm** (§5.2) | even notes; the instruction "long on the last note of each position" | where the long notes fall against the expected crossings | the map match | not offered |
| C | **Vanishing pause** (§5.3) | the note before each crossing lengthened by the rung's pause; a comma mark | the long IOIs fall exactly before the crossings (while the pause is measurable) | normal notes + timing on the written rhythm | played and graded as rhythm, but **unverified** (no ladder move) |
| G | **Crossing cell** (§5.4) | the notes from 2 before to 2 after one crossing, as bursts with a rest | burst evenness and landing on the beat | the SP §15.4 burst goal | played, graded as a burst |

### 5.1 A: Blocks
- **Generator** `positionBlocks(drill, hand, fingers)`: cut the hand's line at each crossing note. Each segment becomes one chord (`chordId`) of its notes. For a one-octave RH D major: D-E-F♯ ▸ G-A-B-C♯ ▸ D. One chord per beat, at ♩60 or the item's comfort ♩, whichever is lower, with full click, count-in and now-cue. Both directions: up then down, with the descending map from the same fingering.
- **Grading:** every chord's onset spread ≤ 40 ms (the rolled-chord measure in `touch.ts`), its exact pitch set, and no extra notes. One verdict, with the failing group named on a miss ("Group 2 going down: G-A-B-C♯").
- **Limit (RF2 §3 A):** any three fingers can block three adjacent notes. Blocks prove that the player *knows* the map, not which fingers played it. They are a brief companion, never a pass.
- One take per hand (HS). Kind `fingering`.

### 5.2 B: Position rhythm (variant; O3)
- **Generator** `positionRhythm(drill, hand)`: the notes as written, even. The score **does not mark** the long notes. The brief says once: "Make the last note of each position long."
- **What MIDI verifies:** a note is *long* when its IOI ≥ 1.5 × the take's median IOI.
  - **Map match** = the set of long notes equals the set of notes before a crossing (the notes just before a `u`/`o` note in the hand line), across the whole take.
  - **Misplaced** long notes are named: "Long on E, the position ends on F♯."
  - The long:short ratio is free (1.5–3).
- **Grading:** the map match is the verdict. Wrong notes fail as usual. Timing is graded loosely: SD against the player's own long/short pattern, at the band's threshold × 1.5.
- **Runs as** a rate-keeping feel (SP §16.4) inside fingering visits only. Chip: "Positions". Never in the cold take, coordination stages, acquisition or `!`. Kind `fingering`.

### 5.3 C: The vanishing pause (the main ladder; O2)
- **Generator** `pauseAtCrossings(drill, hands, p)`: the note before each crossing note of the trained hand(s) is lengthened by p. The rest is unchanged, so the click grid stays exact.
  - On hands-together items both hands wait: one hand's pause stops the other too.
  - A comma mark shows the place; one screen (the one-screen rule).
- **The rungs**, in the item's written note value (IOI):

  | Rung | Added pause | Example in eighths (2 notes a beat) |
  |---|---|---|
  | P1 | 2 IOI | 1 beat |
  | P2 | 1 IOI | ½ beat |
  | P3 | ½ IOI | ¼ beat |
  | P4 | ¼ IOI | ⅛ beat: the shortest step (see Q1) |
  | P0 | none | the straight run |

  These are the owner's "1 beat → ½ → ¼ → a sixteenth → none" for eighth-note scales. For eighths, "¼ beat" is already a sixteenth's length, so P4 is read as the next halving (**Q1**).
- **Verified while measurable:** a crossing's pause counts as placed when that IOI ≥ IOI + 0.5 p, and every other IOI stays < IOI + 0.5 p. Placement is verified only while 0.5 p ≥ max(20 ms, 3 × the hand's plain SD). Below that the rung is played and graded as rhythm but marked unverified, and the take still moves the ladder (the take *is* nearly the normal run; RF2 §3 C).
- **The working tempo** T_w (per item and hand) starts at snapDown(0.9 × E). The item's comfort pulse (KS2 D1) is the floor.
- **The ladder (pure, `fingerLadder.ts`):**

  | Take result | Next take |
  |---|---|
  | clean, placement verified (or unverifiable at P4) | one rung shorter, same T_w |
  | clean at P0 | T_w up one mark, re-entering at P2. **Never the same take twice at one tempo** (key-session-must-develop): each clean take shortens the pause or raises the tempo. |
  | not clean, or placement wrong | the same rung once more. A second failure: one rung longer (P1 stays P1). |
  | two failures at P1 | T_w down one mark (floor: the comfort pulse, then ♩40, then free time, as KS2 review 3) |
  | a "slipped" report at P0 (touch point 2) | P2 at the same T_w. A second slip at that T_w that day: E = one mark below; then the cell G (§5.4); then P3 at one mark below. |
  | "almost" | holds; counts toward nothing (KS2 U3) |

- **The plan check** (RF1 accepted: "the pause-at-crossing check once per new item and band"): a P1 take is required once when an item enters retraining, and again each time T_w first rises above 1.25 × the tempo of the last plan check. A wrong placement on a plan check gets one line naming the places, then one repeat. A second wrong placement suggests marking own fingering ("Your positions end elsewhere. Mark your own fingering?"). That is a suggestion, not a grade.
- State per item and hand: `{ bpm: T_w (nps), rung, planAt (nps) }`.

### 5.4 G: The crossing cell
- **Generator** `crossingCell(drill, site)`: the notes from 2 before the crossing to 2 after it. Engel 1997: the hand changes 1–2 keystrokes ahead (RF2 §1, §5). Played as SP §15.4 bursts: the cell, a one-beat rest with the click going on, repeated 4 times.
- **Tempo:** first take at 1.10 × T_w; each clean take +1 mark, up to 1.25 × T_w. After a miss: stop-and-go (rest after each cell).
- **Grading:** the `burst` goal (SP §15.4). Kind `fingering`, never qualifying. Full click.
- Used in the block, in visits, and after a second slip at one tempo.

---

## 6. The day-1 block (O1)

### 6.1 When it runs
It starts from an accepted offer, the item page, or a teacher pin. It always comes **after the item's cold take of the day** (R1, §9.1).
- **Key session:** it replaces the rung's next speed or review visit for that item (KS2 §5, SP §3). Never inside coordination stages A-1…A-5 or B-1…B-5.
- **Rotation (SP §2, once built):** it replaces the item's next visit. It counts as one visit, but with its own budget (it exceeds the cap of 6).
- **Old coach, linear path and assignments:** the next take of the item starts the block, then the climb resumes.
- **Standalone (item page):** a short coach run: the cold take first if the item is cold, then the block. The session length is the block's.
- **Not** when the item is not acquired, in the level test, in a `!` session (unless a teacher pinned it), or on a mic setup that expects MIDI (IS R3 stops the take anyway). On a plain mic setup the block runs C, G and straight takes only (unverified, §5).

### 6.2 Steps (budget 8 minutes, hard)

| # | Step | Takes | Tempo | Verified |
|---|---|---|---|---|
| 0 | The brief (first appearance only, §14.3): one line, plus the fingering numbers on the score | — | — | — |
| 1 | The cold take, if not yet played today and the item is cold (R1). Touch point 1 after it if clean. | 1 | SP cold tempo, or §11.2 during retraining | report |
| 2 | Blocks A, the flagged hand first (both if unknown, RH first) | 1 per hand | ♩60 or comfort | grouping |
| 3 | The vanishing pause C, flagged hand alone (HS), P1 (the plan check) → P0 | 3–6 | T_w | placement |
| 4 | The crossing cell G at the named site | 2 | 1.10–1.25 × T_w | burst |
| 5 | Hands together (HT items only): C from P2 → P0 | 2–4 | T_w | placement |
| 6 | **Closing:** straight takes at one mark below today's edge, ending on a clean take (end-on-success +2, SP §1). Touch point 2 after the top one. | 2–3 | E − 1 mark | report |

- About 12–18 takes for a two-octave scale at ♩100–130 with count-in (RF2 §8.2: one take ≈ 20–25 s).
- When the budget ends, the step in progress finishes its take, then step 6 runs (at least 2 takes).
- One line closes the block: "Left hand holds to ♩116. Next: the pause, down to a quarter." (§14.4)

### 6.3 After the block
State → `retraining`; `blockDay` = today. From the next day: visits (§7). The block does **not** repeat on later days unless the fingering changes (R3), the player asks from the item page, or a recheck fails twice (§11.3). This is the evidence for mixed over separate: blocked practice retains worse after the first day (RF2 §8.2, Abushanab & Bishara 2013; Shea & Morgan 1979).

---

## 7. The fingering visits (from day 2, while flagged)

### 7.1 Eligibility
An item gets a fingering visit in a session when all hold:
- its state is `retraining`, or it is `flagged` with a T3 report in the last 7 days. A data-only flag without an accepted offer gets **no** visits: the player decides first;
- its cold take of the day is done (R1);
- the session has ≥ 10 minutes;
- this session has had no fingering visit of that item yet (**at most 1 per item per session**) and fewer than **2 items** with fingering visits;
- the feel-pool order (SP §16.3): never on consecutive visits of the item, and at least every third visit of the item straight.

### 7.2 Content (3–4 takes, about 1–1.5 min)
1. **G**, one take of the crossing cell of the flagged group (kind `fingering`).
2. **C**, one take at the item's current rung and T_w (kind `fingering`). The plan check replaces it when due (§5.3).
3. **One or two straight takes** at min(the session tempo − 1 mark, the R2 cap). These are ordinary takes of their normal kind and count as usual (SP §16.5). The visit ends on a straight take (end on success, SP §1).

- **B** replaces step 2 on every third fingering visit (variety; RF2 §5, Bangert 2014 partial).
- **Key session:** a fingering visit can take the place of one speed or review visit of the flagged item (A-6, B-6 for scales' forms, closing excluded). It never touches coordination stages. Budget `VISIT_TAKES` + the end-on-success extension.
- **Old coach, linear path:** the same three steps, inserted once per session after the item's first clean straight take that is not its cold take.

---

## 8. The report (O4)

### 8.1 The two touch points, per item, per day
1. **Cold:** after the day's cold take of an item in state `flagged`, `retraining` or recheck-due, **only when that take is clean**. The habit is strongest cold (RF2 §9, Hardwick 2019).
2. **Top:** after the top take of a climb of a `flagged` or `retraining` item. That is the last straight pulsed take of the item's visit, when it was clean and at the visit's highest tempo. The coach knows it when it decides to leave the visit (limit, target, budget, or the R2 cap). In the block, it is the closing's top take.

- Each touch point fires **at most once per item per day**.
- No other take asks, including every fingering take: the structures are verified by MIDI instead.
- **The question is narrow** (RF2 §6.1): it names the place from the flag. Example: "Way down, at F♯: fingering right?" Without a named place: "Fingering right?"

### 8.2 The window
- **Opens** when the take has been judged and the piano has decayed: no key held, and ≥ 0.8 s since the last note-off, or 2 s after the last written onset, whichever is first.
- **Lasts 3 s.** The line shows: "Fingering? top key = right · bottom key = slipped."
- **Hands-free:** the next count-in waits until the window closes or is answered. KS2 D6's 4-s countdown starts after that.
  - A note **outside** the answer zones closes the window as *no answer* and acts as "continue", as now.
  - Notes in the zones never start a take.
- **No answer** = nothing: no edge change, no ladder move.
  - After 2 unanswered windows in a day, one reminder line: "Top or bottom key after the take; or let it be."
  - After 2 more, no questions that day.

### 8.3 The grammar
| Input | Right | Slipped | Which hand (HT takes only) |
|---|---|---|---|
| **MIDI keys** | a key in the **top zone** | a key in the **bottom zone** | a second press within 2 s: bottom zone = left, top zone = right. No second press = hand unknown (§9.4). |
| **Sustain pedal** (CC64) | a full press and release under 600 ms; `pedalInvert` respected | — | — |
| **Computer keyboard / foot switch** (keys or a page-turner) | Space, PageDown, → | ↓, PageUp | then ← = left, → = right |
| **Voice** (optional; Settings, off by default) | "כן" / "yes" | "לא" / "no" | "שמאל" / "left", "ימין" / "right" |
| On-screen tap (fallback only) | ✓ | ✗ | L / R |

- **Zones.** The top zone is notes ≥ max(the item's highest note + 7, devTop − 5). The bottom zone is notes ≤ min(the item's lowest note − 7, devBottom + 5).
  - devTop and devBottom are the highest and lowest notes this MIDI input has ever sent, kept in the device profile per input name and never synced (device-settings rule). The defaults are 96 and 36 (a 61-key board) until wider notes are seen.
  - If a zone is empty (the item spans the keyboard), MIDI keys don't answer; the pedal, keys or voice do.
- **Voice** listens only after the decay rule above, with a closed vocabulary. It fails silently back to keys (RF1 §2.1: he-IL recognition is server-side, about 0.5–1.5 s latency).
- The report notes are never part of a take: the window opens only after the take is judged.

### 8.4 The spot check (honesty anchor; RF1 §2.2)
When the report is "right" but the take is a **break take** at a crossing (§3.3), one follow-up question asks the same keys, naming the place: "Way down, at F♯, it caught. Thumb?" Its answer replaces the report. At most once per item per day.

### 8.5 What a report changes
Only the item's fingering state: the edge (§9.4), the ladder (§5.3), retirement (§11). **Never** the take's verdict, history, passes, cold record, rank, XP, stars, Momentum, leagues or badges (§14).

### 8.6 One question per take
A take that has a touch point never gets H2 §7's self-prediction question too. The self-prediction moves to a later take.

---

## 9. Rules

### 9.1 R1: after the cold take
- **No fingering take of an item comes before that item's cold take of the day** (RF2 §8.2: otherwise it warms the item and fakes a cold take).
- Fingering takes are sounding takes: they **do** update the cell's `lastSound` (H2 §1.4), so they can never be cold themselves.
- **The new-key blocks (§10) are the only fingering takes that may come first in a cell.** On a first appearance there is no cold take to protect, because the item has no history in that key.
- Guard: every planner (key session, rotation, old coach, list runs, standalone) asserts that the cell's cold take is done, or impossible, before a fingering take.

### 9.2 R2: the plain-climb cap while retraining
- **Who:** an item in state `retraining`, per hand flagged. The cap is the lowest over the flagged hands.
- **The cap** = E + 1 mark (in nps, played on the marks).
- **What it caps:** every plain straight take of the item:
  - the key session's speed-stage climb (A-6, B-6), the flow pulse (KS2 D3), D5 targets, the closing;
  - the old coach's climb and the over-target climb (SP §2.5);
  - rate-keeping feels (SP §16.4: plain runs with an accent or swing still rehearse the movement);
  - **challenge takes** (SPEC-CLIMB-SYNC §2): off for the item while it is retraining, because a challenge is a plain run well above the climb.
- **What may go above:** C with a pause of P3 or longer, B, G. A clean straight take at the cap is followed by one of these at cap + 1 mark, never by the same straight take again. That keeps KS2 D3 ("every clean take raises the next one") and H10 (difficulty keeps rising) without rehearsing the slip.
- **Exempt (rank and passes are never affected; O5):**
  - the cold take and every counting cold check or confirmation at the probe band (H2 §1.6);
  - the placement probe;
  - level-test takes;
  - teacher assignment targets for the submission.

  They play at their own tempo. A slip there is answered at touch point 1 like any cold take.
- **The cap moves** with E (§9.4). A rise applies from the item's next visit, never within the visit that raised it.
- **Lifted** at retirement, at "Stop fingering work", or when the fingering changes (R3; the new fingering starts its own flag).
- **`!` sessions:** the cap still applies, because it is a safety rule. The take line says "Held at ♩116 while the fingering settles." (**Q3**)

### 9.3 R3: one fingering per item
- Never alternate the old and new fingering of an item "to compare" (RF1 §1.1 interference, Brashers-Krug 1996).
- A change of `fsig` (own fingering marked, unmarked, or a number changed) resets the item's fingering state. A retraining item restarts with a block on the next appearance; the old state is archived in telemetry.
- The app never shows two fingerings for one item in one session.

### 9.4 The edge
Per item and hand, in nps:
- **Start:** from T1, one mark below c*. From T2, one mark below the slower break take. From a report, §below. From a manual start with no data: the item's last clean session tempo.
- **"Right" at tempo t** (touch point 1 or 2): E = max(E, t).
- **"Slipped" at t:** E = min(E, one mark below t). The floor is the item's comfort pulse.
- **Hand unknown on an HT take:** the slip applies to the flagged hand. If both or neither are flagged, it applies to both.
- **Today's edge** = E after today's reports.
- **The established edge** = the highest t with "right" on clean cold takes on 2 distinct days (≥ 8 h apart, different local days; H2 §1.6 "later day"), with no "slipped" at ≤ t between them.
- E0 = E when the item entered `retraining` (for the goal, §11.1).

### 9.5 Teacher assignments and the mirror rule
- **Every rule here exists in both coaches** (`keyCoach.ts` and `coach.ts`; memory: key-session-must-develop), checked by a shared test (§18).
- **A teacher can pin "Positions"** on an assigned piano scale (the same switch as pinning a feel, SP §16.7):
  - the first session of the assignment runs the day-1 block (after the cold take), even without a flag;
  - later sessions of the assignment run one fingering visit each.
- **`!` (exactly this exercise):** no fingering visits or blocks unless the teacher pinned "Positions". R2 still applies (§9.2).
- **The submission** adds `{ fgRung, fgEdge, fgReports }` for a pinned item, labelled "the student's report" for the edge. The teacher digest may show it. No teacher text goes into push (class-notifications rule).

### 9.6 The other existing rules, checked
| Rule | How this spec keeps it |
|---|---|
| **Count-in + click + visual now-cue on every timed take** | Every structure is timed (blocks one chord per beat). Count-in waits for Ready only where flows already do (level test). |
| **Click thinning** | Fingering takes always use the **full click**: the pause rungs need the grid (RF2 §9). Thinning state (`thinLv`, `thinRun`) is untouched and resumes on the next straight take. |
| **D1 floors** | Nothing during acquisition. New-key blocks are not pulsed-normal and never count toward the 2 (3) clean takes. |
| **Brief on first appearance only** | §14.3. |
| **Hands-free** | No taps. The report window delays the next count-in by ≤ 3 s. Visits and the block flow on their own. |
| **12 keys** | The map comes from each key's own fingering. Flags, edges, ladders and states are per item (key). |
| **Rubato then tempo** | A new item still starts in free time (KS2 §3.1). The block starts only on an acquired item, so it starts pulsed. |
| **IS input rules** | MIDI is required for verified checks. A take on a MIDI-expecting profile without a keyboard does not start (IS R3). A mid-take loss is a technical failure and moves no fingering state (IS R4). An `nc` take moves no fingering state and has no `nl` (IS R5). |
| **One screen** | Every structure fits the existing take screen; the comma marks and chords add no height. |
| **No toasts or notices** | Only end-line clauses and the item page (no-active-users rule). |
| **Rank by passes, V1, guard G** | Fingering takes are `fingering` kind (no passes); straight takes count as they are; cold and confirmation takes are exempt from R2 (§9.2). |

---

## 10. Blocks on a new key's first appearance (O7)

- **When:** the first appearance of a scale rung (v1: scales) in a key in the key session, in the speed or coordination flow, before A-1 / A-2.
- **What:** one Blocks take (A) per hand at comfort, kind `fingering`, RH then LH. With own fingering, the blocks follow it.
- **Skipped when:**
  - the probe marks A-1/A-2 passed (a clean probe, KS2 U2/D2; D4's probe at comfort in a new key);
  - A-1/A-2 were passed before in this key;
  - the setup is on mic;
  - the item lacks expected fingering at any crossing of the line;
  - the session is `!` (unless pinned).
- **Order with the probe:** the probe (A-3) runs first, as now. Only a missed probe, or no probe, leads to the blocks, then A-1.
- **Counts toward nothing:** not D1, not a coordination pass, not cold. It may come first in the cell (§9.1).
- **Brief** on first appearance in a run only: "Each position as one chord: you'll see where the hand moves."
- A failed grouping shows the groups once and moves on: one take per hand, never a gate.

---

## 11. Across days: confirmation, retirement, rechecks

### 11.1 The goal
G = min(E0 + 2 marks, 0.95 × the item's target), floored at the SP cold tempo. Retraining succeeds when the habit holds cold above the old edge.

### 11.2 The cold take while retraining
- When the SP cold tempo is below G and G is below the probe band, the item's cold take plays at G. It stays a normal qualifying cold take: SP grace for a miss, staircase and FSRS as usual.
- Below the probe band it was never a counting cold check, so passes and rank are untouched.
- In the probe band, the SP tempo is kept as is.

### 11.3 Retirement, rechecks, relapse
- **A confirmation** (per hand) = a clean cold take at ≥ G, reported "right" at touch point 1, that is not a break take (§3.3), and whose crossing residuals at the flagged group lie within the T1 lower band's mean ± max(20 ms, 2 × its SD).
  - This MIDI half means "right" alone cannot retire an item (§14.2).
- **Retired** (per item) when every flagged hand has confirmations on **2 distinct days** (≥ 8 h, different local days), with no "slipped" on that hand between them (strict, like H9's reset). Then:
  - R2 is lifted, visits stop, and T1/T2 go quiet for 21 days;
  - `recheckDue` = +7 days.
- **Rechecks:** on the first cold take on or after `recheckDue`, touch point 1 asks, even though the item is not flagged.
  - "Right" (and the MIDI half) → `recheckDue` = +21 days after the first recheck. After the 21-day recheck → `done`.
  - "Slipped" → back to `retraining` from the next session: visits and R2, E from that report, **no new block**.
  - A second failed recheck of the same fingering → one block again on the next appearance.
- **Breaks:** time away never changes the state. A state older than 60 days without a cold take returns the item to `flagged` with the old E kept, and asks nothing until it is played.
- **What the player is promised:** nothing about duration. RF2 §5: no piano study gives one, and 4 days was not enough in Hardwick 2019.

---

## 12. Drums: orchestrated stickings (O9, the second instrument)

### 12.1 The idea
On an e-kit the MIDI carries the pad, not the hand. **Orchestration** plays each hand on its own voice, so the pad proves the hand, exactly as blocks prove the position (RF2 §10). The owner tests on an e-kit over MIDI (memory: drums-tested-on-ekit).

### 12.2 Scope and mapping
| Shared design | Piano | Drums |
|---|---|---|
| Assignment per note | expected finger | expected hand (`ExpNote.hand`, the sticking in `drums.ts`) |
| The crossing | `u`/`o` from the fingering | a **lead change**: a double (RR, LL) or the stroke after it, from the sticking |
| The verified structure | A, B, C | **O** = orchestration: R strokes on voice V_R, L strokes on V_L |
| The pause ladder | C before each crossing | C before each double (the same rungs, same `pauseAtCrossings` with lead changes as sites) |
| The cell | G around a crossing | G around a double (2 strokes before to 2 after) |

- **Items:** rudiments with mixed stickings: paradiddles (single, double, triple, paradiddle-diddle), doubles, and six-stroke rolls. Not flams or drags in v1.
- **Orchestration default:** V_R = floor tom, V_L = snare. When the kit map lacks a floor tom, V_R = high tom. One switch in the drum settings swaps sides for left-handed players.
- **Generator** `orchestrate(drill, { R, L })`: the same rhythm, each stroke on its hand's voice. Graded by `drumAnalyze` on voice + timing. **A stroke on the wrong pad is a sticking slip at that index, verified.**

### 12.3 The drum flag and ladder
- **The drum per-note log** (F9): `takeTrace` returns null for drums today. Drums get a v3 `nl` with `h` = the expected hand, `e` = the expected voice note, `p` = the played voice note minus the expected one, `d`, `v`, `o` = null, `x` = `d` at a double, `.` otherwise, `f` = `R`/`L`. Calibration accounts only, as piano.
- **Triggers:**
  - D-T1: orchestrated takes with a wrong-pad stroke at the same sticking index, in ≥ 2 takes within 7 days in one 1.25× band;
  - D-T2: a T1-style shift of the double's local residual across bands on plain (one-surface) takes;
  - D-T3: a report.
- **The orchestrated tempo** is the verified edge: the highest clean orchestrated tempo on 2 distinct days. The plain climb's R2 cap = that edge + 1 mark while retraining.
- **The block and visits:** as piano, with O in place of A and B. Block: O at comfort → C on O (P1 → P0) → G → plain closing at one mark below the edge.
- **Report on drums:**
  - **crash** = right;
  - **two kicks within 400 ms** = slipped.
  - No hand question: the orchestrated takes locate the hand.
  - The answer window is the same: 3 s after the last stroke has decayed (≥ 0.8 s).

---

## 13. Guitar and bass
- **Picking and plucking direction:** skipped until a data signature exists (O10; RF2 §10: no verified way to see a direction).
  - When the per-note log covers guitar and bass (a later step), an odd/even timing or velocity split is tested offline first.
- **Fretting position** (MIDI guitar `PlayedNote.string/fret`): third in order after drums (RF2 §10). Not in v1.

---

## 14. Honesty, rewards and what the player sees

### 14.1 Reports earn nothing
- **No XP, rank, pass, star, Momentum, league, badge, streak or cap** comes from a report or from a `fingering` take's verdict (RF1 §2.2: the most important mitigation).
- **XP:** fingering takes earn the **practice-time XP** that every take earns from its active time (`drillTakeMs`), and nothing per clean result or per report (RF1 accepted).
- **A "slipped" never cancels anything:** the take's normal credit, a cold take's verdict, a pass. A cost for honesty would teach dishonesty (RF1 §6.5).

### 14.2 Why lying doesn't pay
- **"Right" doesn't retire an item alone.** Retirement also needs MIDI: no break take, and residuals back within the lower band (§11.3).
- **Escaping is free and honest:** "Stop fingering work on this item" (§4).
- **The spot check** catches a "right" on an audible break (§8.4).
- **Questions are rare and narrow** (two touch points a day, one place named; RF2 §6).
- **A per-player agreement score** κ (reports against T2 break takes) is kept once ≥ 20 reports exist. It weights only the offer ranking, never rank (RF2 §6.3).
- **The harness** (§18 G1) proves that no path leads from a report to rank, passes or XP.

### 14.3 Briefs (first appearance per run only; KS2 D6 countdown)
| Kind | en | he |
|---|---|---|
| Day-1 block | One fingering, slow first. We'll shrink the pause before each position change. | אצבוע אחד, קודם לאט. נקצר את העצירה לפני כל מעבר מנח. |
| Blocks (A) | Each position as one chord: you'll see where the hand moves. | כל מנח כאקורד אחד: תראו איפה היד זזה. |
| Position rhythm (B) | Make the last note of each position long. | הצליל האחרון בכל מנח: ארוך. |
| Vanishing pause (C) | Stop before each position change and place the hand. | עצרו לפני כל מעבר מנח והניחו את היד. |
| Cell (G) | Just the change, in short bursts. | רק המעבר, בהתפרצויות קצרות. |
| Drums, orchestrated (O) | Right hand on the floor tom, left on the snare. | יד ימין על הטום הרצפתי, שמאל על הסנר. |

### 14.4 Lines (one line each; matter-of-fact; no emoji)
| Moment | en | he |
|---|---|---|
| Report prompt | Fingering? Top key = right · bottom key = slipped. | אצבוע? קליד עליון = נכון · קליד תחתון = החליק. |
| Report prompt, with a place | Way down at F♯: fingering right? | בירידה, ב-F♯: האצבוע נכון? |
| Hand question (HT) | Which hand? Bottom = left · top = right. | איזו יד? תחתון = שמאל · עליון = ימין. |
| Spot check | Way down at F♯ it caught. Thumb? | בירידה ב-F♯ זה נתקע. אגודל? |
| Reminder | Top or bottom key after the take; or let it be. | קליד עליון או תחתון אחרי הנגינה; או לוותר. |
| Offer | Your left hand's way down in D major changes above ♩104. A fingering block next time? | הירידה של יד שמאל ברה מז'ור משתנה מעל ♩104. בלוק אצבוע בפעם הבאה? |
| Offer buttons | Yes · Not now | כן · לא עכשיו |
| Plan check, wrong | The pauses fell on E and B. The positions end on F♯ and C♯. Once more. | העצירות נפלו על E ועל B. המנחים נגמרים ב-F♯ וב-C♯. עוד פעם. |
| Plan check, second miss | Your positions end elsewhere. Mark your own fingering? | המנחים שלך נגמרים במקום אחר. לסמן אצבוע משלך? |
| Rhythm map miss | Long on E; the position ends on F♯. | ארוך על E; המנח נגמר ב-F♯. |
| Block end | Left hand holds to ♩116. Next: the pause, down to a quarter. | יד שמאל מחזיקה עד ♩116. הבא: העצירה, עד רבע. |
| End-line clause (visit ran) | Left hand, way down at F♯: pause down to a quarter. | יד שמאל, בירידה ב-F♯: עצירה עד רבע. |
| R2 hold | Held at ♩116 while the fingering settles. | נשאר ב-♩116 עד שהאצבוע מתייצב. |
| Retired | D major fingering holds cold on two days. Back to normal practice. | האצבוע ברה מז'ור מחזיק קר יומיים. חוזרים לתרגול רגיל. |
| Recheck relapse | The old fingering came back cold. Short fingering visits again. | האצבוע הישן חזר בקר. שוב ביקורי אצבוע קצרים. |
| Item page | Fingering ♩116 · your report | אצבוע ♩116 · לפי הדיווח שלך |
| Item page actions | Retrain this fingering · Stop fingering work | לאמן מחדש את האצבוע · להפסיק עבודת אצבוע |
| Settings | Suggest fingering work · Answer by voice | להציע עבודת אצבוע · לענות בקול |

Hebrew terms: "אצבוע" for fingering, as in `tendency.ts` and the coach. "מנח" for hand position. Every line is translated whole (i18n catalogs).

### 14.5 On screen (minimal; UI judgment is mine, moderate)
- **The take screen is unchanged.** Fingering takes show the stage-strip chip "Positions" ("מנחים"). The score shows the fingering numbers, the comma marks (C), the chords (A), or nothing extra (B).
- **The report line** sits where the verdict line is, and disappears on an answer or after 3 s. No new buttons in MIDI runs.
- **The item page:** one small line under the speed best, only once a state exists.
- **No new badge, star or celebration.**

---

## 15. Data model

### 15.1 Synced progress: `fingering` (under the fresh-start epoch)
```ts
interface FingerItem {
  v: 1;
  fsig: string;                                   // §1.1; a change resets (R3)
  state: 'flagged' | 'offered' | 'declined' | 'retraining' | 'retired' | 'recheck' | 'done';
  hands: ('R' | 'L')[];                           // flagged hands
  src: 'T1' | 'T2' | 'T3' | 'manual' | 'teacher';
  site?: { hand: 'R' | 'L'; idx: number; cls: 'u' | 'o'; down: boolean; pitch: number };
  since: string;                                  // ISO
  snoozeUntil?: string;
  edge: Partial<Record<'R' | 'L', number>>;       // E, nps
  edge0?: Partial<Record<'R' | 'L', number>>;     // E0
  goal?: number;                                  // G, nps
  est?: Partial<Record<'R' | 'L', { nps: number; days: string[] }>>;
  pause: Partial<Record<'R' | 'L', { nps: number; rung: 0 | 1 | 2 | 3 | 4; planAt: number }>>;
  blockDay?: string;                              // local day
  confirms: { hand: 'R' | 'L'; day: string; nps: number }[];
  recheckDue?: string;
  recheckStep?: 7 | 21;
  asked: { day: string; cold?: boolean; top?: boolean; spot?: boolean; unanswered: number };
  failedRechecks: number;
}
type FingerStore = Record<string /* itemId */, FingerItem>;
```
- It syncs like the other progress records, newest `since` wins per item.
- R2 and the planners read it. Rank, passes, XP and history never read it (guard G1).

### 15.2 Device only
- `fgZones[midiInputName] = { top, bottom }`: devTop and devBottom (§8.3), in the device profile (device-settings rule), never synced.
- The voice switch is a device preference: speech recognition varies by device.

### 15.3 Settings (synced)
- `fingeringOffer: boolean` (default true).

### 15.4 Take kinds and traces
- `TakeKind` gains **`fingering`**: `{ history: false, staircase: false, passes: false, tendencies: false }`.
- **Trace v4** (when F2 ships) adds `fg` on takes that have fingering content:
  ```ts
  fg?: { s: 'A' | 'B' | 'C' | 'G' | 'O' | 'straight'; p?: 0 | 1 | 2 | 3 | 4; plan?: boolean;
         map?: number[];                 // expected long or pause notes that were missed (indices), B/C
         rep?: 'r' | 'sR' | 'sL' | 's?'; tp?: 'cold' | 'top' | 'spot'; fsig: string }
  ```
  The report labels the take's own trace. That is the calibration bonus (RF1 Q5, accepted): T1 and T2 are tuned on real slips.
- `calibUpload` is unchanged: `fg` rides inside the trace.

### 15.5 Teacher
- An assignment option `fingering: 'pin' | undefined` and the submission fields (§9.5).

---

## 16. Telemetry
Everything rides on the take traces (SP §8: on the device, plus the calibration upload). There are no new tables.
- **Per take:** `nl` (v3) and `fg` (v4).
- **Per day, a device counter record** `fgDay`:
  - offers shown, accepted and declined;
  - touch points asked and answered, by input (key, pedal, voice, tap);
  - spot checks fired, and answers flipped;
  - the pause rung reached per item;
  - R2 cap hits (straight takes held at the cap);
  - unanswered windows.
- **Shadow mode first (F3):** on the calibration accounts, T1 and T2 compute flags and log them (`fgShadow` on the trace: group, c*, Δ, t) for 2–3 weeks without offering. The owner sees them in the calibration export, and the thresholds are fixed on that data (RF2 §7's three questions).
- **The camera** stays a later spike (RF1 §4, RF2 §4: side or 45° view fused with MIDI first). It is not specified here.

---

## 17. Build steps

| Step | Content | Size |
|---|---|---|
| **F1** | **Done (with this spec):** the per-note log, trace v3, the device-side trim, tests. | S |
| F2 | **Report input:** `reportWindow` (decay detection, 3 s, zones from `fgZones`, the HT second press, pedal, keys and foot switch, optional voice), hands-free count-in hold, the H2 §7 one-question rule, the reminder and fatigue rules. Trace v4 `fg`. | M |
| F3 | **Flags:** T1, T2, T3 on `nl` (pure `fingerFlags.ts`), per item and hand, with guards. **Shadow mode** on the calibration accounts for 2–3 weeks, then thresholds fixed with the owner. | S–M |
| F4 | **Structures:** `positionBlocks`, `positionRhythm`, `pauseAtCrossings`, `crossingCell` (and `orchestrate` stubs); their grading (grouping, map match, placement, burst). Tests in all 12 keys, both hands, own fingering. | M |
| F5 | **The ladder and the block:** `fingerLadder.ts` (rungs, drop-back, the plan check, the edge, the goal) and the block composer with its budget. A 3-day simulation (key-session-must-develop: never the same take twice at one tempo). | M |
| F6 | **Integration:** the key session (block in place of a visit, fingering visits, new-key blocks §10), the old coach and assignments (mirror, teacher pin, `!`), R1 in every planner, **R2** in every climb, challenge takes off. SP rotation hooks behind its own build. | M–L |
| F7 | **Across days:** cold tempo at G, confirmations with the MIDI half, retirement, the 7/21-day rechecks, relapse, breaks, the `fingering` store and sync. | S–M |
| F8 | **UI and copy:** the chip, the report line, the offer clause and buttons, the item-page line and actions, settings, briefs; he + en catalogs; screenshots at 320/390 widths; the contrast sweep. | S–M |
| F9 | **Drums:** the drum `nl`, `orchestrate`, the drum flag and ladder, the crash and double-kick report. | M |
| F10 | **Harness and review:** the honesty harness (G1), a simulation of R2 against rank, independent spec review rounds until clean **before** F2 (owner rules: review-until-clean, independent-review-before-release). | — |
| F11 (later) | Arpeggios: the same engine, with the held-key constraint (RF2 §3 F) as an extra structure. | M |
| Later | Structure H (the timing template) offline on 2–3 weeks of labelled logs (RF2 §12.4); the camera spike (RF1 §4). | L |

Order: F10's review first, then F2 → F3 (shadow) → F4 → F5 → F6 → F7 → F8. F9 after F8. `npx tsc -b` before every commit.

---

## 18. Guard tests

| # | Test |
|---|---|
| G1 | **Honesty harness:** for every path (reports at both touch points, the spot check, fingering takes of every structure, retirement, rechecks), rank, `passedAt`, the cold record, history, XP beyond practice time, stars, Momentum and leagues are byte-equal to a run with the same takes and no reports. |
| G2 | **R1:** in every planner, no `fingering` take precedes the cell's cold take on a day when the item is cold. The new-key blocks are the only exception, and only on a first appearance. |
| G3 | **R2:** a retraining item's plain straight takes never exceed E + 1 mark in the key session, the old coach, feels, the closing or the over-target climb; challenge takes are off. Cold checks, confirmations, the probe and level-test takes are not capped. Rank and passes are equal with and without R2 on the same take results. |
| G4 | **Develops:** in the 3-day simulation, no two consecutive takes of one item have the same structure, rung and tempo, except an "almost" hold. Difficulty (rung or tempo) rises after every clean take, including at the cap (H10). |
| G5 | **Per key:** a T1 shift injected in D flags only D. A constant early lean in E♭ at all tempi flags nothing. The owner's five-key class means reproduce §3.2 (D at ♩104, the rest quiet). |
| G6 | **Structures in 12 keys:** for every major and minor scale, both hands, 1–4 octaves, `pauseAtCrossings` lengthens exactly the notes before the crossings, `positionBlocks` groups match the fingering, and own fingering moves both. No crossing is claimed where the expected finger is missing. |
| G7 | **Verification:** B's map match passes the correct long-note set and names a misplaced one. C's placement detects a pause one note early. A fails a 2-group roll > 40 ms and an extra note. |
| G8 | **Report grammar:** zones from the device extremes; an empty zone falls back to other inputs; the HT second press; the pedal under 600 ms; zone notes never start a take; a non-zone note closes the window as no answer; at most one question per take (with H2 §7). |
| G9 | **Input source:** mic takes have no `nl` and move no verified ladder; `nc` takes move no fingering state; a mid-take MIDI loss leaves the state unchanged; blocks are never offered on mic. |
| G10 | **Retirement:** "right" reports alone (MIDI break takes present) never retire. Two clean confirmed cold days retire. A slip between them resets. Rechecks at +7 and +21 days. A recheck slip returns to retraining without a block; a second one brings a block. |
| G11 | **R3:** a change of `fsig` resets the state and starts no comparison takes. |
| G12 | **Mirror:** the same scripted player through `keyCoach` and `coach.ts` assignments gets the same R1, R2 and visit eligibility decisions. |
| G13 | **Drums:** orchestration maps each stroke's hand to its voice; a wrong-pad stroke is reported at its index; the plain climb is capped at the orchestrated edge + 1 mark while retraining. |
| G14 | **Copy:** every line here exists in he and en; nothing spoken contains a digit followed by letters (KS2 §6 `speakable`). |
| G15 | **F1 (exists):** `tests/noteLog.test.ts`: the size bound, the fields, a crossing at the right index from suggested and own fingering, none for mic, guitar/bass or `nc`, and the device-side trim. |

---

## 19. Open questions (owner)

1. **Q1, the fourth rung.** For eighth-note scales, "¼ beat" is already a sixteenth's length. I read the owner's "a sixteenth" as the next halving: ¼ IOI, which is ⅛ beat in eighths, so the ladder is 1 beat → ½ → ¼ → ⅛ → none. Or should the fourth rung be dropped (1 → ½ → ¼ → none)?
2. **Q2, the drum report gesture.** Crash = right and two kicks within 400 ms = slipped. Is that natural on your kit, or do you prefer another pad, such as the ride bell, for "slipped"?
3. **Q3, R2 in `!` sessions.** The cap applies there too (a safety rule), with a line saying so. Or should a teacher's "exactly this exercise" override it?
4. **Q4, the 14-day snooze** after "Not now": right length? A self-reported slip always ends it.
5. **Q5, the cold take at G** while retraining (§11.2): the cold take plays at the retraining goal when that is higher than the normal cold tempo and below the probe band. Passes and rank are untouched. Acceptable?
6. **Q6, D (accent the position start).** RF2 recommended it as a second position feel, but it was not in the accepted list, so it is out of v1. Add it?
7. **Q7, offers for data flags only.** Visits run only after the player accepts an offer, or after a self-reported slip. Should a strong T1 flag (t ≥ 5) start visits without asking?

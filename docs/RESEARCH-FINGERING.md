# Training correct fingering without a camera (research + proposal, 2026-11-28)

**Owner's question (2026-11-28):** MIDI can't see fingers. Up to some tempo a wrong fingering gets away with it. At high tempo, as in the D-major traces, the hand changes position mid-scale, mostly on the way down. Can the app train correct fingering with a hands-free tempo staircase, where the player confirms "played with the right fingering" with an easy input and a slip sends the tempo back down? What does pedagogy say, and is a camera feasible later?

**Short answer.**
- **Yes, the app can do this, but only as a coached self-report track.** It must never be a grade.
- **The pedagogy supports a slow, correct-first ladder.** It needs small steps, a drop-back on a slip, correct reps at the end, and a re-check across days.
- **The one claim MIDI can verify is the player's *plan*, not the fast execution.** A pause-at-the-crossing take shows where the player crosses. At speed, MIDI shows only *probable* breaks, and only when pooled across takes.
- **A camera is a later spike, not v1.** Top-view tracking reaches about 95 % per-note precision offline. But the case we care about is the thumb passing under the palm, and that is exactly the case a top camera sees worst.

---

## 1. Pedagogy: how fingering habits form and how they are retrained

### 1.1 What the evidence says

| Claim | Evidence | Strength | What it means for the app |
|---|---|---|---|
| A practised motor sequence is consolidated offline, mostly over sleep. Next-day gains are real. | Walker et al. 2002 (finger tapping, +20 % after sleep). Simmons & Duke 2006 (keyboard melody, gains after sleep). | Strong (lab); replicated in music | The fingering edge is judged on **a later day**, cold, not at the session peak. |
| A new mapping learned soon after an old one interferes with it. The old one is not erased. | Brashers-Krug, Shadmehr & Bizzi 1996 (interference within ~4 h). Krakauer & Shadmehr 2006 review. | Strong (reaching adaptation) | Don't drill the old and new fingering of one item in the same session. Don't alternate fingerings "to compare". |
| **Under time pressure, the old habit comes back even after days of practising the new one.** With enough time to prepare, the new one wins. | Hardwick, Forrence, Krakauer & Haith 2019, *Nature Human Behaviour*: after a remap, short preparation times unmasked the old response. | Strong (lab, 4-day training) | This is the owner's observation in lab form: **the old fingering returns at the tempo where preparation time runs out.** The track must find that tempo (the *fingering edge*) and work just below it. Slow practice alone will not remove the risk above it. |
| Learning with few errors builds a more implicit skill that holds up better under pressure and dual tasks. | Maxwell, Masters, Kerr & Weedon 2001 (errorless golf putting). Masters 1992 (reinvestment). | Moderate (sport; not piano) | Climb from a tempo where the correct fingering is easy. Keep the success rate high. A slip is a signal to step back, not to repeat at the same tempo. |
| The best amount of difficulty depends on skill. Too easy teaches little; too hard teaches errors. | Guadagnoli & Lee 2004 (challenge point). Wilson et al. 2019 ("85 % rule", for classification learning, an analogy only). | Theory + modelling | Aim for about 75–90 % self-reported clean at the working tempo: small steps up, a step back after a slip. |
| What predicts next-day piano performance is *how* you practise, not how much. Top pianists played at a controlled tempo, fixed errors at once, found the exact spot, and repeated it until it was correct and stable. | Duke, Simmons & Cash 2009 (JRME, advanced pianists, 24 h retention). | Moderate (n = 17, correlational) | Locate the slip (hand and place), repeat it correct at a lower tempo, and end on correct takes. |
| Recalling a skill and practising it modified strengthens it more than plain repetition (reconsolidation). | Wymbs, Bastian & Celnik 2016. | Moderate (one lab task) | Small variations between takes help: tempo steps, rhythm variants, the pause-at-crossing variant. A long run of identical takes does not. |
| Mental practice of a five-finger piano exercise changes the motor cortex much like physical practice, and adds to it. | Pascual-Leone et al. 1995. Bernardi et al. 2013 (pianists). | Moderate | An optional, silent "see the fingering" pass before a new tempo band. No UI needed: one line from Toni. |
| Scale timing gets less even and key velocity more variable as tempo rises. Unevenness gathers at thumb passages and at octave boundaries (motor chunks). | MacKenzie & Van Eerd 1990. van Vugt, Jabusch & Altenmüller 2012. Jabusch, Vauth & Altenmüller 2004 (MIDI scale analysis). | Strong (MIDI scale studies) | The signal we can see is real, but it exists in correct fingering too. A bump at a crossing is not proof of a wrong finger (see §3). |
| Experts change hand and finger movement with tempo: movements merge and anticipate. Slow and fast playing are not the same movement scaled. | Engel, Flanders & Soechting 1997 (anticipatory finger shaping). Furuya, Flanders & Soechting 2011 (hand kinematics). Furuya & Soechting 2012 (speed and finger independence). *Not re-checked this pass: cited from memory, no link.* | Strong (kinematics) | **This is the limit of slow practice.** It fixes *which* finger. It does not train the fast movement. The ladder must climb into the band where the habit breaks; staying slow is not enough. |
| Interleaving or varying practice helps retention more than blocking, even though it feels worse during the session. | Shea & Morgan 1979. Carter & Grahn 2016 (clarinet). Abushanab & Bishara 2013 (piano melodies). | Moderate | Use blocked practice to *find* the new fingering on day 1. After that, mix fingering takes into the normal spiral session (SPEC-SPIRAL-PRACTICE) instead of long blocks. |
| Thousands of hours of deliberate practice with feedback build expertise. | Ericsson, Krampe & Tesch-Römer 1993 (context only). | Contested in size | No direct design rule. |

**What research does *not* give us:** no controlled study fixes how big a metronome step should be, how many correct repetitions consolidate a new fingering, or the exact tempo at which a habit returns. Those are tradition and judgment. They are marked as such below.

### 1.2 Piano-pedagogy practice (tradition, not trials)

| Practice | Source | Status for us |
|---|---|---|
| Pick one fingering that serves the music, write it in, and never change it while learning. Changing fingering is the classic source of breakdowns. | Neuhaus, *The Art of Piano Playing*. Fraser, *The Craft of Piano Playing*. | Consensus across schools: **adopt**. Our "own fingering" per item is the written fingering. |
| Hands separately until the fingering is secure, then hands together. | Chang, *Fundamentals of Piano Practice*. Most teachers. | Consensus: **adopt** (RH, LH, then HT), as the coach already does. |
| Practise the hard spot in isolation, e.g. the 3–4 notes around a thumb crossing, before putting it back. | Chang ("parallel sets", "practise the difficult segment"). Duke 2009 behaviour. | **Adopt** as the remedy after repeated slips at one crossing. |
| Rhythm variants (long-short, short-long), accents, stop-and-go: pause *before* the crossing with the thumb already placed. | Common teaching (Chang, Fraser). | Widely used, little trial evidence. **Adopt** the pause-at-crossing variant, because MIDI can verify it (§3.3). |
| Thumb-over instead of thumb-under at speed. | Chang (strongly advocated). | **A school claim, contested.** Not a rule. We don't prescribe thumb technique. |
| No thumb-under: the arm moves laterally and the thumb follows; rotation. | Taubman school / Golandsky. | **A school claim.** Not adopted, not contradicted. |
| Mental practice with no instrument (read, then imagine). | Gieseking & Leimer, *Piano Technique*. | Supported by Pascual-Leone 1995. **Optional line.** |
| Raise the metronome by a few marks once it is secure. Back off when it is not. | Universal teaching tradition. Kageyama (bulletproofmusician.com) argues against grinding and for slow, accurate reps. | Tradition. Our step sizes come from it plus the challenge point. |

### 1.3 Design rules this gives

1. **Correct first, slow enough to be correct.** Start at a tempo where the player says the fingering is easy: rubato, then the slowest pulse (the rubato-then-tempo rule).
2. **Climb into the danger band; don't camp below it.** The habit returns where preparation time runs out (Hardwick 2019). Only practice near that tempo moves it.
3. **A slip steps back, then rebuilds with correct reps.** Never repeat a slip at the same tempo (Duke 2009, errorless learning).
4. **Isolate a crossing that keeps failing.** Use the cell around it, the pause variant, then put it back.
5. **The edge is judged cold, on another day,** not at the peak of the session (consolidation; the cold rule in SPEC-HOLISTIC-2).
6. **One fingering per item.** Never switch inside a session (interference).

---

## 2. Self-report input in a hands-free session

### 2.1 Options

| Input | Reliability | Friction | Notes |
|---|---|---|---|
| **Reserved keys** (MIDI: highest / lowest key) | Very high: a MIDI note is exact. The only failure is a wrong key. | Low. The hands are already on the keys. The top and bottom keys are far from any scale's range. | Works on 61/76/88 keys. Use the **highest and lowest key the device has sent**, or C8/A0 by default. Already fits "a note continues" from the hands-free rule. |
| **Sustain pedal tap** (CC64; `speech/midi.ts` already has a CC listener and pedal invert) | High when a pedal is plugged in. Scales are rarely pedalled. | Lowest: the foot answers, the hands stay. | Absent on many setups. Half-pedal noise: count only a full press-release under 600 ms. A stuck or inverted pedal is handled by the existing `pedalInvert`. |
| **Foot switch / Bluetooth page-turner** (AirTurn-type, sends key presses) | High. | Low, but needs hardware. Pianists who read from tablets often own one. | The **best path for acoustic pianists on mic.** It arrives as keyboard events and needs no new API. |
| **Spoken yes/no** (Web Speech) | Medium. Chrome's he-IL recognition is server-side. On-device (`processLocally`, Chrome 139+) has no confirmed Hebrew pack. iOS Safari goes through Siri. The piano bleeds into the mic during the take, though not after the decay. | Low *when it works*. Costs latency (about 0.5–1.5 s) and needs network. | Short closed vocabulary only: כן / לא / שמאל / ימין (yes / no / left / right). Listen only after the last note has decayed for 0.8 s or more. Fall back silently to keys. Toni's TTS was dropped, but recognition is a separate matter. |
| On-screen tap | Exact. | High: the hand leaves the keys, which breaks the hands-free rule. | Fallback only, never the main path. |

**Recommendation:**
- **MIDI setups:** a reserved-key grammar, with the pedal as an alias for "clean":
  - **highest key** = "fingering was right";
  - **lowest key** = "a hand slipped". On a hands-together take one follow-up note answers which hand: lowest = left, highest = right;
  - a **pedal tap** = "right" (same as the highest key).
- **Mic setups:** a foot switch if one is present, otherwise spoken yes/no/left/right after the decay. Keyboard keys (Space / ← / →) are the last fallback.
- **No answer within 3 s** = no answer. The take does not move the fingering ladder either way. After 2 unanswered takes, Toni gives one reminder line. It never blocks.

### 2.2 The honesty problem

People rate their own performance generously and miss their own errors. Music studies of self-evaluation accuracy show weak agreement with expert judges (e.g. Hewitt 2001; Bergee & Cecconi-Roberts 2002; *not re-checked this pass*). Pressing "yes" is also the easy path. Mitigations, in order of value:

| Mitigation | How | Cost |
|---|---|---|
| **The report earns nothing** | Fingering takes never touch rank, passes, stars or XP caps (§6). With no reward for "yes", the reason to lie disappears. | None. The most important one. |
| **Ask only after audibly clean takes** | A take that is not clean on notes or timing is already a miss. Don't ask; step back as the coach does now. | It cuts the questions by about a third. |
| **A data-triggered spot check** | When the player says "right" but MIDI shows a position-locked crossing bump (§3), Toni asks once: "the way down caught at F♯; was it the thumb?" Answered with the same keys. | Rare by design (the high-confidence threshold). |
| **Plan verification with the pause-at-crossing take** | The player pauses *before* each crossing. MIDI sees where the pauses fall. If they don't match the item's (suggested or own) crossings, the plan is wrong, and that is verified, not self-reported. | One take per new item or band. |
| **A confidence prompt** | Not recommended. A "sure / not sure" step per take adds friction for little gain. | n/a |
| **Random "which finger on F♯?" quizzes** | Not recommended as a key-press answer: a finger number can't be entered hands-free without a 5-key code. The pause take covers the same need, and verifiably. | n/a |

---

## 3. What MIDI timing can tell us about fingering

### 3.1 Research

- **Fingering *estimation from the score*** is a mature problem. Parncutt et al. 1997 built an ergonomic cost model. Nakamura, Saito & Yoshii 2020 used HMMs on the PIG dataset (309 pieces), with a match rate around 64.5 %. Human annotators agree with each other only about 71 %. Pretraining on video-extracted data raised the match to about 66.8 % (Moryossef et al. 2023). All of this predicts a *plausible* fingering from the notes. **None of it recovers the fingering actually used from performance timing.**
- **Fingering *from performance MIDI*:** I found no validated system. What exists is analysis of the timing artefact itself:
  - timing and velocity irregularity grows with tempo (MacKenzie & Van Eerd 1990);
  - thumb passages and chunk boundaries are where scale timing is least stable (van Vugt et al. 2012; Jabusch et al. 2004, used clinically to detect dystonia);
  - the thumb shapes its movement ahead of the passage (Engel et al. 1997).

  These say a crossing leaves a mark. They don't say a wrong fingering leaves a *different* mark.

### 3.2 Our own data: the owner's D-major session, 2026-11-28

38 traces, of which 34 were played with MIDI connected. The first 4 were mic-graded: the USB cable was out (SPEC-INPUT-SOURCE). Item: two-octave, hands-together eighths at ♩83–134, clean on most takes. `cls` = the class residual against local plain notes (ms, + = late). One take has only 1–3 crossings per class per hand.

| Class (D major, HT) | ♩ < 104 | ♩ 104–117 | ♩ 118–125 | ♩ ≥ 126 |
|---|---|---|---|---|
| **LH `xu`** (thumb under, going out = **down** for LH) | **−16.5** (n 6, sd 9.8) | **+8.8** (5, 4.0) | **+14.6** (5, 13.6) | +4.6 (17, 12.1) |
| LH `xo` (3/4 over, going up) | −12.5 | −2.2 | +1.4 | −5.8 |
| RH `xu` (thumb under, going up) | +3.0 | +4.0 | +6.9 | +4.1 (17, 9.6) |
| RH `xo` (3/4 over, going **down**) | −2.7 | +7.2 | +16.9 (sd 39.7: one outlier) | −6.6 |
| Plain-note SD, R / L | 9.7 / 8.4 | 7.2 / 7.8 | 6.5 / 9.0 | 8.3 / 10.0 |

**What this shows:**
1. **The LH thumb-under on the way down moves about 25–30 ms with tempo**: early below ♩104, late at ♩104–125. That fits the owner's report: "mostly on the descent". Correct fingering may produce such a shift too (the thumb's preparation time shrinks), so on its own it doesn't prove a slip.
2. **Single breaks are visible on failed takes.** Example: one take at ♩124 has RH `xo` at +96 ms and an RH SD of 55 ms, about 6 SD above normal. That is the shape of a mid-run position change. But the trace doesn't record *which* note it was.
3. **The plain-note pitch-class leans (`pc`) show no consistent spot** (all within ±8 ms). Whatever position changes happened, they did not land on one fixed note across takes.
4. **There is no ground truth.** We don't know which takes had a wrong fingering. The self-report in this proposal *creates* those labels, a calibration bonus (§7, Q5).

### 3.3 What we can realistically flag

| Signal | How | Expected precision / recall | Use |
|---|---|---|---|
| **A single large break at note k in one take** (a gap at least 3.5 × the local SD and at least 30 ms, in a run, not at a turn) | `perNote` at take time, against the local line already built in `tendency.ts` | Precision about 60–75 % for "a hand-position event"; the rest are smudges, a lapse, a near-miss. Recall for wrong fingering about 30–50 % at the fingering edge and about 0 % below it, by definition, since "you get away with it". | Trigger the spot check (§2.2). **Never** a verdict. |
| **A position-locked bump** (the same note late by 15 ms or more in at least 60 % of 8 or more takes in a tempo band, at a note with *no* suggested crossing) | Pool per tempo band (as P1 already pools at 10 or more takes) | Precision about 80 % for "something consistent happens there". The cause is uncertain: it could be a crossing of the player's own, black-key geometry, or a chunk boundary. | "The way down catches at F♯ above ♩120." Offer the track. |
| **A crossing class drifts with tempo** (like LH `xu` above) | `cls` pooled per band | Detects a change between bands, not its cause | Locate the fingering edge band for the offer. |
| **Plan check: the pause-at-crossing take** | The player holds before each crossing (a fermata about 1 beat). Measure where the long IOIs fall against the expected crossings. | **Precision and recall above 90 % for the plan** (a pause is unmistakable), if the player follows the instruction | The one *verified* fingering fact. Used on entry and as the honesty anchor. |
| Velocity dip or bump at the crossing | Already in `touch.ts` (`bumps`, `lateCross`) | Weak. Shaped dynamics and voicing confound it. | Supporting evidence only. |

**Bottom line:** MIDI can find **where and at what tempo** a hand's evenness breaks, and can **verify the intended crossing points** at slow tempo. It **cannot** say which finger played a note at speed. The fingering track rests on self-report, anchored by the plan check and the data-triggered spot check.

---

## 4. A camera (future)

| Aspect | State of the art |
|---|---|
| Hand tracking | MediaPipe Hands: 21 landmarks per hand, real time on desktop, runs in the browser (tasks-vision, WASM/WebGL) (Zhang et al. 2020). |
| Fingering from top-view video | **PianoVAM (ISMIR 2025):** MediaPipe Hands, then fingertip-in-key-area voting over the note's frames, fused with Disklavier MIDI. **95.6 % precision** on labelled notes (82.9 % on the hardest piece). About 13 % of notes had no candidate and 5 % several; those were corrected by hand. Failures: motion blur, shadows, multi-finger preparation. **Moryossef et al. 2023:** a CPM pose estimator on YouTube video, F1 0.97 (P 0.94, R 1.0). Failures: fingers hiding each other, fast motion, hands close together. |
| Datasets | PianoVAM; PianoMotion10M (Gan et al. 2024; video, MIDI and hand pose). |
| The hard case for us | **The thumb under the palm, at speed:** it is hidden from a top camera and blurred by motion. That is exactly the event we need. A side or 45° front camera sees the thumb better but loses key mapping. |
| Browser / phone | Laptop webcam (720p at 30 fps): workable for **after-the-take analysis**. Phone: needs a stand above the keys, 60 fps capture is not guaranteed through `getUserMedia`, and it heats the device. Real-time per-note feedback on phones is risky. |

**Recommendation:** not in v1. After the self-report track ships, run a **desktop spike** (about 2 weeks):
- record the video with the MIDI take, kept on the device only, never uploaded;
- afterwards, fuse each MIDI note-on with the frames around it to classify the finger, PianoVAM-style;
- show "finger at each crossing" for the slowest band only.

Go on to a feature only if:
- precision at the thumb crossings reaches 90 % or more at ♩ ≤ 100 eighths on the owner's setup;
- setup takes 2 minutes or less (keyboard corners are marked once).

Privacy: video never leaves the device. Owner's call (Q6).

---

## 5. What the app already has (code facts)

| Piece | Where | Relevance |
|---|---|---|
| Suggested fingering per note (`ExpNote.finger`), "help only, never graded; omitted where unsure" | `src/engine/drills/generate.ts` (header, line 241), `guitar.ts` | The expected crossing points. Never a grade. |
| Own fingering per item (numbers per note, 0 = not entered); the model stops naming fingers once any item is marked | `src/engine/drills/ownFingering.ts`, `src/ui/OwnFingering.tsx`, `src/engine/analysis/model.ts:228/298/368` | The fingering being trained = own if marked, else suggested. |
| Crossing classes per take: `xu`/`xo` from the *suggested* crossings (off with own fingering), plus `top`/`bot`/`oct`/`leap`, plain-note `pc` leans, hand SD | `src/engine/drills/tendency.ts` `takeTrace` (only class means are kept, not note positions) | §3 signals. A per-note crossing log is needed for "at note k". |
| `afterCrossing` and the crossing velocity bump / late crossing in touch feedback | `src/engine/drills/touch.ts:388–448` | Reusable. |
| Take kinds; `form` = no history, staircase, passes or tendencies | `tendency.ts` `TAKE_KIND` | **Fingering takes = `form`** (or a new `fingering` with the same zeros). |
| Tempo climb: `stepCap(nps)` (20 % at 2 nps down to 3.5 %), `stepQuality`, `gradedUp`, Maelzel grid, step back after 3 "almost" takes, "the limit for today" | `src/engine/drills/stages.ts:181/200`, `keyCoach.ts` (`ALMOSTS_BACK`, `STEP_TAKES`) | Reuse the grid. Fingering steps are about half of `stepCap`. |
| The old coach (teacher assignments, plan) | `src/engine/drills/coach.ts` (`TEMPO_STEP` 1.06) | Any rule here must exist in both (memory: key-session-must-develop). |
| Rubato first, then the tempo ladder | `rubato.ts`, `coach.ts` | The track starts rubato on a new item. |
| Cold takes (1 h or more since any take in the cell), the cold check, the item pass on later days, rank from passes + tier guard | `docs/SPEC-HOLISTIC-2.md` §1.4, H8–H11; `docs/SPEC-SPIRAL-PRACTICE.md` §4 | The re-check across days reuses the cold definition. Rank is untouched. |
| Tempo-band thresholds; "crossing bumps are not rush" (owner 2026-11-27) | `analyze.ts` `bandOfBpm`/`thresholds`; memory fingering-breaks-at-tempo | The track's offer uses per-band crossing data. |
| CC listener (sustain), pedal invert; Web Speech wrapper | `src/speech/midi.ts`, `src/speech/webspeech.ts` | Input options exist. |

---

## 6. Proposal: the fingering track

### 6.1 When it is offered
- **Auto-suggested** (one line at the end of a session, never mid-session) when either is true:
  - a crossing class of one hand shifts by 20 ms or more between adjacent tempo bands over at least 8 takes, or
  - a position-locked bump appears (§3.3).

  The line reads: "Your left hand's way down changes above ♩116. Want a fingering session on D major?"
- **Manual:** a "fingering" entry on any piano item that has fingering (`hasFingering`), and in the coach's item menu.
- **The owner's own case:** offered now on the D-major two-octave scale.
- **Scope v1:** piano scales and arpeggios (the `CLASSED_FAMILIES`). Guitar and bass have a different fingering problem, so they are out of v1.

### 6.2 Session flow (hands-free; every timed take has a count-in, click and visual now-cue)
1. **Brief (first appearance only):** "One fingering, slow first. After each clean take, top key = fingering was right, bottom key = a hand slipped." It shows the fingering on the score: own if marked, else suggested.
2. **Plan check (verified):** one **pause-at-crossing** take at a slow pulse. If the pauses don't land on the item's crossings, Toni says where they landed and repeats once, then moves on. On a second mismatch, the session suggests marking own fingering. No grading.
3. **Hands separate, then together.**
   - Start the hand that slipped (or both, RH first) at **the higher of ♩60 eighths and 70 % of the reported fingering edge**. Rubato first on a new item.
   - Hands together only after each hand has 3 confirmed-clean takes at its working tempo.
4. **The staircase, after each take:**

   | Take result | Next |
   |---|---|
   | Not clean on notes/timing (no question asked) | As the coach does today: same tempo once, then step back. |
   | Clean + "right" | **Up one step**: one Maelzel mark (about 3–5 %), i.e. about half of `stepCap` (tradition + challenge point; smaller than the speed ladder on purpose). Never the same take twice at one tempo: the key-session rule. |
   | Clean + "slipped" (hand H) | **Back two marks** (about 8–10 %). There, **3 confirmed-clean takes in a row** (the consolidation reps), with the first one in a rhythm variant (long-short), then climb again. |
   | A second slip at the same tempo today | That tempo is **today's fingering edge**. Run the **crossing cell**: the 4–6 notes around the reported (or MIDI-flagged) crossing of hand H, looped 4 times rubato, then 4 timed at the working tempo. Then put it back in the full item, 2 marks below the edge. |
   | No answer (3 s) | Repeat the tempo once; nothing counts. |
   | Data-triggered spot check fires | One question (§2.2), answered with the same keys; the answer replaces the report. |

5. **Closing:** 3–5 confirmed-clean takes **2 marks below today's edge**, ending on a correct take (Duke 2009). One line names the edge and the hand: "Left hand holds to ♩116. Tomorrow we start at ♩108."
6. **Length:** about 8 minutes by default, or a block inside the key session or today's plan (the session clock, CoachClock, shows what's left).

### 6.3 Across days
- **Next day: cold check first.** The first fingering take of the item when cold (SPEC-HOLISTIC-2 §1.4, 1 hour or more) is at **90 % of yesterday's edge**. Clean + "right": climb from there. A slip: step back 2 marks and run the staircase.
- **The fingering edge is "established" at a tempo** when it is clean + "right" on **cold checks on 2 different days**, 8 hours or more apart (mirrors H9). The track's target is the item's speed target. Once the established edge reaches it, the track retires the item to normal practice and gives a cold re-check after 7 days, then 21 days.
- **Spaced and mixed:** after day 1, fingering takes are mixed into the spiral session as short visits (2–4 takes) rather than long blocks (Shea & Morgan; SPEC-SPIRAL-PRACTICE).
- **One fingering per item.** Changing own fingering resets the item's fingering edge (interference).

### 6.4 Input
§2.1:
- **MIDI:** reserved keys, with the pedal as an alias.
- **Mic:** a foot switch, then spoken yes/no/left/right after the decay, then keyboard keys.

### 6.5 Rank and measurement
- **Self-report never raises anything.** Fingering takes are kind `form`: no history, staircase, passes, tendencies, stars, XP stretch bands or rank. A modest flat practice-time XP is allowed (owner Q3).
- **It never lowers anything either.** A "slipped" report does not cancel a take's normal credit, because a cost for honesty would teach dishonesty.
- **What is stored:**
  - per item: the fingering edge per hand (today's and established), the dates, and the reports;
  - per take: a **crossing log** (note index, hand, expected crossing, residual, report). This is new; the trace keeps only class means today.
- **Calibration bonus:** reports label the traces, so the §3.3 detector can be tuned on real slips (owner's calibration accounts only).

### 6.6 What the player sees (minimal UI)
- The usual take screen: score with fingering numbers, count-in, click, now-cue. No new buttons.
- After a clean take, one small line: "Fingering? ▲ top key · ▼ bottom key". It disappears once answered or after 3 s.
- At the end: one line plus the item's **fingering edge per hand** ("Left hand: ♩116 · Right hand: ♩126"), labelled as *your report*. No stars, no new badge.
- On the item page: a small "fingering ♩116" next to the speed best, only once a fingering track exists for the item.

### 6.7 Owner questions
1. **Reserved keys:** is the top key = "right" and bottom key = "slipped" (with a second press for which hand) acceptable, or do you prefer the **pedal tap = right** as the main gesture?
2. **The step size:** one Maelzel mark (about 3–5 %) up per confirmed take, back 2 marks on a slip. Is that "a little, then a little more" as you meant it?
3. **XP:** none, or flat practice-time XP only, given that self-report must never inflate?
4. **The pause-at-crossing take** as the opening check on each new item and band: is one take acceptable, or is it too much?
5. **Calibration:** may your reports in this track label your calibration traces, to tune the "probable break" detector?
6. **Camera spike** after v1 (desktop, video kept on the device, after-the-take analysis): yes or later?
7. **Auto-offer:** should the end-of-session line offer the track automatically when your crossings shift with tempo, or only from the item menu?

### 6.8 Build scope, in steps
| Step | Content | Size |
|---|---|---|
| F1 | **Crossing log** per take (note index, hand, class, residual, velocity) next to `TakeTrace`. Kind `form`. Unit tests on synthetic takes. | S |
| F2 | **Report input**: the reserved-key grammar (highest/lowest device key, a second press for the hand on HT), pedal tap, keyboard keys; voice after decay as an option; the 3 s window. | M |
| F3 | **Fingering staircase** engine (pure, beside `keyCoach`): steps, drop-back, consolidation reps, the edge, the closing. Mirrored where `coach.ts` runs assignments. A 3-day simulation test (key-session-must-develop rule). | M |
| F4 | **Pause-at-crossing variant** + plan check, and the **crossing cell** generator (the notes around crossing k, looped). | M |
| F5 | **Across days**: cold check at 90 % of the edge, established on 2 days, retire + 7/21-day re-check; mixed visits in the spiral session. | M |
| F6 | **Offer logic** from the per-band class shift / position-locked bump; the data-triggered spot check. | S–M |
| F7 | UI lines, he + en strings, item-page edge; brief on first appearance only. Screenshots at 320/390 widths, contrast sweep. | S |
| F8 | Independent spec review rounds before the build (owner rule), then a harness run of the honesty incentives (does any path let "yes" raise rank? Must be none). | — |
| Later | The camera spike (§4). | 2 weeks |

---

## Sources

**Motor learning**
- Walker, Brakefield, Morgan, Hobson & Stickgold 2002. Practice with sleep makes perfect. *Neuron* 35:205–211. https://doi.org/10.1016/S0896-6273(02)00746-8
- Simmons & Duke 2006. Effects of sleep on performance of a keyboard melody. *JRME* 54(3):257–269. https://doi.org/10.1177/002242940605400308
- Brashers-Krug, Shadmehr & Bizzi 1996. Consolidation in human motor memory. *Nature* 382:252–255. https://doi.org/10.1038/382252a0
- Krakauer & Shadmehr 2006. Consolidation of motor memory. *Trends Neurosci* 29:58–64. https://doi.org/10.1016/j.tins.2005.10.003
- Hardwick, Forrence, Krakauer & Haith 2019. Time-dependent competition between goal-directed and habitual response preparation. *Nature Human Behaviour* 3:1252–1262. https://doi.org/10.1038/s41562-019-0725-0 (preprint: https://www.biorxiv.org/content/10.1101/201095v2)
- Maxwell, Masters, Kerr & Weedon 2001. The implicit benefit of learning without errors. *QJEP* 54A:1049–1068. https://doi.org/10.1080/713756014
- Masters 1992. Knowledge, knerves and know-how. *Br J Psychol* 83:343–358. https://doi.org/10.1111/j.2044-8295.1992.tb02446.x
- Guadagnoli & Lee 2004. Challenge point. *J Motor Behavior* 36:212–224. https://doi.org/10.3200/JMBR.36.2.212-224
- Wilson, Shenhav, Straccia & Cohen 2019. The eighty five percent rule for optimal learning. *Nat Commun* 10:4646. https://doi.org/10.1038/s41467-019-12552-4
- Wymbs, Bastian & Celnik 2016. Motor skills are strengthened through reconsolidation. *Curr Biol* 26:338–343. https://doi.org/10.1016/j.cub.2015.11.066
- Shea & Morgan 1979. Contextual interference effects. *JEP: HLM* 5:179–187. https://doi.org/10.1037/0278-7393.5.2.179
- Pascual-Leone et al. 1995. Modulation of muscle responses evoked by TMS during the acquisition of new fine motor skills. *J Neurophysiol* 74:1037–1045. https://doi.org/10.1152/jn.1995.74.3.1037
- Ericsson, Krampe & Tesch-Römer 1993. Deliberate practice. *Psychol Rev* 100:363–406. https://doi.org/10.1037/0033-295X.100.3.363

**Music practice and piano motor control**
- Duke, Simmons & Cash 2009. It's not how much; it's how. *JRME* 56(4):310–321. https://doi.org/10.1177/0022429408328851
- Carter & Grahn 2016. Optimizing music learning: blocked vs interleaved practice. *Front Psychol* 7:1251. https://doi.org/10.3389/fpsyg.2016.01251
- Abushanab & Bishara 2013. Memory and metacognition for piano melodies: interleaved practice. *Memory & Cognition* 41. *Not re-checked this pass.*
- MacKenzie & Van Eerd 1990. Rhythmic precision in performing piano scales. In *Attention and Performance XIII*. https://doi.org/10.4324/9780203772010-12
- van Vugt, Jabusch & Altenmüller 2012. Fingers phrase music differently. *Front Psychol* 3:495. https://doi.org/10.3389/fpsyg.2012.00495
- Jabusch, Vauth & Altenmüller 2004. Quantification of focal dystonia in pianists using scale analysis. *Mov Disord* 19:171–180. *Not re-checked this pass.*
- Engel, Flanders & Soechting 1997. Anticipatory and sequential motor control in piano playing. *Exp Brain Res* 113:189–199. *Not re-checked this pass.*
- Furuya, Flanders & Soechting 2011. Hand kinematics of piano playing. *J Neurophysiol* 106:2849–2864. Furuya & Soechting 2012, speed invariance of finger independence, *J Neurophysiol*. *Both not re-checked this pass.*
- Kageyama, *The Bulletproof Musician* (slow practice, practice quality). https://bulletproofmusician.com
- UT Austin Center for Music Learning, Intelligent Music Practice (Duke's group). https://cml.music.utexas.edu/online-resources/intelligent-music-practice

**Piano pedagogy (tradition; school claims flagged in §1.2)**
- Neuhaus, *The Art of Piano Playing* (1958; Eng. 1973).
- Fraser, *The Craft of Piano Playing* (2003; 2nd ed. 2011).
- Gieseking & Leimer, *Piano Technique* (Dover reprint 1972).
- Chang, *Fundamentals of Piano Practice*. https://fundamentals-of-piano-practice.readthedocs.io/chapter1/ch1_topics/III.5.html
- The Taubman approach (Golandsky Institute): its claims are a school's, not trial-tested.

**Fingering estimation and video**
- Parncutt, Sloboda, Clarke, Raekallio & Desain 1997. An ergonomic model of keyboard fingering. https://static.uni-graz.at/fileadmin/_Persoenliche_Webseite/parncutt_richard/Pdfs/PaSlClRaDe97_FingeringModel.pdf
- Nakamura, Saito & Yoshii 2020. Statistical learning and estimation of piano fingering. *Information Sciences* 517:68–85. https://arxiv.org/abs/1904.10237
- Moryossef, Elazar & Goldberg 2023. At your fingertips: extracting piano fingering instructions from videos. https://arxiv.org/abs/2303.03745
- Kim et al. 2025. PianoVAM: a multimodal piano performance dataset (ISMIR 2025). https://arxiv.org/abs/2509.08800
- Gan et al. 2024. PianoMotion10M. https://arxiv.org/abs/2406.09326
- Zhang et al. 2020. MediaPipe Hands: on-device real-time hand tracking. https://arxiv.org/abs/2006.10214

**Speech input**
- MDN, `SpeechRecognition.processLocally`. https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally
- Chromium, Intent to Ship: On-device Web Speech API. https://groups.google.com/a/chromium.org/g/blink-dev/c/VNOok2dbmHM

**Self-assessment accuracy (cited from memory, not re-checked this pass)**
- Hewitt 2001, *JRME* 49:307–322.
- Bergee & Cecconi-Roberts 2002, *JRME* 50:256–268.

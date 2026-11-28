# Training correct fingering, round 2: more options, built into normal practice (research, 2026-11-28)

**Follows:** `docs/RESEARCH-FINGERING.md` (round 1: a self-reported fingering staircase, reserved-key confirm, pooled MIDI break flags, camera later). The owner liked it and asked for more research and more options before any build. Then the owner added two questions:
- **Should fingering training be part of regular practice, a separate track, or a mix?** The owner doesn't know, so this doc decides it on evidence (§8). Regular practice here means the key session, spiral rotation visits, cold takes, hands-free runs, the feel layer, click thinning, the coach end line and teacher assignments.
- **Does the same problem exist on the other instruments**, and can one design cover several (§10)?

**Short answer.**
- **MIDI can verify more than round 1 said, but never the finger itself.** Exercise structures can verify the *position map*: where each hand position starts and ends. They can also verify that the player prepared each crossing. That covers the usual high-tempo failure, an extra or misplaced position change. The tools are blocked positions, position-aligned rhythms and accents, and a **vanishing pause** that shrinks the preparation time at each crossing. Finger *identity* at speed stays unverifiable without a camera.
- **Integrated, separate or mixed is an open question, decided here on evidence (§8): mixed wins.**
  - **A short focused block** when a fingering is being (re)learned: day 1, or when a new fingering is adopted. Blocked practice suits first acquisition, and a new mapping needs undisturbed attention.
  - **After that, short integrated visits.** Interleaving and spacing win for retention, and the habit returns under time pressure, so the fast end needs daily exposure across keys.
  - **Two rules come from the evidence, not from convenience:**
    - fingering takes must come **after** the item's cold take. Otherwise they warm the item up and fake a "cold" take;
    - on an item in retraining, the normal speed ladder must not keep climbing **above** the reported fingering edge with the plain run, or it rehearses the slip.
- **Keep self-report, but make it small and well placed.** Ask one narrow question after the day's **cold take** and after the top take of a climb, not after every take. Skilled pianists detect their own slips internally (error signals about 70 ms *before* a wrong note; Herrojo Ruiz et al. 2009). What's unreliable is *reporting* (Bergee & Cecconi-Roberts 2002). So the report is anchored to verified takes and earns nothing.
- **Round 1 overstated one claim.** In experts, finger coordination patterns stay largely *the same* from normal tempo to the fastest tempo (Furuya & Soechting 2012). "Slow practice doesn't train the fast movement" is weaker than stated. The stronger explanation stays Hardwick et al. 2019: the old habit wins when *preparation time* runs out. That points at preparation-time exercises (the vanishing pause, cell bursts) more than at a tempo staircase alone.
- **The owner's data show the D-major descent shift is item-specific.** Across 5 keys (157 MIDI takes), the left-hand thumb-under lateness at speed is **not** repeated in C, E♭, G or B♭. Of the 6 takes with a large break, 4 have their biggest residual at a *descending* crossing. The traces keep only class means, so none of the new exercise structures can be tested on stored data. §7 lists what to log.
- **Other instruments (§10).**
  - **Guitar has the best case.** A per-string MIDI guitar already reports string and fret (`PlayedNote.string/fret`), so the fretting-hand *position* is verified outright.
  - **Drums can verify the hand by orchestration** (R on one pad, L on another) and possibly by a per-player hand signature.
  - **Bass is like guitar but rarely has MIDI.**
  - **Voice has no real analogue.**
  - **One shared design covers piano, guitar, bass and drums.** Each note has an intended assignment (finger, string/fret, stroke or hand). A structure turns that assignment into something the input can see, and a narrow report covers what stays hidden.

---

## 1. Round 1 citations: checked and corrected

| Round 1 claim / citation | Check | Verdict |
|---|---|---|
| Furuya & Soechting 2012, cited for "slow and fast are not the same movement scaled" | Verified: *J Neurophysiol* 108:2060–2068, [PMC3545004](https://pmc.ncbi.nlm.nih.gov/articles/PMC3545004). 5 prize-winning pianists, right hand, 30 excerpts, normal tempo (125 ms between keystrokes) vs fastest (about 95 ms). **82–85 % of sequences kept the same movement cluster at both tempi.** Finger independence showed no tempo effect. Timing and velocity variability did not rise. No thumb-under or scales were studied. | **Corrected.** For experts, finger patterns largely *carry over* across tempo. Round 1's "slow ≠ fast" rests on Furuya, Flanders & Soechting 2011 and on secondary reports that wrist and shoulder velocities change with tempo. That points at proximal (arm/wrist) and anticipatory changes, not at different finger patterns. The tempo ladder is still needed (Hardwick), but the argument is preparation time, not "a different movement". |
| Furuya, Flanders & Soechting 2011, hand kinematics | Verified: *J Neurophysiol* 106:2849–2864 ([UMN record](https://experts.umn.edu/en/publications/hand-kinematics-of-piano-playing/)). One cited result (from the abstract, via a search snippet): **the thumb-under movement splits into two clusters by the direction of hand travel.** | Kept. It is the only kinematic evidence found that the thumb-under differs by direction (§2). |
| Engel, Flanders & Soechting 1997 | Verified: *Exp Brain Res* 113:189–199, [doi 10.1007/BF02450317](https://link.springer.com/doi/10.1007/BF02450317). Finger movements change **1–2 keystrokes before** the point where two sequences diverge (coarticulation). | Kept, and it gives a design rule: a "crossing cell" must start **at least 2 notes before** the crossing (§5). |
| Jabusch, Vauth & Altenmüller 2004, cited for "unevenness gathers at thumb passages" | Verified: *Mov Disord* 19:171–180. 8 dystonic vs 8 healthy pianists, MIDI scale analysis; the IOI SD tracks dystonia severity. | **Corrected.** It validates MIDI scale timing as a measure. It is **not** evidence about thumb passages. That claim remains unverified for both sources. |
| van Vugt, Jabusch & Altenmüller 2012/2013 | Verified 2013 paper: [*Front Psychol* 4:134](https://pmc.ncbi.nlm.nih.gov/articles/PMC3604639). Each pianist's C-major scale timing is a stable "fingerprint", 100 % identified across sessions (right hand, 8 notes/s). It is **movement-specific**: inward vs outward runs matched across hands better than runs giving the same sound (6.5 vs 7.6 ms, p = 0.03). It is inaudible and lasts 20+ months. No fingering variations, no thumb analysis. | Kept, with a new use: a timing template per item × hand could flag a *changed movement* (§3, structure H). That is a hypothesis. |
| Abushanab & Bishara 2013 | Verified: *Mem Cognit* 41:928–937, [PubMed 23508339](https://pubmed.ncbi.nlm.nih.gov/23508339/). 25 trained pianists: fixed-order practice was faster during training, random order faster 2 days later. Players **wrongly judged** fixed order better ("illusion of competence"). | Kept, and it now also matters for self-report (§6). |
| Hewitt 2001, cited for self-evaluation accuracy | Verified: *JRME* 49:307–322 ([SAGE](https://journals.sagepub.com/doi/10.2307/3345799)). It is about modelling + self-evaluation improving performance, not about accuracy. The accuracy paper is **Hewitt 2002, "Self-evaluation tendencies of junior high instrumentalists"**, *JRME* 50 (41 students). | **Corrected citation.** |
| Bergee & Cecconi-Roberts 2002 | Verified: *JRME* 50(3):256–268 ([SAGE](https://journals.sagepub.com/doi/10.2307/3345802)). Undergraduates' self-evaluation **correlated poorly** with instructors'. Over 5 sessions, self-scores **rose away from** the instructors'. | Kept, stronger than round 1 stated. |
| PIG: human agreement about 71 %, HMM about 64.5 % | The 64.1 % (LSTM) → 66.8 % (pretrained) figures are confirmed in [Moryossef et al. 2023](https://arxiv.org/pdf/2303.03745). The 71 % human agreement was not re-checked this pass. | Kept and marked. No 2024–26 paper estimates fingering from **performance timing** (§3.1). |
| Repp on legato key overlap | Verified: Repp **1995**, *JASA* (doi 10.1121/1.413065), digital piano. In pianists' own playing, overlap grows with tone duration, with large individual differences. Repp 1997 (computer-controlled grand) is cited from memory, *unverified*. | New in round 2 (§3, structure E). |

---

## 2. Why descents break more often

| Hand / direction | Movement | Evidence |
|---|---|---|
| **LH descending** (`xu`) | thumb **under** the hand, going out | Furuya et al. 2011: the thumb-under clusters by direction of travel (kinematic, verified from the abstract). Teaching sources say the thumb is passed **too late** in RH-ascending and LH-descending runs ([Yamaha Hub](https://hub.yamaha.com/music-educators/instruments/piano/piano-pedagogy-even-scales/); tradition). |
| **RH descending** (`xo`) | 3rd/4th finger **over** the thumb | Chang says rolling over the thumb is the *easier* passage ([Chang](https://fundamentals-of-piano-practice.readthedocs.io/chapter1/ch1_topics/III.5.html); school claim). Ortmann (via [pianoeducation.org](https://pianoeducation.org/pnovtscl.html)) says the hard part is the thumb's keystroke while it is under the hand, and that a hand shift covers the rest of the distance (tradition, 1920s lab work). |
| Both descents | The non-dominant direction for most practice? Practice usually starts upward, so descents get less attention. | *Unverified*: no study found. |

**There is no controlled study of up vs down failure rates in scales.** The asymmetry is plausible on kinematics plus teaching consensus, not proven.

**The owner's data (5 two-octave hands-together scales, 157 MIDI takes, 2026-11-27/28):**
- **Large-break takes** (a hand SD of 18 ms or more; normal is 7–12 ms): 6 takes.
  - In **4 of 6**, the largest crossing residual is at a **descending** crossing: B♭ ♩96 LH `xu` +52; B♭ ♩133 RH `xo` +50 / LH `xu` +32; D ♩124 RH `xo` +96; E♭ ♩83 LH `xu` −248 (early, likely a wrong or early note).
  - In 2 of 6 it is ascending: E♭ ♩132 RH `xu` +50; B♭ ♩112 LH `xo` +28.
  - That is consistent with "mostly on the descent", but n = 6.
- **Per key, the LH `xu` mean by tempo band** (ms, + = late):

  | Key | <104 | 104–117 | 118–125 | ≥126 |
  |---|---|---|---|---|
  | C | +5.7 | −1.8 | +13.0 | −11.8 |
  | D | −16.5 | +8.8 | +14.6 | +4.6 |
  | E♭ | −47 (one outlier) | −7.5 | −10.4 | −12.9 |
  | G | −9.2 | −2.0 | −10.0 | −14.7 |
  | B♭ | −3.0 | +2.1 | −3.6 | +6.5 |

  D's early-to-late swing is not general. E♭ and G lean **early** (rushing into the thumb) at every tempo. A fingering focus must be **per item (per key)**, triggered by that item's own data, never a global "your descents" claim.
- Class means carry 1–3 crossings per hand per take. They are too coarse to locate *which* crossing. Per-note logging (§7) is the precondition for every MIDI option below.

*(The cross-instrument view is in §10.)*

---

## 3. Exercise structures that make fingering checkable by MIDI

What a MIDI keyboard gives per note: pitch, onset, release (note-off), velocity. `PlayedNote` already carries `on`, `off` and `vel` at take time. The calibration traces store none of them (§7).

**Key distinction:**
- the **position map** is which notes a hand covers before it moves: the crossings. It *can* be verified by structure;
- the **finger identity** is which digit pressed a key. It *cannot* be verified without a camera.

Most high-tempo failures (the owner's "mid-run position change") are map failures: an extra shift, or a crossing one note early or late. A map failure is often also an identity failure, but the map is what MIDI can reach.

| # | Structure | What MIDI verifies | False positive / false negative | Pedagogical value | Mic? |
|---|---|---|---|---|---|
| **A** | **Blocking**: each hand position played as one chord, in order (D major RH: D-E-F♯ ▸ G-A-B-C♯ ▸ D…), then the same run unblocked | The position map: each group sounds together (onset spread under about 40 ms, as `touch.ts` already measures rolled chords), with nothing extra. A wrong grouping is unmistakable. | **FP (passes, still wrong):** any 3 fingers can block 3 adjacent notes, so 2-3-4 instead of 1-2-3 passes. Blocking also proves *knowledge* of the map, not that the linear run at speed keeps it. **FN:** hardly any; a rolled block is a timing fault, not a map fault. | Standard teaching ("blocking"; Chang's "chord attack" for parallel sets). Tradition, no trial. It builds the map and a hand-shape memory per position. | Weak: polyphonic onset detection by mic is unreliable. MIDI only. |
| **B** | **Position-aligned rhythm**: long on the *last note before* each crossing, short on the crossing (the reverse of a dotted pattern), so the preparation time sits exactly where the thumb moves | The rhythm only (exact). The fingers are trusted. | **FP:** it can be played with any fingering. It verifies that the player *knows where* the crossing is only when the long notes are placed by the player. So the score must **not** print the long notes: the player places them. That turns it into a verified map check. | Dotted and reverse-dotted rhythms are a universal teaching tool (F15 already exists). Aligning them with positions is the new part. It gives preparation time at the crossing, which is the variable in Hardwick 2019. | Yes (onsets only). |
| **C** | **Vanishing pause**: a fermata before each crossing, with the thumb (or the crossing finger) placed during the pause. The pause shrinks over takes: 1 beat → ½ → ¼ → a sixteenth → none | Where the pauses fall (each long IOI against the expected crossings), on every take until the pause is under about 20 % of an IOI. There it merges with the noise, and the take *is* the normal run. | **FP:** the player pauses in the right place but changes fingers in the pause. **FN:** none while the pause is measurable. | Round 1's pause-at-crossing take, turned into a **ladder on preparation time instead of tempo**. It is the most direct transfer of Hardwick 2019 (the old habit wins when preparation time is short). Stop-and-go is tradition (Chang, Fraser). | Yes. |
| **D** | **Accent the position start**: accent the first note of each position (usually the thumb) | Accent placement in note space (`touch.ts` accents: velocity contrast against a calibrated margin). | **FP:** the accent can be made with any finger. **FN:** accent shaping is hard at speed for some players. **Side signal (hypothesis):** a thumb is naturally heavier. An **unintended** velocity bump on a note that is *not* a position start may mark where the thumb really landed. `touch.ts` `fingers` already keeps velocity per suggested finger. *Unverified; testable once reports label slips.* | Moving accents are tradition (F15 "moving accent"). The accent groups the run by positions, which helps chunking (Engel 1997: anticipation spans 1–2 notes). | Partly (mic loudness steps are coarse). |
| **E** | **Key overlap at crossings** (note-off of note k minus note-on of k+1) | Legato through the crossing (a finger *passes*) vs a gap (the hand *lifts and jumps*). | **Weakest exactly at speed:** overlap shrinks towards zero as tempo rises (Repp 1995; Jacobs & Bullock, BU two-process model: overlap grows non-linearly as tempo slows; venue and year *unverified*). Fast scales are often played slightly detached. The pedal destroys it. Individual differences are large (Repp). | It supports a legato check at slow and medium tempo only. | No. |
| **F** | **Held-key constraint**: hold one key while playing the rest of the position (classic held-note exercises: Brahms *51 Exercises*, Dohnányi) | The hold (the note-off comes after the others). Holding one key while playing 4 notes on one side **forces** the held finger to be the outer finger (thumb or 5). | It verifies identity **only for full 5-note spans**. With 3–4-note scale positions, the held finger is ambiguous (thumb or 2). So it is useful for arpeggios and five-finger positions, not scale groups. | Tradition, strong for independence. Narrow for fingering. | No. |
| **G** | **Crossing-cell burst**: the 4–6 notes around one crossing (starting 2 notes before it), played as a fast burst, then joined to the next cell (Chang's parallel sets; the app's burst practice, SPEC-SPIRAL §15.4) | Burst evenness and speed. Not the finger. | The finger is trusted, but the report becomes **far more reliable**: one crossing, 5 notes, the attention on it. | Parallel sets: a strong school claim, no trial. It practises the fast movement itself, in isolation. | Yes. |
| **H** | **Timing template** per item × hand × tempo band: the per-note residual vector of clean takes | A take whose residuals at one crossing leave the player's own template (distance above about 3 SD of the template's take-to-take spread) | **Hypothesis.** van Vugt 2013 shows such templates are stable and movement-specific, so a changed movement should change them. Not shown for fingering changes. It needs per-note logs and labelled slips (from self-report) to validate. Expected recall is low below the fingering edge (by definition). | None by itself: it is a detector, not an exercise. | No (MIDI timing precision needed). |
| — | Silent pre-placement (fingers resting on the next position before playing) | Nothing: a key resting without being pressed sends no MIDI. | — | Tradition. Only a camera or a touch-sensing keyboard sees it. | — |

**What this changes from round 1:** round 1 had one verified fact (the pause take as a plan check). A, B and C give **three verifiable map checks**, and C is also a training ladder. None verifies the finger at full speed. A take that is verified at preparation time *p* and then shrinks *p* to zero is as close as MIDI gets.

### 3.1 Fingering from performance data: the literature
- **From the score:** PIG HMMs and LSTMs reach a 64–67 % match ([Nakamura et al. 2020](https://arxiv.org/abs/1904.10237); [Moryossef et al. 2023](https://arxiv.org/abs/2303.03745)). These predict a *plausible* fingering.
- **From performance timing or velocity:** still nothing validated as of 2026. The 2026 PiAnnotate paper ([arXiv 2605.23982](https://arxiv.org/html/2605.23982v1)) uses 3D hand meshes, not MIDI. It stresses that fingering is hard to label even with video.
- **The app's own advantage:** it knows the *intended* fingering per note (suggested or own). It only has to detect **departure from a known plan**, which is easier than estimation from scratch. Structures A–C turn that departure into a timing or grouping event MIDI can see.

---

## 4. Other sensors (feasibility in a browser PWA, 2026)

| Sensor | Real today? | Browser PWA | Accuracy for our case | Privacy | Verdict |
|---|---|---|---|---|---|
| **Laptop/phone camera, top view** + MediaPipe Hands (tasks-vision WASM) | Yes | Yes (`getUserMedia` + WASM/WebGL) | Offline research: 95.6 % per-note precision (PianoVAM, 82.9 % on the hardest piece). **The thumb under the palm is MediaPipe's known weak case** ([Stanford CS231A project, 2022](https://web.stanford.edu/class/cs231a/prev_projects_2022/Project_Finala.pdf)). No published real-time thumb-occlusion numbers. | Video stays on the device | Spike later (round 1 stands). |
| **Camera, side / 45° front** | Yes | Yes | Sees the thumb passage better. Loses the key mapping, so it needs MIDI fusion: MIDI gives the key, the camera only the finger. *Unverified; no published piano system found.* | Same | Spike variant worth testing first for the thumb. |
| **Dedicated IR hand tracking: ROLI Airwave** | **Yes, a shipping product** (2024): IR cameras, 27 joints per hand at 90 fps (vendor figures), "AI Music Coach" claims real-time fingering feedback ([ROLI](https://roli.com/product/airwave-learn), [TechCrunch](https://techcrunch.com/2024/10/08/roli-airwave-system-uses-ai-and-hand-tracking-to-teach-piano)) | **No:** closed, ROLI Piano + ROLI Learn app on iPad/Galaxy Tab only | No independent accuracy data | Vendor's | Not integrable. It is a **market signal**: fingering feedback by camera is now a product category. |
| **Smartwatch IMU** | Watches have IMUs | **iOS Safari has no Web Bluetooth** ([caniuse](https://caniuse.com/web-bluetooth)), and watches don't expose raw IMU over BLE anyway. Wear OS would need a companion app. | A wrist sees **hand shifts** (lateral jumps), not fingers. In principle it could detect "an extra position change". *Unverified for piano.* | Low risk | Not feasible in a PWA. Drop. |
| **Capacitive key sensing: TouchKeys** (McPherson, NIME 2012) | Research / Kickstarter overlay, no longer a mainstream product ([QMUL](https://www.eecs.qmul.ac.uk/~andrewm/touchkeys.html)) | Over MIDI/OSC | **Position on the key and contact area, not which finger.** It could see silent pre-placement and multi-finger contact. | — | Not available to users. Drop. |
| **MPE / MIDI 2.0** (Seaboard, Osmose, MIDI 2.0 keyboards) | Yes | Web MIDI is MIDI 1.0 messages (MPE works over it; MIDI 2.0 UMP is not in Web MIDI, *as far as known*) | Per-note pressure, slide and timbre. **No finger identity.** Pressure might show a finger resting before a press: speculative. | — | No help for fingering. Drop. |
| **Sustain pedal / foot switch** | Yes | Yes | An input, not a sensor | — | Round 1's input path stands. |

**Conclusion:** the only realistic extra sensor is the **camera**. Test a side or 45° view first for the thumb, fused with MIDI. Everything else is either closed (Airwave) or blind to finger identity.

---

## 5. Pedagogical alternatives to a tempo staircase

| Approach | Evidence | Strength | Use in the app |
|---|---|---|---|
| **Practise the transition, not the scale** (the crossing cell, starting 2 notes before) | Engel et al. 1997: movement changes 1–2 keystrokes ahead. Duke et al. 2009: top pianists isolate the exact spot. | Moderate (kinematics + correlational practice study) | Structure G. The cell starts 2 notes before the crossing and ends 2 after. |
| **Parallel sets / bursts** (Chang) | School claim, no trial | Tradition | G as bursts at or above the target speed, in a tiny span. The app already has bursts (§15.4). |
| **Hands-separate segments** | Universal teaching. The coach already has A-1/A-2. | Consensus | Only the hand that slipped. On HT items, a one-take HS visit of that hand. |
| **Variable practice** (rhythms, accents, preparation times) | Bangert, Wiedemann & Jabusch 2014 (36 music students, LH leap): **partial** support only, plus tentative speed/confidence benefits ([PMC4128393](https://pmc.ncbi.nlm.nih.gov/articles/PMC4128393)). Müssgens & Ullén 2015: variable practice helps **task-general transfer** only ([PMC4656827](https://pmc.ncbi.nlm.nih.gov/articles/PMC4656827)). Wymbs et al. 2016 (reconsolidation). | Moderate-weak for piano | A justification for B/C/D as *variations* inside visits, **not** a claim that variation retrains a fingering by itself. |
| **Interleaving** | Abushanab & Bishara 2013 (verified, piano melodies). Carter & Grahn 2016. Shea & Morgan 1979. | Moderate | It is already the rotation. Fingering visits become one more angle there. |
| **Mental practice** | Pascual-Leone et al. 1995. Bernardi et al. 2013 (pianists; *not re-checked*). | Moderate | One silent "see the positions" line before a vanishing-pause visit. No UI. |
| **Preparation-time ladder** (vanishing pause, rhythms with a long note before the crossing) | Hardwick et al. 2019 (verified in round 1): the habit returns at short preparation times even after 4 days of training. | Strong (lab), indirect (not piano) | Structure C: **the new primary ladder for fingering.** The tempo ladder still runs; C sits beside it. |
| **How long retraining takes** | No piano study found. Hardwick: 4 days was **not** enough to protect short preparation times. Lally et al. 2010 (66 days median to automaticity) is about everyday habits, *not motor*. Do not use it. | None direct | Promise nothing. Track the per-item fingering edge across **weeks**. Retire a focus only after cold confirmations on 2+ days (round 1 §6.3). |

---

## 6. Self-report reliability, and how to calibrate it

| Finding | Source | Implication |
|---|---|---|
| Self-evaluation correlates poorly with instructors', and drifts upward over sessions | Bergee & Cecconi-Roberts 2002 (verified) | Never let a report raise anything (round 1 kept). Expect "yes" inflation over time. |
| Self-evaluation accuracy in young players is low, and modelling doesn't fix it quickly | Hewitt 2002 (abstract-level) | The adult expert case is better (below), but don't rely on a beginner's report. |
| People misjudge which practice works ("illusion of competence") | Abushanab & Bishara 2013 | Don't let the player's feeling decide the schedule. The app schedules. |
| **Skilled pianists' brains flag a wrong note about 70 ms before it sounds, without auditory feedback** | Herrojo Ruiz, Jabusch & Altenmüller 2009, *Cereb Cortex* 19:2625 (18 professionals) ([Goldsmiths](https://research.gold.ac.uk/17812)). Maidhof et al. 2009 ([PMC2660409](https://pmc.ncbi.nlm.nih.gov/articles/PMC2660409)). | **Detection is not the problem for an expert.** Attention and reporting are. This is for wrong *notes*; finger slips that produce the right note are *unverified* but plausibly similar. |

**Design consequences:**
1. **Ask narrow, ask rarely.** "The way down, at F♯: thumb?" after a cell or a cold take beats "fingering right?" after a 2-octave HT run.
2. **Anchor to verified takes.** Blocking, the vanishing pause and the position rhythm check the map on each take. A report of "right" on a take whose MIDI shows a large break at a crossing triggers one spot question (round 1's spot check).
3. **Per-player agreement score.** Once per-note logs exist, compare reports with structure H's departures. Use the agreement (κ) as a trust weight for the *offer* logic only, never for rank.
4. **Reports label the calibration data** (calibration accounts), so H can be trained on real slips.

---

## 7. The owner's data: what we can test, and what to log

**Stored today** (`toneturn_calib_traces.trace` = `TakeTrace` v1): tempo, IOI, source, kind, verdict, lead, drift, sync up/down; per hand: n, SD, class means `[ms, count]` for `xu/xo/top/bot/oct/leap`, dir, pitch-class leans. 5 items (C, D, E♭, G, B♭ major, 2 octaves HT), 157 MIDI takes, 131 clean, ♩66–134.

**Can blocking, accents, overlap or the pause be tested on this?** **No.** There are no note positions, velocities, note-offs or chord onsets. Only §2's per-band class drift and break-take analysis is possible (done above).

**To log** (calibration accounts only; kind-independent; about 1–2 KB per take):

| Field per note | Why |
|---|---|
| index, pitch, hand, expected finger (suggested/own), crossing flag + class | Locate *which* crossing breaks (all options) |
| onset residual against the local line (ms) | H, the break detector |
| velocity (relative to the hand) | D, the thumb-bump hypothesis |
| note-off − next onset (ms) | E (overlap) |
| per take: structure (`block`/`rhythmB`/`pause:p`/`accent`/`cell`), pause length, report (`right`/`slip`/hand/none) | Labels and ladder state |

Then, after 2–3 weeks of the owner's normal practice, three questions get answered on real data:
- Does H's template flag the takes the owner reports as slips?
- Do unintended velocity bumps fall where a slip was reported?
- At what pause length does the map break per key?

---

## 8. Integrated, separate, or mixed? (the evidence)

### 8.1 The three models
- **Integrated:** fingering work only as angles inside normal visits.
- **Separate:** a standalone fingering session or track per item, round 1's design.
- **Mixed:** a short focused block when a fingering is being learned or retrained, then integrated visits.

### 8.2 The evidence, criterion by criterion

| Criterion | Evidence | Integrated | Separate | Mixed |
|---|---|---|---|---|
| **Interference with the tempo ladder** | Brashers-Krug et al. 1996: two conflicting mappings learned within about 4 h interfere. Here the target fingering is the same in both kinds of practice, *so the conflict comes only from takes where the old habit returns*. Hardwick 2019 says that happens at short preparation times, i.e. **at the top of the speed ladder**. Duke 2009 / errorless learning: don't repeat an error. | **Risky:** the key session rises on every *clean* take (key-session-must-develop), and a take with the old fingering sounds clean. Above the fingering edge, the plain speed ladder **rehearses the slip**. | Safe inside the session, but the normal ladder in other sessions still climbs past the edge with the old habit. | Safe **if** a flagged item in retraining caps its plain straight climb at the reported edge. Takes above it are variants (vanishing pause, cells, position rhythm), which change the movement context instead of repeating the slip. |
| **Cold takes and the level** | SPEC-SPIRAL §4: a cold take is the first *qualifying* take after 1 h. `form` takes don't touch `lastQual`. | Fingering visits before the cold take would **warm the item up and fake a "cold" take**. Fix: fingering angles only after the item's cold take of the day. | A separate session first thing does exactly this. It needs the same fix, or `form` takes must also close the 1-h gap. | Same fix as integrated (rule R1 below). |
| **Consolidation** | Sleep consolidation (Walker 2002; Simmons & Duke 2006). Spacing and interleaving beat blocking for retention, while blocking is better during first acquisition (Shea & Morgan 1979; Abushanab & Bishara 2013; Carter & Grahn 2016). | Good retention; weak first acquisition (a new map gets 3 takes, then the rotation moves on). | Good first acquisition; poorer retention if it stays blocked day after day. | Blocked on the learning day, spaced and mixed after: **the textbook schedule**. |
| **The habit returning under time pressure** | Hardwick 2019: still returns after 4 days at short preparation times. | Good: daily short exposure at the fast end, across keys (variable practice; Bangert 2014 partial support). | Concentrated: one item, one session. | Good. |
| **Motivation** | No direct study for fingering. Duke 2009: top pianists work *deliberately* on the exact spot, which needs a named goal. Abushanab: players prefer what feels better (blocked) even when it retains worse. *Judgment:* a separate remedial track risks feeling like a detour; an invisible angle risks the player not knowing why. | Low friction, little sense of a goal. | Clear goal, but remedial feeling and extra minutes. | A named goal on day 1 ("retrain the LH way down in D"), then low friction. |
| **Session time** | Arithmetic: a visit ≈ 3–4 takes ≈ 1–1.5 min for a two-octave scale at ♩100–130 with count-in. | About 1–1.5 min per flagged item per session. | About 8 min per item per day. | 8 min once, then about 1–1.5 min per flagged item. |

### 8.3 Verdict: mixed
1. **Day 1 of a fingering** (the player adopts or retrains one; or a flag fires the first time and the player accepts): **one focused block**, about 6–8 minutes.
   - Blocks (A), then the vanishing pause (C) down to its lowest clean rung, then the cell (G), then straight takes below the edge.
   - Inside the session, it replaces that item's normal visit. It is not an extra session.
2. **From day 2:** **integrated fingering visits** in the rotation (§9), only while the item is flagged.
3. **Retirement:** cold reports "right" on 2 different days at or above the item's target (round 1 §6.3). The item then returns to plain rotation, with a cold re-check after 7 and 21 days.
4. **Rules the evidence forces:**
   - **R1:** fingering takes of an item never come before that item's cold take of the day.
   - **R2:** while an item is in retraining, its plain straight climb in any session is capped at its reported fingering edge (+1 mark). Above it, the coach uses variant takes. *This conflicts with "rise on every clean take" (key-session-must-develop): owner decision Q5.*
   - **R3:** never alternate the old and new fingering of an item "to compare" (interference).

## 9. Integration map (the integrated part of the mixed design; rules checked)

**The principle:** after day 1, fingering work is an **angle of an item's visit**, chosen by that item's data. It uses the item's own tempo state, and it hands back to the straight run **inside the same visit**.

| Existing piece | How fingering work fits | Rule check |
|---|---|---|
| **D1 acquisition** (blocked until 2 clean pulsed takes; 3 for beginners) | On the **first appearance of a scale or arpeggio in a key**, the brief offers one **blocked-positions take per hand** (A) at comfort, kind `form`, before A-1/A-2. With own fingering, the blocks follow it. | D1 floors untouched: the block take is not pulsed-normal and doesn't count toward the 2 clean takes. The feel layer stays off during acquisition (§16.1). A is a brief companion, not a feel. |
| **Key session coordination stages** (A-1 … A-5, comfort tempo, pass at 2 clean) | No change. A 1-take vanishing-pause variant (C, ½-beat pause) may replace *one* take of A-1/A-2 on the first day in a new key. | Stage passes unchanged (the C take is `form`). |
| **Speed stage A-6 / B-6** (rises on every clean take) | **Self-report touch point 1:** after the **top take of the climb** (the take at which the ladder stops or the day's best), one narrow question about the item's flagged crossing, if one is flagged. Answered by reserved key or pedal (round 1 §2.1). | The answer never changes that take's verdict, pass or history. A "slip" sets the item's fingering edge and **schedules a fingering visit** (below). If R2 is approved, the plain climb stops at the edge and continues in variants. |
| **Rotation visits** (3–4 items, about 3 takes per visit, end on success) | **The fingering visit**, a new *angle* (like a feel): (1) one crossing-cell burst take (G) of the flagged crossing and hand, (2) one vanishing-pause take (C) at the item's session tempo, at the item's current pause rung, (3) one or two **normal straight** takes at one mark below the session tempo. The visit ends on the straight take (end-on-success extension as now). | It counts as a visit (cap 6). It sits in the feel pool: no repeat on consecutive visits; at least every third visit stays straight (§16.3). Takes 1–2 are `form`; takes 3+ are normal and count as usual. |
| **When it appears** | Only when the item has a **fingering flag**: (a) a self-reported slip on this item in the last 7 days, or (b) a per-item MIDI flag: a class drift of 20 ms or more between adjacent bands (8+ takes), a break take with its largest residual at a crossing twice in a band, or (later) an H departure. At most **one fingering visit per item per session**, at most 2 items per session. | No flag → never shown. No new UI beyond the stage-strip chip ("Positions"). |
| **The feel layer** (F15 dotted/groups/moving accent exists) | Add 2 **position-aware feels**: B (position rhythm, player-placed long notes) and D (accent the position start). They join the rate-keeping feel group for items with a suggested or own fingering, weighted up while the item is flagged. | Rate-keeping group: a shared ladder, never sets the straight plateau or limit (§16.4). Feel takes never pass (§16.5). |
| **Cold take** (first qualifying take after 1 h; drives the level) | **Self-report touch point 2:** after a cold take of a flagged item, the same one narrow question. This is the most diagnostic moment: the habit is strongest cold (Hardwick). | The cold take stays pulsed, straight, full click, unchanged. The report never touches `itemPass`, `cold`, `passLog` or rank. Fingering angles are never cold takes. **R1:** no fingering take of an item comes before its cold take of the day. |
| **Click thinning** | Fingering visits use the **full click** (the pause rungs need the grid). | As fixed-tempo items: never thinned. |
| **Hands-free runs, briefs on first appearance** | The "Positions" angle gets a brief on its first appearance in a run only (D5, `useBriefGate` seen set). Count-in, click and the visual now-cue on every timed take (timing-cue rule). The report window is 3 s after decay; no answer = nothing. | Fits brief-before-task: one short brief on the kind change, count-in waits for Ready. |
| **Coach end line** | One clause, only when a fingering visit ran: "Left hand, way down at F♯: pause down to a sixteenth." The pause rung reached is the item's fingering progress. | No toasts or notices (no-active-users rule). |
| **12 keys** | The position map comes per key from `ExpNote.finger` (suggested) or own fingering, so every key gets its own blocks, cells and rhythm placement automatically. Flags are **per item (= per key)**: §2 shows the owner's issues differ by key. The rotation across keys is natural variable practice. | Per key, no global claim. A key with no suggested fingering for a note ("omitted where unsure") gets no fingering angle at that crossing. |
| **Teacher assignments** (`coach.ts`) | A teacher can pin the "Positions" angle on an assigned item (like pinning a feel, §16.7). A teacher's "exactly this exercise" (`!`) turns it off, as with feels. | Mirror rule: every rule exists in both coaches. |
| **Rank / passes / XP** | Nothing from a report or a `form` take raises anything. Normal takes inside a fingering visit count exactly as normal takes. | Harness check: no path from a report to rank (round 1 F8). |

**The standalone part** is the day-1 block of §8.3. It starts in one of three ways:
- from a "Retrain this fingering" entry on the item page;
- from a teacher pin;
- when the player accepts the end-line offer after a first flag.

From day 2, it hands over to the visits above.

---

## 10. The same problem on the other instruments

| Instrument | The "fingering" problem | Pedagogy | What the input can verify | Fit with the shared design |
|---|---|---|---|---|
| **Guitar, fretting hand** | Position choice (which fret window and string for a note), shifts, finger per fret. The same note exists on up to 5 strings. A wrong *position* is the common speed failure, as on piano. | Systems: CAGED, 3-notes-per-string, one finger per fret within a position. Shifts practised as isolated slides (tradition). | **Per-string MIDI** (hexaphonic pickups, e.g. Roland GK, Fishman TriplePlay; the app already reads `PlayedNote.string/fret`, GUITAR-AUDIT B7) verifies **string and fret per note, so the position map is verified outright**. With one finger per fret, the finger is almost implied. **Mic:** pitch only; string choice from audio is research-grade (*no verified accuracy found this pass*). | **The best case.** Structure A (blocks = the position's chord shape), C (vanishing pause before a shift) and the position map all run on string/fret. No self-report is needed for the position with MIDI guitar. |
| **Guitar, picking hand** | Alternate vs economy picking; string crossing (inside/outside); a direction slip at speed (two downs in a row). | Strict alternate vs economy: two legitimate camps (practitioner sources, e.g. [Troy Grady](https://troygrady.com/reference/alternate-picking-reference/stringhopping/); no kinematic research found). The app shows strokes as help only (`guitar.ts`: "pick direction cannot be heard"). | **Single-note pick direction: not verifiable** by MIDI or mic, as far as found. Audio *strum* direction is detectable (CRNN F1 about 0.97 on strumming events, [Murgul et al. 2025](https://arxiv.org/html/2508.07973v1)), but that is strums, not single notes. **Hypothesis:** down and up strokes may leave an odd/even timing or velocity split, as hands do on drums. Testable with per-note logs. | Self-report (the narrow question) plus a possible odd/even signature (structure H generalised). Rhythm structures (B: accent on the downstroke beats) work. |
| **Bass, fretting hand** | One finger per fret vs Simandl (1-2-4); shifts. | Both are legitimate schools. Simandl suits low positions and long scales, OFPF suits higher positions and short scales (tradition). | Same as guitar if a bass MIDI pickup exists (rare, e.g. GK-3B). Otherwise pitch only. | As guitar with MIDI; as piano (self-report + rhythm/pause structures) on mic. |
| **Bass, plucking hand** | i–m alternation, raking (the same finger across strings going down), the "gallop" doubles. | Strict alternation vs raking: a style choice (tradition). | Not verifiable directly. **Hypothesis:** an i/m odd/even signature, as on drums. | Self-report + signature, as guitar picking. |
| **Drums (e-kit over MIDI)** | Sticking: paradiddles (RLRR LRLL), doubles, lead hand; a sticking slip at speed (e.g. a paradiddle collapsing into alternation). | Rudiments with fixed stickings (PAS 40 rudiments; tradition). The app already shows the sticking per stroke (`drums.ts` `hand`) and measures double-pedal kicks as odd/even (`drumMore.ts`). | **The hand is not in the MIDI.** Two ways to verify it: **(1) orchestration:** play the sticking with R on one voice and L on another (e.g. R floor tom, L snare). The pad then proves the hand, exactly like blocking proves the position. **(2) Per-player hand signature (hypothesis):** record a calibration line R-only and L-only, then classify strokes by velocity and timing. Fujii et al. 2010 ([PMC2957461](https://pmc.ncbi.nlm.nih.gov/articles/PMC2957461)): hands differ, but professional drummers show **less** asymmetry, so this signature fades with skill. | **Strong fit:** orchestration is a fully verified structure. Self-report only for un-orchestrated stickings. The owner tests on an e-kit, so MIDI is always present. |
| **Voice** | No real analogue. The loose one is **breath placement** (where to breathe in a phrase). | Breath marks (tradition). | Mic: a gap at the planned breath mark is verifiable (silence timing). | Only the "planned point" idea transfers (like the pause). Not worth a shared feature. |

**One shared design:**
- **The core is per note:** an **intended assignment** (finger / string+fret / stroke / hand) + an **observable structure** that makes the assignment visible to the input + a **narrow report** for what stays hidden.

  | Instrument | Observable structure |
  |---|---|
  | Piano | blocks, pause, position rhythm |
  | Guitar / bass with MIDI | string and fret, read directly |
  | Drums | orchestration by pad |
  | Everyone | the vanishing pause before the hard transition |

- **What can be shared:**
  - the "assignment flag" per item;
  - the day-1 block, then visits (§8.3);
  - R1 (after the cold take) and R2 (the plain-climb cap);
  - the report input (reserved key on piano, reserved pad on drums, a foot switch on guitar);
  - the per-note log.
- **What can't be shared:** the observable itself.
- **Build order across instruments:**
  - **piano first** (the owner's need);
  - **drums orchestration second:** cheap, fully verified, and the e-kit is the owner's test rig;
  - **guitar position third:** verified only with a MIDI guitar, which few users own;
  - picking and plucking direction stay self-report until a signature is shown on data.

---

## 11. Options menu

| | **1. Position checks only** (MIDI-verifiable) | **2. Data-triggered fingering visits** | **3. Cold-take report** (minimal self-report) | **4. Day-1 focused block** (round 1's staircase, shortened) | **5. Timing-template detector** | **6. Camera** (side/45°, after the take) |
|---|---|---|---|---|---|---|
| **What it trains** | The position map; preparation at crossings (A blocks, B rhythm, C vanishing pause) | The one crossing that breaks, at the tempo band where it breaks (G cell + C pause + straight takes) | Awareness of the habit at its strongest (cold) | Full replacement of an old fingering on one item | Nothing by itself: it finds slips | Finger identity |
| **Verified vs trusted** | Map and pause placement verified; fingers trusted | Cell evenness and pause verified; fingers trusted | Fully trusted, anchored by MIDI spot checks | Trusted, anchored by the pause take | Statistical departure from the player's own template: probable, not proof | Verified, about 90–95 % where the thumb is visible (to be measured) |
| **Evidence** | Moderate: tradition + Hardwick (preparation time) + Engel (anticipation) | Moderate: Duke 2009, Engel 1997, Hardwick 2019 | Weak for self-report in general (Bergee); good for expert error *detection* (Herrojo Ruiz 2009) | Moderate (round 1 §1) | Hypothesis (van Vugt 2013 indirect) | Moderate offline (PianoVAM); thumb occlusion unknown |
| **Hands-free experience** | A chip on a visit ("Positions"); blocks or pauses instead of the plain run; no questions | 3–4 takes in one visit, then back to the run; no questions | One key press after the first take of the day on a flagged item, and after the climb's top take | One focused 8-min block with a key press after each clean take | Invisible; feeds the flags of option 2 | Phone or laptop on a stand; setup once; video stays on the device |
| **Integration** | Brief companion on first appearance in a key (A); 2 position feels in the rotation (B, D); C as one take in A-1/A-2 on day 1 | A visit angle in the rotation and the key session's review visits, only on flagged items, ≤1 per item per session, always after the item's cold take (R1) | Rides on existing cold takes and the A-6 top take; displaces nothing | Replaces the item's normal visit on day 1 (6–8 min, after its cold take); from item page, teacher pin or an accepted offer; hands over to option 2 | Background, on calibration accounts first | A per-take toggle on fingering visits only |
| **Other instruments** | Drums: orchestrated stickings (fully verified). Guitar/bass with MIDI: position from string/fret (fully verified). Mic guitar/bass: rhythm/pause only. | Same engine on guitar (shift cells) and drums (sticking cells) | Same question with a reserved pad (drums) or a foot switch (guitar) | Same | Drums/picking: odd/even hand or stroke signature (hypothesis) | Guitar fretting hand: plausible, untested |
| **What it displaces** | One feel visit in three; 1 extra take on a new key's first day | One normal visit of that item per session | ~2 s per flagged item per day | That session's other plan | Nothing | Nothing (setup time) |
| **Build size** | M (position map from fingering, block and pause grading, 2 feels) | M (flag logic, visit composer, pause rungs per item) | S–M (reserved-key input exists in round 1's design, F2) | M (round 1 F3/F5) | L (per-note logging S, then research and tuning) | L (2-week spike + build) |
| **Risks** | Passes a wrong-finger player who knows the map; blocks are MIDI-only | Flags from coarse data until per-note logging exists; too few flags = never shown | Inflation over time; friction if it fires too often | If it repeats daily it becomes the blocked track that retains worse; honesty | May never separate slips from noise; needs labels | Thumb occlusion; privacy; phone heat |

## 12. Recommendation

**The mixed design of §8.3, built in this order:**
1. **Per-note logging** for calibration accounts (§7). Size S. Every later step needs it, and it can start collecting during normal practice now.
2. **Option 4 (day-1 block) + option 2 (fingering visits), with option 1's structures inside both.**
   - The vanishing pause (C) is the core ladder: it trains preparation time, the mechanism behind the owner's observation.
   - Blocks (A) open the day-1 block and a new key's first appearance.
   - The position feels (B, D) join the rotation.
   - Rules **R1** (after the cold take), **R2** (cap the plain climb at the edge while retraining; owner decision) and **R3** (one fingering).
3. **Option 3 (cold-take and climb-top report)** as the only regular self-report. Two touch points, one narrow question, reserved key or pedal. It labels the data.
4. **After 2–3 weeks of labelled data:** test **option 5** offline on the owner's logs. If it separates reported slips from clean takes, it becomes a flag source for option 2.
5. **Drums orchestrated stickings** reuse the same engine. It is cheap and fully verified on the owner's e-kit. Guitar position by string/fret follows for MIDI-guitar users.
6. **Option 6 (camera):** the desktop spike after that. Test a **side/45° view fused with MIDI** first, because the thumb is the case that matters.

**Why mixed rather than integrated-only or separate-only:**
- integrated-only gives a new fingering too little blocked attention on the day it is learned, and lets the speed ladder rehearse the slip above the edge;
- separate-only keeps blocking past the first day, which retains worse (Abushanab, Shea & Morgan), costs about 8 min per item per day, and needs the same cold-take fix anyway.

Before any build: independent spec review rounds until clean (owner rule).

## 13. Owner questions

1. **Mixed design:** one focused 6–8-minute block on the day a fingering is learned or retrained, then short fingering visits inside the rotation while the item is flagged. Agreed, or do you prefer a different balance?
2. **Vanishing pause as the main fingering ladder** (pause 1 beat → ½ → ¼ → a sixteenth → none at the item's tempo), alongside the normal tempo ladder: does that match how you'd retrain?
3. **Position rhythm with player-placed long notes** (the score does *not* show where the long note goes, so the app verifies that you know the crossing points): acceptable, or too much of a test?
4. **Self-report only twice:** after the day's cold take of a flagged item and after the top take of a climb. Enough, or do you want it on every take during a fingering visit?
5. **R2, the plain-climb cap:** while an item is in retraining, should its plain straight climb stop at your reported fingering edge (+1 mark) and continue above it only in variants (pause, cells, position rhythm)? The evidence says yes: otherwise clean-sounding takes with the old fingering keep climbing. But it bends "rise on every clean take". Rank and passes are never affected either way.
6. **Per-note logging** on your calibration accounts (pitch, timing, velocity, release per note; about 1–2 KB per take, server-side as now): OK to start now?
7. **Blocks on a new key's first appearance** (one take per hand, before A-1/A-2): useful, or does it slow down keys you already know? (Proposal: skip it when the probe marks A-1/A-2 passed.)
8. **Arpeggios:** include them in v1 (held-key constraint F works best there), or scales only first?
9. **Drums:** add orchestrated stickings (R on one pad, L on another, so the kit proves the hand) as the second instrument for this design? It runs on your e-kit.
10. **Guitar picking and bass plucking direction:** accept self-report only for now (no verified way to see it), or skip until a signature is shown on data?

---

## Sources

**Verified this pass**
- Furuya & Soechting 2012. Speed invariance of independent control of finger movements in pianists. *J Neurophysiol* 108:2060–2068. https://pmc.ncbi.nlm.nih.gov/articles/PMC3545004
- Furuya, Flanders & Soechting 2011. Hand kinematics of piano playing. *J Neurophysiol* 106:2849–2864. https://experts.umn.edu/en/publications/hand-kinematics-of-piano-playing/ (the thumb-under direction clusters read from an abstract snippet)
- Engel, Flanders & Soechting 1997. Anticipatory and sequential motor control in piano playing. *Exp Brain Res* 113:189–199. https://link.springer.com/doi/10.1007/BF02450317
- Jabusch, Vauth & Altenmüller 2004. Quantification of focal dystonia in pianists using scale analysis. *Mov Disord* 19:171–180. https://zendy.io/title/10.1002/mds.10671
- Van Vugt, Jabusch & Altenmüller 2013. Individuality that is unheard of. *Front Psychol* 4:134. https://pmc.ncbi.nlm.nih.gov/articles/PMC3604639
- Abushanab & Bishara 2013. Memory and metacognition for piano melodies. *Mem Cognit* 41:928–937. https://pubmed.ncbi.nlm.nih.gov/23508339/
- Hewitt 2001. *JRME* 49:307–322. https://journals.sagepub.com/doi/10.2307/3345799 ; Hewitt 2002, Self-evaluation tendencies of junior high instrumentalists, *JRME* 50 (abstract-level only).
- Bergee & Cecconi-Roberts 2002. Effects of small-group peer interaction on self-evaluation of music performance. *JRME* 50:256–268. https://journals.sagepub.com/doi/10.2307/3345802
- Herrojo Ruiz, Jabusch & Altenmüller 2009. Detecting wrong notes in advance. *Cereb Cortex* 19:2625–2639. https://research.gold.ac.uk/17812
- Maidhof, Rieger, Prinz & Koelsch 2009. Nobody is perfect: ERP effects prior to performance errors in musicians. *PLoS ONE*. https://pmc.ncbi.nlm.nih.gov/articles/PMC2660409
- Bangert, Wiedemann & Jabusch 2014. Effects of variability of practice in music: a pilot study. *Front Hum Neurosci* 8:598. https://pmc.ncbi.nlm.nih.gov/articles/PMC4128393
- Müssgens & Ullén 2015. Transfer in motor sequence learning: practice schedule and sequence context. *Front Hum Neurosci* 9:642. https://pmc.ncbi.nlm.nih.gov/articles/PMC4656827
- Repp 1995. Acoustics, perception, and production of legato articulation on a digital piano. *JASA* (doi 10.1121/1.413065).
- Moryossef, Elazar & Goldberg 2023. At your fingertips. https://arxiv.org/pdf/2303.03745
- Nakamura, Saito & Yoshii 2020. Statistical learning and estimation of piano fingering. https://arxiv.org/abs/1904.10237
- PiAnnotate 2026. https://arxiv.org/html/2605.23982v1
- McPherson 2012. TouchKeys. NIME. https://www.eecs.qmul.ac.uk/~andrewm/touchkeys.html
- ROLI Airwave (vendor; accuracy not independently tested). https://roli.com/product/airwave-learn ; https://techcrunch.com/2024/10/08/roli-airwave-system-uses-ai-and-hand-tracking-to-teach-piano
- Web Bluetooth support (iOS Safari: none). https://caniuse.com/web-bluetooth
- Fujii, Kudo, Ohtsuki & Oda 2010. Intrinsic constraint of asymmetry acting as a control parameter on rapid, rhythmic bimanual coordination (professional drummers). *J Neurophysiol* 104:2178–2186. https://pmc.ncbi.nlm.nih.gov/articles/PMC2957461
- Murgul et al. 2025. Joint transcription of acoustic guitar strumming directions and chords. https://arxiv.org/html/2508.07973v1
- Brashers-Krug, Shadmehr & Bizzi 1996; Walker et al. 2002; Simmons & Duke 2006; Shea & Morgan 1979; Carter & Grahn 2016; Hardwick et al. 2019; Duke et al. 2009: as listed and linked in round 1.
- Troy Grady, picking reference (practitioner source, not research). https://troygrady.com/reference/alternate-picking-reference/stringhopping/
- MediaPipe thumb occlusion at the piano (student project). https://web.stanford.edu/class/cs231a/prev_projects_2022/Project_Finala.pdf

**Teaching sources (tradition, not trials)**
- Chang, *Fundamentals of Piano Practice* (parallel sets, chord attack, thumb-over). https://fundamentals-of-piano-practice.readthedocs.io/chapter1/ch1_topics/III.5.html
- Yamaha Hub, even scales. https://hub.yamaha.com/music-educators/instruments/piano/piano-pedagogy-even-scales/
- Ortmann-based scale pedagogy. https://pianoeducation.org/pnovtscl.html
- Brahms, *51 Exercises*; Dohnányi, *Essential Finger Exercises* (held-note exercises).

**Not verified this pass (marked in the text)**
- Jacobs & Bullock, a two-process model for legato key overlap across tempos (BU record; venue/year unconfirmed). https://open.bu.edu/items/ee3547df-d786-4b26-a531-e93edb2bf945
- Repp 1997 (legato on a computer-controlled grand).
- Bernardi et al. 2013 (mental practice in pianists).
- PIG human inter-annotator agreement of about 71 %.
- Lally et al. 2010 (habit formation; cited only to rule it out).

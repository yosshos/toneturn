# The key session, round 2: a ladder inside every exercise (2026-11-25)

**The owner's test (2026-11-25):** piano, MIDI keyboard, key of the week C major, fresh profile. What happened:
- The scale started at ♩60 in quarters and jumped straight to ♩66 in eighths.
- It went right hand → left hand, then straight on to thirds. The linear scale never got:
  - both hands together;
  - a tempo climb;
  - 2, 3 or 4 octaves;
  - contrary motion.
- The thirds started at 2 octaves, and the 2-octave thirds repeat the top note.
- The narrator went silent after the first exercise or two, and read "3rds" as letters.

> "We have been specifying technique and practice by key for days and I don't see enough improvement. Specify it
> thoroughly, and make sure play-testers can use it today and say wow."

**This spec replaces** the parts of SPEC-KEY-SESSION §2–3 and SPEC-COACH-2 §1, §3, §4 that it contradicts.

## 0. Why it behaved that way (trace of the real code, 2026-11-25)

A simulation drives the real `keyLadder` → `coachStart/coachTake/coachAfter` with a scripted player. It reproduced the owner's session take by take.

| What the owner saw | Cause |
|---|---|
| ♩60 quarters → ♩66 eighths | The quarters stage is a fixed ♩60 for every item (`rubato.ts:18`). The next take starts at the item's catalogue tempo, ♩66 eighths. Notes per second went 1.0 → 2.2. |
| No tempo climb | A beginner passes an item at its *start* tempo, not its target (`coach.ts:425`, `skilled` false for a fresh profile). |
| RH, LH, then thirds | The tier-0 warm-up is `scales-1`: 1 octave, each hand only. Each level is one key, so passing LH passes the rung (`keyIndex.ts:683`). |
| No hands together, octaves or contrary | Tier gates. Hands together (scales-3) is a warm-up only at T2–3. Contrary motion (scales-4) opens at T2. 4 octaves opens at T6. A fresh profile is tier 0, and the placement probe is off for the key session (`noProbe`). |
| Thirds at 2 octaves | The harmonised ladder always builds 2 octaves (`harmLadder.ts:148`), at a fixed ♩60–110 eighths. That is item tier 4, opened at T0. |
| Repeated top note | The down loop starts at the top degree again (`harmLadder.ts:172-180`, and 191 for triads and 7ths). The same bug is in the guitar and bass arpeggios. |
| Narrator silent | Coach lines are not pre-recorded. Only on-device Kokoro speaks them. If one line generates slower than 1.5× real time, Kokoro switches itself off for the session (`engine.ts:155-163`), and every later line is only shown. |
| "3RDS" | `speakable` doesn't expand ordinals (3rds, 7th, 16ths…), digit patterns (1-2-3-5, 3-2 clave), lone Roman numerals, meters or parentheses. |
| The session ended early | The coach stops at 12 minutes (`SESSION_MIN`); the key button passes no length. |

## 1. The principle

**One exercise (a rung) is a ladder of stages.**
- Each stage adds one difficulty: another hand, both hands, more octaves, a different motion, more speed.
- The coach climbs the stages in order, like a teacher:
  - right notes first;
  - then a steady pulse;
  - then coordination;
  - then range;
  - then speed.
- **Coordination and range come before speed.** A speed limit ends only the speed stage, never the coordination stages: those are played at a comfortable tempo.
- **Evidence skips what is known.** A stage passed before in this key is skipped. A stage played clean *and easy* on its first take moves on at once. A player who already plays well reaches their real work in a few takes, not a few minutes.

## 2. The stages

### 2.1 The scale (block A), piano

| # | Stage | Range and motion | Opens |
|---|---|---|---|
| A-1 | Right hand | 1 octave, parallel | always |
| A-2 | Left hand | 1 octave | always |
| A-3 | Hands together | 1 octave, an octave apart | always |
| A-4 | Hands together, 2 octaves | 2 octaves | after A-3 |
| A-5 | Contrary motion | from the tonic (both thumbs on it), 1 octave out and back, then 2 | after A-4 |
| A-6 | Speed | hands together, 2 octaves, the tempo climb to the target | after A-5 |
| A-7 | 3 and 4 octaves | hands together | when A-6 passes its target |
| A-8 | 16ths, 4 octaves | the advanced form | T5+ |
| A-9 | Hands a 3rd, 6th or 10th apart; two dynamics; rhythms and accents | (existing rungs) | as now (T3–T4) |

### 2.2 The harmonised scale (block B: 3rds, triads, 7ths, cells)

| # | Stage | Range |
|---|---|---|
| B-1 | Right hand, broken | 1 octave |
| B-2 | Left hand, broken | 1 octave |
| B-3 | Right hand | 2 octaves |
| B-4 | Left hand | 2 octaves |
| B-5 | Together (3rds as double notes; chords blocked) | 1 octave, right hand, then left |
| B-6 | Speed | 2 octaves, each hand: the tempo climb |

- Hands together for broken 3rds, triads and 7ths is an advanced form (T4+, as now).
- **Opens:** a B rung opens when the scale in this key has passed A-3, not by tier alone. The scale comes first, always.

### 2.3 Guitar and bass

The same ladder, with positions in place of hands:
- one position (the box);
- then two positions joined;
- then 3 notes per string (guitar);
- then the whole neck;
- then speed.

Octaves follow the instrument's range.

## 3. Tempo, subdivision and notes per second

**The measure is notes per second (nps), never ♩ alone.**

1. **The first take of a new stage is free time** (rubato) only when the player has never played this rung clean in any key. Otherwise it starts at the pulse.
2. **The pulse starts at the player's own comfort.**
   - That is their last clean nps on this kind of exercise × 0.9.
   - It is never more than the tier benchmark.
   - A fresh player starts at 1.0 nps (quarters at ♩60).
3. **Changing subdivision keeps the nps.**
   - Quarters at ♩100 (1.67 nps) become eighths at ♩50 (1.67 nps), not eighths at ♩66.
   - A jump in nps of more than 10% between two takes is never allowed.
4. **The climb, the same for everyone** (the beginner rule that passed at the start tempo is gone):
   - two clean takes: +6%;
   - an easy clean take: +12%;
   - "almost": hold;
   - two misses at a new step: back to the last clean tempo.
5. **Quarters change to eighths** when quarters reach ♩120 (2 nps). Eighths are then ♩60.
6. **The step follows the quality of the take** (owner, 2026-11-25):
   - near-perfect (no wrong note, timing spread ≤ half the threshold): +10%;
   - clean and tight: +6%;
   - clean but loose timing: +3%;
   - almost: hold;
   - two misses: back to the last clean tempo.

   Never more than 10% nps between two takes.
   - **The step also shrinks with speed** (owner, 2026-11-25):
     - step = the quality step × a height factor × a near-the-best factor;
     - the height factor is 1 below 3 nps, 0.75 from 3 to 5, and 0.5 above 5;
     - the near-the-best factor is 0.5 within 10% of the player's best (or the target) on this rung in this key.
   - **Why:** the traditional metronome grid already steps about 4–6% at every height [C]. What grows with speed is the difficulty: above about 3–5 notes per second the motion turns from single notes into gestures, and teachers shrink the steps near the player's limit [C, common practice; no single published formula]. The numbers are our assembly [I].
   - **The grid:** ♩ is snapped to the traditional grid (40 42 … 60 63 66 69 72 76 80 … 120 126 132 … 200 208). A climb that is due always moves at least one grid step.
7. **A triplet feel while climbing** (owner, 2026-11-25):
   - The speed stage alternates eighths and triplet eighths: the same exercise over a beat of three, so the player also practises it on a beat that needs triplet eighths.
   - Switching keeps the nps and adds only the graded step: ♩ in triplets = ♩ in eighths × 2/3 × (1 + step).
   - The click, the count-in and the notation show three notes per beat.
   - The brief says: "Triplet feel: three notes per beat." 
6. **Coordination stages (A-2 … A-5, B-2 … B-5) are played at the comfort tempo.** They pass at 2 clean takes, or 1 easy take. They do not climb.
7. **The speed stage (A-6, B-6) climbs to the target.**
   - The target is the tier benchmark for the exercise, or the level's range.
   - It ends at the target, or at the player's limit.
8. **The limit (corrected):**
   - two takes that miss at a new step;
   - then back to the last clean tempo;
   - then a third take that does not climb.
   - A clean take repeated at the same tempo is the "two clean" rule. It is not a plateau.
   - **A limit can never be below the stage's start tempo.** If the player cannot play the start tempo clean, the stage goes down 10% and continues.

## 4. Where the player starts (no wasted minutes)

1. **The level test result, or the course self-report,** gives the starting tier:
   - new → T0;
   - "a bit" → T2;
   - "well" → T4.
2. **For a fresh player, the first stage is a probe.**
   - It starts with A-3 (hands together, 1 octave) at 1.5 nps.
   - Clean and easy: A-1 to A-3 are marked passed, and the session goes on at A-4.
   - Clean: A-1 and A-2 are marked passed.
   - Otherwise: start at A-1 in free time.
   - The same probe runs once per rung kind, with 3rds at B-3.
3. **Every stage passed is saved per key.** The next session resumes the rung at its first unpassed stage.

## 5. One session

- **The length:**
  - the session length chosen on the card, 30 minutes by default;
  - or the key page's "Practise this · N min";
  - the fixed 12 minutes is gone.
- **The order, at 30 minutes** (the thirds only once the scale has passed A-3, §10 S10):
  1. The scale (A), from its first unpassed stage, up to the end of A-5. At the start this takes about 8–12 takes, about 8 minutes. Once it is known, a 2-take warm-up.
  2. The next B rung from its first unpassed stage, until its speed stage or 8 minutes.
  3. One block in rotation (C licks, D fingers and independence, E cadences and voicings).
  4. **Closing:** back to the scale's speed stage (A-6) for 3 minutes. Interleaving: it ends on a climb.
- **Each rung's visit has a budget** (its share of the length). When the budget runs out, the rung stops at its current stage and resumes there next time. The coach says so: "We'll pick up both hands, 2 octaves, next time."
- **Never** move to the next rung while the scale's coordination stages (A-1 … A-5) are open at the player's tier, unless the scale's budget ran out.

## 6. What the player sees and hears (the "wow")

### The stage strip
A thin row above the music:

```
Right ✓  Left ✓  Both ●  2 oct  Contrary  Speed
```

- The current stage is marked.
- A passed stage gets a tick, and a small rise animation (reduced motion: none).
- Under it, a tempo bar for the speed stage: ♩now → ♩target, with the player's best marked.

### The brief (0.135.4) per stage
One line, for example:
- "Both hands, one octave apart.";
- "Contrary: both thumbs on C, move apart and back.";
- "Two octaves now.";
- "Faster: ♩72."

### The narrator
- **Short fixed phrases, pre-recorded** like the lessons, so every device speaks them. This includes phones without WebGPU, and a player who never reaches the speed check.
- The phrases:
  - "Right hand."; "Left hand."; "Both hands."; "Two octaves."; "Three octaves."; "Four octaves.";
  - "Contrary motion."; "In free time."; "Feel the pulse."; "Faster."; "Hold this tempo.";
  - "Clean."; "Almost."; "That's your limit today."; "Next: thirds."; and similar.
  - Tempi are said as numbers ("seventy-two").
- **No whole level titles spoken.**
- **`speakable` expands everything that slipped through:**
  - ordinals (3rds → thirds, 7th → seventh, 16ths → sixteenths, 10th, 9th, 6th…);
  - digit patterns: "1-2-3-5" → "one two three five"; "3-2 clave" → "three-two clave";
  - lone Roman numerals: "V" → "five", "I" → "one", in a chord context only;
  - meters: "6/4" → "six four";
  - parentheses dropped.

  Tests over all 689 key-ladder titles: no digit followed by letters, no lone Roman numeral, no "/" reaches the voice.
- **Kokoro's speed check never switches the voice off for the session.** A slow line plays, and the next lines use the recordings. Kokoro is used only for what has no recording.

### The end of a rung
One line and the strip: "C major scale: both hands, 2 octaves, contrary motion. ♩84 of ♩96."

## 7. The notation bug

**The fix:**
- Broken 3rds, triads and 7th arpeggios descend from the pair (or chord) below the top, never repeating it. In code, the down loop starts at `N − 1`.
- The same fix applies to guitar (`harmLadder.ts:589`) and bass (`bass.ts:1002`).

**The tests:**
- no adjacent repeated note at the turn, in every key, for every ladder kind and range;
- C major 3rds over 2 octaves ends …A5 C6 · B5 G5 …, 50 notes.

**1-octave forms are added** for 3rds, triads and 7ths (B-1, B-2).

## 8. How it is proven before release

1. **A session simulator in the test suite** (`tests/keySession2.sim.test.ts`) drives the real ladder and coach with scripted players. The expected take sequence is asserted:
   - **Fresh, every take clean:**
     - A: probe;
     - then A-3 to A-5 at comfort (a clean probe has marked A-1 and A-2 passed — U2; a missed probe starts at A-1 in free time);
     - A-6 climbing to the target;
     - then B-1 …
     - The scale is never left before A-5.
     - No nps jump above 10%.
   - **Fresh, limit at 2 nps:** A-1 to A-5 are still done, at ≤ 1.8 nps. A-6 stops at the limit, which is ≥ its start. Then B.
   - **Clean and easy (an advanced player):** the probe skips to A-4 within 2 takes. Thirds start at B-3.
   - **A 30-minute session:** the closing return to A-6 happens.
2. **The trace of the fresh session** is printed in the PR / report, so the owner can read the session before playing it.
3. **e2e:** the coach run in the browser (MIDI simulated), the strip and the brief per stage, and the narrator using a recording.

## 9. Order of work (today)

1. The notation fix and the `speakable` expansions, with tests. Small and independent.
2. The stage model:
   - stages per rung;
   - per-key passed stages;
   - comfort tempo in nps;
   - subdivision by nps;
   - the corrected climb and limit;
   - the probe;
   - the session length and budgets.

   With the simulator tests.
3. The stage strip, the tempo bar, the per-stage brief and the end-of-rung line.
4. The narrator phrases: write them, render them offline in English (Kokoro, af_heart, as the lessons), and the fallback rule.
5. Run the full suite, the coach e2e and the trace; release.

## 10. Decisions after the review (owner, 2026-11-25)

- **U1 The scale's visits.** The first visit plays the scale's open coordination stages, then the A-6 climb until the scale's budget runs out. The closing visit: A-6 below its target → back to A-6, resumed at the last clean tempo of the session (never a second climb from scratch); A-6 at its target → A-7 if open, else two takes at the target. A returning player with A-1 … A-6 passed warms up with two takes at 0.9 × their best, then goes on to A-7 (or the next open stage). A-7 opens once A-6 has passed.
- **U2** A clean probe marks A-1 and A-2 passed (§8 corrected).
- **U3 The step.** The graded per-take step replaces "two clean +6 % / easy +12 %": near-perfect +10 %, tight +6 %, loose +3 %, × the height factor (1 below 3 nps, ¾ from 3 to 5, ½ above 5), halved within 10 % of the best or the target, on the metronome marks. "Almost" holds and does not count toward the two-miss rule; only takes that are not clean count.
- **U4** If the start can't be played clean, the stage's start is lowered 10 % per step; the limit is never below the (lowered) start.
- **U5 One octave of a harmonised form** is one octave of roots: a 3rd / chord on every degree I … I (the top goes past the octave), turning without repeating the top.
- **U6 Comfort** is kept per exercise kind + hands + broken / together (octaves don't change it), and is capped by the item's target and the tier benchmark. Rungs already played by the B stages (3rds together, block triads, block 7ths in one hand) are left out of the session. The 10 % rule compares takes of the same kind and hands.
- **U7 Note values.** Triplets start only after an eighths take, then alternate with eighths. Going back to the last clean tempo returns to that take's note value and tempo. Once a rung has reached eighths it stays in eighths / triplets (no return to quarters), the closing included.
- **U8** B-6 is part of the harmonised rung's visit, within its budget.
- **U9** Every tempo shown says the note value actually played ("♩96 quarters · target ♩132"); targets are converted into the current note value; the tempo bar, the best mark and the end lines agree; the bar fills from the start side in Hebrew too.
- **U11** Every ♩ shown or played sits on the metronome (Maelzel) marks: 40 42 … 60 63 66 69 72 76 … 208.
- **U12** The key-of-the-week and key-page sessions last the daily practice length (Settings), not a fixed 30 minutes.
- **Lines.** Leaving a rung never says "Faster" / "Again" first; it says what passed and "We'll pick up here next time: <stage>." The end-of-rung line names the stages played in a sentence; a limit is not listed as passed; the session's last line names the real next stage. Hebrew lines are read phrase by phrase like the English ones.

- **S10 (review 3) The scale before the thirds.** The harmonised rungs (block B) never start before the scale has passed A-3. If A-3 is still open when the scale's budget ends, the scale's budget extends up to half the session; if A-3 is still open after that (or hit today's limit), the rest of the session goes to the other rungs (fingers and independence, cadences, licks), never to block B.
- **Review 3 (2026-11-25).** The closing is at most two takes at the target (or "A short review at this tempo." after a limit); spare time goes to open stages first and the closing starts only when nothing else fits — a session with nothing left ends early with its summary. The closing returns to the scale's first open stage (A-3/A-4/A-5 before A-6). A step back ("A little slower.") that fails again is today's limit; no more than six takes on one tempo step. At ♩40 the coach never says "slower": after four misses there, a hands-together stage is played hands separately once ("Hands separately first."), other items once in free time; failing after that, "Let's leave it for today." A stage at its limit comes back the same day only as a two-take review. After a missed probe the first stage starts at min(1.0 nps, 0.9 × the scale's comfort, 0.9 × the probe); a missed hands-together probe tries the right hand alone once at the probe's tempo. Rotating rungs keep each item's own tempo. Targets are shown in the note value they will be played in (eighths above ♩120 quarters); end lines give eighths rather than triplets. The session's last line always names the next stage.

## Owner 2026-11-26: it must develop, and flow

The owner's report after three days: every session started at ♪54 in eighths. It played the right hand twice, the left hand twice, both hands twice, two octaves, then contrary motion, all at ♪54. Every new stage waited for Ready, and the Ready button sat below a tall score, so it took a scroll to reach. This section replaces the rules it names.

- **D1 Comfort is never held at the tier benchmark.**
  - A player with a clean tempo on this comfort kind starts at 0.9 × that tempo. Only the item's target caps it.
  - The tier benchmark (§3.2) caps only a fresh kind.
  - Cause of the report: at tier 0 the benchmark is 1.8 nps, which is ♪54.
- **D2 One clean take passes a coordination stage.**
  - This replaces "two clean or one easy" (§3.6).
  - A clean probe also passes its own stage (S1 replaced). "Almost" and misses work as before.
- **D3 Every clean take raises the next one.**
  - The rung keeps a *flow* pulse: one metronome mark above its last clean take, never more than 10 %.
  - The next take starts at no less than the flow, including the next stage and the next item of a stage, so the tempo climbs across RH → LH → both → 2 octaves → contrary → speed.
  - A clean warm-up or review take is followed by one a mark faster. A review at today's limit is the exception and stays at its tempo.
- **D4 A new key is not a new start.**
  - Stages are still saved per key.
  - When the rung's probe stage (A-3) passed in another key, the new key opens with the probe at the comfort tempo. It skips right hand and left hand on a clean take; a miss goes back to A-1 as before.
  - Cause of the report: each day's key started again from A-1.
- **D5 The speed target moves with the player.**
  - The target is the tier's, or 10 % above the player's best clean speed on this kind in any key, whichever is higher. It never goes above the top tier's target.
- **D6 Continuous coach.**
  - In a coach run a new stage's brief is shown with a countdown, and the count-in starts by itself after 4 s. Ready or a note starts it sooner.
  - The brief with Play / Ready sticks to the bottom of the screen under a tall score, so it never needs a scroll.
  - The level test and other flows keep "count-in waits for Ready".

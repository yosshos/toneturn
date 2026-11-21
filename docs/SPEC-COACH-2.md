# Practice coach 2: adaptive technique by level, by key or by topic (draft, 2026-11-21)

Owner, 2026-11-21, after a coach session on scales: "I was bored." He declared intermediate/advanced at course
start. The coach ran C major, one octave, right hand: free time, then ♩60 in quarters, then ♩66 in eighths, then key of G.
He got no tempo climb and no hands together. He asked for:

1. a coach that learns the player's level from how they play;
2. timing tolerance by level, tempo and difficulty;
3. mixed exercises (scale, arpeggio, Hanon-type, enclosures, control/dynamics) as the way to learn a key;
4. a Practice screen with two views, by topic and by key, each showing mastery, the keys done (x/12), the best tempo,
   accuracy and the highest tempo reached.

This spec covers all four. Nothing is built until the owner approves it. Sources:
`docs/research/COACH-ADAPTIVE-RESEARCH.md`, a summary of the research run on 2026-11-21.

Tags: [E] research or exam syllabus, [P] common practice, [I] our design choice.

## 0. What is wrong today (code audit)

| # | Finding | Where |
|---|---|---|
| A1 | **No tempo climb in the coach.** Each item is played once at its stored goal tempo (♩66 for a new one-octave scale) and the coach moves on after one clean take. The ladder only raises a tempo after 3 clean takes in a row, so inside the coach it never moves. The comments at coach.ts:3 and :265 promise a climb. | coach.ts:237-267, ladder.ts:48 |
| A2 | **Placement and self-report are ignored.** The level test's `drillStart` and the course self-report (`new` / `bit` / `well`) do not reach the coach. Every player starts at level 1. | Drills.tsx:923, courseStart.ts |
| A3 | **Hands together is far away.** It needs 2 keys × RH and LH clean at levels 1 and 2 first: about 8 clean takes plus the rubato takes. That rarely fits in the 12-minute session. | coach.ts:249 |
| A4 | **Slowed takes count as "clean at tempo".** `cleanBpm` is set by any clean take, including one 10% slower, so a slowed take passes a key. This contradicts SPEC-COACH and A4. | ladder.ts:127, coach.ts:80 |
| A5 | **"Almost" counts as a miss.** Three "almost" takes park the item and jump to the next key. This is what the owner saw: C right hand, then G. | coach.ts:188, :281 |
| A6 | **Timing limits are inverted.** SD ≤ 30 ms at ♩66 eighths is 6.6% of the gap, about professional jitter (≈7% [E]): hard for a beginner. SD ≤ 20 ms at 8 notes/s is 16% of the gap: easy for an advanced player. Nothing scales with level. | analyze.ts:70-78 |
| A7 | **Quarters at ♩60 for everyone.** One note a second is below ABRSM Initial grade (1.8 notes/s) [E]. For a grade 5 player it is a wasted take. | rubato.ts:18 |

## 1. Benchmarks: the technique tiers

ABRSM and RCM agree closely [E]. A tier is a rung of tempo, range and coordination together. Speeds are notes/s for
scales; arpeggios run at about 72% of that [E].

| Tier | ≈ Grade | Scale notes/s (♩ in 8ths / 16ths) | Range | Hands | Also |
|---|---|---|---|---|---|
| T0 | pre-grade | 1.0 to 1.8 (♩60 in 8ths) | 1 oct | RH, LH | — |
| T1 | 1 | 2.0 (♩60 in 8ths) | 1 to 2 oct | HS, then HT 1 oct | contrary 1 oct |
| T2 | 2 to 3 | 2.2 to 2.7 (♩66 to 80) | 2 oct | HT | contrary 2 oct |
| T3 | 4 | 3.3 (♩100 in 8ths) | 2 oct | HT | staccato HS |
| T4 | 5 | 4.0 (♩60 in 16ths) | 2 oct | HT legato, staccato | a 3rd apart, chromatic contrary |
| T5 | 6 | 4.8 (♩72 in 16ths) | 3 to 4 oct | HT | dynamics shapes |
| T6 | 7 | 5.3 (♩80 in 16ths) | 4 oct | HT | 3rds / 6ths apart |
| T7 | 8 | 5.9 (♩88 in 16ths) | 4 oct | HT | legato double 3rds (slow) |
| T8 | diploma | 7 to 8 (♩104 to 120 in 16ths) | 4 oct | HT | double 3rds / 6ths, octaves |

The existing levels in `generate.ts` (scales-1 … scales-33, arpeggios-1 … 14 and so on) each get a tier, from their
range, hands, motion and exam speed. The coach then works in tiers, not catalogue order (fixes A3).

## 2. The player model (what the app knows)

Kept on the device with the item states, and synced like them.

- **Per item** (exists today): `goalBpm`, `cleanBpm`, takes, rubato counters. Added:
  - `ceilingBpm`: the fastest "almost" or better;
  - `evenness`: the moving average of IOI CV;
  - `lastAt`.
- **Per topic** (scales, arpeggios, Hanon-type, cadences / broken chords, control, enclosures …), new:
  - `tier`: the highest tier whose items the player has passed (a pass = clean at the tier's target tempo, in 2 keys);
  - `pace`: how far above or below the tier benchmark their clean tempos sit (e.g. +12%);
  - `keys`: for each of the 12 keys, the tier passed in that key (major and minor kept apart).
- **Per key**, derived from the topics: mastery = the lowest tier across the key's core topics (scale, arpeggio, broken
  chord / cadence), shown with a bar to the next tier. The rule from promotion-not-full-bars applies: a level is the
  hardest thing beaten; there is a bar to the next rank, never "full" below the top.
- **Axes inside a topic** advance on their own [I, following the syllabi]: tempo, range (octaves), coordination
  (HS → HT → contrary → 3rds/6ths apart) and articulation/dynamics. A player may be T5 on tempo and T3 on
  coordination. The coach works on the weakest axis more often.

## 3. Placement: learn the level in the first minutes

[E] Staircase methods (2-down/1-up converges on about 71% success) and the challenge-point framework (the best
difficulty rises with skill). [I] Self-report is only the starting guess.

1. **Prior from self-report.** `new` → T0, `bit` → T2, `well` → T4. Answers about the instrument also count. A level
   test result (`drillStart`) overrides this when it exists.
2. **Probe, first coach session on a topic.** Three to five takes, with big jumps:
   - start at the prior tier's core item (scales: 2 oct HT at the tier's tempo), in C or the player's chosen key;
   - clean with low severity (every timing factor ≤ 0.6 of its limit): up 2 tiers; clean: up 1;
   - almost: stay and narrow; not: down 1;
   - stop once two adjacent tiers give one pass and one fail. Under 3 minutes.
   - The probe is the session's warm-up, and Toni frames it so: "Let's see where you are."
3. **No rubato and no quarters for a player at T2 or above** on an item at or below their tier. Free time comes back
   only for an item above their tier that fails twice (as "Back to free time" today).
4. **"Too easy" anywhere** (not only in the probe): two takes clean with low severity → jump the tempo by about 12% and,
   at the tier's target tempo, move up an axis. This is the bored-player guard.

## 4. The session loop

### 4.1 Tempo staircase per item [P + I]
- **Start:** about 10% under the item's last `ceilingBpm`, or at the tier tempo for a new item.
- **Step:** about 6% (about 4 bpm at ♩66, 7 bpm at ♩120); about 12% after a "too easy" take.
- **Up** after 2 clean takes in a row. **Down** one step after 2 failed takes. "Almost" holds the tempo and is not a miss
  (fixes A5).
- **Target:** the tier's benchmark tempo. Reaching it cleanly in a key passes the item in that key, as long as the take
  is at or above the target tempo (fixes A4).
- **Above the target**, the item may climb on to `ceilingBpm` while there is time: the player's own record, shown on
  the key card.

### 4.2 Mixing [E: interleaving helps pianists' retention; P: syllabi group technique by key]
- **Blocked up to T1** (3 to 5 takes of one item before switching): beginners need repetition first [E].
- **From T2, interleaved at the item level:** scale → arpeggio → broken chord / cadence → a Hanon-type pattern →
  control (a dynamics shape or articulation) → back to the scale one step faster. Each item is visited 2 to 3 times a
  session.
- **The mix follows the player's track.** Jazz focus adds an enclosure or bebop line in the key. Classical focus adds
  contrary motion and 3rds/6ths apart.
- **Session length:** 12 minutes as today, with about 4 items × 3 visits.

### 4.3 Two frames: by key and by topic
- **By key** (the coach's default from T2): one key per session, the items above mixed. The player picks the key from
  the key view, or the coach picks it: the weakest key first, then the next new one in the player's key order. The next
  key's tempo carries over from the player's model and is not reset to ♩66.
- **By topic** (as today): one family, keys rotated. Items still climb the tempo staircase; the key changes after the
  item passes in the current key.
- Both frames read and write the same player model.

## 5. Timing tolerance by level, tempo and difficulty

[E] Timing evenness is measured as the SD or CV of the gaps between notes (IOI). Conservatory pianists' jitter is
about 7% of the IOI at 8 notes/s. A listener notices about 2.5% of the IOI on slow notes and a few ms on fast ones.
Amateurs mainly drift behind the tempo at speed. [I] We set relative limits with absolute floors.

| Player tier | CV limit | SD limit (share of the IOI) | Worst single note |
|---|---|---|---|
| T0 to T1 | 15% | 12% | 30% of IOI |
| T2 to T3 | 11% | 9% | 25% |
| T4 to T5 | 8% | 7% | 20% |
| T6 and up | 6% | 5.5% | 15% |

- **Floors and caps.** The floor is SD ≥ 12 ms on MIDI and ≥ 25 ms on the microphone (latency jitter). The cap is SD
  ≤ 45 ms, so slow takes stay musical.
- **Harder items** get +1 step of slack: hands together over 3+ octaves, 3rds/6ths apart, items above the player's
  tier.
- **Tempo drift is a factor.** The take's mean tempo is measured against the click: about −4% or slower over the take is
  "dragging", +4% is "rushing". It is graded and named in the feedback line.
- **Notes.** Clean still needs every note. One wrong note in a long take (over 24 notes) is "almost", not "not".
- **Examples.**
  - At ♩66 in eighths (IOI 454 ms), a T1 player gets SD 45 ms. Today the limit is 30 ms.
  - At ♩120 in 16ths (IOI 125 ms), a T7 player gets SD 12 ms. Today the limit is 20 ms.
- **Validation.** The limits are calibrated guesses. They are checked against the owner's takes and the first real
  users' data (tests on recorded fixtures).

## 6. The Practice screen (owner's request, 2026-11-21)

One switch at the top of Practice → Train: **By topic | By key**. The choice is remembered.

**By topic** (today's families, more information):
- each topic card shows: its tier name and a bar to the next tier, **keys passed: x/12**, and the best clean tempo at
  the current tier;
- tap → the topic page: a 12-key strip with the tier per key; tap a key for its numbers (see below); **Practise** starts
  the coach in topic frame.

**By key** (new):
- 12 key cards (major; a minor toggle shows the 12 minor keys), in the player's key order;
- each card shows: key mastery (tier name + bar), and a small row of dots, one per core topic (passed / in progress /
  not started);
- tap → the key page:
  - one row per topic: tier, best clean tempo, highest tempo reached (`ceilingBpm`), accuracy and evenness;
  - **Practise this key** starts the coach in key frame.

Numbers stay few and plain, following compact-questions-feedback and mature-clean-ui. The detail sits behind a tap,
never on the card. No emoji. One screen per view on a phone.

## 7. What the AI does (and doesn't)

- **Decisions stay in code.** Tempo, tier, next item and placement are decided by deterministic code, so they can be
  tested and repeated and need no network.
- **AI explains and plans, within the existing AI budget** (ai-decisions-2026-11-14: Haiku for cards, Opus for the
  weekly plan, 20 calls a day):
  - **Session debrief card (Haiku):** one or two lines from the session's numbers, e.g. "Your left hand drags on
    the thumb crossings in E major — the coach adds dotted rhythms there tomorrow."
  - **Weekly plan (Opus):** reads the player model across keys and topics, and picks the week's focus key and weakest
    axis.
  - **Long-term error patterns** (player profile, AI spec): recurring problems become coach hints, e.g. a weak 4th
    finger or uneven thumb passages.

## 8. Everything connects

- Every coach take counts for XP, the league, the path step it belongs to, the skill map and radar, and the daily
  workout, as today.
- A tier passed in a topic marks the matching path steps as done (cautious ✓ rules).
- The level test reads the player model, and the model reads the level test.

## 9. Build order (after approval)

1. **Fixes inside today's coach (A1, A4, A5, A7, A2):**
   - the tempo staircase inside the coach;
   - slowed takes don't pass;
   - "almost" holds instead of counting as a miss;
   - no quarters or rubato at T2+;
   - the self-report and level test set the start.
   These are small and the owner feels them at once.
2. **Tiers** for every technique level, and the player model per topic, key and axis.
3. **Placement probe and "too easy" guard.**
4. **Timing tolerance by tier** (§5), behind fixture tests.
5. **By-key frame and mixed sessions** (§4.2, §4.3).
6. **Practice screen: two views** (§6).
7. **AI debrief and weekly plan** (§7).

After each stage: the course-change checklist (openers, skill map, level test), e2e on the coach, and the owner's
check on his own keyboard.

# Drums course audit (2026-11-09)

This audit covers drums v1 (merge-drums) and the work done on top of it. It checks every generated item, the take
analysis, and how the course is wired into the app. It also adds five v2 families.

Tests for every fix are in `tests/drumAudit.test.ts`, and some existing tests in `tests/drums.test.ts` and
`tests/drumKit.test.ts` were updated.

## 1. What was checked

### Content

All 58 levels, now in 12 families, were checked against:

- the PAS 40 rudiment stickings;
- standard groove placement (backbeat on 2 & 4, kick figures as titled);
- percussion-staff conventions (PAS / Weinberg drum key, beaming per beat, dots, rests);
- the curriculum order in `DRUMS_CURRICULUM.md`, which follows Rockschool / Trinity drums grades, Stick Control,
  Syncopation and Progressive Steps.

### Analysis

`drumAnalyze` was run on human-like synthetic takes. Every item was tested at its level's target tempo, with seeded
Gaussian timing jitter and velocity noise:

- a steady take (jitter = 45 % of the tier's SD limit) must be *clean*;
- a sloppy take (jitter = 2 × the SD limit) must never be *clean*.

### Integration

The course was traced through the following parts of the app:

- path: glyphs, five stars, placement in the path order;
- XP and results tagged with the course;
- badges, quests, duels and rooms, league and per-course levels, Stats radar;
- the Practice tab: rows, tiles, games, tools;
- onboarding and placement, the course switcher, Highway, the headphones gate, the workout and Today.

### Screens

Every level's run screen was opened at 390 × 844 in Hebrew and English: no level scrolls (overflow 0). The Practice
page, Technique hub and path were checked for drums leftovers. `scripts/contrast.mjs` on arcade / drills / path in
the drums course found no low-contrast text. `e2e/drums.spec.ts` (6 tests) passes on a separate port.

## 2. Fixed

### Musical and pedagogical correctness (commit A1)

| # | Item | Problem | Fix |
|---|---|---|---|
| C1 | F2 L5 single-stroke seven | RLRLRL then an accented **L**: the 7th stroke broke the alternation | The 7th stroke alternates (RLRLRL**R**), and the next group starts on L |
| C2 | F2 L5 single-stroke four (16th triplets) | The accented 4th stroke was written as a quarter, overlapping the next group | It is now an 8th |
| C3 | F2 L6 7-stroke roll | RRLLRR + **R** release: PAS has the release on the hand after the last double | Release by the other hand (5: RRLLR, 7: RRLLRRL, 9: RRLLRRLLR). The 7 restarts on R; the 5 and 9 alternate the lead. Release lengths no longer overlap |
| C4 | F5 L2 kick variation 1 | Titled "& of 3", but the pattern put the kick on beat 4 (`x...x.x.`) | `x...xx..` |
| C5 | F5 L5 two-handed 16th hat | The snare on 2 & 4 was the left hand, which broke the R-L alternation (L, L) | The snare takes that step's hand (the right hand moves to the snare). Note: the curriculum table says "LH"; the alternation needs RH |
| C6 | F14 reading L1, L3, L4 | An off-beat note with space after it was written as a quarter across the beat (an "&" quarter at L1) | Written lengths now stop at the beat end, and rests fill the gap |
| C7 | F14 reading sticking | Each beat restarted on R (an 8th on "&" was R, a 16th on "e" was R) | Sticking follows the grid: 8th levels R on the beat and L on "&"; 16th levels R on 1/&, L on e/a |
| C8 | F14 L2 title | "dotted quarters and **ties**", but no item had a tie | Renamed "dotted quarters, syncopation" (it has a quarter on the "&") |
| C9 | F14 L4 title | The level said "dynamics", but the items have ghost notes | "triplets, accents, ghost notes" |
| C10 | F1 L3 Hebrew title | `p ← mf ← f`: the Latin run renders LTR, so the arrows pointed backwards | `→` in both languages |
| C11 | F4 L2 title | Music symbols ♩ ♫ ♬ (emoji-like on some systems) | Words only |

### Staff engraving (`src/engine/drumNotation.ts`, used by `DrumViews`)

Before this fix, every beat containing a 16th got two full beams. A dotted 8th + 16th looked like two 16ths. There
were no dots below a dotted quarter and no 16th rests. Tuplets always showed "3", even over sextuplets, and over the
8th that follows a 16th triplet. A syncopated quarter was beamed to the 8th before it. The staff now has:

- a primary beam over the 8ths and shorter;
- a second beam only between 16ths, with a stub for a lone 16th;
- flags for lone notes;
- dots for the dotted 8th and the dotted quarter;
- quarter / 8th / 16th rests for one-voice lines;
- "3" or "6" over the right notes.

### Analysis (A1, A4)

| # | Problem | Fix |
|---|---|---|
| A-1 | At fast subdivisions the window was 22 % of the gap: ±20 ms for sextuplets at ♩110 at tier 2. A player inside the SD rule (≤ 16 ms) then failed the 95 % hit rate, so the real limit was SD ≈ 10 ms | The window is no smaller than 1.6 × the tier's SD limit and no larger than 35 % of the gap (a hit stays nearer its own note) |
| A-2 | A loudness level (dynamics, accents, ghosts, doubles ratio, evenness) passed on timing alone when a mic take had no loudness spread: every peak the same, so the velocity rules were skipped | Such a take is *not*, with "No loudness measured — raise the mic level". Only measured practice counts |

These checks were also verified and need no change:

- Tier windows and limits match §4.1.
- *almost* = one rule missed by < 25 %.
- Extra hits never take a note's match.
- A wrong tom counts as a wrong voice.
- Hi-hat openness, landing on 1 and gap-click drift work as specified.

### Integration (A2)

| # | Where | Problem | Fix |
|---|---|---|---|
| I1 | DrillTake headphones gate | On a practice pad with a backing groove, the gate said "so the mic hears only your **bass**" | Drum wording ("only your pad") |
| I2 | Achievements | The drums course had no technique or instrument badges | Milestone badges for every `d-*` family (first steps / halfway / whole family) under `tech:drums:…`, with their own drawn glyph (snare + sticks). Instrument / technique / skill-domain badges are also shown in drums |
| I3 | Onboarding | Picking drums first ran the **ear** placement; the intake didn't record drums as played | Drums first opens the kit setup and the playing probe; the CatchUp "find my level" in drums does the same |
| I4 | Path | No ear-side content in the drums path. Kit reading (`drum-read`) lived in the ear path | `drum-read` belongs to the drums course (courses stay disjoint), with the kit-reading glyph |
| I5 | Duels / tournaments / rooms | The drums course offered chords, modes and intervals | Rhythm only (`beat`) |
| I8 | Daily quests | "5 rhythm answers" ignored drum takes (rated `instrument` with a timing share); the technique quest showed a piano glyph | Drum takes count (timing / rhythm tags) under the title "Rhythm right 5 times". The technique quest shows sticks in drums, the guitar in guitar and the bass in bass |
| I7 | Practice tools | Tuner and Drone were shown in drums | Hidden in drums |
| I10 | Practice rows | Generic "your instrument and your voice" text | Drum text ("Rudiments, grooves, fills", "Rhythm games and the kit Highway") |
| I11 | Stats radar | `.slice(0, 6)` dropped Reading (the 7th family) | 7 axes in drums: the core families |
| I13 | Highway | A run saved in another course could resume in pitch mode inside drums | The mode is reset to one the course offers |
| I14 | Kit card / kit setup | The drum glyph was in the bass pink and teal | The drums green |

These were verified correct as built:

- **Path:** `tech:d-*` steps belong only to the drums course and show five stars.
- **Results:** `techResult` attaches the course; the league XP split and per-course levels are generic.
- **Workout and Today:** they take drum drills (mic mode too).
- **Course switcher:** it keeps the screen.
- **Practice games:** technique, Highway (kit lanes), beat echo, groove trainer.
- **Drill creator and songs:** hidden in drums.

## 3. Built: v2 families (A3)

The curriculum doc priority is v2 = F6, F7, F8, F10, F11, F12, F13. Five families were built as reasonably sized
first parts:

| Family | Levels | Content |
|---|---|---|
| F6 `d-funk` Funk & ghost notes | 4 | **L1:** snare ghosts on e/a with accents on 2 & 4; also works on a practice pad. **L2:** with hat 8ths. **L3:** with a syncopated kick. **L4:** 16th hi-hat funk. The ghost-band rule is ≥ 85 % |
| F7 `d-shuffle` Shuffle & triplet feels | 4 | **L1:** triplets (hat / ride). **L2:** the shuffle (skip note). **L3:** slow blues in a 12/8 feel. **L4:** the double (Texas) shuffle, with the left hand on snare ghosts and 2 & 4 accented |
| F10 `d-indep` Independence | 4 | **L1:** hands and feet in unison. **L2–L3:** hat 8ths while reading a **generated** kick line in 8ths, then 16ths (Reed-style idea, own material). **L4:** reading the snare over hat + kick. Lines are deterministic per variant and each bar starts on 1 |
| F12 `d-mideast` Middle-Eastern & Mizrahi | 4 | **L1:** malfuf and maqsum (dum → kick, or the floor tom; tak → snare, right hand). **L2:** baladi, sa'idi, and maqsum ↔ baladi bar by bar. **L3:** with ka (soft left hand in the empty 8ths). **L4:** the Mizrahi pop kit groove (hat 16ths, kick dums, snare taks). The doc's L1 wahda, L5 ayyub and odd meters are not built |
| F13 `d-feet` Feet | 3 | **L1:** the hi-hat foot (GM 44) on 2 & 4 under ride / snare quarters. **L2:** a groove with the foot in quarters / on "&". **L3:** kick 8ths under a groove |

How they are wired:

- **Path:** each has its own path glyph (new: shuffle, limbs, darbuka; existing: ghost, kick). Their level 1 sits after
  the basics (rock grooves L3–L4).
- **Badges:** milestones are automatic.
- **Technique hub:** a "Styles" topic (funk, shuffle, Middle-Eastern); independence and feet sit with the grooves.
- **Placement:** level 1 (independence L2 after a clean basic groove).
- **Rating:** the second tag is timing/steady, and kit reading for the independence lines.

## 4. Remaining (by priority)

### P1

- **Per-course level for drums.** `courseLevel` uses the shared `instrument` rating, so the drums pp…ff level (and
  what friends see) includes piano or guitar playing. Bass has the same problem. This is a shared-design fix: rate
  from the `instrument/drum-tech` sub, which needs a per-sub rating in `Ratings`.
- ~~**Hi-hat foot without note 44.**~~ Done in §5 (a fast CC4 close is the chick).
- **Calibrate the tier numbers with real drummers.** They are still §4.1 defaults: windows, SD, hit rate, ghost band
  ≤ soft × 1.1, accent ≥ loud × 0.9.

### P2

- **More ear-side content in the drums path.** Beat echo, the groove trainer, rhythm dictation, gap-click and
  backbeat topics live in Practice or in the ear course; courses are disjoint by design. A drums pack or a
  `forPlays: ['drums']` copy of a few time topics needs an owner decision on sharing.
- ~~**Placement probe steps 6 and 9.**~~ Done in §5.
- ~~**Dense rudiments on the staff.**~~ Done in §5 (one bar a line).
- **Shuffle notation.** Shuffles are written in triplets, which is correct. Many charts write swung 8ths with a
  "swing" marking; offering that option is a reading-style choice.
- **Practice tile glyphs** are drawn white on the category colour, for all courses. The ink outline keeps them
  readable, but check against the "no white on yellow" rule.
- **`topicGroups.ts`** still carries emoji icons (🥁 for rhythm). These are shared and not drums-specific.

### P3 (next families)

- **F8 Jazz:** ride, foot 2 & 4, feathering, comping.
- **F11 Latin:** bossa, samba, clave, songo.
- **F12:** wahda, ayyub, 9/8, 7/8, chiftetelli, switching on cue.
- **F13 L4–8:** kick doubles, foot splash, double pedal.
- **F1 L6–8, F2 L7–10, F3 L5–10:** flams, drags, Swiss triplets, ratamacues. Flams need a flam-gap measurement:
  15–40 ms grace, SD ≤ 8 ms.
- **F4 L7–10:** slow time, pocket, click on 1, quintuplets.
- **F5 L9–10, F9 L6–10, F14 L6–9:** play-alongs, set-ups, chart road maps.

## 5. Compatibility, measurement and kit handling (2026-11-10)

Tests: `tests/drumAcoustic.test.ts` (21, synthetic audio), `tests/drumCompat.test.ts` (15), four new cases in
`e2e/drums.spec.ts` (10 pass on a separate port). `tests/drumKit.test.ts` and `tests/drums.test.ts` were updated for
the CC4 chick and the new probe steps.

### 5.1 The e-kit notice (owner)

"The drums course works best with an electronic kit connected by MIDI; recommended for the full course and accurate
assessment" (`drumKit.KIT_NOTICE`, he + en, no emoji) is shown:

- on the course card: the onboarding course grid (once drums is picked) and the course switcher (short line, `CourseDef.note`);
- on the kit card at the top of the drums Technique hub, and on the kit setup's first screen;
- at the top of the drums path.

On the kit card and the path it stays until an e-kit is set up; with a microphone setup it adds one line on what that
setup covers.

### 5.2 Kit type on the kit card

Three setups: **E-kit (MIDI)**, **Acoustic kit** (microphone), **Practice pad** (microphone). `KitProfile.kind` holds
the choice; old profiles keep working (`mic: true` = pad). `kitKind()` and `drumMicOf()` feed the level filters
(`kitLevels` / `kitHiddenLevels` in `drumAcoustic.ts`), the path, the workout and the placement probe. An acoustic kit
counts as acoustic only once calibrated (until then it is a pad).

### 5.3 Acoustic kit by microphone (`src/engine/drumAcoustic.ts`)

Best effort, and honest about it:

- **Capture.** The mic capture can add 8 octave band powers per frame (40 Hz – 12 kHz) from a 2048-point analyser with
  no smoothing (`SingOptions.bands`).
- **Onsets.** The summed log rise over the bands against the middle of the last three frames, with each band's
  20th-percentile floor, a 2 dB dead zone, and caps on the 1–3-bin low bands. A ringing band is compared with its newest
  frame (so a hat 150 ms after a snare still shows). Re-arm hysteresis and a 35 ms refractory time. The feature is each
  band's peak over three frames, minus the frames before.
- **Calibration.** Kick, snare, a tom (can be skipped) and the closed hi-hat, 4 hits each, on the kit setup's last
  step. The per-band median is the template. The step checks that ≥ 80 % of the calibration hits come out as the drum
  asked for, and drops a tom that sounds like the snare (toms then count as the snare).
- **Classification.** Non-negative least squares over the templates (every subset, at most four). It is
  score-informed: only the drums the drill uses. The coefficient is the drum's strength, which gives the velocity. A
  drum near the presence threshold, a residual > 35 %, or a snare/tom split makes the hit **unsure**.
- **Analysis.** `analyzeDrumTake(…, { acoustic })` uses the classes kick / snare / tom / cymbal (hat = ride = crash):
  - An unsure hit may match any note inside the window: its timing is measured, its drum is not. It is never a wrong drum.
  - With > 20 % of matched notes unsure, the rule `unsure` fires and `DrillTake` drops the take: no pass, no fail, and
    the player is told why and asked to move the mic or calibrate again.
  - Ghost notes are judged against the same drum's other strokes in the take (≤ 44 % of their median).
  - Hat openness and the hi-hat foot cannot be heard, so a level that needs them gets `unmeasurable` and never passes.
- **Levels.** `ACOUSTIC_LEVELS`, besides every single-surface level:
  - rock 1, 2, 4, 5, 7, 8;
  - fills 1–3;
  - funk 2–3 (the ghosts sit between the hat strokes);
  - shuffle 1–3;
  - independence 1–4;
  - Middle-Eastern 1–4;
  - feet 3.

  Left out: open-hat levels (rock 3, 6, kit reading), ghosts under the hat (funk 4, the double shuffle) and the hi-hat
  foot (feet 1–2). New families stay out until checked. A test checks every listed level against these rules.
- **Probe.** On an acoustic kit the probe adds the groove steps it can measure (basic groove, funk, shuffle, fill).

### 5.4 Hi-hat foot from CC4 (`midi.ts`)

In drum mode, a CC4 close from ≥ 0.35 open to closed (< 0.2) within 150 ms emits an `hhPedal` hit on note 44. Faster
closes give a firmer velocity. Once the kit sends its own pedal note, the CC4 chicks stop, and a pedal note within 40 ms
of a chick is dropped, so one stroke never counts twice. The learned pedal range is used. F13 L1–2 now work on
CC4-only kits.

### 5.5 Drum sounds from the app

On the kit card, for a ready e-kit: "The app plays the drum sounds" (default off), for pad controllers without a sound
module. Each MIDI hit plays the recorded kit's piece (`VOICE_PERC` → `piano.liveDrum`) at +3 ms, the same lead as live
keys. The kit preloads when the option is on; synthesized stand-ins play until it has loaded.

### 5.6 Placement probe steps 6 and 9

- **Step 6, groove reach:** funk with ghosts (F6 L2 at ♩85) and the shuffle (F7 L2 at ♩100). Both run only after the
  basic groove was clean or almost. Clean places the family at L3, almost at L2.
- **Step 9, feet:** the hi-hat foot on 2 and 4 under snare quarters (F13 L1 at ♩80). Clean places F13 at L2, or L3 when
  the basic groove was also clean.
- **F8 jazz:** placed at L2 when the shuffle and the feet steps were both clean. This applies only once the family
  exists (`cap` ignores missing families).

### 5.7 Dense rudiments on the staff

`drumNotation.barsPerLine`: one bar per line when the hands' notes come faster than 16ths (16th triplets, sextuplets)
or a bar holds more than 16 of them. The window still shows two lines, so the screen does not grow. Rolls L5 (the
seven and the 16th-triplet four) now read clearly at 390 × 844 with overflow 0.

### 5.8 Not verified / needs a real kit

- **Acoustic classification on real drums.** It is tested only with synthetic drums (sine-sweep kick, tone + noise
  snare, low tom, high-passed noise hat) at 32 kHz, with room noise.
- **Thresholds to tune on real kits.** Onset threshold 1.25, presence 8 % / 0.005, residual 35 %, unsure share 20 %.
  Also needs checking: room echo, phone mics with AGC that can't be turned off, and loud cymbal wash.
- **Timing by microphone.** It is quantized to the 25 ms capture hop, the same as pad mode. The mic latency
  calibration takes out the average lateness.
- **The CC4 chick on real hardware.** The 150 ms / 0.35 thresholds are a guess; Roland and Yamaha send note 44 as
  well, which is handled by the de-duplication.
- **App drum sounds.** The latency of the app's drum sounds on Windows / Android output has not been measured.


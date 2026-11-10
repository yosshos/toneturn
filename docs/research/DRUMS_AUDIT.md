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
- **Hi-hat foot without note 44.** F13 L1–L2 need a pedal "chick" note. Most kits send GM 44, but a kit that reports
  the pedal only as CC4 can't play these levels yet. `midi.ts` should emit `hhPedal` on a fast CC4 close, or the hub
  should hide those levels when the kit map has no pedal.
- **Calibrate the tier numbers with real drummers.** They are still §4.1 defaults: windows, SD, hit rate, ghost band
  ≤ soft × 1.1, accent ≥ loud × 0.9.

### P2

- **More ear-side content in the drums path.** Beat echo, the groove trainer, rhythm dictation, gap-click and
  backbeat topics live in Practice or in the ear course; courses are disjoint by design. A drums pack or a
  `forPlays: ['drums']` copy of a few time topics needs an owner decision on sharing.
- **Placement probe steps 6 and 9.** These are "groove reach" (funk with ghosts, or swing + foot) and "feet". They
  would place F6, F7, F8 and F13 instead of starting them at level 1.
- **Dense rudiments on the staff.** Sextuplets and 16th triplets at 4 bars per screen are cramped; spacing is linear
  in time. Spacing by note count, or one bar per line for those levels, would read better.
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

## 5. Built: drums content 0.66 (2026-11-10)

Owner-approved order: the drummer's ear, Middle-Eastern completion, flams and drags, jazz, Latin, the band under
grooves. 33 new levels (58 → 91 drum path steps), three new families, each with its own path symbol. Tests:
`tests/drumContent.test.ts` (28), plus the human-take sweep in `tests/drumAudit.test.ts`, which now covers every new
level (a steady take is clean at the target tempo, a sloppy one never is).

### New families and levels

| Family | Levels | Content | Pad (mic) |
|---|---|---|---|
| `d-ear` Drummer's ear (glyph: ear + stick) | 8 | **L1–2** echo a snare rhythm (8ths; 16ths with accents): one bar heard, one bar played, four rounds. **L3** snare dictation: hear twice, play twice, then write it on a 16-cell grid. **L4** echo a groove. **L5** echo a groove + fill, land crash + kick on 1. **L6** spot the change: A A A B, then play B twice. **L7** style by ear: hear 2 bars (unnamed), keep it going 4 bars, then pick the style from four names (6 items: rock, shuffle, funk, bossa, maqsum, swing). **L8** groove dictation: write hi-hat / snare / kick on an 8th grid (one item with a 16th kick) | L1–3 |
| `d-jazz` Jazz, F8 (glyph: ride + triplet) | 8 | **L1** the ride pattern (spang, spang-a-lang). **L2** + the hi-hat foot on 2 & 4 (cross-stick on 4). **L3** feathered kick (kick quarters in the ghost band). **L4–5** comping: generated snare lines, then snare + kick lines, on triplet partials (beat or skip), the kick never under a snare; a new line per item. **L6** jazz waltz in 3/4 (ride 1, 2, skip, 3; foot on 2 or 2 & 3). **L7** up-tempo 2-feel ♩180 → 240. **L8** trading 4s: 4 bars time, 4 bars solo (free, unmeasured), crash + kick landing on the 1 ±25 ms; the band lays out in the solo bars | – |
| `d-latin` Latin & Brazilian, F11 (glyph: crossed claves) | 7 | **L1** bossa nova (bossa clave 3-2 / 2-3 on the cross-stick, kick 1, &2, 3, &4). **L2** samba (feet first: kick on each beat and its "a", hi-hat foot on the "&"s; then snare 16ths accented on the "a", or ride 8ths). **L3** son clave 3-2, 2-3 and rumba clave on the cross-stick under ride quarters. **L4** cascara (2-3: 1 2 3 &3 &4 \| 1 2 &2 &3 &4, on the ride for the timbale shell) with the clave in the left hand, then the kick tumbao (&2, 4). **L5** the cha-cha-chá bell (bell quarters) over the clave. **L6** 6/8 bembé bell (x.x.xx.x.x.x), ♪ 240 → 330. **L7** baião (kick dotted-8th + 16th, cross-stick on 2 & 4) | – |

Added to existing families:

| Family | Levels | Content |
|---|---|---|
| `d-mideast` F12 | L5–9 | **L5** wahda (one dum; teks on &2 and 4) and ayyub (D--kD-T-, twice a bar; dum on the kick or the floor tom). **L6** chiftetelli (D.TT.DT. \| D.D.T..., 8th grid, slow), with ka, and on the kit with hi-hat 8ths. **L7** karsilama 9/8 (2+2+2+3: D.T.D.TT.), with ka, and aqsaq (the last tek moved). **L8** dawr hindi 7/8 (3+2+2: DTTD.T.), sama'i thaqil 10/8 (3+2+2+3: D..T.DDT..), hindi with ka. **L9** switching rhythms on cue, two bars each (maqsum → sa'idi → ayyub → maqsum and two other orders), with the band. Patterns checked against M. Frishkopf's Arab durub chart (U. of Alberta, 2009) and the Wikipedia dumbek notation for ayyub |
| `d-diddles` F3 (renamed "Paradiddles, flams, drags") | L5–9 | **L5** alternating flams (quarters, 8ths, on 1 and 3 among 8th taps). **L6** flam accent (lR L R rL R L), flam tap (lR R rL L). **L7** drags on quarters (llR rrL), the single drag tap (llR L rrL R), drags on 2 & 4. **L8** Swiss army triplet (lR R L, and rL L R), flam paradiddle (lR L R R rL R L L). **L9** single ratamacue (as an 8th triplet into the accented beat, and as 16ths both leads). MIDI only. Stickings follow the PAS 40 |

### Measurement (drumAnalyze)

- **Flams and drags** (`goal.drum.flam`): before matching, a hit followed within 50 ms by another hit of the same
  drum is taken as a grace note of that stroke, when a grace-note stroke is due there. The grace hits are then kept
  out of the matching and out of "extra". A stroke is in spec when it has the right number of graces, the last one
  15–40 ms before it (a drag's first within 80 ms), all softer than the stroke. The rule needs ≥ 90 % in spec and a
  flam-gap SD ≤ 8 ms. No grace found at all counts as a miss, not a skipped rule. The "Why?" line names flat, early
  or loud graces.
- **Swing** (`goal.drum.swing`): the ride's skip notes (`swing: true`) are matched at the middle of the allowed range,
  not on the written triplet. They are left out of the per-limb timing SD / mean and judged by where they fall inside
  their beat (played downbeat → next played downbeat). The median must be in 58–72 % (52–70 % up-tempo), and the
  SD ≤ 0.07. Straight 8ths and dotted swing both fail, with a one-line reason.
- **Odd and compound meters** use the existing eighth pulse (`pulse: 8`; one drill beat = an eighth, ♪ = bpm).
  New: `groups` (2+2+2+3 and so on). With groups, the click sounds only on each group's first eighth, in the count-in
  too. Written lengths stop at the group's end. The staff beams by group and shows "9/8 (2+2+2+3)".
- **Drum ear on a pad:** onsets inside the call's bars are dropped (the speaker's call is never the answer). Unlike
  the bass, no tail is added after the call, because the answer's first stroke falls right on its end.

### The band under grooves

`drumBand()` adds `band: { style, bass: true }` and a 4-bar chart repeated over the take, from rock L2, funk L2,
shuffle, Middle-Eastern L4 / L9, jazz and Latin (4/4 levels). Under the comping (`bandHits`), `bandBass()` plays the
chord's root on every kick of the groove: the band's sound in reverse, so the bass locks with the drummer's kick. In
swing / waltz it plays a walking line. `band.rests` mutes the band in the trading-4s solo bars. It plays only behind
the existing gate (an e-kit by MIDI, or headphones / line-in confirmed). The gate is no longer offered on a kit-only
drill without a kit, and it never changes what is measured.

### UI

- `DrumWrite.tsx`: the dictation grid (1–3 rows × 8 / 16 cells, counted 1 e & a) and the style pick. The grade joins
  the take through `withDrumWrite`, which only ever lowers the verdict.
- Ear drills in drums show the ear card ("Listen" / "You" bars) until the result.
- The staff draws flams / drags as small grace heads (a slash on the flam) and shows the sticking for grace-note
  levels (lR, llR).
- Technique hub: a "Drummer's ear" topic. Jazz and Latin sit under Styles.
- Rating: the ear family rates `rhythm-dictation/dictate` (the course's ear share through the instrument). Odd meters
  rate `meter/odd`, the bembé `meter/compound`, jazz / Latin `timing/steady`.

### Screens

Every new level's run screen was checked at 390 × 844 in Hebrew and English: overflow 0 on all 33 levels. The
dictation grid, snare grid and style pick were also checked after a stub-kit take. `e2e/drums.spec.ts` passes
(6 / 6) on a separate port.

### Not built or not verified

- **Mambo bell and songo (F11)** are not built. No source I could verify gave their kit patterns, so I left them out
  rather than guess. The cha-cha-chá level uses only what is certain (the bell's quarter notes over the clave).
- **Cascara orientation** (2-3 = 1 2 3 &3 &4 | 1 2 &2 &3 &4) is the common teaching form. The sources found online
  disagreed or were unreadable, so a drummer should confirm it.
- **Kit adaptations** need a teacher's check: the baião cross-stick on 2 & 4, the samba hand parts, and the bembé
  hi-hat foot. They are standard-looking kit versions but were not checked against a method book.
- **Real-kit behaviour is not tested.** The flam detector has not been tried on a real e-kit. Some modules
  double-trigger or merge hits closer than ~10 ms, and a flat flam may arrive as one note. The swing ranges also
  need calibrating with drummers.
- **Hi-hat foot (note 44):** samba feet, jazz foot 2 & 4 and the waltz still need a kit that sends note 44. This is
  the P1 item above, owned by the kit-compatibility track.
- **Brushes (F8 L9) and Mozambique (F11 L9)** are not built.
- **The band's sound** was not listened to on a real kit. Volume against the e-kit and the bass register are
  unverified; it plays through the app's piano / bass samples.

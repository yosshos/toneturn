# Guitar course audit (2026-11-09)

Scope: the guitar course (`CourseId 'guitar'`) on top of redesign-v2 + the drums course. It covers the technique catalogue
(`src/engine/drills/guitar.ts`, the 13 shown `g-*` families), its measurement (`guitarAnalyze.ts`, `ladder.ts`,
`plan.ts`), the wiring into the app (path, stars, XP, quests, Practice, games, skill map, workout, placement), the guitar
topics and tools, the sound, and the copy. Earlier reviews already did the coverage work against RGT / Rockschool / LCM /
Trinity, Leavitt, Carcassi / Giuliani and the rest (`DRILLS_COVERAGE_AUDIT.md`, `DRILLS_SECOND_REVIEW.md`). This audit
checks whether the content is correct and playable, and whether the course hangs together.

## 1. How it was checked

- **Every item, every key, generated.** I generated each guitar drill in every key of its level, dumped notes, strings, frets, fingers,
  strokes, techniques, titles and start / target tempos, read every family by hand, and checked them by machine:
  - frets against the neck;
  - items in the same level that play the same notes;
  - English words in Hebrew titles;
  - duplicate titles.
- **Musical spot checks.** All 29 open chord shapes and their fingerings, the E-shape and A-shape barre forms, and the
  pentatonic boxes 1–5. Also checked:
  - the CAGED major positions, the 7 three-notes-per-string patterns, and the modes, harmonic / melodic minor,
    whole-tone, half-whole diminished and altered scales;
  - triads and inversions on string sets, and maj7 / 7 / m7 / m7♭5 / °7 / altered arpeggios;
  - drop-2 and drop-3 voicings, ii–V–I voice leading, the harmonized scale and shells;
  - picking strokes (outside / inside, economy), sweep fingerings, the banjo roll and tapping;
  - bend sources and targets, unison bends, harmonic pitches (12 / 7 / 5 / 4 / 9);
  - the Travis / PIMA / Giuliani patterns, the tremolo, the Andalusian cadence, and the soleá / bulería / seguiriya
    accents, the rumba and the 3-2 son clave;
  - funk E9, the shuffle, boom-chick, the 12-bar and minor-blues target notes.
- **Measurement.** I read `guitarAnalyze.ts`: the normalisation, strums as one chord, octave folding, unpitched onsets,
  bend / vibrato / legato / palm-mute / ring / change-gap measures, and the self-checks. I also read `itemPass`,
  `levelStars`, `targetBpmOf`, `levelOfDrill`, the placement probes and `courseOfResult`.
- **Screens.** I took phone shots (390×844, seeded player, `SHOT_COURSE=guitar`):
  - Today, Path, Practice and its games, Progress, Community, Workout, Technique;
  - an open level grid and a drill take;
  - the topics fret-notes 1, fret-chords 1, fret-intervals 2, fret-scales 1, play-back 1 and song-play 1;
  - the tuner.
- **Tests.** The guitar e2e specs ran on a separate port (drills, practice, workout, onboarding, bass, games): all
  green.

## 2. Fixed

Commits on this branch: `437e839`, `bf0d8e2`, `5b1d8aa`. Tests: `tests/guitarAudit.test.ts`, `tests/pluck.test.ts`, and
an adjusted id test in `tests/guitarDrills.test.ts`.

### Content (`guitar.ts`, `plan.ts`)

| Problem | Fix |
|---|---|
| Notes up to fret 24 in the one-string scale (G on string 3: 12→24; F♯: 11→23), tapped arpeggios (E: octave tap at 24), slides (G on string 3, A on string 2: to 24) and double stops (G: to 24). Most guitars have 21–22 frets. | `MAX_FRET = 22`. A root at fret 12 starts open or an octave lower. The one-string scale moves to the next lower string when the octave would pass fret 22 (F♯ → string 4). A test checks every item. |
| Stretches: key 5 and key 9 both clamped to fret 5, so two items had identical notes. | The level's keys are now 0 / 11 / 9 (frets 8 / 7 / 5, moving down the neck as in Petrucci). |
| Natural harmonics sit at fixed frets but were listed under 5 keys: 15 items, only 3 different, and three passes of one counted as "three keys". | Harmonics are stored under one key (`HARMONICS_KEY`). `levelDrills` / `specDrills` keep each item once, which also fixes the stars. Tested. |
| Same title for different items: "one string" (strings 1 and 2), trills in two positions. | The titles name the string or fret. |
| English inside Hebrew titles: "G major", "(alternating bass)". | Changed to "G מז׳ור" and "(בס מתחלף)". A test bans the words. |
| Family names "יד שמאל (לוחצת)" and "פריטה (יד ימין)" are wrong for left-handed players and too long for path nodes. | Changed to "יד לוחצת" and "פריטה", matching the badge names. |

### The course wiring

| Problem | Fix |
|---|---|
| The guitar path contained the **bass-only** levels "Bass: root, fifth, octave", "Bass: arpeggio shapes" and "Bass: walking approach notes". The bass path contained the guitar chord / scale shapes. | `TopicDef.levelPlays` gives each level its own instruments. `fret-chords` 1–5 and `fret-scales` 1–4 are guitar, the rest bass. (This is a shared fix: the bass path loses guitar shapes it never should have had.) |
| Path symbols repeated inside the course: fretting = fingerstyle = fret-notes (guitar), arps = chords = fret-chords, rhythm = flamenco, lead = impro, legato = song-play. | Ten new glyphs: `1234`, pick, slur, box, arp, chord box, strum, bend, `pima`, rasgueado fan. They live in `src/ui/stepGlyphs.ts`, and a test checks that every guitar path step has its own glyph. |
| Practice → Games: the "Technique" card said "Scales, Hanon, Barry Harris, voicings — MIDI". | Each course now has its own text (guitar: scales, chords, picking, legato — measured on your guitar; bass likewise). |
| The "Instrument & sound" tile and the technique quest showed **piano keys** in the guitar course. | Both now use the course's instrument (guitar / bass / drums). |
| The Technique tile said "your instrument **and your voice**" in every instrument course. | The instrument courses now get their own line. |
| Chord Rush opened on "mixed" pictures (keys / staff / guitar). | It opens on the neck in the guitar course (and on the keys in the piano course). |
| The tuner opened on "chromatic", and Highway's lanes used the key of C. | Both follow the guitar or bass course. |
| A guitar level assigned by a teacher could not open (the app only searched the piano catalogue). | The app now searches every instrument's catalogue. |
| The workout's focus chips offered "voice focus" and "ear focus" in the guitar course. | The chips follow the course's areas (shared fix). |
| The Progress radar said "יד" for the fretting hand. | Short names stay whole. |
| The level grid labelled every guitar row "ימין" (piano hands). | Each guitar / bass row has a caption with its variant's name, and harmonics show one cell. |

### Playing into the app (measurement)

| Problem | Fix |
|---|---|
| In the guitar course, notes under a question showed on a **piano keyboard** (play-back, song-play, the chord-shape quiz). | `noteViewsOf` swaps keyboard → neck / tab in the guitar course. |
| Neck questions ("play the A major scale from string 6") had no "play on my instrument" button unless the profile instrument was set. | The course now decides the instrument (`courseInstrument`). |
| **A played answer on the neck was moved up an octave and marked wrong.** `writtenShift` added 12 for every guitar answer, but neck targets are `noteAt` pitches (low E = 40, what the microphone hears). | The shift now applies only to staff / keys targets (`playedShift`). Tested. |
| Play-back said "לשיר עכשיו" (sing now) for a line to play on the guitar. | It now says "לנגן". |

### Sound

The guitar course played everything (questions, drill models, games) on the **piano**. I added a modelled steel-string
guitar (`src/audio/pluck.ts`, Karplus–Strong): a seeded pluck with a pick-position comb, and a ring time that depends on
the register. It is tuned by playback rate to within 5 cents. The app selects it while the guitar course is active, and
the Settings sound preview returns to it there. Tests check pitch, decay and that the note ends without a click.

## 3. Checked and correct (no change)

- **Chord shapes.** All open shapes and fingerings are right (C A G E D, minors, 7ths, m7, maj7, sus, add9, power
  chords). So are the E-shape and A-shape barres, the A-shape 9, and the E-shape maj7 with the 5th string muted.
- **Scales.** Pentatonic boxes 1–5 match the standard boxes. The CAGED positions and the 3NPS patterns are right, and
  the finger choices follow the 3NPS rule (1-2-4 / 1-3-4). Mode spellings and key signatures are right; the altered
  scale is the 7th mode of melodic minor.
- **Arpeggios and voicings.**
  - Triads, inversions on four string sets, 7th / dim7 / 7♯5 / 7♭5 / 7♭9 / 7♯9 arpeggios are correct.
  - The ii–V–I arpeggios stay in one position.
  - Drop-2 voicings are genuine drop-2 (the 2nd voice from the top dropped). Drop-3 has the root on string 6 or 5 with
    a string skipped.
  - The harmonized scale is in drop-2 with the melody on top, and the shells are R-7-3 / R-3-7.
- **Right hand.**
  - Outside / inside picking strokes are right, and economy picking sweeps on string changes.
  - The 5-string sweep is A-shape with the right strokes, and the banjo forward roll is 3-2-1-3-2-1-3-1.
  - The hybrid and chicken patterns are right.
  - The PIMA / Giuliani / Travis / tremolo p-a-m-i / campanella / ligado patterns are right.
- **Lead.**
  - Bends: ½, 1 and 1½ steps, release, pre-bend (heard at the bent pitch), and unison bends on 3-2 and 2-1.
  - Harmonic pitches: 12 = +12, 7 = +19, 5 = +24, 4 / 9 = +28.
  - Vibrato widths and the B.B. King box are right.
- **Rhythm and styles.** Clave 3-2, bossa (thumb on root / fifth), Freddie Green shells, shuffle 5–6, boom-chick,
  funk E9 on 5-4-3-2-1, drop-D gallop and chugs are right. In flamenco, the soleá (3 6 8 10 12), bulería (from 12),
  seguiriya (2+2+3+3+2) and rumba (3+3+2) accents, the Andalusian cadence and E Phrygian picado are right.
- **Measurement.** Only measured takes count:
  - `itemPass` uses the pass log (clean, at or above the goal, never after "Slower").
  - Stars use the 5-step scale, and a level is done at 3.
  - The self-checks (pick direction, fingers, muting, relaxation) are tick boxes and never graded.
  - Takes record XP with the active course, and `courseOfResult` sends a `tech:g-*` result to the guitar league slice.
  - Practice games and rows follow `COURSE_GAMES` / `COURSE_ROWS`.
  - Every exercise screen I looked at fits 390×844 without vertical scrolling.

## 4. What remains (by priority)

### P1: decisions for the owner

1. **Target tempos.** Every guitar level's target is its start tempo × 1.25 (`DEFAULT_TARGET_FACTOR`); the bass levels
   have real ranges instead. That makes "level passed" mean 75 ♩ in 8ths for chromatic 1-2-3-4, while graded syllabi
   expect about 100–120 by RGT grade 3 / Rockschool grade 3. A proposal in the bass style (`tempo: [start, target]`):
   - fretting L1–4: 60→100 (8ths); L5: 50→90 (16ths); L6: 60→90.
   - picking L1–2: 60→110; L3: 50→90 (triplets); L5: 60→100 (16ths); L6: 40→80.
   - legato L1–3: 60→100; L5: 60→100 (triplets); L6: 60→100.
   - scales L1–5: 60→100; L6–7: 75→120.
   - arpeggios L1–5: 60→100.
   - chords: one-minute changes are counted in changes per minute, so keep them on the ladder.
   - rhythm: 70→100, funk 80→100, metal 90→140.
   - lead: untimed bends could use `untimed` (off the ladder, like bass B10).

   The ranges change difficulty and placement, so they need the owner's OK.
2. **Which families the guitar path uses.** With no guitar style chosen (the default), the path takes **all 13
   families**, so every player gets flamenco, jazz and target-note improvising. Every family's level *n* also has the
   same path difficulty (700 + 70·n): sweep picking (picking L6) sits next to barre changes (chords L6), and 3-notes-
   per-string picking (picking L3) comes before the 3NPS scale patterns (scales L6). Two options:
   - ask the style when the guitar course starts, with core families as the default (fretting, picking, legato, scales,
     arpeggios, chords, rhythm, lead, reading, fingerstyle);
   - give the guitar levels a difficulty of their own.

   This is a learning-path change; the memory note says to brainstorm before big path changes.
3. **Chord recognizer** (from the roadmap): not built. Chords played into the microphone are judged by the ring-check
   (chroma) inside drills only. The topics fall back to tapping the neck.
4. **Placement.** There are five guitar probes (fretting, scales, chords, rhythm, legato). The other families start at
   the probes' mean − 1 by tempo band. That is fine for technique, but a style probe (strum feel, bends) would place
   lead and rhythm better.

### P2

- **The bass course has the same leftovers.** A piano keyboard under questions (`noteViewsOf` swaps it only in the
  guitar course: a guitar tab under a bass question would be wrong) and a piano sound for questions. Bass samples exist
  for the drills, so a "bass" course sound is close.
- **Insights** (menu → Progress): "Ear index" and "Confusion map" are ear-and-theory cards and show in the guitar course
  too.
- **Timbre.** Only a steel-string model exists. Nylon (classical / flamenco styles) and a clean electric would need a
  second model or samples.
- **Reggae skank** strums all six strings down. The idiomatic chop is on the top 3–4 strings, choked quickly; the
  measurement is unaffected.
- In the level grid, the harmonics cell shows the stored key ("A"); a neutral mark would be clearer.
- **Hebrew terms differ between the topics and the drills**:
  - בוקס / תיבה, פוזיציה / מצב, טריאדה / משולש, שורש / יסוד, ארפג׳ו / ארפג׳יו;
  - shells are "קונכיות" in the drills but "שלדים" in the badges.

  One glossary pass would align them.
- **Badges** use playful titles ("Chicken Picker", "Wall Spider", "Rubber Hand"), and `badges.ts` keeps emoji per
  family. These belong to the mature-UI pass.

### P3

- In RTL captions, number lists ("12, 7, 5") can display reversed. Use `<bdi>` around the numbers.
- `chordread.test.ts` and `variety.test.ts` can time out (~40 s) when the machine is busy. They pass alone. This was
  already the case before the audit.

# 0.38 — "Your instrument, your ears" (spec addendum AE)

Source: the curriculum audit (`docs/CURRICULUM_GAPS.md`, 2026-11-07). The product owner approved everything in it
**except A9** (rhythm syllables, hand signs) **and A10/A11** (world music outside the maqam world; instrument
recognition from recordings). The tuner from the guitar roadmap ships here because the tuning game and "play it
on your instrument" share its pitch engine. The chord / cadence builder and the chord recognizer stay on the
roadmap (`guitar-roadmap` memory) for 0.39.

English is the default; every new string is EN + HE and every new screen is checked at 320 px in both languages.

---

## 1. What changes at the top level

| Area | Change |
|---|---|
| Domains (Skill Map, Home tiles, intake ranking, placement by area) | 6 → **7**: new domain **Instrument & sound** (`instrument`), hue `--hue-instrument: #8FE36B` |
| Skills | 24 → **27**: `instrument` (fretboard / keyboard / play-back), `timbre` (production ear), `dictation` (written dictation) |
| Sub-skills | +~30 (§4) |
| Question kinds | +`place` (enter notes on an instrument or the staff), +`fx` stimulus (processed sound), +`tap2` (two-hand taps), rhythm-read gets click patterns and a "tempo only" mode, `sing` gets `promptBy: 'interval' | 'inner'` |
| Note views | the guitar view gets a **neck** and **chord boxes**; a new **answer surface** setting; instrument-aware playing (§3) |
| Intake | "What do you play?" gains **🎛 Production / DAW** and splits **🎸 Guitar** / **🎸 Bass**; the area ranking has 7 areas; the instrument setting is set from the answers |
| Path | +9 lessons, some only for players of an instrument (§6) |
| Weighting | tags for every new exercise, importance per track **and per instrument** (§5) |
| Tools | **Tuner** (menu + practice tools) |
| Games | +Voice Flight, +Rhythm Highway, +Melody Puzzle, +Tune-up, +Bingo (rooms and classes), +Pitch Memory, +Name That Tune |

---

## 2. Domains and skills

| Domain | Skills (new in bold) |
|---|---|
| Pitch & harmony | degrees, intervals, chords, cadences, modes, pitch, absolute |
| Time | rhythm-dictation, rhythm-reading, timing, tempo, meter |
| Memory & structure | sequences, rhythm, form |
| Voice | singing, technique, agility |
| Reading & theory | notes, theory, sight, **dictation** |
| Creative & applied | improv, transpose, expression |
| **Instrument & sound** | **instrument**, **timbre** |

- `dictation` = **Written dictation** / **הכתבה בכתב**: what you hear, written on the staff or built on a grid.
  The older dictation by degrees stays in `sequences/melody` (it is memory, not writing).
- `instrument` = **Your instrument** / **הכלי שלך**: where the notes are (neck, keys), shapes, and playing back what
  you hear on a real instrument.
- `timbre` = **Sound & production ear** / **אוזן של סאונד והפקה**: frequencies, space, panning, dynamics processing.
- Each new skill gets a placement ladder (≥ 5 rungs, rising) and enters `SKILLS`, the Skill Map radar (7 axes),
  the domain tiles on Home (7 tiles + 1 "Tuner" tile to keep the grid even), the domain chips of "Find my level", the
  catch-up card (new skills are unmeasured, so existing players are offered them), weekly snapshots.

---

## 3. Seeing and answering notes (the note-views change)

### 3.1 Views (what is drawn)

Still **two of three** views, chosen in Settings → *Show notes as*: **Keyboard**, **Staff**, **Guitar**.

- **Guitar** (was "tab") now draws the right picture for the content:
  - a melody → **tab** (as today);
  - a chord → a **chord box** (vertical diagram, dots, open/muted strings, barre, base fret);
  - a single note, interval or scale position → a **neck** (frets 0–15, inlays at 3 5 7 9 12 15, string names).
- Strings and tuning follow the instrument: guitar 6 strings (standard, drop D, DADGAD, open G, half-step down),
  bass 4 strings (standard). **Left-handed** flips the neck and chord boxes (Settings).
- **Direction:** keyboard, staff, neck and boxes are physical pictures and **never mirror in RTL** (`dir="ltr"`
  islands); their labels are translated.
- Rhythm exercises keep no note views (unchanged). The new sound-production exercises show no note views.

### 3.2 During a question (unchanged rule, one addition)

- Before the answer: only an aid when one is on (unchanged); listening questions never show the answer.
- **New:** questions that are *answered on an instrument* (`place`) show the **answer surface** in place of the
  views (the other view is hidden until the answer, so it cannot leak). Notes that are *given* (a written note to
  find on the neck, the upper voice of a two-part dictation) are drawn on the staff above the surface.
- After the answer: both chosen views show what sounded (unchanged), and on a `place` question **your notes and
  the right notes** are drawn together (yours in coral where wrong, mint where right).

### 3.3 The answer surface

Settings → *Answer on*: **Automatic** (default: the first chosen view — Guitar → neck, Keyboard → keys,
Staff → staff), or a fixed one. A topic may force a surface (fretboard topics always use the neck; keyboard-map
topics the keys; staff dictation the staff).

| Surface | How you enter a note |
|---|---|
| Keys | tap a key (2 octaves, scroll for more); a chord = several keys, then ✓ |
| Neck | tap a string at a fret; the note sounds; one note per string for chords |
| Staff | tap a line or space (snaps), ♯ ♭ ♮ buttons, a duration palette (𝅗𝅥 ♩ ♪ dotted) when rhythm counts, undo, ▶ play mine |

All surfaces: **undo**, **clear**, **▶ play what I entered**, **✓ done** (or auto-submit when the count is reached
and the topic says so). Keyboard: arrows move, Enter places, Backspace undoes. Every surface has an accessible list
of the entered notes.

### 3.4 Playing on your instrument (physical input)

- Settings → *Instrument*: **Voice** (default), **Guitar**, **Bass**, **Keys**, **C / B♭ / E♭ / F instrument**
  (existing). The intake sets it: guitar → Guitar, bass → Bass, keys only → Keys, winds → asked in Settings.
- The mode switch gains **🎸 Play** when the instrument is not the voice, or MIDI is on. In Play mode:
  - every **singing** task becomes "play it" (text and narration say *play*); grading is octave-free as today;
    guitar sounds an octave below written, bass two — names use **written** pitch, as players read them;
  - **`place` questions** are answered by playing: notes are captured one by one (onset = a new stable pitch for
    ≥ 120 ms, or a re-attack of the same pitch detected by an RMS jump); chords on MIDI = notes held together;
    chords by microphone are **not** recognised in 0.38 (that is the 0.39 recognizer) — a chord `place` question
    falls back to the surface;
  - **degree / note-name** questions accept a played note (mic or MIDI) like MIDI does today.
- Mic capture for instruments uses a 4096-sample window below 100 Hz (bass), confidence ≥ 0.85, and ignores
  pitches outside the instrument range (guitar E2–E6, bass E1–G4).

### 3.5 Grading `place`

- `as: 'seq'` (order matters) or `'set'` (a chord / all positions); `match: 'exact'` (same MIDI note: the neck,
  the keys, the staff) or `'pc'` (any octave: played back on an instrument, unknown register).
- Score = right notes / max(target, entered) (wrong extras cost); correct = score 1. Rhythm (staff dictation with
  durations): each note's duration counts half of that note. Scores 0..1 feed the ratings as graded results.
- Fretboard positions: any string/fret giving the asked pitch is right unless the question names the string.

---

## 4. Exercises (topics), levels and tags

Format: **topic** — skill — levels — tags (sub-skill: weight). All generators are deterministic from
`(topic, level, seed)`, every answer is reachable, every topic has a quick lesson card and appears in a topic group.

### 4.1 Your instrument (A1, A2)

| Topic | Levels | Tags |
|---|---|---|
| `play-back` — Play it back | 1 one note · 2 three notes, steps · 3 five notes with leaps · 4 a phrase with a chromatic note · 5 an interval up from a given note · 6 the bass line of four chords | instrument/echo .6, sequences/melody .4 (L6: + cadences/progression) |
| `fret-notes` — Notes on the neck | 1 natural notes on strings 6 and 5 · 2 natural notes, all strings · 3 with sharps and flats · 4 every place of one note (frets 0–12) · 5 the same note inside a position (V, VII…) | instrument/fretboard .7, notes/names .3 |
| `fret-intervals` — Intervals as shapes | 1 octave shapes · 2 3rds, 5ths and 4ths across two strings · 3 every interval, with the G–B shift · 4 play the interval up from a given fret | instrument/shapes .6, intervals/melodic .4 |
| `fret-chords` — Chord shapes | 1 open chords by diagram (C A G E D, minor) · 2 build a triad on the top three strings · 3 CAGED: which shape? · 4 seventh chords (drop 2 / drop 3) · 5 triad inversions on a string set | instrument/shapes .6, chords/quality .4 |
| `fret-scales` — Scales on the neck | 1 major scale from a root on string 6 · 2 minor pentatonic box 1 · 3 which pentatonic box (1–5)? · 4 three notes per string | instrument/fretboard .6, modes/scales .4 |
| `key-notes` — Notes on the keys | 1 white keys · 2 black keys (both names) · 3 a note in a named octave (middle C = C4) · 4 build an interval · 5 build a triad or seventh chord | instrument/keyboard .7, notes/names .3 (L4–5: theory/spelling .3) |

Only shown, scheduled and placed for players who play that instrument (guitar/bass → `fret-*`, keys → `key-notes`;
`key-notes` 1–3 also for everyone on the student/pro track, the keyboard being the theory picture). `play-back`
for anyone with an instrument or MIDI; voice-only players don't get it (they sing the same material already).

### 4.2 Written dictation (A3)

| Topic | Levels | Tags |
|---|---|---|
| `staff-dictation` — Write the melody | 1 three notes by step in C · 2 five notes, leaps in the home chord · 3 six to eight notes, any major key · 4 with rhythm (half, quarter, eighth, dotted) · 5 minor and one chromatic note · 6 bass clef | dictation/melodic .6, sequences/melody .25, notes/staff .15 |
| `rhythm-build` — Build the rhythm | levels R1–R7: hear two bars, build them from blocks (the existing builder, now its own topic) | dictation/rhythm .7, rhythm-dictation/dictate .3 |
| `two-part` — Two voices | 1 the upper voice is given: write the lower (steps, contrary motion) · 2 the lower is given: write the upper · 3 both, four notes each | dictation/two-part .6, form/voices .4 |
| `bass-dictation` — Write the bass | 1 roots of I IV V · 2 with inversions (I6, V6) · 3 with passing notes | dictation/bass .6, cadences/progression .4 |

Before the first note: the key is played (cadence) and the first note is given and drawn. Replays: 3 free, then
each replay lowers the XP by 10 % (shown).

### 4.3 Inner hearing (A4)

| Topic | Levels | Tags |
|---|---|---|
| `audiation` — Hear it in your head | 1 a known song goes silent for two notes and comes back: right place or wrong? · 2 a scale goes silent: which degree does it come back on? · 3 a tune goes silent for a bar: which continuation is in time and in tune? · 4 keep it going silently, then **sing** the note where it would be (sing, `promptBy: 'inner'`) · 5 a progression goes silent for two chords: which chord comes back? | sequences/inner .7, degrees/diatonic .3 (L5: cadences/progression .3) |

The click keeps going during the silence (it is not an internal-pulse exercise).

### 4.4 Sound & production ear (A5)

New stimulus `fx`: a source (`pink` noise, `loop` = a synthesised band loop: drums + bass + keys, `drums`,
`voice-like` = vowel-filtered sawtooth) through a chain: peaking EQ (freq, gain dB, Q), shelves, stereo pan,
reverb (generated impulse, decay s, mix), delay (time, feedback, mix), compressor (threshold, ratio), drive
(wave-shaper amount), level (dB). A/B items play *A (bell 1) → B (bell 2)*. Built only from Web Audio (no files).
Headphones are recommended (a one-time card), and pan items ask for them.

| Topic | Levels | Tags |
|---|---|---|
| `eq-ear` — Which frequencies? | 1 boost: low, middle or high (pink noise) · 2 octave bands 125 Hz–8 kHz · 3 on the band loop · 4 boost or cut, and where · 5 third-octave neighbours · 6 how much (+3, +6, +9, +12 dB) | timbre/eq 1 |
| `space-ear` — Room and echo | 1 dry or with reverb · 2 small room, hall or cathedral · 3 delay: quarter, eighth or dotted eighth? · 4 more or less reverb than before | timbre/space 1 |
| `pan-ear` — Left or right | 1 left, centre, right · 2 five positions · 3 which instrument of the loop is panned left? | timbre/pan 1 |
| `dyn-ear` — Squash and grit | 1 compressed or not (drums) · 2 none, light or heavy · 3 clean, drive or fuzz · 4 which is louder (1–3 dB)? | timbre/dynamics 1 |

### 4.5 Chords, chromatic harmony, form (A6, A7, B)

| Topic | Levels | Tags |
|---|---|---|
| `triads` — Triad types | 1 major, minor, diminished · 2 + augmented · 3 + sus2, sus4 · 4 inversions of any triad · 5 close or open position | chords/quality 1 (L4: chords/inversion) |
| `seventh-chords` — Seventh chords | 1 maj7, 7, m7 · 2 + m7♭5, dim7 · 3 + m(maj7), maj7♯5, 7sus4 · 4 inversions of a dominant 7th (root, 6/5, 4/3, 4/2) · 5 inversions of any seventh | chords/seventh 1 (L4–5: chords/inversion .6, chords/seventh .4) |
| `chromatic-harmony` — Colour chords | 1 cadential 6/4 before V or plain V · 2 Neapolitan (♭II6) or iv / ii° in minor · 3 augmented sixth or V/V · 4 tritone substitute or V7 · 5 diminished passing chord (♯iv°7, ♯i°7) · 6 borrowed: iv, ♭VI or ♭VII in major | cadences/chromatic .7, chords/quality .3 |
| `chromatic-theory` — Colour chords on paper | 1 name the cadential 6/4 (figures) · 2 spell the Neapolitan · 3 It+6, Fr+6 or Ger+6? · 4 secondary leading-note chords (vii°7/V) | theory/chromatic .8, theory/spelling .2 |
| `song-form` — Song form | 1 verse or chorus? · 2 which plan: VCVC, VCVCBC or AABA? · 3 12-bar blues: which bar did it reach (1, 5, 9, turnaround)? · 4 AABA: which section now? · 5 binary, ternary or rondo? · 6 which jazz form: 12-bar blues, 16-bar, 32-bar AABA, rhythm changes? | form/song .8, cadences/progression .2 |

Song form is built from synthesised arrangements (drums, bass, chords, a lead motif): the chorus is fuller and
louder with a repeated hook, the bridge changes key or chord colour. Sections are 2–4 bars at quick tempos so
an item stays under ~25 s; level 3/4 play a position, then ask.

### 4.6 Time with the click (A8, B)

| Topic | Levels | Tags |
|---|---|---|
| `click-subdivide` — Subdivide the click | tap: 1 eighths on a quarter click · 2 triplets · 3 sixteenths · 4 switch every bar (8th → triplet → 16th) · 5 swung eighths | timing/subdivide .8, rhythm-reading/read .2 |
| `click-backbeat` — The click moves | tap quarters with: 1 the click on 2 and 4 · 2 on beat 1 only · 3 on the "and"s · 4 once every two bars | timing/backbeat 1 |
| `gap-click` — Gap click | the click plays, then drops out: 1 two bars on, one off · 2 two on, two off · 3 one on, three off · 4 random gaps | timing/gap .7, tempo/compare .3 |
| `tempo-memory` — Tap a tempo from memory | no reference: tap 1 60 BPM · 2 120 BPM · 3 any asked tempo 70–160 · 4 the asked tempo, then hold it with the click gone; score by % error (≤ 3 % = full) | tempo/produce 1 |
| `poly-tap` — Two hands | two pads (left, right): 1 2 against 1 · 2 3:2 · 3 4:3 · 4 3:2, then swap hands | timing/poly .7, rhythm-dictation/poly .3 |
| `rhythm-errors` — Spot the rhythm slip | see one or two bars, hear them played with one change: 1 which beat? (one bar) · 2 which beat? (two bars) · 3 subtle (dotted vs even, early push) | rhythm-reading/errors .7, rhythm-dictation/dictate .3 |

Deepened (new levels on existing topics):

| Topic | New levels |
|---|---|
| `polyrhythm` | 3 7:4 and 5:4 · 4 which part is faster? |
| `swing-ratio` | 3 swing at fast tempos · 4 on top, laid back or rushing? |
| `syncopation` | 3 sixteenth pushes · 4 anticipations across the bar line |
| `downbeat` | 3 with a pick-up (anacrusis) · 4 in 3/4 and 6/8 |
| `displacement-3` | 2 find the shifted version (6/8) · 3 3/4 with sixteenths |
| `eastern-rhythm` | 3 Wahda, Ayyub, Chiftetelli, Zaffa · 4 Samai Thaqil 10/8 vs Aksak 9/8 · 5 **tap it** (rhythm-read with dum/tek words) |

### 4.7 Pitch, voice and the rest (B)

| Topic | New levels / new topic |
|---|---|
| `maqam` | 4 Huzam, Nawa Athar, Shahnaz, Kurd · 5 neutral, major or minor third? (quarter tones) · 6 sayr: which maqam did it move to? |
| `scale-types` | 4 melodic minor, whole-tone, diminished · 5 bebop major or bebop dominant? |
| `degrees-ext` | 3 degrees in dorian / mixolydian contexts · 4 chromatic degrees in minor |
| `chord-scale` | 3 melodic-minor chord-scales (lydian dominant, altered, locrian ♮2) |
| `transpose-adv` | 3 clef transposition: read treble as if alto or tenor |
| `mood` | 3 eight moods (majestic, mysterious, playful, nostalgic …) · 4 what made it sadder: mode, tempo, loudness or register? |
| `bh-keys`, `bh-tone`, `bh-pivot` | a second level each: more keys / descending / name the note |
| **`sing-intervals`** (new) — Sing an interval — singing | 1 up a 3rd, 5th or octave from a given note · 2 any interval up · 3 down · 4 inside a key, from a non-tonic note (sing, `promptBy: 'interval'`) — tags singing/intervals .7, intervals/melodic .3 |

### 4.8 Sub-skills added

`instrument/{echo, fretboard, shapes, keyboard, tuning}`, `timbre/{eq, space, pan, dynamics}`,
`dictation/{melodic, rhythm, two-part, bass}`, `sequences/inner`, `cadences/chromatic`, `theory/chromatic`,
`form/song`, `timing/{subdivide, backbeat, gap, poly}`, `tempo/produce`, `rhythm-reading/errors`,
`singing/intervals`. Prerequisites (`SUB_PREREQ`): dictation/melodic ← sequences/melody + notes/staff;
dictation/two-part ← dictation/melodic; dictation/bass ← cadences/progression; cadences/chromatic ←
cadences/progression; theory/chromatic ← theory/harmony; form/song ← form/phrases; timing/poly ←
timing/subdivide; instrument/shapes ← instrument/fretboard; timbre/* — none; sequences/inner ← sequences/melody.

---

## 5. Weighting

- `IMPORTANCE` gets `dictation` (explorer 0.1, hobby 0.4, student 1, pro 0.9).
- `instrument` and `timbre` depend on **what the player plays** (new `plays` input to the scheduler):
  - instrument: 1 when the player plays guitar, bass or keys (or MIDI is on), 0.5 for other instruments, 0.15 for
    voice-only / nothing (only keyboard geography 1–3 is offered then).
  - timbre: 1 for production, 0.4 for pro, 0.3 for others.
- Per-sub filter: sub-skills that need an instrument the player doesn't play (fretboard for a pianist) are not
  scheduled; the skill rating of `instrument` is the weighted mean of what the player does.
- Domain value of `instrument & sound` uses only measured skills (as all domains) — a singer who never touches it
  sees it "not measured", never 0.
- Track targets are unchanged.

---

## 6. Intake, path and map

### 6.1 Intake

- *What do you play?*: Nothing (yet) · 🎹 Keys · 🎸 Guitar · 🎸 Bass · 🎻 Strings · 🎷 Winds · 🥁 Drums · 🎤 Voice ·
  **🎛 Production / DAW** (new). "Guitar / bass" is split (old answers `guitar` stay guitar).
- *Rank the areas*: 7 areas. Default place of Instrument & sound when the player has none of guitar/bass/keys/
  production: last.
- Settings set by the intake: instrument (guitar / bass / keys), note views (guitar / bass → Guitar + Staff), answer
  surface Automatic.
- Existing players (intake taken before 0.38): the catch-up card inserts the new area by the same rule and asks one
  question once: "Do you make music on a computer?" (adds `production`). Their ranking is otherwise kept.
- `priorityBoost` table extends to 7 ranks (220, 140, 70, 25, 10, 0, 0).

### 6.2 Path (new lessons)

| Lesson | Area | After | Shown to |
|---|---|---|---|
| `fretboard-1` — Notes on the neck | instrument | — (early for guitarists) | guitar / bass |
| `keyboard-1` — Find it on the keys | instrument | — | keys; student / pro |
| `play-back` — Play it back | instrument | `fretboard-1` or `keyboard-1` | any instrument |
| `seventh-chords` — Four-note chords | pitch | `jazz-1` → *before* `jazz-1` (it prepares it) | all |
| `staff-dictation` — Write what you hear | reading | `note-sequences` | all |
| `inner-hearing` — Hear it in your head | memory | `songs` | all |
| `song-form` — Verse, chorus, bridge | memory | `cadences` | all |
| `click-groove` — Groove with the click | time | `rhythm-r3` | all |
| `colour-chords` — Colour chords | pitch | `jazz-2` | student / pro |
| `sound-ear` — Ears of a producer | instrument | — | production; pro |

Lessons have an optional `forPlays` / `forTracks` filter; `personalOrder` drops lessons whose filter excludes the
player (and their prerequisites still order the rest). Each lesson: 6–8 items from its topics, an intro, a quick
lesson (mini) and a tip, EN + HE; a node icon.

### 6.3 Skill Map and Home

- Radar with 7 axes; the Instrument & sound card lists instrument and timbre with their sub-skills.
- Home domain tiles: 7 tiles + a **Tuner** tile (keeps a 2-column grid even).
- Topic groups (Practice → topics): new groups **Your instrument** (play-back, fret-*, key-notes),
  **Sound & production** (eq, space, pan, dyn), **Written dictation** (staff-dictation, rhythm-build, two-part,
  bass-dictation); `audiation` joins Memory; `triads`, `seventh-chords`, `chromatic-harmony`, `song-form` join
  Harmony / Form; the click topics join Meter & rhythm; `chromatic-theory` joins Written theory; `sing-intervals`
  is in the Voice row.

---

## 7. Tuner

Menu → **Tuner**, Practice tools → Tuner, Home tile.

- Chromatic: note name (naming setting; written pitch for transposing instruments), cents needle ±50 with a
  green ±5 zone, frequency, stable-note lock (300 ms). Low-latency loop (YIN, 4096 window under 100 Hz).
- Presets: Chromatic, Guitar (standard, drop D, DADGAD, open G, ½ step down), Bass (EADG), Ukulele (GCEA),
  Violin (GDAE). In a preset the nearest string is chosen automatically, or tap a string; ▶ plays the reference.
- A4 calibration 430–450 Hz (default 440), kept in settings; used by the tuner only.
- Mic permission handled like singing (the same permission panel); nothing is recorded.

---

## 8. Games

| Game | How it plays | Progress |
|---|---|---|
| **Voice Flight** | a drone sets the key; gates (gaps between pillars) sit on scale degrees; your sung or played pitch is the bird's height; levels: wide gates by step → narrow gates with leaps → chromatic | distance + gates; saved at the last checkpoint (every 10 gates) |
| **Rhythm Highway** | notes of a rhythm level (R1–R8) scroll to a hit line with a backing loop; tap on time; perfect/good/miss, combo | % accuracy; per-song best; resumes at the last section |
| **Melody Puzzle** | hear a melody; drag note tiles (degrees or names, + 1–2 decoys) into slots; replays cost points | time + replays; resumes the current puzzle |
| **Tune-up** | a string is detuned (±5–50 ¢); turn the peg (drag) until the beats vanish; then optionally tune your real guitar with the tuner | ¢ error per round; best |
| **Bingo** (rooms, classes) | each player gets a 4×4 card of chords / intervals / progressions; the host plays; mark; first line wins | multiplayer: not saved |
| **Pitch Memory** | once a day: sing or play your A (or any chosen note) with no reference; error in ¢; a 30-day trend | daily log |
| **Name That Tune** | hear the opening of a known song (from SONGS), pick the title — faster = more points | best |

Solo games resume after Back / reload (never lose progress); multiplayer games are not saved.

---

## 9. Implementation notes

- `TopicDef.gen` may return `ChoiceQuestion | PlaceQuestion | RhythmReadQuestion | SingQuestion | Tap2Question`;
  `genTopic` applies surface variation only to choice items. Review / rebuild by tag works for all.
- New pure modules: `engine/fretboard.ts` (tunings, positions, shapes, CAGED, boxes), `engine/place.ts` (grading),
  `engine/fx.ts` (fx specs → node graph description, pure), `engine/form.ts` (arrangement builder),
  `engine/tuner.ts` (note/cents math, string choice), `engine/highway.ts`, `engine/flight.ts`, `engine/bingo.ts`.
- Audio: `audio/fx.ts` renders an `fx` stimulus with Web Audio; the player stops cleanly on skip.
- UI: `ui/Fretboard.tsx` (neck, chord box, input), `ui/KeysInput.tsx`, `ui/StaffInput.tsx`, `ui/Tuner.tsx`,
  `ui/Flight.tsx`, `ui/Highway.tsx`, `ui/MelodyPuzzle.tsx`, `ui/TuneUp.tsx`, `ui/PitchMemory.tsx`, `ui/NameTune.tsx`,
  bingo inside the room screens.
- Tests: taxonomy coverage (every new topic and level tagged, every sub reachable, ladders rising); each generator
  deterministic and every answer reachable; place grading; fretboard maths; fx spec; tuner maths; highway / flight
  scoring; bingo cards; intake (7 areas, new plays, catch-up insertion); personalOrder filters; scheduler
  importance by plays. E2E: tuner, a fretboard place question, staff dictation entry, highway, flight (fake pitch),
  bingo card, overflow at 320 px in both languages for every new screen.
- Version 0.38.0 changelog (EN / HE).

---

## 10. Review pass (before building) — additions and corrections

A second comparison against the syllabi (ABRSM / Trinity / RCM theory and aural 1–8, conservatory years 1–2,
Berklee) and the apps (EarMaster, ToneGym, Musical U, Perfect Ear, Teoria, SoundGym, Quiztones, Yousician,
Simply Piano, Melodics, Sight Reading Factory) plus a check against the code. Everything here is part of 0.38.

### 10.1 Corrections (would not work as first written)

| # | Problem | Correction |
|---|---|---|
| R1 | A boost / drive / reverb makes B louder; the compressor makes it quieter — players would answer by level | `fx` items are **loudness-matched** (RMS of the render) except `dyn-ear` level items |
| R2 | Phone speakers can't play 125–250 Hz | items with energy below 300 Hz **require headphones** (a card: "I'm wearing headphones"); without them those levels use 500 Hz–8 kHz only |
| R3 | Play mode can't do glide, messa di voce, vibrato, straight tone, crescendo on a piano or fretted guitar | a `playable` rule: only pitch-content tasks become "play it" (match, degrees, sequences, sight, harmony line, intervals, play-back); vocal-technique tasks stay sung |
| R4 | Piano by microphone (polyphonic, pedal) and guitar let-ring confuse onset capture | MIDI is the main input for Keys; mic Keys says "play detached, no pedal"; guitar / bass show "mute between notes"; onsets also accept an RMS re-attack |
| R5 | Song forms can't be told from 2–4-bar excerpts under 25 s | `song-form` L2 / L6 items may run to ~45 s, with a visible bar counter and a scrolling chord chart |
| R6 | Aug-6 vs V/V only works with the right voicing | generator rule: +6 with ♭6 in the bass moving down to 5, V/V in root position, both always resolve |
| R7 | "Turn until the beats vanish" needs a sounding reference | Tune-up plays the reference string together with the detuned one |
| R8 | Touch latency (30–100 ms) breaks tight tap grading | all tap topics and Highway subtract the existing `tapLatencyMs`; a first-time calibration prompt if it was never measured |
| R9 | `gap-click` overlaps the internal-pulse item ("the clicks stop") | that item is re-tagged `timing/gap`; no double rating |
| R10 | Strings / winds / drums players had little to play | fingerboard and drums content below; winds weighted 0.4 for `instrument` |
| R11 | Voice mode (spoken answers) can't place notes on a neck | `place` items in voice mode accept **spoken note names** when the register doesn't matter (`match: 'pc'`); otherwise they switch to the touch surface with a spoken prompt |

### 10.2 Missing entirely — now added

| Topic (skill) | Levels | Tags |
|---|---|---|
| `scale-spelling` (theory) — Write the scale | 1 major · 2 natural minor · 3 harmonic and melodic minor · 4 chromatic · 5 modes — on the staff | theory/spelling .7, notes/staff .3 |
| `figured-bass` (theory) — Four-part harmony | 1 figures → which chord (5/3, 6, 6/4, 7, 6/5, 4/3, 4/2) · 2 fill in alto and tenor · 3 find the error in an SATB (parallels, doubling, spacing, unresolved 7th) · 4 complete a cadence in four parts | theory/voice-leading .6, theory/harmony .4 |
| `drum-read` (rhythm-reading) — Read the drum kit | lanes kick / snare / hi-hat on a percussion staff, tapped on 3 pads, keys or MIDI drums: 1 rock beat · 2 kick variations · 3 fills · 4 sixteenth hats · 5 open hat and ghost notes | rhythm-reading/drums .7, timing/precision .3 |
| `play-back` 7 (instrument) | **with rhythm**: pitch and onsets graded together | instrument/echo .5, timing/precision .2, sequences/melody .3 |
| Rhythm Highway **pitch lanes** | a mode with note lanes played on the instrument (mic / MIDI) | game |
| `note-reading` 6 (notes) | grand staff (both hands) | notes/staff 1 |
| `filter-ear` (timbre) — Cut-off | 1 high-pass or low-pass? · 2 where is the cut-off · 3 match it (slider) | timbre/eq 1 |
| `tone-hz` (timbre) — Name the frequency | 1 sine 250 / 1k / 4k · 2 octave bands · 3 third-octave | timbre/eq 1 |
| `width-ear` (timbre) — Wide or narrow | 1 mono or stereo · 2 narrow / medium / wide | timbre/pan 1 |
| `eq-ear` 7, `dyn-ear` 6 | **match it** with a slider | timbre/eq, timbre/dynamics |
| Fingerboard for bowed strings | the neck without frets, violin / viola / cello tunings; `fret-notes` levels 1–4 reused | instrument/fretboard |
| `sight-tap` (sight) | sing a written line while tapping the beat | sight/sing .6, timing/steady .4 |
| `odd-meter` 5 | mixed meter (7/8 + 3/4 …) | meter/odd |
| `time-signatures` 4–5 (theory) | 4 beaming and rest grouping · 5 where do the bar lines go? | theory/terms |
| `style` (form) — Which period? | synthesised idioms: 1 Baroque or Classical · 2 + Romantic · 3 + 20th century · 4 + jazz / pop | form/style 1 |
| `voice-count` 4 (form) | texture: monophonic, homophonic or polyphonic? | form/voices |
| `tempo-react` (tempo) — Quick reaction | tap when the tempo or the meter changes | tempo/compare .6, meter/count .4 |
| `counterpoint` (theory) | species error spotting: 1 first species · 2 second · 3 fourth (suspensions) | theory/voice-leading 1 |
| `ornaments` (theory) | ornaments on paper: trill, mordent, turn, appoggiatura | theory/terms 1 |

### 10.3 Deepened — now added

| Topic | New levels |
|---|---|
| `staff-dictation` | 7 6/8 with a pick-up · 8 minor with raised 6 and 7 · 9 eight bars, modulating to V · 10 chromatic / atonal |
| `harmonic-dictation` | 4 minor keys · 5 sevenths, ii–V–I · 6 secondary dominants and borrowed chords |
| `bass-dictation` | 4 soprano + bass + numerals |
| `two-part` | 4 two bars with rhythm · 5 four bars, imitation · 6 minor with suspensions |
| `modulation` | 4 from a minor key · 5 every closely related key |
| `cadence-types` | 4 in texture (melody + accompaniment) · 5 name the chords at the cadence |
| `roman-numerals` | 4 name the cadence in the score |
| `fret-scales`, `fret-chords` | bass levels: arpeggio shapes, root–5–octave, walking approach notes |
| `sing-intervals` | 5 sing the arpeggio of a named chord · 6 sing the roots of a heard I–IV–V–I |
| `space-ear` | 5 short or long decay · 6 pre-delay |
| `dyn-ear` | 5 fast or slow attack (drums) |

### 10.4 From the code check

- **Competitions:** new *choice* topics may feed the Daily challenge, duels, ghost race and live rooms; `place`,
  tap and `fx` items are kept out of multiplayer (input and headphone parity).
- **Glossary:** term chips for every new term (Neapolitan, augmented sixth, cadential 6/4, CAGED, figured bass,
  audiation, EQ, high-pass, compression, attack, reverb, pre-delay, stereo width …).
- **Settings migration:** `instrument` gains guitar / bass / keys / strings; new keys `answerSurface`,
  `leftHanded`, `tuning`, `a4`, `headphones`; intake `plays: 'guitar'` keeps meaning guitar.
- **Cloud sync:** game bests, Pitch Memory log and tuner A4 live in progress / settings that already sync.
- **Classes:** teachers can assign every new topic (the list comes from `TOPIC_GROUPS`).
- **Reduced motion:** Voice Flight and Highway get a calm variant (no parallax, slower scroll, no shake).
- **Achievements:** First tune-up, 100 gates (Flight), Full combo (Highway), 30 days of Pitch Memory.
- **Review queue:** every new item is rebuilt from its tag.
- **Speed scoring:** reference times for `place` (per note entered) and fx items (after the whole A/B).

### 10.5 Weights after the review

- `instrument` by what the player plays: guitar / bass / keys / strings / drums / MIDI → 1; winds 0.4;
  voice-only or nothing → 0.15 (keyboard map 1–3 only). A sub-skill is scheduled only when its picture fits the
  player's instrument (fretboard ← guitar / bass / strings; keyboard ← keys or student / pro).
- `rhythm-reading/drums`: 1 for drummers, 0.2 otherwise. `form/style`: explorer 0.3, hobby 0.5, student 0.8, pro 0.6.

### 10.6 Path additions after the review

`drums-1` — Read the kit (time; drummers) · `four-parts` — Four-part harmony (reading; student / pro, after
`colour-chords`) · `scale-writing` — Write the scale (reading; after `notes-degrees`).

---

## 11. Later additions (product owner, same day)

- **Read the chord** (`chord-read`, 7 levels): name chords drawn on the keys, the staff or a guitar (box / neck).
- **Speed games on one engine** (`engine/rush.ts`, `ui/Rush.tsx`): Chord Rush (picture: keys / staff / guitar /
  mixed), Note Rush, Fretboard Sprint, Interval Sprint, Key Signature Rush — 60 s, combo ×1.5 at 5 and ×2 at 10,
  a wrong answer costs 2 s, the level rises every 5 right — and **Progression Detective** (3 lives, level up every
  3 right). **Peak Hunter**: find the boosted frequency with a log slider (A/B loudness-matched).
- **Games count:** every single-player game becomes rated answers in the skills it trains (`engine/gameRating.ts`:
  right / wrong where counted, else accuracy over 3–6 rounds; touch-steered Flight doesn't count) → ratings,
  sub-skills, stats, and after a few games the path (✓ evidence, the frontier).
- **Games inside units:** each unit (≥ 4 steps) has one game step for its leading area, before the checkpoint
  (stars: 60 % = 1, 80 % = 2, 95 % = 3).
- **Play menu by category:** Ear & harmony · Rhythm · Memory · Reading & theory · Voice · Instrument & sound ·
  Against others (chips; "All" shows sections).

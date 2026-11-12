# Piano / keys course audit (2026-11-10)

This audit covers the keys course as released in 0.66.0. It covers:

- the technique catalogue: 10 families, 127 levels;
- the take analysis (MIDI and microphone);
- the instrument topics on the path;
- how the course is wired into the rest of the app.

It also builds what the course lacked most: ear training on the instrument. The depth and format follow
`GUITAR_AUDIT.md`, `BASS_FINAL_CHECK.md` and `DRUMS_AUDIT.md`.

Tests:

- `tests/pianoAudit.test.ts` (16): fingerings, voice leading, tempos, titles, and the human-take sweep.
- `tests/pianoEar.test.ts` (19): the pianist's ear, the new topics, and the wiring.
- `tests/pianoTake.ts`: the synthetic-take helper both files use.
- `e2e/keys.spec.ts` (24: two checks, then one per family × language): Technique, the MIDI notice, and every level's run screen at 390 × 844 in Hebrew and
  English. It ran on its own port (5209) with a temporary config that was not committed.

## 1. What was checked

### Content

A throw-away sweep generated every item of every level in every key it lists. It checked:

- **Pitch range and timing:** pitches 21–108, finite beats, positive lengths.
- **Fingering:** where the fingering is missing, and whether a thumb lands on a black key.
- **Hebrew titles:** Latin words.
- **Tempo:** each level's start → target in notes per second.

Two more scans ran on top of that:

- **Cadences:** every cadence (10 kinds × 12 keys × major / minor × 3 top positions, 2,664 chord changes) for parallel
  5ths and octaves (the bass included) and for voices leaping more than a 4th.
- **Hands:** every hands-together item, for the two hands sharing one key at the same moment.

The references were:

- **Fingerings:** the standard scale fingerings, as in the ABRSM *Scales & Arpeggios* books and Hanon Part II Nos. 39–43.
- **Exam speeds:** the ABRSM recommended minimum speeds for Grades 1–8 (2019–20 syllabus table, p. 11).
- **Harmony:** keyboard-style voice leading.
- **Jazz voicings:** Barry Harris's 6th-diminished scale; Levine-style rootless A / B voicings.

### Analysis

`analyzeTake` was run on human-like synthetic MIDI takes (`tests/pianoTake.ts`). Each take has:

- a seeded Gaussian onset jitter;
- the RH 6 ms ahead of the LH;
- velocities in the goal's band, with accents, crescendo or a top voice as the goal asks;
- releases as the articulation asks.

The steady pianist plays with an onset jitter of 1.8 % of the note gap, clamped to 5–9 ms. That is an IOI CV of about
2.5 %, "very even" in the research table. A sloppy take has twice the tempo band's SD limit. Every item of every level
was run at the level's **target** tempo, two keys per spec.

### Integration

The course was traced through these parts of the app:

- the path: symbols, five stars, order;
- XP, rating and the course tag;
- badges, quests, the league and the per-course level;
- the Practice tab and the Stats radar;
- the workout and Today;
- the level test (placement);
- the course switch and the piano sound.

## 2. Fixed

### Content (commit A)

| # | Where | Problem | Fix |
|---|---|---|---|
| C1 | Scales L6, L13, L15 (melodic and natural minor) | Black-key minors had **no fingering at all** (49 items: F♯, C♯, G♯, E♭, B♭, F and B melodic / natural, both hands) | The natural minor uses the harmonic-minor rows, checked key by key: the changed 7th is a white key wherever the thumb falls on it. The melodic minor going up uses its own RH row for F♯ and C♯ (2 3 1 2 3 4 1 2: the 6th and 7th are black). The top note turns with the way-down finger (3), and the descent uses the natural-minor row. Test: every major / harmonic / melodic / natural scale, 12 keys, RH / LH / HT, parallel and contrary, is fingered, and no thumb lands on a black key |
| C2 | Cadences L1–L7 | The RH chord was the nearest close position. **216 of 2,664 chord changes had parallel 5ths or octaves**, e.g. I–IV–V–I in C: C F A → D G B over F → G (octaves and 5ths with the bass). Deceptive V7–vi, V/V and N6 were affected too | `cadenceVoicing` picks the RH chord from the chord's pitch classes, one note doubled when the bass has the missing one (V7–vi doubles the 3rd). The pick minimises movement, with 100 points per parallel 5th / 8ve (bass included) and 50 for a doubled leading tone. Later chords may go down to F3, so a rising bass always gets contrary motion. Now 0 parallels and no voice moves more than a 4th |
| C3 | Advanced L3 (octaves HT) and fingers L13 (Czerny velocity) | **The hands shared a key.** Hands-together octaves put the LH's top note on the RH's bottom key (C2 in both hands). The Czerny run below the tonic ran into the LH chords | HT octaves are two octaves apart. The Czerny LH chord stays under the bar's lowest RH note. Test: no item has both hands on one key at once, except the unison where contrary motion starts and turns |
| T1 | Every level | **The tempo ladder was flat.** Every level's target was start × 1.25: scales 2.2 → 2.77 notes/s, arpeggios 2.0 → 2.5, even "4 octaves in 16ths" (2.67 → 3.33). The top levels stopped at about ABRSM Grade 3–4, against a Grade 8 minimum of 5.87 (scales) and 4.4 (arpeggios) | `LevelDef.nps`: a start → target speed in notes per second from the ABRSM table (`EXAM_NPS`), whatever the item's note value. Each item starts at it (its spec `tempo`), and `targetBpmOf` aims at it. See the table below. The other levels keep start × 1.25 |
| H1 | Titles | "Upper structure" was in English in the Hebrew title of voicings L16. Stride used "דסימות" while the rest of the app says דצימות. Key notes L5 said "טריאדה … ספטים" | "משולשי מבנה עליון", "דצימות" (also in `chartDrills`), "משולש או ספטאקורד". Test: no English words in Hebrew level titles (chord symbols, Roman numerals and the tune "So What" aside) and no emoji |

The levels that now have an exam speed:

| Level | Start → target (notes/s) | Matches |
|---|---|---|
| Scales L6 (melodic / natural HT) | 2.67 → 3.47 | Grade 3 → 4 |
| Scales L7 (chromatic) | 2.2 → 3.47 | Grade 2 → 4 |
| Scales L8 (3rd / 6th / 10th apart) | 2.67 → 4.2 | Grade 3 → 5 |
| Scales L9 (formula) | 2.67 → 4.2 | Grade 3 → 5 |
| Scales L10 (4 octaves, 16ths) | 3.47 → **5.87** | Grade 4 → **8** |
| Scales L11 (rhythm variants) | 2.2 → 3.47 | Grade 2 → 4 |
| Scales L13 (minor contrary / apart) | 2.67 → 4.2 | Grade 3 → 5 |
| Scales L14 (chromatic apart, 3 octaves) | 3.47 → 5.07 | Grade 4 → 6 |
| Scales L15 (melodic / natural HS) | 2.67 → 3.47 | Grade 3 → 4 |
| Arpeggios L6 (4 octaves, contrary) | 2.93 → **4.4** | Grade 5 → **8** |
| Arpeggios L10 / L11 (dom7 / dim7 from every note) | 2.53 → 3.33 | Grade 4 → 6 |
| Arpeggios L12 (3 octaves HT) | 2.93 → 3.73 | Grade 5 → 7 |
| Fingers L6 / L7 (Hanon in all keys, Part II) | 3.47 → 4.4 | Hanon ♩ = 52 → 66 in 16ths |
| Fingers L14 | 3.47 → 5.07 | |

The sweep found nothing else wrong:

- The major and harmonic-minor rows match the standard tables, including B, F, F♯ / G♭ and the flat keys (LH 3 2 1 4
  3 2 1 3).
- Chromatic fingering: 3 on black keys, 2 on F / C in the RH and E / B in the LH.
- Arpeggios are fingered only for white-key root-position chords (5 4 2 1 / 1 2 3 5, 7ths 5 4 3 2 1). That is
  deliberate: fingerings are help only, and are left out where unsure.
- Broken chords: 1 3 5, 1 2 5 and 5 3 1, 5 2 1 by inversion.
- Hanon No. 1 is encoded exactly.
- The cadence progressions: ii6 with the 4th in the bass, Ger+6 → I6/4, N6 over the 4th, Picardy, and VI / ii° in minor.
- The 6th-diminished scale is 1 2 3 4 5 ♭6 6 7.
- Rootless A / B in ii–V–I (Dm9 F A C E, G13 F A B E, Cmaj9 E G B D, and the B forms) and the minor ø9 – 7♭9 – m6/9.

### Measurement (commits A and B)

| # | Problem | Fix |
|---|---|---|
| A1 | **No human could pass a fast level.** The evenness rule asked for an IOI CV of 3 % at T5+ (≥ 5.5 notes/s). At Grade 8 speed (5.87 notes/s, 170 ms IOI) that is 5 ms of IOI spread, below the ~6 ms just-noticeable timing shift (Friberg & Sundberg 1995) and below what professional pianists play (Jabusch et al. 2004: SD-IOI ~10–20 ms at 8 notes/s). The sweep had every scale level from L6 up failing for a steady player. Dotted and swung items also failed, because a short note's error weighed 3× in the ratio CV | The limit is now max(CV × IOI, a floor of 12 ms of IOI spread by MIDI, 25 ms by mic): `IOI_FLOOR_MS`. Evenness is the SD of the IOI errors in ms over the mean IOI. For even notes that is the old CV; dotted, swung and triplet lines are now judged fairly. Callers with their own limits (the bass, A7) are unchanged |
| A2 | **The microphone "passed" loudness goals.** A mic take is all velocity 64 with no release. "Even p" was in band (34–64) at 64, so it passed. Velocity SD 0 passed "even". Legato / staccato skipped their rule (no release). The pedal was checked only with MIDI. Only measured practice counts | `micUnmeasurable(drill)`: a goal of loudness (dynamics, accents, voicing, balance), articulation or the pedal. `analyzeTake(…, { mic: true })` gives such a take `not` with "Needs a MIDI keyboard…" and `unmeasured`. In `DrillTake` the Play button waits with a one-line notice (`data-piano-needs-midi`), as the drums do without an e-kit. Mic takes also get the frame clock's limits (timing SD ≥ 28 ms, hands ≥ 35 ms), as the bass does |
| A4 | **Timing SD was counted per note.** The 4 notes of a chord counted as 4 samples, so a 3-chord voicing drill (12 notes, 3 onsets) halved a sloppy take's SD. A sloppy LH voicing take passed half the time | The SD is now over onsets (a chord's notes at their mean), as a sample SD (n − 1). A new rule catches "one note far off the beat": > 2.5 × the SD limit from the take's own mean, heard in a short drill whatever the SD says. A sloppy 3–5-chord drill now passes at most 1 in 4 seeds (the sample is small); longer drills never |
| A5 | "Any octave" matching paired an LH bass played an octave up with the RH's note of the same name, which scrambled the voice-leading measure | Same pitch class, nearest in pitch |

**The sweep (test A3)** covers every level, two keys per spec, at the target tempo:

- A steady take is clean in every item, including the new ear family.
- A sloppy one is never clean. The exception is 3–5-chord drills, where it is clean at most once in 4 takes.
- A plain scale by mic, quantised to the 25 ms frame clock, is clean.
- Loudness, articulation and pedal levels by mic are `not`, with the MIDI reason.

## 3. Built: the pianist's ear and the piano's own topics (commit B)

The keys course had three instrument topics (notes on the keys, play it back, play a song) and no ear content on the
instrument.

### `k-ear` Pianist's ear (8 levels, 15 items; symbol: ear over keys)

It works as call and response inside one take, like the bass ear and the drummer's ear:

- The app's piano plays the call (`listen`).
- The player answers on the keys in the next bars.
- The answer is hidden until the result. The ear card shows "Listen" / "You" bars.
- Every answer is matched by pitch class, so any octave counts. Each note or chord is its own set, so it works by MIDI,
  and by microphone through the score-informed chroma path.
- Notes played inside the call's bars are dropped, whatever the input (the speaker, or noodling).
- The tempo is calm: ♩ 72 → 88 (`LevelDef.tempo`). There is no speed ladder to climb.

| Level | Items | Content |
|---|---|---|
| 1 | One note in the key | I and V, then a note; play it. 4 rounds |
| 2 | Three notes, by step / with skips | The key, then 4 rounds of three quarters, echoed |
| 3 | Intervals up / up and down / together | 4 rounds of two notes (m2–octave); play both, in order (or together) |
| 4 | A two-bar melody (steps / leaps) | The key, then 2 rounds of a two-bar diatonic melody in 8ths and quarters |
| 5 | The bass line of four chords (roots / with inversions) | 4 chords, then their bass notes with the LH |
| 6 | A progression by ear (triads / with V7, ii7) | 2 rounds of 4 chords in half notes; play them back, any voicing |
| 7 | Harmonise a melody with I, IV, V | 4 melody notes, each fitting only one of I, IV, V (3 → I, 6 / 4 → IV, 7 / 2 → V), ending on the 3rd; play the chords |
| 8 | Transpose a melody (up a 5th / a 4th) | The key, a two-bar melody; play it in the key named, from its tonic |

How it is wired:

- **Path:** style "both", so it shows with every emphasis; level 1 sits with scales L1.
- **Hub:** a "Pianist's ear" topic.
- **Today and the workout:** offered from day one (`activeFamilies`).
- **Level test:** an ear probe, one take of ear L2. Clean starts the family at L3.
- **Badges:** three milestones, counted by the different items played back clean (3 / 7 / 15), with a drawn badge glyph.
- **Rating:** the ear share by level kind: melodic memory, melodic / harmonic intervals, the bass, progressions,
  harmonising, transposing.

### Three piano topics on the path

All three are answered on the keys (tap or MIDI) and graded note for note in the exact octave. Each has its own quick
lesson (core + in depth), short path name, symbol and topic group.

| Topic | Levels |
|---|---|
| `key-read` Reading both clefs | Treble clef · bass clef · ledger lines, both clefs · sharps and flats · two notes at once. The note is drawn on the clef it names |
| `key-shapes` Chords as shapes | Major / minor triads · triads from black keys, dim, aug · inversions (named C/E) · seventh chords in every inversion · LH shells (1-3-7, 1-7-3) |
| `key-scales` Scales as shapes | Major from white keys · major from every key · harmonic minor · melodic minor · dorian, mixolydian, lydian |

## 4. Integration (commit B, C)

| # | Where | Problem | Fix |
|---|---|---|---|
| I1 | Path symbols | Four pairs shared a symbol: scales / advanced, arpeggios / voicings, cadences / jazz, and fingers / the key-notes topic. Accompaniment shared Highway's rhythm | Every keys-path step has its own: arpeggios `arp`, fingers `fingers1234`, control `hairpin` (new), advanced `octave`, voicings `voicing` (new), jazz `target`, accompaniment `walk`, ear `keysear` (new), and the new topics `clefs`, `keychord`, `keyscale` (new). A test checks that no two kinds of step on the keys path share a symbol, and that no unit game reuses one |
| I2 | Path order | Every family's level 1 had the same difficulty, so octaves (advanced L1), Barry Harris and rootless voicings came in the first unit | `KEYS_LATER`: scales, fingers and the ear first; then arpeggios, cadences, control (+1); accompaniment (+2); voicings (+3); Harris and jazz (+4); advanced (+6) |
| I3 | Rating | Piano takes rated only piano technique, plus a little subdividing | Cadences → cadences, voicings → chord voicings, Barry Harris → Barry Harris harmony, sight-reading → sight-reading, the ear by kind |
| I4 | Stats radar | The first six families: no ear, and "advanced" on a beginner's radar | Six chosen axes: סולמות, ארפג׳יו, אצבעות, מגע, הרמוניה, שמיעה |
| I5 | Level test | The probes didn't cover the ear | An ear probe (above). Every other family is placed from the scales / fingers / Harris staircases, as before |
| I6 | Technique hub | Piano cards said "level 2.3 / 7" (the tempo band), though the families have 7–17 levels | The same card as guitar / bass / drums: "level n / N" with a pip per level, plus the 12-key heat row once played |
| I7 | Practice tab | Generic words ("your instrument", "play and sing") | Keys words: "Scales, chords, the ear — measured on the keys"; "Real tunes on the keys, by their chords" |

These were checked and found fine:

- **Path stars:** five-star scale on tech steps (`levelStars`; the k-ear and nps levels use it unchanged).
- **Results and league:** `techResult` attaches the course; the league XP split and the per-course level read
  `instrument/piano-tech` (COURSE_SUB).
- **Quests:** technique ×3, steps, minutes.
- **Today and the workout:** they take any piano family, the ear included.
- **Course switch:** generic.
- **Piano sound:** the ear calls play with `inst: 'piano'`, the player's chosen piano.
- **Other courses:** no guitar, bass or drums words in the keys Practice tab; the keys games are drills, Note Rush,
  Chord Rush, Key-signature Rush, Highway, Melody Puzzle and rhythm.

### Screens

- **Run screens:** every level's run screen (127 + 8, in Hebrew and English) was opened at 390 × 844 by
  `e2e/keys.spec.ts`. Overflow was ≤ 4 px on all 270 screens: no level scrolls. All 24 e2e tests pass on port 5209.
- **Not run:** `scripts/contrast.mjs` and `scripts/yellow.mjs`. They open simulator routes in the ear course and can't
  seed the keys course. No colours were changed except the ear family's hue (#8fb8ff, the same lightness as its
  neighbours). New symbols are drawn in the existing ink (#1E1033) on the existing tiles.
- **Ear card and notice:** the ear card hides the staff, and the MIDI notice disables Play for control L3 by
  microphone.
- **Fonts:** the dev server in the worktree couldn't serve the Rubik / Secular One files (outside Vite's allow list
  via the node_modules junction), so the fallback font was measured. That is a slightly wider face, so the check errs
  on the safe side.

## 5. Remaining (by priority)

### P1

- **Calibrate the thresholds with real players.** These are still research proposals:
  - CV 5 / 4 / 3 %, timing SD 30 / 25 / 20 ms, hands 30 / 25 / 20 ms, velocity SD 12 / 10 / 8;
  - the new IOI floor (12 ms MIDI, 25 ms mic);
  - the 2.5 × SD outlier rule.

  Record the owner and a few pupils at Grade 3, 5 and 8 speeds.
- **Mic players and MIDI-only levels on the path.** The take now refuses to count by microphone, but the path still
  offers control L1–L6, L8 and L10 (loudness, articulation, pedal) to a player without MIDI. The app has no saved "I
  play by microphone" setting for the piano: MIDI is detected at take time. A setting, or a remembered "no MIDI seen
  in N sessions", would let `ladderHiddenFor('keys')` hide them, as drums by mic does.
- **Hands together by microphone.** Pitch and timing are measured, but the chroma path gives both hands one onset, so
  hand sync is never measured by mic. It is allowed; see decision 3.
- **Repeated notes by microphone.** The single-note mic path starts a note only on a pitch change. Fingers L5 / L14
  (repeated notes 4-3-2-1) can't pass by mic. They need an RMS re-attack detector, or the MIDI notice.

### P2

- **Arpeggio fingerings for black-key chords** (E♭: 2 1 2 4, D♭: 2 1 2 4 …) and inversions. Today they are left out
  (help only).
- **Melodic minor fingering for the LH descending in F♯ / C♯.** It currently keeps the harmonic row, which is playable
  but not the only book fingering.
- **Accompaniment L17 "up to tempo"** still aims at start × 1.25 (♩ 80–86). Stride standards want ♩ 140+. Chart drills
  have no nps; a level `tempo` would do it.
- **Jazz scales (scales L12, jazz L3, L5)** have no fingering (mixolydian, bebop, six-dim, pentatonic, blues).
- **The ear family by microphone on a real piano.** The chroma path was tested only through the analysis (pitch-class
  sets). The call itself is filtered out of the take, but speaker bleed into the next bar's first answer (decay) is
  not tested. The bass adds a 120 ms tail and keys uses the same `inBand` (+120 ms).
- **`topicGroups.ts` emoji** (🎸 for "your instrument") and some piano badge icons (FAMILY_ICON) are emoji. They are
  shared with every course, and the drawn badge art overrides them.

### P3 (content)

Built 2026-11-12: two-part playback (k-ear 9), the grand-staff two-hand reading item (key-read 6–7) and a solo phrase
by ear (transcription level 9 on the keys path) — see §7. Still open: a 4-bar melody, minor keys, modulating
progressions, play-by-ear of a known tune; key signatures in the single-staff key-read levels; Trinity-style exercises
and ABRSM articulation scales as their own levels (not small: they need per-grade articulation targets and MIDI-only
grading, see P1 "microphone players").

- **Ear:** two-part playback (melody + bass), a 4-bar melody, minor keys, modulating progressions, play-by-ear of a
  known tune (would need owner-licensed material).
- **Reading:** a grand-staff two-hand item (needs a grand-staff `given`); sight-reading with key signatures in
  `key-read`.
- **Exams:** Trinity-style technical work (exercises) and ABRSM 2021 articulation variants (legato / staccato scales
  by grade) as their own levels.

## 6. Decisions for the owner

1. **Exam speeds as targets.** The upper levels now aim at ABRSM Grade 4–8 minimums. Passing scales L10 now needs
   ♩ 88 in 16ths, not ♩ 50. Existing progress at the old target no longer counts as "at target" for the 14 changed
   levels. You are the only user; shall they stay as built?
2. **The ear on the path from day one.** Ear L1 sits with scales L1, and Today offers ear items to every piano player.
   Keep it, or make it opt-in?
3. **Microphone players.** Loudness, articulation and pedal levels need MIDI and are blocked by mic. Hands-together
   levels pass by mic on notes and timing alone (sync isn't measured). Keep that, hide those levels too, or add a
   "microphone only" setting that hides every MIDI-only level from the path?
4. **Pieces of the evenness rule.** A floor of 12 ms of IOI spread at fast tempos is about the threshold of hearing.
   Tighter (8 ms) makes Grade 8 a "conservatory" bar; looser (16 ms) is friendlier. Your call after trying it on your
   keyboard.

## 7. Built after the audit (2026-11-12, P3 content)

- **Two-part playback — k-ear 9** "Two parts: melody and bass" (`genKeysEar` kind `two-part`, hands RL): the key, then
  two rounds of two bars in two voices, played back with both hands. Op 0: the bass in half notes on the roots of a
  progression, the melody in quarters (the nearest chord tone on the beat, a scale step after it). Op 1: a walking bass
  in quarters (root, then a step into the next root) under a melody holding a chord tone per chord. Every answer beat is
  one event with both hands' notes where they attack; rated `dictation/two-part`. The family now has 9 levels and 17
  items (`KEYS_EAR_ITEMS` 17: the "whole family" badge needs the two new items too).
- **Grand-staff reading — key-read 6–7**: `given.grand` draws a braced grand staff (`GrandStaff`, NoteViews.tsx: notes
  from middle C up in the treble, the rest in the bass; at most 150 px tall). 6: one note in each hand at once (C major,
  F2–B3 and C4–G5, 1320); 7: both hands with a key signature (C, G, F, D, B♭) — a LH root with its 5th or octave and a
  RH close triad of the key, any inversion (1420). Answered on the keys (tap or MIDI), graded note for note.
- **A solo phrase by ear — transcription level 9** "A solo phrase over ii–V–I" (`transcribe.ts` `soloPhrase`, own
  material from rules): the ii arpeggiated in four swung eighths, four eighths of the bebop dominant descending from the
  V's chord tone nearest (chord tones on the beats), the I's nearest chord tone held. In the transcription coach (hear,
  loop, slow to 50 %, play back — `comparePhrase` — write as degrees, 12 keys) and on the keys path as the measured step
  `transcribe:keys:9` (`MEASURED_STEP_LEVELS`). The coach's level list is a little denser so nine cards fit.
- Tests: `tests/earPianoP3.test.ts`, `tests/pianoEar.test.ts` (9 levels, 17 items).
- Not verified: the grand staff and the nine-card list at 390 × 844 (Playwright not run in this pass); two-part takes
  by microphone (the chroma path hears both hands as one onset, as hands-together does).

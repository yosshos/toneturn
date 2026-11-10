# Bass course: final check (2026-11-09)

Branch `worktree-agent-a2107eb93b5aec11e`, on top of `merge-drums` (redesign-v2 + drums). This builds on
`BASS_AUDIT.md`, `BASS_VALIDATION.md` and `BASS_CURRICULUM.md`. It doesn't repeat them. All P0–P2 items listed in
`BASS_VALIDATION.md` §4 were already fixed by the time of this check (commits `6a634d0` … `8270da1`). The only
remaining item there is N11 (the effort to reach 2★), which is a product call.

This round looked mostly at **how the bass course is wired into the app**, plus a fresh spot check of the generated
content.

How it was checked:

- **Unit tests:** `tests/bassFinalCheck.test.ts`, 16 tests.
- **Screenshots:** `scripts/shots.mjs` with `SHOT_COURSE=bass`, plus a seeded Playwright harness, on its own dev server
  (port 5197) at 390 × 844. The seeded player plays keys (`instrument: 'keys'`) and is in the bass course. That is the
  case that exposes leftovers from other instruments.
- **e2e:** `e2e/bass.spec.ts`, 7/7 green on port 5197.
- **Contrast:** `scripts/contrast.mjs` found 0 low-contrast texts on drills, tune-up, Fretboard Sprint and the path.
- **Content sweep:** a throw-away sweep of every b-* and b-up-* level, two items each (notes, string/fret, tempo, chart
  and titles), plus a per-bar fret-span and same-string-jump scan over every item.

## Fixed

### Wiring (everything connects)

| Area | Found | Fix |
|---|---|---|
| Path symbols | 21 bass families shared 9 symbols: scales ×4, contour ×3, groove ×2, tempo ×2, rhythm ×2, sight ×2, guitar/bass ×2. Every game step in a unit was the same puzzle piece | 12 new symbols in `Glyph.tsx`: pluck, fretboard, 1-2-4, mute, walk, slur, pick, T P, record, shift, bow, ladder, pizz. Every bass family now has its own symbol, and so does every game step (`GAME_STEP_GLYPH`). The maps moved to `src/ui/stepGlyphs.ts`. A test checks that no two kinds of step on the bass path (upright included) share a symbol |
| Path content | The bass path offered **guitar** topics: `fret-chords` 1–5 (open chords by diagram, CAGED, drop-2/3) and `fret-scales` 1–4 (string-6 scales, pentatonic boxes, 3 notes per string). There were no bass neck-note topics | `fret-chords` and `fret-scales` are guitar-only now. New bass-only topics: **`bass-notes`** (E/A strings, all strings, accidentals, every place) and **`bass-shapes`** (root–5–octave, arpeggio shapes, approach notes, reusing the old bass levels). Each has its own quick lesson (core + in depth), a short path name, a symbol and a topic group |
| Fretboard Sprint | Drew a **6-string guitar** neck in the bass course | The neck follows the course: `neckTuningOf(settings)` gives the player's bass tuning, 5-string and upright included |
| Tune-up | Six guitar strings, with "tune your real guitar" | The bass course tunes the four bass strings (G D A E, all in fourths, harmonics on 1–3) with bass copy (`makeRounds(…, 'bass')`) |
| Note Rush | Started on the treble clef | Starts on the bass clef in the bass course |
| Neck answers, Highway lanes, Tuner preset | Read the profile's `instrument` (keys for this player). Played answers were graded an octave off, Highway used C lanes, and the Tuner opened chromatic | `courseInstrumentOf(settings)`: in an instrument course, the course decides |
| Sound | Games, lessons and neck taps played the piano in the bass course | In the bass course, notes up to C4 with no instrument set play on the pizzicato bass (`piano.setCourseVoice`). The band's comping and the piano voicings in ear drills are marked `inst: 'piano'` and stay piano |
| Practice tab | The "instrument" tile had the **keyboard** symbol. The technique tile said "your instrument and your voice". Game cards had generic or guitar words | Bass clef on the tile (guitar gets its own too). Bass wording on the technique and songs tiles and on the technique, Fretboard Sprint, Note Rush and Tune-up cards. The drills card shows the pluck symbol and Fretboard Sprint shows the fretboard symbol |
| Technique hub | Every bass family card said "level — / **7**", the piano's count. Families actually have 4–18 levels | Bass and guitar cards show "level n / N" with a bar per level, as drums do. The bars go thinner past 10 levels |
| Progress radar | Two axes were both called "יד" (plucking hand and fretting hand were each cut to their first word) | The bass radar now has six chosen axes with short names: פריטה, לחיצה, זמן, הרמוניה, ווקינג, קריאה |
| Badges | Bass family badges fell back to the generic note | They now show the bass clef (`family:bass`) |
| League / community | — | Checked by test: tech, upright and bass-topic results count for `bass` |
| Level test card | The intro text touched the card border | Padding added |

These were checked and found fine: Today and quests (technique and path), the workout (a technique block from the
bass course), the placement intro, a course switch that keeps the screen (Practice → keys keeps `#/arcade`), technique
settings from the course (`drillSettingsOf`), and the upright track only on upright or fretless tunings
(`ladderFamiliesFor`). Low-B levels are hidden on a 4-string.

### Content

| Found | Fix |
|---|---|
| **One-octave scales "in position" crept up one string to fret 15** (b-scale 1–4 and 7–9, and the upright's bowed scales: C major went C E8, then D–C on the A string from fret 5 to fret 15). The fingering planner only priced the step between two notes, so a run of small steps up one string was free | `placeLine(…, { stay })`: a line in position keeps every note inside the hand's window. Scale items and bowed scales use it. The upright scales start from the root's position with open strings allowed, as in ABRSM's early grades |
| **An open string followed by a jump up the neck was free.** E octaves went E1 open → E2 at fret 12 on the **same string** (you can't pop that), and 10ths went E1 → G♯2 at fret 16 | A jump from an open string to fret 7+ within half a beat costs extra. E octaves now use the octave shape (D string, fret 2), as do slap octaves and disco octaves. A test checks that no bass item has an open string followed by fret 7+ on the same string |
| Chord charts spelled with flats in sharp keys: **"E D♭m A B"**, "F♯ E♭m B D♭", slash "B/E♭" in E | `spell(pc, home)`: sharp keys use sharps and flat keys use flats; minor keys are spelled from their relative major. Now "E C♯m A B", "F♯ D♯m B C♯", "B/D♯", and key names C♯m and G♯m. Applied to bass, bass ear and upright charts |
| Hebrew titles of standards carried English descriptions ("Jazz blues in F, ווקינג בארבע") | Hebrew names for the 19 descriptive forms. Tune titles stay as they are |
| "הרמוניות" (harmonies) was used for harmonics | Changed to "הרמוניקים" in the legato family, level 5 and up-pos L5 |
| The bar labels of ear drills broke mid-word ("הקשב/ה") | Labels no longer wrap and the bars are a bit wider. All 8 b-ear levels fit one 390 × 844 screen (scroll 0) |

The spot check found nothing else wrong in the content. Pitches, strings, frets and tempo ranges were sound across
all b-* and b-up-* families. The two intended single-tempo levels (pluck L9 zones, legato L6 vibrato) are by design.

## Tests added

`tests/bassFinalCheck.test.ts` covers:

- symbols per family, and unique per bass path;
- no guitar topics on the bass path;
- bass topic items drawn on the bass;
- quick lessons;
- neck tuning and course instrument;
- Tune-up on bass;
- course voice;
- results counted for bass;
- scales staying in position;
- no open-string jumps;
- E octave shape;
- key spelling (unit and sweep).

`tests/variety.test.ts` now exempts the two bass neck topics, like the other finite neck topics.

## Remaining (not done here)

- **N11, the path effort:** about 24k clean takes to reach 2★ everywhere. This is a product call, as before.
- **Not checked on a device:** the bass sound in games (`setCourseVoice`) needs an ear check on a phone speaker, since
  the pizzicato set is quiet below E1. Tune-up on bass uses synth tones at 41–98 Hz, which a phone speaker barely
  plays: the beats are audible through the harmonics, but headphones are better.
- **League per course:** not checked live, because the cloud isn't configured on a local dev server. The per-course
  XP attribution is checked by unit test.
- **Shared, left alone:**
  - Guitar titles still say "הרמוניות" for harmonics (`guitar.ts` 1416, 1420, 2457).
  - Note Rush's ledger line above the bass staff looks faint in the shared `NoteStaff`.
  - `fret-chords` L6–7 and `fret-scales` L5 (bass content) are still on the guitar path, as before.
- **Fingering by design:** two-octave arpeggios, one-string scales (b-fret 4), 10ths and upper-register studies still
  span more than 5 frets in a bar. They are meant to shift.
- **Old progress:** path facts for `topic:fret-chords:*` and `topic:fret-scales:*` from the bass course no longer show
  on the bass path. The owner is the only user, so there is no migration.

## 0.66: bass content round, per-course level, out of beta (2026-11-10)

Branch `worktree-agent-a2f5f31565f4af73c`, on top of 0.65.0. Tests: `tests/bassRound066.test.ts` (16), plus updated
family-order and hidden-level tests. e2e: `e2e/bass.spec.ts` 8/8 green on its own port (5205), with a new test for
the new levels. Phone shots (390 × 844, seeded bass-course player): every new drill and both new topics scroll 0.

### Bass versions of the guitar content

All of it is the bass's own material, written for the bass tuning, drawn on the bass neck (or the bass clef) and
measured by playing, like the rest of the course.

| What | Where | Notes |
|---|---|---|
| **Interval shapes** | topic `bass-intervals` (5 levels) | Octave shapes (up from E/A, down from D/G), 3rds/4ths/5ths across two strings, every interval (all fourths, so one shape everywhere and no G–B shift), 10ths from the E to the G string, and hear it and find it from a given fret. Own quick lesson, path name "מרווחים בבס", symbol `octave` (new). |
| **Scale boxes** | topic `bass-scales` (3 levels) | Major scale from a root on the E or A string (one finger per fret), minor pentatonic box 1 (for fills), and which box (1–5, the same five positions as b-scale 10). Own quick lesson, path name "בוקסים בבס", symbol `box`. |
| **3 notes per string** | `b-scale-11`, 6-string only | Major and natural minor across six strings, up and back. Hidden on 4- and 5-string basses (`SIX_STRING_LEVELS`, path and hub), like the low-B levels. |
| **Reading in positions** | new family `b-posread` (6 levels) | The low range with ledger lines below the staff, positions II, V and VII (whole family stays inside the 4-fret window), a shift at the bar line, and the upper register (IX, XII) above the staff. Bass clef, measured as a reading take. Symbol `position` (new); hub topic "reading"; path from level 3 of the others on. |
| **Fills and target notes** | new family `b-impro` (6 levels) | Fills that land on the root, then on the 3rd (pop and rock, drummer fills in the same bars); two-bar answers over a minor vamp; a pentatonic solo with a chord tone on every change; a blues solo landing on 3rds and 7ths; ii–V–I (and minor ii–V–i) with guide tones on the changes. It leads up to `b-walk-15` (the two-chorus blues solo). Chart only, band and drums behind. Symbol `target` (new); hub topic "styles"; path from level 5 of the others on. |
| **Picking-hand patterns** | `b-pluck` 10–12, `b-pick` 6–8 | Fingers: string-skipping patterns (R–8–5, R–8–♭7), three fingers i m a in triplets (up and down), thumb on the low strings with i and m on the octave and 10th. Pick: string skipping with strict alternation, economy strokes over an arpeggio (down going up, up going down), inside and outside picking in 16ths. |

**Measuring target notes.** A new free-choice rule, `target` (`bassAnalyze.ruleCheck`): any note of the chord's scale
is allowed (and a chromatic approach to the next root), and the first note of each chord must be one of its targets
(`land`, intervals above the root). `beat1Ct` is the landing share; under 90% is a factor on the result ("נחיתה על
צליל המטרה ב-…%"). A test checks that every model line passes its own rules and that a take landing on roots instead
of 3rds/7ths is marked down.

Family badges (first steps, halfway, whole family, with the bass clef symbol), the Today / workout candidates and the
level grid come from the existing bass wiring for every `b-*` family. XP / league attribution is checked by test:
`tech:b-posread-*`, `tech:b-impro-*`, `topic:bass-intervals:*` and `topic:bass-scales:*` all count for bass.

### Per-course level

`courseLevel` used the shared `instrument` area, so drums, bass, guitar and piano takes moved each other's level.
Now `Ratings` also keeps one rating per instrument technique sub (`instrument/piano-tech`, `guitar-tech`,
`bass-tech`, `drum-tech`), updated from each take's tag (every technique take already carried its instrument's sub).
Piano, guitar, bass and drums read their own; voice and jazz keep their area; ear and exam the overall rating.

- **Migration:** the sub ratings are folded from the stored events, so they rebuild on the next load. Only a base
  trimmed before 0.66 (more than 3000 events) lacks them. Then the shared rating still stands for the course, but
  only when it is the player's one instrument course.
- **No DB change:** `profiles.course_levels` is the same jsonb.
- **Known gap:** instrument topics (bass-notes, bass-intervals, …) are tagged `instrument/fretboard` / `shapes`, which
  is shared with the guitar, so they don't move the per-course level. Only technique takes do.

### Small fixes

- Bass family names: "יד ימין (פריטה)" → **"פריטה"**, "יד שמאל (לחיצה)" → **"יד לוחצת"**. "מכות רפאים ביד שמאל" →
  "ביד הלוחצת" (slap 3 and its item). A test bans "יד ימין / שמאל" in bass titles.
- The bass course is **out of beta** (`courses.ts`). Drums stays beta.
- Guitar harmonics: "הרמוניות" → **"הרמוניקים"** in g-lead L1 and the harmonics items. A test checks it.
- `NoteStaff` ledger lines: VexFlow's default (#444, 1.4 px) read faint once scaled down. They are now drawn at
  2.2 px in the note colour.

### Not verified

- **The ledger-line fix:** the code is in, but I didn't catch a Note Rush item with a ledger line in the automated
  run. The drill staff (a different renderer) shows ledger lines fine.
- **On a device:** the new levels were not played on a real bass. That covers the target-rule pass rates for real
  improvised takes (the model line and a wrong-target take are tested) and the 6-string level on a real 6-string
  tuning setting.
- **The guitar path** still has `fret-chords` L6–7 and `fret-scales` L5 as before.

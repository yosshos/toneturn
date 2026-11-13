# SPEC — the playing level test (0.80, owner 2026-11-13)

Owner: "It only tested me on C, at a changing tempo, and instead of letting me make a mistake and move on to the next
exercise or another scale to learn my level, it stayed and insisted on maximum success in C. That isn't how a level
test should work." And earlier: the piano level test should be answered on the keys, and cover what the course teaches.

## What a level test is (sources)

- **Adaptive tests (CAT / multistage):** every test has two key rules, the *item selection rule* and the *stopping
  rule*. A short routing stage sorts the player, then items near the player's level follow. The accuracy comes from
  the number of well-chosen items, not from repeating one.
  ([Braeken & Paap](https://pmc.ncbi.nlm.nih.gov/articles/PMC7495795), [dexterMST](https://mirror.uned.ac.cr/cran/web/packages/dexterMST/vignettes/multistage_fundamentals.html))
- **University piano placement:** scales and arpeggios in several keys, a chord progression (I–IV–I–V7–I),
  harmonisation and transposition, and sight-reading. Sight-reading is set *about two levels below* the level placed into.
  ([UW](https://music.washington.edu/placement-audition-faqs), [Wisconsin](https://kb.wisc.edu/mwsomkb/159630), [NAU](https://legacy.nau.edu/wp-content/uploads/sites/109/2018/08/Group-Piano-Placement-Exam-Requirements.pdf))
- **Apps** (Simply Piano, flowkey, Yousician) mostly ask the player to pick a level. That isn't measured, so it's no model here.

## Rules (all instruments)

1. **Breadth first.** The test is made of sections, one per skill the course teaches. Each section is a ladder of real
   levels in rising difficulty, and the keys change from step to step.
2. **One take per step, at the level's own tempo.** Tempo isn't the search dimension: content difficulty is.
3. **A miss moves on.** A clean take jumps two steps up. After a miss the search bisects between the hardest clean
   step and the easiest missed one, and the section ends once they meet. "Almost" earns one more take at that step,
   never more. Each section has at most 4 takes (usually 2–3). "Too hard — next" counts as a miss.
4. **The level is the hardest step beaten** (see *promotion, not full bars*). A step played "almost" twice places
   the player one level below it. Every family of the instrument gets a start level, and anything not proved starts at 1.
5. **Every take counts** (*everything connects*). Takes go through the same take record as practice: skill map,
   ratings, XP and item ladders.
6. **Timing cue** on every take: count-in, click and the now-column, as in all timed drills.
7. **Repeat starts at once.** A retry or "almost" take starts its count-in without a second Play press.

## Piano (built in 0.80)

| Section | Steps (key) |
|---|---|
| Hands | scales-1 (G) · scales-3 (D) · arpeggios-3 (F) · scales-5 harmonic minor (A) · fingers-6 Hanon 16ths (B♭) |
| Chords — jazz/both | cadences-1 (G) · voicings-2 7ths (F) · voicings-3 shells ii–V–I (B♭) · voicings-4 rootless (E♭) · voicings-9 two-hand / drop 2 (D) |
| Chords — classical | cadences-1 · cadences-2 · cadences-4 · cadences-5 |
| Comping — jazz/both | accomp-1 · voicings-6 blues shells · voicings-11 comping rhythms · accomp-3 stride · voicings-14 comping a standard |
| Comping — classical | accomp-1 Alberti · control-7 melody over Alberti · accomp-3 |
| Reading | control-11 · control-12 (sight-reading; feeds the reading skill) |
| Ear at the keys | k-ear-1 · k-ear-2 · k-ear-4 melody · k-ear-5 bass line · k-ear-6 progression |
| Jazz lines (jazz/both) | harris-1 · harris-7 · k-bebop-1 · k-bebop-4 |

Without MIDI, steps a microphone can't measure (loudness, release, pedal) are left out. In the piano course,
"find my level" opens this test from every entry point (0.79.1).

## Guitar, bass, drums (0.81)

The same engine and screen (`strandsFor`). Only steps that the player's setup shows are offered (guitar add-ons,
the bass track and tuning, a practice pad or an acoustic kit by microphone). The old per-family probes with tempo
staircases are gone.

| Instrument | Sections |
|---|---|
| Guitar | Hands (fretting, pentatonic, 3 nps, CAGED, sweeps) · Chords (open → barre changes) · Rhythm playing (strums → funk 16ths, bossa) · Lead (slides, bends, vibrato, bend phrases) · Reading by position · Ear · Jazz comping (jazz add-on) |
| Bass | Hands (plucking, fretting, 16th stamina) · Time and pocket (pulse → click drops out) · Chord tones (roots → 2-octave 7ths) · Walking bass (by the bass track) · Reading · Ear |
| Drums | Hands (strokes, singles, doubles, switching) · Grooves (rock → 16th funk) · Fills · Reading · Independence · Ear |

## Voice

Since 0.84 the voice course's Find my level is its own sectioned test (src/engine/voiceLevelTest.ts,
src/ui/VoiceLevelTest.tsx), on the same state machine as the playing tests: sections Pitch, Time feel, Songs with the
band, The singer's ear, Sight-singing, Scales, Agility; up to six real levels per section, spread over the family; one
take per step in the real exercise screen (count-in, click, now-cue); clean = the level's pass mark, "almost" = within
15 points (one more take, starting at once). The result is each family's start (drillStart, the level after the hardest
clean one). The old 2½-minute probe is gone. 0.85: range and microphone-delay setup before the first take, the mic asked for at Start, auto-advance after each graded take (1.8 s pass / 2.8 s miss), progress saved (toneturn.voiceTest.v1) and resumed. The generic placement's voice domain (singing, technique, agility
ratings) stays for the Skill Map's "measure voice".

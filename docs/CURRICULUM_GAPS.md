# Curriculum gap audit — 2026-11-07 (after 0.37.0)

Compared against: ABRSM / Trinity / RCM aural tests (grades 1–8), conservatory solfège and dictation
(Israeli/French tradition), Berklee ear training, Kodály / Dalcroze / Gordon, and the apps EarMaster,
Functional Ear Trainer, Musical U, ToneGym, Perfect Ear, Complete Ear Trainer, Tenuto / musictheory.net,
SoundGym / Quiztones, Yousician / Simply Piano / Melodics, and fretboard trainers.

Today: 66 topics (listed with their levels in the code, `TOPIC_GEN`), ~30 path lessons, vocal ladders,
9 game modes (Echo Chain, Beat Echo, True or Bluff, Ghost race, Duel, Daily, Weekly puzzle, Live room,
Tournament). The P1/P2 rows of `EXERCISE_TAXONOMY.md` are built.

## A. Missing entirely

| # | Area | Who has it | Notes |
|---|---|---|---|
| A1 | **Answer on your own instrument** (mic for monophonic instruments, Web MIDI for keyboards): echo, intervals, degrees, dictation *played* | EarMaster, Musical U, Yousician, Simply Piano | Today the answers are pads, voice, singing, tapping or knocking. Shares pitch detection with the tuner. |
| A2 | **Instrument geography**: find the note on the fretboard / keyboard, intervals as fret shapes, positions / CAGED, triad shapes on string sets | Fretboard trainers, Yousician, Tenuto | Natural partner to the tab view and the chord builder. |
| A3 | **Melodic dictation written on the staff** (and rhythm dictation built on a grid) | EarMaster, every conservatory, ABRSM | Dictation exists only as degrees / choices. Two-part and bass-line dictation follow. |
| A4 | **Inner hearing (audiation)**: the tune drops out, keep it going silently, sing or name the note where it comes back | Kodály, Gordon MLT | Melodic twin of "internal pulse". |
| A5 | **Timbre and production ear**: EQ bands (boost/cut), panning, reverb, compression, distortion, levels | SoundGym, Quiztones, ToneGym | Fully synthesizable with Web Audio (no licences). A new track for producers. |
| A6 | **Chromatic harmony**: cadential 6/4, Neapolitan, augmented sixths, tritone substitution, diminished passing chords, modal interchange beyond the basics | ABRSM 6–8, 2nd-year conservatory, Berklee | Ear and paper. Secondary dominants exist. |
| A7 | **Large form and genre forms**: 12-bar blues, rhythm changes, 32-bar AABA, verse/chorus/bridge, binary/ternary/rondo, "where are we in the chorus?" | ABRSM, Berklee, Musical U | Was deferred as "needs recordings", but it can be built from synthesized arrangements. |
| A8 | **Playing with the click**: tap 8ths/triplets/16ths against a click, click on 2 & 4, gap click (bars drop out), tap a tempo from memory (e.g. 100 BPM), two-hand polyrhythm tapping, spot the rhythm error | Melodics, EarMaster, drum pedagogy, Dalcroze | Polyrhythm is ear-only today; tempo is estimated, never produced. |
| A9 | **Rhythm syllables and hand signs**: ta-ti / takadimi, Curwen hand signs | Kodály classrooms | Small; good for kids and classes. |
| A10 | **World music**: Freygish / Ahava Rabbah, Indian raga and tala, Latin and Afro grooves (tresillo, son/rumba clave, bossa, samba, 12/8 bell) | Musical U, world-music curricula | Maqam and Middle-Eastern rhythms exist (see B). |
| A11 | **Instrument recognition** | ToneGym, ABRSM | Was deferred for samples; piano and drums are recorded now, and a few more instruments could start it. |

## B. Exists but too thin

| Topic | Levels today | What is missing |
|---|---|---|
| Seventh chords | only inside lessons (`jazz-1`), no own topic | The 5–7 types (maj7, 7, m7, m7♭5, dim7, mMaj7, aug-maj7) as a ladder, plus **seventh-chord inversions** (6/5, 4/3, 4/2). |
| dim / aug / sus triads | only in the ladder and in `extensions` 4 | A ladder of its own. |
| `maqam` | 3 (9 maqamat + jins) | More maqamat (Huzam, Nawa Athar, Shahnaz…), quarter-tone discrimination, sayr and modulation between maqamat. |
| `eastern-rhythm` | 2 | Wahda, Ayyub, Chiftetelli, Zaffa, Samai Thaqil; tapping them, not only choosing. |
| `polyrhythm`, `swing-ratio`, `syncopation`, `downbeat` | 2 each | Tapping versions, and harder levels (swing at fast tempos, syncopation in 16ths, downbeat in a sparse texture). |
| `mood`, `form` | 2 each | Mood: more categories and expressive tempo. Form: see A7. |
| `degrees-ext`, `chord-scale`, `transpose-adv` | 2 each | Mixed-mode degrees; melodic-minor chord-scales; transposition with clefs (the proposed T10). |
| `displacement-3`, `bh-keys`, `bh-tone`, `bh-pivot` | 1 each | A second and third level. |
| `scale-types` | 3 | Melodic minor, whole-tone, diminished and bebop by ear (today only in the Barry Harris and vocal topics). |
| Interval singing | inside vocal `leap` and the harmony ladder | Its own leveled topic: sing a given interval up and down from a given note. |

## C. Games — missing types

| Game | Trains | Model |
|---|---|---|
| **Voice-steered flight**: your pitch moves a character through gates | intonation, range, slides | classic vocal pitch games |
| **Rhythm highway**: notes scroll and you tap on time | rhythm reading, timing | Melodics, rhythm games |
| **Melody puzzle**: put note tiles in order to match what you hear | dictation (A3), in game form | ToneGym-style |
| **Tuning game**: tune a detuned string by ear, then check with the tuner | fine pitch, guitar | fits the tuner version |
| **Classroom bingo**: chords and progressions for a group | identification, social | Classes already exist |
| **Name that tune / pitch memory** (the same reference note every day) | melodic and long-term pitch memory | ToneGym |

## Suggested order

1. **Guitar version** (already planned): tuner + A1 (answer on your instrument, same pitch engine) + A2 (fretboard) + the tuning game.
2. **Conservatory core**: B seventh chords and inversions, A3 staff dictation + the melody puzzle, A6 chromatic harmony, A7 form.
3. **Rhythm and groove**: A8 + tapping levels for B rhythm topics + the rhythm highway.
4. **New audiences**: A5 production ear, A10 world music + B maqam depth, A4 inner hearing, the voice game.

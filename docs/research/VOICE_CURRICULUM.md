# Voice course: curriculum and measurement research

*Research for The 7th Sense, 2026-11-10. It answers the owner's brief of the same day: the voice course should start
from simple songs sung well and end at a serious jazz-vocal standard (standards, scat, intervals in dense harmony,
ballads, phrasing, harmony singing). Two rules hold throughout: **only measured practice counts** (pitch, onset and
loudness from the microphone, never self-report), and **no one's exercises are copied** (exam boards and method books
are used only for what they cover, never for their material). Facts marked **(verify)** come from secondary sources or
older syllabus editions.*

---

## 1. Executive summary

1. **We already measure more than most vocal apps do.** `src/engine/vocal.ts` (1,505 lines) grades holds, straight
   tone, vibrato (rate, extent, regularity, jitter, shimmer, on-cue onset and offset), messa di voce, glides, melodies,
   leaps, rhythmic figures, staccato, scales and modes, harmony over a sounding chord, sight-singing (pitch plus
   written rhythm), ornaments and dynamic curves. `runs.ts` grades runs. `perform.ts` already scores a *sung*
   improvisation against chords (chord tones on strong beats, chromatic approaches, endings). The engine side is
   about 60 % done.
2. **What is missing is the musical half.** We have no time feel (onsets against a click or band, swing, laid-back
   phrasing), no performance with a backing band (per-phrase scoring and looping the weak phrase), no standards, no
   scat, no ballads, no blues, no register or passaggio work, no breath-phrase work and no bass-clef sight-singing for
   singers. These are what make a jazz singer, and they are also the owner's niche.
3. **Proposed plan: 15 families with 115 new or re-homed levels, plus the 7 Barry Harris levels kept as they are,
   122 levels in total** (section 5). The existing 40 vocal levels and 8 run levels fit inside it without losing any
   progress.
4. **The pop on-ramp is the same metrics on easier music** (section 6). A simple song sung in tune, in time, with one
   breath per phrase and a shaped dynamic is the Song Singer milestone. The same five meters (pitch, time, breath,
   dynamics, tone steadiness) then follow the singer into standards and scat. Copyright keeps us to public-domain
   songs, our own originals in pop styles, and audio the user brings.
5. **Standards can be legal.** We can use composer-only melodies that are public domain in the US (published 1930 or
   earlier) **and** under life + 70 (composer died 1955 or earlier). Candidates include Gershwin's 1924–1930 songs,
   Kern, Youmans, Donaldson, Waller and James P. Johnson (section 7.3, **lawyer**). Alongside them we write
   **original heads over standard forms** (chord progressions are not protected).
6. **Bug-level finding on path placement:** every vocal program's level 1 sits at the same path difficulty,
   `diff(0)` = 700 (`ladderSteps()` in `src/engine/path.ts`). That puts Barry Harris L1, harmony L1 and modes L1 next
   to "hold a note" L1. This is the same issue that PIANO_AUDIT I2 fixed for keys with `KEYS_LATER`. A `VOICE_LATER`
   map is proposed in section 8.
7. **Measurement limits that shape the design:** loudness is only *relative within a take*. Sung onsets are only
   accurate to about ±25–40 ms, so laid-back phrasing must be judged as an average over 8 or more notes. Vowel and
   syllable identity, tone colour (twang, belt, breathiness) and register mode cannot be measured reliably, so they
   are explained and hinted at but never counted.

---

## 2. What exists today (code read, 2026-11-10)

### 2.1 Path steps of the Voice course

I dumped them with `stepCatalogue()` and `inCourse(…, 'voice')`. There are **26 topic or lesson steps from 11
sources, plus 40 vocal-program ladder steps.**

| Source | Kind | Levels in path | Skill / sub | Path difficulty | What is measured |
|---|---|---|---|---|---|
| `basics-voice` | lesson | 1 | singing/match | 760 | Match a note (YIN, ±35 ¢ default) |
| `runs` | lesson | 1 (entry; 8 run levels on the Vocal screen) | agility/runs | 998 | Per-note pitch and smear of a fast run (`gradeRun`) |
| `sing-names` | lesson | 1 | singing/match | 1050 | Sing a named note |
| `sing-home-five` | lesson | 1 | singing/degrees | 1100 | Sing degrees 1 and 5 against a key |
| `chord-tones` | lesson | 1 | singing/harmony | 1103 | Sing chord tones |
| `sing-degrees` | lesson | 1 | singing/degrees | 1270 | Sing scale degrees |
| `sing-intervals` (topicsPitch2) | topic | 6 | singing/intervals | 1000–1500 | L1–4 one interval, L5–6 sequences |
| `song-sing` (topicsSongs) | topic | 5 | singing/songs | 1065–1475 | Hear a phrase from the 40-song `SONGBOOK`, sing it back; rhythm graded from L3 |
| `sight-tap` (topicsTime2) | topic | 3 | sight/sing | 1250–1550 | Sing and tap |
| `sight-modulate` (topicsGaps) | topic | 5 | sight/sing | 1450–1860 | Sing a line that changes key |
| `audiation` (topicsHarmony2) | topic | 1 (L4 only in voice) | sequences/inner | 1400 | Inner hearing, sung |

### 2.2 Vocal programs (`VOCAL_PROGRAMS`, `src/engine/path.ts`; levels in `src/engine/vocal.ts`)

| Program | Levels | Content (item kinds) | Pass share |
|---|---|---|---|
| `v-ladder` "Vocal technique" | 11 | L1 holds 3–8 s, with and without reference · L2 straight tone and staccato · L3 vibrato (delayed, steady, on/off) · L4 range map (5 points) · L5 messa di voce · L6 glides (4th, 5th, octave) · L7 short melodies · L8 leaps · L9 rhythmic figures 1–4 notes/beat at 66–80 bpm · L10–11 advanced vibrato (rate on demand 5 / 6.3 Hz, narrow/wide width, alternating, vibrato only on chosen notes, across registers, under a swell) | 0.6 and down |
| `v-modes` | 8 | Ionian → pentatonics → church modes → blues → harmonic and melodic minor, Phrygian dominant → altered, whole-tone, diminished, bebop dominant, double harmonic → mixed up/down modes | 0.6 → 0.54 |
| `v-sight` | 5 | Generated melodies: 4 → 8 notes, steps → 4th leaps, major → minor, ½–2 beat values, 72–88 bpm, graded on pitch and written rhythm | 0.6 → 0.55 |
| `v-harmony` | 5 | Interval over a held note → missing chord note (triads, 7ths) → a line a 3rd above / 6th below a played melody | 0.6 → 0.56 |
| `v-ornament` | 4 | Grace notes, mordents, turns, trills, plus crescendo, decrescendo and swell on a held note | 0.58 → 0.55 |
| `v-barry` | 7 | 6th-diminished scale, 6 and dim arpeggios, chromatic rules, "make it X7/m6" over dim, free choice and resolve, Barry lines, harmonised 6-dim scale over chords | — |

Run levels (`RUN_LEVELS`, `runs.ts`): 8 levels, 3 notes at 2 notes/s up to 12 notes at 7 notes/s, from major to
blues, in up, down, turn, zigzag and thirds shapes.

### 2.3 Measured metrics already implemented

| Metric (MetricKey) | How | Bands (exc/good/fair) |
|---|---|---|
| settle | Onset until the pitch stays within ±25 ¢ for 150 ms | 150/300/600 ms |
| intonation | Mean signed cents of the sustained part (the vibrato centre) | 10/20/35 ¢ |
| stability | SD of the residual after detrending | 6/12/20 ¢ |
| drift | Slope of the slow trend | 3/6/10 ¢/s |
| scoop | Signed cents in the first 60 ms | via feedback.ts |
| duration / bestStretch | Longest voiced stretch with the trend inside ±25 ¢ | goal-relative |
| vibratoRate / Extent / Regularity / Jitter / Shimmer / Cue / Placement / Consistency | Zero crossings of the detrended residual, with hysteresis | rate on demand; extent pop 20–50 ¢, classical 40–100 ¢ |
| dynamics / curve | Smoothed RMS range and shape on one note (relative dB) | — |
| landing / transition / overshoot / smoothness | Glides and leaps | 15/30/50 ¢; 120/220/400 ms; 15/35/60 ¢ |
| hit / legato / timing | Per-note melody segmentation (`segmentNotes`); timing against the beat | timing 40/60/110 ms |
| ornament / ornamentSpeed | Quantised to main, upper and lower levels; runs of 40 ms or more | — |
| Run grade | Per note ok/sharp/flat/smeared/wrong/missed, with tolerance that widens with speed (35–50 ¢) | — |
| Improv report (`perform.ts`) | Chord tones on strong beats, chord-tone ending, rhythmic variety, range, chromatic approaches. **Works on sung frames.** | — |

### 2.4 Support already in place

- **Capture:** `src/speech/pitchCapture.ts` opens the mic with echo cancellation, noise suppression and AGC **off**.
  That is right for loudness work (iOS Safari may still apply its own processing **(verify on device)**).
- **BleedGate** (`bleed.ts`) learns how loud the app's own sound is at the mic and drops frames that sit on a
  sounding pitch. This makes singing against a drone or chord possible without headphones.
- **Latency calibration** (`latency.ts`) per input, including `mic`: the median offset to clicks, kept if SD is
  35 ms or less. This is required for any time-feel grading.
- **Voice range** from a glide (`rangeFromGlide`), `fitToRange` and octave-folded scoring.
- **Band engine** (`band.ts`): walking bass and rootless comping in swing, bossa, ballad and waltz, plus groove
  styles. Charts (`charts.ts`) include Blues in F and the Rhythm changes A section. `perform.ts` has backing tracks
  and the inner-clock drill.
- **Piece coach** (`src/engine/piece/`): chunks and tempo ladder. It can be reused for "repeat the weak phrase".
- **Sing-along screen** (`SingAlong.tsx`): a note roll over **10 song openings** (`engine/songs.ts`), scored per note
  as the share of frames within ±50 ¢. It has no backing band, phrase loop or time grading. The 40-song `SONGBOOK`
  feeds the `song-sing` echo topic, which is not a sing-along. The brief said "~40 songs in sing-along"; in fact the
  sing-along has 10 and the song topic has 40.
- **Choir rooms:** several phones, one part each, on vocal-hold items.
- **Mini-lessons** (`src/content/mini/voice.ts`): vocal-hold, vibrato, range, melody, scales, harmony, sight,
  ornaments (plus perform-guitar and two games).

### 2.5 Gaps against the owner's niche

| Needed for "sophisticated" singing | Status |
|---|---|
| Time feel: on the beat, swing eighths, laid back, back-phrasing | **Missing.** Only a click-based `timing` metric exists, used in rhythmic items. |
| Singing over a band and scoring each phrase | **Missing.** The sing-along has no band, and the band has no vocal grading. |
| Standards (form, melody interpretation) | **Missing.** There is no standards content. |
| Scat (target notes, syllable rhythm, chord-tone landing) | **Engine exists** (`improvReportBy` on sung frames), but no vocal program uses it. |
| Ballads (long tones, slow tempo, rubato that returns) | **Missing** |
| Blues (blue notes, call and response, 12-bar form) | Only the blues scale (modes L4, runs) |
| Intervals in dense harmony (sing the 9 over a voicing, hold the 7 against a moving bass) | Partial: harmony L2–3 triads and 7ths, Barry L5 |
| Registers and passaggio | Only the range map and the octave glide; no break detection |
| Breath and phrase length | Only single holds up to 8 s |
| Bass-clef and alto sight-singing for low voices | Bass clef exists in theory note-reading, not in vocal sight-singing |

---

## 3. What reputable curricula teach (topic level only)

| Source | What it covers (topics, not material) | What we take from it |
|---|---|---|
| **ABRSM Singing** (Grades 1–8) | Accompanied songs from lists, **one unaccompanied traditional song from memory** (assessed on pitch, intonation, rhythmic character and vocal quality), **sight-singing** (accompanied by the examiner), aural tests at the piano. Singing for Musical Theatre runs in parallel. **(verify current edition)** | Unaccompanied tuning (drift) as a graded skill; sight-singing with accompaniment; folk songs as legitimate repertoire |
| **Trinity Singing** (Initial–8) | Songs plus technical work. Supporting tests: Grades 1–5 pick two of sight reading, aural, **improvisation**, musical knowledge; Grades 6–8 sight reading plus aural **or** improvisation. Improvisation stimuli are motivic, harmonic or stylistic. | Improvisation as an exam-grade skill from Grade 1. The three stimuli types become scat levels (motif → chords → style). |
| **RSL / Rockschool Vocals** (Debut–8) | Songs over backing tracks. Technical exercises: **scales, arpeggios, intervals, backing vocals** (harmony against a track). Unseen tests: sight reading **or** improvisation, ear tests, general musicianship. **(verify 2021 edition specifics)** | Backing vocals = harmony singing against a recorded part; performance with a backing track; arpeggios as a technique family |
| **LCM Popular Music Vocals** (Grades 1–8, diplomas) | Contemporary songs, technical work, aural and musicianship. LCM's jazz grades cover instruments; **no jazz voice grade found** **(verify)** | A gap: no major board grades jazz singing, so our upper levels can define their own standard |
| **Berklee Voice** | Private instruction levels 1–4 (all), 5–8 (performance majors); placement audition; a four-level **vocal improvisation** path (PSVC-325 *Vocal Improvisation in the Jazz Idiom*, PSVC-425 advanced) with **ear training and harmony prerequisites** | Scat is gated behind ear and harmony. We gate scat levels behind `v-ear` and `v-harmony` levels. |
| **Jazz vocal pedagogy literature** (e.g. *Jazz Singing: A Guide to Pedagogy and Performance*; Stoloff, *Scat!*; Fredrickson, *Scat Singing Method*; Weir's writing on syllables) | Stylisation and ornamentation; **melodic embellishment → scat syllables → text-based improvisation**; **phrasing** in the Lester Young / Billie Holiday line (back-phrasing); syllable repertoire; call and response; vocal bass lines | Topic order: embellish the melody → rhythmic scat on one note → guide tones → bebop lines. Back-phrasing as its own family. |
| **CCM / Estill-type concepts** | Estill: 13 "figures for voice control" and 6 voice qualities. CCM: chest, mix and belt registration; vowel and resonance strategies; healthy belting | **Explain-only.** Tone colour and register mode cannot be measured reliably by phone mic. We teach the concepts in mini-lessons and measure only their *outcome* (smooth passaggio crossing, steady pitch, dynamic control). |
| **Research on singing accuracy** | Untrained singers err by about 50–90 ¢ on intervals, trained singers 15–30 ¢; median note error in unaccompanied singing about 19 ¢ with drift in 22 % of takes (Mauch, Frieler & Dixon 2014); listeners rarely notice errors of about 40 ¢ | Start bands at ±50 ¢ and finish at ±10–15 ¢. Unaccompanied drift is a real, measurable target. |
| **Vibrato research** | Operatic and jazz singers have similar rate; jazz extent is smaller with more jitter and shimmer and shorter vibrato duration (Manfredi et al. 2015) | Jazz style uses a narrow, late, optional vibrato. Our existing `pop` extent band (20–50 ¢) fits it; add a "jazz" style with delayed onset. |
| **Swing microtiming research** | Soloists delay downbeats by about 30 ms; earlier estimates of soloists "hanging back" run up to about 100 ms at medium tempo (instrumental studies, no vocal study found) | A laid-back target of 30–120 ms average lateness on downbeats, measured over many notes |

---

## 4. Measurement primer: what a phone mic can and cannot tell us about singing

| Quantity | Method (existing or new) | Accuracy on a phone | Constraints and safeguards | Counts? |
|---|---|---|---|---|
| Pitch of a sustained vowel | YIN, confidence ≥ 0.8 | about ±3–5 ¢ on a clean voice; worse on breathy tone and fry | Octave errors are folded where intervals allow it | **Yes** |
| Intonation within a note | Mean of the trend (vibrato centre) | ±5 ¢ | — | **Yes** |
| Drift over a phrase sung unaccompanied | Tonic re-estimate at each phrase end vs the start | ±5–10 ¢ | Needs ≥ 2 notes on the tonic or a re-sung reference note | **Yes** (new) |
| Vibrato rate and extent | Residual zero crossings | rate ±0.2 Hz, extent ±5 ¢ | Needs ≥ 2 cycles and a 20–33 ms hop | **Yes** |
| Note duration / breath phrase | Longest voiced stretch, with gaps ≤ 120 ms bridged | ±30 ms | Breath intake is not detected; a "breath" is inferred from a gap of 250 ms or more | **Yes** |
| Onset of a sung note (consonant or new attack) | RMS rise and voicing start | ±20–30 ms | Needs mic latency calibration; Bluetooth headphones add 150–300 ms, so calibrate or use wired | **Yes** (new for time feel) |
| Onset of a legato note change (same vowel) | Pitch-change point (`segmentNotes`) | ±30–50 ms | Too vague per note for microtiming; use averages | **Yes, as averages** |
| Average lateness / earliness (laid back) | Mean signed offset over ≥ 8 onsets, after latency correction | ±10 ms on the mean | Show "on / laid back / rushing" plus the SD, not a per-note verdict | **Yes** (new) |
| Swing ratio of eighth pairs | Onset ratio of articulated pairs | ±0.2 at 120 bpm | Only on articulated syllables (doo-bah), not legato | **Yes** (new) |
| Relative loudness (cresc., accents) | Smoothed RMS in dB within one take | ±1–2 dB relative | AGC off; the phone must stay at a fixed distance (prompt about 30 cm, still). **No absolute dB SPL.** | **Yes, relative** |
| Accent placement in scat | RMS peaks vs the grid | as for onsets | — | **Yes** |
| Register break / crack | Pitch jump > 150 ¢ in < 40 ms, voicing dropout, or loudness step > 6 dB during a glide | Robust for clear breaks; misses subtle ones | Report "smooth / bumpy / broke" | **Yes** (new) |
| Chest, mix, head, belt, twang, breathiness | Spectral centroid, H1–H2, aperiodicity | **Unreliable** on phone mics and in rooms | Hint only ("sounded breathier"), never a score | **No** |
| Vowel or scat-syllable identity, lyrics, diction | Speech recognition | Unreliable for sung syllables | Scat is graded on pitch, rhythm and accents only | **No** |
| Singing against the app's own sound | BleedGate (±35 ¢, octave) | Good with headphones; fair on speaker | Avoid graded unisons and octaves with a sounding part; recommend headphones for band levels | **Yes** |
| Singing against other people (choir room) | One phone per singer | Good | Each phone grades only its own singer | **Yes** |
| Vocal health (warm-up, hydration, fatigue, nodules) | — | — | Mini-lessons only; a gentle "rest" reminder after about 30 sung minutes | **No** (explain-only) |

**Low voices:** basses go down to about E2 (82 Hz). YIN handles this, but the frame must hold two or more periods
(≥ 25 ms window). **High voices:** soprano C6 (1,047 Hz) is fine, while whistle register is out of scope.
**Rooms:** reverb blurs onsets, so time-feel levels ask for a quiet room and close mic, and use RMS-rise onsets.

---

## 5. The proposed course: 15 families + Barry Harris, 122 levels

Conventions: **Start → target** describes level 1 → last level. "Pass" follows the existing ladder rule (the item
score is the weighted metric score; a level passes when the share of items at or above the level's threshold is
met). The **technique star scale** (pending decision) can be laid on top: 3 stars opens the next level, 4 is half,
5 is all. **Reuse** names the existing engine. **Pri** P1 means build first. **Size** S is ≤ 2 days, M is 3–6, L is
7 or more. Existing levels are marked ★ with their current reference. They keep their ids and facts and are only
re-grouped in the display (section 9).

### F1 `v-breath`: Breath and sustain (6 levels)

Practised: one long tone, then breath phrases of growing length, steady through the end of the breath and through
a breath plan. Start → target: a 3 s hold in tune → a 20 s phrase on one breath with no drift and a steady end.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 ★ (ladder L1) | Holds of 3, 5 and 8 s with a reference | duration, intonation, stability | existing | `gradeHold` |
| 2 | 10 s hold without a reference; the last 2 s are graded double | stability and drift in the final 25 % | final quarter stability ≤ 12 ¢, drift ≤ 6 ¢/s | `holdMetrics` + window |
| 3 | 4-bar phrase of 3–5 notes, one breath, at 72 bpm | no gap ≥ 250 ms; per-note pitch | voiced through, ≥ 80 % notes hit | `melodyMetrics` + gap check |
| 4 | Breath plan: an 8-bar line with marked breath spots (breathe there and only there) | gaps exactly at the marks (± ½ beat), none elsewhere | all marks honoured, no extra gaps | new gap map (S) |
| 5 | 12–16 s phrase in a slow ballad tempo | as L3 + end-of-phrase pitch | final note within ±20 ¢ | — |
| 6 | 20 s phrase, decrescendo to the end on one breath | relative dB curve + no drift | curve score ≥ 0.6 | `gradeDynamic` |

Measurement: duration and gaps are robust. Breath *support* is inferred from the end-of-breath stability.
Pri **P2**, Size **S**.

### F2 `v-pitch`: Pitch accuracy and intonation (8 levels)

Practised: matching a note, then fine tuning, then holding the key without accompaniment. Start → target: within
±50 ¢ after hearing a note → within ±10 ¢ held, and less than 10 ¢ drift over 8 bars sung unaccompanied.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 | Match a note in the comfortable middle (`basics-voice`) | cents | ±50 ¢ | `scoreSung` |
| 2 ★ (ladder L2) | Straight tone 4–8 s, staccato repeats | stability, settle | existing | `gradeHold` |
| 3 ★ (ladder L7) | Short melodies after hearing | per-note hit and landing | existing | `gradeMelody` |
| 4 | Fine tune: sing ±10 ¢ around a drone and settle into it ("beat-free") | intonation ≤ 10 ¢ within 1 s | 3 of 4 items | `holdMetrics` + BleedGate |
| 5 | Tonic re-sung: sing a phrase, then the tonic, with no reference between | tonic offset vs the start | ≤ 20 ¢ | new `driftOf` (S) |
| 6 | Unaccompanied 8 bars (a PD folk song, ABRSM-style) | drift over the song, per-phrase intonation | drift ≤ 25 ¢, median note error ≤ 25 ¢ | `gradeSingAlong` + `driftOf` |
| 7 | Chromatic neighbours and quarter-tone awareness (maqam colour, optional) | cents vs fractional targets | ≤ 15 ¢ | maqam fractional MIDI (exists) |
| 8 | 16 bars unaccompanied, a minor song, chromatic notes | drift ≤ 10 ¢, median error ≤ 15 ¢ | both | — |

Pri **P1** (L5–6, 8 are the cheapest high-value additions), Size **S**.

### F3 `v-range`: Range, registers and passaggio (6 levels)

Practised: finding the range, crossing the break smoothly, extending the range by a half step at a time. Start →
target: a measured range map → an octave and a fifth crossed without a break, with the top extended 2–3 semitones
over several weeks.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 ★ (ladder L4) | Range map, 5 points | per-point hold score, evenness | existing | `rangeEvenness` |
| 2 ★ (ladder L6) | Glides of a 4th, a 5th and an octave | smoothness, landing | existing | `gradeGlide` |
| 3 | Siren across the passaggio (the range map's middle-upper zone) | **break detector**: pitch jump, voicing dropout, dB step | no break in 2 of 3 | new `breakOf` (M) |
| 4 | 5-note scale through the passaggio at 3 dynamics (soft, medium, loud) | breaks + dB level per take | no break; ≥ 6 dB between soft and loud | `gradeMelody` + dB |
| 5 | Range extension: hold the top note +1 semitone above last time for 2 s in tune | the new highest note held ±25 ¢ | a new personal edge (soft goal, one per week) | `rangeFromGlide` |
| 6 | Octave-and-a-fifth arpeggio, legato, in one breath | breaks, landing, per-note pitch | no break, ≥ 80 % hit | — |

Register *mode* (chest, mix, head) is explained only. Pri **P2**, Size **M** (the break detector is new).

### F4 `v-dyn`: Dynamics (5 levels)

Practised: controlled loudness change with steady pitch, then dynamics in phrases. Start → target: a crescendo on
one note → a dynamic shape across a phrase and accents placed exactly.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 ★ (ornament L1 dyn items) | Cresc. / decresc. 5 s | curve vs target, pitch steady | existing | `gradeDynamic` |
| 2 ★ (ladder L5 messa + ornament L2 swell) | Messa di voce 6–8 s | curve, intonation through the swell | existing | `gradeHold` |
| 3 | Terraced: p – mf – f on 3 notes | dB steps ≥ 4 dB each, pitch ≤ 20 ¢ | both | new step-curve (S) |
| 4 | Accents: a 2-bar figure with marked accents | accent dB ≥ 4 dB over neighbours at the right notes | ≥ 80 % placed | RMS peaks (S) |
| 5 | A phrase with a written arc (rise to the peak note, fall) | phrase dB envelope vs the arc (correlation) | r ≥ 0.6 | — |

Relative only; the phone must stay still. Pri **P2**, Size **S**.

### F5 `v-vib`: Vibrato control (8 levels)

Practised: straight versus vibrato on demand, then rate and width, then style (jazz: late and narrow).
Start → target: vibrato appears on cue → vibrato of a chosen rate and width only where asked, including jazz-style
late onset at phrase ends.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 ★ (ladder L3) | Delayed, steady, on/off | cue, regularity | existing | `gradeHold` |
| 2 ★ (ladder L10) | Rate 5 / 6.3 Hz, narrow / wide, alternate | rate, extent, cues | existing | — |
| 3 ★ (ladder L11) | Only on chosen notes; across registers; under a swell | placement, consistency | existing | — |
| 4 | Jazz-style: straight for ⅔ of a long note, then a narrow vibrato | onset time, extent 15–40 ¢ | both in band | `vibratoOnSec` |
| 5 | Phrase ends: vibrato only on the last note of each phrase in an 8-bar line | placement | ≥ 80 % | `gradeVibratoNotes` |
| 6 | Terminal vibrato that widens slightly (shimmer rises) | extent trend over the note | positive slope, regular rate | `halves` |
| 7 | Straight tone in close harmony (no vibrato while a chord sounds) | straight score + intonation vs the chord | both | `harmony-hold` + straight |
| 8 | Consistency across 5 notes and 3 dynamics | `vibratoConsistency` | ≥ 0.7 | — |

Pri **P2** (L4–5, 7 serve jazz), Size **S**.

### F6 `v-agility`: Runs, riffs and bebop agility (9 levels)

Practised: clean fast notes, first pop and R&B riffs, then bebop-shaped lines. Start → target: 3 notes at 2 notes/s
→ a 12-note blues run at 7 notes/s, plus an 8th-note bebop line at 160 bpm (5.3 notes/s), in tune and on the grid.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1–8 ★ (`RUN_LEVELS` 1–8) | Existing runs | `gradeRun` per note | existing | `runs.ts` |
| 9 | Bebop line: chromatic passing tones on the off-beats, ending on a chord tone (generated), swung at 120 → 160 bpm | per-note pitch + onset on the 8th grid (± 60 ms) | 80 % ok, timing mean ≤ 40 ms | `gradeRun` + onsets |

Tempo ladder (3 clean → +10 bpm, 2 fails → −10 %) from the instrument drills. Pri **P2** (L9), Size **S**.

### F7 `v-time`: Articulation, rhythm and time feel (8 levels)

Practised: starting notes exactly on the beat, rests, syncopation, swing eighths, laid-back placement and
back-phrasing. Start → target: quarter-note onsets within ±60 ms of the click → a swung, laid-back 8-bar phrase
(mean 40–100 ms late, SD ≤ 35 ms) that still lands on a target downbeat.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 ★ (ladder L9, first half) | Rhythmic figures at 1–2 notes/beat | timing | existing | `melodyMetrics` |
| 2 | Onsets on the click: "dah" on every beat, then on 2 and 4 only | onset offset mean and SD | \|mean\| ≤ 30 ms, SD ≤ 40 ms | onsets + `latency.ts` (M) |
| 3 | Rests and pickups: enter after a rest on the "and" | entry offset | ≤ 50 ms | — |
| 4 | Syncopation: anticipations (push the downbeat by an 8th) | onset on the anticipated 8th | ≥ 80 % on the right 8th | — |
| 5 | Swing eighths on scat syllables ("doo-bah") at 100–160 bpm | swing ratio of articulated pairs | 1.5–2.3 at medium tempo, flatter (1.2–1.7) when fast | new `swingRatioOf` (S) |
| 6 | On the beat vs laid back: the same phrase twice, "on top" and then "behind" | mean offset per take | take A \|mean\| ≤ 25 ms; take B 40–120 ms late | — |
| 7 | Back-phrasing: start a written phrase ½–1 beat late and catch up by the target note | entry delay, target-note onset | delay ≥ ½ beat; target ±60 ms | new (S) |
| 8 | Inner clock: 4 bars with the band, 4 silent, then back in on the downbeat | re-entry offset | ≤ 60 ms | `clockPlan` |

Phone note: mic latency calibration is mandatory before L2 (prompted once, re-offered if headphones change).
Pri **P1**, Size **M**. This is the core engine for F12–F15.

### F8 `v-scale`: Scales and modes (8 levels)

★ `v-modes` L1–8 unchanged. Add **arpeggio items** (triads, 7ths, then 9ths) to L2–5, as RSL lists arpeggios as a
technical exercise. Pri **P3**, Size **S**.

### F9 `v-sight`: Sight-singing in both clefs, solfège and numbers (9 levels)

Practised: reading a melody and singing it in tune and in rhythm. Start → target: 4 stepwise notes in treble clef →
16-bar melodies in treble or bass clef, minor and chromatic, with a key change, at 96 bpm.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1–5 ★ (`v-sight` 1–5) | Existing generated melodies | `gradeSight` | existing | — |
| 6 | **Bass clef** versions of L3–5 for low voices (default when the range low is A2 or lower) | as L5 | as L5 | NotesView clef + `gradeSight` (S) |
| 7 | Chromatic neighbours and passing tones; naming in movable do or numbers (setting) | per-note pitch + rhythm | 0.55 | — |
| 8 | Sight-singing with accompaniment (ABRSM-style): the band plays chords and the melody is not given | pitch vs the written line, BleedGate | 0.55 | `sight-modulate` + band |
| 9 | Jazz lead-sheet reading: swung 8ths, syncopation, ties across the bar | pitch + `v-time` onsets | 0.55 | — |

Naming display (do / numbers / letters) is a display setting. Spoken syllables are not graded. The existing
`sight-tap` and `sight-modulate` topics stay as the topic side. Pri **P2**, Size **S–M**.

### F10 `v-ear`: The singer's ear (6 levels)

Practised: hear → sing back; intervals; chord tones; inner hearing. Start → target: echo 3 notes → sing any chord
tone (1-3-5-7-9-11-13) of a sounding jazz chord on request.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 | Echo short melodies (`song-sing` L1–2, Echo Chain) | per-note | existing | `memory.ts` |
| 2 ★ (ladder L8) | Leaps | landing | existing | — |
| 3 | Sing intervals up and down from a given note (`sing-intervals` L1–4) | cents | existing | — |
| 4 | Sing a named chord tone of a played triad or 7th chord (`chord-tones`) | cents vs the target | ≤ 25 ¢ | `harmony-hold` |
| 5 | Audiation: hear 2 bars, then sing the 3rd bar that was **not** played (`audiation`) | per-note | 0.6 | existing topic |
| 6 | Tensions on demand: 9, 11, 13, b9, #11 over a voiced chord | cents, settle | ≤ 20 ¢, settle ≤ 300 ms | `harmony-hold` |

Gate: F15 (scat) L4 and later require F10 L4. Pri **P2**, Size **S**.

### F11 `v-harmony`: Harmony singing (8 levels)

Practised: holding your own part against others. Start → target: a 5th over a held note → the inner voice of a
moving jazz voicing, held while other parts move, and a part in a 3-voice close harmony phone room.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1–5 ★ (`v-harmony` 1–5) | Intervals over a note, missing chord notes, lines a 3rd above or 6th below | existing | existing | — |
| 6 | Backing vocals (RSL-style): a pop "oo" pad part under a lead the app sings or plays | per-note pitch vs the part, BleedGate | 0.56 | `harmony-line` |
| 7 | Hold a 3rd or 7th while the bass moves underneath (guide-tone line through ii–V–I) | per-chord pitch vs the guide tone | ≤ 20 ¢ each | `harmony-line` with chords |
| 8 | Close harmony, 3 parts: you sing the middle part while the top and bottom sound (app or choir room) | per-note pitch, straight tone, no unison drift | 0.55 | choir rooms + `harmony-line` |

Pri **P2**, Size **S–M**. L7 also serves F14 and F15.

### F12 `v-inflect`: Ornaments and jazz inflections (5 levels)

Practised: classical ornaments, then jazz and blues inflections done on purpose: scoop, fall, doit, bend, ghosted
note. Start → target: a grace note → a phrase with marked inflections, each in its right shape and size.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 ★ (ornament L1 grace) | Grace notes | ornament shape | existing | `gradeOrnament` |
| 2 ★ (ornament L2 mordents) | Mordents | existing | existing | — |
| 3 ★ (ornament L3–4 turns + trills) | Turns, trills | existing | existing | — |
| 4 | Intentional scoop (from −100 to −200 ¢ into the note in ≤ 150 ms) and fall-off (−300 ¢ or more at the end) | pitch contour shape and size | 3 of 4 shapes right | contour templates (S) |
| 5 | Blue-note bend: the 3rd bent up from b3 toward 3; ghost a note (dB −8 or more) | bend reach, dB dip | both | — |

Pri **P3**, Size **S**.

### F13 `v-songs`: Songs, from the on-ramp to performance with a band (9 levels)

Practised: whole songs, phrase by phrase, over a band, in tune, in time and with shape. Start → target: one phrase
of a simple song after hearing it → a whole song with the band, every phrase at 80 % or more, with breath plan and
dynamics, at performance tempo.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 | Echo one phrase of a level-1 PD song (`song-sing` L1) | per-note pitch | existing | `topicsSongs` |
| 2 | Sing-along (note roll), 1 phrase, **pop groove backing** | per-note pitch | 0.7 | `SingAlong` + band `pop` (M) |
| 3 | Two phrases with rhythm graded | pitch + onset | 0.7 | F7 onsets |
| 4 | Whole song (level 1–2 songbook) **per-phrase scoring**; the weakest phrase is looped, slower, until it passes, then the whole song is sung again | per-phrase score (pitch 50 %, time 30 %, breath 20 %) | every phrase ≥ 0.75 | new phrase loop + piece-coach tempo ladder (M) |
| 5 | Our own **original pop songs** (verse, chorus, pentatonic hooks, I–V–vi–IV) | as L4 + dynamics (chorus louder than verse ≥ 3 dB) | as L4 | new content (M) |
| 6 | Unaccompanied song from memory (ABRSM-style) | `v-pitch` drift + per-phrase | drift ≤ 25 ¢, phrases ≥ 0.7 | — |
| 7 | Song in a minor key and with a bridge (level 3–4 songs) | as L4 | 0.8 | — |
| 8 | **My song** (user audio): the user loads their own recording, the app extracts its sung melody and the singer is scored against it | per-phrase pitch and time vs the extracted line | 0.75 | on-device analysis (legal per MUSIC_SOURCES_LEGAL), L |
| 9 | Performance take: one pass, no loops, scored and saved (a "recital" card) | full report | ≥ 0.8 | — |

Pri **P1** (L2–L5), Size **M** (phrase loop and band) to **L** (L8).

### F14 `v-standards`: Standards ladder, ballads, phrasing and blues heads (10 levels)

Practised: jazz melodies, first as written, then interpreted: rhythmic displacement, back-phrasing, ballad tone,
blues inflection, then a full chart with the band. Start → target: a 12-bar blues head as written with the band → a
32-bar AABA standard with an interpreted second A, a ballad chorus, and phrasing behind the beat, all graded.

| L | Content | Measured | Pass rule | Reuse |
|---|---|---|---|---|
| 1 | Blues head (our original over `blues-f`), as written, swing 100 bpm | per-phrase pitch + time | 0.75 | `charts.ts` + band + F13 phrase loop |
| 2 | A PD standard head (section 7.3), A section, as written | as L1 | 0.75 | new content |
| 3 | The same head **interpreted**: the app shows 3 allowed changes (anticipate, delay, hold over the bar), and the singer must keep the melody's pitches and land each phrase's target note within ± ½ beat | pitch skeleton kept (≥ 85 % of target notes), rhythm differs from the written (≥ 30 % of onsets moved) | both | `improvPhrasing` "vary" (related yet changed) |
| 4 | Laid-back chorus: the whole A section behind the beat | mean offset 40–120 ms, SD ≤ 40 ms, phrase-end downbeats ±60 ms | all three | F7 L6 |
| 5 | **Ballad** at 56–66 bpm: long notes, jazz-style late vibrato, a dynamic arc, one breath per phrase | stability on notes ≥ 2 beats, vibrato placement, arc, gaps | 0.75 | F1, F4, F5 metrics |
| 6 | Ballad **colla voce** (rubato): the band follows the singer's note onsets within a phrase and rejoins at the bar | pitch + "returns to the bar" (phrase ends within 1 beat of where the band rejoins) | 0.7 | new follow mode in the band (L) |
| 7 | Bossa standard (bossa band): straight 8ths, soft dynamic, no vibrato | straight-tone score, swing ratio ≈ 1.0–1.15, pitch | 0.75 | band `bossa` |
| 8 | Rhythm-changes head (our original over `rhythm-a`) at 160–200 bpm | pitch + onsets at speed | 0.7 | — |
| 9 | Full AABA standard: verse rubato (L6) → chorus swung → interpreted last A | combined per-section report | ≥ 0.75 each | — |
| 10 | Blues singing: 12-bar call and response with the band's answers; blue notes (F12 L5) and a fall at the phrase end | per-phrase + inflection shapes | 0.75 | — |

Pri **P1** (L1–L5, L7–L8), **P3** (L6 colla voce). Size **M** for content and **L** for colla voce.

### F15 `v-scat`: Scat and vocal improvisation (10 levels) + `v-barry` (7 levels, kept)

Practised: Trinity's three stimuli (motif, harmony, style) and the jazz-pedagogy order: embellish → rhythmic scat
on one note → guide tones → chord-tone landing → bebop lines → trading fours. Start → target: two bars of rhythm on
one pitch over a swing band → a full blues chorus and a rhythm-changes A section of scat that lands chord tones on
the downbeats, uses chromatic approaches and stays in time.

| L | Content | Measured (never the syllables) | Pass rule | Reuse |
|---|---|---|---|---|
| 1 | Rhythmic scat on one note: copy then answer 2-bar rhythms (call and response) | onset grid ±60 ms, accents | ≥ 80 % onsets | F7 onsets |
| 2 | Motif (Trinity "motivic"): develop a given 3-note cell — repeat, sequence, displace | `improvPhrasing` motif detection on sung notes | 2 developments named | `improvPhrasing.ts` |
| 3 | Embellish the melody of an F14 head: keep target notes, add neighbours and approaches | target notes kept ≥ 80 %, added notes ≥ 20 % | both | "vary" |
| 4 | Guide tones: sing 3rds and 7ths through ii–V–I (half notes) | per-chord pitch ∈ {3, 7} ±30 ¢ | ≥ 85 % | `perform.ts` pcsAt + F11 L7 |
| 5 | Chord-tone landing: free 8ths, but beat 1 of each chord must be a chord tone (blues in F) | `strongChordTones`, `endsOnChordTone` | ≥ 0.7, ends on chord tone | `improvReportBy` |
| 6 | Chromatic approach: land each chord tone from a half step above or below | `chromaticApproaches` | ≥ 0.4 | — |
| 7 | Bebop syllable phrasing: swung 8th lines, accents on the off-beats and the top notes of lines | swing ratio, accent placement, chord-tone landing | all ≥ thresholds | F7 L5 + F4 L4 |
| 8 | Tensions in the line: 9 and 13 on dominants, #11 on Lydian chords (Trinity "harmonic") | share of tension notes on strong beats over the right chord | ≥ 3 per chorus, ≥ 0.6 landing | — |
| 9 | Style (Trinity "stylistic"): one chorus each in swing, bossa and blues, with the right feel per style | swing ratio per style, landing | per-style bands | band styles |
| 10 | Trading fours with the band at 160 bpm; the app answers using the singer's motif | landing, time, motif reuse | 0.7 | `improvPhrasing` trade |
| B1–B7 ★ `v-barry` | Barry Harris lines (unchanged) | existing | existing | `barry.ts` |

Gates: L4 and later need F10 L4 and F11 L5 (Berklee puts ear and harmony before improvisation).
Pri **P1** (L1, L4–L5), **P2** (the rest). Size **M**.

### Vocal health (explain-only, not counted)

Mini-lessons: warm-up and cool-down order (semi-occluded sounds such as lip trills and straw phonation, explained,
not graded); hydration and steam; "speak less and rest before a gig"; signs to see a laryngologist (hoarseness over
2 weeks, pain, a lost top range); belting and CCM registration explained as concepts; healthy volume. The app tracks
**sung minutes per day** (measured anyway) and suggests a break after about 30 minutes or when stability falls
sharply within one session. This is a reminder, never a score.

### Level count

| Family | New levels | Re-homed ★ | Total |
|---|---|---|---|
| F1 breath | 5 | 1 | 6 |
| F2 pitch | 6 | 2 | 8 |
| F3 range | 4 | 2 | 6 |
| F4 dynamics | 3 | 2 | 5 |
| F5 vibrato | 5 | 3 | 8 |
| F6 agility | 1 | 8 | 9 |
| F7 time | 7 | 1 | 8 |
| F8 scales | 0 (+ arpeggio items) | 8 | 8 |
| F9 sight | 4 | 5 | 9 |
| F10 ear | 4 (L1, L3 and L5 turn existing topics into levels) | 2 | 6 |
| F11 harmony | 3 | 5 | 8 |
| F12 inflect | 2 | 3 | 5 |
| F13 songs | 8 | 1 | 9 |
| F14 standards | 10 | 0 | 10 |
| F15 scat | 10 | 0 | 10 |
| v-barry | 0 | 7 | 7 |
| **Total** | **72** | **50** | **122** |

The ladder levels each re-home whole. The ornament program's dynamics items are counted in F4, and its ornament
items in F12.

---

## 6. Pop and simple songs as the on-ramp

| Principle | How |
|---|---|
| **Same meters, easier music** | Every song take shows the same five meters the jazz levels use: pitch, time, breath, dynamics and steady tone. A singer who learns "breath plan" on a folk song meets it again on a ballad. |
| **The four milestones in the path** | **Song Singer** (F13 L4: a whole simple song, every phrase ≥ 0.75) → **Musician Singer** (F2 L6 unaccompanied + F7 L5 swing + F9 L5) → **Jazz Singer** (F14 L5 ballad + F15 L5 landing) → **Jazz Artist** (F14 L9 + F15 L10). These are the unit-group titles in the path and match the "promotion, not full bars" rule. |
| **Copy that frames it** | "Every great jazz singer can sing a simple song perfectly. Start here." Never "kids' songs": the PD songs get a mature pop, rock, reggae or bossa groove from the band engine, so *Greensleeves* in a bossa groove feels adult. |
| **Content we may use** | (1) The 40-song PD `SONGBOOK` with modern band grooves, (2) **original pop-style songs we compose** (common progressions such as I–V–vi–IV and our own hooks), (3) the user's own audio (F13 L8), analysed on the device. No commercial melodies or lyrics (MUSIC_SOURCES_LEGAL.md). |
| **Bridge every pop skill to its jazz use** | After each pop milestone, a one-line "where this goes" card, for example "Breath plan → ballads (F14 L5)" or "Anticipations → interpreting a standard (F14 L3)". |
| **No lyrics** | Neutral vowels, solfège or numbers. Lyrics are shown only for songs that are PD as text too (composer **and** lyricist), which needs a per-song check. |

---

## 7. Content needs

### 7.1 Generated, not authored (cheap)

Breath plans, accent maps, swing figures, call-and-response rhythms, guide-tone lines, sight melodies (bass clef),
tension targets and bebop lines can all be generated with a seed, as the existing `sightMelody`, `barryLine` and
`runAt` are.

### 7.2 Authored originals (medium)

- About 12 **original pop-style songs**: verse and chorus, 8–16 bars, levels 1–4.
- About 10 **original jazz heads** over common forms: 12-bar blues (F, Bb, minor), rhythm changes, a 32-bar AABA on
  generic ii–V changes, a bossa, a minor ballad and a waltz. Chords are free to use; melodies are ours.

### 7.3 Public-domain standards (both rules: published ≤ 1930 in the US, composer died ≤ 1955 for Israel/EU life+70; melody only)

Candidates for the owner and a lawyer to clear one by one **(lawyer)**. The lyricist matters only if we display
lyrics (we do not).

| Composer (died) | Candidate songs (year) |
|---|---|
| George Gershwin (1937) | *The Man I Love* (1924), *Someone to Watch Over Me* (1926), *'S Wonderful* (1927), *How Long Has This Been Going On?* (1928), *Embraceable You*, *I Got Rhythm*, *But Not for Me* (1930) |
| Jerome Kern (1945) | *Ol' Man River*, *Can't Help Lovin' Dat Man* (1927) |
| Vincent Youmans (1946) | *Tea for Two* (1924), *Sometimes I'm Happy* (1927), *Great Day*, *Without a Song* (1929) |
| Walter Donaldson (1947) | *Yes Sir, That's My Baby* (1925), *My Blue Heaven* (1927), *Makin' Whoopee*, *Love Me or Leave Me* (1928) |
| Fats Waller (1943) | *Ain't Misbehavin'*, *Honeysuckle Rose* (1929) |
| James P. Johnson (Nov 1955; PD under life+70 from 1 Jan 2026) | *Charleston* (1923), *If I Could Be with You* (1926) |
| **Not yet usable under life+70** | W. C. Handy (died 1958), Ellington, Berlin, Porter, Rodgers, Carmichael, Henderson (*Bye Bye Blackbird*), Pinkard (*Sweet Georgia Brown*) |

Even with a PD song, our transcription must be our own (not copied from a fake book) and our arrangement is new.

---

## 8. Path placement

**Finding:** in `ladderSteps()` every vocal program uses `difficulty: diff(i)` with no offset. All six programs'
L1 therefore sit at 700, while the topic steps start at 760–1000. The fix is the same as for keys and drums:

```
VOICE_LATER = { 'v-breath': 0, 'v-pitch': 0, 'v-songs': 0, 'v-range': 1, 'v-time': 1, 'v-ear': 1, 'v-dyn': 2,
                'v-scale': 2, 'v-sight': 2, 'v-vib': 3, 'v-agility': 3, 'v-harmony': 3, 'v-inflect': 4,
                'v-standards': 4, 'v-scat': 5, 'v-barry': 6 }
```

Stages, the unit groups in themed spiral units:

| Stage | Path units | Families in focus | Milestone |
|---|---|---|---|
| A Song Singer | 1–6 | F1 L1–3, F2 L1–4, F13 L1–4, F7 L1–2, F10 L1–2, F3 L1–2 | F13 L4 |
| B Musician Singer | 7–14 | F2 L5–6, F7 L3–5, F9 L1–5, F8 L1–4, F4, F5 L1–3, F10 L3–4, F11 L1–4, F13 L5–7 | F2 L6 + F7 L5 |
| C Jazz Singer | 15–22 | F14 L1–5, F15 L1–5, F11 L5–7, F5 L4–5, F6 L5–9, F9 L6–8, F12 | F14 L5 + F15 L5 |
| D Jazz Artist | 23+ | F14 L6–10, F15 L6–10, v-barry, F8 L5–8, F9 L9, F11 L8, F13 L8–9 | F14 L9 + F15 L10 |

**Placement probe (about 2½ minutes, reusing `placement.ts`):** a range glide → one 5 s hold (pitch, stability,
vibrato present?) → 3 echo phrases of rising difficulty → 4 bars on the click (onsets) → one sing-along phrase over
the band → (only if the earlier items pass) one guide-tone line. This sets the frontier per family. Jazz-experienced
singers skip Stage A, in line with the cautious ✓ rule.

---

## 9. Migration and engine work

| Item | What | Size |
|---|---|---|
| Keep progress | Keep every existing `vocal:n` ref, base number and stored fact. New families get new bases (600 breath, 700 pitch, 800 range, 900 dyn, 1000 vib-extra, 1100 time, 1200 ear, 1300 songs, 1400 standards, 1500 scat, …). Re-grouping old levels into F-families is a **display map** (family → list of refs), not a renumbering. | S |
| Onset engine for the voice | RMS-rise + voicing-start onsets, mic latency applied, mean/SD vs grid, swing ratio, accent peaks | M |
| Phrase loop | Per-phrase scores → loop the weakest at −10 % tempo (piece-coach ladder) → whole song again | M |
| Sing-along over the band | `SingAlong` + `band.ts` styles + BleedGate; headphones prompt | M |
| `driftOf`, `breakOf`, step-curve, contour templates (scoop, fall, bend) | Small pure functions in `vocal.ts`, unit-tested on synthetic frames like the existing ones | S each |
| Bass-clef vocal sight | NotesView clef choice from the range | S |
| Colla voce band | The band waits for the singer's onsets within a phrase | L |
| My-song melody extraction | On-device pitch of the user's file (vocal-dominant sections only) | L |
| Content | 12 pop originals, 10 jazz heads, about 8 PD standards (after clearance) | M |

**Priority order:** (1) `VOICE_LATER` fix → (2) the onset engine + F7 → (3) phrase loop + sing-along with band (F13
L2–5) → (4) F2 drift levels → (5) F14 L1–5, 7–8 → (6) F15 L1, 4–5 → (7) the rest of P2 → (8) P3 (colla voce,
inflections, arpeggio items, my-song extraction).

---

## 10. Sources

- ABRSM Singing (older editions via third-party copies) and Singing for Musical Theatre: [newschool.ie guide](https://www.newschool.ie/wp-content/uploads/2018/08/Your-Guide-to-ABRSM-Music-Exams.pdf), [Chimes Music, Singing Grade 6 from 2018](https://www.chimesmusic.com/latest/abrsm-singing-grade-6/), [Music Teacher review of SfMT](https://www.musicteachermagazine.co.uk/articles/reviews-abrsm-singing-for-musical-theatre-syllabus) **(verify current edition)**
- Trinity Singing supporting tests: [Trinity example improvisation test, Grade 7](https://trinitycollege.com/qualifications/music/grade-exams/singing/resources/singing-supporting-tests/example-improvisation-test-stylistic-stimulus-grade-7), [changes to supporting tests](https://www.trinitycollege.com/news/viewarticle/changes-to-supporting-tests-for-music-grade-exams)
- RSL Vocals: [RSL Vocals Syllabus Guide 2020](https://www.newschool.ie/wp-content/uploads/2020/11/RSL_Vocals_Syllabus_Guide_05May2020.pdf), [RSL Vocals Grade 8](https://www.rslawards.com/products/vocals-grade-8/), [AMEB Rockschool Vocals Grade 8 2021](https://www.ameb.edu.au/rockschool-vocals-grade-8-2021)
- LCM: [Popular Music Vocals syllabus 2019 update](https://lcme.uwl.ac.uk/media/pktgouao/popular-music-vocals-syllabus-2019-update.pdf), [Jazz recorded exam requirements](https://lcme.uwl.ac.uk/media/1vgn1gdq/jazz-recorded-exam-requirements.pdf)
- Berklee: [Vocal Improvisation in the Jazz Idiom](https://college.berklee.edu/node/2274761), [Advanced Vocal Improvisation Techniques: Jazz](https://college.berklee.edu/node/2274776), [Private Instruction — Voice](https://college.berklee.edu/node/2372081), [Scatting Without Fear](https://berklee.edu/node/2280366)
- Jazz vocal pedagogy: [Jazz Singing: A Guide to Pedagogy and Performance](https://www.prestomusic.com/books/products/8941126--jazz-singing-a-guide-to-pedagogy-and-performance), [Stoloff, Scat!](https://singers.com/shop/Scat-Vocal-Improvisation-Techniques/), [Fredrickson, Scat Singing Method](https://singers.com/shop/Scat-Singing-Method/), [Choral Journal Sept 2025](https://acda-publications.s3.us-east-2.amazonaws.com/CJ/September2025/files/basic-html/page63.html)
- Estill / CCM (topic level): [Estill Voice Training (Wikipedia)](https://en.wikipedia.org/wiki/Estill_Voice_Training), [Utah vocology, CCM](https://vocology.utah.edu/_resources/documents/sywts_ccm_manternach.pdf)
- Singing accuracy: [Mauch, Frieler & Dixon 2014, JASA](https://webspace.eecs.qmul.ac.uk/s.e.dixon/pub/2014/MauchFrielerDixon_IntonationInUnaccompaniedSinging.pdf), [Larrouy-Maestri et al., ESCOM 2015 tolerance](https://orbi.uliege.be/bitstream/2268/186233/2/2015_ESCOM_tolerance.pdf)
- Vibrato: [Manfredi et al. 2015, operatic and jazz singers](https://read.qxmd.com/read/25795355/automatic-assessment-of-acoustic-parameters-of-the-singing-voice-application-to-professional-western-operatic-and-jazz-singers), [Kuhlewind 2014 thesis](https://www.fon.hum.uva.nl/theses/FlorianKuhlewindMA2014.pdf)
- Swing microtiming: [Nelias et al. 2022, Communications Physics](https://www.nature.com/articles/s42005-022-00995-z)
- Copyright: docs/research/MUSIC_SOURCES_LEGAL.md (US ≤ 1930 PD; life + 70 in Israel/EU)

---

## Implemented (2026-11-11, voice course build)

Built on the worktree branch in four commits (V1–V4). Everything below is graded only from the microphone (pitch,
onsets, relative loudness, vibrato); syllables, words, tone colour and register mode are explained, never scored.

**Build order, as planned**

1. **`VOICE_LATER`** (`src/engine/path.ts`): family offsets by stage; Barry Harris L1 now sits 6 steps after "hold a
   note" L1 (test in `tests/voiceCourse.test.ts`).
2. **Onset engine + F7 time feel** (`src/engine/voiceTime.ts`, `voiceGrade.ts`): sung onsets (attack after a dip or
   voicing start, sung frames only, so speaker clicks do not count), time feel against a grid after the calibrated mic
   delay, "laid back" judged only as the mean of 8+ onsets, swing ratio of articulated pairs with a tempo-dependent
   band, back-phrasing, the inner clock. `v-time` L2–L8 (1101–1107); the first timed take asks for the mic-delay
   calibration once (LatencyCalibrate, skippable with the usual 70 ms).
3. **Sing-along over the band, per phrase** (`src/engine/voiceSongs.ts`, `src/ui/VoiceTimed.tsx`): any of the 40
   songbook songs (2/4–4/4 and waltzes; 6/8 Für Elise excluded) or our own songs, placed in the range, backed by the
   band engine (`chartBacking`, mature grooves: pop / bossa / rock / ballad / waltz), with a count-in and an intro bar
   where the bleed gate learns the band (headphones recommended). Each phrase scored pitch 50 / time 30 / breath 20;
   the weakest phrase loops at 90 %, then full tempo, then the whole song (loops are practice, only whole takes count);
   every phrase must pass. Swing songs are sung swung (off-beat eighths at 2/3). `v-songs` L2–L7 + the performance
   take (1301–1307). Four own pop songs in `src/content/voiceSongs.ts` (verse + chorus; the chorus-louder rule ≥ 3 dB).
4. **Drift levels** (`v-pitch` 701 fine tuning into a drone, 702 back to the tonic, 703 eight bars unaccompanied,
   705 a minor song ≤ 10 ¢ drift): `driftOf` = last phrase's offset − first's, note error inside each phrase.
5. **Standards** `v-standards` L1–L5, L7, L8 (1401–1407): own contrafacts (*Blue Window* 12-bar blues, *Corner Light*
   minor ii–V cycle, *Slow Harbor* ballad, *Rio Gray* bossa, *Fast Tracks* rhythm changes, *Minor Street* minor blues)
   and two PD spirituals (Saints, Swing Low) with our own jazz charts. Interpreted head (long notes kept ≥ 85 %,
   ≥ 30 % onsets moved), laid-back chorus (mean 40–120 ms, spread ≤ 40 ms), ballad / bossa long notes steady
   (no vibrato for bossa).
6. **Scat** `v-scat` L1 call and response, L4 guide tones (per half note ∈ {3, 7} ± 30 ¢), L5 chord-tone landing,
   L6 chromatic approach (`improvReportBy`), and further L8 tensions on strong beats, L9 two styles (1501–1506).

**Further families (P2, much of P3)**: `v-breath` 601–605 (10 s hold with the last quarter double, phrase on one
breath, breath plan, 16 s ballad phrase, 20 s fading); `v-range` 801–804 (siren with the break detector `breakOf`,
5 notes through the break at 3 loudnesses, the range edge, octave-and-a-fifth on one breath); `v-dyn` 901–904
(cresc/decresc/swell, terraced, accents, phrase arc); `v-vib` 1001–1005 (late narrow jazz vibrato, phrase-end
vibrato, widening terminal vibrato, straight tone in harmony, consistency over 5 notes); `v-ear` 1201–1202 (named
chord tones, tensions 9/11/13/♭9/♯11); `v-harmony` 1701–1703 (backing pad, guide-tone line over moving chords,
close-harmony middle part); `v-inflect` 1801–1802 (scoop, fall, blue-note bend, ghost note); `v-agility` 1601–1602
(bebop lines at 120 / 160, plus a link to the 8 run levels); `v-sight` 1901 bass clef, 1902 chromatic notes (sight
items now also switch to the bass clef automatically when the range's low note is A2 or lower); `v-scale` 2001
arpeggios (a new level instead of changing the mode levels' items, so no one's progress moves).

**Families and migration**: `src/engine/voiceFamilies.ts` holds the 15 families + Barry Harris as a display map
(family → level numbers). Every old level keeps its number, step id `vocal:<n>` and facts; it is re-homed exactly
once (tested). `VOCAL_PROGRAMS` is now the families in stage order, so the path opens breath, pitch and songs first.
The singing screen lists families by stage (Song Singer → Musician Singer → Jazz Singer → Jazz Artist); a level opens
when the previous level of its family *or* the old previous number passed, so nothing open before is locked.
New levels: 61, old: 40 → 101 vocal levels on the voice path, plus the 8 run levels and the voice topics.

**Placement probe** (`src/ui/VoiceProbe.tsx`, about 2½ min): a held note, three echoes, four bars on the click, a
phrase with the band, and a guide-tone line only when those pass. `probeStarts` moves a family one or two levels on
from a clear pass (≥ 0.85; jazz-experienced singers skip Stage A's first levels); saved per family in `drillStart`,
the earlier levels become ✓ by test in `withLadderFacts` (open to practise, never "done").

**Connections**: own glyph per family (new drawn `breath` and `mic`; Barry Harris now `sixdim`, scat `improv`), marks
for the voice topics and lessons so every voice-path step has its own symbol (tested unique); family badges (first
steps / halfway / whole) and the four milestone badges; rating tags per family (`voiceItemTags`, real sub-skills);
seven quick lessons with in-depth parts (`src/content/mini/voiceCourse.ts`: breath + registers, drift + chord tones,
shaping, time feel + bebop, songs with the band, standards, scat); the voice radar shows six axes (pitch, time,
breath, shape, songs, jazz). After a take the result card replaces the instruction and the trace shrinks (one phone
screen).

**Not built yet**: F2 L7 quarter tones; F9 L8 sight-singing with accompaniment and L9 jazz lead-sheet reading;
F13 L8 "my song" (melody extraction from the user's audio); F14 L6 colla voce (the band following the singer),
L9 full AABA and L10 blues call and response; F15 L2 motif, L3 embellishing a head, L7 bebop syllable accents and
L10 trading fours; the sung-minutes rest reminder. Tier 1A standards (Love Me or Leave Me, Mean to Me …) need a
transcription from period sheet music, which was not available here — the standards levels use our contrafacts
and the spirituals. F10 L1/L3/L5 and F13 L1 remain topics on the path (not vocal levels).

**Unverified**: real-microphone behaviour of the onset engine and the band sync (`heardTime` + calibrated delay) on
phones, the bleed gate against a full band on a speaker, and the Hebrew copy by a native reviewer. The new quick
lessons' English narration is not recorded yet (`tests/voiceFiles` "every static line is recorded" fails until then).


## Implemented (P2)

Second build (2026-11-11): every item of "Not built yet" above, the sung licks' timing tolerance, and the rest
reminder. Only the microphone grades (pitch, onsets, relative loudness); syllables and words are never scored. New
engine code: `src/engine/voiceP2.ts` (quarter tones, motif, trading, the colla voce follower, the rest reminder),
`src/engine/voiceMySong.ts` (melody from the singer's own recording), song rules in `voiceGrade.ts`, the take screen
in `src/ui/VoiceTimed.tsx` (+ `VoiceMySong.tsx`). Tests: `tests/voiceP2.test.ts` (24), e2e `e2e/voiceP2.spec.ts`.

| Level | Family · L | What is sung | Measured, pass rule |
|---|---|---|---|
| 704 | F2 L7 quarter tones | chromatic neighbours, then jins Rast, Bayati, Sikah (fractional MIDI), each note on its own "da" | notes split at short silences / ⅓-semitone moves; quarter tones ≤ 15 ¢ on average, 80 % of notes ≤ 25 ¢ |
| 1903 | F9 L8 reading with the band | four own 8-bar melodies, the band plays only the chords, the melody is never played; staff instead of the note roll | per phrase pitch + time (the song grader), 0.55 |
| 1904 | F9 L9 jazz lead sheet | three own swing lead sheets: chord symbols above the staff, swung eighths, syncopation, ties (`~` in the notation; one sung note, a drawn tie) | as L8, 0.55 |
| 1308 | F13 L8 my song | the singer's own recording, opened on the device (never uploaded): melody taken out offline (YIN on a 4× decimated copy, semitone grid of the recording's own tuning, phrases at breaths), then sung along with the recording (headphones required) | per phrase pitch + time vs the extracted line, 0.7; no loops |
| 1408 | F14 L6 colla voce | the band waits: the first note and chord, then a chord pad changes when the singer reaches each bar's first note (live `Follower`: ±70 ¢ held 3 frames, a repeated pitch needs a fresh attack, a skipped note is passed) | notes reached in tune per phrase ≥ 0.7, follow ≥ 80 %; no clock |
| 1409 | F14 L9 full AABA | own 32-bar AABA *Lantern Street* as written; then the same with the last A interpreted | as written every section ≥ 0.72; interpreted item: A A B timed, last A kept ≥ 85 % + moved ≥ 30 % |
| 1410 | F14 L10 blues call and response | own 12-bar *Call and Answer*: the singer sings 2-bar calls, the band plays our answer line in the gaps | per phrase + a fall (≥ 150 ¢ drop within 0.45 s of the phrase end) on all but one phrase, 0.7 |
| 1507 | F15 L2 motif | a 3-note cell played in bars 1–2, developed over 6 bars | `motifReturns` with the cell as motif: two different developments (repeat, sequence, inversion, displacement, rhythm) |
| 1508 | F15 L3 embellish the head | Saints (PD) and Blue Window | long notes kept ≥ 80 %, notes added ≥ 20 % |
| 1509 | F15 L7 bebop accents | the two bebop lines | swing ratio in the tempo band, off-beat attack ≥ 1.5 dB louder than on-beat, per-phrase pitch; 0.65 |
| 1510 | F15 L10 trading twos and fours | blues at 140 (twos, 1 chorus) and 160 (fours, 2 choruses); the app's first turn is a chord-tone line, each later app turn is computed live from the singer's previous turn (`tradeAnswer`: their cell sequenced and inverted) | per singer turn: chord tones on strong beats ≥ 60 %, onsets on the swung-eighth grid, ≥ 3 notes in every turn, an idea returns (own motif, or the app's cell picked up) |

Placement: the new levels sit where they teach — motif and embellishing right after call and response, bebop accents
before tensions, colla voce after the ballad, my song before the performance take, quarter tones and the reading
levels at their families' ends. Old levels keep their numbers and keep opening by number (`n − 1` passed), so nothing
open before is locked. Every level is a path step (`vocal:<n>`), rates its family's tags (trading → improv/answer,
motif → improv/play, reading → sight), counts toward the family badges, and records XP like the other timed levels.

**Sung licks** (`src/engine/licks.ts`, `analyze.ts`): the voice ran through the piano-by-microphone limits (onset SD
≤ 28 ms, a "hesitation" at 1.5 × an interval) — tighter than a sung onset can be measured (±25–40 ms, §4). A sung lick
now carries `sung: true` and is analysed with `VOICE_TIMING` (SD ≤ 40 ms, worst onset 100 ms, hesitation at 1.8 ×);
the pitch rule is unchanged, and it is always treated as microphone input (a connected MIDI keyboard no longer makes a
singer's take use MIDI limits). Tested: a ±35 ms sung take passes as a voice and fails with the instrument limits; a
±100 ms take still fails.

**Rest reminder** (vocal health): sung minutes today (from the kept takes' item lengths) and a tiring check (the last
three takes' stability ≥ 8 ¢ worse than the first three within the hour) show a one-line break suggestion on the
voice home and on the level summary after about 30 minutes. Never a score.

**Quick lessons**: `voice-reading` (reading with the band, lead sheets, quarter tones) and `voice-trading` (motif,
embellishing, bebop accents, trading, colla voce, call and response, my song), opened before those levels
(`units.ts` per-level map).

**Jazz-course taste (trading twos)**: the sung trading-twos item now exists (1510 item 1). It was *not* wired into
the jazz course's "I play well" taste: tastes run before setup, when no voice range is known, and the jazz course is
not voice-only (an instrumentalist would be asked to sing). Owner decision whether a singer's jazz taste should open it.

**Still not built**: F14 L9's rubato verse before the chorus (colla voce exists as its own level); "returns to the
bar" timing after a colla voce phrase; bar-accurate band following (the pad changes on the bar's first sung note, it
does not stretch a groove); Tier 1A standards (no period transcriptions available here); F10 L1/L3/L5 and F13 L1
remain topics.

**Unverified**: everything live on a real phone — the follower and the trading replies' timing (`setTimeout` +
`heardTime`, about ±20 ms), my-song extraction on real recordings (clean on synthetic audio; a band mix will give
gaps), quarter-tone splitting of a real voice; Hebrew copy by a native reviewer; the two new lessons' English
narration is not recorded (`tests/voiceFiles` fails on the new lines until then).


## Implemented (P3)

Third pass (2026-11-11): the items "built short of the plan" in P2. Only the microphone grades. Code:
`src/engine/voiceP2.ts` (`rejoinAt`, `paceOf`, `stretchSegment`, `reentryOffset`, `synthColla`), `voiceGrade.ts`
(`collaParts`, `gradeCollaSong`), `src/engine/voiceEar.ts` (what an ear item plays and shows), the families in
`voiceFamilies.ts`, the take in `src/ui/VoiceTimed.tsx` and `Vocal.tsx`. Tests: `tests/voiceP3.test.ts` (12).

| Level | Family · L | What is sung | Measured, pass rule |
|---|---|---|---|
| 1408 | F14 L6 colla voce (changed) | the first phrase free: the band follows note by note and its **groove stretches** — the ballad comp, bass and brushes between two melody notes are played at the singer's pace (the last two notes' time over their written beats, kept within ½×–2× the tempo, smoothed); the last free chord is held, the band **counts one bar** and the second phrase is in time | free notes reached in tune (follow ≥ 80 %), the tempo phrase as a band song (pitch + time), and **back on the bar**: the onset nearest the written re-entry, a hard rule within one beat (scored full ≤ 0.15 beat); every phrase ≥ 0.7 |
| 1409 | F14 L9 full AABA (item 1 changed) | *Lantern Street* with its own new 8-bar **verse** (ours, ends on the dominant), sung colla voce, then the count-in and the 32-bar chorus swung at 132 | as 1408 per phrase (6 phrases), ≥ 0.72 each; item 2 (the last A interpreted) unchanged |
| 1203 | F10 L1 echo | four own two-bar melodies, played with their rhythm, sung back | the melody grader (per-note pitch), 0.6 |
| 1204 | F10 L3 intervals from a note | only the given note is played (and shown); sing it, then a named interval up or down (M3, P5, m3, P4, M6, m6) | as above, 0.6; a semitone-wrong interval fails |
| 1205 | F10 L5 audiation | a motif moving by step: two bars played, the **third never played** is sung (nothing of it shown; the extra listen replays the first played note) | per-note pitch of the unplayed bar, 0.6 |
| 1309 | F13 L1 one phrase of a song | the first phrase of four level-1 public-domain songs (Frère Jacques, Mary Had a Little Lamb, the German folk tune of "Yonatan", London Bridge), repeated notes joined | per-note pitch, 0.6 |

**Placement and old progress.** No level was renumbered. `v-ear` is now 1203 → 8 → 1204 → 1201 → 1205 → 1202 (L1–L6
as the plan), `v-songs` starts with 1309. A level that was open before stays open (`voiceLevelUnlocked`: the old order
is kept as a second key — 1301 and 8 stay open from the start, 1201 still opens after 8). A placement start saved
before (`drillStart` for `v-songs` / `v-ear`) now counts the one level put in front (`voiceStartNow`, `before: 1`), so
the same old levels stay ✓ by test and the new first level is ✓ with them. The new levels feed the path (`vocal:<n>`
steps), XP and the voice-take record, the family badges, the ratings (intervals → singing/intervals, echo and
audiation → sequences/inner, the song echo → singing/songs) and the quick lessons by number base (ear → the drift +
chord-tones lesson, 1309 → songs with the band).

**Still not built**: Tier 1A standards (no period transcriptions here). A colla voce section in the middle of a song
(free – tempo – free) is not offered; only free then tempo.

**No memorizable items (follow-up)**: the echo (1203) and audiation (1205) melodies are generated fresh every session
(`sessionEarItem` in `voiceEar.ts`, seeded, applied when the level opens), item ids unchanged. Echo: as many notes and
the same rhythm as the fixed item, diatonic, no leap wider than its widest, its span plus at most a whole step, no note
repeated straight after itself, ending on the tonic. Audiation: a motif of the same length from a pool, a start degree
and a direction; the third bar is never played. The fixed melodies stay as the templates and test fixtures. Intervals
(1204) and the song echoes (1309) keep their content (the interval is placed in the range; the songs are the task).

**Unverified**: on a real phone — the stretched groove's feel (scheduling by `heardTime` when a note is recognised,
about 60 ms after the sung onset plus the mic delay; a due event is played at once when it is up to 250 ms late), the
count-in after the free part and the re-entry timing with a speaker (the bleed gate learns the pads and the tempo
band's pitches); the Hebrew copy by a native reviewer. The new lines are not in the recorded narration.

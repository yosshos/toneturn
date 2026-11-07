# Guitar Technique Drills: Research Catalogue (guitar and bass, microphone input)

Status: research input for the ToneTurn guitar technique layer. This is not a spec; the spec is
`docs/SPEC-GUITAR-TECHNIQUE.md`. Written 2026-11-07. It is the companion to `TECHNIQUE_DRILLS_RESEARCH.md` (piano)
and uses the same markers:
- **[V]** = checked against a source this session (URL given).
- **[M]** = standard pedagogy from general knowledge; widely agreed but not re-verified here.
- **[?]** = uncertain or not found online. Verify before shipping.
- Tempos are given as a metronome mark plus note value, and as **notes per second (nps)**, the unit the app stores.

Contents
1. Curricula compared (30 sources)
2. The union of exercise types (what everybody teaches)
3. Tempo landmarks
4. What the microphone can measure (and what it cannot)
5. How apps grade guitar
6. Conclusions for the app
7. Sources

---

## 1. Curricula compared

### 1.1 Exam boards and academic programs

| Curriculum | What it teaches (technique) | Level structure | Tempo targets |
|---|---|---|---|
| **ABRSM Classical Guitar** (2019 syllabus) [V] | Scales and arpeggios from memory, legato, even. Grades 1–4: tirando (free stroke) or apoyando (rest stroke) allowed. From Grade 5, both strokes are required and the examiner names one. Chromatic, interval (3rds/6ths/octaves) and broken-chord exercises. | Grades 1–8 | Scales G1–5 ♩ = 48 / 56 / 66 / 80 / 96; G6–8 two octaves ♩ = 112 / 126 / 144; three octaves ♩. = 76 / 84 / 96 (triplets). Arpeggios ♩. = 40 → 76. Note values per grade are garbled in the text extraction [?]. |
| **LCM classical guitar** (LCME 2022) [V] | i–m from G1, then i–m or m–a. Thumb-only scales. *pimamip* arpeggio pattern. From G3: harmonised scales in 3rds, 6ths, octaves and 10ths (p + i/m). G6–8: one-octave scales in four positions. | Step, G1–8 | Scales ♩ = 80 (G1) → 108 (G8). Arpeggios ♪ = 160 → 220. |
| **Trinity classical guitar** [V] | Initial–G7: choose scales & arpeggios *or* studies (book *Guitar Scales, Arpeggios & Studies*, 2016). | Initial, G1–8 | Not online [?] |
| **RGT@LCM electric guitar** [V] | Scales (+ arpeggios from G3), chords, rhythm playing from a chord chart, lead improvisation over a chart, spoken questions, aural tests. No notation reading. Step: 1-octave E blues and C major. G1–2: 2-octave scales, natural minor, pentatonic, blues. G3: 2-octave arpeggios, barre chords in 2 positions. G4: scales in 2 positions, 7th arpeggios. G6–8: a chosen specialism. | Step, G1–8 | Electric bpm table not published online [?]. Acoustic handbook (secondary copy): G5 scales ≈ ♩ = 116 in 8ths (3.9 nps), arpeggios ≈ 88. |
| **RSL / Rockschool electric guitar** [V] | Technical work in groups: A scales, B arpeggios, C chords (G5: triads in 3 inversions on the top 3 strings), D riff/stylistic study. Also sight reading or improvisation. G8 adds whole-tone, diminished and altered scales. | Debut, G1–8 | Debut/Premiere 70 bpm. G1–4 about 80 bpm. G5: scales 2 octaves in 8ths at ♩ = 80 (2.7 nps); arpeggios 1 octave in quarters at 80; riff at 100; sight reading at 90. G8 technical work ♩ = 100 [V secondary]. |
| **Trinity Rock & Pop guitar** [V] | 3 songs + session skills. One "Technical Focus" song targets 2–3 named techniques (e.g. palm muting, bends, string skipping) and is weighted under Technical Control. | Initial, G1–8 | At song tempo |
| **Berklee: Leavitt, *A Modern Method for Guitar* Vol. 1–3** [V] | The basic text of Berklee's guitar program: scales and melodic studies in **positions** (open, then closed positions II, V, VII …), chord and arpeggio studies, reading in every position, rhythm studies. | 3 volumes | Not tempo-graded [M] |
| **Berklee Online *Guitar Scales 101*** [V] | Pentatonic, blues, major, melodic and harmonic minor and their modes, mapped across the neck. | 12-week course | — |
| **Musicians Institute (GIT)** [V] | Core: Guitar Technique (finger independence, coordination, speed), Guitar Performance, Guitar Reading, Harmony/Theory/Ear Training, weekly Live Performance Workshops. Electives: rhythm guitar, fingerstyle, slide. | Program levels | Not published [?] |

### 1.2 Classical studies

| Source | Technique | Notes |
|---|---|---|
| **Carcassi, 25 Studies Op. 60** [V] | Each study targets a skill: slurs (about 6 studies), barre, scales, arpeggios, suspensions, dynamics. No. 19: right-hand balance with the melody on top. | Progressive. |
| **Giuliani, 120 Right-Hand Studies Op. 1** [V] | Pure right-hand arpeggio permutations of p-i-m-a over C–G7, mostly 2 bars. Groups move from 3-finger to 4-finger patterns, with full and sequential planting. | The model for the app's PIMA pattern generator. |
| **Segovia, *Diatonic Major and Minor Scales*** [V] | All 24 keys, one fixed 2–3-octave fingering each, lots of shifting. Segovia: rest stroke with alternating i–m; Niedt adds free stroke. | The classical "scales in all keys" canon. |
| **Tennant, *Pumping Nylon*** [V] | Rest stroke (with planting), free stroke, pressure/release, ascending and descending slurs, "Scales: Control and Velocity", tremolo (with lopsided tremolos), Giuliani Op. 1 left-hand études (2nd ed.). | p-a-m-i tremolo is the standard pattern [M]. |

### 1.3 Online methods

| Source | Technique | Level structure / targets |
|---|---|---|
| **JustinGuitar** [V] | Grade 1: open chords and strumming. Grade 2: embellishments, power chords, fingerpicking. Grade 3: bridge to intermediate. **One-Minute Changes**: count clean changes between two chords in 60 s. "Old Faithful" strum (D, DU, UDU). | 3 beginner grades, 23 modules, 204 lessons. One-minute changes: reach **30/min** (D–A) before moving on; long-term **60/min** [V]. The exact Old Faithful notation [?] (written D _ D U _ U D U by users). |
| **Fender Play** [V] | Path > Level > Course > Lesson; each level ends with a self-assessment. | Sources disagree: 5 or 7 levels [?] |
| **Guitar Tricks** [V] | Core Learning System: Guitar Fundamentals 1–2, then genre tracks. | 2 core levels + genres |
| **TrueFire** [V] | Learning Paths: core and supplementary courses, starting from a skill assessment. | Placement test |
| **Troy Grady, *Cracking the Code*** [V] | Picking-motion mechanics: **escape motion**. USX (upstroke escape) pairs with a downward pickslant; DSX (downstroke escape) with an upward slant. Under DSX the last note on a string must be a downstroke. "Inside" vs "outside" string changes. | Diagnostic, not graded |
| **Paul Gilbert** [V partly] | String skipping, 6-note pentatonic groupings climbing the neck (the "Colorado Bulldog" lick on the middle strings). | Whether this is in *Intense Rock* is [?] |
| **John Petrucci, *Rock Discipline*** [V] | Warm-ups for both hands, hand synchronisation, speed and accuracy, alternate picking, sweep, legato, tapping. He split practice time equally between the techniques. | Exact spider / metronome steps [?] |
| **Tom Quayle (legato)** [V] | Hand position, hammer-ons, pull-offs, "hammer-on from nowhere" (Greg Howe's term), muting with both hands. | — |
| **Andy Wood** [M] | Country/fusion hybrid picking, bluegrass crosspicking, banjo rolls. | — |
| **Marty Music / Paul Davids** [M] | Song-first YouTube lessons, plus practice-routine videos (spider, scales, chord changes, vibrato). | Not leveled |
| **Jens Larsen** [V] | Arpeggios through ii–V–I aimed at target notes; drop-2 voicings and inversions [M]. | — |
| **Mick Goodrick, *The Advancing Guitarist*** [V forum] | Opens with one-string ("unitar") study to break position thinking. Then pairs of strings, positions, "mechanics". | — |
| **Joe Pass, *Guitar Style*** [V] | Part 1 Harmony (construction, embellishment, substitution, connection); Part 2 Melody (chord scales, altered scales, blues, rhythm changes). Chord melody. | — |
| **Barry Galbraith / Freddie Green** [V] | Four-to-the-bar comping with 3-note chords on strings 6-4-3, each cut off with the ride cymbal: "time, not voicings". | ♩ steady, quarter notes |
| **B.B. King box** [V] | A movable 6-note shape on the top 3 strings, root on the B string under the index finger, mixing major and minor pentatonic. | — |
| **Travis picking / Chet Atkins / Tommy Emmanuel** [V] | Thumb plays an alternating bass (string 6/5 ↔ 4), lightly palm-muted, while the fingers play melody. Emmanuel: the bass is "always" alternated. | — |
| **Flamenco** [V] | Rasgueado: outward finger flicks, a drum-roll strum. Picado: i–m with rest stroke, short percussive notes. Alzapúa: the thumb plays down and up through 2–3 strings with rest stroke. | Compás (12-beat soleá / bulerías) [M] |
| **Nile Rodgers 16th funk** [V] | A constant 16th down-up "motor": downstrokes on 1 and &, upstrokes on e and a; muted strokes fill the gaps. | — |
| **Country hybrid / chicken picking** [V] | Pick a downstroke on the lower string, snap a muted note with the middle finger on the higher string. | — |

### 1.4 Apps

| App | How it grades guitar |
|---|---|
| **Yousician** [V] | Microphone. Hitting notes in time builds a multiplier up to 5×. Feedback labels: perfect / great / good / a bit early / a bit late. Millisecond windows are not published [?]. |
| **Rocksmith+** [V] | Note detection said to match a strobe tuner. **Mastery = difficulty × accuracy** (e.g. 50 % × 90 % = 45). Adaptive difficulty raises note density as you improve and can be turned off. |
| **Fender Tune / Fender Play** [M] | Tuner plus self-assessment; no per-note grading of exercises [?]. |
| **Guitar Pro 8** [V] | Progressive Speed: start and end speed (10–300 %), repetitions and increment. That is the "tempo ladder" without grading. |
| **Melodics** [V] | MIDI pads, keys and drums only; no guitar found. |

**Count:** 9 boards/programs + 4 classical method books + 21 online methods/artists/styles + 5 apps = **39 curricula
compared** (30 with a verified source, the rest [M]).

---

## 2. The union of exercise types

Every family below is taught by at least two of the curricula above. Its source column feeds the spec's §4.

| Family | Exercise types | Taught by |
|---|---|---|
| **Fretting hand** | chromatic 1-2-3-4 and its 24 permutations; "spider" two-string crossing; diagonal walk up the neck; stretches (1-3-5-6); held-finger independence | Petrucci, MI Technique, JustinGuitar, Paul Davids, Leavitt (positions) |
| **Picking** | alternate picking on one string; string changes (inside/outside); 3-notes-per-string runs; economy picking; string skipping; tremolo picking; sweep (3- and 5-string); hybrid and chicken picking; crosspicking | Troy Grady, Petrucci, Gilbert, Andy Wood, MI |
| **Legato** | hammer-on / pull-off pairs (all 6 finger pairs); trills; pentatonic legato; 3NPS legato; tapping | Quayle, Petrucci, Carcassi (slurs), Pumping Nylon (slurs), Satriani/Van Halen [M] |
| **Scales** | minor pentatonic boxes 1–5; blues scale; major pentatonic; CAGED (5 positions); 3NPS (7 patterns); modes in position; harmonic / melodic minor; one-string scales; sequences (3rds, groups of 4) | RGT, RSL, ABRSM, LCM, Berklee Online, Segovia, Leavitt, Goodrick |
| **Arpeggios** | triads root 6 / root 5; CAGED triad shapes; triad inversions on string sets; 7th arpeggios; diminished; ii–V–I arpeggios | RGT (G3+), RSL, ABRSM, LCM, Jens Larsen |
| **Chords** | open chords (string-by-string check); one-minute changes; power chords; barre chords (E- and A-shape); triad inversions on top strings; 7th chords; CAGED chords up the neck | JustinGuitar, Fender Play, Guitar Tricks, RGT, RSL G5 |
| **Rhythm guitar** | quarters, down-up 8ths, Old Faithful; palm-muted 8ths; blues shuffle; country boom-chick; reggae skank; ska; 16th funk with ghosts; bossa nova; Freddie Green; metal gallop | JustinGuitar, RGT rhythm test, Trinity Rock & Pop, Nile Rodgers, Galbraith |
| **Lead** | slides; natural harmonics; half / whole / 1½ bends to pitch; bend and release; pre-bend; vibrato (narrow / wide); double stops (3rds, 6ths); B.B. King box | RGT lead, RSL, Trinity Rock & Pop focus, B.B. King, Paul Davids |
| **Fingerstyle** | alternating thumb; PIMA patterns; Giuliani patterns; Travis picking; rest / free stroke scales; tremolo p-a-m-i | Giuliani Op. 1, ABRSM, LCM, Pumping Nylon, Segovia, Travis / Emmanuel |
| **Flamenco** | rasgueado (4-stroke, triplet); picado; alzapúa; compás | flamenco pedagogy (2 sources) |
| **Jazz** | shells (6-4-3 / 5-4-3); drop-2 inversions; drop-3; ii–V–I voice-led; guide-tone lines; walking bass on guitar; harmonised scale / chord melody | Galbraith, Freddie Green, Joe Pass, Jens Larsen, Berklee |
| **Reading** | position I → II → V → VII → IX → XII reading; mixed rhythms | Leavitt, RSL sight reading, ABRSM, MI Reading |
| **Improvisation** | target notes (roots, 3rds) through a 12-bar blues; chord-tone arpeggios through the form; guide tones | RGT lead improvisation, RSL, Berklee |
| **Bass** | chromatic 1-2-3-4; one-finger-per-fret major scale; root–5th–octave; arpeggios; octaves (disco/funk); walking ii–V–I | RSL/RGT bass syllabi [M], Berklee bass [M] |

---

## 3. Tempo landmarks

The app keeps the piano's bands: **T1** 2.0–2.7 nps · **T2** 2.7–3.5 · **T3** 3.5–4.5 · **T4** 4.5–5.5 · **T5**
5.5–6.5 · **T6** 6.5–8 · **T7** > 8.

| Landmark | Tempo | nps | Band |
|---|---|---|---|
| RSL Debut scales | ♩ = 70, 8ths [V] | 2.3 | T1 |
| RSL Grade 5 scales | ♩ = 80, 8ths [V] | 2.7 | T1/T2 |
| RGT acoustic G5 scales (secondary) | ♩ ≈ 116, 8ths | 3.9 | T3 |
| ABRSM G5 scales | ♩ = 96 (value [?]) | 3.2 if 8ths | T2 |
| ABRSM G8 2-octave scales | ♩ = 144 (value [?]) | 4.8 if 8ths | T4 |
| LCM classical G8 scales | ♩ = 108 [V] (value [?]) | 3.6 if 8ths | T3 |
| ABRSM older all-instrument G8 | 288 notes / min [V] | 4.8 | T4 |
| Typical "shred" target, 16ths at ♩ = 160 [M] | 10.7 | T7 |
| One-minute changes | 30 → 60 changes / min [V] | 0.5 → 1 change/s | (own scale) |

Chord-change drills are measured in **changes per minute** and **gap at the change**, not notes per second.

---

## 4. What the microphone can measure

| Measurement | Reliability (phone / laptop mic) | Method | Evidence |
|---|---|---|---|
| Single-note pitch | **Good** in a quiet room | YIN / pYIN f0 | research doc §4.2 |
| Onset timing (picked notes) | **Good**: spectral flux scored F = 96 %, right-hand attacks 99.6 % recall (±50 ms, hexaphonic pickup) | energy / spectral-flux onsets | Reboursière et al., NIME 2012 [V] |
| Onsets of hammer-ons / pull-offs | **Fair**: recall 97.9 % hammer-on, 88 % pull-off (same study). From a mic, a pitch-change detector helps. | pitch-change onset | NIME 2012 [V] |
| Evenness (IOI CV), tempo | **Good** for picked notes | from onsets | — |
| Bend intonation (cents) | **Good**: continuous f0. No bend-accuracy study found; ±10 cents is "practically in tune", fretting errors run 14–64 cents uncompensated | f0 trace | arXiv 1105.4570, 0906.0127 [V] |
| Vibrato rate / width | **Good**. String instruments: 4–10 Hz, typically 5–7; width 20–35 cents (string players), range 10–60. Detection rule: 2–10 Hz, extent > 0.1 semitone | f0 trace, extrema | MMM 2003, BYU, SAGE [V] |
| Slides | **Good** as a glide in the f0 trace (and arrival onset) | f0 trace | [M] |
| Harmonics | **Good** (near-sinusoidal) | f0 | NIME 2012: 100 % onset recall [V] |
| Legato volume (hammer/pull vs picked) | **Fair** (relative RMS within one take) | RMS at onset | [M] |
| Palm mute | **Fair**: attack-envelope slope above 500 Hz gave 87.5–100 % per string (pickup audio) | decay time + centroid | NIME 2012 [V] |
| Chord-change gap (silence) | **Fair**: RMS drop between strums | RMS | [M] |
| Strum timing (8ths / 16ths) | **Good** for the strum onset; the spread of string onsets inside a strum is **fair** | onset clustering | [M] |
| Chord correctness (polyphonic) | **Partial**: checking the *expected* chord by chroma works; open transcription does not. Basic Pitch on GuitarSet: note F = 0.79; TabCNN multipitch F1 0.83 on acoustic, **0.64 on unseen electric** | chroma template / neural | arXiv 2203.09893, 2405.14679 [V] |
| Which string / fret / fingering | **Not reliable** (TabCNN tab F1 0.45 on electric) | — | arXiv 2405.14679 [V] |
| Strum direction (down / up) | **Poor from a phone mic**: possible with low→high vs high→low spectrogram ordering or a CRNN on pickup audio (97.6 % precision), but strings nearly coincide | — | ISMIR 2014, arXiv 2508.07973 [V] |
| Pick direction (alternate vs economy), escape motion | **Not measurable** from audio | — | — |
| Muting of unused strings, string noise | **Poor** (string noise is broadband and quiet) | — | [M] |
| Rest vs free stroke | **Not measurable** reliably (small timbre difference) | — | [M] |

**Honest rule for the app:** grade only pitch, onset timing, evenness, bends, vibrato, slides and harmonics.
Show legato volume, palm mute and change gaps as **"heard"** measures (lower confidence, but they can still lower
a verdict). Never grade pick direction, fingering, string choice, muting or rest/free stroke: those become
**self-check boxes**.

---

## 5. How apps grade guitar (lessons for us)

- **Yousician**: per-note hit windows plus a multiplier (streak) [V]. → We use the same idea in "clean takes in a row".
- **Rocksmith+**: mastery = difficulty × accuracy, adaptive density [V]. → Our rating event (difficulty = tempo band;
  score = accuracy × evenness) is the same shape.
- **Guitar Pro**: progressive speed with an increment [V]. → Our tempo ladder, with grading.
- Nobody publishes onset windows. We keep ±½ beat matching windows and judge timing by SD (piano §6).

---

## 6. Conclusions for the app

1. **Same engine as piano.** A guitar drill is a list of expected notes with string / fret / technique. Analysis
   = the piano alignment + a guitar pre-pass (octave folding, glide removal, strum clustering) + guitar measures
   (bends, vibrato, legato volume, mute, gaps).
2. **Pitches are sounding pitches** (what the mic hears). Notation shows them an octave up (treble-8vb clef).
3. **Onsets need an energy detector.** The current mic path emits a note only when the pitch changes, so
   repeated notes (tremolo, repeated strums, palm-muted chugs) are invisible to it. The drill screen must feed
   `detectOnsets(frames)` events.
4. **Families by genre**, like the piano emphasis: rock, blues, metal, pop, funk, country, jazz, classical,
   fingerstyle, flamenco, reggae, latin.
5. **Keys and positions.** Movable shapes run through all 12 keys (guitar-friendly order: G, D, A, E, C, F …,
   or the player's order). Position-bound drills move along the neck (fret 5 → 3 → 1).

---

## 7. Sources

Exam boards and programs
1. ABRSM Guitar syllabus 2019: https://www.newschool.ie/wp-content/uploads/2019/09/complete_guitar_syllabus.pdf
2. ABRSM speeds over the years: https://www.derek-hasted.co.uk/faqs/fast
3. LCM classical guitar technical requirements: https://lcme.uwl.ac.uk/media/2hadb20m/technical-requirements-and-discussion-questions-classical-guitar.pdf
4. Trinity classical guitar: https://sogwww.trinitycollege.co.uk/qualifications/music/grade-exams/classical-guitar/exams-at-a-glance
5. Trinity technical work Gr 4–5: https://resources.trinitycollege.com/classical-guitar/tech/grade4-5
6. RGT electric guitar: https://rgt.org/exams/electric-guitar.php
7. LCM/RGT electric technical requirements: https://lcme.uwl.ac.uk/media/bcledr1w/technical-requirements-and-spoken-test-questions-electric-guitar.pdf
8. RGT acoustic G2 (secondary copy): https://www.scribd.com/document/668378143/Rgt-Acoustic-Guitar-Grade-2
9. RSL electric guitar Grade 5: https://www.rslawards.com/tabbed-content/electric-guitar-grade-five/
10. Rockschool G8 technical exercises (tutor): https://www.musicgurus.com/courses/rockschool-guitar-online-video-tutorial-grade-8/lessons/how-to-play-rockschool-technical-exercises-group-a-guitar-grade-8
11. Trinity Rock & Pop guitar: https://trinityrock.trinitycollege.com/instruments/guitar/grade3
12. Leavitt, A Modern Method for Guitar: https://www.halleonard.com/product/50449404/a-modern-method-for-guitar-volume-1
13. Berklee Online Guitar Scales 101: https://online.berklee.edu/courses/guitar-scales-101
14. Musicians Institute guitar: https://www.mi.edu/guitar/

Classical
15. Carcassi Op. 60: https://en.wikipedia.org/wiki/25_Studies_for_guitar_(Carcassi)
16. Carcassi études overview: https://www.classicalguitarcorner.com/carcassis-25-etudes-for-classical-guitar/
17. Giuliani 120: https://thisisclassicalguitar.com/giuliani-120-arpeggio-studies-op-1
18. Segovia scales (Niedt): https://douglasniedt.com/scales.html
19. Pumping Nylon: https://www.alfred.com/products/pumping-nylon-complete-second-edition-00-45924

Online methods and styles
20. JustinGuitar beginner course: https://justinguitar.com/begin
21. JustinGuitar one-minute changes: https://justinguitar.com/guitar-lessons/stage-1-one-minute-changes-bc-115
22. Old Faithful strum (community): https://community.justinguitar.com/t/old-faithful-strumming-pattern/357593
23. Fender Play structure: https://lausd-instructor.fender.com/hc/en-us/articles/360043858892
24. Guitar Tricks Core Learning System: https://img2.guitartricks.com/core-learning-system
25. TrueFire learning paths: https://help.truefire.com/hc/en-us/articles/227260068-What-are-Learning-Paths
26. Troy Grady, escape motion: https://troygrady.com/?p=133543
27. Paul Gilbert "Colorado Bulldog": https://www.pressreader.com/australia/guitar-techniques/20210113/281565178389930
28. Petrucci practice split: https://www.premierguitar.com/lessons/shred-guitar-lesson-petrucci
29. Legato for beginners (Quayle course): https://www.licklibrary.com/learn/courses/legato-techniques-for-absolute-beginners
30. Legato evolution (Howe): https://www.guitarworld.com/lessons/legato-evolution-lesson
31. Jens Larsen arpeggios: https://medium.com/@jenslarsen/three-ways-to-add-arpeggios-to-your-jazz-guitar-licks-3b567af41b87
32. Goodrick discussion: https://www.jazzguitar.be/forum/improvisation/36252-mick-goodrick-advice-opinions-please.html
33. Joe Pass Guitar Style: https://www.melbay.com/Products/94106/joe-pass-guitar-style.aspx
34. Galbraith / Freddie Green: https://freddiegreen.org/technique/caruso_galbraith.html
35. Berens on Freddie Green: https://www.freddiegreen.org/technique/berens.html
36. B.B. King box: https://www.guitarworld.com/lessons/bb-king-lesson-soloing-movable-bb-box
37. Chet Atkins fingerpicking: https://www.guitarworld.com/acoustic-nation/how-to-fingerpick-like-chet-atkins
38. Tommy Emmanuel guide: https://guitarworld.com/magazine/tommy-emmanuels-guide
39. Flamenco techniques: https://blog.guitarfromspain.com/2025/05/01/traditional-spanish-techniques-every-guitarist-should-know
40. Nile Rodgers via Cory Wong: https://www.guitarworld.com/lessons/artist-lessons/cory-wong-on-what-he-learned-from-nile-rodgers
41. Hybrid / chicken picking: https://en.wikipedia.org/wiki/Hybrid_picking

Apps
42. Yousician practice vs play: https://support.yousician.com/hc/en-us/articles/201558362-Practice-vs-Play-mode-Guitar-
43. Yousician review: https://beginnerguitarhq.com/yousician-guitar-review
44. Rocksmith+ dev diary: https://www.ubisoft.com/en-us/game/rocksmith/plus/news-updates/2rN7QW1RC4E4NsipNX1cz7/rocksmith-dev-diary-september-2021
45. Melodics instruments: https://support.melodics.com/en/articles/6782810-supported-instruments
46. Guitar Pro progressive speed: https://www.guitar-pro.com/docs/gp8/audio/playback/speed

Audio measurement
47. Guitar onsets and palm mute (NIME 2012): https://zenodo.org/records/1180575/files/nime2012_213.pdf
48. Onset tolerance critique: https://lirias.kuleuven.be/bitstream/123456789/657739/3/waspaa2019_mina_preprint.pdf
49. Vibrato in singing/strings (MMM 2003): https://www.mcg.uva.nl/mmm-2003/papers/mmm-35/mmm-35.html
50. Vibrato rate (MCG 2023): https://mcg.uva.nl/mcg-2023/papers/dhat-2/dhat-2.html
51. Vibrato width (BYU): https://physics.byu.edu/docs/publication/1499
52. In-tune threshold: https://arxiv.org/pdf/1105.4570
53. Fretting intonation: https://arxiv.org/pdf/0906.0127
54. Strum direction (ISMIR 2014): https://archives.ismir.net/ismir2014/paper/000130.pdf
55. Strum direction CRNN: https://arxiv.org/abs/2508.07973v1
56. Strum + accelerometer (KIT): https://publikationen.bibliothek.kit.edu/1000183784
57. Basic Pitch: https://arxiv.org/pdf/2203.09893
58. TabCNN on electric guitar: https://arxiv.org/pdf/2405.14679
59. Guitar-TECHS dataset: https://arxiv.org/pdf/2501.03720

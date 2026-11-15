# AUDIT-5: ear training, musicianship and theory, checked against outside syllabi (2026-11-15)

Read-only audit of `redesign-v2`. Earlier audits (EAR_THEORY_AUDIT, AUDIT-CONTENT-THEORY, AUDIT-GAPS-2, AUDIT-DEPTH-3) checked the app against its own lists. This audit works the other way: it builds a master checklist from recognized outside syllabi first, then looks for every item in the app.

**How the inventory was built.** A temporary vitest script (since deleted) loaded `src/engine/topics.ts`, `topicsAdvGames.ts` and `topicsTopTiers.ts`. It listed all 183 `TOPIC_GEN` topics with their levels, item kind (choice / place / grid / rhythm-read / rhythm-dict / sing / sing-seq) and difficulty, using 12 seeds per level. I then read these by hand:
- the generators where a title was ambiguous;
- the hand-made lessons (`LessonId`, `src/engine/lesson.ts:678`);
- the vocal families (`src/engine/voiceFamilies.ts:486-508`, `src/engine/vocal.ts`);
- the game tiers (`src/engine/gameTiers.ts`);
- the Bagrut research (`docs/research/BAGRUT_AND_CONSERVATORY.md`, `src/content/bagrut.ts`).

**How answer modes and partial credit work today:**
- A **choice** item is answered by tapping or by voice (`names[].say`). On guitar, bass or MIDI it can also be answered by strumming or playing, but only when `strum` is set (`lesson.ts:435`; `ui/Lesson.tsx:644-650`).
- A **place** item is answered on the staff, keys or neck, or by playing on MIDI (`ui/Instrument.tsx:35`). It gets partial credit (`gradePlace`, `lesson.ts:328`).
- A **grid** item gets partial credit per slot: root 0.5, quality 0.3, bass or colour 0.2 (`lesson.ts:288`, `progGrid.ts`).
- Choice items never get partial credit. This matters for multi-chord choice items such as `harmonic-dictation` 1–6 (`topicsAD.ts:955`), `jazz-dictation` and `chorale-rn`.

Status legend:
- **EXISTS-DEEP**: meets most of criteria (a)–(f) (ladder; contexts, registers and keys; answer modes; partial credit; applied in music; connected to performance).
- **SHALLOW**: exists, but fails several criteria.
- **MISSING**: no exercise.
- **APP-WRONG**: the content teaches something incorrect or against the app's own rules.

---

## 1. Master checklist and sources

| Code | Source | What it contributes |
|---|---|---|
| ABRSM-A | ABRSM aural tests G1–8 (guides: [e-musicmaestro overview](https://www.e-musicmaestro.com/auraltests/guides/overview), [G8 guide](https://www.e-musicmaestro.com/auraltests/guides/abrsm-grade-8-guide), [G5](https://e-musicmaestro.com/auraltests/guides/abrsm-grade-5-guide), [G7](https://e-musicmaestro.com/auraltests/guides/abrsm-grade-7-guide)) | Pulse and meter; echo-singing (G1–3); spotting a pitch or rhythm change against the score; sight-singing (G4–5); cadences; the lowest part of a three-part phrase (8A); the cadence plus its last three chords; two-part sight-singing, singing the lower part (8B); modulation to dominant, subdominant or relative (8C); describing features: texture, tonality, dynamics, articulation, style and period (8D) |
| ABRSM-T | ABRSM theory G1–8 (syllabus; general knowledge) | Rudiments, clefs incl. C clefs, transposing instruments, ornaments, terms (G1–5); **instruments and ranges, score reading** (G5); figured bass, chorale and keyboard style, **melody writing** (G6); Baroque continuo and trio sonata, Classical and Romantic keyboard textures, **score analysis** (G7–8) |
| RCM | RCM Theory Syllabus 2016 ([highlights](https://admin.rcmusic.com/sites/default/files/files/RCM-Theory-Syllabus-2016-Highlights.pdf), [Level 9 Harmony sample](https://files.rcmusic.com/sites/default/files/files/tcert/Level9Harmony.pdf)) | Rudiments → Level 9 Harmony → Level 10 Harmony & Counterpoint → ARCT Analysis. Includes invention and fugue analysis (subject, countersubject), sonata form, history |
| BKL | Berklee ET 1–4 ([ET1](https://college.berklee.edu/node/2270561), [ET Core](https://college.berklee.edu/node/2464596), [Online ET2](https://online.berklee.edu/courses/ear-training-2)) and Harmony 1–4 / Theory 101–301 | **Movable-do** sight-singing; dictation of melody and rhythm; major → minor → chromatic → modal; odd meters (5/4, 7/8); diatonic → secondary → modal-interchange harmony; jazz chord-scales |
| KOD/DAL | Kodály and Dalcroze ([Kodály method](https://en.wikipedia.org/wiki/Kod%C3%A1ly_method), [Dalcroze intro](https://interlude.hk/introduction-to-eurhythmics/)) | Movable do with **Curwen hand signs**; **rhythm syllables**; inner hearing; folk-song-based literacy. Dalcroze: eurhythmics (movement and conducting), fixed-do solfège, improvisation |
| KAR | Karpinski, *Manual for Ear Training and Sight Singing* ([Norton](https://wwnorton.co.uk/books/9780393614251-manual-for-ear-training-and-sight-singing-6bffa374-5844-4964-b0f8-61b5c82239ac/features)) and Ottman, *Music for Sight Singing* | Protonotation; scale-degree function; metric levels; **error detection**; two-voice rhythm; diatonic → chromatic → modulation → form |
| KP/AS | Kostka–Payne, *Tonal Harmony* ([TOC](https://highered.mheducation.com/sites/0078025141/information_center_view0/table_of_contents.html)) and Aldwell–Schachter | Voice leading; cadences, phrases, **periods**; NCTs I–II; **sequences**; secondary functions; modulation; binary and ternary; **mode mixture**; **Neapolitan**; **augmented sixths (It/Fr/Ger)**; **enharmonic modulation** (Ger⁶ ↔ V⁷, °7); 20th century |
| AP | AP Music Theory CED ([course page](https://apcentral.collegeboard.org/courses/ap-music-theory); exam format via [Wikipedia](https://en.wikipedia.org/wiki/AP_Music_Theory)) | Eight units: fundamentals → harmony and voice leading I–IV (function, cadence, phrase, predominants, embellishments and **motives**, secondary function) → modes and form. Free response: 2 melodic and 2 harmonic dictations (**soprano + bass + RN**), part-writing from figured bass and from RN, **melody harmonization**, 2 sight-singings |
| BAG | Israeli Bagrut 5 units (תשפ"ו circular, תשפ"ז changes) and conservatories (JAMD, TAU, BIU, Rimon). Already researched in `docs/research/BAGRUT_AND_CONSERVATORY.md` | Meter ID, rhythmic and melodic dictation, root-position triads, short diatonic progression, chorale analysis, **period / composer / genre / ensemble by listening**, analysis per track, maqam / jins / iqa', two-voice and chromatic dictation, sight-singing with modulation |
| JAZZ | Berklee jazz ET; Open Studio ear training ([5-Minute Ear Training](https://openstudiojazz.com/?p=522450)); Bruce Arnold *Ear Training One Note* ([guided tour](https://brucearnold.com/ear-training-guided-tour/)) | One note against a key centre (Arnold); 2- and 3-note melodies; cadences with triads and sevenths incl. inversions (Open Studio); extensions and alterations; ii–V and turnarounds; **tune recognition**; **transcription** |
| POP | Hooktheory I–II ([Book I](https://www.hooktheory.com/books/one), [Book II review](https://www.musical-u.com/learn/review-hooktheory-book-ii-next-level-chords-melodies/)) | Roman numerals relative to the key; I–IV–V function by ear; melody degree against the chord; sevenths, embellishments, secondary chords, minor and modes in pop |

The master checklist itself is section 2, grouped Pitch / Dictation / Sight-singing / Harmonic hearing / Analysis / Rhythm / Other / Jazz / Pop. Each row cites the sources that require the item.

---

## 2. Item by item: status and evidence

Topic references are `topic L` (level). File:line points to the generator's registration.

### 2.1 Pitch

| # | Item (sources) | Status | Evidence and gaps |
|---|---|---|---|
| P1 | Higher/lower, same/different, contour (ABRSM-A G1–3, KAR protonotation) | EXISTS-DEEP | `basics-highlow` / `basics-samediff` / `basics-contour` (700–1060). `fine-pitch` 1–3 down to 10¢ (`topicsEar.ts:12`). Games: Peak Hunter, Pitch Memory |
| P2 | Melodic intervals, up and down (all) | EXISTS-DEEP | `intervals` lesson. `intervals-all` 1–4 (`topicsSkills.ts:98`). `sing-intervals` 1–4 (sing; `topicsPitch2.ts:619`). `fret-intervals`, `bass-intervals`, `key-notes` 4 (place / play). `interval-cells` (`topicsTopTiers.ts:52`). Games: Interval Sprint, Sing Interval. Gap: no "interval in a song you know" step (e). |
| P3 | Harmonic intervals (ABRSM-T, BAG, KAR) | EXISTS-DEEP | `intervals-all` 3, `compound-intervals` 3, `harmony-hold` (sing against a held note, `vocal.ts:922`) |
| P4 | Compound intervals (BAG/BIU to the 10th, TAU) | SHALLOW | `compound-intervals` 1–3 (`topicsAD.ts:228`) is choice only and stops at the 12th. There is no 13th, no singing or placing, no partial credit, and no use in a voicing or bass–melody context. |
| P5 | Scale degrees in context, functional hearing (KAR, BKL, Arnold) | EXISTS-DEEP | Lessons `degrees-135`, `notes-degrees`, `sing-degrees`. `degrees-ext` 1–4 (minor, chromatic, modal; `topicsSkills.ts:139`). `find-tonic` 1–3. `ct-degree` 1–6 (`topicsReharmColor.ts:81`). Arnold-style "one note over a cadence" is covered by `degrees-ext` and the cadence stimulus. |
| P6 | Triad qualities (all) | EXISTS-DEEP | `triads` 1–5 (`topicsHarmony2.ts:290`), `chord-read` 1–7, `key-shapes` (place), `fret-chords`, `song-strum` (strum answer), Chord Rush |
| P7 | Seventh-chord qualities (all 7 types: TAU, JAMD) | EXISTS-DEEP | `seventh-chords` 1–5 (`topicsHarmony2.ts:357`), `chord-spelling` 2, `key-shapes` 4 |
| P8 | Inversions of triads and sevenths by ear (ABRSM-A 8A, BAG, Open Studio) | EXISTS-DEEP | `triads` 4, `seventh-chords` 4–5, `voicings` 2, `chorale-rn` 3–4 (figures by ear), `inversions` lesson |
| P9 | Cadences PAC/IAC/half/plagal/deceptive (all) | EXISTS-DEEP | `cadence-types` 1–5 (`topicsAD.ts:111`), `where-home` 1–4, `modal-cadence` 1–3, `roman-numerals` 4 (in the score). Gap: no PAC vs IAC distinction. |
| P10 | Scales: major, three minors, pentatonic, blues, whole-tone, octatonic, bebop (all) | EXISTS-DEEP | `scale-types` 1–5 (`topicsAD.ts:260`), `scale-spelling` 1–5 (place), `key-scales` / `fret-scales` (play), v-scale (sing), Scale & Mode Rush |
| P11 | Modes by ear (BKL, AP unit 8, BAG jazz) | EXISTS-DEEP | `modes-ear` 1–5 (`topicsJazzEar.ts:379`), `mm-modes`, `modal-cadence` 2–3 (vamps), `degrees-ext` 3, v-scale MODE_LEVELS (sing) |
| P12 | Major/minor, tonic finding (ABRSM-A, BAG) | EXISTS-DEEP | `major-minor` lesson, `find-tonic` 1–3 (`topicsAD.ts:72`), `figure-out` 1 |

### 2.2 Dictation

| # | Item | Status | Evidence and gaps |
|---|---|---|---|
| D1 | Melodic dictation (all) | EXISTS-DEEP | `staff-dictation` 1–10: step → chromatic, bass clef, 6/8 with pick-up, modulating to V (`topicsWritten.ts:310`). Place with partial credit. `figure-out` 4. `jazz-phrase` 6–7 |
| D2 | Rhythmic dictation (all; Bagrut track core) | EXISTS-DEEP | `rhythm-build` R1–R8 (`topicsWritten.ts:355`), `rhythm-r1…r8` lessons, `syncopation` 1–4 |
| D3 | Harmonic dictation in Roman numerals (AP, BAG, JAMD, TAU) | EXISTS-DEEP | `grid-dictation` 1–8 with per-slot partial credit (`topicsGrid.ts:7`). `harmonic-dictation` 1–6 (`topicsAD.ts:955`): whole progression as one choice, no partial credit. `chorale-rn` 1–5 (`topicsGaps.ts:130`) |
| D4 | Outer voices + RN together (AP FRQ 3–4) | SHALLOW | Only `bass-dictation` 4 "Soprano, bass and numerals" (`topicsWritten.ts:699`), one level at 1500. There is no AP-style item that writes the soprano and the bass and labels the RN over 7–9 chords in minor, with secondary functions. |
| D5 | Two-part dictation (JAMD, TAU) | EXISTS-DEEP | `two-part` 1–6 (place, imitation, minor with suspensions; `topicsWritten.ts:458`), `two-voice` 1–3 (ear; `topicsEar.ts:94`) |
| D6 | Three- and four-part dictation: chorale, "lowest of three parts" (ABRSM 8A, TAU) | MISSING | No three-voice texture is dictated. `chorale-rn` asks for RN only, `bass-dictation` for bass only. v-harmony 1703 has the singer sing a middle part, but that is singing, not dictation. |
| D7 | Two-voice rhythmic dictation / rhythm in two hands (KAR, Dalcroze) | MISSING | `poly-tap` 1–7 and `hemiola-tap` are tapping. `polyrhythm` 1–4 names the ratio. Nothing writes two rhythmic lines. |
| D8 | Error detection: heard vs written (ABRSM-A G4–5, KAR) | SHALLOW | Pitch: `sight-read` 2 and 6 (`topicsSkills.ts:192`). Rhythm: `rhythm-errors` 1–3 (`topicsTime2.ts:333`). The `wrong-notes` lesson. Missing: errors in **harmony or bass** against a score, errors in two voices, and the "which bar" format in a 4–8-bar score. |
| D9 | Sing or play back from memory (ABRSM-A G1–3, TAU oral) | EXISTS-DEEP | `play-back` 1–7 (instrument, sing-seq; `topicsInstrument.ts:130`), v-ear and song-echo levels (`voiceFamilies.ts:495`), `call-response`, games Melody Echo and Riff Echo |

### 2.3 Sight-singing and solfège

| # | Item | Status | Evidence and gaps |
|---|---|---|---|
| S1 | Diatonic sight-singing, major → minor (ABRSM-A G4–5, BKL, AP, Ottman) | SHALLOW (and see APP-WRONG W3) | v-sight `SIGHT_LEVELS` (`vocal.ts:1104-1110`) builds every level from **three fixed seeds** (11/12/13, 21/22/23 …), so there are only 15 melodies, plus the same ones in bass clef at 1901. The range is one octave above the tonic, there is no compound meter, and minor uses harmonic minor only. The generated paths are shallow too: `sight-tap` 1–3 tops out at eighths (`topicsTime2.ts:473`), and `READ_LEVELS` are fixed songs. |
| S2 | **Movable-do** syllables, Kodály hand signs (BKL, KOD, AP) | MISSING | `Naming = 'letter' \| 'solfege'` is fixed-do (`pitch.ts:4`). Movable do appears only in the glossary and lesson text (`content/glossary.ts:110`, `content/mini/voice.ts:648`). There are no hand signs. Numbers (`sing-degrees`) cover the function. AUDIT-GAPS-2 #31 is still open. |
| S3 | Scale degrees sung as numbers or names (KAR, Israel fixed-name practice) | EXISTS-DEEP | `sing-degrees`, `sing-names` lessons. `sing-intervals` 4 (in key, from a non-tonic note). Drone degree tracking (`drone.ts:29`) |
| S4 | Chromatic and modulating sight-singing (TAU, JAMD, BKL ET4) | EXISTS-DEEP | `sight-modulate` 1–5 (generated, 1450–1860; `topicsGaps.ts:38`), v-sight 1902 (chromatic neighbours) |
| S5 | Sight-singing with rhythm: sing and tap or conduct (KAR, Dalcroze, AP) | SHALLOW | `sight-tap` 1–3 only (quarters, halves, eighths). No dotted rhythms, compound meter, syncopation or triplets while singing. |
| S6 | Two-part sight-singing: sing one part from the score while the app plays the other (ABRSM 8B, TAU) | SHALLOW | v-harmony 1–8 (`vocal.ts:922`, `voiceFamilies.ts:285`) sings a harmony part by ear against a played melody (3rds or 6ths, backing pad, guide tones, middle of three). None of it is read from notation. |
| S7 | Sing chord arpeggios and the roots of a heard progression (AP, college, Arnold) | EXISTS-DEEP | `sing-intervals` 5–6, ARPEGGIO_LEVELS 2001, scat 'guide' / 'landing' modes, Harmony Hold game |
| S8 | Sing scales and modes, naming the notes (TAU oral) | EXISTS-DEEP | v-scale MODE_LEVELS (`vocal.ts:851`: harmonic and melodic minor, locrian, phrygian dominant), `sing-names` |

### 2.4 Harmonic hearing

| # | Item | Status | Evidence and gaps |
|---|---|---|---|
| H1 | Function T / PD / D (AP unit 4, Hooktheory, KP) | EXISTS-DEEP (see W1) | `function-ear` 1–3 (`topicsHarmony3.ts:100`), `where-home`, `next-chord`, `func-color` |
| H2 | Diatonic progressions by ear (all) | EXISTS-DEEP | `progressions` 1, `grid-dictation` 1–2, `harmonic-dictation` 1–2, `next-chord` 1, `song-strum`, `harmonize` 1–2, Progression Rush |
| H3 | Secondary dominants (AP unit 7, KP, BKL) | EXISTS-DEEP | `harmonic-dictation` 3/6, `grid-dictation` 3, `harmonize` 3, `roman-numerals` 3, `turnarounds` 2, `reharm-spot` 1 |
| H4 | Secondary leading-tone chords (vii°/x) by ear (KP, AP) | SHALLOW | On paper: `chromatic-theory` 4 (`topicsWritten.ts:1052`). By ear: only as a passing ♯i°7 (`chromatic-harmony` 5, `reharm-spot` 3, `bh-dim-roles`). There is no "vii°7/V vs V/V" item and no vii°/x in dictation. |
| H5 | Modulation to closely related keys (ABRSM 8C, KP, BAG) | EXISTS-DEEP | `modulation` 1–5 (`topicsAD.ts:143`), `staff-dictation` 9, `sight-modulate` |
| H6 | How it modulates, and distant keys (KP, jazz) | EXISTS-DEEP | `modulation-means` 1–5, `key-centres` 1–3 (`topicsKeyMoves.ts:64,129`), `bh-keys` 1–4 |
| H7 | **Enharmonic modulation** (Ger⁶ ↔ V⁷, °7 reinterpreted) (KP ch. 23/25, RCM 10) | MISSING | No hits for "enharmonic modulation / reinterpret". The common-dim pivot in `modulation-means` 3 and `bh-keys` is the jazz cousin, but the classical Ger⁶↔V⁷ pivot is absent. |
| H8 | Non-chord tones (AP unit 6, KP NCT I–II, BAG classical) | SHALLOW | `nct-ear` 1–3 (`topicsAD.ts:291-301`) covers passing, neighbour, suspension and appoggiatura only. Missing: escape tone, anticipation, retardation, pedal, chromatic NCTs, and suspension types (4–3, 7–6, 9–8, 2–3 in the bass). It is choice only and never written into a dictation. |
| H9 | Modal mixture (KP ch. 21, BKL, Hooktheory II) | EXISTS-DEEP | `modal-mix` 1–5 (`topicsReharmColor.ts:531`), `borrowed-ext`, `chromatic-harmony` 6, `jazz-changes` 4, `harmonic-dictation` 6 |
| H10 | Six-four types: cadential, passing, pedal, arpeggiated (KP, AP) | SHALLOW | Cadential 6/4 only: `chromatic-harmony` 1 (`topicsHarmony2.ts:415`), `chromatic-theory` 1, `chorale-rn` 4. No passing or pedal 6/4. |
| H11 | Pedal point (KP, jazz) | SHALLOW | `pedal-ear` 1–3 (`topicsReharmColor.ts:282`), ear choice only, one key context. No dictation or performance. |
| H12 | **Harmonic sequences**: descending fifths, descending 5–6 (Pachelbel), ascending 5–6, descending thirds (KP, AS, AP unit 6, RCM 9) | MISSING | No harmonic-sequence topic. A circle-of-fifths sequence exists only as the synthesized "Baroque" style texture (`form.ts:310`). Jazz cousins exist: dominant cycle and ii–V chains (`jazz-changes` 5, `jazz-chains` 2). `melodic-transform` 1 is melodic sequences only. |
| H13 | Harmonic rhythm (AP unit 4/8) | MISSING | 0 hits. |
| H14 | Chromatic mediants / neo-Riemannian (KP late 19th c.) | EXISTS-DEEP | `mediants` 1–5 incl. P/L/R (`topicsReharmColor.ts:183`) |

### 2.5 Analysis and written theory

| # | Item | Status | Evidence and gaps |
|---|---|---|---|
| A1 | Neapolitan (KP, AS, RCM 9, ABRSM-T 6–8) | SHALLOW | By ear: `chromatic-harmony` 2 "N, iv or ii° in minor". On paper: `chromatic-theory` 2 (spell it). Missing: N⁶ → V (and → cad 6/4) in harmonic dictation and grid, the N in major, and voice-leading it (♭2 down to the leading note). |
| A2 | Augmented sixths It / Fr / Ger (KP ch. 22, AS, RCM 9–10) | SHALLOW | Types are on paper only: `chromatic-theory` 3. By ear, the French sixth is the only one, against V/V (`topicsHarmony2.ts:433-439`; the German sixth was dropped over parallel fifths, which a Ger⁶ → cad 6/4 → V would avoid). No It/Fr/Ger by ear and none in dictation. |
| A3 | Phrase structure: period (parallel, contrasting), sentence, phrase group (AP unit 4, KP, RCM) | SHALLOW | `form` 2 "Phrase form" is letter patterns (`topicsHarmony.ts:205`). A question/answer period is mentioned in a lesson (`content/mini/theoryEar.ts:337`) with no question behind it. No sentence, and no parallel vs contrasting period. |
| A4 | Binary, ternary, rondo, song, verse–chorus, blues, AABA (all) | EXISTS-DEEP | `form` 1–5, `song-form` 1–6 (`topicsHarmony2.ts:642`), `form-ear` 1–3, `jazz-form` 1–4 (whole 32 bars) |
| A5 | **Large classical forms**: sonata, theme & variations, minuet & trio, fugue (subject / answer / countersubject), invention (RCM 9–ARCT, ABRSM-T 7–8, BAG classical analysis) | MISSING | "sonata" and "fugue" appear only in `nickname.ts` and the glossary. No listening or score item. |
| A6 | Figured bass: read, realize, by ear (ABRSM-T 6, AP FRQ 5, BAG chorale, TAU) | SHALLOW | `figured-bass` 1–4 (`topicsWritten.ts:926`): figures → chord (choice), fill alto/tenor of one chord (place), find the error, complete a cadence. No realization of a 4–8-chord figured line, no figured-bass dictation, no keyboard realization. |
| A7 | Voice-leading rules and part-writing (AP FRQ 5–6, KP, BAG, JAMD) | SHALLOW | `voice-leading` 1–3 (`topicsAD.ts:600`), `figured-bass` 3, `vl-ear` 1–4. There is no item where the player writes 4 parts from RN over several chords and every rule (parallels, doubling, spacing, range, resolutions) is graded with per-rule partial credit. |
| A8 | Species counterpoint (JAMD, RCM 10, AS) | SHALLOW | `counterpoint` 1–5 (`topicsWritten.ts:1217`) is choice only: "which line is correct". The player never writes a counterpoint against a cantus (place), and nothing is sung or played. |
| A9 | Harmonic analysis of a written score, beat by beat (AP, BAG core "ניתוח כורל", RCM) | SHALLOW | `chorale-rn` asks by ear for one marked chord. On paper: `roman-numerals` 1–4 (single chord or the cadence). No multi-chord RN entry under a written chorale or piano excerpt, and nothing on a real excerpt (e). |
| A10 | Lead-sheet analysis: key centres, ii–Vs, function (BAG jazz, JAMD jazz) | EXISTS-DEEP | `chart-analysis` 1–3 (`topicsChartAnalysis.ts:56`), `key-centres` 3, `jazz-changes`, `name-standard` |
| A11 | Harmonize a melody, in writing (AP FRQ 7, ABRSM-T 6, JAMD/TAU soprano harmonization) | SHALLOW | `harmonize` 1–3 (`topicsAD.ts:179`): one bar, choose I/IV/V(/ii/vi/V/V), tonic only C/D/F/G. `reharm-own` 3–5 places a jazz reharm. Nothing harmonizes a 4–8-bar soprano with cadence planning. |
| A12 | Melody writing, motive development: augmentation, diminution, fragmentation, sequence, inversion (ABRSM-T 6, AP unit 6) | SHALLOW | `melodic-transform` 1–4 and `rhythm-transform` 1 recognize some devices (`topicsAD.ts:687,767`). No fragmentation or augmentation of a motive by ear, and no writing or completing a melody (`call-response` is choice). |
| A13 | Post-tonal: set classes, twelve-tone rows, octatonic / whole-tone harmony (KP Part 6, AP-adjacent, TAU graduate) | SHALLOW | `set-classes` 1–3 (trichords only; `topicsEar.ts:195`), `negative-harmony`, octatonic scale ID. Twelve-tone row forms (P/I/R/RI) appear only in lesson text (`content/mini/ad.ts`). No 4–6-note clusters (TAU). |
| A14 | Rudiments: keys, intervals, chords, scales spelled; circle; clefs incl. C clefs; transposition; terms (ABRSM-T 1–5, RCM rudiments, BIU) | EXISTS-DEEP | `key-signatures`, `interval-spelling`, `chord-spelling`, `scale-spelling` (place), `circle-fifths`, `note-reading` 1–6 (alto/tenor), `transposition` / `transpose-adv` (transposing instruments, clef transposition), `musical-terms`, `time-signatures` 1–5, `theory-facts` |
| A15 | Ornaments (ABRSM-T 4–5) | EXISTS-DEEP | `ornaments` 1–4 (`topicsWritten.ts:1426`), voice ornaments (`vocal.ts` ornamentNotes) |
| A16 | **Instruments, ranges, families, open score** (ABRSM-T 5, RCM, AP unit 2 timbre, BIU orchestra) | MISSING | No item on instrument ranges, families or score order. Only glossary mentions. (BAGRUT_AND_CONSERVATORY gap 10 is still open.) |

### 2.6 Rhythm and meter

| # | Item | Status | Evidence |
|---|---|---|---|
| R1 | Meter: duple / triple / quadruple, simple / compound (all; Bagrut core) | EXISTS-DEEP | `meter-feel` 1–4, `downbeat` 1–4, `time-signatures` 1–5 |
| R2 | Odd and mixed meters (BKL ET4, Arabic track) | EXISTS-DEEP | `odd-meter` 1–5, `prog-meter` 1–5, `eastern-rhythm` 1–5 |
| R3 | Rhythm reading / performing (KAR, Dalcroze) | EXISTS-DEEP | `rhythm-r1…r8` lessons (read and dictate), `click-subdivide`, `click-backbeat`, `gap-click`, `drum-read`, `sight-tap`, Rhythm game, Time Lock |
| R4 | Syncopation and anticipation (all) | EXISTS-DEEP | `syncopation` 1–4, `displacement` 1–4, `displacement-3` 1–3 |
| R5 | Tuplets, polyrhythm (BKL, prog) | EXISTS-DEEP | `polyrhythm` 1–4, `poly-tap` 1–7 (to 7:4), Poly Lock game |
| R6 | Hemiola, metric modulation (KP, BKL) | EXISTS-DEEP | `meter-feel` 4, `hemiola-tap` 1–4, `rhythm-transform` 4, `metric-tap` 1–4, `prog-meter` 5 |
| R7 | Swing feel, placement (jazz) | EXISTS-DEEP | `swing-ratio` 1–4, `rhythm-build` 8, `comping` 1–3 |
| R8 | Tempo: perception, memory, steadiness (ABRSM-A pulse) | EXISTS-DEEP | `tempo` 1–6, `tempo-memory`, `tempo-react`, `basics-beat` |
| R9 | Conducting patterns / eurhythmic movement (Dalcroze, college aural skills) | MISSING | Mentioned in lesson text only (`content/mini/rhythm.ts`, `time2.ts`). Low priority: a phone can't see the arm, though device-motion could. |
| R10 | Rhythm syllables (Kodály ta / ti-ti, Takadimi) | MISSING | Rhythms are spoken by name (`rhythm.ts` describe). Low priority. |

### 2.7 Other musicianship

| # | Item | Status | Evidence and gaps |
|---|---|---|---|
| O1 | **Timbre / instrument identification** (AP unit 2, BAG 2027 "ensemble", ABRSM 8D) | MISSING | Only `pan-ear` 3 (which instrument is panned left; `topicsSound.ts:297`). The sample library has grand, upright and electric bass, harp, harpsichord, marimba, vibraphone, organ, Wurlitzer, EP and drums (`public/samples/`), so families of keyboard, mallet and plucked instruments are already possible. Strings, winds and brass need new samples (owner OK required). |
| O2 | Texture: mono / homo / poly, melody + accompaniment, heterophony (AP unit 2, ABRSM 8D, BIU) | SHALLOW | `voice-count` 4 is one level (`topicsAD.ts:486`), with synthesized examples only. |
| O3 | Style / period, composer / genre / ensemble (ABRSM 8D, BAG 2027 two questions) | SHALLOW | `style` 1–4 uses synthesized idioms (`topicsHarmony2.ts:739`, `form.ts`). Named works need licensed audio (`MUSIC_SOURCES_LEGAL.md`). |
| O4 | Describe a piece: several features of ONE excerpt (ABRSM 8D, BAG comparison question) | SHALLOW | The elements exist separately (`dynamics`, `articulation`, `mood`, `tempo`, `voice-count`), but no item asks 3–4 features of one passage. |
| O5 | Intonation in cents (string, wind and choir practice) | EXISTS-DEEP | `fine-pitch` 1–3, `in-tune` 1–5 (to 10¢), Tune Up game, v-pitch intonation |
| O6 | Tuning systems: just vs equal, beats, Pythagorean comma (college acoustics, BIU basic acoustics) | MISSING | Just offsets are used only internally for grading over a drone (`drone.ts:29`). No question. |
| O7 | Audiation / inner hearing (KOD, Gordon) | EXISTS-DEEP | `audiation` 1–5 (L4 sung; `topicsHarmony2.ts:253`) |
| O8 | Musical memory: rhythm, chords, tunes (KAR, ABRSM) | EXISTS-DEEP | `rhythm-memory` 1–5, `chord-memory` 1–3, `pitchmemory` game |
| O9 | Maqam, jins, quarter tones, iqa' (BAG Arabic track) | EXISTS-DEEP | `maqam` 1–6, `eastern-rhythm` 1–5, micro-tone singing (`voiceFamilies.ts` MICRO_LEVELS) |
| O10 | Production ear: EQ, filter, space, pan, width, compression (beyond these syllabi) | EXISTS-DEEP | `eq-ear`, `filter-ear`, `tone-hz`, `space-ear`, `pan-ear`, `width-ear`, `dyn-ear` |

### 2.8 Jazz

| # | Item | Status | Evidence |
|---|---|---|---|
| J1 | Extensions and alterations by ear (BKL ET3–4, JAMD jazz) | EXISTS-DEEP | `extensions` 1–8 (to 1900), `chord-read-alt`, `polychords` 1–5, `key-jazz` (place) |
| J2 | Voicing type by ear | EXISTS-DEEP | `voicing-type` 1–5, `voicings` 1–5, `upper-rootless` 1–4, Voicing Spy |
| J3 | Chord-scale / mode over a chord | EXISTS-DEEP | `chord-scale` 1–3, `modes-ear`, `mm-modes`, `triad-pairs`, `pent-super` |
| J4 | Progressions: ii–V, turnarounds, subs, backdoor, Coltrane | EXISTS-DEEP | `jazz-changes` 1–5, `turnarounds` 1–3, `reharm-spot` 1–5, `jazz-chains`, `approach-chord`, `planing`, `modern-color` |
| J5 | Jazz harmonic dictation with tensions | EXISTS-DEEP | `grid-dictation` 5–8 (blues, AABA, partial credit), `jazz-dictation` 1–4 (choice) |
| J6 | Tune recognition | EXISTS-DEEP | `name-standard` 1–4 (`topicsAdvGames.ts:357`), Name That Standard, `nametune` game |
| J7 | Transcription of lines | EXISTS-DEEP | `jazz-phrase` 1–7 (place 6–7), transcribe coach (`transcribe.ts`), Transcribe Race, My song |
| J8 | Walking-bass dictation | SHALLOW | `jazz-dictation` 5 is a choice among lines (`topicsHarmony3.ts:348`). Nothing writes a walking bass line note by note. |
| J9 | Guide-tone lines | EXISTS-DEEP | `guide-tones` 1–3, `guide-line` 1–3, v-harmony 1702 (sung) |
| J10 | Jazz forms | EXISTS-DEEP | `jazz-form` 1–4, `form-ear`, `song-form` 6 |
| J11 | Comping rhythms | EXISTS-DEEP | `comping` 1–3 plus performed comping in drills |
| J12 | Barry Harris harmony by ear | EXISTS-DEEP | 20+ `bh-*` topics (e.g. `bh-six-over`, `bh-brothers`, `bh-moves`) |

### 2.9 Pop

| # | Item | Status | Evidence |
|---|---|---|---|
| Pp1 | Roman numerals in pop, four-chord loops (Hooktheory I) | EXISTS-DEEP | `progressions` 1, `nashville` 1–3, `grid-dictation` 1, `song-strum` (strum answer), `next-chord` 1 |
| Pp2 | Melody degree against the chord (Hooktheory) | EXISTS-DEEP | `ct-degree` 1–6, `melody-fit` 1–3 |
| Pp3 | Pop song form | EXISTS-DEEP | `song-form` 1–2, `form-ear` 3 (intro / tag / coda) |
| Pp4 | Modal rock / pop colours: ♭VII, Dorian IV, borrowed iv (Hooktheory II) | EXISTS-DEEP | `modal-cadence`, `modal-mix` 1–3 |
| Pp5 | Pop bass line / riff transcription over a full band | SHALLOW | `bass-dictation` uses classical I/IV/V, `figure-out` 2 is a choice, `play-back` 6 plays roots. There is no "write the riff / bass line" over a drum + chords loop with syncopation. |

### 2.10 APP-WRONG

| # | Where | What is wrong | Fix |
|---|---|---|---|
| W1 | `function-ear`, `topicsHarmony3.ts:64-77` (`FUNCTIONS`) and `:91` (MIN_CH VI = T) | Minor-key VI is always "Tonic", and level 1 writes it **♭VI** in a minor key. `roman-numerals` in the same app writes **VI** (`topicsTheory.ts:223`). In common-practice texts (KP, AS) the submediant in minor normally leads to iv / ii° (pre-dominant motion), and is tonic-substitute only after V (deceptive). Major vi is likewise both tonic-extension and the step before PD. Marking it plain T with no caveat teaches a one-sided rule, like the iii case that already gets a caveat. | Write "VI" in minor. Either accept T or PD for vi / VI with a "Why?" note, or leave vi / VI out of the "on paper" level, as iii is. |
| W2 | `roman-numerals` 2, `topicsTheory.ts:221-246` | Minor-key diatonic triads come **only from harmonic minor**: **III+** as the mediant, vii° only, never III or VII (subtonic). Textbooks (KP ch. 4 "the minor mode: variable 6 and 7"; AP unit 3) teach III and VII as the usual forms and III+ as rare. A student drilled here would mislabel the most common minor-key mediant. The level also plays no cadence first in minor (`stimulus: minor ? [chordStim]`), so the key is never heard. | Use natural-minor III and VII alongside harmonic-minor V and vii°, and offer III+ only as a named rare chord. Play i–iv–V–i first, as in major. |
| W3 | v-sight, `vocal.ts:1100-1110` (and `:1067-1098`) | (a) Every sight-singing level is built from **3 hard-coded seeds**, so the whole sight-singing ladder is 15 melodies that repeat. This breaks the owner rule "no memorizable items" (memory: sound-and-voice-direction) and makes it echo-singing after a few runs. (b) Minor uses harmonic minor with free stepwise motion between degrees 6 and 7, so beginner minor reading (1350–1550) can include an **augmented 2nd** (♭6–♮7). Ottman and KAR introduce minor without it, through ♭6 → 5 and ♮7 → 8. | Seed from the session as `sight-tap` does, and avoid 6↔7 adjacency below about 1600 (use melodic minor ascending, natural descending). |

### 2.11 Counts

| Status | Count | Items |
|---|---|---|
| EXISTS-DEEP | 59 | P1–P3, P5–P12; D1–D3, D5, D9; S3, S4, S7, S8; H1–H3, H5, H6, H9, H14; A4, A10, A14, A15; R1–R8; O5, O7–O10; J1–J7, J9–J12; Pp1–Pp4 |
| SHALLOW | 25 | P4; D4, D8; S1, S5, S6; H4, H8, H10, H11; A1–A3, A6–A9, A11–A13; O2–O4; J8; Pp5 |
| MISSING | 12 | D6, D7; S2; H7, H12, H13; A5, A16; R9, R10; O1, O6 (R9 and R10 are low priority) |
| APP-WRONG | 3 | W1, W2, W3 (these sit on the rows H1, A14 and S1) |

Total: 96 checklist items. Almost every SHALLOW item fails criterion (c), answer modes, and criterion (d), partial credit.

**Cross-cutting findings**
1. **Choice dominates the classical core.** Nothing in harmonic analysis, counterpoint, figured bass, NCTs or the Neapolitan / augmented sixths can be written or played. The `place` and `grid` infrastructure already exists and gives partial credit. It is used for melodies, two-part writing and progressions, but not for four-part writing, counterpoint or RN analysis.
2. **No partial credit for multi-chord choice items.** `harmonic-dictation`, `jazz-dictation` and `chorale-rn` grade a whole progression or chord as right or wrong. `grid-dictation` shows the better model.
3. **Key coverage:** `harmonize` uses 4 tonics (`topicsAD.ts:190`). `roman-numerals` uses keys up to 3 accidentals (`topicsTheory.ts:238`). `surfaceVary` transposes many choice items, but written-theory items are bounded.
4. **Music, not items (e):** the classical side has no real-music anchoring at all (no chorale, sonata or minuet excerpt). The jazz and pop side has the standards' changes, the songbook and My song.
5. **Performance link (f):** strong in jazz (drills), weak in classical (no keyboard harmony: "play I–IV–V–I / a cadence in a key", which BAGRUT_AND_CONSERVATORY gap 9 lists as still open).

---

## 3. Priority build list (ladders on the 700–1900 scale)

Ordered by exam weight (AP, Bagrut, ABRSM, conservatories), then niche fit, then build cost. Reuse means existing infrastructure.

| Prio | Build | Ladder | Answer modes | Reuse |
|---|---|---|---|---|
| 1 | **Fix W1–W3** | — | — | `topicsHarmony3.ts`, `topicsTheory.ts`, `vocal.ts` |
| 2 | **Harmonic sequences** `sequence-ear` (H12) | 1250 "same pattern moving? yes/no" · 1400 descending fifths (diatonic) vs ascending · 1500 Pachelbel (desc. 5–6) vs desc. fifths · 1600 ascending 5–6 · 1700 secondary-dominant sequence (V/x chain) · 1800 a sequence on the grid (8 bars, partial credit) | choice → grid → play (keys MIDI: continue the sequence) | `form.ts` voice leading, `progGrid` |
| 3 | **Augmented sixths and Neapolitan by ear and in dictation** `chromatic-ear-2` (A1, A2) | 1350 N⁶ → V in minor · 1450 N in major / N → cad 6/4 · 1550 It / Fr / Ger (Ger → cad 6/4 → V, avoiding the parallel fifths) · 1650 +6 vs V⁷/V vs vii°7/V (also H4) · 1750 grid dictation with N, +6, vii°/x · 1850 Ger⁶ ↔ V⁷ enharmonic modulation (H7) | choice → grid → place (spell it on the staff) | `topicsHarmony2.ts:433`, `progGrid` cells |
| 4 | **Four-part writing graded by rule** `part-write` (A6, A7, AP FRQ 5–6) | 1300 one chord, given soprano · 1400 I–IV–V–I from RN · 1500 with inversions and cad 6/4 · 1600 from figured bass (6 chords) · 1700 minor, secondary dominants · 1800 harmonize a given soprano (A11) | place on the grand staff, per-rule partial credit (parallels, doubling, spacing, resolution) | `figured-bass` place, `voice-leading` rules, `gradePlace` alts |
| 5 | **Movable-do option + sight-singing regenerated** (S1, S2) | Setting: names / fixed do / movable do / numbers. v-sight: 1050 → 1600 seeded, with compound meter at 1400 and dotted rhythms at 1300; hand-sign glyphs in the lesson | sing (graded), with speech accepting syllables | `pitch.ts` Naming, `sightMelody`, the `sight-tap` seeds |
| 6 | **Outer voices + RN dictation (AP style)** (D4) | 1350 bass + RN, 4 chords · 1450 soprano + bass, 5 chords · 1550 with inversions · 1650 minor with V/V · 1750 8 chords with a cadential 6/4 and N | place (2 staves) + grid RN, partial credit per part | `bass-dictation` 4, `grid` |
| 7 | **Phrase structure and classical forms** (A3, A5) | 1200 phrase ends: IAC/half → PAC (period?) · 1300 parallel vs contrasting period · 1400 sentence (basic idea ×2 + continuation) · 1550 minuet & trio (where are we?) · 1650 theme & variations: which variation technique · 1750 sonata form: exposition / development / recap at the bell · 1850 fugue: subject / answer / episode | choice, a "bell" like `jazz-form` 4 | `form.ts` arrangement builder, `jazz-form` bell pattern |
| 8 | **Timbre and instrument ID** (O1), then texture / describe-the-piece (O2, O4) | 800 piano / organ / harp · 950 + marimba, vibes, harpsichord · 1100 bass: upright / electric / pizz · 1250 family (keys, mallets, plucked, bowed*) · 1400 texture: mono / homo / poly / melody+acc. / heterophony · 1550 "three things about this excerpt" (tempo, texture, tonality) | choice; the multi-feature item gets partial credit per feature | `public/samples`; *bowed / wind / brass need owner OK for samples |
| 9 | **NCT ladder completed** (H8) | 1400–1650 existing · 1700 escape tone, anticipation · 1750 retardation, suspension type (4–3, 7–6, 9–8) · 1800 mark the NCTs in a written melody over chords · 1850 in two-part dictation | choice → place (tap the note on the staff) | `nct-ear` |
| 10 | **Counterpoint you write** (A8) | 1350 1st species, 4 notes against a cantus · 1450 1st species, 8 notes · 1550 2nd · 1650 4th (suspensions) · 1750 3rd · 1850 florid, graded by rule | place, per-rule partial credit; sing one line against the cantus (voice) | `counterpoint` rules, `two-part` place |
| 11 | **Three- and four-part dictation** (D6) | 1550 lowest of three parts (ABRSM 8A) · 1650 middle voice of three · 1750 chorale: S + B + RN · 1850 all four voices, 4 chords | place, partial credit | `two-part`, `chorale-rn` |
| 12 | **Two-part sight-singing from the score** (S6) | 1350 lower part, thirds, notated · 1500 contrary motion · 1650 imitation · 1800 chromatic / suspensions | sing (graded) while the app plays the upper part | v-harmony LINE + the `sight` renderer |
| 13 | **Keyboard harmony** (BAG BIU, AP-adjacent) | 1100 I–IV–V–I in C / G / F · 1250 any key · 1400 with ii⁶ and cad 6/4 · 1550 i–iv–V–i minor · 1700 a sequence in 4 voices | play (MIDI), graded on voicing and voice leading | `chordAnswer`, harmonyGrade |
| 14 | **Two-voice rhythm dictation** (D7) | 1300 two hands, quarters vs eighths · 1450 syncopation · 1600 3:2 · 1750 swing + triplets | rhythm-dict, two rows | `rhythm-build` |
| 15 | **Walking bass and pop riff dictation** (J8, Pp5) | 1300 roots + 5ths (pop) · 1450 syncopated pop bass · 1550 walking: chord tones on 1 and 3 · 1700 walking with approach notes · 1850 a blues chorus | place (neck or staff), partial credit | `jazz-dictation` 5 lines, `phraseEar` |
| 16 | Small items | Compound intervals to the 13th and sung (P4) 1550–1700; passing / pedal 6/4 (H10) 1450–1600; instrument ranges and score order (A16) 1100–1400; harmonic rhythm (H13) 1200–1350; tuning: just vs equal, beats (O6) 1600–1800; twelve-tone row forms (A13) 1650–1800; PAC vs IAC (P9) 1250 | mixed | — |

---

## 4. Game ideas: one per strong exercise

| Exercise | Game concept |
|---|---|
| intervals-all / interval-cells | **Interval Ladder Climb**: each right interval adds a rung; a wrong one makes you slip; answering by singing climbs two rungs. |
| sing-intervals | **Echo Canyon**: the canyon calls a note and names an interval; your sung answer bounces back in tune or wobbling (cents meter). |
| degrees-ext / ct-degree | **Degree Darts**: a note flies over a cadence; throw it onto the 1–7 (and ♭/♯) dartboard before it lands. |
| triads / seventh-chords | **Chord Colour Sort**: chords drop like tiles; swipe each into its quality bin as the drop speeds up. |
| extensions | **Tension Tuner**: a dominant plays; dial in ♭9 / ♯9 / ♯11 / ♭13 until your dial matches its colour. |
| voicing-type | **Voicing Spy** (existing), plus a "wanted poster" boss round where the suspect changes voicing between shots. |
| cadence-types | **Punctuation Pong**: every phrase end is a ball; return it as a full stop, comma, question or surprise. |
| function-ear | **Traffic Lights**: T = green, PD = amber, D = red; tap the light for each chord as the song drives on. |
| grid-dictation | **Changes Crossword**: bars are crossword cells; root, quality and bass letters lock in separately (partial credit as letters). |
| sequence-ear (new) | **Staircase Runner**: the runner keeps going down the fifths staircase; spot the step where the pattern breaks. |
| chromatic-ear-2 (new) | **Spice Rack**: It / Fr / Ger / N are spices; taste the chord before V and pick the jar. |
| modulation / modulation-means | **Border Control**: the music crosses into a new key; stamp the passport with destination and route (pivot / ii–V / common dim). |
| key-centres | **Tube Map**: draw a standard's key-centre route station by station while the changes play. |
| staff-dictation | **Melody Catcher**: notes fall from the band onto the staff; catch them on the right lines; rhythm counts as a combo. |
| two-part / three-part (new) | **Duet Detective**: two suspects talk at once; write down what each said (upper and lower line). |
| rhythm-build | **Beat Builder**: rhythm bricks build a wall; a wrong brick cracks it, and a full bar clears a row. |
| poly-tap / metric-tap | **Poly Lock** (existing), plus "Gear Shift": the click changes gear (×3/2, ×4/3), and you keep the car at speed. |
| odd-meter / prog-meter | **Odd Step Dance**: footprints of 2s and 3s light up; step the grouping (3+2+2) before the floor drops. |
| swing-ratio | **Swing-o-meter**: slide the ratio to match the drummer, then "lay back" and "push" challenges. |
| modes-ear / mm-modes | **Mode Weather**: Lydian sunshine to Locrian storm; forecast the mode from a vamp in 3 seconds. |
| maqam | **Sayr Journey**: follow the maqam's path on a desert map; name each jins oasis it stops at. |
| fine-pitch / in-tune | **Tune Up** (existing), plus a "Choir Tuner" boss: fix the one singer who is 10¢ flat in a chord. |
| name-standard | **Name That Standard** (existing), plus "Bar 9 Blitz": the clue starts mid-form, and fewer bars heard means more points. |
| jazz-phrase / transcribe | **Lick Heist**: steal the phrase note by note before the alarm (the loop counter) runs out. |
| figured-bass / part-write (new) | **Four-Voice Traffic**: route S-A-T-B cars through each chord with no collisions (parallels) and no lane jumps. |
| counterpoint (new, written) | **Mirror Line**: draw a line against the cantus; consonance lights glow, and fifths or octaves in a row short-circuit. |
| nct-ear | **Odd One Out**: tap the "visitor" note that isn't in the chord, and name its trick (passing, neighbour, suspension…). |
| form / jazz-form / sonata (new) | **Where Am I?** bell game: the music stops and you drop a pin on the form map; closer pins score more. |
| timbre ID (new) | **Orchestra Pit**: instruments hide behind curtains; identify who plays, then who joined. |
| sight-singing (seeded) | **Karaoke Read**: unseen lines scroll; your voice drives a cursor that lights each note it hits on time. |
| audiation | **Silent Movie**: the music mutes for a bar; your hum or sing at the return must land on the right note. |
| reharm-own | **Remix Chef**: swap chords under a melody; the melody "taste test" fails if a chord clashes. |

### The 10 best (build first)

1. **Changes Crossword** (grid-dictation): turns the strongest exercise, already with partial credit, into a game.
2. **Border Control** (modulation-means / key-centres).
3. **Spice Rack** (augmented sixths / Neapolitan: closes A1 and A2 and is fun).
4. **Where Am I?** bell (forms including the new classical forms).
5. **Four-Voice Traffic** (part writing: the biggest classical gap, made playful).
6. **Degree Darts** (functional hearing, beginner to advanced).
7. **Staircase Runner** (harmonic sequences).
8. **Lick Heist** (transcription).
9. **Karaoke Read** (seeded sight-singing, fixes W3 at the same time).
10. **Tension Tuner** (extensions and alterations).

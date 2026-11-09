# Bagrut & conservatory: exam research and mapping

Research for a "Bagrut & conservatory" section (one place for exam preparation). Written 2026-11-08.
Machine-readable draft of the mock exams: `src/content/bagrut.ts` (`EXAMS`). Every section there points at an existing `TOPIC_GEN` id with a **1-based** level, and all were checked against the topics' level counts and generated without errors.

Confidence legend: **[P]** primary source (Ministry / institution document read directly), **[S]** secondary or old document, **[I]** inferred, not published.

---

## 1. What the exams contain

### 1.1 Music Bagrut, 5 units (בגרות במוזיקה, 5 יח"ל, מגמת מוזיקה)

Source: the music inspectorate's yearly circular for תשפ"ו (חוזר מפמ"ר במוזיקה, 4 Aug 2025) **[P]**
https://meyda.education.gov.il/files/Mazkirut_Pedagogit/Music/hozer-megamot-tashpav.pdf
and the Ministry page on the 5-unit Bagrut **[P]**
https://pop.education.gov.il/tchumey_daat/music/high-school/pedagogy-of-music/bagrut-music-high-school/

**Structure (תשפ"ו)**
- 50% external exam (בחינה חיצונית, שאלון 048387) and 50% school assessment (יחב"ס, שאלון 048283). Main final-grade code: 048580.
- External exam: **3 hours, online (iTest)**, with MuseScore (v4.5.1) for notation answers. One practice exam in December and a national simulation.
- External weights: core history 12.5%, track history 7.5%, core theory 5% (the circular's "1-5%"; garbled in extraction), **track theory 15%**, plus 10% at the coordinator's choice. School part: theory specialization 5%, **ear training & solfège 8%**, history specialization 10%, performance 17%, extension 10%.
- **Tracks (פרקי התמחות):** classical (קלאסי), pop-rock (פופ-רוק), jazz (ג'אז), Arabic music (מוזיקה ערבית). A music-production chapter (הפקה מוזיקלית) can replace pop-rock history from תשפ"ח; it still needs pop-rock theory and ear.
- **Core theory (ליבה):** identifying and building chords and scales, harmonic relations between degrees, chorale analysis (ניתוח כורל).
- **Track theory, every track:** analysis of an excerpt in the track's style (classical: harmonic and formal analysis; pop-rock: a pop-rock excerpt; jazz: a jazz standard; Arabic: maqam, jins, maqam structure, modulation and iqa'), **meter identification (זיהוי משקל)** and **rhythmic dictation (הכתבה קצבית)**.
- In תשפ"ו classical analysis skips modulations and secondary dominants; pop-rock and jazz also skip borrowed chords (מיקסטורות).

**From תשפ"ז (2027) the external exam changes** **[P]**
- Core: concept questions (musicians, periods, genres), theory construction and harmonic analysis stay, **plus ear training: melodic dictation (הכתבה מלודית) and root-position triad identification**.
- Track chapter: (1) a comparison question on an unseen/unheard piece; (2) two period-identification questions from listening (period, composer, genre, ensemble); (3) a branched analysis question (form, tonality, harmony, melody); (4) **two rhythmic ear questions: meter identification and rhythmic dictation**; (5) **one harmonic ear question: a short diatonic progression**.
- Per-question points and minutes are **not published** in the circular; the Ministry published a separate "structure and sample questions תשפ"ז" file (linked from the circular, not read here). Past online exams since 2017 are viewable in the Ministry's exam viewer (צפיין בחינות הבגרות), not as PDFs.
- Sight-singing (סולפג') is assessed **internally** (inside the 8% ear block), not in the external exam.

**Academy route in high school** **[P]**: schools in the "12 credit" or "4 credit" theory tracks take the theory exam at the Jerusalem Academy (שאלון 048351, 36%), and only the music-cultures part of the online Bagrut (048357, 20%). Passing gives exemptions at JAMD, Ono, Haifa, Levinsky, Rimon and others.

### 1.2 Jerusalem Academy of Music and Dance (האקדמיה למוסיקה ולמחול בירושלים, JAMD)

Requirements differ by department **[P]**:
- **Theory, Composition & Conducting** (https://jamd.ac.il/en/node/754): single-voice **chromatic** dictation, **two-voice diatonic** dictation, measures and rhythms; solfège: singing and identifying intervals, modes, scales, triads and inversions; **sight-reading diatonic and chromatic tunes**; harmonizing a given soprano and bass in four voices; writing a counterpoint; analysing a short Classical/Romantic excerpt.
- **Music Education** (https://jamd.ac.il/en/node/753): written: notation, intervals (asc/desc, inversions), single-voice diatonic dictation in major and minor with accidentals, rhythms and meters, triads and dominant-seventh inversions, terms. Oral: sing and identify intervals, triads, V7 inversions, scales; sight-read a diatonic line; rhythm combinations incl. triplets, syncopation, 2/4, 3/8, 6/8, 4/4.
- **Composition (cross-disciplinary)** (https://jamd.ac.il/en/node/760): intervals and triads; monophonic and two-voice diatonic dictation, harmonic progression dictation, rhythmic dictation, diatonic solfège.
- **Jazz Performance** (https://jamd.ac.il/en/node/1937): theory: intervals, triads and seventh chords and inversions, scales and modes, transposition, treble/bass clef, **harmonic and/or melodic analysis of a jazz piece**; ear: melodic dictation, **jazz harmonic progression dictation**, rhythmic dictation.
- Durations and point weights: **not published**.

### 1.3 Buchmann-Mehta School of Music, Tel Aviv University (בית הספר למוזיקה ע"ש בוכמן-מהטה)

Source: entrance-exam document for תשע"ד (2013) **[S, old]** https://www.tau.ac.il/arts/music/english/admissions/download/Entrance%20Examinations%202012.doc and sample theory questions **[P]** https://en-arts.tau.ac.il/sites/arts-english.tau.ac.il/files/media_server/Arts/music/forms/Entrance%20Examination%20Music%20Theory%20Sample%20Questions%20English.pdf
- **Written ear training (all tracks), treble and bass clef:** melodic and harmonic intervals; triads and inversions; dominant, half-diminished and diminished seventh chords; **harmonic dictation** with triads, seventh chords and inversions (the 2013 search summary also lists meter identification, one- and two-voice and rhythmic dictation).
- **Oral solfège:** **sight-singing a given passage with modulations**; sing back from memory; build and sing triads, seventh chords and inversions, scales and modes naming the notes.
- **Written theory:** scales (natural/harmonic/melodic minor), modes, intervals incl. aug/dim, triads and all 7 seventh-chord types with inversions, clefs (treble, bass, alto, tenor; old clefs for composers), rhythm re-barring, key signatures, short bass harmonization, four-part progression from given numerals, harmonic analysis of a chorale, terms list. Composition/conducting: also soprano harmonization and completing gaps in a style.
- Graduate exam (for reference): 7th and 9th chords, 4–5 note chords, 5–6 note clusters, Bach chorale and string-quartet dictation, progressions with modulation, tonal and atonal singing (https://en-arts.tau.ac.il/music/exam_requir_sec).
- Durations: **not published**.

### 1.4 Bar-Ilan University, music department (המחלקה למוזיקה)

Source **[P]** (2019): https://music.biu.ac.il/files/music/shared/ezber-mivhan-cnisa-29-1-19.pdf
- Used for placement (הקבצות); Bagrut music graduates may test at an advanced level for exemptions.
- **Sample timing: theory 75 min, ear 30 min.**
- Notation: values down to 32nds, tuplets; treble, bass and alto clef; register names; accidentals; performance terms.
- Ear: solfège in treble and bass; intervals and major/minor scales by ear; **one-voice dictation**; root-position triads.
- Theory: meters (2/2 … 12/8), intervals up to 9th/10th incl. aug/dim and inversions, all scales, 7 modes, functions, 4 triad types and V7 with inversions, transposition incl. chromatic notes, mono/homo/polyphony, orchestra, basic acoustics. Keyboard harmony: unseen playing, I–IV–V–I in C, G, F.

### 1.5 Rimon School of Jazz and Contemporary Music (בית הספר רימון)

**The test format is not published** **[I]**. Known facts **[P]**: admission by audition; applicants without theory take a 3-week basic theory crash course (notation, intervals, scales, chords, clefs) (https://www.rimonschool.co.il/en/?p=112). Degree courses: Ear Training I–III, Rhythmic Ear Training I–II, Traditional Harmony I–II, Jazz & Popular Harmony (https://www.rimonschool.co.il/en/?p=175). The music-education degree with Levinsky includes a theory exam. Our mock is **an estimate** modelled on these courses and the JAMD jazz exam: intervals, chord qualities, jazz progressions/ii–V–I, swing feel, blues form, chord–scale, chord symbols, melodic and rhythmic dictation.

---

## 2. Task → app topics

Levels are 1-based, as in `TOPIC_GEN` (`level 1` = first level).

| Exam task | Where it is asked | Topic(s) and level(s) | Status |
|---|---|---|---|
| Meter identification | Bagrut all tracks, TAU, JAMD | `meter-feel` 1–4 (2/3/4, 3/4 vs 6/8, hemiola), `odd-meter` 1–5, `time-signatures` 1–5 (paper), `downbeat` 1–4 | Covered |
| Rhythmic dictation | Bagrut all tracks, JAMD, TAU | `rhythm-build` 1–7 (R1–R7: up to sixteenths, syncopation, triplets, 3/4 and 6/8); core `rhythm-dict` lesson; `syncopation` 1–4 | Covered (no swung R8 in `rhythm-build`; R8 exists in `rhythm.ts`) |
| Melodic dictation (one voice) | Bagrut core from 2027, all conservatories | `staff-dictation` 1–10 (L6 bass clef, L7 6/8 pick-up, L9 modulating to V, L10 chromatic) | Covered |
| Two-voice dictation | JAMD, TAU | `two-part` 1–6 (write), `two-voice` 1–3 (ear only) | Covered |
| Harmonic dictation / short diatonic progression | Bagrut track, JAMD, TAU | `harmonic-dictation` 1–6, `bass-dictation` 1–4 (L4 soprano, bass and numerals) | Covered |
| Jazz harmonic dictation | JAMD jazz, Rimon, Bagrut jazz | `harmonic-dictation` 5, `progressions` 2, `turnarounds` 1–3, `guide-tones` 1–3, `next-chord` 2 | Covered |
| Intervals by ear (melodic, harmonic, down) | all conservatories | `intervals-all` 1–4, `compound-intervals` 1–3; core `interval` lesson | Covered |
| Triads, inversions | Bagrut core 2027, all | `triads` 1–5, `voicings` 2; core `quality`/`inversion` lessons | Covered |
| Seventh chords (7 types) + inversions | TAU, JAMD | `seventh-chords` 1–5 | Covered (augmented-major 7 appears as maj7♯5 in L3) |
| 9th chords, clusters | TAU graduate | `extensions` 1–4; `set-classes` 1–3 (trichords only) | Partial: no 5–6 note clusters |
| Cadences | Bagrut analysis, all | `cadence-types` 1–5, `roman-numerals` 4 (cadence in score), `where-home` 1–4 | Covered |
| Modulation by ear | TAU/JAMD harmony, Bagrut (not in 2026) | `modulation` 1–5 | Covered (ear choice only) |
| Build intervals / chords / scales / modes | Bagrut core, all | `interval-spelling` 1–3, `chord-spelling` 1–3, `scale-spelling` 1–5, `key-signatures` 1–3, `circle-fifths` 1–3 | Covered |
| Harmonic relations between degrees | Bagrut core | `roman-numerals` 1–3, `nashville` 1–3 | Covered |
| Chorale analysis (ניתוח כורל) | Bagrut core, TAU | `figured-bass` 1 (figures→chord), `roman-numerals` 1–4 | Partial: no full chorale (numerals under a given 4-part score, beat by beat) |
| Four-part harmonization of bass/soprano | JAMD, TAU | `figured-bass` 2–4 (fill alto/tenor, find error, complete a cadence), `voice-leading` 1–3, `harmonize` 1–3 (ear) | Partial: no full bass- or soprano-line harmonization |
| Counterpoint | JAMD theory/composition | `counterpoint` 1–3 | Covered |
| Clefs (alto, tenor), registers | BIU, TAU, JAMD jazz | `note-reading` 1–6, `transpose-adv` 3 | Covered (no octave-register naming "great/small octave") |
| Transposition (incl. chromatic, instruments) | BIU, TAU, JAMD jazz | `transposition` 1–3, `transpose-adv` 1–3 | Covered |
| Re-barring a rhythm, beaming | TAU, BIU | `time-signatures` 4–5 | Covered |
| Musical terms | BIU, TAU, JAMD education | `musical-terms` 1–3, `theory-facts` 1–3 | Covered (no acoustics/orchestra terms) |
| Texture (mono/homo/polyphony) | BIU, Bagrut analysis | `voice-count` 4 | Covered |
| Form analysis | Bagrut analysis | `form` 1–5, `song-form` 1–6 | Covered |
| Period / style identification by ear | Bagrut 2027 period questions | `style` 1–4 | Partial: no named-work identification (composer, genre, ensemble) |
| Jazz standard analysis | Bagrut jazz, JAMD jazz | `song-form` 6, `chord-scale` 1–3, `progressions` 2, `chord-read` 1–7 | Partial: no lead-sheet analysis item |
| Pop-rock excerpt analysis | Bagrut pop-rock | `song-form` 1–5, `progressions` 1, `reharm-swap` 1–3 | Partial (ear only; no analysis on a written excerpt) |
| Maqam, jins, sayr (modulation), iqa' | Bagrut Arabic | `maqam` 1–6, `eastern-rhythm` 1–5, `odd-meter` | Covered |
| Sight-singing (diatonic) | internal Bagrut 8%, all conservatories | `sight-tap` 1–3, vocal sight-singing track (`vocal.ts`, not a topic), `song-sing` 1–5, `sing-intervals` 1–6 | Partial: `sight-tap` tops at eighths and thirds |
| Sight-singing with modulation / chromatic | TAU (oral), JAMD | `sight-modulate` 1–5 (0.56) | Covered |
| Sing intervals, chords, scales on demand | TAU, JAMD | `sing-intervals` 1–6 (L5 arpeggio of a named chord) | Partial: no "sing the scale/mode naming notes" |
| Sing back from memory | TAU oral | `call-response`, core `sing-seq` lessons, `play-back` 1–7 | Covered |
| Keyboard harmony (I–IV–V–I at the keys) | BIU | `key-notes` 5 (build a chord), `play-back` 6 | Partial: no "play the progression" item |

### Gaps (generators that would be needed)

1. ~~**Modulating / chromatic sight-singing**~~ — done in 0.56: `sight-modulate` (chromatic note, to V, to vi, to IV, away and back). (TAU oral, JAMD): a `sing-seq` over 4–8 bars that leaves the key (to V, relative, IV) with accidentals, graded by the vocal engine; extend `sight-tap` or the vocal sight-singing track to levels with dotted rhythms, 6/8, chromatic notes and modulation.
2. ~~**Full chorale analysis**~~ — by ear in 0.56: `chorale-rn` (Roman numeral and inversion of a marked chord in a 4-part phrase, 5 levels to minor keys).: show a 4-part chorale phrase (8–16 chords), ask for Roman numeral + inversion on each beat (place answers), Bagrut "ניתוח כורל" and TAU sample Q9.
3. **Bass / soprano harmonization in four parts** (JAMD, TAU): given a bass (or soprano) line, the user writes the upper voices; grade with `voice-leading` rules.
4. **Lead-sheet / jazz-standard analysis** (lead sheets can now be imported, 0.53; the analysis item is still to do) (Bagrut jazz, JAMD jazz): a short standard with chord symbols; ask key areas, ii–V brackets, chord function, form.
5. **Excerpt analysis on a written score** (Bagrut track question "branched analysis": form + tonality + harmony + melody), multi-part questions on one excerpt.
6. **Named-work listening identification** (Bagrut 2027 period questions; works list published yearly): needs licensed recordings, see the "My songs + legal" constraints. Unseen-comparison question is likewise audio-content bound.
7. **Four-part chorale / string-quartet dictation, 5–6 note clusters** (TAU graduate only, low priority).
8. **Sing the scale/mode, naming notes** (TAU oral): `sing-seq` over a named mode.
9. **Keyboard harmony**: play I–IV–V–I (or ii–V–I) in a named key on the keys/MIDI.
10. **Small theory gaps** (BIU): register/octave names (great, small, one-line…), acoustics and orchestra terms.
11. ~~**Swung rhythmic dictation**~~ — done in 0.56: `rhythm-build` level 8 (R8), used by the jazz mocks.: `rhythm-build` stops at R7; R8 (swung 4/4, quarter triplets) exists in `rhythm.ts` and would serve the jazz mocks.

---

## 3. Mock exams (draft in `src/content/bagrut.ts`)

Times are our suggestions for practice blocks (the real Bagrut external exam is 3 hours **including history**, which we cannot test). The Bagrut mocks follow the תשפ"ז structure (core gains melodic dictation and triads by ear).

**Shared Bagrut core (פרק הליבה), 9 sections, 46 min**

| id | Section (en / he) | Topic, level | Items | Min |
|---|---|---|---|---|
| core-keys | Key signatures / סימני היתק | key-signatures 3 | 6 | 3 |
| core-scales | Write the scale / בניית סולמות | scale-spelling 3 | 3 | 5 |
| core-intervals | Build intervals / בניית מרווחים | interval-spelling 3 | 6 | 5 |
| core-chords | Build chords / בניית אקורדים | chord-spelling 2 | 6 | 5 |
| core-degrees | Chords on scale degrees / דרגות הרמוניות | roman-numerals 2 | 6 | 5 |
| core-chorale | Chorale analysis: figures / ניתוח כורל: צפנים | figured-bass 1 | 4 | 6 |
| core-cadence | Name the cadence in the score / זיהוי קדנצה בתווים | roman-numerals 4 | 4 | 4 |
| core-melody | Melodic dictation / הכתבה מלודית | staff-dictation 4 | 3 | 9 |
| core-triads | Root-position triads by ear / זיהוי משולשים בשמיעה | triads 1 | 8 | 4 |

**Bagrut 5 units: classical (בגרות 5 יח"ל, קלאסי), 16 sections, 84 min** = core +
meter-feel 3 (6 items, 4 min) · rhythm-build 7 (3, 9) · harmonic-dictation 2 (3, 9) · cadence-types 3 (6, 4) · form 4 (4, 5) · voice-count 4 (4, 3) · style 3 (4, 4)

**Bagrut 5 units: pop-rock (פופ-רוק), 16 sections, 86 min** = core +
meter-feel 2 (6, 4) · rhythm-build 5 (3, 9) · syncopation 2 (5, 4) · harmonic-dictation 2 (3, 9) · progressions 1 (5, 5) · song-form 2 (4, 5) · style 4 (4, 4)

**Bagrut 5 units: jazz (ג'אז), 18 sections, 92 min** = core +
meter-feel 2 (4, 3) · swing-ratio 1 (4, 3) · rhythm-build 6 (3, 9) · harmonic-dictation 5 (3, 9) · seventh-chords 2 (6, 4) · progressions 2 (5, 5) · song-form 3 (3, 4) · song-form 6 (3, 4) · chord-scale 2 (5, 5)

**Bagrut 5 units: Arabic music (מוזיקה ערבית), 17 sections, 88 min** = core +
meter-feel 3 (4, 3) · odd-meter 1 (4, 3) · eastern-rhythm 2 (5, 4) · rhythm-build 5 (3, 9) · maqam 2 (6, 5) · maqam 3 jins (5, 5) · maqam 6 sayr (3, 5) · harmonic-dictation 1 (3, 8)

**JAMD (האקדמיה בירושלים), 14 sections, 89 min**
intervals-all 3 (8, 4) · intervals-all 4 (6, 3) · triads 4 (6, 4) · seventh-chords 4 (5, 4) · scale-spelling 5 (3, 5) · staff-dictation 10 chromatic (2, 10) · two-part 4 (2, 10) · harmonic-dictation 3 (3, 9) · rhythm-build 7 (3, 8) · time-signatures 5 (4, 5) · figured-bass 4 (3, 8) · counterpoint 1 (2, 8) · roman-numerals 3 (6, 6) · sight-tap 3 (3, 5)

**JAMD jazz (מחלקת הג'אז), 11 sections, 61 min**
interval-spelling 2 (6, 4) · chord-spelling 2 (6, 5) · seventh-chords 5 (5, 4) · scale-spelling 5 (3, 5) · transposition 2 (5, 5) · note-reading 6 (8, 3) · staff-dictation 5 (3, 9) · rhythm-build 6 (3, 8) · harmonic-dictation 5 (3, 9) · turnarounds 2 (4, 4) · chord-scale 2 (5, 5)

**TAU Buchmann-Mehta (בוכמן-מהטה), 16 sections, 89 min**
intervals-all 2 (8, 4) · intervals-all 3 (8, 4) · triads 4 (6, 4) · seventh-chords 5 (6, 5) · meter-feel 3 (4, 3) · staff-dictation 6 bass clef (2, 8) · two-part 4 (2, 10) · rhythm-build 7 (3, 8) · harmonic-dictation 3 (3, 9) · chord-spelling 2 (6, 5) · note-reading 5 tenor clef (8, 3) · time-signatures 4 (4, 5) · roman-numerals 2 (6, 6) · figured-bass 2 (3, 8) · musical-terms 3 (6, 3) · sing-intervals 5 (4, 4)

**Bar-Ilan (בר-אילן), 15 sections, 76 min** (theory 50 + ear 26, close to the published 75 + 30)
note-reading 3 alto (8, 3) · time-signatures 2 (5, 4) · interval-spelling 3 (6, 6) · key-signatures 3 (6, 4) · scale-spelling 3 (3, 6) · scale-spelling 5 (3, 6) · chord-spelling 1 (6, 5) · transpose-adv 2 (4, 8) · musical-terms 3 (7, 5) · voice-count 4 (3, 3) · ear: intervals-all 2 (8, 5) · scale-types 1 (4, 3) · staff-dictation 4 (2, 10) · triads 2 (6, 4) · sing-intervals 2 (4, 4)

**Rimon (רימון, estimated), 13 sections, 66 min**
intervals-all 2 (8, 4) · triads 2 (6, 3) · seventh-chords 2 (6, 4) · extensions 2 (5, 4) · scale-types 4 (5, 4) · swing-ratio 2 (4, 3) · rhythm-build 6 (3, 8) · staff-dictation 5 (3, 9) · harmonic-dictation 5 (3, 9) · progressions 2 (5, 5) · song-form 3 (3, 4) · chord-scale 2 (5, 5) · chord-read 6 (6, 4)

---

## 4. Open questions / uncertainty

- Bagrut per-question points and per-part minutes are not public in what we read; the תשפ"ז "structure and sample questions" file (linked from the circular) should be read before finalizing the Bagrut mocks.
- TAU's detailed list is from 2013; the current undergraduate tab could not be read. JAMD lists contents per department but no durations. Rimon publishes nothing about its test.
- The core-theory weight in the circular table extracted as "1-5%"; treat as ~5%.
- Sources searched but not used: study.co.il directory pages (secondary), TAU graduate pages (only for the graduate note).

# Instrument Technique Drills: Research Catalogue (piano first, then guitar)

Status: research input for the ToneTurn technique layer. Not a spec. Written 2026-11-07.
Scope: daily drills that measurably improve technique on **piano (MIDI keyboard by default; microphone optional)** and **guitar (microphone audio only)**, with per-key, per-scale metrics for speed, evenness, control, and accuracy. A later section covers **playing skills beyond drills**.

How to read this:
- **[V]** marks a figure checked against a source this session.
- **[M]** marks standard pedagogy written from general knowledge. It is widely agreed but was not re-verified here.
- **[?]** marks something uncertain. Verify it before shipping.
- Tempos are given as metronome mark and note value, plus **notes per second (nps)**, the unit-free number the app should store.

Contents
1. Piano drills: the standard canon
2. Barry Harris method drills
3. Jazz and contemporary piano drills
4. Guitar drills (audio input)
5. What MIDI can measure: metric definitions and thresholds
6. Progress and practice science
7. Playing skills beyond drills (piano): voicings, accompaniment, comping, improvisation, reading, ear, pedalling
8. Proposed taxonomy for the app

---

## 1. Piano drills: the standard canon

### 1.1 Scales

| Dimension | Values (progression order) | Notes |
|---|---|---|
| Type | major → natural minor → harmonic minor → melodic minor (up raised, down natural) → chromatic → (later: modes, whole-tone, blues, pentatonic, bebop, 6th-diminished) | Exam boards accept harmonic **or** melodic in early grades and require both later [M] |
| Hands | RH alone → LH alone → hands together (HT) | LH is almost always weaker. Track it separately. |
| Motion | similar (parallel) motion at the octave → contrary motion (from the unison) → similar motion a **3rd** apart → a **6th** apart → a **10th** apart | 3rds and 6ths appear around RCM 10 and ABRSM 7–8 [V RCM chart] |
| Range | 1 → 2 → 3 → 4 octaves | 4 octaves from about RCM 8 [V] |
| Articulation | legato → staccato (ABRSM asks for both from mid grades) → portato | |
| Dynamics | even mf → p and f → crescendo up and diminuendo down → "hairpin" over 4 octaves | |
| Rhythm | even notes → dotted (long-short, short-long) → triplets → groups of 3, 4, 5, 6 with accents → accent shifted to each note of the group | Standard "rhythms" practice, as in Cortot's method [M] |
| Formula pattern | contrary-motion scale that opens out, then runs in parallel at the 10th or 3rd and closes again (RCM "formula pattern") | RCM Levels 2–9 [V] |
| Double notes | scales in double 3rds and 6ths (one hand plays both) | Diploma level (ABRSM 8 has one, e.g. E♭ in thirds [V pianodao]) |
| Octaves | scales in octaves, blocked staccato and legato | RCM 9–10 [V] |

#### Standard fingerings (2-octave, one hand, ascending) [M]
Rules of thumb: (a) the thumb never plays a black key in a scale; (b) the 4th finger falls **once per octave**, and its location is the "anchor" to learn (RH 4 falls on B♭ in every major key from F to G♭; LH 4 falls on the 4th degree in B♭, E♭, A♭, D♭, and on the tonic or 2nd degree in B and F♯; see the table); (c) the group pattern is **123-1234** (3+4) or a rotation of it.

| Key | RH (from tonic) | LH (from tonic) | Group logic |
|---|---|---|---|
| C, G, D, A, E (major and harmonic minor of A, E, D, G, C) | 1 2 3 1 2 3 4 5 | 5 4 3 2 1 3 2 1 | 123-1234; LH 4321-321 |
| B major | 1 2 3 1 2 3 4 5 | 4 3 2 1 4 3 2 1 | LH starts on 4 |
| F major | 1 2 3 4 1 2 3 4 | 5 4 3 2 1 3 2 1 | RH 4 on B♭ |
| B♭ major | 2 1 2 3 1 2 3 4 | 3 2 1 4 3 2 1 3 | RH 4 on B♭, LH 4 on E♭ |
| E♭ major | 3 1 2 3 4 1 2 3 | 3 2 1 4 3 2 1 3 | RH 4 on B♭, LH 4 on A♭ |
| A♭ major | 3 4 1 2 3 1 2 3 | 3 2 1 4 3 2 1 3 | RH 4 on B♭, LH 4 on D♭ |
| D♭ major | 2 3 1 2 3 4 1 2 | 3 2 1 4 3 2 1 3 | thumbs together on F and C |
| G♭ / F♯ major | 2 3 4 1 2 3 1 2 | 4 3 2 1 3 2 1 4 | thumbs on C♭(B) and F |
| F♯ minor (harm.) | 3 4 1 2 3 1 2 3 | 4 3 2 1 3 2 1 4 | |
| C♯ minor | 3 4 1 2 3 1 2 3 | 3 2 1 4 3 2 1 3 | |
| G♯ minor | 3 4 1 2 3 1 2 3 | 3 2 1 3 2 1 4 3 | |
| E♭ / D♯ minor | 3 1 2 3 4 1 2 3 | 2 1 4 3 2 1 3 2 | |
| B♭ minor | 2 1 2 3 1 2 3 4 | 2 1 3 2 1 4 3 2 | |
| F minor | 1 2 3 4 1 2 3 4 | 5 4 3 2 1 3 2 1 | |
| Chromatic | thumb on every white key except where two whites are adjacent: 1-3 on white-black pairs, 1-2 on E-F and B-C (RH 1 3 1 3 1 2 3 1 3 1 3 1 2 from C) | mirror image | Alternatives: the "1-2-3" fingering for speed [M] |

Sources: ABRSM *Piano Scales & Arpeggios* books (https://www.boosey.com/shop/prod/Piano-Scales-Arpeggios-ABRSM-Grade-5/2405542); Alfred, *The Complete Book of Scales, Chords, Arpeggios & Cadences*. **[?] Check the minor rows against a printed fingering chart before showing fingerings in the UI.** The app cannot verify fingering over MIDI anyway (section 5), so fingering is displayed help only.

**Difficulty order for keys (scales)** [M; widely used, and matches the exam-board order]: C → G → D → A → E (white-key pattern 123-1234, both hands) → F (RH exception) → B (LH exception) → B♭ → E♭ → A♭ → D♭ → G♭/F♯ (black-key scales). Pianists often find D♭, G♭/F♯, and B **physically easier** than F or B♭: long fingers sit on black keys and thumbs on white keys (Chopin taught B major first) [M]. The **conceptual** difficulty (reading many accidentals) is a separate thing from the **physical** difficulty, so the app should rate them separately.

### 1.2 Arpeggios and broken chords

| Family | Content | Fingering notes [M] |
|---|---|---|
| Major and minor triad arpeggios | root position → 1st inversion → 2nd inversion; 1–4 octaves; HS → HT | White-key root position RH 1-2-3-5 (1 octave), 1-2-3-1-2-3-5; LH 5-4-2-1 (or 5-3-2-1 when the gap is a 4th) |
| Dominant 7th arpeggios | V7 of each key, root position → inversions | 4-note groups: RH 1-2-3-4, LH 4-3-2-1 (or 5-4-3-2-1 at the end) |
| Diminished 7th arpeggios | leading-note dim7 of each minor key (only 3 distinct dim7 chords) | same as above |
| Broken chords | triad broken in patterns (1-3-5-3, 1-5-3-5...), through inversions up the keyboard; RCM "four-note" broken chords | ABRSM removed broken chords from 2021 [V pianodao] |
| Blocked chords | triads and 4-note chords with inversions, ending with a cadence (RCM: I–IV–V6/4–5/3–I, later I–VI–IV–V6/4–V7–I) | RCM 5–10 [V] |
| Alternate-note pattern | broken chord in alternating notes (RCM 10) | [V] |

### 1.3 Cadences and progressions
- **I–IV–I6/4–V7–I** (or I–IV–V6/4–V7–I, i.e. the cadential 6/4) in every key, LH root and RH 3-note chords with smooth voice leading; three RH positions (root, 3rd, or 5th on top) [M]. RCM's blocked chord sequences end in I–IV–V–I (L7), I–IV–V6/4–5/3–I (L8), and I–VI–IV–V6/4–V8-7–I (L9–10) [V].
- Extensions: ii6–V7–I, the circle of fifths (vi–ii–V–I), secondary dominants, Neapolitan 6 → V. These link directly to ToneTurn's existing ear and theory content.

### 1.4 Exercise books: what each trains

| Work | Content and what it trains | Source |
|---|---|---|
| **Hanon, *The Virtuoso Pianist* (1873), 60 exercises** | **Part I (Nos. 1–20)** "preparatory": 5-finger sequential patterns ascending and descending by step, aimed at finger independence and evenness, especially fingers 3-4-5 and both hands in parallel. **Part II (21–43)** "transcendent exercises": harder patterns plus **thumb-passing preparation** (around 32–38 [?]), then **No. 39 scales in all keys, No. 40 chromatic scales, No. 41 arpeggios on major and minor triads in all keys, Nos. 42–43 dim7 and dom7 arpeggios** [M]. **Part III (44–60)** "virtuoso": repeated notes (44–47), double 3rds and 6ths, legato 3rds, trills, octaves (several of 51–57 [?]), wrist staccato, 4-finger tremolo, and **No. 60 tremolo** [M]. Criticised for promoting mechanical, high-finger playing when done thoughtlessly. Useful as a **pattern generator** for evenness at increasing tempos and in transposition (all keys is a modern practice). | IMSLP https://imslp.org/wiki/The_Virtuoso_Pianist_(Hanon,_Charles-Louis); https://en.wikipedia.org/wiki/Charles-Louis_Hanon |
| **Czerny** (Op. 599, 849, 299 *School of Velocity*, 740 *Art of Finger Dexterity*, 821 short exercises) | Graded études: passagework, scales and arpeggios inside music, LH velocity, repeated notes, trills. Op. 599 → 849 → 299 → 740 is the classic order [M] | https://imslp.org/wiki/Category:Czerny,_Carl |
| **Pischna**, *Sechzig Übungen* (60 Progressive Exercises) | Exercises with a held note: some fingers hold keys while others move, which trains independence and quiet hand position [M] | https://imslp.org/wiki/60_Progressive_Exercises_(Pischna,_Josef) |
| **Dohnányi**, *Essential Finger Exercises* (1929) | Concentrated daily exercises: held-note independence, scales and arpeggios in all keys with rotation, double notes, octaves, chords, stretches. Advanced and time-efficient [M] | https://imslp.org/wiki/Essential_Finger_Exercises_(Dohnányi,_Ernst_von) |
| **Brahms, *51 Exercises* WoO 6** | Advanced: independence under held notes, polyrhythm (2 vs 3), double notes, wide stretches, arpeggiated displacements, thumb crossings in unusual groupings [M] | https://imslp.org/wiki/51_Exercises,_WoO_6_(Brahms,_Johannes) |
| **Cortot, *Rational Principles of Pianoforte Technique*** | Organised by technical problem: (1) evenness, independence, and finger strength; (2) passing the thumb (scales and arpeggios); (3) double notes and polyphonic playing; (4) extensions; (5) wrist technique, chords, octaves. Each exercise comes with **rhythm variants** and transpositions [M] | Salabert 1928 / English ed. |
| Others | Philipp (*Exercises for Independence of the Fingers*), Liszt *Technical Studies*, Moszkowski *15 Études de Virtuosité* Op. 72, Burgmüller Op. 100 (elementary), Clementi *Gradus* | [M] |

### 1.5 Specific technical skills

| Skill | Drill examples | MIDI-measurable target |
|---|---|---|
| Trills | 1-3, 2-3, 2-4, 3-4, 4-5 pairs; measured trills (4, 6, 8 per beat) → free trills; with start/end turn | rate (notes/s), IOI CV, velocity SD between the two fingers (an uneven trill "limps") |
| Repeated notes | single note 4-3-2-1 fingering change; repeated chords | rate; dropped repeats (a key not fully released → no new note-on); velocity evenness |
| Octaves | staccato wrist octaves, legato octaves (4/5 on black keys), chromatic octaves | both notes present; inner-note pairing Δt < 15 ms; rate |
| Double 3rds and 6ths | scales in 3rds (RCM "separated by a 3rd" is between hands; true double 3rds are one hand) | pairing asynchrony; legato in the upper voice |
| Leaps / jumps | LH bass-chord (stride, waltz), RH octave jumps | hit accuracy; lateness of the landing note |
| Polyrhythm | 2:3, 3:4 between hands | IOI ratio accuracy per hand; alignment of shared downbeats |
| Articulation | legato, staccato, portato, two-note slurs (drop-lift), phrase-end lifts | duration/IOI ratio (section 5) |
| Dynamics control | each note at a fixed level (pp, mp, mf, f); crescendo over 1–4 octaves; terraced dynamics; accent every 3rd/4th note | velocity mean, SD, slope, R² |
| Voicing | one hand: top note louder than the other notes of a chord (finger weighting); melody over accompaniment (RH vs LH) | velocity difference between the melody voice and the others (target ≥ 10–20 velocity units) |

### 1.6 Rhythmic variants (the "rhythms" method) [M]
Practise a passage in: dotted long-short, short-long, triplet groupings, groups of 3 / 4 / 5 / 6 with an accent on the first note, with the **accent shifted** through every position, and with "stop-and-go" (fast group, then a pause on a note, then the next group). This is used by Cortot and many conservatory teachers to find weak finger transitions. The app can generate these deterministically and score the rhythm *as written* (the IOI pattern) rather than evenness.

### 1.7 Tempo ladders [M, with practice-science backing in section 6]
- Start at the tempo where the drill is **clean three times in a row** (all notes correct, IOI CV under target, no hesitations), then raise **+2–4 bpm** (about 3–5 %) per day or per successful set.
- If a set fails twice, drop back **−8–10 %** ("step back to leap").
- "Overshoot" variant: occasionally play one set +10 % to +15 % above the goal (then return), the burst or "speed bursts" practice common in teaching.
- Daily goal = yesterday's best clean tempo + 1 step. Store per (drill × key × hand × motion).

### 1.8 Exam syllabi: technical requirements and tempos

#### RCM (Royal Conservatory, Canada), 2022 Piano Syllabus [V, extracted from the ColorInMyPiano chart of the official syllabus: https://colorinmypiano.com/wp-content/files/RCM_2022_Technical_Requirements_Charts_Prep-10.pdf; official syllabus: https://teacherportal.rcmusic.com/getattachment/57f3734d-97e5-4777-b67e-4b1111ee31a3/piano-syllabus-2022-edition.pdf]
(The text extraction dropped the ♯/♭ signs from the key lists, so key names are left out here. Tempos and forms are reliable.)

| Level | Scales (form, tempo, nps) | Chords / arpeggios (tempo) |
|---|---|---|
| Prep A | pentascales HS, quarters ♩=100 (1.7 nps) | broken triad sequence, triplets ♩=60; blocked ♩=72 |
| Prep B | pentascales HS, eighths ♩=60; 1-oct scales HS; contrary motion HT, eighths ♩=60 (2.0) | tonic triads broken, triplets ♩=50 |
| 1 | 2 oct HS, eighths ♩=69 (2.3); contrary HT; chromatic 1 oct | broken triplets ♩=50, blocked ♩=100 |
| 2 | 2 oct HS ♩=80 eighths (2.7); formula pattern HT; chromatic | broken ♩=60, blocked ♩=112 |
| 3 | 2 oct **HT** ♩=80 eighths (2.7); formula; chromatic | 2 oct broken ♩=69, blocked ♩=120 |
| 4 | 2 oct HT ♩=92 eighths (3.1); chromatic ♩=104 | triads HT; tonic arpeggios HS ♩=72 eighths |
| 5 | 2 oct HT ♩=104 eighths (3.5); chromatic HT | triads end I–V–I; **dom7 HS** broken ♩=72; arpeggios HS ♩=80 |
| 6 | 2 oct HT, **16ths ♩=60 (4.0)**; chromatic 2 oct | dom7 and **dim7** HS broken ♩=88 eighths; tonic/dom7/dim7 arpeggios HS ♩=92 eighths |
| 7 | 2 oct HT 16ths ♩=76 (5.1) | four-note chords; dom7/dim7 HT; arpeggios HT 16ths ♩=60 (4.0) |
| 8 | **4 oct** HT 16ths ♩=88 (5.9) | arpeggios 4 oct 16ths ♩=69 (4.6); blocked chords ♩=100 |
| 9 | 4 oct 16ths ♩=104 (6.9); **octaves** blocked staccato 2 oct ♩=60 | arpeggios with inversions 4 oct ♩=84 (5.6) |
| 10 | 4 oct 16ths ♩=120 (8.0); **separated by a 3rd and by a 6th** ♩=104; octaves ♩=80; chromatic in octaves | arpeggios any inversion ♩=92 (6.1); alternate-note pattern ♩=96 |

#### ABRSM (UK): suggested minimum speeds (pre-2021 guide) [V for the numbers; from ABRSM's *These Music Exams* booklet: https://www.davidmeacock.com/These%20Music%20Exams%20ABRSM.pdf]
ABRSM states the speeds are "a guide only" and that even and secure playing matters more than speed [V]. **[?] The 2021 syllabus overhauled the scale requirements (pianodao: https://pianodao.com/2020/07/12/abrsm-piano-scales-2021/). Its speed table was not retrieved, so check the current *Piano Practical Grades* syllabus at abrsm.org.** The nps column assumes ABRSM scales are counted in quavers (2 per crotchet). That assumption is consistent with RCM: ABRSM G8 and RCM L8 both come out at 5.9 nps.

| Grade | Scales | ≈ nps | Arpeggios / broken chords (column alignment in the PDF is ambiguous [?]) | Typical content (2021 syllabus, summarised from pianodao) |
|---|---|---|---|---|
| 1 | ♩=60 | 2.0 | — | 1-oct scales, a few keys; contrary motion C |
| 2 | ♩=66 | 2.2 | ♩≈46 | 2 oct, more keys |
| 3 | ♩=80 | 2.7 | ♩≈63 | E major in contrary motion; B♭ HS |
| 4 | 𝅗𝅥=52 | 3.5 | ♩≈69 | B major, B♭ HT, F minor HS legato |
| 5 | 𝅗𝅥=63 | 4.2 | ♩≈76 | all keys covered; staccato scales; contrary chromatic |
| 6 | 𝅗𝅥=76 | 5.1 | ♩≈88 | relative/tonic pairs; dom7, dim7; scales a 3rd/6th apart |
| 7 | 𝅗𝅥=80 | 5.3 | 𝅗𝅥≈50 | 4 oct; legato and staccato; scales in 3rds (one hand) start |
| 8 | 𝅗𝅥=88 | 5.9 | 𝅗𝅥≈56–66 | all keys, 3rds/6ths apart, double 3rds (e.g. E♭ [V pianodao]), chromatic in octaves/minor 3rds |

A student flashcard set gives grade 8 scales at minim = 88 and 3rds at minim = 63 (https://www.brainscape.com/flashcards/abrsm-grade-8-piano-scales-in-f-2535223/packs/4443419). It is unofficial, but it agrees with the table.

#### Trinity College London
Trinity's technical work = scales and arpeggios **plus** "exercises" (short studies chosen from a book) in three focus areas per grade (tone/balance/voicing; co-ordination; finger and wrist strength/flexibility). Candidates may choose an exercise route [V: https://trinitycollege.com/qualifications/music/grade-exams/piano/resources/piano-technical-work/introduction-technical-work]. **[?] Minimum tempos were not retrieved.** Trinity also asks for **scales with dynamics** (e.g. played f or p, or with crescendo) at some grades [M]. That suits the app's dynamics drills.

#### Anchor tempo bands for the app (derived from the tables above)
| Band | nps | Roughly |
|---|---|---|
| T1 | 2.0–2.7 | ABRSM 1–3 / RCM 1–3 |
| T2 | 2.7–3.5 | ABRSM 4 / RCM 4–5 |
| T3 | 3.5–4.5 | ABRSM 5 / RCM 6 |
| T4 | 4.5–5.5 | ABRSM 6–7 / RCM 7 |
| T5 | 5.5–6.5 | ABRSM 8 / RCM 8 |
| T6 | 6.5–8.0 | RCM 9–10 / diploma |
| T7 | > 8 | professional (scale "showpiece" speeds 10–12+ nps) |

---

## 2. Barry Harris method drills

Barry Harris (1929–2021) taught bebop through weekly workshops (the Jazz Cultural Theatre in NYC, then decades of workshops). He left little in writing himself. The method reaches us through workshop videos (*The Barry Harris Workshop Video*, Parts 1 and 2, 1984 and later), a few articles ("Evolutionary Voicings," *Keyboard* magazine, Oct–Nov 1998: https://jazzworkshops.com/evolutionary-voicings-part-1/, https://jazzschoolonline.com/?p=28), and students' notes and books (Frédéric Galliano's notes: https://irfu.cea.fr/Pisp/frederic.galliano/Zique/barry_harris.html; Alan Kingstone, *The Barry Harris Harmonic Method for Guitar*; Chris Fischer [?]). Much circulates through forum threads (jazzguitar.be "Official Barry Harris thread": https://www.jazzguitar.be/forum/improvisation/55582-official-barry-harris-thread-40.html). **Rule wordings vary between sources.** The core ideas below are consistent across them. Exact rule lists are marked [?] where sources disagree.

### 2.1 What is genuinely Barry Harris (core concepts)

| Concept | Content | Confidence |
|---|---|---|
| **Scales are chords, chords are scales; chord tones on the beat** | Practise the 7 scale notes in eighths so that chord tones (1-3-5-7) fall on the beats. Added chromatic notes ("half steps") keep that alignment when a line starts on an off-beat or a non-chord tone | High (all sources) |
| **Think dominant** | Convert ii–V and minor 7 to the **dominant**: Dm7–G7 → play over G7 (the "G7 scale" = mixolydian), and treat m7 lines as the V7 a 4th up | High |
| **The dominant 7th scale descending from chord tones** | Descend the mixolydian from 1, 3, 5, or 7 with chord tones on downbeats. **Rule 1 (the "most famous")**: when you descend from the root with the root on a beat, add the half step **between the root and the ♭7** (1–7–♭7) so the ♭7 lands on a beat | High: 1→♮7→♭7 is in every source |
| **More half-step rules** | Further rules for starting on non-chord tones (9, 11, 13) or on off-beats: add a half step between the 3rd and 2nd (sources differ: 3–♭3–2?) or between 2 and 1; some put it as "add an odd number of half steps when a chord tone falls on an off-beat." A forum user's reconstruction says, roughly, odd half steps after a guide tone on a downbeat and even otherwise (jazzguitar.be thread 40). | **[?]** Exact rule set varies. Implement as a **general constraint**: the app can generate lines and check "chord tones on beats" automatically, rather than hard-code a rule list |
| **Arpeggios from each chord tone, and "3-to-9"** | Arpeggiate 1-3-5-7, 3-5-7-9 (the **"3 to 9"** arpeggio, the most-used bebop sound), 5-7-9-11, 7-9-11-13 ascending; then come down the scale | High |
| **Pivots** | Turn an arpeggio around using octave displacement: play 1-3-5-7 up, or "pivot" so the 3, 5, 7 drop an octave (direction change while keeping the order). One of his favourite embellishments with the 3-note enclosure (https://www.jazz.qld.edu.au/what-is-a-pivot-in-jazz-improvisation/) | High (term is his) |
| **Triplets / enclosures** | Chromatic or diatonic approach figures before a target chord tone: half step below, scale step above → target; the "Barry Harris triplet" (e.g. start on a chord tone, go up a step, back down to the chromatic below, land on the target) | Medium; "enclosure" is also generic bebop vocabulary |
| **Family of dominants / "brothers"** | The four dom7 chords a minor 3rd apart (C7, E♭7, G♭7, A7) relate to **one diminished chord** (the dim7 a half step above each root, e.g. C♯°7). They are "brothers" (sometimes "brothers and sisters") and are interchangeable over a dominant function | High (jazzguitar.be threads) |
| **Four chord types; the dim7 is the "mother"** | Harris reduces harmony to 6th chords (major 6, minor 6), dominant 7, and diminished 7. **m7 = inversion of a 6th chord** (Am7 = C6). Dominants are derived from the dim7 (lower any note of a dim7 a half step → a dom7). He calls the diminished chord a "mother" chord | High (Galliano notes; *Keyboard* 1998) |
| **6th-diminished scale (major and minor)** | Major 6 chord + dim7 chord interleaved = 8-note scale (C D E F G A♭ A B), harmonised as **C6 on the odd degrees and B°7 (= D°7) on the even degrees**. The ♭6 is a real scale degree, not just a passing tone (Medium article: https://medium.com/beyond-music-theory/the-barry-harriss-6th-diminished-scale-74e18e9b918d). Minor 6-diminished likewise; dominant-diminished for V7 | High |
| **Drops, borrowing, and "movement"** | Harmonise the 6-dim scale in 4 voices close position, then "drop" the 2nd voice (drop 2), the 3rd (drop 3), or both (drop 2&4) as the line moves. "Borrowing" means taking one note of the dim chord into the 6th chord, which creates new colours. This produces his block-chord and "movement" sound (*Keyboard* 1998 "Evolutionary Voicings") | High |
| **Pedagogy sequence** (workshop order commonly reported) | 1) dominant 7th scale descending from chord tones with half-step rules; 2) arpeggios (1-3-5-7, 3-to-9), pivots, triplets; 3) combining scale + arpeggio + triplet into lines over V7, then ii–V (thought as V); 4) minor; 5) 6-dim scale chords and drops for harmony; 6) apply to tunes | Medium |

### 2.2 What is generic jazz pedagogy, not specifically Harris
- "Bebop scales" with an added passing tone (David Baker's term and framing). Harris did not frame it as a "bebop scale"; he harmonised the added note (6-dim) or used half-step rules. A forum poster notes Harris's emphasis is on the scale *landing* on chord tones, not "chord tones on strong beats" as a rule in itself [V jazzguitar.be].
- Rootless A/B voicings (Bill Evans / Wynton Kelly via Mark Levine's *Jazz Piano Book*), guide tones, Coltrane patterns, digital patterns 1-2-3-5 (Jerry Bergonzi), CESH lines.

### 2.3 Drills to implement (Harris family), with MIDI checks
| Drill | Levels | Auto-check |
|---|---|---|
| Dominant scale descending from 1/3/5/7 with half steps, 2 octaves, 12 keys | RH only → LH → HT in 10ths | chord tones of the target dom7 on every beat (from MIDI onset grid); eighth-note evenness; swing ratio optional |
| 3-to-9 arpeggio + scale down | per key, up the cycle of 4ths | pitch-sequence match |
| Pivot patterns | 1-3-5-7 up, pivoted down | pitch-sequence match |
| Enclosure → chord tone | per chord tone, 12 keys | target on beat; approach notes ±1 semitone |
| 6-dim scale in block chords (4 voices), then drops | C → all keys; close → drop 2 → drop 3 | pitch-class set per beat alternates 6th chord / dim7; voices move in parallel; hand sync |
| Family of dominants | play C7 lines that substitute E♭7/G♭7/A7 | pitch classes ⊂ union of the dim-related chords |

---

## 3. Jazz and contemporary piano drills

| Drill | Content | Levels | Source |
|---|---|---|---|
| **Shell voicings** (Bud Powell) | LH 1-7 and 1-3 (or 1-10); ii–V–I alternating 1-7 / 1-3 / 1-7 for smooth guide tones | 12 keys through the cycle | Levine, *The Jazz Piano Book* (Sher, 1989) |
| **Rootless A/B voicings** | A = 3-5-7-9, B = 7-9-3-5. ii–V–I: Dm9 (A) → G13 (B) → Cmaj9 (A), or start on B. Tensions: 9 and 13 on V; ♭9/♯9/♭13 for minor ii–V | keys up a whole step (Levine's drill), cycle of 4ths, all 12 | Levine |
| **Guide-tone lines** | 3rds and 7ths only through a progression: one voice moves by step at most (7→3, 3→7) | half notes → quarter-note lines connecting guide tones | generic |
| **Walking bass LH** | quarter notes: root on 1, chord tones or scale on 2–3, **approach note on 4** (chromatic from above/below, or the dominant of the next root) | blues in F/B♭ → rhythm changes → standards | Levine; Ron Carter, *Building Jazz Bass Lines* |
| **Comping rhythms** | Charleston (1, &2), reverse Charleston (&1, 3), anticipations on &4, "Red Garland" &2/&4 | over swing backing, 120 → 240 bpm | generic |
| **Blues scale patterns** | 1-♭3-4-♭5-5-♭7, in 12 keys; groups of 3/4; licks over 12-bar | | generic |
| **Digital patterns** | 1-2-3-5 over each chord of ii–V–I and Giant Steps; inversions (5-3-2-1, 3-5-1-2...) | | Bergonzi, *Inside Improvisation vol. 1* |
| **Coltrane patterns** | 1-2-3-5 and 1-3-5-3 through major-third cycles (Giant Steps, Countdown) | slow → 280 bpm | |
| **Upper-structure triads** | Triads over a LH tritone (3-♭7): II/V7 = 13♯11, ♭VI/V7 = 7♯5♯9, ♭V/V7 = 7♭9♯11, VI/V7 = 13♭9, ♭III/V7 = 7♯9 | 12 keys | Levine ch. "Upper structures" |
| **Quartal ("So What")** | three 4ths + a major 3rd (E-A-D-G-B over Dm); McCoy Tyner 4ths in LH | | Levine |
| **Pentatonic / pop** | pentatonic runs, gospel 4-5-6 licks, "1-5-8-10" pop LH patterns, arpeggiated pop accompaniment | | generic |

---

## 4. Guitar drills (audio input)

### 4.1 Drill catalogue
| Drill | Content | Levels |
|---|---|---|
| **Chromatic 1-2-3-4 ("spider")** | 4 frets per string, one finger per fret; the 24 permutations (1234, 1324, 1243...); across strings ("walking spider") | frets 5–8 → 1–4 (wider stretch); 60 → 160 bpm in 16ths |
| **Alternate picking** | strict down-up on single string, then across strings (outside/inside picking; Troy Grady's "Cracking the Code" analysis of string-change mechanics: https://troygrady.com) | 8ths → 16ths → sextuplets |
| **Economy / sweep picking** | consecutive same-direction strokes on string changes; 3-string → 5-string sweeps of triad arpeggios | |
| **Legato** | hammer-on / pull-off trills (1-2, 1-3, 1-4 pairs), 3NPS legato runs | rate, evenness of hammered vs picked notes (volume) |
| **String skipping** | octave shapes, arpeggios skipping strings | |
| **Scales** | 5 CAGED positions; 3-notes-per-string (7 patterns); in all 12 keys | 1 position → connected; 1 → 5 positions |
| **Arpeggios** | CAGED triad shapes, 7th arpeggios, sweep basics | |
| **Chord changes** | **one-minute changes**: count clean changes between 2 chords in 60 s, log it and try to beat it (Justin Sandercoe: https://www.justinguitar.com/guitar-lessons/one-minute-changes-bc-114) | open chords → barre → jazz voicings |
| **Strumming patterns** | D-DU-UDU etc., 16th feel, muted strums (chucks) | |
| **Finger independence** | spider, "finger gym," hold-down exercises | |
| **Vibrato / bends** | bend to target pitch (half, whole, 1½ steps), hold, release; vibrato rate (4–7 Hz) and width (± 20–50 cents) | |
| **Barre endurance** | hold an F barre and pick every string clean for N seconds | |
| **Fingerpicking** | Travis pattern (alternating thumb bass 6-4 / 5-4 + melody), PIMA patterns, arpeggio patterns | |
| **Metronome ladders** | same as piano (+2–4 bpm when clean 3×) | |

### 4.2 What audio can and cannot measure (guitar)
| Measurement | Reliability from a phone/laptop mic | Method |
|---|---|---|
| Single-note pitch (which note, cents off) | **Good** for monophonic lines in quiet rooms | YIN / pYIN (de Cheveigné & Kawahara 2002, JASA 111:1917; Mauch & Dixon 2014 pYIN) |
| Onset timing vs click | **Good** (± 10–20 ms) for picked notes; **weaker** for legato (hammer-ons and pull-offs have soft onsets) and slow strums | spectral-flux onset detection (Bello et al. 2005, IEEE TSAP 13:1035); use headphones for the click so the mic does not hear it |
| Tempo, evenness (IOI CV) | **Good** for picked notes | from onsets |
| Bend target pitch, vibrato rate/width | **Good** (continuous f0 tracking) | pYIN f0 contour |
| Dynamics evenness | **Fair** (RMS per note; depends on mic distance and gain) | relative only, within a take |
| Chord correctness (polyphonic) | **Partial**: "is the expected chord sounding?" via chroma template matching against a *known* target is workable. Open transcription of arbitrary voicings is not reliable on mobile; neural models (e.g. Spotify Basic Pitch, Bittner et al. 2022, https://github.com/spotify/basic-pitch) are better but error-prone on guitar | chroma similarity to the target chord, muted/dead-string detection is hard |
| Clean chord change (one-minute changes) | **Fair**: count strums whose chroma matches the expected chord | user can self-count as fallback |
| Fingering, which string/position | **Not reliable** (the same pitch exists in several places; timbre cues are weak) | — |
| Picking direction, alternate vs economy | **Not measurable** from audio | — |
| Muting of unwanted strings | **Poor** | — |
| Strumming direction | **Poor** (some research on down/up strum classification; not robust) | — |

Overview of polyphonic transcription limits: Benetos et al., "Automatic Music Transcription: An Overview," IEEE Signal Processing Magazine 36(1), 2019.

---

## 5. What MIDI can measure: metric definitions and thresholds

### 5.1 Raw data
Note-on (pitch, velocity 1–127, timestamp), note-off (timestamp), CC64 sustain pedal (0–127; ≥ 64 = down on simple pedals; continuous on half-pedal-capable keyboards), CC67 soft pedal, CC66 sostenuto. Web MIDI timestamps (`event.timeStamp`, DOMHighResTimeStamp) are sub-millisecond, but USB-MIDI jitter is about 1 ms and Bluetooth MIDI about 5–15 ms or worse. **Calibrate latency** (play along with a click and take the median offset) before scoring absolute timing. Relative measures (IOI CV, hand sync) do not need calibration.

### 5.2 Metric definitions (proposed)
Let a drill have expected notes e_i (pitch, beat position b_i, hand, expected duration). Align performed notes p_j to e_i (greedy by pitch within a ±½-beat window, or DTW/score-following for long drills; e.g. Nakamura et al., "Performance error detection and post-processing for fast and accurate symbolic music alignment," ISMIR 2017).

| Metric | Definition | Proposed thresholds (to tune with real data) | Basis |
|---|---|---|---|
| **Accuracy** | correct = matched/expected; wrong = extra pitches not in expected set; missing = expected unmatched | "clean" = 100 % correct, 0 wrong; "pass" ≥ 95 % | standard |
| **Timing deviation** | d_i = t(p_i) − t(click_i) − latency (ms); report mean (bias: rushing < 0, dragging > 0) and SD | tight: SD < 15 ms; good < 25 ms; ok < 40 ms. Bias \|mean\| < 10 ms | sensorimotor sync SD in trained musicians ≈ 10–20 ms (Repp 2005, *Psychon Bull Rev* 12:969) |
| **Evenness (IOI CV)** | IOI_k = t_{k+1} − t_k within one hand; CV = SD(IOI)/mean(IOI) | even: CV < 4 %; very even < 2.5 %; uneven > 7 % | JND for timing displacement in isochronous sequences ≈ 2.5 % of IOI above ~250 ms, ≈ 6 ms absolute for shorter IOIs (Friberg & Sundberg 1995, JASA 98:2524) |
| **Scale evenness (research paradigm)** | SD of IOI (ms) for 2-octave C-major scales in 16ths at ♩=120 (8 nps) | professional pianists' SD-IOI typically ~ 10–20 ms [?]; dystonia patients higher | Jabusch, Vauth & Altenmüller 2004, *Movement Disorders* 19:171; Jabusch et al. 2009, *Human Movement Science* 28:74; van Vugt, Jabusch & Altenmüller 2013, *Front. Psychol.* 4:134 (thumb-passing produces systematic "fingerprint" timing deviations) |
| **Thumb-passage glitch** | IOI at thumb-under/over positions vs median IOI | flag if > 1.15× median repeatedly | van Vugt et al. 2013 |
| **Hand synchronisation** | for expected-simultaneous LH/RH notes: Δ = t_RH − t_LH; report mean (which hand leads) and mean \|Δ\| | together: \|Δ\| < 20 ms; ok < 30 ms; audible split > ~40–50 ms | "melody lead" of ~20–30 ms is normal expressive asynchrony (Palmer 1996, *Music Perception* 14:23; Goebl 2001, JASA 110:563) |
| **Chord spread** | max − min onset within one hand's chord | blocked: < 25 ms | Goebl 2001 |
| **Velocity evenness** | SD of velocity over notes meant equal; per-finger-position means | even: SD < 6; good < 9; uneven > 12 (velocity units) [?] | Jabusch 2004 used velocity SD for the same paradigm |
| **Dynamics target** | mean velocity within a band; bands calibrated per keyboard (see 5.3) | in-band ≥ 85 % of notes | |
| **Crescendo / diminuendo** | linear regression of velocity on note index: slope (vel/note) and R² | smooth: R² > 0.8, monotone; range ≥ 40 velocity units over 2 octaves | |
| **Accents** | accented minus unaccented mean velocity | ≥ 15 units, accent notes ≥ 90 % above neighbours | |
| **Articulation (legato)** | KOT = off(n) − on(n+1) (key-overlap time). KOR = KOT / IOI | legato: 0 < KOT ≤ ~ 40 ms (KOR 0–15 %); overlap > 60 ms = "smudged"; gap (KOT < −10 ms) = "detached" | Repp 1997, JASA 102:1878 (legato overlap on a digital piano decreases with IOI); Bresin & Battel 2000, *J. New Music Research* 29:211 |
| **Staccato** | KDR = duration / IOI | staccato: KDR ≤ 50 %; staccatissimo ≤ 30 %; portato 60–80 % | Bresin & Battel 2000 report staccato KDR around 25–40 % [?] |
| **Voicing / balance** | mean velocity of melody notes − mean velocity of accompaniment (same instant ± 50 ms) | ≥ +10 basic; ≥ +20 strong | Goebl 2001: velocity and melody lead are coupled |
| **Speed** | performed tempo (median IOI → bpm, nps), and the **clean-tempo**: highest tempo with a clean pass | progress = clean tempo vs goal | |
| **Hesitation** | IOI > 1.5 × median IOI | 0 for a clean pass | |
| **Fluency (sight-reading/pieces)** | stops (gap > 2 beats), restarts (a note repeated after an error) | | |
| **Fingering** | **not measurable** over MIDI (inferable only probabilistically from timing patterns; e.g. the thumb-passage glitch hints at a crossing but cannot verify it) | — | |

### 5.3 Velocity calibration (dynamics)
MIDI velocity → loudness mapping differs per keyboard and velocity curve. Calibrate once per device: the user plays a few notes "as soft as you can (ppp)," "normal (mf)," and "as loud as you can (fff)." Map the user's range [v_min, v_max] to target bands, e.g. ppp 0–8 %, pp 8–20 %, p 20–35 %, mp 35–50 %, mf 50–65 %, f 65–80 %, ff 80–92 %, fff 92–100 % (initial guess [?]). For uncalibrated defaults, typical notation-software mappings put pp ≈ 33, p ≈ 49, mp ≈ 64, mf ≈ 80, f ≈ 96, ff ≈ 112 (common MuseScore/Sibelius defaults [M]).

### 5.4 How apps do it (public information is thin)
| App | Approach | Source |
|---|---|---|
| Melodics | MIDI; per-note timing window (perfect / early / late), accuracy %, levels by tempo; "practice mode" slows down | https://melodics.com |
| Playground Sessions | MIDI; scores note accuracy and timing; a "rhythm" vs "notes" breakdown | https://www.playgroundsessions.com |
| Simply Piano (JoyTunes) | microphone recognition (also MIDI); waits for the correct note in learning mode; star scoring | https://www.hellosimply.com |
| flowkey | mic or MIDI; "wait mode" (waits for the right note), loops, slow tempo | https://www.flowkey.com |
| Piano Marvel | MIDI; scores note and rhythm accuracy as %; **SASR** (Standardized Assessment of Sight Reading): adaptive test from thousands of excerpts in **90 levels**; difficulty calibrated with scores from strong sight-readers (2020); 10–15 min; the music does not stop | https://pianomarvel.com/feature/sasr ; https://pianomarvel.com/article/the-ultimate-sight-reading-test |
| Yousician | mic (guitar, piano); onset and pitch windows; tempo ramps in practice mode | https://yousician.com |
None of these publicly report evenness (IOI CV), velocity SD, or hand-sync metrics. **That is a gap ToneTurn can fill** with "technique analytics" in the research tradition (Jabusch / Altenmüller scale analysis is the closest model).

---

## 6. Progress and practice science

| Principle | Evidence | Application |
|---|---|---|
| **Fix errors early and slow down when needed** | The best pianist-learners slowed down, isolated the error spot, and repeated until correct before speeding up (Duke, Simmons & Cash 2009, *J. Research in Music Education* 56:310) | Auto-detect the error location (bar/beat), offer "loop this spot at −15 %" |
| **Mastery criterion** | Repeated correct performances strengthen retention (Duke et al. 2009; generic mastery learning) | **clean 3×** in a row at a tempo before raising it |
| **Tempo ladders** | No single study fixes the step size. 3–5 % increments match teachers' practice and stay under the JND of tempo change for many listeners [M] | +2–4 bpm (or +3–5 %) per day; back off −10 % after 2 failed sets |
| **Interleaving (keys, drill types)** | Interleaved (random) practice gives worse in-session performance but better retention and transfer (Carter & Grahn 2016, *Front. Psychol.* 7:1251, clarinettists; Stambaugh 2011, JRME 59:368; Shea & Morgan 1979 contextual interference) | Rotate keys within a session (e.g. 3–4 keys per family per day) rather than 20 min of one key |
| **Spacing / distribution** | Distributed practice improves consolidation of a keyboard skill (Simmons 2012, JRME 59:357); spacing meta-analysis (Cepeda et al. 2006, *Psychol. Bulletin* 132:354). Sleep consolidates motor sequences (Walker et al. 2002, *Neuron* 35:205) | Short daily blocks beat one long weekly session; revisit each key on a spaced schedule (as ToneTurn's scheduler already does for ear items) |
| **Deliberate practice** | Effortful, goal-directed, with feedback (Ericsson, Krampe & Tesch-Römer 1993, *Psych. Review* 100:363); daily concentrated practice is limited (≈ 1 h blocks; ~4 h/day maximum for experts) | Every drill has one explicit goal (tempo, CV, velocity band) and immediate feedback |
| **Chunking** | Motor sequences are learned as chunks; fast passages are built from chunk boundaries (Sakai et al. 2003-type sequence learning) [M] | "Groups" rhythm variants (§1.6), stop-and-go; scale broken into 4-note groups first |
| **Slow practice** | Universal teacher advice; lets attention catch errors (Duke et al. 2009). Not a magic bullet alone | Allow sub-goal tempo; the ladder starts where the drill is clean |
| **Variable practice** | Variation (rhythms, articulations, dynamics) supports transfer (schema theory; contextual interference) | Rotate articulation/rhythm variants of the same scale |
| **Self-assessment and recording** | Self-evaluation is often inaccurate; objective feedback helps | The analytics themselves: show the IOI-per-note "evenness strip" and velocity curve |

### 6.1 Choosing "what to work on today" (proposed algorithm)
1. For each item (family × key × hand × motion × articulation), keep: clean tempo, goal tempo, last-practised date, and EWMAs of IOI CV, timing SD, velocity SD, hand sync, and accuracy.
2. **Weakness score** = weighted z-scores against the user's own median across keys (e.g. 0.35 × tempo gap to goal + 0.25 × CV + 0.15 × velocity SD + 0.15 × hand Δ + 0.10 × error rate) × a staleness factor (days since practice, spaced like an SRS).
3. Daily block: **1 warm-up** (easy, known), **2–3 weakest items** (ladder step), **1 maintenance** item (spaced review of something mastered), **1 variant** (rhythm/articulation/dynamics). Interleave keys.
4. Surface "hard keys": a 12-key heat map per family (tempo and evenness), and per-hand comparison.

### 6.2 Daily block length
- Technique block: **10–20 min/day** recommended (a typical teacher's "warm-up/technique" share of a 45–60 min practice). Single sets of 30–90 s; 5–8 sets per day.
- Hard cap on repetitions at the edge of speed (fatigue and tension risk). Warn about pain. Focal dystonia literature links excessive repetitive practice to risk in some musicians (Altenmüller & Jabusch 2010, *J. Hand Therapy* 22:144) [M].

---

## 7. Playing skills beyond drills (piano)

These are musical skills built from the drills. Each subsection gives **levels** and **MIDI-measurable metrics**, and each maps to a skill node in §8.

### 7.1 Left-hand voicings and chord changes

| Family | Content | Levels |
|---|---|---|
| Shells | 1-7, 1-3 (and 1-10) | L1 maj7/7/m7 in 3 keys → L2 ii–V–I all keys → L3 in time at 120 bpm → L4 through standards |
| Rootless A/B | 3-5-7-9 / 7-9-3-5 | L1 ii–V–I in C, F, B♭ → L2 all keys, A-start and B-start → L3 minor ii–V–I (ø7, 7♭9) → L4 tunes |
| Quartal | So What, 3-stack 4ths, McCoy LH 4ths | modal tunes (So What, Impressions) |
| Upper-structure triads | II, ♭III, ♭V, ♭VI, VI over a 3-♭7 tritone | after rootless |
| Voice leading | minimal motion between chords: each voice moves ≤ 2 semitones; 3rd ↔ 7th exchange | |
| **"One-minute changes" for piano** | alternate two (or cycle four) voicings with a click; count clean changes per minute | 20 → 40 → 60 → 90 changes/min; then on beat 1 of each bar at tempo |
| Progressions | ii–V–I all keys (cycle of 4ths, down in whole steps, down in half steps); 12-bar blues (basic, jazz, bird blues); rhythm changes A section; Autumn Leaves cycle (ii–V–I in relative major and minor); Coltrane changes | each at tempo bands |

**Metrics (MIDI):**
- **Chord correctness:** played pitch-class set ⊇ required tones (3rd and 7th; root when required) and ⊆ allowed tones (chord tones + allowed tensions). Avoid-note flags (e.g. natural 11 on maj7, ♭9 on maj).
- **Voicing type check:** interval structure bottom-up (shell, A, B, quartal, drop 2).
- **Voice-leading distance:** the minimal-cost matching between successive voicings; Σ|semitone movement| / number of voices. Target ≤ 1.5 for A↔B ii–V–I.
- **Change timing:** onset of the new chord vs the beat (ms); spread within the chord (< 25 ms "together").
- **Clean changes per minute:** a change counts when the chord is correct, in time (± 60 ms), and has no stray notes.
- **Register:** LH voicings kept in the range roughly C3–C5 (avoid mud below about E2/F2 for close voicings — "low-interval limits") [M].

### 7.2 Accompaniment patterns

| Family | Content | Levels | Specific metrics |
|---|---|---|---|
| **Stride** | bass on 1 and 3 (single note → octave → **10th**, played or rolled), chord on 2 and 4 in the middle register | 80 → 120 → 160 → 200+ bpm; I–IV–V → ragtime/stride tunes (Carolina Shout tradition) | leap **hit rate** (correct bass pitch); landing lateness of the bass (bass onset − beat); chord onset; bass-to-chord velocity balance (bass ≥ chord); 10th spread < 40 ms if blocked |
| **Walking bass** | quarter notes; chord tone on 1 (root or 3rd), approach on 4 (chromatic ±1, scale step, or dominant 5th above) | blues in F → rhythm changes → standards | % beat-1 chord tones; % beat-4 approach notes resolving by step/half-step to beat 1; IOI CV; legato overlap |
| **Boogie-woogie / ostinato** | 8th-note LH patterns (walking octaves, broken 6ths, the "Pinetop" pattern), shuffle feel | 12-bar blues; tempo bands | pattern accuracy, swing ratio stability, hand independence (RH timing not dragged by LH: RH timing SD unchanged vs RH alone) |
| **Alberti and broken-chord** | 1-5-3-5, waltz bass (oom-pah-pah), arpeggiated 1-5-8-10 | Classical (Clementi sonatinas) → pop | LH velocity < RH melody (balance), inner-note evenness (CV), legato |
| **Pop arpeggiated patterns** | 1-5-8-9-10, 8th and 16th patterns, ballad patterns with sustain | | as above + pedalling (§7.7) |

### 7.3 Comping, two-handed voicings, block chords
| Family | Content | Metrics |
|---|---|---|
| Comping rhythms | Charleston (1, &2), reverse Charleston, anticipations (&4 tied over), "push" chords, Red Garland (&2, &4); rhythmic vocabulary over swing backing | onset positions vs pattern template; swing ratio; anticipations land ≤ 30 ms of the "&"; variety (entropy of onset positions in a chorus) |
| Two-handed voicings | LH 2–3 notes + RH 2–3 notes (e.g. LH 7-3, RH 13-9-5); "So What" spread; 4-way close; | chord correctness across hands; hand sync < 20 ms |
| Drop 2 / block chords | 4-way close melody harmonisation → drop 2; Barry Harris 6-dim harmonisation (§2) | each melody note harmonised by correct chord (6th on chord tones, dim7 on passing tones); top voice loudest |
| **Locked hands** | melody doubled an octave below in LH with a 4-note chord between (Milt Buckner, George Shearing, Red Garland) | LH note = RH top − 12; hand sync |
| Lead-sheet realisation | melody on top + shell/rootless LH or full two-handed voicings, from chord symbols | melody notes correct (vs lead sheet); chord correct per symbol; melody on top (highest pitch); melody velocity lead |

### 7.4 Improvisation over a form
Forms: 12-bar blues (F, B♭, then all keys) → minor blues → rhythm changes → AABA standards (e.g. Autumn Leaves type ii–V cycles) → modal.
Drills: guide-tone lines (play 3rds/7ths connecting chords), **target notes** (land a chord tone on beat 1 of each chord), motif development (repeat, transpose, invert, rhythmically displace a 3–5 note motif), **call-and-response with the app** (app plays a 2-bar phrase, user answers or echoes), playing over a backing track (bass + drums + optional comp).

**What the app can objectively measure**
| Metric | Definition | Source / note |
|---|---|---|
| Chord-tone % on strong beats | % of notes on beats 1 and 3 (or every beat) that are chord tones of the current chord | standard feature in the Weimar Jazz Database / Jazzomat (Pfleiderer et al. 2017, *Inside the Jazzomat*, Schott; https://jazzomat.hfm-weimar.de) |
| Target-hit rate | % of chord changes where a chord tone (or guide tone) sounds within ± 1 eighth of the new chord's beat 1 | |
| Unresolved non-chord tones | non-chord, non-scale notes not resolved by step within one beat; or held avoid notes (> 1 beat) | proxy for "wrong notes against the chord" |
| Time feel vs click | mean timing offset (laid-back vs on-top), SD; swing ratio (long/short 8th) | jazz swing ratios vary with tempo, larger at slow tempos and approaching 1:1 at fast tempos (Friberg & Sundström 2002, *Music Perception* 19:333) |
| Range | pitch span; register use over time | |
| Rhythmic variety | entropy of onset positions within the beat/bar; distribution of note values; % rests | |
| Note density, phrase length | notes per bar; phrase = notes separated by rests ≥ 1 beat | |
| Motif development | recurrence of interval/rhythm n-grams (allowing transposition) across phrases | n-gram methods as in Jazzomat "MeloSpyLib" |
| Call-and-response | similarity of the response to the call: rhythm (onset-pattern distance), contour (up/down sequence), pitch (DTW) for echo tasks; for "answer" tasks, *related but different* (moderate similarity) | |
| Form tracking | still playing in the right place of the form (no lost bars): detect via chord-tone fit per bar | |

**What it cannot measure:** musicality, taste, storytelling, intentional dissonance (outside playing can be deliberate, so flag it but do not penalise heavily), originality, dynamics shaping as expression, "feel" beyond the timing proxies. Present these metrics as **descriptive feedback** ("you landed on chord tones at 9 of 12 changes"), not as a grade of the improvisation.

### 7.5 Sight-reading, transposition, playing by ear
| Skill | Drill | Levels | Metrics |
|---|---|---|---|
| Sight-reading at the keyboard (MIDI-graded) | unseen excerpts; the score scrolls/keeps going (no stopping), count-in | graded excerpt levels (as in Piano Marvel's 90-level SASR); RH → HT; keys; rhythms | pitch accuracy, rhythm accuracy (onset vs grid), **continuity** (no stops > 1 beat), recovery after error; adaptive level like an Elo/IRT model |
| Transposition | play a known melody or progression in N keys; or read in C and play in another key | 5-note melodies → melodies with chords → lead sheets | accuracy, latency to start, tempo |
| Playing by ear | app plays a phrase, user echoes on the keys; then melodies by ear; chord progressions by ear (I–IV–V, ii–V–I) | 3 notes → 2 bars → 4 bars; diatonic → chromatic | pitch-sequence edit distance, rhythm similarity; first-try % |

This links directly to ToneTurn's existing ear training: the *same* items get a keyboard-response mode.

### 7.6 Pedalling (sustain, CC64)
| Technique | Definition | Metrics |
|---|---|---|
| **Legato (syncopated) pedal** | release the pedal at the moment the new harmony is played, re-depress just after it (catches the new chord without blur) | t_up relative to the new chord onset: ideally −30 to +60 ms (around the onset); t_down − onset: +50 to +250 ms; **blur** = pedal held across a harmony change while old non-chord pitch classes still sound; **gap** = keys up and pedal up for > 30 ms between harmonies (sound break) |
| Direct / rhythmic pedal | pedal down with the chord, up before the next (dance styles, staccato effects) | t_down ≈ onset (± 40 ms), up before the next onset |
| Half-pedal, flutter pedal | partial depth (continuous CC64 on capable keyboards) | CC64 value in the 30–90 band |
| Una corda (CC67) | soft pedal for pp colour | presence flag |
Reference: Joseph Banowetz, *The Pianist's Guide to Pedaling* (Indiana UP, 1985). Pedal timing is fully measurable over MIDI, a strong differentiator for ToneTurn.

### 7.7 Levels summary for playing skills (proposal)
| Level | Voicings & changes | Accompaniment | Improv | Reading / ear | Pedal |
|---|---|---|---|---|---|
| P1 | triads I–IV–V, blocked | broken chords, waltz bass | call & response in C pentatonic | echo 3 notes | direct pedal |
| P2 | 7th chords root position, cadences in 6 keys | Alberti, pop 1-5-8 | blues scale over F blues | 2-bar echo; read RH melodies | legato pedal, slow changes |
| P3 | shells ii–V–I all keys | walking bass (roots + approach) | target chord tones on beat 1 (blues) | HT easy reading; transpose 5-note tunes | legato pedal per bar |
| P4 | rootless A/B all keys, one-minute changes ≥ 40 | stride with octaves 100 bpm; boogie | guide-tone lines, rhythm changes A | lead sheet: melody + shells | pedal with 2 changes/bar |
| P5 | upper structures, quartal, drop 2 | stride with 10ths 160 bpm; full walking | AABA standard, motif development | lead sheet: two-handed voicings; transpose in 3 keys | half-pedal |
| P6 | locked hands, 6-dim drops | stride 200+ | any form, backing track at tempo | sight-read at level X | all |

---

## 8. Proposed taxonomy for the app (piano first)

### 8.1 Structure
`Skill → Sub-skill → Drill family → Item (key × hand × motion × range × articulation × variant) → Level (tempo band + criteria)`

| Skill | Sub-skills | Drill families (examples) | Primary metrics |
|---|---|---|---|
| **Scales** | major, minor (nat/harm/mel), chromatic, modes/jazz scales | HS, HT parallel, contrary, 3rds/6ths/10ths apart, formula, double 3rds/6ths, octaves | clean tempo, IOI CV, timing SD, hand Δ, thumb-passage glitch, velocity SD |
| **Arpeggios & broken chords** | triads (root/inv), dom7, dim7, maj7/m7 | arpeggio 1–4 oct, broken patterns, blocked chords with inversions | as scales + leap/crossing glitch |
| **Harmony at the keys** | cadences, progressions, voicings | I–IV–I6/4–V7–I all keys, shells, rootless, UST, quartal, drop 2, 6-dim (Harris) | chord correctness, voice-leading distance, changes/min, chord spread |
| **Finger independence & dexterity** | 5-finger, held-note, trills, repeated notes | Hanon I–II patterns, Pischna/Dohnányi-style held notes, trills, repeats | IOI CV, velocity SD per finger position, rate |
| **Control** | articulation, dynamics, voicing | legato/staccato/portato scales, ppp–fff levels, cresc./dim., accents, melody over accompaniment | KOR/KDR, velocity band hit %, slope/R², melody velocity lead |
| **Advanced technique** | octaves, double notes, leaps, polyrhythm | octave scales, 3rds/6ths, stride leaps, 2:3 / 3:4 | pairing Δ, hit rate, ratio accuracy |
| **Rhythm & time** | pulse, subdivision, swing | rhythm variants, groups 3/4/5, accent shifting, swing 8ths | timing SD, bias, swing ratio |
| **Accompaniment** (§7.2) | stride, walking, boogie, Alberti, pop | — | hit rate, beat-1 chord tones, balance |
| **Comping & lead sheets** (§7.3) | rhythms, two-handed, locked hands, realisation | — | chord correctness + onset template |
| **Improvisation** (§7.4) | blues, rhythm changes, AABA; Harris lines (§2) | guide tones, targets, motif, call & response | chord-tone %, target-hit, time feel (descriptive) |
| **Reading & ear at the keys** (§7.5) | sight-reading, transposition, by ear | — | accuracy, continuity, similarity |
| **Pedalling** (§7.6) | legato, direct, half | — | t_up/t_down windows, blur/gap counts |

### 8.2 Difficulty ordering (scales and arpeggios)
| Axis | Order |
|---|---|
| Keys (major) | C → G → D → A → E → F → B → B♭ → E♭ → A♭ → D♭ → G♭/F♯ (with a "black-key-friendly" option to bring B, D♭, G♭ earlier for players who find them physically easy) |
| Keys (minor) | A → E → D → B → G → C → F♯ → F → C♯ → G♯ → B♭ → E♭/D♯ |
| Type | major → harmonic minor → melodic minor → natural minor (if taught separately) → chromatic |
| Hands | RH → LH → HT |
| Motion | parallel octave → contrary → parallel 3rd/10th → parallel 6th → formula → double 3rds/6ths (one hand) → octaves |
| Range | 1 → 2 → 3 → 4 octaves |
| Articulation | legato → staccato → mixed (one hand legato, the other staccato) |
| Dynamics | mf even → p even and f even → cresc./dim. → pp/ff extremes → accents in groups |
| Tempo bands | T1 → T7 (§1.8), with daily ladder steps inside each band |

### 8.3 Level definition (per item)
An item reaches level *n* when, at the tempo band's minimum, **3 consecutive clean passes** (100 % notes, no hesitations) meet: IOI CV < 5 % (T1–T2) / < 4 % (T3–T4) / < 3 % (T5+); timing SD < 30 / 25 / 20 ms; hand \|Δ\| < 30 / 25 / 20 ms (HT); velocity SD < 12 / 10 / 8 (when "even" is the goal). Thresholds are **starting proposals**: calibrate them against data from real users and the owner's own playing before fixing them.

### 8.4 Per-family metric sets (what to store)
| Family | Store per attempt | Derived per item |
|---|---|---|
| Scale / arpeggio | tempo, notes, wrong/missing, IOI series per hand, onset deviations, LH/RH Δ series, velocities, durations | clean tempo, CV, SD, Δ, glitch positions (thumb), weakest hand |
| Dynamics | velocities, target band | band hit %, slope, R², range |
| Articulation | durations, IOIs | KOR/KDR distribution |
| Chords/voicings | pitch sets per beat, onsets | correctness %, voice-leading distance, changes/min, spread |
| Accompaniment | per-beat pitch roles | hit rate, beat-1 %, balance |
| Improvisation | notes with chord context | chord-tone %, target-hit, swing ratio, entropy, range |
| Pedal | CC64 events with harmony changes | blur, gap, timing windows |

### 8.5 Guitar (later) taxonomy sketch
Skills: fretting-hand dexterity (spider, legato), picking (alternate; measurable only by result), scales (CAGED/3NPS, per key), arpeggios, chords (one-minute changes, measured by chroma match), rhythm (strumming, onsets vs click), expression (bends to pitch, vibrato rate/width), fingerpicking (Travis, onsets and bass/melody timing). Metrics: pitch accuracy (cents), onset timing SD, IOI CV, bend target error (cents), vibrato rate/width, chord-match %. Unmeasurable: fingering, picking direction, muting quality. Present those as self-reported checkboxes.

---

### Open questions / to verify
1. ABRSM 2021 speed table (only the pre-2021 guide numbers were retrieved).
2. Trinity minimum tempos.
3. Exact Barry Harris half-step rule list beyond the root→♮7→♭7 rule (sources disagree); best checked against the workshop videos or Kingstone's book.
4. Hanon Part III exercise-number groupings (marked [?]).
5. Thresholds in §5 and §8.3 are proposals: collect owner data (MIDI recordings of scales at several tempos) to calibrate them.
6. Minor-key fingerings in §1.1: double-check before displaying.

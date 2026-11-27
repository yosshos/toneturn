# Per-key exercises beyond the linear scale: inventory, catalogue, recommendations (2026-11-27)

The question: what technique and vocabulary exercises can be built from one key's scale and chords, to vary and enrich a key session in the new spiral format (SPEC-SPIRAL-PRACTICE)? Hands-together scale configurations (3rds, 6ths and 10ths apart, contrary, formula, polyrhythm, canon, opposed dynamics) are already catalogued in docs/RESEARCH-SPIRAL-PRACTICE.md §5 and are not repeated here.

Source tags:
- **[V]** verified this session (the page or catalogue entry was read).
- **[B]** the book or syllabus is confirmed, but the exercise content is known secondhand.
- **[U]** from memory or common teaching lore.
- **[R]** the repo's own canonical docs (docs/BARRY-HARRIS-THEORY.md, owner-confirmed).

Tiers: 1 = beginner (app T0–1), 2 = intermediate (T2–3), 3 = advanced (T4–5), 4 = expert (T6).

## Executive summary

- **The piano key ladder is already broad.** It has the harmonised scale (3rds, triads, 7ths, drop 2/3/2&4, triad inversions, 1-2-3-5 cells and 9th arpeggios on every degree), approach licks into every shape, Hanon-style motifs in all keys, octaves, canon and ostinato. Jazz families sit on top: Harris lines, 6th-diminished harmony, rootless voicings, triad pairs and bebop vocabulary. The gaps are specific, not wholesale.
- **The biggest gap is diatonic interval sequences on the piano: the scale broken in 4ths, 5ths, 6ths and octaves.** Guitar (`g-scales-10`: 3rds, 4ths, 6ths, 1-3-2-4) and bass (`b-scale-6`: 4ths) already have them. On piano only 3rds exist (k-sharm), plus broken 6ths and octaves as a forearm rotation drill.
- **The second gap is chords moving through a progression rather than up the scale.** Every k-sharm item walks the chords stepwise: I, ii, iii … Nothing in the key ladder arpeggiates the diatonic cycle of 5ths (I–IV–vii°–iii–vi–ii–V–I) or the secondary dominants of the key. That is how chords actually move in tunes, and how a jazz player hears a key.
- **Arpeggio shapes are thin.** These are missing:
  - 7th chords in inversions on every degree;
  - "rolling" broken-chord figures (Alberti / Czerny 1-5-3-5, 1-3-5-3-8) on every degree;
  - hand-over-hand (crossover) arpeggios;
  - stacked-3rds arpeggios to the 13th (the scale in 3rds over two octaves).
  All are staples of classical syllabi and of jazz ballad playing.
- **Two cheap jazz additions:**
  - **the key's own pentatonics** (major on I, IV, V; minor on ii, iii, vi) in 4-note groups;
  - **digital-pattern permutations** beyond 1-2-3-5 (5-3-2-1, 1-3-5-3, 3-5-1-…, 1-3-5-7 alternating direction) through the key's chords.
  Both build on existing generators.
- **Two classical additions:**
  - **trills and turns on every degree** (Pischna, Brahms WoO 6, Liszt S.146, all public domain [V]);
  - **diatonic 4- and 3-note scale groups** (1-2-3-4, 2-3-4-5 …).
  `sequenceMotif` in generate.ts already sequences any motif up and down a key, so the groups cost almost nothing to add.
- **Guide-tone lines through the diatonic cycle** (3rds and 7ths, one note per chord) are the best single bridge from technique to comping and lines. The app has guide tones only "over forms"; a per-key cycle version is missing.
- **Hand and finger independence (§2.7).** `k-indep` already covers the classic menu: held notes, two voices, ostinato, 2:3, legato against staccato, loud against soft. Four items would make independence walk the key:
  - held shapes on every degree's triad (Brahms WoO 6 / Dohnányi-type, public domain);
  - 4-5 and 3-4 pairs and trills on every diatonic pair;
  - one finger voiced louder in each diatonic chord (calibrated velocity);
  - the jazz form, a right-hand line over left-hand guide tones of the diatonic cycle.

  All four are measurable from note-off and velocity. They need two new goals: held-note integrity and voice-velocity margin.
- **Ear-hand items fit the spiral well as a short "angle".** Hear a 4-note motif, then play it sequenced from every degree of the key; or a call-and-response bar in the key. Both are MIDI-gradable.
- **Barry Harris material:** only what docs/BARRY-HARRIS-THEORY.md marks shown or confirmed should be added. No new Harris claims are proposed. Two existing devices, "arpeggio into the scale" and the dominant rule from every degree, could join the key rotation as visits.
- **Defer:** free improvisation without constraints (not fairly measurable), "Coltrane matrix"-type multi-key items (they are not per key), and any unverified named method content. Describe modern copyrighted books (Bergonzi, Coker, Levine, Ligon, Ricker, Campbell) as ideas only; never reproduce their pages.

## 1. Inventory: what the app already has per key (piano, plus guitar/bass notes)

Read from src/engine/drills/generate.ts (the catalogue, ~line 5500 on), harmLadder.ts (`k-sharm`), keyLicks.ts (`k-keylick`, `k-keyx`), indepDrills.ts, keyIndex.ts (the ladder rungs, blocks A–H, S, R) and the family file headers.

| Family / levels | Block | What it is (per key) |
|---|---|---|
| `scales` 1–4, 7–12, 14–18, 30–36 | A | Major/minor each hand 1–2 oct → HT → contrary → formula → 4 oct 16ths; 3rd/6th/10th apart; rhythm variants (dotted, groups of 3/4, moving accent); chromatic; modes; bebop; 6-dim scales |
| `k-sharm` 1–2 | S | The scale note by note, 2 octaves (major, modes, minors, Harris scales) |
| `k-sharm` 3–6 | S/B | Diatonic 3rds broken; 3rds together |
| `k-sharm` 7–10, 43–44 | S/B | Triads on every degree: arpeggiated, block (melody on top, LH root), root/1st/2nd inversion |
| `k-sharm` 11–14 | S/B | 7th chords on every degree: arpeggiated, block with LH root |
| `k-sharm` 15–18, 34 | B | Drop 2, drop 3, drop 2&4 up and down the scale |
| `k-sharm` 45–46 | B | 1-2-3-5 cells from every degree, 2 oct |
| `k-sharm` 47–48 | B | 9th chords on every degree, arpeggiated |
| `k-sharm` 19–33, 35–37 | F | Harris borrowing (1–3 voices, drop 2/3), eight expressions of V, brothers' scales, the elevator, the sixth on the fifth, a substitute on each V |
| `arpeggios` 1–16 | B | Tonic triads root/inversions, HT, 4 oct contrary; V7, °7, maj7/m7/ø7; broken chords through the inversions (8); V7 from every chord tone (10); blocked chords through inversions (13) |
| `k-keylick` 1–20 | C | Owner's approach licks (half step below; enclosure below–above / above–below; long enclosure) into every degree, 3rd, triad, 7th, up and down; HT in octaves; Aeolian, modes, melodic minor |
| `k-keyx` 1–7 | D | Broken octaves, octave leaps, canon, waltz/stride bass I–IV–V7–I, scale over ostinato (major, harmonic minor) |
| `fingers` 1, 6, 7, 13–18 | D | Five-finger patterns; Hanon 1–20 (and Hanon-style motifs via `sequenceMotif`) in all keys; Hanon 39–43; Czerny-style velocity; rotation (broken 6ths/octaves) |
| `k-indep` 1–12, `control`, `advanced` | D | Held notes, two voices in one hand, ostinato, 3:2/4:3, legato vs staccato, balance; octaves, double 3rds/6ths, leaps, hand crossing |
| `cadences` 1–7, `k-cadlib` | E | I–IV–V–I, ii6–V7–I, the circle, V/V, plagal/deceptive; cadence library incl. ii–V–I voicings |
| `voicings` 1–17, `k-reharm`, `k-vl`, `k-ctone` | E/apply | Shells, rootless A/B, quartal/So What, drop 2, tritone sub, upper structures, comping rhythms; voice-leading choice drills; common-tone reharm |
| `harris` 1–26, `k-harrisline` (32), `k-sixdim` 1–13 | F | 6-dim scales, triads/4-note chords on every degree, 3-to-9, pivots, enclosures, half-step rules from any start, chromatic scale, brothers, block-chord harmony |
| `jazz`, `k-bebop`, `k-vocab` | F/apply | Digital patterns 1-2-3-5, target/guide-tone notes over forms, locked hands, Coltrane changes; bebop lines over ii–V–I, blues, rhythm changes; enclosure vocabulary |
| `k-tpair` (16), `k-theory` 1–7, `k-modes` | F | Triad pairs (patterns, hexatonic, voicings, lines); pentatonic superimposition over a vamp; upper structures; bebop dominant on V |
| Guitar `g-scales-10`; `g-harm`, `g-arps`, `g-tpair`, `g-harris` | A/B/F | Interval sequences in position (3rds, 4ths, 6ths, 1-3-2-4); harmonised scale on string sets; arpeggios |
| Bass `b-scale-6`, `b-chord`, `b-barry`, `b-tpair` | A/B/F | Major scale in 3rds and 4ths; chord-tone arpeggios; Harris; triad pairs |

**Generators already in place, so new items are cheap:**
- `sequenceMotif` sequences any degree motif up and down the key (generate.ts:1191).
- `harmLadder` builds any diatonic shape on every degree, for any of 13 scales.
- The `variant` layer provides dotted, short-long, groups of 3/4, a moving accent, articulation and dynamics.

## 2. Catalogue of candidate per-key exercises

"Inst" uses P = piano, G = guitar, B = bass. "In app" is: yes, partial, or no (piano unless stated).

### 2.1 Diatonic sequences and patterns on the scale

| # | Exercise | Trains | Tier | Inst | Source | In app |
|---|---|---|---|---|---|---|
| S1 | **Scale in 4-note groups** (1-2-3-4, 2-3-4-5 …; down 8-7-6-5, 7-6-5-4 …) | Evenness, thumb-under inside a pattern, scale map | 1–2 | P G B | Universal; Czerny Op. 821 lists "scalar figurations" [V] | partial (Hanon-style motif 1 is 5-note 1-2-3-4-5-4-3-2) |
| S2 | **Scale in 3-note groups** (1-2-3, 2-3-4 …) in triplets | Same, against triplet pulse; ties to the triplet stage | 1–2 | P G B | [U] common | no (groups3 is an accent, not a figure) |
| S3 | **Up-a-step-down groups** (1-2-3-1, 2-3-4-2 …) and the "turned" 4-group (1-2-3-2?) [U] | Direction changes, finger turning | 2 | P G B | [U] | no |
| S4 | **Broken 3rds, both orders** (C-E D-F … and E-C F-D …; and alternating up/down: C-E, F-D, E-G …) | Interval vision; 1-3-2-4 vs 3-1-4-2 | 1–2 | P G B | Guitar/sax pedagogy standard [U]; app's guitar 1-3-2-4 | partial (k-sharm 3b is one order) |
| S5 | **Broken 4ths through the key** (C-F D-G E-A F-B …) | Quartal ear inside a key; wider stretches; modern-jazz sound | 2 | P G B | [U]; quartal pedagogy (Ricker's *Technique Development in Fourths*) [U] | no on piano (guitar, bass yes) |
| S6 | **Broken 5ths, 6ths, 7ths, octaves** | Hand extension, accuracy over distance, interval recognition | 2–3 | P G B | Liszt S.146 runs patterns through all keys [V] | partial (broken 6ths/octaves as a rotation drill) |
| S7 | **Solid diatonic 6ths (double-note), and solid 4ths** | Double-note control | 3–4 | P | Liszt S.146 Bk 3 "scales in thirds and sixths" [V] | partial (double 3rds/6ths in `advanced-4`, few keys) |
| S8 | **Hanon-type 5-finger motifs sequenced in the key** (more motifs than 6) | Finger independence | 1–3 | P | Hanon 1873 [B]; app motifs own | yes (`fingers-6/15–18`) |
| S9 | **Trill pairs on every degree** (1-2, 2-3, 3-4 trills climbing; with turn) | Weak-finger speed, trill control | 2–3 | P | Pischna 1887 [V: PD, 60 progressive exercises; trill content per catalogue title "études de trilles" [B]]; Brahms WoO 6 trills section [V] | no |
| S10 | **Turns / mordents on every degree** (upper-neighbour turn into each scale note) | Ornament fluency, classical and bebop turn | 2 | P G | Brahms/Philipp grouping [V]; bebop "turn" figures [U] | partial (ornaments on a five-finger melody only) |
| S11 | **Repeated-note groups** (4-3-2-1 on each degree) | Fast repetition | 2 | P | [U]; app has it in C | partial (`fingers-5/14`) |
| S12 | **Dohnányi-type held-note patterns transposed to the key** | Independence | 3 | P | Dohnányi, *Essential Finger Exercises*, Rózsavölgyi 1929 [V]; in the US public domain since 2025 under the 95-year rule [inference]; content [U] | partial (`k-indep` held notes) |

### 2.2 Arpeggios

| # | Exercise | Trains | Tier | Inst | Source | In app |
|---|---|---|---|---|---|---|
| A1 | Triads on every degree, root position and inversions | Harmonic map | 1–2 | P G B | ABRSM/Trinity arpeggio and broken-chord sets [B] | yes (`k-sharm` 7–10, 43–44) |
| A2 | **7th chords on every degree in all 4 inversions** (1-3-5-7, 3-5-7-1, 5-7-1-3, 7-1-3-5) | Starting a chord from any tone, a jazz must | 2–3 | P G B | Common jazz practice [U]; app's "V7 from every chord tone" covers V only | partial (`arpeggios-10` V7 only) |
| A3 | **Rolling broken chords on every degree** (1-5-3-5 Alberti; 1-3-5-3; 1-3-5-8-5-3) | Rotation, classical accompaniment, LH texture | 1–2 | P | Czerny Op. 821 "arpeggios, chord progressions" [V]; Liszt S.146 Bk 10 "broken chords with various fingerings throughout all major and minor scales" [V]; ABRSM broken chords [B] | partial (Alberti in C/accomp; `arpeggios-8` tonic only) |
| A4 | **Arpeggiate the diatonic cycle of 5ths** (I–IV–vii°–iii–vi–ii–V–I), triads then 7ths, nearest inversion each time | Real chord motion; voice leading inside an arpeggio | 2–3 | P G B | Circle-of-5ths harmonic sequence: standard theory [U]; app has it only as block chords (`cadences-4` "the circle") | no as arpeggio |
| A5 | **Arpeggios "in skips": triads by descending 3rds** (I–vi–IV–ii–vii°–V–iii–I) | Common-tone ear (2 shared notes) | 2 | P G B | [U] | no |
| A6 | **Stacked 3rds to the 13th from every degree** (1-3-5-7-9-11-13, 2 octaves, then down) | Chord-scale = arpeggio; tensions in the key | 3 | P G | Jazz chord-scale teaching [U]; app has 9ths | partial (`k-sharm-47/48` to 9) |
| A7 | **Quartal arpeggios on every degree** (3 stacked diatonic 4ths, up and down) | Modern sound; McCoy-style lines | 3 | P G B | Ricker (quartal) [U]; app has quartal voicings only | partial (`voicings-7/8` block) |
| A8 | Upper-structure triads of the key over the root (e.g. V over I = maj9 colour; ii over V = V9sus) | Hearing triads as tensions | 3 | P G | Levine, *The Jazz Piano Book* 1989 covers upper structures [B] | partial (`k-theory-2`, not per key cycle) |
| A9 | **Hand-over-hand (crossover) arpeggios** of every diatonic chord, 3–4 oct | Ballad fills, flowing arpeggios, crossing | 2–3 | P | [U]; classical/pop teaching | no |
| A10 | 2–4 octave arpeggios of every diatonic chord, HT | Range, thumb crossing | 2–3 | P | ABRSM style [B] | partial (tonic only) |
| A11 | **Arpeggios in 3rds and 6ths (double-note arpeggios)** | Advanced double notes | 4 | P | Liszt S.146 Bk 11 [V] | no (defer) |
| A12 | Spread / open (10th) voicings arpeggiated on every degree (1-5-10, 1-7-10) | LH for solo piano, reach | 3 | P | Siskind-type LH (repo: `k-lh` walking 10ths) [R] | partial (in solo-piano families, not per degree) |

### 2.3 Chord-scale and harmony in the key

| # | Exercise | Trains | Tier | Inst | Source | In app |
|---|---|---|---|---|---|---|
| H1 | Harmonised scale in triads, 7ths, drop 2, drop 3, drop 2&4 | Voicing map | 2–4 | P G | Standard [U] | yes (`k-sharm`) |
| H2 | **Shells (1-3-7 / 1-7-3) through the diatonic cycle** I–IV–vii–iii–vi–ii–V–I | Smooth LH, alternating shell forms | 2 | P G | Common jazz pedagogy [U] | partial (shells on ii–V–I, blues) |
| H3 | **Guide-tone line through the diatonic cycle** (3rd → 7th → 3rd …, one note per chord, two lines: from 3 and from 7) | The voice-leading skeleton of tunes | 2 | P G B | Ligon, *Connecting Chords with Linear Harmony* 1996: outlines built on 3–7 resolutions [B] | partial (guide tones over forms; colorDrills guide-tone top line) |
| H4 | **Rootless A/B through the diatonic cycle and ii–V–I in the key** | Comping vocabulary | 3 | P | Levine 1989 (rootless, A/B as commonly labelled) [B] | partial (`voicings-13` through progressions) |
| H5 | **Secondary dominants of the key** (V/ii, V/iii, V/IV, V/V, V/vi), each resolving: shell, then arpeggio | Functional harmony, hearing tonicisation | 2–3 | P G B | Standard theory [U] | partial (V/V in `cadences-4`) |
| H6 | Cadences: I–IV–V–I, I–vi–ii–V, iii–vi–ii–V–I, plagal/deceptive | Key sense | 1–2 | P G B | ABRSM/classical [B] | yes |
| H7 | **Turnarounds in the key with substitutions** (I–VI7–ii–V, iii–VI7–ii–V, tritone sub) | Jazz idiom | 3 | P G B | Standard [U] | partial (cadence library, reharm) |
| H8 | **Melody harmonised in block chords** (4-way close / locked hands on each scale note) | Block-chord technique | 3–4 | P | Shearing locked hands [U]; Harris 6th-dim block chords [R] | yes (`jazz-8`, `k-sixdim`) |
| H9 | Voice-leading choice drills (learner picks the next voicing) | Ear + hand | 3 | P G | App's own | yes (`k-vl`) |
| H10 | Harris borrowing, elevator, eight expressions of V | Harris harmony | 3–4 | P G | docs/BARRY-HARRIS-THEORY.md [R] | yes (k-sharm F levels, `k-sixdim`) |

### 2.4 Jazz line vocabulary per key

| # | Exercise | Trains | Tier | Inst | Source | In app |
|---|---|---|---|---|---|---|
| J1 | 1-2-3-5 cells on every degree | Coltrane-style cell | 2–3 | P G B | Digital patterns: Coker, *Patterns for Jazz* (400+ chord/scale patterns) [B]; Bergonzi, *Melodic Structures* (Inside Improvisation vol. 1) [B, content U] | yes (`k-sharm-45/46`, `jazz-2`) |
| J2 | **Digital permutations through the diatonic chords**: 5-3-2-1, 1-3-5-3, 3-5-1-?, 1-2-3-5 up then 5-3-2-1 down alternating; 1-3-5-7 / 7-5-3-1 alternating | Breaking the "always from the root, always up" habit | 2–3 | P G B | Coker / Bergonzi idea only [B] | no (only 1-2-3-5 and plain 7th arps) |
| J3 | **Arpeggio up, scale down** on each diatonic chord | Line shape; Harris "arpeggio into the scale" | 2–3 | P G B | [R] (shown, sourced) | yes (in `harris` / `k-harrisline`), not as a key rung |
| J4 | Approach notes and enclosures into every chord tone | Bebop articulation of targets | 2–4 | P G B | Owner's lick rules [R]; bebop vocabulary | yes (`k-keylick`, `k-vocab`) |
| J5 | Harris half-step rules descending from each chord tone | Chord tones on beats | 3 | P G B | [R] §8 | yes (`harris-14`, `k-harrisline`) |
| J6 | Bebop major scale (6-dim) / bebop dominant on V | Chord tones on beats | 3 | P G B | [R] | yes |
| J7 | **The key's six pentatonics** (major on I, IV, V; minor on ii, iii, vi) in 4-note groups (1-2-3-5, then a pentatonic "group" sequence), 2 oct | Modern line vocabulary, wide intervals; same notes as the key | 2–3 | P G B | Ricker, *Pentatonic Scales for Jazz Improvisation* (1976, Studio P/R) [B]; I/IV/V pentatonics from a major scale is standard [B] | partial (`k-theory-1` superimposition over a vamp, not per key set) |
| J8 | Triad pairs inside the key (IV/V for major; ♭VI/♭VII for minor) | Hexatonic lines | 3 | P G B | Campbell, *Triad Pairs for Jazz* [U]; repo triadPairs.ts | yes (`k-tpair-2` ionian, lydian) |
| J9 | Chromatic passing tones between scale degrees (Harris chromatic scale) | Chromatic lines with degrees on beats | 3 | P G B | [R] §9 (owner-confirmed) | yes |
| J10 | **Guide-tone line embellished**: the 3–7 line with one approach note before each target | From skeleton to line | 3 | P G B | Ligon "outline with chromatic approach tones" [B] | no |
| J11 | Seven down to the 3rd; 3-to-9 / 3-to-♭9 on the key's V | Harris dominant devices | 3 | P G B | [R] (switched on) | yes |

### 2.5 Rhythm and articulation layers (apply to any of the above)

The app's `variant` layer already holds even, dotted, short-long, groups of 3/4 accents and a moving accent, plus articulation and dynamics. Worth adding:
- **swing 8ths** with accents on the upbeats (the jazz articulation of any line);
- **displacement**: the same figure started on the "and";
- **3-over-4 grouping**: a 3-note figure in 8ths, so the accent rotates;
- **ghosted notes** (velocity drop on non-targets). This is measurable by velocity bands, which the app already calibrates.

Sources: [U] common jazz practice; the triplet stage is already in SPEC-KEY-SESSION-2 §3.7.

### 2.6 Ear and hand integration per key

| # | Exercise | Trains | Tier | Inst | Source | In app |
|---|---|---|---|---|---|---|
| E1 | **Hear a 3–4 note motif, then play it sequenced diatonically from every degree** (no notation) | Transposition by ear, audiation | 1–3 | P G B | Gordon-style audiation / Kodály sequencing [U] | no (`k-ear` exists but is other content) |
| E2 | **Call and response in the key**: a 1-bar phrase from the band, answered with a transposed or varied bar | Phrasing, ear | 2–3 | P G B | [U]; app phrase drills exist | partial (`k-phrase` on block R) |
| E3 | Constrained improvisation on one chord-scale (e.g. only chord tones on beats; only the key's pentatonic on I) | Applying the material | 2–3 | P G B | App's rule-graded improv [R] | partial |
| E4 | Play a known melody (a folk or own tune) in the key by ear | Key fluency | 2 | P G B | [U] | partial (My song) |

### 2.7 Hand and finger independence built in one key

**What MIDI can measure here:**
- **Timing:** every note-on.
- **Velocity:** per note, and per finger only where the pitch-to-finger mapping is fixed. That holds in a five-finger position or a held-note shape; in free fingering, velocity is per note or per hand only.
- **Hand:** by register, or by assignment when the hands don't overlap.
- **Holding and legato:** note-off times give held-note integrity (released too early?) and legato overlap (ms between one note's release and the next note-on; slight overlap is legato, a gap is detached).
- **Not measurable:**
  - silently depressed keys (most keyboards send nothing, or a velocity-1 note-on);
  - wrist or arm motion;
  - which finger actually played, when the position is free.

Velocity is meaningful only after the app's per-device velocity calibration (velCal.ts, device settings).

| # | Exercise (in the key) | Trains | Tier | MIDI measure | Source | In app |
|---|---|---|---|---|---|---|
| I1 | **Five-finger diatonic patterns per key** (1-2-3-4-5-4-3-2, 1-3-2-4-3-5, each hand, HT parallel and contrary) | Finger equality, the key's geography under one hand | 1 | Timing, per-finger velocity evenness (fixed position), legato overlap | Universal; Cortot ch. 1, "evenness, independence and mobility of the fingers" (5 chapters, Salabert) [B] | yes (`fingers-1`, Hanon-style motifs) |
| I2 | **Held notes on the key's degrees**: hold 1 and 5 (the tonic 5th) while 2-3-4 play diatonic figures; then hold the triad of each degree while the free fingers play neighbour notes | Independence of each finger from its neighbours; weak-finger lift | 2 | Held note-offs stay down (integrity), timing and evenness of the moving fingers | Brahms WoO 6, group "finger extensions while holding notes" [V]; Dohnányi 1929 [V publication, content U]; Pischna 1887 [V PD, content U] | partial (`k-indep-1/2`, `k-indep-9`: held notes, held chord; not walked through every degree's triad) |
| I3 | **Held chord shape walks the scale**: each diatonic triad/7th held as a block, one finger at a time re-strikes (1, 2, 3 …), then moves to the next degree | Independence inside a chord shape; prepares voicing control | 2–3 | Integrity of held notes, re-strike timing, velocity of the re-struck note | Pischna/Dohnányi-type idea [U] | no |
| I4 | **Weak-finger (3-4-5) work on the degrees**: 4-5 and 3-4 alternations and trills on every adjacent diatonic pair, each hand | Strength and speed of 4 and 5 | 2–3 | Alternation rate, evenness (inter-onset variance), velocity balance between the two fingers | Pischna and Brahms WoO 6 (trill group) [V/B]; Hanon Part I [B] | no (Hanon motifs touch it; no dedicated item) |
| I5 | **Trills and alternations on diatonic pairs climbing the scale** (1-2, 2-3, 3-4, 4-5 fingerings; measured trill with a turn ending) | Trill control; ornament in context | 2–3 | Notes per second over a fixed span, evenness, clean ending | Brahms WoO 6 trills [V]; Liszt S.146 [V, patterns through all keys] | no (= S9) |
| I6 | **Double 3rds / 6ths in one hand, slow legato** (finger legato on the top voice, 1-octave, before the fast forms) | Finger independence in two voices of one hand | 3–4 | Simultaneity of the pair (onset spread), legato overlap of the top voice | Cortot ch. "double notes" [B]; Liszt S.146 Bk 3 [V] | partial (`k-sharm-5/6` 3rds together; `advanced-4` double 3rds/6ths at T6, few keys) |
| I7 | **Two voices in one hand** in the key: a held upper melody note while the lower fingers walk the scale (or the reverse) | Polyphonic independence (Bach-type) | 3 | Held-note integrity, moving-voice timing | Cortot ch. 5 polyphonic playing [B]; Brahms [V] | yes (`k-indep-3`, `k-indep-10` harmonic minor) |
| I8 | **Voicing one finger louder within a chord**: the diatonic triads/7ths in block form, the top note louder, then the bottom, then an inner voice (rotate the voiced finger) | Finger-weight control; jazz "melody on top", classical voicing | 2 (top) → 3 (inner) | Velocity difference of the target note vs the others (≥ a calibrated margin), per chord | Classical voicing practice [U]; Cortot (independence) [B] | partial (`control-8` hand balance; variant "top voice sings"; `k-sharm` block triads with the melody on top, without a velocity goal per voice) |
| I9 | **Hands in different diatonic patterns at once**: RH scale over LH broken chord of the same degree (I under 1-2-3-4, IV under 4-5-6-7 …); then RH broken chords against an LH scale | Hand independence with key-internal harmony | 2–3 | Per-hand timing; each hand's notes graded separately | Czerny Op. 821 "runs and figuration over the LH" type [V/B] | partial (`k-keyx-5` scale over an ostinato; `control-7` melody over Alberti; `fingers-13`) |
| I10 | **RH diatonic line over LH guide tones of the cycle** (LH: 3rd/7th per bar, I–IV–vii–iii–vi–ii–V–I; RH: the scale or 1-2-3-5 cells on each chord) | The jazz independence skill: comping and line together | 3 | Per-hand timing; the LH holds through the bar (integrity); the RH line graded by the line grader | Jazz pedagogy (LH shells + RH line) [U]; Ligon guide tones [B] | partial (`k-bebop-7` shells and a line over ii–V–I; `voicings-17`) |
| I11 | **Different rhythms per hand on the key's notes**: RH scale in triplets against LH scale in 8ths (2:3), 16ths against triplets (3:4) | Polyrhythmic independence | 3–4 | Per-hand inter-onset regularity against the click | Cross-ref docs/RESEARCH-SPIRAL-PRACTICE.md §5 (polyrhythm) | yes (`advanced-2/6/7`, `k-indep-5`) |
| I12 | **Legato in one hand, staccato in the other; one hand loud, the other soft**, on the key's scale | Touch independence | 2–3 | Duration ratio (note-off) per hand; velocity difference per hand | Cross-ref RESEARCH-SPIRAL §5 | yes (`k-indep-6/7`, `k-indep-11/12`) |
| I13 | **Finger substitution on a held key** (change 3→1 or 4→1 without releasing) through the scale, organ-legato | Legato without pedal, quiet hands | 3 | Partly: no gap in the note (no re-strike) and the next note's overlap. The finger change itself is invisible. | Organ/classical legato practice [U] | no; defer (the key skill isn't measurable) |
| I14 | **Silent-press "finger lifts"** (keys held down silently, one finger lifts and strikes) | Independence | 2–3 | Not reliably: silent presses send no notes | Dohnányi/Cortot-type [U] | no; avoid as a graded item (offer as an ungraded warm-up at most) |

**Takeaways for independence:**
- The app already covers the classic menu well: `k-indep` 1–12, polyrhythm, touch and balance, two voices.
- The gaps are making it **walk the key**:
  - held shapes on every degree (I2, I3);
  - the 4-5 pairs on every degree (I4, I5);
  - velocity voicing per chord and voice (I8);
  - the jazz form of hand independence, a line over LH guide tones of the cycle (I10).
- All four are measurable with note-off and calibrated velocity.

## 3. Recommendations

### 3.1 Selection criteria

- **A new angle in the key**, not another form of the same motion. The rotation rule in SPEC-SPIRAL §2.3 says never two visits of one kind in a row, so the session needs kinds.
- **Transfer to real playing:** lines, comping, accompaniment.
- **Measurable:** notes, timing and (where useful) velocity, graded by the existing line/chord graders.
- **Buildable from existing generators** (`sequenceMotif`, `harmLadder` shapes, `keyLicks` rules).
- **Sources:** public domain, or idea-level only.

### 3.2 Top 18, ordered by value (including independence)

| Rank | Addition | Kind (rotation slot) | Tier | Why it ranks here | Build note |
|---|---|---|---|---|---|
| 1 | **Diatonic interval sequences, broken: 4ths, 5ths, 6ths, octaves** (S5, S6), each hand, then HT | A-angle "intervals" | 2 (4ths) → 3 | Largest piano gap; guitar/bass already have it; trains interval vision and stretch | `sequenceMotif([0,k])` with k = 3…7 degrees |
| 2 | **Arpeggiate the diatonic cycle of 5ths**, triads → 7ths, nearest inversion (A4) | B-angle "progression" | 2–3 | Turns "chords up the scale" into "chords as they move in tunes" | harmLadder shapes on a degree order 1-4-7-3-6-2-5-1 |
| 3 | **Guide-tone lines through the cycle**, from the 3rd and from the 7th, then with one approach note (H3, J10) | E/F-angle "skeleton" | 2 → 3 | The best bridge to comping and lines; very short items | Two notes per chord; line grader; approach from keyLicks rules |
| 4 | **RH line over LH guide tones of the cycle** (I10), after #3 | D-angle "independence" | 3 | Jazz hand independence (comp + line) made per key; reuses #3's LH | Per-hand grading; LH held-note integrity |
| 5 | **7th chords on every degree in all inversions** (A2) | B | 2–3 | Starting any chord from any tone is core jazz technique; extends existing V7-from-every-tone | harmLadder `7a` with a rotation offset |
| 6 | **Held notes walking the key** (I2, I3): hold the tonic 5th, then each degree's triad, while the free fingers play diatonic figures or re-strike | D "independence" | 2 → 3 | The classic Brahms/Dohnányi independence work, but in the key and through its chords; PD sources | Note-off integrity goal for held notes (new goal type), timing for movers |
| 7 | **Scale in 4-note and 3-note groups** (S1, S2) | A-angle "groups" | 1–2 | Beginner-friendly variety; triplet groups fit the triplet stage | New motifs [0,1,2,3] and [0,1,2] in `sequenceMotif` |
| 8 | **Voicing one finger louder in the diatonic chords** (I8): top, then bottom, then inner voice | E/D "touch" | 2 → 3 | Serves both camps (classical voicing, jazz melody-on-top / block chords); unique use of velocity | Velocity margin goal per chord, after velocity calibration |
| 9 | **Rolling broken chords on every degree** (Alberti 1-5-3-5, 1-3-5-3-8) (A3), also RH scale over LH broken chord of the same degree (I9) | B/D | 1–2 | Classical common ground, LH accompaniment, rotation; PD sources (Czerny, Liszt) | Per-degree broken-chord figure; I9 adds the RH |
| 10 | **Shells and rootless A/B through the diatonic cycle** (H2, H4) | E | 2 → 3 | Comping in the key itself, not only ii–V–I | `k-cadlib`/voicings generator with the cycle |
| 11 | **The key's pentatonics in 4-note groups** (J7) | F/C | 2–3 | Jazz-first and very idiomatic; same notes as the key, so it's safe for intermediate players | 6 pentatonics × group motif; idea only from Ricker |
| 12 | **4-5 / 3-4 alternations and trills on every diatonic pair, with turns** (I4, I5, S9, S10) | D "finger" | 2–3 | Weak-finger work in the key; turns are bebop vocabulary too; PD (Pischna, Brahms) | Short figures sequenced by degree; evenness + velocity balance |
| 13 | **Digital permutations through the diatonic chords** (J2) | C/F | 2–3 | Breaks the root-up habit; cheap | Variants of the k-sharm `c4` generator |
| 14 | **Secondary dominants of the key** as shell → arpeggio → resolution (H5) | E | 2–3 | Functional ear; leads to turnarounds | Chords from the key's degrees |
| 15 | **Hear-and-sequence a motif through the degrees** (E1) | R-angle "ear" | 1–3 | A different sense in the rotation; real transposition skill | Play the motif once, no notation; grade as a line |
| 16 | **Hand-over-hand arpeggios of the diatonic chords** (A9) | B/D | 2–3 | Ballad/pop fills; crossing; a big visual "wow" | Alternate-hand arpeggio, 3–4 oct |
| 17 | **Stacked 3rds to the 13th on every degree** (A6) | B | 3 | Tensions inside the key; extends the 9ths | harmLadder up to 7 chord tones |
| 18 | **Quartal arpeggios on every degree** (A7) | B/F | 3 | Modern sound; links to So What voicings | Diatonic 4ths stacks, linear |

Slow legato double 3rds (I6) is the next candidate after these. It is already partly there (`k-sharm` 3rds together, `advanced-4`). Bring it forward to T4 in one octave, with a top-voice legato-overlap goal, rather than as a new family.

### 3.3 How they fit the tiers and the rotation

- **T0–1:**
  - the scale (A-1…A-3);
  - five-finger patterns per key (I1, exists);
  - 4- and 3-note groups (#7);
  - rolling broken chords on I, IV and V only (#9);
  - hear-and-sequence with 3-note motifs (#15).

  This gives a beginner three kinds for a ROT_MAX = 2 rotation: scale, groups, broken chord.
- **T2–3:**
  - broken 4ths (#1);
  - the cycle of 5ths in triads (#2);
  - guide tones from the 3rd (#3);
  - 7th inversions (#5);
  - held tonic 5th (#6);
  - top-voice voicing (#8);
  - RH scale over LH broken chord (#9);
  - shells through the cycle (#10);
  - pentatonics (#11);
  - 4-5 / 3-4 pairs and turns (#12);
  - digital permutations (#13);
  - secondary dominants (#14);
  - hand-over-hand (#16).
- **T4–6:**
  - 5ths/6ths/octaves broken (#1);
  - the cycle in 7ths and drop 2 (#2);
  - guide tones with approach notes (#3);
  - RH line over LH guide tones (#4);
  - held triads on every degree (#6);
  - inner-voice voicing (#8);
  - rootless through the cycle (#10);
  - 13ths (#17);
  - quartal (#18);
  - slow legato double 3rds (I6).
- **Rotation kinds.** Tag each addition with a kind so §2.3's "never the same kind twice" rule has real variety. Proposed kinds:
  - **line-scale:** A, groups;
  - **line-interval:** #1;
  - **arpeggio-degree:** k-sharm, #5, #17, #18;
  - **arpeggio-progression:** #2, #9, #16;
  - **harmony-voicing:** #10, #14;
  - **touch:** #8;
  - **line-jazz:** #3, #11, #13, keylicks;
  - **independence:** #4, #6, k-indep;
  - **finger:** Hanon, #12;
  - **ear:** #15.

  A visit order like scale → arpeggio-progression → independence → line-jazz → harmony → scale gives the spiral its "several angles". The variant layer (§2.5) is a modifier within a visit, not a kind.
- **D1 still applies.** Each new item is played blocked until acquired. Items #3 and #15 are short (8–16 notes), so they acquire quickly and make good "breathers" between the long scale visits.
- **New grading goals the independence items need** (all from data MIDI already delivers):
  - **held-note integrity:** the note-off is not before its written end;
  - **legato overlap:** release-to-next-onset within a window;
  - **voice velocity margin:** the target note louder than the rest of its chord by a calibrated amount;
  - **per-hand evenness.**

  The existing graders cover onset timing and pitch; these four are small additions.

### 3.4 Avoid or defer

- **Free improvisation without constraints:** not fairly gradable; keep it to constrained forms (E3).
- **Double-note arpeggios (A11), solid 4ths and wide double 6ths across all keys:** expert only, injury risk with tension, and little jazz transfer. Defer to T6 and optional.
- **New Barry Harris claims:** none proposed. Only what docs/BARRY-HARRIS-THEORY.md §11–12 marks shown or switched on. The 5-4-3-2 phrases, "major arpeggios chromatically down" and the elevator under a melody stay hidden. Item #3 with approach notes uses the owner's own lick rules, not a Harris attribution.
- **Multi-key items** (the Coltrane matrix, chains of ii–Vs by whole steps): valuable, but they are not "one key" items. Keep them in their families.
- **Reproducing modern method books:** Coker 1970s, Bergonzi, Levine 1989, Ligon 1996, Ricker 1976, Campbell and Slonimsky are all in copyright. Use them for ideas and patterns described in words, and generate the notes from rules. Public-domain sources may be adapted directly:
  - Hanon 1873;
  - Czerny Op. 821 (1852);
  - Pischna 1887;
  - Brahms WoO 6 (1893);
  - Liszt S.146;
  - Dohnányi 1929 (US public domain from 2025 by the 95-year term; check before shipping outside the US);
  - Cortot is also likely US public domain: the 1928 French edition since 2024, the 1930 English edition since 2026 [inference, unverified].

  Note: modern *editions* of PD works carry their own editorial copyright. Generate from the pattern; do not scan an edition.
- **Finger substitution (I13) and silent-press lifts (I14):** the key motion is invisible to MIDI. Leave them ungraded (a warm-up tip at most) or leave them out.
- **Trills on the guitar:** fine as hammer/pull legato (g-legato exists); skip turns on bass.

### 3.5 Guitar and bass transfer

- Items #1 (exists on guitar/bass), #2, #3, #5, #7, #11, #13, #14, #15 and #18 transfer directly: in position first, then two positions, per SPEC-KEY-SESSION-2 §2.3.
- Bass priorities:
  - #2 (cycle arpeggios = walking-bass material);
  - #3 (guide tones as a bass-register counter-line);
  - #14 (secondary dominants as roots with approach).
- Piano-specific:
  - #4 (two-hand independence);
  - #6 (held notes);
  - #8 (voicing within a chord);
  - #9 (rolling Alberti);
  - #16 (hand-over-hand).
- #12 (trills) maps to guitar hammer/pull legato.

## References

1. C.-L. Hanon, *Le Pianiste virtuose en 60 exercices*, Boulogne 1873; Part II includes scales, chromatic scales and arpeggios (Nos. 39–43). Wikipedia, "The Virtuoso Pianist in 60 Exercises"; publisher listings. [B]
2. J. Pischna (Pišna), *Tägliche Studien / 60 progressive exercises*, Eulenburg 1887; Schirmer 1904. IMSLP, tagged public domain. https://imslp.org/wiki/T%C3%A4gliche_Studien_(Pi%C5%A1na,_Josef) [V]
3. J. Brahms, *51 Übungen*, WoO 6, Simrock 1893; Philipp's grouping: extensions over held notes, scales, thumb passages and arpeggios, double notes, evenness, trills. IMSLP. https://imslp.org/wiki/51_Exercises,_WoO_6_(Brahms,_Johannes) [V]
4. F. Liszt, *Technische Studien*, S.146. Bk 3: scales in 3rds and 6ths, arpeggios. Bk 10: broken chords with various fingerings throughout all major and minor keys. Bk 11: arpeggios in 3rds and 6ths. IMSLP. https://imslp.org/wiki/Technische_Studien,_S.146_(Liszt,_Franz) [V]
5. C. Czerny, *160 kurze Übungen*, Op. 821, Schlesinger 1852: scalar figurations, chord progressions, arpeggios, thirds. IMSLP; Schott listing. https://imslp.org/wiki/160_Kurze_%C3%9Cbungen%2C_Op.821_(Czerny%2C_Carl) [V]
6. E. Dohnányi, *Essential Finger Exercises* (Legfontosabb ujjgyakorlatok), Rózsavölgyi, Budapest 1929. IMSLP. https://imslp.org/wiki/Essential_Finger_Exercises_(Dohnányi,_Ernő) [V publication; content U]
7. ABRSM piano syllabus: scales, arpeggios and broken chords; examiners ask for at least one of each type per grade, legato and staccato from Grade 6. https://www.issuu.com/abrsm/docs/pianosyllabusissuu [B]
8. J. Coker et al., *Patterns for Jazz* (Studio P/R, later Alfred): 400+ patterns on chords and scales; digital patterns. https://ejazzlines.com/patterns-for-jazz-jerry-coker [B]
9. J. Bergonzi, *Inside Improvisation* vol. 1, *Melodic Structures* (Advance Music). https://www.alfred.com/products/melodic-structures-01-adv14220 [B; digital-pattern content U]
10. R. Ricker, *Pentatonic Scales for Jazz Improvisation* (Studio P/R 1976; Alfred). https://www.alfred.com/products/pentatonic-scales-for-jazz-improvisation-00-sb9 ; Carleton jazz theory DB id 470. [B]
11. M. Levine, *The Jazz Piano Book* (Sher 1989): ii–V–I, rootless voicings, upper structures, drop 2. https://en.wikipedia.org/wiki/The_Jazz_Piano_Book [B]
12. B. Ligon, *Connecting Chords with Linear Harmony* (Hal Leonard 1996): three outlines, chromatic approach and passing tones, 3–7 resolutions. https://www.groove3.com/books/Connecting-Chords-with-Linear-Harmony [B]
13. A. Cortot, *Principes rationnels de la technique pianistique* (1928; English ed. Salabert 1930): five chapters, covering evenness, independence and mobility of the fingers, passing the thumb, double notes and (apparently) polyphonic playing. IMSLP; retailer listing. https://imslp.org/wiki/Rational_Principles_of_Piano_Technique_(Cortot,_Alfred) [B]. US status: the 1928 French edition is likely public domain since 2024 and the 1930 English edition since 2026 [inference]; describe ideas only.
14. G. Campbell, *Triad Pairs for Jazz*; R. Ricker, *Technique Development in Fourths*. [U]
15. Repo: docs/BARRY-HARRIS-THEORY.md (§8 rules, §9 devices, §11–12 verification registry) [R]; docs/RESEARCH-SPIRAL-PRACTICE.md §5 (hands-together configurations); docs/SPEC-SPIRAL-PRACTICE.md §2; docs/SPEC-KEY-SESSION-2.md §2; src/engine/drills/generate.ts (`sequenceMotif`, catalogue), harmLadder.ts, keyLicks.ts, keyIndex.ts, guitarCore2.ts (`g-scales-10`), bass.ts (`b-scale-6`), indepDrills.ts (`k-indep`), velCal.ts.

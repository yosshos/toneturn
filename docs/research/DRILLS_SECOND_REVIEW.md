# Technique drills — independent second review (2026-11-07)

Scope: the generated technique-drill catalogue (`catalog()` in `src/engine/drills/generate.ts`, `guitarCatalog()` in
`src/engine/drills/guitar.ts`). Method: (1) build a sub-topic checklist from the syllabi / method books below *before*
reading the catalogue or the first audit; (2) count the catalogue programmatically (kinds / variants / levels / keys per
sub-topic); (3) compare; (4) only then read `DRILLS_COVERAGE_AUDIT.md` and note disagreements.

Sources consulted (web + standard method-book tables of contents): ABRSM Piano Scales & Arpeggios Grades 1–8 and
ARSM/DipABRSM technical requirements; Trinity Piano technical work; RCM Piano Technical Requirements Prep–Level 10 / ARCT;
Czerny Op. 599, 299, 740; Brahms 51 Exercises WoO 6; Cortot *Principes rationnels* (5 chapters); Dohnányi *Essential
Finger Exercises*; Leschetizky method (Brée); Hanon; Pischna. Jazz: Mark Levine *The Jazz Piano Book*, Barry Harris
workshop material, Hal Galper *Forward Motion*, Bert Ligon *Connecting Chords with Linear Harmony*, Aebersold Vol. 1, 3,
54, Berklee keyboard / harmony curriculum. Guitar: Leavitt *Modern Method for Guitar* 1–3, RSL Rockschool Electric Guitar
Debut–8 (Group A scales, B arpeggios, C chords; G8 adds whole-tone, diminished, altered scales and 7♯5 / 7♭5 / 7♯9 / 7♭9
arpeggios + chords), LCM/RGT electric & acoustic, ABRSM / Trinity classical guitar technical work, Carcassi Op. 60,
Giuliani Op. 1 (120 RH arpeggios, slurs, scales), Sor / Aguado, Tárrega, Troy Grady (pickslanting / string changes),
Petrucci *Rock Discipline*, Paul Gilbert, Joe Pass *Guitar Style*, Mick Goodrick *Advancing Guitarist*. Bass: Berklee bass
method, Ed Friedland *Building Walking Bass Lines*, Wooten / Marcus Miller slap material, RSL Rockschool Bass (G3 walking,
G5 slap-and-pop / hammer-on style, G6–8 stylistic studies: rock/metal pedal tones, funk 16th slap + string crossing,
jazz/latin natural harmonics, arpeggios, up-tempo fingerstyle + walking).

## 1. Checklist (built before reading the catalogue) — 118 sub-topics

### Classical piano (52)
Scales — P1 major HS 1→4 oct · P2 major HT · P3 harmonic minor · P4 melodic minor · P5 natural minor · P6 contrary motion
(major + minor) · P7 a 3rd apart · P8 a 6th apart · P9 a 10th apart · P10 chromatic HS/HT · P11 chromatic contrary · P12
chromatic a min-3rd / maj-6th apart · P13 formula pattern · P14 staccato scales · P15 scales in octaves (legato + staccato
+ chromatic) · P16 double 3rds (incl. chromatic) · P17 double 6ths · P18 rhythm / accent variants · P19 whole-tone ·
P20 scales starting on any degree / modal starts.
Arpeggios — P21 major/minor root position · P22 inversions · P23 HT 2–4 oct · P24 contrary-motion arpeggios · P25 dom7
(all positions) · P26 dim7 (all positions) · P27 broken chords · P28 blocked/solid chords through inversions · P29
augmented triad arpeggio · P30 arpeggios a 3rd/10th apart (diploma).
Cadences / harmony at the keyboard — P31 I–IV–V–I · P32 I6/4–V7 · P33 ii6, circle, V/V · P34 N6, aug 6th · P35 plagal,
deceptive, Picardy.
Finger technique (Czerny / Hanon / Pischna / Dohnányi / Cortot ch. 1–2, 4) — P36 five-finger · P37 Hanon I · P38 held
notes / independence · P39 trills & measured trills · P40 repeated notes · P41 thumb passing · P42 ornaments · P43
extension (stretch) figures · P44 velocity runs (Czerny 299/740) · P45 broken octaves / rotation · P46 repeated chords
(Cortot ch. 5 wrist) · P47 hand crossing (Czerny 740, Scarlatti) · P48 leaps.
Control — P49 articulation (legato/staccato/portato) · P50 dynamics / accents / voicing / balance · P51 pedal (direct,
legato) · P52 polyrhythm 3:2, 4:3, 2:3, 3:4.

### Jazz / popular piano (26)
J1 shells · J2 rootless A/B · J3 minor ii–V–i · J4 guide tones · J5 digital 1-2-3-5 · J6 blues & pentatonic scales · J7
chord scales (dorian, lydian ♭7, altered, WT, dim, bebop, melodic minor) · J8 upper-structure triads · J9 quartal / So What ·
J10 two-handed voicings / drop 2 · J11 tritone sub · J12 comping rhythms · J13 locked hands / 6-dim block chords (Harris) ·
J14 Harris scale rules, triads, pivots, approach/enclosure, brothers · J15 target notes over blues / rhythm changes / a
standard (Galper/Ligon) · J16 Coltrane changes · J17 blues licks & turnarounds · J18 I–vi–ii–V turnaround voicings · J19
stride (single, octave, 10th) · J20 walking bass · J21 boogie-woogie · J22 Alberti / classical LH · J23 Latin (bossa,
montuno) · J24 pop LH patterns · J25 gospel / rock pumping 8ths & ballad arpeggio LH · J26 pentatonic patterns over chords
(Levine).

### Guitar (30)
G1 chromatic / spider permutations · G2 stretches · G3 position shifts · G4 alternate picking one string · G5 string
crossing in/out · G6 3NPS alternate/economy · G7 pentatonic picking · G8 string skipping · G9 tremolo · G10 sweep
(3/5-string, major/minor/dim) · G11 hybrid/chicken · G12 pedal-point picking (Petrucci) · G13 hammers/pulls/trills ·
G14 legato 3NPS · G15 tapping · G16 pentatonic 5 boxes, blues, major penta · G17 CAGED major · G18 3NPS 7 patterns ·
G19 modes, harmonic/melodic minor · G20 sequences (3s, 4s, intervals 3rds) · G21 triad/7th arpeggios, CAGED,
inversions on string sets · G22 altered-dominant arpeggios (RSL G8) · G23 open/barre/power/7th chords · G24 extended
chords (sus, add9, 9/11/13) · G25 strumming by genre (pop, rock, blues, country, reggae, funk, latin, metal, jazz) ·
G26 lead: slides, bends (½/1/1½, release, pre-bend, unison), vibrato, double stops, harmonics · G27 fingerstyle PIMA,
Giuliani, Travis, rest/free stroke, ligados, tremolo, campanella · G28 flamenco rasgueado/picado/alzapúa/compás
(incl. tangos/rumba 4/4) · G29 jazz guitar shells, drop-2/3, guide tones, walking, chord melody, minor ii–V · G30
reading by position, target-note improvisation.

### Bass (10)
B1 chromatic / OFPF · B2 major, minor, pentatonic, blues, modes · B3 root–5–8 and pedal-tone grooves · B4 ghost notes /
muting · B5 triad + 7th arpeggios · B6 octaves · B7 slap: thumb, thumb-pop, hammer-on slap, 16th slap · B8 walking
(ii–V–I, blues, rhythm changes) · B9 genre grooves (Motown chromatic approach, reggae one-drop, Latin tumbao) · B10
fingerstyle string crossing / raking, natural harmonics.

## 2. Catalogue vs checklist (counted programmatically: items = specs × keys, 'major'/'minor' levels = 12 keys)

Before this review: 24 families, 207 levels, **5,028 items**. Of the 118 checklist rows, 95 were already *ok* (≥ 2
levels where a progression exists or ≥ 4 variants, enough keys/positions). The piano side was in good shape after the
first audit (all ABRSM / RCM scale motions, arpeggio inversions, cadences, Hanon / Czerny / Pischna / Cortot categories,
Harris, Levine voicings, forms). The gaps were mostly guitar / bass.

| # | Sub-topic | Was | Fix (level → new variants) |
|---|---|---|---|
| P47 | Hand crossing (Czerny 740, Scarlatti) | **missing** | new **advanced 8**: `leaps#3` (LH bass on 1, crosses over the RH broken chord on 3), + waltz / outward leaps and minor double 6ths in 8 keys |
| J22 | Alberti bass | **thin** (1 spec × 3 keys) **and wrong**: in any key but C / G / F `genAlberti` returned notes with `pitch: undefined` (the 5th-on-top voicing did not fit 46–62) | voicing falls back to the same root-position shape from E2; new **accomp 10**: Alberti, pop LH ×2, boogie, bossa in 8 more keys |
| G12 | Pedal-point picking (Petrucci, Gilbert) | **missing** | **g-picking 2** `pedal` (tonic on string 1 over a line on strings 3–2), 8ths + 16ths |
| G19 | Aeolian / natural minor in position | **missing** (modes list skipped 5) | **g-scales 7** `mode#5` |
| G19 | Whole-tone, diminished (H–W), altered (RSL G6–8) | **missing** on guitar | **g-scales 7** `mode#9/10/11` |
| G20 | Scale sequences | **thin** (2 variants) | + `seq-g3` (groups of 3, two shapes), `seq3` and `seq4` in a second CAGED shape → 6 |
| G22 | Altered-dominant arpeggios 7♯5, 7♭5, 7♭9, 7♯9 (RSL G8) | **missing** | **g-arps 5** `seventh#5–8` (+ dim7 root on 5) |
| G24 | sus2 / sus4 / add9 chords | **missing** | **g-chords 3** `chord-check@4` Dsus4, Dsus2, Asus4, Asus2, Esus4, Cadd9 |
| G25 | Picked chord arpeggios (pop / rock ballad) | **missing** | **g-rhythm 2** `arp-pick` (1-2-3-4-5-4-3-2 through the open chord) |
| G25 | Funk rhythm | **thin** (1 groove) | **g-rhythm 5** + `funk-stabs` (m7 / 9 stabs with ghost strums) |
| G26 | Unison bends | **missing** | **g-lead 4** `unison#0/1` (strings 3&2, 2&1) |
| G27 | Campanella | **missing** | **g-fingerstyle 5** `campanella` (best cross-string position searched per key) |
| G28 | Rumba / tangos 4/4 compás | **missing** | **g-flamenco 5** `compas#3` rumba 3+3+2 over the Andalusian cadence |
| B2 | Bass modes (natural minor, Dorian, Mixolydian) | **missing** | **g-bass 2** `mode#5/1/4` × 12 keys |
| B3 / B9 | Bass genre grooves (rock 8ths, Motown approach, Latin tumbao) | **missing** | **g-bass 3** `groove#0–2` × 12 keys |
| B7 | Slap | **thin** (1 groove × 5 keys) | **g-bass 5** + `slap#1` thumb–hammer–pop (octave + ♭7), 6 keys |
| B1 | Bass permutations | **thin** (1 pattern) | **g-bass 1** + `spider#1/#3` |

Mislabeled / wrong (fixed): (1) Alberti `undefined` pitches above; (2) guitar `mode` drills showed the *tonic's* major
key signature (D Dorian with two sharps, E Phrygian with four) — now the parent scale's signature (D Dorian → C);
(3) bass 7th arpeggios were titled "7 arpeggio · G" → "G7 arpeggio". Sampled and found correct: drop-2 / drop-3
inversions, shells, rootless A/B, So What, US ♭V over G7, Travis, CAGED chords, B.B. box, double stops, compás accents
(soleá 3-6-8-10-12, bulería from 12, seguiriya 2+2+3+3+2), E/A-shape barre 7th / maj7 offsets, A-shape 9, open chord
table, Motown approach notes, walking-blues approach notes.

After: 24 families, 209 levels (piano advanced 7→8, accomp 9→10; no guitar levels added, no new FamilyId),
**5,413 items** (+385: advanced 189→221, accomp 106→146, g-picking 183→189, g-scales 360→456, g-arps 276→360,
g-chords 148→154, g-rhythm 67→76, g-lead 92→104, g-fingerstyle 124→136, g-flamenco 20→22, g-bass 145→231).
Guard tests: `tests/guitarDrills.test.ts` and `tests/drills.test.ts` "second review additions".

## 3. Where I disagree with DRILLS_COVERAGE_AUDIT.md (read after steps 1–2)

* It rates bass "Slap" *ok* with one groove in 5 keys and never audits bass modes or genre grooves; bass was the
  thinnest family per sub-topic (6 levels covering everything a bassist does). Fixed above.
* It does not audit guitar against the Rockschool grade 6–8 technical lists (whole-tone / diminished / altered scales,
  altered-dominant arpeggios, sus / extended chords) — all were missing.
* "Waltz bass", "Alberti" and accompaniment rows are *ok* with 3–5 keys; Alberti was broken outside C / G / F, which the
  sweep could not catch because only those keys were in the catalogue.
* Hand crossing (a Czerny 740 / Cortot staple) and pedal-point picking are absent from its tables.
* Its piano verdicts I agree with; its "consciously left" list I agree with (Hanon 2–60 note-for-note, CC64 pedal
  grading, per-hand articulation, pinch / artificial harmonics, whole tunes).

## 4. Consciously left

Augmented-triad arpeggios and arpeggios a 10th apart (diploma / Trinity extras); chromatic double 3rds and double 4ths
(Brahms 51) — need new double-note fingering tables; 5:4 polyrhythm; Levine pentatonic patterns over chords, Kenny
Barron / I–vi–ii–V turnaround voicings (jazz piano — candidates for a new piano level); bass natural harmonics,
reggae one-drop and rhythm-changes walking (no free bass level; `groove` takes new options without new levels);
dedicated guitar position-shift drills (covered by one-string scales, the chromatic walk and slides); flamenco only in
E and A (idiomatic: por arriba / por medio).

# Drills coverage audit: piano (classical + jazz), guitar, bass (2026-11-07)

Owner request: *"I'm not sure we put in all the drill material, classical and jazz — there's a lot. Verify for both
piano and guitar that we didn't miss a sub-topic entirely, and that no sub-topic is too thin in drills or levels."*

Method. Rows are the sub-topics of the authoritative curricula (piano classical: ABRSM / Trinity / RCM technical
requirements, grades 1–8 + diploma, and the exercise canon Hanon, Czerny, Pischna, Dohnányi, Brahms 51, Cortot;
piano jazz: Barry Harris, Mark Levine *The Jazz Piano Book*, Aebersold; guitar and bass: the sources of
`docs/SPEC-GUITAR-TECHNIQUE.md` and `GUITAR_TECHNIQUE_RESEARCH.md`). Each row was checked against `catalog()`
(`src/engine/drills/generate.ts`) and `guitarCatalog()` (`src/engine/drills/guitar.ts`).

* **Present** = family / levels / drill kinds (`kind`, `#option`).
* **Lv** = number of levels that contain the sub-topic (after); **Items** = level specs × keys (after).
* **Verdict** before → after. *missing* = no drill at all; *thin* = fewer than 2 levels where the topic has a natural
  progression, or fewer than 4 distinct drill variants in total (kinds, options, hands, keys / positions); *ok*.
* Rules kept: existing item ids are unchanged (levels and kinds were only appended); guitar families stay ≤ 7 levels
  (the badge set has one badge per level), so guitar topics were thickened inside existing levels.

## Totals

| | Families | Levels | Items (spec × key) |
|---|---|---|---|
| Piano, before | 10 | 75 | 1,491 |
| **Piano, after** | 10 | **112** | **3,041** |
| Guitar + bass, before | 14 | 85 | 1,543 |
| **Guitar + bass, after** | 14 | 85 | **1,987** |

Sub-topics audited: piano 92, guitar / bass 58. Before: **piano 38 missing, 12 thin; guitar / bass 9 missing, 13 thin**.
After: every row below is *ok* except those listed under "Consciously left" at the end.

---

## 1. Piano — classical technical work (ABRSM / Trinity / RCM, grades 1–8 + diploma)

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Major scales HS, 1–2 oct | scales 1, 2 `scale` | 2 | 48 | ok |
| Major scales HT, parallel | scales 3, 10, 11; fingers 7 | 4 | 84+ | ok |
| Harmonic minor HS / HT | scales 5, 10, 14 | 3 | 72 | ok |
| Melodic minor (up raised, down natural) | scales 6, 13, **15** (HS added) | 3 | 60 | thin → ok |
| Natural minor | scales 6, **15** | 2 | 36 | thin → ok |
| Contrary motion, major | scales 4, control 9 | 2 | 17 | ok |
| Contrary motion, minor (harmonic / melodic) | **scales 13** | 1 | 24 | missing → ok (2 scale forms) |
| A 3rd / 6th / 10th apart, major | scales 8 | 1 | 36 | ok (3 variants × 12 keys) |
| A 3rd / 6th / 10th apart, minor | **scales 13** | 1 | 36 | missing → ok |
| Chromatic HS / HT / contrary | scales 7, 14; fingers 7 | 3 | 72 | ok |
| Chromatic a minor 3rd / major 6th apart (ABRSM 6–8) | **scales 14** `motion: third / sixth` on chromatic | 1 | 24 | missing → ok |
| 3 octaves | **scales 14**, **arpeggios 12** | 2 | 60 | missing → ok |
| 4 octaves, 16ths | scales 10, arpeggios 6 | 2 | 36 | ok |
| Formula pattern | scales 9 | 1 | 12 | ok (one syllabus form, 12 keys) |
| Rhythm variants (Cortot: dotted, groups, moving accent) | scales 11 | 1 | 48 | ok |
| Staccato / legato / portato scales | control 1, 2, **9** (HT added) | 3 | 51 | thin → ok |
| Octaves: scales in octaves (legato) | advanced 1 | 2 | 24 | ok |
| Octaves: staccato, chromatic, HT | **advanced 3** | 1 | 60 | missing → ok |
| Double 3rds (one hand) | **advanced 4** `double-notes#0` (R, L, 2 oct, minor) | 1 | 48 | missing → ok |
| Double 6ths (one hand) | **advanced 4** `double-notes#1` (R, L) | 1 | 24 | missing → ok |
| Arpeggios: major triads, root, HS / HT | arpeggios 1, 3 | 2 | 72 | ok |
| Arpeggios: inversions, major | arpeggios 2 | 1 | 48 | ok |
| Arpeggios: minor inversions | **arpeggios 9** | 1 | 60 | missing → ok |
| Dominant 7th arpeggio, root + all inversions | arpeggios 4, **10** | 2 | 84 | thin → ok |
| Diminished 7th arpeggio, from every note | arpeggios 5, **11** | 2 | 72 | thin → ok |
| Arpeggios contrary motion | arpeggios 6 | 1 | 12 | ok |
| Broken chords 1-3-5-3 / 1-5-3-5 | arpeggios 8, **14** (minor) | 2 | 72 | thin → ok |
| Blocked (solid) chords through inversions | **arpeggios 13, 14** `blocked` | 2 | 48 | missing → ok |
| Cadences I–IV–V–I, I6/4, all keys major / minor | cadences 1–3 | 3 | 51 | ok |
| ii6, circle, V/V, N6, aug6 | cadences 4, 5, **7** (minor ii6 / circle) | 3 | 84 | ok |
| Plagal, deceptive, Picardy cadences | **cadences 6, 7** | 2 | 84 | missing → ok |

## 2. Piano — the exercise canon (Hanon, Czerny, Pischna, Dohnányi, Brahms 51, Cortot)

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Five-finger patterns | fingers 1 | 1 | 48 | ok (4 variants × 12 keys) |
| Hanon Part I (sequential patterns) | fingers 2, 6, **14** — No. 1 exact + 6 Hanon-style patterns | 3 | 67 | thin → ok |
| Hanon Part II: thumb-passing preparation | **fingers 8** `thumb-under` (after 3 / after 4, R / L / HT) | 1 | 25 | missing → ok |
| Hanon 39–43: scales / chromatic / arpeggios / dom7 / dim7 | fingers 7 | 1 | 60 | ok |
| Hanon Part III: repeated notes | fingers 5, **14** (triplet groups) | 2 | 18 | ok |
| Repeated chords | **fingers 12** `rep-chords` | 1 | 8 | missing → ok (R / L, 4 keys) |
| Trills on finger pairs, measured 4 / 6 / 8 per beat (spec F4) | fingers 4, **11** | 2 | 20 | thin → ok |
| Held-note independence (Pischna / Dohnányi / Brahms) | fingers 3, **10** (hold 1 + 5; hold the middle finger) | 2 | 22 | thin → ok |
| Rotation (broken 6ths / octaves, Hanon 60 tremolo type) | **fingers 12** `rotation` | 1 | 12 | missing → ok |
| Czerny velocity (runs over chords, figuration) | **fingers 13** `velocity` (Czerny-*style* figures, not Czerny's notes) | 1 | 24 | missing → ok |
| Alberti bass | accomp 1, control 7 | 2 | 6 | ok |
| Leaps (waltz bass, RH jumps, outward leaps) | **advanced 5** `leaps` | 1 | 15 | missing → ok |
| Polyrhythm 3:2, 4:3 | advanced 2, **7** (more keys) | 2 | 12 | thin → ok |
| Polyrhythm 2:3, 3:4 (hands swapped) | **advanced 6** | 1 | 6 | missing → ok |
| Ornaments: mordents, turn, acciaccatura, appoggiatura, trill with turned ending | **fingers 9** `ornament#0–5` (R, L) | 1 | 40 | missing → ok |

## 3. Piano — control, pedal, reading

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Even dynamics pp…ff | control 3 | 1 | 15 | ok |
| Crescendo / diminuendo | control 4 | 1 | 6 | ok |
| Accents every 3rd / 4th | control 5 | 1 | 6 | ok |
| Voicing within one hand | control 6 | 1 | 6 | ok |
| Melody over accompaniment | control 7 | 1 | 3 | ok |
| Balance between the hands (K8) | **control 8** `balance` (RH loud / LH loud) | 1 | 8 | missing → ok |
| Pedalling (direct, legato, 2 changes a bar) | **control 10** `pedal`, plan in `goal.pedal` | 1 | 15 | missing → ok (notes measured; pedal timing needs CC64 capture — see below) |
| Sight-reading (five-finger, wider range, HT) | **control 11, 12** `reading` (seeded, not memorisable) | 2 | 31 | missing → ok |

## 4. Piano — jazz: Barry Harris

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Major scale / linear scale | harris 1 | 1 | 36 | ok |
| Dominant scale rules from each chord tone | harris 2, 12 | 2 | 60 | ok |
| Triads / 4-note chords / 3-to-9 on every degree | harris 3, 4, 12 | 3 | 48 | ok |
| Pivots | harris 5, 12 | 2 | 24 | ok |
| Chromatic approaches, enclosures | harris 6, 12 | 2 | 36 | ok |
| Lick + line, ii–V (think dominant) | harris 7 | 1 | 24 | ok |
| Arpeggio up, scale down by the rules | **harris 11** `h11-arp-scale` (from 1 / 3 / 5 / 7, RH + LH) | 1 | 60 | missing → ok |
| Brothers (dominants a minor 3rd apart) | harris 8 | 1 | 12 | ok |
| 6th-diminished block chords, drop 2 / 3 ("movements") | harris 9 | 1 | 36 | ok |
| Minor 6th-diminished scale | **harris 10** `h10-minor6dim` | 1 | 36 | missing → ok |
| Harris lines in the LH / HT | harris 1, **12** | 2 | 84 | thin → ok |

## 5. Piano — jazz: Levine / Aebersold voicings, comping, lines, forms

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Shells 1-7 / 1-3 | voicings 3, 6 | 2 | 29 | ok |
| Rootless A / B, minor ii–V–i | voicings 4, 5 | 2 | 72 | ok |
| Quartal: "So What" and 4ths through the mode | voicings 7, **8** `quartal` (3 notes LH; 4 notes 2 hands) | 2 | 17 | missing → ok |
| Upper-structure triads | jazz 4 | 1 | 60 | ok (5 structures × 12 keys) |
| Drop 2 (piano, two hands) | **voicings 9** `drop2` | 1 | 12 | missing → ok |
| Two-handed voicings (LH 3-7, RH 9-13) | **voicings 9** `two-hand` | 1 | 12 | missing → ok |
| Block chords / locked hands / 4-way close | harris 9 (4-way close), **jazz 8** `locked` (Shearing, major + minor) | 2 | 60 | missing → ok |
| Comping rhythms: Charleston, reverse, anticipations, Red Garland | **voicings 11** `comp#0–3` | 1 | 48 | missing → ok |
| Guide-tone lines | jazz 1, **7** (over forms) | 2 | 56 | ok |
| ii–V–I in all keys | voicings 3, 4, 5, 9, 10; jazz 1, 2 | 7 | 250+ | ok |
| Tritone substitution | **voicings 10** `tritone-sub` | 1 | 12 | missing → ok |
| Bebop scales | scales 12 (bebop dominant), **jazz 5** (bebop dorian) | 2 | 24 | thin → ok |
| Chord scales (dorian, lydian dom., altered, whole-tone, diminished, melodic minor, lydian) | **jazz 5** `jscale#0–9` | 1 | 120 | missing → ok |
| Enclosures | harris 6 | 2 | 36 | ok |
| Digital patterns 1-2-3-5 | jazz 2, **9** (LH) | 2 | 30 | ok |
| Coltrane changes (Giant Steps cycle) | **jazz 9** `coltrane#0/1`, **voicings 12** `coltrane-v` | 2 | 18 | missing → ok |
| Blues / pentatonic scales | scales 12, jazz 3 | 2 | 84 | ok |
| Blues licks and turnarounds | **jazz 10** `blues-lick#0–2` | 1 | 18 | missing → ok |
| Improvising over forms: blues, minor blues, rhythm changes, a standard (target notes, guide tones, arpeggios) | **jazz 6, 7** `form-thirds / form-guide / form-arp` | 2 | 55 | missing → ok |

## 6. Piano — accompaniment styles

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Walking bass (blues) | accomp 2, 4, 9 | 3 | 22 | ok |
| Walking through changes (ii–V–I cycle, rhythm changes) | **accomp 8** `walk-changes` | 1 | 10 | missing → ok |
| Stride (single, octave, 10ths) | accomp 3, 4, 9 | 3 | 29 | ok |
| Boogie-woogie (5-6 shuffle, walking, broken octaves) | **accomp 5** `boogie` | 1 | 18 | missing → ok |
| Bossa nova (piano) | **accomp 6** `bossa` | 1 | 6 | missing → ok (with montuno, 4 variants per level) |
| Latin montuno + tumbao | **accomp 6** `montuno` | 1 | 6 | missing → ok |
| Pop LH (1-5-8-9-10, 1-5-8-5) | **accomp 7** `pop-lh` | 1 | 12 | missing → ok |
| Waltz bass | **advanced 5** `leaps#0` | 1 | 5 | missing → ok |

---

## 7. Guitar (SPEC-GUITAR sources: RGT / Rockschool / Trinity, Carlevaro, Giuliani 120, Tennant, JustinGuitar, Troy Grady, Jens Larsen, Goodrick)

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Chromatic / permutations / spider / stretch | g-fretting 1–6 | 6 | 40 | ok |
| Alternate picking, string crossing | g-picking 1, 2 | 2 | 12 | ok |
| 3NPS alternate / economy | g-picking 3 (+ patterns 5, 2) | 1 | 48 | thin → ok (4 variants × 12 keys) |
| String skipping | g-picking 4 (+ octave skipping) | 1 | 24 | thin → ok |
| Tremolo picking | g-picking 5 (+ across strings; triplets, phrygian dominant) | 1 | 36 | thin → ok |
| Sweep picking | g-picking 6 (+ minor 3-string) | 1 | 48 | ok |
| Hybrid / chicken / banjo roll | g-picking 7 (+ `banjo`) | 1 | 15 | thin → ok |
| Hammer-ons / pull-offs / trills | g-legato 1–3 | 3 | 48 | ok |
| Legato pentatonic / 3NPS | g-legato 4, 5 | 2 | 48 | ok |
| Tapping | g-legato 6 (+ `tap-arp` through I–vi–IV–V) | 1 | 12 | thin → ok |
| Pentatonic boxes, blues scale | g-scales 1–3 | 3 | 84 | ok |
| CAGED scale positions | g-scales 4, 5 | 2 | 60 | ok |
| 3NPS scales, one-string scales | g-scales 6 | 1 | 108 | ok |
| Modes, harmonic / melodic minor, sequences | g-scales 7 | 1 | 108 | ok |
| Triad / CAGED / inversion / 7th / ii–V–I arpeggios | g-arps 1–5 | 5 | 276 | ok |
| Open chords, one-minute changes | g-chords 1–3 | 3 | 34 | ok |
| Power chords | g-chords 4 | 1 | 6 | ok |
| Barre chords, major / minor | g-chords 5 | 1 | 24 | ok |
| Barre 7th chords (7, m7, maj7; E and A shapes) | **g-chords 5** `barre-check#0–2` | 1 | 36 | missing → ok |
| Triad inversions, CAGED chords | g-chords 6, 7 | 2 | 36 | ok |
| Rhythm: pop / rock strums | g-rhythm 1, 2 | 2 | 16 | ok |
| Rhythm: 3/4 waltz | **g-rhythm 1** `waltz` | 1 | 3 | missing → ok |
| Rhythm: blues shuffle, country boom-chick | g-rhythm 3 | 1 | 10 | ok |
| Rhythm: reggae / ska | g-rhythm 4 | 1 | 8 | ok |
| Rhythm: funk 16ths | g-rhythm 5 | 1 | 4 | ok |
| Rhythm: bossa, Freddie Green, son clave | g-rhythm 6 (+ `clave`) | 1 | 18 | thin → ok |
| Rhythm: metal gallop, 16th chugs | g-rhythm 7 (+ `chug`) | 1 | 8 | thin → ok |
| Slides | g-lead 1 (+ string 2; slide-in from a fret below) | 1 | 15 | thin → ok |
| Harmonics: natural 12/7/5, frets 4/9, harmonic chords | g-lead 1 `harmonics#0–2` | 1 | 15 | thin → ok |
| Bends ½ / 1 / 1½, release, pre-bend | g-lead 2, 3, 4, 7 | 4 | 31 | ok |
| Vibrato narrow / wide | g-lead 5 | 1 | 12 | ok |
| Double stops, B.B. box | g-lead 6, 7 | 2 | 19 | ok |
| Thumb bass, PIMA, Giuliani patterns | g-fingerstyle 1–3 | 3 | 44 | ok |
| Travis picking | g-fingerstyle 4 | 1 | 5 | ok |
| Rest / free stroke | g-fingerstyle 5 | 1 | 48 | ok |
| Classical slurs (ligados) | **g-fingerstyle 5** `ligado#0/1` | 1 | 24 | missing → ok |
| Classical tremolo | g-fingerstyle 6 | 1 | 3 | ok |
| Rasgueado (4-stroke, triplet) | g-flamenco 1, 2 | 2 | 6 | ok |
| Picado | g-flamenco 3 (+ a-m-i triplets) | 1 | 6 | thin → ok |
| Alzapúa | g-flamenco 4 | 1 | 2 | ok |
| Compás (soleá, bulería, seguiriya) | g-flamenco 5 (+ bulería, seguiriya) | 1 | 6 | thin → ok |
| Jazz shells, Freddie Green | g-jazz 1, g-rhythm 6 | 2 | 30 | ok |
| Jazz comping rhythms (Charleston, anticipations) | **g-jazz 1** `comp#0/1` | 1 | 24 | missing → ok |
| Drop 2 (three string sets), drop 3, voice-led ii–V–I | g-jazz 2 (+ string sets 5-4-3-2, 6-5-4-3), 3, 4 | 3 | 168 | thin → ok |
| Guide tones, walking bass on guitar | g-jazz 5, 6 | 2 | 36 | ok |
| Chord-melody (harmonised scale) | g-jazz 7 | 1 | 6 | ok |
| Octaves (Wes Montgomery) | **g-jazz 7** `octaves` | 1 | 6 | missing → ok |
| Reading by position | g-reading 1–5 | 5 | 48 | ok |
| Improvisation: target notes over blues | g-impro 1–4 | 4 | 28 | ok |
| Improvisation over other forms (minor blues, ii–V–I, a standard) | **g-impro 1–4** `#1–3` | 4 | 84 | missing → ok |

## 8. Bass

| Sub-topic | Present (after) | Lv | Items | Verdict |
|---|---|---|---|---|
| Chromatic, major scale | g-bass 1, 2 | 2 | 15 | ok |
| Minor pentatonic / blues scale | **g-bass 2** `penta#0/1` | 1 | 24 | missing → ok |
| Root–5th–octave grooves | g-bass 3 | 1 | 12 | ok |
| 16th grooves with ghost notes | **g-bass 3** `ghost` | 1 | 12 | missing → ok |
| Arpeggios (triad, maj7, 7, m7) | g-bass 4 | 1 | 48 | ok |
| Octaves (disco / funk) | g-bass 5 | 1 | 5 | ok |
| Slap (thumb, pop, ghost) | **g-bass 5** `slap` | 1 | 5 | missing → ok |
| Walking ii–V–I / blues | g-bass 6 (+ `walk-blues`) | 1 | 24 | thin → ok |

---

## 9. Consciously left (and why)

1. **Hanon Nos. 2–60 note-for-note.** No. 1 is encoded exactly; the other Part I patterns are labelled
   "Hanon-style". I did not encode further numbers from memory because a wrong note under an exact "Hanon No. N"
   title would be worse than a labelled pattern. They are public domain — transcribe Nos. 2–20 from the IMSLP scan
   (research doc §1.4) into `HANON_STYLE` as exact patterns when someone can check them against the score.
2. **Pedal timing is not graded yet.** Pedalling drills carry the plan (`DrillGoal.pedal`: style + change beats),
   but the take has no CC64 events: `PlayedNote` capture and `analyzeTake` (not in this task's files) need a pedal
   track to count blur / gap faults (spec AI §5.6).
3. **Hands at different articulations** (RH legato, LH staccato — spec K8 second half) needs per-hand articulation
   goals in `analyzeTake`; the balance part of K8 is in (control 8).
4. **Guitar: single-level topics stay single-level** (compás, Travis, alzapúa, waltz, clave, chug, ligados, slap).
   Guitar families are capped at 7 levels and each level has a badge, so they were thickened with more variants inside
   their level rather than with new levels. Splitting them needs new levels → new badge titles (`badges.ts`).
5. **Artificial / pinch harmonics, artificial-harmonic chords** (guitar) — the pitch is the fretted note + 12, which
   `finish()` does not model; natural harmonics at 12 / 7 / 5 / 4 / 9 are in.
6. **Gospel licks, stride tunes, AABA standards in full, rhythm-changes bridge** — the forms covered are the blues,
   minor blues, rhythm-changes A and one ii–V–I standard cycle; whole tunes belong to the lead-sheet family (spec AI
   §5.3, not built).

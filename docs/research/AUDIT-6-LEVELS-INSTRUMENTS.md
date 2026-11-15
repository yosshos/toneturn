# AUDIT-6-LEVELS-INSTRUMENTS: keys, guitar, bass and drums checked level by level, as paths (2026-11-15)

Read-only audit of `redesign-v2` @ 1cfb0f9b. No repo file changed except this one.

**How the data was collected.** One temporary vitest script (written, run, then deleted) dumped the real course path of each instrument course:
- `stepCatalogue()` (`src/engine/path.ts:258`), filtered by `inCourse()` (`src/engine/courses.ts:66`);
- the families `ladderFamiliesFor()` gives the course (`src/engine/ladderFacts.ts:38`), using default settings: piano emphasis `both`, guitar add-ons = `pathGuitarAddOns()` (core + jazz), a 4-string bass, drums over MIDI;
- minus `ladderHiddenFor()` (`ladderFacts.ts:53`).

Each step carries its path difficulty (rating), kind, family, key count and title. "Step" below means one path step: a technique level, a topic level, a repertoire item, a licks / transcribe step, or a bonus game.

**What is different from Audit 5.** Audit 5 (`AUDIT-5-INSTRUMENTS.md`) asked whether an item exists somewhere in the app. This audit asks two other questions:
1. Is the item at the right **rating**, next to what the outside grades put beside it?
2. Does each band of the path have enough steps, with no holes and a real way in?

Audit 5's 186 item findings still stand. This audit cites them (P-n, G-n, B-n, D-n) rather than repeating them.

---

## 0. Ground rules

### 0.1 Bands and grades

The app has one grade-to-rating formula of its own: the guitar's, `700 + 90·grade + 8·rank` (`path.ts:527-528`). This audit uses it for every instrument.

| Grade (RSL / ABRSM / Trinity) | Debut / Initial | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | beyond 8 |
|---|---|---|---|---|---|---|---|---|---|---|
| App rating | 700 | 790 | 880 | 970 | 1060 | 1150 | 1240 | 1330 | 1420 | 1510+ |

So the bands map like this:
- **Beginner, 700–1000** = Debut / Initial to Grade 3.
- **Intermediate, 1000–1400** = Grades 3–7.
- **Advanced, 1400–1900** = Grade 8, diploma and professional work.

### 0.2 Statuses

- **EXISTS-DEEP**: the item is there with enough levels, the right keys and an applied context, at about the right rating.
- **SHALLOW**: it exists, but with 1–2 levels, no applied context, recognition only (not performed), or a weak density.
- **MISSING**: not on the course path.
- **APP-WRONG**: on the path but wrong. In this audit that almost always means **misplaced**: the item sits two or more grades away from where every syllabus puts it, or its order inside the family is inverted. A few are labels that contradict their rating.

### 0.3 Engine facts that apply to every course

- Every technique level is measured and tempo-laddered (`ladder.ts:26-38`, `rubato.ts:1-18`; see Audit 5 §0). Depth criteria (a) and (b) therefore hold everywhere. Only the 12 keys and the applied context vary.
- **How levels are placed. This is the root cause of most findings below.**
  - **Guitar** levels are placed **by grade** (`path.ts:544`, `guitarPathDifficulty`).
  - **Keys, bass and drums** levels are placed **by their index in the family**: `700 + 70·(index + later)` (`path.ts:532,535,544`). The exceptions are the keys and bass levels listed in `KEYS_LEVEL_DIFF` (`path.ts:432-464`).
  - So when a family was extended later, or a level was added in teaching order rather than difficulty order, an easy level can land at 1500+ or a hard one at 980.
  - The drums are pure index. Every family's level k sits at the same rating, so the drums path is a staircase: 11–21 steps on each 70-point rung (840, 910, … 1470) and nothing in between.
- **Repertoire** steps sit in four clumps, one per tier: 820 / 980 / 1180 / 1380, each item +6 (`src/engine/pathBonus.ts:60,83`).
  - No repertoire step exists above about 1410 in any course.
  - Tier 2 (980–1004) contains *ii–V–I through all twelve keys*, *minor ii–V–i around the cycle* and *Jazz blues in F*, for keys, guitar and bass alike. Those are intermediate jazz tasks placed in the beginner band.
- **"First steps" exist only for piano and voice as path families**: `k-first` and `v-first` (`path.ts:375,380`).
  - Guitar and drums get a *mini-lesson* attached to their first level (`src/content/mini/firstSteps.ts:198-204`: `first-guitar`, `first-strum`, `first-sticks`, `first-rock`).
  - **The bass has no first-steps lesson and no first-steps family at all.**

---

## 1. Piano / keys

### 1.1 Outside checklist (sources)

- **ABRSM piano 2021**:
  - Initial–G2: one-octave scales hands separately, contrary motion from G1–G3, chromatic at G2–G3.
  - G4–G5: all keys by G5.
  - G6–G8: scales a 3rd and a 6th apart, chromatic a minor 3rd apart, double 3rds at G8 / diploma.
  - Broken chords were removed in 2021.
  - Every grade: sight-reading and aural.
- **RCM piano** (from the method's known contents): technique, etudes, pieces, ear, sight-reading per grade. Pedalling appears in the pieces from about G2–G3.
- **RSL / Rockschool piano and keys**:
  - G1–G2 scales hands separately at ♩60: C major, A Aeolian, C / G major pentatonic, E / A minor pentatonic, **A Dorian**.
  - G3: F major pentatonic, C minor pentatonic, **C blues**, **C chromatic**.
  - Improvisation & Interpretation over a chord chart (G1–G5); Quick Study (G6–G8).
- **Beginner methods** (Faber *Adventures* Primer / Level 1, *Alfred's Basic* Level 1; from the methods' known contents): posture, finger numbers, black-key groups, middle-C and C position, note values and rests, grand staff, steps and skips, G and F positions, legato / staccato, simple dynamics, the first chords with melody, short pieces.

### 1.2 Band tables

#### Beginner (700–1000): 70 steps, 55 of them technique

| # | Outside item (grade) | Status | Evidence |
|---|---|---|---|
| KB-1 | Posture, finger numbers, C position (Initial, methods) | SHALLOW | `k-first` 1–2 at 560 / 630 (`generate.ts:5366-5367`): 2 levels, C only. Mini-lesson `first-piano` (`firstSteps.ts:42`). No black-key groups, no G / F positions, no hand-shape check |
| KB-2 | Five-finger positions in several keys | EXISTS-DEEP | `fingers-1` at 700, all 12 keys |
| KB-3 | Thumb under, one-octave scales hands separately (Initial–G1) | EXISTS-DEEP | `k-first-3` 700 (`generate.ts:5368`), `scales-1` 700, `scales-17` 990; `LADDER_AFTER` (`path.ts:382`) |
| KB-4 | Two octaves, hands together (G2–G3) | EXISTS-DEEP | `scales-2/3` 770 / 840, `scales-16` 920 (`path.ts:444-445`) |
| KB-5 | Contrary motion (G1–G3) | EXISTS-DEEP | `scales-4` 910 |
| KB-6 | Chromatic, one octave (ABRSM G2–G3, RSL G3) | APP-WRONG (late) | `scales-7` at 1120 (`path.ts:444`, index 7) |
| KB-7 | Major / minor pentatonic (RSL G1–G2) | APP-WRONG (late) | `scales-28` at **1490** (`path.ts:447`) |
| KB-8 | Blues scale (RSL G3) | APP-WRONG (late) | `scales-29` at **1510** (`path.ts:447`) |
| KB-9 | Dorian / first modes (RSL G1–G2: A Dorian) | APP-WRONG (late) | `scales-19` Dorian at **1530**; Locrian one octave each hand at 1810 (`path.ts:446`). The ordering was an owner decision (AUDIT-SCALES, `path.ts:440-443`), but it contradicts RSL by 5–8 grades. Recheck with the owner |
| KB-10 | Triad arpeggios, inversions, hands together | EXISTS-DEEP, with one APP-WRONG | `arpeggios` 1–3 at 770–910. **But** `arpeggios-9` *Minor triads: inversions, each hand* sits at **1330** (`generate.ts:5539`), long after `arpeggios-3` (minor hands together, 910) |
| KB-11 | Legato / staccato, dynamics | EXISTS-DEEP | `control` 1–4 at 770–980 |
| KB-12 | Pedalling basics (RCM G2–G3 pieces) | APP-WRONG (late) | `control-10` *direct and legato pedal* at **1400** (`generate.ts:5767`). It is the only pedal level |
| KB-13 | Note reading, both clefs | SHALLOW | Topics `key-read` 1–2 (850 / 950) and `key-notes` 1–2: recognition only |
| KB-14 | **Performed sight-reading (every ABRSM / RSL grade)** | APP-WRONG (late) / MISSING in band | `control-11` *Sight-reading: five-finger melodies* (Initial / G1 material) sits at **1470** (`generate.ts:5771`). There is no performed sight-reading below 1470 |
| KB-15 | I–IV–V, simple cadences, chords with melody | EXISTS-DEEP | `cadences` 1–3 (770–910), `voicings-1` 910 |
| KB-16 | Pop accompaniment from chord symbols (RSL G1–G3) | SHALLOW | `accomp-7` *Pop left-hand patterns* at 1214; `song-strum` from 1130. Alberti (`accomp-1`, 840) is the only beginner LH pattern |
| KB-17 | Graded pieces (Initial–G2, incl. classical) | SHALLOW | Repertoire tier 1: 7 folk / pop items at 820–850 (`pathBonus.ts:60`). No minuet, no easy classical (Audit 5 P-22) |
| KB-18 | Aural: echo, play back, intervals (ABRSM aural) | EXISTS-DEEP | `k-ear` 1–5 (700–980), `play-back` 1 |
| KB-19 | Improvisation, beginner | EXISTS-DEEP (drone) / SHALLOW (chart) | `k-impro` 1–3 drone (780–900). RSL-style 4-bar improvisation over a chord chart: none |
| KB-20 | Hand independence: melody over held LH | EXISTS-DEEP | `fingers-3` 840; `k-indep-1` 1000 |
| — | *Early outliers in the band* | APP-WRONG (early) | `k-rhythm-2` *3 against 2 and 4 against 3* at **980** (`keysRhythm.ts:210`): ABRSM G5–G6 material, and a duplicate of `advanced-2` (same content) at 1190 (`generate.ts:5799`). Repertoire *ii–V–I through all twelve keys* at 992 and *minor ii–V–i around the cycle* at 998 (tier 2) |

#### Intermediate (1000–1400): 219 steps

| # | Outside item | Status | Evidence |
|---|---|---|---|
| KI-1 | All major / minor scales, hands together, 2–4 octaves | EXISTS-DEEP, with one APP-WRONG | `scales` 5, 6, 10, 18. **But** `scales-15` *Melodic and natural minor, each hand* sits at **1680** (`generate.ts:5457`), after `scales-6` / `scales-18` cover the same at 1050 / 1060 |
| KI-2 | Scales a 3rd / 6th / 10th apart (G6–G7) | EXISTS-DEEP | `scales-8` 1190, `scales-9` 1260 |
| KI-3 | Arpeggios: dominant 7th, diminished 7th (G5–G6) | EXISTS-DEEP | `arpeggios-4/5` 980 / 1050 |
| KI-4 | Cadences: plagal and deceptive (theory G2–G5) before N6 / augmented 6th (G7–G8) | APP-WRONG (inverted) | `cadences-5` *Neapolitan 6th and augmented 6th* at 1050 comes **before** `cadences-6` *Plagal and deceptive* at 1120 (`generate.ts:5603,5608`) |
| KI-5 | Ornaments (ABRSM Baroque pieces G4–G6) | SHALLOW | `fingers-9` 1260, one level (Audit 5 P-13) |
| KI-6 | Trills, measured trills | EXISTS-DEEP | `fingers-4` 910, `fingers-11` 1400 |
| KI-7 | Pedalling, legato pedal, syncopated pedal | SHALLOW | `control-10` 1400 only (Audit 5 P-19) |
| KI-8 | Sight-reading G3–G6 | MISSING in band | Nothing between 1000 and 1400 |
| KI-9 | Classical pieces: sonatinas, Bach minuets / inventions | MISSING | Audit 5 P-22 |
| KI-10 | Pop / rock / gospel / funk styles (RSL G3–G6) | MISSING | Audit 5 P-36 to P-45. `accomp-7` 1214 is the only pop LH |
| KI-11 | Jazz shells, rootless, comping, Harris | EXISTS-DEEP | `voicings` 3–8, `harris` 1–15 (980–1420, `path.ts:435-437`), `k-lh` 6–11, `k-comp` |
| KI-12 | Polyrhythm 3:2 / 4:3 | EXISTS-DEEP (duplicated) | `k-rhythm-2` 980 and `advanced-2` 1190 |
| KI-13 | Aural: harmonise, transpose, two parts | EXISTS-DEEP | `k-ear` 6–11 (1050–1400) |
| KI-14 | Improvisation over a rock / funk / blues chart (RSL I&I G3–G5) | SHALLOW | `jazz-3` blues scales 1120; `k-solo` 1190+ is jazz only |
| KI-15 | Repertoire, intermediate | EXISTS-DEEP (jazz) | Tier 3, 1180–1222: Autumn Leaves … All the Things You Are |
| KI-16 | Hand independence | EXISTS-DEEP | `k-indep` 1–8 (1000–1400) |

#### Advanced (1400–1900): 266 steps, the densest band

| # | Outside item | Status | Evidence |
|---|---|---|---|
| KA-1 | Double 3rds / 6ths (ABRSM G8, diploma) | SHALLOW | `advanced-4` 1330, part of `advanced-8` 1610 (Audit 5 P-6) |
| KA-2 | Chromatic a minor 3rd / major 6th apart, 3 octaves (G7–G8) | EXISTS-DEEP | `scales-14` 1610 |
| KA-3 | Modes, 4 octaves, every scale type hands together | EXISTS-DEEP | `scales` 19–33, 1530–1900 |
| KA-4 | Tremolo; Czerny velocity; Cortot variants | MISSING / SHALLOW | Audit 5 P-10, P-12, P-15; `fingers-13` 1540 is the only velocity level |
| KA-5 | Sight-reading G7–G8 | SHALLOW | `control-12` 1540, the only advanced reading level |
| KA-6 | Advanced repertoire | SHALLOW | Repertoire ends at 1410 (*Giant Steps*). Above that only heads inside drills (`k-tune`, `k-harm`, 1330–1780) |
| KA-7 | Jazz solo piano, comping, reharm, improvising | EXISTS-DEEP | `k-tex` to 1900, `accomp` 18 / `voicings` 17 at 1900, `k-solo` 13 at 1900, `k-sixdim` 1330–1900, `k-reharm`, `k-ctx` |
| KA-8 | Advanced aural (modulation, bridges) | EXISTS-DEEP | `k-ear` 12–16 (1470–1750) |
| KA-9 | Quick study / lead sheet with hits (RSL G6–G8) | SHALLOW | Audit 5 P-47 |
| KA-10 | Improvising outside jazz | MISSING | Audit 5 P-48 |

### 1.3 Path density (steps per 100 rating points)

```
 500-  1 |
 600-  1 |
 700- 12 |######
 800- 18 |#########
 900- 40 |####################
1000- 40 |####################
1100- 58 |#############################
1200- 51 |#########################
1300- 70 |###################################
1400- 84 |##########################################
1500- 60 |##############################
1600- 62 |###############################
1700- 34 |#################
1800- 18 |#########
1900-  8 |####
```

### 1.4 Jumps and holes

- **Path-wide:** no gap over 70 points between consecutive steps (560 → 630 → 700 is the widest). The path is smooth.
- **Thin start:** only 2 steps below 700 and 12 in 700–799, against 40–84 per 100 points further up. A true beginner gets 3 `k-first` levels and is then in 12-key scales and Alberti bass at 840.
- **Family jumps over 150 points:**
  - `k-impro` 3 → 4: 900 → 1150 (+250).
  - `k-lh` 9 → 10: 1200 → 1360 (+160).
  - `transcribe:keys` 6 → 9: 1390 → 1675 (+285).
  - Repertoire tier 2 → 3: 1010 → 1180 (+170); tier 3 → 4: 1222 → 1380 (+158).
- **Holes by content:**
  - no performed sight-reading below 1470;
  - no pedal level below 1400;
  - no pop / style keys anywhere;
  - no repertoire above 1410.

### 1.5 Prioritized build list (keys)

| Pri | Build | Rating | Why |
|---|---|---|---|
| 1 | **Re-place misplaced levels** via `KEYS_LEVEL_DIFF`. Data only, no new content. | — | KB-6–KB-14, KI-1, KI-4 |
|  | `control-11` → 820 and `control-12` → 1000 | 820 / 1000 | |
|  | `scales-28/29` (pentatonic, blues) → 880 / 960 | 880 / 960 | |
|  | `scales-19/20` (Dorian) → 1000 / 1060 | 1000 / 1060 | |
|  | `scales-7` (chromatic) → 900 | 900 | |
|  | `arpeggios-9` → 860 and `arpeggios-14` → 1300 | 860 / 1300 | |
|  | `control-10` (pedal) → 940 | 940 | |
|  | Swap `cadences-5/6` (plagal / deceptive 1050, N6 / aug6 1330) | 1050 / 1330 | |
|  | Retire or move `scales-15` (duplicate) | — | |
|  | Drop `k-rhythm-2` to ~1150, or retire it as the duplicate of `advanced-2` | ~1150 | |
| 2 | **`k-first` 4–8**: black-key groups, G and F five-finger positions, quarter / half / whole and rests read off the staff, first LH chord + RH melody, first dynamics | 600–760 | KB-1; a real way in |
| 3 | **Sight-reading ladder** `k-read` 1–10 by grade: Initial → G8, key signatures, bass clef, LH, hands together, the ABRSM 30-second look | 760–1600, every ~90 | KB-14, KI-8, KA-5 |
| 4 | **Pop on-ramp** `k-pop` 1–8: chord-symbol block chords, root / 5th / octave LH, sus / add9 / slash, 4 progressions, 8th and 16th pop patterns, RSL-style 4-bar chart improv | 820–1250 | KB-16, KB-19, KI-14 |
| 5 | **Pedal ladder** `control` / `k-pedal` 1–5: direct, legato (syncopated), half pedal, pedal through harmony, una corda | 940–1500 | KB-12, KI-7 |
| 6 | **Graded classical repertoire tier** (public domain): Initial–G8 minuets, Clementi sonatinas, Bach inventions, Chopin preludes, through the piece coach | 820–1700 | KB-17, KI-9, KA-6 |
| 7 | Repertoire tier 5 (1500–1800) and spreading tier 2 so the jazz ii–V items start ~1100 | 1100 / 1500–1800 | §0.3 |

### 1.6 Game ideas (keys)

- **Grand-Staff Runner (beginner).** Notes scroll on the grand staff; play each before it hits the line. The key signature changes every level (C → G → F → D …), and the speed is the grade.
- **Five-Finger Hop.** The hand position jumps (C → G → F → D) on a cue bar; play the 5-note tune in the new position without a wrong note.
- **Pedal Painter.** A chord sequence; the pedal must change "just after" each chord. A smear meter shows overlap; clean changes paint the picture.
- **Chord-Chart Busker (pop).** A 4-chord pop chart with lyrics. Keep a LH pattern and melody going while the coins (accuracy × groove) fall into the hat.
- **Grade Gauntlet.** One scale, one arpeggio, one sight-read, one aural from the grade, back to back. Beat the "examiner" for a grade badge.

---

## 2. Guitar

### 2.1 Outside checklist (sources)

**RSL / Rockschool guitar** (syllabus guide 2012–18, technical groups):

| Grade | Technical requirements |
|---|---|
| Debut | minor pentatonic A and E at ♩70; open chords; a riff; rhythm sight-reading; ear (melodic recall, rhythm); identify the stave and TAB |
| G1 | major pentatonic G; **power chords (2-note)**; major A D E C G and minor A D E; riff; 4-bar sight reading or improvisation |
| G2 | **3-note power chords**; minor 7th and major 7th chords; C / G pentatonics at ♩80 |
| G3 | pentatonics in 2 octaves; arpeggios 1 octave; **barre chords**; dominant 7ths |
| G4 | major, natural minor, pentatonics and blues in 2 octaves; maj7 / m7 arpeggios; harmonic recall I–IV–V |
| G5 | **harmonic minor**; arpeggios in 2 octaves; triads in 3 inversions |
| G6 | **Dorian, Mixolydian**; 7th arpeggios; m7♭5 and dim chords; stylistic studies (tapping / legato, funk 16th strumming, bends / double stops); 12-bar quick study |
| G7 | Lydian, Phrygian, jazz melodic minor; 9th arpeggios and chords; pinch harmonics, octaves |
| G8 | whole tone, diminished, altered; quick study |

**Trinity Rock & Pop guitar** has a similar structure.

**Beginner methods** (from the methods' known contents):
- *Hal Leonard Guitar Method Book 1*: notes on strings 1–3 → all strings in first position, reading standard notation, the first chords (C, G, G7, Em, D7) and strums.
- *Berklee Guitar Method Book 1* (Larry Baione / Leavitt line): reading in position, chords, rhythm.

### 2.2 Band tables

Default path = core families + the jazz add-on. **Fingerstyle, flamenco, prog and country levels are not on the default path** (`ladderFacts.ts:31-35`, `guitarMeta.ts:140`).

#### Beginner (700–1000): 40 steps, 26 technique. The thinnest beginner band of the four

| # | Outside item (grade) | Status | Evidence |
|---|---|---|---|
| GB-1 | Tune, hold, pick grip (Debut, methods) | SHALLOW | Mini-lesson `first-guitar` (`firstSteps.ts:86-128`), attached to `g-chords-1`. Not measured; no tuning step on the path |
| GB-2 | Open chords, every string rings (Debut–G1) | EXISTS-DEEP | `g-chords-1` 708 (`guitar.ts:2538`), `g-chords-2` one-minute changes 798, `g-chords-3` 888 |
| GB-3 | **Power chords (RSL G1 2-note, G2 3-note)** | APP-WRONG (late) | `g-chords-4` *Power chords, palm-muted* at **grade 3 / 978** (`guitar.ts:2541`), after 7th / sus / add9 (`g-chords-3`, grade 2) |
| GB-4 | Strumming: quarters, D-U 8ths, patterns | EXISTS-DEEP | `g-rhythm-1/2` 716 / 806 (`guitar.ts:2547`) |
| GB-5 | Minor pentatonic A / E (Debut) | EXISTS (grade 1) | `g-scales-1` 822 |
| GB-6 | Major pentatonic (G1–G2) | SHALLOW (late) | `g-scales-3` at grade 3 / 1002. Between `g-scales-1` (822) and the next scale level (1002) is +180 |
| GB-7 | Barre chords, dominant 7ths (G3) | EXISTS-DEEP | `g-chords-5` 978; `g-chords-3` 888 |
| GB-8 | **Riffs (RSL group C at every grade, Debut–G5)** | SHALLOW | No riff level before `g-rhythm-8` (grade 4, 1076); `riffecho` bonus at 1050 |
| GB-9 | Reading notation in first position (Hal Leonard / Berklee Book 1) | EXISTS-DEEP | `g-reading-1/2` 862 / 952 |
| GB-10 | Rhythm sight-reading (RSL Debut) and identifying TAB | SHALLOW | TAB is a display setting only; no rhythm-reading level (`g-meter-1` strums in time, 806) |
| GB-11 | Ear: melodic / rhythm recall, major vs minor (Debut–G2) | EXISTS-DEEP | `g-ear-1/2` 830 / 920; topic `play-back` 900 |
| GB-12 | 4-bar improvisation, rock / blues (RSL G1–G3) | SHALLOW | `g-impro-1` 960 (`guitar.ts:2663`) improvises over *blues, minor blues, ii–V–I, a standard*: jazz forms at grade 2 |
| GB-13 | Easy melodies / songs | EXISTS-DEEP | Repertoire tier 1 (820–844) |
| GB-14 | Fingerpicking basics (Hal Leonard Book 1 end, Trinity) | MISSING (default path) | `g-fingerstyle` is an add-on |
| — | *Early outliers in the band* | APP-WRONG (early) | `g-meter-3` *Odd meters: 7/8 and 5/4 riffs* at grade 3 / 986 (`guitarMeter.ts:118`): no RSL or Trinity guitar grade asks for odd meters. `g-meter-2` hemiola at grade 2 / 896. Repertoire *ii–V–I through all twelve keys* 992, *Jazz blues in F* 998 |

#### Intermediate (1000–1400): 173 steps

| # | Outside item | Status | Evidence |
|---|---|---|---|
| GI-1 | Major, natural minor, blues in 2 octaves (G4) | EXISTS-DEEP | `g-scales-3/4` 1002 / 1092 |
| GI-2 | Harmonic minor (G5) | SHALLOW (late) | Only inside `g-scales-7` (grade 8, 1452) and `g-scales-11` Segovia melodic minor (1272) |
| GI-3 | Dorian / Mixolydian (G6) | SHALLOW (late) | Only in `g-scales-7` *Modes, minor, symmetric …* at grade 8 / 1452: two grades after RSL |
| GI-4 | 7th arpeggios (G4–G6), triad inversions (G5) | EXISTS-DEEP | `g-arps-3/4` 1214, `g-arps-6` 1304, `g-chords-6` 1068 |
| GI-5 | m7♭5, dim, drop-2 (G6) | EXISTS-DEEP | `g-jazz-2` 1182 |
| GI-6 | Stylistic: funk 16th strumming (G6) | SHALLOW | `g-rhythm-5` 1166, one level (Audit 5 G-14) |
| GI-7 | Tapping / legato, bends, double stops (G6) | EXISTS-DEEP | `g-legato` 3–5, `g-lead` 2–8 |
| GI-8 | Octaves, harmonics (G7) | EXISTS-DEEP | `g-lead-11` 1296, `g-lead-1` 936 |
| GI-9 | Quick study / rhythm charts with hits (G6–G8) | SHALLOW | `g-reading-6` 1222, `g-reading-8` 1402 (Audit 5 G-12) |
| GI-10 | Harmonic recall I–IV–V (G4–G5) | EXISTS-DEEP | `g-ear-6` 1100 |
| GI-11 | Style rhythms (reggae, country, metal, bossa, neo-soul, Mizrahi) | SHALLOW | One level each, 986–1256 (Audit 5 G-14 to G-20) |
| GI-12 | Reading in positions II–XII | EXISTS-DEEP | `g-reading` 3–7 (1042–1312) |
| GI-13 | Jazz comping, guide tones | EXISTS-DEEP | `g-jazz` 1–9, 13 (1092–1362) |
| GI-14 | Classical / fingerstyle G3–G6 (Trinity classical, Giuliani, Carcassi) | MISSING (default path) | Add-on only |

#### Advanced (1400–1900): 93 steps, but **all between 1402 and 1566**, plus transcribe at 1580 / 1675

| # | Outside item | Status | Evidence |
|---|---|---|---|
| GA-1 | Whole tone, diminished, altered (G8) | EXISTS-DEEP | `g-scales-7` 1452 |
| GA-2 | Sweep, tapping, legato shifts | EXISTS-DEEP | `g-picking-6` 1444, `g-legato-6/7` 1468 |
| GA-3 | Chord-melody, walking with chords, Harris | EXISTS-DEEP | `g-cmel` 1–6, `g-jazz-10/12`, `g-harris` (1452–1566) |
| GA-4 | **Path range above grade 8 (1600–1900)** | MISSING (structural) | `guitarPathDifficulty` tops out at `700 + 90·9 + 80` = 1590 (`path.ts:528`). The last technique step is `g-cmel-6` at 1566. A guitarist rated 1650+ gets no new path step |
| GA-5 | Advanced reading (Leavitt vol. 3, jazz-chart sight-reading) | SHALLOW | `g-reading` stops at grade 7 (1402) |
| GA-6 | Advanced repertoire | SHALLOW | Repertoire ends at 1398 |
| GA-7 | Gypsy jazz, Latin guajeo, slide, open tunings | MISSING | Audit 5 G-19, G-35 to G-37 |

### 2.3 Path density

```
 700-  3 |#
 800- 15 |#######
 900- 22 |###########
1000- 23 |###########
1100- 38 |###################
1200- 51 |#########################
1300- 61 |##############################
1400- 67 |#################################
1500- 25 |############
1600-  1 |
1700-  0 |
1800-  0 |
1900-  0 |
```

### 2.4 Jumps and holes

- **The opening hole:** `g-rhythm-1` 716 → `g-chords-2` 798 (+82). The 700s hold only 2 technique levels (grade 0 has 2 levels in total).
- **Family jumps of +180** (one grade skipped):
  - `g-rhythm` 2 → 3 (806 → 986);
  - `g-picking` 1 → 2 → 4 (814 → 994 → 1174);
  - `g-scales-1` → `-12` (822 → 1002);
  - `g-legato` 2 → 3 and 4 → 5;
  - `g-impro` 2 → 3; `g-bebop` 1 → 2; `g-vl` 1 → 2; `g-ear` 7 → 10.
- **The ceiling:** 1566 (technique), then 1580 / 1675 (transcribe). The band 1600–1900 is empty.
- **Grade counts:** grade 0 = 2, g1 = 7, g2 = 9, g3 = 17 … g8 = 61, g9 = 22 levels. The beginner end is starved compared with the grade-8 pile-up.

### 2.5 Prioritized build list (guitar)

| Pri | Build | Rating | Why |
|---|---|---|---|
| 1 | **Re-grade**: `g-chords-4` power chords → grade 1, with a 2-note then 3-note level; `g-meter-3` odd meters → grade 6; Dorian / Mixolydian and harmonic minor split out of `g-scales-7` into grade-5 / 6 levels | 790–1240 | GB-3, GI-2, GI-3 |
| 2 | **`g-first` 1–5 measured**: tune (tuner, cents-graded), pick strokes on open strings, two-chord changes Em–G, one-string melody reading, a Debut riff | 620–790 | GB-1, GB-8; a way in |
| 3 | **`g-riff` 1–8 (RSL group C)**: one riff per grade Debut → G5 over the band, palm muting, then the riff in all positions | 700–1150 | GB-8 |
| 4 | **Stretch the grade scale above grade 8**: grade 9 → 1510–1600, add grade 10 (1600–1750) and 11 (1750–1900), and move the jazz pro levels (`g-cmel-6`, `g-tune-9`, `g-harris-13`, `g-theory-3`) up | 1600–1900 | GA-4 |
| 5 | **Fill grade 0–2**: one more strum, a pentatonic box-1 sequence, a rhythm-reading-on-muted-strings level, a TAB-reading level (read TAB at tempo) | 700–880 | GB-6, GB-10 |
| 6 | **Rock / blues improvisation at G1–G3** (pentatonic, 4 bars, RSL I&I) before the jazz `g-impro-1` | 850–970 | GB-12 |
| 7 | **Fingerstyle on the default path**: `g-fingerstyle` 1–2 at grade 2–3, with the full family staying an add-on | 880–970 | GB-14 |

### 2.6 Game ideas (guitar)

- **Chord-Change Sprint (beginner).** One minute, two chords. Every clean change scores, and the pair changes when you hit 30. It is the classic one-minute-changes drill as an arcade game.
- **Power-Chord Rail.** Riff notes slide in on six lanes; palm-muted chugs must be short and the accents ring. A practice amp that sounds better as you lock in.
- **TAB Reader Race.** A TAB line scrolls at the grade tempo; read and play it; no notation shown. The race track grows with the grade.
- **Grade-Ladder Boss.** At the end of each grade, a 4-bar riff + chord change + scale from the RSL group list at the grade tempo.

---

## 3. Bass

### 3.1 Outside checklist (sources)

- **RSL / Rockschool bass**: the same structure as guitar.
  - Debut–G2: pentatonics, a riff, root notes, rhythm sight-reading.
  - G3: major scale, arpeggios.
  - G4–G5: 2-octave scales, 7th arpeggios, harmonic minor.
  - G6: modes; slap / funk stylistic study.
  - G7–G8: harmonics, whole tone / diminished, quick study.
  - (from the syllabus's known structure)
- **Trinity Rock & Pop bass**: similar.
- *Hal Leonard Bass Method Book 1* (from the method's known contents): holding, tuning, plucking, open strings, first-position notes on each string, reading bass clef, rock grooves, 8th notes, rests.
- Friedland, Reid (Audit 5 §3).

### 3.2 Band tables

#### Beginner (700–1000): 64 steps, 52 technique

| # | Outside item | Status | Evidence |
|---|---|---|---|
| BB-1 | **Hold, strap, tune, posture (methods, RSL Debut)** | MISSING | No first-steps family and no mini-lesson for the bass (`firstSteps.ts:198-204` maps piano, guitar and drums only). The path opens with 4 parallel levels at 700: `b-chord-1`, `b-pluck-1`, `b-pocket-1`, `b-time-1` (`path.ts:360,377`) |
| BB-2 | Rest strokes on open strings, alternating fingers | EXISTS-DEEP | `b-pluck` 1–3 (700–840) |
| BB-3 | Roots, root–5th (RSL Debut / G1) | EXISTS-DEEP | `b-chord` 1–3 (700–840) |
| BB-4 | Lock with the kick | EXISTS-DEEP | `b-pocket` 1–5 (700–980) |
| BB-5 | Minor / major pentatonic (Debut–G1) | EXISTS-DEEP | `b-scale-1` 840 |
| BB-6 | Major scale (G3) | EXISTS-DEEP | `b-scale-2` 910 |
| BB-7 | Bass clef, first position (Hal Leonard Book 1) | EXISTS-DEEP | `b-read` 1–3 (840–980), `b-posread-1` 980, topic `bass-notes` |
| BB-8 | Riffs (RSL group C) | SHALLOW | `b-styles-1` *Rock* 840 (one level); `riffecho` 1050 |
| BB-9 | Ear: melodic and rhythm recall | EXISTS-DEEP | `b-ear` 1–5 (770–975) |
| BB-10 | Muting, note length | EXISTS-DEEP | `b-length` 1–4 |
| BB-11 | Simple songs | EXISTS-DEEP | Repertoire tier 1 (820–838) |
| BB-12 | First walking (two-feel) | EXISTS-DEEP | `b-walk-1/2` 840 / 896 |
| — | *Early outliers in the band* | APP-WRONG (early) | Repertoire *ii–V–I through all twelve keys* 992, *Jazz blues in F* 998 |

#### Intermediate (1000–1400): 150 steps

| # | Outside item | Status | Evidence |
|---|---|---|---|
| BI-1 | 2-octave scales, 7th arpeggios (G4–G5) | EXISTS-DEEP | `b-fret-5` 1050, `b-chord-6/7` 1050 / 1120 |
| BI-2 | Modes (G6) | EXISTS-DEEP | `b-scale-4` 1050, `b-scale-8` 1330 |
| BI-3 | Harmonic / melodic minor (G5) | EXISTS-DEEP | `b-scale-7` 1260 |
| BI-4 | Slap and pop (G5–G6 stylistic) | EXISTS-DEEP | `b-slap` 1–4 (1120–1330) |
| BI-5 | Ghost notes, funk 16ths | EXISTS-DEEP | `b-ghost` 1–6 (910–1260) |
| BI-6 | Pick | EXISTS-DEEP | `b-pick` 1–7 |
| BI-7 | Walking (Friedland ladder) | EXISTS-DEEP | `b-walk` 4–10 (1007–1342) |
| BI-8 | Styles: Motown, disco, reggae, bossa, samba | SHALLOW | One level each (`b-styles` 3–8; Audit 5 B-9, B-10) |
| BI-9 | Reading: key signatures, chord charts, Nashville | EXISTS-DEEP | `b-read` 4–8, `b-posread` 2–6 |
| BI-10 | Harmonics (G7) | EXISTS-DEEP | `b-legato-5` 1260, `b-ext-1` 1330 |
| BI-11 | Pentatonic positions, one by one, then linked | APP-WRONG (inverted) | `b-scale-5` *Pentatonic positions linked* 1120 comes **before** `b-scale-10` *The five pentatonic positions, one by one* 1470 (`bass.ts:2647,2652`) |
| BI-12 | Broken feel / ballad / two-feel on standards (Reid) | MISSING | `b-walk-14` *Standards in 2, ballads and bossa* is retired (`plan.ts:46`); nothing replaced the ballad / broken feel (Audit 5 B-16) |
| BI-13 | Country two-beat | MISSING | Audit 5 B-26 |

#### Advanced (1400–1900): 172 steps

| # | Outside item | Status | Evidence |
|---|---|---|---|
| BA-1 | Whole tone, diminished, altered (G8) | EXISTS-DEEP | `b-scale-9` 1400 |
| BA-2 | Tapping, artificial harmonics, double stops, chords | EXISTS-DEEP | `b-ext` 3–9 (1470–1890) |
| BA-3 | Afro-Cuban / Brazilian | EXISTS-DEEP | `b-latin` 1–9 (1470–1900) |
| BA-4 | Quick study, session skills | EXISTS-DEEP | `b-read-12/13` 1610 / 1680, `b-walk-16` 1677 |
| BA-5 | Stylistic studies by grade | APP-WRONG (label vs rating) | `b-styles-15` *Stylistic study: rock (Grades 1–3)* at **1768** and `b-styles-16` *funk and slap (Grades 4–6)* at **1834** (`bass.ts:2716-2717`). The titles say beginner / intermediate; the index puts them at the top of the path |
| BA-6 | Jazz waltz walking (Friedland *Expanding*, intermediate) | APP-WRONG (late) | `b-walk-19` at **1844** (`bassNiche2.ts:504`), after the two-chorus solo (`b-walk-15`, 1621) |
| BA-7 | 3–7 shells vs 10ths double stops | APP-WRONG (order) | `b-ext-9` *3–7 shells* 1890 comes after `b-ext-6` *Double-stops: 10ths and shells* 1680 (`bassNiche2.ts:536`) |
| BA-8 | Odd meters, polymeter, prog | EXISTS-DEEP | `b-odd`, `b-prog`, `b-poly` (1400–1900) |
| BA-9 | Upright (Simandl, arco) | MISSING (default path) | Only for an upright / fretless tuning (`ladderFacts.ts:42-45`) |
| BA-10 | Advanced repertoire | SHALLOW | Repertoire ends at 1398; `b-std` 1610–1890 (5 levels) carries the standards |

### 3.3 Path density

```
 700- 11 |#####
 800- 18 |#########
 900- 35 |#################
1000- 26 |#############
1100- 51 |#########################
1200- 31 |###############
1300- 42 |#####################
1400- 48 |########################
1500- 34 |#################
1600- 39 |###################
1700- 24 |############
1800- 17 |########
1900- 10 |#####
```

### 3.4 Jumps and holes

- **Path-wide:** the only gap is 700 → 770 (+70). This is the best-shaped of the four paths.
- **Family jumps over 150:**
  - `b-walk` 12 → 15 (1454 → 1621) and 16 → 19 (1677 → 1844), because levels 13, 14 and 18 are retired and 17 is low-B only;
  - topic `bass-shapes` 2 → 3 (1150 → 1400, +250);
  - repertoire tiers (+170 to +182).
- **The way in:** 4 families open at once at 700 with no orientation step.

### 3.5 Prioritized build list (bass)

| Pri | Build | Rating | Why |
|---|---|---|---|
| 1 | **Bass first steps**: a mini-lesson `first-bass` (hold, strap height, tune with the tuner, rest stroke, thumb anchor) on `b-pluck-1`, plus `b-first` 1–3 measured (open-string quarters on a click, E–A string crossing, a 2-note root riff with the drums) | 600–700 | BB-1 |
| 2 | **Fix placements**: `b-styles-15/16` → ~900 / ~1250 via `KEYS_LEVEL_DIFF` (it already carries bass levels, `path.ts:452`); swap `b-scale-5/10`; `b-walk-19` → ~1350; `b-ext-9` → before `b-ext-6` | — | BI-11, BA-5–BA-7 |
| 3 | **Broken feel / ballad ladder** (`b-walk` or `b-feel` 1–4) in the gap the retired levels left | 1350–1550 | BI-12 |
| 4 | **`b-riff` per grade (RSL group C)** Debut → G5 | 700–1150 | BB-8 |
| 5 | Style ladders (Audit 5 B-9), country (B-26) | 900–1400 | BI-8, BI-13 |

### 3.6 Game ideas (bass)

- **Root Rescue (beginner).** The band plays a chord chart; a root note falls from each chord symbol; catch it on the right string on beat 1. Miss three and the band stops.
- **Kick Twin.** A drum loop; your notes must land with the kick. A twin meter shows "flam" vs "together" in milliseconds.
- **Feel Switcher** (Audit 5) for the broken-feel ladder.
- **Riff Relay.** One riff per grade; pass it to the next "band member" (drums, keys) by playing it 4 times clean at the grade tempo.

---

## 4. Drums

### 4.1 Outside checklist (sources)

**RSL / Rockschool Drums 2018 syllabus** (technical groups, verified from the syllabus PDF):

| Grade | Technical groups | Reading, improvisation, ear |
|---|---|---|
| Debut | single strokes, double strokes and **paradiddles in 8ths at ♩70**; fill | 4-bar snare reading (halves, quarters, rests); fill playback; groove recall; name the kit parts |
| G1 | singles / doubles; paradiddles; fill; moving between cymbals, open hats, syncopated accents | |
| G2 | singles / doubles; paradiddles; **flams**; **triplets**; fill | |
| G3 | singles in 8ths, 8th triplets, 16ths; doubles; paradiddles; flams and drags; triplets; fill | |
| G4 | singles / doubles in 8ths, triplets, 16ths; **single and triple paradiddle in 16ths around the whole kit**; **flam tap and ruffs**; hands-and-feet patterns; fill | 8-bar whole-kit sight reading (dotted 8th–16th); I&I with a 2-bar solo; groove recall + style ID |
| G5 | as G4 at ♩80; **flam accent, single drag tap**; **five-stroke roll phrase**; hands and feet ♩90 | |
| G6 | singles / doubles in triplets, 16ths, sextuplets; **flam paradiddle, paradiddle-diddle in sextuplets**; **single ratamacue**; 5-stroke on toms, 9-stroke; stylistic studies (rock: half-open hat, busy 16th kick; funk: ghosts, quick open / closed hat; jazz / Latin: polyrhythm, coordination) | quick study from a lead sheet |
| G7 | flams; ratamacues; rolls | |
| G8 | singles from quarters to 32nds incl. quintuplets, septuplets, nonuplets; paradiddle-diddle around the kit; **Swiss army triplet and pataflafla**; **triple ratamacue**; 7-stroke on toms, combined rolls; studies (rhythmic displacement and 5/4; linear funk in 32nds, stepped hat; 3-2 / 2-3 clave) | |

Also:
- **Trinity Rock & Pop drums**: similar.
- *Alfred's Drum Method 1* (from the method's known contents): snare reading in 2/4, 3/4, 4/4 and 6/8; the rudiments (rolls 5–17 stroke, flams, drags, ruffs) in solos; dynamics; marching style.

### 4.2 Band tables

#### Beginner (700–1000): 57 steps, 52 technique

| # | Outside item | Status | Evidence |
|---|---|---|---|
| DB-1 | Grip, rebound, kit set-up, counting | SHALLOW | Mini-lessons `first-sticks` / `first-rock` (`firstSteps.ts:130-172`) on `d-time-1` / `d-rock-1`. `d-strokes-1` 770 is the first measured hand level. No set-up (throne, pedal) or kit-parts step; kit parts are only in `d-notation-1` 770 |
| DB-2 | Singles and doubles in 8ths at ♩70 (Debut) | EXISTS-DEEP | `d-rolls-1` 840 (singles), `d-rolls-3` 980 (doubles), `d-strokes` 1–4 |
| DB-3 | **Paradiddle in 8ths (Debut)** | APP-WRONG (late, wrong value) | `d-diddles-1` at **980** in **16ths** at ♩60–100 (`drums.ts:955`; `path.ts:362-365` "paradiddles four in"). No 8th-note paradiddle exists |
| DB-4 | **Flams (G2)** | APP-WRONG (late) | `d-diddles-5` *Flams* at **1260** (`drums.ts:960`): four grades late |
| DB-5 | Triplets (G2) | SHALLOW (late) | `d-fills-4` triplet fills 1050, `d-strokes-6` accented triplets 1120; `d-shuffle-1` hat triplets 910 is the only beginner triplet |
| DB-6 | Basic rock beat, kick variations, cymbal moves, open hat (G1) | EXISTS-DEEP | `d-rock` 1–5 (700–980) |
| DB-7 | One-beat → one-bar fills, land on 1 (Debut–G2 fill group) | EXISTS-DEEP | `d-fills` 1–3 (840–980) |
| DB-8 | Snare reading: quarters, 8ths, rests (Debut–G2, Alfred) | EXISTS-DEEP | `d-read` 1–3, `d-notation` 1–4 |
| DB-9 | 2/4, 3/4, 6/8 snare reading (Alfred) | SHALLOW | `d-count-2` *6/8 or 3/4: the accents decide* 910; `d-read` stays in 4/4 to `d-read-6` |
| DB-10 | Roll notation, multiple-bounce roll (Alfred) | MISSING / SHALLOW | `d-notation-4` tremolo slashes 980; no buzz roll (Audit 5 D-2) |
| DB-11 | Ear: fill playback, groove recall (Debut–G2) | EXISTS-DEEP | `d-ear` 1–4 (770–980) |
| DB-12 | Time with the click | EXISTS-DEEP | `d-time` 1–5 |
| — | *Early outliers in the band* | APP-WRONG (early) | `d-count-3` *7/8: 2+2+3 or 3+2+2* at 980 (`drums.ts:1133`); RSL first asks for 5/4 coordination at G8 |

#### Intermediate (1000–1400): 101 steps

| # | Outside item | Status | Evidence |
|---|---|---|---|
| DI-1 | Singles / doubles in 8ths, triplets, 16ths (G3–G5) | EXISTS-DEEP | `d-rolls` 2–7 (910–1260) |
| DI-2 | **Triple paradiddle (G4–G5)** | MISSING | Not in `drums.ts` (Audit 5 D-5) |
| DI-3 | **Paradiddle around the kit (G4)** | APP-WRONG (late) | `d-diddles-10` *The paradiddle on the kit* at **1610** (`drums.ts:965`), after the ratamacue |
| DI-4 | Flam tap, ruffs (G4); flam accent, single drag tap (G5) | SHALLOW (late) | `d-diddles-6` 1330, `d-diddles-7` 1400: about two grades late |
| DI-5 | Five-stroke roll phrase (G5), 9-stroke (G6) | EXISTS-DEEP | `d-rolls-6` 1190 |
| DI-6 | Hands-and-feet patterns (G4–G5) | EXISTS-DEEP | `d-indep` 1–6 (840–1190) |
| DI-7 | Single ratamacue, flam paradiddle, paradiddle-diddle (G6) | EXISTS (late) | `d-diddles-4` 1190, `-8` 1470, `-9` 1540 |
| DI-8 | Funk ghosts, open / closed hat (G6) | EXISTS-DEEP | `d-funk` 1–6 |
| DI-9 | 8-bar whole-kit sight reading (G4–G5) | SHALLOW (split) | `d-read-5` kit groove 1120, `d-read-7` 1260; *Unseen: 8 bars, exam style* `d-read-11` at 1540 (`drums.ts:1011`) |
| DI-10 | I&I: develop a groove + 2-bar solo (G4–G5) | SHALLOW | `d-fills-8` *Your own fill* 1330; no groove-development level |
| DI-11 | Groove recall + style ID (G4–G6) | EXISTS-DEEP | `d-ear-7` 1190, topic `drum-style` 1–3 |
| DI-12 | Shuffle, 12/8, half-time shuffle, one-drop | EXISTS-DEEP | `d-shuffle` 1–8 |
| DI-13 | Song form, road maps, stops | EXISTS-DEEP | `d-song` 1–6, `d-form` 1–5 |
| — | *Early outliers in the band* | APP-WRONG (early) | `d-prog-2` *9/8, 11/8, 13/8* at 1190; `d-feet-6/7` double pedal 16ths at 1190–1260 (`drums.ts:1062`): grade-8 / metal material at G5–G6 |

#### Advanced (1400–1900): only 35 steps

| # | Outside item | Status | Evidence |
|---|---|---|---|
| DA-1 | Singles in quintuplets, septuplets, 32nds (G8) | SHALLOW | `d-rolls-10` 16ths → 32nds 1470, `d-prog-9` quintuplets / sextuplets 1680 |
| DA-2 | Swiss army triplet (G8) | EXISTS | `d-diddles-8` 1470 |
| DA-3 | **Pataflafla, triple ratamacue (G8)** | MISSING | Audit 5 D-6, D-7 |
| DA-4 | 7-stroke roll on toms, combined rolls (G8) | SHALLOW | `d-rolls-5/6` only (1120–1190) |
| DA-5 | Displacement, 5/4 coordination (G8 rock) | EXISTS-DEEP | `d-prog-8` 1610, `d-prog-1` |
| DA-6 | Linear funk in 32nds, stepped hat (G8 funk) | SHALLOW | `d-prog-7` 1540, one level |
| DA-7 | 3-2 / 2-3 clave (G8 jazz / Latin) | EXISTS-DEEP | `d-latin-3/4`, `d-indep-8` |
| DA-8 | Quick study from a lead sheet (G6–G8) | SHALLOW | `d-song-8` 1470, `d-read-11` 1540 |
| DA-9 | Brushes | SHALLOW | `d-jazz-9` 1540 (taps only; Audit 5 D-14) |
| DA-10 | **Depth of the advanced band** | SHALLOW (structural) | 1500–1900 holds 16 steps; the top is 1820. Every groove family ends before the band: rock 1260, feet 1330, fills 1330, funk / shuffle 1400, Middle-Eastern 1470, reading 1540 |

### 4.3 Path density

```
 700-  7 |###
 800- 13 |######
 900- 37 |##################
1000- 22 |###########
1100- 42 |#####################
1200- 18 |#########
1300- 19 |#########
1400- 19 |#########
1500-  7 |###
1600-  6 |###
1700-  2 |#
1800-  1 |
```

Steps fall only on the rungs 700, 770, 840, 910 … (`path.ts:544`, index × 70). On each rung below 1400 there are 11–21 steps at once and none in between.

### 4.4 Jumps and holes

- **Path-wide gaps:** no gap is over 150 points, but every gap is 70 (a staircase). Above 1400 several rungs carry 1–5 steps.
- **Thin top:** 1540 → 1610 → 1680 → 1750 → 1820 with 5, 4, 2, 2, 1 steps.
- **Repertoire jumps:** 826 → 980 (+154), 992 → 1180 (+188), 1198 → 1380 (+182).
- **Content holes:**
  - no 8th-note paradiddle at Debut;
  - flams four grades late;
  - no triple paradiddle;
  - no pataflafla or triple ratamacue;
  - no groove family continues past 1400.

### 4.5 Prioritized build list (drums)

| Pri | Build | Rating | Why |
|---|---|---|---|
| 1 | **Place drum levels by grade, as guitar does.** Add a `grade` per drum level and route drums through `guitarPathDifficulty`. The first targets: `d-diddles` 1 → Debut (as 8ths), `-5` → G2, `-6/7` → G4–G5, `-10` → G4; `d-count-3`, `d-prog-1/2` → G6–G8; `d-feet-6/7` → G7; `d-read-11` → G5 | — | DB-3, DB-4, DI-3, DI-4, outliers; removes the staircase |
| 2 | **Rudiments to RSL grade 8** (Audit 5 D-2 to D-7): 8th-note paradiddle (Debut), triple paradiddle (G4), ruffs (G4), pataflafla and triple ratamacue (G8), combined rolls, buzz roll | 700–1500 | DB-3, DI-2, DA-3, DA-4 |
| 3 | **Extend the groove families into the advanced band**, 3–4 levels each: rock / metal (blast beat, displacement, 32nd kick), funk (linear 32nds, stepped hat), fills (over-the-bar, odd groupings), feet (heel-toe, double bass 32nds, ostinatos) | 1450–1900 | DA-6, DA-10 |
| 4 | **Drums first steps**: a measured `d-first` 1–3 (stick height and rebound on one hand, kit set-up / name the parts quiz, quarter-note hat + kick) | 600–700 | DB-1 |
| 5 | **I&I level**: develop a written 2-bar groove into 6 bars + a 2-bar solo over the band (RSL G4–G5) | 1060–1150 | DI-10 |
| 6 | **2/4, 3/4, 6/8 snare reading** (Alfred) inside `d-read` 2–5 | 880–1060 | DB-9 |

### 4.6 Game ideas (drums)

- **Rebound Ball (beginner).** One hand, a bouncing ball on the screen. Each stroke must keep the same height (velocity) and spacing; the ball keeps bouncing while you stay even.
- **Fill-and-Land Bridge.** The groove runs; a bridge plank appears on bar 4; your fill must land exactly on the next 1 or the runner falls. The fill length grows (1 beat → 1 bar → across the bar line).
- **Rudiment Ladder by Grade.** One RSL grade per rung: the rudiments of the grade at the grade tempo; clear the rung on 2 days to climb (pairs with priority 2).
- **Groove Dev Jam (I&I).** Two written bars, then the band keeps going and you must develop the groove for 6 bars and solo for 2. Scored on time, landing, and "not copying the same bar".

---

## 5. Cross-course summary

| Course | Steps < 1000 / 1000–1400 / 1400–1900 | Top | First steps | APP-WRONG found |
|---|---|---|---|---|
| Keys | 72 / 219 / 266 | 1900 | `k-first` ×3 (measured) | 11 |
| Guitar | 40 / 173 / 93 | **1566** (+ transcribe 1675) | mini-lesson only | 3 |
| Bass | 64 / 150 / 172 | 1900 | **none** | 4 |
| Drums | 57 / 101 / **35** | 1820 | mini-lesson only | 5 |

**What to do first, across all four courses:**
1. **Placement fixes (data only).** Most APP-WRONG items are index artefacts: keys `control-11/12`, pentatonic / blues / Dorian scales, pedal, cadences; bass stylistic studies; the drum rudiments. Grade-based placement for drums, and `KEYS_LEVEL_DIFF` entries for keys and bass, fix them without new content.
2. **A real way in for bass, guitar and drums:** a measured `x-first` family like `k-first`, plus a bass first-steps lesson.
3. **Performed sight-reading on keys from 760** (today it starts at 1470).
4. **Guitar ceiling:** extend the grade scale above grade 8 so the 1600–1900 band exists.
5. **Drums advanced band:** extend the groove families past 1400.
6. **Repertoire:** spread the tiers (the jazz ii–V items out of the beginner band) and add a tier above 1400.

---

## Sources

- RSL / Rockschool Drums Syllabus Specifications 2018: [newschool.ie copy](https://www.newschool.ie/wp-content/uploads/2019/09/RSL_Drums_Syllabus_Guide_2018_DIGITAL_31May2019-1.pdf), [AMEB copy](https://rockschool.ameb.edu.au/wp-content/uploads/2019/09/RSL_Drums_Syllabus_Guide_2018_DIGITAL_31May2019-1.pdf), [2012 guide](https://cloud.rslawards.com/file/download/RockschoolDrums2012SyllabusNEW.pdf).
- RSL / Rockschool Guitar Syllabus Guide 2012–2018 (technical groups per grade; local text extract from an earlier session). Electric-guitar technical exercises 2018: [AMEB PDF](https://rockschool.ameb.edu.au/wp-content/uploads/2020/04/Technical-Exercises-Electric-Guitar-2018-Online.pdf).
- RSL piano / keys: [Rockschool piano syllabus](https://cloud.rslawards.com/file/download/rockschoolpianosyllabus.pdf), [Keys Debut](https://www.rslawards.com/tabbed-content/keys-debut/), [AMEB spotlight on Rockschool Keys](https://www.utas.edu.au/australian-music-examinations-board/ameb-news-and-events/ameb/spotlights/spotlight-on-rockschool-keys-syllabus).
- ABRSM piano 2021 scales: [PianoDao review](https://pianodao.com/2020/07/12/abrsm-piano-scales-2021/), [David Barton review](https://www.davidbartonmusic.co.uk/?p=7237), [ABRSM Initial Grade scales](https://boosey.com/shop/prod/Piano-Scales-Arpeggios-ABRSM-Initial-Grade/2405537).
- Trinity Rock & Pop drums resources: [trinitycollege.com](https://trinitycollege.com/resource?id=7898).
- From the methods' known contents (no table of contents fetched): RCM piano, Faber *Adventures*, *Alfred's Basic Piano*, Hal Leonard Guitar / Bass Method Book 1, Berklee Guitar Method Book 1, *Alfred's Drum Method 1*, RSL bass, Trinity Rock & Pop guitar / bass.
- App: path dump of `stepCatalogue()` × `inCourse()` × `ladderFamiliesFor()` at 1cfb0f9b (default settings), plus `docs/research/AUDIT-5-INSTRUMENTS.md`.

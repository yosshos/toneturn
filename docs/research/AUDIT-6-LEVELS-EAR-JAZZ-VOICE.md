# AUDIT-6: the Ear, Jazz and Voice courses as paths, by level band (2026-11-15)

Audit 5 checked content against outside syllabi. This audit checks the **levels**: does each course's path give a beginner (700–1000), an intermediate (1000–1400) and an advanced player (1400–1900) the right items, at the right rating, in a smooth order?

**Method.**
- I dumped the live step catalogue with two temporary vitest scripts, then deleted them. They called `stepCatalogue()` and filtered it with `eligible()` and `courseInput()`. The voice course was given the vocal families as `ladderFamilies`, as `ladderFamiliesFor` does. The jazz pack was on for Jazz and off for Ear; the maqam, post-tonal and production packs were off.
- The dump imports `engine/rush`, because `App.tsx:138` imports `Rush` statically, so the live app registers the game-only topics too (see E-W1).
- Totals: Ear 421 steps, Jazz 259, Voice 175.
- I also dumped every vocal level's items with their own `difficulty` (`vocalLevelByRef`), to compare where a level sits on the path with how hard its items are.
- "Rating" below means the step's catalogue `difficulty`. The path sorts by it (`path.ts:258-338`).
- The outside checklists come from syllabus PDFs fetched for this audit:
  - ABRSM aural tests from 2024 (Initial–G8)
  - RCM Musicianship Addendum 2024 (Prep–L10)
  - RSL Vocals spec (Debut–G8)
  - Trinity Rock & Pop Vocals session skills
  - ABRSM Jazz Piano G1–5, plus the new Jazz Performance Grades 6–8 (2026)
  - Berklee ET-111
  - Aebersold Vol. 1, Siskind *Jazz Piano Fundamentals* Book 1, and the Open Studio beginner path

  Trinity has no jazz piano syllabus and RSL has no jazz syllabus, so those rows use ABRSM jazz and the method books. Items marked [PK] were not verifiable online and come from prior knowledge.

**Status codes** (as in Audit 5):
- **EXISTS-DEEP**: performed or produced, in context, more than one answer mode, partial credit where it fits.
- **SHALLOW**: present but choice-only, or isolated, or too few levels.
- **MISSING**
- **APP-WRONG**: wrong content, or placed in the wrong course or at the wrong level by more than about 300 points.

---

## 0. Cross-course findings (read first)

| # | Finding | Evidence |
|---|---|---|
| X1 | **Game-only topics leak into the Ear path, and only in the running app.** `topicsAdvGames.ts` says these are "Game-only topics … registered by engine/rush.ts, not the lesson catalogue". But `stepCatalogue()` rebuilds whenever `TOPIC_GEN` grows, and `App.tsx` imports `Rush` statically, which imports `rush.ts`. So `voicing-type` 1–5, `name-standard` 1–4, `jazz-chains` 1–3, `mm-modes` 1–2, `chord-read-alt` 1–3 and `interval-cells` 1–2 (19 steps, 1050–1660) are Ear path steps in the app. In the vitest catalogue, which has no `rush` import, they are absent. The path therefore depends on module load order, and tests check a different path from the one users get. These are also jazz topics landing in Ear, not Jazz. | `topicsAdvGames.ts:1-4`, `path.ts:257-262`, `rush.ts:9-11`, `App.tsx:138` |
| X2 | **The jazz-ear material is split between two courses with no rule.** A topic goes to Jazz only if it is in `PACK_TOPICS` (`path.ts:229-250`) or its skill maps to the `creative` domain (`rating.ts:35`, `courses.ts:73,81-86`). As a result, rootless and upper-structure ear work, the jazz-blues and AABA grids, the bebop scales, jazz progressions and jazz forms all sit in **Ear**. Examples: `upper-rootless` 1–4, `voicings` 3–5, `extensions` 2–8, `grid-dictation` 5/7/8, `scale-types` 5, `progressions` 2, `next-chord` 2, `song-form` 6, `chart-analysis`. Guide tones, comping and Barry Harris sit in **Jazz**. A Jazz-only student never hears a rootless voicing as an exercise. | dump; `path.ts:229-250` |
| X3 | **The `creative` domain is a grab-bag that lands in Jazz.** It holds expression (`dynamics`, `articulation`, `mood`), `nashville`, `transpose`, `transposition`, `melodic-transform` and `displacement`. Expression is the ABRSM aural "features" test (G1–G5 D/C), so it belongs in Ear. Nashville numbers and concert↔written transposition are theory. | `rating.ts:35`; `topicsAD.ts:652,833,871,910`; `topicsTheory.ts:327` |
| X4 | **No consecutive-step gap over 150 anywhere in the three catalogues** (the only gap of 100 or more is Voice 1760→1860, `sight-modulate` 4→5). The jumps are inside strands, where many topics move 200–350 points per level (listed per course). For Voice the catalogue ratings hide jumps, because they are not content ratings (V-W1). | gap scan of the dump |

---

## 1. EAR course (421 steps)

### 1.1 Density (steps per 100 rating points; each █ = 4 steps)

```
 700 ▌ 6        basics-*, octave, meter-feel 1, key-notes
 800 ██ 8
 900 █████ 19
1000 ████████▌ 34   (13 steps sit exactly on 1000 — a cliff at the band edge)
1100 ██████████ 41
1200 █████████ 37
1300 █████████████████ 69
1400 ███████████████ 60
1500 █████████████▌ 54
1600 ████████▌ 34
1700 ██████ 25
1800 ███ 12
1900 ▌ 3        in-tune 5 at 1950 is above PATH_CAP
```
Band totals: beginner (700–999) 33, intermediate (1000–1399) 188, advanced (1400–1900) 199.

Answer modes across the course:
- choice 308
- place on the staff or keys 29
- tap (`rhythm-read`) 32
- rhythm dictation 8
- grid 8
- lessons 22, games 14

**There is no sung or played item in the course**, because sung steps go to Voice (`courses.ts:73`).

### 1.2 Band tables

**Beginner, 700–1000** (ABRSM Initial–G3, RCM Prep–L3)

| Outside item | Status | Evidence / note |
|---|---|---|
| Clap or tap the pulse; 2 or 3 or 4 time (ABRSM A) | EXISTS-DEEP | `lesson:basics-beat` 883 (keep the beat), `basics-beat` 1–3 (760/900/1080), `meter-feel` 1–2 (800/950) |
| Echo-sing short phrases (ABRSM B) | EXISTS in Voice | `v-ear` 1 "Sing it back", `v-songs` 1 (1309 song echo). Correct by course design. |
| Spot a pitch change and say where (beginning or end) (ABRSM C) | SHALLOW | `basics-samediff` 1–3 asks same or different only. Locating the note comes at `sight-read` 2 (1300), 500 points later. |
| Spot a rhythm change | EXISTS | `rhythm-memory` 1 (1000), `rhythm-errors` 1 (1050, which beat) |
| **Clap back a 2-bar rhythm (ABRSM Initial–G1 B, RCM clapback, every level)** | **MISSING** | Rhythm work is either read-and-tap (`rhythm-read` shows notation or words, `lesson.ts:212-220`) or dictation (`rhythm-build`). Nothing has you hear a rhythm and tap it back without seeing it. |
| Dynamics, articulation, tempo questions (ABRSM D) | **APP-WRONG (course)** | Tempo is in Ear (`tempo` 1–2, 1000/1150). Dynamics and articulation are in **Jazz** (`dynamics` 700/820/950, `articulation` 750/880/1000), see X3. |
| Major or minor tonality (ABRSM G3 D) | EXISTS | `lesson:major-minor` 1000, `triads` 1 (950), `scale-types` 1 (1050). The "joyful or sad" mood item is in Jazz. |
| m3/M3, then P5, then P4, ascending **and descending** (RCM L1–L3) | **APP-WRONG (level)** | The first interval naming is `intervals-all` 1 at 1050 (ascending 3rds, 4th, 5th, 8ve). **Descending first appears at `intervals-all` 4, rating 1450** (`topicsSkills.ts:98-106`). RCM asks for descending m3/M3 at L1. |
| Major/minor triad, broken then solid (RCM L1) | EXISTS-DEEP | `triads` 1 (950), `chord-read` 1 (900, on the keys), `lesson:major-minor` |
| Is a note the root, 3rd or 5th of the triad? (RCM L3) | **APP-WRONG (course)** | `ct-degree` 1 "root, 3rd or 5th?" (1050) is tagged jazz-pack (`path.ts:244`), so it sits in Jazz. Ear has no item for it. |
| Play back a short melody (RCM Prep) | EXISTS elsewhere | Keys and Voice courses. Ear has `staff-dictation` 1 (1000, three notes by step) as the written form. |
| A true beginner's way in | EXISTS-DEEP | The taste "High, low and home" (`courseStart.ts` TASTES.ear.new) leads into `basics-*` at 700. Placement uses `placement.ts`. |

**Intermediate, 1000–1400** (ABRSM G4–G6, RCM L4–L7)

| Outside item | Status | Evidence / note |
|---|---|---|
| Sing or play back a melody from memory (ABRSM G4–5 A) | EXISTS (written) / Voice (sung) | `staff-dictation` 2–4 (1120–1350, place), `figure-out` 1–4. Sung: `v-ear` 1, 5. |
| Sight-sing 5–6 notes (ABRSM G4–5 B) | Voice | `v-sight` 1–4, but see Audit 5 W3 (3 fixed seeds). |
| Character; style and period (ABRSM G4–5 C) | SHALLOW + APP-WRONG | `style` 1–4 (1100–1400) is choice-only. "Character" is `mood` 1–4, which is in Jazz (X3). |
| Clap back the rhythm of an extract, then name the time (ABRSM G4–6) | **MISSING** (performed) | `time-signatures` 2–3 and `meter-feel` 3 are choice only (see beginner clapback). |
| **Upper part of a two-part phrase** (ABRSM G6 A) | EXISTS (written); SHALLOW (by ear) | `two-part` 1–2 (1250/1300, place) is good. But the choice item `two-voice` 2 "upper voice" sits at **1650**: a +350 jump from `two-voice` 1 (1300). |
| Cadence: perfect or imperfect (ABRSM G6 C) | EXISTS-DEEP | `cadence-types` 1–2 (1100/1220), `lesson:cadences` 1050, `where-home` 1–3 |
| Texture and structure (ABRSM G6 D) | EXISTS | `voice-count` 4 (1350, mono/homo/poly), `form` 1–2, `song-form` 1–4 |
| Dominant 7th, then diminished 7th, then augmented triad (RCM L5–L7) | EXISTS-DEEP | `seventh-chords` 1–2 (1150/1250), `triads` 2 (1050) |
| I–IV–I and I–V–I, minor i–iv–i, then I–IV–V (RCM L5–L7) | EXISTS-DEEP | `function-ear` 1–3 (1000–1150), `harmonic-dictation` 1 (1300), `grid-dictation` 1 (1100, grid) |
| Harmonic intervals; m2/M2; m7/M7 (RCM L5–L7) | EXISTS | `intervals-all` 2 (1250, all 12 ascending), 3 (1380, harmonic). The jump from 1050 to 1250 is +200. |
| Clapback in 3/4 and 6/8 (RCM L4) | MISSING (performed) | `meter-feel` 3 (1250) is choice. |
| Hear a modulation (ABRSM G7, previewed) | EXISTS | `modulation` 1–2 (1150/1300) |

**Advanced, 1400–1900** (ABRSM G7–G8, RCM L8–L10)

| Outside item | Status | Evidence / note |
|---|---|---|
| Lower part of a two-part phrase (ABRSM G7 A, RCM L10) | EXISTS (written), SHALLOW (ear) | `two-part` 3–6 (1400–1700, place); `two-voice` 3 "lower voice" (1750, choice) |
| **Lowest part of a three-part phrase** (ABRSM G8 A) | **MISSING** | Audit 5 D6. Nothing has three-voice dictation. |
| Cadences perfect, imperfect, interrupted, then plagal in a continuing phrase (G7–8) | EXISTS-DEEP | `cadence-types` 3–5 (1360–1500), incl. "in texture" (1420) and "name the chords" (1500) |
| Name the 2 cadence chords; 3 chords with inversions (G7–8) | EXISTS-DEEP | `cadence-types` 5 (1500), `harmonic-dictation` 3 (1680), `chorale-rn` 3–4 (1580/1690) |
| Modulation to the dominant, subdominant or relative; then one from major and one from minor (G7–8) | EXISTS-DEEP | `modulation` 3–5 (1480–1580), `modulation-means` 1–5, `key-centres` 1–3 |
| Describe a piece's features unprompted (G8 D) | SHALLOW | `style` 4 (1400) only. No multi-feature item with per-feature credit (Audit 5 O2/O4). |
| 4-chord progression ID; 1st-inversion 7ths; m9/M9; maj7/min7; 5 chords with a cadential 6/4 (RCM L8–L10) | EXISTS-DEEP | `harmonic-dictation` 2–6, `grid-dictation` 3–8, `seventh-chords` 4–5, `compound-intervals` 2–3, `chromatic-harmony` 1, `chorale-rn` 4 |
| Sing one part from the score while the other plays (ABRSM G7–8 B) | MISSING | Audit 5 S6/#12. Not even in Voice: `v-harmony` 8 sings the middle part by ear, not from the score. |
| Single-hearing playback (RCM L10) | MISSING | Every item can be replayed. |
| Does the advanced end go far enough? | Mostly yes | Fine pitch to 10¢, odd and mixed meters, polyrhythm 7:4, jazz harmony to 1900. The Audit 5 gaps remain: sequences, Ger⁶↔V⁷, classical forms, timbre. |

### 1.3 Jumps and holes (Ear)
- **Strand jumps of 250 or more:**
  - `meter-feel` 950→1250→1550 (+300, +300)
  - `two-voice` 1300→1650 (+350)
  - `note-reading` 950→1240 (+290)
  - `theory-facts` (+250 ×2)
  - `voice-count` 900→1150
  - `voice-leading` 1150→1400
  - `vl-ear` 1400→1650
- **Strand jumps of 200:** 23 strands, including `intervals-all` 1→2, `rhythm-memory`, `sight-read`, `fine-pitch` and `harmonize`.
- **No hole in the overall path.** The beginner band is thin: 6 steps in 700–799. Then 13 steps sit exactly at 1000, so the first interval, the first cadence and the first rhythm dictation all land on the band edge together.

### 1.4 Ear build list (prioritised)

| Prio | Build | Ratings |
|---|---|---|
| 1 | **Fix X1.** Keep the game-only topics out of the path, or register them deliberately. Either way, put the jazz ones in Jazz. | — |
| 2 | **Move expression into Ear** (`dynamics`, `articulation`, `mood` → Ear; X3), and add **tempo/dynamics/articulation in a real phrase** (ABRSM D wording) | 720 loud/quiet · 800 smooth/detached · 900 getting faster/slower · 1050 character word · 1250 two features at once (partial credit) |
| 3 | **Rhythm clap-back by ear**: hear it, tap it back, no notation. Reuse `rhythm-read` grading with a hidden `rhythm`. | 760 one bar of quarters and halves · 850 two bars, 3/4 or 4/4 · 950 eighths · 1100 dotted rhythms · 1250 6/8 · 1400 syncopation · 1550 swing / triplets |
| 4 | **Descending intervals early** (split `intervals-all` 4) | 900 m3/M3 descending · 1000 P4/P5 descending · 1150 all descending |
| 5 | **Triad member ID (R/3/5) in Ear** (an Ear copy of `ct-degree` 1, or move it) | 950 · 1050 in inversion |
| 6 | **Locate the change** (ABRSM C): "near the start or the end?", then "which note?" | 800 · 900 · 1000 (closes the 900→1300 gap before `sight-read` 2) |
| 7 | **Smooth the strands:** add `meter-feel` 1100/1400, `two-voice` 1450, `note-reading` 1100 and an `intervals-all` 1150 middle level (6ths, 7ths) | as listed |
| 8 | Three-part dictation, score-based part singing, single-hearing mode (Audit 5 #11–12) | 1550–1850 |

### 1.5 Ear game ideas
- **Echo Drummer**: Toni plays a bar on the snare and you tap it back. A streak doubles the bar length, and an "echo ladder" climbs 760→1550. This builds on build #3.
- **Interval Elevator, both ways**: the car goes up or down and you name the floor gap. Descending floors unlock at 900.
- **Spot the Prankster**: the band repeats a phrase and one player changes a note or a rhythm. Tap the moment on a timeline (first half or second half → which beat).
- **Feature Bingo**: a short track, and you mark three cards (dynamics, articulation, tempo, tonality). Each correct card scores (partial credit).

---

## 2. JAZZ course (259 steps)

### 2.1 Density (each █ = 4 steps)

All steps:
```
 600 ▌ 1     mood 1
 700 ▌ 2     dynamics 1, articulation 1
 800 █ 5     mood/dynamics/articulation + 2 unit-end repertoire steps
 900 █▌ 6    mood/dynamics/articulation + 4 unit-end repertoire steps
1000 ██▌ 11
1100 ███ 13
1200 ██████ 24
1300 ██████████▌ 43
1400 ███████████ 45
1500 ████████████▌ 50
1600 █████████▌ 39
1700 ████ 17
1800 ▌ 3
```
**Jazz-specific regular steps only** (no expression filler, no unit-end repertoire or bonus steps):
```
 700–999  (none)
1000 ██ 7  · 1100 ██ 8 · 1200 █████▌ 22 · 1300 █████████▌ 39 · 1400 ███████████ 45 · 1500 ████████████▌ 50 · 1600 █████████▌ 39 · 1700 ████ 17 · 1800 ▌ 3
```
- Band totals: beginner 13 (none of them jazz-specific regular steps), intermediate 91, advanced 154.
- 73 of the 259 steps are Barry Harris topics (`bh-*`).
- Answer modes:
  - choice 222
  - place 5 (`reharm-own` 3–5, `jazz-phrase` 6–7)
  - 4 lessons, 28 game steps (4 licks, 5 transcribe, 3 bonus, 16 repertoire)

**The course path contains no improvised or comped performance.** The only measured playing is the lick trainer (licks 1–4, 1000–1360). Repertoire steps can open piano comping ways, but they arrive only at a unit's end, every third unit (`pathBonus.ts:111-115`). Improvising and comping live in the instrument courses (`k-impro`, `k-solo`, `k-comp`, `g-jazz`, `b-walk`, `v-scat`).

### 2.2 Band tables

**Beginner, 700–1000** (ABRSM Jazz G1–3; Aebersold 1; Siskind JPF 1 first units; Open Studio start)

| Outside item | Status | Evidence / note |
|---|---|---|
| What the beginner band actually contains | **APP-WRONG** | The first 9 path steps (650–1000) are `mood`, `dynamics` and `articulation`. These are general musicianship, not jazz (X3, `courses.ts:74`). |
| **Swing vs straight; long-short eighths** (ABRSM jazz aural, every method's unit 1) | **APP-WRONG (level)** | `swing-ratio` 1 "Straight or swing?" is rated **1400** (`topicsEar.ts:466`, `1150 + 250*level`). Yet it is the Jazz "new" taste (`courseStart.ts:463-465`), and "Swing feel" is rung 1 of the course ladder (`courseStart.ts:298`). A beginner takes it on day one, then meets it again on the path 400 points later. |
| Accents on 2 and 4, swung eighths you tap | EXISTS in Ear only | `click-backbeat` 1 (1050) and `click-subdivide` 5 "swung eighths" (1400) are Ear steps. Jazz has no tapped swing item. |
| 12-bar blues form (I7–IV7–V7, F/B♭) | SHALLOW | Only unit-end repertoire steps: `rep:jazz:blues-basic` 980, `blues-f` 986. The first regular blues step is `jazz-form` 1 "major or minor blues?" at 1350. Blues-form-by-ear (`form-ear` 1, 1300) is in Ear. |
| Blues scale / minor pentatonic, Dorian, Mixolydian (ABRSM jazz scales) | SHALLOW + split | `chord-scale` 1 (1300, reading) is in Jazz. Hearing these scales (`scale-types` 2, `modes-ear`) is in Ear. Nothing has you *use* the blues scale in Jazz before `pent-super` (1420). |
| Shell voicings 1-3-7 / 1-7-3 | SHALLOW | Only by ear: `lh-tex-ear` 1 "shell or 10th?" (1000). Ear has `voicing-type` 3 (1250, X1). No item has you build or spell a shell. |
| First comping rhythm (Charleston) | SHALLOW | `comp-rhythm-ear` 1 (1000, choice of 3). There is an inverted order: the easier `comping` 1 "Charleston or four to the bar" sits at **1300** (`topicsJazz.ts:268`). |
| Guide tones 3–7 | SHALLOW (late) | `guide-tones` 1 is at 1420 (`topicsJazz.ts:362`, `1300+120*level`). Siskind and Open Studio teach guide tones in month 1–2. A unit-end `rep:jazz:guide-tones` appears at 826. |
| First improvisation (call & response, blues scale, then chord tones) | SHALLOW | `call-response` 1 (1050) is choice-only: "which answer sounds finished?". Licks 1 (1000) is played, but it is memorised vocabulary, not improvising. |
| Call & response aural test: play or sing back, then answer (ABRSM jazz) | MISSING in Jazz | The sung form is in Voice (`v-scat` 1 "Call and response", path 1050). |
| maj7/7/m7 and ii–V–I | EXISTS | `lesson:jazz-1` (1136), `jazz-changes` 1 (1300) |
| A true beginner's way in | **APP-WRONG** | The taste is swing (1400-rated). The path starts with "joyful or sad?". The first jazz regular step is at 1000. The course promises "Swing feel → Blues → Standards" (`courseStart.ts:298-300`), and the beginner path matches none of it. |

**Intermediate, 1000–1400** (ABRSM Jazz G4–5; Berklee ET1/Harmony 1; Levine; Siskind units 6–12)

| Outside item | Status | Evidence / note |
|---|---|---|
| Diatonic 7ths, functions, ii–V–I major and minor | EXISTS | `jazz-changes` 1 (1300), `jazz-1`, `nashville` 1–3 |
| Turnarounds I–vi–ii–V, iii–vi–ii–V | EXISTS | `turnarounds` 1 (1390); `rep:ear:turnarounds-ear` is in Ear |
| Rootless A/B voicings | **APP-WRONG (course)** | All rootless ear items are in Ear: `voicings` 4 (1700), `upper-rootless` 1–2 (1650/1720), `voicing-type` 3–4 (X1, X2). Jazz has none. |
| Minor ii–V (ø7–7♭9), altered dominants | SHALLOW in Jazz | `guide-tones` 2 (minor, 1540). `extensions` 2 (altered, 1490) is in Ear. |
| Bebop scale, enclosures | EXISTS (late) | `jazz-phrase` 3–5 (1540–1580), `chromatic-added` 1–2 (1250/1350) |
| Rhythm changes | EXISTS | `jazz-form` 2 (1450), `rep:jazz:rhythm-full` 1380 |
| A first standard (Autumn Leaves, Blue Bossa, Summertime) | EXISTS (unit end) | `rep:jazz:autumn` 1180, `blue-bossa` 1186, `so-what`, `satin`, `misty` |
| Improvise a 4-bar answer (ABRSM jazz G5 aural) | MISSING in Jazz | `call-response` 2–3 are choice only. |
| Barry Harris foundations | EXISTS-DEEP (by ear) | `bh-convert`, `bh-tone`, `bh-scale`, `bh-block`, `bh-pivot-arp`, `bh-three-dim`: about 35 steps from 1150 to 1400. |
| Swing feel | APP-WRONG | See beginner. The only swing items are at 1400, 1650, 1750 and 1850. |

**Advanced, 1400–1900** (ABRSM Jazz Perf. G6–8; Audit 5 jazz checklist)

| Outside item | Status | Evidence / note |
|---|---|---|
| Real Book lead sheets: head plus a chorus, ballad / Latin / up-tempo | SHALLOW in Jazz | Repertoire tier 4 (1380–1398) is the last repertoire. Nothing in the 1400–1900 Jazz path is a performed head or chorus; that lives in `k-tune`, `k-solo` and `v-standards`. |
| Reharm, colour, Coltrane, polychords, triad pairs, pentatonic superimposition | EXISTS-DEEP (by ear) | `reharm-spot` 1–5, `reharm-own` 1–5 (3–5 place), `triad-pairs`, `pent-super`, `polychords`, `mediants`, `planing`, `modern-color` |
| Jazz dictation of changes and lines | EXISTS | `jazz-dictation` 1–5, `jazz-phrase` 6–7 (place), transcribe 4–8 |
| Swing feel at tempo; placement (on top / laid back) | EXISTS | `swing-ratio` 3–4 (1750/1850) |
| Barry Harris depth | EXISTS-DEEP | `bh-sixfive`, `bh-tesseract`, `bh-brothers`, `bh-moves` up to 1750 |
| Does it go far enough? | Yes for ear and theory; no for performance | The top is 1850. Audit 5's MISSING items (outside playing, waltz comping, interactive comping, free improvisation) remain. |

### 2.3 Jumps and holes (Jazz)
- **Hole:** no regular jazz-specific step from 650 to 1000 (about 350 points), apart from unit-end repertoire.
- **Strand jumps of 250 or more:**
  - `swing-ratio` 1400→1650
  - `chord-scale` 1300→1550
  - `lh-tex-ear` 1000→1250
  - `solo-tex-ear` 1200→1450→1700
  - `displacement` 1320→1560
- **Strand jumps of 200:** `comp-rhythm-ear` ×2, `call-response`, `modal-mix`, `pedal-ear` ×2, `melodic-transform`, `rhythm-transform`, `bh-tone`.
- **Overload:** 1300–1600 has 138 steps (39–50 per 100), more than half of them Barry Harris choice items. The beginner band has 0.

### 2.4 Jazz build list (prioritised)

| Prio | Build | Ratings |
|---|---|---|
| 1 | **Re-rate swing:** `swing-ratio` 1 → about 800, 2 → about 1150 (`topicsEar.ts:466`). Add a tapped swing item in Jazz: tap swung 8ths with the ride, accent 2 and 4 (reuse `click-subdivide` 5 and `click-backbeat` 1 as Jazz copies). | 760 straight/swing · 850 tap 2 and 4 · 950 tap swung 8ths · 1150 how much swing |
| 2 | **Move expression out of Jazz** (X3) and give the beginner band real jazz content. | — |
| 3 | **A blues on-ramp in the regular path** (not only unit-end): count the 12 bars (where are we?), I/IV/V by ear, the blues scale by ear, then sing or play it. | 780 bar counter · 850 which chord (I7/IV7/V7) · 920 blues-scale or major? · 1000 jazz blues vs basic blues |
| 4 | **Shells and guide tones early**: name or build a shell (choice → place), 3–7 line choice, then `guide-line` place. | 850 shell 1-3/1-7 · 920 spell a shell on the keys (place) · 1000 guide tones of ii–V–I · re-rate `guide-tones` 1 to about 1050 |
| 5 | **Comping order**: re-rate `comping` 1 to about 900 (2 choices) and keep `comp-rhythm-ear` 1 at 1000. Add "comp the Charleston" as a tap item over a blues. | 900 · 1000 · 1100 tap Charleston through 12 bars |
| 6 | **First improvisation, performed**: a "one-note solo" (rhythm only, tap or sing one pitch over a blues), then 3 notes of the blues scale, then answer a 2-bar call. Grade time plus note choice; no right melody. | 850 · 950 · 1050 · 1200 4-bar answer (ABRSM G5) |
| 7 | **Put the jazz-ear items in Jazz** (X1, X2): `voicing-type`, `upper-rootless`, the jazz `voicings` levels, `name-standard`, `jazz-chains`, `mm-modes`, `chord-read-alt`, the jazz grids. Or show them in both with shared credit. | as now |
| 8 | **Thin the 1300–1600 Barry Harris block** and fill 1000–1250 (e.g. move `bh-convert` 1 and `bh-tone` 1 earlier, and spread the `bh-*` L1s) | — |

### 2.5 Jazz game ideas
- **Swing-o-meter**: a needle swings from straight to hard swing while the band plays. Freeze it on the right ratio. Beginner zone 2 sectors, advanced 4.
- **Blues Bus**: a 12-stop route where each stop is a bar. Shout the stop (I/IV/V) before the bus arrives. At expert level the bus takes the Bird-blues route.
- **One-Note Jam**: one pitch, any rhythm, 12 bars, scored on time and space (rests count). It unlocks a second note every chorus.
- **Shell Builder**: drop the 3rd and the 7th onto the root before the chord sounds. Speed rounds through the ii–V cycle.

---

## 3. VOICE course (175 steps)

### 3.1 Density

Path placement (as the path orders it; each █ = 2 steps):
```
 500 ▌ 1 · 600 ▌ 1
 700 █████▌ 11
 800 ██████▌ 13
 900 ███████████████▌ 31
1000 █████████ 18
1100 █████████████████▌ 35
1200 ████████▌ 17
1300 ██████▌ 13
1400 ████████▌ 17
1500 ███▌ 7
1600 ████ 8
1700 █ 2
1800 ▌ 1
```
Content (the mean item `difficulty` of the 130 vocal levels; each █ = 2 levels):
```
 700 █ 2 · 800 ▌ 1 · 900 █▌ 3 · 1000 ████▌ 9 · 1100 ██████████ 20 · 1200 ███████ 14 · 1300 █████████████████ 34 · 1400 ██████████████ 28 · 1500 ██████ 12 · 1600 ███▌ 7 · 1700+ (none)
```
- Band totals on the path: beginner 55, intermediate 83, advanced 35.
- Answer modes: 130 vocal levels (all measured singing), plus 15 sing-seq and 5 sing topics, 6 lessons, and 19 game steps (repertoire, licks, transcribe).
- The voice course is the most "performed" of the three. Its problem is **placement**.

### 3.2 APP-WRONG first

**V-W1. Vocal levels are rated by their index in the family, not by their content.**
- `path.ts:551` sets `difficulty: diff(i + VOICE_LATER[f])`, which is `700 + 70×(index + offset)`. The items' own ratings are ignored.
- On average the items are 186 points harder than their path slot. The bigger problem is the relative misorder:
  - **`v-agility` 1 "A bebop line" sits at 910 (items 1475), and `v-agility` 2 "Bebop at 160" at 980 (items 1575).** A beginner meets bebop lines in unit 3–4.
  - `v-ear` 2 (sung leaps) sits at 840 with items at 1250. `v-ear` 3 (1125) comes after it.
  - `v-time` 2–4 (rests, anticipations, swing 8ths; items 1200–1350) sit at 840–980.
  - `v-sight` 5 sits at 1120 with items at 1500.
  - `v-standards` 1 sits at 980 with items at 1300.
  - `v-scale` 9 "Arpeggios" (items 1230) sits at **1400**, after `v-scale` 6 (altered, whole-tone, diminished; items 1425) at 1190. RSL puts major/minor arpeggios at G1.
  - `v-barry` 8–10 (items 1350–1440) sit at 1610–1750, after `v-barry` 7 (1525).
- Content jumps inside families, as the path orders them:
  - `v-scale` 7→8 is +217, then 8→9 is −370
  - `v-ear` 4→5 +225, `v-pitch` 5→6 +208
  - `v-sight` 7→8 −175, then 8→9 +158
  - `v-inflect` 2→3 +154, `v-barry` 1→2 +152
- **Fix:** place each vocal level at its items' mean difficulty minus a constant, or by a `VOICE_LEVEL_DIFF` table as the piano does with `KEYS_LEVEL_DIFF`. Then re-sort `v-scale` (arpeggios after `v-scale` 2) and `v-agility` (after `v-time` 4 swing).

**V-W2. Sight-singing is 15 fixed melodies** (Audit 5 W3, `vocal.ts:1104-1110`). It is still open.

### 3.3 Band tables

**Beginner, 700–1000** (RSL Debut–G3, ABRSM Singing G1–3, Trinity Initial–G3, vocal-jazz first steps)

| Outside item | Status | Evidence / note |
|---|---|---|
| Posture, breath, sustained tone | EXISTS-DEEP | `v-first` 1–3 (560–700, drone, straw/lip trill, glide), `v-breath` 1–6 |
| Pieces with a backing track | EXISTS-DEEP | `v-songs` 1–5: echo, one phrase with the band, two phrases graded in time, a whole song, verse and chorus |
| Unaccompanied traditional song (ABRSM, every grade) | EXISTS | `v-songs` 6 "Unaccompanied, from memory" (path 1050), `v-pitch` 5 "eight bars unaccompanied" (980) |
| Major scale; natural minor (RSL G1/G3) | EXISTS-DEEP | `v-scale` 1–2 (840/910): major, aeolian, major pentatonic |
| **Major and minor arpeggios (RSL G1–3)** | **APP-WRONG (level)** | `v-scale` 9 at 1400 (V-W1). `sing-intervals` 5 "arpeggio of a named chord" is at 1400 too. `lesson:chord-tones` 1103 is the earliest. |
| Sing intervals M2/M3, then P4/P5 (RSL G1/G3) | EXISTS | `v-ear` 3 "intervals from a note" (910), `sing-intervals` 1 (1000, 3rd/5th/8ve) |
| Sing back a 2-bar rhythm on "da" over drums (RSL ear 2) | SHALLOW | `v-time` 1 "On the click" (770) times sung notes. No hear-then-sing-back rhythm echo. |
| Melodic recall (RSL G3: 2 bars, first five notes) | EXISTS-DEEP | `v-ear` 1 "Sing it back" (770), `v-songs` 1 (1309 echo of 4 songs) |
| Sight-read 4 bars in C (RSL G1) | EXISTS (V-W2) | `v-sight` 1 (840) |
| **Improvise over a 4-bar chord sequence in C, or G/Em (RSL G1–3 option; Trinity "Improvising")** | **MISSING** for non-jazz | The first improvising is `v-scat` 1 (1050, jazz call & response). Nothing is pop or diatonic, and nothing is in the beginner band. |
| Voice knowledge: diaphragm, larynx, head/chest, warm-up (RSL GMQ) | SHALLOW | Lesson text only (`lesson:basics-voice` 760, `content/mini/voiceCourse.ts`) |
| Range and registers | EXISTS | `v-range` 1–3 (770–910) |
| A true beginner's way in | EXISTS-DEEP, but see V-W1 | The "Sing it back" taste, `v-first` before everything (`VOICE_LATER` −2), and the voice level test (`voiceLevelTest.ts`). The beginner band still contains bebop (`v-agility` 1–2) and swing (`v-time` 4). |

**Intermediate, 1000–1400** (RSL G4–5, ABRSM G4–5)

| Outside item | Status | Evidence / note |
|---|---|---|
| Major and minor pentatonic; Dorian / Mixolydian | EXISTS-DEEP | `v-scale` 2–3 |
| M6/M7 then m6/m7 intervals sung | EXISTS | `v-ear` 7 "sevenths and the octave" (1190), `sing-intervals` 2–4 |
| **Harmony vocal: M3 above a root line over I–IV, then a 3rd or 4th above over I–IV–V–vi (RSL G4–5)** | EXISTS-DEEP | `v-harmony` 1–6: held intervals, a line in 3rds, then a 6th below, then backing vocals (1701) |
| Backing vocals | EXISTS | `v-harmony` 6 (1260) |
| Sight-singing grows to an accompanied melody (ABRSM G4–6) | EXISTS (V-W2) | `v-sight` 3–8, and 8 "reading with the band" |
| Dynamics, phrasing, ornaments | EXISTS-DEEP | `v-dyn` 1–5, `v-inflect` 1–6, `v-vib` 1–8 |
| Swing phrasing, laid back, scat syllables, blues head | EXISTS-DEEP | `v-time` 4–7, `v-standards` 1–5, `v-scat` 1–4 |
| Sing the roots of a progression, then the guide tones | EXISTS | `sing-intervals` 6 (1500), `rep:voice:guide-tones` (992), `v-harmony` 7 |
| Pop / R&B runs and riffs | SHALLOW | `lesson:runs` (998, sing-run) only. `v-agility` is bebop-only (2 levels). |
| Melodic recall starting on the 3rd or 5th (RSL G8 wording, from G5 upward) | SHALLOW | `v-ear` 5 "the bar not played" (1050). No recall that starts off the root. |

**Advanced, 1400–1900** (RSL G6–8, ABRSM G6–8, vocal jazz)

| Outside item | Status | Evidence / note |
|---|---|---|
| Blues scale, harmonic minor, chromatic scale (RSL G6–8) | EXISTS | `v-scale` 4–6, 8 (modes up to altered and diminished) |
| **Diminished, augmented and dim7 arpeggios (RSL G6–8)** | **MISSING** | `ARPEGGIO_LEVELS` holds only maj/min triads, 7ths and maj9 (`voiceFamilies.ts:319-329`) |
| **Quick Study Piece: sing 4 written bars, vary bars 5–8, improvise bars 9–12 (RSL G6–8)** | **MISSING** | The pieces exist separately (`v-sight`, `v-scat`) but are never chained into one item. |
| Harmony over any diatonic chord; close-harmony middle part | EXISTS | `v-harmony` 7–8 (1330/1400) |
| Sing one part from the score while the other plays (ABRSM G7–8) | MISSING | Audit 5 S6 |
| Stylistic study: Pop/MT, Soul/R&B, Rock (RSL G6) | MISSING (non-jazz) | `v-standards` covers jazz and bossa only. Belt and mix are deliberately unscored (`content/mini/voiceCourse.ts:102`); fair, but nothing replaces them. |
| Vocal jazz advanced: tensions in lines, trading 4s, AABA chorus, colla voce | EXISTS-DEEP | `v-scat` 6–10, `v-standards` 6–10, `v-barry` 1–10 |
| Sight-singing that modulates | EXISTS | `sight-modulate` 1–5 (1450–1860) |
| **Does it go far enough?** | **No** | No vocal item is rated above 1700. Only 3 path steps sit at 1700 or above. Ten of the 17 families end by path 1400: breath, pitch, range, dynamics, ear, inflect, harmony, vib, scale and sight. |

### 3.4 Jumps and holes (Voice)
- **Path:** smooth by construction (70-point steps). The one gap of 100 or more is `sight-modulate` 4→5 (1760→1860).
- **Content:** the jumps are hidden by the index placement (V-W1). The worst are `v-agility` (+565 / +595 against its slot) and `v-scale` 8→9 (−370).
- **Hole:** 1700–1900 holds 3 steps and no vocal level. Most families stop at 1120–1400.

### 3.5 Voice build list (prioritised)

| Prio | Build | Ratings |
|---|---|---|
| 1 | **Fix V-W1**: rate vocal levels by their items (a `VOICE_LEVEL_DIFF` table), and move arpeggios to 950/1050 and `v-agility` after swing (1350/1450) | — |
| 2 | **Fix V-W2** (seeded sight-singing, Audit 5 #5) | 840–1600 |
| 3 | **Diatonic improvisation for every singer**: improvise over 4 bars of I–IV–V (C, then G, then E minor), graded on time and chord-tone landings, before scat | 900 · 1000 · 1100 · 1250 with a given rhythm cell |
| 4 | **Quick Study chain**: read 4 bars, vary them, then free | 1500 · 1650 · 1800 |
| 5 | **Upper ladder for the core families**: range edge with dynamics (1500), a 30 s breath phrase at pp (1550), arpeggios dim/aug/dim7 (1450/1550/1650), intervals to the 10th from any degree (1600), recall starting on the 3rd or 5th (1500), harmony against a moving line with crossings (1650), sight-singing in compound meter and minor without the aug2 (1500–1700) | 1450–1850 |
| 6 | **Hear-then-sing rhythm echo** on "da" (RSL ear 2) | 750 · 850 · 1000 |
| 7 | **Pop/R&B run ladder** beyond the single `runs` lesson: 3-note turn, pentatonic run, descending melisma, a run at tempo | 1100 · 1250 · 1400 · 1550 |
| 8 | **Score-based part singing** (Audit 5 #12) | 1350–1800 |

### 3.6 Voice game ideas
- **Harmony Ghost**: the band plays and a ghost sings the melody. Lock a 3rd above it, and the ghost glows while you hold. Moving lines unlock the advanced levels.
- **Quick Study Relay**: read 4 bars, then improvise the next 4 on the same rhythm, then hand back to the band. The score is shown per leg.
- **Arpeggio Ladder**: climb rungs by singing chord tones in order. Diminished and augmented rungs are the "broken" ones you have to land precisely.
- **Run Racer**: R&B runs at rising tempo, scored on clean pitch, with a speed bonus.

---

## 4. Summary of APP-WRONG items

| # | Course | What | Where |
|---|---|---|---|
| X1 | Ear | 19 game-only jazz topics are Ear path steps in the app (not in tests); the path depends on import order | `topicsAdvGames.ts:1-4`, `path.ts:257-262`, `App.tsx:138` |
| X3 / E-W | Ear → Jazz | Expression (ABRSM features) sits in Jazz; Ear lacks it | `rating.ts:35`, `courses.ts:73-86` |
| E-W2 | Ear | Descending intervals first at 1450 (RCM L1) | `topicsSkills.ts:98-106` |
| E-W3 | Ear → Jazz | Triad member R/3/5 (RCM L3) is jazz-pack only | `path.ts:244`, `topicsReharmColor.ts:81` |
| J-W1 | Jazz | "Straight or swing?" rated 1400. It is the beginner taste and rung 1 of the ladder | `topicsEar.ts:466`, `courseStart.ts:298,463-465` |
| J-W2 | Jazz | The beginner band (650–1000) holds no jazz: mood, dynamics, articulation | dump; `courses.ts:74` |
| J-W3 | Jazz | Rootless / upper-structure / jazz-grid ear items are in Ear, not Jazz | `path.ts:229-250` |
| J-W4 | Jazz | `comping` 1 (2 choices, 1300) is rated above `comp-rhythm-ear` 1 (3 choices, 1000) | `topicsJazz.ts:268` |
| V-W1 | Voice | Vocal levels are placed by index, not content (bebop at 910/980, arpeggios at 1400, `v-barry` 8–10 late) | `path.ts:551`, `path.ts:487-491` |
| V-W2 | Voice | Sight-singing is 15 fixed melodies (Audit 5 W3, still open) | `vocal.ts:1104-1110` |

## Sources
- ABRSM aural tests from 2024 (Bowed Strings syllabus, pp. 46–53): caswells-strings.co.uk/wp-content/uploads/2025/07/ABRSM-cello-syllabus-from-2024.pdf
- RCM Musicianship Addendum 2024: teacherportal.rcmusic.com (rcm-musicianship-addendum-2024.pdf); RCM Piano Syllabus 2022
- RSL Vocals Syllabus Specification: newschool.ie/wp-content/uploads/2020/11/RSL_Vocals_Syllabus_Guide_05May2020.pdf; RSL Vocals Grade 5 (2021): rslawards.com
- Trinity Rock & Pop Vocals: trinityrock.trinitycollege.com/instruments/vocals; Trinity jazz overview: blog.trinitycollege.co.uk
- ABRSM Jazz Piano G1–5 (chimesmusic.com) and Jazz Performance Grades 6–8 (pianodao.com, 2026-01-30)
- Berklee ET-111: college.berklee.edu/node/2270561; Berklee Online Ear Training 1
- Aebersold Vol. 1 TOC; Siskind *Jazz Piano Fundamentals* Book 1 (partial TOC, grothmusic.com)
- [PK] Open Studio beginner path; ABRSM jazz aural details; scat pedagogy (Stoloff *Scat!*, Weir *Vocal Improvisation*)

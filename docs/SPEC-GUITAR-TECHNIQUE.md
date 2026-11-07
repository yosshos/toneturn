# Technique at the guitar (and bass): drills and playing skills (spec addendum AI-G, draft for review)

This extends `docs/SPEC-TECHNIQUE.md` (piano, spec AI) to guitar and bass. Same principles, same engine, same
tempo ladder, same Technique map. The owner's answers in AI §13 apply here too, unless this spec says otherwise.
Research base: `docs/research/GUITAR_TECHNIQUE_RESEARCH.md` (39 curricula compared, 59 sources). Code:
`src/engine/drills/guitar.ts` (catalogue + generator), `src/engine/drills/guitarAnalyze.ts` (analysis).
Everything marked ⚙ is a starting number to calibrate with real takes.

Guiding rules from the owner: **tempo rises, difficulty rises, the drill moves through keys and positions.**
Every take also feeds the path (✓ evidence, steps in units), the skill map (rated events), XP and leagues, the
level test (a technique staircase), the daily workout and stats / badges.

---

## 1. Principles

1. **Measured, not judged.** Each drill has one explicit goal: a tempo, evenness, bends in tune, a number of clean
   changes a minute. Feedback comes right after the take.
2. **Microphone first, and honest.** Guitar is graded from audio only. Pitch, onset timing, evenness, bends,
   vibrato, slides and harmonics are **graded**. Legato volume, palm mute and change gaps are **heard** (they can
   lower a verdict, with a confidence note). Pick direction, fingering, string choice, muting and rest/free stroke
   **cannot be heard**, so they are **self-check boxes** and never graded (research §4).
3. **Daily small steps.** Same ladder as piano: **3 clean takes → +1 step (≈ 4 %)**, **2 failed sets → −10 %**, a
   continuous mode, short daily blocks.
4. **Your weak spots.** Every item (drill × key/position × option) keeps its own numbers. The app knows that box 4
   of B♭ minor pentatonic is your slowest and serves it.
5. **Healthy practice.** Fretting-hand stretches, barre chords and bends tire the hand. Stretch drills start high on
   the neck. A tension and pain reminder appears on barre, stretch and bend items. Speed bursts are capped.

---

## 2. Where it lives

Same as AI §2. The Technique map has an **instrument switch** (piano · guitar · bass). The settings come from the
Drills settings screen (§13).

| Place | Guitar specifics |
|---|---|
| Technique map | Families as tiles. The heat map's rows are **keys**; for position drills the "key" is the note under the index finger on the low string (A = fret 5, G = 3, F = 1), so the heat map reads as positions. |
| Skill Map | Area *Instrument & sound*, sub-skill **instrument / guitar-tech** (bass uses the same sub-skill). |
| Today's workout | The Technique block serves guitar items when the instrument is guitar (§9). |
| Path | One technique step per unit when the pack / goal is on (§11). |
| Practice tools | *Technique* entry → instrument → family / level / key. |

First-time setup for guitar: instrument (guitar / bass), **tuning** (standard, drop D, DADGAD, open G, half step
down; bass EADG), **handedness** (left-handed mirrors every neck and tab picture; notes do not change), guitar type
(electric / acoustic / classical, which sets the default style §5), **latency calibration** (play along with a
click, median offset) and a **noise check** (5 s of silence → the RMS floor for onset detection). Headphones are
recommended for the click so the mic does not hear it.

---

## 3. The drill screen (guitar)

- **What to play:** **tab** (6 or 4 lines, frets, technique marks: h, p, /, \, b½ b1 b1½, r, pb, ~, PM, X, harm.,
  T) over **standard notation** (treble 8vb: pitches are sounding pitches, written an octave up), with an option to
  show tab only. The fretting finger (1–4) shows as a small number when "show fingering" is on; picking strokes
  (⊓ ∨ or p i m a) when "show picking" is on. A **neck strip** shows the current position (index-finger fret).
- **Goal line**: "♩ = 72 · 8ths · even · box 2" or "A ↔ D · 30 changes / min".
- **Metronome** with a one-bar count-in. For rhythm drills, a backing (drums) option.
- **Right after the take:** the verdict and ladder as for piano; the evenness strip; the **bend meter** (target
  line, your curve, cents off); the **vibrato meter** (Hz, width); the **strum strip** (each strum on the grid,
  its spread); changes per minute; the self-check boxes (§6.3).
- Buttons: Again · Slower −10 % · Loop the spot · Next.

---

## 4. Guitar drill catalogue

14 families, **85 levels**, about **1,990 items** (item = level spec × key/position; 1,540 before the coverage audit of
2026-11-07, `docs/research/DRILLS_COVERAGE_AUDIT.md`, which added variants inside existing levels — a level count
change would need new badges). Each level lists its items;
the key list follows the player's key order unless a fixed list is given. Tempo bands are the piano's T1–T7
(notes per second). Start tempos are T1 (about 2 nps); 3-notes-per-string and legato start at 2.5–3 nps.

### 4.1 Fretting hand (`g-fretting`, all styles)

| Lv | Items | Positions |
|---|---|---|
| 1 | chromatic 1-2-3-4 up all strings and back, 8ths | fret 5 → 3 → 1 |
| 2 | permutations 1243, 1324, 1342, 1423, 1432 | fret 5 |
| 3 | "spider": fingers 1 & 3 on one string, 2 & 4 on the next | fret 5 → 3 → 1 |
| 4 | chromatic walk diagonally up the neck (one fret higher per string) | from fret 1, 5 |
| 5 | all 24 permutations in 16ths | fret 5 |
| 6 | stretch 1-3-5-6 (frets p, p+2, p+4, p+5), high on the neck first | fret 8 → 5 → 1 |

Metrics: accuracy, IOI CV, timing SD, hesitations at string changes (glitch = IOI > 1.15 × median).

### 4.2 Picking (`g-picking`)

| Lv | Items | Keys |
|---|---|---|
| 1 | alternate picking on one string (each fret ×2), strings 1 and 2 | positions |
| 2 | two-string crossing: outside and inside picking | positions |
| 3 | 3 notes per string major scale: alternate and economy (patterns 1, 2, 5), triplets | all keys |
| 4 | string skipping through pentatonic box 1 (6&4, 5&3, 4&2, 3&1); octaves on skipped strings (6&4, 5&3) | all minor keys |
| 5 | tremolo picking, each note ×4 in 16ths; across strings 3-2-1; triplets on phrygian dominant (rock / metal) | all keys |
| 6 | sweep: 3-string triads I–IV–V and i–iv–V; 5-string A-shape major / minor (rock / metal) | all keys |
| 7 | hybrid picking roll (pick + m + a); chicken picking; banjo forward roll (country) | G A E D C |

Pick direction is written but never graded (Troy Grady's escape-motion choices are shown as notes, not checked).

### 4.3 Legato (`g-legato`)

| Lv | Items |
|---|---|
| 1 | hammer-ons, each finger pair (1-2, 1-3, 1-4, 2-3, 2-4, 3-4) up and down the strings |
| 2 | pull-offs, each pair |
| 3 | trills (16 notes, hammer / pull), each pair |
| 4 | pentatonic box 1, pick once per string |
| 5 | 3NPS legato (patterns 1, 2, 5), triplets |
| 6 | two-hand tapping triplets (tap 5th, pull to root, hammer 3rd), minor and major; tapped arpeggios I–vi–IV–V |

Extra metric: **legato volume ratio** = median RMS of hammered / pulled notes ÷ picked notes (⚙ ≥ 0.5 ≈ −6 dB;
< 0.3 = not).

### 4.4 Scales (`g-scales`)

| Lv | Items | Keys |
|---|---|---|
| 1 | minor pentatonic box 1 | all minor keys |
| 2 | boxes 2, 3, 4, 5 | all minor keys |
| 3 | blues scale box 1; major pentatonic box 1 | all keys |
| 4 | major scale, E-shape and A-shape positions (CAGED) | all keys |
| 5 | major scale, D-, C-, G-shape positions | all keys |
| 6 | 3 notes per string, patterns 1–7; one-string scales (strings 3 and 5, Goodrick) | all keys |
| 7 | modes in position (Dorian, Mixolydian, Lydian, Phrygian, Locrian), harmonic and melodic minor; sequences in 3rds and groups of 4 | all keys |

Positions are windows of 5 frets around the CAGED shape (E −1, D +1, C +4, A +6, G +9 frets from the tonic on
string 6). Each runs low → high → low.

### 4.5 Arpeggios (`g-arps`)

| Lv | Items |
|---|---|
| 1 | major and minor triads, root on string 6 and on string 5 (2 octaves where they fit) |
| 2 | triad arpeggios in the 5 CAGED shapes |
| 3 | triad inversions climbing on string sets 3-2-1, 4-3-2, 5-4-3, 6-5-4 (triplets) |
| 4 | maj7, 7, m7, m7♭5, root on 6 and 5 (cycle of 4ths) |
| 5 | diminished 7th; ii–V–I arpeggios in one position (jazz) |

### 4.6 Chords and changes (`g-chords`)

| Lv | Items | Graded by |
|---|---|---|
| 1 | open E A D Em Am Dm C G: strum, then **pick every string** | each string's pitch (monophonic, fully measurable): a dead or buzzing string is a missing note |
| 2 | one-minute changes, 1 strum per bar: A–D, D–E, A–E, Am–Em, C–G, G–D, C–Am, Am–Dm, E–Am, G–Em | strum onsets on time, chord match, **changes per minute**, gap at the change |
| 3 | changes at 2 strums per bar; open 7th chords (E7 A7 D7 G7 C7 B7 Am7 Em7 Dm7 Cmaj7 Fmaj7) string check | as above |
| 4 | power chords, palm-muted 8ths, I–♭VII–IV (rock) | timing, **palm-mute share** |
| 5 | barre chords E-shape and A-shape, major, minor, 7, m7, maj7: string check | each string |
| 6 | barre changes I–IV–V–I (E / A shapes); triad inversions on the top 3 strings (RSL G5) | timing, chord match |
| 7 | CAGED: one chord in 5 shapes up the neck | chord match |

Changes per minute targets (JustinGuitar): **30 / min before moving on, 60 / min long term**. The ladder raises
the click; changes / min = strums that changed chord cleanly ÷ minutes.

### 4.7 Rhythm guitar by genre (`g-rhythm`)

| Lv | Items | Genres |
|---|---|---|
| 1 | quarter-note downstrokes; down-up 8ths; 3/4 waltz strum (D, DU, DU) | pop, rock, country |
| 2 | Old Faithful (D, DU, UDU); palm-muted downstroke 8ths with power chords | pop, rock |
| 3 | blues shuffle 5–6 (12 bars, swung); country boom-chick (bass, strum, alternate bass, strum) | blues, country, rock |
| 4 | reggae skank on 2 and 4; ska upstrokes on the off-beats | reggae, pop |
| 5 | 16th funk strum with muted ghost strums, 9th chords (Nile Rodgers style) | funk |
| 6 | bossa nova (thumb bass + chord plucks, ii–V–I); Freddie Green four to the bar; son clave 3-2 | latin, jazz |
| 7 | metal gallop (8th + two 16ths), palm-muted; 16th chugs with accented chords; **drop D** | metal |

Muted strums ("chucks", technique `dead`) are onsets without pitch: they are graded for timing only.

### 4.8 Lead techniques (`g-lead`)

| Lv | Items | Graded by |
|---|---|---|
| 1 | slides along string 3 / string 2 (pentatonic), slide-in from a fret below; natural harmonics at frets 12, 7, 5 and 4, 9; harmonic chords | pitch + timing; slide glide ignored |
| 2 | half-step bends to pitch (fret the target first, then bend to it) | **bend error in cents** |
| 3 | whole-step bends | bend error |
| 4 | bend and release; pre-bend and release | bend error, release back within 25 cents |
| 5 | vibrato: narrow (finger) and wide (rock) on sustained notes | **rate (Hz), width (cents), regularity** |
| 6 | double stops in 3rds (strings 3-2) and 6ths (strings 3-1), up an octave and back | timing; pitch where heard |
| 7 | B.B. King box lick (bends + vibrato); 1½-step bends | all of the above |

Bend thresholds ⚙: |error| ≤ 15 cents clean, ≤ 30 almost (±10 cents is "practically in tune"). Vibrato ⚙:
rate 4–8 Hz (string players typically 5–7 Hz), width 20–80 cents for finger vibrato, ≥ 60 cents for wide rock
vibrato, irregularity (CV of cycle length) ≤ 0.25.

### 4.9 Fingerstyle (`g-fingerstyle`)

| Lv | Items | Keys (open-chord progressions) |
|---|---|---|
| 1 | alternating thumb bass; p-i-m-a | C (C Am Dm G7), G, Am |
| 2 | p-a-m-i, p-i-m-i, p-i-m-a-m-i (triplets) | C G Am Em D |
| 3 | Giuliani-style patterns: (p+a)-i-m-i, p-i-m-i-a-i-m-i, p-(i+m)-a-(i+m), p-(i+m+a), p-a-i-m-i-a, p-i-p-m | C Am Em |
| 4 | Travis picking (pinch on 1, alternating thumb); p-i-p-m | C G D Am Em |
| 5 | scales with i-m rest stroke, i-m free stroke, m-a, thumb only (A-shape position, 2 octaves); slurs (ligados) ascending / descending in first position | all keys |
| 6 | tremolo p-a-m-i | Am Em C |

### 4.10 Flamenco (`g-flamenco`, shown only for the flamenco style)

Lv 1 four-stroke rasgueado c-a-m-i and a-m-i-i(up) over the Andalusian cadence · Lv 2 continuous triplet
rasgueado (p-a-i) · Lv 3 picado (i-m rest stroke, Phrygian, 16ths; a-m-i in triplets) · Lv 4 alzapúa (thumb bass, down,
up) · Lv 5 compás: soleá (12 beats, accents on 3 6 8 10 12), bulería (counted from 12: 12 3 6 8 10), seguiriya
(2+2+3+3+2). Keys: E and A Phrygian (picado also B).

### 4.11 Jazz guitar (`g-jazz`)

| Lv | Items |
|---|---|
| 1 | shell voicings ii–V–I (6-4-3 / 5-4-3), four to the bar, starting root 6 or root 5; comping rhythms (Charleston, anticipations) |
| 2 | drop-2 maj7 / 7 / m7 / m7♭5 through 4 inversions on strings 4-3-2-1, 5-4-3-2 and 6-5-4-3 |
| 3 | drop-3 ii–V–I (root on 6 and 5) |
| 4 | drop-2 ii–V–I with the smoothest voice leading |
| 5 | guide-tone lines (3rd first, 7th first), half notes |
| 6 | walking bass on guitar (low strings), ii–V–I with chromatic approaches |
| 7 | harmonised major scale in drop-2 with the scale on top (chord-melody preparation); octaves (Wes Montgomery) |

All 12 keys up the cycle of 4ths.

### 4.12 Reading by position (`g-reading`)

Lv 1 position I, strings 1–3 · Lv 2 position I, all strings (C, G, F) · Lv 3 positions II and V · Lv 4 position
VII; mixed rhythms in V · Lv 5 positions IX and XII (mixed rhythms). The melody is a seeded random walk on the
scale notes inside the position (stable per item, new per key), so it cannot be memorised. Notation only by
default (tab hidden) — the point is reading.

### 4.13 Improvising: target notes (`g-impro`)

Forms (keys A E G D C F B♭): 12-bar blues, minor blues, ii–V–I ×3, and a standard's ii–V–I cycle (Autumn Leaves type).
Lv 1 roots on beat 1 · Lv 2 the 3rd of each chord on beat 1 · Lv 3 chord-tone arpeggio every bar · Lv 4 guide tones
(3rd → 7th), half notes — each level over all four forms. All in the E-shape position. Free improvising over
the form (descriptive feedback, AI §5.4) comes later.

### 4.14 Bass guitar (`g-bass`, instrument = bass, tuning EADG)

Lv 1 chromatic 1-2-3-4 · Lv 2 major scale, one finger per fret; minor pentatonic and blues scale · Lv 3 root–5th–octave
groove I–IV–V–I; 16th groove with ghost notes · Lv 4 arpeggios (triad, maj7, 7, m7) · Lv 5 disco / funk octaves
(thumb–pop); slap groove (thumb, pop, ghost) · Lv 6 walking bass ii–V–I and 12-bar blues. Bass players
also see the reading and improvising families in a later version (with bass tuning).

---

## 5. Genres as filters (like the piano emphasis)

Setting **guitar style**: all · rock · blues · metal · pop · funk · country · jazz · classical · fingerstyle ·
flamenco · reggae · latin. A family is shown when its genres include the style (or "all"); inside a shown family
only the levels of that style are shown (e.g. metal → rhythm level 7 only). Fretting, picking, legato, scales,
arpeggios, chords and reading are for every style. Default style by guitar type: electric → all, acoustic → pop,
classical → classical. Electric vs acoustic vs classical only changes the default style and the tension reminders
(classical: no picking family, rest/free-stroke scales instead).

---

## 6. Metrics (audio)

### 6.1 Shared with piano (AI §6)

Accuracy, timing mean / SD, **IOI CV** (evenness), hesitations, clean tempo, chord spread, chord tones on beats.
Thresholds per tempo band are the piano's (CV < 5 / 4 / 3 %, SD < 30 / 25 / 20 ms). Hands-together and velocity
metrics do not apply.

### 6.2 Guitar measures

| Measure | Definition | Threshold ⚙ | Confidence |
|---|---|---|---|
| Bend error | median cents of the held part − target | ≤ 15 clean · ≤ 30 almost | graded |
| Bend rise | ms from pick to 90 % of the target | shown | graded (info) |
| Release | back within 25 cents of the fret | required on release items | graded |
| Vibrato | rate (Hz), width (cents, peak to trough), irregularity | 4–8 Hz; 20–80 (narrow) / ≥ 60 (wide); CV ≤ 0.25 | graded |
| Strum spread | first → last string onset in a strum | shown (a slow strum drags) | heard |
| Changes / min | clean chord changes ÷ minutes | 30 → 60 | graded |
| Change gap | silence (RMS < 10 % of the strum peak) before a new chord | ≤ max(80 ms, ¼ beat); > 2× = not | heard |
| Legato ratio | RMS of hammer / pull ÷ picked | ≥ 0.5; < 0.3 = not | heard |
| Palm-mute share | muted items that decay to −20 dB within 200 ms (and centroid < 1.5 kHz when known) | ≥ 75 %; < 50 % = not | heard |
| Octave folds / unpitched onsets | count | shown in the debug view | — |

A "heard" measure can lower the verdict (clean → almost / not) and becomes the "why" line; it never raises one.

### 6.3 Not measurable → self-check boxes

Pick direction · right-hand fingers (p i m a) · fretting fingers / fingertips behind the fret · muting of unused
strings / string noise · keeping the strumming hand moving · rest stroke landing · tapping with other strings
muted · relaxed hand, no pain. Ticks are stored with the take (for the coach view) but never change the score.

### 6.4 The guitar pre-pass (before the shared alignment)

1. **Octave folding**: a pitch 12 or 24 semitones off an expected note within ½ beat becomes that note (guitar
   fundamentals are weak; trackers jump an octave).
2. **Glides removed**: pitches passed through during a bend, pre-bend release, vibrato or slide are not new notes.
3. **Strums clustered**: a chord's onsets within 90 ms ⚙ (and inside its window) become one chord at the first
   onset when every heard pitch belongs to the chord; unpitched onsets count as the strum.
4. **Unpitched onsets** (muted strums, noisy attacks) snap to the nearest single note within ¼ beat for timing;
   others stay extra (wrong).
5. **Accents** are judged only when the take has loudness (velocities differ).

The mic pipeline must send **onset events** (`detectOnsets(frames)`: energy rises + pitch-change onsets for
legato), not only pitch changes, or repeated notes and repeated strums are lost.

---

## 7. Tempo ladder

Identical to AI §7 (3 clean → +1 step ≈ 4 %, 2 failed sets → −10 %, optional speed burst, continuous mode). For
chord changes the ladder raises the click while the strums per bar stay; level 3 doubles the strums. Start tempos:
8ths at ♩ = 60 (2 nps, T1) for most single-note items; 3NPS / legato 2.5–3 nps; chords ♩ = 60 one strum per bar;
rhythm patterns ♩ = 70 (funk 80, gallop 90, bossa / Freddie Green 100). Long targets: RSL G5 ♩ = 80 8ths (2.7 nps),
RGT G5 ≈ 3.9 nps, ABRSM G8 ≈ 4.8 nps, shred 16ths at ♩ = 160 (10.7 nps, T7).

---

## 8. Keys, positions, tunings, hands

- **Keys**: levels marked "all keys" run through the 12 keys in the player's key order (Drills settings). Fixed
  lists use a guitar-friendly order (G D A E C F B♭ E♭ B A♭ D♭ G♭; minor: A E D G B C F F♯ C♯ G♯ B♭ E♭). Open-chord
  and fingerstyle items use the keys their open chords exist in.
- **Positions**: position drills store the note under the index finger on the low string as the "key" (A = 5th
  fret). Order: fret 5 (comfortable) → 3 → 1 (widest), stretches from fret 8 down.
- **Notes**: each expected note has string, fret, `pos` (index-finger fret of the hand position), finger 1–4 and
  technique. Sounding pitch = open string + fret. A fretted note always lies within its position (−1 … +4 frets,
  stretch drills up to +6); chords span ≤ 4 frets.
- **Tunings**: standard by default; the metal gallop uses drop D (one-finger power chords). The generator works
  for any tuning in `fretboard.ts`; chord shapes assume standard tuning, so chord families stay standard.
- **7-string / extended range**: later — the generator takes the lowest string from the tuning, so a 7-string
  tuning (B1) adds a low string to position drills; chord families stay 6-string.
- **Left-handed**: a display setting (mirror neck, tab stays the same). Nothing in the notes changes.
- **Bass**: tuning EADG (4 strings), its own family (§4.14); same metrics. Five-string bass: later.

---

## 9. What to work on today (Technique block)

As AI §9 with the guitar catalogue: warm-up (fretting level 1 or a known scale) → 2–3 weakest items → 1
maintenance → 1 variant (another position / key). New guitar players start in **fretting, chords and scales**;
new bass players in the bass family. Families left out by the style are never served. A **Playing skill** block
alternates rhythm (by the style), fingerstyle, jazz comping and improvising.

---

## 10. Level test: Technique section for guitar

*Find my level → Technique* (skippable; also from the Technique map). One tempo staircase per probe; each clean
take raises the tempo 15–20 %; the last clean tempo seeds the family (scaled by key difficulty) and its starting
level:

| Probe | Family |
|---|---|
| chromatic 1-2-3-4 at fret 5 | fretting, picking, legato |
| A minor pentatonic box 1 | scales, arpeggios, impro |
| A ↔ D changes, 2 strums per bar | chords |
| down-up 8ths (G C D) | rhythm |
| trill 1-2 | legato |
| G major, one finger per fret (bass) | bass |

Families without a probe start at level 1 unless the player says "I can already play this" (skip a level after
one clean take at the level's start tempo). Probes are exported as `GUITAR_PROBES`.

---

## 11. Path steps and the workout block

- **Path**: with the Technique pack on, each unit gets one step: the next item in the current level of the family
  that matches the unit's theme (a rhythm unit → rhythm guitar; an intervals / scales unit → scales; a harmony
  unit → chords / jazz). ✓ evidence = one clean take at the goal tempo. Cautious ✓: a step is ticked only from a
  clean take, never from self-checks.
- **Workout**: the Technique block (§9), 10–20 min, sets of 30–90 s, keys interleaved.
- **Everything connects**: each take → one rated event `instrument / guitar-tech` (+ `timing / subdivide` for
  evenness drills), difficulty = tempo band; XP clean 4 / almost 2 / not yet 1; the ladder updates the item; the
  Technique map and stats pick it up.

---

## 12. Badges (per family)

| Badge | Rule |
|---|---|
| First clean (per family) | the first clean take in the family |
| All 12 keys | a level clean in all 12 keys |
| Five boxes | pentatonic boxes 1–5 clean in one key |
| CAGED | the 5 CAGED positions clean in one key |
| 30 / 60 changes | one-minute changes at 30 / 60 per minute |
| In tune | 10 bends in a row within 15 cents |
| Vibrato | 5 clean vibrato takes |
| Barre | every barre item clean in 6 keys |
| Groove (per genre) | every rhythm level of a genre clean |
| T4 / T7 | a single-note item clean at band T4 / T7 |
| Bassist | every bass level clean in one key |

---

## 13. Settings (Drills settings, guitar section)

instrument (piano / guitar / bass) · guitar style (§5) · tuning · left-handed · show tab / notation / both · show
fingering · show picking · key order (shared) · continuous mode (shared) · in path / in workout (shared). Types:
`DrillSettings.instrument`, `DrillSettings.guitarStyle`; tuning and handedness are UI settings (tuning is passed
in `DrillSpec.tuning` when not standard).

---

## 14. Data

Unchanged from AI §10: items are `ItemState` keyed by `itemId` (e.g. `g-scales:penta:9:R:m:ps2:inguitar`). Takes
keep the onset events and, for bend / vibrato items, a down-sampled f0 trace (10 ms) for the meters.

---

## 15. § Double-check: where each claim was cross-validated (≥ 2 sources)

| Claim | Sources |
|---|---|
| Pentatonic boxes 1–5 and CAGED positions are the core scale curriculum | RGT G1–4 lists; RSL scale groups; Berklee Online *Scales 101*; JustinGuitar; `fretboard.ts` box table (matches published boxes) |
| 3NPS patterns + alternate / economy picking as a speed family | Troy Grady; Petrucci *Rock Discipline*; MI Guitar Technique |
| One-minute changes, 30 → 60 per minute | JustinGuitar lesson page; JustinGuitar community / beginner course |
| Rest stroke (apoyando) and free stroke (tirando), i-m alternation | ABRSM 2019 syllabus; Segovia / Niedt; Pumping Nylon; LCM handbook |
| Giuliani-style PIMA permutations | Giuliani Op. 1 (thisisclassicalguitar); Pumping Nylon; LCM *pimamip* |
| Tremolo p-a-m-i | Pumping Nylon tremolo section; classical canon [M] — second source only [M] → marked ⚙ |
| Travis picking: alternating thumb 6/5 ↔ 4 + melody | Guitar World (Chet Atkins); Tommy Emmanuel guide |
| Freddie Green: 3-note shells on 6-4-3, quarter notes, short | freddiegreen.org (Galbraith); freddiegreen.org (Berens) |
| B.B. King box: root on string 2 under the index | Guitar World lesson; widely taught blues method [M] |
| Nile Rodgers 16th motor with muted strokes | Guitar World (Cory Wong); funk pedagogy [M] |
| Chicken picking = pick + snapped middle finger | Wikipedia (hybrid picking); Andy Wood country curriculum [M] |
| Flamenco rasgueado / picado / alzapúa definitions | guitarfromspain blog; flamenco method books [M] |
| Triad inversions on the top 3 strings as a grade requirement | RSL Grade 5 group C; Berklee / Leavitt triad studies |
| Tempo landmarks (RSL 70 → 80 → 100; ABRSM 48 → 144; LCM 80 → 108) | RSL G5 page + AMEB PDF + Rockschool tutor; ABRSM 2019 syllabus + derek-hasted table; LCM handbook |
| Onsets: picked notes reliable, pull-offs weakest | NIME 2012 (88 % pull-off recall); onset-tolerance paper (WASPAA 2019) |
| Vibrato 4–8 Hz (typ. 5–7), width 20–60 cents | MMM 2003; MCG 2023; BYU width study |
| Bend tolerance ±15 cents | arXiv 1105.4570 (±10 cents in tune); arXiv 0906.0127 (fretting errors 14–64 cents) |
| Polyphonic / string detection not reliable on electric | Basic Pitch paper (GuitarSet F 0.79); TabCNN on electric (F1 0.64, tab 0.45) |
| Strum direction not robust from a mic | ISMIR 2014 (spectral ordering); arXiv 2508.07973 (needs pickup audio); KIT (adds accelerometer) |
| Palm mute heard from the attack / decay | NIME 2012 (87.5–100 %); Guitar-TECHS dataset |
| Mastery = difficulty × accuracy, progressive speed | Rocksmith+ dev diary; Guitar Pro 8 docs; Yousician multiplier |

Not verified anywhere (kept as ⚙ / [?]): RGT electric bpm tables, Trinity classical tempos, ABRSM note values per
grade, Yousician timing windows, Petrucci's exact metronome steps, the precise Old Faithful notation, the exact
bossa comping rhythm (one common version is used).

---

## 16. Open questions for the owner

1. **Style default**: show every family to every guitarist (style = all), or ask for a style on first use?
2. **Tab vs notation**: tab by default (most guitarists) with notation optional — except the reading family?
3. **Classical guitarists**: hide the picking family (no pick) and the lead family by default?
4. **Bass**: enough as one family for now, or a full bass catalogue (slap, fingerstyle, reading) soon?
5. **Thresholds**: may I calibrate bends / vibrato / mute from a few of your own takes (or a guitarist friend's)?
6. **Drill creator on guitar**: allow custom patterns as tab (string / fret per note) in a later version?

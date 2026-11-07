# Technique at the instrument — drills and playing skills (spec addendum AI, draft for review)

Product owner, 2026-11-07: *"So far we have theory, understanding, hearing and reading — but nothing that improves
technique on the player's instrument. Drills, on the map (or a separate map for instrument progress), with
sub-categories per instrument. Piano and guitar first. Scales in all 12 keys, parallel and contrary motion, tempo
rising a little every day, evenness between the hands, control, staccato and legato, very soft and very loud,
Hanon in rising difficulty, Barry Harris major-scale control (linear scale, triad arpeggios, 4-note chords,
pivots, a half step below before each note…). Not only drills — real skills: left-hand voicings, changes between
chords, stride, walking bass, improvising over a form. Piano over MIDI (audio optional); guitar over audio.
Players should see metrics: speed with the metronome, control in each scale, which keys are hard, what to work
on."*

Research base: `docs/research/TECHNIQUE_DRILLS_RESEARCH.md` (sources, thresholds, exam tempos). This spec turns it
into the app. **Piano is specified in full; guitar is outlined (§11).** Everything marked ⚙ is a starting number
to calibrate with the owner's own playing (§12).

---

## 1. Principles

1. **Measured, not judged.** Every drill has one explicit goal (a tempo, an evenness, a velocity band, a number of
   clean changes) and objective feedback right after the take. Musical skills (improvising) get *descriptive*
   feedback, never a "grade of your music".
2. **MIDI first for piano.** Timing to the millisecond, velocity, both hands, duration (legato / staccato) and the
   sustain pedal. Microphone piano is allowed with fewer metrics (pitch + timing only; no hands, no velocity,
   no articulation) and says so.
3. **Daily small steps.** A tempo ladder per item: raise only after **3 clean takes in a row**, small steps
   (+3–5 %), step back after 2 failed sets. Short daily blocks (10–20 min), interleaved keys, spaced review.
4. **Your weak spots, not a fixed book.** Every item (drill × key × hand × motion × variant) keeps its own numbers;
   the app knows that E♭ minor LH contrary motion is your weakest, and serves it.
5. **Healthy practice.** Speed bursts are capped; a reminder about tension and pain; no endless repetition at the
   edge of speed.

---

## 2. Where it lives

| Place | What | Why |
|---|---|---|
| **A Technique map per instrument** (Progress tab → *Map · **Technique** · Stats …*) | its own map: families as tiles with a level, a **12-key heat map** per family (tempo and evenness), hand comparison, trends | technique is measured in tempo / evenness / control — not the 600–1600 rating of the ear skills — so it gets its own picture |
| The main Skill Map, area **Instrument & sound** | one summary value: the technique level (average family level), linking to the Technique map | keeps one overview |
| **Today's workout** | a **Technique** block (and a **Playing skill** block) — "what to work on today" picks the items (§9) | the daily habit |
| **The path** (optional) | goal *"Play better at my instrument"* or the pack **Technique** on: one technique step per unit (the next item in the family order of §4) | the owner's request: "if it's part of the player's own path" |
| Practice tools | *Technique* entry: pick any family / key / item freely | free practice |

Setup once (first time): instrument (piano / guitar), MIDI on / off, **latency calibration** (play along with a
click, median offset), **velocity calibration** (play ppp, mf, fff), keyboard size (61 / 76 / 88 → range limits),
sustain pedal present?

---

## 3. The drill screen (piano)

- **What to play:** notation (staff, both hands when HT), fingering numbers (help only — not measurable ⚙), a
  keyboard strip showing the next notes, the item's **goal** ("♩ = 96, even, legato, mf").
- **Metronome** with count-in (1 bar), accent on 1, subdivision clicks optional; tempo shown as ♩ and notes/s.
- **Play** — no stopping; the take ends after the last note (+1 beat).
- **Right after the take (≤ 1 s):**
  - verdict: **Clean** (✓) / **Almost** / **Not yet**, and the ladder: *"3 clean at 96 → tomorrow 100"*;
  - **evenness strip**: one bar per note showing early / late vs the click (ms), thumb crossings marked;
  - **velocity curve** (one dot per note, the target band shaded);
  - **hands**: LH vs RH asynchrony per beat (when HT);
  - wrong / missing notes on the staff; the worst spot → *"Loop this spot at −15 %"*.
- Buttons: **Again**, **Slower −10 %**, **Loop the spot**, **Next item**. Every take is kept (local) for the
  trends; the last 3 takes per item are compared.

---

## 4. Piano drill catalogue

Every family below lists **items** (what varies), **levels** (the order of difficulty), **variants** and the
**metrics** that judge it. Tempo bands (from RCM / ABRSM tempos): **T1** 2.0–2.7 notes/s · **T2** 2.7–3.5 ·
**T3** 3.5–4.5 · **T4** 4.5–5.5 · **T5** 5.5–6.5 · **T6** 6.5–8 · **T7** > 8.

### 4.1 Scales (family S)

| Axis | Order |
|---|---|
| Type | major → harmonic minor → melodic minor (up raised, down natural) → natural minor → chromatic → (jazz: dominant / mixolydian, bebop, 6th-diminished, blues, pentatonic, whole-tone) |
| Keys (major) | C → G → D → A → E → F → B → B♭ → E♭ → A♭ → D♭ → G♭/F♯ (option: "black-key friendly" order brings B, D♭, G♭ earlier) |
| Keys (minor) | A → E → D → B → G → C → F♯ → F → C♯ → G♯ → B♭ → E♭/D♯ |
| Hands | RH → LH → hands together (HT) |
| Motion | parallel (octave) → **contrary** (from the unison) → parallel a 3rd / 10th apart → a 6th apart → formula pattern (contrary out, parallel, contrary in) |
| Range | 1 → 2 → 3 → 4 octaves |
| Articulation | legato → staccato → portato → mixed (one hand legato, the other staccato) |
| Dynamics | even mf → even p → even f → crescendo up / diminuendo down → pp and ff extremes → accents every 3rd / 4th note |
| Rhythm variants (Cortot) | even → dotted long-short → short-long → groups of 3, 4, 5, 6 with the accent → accent shifted through the group → stop-and-go |

**Item** = type × key × hands × motion × range × articulation × dynamics × variant. The app does not offer every
combination at once: the family **ladder** (§8) walks the axes in order (e.g. C major RH 2 oct legato mf → LH → HT
→ contrary → …), and a variant appears once the plain item is clean at T2.

Metrics: accuracy, clean tempo, **IOI CV per hand** (evenness), timing SD and bias vs the click, **hand
asynchrony** (HT), **thumb-passage glitch** (IOI at the crossing ÷ median IOI), velocity SD (even dynamics),
velocity band hit % / slope (dynamic tasks), KOR / KDR (articulation).

### 4.2 Arpeggios and broken chords (family A)

| Level | Content |
|---|---|
| A1 | major / minor triads, root position, 1 → 2 octaves, HS |
| A2 | + inversions (1st, 2nd), HS |
| A3 | HT, 2 octaves |
| A4 | dominant 7th of each key (4-note groups), HS → HT |
| A5 | diminished 7th (only 3 distinct), HS → HT |
| A6 | 4 octaves, any inversion, contrary motion |
| A7 | maj7 / m7 / ø7 arpeggios (jazz), up the cycle of 4ths |
| Broken chords | 1-3-5-3, 1-5-3-5, through inversions up the keyboard; blocked chords with inversions ending in a cadence |

Metrics: as scales + **leap / crossing glitch** (IOI at each hand shift).

### 4.3 Cadences and progressions at the keys (family C)

| Level | Content |
|---|---|
| C1 | I–IV–V–I, blocked, RH 3 notes + LH root, in C, G, F |
| C2 | I–IV–I6/4–V7–I (cadential 6/4) in 6 keys; three RH positions (root / 3rd / 5th on top) |
| C3 | all 12 keys, major and minor |
| C4 | ii6–V7–I, vi–ii–V–I (circle), secondary dominants V/V |
| C5 | Neapolitan 6 → V, augmented sixth → V (links to the ear topics) |

Metrics: chord correctness (pitch-class set), **voice-leading distance** (Σ semitones moved ÷ voices), chord spread
(< 25 ms), change timing vs the beat.

### 4.4 Finger independence and dexterity (family F)

| Level | Content | Source |
|---|---|---|
| F1 | five-finger patterns (C position) in all keys, HS → HT; 1-2-3-4-5-4-3-2 and variations | pentascales |
| F2 | **Hanon Part I** (Nos. 1–20): sequential patterns up and down by step, HT in octaves; first in C, then transposed | Hanon (public domain) |
| F3 | held-note exercises (some fingers hold, others move) — Pischna / Dohnányi style | |
| F4 | **trills** on finger pairs 1-3, 2-3, 2-4, 3-4, 4-5: measured (4 / 6 / 8 per beat) → free | |
| F5 | **repeated notes** with finger change 4-3-2-1; repeated chords | Hanon 44–47 |
| F6 | **Hanon Part II** (21–43): harder patterns, thumb-passing preparation, scales / chromatic / arpeggios (39–43) | |
| F7 | **Hanon Part III** (44–60): repeated notes, double 3rds / 6ths, octaves, tremolo | |

Hanon is used as a **pattern generator**: each exercise × key × tempo is an item; transposition to all keys
is a modern practice and optional. Metrics: IOI CV, velocity SD **per finger position** (which finger is weak),
trill rate, dropped repeats.

### 4.5 Control: articulation, dynamics, voicing (family K)

| Level | Content | Goal |
|---|---|---|
| K1 | a scale legato vs staccato | legato KOT 0–40 ms; staccato KDR ≤ 50 % ⚙ |
| K2 | portato; two-note slurs (drop-lift) | KDR 60–80 % |
| K3 | every note at one level: pp / p / mf / f / ff | ≥ 85 % of notes in the calibrated band |
| K4 | crescendo up 2 octaves, diminuendo down | slope smooth: R² > 0.8, range ≥ 40 velocity units |
| K5 | accents every 3rd / 4th note | accented − others ≥ 15 units |
| K6 | **voicing**: one hand plays a chord with the top note louder | top − others ≥ 10 (basic) / ≥ 20 (strong) |
| K7 | melody over accompaniment (RH melody, LH Alberti or chords) | melody leads by ≥ 10 velocity units |
| K8 | hands at different dynamics (RH f, LH p) and different articulations | both bands met |

### 4.6 Advanced technique (family X)

Octaves (staccato wrist, legato with 4/5 on black keys, chromatic octaves) · scales in double 3rds and 6ths (one
hand) · leaps (stride / waltz bass, RH octave jumps: hit rate and landing lateness) · polyrhythm between the hands
(2:3, 3:4: ratio accuracy, shared downbeats aligned).

### 4.7 Barry Harris: control of the major scale and the dominant (family H)

(Only what is truly his — research §2. The exact half-step rule list varies between sources, so the app checks the
**goal** — chord tones land on the beats — instead of hard-coding one list.)

| Level | Drill | Auto-check |
|---|---|---|
| H1 | the **linear scale**: major scale in 8ths from the root, up and down, chord tones (1-3-5-7 of the scale's 6th / dominant chord) on the beats | pitch sequence + chord tones on beats |
| H2 | **the dominant 7th scale descending from each chord tone** (1, 3, 5, 7) with the **half-step rule** (from the root: 1 – ♮7 – ♭7 so the ♭7 lands on a beat) | chord tones of the dom7 on every beat |
| H3 | **triad arpeggios** on each degree of the scale (up), then down the scale | sequence match |
| H4 | **"chords"** in Harris's sense — 4-note: 1-3-5-7 from each degree, and the **"3 to 9"** arpeggio (3-5-7-9), then down the scale | sequence match, chord tones on beats |
| H5 | **pivots**: an arpeggio turned around by octave displacement (1-3-5-7 up, then pivot down) | sequence match |
| H6 | **a half step below before each note** (chromatic approach), then **enclosures** (step above → half step below → target) | targets on beats, approaches ±1 semitone |
| H7 | **lick + line**: start each line with a short figure (the "Harris triplet"), combine scale + arpeggio + pivot over V7, then ii–V (think dominant) | chord tones on beats, pitch classes ⊂ the chord-scale + allowed half steps |
| H8 | **brothers**: lines over C7 that substitute E♭7 / G♭7 / A7 (one diminished family) | pitch classes ⊂ the family's union |
| H9 | **6th-diminished scale in block chords** (4 voices: C6 on the scale degrees, B°7 on the passing ones), then **drop 2 / drop 3**, "borrowing" | pitch-class set per beat alternates 6th / dim7; voices in parallel; hand sync |

Each H level runs in all 12 keys (cycle of 4ths), RH → LH → HT (in 10ths), tempo ladder in 8ths, straight → swung.

### 4.8 Jazz and contemporary drills (family J)

Shell voicings (1-7 / 1-3) through ii–V–I · rootless A / B voicings · guide-tone lines (3rds and 7ths) · blues
scale patterns · digital patterns 1-2-3-5 (and inversions) through ii–V–I and Giant Steps · upper-structure
triads (II, ♭III, ♭V, ♭VI, VI over a 3-♭7 tritone) · quartal "So What" voicings · pentatonic and gospel licks.

### 4.9 Coverage additions (audit 2026-11-07, `docs/research/DRILLS_COVERAGE_AUDIT.md`)

Levels appended at the end of each family (existing levels and item ids unchanged). Piano: 75 → **112 levels**,
1,491 → **3,041 items**.

| Family | New levels |
|---|---|
| S | 13 minor contrary / a 3rd, 6th, 10th apart (harmonic, melodic) · 14 chromatic a minor 3rd and a major 6th apart; 3 octaves (major, minor, chromatic) · 15 melodic and natural minor HS |
| A | 9 minor inversions HS · 10 dominant 7th from every chord tone · 11 diminished 7th from every note · 12 3 octaves HT; maj7 / m7 / ø7 HT · 13 blocked (solid) chords through the inversions · 14 minor broken and blocked chords |
| C | 6 plagal and deceptive cadences · 7 minor: deceptive, plagal, Picardy 3rd, ii6, circle |
| F | 8 thumb under (after 3, after 4) · 9 ornaments: upper / lower mordent, turn, acciaccatura, appoggiatura, trill with a turned ending · 10 held notes: hold 1 + 5, hold the middle finger · 11 measured trills 6 and 8 per beat · 12 repeated chords; rotation (broken 6ths, broken octaves) · 13 Czerny-style velocity (runs over LH chords; broken-chord figuration) · 14 repeated notes in triplets; Hanon-style patterns in all keys |
| K | 8 balance (RH loud / LH loud, scored as voicing) · 9 legato / staccato / portato HT · 10 **pedalling** (direct, legato, two changes a bar — the plan is in `goal.pedal`; scoring the pedal needs the CC64 track, §5.6) · 11–12 **sight-reading** (seeded melodies: five-finger, one octave with mixed rhythms, melody over a bass HT) |
| X | 3 staccato, chromatic and HT octaves · 4 double 3rds and 6ths in one hand · 5 leaps (waltz bass, RH two-octave jumps, both hands outwards) · 6 polyrhythm 2:3 and 3:4 · 7 polyrhythm in more keys |
| H | 10 minor 6th-diminished block chords (close, drop 2, drop 3) · 11 arpeggio up from each chord tone, the dominant scale down by the rules · 12 Harris lines in the LH |
| V | 8 quartal voicings through the dorian scale · 9 two-handed voicings (LH 3-7, RH 9-13) and drop 2 · 10 tritone substitution ii–♭II7–I · 11 comping rhythms (Charleston, reverse Charleston, anticipations, Red Garland) · 12 Coltrane changes, root + guide tones |
| J | 5 chord scales (dorian, lydian dominant, altered, whole-tone, both diminished, bebop dorian, melodic minor, minor pentatonic, lydian) · 6 target 3rds over forms (blues, minor blues, rhythm changes A, a ii–V–I standard) · 7 guide-tone lines and chord-tone arpeggios over the forms · 8 locked hands (Shearing) · 9 Coltrane changes: 1-2-3-5 and 1-3-5-7 · 10 blues turnarounds and the ♭3→3 lick |
| M | 5 boogie-woogie LH (5-6 shuffle, walking, broken octaves) · 6 bossa nova and montuno with tumbao · 7 pop LH 1-5-8-9-10 / 1-5-8-5 · 8 walking through changes (ii–V–I cycle, rhythm changes A) · 9 stride and walking in more keys |

---

## 5. Playing skills beyond drills (piano)

These use the same screen, with a **backing** (bass + drums + optional comp) instead of only a click, and a
lead sheet or chord chart instead of only notes.

### 5.1 Left-hand voicings and chord changes (family V)

| Level | Content | Goal |
|---|---|---|
| V1 | triads I–IV–V, blocked, smooth voice leading | correct, voice-leading ≤ 2 |
| V2 | 7th chords root position; cadences in 6 keys | |
| V3 | **shells** (1-7, 1-3) ii–V–I all keys | |
| V4 | **rootless A / B** ii–V–I, A-start and B-start, all keys; minor ii–V–I (ø7, 7♭9) | voice-leading ≤ 1.5 |
| V5 | **one-minute changes** (piano): alternate two voicings (or cycle four) with the click; count clean changes per minute | 20 → 40 → 60 → 90 / min, then on beat 1 at tempo |
| V6 | progressions at tempo: blues (basic, jazz, Bird), rhythm-changes A, Autumn-Leaves-type cycles, Coltrane changes | clean bars % |
| V7 | upper structures, quartal, drop 2 | |

Metrics: chord correctness (required tones present, no avoid notes), voicing type (shell / A / B / quartal /
drop 2 from the interval structure), **voice-leading distance**, change timing (ms), clean changes per minute,
register (no mud below ~E2–F2).

### 5.2 Accompaniment patterns (family M)

| Family | Levels | Metrics |
|---|---|---|
| **Stride** | single bass → octave → **10th** on 1 and 3, chord on 2 and 4; 80 → 120 → 160 → 200+ bpm; I–IV–V → stride tunes | **leap hit rate**, bass landing lateness, chord onset, bass ≥ chord in velocity |
| **Walking bass** | roots + approach on 4 → chord tones on 1, approach notes (±1 / step / 5th above) → blues in F → rhythm changes → standards | % chord tones on beat 1, % approaches resolving by step, IOI CV |
| **Boogie-woogie / ostinato** | walking octaves, broken 6ths, "Pinetop"; shuffle | pattern accuracy, swing-ratio stability, **independence**: RH timing unchanged against the LH |
| **Alberti / broken chords / waltz** | Classical sonatina accompaniment → pop 1-5-8-9-10 | LH softer than the melody, evenness |

### 5.3 Comping and lead sheets (family L)

Comping rhythms (Charleston, reverse Charleston, anticipations, Red Garland &2 / &4) over swing backing ·
two-handed voicings · drop 2 / block chords · **locked hands** · **lead-sheet realisation** (melody on top +
shells / rootless / two-handed). Metrics: onsets vs the rhythm template, swing ratio, chord correctness across
hands, melody on top and louder, hand sync.

### 5.4 Improvisation over a form (family I) — descriptive feedback

Forms: 12-bar blues (F, B♭, then all keys) → minor blues → rhythm changes → AABA standards → modal.
Drills: guide-tone lines · **target notes** (a chord tone on beat 1 of each chord) · motif development (repeat,
transpose, invert, displace a 3–5-note motif) · **call and response with the app** · playing over the backing at
tempo · Harris lines (family H) over the form.
Shown after a chorus (never as a grade): *"You landed on chord tones at 9 of 12 changes"*, chord-tone % on strong
beats, target-hit rate, unresolved non-chord tones, time feel (laid back / on top, swing ratio), range, rhythmic
variety, note density and phrase length, motif recurrence, still in the form (no lost bars).
Not measured: musicality, taste, deliberate outside playing.

### 5.5 Reading, transposing and playing by ear at the keys (family R)

Sight-reading at the keyboard (the music keeps going; adaptive levels; continuity counted) · transposition (a
known melody / progression in N keys; read in C, play in another key) · playing by ear (echo a phrase; melodies
and progressions by ear) — **the existing ear-training items get a keyboard-answer mode** (they already have MIDI).

### 5.6 Pedalling (family P) — fully measurable over MIDI (CC64)

Direct pedal (down with the chord, up before the next) → **legato / syncopated pedal** (up exactly at the new
harmony, down just after: up within −30…+60 ms of the chord, down +50…+250 ms ⚙) → pedal with 2 changes per bar
→ half-pedal (keyboards with continuous CC64). Faults counted: **blur** (pedal held across a harmony change) and
**gap** (sound break between harmonies).

### 5.7 Levels across playing skills (P1–P6)

| Level | Voicings & changes | Accompaniment | Improv | Reading / ear | Pedal |
|---|---|---|---|---|---|
| P1 | triads I–IV–V | broken chords, waltz bass | call & response, C pentatonic | echo 3 notes | direct |
| P2 | 7th chords, cadences in 6 keys | Alberti, pop 1-5-8 | blues scale over F blues | 2-bar echo; RH melodies | legato, slow changes |
| P3 | shells ii–V–I, all keys | walking bass (roots + approach) | target chord tones on beat 1 | easy HT reading; transpose 5-note tunes | legato every bar |
| P4 | rootless A/B, one-minute changes ≥ 40 | stride with octaves at 100; boogie | guide tones, rhythm-changes A | lead sheet: melody + shells | 2 changes / bar |
| P5 | upper structures, quartal, drop 2 | stride with 10ths at 160; full walking | AABA, motif development | two-handed voicings; transpose in 3 keys | half-pedal |
| P6 | locked hands, 6-dim drops | stride 200+ | any form at tempo | sight-reading at a high level | all |

---

## 6. Metrics (MIDI) — definitions and starting thresholds ⚙

| Metric | Definition | Starting thresholds |
|---|---|---|
| Accuracy | matched / expected; wrong = extra pitches; missing = unmatched | clean = 100 % and 0 wrong; pass ≥ 95 % |
| Timing | onset − click − latency (ms): mean (rushing < 0 / dragging > 0) and SD | SD < 15 tight · < 25 good · < 40 ok; \|mean\| < 10 |
| **Evenness** | IOI CV per hand = SD(IOI) / mean(IOI) | < 2.5 % very even · < 4 % even · > 7 % uneven |
| Thumb-passage glitch | IOI at the crossing ÷ median IOI | flag > 1.15 repeatedly |
| **Hands together** | Δ = t_RH − t_LH for simultaneous notes: mean (who leads) and mean \|Δ\| | < 20 ms together · < 30 ok · > 40–50 audible |
| Chord spread | max − min onset within one hand | < 25 ms |
| Velocity evenness | SD of velocity (notes meant equal) | < 6 even · < 9 good · > 12 uneven |
| Dynamic band | % of notes inside the calibrated band | ≥ 85 % |
| Crescendo | regression of velocity on note index: slope, R² | R² > 0.8, range ≥ 40 |
| Legato | key-overlap KOT = off(n) − on(n+1) | 0 < KOT ≤ 40 ms; > 60 ms smudged; < −10 ms detached |
| Staccato | KDR = duration ÷ IOI | ≤ 50 % staccato · ≤ 30 % staccatissimo · 60–80 % portato |
| Voicing | melody velocity − accompaniment velocity | ≥ +10 basic · ≥ +20 strong |
| Speed | median IOI → bpm / notes per second; **clean tempo** = the highest tempo of a clean pass | |
| Hesitation | IOI > 1.5 × median | 0 for clean |
| Voice-leading distance | minimal matching between successive voicings, Σ semitones ÷ voices | ≤ 1.5 (A↔B) |

**Level of an item** (per tempo band): **3 consecutive clean takes** at the band's minimum with IOI CV < 5 % (T1–T2)
/ < 4 % (T3–T4) / < 3 % (T5+), timing SD < 30 / 25 / 20 ms, hands |Δ| < 30 / 25 / 20 ms, velocity SD < 12 / 10 / 8
(when "even" is the goal).

Microphone piano: accuracy, timing, tempo and evenness (single-hand lines only); no hands, velocity,
articulation or pedal — the item says *"MIDI gives more"*.

---

## 7. Tempo ladder (per item)

- The ladder starts at the tempo where the item is clean (a short probe on first use).
- **Clean 3× in a row → +1 step** (≈ 3–5 %, e.g. +4 bpm at ♩ = 100); the new goal is shown as *today's goal*.
- **2 failed sets → −10 %** and climb again.
- **Speed burst** (optional, at most one set a day): +10–15 % above the goal, then back.
- Daily goal = yesterday's clean tempo + 1 step. The goal tempo of the item's level band is the long target.

---

## 8. Progress — what the player sees

- **Technique map** (per instrument): families as tiles (level, trend); tap → the family page:
  - **12-key heat map** (rows = keys, columns = forms: HS / HT / contrary / …), colour = level, a number = clean
    tempo; hardest keys marked;
  - **hand comparison** (LH vs RH: clean tempo, evenness);
  - **trends** with the time-frame chips (spec AG): clean tempo, evenness, hand sync, velocity control over time;
  - **"Work on next"**: the 3 weakest items with the reason (*"LH evenness 6.8 % — the slowest key in this family"*).
- **After each take**: the evenness strip, the velocity curve, the hands chart (§3).
- **Weekly summary**: tempo gained per family, keys that became clean, the weakest finger position.

---

## 9. What to work on today (the Technique block)

1. Each item keeps: clean tempo, goal, last practised, EWMAs of IOI CV, timing SD, velocity SD, hands Δ, accuracy.
2. **Weakness** = 0.35 × tempo gap + 0.25 × CV + 0.15 × velocity SD + 0.15 × hands Δ + 0.10 × errors (z-scores
   against the player's own median across keys) × staleness (spaced like the review queue) ⚙.
3. A Technique block of N minutes: **1 warm-up** (easy, known) → **2–3 weakest items** (one ladder step each) →
   **1 maintenance** (something mastered, spaced) → **1 variant** (rhythm / articulation / dynamics). Keys
   interleaved; sets of 30–90 s.
4. A **Playing skill** block alternates families V / M / L / I / R / P by the player's choice.
5. Families the player left out (e.g. "no jazz") are never served; the goal decides the mix (classical vs jazz vs
   pop emphasis — §12 Q3).

---

## 10. Data

- Per item: `{ id, family, key, hands, motion, range, articulation, dynamics, variant, cleanTempo, goal, ladder,
  ewma: { cv, sd, vsd, dhands, acc }, last }` (synced, small).
- Per take (local, last N per item): the note events (pitch, on, off, velocity, hand), the click times, the
  computed metrics — for the trends and "loop the spot".
- Device calibration: latency, velocity range, keyboard size, pedal.

---

## 11. Guitar (outline — after the piano is reviewed)

Families: chromatic 1-2-3-4 ("spider") and permutations · alternate picking (single string → string changes) ·
legato (hammer / pull pairs, 3NPS) · string skipping · scales (5 CAGED positions, 7 3NPS patterns, all keys) ·
arpeggios (CAGED triads, 7ths, sweep basics) · **one-minute changes** (open → barre → jazz voicings) · strumming
patterns · fingerpicking (Travis, PIMA) · bends to pitch (½, 1, 1½ steps) and vibrato (rate 4–7 Hz, width) ·
barre endurance.
Audio measures well: single-note pitch (cents), onset timing vs click (headphones for the click), tempo, IOI CV,
bend target error, vibrato rate / width; partly: chord match against the *expected* chord (chroma); not at all:
fingering, picking direction, muting — shown as self-check boxes.

---

## 12. Open questions for the owner (please answer while reviewing)

1. **Thresholds**: may I calibrate the ⚙ numbers from a few of your own MIDI takes (C major scale 2 octaves at 3–4
   tempos, legato and staccato; one ii–V–I in rootless voicings)?
2. **Fingering**: show the standard fingerings as help (not graded)? (The minor-key table needs a check against a
   printed chart first.)
3. **Emphasis by default**: classical canon (scales / arpeggios / Hanon / cadences) and jazz (Harris / voicings /
   stride / walking) both, or follow the goal (e.g. *An ear for jazz* → jazz first)?
4. **Barry Harris**: the half-step rules beyond the root → ♮7 → ♭7 rule differ between sources — check "chord tones
   on the beats" as the goal (my proposal), or do you want a specific rule list?
5. **Hanon**: all 60 as items, or the first 20 + 39–43 (scales / arpeggios) + selected Part III?
6. **Keys order**: classical (C, G, D, A, E, F, B, B♭ …) or "black-key friendly" (B, D♭, G♭ earlier)?
7. **Path**: a technique step in every unit when the goal / pack is on — or only in the workout?

---

## 13. Owner answers (2026-11-07) — binding

1. No owner calibration for now: thresholds from the research (§6).
2. Fingering: a choice in a dedicated **Drills settings** screen.
3. Families as listed (classical + jazz) — both by default.
4. Barry Harris: checked by the goal (chord tones on the beats).
5. Hanon: the customary selection; **continuous practice**: after a take above the accuracy threshold, either
   raise the tempo automatically or move on to the next key / next drill (setting).
6. Key order: chromatic up / down or circle of fifths up / down (or the difficulty order) — in Drills settings.
7. Path and workout: both, each a player's choice in Drills settings.
8. **Drill creator**: the player creates a drill (pattern in scale degrees — typed, or played once on MIDI) and it
   behaves exactly like a built-in drill: all keys in the chosen order, the tempo ladder, metrics, continuous mode,
   the Technique map.
9. **Level test for technique**: *Find my level* gets a **Technique** section (piano / MIDI players; skippable;
   also runnable alone from the Technique map): a tempo staircase per main family — a hands-together scale, an
   arpeggio, a five-finger pattern, and (jazz emphasis) a ii–V–I in voicings — each clean take raises the tempo
   15–20 % until a take is not clean; the last clean tempo seeds every item of the family (scaled for key
   difficulty) and its starting level.

---

## 14. Implementation status (2026-11-07)

- Engine: `engine/drills/{generate,analyze,ladder,custom}.ts` (catalogue of 10 families × levels, take analysis, tempo
  ladder + continuous modes, today's items, family level), `plan.ts` (current level per family, candidates, heat),
  `events.ts` (a take = one graded rated event `instrument/piano-tech` (+ `timing/subdivide` for evenness drills), XP
  clean 4 / almost 2 / not yet 1; ids `g:drill:<session>:<i>` so the path groups a drill set like a game session).
- UI `ui/Drills.tsx` (route `#/drills`, Play → Instrument & sound): hub (Today, families with level + 12-key heat,
  My drills, settings, find my technique level), family → levels → per-hand × key heat grid, run (staff in lines of 8,
  fingering per setting, count-in, MIDI / mic take, verdict + charts, ladder message, continuous modes), settings,
  calibration (latency, softest / loudest velocity), drill creator (degrees or record on MIDI, run through all keys).
- Everything connects: path game step `drills` in instrument units for keys players (unless `inPath` off; stars from
  the clean share), workout game slot becomes Technique for keys players (unless `inWorkout` off), the level test
  continues with the technique staircase for keys players (sets `settings.drillStart` per family), takes feed ratings,
  the map, stats, XP / league, the technique rank and the technique badges.
- Guitar: spec + engine in progress (`docs/SPEC-GUITAR-TECHNIQUE.md`).
- Coverage audit (2026-11-07, `docs/research/DRILLS_COVERAGE_AUDIT.md`): every sub-topic of ABRSM / Trinity / RCM
  technical work, the exercise canon and the jazz canon (Harris, Levine, Aebersold) checked; 38 missing and 12 thin
  piano sub-topics filled (§4.9; 112 levels, 3,041 items). Still open: exact Hanon Nos. 2–60, pedal scoring from CC64,
  per-hand articulation goals. Tests sweep every item × key (valid notes, unique ids, a perfect take is clean) and a
  coverage guard keeps every audited drill kind in the catalogue.

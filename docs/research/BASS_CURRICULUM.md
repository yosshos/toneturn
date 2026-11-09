# Bass curriculum research: what bassists are taught, and how The 7th Sense can teach and measure it

Researched 2026-11-09 for the Bass course (beta since 0.61). Electric bass first; upright (double) bass as a secondary track.
All method-book content is summarised in our own words. No exercises, transcriptions or lyrics are copied. Where a source
could not be checked first-hand, it says so.

---

## 1. Executive summary

1. Every serious bass programme (Berklee, MI, RSL, Trinity, SBL, TalkingBass, BassBuzz, StudyBass, Pickup Music) teaches the same core: **time and groove first**, then **chord tones**, then **reading/fretboard**, then **style vocabulary**, with technique serving those. Speed for its own sake is a minor goal.
2. The bassist's job is "locking rhythm to harmony" (Berklee's description of the bass is close to this). So the skills to measure are where notes land relative to the drums and which chord tone falls on the downbeat. Shredding matters much less.
3. Our engine already measures most of this: onset timing (mean/SD), evenness (IOI CV), pitch, note decay (palm-mute score), legato, unpitched onsets (ghost notes), and a groove model with per-subdivision push/drag and a fading click. Bass needs **new drill content and a few bass-specific analyses**, not a new engine.
4. Today's `g-bass` family (6 levels) covers about 15% of a full bass syllabus. The biggest missing areas are subdivision/time-feel ladders, muting and note length, step-by-step walking-bass construction, style vocabulary, reading, ear (roots and bass lines), and 5-string support.
5. Proposal: **14 electric-bass technique families (120 levels) plus a bass-ear family (8 levels)** and a **6-family upright track**. Every level has a measurable pass rule built on our clean/almost/not ladder.
6. Mic limits on bass: low E (41 Hz) and low B (31 Hz) need windows of about 50–65 ms, and octave errors are common. Finger alternation, raking, fingering choice and right-hand anchoring **cannot be seen by mic**. The plan uses measurable stand-ins (odd/even IOI and loudness asymmetry, tempo-forced string crossings, note-length checks).
7. A 2½-minute placement probe (6 short adaptive tasks) can seed 8 families from one session.
8. Highest-value features: **Lock-with-the-kick play-along**, a **walking-bass coach over our 36 standards**, **root-finder and bass-line ear games** from the band engine, **click on 2 & 4 / drop-out drummer**, a **groove fingerprint**, and **5-string/fretless support**. All are S–M effort because they reuse what exists.
9. Competitors either give measured feedback with shallow bass pedagogy (Yousician, Rocksmith+) or deep pedagogy with no feedback (SBL, TalkingBass, BassBuzz, StudyBass). Melodics has no bass guitar track that I could find. Nobody offers **measured groove-against-drums plus walking-bass and harmony feedback plus exam/bagrut alignment in Hebrew**. That is the gap we can own.
10. Israeli context: the bagrut pop-rock recital (5 units) accepts bass guitar. It requires a memorised transcription with a 2-chorus solo, a blues, a ballad, a medium and a fast piece, sight-read improvisation over changes, and theory questions. That maps directly onto our walking, ear, reading and improvisation families.

---

## 2. What we already have (code read, 2026-11-09)

| Area | Where | What exists | Gap for bass |
|---|---|---|---|
| Bass family | `src/engine/drills/guitar.ts` → `guitarCatalog()` family `g-bass`, `genBass()` | 6 levels: spider permutations; major / modes / pentatonic in one position; grooves (root 8ths, Motown R-5-6-8 with approach, tumbao); triad/7th arpeggios; octaves + slap; walking ii–V–I and blues | No time-feel ladder, muting, ghost-note funk, reading, ear, styles beyond 3, upright track |
| Tuning model | `src/engine/fretboard.ts` `TUNINGS` | Only `bass` EADG (`open: [43,38,33,28]`) | **No 5-string (B0 = 23), 6-string (high C = 48), drop-D (26) or fretless flag.** `fretted:false` already exists for bowed strings and could be reused for fretless/upright |
| Arpeggio shapes | `fretboard.ts` (shape helpers, root-5-octave "first shape") | Bass-aware shapes | Inversions, two-octave forms |
| Mic analysis | `src/engine/drills/guitarAnalyze.ts` | Onset detection, pitch, `UNPITCHED` onsets, octave fixes, glides, bends, vibrato, `legatoRatio`, `palmMuteScore` (decay ms + spectral centroid), change gaps | Bass needs: note-**length** check (release before the next note or rest), odd/even asymmetry, slap/pop transient class, ghost-note share, intonation in cents for fretless/upright |
| Metrics / ladder | `drills/types.ts` `TakeMetrics`; `drills/ladder.ts` | accuracy, timingMean/SD, IOI CV, velocity mean/SD; 3 clean → tempo up, 2 fails → −10 % | Add a "pocket target" option (judge against a chosen offset, not 0) |
| Band engine | `src/engine/band.ts` `walkingBass()` | Rule-based walking (chord tone on new chord, approach notes into the next root, scale tones on weak beats, ghosted skip notes) | Usable as the **reference line** and as a **source of ear/transcription material** |
| Grooves | `src/engine/grooves.ts` `GROOVES` | Drum bank with k/s/h/r lanes across 11 styles; speed trainer | The kick lane can drive "lock with the kick" scoring directly |
| Groove trainer | `src/engine/analysis/grooveTrainer.ts`, `analysis/groove.ts` | Fading click plan, pocket score vs. target offset, swing ratio, per-subdivision stats, weekly drift | Currently tap-based. Feed it **bass onsets** to get a bassist's groove fingerprint |
| Notation | `src/ui/NoteViews.tsx` | `NoteStaff` with bass clef, `TabLine` with `strings` param | 4/5/6-string bass TAB is mostly a parameter change |
| Course | `src/engine/courses.ts` | `bass` course, `beta: true`, plays `['bass']` | Needs its own path once the families exist |

---

## 3. The consensus skill map for bass

Sources agree on the content below. Order is roughly the teaching order. ★ marks items every programme in section 7 teaches.

### 3.1 Technique

**Plucking hand (electric)**
| Skill | What is taught | Typical sources |
|---|---|---|
| ★ Alternating two-finger plucking (i-m) | Strict alternation and rest stroke (the finger comes to rest on the next string). Even volume and tone between fingers. Start on open strings, then scales | BassBuzz, Hal Leonard (Friedland), StudyBass, Berklee Practice Method |
| ★ String crossing | Which finger leads when crossing. Avoid "lead with the same finger" fatigue. Some teach raking descending lines | BassBuzz (string crossing/jumping), TalkingBass |
| Raking | The same finger plays consecutive strings when descending (economy). Some teachers forbid it, others recommend it | Friedland's Hal Leonard method (mentioned in its contents), SBL |
| Three/four-finger plucking | For fast 16ths and gallops (metal) | Advanced SBL/TalkingBass |
| ★ Muting | Floating-thumb or moveable-anchor plucking-hand muting of lower strings. Fretting-hand muting of higher strings. Releasing pressure to end notes. Rests that really sound as rests | BassBuzz (muting lesson), StudyBass, every teacher |
| Plucking position / tone zones | Near the neck = warm, near the bridge = tight. Used for dynamics and tone | BassBuzz ("plucking zones"), Carol Kaye's studio advice (pick near the end of the neck) |
| Single-finger "hook" | James Jamerson's index-finger approach (from Slutsky's *Standing in the Shadows of Motown*), muted with foam, flatwounds | Motown studies |
| ★ Pick playing | Down-strokes vs. alternate picking, palm muting, 8th-note "chug". Carol Kaye argued that most 1960s Hollywood bass parts were cut with a pick on flatwounds | Carol Kaye, Stuart Clayton's *Plectrum Technique for Bass Guitar*, Trinity Gr 7 ("fast picking") |
| Palm mute (fingers or thumb) | Thumb plucking with palm mute for a muted vintage/Motown/reggae tone | Pickup Music, SBL |
| ★ Slap & pop | Thumb slap, index pop, hammer-on "left-hand slap" (fretting-hand mute hits), octave pops, double thumbing (Wooten), open-hammer-pluck patterns | Hal Leonard book 3 (ends with slap), TalkingBass *Simple Steps to Slap Bass*, RSL Gr 6–8 funk study, Trinity Gr 7 |
| Tapping, chords, harmonics | Natural harmonics at frets 12/7/5, artificial harmonics (Jaco), double-stops and 10ths, high-register chords | RSL Gr 7–8 (harmonics, high-register chords), Jaco's *Modern Electric Bass* video |

**Fretting hand**
| Skill | What is taught |
|---|---|
| ★ One finger per fret (OFPF) | 4 frets per position. The spider/chromatic permutations (our `spider`) |
| ★ Simandl fingering (1-2-4) | Used in low positions on electric and standard on upright: 1-2-4 covers a whole step and the 3rd finger supports the 4th. Simandl's *New Method* (1881) is still the classical base. Rochester/Eastman's community curriculum teaches Simandl positions ½ → 4th → thumb position |
| ★ Positions and shifting | Moving by half-step, whole-step and to the "next position". Shifting on the same finger. Guide fingers |
| Pivoting | Stretch by pivoting on the thumb instead of shifting |
| ★ Hammer-on, pull-off, slide | Legato phrasing (RSL Gr 6–7 rock "legato"; Trinity Gr 2 "slides") |
| Ghost notes / dead notes | Fretting-hand release on a plucked string gives a pitchless "thud" for 16th funk |
| Vibrato, bends | Small, mostly in solos and fretless |
| Octaves and 10ths | The disco octave, plus shapes across 2 or 3 strings |
| Fretless intonation | Playing on the fret line, slide intonation, mwah |

### 3.2 Time and groove (the centre of every bass curriculum)

| Skill | Content |
|---|---|
| ★ Pulse and subdivisions | Quarters → 8ths → triplets → 16ths → 16th-triplets/quintuplets. Moving between them while keeping the pulse (BassBuzz "Beat Ruler", TalkingBass Groove Trainer) |
| ★ Locking with the kick | Play the kick-drum rhythm with the root. Bass and kick are one instrument for the listener |
| ★ Note length | Where a note ends matters as much as where it starts: staccato vs. full value (Wooten counts articulation and space among his ten elements of music) |
| Pocket / micro-timing | On top, centre or laid back. Research finds bass–kick asynchronies of about 20–30 ms in jazz and funk, and listeners in one study preferred bass slightly **after** the drums. Other studies found little groove benefit from micro-timing. So we treat pocket as a **chosen, controllable offset**, never as an error by default |
| ★ Feels | Straight 8ths, swing/shuffle (triplet-based), straight 16ths, swung 16ths (hip-hop, neo-soul), half-time, two-feel (jazz), 12/8 |
| Click displacement | Click on 2 & 4, click on "and", one click per bar, click that drops out (we have a fading click) |
| Dynamics | Crescendo on repeated 16ths (Trinity Gr 4 technical focus), accents |
| Odd meters | 5/4, 7/8, 7/4 grooves (RSL Gr 8 rock/metal study: "odd time grooves") |
| ★ Playing with a drummer | Following fills, setting up song sections, not rushing fills. Pickup Music and SBL treat "locking with the rhythm section" as a core intermediate skill |

### 3.3 Harmony

| Stage | Content |
|---|---|
| ★ Roots | Roots on the downbeat. Following a chord chart with roots in 8ths (RSL Gr 4–6 "harmonic recall": play the roots of a heard I-IV-V-vi progression) |
| ★ Root-5th, root-5th-octave | The first shape, plus the 5th below |
| ★ Triads and 7th-chord arpeggios | Major, minor, dominant 7 → maj7, m7, m7♭5, dim7 (RSL Gr 3–6). Then 9ths and altered dominants (RSL Gr 7–8). Through inversions, in position, then across the neck |
| ★ Chord tones over progressions | Hit a chord tone on beat 1 of each change. Connect by step |
| ★ Approach notes | Chromatic from above/below, dominant (5th of the target), scale step, enclosure (Friedland's *Building Walking Bass Lines* teaches roots → fifths → chromatic approach → dominant approach → scale approach → combinations) |
| ★ Scales / modes on the neck | Major and natural minor in one position, pentatonics (RSL Gr 6: all 5 minor-pentatonic positions), blues, modes (Dorian, Mixolydian at Gr 6; Lydian, Phrygian, melodic minor at Gr 7; whole-tone, diminished, altered at Gr 8), 2-octave scales |
| ★ Walking bass construction | Half notes (two-feel) → quarter notes with root + chord tones → approach notes on beat 4 → scale-step connections → chromatic passing → triplet skips/ghosts → full choruses on blues, rhythm changes and standards → upper register and pedal points (Friedland, Rufus Reid, TalkingBass *Simple Steps to Walking Bass*, SBL Walking Bass pathway, Pickup Music "Learn Walking Bass in 7 Days") |
| Functional harmony | Diatonic chords, Nashville numbers, ii-V-I, secondary dominants, tritone subs (TalkingBass *Ultimate Music Theory*, Ariane Cap's *Music Theory for the Bass Player*: notes → intervals → scales → triads → chords → circle of fifths → modes, using fretboard diagrams) |
| Pedal points, inversions, slash chords | Pop/gospel bass (bass notes of slash chords, "1 over 3") |

### 3.4 Reading

| Stage | Content |
|---|---|
| ★ Bass clef notes on the neck | Open strings → first position → up the neck. Bass sounds an octave below written |
| ★ Rhythm reading | Rhythm-only reading on one string first (RSL Debut: 4 bars of half and quarter notes at 70 bpm on the E string). Then melodies (Gr 1: A minor, Gr 3: 8ths and rests, Gr 4–5: 8 bars with chord symbols and a 2-bar improvised continuation) |
| ★ TAB | Universal in pop pedagogy (BassBuzz, SBL), with a move toward notation later |
| Charts and lead sheets | Chord symbols, slashes, repeats, codas, written figures plus "fill". RSL Gr 6–8 Quick Study Piece is a lead sheet with improvised sections. Bagrut: improvise over a progression read at sight |
| Nashville numbers | BassBuzz teaches them in the beginner course. Standard in session work |
| Sight-reading in style | Berklee: Appleman's *Reading Contemporary Electric Bass* (funk/rock/disco/jazz reading studies), TalkingBass *Simple Steps to Sight Reading* |

### 3.5 Styles (vocabulary to teach as generated patterns, never copied lines)

| Style | Core devices |
|---|---|
| Rock | Root 8ths (pick or fingers), following the kick, octave pumping, pedal tones (RSL Gr 7 rock study) |
| Pop | Roots with anticipations, sus/slash-chord bass, space |
| Motown / soul | Chromatic approach, R-5-6-octave figures, syncopated 8ths, the "hook" single finger, flatwound tone |
| Funk | 16th fingerstyle with ghost notes, slap/pop, the "one", octave pops, muting |
| Disco | Octaves in 8ths, often with a ghost between |
| Reggae | One-drop (bass avoids beat 1 or leaves space), short notes, low register, palm-muted thumb |
| Latin: tumbao | Anticipated bass ("and" of 2, beat 4), 2-3/3-2 clave awareness |
| Bossa nova | Root-5th dotted-quarter/8th figure (the surdo pattern) |
| Samba | Root-5th on 2/4 with 16th pickups, surdo accent on beat 2 |
| Jazz walking & two-feel | See 3.3. Also ballads (half notes, pedal) |
| Blues / shuffle | Triplet shuffle (R-3-5-6-♭7 boogie shapes), 12-bar form |
| Gospel | Chromatic runs, fast fills, slash-chord bass, 5-string low register |
| Metal | Pick or 3-finger gallops, palm mute, drop tunings, unison with guitars, double-kick sync |
| Country / two-beat | Root-5th on 1 and 3, walk-ups between chords |
| Middle Eastern (Israeli context) | Maqam-flavoured ostinati (Hijaz/Phrygian dominant), 10/8 and 6/8 grooves. Our groove bank already has a "World & Middle East" style |

### 3.6 Ear

| Skill | Content |
|---|---|
| ★ Hearing the root | Find the key and the bass note of each chord. RSL Gr 4–6 "harmonic recall": play the roots of a heard progression in time, then name it |
| ★ Melodic recall | Echo 2-bar phrases (RSL Gr 3–6, Trinity "Playback") |
| ★ Transcribing bass lines | BassBuzz (ear training and transcription), Rufus Reid (transcribed solos), the bagrut transcription requirement |
| Rhythm recall | RSL Debut–Gr 3: echo a 2-bar rhythm on the E string to drums |
| Hearing chord quality from the bass seat | Major/minor/dominant on the root, inversions (the bass note isn't always the root) |

### 3.7 Musicianship

Fills (when, how long, landing on 1), song form and arrangement (verse/chorus intensity), playing with a drummer, the
solo (RSL from Gr 1, bagrut 2-chorus solo), creating your own line from a chord chart (RSL Gr 4–5 "Improvisation &
Interpretation"), and ensemble leadership (bagrut: "leading the ensemble" is graded). Wooten's ten elements are notes,
articulation, technique, feel, dynamics, rhythm, tone, phrasing, space and listening. They make a useful **feedback
vocabulary**: our report card can say *which* element failed.

### 3.8 Benchmarks from exam boards (useful for tempo targets)

| Board / grade | Scales and arpeggios | Other technical content |
|---|---|---|
| RSL Debut | Major and minor pentatonic in E, A at 70 bpm | Riff transposed to backing; reading 4-bar rhythm on E string |
| RSL Gr 1–3 | Major, natural minor, pentatonics, blues; triad and dom7 arpeggios at 70–90 bpm | Riff transposition; melodic/rhythm recall |
| RSL Gr 4–5 | One-octave scales in 8ths at 80 bpm (harmonic minor added at Gr 5); 2-octave maj7/m7/dom7 arpeggios at Gr 5 | Riff at 100; roots of I-IV-V(-vi) by ear |
| RSL Gr 6 | 5 minor-pentatonic positions; Dorian/Mixolydian in 2 positions at 100 bpm; m7♭5, dim arpeggios; 7th-chord shapes | Stylistic study: rock 16th fingerstyle + legato, OR funk slap + percussive 16ths, OR jazz chords + upper register |
| RSL Gr 7 | Lydian, Phrygian, melodic minor; 9th arpeggios; high-register chords | Rock pedal tones + legato / funk 16th slap + string crossing / jazz natural harmonics + arpeggios |
| RSL Gr 8 | Whole-tone, diminished, altered; 7♯5, 7♭5, 7♯9, 7♭9 arpeggios at 100 bpm | Rock odd-time + power chords / funk syncopation + slap / jazz **up-tempo fingerstyle and walking** |
| Trinity Rock & Pop | 3 songs (one "technical focus"), session skills (playback or improvising). Pass 60/100 | TF skills include slides, rests, dynamics (Gr 2); repeated semiquavers with crescendo, articulation, note lengths, stamina (Gr 4); feel changes, sliding octave double-stops, slap accents, fast picking (Gr 7) |
| ABRSM Double Bass (from 2024) | Scales and arpeggios from memory, separate bows and slurred. Suggested speeds rise from about ♩=40 (Gr 1) to about ♩=76 (Gr 8). Thirds (broken at Gr 6, running at Gr 8), dominant 7ths, diminished 7ths from Gr 5, double-stops at higher grades | Sight-reading by position: 1st position → half/1st → half, 1st and 3rd shifts; tenor/treble clef at high grades |

Takeaway: one-octave scales in 8ths at 100 bpm (about 3.3 notes/s) is "Grade 8" on electric bass in the RSL model. The
hard parts of the exam are style, time and harmony, not speed. **Our tempo targets should stay musical:** 8ths at 80–120,
16ths at 70–100, walking quarters at 100–220.

---

## 4. Measurement primer: what a mic or MIDI bass can and can't tell us

| Signal | MIDI bass (e.g. MIDI pickup, bass-to-MIDI) | Mic / line-in on a phone | Reliability |
|---|---|---|---|
| Correct pitch class | yes | yes (with octave folding: bass octave errors are common, and `octaveFixed` already exists) | high |
| Exact octave / string | yes (some MIDI pickups send the string as the channel) | octave often, string **no** (only inferred from timbre, so not reliable) | mic: medium/low |
| Onset time | yes (MIDI latency 5–15 ms) | yes. Onset via energy flux is fast. **Pitch needs about 48 ms on low E and about 65 ms on low B**, so judge time on the onset, not the pitch frame | high |
| Evenness (IOI CV, velocity SD) | yes | yes (amplitude RMS in place of velocity) | high |
| Note length / release | yes (note-off) | yes, approximately: energy drop below a threshold after the onset. Sympathetic ringing of open strings blurs it | medium |
| Ghost note (dead note) | partial (low velocity or none) | yes: an onset with no stable pitch (`UNPITCHED`) and a short burst | medium-high |
| Slap vs. pop vs. finger | no (unless velocity curves) | transient sharpness + spectral centroid + string register. Can be classified at about 70–85% with calibration (estimate, untested) | medium |
| Palm mute | partial | `palmMuteScore` (decay + centroid) exists | medium |
| Finger alternation, raking, anchoring, fingering choice | no | no | **not measurable**: use stand-ins (below) |
| Intonation (fretless/upright) | n/a | cents from pitch track, averaged over the sustain | high on sustained notes |
| Dynamics (crescendo) | velocity slope | RMS slope (existing crescendo R²) | high |

**Stand-ins for what can't be seen:**
- *Alternation:* strict i-m alternation produces an **odd/even asymmetry** when one finger is weaker. Compute the mean IOI and RMS for odd vs. even notes. |odd−even| ≤ 6 ms and ≤ 2 dB counts as "even fingers". This rewards the *outcome* of good alternation.
- *Raking / string-crossing economy:* use **tempo-forced** string-crossing patterns. At target tempo, an inefficient right hand shows up as timing spikes on crossings. Report a "crossing penalty" = mean |offset| on crossing notes − on same-string notes.
- *Fingering (OFPF/Simandl):* show the fingering and ask for a **self-check** (the `selfChecks()` mechanism exists). Position-shift drills measure shift **gap** (silence before the shifted note, like `changeGapMs`).
- *Muting of idle strings:* after each note's planned end, check for **energy at the previous pitch or at open-string pitches** (E1/A1/D2/G2) during rests. Rests that ring count as a "ring-through".

**Default pass rule ("clean" in the existing ladder) unless a level overrides it:**
pitch accuracy ≥ 95 %, no missing notes, |timingMean| ≤ 15 ms, timingSD ≤ 20 ms (MIDI) / ≤ 28 ms (mic), IOI CV ≤ 0.06.
"Almost" means within 1.5× of each threshold. **Level passed = 3 clean takes at the target tempo** (the ladder already
promotes after 3 clean). Keys: "all 12" means the scheduler rotates keys and the level needs clean takes in at least 6
different keys, spread across string sets.

---

## 5. Proposed leveled curriculum (electric bass)

14 technique families (120 levels) plus the ear family F15 (8 levels). Family ids are suggestions (`b-…`), each a `GuitarFamilyDef` with `instruments: ['bass']`
(or a new `BassFamilyDef`). Tempo = quarter-note BPM, start → target. Sub = subdivision. "Mic" and "MIDI" columns
appear only where they differ.

### F1 `b-pluck`: Plucking hand (fingerstyle) — 9 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Steady alternating rest strokes | Open E, A, D, G, 8 notes each, then a cycle | open strings | 60→100 | 8ths | onset timing, IOI CV, RMS SD | default + RMS SD ≤ 3 dB |
| 2 | Even fingers | Same, with odd/even analysis shown | open | 70→110 | 8ths | odd/even IOI and RMS asymmetry | asym ≤ 8 ms and ≤ 2.5 dB |
| 3 | Adjacent string crossing | E-A-D-G up and down, 1 note per string, then 2 per string | open | 70→120 | 8ths | crossing penalty | crossing penalty ≤ 8 ms |
| 4 | String skipping | E↔D, A↔G octave-shape crossings | open + fretted roots | 60→100 | 8ths | crossing penalty, ringing of skipped string | penalty ≤ 10 ms, no ring-through |
| 5 | 16th stamina | One note per bar in 16ths for 8 bars, then one per chord through I-vi-IV-V | 4 keys | 60→100 | 16ths | IOI CV drift across the take (first 2 bars vs. last 2) | CV ≤ 0.07, drift ≤ 15 % |
| 6 | Accents and dynamics in 16ths | 16ths with accent on 1, then on "e", "and", "a"; crescendo over 2 bars (Trinity Gr 4 style) | any | 60→90 | 16ths | RMS on accented vs. unaccented; crescendo slope R² | accent +4 dB on target, R² ≥ 0.6 |
| 7 | Raking / economical descents | Descending arpeggios across strings | 6 keys | 80→140 | 8ths | crossing penalty (descending only) | penalty ≤ 8 ms at target |
| 8 | Three-finger / gallop | Gallop figure (8th + two 16ths) on one note, then following roots | E, A, D minor | 80→140 | gallop | IOI pattern match (ratio 2:1:1 ± 10 %) | default timing + ratio |
| 9 | Plucking-zone tone control | Same line near the neck, then near the bridge (dynamics + timbre) | any | 80 | 8ths | spectral centroid shift between halves | centroid difference ≥ threshold (calibrated per instrument) |

### F2 `b-fret`: Fretting hand — 8 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | OFPF in 1st position | Chromatic 1-2-3-4 per string, up and back (existing `spider` opt 0) | frets 1–4 → 5–8 | 60→100 | 8ths | pitch + timing | default |
| 2 | Permutations | 1-3-2-4, 1-4-3-2 etc. (existing options) | positions V–I | 60→100 | 8ths | default | default |
| 3 | Simandl 1-2-4 in low positions | Whole-step shapes on E/A in ½–II positions, fingering shown | F, G, B♭ | 60→90 | 8ths | default + self-check "used 1-2-4" | default |
| 4 | Shifts on one string | Scale/arpeggio on one string, shifting on a guide finger | 6 keys | 50→90 | 8ths | **shift gap** (silence before shifted note) + pitch | gap ≤ 40 ms, no glide unless marked |
| 5 | Position changes across strings | 2-octave major scale with 1–2 shifts | all 12 | 60→100 | 8ths | shift gap, timing | default + gap ≤ 40 ms |
| 6 | Pivoting/stretches | 5-fret patterns (low register), then the same in high register without shifting | 4 keys | 60→90 | 8ths | default | default |
| 7 | Octaves and 10ths | Octave shapes moving chromatically (disco), 10ths as broken pairs | all 12 | 80→120 | 8ths | pitch (octave-aware), timing | default |
| 8 | Upper-register fluency | Lines above fret 12 (RSL Gr 6 jazz "upper register") | 6 keys | 60→100 | 8ths | pitch with exact octave (mic: octave confidence) | default |

### F3 `b-length`: Muting and note length — 7 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Real rests | Root quarters with quarter rests (play-rest pattern), open then fretted | any | 70→110 | quarters | energy during rests (ring-through) | ≤ 1 ring-through per 8 bars |
| 2 | Staccato vs. legato | Same line twice: full value, then short (≤ 50 % of value) | 4 keys | 80→110 | 8ths | note length ratio (release time / note value) | legato ≥ 85 %, staccato ≤ 55 % |
| 3 | Idle-string muting | Notes on G and D while the E and A must stay silent (alternating loud open-string traps) | any | 80→120 | 8ths | open-string energy (E1/A1) | no sympathetic ring above threshold |
| 4 | Release on the "and" | Notes held exactly to the "and" (Motown/pop feel) | 6 keys | 80→110 | 8ths | release time vs. target | release within ±40 ms of target |
| 5 | Muted string-crossing octaves | Disco octaves where the lower note must stop when the upper sounds | all 12 | 90→120 | 8ths | overlap of consecutive pitches | overlap ≤ 30 ms |
| 6 | Palm-mute / thumb | Thumb plus palm-mute line (reggae, Motown vintage) | 4 keys | 70→100 | 8ths | `palmMuteScore` | `palmMuteShare` ≥ 80 % |
| 7 | Note length in a groove | 2-bar groove with mixed lengths written in (dots, tenuto, staccato) | 6 keys | 80→110 | 16ths | per-note length class match | ≥ 85 % of lengths in the right class |

### F4 `b-time`: Time and subdivision ladder — 10 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Quarter-note pulse with click | Root quarters | any | 60→120 | quarters | timing mean/SD | default |
| 2 | 8ths and 8th triplets | Bar of 8ths ↔ bar of triplets | any | 60→100 | 8/trip | per-subdivision offset (groove model) | each sub \|mean\| ≤ 15 ms |
| 3 | 16ths and switching | 1 bar each: quarters → 8ths → triplets → 16ths | any | 60→90 | mixed | per-sub stats | default per sub |
| 4 | Click on 2 & 4 | Root 8ths with click only on 2 & 4 | any | 70→120 | 8ths | timing vs. implied grid | SD ≤ 22 ms |
| 5 | Click on the "and" | Click on off-beats only | any | 70→110 | 8ths | same | same |
| 6 | One click per bar | Click on 1 only | any | 70→110 | 8ths | drift per bar | drift ≤ 20 ms per bar |
| 7 | Drop-out click | Existing fading-click plan (`fadePlan`) with bass onsets in place of taps | any | 70→120 | 8ths | `heldSilent` | held through round 4 |
| 8 | Syncopation and anticipations | Pushed 8th into the next bar, tie across beats (pop/Latin) | 6 keys | 70→110 | 8ths | timing on syncopated notes | default |
| 9 | 16th syncopation | 16th-note displaced rhythms (funk); reading off a rhythm card | any | 60→95 | 16ths | per-position (e/and/a) bias | each position \|mean\| ≤ 15 ms |
| 10 | Odd meters | 5/4, 7/8 (2+2+3), 7/4 grooves on roots | 4 keys | 70→120 | 8ths | timing + bar accent | default + accent on 1 |

### F5 `b-pocket`: Lock with the drums and feel — 8 levels

Drum source: `GROOVES` (kick lane `k`). The bass line is generated from the kick pattern.

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Play the kick | Root on every kick hit, rest elsewhere (rock grooves) | any | 70→110 | 8ths | **kick-lock score**: % of kick hits with a bass onset within ±25 ms; bass onsets with no kick hit | ≥ 90 % lock, ≤ 1 stray note per bar |
| 2 | Kick + chord changes | Same, roots follow a 4-chord chart | 6 keys | 80→120 | 8ths | lock + pitch | lock ≥ 90 % + default |
| 3 | Swing/shuffle feel | Triplet shuffle on roots with shuffle groove | any | 80→140 | swung 8ths | swing ratio (existing) | ratio within ±0.15 of 2:1 |
| 4 | 16th funk lock | Kick-following 16th lines with rests (funk grooves) | 4 keys | 80→105 | 16ths | lock (±20 ms) | ≥ 90 % |
| 5 | Swung 16ths | Neo-soul / hip-hop grooves | any | 75→95 | swung 16ths | 16th swing ratio | ratio within target ± 0.1 |
| 6 | Pocket on purpose: centre / behind / ahead | Same groove 3×: on, then 15 ms behind, then 10 ms ahead | any | 80→100 | 8ths | existing pocket score vs. chosen offset | ≥ 70 % of onsets within ±12 ms of target offset |
| 7 | Half-time and feel changes | 8 bars normal, 8 bars half-time (Trinity Gr 7 "feel changes") | 4 keys | 80→120 | mixed | timing per section | default in both sections |
| 8 | Following a drummer's fills | Groove with a fill every 4 bars, land on 1 after the fill | any | 80→120 | 8ths | timing on the downbeat after each fill | \|offset\| ≤ 15 ms on all landing beats |

### F6 `b-ghost`: Ghost notes and 16th fingerstyle funk — 6 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Make a dead note | Alternating pitched/ghost 8ths on one string | any | 70→100 | 8ths | ghost = onset with no pitch; pitched = correct note | ≥ 90 % classified right |
| 2 | Ghosts in 16ths | Root on 1 and 3, ghosts filling 16ths | 4 keys | 60→95 | 16ths | ghost/pitched pattern + timing | ≥ 90 % + default timing |
| 3 | Ghost before the octave | Root, ghost, octave figures (funk/disco) | 6 keys | 70→105 | 16ths | same | same |
| 4 | Dynamics: ghosts quieter | Ghost RMS vs. pitched RMS | any | 70→100 | 16ths | RMS difference | ghosts ≥ 8 dB quieter |
| 5 | Two-bar funk lines | Generated lines with ghosts, rests, octave and ♭7 | all 12 | 70→100 | 16ths | lock + classification | lock ≥ 88 % + ≥ 90 % class |
| 6 | Stylistic study (RSL Gr 6–8 equivalent) | 8-bar line with ghosts, slides, hammer-ons | 4 keys | 80→105 | 16ths | all of the above | all of the above |

### F7 `b-chord`: Roots, fifths and chord tones over progressions — 10 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Roots of a chart | Root 8ths on a 4-chord chart (chart shown as chords, no notes) | 6 keys | 70→120 | 8ths | pitch class on each beat | default |
| 2 | Root–5th | R-5 per chord (5th above, then 5th below) | all 12 | 70→120 | quarters | chord-tone check per beat | ≥ 95 % right tones |
| 3 | Root–5th–octave | R-5-8-5 figures (existing `r58`) | all 12 | 70→120 | 8ths | same | same |
| 4 | Triad arpeggios in position | Major/minor triads up/down, 1 octave | all 12 | 70→120 | 8ths | default | default |
| 5 | Triad inversions | 1st and 2nd inversion starting notes | all 12 | 60→100 | 8ths | default | default |
| 6 | 7th arpeggios | maj7, m7, 7, m7♭5, dim7 (RSL Gr 5–6) | all 12 | 60→110 | 8ths | default | default |
| 7 | 2-octave arpeggios | With shifts | 6 keys | 60→100 | 8ths | default + shift gap | default |
| 8 | Chord tones through a progression | **Free choice**: any chord tone on each beat over I-vi-ii-V | all 12 | 70→110 | quarters | rule check: beat 1 = chord tone (root or 3rd preferred), other beats = chord tones | ≥ 95 % rule-valid |
| 9 | Closest chord tone (voice-leading line) | Move to the nearest chord tone at each change | all 12 | 70→110 | quarters | rule check + interval size at changes | ≥ 90 % moves ≤ 4 semitones |
| 10 | Slash chords and pedals | Bass note ≠ root (C/E, G/B…), pedal under changing chords | 6 keys | 70→110 | 8ths | pitch on the slash bass | default |

### F8 `b-scale`: Scales and modes on the neck — 9 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Major and minor pentatonic, 1 position | (existing `penta`) | 6 → all 12 | 70→110 | 8ths | default | default |
| 2 | Major scale in position | OFPF (existing `major`) | all 12 | 70→110 | 8ths | default | default |
| 3 | Natural minor, blues | | all 12 | 70→110 | 8ths | default | default |
| 4 | Dorian, Mixolydian (2 positions) | (RSL Gr 6) | all 12 | 80→110 | 8ths | default | default |
| 5 | 5 pentatonic positions linked | Ascend in one, shift, continue | 4 keys | 70→100 | 8ths | default + shift gap | default |
| 6 | Scales in 3rds and 4ths | Sequences (diatonic intervals) | all 12 | 60→100 | 8ths | default | default |
| 7 | Harmonic and melodic minor | | all 12 | 60→100 | 8ths | default | default |
| 8 | Lydian, Phrygian | (RSL Gr 7) | all 12 | 70→100 | 8ths | default | default |
| 9 | Symmetric and altered | Whole-tone, half-whole diminished, altered (RSL Gr 8) | all 12 | 70→100 | 8ths | default | default |

### F9 `b-walk`: Walking bass, step by step — 12 levels (our strongest differentiator)

Chart source: our 36 standards plus generated blues/rhythm changes. Reference line: `walkingBass()` in `band.ts`.

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Two-feel roots | Half notes, root on 1, 5th on 3 (blues) | F, B♭ | 80→140 | halves | chord-tone rules | ≥ 95 % valid + default timing |
| 2 | Quarter-note roots and 5ths | R-R-5-5 / R-5-R-5 per bar | blues, 6 keys | 80→140 | quarters | rules + timing | default |
| 3 | Arpeggio walk | R-3-5-3 / R-3-5-6 per chord | blues, all 12 | 90→150 | quarters | rules | default |
| 4 | **Chromatic approach on beat 4** | Chord tones on 1–3, a half step above/below the next root on 4 | ii-V-I, all 12 | 90→150 | quarters | rule: beat 4 is ±1 semitone from the next downbeat | ≥ 90 % approaches valid |
| 5 | Dominant approach | Beat 4 is the 5th of the next chord | all 12 | 90→150 | quarters | same | same |
| 6 | Scale-step approach | Beat 4 is a scale tone a step from the target | all 12 | 90→150 | quarters | same | same |
| 7 | Free walking with mixed approaches | Chart only; user invents the line | blues in F/B♭, all 12 | 100→160 | quarters | rule report: beat-1 chord-tone %, approach %, repeated-note %, range, leaps | beat-1 CT ≥ 90 %, repeats ≤ 5 %, default timing |
| 8 | Ghosted skips and triplet drops | Add a triplet skip before 2 or 4 (like `walkingBass` ghost skips) | blues | 100→160 | quarters + trip | detect triplet onsets in the right place | timing default on the skips |
| 9 | ii-V-I through all keys | Cycle of 4ths, long ii-V chains | all 12 | 100→180 | quarters | rules | default |
| 10 | Rhythm changes / fast changes (2 chords per bar) | Two beats per chord | B♭ | 100→200 | quarters | rules | default |
| 11 | Standards: one chorus | Any of the 36 standards, 1 chorus with band | chart key | 100→180 | quarters | rules + kick/ride lock (swing) | rule pass + timing SD ≤ 25 ms |
| 12 | Up-tempo and 2-feel/4-feel switching | Head in 2, solos in 4 (RSL Gr 8 jazz study: "up tempo fingerstyle and walking") | chart key | 160→240 | halves/quarters | per-section timing, rules | default |

Rule engine (new, pure, small): for each beat, label the note R/3/5/7/tension/approach(chromatic|dominant|scale)/other
relative to the current and next chord. Score it, and point to the worst bar with a one-line "Why?" (per the compact
feedback rule).

### F10 `b-slap`: Slap and pop — 8 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure (mic) | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Thumb on open E/A | Thumb quarters → 8ths | open | 60→100 | 8ths | onset timing + transient class "slap" | default timing, ≥ 85 % class |
| 2 | Octave slap-pop | Thumb root, pop octave (existing `slap`) | all 12 | 60→100 | 8ths | pitch (octave-aware) + class slap/pop | default + ≥ 80 % class |
| 3 | Fretting-hand ghost slap | Thumb – left-hand mute hit – pop | any | 60→95 | 16ths | ghost onsets between | ≥ 85 % pattern |
| 4 | Hammer after slap | Slap + hammer-on (legato ratio) | 6 keys | 60→95 | 16ths | `legatoRatio` + pitch | default |
| 5 | 16th slap grooves | Generated 2-bar lines | 6 keys | 70→100 | 16ths | lock with kick + class | lock ≥ 88 % |
| 6 | Slap with string crossing | (RSL Gr 7 funk) | 6 keys | 70→100 | 16ths | same | same |
| 7 | Double-thumbing | Down/up thumb (Wooten-style) on one string | any | 60→100 | 16ths | IOI evenness (up and down strokes) | CV ≤ 0.08 |
| 8 | Open-hammer-pluck / triplet combos | Triplet slap/hammer/pop figures | any | 60→100 | 16th trip | timing | default |

> Mic caveat: slap/pop classification is **experimental**. Until it's validated, F10 passes on timing + pitch + ghost
> pattern, and the slap/pop class is shown as advice only.

### F11 `b-legato`: Slides, hammer-ons, pull-offs, harmonics, vibrato — 7 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Slides into notes | Slide from 2 frets below into the root on 1 (Motown/funk) | 6 keys | 70→110 | 8ths | glide detection (existing `glides`) | ≥ 90 % slides detected, target in tune |
| 2 | Hammer-on / pull-off pairs | | 6 keys | 60→100 | 8ths | `legatoRatio` | ratio ≥ threshold |
| 3 | Legato lines | Rock legato (RSL Gr 6–7) | 4 keys | 70→110 | 16ths | legato + timing | default |
| 4 | Sliding octave double-stops | (Trinity Gr 7) | 6 keys | 70→100 | 8ths | two pitches, glide | ≥ 85 % both pitches |
| 5 | Natural harmonics 12/7/5 | Harmonic "chords"/melodies (RSL Gr 7–8 jazz) | n/a | 60→90 | quarters | pitch of harmonic (high partials) | default |
| 6 | Vibrato on long notes | | 4 keys | 60 | halves | `analyzeVibrato` | rate/width in band |
| 7 | Pedal tones | Alternating pedal + moving line (RSL Gr 7 rock) | 4 keys | 80→120 | 16ths | pitch alternation + timing | default |

### F12 `b-pick`: Pick technique — 5 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Down-stroke 8ths | Root 8ths, all down (rock) | any | 80→150 | 8ths | timing, RMS SD | default |
| 2 | Alternate picking 16ths | One note, then roots | any | 70→120 | 16ths | odd/even asymmetry (down/up) | asym ≤ 8 ms |
| 3 | Picked string crossing | Scale/arpeggio picks | 6 keys | 70→120 | 8ths | crossing penalty | ≤ 10 ms |
| 4 | Palm-muted pick chug | | any | 80→140 | 8ths | `palmMuteScore` | ≥ 80 % muted |
| 5 | Fast picking / gallop (Trinity Gr 7, metal) | Gallops with pick, drop-D option | E/D | 100→170 | gallop | ratio + timing | default |

### F13 `b-read`: Reading and charts — 9 levels

| L | Goal | Drill | Keys | Tempo | Sub | Measure | Pass |
|---|---|---|---|---|---|---|---|
| 1 | Bass clef: open strings and 1st position | Name/play shown note (untimed, then timed) | C, G, F | untimed→60 | quarters | pitch + response time | ≥ 95 % in ≤ 2 s each |
| 2 | Rhythm reading on one string | 4-bar rhythms (RSL Debut model) | E string | 60→90 | quarters/8ths | timing | default |
| 3 | 4-bar melodies | Half/quarter/8th, rests (RSL Gr 1–3 model) | C, G, F, A min | 60→90 | 8ths | default | default |
| 4 | Key signatures to 3♯/3♭ | 8-bar lines | 7 keys | 70→90 | 8ths | default | default |
| 5 | TAB ↔ notation transfer | Read notation and play in a given position | any | 70→90 | 8ths | pitch (with octave) | default |
| 6 | Chord-symbol charts | Read a chart (slashes, repeats, 1st/2nd endings, D.S.), play roots/R-5 | any | 80→110 | 8ths | pitch on each bar | default |
| 7 | Nashville numbers | Chart in numbers, key announced (switches key on repeat) | all 12 | 80→110 | quarters | pitch | default |
| 8 | Written groove + improvised continuation | 2 bars written, 6 bars improvised from chords (RSL Gr 4–5 "I&I") | 6 keys | 80→100 | 8ths | written part: default; free part: chord-tone rules | both pass |
| 9 | 16th funk reading | Syncopated 16ths with ghosts and rests (Appleman-style reading studies, our own material) | 4 keys | 70→95 | 16ths | default | default |

### F14 `b-styles`: Style vocabulary — 12 levels

Each level generates **original** 2- or 4-bar lines from style rules (like the existing `groove` options) over a matching
`GROOVES` drum pattern. It measures kick lock + pitch + note length, and passes on the F5 lock rule plus the default.

| L | Style | Generated device | Tempo | Groove style |
|---|---|---|---|---|
| 1 | Rock | Root 8ths following the kick, octave pumps | 90→140 | rock |
| 2 | Pop ballad | Whole/half notes, slash-chord bass, anticipations | 65→85 | ballad |
| 3 | Motown | R-5-6-8 + chromatic approach (existing), syncopated pickups | 90→125 | funk/pop |
| 4 | Blues shuffle | Boogie shapes R-3-5-6-♭7 in triplet feel | 80→140 | blues |
| 5 | Disco | Octaves with ghost between | 110→125 | electronic |
| 6 | Reggae one-drop | Space on 1, short low notes, thumb mute | 70→90 | world |
| 7 | Bossa nova | R-5 dotted figure | 120→150 | latin |
| 8 | Samba | Surdo-based R-5 with pickups | 90→110 (half-time feel) | latin |
| 9 | Tumbao / son | Anticipated bass (existing tumbao), clave direction | 90→120 | latin |
| 10 | Funk | 16ths with ghosts (from F6) | 90→110 | funk |
| 11 | Gospel / neo-soul | Chromatic runs into changes, swung 16ths | 70→90 | hiphop |
| 12 | Metal / odd meter | Gallops, drop-D, 7/8 riffs | 120→180 | odd |
| (opt) | Middle Eastern | Hijaz ostinato over 10/8 or 6/8 (world bank) | 90→120 | world |

### F15 `b-ear`: Bass ear — 8 levels (non-instrument or play-back)

| L | Goal | Drill | Measure | Pass |
|---|---|---|---|---|
| 1 | Higher/lower in the bass register | Two low notes (RSL Debut) | answer | ≥ 90 % |
| 2 | Find the tonic on your bass | Band plays 4 bars, user plays the key note | pitch class, time to find | correct ≤ 8 s |
| 3 | Root-finder | Band plays I-IV-V; user plays the roots in time on the repeat (RSL Gr 4) | pitch per bar, timing | ≥ 90 % |
| 4 | Root-finder with vi, ii, iii, V7 (RSL Gr 5–6) | | same | same |
| 5 | Rhythm recall on E string | 2-bar rhythm with drums, echo it (RSL Debut–Gr 3) | timing pattern | default |
| 6 | Melodic recall | 2-bar pentatonic line from root, echo it (RSL Gr 3–6, Trinity Playback) | pitch + timing | ≥ 90 % pitches |
| 7 | Bass-line transcription (short) | 2 bars of a `walkingBass()` or style line, user plays it back, then writes it on staff/TAB | pitch per beat | ≥ 85 % |
| 8 | Inversions and slash bass by ear | Hear progression, say/play the bass note (not the root) | answer | ≥ 85 % |

That is 14 instrument families (F1–F14, with F15 as the ear family that lives inside the bass course). With F15
included: 128 levels.

### 5.1 Upright / double bass track (secondary) — 6 families

Requires `tuning: 'bass'` with `fretted: false` (or a new `upright` instrument), intonation in cents, and a bow/pizz flag.

| Family | Levels (short) | Measure | Pass |
|---|---|---|---|
| `db-pos` Simandl positions | ½ → I → II → III → IV (through octave harmonic) → thumb-position intro (Eastman-style order), fingering 1-2-4 shown | **intonation**: mean \|cents\| on sustained notes, + shift gap | mean \|cents\| ≤ 12 (early) → ≤ 8 (late) |
| `db-arco` Bowing | Open-string long tones (sound production) → separate bows → slurs → hooked bowing → string crossing slurs → scales in rhythms | RMS steadiness over a long tone (CV of envelope), onset softness | envelope CV ≤ 0.12 |
| `db-scales` ABRSM-model scales/arpeggios | 1-octave → 2-octave → 3-octave G/E/F, arpeggios, dom7/dim7, broken/running 3rds; speed guide ♩≈40 → ♩≈76 | intonation + timing | intonation band + default timing |
| `db-pizz` Jazz pizz sound | Long, even quarter notes (sustain to the next note), with the ride cymbal | note length ≥ 85 % of value, RMS SD | default + length |
| `db-walk` | Reuse F9 with upright tempo/range limits (Rufus Reid's *Evolving Bassist* stresses sound, positions and walking) | F9 rules + intonation | F9 + cents band |
| `db-read` | Bass clef by position (ABRSM: 1st → half/1st → half, 1st, 3rd), tenor/treble clef late | F13 measures | F13 rule |

Mic note: upright is acoustic, so a phone mic works better than for a passive electric bass played unplugged. Intonation
in cents is reliable on notes ≥ 250 ms.

---

## 6. Placement: a 2½-minute bass probe

Pattern: like `GUITAR_PROBES`, adaptive, stops a task early on clear success or failure. Each task seeds one or more families
with a level and a tempo.

| # | ~Time | Task | Seeds |
|---|---|---|---|
| 0 | 15 s | Tuner check + "play your lowest open string" (detects 4 vs. 5 strings: E1 or B0) | tuning, mic level |
| 1 | 25 s | Rock groove at 90: play the root on every kick for 4 bars on a G–C–D chart (roots shown) | F4 L1–3, F5 L1–2, F7 L1 |
| 2 | 25 s | G major scale (or A minor pentatonic for beginners), one octave, 8ths, ladder 80 → 100 → 120 as long as clean | F2, F8 tempo seed |
| 3 | 20 s | 16ths on one note for 2 bars at 80, then at 100 | F1 L5–6 (evenness + asymmetry) |
| 4 | 30 s | Walk: 4 bars of Dm7–G7–Cmaj7 at 100, chart only. Fallback if silent or < 50 % valid: R-5 on the same chart | F7 L8, F9 level by rule report |
| 5 | 25 s | Ear: band plays 4 bars of I–vi–IV–V; user plays the roots on the repeat | F15 L3–4 |
| 6 | 15 s (optional, opt-in) | "Do you slap?" One bar of octave slap at 80 | F10 |

Decision rules:
- Task 1 lock ≥ 90 % → F5 starts at L3; < 60 % → F4 L1 and F5 L1.
- Task 2: the highest clean tempo becomes the scale seed. Fails at 80 → F2 L1.
- Task 4 rule report: beat-1 chord-tone ≥ 90 % plus some approaches → F9 L7; chord tones but no approaches → F9 L4; only roots → F9 L2.
- Self-report questions are allowed only for things the mic can't see ("Do you use alternating fingers? Pick?").
- Results show as **rank + bar to the next rank** (promotion model), never "full".

---

## 7. Special features for bassists (ranked by value)

| Rank | Feature | What it does | Builds on | Effort |
|---|---|---|---|---|
| 1 | **Lock with the kick** | Play along with any `GROOVES` pattern. Score = % of kick hits matched within ±20–25 ms, plus stray notes. Shows a kick/bass timeline after the take | `GROOVES` kick lane, `grooveHits`, onset detection, groove model | **S–M** |
| 2 | **Walking-bass coach over the 36 standards** | User walks a chorus with our band (drums + comping). Per-beat labels (R/3/5/7/approach/other), beat-1 chord-tone %, approach quality, repeats/range. Can play the `walkingBass()` reference line as a model | `band.ts`, `standards.ts`, `leadsheet.ts`, `comping()` | **M** |
| 3 | **Root-finder and bass-line ear games** | Band engine plays a progression or line, user plays it back on the bass or answers on screen. Endless content, no copyright issues | `walkingBass()`, style generators, existing ear-game UI | **S** |
| 4 | **Click on 2 & 4 / off-beat / once per bar / drop-out drummer** | Metronome modes plus a drummer that drops bars (fading plan) | `MetroSettings.accents`, `fadePlan`, `heldSilent` | **S** |
| 5 | **Groove fingerprint for bass** | Per-subdivision push/drag, pocket consistency, swing ratio, weekly drift, drawn from *bass* onsets instead of taps. "You rush the 'a' of 16ths by 18 ms" | `analysis/groove.ts` (`addPerformance`, `grooveFindings`) | **S** |
| 6 | **5-string / 6-string / drop-D / fretless support** | Tunings B-E-A-D-G (B0 = MIDI 23), E-A-D-G-C, B-E-A-D-G-C, drop-D (D1 = 26). Fretboard drawing for 4/5/6 strings. Fretless: no fret lines, intonation in cents | `TUNINGS`, `fretted:false`, `TabLine strings=` | **S–M** |
| 7 | **Note-length and muting analyzer** | Ring-through on rests, release accuracy, overlap of consecutive notes | `GFrame` energy, `palmMuteScore` | **M** |
| 8 | **Style groove generator** | 12 style rules → endless original lines matched to drum patterns (F14) | `genBass` 'groove' pattern, `GROOVES` | **M** |
| 9 | **Reading drills: bass clef ↔ neck, rhythm cards, Nashville charts** | F13 content | `NoteStaff clef='bass'`, `TabLine`, chart parser | **S–M** |
| 10 | **Bass TAB + standard notation toggle** | 4/5-string TAB under the staff in every bass drill | `TabLine` (has `strings` param), `GuitarTab` | **S** |
| 11 | **Fills trainer** | Play 3 bars of groove + 1 bar of your own fill, land on 1. Score the landing and that you returned to the groove | groove lock + timing on beat 1 | **S** |
| 12 | **Bass-line transcription from the band engine** | Hear 2–4 bars (isolated or in the mix), write it on staff/TAB, then play it | band engine, notation input (melody puzzle UI) | **M** |
| 13 | **Exam/bagrut mapping** | RSL/Trinity/ABRSM grade badges per family level, plus a bagrut recital prep checklist (transcription, blues, ballad, medium, fast, sight-read improv over changes) | path + `exam` course | **S** |
| 14 | **Slap detection** | Thumb/pop/finger transient classifier with per-user calibration | `GFrame` centroid + transient slope | **M–L** (research; validate before it gates a pass) |
| 15 | **Upright intonation trainer** | Long tones and scales with a cents meter, drone reference | `drone.ts`, pitch | **S–M** |
| 16 | **Tone/EQ settings guide** | Static per-style cards: plucking position, strings (flats vs. rounds), amp EQ starting points, compression basics | content only | **S** (low value) |
| 17 | **Duet streak: bass + drummer friend** | Social: two users, one drum and one bass, share a lock score | social plan | **L** (later) |

Every feature must feed path, map, XP, leagues, level test and workout (the "everything connects" checklist). For example,
the Lock-with-the-kick score becomes F5's pass rule and a workout item. Walking-coach choruses count as F9 L11 takes.

---

## 8. Competitors: what bassists get today, and the gap

| Product | Bass offer | Feedback | Pedagogy depth | Notes |
|---|---|---|---|---|
| **Yousician** | Bass path (added 2017), songs, notation views incl. TAB + standard | Mic: pitch + timing in real time | Beginner–intermediate. Launch copy stressed rhythm and genres. No walking/harmony coaching found | Gamified, weekly challenges, leaderboards |
| **Rocksmith+** (Ubisoft) | Bass lessons and arrangements | Cable or mic, note highway | Song-based; not every song has a bass arrangement (user report) | Game-first |
| **Fender Play** | Bass lessons (slap, hammer-ons, slides) | No performance scoring (video lessons) | Beginner | Pre-recorded instructors |
| **BassBuzz** (*Beginner to Badass*) | 107 lessons, 86 songs, about 30 h: technique → rhythm/reading → scales → bass-line building, Nashville numbers, walking → slap, ear/transcription, jamming | None | Excellent beginner; users ask for an intermediate follow-up | Video course |
| **Scott's Bass Lessons** | Players Path, 9 levels, self-assessment placement, pathways (sight reading, walking, blues, soul/R&B, funk), 100+ courses | Self/community, final assessments per level | Beginner → advanced | Subscription video |
| **TalkingBass** | 20+ courses: *Beginner Bass Guitar*, *Bassic Fundamentals*, *Groove Trainer* (120 grooves), reading, slap, walking, *Ultimate Music Theory* | None | Deep, very structured | One-off purchases |
| **StudyBass** | 162 free lessons: harmony (53), technique, reading, scales, blues, chord patterns, rhythm, meter | None | Strong theory and harmony | Text + audio, free |
| **Pickup Music** | Beginner / late-beginner / intermediate pathways + jazz, funk, blues, fretboard, "bass for guitarists" | Teacher feedback (community) | Good intermediate | Video |
| **Melodics** | Keys, pads, drums. **No bass guitar track found** | MIDI/mic | n/a | |
| **GuitarTuna / tuners** | Bass tuning, some games | Pitch | none | Tuner-first |
| **Simply Guitar** | Guitar-focused. No bass track found (not verified) | Mic | n/a | |

**Gap we can own:**
1. **Measured groove against a drummer** (kick lock, pocket on purpose, per-subdivision fingerprint). Nobody scores *where bass sits against the drums*. Yousician and Rocksmith score against a note chart only.
2. **Measured walking bass and chord-tone logic over real standards.** Video courses teach it but can't check it; game apps don't teach it.
3. **Bass ear training** (root-finder, bass-line transcription) made from a generative band. The video competitors leave this to the student.
4. **Exam alignment** (RSL/Trinity/ABRSM levels; Israeli bagrut recital) and **Hebrew**.
5. **One app for electric and upright** (intonation in cents, Simandl positions).

---

## 9. Israeli context

- **Bagrut, pop-rock recital (חוזר מפמ"ר, רסיטלים תשפ"ד):** 5 units only. Bass guitar is an allowed instrument. Requires at least 5 consecutive years on the instrument (or 6 with a combination) plus 3 years of theory. Programme: (1) a **transcription** from a required list (a bass list exists), memorised, played with the original recording, including an **improvised solo of at least 2 choruses**; (2) a blues with a solo; (3) a rock/pop ballad; (4) a medium-tempo piece; (5) a fast piece (one of 2–5 may be an original). Live band of 2–5 rhythm-section players, no playback. Graded on accuracy, sound true to the style, rhythmic precision, dynamics, **improvisation in every piece**, **ensemble interaction and leadership**, interpretation, **sight-reading improvisation over a progression (prima vista)**, and theory questions on intervals, scales, modes, key signatures, chord types and degrees including tensions (7, 9, 11, 13, 6).
  → Our mapping: F9 walking + F13 L8 (read and improvise) + F15 transcription + a blues-solo family borrowed from the improv rules + theory items from the exam course.
- **Music-academy credit track:** high-school "high achievers" can earn academic credits at partner institutions, Rimon among them (12 credits theory + 4 performance, per the Ministry page). I couldn't verify specific bass requirements.
- **Rimon School (Ramat HaSharon):** jazz and contemporary school with a Performance department headed by bassist Arie Volnitz. It hosted Victor Wooten and Steve Bailey. No public bass syllabus found. Its programme is Berklee-affiliated in style, so section 3 applies.
- (See also `docs/research/BAGRUT_AND_CONSERVATORY.md` for the wider bagrut picture.)

---

## 10. Implementation notes (for the spec stage, not done here)

1. Split `g-bass` into the `b-*` families. Keep `g-bass` levels as aliases so existing progress maps onto F2/F7/F8/F9/F10.
2. Add the tunings `bass5` [43,38,33,28,23], `bass6` [48,43,38,33,28,23], `bass-dropd` [43,38,33,26], and `fretless`/`upright` (same open strings, `fretted:false`). Bass pitch detection must allow ≥ 65 ms windows when B0 is in play, and judge timing on energy onsets.
3. New pure analyses: `kickLock()`, `noteLengths()`, `ringThrough()`, `oddEvenAsym()`, `crossingPenalty()`, `walkRules()`, `centsStats()`, and later `slapClass()`. Each one is pure and unit-tested, like the existing `guitarAnalyze.ts` functions.
4. Ladder: add an optional `targetOffsetMs` (pocket on purpose) and a "rule pass" verdict for free-choice drills (walking, chord tones, improvised continuation), where correctness isn't a fixed note list.
5. Keep every exercise on one phone screen: chart line + groove lane + result strip. TAB/staff toggle.

---

## 11. Sources

Exam boards and schools
- RSL (Rockschool) Bass Syllabus Specification 2018 (digital PDF, read in full for technical requirements): https://www.newschool.ie/wp-content/uploads/2019/09/RSL_Bass_Syllabus_Guide_2018_DIGITAL_31May2019.pdf
- RSL syllabus guide (AMEB mirror, 2023 amend): https://rockschool.ameb.edu.au/wp-content/uploads/2024/02/RSL_Bass_Syllabus_Guide_2018_20Feb2023.pdf
- RSL Bass Grade 8 product page: https://www.rslawards.com/products/bass-grade-8/
- Trinity Rock & Pop Bass grade pages: https://trinityrock.trinitycollege.com/instruments/bass/grade5 , https://trinityrock.trinitycollege.com/instruments/bass/grade6 , https://trinityrock.trinitycollege.com/instruments/bass/grade8 , https://sogtrinityrock.trinitycollege.co.uk/instruments/bass/grade7
- Trinity Rock & Pop Session Skills for Bass 6–8: https://www.boosey.com/shop/prod/Trinity-College-London-Rock-Pop-Session-Skills-for-Bass-Grades-6-8-CD/2152360
- ABRSM Bowed Strings (Double Bass) syllabus from 2024 (PDF copy, read for speeds and sight-reading parameters): https://caswells-strings.co.uk/wp-content/uploads/2025/07/ABRSM-Double-Bass-syllabus-from-2024.pdf
- Eastman Community Music School double bass curriculum: https://www.esm.rochester.edu/community/?p=658
- Berklee, Studying Bass / Bass Department: https://college.berklee.edu/bass , https://college.berklee.edu/node/2206648 , Private Instruction Bass: https://college.berklee.edu/node/2369991
- Berklee Online bass courses: https://online.berklee.edu/courses/interest/bass
- Berklee Press bass titles: https://berkleepress.com/music/bass/ ; Rich Appleman author page: https://berkleepress.com/berklee-authors/rich-appleman-2/
- Musicians Institute Bass Program: https://mi.edu/programs/music-artist/bass-program ; catalog: https://www.mi.edu/wp-content/catalog/MI-Catalog.pdf

Israel
- Ministry of Education, pop-rock performance recital circular (PDF, read in full): https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-playingpop.pdf
- Music bagrut overview: https://pop.education.gov.il/tchumey_daat/music/high-school/pedagogy-of-music/bagrut-music-high-school/
- Academic-credit track circular: https://meyda.education.gov.il/files/Pop/0files/academy-points/music-hozer.pdf
- Rimon (Wikipedia): https://en.wikipedia.org/wiki/Rimon_School_of_Jazz_and_Contemporary_Music ; Wooten/Bailey at Rimon: https://www.rimonschool.co.il/en/?p=22283

Online programmes
- BassBuzz Beginner to Badass lessons overview: https://www.bassbuzz.com/beginner-to-badass/lessons-overview ; course list FAQ: https://bassbuzz.helpscoutdocs.com/article/53-course-lesson-list
- Scott's Bass Lessons Players Path: https://playerspath.scottsbasslessons.com ; https://scottsbasslessons.com/
- TalkingBass courses: https://www.talkingbass.net/ ; Groove Trainer: https://www.talkingbass.net/courses/groove-trainer/ ; Simple Steps to Walking Bass: https://www.talkingbass.net/courses/simple-steps-to-walking-bass/
- StudyBass lesson index: https://www.studybass.com/lessons/
- Pickup Music bass pathways: https://www.pickupmusic.com/bass/bass-classes/beginner-learning-pathway , https://www.pickupmusic.com/bass/bass-classes/intermediate-learning-pathway , https://www.pickupmusic.com/bass/bass-classes/jazz-learning-pathway , https://www.pickupmusic.com/bass/bass-classes/learn-walking-bass-in-7-days
- Ariane Cap, *Music Theory for the Bass Player* (review): https://bassmusicianmagazine.com/2015/11/review-ariane-caps-music-theory-for-the-bass-player/

Method books and players
- Ed Friedland, *Building Walking Bass Lines* (review/contents): https://bassmusicianmagazine.com/2020/02/review-hal-leonards-building-walking-bass-lines-by-ed-friedland/amp/ ; https://bassbookreview.blogspot.com/2011/07/building-walking-bass-lines-by-ed.html
- Hal Leonard Electric Bass Method, Complete Edition (Friedland): https://www.halleonard.com/product/695073/hal-leonard-electric-bass-method-complete-edition
- Berklee Practice Method: Bass (Appleman/Repucci): https://www.sheetmusicplus.com/en/product/berklee-practice-method-bass-3809530.html
- Rufus Reid, *The Evolving Bassist*: https://rufusreid.com/book-dvd/the-evolving-bassist/ ; https://www.alfred.com/the-evolving-bassist-millennium-edition/p/46-SB11A/
- Simandl, *New Method for the Double Bass* (IMSLP): https://imslp.org/wiki/New_Method_for_the_Double_Bass_(Simandl,_Franz) ; https://en.wikipedia.org/wiki/Franz_Simandl
- Mark Morton, *Triangulation of Fingering Systems for Double Bass*: https://shop.doublebasshq.com/products/triangulation-of-fingering-systems-for-double-bass-vol-1
- Jaco Pastorius, *Modern Electric Bass* (Alfred): https://www.alfred.com/jaco-pastorius-modern-electric-bass/p/00-45260/ ; review: https://videolibrarian.com/reviews/instructional/jaco-pastorius-modern-electric-bass/
- Victor Wooten, ten elements (summary sources): https://psaudio.com/article/the-music-lesson/ ; https://experiencinggroove.blogspot.com/2008/11/elements-of-music-2-10.html
- *Standing in the Shadows of Motown* / Jamerson technique: https://guitarworld.com/features/the-sound-and-style-of-motown-master-james-jamerson ; https://api.reverb.com/news/james-jamerson-a-matter-of-recognition
- Carol Kaye on pick and flatwounds: https://guitarworld.com/news/bass-legend-carol-kaye-about-98-of-bass-parts-cut-in-hollywood-in-the-60s-were-done-with-a-pick-on-flatwound-strings ; https://reverb.com/news/spotlight-on-carol-kaye-bassist-and-music-educator
- Stuart Clayton, *Plectrum Technique for Bass Guitar*: https://www.notreble.com/?p=38616

Research (timing and pitch detection)
- Microtiming and groove (Frontiers 2017): https://www.frontiersin.org/articles/10.3389/fpsyg.2017.01709/text ; Frontiers 2015: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.01232/full ; PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC4542135
- Low-latency pitch detection for electric bass (DAFx14, Derrien): https://www.dafx14.fau.de/papers/dafx14_olivier_derrien_a_very_low_latency_pitch_.pdf ; bass pitch method (SBCM): https://sol.sbc.org.br/index.php/sbcm/article/download/10433/10300 ; YIN (JASA 2002): https://cagnazzo.wp.imt.fr/files/2013/05/2002_JASA_YIN.pdf

Competitors
- Yousician bass launch: https://prnewswire.com/news-releases/bass-guitar-piano-and-ukulele-added-to-worlds-largest-music-education-platform-576704171.html ; https://www.notreble.com/?p=43857
- Rocksmith+ bass lessons: https://www.rocksmith.com/bass-lessons
- Fender Play bass: https://www.musicradar.com/news/fender-wants-to-make-learning-bass-easier-than-ever-with-new-fender-play-lessons
- Melodics instruments: https://melodics.com/info/ai-info-page ; https://support.melodics.com/en/articles/9894344-melodics-for-iphone
- Rocksmith bass arrangement coverage (user report): https://forum.bassbuzz.com/t/rocksmith/35702

Caveats: Trinity pages were partly unreachable (server errors), so their content comes from search excerpts. The Rufus Reid,
Berklee Practice Method and Hal Leonard tables of contents were only partly visible. TalkingBass's Groove Trainer brochure
is an image PDF and could not be read. The slap-classification accuracy figure is an estimate to validate, not a measured number.

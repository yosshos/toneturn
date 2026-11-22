# Soul-jazz, gospel, funk-jazz and the organ: research for the "soul" style (2026-11-22)

*Research for SPEC-JAZZ-NEIGHBOURS §4 and the `soul` StyleId in SPEC-STYLE-FOCUS. No code was changed. Written to build exercises from: rhythms as 16th (or 12/8) grids, voicings as degrees in C, every pattern meant to be moved through all 12 keys.*

**Tags (the owner's "only verified theory" rule):**
- **[V]** = checked during this research against a source I actually read (cited inline; the list is in §12).
- **[C]** = common practice; a mainstream source is cited, but I read it only in part (search snippet), or I know it without having opened it in this session. Fine to teach; worth a spot-check before shipping.
- **[?]** = not verified. **Stays out of the app** until it is checked. Where I give a concrete pattern marked [?], it is a candidate written for checking, not content to ship.

**Legal:** rhythms, grooves, comping patterns and chord progressions are not protected (see `docs/research/MUSIC_SOURCES_LEGAL.md` §"Chord progressions alone" and `STANDARDS_LEGAL.md`, which cite *Structured Asset Sales v. Sheeran*, 2d Cir. 2024, and the Copyright Office *Compendium*). I did not re-check the law here. Every pattern below is written generically, from the conventions. No transcription of a recording is reproduced. Recordings are named only as listening references. Tunes: public domain (published 1930 or earlier) or chord changes only.

**Grid key:** in the 16-step grids, steps are `1 e & a 2 e & a 3 e & a 4 e & a`. `X` = accent, `x` = normal hit, `g` = ghost note, `o` = open hi-hat, `.` = rest. In the 12-step (12/8 or shuffle) grids, the four beats fall on steps 1, 4, 7, 10.

---

## 0. What exists in the app (inventory, read from the code 2026-11-22)

| Where | What exists | Relevance to "soul" |
|---|---|---|
| `src/engine/drills/bass.ts` `b-styles` (17 levels) | L3 Motown, L4 blues shuffle, L5 disco, L10 funk (two lines), **L11 gospel / neo-soul** (chromatic runs into the changes, swung 16ths), L14 gospel in the low register (5-string), L16 funk/slap study | Gospel and funk bass already exist; **no soul-jazz shuffle over the organ blues, no boogaloo** |
| `bass.ts` `b-ghost` (6) | dead notes, 16th ghosts, ghost before the octave, ghost dynamics, two-bar funk lines, an 8-bar study | Funk bass is covered at the technique level |
| `src/engine/drills/drums.ts` `d-funk` (8) | ghosts with 2 and 4, hat 8ths, syncopated kick, 16th hat, open-hat barks, **shuffle with ghosts**, boom-bap, go-go and second line | Funk covered; **no boogaloo, no gospel 12/8, no shout** |
| `drums.ts` `d-shuffle` (8) | triplets, shuffle, **slow blues 12/8**, double shuffle, swing-ratio dial, one-drop, steppers, **half-time shuffle** | The 12/8 feel exists on drums as "slow blues" |
| `src/engine/drills/drumTop.ts` `d-linear` (5) | linear 3s and 4s, with ghosts, with barks, 32nd fills, displaced at tempo | Linear funk is **already in the app**; nothing to add |
| `src/engine/grooves.ts` (groove bank) | `motown`, `disco`, `funk-1`, `funk-2`, `soul` (12-step), `purdie` (half-time shuffle), `shuffle`, `slow-blues` (12/8), `texas` | No `boogaloo`, `gospel-68`, `shout` |
| `src/engine/drills/colorDrills.ts` `k-organ` (7 rows, ORG_ROWS) | organ blues with LH half notes under a held pad; LH walking in quarters; a pad with a moving inner voice; **organ minor blues**; thin/full texture under a soloist; two organ ballads on the common-tone ladder. Source: Goldings research, `REHARM-AND-COLOR.md` C.10 | The soul-jazz organ trio base exists. **No gospel organ, no shuffle/boogaloo comping rhythm, no drawbar/Leslie/expression technique** |
| `src/engine/drills/generate.ts` `accomp` (16+) | Alberti, walking, stride (many), **boogie-woogie LH**, bossa/montuno, pop LH | Boogie LH feeds soul-jazz shuffle comping |
| `src/engine/drills/guitar.ts` `g-rhythm` | L3 blues shuffle, **L5 16th funk with muted ghosts (`funk16`, `DudUduDudUdUduDu` on 9 chords) and funk stabs**; `guitarCore2.ts` L9 neo-soul; `guitarTech.ts` L11 our funk 16ths riff | Funk rhythm guitar exists at a basic level. Chord types (`Q`) stop at `9`: **no 13, 7♯9, 9sus, partial (top-string) shapes** |
| `src/engine/voiceFamilies.ts` F6 (levels 1603–1611), `voiceTop.ts` `v-runs` (2221–2223) | 5- and 9-note runs at 60→120 %, pentatonic runs, blues runs, turns, melisma, a blues melisma at tempo | Runs/melisma pedagogy **exists**; gospel needs only call-and-response and style-specific run shapes |
| `src/engine/band.ts` | `BandStyle`: swing, bossa, ballad, waltz, pop, rock, **funk**, reggae, latin, **shuffle**, hold. Funk and shuffle are one-bar comping cells with close voicings | **No `souljazz`, `boogaloo`, `gospel68`, `funkjazz`** |
| `src/engine/topicsDrumStyle.ts` `drum-style` (ear, 4 levels) | name the style: rock, swing, bossa, reggae, **shuffle, funk**, samba, waltz, songo, **half-time shuffle**, Afro 6/8, 7/8, maqsum; look-alikes | **Drums course only**; no boogaloo, no gospel 12/8 |
| `src/engine/drills/colorDrills.ts` `k-reharm` (RH_ROWS) | **minor plagal (ivm6, ♭VI, ♭VII7 → I)**, borrowed iv under the held tonic, pedal point, half-step approach chords, sus reharm | Several gospel harmonic devices are already taught as reharm; reuse, don't duplicate |
| `src/audio/organ.ts` + `piano.ts` | a modelled tonewheel organ: 9 drawbars (0–8, 3 dB steps), wheel leakage, key click, 2nd/3rd percussion, a Leslie with slow/fast ramp. Registrations: `jazz` 888000000 + 3rd percussion, `gospel` 888800008, `ballad` 838000000, `rock` 888888888, `flute` 008000000 | See §10.1 for three accuracy gaps |
| `src/audio/layers.ts`, `piano.ts` | Wurlitzer (4 velocity layers), tine EP with suitcase tremolo, vibraphone (VCSL, soft/hard mallets) | §10.5 |
| `src/speech/midi.ts` | every Control Change is captured (controller, value, time); CC64 is already measured in the pedalling drills | CC11/CC7 expression can be measured without new plumbing (§10.4) |

**Bottom line:** funk technique (bass ghosts, drum ghosts, linear, guitar 16ths) is largely there. **The gaps are gospel harmony on keys, the soul-jazz/boogaloo groove (drums, bass, comping, band), gospel 12/8 as a band style, organ technique, guitar 9/13/partial shapes, and the style in the ear game outside the drums course.**

---

## 1. Gospel piano and keys

### 1.1 Plagal motion and "church" sounds

| Device | In C (degrees) | Tag and source |
|---|---|---|
| **Plagal cadence IV → I** ("Amen" cadence, from hymn endings) | F → C | **[V]** Wikipedia, *Plagal cadence* |
| **Repeated plagal motion through whole sections**, not only at phrase ends | I – IV – I – IV … | **[V]** Wikipedia, *Plagal cadence*: "Gospel and blues music often uses repeating plagal cadences throughout sections" |
| **Minor plagal IV → iv → I** (the ♭6 falls to 5 in an inner voice: A → A♭ → G) | F – Fm – C | **[V]** Wikipedia, *Plagal cadence*; already in the app as `k-reharm` `rh-mi` |
| **IV/I** (IV triad over the tonic bass, alternating with I: the "church" plagal colour over a held bass) | bass 1; RH 4–6–1 (F–A–C) ↔ RH 3–5–1 (E–G–C) | **[C]** gospel lesson sites (PlayPiano "Get On That Church" inversions; a gospel harmonic-devices handout on "I over IV or ii in the bass", both seen as search snippets). It is the plagal cadence voiced over a tonic pedal, which `rh-pedalpt` already teaches as pedal point |
| **IV/V** (= V9sus4, the gospel "sus" dominant) | bass 5; RH 4–6–1 (F–A–C over G) | **[V]** Pianote, *Gospel Piano 101* (F/G = "IV/5 sus" = G9sus4) |
| **Sus on dominants, then resolve** (any dominant, especially V7 and VI7) | G9sus → G7; A7sus → A7 | **[V]** PianoGroove, *Gospel Passing Chords & Substitutions*; PianoGroove, *Gospel Chord Progressions* |
| **Add the 7th and 9th to hymn triads** | C → Cmaj9 / C9 etc. | **[C]** Violet Recording, *Gospel chord progressions* (snippet); Wikipedia *Funk* says the same of funk |

### 1.2 Passing chords and walk-ups

| Device | Chords in C | Bass | Tag and source |
|---|---|---|---|
| **The classic 1–4 walk-up** | C – B♭/D – C/E – Fmaj7 | 1–2–3–4 | **[V]** Hear and Play, *Classic 1-4 walk-up* (same shapes read in F as 5–6–7–1) |
| **The 2–5 walk-up** | D – C/E – D/F♯ – G | 2–3–♯4–5 | **[V]** Hear and Play (same article) |
| **Chromatic dominant walk-up into IV** | E♭7 – E7 – F | ♭3–3–4 | **[V]** PianoGroove, *Gospel Passing Chords* (A♭7 – A7 – B♭ in F) |
| **1–6–2–5 with an altered VI7**, approached from VII7 | C – A7(♭9/♯9/♯5) – Dm7 – G7; B7 → A7 as a chromatic approach | | **[V]** PianoGroove, *Gospel Passing Chords* |
| **Tritone sub inside 1625** | A7sus – E♭7 – D7 (VI7sus – ♭VI7 – II7) | | **[V]** PianoGroove, *Gospel Passing Chords* and *Gospel Chord Progressions* |
| **♯iv°7 between IV and I/5** (stepwise bass to V) | C7 – C7/E – F – F♯°7 – C/G (or → G7) | 1–3–4–♯4–5 | **[V]** PianoGroove, *Gospel Passing Chords* |
| **3–6–2–5–1 with several dominants** | E7 – A7 – D7 – G7 – C (or Em7 – A7 – Dm7 – G7) | | **[V]** that the chain is used and that "3 of the 5 chords are voiced as dominants" (PianoGroove, *Gospel Chord Progressions*). **[?]** which three: the page shows it only in an image |
| **"2–5 before each chord"** (approach every target with its own ii–V) | e.g. to F: Gm7–C7–F | | **[C]** Piano With Jonny, contemporary gospel lesson (snippet); identical to the jazz "related ii–V" (Levine, *The Jazz Theory Book*) |
| **Chromatic walk-ups and walk-downs in LH octaves** (approach each bass note from two half steps away) | e.g. into F: E♭–E–F in octaves | | **[V]** Pianote, *Gospel Piano 101* |
| **Descending bass 1 – ♭7 – 6 – ♭6 – 5** (e.g. C – C/B♭ – F/A – Fm/A♭ – C/G) | | | **[?]** I did not find it in a source I read. It is the plagal IV–iv motion with a stepwise bass, and I believe it is common; check against a gospel method book (e.g. Hal Leonard *Gospel Piano*, Kurt Cowling) before use |

**Generic teaching material:** every [V] row above is taught across several independent lesson sites (Hear and Play, PianoGroove, Pianote, Piano With Jonny). These are idioms, not anyone's composition, so they are safe to drill.

### 1.3 Moving inner voices

| Device | In C | Tag |
|---|---|---|
| **Line cliché over a held chord**: an inner voice moves by half step while the rest holds | C – C+ – C6 – C7 (5–♯5–6–♭7), and in minor Cm – Cm(maj7) – Cm7 – Cm6 (1–7–♭7–6) | **[C]** standard jazz theory (Levine, *The Jazz Theory Book*, known of); the app already has `k-organ` "a pad with a moving inner voice" |
| **IV → iv inner voice** 6 → ♭6 → 5 | F (A) – Fm (A♭) – C (G) | **[V]** Wikipedia, *Plagal cadence* |
| **Sus → 3 resolutions** inside a held chord | G7sus4 (C) → G7 (B) | **[V]** PianoGroove (sus resolves to the 3rd) |
| **Chromatic grace notes into chord 3rds** (slide from a black key to the white target) | E♭ → E over C | **[V]** Pianote, *Gospel Piano 101* |

### 1.4 Shout / praise-break and the gospel 12/8

| Point | Tag and source |
|---|---|
| Shout music: **very fast tempo, chromatic basslines, organ/piano chords, snare hits and hand claps on the upbeat of each beat**; the organist mostly plays **dominant 7th chords** while improvising over riffs; the pianist plays counter-rhythms | **[V]** Wikipedia, *Shout (Black gospel music)* |
| Tempo about 150–190 BPM, swung, often felt as 12/8 while written in 4/4 | **[?]** one genre-directory site only |
| The LH bass run is the first thing to learn for uptempo shout; the shout uses the gospel-blues bass line faster | **[C]** Hear and Play, *How to play uptempo shouting music*; PianoGroove, *Holy Shout* (snippets) |
| Exact shout bass lines and chord loops | **[?]** they vary by denomination (PianoGroove says so). Do not ship a "standard shout progression" until a method book is checked |
| **Gospel drumming: play straight 16ths as swung (sextuplet) 16ths** | **[V]** Drumeo, *The Ultimate Guide to Soul and Funk Drumming* |
| **Gospel/slow blues in 12/8:** count 1-&-a 2-&-a 3-&-a 4-&-a; the LH can play a two-feel; RH triads repeat the triplet pulse | **[C]** PianoGroove, *12/8 Grooves*; Tim Richards, jazz accompaniment course, "Gospel groove" lesson (snippets) |

Shout clap/snare grid (12-step, swung 4/4), from the [V] description, **the upbeats only**: `..x..x..x..x`. Ride or hi-hat on all three triplet partials or the swung 8ths: **[C]**. Kick figures: **[?]**.

Gospel 12/8 groove candidate (12-step), **[C]** as a feel (it is the slow-blues 12/8 the app already has, `grooves.ts slow-blues`):

```
ride/hat  x x x x x x x x x x x x
snare     . . . X . . . . . X . .
kick      X . . . . . X . . . . .
piano LH  octave on 1 and 7, 5th or shell on 4 and 10
piano RH  triad on every step (light), accents on 1 4 7 10
```

### 1.5 Organ LH and bass pedals in gospel
See §10. Short version: **organists play bass on the lower manual with the LH, tapping the pedals with it, or on the pedals** **[V]** (Wikipedia *Hammond organ*: Jimmy Smith on pedals; Wijnen, *Hammond organ for the advanced jazz pianist*: "left hand bass and tapping on the pedals").

---

## 2. Soul-jazz (the organ-trio tradition)

### 2.1 What it is
- Jazz with strong hard-bop, blues, soul, gospel and R&B influence; most popular mid-to-late 1960s; often an organ trio (Hammond, guitar or sax, drums). Critic Roy Carr: "gospel-informed, down-home, call-and-response blues". The groove "usually begins with the bass player". "Repetitive, dance-like rhythms" (Gridley). **[V]** Wikipedia, *Soul jazz*.
- Players to name as listening (no transcription): Jimmy Smith, Jack McDuff, Shirley Scott, Grant Green, Stanley Turrentine, Horace Silver, Lou Donaldson **[V]** (Wikipedia *Soul jazz*; Premier Guitar).

### 2.2 Grooves

**Shuffle (12-step), drums:** exists (`grooves.ts shuffle`, `d-shuffle` L2). **[C]**.
```
hat/ride  x . x x . x x . x x . x
snare     . . . x . . . . . x . .
kick      x . . . . . x . . . . .
```

**Boogaloo (soul-jazz sense, 1960s):** what is verified **[V]** (Drumeo, *Ultimate Guide to Soul and Funk Drumming*):
- tempi of the examples: 117–133 BPM ("Alligator Bogaloo", Leo Morris / Idris Muhammad, 129 BPM);
- **ghost notes are "an essential element of most boogaloo drum grooves"**;
- **the kick follows the bass line, the snare follows the piano / percussion part**; snare ghosts and displacements on the "&" of 3 and 4;
- a simple version keeps the hi-hat in quarters with an opening.
- Wikipedia's *Boogaloo* covers only the **Latin** boogaloo (bugalú, 1960s New York: son montuno + R&B). The two must not be confused in the app's copy. **[V]**

The exact grid is **[?]**; I found no readable notated pattern. A candidate to check against a drum method (e.g. Zoro, *The Commandments of R&B Drumming*, or Tommy Igoe, *Groove Essentials*) before shipping:
```
[?] hat    x . x . x . x . x . x . x . x .
[?] snare  . . g . X . . g . g g . X . . g
[?] kick   X . . X . . X . . . X . . . . .
```

**Bass:** soul-jazz shuffle bass = walking quarters or the boogie figure R–3–5–6–♭7–6–5–3 under the blues **[C]** (the app's `accomp` L5 boogie-woogie LH is the same figure). Boogaloo bass: **[?]** (needs a source; Drumeo says only that the kick doubles it).

### 2.3 Comping
| Pattern | Tag and source |
|---|---|
| **Charleston** (beat 1 and the "&" of 2) as the basic comp, with **3–7 guide-tone** two-note voicings | **[V]** Premier Guitar, Shawn Purcell, *Style Guide: Soul Jazz* |
| **Drop-2 four-note voicings** for fuller comping behind an organist, with ♭9 / ♯9 / ♭13 on dominants | **[V]** Purcell (as above) |
| **Organ comping = a held pad or short stabs over a LH walking bass** | **[V]** for the LH bass (Wikipedia, Wijnen); pad/stab rhythms **[C]** (the app's `k-organ` already follows Goldings, `REHARM-AND-COLOR.md` A.1) |
| Organ comp rhythm in a shuffle: stabs on 2 and 4 (with the drummer's backbeat) or on the "let" of the triplet before 1 and 3 | **[?]** plausible, unverified |

### 2.4 Improvisation vocabulary
| Device | Tag and source |
|---|---|
| **Call and response** as the core of the style | **[V]** Wikipedia *Soul jazz* (Carr) |
| **Short repeated motifs** (3-note riffs, moved through positions), **organ-style double stops** (a held top note over a moving lower line), **Grant Green "turns"** (a repeated pattern with relaxed pull-offs), **Wes octaves with block-chord stabs** | **[V]** Purcell |
| 7th-chord arpeggios over the ii–V–I that the soul-jazz blues adds | **[V]** Purcell |
| **The blues scale and the minor pentatonic over the whole blues** | **[C]** Levine, *The Jazz Theory Book*; Wikipedia *Funk* (blues-scale melodies) |
| **Riff-based soloing**: one riff repeated as the chords change under it (IV against a riff built on I) | **[C]** standard blues pedagogy; app already has blues runs in voice and licks |

### 2.5 Forms
| Form | In Roman numerals | Tag |
|---|---|---|
| **12-bar blues with ii–V–I added in bars 4, 8, 10 and 12** | I7 – IV7 – I7 – (v7–I7) / IV7 – IV7 – I7 – (iii7–VI7) / ii7 – V7 – I7 – (ii7–V7) | **[V]** Purcell ("an added IIm7–V7–I7 progression in measures 4, 8, 10, and 12"); my bar-by-bar spelling of where the extra ii–V lands is **[C]** |
| **Minor blues** | i – iv – i – i / iv – iv – i – i / ♭VI7 – V7 – i – (V7) | **[C]**; exists in `k-organ` L4 |
| **I7–IV7 two-chord vamp** (often over a riff) | I7 – IV7 | **[C]** |
| Slow shuffles are central | **[V]** Purcell ("slower tempo shuffles") |

---

## 3. Funk-jazz

### 3.1 Principles
| Point | Tag and source |
|---|---|
| **The "one":** heavy emphasis on the first beat of each bar (James Brown, mid-1960s), against the usual backbeat | **[V]** Wikipedia *Funk* (cites Slutsky, *The Funkmasters*, 1997) |
| **16th-note syncopation**, often swung 16ths; slower tempi leave room for the 16th subdivision | **[V]** Wikipedia *Funk* |
| **Static one-chord or two-chord vamp**, e.g. a minor 7th and a related dominant 7th, with chromatic passing chords | **[V]** Wikipedia *Funk* (passage uncited there, so treat as **[C]** strength) |
| **Extended chords**: m11, dominant 9, 6/9; m7 preferred over the minor triad; guitarists favour 9th chords | **[V]** Wikipedia *Funk* (cites Gress) |
| **Dorian or mixolydian implied**; melodies mix them with the blues scale | **[C]** Wikipedia *Funk* (uncited passage) |
| **Clavinet** used for its percussive tone | **[C]** Wikipedia *Funk* (uncited passage) |
| **Drums: many ghost notes and rim shots; ghosts clearly softer than backbeats** | **[V]** Wikipedia *Funk*; Drumeo |
| **Linear drumming: no two limbs at once** | **[V]** Drumeo. **Exists**: `d-linear` (5 levels) and `d-funk` |
| **Displaced backbeats** (e.g. the first backbeat on the "a" of 1) | **[V]** Drumeo |
| **Bass:** early funk lines in syncopated 8ths from the blues scale plus the major 3rd; later 16th syncopation, octave leaps; dead (ghost) notes; slap and pop | **[V]** Wikipedia *Funk*. **Exists**: `b-ghost`, `b-styles` L10, L16 |

### 3.2 Grids (16-step, all **[C]** generic funk; the drum one already exists as `grooves.ts funk-1`)
```
drums    hat   x x x x x x x x x x x x x x x x
         snare . . . . X . . g . g . . X . . g
         kick  X . X . . . . . . . X . . X . .
bass     (i7)  R . g R' . . g ♭7 . 5 . g R . g ♭3     R' = octave
keys     (clav-style, 9 chord 3–♭7–9)  . . x . . x . . x . . x . x . .   staccato
guitar   motion D u D u D u D u D u D u D u D u ; sound only on . . x . . x . x . . x . x . . .  (rest muted)
```
The keys and guitar rhythms are **[?] as specific patterns** (my own syncopation, deliberately generic); the principle "constant 16th motion, chord only on chosen 16ths, the rest muted" is **[C]** (§4).

### 3.3 Playing over a one-chord vamp
| Device | In C | Tag |
|---|---|---|
| Cm7 vamp: **C dorian**, C minor pentatonic, C blues | | **[C]** Wikipedia *Funk*; Levine |
| C7 vamp: **C mixolydian**, C minor pentatonic against C7 (the blues ♭3 over a major-3rd chord) | | **[C]** Wikipedia *Funk* |
| **Side-slipping**: play a phrase a half step up (C♯ dorian over Cm7) and resolve back | | **[C]** standard modal-jazz device (Levine, *The Jazz Theory Book*; Jerry Bergonzi, *Inside Improvisation* vol. 7 "Outside", known of); related to the app's `rh-approach` |
| **Pentatonics a step apart** over a dorian vamp (C minor pent, D minor pent, G minor pent over Cm7) | | **[C]** Bergonzi, *Pentatonics* (known of) |

---

## 4. Guitar

| Topic | Concrete content | Tag |
|---|---|---|
| **The motor:** constant 16th down-up motion, even through rests; muted strokes in the gaps | | **[C]** Guitar World, *70s funk guitar masterclass* and the Cory Wong interview (snippets); **exists** in `g-rhythm` L5 (`funk16`) |
| **"Chank" / "chicken scratch":** strings lightly pressed then released for a percussive scratch, near the bridge, clean tone, little sustain | | **[V]** Wikipedia *Funk* (cites Gress for "chika / chank / choke") |
| **Partial chords** (2–4 strings, often the top three) to stay out of the keys' and bass's way | in C: top-string triads C/E/G shapes, 3–♭7–9 on strings 4-3-2 | **[C]** Guitar World, *Disco funk rhythm guitar* (Nile Rodgers lesson, snippet) |
| **The 9 chord on the downbeat of every beat, muted strokes between** | E9 as the textbook key | **[C]** funk handout and TrueFire *16th-Note Funk Rhythms* (snippets) |
| **Shapes to add (degrees, root on string 5, in C)** | **9**: R–3–♭7–9–5 (x3233 3) exists. **New: 13**: R–♭7–3–13 (x3x355); **7♯9**: R–3–♭7–♯9 (x3234x); **9sus**: R–4–♭7–9 (x3333x, or IV/V on top strings); **m11 / m7 stabs**: R–♭7–♭3–5 / R–5–♭7–♭3; **6/9**: R–3–6–9 | **[C]** standard chord spellings (Wikipedia *Funk* names m11, 9, 6/9, 13); the fret shapes are standard, check each on the app's fretboard engine |
| **Soul-jazz comping**: Charleston + 3–7 shells, drop-2 behind the organ, double stops, Grant Green turns, Wes octaves | | **[V]** Purcell |

---

## 5. Voice (generic pedagogy only)

| Device | Tag and source | In the app |
|---|---|---|
| **Riffs and runs mostly built on the pentatonic** (watch the minor-3rd gaps) | **[C]** 30 Day Singer and other teaching sites (snippets); Berklee Online lists a course "Improvisation Techniques for Singing Pop and R&B" (known of) | pentatonic runs exist (1607) |
| **Practise slowly, then raise the tempo** | **[C]** (same) | the 60 → 120 % run ladder exists |
| **Descending runs first** (easier than ascending) | **[C]** 30 Day Singer (snippet) | **new ordering rule** for gospel runs |
| **Narrow vowels (ee, oo) and a lighter tone for runs** | **[C]** (snippet) | could be a hint line |
| **Melisma = several notes on one syllable** | **[C]** (definition) | exists (1610–1611) |
| **Call and response** (leader phrase, group answer; or the app plays the call, the singer answers) | **[V]** that it is central to soul-jazz/gospel (Wikipedia *Soul jazz*); the exercise shape is **[C]** | new item type: answer a 1-bar call with a 1-bar response over a I–IV vamp |
| Riffs originated in gospel | **[C]** (snippet, unsourced) | copy only, low priority |
| Specific "gospel licks" (named melodic formulae), belting, growls, vocal fry, vibrato control | **[?]** / out of scope (health risk without a teacher; not generic) | stays out |

Gospel run shapes to add (scale-degree patterns, all keys): major pentatonic 6–5–3–2–1, 1–6̣–5̣ (down into the low 5), 5–6–1'–6–5–3–2–1, and the blues-flavoured 5–♭3–2–1 with the ♭3 as a passing note. **[C]** (they are pentatonic sequences, which is the verified principle); naming any of them a "standard gospel run" is **[?]**.

---

## 6. Progressions for 12-key practice (Roman numerals)

| Style | Progression | Tag |
|---|---|---|
| Gospel | I – IV/I – I (over a tonic pedal) | [C] |
| Gospel | I – IV – I – IV (repeated plagal) | [V] |
| Gospel | I – I7 – IV – iv – I | [V] (minor plagal) |
| Gospel | I – ii/1 walk-up as **I – ♭VII/2 – I/3 – IVmaj7** | [V] |
| Gospel | **ii – I/3 – II/♯4 – V** (the 2–5 walk-up) | [V] |
| Gospel | **I – VI7(alt) – ii7 – V7** (1625), with VII7 → VI7 | [V] |
| Gospel | VI7sus – ♭VI7 – II7 – V7 – I | [V] |
| Gospel | IV – ♯iv°7 – I/5 – V7 – I | [V] |
| Gospel | iii(7) – VI7 – II7 – V7 – I (which are dominant: [?]) | [V] / [?] |
| Gospel | ii7 – IV/V – I | [V] (IV/V) / [C] (the sequence) |
| Gospel | I – I/♭7 – IV/6 – iv/♭6 – I/5 | [?] |
| Gospel shout | I7 – IV7 vamp with a chromatic bass | [V] that shouts use dom7 chords and chromatic bass; the loop itself [?] |
| Soul-jazz | 12-bar blues with ii–V in bars 4, 8, 10, 12 | [V] |
| Soul-jazz | minor blues: i – iv – i / iv – i / ♭VI7 – V7 – i | [C] (exists in `k-organ`) |
| Soul-jazz | I7 – IV7 two-bar vamp | [C] |
| Funk-jazz | i7 one-chord vamp (dorian) | [V] vamp / [C] dorian |
| Funk-jazz | I7 one-chord vamp (mixolydian) | [V] vamp / [C] mixolydian |
| Funk-jazz | i7 – IV7 (minor 7th and a related dominant: the dorian pair) | [V] (Wikipedia: "a minor seventh and a related dominant seventh"); that the related dominant is IV7 is [C] |
| Funk-jazz | i7 – ♭ii7 – i7 (side-slip and back) | [C] |

---

## 7. What a straight-ahead jazz player gains (the "style taster" card sentence)

| Style | Sentence | Tag |
|---|---|---|
| **Gospel** | "From gospel: plagal IV–I motion, moving inner voices and walk-up passing chords — they colour your ballads and intros." | [V] devices (§1); the benefit claim [C] (SPEC-STYLE-FOCUS §9.3, the owner's table; Goldings' teaching in `REHARM-AND-COLOR.md`) |
| **Soul-jazz** | "From soul-jazz: blues phrasing, call and response, and riffs that build a solo over a simple form." | [V] Wikipedia *Soul jazz*; Purcell |
| **Funk-jazz** | "From funk: 16th-note time, the downbeat 'one', and how to make one chord last a whole solo." | [V] Wikipedia *Funk* |
| **Organ (keys only)** | "From the organ: legato without a pedal, a walking left hand under your own comping, and dynamics from the swell pedal instead of the fingers." | [V] (§10) |
| **Funk / soul rhythm guitar (guitar only)** | "From funk guitar: a steady 16th motor and partial chords that leave room for the band." | [C] (§4) |

---

## 8. Style-recognition cues for the ear game

The game already exists as `drum-style` (drums course only). **Proposal:** open it to every course (a groove ear topic), add `boogaloo`, `gospel68` and `shout` once their grooves are verified, and add a look-alike group.

| Style | Subdivision | Tempo | What gives it away | Tag |
|---|---|---|---|---|
| **Shuffle** | triplet 8ths (long–short), 12 pulses per bar | 80–140 | the "let" of the triplet on the hat/ride, backbeat on 2 and 4, walking or boogie bass | [C]; exists |
| **Half-time shuffle** | triplets, backbeat only on 3 | 70–90 | ghosted triplets between, snare once a bar | [C]; exists (`purdie`) |
| **Boogaloo** | straight (or lightly swung) 8ths/16ths | ~117–133 | ghosted snare, kick doubling the bass, 1960s organ/guitar sound | [V] tempo, ghosts, kick=bass (Drumeo) |
| **16th funk** | straight or swung 16ths, continuous | ~90–115 | 16th hats, strong "one", syncopated kick, scratch guitar, often one chord | [V] (Wikipedia *Funk*, Drumeo tempi 98–115) |
| **Gospel 12/8 ballad** | compound: 4 beats × 3 | slow (dotted quarter ≈ 50–70) | triplet piano/organ chords on every pulse, heavy backbeat on 2 and 4, plagal harmony | [C] feel; tempo range [?] |
| **Gospel shout** | fast swung 4/4 | fast (150–190 [?]) | claps and snare on every upbeat, chromatic bass, dominant-7th organ | [V] features / [?] tempo |
| **Swing** (control) | swung 8ths, ride pattern, walking bass | any | spang-a-lang ride, feathered kick | exists |

**Look-alike group (level 4):** shuffle / swing / gospel 12/8 (all triplet-based: tell them by the ride vs triplet hat, the bass and the tempo); boogaloo / 16th funk (by density of the hat and the kick figure).

---

## 9. Proposed exercise ladder per instrument (all **[?] proposal**)

Tiers follow `tierBounds.ts` (notes per second: T0 < 1.9, T1 < 2.1, T2 < 2.8, T3 < 3.6, T4 < 4.4, T5 < 5.0, T6 < 5.6). Every rung starts **rubato, then a tempo ladder** (memory: rubato-then-tempo), with count-in, click and a visual now-cue (timing-cue-always), in all 12 keys. Rows marked "exists" are links to content we already have, not new builds.

### 9.1 Keys (piano)
| Tier | Rung | Tempo |
|---|---|---|
| T0 | IV → I and IV/I ↔ I over a held tonic bass, whole notes | rubato → ♩60 |
| T0 | Minor plagal IV – iv – I (exists: `rh-mi`, link) | rubato → ♩60 |
| T1 | 1–4 walk-up I – ♭VII/2 – I/3 – IVmaj7, quarters | ♩60–80 |
| T1 | IV/V → I and V9sus → V7 → I | ♩60–80 |
| T2 | 1625 with an altered VI7; the VII7 → VI7 approach | ♩70–90 |
| T2 | Gospel 12/8: LH octaves on 1 and 7, RH triad triplets, over I – IV – I – V | ♩.50–66 |
| T3 | IV – ♯iv°7 – I/5 – V7 – I with LH chromatic octave approaches | ♩80–100 |
| T3 | Soul-jazz blues (ii–V in 4, 8, 10, 12): LH walking, RH Charleston shells | ♩90–130 swing/shuffle |
| T4 | Line clichés and moving inner voices in a ballad (exists in part: `k-organ` org-inner) | ♩60–80 |
| T4 | Funk-jazz: clav-style 16th comping on a i7 or I7 vamp, two hands interlocking | ♩80–100 |
| T5 | VI7sus – ♭VI7 – II7 – V7 tritone chain; 3–6–2–5–1 with dominants | ♩90–120 |
| T6 | Improvise over a i7 vamp with side-slips; a soul-jazz chorus of riffs and call-and-response over the band | ♩100–120 funk / ♩120–160 shuffle |

### 9.2 Organ (keys course, organ sound; see §10)
| Tier | Rung | Tempo |
|---|---|---|
| T0 | Finger legato: a held pad changing chords with no gap and no overlap > 30 ms | rubato |
| T1 | LH bass in halves under a RH pad (exists: `k-organ` L1) | ♩70–110 |
| T2 | LH walking quarters, RH pad (exists: `k-organ` L2); add a swell (CC11) crescendo over 4 bars | ♩80–130 |
| T3 | RH stabs (Charleston, on 2 and 4) over the LH walk: hand independence | ♩90–140 |
| T4 | Gospel organ: plagal and walk-up progressions with drawbar change and Leslie slow → fast at the climax | ♩.50–66 (12/8) / ♩80–100 |
| T5 | Smears and grace-note slides into chord tones; percussion articulation (detached to retrigger) | ♩90–130 |
| T6 | Shout comping: dominant-7th riffs on upbeats over a chromatic LH line (only after §1.4 [?] items are verified) | ♩150+ |

### 9.3 Guitar
| Tier | Rung | Tempo |
|---|---|---|
| T0 | Muted 16th motor, no chord (exists in `funk16` as part) | ♩60–70 |
| T1 | 9 chord on beat 1 of each beat, mutes between | ♩60–80 |
| T2 | Partial chords on the top three strings over a I7 – IV7 vamp | ♩70–90 |
| T3 | 13, 7♯9, 9sus, m11 shapes in all 12 keys; IV/V as 9sus | ♩70–90 |
| T4 | Soul-jazz comping: Charleston with 3–7 shells, then drop-2 behind the organ, over the blues with ii–Vs | ♩90–130 |
| T5 | Syncopated 16th stabs on a i7 – IV7 vamp with the funk band | ♩90–105 |
| T6 | Soul-jazz solo devices: double stops, repeated-pattern turns, octaves with chord stabs | ♩100–140 |

### 9.4 Bass
| Tier | Rung | Tempo |
|---|---|---|
| T0–T2 | (exists) `b-ghost` L1–L4; `b-styles` L3 Motown, L4 shuffle | |
| T2 | Boogie figure R–3–5–6–♭7–6–5–3 through the 12-bar blues in shuffle | ♩80–120 |
| T3 | Soul-jazz blues walking with ii–Vs in bars 4, 8, 10, 12 | ♩100–140 |
| T4 | Gospel walk-up bass lines: 1–2–3–4 and 2–3–♯4–5, with chromatic approaches | ♩70–90 |
| T4 | (exists) `b-styles` L11 gospel / neo-soul, L10 funk | |
| T5 | Boogaloo line (only after §2.2 is verified) | ♩117–133 |
| T6 | Funk-jazz vamp lines with the "one" accent and dead notes (exists in part: `b-ghost` L5–L6) | ♩90–110 |

### 9.5 Drums
| Tier | Rung | Tempo |
|---|---|---|
| T0–T3 | (exists) `d-shuffle` L1–L3, `d-funk` L1–L4 | |
| T3 | Gospel 12/8 ballad groove (the slow-blues 12/8 with a heavier backbeat) | ♩.50–66 |
| T4 | Boogaloo (only after §2.2 verified) | ♩117–133 |
| T4 | Swung-16th gospel groove (straight 16ths read as sextuplets) | ♩80–100 |
| T5 | (exists) `d-linear`, `d-funk` L5 barks | |
| T6 | Shout groove: claps/snare on every upbeat at speed (after §1.4 verified) | ♩150+ |

### 9.6 Voice
| Tier | Rung | Tempo |
|---|---|---|
| T0 | Call and response on two notes (1 and 5) over a I – IV vamp | ♩70 |
| T1 | Answer a 1-bar call with a 1-bar response, major pentatonic | ♩70–80 |
| T2–T4 | (exists) runs 1603–1609, descending shapes first | 60 → 120 % |
| T4 | Gospel run shapes (§5) in 12 keys | 60 → 100 % |
| T5 | (exists) melisma 1610–1611; blues melisma 2223 | |
| T6 | 8 bars over the gospel 12/8 band: melody then improvised fills | ♩.60 |

### 9.7 The band (band.ts)
Proposed new `BandStyle`s: `souljazz` (shuffle, walking bass, organ pad/stabs), `boogaloo` (after verification), `gospel68` (12/8, plagal changes, organ + piano triplets), `funkjazz` (16th, one-chord or two-chord vamp, scratch guitar, ghosted bass). The existing `funk` and `shuffle` cells can be the start. The organ sound (§10) should be the default comping instrument for `souljazz` and `gospel68`.

---

## 10. Organ technique (owner's addition)

### 10.1 What exists
- **Content:** `k-organ`, 7 rungs (§0): LH halves → LH quarters under a pad, a moving inner voice, minor blues, texture under a soloist, two ballads on the common-tone ladder. Source: the Goldings research (`REHARM-AND-COLOR.md` C.10). **No drawbar, Leslie, expression, legato, glissando or gospel organ rung.**
- **Sound:** `src/audio/organ.ts` (modelled, no samples): 9 drawbars at the real footages (16′ 5⅓′ 8′ 4′ 2⅔′ 2′ 1⅗′ 1⅓′ 1′) with 0–8 levels in 3 dB steps; wheel leakage; key click; percussion on the 2nd or 3rd harmonic; a Leslie with slow/fast speeds and a ramp. Five registrations.
- **Three gaps against the real instrument**, found while reading the code:
  1. **Velocity:** `organKey` scales the level by `0.55 + 0.1 × velocity` (the comment says it is deliberate). A real Hammond ignores velocity **[V]** (Wikipedia *Hammond organ*). For organ-technique rungs, velocity should be off, or the grader will reward a habit that does nothing on a real organ.
  2. **Percussion retriggers on every key.** On the B-3/C-3 it is **single-trigger**: it sounds again only after all keys are released, so legato playing sounds it only on the first note or chord **[V]** (Wikipedia *Hammond organ*; Wijnen: "percussion only works when the notes are not connected"). This is the basis of a real articulation skill (§10.2) and should be modelled.
  3. **The `gospel` registration 888800008 is not verified.** See §10.2 registrations. Also, **no expression (CC11) input** reaches the organ voice, so the swell pedal cannot be practised yet.

### 10.2 Technique, tagged

| Topic | Content | Tag and source |
|---|---|---|
| **No velocity sensitivity** | Loudness does not change with how hard a key is struck; overall volume comes from the **expression ("swell") pedal** | **[V]** Wikipedia *Hammond organ* |
| **Dynamics from the pedal, registration and Leslie** | Pumping the expression pedal for volume and colour ("pump the pedal back in to get more volume, highs and lows"); changing drawbars; Leslie fast for climaxes | **[V]** Wijnen; Wikipedia |
| **Sound only while the key is held; no damper pedal** | The note sounds until the key is released, without decay | **[V]** Wikipedia *Hammond organ* |
| **Finger legato and substitution** | Connecting notes by the fingers alone: finger substitution on a held key, **finger and thumb glissando** (sliding a finger from a black to a white key; the thumb rocking base-to-tip) | **[V]** thumb glissando, BYU OrganTutor (*Fingering techniques*). **[C]** finger substitution (the BYU OrganTutor lists it among legato techniques, seen in a snippet; standard organ pedagogy, e.g. Gleason, *Method of Organ Playing*, known of). Note: this is church-organ pedagogy; jazz organists use it less strictly **[C]** |
| **Detached touch to retrigger the percussion** | Lift before the attack to make the percussion sound; play legato to suppress it | **[V]** Wijnen; Wikipedia (single-trigger) |
| **Glissandi, smears, swoops** | Smear: a slow build up to a climactic note or chord; swipe: a fast smear, either direction; palm glissando; Wijnen's "slides and swoops", "flutter" (fast drop-downs with the hands), and the "organ crawl" (slide to the nearest voicing of the chord while holding) | **[V]** Wijnen for slides, swoops, flutter, crawl; **[C]** smear/swipe/palm gliss definitions (Harmony Central forum, snippet only) |
| **Grace-note slides into chord tones** (a black key sliding to the white key next to it) | | **[V]** as a gospel keys device (Pianote); on organ **[C]** |
| **Tremolo between two notes a 3rd apart (5 and ♭7 of the chord), rapid repeated notes** | | **[C]** MusicRadar *Perfect your organ playing* (snippet) |
| **Holding one note** (usually the chord root) through changes, often with Leslie fast | | **[V]** Wijnen |
| **LH walking bass on the lower manual, against RH comping and lines** | Most jazz organists play the bass mainly on the manual, not the pedals; some tap the pedals with the LH line (pitchless thump or doubling); Jimmy Smith played bass parts on the pedals | **[V]** Wikipedia (Smith on pedals); Wijnen ("left hand bass and tapping on the pedals"). **[C]** "a clear majority play on the manuals" (Sibelius Academy thesis by Mikko Helevä, snippet) |
| **Pedalboard** | 25 notes on console models (low C up two octaves) | **[V]** Wikipedia |
| **Leslie chorale / tremolo** | Horn ~50 rpm slow, ~400 rpm fast (drum ~40 / ~340); switching while playing, and the speed change itself, is part of the sound | **[V]** Wikipedia *Leslie speaker* |
| **Leslie fast for climaxes / solo peaks** | | **[V]** Wijnen |
| **Key click** | Valued by players as part of the sound | **[V]** Wikipedia |
| **Registration 888000000** (16′ 5⅓′ 8′ fully out) | The "classic Jimmy Smith" setting, with 3rd percussion common in jazz | **[V]** Wikipedia (888000000 / Jimmy Smith). The 3rd-percussion pairing: **[C]** |
| **888800000** | A Smith-type sound with the 4′ added (Mike Finnigan's "Smithereens") | **[C]** MusicRadar, *Mike Finnigan's favourite organ settings* (snippet) |
| **"Squabbling" right-hand setting 800008888** | Percussion off, chorus/vibrato C3, fast Leslie | **[V]** Wijnen |
| **Gospel registrations** (e.g. full 888888888, 888800008, "tibia" settings like 808808008) | | **[?]** only player notes and forums; Hammond's own manual says registrations became common in gospel but the page was unreadable. **The app's `gospel` preset (888800008) should be labelled "full" or checked before it is called "gospel".** |
| **How the organ comps in gospel** | Sustained chords and plagal colour under the singer; the organist mostly plays **dominant 7th chords** and riffs in shouts | **[V]** for the shout (Wikipedia *Shout*); the general "sustained pad under the singer" is **[C]** |
| **Gospel shout patterns on organ** | | **[?]** beyond "dom7 riffs + chromatic bass", nothing verified (§1.4) |

### 10.3 Registration as an app setting
Proposal **[?]**: let organ rungs set the registration (jazz 888000000 + perc 3rd for comping and lines; 838000000 ballad; 800008888 for RH squabbling) and show the drawbars on screen. Players with a drawbar controller send them as CCs; the app could read them (§10.4).

### 10.4 What the app can measure from MIDI

| Skill | Measurable? | How |
|---|---|---|
| **Finger legato** | **Yes** | note-off of one note vs note-on of the next: gap (detached) or overlap (smeared). A target window, e.g. overlap 0–30 ms, is a proposal **[?]** |
| **Detached touch for percussion** | **Yes** | a gap > 0 before each accented chord (all keys up) = the percussion would retrigger |
| **Finger substitution** | **Partly** | the key stays down with no re-attack (no new note-on), so the result is visible; which finger did it is not |
| **Swell / expression** | **Yes, if the player has an expression pedal** | CC11 (expression) or CC7 (volume) curve over time: crescendo shape, timing against the bar. `midi.ts` already captures every CC |
| **Drawbar changes, Leslie switch** | **Only with a drawbar controller or a Leslie footswitch that sends CCs**; the CC numbers vary by device | read the device's CC map; otherwise an on-screen control |
| **Glissando / smear speed** | **Yes** (as a run of very short, near-simultaneous notes) | notes per second, direction, range, landing note and its timing |
| **Grace-note slides** | **Yes** | a short note a half step from the target, then the target, and the gap between them |
| **LH walk vs RH comp independence** | **Yes** | split by register (or MIDI channel on a dual-manual controller); grade each hand's timing |
| **Bass pedals** | **Only with a MIDI pedalboard** (a separate channel or low range) | |
| **Leslie use "at the right moment", tone, touch quality, the feel of a smear** | **No** | judged by ear (the teacher, or the player listening back) |
| **Palm vs finger glissando** | **No** | same MIDI result |

### 10.5 Electric piano and vibraphone

**Electric piano (Rhodes, Wurlitzer).** Unlike the organ, both are velocity-sensitive, and the tone changes with touch, not only the volume: the Wurlitzer gains a harmonic "bite" when played hard **[V]** (Wikipedia *Rhodes piano*, comparing the two); the Rhodes "bark" when struck hard is widely described but I did not find it in a source I read **[?]**. The Rhodes is a hammer striking a tine with a tone bar, picked up electrically, mellower than a piano and with longer sustain than the Wurlitzer **[V]**; the Suitcase model adds a stereo tremolo (auto-pan; sometimes mislabelled "vibrato") **[V]**; the instrument has a sustain pedal **[V]**. What changes for the player compared with the acoustic piano: control of the velocity range to place the bark/bite where the music wants it **[C]**; voicings kept out of the low register, where the tines get muddy, so shells and 3–7–9 voicings sit around middle C **[?]**; tremolo as a tone setting, not a technique **[C]**; and lighter, more selective use of the sustain pedal because the tone already sustains **[?]**. The app's Wurlitzer has 4 recorded velocity layers and the tine EP has a suitcase tremolo, so a touch-range drill could use them. The [?] items need a source before they become hints (e.g. Hal Leonard *The Rhodes Book* or a Berklee keyboard-styles text).

**Vibraphone.** The vibraphone is a mallet instrument **[C]**. Playing the app's vibes sound from a keyboard is **piano technique with vibraphone-style voicings** (sparse, close, often four notes or fewer, as four-mallet players are limited to four), **not vibraphone technique** **[C]** for the four-mallet limit (Gary Burton, *Four-Mallet Studies*, known of). No vibraphone technique rungs should be claimed for a keyboard player.

---

## 11. Build notes (what to do with this, in order)

1. **Keys gospel family** (new, e.g. `k-gospel`): §1.1–1.3 [V] rows only; link the existing `rh-mi` and `rh-pedalpt` rungs instead of duplicating them.
2. **Organ technique rungs** appended to `k-organ`, plus the three sound fixes (velocity off, single-trigger percussion, CC11 into the organ voice), and rename or verify the `gospel` registration.
3. **Guitar:** add `13`, `7♯9`, `9sus`, `m11`, `6/9` to the chord-quality set; partial top-string shapes; a soul-jazz comping rung (Charleston + shells → drop-2) on the blues with ii–Vs.
4. **Band styles** `souljazz`, `gospel68`, `funkjazz` (boogaloo after verification).
5. **Ear:** open `drum-style` to all courses; add gospel 12/8 now and boogaloo/shout after verification; the look-alike groups of §8.
6. **Voice:** call-and-response item type; descending-first order for gospel run shapes.
7. **Verify before shipping** (send the owner precise questions or check a method book): the boogaloo groove and bass line; the 1–♭7–6–♭6 descent; which chords in 3–6–2–5–1 are dominant; shout tempo, bass lines and loops; gospel drawbar settings; the Rhodes bark, register and pedal points.

---

## 12. What I read vs what I only know of

**Read in this session (pages opened and read):**
- Wikipedia: *Soul jazz*; *Funk* (first 100k characters); *Plagal cadence*; *Boogaloo* (Latin boogaloo only); *Shout (Black gospel music)*; *Hammond organ* (first 100k characters); *Leslie speaker*; *Rhodes piano*.
- Hear and Play, *An in-depth breakdown of the classic 1-4 walk-up* (hearandplay.com/main/classic-1-4-walk-up-chord-progression).
- PianoGroove, *Gospel Passing Chords & Substitutions* (pianogroove.com/?p=5339) and *Gospel Chord Progressions* (pianogroove.com/?p=5342).
- Pianote, *Gospel Piano 101* (pianote.com/blog/gospel-piano-101/).
- Premier Guitar, Shawn Purcell, *Style Guide: Soul Jazz* (2012).
- Drumeo, *The Ultimate Guide to Soul and Funk Drumming* (prose only; the notation images were not readable).
- Bob Wijnen, *Hammond organ for the advanced jazz pianist*, "Typical playing techniques on piano and Hammond organ" (Research Catalogue, 2022).
- BYU OrganTutor, *Fingering techniques* p. 6 (thumb glissando).
- cruiseshipdrummer.com, "Groove o' the day: Idris Muhammad boogaloo" (too thin to use).

**Seen only as search-result snippets (tagged [C] at most):** Guitar World (*70s funk guitar masterclass*, *Disco funk rhythm guitar*, the Cory Wong interview); TrueFire *16th-Note Funk Rhythms*; MusicRadar (*Mike Finnigan's favourite organ settings*, *Perfect your organ playing*); Harmony Central Hammond forum (smears, swipes); Mikko Helevä's Sibelius Academy thesis on Hammond bass lines; Eddie Landsberg's registration notes; Violet Recording and Ethan Hein on plagal cadences; PlayPiano lesson 37; Hear and Play and PianoGroove on shout music; Tim Richards' 12/8 gospel lesson (MusicGurus); 30 Day Singer on riffs and runs; Berklee Online course listings (*Improvisation Techniques for Singing Pop and R&B*, *R&B Vocals*).

**Known of, not opened in this session (the books to check the [?] items against):** Mark Levine, *The Jazz Piano Book* and *The Jazz Theory Book* (Sher); Kurt Cowling, *Gospel Piano* (Hal Leonard Keyboard Style Series); Dave Limina, *Hammond Organ Complete* (Berklee Press / Hal Leonard); Thaddeus Hogarth, *Funk/R&B Guitar* (Berklee Press); Allan Slutsky, *The Funkmasters* (cited by Wikipedia); Zoro, *The Commandments of R&B Drumming*; Tommy Igoe, *Groove Essentials*; David Garibaldi, *Future Sounds*; Ed Friedland, *R&B Bass Builder*; Jerry Bergonzi, *Inside Improvisation* (vols. on pentatonics and "outside"); Harold Gleason, *Method of Organ Playing*; Gary Burton, *Four-Mallet Studies*.

---

## 13. Summary

- **Already in the app:** funk at the technique level on bass (`b-ghost`, `b-styles` funk, gospel / neo-soul), drums (`d-funk`, `d-shuffle` incl. slow-blues 12/8, `d-linear`, so linear drumming needs nothing new) and guitar (`g-rhythm` 16th funk on 9 chords); organ trio basics (`k-organ`, 7 rungs); minor plagal and pedal point (`k-reharm`); voice runs and melisma; a modelled Hammond with drawbars, percussion and Leslie; band `funk` and `shuffle`; the `drum-style` ear game (drums only).
- **Verified and ready to build [V]:** gospel plagal IV–I (repeated through sections), IV–iv–I, IV/V = V9sus, sus → 3 resolutions, the 1–4 and 2–5 walk-ups, ♭III7–III7–IV, 1625 with an altered VI7, VI7sus–♭VI7–II7, IV–♯iv°7–I/5, chromatic LH octave approaches; soul-jazz definition, call and response, the blues with ii–Vs in bars 4, 8, 10 and 12, Charleston + guide tones, drop-2 behind the organ, motifs / double stops / turns / octaves; funk's "one", 16th syncopation, one- or two-chord vamps (m7 + related dom7), extended chords, chicken scratch, ghost notes, displaced backbeats; the shout's upbeat claps, chromatic bass and dom7 organ; swung-16th gospel drumming; boogaloo tempi, ghosts and kick-follows-bass; organ facts (no velocity, swell pedal, sound only while held, single-trigger percussion, Leslie speeds, 888000000, LH bass with pedal taps, Wijnen's slides / swoops / flutter / crawl).
- **Kept out until checked [?]:** the exact boogaloo groove and bass line, the 1–♭7–6–♭6 descent, which chords in 3–6–2–5–1 are dominant, shout tempo / loops / bass lines, gospel drawbar settings (including the app's own `gospel` preset), and the Rhodes bark, register and pedal claims.
- **Organ:** a full section (§10) on technique and what MIDI can measure: legato overlap and gaps, the detached touch that retriggers percussion, CC11/CC7 swell, glissando speed and grace-note slides, and hand independence by register. Not measurable: Leslie timing taste, tone, palm vs finger. Three sound gaps to fix: velocity should be off for organ rungs, percussion should be single-trigger, and CC11 should reach the organ voice.
- **Rhodes / Wurlitzer and vibes:** EPs are velocity-sensitive with tone change (the Wurlitzer "bite" is [V]), a stereo tremolo and a sustain pedal. Vibes from a keyboard is piano technique with vibes-style voicings, not vibraphone technique.
- **Ladders (§9) are proposals [?]:** T0–T6 per instrument with tempi. They reuse existing rungs wherever they exist.

# Brazilian styles: bossa nova, samba / samba-jazz, baião, choro (research for SPEC-JAZZ-NEIGHBOURS §2)

*Research done 2026-11-22 for SPEC-JAZZ-NEIGHBOURS §2 and SPEC-STYLE-FOCUS (the `brazil` style). No code was changed. This is not legal advice; §4.3 needs the same lawyer pass as `PD-JAZZ-SOURCES.md`.*

**Tags (the owner's rule: only verified theory)**
- **[V]** verified. I read the cited source during this research and it says what the line claims.
- **[C]** common practice. A mainstream teaching convention, with a mainstream source cited. If I only *know of* that source and did not read it this session, the line says so ("known, not read").
- **[?]** unverified. It stays out of the app until someone checks it against a primary source. Every [?] in §1–§5 comes with a check task (§9).

**What I actually read this session (primary/strong sources)**
- **Nelson Faria & Cliff Korman, *Inside the Brazilian Rhythm Section*** (Sher Music). I read the publisher's sample: front matter, table of contents, authors' notes and the samba chapter opening (Hudson Music sample PDF). The notation glyphs in the sample did not extract, so I take no grid from it.
- **Jovino Santos Neto, "Ginga: a Brazilian way to groove"** (paper, author's site jovisan.net; course copy at web.uvic.ca). Read in full. Jovino was Hermeto Pascoal's pianist 1977–92 and teaches at Cornish College.
- **Almir Côrtes, "Como se toca o baião: combinações de elementos musicais no repertório de Luiz Gonzaga,"** *Per Musi* 29 (2014), DOI 10.1590/S1517-75992014000100020 (SciELO). Read via an extraction of the article text; the music examples were not in the text.
- Wikipedia: *Bossa nova* (cites Garcia 1999/2019, Lopes & Simas 2015, Béhague/Grove), *Baião (music)*, *Escala nordestina* (cites Antonio Adolfo, *Composição*, Lumiar 1997, p. 23), *Surdo*, *Partido alto*, *Choro*, *Clave (rhythm)* (Brazilian section).
- Teaching articles:
  - Daniel Ward, "Learn Basic Bossa Nova Patterns, Inside and Out," *Acoustic Guitar* (Nov. 2017; online 2019)
  - Larry Gray, "Bossa Nova Guitar," Jazz Guitar @ Illinois (2017)
  - Doug Munro, "Rhythm Rules: Brazilian Guitar 101," *Premier Guitar* (2013); text only, the figures were images
  - James Melton, "6 Bossa Nova Chord Progressions," LearnJazzStandards
  - Joe Hubbard, "The BIG 5 Brazilian Bass Grooves"
  - PianoGroove bossa lessons (text parts)
  - JG Music Lessons (text parts)
- IMSLP work pages for the choro titles in §4.3 (first-publication data).

**Known, not read this session** (cited as the authority for [C] lines and as the place to verify [?] lines):
- Nelson Faria, *The Brazilian Guitar Book* (Sher, 1995)
- Antonio Adolfo, *Brazilian Music Workshop* (Advance Music, 1993)
- Duduka Da Fonseca & Bob Weiner, *Brazilian Rhythms for Drumset* (Manhattan Music/Alfred, 1991; transcriptions by John Riley)
- Mark Levine, *The Jazz Piano Book* (Sher, 1989), which has a Latin chapter that I recall covers Brazilian comping [?]
- Chris Stover's work on partido-alto timelines

---

## 0. Ground rules for this whole file

**0.1 Grid notation.**
- Brazilian music is usually written in **2/4 with 16th notes**; jazz charts write the same groove in **4/4 (cut time) with 8th notes**.
  - Ward says bossa "is often written in 2/4" and teaches it in 4/4 cut time [V].
  - Jovino says the Brazilian count-off in 2/4, with the accent on beat 2, is "not a difference in notation only" but in how the groove is felt [V].
- So every grid below is **8 steps per bar**:
  - in 2/4, 1 step = a 16th;
  - in 4/4 cut time, 1 step = an 8th.
- Two-bar patterns are 16 steps, like the strings in `src/engine/drills/drumStyles.ts`.
- `x` = hit, `X` = accent, `.` = rest or held, `g` = ghost.

| Step | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 2/4 count | 1 | e | & | a | 2 | e | & | a |
| 4/4 count | 1 | & | 2 | & | 3 | & | 4 | & |

**0.2 Subdivision is straight.**
- "In most popular Brazilian musical styles (samba, bossa nova, choro, baião, maracatu, frevo), the rhythmic flow consists of evenly spaced subdivisions" (Jovino) [V].
- Jovino says jazz players "often fail to produce the necessary evenness" [V].
- Bossa is "typically played without swing" (Wikipedia, citing Carlos Lyra's side-to-side versus front-to-back image) [V].
- **App rule:** swing = 0 for every Brazilian item. Grade evenness the way the app grades 16th funk.

**0.3 The feel is beat 2 of the 2/4 bar (beats 3 and 1 in cut time).**
- The surdo accent on beat 2 is "one of the fundamental structural elements of Brazilian samba" (Jovino) [V].
- Ward calls it the "big 2" [V].

**0.4 The universal two-layer model.**
- "In its most basic form, [samba] consists of 2 rhythmic layers": a low surdo layer of quarter notes with an accent on beat 2, and a higher tamborim layer. These "can be translated to different instruments, such as guitar (thumb being the surdo and the other fingers the tamborim), piano (left hand – surdo, right hand – tamborim)" (Jovino) [V].
- Wikipedia (citing Garcia) says the same of the bossa batida: the thumb stylises the surdo, the fingers phrase like the tamborim [V].
- **This is the organising idea for every instrument in this file.**

**0.5 Vary, don't loop.**
- "It is important in Brazilian music not to use the basic rhythmic motives without variation" (Faria & Korman) [V].
- Faria & Korman also say "guitar-like rhythmic comping should be used sparingly on the piano"; Korman prefers counter-lines, inner voices and legato pads when there is a guitar [V].
- **App rule:** each groove ladder ends in a *variation* rung (the app picks among 2–4 valid cells), not a fixed loop. Piano ladders include a "with guitar in the band" rung that comps sparser.

**0.6 Keys.**
- All voicings are given as degrees over the root, shown in C. They move to 12 keys by transposition.
- Guitar shapes are movable; the app's existing 12-key matrix handles position choice.

---

## 1. Bossa nova

### 1(a) Guitar: the batida

**Thumb (bass, the surdo layer)**

| Pattern | One bar (8 steps) | Notes | Tag |
|---|---|---|---|
| T1 basic | `x...x...` | Beats 1 and 3 in 4/4; the bass is "always played on 1 and 3" | [V] Gray; Ward Ex. 9; Wikipedia ("thumb plays the bass notes on 1 and 2" in 2/4) |
| T2 root–5th | `x...x...`, notes R then 5 | Alternate the root and the 5th; on a 6th-string-root chord the 5th is on the 5th string | [V] Ward Ex. 4; JG lessons |
| T3 surdo pickups | `x..xx..x` | The full surdo ostinato: 1, "a" of 1, 2, "a" of 2 (in 2/4) = 1, &2, 3, &4 (in 4/4). The pickups are soft | [V] Wikipedia (surdo ostinato "as in samba"); Ward Ex. 8 ("the thumb bounces to an upbeat before the next root or fifth") |

**Fingers (chord, the tamborim layer)**

| Pattern | Bars | Grid | Tag |
|---|---|---|---|
| F1, the basic one-bar figure | 1 | `x.x..x..` | [V] Wikipedia: "the fingers pluck the chords in unison on the two eighth notes of beat one, followed by the second sixteenth note of beat two" (2/4) = 1, 2, &3 in 4/4. Gray: "one two and the and of three" over half notes in the thumb |
| F2, the bossa-clave comp, 3-2 | 2 | `x..x..x.` `..x..x..` | [C] Munro: "a two-measure 3-2 [clave] pattern underlies the style". The clave is [V]: Wikipedia (son clave with the two-side "pushed by an eighth note"), Ward Ex. 2. This is what `guitar.ts` 'bossa' and the band's bossa comping already play |
| F2', 2-3 | 2 | `..x..x..` `x..x..x.` | [V] Ward: "usually 3–2, sometimes 2–3" |
| F3, the syncopated two-bar batida | 2 | `x.x..x.x` `.x..x.x.` | **[?]** Widely taught, and it fits two [V] facts: the first bar is F1, and "two-measure patterns usually contain a syncopation into the second measure" (Wikipedia). The exact bar 2 needs checking against Faria, *Brazilian Guitar Book* (§9 task B1) |
| F4, all upbeats | 1 | `.x.x.x.x` | [V] JG Music Lessons, "chord on upbeats" (as a variation) |
| F5, anticipated change | — | Any pattern, with the new chord struck on the "&" before the barline | [V] Ward Ex. 7: changes fall "on the 'and' of the preceding beat rather than on the downbeat" |

- **Coordination is the skill.** The thumb and fingers "meet on beat 1 … and play apart on beats 2 and 3" (Ward Ex. 5) [V].
- Every source says to learn the thumb alone first, then the fingers over it: Ward, JG and a Scribd handout [V].
- In a band with a bassist, the thumb may be dropped or played softly (Gray) [V].
- **Measure:** onset timing of the thumb and finger lanes separately. On a nylon-string guitar the two are picked up as one signal, so the app grades the chord onsets against the grid and treats the bass as a tolerance-free "present on 1 and 3" check [?, an implementation choice].

**Guitar voicings, as intervals from the lowest string upwards**
- These are the standard jazz-guitar "Brazilian" grips [C] (Faria, *Brazilian Guitar Book*, known, not read).
- Ward's etude names maj9, 6/9, 11, 13, ♭9, 7♯5, m11, maj7 and m7 grips as the bossa vocabulary [V].

| Chord | Grip (bottom to top) | Example in C | Root string | Tag |
|---|---|---|---|---|
| maj7 | R–7–3–5 | C B E G (8 x 9 9 8 x) | 6 | [C] |
| maj7 | R–5–7–3 | C G B E (x 3 5 4 5 x) | 5 | [C] |
| 6/9 | R–3–6–9–5 | C E A D G (x 3 2 2 3 3) | 5 | [C]; Wikipedia shows C6/9 as the bossa example chord [V] |
| maj9 | R–3–7–9 | C E B D (x 3 2 4 3 x) | 5 | [C] |
| m7 | R–♭7–♭3–5 | C B♭ E♭ G (8 x 8 8 8 x) | 6 | [C] |
| m7(9) | R–♭3–♭7–9 | C E♭ B♭ D (x 3 1 3 3 x) | 5 | [C] |
| m6 / m6(9) | R–♭3–6–9 | C E♭ A D (x 3 1 2 3 x) | 5 | [C] |
| 7 | R–♭7–3–5 | C B♭ E G (8 x 8 9 8 x) | 6 | [C] |
| 7(9) | R–3–♭7–9 | C E B♭ D (x 3 2 3 3 x) | 5 | [C] |
| 7(13) | R–♭7–3–13 | C B♭ E A (8 x 8 9 10 x) | 6 | [C] |
| 7(♭9) | R–3–♭7–♭9 | C E B♭ D♭ (x 3 2 3 2 x) | 5 | [C] |
| 7(♯11) / II7(♯11) | R–♭7–9–♯11 or 3–♭7–9–♯11 (rootless) | C B♭ D F♯ | — | [C]; the II7(♯11) function is [V] (§1(e)) |
| m7(♭5) | R–♭7–♭3–♭5 | C B♭ E♭ G♭ (8 x 8 8 7 x) | 6 | [C] |
| dim7 | R–♭5–𝄫7–♭3 (drop-2) | C G♭ A E♭ (x 3 4 2 4 x) | 5 | [C]; the passing ♯I° / ♭III° functions are [V] (LJS: "dominant-function diminished chord" in *Corcovado*) |

- **Bossa voice-leading habit:** keep the top voice still or moving by step through a ii–V–I. For example, D m7(9) → G7(13) → Cmaj9 keeps the top on E–E–D, or the G13 → G7(♭13) inner line [C].
- These grips are the content of a "Brazilian chords on the neck" family, in 12 keys.

### 1(b) Piano bossa comping

| Element | What | Tag |
|---|---|---|
| LH = surdo | `x...x...` (1 and 3 in 4/4), root on 1, 5th on 3. Pickup variant: `x..xx..x` (T3 above) | [V] Jovino (LH = surdo); PianoGroove: the LH "emphasises the root and fifth" with a steady on-the-beat pattern; pickup variant [V] Wikipedia surdo |
| RH = tamborim | The guitar finger patterns F1–F5, rootless, mid-register | [V] Jovino (RH = tamborim); PianoGroove: rootless RH because the LH has the root |
| No sustain pedal | It blurs the bass rhythm | [V] PianoGroove (Blue Bossa lesson) |
| Sparse with a guitarist | Pads, inner voices, counter-lines; rhythmic comping only when there is no guitar | [V] Faria & Korman |
| Anticipation | In samba (and its bossa derivative) chords are best played "a 16th note before the downbeat, often following the melodies"; in swing they tend to be delayed | [V] Jovino (said of samba); applying it to bossa is [C] |

**RH voicings (C as I; give as degrees, bottom to top)**

| Name | Imaj | ii m7 | V7 | Tag |
|---|---|---|---|---|
| 4-way close (rootless) | 3–5–7–9 (E G B D) | ♭3–5–♭7–9 | 3–13–♭7–9 or ♭7–9–3–13 | [C] Levine, rootless A/B voicings (known, not read) |
| 6/9 | 3–6–9 (E A D), or 3–5–6–9 | — | — | [C] |
| Quartal ("So What" type) | 3–6–9–5 over the root, or stacked 4ths from 3 or 6 | 4ths from 9 or ♭3 within dorian (E A D G = 9–5–1–11; F B E = ♭3–6–9) | 4ths from ♭7 or 3 (F B E A over G = ♭7–3–13–9) | [C] Levine ("So What" voicings, known, not read) |
| Two-hand with LH bass | LH R–5 (or R–10 for big hands), RH as above | — | — | [C] |

- Note on the quartal row: only stack 4ths on scale tones of the chord's mode. Over D m7 (dorian), E A D G and F B E (B = the dorian 6th, so F–B is a tritone) are idiomatic. **The app must generate quartal stacks from the chord-scale, not blindly in perfect 4ths.** This reuses `CHORD-SCALE-ROTATION.md`.
- Rule for the app: the LH root–5th falls on 1 and 3 and never changes; the RH pattern is chosen from F1–F5 per 2 bars, with the anticipation (F5) on every chord change from tier T3 up.

### 1(c) Bass bossa line

| Line | Grid (one bar of 4/4 = 2/4 ×2 halved) | Notes | Tag |
|---|---|---|---|
| B0 halves | `x...x...` | R on 1, 5 on 3 | [C] (Ward Ex. 4 for the R–5 thumb; a standard simplification) |
| B1 classic dotted | `x..xx..x` | R on 1 (dotted quarter), 5 on &2 (short pickup), 5 on 3 (dotted quarter), R or the next chord's root on &4 (pickup). The pickups are light or ghosted | [V] Hubbard: bossa = the samba figure (dotted 8th + 16th, root–5th) "at half time, written in 8ths"; the figure = the surdo ostinato [V] Wikipedia; ghost notes [V] PianoGroove. The exact note on each pickup is [C] |
| B1 accents | Beat 1 lighter, beat 3 accented and held a little longer | [V] Hubbard |
| B2 anticipation | The new chord's root on &4 of the bar before (matches guitar F5) | [C] |

Existing `bass.ts` b-styles 7 ("root–5th dotted figure") agrees with B1; no change is needed beyond adding B0 and B2 rungs.

### 1(d) Drums bossa

| Lane | Grid (2 bars, 8 steps per bar) | Tag |
|---|---|---|
| Hi-hat (or ride) 8ths, light | `xxxxxxxx` `xxxxxxxx` (the cabasa role) | [V] Ward Ex. 1: hi-hat 8ths = cabasa; brit.co guide: hats under the rim clicks |
| Cross-stick, bossa clave 3-2 | `x..x..x.` `..x..x..` | [V] Wikipedia; Ward Ex. 2; brit.co guide: "beat one, the 'and' of two, and beat four", then "beat two and the 'and' of three" |
| Bass drum = surdo | `x..xx..x` `x..xx..x` | [V] Wikipedia surdo ostinato; Ward Ex. 1 (bass drum = surdo) |
| Hi-hat foot | On 2 and 4 (cut time) when the right hand is on the ride | [C] Da Fonseca & Weiner (known, not read) |
| Brushes version | Brushes in place of sticks | [C] (Da Fonseca & Weiner has a separate brushes track; seen in the track list in search results) |

The app's d-latin level 1 (`BOSSA_K`, `CLAVE.bossa32/23`) matches this exactly [V by comparison]. Missing rungs to add: brushes, the ride with hi-hat foot, and a 2-bar fill-and-return.

### 1(e) Bossa feel for melody and improvisation

**Phrasing**
- Straight 8ths [V] (0.2).
- Melodies anticipate. "Samba melodies are almost always syncopated, rarely beginning or ending on the downbeat" (Jovino, on samba) [V]. Bossa inherits this [C].
- Jovino's "fork" cell (16th–8th–16th in one beat, steps `xx.x`) is "one of the most commonly used rhythmic figures in the music of Brazil," often with a rest for the first 16th (`.x.x`) [V].
- **This is the core rhythmic cell for Brazilian lines and licks.**
- Low volume and a restrained energy level are bossa's defining character: "the main difference [from samba] being the subdued and restrained energy level" (Jovino) [V]. The app's drum lesson already says this.

**Harmonic devices improvisers meet (from analysis of the standard bossa repertoire; LJS/Melton article [V])**

| Device | Roman numerals | Where it is shown | Tag |
|---|---|---|---|
| II7(♯11) in place of ii7 | II7(♯11) → ♭II7 → Imaj7 | *Garota de Ipanema* A section | [V] LJS |
| Tritone substitute of V | ii7 → ♭II7(♯11) → I | *One Note Samba* | [V] LJS |
| Tritone substitute of VI7 | iii7 → ♭III7 → ii7 → ♭II7 → I (a chromatic descending bass) | *One Note Samba*. **Correction:** LJS labels the D♭7 in B♭ as "♭VI7"; in B♭ it is ♭III7, the tritone substitute of VI7 (G7) | [V] LJS for the chords; the label correction is mine [V by spelling] |
| Diminished as a dominant | ♭III°7 / ♯I°7 standing for V7♭9 / VI7♭9 | *Corcovado*, *Wave* | [V] LJS |
| Backdoor and minor iv | IV → iv → I; iv7 → ♭VII7 → I | *Corcovado*, *Dindi*, *Wave* | [V] LJS |
| ♭VI borrowed | I → ♭VI(maj7) → I | *Dindi* | [V] LJS |
| ♭VII chains that never resolve | IV–♭VII, ii–♭VII sequences | Ipanema bridge | [V] LJS |
| Half-step "slide" (approach chord a semitone above or below, same quality) | e.g., D♭maj7 → Cmaj7, or E♭m7 → Dm7 | — | [C] (common jazz/bossa practice; not found stated in a source I read) |

**What improvisers do over bossa** (rule-based improvisation rules for the app)
1. Straight-8th lines with the fork cell and anticipated chord tones (land the new chord's 3rd or 7th on the "&" before the barline) [C, following Jovino's anticipation principle].
2. Lydian-dominant (melodic minor from the 5th) over II7(♯11) and ♭II7 [C] (LJS: the II7 is "borrowed from F Lydian augmented / D melodic minor" [V]).
3. Chromatic ii–V chains, where each ii–V moves down a half step, played as guide-tone lines. **Reuse the jazz core (guide tones) and add the bossa feel** [C].
4. Leave space. A 2-bar phrase plus 2 bars of rest suits the restrained style [C].
- The long-line ideal over moving harmony that SPEC-STYLE-FOCUS §9.3 mentions is [C]. I found no source that states it this way, so the card text should say "melody over moving harmony".

---

## 2. Samba and samba-jazz

### 2.1 Surdo pattern (bass and kick)

| Part | Pattern (2/4, 8 steps) | Tag |
|---|---|---|
| Primeira (marcação) | `....X...` (beat 2, the low accented drum) | [V] Wikipedia *Surdo*: "sounds on the second beat"; the accent on 2 [V] Jovino |
| Segunda (resposta) | `x.......` (beat 1, higher) | [V] Wikipedia *Surdo* |
| Combined, as one bass or kick | `x...X...`, with pickups `x..xX..x` | [V] Wikipedia *Bossa nova* (surdo ostinato 1, a, 2, a); Jovino: "the surdo patterns can also incorporate ghost notes and syncopated pick-ups" |
| Terceira (cutter) | Syncopated fills between the two; the only surdo with room to improvise | [V] Wikipedia *Surdo* |

**Bass line**
- Root–5th on the surdo figure (`x..xX..x`, R . . 5 | 5 . . R): "a dotted 8th note followed by a 16th note … most commonly moves between the root and 5th," with a slight accent on 2 and 4 (in 4/4 16th writing) [V] Hubbard.
- Patitucci: "the bass line for the samba is derived from that [surdo] drum part" (course blurb) [V].
- The ghost pickups must not "gallop". The app's drum lesson already warns about this, and PianoGroove warns against a "16th note approach" to the ghost notes, i.e., playing them full value [V].

### 2.2 Partido-alto

- **What it is.** A pandeiro beat played with a dry palm snap; "often played in samba"; the basis of the partido-alto groove, "in which more or all of the instruments accent this rhythm" (Wikipedia, citing Nei Lopes, *Partido-Alto: Samba de Bamba*, 2005) [V].
- It is a 2-bar timeline that can start in either bar. The "reverse" partido-alto starts in the other bar, like 2-3 and 3-2 clave (Hubbard; bossanova-gitarre.de via search) [V].

**Rhythm**

| Orientation | Grid (2 bars of 2/4) | Tag |
|---|---|---|
| Partido-alto | `.x..x.x.` `x.x..x.x` | **[C], flag.** Two independent descriptions agree: (1) Wikipedia *Clave (rhythm)* gives the agogô "partido alto 2:3" as `L.H..L.L|.H..L.L.`, i.e., the same hits rotated by one bar; (2) a guitar description has a high accent on the second 16th of bar 1, a chord on 2, then "four eighth notes in a row starting on the second beat" (steps 4, 6, 8, 10); (3) Hubbard: accents on "the 8th notes in beat 2" (steps 4, 6 ✓). Neither (1) nor (2) is a primary source. Confirm against Faria & Korman ch. 3, "Underlying rhythmic reference" (task B2) |
| Reverse | `x.x..x.x` `.x..x.x.` | [C], same flag; Hubbard: the reverse moves the 8th accents to beat 1 (steps 0, 2 ✓) |

**How piano and guitar comp it**
- The bass or thumb keeps the surdo halves `x...x...`.
- The chords play the timeline, or a simplified split where the bass and accompaniment share the accents (search summary of bossanova-gitarre.de) [C].
- Munro shows "two common interpretations" and a version with a syncopated bass [V that they exist; grids not read].
- Partido-alto is usually a little slower than straight samba (Hubbard) [V].
- It underlies samba-funk and fusion (Hubbard: the reverse is used in "funk and fusion") [V].

### 2.3 Samba comping (piano and guitar)

**Guitar**
- The traditional samba groove is "nearly the same rhythm as the syncopated bossa pattern," but the alternating bass is replaced by a repeated note (Munro) [V].
- So: thumb `x...x...` on one note, fingers F1/F3 at samba tempo, with more energy, chord inversions and stepwise voice leading [V Munro for inversions and voice leading].

**Piano**
- LH surdo, RH tamborim [V Jovino].
- Chords anticipated by a 16th, following the melody [V Jovino].
- Without a guitar the full rhythmic comp is fine; with a guitar, sparse [V Faria & Korman].

**Tamborim cells for the RH and fingers**
- Jovino gives two basic tamborim lines, one starting on the downbeat and one on an offbeat (his examples a and b). They are notated images I could not read [?].
- Until they are checked, use F1, F3 and the partido-alto, all of which are sourced above.
- Task B3: transcribe Jovino's examples a and b from the PDF image (rhythms are not protectable; our own drawing is fine).

### 2.4 Drums samba

| Lane | Grid (2/4 bar, 8 steps; repeat) | Tag |
|---|---|---|
| Bass drum = surdo | `x..xx..x` (each beat plus the 16th before it, the accent on beat 2) | [V] Wikipedia surdo ostinato; [C] Da Fonseca & Weiner (known, not read) |
| Hi-hat foot | `..x...x.` (the "&"s) | [C], same source; the app's d-latin level 2 |
| Snare (hands) | 16ths with accents. The app uses the accent on the "a" (`xxxXxxxX`) | [?]. Accent placement varies by source. A search summary says samba's feel comes from "the fourth sixteenth … played ahead". Check against Da Fonseca & Weiner (task B4) |
| Ride ("samba no prato") | Samba cells played on the ride cymbal "the same way bebop drummers play jazz", the left hand adding syncopated accents on the snare or toms | [V] UFMG paper (search summary); origin story credited to Edison Machado, details disputed between sources [V that they disagree] |

### 2.5 Samba-jazz (the Brazilian jazz trio)

- **Scene.** Rio's Beco das Garrafas clubs; Edison Machado, *Edison Machado É Samba Novo* (1964), "the masterpiece of samba-jazz" (Carta Capital review); Bossa Três, an early instrumental bossa trio (sources via search) [V for the claims as stated by those sources].
- **Trio specifics** [C, from the samba-jazz description above plus general practice; check task B5]:
  - The drummer plays samba on the ride and adds snare/tom accents (2.4).
  - The bass plays the surdo figure, or a "walking samba" line on the root–5th framework with chromatic approach notes.
  - The piano comps in tamborim-like stabs, block chords in the melody, and bebop lines in straight 16ths.
  - Up-tempo; jazz harmony (ii–V chains, tritone subs).

### 2.6 Tempo ranges

| Style | Tempo | Tag |
|---|---|---|
| Bossa nova | ♩ ≈ 120–160 in 4/4 cut-time writing (the app uses 110–150) | [?], no source read gives numbers; task B6 |
| Partido-alto | Slower than straight samba | [V] Hubbard (relative only) |
| Samba (2/4 quarter) | Medium to fast; samba-jazz fast | [?] |
| Reference, from Jovino | Marcha-rancho 70–90, frevo 120–180 (2/4 quarter) | [V] Jovino |

---

## 3. Baião

### 3.1 Rhythm

| Element | Pattern (2/4, 8 steps) | Tag |
|---|---|---|
| Zabumba, low (mallet, top skin) | `x..x..x.` (the 3-3-2 cell). Jovino says 3-3-2 "underlies the family of Northeastern grooves related to baião (xaxado, coco, forró, arrasta-pé), representing the zabumba drum pattern"; its main mark is "a syncopated low drum figure (compare with the non-syncopated bass drum in samba)" | [V] Jovino |
| Zabumba, high (bacalhau stick, bottom skin) | Offbeats between the mallet strokes | [V] that it plays offbeats (Côrtes; Jovino). The exact grid is **[?]** because the examples were images (task B7) |
| Triangle | 16ths, accenting the offbeats: `xXxXxXxX` (or accents on the "&"s) | [V] Côrtes: "mantém a subdivisão de semicolcheias acentuando os contratempos". **[?]** whether "contratempos" means the "&"s or every second 16th; see task B7 |
| Accordion | 16ths accented 3+3+2 (tresillo); also "jogo de fole", a repeated note in 16ths | [V] Côrtes |
| Meter | 2/4 | [V] Wikipedia *Baião* |
| Melodic accent | "accents on the 4th 8th note of each measure" | [V] Jovino |

**The baião bass**

| Line | Grid | Tag |
|---|---|---|
| Classic | 4/4, 16 steps: `x..x....x..x....`, i.e., per 2/4 bar `x..x....` with the second note **tied over beat 2** | [V] Two teaching sources agree: Hubbard (the dotted 8th–16th "only on beats 1 and 3", the 16th anticipations "must be played with precision"); Patitucci (course excerpt: dotted quarter, an 8th on the "&" of 2 tied to a half note, in 8th writing). Jovino: the syncopated low figure is the style's mark |
| Notes | R on 1, 5 (or the octave) on the anticipation | [C] |

- Drum set: kick on the low zabumba notes, snare or rim on the high or dry strokes, hi-hat or ride on the triangle (Soundbrenner blog; Edu Ribeiro's lesson does the same) [C, with weak sources].
- Task B7: confirm against Da Fonseca & Weiner and Faria & Korman ch. 5.

### 3.2 Comping

- **Guitar.** "The bass is syncopated while the chords on top are not, and there is typically no alternating bass line"; often one chord shape with only the bass changing (Munro) [V].
  - Grid: chords on the 16th-pulse accents (e.g., `x.x.x.x.` 8ths, or the triangle accents) over the bass `x..x....` [C].
- **Piano.** LH = the baião bass; RH = 8ths or the 3-3-2 cell with dominant-7 voicings [C].

### 3.3 Modal colour: verified, with a correction

| Claim | Status |
|---|---|
| Baião melodies use mixolydian | **[V]** Jovino: "built on the mixolydian mode with either the just 4th or the augmented 4th". Côrtes: the main modes are mixolydian and **dorian**, from the cantoria tradition. Wikipedia *Escala nordestina* (citing Adolfo, *Composição*, 1997): the term usually means mixolydian, "used extensively in baião and frevo" |
| The Northeastern scale includes lydian ♭7 (= jazz lydian dominant, the acoustic scale) | **[V]** Adolfo (via Wikipedia): mixolydian, lydian ♭7, dorian, all rejecting the major-7th leading tone. Jovino: mixolydian "with … the augmented 4th" = lydian ♭7 |
| **Lydian ♭7 is characteristic of Luiz Gonzaga's baião** | **Corrected, so do not claim it.** Côrtes (2014): the hybrid mixolydian ♯4 appears in *cantoria* melodies **but was not found in Gonzaga's compositions** |
| Modal melody over tonal cadences | [V] Côrtes: a modal "fricção" (friction) with tonal cadences; some songs are purely tonal |
| Typical vamps | [V] Jovino: one chord (usually a dominant 7th), or C6–G7, C7–F7, Cm7–F7. Côrtes: I7 alternating with IV7 (non-functional dominant-type chords); Im7–IV7 = "the dorian sound", then a tonal Im7–V7–Im7 at phrase ends |
| II with an augmented 4th (supertonic with ♯4) is common | [?] Wikipedia *Baião*, mis-cited (the attribution to Guerra Peixe points to a Cascudo reference). Keep out |

- **What the app teaches:** "baião = mixolydian (and dorian over minor); the lydian-dominant ♯4 is a Northeastern (cantoria) colour."
- **The jazz link:** lydian dominant over a I7 vamp is already in the app's chord-scale rotation [C].

---

## 4. Choro (briefly)

### 4.1 The style's role

- Choro is instrumental, from 19th-century Rio, "considered the first characteristically Brazilian genre of urban popular music."
- It is marked by virtuosity, improvisation, modulation, syncopation and counterpoint.
- Ensemble: flute, cavaquinho, 6-string guitar, **7-string guitar on bass lines**, pandeiro.
- Usual form: a rondo, **AABBACCA**, with sections in different keys (the main key → the relative key → the subdominant key).
- (Wikipedia *Choro*, citing Livingston-Isenhour & Garcia 2005, Béhague/Grove) [V]
- Early samba composers were chorões (Donga, Pixinguinha, Sinhô) (Faria & Korman) [V].
- Its harmony feeds samba and bossa (Wikipedia *Bossa nova*: samba guitarists used similar structures from the 1920s) [V].

### 4.2 Baixaria

- Baixaria = the bass lines of the 7-string guitar in choro, "often in the form of countermelody."
- Dino 7 Cordas (1918–2006) and Raphael Rabello are its central exponents.
- A UFRJ dissertation catalogues 46 of Dino's recorded baixarias (search summaries of UFRJ, UFG and Wikipedia) [V for the definition and the names; I read only abstracts].
- **App use (author's proposal [?]):**
  - a bass/guitar "baixaria" rung: scalar and chromatic bass counter-lines connecting chord roots across 1–2 bars, especially into the relative minor and through diminished passing chords;
  - written by us from the conventions; never copy Dino's lines (he died in 2006, so recordings and transcriptions are protected).

### 4.3 Public-domain melody source (US: published ≤1930)

- **The rule.** All works published before 1 January 1931 are PD in the US. This includes foreign works, because the 95-year term from publication has run out even for restored works (see `PD-JAZZ-SOURCES.md` §1.1, Circular 15A) [V there].
- **Use only period first editions** (IMSLP, Biblioteca Nacional digital collection). A modern edition's editorial additions can carry a new copyright [C, as in PD-JAZZ-SOURCES].

| Work | Composer | First publication (as IMSLP reports it) | Status |
|---|---|---|---|
| *Querida por todos* (polka) | Joaquim Callado | Narciso & Cia, Rio, n.d. (ca. 1867) | [V] IMSLP; the date is approximate but certainly 19th century |
| *A flor amorosa* (polka) | Joaquim Callado | 1880 (Narciso, Arthur Napoleão & Miguéz, n.d., ca. 1880) | [V] IMSLP (approximate date) |
| *Atraente* (polka) | Chiquinha Gonzaga | 1877 (Viúva Canongia, *Flores Brasileiras*; also Narciso, Napoleão & Miguéz) | [V] IMSLP |
| *Gaúcho* ("Corta-jaca", tango) | Chiquinha Gonzaga | Composed ca. 1895; IMSLP's score is **undated**, publisher unknown; recordings 1906–1912 | **[?]** Almost certainly printed long before 1931, but a dated edition is needed. Under the 1909 Act a recording was not publication (task B8) |
| *Brejeiro* (tango) | Ernesto Nazareth | 1893, Fontes & Cia, Rio | [V] IMSLP |
| *Odeon* (tango brasileiro) | Ernesto Nazareth | 1910, Casa Mozart (E. Bevilacqua & Cia) | [V] IMSLP |
| *Ameno Resedá* (polka) | Ernesto Nazareth | 1913, Arthur Napoleão | [V] IMSLP |
| *Tenebroso* (tango) | Ernesto Nazareth | [1913], Arthur Napoleão, plate 7428 | [V] IMSLP |
| *Apanhei-te, cavaquinho* (polka) | Ernesto Nazareth | 1914, Casa Mozart (n.d., ca. 1914) | [V] IMSLP |
| *Escorregando* (tango brasileiro) | Ernesto Nazareth | 1923, publisher unidentified (plate 1818) | [V] IMSLP |
| *Tico-tico no fubá* | Zequinha de Abreu | Published 1930 according to an AllMusic-derived biography only; composed ca. 1917 | **[?]** Borderline. It is PD only if the 1930 printing is confirmed. Use the instrumental melody only; the 1931 Portuguese and 1942-era English lyrics are separate later works (task B9) |
| *Carinhoso*, *Lamentos*, *Rosa*, *Um a zero* | Pixinguinha | **No first-publication date found.** *Carinhoso*: composed ca. 1917 (the date is disputed), first recorded 1928, the famous lyric 1937 | **[?] Keep out.** IMSLP treats his works as copyrighted (under its own non-US rule), which signals that no verified early edition is on file. Recording dates do not count (task B10) |

- **Recommendation:** the Nazareth, Callado and Chiquinha Gonzaga [V] rows are a safe first choro set: 8 titles, polkas and tangos, playable on piano, with melodies for every instrument.
- Musically, Nazareth's "tangos brasileiros" are piano pieces close to maxixe and choro rather than choros for a regional ensemble [C]; label them as such.

---

## 5. Progressions for 12-key practice (generic, not from any one tune)

- Chord progressions are not protectable [V, PD-JAZZ-SOURCES].
- Each line combines devices whose use in the style is sourced. The specific 4- and 8-bar sequences are our own.

**Bossa**

| # | Name | Roman numerals (one chord a bar unless marked) | Device source |
|---|---|---|---|
| BN1 | Bossa ii–V–I | ii m7(9) – V7(13) – Imaj9 – I6/9 | [C] |
| BN2 | With ♭II7 | ii m7 – ♭II7(♯11) – Imaj7 – Imaj7 | [V] LJS |
| BN3 | II7(♯11) opening | Imaj7 – Imaj7 – II7(♯11) – II7(♯11) – ii m7 – ♭II7 – Imaj7 – (♭II7) | [V] LJS (device); the sequence is ours |
| BN4 | Chromatic descent | iii m7 – ♭III7 – ii m7 – ♭II7(♯11) – Imaj7 (2 beats each in the first 4) | [V] LJS |
| BN5 | Turnaround with secondary dominants | Imaj7 – VI7(♭9) – ii m7 – V7(♭9); variant Imaj7 – ♯I°7 – ii m7 – V7 | [C]; the ♯I° as a dominant [V] LJS |
| BN6 | Minor iv and backdoor | IVmaj7 – iv m6 – iii m7 – ♭III°7 – ii m7 – V7 – I; or iv m7 – ♭VII7 – Imaj7 | [V] LJS |
| BN7 | ♭VI colour | Imaj7 – ♭VImaj7 – Imaj7 – ♭VImaj7 | [V] LJS (borrowed ♭VI) |
| BN8 | Minor bossa | i m6/9 – iv m7 – ii ø7 – V7(♭9) – i m6 – ♭VI7 – ii ø7 – V7(♭9) | [C]; minor ii–V and ♭VI7 → V7 are standard jazz practice |
| BN9 | Unresolved ♭VII chain (bridge-type) | IVmaj7 – ♭VII7 – iv m7 – ♭VII7 (a step up, repeated) | [V] LJS |

**Samba and choro**

| # | Name | Roman numerals | Source |
|---|---|---|---|
| SA1 | Samba cycle | I – VI7 – ii – V7 (2 beats each in 2/4 = a bar each) | [C] |
| SA2 | Samba cadence, I7 to IV | I – I7 – IV – iv – I – VI7 – ii – V7 | [C]; minor iv [V] LJS |
| SA3 | Minor samba | i – i – V7 – V7 – V7 – V7 – i – (V7/iv) ; iv – i – V7 – i | [C] |
| SA4 | Choro-style passing diminished | I – ♯I°7 – ii – ♯II°7 – iii – VI7 – ii – V7 | [C], diminished passing [V] LJS (in a bossa context) |
| SA5 | Modulate to the relative minor and the subdominant (choro form) | Section A in I; B in vi (via V7/vi); C in IV (via I7) | [V] Wikipedia *Choro* (the key plan) |

**Baião**

| # | Name | Roman numerals | Source |
|---|---|---|---|
| BA1 | Dominant vamp | I7 (mixolydian, 4–8 bars) | [V] Jovino |
| BA2 | I7–IV7 | I7 – IV7 – I7 – IV7 | [V] Jovino ("C7–F7"); Côrtes |
| BA3 | I6–V7 | I6 – V7 – V7 – I6 | [V] Jovino ("C6–G7") |
| BA4 | Dorian vamp, then a tonal close | i m7 – IV7 – i m7 – IV7 – i m7 – V7 – i m7 | [V] Jovino ("Cm7–F7"); Côrtes (Im7–IV7, then Im7–V7–Im7) |

**12 keys:** every row is transposable. The app's existing key-cycling (by 4ths, or by the weakest key first) applies unchanged.

---

## 6. Proposed exercise ladder per instrument (author's proposal [?] where not sourced)

**Common rules for all ladders**
- Every item starts untimed (rubato), then climbs a tempo ladder ("rubato then tempo").
- Count-in, click and a visual now-cue throughout ("timing cue always").
- 12 keys from T2.
- Hands-free takes.
- Tempo values: 4/4 cut-time ♩ for bossa; 2/4 ♩ for samba and baião (= the half note if the app writes them in 4/4).
- All tempos are **[?]** until task B6. They are scaled to the T-tier note-rate table in SPEC-COACH-2 §1.

**Piano**

| Tier | Bossa | Samba / partido-alto | Baião / choro |
|---|---|---|---|
| T0 | LH alone `x...x...` R–5 on I–V (2 chords), ♩70–90 | — | — |
| T1 | LH + RH F1, block shells (3–7), ii–V–I in C, F, G, ♩80–100 | Surdo LH `x...X...` alone | — |
| T2 | F1/F2 with rootless 4-way close, BN1/BN2, 12 keys, ♩90–120 | LH surdo + RH F1 at 2/4 ♩60–80 | Baião LH bass + RH 8ths on BA2 |
| T3 | Anticipated changes (F5), LH pickups, BN4/BN5, ♩100–130 | Partido-alto RH (after B2 is checked), SA1/SA2 | BA3/BA4; choro SA4 in 2/4 |
| T4 | 6/9 and quartal RH, BN6/BN7, variation rung (random F-cells), ♩110–150 | 16th-anticipated chords, ♩80–100 | Baião in 12 keys, mixolydian RH fills |
| T5 | "With guitar": pads and counter-lines (Faria & Korman), comp + solo over BN3/BN8 | Samba-jazz trio comping, ♩100–120 | Choro PD piece (Nazareth) hands together, slow |
| T6 | Full bossa standard changes (chords only) in 12 keys with the band | Samba-jazz up-tempo, ♩120+ | Nazareth at tempo |

**Guitar**

| Tier | Bossa | Samba / partido-alto | Baião / choro |
|---|---|---|---|
| T0 | Thumb alone `x...x...` on 1 chord; grips maj7 and m7 (6th-string root) | — | — |
| T1 | Thumb + F1 on one chord, then ii–V–I; 5th-string grips, ♩70–90 | — | — |
| T2 | T2 root–5th thumb + F2 (clave comp); 7(9), 7(13), 6/9 grips; 12 keys, ♩80–110 | Thumb on one note + F1, 2/4 ♩60–80 (Munro) | Baião: one shape, bass moving (Munro), BA1/BA2 |
| T3 | F3 (after B1 is checked), F5 anticipation; BN2/BN4, ♩90–130 | Samba with inversions, SA1/SA2 | BA3/BA4 |
| T4 | dim7, 7(♭9), II7(♯11) grips; BN5–BN7; variation rung | Partido-alto (after B2), ♩70–90 | Choro accompaniment SA4/SA5 |
| T5 | Chord-melody of a PD choro melody over bossa time [?] | Samba ♩90–110; samba-jazz comping | Baixaria counter-lines on 6/7 strings (our own) |
| T6 | Bossa standards (chords only) in 12 keys with the band | Samba-jazz ♩110+ | Choro PD tune at tempo (melody + accompaniment roles) |

**Bass**

| Tier | Bossa | Samba | Baião / choro |
|---|---|---|---|
| T0 | B0 halves R–5, ♩70–90 | — | — |
| T1 | B1 dotted figure on one chord | Surdo halves `x...X...` (2/4 ♩60–70) | — |
| T2 | B1 on BN1, 12 keys, ♩90–120 (exists in b-styles 7; add the ladder) | Surdo with pickups (exists in b-styles 8) | Baião bass `x..x....` R–5, BA2 |
| T3 | B2 anticipations, BN4 chromatic roots | Root–5th with 16th-precise pickups, ♩80–100 | Baião in 12 keys |
| T4 | Bossa over standard changes (exists: b-walk 14) | Partido-alto bass (after B2) | Baixaria scale connections, SA4 |
| T5 | Bossa-to-walk switch (a common jazz arrangement) [?] | Samba-jazz "walking samba" [?] (B5) | Choro bass lines in AABBACCA keys |
| T6 | Full charts with the band | Samba-jazz up-tempo | — |

**Drums (no keys; grooves by tempo)**

| Tier | Bossa | Samba / samba-jazz | Baião |
|---|---|---|---|
| T0 | Hats 8ths + kick `x..xx..x` | — | — |
| T1 | + cross-stick clave 3-2 (exists, d-latin 1) | Feet only (exists, d-latin 2) | — |
| T2 | 2-3 clave; ride + hi-hat foot | + ride 8ths | Kick `x..x....` + hats |
| T3 | Brushes bossa | + snare 16ths with accents (after B4) | + rim/snare on the high strokes (after B7) |
| T4 | 2-bar fills and return | Partido-alto on the snare/rim | Triangle pattern on the hats |
| T5 | Bossa ↔ swing switches | Samba no prato (ride cells + left-hand accents) | Baião with an e-kit (zabumba mapping) |
| T6 | Trading 4s in bossa | Samba-jazz trading at ♩120+ | — |

**Voice**

| Tier | Content |
|---|---|
| T1–T2 | Bossa feel: straight 8ths, no vibrato, soft (exists in voiceCourse); the fork-cell rhythm drill on one pitch [V cell: Jovino] |
| T3–T4 | Anticipated phrase starts; sing a PD choro melody slowly |
| T5–T6 | Scat over BN2/BN4 with lydian dominant on ♭II7/II7 |

**Improvise (all instruments)**

| Tier | Content |
|---|---|
| T2 | Fork-cell rhythms on chord tones over BN1 |
| T3 | Land the 3rd/7th on the anticipation |
| T4 | Lydian dominant over II7(♯11) and ♭II7 |
| T5 | Mixolydian and dorian over baião vamps; ♯4 as a colour |
| T6 | Samba-jazz lines in straight 16ths |

---

## 7. Style recognition cues (ear game)

| Cue | Bossa nova | Samba | Baião |
|---|---|---|---|
| Energy and volume | Soft, intimate, "subdued and restrained" [V Jovino] | Loud, dense percussion; fast [V Jovino, by contrast] | Bright, dance-forward; accordion and triangle [V Côrtes] |
| Low drum or bass | Surdo figure at half time: long-short, 1 and 3 with light pickups [V] | The same figure at double density, a strong accent on beat 2 (2/4) [V] | **Syncopated low part, tied over beat 2** (`x..x....`) versus samba's non-syncopated surdo [V Jovino] |
| Signature top layer | Cross-stick bossa clave; nylon-string guitar batida [V] | Tamborim/pandeiro 16ths; partido-alto accents [V] | Triangle 16ths with offbeat accents; 3-3-2 accordion [V Côrtes] |
| Harmony | Rich: maj7/6-9, II7(♯11), ♭II7 chromatic motion [V LJS] | Functional cycles (I–VI7–ii–V), choro-like diminished chords [C] | One dominant-7 vamp or I7–IV7; mixolydian/dorian melody [V Jovino, Côrtes] |
| Tempo | Medium [?] | Medium-fast to fast [?] | Medium [?] |

**Game design** (author's proposal [?]):
- Stage 1: bossa vs swing (exists).
- Stage 2: bossa vs samba. Contrast the density and the beat-2 accent.
- Stage 3: samba vs baião. Listen for the low drum: straight vs tied/syncopated.
- Stage 4: add partido-alto vs straight samba, with the timeline's offbeat beat-2 accents.
- The bossa vs samba pair should share a tempo band (bossa ♩140 cut time ≈ samba ♩70 in 2/4) so the player judges by density and energy, not speed. This mirrors the existing lesson, "the drum pattern decides".

---

## 8. Fit with the app (what exists vs. this research)

**The inventory is slightly out of date.**
- Guitar already has a bossa rhythm: `guitar.ts` g-rhythm 6, "thumb bass + chord plucks", which is the F2 clave comp with T1 thumb.
- `guitarJazz.ts` has a 'bossa' comping rhythm for standards.
- Both match [C] patterns above.
- Piano has none.

**The band's bossa comping** (`band.ts`: hits at beats 0, 1.5, 3 | 1, 2.5) = the bossa clave 3-2 (F2) [C]. Suggested refinements:
- alternate it with F1 and F3;
- move the chord to the "&" before a change (F5);
- keep the volume low.

**d-latin bossa and samba match [V]/[C] above.** Additions are listed in the §6 drums ladder.

**The swing ratio must be 0** wherever a Brazilian groove plays (§0.2).

---

## 9. Verification tasks (before any [?] ships)

| # | Check | Where |
|---|---|---|
| B1 | Bar 2 of the two-bar batida F3 | Faria, *The Brazilian Guitar Book* (bossa chapter); Adolfo, *Brazilian Music Workshop* |
| B2 | Partido-alto grid and orientation | Faria & Korman ch. 3, "Underlying rhythmic reference"; Nei Lopes 2005 |
| B3 | Jovino's tamborim examples a/b | Read the notated images in "Ginga" (jovisan.net PDF) |
| B4 | Samba snare accent placement | Da Fonseca & Weiner, samba chapter |
| B5 | Samba-jazz trio bass/piano practice | Faria & Korman ch. 1 performance notes; a samba-jazz study (e.g., the UNIRIO dissertation on the ride cymbal in samba, found in search) |
| B6 | Tempo ranges for bossa, samba, partido-alto, baião | Faria & Korman (each chapter's general information); Da Fonseca & Weiner tempo marks |
| B7 | Zabumba high strokes, triangle accents, drum-set baião | Côrtes Ex. 1 (images); Jovino's baião examples; Faria & Korman ch. 5 |
| B8 | A dated pre-1931 edition of *Gaúcho/Corta-jaca* | Biblioteca Nacional (Brazil) digital catalogue; Instituto Moreira Salles Chiquinha Gonzaga collection |
| B9 | *Tico-tico no fubá*, 1930 printing | Biblioteca Nacional; original publisher's plate |
| B10 | Any Pixinguinha title printed ≤1930 | Instituto Moreira Salles (Pixinguinha archive); Biblioteca Nacional |
| B11 | Levine's Latin chapter content (for citing the piano voicings as [V]) | *The Jazz Piano Book* |

---

## Summary

- **Verified and buildable now:**
  - the bossa thumb (1 and 3, root–5th, surdo pickups), the basic one-bar finger figure (1, 2, &3), the bossa-clave comp (3-2 / 2-3) and anticipated changes;
  - piano LH-surdo / RH-tamborim with rootless voicings, and Faria & Korman's "sparse with a guitar" rule;
  - the bossa bass (the samba figure at half time) and the bossa drums (already in d-latin, confirmed);
  - the samba surdo roles and figure; the baião 3-3-2 zabumba cell and the tied bass;
  - straight 16ths for everything;
  - the bossa harmonic devices (II7♯11, ♭II7, ♭III7 as the tritone substitute of VI7, a correction to LJS's "♭VI7" label, diminished-as-dominant, minor iv, backdoor);
  - 18 generic progressions for 12 keys.
- **Corrected:** "lydian ♭7 is typical of baião" is only half right. The Northeastern scale includes it (Adolfo; Jovino), but Côrtes found it in cantoria and *not* in Luiz Gonzaga's compositions. Teach mixolydian and dorian as the baião modes, and the ♯4 as a Northeastern colour.
- **Public domain (US):** 8 choro-family titles have verified pre-1931 first publication:
  - Callado: *Querida por todos*, *A flor amorosa*;
  - Chiquinha Gonzaga: *Atraente*;
  - Nazareth: *Brejeiro*, *Odeon*, *Ameno Resedá*, *Tenebroso*, *Apanhei-te cavaquinho*, *Escorregando*.
- **Still [?], held out:** *Corta-jaca* (undated print), *Tico-tico* (1930 per one bio), and **all Pixinguinha** (no publication date found).
- **[?], still to check:** the exact two-bar batida (bar 2), the partido-alto grid (two secondary sources agree), the samba snare accents, the zabumba high strokes, and all tempo ranges. There are 11 check tasks (§9), mostly against Faria & Korman, Faria's guitar book and Da Fonseca & Weiner.
- **App gaps:** piano has no Brazilian content; the guitar inventory under-reports (a bossa clave comp exists); the band's bossa should rotate the comp figures and anticipate changes; baião and samba-jazz need building on every instrument.

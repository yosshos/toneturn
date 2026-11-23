# Afro-Cuban and Latin jazz: style research (for SPEC-JAZZ-NEIGHBOURS §3 and SPEC-STYLE-FOCUS)

**Date:** 2026-11-22. **Status:** research only. No code was changed.
**Update 2026-11-23:** §2.5–2.8 add the researched cha-cha-chá, bolero, mambo and Latin-boogaloo findings (with sources); the verified parts are built as k-montuno 13–20, the band's `chacha` / `bolero` styles and the drum-style ear game.

**Tags (the owner's rule: only verified theory)**

| Tag | Meaning | What happens to it |
|---|---|---|
| **[V]** | Verified: I read a source this session that states it. The source is cited. | Can be built. |
| **[C]** | Common practice: standard teaching that mainstream sources state. I name the source, but I did not read that exact page this session. | Can be built. The owner or a teacher should spot-check the first items. |
| **[?]** | Unverified: my own construction or memory, or the sources disagree. | Stays out of the app until checked. Each one ends with what to check. |

**Copyright:** rhythms, clave, bell patterns, comping patterns and chord progressions are not protectable. Every grid below is written for this document from the conventions. No published transcription is reproduced. Melodies come only from public-domain works (§6.5).

---

## 0. Sources: what I read and what I only know of

**Read this session:**
- Wikipedia: *Clave (rhythm)*, *Tumbao*, *Guajeo*, *Bell pattern*, *Songo music*, *Cha-cha-chá (music)*, *Bolero*. These pages summarise Peñalosa, Moore, Mauleón, Santos and others with page references. Every [V] below goes back to one of these pages and names the original author it cites.
- Soundbrenner, "Mambo rhythm" (low authority; used only to confirm the bass anticipation on the "&" of 4).
- Library catalogue record, found through a search: *The Peanut Vendor = El manisero*, E.B. Marks, ©1930.
- Reports on Public Domain Day 2026 (NPR; Columbia University Libraries): works published in the US in 1930 entered the public domain on 1 January 2026.
- The app's code: `src/engine/drills/bassNiche.ts` (b-latin), `drumStyles.ts`, `drumLatin2.ts`, `drums.ts`, `grooves.ts`, `guitar.ts` (g-rhythm 6), `band.ts`, `drumEar.ts`, `verifiedContent.ts`.

**Known of, not read.** These are the books to buy or borrow to promote [C] and [?] items to [V]:

| Author | Work | Use it for |
|---|---|---|
| Rebeca Mauleón | *Salsa Guidebook for Piano and Ensemble* (Sher, 1993) | montunos, bass, the percussion parts, the mambo bell, cha-cha, bolero |
| Rebeca Mauleón | *101 Montunos* (Sher, 1999) | the montuno ladder by style |
| David Peñalosa | *The Clave Matrix* (Bembe, 2009/2010) | the onbeat/offbeat motif, the tumbao, the bell |
| Kevin Moore | *Beyond Salsa Piano* (2009–2011); *Understanding Clave and Clave Changes* (2011) | identifying the clave, clave changes, songo and timba tumbaos |
| Ed Uribe | *The Essence of Afro-Cuban Percussion and Drum Set* | cáscara, mambo, songo and 6/8 on the kit |
| Chuck Silverman | his Afro-Caribbean drum-set books (exact title to confirm) | kit adaptations |
| J. L. "Changuito" Quintana | *Changuito: A Master's Approach to Timbales* (Alfred, 1998) | songo |
| Lincoln Goines and Robby Ameen | *Funkifying the Clave* (1990) | songo, bass and drums |
| Peter Manuel | "The Anticipated Bass in Cuban Popular Music", *Latin American Music Review* (1985) | the tumbao as an anticipated bass |
| Godfried Toussaint | *The Geometry of Musical Rhythm* (2013) | rhythm |

**Oscar Hernández:** I could not pin down a specific method book by him. Don't cite him until a title is found.

**Grid convention used below (unless stated otherwise):**
- One clave cycle = **two bars of 4/4 in 8ths = 16 cells**, positions 0–15:
  `1 & 2 & 3 & 4 & | 1 & 2 & 3 & 4 &`
- `x` = a hit, `.` = a rest, `|` = the bar line.
- Much Cuban music is written in **cut time (2/2)** with the whole clave in **one** bar of 16ths [V, Wikipedia *Clave*]. The two notations are equivalent, but **every part in a drill must use the same one** (see Finding F1).
- 6/8 grids: one cycle = **12 cells** (one bar of 12/8, or two bars of 6/8).

---

## 1. Clave literacy

### 1.1 The patterns

| Pattern | Grid (16 cells) | Positions | Tag |
|---|---|---|---|
| Son clave 3-2 | `x..x..x.\|..x.x...` | 0, 3, 6, 10, 12 | [V] |
| Son clave 2-3 | `..x.x...\|x..x..x.` | 2, 4, 8, 11, 14 | [V] |
| Rumba clave 3-2 | `x..x...x\|..x.x...` | 0, 3, **7**, 10, 12 | [V] |
| Rumba clave 2-3 | `..x.x...\|x..x...x` | 2, 4, 8, 11, **15** | [V] |

- **Source** [V]: Wikipedia *Clave (rhythm)*.
  - It gives son clave on the 16th grid of one 4/4 bar as 1, 1a, 2&, 3&, 4.
  - It gives rumba clave as 1, 1a, **2a**, 3&, 4. The third stroke is delayed by one cell.
  - Reversing the two halves turns 3-2 into 2-3.
- **Names** [V]: the half with three strokes is the "three-side". The half with two strokes is the "two-side".
- **The 6/8 rumba clave** (12 cells): `x.x..x.x.x..` = 0, 2, 5, 7, 9 [V]. Wikipedia gives it in 12/8 as 1, a, 2a, 3&, 4. Wikipedia also notes this form is "not traditionally played in 6/8" notation, even though it can be written that way.
- **The 6/8 standard bell / bembé bell** (12 cells): `x.x.xx.x.x.x` = 0, 2, 4, 5, 7, 9, 11 [V].
  - Wikipedia *Bell pattern*: strokes on 1, 1a, 2&, 2a, 3&, 4, 4a.
  - Wikipedia *Clave*: it "contains" the strokes of the clave; it is the key pattern of bembé; it is the bell that players tend to know in triple-pulse Latin jazz.
  - Teaching point [V]: the 6/8 clave is the bell with two strokes taken out (positions 4 and 11).

### 1.2 How musicians tell the clave direction

- **The main test** [V] (Wikipedia *Clave*, after Moore):
  - Look at where the chord progression starts. "When the progression begins on the three-side, the song or song section is said to be in 3–2 clave."
  - "The harmonic progression, rather than the rhythmic progression, is the primary referent."
- **Melody** [V]: phrases can cross from one side to the other. A song can flip direction at an inserted 2/4 bar (a "clave change"). Wikipedia's example is "Que vengan los rumberos".
- **Rhythm-section cues** [V/C]:
  - The piano guajeo's **offbeat bar is the three-side** in the onbeat/offbeat motif [V] (Wikipedia *Guajeo*, after Moore and Peñalosa; see §2.1).
  - The bass tumbao's "bombo" note marks the three-side; see §4 [V].
- **Clave doesn't have to sound** [V]. Peñalosa (via Wikipedia): music can be "in clave" without the clave pattern being played. So the ear game must also cover tracks **without** a clave instrument.

### 1.3 "On the clave", "against the clave", cruzado

- **In clave (en clave)** [V]:
  - John Santos (*Modern Drummer*, 1986, via Wikipedia): music in clave produces a natural swing.
  - Music "out of clave" is treated as an error unless it is done on purpose.
- **Cruzado (crossed)** [V]:
  - Kevin Moore's analogy (via Wikipedia): like shoes on the wrong feet. Clave **direction** is relative, but clave **alignment** is absolute.
  - A part written for 2-3 played over 3-2 sounds wrong in a way you can't fix by moving it around.
- **What this means for the app** [C]: "playing on the clave" = the part's own two-bar shape lines up with the clave's sides. Examples:
  - the piano's offbeat bar falls on the three-side;
  - the bass's bombo falls on the three-side's second stroke.

### 1.4 Teaching drills (all [C] unless stated)

These are standard in the methods listed in §0. They are easy to measure in the app.

1. **Clap the clave, step the pulse.** Feet on the quarter notes (or on the half notes in cut time); hands on son 3-2. Then 2-3. Then rumba.
2. **Count it, then say it.** Say the positions aloud while clapping ("ONE, a, AND… | two, three").
3. **The clave against a part.** One hand plays the clave and the other hand plays the tumbao (bass rhythm 2& and 4), the cáscara or the bell. Keys and drums can do this two-handed. On guitar and bass: tap the clave with the foot (or the metronome plays it) while you play.
4. **Sing the clave and play a part.** Sing or count the clave aloud while playing the montuno or tumbao. This is the classic test that you've internalised it.
5. **Hear the direction (ear).** A two-bar progression plus a montuno with no clave sounding: answer 3-2 or 2-3. Then reveal the clave.
6. **Flip drill.** The band plays 3-2. At a cue, insert one 2/4 bar (or drop two beats), so the clave now reads 2-3 against your unchanged part. Re-align. This needs Moore's clave-change book to promote it to [V]; mark the drill [?] until then.
7. **6/8 bell over a dotted-quarter pulse.** Then the 6/8 clave inside the bell. Then hear the 3-over-2 (a 4/4 pulse felt against the 6/8 bell).

---

## 2. Piano: montuno / guajeo (no Afro-Cuban content in the app today)

### 2.1 The verified framework

**The guajeo** [V] (Wikipedia *Guajeo*):
- An ostinato that started on the **tres** in 19th-century changüí and son.
- Arsenio Rodríguez layered guajeos from about 1934 and moved them to the **piano** in the late 1930s.
- Jazz chords entered piano guajeos in the 1940s.
- "Most guajeos have a binary structure that expresses clave."

**The onbeat/offbeat motif** [V] (Peñalosa calls it the "offbeat/onbeat motif"; Moore 2011 says it is "much more common" today):
- The **three-side bar is played entirely on offbeats**, and the two-side bar on the beat.
- **2-3:** starts on the downbeat (the onbeat bar first).
- **3-2:** the same harmonic sequence, with the attack points of the two bars swapped. It opens with an offbeat pickup just before beat 1.
- Most salsa piano guajeos use the **2-3** form.

**The clave motif** [V]: an older type in which the three-side is decorated with a **cinquillo** in its bar.

**Ponchando** [V]: a block-chord figure that marks attack points, repeated strictly or varied. A simpler form of accompaniment.

**Songo / timba tumbaos** [V]:
- Los Van Van's "Con el bate de aluminio" (1979) has steady right-hand **onbeats** over **i–♭VII–♭VI**.
- Gonzalo Rubalcaba developed pattern and harmonic displacement in the 1980s, and timba adopted it in the 1990s (Wikipedia *Tumbao*, after Moore).

**Voicing conventions** [C] (Mauleón 1993 and *101 Montunos*; check on first build):
- The right hand plays the top line **in octaves** (thumb and fifth finger), with one or two chord tones inside.
- The left hand doubles the line one or two octaves lower.
- The figure **alternates the octave note with the inner chord tones** (broken chord), so the pattern sounds like a moving line.
- Chord changes are often **anticipated by an 8th**.

### 2.2 The basic patterns, in C, as degrees

**What's verified and what isn't:**
- **Rhythm (the motif level)** [V]: the attack grid follows the onbeat/offbeat motif above.
- **The pitch line** [V generic, 2026-11-23]: checked against published pedagogy (docs/THEORY-QUESTIONS.md question 13 has the URLs). Several independent sources agree on the generic shape: a looped two-bar ostinato (Moore, *Beyond Salsa Piano* v.1 glossary; Wikipedia *Guajeo*); a chord tone (root, 3rd or 5th) in octaves with two chord tones inside, alternating outer–inner (pianowithjonny; thejazzpianosite; MusicRadar / Keyboard; Sonny Bravo via Wikipedia); a stepwise, voice-led line; the left hand doubling. P1 below fits all of it. The app's generator keeps one line note per chord, so the figure loops note for note. Mauleón's own lines (*101 Montunos*) were not read; the app's lines are generic, not a transcription.

**Rhythm grids (one chord per half bar):**

| Version | Grid (16 cells) |
|---|---|
| 2-3 (onbeat bar first) | `x.x.x.x.\|.x.x.x.x` |
| 3-2 (offbeat bar first; the pickup is cell 15 of the previous cycle) | `.x.x.x.x\|x.x.x.x.` |

**P1. I–IV–V–IV** (C F | G F), 2-3. Octave = the line note doubled at the octave; inner = the other chord tones, below the top.

| Cell | 0 | 2 | 4 | 6 | 9 | 11 | 13 | 15 |
|---|---|---|---|---|---|---|---|---|
| Chord | I | I | IV | IV | V | V | IV | IV |
| RH | 8ve on 5 | 1+3 | 8ve on 3 | 1+5 | 8ve on 3 | 1+5 | 8ve on 3 | 1+5 |
| In C | G | C+E | A | F+C | B | G+D | A | F+C |

- The top line is G – A – B – A, stepwise. The left hand plays the octave notes.
- **3-2:** the same pitches, with the rhythm from the 3-2 grid.
- Chord change on the "&" (the anticipated version): the cell before each new chord takes the new chord's inner tones [?]. Check against Mauleón.

**P2. ii–V** (Dm7 G7 | Dm7 G7), 2-3 [?].
- Top line on the guide tones: F (the 3rd of ii) → F (the 7th of V) → F → F, or C (the 7th of ii) → B (the 3rd of V).
- Inner tones: the 7th and 3rd shells (Dm7: C+F; G7: F+B).
- **Connects to the app's existing ii–V guide-tone content.**

**P3. ii–V–I–I over a 4-bar cycle** (Dm7 | G7 | Cmaj7 | Cmaj7), two clave cycles [?].
- One chord per bar, so each chord fills a whole onbeat or offbeat bar.
- This is the jazz-standard montuno form (see §6.1).

**P4. Minor i–iv–V7–iv** (Cm Fm | G7 Fm), 2-3 [?].
- Line: G – A♭ – B – A♭.
- Inner tones: Cm C+E♭; Fm F+C; G7 F+D (the 7th inside, so the ♭7 sounds).

**P5. i–V7 on two chords** (Cm | G7), to match the app's bass b-latin L2 progression [?].

**12 keys:** every pattern is defined by degrees, so it transposes directly. Keep the top line in a playable register: the octave span between about G3 and G5, folding at the key's 5th. This is the same approach as the app's other per-key rungs.

### 2.3 By style

| Style | Piano role | Tag |
|---|---|---|
| **Son montuno / salsa** | P1–P4 at medium to fast tempo, 2-3 by default. | [V] motif; [?] tempos |
| **Cha-cha** | The montuno on the beats, at about 120 (see §2.5). | [V] 2026-11-23 (§2.5); [?] a piano "cha-cha-chá" cell |
| **Mambo** | The montuno and ponchando in the clave at 140–200 (see §2.7). | [V] 2026-11-23 (§2.7); [?] horn riffs, the bell |
| **Bolero** | Slow; the bass on 1 and 3, the chord broken in 8ths (see §2.6). | [V] 2026-11-23 (§2.6); [C] the exact 8th shape |
| **Songo** | The right hand on onbeats over a looped minor progression (i–♭VII–♭VI), the left hand syncopated against it; displacement at the advanced level [V] (*Guajeo*, *Tumbao*, after Moore). | [?] the exact LH cells, until Moore's *Beyond Salsa Piano* is consulted |
| **6/8 afro-cubano** | Chords placed on a subset of the bell's strokes (for example 0, 4, 7, or the 6/8 clave strokes 0, 2, 5, 7, 9) over a minor vamp. | [?] my proposal; no source read |

### 2.4 Difficulty order for piano [?] (proposal, built from the [V] framework)

1. **Rhythm only on one chord:** the 2-3 grid in block chords (ponchando), clave sounding.
2. **Broken octave figure on one chord** (C), 2-3.
3. **P1 I–IV–V–IV, 2-3.** Then P1 in 3-2 (hearing the pickup).
4. **Hands together:** the left hand doubling the line.
5. **Anticipated changes.**
6. **Minor P4, ii–V P2.** Then the 4-bar ii–V–I (P3) in 12 keys.
7. **Cha-cha and bolero comping.**
8. **Mambo ponchando with the band's horn hits.**
9. **Songo tumbao (two-hand interlock).** Then 6/8.
10. **Advanced:** displacement and clave changes.

### 2.5 Cha-cha-chá (researched 2026-11-23; built as k-montuno 13–16)

**Sources read this session** (each feature below needs two independent ones to be [V]):

| Short name | Source |
|---|---|
| W-Cha | Wikipedia *Cha-cha-chá (music)* (after Orovio 1981: 130–132; Urfé 1974; Alén 1994: 87; Santos 1982) |
| W-Dance | Wikipedia *Cha-cha-cha (dance)* (WDC / WDSF tempo rules; Lavelle 1983) |
| W-Guajeo | Wikipedia *Guajeo* (after Moore 2009: 15–17, 40; Peñalosa 2010: 256) |
| W-Danzón, W-Mambo | Wikipedia *Danzón*, *Mambo (music)* (after Orovio, Salazar, Giro 1998: 212) |
| Eijkhout | Victor Eijkhout, "Feel the beat: Cha-cha-cha", a musicology course for dancers (eijkhout.net, 2001) |
| Roover | Edgar G. Roover with Joe and Pauly Ortiz, "Latin Lessons", *Recording Musician*, Nov 1992 (muzines.co.uk) |
| SB-Cha | Soundbrenner, "Cha-cha-cha rhythm" (low authority) |
| Clark | Michele Fernández Denlinger, "Latinizing your school jazz ensemble", clinic handout (Clark College jazz festival, 2020) |
| López | Victor López, *Latin Rhythms: Mystery Unravelled*, Midwest Clinic 2005 slides (Alfred) |
| Moore-BSP2 | Kevin Moore, *Beyond Salsa Piano* vol. 2, table of contents and chapter summaries (timba.com) |
| PG | PianoGroove, "Cha-Cha-Cha & Mambo" lesson page (the patterns PDF is members-only; not read) |

**What is verified:**

| Feature | Finding | Sources | Tag |
|---|---|---|---|
| Origin | Enrique Jorrín, charanga (Orquesta América); "La engañadora" (1951; recorded 1953); from the danzón-mambo; the charanga format = flute, strings, piano, bass, percussion; Orquesta Aragón and Fajardo spread it | W-Cha, W-Dance, López ("developed around 1953 in the hands of Cuban charangas") | [V] |
| Less syncopation | Jorrín simplified the syncopation for dancers ("as little syncopation as possible"; "a strongly marked first downbeat and less syncopation"); the main idea was to extend the danzón's montuno section, with melodies that use more onbeats | W-Cha (Alén, Orovio), W-Dance, W-Guajeo (Moore 2009: 15) | [V] |
| The piano plays a montuno / tumbao | the piano plays "montuno-like patterns"; the cha-cha extends the danzón's montuno; Moore's vol. 2 studies the charanga piano tumbaos (Aragón, Fajardo) and the Arcaño tumbaos "later used for chachachá" | SB-Cha, W-Guajeo (Moore), Moore-BSP2 | [V] that it is a montuno; [?] the exact figure |
| Octaves | Latin piano lines are "normally played in octaves", block chords for accents; piano guajeos are usually voiced in octaves | Roover, W-Guajeo (Sonny Bravo) | [V] (general Latin piano, not cha-cha only) |
| Tempo | about 120: the WDC requires 30 bars a minute (= 120 bpm), the WDSF 30–32; Roover's pattern is 118 bpm, "too rushed" above about 125 and dragging below 80–90; SB-Cha suggests 110–128 | W-Dance, Roover, SB-Cha | [V] |
| The "cha-cha-chá" | the name is the sound of the dancers' feet on three successive steps; the triple step falls on 4, its "and" and 1 ("2 3 4-and 1"; the original Cuban count "one, two, three, four-and") | W-Cha, W-Dance, Eijkhout, SB-Cha | [V] |
| Conga | the high conga plays two hits on the last two 8ths of the bar (4 and its "and") | Eijkhout; a dance guide (udansa.com, via search) | [V] |
| Bell | claves, woodblock or cowbell on every quarter note; the timbalero keeps steady notes on the small bell | Eijkhout; the existing d-latin L5 ([C] Mauleón) | [V] |
| Güiro | a long stroke and two short ones (Eijkhout writes the güiro as "1 2& 3 4&") | Eijkhout; search summary of a percussion handout | [C] |
| Bass | a tumbao-related line (the "and" of 2 and 4, the 4 ringing over the bar) | SB-Cha; Roover (the same anticipated bass for his cha-cha and mambo patterns) | [V] generic; the app's own b-latin cha-cha cells stay hidden (F6) |
| 4/4 with a 2/4 feel | "played in 4/4 yet has a bouncy 2/4 feel"; Cuban scores in 2/4 | Clark, López, W-Dance | [V] |
| Progressions | the montuno vamps of §2.2 (I–IV–V–IV, i–iv–V7–iv, ii–V, ii–V–I); PianoGroove practises the cha-cha over a ii–V–I | §2.2 [V generic], PG | [V] generic |

**Unverified, left out** [?]:
- **A piano "cha-cha-chá" cell** (the piano itself striking 4–&–1). No source gives one; the drums (the conga) and the feet carry it. Wikipedia's typical piano figure (Orovio 1981: 132) is an image only.
- **The right hand on the beat, the left hand on the offbeat** ("chik-boom" reversed): only seen in search-engine summaries of a SalsaBlanca lesson and a MuseScore forum thread; neither page could be read. Check against Mauleón 1993 (cha-cha chapter) or *Cuban Masters Series: The Cuban Piano* (Morales / Griffin).
- **The clave in the cha-cha.** SB-Cha: arrangements "may be built around son clave", some "imply it loosely". One source only: the app's cha-cha has **no clave direction** and the band plays no clave in it.
- **Specific charanga tumbaos** (Aragón, Fajardo): in Moore's vol. 2, not read; never copy one.

**What the app builds:** the montuno figure (§2.2, verified generic) on the onbeat grid in **every** bar — block chords (ponchando) first, then the octave line with the inner tones, then the left hand doubling, then with the band (the bank's cha-cha groove: the bell on the beats, the conga on 2, 4 and the "and" of 4; the tumbao bass). Tempo ladders 90–128. All 12 keys, free time first. Ear: the cha-cha is in the drum-style game from level 3 (it was only a look-alike before), with its own band style.

### 2.6 Bolero (researched 2026-11-23; built as k-montuno 19–20)

| Feature | Finding | Sources | Tag |
|---|---|---|---|
| Origin | the trova of Santiago de Cuba; "Tristezas" (Pepe Sánchez, 1883); duos and trios; the bolero-son of Trío Matamoros (1930s); the bolero-cha (1950s) | Wikipedia *Bolero*; Tapia Tovar 2007 (ALAS congress paper, "Música e identidad latinoamericana: el caso del bolero") | [V] |
| Meter | Cuban boleros usually in 2/4, elsewhere 4/4 | Wikipedia *Bolero*, SB-Bolero (Soundbrenner "Bolero rhythm") | [V] |
| Tempo | slow: "roughly 60 to 90 bpm" (SB-Bolero); 84–116, most often 104 (an uncredited Scribd handout "How to play Bolero"); about 120 for ballroom dancing, 96–104 American Rhythm (Wikipedia) | three sources, wide spread | [V] slow; the app uses 60–90 |
| Bass | the low pulse on 1 and 3 (SB-Bolero); "a half note followed by two quarter notes" (López); "the left hand maintains the bass rhythm" (Scribd) | SB-Bolero, López, Scribd | [V] 1 and 3; [C] the extra note on 4 |
| Right hand | "arpeggios, broken chords, or soft syncopated hits" (SB-Bolero); from 1921 Eusebio Delfín accompanied with semi-arpeggios, "the elements that will characterise the bolero to this day" (Tapia Tovar 2007, p. 3) | SB-Bolero, Tapia Tovar | [V] broken chords; [C] the exact 8th-note up-and-down shape |
| Repertoire | "some jazz ballads can convert easily to boleros by simply adding [the] signature rhythm" | Clark | [V] (so the jazz-ballad ii–V–I is the progression) |

**Left out** [?]: the conga's bolero "signature rhythm" (Clark shows it only as an image), the bongó part, the "bar and a half" rhythm Delfín spread his accompaniment over (Tapia Tovar names it, gives no notation), a bolero kit groove, the bolero guitar pattern (§3.2), the bolero-son and bolero-cha as separate grooves.

### 2.7 Mambo (researched 2026-11-23; built as k-montuno 17–18)

| Feature | Finding | Sources | Tag |
|---|---|---|---|
| Origin | the danzón de nuevo ritmo of Arcaño y sus Maravillas; Orestes López's "Mambo" (1938); Pérez Prado's big band from 1949 | W-Mambo, W-Danzón, W-Guajeo | [V] |
| The piano | "the pianist attacks the mambo", the piano sets the montuno (Giro 1998: 212); mambo "uses many of same 'salsa' patterns but at a faster tempo" (Clark); ponchando [V] §2.1 | W-Mambo, Clark | [V] |
| Clave | "likewise based on Son clave" | Clark; §2.1 (the montuno's onbeat/offbeat motif) | [V] |
| Tempo | Roover's pattern 186 bpm; "mostly up-tempo, faster than the Son Montuno" (López); "driving, up-tempo" (Clark) | Roover, López, Clark | [V] fast; the app uses 140–196 |

**Left out** [?]: the mambo bell (still image-only, §5.1), the horn riffs ("mambos"), Pérez Prado's figures, the cáscara-in-the-right-hand exercise (PianoGroove, members-only).

### 2.8 Latin boogaloo (bugalú): not built

Wikipedia *Boogaloo* and NPR: a 1960s New York fusion of R&B / soul with mambo, cha-cha-chá and son montuno; Joe Cuba's "Bang Bang" (1966); "otherwise slow, cha-cha-chá rhythm" (NPR); Juan Flores's chapter is titled "Cha-Cha with a Backbeat". **No source gives a piano figure, a drum grid or a bass line**, so nothing is built [?]. Check Flores, *From Bomba to Hip-Hop* (2000), ch. 4.

---

## 3. Guitar

**Exists already:** `g-rhythm` L6 has a "Son clave 3-2, strummed on the clave hits" item (`guitar.ts:1390`). Its hits are at 16th positions 0, 6, 12, 20, 24 of 32, which is **correct son 3-2** [V].

### 3.1 Guajeo on guitar (tres style)

- **Background** [V] (*Guajeo*):
  - The guajeo was born on the **tres**: three doubled courses. The usual tuning is G–C–E [C].
  - The changüí tres guajeo is all offbeats (cut time).
  - The generic son guajeo is **arpeggiated triads with the first bar all offbeats**.
- **Checked 2026-11-23** [V generic]: Wikipedia *Guajeo* calls it "a typical Cuban ostinato melody, most often consisting of arpeggiated chords", and Moore 2010 (p. 32, via the same page) says the generic son guajeo is "simply arpeggiating triads". Premier Guitar ("Son Montuno Guitar") has the guitar imitate the tres with close triads and smooth voice leading. The app's g-guajeo (single notes walking a close triad on strings 3-2-1, on the onbeat/offbeat grid, looped) fits this. See THEORY-QUESTIONS question 13.
- **On guitar** [C]: play the same onbeat/offbeat motif as §2.2 as single notes or dyads on strings 1–3, on close triad shapes. Example: C on the top three strings at the 8th–9th fret region for C–F–G. The pitch lines from P1–P4 work note for note. **This shares one generator with piano.**
- **Two-guitar layering** [V history, ? exercise]: Arsenio Rodríguez's layered guajeos suggest a later rung. The player plays guajeo 2 against the app's guajeo 1.

### 3.2 Bolero accompaniment

- **Background** [V]: the guitar trova is the origin; the style moved to dúos and tríos.
- **The pattern** [?]: the common thumb-bass-on-1-and-3 / fingers-on-the-offbeats pattern is my recollection, not sourced. Check Mauleón 1993 or a trova guitar method.

### 3.3 Cha-cha comping

- [?]: short chords on the beats, with the "cha-cha-chá" on 4–&–1. Needs a source (Mauleón 1993 has a cha-cha chapter).

### 3.4 Order for guitar [?]

1. The clave strum (exists)
2. The 2-3 guajeo on one triad
3. The guajeo on I–IV–V–IV, 2-3 and 3-2
4. The minor and ii–V guajeos in 12 keys
5. Cha-cha comping
6. Bolero
7. A second guajeo layered over the band's

---

## 4. Bass: the tumbao

### 4.1 Verified

**The tumbao** [V] (Wikipedia *Tumbao*, after Peñalosa and Moore):
- It is built on **tresillo** (3+3+2).
- The bar's first stroke is dropped because the last note is **held over the downbeat** of the next bar. Only two offbeats sound.
- These are called **"bombo"** (the first) and **"ponche"** (the second).
- In a 4/4 bar of 8ths, tresillo is at 0, 3, 6. Dropping 0 leaves **3 and 6 = the "&" of 2 and beat 4**. The note on 4 rings over the bar line.
- **So the brief's "2& and 4" is verified.**
- On the three-side of son clave, these coincide with clave strokes 2 (cell 3) and 3 (cell 6).

**The anticipated bass** [C] (Peter Manuel 1985, known of): the note on 4 belongs to the **next** bar's chord.
- Soundbrenner also says the bass "may avoid a heavy beat 1 and anticipate the next chord on 4-and" [V, low authority]. Its wording (4-and) is looser than the tresillo account.

**Clave-aligned tumbaos** [V] (*Tumbao*, after García 2006):
- Arsenio Rodríguez's group brought bass lines aligned with the clave.
- The 2-3 line of "Dame un cachito pa' huele" (1946) coincides with three of the clave's five strokes, with accents on the "&" of 2 (three-side) and the "&" of 4 (two-side).

**Timba bass** [V] uses funk techniques (slap). That level is beyond what's needed here.

### 4.2 Per style

| Style | Bass | Tag |
|---|---|---|
| Son / salsa / mambo | The tumbao, 2& and 4, the 4 anticipating the next chord; mambo is the same at faster tempos. | [V] tumbao; [C] mambo |
| Cha-cha | The app plays: root on 1 (a dotted quarter), the 5th on 2&, the octave on 4, an approach on 4&. Sources I read give no cha-cha bass. | [?] check Mauleón 1993 |
| Bolero | 1 and 3 (half notes) or a half note and two quarters (§2.6). | [V] 1 and 3 (Soundbrenner, López); the band plays it since 2026-11-23 |
| Songo | Syncopated two-bar cells around the kick. The app has its own cells. | [?] check Goines/Ameen or Moore |
| Mozambique | App cells exist. | [?] |
| 6/8 | The app plays root–5th–♭7 on the triplet grid. | [?] |

### 4.3 What exists (b-latin, 9 levels) and what to add

**Exists:**

| Level | Content |
|---|---|
| L1 | Tumbao on one chord, 3-2 |
| L2 | Tumbao 2-3 on i–V7 |
| L3 | Over I–IV–V–IV and ii–V–I with anticipation rules |
| L4 | Cha-cha |
| L5 | Songo |
| L6 | Mozambique |
| L7 | Afro 6/8 |
| L8 | Partido alto and baião |
| L9 | Latin jazz: minor standards with anticipated roots |

`b-styles` L9 also has "Tumbao / son".

**Add:**
- **A mambo tempo rung:** the tumbao at 160–200.
- **Bolero:** after sourcing.
- **A clave-aligned (Arsenio-style) tumbao rung:** 2& on the three-side, 4& on the two-side [V].
- **A "find the bombo" ear item:** which bar is the three-side?
- **The tumbao in 12 keys** on the per-key matrix (style block H).

**Fix:** the drum grooves under these drills (F1 and F2 below).

---

## 5. Drums and percussion on the kit

### 5.1 What exists (d-latin) and how it checks out

| Level | Content | Check |
|---|---|---|
| L3 | Son 3-2 and 2-3, rumba 3-2, cross-stick under ride quarters (`drumStyles.ts`) | **Correct** [V] |
| L4 | Cáscara 2-3 `x.x.xx.x\|x.xx.x.x` and 3-2 (halves swapped), with clave and the kick tumbao | [C]. Matches the standard pattern as I know it from Uribe and Mauleón. The pages I read show it only as an image. Cáscara halves must line up with the clave's sides [V] (Wikipedia *Bell pattern*: the guaguancó cáscara was adopted as mambo bell parts). |
| L5 | Cha-cha bell: quarter notes over the clave and the kick tumbao | [C] (Mauleón). The cencerro's open/closed tones are not modelled; that is fine for a kit drill. |
| L6 | 6/8 bembé: the bell `x.x.xx.x.x.x`, the kick on the dotted quarters | **Bell correct** [V]; kick [C] |
| L8–10 | Mambo bell, songo, Mozambique (`drumLatin2.ts`) | Already hidden by `verifiedContent.ts` (`latin-kit-patterns`), because the bells and the snare/kick parts were unverified. Its kick tumbao `...x..x....x..x.` and son clave are correct [V]. |

**The mambo bell (L8):** still unverified. Wikipedia shows the "Manteca" mambo bell in 2-3 only as an image. To verify, check `MAMBO23 = x.x.xx.x|x.xx.xx.` against Uribe or Mauleón.

**Songo (L9)** [V] (Wikipedia *Songo music*):
- Created by Los Van Van in the early 1970s; Blas Egües was the first drummer; **Changuito** developed it.
- The setup adds a kick (and sometimes a snare and hi-hat) to the timbales.
- The basic bell pattern **embellishes the Matanzas guaguancó cáscara**. The **right hand plays the four main beats** (closed hi-hat, woodblock or cowbell); the **left hand plays the offbeats** (snare rim, snare, cowbells, toms).
- The patterns are "clave-based rumba-funk hybrids".

The app's `SONGO_BELL` (8ths in the right hand) is therefore **not** what Wikipedia describes. In Wikipedia, the right hand is on the quarter notes and the left hand on the "&"s. Rebuild L9 to that description (generic, not Changuito's exact part). The exact accent and kick placement stays [?] until the Changuito or Goines/Ameen books are consulted.

### 5.2 Add [?] (until sourced)

- **A fuller 6/8 afro-cubano kit groove:** the bell plus dotted-quarter kick, the hi-hat foot on beats 2 and 4 of the 12/8 bar, and toms in conversation. Source: Uribe.
- **Mambo bell 3-2 and 2-3:** once verified. Also bongó bell (campana) variants. Wikipedia shows them only as images, after Waxer 2002.
- **A bolero kit groove** (cross-stick and brushes).
- **The clave shown in the take** for every Latin groove: which side we're on.

---

## 6. Latin jazz

### 6.1 Jazz harmony meets the clave

- **ii–V–I as a montuno** [C]: one chord per bar over a 4-bar (two-clave) cycle (P3), or ii–V within one cycle (P2).
  - Jazz chords entered guajeos in the 1940s [V].
  - The direction comes from where the progression starts [V]: a ii–V–I that starts on the three-side is 3-2.
- **Latin A / swing B** [C]: the common way of playing standards. The A sections in a Latin groove, the bridge in swing (often heard in Latin-jazz standard arrangements). For the app, this is a band road-map option: `latin` A, `swing` B.
- **Even-length phrases** [C]: keep phrases a multiple of 2 bars so the clave doesn't cross. Odd-length forms force a clave change (Moore's subject) [V that clave changes exist; ? the rules].
- **6/8 afro-cubano jazz** [V]: in triple-pulse Latin jazz the bell (not the five-stroke clave) is the referent. Usually a minor modal vamp [C]. A "jazz waltz" in 3/4 is a different feel; don't merge the two in the band.

### 6.2 Improvising over a montuno [C]

These are common teaching ideas (Mauleón's ensemble chapters; Latin-jazz clinics). Promote them after a check.

**Rhythmic devices:**
- Start phrases on the **two-side**, or on the **bombo** (2& of the three-side).
- End phrases on the **ponche** (4 of the three-side).
- Quote clave strokes, the **tresillo** and the **cinquillo** as motifs.
- In 6/8, play 3-over-2 hemiola against the dotted-quarter pulse.

**App rules** (the improvise engine already has rule-based levels):
- "Phrase starts on a clave stroke."
- "Every phrase lasts 2 or 4 bars."
- "Land on the ponche."
- "Use one tresillo motif."
- Grade only what can be measured: onset times against the clave grid.

**Trading over a montuno** [C]: trade 4s or 8s (multiples of the 2-bar cycle) while the piano or band holds the montuno. Hold the montuno vamp under the descarga, then return to the head.

### 6.3 Generic forms to build (no copied tunes) [C]

1. A 2-bar montuno vamp (I–IV–V–IV or i–iv–V7–iv), open length.
2. An 8-bar minor vamp i–♭VII–♭VI–V7 (songo- and timba-style).
3. A 16-bar minor form (ii–V into iv, a ii–V back to i). The bass b-latin L9 already uses two minor standards' changes.
4. An AABA form with Latin A sections and a swing bridge.
5. A 12-bar minor blues in 6/8 afro-cubano.
6. A ii–V–I in 4-bar montuno cycles through 12 keys (per-key matrix).

### 6.4 Repertoire references (chords only; never melodies, recordings or transcriptions)

These are under copyright and may be named as listening references only:
- Machito, "Tanga" (1943)
- Gillespie / Chano Pozo, "Manteca" (1947)
- Mongo Santamaría, "Afro Blue" (1959)

### 6.5 Public-domain Cuban melodies

**The US rule:**
- Works **published** in 1930 or earlier are in the US public domain (1930 works since 1 January 2026) [V] (NPR; Columbia Libraries, Public Domain Day 2026).
- **Unpublished** works are public domain only if the author died before 1956 (life + 70) [C].
- Later arrangements, lyrics, translations and recordings have their own copyright. Use an edition published in 1930 or earlier, or write the melody out from the original.

| Work | Year | Status | Tag |
|---|---|---|---|
| Moisés Simons, "The Peanut Vendor / El manisero" | E.B. Marks, ©1930 (a catalogue record found) | Public domain in the US since 2026-01-01. The 1930 English edition is the safe text. The Spanish original is dated variously (1922 or 1928), and the lyric authorship is disputed. Use the music only. | [V] date; check the edition |
| Miguel Faílde, "Las alturas de Simpson" (danzón) | 1879 | Faílde died 1921, so it is public domain whether or not it was published. | [C] |
| José Urfé, "El bombín de Barreto" (danzón) | 1910 | Remembered as an early danzón with a son-like final section. | [C] |
| Ignacio Cervantes, *Danzas cubanas* | 1870s–1890s | Cervantes died 1905. | [C] |
| Manuel Saumell, contradanzas | before 1870 | Saumell died 1870. | [C] |
| Eduardo Sánchez de Fuentes, "Tú" (habanera) | 1890s | He died 1944. | [C] |
| Pepe Sánchez, "Tristezas" (the first bolero) | 1883 | Sánchez died 1918, so it is public domain. He did not notate it himself, so choose a pre-1931 printed source or write our own lead sheet from the oral tune. | [V] year; [?] edition |
| Ernesto Lecuona, "La Comparsa" (premiered 1912), "Malagueña" (1927 premiere/recording), "Siboney" (dated 1929) | — | **Only if the first publication was 1930 or earlier.** Lecuona died 1963, so late-published works are protected. Check in the Copyright Office catalogue (the Catalog of Copyright Entries, CCE) before use. | [?] |
| Gonzalo Roig, "Quiéreme mucho" (1911) | — | Roig died 1970; check that it was published in 1911. | [?] |
| Miguel Matamoros, "Lágrimas negras" | — | Its publication year is not established. | [?] |

**Note:** danzón and habanera are the roots of cha-cha (cha-cha comes from danzón-mambo [V]). They give a legal melody repertoire for a cha-cha / danzón unit.

---

## 7. Style recognition (ear game)

| Style | Cues to listen for | Tempo | Tag |
|---|---|---|---|
| **Cha-cha** | The "cha-cha-chá" cell on 4–&–1; cowbell quarter notes; the güiro; moderate, even, less syncopated (Jorrín simplified it) | about 110–130 | [V] origin, simplicity, the bell, the conga's 4-&, tempo (§2.5) |
| **Mambo** | A fast tumbao; the mambo bell in the montuno; ponchando and horn hits; big-band sound | about 160–220 | [V] ponchando and era; [?] tempo |
| **Bolero** | Slow; sung melody; broken-chord guitar or piano; bongó in a steady pattern; no bell drive | slow (Wikipedia gives about 120 for dancing and 96–104 for American Rhythm competition; the notation basis isn't stated) | [V] facts; [?] how to put it in the game |
| **Songo** | Kick on the kit; right hand on the quarters and left hand on the offbeats (§5.1); the bass syncopated around the kick; rumba-like conga quinto; funk feel | about 90–120 | [V] kit description; [?] tempo |
| **6/8 afro-cubano** | Triple pulse; the 7-stroke bell; a dotted-quarter feel; a minor vamp | about 100–140 (dotted quarter) | [V] bell; [?] tempo |
| **Clave direction** | 3-2 or 2-3, from where the progression starts against the clave | — | [V] |
| **Son vs rumba clave** | The third stroke on 4 or on 4& (son vs rumba) | — | [V] |

Build each example from the app's own band. The ear item is "which style?", and it should vary tempo and instrumentation so that tempo alone doesn't give the answer away.

---

## 8. Proposed exercise ladder per instrument (T0–T6) — **all [?] as a proposal**

The rhythmic content inside each rung carries the tags above. The tier placement and tempos are my proposal. The tempo shown is the target band after the rubato start (owner's rule: untimed first, then a tempo ladder).

**Clave (all instruments, Ear and Rhythm)**

| Tier | Content |
|---|---|
| T0 | Clap son 3-2 over a quarter pulse, 60–80 |
| T1 | 2-3; rumba; say the direction; 80–100 |
| T2 | The clave in one limb, the tumbao in the other; the 6/8 bell; 90–110 |
| T3 | Hearing the direction with no clave sounding; son vs rumba |
| T4 | The 6/8 clave inside the bell; 3-over-2 |
| T5–T6 | The clave-change (flip) drill — after Moore |

**Piano**

| Tier | Content | Tempo |
|---|---|---|
| T0 | Ponchando on one chord, 2-3 | 70–90 |
| T1 | The broken octave figure on one chord; P1 2-3 hands separately | 80–100 |
| T2 | P1 hands together, 2-3 and 3-2; bolero broken chords | 90–120; bolero 60–80 |
| T3 | Anticipated changes; P4 minor; cha-cha | 100–130 |
| T4 | P2/P3 ii–V–I montuno in 12 keys | 110–150 |
| T5 | Mambo ponchando with the band; 6/8 comping | 140–190 |
| T6 | Songo two-hand tumbao; displacement; improvising over your own montuno (LH montuno, RH line) | 100–130 songo |

**Guitar**

| Tier | Content | Tempo |
|---|---|---|
| T1 | The clave strum (exists) | 90–120 |
| T2 | Guajeo on one triad | 80–100 |
| T3 | Guajeo I–IV–V–IV, 2-3 and 3-2 | 90–120 |
| T4 | Minor and ii–V guajeos in 12 keys; cha-cha | 100–130 |
| T5 | Bolero; the second guajeo layered | 60–80 / 120–160 |
| T6 | Latin-jazz comping with Latin A / swing B forms | — |

**Bass**

| Tier | Content | Tempo |
|---|---|---|
| T0 | The tumbao rhythm on one note against the clave | 70–90 |
| T1 | b-latin L1–2 (exist) | 80–120 |
| T2 | L3 with anticipation; "find the bombo" | 90–140 |
| T3 | The Arsenio clave-aligned tumbao; cha-cha (after sourcing) | 100–130 |
| T4 | The tumbao in 12 keys on ii–V–I; bolero | 100–150 |
| T5 | Mambo tempo; songo and Mozambique (exist, after a check) | 160–200; 100–130 |
| T6 | 6/8 (exists); L9 Latin jazz; walking-to-tumbao switches in Latin A / swing B forms | 100–160 |

**Drums**

| Tier | Content | Tempo |
|---|---|---|
| T1 | d-latin L3 clave cross-stick (exists) | 90–120 |
| T2 | L4 cáscara and clave | 90–120 |
| T3 | L5 cha-cha; L6 bembé (exist) | 100–130; 6/8 at 240–330 eighths |
| T4 | The fuller 6/8 kit groove; bolero | — |
| T5 | Mambo bell (after verification); songo rebuilt to the verified description | — |
| T6 | Mozambique (after verification); trading fills in clave | — |

**Voice** (not in scope for afrocuban in SPEC-STYLE-FOCUS): sing the clave and the tumbao while clapping the other, as an Ear/Rhythm item only.

---

## 9. Findings in the existing code (to check and fix)

These come from reading the code against the [V] patterns above.

- **F1 — `grooves.ts` "clave-32" / "clave-23" are rumba clave, labelled son, and run at double speed under the bass.**
  - **The pattern:** `clave-32` = `x..x...x..x.x...` on the 16th grid of one 4/4 bar = 0, 3, **7**, 10, 12. That is the **rumba** clave in cut-time notation (son would be 0, 3, **6**, 10, 12). `clave-23` = 2, 4, 8, 11, **15**, the rumba 2-3.
  - **The tempo mismatch:** these grooves play the whole clave in **one** bar (`sub: 4`; `drumHitsOnBars` steps 1/4 beat). The b-latin tumbao drills (L1, L2, L3) place 2& and 4 in **every** 4/4 bar of 8ths. So the clave cycles once per bass bar instead of once per two bars. The bombo and ponche no longer coincide with clave strokes 2 and 3: the bass's 2& falls at 16th step 6 (no clave stroke), and its 4 on step 12.
  - `drumStyles.ts` / `drumLatin2.ts` (two bars of 8ths) are correct, so they can serve as the model.
  - **Fix:** relabel or add true son grooves, and write the clave grooves for these drills as two bars of 8ths (or halve the bass's grid).
- **F2 — `grooves.ts` "6-8-afro" bell `x.xx.x` (6 cells, repeating) is not the standard 7-stroke bembé bell** (`x.x.xx.x.x.x`, 12 cells) [V]. b-latin L7 (`afro68`) uses this groove. Use the 12-cell bell from `drumStyles.ts` L6.
- **F3 — `grooves.ts` "tumbao" groove:** the kick `......x.......x.` (16th steps 6, 14 in one bar) doesn't match either reading of the tumbao (2& and 4 per 8th bar = 16th-bar steps 3, 6, 11, 14 in cut-time terms). Check its intent; b-latin L9 uses it.
- **F4 — d-latin L9 songo:** the right hand plays bell 8ths, but the verified description is the right hand on the four beats and the left hand on the offbeats [V]. It is already hidden; rebuild it before un-hiding.
- **F5 — The band's `latin` style** (`band.ts`) picks one-bar comping cells per bar with no clave direction. A montuno-style band must choose cells per **two-bar** cycle by direction (§2.1). This feeds SPEC-JAZZ-NEIGHBOURS §7.2 (real band styles).
- **F6 — b-latin L4 cha-cha bass and L5–L7 cells:** no verified source yet. Add them to `verifiedContent.ts` as unsourced, or source them from Mauleón 1993.

---

## 10. What to verify next (smallest set that unlocks most)

1. **Mauleón, *Salsa Guidebook*:** montuno pitch lines (P1–P5), the cha-cha piano and bass, the bolero piano, guitar and bass, the mambo bell, the cáscara (confirm). One book closes most of the [?] items.
2. **Uribe:** the kit grooves (mambo, songo, Mozambique, 6/8, bolero).
3. **Moore, *Understanding Clave and Clave Changes*:** the flip drill and clave-change rules for odd-length forms.
4. **US Copyright Office CCE:** the Lecuona, Roig and Matamoros publication years.

---

## Summary

- **Verified and buildable now:**
  - son and rumba clave in 3-2 and 2-3, exact positions;
  - the 6/8 clave and the 7-stroke bembé bell;
  - telling the clave direction by where the progression starts;
  - "in clave" vs cruzado;
  - the tumbao = tresillo without its downbeat, so the "&" of 2 (bombo) and beat 4 (ponche), held over the bar line;
  - the piano/tres guajeo's onbeat/offbeat motif (the three-side bar all offbeats; 2-3 is the most common), as the rhythmic skeleton for montuno drills in 12 keys;
  - the songo kit description (the right hand on the beats, the left hand on the offbeats);
  - the cha-cha, songo and bolero history and cues for the ear game.
- **Common practice or unverified** (montuno pitch lines, cha-cha, bolero and mambo patterns, the mambo bell, tempos, the T0–T6 ladder) is tagged; one book (Mauleón) would verify most of it.
- **Code findings:**
  - `grooves.ts` "Son clave" grooves are really rumba clave, and they cycle twice as fast as the b-latin tumbao they accompany (F1);
  - the "6-8-afro" groove's bell isn't the bembé bell (F2);
  - the "tumbao" groove's kick needs a check (F3);
  - the hidden songo level contradicts the verified description (F4);
  - the band's `latin` style ignores the clave direction (F5).
- **Public domain:** "The Peanut Vendor" (©1930) is in the US public domain since 2026, and 19th-century danzón and habanera works are safe. Lecuona and the others stay [?] until a copyright-catalogue check.

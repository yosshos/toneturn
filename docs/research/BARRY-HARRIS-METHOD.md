# The Barry Harris method: a sourced map, checked against the app (2026-11-14)

Research doc. It is read-only for the app; the canonical reference stays `docs/BARRY-HARRIS-THEORY.md`, and Part C proposes the text to change there.

- **Part A:** the method, area by area: the rules, C examples, exercise forms, order, sources.
- **Part B:** every item checked against the app.
- **Part C:** corrections and additions for `docs/BARRY-HARRIS-THEORY.md`.
- **Part D:** build order for the missing and shallow items.
- **Part E:** the exercise catalogue, with game potential.
- **Part F:** Echols & Parks, complete exercise catalogue (2026-11-15).

All examples are in C. Note spellings were checked step by step. **(derived)** marks a line I built from a stated rule, and **(verify)** marks a point no source settles.

---

## 0. Sources and how far to trust them

The sources come in tiers, by how close they are to Harris.

**Tier 1: Harris's own words, or texts he authorised.**

| Key | Source | What it gives |
|---|---|---|
| **[R1]** | Howard Rees, *The Barry Harris Workshop Video* (Part 1), table of contents: <https://jazzworkshops.com/the-barry-harris-workshop-video/> | The curriculum's official topic list. Filmed in Toronto, 1993; 112-page workbook. |
| **[R2]** | Rees, *Workshop Video Part 2*, table of contents: <https://jazzworkshops.com/the-barry-harris-workshop-video-part-2/> | Part 2 topics |
| **[R3]** | Rees, "Barry Harris Keeps Things Movin'", *Keyboard*, October 1998: <https://jazzschoolonline.com/evolutionary-voicings-part-i/> | The 6-dim system, movement, borrowing; Ex. 1–29 |
| **[R4]** | Rees, *Keyboard*, November 1998: <https://jazzschoolonline.com/evolutionary-voicings-part-ii/> | Application to *Star Eyes*, *How High the Moon*, *Woody 'n You*, *Body and Soul* |
| **[H03]** | Harris, 2003 workshop in The Hague, transcribed by Rees. Quoted in V. Marijt, *Barry Harris: Exploring the Diminished* (MA paper, Royal Conservatory The Hague, 2014): <https://www.jazzguitar.be/forum/attachments/improvisation/55897d1536504112-official-barry-harris-thread-barry-harris-exploring-diminished-pdf> | Harris's own derivation: chromatic → whole tone → 3 dims → dominants, m6, 6, 7♭5; "the first movement". **Note:** the app's `engine/barry.ts:11` calls this "Hague workshop transcription, 2003". It is Marijt's 2014 paper, which contains the 2003 fragment. |
| **[K]** | Alan Kingstone, *The Barry Harris Harmonic Method for Guitar*, table of contents: <https://jazzworkshops.com/?p=3770> | Guitar harmony |

**Tier 2: long-time students and teachers.**

| Key | Source |
|---|---|
| **[P5]** | Chris Parks, *Things I've Learned From Barry Harris*, video 5 outline (half-step rules, triplets, three arpeggios): <https://www.jazzguitar.be/forum/attachments/improvisation/62611d1559260474-things-i-learned-barry-harris-study-group-5-half-step-rules-pdf> |
| **[PO]** | Parks, Open Studio course *Barry Harris' World of Soloing* (lesson list): <https://www.openstudiojazz.com/courses/barry-harris-world-of-soloing/> |
| **[E]** | Thomas Echols, *The Labyrinth of Limitations* (YouTube series, PDFs, Foundations I–IV, app). Store and episode list: <https://www.thomasechols.com/scores>. App manual: <https://static1.squarespace.com/static/59a4e365b8a79befa9f5b358/t/600fc64417ea2b0497ac93a7/1611646532637/Instructions.pdf>. Bio: <https://www.thomasechols.com/bio> |
| **[EL]** | A transcription of Echols's "contrary motion elevators": <https://www.jazzguitar.be/forum/theory/82974-barry-harris-contrary-motion-elevators.html> |
| **[BC]** | Yair Goren, *The Barry Harris Companion* (Hague lineage): <https://barrycompanion.com/>. Chapters cited: [/extra-notes/](https://barrycompanion.com/extra-notes/), [/six-chords/](https://barrycompanion.com/six-chords/), [/family/](https://barrycompanion.com/family/), [/harmony/](https://barrycompanion.com/harmony/), [/improvisation/](https://barrycompanion.com/improvisation/), [/scales-of-chords/](https://barrycompanion.com/scales-of-chords/), [/shell-voicings/](https://barrycompanion.com/shell-voicings/), [/chord-context/](https://barrycompanion.com/chord-context/) |
| **[FB]** | Friends of Barry Harris, *The Barry Harris Method of Piano Harmony* (NYC slides): <http://www.friendsofbarry.com/presentations/nyc_slides.pdf> |
| **[JL]** | Jens Larsen (attended the Hague classes). Pivot: <https://jenslarsen.nl/the-one-arpeggio-every-jazz-guitarist-needs-to-know/>. Chromatic scale and pivot: <https://jenslarsen.nl/why-barry-harris-approach-is-so-much-better-than-bebop-scales/>. Turning phrases into exercises: <https://jenslarsen.nl/the-one-barry-harris-rule-that-changed-everything/> |
| **[TC]** | T. Cleary (UVM). 5-4-3-2 licks: <https://blog.uvm.edu/tgcleary/2015/03/06/charlie-parker-and-alan-turing-anthropology-is-the-bombe/>. Minor ii–V: <https://blog.uvm.edu/tgcleary/2014/04/14/what-is-this-scale-called-charlie-parker-barry-harris-and-the-minor-ii-v-progression/> |

**Tier 3: forum reports.** Useful for detail; treat as reports, not as the canon.

| Key | Source |
|---|---|
| **[OBT]** | jazzguitar.be "Official Barry Harris thread": <https://www.jazzguitar.be/forum/improvisation/55582-official-barry-harris-thread.html> (and pages -2, -3) |
| **[SG]** | jazzguitar.be Parks study group: <https://www.jazzguitar.be/forum/improvisation/70264-things-i-learned-barry-harris-study-group.html> |
| **[HS]** | "Half-step practice model": <https://www.jazzguitar.be/forum/improvisation/57389-barry-harris-half-step-practice-model.html> |
| **[MR]** | "Miscellaneous rule": <https://www.jazzguitar.be/forum/improvisation/101515-barry-harris-miscellaneous-rule.html> |
| **[M6]** | "Maj6 on the 5th or the tonic" (Kingstone posts): <https://www.jazzguitar.be/forum/theory/78857-barry-harris-maj6-built-5th-tonic.html> |
| **[TR]** | Triplet rules PDF: <https://www.jazzguitar.be/forum/attachments/improvisation/55150d1533495755-official-barry-harris-thread-more-barry-harris-half-step-rules-some-applications-pdf> |
| **[54]** | Basschat 5-4-3-2 (a workshop attendee's notes): <https://www.basschat.co.uk/topic/224522-54321-barry-harris/> |
| **[NK]** | rec.music.makers.jazz on 5-4-3-2: <https://rec.music.makers.jazz.narkive.com/hMlFqedZ/barry-harris-5-4-3-2> |
| **[MO]** | Matt Otto, chromatic scale: <https://mattotto.org/barry-harris-chromatic-chord-scales/> |
| **[LB]** | Line-building thread (Harris's "rhythm rules the world"; Echols credited): <https://www.jazzguitar.be/forum/improvisation/106687-question-barry-harris-line-building-disciples.html> |
| **[OC]** | "Off-chord" dyads: <https://www.jazzguitar.be/forum/improvisation/104838-barry-harris-dyads-counterpoint-off-chord.html> |

**Unreachable or not found:**
- Galliano, *Notes on the Method of Barry Harris* (irfu.cea.fr): returns 404 and was never archived (Wayback CDX shows no capture). By its own description it is a transcription of Parks and Echols with Kingstone, so those three are covered directly.
- No Frank Basile Harris notes turned up. I did not find Lucas Pino, Shaun Martin or Ferdinand Fehr Harris write-ups in the time available. Their exercises are not represented here.
- Rees workbooks: only the tables of contents are public. Inner page content comes from forum quotes of the workbook ([HS], [MR], [SG]).

---

# PART A — The method

## A1. Harris's frame: how the world is built [H03, R3, BC/harmony]

Harris's own story, in the 2003 workshop:

> "The chromatic is God creating the earth … Man and woman are the 2 whole tone scales … they had babies … 3 diminishes … with each diminished, 2 notes belong to one whole tone scale and 2 notes belong to the other" [H03].

The whole-tone scales are "mother" (C D E G♭ A♭ B♭) and "father" (D♭ E♭ F G A B) [BC/harmony]. From each diminished chord, by half-step moves [H03]:

| Move on C°7 (C E♭ G♭ A) | Result | Rule |
|---|---|---|
| Lower one note | dominant 7 on the lowered note: B7, D7, F7, A♭7 | the lowered note is the root |
| Raise one note | minor 6: raise G♭ → G gives C E♭ G A = Cm6 | the root is a 4th above the raised note |
| Raise two **consecutive** (minor-3rd neighbour) notes | major 6: raise E♭ and G♭ → C E G A = C6 | |
| Lower two consecutive notes | major 6: lower E♭ and G♭ → C D F A = D6 | |
| Move two **non-consecutive** (tritone) notes | dominant 7♭5. Harris: "every seventh with a flat five is 2 dominants." Lower C and G♭ → B E♭ F A = F7♭5 = B7♭5 | |

- **Count per dim.** 4 dominants, 4 minor 6ths, 8 major 6ths, and the 7♭5 chords [BC/family; Marijt's chart in H03].
- **Echols counts it differently** [E app manual]. His tesseract (after Tymoczko) maps the paths from one °7 down to the °7 a half step below: 16 vertices = 4 dom7, 4 maj6, 4 m6, 2 dom7♭5, 2 dim. The difference is only in how it is counted. Echols counts only downward paths between two adjacent dims, so the 8 major 6ths of the "raise or lower from one dim" view appear as 4. The 7♭5 chords pair up a tritone apart (C7♭5 = G♭7♭5), so 4 positions give 2 distinct chords.
- **Harris's "first movement"** (verbatim):

  > "your first move should be minor sixth to diminished to dominant" [H03].

  In C: **Dm6 (D F A B) → B°7 (B D F A♭) → G7 (G B D F)**, then home to C6. That is the ii–V written as m6–dim–7.
- **Harris's "next move"** [H03]: raise two consecutive notes of C°7 (G♭, A → G, B♭) to get C E♭ G B♭ (= E♭6), return to C°7, then lower the same two (→ F, A♭) to get C E♭ F A♭ (= A♭6). So **E♭6 → C°7 → A♭6**, a V6 → I6.
- **Diminished scale.** It is "2 diminishes put together", not "half step–whole step":

  > "Don't believe that nonsense" [H03].

  It is a dominant-context scale: for C7, C°7 + D♭°7 = C D♭ E♭ E F♯ G A B♭ [BC/improvisation].
- **"You learn these scales for chording"** [H03]. The 6-dim scales are first of all a harmony tool. Several Parks-school sources add that the default single-line material is the plain 7-note scale plus the added-note rules, not the 6-dim scale [SG, joe2758; also R2, "Expanded 'Extra Note Rules'"].
- **What is not a chord** for Harris [BC/six-chords, BC/harmony]: the diminished, the 7♯5 and the 7♭5. They come from the whole tone or the dim. "Chords are just intervals on a major or a dominant scale."

## A2. Scales and the half-step ("extra note") rules

### A2.1 Scale practice: "the ABCs" [R1 ch.1; OBT p.1 joe2758, from the workbook; P5; PO]

- **The dominant scale.** Harris avoided the word "Mixolydian" [PO]: "the C7 scale".
- **ii is V.** The "important minor" is left out of single-line playing: over Gm7–C7, play the C7 scale [OBT; HS, "There is no ii according to BH"].
- **Up and down, one bar per chord.** Play from the root up to the 7th in eighths, one bar, then down. The scale outline of a tune uses this. If a chord lasts more than a bar, come back down [OBT; SG, the blues outline].
- **In 3rds:** C E D F E G …
- **3rds with a half step below each upper note** (as transcribed, starting from the 7th): B C E | C♯ D F | D♯ E G … [OBT joe2758].
- **Triads on each degree:** C E G, D F A, E G B …
- **Triads and 4-note chords, each with a half step below the first note** [OBT].
- **Three important arpeggios on a dominant** [P5; OBT]: on the root, the 5th and the ♭7. On C7: C E G (C), G B♭ D (G), B♭ D F (B♭). That is I, the minor on 5, and the major on ♭7. Each is played "with the first note repeated an octave higher" (1-3-5-8) [P5].
- **Major arpeggios down chromatically, in all inversions** [OBT joe2758]: C G E C, then B F♯ D♯ B, then B♭ …
- **Pivoting** (octave displacement) comes in after these [OBT]. See A2.6.

### A2.2 The descending rules: dominant [P5; BC/extra-notes; HS quoting Rees p.8]

- **Purpose:** chord tones on the downbeats while descending, the line starting on a downbeat [P5; BC].
- **Scope:** the rules apply to scales "descending from at least the octave (starting on the 2nd is actually starting on the 9th)" [HS, quoting the workbook].
- **Parity:** from a chord tone, add an odd number of notes; from a non-chord tone, an even number [BC].

C7 scale = C D E F G A B♭. The rules, verified note by note (positions 0, 2, 4 … fall on beats):

| Start | Rule | Line | On the beats |
|---|---|---|---|
| 1 (C) | 1 half step: 1–♭7 | C B B♭ A G F E D C | C B♭ G E C |
| 3 (E) | 1: 1–♭7 | E D C B B♭ A G F E | E C B♭ G E |
| 5 (G) | 1: 1–♭7 | G F E D C B B♭ A G | G E C B♭ G |
| ♭7 (B♭) | 1: 1–♭7 | B♭ A G F E D C B B♭ | B♭ G E C B♭ |
| 3, 5, ♭7, **and 1 per Parks** | 3: 3–2, 2–1, 1–♭7 | from E: E E♭ D D♭ C B B♭ A G | E D C B♭ G (the 9th, D, sits on beat 2 inside a chromatic run) |
| 2 = 9 (D) | 0 | D C B♭ A G F E D C | D B♭ G E C |
| 9 (D) | 2: 2–1, 1–♭7 | D D♭ C B B♭ A G F E | D C B♭ G E |
| 4, 6 | 0 or 2 (2–1, 1–♭7) | the chord tones land on the beats from the root on, once the line has passed the octave **(derived)** | |

**Where the sources disagree:**
1. **Three half steps from the root.** Parks (video 5, 1:29) allows it [P5]. Goren lists only 3, 5, 7 for rule 2 [BC]. The app follows Goren (see B).
2. **The 4th and 6th.** The workbook groups 2, 4 and 6 together [P5; HS]. Worked out, from 4 or 6 the chord tones fall off the beat until the line passes the root, so the rule "comes out right" only over a full octave. The Rees workbook's scope note covers this [HS; MR].

**Expanded rules:**
- Part 2 has "Expanded 'Extra Note Rules'" [R2].
- Harris later spoke of "extra note rules" rather than "half-step rules": the rule matters more than the particular note [SG/OBT, joe2758: "the added note can be any note"].
- Larsen: "any note can be a half step", e.g. skipping up to a scale note above the target [JL].

### A2.3 The descending rules: major and minor [BC/extra-notes; HS quoting Rees p.14; R1]

**Major** (the chord tones are 1, 3, 5, 6, the 6-chord view). C major = C D E F G A B.

| Start | Rule | Line | Beats |
|---|---|---|---|
| 1, 3, 5, 6 | 1: 6–5 | C B A A♭ G F E D C | C A G E C |
| 3, 5, 6 | 3: 6–5, 3–2, 2–1 | E E♭ D D♭ C B A A♭ G | E D C A G |
| 2, 4 | 0, or 2: 2–1 and 6–5 | D D♭ C B A A♭ G F E | D C A G E |

**Minor:** "the same as major except the ♭3" [HS]. From the root, Cm6: C B A A♭ G F E♭ D C. This is exactly the **C minor 6-dim scale**.

### A2.4 The "miscellaneous rule" (ascending, then down) [MR quoting Rees p.10c; P5 5:45]

- "Start on a note, go up to any note, and (when descending) follow the rule for the starting note. (If the half step falls on the beat, put it at the bottom of the phrase.)"
- Parks: "If you start on any note and ascend and then descend, use the rules of the note you started on."
- Example on C7: start on G and go up to C. Coming down from C, the B would fall on a beat, so the extra note goes in the octave below: G A B♭ C | B♭ A G F E D C B B♭ … **(derived)**.

**Ascending in general.** No ascending half-step rule set is documented. Ascending material is the arpeggio (A2.5) and **Barry's chromatic scale** (A2.7) [R1; JL].

### A2.5 Arpeggio up, scale down, and scale outlines

- **Arpeggio up, scale down.** The standard line shape: up an arpeggio from a chord tone, then the scale down by the rules from the next chord tone above. It runs through the workbook's applications on *Indiana*, the blues, rhythm changes and *Cherokee* [R1 ch.2; SG; OBT p.2]. The app models it in h11 and h15.
- **Scale outline.** A tune is reduced to one dominant or major scale per bar or two: the "scale outline of Indiana", "of the blues", "of rhythm changes", "of the *Cherokee* bridge", "of *Lady Bird*" [R1; R2].
- **The blues outline in C** [SG]. Bars 7–8: up C7, down C7, ending on C♯, which leads to A7. Bar 6 uses "the related diminished chord" [R1].
- **The "important minor"** [R1 ch.2; BC/six-chords]. For a dominant, the m7 or m6 on its 5th (C7 → Gm). The scale played is the dominant's.
- **"Rhythm Changes – Seven Songs in One"** [R2]. A set of standard outlines and bridges; content not public **(verify)**.
- **"Turnbacks", using scale degrees and the related diminished chords** [R2].

### A2.6 The pivot [JL; SG; OBT; E ep.17]

- **The pivot arpeggio.** Keep the first note; move the rest of the arpeggio down an octave. Cmaj7: C5 – E4 G4 B4 [JL]. Harris named it [JL].
- **On a dominant,** use the major 7 arpeggio on its ♭7: over D7, a Cmaj7 pivot; over C7, B♭maj7 [JL]. This matches Parks's "important arpeggio on the ♭7" [P5].
- **Pivoting in general:** "Start an arpeggio up; somewhere in the middle drop an octave and continue up … can be up or down, after the first interval or the second, from any degree" [SG]. Students also pivot in scale runs, to make 7th leaps [SG].
- **Purpose:** range. "You can play through rhythm changes from one end of the keyboard to the other … no matter how small the range of your instrument, by pivoting" [SG; OBT].
- **Echols's "4 scenarios of pivoting"** [E ep.17]. Pivoting lines with polyphonic movement, using his Elevator Sequence. The four scenarios are behind a paywall **(verify)**.
- **Agreement with the app.** The owner's definition ("root on top, drop to the 3rd, climb") matches Larsen's. The app's "scale line with a pivot" also matches the forum usage. No source contradicts either.

### A2.7 Barry's chromatic scale [JL; MO; PO lesson 6; E ep.5; R2 "Chromatic Major Scale", "Chromatic Dominant 7th Scale"]

- **Rule:** fill every whole step of the scale with the chromatic note, so that each **scale degree** lands on a downbeat in eighths. Where the scale already has a half step, skip up to the scale note above the next degree and come back down [MO; JL].
- **Ascending, C major (derived from the rule):**

  C C♯ D D♯ E **G** F F♯ G G♯ A A♯ B **D** C
  (C, D, E, F, G, A, B, C on the beats)

- **Ascending, C7 (derived):**

  C C♯ D D♯ E **G** F F♯ G G♯ A **C** B♭ B C

- **Descending.** Otto's variation 2 approaches the half-step degrees from below. The exact note choice is not shown **(verify)**.
- **Echols:** it is "a melodic/rhythmic concept that can be applied to any diatonic scale or the major and minor 6th diminished scales" [E ep.5].
- **Caution from the sources.** "Using chromatic notes in jazz is like swearing" (a reported Harris remark, unverified) [SG]. "The popularity of 'Barry's chromatic scale' … everyone HAD to discuss that" [LB].
- **Related:** the chromatic between chord tones of a 7th chord, "Use of the chromatic scale" [R2 ch.1: "The Chromatic Scale", "Use of 'Surrounding Notes'"].

### A2.8 Triplets [P5; TR; PO lesson 5; Parks ep.24 "Practicing Triplets"]

- **An eighth-note triplet follows the rule of its middle note** [P5 8:19; TR].
  - On F7: a triplet whose middle note is G (the 9th) takes the 2–4–6 rules.
  - A triplet starting on G has A as its middle note, so it takes the 1–3–5–7 rules [TR].
- **A sixteenth-note triplet follows the rule of its first note** [P5 10:00; TR].
- **Exercise: "thirds with triplets"** — the scale in 3rds with a triplet on the top note (Galliano's listing, via the search snippet) **(verify)**.
- Triplets are embellishments: "not the main substance of the line" [SG].

### A2.9 The 5-4-3-2 phrases [R1 ch.1 "'5-4-3-2' on the Major / Dominant 7th / Minor Scale"; 54; NK; TC]

- **Name.** Harris numbered them in the order he made them up (Fiol, a student) [NK]. Others say the number is the degree the phrase leaps from [NK; SG].
- **Notes** from a workshop attendee's corrected notes [54], **(verify against the workbook)**:

| Phrase | C7 | Cmaj |
|---|---|---|
| 5 | G B C F E | G B C F E |
| 4 | (G) F D E♭ E — enclosure of the 3rd | (G) F D E♭ E |
| 3 | E G B♭ D — the 3-to-9 | E G B D |
| 2 | (rest) D B♭ B C | (rest) D [B C C♯] D (triplet) |
| 1 | C B B♭ D A G | — |

- **Combined "5-4-3-2" lick on C7:** G B C F D E♭ E G B♭ D B♭ B C …
- **Use.** For "getting out of trouble", at the start, middle or end of a phrase. Harris uses the 4 on *Stay Right With It*; Parker uses them on *Shaw 'Nuff* [TC].

### A2.10 "Surrounding notes", enclosures and approach [R2 "Use of 'Surrounding Notes'"; K 3.2 "Surrounding"; JL]

- **Enclosure:** a scale note above, a chromatic note below, then the target. Larsen flips it ("flipped enclosures") when the melody goes up [JL].
- **Kingstone's "Surrounding"** is a borrowing technique in chords [K]. The single-line and chordal senses differ; the content is not public **(verify)**.

## A3. Dominant lines

- **The dominant scale from each chord tone** (A2.2), and the three arpeggios (A2.1).
- **Starting on the 7th / "seven down to the 3rd."** A standard Harris connection: the dominant scale from its ♭7 down to the 3rd of the next chord.
  - Minor ii–V in F minor: over Gø–C7, play **"E♭7 up and down to the 3rd of C"** [TC].
    - Up: E♭ F G A♭ B♭ C D♭.
    - Down: D♭ C B♭ A♭ G F **E**. The E replaces E♭, and the down-beats D♭ B♭ G E outline E°7 = C7♭9 [TC].
  - In C minor: over Dø–G7, B♭ C D E♭ F G A♭ | A♭ G F E♭ D C **B** (beats A♭ F D B = B°7 = G7♭9) **(derived)**.
  - Marijt: "playing the E♭7 scale down from the 7 to the 3 of C7, you're actually playing Gm7♭5 to C7" [H03 paper].
  - Forum, for Bø–E7: "F E D C B A G♯" [SG].
- **3-to-9 and 3-to-♭9.**
  - The 3-to-9 arpeggio on C7: E G B♭ D, Harris's "3" phrase [54].
  - The **3-to-♭9** is the dim on the 3rd: E G B♭ D♭ = E°7. Larsen: "the diminished arpeggio of the 3rd of the chord" on a resolving dominant [JL].
  - All four brothers share the same 3-to-♭9 dim, which is why it fits any of them.
- **The family ("4 related dominant 7ths"; "brothers and sisters").**
  - Dominants a minor 3rd apart, from one dim: G7, B♭7, D♭7, E7 [R1 "The Diminished Chord and its 4 'Related' Dominant 7ths"; R3].
  - Rees: "can substitute for one another, or be combined as extended dominants" [R3].
  - **Names differ by source.** Kingstone has "Sisters and Brothers" and "Playing with your 'Sisters and Brothers'" [K]. Goren says Harris called the 4 **notes** of a dim "brothers and sisters" [BC/harmony]. The app's "brothers" for the 4 dominants is a fair shorthand, but Harris's own phrase is "the 4 related dominants" or "the family".
  - Used as V7 substitutions [R1 ch.3, "The 4 Related Dominant 7ths Used as V7 Substitutions"].
  - Lines: "related dominant 7th scales = chord movements" [R1]. "Moving from one dominant of the family to another" [BC/improvisation].
  - In practice: Gm7–C7 played as C7, C7 into G♭7, or G♭7; also E♭7 ("backdoor minor's dominant") [HS].
- **Converting chords for lines.**
  - m7 → the dominant a 4th up (Dm7 → G7: "ii is V").
  - m7♭5 → the dominant a major 3rd down (Eø → C7; Gø → E♭7) [H03 paper; TC; HS].
- **Converting for harmony: the Sixth Chords Rule** [R2 "Sixth Chords Rule (Chord Conversion Chart)"]. Table from Marijt [H03 paper], matching [R3 Ex.10], [FB] and [BC]:

| Chord | Think | In C / G |
|---|---|---|
| maj7 | the major 6 on the tonic, **or on the 5th ("the sixth on the fifth")** | Cmaj7 → C6 or G6 |
| minor (tonic) | m6 | Cm → Cm6 |
| m7 | major 6 a minor 3rd up | Dm7 = F6 |
| m7♭5 | minor 6 a minor 3rd up | Dø = Fm6 |
| 7 | minor 6 on the 5th (**the important minor**) | G7 → Dm6 |
| 7 altered | minor 6 a half step up (**the tritone's minor**) | G7alt → A♭m6 |
| 7sus | major 6 a whole step down | G7sus → F6 |
| 7♭9 | root + the dim a half step above it (LH root, RH dim) | C7♭9 = C + D♭°7 |

Notes on the chart:
- Marijt prints "half step below" for sus with the example D7sus → C6 (a whole step); the example is right, so "half step" is a typo.
- Goren: the important minor "is a matter of style, not a rule" [BC].
- Kingstone: the choice between the tritone's minor and the important minor is left to taste [M6].
- **The tritone's minor.** "Why the Tritone's Minor is the Perfect 'Altered Scale'" [R2]. A♭ melodic minor = G altered. Rees: the m6-dim scale a half step above a dominant root covers the root, 3rd, ♭7 and the altered tones [R3 Ex.9]. Friends of Barry and Echols's app use it as a default choice over V [FB slide 25; E manual].
- **Sus resolution** [BC/improvisation]: over a C bass, B♭6 → Gm6 (F falls to E): the sus to the important minor.

## A4. The four 6th-diminished scales, and harmony

**The scales** ("Barry's Four Key Scales", [R2]: Major 6th dim, Minor 6th dim, 7th dim, 7th♭5 dim). The dim is always the one a half step below the root:

| Scale | Chord + dim | C |
|---|---|---|
| Major 6 dim | C6 + B°7 | C D E F G A♭ A B |
| Minor 6 dim | Cm6 + B°7 | C D E♭ F G A♭ A B |
| 7th dim | C7 + B°7 | C D E F G A♭ B♭ B — Parks, quoted: "1 2 3 4 5 ♭6 ♭7 7" [SG] |
| 7♭5 dim | C7♭5 + B°7 | C D E F G♭ A♭ B♭ B **(derived from the construction; agrees with [R2], [E ep.8])**. Since C7♭5 = G♭7♭5, this scale also serves G♭7♭5: Harris's "you learn 6 and you know all 12" [H03] |

**What the scales are.**
- The major 6-dim is "a major scale with ♯5", and the minor "a melodic minor with ♯5" [FB].
- **The scale's own dim** shares no note with its 6 chord. The 6 chord takes 2 notes from each of the other two dims [Marijt in H03 paper; BC/scales-of-chords]. The "third diminished is the diminished of the scale of chords" [BC].
- Minor: Cm6 = C E♭ A (all from C°7) + G (from D♭°7). It is 3 + 1, not 2 + 2. The app's audit §ג.3 is right on this.
- "Just learn two scales in 12 keys" (major and minor 6-dim); every chord maps to one of them [FB slides 10–15]. Rees's Part 2 and Echols's ep.8 and ep.10 add the 7th-dim and 7♭5-dim for dominants.

**The movement toolkit** [FB slides 2–5; R3; K ch.2–3; E]:
- **Invert** the chord up and down, usually in drop 2.
- **Slide** the voicing along a scale: major, melodic minor, or 6-dim.
- **Borrow:** a note outside the chord but inside the scale, or a chromatic one; then resolve, or don't.
- Harris "often uses the three together" [FB].

**Voicings.**
- **Drop 2** is the most useful: comfortable, slides easily, inverts 4 ways [FB].
- **Drop 3:** for LH shells, and combined with drop 2 for contrary motion [FB].
- **Drop 2 & 4** "highlights fifths" [FB].
- "Close position voicings are awkward to move, and sound too much like the 'block chord' style" [FB].
- Kingstone's appendix also lists **drop 2 & 3**, "partial chords" and "double-note chords" [K].
- **"Spread"** is not a Harris term in any source I could open. Rees uses "drop" and "open voicing" [R3; R4]. Echols's elevator has "spread voicings" on its upper floors [EL]. Kingstone's "Expand and Contract" (4.6) is the nearest Harris-school name for contrary-motion spreading [K].

**Moves inside the scale.**
- **Scale of chords:** every note of the scale gets its chord, alternating 6 and dim. Melody from each chord tone [R1 ch.3; FB slide 16].
- **Contrary motion** [R1 "The C6 Diminished Scale in Contrary Motion"; R2; R3 Ex.17]. Start on a unison, move the outer voices apart stepwise, and fill in the middle. The "I–V" alternation stays.
  - **Echols's Elevator** [EL; E ep.4, ep.16] systematises this. Floors are voicing types: unison → 3rds → triads → 6ths → octaves → drop 2 → drop 3 → drop 2&4 → double octave.
  - Moving along a floor gives parallel motion. Taking the elevator between floors gives contrary motion, and the 6/dim alternation is kept either way [EL].
  - Only 3rds, 5ths, 6ths, 8ths, 10ths, 11ths, 13ths and 16ths occur between the outer voices. 2nds, 4ths, 7ths and 9ths would mix the 6 and dim sides [EL].
- **Oblique motion:** a held voice while others move. Echols's ep.1 "Relative Motion" covers parallel, contrary and oblique [E]. In the elevator, oblique motion needs borrowing [EL].
- **Borrowing** [R1 "'Borrowed Notes'"; R2 "Voicings With 'Borrowed Diminished Notes'"; R3 Ex.19–29; K ch.3; E ep.3–4; FB slides 8–10, 17]:
  - one, two or three voices take a note of the scale's other chord, then resolve;
  - borrowing a dominant root into a dim voicing gives a maj7 sound [R3 Ex.23–24];
  - Echols: "borrowing 3 notes can be quite perplexing"; the Elevator is his tool for it [E ep.4];
  - without the 6-dim scale, borrowing is safe only at 2–1, 2–3, 4–3, ♯4–5, 6–5 and 7–6 [FB slide 9].
- **Passing, auxiliary and the ♭III° diminished.**
  - The passing dim (I6 – ♯I° – ii) and the auxiliary over a held bass are standard.
  - "The ♭III Diminished Chord" is a named Part 2 topic [R2].
  - "Use of the Related Diminished Chord" [R1 ch.2 and ch.5].
- **"Major – Minor – Minor/6"** ("Major to minor to minor with the sixth in the bass") [R1 ch.3; K 2.7; M6].
  - In B♭ (as given): B♭6 – A°7 – B♭6/G – G♭°7 – B♭6/F – Gm6/E.
  - In C **(transposed)**: C6 – B°7 – C6/A (= Am7) – A♭°7 – C6/G – Am6/F♯ (= F♯ø7). Bass: C B A A♭ G F♯.
  - Use: from a major chord to the half-diminished a tritone away (Stella); to a m7 a tritone away (Giant Steps) [M6, Kingstone].
- **"The tritone's minor" in comping:** "a major 7th moves to a minor ii–V a tritone away, with A in the bass" [R4 Ex.5].
- **"6th – 6th – 6th" instead of ii–V–I** [R2]. Dm7–G7–C = F6–Dm6–C6. Practise movement exercises thinking that way.
- **One scale for the whole ii–V–I** [SG christianm77]:
  - Dm7 G7 C6 is all C6-dim;
  - Bø7 E7♭9 Am6 is all Am6-dim;
  - Cm7 | F7 | B♭ is B♭6-dim;
  - "start simple" with one scale, then bring in others.
- **"Ending a tune with movements on the 6-dim scale"**; "Extending the previous idea through 4 keys" [R1 ch.3].
- **"Finding common chords through the diminished chord"** and **"The Musical Universe"** [R2].
- **"The 6-dim scale contains two dominant 7th chords"**: V7 of the tonic and V7 of the relative [R1; R3 Ex.8]. In C6-dim: G7 (G B D F) and E7 (E G♯ B D) **(derived)**.
- **Kingstone's "Monk Moves"** (2.9) [K]: content not public **(verify)**.

**Reharmonising a melody with 6-dim** [R1 "Moving a Voicing Through the C6 Dim Scale"; R4 Ex.1, 5, 7; BC/improvisation; FB]:
- Melody notes that are tones of the 6 chord take the 6 chord; the notes between take the dim.
- Whole tunes can be played with the melody as the top note of a 6 chord or its dim [BC].
- Contrary motion and borrowing for long notes [R4].
- Rees's Body and Soul [R4]:
  - bar 1: contrary motion on D6-dim;
  - F♯m7 as A6;
  - B7 as Cm6 (the tritone's minor);
  - Em7 as G6;
  - A7 voiced with C♯°7 notes, then with G♭7 (a family member).

**The off-chord** [OC; E manual "on chord"]. Echols and his students call the 6 chord the **"on" chord** and its dim the **"off" chord**. A line drawn only from off-chord notes, by m3, ♭5, M6, m10, ♯11 or M13 leaps, is a long V that resolves to the 6 [OC, a student exercise, not Harris's own].

## A5. Comping

- **Left hand.** Shells: root + 6th, root + 7th (the 7th "acting as a diminished note"), root + octave, root + 10th [BC/shell-voicings].
  - A dominant shell in the LH works with the other 3 family dominants in the RH [BC].
  - "Small chords are easy to grab" [R2].
- **Transcriptions of Barry's own voicings** on the blues and on rhythm changes [R2 ch.2].
- **Counter-melody comping.** No source in reach names it. Harris's comping "movement" (A4) is the nearest thing. A moving top voice inside the 6-dim scale over a held chord is the counter-melody in effect [FB; R3] **(verify the term)**.
- **Chord-melody:** the R1 ch.3 tune studies (*Alone Together*, *Body and Soul*, *Django*, *If I Should Lose You*, *In Your Own Sweet Way*, *Stella*, *Like Someone in Love*, *I Remember You*); Kingstone ch.5, *Like Someone in Love*; Marijt's transcription of *A Time For Love*, with its borrowings [H03 paper].

## A6. Rhythm

- **Upbeats.**
  - "Importance of Playing Upbeats and Application to Each Instrument" [R2].
  - Walking bass "emphasising the upbeat"; rhythms "highlighting the 2+ and the 4+", "the 1+ and the 4+"; tied notes in the walk [R1 ch.4].
  - "Barry teaches feeling the 'and'. The relation of dance to jazz" [OBT, a video note].
- **"Feel 6 while playing in 4/4";** phrasing a melody in 6 over 4 (3 against 2) [R2].
- **Starting phrases in different bars:** "The rhythmic implication of starting a phrase in different bars" [R2].
- **"Rhythm rules the world"** (a Harris quote reported by a student, [LB]). The same post: "downbeats, harmonic rhythm, triplets, the and's — that's only scratching the surface."
- **The rhythm of the line.** The added-note rules exist so that chord tones land on beats. Larsen: Harris's lines change direction on off-beats (2&, 4&), which "makes the rhythm lighter" [JL].

## A7. How Harris taught improvisation

- **Compose lines over specific harmonic moves** (I going to VI7, for example), apply them to tunes that have that move, and work on the timing. "Improvisation is just composition in real time" [SG Tal_175, christianm77, both from Harris and Rees workshops].
- **Turn real phrases into exercises:** "This sounds great. I am going to make this into an exercise" [JL].
- **Learn the melody; "Feel the shape of the melody"** [R2].
- **Singing.** Chapter 5 "Vocalizing" has warm-ups, applied to *You Must Believe in Spring* with the E°7 and the related dim, and *Billie's Bounce* [R1]. There is a separate Vocal Workshop video.
- **Not "up and down" scale thinking.** The scales are "not the main substance". Use the scale outline to know where you are, then build phrases with chord tones on beats, pivots and 5-4-3-2 [SG; JL; LB].
- **Bird and Bud as the source.** Harris demonstrated a Parker line over a ii–V where "Parker is just playing the V over both chords" [HS]. Workbook tunes: *Anthropology*, *Billie's Bounce*, *Scrapple*, *Donna Lee*/*Indiana* [R1; R2].
- **The diminished scale** is not named "half-whole" [H03].

## A8. Minor

- **Scales:**
  - the minor half-step rules = melodic minor descending with the added ♭6, i.e. the m6-dim scale [HS; R1];
  - "The F Harmonic Minor Scale Performed Up and Down" [R2];
  - the minor 6-dim scale (G minor 6-dim on *How High the Moon*) [R1].
- **Tonic minor = m6,** not m7 [H03 paper; BC].
- **Minor ii–V:**
  - the line: the m7♭5's dominant (a M3 down), "7 up and down to the 3rd of V" (A3);
  - the harmony: Dø = Fm6, G7alt = A♭m6, Cm6 [H03 paper, the Marijt chart; FB].
  - m7♭5 is "the minor 7 flat 5 chord" topic in [R1]; "Re-thinking the m7 and the m7♭5 chords" [R1 ch.3]. m7♭5 = an inversion of m6 [BC].

## A9. Named devices (glossary)

| Device | Rule, in C | Source |
|---|---|---|
| Half-step / extra-note rules | A2.2–A2.3 | R1, P5, BC |
| Miscellaneous rule | up, then down by the starting note's rule; the extra note at the bottom | MR (Rees p.10c) |
| Triplet rules | 8th triplet → middle note's rule; 16th triplet → first note's rule | P5, TR |
| The three important arpeggios | on 1, 5, ♭7 of the dominant: C E G, G B♭ D, B♭ D F | P5, OBT |
| 3-to-9 / "3" phrase | E G B♭ D on C7; 3-to-♭9 = E G B♭ D♭ (the dim) | 54, JL |
| 5-4-3-2 phrases | A2.9 | R1, 54 |
| Pivot / pivot arpeggio | C5 – E4 G4 B4; on C7 use B♭maj7 | JL, SG |
| Barry's chromatic scale | scale degrees on beats, with a skip-back at half steps | MO, JL, E ep.5 |
| Surrounding notes | enclosures (lines); Kingstone: chordal surround | R2, K |
| Scale outline | one scale per bar of a tune, up from the root | R1 |
| Important minor | m6 (or m7) on the 5th of a dominant: G7 → Dm6 | R1, R2, BC |
| Tritone's minor | m6 a half step above a dominant: G7 → A♭m6 (= altered) | R2, M6, FB |
| The sixth on the fifth | major 6 on the 5th of a major chord: Cmaj7 → G6 | K 2.5, R3 Ex.10a, M6 |
| 4 related dominants / family | G7 B♭7 D♭7 E7 (one dim) | R1, R3 |
| Sisters and brothers | Kingstone's family term; Goren: the 4 notes of a dim | K, BC |
| Minor's dominant / 7 down to the 3rd | Gø–C7: E♭7 down to E | TC, HS |
| Major – minor – minor/6 | C6 – B° – C6/A – A♭° – C6/G – Am6/F♯ | R1, K, M6 |
| First movement | m6 → °7 → 7: Dm6 → B°7 → G7 | H03 |
| 6th – 6th – 6th | F6 – Dm6 – C6 for ii–V–I | R2 |
| Borrowed notes | A4 | R1, R2, R3, K, E |
| Contrary motion / Elevator | A4 | R1, R3, E, EL |
| ♭III diminished | I6/3 – ♭III°7 – ii7 (E – E♭ – D bass) | R2 |
| Related diminished chord | the dim that leads to a chord (blues bar 6: F6 – F♯° ) | R1 |
| Turnbacks | scale degrees / related dims | R2 |
| Feel 6 in 4 | 3-against-2 phrasing | R2 |
| Expand and contract; long–short | Kingstone practice forms (A4, E) | K |
| On / off chord | 6 chord / its dim (Echols's terms) | E, OC |

## A10. Guitar and bass

**Guitar.**
- **Kingstone** [K]: drop voicings and scales on all string sets; drop 2, drop 3, drop 2&4, drop 2&3 for all four scales; movement, borrowing; scale practice in single notes, 3rds, 6ths, 10ths and 4-note chords in tenths; expand and contract; long–short; a tune.
- **Roni Ben-Hur:** *Talk Jazz: Guitar* (the single-line method) and *Chordability*. **Pasquale Grasso** lessons. **Parks** videos [OBT].
- **Echols:**
  - 6-dim voicing catalogues per scale (35 voicings for the 7th-dim, [E ep.10]);
  - the Elevator, the octatonic, "octave chords", shell chords, thirds and triads shorts [E store];
  - "Archetypes and Outlines" for "7 Essential Movements" (Foundations IV, paywalled) [E].
- **Fretboard tip** from a student [LB]: the same drop 2 positions every 3 frets serve the 4 keys of one dim (C, E♭, G♭, A).

**Bass.**
- Walking that emphasises upbeats; 2+/4+ and 1+/4+ patterns; tied notes [R1 ch.4].
- No dedicated Harris bass method was found.

## A11. Pedagogical order, as the sources sequence it

**Workbook 1** [R1]:
1. Basics: the ABCs → half-step rules (dominant, major, minor) → the chromatic breakdown → dim and 4 dominants → dim scale → related dominant scales → m7♭5 → 5-4-3-2.
2. Applications: scale outlines of tunes.
3. Moveable chords: 6-dim scale → contrary motion → minor 6-dim → tunes → tritone's minor → m7 and m7♭5 rethought → moving voicings → 4 keys → ii–V–I → borrowed notes → major–minor–minor/6 → 4 related dominants as V7 subs.
4. Rhythm section.
5. Vocal.

**Workbook 2** [R2]:
- chromatic → whole tone → 3 dims → 4 dominants → dim scale → surrounding notes → shape of the melody → phrase building on rhythm changes → turnbacks → expanded extra-note rules → harmonic minor → the four key scales → chromatic major and dominant scales;
- harmony: up and down → contrary motion → Sixth Chords Rule → important and tritone's minor → m6-dim movement → borrowed dim notes → 6-6-6 → common chords through the dim.

**Parks** [PO]: the dominant scale (8 ways on F7) → three arpeggios → descending rules → triplets → chromatic scale → a tune.

**Echols** [E store, episode order]:
- relative motion → substitution → borrowing → borrowing via the elevator → chromatic scale → symmetry (whole tone) → 7♭5-dim → octatonic → 7th-dim → … → elevator sequence → pivoting;
- Foundations: polyphony (the four scales of chords, 7 core skills) → monophony ("a full catalog of Barry Harris's methods for building bebop lines") → real-time choices → 7 Essential Movements.

### Where Echols differs from or adds to Kingstone, Rees and Parks

- **The Elevator** [EL; E ep.4, 16, 17] is Echols's own. Rees and Kingstone teach contrary motion and expand–contract; Echols turns them into a navigable grid, so parallel, contrary and (with borrowing) oblique motion become one map. Borrowing 3 notes becomes tractable.
- **Geometry.** Echols maps the 16 chords around two adjacent dims as a tesseract after Tymoczko [E manual]. Harris's own derivation is the half-step moves from one dim [H03]. Same content; Echols adds explicit voice-leading distance.
- **Substitution over V.** Echols's app picks among several substitutions on every V, including "the tritone's minor" [E manual]. This makes the important minor, the tritone's minor and the family into one menu, the same idea as the app's §4 "8 expressions".
- **All four scales on guitar,** with full voicing catalogues (7♭5-dim ep.8, 7th-dim ep.10). Rees's Part 2 names the scales; Kingstone gives their drop charts in an appendix; Echols makes them a curriculum.
- **Terms:** "on chord" and "off chord"; "Archetypes", "Outlines" and "Essential Movements"; "linguistic muscle memory".
- **The four pivoting scenarios** (ep.17) extend the pivot to chordal or polyphonic lines; no other source does this.
- **Unverified:** the details behind his paywall (Foundations I–IV, episode PDFs). Only the product descriptions and one student transcription were readable.

---

# PART B — Checklist against the app

Key: **COVERED** (with its id), **SHALLOW** (what is missing), **MISSING**, **APP-IS-WRONG** (with file:line).

### B1. Scales and lines

| # | Item | Status | Evidence / gap |
|---|---|---|---|
| 1 | Dominant scale down from each chord tone, 1–♭7 half step | COVERED | harris-2 `h2-dominant` (generate.ts:1351); g-harris-3; b-barry-3; topic bh-lines L1 |
| 2 | Three half steps (3–2, 2–1, 1–♭7) from 3, 5, ♭7 | COVERED | bh-lines L2–3; `barry.ts` ruleFor |
| 3 | Three half steps **from the root** too (Parks) | SHALLOW (sources disagree) | `barry.ts:51` and `topics.ts:372` exclude degree 1; `jazz.ts:909` says "Start on 3, 5 or ♭7". Goren agrees with the app, Parks does not. Add degree 1 as an allowed answer, or say "Parks also allows it from the root" |
| 4 | Non-chord tones: 0 or 2 (2–1, 1–♭7) | COVERED | bh-lines; harris-14 (from the 9th, generate.ts:1575) |
| 5 | harris-14 option 1 ("C7 from the 13th") places the first half step at 6–5 (E E♭ D) | SHALLOW (differs from the workbook) | `ruleDown` (generate.ts:3410) puts a half step right after a tension. For the 13th that is 6–5, where the workbook's dominant rule places 2–1 and 1–♭7. Correct by the "any extra note" view [SG, JL], but label it as the expanded rule, not "the half-step rule" |
| 6 | Major-scale rules (6–5; 3 from 3, 5, 6; 0 or 2 from 2, 4) | SHALLOW | Only harris-1 (from the root) and harris-14 option 2 (C6 from the 9th). No drill or ear item for major from 3, 5, 6 or the three-half-step major line |
| 7 | Minor rules (= m6-dim scale descending) | SHALLOW | harris-14 option 3 (Cm6 from the 9th) only |
| 8 | Miscellaneous rule (go up, come down by the start's rule) | MISSING | — |
| 9 | Triplet rules (8th = middle note; 16th = first note) | MISSING as rules | h7 has one triplet lick; AUDIT-DEPTH lists k-vocab 8–9 "triplet rules" (not Harris's rule). No drill applies the middle-note rule |
| 10 | ABCs: 3rds; 3rds with a half step below; triads; triads and 4-note chords with a half step below | PARTLY | harris-3 (triads), harris-4 (1-3-5-7, 3-to-9), harris-6 (half step below each **scale** note). Missing: scale in 3rds with half steps; "triad/chord with a half step below its first note" |
| 11 | Major arpeggios chromatically down, all inversions | MISSING | — |
| 12 | Three important arpeggios on a dominant (I, the minor on 5, the major on ♭7), 1-3-5-8 shape | MISSING as a named set | h11 arpeggiates the dominant 7th from each tone, not Gm and B♭ on C7 |
| 13 | Arpeggio up, scale down | COVERED | harris-11, harris-15 |
| 14 | Scale outline of a tune (one scale per bar, up from the root) | MISSING | No drill turns a chart into its scale outline. Biggest pedagogical gap on the line side |
| 15 | Pivot arpeggio (C5 E4 G4 B4) | COVERED | harris-19–21, bh-pivot-arp, g-harris-8, b-barry-7 |
| 16 | Pivot on a dominant via the ♭7 major arpeggio (B♭maj7 on C7) | MISSING | h19 pivots the chord's own arpeggio only |
| 17 | Scale line with a pivot | COVERED | harris-23, bh-pivot, g-harris-9, b-barry-8 |
| 18 | **Barry's chromatic scale** (scale degrees on beats, skip-back at half steps) | **APP-IS-WRONG / MISSING** | harris-17 is titled "The chromatic scale with the rules" (generate.ts:5613; builder `harrisChromatic`, generate.ts:3554-3581). It puts **chord tones** on every beat with 8ths, triplets and 16ths between: a valid chromatic exercise, but **not** Harris's chromatic scale as Parks, Larsen, Otto and Echols describe it. Rename h17 ("chromatic runs between chord tones") and build the real one |
| 19 | 5-4-3-2 phrases (major, dominant, minor), combined lick | MISSING | Not found in src. (`harris2.ts:273` "5432" is a guitar string set, unrelated) |
| 20 | Enclosures / surrounding | COVERED | harris-6 option 1, harris-24, k-vocab, g-bebop |
| 21 | 3-to-9 | COVERED | harris-4 option 1, g-harris-4 |
| 22 | 3-to-♭9 = the dim on the 3rd, shared by the family | SHALLOW | harris-8 plays 3-to-**9** over the four brothers (generate.ts:1524-1545, `[4,7,10,14]`), so the shared dim (3-to-♭9) never sounds. Add option 1: 3-to-♭9 over all four, the same four notes each time |
| 23 | Family as V7 substitutes in a line | COVERED partly | harris-16 (chains by half steps); AUDIT-DEPTH #5 says brothers never replace V in a cadence |
| 24 | "ii is V" (play V over ii–V) | COVERED | harris-7 option 1 |
| 25 | m7♭5 → its dominant a M3 down; "7 up and down to the 3rd of V" | MISSING | harris-15 minor uses an Fm6 arpeggio (= B♭9 rootless): consistent, but the named device, B♭7 down to B, is absent |
| 26 | Important minor / tritone's minor as named terms | SHALLOW | The facts are taught (bh-six-over: G7 → Dm6, G7alt → A♭m6), but Harris's names never appear (grep: 0 hits). Add the names to bh-six-over and to §4 |

### B2. 6th-diminished harmony

| # | Item | Status | Evidence / gap |
|---|---|---|---|
| 27 | Three dims; moves (down → 7, up → m6, 2 consecutive → 6, non-consecutive → 7♭5) | COVERED | bh-convert, bh-convert-2, bh-three-dim, harris-13; lesson numbers checked: `jazz.ts:621-692` ✓ |
| 28 | `moveDim` pair (3,0) bug | open (known) | `barry.ts:33` (audit #33) |
| 29 | Harris's "first movement" m6 → °7 → 7, and "next move" 6 → °7 → 6 | MISSING as named | harris-13 does °7 → 7 → I6 and °7 → m6, not Dm6 → B°7 → G7, nor E♭6 → C°7 → A♭6 |
| 30 | Major and minor 6-dim scale, harmonised, from each chord tone | COVERED | k-sixdim-1/6, harris-9/10, g-harris-2/7 |
| 31 | **7th-dim and 7♭5-dim scales** ("Barry's four key scales") | **MISSING** in drills | Only in BARRY-HARRIS-THEORY §5. No drill, ear item or lesson uses C7+B° or C7♭5+B° (grep: none) |
| 32 | Drop 2 / drop 3 | COVERED | harris-9/10 options 1–2; g-harris-7 |
| 33 | Drop 2&4 | PARTLY | k-sixdim-4 "spreads" and pianoJazz.ts:55 drop the 2nd and 4th voices. Not named "drop 2&4"; "spread" is not a Harris term (A4). No drop 2&3 |
| 34 | Contrary motion on the 6-dim scale (unison outward, fill in) | **MISSING** | k-sixdim-3 is oblique; no contrary-motion drill. A core workbook exercise [R1, R2, R3 Ex.17]; Echols's Elevator generalises it |
| 35 | Oblique motion | COVERED | k-sixdim-3 |
| 36 | Borrowing, 1 voice | COVERED | k-sixdim-2/6 |
| 37 | Borrowing 2 and 3 voices; borrowing a dominant root into the dim (maj7 sound) | MISSING | k-sixdim-2 moves one voice at a time (generate.ts:3758) |
| 38 | Chord conversion chart | COVERED | bh-six-over L1–3; `barry.ts` SIX_OVER matches Marijt's table exactly |
| 39 | The sixth on the fifth (G6 over Cmaj7) | **APP-IS-WRONG (term)** + SHALLOW | harris-18 is titled "The sixth on the fifth" (generate.ts:5614). Its forms (H18_FORMS, generate.ts:3493) use G7 → Dm6 and Cmaj7 → **C6**. In Harris and Kingstone (K 2.5; M6; R3 Ex.10a) "the sixth on the fifth" is the **major 6 on the 5th of a major chord** (G6/C); Dm6 on G7 is "the important minor". The app has the term on the wrong device and no drill for the real one (only mentioned at `jazz.ts:848`) |
| 40 | Passing dim | COVERED | k-sixdim-5, bh-dim-roles |
| 41 | Auxiliary dim | COVERED | k-sixdim-11 |
| 42 | ♭III°7 | COVERED (ear and lesson) | bh-dim-roles (`harris2.ts:97`); k-sixdim-5 option per audit |
| 43 | Chords move to chords | COVERED | k-sixdim-12, bh-chords-move |
| 44 | m6 = m7♭5 = 9 | COVERED | k-sixdim-13, bh-m6-bass |
| 45 | ii–V–I 6-dim (6-6-6) | COVERED | k-sixdim-8 |
| 46 | One scale over the whole ii–V–I (C6-dim over Dm7 G7 C) | MISSING | k-sixdim-8 changes the scale per chord |
| 47 | Major – minor – minor/6 | MISSING | — |
| 48 | 4 related dominants as V7 subs **in comping** (voicing over a shell) | MISSING | Rees Ex.11–13: B♭7 → E♭ with E7, G7 and D♭7 voiced as B♭6 inversions; floating up the dim arpeggio |
| 49 | Tritone's minor resolution (Cm6 as B7alt → E) | MISSING as a drill | Covered as theory only |
| 50 | Reharmonising a melody with 6-dim | MISSING | AUDIT-DEPTH C1, same gap |
| 51 | Forms comped the 6-dim way | COVERED (piano) | k-sixdim-9/10; guitar SHALLOW (audit) |
| 52 | Sus → important minor over the root (B♭6 → Gm6 over C) | SHALLOW | Conversion taught (bh-six-over L3), resolution never drilled |
| 53 | Dim scale = 2 dims (dominant context) | COVERED | bh-three-dim (`harris2.ts:70`) |

### B3. Rhythm, pedagogy, minor, other instruments

| # | Item | Status | Evidence / gap |
|---|---|---|---|
| 54 | Upbeat emphasis (2+, 4+; 1+, 4+); walking on the upbeat | MISSING (Harris-labelled) | Not found as Harris drills |
| 55 | Feel 6 in 4; phrases started in different bars | MISSING | — |
| 56 | Compose-a-line-over-a-move, then apply it to a tune | MISSING | AUDIT-DEPTH C5/C6 are close (`use-lick`, write a chorus) |
| 57 | Singing (warm-ups, the dim applied to a tune) | COVERED partly | vocal-barry 1–7 (audit) |
| 58 | Minor: harmonic minor up and down; m6-dim lines | SHALLOW | k-sixdim-6 harmony only; harris-15 minor |
| 59 | Guitar: all string sets, drop 3, drop 2&4 | SHALLOW | g-harris-7 covers sets for drop 2; no drop 3 or drop 2&4 for 6-dim; no passing or aux (audit) |
| 60 | Bass: Harris levels in all 12 keys | **(verify)** | b-barry-1–6 list keys `[0, 5, 7, 10]` and `[0, 5, 7, 10, 3]` (bassNiche.ts:1111-1116), against the "all 12 keys" rule; b-barry-7/8 use ALL12. keys12.ts may widen them at runtime; check |

### B4. Other text checks

| # | Location | Finding | Status |
|---|---|---|---|
| 61 | `pianoJazz.ts:47` "Raise one a whole step → a dominant with ♭9 (its 7th drops out)" | Arithmetically true, but not a Harris move. Harris's moves are all half steps; the 7♭9 is "a root a half step below any dim note" | APP-IS-WRONG (misleading). Replace with the Harris rule |
| 62 | `jazz.ts:1633` "for G7 think of a diminished chord" | Conflicts with bh-six-over, where G7 → Dm6. Harris: G7 → Dm6 (important minor), or A♭m6; the dim belongs to the 7♭9 | SHALLOW / inconsistent |
| 63 | `harris2.ts:242` "Barry calls the minor 6th the most useful chord" | No source found | (verify), or rephrase without the quote |
| 64 | `engine/barry.ts:11` "Exploring the Diminished (Hague workshop transcription, 2003)" | It is V. Marijt's 2014 MA paper, quoting a 2003 fragment transcribed by Rees | Citation fix |
| 65 | `AUDIT-CONTENT-THEORY.md:297` cites Kingstone's "*Harmonic Concepts*" and "*Spreads & Chords*" | Not found anywhere. Kingstone's book is *The Barry Harris Harmonic Method for Guitar* | Citation fix (verify) |
| 66 | bh-lines L3 (`topics.ts:384`): the "on the beats" answer uses the three-half-step line, which puts the 9th on a beat | Defensible (all chord tones are on beats; one chromatic passing tone also is) but may confuse | Minor: say "every chord tone on a beat" |
| 67 | BARRY-HARRIS-THEORY §4 table | All 8 rows verified note by note (A13 below) | ✓ |
| 68 | BARRY-HARRIS-THEORY §5 spellings | ✓ (A4): the 7th-dim by Parks; the 7♭5-dim by construction plus [R2] and [E] | Remove "(verify)" |
| 69 | "Make it minor" (§7) | No source uses this phrase. Harris's term for the m6 on V's 5th is **the important minor** | Keep the app's phrase as an alias only |
| 70 | Path order: harris-15 (1960) after the pivot levels (1440–1650) | Known (AUDIT-DEPTH) | Part D re-rates |

### A13. Verification of §4 (8 chords over G7)

Over G: B♭7 = B♭ D F A♭ = ♯9 5 ♭7 ♭9 ✓. D♭7 = D♭ F A♭ C♭ = ♭5 ♭7 ♭9 3 ✓. E7 = E G♯ B D = 13 ♭9 3 5 ✓. Dm6 = D F A B = 5 ♭7 9 3 ✓. Fm6 = F A♭ C D = ♭7 ♭9 11 5 ✓. A♭m6 = A♭ C♭ E♭ F = ♭9 3 ♭13 ♭7 ✓. Bm6 = B D F♯ G♯ = 3 5 maj7 ♭9 ✓.

The dims:
- G7-dim uses F♯° = C° class ✓; B♭7 uses A° ✓; D♭7 uses C° ✓; E7 uses D♯° ✓. All four share C°.
- Dm6 uses C♯° = D♭° class ✓; Fm6 uses E° ✓; A♭m6 uses G° ✓; Bm6 uses A♯° ✓. All four share D♭°.
- All 8 chords come from D° (= B°): the 4 by lowering a note, the 4 by raising one (A1).

**New observation (sourced pieces, derived link):** the four m6 chords are exactly the **important minors of the four brothers**:
- Dm6 of G7;
- Fm6 of B♭7;
- A♭m6 of D♭7, which is also G7's **tritone's minor**;
- Bm6 of E7.

So §4 = the family × {itself, its important minor}.

---

# PART C — Proposed text for `docs/BARRY-HARRIS-THEORY.md`

**C1. §4, after the table, add:**

> **Harris's names.** Dm6 over G7 is **the important minor** (the m6 on the dominant's 5th). A♭m6 over G7 is **the tritone's minor** (the important minor of D♭7, the tritone sub). Harris calls it "the perfect altered scale" (Workshop Part 2). The four m6 chords are the important minors of the four related dominants: Dm6 (G7), Fm6 (B♭7), A♭m6 (D♭7), Bm6 (E7). The choice between the important minor and the tritone's minor is a matter of taste (Kingstone). The "8 expressions" table is the app's arrangement of these two Harris ideas, not a Harris list.

**C2. §5:** remove "(verify)". Add:

> Harris calls these "Barry's four key scales" (Workshop Part 2). The 7th-dim scale was confirmed by Parks (1 2 3 4 5 ♭6 ♭7 7). The 7♭5-dim scale follows from the construction; since C7♭5 = G♭7♭5, one 7♭5-dim scale serves two roots ("you learn 6 and you know all 12", Harris 2003). The 6-dim scales are first a **chording** tool ("you learn these kind of scales for chording", Harris 2003). The default for single lines is the 7-note scale with the extra-note rules.

**C3. New §8, "The half-step (extra-note) rules":**

> Descending from at least the octave, starting on a downbeat. **Dominant:** from 1, 3, 5, ♭7 add one (1–♭7) or three (3–2, 2–1, 1–♭7; Parks allows three from the root too, Goren only from 3, 5, 7); from 2, 4, 6 add none or two (2–1, 1–♭7). **Major (6-chord tones 1 3 5 6):** one at 6–5, or three (6–5, 3–2, 2–1) from 3, 5, 6; from 2 or 4, none or two (2–1, 6–5). **Minor:** as major with ♭3; from the root this is the m6-dim scale. **Miscellaneous rule:** go up from a note, then come down by that note's rule; if the extra note would fall on a beat, put it in the bottom octave. **Triplets:** an eighth triplet follows its middle note's rule, a sixteenth triplet its first note's. Later Harris spoke of "extra note rules": the rule (an odd or even count) matters more than the note.

**C4. New §9, "Line devices":**

> The **three important arpeggios** on a dominant (on 1, 5, ♭7: C E G / G B♭ D / B♭ D F for C7, played 1-3-5-8). **3-to-9** (E G B♭ D) and **3-to-♭9** (E G B♭ D♭ = the dim on the 3rd, shared by all four related dominants). **5-4-3-2 phrases** (Workbook 1; notes per Part A2.9). **Barry's chromatic scale:** scale degrees on the beats, chromatic notes between, and at an existing half step a skip to the note above and back (ascending in C: C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C). **Seven down to the 3rd:** over Dø–G7, play B♭7 (the m7♭5's dominant, a major 3rd down) up and down, landing on B. **ii is V:** over Dm7–G7, play G7. **Scale outline:** one scale per bar of a tune, up from the root.

**C5. §7, "Make it minor":** append:

> Harris's own term is **the important minor**; keep "make it minor" as the app's alias only.

Add:

> **The sixth on the fifth** = the major 6 on the 5th of a major chord (G6 over Cmaj7 gives 5, 7, 9, 6; better with the root in the bass). Not the m6 on V's 5th.

**C6. New §10, "Moves":**

> **First movement** (Harris 2003): m6 → °7 → 7 (Dm6 → B°7 → G7 → C6). **Next move:** raise two consecutive dim notes, return, lower them (E♭6 → C°7 → A♭6). **Major – minor – minor/6:** C6 – B°7 – C6/A – A♭°7 – C6/G – Am6/F♯ (to the half-diminished a tritone away). **6th – 6th – 6th:** think F6 – Dm6 – C6 for ii–V–I, or a single C6-dim scale over all of it. **The tools:** invert (drop 2), slide along the scale, borrow (one, two or three voices; a borrowed dominant root in a dim voicing gives a maj7 colour). **Contrary motion:** from a unison, outer voices step apart and the middle fills in, 6 and dim alternating (Echols's Elevator: floors = voicing types; along a floor = parallel, between floors = contrary).

**C7. §6, step 3:** replace "then drop 2 and drop 3" with:

> then drop 2, drop 3 and drop 2&4 (Friends of Barry: drop 2 is the most useful; drop 3 for LH shells and contrary motion; drop 2&4 for 5ths). Avoid the word "spread" as a Harris term; Kingstone calls the contrary-motion form "expand and contract".

**C8. Sources line (new):**

> Rees, Workshop Video 1–2 (TOC) and Keyboard 10/1998, 11/1998; Harris 2003 Hague fragment (in Marijt 2014); Kingstone, *Harmonic Method for Guitar*; Parks, *Things I've Learned* (video 5) and Open Studio; Echols, *Labyrinth of Limitations*; Goren, *Barry Harris Companion*; Friends of Barry slides. Full list: `docs/research/BARRY-HARRIS-METHOD.md` §0.

---

# PART D — Build order (700–1900 scale; P = piano, G = guitar, B = bass, V = voice)

Fix first, small:

| # | Item | Where | Rating |
|---|---|---|---|
| D0a | Rename harris-17 to "Chromatic runs between chord tones"; rename harris-18 to "The important minor: lines through each chord's 6th-dim scale" | generate.ts:5613-5614 | — |
| D0b | Text fixes | pianoJazz.ts:47; jazz.ts:1633; harris2.ts:242; barry.ts:11; jazz.ts:909 (add Parks's root option) | — |
| D0c | Re-rate the harris path so the rules precede the pivots (h14, h15 → ~1350–1450; h19+ → 1500–1650) | path.ts:390,431 | — |

Then, by value to the method:

| Order | New level / topic | Instruments | Rating |
|---|---|---|---|
| 1 | **Barry's chromatic scale** (major, dominant, then m6-dim), rubato → tempo, 12 keys; ear: "which note is the skip-back?" | P G B V | 1300–1400 |
| 2 | **Scale outline of a tune**: blues, rhythm changes, *Indiana* changes. Each bar: the scale from the root up (and down on long chords); the app marks the related-dim bar | P G B | 1250–1450 |
| 3 | **Contrary motion on the 6-dim scale** (unison out to drop 2/3, then the Elevator floors) | P G | 1450–1600 |
| 4 | **7th-dim and 7♭5-dim scales**: scale, harmonised in drop 2, and over a V7 → I | P G (B single line) | 1500–1650 |
| 5 | **5-4-3-2 phrases** (dominant, major, minor), then the combined lick, then inserted into a scale-outline line | P G B V | 1400–1550 |
| 6 | **The sixth on the fifth** (G6/C), with a scale of chords on the 5th over a C bass | P G | 1400 |
| 7 | **First movement / next move / major–minor–minor/6** (harmony drills plus ear "which move?") | P G | 1350 / 1450 / 1600 |
| 8 | **Three important arpeggios** and the **♭7-major pivot** on dominants (C7: C E G C, G B♭ D G, B♭ D F B♭; B♭maj7 pivot) | P G B | 1250–1400 |
| 9 | **Seven down to the 3rd** (minor ii–V: B♭7 → B; major: the family move) | P G B V | 1450 |
| 10 | **Triplet rules** (middle-note rule on scale runs); then the **miscellaneous rule** | P G B | 1500 / 1550 |
| 11 | **Borrowing 2 and 3 voices**; borrowed dominant root in the dim | P G | 1550–1700 |
| 12 | **4 related dominants voiced over a shell** (Rees Ex.11–13) and the tritone's minor resolution | P G | 1550–1650 |
| 13 | **Harmonise a melody with 6-dim** (AUDIT-DEPTH C1), contrary motion on long notes | P G | 1500–1750 |
| 14 | **Major-scale and minor rules from every degree** (h14 extension) + ear | P G B | 1300–1400 |
| 15 | **3-to-♭9 over the family** (h8 option 1) | P G B | 1450 |
| 16 | **Upbeat rhythm** (2+/4+ comping hits; bass walking ties); **feel 6 in 4** phrasing | P G B (drums later) | 1300–1500 |
| 17 | **Compose a line over a move** (I → VI7, ii–V), then use it in a tune (with AUDIT-DEPTH C6) | all | 1500–1750 |
| 18 | Guitar mirror: drop 3 and drop 2&4 6-dim on string sets; passing/aux; forms | G | 1400–1650 |
| 19 | Major chromatic arpeggios down; ABCs 3rds with half steps | P G B | 1100–1250 |

---

# PART E — Exercise catalogue

Format per exercise:
- **Source:** where it comes from, with its URL key from §0.
- **Concept:** what it trains.
- **Procedure:** the exact steps, with a C example.
- **Progression:** variations and the harder steps.
- **Instruments:** P = piano, G = guitar, B = bass, V = voice.
- **App:** IN-APP / PARTLY / NOT-IN-APP, with the level or topic id.
- **Game:** a one-line game idea where it fits.

### E1. Scale up and down, root to 7th [R1 ABCs; OBT]
- **Concept:** the scale as one bar.
- **Procedure:** C7 in 8ths: C D E F G A B♭ | B♭ A G F E D C (2 bars).
- **Progression:** every key, every position; 200 bpm goal (study group); then joined per chord along a scale outline.
- **Instruments:** P G B V.
- **App:** PARTLY (scale drills exist elsewhere, not this shape).
- **Game:** tempo ladder, "200 club"; streak of clean bars.

### E2. Scales in 3rds, with a half step below the upper note [R1; OBT]
- **Concept:** the ABCs.
- **Procedure:** C E D F E G …; then B C E | C♯ D F | D♯ E G …
- **Progression:** triads; 4-note chords; each with a half step below the first note.
- **Instruments:** P G B.
- **App:** PARTLY (harris-3, harris-4, harris-6).
- **Game:** accuracy run with a ghost line.

### E3. Thirds with triplets [Galliano listing via search snippet (verify); Parks ep.24]
- **Concept:** a triplet as an embellishment.
- **Procedure:** the scale in 3rds with a triplet on the top note of each pair.
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** rhythm-accuracy meter.

### E4. Major arpeggios chromatically down, all inversions [OBT joe2758]
- **Procedure:** C G E C → B F♯ D♯ B → B♭ F D B♭ …; then root position and the other inversions.
- **Instruments:** P G B.
- **App:** NOT-IN-APP.
- **Game:** speed run through 12 keys; misses cost time.

### E5. Three important arpeggios [P5; OBT]
- **Procedure:** on C7: C E G C, G B♭ D G, B♭ D F B♭, up and down, all inversions.
- **Progression:** connect into the scale down by the rules.
- **Instruments:** P G B.
- **App:** NOT-IN-APP.
- **Game:** call and response: the app calls "5!" and you play G B♭ D G.

### E6. Dominant scale down from each degree, with the rules [P5; R1; BC]
- **Procedure:** see the A2.2 table: each degree, each rule, twice (Parks's routine).
- **Progression:** 12 keys; the miscellaneous rule; triplets.
- **Instruments:** P G B V.
- **App:** IN-APP harris-2, harris-14, g-harris-3, b-barry-3; topic bh-lines.
- **Game:** puzzle "fix the line": insert the half steps so the chord tones land.

### E7. Major and minor rules from each degree [BC; HS]
- **Procedure:** C B A A♭ G … (A2.3); minor from the root: C B A A♭ G F E♭ D C.
- **Instruments:** P G B V.
- **App:** PARTLY (harris-1, harris-14 options 2–3).
- **Game:** "odd or even?" flash quiz.

### E8. Miscellaneous rule [MR; P5]
- **Procedure:** G A B♭ C, then down from C by G's rule, the extra note in the bottom octave.
- **Instruments:** P G B.
- **App:** NOT-IN-APP.
- **Game:** puzzle.

### E9. Triplet-rule runs [P5; TR]
- **Procedure:** F7: start a triplet on G (middle note A → the chord-tone rules), then descend with one or three half steps.
- **Instruments:** P G B.
- **App:** NOT-IN-APP.
- **Game:** "spot the middle note" speed quiz.

### E10. Arpeggio up, scale down, from each chord tone [R1 applications; SG]
- **Procedure:** C7: E G B♭ D, then the scale down from E by the rules.
- **Progression:** through ii–V–I; through a scale outline.
- **Instruments:** P G B.
- **App:** IN-APP harris-11, harris-15.
- **Game:** duel: the app plays a line, you answer from the next chord tone.

### E11. Scale outline of a tune [R1 ch.2; SG; OBT p.2 (Indiana)]
- **Procedure:** write and play one scale per bar. Blues in C: C7 | F7 | C7 | C7 | F7 | F♯° (related dim) | C7 up | C7 down to C♯ (into A7) | …
- **Progression:** rhythm changes (the important minor); the *Cherokee* bridge; *How High the Moon* (G m6-dim).
- **Instruments:** P G B.
- **App:** NOT-IN-APP.
- **Game:** "outline builder" puzzle: drag scales onto bars, then play them; star rating.

### E12. 5-4-3-2 phrases [R1; 54]
- **Procedure:** see A2.9; over C7: G B C F E | (G) F D E♭ E | E G B♭ D | D B♭ B C; then the combined lick.
- **Progression:** major and minor versions; insert into lines; 12 keys.
- **Instruments:** P G B V.
- **App:** NOT-IN-APP.
- **Game:** call and response: the app calls a number, you play the phrase in the current key.

### E13. Barry's chromatic scale [JL; MO; E ep.5; PO]
- **Procedure:** C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C, up and down.
- **Progression:** the dominant version; 6-dim versions; mixed with 5-4-3-2 (study group).
- **Instruments:** P G B V.
- **App:** NOT-IN-APP; harris-17 is a different exercise.
- **Game:** metronome accuracy: every scale degree must land on the click.

### E14. The pivot arpeggio from each chord tone [JL; SG]
- **Procedure:** C5 E4 G4 B4; E5 G4 B4 C5 …; the mirror.
- **Progression:** ii–V–I; inside scale runs; the ♭7-major pivot on dominants.
- **Instruments:** P G B V.
- **App:** IN-APP harris-19–24, g-harris-8–10, b-barry-7–8; PARTLY for the ♭7 pivot.
- **Game:** a range challenge: play a 4-bar line inside one octave using pivots.

### E15. Whole-keyboard line by pivoting [SG]
- **Procedure:** rhythm changes from the bottom to the top of the instrument and back, by pivots.
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** "climb the tower": reach the top register by bar 8.

### E16. Seven down to the 3rd [TC; HS]
- **Procedure:** Dø–G7: B♭ C D E♭ F G A♭ | A♭ G F E♭ D C B → C.
- **Instruments:** P G B V.
- **App:** NOT-IN-APP.
- **Game:** "land the 3rd" accuracy streak across 12 keys.

### E17. Family lines: a half step into each related dominant [R1 "related dominant scales = chord movements"; BC]
- **Procedure:** C7 → A7 → G♭7 → E♭7 → A♭.
- **Instruments:** P G B.
- **App:** IN-APP harris-16 (chains); PARTLY (no cadence substitution).
- **Game:** a "which brother?" duel.

### E18. Dim moves around the circle [H03; BC/family]
- **Procedure:** hold B°7; lower each note (G7, B♭7, D♭7, E7), raise each (Dm6, Fm6, A♭m6, Bm6), move pairs (major 6s, 7♭5s), naming each aloud.
- **Instruments:** P G.
- **App:** IN-APP harris-13, bh-convert, bh-convert-2.
- **Game:** speed puzzle "name the chord" with the moved finger shown.

### E19. First movement and next move [H03]
- **Procedure:** Dm6 → B°7 → G7 → C6; E♭6 → C°7 → A♭6, in 12 keys.
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** ear duel "which move?".

### E20. Scale of chords from each chord tone, close then drop 2 [R1 ch.3; FB 16]
- **Procedure:** C6 / B°7 harmonised up and down: melody from C, E, G, A.
- **Progression:** minor; drop 3; drop 2&4; drop 2&3 (Kingstone); all string sets.
- **Instruments:** P G.
- **App:** IN-APP k-sixdim-1/6, harris-9/10, g-harris-2/7; PARTLY for drop 2&4 and 2&3.
- **Game:** "chord ladder" speed with a clean-voicing streak.

### E21. Contrary motion from a unison; Echols's Elevator [R1; R3 Ex.17; E ep.4, 16; EL]
- **Procedure:** in C6-dim, start on a unison G and step the top up and the bottom down, filling in from the same chord: G | F A♭ (dim) | E G A (C6) | D F A♭ B (dim) | C E G A C (C6) … **(derived)**. Elevator: one melody note, then rise floor by floor (3rd, triad, 6th, octave, drop 2, drop 3, drop 2&4, double octave).
- **Progression:** mix moving along a floor (parallel) with taking the elevator (contrary); harmonise the *Autumn Leaves* pickup (EL example in B♭: G A B♭).
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** "elevator" puzzle: reach floor N on the melody's last note; levels by floor count.

### E22. Borrowing: one, two, three voices [R3 Ex.19–29; K ch.3; E ep.3; FB 17]
- **Procedure:** C6 (E G A C): G → A♭ and back; then two voices; then three (Echols's elevator method).
- **Progression:** borrow a dominant root into the dim (maj7 colour); resolve or don't.
- **Instruments:** P G.
- **App:** PARTLY (k-sixdim-2/6, one voice only).
- **Game:** "tension and release" ear quiz: was something borrowed?

### E23. Oblique motion over a held bass [R3; E ep.1]
- **Instruments:** P G.
- **App:** IN-APP k-sixdim-3.
- **Game:** —

### E24. 6-6-6 movement exercises [R2]
- **Procedure:** F6/D → Dm6/G → C6, each moving through its scale for a bar.
- **Progression:** one scale over the whole ii–V–I (C6-dim); minor (Fm6 / A♭m6 / Cm6).
- **Instruments:** P G.
- **App:** IN-APP k-sixdim-8; PARTLY (one-scale version missing).
- **Game:** circle-of-4ths marathon.

### E25. The 4 related dominants over a shell, floating up the dim [R3 Ex.11–13]
- **Procedure:** LH B♭7 shell; RH B♭6 inversions as E7, G7, D♭7 voicings; float them up the dim arpeggio and back, then resolve to E♭.
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** "family reunion": hit all four family members before the resolution.

### E26. Major – minor – minor/6 [R1; K 2.7]
- **Procedure:** C6 – B°7 – C6/A – A♭°7 – C6/G – Am6/F♯.
- **Instruments:** P G B (bass line C B A A♭ G F♯).
- **App:** NOT-IN-APP.
- **Game:** —

### E27. The sixth on the fifth [K 2.5; BC/improvisation]
- **Procedure:** C bass; RH G6 – F♯°7 – G6 inversions (the scale of chords on the 5th).
- **Instruments:** P G.
- **App:** NOT-IN-APP (only mentioned at `jazz.ts:848`).
- **Game:** —

### E28. Tritone's minor resolution [EL, Kingstone's post; R3 Ex.9]
- **Procedure:** Cm6 voicings as B7alt → E6; the m6-dim scale a half step above the V.
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** ear: "important or tritone's minor?"

### E29. Ending a tune with 6-dim movement, through 4 keys [R1 ch.3]
- **Procedure:** final C6 moves through its scale; then the same through E♭, G♭, A (one dim's four keys).
- **Instruments:** P G.
- **App:** NOT-IN-APP.
- **Game:** a capstone flourish scored by the voice-leading meter.

### E30. Harmonise a melody in 6-dim [R4; BC/improvisation]
- **Procedure:** melody note on top; 6-chord tones get the 6, others the dim; contrary motion and borrowing on long notes.
- **Instruments:** P G.
- **App:** NOT-IN-APP (= AUDIT-DEPTH C1).
- **Game:** "harmony puzzle": choose 6 or ° for each melody note; then perform it.

### E31. Off-chord dyads [OC, a student exercise derived from Harris]
- **Procedure:** from B°7 notes, leap by m3, ♭5, M6, m10, ♯11 or M13 in any direction, then resolve to C6.
- **Instruments:** G P.
- **App:** NOT-IN-APP.
- **Game:** random interval-prompt duel.

### E32. Compose a line over a move, then apply it to a tune [SG, from Harris and Rees workshops]
- **Procedure:** write a 2-bar line for I → VI7 (C6 → A7) with chord tones on beats; play it in every tune with that move.
- **Instruments:** all.
- **App:** NOT-IN-APP (AUDIT-DEPTH C6 is close).
- **Game:** "line library": the app detects the line reused in later solos.

### E33. Turn a real phrase into an exercise [JL]
- **Procedure:** take a Parker phrase and move it through every degree and key.
- **Instruments:** all.
- **App:** PARTLY (licks in 12 keys elsewhere).
- **Game:** —

### E34. Upbeat comping and walking [R1 ch.4; R2]
- **Procedure:** comp hits on 2+ and 4+, then 1+ and 4+; walking with tied upbeats.
- **Instruments:** P G B.
- **App:** NOT-IN-APP.
- **Game:** a rhythm game: hit only the "ands".

### E35. Feel 6 over 4 [R2]
- **Procedure:** phrase a melody in dotted-quarter groupings over a 4/4 rhythm section.
- **Instruments:** all.
- **App:** NOT-IN-APP.
- **Game:** polyrhythm accuracy (the app has polyrhythm drills to reuse).

### E36. Vocal warm-ups and the related dim on a tune [R1 ch.5]
- **Procedure:** sing the E°7 and its resolutions, then apply them to the first 4 bars of the song.
- **Instruments:** V.
- **App:** PARTLY (vocal-barry).
- **Game:** pitch-match streak.

### E37. Kingstone's practice forms [K ch.4]
- **Procedure:** the 6-dim scales in single notes, 3rds, 6ths, 10ths, 4-note chords in tenths, expand and contract, long–short.
- **Instruments:** G (P).
- **App:** NOT-IN-APP, apart from the single notes in g-harris-1.
- **Game:** —

**Strongest game candidates:**
- E12 (5-4-3-2 call and response);
- E13 (chromatic-scale metronome);
- E11 (outline-builder puzzle);
- E21 (elevator puzzle);
- E6 ("fix the line" puzzle);
- E18 and E19 (dim-move speed and ear duels);
- E30 (6 or ° harmony puzzle);
- E34 (hit-the-ands rhythm game).

---

# PART F — Echols & Parks: complete exercise catalogue (2026-11-15)

This part lists every exercise, routine and concept drill that **Thomas Echols** and **Chris Parks** have published, as far as public sources go. Each one is checked against the app (state at commit `132b9567`).

**Status keys:**
- **IN-APP:** the app has it, with the id.
- **PARTLY:** the app has something close; the entry says what differs.
- **NOT:** the app does not have it.
- **(title)** marks an entry known only from a video or PDF title, so its procedure is inferred. **(verify)** marks a point no public source settles.
- **(derived)** marks a C example built from a stated rule and checked step by step.

## F0. Sources for this part, and what could not be read

| Key | Source | What it gave |
|---|---|---|
| **[LoL-YT]** | Echols's YouTube channel *The Labyrinth of Limitations*, the full upload list read 2026-11-15: <https://www.youtube.com/@TheLabyrinthofLimitations/videos> (248 videos, including shorts) | Every long-form title: Episodes 0.1–17, *Little Labyrinth* 1–80, *Garden of Forking Paths* 1–3, Foundations videos, and the 2024–26 lessons. Descriptions for Episodes 0.1–17. |
| **[LoL-PDF]** | Store pages for each episode PDF: <https://www.thomasechols.com/scores> and `/scores/legacy-series` | Page counts and contents per episode (e.g. ep.10: "35 voicings"; ep.17: "the four pivoting scenarios") |
| **[LoL-F]** | Foundations I–IV product pages: `/scores/p/foundations-1`, `-2`, `foundations-iii-what-can-i-do-with-x-pitch`, `foundations-4-where-can-i-summon-y-mimetic-unit` | Structure: Theory / Practice, "seven core skills", "level 1 daily routine", "7 Essential Movements", "Archetypes and Outlines" |
| **[LoL-man]** | The app manual, v1.0 (2021), read in full: <https://static1.squarespace.com/static/59a4e365b8a79befa9f5b358/t/600fc64417ea2b0497ac93a7/1611646532637/Instructions.pdf> | The tesseract (16 chords), the substitution choice on every V (the "tritone's minor" named), arpeggio and skip modes, the on chord |
| **[LoL-P]** | Patreon: <https://www.patreon.com/cw/labyrinthoflimitations> | Only the structure: Foundations Project, weekly Foundations Classes with archives, office hours, beta web apps, Discord |
| **[EL]** | Already in §0. A student's transcription of the contrary-motion elevator, read in full: <https://www.jazzguitar.be/forum/theory/82974-barry-harris-contrary-motion-elevators.html> | Construction, the floors, worked Autumn Leaves pickup, the interval rule, Kingstone's "resolve Cm6 to E" |
| **[TILF]** | Parks's YouTube channel *Things I've Learned From Barry Harris*: <https://www.youtube.com/@thingsivelearnedfrombarryh2616> | Titles for EP 1–10, 12, 14–15, 17–18, 20, 22–26, 28–34, 37–39, 42, 44–50, 52, 57–60, 62–65, 69, 71, 75 and 77–171 (≈125 of 171). Video descriptions carry no lesson text. |
| **[OS-WoS]** | Parks, Open Studio *Barry Harris' World of Soloing*: <https://www.openstudiojazz.com/courses/barry-harris-world-of-soloing/> | 8 lesson titles |
| **[OS-SoC]** | Parks, Open Studio *Barry Harris' Scales of Chords*: <https://www.openstudiojazz.com/scales-of-chords> | 11 module titles |
| **[SK]** | Parks's Skool community: <https://www.skool.com/chris-parks-tilf-barry-harris/about> | Format only: 4 mini lessons and 4 Zoom classes a month, office hours. No curriculum list. |
| **[OS-E]** | Open Studio Pro instructors page: <https://www.openstudiojazz.com/pro-instructors/> | Echols is listed for a live **ear-training** class. No public Open Studio *Barry Harris* course by Echols was found. |

**Could not be read:**
- **Video content.** Transcripts and captions could not be fetched, so for videos only the titles and descriptions were used.
- **Parks's episodes.** Parks's video descriptions are empty. His EP 11, 13, 16, 19, 21, 27, 35–36, 40–41, 43, 51, 53–56, 61, 66–68, 70, 72–74 and 76 were not found.
- **Paywalled material.** Echols's PDFs, the Foundations books and the Patreon posts are paywalled, as are Parks's Open Studio videos and worksheets. The Galliano notes (a transcription of Parks and Echols) still return 404.
- **Older forum material.** jazzguitar.be pages beyond what Parts A–E already quote were mostly 403 to the fetcher.

## F1. Echols's frameworks, as precisely as the sources allow

### F1.1 The scale of chords, "on" and "off"
- Echols works with Harris's **four scales of chords** [LoL-YT ep.10 description]: minor 6th dim, major 6th dim, dominant 7th dim and dominant 7th ♭5 dim.
- In each scale, the 6 (or 7, or 7♭5) chord is the **"on" chord** and its diminished is the **"off" chord** [LoL-man]. In C:

| Scale | On chord | Off chord (B°7) | Scale |
|---|---|---|---|
| C6-dim | C E G A | B D F A♭ | C D E F G A♭ A B |
| Cm6-dim | C E♭ G A | B D F A♭ | C D E♭ F G A♭ A B |
| C7-dim | C E G B♭ | B D F A♭ | C D E F G A♭ B♭ B |
| C7♭5-dim | C E G♭ B♭ | B D F A♭ | C D E F G♭ A♭ B♭ B |

- Notes of the scale alternate on and off, so each scale step changes chord.

### F1.2 The Elevator (Elevator Sequence) [EL; LoL-YT ep.4, ep.6, ep.16, LL 3–5, LL 68; app v1.1 "The Elevator for Contrary Motion"]

**Construction.**
1. Start from a unison on any scale degree.
2. Move the top voice up the scale and the bottom voice down the scale, one scale step each.
3. Fill the middle with some, all or none of the notes of the same chord (on or off).
4. Each successive shape is a **floor**: unison → 3rds → triads → 6ths → octaves → drop 2 → drop 3 → drop 2&4 → double octave.

**Why it stays in tune with the scale.** Top and bottom move by the same number of steps in an 8-note scale. They are therefore always both on or both off, and the 6/dim alternation is kept.

**C6-dim, from C (derived from the stated construction; spellings checked):**

| Floor | Bottom → top | Chord |
|---|---|---|
| 1 unison | C4 | on |
| 2 third | B3 D4 | off |
| 3 triad | A3 C4 E4 | on |
| 4 sixth | G♯3 (B3) F4 | off |
| 5 octave | G3 (C4 E4) G4 | on |
| 6 drop 2 | F3 B3 D4 G♯4 | off |
| 7 drop 3 | E3 C4 G4 A4 | on |
| 8 drop 2&4 | D3 G♯3 F4 B4 | off |
| 9 double octave | C3 (…) C5 | on |

**Use.**
- Moving **along a floor** is parallel motion.
- Moving **between floors** (taking the elevator) is contrary motion.
- Mixing the two gives any bass contour.
- Oblique motion needs **borrowing**, from a different floor or room [EL].

**Interval rule [EL].** Only 3rds, 5ths, 6ths, 8ths, 10ths, 11ths, 13ths and 16ths occur between the outer voices. 2nds, 4ths, 7ths and 9ths would mix the on and off chords. *Note:* G♯–F and D–B are spelled as a diminished 7th and a major 6th; as notes they are a 6th.

**Two elevators** [LoL-YT ep.6]: relative motion on the whole-tone scale with two elevators. The detail is paywalled **(verify)**.

**Endings** [EL, Kingstone's reply]: an elevator that ends on Cm6 can go on as:
- B7alt → E (the tritone's minor);
- F7 → B♭;
- Am7♭5 → D7.

### F1.3 The 16 chords around one diminished (the tesseract) [LoL-man; LoL-YT ep.0.2 "ii–V in the Tesseract", Garden of Forking Paths 1]

**Echols's text (manual):** the tesseract shows "the various pathways that we can follow to gradually transpose a diminished chord down by one semitone". Its 16 vertices are:
- 4 dom7;
- 4 major 6;
- 4 minor 6;
- 2 dom7♭5;
- 2 diminished.

Each edge moves one note by one semitone.

**In C: C°7 (C E♭ G♭ A) down to B°7 (B D F A♭)**, derived and checked note by note:

| Notes lowered from C°7 | Result |
|---|---|
| one | B7 (B E♭ G♭ A), D7 (C D F♯ A), F7 (C E♭ F A), A♭7 (C E♭ G♭ A♭) |
| two adjacent | D6 (B D G♭ A → D F♯ A B), F6 (C D F A), A♭6 (C E♭ F A♭), B6 (B E♭ G♭ A♭) |
| two opposite | F7♭5 = B7♭5 (B E♭ F A), D7♭5 = A♭7♭5 (C D G♭ A♭) |
| three | Dm6 (B D F A), Fm6 (C D F A♭), A♭m6 (B E♭ F A♭), Bm6 (B D G♭ A♭) |
| none / all four | C°7, B°7 |

**Link to the app.** The 4 m6 and 4 dom7 here are the "8 expressions over G7" of BARRY-HARRIS-THEORY §4, plus the family on B°/D°. Echols's tesseract is the same set seen as voice-leading paths.

### F1.4 The substitution menu over V [LoL-man; LoL-YT ep.2, "Substitutions — The Diminished is the Center", "The Tritone Sub Is Easier Than You Think"]

**What is sourced.**
- The app "chooses among several different possible substitutions any time it sees a V chord", and shows the choice. The one named in the manual is **"the tritone's minor"**.
- The descriptors "are all explained in Episodes 1–10".
- Ep.2's PDF has a **C minor 6 diminished catalogue**. The description says to transpose it for **E♭m6 and F♯m6**, the m6 chords a minor 3rd apart. All of these share the B° = D° = F° = A♭° off chord, which is what "the diminished is the center" means.

**The menu, derived from F1.3 and BARRY-HARRIS-THEORY §4.** It is not a published list **(verify the exact labels with the app)**. For G7, every chord adjacent to the B°/C° pair:
- itself, G7;
- the family: B♭7, D♭7, E7;
- the important minor, Dm6;
- the other m6s: Fm6, A♭m6 (the tritone's minor), Bm6;
- the off chord, the dim.

Labels the owner could check in the app: "tritone's minor", and probably "important minor", "family"/"brother", "dim".

### F1.5 Pivoting: "the four pivoting scenarios" [LoL-PDF ep.17; LoL-YT ep.17]

**Sourced.** Lines that pivot while making polyphonic movement with the Elevator Sequence. The 6-page PDF gives practice examples for "the four pivoting scenarios".

**Not public: what the four scenarios are.** A reading consistent with ep.16 and the single-line pivot of A2.6 is **(verify)**:
1. on → on;
2. on → off;
3. off → on;
4. off → off.

Each is a pivot taken while the outer voices move in parallel or contrary motion. The owner should confirm.

### F1.6 Voicing catalogues for the four scales [LoL-PDF ep.1, 2, 8, 9, 10; Shorts]
- **Ep.1:** a catalogue of voicings for the major 6-dim, in E♭ (7 pp).
- **Ep.2:** the C minor 6 dim (15 pp).
- **Ep.8:** a "thorough list" of dom7♭5-dim voicings, a chord chart for each unique shape.
- **Ep.9:** octatonic voicings (7 pp). Echols: the octatonic is symmetric, so it has the fewest unique voicings, and it is perhaps "the best scale for someone to begin" with.
- **Ep.10:** **35 voicings** of the dominant 7th dim (10 pp).
- **Shorts:** the voicing **types** are taught as *thirds, triads, shell chords, octave chords, drop 2, drop 3*. These are the Elevator floors used as voicing families.

### F1.7 Other distinctive Echols terms
- **Scale of Scales** [LL 16, 21, 62] and **meta-scales** [LL 69] **(title)**. Moving through several scales of chords for colour.
- **Transformations** [LL 14 major key, LL 40 minor key via the "CAGED" sequence, LL 77] **(title)**.
- **The Ugliest Duckling** [LL 34, LL 49 "Family Roles (the Ugliest Duckling and Barry Harris's Minor 6 Diminished Scale)"] **(title)**. A family member's role in the m6-dim scale **(verify)**.
- **Subset/Superset** [LL 6] **(title)**.
- **Foundations** [LoL-F]:
  - *Polyphony*: the four scales of chords, plus "seven core skills to practise daily" and a level-1 routine.
  - *Monophony*: a "full catalog of Barry Harris's methods for building bebop lines", with seven core skills and a level-1 routine.
  - *What Can I Do With [x] Pitch?*: real-time choices from a given pitch.
  - *Where Can I Summon [Y] Mimetic Unit?*: the **7 Essential Movements**, each with **Archetypes** and **Outlines** at two levels, each from a standard; 132 pp.
  - Vol. 4 is "the fourth of a 7-part series".
  - The names of the 7 skills and the 7 movements are not public.
- **"Linguistic muscle memory"** [LoL-F]: his name for the goal of the daily routines.
- **Levels:** "5 Levels of the Diminished Scale", "5 Levels of a Turnaround", "4 Steps to Improvise Chord Melodies in Any Key" [LoL-YT 2024–26] **(title)**.

## F2. Parks's frameworks

### F2.1 The half-step rules, Parks's variants
The rules are described in A2.2–A2.4; [P5] is the outline of his video 5. Parks's specific variants:
- **Three half steps also from the root** [P5] (A2.2). The app excludes degree 1 (B1 #3).
- **Major-scale rules** (EP 25), **harmonic minor rules** (EP 29), and **rules on the I Got Rhythm bridge** (EP 50), the rules applied through a chain of dominants.
- **"Limitless" half-step rules** (EP 118) and "Do You Know Your Half Step Rules?" (EP 133) **(title)**. These are probably the later "extra note" view (A2.4) **(verify)**.
- **"What can I do from the 2nd? / from the 3rd?"** (EP 113–114): the options from a non-chord tone and from a chord tone.
- **"Half Step Below is Beautiful"** (EP 134). Echols answered it in LL 67 and LL 80.
- **Triplet rules** (EP 24, EP 107; WoS L5; [P5]): an 8th triplet follows its middle note, a 16th triplet its first note.

### F2.2 Scale outlines, Parks's method [TILF EP 1, 2, 8, 9, 14, 18, 23, 100, 101, 104, 169; SG]
- **Procedure.** For each chord of a tune, play its scale (dominant or major) from the root up to the 7th and back, one scale per bar, in time, through the whole form. m7 becomes its dominant ("ii is V"), m7♭5 the dominant a major 3rd down, and the related dim is used where the form calls for it (blues bar 6) [SG; A2.5].
- **Order Parks teaches:**
  - Blues (EP 1, revisited EP 100);
  - I Got Rhythm (EP 2, EP 101);
  - Cherokee (EP 8);
  - Donna Lee (EP 9);
  - How High the Moon (EP 14);
  - Night in Tunisia (EP 18);
  - All the Things You Are (EP 23);
  - Giant Steps (EP 104).
- "The 3 scales you need to know for Barry's scale outlines" (EP 169) is probably major, dominant and minor/m6 **(verify)**.
- **Study-group practice** [SG]: up to 200 bpm in all keys and positions, with and without slurs from upbeats to downbeats.

### F2.3 Warm-ups and fingerings
- **The dominant scale eight ways on F7** (WoS L2: "8 ways you must know F7"). The PDF of [P5] is the same material: up and down from each chord tone and from each degree **(verify the exact eight)**.
- **The three important arpeggios** (WoS L3; EP 52 "A Very Important Arpeggio"; EP 137). On C7: C E G C, G B♭ D G, B♭ D F B♭ [P5] (A2.1).
- **"Barry's Greatest Exercise for Learning Fingerings"** (EP 171) **(title; content unknown)**.
- **"Puzzle pieces"** (EP 157 "The Most Important Puzzle Piece", EP 166 "What Is a Puzzle Piece?") **(title)**. Probably his name for short line units to combine **(verify)**.
- **"What is Short? / What is Long?"** (EP 141–142) **(title)**. Kingstone also has a "long–short" practice form (A10) **(verify)**.

## F3. Master table

Instruments: P = piano, G = guitar, B = bass, V = voice. "E" rows are Echols, "P" rows Parks.

| # | Exercise (the teacher's name) | Source | Instr. | App |
|---|---|---|---|---|
| E01 | Relative Motion in the scale of chords (parallel / contrary / oblique; independent soprano and bass) | LoL ep.1 (E♭6-dim) | G P | PARTLY: k-sixdim-1 (parallel inversions), k-sixdim-3 (oblique); no contrary |
| E02 | Substitution: the chords sharing one diminished replace each other; C/E♭/F♯ m6-dim catalogue; Autumn Leaves annotated | LoL ep.2.1–2.2; "The Diminished is the Center" | G P | PARTLY: bh-six-over, bh-convert(-2), harris-13; no "choose the sub" drill on a tune |
| E03 | Borrowing From the Neighbors (three ways to practise) | LoL ep.3; "Borrowing for Chord Melodies"; LL 47 | G P | PARTLY: k-sixdim-2/6 (one voice only) |
| E04 | Taking the Elevator to borrow 3 notes | LoL ep.4 | G P | NOT |
| E05 | Barry Harris's chromatic scale on the 6-dim scales, with relative motion; in two voices; building movement | LoL ep.5; LL 8, 25, 44 | G P B | NOT (h17 is a different exercise, B1 #18) |
| E06 | On Symmetry: whole-tone relative motion with two elevators; whole-tone movement over Body and Soul | LoL ep.6; LL 10, 53 | G P | NOT (bh-three-dim gives the theory only) |
| E07 | The Dominant 7 ♭5 Diminished Scale: scale, examples, the voicing list | LoL ep.8 | G P | NOT |
| E08 | The Octatonic Scale: voicings, movement | LoL ep.9; "5 Levels of the Diminished Scale" | G P | PARTLY: bh-three-dim (theory), k-sixdim-7 (♭9); no octatonic voicing movement |
| E09 | The Dominant 7th Diminished Scale: 35 voicings | LoL ep.10 | G P | NOT |
| E10 | The Extended Family: three ways to play the 7♭5-dim scale over every dominant | LoL ep.14 | G P B | NOT |
| E11 | The Elevator Sequence (Little Elevator, Finding More Floors, Moving Beyond the Octave) | LoL ep.16; LL 3, 4, 5, 68; app 1.1 | G P | NOT |
| E12 | Pivoting Through the Looking Glass: the four pivoting scenarios | LoL ep.17 | G P | NOT (the single-line pivot is IN-APP: harris-19–24) |
| E13 | Thirds (practising 3rds; 3rds over a tune) | LL 1, 26; Short; "How to Practice 3rds Over Alone Together" | G P | NOT |
| E14 | 6ths into 3rds | LL 2 | G P | NOT |
| E15 | Triads; Thirds into Triads | Short; LL 27 | G P | PARTLY: harris-3 (diatonic triads, not 6-dim floors) |
| E16 | Shell Chords; Triads to Shell Chords; more ways of using shells; borrowing on shells in the octatonic | Short; LL 22, 28, 39, 41, 58 | G P | NOT (voicings-3 has generic ii–V shells) |
| E17 | Octave Chords; Shell Chords to Octave Chords | Short; LL 29 | G P | NOT |
| E18 | Drop 2 Chords | Short | G P | IN-APP: harris-9, g-harris-2/7 |
| E19 | Drop 3 Chords | Short | G P | IN-APP: harris-9 opt 2 (P); PARTLY (G: no 6-dim drop 3 on string sets) |
| E20 | Arpeggiating the scale of chords (the on chord rises while the dim falls); skipping through the scale | LoL-man ("a" and "s" keys) | G P | NOT |
| E21 | Moving Directly to the "Off" Chord | LL 38 | G P | NOT |
| E22 | Middle Voice Movement; Seeing the Inner Movement; Movement | LL 15, 20, 57 | G P | PARTLY: k-sixdim-12 |
| E23 | Scale of Scales; Connections in the Scale of Scales; Playing Through the Scale of Scales for Color; Meta-scales | LL 16, 21, 62, 69 | G P | NOT |
| E24 | Family Connections; Half Steps in the Family; Chromatic Movement Through the Family; Learning Family | LL 13, 18, 64, 75 | G P B | PARTLY: harris-8, harris-16, bh-family, bh-brothers |
| E25 | The Ugliest Duckling; Family Roles in the minor 6-dim scale | LL 34, 49 | G P | NOT **(verify content)** |
| E26 | Major Key Transformations; Minor Key Transformations with the CAGED sequence; Transformations for Freedom | LL 14, 40, 77 | G P | NOT |
| E27 | Subset / Superset | LL 6 | G P | NOT **(verify)** |
| E28 | Major I–vi–ii–V in scales of chords | LL 7 | G P | PARTLY: k-sixdim-8 (ii–V–I only) |
| E29 | Connecting Scales to Chords (Autumn Leaves) | LL 11, 32 | G P | PARTLY: harris-9/10 + k-sixdim-9 |
| E30 | Modulation With Movement | LL 37 | G P | NOT |
| E31 | Diminished practice tips; 5 Levels of the Diminished Scale | LL 36; Short | G P | PARTLY: k-sixdim-5/7/11 |
| E32 | Moving from I to IV | LL 24 | G P | NOT |
| E33 | Looking at the Flat 3 Diminished | 2024 video | G P | IN-APP: bh-dim-roles (♭III°7) |
| E34 | The Movement to the Mediant | 2024 video | G P | NOT |
| E35 | Using Barry's scales to move through maj7 chords; Lydian sounds | LL 46, 23 | G P | PARTLY: harris-18 (but see B1 #39; the real "sixth on the fifth" is NOT) |
| E36 | Half Steps Below are the Way to Go / are Beautiful | LL 67, 80 | G P B | PARTLY: harris-6 |
| E37 | Let's Work on Our Rhythm Together (with Barry Harris's exercise) | LL 72 | all | NOT |
| E38 | Practising the tritone sub with the ABCs; The Tritone Sub Is Easier Than You Think | LL 60; 2025 video | G P B | PARTLY: voicings-10 (tritone sub), harris-1–6 (ABCs); not combined |
| E39 | Long lines over Stella by Starlight | LL 61 | G P | PARTLY: harris-15 |
| E40 | Making Complex Songs More Simple | LL 78 | all | NOT |
| E41 | Improvised chord melody: 4 Steps in Any Key; 5 Essential Techniques; How to Improvise Chord Melody Arrangements; "Pretty Chord Melodies" | LL 66; 2024–26 videos | G P | NOT (AUDIT-DEPTH C1) |
| E42 | 5 Levels of a Turnaround | 2024 video | G P | NOT |
| E43 | Jazz Roulette: practise the scales of chords by chance | 2024 video | G P | NOT (ready-made game format) |
| E44 | Counterpoint in a Baroque style; a Bach fugue through the scales of chords; a ground bass | LL 42, 48, 52; "Stealing by Starlight" | G P | NOT |
| E45 | "Cowboy chords" inside the scales of chords | LL 45 | G | NOT |
| E46 | ii–V in the Tesseract; the 16 chords | ep.0.2; GoFP 1 | G P | PARTLY: harris-13, bh-convert, bh-three-dim |
| E47 | Polyphony: seven core skills + level-1 routine | Foundations I | G P | NOT **(names paywalled)** |
| E48 | Monophony: the catalogue of line methods + seven core skills | Foundations II | G P B | PARTLY (most single-line methods are in harris-*) **(list paywalled)** |
| E49 | What Can I Do With [x] Pitch? (every chord and voicing that holds a given melody note) | Foundations III | G P | NOT |
| E50 | The 7 Essential Movements: Archetypes and Outlines | Foundations IV; "Foundations 4 (The Study of Movement)" | G P | NOT |
| E51 | Practising Polyphony; Polyphonic Possibilities | LL 51, 54 | G P | PARTLY |
| E52 | Tune studies (Stella, Ponce Var. 13, Christmas Time Is Here, I'll Be Home for Christmas, Blue in Green, My Romance, ATTYA, Embraceable You, Body and Soul, Night in Tunisia, Autumn Leaves, Fly Me to the Moon, Round Midnight, Ipanema bridge, Polka Dots, Lady Bird turnback, Moon River, I'll Be Seeing You, Alone Together, That Secret Place) | ep.7, 11, 12, 13, 15; LL 9, 23, 26–31, 39, 53, 55, 61, 63, 65, 69, 71, 73; others | G P | PARTLY: k-sixdim-9/10 comp forms (fewer tunes; no polyphonic improvisation) |
| E53 | "Use this one trick for all the color" | 2024 video | G P | unknown **(verify)** |
| E54 | A Move from Barry Harris's Class; Looking at a Beautiful Idea from Barry | LL 17, 74 | G P | unknown **(verify)** |
| P01 | Scale outlines: Blues, I Got Rhythm, Cherokee, Donna Lee, How High the Moon, Night in Tunisia, ATTYA, Giant Steps; "the 3 scales you need" | TILF EP 1, 2, 8, 9, 14, 18, 23, 100, 101, 104, 169 | all | NOT (B1 #14) |
| P02 | 5-4-3-2; 5-4-3-2 in minor | TILF EP 3, 37 | all | NOT |
| P03 | Barry's (beautiful) chromatic scale | TILF EP 4, 80, 96, 120; WoS L6 | all | NOT (h17 is different) |
| P04 | The ABCs ("and other things") | TILF EP 4 | all | PARTLY: harris-1, 3, 4, 6 (no 3rds with a half step) |
| P05 | Half-step rules, dominant (incl. three from the root) | TILF EP 5, 83, 118, 133; WoS L4; P5 | all | IN-APP: harris-2, harris-14, bh-lines, g-harris-3, b-barry-3 (root option missing) |
| P06 | Major-scale half-step rules | TILF EP 25 | all | PARTLY: harris-1, harris-14 opt 2 |
| P07 | Half-step rules for harmonic minor | TILF EP 29 | all | NOT |
| P08 | Half-step rules on the I Got Rhythm bridge | TILF EP 50 | all | PARTLY: harris-16 |
| P09 | What can I do from the 2nd? / from the 3rd? | TILF EP 113, 114 | all | PARTLY: harris-14 (starts), not as a choice drill |
| P10 | Half Step Below is Beautiful | TILF EP 134 | all | PARTLY: harris-6 |
| P11 | Triplets (practising triplets; Barry's beautiful triplets) | TILF EP 24, 107; WoS L5 | all | PARTLY: k-vocab-8, g-bebop-10, b-bebop-7 (v-trip) |
| P12 | Barry's four scales of chords | TILF EP 6; SoC 2–5 | G P | PARTLY: major and minor 6-dim in app; 7-dim, 7♭5-dim NOT |
| P13 | G6 and C6 diminished scale of chords | TILF EP 15 | G P | IN-APP: harris-9, k-sixdim-1, g-harris-2 |
| P14 | Minor 6th diminished (chord ideas; lines in E, G, C m6-dim; where to use it) | TILF EP 12, 28, 39, 45, 92, 98 (with Echols), 123, 168; SoC 3, 8 | G P (B lines) | PARTLY: harris-10, k-sixdim-6 (harmony); m6-dim **lines** NOT |
| P15 | Borrowing notes; Barry's beautiful borrowing; concept of borrowing | TILF EP 17, 145; SoC 9 | G P | PARTLY: k-sixdim-2/6 |
| P16 | Playing with the family of dominants; on ATTYA; "Don't think altered, think family" | TILF EP 10, 59, 112; SoC 10; WoS overview | all | PARTLY: harris-8, harris-16, bh-family |
| P17 | The dominant 8 ways on F7; soloing on dominants; "We don't know D7" | WoS L2; TILF EP 22, 97 | all | PARTLY: harris-2, harris-11 |
| P18 | Three (very) important arpeggios; a very important arpeggio | WoS L3; TILF EP 52, 137 | all | NOT (B1 #12) |
| P19 | First 4 bars of the blues; middle of a blues, bars 5–8; the most famous blues turnaround | TILF EP 7, 160, 58, 49 | all | NOT |
| P20 | First 4 bars of I Got Rhythm | TILF EP 20 | all | NOT |
| P21 | Chords in the major scale idea | TILF EP 26 | all | PARTLY: harris-3, harris-4 |
| P22 | Comping with 6th diminished; blues comping with all 4 scales of chords; "No More Comping 4's"; comping a 12-bar blues with only maj6 and m6 | TILF EP 30, 71, 167, 170 | G P | PARTLY: k-sixdim-9/10 (no 7-dim / 7♭5-dim, no "only 6 chords" constraint) |
| P23 | Charlie Parker ideas #1–3; a Parker phrase; Bud Powell phrases | TILF EP 31–33, 125, 115, 144, 162 | all | PARTLY: licks / k-vocab (not as Harris "phrase → exercise", E33) |
| P24 | Movement: major to relative minor | TILF EP 34 | G P | NOT |
| P25 | Lines on minor ii–V; must-know minor 2-5s; "A Minor 7♭5 is Beautiful" | TILF EP 38, 159, 86 | all | PARTLY: harris-15 opt 1 ("seven down to the 3rd" NOT) |
| P26 | Pivots: on I Got Rhythm; blues with chromatic scale + pivot; m6-dim pivots; pivots with a twist; more pivots | TILF EP 42, 48, 105, 110, 161 | all | IN-APP: harris-19–24, g-harris-8–10, b-barry-7/8, bh-pivot(-arp); PARTLY for the m6-dim pivot and the "twist" |
| P27 | Whole tone scale | TILF EP 44 | all | NOT (bh-three-dim theory only) |
| P28 | Infinite ways to play 1-6-2-5 with the scale of chords (major, minor); scales of chords on a 2-5 | TILF EP 46, 47, 79 | G P | PARTLY: k-sixdim-8 |
| P29 | Don't think 2-5, just think 5 | TILF EP 57 | all | IN-APP: harris-7 opt 1 |
| P30 | How to create lines from scales: major lines, lines from 5 to 1, minor lines | TILF EP 60, 63, 64, 65 | all | PARTLY: harris-11, harris-15 |
| P31 | Autumn Leaves with the 4 scales of chords; practical applications | TILF EP 69; WoS L7 | G P | PARTLY: k-sixdim-9 (Autumn Leaves form; 6-dim only) |
| P32 | Transcribing with a purpose | TILF EP 75 | all | NOT |
| P33 | Tritone | TILF EP 77 | all | PARTLY: voicings-10 |
| P34 | 6-note scale idea; a new "bebop" scale | TILF EP 78, 99 | all | NOT **(verify)** |
| P35 | Don't think C9; a minor 7 is beautiful; minor arpeggio ideas (the conversions) | TILF EP 81, 82, 84 | all | PARTLY: bh-convert, bh-m6-bass, k-sixdim-13 |
| P36 | Minor blues; a new way to play a minor blues | TILF EP 85, 139 | G P | PARTLY: k-sixdim-10 |
| P37 | Feeling the "and" (Donna Lee); Barry's beautiful rhythm exercise | TILF EP 87, 94 | all | NOT (B3 #54) |
| P38 | 4 minor (Just Friends) | TILF EP 88 | all | NOT **(verify)** |
| P39 | Don't alter your dominant | TILF EP 90 | all | PARTLY: bh-six-over (names missing) |
| P40 | Diminished explained / creation theory | TILF EP 93; SoC 1 | all | IN-APP: bh-three-dim, bh-convert |
| P41 | A beautiful movement we never play; Barry's most beautiful move | TILF EP 102, 146 | G P | unknown **(verify)** |
| P42 | The Barry Harris scale no one plays / we never talk about | TILF EP 127, 148 | all | NOT **(verify: probably 7-dim or 7♭5-dim)** |
| P43 | Drop 2s are more than you think; drop 2 with a pretty twist; maj6 / m6 / 7 / 7♭5 dim in drop 2; drop 3 | TILF EP 111, 136; SoC 2–6 | G P | PARTLY: 6-dim drop 2/3 IN-APP; 7-dim and 7♭5-dim drop 2 NOT |
| P44 | Triad: chord or arpeggio?; we don't know triads; chord vs arpeggio | TILF EP 129, 147, 152 | all | PARTLY: harris-3 |
| P45 | Chord melodies | TILF EP 138 | G P | NOT |
| P46 | Reasons to practise major 6th chords | TILF EP 140 | G P | IN-APP: harris-9, k-sixdim-1 |
| P47 | What is short? / What is long? | TILF EP 141, 142 | all | NOT **(verify)** |
| P48 | Don't play chord tones on the beat | TILF EP 143 | all | NOT **(verify: a deliberate counter-rule, see F4)** |
| P49 | Puzzle pieces | TILF EP 157, 166 | all | NOT **(verify)** |
| P50 | 6 must-know 2-5s | TILF EP 158 | all | PARTLY: harris-15 |
| P51 | Surround or enclosures? | TILF EP 165 | all | PARTLY: harris-6 opt 1, harris-24 |
| P52 | First step to improvising (that no one teaches except Barry); Barry's secret to soloing / playing through changes | TILF EP 117, 153, 156, 163 | all | unknown **(verify)** |
| P53 | First step to understanding the scales of chords | TILF EP 164 | G P | IN-APP: k-sixdim-1, harris-9 |
| P54 | Barry's greatest exercise for learning fingerings | TILF EP 171 | G (all) | NOT **(verify)** |
| P55 | First movement using drop 2 | SoC 11 | G P | NOT (B2 #29) |
| P56 | Applications of maj 6 dim / min 6 dim | SoC 7, 8 | G P | PARTLY: k-sixdim-8–10 |
| P57 | Sonny Rollins idea; "another beautiful idea" | TILF EP 149, 150 | all | unknown |
| P58 | Practising with a friend; let's practise together (practice formats) | TILF EP 116, 131; LL 76 (Parks with Echols) | all | — (format) |

**Count:** 112 entries: E01–E54 (Echols, 54) and P01–P58 (Parks, 58).

| Status | Count |
|---|---|
| IN-APP | 10 (E18, E19 for piano, E33, P05, P13, P26, P29, P40, P46, P53) |
| PARTLY | 45 |
| NOT | 51 |
| unknown | 5 (E53, E54, P41, P52, P57) |
| format | 1 (P58, a practice format rather than an exercise) |

Several NOT entries are known only by title.

## F4. Details per exercise

Entries already fully described in Parts A and E point there. C examples are **(derived)** unless a source gives them.

### Echols

**E01 Relative Motion** [LoL ep.1; LoL-PDF ep.1]
- **Procedure.** In one scale of chords (the video uses E♭6-dim), write an independent soprano line and an independent bass line, then fill the middle voices by the smoothest voice leading. Parallel motion = the same voicing type moving along the scale; contrary = the elevator (F1.2); oblique = a held voice, with borrowing.
- **C example.** Soprano C D E F G, bass C B A G♯ G (contrary: unison → 3rd → triad → 6th → octave, as in F1.2).
- **Progression.** Two voices → three → four; then all four scales.
- **App:** PARTLY. k-sixdim-1 is parallel, k-sixdim-3 oblique. Build contrary as E11.

**E02 Substitution** [LoL ep.2; "Substitutions — The Diminished is the Center"]
- **Procedure.** Learn the C m6-dim scale of chords. Then, over a chord, play any scale of chords whose off chord is the same dim: Cm6, E♭m6, F♯m6 and Am6 all use B°.
- **C example.** Over F7 (the off chord of Cm6-dim is B° = D° = F° = A♭°), Cm6 = F9 sound. Over B7alt, Cm6 is the tritone's minor.
- **Progression.** Autumn Leaves annotated score.
- **App:** PARTLY. bh-six-over teaches the conversions. Missing: a drill where the player picks among the substitutes on each V of a tune.

**E03 Borrowing From the Neighbors** [LoL ep.3]
- **Procedure.** Inside a 6-dim scale, one or more voices of a voicing take the neighbouring chord's note (on → off or off → on), then resolve. Three ways to practise; the names are paywalled.
- **C example.** C6 drop 2 (G C E A): lift A to B (borrowed from B°) and back.
- **App:** PARTLY. k-sixdim-2/6 move one voice. Two and three voices are NOT (B2 #37).

**E04 Taking the Elevator to borrow** [LoL ep.4]
- "Borrowing 3 notes can be quite perplexing, but the Elevator gives us a fast and easy way to do it."
- **Inferred mechanism (verify).** Keep the soprano and take the other three voices from the next floor's shape, so three voices borrow at once. The oblique examples in [EL] show it:
  - drop 2 → drop 3 → triad over a held F in B♭;
  - in C: G C E A → G E (borrowed) …
- **App:** NOT.

**E05 Barry's chromatic scale on the scales of chords** [LoL ep.5; LL 8, 25, 44]
- **Rule.** The chromatic scale as Harris uses it (A2.7): scale degrees on the beats, chromatic notes between, a skip back at existing half steps. Echols: "can be applied to any diatonic scale or the major and minor 6th diminished scales (in combination with various relative motions)".
- **C6-dim.** Every step is a whole or a half step. Fill C–D (C♯), D–E (D♯), F–G (F♯), A–B (A♯). E–F, G–G♯, G♯–A and B–C are half steps and take the skip-back. The exact note choice follows ep.5 **(verify)**.
- **Two voices** (LL 8): the chromatic scale in 3rds or 6ths along a floor.
- **App:** NOT (see B1 #18).

**E06 On Symmetry** [LoL ep.6; LL 10, 53]
- **Procedure.** The whole-tone scale (C D E F♯ G♯ A♯) as a scale of chords. Relative motion with **two elevators**, then applied to standards (Body and Soul).
- **App:** NOT.

**E07 / E09 / E10 The dominant scales of chords** [LoL ep.8, 10, 14]
- **The scales.** C7-dim: C D E F G A♭ B♭ B. C7♭5-dim: C D E F G♭ A♭ B♭ B (A4).
- **Procedure.**
  - Harmonise each scale in all voicing types (35 voicings for the 7-dim);
  - apply relative motion (E01) and the elevator;
  - apply to standards.
- **Ep.14:** "There are 3 ways to play [the 7♭5-dim] scale over every dominant 7th chord." Which three is not public. A candidate set **(verify)**:
  - over G7: G7♭5-dim (= D♭7♭5-dim, same notes);
  - B♭7♭5-dim (= E7♭5-dim);
  - and one more family pair.
- **App:** NOT (B2 #31).

**E08 The Octatonic Scale** [LoL ep.9]
- **Procedure.** C°7 + D♭°7 = C D♭ E♭ E F♯ G A B♭, harmonised; few unique voicings because of the symmetry. Echols suggests it as a possible first scale.
- **App:** PARTLY. bh-three-dim names it; no voicing movement.

**E11 The Elevator Sequence** [LoL ep.16; LL 3–5, 68]
- **Procedure.** F1.2: from a unison on each degree, climb the floors to the double octave and back, in all scales of chords. Then mix floors and elevator moves.
- **C example.** The F1.2 table.
- **Progression:**
  - "Little Elevator" (3 floors);
  - "Finding More Floors";
  - "Moving Beyond the Octave" (floors 6–9);
  - then the minor 6-dim (iReal charts exist for both, [EL]);
  - then 7-dim and 7♭5-dim.
- Echols calls it "one of the most fundamentally important things for guitarists to practice with the scales of chords".
- **App:** NOT. This is the single most important Echols item to build.

**E12 The four pivoting scenarios** [LoL ep.17]
- F1.5. Lines that pivot (drop an octave mid-line, A2.6) while the elevator voices move.
- **App:** NOT. The single-line pivot is IN-APP.

**E13 Thirds** [LL 1, 26; Short; Alone Together]
- **Procedure.** Floor 2 of the elevator: each scale note with the next lower tone of **its own** chord.
- **C6-dim, top voice up:** C/A, D/B, E/C, F/D, G/E, G♯/F, A/G (a major 2nd), B/G♯.
- **Progression.** Over a tune (Night in Tunisia, Alone Together).
- **App:** NOT. The app's ABCs have no 3rds (B1 #10).

**E14 6ths into 3rds** [LL 2]
- **Procedure.** Invert the 3rds floor by moving the lower note up an octave, giving 6ths: C/A → A/C (A3–C4 becomes C4–A4). Alternate the two.
- **App:** NOT.

**E15–E17 Triads, shell chords, octave chords** [Shorts; LL 22, 27–29, 39, 41, 58]
- **Floors 3 to 5** of the elevator as voicing families.
- **C examples:**
  - triad = 3 voices within a 5th: A C E (on), B D F (off);
  - shell = bass + 6th/7th or bass + 10th (Echols's term **(verify)**; Harris shells in A5);
  - octave chord = an octave with one inner note: G (C) G.
- **Progression:** thirds → triads → shells → octaves, over Night in Tunisia and Body and Soul.
- **App:** NOT.

**E20 Arpeggiating the scale of chords** [LoL-man]
- **Procedure.** Arpeggiate each chord of the scale of chords in turn, going up the scale. "As you ascend the scale … the diminished chords are descending, while the 'on' chord is ascending."
- **C example.** C6 (C E G A) → B° from D (D F A♭ B) → C6 from E → B° from F …
- **Skip mode:** move through the scale by skips.
- **App:** NOT. A quick build.

**E21 Moving directly to the off chord** [LL 38] **(title)**
- Go from the on chord straight to its dim, in any voicing.
- **App:** NOT.

**E23 Scale of Scales / meta-scales** [LL 16, 21, 62, 69] **(title)**
- **Inferred (verify).** Moving through several scales of chords in series for colour, e.g. over Round Midnight.
- **App:** NOT.

**E24 / E25 Family** [LL 13, 18, 34, 49, 64, 75]
- Family connections, chromatic movement through the family, "Half Steps in the Family" (a reply to Parks), and "the Ugliest Duckling".
- **App:** PARTLY. E25 content unknown.

**E26 Transformations** [LL 14, 40, 77] **(title)**
- **Inferred (verify).** One shape transformed through major and minor keys; the minor version uses a "CAGED" sequence of positions.
- **App:** NOT.

**E37 Rhythm with Barry's exercise** [LL 72]. Also Parks EP 94; see P37.

**E40 Making complex songs simple** [LL 78] **(title)**
- **Inferred.** Reduce a tune to its movements, as in Foundations IV.
- **App:** NOT.

**E41 Improvised chord melody** [LL 66; 2024–26 videos]
- **Procedure.** Melody note on top; the 6 chord when the melody is a chord tone, the dim between; borrowing and contrary motion on long notes. Four steps in any key **(step names verify)**.
- **App:** NOT (AUDIT-DEPTH C1).

**E42 Five levels of a turnaround** [2024] **(title)**
- I–VI–ii–V in five levels of scale-of-chords treatment.
- **App:** NOT.

**E43 Jazz Roulette** [2024]
- A chance-based game: a random chord or voicing type is drawn and the player must play it in the scale of chords.
- **App:** NOT. Fits the app's game layer.

**E44 Baroque counterpoint** [LL 42, 48, 52]
- **Procedure.** Take a Bach fugue subject or a ground bass and move it through the scales of chords.
- **App:** NOT. Niche; keep for later.

**E46 The tesseract** [ep.0.2; GoFP 1]
- F1.3, and the ii–V as a path through it: Dm6 → B°7 → G7 is one edge pair, Harris's first movement.
- **App:** PARTLY.

**E47–E50 Foundations**
- The names of the seven core skills (polyphony and monophony) and of the seven Essential Movements are not public. See F5.

**E49 What can I do with [x] pitch?**
- **Inferred (verify).** For a held melody pitch, list every chord and voicing in the four scales that contains it.
- **C example (derived).** For a melody E:
  - C6 (C E G A), the on chord of C6-dim;
  - C7 (C E G B♭), the on chord of C7-dim;
  - C7♭5 (C E G♭ B♭);
  - D♭°7 = E°7 (E G B♭ D♭), the off chord of D6-dim (and of D♭, E, G, B♭ scales);
  - E's own A6-dim, Am6-dim, etc.
  
  Each sits in several voicing types.
- Strong game potential: "how many homes for this note?".
- **App:** NOT.

### Parks

**P01 Scale outlines** [TILF; SG]
- Procedure in F2.2.
- **C blues** [SG, A2.5]:
  - bar 1 C7 (up C–B♭, back);
  - bar 2 F7;
  - bars 3–4 C7;
  - bar 5 F7;
  - bar 6 F♯° (the related dim);
  - bars 7–8 up C7, down C7, ending on C♯ → A7;
  - bars 9–10 D7 (for Dm7), G7;
  - bars 11–12 C7, A7, D7, G7.
- **App:** NOT. Build first (Part D #2).

**P02 5-4-3-2** (A2.9, E12). Parks EP 37 adds the minor versions. **App:** NOT.

**P03 Barry's chromatic scale** (A2.7, E13). Four Parks episodes plus WoS L6. **App:** NOT.

**P07 Harmonic minor half-step rules** [EP 29] **(title)**
- **Inferred.** A harmonic minor (A B C D E F G♯) descending with one added note so that chord tones land on the beats. Following the minor pattern (A2.3), the added note is G between A and G♯ **(verify)**.
- **App:** NOT.

**P09 From the 2nd / from the 3rd** [EP 113–114]
- From a non-chord tone (2): add 0 or 2 half steps; from a chord tone (3): add 1 or 3.
- **C7 from D:** D C B♭ A G F E … or D D♭ C B B♭ … (A2.2).
- **App:** PARTLY.

**P12 / P43 / P55 The Open Studio *Scales of Chords* course** [OS-SoC]
- Creation theory → maj6, min6, dom7 and dom7♭5 dim in drop 2 → drop 3 → applications → borrowing → family → first movement in drop 2.
- **App:** major/minor 6-dim drop 2/3 IN-APP. The two dominant scales and the first movement in drop 2 are NOT.

**P17 The dominant eight ways** [WoS L2] — **(verify the eight)**.
- A likely set from [P5]: the F7 scale down from F, A, C and E♭ with one or three half steps, then up and down.
- **App:** PARTLY (harris-2, harris-11).

**P18 Three important arpeggios** (A2.1, E5).
- On C7: C E G C, G B♭ D G, B♭ D F B♭; then as 1-3-5-8 shapes down the line.
- **App:** NOT.

**P19 First 4 bars of the blues; bars 5–8; the most famous turnaround** [EP 7, 160, 58, 49] **(title)**
- **Inferred.** Lines for each section of the C blues built from the scale outline + rules (bars 1–4: C7 | F7 | C7 | C7 or Gm–C7, "ii is V"; bars 5–8: F7 | F♯° | C7/G | A7); the turnaround I–VI–ii–V.
- **App:** NOT as a sectioned blues drill (harris-15 gives ii–V–I only).

**P22 Comping** [EP 30, 71, 167, 170]
- Blues comping with all four scales of chords; "no more comping 4's" (rhythm: not four-to-the-bar); a 12-bar blues comped only with major 6 and minor 6 chords (C7 → Gm6, F7 → Cm6 …, the important minor) **(derived example)**.
- **App:** PARTLY. k-sixdim-9/10 comp forms with 6-dim but no "only m6/6" constraint and no 7-dim.

**P24 Movement: major to relative minor** [EP 34] **(title)**
- **Inferred.** Probably the Harris "major – minor – minor/6" family (C6 → B° → C6/A = Am7 …, A4) **(verify)**.
- **App:** NOT.

**P25 Minor ii–V lines** [EP 38, 159, 86]
- Includes the m7♭5 thought as the dominant a major 3rd down ("seven down to the 3rd", A3).
- **App:** PARTLY.

**P26 Pivots** (A2.6). Parks adds the m6-dim pivot (EP 105) and "a twist" (EP 110, **verify**). **App:** IN-APP / PARTLY.

**P28 Infinite ways 1-6-2-5** [EP 46–47, 79]
- I–VI–ii–V comped by moving through the scale of chords, with many voicing paths.
- **App:** PARTLY. k-sixdim-8 is ii–V–I only.

**P37 Rhythm** [EP 87 "Feeling the And (Donna Lee)", EP 94 "Barry's Beautiful Rhythm Exercise"; Echols LL 72]
- Harris's upbeat feel (A6). The exercise itself is not public **(verify)**. It is likely the R1 ch.4 upbeat patterns (2+/4+, 1+/4+).
- **App:** NOT.

**P42 The scale no one plays** [EP 127, 148] **(title)**. Probably the dominant 7th dim or the 7♭5-dim **(verify)**. **App:** NOT.

**P48 "Don't play chord tones on the beat"** [EP 143] **(title)**
- It sounds like the opposite of the rules. It is possibly about starting phrases on upbeats or non-chord-tone starts (from 2, 4, 6) **(verify)**.
- **App:** NOT.

**P49 Puzzle pieces** [EP 157, 166] **(title)**. Small line units ("pieces") to be fitted to chords **(verify)**. **App:** NOT.

**P54 Greatest exercise for fingerings** [EP 171] **(title)**. **App:** NOT.

## F5. What the owner, as a paying student, could look up or share

Names, outlines and C examples are enough; no copying of whole PDFs is needed.

**Echols (Open Studio, Patreon, store):**
1. **Episode 16 PDF, *The Elevator Sequence*:** the floor list as Echols writes it, the inner-voice choices for floors 4–9, and the minor 6-dim version. Needed to finish E11.
2. **Episode 17 PDF:** the names and one example of **the four pivoting scenarios** (F1.5).
3. **Episode 3 PDF:** the names of **the three ways of practising borrowing**.
4. **Episode 14 PDF:** **the three ways to play the 7♭5-dim scale over a dominant**.
5. **Episodes 8 and 10 PDFs:** just the **list of voicing shapes** (the 35 for the 7-dim): intervals, bottom to top.
6. **The Labyrinth app:** a screenshot or list of **every substitution label it shows over a V chord** (F1.4).
7. **Foundations I and II:** the names of the **seven core skills** in each, and the **level-1 daily routine** (one page each).
8. **Foundations IV:** the names of **the 7 Essential Movements**, with one Archetype and one Outline per movement (C example).
9. **Foundations III:** the procedure of the "[x] pitch" exercise.
10. **Little Labyrinth 6, 16, 21, 34, 49, 62, 69, 77:** one sentence each on what "Subset/Superset", "Scale of Scales", "meta-scales", "Ugliest Duckling" and "Transformations" mean.
11. **Little Labyrinth 72 and Parks EP 94:** the notated rhythm exercise.
12. **Echols's Open Studio sessions** (the owner studies with him there): the list of session titles, and any Barry Harris workshop handouts. No public Open Studio Harris course by Echols was found, only an ear-training class.

**Parks (Open Studio, Skool, YouTube):**
1. ***World of Soloing* worksheets:** L2 "8 ways you must know F7" (the eight forms) and L5 triplets.
2. ***Scales of Chords* worksheets:** modules 4–6 (dom7-dim, dom7♭5-dim, drop 3) and module 11 (first movement in drop 2): the voicing lists.
3. **YouTube titles of EP 11, 13, 16, 19, 21, 27, 35–36, 40–41, 43, 51, 53–56, 61, 66–68, 70, 72–74, 76:** titles only; the channel's own search did not surface them.
4. **One line each on EP 49, 52, 78, 88, 99, 102, 110, 127, 141–143, 146, 148, 157, 166, 171:** what is the exercise? These titles hide the content: "6 note scale", "new bebop scale", "scale no one plays", "short/long", "puzzle piece", "greatest fingering exercise".
5. **Skool classroom:** the list of mini-lesson titles, to date.

## F6. Build first

These are ordered by value to an Echols- and Parks-centred method, and by how fully the public sources specify them. They overlap with Part D where noted.

1. **The Elevator Sequence** (E11 + E01): C6-dim then Cm6-dim, floors 1–9, parallel along a floor and contrary between floors; P G. It is fully specified by [EL] and F1.2. It covers Part D #3.
2. **Scale outlines of tunes** (P01): blues, rhythm changes, then Cherokee, Donna Lee, How High the Moon, Night in Tunisia, ATTYA, Giant Steps; all instruments. Part D #2.
3. **Barry's chromatic scale** (P03 + E05): single line, then in two voices on the 6-dim scales. Part D #1; fix harris-17's name at the same time.
4. **The dominant scales of chords** (E07, E09, P12, P43): the 7-dim and 7♭5-dim, harmonised in drop 2/3, then over V7 → I. Part D #4.
5. **Thirds → triads → shells → octave chords** (E13–E17): Echols's voicing-family ladder in each scale of chords; P G.
6. **5-4-3-2** (P02), major, dominant, minor. Part D #5.
7. **Three important arpeggios + the dominant eight ways** (P18, P17). Part D #8.
8. **Substitution on V** (E02 + F1.4): over each V of a tune, choose itself, family, important minor or tritone's minor. The ear version is "which substitute?". It makes BARRY-HARRIS-THEORY §4 playable.
9. **Borrowing 2–3 voices via the elevator** (E03, E04). Part D #11.
10. **Arpeggiating the scale of chords** (E20) and the **tesseract explorer** (E46/F1.3): quick builds that make the 16 chords visible.

**Next:** harmonic-minor rules (P07); the sectioned blues (P19); m6-dim lines and pivots (P14, P26); comping a blues with only 6 and m6 chords (P22); Jazz Roulette (E43) as a game; improvised chord melody (E41).

All 12 keys, P/G/B mirrors, and rubato before tempo apply to every item above (owner rules).

# Barry Harris theory: the app's canonical reference

Every Barry Harris lesson, drill, ear item and AI explanation in the app follows this file. When content disagrees with it, the content is wrong. Items marked **(verify)** wait for a Harris teacher's confirmation.

Positioning (owner, 2026-11-14): The 7th Sense aims to be the first app to teach the Harris method professionally, and to measure the quality and time of practice continuously and the improvement over time. The bar is "the most professional there is".

All examples are in C or around G7 → C. Everything applies in all 12 keys, and every drill is built in all 12.

---

## 1. The three diminished chords

There are only three diminished 7th chords. Each has 4 names (minor thirds apart):

| Class | Notes | Names |
|---|---|---|
| **C°** | C E♭ G♭ A | C°7 = E♭°7 = G♭°7 = A°7 |
| **D♭°** | D♭ E G B♭ | D♭°7 = E°7 = G°7 = B♭°7 |
| **D°** | D F A♭ B | D°7 = F°7 = A♭°7 = B°7 |

**Dominants from a dim.** Lower any one note of a °7 a half step and you get a dominant 7th whose root is that lowered note. One dim therefore gives 4 dominants a minor third apart: one family (§2).

**Dominant 7♭9 rootless.** Any 7♭9 without its root is a °7: G7♭9 = B D F A♭ = **D°**.

## 2. The family of dominants ("brothers")

The four dominants a minor third apart: **G7, B♭7, D♭7, E7**.

- Their 7♭9 rootless chords are one dim: **D° (B°7)**. That is why all four can resolve to the same tonic: C, and also E♭, G♭ and A.
- Each is a substitute for the others: D♭7 is the tritone sub, B♭7 is the backdoor ♭VII7, E7 is the ♭9 relative.

## 3. The family of minor 6ths (the m6 on the 5th)

Each dominant has a **minor 6th on its 5th**. It equals that dominant's 9th chord without the root:

| m6 | Notes | = rootless 9 of |
|---|---|---|
| **Dm6** | D F A B | G9 |
| **Fm6** | F A♭ C D | B♭9 |
| **A♭m6** | A♭ C♭ E♭ F | D♭9 |
| **Bm6** | B D F♯ G♯ | E9 |

These four m6 chords are themselves a minor-third cycle.

Related identities (keep consistent with generate.ts ~3440 / ~3682):
- m6 = m7♭5 a minor 3rd down = 9 a major 3rd down (Dm6 = Bø = G9).
- Dm7 = F6 (a minor 7th is the 6 chord a minor 3rd up).
- Dø = Fm6.

## 4. Eight ways to express one dominant

A G7 that resolves to C can be played as any of **8 chords**: the 4 dominants of §2 plus the 4 minor 6ths of §3. Each one brings its own **6th-diminished scale**.

| Chord | Its tones over a G bass | Colour over G7 → C | Scale | Its dim |
|---|---|---|---|---|
| **G7** | 1 3 5 ♭7 | the plain dominant | dominant 7th-dim | **C° (A°)** |
| **B♭7** | ♯9 5 ♭7 ♭9 | ♭9 + ♯9: diminished (half-whole) colour; the backdoor sound | dominant 7th-dim | **C°** |
| **D♭7** | ♯11 ♭7 ♭9 3 | altered: ♭9, ♭5; the tritone sub | dominant 7th-dim | **C°** |
| **E7** | 13 ♭9 3 5 | 13♭9: half-whole colour | dominant 7th-dim | **C°** |
| **Dm6** | 5 ♭7 9 3 | natural tensions (9, 13), smooth; makes ii–V one sound | minor 6th-dim | **D♭° (G°)** |
| **Fm6** | ♭7 ♭9 11 5 | sus♭9 (phrygian colour) | minor 6th-dim | **D♭°** |
| **A♭m6** | ♭9 3 ♭13 ♭7 | altered (♭9, ♭13): the dark resolution | minor 6th-dim | **D♭°** |
| **Bm6** | 3 5 **maj7** ♭9 | clashes over a G bass (F♯ = maj7). Use it when the bass also moves to E, as E9 | minor 6th-dim | **D♭°** |

The rule the owner stated, confirmed by computation (2026-11-14):
- All four dominants share one diminished in their 6th-dim scales: **C° (= A°)**.
- All four minor 6ths share another: **D♭° (= G°)**.
- The **third** dim, **D° (= B°)**, is the dominant itself with ♭9 (G7♭9 rootless). It is the hub everything resolves through.

So one dominant function touches **all three** diminished chords:
- C° is the passing dim of the dominants' scales.
- D♭° is the passing dim of the m6 scales.
- D° is the 7♭9 chord itself.

Colour descriptions are the app's analysis and are marked **(verify)** for teacher review, especially Bm6's use and the choice between Fm6 and B♭7.

**Harris's names (sourced, docs/research/BARRY-HARRIS-METHOD.md).**
- **Dm6 over G7** (the m6 on the dominant's 5th) is **the important minor**.
- **A♭m6 over G7** is **the tritone's minor**: the important minor of D♭7, the tritone sub. Harris calls it "the perfect altered scale" (Workshop Part 2).
- **The four m6 chords** are the important minors of the four related dominants: Dm6 (G7), Fm6 (B♭7), A♭m6 (D♭7), Bm6 (E7).
- **Choosing** between the important minor and the tritone's minor is a matter of taste (Kingstone).
- **The "8 expressions" table** is the app's arrangement of these two Harris ideas, not a Harris list. Every row was checked note by note against sources.

## 5. The four 6th-diminished scales

The chord tones on the beats (down from the root, or up), with the dim's tones between them:

| Scale | Chord | Notes in C | Dim |
|---|---|---|---|
| **Major 6th-dim** | C6 | C D E F G A♭ A B | B°7 |
| **Minor 6th-dim** | Cm6 | C D E♭ F G A♭ A B | B°7 |
| **Dominant 7th-dim** | C7 | C D E F G A♭ B♭ B | D°7 |
| **Dominant 7♭5-dim** | C7♭5 | C D E F G♭ A♭ B♭ B | D°7 |

Spellings confirmed against sources.
- **Harris's name:** he calls these "Barry's four key scales" (Workshop Part 2).
- **The 7th-dim scale** is confirmed by Parks: 1 2 3 4 5 ♭6 ♭7 7.
- **The 7♭5-dim scale** follows from the construction. Since C7♭5 = G♭7♭5, one 7♭5-dim scale serves two roots ("you learn 6 and you know all 12", Harris 2003).
- **The 6-dim scales are first a chording tool** ("you learn these kind of scales for chording", Harris 2003).
- **For single lines** the default is the 7-note scale with the extra-note rules (§8).

## 6. Practice built on this (the app's ladder)

1. **The families:** name the 4 brothers and the 4 m6s for any dominant, in theory and by ear, in all 12 keys.
2. **The scales:** each of the four 6th-dim scales, up and down, 2 octaves, chord tones on the beats.
3. **Harmonization in moving inversions:** the chord alternates with its dim, arpeggiated and block, then drop 2, drop 3 and drop 2&4.
   - Drop 2 is the most useful (Friends of Barry).
   - Drop 3 is for LH shells and contrary motion.
   - Drop 2&4 is for 5ths.
   - Avoid "spread" as a Harris term; Kingstone calls the contrary-motion form "expand and contract".
4. **Borrowing (oblique motion):** one voice, then two, borrow from the dim, from another chord, or from the scale, and return.
5. **The 8 expressions of one dominant:** over a G7 → C, play each of the 8 chords and its scale, resolve to C6, and hear the colour. Then mix per bar.
6. **In context:** ii–V–I, the minor ii–V (Dø → Fm6; G7♭9 → A♭°7 / A♭m6), turnarounds, blues, then standards' changes.
7. **Ear:** which of the 8 did the comp use? Which family: dominant or m6? Natural or altered?

Every step runs rubato first, then the tempo ladder, on piano and guitar (and bass lines where it makes sense), in all 12 keys, measured.

## 7. Terms the owner confirmed

- **Pivot** = the pivot arpeggio: arpeggio notes moved an octave (Cmaj7 as C on top, then E G B below, climbing). The octave jump inside a descending scale line is "a scale line with a pivot". There is no "second pivot".
- **Make it minor:** over the V, play the m6 on its 5th. Harris's own term is **the important minor**; "make it minor" is only the app's alias.
- **The sixth on the fifth:** the **major** 6 on the 5th of a major chord. G6 over Cmaj7 gives 5, 7, 9, 6, and sounds better with the root in the bass. It is **not** the m6 on V's 5th.

## 8. The half-step (extra-note) rules

**General:** descend from at least the octave, starting on a downbeat.

**Dominant:**
- From 1, 3, 5 or ♭7, add one half step (1–♭7) or three (3–2, 2–1, 1–♭7).
  - Parks allows the three from the root too; Goren allows them only from 3, 5 and 7.
- From 2, 4 or 6, add none or two (2–1, 1–♭7).

**Major** (6-chord tones 1 3 5 6):
- From 3, 5 or 6, add one at 6–5, or three (6–5, 3–2, 2–1).
- From 2 or 4, add none or two (2–1, 6–5).

**Minor:**
- As major, with ♭3.
- From the root this gives the m6-dim scale.

**Miscellaneous rule:**
- Go up from a note, then come down by that note's rule.
- If the extra note would fall on a beat, put it in the bottom octave.

**Triplets:**
- An eighth triplet follows its middle note's rule.
- A sixteenth triplet follows its first note's rule.

**Later wording:** Harris spoke of "extra note rules". The rule, an odd or even count, matters more than the note.

## 9. Line devices

**Arpeggios on a dominant:**
- **The three important arpeggios** sit on 1, 5 and ♭7. For C7: C E G / G B♭ D / B♭ D F, each played 1-3-5-8.
- **3-to-9** is E G B♭ D.
- **3-to-♭9** is E G B♭ D♭. It is the dim on the 3rd, shared by all four related dominants.

**Phrases:** the **5-4-3-2 phrases** (Workbook 1). See docs/research/BARRY-HARRIS-METHOD.md A2.9; the exact notes still need checking against the workbook.

**Barry's chromatic scale:**
- The scale degrees fall on the beats, with chromatic notes between them.
- At an existing half step, skip to the note above and come back.
- Ascending in C: C C♯ D D♯ E G F F♯ G G♯ A A♯ B D C.

**Minor and dominant devices:**
- **Seven down to the 3rd:** over Dø–G7, play B♭7 (the m7♭5's dominant, a major 3rd down) up and down, landing on B.
- **ii is V:** over Dm7–G7, play G7.

**Scale outline:** one scale per bar of a tune, up from the root.

## 10. Moves

- **First movement** (Harris 2003): m6 → °7 → 7, i.e. Dm6 → B°7 → G7 → C6.
- **Next move:** raise two consecutive dim notes, return, then lower them (E♭6 → C°7 → A♭6).
- **Major – minor – minor/6:** C6 – B°7 – C6/A – A♭°7 – C6/G – Am6/F♯. It leads to the half-diminished a tritone away.
- **6th – 6th – 6th:** think F6 – Dm6 – C6 for ii–V–I, or use a single C6-dim scale over all of it.
- **Dominants from a dim:** Harris's moves are all half steps. Put a bass a half step below any note of the diminished chord. A whole-step raise gives the same 7♭9 arithmetically, but it is not how Harris teaches it.
- **The tools:**
  - invert (drop 2);
  - slide along the scale;
  - borrow with one, two or three voices. A borrowed dominant root in a dim voicing gives a maj7 colour.
- **Contrary motion:** from a unison, the outer voices step apart and the middle fills in, 6 and dim alternating.
  - Echols's Elevator: floors are voicing types. Moving along a floor is parallel motion; moving between floors is contrary.

## Sources

- Rees, Workshop Video 1–2 (table of contents), and *Keyboard* 10/1998 and 11/1998.
- The Harris 2003 Hague fragment, in Marijt 2014.
- Kingstone, *Harmonic Method for Guitar*.
- Parks, *Things I've Learned* (video 5) and Open Studio.
- Echols, *Labyrinth of Limitations*.
- Goren, *Barry Harris Companion*.
- The Friends of Barry slides.

Full list and exercise catalogue: `docs/research/BARRY-HARRIS-METHOD.md` (§0, Part E).

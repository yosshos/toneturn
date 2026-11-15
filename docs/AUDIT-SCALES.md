# AUDIT-SCALES — scales, hand independence, guitar technique, the harmonization ladder, Barry Harris borrowing

Owner playtest, 2026-11-14. The matrices below come from the live catalogue (`src/engine/drills/scaleMatrix.ts`,
`npx vite-node scripts/audit-scales.mts`) and are checked by `tests/auditScales.test.ts`. Every new item runs in all
12 keys and starts rubato (`rubato.ts`), then quarters, then the tempo ladder.

## 1. Barry Harris: the 6th-diminished scale (what was wrong)

- `harris-1` ("The linear scale", `h1-linear`) went **up the plain major scale** for two octaves and came **down with the
  ♭6 passing tone** only. Harris taught the 6th-diminished scale (C6 + B°7 = C D E F G A♭ A B) **up and down in the same
  eight notes**, so the 6 chord's tones fall on the beats both ways. Fixed: `harris-1` is now "The 6th-diminished
  scale, up and down" (2 octaves; RH, LH, hands together). Level id and item ids unchanged, so saved progress stays valid.
- The minor 6th-diminished scale (Cm6 + B°7 = C D E♭ F G A♭ A B) existed only as block chords (`harris-10`,
  `k-sixdim-6`) and on guitar / bass. Added `harris-25` (up and down, RH / LH / HT; `h1-linear` option 1).
- Barry's other two diminished scales, dominant 7th-diminished (C7 + B°7 = C D E F G A♭ B♭ B) and 7♭5-diminished
  (C7♭5 + B°7 = C D E F G♭ A♭ B♭ B): added `harris-26` (up and down, chord tones on the beats; options 2, 3), and both
  in the harmonization ladder and the borrowing ladder (below).
- The other Harris items: h2 (dominant scale down from each chord tone), h11 (arpeggio up, scale down), h14 (half-step
  rules), h22 (descending scale with a pivot), h23 (pivot + enclosure down the bebop scale) are descending on purpose —
  Harris's rules for descending lines. Their titles now say so (h14 and level `harris-14`: "descending lines"; the others
  already said "down"). h9 / h10 block chords, h18 and all `k-sixdim` levels already go up and down. Guitar `g-harris-1`
  and bass `b-barry-1` already played the scale up and down.
- Lesson text fixed: `bh-scale` (up and down stated; the four scales and borrowing added), `chromatic-added` (the A♭ line
  was "coming down" only), guitar `g-harris-neck` (the added note is the ♭6, A♭, not "the raised 5th"; "up or down"),
  `docs/SPEC-TECHNIQUE.md` H1.

## 2. Piano scale coverage matrix

Scale type × RH / LH / hands together parallel (an octave apart) / hands together contrary (from one shared note,
outward and back) × 1, 2, 4 octaves; each cell lists the levels that hold it in all 12 keys. 4 octaves: hands together
parallel only (the exam form); contrary motion over 4 octaves runs off an 88-key keyboard, and separate hands at 4
octaves add nothing the 2-octave items don't — those cells are n/a by design.

| Scale | RH 1 oct | LH 1 oct | HT par 1 oct | HT contr 1 oct | RH 2 oct | LH 2 oct | HT par 2 oct | HT contr 2 oct | RH 4 oct | LH 4 oct | HT par 4 oct | HT contr 4 oct |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Major (Ionian) | scales-1 | scales-1 | scales-16 | scales-16 | scales-2 | scales-2 | scales-3, scales-11, fingers-7 | scales-4 | n/a | n/a | scales-10 | n/a |
| Dorian | scales-19 | scales-19 | scales-20 | scales-20 | scales-19 | scales-19 | scales-20 | scales-20 | n/a | n/a | scales-32 | n/a |
| Phrygian | scales-24 | scales-24 | scales-25 | scales-25 | scales-24 | scales-24 | scales-25 | scales-25 | n/a | n/a | scales-32 | n/a |
| Lydian | scales-22 | scales-22 | scales-23 | scales-23 | scales-22 | scales-22 | scales-23 | scales-23 | n/a | n/a | scales-32 | n/a |
| Mixolydian | scales-21 | scales-21 | scales-21 | scales-21 | scales-12 | scales-21 | scales-21 | scales-21 | n/a | n/a | scales-32 | n/a |
| Natural minor (Aeolian) | scales-17 | scales-17 | scales-18 | scales-18 | scales-15 | scales-15 | scales-6 | scales-18 | n/a | n/a | scales-33 | n/a |
| Locrian | scales-26 | scales-26 | scales-27 | scales-27 | scales-26 | scales-26 | scales-27 | scales-27 | n/a | n/a | scales-32 | n/a |
| Harmonic minor | scales-17 | scales-17 | scales-16 | scales-16 | scales-5 | scales-5 | scales-5 | scales-13 | n/a | n/a | scales-10 | n/a |
| Melodic minor | scales-17 | scales-17 | scales-18 | scales-18 | scales-15 | scales-15 | scales-6 | scales-13 | n/a | n/a | scales-33 | n/a |
| Major pentatonic | scales-28 | scales-28 | scales-28 | scales-28 | scales-12, jazz-3 | scales-28 | scales-28 | scales-28 | n/a | n/a | scales-33 | n/a |
| Blues | scales-29 | scales-29 | scales-29 | scales-29 | scales-12, jazz-3 | scales-29 | scales-29 | scales-29 | n/a | n/a | scales-33 | n/a |
| 6th-diminished (Harris) | scales-30 | scales-30 | scales-30 | scales-30 | scales-12, harris-1 | harris-1 | harris-1 | scales-30 | n/a | n/a | scales-33 | n/a |
| Minor 6th-diminished (Harris) | scales-31 | scales-31 | scales-31 | scales-31 | harris-25 | harris-25 | harris-25 | scales-31 | n/a | n/a | scales-33 | n/a |

Missing cells: none

Added levels: `scales-16` … `scales-33`, `harris-25`. Path by difficulty (`path.ts` KEYS_LEVEL_DIFF): one-octave hands
together and minor scales ~920–1060, the modes / pentatonic / blues 1490–1850, both 6th-diminished 1880–1920,
4 octaves ~2000.

**Fingering.** Major and natural / harmonic / melodic minor keep the research tables. Every other scale (the modes,
pentatonic, blues, bebop, both 6th-diminished scales) now gets a computed fingering (`autoFingering`, `generate.ts`): the
octave cut into thumb groups of 2–4 notes, never a thumb on a black key (an all-black group starts on 2, as G♭
pentatonic 2 3 4 · 2 3), fewest crossings, crossings from a black key preferred, the tonic on the thumb when it can be,
5 at the RH top and LH bottom. It reproduces the table rows for the white-key majors and B major (tests). Contrary
motion uses each hand's own fingering from the shared start note.

## 3. Hand independence (new family `k-indep`, 8 levels)

Isidor Philipp style, our own patterns, in the five-finger position of every key: held notes with other fingers moving
(two levels: hold 1+3, 2+4, a chord, 4+5), two voices in one hand, LH ostinato under a RH melody (three ostinati),
3:2 / 2:3 / 4:3 / 3:4 on scale lines, legato against staccato, one hand loud and one soft, all at once.
Grading: notes and timing as always; **held notes** by their length (`goal.holds`, new in `analyze.ts`; MIDI, skipped
by microphone); **a touch per hand** (`goal.handArt`, legato / staccato per hand; MIDI); **the loud hand** by velocity
(accent gap, `dynamics: 'voicing'`; MIDI). Lesson `hand-independence`.

## 4. Guitar standard technique

| Topic | Before | Now |
|---|---|---|
| Chromatic / spider 1234, all 24 permutations | g-fretting 1, 2, 5 | — |
| Alternate / economy picking | g-picking 1, 3 | — |
| String skipping | g-picking 4 | — |
| Legato, trills | g-legato 1–3 | — |
| Slides, bends to pitch | g-lead 1–4, 8 | — |
| Vibrato | g-lead 5 | — |
| CAGED | g-scales 4, 5, 8; g-arps 2; g-chords 7 | — |
| 3NPS, 7 positions | g-scales 6, 9 | — |
| Segovia scales | **missing** | g-scales 11 (major, melodic minor, 3 octaves; diagonal with shifts, rest strokes i-m) |
| Sweep / economy arpeggios | g-picking 6, 8 | — |
| Triads on string sets | g-arps 3; g-chords 6 | + g-harm 5 (every scale, along the neck) |
| Intervals across strings | in-position sequences only (g-scales 10) | g-scales 12 (3rds, 4ths, 5ths, 6ths, octaves on every string pair) |
| Travis / fingerstyle; p-i-m-a, Giuliani | g-fingerstyle 1–4 | — |
| Strumming, muting | g-rhythm 1, 2, 5 | — |
| Power-chord and palm-mute riffs | g-chords 4; g-rhythm 7, 8 | + g-rhythm 11 |
| Double stops | g-lead 6 | + g-harm 3 (3rds in every scale) |
| Octaves (Wes) | g-jazz 7 (jazz add-on), g-picking 4 | g-lead 11 (core; strings 5 & 3 and 4 & 2) |
| Hybrid picking | g-picking 7 (country only, 5 keys) | g-picking 10 (core, 12 keys) |
| Original riffs: blues shuffle, rock, funk 16ths, metal gallop, chicken-pickin' | partly (g-rhythm 3, 5, 7, 8) | g-rhythm 11 (five original riffs, 12 keys) |

New guitar items run in all 12 keys inside frets 0–22. Older guitar levels that list fewer keys (g-lead, g-picking 1,
g-fretting …) were left as they are.

## 5. The harmonization ladder (piano `k-sharm` 1–18, guitar `g-harm` 1–9) — all added

13 scales — major, the six other modes, harmonic and melodic minor, Barry Harris's four diminished scales (major 6th,
minor 6th, dominant 7th, 7♭5) — × 9 steps, each up and down: note by note; 3rds broken; 3rds together; triads
arpeggiated; triads block (melody on top); 7th chords arpeggiated; 7th chords block (LH root); drop 2; drop 3. On the
Harris scales the "7th chords" are the chord and the diminished in moving inversions (C6, B°7, C6/E, B°7/D …).
Piano: two octaves; drop 2 / drop 3 split between the hands (the dropped voice in the LH). Guitar: lines, 3rds and
arpeggios in position (two octaves from the root on string 6); chords along the neck — triads on 3-string sets, 7ths in
drop 2 on 4-3-2-1 (the block step), drop 2 on 5-4-3-2 and 6-5-4-3, drop 3 on 6-4-3-2 and 5-3-2-1. Lines graded note for
note, chords by pitch-class sets (`goal.chordSets`). Path: lines and 3rds 900–1090, triads and 7ths 1110–1340, drops
1380–1600; guitar by grade 3–8. Nothing of this existed as a ladder before (scale × step × instrument, level ids):

| Scale | line piano / guitar | 3b piano / guitar | 3t piano / guitar | ta piano / guitar | tb piano / guitar | 7a piano / guitar | 7b piano / guitar | d2 piano / guitar | d3 piano / guitar |
|---|---|---|---|---|---|---|---|---|---|
| major | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9, k-sharm-10 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| dorian | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| phrygian | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| lydian | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| mixolydian | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| aeolian (natural minor) | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| locrian | k-sharm-1 / g-harm-1 | k-sharm-3 / g-harm-2 | k-sharm-5 / g-harm-3 | k-sharm-7 / g-harm-4 | k-sharm-9 / g-harm-5 | k-sharm-11 / g-harm-6 | k-sharm-13 / g-harm-7 | k-sharm-15 / g-harm-8 | k-sharm-17 / g-harm-9 |
| harmonic minor | k-sharm-2 / g-harm-1 | k-sharm-4 / g-harm-2 | k-sharm-6 / g-harm-3 | k-sharm-8 / g-harm-4 | k-sharm-10 / g-harm-5 | k-sharm-12 / g-harm-6 | k-sharm-14 / g-harm-7 | k-sharm-16 / g-harm-8 | k-sharm-18 / g-harm-9 |
| melodic minor | k-sharm-2 / g-harm-1 | k-sharm-4 / g-harm-2 | k-sharm-6 / g-harm-3 | k-sharm-8 / g-harm-4 | k-sharm-10 / g-harm-5 | k-sharm-12 / g-harm-6 | k-sharm-14 / g-harm-7 | k-sharm-16 / g-harm-8 | k-sharm-18 / g-harm-9 |
| 6th-diminished | k-sharm-2 / g-harm-1 | k-sharm-4 / g-harm-2 | k-sharm-6 / g-harm-3 | k-sharm-8 / g-harm-4 | k-sharm-10 / g-harm-5 | k-sharm-12 / g-harm-6 | k-sharm-14 / g-harm-7 | k-sharm-16 / g-harm-8 | k-sharm-18 / g-harm-9 |
| minor 6th-diminished | k-sharm-2 / g-harm-1 | k-sharm-4 / g-harm-2 | k-sharm-6 / g-harm-3 | k-sharm-8 / g-harm-4 | k-sharm-10 / g-harm-5 | k-sharm-12 / g-harm-6 | k-sharm-14 / g-harm-7 | k-sharm-16 / g-harm-8 | k-sharm-18 / g-harm-9 |
| dominant 7th-diminished | k-sharm-2 / g-harm-1 | k-sharm-4 / g-harm-2 | k-sharm-6 / g-harm-3 | k-sharm-8 / g-harm-4 | k-sharm-10 / g-harm-5 | k-sharm-12 / g-harm-6 | k-sharm-14 / g-harm-7 | k-sharm-16 / g-harm-8 | k-sharm-18 / g-harm-9 |
| 7♭5-diminished | k-sharm-2 / g-harm-1 | k-sharm-4 / g-harm-2 | k-sharm-6 / g-harm-3 | k-sharm-8 / g-harm-4 | k-sharm-10 / g-harm-5 | k-sharm-12 / g-harm-6 | k-sharm-14 / g-harm-7 | k-sharm-16 / g-harm-8 | k-sharm-18 / g-harm-9 |

## 6. Barry Harris borrowing (oblique motion) — added

Walking the scale of chords (chord / B°7 alternating in close position, one octave up and down), one or two voices step
to another chord's note and return while the others hold. All four Harris scales.

| Step | Piano (`k-sharm`) | Guitar (`g-harm`, string sets) |
|---|---|---|
| 1. one voice borrows a step down (soprano, alto, tenor, bass) | k-sharm-19, 20 | g-harm-10 |
| 2. two voices together | k-sharm-21 | g-harm-11 |
| 3. from the chord above; from another diminished (a half step outside the scale) | k-sharm-22 | g-harm-11 |
| 4. a passing run through the scale (soprano up, bass down) | k-sharm-22 | g-harm-11 |
| 5. every degree while walking; ii–V–I (major, minor); a standard's turnaround (the dominant borrows two voices from the diminished) | k-sharm-23 | g-harm-12 |
| 6. drop 2 and drop 3 versions | k-sharm-24, 25 | g-harm-10–12 (drop 2 on 4-3-2-1), g-harm-13 (5-4-3-2, 6-5-4-3, 6-4-3-2, 5-3-2-1) |
| Ear: which voice borrowed, from where | topic `bh-borrow` L1–2 | — |

Grading: each chord by its pitch-class set; the borrowed note and the return note for note, the feedback naming the
voice ("Alto didn't return", "Tenor didn't move to the borrowed note"); the held voices by their length ("Bass didn't
hold"; MIDI). The voice-leading grader (`voiceLead.ts`) grades a voicing the player chooses from chord symbols, so it
does not fit written oblique motion; the borrowing items use these per-voice checks instead. Lesson: the borrowing and
oblique-motion section and the four scales are in `bh-scale` (no duplicate). Path 1360–1650.

## 6b. Eight expressions of one dominant (added; follows docs/BARRY-HARRIS-THEORY.md §4, §6.5)

A G7 that resolves to C can be played as any of 8 chords, each with its own 6th-diminished scale. The four brother
dominants' dominant 7th-dim scales share **C° (= A°7)**; the four minor 6ths' minor 6th-dim scales share **D♭° (= G°7)**;
the third dim **D° (= B°7)** is G7♭9 rootless. (Checked in tests/auditScales.test.ts.)

| Chord | Over a G bass | Colour | Scale's dim |
|---|---|---|---|
| G7 | 1 3 5 ♭7 | the plain dominant | C° |
| B♭7 | ♯9 5 ♭7 ♭9 | ♭9 + ♯9, the backdoor sound | C° |
| D♭7 | ♯11 ♭7 ♭9 3 | altered, the tritone sub | C° |
| E7 | 13 ♭9 3 5 | 13♭9 | C° |
| Dm6 | 5 ♭7 9 3 | natural 9 and 13; also Dm7, so the ii–V is one sound | D♭° |
| Fm6 | ♭7 ♭9 11 5 | sus♭9 | D♭° |
| A♭m6 | ♭9 3 ♭13 ♭7 | altered; ♭9 and ♭13 fall a half step into C | D♭° |
| Bm6 | (over G: maj7 clash) | played only with the bass on E, as E9 | D♭° |

Related: Dm7 → F6, Dø → Fm6, G7♭9 → A♭°7 (consistent with `sixLinePair` / `sixPair` in generate.ts).

| Drill | Piano (`k-sharm`) | Guitar (`g-harris`, jazz add-on) |
|---|---|---|
| Each expression over its bass → C6: the brothers, the m6s, then all eight in drop 2 | k-sharm-26 | g-harris-11 (drop 2, 4-3-2-1) |
| Each brother's 7th-dim scale over V–I | k-sharm-27 | g-harris-12 (G7, D♭7) |
| Each m6's scale over V–I | k-sharm-28 | g-harris-12 (Dm6, A♭m6) |
| Mixing per bar; the important minor over the whole ii–V | k-sharm-29 | g-harris-12 |
| Comping a turnaround (natural, then altered) and a jazz blues | k-sharm-30 | g-harris-13 |
| Borrowing inside the important minor and inside the tritone brother's scale | k-sharm-31 | g-harris-13 |
| Minor ii–V–i: Dø as Fm6, G7♭9 as A♭m6 then A♭°7, Cm6; lines | k-sharm-32 | g-harris-11, 12 |
| Ear: natural or altered; which family (dominant or m6); which of the eight (4 choices) | topic `bh-sixfive` L1–3 | — |

Path 1560–1700 (after the four diminished scales and borrowing). Lesson: `bh-six-over` gains the eight expressions
(the important minor, the tritone's minor) and their resolution (no new lesson). Bass: not built here — the bass already has the important-minor lines ("make it minor", b-bebop 7) and
the m6-over-bass family; a bass level for the eight expressions is left open. Colour descriptions follow the reference
and carry its **(verify)** status (Bm6's use, Fm6 vs B♭7).

## 6c. Harris's moves, contrary motion, the true sixth on the fifth (BARRY-HARRIS-METHOD.md Part D) — added

Terms follow docs/BARRY-HARRIS-THEORY.md: Dm6 over G7 is **the important minor**, A♭m6 over G7 **the tritone's minor**
("make it minor" is only an alias); **the sixth on the fifth** is the MAJOR 6 on the 5th of a major chord (G6 over C) —
none of the m6-over-V material carries that name. Dominants from a dim are half-step moves (a bass a half step below a
dim note); voicings are drop 2, drop 3 and drop 2&4 ("spread" is not used as a Harris term; the contrary-motion form is
Kingstone's "expand and contract").

| Part D | Drill | Piano (`k-sharm`) | Guitar |
|---|---|---|---|
| D3 | Echols's Elevator, the exact nine floors (BARRY-HARRIS-METHOD.md F1.2): from a unison on every degree, up to the double octave and back (C6-dim: C · B D · A C E · G♯ B F · G C E G · F B D G♯ · E C G A · D G♯ F B · C C E C; inner voices of floors 4–9 marked verify in code); then a melody a floor higher each note and along the drop 2 floor (floors and moves mixed); Cm6-dim | k-sharm-33, k-sharm-40 | g-harris-12 |
| D4 | the 7th-dim and 7♭5-dim scales of chords of the V in drop 2 and drop 3 over V7 → I (the brothers' dim, C°, between) | k-sharm-34 (and the ladder: k-sharm 12–18) | g-harris-12; g-harm 7–9 |
| — | drop 2&4 on the four key scales | k-sharm-35 | g-harm-9 (strings 6-5-3-2, 5-4-2-1) |
| D6 | the true sixth on the fifth: G6 / F♯°7 scale of chords over a C bass (close, drop 2) | k-sharm-36 | g-harris-11 |
| D7 | first movement Dm6 → B°7 → G7 → C6; next move (raise two neighbouring dim notes, return, lower them, all four pairs); major – minor – minor/6 (bass C B A A♭ G F♯) | k-sharm-37 | g-harris-11 |
| D7 ear | which move; one dim note down → which dominant; two notes up → which 6 chord | topic `bh-moves` L1–3 | — |
| D11 | borrowing with three voices; the dominant root borrowed into the dim (the voice on ♭6 falls to 5: maj7 colour) | k-sharm-38 (two voices: k-sharm-21) | g-harris-13 |
| D12 | the four related dominants voiced over the V's shell, floating up the dim and back, to I6; the tritone's minor moving up its scale of chords over the V's bass, resolving | k-sharm-39 | g-harris-13 |
| D18 | guitar drop 3 and drop 2&4 6-dim voicings on string sets | — | g-harm-9 (drop 3 6-4-3-2 / 5-3-2-1, drop 2&4 6-5-3-2 / 5-4-2-1); passing / auxiliary chords and whole forms on guitar not built (see below) |

## 6d. Echols's frameworks (BARRY-HARRIS-METHOD.md Part F, items 1, 4, 5, 8, 9, 10) — added

| Item | Drill | Piano | Guitar / ear |
|---|---|---|---|
| 1 / 4 | the Elevator, nine floors, every degree, C6-dim then Cm6-dim; floor and elevator moves mixed | k-sharm-33, k-sharm-40 | g-harris-12 |
| 5 | the voicing ladder: thirds → triads → shells → octave chords on the 6-dim scales (shell / octave-chord shapes marked verify) | k-sharm-41 | g-harris-12 (shells) |
| 8 | a substitute on each V of a tune (I–VI7–ii–V–iii–VI7–ii–V–I): itself, the family, the important minor, the tritone's minor — pass by pass, then mixed | k-sharm-42 | g-harris-13; ear `bh-sixfive` L4 |
| 9 | borrowing through the Elevator: the soprano holds, the other voices take the next floor's shape and return (inferred, marked verify) | k-sharm-40 | g-harris-13 |
| 10 | arpeggiating the scale of chords | k-sharm 11–12 (7th arpeggios, the Harris scales chord / dim in turn) | g-harm-6 |
| 10 | the 16 chords around one dim (C°7 down to B°7: 4 dom7, 4 major 6, 2 dom7♭5, 4 minor 6, 2 dim) | — | ear topic `bh-tesseract` L1–3 (how many notes moved, which chord, one note down = dominant / up = minor 6th) |

Not built: the interactive 16-chord explorer screen (pick a dim, see and hear its 16 chords). The ear topic covers the
same set as questions; the explorer is a UI screen left for a later round.

## 7. Jazz technique depth (piano / guitar)

| Topic | Piano | Guitar | Depth |
|---|---|---|---|
| Shells | voicings 3, 6; k-bebop 7 | g-jazz 1, 8, 11 | basic → standards |
| Rootless A/B | voicings 4, 13, 17 | g-theory 1 | good on piano; one guitar level |
| Quartal | voicings 7, 8; k-reharm 10 | g-theory 2 | good |
| Upper structures | jazz 4; k-theory 2; k-reharm 8; voicings 16 | g-arps 7; g-theory 4 | good |
| Block chords / locked hands | harris 9–10; jazz 8; voicings 15; k-sharm 13–18 | g-harris 2, 7; g-harm 7–9 | good |
| Open / two-hand voicings ("spread" in the app; not a Harris term) | k-sixdim 4; voicings 16 | — | **thin** |
| Guide-tone lines | jazz 1, 7 | g-jazz 5, 9; g-impro 4 | good |
| Comping rhythms | voicings 11, 14 | g-jazz 1, 8 | medium |
| Walking 10ths / stride | accomp 3–4, 9, 11–18; k-reharm 7 | — | good on piano |
| Chord-melody | accomp 18 (stride melody) only | g-jazz 10, 12 | **thin on piano** |
| Wes octaves | — | g-jazz 7, g-lead 11 | basic; no octave lines over changes |

Still thin, not built here: a piano chord-melody ladder (melody over LH shells / rootless), a spread-voicing ladder
through standards, guitar octave lines over changes, rootless voicings beyond one guitar level.

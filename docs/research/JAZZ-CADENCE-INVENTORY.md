# Jazz cadence inventory by key (audit, 2026-11-21)

For the per-key pages (SPEC-PRACTICE-KEYS, SPEC-COACH-2 §10): every cadence that resolves to a key, in several voicings, on piano, guitar and bass.

**Method.** I dumped the live catalogue with a throwaway vitest: `families('piano' | 'guitar' | 'bass')`, every level, every spec, `generate()` at the level's first key. The test was deleted afterwards. The dump is after `gateFamilies`, so hidden (unverified) items are not counted.

I also read:
- `src/engine/charts.ts` (IMPROV_LEVELS, CHART_TEMPLATES) and `src/engine/standards.ts` (STANDARD_CHANGES);
- `src/engine/drills/chartDrills.ts`;
- docs/BARRY-HARRIS-THEORY.md.

**Notation.**
- Roman numerals are relative to the tonic of the key page. Examples are in C major or C minor.
- "check" means non-standard, or naming or sourcing that should be confirmed before it goes on a key page (project rule: only verified theory).

---

## 1. Master list: standard cadences and progressions that resolve to a key

### 1.1 Core ii–V family

| # | Cadence | Roman | In C | Status |
|---|---|---|---|---|
| C1 | Major ii–V–I | ii7–V7–Imaj7 | Dm7 G7 Cmaj7 | standard |
| C2 | Minor ii–V–i | iiø7–V7(♭9/alt)–im6 (or im(maj7)) | Dø7 G7♭9 Cm6 | standard |
| C3 | Minor ii–V into major | iiø7–V7♭9–Imaj7 | Dø7 G7♭9 Cmaj7 | standard |
| C4 | Turnaround, diatonic | I–vi7–ii7–V7 | Cmaj7 Am7 Dm7 G7 | standard |
| C5 | Long turnaround / tag | iii7–vi7(VI7)–ii7–V7–I | Em7 A7 Dm7 G7 C | standard ("tag ending" ×3 also standard) |
| C6 | Turnaround with VI7 | I–VI7–ii7–V7 (also I–VI7–II7–V7) | C A7 Dm7 G7 | standard |
| C7 | Extended dominants (rhythm-changes bridge) | III7–VI7–II7–V7 → I | E7 A7 D7 G7 C | standard |
| C8 | Chromatic dominants | III7–♭III7–II7–♭II7 → I | E7 E♭7 D7 D♭7 C | standard. Harris: "the family of dominants as lines". |
| C18 | ii–V chain, whole steps | ii–V of I+2, then I … | Em7 A7, Dm7 G7, C (or Dm7 G7, Cm7 F7, B♭) | standard |
| C19 | ii–V chain, half steps | ii–V a half step above, then the home ii–V | Em7 A7, E♭m7 A♭7, Dm7 G7, C | standard |
| C23 | Secondary dominants into I | V7/x before each diatonic chord; "ii–V the ii–V" | A7 Dm7, D7 G7, C | standard |

### 1.2 Substitutes and borrowed approaches

| # | Cadence | Roman | In C | Status |
|---|---|---|---|---|
| C9 | Tritone substitution | ii7–♭II7–I | Dm7 D♭7 C | standard |
| C10 | ii–V of the tritone sub | ♭vi7–♭II7–I | A♭m7 D♭7 C | standard |
| C11 | Tritone turnaround | I–♭III7–♭VI7–♭II7 | C E♭7 A♭7 D♭7 | standard (tritone subs of VI7–II7–V7) |
| C12 | Lady Bird / Tadd Dameron turnaround | I–♭III7–♭VImaj7–♭II7; all-maj7 form I–♭IIImaj7–♭VImaj7–♭IImaj7 | C E♭7 A♭maj7 D♭7 | standard. Both spellings occur in the literature; the app uses both names (k-keys-2 "Ladybird", k-reharm-17 "Dameron"). **check:** name them consistently. |
| C13 | Backdoor | iv7–♭VII7–I | Fm7 B♭7 C | standard |
| C14 | Minor plagal | ivm6–I; IV–iv–I | Fm6 C; F Fm C | standard |
| C15 | Aeolian approach | ♭VI(maj7)–♭VII(7)–I | A♭maj7 B♭7 C | standard |
| C16 | Endings | ♭VI7–♭II7–I; ♭VImaj7–♭IImaj7–Imaj7 | A♭7 D♭7 C | standard |
| C20 | Sus cadence | V7sus4–V7–I; ii/V (F/G)–V7(♭9)–I | G7sus4 G7 C; F/G G7♭9 C | standard |
| C21 | Deceptive | V7–vi | G7 Am7 | standard |
| C22 | Deceptive, borrowed | V7–♭VImaj7 | G7 A♭maj7 | standard |
| C29 | Dominant pedal | ii/V–IV/V–♭VI/V–V7–I | Dm7/G F/G A♭/G G7 C | standard |

### 1.3 Longer and form-based progressions

| # | Cadence | Roman | In C | Status |
|---|---|---|---|---|
| C17 | Coltrane changes into I | ii7–♭III7–♭VImaj7–VII7–IIImaj7–V7–Imaj7 | Dm7 E♭7 A♭maj7 B7 Emaj7 G7 Cmaj7 | standard (Countdown / Tune Up sub). The cycle form Cmaj7 E♭7 A♭maj7 B7 Emaj7 G7 Cmaj7 is also standard. |
| C24 | Ascending passing diminished | I–♯I°7–ii7–♯ii°7–iii7 | C C♯°7 Dm7 D♯°7 Em7 | standard |
| C25 | Descending diminished | iii7–♭iii°7–ii7–V7–I | Em7 E♭°7 Dm7 G7 C | standard |
| C26 | Blues turnaround | bars 11–12: I–VI7–ii–V (also I7–IV7, ♯IV°7) | C7 A7 Dm7 G7 | standard |
| C27 | Bird-blues approach | Imaj7–viiø–III7–vi–II7–v–I7–IV7 (descending ii–Vs into IV) | Cmaj7 Bø E7 Am7 D7 Gm7 C7 F7 | standard (Blues for Alice) |
| C28 | Minor turnarounds | i–VI7(or ♭VImaj7)–iiø–V7; i–♭VI7–V7alt–i (minor-blues ending) | Cm A♭7 Dø G7 | standard |
| C30 | Classical cadences (already in the app) | I–IV–V–I, cadential 6/4, plagal, N6, aug6, Picardy | — | standard |

### 1.4 Barry Harris moves (only what docs/BARRY-HARRIS-THEORY.md marks verified)

| # | Move | In C | Source |
|---|---|---|---|
| H1 | The brothers: any of the four dominants a minor 3rd apart resolves to I | G7, B♭7, D♭7, E7 → C | BH §2 |
| H2 | Eight expressions of one dominant, each to I6: four brothers plus four m6 on their 5ths | G7 B♭7 D♭7 E7 Dm6 Fm6 A♭m6 Bm6/E → C6 | BH §4. The table is the app's arrangement; every row is checked note by note. The colour descriptions are (verify). |
| H3 | ii–V–I as 6th chords | F6 – Dm6 – C6; minor: Fm6 (=Dø) – A♭°7 / A♭m6 – Cm6 | BH §6.6, §10 |
| H4 | The first movement | Dm6 → B°7 → G7 → C6 | BH §10 |
| H5 | Borrowing from the diminished inside ii–V–I and turnarounds | C6/B°7 … | BH §6.4 |
| H6 | The auxiliary diminished | C6 – C°7 – C6 | in the app (k-sixdim-11). **check:** not named in BH doc §1–§10. |
| H7 | One diminished, four keys | B°7 → G7/B♭7/D♭7/E7 → C/E♭/G♭/A | BH §1, §10 |

**check, Harris:** BH §10 says Harris builds dominants from a dim by *lowering a note a half step*. It says the whole-step raise gives the same chord but "is not how Harris teaches it". Four families say "raise one note a whole step":
- k-sixdim-7 (`sd-dom`);
- k-keys-10, g-keys-10 and b-keys-10 (`km-dimb9`).

Either retitle them as half-step moves, or move them out of the Harris framing. This needs an owner question.

---

## 2. Voicing list (standard)

**Piano**
- **R7:** root-position 7ths, LH or both hands.
- **R7c:** close-position 7ths in the RH, with inversions. This is the voice-led "close position".
- **Sh:** shells: 1-3, 1-7, 1-3-7, 1-7-3 (1-7-10). Type A / B in Siskind terms.
- **GT:** guide-tone lines (3 and 7).
- **RL:** rootless A (3-5-7-9) and B (7-9-3-5), Evans / Kelly.
- **D2 / D3 / D24:** drop 2, drop 3, drop 2&4.
- **Cl4:** four-way close, the melody harmonised in close position.
- **Bk:** block chords: Shearing locked hands, and Harris 6th-diminished drop 2 / drop 3.
- **Q:** quartal / So What.
- **UST:** upper-structure triads over a shell, or triad over tritone.
- **2H:** two-hand voicings: LH shell + RH upper structure or 9-5-3; spread LH 1-7 + RH 3-5-9; ballad LH 10ths + RH four notes.
- **St:** stride: single, octave, 10th, broken 10th, walking.
- **Wk:** walking-bass LH, and walking 10ths.
- **Ln:** single-line realisation: guide-tone line, bebop line, Harris rules.

**Guitar**
- **Sh6 / Sh5:** shells with the root on string 6 or 5.
- **GT:** guide-tone line.
- **RL:** rootless on strings 5-2 / 4-1.
- **D2:** drop 2 on sets 4-1, 5-2, 6-3.
- **D3:** drop 3 on sets 6-4-3-2 and 5-3-2-1.
- **Tri:** triads / UST on sets 3-2-1 and 4-3-2.
- **Q:** quartal.
- **6d:** Harris 6th-dim drop 2 on string sets.
- **Wk:** walking bass with guide tones / shells (solo texture).
- **Ln:** single line.
- Four-way close is not idiomatic on guitar (n/a).

**Bass**
- **R5:** roots / 2-feel.
- **Ar:** arpeggio, chord tones.
- **Ap:** walking with approach notes (chromatic, dominant, scale-step).
- **Wk:** free walking over a chart.
- **Ln:** bebop / Harris line.
- **Ch:** chordal: shells, 10ths, double stops.
- **Pd:** pedal / counter-line.

---

## 3. Coverage matrices

Every level listed runs in all 12 keys. The only exceptions in these families are the open-string guitar items g-color-13…16 (2–4 keys, by design) and b-up-walk-6 (C only).

Cell legend:
- level id(s) = present;
- `~` = partly present (the reason is given);
- `–` = missing;
- `ear` = only as an ear item.

### 3.1 Piano

| Cadence | R7 / R7c | Sh | GT | RL | D2 | D3 | Cl4 | Bk / 6-dim | Q | UST | 2H | St | Wk | Ln |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 ii–V–I | voicings-2, k-vl-4 | voicings-3, k-lh-5/6, k-bebop-7 | jazz-1, k-vl-3 | voicings-4/5/13, k-ctx-3 | voicings-9, k-vl-6 | ~ only the hl-d3 scale and std:fly | – (chart `close4` exists, no level) | k-sixdim-8, k-sharm-24 (bw-iivi-d2) | – | jazz-4, k-reharm-1, k-theory-2 | voicings-9, voicings-16, k-vl-7 | accomp-17 | accomp-8, k-reharm-7 | jazz-2, k-bebop-1/3, harris-15/18/22, k-ctx-2 |
| C2 minor ii–V–i | k-vl-4 opt3 | ~ ear only (k-ear-10) | k-vl-3 opt3 | voicings-4 opt2, voicings-13 | k-vl-6 opt4 | – | – | k-sixdim-8 opt1, k-sharm-32, k-sharm-23 | – | ~ k-reharm-2 (7♭9♭13 two hands) | k-reharm-2, k-vl-7 | – | – | k-bebop-2, harris-15/18/22, k-ctx-8 |
| C3 iiø–V7♭9–I | – | – | – | – | – | – | – | – | – | – | k-reharm-15 | – | – | – |
| C4 I–vi–ii–V | k-vl-4 opt2 | ~ via k-lh-5 (ii–V–I–VI order) | k-vl-3 opt2 | voicings-13, k-ctx-11 | – | – | – | k-sharm-23/25 (bw-std), k-sharm-30 | – | – | k-vl-7, k-reharm-3 | accomp-11…13, 16–18 | – | k-vl-8, k-ctx-11 |
| C5 iii–VI7–ii–V–I | k-vl-5 opt0 (diatonic cycle) | – | – | k-gig-1, k-ctx-12 opt2 | – | – | – | k-sharm-23 (bw-std) | – | – | k-reharm-3, k-reharm-23/24 (added ii–V) | ~ k-reharm-7 opt1 (10ths) | k-reharm-7 opt0 | k-gig-1/5 |
| C6 I–VI7–ii–V | – | k-lh-5/8, k-comp-1/6/7 | – | ~ voicings-5 opt2 | – | – | – | – | – | – | k-keys-1 opt0 | ~ k-lh-8 shell stride | accomp-8 | k-harrisline-8 |
| C7 III7–VI7–II7–V7 | – | ~ only inside rhythm A (voicings-17) | – | – | – | – | – | k-sixdim-10 opt1 | – | voicings-16 (altered-chain) | k-keys-3 | accomp-14 (rhythm bridge) | – | k-bebop-9 opt1, harris-16 opt1 |
| C8 E7–E♭7–D7–D♭7–I | – | – | – | – | – | – | – | – | – | – | k-reharm-6 opt1 | – | – | harris-16 opt0 |
| C9 ii–♭II7–I | – | – | – | voicings-10/13, k-ctx-3 opt2 | k-sharm-26 (D♭7 → C6) | – | – | k-sharm-26 | – | – | k-reharm-4 opt0, k-reharm-23/24 | – | – | k-ctx-1/2 opt2, k-sharm-27 opt2 |
| C10 ♭vi–♭II7–I | – | – | – | – | – | – | – | ~ k-sharm-39 (tm-res, the tritone's minor) | – | – | – | – | – | ~ k-sharm-28 opt6 |
| C11 I–♭III7–♭VI7–♭II7 | – | – | – | – | – | – | – | – | – | – | k-keys-2 opt2 | – | – | ~ k-ctx-5 (I–♭III7–ii–♭II7) |
| C12 Lady Bird / Dameron | – | – | – | – | – | – | – | – | – | – | k-keys-2 opt3, k-reharm-9/17, voicings-16 (std:ladybird) | – | – | k-gig-5 opt4 |
| C13 backdoor | – | – | k-ctx-6 opt1 | k-ctx-6 opt0, k-ctx-3 opt1 | k-sharm-26 (B♭7) | – | – | k-sharm-26 | – | – | k-reharm-4/9/13/23/24, k-theory-5 | – | – | k-ctx-1/2/6 |
| C14 minor plagal | – | – | – | – | – | – | – | – | – | – | k-reharm-11/13/17 | – | – | – |
| C15 ♭VI–♭VII–I | – | – | – | – | – | – | – | – | – | – | k-reharm-9 opt0, k-reharm-11 opt1, k-reharm-13 | – | – | – |
| C16 endings ♭VI–♭II–I | – | – | – | k-ctx-12 opt1, k-gig-3 opt1 | – | – | – | – | – | – | – | – | – | k-gig-3 opt2 |
| C17 Coltrane | voicings-12 (root + guide tones) | – | voicings-17 (std:giant) | ~ k-ctx-10 opt1 | – | – | – | – | – | – | voicings-16 (open) | – | – | jazz-9, k-ctx-10, k-bebop-10 |
| C18 ii–V chain, whole steps | k-vl-5 opt2 | – | – | – | – | – | – | – | – | – | k-reharm-6 opt0 | – | – | – |
| C19 ii–V chain, half steps | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| C20 sus cadence | – | – | – | – | – | – | – | – | – | – | ~ k-reharm-16 (F/G → G7♭9 only) | – | – | – |
| C21 V–vi | ~ cadences-6/7 (classical triads only) | – | – | – | – | – | – | – | – | – | – | – | – | – |
| C22 V–♭VI | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| C23 secondary dominants | ~ cadences-4 (V/V, classical) | – | – | – | – | – | – | – | – | voicings-16 (altered-chain) | k-reharm-4 opt3 | – | – | harris-16 opt1 |
| C24 ♯I°–ii–♯ii° | – | – | – | – | – | – | – | k-sixdim-5 opt0 | – | – | k-keys-1 opt1, k-reharm-4 opt2, k-reharm-23/24 | – | k-lh-10 opt1 | – |
| C25 iii–♭iii°–ii–V | – | – | – | k-gig-7 opt5 | – | – | – | k-sixdim-5 opt1 | – | – | – | – | – | – |
| C26 blues turnaround | – | voicings-6, k-lh-5/8, voicings-17 | jazz-7 | – | – | – | – | – | – | – | jazz-10 | accomp-13/14/16 | accomp-2/4/5 | k-bebop-4, jazz-6/7 |
| C27 Bird blues | – | – | – | ~ voicings-17 (whole form, LH, improv) | – | – | – | – | – | – | – | – | – | – |
| C28 minor turnarounds | – | – | ~ jazz-7 opt1 (minor blues) | – | – | – | – | ~ k-sixdim-10 opt0 | – | – | – | – | – | ~ k-bebop-9 opt2 |
| C29 dominant pedal | – | – | – | – | – | – | – | – | – | – | k-reharm-12 opt0 | – | – | – |
| H1 brothers | – | – | – | k-ctx-3 | k-sharm-26 opt0 | – | – | k-sharm-39 | – | – | – | – | – | k-ctx-1/2/4/5, k-sharm-27; ~ harris-8 (see §3.4) |
| H2 eight expressions | – | – | – | – | k-sharm-26 opt2 | – | – | k-sharm-26, 30, 31, 42 | – | – | – | – | – | k-sharm-27/28/29, harris-18 opt0 |
| H3 6th-chord ii–V–I | – | – | – | – | k-sharm-24 | k-sharm-25 | – | k-sixdim-8, 9, 10 | – | – | – | – | – | harris-18 opt1/2 |
| H4 first movement | – | – | – | – | – | – | – | k-sharm-37 | – | – | – | – | – | – |
| H5 borrowing in ii–V–I | – | – | – | – | k-sharm-24 | k-sharm-25 | – | k-sharm-23 | – | – | – | – | – | – |
| H6 auxiliary dim | – | – | – | – | – | – | – | k-sixdim-11 | – | – | – | – | – | – |
| H7 dim to four keys | – | – | – | – | – | – | – | k-keys-7/8/9/10, k-sixdim-7, harris-13 | – | – | – | – | – | k-keys-12 |

Classical cadences (C30) are in cadences-1…7, k-vl-1/2 (triads), accomp-1/3 (Alberti, stride I–IV–V7–I).

### 3.2 Guitar

| Cadence | Sh6 / Sh5 | GT | RL | D2 | D3 | Tri / UST | Q | 6d | Wk | Ln |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 ii–V–I | g-jazz-1 | g-jazz-5, g-jazz-9 | g-theory-1 opt0/2 | g-jazz-4, g-vl-2, g-jazz-9 | g-jazz-3, g-vl-3 | g-theory-4 opt0 | – | g-harris-11 (sf-voice), g-harris-8 opt3 | g-jazz-6/12, g-solojazz-1 | g-harris-4/5, g-bebop-2…7/12, g-arps-5, g-ctx-6/7, g-impro-1…4 |
| C2 minor ii–V–i | ~ ear only (g-ear-11) | g-jazz-9 opt1 | g-theory-1 opt1/3 | g-jazz-9 opt1 | – | – | – | g-harris-11 (sf-minor) | – | g-bebop-5/7, g-ctx-6 opt1 |
| C3 iiø–V7♭9–I | – | – | – | g-color-7 | – | – | – | – | – | – |
| C4 I–vi–ii–V | – | – | – | g-vl-2 opt2 | – | ~ g-vl-1 (I–vi–IV–V triads) | – | – | – | g-ctx-9, g-bebop-8 |
| C5 iii–VI7–ii–V | – | – | – | ~ g-gig-1 opt0 (comping) | – | – | – | – | – | g-gig-1 opt1, g-gig-2 opt0, g-ctx-10 opt2 |
| C6 I–VI7–ii–V | – | – | – | g-keys-1 opt0 (two positions) | – | – | – | – | – | g-bebop-6/8 |
| C7 III7–VI7–II7–V7 | – | – | – | g-keys-3 | – | – | – | – | – | – |
| C8 chromatic dominants | – | – | – | – | – | – | – | – | – | – |
| C9 ii–♭II7–I | g-jazz-11 opt2 (rhythm A) | – | g-ctx-2 opt2 | – | g-jazz-11 opt3 | – | – | g-harris-12 opt2 | – | g-ctx-1 opt2 |
| C10 ♭vi–♭II7–I | – | – | – | – | – | – | – | ~ g-harris-13 (tm-res) | – | – |
| C11 tritone turnaround | – | – | – | g-keys-2 opt2 | – | – | – | – | – | g-bebop-8 |
| C12 Lady Bird / Dameron | – | – | – | g-keys-2 opt3, g-color-8, g-gig-3 | – | – | – | – | – | g-gig-3 opt4 |
| C13 backdoor | – | g-ctx-5 opt1 | g-ctx-5 opt0, g-ctx-2 opt1 | – | – | – | – | – | – | g-ctx-1 opt1, g-ctx-5 opt2 |
| C14 minor plagal | – | – | – | g-color-6 | – | g-color-1 | – | – | – | – |
| C15 ♭VI–♭VII–I | – | – | – | – | – | g-color-2 | – | – | – | – |
| C16 endings | – | – | – | g-gig-2 opt1 | – | – | – | – | – | g-gig-2 opt2, g-ctx-10 opt1 |
| C17 Coltrane | g-theory-3 opt0, g-jazz-13 (Giant Steps) | – | – | g-theory-3 opt1 | – | – | – | – | – | g-ctx-8 |
| C18 ii–V chain | g-jazz-13 opt21 (12-key chart) | – | – | – | – | – | – | – | – | – |
| C19 chromatic chain | – | – | – | – | – | – | – | – | – | – |
| C20 sus | – | – | – | ~ g-color-12 (F/G → G7♭9) | – | – | – | – | – | – |
| C21 / C22 deceptive | – | – | – | – | – | – | – | – | – | – |
| C23 secondary dominants | – | – | – | – | – | – | – | – | – | – |
| C24 passing dim | – | – | – | g-keys-1 opt1, g-cmel-5 | – | – | – | – | – | – |
| C25 walk-down | – | – | – | g-gig-2 opt5 | – | – | – | – | – | – |
| C26 blues | g-jblues-2/4, g-jazz-13 | g-jblues-3 | – | – | – | – | – | – | g-solojazz-2 | g-jblues-1, g-ctx-9 |
| C27 Bird blues | – | – | – | ~ g-jazz-13 opt105 (whole chart) | – | – | – | – | – | – |
| C28 minor turnaround | ~ g-jazz-13 opt10 (minor blues) | – | – | – | – | – | – | – | – | – |
| C29 dominant pedal | – | – | – | ~ g-color-14 (open E; keys A, D, G only) | – | – | – | – | – | – |
| H1 brothers | – | – | g-ctx-2 | g-harris-11 opt0 | – | – | – | g-harris-6 | – | g-ctx-1/3/4 |
| H2 eight expressions | – | – | – | g-harris-11 | – | – | – | g-harris-13 | – | ~ g-harris-12: 4 of 8 scales (opts 0, 2, 4, 6; no B♭7, E7, Fm6, Bm6) |
| H3 6th-chord ii–V–I | – | – | – | – | – | – | – | ~ g-harris-12 opt9 (one sound over ii–V) | – | – |
| H4 first movement | – | – | – | – | – | – | – | g-harris-11 | – | – |
| H5 borrowing in ii–V–I | – | – | – | – | – | – | – | – | – | – |
| H7 dim to four keys | – | – | – | g-keys-7…10 | – | – | – | g-harris-6 | – | g-keys-12 |

- Rows not listed (H6) are missing on guitar.
- Quartal (g-theory-2) exists only as a dorian / modal vamp, never in a cadence.

### 3.3 Bass

| Cadence | R5 | Ar | Ap | Wk (chart) | Ln | Ch | Pd |
|---|---|---|---|---|---|---|---|
| C1 ii–V–I | – | g-bass-6 | b-walk-4/5/6, b-up-walk-4 | b-walk-9, b-std-4, b-ctx-1 opt0 | b-bebop-1/2, b-impro-6/7/9, b-barry-6 | b-ext-6/7/9 | – |
| C2 minor ii–V–i | – | – | – (b-walk-4…6 are major only) | b-std-3 (around the cycle) | b-bebop-2/4, b-impro-6/7/10, b-ctx-5 opt1 | – | – |
| C3 iiø–V7♭9–I | – | – | – | b-counter-8 | – | – | – |
| C4 I–vi–ii–V | – | b-chord-8 | – | b-std-2 (turnarounds-f) | b-bebop-5 | b-chord-14 | – |
| C5 iii–VI7–ii–V | – | – | – | b-gig-2 opt0, b-gig-3 opt2, b-std-3 (ballad-ii-v) | – | – | – |
| C6 I–VI7–ii–V | – | – | – | b-keys-1 opt0 | b-bebop-3/5 | – | – |
| C7 bridge | – | – | – | b-keys-3 (in 4 and in 2), b-walk-13 (rhythm-full) | – | – | – |
| C9 tritone sub | – | – | – | b-ctx-1 opt2 | – | – | – |
| C11 tritone turnaround | – | – | – | b-keys-2 opt2 | – | – | – |
| C12 Lady Bird / Dameron | – | – | – | b-keys-2 opt3, b-gig-3 opt4, b-walk-13 (ladybird) | – | – | – |
| C13 backdoor | – | – | – | b-ctx-1 opt1, b-ctx-4, b-std-2 (backdoor-g) | – | – | – |
| C14 minor plagal | b-counter-2 opt0 | – | – | b-counter-6 | – | – | – |
| C15 ♭VI–♭VII–I | b-counter-2 opt1 | – | – | – | – | – | – |
| C16 endings | – | – | – | b-gig-3 opt3, b-gig-4 opt6 | – | – | – |
| C17 Coltrane | – | – | – | b-ctx-7, b-std-5, b-walk-18 (Giant Steps) | b-ctx-7 (cx-trane) | – | – |
| C18 ii–V chain | – | – | – | b-walk-9, b-std-4 | – | – | – |
| C23 secondary dominants | – | – | – | b-walk-18 (sec-dominants-c) | – | – | – |
| C24 passing dim | – | – | – | b-keys-1 opt1, b-barry-2 | – | – | – |
| C25 walk-down | – | – | – | b-gig-4 opt5 | – | – | – |
| C26 blues | b-walk-1/2 | b-walk-3 | b-walk-21 | b-walk-7/8/12, b-gig-2 opt1 | b-walk-15 | – | – |
| C27 Bird blues | – | – | – | b-walk-13 (bird-blues) | – | – | – |
| C28 minor turnaround | – | – | – | ~ b-walk-13 (minor blues) | – | – | – |
| C29 dominant pedal | – | – | – | – | – | – | b-counter-5/9 |
| H1 brothers | – | – | – | b-ctx-1/2/3 | – | – | – |
| H7 dim to four keys | – | – | – | b-keys-7…10 | – | – | – |

- **Missing on bass:** C8, C10, C19, C20, C21, C22, and H2–H6.
- The bass is close to complete for ii–V–I. Everything else is mostly one walking item over a chart.

### 3.4 Tagging, tonic and label problems found

1. **Minor is tagged at level level, not item level.**
   - These levels mix major and minor cadence items under major keys or an explicit major-ordered array: voicings-4, voicings-13, k-vl-3/4/6/7, harris-15/18/22, k-sixdim-6/8/12, k-sharm-23/32, cadences-3, g-jazz-9, g-theory-1, g-ctx-6, b-ctx-5, b-impro-6/7, b-std-3.
   - k-reharm-2 and k-bebop-2 are minor-only, but they are tagged only by an A-first key array, not `keys: 'minor'`.
   - `keyFacet` needs a per-item minor flag (from kind + option), as SPEC-PRACTICE-KEYS §5 says.
2. **Wrong Roman numerals on minor classical cadences.** The minor items print major-key numerals:
   - cadences-3 minor: "C minor cadence · I–IV–I6/4–V7–I" (should read i–iv–i6/4–V7–i);
   - cadences-7: "I–IV–V7–vi (deceptive)–ii–V7–I", "I–vi–ii–V7–I", "I–ii6–V7–I", "I–V7–I–IV–I". In minor these should use i, iv, VI, iiø.
   - **check** the chords the generator actually writes before relabelling.
3. **Root versus tonic.** The key number is the dominant's root, not the tonic, in:
   - harris-2, 11, 14, 17 (C7 lines at key C, which resolve to F);
   - harris-7 opt1 ("ii–V in F" at key C);
   - harris-8 (brothers of C7 at key C, a tonic of F). The tonic-based k-ctx-1 files brothers under the tonic.
   - k-reharm-6 opt0 ends on B♭maj7 at key C.

   Guitar g-harris-3 is tonic-based (G7 at C). This is the clash already noted in SPEC-COACH-2 §10.
4. **Two-key and four-key items** need a filing rule: the target key, or both pages:
   - k-keys / g-keys / b-keys 4–12;
   - k-sixdim-7;
   - harris-13.
5. **Duplicate titles** for different options:
   - k-keys-3 / g-keys-3 km-bridge opt0 and opt1;
   - jazz-1 opt0 and opt1;
   - k-sixdim-13 opt0 and opt1.
6. **Piano wording on guitar.** g-ctx-11 (cx-ballad) and g-gig-4 (gg-b2h) say "LH 10ths, RH four notes".
7. **Unused content.**
   - The chart `lv:backdoor` (charts.ts n:10), `lv:keys-cycle` and the voicing `close4` exist but no level uses them.
   - The study charts `sec-dominants-c`, `backdoor-g`, `turnarounds-f`, `coltrane-subs`, `minor-two-five-keys` and `two-five-keys` are walked on bass only. No piano or guitar voicing level uses them.

---

## 4. Prioritised gaps for the per-key pages

**The lever.** All three instruments already have a generic "any chart" engine:
- piano `chart~<ref>~<voicing>~<rhythm>~<mode>` (chartDrills.ts): 13 voicings plus 5 stride types, 6 comping rhythms;
- guitar `comp-chart` (guitarJazz.ts): shells or drop 2, 5 rhythms, read from STANDARD_CHANGES;
- bass `standard` walking: in 4 or in 2, read from STANDARD_CHANGES.

So the cheapest route to a complete matrix is a **cadence chart library**: one 2–4 bar chart per row C1–C29, in C, transposed by key. Levels are then generated as cadence × voicing per instrument. Sizes: S ≈ under a day, M ≈ 1–3 days, L ≈ a week.

| # | What | Why first | Size |
|---|---|---|---|
| 1 | `keyFacet` cadence role: a per-item minor flag and a tonic rule for every cadence kind (§3.4 items 1, 3, 4). Guard test: every cadence item files under its resolution key. | Without it the key pages file things wrongly | M |
| 2 | Fix the minor Roman labels in cadences-3/7 (after checking the generated chords). Fix the duplicate titles and the guitar "LH/RH" wording. | Visible errors | S |
| 3 | **Cadence chart library** (~30 charts, C1–C29 major and minor) in charts.ts / STANDARD_CHANGES, wired to the three chart engines. Guard tests: the chords parse; minor charts use iiø/m6; all 12 keys. | Fills most of the matrix at once | M |
| 4 | **Piano voicing levels from it.** For each core cadence (C1, C2, C4, C6, C7, C9, C13, C17), add: shells, guide tones, rootless, drop 2, drop 3, four-way close, block, two-hand, stride, walking. First the missing cells: minor ii–V–i shells / drop 3 / close4 / stride / walking LH; drop 2 and drop 3 for I–vi–ii–V; rootless and shells for the rhythm bridge. | The owner's "different voicings" | M (data only, once #3 exists) |
| 5 | **The six cadences missing everywhere:** C10 ♭vi–♭II7–I, C19 chromatic ii–V chain, C20 plain V7sus4–V7–I, C21/C22 jazz deceptive (V7–vi, V7–♭VImaj7), C28 minor turnarounds (i–VI7–iiø–V7, i–♭VI7–V7alt–i). Also C27 the Bird-blues bars 1–5 as a cadence item, not only a whole form. | The owner's "longer and more complex kinds" | S each via #3 (about M in total) |
| 6 | **Guitar from it.** Shells and drop 3 for minor ii–V–i; drop 2 / rootless / shells for C4–C7, C9, C11, C13; secondary dominants; the chromatic dominants. comp-chart offers only shell / drop 2, so drop 3 and rootless chart modes need adding. | Guitar is thin outside ii–V–I | M (mode work) + S per row |
| 7 | **Bass.** A minor option for b-walk-4/5/6 (chromatic / dominant / scale-step approach into iiø–V7–i). Walking items over every new cadence chart. Roots-and-guide-tone lines for C8, C10, C19, C20, C22. | Every bass key page otherwise shows ii–V–I only | S–M |
| 8 | **Harris on guitar and bass.** Guitar:<br>• the four missing expression scales (sf-line opt 1, 3, 5, 7);<br>• sd-iivi (6th-chord ii–V–I, major and minor);<br>• borrowing inside ii–V–I (bw-iivi);<br>• the auxiliary dim.<br>Bass: none of these (they are harmony), but a "6th-chord ii–V–I" walking line is optional (**check** that it fits the method). | Harris is the flagship | M |
| 9 | Quartal ii–V–I (piano and guitar), and UST on minor ii–V–i (V7alt: ♭VI and ♭II triads over the shell). | Standard, but rarer | S–M. **check:** quartal on V7 needs a voicing rule (e.g. 3-♭7-9 + 4ths) before building |
| 10 | Owner questions:<br>• the "raise a whole step" titles (k-sixdim-7, k-keys-10, g/b-keys-10) against BH §10;<br>• whether "the auxiliary diminished" (k-sixdim-11) is a Harris term;<br>• one name for C12 (Lady Bird turnaround vs Tadd Dameron turnaround, 7th-chord vs all-maj7 spellings). | Verified-theory rule | — |

**What a key page can show today without new content.** Taking piano at C:
- Present: C1, C2, C4–C9, C11–C18, C23–C26, C29 and all of H1–H7. Most of these have 2–6 voicings.
- Partly present: C3, C10, C20, C21, C27, C28.
- Missing: C19 and C22.

Guitar covers roughly half the rows. Bass covers about 60 % of the rows, but usually with a single walking realisation.

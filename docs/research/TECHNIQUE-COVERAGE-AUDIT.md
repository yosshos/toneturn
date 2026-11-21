# Technique coverage audit for the per-key view (piano, guitar, bass)

Date: 2026-11-21. This audit is read-only and supports docs/SPEC-COACH-2.md §4.3 and §6 (Practice → Train → **By key**).

**Owner's questions**
- (a) Every technique exercise, Barry Harris included, must appear in the per-key view.
- (b) Is any commonly accepted classical or jazz technique exercise missing?
- (c) The same for guitar and bass.

**Method**
- A throwaway vitest file dumped `families('piano' | 'guitar' | 'bass')` from `src/engine/drills/plan.ts`, after
  `widenFamilies` and `gateFamilies`. The dumped levels are the ones the app shows today.
- For every level it recorded:
  - the resolved keys;
  - whether a level's first spec gives different notes in two keys ("transposes");
  - for every drill, `drillKeyOf` and `drillMinorOf` from `ladder.ts`, i.e. the key and mode the key view would file it
    under.
- Samples were printed at key C to read what "key" means for each kind.
- The dump file was deleted afterwards. Nothing else in the repo was changed.
- Totals: 1,302 levels in 129 families, as shown today (hidden, unverified items excluded).

Tags:
- **present**: the material exists, with its file or level id.
- **partly**: some forms exist; what is missing is named.
- **missing**: not in the app.
- **check**: the item is plausible but not verified here. Per only-verified-theory, it stays out until the owner or a
  source confirms it.

---

## 0. The short answer

1. **Key coverage is already almost complete.**
   - Since 0.97, `keys12.ts widenFamilies` widens every key-relative family to 12 keys.
   - A level with `keys: 'major'` or `'minor'` runs through all 12 keys via `keysInOrder`.
   - Of 1,302 levels, only about 75 run in fewer than 12 keys. All of them are deliberate: open strings, harmonics,
     first steps, fixed-key pieces, open-chord vocabulary, flamenco and fingerstyle on open shapes, the upright's
     positions and three-octave scales. They are listed in §1.4, §2.4 and §3.4.
   - **Missing keys are not the problem for (a).**
2. **The real blocker is what "key" means on a drill.** Three defects would put items on the wrong key page:
   - **Minor material tagged as major.**
     - `drillMinorOf` reads only `spec.minor` or `tonic.minor`. Many kinds put the minor form in `option` instead.
     - At key C, **178 levels** contain at least one item whose title says minor (harmonic or melodic minor, Cm6,
       minor ii–V–i, minor rule, minor 6th-diminished, vii°7 of C minor) but `drillMinorOf` returns false.
     - Examples:
       - `harris-10` and `harris-25`: the C minor 6th-diminished scale and block chords would sit on the **C major**
         page.
       - `k-bebop-2`: the minor ii–V–i "in A" would sit on the **A major** page.
       - `arpeggios-5` and `arpeggios-11`: "B°7, vii°7 of C minor" would sit on C major.
       - All the minor options of `k-sharm-*`, `g-harm-*`, `g-scales-13/15`, `b-scale-3/7`, `b-barry-1` (option 1)
         and `g-harris-1` (options 2–3).
     - The full list was generated from the dump. §4.1 gives the fix.
   - **Root vs tonic.** The key number means different things in different kinds:
     - **The tonic of a key:** scales, cadences, ii–V–I, and `arpeggios-4` "G7 (V7 of C)" at key C.
     - **The root of a chord or scale:** `harris-2` "C7 scale down" at key C, `harris-8` brothers over C7, `jazz-5`
       "C altered", `k-tpair-1` "E♭ + F over Cm7", `scales-19` "C dorian".
     - **The two clash for the same idea across instruments.** At key C, piano `harris-2` plays the **C7** dominant
       scale, while guitar `g-harris-3` plays **G7** (V of C).
     - Even within the Harris material, `k-sharm-26` at key C is "G7 → C6" (tonic), but `harris-26` at key C is "C7 +
       B°7" (root).
   - **Tunes.** Charts and standards (`voicings-13…17`, `accomp-11…17`, `g-jazz-8/13`, `b-walk-11/13/14/18`, `b-std`)
     take the key as an offset from the lead sheet and set `tonic` correctly. They file correctly, but they are
     applications, not technique (see the class column).
3. **Gaps against standard curricula are small.**
   - Classical piano lacks some minor and chromatic forms of advanced items: octaves, double 3rds, formula pattern,
     contrary-motion 7th arpeggios.
   - Hanon is only No. 1, six Hanon-style patterns and Part II 39–43.
   - Jazz piano is very complete. Kenny Barron voicings are absent (check). The bebop scales are right hand only.
   - Guitar lacks minor-scale shapes in all five positions.
   - Bass lacks diatonic 7th chords through the key, which piano has as `k-sharm` and guitar as `g-harm`.
   - §1.5, §2.5 and §3.5 have the details.
4. **Verified-content inconsistency (check).**
   - The claim `bh-3-to-b9` is **not** switched on, so it hides `item:hl-3b9`.
   - But "3 to ♭9" items are still shown under another kind, `v-3b9`:
     - `k-vocab-8` "Barry Harris: 3 to ♭9 and the triplet rules";
     - `g-bebop-10`;
     - `b-bebop-7`.
   - The titles of `g-harrisline-6` and `b-harrisline-6` still say "3 to ♭9 over the family", although their `hl-3b9`
     items are hidden.
   - Under the project rule, either the claim is switched on or `item:v-3b9` is added to its `hides`.

---

## How to read the tables

- **Levels**: the number of levels shown today.
- **Keys today**:
  - **12M**: all 12 major tonics.
  - **12m**: all 12 minor tonics, from `'minor'` levels or `spec.minor` items.
  - **12 (mixed)**: levels with explicit 12-key lists. The mode comes from the item.
  - A subset is named in full.
- **Transposes**:
  - **Y**: the notes move with the key.
  - **Y (fret)**: the key only picks a fret or a box position; the exercise itself is mechanical.
  - **N**: identical notes in every key.
- **Per-key as is?**
  - **OK**: files correctly on the right key page.
  - **Mode bug**: some minor items are tagged major.
  - **Root**: the key is a chord root, not a tonic; it needs a mapping rule (§4.2).
  - **Tune**: tune-based.
  - **Fixed**: deliberately in fixed keys.
- **Class**:
  - **KEYED**: belongs on the key page.
  - **KEYED-2**: keyed, but a secondary row shown from a tier or in a focus, not a core dot.
  - **NEUTRAL**: KEY-NEUTRAL; rhythm, mechanics or open strings.
  - **NOT-TECH**: tunes, ear, reading, pieces, improvisation, arranging.

---

## 1. Piano

### 1.1 Classical and general technique families

| Family | Levels | Transposes | Keys today | Per-key as is? | Class | Notes |
|---|---|---|---|---|---|---|
| `scales` | 33 | Y | 26 levels 12M, 7 levels 12m; minor items inside major levels (10, 14, 16, 33) are tagged minor correctly | OK; modes (19–27, 32) are Root | **KEYED (core)** | Modes are built on the key's root (C dorian at key C). §4.2 decides parallel vs relative. |
| `arpeggios` | 14 | Y | 9 levels 12M, 4 levels 12m, 1 level 12 (mixed) | Mode bug: 5, 11 (dim7 "of C minor" tagged C major); 4 and 10 file G7 on the C page (tonic semantics, as in the syllabi) | **KEYED (core)** | `arpeggios-7` maj7, m7 and ø7 are Root. |
| `cadences` | 7 | Y | 12M and 12m | OK | **KEYED (core)** | Includes the Neapolitan 6th, augmented 6th, plagal, deceptive and Picardy. |
| `fingers` | 14 | Y | 12M or 12 | OK; `fingers-7` dim7 has the mode bug | **KEYED** (Hanon row) | Hanon No. 1 and patterns are already in all keys (`fingers-2/6/14`). Trills, ornaments, repeated notes and held notes are diatonic in the key. |
| `control` | 16 | Y | 12 | OK | **KEYED-2** (control row) | These are scales with dynamics or articulation, i.e. an axis of the scale. §2 of the spec calls it the "articulation/dynamics axis". |
| `advanced` | 8 | Y | 1, 3, 4: 12M; 2: C only; 7: the other 11 (a split ladder, so 12 in total); 5, 6, 8: 12 | OK | 1, 3, 4: **KEYED** (octaves, double notes). 2, 6, 7 (polyrhythm) and 5, 8 (leaps): **NEUTRAL** | Polyrhythm and leaps are coordination drills; the key is a carrier. |
| `k-indep` | 8 | Y | 12M | OK | **KEYED-2** | Hand independence (Philipp style). Keyed, but not a core dot. |
| `k-pedal` | 3 | Y | 12 | OK | **KEYED-2** | Legato, syncopated and half pedal over the key's chords. |
| `k-first` | 11 | Y (1–3 C only; 4 N) | 1–4 C only; 5–11 12 | Fixed (1–4) | **NEUTRAL** (beginner) | 1–4 are geography and posture. 5–6 (five-finger positions) duplicate `fingers-1`. 7–11 are reading and first chords: NOT-TECH. |
| `k-rhythm` | 7 | Y | 12 | OK | **NEUTRAL** | Subdivision, polyrhythm, hemiola and odd meter. The pitch is only a carrier. |
| `k-read` | 15 | Y | 12 | OK | NOT-TECH | Sight-reading. A keyed "read in this key" row is optional. |
| `k-classic` | 9 | N | Each piece in its own key (C, G, A, F…) | Fixed | NOT-TECH | Public-domain pieces. |
| `k-pop` | 6 | Y | 12 | OK | NOT-TECH (style) | Pop accompaniment patterns. They could be an optional "accompany in this key" row. |

### 1.2 Jazz and Harris families

| Family | Levels | Transposes | Keys today | Per-key as is? | Class | Notes |
|---|---|---|---|---|---|---|
| `harris` | 26 | Y | 12 | Root for H2, H8, H11, H16 and H19–21 (C7 or Cmaj7 at key C); tonic for H15, H18 and H22 (ii–V–I in C). Mode bug: H10, H13, H14, H15, H17, H18, H22 and H25 | **KEYED (core, jazz)** | The main Harris family. See §4.3 for which level goes on which key page. |
| `k-sixdim` | 13 | Y | 12 | Mostly OK. Mode bug: 8, 10, 13 (6 and 12 are tagged correctly) | **KEYED (jazz)** | The scale of chords, borrowing, oblique motion, the ♭9 from the diminished, ii–V–I. 9 and 10 (forms) are applications. |
| `k-sharm` | 42 | Y | 12M | Mode bug: every minor option (aeolian, harmonic and melodic minor, Cm6) in 1–41 | **KEYED (core for Harris)** | Scale harmonisation, borrowing, drop 2, 3 and 2&4, eight expressions, the elevator, the moves. Already tonic-based ("G7 → C6" at key C). |
| `k-harrisline` | 22 | Y | 12 | Root (C7 rule, Cm6 rule). Mode bug: 15, 16, 21 | **KEYED (jazz)** | The chromatic scale, the rules, the important arpeggios, seven down to the 3rd, triplet and miscellaneous rules. 8 and 9 (upbeat comping) and 10, 14, 18, 30 (tune outlines) are NOT-TECH. |
| `k-vocab` | 10 | Y | 12 | OK (tonic: ii–V–I in C). Mode bug: 5, 7, 8 (minor ii–V–i items) | **KEYED (jazz)** | Approach notes, enclosures, 3 to ♭9 (check), make it minor. 1 and 10 (time feel) are NEUTRAL. |
| `k-bebop` | 10 | Y | 12 | Mode bug: 2 (all), 9. Levels 4, 5, 6, 8 and 9 are forms | 1–3, 7, 10: **KEYED (jazz)**. 4–6, 8, 9: NOT-TECH (forms) | Lines over a ii–V–I are technique; lines over a whole form are application. |
| `jazz` | 10 | Y | 12 | 6, 7, 10 are forms. Mode bug: 5, 6, 7 | 1, 2, 4, 8, 9: **KEYED**. 3, 5: **KEYED (Root)**. 6, 7, 10: NOT-TECH | Guide tones, 1-2-3-5, upper structures, locked hands, Coltrane, and the chord scales (`jazz-5`). |
| `voicings` | 17 | Y | 12 | 1–12 OK, with 4 having a mode bug. 13–17 Tune (charts) | 1–12: **KEYED (jazz)**. 13–17: NOT-TECH | Triads, 7ths, shells, rootless A/B, one-minute changes, quartal, drop 2, tritone sub, comping rhythms. |
| `k-vl` | 8 | Y | 12 | Mode bug: minor ii–V–i items in 3, 4, 6, 7 | **KEYED-2** | Voice leading: triads, guide tones, close 7ths, cycle, drop 2, spread. |
| `k-tpair` | 16 | Y | 12 | Root (pairs over Cm7, Cmaj7♯11, C7) | **KEYED (jazz, T5+)** | 9, 12, 13, 15 (vamp, chart, blues, form) are applications. |
| `k-theory` | 7 | Y | 12 | Root | **KEYED-2** | Pentatonic superimposition, upper structures, the V's colour, triad pairs, line clichés. |
| `k-reharm` | 24 | Y | 12 | Mode bug: 2, 20 | **KEYED-2** (harmony) | Altered and minor ii–V–i, ballad voicings, modal and pedal comping, borrowed chords, planing, sus. Advanced, harmony-led. |
| `k-keys` | 12 | Y | 12 | Ambiguous: a modulation involves two keys | **KEYED-2** | File under the start key. Turnarounds (1–2) are core jazz. |
| `accomp` | 18 | Y | 12 | 1–10 and 18 OK; 11–17 Tune | 1–10, 18: **KEYED-2** (LH patterns). 11–17: NOT-TECH | Alberti, walking, stride, boogie, bossa, montuno, pop LH. |
| `k-lh` | 11 | Y | 12 | OK | **KEYED-2** | The solo left hand: shells types A/B, roll, shell stride, walking 10ths. |
| `k-comp` | 4 | Y | 12 | OK | **KEYED-2** | Comping vocabulary (Charleston on 3, lead-ins, two-bar patterns). |
| `k-ctone` | 7 | Y | 12 | Root (one note, many chords) | **KEYED-2** | Harmony theory you play. |
| `k-mediant`, `k-organ` | 8, 7 | Y | 12 | Root | **KEYED-2** (colour) | Chromatic mediants and organ comping (Goldings). Niche. |
| `k-tex` | 18 | Y | 12 | Over heads | NOT-TECH | Solo-piano textures (Siskind) applied to heads. |
| `k-impro`, `k-solo`, `k-phrase`, `k-ctx`, `k-tune`, `k-harm`, `k-gig` | 7, 13, 8, 13, 15, 13, 12 | Y | 12 | OK or Tune | NOT-TECH | Improvisation, phrases by ear, context, tunes, harmonising a melody, bandstand. |
| `k-ear` | 16 | Y | 1–9 subsets widened to 12; 10–16 12 | OK | NOT-TECH (ear) | |

### 1.3 Piano: what is NEUTRAL, and what could reasonably be made keyed

| Item | Today | Could be keyed? |
|---|---|---|
| Hanon No. 1 and Hanon-style patterns (`fingers-2/6/14`) | **Already keyed**: all 12 keys, diatonic in the key | Yes, and already done. Hanon 2–20 individually is a content gap (§1.5). |
| Trills on finger pairs and measured trills (`fingers-4/11`) | Keyed (diatonic pairs in the key) | Yes, already done. |
| Ornaments (`fingers-9`) | Keyed | Yes, already done. |
| Repeated notes and chords, rotation (`fingers-5/12/14`) | Keyed | Yes, already done. |
| Held-note independence (Pischna or Dohnányi style, `fingers-3/10`) | Keyed | Yes, already done. |
| Czerny-style velocity (`fingers-13`) | 12M | Yes, already done. |
| Polyrhythm (`advanced-2/6/7`, `k-rhythm`) | 12 keys as a carrier | **No value in keying it.** Keep NEUTRAL, under a "coordination" topic. |
| Leaps and hand crossing (`advanced-5/8`) | 12 | **Could be keyed**: a waltz bass on I–V7 in the key is natural. Low priority. |
| `k-first` 1–4 | C only | No. These are beginner geography. |
| `control` (dynamics and articulation on scales) | 12 | Keep keyed as the scale's articulation/dynamics axis, not a separate dot. |

**Conclusion for piano (a):** every classical and Harris technique family is already transposed into 12 keys. To appear
on the key page they need:
- the mode fix (§4.1);
- the root/tonic rule (§4.2);
- a manifest that names each level's row (§4.4).

### 1.4 Piano levels deliberately not in 12 keys

- `k-first-1…4`: C only.
- `advanced-2`: C only, with `advanced-7` carrying the other 11, so all 12 are covered together.
- `k-classic-1…9`: pieces.

There are no other subsets on piano.

### 1.5 Piano gaps against standard curricula

#### Classical (ABRSM and RCM technical work)

| Item | Status | Where / what is missing |
|---|---|---|
| Major scales, hands separately and together, 1–4 octaves | present | `scales-1, 2, 3, 10, 14, 16` |
| Harmonic, melodic and natural minor, hands separately and together | present | `scales-5, 6, 15, 17, 18`, minor items in `10, 14, 16, 33` |
| Contrary motion, major and minor | present | `scales-4, 13, 16, 18` |
| Chromatic: hands separately, together, contrary; a minor 3rd and a major 6th apart | present | `scales-7, 14`, `control-15` |
| Scales a 3rd, 6th or 10th apart | partly | Major `scales-8`, harmonic minor `scales-13`. **Melodic minor apart is missing** (check whether a current syllabus asks for it). |
| Formula pattern | partly | Major `scales-9`. **Minor formula pattern is missing** (check: older ABRSM had it at higher grades). |
| Staccato scales | present | `control-1, 9`; staccato octaves `advanced-3` |
| Scales in octaves | partly | Major and chromatic `advanced-1, 3`. **Minor scales in octaves are missing.** |
| Legato double 3rds and 6ths in one hand | partly | `advanced-4` (major, each hand; harmonic minor RH only) and `advanced-8` (minor 6ths RH). **Missing: minor LH, and chromatic double minor 3rds** (check: diploma level). |
| Whole-tone scale | partly | Only as a jazz chord scale, RH (`jazz-5`). Missing: hands together, LH (check whether the current ABRSM syllabus includes it at a grade). |
| Major pentatonic (and blues) | present | `scales-28, 29` |
| Triad arpeggios, root position and inversions, major and minor, hands separately and together, 2–4 octaves | present | `arpeggios-1, 2, 3, 6, 9, 12` (minor goes to 3 octaves; a minor 4-octave arpeggio is a small gap) |
| Dominant 7th arpeggio, root position and inversions | present | `arpeggios-4, 10` (2 octaves). 4 octaves is missing (check: RCM upper grades). |
| Diminished 7th arpeggio, from every note | present | `arpeggios-5, 11` (2 octaves) |
| Contrary-motion arpeggios | partly | Major triads only (`arpeggios-6`). **Minor, dominant 7th and diminished 7th in contrary motion are missing** (check per syllabus). |
| Broken chords, through the inversions | present | `arpeggios-8, 14` |
| Solid (blocked) chords | present | `arpeggios-13, 14` |
| Four-note broken chords (the RCM pattern) | check | `broken` covers triads. Whether a four-note form exists was not confirmed. |
| Cadences, including N6, augmented 6th, plagal, deceptive, Picardy | present | `cadences-1…7` |
| Hanon | partly | No. 1, six Hanon-style patterns, Part II 39–43 (`fingers-2, 6, 7, 14`). **Hanon Part I 2–20 individually is missing.** It is public domain and verifiable. |
| Czerny- and Pischna-type patterns | present (in style) | `fingers-13` (velocity), `fingers-3, 10` (held notes). No actual Czerny studies. |
| Trills, measured trills, ornaments | present | `fingers-4, 9, 11` |
| Repeated notes and chords, rotation, broken octaves | present | `fingers-5, 12, 14` |
| Legato and finger independence | present | `fingers-3, 10`, `k-indep-1…8` |
| Thumb under | present | `fingers-8`, `k-first-3` |
| Dynamics control, voicing, balance | present | `control-3…8, 13, 14, 16`, `k-indep-7` |
| Pedalling (direct, legato, syncopated, half) | present | `control-10`, `k-pedal-1…3` |
| Leaps, hand crossing, polyrhythm | present | `advanced-2, 5, 6, 7, 8`, `k-rhythm` |
| Rhythm variants on scales (dotted, groups) | present | `scales-11` |

#### Jazz piano

| Item | Status | Where |
|---|---|---|
| Major 6th-diminished scale (Harris) | present | `harris-1`, `scales-30`, `k-sharm-1/2` (option 9) |
| Minor 6th-diminished scale | present | `harris-25`, `scales-31` (mode bug in `harris-25`) |
| Dominant 7th-diminished and 7♭5-diminished scales | present | `harris-26` |
| The scale of chords (6/dim block chords, drop 2, drop 3, drop 2&4) | present | `harris-9, 10`, `k-sixdim-1`, `k-sharm-13…18, 35` |
| Borrowing (one, two and three voices; from the chord above; walking) | present | `k-sharm-19…25, 38`, `k-sixdim-2, 11` |
| The family of chords: brothers, the four minor 6ths, eight expressions | present | `harris-8, 13, 16`, `k-sharm-26…32, 39, 42`, `k-sixdim-13` |
| Rules of the half step | present | `harris-14`, `k-harrisline-3, 7, 12, 16, 33` |
| The scale from chord tones (dominant scale down from each chord tone) | present | `harris-2, 11` |
| Pivot arpeggios | present | `harris-5, 19…24` |
| Barry's chromatic scale (one and two voices) | present | `k-harrisline-6, 11, 15, 19, 34` |
| Seven down to the 3rd | present | `k-harrisline-21` |
| 3 to 9 | present | `harris-4` |
| 3 to ♭9 | **check** | Shown in `k-vocab-8` (`v-3b9`), but its claim `bh-3-to-b9` is not switched on (see §0). |
| Harris moves (first movement, next move, major–minor–minor/6), the elevator, the sixth on the fifth | present | `k-sharm-33, 36, 37, 40, 41` |
| Bebop scales | partly | Bebop dominant `scales-12` (RH), bebop dorian `jazz-5` (RH); the "bebop major" is the 6th-diminished scale. **Missing: LH and hands together.** |
| Enclosures | present | `k-vocab-4…7`, `harris-6`, `harris-24` |
| Chromatic approach notes | present | `k-vocab-2, 3` |
| ii–V–I in all keys, rootless A/B (major and minor) | present | `voicings-4, 13`, `k-ear-11` |
| Shell voicings | present | `voicings-3`, `k-lh-3…9` |
| Drop 2 and drop 3 | present | `voicings-9, 15`, `k-vl-6`, `k-sharm-15…18` |
| Guide-tone lines | present | `jazz-1, 7`, `k-vl-3` |
| Triad pairs | present | `k-tpair-1…16`, `k-theory-4, 6` |
| Block chords (Shearing, locked hands) | present | `jazz-8` |
| Quartal and So What voicings | present | `voicings-7, 8`, `k-reharm-10` |
| Blues scale | present | `scales-29`, `jazz-3` |
| Turnarounds (I–VI–ii–V, tritone, Ladybird) | present | `k-keys-1, 2`, `jazz-10` |
| Comping rhythms (Charleston, reverse, anticipations, Red Garland) | present | `voicings-11, 14`, `k-comp` |
| Upper-structure triads | present | `jazz-4`, `k-theory-2` |
| Tritone substitution | present | `voicings-10` |
| Digital patterns (1-2-3-5) | present | `jazz-2` |
| Chord scales (dorian, lydian dominant, altered, whole-tone, both diminished, melodic minor) | present | `jazz-5` (one level, RH only, 2 octaves) |
| Modes, hands separately and together | present | `scales-19…27, 32` |
| Pentatonic superimposition | present | `k-theory-1`, `k-ctx-9` |
| Coltrane changes | present | `jazz-9`, `voicings-12`, `k-bebop-10` |
| Stride and walking LH | present | `accomp`, `k-lh` |
| Kenny Barron (minor 11, two-hand 5ths) voicing | **missing (check)** | Standard in jazz-piano texts. Verify against a source before adding. |
| The full melodic-minor mode set (locrian ♮2, lydian augmented as scales) | partly | `jazz-5` has melodic minor, lydian dominant and altered. `k-reharm-22` has maj7♯5 as a chord only. |

---

## 2. Guitar

### 2.1 Technique families

| Family | Levels | Transposes | Keys today | Per-key as is? | Class | Notes |
|---|---|---|---|---|---|---|
| `g-scales` | 15 | Y | 1–2: 12m; 3–15: 12M | Mode bug: 11, 13, 15 (minor scales tagged major). Modes (7, 14, 15) are Root | **KEYED (core)** | Pentatonic boxes, CAGED, 3 notes per string, Segovia scales, interval sequences, modes. |
| `g-arps` | 7 | Y | 1–3: 12M; 4–7: 12 | OK (minor triads are tagged). 4–7 are Root | **KEYED (core)** | Triads, CAGED triads, inversions on string sets, 7ths, CAGED 7ths, dim7 and altered, 9ths and 13ths, upper structures. |
| `g-harm` | 13 | Y | 12M | Mode bug: every aeolian, harmonic-minor and Cm6 option | **KEYED (core for Harris)** | The neck equivalent of `k-sharm`. |
| `g-chords` | 7 | Y (4–7); N (1–3) | 1–3: C only (open chords); 4–7: 12 | Fixed (1–3) | 1–3: NOT-TECH (open-chord vocabulary). 4–7: **KEYED-2** | Power, barre and CAGED chords. |
| `g-vl` | 3 | Y | 12 | OK | **KEYED** | Triads on string sets, drop 2 and drop 3 by step. |
| `g-jazz` | 13 | Y | 12 | 8 and 13 are Tune. Mode bug: 9 | 1–7, 9, 11, 12: **KEYED (jazz)**. 8, 10, 13: NOT-TECH | Shells, drop 2 on three string sets, drop 3, guide tones, the harmonised scale. |
| `g-harris` | 13 | Y | 1–10: 12; 11–13: 12M | **Root vs tonic clash**: `g-harris-3` at key C plays **G7** while piano `harris-2` plays C7. Mode bug: 1, 2, 6, 7, 11 | **KEYED (jazz)** | 6-dim scales, scale of chords on every string set, the rules, pivots, brothers. |
| `g-harrisline`, `g-hlfast` | 8, 4 | Y | 12 | Root. Mode bug in the minor-rule options | **KEYED (jazz)** | `g-harrisline-2` (tune outlines) is NOT-TECH. |
| `g-tpair` | 7 | Y | 12 | Root | **KEYED (jazz, T5+)** | |
| `g-bebop` | 12 | Y | 12 | Tonic (ii–V–I). Mode bug: 5, 7, 10 | 2–7, 10, 11: **KEYED (jazz)**. 1, 12 (time): NEUTRAL. 8, 9 (forms): NOT-TECH | |
| `g-theory` | 7 | Y | 12 | Root. Mode bug: 1, 2, 6, 7 | **KEYED-2** | Rootless voicings on strings 5–2 and 4–1, quartal, upper structures, triad pairs. `g-theory-3` (Giant Steps) is NOT-TECH. |
| `g-color` | 16 | Y | 1–12: 12; 13–16: open-string keys (E A D; A D G; E A D G; D G) | Fixed (13–16) | **KEYED-2** (colour) | |
| `g-keys` | 12 | Y | 12 | Two keys per item | **KEYED-2** | Key changes on the neck. |
| `g-picking` | 10 | Y (fret) | 12, with 10 at 12M | The key picks a fret or box; minor box items are tagged major | **NEUTRAL** (mechanics). 3 and 10 are **KEYED** (3-notes-per-string scales and hybrid riffs in the key) | Alternate picking, crossing, skipping, tremolo, sweep, hybrid, fusion. |
| `g-legato` | 8 | Y (fret) | 12 | As for picking | **NEUTRAL**. 4, 5, 7 are **KEYED-2** (pentatonic and 3-notes-per-string legato in the key's shape) | Hammer-ons, pull-offs, trills, tapping. |
| `g-lead` | 11 | Y (fret) | 12, with 11 at 12M | The "Cm box 1" items are minor but tagged major | **NEUTRAL** with a keyed carrier; **KEYED-2** on the **minor** page | Bends, vibrato, slides, double stops, Wes octaves. |
| `g-speed` | 5 | Y | 12 | OK | **KEYED-2** (speed axis of picking and legato) | |
| `g-fretting` | 6 | Y (fret) | 1–5: 12; 6: C, B, A | The key picks a fret | **NEUTRAL** | Spider, permutations, stretches. |
| `g-fusion`, `g-prog` | 5, 8 | Y | 12 | OK | **KEYED-2** (add-on) | |
| `g-rhythm` | 11 | Y | 12; 10: E A D G | Fixed (10) | **NEUTRAL** (strumming feel); 6 and 11 are KEYED-2 | |
| `g-meter` | 6 | Y | 12 | OK | **NEUTRAL** | |
| `g-fingerstyle` | 6 | Y | Open-chord keys (C G A; C G A E D; C A E; C G D A E; A E C); 5 is 12 | Fixed | **NEUTRAL**. 5 (rest and free strokes, ligados) is KEYED-2 | Patterns over open chords. |
| `g-flamenco` | 5 | Y | E, A (and B) | Fixed | NEUTRAL (open-string Phrygian; capo elsewhere) | |
| `g-first` | 8 | N | C only | Fixed | NEUTRAL (beginner) | |
| `g-reading` | 8 | Y | 12; 1 is C | OK | NOT-TECH | |
| `g-riff` | 5 | Y | 12 | OK | NOT-TECH (repertoire-style) | |
| `g-ear`, `g-impro`, `g-phrase`, `g-cmel`, `g-cmarr`, `g-tune`, `g-ctx`, `g-solo`, `g-gig`, `g-jblues`, `g-solojazz`, `g-ctone` | — | Y | 12 | OK or Tune | NOT-TECH (`g-ctone` is KEYED-2) | |

### 2.2 Guitar: NEUTRAL items that could be keyed

- **Picking, legato and lead mechanics.**
  - Today the key only moves the box (`g-lead-2` "Half-step bends · Cm box 1").
  - They become keyed simply by filing them on the key's **minor** page (the minor pentatonic box) or the relative
    minor's.
  - This takes no content change, only the mode tag.
- **Spider and permutations** (`g-fretting`). Keep them NEUTRAL. The standard next step, permutations inside the key's
  3-notes-per-string shapes, is already `g-picking-3` and `g-speed-1`.
- **`g-fingerstyle` patterns** are tied to open chords on purpose (keys12.ts comment). Keep them fixed.

### 2.4 Guitar levels deliberately not in 12 keys

- `g-first-1…8`;
- `g-chords-1…3`;
- `g-reading-1`;
- `g-fretting-6`;
- `g-rhythm-10`;
- `g-color-13…16`;
- `g-fingerstyle-1…4, 6`;
- `g-flamenco-1…5`.

### 2.5 Guitar gaps

| Item | Status | Where / what is missing |
|---|---|---|
| CAGED major scale, five positions, and connecting them | present | `g-scales-4, 5, 8` |
| 3 notes per string, seven patterns and across the neck | present | `g-scales-6, 9`, `g-picking-3`, `g-speed-1` |
| Pentatonic boxes 1–5, blues, major pentatonic | present | `g-scales-1, 2, 3` |
| Minor scales (natural, harmonic, melodic) in **all five positions** | partly | `g-scales-13, 15` give one position each, and `g-scales-11` is Segovia melodic minor. **Five-position minor shapes are missing.** |
| Modes in position | present | `g-scales-7, 14, 15` |
| Arpeggio shapes (triads and 7ths, root on 6 and 5, CAGED) | present | `g-arps-1, 2, 4, 6` |
| dim7, altered and extended arpeggios | present | `g-arps-5, 7` |
| Triads on string sets with inversions | present | `g-arps-3`, `g-vl-1`, `g-chords-6` |
| Drop 2 and drop 3 voicings | present | `g-jazz-2, 3, 4`, `g-vl-2, 3`, `g-harm-7, 8, 9` |
| Shell voicings and rootless voicings | present | `g-jazz-1`, `g-theory-1` |
| Quartal voicings | present | `g-theory-2` |
| Sweep picking (3 and 5 strings, 7th chords) | present | `g-picking-6, 8`, `g-speed-3` |
| Legato (hammer-ons, pull-offs, trills, 3 notes per string, shifts, tapping) | present | `g-legato-1…8` |
| Alternate and economy picking | present | `g-picking-1, 3` |
| Hybrid and chicken picking, tremolo, string skipping | present | `g-picking-4, 5, 7, 10` |
| Vibrato and bends (½, 1, 1½ steps, pre-bend, unison, oblique) | present | `g-lead-2…5, 7, 8, 10` |
| Interval studies (3rds, 4ths, 6ths) and sequences | present | `g-scales-7, 10, 12` |
| Double stops and octaves | present | `g-lead-6, 11` |
| Scale harmonisation along the neck | present | `g-harm-1…13` |
| Harris on guitar (6-dim scales, scale of chords, rules, pivots, brothers, lines) | present | `g-harris`, `g-harrisline`, `g-hlfast` |
| Bebop vocabulary (approach notes, enclosures) | present | `g-bebop-2…5` |
| Fretting-hand muting as its own drill | partly | Ghosts in `g-rhythm-5` and palm mute in `g-chords-4`. No dedicated left-hand muting level (check whether it is needed). |
| Classical: Segovia scales, rest and free stroke, Giuliani patterns, tremolo | present (fixed keys) | `g-scales-11`, `g-fingerstyle-3, 5, 6` |

---

## 3. Bass

### 3.1 Technique families

| Family | Levels | Transposes | Keys today | Per-key as is? | Class | Notes |
|---|---|---|---|---|---|---|
| `b-scale` | 11 | Y | 1, 5, 10, 11: 12; the rest 12M | Mode bug: 1, 3, 7, 11 (minor pentatonic and minor scales tagged major); 10 is OK | **KEYED (core)** | Pentatonic, major, minor, blues, modes, sequences, symmetric scales, 3 notes per string (6-string). |
| `b-chord` | 14 | Y | 12 or 12M | OK (`b-chord-4` minor triads tagged). Root in 6, 11–13 | **KEYED (core)** | Roots, root–5th, triads, inversions, 7ths, 2 octaves, 9ths, altered. |
| `b-fret` | 8 | Y (fret) | 12, with 5 and 7 at 12M; 6 is F, G, A♭, A | 6 Fixed | 1–4, 6, 8: **NEUTRAL**. 5 (2-octave scales) and 7 (octaves and 10ths): **KEYED** | |
| `b-walk` | 21 | Y | 12 or 12M | 11, 13, 14, 18 are Tune | 1–10, 12, 15–17, 19–21: **KEYED (jazz core)**. 11, 13, 14, 18: NOT-TECH | Two-feel, root–5th, arpeggio walk, chromatic, dominant and scale-step approaches, ii–V–I cycle. |
| `b-barry` | 8 | Y | 12 | Mode bug: 1 (option 1 minor 6-dim) | **KEYED (jazz)** | |
| `b-harrisline` | 8 | Y | 12 | Root. Mode bug: 4, 6 | **KEYED (jazz)** | 2 (outlines) is NOT-TECH. |
| `b-bebop` | 7 | Y | 12M | Mode bug: 2, 4, 7 | 1–4, 7: **KEYED (jazz)**. 5, 6 (forms): NOT-TECH | |
| `b-tpair` | 5 | Y | 12 | Root | **KEYED-2** | |
| `b-counter` | 10 | Y | 12 | OK | **KEYED-2** (harmony) | |
| `b-swing` | 7 | Y | 12 | OK | **NEUTRAL** (time feel) | |
| `b-pocket`, `b-ghost`, `b-time`, `b-length` | 8, 6, 13, 7 | Y | 12 | OK | **NEUTRAL** | Groove, ghosts, subdivision, muting. The key is a carrier. |
| `b-pluck`, `b-pick` | 12, 10 | Y (fret); 1–3 N | 1–3: E (open strings); the rest 12 | Fixed (1–3) | **NEUTRAL** | |
| `b-slap` | 8 | Y | 1: E (open); 2: 12M; the rest 12 | Fixed (1) | **NEUTRAL**. 2 (octave slap) could be KEYED-2 | |
| `b-legato`, `b-ext` | 7, 9 | Y; harmonics N | 12; `b-legato-5`, `b-ext-1/2` on E | Fixed (harmonics) | **NEUTRAL**. `b-ext-4…6, 9` (tapping, double stops, shells) are KEYED-2 | |
| `b-styles`, `b-riff`, `b-feel`, `b-latin`, `b-odd`, `b-prog`, `b-poly` | — | Y | 12 | OK | NOT-TECH (style) or NEUTRAL (meter) | |
| `b-read`, `b-posread` | 13, 6 | Y | 12; `b-read-2` E | OK | NOT-TECH | |
| `b-ear`, `b-impro`, `b-phrase`, `b-tune`, `b-ctx`, `b-solo`, `b-gig`, `b-std`, `b-jform`, `b-keys` | — | Y | 12 | OK or Tune | NOT-TECH (`b-keys` is KEYED-2) | |
| `b-first` | 8 | N mostly | C | Fixed | NEUTRAL (beginner) | |
| Upright: `b-up-scales` | 10 | Y | 1, 2: G D A F; 3: the other 8 (12 together); 4–8: 12; 9: E; 10: F, F♯, G | Fixed (9, 10, by range) | **KEYED (core, upright)** | |
| Upright: `b-up-arco`, `b-up-pizz`, `b-up-walk`, `b-up-read`, `b-up-pos` | 9, 4, 9, 6, 6 | Y; positions N | 12; positions C; open-string bowing on E | Fixed for positions | NEUTRAL (arco, pizz, positions); `b-up-walk` KEYED (jazz) | |
| `g-bass` (retired) | 6 | — | — | — | Hidden | Keep out. |

### 3.2 Bass: NEUTRAL items that could be keyed

- **Ghosts, pocket and length.** No value in keying them; keep NEUTRAL.
- **`b-fret-1/2` (spider).** NEUTRAL. The keyed version is the 2-octave scale, `b-fret-5`.
- **`b-slap-2` (octaves) and `b-ext-6, 9` (10ths and shells).** Could file on the key page as KEYED-2, since they
  outline the key's chords.

### 3.4 Bass levels deliberately not in 12 keys

- `b-first-1…4, 7, 8`;
- `b-pluck-1…3`;
- `b-slap-1`;
- `b-legato-5`;
- `b-ext-1, 2`;
- `b-read-2`;
- `b-ear-5`;
- `b-fret-6`;
- `b-up-pos-1…6`;
- `b-up-arco-1, 5`;
- `b-up-scales-9, 10`;
- `b-up-walk-6`.

### 3.5 Bass gaps

| Item | Status | Where / what is missing |
|---|---|---|
| Scales across positions (major, minor, modes, pentatonic positions) | present | `b-scale-1…11`, `b-fret-5`, `b-posread`, `b-up-scales` |
| Arpeggios across positions (triads, inversions, 7ths, 2 octaves, 9ths, altered) | present | `b-chord-4…7, 11…13` |
| Walking lines | present | `b-walk-1…21`, `b-up-walk`, `b-swing` |
| Root–5th, root–5th–octave | present | `b-chord-2, 3`, `b-walk-1, 2` |
| Chromatic, dominant and scale-step approaches | present | `b-walk-4, 5, 6` |
| Slap and pop (thumb, octaves, ghosts, hammer, double thumbing, triplets) | present | `b-slap-1…8` |
| Muting and note length | present | `b-length-1…7` |
| Pocket and time | present | `b-pocket-1…8`, `b-time`, `b-swing` |
| Ghost notes | present | `b-ghost-1…6` |
| Harris on bass | present | `b-barry`, `b-harrisline` |
| Diatonic 7th chords through the key (scale harmonisation) | **missing** | Piano has `k-sharm-11` (`hl-7a`) and guitar has `g-harm-6`. The bass has only `b-chord-8` (chord tones through a progression). The `hl-7a` generator could be reused. |
| Two-octave minor scales and arpeggios | partly | `b-fret-5` and `b-chord-7, 11` are major or root-based; the minor forms are only in the upright `b-up-scales-4…5` (check the electric bass's minor coverage). |
| Scales in intervals (3rds, 4ths) | present | `b-scale-6`, `b-up-scales-7, 8` |

---

## 4. Recommendation

### 4.1 P1: fix the mode tag (size M, engine only, no new content)

- **The problem.** `drillMinorOf(d)` returns false for minor material encoded through `option` or `scale`.
- **The fix.** Add a pure `modeOf(spec)` table keyed by kind and option. It should set `tonic: { key, minor: true }`, or
  the existing `spec.minor`, for:
  - harmonic, melodic and natural minor and aeolian options (`hl-*`, `g-harm`, `g-scales` mode, `b-scale` scale);
  - minor 6th-diminished options (`h1-linear` option 1, `h10-minor6dim`, `sixdim-scale` options 2–3, `b-barry`
    option 1, `hl-rules` minor options, `hl-chrom` minor option);
  - minor ii–V–i options (`bb-minor`, `rh-minor`, `v-lead` minor, `vl-*` minor, `rootless` minor);
  - "vii°7 of X minor" (`arp-dim7`, as the level's `'minor'` keys intend);
  - "Cm box" pentatonic mechanics on guitar.
- **Guard test.** No drill whose title says "minor", "m6" or "Cm" (or shows a minor key label) may be tagged major.
  Root-based chord-colour items get an explicit `root` role, so the test can tell them apart (§4.2).
- **Item ids do not change**: the tag lives in `tonic`, not in the id. Saved progress is safe.

### 4.2 P1: one rule for what a key page holds (size S–M)

- **Add a key role per kind:** `tonic` (default), `root`, or `dominant-root`.
- **Proposed rule** (owner to confirm; this is a product question):
  - **The C major page** holds what is "in C":
    - scales, arpeggios, broken chords, cadences, Hanon, control;
    - the V7 of C (G7) and vii°7 (already so in `arpeggios-4/5`);
    - ii–V–I in C;
    - the C 6th-diminished material;
    - the dominant-family material **of G7**.
  - **The C minor page** holds:
    - harmonic, melodic and natural minor;
    - C minor arpeggios and cadences;
    - B°7;
    - the Cm6-diminished material;
    - minor ii–V–i in C;
    - the minor pentatonic box on guitar.
  - **Chord-colour items built on a root**: modes as scales from the root (C dorian), chord scales (C altered), triad
    pairs over C7, the brothers of C7. They go on the page of their root, in a separate row headed by the chord name
    ("on C: dorian, altered, C7 brothers"). That is how jazz practice "in 12 keys" is normally done.
  - **The alternative** is to file C7 material under F (its I) and C dorian under B♭ (relative). It is more
    "functional", but it fragments the Harris families. Ask the owner.
- **Make one Harris clash consistent either way**: piano `harris-2` (key = chord root, C7) vs guitar `g-harris-3` (key
  = tonic, G7 at key C).

### 4.3 How the Harris material fits each key page

This uses the C page as the example; every key is the same transposed.

| Row on the key page | Major page (C) | Minor page (Cm) |
|---|---|---|
| **The tonic's 6th-diminished** | C6-dim scale (`harris-1`, `scales-30`); scale of chords C6/B°7, close, drop 2 and 3 (`harris-9`, `k-sixdim-1`, `k-sharm-13…18`); borrowing (`k-sharm-19…25`); the elevator (`k-sharm-33`); pivots on Cmaj7 and C6 (`harris-19/20`) | Cm6-dim scale (`harris-25`, `scales-31`); Cm6/B°7 blocks (`harris-10`, `k-sixdim-6`); minor borrowing (`k-sharm-20…`); the minor elevator (`k-sharm-40`) |
| **The dominant (G7)** | 7th-dim scale of G7 (`harris-26` @G); dominant scale from each chord tone (`harris-2/11` @G); the dominant rule (`k-harrisline-3` @G); brothers of G7 (`harris-8` @G); eight expressions G7 → C6 (`k-sharm-26…29` @C, already tonic) | G7♭9 = A♭°7 (`harris-18`, `k-sharm-32`); the important minor (Dm6 over G) |
| **ii–V–I lines** | Harris ii–V–I by the rules (`harris-15`); pivot through ii–V–I (`harris-22`); seven down to the 3rd (`k-harrisline-21`); bebop lines (`k-bebop-1`) | minor ii–V–i options of the same items |
| **Chromatic and rules** | Barry's chromatic scale, major (`k-harrisline-6`); the major rule (`k-harrisline-7/12`) | minor 6th-diminished chromatic (`k-harrisline-15`); the minor rule (`k-harrisline-16`) |

Guitar uses the same rows, from `g-harris`, `g-harm`, `g-harrisline` and `g-hlfast`. Bass uses `b-barry` and
`b-harrisline`.

### 4.4 P1: a key-page manifest and a coverage test (size S)

- **One table per instrument**, listing every KEYED and KEYED-2 level with:
  - its row (Scale, Arpeggio, Broken chords and cadence, Pattern (Hanon), Control, Harris I / V / lines, Voicings,
    Lines (bebop and enclosures), Colour);
  - its tier (SPEC-COACH-2 §1).
- **A test** that fails if any family or level is neither in the manifest nor explicitly marked NEUTRAL or NOT-TECH.
  This is what makes (a) true and keeps it true when new families arrive.
- **The page reuses** `gateLevel` / `itemIdVerified`, so hidden Harris items stay out.
- **`skillDrillsInKey`** (plan.ts:386) already gives one family's drills in a key. The key page needs a selector over
  families: `keyPage(instrument, key, minor, tier) → rows`.

### 4.5 Core items per key page by tier (piano; these are the dots on the key card)

| Tier | Core (classical spine) | Jazz focus adds |
|---|---|---|
| T0–T1 | Five-finger position (`fingers-1`); scale, 1 octave, hands separately (`scales-1` / `scales-17`); triad arpeggio, hands separately (`arpeggios-1` / `arpeggios-9`); blocked triads (`arpeggios-13`); I–IV–V–I (`cadences-1/3`) | Major pentatonic (`scales-28`) |
| T2–T3 | Scale, 2 octaves, hands together and contrary (`scales-3/4`, minor `5/18`); arpeggio, hands together (`arpeggios-3`) and inversions (`2/9`); I–IV–I⁶₄–V7–I (`cadences-2/3`); Hanon No. 1 (`fingers-2`); legato vs staccato (`control-1/9`); V7 arpeggio (`arpeggios-4`) | Shells ii–V–I (`voicings-3`); guide tones (`jazz-1`); 6th-diminished scale (`harris-1`); blues scale (`scales-29`) |
| T4–T5 | A 3rd, 6th and 10th apart (`scales-8/13`); chromatic (`scales-7`); dim7 (`arpeggios-5`); V7 inversions (`arpeggios-10`); broken chords (`arpeggios-8/14`); Hanon in 16ths (`fingers-6`); dynamic shapes (`control-4/13`); formula (`scales-9`) | Rootless A/B (`voicings-4`); scale of chords (`harris-9`, `k-sixdim-1`); enclosures (`k-vocab-4…7`); dominant scale on V (`harris-2` @V); pivot (`harris-19`); bebop ii–V–I (`k-bebop-1`) |
| T6–T8 | 4 octaves in 16ths (`scales-10/33`); octaves (`advanced-1/3`); double 3rds and 6ths (`advanced-4/8`); dim7 from every note (`arpeggios-11`); 3–4 octave arpeggios (`arpeggios-6/12`) | Borrowing (`k-sharm-19…25`); eight expressions (`k-sharm-26…29`); the rules (`harris-14`); drop 2 (`k-vl-6`, `k-sharm-15`); triad pairs (`k-tpair-1…8`) |

- **Guitar spine:** pentatonic or CAGED scale → triad arpeggio and inversions on string sets → 7th arpeggios and CAGED
  7ths → 3-notes-per-string shapes → drop 2 / drop 3 ii–V–I.
  - Jazz focus adds: 6th-diminished scale and scale of chords (`g-harris-1/2/7`), enclosures (`g-bebop-3`), `g-harm`
    borrowing at the top.
- **Bass spine:** root–5th → triad → 7th arpeggio → scale in position and 2 octaves → walking with approaches →
  ii–V–I cycle.
  - Jazz focus adds: `b-barry-1…5`, `b-harrisline-4`.

### 4.6 Content to add, prioritised

| # | What | Instrument | Size | Notes |
|---|---|---|---|---|
| 1 | Resolve 3 to ♭9: switch the claim on, or also hide `item:v-3b9`, and fix the stale titles of `g-harrisline-6` and `b-harrisline-6` | all | XS | Project rule (only-verified-theory). |
| 2 | Hanon Part I Nos. 2–20 in all 12 keys, hands together | piano | M (19 patterns; public domain, verifiable) | The owner's Hanon-type item for the key mix (SPEC-COACH-2 §4.2). |
| 3 | Minor forms of the advanced items: octaves in minor; double 3rds minor LH; melodic minor a 3rd, 6th and 10th apart; minor formula (check) | piano | S (specs on existing generators) | |
| 4 | Contrary-motion minor, dom7 and dim7 arpeggios; dom7 and dim7 at 4 octaves (check against the ABRSM and RCM grade lists) | piano | S | |
| 5 | Bebop scales, LH and hands together; the full melodic-minor mode set as scales | piano | S | |
| 6 | Kenny Barron voicing (check first) | piano | S | |
| 7 | Minor scales (natural, harmonic, melodic) in five positions | guitar | M | Mirrors `g-scales-5` (CAGED). |
| 8 | Diatonic 7th arpeggios through the key, and two-octave minor scales and arpeggios | bass | S–M | Reuse `hl-7a` from `k-sharm` / `g-harm`. |
| 9 | Optional: chromatic double minor 3rds; whole-tone hands together (check syllabus) | piano | S | |

### 4.7 Suggested build order

1. §4.1 mode fix and §4.2 key role, with guard tests.
2. §4.4 manifest and coverage test.
3. The §6 By-key screen on top of `keyPage()`.
4. The content adds in §4.6.

Items 1 and 2 need no new music, but without them the minor toggle would be largely empty and partly wrong.

---

## Appendix: data notes

- The 12-key mechanism lives in `src/engine/drills/keys12.ts` (`TWELVE_KEY_FAMILIES`, `FIXED_KEY_LEVELS`,
  `CONTINUES_LEVELS`). The families not on that list either use `'major'` / `'minor'` (12 keys anyway) or are fixed on
  purpose.
- Levels whose items change their tonic by offset (tunes and charts) file correctly through `tonic`:
  - `voicings` 120 items;
  - `accomp` 84;
  - `g-jazz` 132;
  - `g-impro` 36;
  - `b-walk` 300;
  - `b-std` 336;
  - `b-impro` 36;
  - `b-latin` 12.
- Hidden content (verifiedContent.ts, not switched on):
  - the 5-4-3-2 phrases and lick, `hl-arps-down`, `hl-feel6`, `hl-compose`, the blues outline;
  - the Echols elevator and borrowing;
  - several Siskind LH and comping variants.
  - These are already absent from the dump and must stay absent from the key page.
- During this audit, `git status` showed `tests/practiceCoach.test.ts` as modified. This audit did not touch it; it was
  probably edited by another session.

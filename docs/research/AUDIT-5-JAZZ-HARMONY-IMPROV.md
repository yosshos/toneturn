# AUDIT-5: jazz harmony, reharmonization, improvisation and Barry Harris, checked against outside syllabi (2026-11-15)

Read-only audit. Unlike AUDIT-GAPS-2 and AUDIT-DEPTH-3, this audit does not start from the app's own lists. Step 1 builds a master checklist from published syllabi and books. Step 2 checks every item against the code.

**Inventory method.** A temporary vitest script dumped every piano, guitar and bass family and level, with its keys and item kinds, and all 183 topics with their levels. The script was deleted after the run. Grep sweeps covered `src/engine`, `src/engine/drills`, `src/content/mini`, `ruleCards.ts` and `improvRules.ts`.

**Note on concurrent work.** The working tree was changing while this audit ran. Solo piano (`soloPianoDrills.ts`: families `k-lh`, `k-tex`, `k-comp`, `k-impro`) and `practiceMethod.ts` were staged but not committed. They are counted here as present.

**Depth criteria** (from the brief):
- (a) It is a performed drill.
- (b) It runs through progressions, forms or tunes.
- (c) It is in all 12 keys.
- (d) It is on piano, guitar and bass (P/G/B).
- (e) It has an ear counterpart.
- (f) It has a basic → advanced ladder.
- (g) It is applied in tunes or improvisation.

**All 12 keys.** `keys12.ts` widens every jazz and harmony level to 12 keys (`all12`). Criterion (c) is therefore met almost everywhere. The exceptions are a few bass `keys=major` levels, which are also 12 keys, and the upright-bass levels, which are deliberately limited.

**Status labels:**
- **DEEP** = EXISTS-DEEP.
- **SHALLOW** = present, but fails two or more criteria that matter for the item.
- **MISSING** = not present.
- **APP-WRONG** = contradicts the sources.

---

## 1. The external master checklist (with sources)

Chapter lists were gathered by web search and fetch on 2026-11-15. Topics are listed at chapter level only.

| Code | Source | Chapters / topics used for the checklist | URL |
|---|---|---|---|
| LTB | Mark Levine, *The Jazz Theory Book* (Sher 1995) | intervals/triads; major scale & ii–V–I; chord/scale theory (major, melodic minor, diminished, whole-tone harmony); how to practise scales; slash chords; from scales to music; bebop scales; playing "outside"; pentatonics; the blues; rhythm changes; practice; basic reharm; advanced reharm; Coltrane changes; three reharmonizations; song form & composition; reading a lead sheet; memorizing a tune; heads; repertoire; salsa & Latin jazz | jazzbooks.com/mm5/samples/D-MLT.pdf |
| LJP | Mark Levine, *The Jazz Piano Book* (Sher 1989) | three-note voicings; sus and Phrygian chords; adding notes; tritone sub; left-hand voicings and their alterations; scale theory; putting scales to work; So What chords; fourth chords; upper structures; pentatonics; "voicings, voicings, voicings"; stride and Bud Powell voicings; four-note scales; block chords; salsa; comping | jazzbooks.com/mm5/samples/D-JP.pdf |
| BH | Berklee harmony sequence: PW-111; HR-112 (Harmony 2); HR-211 (Harmony 3); HR-212 (Harmony 4); Berklee Online Harmony 2 lessons | H2: secondary dominants and guide tones, related iis, extended dominants, deceptive resolutions, minor-key harmony, modal interchange, melody & approach notes, blues. H3: subdominant minor, modal interchange, chord-scale theory. H4: melodic construction, form, melody/harmony relations, pedal point and ostinato, modal harmony and composition, compound chords, constant structures | college.berklee.edu/harmony; online.berklee.edu/courses/harmony-2 |
| PEA | Ted Pease, *Jazz Composition* (Berklee Press) | no table of contents found; retail description: melody, harmony, rhythm writing, tune writing, extended forms | ejazzlines.com (product page) |
| LIG | Bert Ligon, *Jazz Theory Resources* 1–2; *Connecting Chords with Linear Harmony* | rhythm in jazz performance; triadic generalization; diatonic progressions & analysis; substitutions & turnarounds; common melodic outlines; voicings; modes; quartal harmony; triadic superimposition; pentatonic applications; colouring "outside" the lines; linear outlines with passing, neighbour, arpeggiated and chromatic embellishment | ejazzlines.com (vol 1); groove3.com (Linear Harmony) |
| BRG | Jerry Bergonzi, *Inside Improvisation* 1–7 | 1 Melodic Structures (digital patterns, cells); 2 Pentatonics; 3 Jazz Line (chromaticism, voice leading in lines); 4 Melodic Rhythms; 5 Thesaurus of Intervallic Melodies; 6 Developing a Jazz Language; 7 Hexatonics (triad pairs) | ejazzlines, ficksmusic, boosey (product pages) |
| GAL | Hal Galper, *Forward Motion* | rhythmic forward motion; scalar forward motion; arpeggio pickups and resolutions; pentatonic cells; melody guide tones; lining chord tones up with strong beats; playing in half-time; how to practise forward motion (displacement, sequential reordering, 12 keys) | halgalper.com articles; ejazzlines.com |
| AEB | Jamey Aebersold, *Jazz Handbook* (free PDF) | tips for learning a tune; memorizing scales and chords; scale syllabus; dominant-7th "tree of scale choices"; ten basic exercises; ear training; how to practise (Coker, Liebman); what creates interest when soloing; starting a phrase; articulation; the blues scale; blues progressions; bebop characteristics (Baker); bebop scales; ii–V7–I with the 7th resolving to the 3rd; piano voicings | jazzbooks.com/mm5/download/FQBK-handbook.pdf |
| WER | Kenny Werner, *Effortless Mastery* | four steps: (1) play a note relaxed, "the Space"; (2) free improvisation from that state; (3) structured material from that state; (4) reduce and repeat to mastery; meditations | en.wikipedia.org/wiki/Effortless_Mastery |
| BAK | David Baker, *How to Play Bebop* 1–3 | bebop scales and others in common use; bebop language, patterns and formulas; learning and using bebop tunes, contrafacts, blues | jazzbooks.com (BOP-SET) |
| OS | Open Studio (Peter Martin, Adam Maness) | Jazz Piano Foundations; Major Scale; Bebop Chords; Block Chords Made Easy; Hearing Great Harmony; Language of the Masters; Pentatonics technique; Magic Voicing System; Elements of Solo Piano (Keezer); Improv Games; Jazz Piano for the Bandstand; 5-Minute Ear Training; Bebop Enclosures; Pentatonics and Playing Out; Triad Pairs Training; Harmony Games | openstudiojazz.com/gps/ |
| MM | Mulgrew Miller | no course exists; secondary sources only: a solo analysis (jazzadvice) and a 2018 Illinois thesis on his comping (voicings, harmonic rhythm, interplay with the soloist) | ideals.illinois.edu/items/104436 |
| TER | Dariusz Terefenko, *Jazz Theory: From Basic to Advanced Study* (2nd ed.) | jazz rhythms; harmonic function; 4- and 5-part chords; ii–V–I; modes; chord–scale; blues; improvisation; voicing formations; keyboard and jazz-chorale textures; idiomatic progressions; bebop; bebop blues; Confirmation changes; rhythm changes; pentatonics/hexatonics/octatonics; Tristano style; analysing lead sheets; phrase models; song forms; reharm techniques; post-tonal jazz; set classes; twelve-tone; patterns appendix | routledge.com/products/9781138334243 |
| BHM | Barry Harris sources | as already mapped in docs/research/BARRY-HARRIS-METHOD.md: Rees, Kingstone, Echols, Parks, workshops | — |
| RHC | Reharm sources | as already mapped in docs/research/REHARM-AND-COLOR.md: Goldings, Open Studio, chromatic mediants | — |

---

## 2. Items, status and evidence

Columns a–g follow the criteria above: ✓ = yes, ~ = partly, ✗ = no, n/a = not relevant. The P/G/B column shows which instruments have it.

### 2.1 Chord–scale theory

| # | Item (sources) | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Major-mode chord scales (LTB 3, TER 7–8, AEB) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-5` jscale (generate.ts:2505 JAZZ_SCALES); topic `chord-scale` L1–3; `g-impro-5`; `b-scale`; rule "Stay in the scale" improvRules.ts:60 |
| 2 | Melodic-minor modes (LTB 3, LJP 9) | ✓ | ✓ | ✓ | PG(B) | ✓ | ✓ | ✓ | DEEP | `jazz-5`, `k-theory-3` tp-domcol, topic `mm-modes` L1–2, rule card `mm-alt` ruleCards.ts:647; text checked at jazz.ts:291 and theoryEar.ts:1252 |
| 3 | Diminished and whole-tone harmony (LTB 3) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | generate.ts:2511–2512 (half-whole / whole-half); `harris-26`; theoryEar.ts:1257–1259 (13♭9 → half-whole, correct spelling) |
| 4 | Bebop scales (LTB 7, BAK 1, AEB) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-5`, `k-phrase-4`, `harris-24`, `b-impro-8`, rule `bebop-scale` ruleCards.ts:609, topic `chromatic-added` |
| 5 | Avoid notes / available tensions on strong beats (BH 3, TER 8) | ~ | ~ | ✓ | P | ✓ | ✗ | ~ | SHALLOW | Topic `melody-fit` L1 ("chord tone, tension or clash"); `checkMelody` in reharm.ts. No performed drill grades an avoid note held on a strong beat (for example 4 over maj7, ♭9 over m7). |
| 6 | Dominant "tree of scale choices" (AEB) | ✓ | ✓ | ✓ | P(G) | ✓ | ✓ | ✓ | DEEP | `k-theory-3` (natural, lydian dominant, altered); topic `triad-pairs` L3; `polychords` L4 |
| 7 | Slash chords / polychords (LTB 5, BH 4 compound chords) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-4`, `k-theory-2`, `k-reharm-8`, `g-theory-4`, `b-impro-18`; topic `polychords` L1–5 |
| 8 | How to practise scales: 3rds, 4-note groups, range (LTB 4, AEB ten exercises) | ✓ | ✓ | ✓ | PGB | n/a | ✓ | ✓ | DEEP | `k-harrisline-2` hl-abc, `jazz-2`, `harris-1/25/26`, scaleMatrix.ts |

### 2.2 Voicing systems

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 9 | Shells / three-note / Bud Powell (LJP 3, 17) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-3/6`, `k-tune-3`, `g-jazz-1`, `k-lh` lh-bp3/lh-bpalt (soloPianoDrills.ts:1014–1020) |
| 10 | Rootless A/B (LJP 7–8) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-4/13`, `k-tune-4`, `g-theory-1`; topic `upper-rootless` L1–2. Spellings checked against Levine: generate.ts:1996–2043 (A = 3-5-7-9, B = 7-9-3-5; minor ø7 / 7♭9 / m6/9 correct) |
| 11 | Quartal / fourth chords, McCoy fourths (LJP 13, LIG 2) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-8` (generate.ts:2228), `g-theory-2`; topic `voicing-type` L4 |
| 12 | So What chords (LJP 12) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-7` (generate.ts:2104; the tune's E-A-D-G-B shape over D dorian, up a half step), `k-reharm-10`, `k-tex` tx-sowhat, `voicings-16` std:so-what |
| 13 | Upper-structure triads (LJP 14) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-4`, `k-theory-2`, `k-reharm-8`, `g-theory-4`, `b-impro-18`; topic `upper-rootless` L3–4 |
| 14a | Drop 2 / drop 3 (TER 11) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-9/15`, `k-vl-6`, `k-harm-4..7`, `k-tune-5`, `g-jazz-2/3/4`, `g-vl-2/3`; topic `voicing-type` L1–2 |
| 14b | Drop 2&4 | ✓ | ✗ | ✓ | PG | ✗ | ~ | ✗ | SHALLOW | Only on the four key scales: harmLadder.ts:88, 495, 688, 716. Never on a ii–V, a tune or by ear. |
| 15 | Four-way close (LJP 19, TER 12) | ✓ | ✓ | ✓ | P | ✓ | ✓ | ✓ | DEEP | `k-vl-4`, `k-harm-3` (melody on top through a head), topic `voicing-type` |
| 16 | Spread voicings (LJP 16, BHM) | ✓ | ✓ | ✓ | P | ~ | ✓ | ✓ | DEEP | `k-sixdim-4`, `k-vl-7`, `k-reharm-3`, `k-ctx-13` |
| 17 | Block chords / locked hands (Shearing, Buckner, Garland) (LJP 19, OS "Block Chords Made Easy") | ~ | ~ | ✓ | P | ✗ | ✗ | ~ | SHALLOW | `jazz-8` is the 6-dim scale only (generate.ts:3024–3036, 6053). chartDrills.ts:224 plays one block chord per change. `k-harm-3` is close position without the octave-doubled melody. No locked hands under a real melody, no Garland 5ths+4-way, no guitar or ear counterpart. |
| 18 | Clusters / seconds voicings (LJP 16 "voicings, voicings") | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | The only "cluster" hits are an ear-reset noise (path.ts:1020) and a set-class lesson (theoryEar.ts:544). |
| 19 | Kenny Barron voicings (m11 in 5ths, two hands) (LTB 16 "Kenny Barron's Spring Is Here") | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | One mention in a lesson only (soloPiano.ts:123). AUDIT-GAPS-2 #29 is still open. |
| 20 | Sus and sus♭9 ("Phrygian") chords (LJP 4) | ~ | ~ | ✓ | PG | ~ | ✗ | ✗ | SHALLOW | Sus reharm of ii–V only: `k-reharm-16`, `g-color-12`, topic `modern-color`. sus♭9 appears only as a Harris borrowing (harmLadder.ts:730, 806). No sus♭9 voicing drill and no ear level for it. |
| 21 | Two-handed open / ballad voicings | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-9/16`, `k-reharm-3`, `k-ctx-13`, `g-ctx-11` |
| 22 | Stride, walking 10ths, solo LH (LJP 17, OS Keezer) | ✓ | ✓ | ✓ | P | n/a | ✓ | ✓ | DEEP | `accomp-3/4/11–18`, `k-lh` 18 levels (760–1620), `k-tex` 21 levels (1000–1900) |
| 23 | Harris 6th-dim chords (BHM) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `harris-9/10`, `k-sixdim-1..13`, `g-harris-2/7`, `k-sharm`; topics `bh-block`, `bh-convert`, `bh-borrow`, `key-sixdim` |
| 24 | Voicings recognised by ear | n/a | ✓ | ✓ | — | ✓ | ✓ | n/a | DEEP | Topic `voicing-type` L1–5 |

### 2.3 Guide tones and voice leading

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 25 | Guide tones; 7th falls to 3rd (AEB, BH 2, GAL) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-1/7`, `k-vl-3`, `k-tune-2`, `g-jazz-5`, `g-impro-4`, `b-impro-6`; topics `guide-tones`, `guide-line`; rule card `guide-target` ruleCards.ts:425 |
| 26 | Voice leading around the cycle | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `k-vl-5/6`, `g-vl-1..3`, topic `vl-ear` |

### 2.4 ii–V variants

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 27 | Major ii–V–I | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `voicings-3/4`, `k-bebop-1`, `harris-15`, `b-walk-9`, `b-impro-9` |
| 28 | Minor ii–V–i | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-reharm-2`, `k-bebop-2`, rootless:2, `g-bebop-7`, `b-impro-10`; topic `jazz-changes` L1 |
| 29 | Altered V | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-reharm-1`, `k-bebop-3`, `k-phrase-6`, `b-impro-17` |
| 30 | Tritone sub ii–♭II7–I | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `voicings-10` (generate.ts:2286), `k-keys-11`, `g-jazz-11`, `k-tune-7`, `b-tune-5`, rule card `tritone-sub` ruleCards.ts:585 |
| 31 | Backdoor ivm7–♭VII7–I | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-ctx-6`, `g-ctx-5`, `b-ctx-4`, `k-tune-8`; topic `jazz-chains` L1. AUDIT-DEPTH-3 rated this SHALLOW; it is now closed. |
| 32 | Sus ii–V (V7sus4 for ii–V) | ✓ | ✗ | ✓ | PG | ✓ | ✗ | ✗ | SHALLOW | `k-reharm-16`, `g-color-12`; not in a tune, not in a line, not on bass |
| 33 | iiø7–V7♭9–I in major | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-reharm-15`, `g-color-7`, `b-counter-8`; topic `modal-mix` L4 |
| 34 | ii–V chains, extended dominants, related ii (BH 2) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-reharm-6`, `k-keys-5`, `g-keys`, `b-keys`; topic `jazz-chains` L2; reharm.ts:103 |
| 35 | Secondary dominants as a ladder: V/ii, V/iii, V/IV, V/V, V/vi (BH 2) | ~ | ✓ | ✓ | P(B ear) | ✓ | ✗ | ~ | SHALLOW | Only as VI7 in turnarounds (`k-keys-1`) and "extra ii–Vs" in `k-tune-7`. Ear coverage: `harmonize` L3, `turnarounds` L2, `b-ear-13` (bass.ts:2628). No per-target ladder is played. |
| 36 | Family of dominants / brothers | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-ctx-1..5`, `g-ctx-1..4`, `b-ctx-1..3`, `harris-8/16`; topic `bh-brothers` |
| 37 | Coltrane sub over ii–V | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-ctx-10`, `g-ctx-8`, `b-ctx-7`, `k-tune-9`; topic `reharm-spot` L4 |
| 38 | Deceptive resolutions performed (BH 2) | ✗ | ✗ | — | — | ✓ | ✗ | ✗ | SHALLOW | Ear only (`reharm-spot` L5). HARMONY-REHARM.md §7 lists keys, guitar and bass as "—". |

### 2.5 Substitution and colour

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 39 | Tritone subs in tunes | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-tune-7`, `g-tune-7`, `b-tune-5` |
| 40 | Coltrane changes / matrix (LTB 15) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `voicings-12`, `jazz-9`, `k-bebop-10` (generate.ts:4416, 4431), `hl-outline:7`, `g-theory-3`, `b-walk-18`, `b-std-5`; topic `jazz-chains` L3 |
| 41 | Chromatic mediants (RHC) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ~ | DEEP | `k-mediant-1..8`, `g-color-3..5`, `b-counter-4`; topic `mediants` L1–5 |
| 42 | Modal interchange (BH 2–4) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-reharm-11/13/15/17/20`, `k-tune-10`, `g-color-1/2/6–9`, `b-counter-2/6/8`; topics `modal-mix` L1–5, `borrowed-ext` |
| 43 | Common-tone reharm (RHC) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-ctone-1..7` (graded free choice: ctFreeAnalyze.ts), `g-ctone-1..5`, `b-counter-1/10`; topic `ct-degree` L1–6 |
| 44 | Common-tone / auxiliary diminished | ✓ | ✓ | ✓ | P | ✓ | ✓ | ✓ | DEEP | `k-sixdim-11`; topic `bh-dim-roles` |
| 45 | Passing diminished | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-sixdim-5`, `k-keys-1`, `g-cmel-5`, `k-tune-8`, `b-barry-2` |
| 46 | Constant structure / planing (BH 4) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ~ | DEEP | `k-reharm-10/18`, `g-color-10`, `b-impro-16`; topic `planing` |
| 47 | Pedal point (BH 4) | ✓ | ✓ | ✓ | P B | ✓ | ✓ | ~ | DEEP | `k-reharm-8/12`, `b-counter-3/5/9`, `b-jform-3`; topic `pedal-ear`. Guitar is still open (HARMONY-REHARM §7). |
| 48 | Line cliché | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-theory-5`, `g-theory-7`, `k-tune-8`, `b-tune-6` |
| 49 | Side-slip / chromatic approach chords | ✓ | ✗ | ✓ | PG | ✓ | ~ | ✗ | SHALLOW | `k-reharm-14/21`, `g-color-11`; topic `approach-chord`. Never in a tune; no bass. |
| 50 | Negative harmony | ✗ | — | — | — | ✓ | ~ | ✗ | SHALLOW | Topic `negative-harmony` only. Low priority; none of the listed sources teach it. |
| 51 | Reharm under a melody: keep the melody, check every note (LTB 13–14, TER 23) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | reharm.ts `checkMelody` / `roleOf`; `k-tune-7..10`, tn-rhmel; topic `reharm-own` L3–5; `k-ctone-7` |
| 52 | Reharmonize a whole standard yourself, graded (LTB 16, TER 23) | ~ | ✓ | ✓ | P | ✓ | ✗ | ~ | SHALLOW | The player chooses only at one point: `reharm-own` L5 "Reharmonise the V your way", `k-ctone-7` (one note). The reharm studio applies fixed devices. No graded free reharm of 8 bars. |

### 2.6 Harmonic analysis

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 53 | Roman-numeral analysis of standards (TER 20, LTB 18) | n/a | ✓ | ✓ | — | ✓ | ✓ | ✓ | DEEP | Topics `roman-numerals`, `chart-analysis` L1–3 ("Where are the ii–Vs?", "What does this chord do?"), `name-standard` L1–4 |
| 54 | Key centres and how a key changes | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | Topics `key-centres` L1–3, `modulation-means` L1–5; `k-keys-1..12`, `g-keys`, `b-keys` (AUDIT-GAPS-2 #5 and #6 closed) |
| 55 | Jazz harmonic dictation | n/a | ✓ | ✓ | — | ✓ | ✓ | n/a | DEEP | Topics `jazz-dictation`, `grid-dictation`, `harmonic-dictation` |

### 2.7 Forms

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 56 | 12-bar blues: basic, jazz, Bird, minor (LTB 10, TER 9/15) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `voicings-6`, `k-bebop-4`, `jazz-6`, `k-sixdim-10`, `k-organ-1/4`; topic `jazz-form` L3; progGrid.ts:323 (Bird blues correct) |
| 57 | 8-bar and 16-bar blues | ✗ | ✗ | — | — | ✓ | ✗ | ✗ | SHALLOW | Ear only: `form-ear` L1 (topicsHarmony3.ts:543), lesson harmony3.ts:315 |
| 58 | Rhythm changes (LTB 11, TER 17) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-bebop-5/9`, `k-keys-3`, `hl-outline:1`, `accomp-14`, `b-walk-10`, `b-impro-12` |
| 59 | AABA / 32-bar | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-bebop-9`, `b-jform-2`; topic `jazz-form` L4 |
| 60 | ABAC | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | Topic `form-ear` L2; ABAC standards in `k-tune`, `g-tune`, `b-tune` |
| 61 | Through-composed / irregular-length forms (post-bop; TER 22) | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | No "through-composed" hit in src |
| 62 | Jazz waltz comping, 3/4 (LJP 21) | ✗ | ✗ | ✗ | B only | ✗ | ✗ | ✗ | MISSING (P, G) | Bass only: `b-walk-19/20` (bass.ts:2442). No piano or guitar 3/4 comping. AUDIT-GAPS-2 #18 is still open. |
| 63 | Intros, endings, tags | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-ctx-11/12`, `g-ctx-9/10`, `b-jform-5`; topic `form-ear` L3 (AUDIT-GAPS-2 #13 closed) |
| 64 | Confirmation changes; bebop-blues variants (TER 15–16) | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | No "Confirmation" hit; the Bird blues is the only bebop-blues variant |

### 2.8 Modal, post-bop, free

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 65 | Modal jazz: vamps, So What form, modal comping (BH 4, LIG 2) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-reharm-5`, `k-impro` im-drone-dor, `b-impro-11`, `voicings-16` std:so-what; topic `modal-cadence` L1–3 |
| 66 | Modal improvisation devices (quartal lines, pentatonics) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-theory-1/6`; rule "Fourths only" improvRules.ts:84 |
| 67 | Non-functional / Wayne Shorter-type harmony (TER 24, LIG 2 "expanding vocabulary") | ~ | ✗ | ✓ | P | ✗ | ✗ | ✗ | SHALLOW | Two original sequences only: `k-reharm-19` rh-modern (colorDrills.ts:539–543, 699; rating 1660). No ear level, no improvising over non-functional changes, no guitar or bass, no original post-bop tune. |
| 68 | Free improvisation (WER step 2, OS "Improv Games") | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | No "free improvisation" hit. Every improv mode is graded against changes. |
| 69 | Post-tonal: set classes, twelve-tone (TER 24–26) | ✗ | ✗ | — | — | ✓ | ~ | ✗ | SHALLOW | Topic `set-classes` L1–3; twelve-tone in one lesson only (ad.ts:483) |
| 70 | Tristano style (TER 19) | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | No hit |

### 2.9 Improvisation devices

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 71 | Chord tones / target notes | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-6`, `g-impro-1..4`, `b-impro-1/2/5`; rule card `target-ct` ruleCards.ts:463 |
| 72 | Approach notes and enclosures (OS Bebop Enclosures) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-vocab-2..7`, `k-phrase-2/3`, `g-bebop-2..5`, `b-bebop-1/2`, `k-solo-4/5` |
| 73 | Digital patterns and cells (BRG 1, LJP 18 "four-note scales") | ✓ | ✓ | ✓ | PGB | ✗ | ~ | ~ | SHALLOW | `jazz-2` (1-2-3-5, two options), `jazz-9`, `g-bebop-6`, `b-bebop-3`. No permutations (1-3-5-7, 3-5-7-9, 5-3-2-1, inversions), no ear level, no rule card. |
| 74 | Motif development (AEB "what creates interest", TER 10) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | Rule cards `motif-dev` ruleCards.ts:839 (graded T/I/R/S), `repeat-vary`; `g-impro-6`; topic `call-response` L3 |
| 75 | Sequences (GAL "sequential reordering", BRG 1) | ~ | ~ | ✓ | — | ✗ | ✗ | ~ | SHALLOW | Only as the "S" branch of `motif-dev` (ruleCards.ts:860). No drill sequences a cell through a ii–V chain or the cycle; no ear level. |
| 76 | Triad pairs (OS Triad Pairs Training, BRG 7) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-theory-4/6`, `k-ctx-8`, `k-solo-7`, `g-ctx-6`, `b-ctx-5`; topic `triad-pairs` L1–5 |
| 77 | Hexatonics beyond triad pairs: the augmented scale (BRG 7, TER 18) | ✗ | ✗ | — | — | ~ | ✗ | ✗ | SHALLOW | Augmented scale only as an ear name (modes.ts:170); the hexatonic cycle only as comping (`k-mediant-8`) |
| 78 | Pentatonic superimposition (LTB 9, LJP 15, LIG 2) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-theory-1`, `k-ctx-9`, `k-solo-8`, `g-ctx-7`, `b-ctx-6`; topic `pent-super` L1–4 |
| 79 | Pentatonic patterns and permutations (BRG 2, OS Pentatonics) | ~ | ✗ | ✓ | PGB | ✗ | ✗ | ~ | SHALLOW | `jazz-3` is the scale only; rule `pent-5th-up` ruleCards.ts:629. No 4-note groupings, permutations or interval cells. |
| 80 | Intervallic melodies (BRG 5) | ~ | ✓ | ✓ | — | ✗ | ✗ | ~ | SHALLOW | Rule cards "Fourths only", "Sixths only", "No steps" (improvRules.ts:83–85). No drill of interval cells through changes. |
| 81 | Outside playing: side-slip lines, half-step and tritone superimposition, out-and-in (LTB 8, LIG 2, OS "Pentatonics and Playing Out") | ~ | ~ | ✓ | P | ✗ | ✗ | ~ | SHALLOW | One rule card: `side-slip` "Outside, then in" (ruleCards.ts:561, diff 1700). Comping side-slip `k-reharm-21`. No line ladder, no "inside or outside?" ear level, no guitar or bass. |
| 82 | Barry Harris lines (BHM) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `harris-1..26`, `k-harrisline-1..32`, `g-harrisline-1..10`, `b-harrisline-1..10`, `k-vocab-8/9`; topics `bh-lines`, `bh-line-ear`, `bh-pivot` |
| 83 | Bebop language and licks (BAK 2, OS Language of the Masters) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-vocab`, licks, `k-solo-9`, rule `use-lick` ruleCards.ts:408 |
| 84 | Blues language (AEB) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-3/10`, `b-impro-5`; rule "Blues scale of the key" |

### 2.10 Line construction

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 85 | Galper forward motion: upbeat-to-downbeat cells, lines built backwards from targets, half-time feel (GAL) | ~ | ~ | ✓ | P | ✗ | ✗ | ~ | SHALLOW | Indirect only: Harris "chord tones on the beats" (`harris-14`), `k-harrisline-9` "hit only the ands", `k-vocab-10`, rule "Start phrases on an and" (improvRules.ts:98). Nothing builds a line backwards from a target. "Galper" has 0 hits. |
| 86 | Ligon linear outlines (3 → ♭9, 7 down to 3) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | Under Harris names: `k-harrisline-20/21`, `k-vocab-8`, `g-harrisline-6`, `b-harrisline-6`. Ligon is never named ("Ligon" has 0 hits). |
| 87 | Guide-tone skeleton under a line (GAL "melody guide tones") | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `jazz-7`, `k-solo-1`; topic `guide-line` |
| 88 | Scale outline of a tune (BHM) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-harrisline-5/10/14/18/30`, `g-harrisline-2`, `b-harrisline-2` |

### 2.11 Rhythm in improvisation

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 89 | Swing and time feel | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-vocab-1/10`, `g-bebop-12`, `b-swing`; topic `swing-ratio` L1–4; rule cards `behind` / `ahead` ruleCards.ts:781–791 |
| 90 | Rhythmic displacement (GAL, LIG 1) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-rhythm-5`, `g-impro-6`; topics `displacement` L1–4, `displacement-3`; rule card `displace` ruleCards.ts:759 |
| 91 | Polyrhythmic phrasing: 3-note and 5-note groupings in 8ths, quarter-note triplets | ~ | ~ | ✓ | P | ✓ | ✗ | ~ | SHALLOW | Rule cards "Three over four" (improvRules.ts:99) and quarter-note triplets (:209); `k-harrisline-24` "feel 6 in 4"; `k-rhythm-2`. No graded ladder of groupings inside lines over changes. |
| 92 | Phrase lengths and placement | ✓ | ✓ | ✓ | PGB | ~ | ✓ | ✓ | DEEP | Rule cards `bars-2`, `start-two`, `double-bar`, `rest-bar` (ruleCards.ts:690–740); improvPhrasing.ts grades phrase length and rests |
| 93 | Melodic-rhythm vocabulary (BRG 4) | ~ | ~ | ✓ | — | ✗ | ✗ | ~ | SHALLOW | Only the rule card "Pick a one-bar rhythm and keep it" (improvRules.ts:208) |
| 94 | Double-time and half-time inside a solo (GAL) | ~ | ~ | ✓ | — | ✗ | ✗ | ~ | SHALLOW | Only the rule card "Double time" (improvRules.ts:211) |

### 2.12 Process, repertoire, roles

| # | Item | a | b | c | P/G/B | e | f | g | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 95 | Transcription method (LTB 24, OS) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | Topics `jazz-phrase` L1–7, `figure-out` L1–4; `k-phrase-1..8`, `g-phrase`, `b-phrase`; practiceMethod.ts (Siskind 7-step lick flow) |
| 96 | Learning and memorizing tunes (LTB 19–20, AEB, BAK 3) | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-tune-1..10`, `g-tune`, `b-tune`, heads; practiceMethod.ts memorize flow; topic `name-standard` |
| 97 | A tune in all 12 keys | ✓ | ✓ | ✓ | PGB | — | ✓ | ✓ | DEEP | `k-tune` keys=12 (AUDIT-GAPS-2 #4 closed) |
| 98 | Comping vocabulary (LJP 21, MM) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `voicings-11/14`, `k-comp` cp-beat3…cp-free (1250–1650), `g-jazz-8/13`; topic `comping` L1–3 |
| 99 | Interactive comping: answer the soloist, comp in the gaps (MM thesis "interplay", OS Bandstand) | ✗ | ✗ | ✗ | — | ✗ | ✗ | ✗ | MISSING | Only a self-check question, "Does the comp answer the soloist?" (practiceMethod.ts:144) |
| 100 | Trading 4s, 8s and 2s | ✓ | ✓ | ✓ | PGB | ✓ | ✓ | ✓ | DEEP | `k-bebop-8`, `g-impro-7`, `b-impro-14`. Answering the drummer's motif is not graded. |
| 101 | Solo piano (OS Keezer, Siskind) | ✓ | ✓ | ✓ | P | n/a | ✓ | ✓ | DEEP | `accomp-3..18`, `k-reharm-7`, `k-lh`, `k-tex` (to 1900), `k-comp`, `k-impro` |
| 102 | Organ comping | ✓ | ✓ | ✓ | P | ✗ | ✓ | ✓ | DEEP | `k-organ-1..7` |
| 103 | Chord-melody (guitar) | ✓ | ✓ | ✓ | G | n/a | ✓ | ✓ | DEEP | `g-cmel-1..6`, `g-tune-6` |
| 104 | Latin-jazz piano: montuno, bossa comping, clave (LTB 22, LJP 20) | ✓ | ~ | ✓ | P (B deep) | ~ | ✗ | ✗ | SHALLOW | One level each in `accomp-6/10` (generate.ts:3134). Bass is deep (`b-latin`). |
| 105 | Practice approach, Effortless Mastery (WER) | ✗ | — | — | — | — | ✗ | ✗ | MISSING | No relaxed "one note / the Space" mode and no un-graded free play. The 0 hits for "Werner" exclude path.ts:1041, which is unrelated. The Siskind four-slot practice method exists (practiceMethod.ts:1–17). |
| 106 | Contrafact / write a head on changes (BAK 3, PEA) | ~ | ✓ | ✓ | PGB | ✗ | ✗ | ~ | SHALLOW | `hl-compose` (`k-harrisline-26/31/32`) writes a line; `k-solo-13` writes a solo chorus. No head composition with form, motif or cadence goals. |
| 107 | Harmonize a melody (BH 4, TER 12) | ✓ | ✓ | ✓ | PG | ✓ | ✓ | ✓ | DEEP | `k-harm-1..7`, `k-sharm`, `g-harm`, `g-cmel`; topic `harmonize` L1–3 |
| 108 | Hearing harmony in context (OS Hearing Great Harmony, 5-Minute Ear Training) | n/a | ✓ | ✓ | — | ✓ | ✓ | n/a | DEEP | Topics `jazz-changes` L1–5, `reharm-spot` L1–5, `func-color`, `modal-mix`, `mediants`, `progressions` |

### 2.13 APP-WRONG (minor wording, no wrong notes found)

The music checked had no errors:
- rootless spellings (generate.ts:1996–2043);
- the tritone-turnaround spelling (keyMoves.ts:68);
- the Bird blues grid (progGrid.ts:323);
- the backdoor text (harmony3.ts:141, 156);
- the chord-scale statements (theoryEar.ts:1221, 1252, 1257–1259; jazz.ts:291; jazzContext.ts:117);
- the altered pair over C7alt (theoryPlay.ts:32);
- the HARMONY-REHARM tables (P/L/R cycles, mediant common tones, one-note table).

Two sentences overstate:

| # | Where | Text | Problem | Fix |
|---|---|---|---|---|
| A1 | src/content/mini/jazzEar.ts:331 | "the Bird blues fills every bar with them [ii–Vs]" | Bars 1, 5 (B♭7) and 11 are not ii–Vs. Lines 349 and 365 in the same file say it correctly. | "...replaces most bars with ii–Vs" |
| A2 | src/content/mini/bassNiche2.ts:31 | "Coltrane changes, where the key moves every two beats" | True only of the first 7 bars of Giant Steps; from bar 8 each key lasts a ii–V–I (2 bars) | "...where the key moves every two beats, then every two bars" |

### 2.14 Counts

| Status | Count |
|---|---|
| EXISTS-DEEP | 75 |
| SHALLOW | 25 |
| MISSING | 9 |
| APP-WRONG (minor wording) | 2 |
| **Rows** | **111** |

The app is far deeper than earlier audits found. Most AUDIT-DEPTH-3 SHALLOW rows have since been built: backdoor, Coltrane sub, triad pairs and pentatonics in context, intros and endings, tunes in 12 keys, modulation means.

The remaining gaps share two traits:
- **No outside-syllabus authors are represented.** Bergonzi, Galper, Werner and Terefenko's bebop and Tristano chapters are absent.
- **Few "post-bop and beyond" items.** Outside playing, non-functional harmony, free improvisation, irregular forms and clusters are missing or thin.

---

## 3. Top-priority build list (ladders on the 700–1900 scale)

Order: what a serious jazz student would miss first, then breadth across P/G/B and ear. Every item is in 12 keys (`all12`), rubato first and then a tempo ladder (owner rule). Each new family follows the six-point "everything connects" checklist.

### 1. Outside playing: a new family `k-out` (+ `g-out`, `b-out`), ear topic `inside-out`
The missing area a pro-jazz user would notice first.

| Level | Rating | Content |
|---|---|---|
| L1 | 1350 | Side-slip a ii–V lick a half step up for 2 beats, then back in (written) |
| L2 | 1450 | The same down a half step, and on the "and" |
| L3 | 1520 | Pentatonic a half step up over a dorian vamp, 1 bar out, 1 bar in |
| L4 | 1600 | Tritone superimposition on the V (the ♭II7 arpeggio over V7) |
| L5 | 1680 | "Out-and-in" improvised: the `side-slip` rule card graded over a blues |
| L6 | 1760 | Parallel triads / constant-structure lines (LIG 2) |
| L7 | 1850 | Free choice: any out device, which must resolve to a guide tone within 2 beats |

Ear topic `inside-out`:
- L1 inside or outside? (1300)
- L2 out where: up a half step, down a half step, or tritone? (1500)
- L3 where does it come back in? (1650)

### 2. Jazz waltz comping (piano and guitar): `voicings-18`, `g-jazz-14`, `k-comp` rows

| Level | Rating | Content |
|---|---|---|
| L1 | 1200 | Shells on beat 1 |
| L2 | 1260 | Beat 1 plus the "and" of 2 |
| L3 | 1320 | Dotted-quarter figures across the bar |
| L4 | 1400 | Rootless voicings on a waltz blues (original changes) |
| L5 | 1450 | A 3/4 standard chart with the band, comp and solo |

The bass and drum waltz levels already exist and can be linked to this.

### 3. Interactive comping: a new mode in `k-comp` and `g-jazz`
The band soloist plays phrases with gaps, and the player comps.

| Level | Rating | Content |
|---|---|---|
| L1 | 1300 | Comp only in the soloist's rests |
| L2 | 1400 | Thin texture under activity, full texture in gaps (graded density against the soloist's density) |
| L3 | 1500 | Echo the soloist's rhythm in the next bar |
| L4 | 1650 | Free, graded on overlap and density contrast |

Source: MM thesis "interplay". The `k-organ-5` texture logic can be reused.

### 4. Bergonzi melodic structures and pentatonic cells: `k-cells` (+ G, B)

| Level | Rating | Content |
|---|---|---|
| L1 | 1100 | 1-2-3-5 on each chord of a ii–V–I |
| L2 | 1180 | 1-3-5-7 and 3-5-7-9 |
| L3 | 1250 | 5-3-2-1 and the descending forms |
| L4 | 1320 | Permutations (2-1-3-5, 3-2-1-5…) |
| L5 | 1400 | Pentatonic 4-note groups up and down |
| L6 | 1500 | Pentatonic cells superimposed (the `pent-super` choices) |
| L7 | 1600 | Interval cells: 4ths + 2nds (BRG 5) through a ii–V chain |
| L8 | 1700 | Free choice of cells on a standard, graded by the `cell` rule card |

Ear topic `cell-ear` (1150–1500): which cell, and which permutation?

### 5. Sequences: `k-seq`
A cell moved through changes.

| Level | Rating | Content |
|---|---|---|
| L1 | 1150 | Diatonic sequence of a 4-note cell up the scale |
| L2 | 1250 | Through I–vi–ii–V |
| L3 | 1350 | Through a ii–V chain by whole steps |
| L4 | 1450 | Through the cycle of 4ths (7 chords) |
| L5 | 1550 | Improvised, graded by a new `sequence` rule card (3 consecutive transpositions of one shape) |

Ear (1200–1400): "Is the second phrase a sequence, and how far did it move?"

### 6. Modern voicings: `voicings-19..21` (P)

| Level | Rating | Content |
|---|---|---|
| L1 | 1450 | Kenny Barron m11 in two hands (5ths LH, 4ths and 5ths RH) on a minor vamp, then on ii |
| L2 | 1520 | sus♭9 (Phrygian) voicings on V and on a modal vamp (LJP 4) |
| L3 | 1580 | McCoy LH 5th + 4th under RH pentatonic |
| L4 | 1640 | Clusters (2nds inside a rootless voicing) on a ballad |
| L5 | 1700 | All of the above on a standard chart |

Ear: `voicing-type` L6, "quartal, Barron or cluster?" (1600).

### 7. Post-bop non-functional harmony: `k-postbop` (P, G), topic `nonfunc-ear`
Uses original sequences only, never a reproduced tune.

| Level | Rating | Content |
|---|---|---|
| L1 | 1550 | Slash-chord chain voicings, triad over bass |
| L2 | 1620 | Sus chains on a moving bass (extends `rh-modern`) |
| L3 | 1700 | One chord-scale per chord: improvise with a "scale per bar" check (chord-scale grading exists in `analyze.ts` improv mode) |
| L4 | 1780 | A 14-bar or 10-bar original form, which also closes MISSING item 61 |
| L5 | 1850 | Comp + solo on that form |

Ear (1550–1750): functional or non-functional? Name the slash chord.

### 8. Galper forward motion: `k-fm` (P, G, B)

| Level | Rating | Content |
|---|---|---|
| L1 | 1250 | Target the 3rd on beat 1, pick up from the "and" of 4 (2-note cell) |
| L2 | 1320 | A 4-note pickup ending on the target (scalar) |
| L3 | 1400 | Arpeggio pickups |
| L4 | 1480 | Build a 1-bar line backwards from the next chord's target (the app shows the target, the player fills backwards) |
| L5 | 1550 | The same in half-time feel |
| L6 | 1600 | Improvised, graded by "every bar line crossed by a pickup into a chord tone" |

Cross-label Ligon outlines on the existing `hl-3b9` levels.

### 9. Rhythm cells in lines: `k-rcell`

| Level | Rating | Content |
|---|---|---|
| L1 | 1300 | A one-bar rhythm cell kept through the changes (graded) |
| L2 | 1380 | The cell displaced by an 8th |
| L3 | 1460 | 3-note groupings in continuous 8ths (3/8 over 4/4) |
| L4 | 1540 | Quarter-note triplets |
| L5 | 1620 | 5-note groupings |
| L6 | 1700 | Double-time 2 bars, then back |
| L7 | 1750 | Free choice, graded by grouping detection |

Ear (1250–1600): which grouping? Where does beat 1 land?

### 10. Locked hands under a melody: `k-harm-8..10` (P), `g-cmel-7` (G)

| Level | Rating | Content |
|---|---|---|
| L1 | 1400 | 4-way close + octave doubling (Shearing) on the app heads |
| L2 | 1480 | Diminished on the passing tones (Harris 6-dim, linking to `harris-9`) |
| L3 | 1560 | Garland block chords (5th + 4-way) |
| L4 | 1650 | Drop 2 block chords at tempo |

Ear: `voicing-type` "locked hands vs drop 2" (1450).

### Further items (smaller)

| Item | Ratings | Content |
|---|---|---|
| 11 | 1000–1300 | Secondary-dominant ladder `k-keys-0`: V/ii, V/iii, V/IV, V/V, V/vi, each with its related ii |
| 12 | 1450–1550 | Deceptive resolutions performed: V7 → ♭VImaj7, iii, IV, V/ii on P, G and B, beside `reharm-spot` L5 |
| 13 | 1500–1750 | Contrafact studio: write an 8-bar head on a progression (motif rule + cadence-landing rule), then play it with the band |
| 14 | 1150–1600 | Forms performed: 8- and 16-bar blues walks and comping; Confirmation-type changes (original "bebop-blues 2" grid); Tristano-style long line with displaced accents (1750) |
| 15 | 1650–1850 | Augmented (hexatonic) scale lines over maj7♯5 and over the mediant cycle (links `k-mediant-8`) |
| 16 | 1200–1550 | Latin-jazz piano ladder: montuno 2-3 / 3-2 clave, bossa comping on a standard, songo |
| 17 | 700–1200 | "Effortless" mode: one note relaxed, then free improvisation over a drone, ungraded for notes and measured only for time, evenness and tension markers (velocity spikes). A practice-quality feature that fits the app's mission. |
| 18 | 1100–1500 | Sus ii–V in a tune and in a line; side-slip comping on a tune; drop 2&4 on a ii–V (guitar first) |
| 19 | — | Minor fixes A1 and A2 |

---

## 4. Game ideas (one line per strong exercise)

| Exercise | Game type | Concept |
|---|---|---|
| Rootless A/B (`voicings-4`) | Speed | "A/B Flip": the band calls a ii–V–I in a random key and you place the right A or B start before the downbeat; one key per bar, streak multiplier |
| Guide tones (`jazz-1`, `guide-line`) | Streak | "Guide-Tone Runner": play the 3rd/7th line through a random cycle of 4ths; one wrong note ends the run |
| Tritone sub (`voicings-10`, `reharm-spot`) | Duel | "Sub or Not": two players hear the same ii–V and the first to name or play the sub (♭II7) scores |
| Common-tone reharm (`k-ctone`, `ct-degree`) | Puzzle | "Hold the Note": one held melody note, eight chord slots; fill each with a different chord that carries it, graded by ctFreeAnalyze, fewest seconds wins |
| Chromatic mediants (`k-mediant`) | Speed | "Third Jump": a chord appears and you play its mediant (M3 or m3, up or down, called at random) holding the common tone |
| Modal interchange (`modal-mix`) | Accuracy | "Dark Side": spot the borrowed chord in a 4-bar loop; points for naming ♭VI, ♭VII, iv or iiø |
| Brothers (`k-ctx-1..5`) | Call & response | "Family Reunion": the band plays one dominant and you answer with a brother a m3 or tritone away, landing a half step into I |
| Coltrane matrix (`k-bebop-10`) | Speed | "Giant Steps Ladder": tempo climbs 8 bpm after each clean chorus of the matrix; leaderboard by top tempo |
| Triad pairs (`k-theory-4`) | Puzzle | "Pair Up": given a chord, pick the two triads that make the target colour (lydian, altered, dorian), then play the hexatonic line |
| Pentatonic superimposition (`k-ctx-9`) | Accuracy | "Pick the Pent": the chord flashes, you choose which pentatonic and play 4 bars; graded inside or colour |
| Barry Harris rules (`harris-14`) | Streak | "On the Beat": chord tones must land on every beat in a descending line; a streak counter and a buzz on any miss |
| Pivot (`harris-19..22`) | Speed | "Pivot Pinball": the line must pivot at the called beat, and the call comes later each round |
| 6-dim block chords (`harris-9`) | Accuracy | "Six-Dim Stairs": harmonize a scale melody alternating 6 and dim, graded on voicing per note |
| Key changes (`k-keys`, `modulation-means`) | Duel | "Door Race": both players get the same key pair, one plays a pivot and the other the common dim; fastest correct arrival wins |
| Scale outlines (`hl-outline`) | Puzzle | "Outline Builder": drag scale fragments onto a tune's bars so every chord tone lands on a beat, then play it |
| Trading fours (`k-bebop-8`) | Call & response | "Trade War": the drummer plays a rhythm motif and your 4 bars must reuse it (graded by rhythm similarity) |
| Motif development (`motif-dev`) | Accuracy | "Motif Mutator": the game names a transform (invert, sequence, re-rhythm) per phrase; points per correct transform |
| Comping rhythms (`voicings-11`, `k-comp`) | Speed | "Comp Caller": Charleston, reverse, Garland or Basie is called one bar ahead and you switch on the bar |
| Walking bass (`b-walk`) | Streak | "Walk the Line": a chorus with no wrong beat-1 root and approach notes on beat 4; the streak carries across choruses |
| Chord-melody (`g-cmel`) | Accuracy | "Top Note Lock": the melody note must stay on top of every voicing; any voicing with the melody buried costs a life |
| Reharm under melody (`k-tune-7..10`, `reharm-own`) | Duel | "Reharm Battle": both players reharm the same 4 bars, every melody clash is −1, and the opponent votes on taste |
| Voicing type by ear (`voicing-type`) | Speed | "Voicing Snap": 10 voicings in 30 s; name close, drop 2, rootless, quartal or upper structure |
| Organ comping (`k-organ`) | Accuracy | "Pad & Walk": the walking LH must not skip a beat while the RH pad moves one inner voice per bar |
| Displacement (`k-rhythm-5`, `displacement`) | Call & response | "Shift It": a figure is played and you play it back shifted by the called amount |
| Solo by the rules (`k-solo`) | Streak | "Rule Roulette": a new rule card is dealt every 8 bars and the score multiplier grows while you comply |
| Outside playing (new `k-out`) | Accuracy | "Out and Back": go out for exactly 2 beats and land a guide tone; out too long or no landing loses points |
| Interactive comping (new) | Call & response | "Fill the Holes": comp only where the soloist rests; overlap costs points and silence in holes costs too |
| Cells and sequences (new `k-cells`, `k-seq`) | Speed | "Cell Shift": one cell through a ii–V chain at rising tempo |
| Forward motion (new `k-fm`) | Puzzle | "Backwards Builder": the target is shown and you build the pickup line backwards, note by note |
| Jazz waltz (new) | Streak | "Three's Company": a clean 3/4 comping chorus raises the tempo; drift to 4/4 feel ends it |

### The 10 best (for the summary)
1. Hold the Note (common-tone puzzle)
2. Out and Back (outside playing)
3. Fill the Holes (interactive comping)
4. Trade War (trading with motif reuse)
5. Rule Roulette (rule cards dealt every 8 bars)
6. Reharm Battle (duel)
7. Giant Steps Ladder (tempo climb)
8. Door Race (key-change duel)
9. On the Beat (Harris rules streak)
10. Voicing Snap (ear speed)

---

## Sources (fetched 2026-11-15)

- Levine, *The Jazz Theory Book*, contents: https://www.jazzbooks.com/mm5/samples/D-MLT.pdf ; https://www.ejazzlines.com/mc_files/2/shjtb.pdf
- Levine, *The Jazz Piano Book*, contents: https://www.jazzbooks.com/mm5/samples/D-JP.pdf
- Berklee harmony sequence: https://college.berklee.edu/harmony ; Harmony 2 online lessons: https://online.berklee.edu/courses/harmony-2
- Pease, *Jazz Composition*: https://www.ejazzlines.com/jazz-composition-theory-and-practice-ted-pease (no table of contents available)
- Ligon: https://www.ejazzlines.com/jazz-theory-resources-bert-ligon-book-volume-1 ; https://www.groove3.com/books/Connecting-Chords-with-Linear-Harmony
- Bergonzi: https://ejazzlines.com/inside-improvisation-series-volume-1-melodic-structures-jerry-bergonzi ; https://ficksmusic.com/products/bergonzi-jazz-line-volume-3-advance ; https://www.ficksmusic.com/products/thesaurus-of-intervallic-melodies-advance ; https://www.boosey.com/shop/prod/Bergonzi-Jerry-Hexatonics-Inside-Improvisation-Series-Vol-7-CD/2074173
- Galper: https://halgalper.com/articles/understandingforwardmotion/ ; https://www.ejazzlines.com/forward-motion-book-hal-galper
- Aebersold, *Jazz Handbook*: https://www.jazzbooks.com/mm5/download/FQBK-handbook.pdf
- Werner, *Effortless Mastery*: https://en.wikipedia.org/wiki/Effortless_Mastery
- Baker, *How to Play Bebop*: https://www.jazzbooks.com/jazz/product/BOP-SET
- Open Studio catalogue: https://www.openstudiojazz.com/gps/
- Mulgrew Miller comping thesis: https://ideals.illinois.edu/items/104436
- Terefenko, *Jazz Theory* (2nd ed.): https://www.routledge.com/products/9781138334243
- In-repo: docs/research/BARRY-HARRIS-METHOD.md, docs/research/REHARM-AND-COLOR.md, docs/BARRY-HARRIS-THEORY.md, docs/HARMONY-REHARM.md, docs/AUDIT-GAPS-2.md, docs/AUDIT-DEPTH-3.md

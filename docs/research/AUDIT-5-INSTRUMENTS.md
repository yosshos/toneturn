# AUDIT-5-INSTRUMENTS: the five courses checked against outside curricula (2026-11-15)

Read-only audit of `redesign-v2` @ df8f4d99, which includes the Siskind solo-piano families `k-lh`, `k-tex`, `k-comp` and `k-impro`.

I dumped every catalogue with two temporary vitest scripts and deleted them afterwards: `catalog()`, `guitarCatalog()` (this one also carries the bass families after `widenFamilies`), `drumFamilies()`, and `VOICE_FAMILIES` with its level tables. No repo file except this one changed.

**What is different this time.** Earlier audits (AUDIT-GAPS-2, AUDIT-DEPTH-3, AUDIT-SCALES, AUDIT-CONTENT-THEORY) checked the app against its own lists. This one works the other way round:
1. For each instrument, build a master checklist from recognised outside methods and syllabi.
2. Look up every item in the app.

---

## How to read the tables

**Depth criteria.**
- **a** = a performed, measured drill.
- **b** = a tempo ladder.
- **c** = all 12 keys, where the item is key-relative.
- **d** = applied in grooves, tunes or styles.
- **e** = a beginner → advanced path.

**Engine facts that settle (a) and (b) for every drill family.**
- Every catalogue level is a measured take. `ladder.ts:26-38` sets the level pass at 3 clean takes at ≥ 95 % of the target tempo, on 2 days. A new item starts in rubato, then quarters (`rubato.ts:1-18`).
- So **(a) and (b) hold for every piano, guitar, bass and drum level**. The real differences are in (c), (d) and (e).
- A level's `keys: 'major' | 'minor'` means all 12 keys in the player's order (`plan.ts:106-108` → `generate.ts:100`).
- Families listed in `keys12.ts:24-34` are widened to 12 keys.
- In the tables below, "6k", "4k" and so on mean a level fixed to that many keys.
- **Voice is the exception.** Vocal items have fixed bpm and are placed by range position (`vocal.ts:1284`, `atRange`). There is no tempo ladder. Criterion (b) is weak across the voice course; see V-27.

**Statuses.**
- **EXISTS-DEEP**: meets a–e, or every criterion that applies.
- **SHALLOW**: exists, but has 1–2 levels, too few keys, no applied context, or no path.
- **MISSING**: not in the app.
- **APP-WRONG**: the app teaches or labels it incorrectly.

**About the sources.** Web pages were used where tables of contents could be fetched; they are listed at the end. Full tables of contents for Levine, Reid and the ABRSM grade 8 list were not online. For those, the checklist uses the books' well-known chapter topics, and the table says "(from the method's known contents)".

---

## Summary

| Instrument | Items | EXISTS-DEEP | SHALLOW | MISSING | APP-WRONG |
|---|---|---|---|---|---|
| Piano / keys | 48 | 23 | 17 | 8 | 0 |
| Guitar | 42 | 18 | 18 | 6 | 0 |
| Bass | 32 | 21 | 9 | 2 | 0 |
| Drums | 35 | 17 | 13 | 5 | 0 |
| Voice | 29 | 15 | 8 | 6 | 1 (label) |
| **Total** | **186** | **94** | **65** | **27** | **1** |

**The pattern.**
- Jazz is deep on every instrument: Barry Harris, bebop, voicings, reharm and tunes.
- The gaps are almost all outside jazz:
  - **Non-jazz keyboard styles**: gospel, funk/clav, reggae, rock'n'roll, New Orleans, neo-soul.
  - **Rhythm-guitar styles**: one level each.
  - **The full PAS rudiment set**: about 15 of 40.
  - **Classical piano and guitar etudes**: one "-style" level each.
  - **The voice-production vocabulary of CVT and Estill**: modes, onsets, vowels.

**Unverified-content risk (not counted as APP-WRONG).**
- `src/engine/harrisLines.ts:11,16-17,248,358,361,383,623,681,708` mark several Harris line note-sets as "(verify)". These are the chromatic-scale direction in minor, the 5-4-3-2 phrases from a workshop attendee's notes, the derived minor versions, and the scale-outline charts.
- The same notes feed `k-harrisline` (piano), `g-harrisline` (guitar), `b-harrisline` (bass) and `v-barry` (voice; `vocal.ts:1004,1010`).
- The drums course flags `d-latin` 8–10 (mambo bell, songo, mozambique) as `needsTeacherCheck` (`drumLatin2.ts:40`).
- These need a checked source before they are called correct.

---

## 1. Piano / keys

### 1.1 Master checklist and sources

- **Classical technique.**
  - ABRSM and RCM technical requirements, grades 1–8 and diploma: scales in all forms, arpeggios, broken chords, cadences, sight-reading, aural.
  - Hanon, *The Virtuoso Pianist*: Part I patterns, Part II scales and arpeggios (39–43), Part III repeated notes, trills, octaves and tremolo (Nos. 46–60).
  - Czerny: Op. 299 and Op. 740 (velocity, hand crossing, leaps).
  - Philipp, *Exercises for Independence of the Fingers*.
  - Dohnányi, *Essential Finger Exercises* (held notes).
  - Cortot, *Rational Principles* (rhythmic variants, double notes).
- **Jazz piano.**
  - Levine, *The Jazz Piano Book* (from the method's known contents): shells, rootless "A/B", So What and fourths, upper structures, polychords, clusters, salsa montuno, block chords, stride, comping, the "left-hand voicings in all keys" discipline.
  - DeGreg, *Jazz Keyboard Harmony*: diatonic 7ths, rootless in 12 keys, quartal, upper structures, clusters.
  - Dobbins, *Jazz Piano Harmony*.
  - Siskind (already mapped in `docs/research/SISKIND-SOLO-PIANO.md`).
  - Open Studio courses: comping, stride, bebop, blues, gospel.
- **Pop / keys.**
  - RSL and Rockschool Keys (grade technique, quick study, improvisation, style pieces).
  - Comping styles: gospel, funk/clav, reggae skank, Latin montuno and guajeo, bossa, rock'n'roll, New Orleans (Longhair), neo-soul.

### 1.2 Items

| # | Item (source) | Status | Evidence / gap |
|---|---|---|---|
| P-1 | Major / minor scales, HS→HT, 1–4 octaves (ABRSM/RCM) | EXISTS-DEEP | `scales` 1–3, 5–6, 15–18 `generate.ts:5376-5468`; keys `'major'/'minor'` = 12 |
| P-2 | Contrary motion, 3rd / 6th / 10th apart, formula (ABRSM 6–8) | EXISTS-DEEP | `scales` 4, 8, 9, 13 `generate.ts:5379,5406,5411` |
| P-3 | Chromatic: similar, contrary, a minor 3rd / major 6th apart | EXISTS-DEEP | `scales` 7, 14 `generate.ts:5397,5450` |
| P-4 | Modes, pentatonic, blues, jazz scales, 6th-dim | EXISTS-DEEP | `scales` 12, 19–33 `generate.ts:5428-5489` |
| P-5 | Scales in octaves, staccato octaves (ABRSM 7–8, Hanon III) | EXISTS-DEEP | `advanced` 1, 3 `generate.ts:5798-5800` |
| P-6 | Double 3rds / 6ths scales (Cortot, diploma) | SHALLOW | Only `advanced-4` `generate.ts:5807` and part of `advanced-8` `:5818`. No chromatic double 3rds, no legato-fingering ladder |
| P-7 | Arpeggios: triads, inversions, dom7, dim7, broken and blocked chords | EXISTS-DEEP | `arpeggios` 1–14 `generate.ts:5504-5566` |
| P-8 | Cadences / keyboard harmony incl. N6, aug6 | EXISTS-DEEP | `cadences` 1–7 `generate.ts:5596-5610`. Levels 1–2 sit in 3 / 6 keys |
| P-9 | Hanon Parts I–II | EXISTS-DEEP | `fingers` 2, 6, 7, 14 `generate.ts:5628,5643,5647,5698` |
| P-10 | Czerny velocity (Op. 299), hand crossing (Op. 740) | SHALLOW | One `fingers-13` "Czerny-style" `generate.ts:5694` (generator `:2776`). Hand crossing only inside `advanced-8` `:5818`. No velocity ladder across figurations |
| P-11 | Philipp / Dohnányi held notes, hand independence | EXISTS-DEEP | `fingers` 3, 10 `generate.ts:5633`; `k-indep` 1–8 `indepDrills.ts:217` |
| P-12 | Cortot rhythmic variants on passages | SHALLOW | `scales-11` `generate.ts:5422` only. Not applied to arpeggios, Hanon or etude passages |
| P-13 | Trills, measured trills, ornaments (Baroque / Classical) | SHALLOW | `fingers` 4, 9, 11 `generate.ts:5637,5665,5681`. Ornaments are one level in 5 keys, never in a phrase or piece |
| P-14 | Repeated notes, rotation, broken octaves | EXISTS-DEEP | `fingers` 5, 12, 14 `generate.ts:5689,5698` |
| P-15 | Tremolo, chord and octave (Hanon 59–60) | MISSING | No "tremolo" in `generate.ts` (grep). Exists only for drums and guitar |
| P-16 | Leaps and jumps (waltz bass, two-octave) | SHALLOW | `advanced` 5, 8 `generate.ts:5815,5818` (5–8 keys); the stride LH covers some of this |
| P-17 | Polyrhythm 3:2, 4:3, 5:4, 7:4 | EXISTS-DEEP | `advanced` 2, 6, 7; `k-rhythm` 2, 6 |
| P-18 | Touch, dynamics, voicing, balance | EXISTS-DEEP | `control` 1–9 `generate.ts:5724-5760` (3–5 keys; touch is not key-relative) |
| P-19 | Pedalling: direct, legato, half, una corda | SHALLOW | `control-10` `generate.ts:5767` only |
| P-20 | Sight-reading by grade (ABRSM / RCM) | SHALLOW | `control` 11–12 `generate.ts:5771` and onward (seeded melodies `:2826`). Two levels; no grade ladder, key signatures, clefs or LH reading |
| P-21 | Aural: play back, harmonise, transpose (ABRSM aural) | EXISTS-DEEP | `k-ear` 1–16 `generate.ts:6117` and onward |
| P-22 | Graded classical repertoire | SHALLOW | Piece coach plus `songDrills.ts:1-5` (public-domain songs). No graded list of classical pieces (Bach minuets → inventions → sonatinas) |
| P-23 | Shells, rootless A/B, guide tones, 12 keys (Levine, DeGreg) | EXISTS-DEEP | `voicings` 3–6, 13 `generate.ts:5939`; `jazz` 1, 7 |
| P-24 | Quartal, So What, McCoy fourths | EXISTS-DEEP | `voicings` 7–8 `generate.ts:5950` (fourths `:2224`); `k-reharm-10` `:5981` |
| P-25 | Upper structures, polychords | EXISTS-DEEP | `k-theory-2` `generate.ts:5995`; `voicings-16` `:5959`; `jazz-4` |
| P-26 | Drop 2 / 3, four-way close | EXISTS-DEEP | `voicings` 9, 15; `k-harm` 3–7 (`headDrills.ts`); `k-sharm` 15–18, 24–25 |
| P-27 | Locked hands (Shearing, melody doubled) | SHALLOW | `jazz-8` `generate.ts:6053` = one level (generator `:3022`). No locked hands on a head; already flagged in AUDIT-DEPTH-3 |
| P-28 | Cluster / seconds voicings (Levine, DeGreg, Dobbins) | MISSING | "cluster" appears only in analysis code (`rubato.ts`, `voiceLeadAnalyze.ts`). No voicing type for it (`chartDrills.ts:21` `ChartVoicing`) |
| P-29 | Comping rhythms (Charleston, Garland, Basie) | EXISTS-DEEP | `voicings` 11, 14 `generate.ts:5954,5957`; `k-comp` 1–7 (`soloPianoDrills.ts`) |
| P-30 | Stride and solo-piano LH / textures (Siskind) | EXISTS-DEEP | `accomp` 3–4, 11–18 `generate.ts:6104-6113`; `k-lh` 1–18 and `k-tex` 1–20 (`soloPianoDrills.ts`) |
| P-31 | Bebop vocabulary, Harris | EXISTS-DEEP | `harris` 1–26 `generate.ts:5833`; `k-vocab`, `k-harrisline`, `k-bebop` `:6064` |
| P-32 | Reharm, borrowed colour, mediants | EXISTS-DEEP | `k-reharm` 1–22 `generate.ts:5970`; `k-mediant`, `k-ctone` `colorDrills.ts:713-716` |
| P-33 | Tunes: comp, harmonise, improvise | EXISTS-DEEP | `k-tune`, `k-harm` (`headDrills.ts`); `k-solo` 1–13 `soloDrills.ts:478` |
| P-34 | Intros and endings | SHALLOW | `k-ctx` 11–12 `ctxDrills.ts:521` and onward: two levels. No catalogue of standard intros (I–vi–ii–V vamp, "Ellington", pedal intro) per key |
| P-35 | Blues and boogie piano (licks, turnarounds, slow blues, tremolo licks) | SHALLOW | `jazz-10` `generate.ts:6055`; `accomp-5` boogie `:6092`. No 12-bar boogie forms, slow-blues RH vocabulary or shuffle comping |
| P-36 | Pop LH and ballad accompaniment (RSL) | SHALLOW | `accomp-7` `generate.ts:6094`. `genPopLH` `:3195-3196` = 2 patterns over I–V–vi–IV only. No 16th pop piano, no arpeggiated ballad in other progressions |
| P-37 | Pop voicings: sus2/4, add9, slash chords, inversions in progressions | SHALLOW | `voicings-1` triads I–IV–V; `k-vl` 1–2. No sus/add9/slash pop-chord drill |
| P-38 | Gospel piano: walk-ups, 7-3-6, plagal "Amen", passing dim, shout | MISSING | No "gospel" in any piano drill file (grep: only bass, drums and lessons) |
| P-39 | Funk / clav comping (16th syncopation, muted stabs) | MISSING | No clavinet / funk piano kind in `generate.ts` |
| P-40 | Reggae / ska skank and organ bubble | MISSING | Reggae exists on guitar, bass and drums only (grep) |
| P-41 | Latin montuno / guajeo with clave (salsa, cha-cha) | SHALLOW | One `montuno` item in `accomp-6` `generate.ts:6093` (generator `:3133`). No 2-3 / 3-2 switch, no guajeo variety, no tumbao LH |
| P-42 | Bossa / samba piano | SHALLOW | `accomp-6` bossa; `voicings-14` (Blue Bossa) `generate.ts:5957` |
| P-43 | Rock / rock'n'roll piano (driving 8ths, Jerry Lee triplets) | MISSING | none |
| P-44 | New Orleans (Longhair tresillo, rumba-boogie) | MISSING | none ("New Orleans" grep empty) |
| P-45 | Neo-soul / R&B keys (extended chords, slides, grace notes) | MISSING | Exists on guitar (`g-rhythm-9`) only |
| P-46 | Jazz organ comping | EXISTS-DEEP | `k-organ` 1–7 `colorDrills.ts:719` |
| P-47 | Rhythm-chart / lead-sheet reading with hits (RSL quick study) | SHALLOW | `chartDrills.ts:1-20` plays any chart as voicings. No hits / stop-time / road-map reading levels like `b-read-11`, `g-reading-6` |
| P-48 | Improvisation outside jazz (RSL keys pop / blues / rock) | SHALLOW | `k-solo` is jazz-only; `jazz-3` blues / pentatonic scales |

### 1.3 Priority build list (piano)

1. **`k-pop` / `k-gospel` family (P-36–P-38).**
   - Gospel walk-ups, 7-3-6-2-5-1, plagal "Amen", the 1-4-1 with passing dim, the "shout" in 16ths.
   - Pop ballad LH over 6 common progressions with sus/add9/slash voicings.
   - All 12 keys.
   - This is the biggest hole for the "pop as on-ramp" positioning.
2. **`k-groove` style family (P-39–P-45), one ladder per style, 4–6 levels each.**
   - Funk/clav 16ths.
   - Reggae skank and bubble.
   - Rock'n'roll 8ths and triplets.
   - New Orleans tresillo.
   - Neo-soul.
   - Each one played over the band timeline the bass and drums already use (`bandTimeline.ts`).
3. **Montuno / guajeo ladder (P-41).** 2-3 and 3-2 clave, the cha-cha and son patterns, tumbao LH, montuno over a ii–V–I and a I–IV–V, locked against the `d-latin` clave track.
4. **Classical etude block (P-10, P-12, P-13, P-15).**
   - Tremolo (chord and octave, measured evenness).
   - A Czerny velocity ladder with 6–8 figurations.
   - Cortot rhythm variants applied to arpeggios and Hanon.
   - Ornaments inside short Baroque phrases.
5. **Sight-reading ladder by grade (P-20).** 8 levels; key signatures up to 6♯/♭; bass clef and LH; ABRSM-style time limits.
6. **Clusters and locked hands on heads (P-27, P-28).** Add `cluster` and `locked` to `ChartVoicing` so every chart and tune can use them.
7. **Intros and endings catalogue (P-34)** in 12 keys, applied on standards.

### 1.4 Game ideas (piano)

- **Tremolo Meter.** Hold an octave tremolo for 8 bars; a needle shows evenness (inter-onset spread) and loudness drift. Beat your best "flatness" score.
- **Gospel Walk-Up Runner.** The band plays a gospel I–IV. You must land each walk-up exactly on the chord change, and the runner jumps a gap if you do. The keys climb chromatically each round (organ-shout modulation).
- **Clave Lock.** A montuno against a clave track. The screen shows a ring that turns green when your syncopations sit on the clave's side (2-3 or 3-2); the clave flips side without warning.
- **Cortot Roulette.** Each pass of a scale or arpeggio gets a random rhythm variant (dotted, reverse-dotted, triplet, accent on 3). You keep the streak while the variant changes.
- **Sight-Reading Speed-Run.** 8 unseen bars at the grade; score = accuracy × tempo; one look only (the bars hide after the count-in).
- **Style Switch.** The band changes style every 8 bars (pop ballad → funk → reggae → gospel); keep a fitting LH pattern going.

---

## 2. Guitar

### 2.1 Master checklist and sources

- Leavitt, *A Modern Method for Guitar* (Berklee, vols 1–3): reading by position, scales and arpeggios in positions, chord forms, rhythm guitar.
- Goodrick, *The Advancing Guitarist*: one-string playing, mapping the neck, intervallic studies, triads on string sets, modes.
- Joe Pass (*Joe Pass Guitar Style*, chord-melody books): chord-melody, walking bass with chords, substitutions.
- Jimmy Bruno: CAGED / five positions, picking.
- Mimi Fox: arpeggios, rhythmic displacement, chord-melody.
- RSL / Rockschool and Trinity Rock & Pop guitar technical work: scales, arpeggios, chords, quick study, ear tests, improvisation, style pieces.
- Classical: Segovia scales, Carlevaro *Cuadernos* (RH arpeggios, LH ligados, fixation), Giuliani 120 RH arpeggios, tremolo, campanella, harmonics.
- Style rhythms: funk, reggae / ska, country, metal, Latin (bossa, samba, son montuno, guajeo), jazz comping (Freddie Green, Wes octaves and block chords), gypsy jazz *la pompe*, slide, open tunings.

### 2.2 Items

| # | Item (source) | Status | Evidence / gap |
|---|---|---|---|
| G-1 | Chromatic, permutations, spider | EXISTS-DEEP | `g-fretting` 1–6 `guitar.ts:2497-2502` |
| G-2 | Alternate / economy / 3nps picking, string crossing | EXISTS-DEEP | `g-picking` 1–3, 9 `guitar.ts:2505-2507`, `guitarCore2.ts:938` |
| G-3 | Sweep picking | EXISTS-DEEP | `g-picking` 6, 8 `guitar.ts:2510`, `guitarCore2.ts:937` |
| G-4 | Hybrid / chicken picking | EXISTS-DEEP | `g-picking` 7, 10 `guitar.ts:2511`, `guitarTech.ts:279` |
| G-5 | Legato, trills, tapping | EXISTS-DEEP | `g-legato` 1–8 `guitar.ts:2514-2519`, `guitarCore2.ts:941-942` |
| G-6 | Pentatonic boxes, CAGED, 3nps, modes in position | EXISTS-DEEP | `g-scales` 1–10 `guitar.ts:2522-2528`, `guitarCore2.ts:922-924` |
| G-7 | Arpeggios (CAGED triads, 7ths, 9ths, upper structures) | EXISTS-DEEP | `g-arps` 1–7 `guitar.ts:2531-2535`, `guitarCore2.ts:950-951` |
| G-8 | Open, barre and power chords; changes | EXISTS-DEEP | `g-chords` 1–7 `guitar.ts:2538-2544` |
| G-9 | Triads on string sets, voice leading (Goodrick, Bruno) | EXISTS-DEEP | `g-arps-3`; `g-vl` 1–3; `g-harm` 5 |
| G-10 | Bends, vibrato, slides, double stops (RSL lead) | EXISTS-DEEP | `g-lead` 1–10 `guitar.ts:2556-2562`, `guitarCore2.ts:932-934` |
| G-11 | Reading by position (Leavitt) | EXISTS-DEEP | `g-reading` 1–5, 7 `guitar.ts:2638-2642`, `guitarCore2.ts:946` |
| G-12 | Rhythm charts, hits, lead sheets (RSL quick study) | SHALLOW | `g-reading` 6, 8 `guitarCore2.ts:945` and onward: 2 levels in 4–5 keys |
| G-13 | Strumming basics: pop, rock, acoustic, picked arpeggios | EXISTS-DEEP | `g-rhythm` 1–2, 8 `guitar.ts:2547-2548`, `guitarCore2.ts:927` |
| G-14 | Funk rhythm (16ths, ghosts, stabs, Nile Rodgers) | SHALLOW | `g-rhythm-5` `guitar.ts:2551` only (4 keys) |
| G-15 | Reggae / ska (skank, bubble, one-drop) | SHALLOW | `g-rhythm-4` `guitar.ts:2550` only (4 keys) |
| G-16 | Country: boom-chick, Travis, chicken, hybrid | SHALLOW | `g-rhythm-3` (shared with blues), `g-fingerstyle-4`, `g-picking` 7, 10; one level each |
| G-17 | Metal rhythm: gallop, chugs, drop D, palm muting | SHALLOW | `g-rhythm-7` `guitar.ts:2553` only |
| G-18 | Bossa nova comping | SHALLOW | `g-rhythm-6` `guitar.ts:2552` (12 keys via `keys12.ts:36`), one level |
| G-19 | Samba batida, son montuno / guajeo (Afro-Cuban guitar) | MISSING | No "samba", "guajeo" or "montuno" in `guitar*.ts` (grep) |
| G-20 | Blues shuffle rhythm and blues lead | SHALLOW | `g-rhythm-3`, `g-lead-7` (B.B. King box), `g-rhythm-11` mixed riffs |
| G-21 | Jazz comping: shells, drop 2/3, Freddie Green four | EXISTS-DEEP | `g-jazz` 1–4, 8, 13 `guitar.ts:2580-2583`; Freddie Green `guitar.ts:309,1331` |
| G-22 | Wes octaves and Wes block chords | SHALLOW | Octaves = `g-lead-11` `guitarTech.ts:278` only; no Wes block-chord (melody + drop 2 alternating) level |
| G-23 | Chord-melody (Pass) | EXISTS-DEEP | `g-cmel` 1–6; `g-jazz-10`; `g-tune-6` |
| G-24 | Walking bass with chords (Pass) | SHALLOW | `g-jazz` 6, 12 `guitar.ts:2585` and onward: 2 levels, no tune |
| G-25 | Bebop and Harris lines | EXISTS-DEEP | `g-bebop` 1–12; `g-harris` 1–13; `g-harrisline` 1–10 |
| G-26 | Improvising: target notes, trading | EXISTS-DEEP | `g-impro` 1–7 `guitar.ts:2663-2666`, `guitarCore2.ts:954-956`; `g-solo` 1–10 |
| G-27 | Ear: recall, roots, quality, transcribe | EXISTS-DEEP | `g-ear` 1–13 |
| G-28 | Fingerstyle p-i-m-a, Travis | SHALLOW | `g-fingerstyle` 1–4 `guitar.ts:2565-2568`; Travis = one level in 5 keys |
| G-29 | Giuliani 120 RH arpeggios | SHALLOW | One `g-fingerstyle-3` "Giuliani-style" `guitar.ts:2567` (3 keys) |
| G-30 | Segovia scales (all keys, 3 octaves) | SHALLOW | One `g-scales-11` `guitarTech.ts:275` |
| G-31 | Carlevaro RH and LH (ligados, fixation, RH arpeggio cells) | SHALLOW | Ligados inside `g-fingerstyle-5` `guitar.ts:2569`; no "Carlevaro" (grep) |
| G-32 | Tremolo p-a-m-i, campanella, rest / free stroke | SHALLOW | `g-fingerstyle` 5–6 `guitar.ts:2569-2570` |
| G-33 | Flamenco: rasgueado, picado, alzapúa, compás | SHALLOW | `g-flamenco` 1–5 `guitar.ts:2573-2577`; four palos in one level (`-5`) |
| G-34 | Artificial and harp harmonics (classical) | MISSING | No "artificial" in `guitar*.ts` (bass has `b-ext-3`) |
| G-35 | Slide / bottleneck | MISSING | none |
| G-36 | Open / alternate tunings (open G/D, DADGAD) | MISSING | Only drop D inside `g-rhythm-7` |
| G-37 | Gypsy jazz *la pompe* | MISSING | none |
| G-38 | Goodrick one-string playing, intervallic mapping | SHALLOW | One-string scales inside `g-scales-6`; intervals `g-scales-12` `guitarTech.ts:276` |
| G-39 | Odd meter, prog, metric modulation | EXISTS-DEEP | `g-prog` 1–8; `g-meter` 1–6 |
| G-40 | Neo-soul (Mayer / Hendrix double stops, triads) | SHALLOW | `g-rhythm-9` `guitarCore2.ts:928` only |
| G-41 | Mizrahi (maqsum strum, Hijaz fills) | SHALLOW | `g-rhythm-10` `guitarCore2.ts:929` only; the local market's style deserves a ladder |
| G-42 | African guitar (highlife, soukous) | MISSING | none (low priority) |

### 2.3 Priority build list (guitar)

1. **One style ladder per rhythm style (G-14–G-20, G-40, G-41).** 4–6 levels each in all keys:
   - basic pattern → variations → with the band → stops and hits → a style song.
   - Styles: funk, reggae, country, metal, blues, bossa, neo-soul, Mizrahi.
   - The bass already has this (`b-styles` + stylistic studies).
2. **Latin guitar (G-19).** Son montuno / guajeo with clave, samba batida, partido alto.
3. **Wes block chords and octaves on a head (G-22).** Then walking bass with chords through a blues and a standard (G-24).
4. **Classical block (G-29–G-32, G-34).**
   - A Giuliani ladder: 12–20 of the 120 RH formulas, grouped.
   - Segovia scales in all keys.
   - Carlevaro RH cells.
   - Artificial harmonics.
5. **Open tunings and slide (G-35, G-36).** Open G/D, DADGAD and slide intonation (cents-graded; slide pitch is measurable on the mic).
6. **Gypsy jazz *la pompe* (G-37).** Fits the jazz add-on; the strum timing is measurable.

### 2.4 Game ideas (guitar)

- **Slide Darts.** Slide to a target pitch and land within ±15 cents; the closer, the closer to the bull's-eye. Vibrato on the target counts as a bonus.
- **Genre Jukebox.** The band switches style every 4 bars (reggae → funk → country → metal); you must switch the strum pattern. Scored on the strum grid and muting.
- **Pompe Engine.** A metronome train for *la pompe*: the short "chk" on 2 and 4 keeps the train moving; late chunks slow it down.
- **Giuliani Slot.** Each spin draws one of the 120 RH formulas over a chord pair; play 2 bars clean to cash out.
- **Open-Tuning Puzzle.** A chord diagram appears in DADGAD; find the shape by ear and play it within a time limit.
- **Clave Detective (with bass and drums).** The guajeo must sit on the right clave side; the track flips sides mid-song.

---

## 3. Bass

### 3.1 Master checklist and sources

- Rufus Reid, *The Evolving Bassist* (from the method's known contents):
  - physical position and tone (ch. 1–2);
  - scales and arpeggios;
  - walking: two-feel, broken feel, playing in 3;
  - Latin; soloing; transcriptions (ch. 8).
- Ed Friedland, *Building Walking Bass Lines* and *Expanding Walking Bass Lines*: roots → chord tones → approach notes → standards → two-feel, waltz, up-tempo.
- Berklee bass method (Rich Appleman); John Patitucci (scales in all keys, soloing, 6-string); Ray Brown's method (scales and arpeggios, bowing studies).
- RSL / Rockschool bass: technical exercises (scales, arpeggios, fingerstyle, pick, slap), quick study, ear tests, improvisation, style studies.
- Upright: Simandl (positions, bowing), arco (strokes), jazz pizz.
- Styles: Motown, disco, reggae/dub, funk, slap, gospel, country two-beat, Afro-Cuban, Brazilian, Afrobeat.

### 3.2 Items

| # | Item (source) | Status | Evidence / gap |
|---|---|---|---|
| B-1 | Plucking hand: rest strokes, raking, 3-finger, thumb | EXISTS-DEEP | `b-pluck` 1–12 `bass.ts:2554-2566` |
| B-2 | Fretting hand: OFPF, Simandl 1-2-4, shifts | EXISTS-DEEP | `b-fret` 1–8 |
| B-3 | Time and subdivision, displaced click | EXISTS-DEEP | `b-time` 1–13 |
| B-4 | Chord tones and arpeggios (Reid, Patitucci) | EXISTS-DEEP | `b-chord` 1–14. Note: levels 1, 7, 10–12, 14 sit in 6 keys (not on the 12-key list) |
| B-5 | Scales and modes in positions | EXISTS-DEEP | `b-scale` 1–11 |
| B-6 | Muting and note length | EXISTS-DEEP | `b-length` 1–7 |
| B-7 | Pocket with the drums | EXISTS-DEEP | `b-pocket` 1–8 |
| B-8 | Reading: bass clef, positions, charts, Nashville | EXISTS-DEEP | `b-read` 1–13 `bass.ts:2676-2689`; `b-posread` 1–6 |
| B-9 | Rock / pop / Motown / disco styles (RSL) | SHALLOW | `b-styles` 1–5 `bass.ts:2701-2705`: one level per style in 6 keys |
| B-10 | Reggae / dub (one-drop, steppers, rockers) | SHALLOW | `b-styles-6` `bass.ts:2706` only |
| B-11 | Funk, ghosts, Jaco-style 16ths | EXISTS-DEEP | `b-ghost` 1–6 `bass.ts:2721-2726`; `b-styles` 10, 16 |
| B-12 | Slap and pop | EXISTS-DEEP | `b-slap` 1–8 `bass.ts:2811-2818` |
| B-13 | Pick technique | EXISTS-DEEP | `b-pick` 1–10 `bass.ts:2796-2804`, `bassNiche2.ts:556-557` |
| B-14 | Walking (Friedland ladder), waltz | EXISTS-DEEP | `b-walk` 1–20 `bass.ts:2729-2747`, `bassNiche2.ts:504-505` |
| B-15 | Swing time, up-tempo | EXISTS-DEEP | `b-swing` 1–7 `bassNiche.ts:1111-1117` |
| B-16 | Two-feel, broken feel, ballad (Reid) | SHALLOW | `b-walk` 1, 14; `b-jform-1`. No "broken time" / ballad-feel ladder |
| B-17 | Afro-Cuban and Brazilian | EXISTS-DEEP | `b-latin` 1–9 `bassNiche.ts:1141-1149` |
| B-18 | Soloing (Reid, Patitucci) | EXISTS-DEEP | `b-impro` 1–18; `b-solo` 1–8 |
| B-19 | Harmonics, tapping, chords, fretless | EXISTS-DEEP | `b-ext` 1–9; `b-legato` 5 |
| B-20 | Upright: Simandl positions, thumb position | SHALLOW | `b-up-pos` 1–6 `bass.ts:2931-2936`: one key each, ♩50–72 |
| B-21 | Arco bow strokes (détaché, slurs, hooked, spiccato) | SHALLOW | `b-up-arco` 1–9 `bass.ts:2939-2948`; no spiccato / sautillé / martelé (grep) |
| B-22 | Upright scales and arpeggios in all keys (Ray Brown / Simandl) | SHALLOW | `b-up-scales` 1–10: 1–4 keys per level |
| B-23 | Jazz pizz sound / sustain | SHALLOW | `b-up-pizz` 1–4 |
| B-24 | Ear: recall, transcription, form | EXISTS-DEEP | `b-ear` 1–23 `bass.ts:2615` and onward |
| B-25 | Odd meters, prog, polymeter | EXISTS-DEEP | `b-odd`, `b-prog`, `b-poly` |
| B-26 | Country two-beat, train, walk-ups (RSL, Nashville) | MISSING | No "country" / "two-beat" in `bass*.ts` (grep) |
| B-27 | Afrobeat / highlife | MISSING | none (low priority) |
| B-28 | Gospel bass | SHALLOW | `b-styles` 11, 14 only |
| B-29 | 5/6-string, low B | EXISTS-DEEP | `b-walk-17`, `b-styles-14`, `b-scale-11` |
| B-30 | The bass reharmonises (pedals, counter-line) | EXISTS-DEEP | `b-counter` 1–10 |
| B-31 | R&B / neo-soul / hip-hop bass (laid-back, synth-bass lines) | SHALLOW | `b-styles-11` "Gospel / neo-soul" only |
| B-32 | Latin jazz / bossa standards | EXISTS-DEEP | `b-latin-9`; `b-std-3`; `b-jform-6` |

### 3.3 Priority build list (bass)

1. **Style ladders (B-9, B-10, B-28, B-31).** As for guitar, 4 levels per style instead of one, and in 12 keys. Add `b-styles` (and `b-chord`) to `keys12.ts` or widen per level.
2. **Country bass (B-26).** Two-beat, walk-ups between I–IV–V, train beat, Nashville numbers with a capo'd key.
3. **Broken feel / ballad ladder (B-16).** Ballad in 2, broken time with skips, then into 4.
4. **Upright depth (B-20–B-23).** Scales and arpeggios in all 12 keys, arco strokes (spiccato, martelé), a pizz-sustain meter.

### 3.4 Game ideas (bass)

- **Feel Switcher.** The bandleader calls "2!", "4!", "broken!" at random; switch feel on the next bar. Points for the clean switch and the downbeat.
- **Walk-Up Tag (country).** Land every walk-up on the chord change; streaks unlock faster tempos.
- **Sustain Meter (upright pizz).** Each quarter should ring until the next; a bar fills with the note's length, and gaps break the chain.
- **Bow Evenness.** Long bows on open strings; a flat-line target for loudness. Too much swell or fade costs points.
- **Groove Gauntlet.** Eight styles in one song (Motown → disco → reggae → funk → gospel); keep the pocket against the kick in each.

---

## 4. Drums

### 4.1 Master checklist and sources

- The 40 PAS International Drum Rudiments (pas.org), in four families:
  - **Rolls**: single stroke roll / four / seven; multiple bounce; triple stroke; double stroke open; 5, 6, 7, 9, 10, 11, 13, 15, 17-stroke rolls.
  - **Paradiddles**: single, double, triple, paradiddle-diddle.
  - **Flams**: flam, flam accent, flam tap, flamacue, flam paradiddle, single flammed mill, flam paradiddle-diddle, pataflafla, Swiss army triplet, inverted flam tap, flam drag.
  - **Drags**: drag, single drag tap, double drag tap, lesson 25, single dragadiddle, drag paradiddle 1 and 2, single / double / triple ratamacue.
- Stone, *Stick Control*: single-beat combinations, triplets, short roll and flam beats.
- Reed, *Syncopation*: reading, and the classic interpretations (snare line as kick, jazz ride + comping, triplet interpretation).
- Chapin, *Advanced Techniques for the Modern Drummer*: jazz independence, comping figures under ride and hat.
- Riley, *The Art of Bop Drumming*: ride, comping, set-ups, trading, broken time.
- Garibaldi, *Future Sounds*: linear funk.
- Latin / Afro-Cuban: clave, cascara, cha-cha, mambo, bembé, songo, mozambique. Brazilian: bossa, samba, baião, partido alto. Caribbean: calypso / soca, merengue, reggaeton / dembow.
- Brushes: sweeps, ballad, medium swing, up-tempo, waltz.
- RSL / Rockschool drums: grade technical exercises (rudiments up to pataflafla and single / double / triple ratamacues at grade 8), grooves, fills, quick study, ear tests, improvisation, double bass.

### 4.2 Items

| # | Item (source) | Status | Evidence / gap |
|---|---|---|---|
| D-1 | Single-stroke roll / four / seven (PAS 1–3) | EXISTS-DEEP | `d-rolls` 1, 2, 5, 8, 9 `drums.ts:943-951` |
| D-2 | Multiple-bounce (buzz) roll, triple-stroke roll (PAS 4–5) | MISSING | No "buzz", "bounce", "press roll" or "triple stroke" in `drum*.ts` (grep) |
| D-3 | Double-stroke roll; 5, 7, 9-stroke (PAS 6, 7, 9, 10) | EXISTS-DEEP | `d-rolls` 3, 4, 6, 10 `drums.ts:945-952` |
| D-4 | 6, 10, 11, 13, 15, 17-stroke rolls (PAS 8, 11–15) | SHALLOW | 6-stroke only, inside `d-prog-9` `drums.ts:1125`; the others are missing |
| D-5 | Paradiddle family incl. triple (PAS 16–19) | SHALLOW | `d-diddles` 1–4 `drums.ts:955-958`; no triple paradiddle (grep) |
| D-6 | Flam rudiments (PAS 20–30) | SHALLOW | 5 of 11: flam, flam accent, flam tap, flam paradiddle, Swiss (`d-diddles` 5, 6, 8 `drums.ts:960-963`). Missing: flamacue, single flammed mill, flam paradiddle-diddle, pataflafla (RSL grade 8), inverted flam tap, flam drag |
| D-7 | Drag rudiments (PAS 31–40) | SHALLOW | 3 of 10: drag, single drag tap, single ratamacue (`d-diddles` 7, 9 `drums.ts:962-964`). Missing: double drag tap, lesson 25, dragadiddle, drag paradiddles 1 and 2, double and triple ratamacue (RSL grade 8) |
| D-8 | Stroke types, Moeller, accent / tap, dynamics | EXISTS-DEEP | `d-strokes` 1–8 `drums.ts:932-940`; Moeller-style `drumMore.ts:74` |
| D-9 | *Stick Control* single-beat combinations | SHALLOW | Moving accent (`d-strokes-5`) and paradiddles only; no systematic sticking-permutation pages ("Stick Control" grep empty) |
| D-10 | *Syncopation* reading | EXISTS-DEEP | `d-read` 1–11 `drums.ts:1000-1011` |
| D-11 | Reed interpretations (kick line, jazz ride + comp, triplet reading) | SHALLOW | `d-indep` 2–4 `drums.ts:1036-1038`, "Reed-style idea" `drums.ts:690`; no "same page, five interpretations" ladder |
| D-12 | Chapin jazz independence | SHALLOW | `d-jazz` 4, 5 `drums.ts:1081-1082`; `d-indep-6`. No systematic triplet-partial permutations for snare, kick, then both |
| D-13 | Riley bop: ride, comping, set-ups, trading, 2-feel, broken time | EXISTS-DEEP | `d-jazz` 1–12 `drums.ts:1078-1090` |
| D-14 | Brushes | SHALLOW | `d-jazz-9` `drums.ts:1087` only; the sweep is "shown, never scored" `drumJazz.ts:2` |
| D-15 | Linear grooves (Garibaldi) | SHALLOW | `d-prog-7` `drums.ts:1123` only |
| D-16 | Rock / pop grooves and feels | EXISTS-DEEP | `d-rock` 1–9 `drums.ts:979-987` |
| D-17 | Funk, ghosts, half-time shuffle, go-go, boom-bap | EXISTS-DEEP | `d-funk` 1–8 `drums.ts:1015-1022` |
| D-18 | Shuffle, 12/8, one-drop, steppers | EXISTS-DEEP | `d-shuffle` 1–8 `drums.ts:1025-1032` |
| D-19 | Fills and landing | EXISTS-DEEP | `d-fills` 1–8 `drums.ts:990-997` |
| D-20 | Feet, double bass | EXISTS-DEEP | `d-feet` 1–8 `drums.ts:1057-1064` |
| D-21 | Afro-Cuban (clave → mozambique) | EXISTS-DEEP | `d-latin` 3–6, 8–10 `drums.ts:1095-1103`; 8–10 marked `needsTeacherCheck` (`drumLatin2.ts:40`) |
| D-22 | Brazilian: bossa, samba, baião; partido alto, maracatu | SHALLOW | `d-latin` 1, 2, 7; no partido alto or maracatu for drums (grep "partido" in `drum*.ts` empty) |
| D-23 | Caribbean: calypso / soca, merengue, reggaeton / dembow | MISSING | none (grep) |
| D-24 | Middle Eastern / Mizrahi | EXISTS-DEEP | `d-mideast` 1–9 `drums.ts:1045-1054` |
| D-25 | Odd meters, polymeter, metric modulation, cross-rhythms | EXISTS-DEEP | `d-prog` 1–11 `drums.ts:1117-1128`; `d-count` |
| D-26 | Reading and notation | EXISTS-DEEP | `d-read`, `d-notation`, `d-count` |
| D-27 | Drummer's ear | EXISTS-DEEP | `d-ear` 1–8 `drums.ts:1068-1075` |
| D-28 | Song form, road maps, dynamics arc | EXISTS-DEEP | `d-song` 1–8 `drums.ts:1107-1114`; `d-form` 1–5 |
| D-29 | Metal blast beats | MISSING | "blast" grep empty; gallops exist (`d-feet-8`) |
| D-30 | Drum'n'bass / breakbeat, gospel chops | MISSING | none |
| D-31 | Country train beat, two-beat | MISSING | none |
| D-32 | Rudiments orchestrated on the kit | SHALLOW | `d-diddles-10` `drums.ts:965` only (paradiddle) |
| D-33 | Time: gap click, offbeat click, pocket | EXISTS-DEEP | `d-time` 1–9 `drums.ts:968-976` |
| D-34 | Hand technique: push-pull, finger control, free stroke | SHALLOW | Accent / tap and Moeller only; no push-pull or finger-control ladder (grep "Gladstone", "free stroke" empty) |
| D-35 | Soloing over an ostinato / vamp (RSL improvisation) | SHALLOW | `d-fills-8` free fill; `d-jazz-8`, `-12` trading; no long solo over a band vamp or ostinato |

### 4.3 Priority build list (drums)

1. **Complete the 40 PAS rudiments (D-2, D-4–D-7).** About 22 to add, as a `d-rudiments` family:
   - buzz roll (graded by onset density and evenness);
   - triple-stroke roll; 10/11/13/15/17-stroke rolls; triple paradiddle;
   - the 6 missing flam rudiments and the 7 missing drag rudiments.
   - Each ladders in tempo.
   - Mic-pad mode works for all of them (single surface).
   - Pataflafla and double / triple ratamacue are needed for RSL grade 8.
2. **Stick Control and Reed interpretations (D-9, D-11).**
   - Generated permutation pages, 8th and triplet.
   - One *Syncopation*-style line with 5 interpretations: snare, kick, jazz comp under the ride, triplet fill-in, rock with the line on the kick.
3. **Chapin ladder (D-12).** Snare, then kick, then both on triplet partials under ride + hat, 12–16 levels.
4. **Brushes (D-14).**
   - Score the taps and the hat foot.
   - Sweep scoring can come later, from the microphone's broadband noise envelope.
   - Add medium swing, up-tempo and waltz brush levels.
5. **Missing styles (D-23, D-29–D-31).** Reggaeton / dembow (big in Israeli pop), blast beat, train beat, DnB.

### 4.4 Game ideas (drums)

- **Rudiment Slot Machine.** Three reels: rudiment (from all 40) × accent pattern × subdivision. Play 4 bars clean to win; the tempo steps up each win.
- **Buzz Smoothness Meter.** Hold a buzz roll from pp to ff and back; a ribbon shows onset density (more = smoother). Gaps snap the ribbon.
- **Reed Interpreter.** One line of reading, five interpretations called at random every 4 bars. Score = right interpretation × timing.
- **Stick Control Page Turner.** A page of 24 combinations scrolls at tempo; miss three in a row and the page stops.
- **Clave Keeper.** Hold the clave with the left foot or cross-stick while the band changes styles (son → rumba → bossa); a ring shows the 2-3 / 3-2 side.
- **Pataflafla Boss.** A grade-8 "boss" rudiment at the end of each world: flam rudiments must reach the target tempo on 2 days to beat it.

---

## 5. Voice

### 5.1 Master checklist and sources

- CVT (Complete Vocal Technique): the four modes, Neutral, Curbing, Overdrive and Edge (formerly "Belting"); twang; vowel restrictions per mode.
- Estill basics: onsets (glottal / aspirate / simultaneous), twang, anchoring, thyroid tilt (speech vs sob).
- SLS: semitone-ladder exercises across the bridge ("mum", "nay", lip trill, the mix).
- SOVT (straw, lip trill).
- Breath: appoggio, long "sss", phrase planning.
- Vocal jazz: Bob Stoloff, *Scat!* (rhythmic and melodic considerations, melodic solos, vocal bass lines, vocal drum articulations, solo a cappella, sing-along patterns, vocal drum grooves). Michele Weir, *Vocal Improvisation* (scat over changes, guide tones).
- Berklee voice; ABRSM singing (scales and arpeggios, sight-singing, aural, vocalises such as Vaccai / Concone); RSL vocals (technical exercises, quick study, improvisation, style songs).
- Skills: sight-singing (solfège), range building, belting and mixed voice, vibrato, runs and riffs, ornaments, harmony, diction.

### 5.2 Items

| # | Item (source) | Status | Evidence / gap |
|---|---|---|---|
| V-1 | Posture, breath support, sustain, breath plan | EXISTS-DEEP | `v-breath` 1, 601–605 `voiceFamilies.ts:184-206`; `v-first` 2101 |
| V-2 | SOVT (straw, lip trill) | SHALLOW | One level, 2102 `voiceFamilies.ts:441,573` |
| V-3 | Pitch matching, drone tuning, drift | EXISTS-DEEP | `v-pitch` 2, 7, 701–705 |
| V-4 | Range extension, sirens | EXISTS-DEEP | `v-range` 4, 6, 801–804 `voiceFamilies.ts:208-225` |
| V-5 | Register bridging / mixed voice (SLS, passaggio) | SHALLOW | Siren and terraced scale through the break (801–802). The register itself is never scored (`voiceCourse.ts:44`) |
| V-6 | CVT modes / belt / twang | MISSING | Colour "never scored" (`voiceCourse.ts:102`); no exercise even unscored |
| V-7 | Onsets (Estill: glottal / aspirate / simultaneous) | MISSING | "onset" appears only as timing in `voiceGrade.ts` and similar |
| V-8 | Vowels and diction (consonants on time, vowel modification) | MISSING | No "diction"; vowels in lessons only (`content/mini/voice.ts`) |
| V-9 | Vibrato (onset, rate, width, on / off, jazz) | EXISTS-DEEP | `v-vib` 3, 10, 11, 1001–1005 |
| V-10 | Dynamics, messa di voce | EXISTS-DEEP | `v-dyn` 901, 5, 902–904 |
| V-11 | Agility: runs, riffs, melisma (gospel / R&B, Baroque) | SHALLOW | `v-agility` = 2 bebop-line songs (`voiceFamilies.ts:176-179`); runs only in lesson 14 (`lesson.ts:1453`, 60/80/100 % ladder), not a family |
| V-12 | Semitone-ladder patterns across the range (SLS, every studio) | SHALLOW | Items sit at a fixed range position (`vocal.ts:1284` `atRange`); no "repeat a pattern up by half steps until it breaks" ladder |
| V-13 | Scales, modes, arpeggios sung | EXISTS-DEEP | `v-scale` (MODE_LEVELS `vocal.ts:846`, ARPEGGIO_LEVELS 2001) |
| V-14 | Sight-singing (solfège, bass clef, chromatic, lead sheet) | EXISTS-DEEP | `v-sight` 401–405 (`vocal.ts:1104`), 1901–1904 |
| V-15 | Intervals, audiation | EXISTS-DEEP | `v-ear` 1203, 8, 1204, 1201, 1205, 1202, 1206, 1207 |
| V-16 | Harmony singing | EXISTS-DEEP | `v-harmony` 201–205 (`vocal.ts:922`), 1701–1703 |
| V-17 | Classical ornaments (grace, mordent, turn, trill) | EXISTS-DEEP | ORNAMENT_LEVELS `vocal.ts:1271-1276` |
| V-18 | Pop inflections (scoops, falls, blue notes, cry) | SHALLOW | 1801–1802 only |
| V-19 | Time feel, swing, back-phrasing, odd meters | EXISTS-DEEP | `v-time`, 14 levels |
| V-20 | Songs, standards, ballads, colla voce | EXISTS-DEEP | `v-songs`, `v-standards` |
| V-21 | Scat: rhythmic and melodic (Stoloff) | EXISTS-DEEP | `v-scat` 1501–1510. Syllables themselves are not graded |
| V-22 | Stoloff vocal bass lines, vocal drum grooves | MISSING | none (the bass line is pitch + time, so it is measurable) |
| V-23 | Improvising over changes (Weir: guide tones, approach) | EXISTS-DEEP | 1502–1505 |
| V-24 | Barry Harris lines sung | SHALLOW | `v-barry` 301–310 (`vocal.ts:970`); the note sources carry "(verify)" flags (`vocal.ts:1004,1010`, `harrisLines.ts:11-17`) |
| V-25 | Classical vocalises (Vaccai / Concone), legato line | MISSING | none |
| V-26 | Maqam microtones | SHALLOW | 704 only |
| V-27 | Tempo ladder for sung exercises (criterion b) | SHALLOW | Fixed bpm per item; only 1601 → 1602 raises the tempo |
| V-28 | Warm-up / cool-down routine, vocal health | MISSING | No warm-up routine (grep "warm-up" empty in the voice engine) |
| V-29 | Performance take, my song | EXISTS-DEEP | 1307, 1308 |

**APP-WRONG (label).** Family `v-agility` is titled "Agility & bebop lines" / "גמישות וקווי ביבופ" (`voiceFamilies.ts:500`). It contains only two bebop-line song levels (`voiceFamilies.ts:176-179`) and no agility work: no runs, no fast scales, no melisma. Either rename it "Bebop lines" or fill it per V-11.

### 5.3 Priority build list (voice)

1. **Agility family for real (V-11).**
   - Move lesson 14's runs into `v-agility`.
   - Pentatonic and blues runs, gospel and R&B riffs, Baroque melisma (Handel-style), fast major and minor scales.
   - Each with a 60 → 80 → 100 → 120 % tempo ladder (fixes V-27 too).
2. **Semitone-ladder warm-ups (V-12, V-2, V-5, V-28).**
   - A pattern (5-note scale, 1-3-5-8-5-3-1, lip trill, straw siren) moves up and down by half steps across the measured range.
   - Score: pitch per step plus how far up it stays clean.
   - This also gives a daily warm-up / cool-down routine.
3. **Vocal bass lines and vocal drums (V-22).** Sing a walking line against the band (pitch + time, already measurable); beatbox grooves graded on onset timing.
4. **Onsets, vowels and diction (V-7, V-8)** as timing-measurable items:
   - aspirate vs glottal onset detected by the attack envelope;
   - consonants placed on the beat, from onset detection.
   - Colour stays unscored, as the owner decided; CVT modes (V-6) stay lesson-only.
5. **Classical vocalises (V-25).** 8–10 Vaccai-style legato lines on the band, graded on legato (no gaps) and pitch.

### 5.4 Game ideas (voice)

- **Semitone Elevator.** The pattern rides an elevator up a half step per floor. Stay in tune to keep riding; your top floor today is shown against last week's.
- **Run Catcher.** A run is played at 60 %; echo it. Each catch speeds it up (80 → 100 → 120 %), and the fastest clean catch goes on the board.
- **Bass-Man.** You are the band's bass player: sing a walking line under a recorded head; the band drops out if you lose the form.
- **Straw Siren Race.** A straw siren across the range in one breath; the glide must stay smooth (no pitch jumps) and reach the top.
- **Consonant Drummer.** A rhythmic lyric; the "t", "k" and "p" must hit the grid like a drummer's hits (onset timing only).
- **Messa Meter.** Swell and fade on one note; the loudness curve must match the target arc.

---

## 6. Cross-instrument priority (what to build first)

1. **Drums: the 40 PAS rudiments** (D-2, D-4–D-7). The list is closed, the items are mic-pad measurable, and RSL grade 8 needs them.
2. **Keys: pop and gospel** (P-36–P-38). This is the on-ramp for the "pop → jazz" positioning, and none of it is there today.
3. **Guitar and bass: style ladders.** One level per style today → 4–6 per style (G-14–G-20, B-9–B-10).
4. **Voice: agility and semitone ladders** (V-11, V-12), which also fixes the `v-agility` label.
5. **Latin across the band.** Piano montuno (P-41), guitar guajeo / samba (G-19), Caribbean drums (D-23), all locked to one clave track.
6. **Classical block.** Piano tremolo / Czerny / Cortot / ornaments (P-10–P-15); guitar Giuliani / Segovia / Carlevaro (G-29–G-31).
7. **Verify the Harris "(verify)" note-sets** against the workbook before more content builds on them (`harrisLines.ts`).

---

## Sources

- PAS rudiment categories: [pas.org/rudiments](https://pas.org/rudiments/). The 40 names are from the PAS chart, which the page links as a PDF.
- RSL / Rockschool drums: [Drums Technical Handbook](https://www.rslawards.com/products/drums-technical-handbook/), [Drums Grade 8](https://www.rslawards.com/products/drums-grade-8/), [2012 syllabus guide](https://cloud.rslawards.com/file/download/RockschoolDrums2012SyllabusNEW.pdf).
- CVT four modes: [completevocalinstitute.com](https://completevocalinstitute.com/complete-vocal-technique/), [cvtresearch.com vocal modes](https://cvtresearch.com/vocal-modes/general/).
- Stoloff *Scat!* chapters: [singers.com](https://singers.com/shop/Scat-Vocal-Improvisation-Techniques/); [Berklee "Scatting Without Fear"](https://berklee.edu/node/2280366).
- Levine *The Jazz Piano Book*: [Wikipedia](https://en.wikipedia.org/wiki/The_Jazz_Piano_Book), [Sher Music](https://www.shermusic.com/0961470151.php).
- Rufus Reid *The Evolving Bassist*: [rufusreid.com](https://rufusreid.com/book-dvd/the-evolving-bassist/), [Alfred](https://www.alfred.com/the-evolving-bassist-millennium-edition/p/46-SB11A/).
- ABRSM piano scales from 2021: [Boosey listing](https://www.boosey.com/shop/prod/Piano-Scales-Arpeggios-ABRSM-Grade-8/2405545).
- From the methods' known contents (no table of contents online): Hanon, Czerny Op. 299 / 740, Philipp, Dohnányi, Cortot, DeGreg, Dobbins, Leavitt, Goodrick, Pass, Bruno, Fox, Carlevaro, Giuliani Op. 1, Segovia scales, Friedland, Patitucci, Ray Brown, Simandl, Stone, Reed, Chapin, Riley, Garibaldi, Estill, SLS, Weir.
- App: catalogue dumps of `catalog()`, `guitarCatalog()`, `drumFamilies()` and `VOICE_FAMILIES` at df8f4d99; the previous audits `docs/AUDIT-*.md`.

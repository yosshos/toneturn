# Per-key exercises: second, independent audit (2026-11-27)

Scope: this audit checks docs/RESEARCH-KEY-EXERCISES.md ("R1", the first report) and docs/RESEARCH-SPIRAL-PRACTICE.md §5. It adds what is missing, sets levels and tempi for every recommended item, adds a feel/groove layer, and closes with one de-duplicated build list. No repo files were edited.

**Source tags** (same as R1):
- **[V]** verified this session.
- **[B]** citation confirmed; content secondhand.
- **[U]** memory or common lore.
- **[R]** repo code or docs read this session.
- **[E]** my own estimate.

**Tiers:** 1 = beginner (app T0–1, ≤ 2.1 notes/s); 2 = intermediate (T2–3, 2.2–3.6 n/s); 3 = advanced (T4–5, 3.6–5.0 n/s); 4 = expert (T6+, > 5.0 n/s). The bounds come from src/engine/drills/tierBounds.ts [R].

**Item IDs:**
- "R1-#n" is rank n in R1's top 18.
- "Nn" is a new item from this audit.
- "Fn" is a feel from §3.

## Executive summary

1. **R1's diagnosis holds.** The repo was checked this session. The piano key ladder, the style families (k-pop, k-pedal, k-gospel, k-montuno, k-brazil, k-nola, k-lh, k-tex, k-rhythm, k-solo, k-read) and the guitar/bass families already cover most jazz, pop, Latin and gospel per-key idioms in all 12 keys.
   - Comping rhythms, stride, boogie, walking LH, montuno, gospel walk-ups, pop ballad patterns, pedalling (CC64), sight-reading, displacement and odd meters all exist.
   - The real gaps are **practice methods**, a **feel layer on the plain technique items**, and a handful of harmony/improv-prep items.
2. **Biggest new gap: burst (chunk) practice (N1).** Play 2–4 notes at or above the target tempo, pause, then link the groups. This is the one tempo-breaking method the app lacks. It speaks directly to the owner's "stuck at ♪54" complaint (key-session-must-develop). It is MIDI-gradable: the inter-onset interval (IOI) inside each burst, and the burst start on the beat.
3. **Second gap: the feel layer is narrow on technique items (§3).**
   - The `Variant` type has only even, dotted, rev-dotted, groups3, groups4 and accent-shift [R types.ts:230].
   - `swing` is a boolean used only in jazz families. `scales-11` uses the variants; no scale or arpeggio item is ever swung, played over a groove, or played in 3/4 or 5/4.
   - A feel modifier on every visit gives large variety at almost no content cost. The graders (swing ratio, accent contrast, staccato/legato lengths, dynamics slopes) already exist in touch.ts [R].
4. **The swing grading target should be revisited.** `swingBand` centres on a 2:1 ratio (0.667) up to ♩=140 [R touch.ts:569]. Studies of soloists report ratios **below 2:1 at medium tempi**, below the drummers' ride (Friberg & Sundström 2002 [B]; Corcoran & Frieler 2021 [B]). Recommendation: centre line items near 0.60 (≈1.5:1), keep the accepting band wide, and reserve 2:1 for ride/shuffle feels.
5. **Tempo should scale off the player's own measured scale tempo.** Fixed bpm per item is the wrong basis. The RCM 2022 tables [V] give stable ratios at each level:
   - arpeggios ≈ 0.75–0.8 × scale tempo;
   - hands a 3rd or 6th apart ≈ 0.87 ×;
   - blocked octaves ≈ 0.6–0.67 ×;
   - chromatic ≈ 1.0 ×.

   §4 turns these into per-item factors.
6. **About a third of the recommended items must NOT be tempo-laddered:**
   - voicing, comping, guide tones, held notes, velocity voicing, ear and motif items, line clichés and modal interchange;
   - these are graded on accuracy and control at a fixed, style-appropriate tempo;
   - they should be laddered by harmonic rhythm (2 bars → 1 bar → 2 beats per chord) or by complexity, not by bpm.
7. **New harmony items worth building:**
   - line clichés on I and i (N8);
   - the key's diatonic triads over a tonic and a dominant pedal (N9);
   - modal-interchange chords resolving to I (N10);
   - sus/add9 colours on I, IV and V (N11).

   All are short, gradable and transfer to pop, gospel and jazz.
8. **New improv-prep items with fair grading:**
   - rhythm-cell improvisation, graded on onsets only (N12);
   - space/phrase-length drills (N13);
   - motivic development: sequence, inversion, displacement (N14).

   The app's rule cards grade pitch rules; none of them grades rhythm or space.
9. **Classical syllabus additions:**
   - the Russian-style "key complex" as a one-take closer (N2);
   - broken alternate-note four-note chords (RCM Levels 9–10 [V]) (N3);
   - scales and chromatic scales in octaves with a small-hands alternative (exists; needs tempo caps);
   - a separate left-hand tempo ladder (N4, Czerny Op. 718 tradition [B]).
10. **Final list: 34 items in 14 rotation kinds plus the feel modifier (§5).** 14 are high priority. R1's top 18 are kept, three are merged, and two are lowered in priority (quartal arpeggios, 13ths).
11. **Excluded:**
    - double-note arpeggios and Moszkowski-level double notes;
    - glissando;
    - silent-press and finger-substitution items;
    - free improvisation;
    - multi-key matrices inside a key session;
    - any Barry Harris content not already marked in docs/BARRY-HARRIS-THEORY.md;
    - copyrighted method pages.

---

## 1. What the first report under-covered (checked against the repo)

These already exist, so they are **not** gaps, even though R1 did not list them:

| Area | Exists as | Evidence [R] |
|---|---|---|
| Pop/rock/reggae accompaniment, arpeggiated pop LH, lead sheet | `k-pop` 1–6, 12 keys | keysPop.ts header |
| Pedalling (direct, legato, syncopated, half) graded from CC64 | `control-10`, `k-pedal` 1–3 | pedal.ts, keysPop.ts |
| Gospel: IV/I pedal, 1–4/2–5 walk-ups, minor plagal, ♭III7–III7–IV, gospel scales | `k-gospel` | soulStyles.ts |
| Montuno/guajeo, bossa/samba comping | `k-montuno`, `k-brazil` | latinStyles.ts |
| Stride (single, octave, 10ths, walking 10ths), boogie LH (three figures) over 12-bar in 12 keys | `k-nola`, `k-lh` | nolaStyles.ts, soloPianoDrills.ts |
| Comping rhythms (Charleston, reverse, Red Garland, push-off, lead-in) | `k-lh`, voicings comping | soloPianoDrills.ts |
| Subdivision, 3:2/4:3, hemiola, 5/4, 7/8, displacement, 5:4/7:4, metric modulation | `k-rhythm` 1–7 | keysRhythm.ts |
| Rule-graded improv (guide-tone targets, approach, Harris rules, pentatonics, triad pairs), LH comp + RH improv | `k-solo` | soloDrills.ts |
| Sight-reading to the ABRSM Grade 8 / RSL quick study, seeded per key | `k-read` 1–15 | keysRead2.ts |
| Scales in octaves, octave double 3rds, leaps (waltz bass, 2-octave jumps), hand crossing | `advanced` 1, 5, 9 | generate.ts:6100–6128 |
| Blues, pentatonic, bebop, 6-dim, whole-tone scale types | `scales-12`, scaleMatrix | generate.ts:5664, :2691 |
| Guitar CAGED / 3-notes-per-string, double-stops; bass walking | guitar.ts, guitarCore2.ts, bass.ts | grep |
| Swing-ratio, accent, staccato/slur, dynamics-slope, per-finger, release graders | touch.ts | touch.ts header |
| Rubato → ♩=60 quarters → item tempo | rubato.ts | header |

The genuinely missing material is therefore narrower than a syllabus-by-syllabus sweep suggests. §2 lists only items that are absent or only partly present.

## 2. New-items catalogue

Column key:
- **Inst:** P = piano, G = guitar, B = bass.
- **MIDI grading:** T = timing, P = pitch, V = velocity, O = note-off, C = CC64.
- **In app:** no / partial / yes.

### 2.1 Practice methods (applied to existing material)

| # | Item | Trains | Tier | Inst | MIDI | Source | In app |
|---|---|---|---|---|---|---|---|
| N1 | **Burst / chunk practice.** Groups of 2, 3, 4, then 8 notes from the current item, played at 110–125 % of its tempo, with a one-beat rest; then link two groups, then all of them. Variant "stop-and-go": freeze on each group's first note for a beat, then play the group fast. | Breaking the speed plateau; motor chunking; relaxation between impulses | 2–4 | P G B | T (IOI inside the burst vs the target; burst onset on the beat), P | Chang, *Fundamentals of Piano Practice* ("parallel sets", free online text) [B]; Cortot's rhythmic variants with pauses [B]; motor-chunking literature [U] | no (the tempo ladder only rises with clean full takes) |
| N4 | **Left-hand tempo ladder of its own.** Every RH/LH item tracks the LH tempo separately and starts the LH at its own rung. | The weak hand catching up; avoids HT being capped by an unmeasured LH | 1–4 | P | T | Czerny, *24 Studies for the Left Hand* Op. 718 (PD) [B]; Czerny Op. 740 LH studies [U] | partial (hands 'L' items exist; one shared ladder [R ladder.ts]) |
| N5 | **Memory take.** After N clean takes, the staff hides (only the key and the bar count remain), and the take is graded as usual. | Retrieval, key visualisation, eyes off the score | 1–4 | P G B | as the item | Mental-practice and retrieval literature (Bernardi et al. 2013, "Mental practice promotes motor anticipation", *PLoS ONE*) [B] | no (modifier) |
| N6 | **Pedal through the key's progressions.** Legato pedal on R1-#2 (cycle arpeggios) and R1-#9 (Alberti/rolling chords). | Pedal timing inside real progressions | 2 | P | C, T | Uses pedal.ts [R] | partial (k-pedal has its own material, not attached to key items) |

### 2.2 Classical syllabi and traditions

| # | Item | Trains | Tier | Inst | MIDI | Source | In app |
|---|---|---|---|---|---|---|---|
| N2 | **"Key complex" closer.** One continuous take: scale 2–4 oct → tonic triad arpeggio → V7 arpeggio → vii°7 arpeggio → chromatic from the tonic → cadence I–IV–V–I (or I–vi–IV–V6/4–5/3–I). | A summary of the key; switching shapes without stopping | 2–3 | P | T P | Russian conservatoire tradition ("gamma" plus arpeggio and chord set per key) [U]; RCM chord sets ending with a cadence [V] | partial (all parts exist; never chained) |
| N3 | **Broken alternate-note four-note chords** (1-5-3-8 / 3-8-5-10 … through the inversions) on I, V7 and vii°7 | Rotation; the RCM "small hands" substitute for blocked four-note chords | 2–4 | P | T P | RCM 2022 Levels 9–10: "Broken Alternate-Note Pattern", 16ths at ♩=80 and ♩=96 [V] | no (`arpeggios-8` is straight broken chords) |
| N15 | **Chromatic scale in octaves**, and contrary chromatic from one note | Wrist/forearm at speed; symmetric fingering | 4 | P | T P | RCM 2022 Level 10: chromatic in octaves, blocked staccato, 16ths at ♩=80 [V] | partial (diatonic octaves `advanced-1`) |
| N16 | **Moszkowski / Philipp double notes** (chromatic 3rds, 4ths) | Expert double notes | 4 | P | T P O | Moszkowski, *École des doubles-notes* Op. 64 (1901, PD) [B]; Philipp [U] | no; **excluded** (§6) |
| — | Joseffy, Leschetizky (Bree 1902), Clementi *Gradus*, Czerny Op. 299/740 | Their figurations reduce to items already covered: scale runs, broken chords, repeated notes, double notes, octaves, turns, LH studies. Only N3 and N4 are new. | — | — | — | Bree, *Groundwork of the Leschetizky Method* 1902 [B]; Czerny Op. 299/740 [B] | covered |

### 2.3 Harmony in the key (jazz, pop, gospel)

| # | Item | Trains | Tier | Inst | MIDI | Source | In app |
|---|---|---|---|---|---|---|---|
| N8 | **Line clichés on I and i.** Major: 1→maj7→♭7→6 inner voice (I–Imaj7–I7–I6). Minor: i–i(maj7)–i7–i6. Then over ii–V. | Inner-voice motion, a staple pop/jazz/standards sound | 2 | P G | P T (inner-voice order) | Standard harmony [U] | no |
| N9 | **The key's diatonic triads over a pedal:** tonic pedal (I/1 … vii°/1), then dominant pedal (V/5, IV/5 = 9sus, ii/5 …) | Upper-structure hearing; pop, gospel and modal sound; slash-chord reading | 2–3 | P G | P | Common theory [U]; overlaps R1 A8 (upper structures) | partial (k-gospel IV/I; `k-theory-2` upper structures not per key) |
| N10 | **Modal interchange to I:** IV–iv–I, ♭VI–♭VII–I, iiø–V–I in major, ♭II–I; minor-key ♭VI–V | Borrowed-chord colour; standards and film harmony | 2–3 | P G B | P | Standard theory [U] | partial (colorDrills / cadenceLibrary "borrowed", k-gospel minor plagal [R]; not a per-key set) |
| N11 | **Sus / add9 colours:** Isus4→I, Vsus4→V7, V9sus (IV/5) → I, Iadd9 and IVadd9, the 1-2-3-5 "mu" voicing on I and IV | Pop and gospel colour, modern jazz sus sound | 2 | P G | P | LCM Jazz Piano Grade 8: "the sus chord on any note" [V] | partial (colorDrills add9/sus2 [R]) |
| N17 | **Backdoor and tritone-sub cadences in the key** (iv–♭VII7–I; ii–♭II7–I) | Jazz cadence vocabulary | 3 | P G B | P | Standard [U] | partial (k-reharm) |
| N18 | **Diminished on V and whole-tone on V resolving to I** (half-whole from V = V7♭9; whole-tone = V7♯5) | Altered dominant colour inside the key | 3 | P G B | P T | Standard jazz theory [U]; not a Harris attribution | partial (scale types exist; no per-key resolution item) |

### 2.4 Improvisation prep (constrained, fairly gradable)

| # | Item | Trains | Tier | Inst | MIDI | Source | In app |
|---|---|---|---|---|---|---|---|
| N12 | **Rhythm-cell improvisation:** one given cell (Charleston; three 8ths from the "and" of 1; dotted quarter + 8th) repeated each bar, with free pitches from the key's scale or chord tones over I–vi–ii–V | Rhythmic vocabulary; separating rhythm from pitch | 2 | P G B | T (onsets vs the cell), P (in the scale / chord) | Common jazz pedagogy [U] | no (rule cards are pitch rules [R]) |
| N13 | **Space drill:** play 2 bars, rest 2 bars (call and silence); or at most N notes per bar; or a phrase that must start on a given beat | Phrasing, breathing, starting phrases off beat 1 | 2 | P G B | T (note-count windows, silence windows) | [U] | no (k-solo's free bars require *enough* notes [R]) |
| N14 | **Motivic development:** given a 3–4-note motif, play it, then a diatonic sequence, its inversion, a displacement by an 8th, and an augmentation | Developing an idea rather than running scales | 3 | P G B | P (interval contour after transposition), T | Composition and improv pedagogy [U] | no (R1-#15 covers sequencing by ear only) |
| N19 | **Target notes on beats 1 and 3 through the key's diatonic cycle** (free line, a chord tone required on 1 and 3) | Chord-tone landing | 2–3 | P G B | P T | Exists as a rule card over forms [R] | partial (only over forms, not per-key cycle; cheap) |
| N20 | **Blues in the key:** minor blues scale (1-♭3-4-♯4-5-♭7) and major blues (1-2-♭3-3-5-6), 2 oct swung, then a 12-bar in the key with a blues-scale card | Blues vocabulary in every key | 2 | P G B | P T, swing ratio | LCM Jazz Piano: blues scales from Grade 3, swung from Grade 5 [V] | partial (blues scale `scales-12`; 12-bar in k-bebop/k-nola; major blues and the per-key card no) |

### 2.5 Guitar and bass (brief)

| # | Item | Tier | Note | In app |
|---|---|---|---|---|
| N21 | **Single-string (linear) scale in the key**, then two strings | 2 | Neck-length vision; complements positions. Goodrick, *The Advancing Guitarist* 1987 [B, idea only] | no |
| N22 | **Position-shift linking:** the key's scale across CAGED positions in one run, and diatonic triads crossing positions | 2–3 | Uses the existing CAGED/3nps material | partial |
| N23 | **Bass: two-feel → walking in the key** (I–vi–ii–V, diatonic cycle), chromatic approach on 4 | 2 | b-swing walking exists; the per-key cycle link does not | partial |
| — | Double-stops (3rds/6ths on string pairs) | — | Exists | yes |

### 2.6 Checked and deliberately not added

- **Stride accuracy, octave bass, boogie, comping rhythms, montuno, gospel walk-ups, pop LH:** all exist (§1).
- **Repeated-note groups, trills, turns:** in R1.
- **Hear-and-sequence:** R1-#15.
- **Sight-reading in the key:** use k-read seeded to the session key as a "read" rotation kind (§5), not a new generator.
- **Transposition across keys:** multi-key, so not a per-key item.

---

## 3. The feel / groove layer (applies to any exercise, the plain scale included)

### 3.1 What exists [R]

- **`Variant`** = even | dotted | rev-dotted | groups3 | groups4 | accent-shift (types.ts:230). Used in `scales-11` only.
- **`spec.swing`:** a boolean on jazz families only (k-bebop, harris lines, charts). No technique scale or arpeggio item is swung.
- **Grading:**
  - `swingBand(bpm)`: target 0.667 up to ♩=140, falling 0.0008 per bpm to a floor of 0.58, accepting −0.08 / +0.06 (touch.ts:569);
  - drum swing goals; `Articulation` legato | staccato | portato and `handArt` per hand;
  - `DynamicsGoal` even-* | cresc | dim-cresc | terraced | accent3 | accent4 | voicing;
  - graders for slopes, stac/slur and release.
- **Band styles** (band.ts:273): swing, bossa, ballad, waltz, pop, rock, funk, reggae, shuffle, samba, chacha, mambo, songo, afro68, gospel 12/8, second line and more. `spec.band` can put a drum/bass groove under a drill.
- **`k-rhythm`:** displacement, hemiola, 5/4 and 7/8, as their own exercises.
- **keyCoach `canTrip`:** the triplet trip is offered only on straight 8ths, never on swing items (keyCoach.ts:621).

**So the parts exist; what is missing is a general "feel" modifier that any item can wear.**

### 3.2 Feel catalogue

**Columns:**
- **Tempo band** is where the feel *reads as itself* [E unless cited].
- **Grade** names the touch.ts measure that already exists, or "new".

| # | Feel | Trains | Tier | Tempo band (♩) | MIDI grade | In app |
|---|---|---|---|---|---|---|
| F1 | **Swing 8ths, light (≈1.4–1.6:1)** | Jazz line feel; soloist-style swing | 2 | 100–220 | Swing ratio (exists), with the target re-centred (§3.3) | engine yes; on technique items no |
| F2 | **Swing 8ths, heavy / triplet (2:1) and shuffle** | Blues/shuffle feel; triplet subdivision | 1–2 | 60–140 (above ~160 a 2:1 swing turns clumsy [E]) | Swing ratio with target 0.667; shuffle band | partial (band 'shuffle') |
| F3 | **Swing + upbeat accents** (accent the "and"s; bebop articulation: off-beat accent, slurred into the next downbeat, ghosted non-targets) | Jazz articulation, the most idiomatic layer | 2–3 | 120–240 | Accent velocity contrast (off vs on ≥ calibrated margin) + ghost-note velocity band; slur by note-off overlap | partial (accent3/4 exist; no upbeat or ghost goal) |
| F4 | **Straight 8ths, Latin/bossa** (even 8ths, light; over a bossa groove) | Even-8ths Latin feel; resisting swing | 2 | 110–160 (bossa ~120–140 [U]) | Even IOI (CV), swing ratio ≤ 0.53 | engine yes (band bossa) |
| F5 | **Triplet / 12/8 feel** (the scale in triplets over a 12/8 groove; gospel/ballad) | Triplet subdivision, ballad and gospel time | 1–2 | dotted ♩ 50–80 | Triplet grid IOI; accent on group starts | partial (groups3; band gospel 12/8) |
| F6 | **Half-time / double-time** (the line in 8ths over a half-time groove; or 16ths over a medium swing) | Subdivision switching; ballad double-time | 3 | Half-time groove ♩=140–180; double-time ♩=60–90 in 16ths | IOI vs the grid; the switch point on time | no (k-rhythm 1 has 8/trip/16 but not as a feel) |
| F7 | **Funk 16ths** (the scale in straight or slightly swung 16ths, ghosted inner 16ths, accents on "e"/"a") | 16th-note pocket, ghosting | 3 | ♩=80–105 | 16th IOI; ghost velocity band; accent contrast; optional 16th swing (existing `swing.sub: 16`) | engine partial (band funk; swing.sub 16) |
| F8 | **Waltz 3/4** (a 4-note-group scale played in 3/4: the pattern wraps across bar lines; accent on beat 1 of each bar, not of each group) | Metre vs grouping independence | 2 | ♩=90–180 (jazz waltz ~♩=150 [U]) | Accent on bar-beat 1 vs pattern start (velocity) | partial (band waltz; hemiola in k-rhythm) |
| F9 | **Odd metres 5/4 (3+2), 7/8 (2+2+3)** applied to a 4/4 scale (wraps; accents on group starts) | Prog/modern metre; counting | 3 | 5/4 ♩=100–170; 7/8 ♪=180–280 | Group-start accents; bar-1 timing | partial (k-rhythm 4, own material) |
| F10 | **Displacement** (start on the "and" of 1, or on beat 2; accents fall on offbeats) | Line placement, avoiding beat-1 habits | 2–3 | any | Onsets vs a shifted grid | partial (k-rhythm 5) |
| F11 | **Clave-based accents** (accent the scale notes falling on son clave 3-2 / 2-3; or rumba clave) | Afro-Cuban time awareness | 3 | ♩=90–130 (cut-time feel) | Accent positions vs clave (velocity) | engine partial (montuno knows clave direction [R]) |
| F12 | **Dynamic shapes:** crescendo up / diminuendo down; terraced by octave; hairpin on each group | Dynamic control | 1–3 | ≤ the item's tier tempo | Exists (cresc, dim-cresc, terraced; slope + R²) | yes, but rarely applied to key items |
| F13 | **Articulation sets:** legato, staccato, portato; hands different (L legato / R staccato) | Touch | 1–3 | Staccato reads cleanly up to ~4 n/s [E]; above that, "light non-legato" | Exists (lengths, stac, slur, handArt) | yes, rarely applied |
| F14 | **Over a drum groove instead of a click** (swing ride, bossa, pop, funk, 12/8) | Locking to a band; no click crutch | 1–4 | the style's band | Timing vs the groove's beats (as vs the click); swing vs the ride ratio | engine yes (spec.band); not offered on technique items |
| F15 | **Dotted / reverse dotted, groups 3/4, moving accent** | Classical speed preparation; evenness | 1–2 | ≤ item tempo | Exists | yes (scales-11 only) |

### 3.3 Swing and tempo: what the grading should expect

- **The ride and the soloist differ.** Friberg & Sundström (2002) measured drummers' ride patterns: the swing ratio falls roughly linearly as tempo rises, very high at slow tempi and near even at fast ones. Soloists played lower ratios than the drummers and were late on downbeats, in sync on offbeats [B; KTH summary page read].
- **Soloists sit below 2:1.** Summaries of soloist studies say that at medium tempi the drummers' ratio is above 2 and the soloists' is below 2. Corcoran & Frieler (2021, *Music Perception* 38(4), Weimar Jazz Database) analysed soloists' swing-8th distributions [B; abstract not read].
- **Consequence:** the app's 2:1 target for lines is at the heavy end. Proposal for F1 lines:
  - target 0.60 (1.5:1) at ♩ ≤ 160, sliding to 0.55 at ♩ ≥ 240;
  - accept 0.53–0.68 below ♩=200 and 0.50–0.62 above;
  - keep 0.667 for F2 (shuffle/ride/triplet) feels.

  This is a grading change for the owner to approve; verify against the Corcoran & Frieler figures first.
- **When the feel switches on:**
  - **Swing reads as swing only from about ♩=90.** Below that, a swung 8th sounds like a 12/8 shuffle: offer F5 instead [E].
  - **Above about ♩=260**, 8ths flatten to near even, so F1's feel goal turns off (grade timing only) [E, consistent with Friberg & Sundström's trend].
  - **A light-swing item needs the player at T2+**, because a 1.5:1 ratio at ♩=120 means off-beat placements about 50 ms apart from straight. A beginner's onset scatter at T0–1 (SD 12 % of the gap, tierBounds.ts [R]) cannot show it. At T0–1, offer only F2 heavy swing / shuffle at ♩ ≤ 110.

### 3.4 How the feel layer combines with the spiral rotation

**Recommendation: a feel is a modifier inside a visit, not a rotation kind.**

**Why not a kind:**
- Kinds exist to change *what the hands do* (SPEC-SPIRAL §1: family + rung + hands).
- A swung scale is the same motor pattern with a different timing map. Counting it as a new kind would let a session alternate "scale" and "swung scale" and pass the "never the same kind twice" rule without real variety.
- R1 reached the same conclusion for the variant layer.

**Rules proposed:**
1. **Acquire straight first.** The feel is only applied to an item the player has acquired straight (D1 blocked until acquired). A new feel on an acquired item restarts at the item's current tempo × 0.85 [E] for its first take, with no rubato stage.
2. **Change the feel every visit, and never repeat a feel on consecutive visits.** Within a visit the feel holds, so takes stay comparable for the tempo ladder. Across a session of about 6–10 visits, aim for 3–4 different feels.
3. **Feels have tiers** (table above). They are drawn from a pool filtered by:
   - the player's tier;
   - the item's tempo, so the feel falls inside its band (§3.3); for example, F1 is not offered on a scale item whose clean tempo is ♩=72 8ths;
   - the style focus (style-focus memory). Jazz main → F1/F3/F14-swing weighted; Latin → F4/F11; pop/funk → F7/F14-pop; classical → F12/F13/F15.
4. **Tempo credit.** A feel take counts toward the item's tempo ladder only when the feel does not change the note rate:
   - **counts:** swing, accents, articulation, dynamics, groove;
   - **separate rung of its own:** triplets, double-time, odd metre.

   Feel performance is also recorded separately, per feel, in the player profile: swing ratio, accent contrast and duration ratios.
5. **Feels on untimed items.** Voicing, held-note and ear items take only F14 (a groove at a fixed tempo), F12 and F13, never rate-changing feels.
6. **Brief.** The first appearance of a feel in a run gets a one-line brief (brief-before-task); later visits get the coach line only (D5).

---

## 4. Level and tempo appropriateness

### 4.1 Anchors

**RCM 2022 technical requirements** (ColorInMyPiano chart of the 2022 syllabus [V chart; syllabus B]):

| Level | Scales | Arpeggios | Other |
|---|---|---|---|
| 1 | ♩=69 8ths (2.3 n/s) | — | Broken triads in triplets ♩=50 (2.5) |
| 2–3 | ♩=80 8ths (2.7) | — | Broken triads in triplets ♩=60–69; formula pattern from L2 |
| 4 | ♩=92 8ths (3.1) | ♩=72 8ths (2.4) | Chromatic ♩=104 |
| 5 | ♩=104 8ths (3.5) | ♩=80 8ths (2.7) | V7 broken, with inversions, ♩=72 8ths |
| 6 | ♩=60 16ths (4.0) | ♩=92 8ths (3.1) | V7 / vii°7 broken ♩=88 8ths |
| 7 | ♩=76 16ths (5.1) | ♩=60 16ths (4.0) | Four-note broken ♩=60 16ths |
| 8 | ♩=88 16ths (5.9), 4 oct | ♩=69 16ths (4.6) | — |
| 9 | ♩=104 16ths (6.9) | ♩=84 16ths (5.6) | Octaves blocked staccato ♩=60 16ths (4.0); small hands: broken legato ♩=72 |
| 10 | ♩=120 16ths (8.0) | ♩=92 16ths (6.1) | Hands a 3rd/6th apart ♩=104 16ths (6.9); octaves and chromatic octaves ♩=80 16ths (5.3); broken alternate-note four-note chords ♩=96 16ths |

**ABRSM:** the app's tier bounds are built from ABRSM grade scale speeds of 1.8 … 5.9 n/s (tierBounds.ts comment [R]). ABRSM's own 2021 table was not read this session. Its 2021 syllabus dropped broken chords (Pianodao review [V]).

**Derived ratios** to the same-level scale tempo S:

| Material | Ratio to S |
|---|---|
| Arpeggios | 0.75–0.80 |
| Broken four-note / V7 inversions | ≈ 0.8 |
| Hands a 3rd / 6th apart | ≈ 0.87 |
| Blocked octaves | 0.60–0.67 |
| Chromatic | ≈ 1.0 |

**Proposal:**
- **An item's start tempo** = factor × the player's measured clean scale tempo in that key and hand, rounded to a ladder step.
- **Its target** = factor × the tier's scale target.
- The ♩ figures below are the reference values at tier boundaries.

### 4.2 Consolidated table

**Notation:**
- Tempo is written start → target per tier.
- "8" = 8ths, "16" = 16ths, "tr" = triplet 8ths, "sw" = swung 8ths.
- "**Fixed**" = not tempo-laddered: graded on accuracy and control at the given tempo, laddered by harmonic rhythm or complexity instead.
- Unmarked figures are [E], aligned to the RCM ratios.

| Item | Entry tier | Prerequisites | Factor × S | T1 | T2 | T3 | T4 | Rationale |
|---|---|---|---|---|---|---|---|---|
| R1-#7 scale in 4-/3-note groups | 1 | scale HS acquired | 0.9–1.0 | ♩=54→66 (8) | ♩=72→104 (8); groups of 3 in tr ♩=50→72 | ♩=60→80 (16) | ♩=84→100 (16) | Same notes as the scale, plus turnarounds |
| R1-#1 broken 4ths | 2 | R1-#7 | 0.8 | — | ♩=60→88 (8) | ♩=54→72 (16) | ♩=76→92 (16) | Shifts every 2 notes, like an arpeggio |
| R1-#1 broken 5ths/6ths/octaves | 3 | 4ths; octave reach for 6ths/8ves | 0.75 | — | — | ♩=88 (8)→♩=66 (16) | ♩=72→88 (16) | Stretch; small hands cap at 6ths |
| R1-#9 rolling broken chords / Alberti on I, IV, V → all degrees | 1 | triads blocked | 0.9 | ♩=60→80 (8), I-IV-V only | ♩=80 (8)→♩=60 (16) | ♩=72→96 (16) | ♩=100→112 (16) | Rotation is easier than scale passing |
| R1-#2 cycle-of-5ths arpeggios (triads → 7ths) | 2 | k-sharm triads/7ths on every degree | 0.75–0.8 | — | triads tr ♩=50→72 | 7ths ♩=88 (8)→♩=60 (16) | ♩=72→88 (16) | RCM broken-triad tr ♩=50–80; nearest-inversion choice slows the hands |
| R1-#5 7th chords on every degree, all inversions | 2 | R1-#2 triads | 0.8 | — | ♩=60→88 (8) | ♩=60→72 (16) | ♩=80→96 (16) | RCM V7 inversions L5 ♩=72 (8) → L8 ♩=80 (16) |
| N3 broken alternate-note 4-note chords | 2 | R1-#5 | 0.8 | — | ♩=72→100 (8) | ♩=60→80 (16) | ♩=88→96 (16) | RCM L9–10: ♩=80 / 96 (16) [V] |
| R1-#16 hand-over-hand arpeggios | 2 | R1-#2 triads | 0.75, **capped** | — | ♩=60→100 (8) | ♩=60→80 (16) | cap ♩=88 (16) | Flow matters, not speed; ballads use ~♩=60–72 (16) |
| R1-#17 stacked 3rds to the 13th | 3 | R1-#5 | 0.75 | — | — | ♩=88 (8)→♩=66 (16) | ♩=76→88 (16) | Two-octave span |
| R1-#18 quartal arpeggios | 3 | R1-#1 4ths | 0.7 | — | — | ♩=72→112 (8) | ♩=60→76 (16) | Awkward 4th crossings |
| R1-#11 the key's pentatonics, 4-note groups | 2 | R1-#7 | 0.85 | — | ♩=72→112 (8 / sw) | sw ♩=120→180 | sw ♩=180→240, or ♩=72→88 (16) | Uneven crossings; usually swung |
| R1-#13 digital permutations | 2 | k-sharm 45 (1-2-3-5) | 0.85 | — | ♩=72→120 (8 / sw) | sw ♩=120→200 | sw ♩=200→260 | Jazz-line tempi; swing ratio flattens above ♩≈240 |
| R1-#12 4-5 / 3-4 pairs, trills, turns | 2 | five-finger patterns | trill in n/s | — | 8 ♩=60 → 16 ♩=60 (4 n/s); evenness cap CV ≤ 0.11 | 16 ♩=72→84 (≤ 5.6 n/s) | sextuplets ♩=72→84 (7–8 n/s) | Weak fingers: injury risk if forced; evenness gate before speed |
| N2 key complex closer | 2 | scale, arpeggios, V7, vii°7 acquired in the key | each part at its own factor | — | scale ♩=80 (8), arps ♩=72 (8) | scale ♩=60–76 (16), arps ♩=60 (16) | ♩=88/69 (16) | Mirrors the RCM level sets |
| Scales in octaves (exists) | 3 | octave reach; else broken legato | 0.6–0.67, **reps capped** | — | — | ♩=60 (8) → ♩=60 (16) | ♩=66→80 (16) | RCM L9 ♩=60, L10 ♩=80 (16) [V]; fatigue: ≤ 2 oct, rest between reps |
| N15 chromatic in octaves | 4 | scales in octaves | 0.67 | — | — | — | ♩=60→80 (16) | RCM L10 [V] |
| Slow legato double 3rds (R1 I6) | 4 | 3rds together (k-sharm 5/6) | — | — | — | — | ♩=50→72 (8 pairs); 16ths only after | Legato top voice first; strain risk |
| R1-#6 held notes walking the key | 2 | five-finger patterns | **Fixed** ♩=60–80 (8) | — | ladder: tonic 5th → each degree's triad → re-strike | ″ | ″ | Graded on held-note integrity |
| R1-#8 voicing one finger louder | 2 (top) → 3 (inner) | velocity calibration | **Fixed** ♩=60 (quarter-note chords) | — | top voice | inner voice | rotating voice per chord | Velocity margin, not speed |
| R1-#3 guide-tone lines (+ approach note at T3) | 2 | 7th chords known | **Fixed** sw ♩=80–140 | — | 2 bars → 1 bar per chord | 1 bar → 2 beats; + approach | 2 beats, swung, + embellished | Ladder the harmonic rhythm |
| R1-#4 RH line over LH guide tones | 3 | R1-#3, R1-#13 | RH line 0.85 | — | — | sw ♩=80→140 | sw ♩=140→200 | Per-hand grading; LH integrity |
| R1-#10 shells / rootless through the cycle (+ comping cells) | 2 (shells) → 3 (rootless) | R1-#3 | **Fixed** style tempo sw ♩=100–160 | — | whole notes → Charleston | anticipations, Red Garland | free comp rhythm (card) | Comping is graded on voicing and placement |
| R1-#14 secondary dominants | 2 | cadences | **Fixed** for voicings; arpeggio form as R1-#2 | — | shell → resolution | arpeggio tr/8 as R1-#2 | — | — |
| R1-#15 hear-and-sequence motif | 1 | — | **Fixed** ♩=60–80 | 3-note motif | 4-note | 5–6 notes, chromatic | — | Ear accuracy; no speed goal |
| N8 line clichés | 2 | triads/7ths on I and ii | **Fixed** ♩=60–90, 1 chord per bar | — | major, minor | over ii–V, in a tune-like 8 bars | — | Voice order |
| N9 triads over a pedal | 2 | triad inversions | **Fixed** | — | tonic pedal | dominant pedal | — | — |
| N10 modal interchange | 2 | cadences | **Fixed** | — | IV–iv–I, ♭VI–♭VII–I | iiø–V–I, ♭II–I | — | — |
| N11 sus / add9 colours | 2 | triad inversions | **Fixed** | — | Isus4, Vsus, add9 | V9sus, mu voicing | — | — |
| N18 dim / whole-tone on V | 3 | V7 arpeggios | 0.85 | — | — | ♩=80 (8) → sw ♩=160 | sw ♩=200 | Symmetric scale fingering |
| N20 blues in the key | 2 | scale; F1/F2 feel | 0.9 | — | sw ♩=80→140 | sw ♩=140→200 | — | LCM Jazz Gr 3–6 [V] |
| N12 rhythm-cell improv | 2 | scale in the key | **Fixed** sw ♩=70–140 | — | 1 cell | 2 alternating cells | displaced cells | Rhythm is the graded thing |
| N13 space drill | 2 | any improv card | **Fixed** | — | 2 on / 2 off | 1 on / 1 off; start on 2 | phrase-length targets | — |
| N14 motivic development | 3 | R1-#15 | **Fixed** ♩=80–120 | — | — | sequence, inversion | displacement, augmentation | — |
| N19 target notes on 1 and 3, through the cycle | 2 | R1-#3 | **Fixed** sw ♩=90–160 | — | beat 1 | beats 1 + 3 | + approach | — |
| N1 burst practice | 2 | item acquired at some tempo | bursts at 1.10–1.25 × current | — | 2-note → 4-note bursts | 4 → 8 | 8 → full | Not for T0–1: evenness first |
| N4 LH ladder | 1 | — | LH starts at 0.85–0.9 × RH | as the item | ″ | ″ | ″ | The LH usually lags [E] |
| N6 pedal through progressions | 2 | k-pedal 1 | **Fixed** ♩=60–80 | — | legato pedal, 1 chord per bar | 2 chords per bar | syncopated | CC64 graded |

**Never tempo-ladder these:**
- R1-#3, #6, #8, #10, #14 (voicing form), #15;
- N8–N14, N19, N6;
- every ear item;
- all comping and voicing.

**Cap these** (stop the ladder below the scale target):
- R1-#16 hand-over-hand (♩=88 16ths);
- octaves (rep count, 2 octaves);
- R1-#12 trills (the evenness gate comes before speed);
- double 3rds;
- broken 6ths/octaves for small hands. Offer a "small hands" profile flag, as RCM does with its alternatives [V].

---

## 5. Final consolidated build list

**Kinds** (rotation slots): line-scale, line-interval, arpeggio-degree, arpeggio-progression, finger, independence, touch, harmony-voicing, harmony-colour, line-jazz, improv-prep, ear, read, classical-closer.

**Priority:** H / M / L. Status "new" means a new generator or level; "level" means a new level on an existing generator.

| # | Item (merged) | Kind | Entry tier | Pri | Status |
|---|---|---|---|---|---|
| 1 | Scale in 4-/3-note groups (R1-#7) | line-scale | 1 | H | level (`sequenceMotif`) |
| 2 | Broken intervals 4ths → 8ves (R1-#1) | line-interval | 2 / 3 | H | level |
| 3 | Rolling broken chords / Alberti per degree + RH scale over LH broken chord (R1-#9, I9) | arpeggio-progression | 1 | H | level |
| 4 | Cycle-of-5ths arpeggios, triads → 7ths (R1-#2) | arpeggio-progression | 2 | H | level (harmLadder order) |
| 5 | 7th chords all inversions per degree (R1-#5) | arpeggio-degree | 2 | H | level |
| 6 | Guide-tone lines through the cycle, + approach (R1-#3, J10) | line-jazz | 2 | H | new (short) |
| 7 | RH line over LH guide tones (R1-#4) | independence | 3 | H | new |
| 8 | Held notes walking the key (R1-#6) + new integrity goal | independence | 2 | H | new goal |
| 9 | Voicing one finger louder (R1-#8) + velocity-margin goal | touch | 2 | H | new goal |
| 10 | Shells → rootless through the cycle with comping cells (R1-#10 + comping rhythms) | harmony-voicing | 2 | H | level |
| 11 | Digital permutations (R1-#13) | line-jazz | 2 | H | level |
| 12 | Key's pentatonics in groups (R1-#11) | line-jazz | 2 | H | level |
| 13 | **Burst / chunk practice (N1)** | method on any laddered item | 2 | H | new mode |
| 14 | **Feel layer F1–F15 (§3)** | modifier | 1–4 | H | new modifier (graders exist) |
| 15 | 4-5 / 3-4 pairs, trills, turns (R1-#12) | finger | 2 | M | level |
| 16 | Secondary dominants (R1-#14) | harmony-voicing | 2 | M | level |
| 17 | Hear-and-sequence motif (R1-#15) | ear | 1 | M | new |
| 18 | Line clichés I / i (N8) | harmony-colour | 2 | M | new (small) |
| 19 | Diatonic triads over tonic / dominant pedal (N9; absorbs R1 A8) | harmony-colour | 2 | M | new (small) |
| 20 | Modal interchange to I (N10) | harmony-colour | 2 | M | new (small) |
| 21 | Sus / add9 colours (N11) | harmony-colour | 2 | M | new (small) |
| 22 | Rhythm-cell improvisation (N12) | improv-prep | 2 | M | new grader rule (onset-only card) |
| 23 | Space / phrase-length drill (N13) | improv-prep | 2 | M | new card |
| 24 | Target notes 1 & 3 through the cycle (N19) | improv-prep | 2 | M | reuse card |
| 25 | Blues in the key: minor + major blues, 12-bar card (N20) | line-jazz | 2 | M | level |
| 26 | Hand-over-hand arpeggios (R1-#16) | arpeggio-progression | 2 | M | new |
| 27 | Separate LH ladder (N4) | system | 1 | M | ladder change |
| 28 | Broken alternate-note 4-note chords (N3) | arpeggio-degree | 2 | M | level |
| 29 | Key complex closer (N2) | classical-closer | 2 | M | new (chains existing) |
| 30 | Memory take (N5) | modifier | 1 | L | modifier |
| 31 | Motivic development (N14) | improv-prep | 3 | L | new |
| 32 | Stacked 3rds to 13 (R1-#17) | arpeggio-degree | 3 | L | level |
| 33 | Quartal arpeggios (R1-#18) | arpeggio-degree | 3 | L | level |
| 34 | Dim / whole-tone on V → I (N18) | line-jazz | 3 | L | level |
| also L | Backdoor / tritone-sub cadences (N17); pedal attached to key items (N6); chromatic in octaves (N15); slow legato double 3rds (I6); k-read seeded to the session key as a "read" kind | various | 2–4 | L | mostly reuse |
| G/B | Guitar: single-string scale (N21), position-shift linking (N22). Bass: walking through the key's cycle (N23). Transfer items 1, 2, 4, 5, 6, 11, 12, 16, 22–25 per R1 §3.5 | — | 2 | M | levels |

**Rotation fit.** With §5 in place, each tier has enough kinds for a varied spiral:
- **T0–1 (5 kinds):** line-scale, arpeggio-progression, finger (five-finger), ear, read. The feel modifier is limited to F2, F5, F12, F13, F14 and F15.
- **T2–3 (12 kinds):** line-scale, line-interval, arpeggio-degree, arpeggio-progression, finger, independence, touch, harmony-voicing, harmony-colour, line-jazz, improv-prep, ear. Plus read and the closer.
- **T4+:** all kinds, with harder rungs.

---

## 6. Deliberately excluded or deferred

| Excluded | Why |
|---|---|
| Double-note arpeggios; Moszkowski chromatic 3rds/4ths; solid 4ths | Expert only, strain risk, little jazz transfer (as R1) |
| Glissando | Not gradable as notes; injury on some actions; not per key |
| Silent-press finger lifts; finger substitution as graded items | The key motion is invisible to MIDI (R1 §2.7) |
| Free improvisation without constraints | No fair grading; use N12–N14, N19 and the k-solo cards instead |
| Coltrane matrix, ii–V chains, transposition drills | Multi-key; keep them in their families |
| Thumb-melody (Thalberg) and other virtuoso textures | Expert repertoire skill, not a per-key exercise |
| New Barry Harris claims (5-4-3-2 phrases, chromatic major arpeggios down, elevator under a melody) | Not shown or confirmed in docs/BARRY-HARRIS-THEORY.md; only-verified-theory rule |
| Reproducing Coker, Bergonzi, Levine, Ligon, Ricker, Campbell, Goodrick, Chang | In copyright: ideas only, generated from rules |
| Movable-do sung degrees as an add-on | Owner decision: no movable do (ear-intelligence decisions) |
| Feel as a rotation kind | It would fake variety (§3.4) |
| Tempo-laddering voicing, comping, ear or held-note items | They are graded on accuracy and control (§4.2) |

---

## References

1. RCM 2022 Piano Syllabus, technical requirements by level, as charted by J. Morin, "Technical Requirements Charts for the Practical Exams in Piano of the RCM 2022 Piano Syllabus", ColorInMyPiano, updated 18 July 2022. https://colorinmypiano.com/wp-content/files/RCM_2022_Technical_Requirements_Charts_Prep-10.pdf [V chart, proofread against the syllabus; syllabus B]
2. RCM, *Piano Syllabus, 2022 Edition*. https://shop.rcmusic.com/products/piano-syllabus-2022-edition [B]
3. LCM (London College of Music Examinations), Jazz technical requirements and musical awareness questions: Jazz Piano Steps 1–2, Grades 1–8 (pentatonics from Gr 1, Dorian Gr 2, blues scales Gr 3+, swung modes Gr 5, mode exercise Gr 6, sus chord on any note, whole-tone and diminished scales Gr 8). https://lcme.uwl.ac.uk/media/uq4gtidy/95-technical-requirements-and-musical-awareness-questions-jazz.pdf [V]
4. Pianodao, "ABRSM Piano Scales 2021" (broken chords dropped; arpeggio inversions later; no dynamics requirement). https://pianodao.com/2020/07/12/abrsm-piano-scales-2021/ [V]
5. A. Friberg & A. Sundström, "Swing ratios and ensemble timing in jazz performance: evidence for a common rhythmic pattern", *Music Perception* 19(3), 2002. https://www.speech.kth.se/music/performance/Texts/ensemble_swing.htm [B]
6. C. Corcoran & K. Frieler, "Playing It Straight: Analyzing Jazz Soloists' Swing Eighth-note Distributions with the Weimar Jazz Database", *Music Perception* 38(4), 2021, doi:10.1525/mp.2021.38.4.372. https://jazztheory.ssac.carleton.ca/view.php?id=4602 [B]
7. C. Czerny, *24 Studies for the Left Hand*, Op. 718; *Die Kunst der Fingerfertigkeit*, Op. 740; *Schule der Geläufigkeit*, Op. 299 (PD, IMSLP). [B]
8. M. Moszkowski, *École des doubles-notes*, Op. 64 (1901, PD). [B]
9. M. Bree, *The Groundwork of the Leschetizky Method* (1902, PD). [B]
10. C. C. Chang, *Fundamentals of Piano Practice* (free online text; "parallel sets" / chunking). [B]
11. A. Cortot, *Principes rationnels de la technique pianistique* (1928): rhythmic variants. [B, as in R1]
12. F. Bernardi et al., "Mental practice promotes motor anticipation: evidence from skilled music performance", *PLoS ONE* 2013. [B]
13. M. Goodrick, *The Advancing Guitarist* (Hal Leonard 1987): single-string approach, idea only. [B]
14. Repo [R]:
    - docs/RESEARCH-KEY-EXERCISES.md; docs/RESEARCH-SPIRAL-PRACTICE.md §5; docs/SPEC-SPIRAL-PRACTICE.md §1–2; docs/BARRY-HARRIS-THEORY.md;
    - src/engine/drills: types.ts (Variant :230, swing :367, Articulation, DynamicsGoal), touch.ts (swingBand :569, measureSwing), tierBounds.ts, tiers.ts, rubato.ts, ladder.ts, targetTempo.ts, keyCoach.ts (:621), keysPop.ts, pedal.ts, soulStyles.ts, latinStyles.ts, nolaStyles.ts, soloPianoDrills.ts, keysRhythm.ts, keysRead2.ts, soloDrills.ts, generate.ts (scales-11 :5657, scales-12 :5664, advanced :6100–6128, sequenceMotif :1191);
    - src/engine/band.ts (BandStyle :273).

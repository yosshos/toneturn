# Guitar course: deepening plan (2026-11-10)

Research only. No app code was changed. This plan builds on `GUITAR_AUDIT.md` (2026-11-09) and
`GUITAR_TECHNIQUE_RESEARCH.md`, and on the owner's niche decision of 2026-11-10: "sophisticated music". Pop is the
way in, and the top levels reach serious jazz and rock / prog. House rules that apply throughout:

- only measured practice counts (microphone or MIDI);
- every exercise is our own, generated material (never anyone's exercises);
- no memorisable items;
- one phone screen per exercise;
- every activity feeds the path, map, XP, leagues, level test and workout;
- brainstorm before big path changes. Section 5 is a path change, so it is written as a proposal with decisions for
  the owner.

## 0. Summary

| # | Item | Priority | Size | Owner decision? |
|---|---|---|---|---|
| 1 | `g-ear`, the guitarist's ear: 10 call-and-response levels, every answer played on the guitar | P1 | M (reuses `bassEar.ts`) | no |
| 2 | Real target tempos: `tempo: [start, target]` + `sub` on every guitar level (table §2), anchored to RSL grades | P1 | S | yes (changes difficulty and placement) |
| 3 | Deepen 79 → 128 levels (+49): scales, rhythm, lead, picking, legato, reading, arpeggios, improvising | P2 | L (in 3 batches) | no |
| 4 | Jazz (+5 `g-jazz`, new `g-harris` ×6) and prog / fusion (new `g-prog` ×8) | P1 for the niche | M + M | which add-ons are core (§5) |
| 5 | Core path when no style is chosen; flamenco / jazz / fingerstyle (and prog) as add-ons; a grade per level that orders the path | P1 | M | **yes** |
| 6 | Chord recognizer (microphone): closed-set first, then open-set | P1 (closed) / P2 (open) | M / M | no |
| 7 | A placement probe for every family (≈ 5 min, adaptive) → `placeGuitar` | P2 | M | no |
| 8 | Nylon and clean-electric sounds, modelled like the steel string (`pluck.ts`) | P2 | S + S–M | samples only with the owner's OK |

Suggested order: §2 tempos (small, unblocks honest stars) → §5 core path + grade ordering → §1 ear → §6 closed-set
recognizer → §4 jazz + prog → §3 batches → §7 probes → §8 sounds.

---

## 1. Inventory (exact, at `f35d65f`)

### 1.1 Technique catalogue: `src/engine/drills/guitar.ts` → `guitarCatalog()`

There are **13 shown families with 79 levels**. A further 7 levels belong to the retired `g-bass` family (kept so that
old ids stay valid, never shown). The bass families (`bassFamilies()`) and drum families (`drumFamilies()`) live in the
same catalogue but belong to other courses.

| Family | Levels | Genres (family / level tags) | Kinds used |
|---|---|---|---|
| `g-fretting` Fretting hand | 6 | all | spider (×24 perms), cross, walk, stretch |
| `g-picking` Picking | 7 | all; L5–6 rock / metal, L7 country | single-string, cross, pedal, 3nps, 3nps-economy, skip, tremolo, sweep3, sweep5, hybrid, chicken, banjo |
| `g-legato` Legato | 6 | all; L6 rock / metal | hammer, pull, trill, penta-legato, 3nps-legato, tap, tap-arp |
| `g-scales` Scales | 7 | all | penta (boxes 1–5), blues, caged (5), 3nps (7), one-string, mode (modes, harmonic / melodic minor, symmetric, altered), seq3, seq4, seq-g3 |
| `g-arps` Arpeggios | 5 | all; L5 jazz / rock / blues | triad, caged-arp, inversions, seventh (9 kinds), iivi-arp |
| `g-chords` Chords and changes | 7 | all; L4 rock / metal / blues / pop | chord-check (open, 7th, sus / add9), one-minute, power, barre-check, barre-changes, triad-inv, caged-chords |
| `g-rhythm` Rhythm guitar | 7 | per level: pop / rock / country; blues; reggae; funk; latin / jazz; metal | quarters, eighths, waltz, old-faithful, rock8, arp-pick, shuffle, boom-chick, reggae, ska, funk16, funk-stabs, bossa, freddie, clave, gallop, chug |
| `g-lead` Lead techniques | 7 | rock / blues / metal / pop / country / funk | slides, harmonics, bend (½, 1, 1½), prebend, unison, vibrato (narrow / wide), double-stops, bb-box |
| `g-fingerstyle` Fingerstyle | 6 | fingerstyle / classical / country / pop | thumb, pima (10 patterns), travis, scale-stroke, ligado, campanella, tremolo |
| `g-flamenco` Flamenco | 5 | flamenco | rasgueado, rasg-triplet, picado, alzapua, compas (soleá, bulería, seguiriya, rumba) |
| `g-jazz` Jazz guitar | 7 | jazz / latin | shells, comp, drop2, drop3, iivi-drop2, guide-tones, walking, harmonized, octaves |
| `g-reading` Reading by position | 5 | all | position (I, II, V, VII, IX, XII) |
| `g-impro` Improvising: target notes | 4 | blues / rock / jazz / all | targets-root, targets-third, targets-arp, targets-guide over 4 forms (`IMPRO_FORMS`) |

Levels per family: 6 + 7 + 6 + 7 + 5 + 7 + 7 + 7 + 6 + 5 + 7 + 5 + 4 = **79**.

**Tempo.** No guitar level has a `tempo` range. `targetBpmOf` (`plan.ts`) falls back to start × `DEFAULT_TARGET_FACTOR`
(1.25), so "level passed" means a 25 % climb from wherever the item happens to start. The bass levels have real
`[start, target]` ranges and a `sub` label, and the bass levels carry exam tags (`EXAM` → `LevelDef.exam`). The
piano can use `nps`.

**Path.** `path.ts::ladderSteps()` gives guitar level *i* of every family a difficulty of `700 + 70·i`. There is no
guitar offset map (`KEYS_LATER` / `DRUM_LATER` exist for piano, drums and two bass families). The family filter is
`DrillSettings.guitarStyle` (one value). With the default (`all` / unset) **all 13 families** are on the path.

**Placement.** `GUITAR_PROBES` holds 5 tempo staircases: fretting (chromatic 1-2-3-4), scales (A minor pentatonic box
1), chords (A ↔ D), rhythm (down-up 8ths) and legato (trill 1-2). Other families start from the probes' mean − 1.

### 1.2 Topics and games in the guitar course

- **Topics** (`topicsInstrument.ts`; answers played on the neck or tapped on it):
  - `play-back` (6 levels, shared with bass / keys / strings / winds);
  - `fret-notes` (5);
  - `fret-intervals` (4);
  - `fret-chords` (5 guitar levels; levels 6–7 are the bass course's);
  - `fret-scales` (4 guitar levels);
  - `song-play` (public-domain songbook, 40 songs).
- **Games** (`courseRows.ts`): drills, rush-fretboard, tuneup, rush-chord, highway, rush-note, rhythm.
- **Practice rows:** drills, songs, pieces, games.

### 1.3 Measurement available (`guitarAnalyze.ts`, `chroma.ts`)

- energy and pitch-change onsets;
- octave folding;
- strums clustered into one chord;
- unpitched onsets (muted chucks);
- bend intonation in cents;
- vibrato rate and width;
- legato volume ratio;
- chord-change gaps;
- palm-mute (decay + centroid);
- changes per minute;
- the chroma **ring-check**: are the expected pitch classes present.

It is score-informed: it checks a *known* chord and never names an unknown one. `Drill.listen` / `windows` (call and
response), `Drill.band` / `chart` (backing band), `pulse: 8` + `groups` (odd meters, used by bass `b-time` 10 and the
drums) and `untimed` (off-ladder items) all exist in `types.ts`.

### 1.4 Sound

There is one modelled steel-string (`src/audio/pluck.ts`, Karplus–Strong, tuned to within 5 cents). There is no nylon
and no electric model. `fx.ts` already has `driveCurve` (waveshaper) and `makeImpulse` (synthetic reverb IR).

---

## 2. Real target tempos

### 2.1 Grade anchors (what the boards ask)

The RSL / Rockschool *Guitar Syllabus Guide 2012–2018* is verified from the PDF (text extracted). RSL's current
syllabus (2018 / 2024 books) may differ by a few bpm; check it against the current book before shipping.

| RSL grade | Scales | Arpeggios | Riff | Sight reading | Improvisation | Ear: melodic / rhythmic or harmonic recall |
|---|---|---|---|---|---|---|
| Debut | ♩70 | – | 70 | 70 | – | 85 (1 bar) / 80 |
| 1 | ♩70 | – | 70 | 70 | 70–80 | 85 / 90 |
| 2 | ♩80 | – | 80 | 70 | 80–90 | 85 / 90 |
| 3 | ♩90, 2 octaves, **8ths** | ♩90, 1 octave, quarters | 90 | 75–85 | 80–90 | 85 (2 bars, pentatonic) / 90 |
| 4 | ♩80, 8ths, **two positions** (root on 6 and 5) | ♩80, 8ths, 2 octaves | 100 | 80–90 | 90–100 | 90 / 90 (harmonic: I IV V) |
| 5 | ♩80, 8ths (+ harmonic minor) | ♩80, 7th arps | 100 | 90 | 90–100 | 90 / 80 (I IV V vi) |
| 6–8 | ♩**100**, 8ths, 2 octaves, 2 positions; G6 Dorian / Mixolydian + 5 pentatonic shapes; G7 Lydian / Phrygian / melodic minor; G8 whole-tone / diminished / altered | ♩100: 7ths, 9ths, 7♯5 / 7♭5 / 7♯9 / 7♭9 | stylistic study (rock-metal: tapping + legato; funk: 16th strumming; jazz-latin-blues: bends + double stops) | quick-study piece ♩80–200 | in the QSP | 90 / 90 (harmonic: I ii iii IV V vi V7 at G6; + ii7 iii7 vi7 at G7; + I7 IV7 at G8). The candidate **plays the roots** of a 4-bar sequence |

Other anchors (from `GUITAR_TECHNIQUE_RESEARCH.md` §2–3):

- **RGT acoustic G5** scales ≈ ♩116 in 8ths (secondary source).
- **RGT electric G1–8** lists keys and positions; the tempo table is not published online. The LCM / RGT
  "technical requirements" PDF was re-read for this plan and has no tempos.
- **LCM classical**: scales ♩80 (G1) → 108 (G8); arpeggios ♪160 → 220.
- **ABRSM classical**: scales ♩48 → 144 (note values uncertain).
- **Trinity Rock & Pop**: songs at their own tempo, plus session skills (playback or improvising). There are no
  technical tempos to copy. Its "Technical Focus" song is the model for our style levels.

Two reading notes:

- **Exam tempos are floors, and slow ones.** RSL G8 scales are 3.3 notes per second. A "sophisticated" rock / prog /
  jazz player is expected well above that in 16ths and triplets. Above grade 8, the table uses the method-book
  landmarks of the research doc (T5–T7 bands) and says so.
- **The ear numbers matter for `g-ear`** (§1): 1–2 bar calls at ♩85–90, and the grade 6–8 "play the roots of the
  chord sequence" test. Our ear levels mirror those formats with generated material.

### 2.2 The engine change (S)

1. Give every guitar level `tempo: [start, target]` and `sub`, as the bass levels have. `targetBpmOf` already honours
   the range: no code change there.
2. Add an optional **per-item target**: `SpecTemplate.target?`, copied to the `Drill` and preferred by `targetBpmOf`.
   Some levels mix items whose natural tempo differs (reggae and ska; the four flamenco palos; bossa and Freddie Green).
   Without it, an item whose start lies above the level's target passes at its start. The bass `b-styles` 12–13 already
   hit this.
3. Add `untimed` for items whose skill is not speed: chord ring checks, harmonics, vibrato and held bends. These items
   are off the ladder and pass on 3 clean takes on 2 days.
4. Add `grade` (0 = Debut … 8, 9 = beyond grade) and exam tags (`EXAM` map, as the bass has) on every level. The grade
   also drives the path order (§5).

Tests: extend `tests/guitarDrills.test.ts` (every shown level has a range, target ≥ start, `sub` set) and
`tests/guitarAudit.test.ts` (a steady synthetic take passes at the target, as in the drums sweep).

### 2.3 Proposed table (existing 79 levels)

♩ unless noted. **Gr** is the RSL-equivalent grade (9 = beyond grade 8). "untimed" = off the ladder.

| Level | Sub | Start → target | Gr | Anchor / why |
|---|---|---|---|---|
| fretting 1 chromatic 1-2-3-4 | 8ths | 60 → 100 | 2 | RSL G2–3 8ths at 80–90, a margin above |
| fretting 2 permutations | 8ths | 60 → 100 | 3 | as L1 |
| fretting 3 spider crossing | 8ths | 60 → 100 | 3 | |
| fretting 4 chromatic walk | 8ths | 70 → 110 | 4 | position shifts at RSL G4 tempo + margin |
| fretting 5 all 24 perms | 16ths | 50 → 90 (6 nps) | 6 | beyond exam speed: T5 |
| fretting 6 stretches | 8ths | 50 → 80 | 5 | accuracy over speed |
| picking 1 one string | 8ths / 16ths | 60 → 120 (8ths); 16ths item 60 → 100 (per-item target) | 1 | |
| picking 2 crossing / pedal | 8ths; pedal 16ths | 60 → 110 | 3 | |
| picking 3 3nps alt / economy | triplets | 50 → 90 (4.5 nps) | 6 | RSL G6–8 at 3.3 nps + margin |
| picking 4 string skipping | 8ths | 60 → 100 | 5 | |
| picking 5 tremolo | 16ths | 60 → 120 (8 nps) | 7 | burst technique: rock / metal standard |
| picking 6 sweep 3 / 5 strings | triplets / 16ths | 40 → 80 | 8 | after scales 6 (§5) |
| picking 7 hybrid / chicken / banjo | 8ths | 60 → 100 | 6 | country |
| legato 1 hammer-ons | 8ths | 60 → 100 | 2 | audit proposal |
| legato 2 pull-offs | 8ths | 60 → 100 | 2 | |
| legato 3 trills | 16ths | 60 → 100 | 4 | |
| legato 4 pentatonic legato | triplets | 60 → 100 | 5 | |
| legato 5 3nps legato | triplets | 60 → 100 (5 nps) | 7 | |
| legato 6 tapping | triplets / 16ths | 60 → 100 | 8 | RSL G6–8 rock-metal study: tapping + legato |
| scales 1 minor pentatonic box 1 | 8ths | 70 → 100 | 1 | RSL Debut 70 → G3 90 |
| scales 2 boxes 2–5 | 8ths | 70 → 100 | 4 | RSL G6 asks all 5 shapes at 100 |
| scales 3 blues, major pentatonic | 8ths | 70 → 100 | 3 | RSL G3 |
| scales 4 major E / A shapes | 8ths | 70 → 100 | 4 | RSL G4: two positions at 80, + margin |
| scales 5 all 5 CAGED | 8ths | 80 → 110 | 5 | RGT G5 three positions; RGT acoustic G5 ≈ 116 |
| scales 6 3nps, one-string | triplets | 60 → 100 (5 nps) | 7 | |
| scales 7 modes, minor, symmetric, altered; sequences | 8ths | 80 → 120 | 8 | RSL G6–8 modes / altered at 100 + margin |
| arps 1 triads root 6 / 5 | 8ths | 60 → 90 | 3 | RSL G3 arps at 90 (quarters) |
| arps 2 CAGED triads | 8ths | 60 → 90 | 4 | RSL G4 2-octave arps at 80 |
| arps 3 inversions on string sets | 8ths | 60 → 100 | 5 | RSL G5 triads in 3 inversions |
| arps 4 7th arps | 8ths | 70 → 100 | 5 | RSL G4–5 7th arps at 80; G6 at 100 |
| arps 5 °7, altered, ii–V–I | 8ths | 70 → 110 | 8 | RSL G8 altered at 100 |
| chords 1 open-chord ring check | – | untimed | 0 | ring test, not speed |
| chords 2 one-minute changes, 1 per bar | quarters (1 strum a bar) | 60 → 120 = 15 → 30 changes / min | 1 | JustinGuitar-style counts |
| chords 3 faster changes; 7th / sus / add9 checks | halves (2 a bar); checks untimed | 60 → 120 = 30 → 60 changes / min | 2 | RSL G1–3 chord lists |
| chords 4 power chords, palm-muted | 8ths | 80 → 130 | 3 | RSL G3–4 riffs at 90–100 |
| chords 5 barre checks | – | untimed | 3 | RSL G3 barre chords |
| chords 6 barre changes, triad inversions | quarters | 60 → 100 | 4 | RSL G3 barre sequence at 90 |
| chords 7 CAGED chords up the neck | quarters | 60 → 90 | 5 | |
| rhythm 1 quarters, 8ths, waltz | 8ths | 70 → 100 | 0 | RSL Debut–1 at 70 |
| rhythm 2 D DU UDU, palm-muted 8ths, picked arps | 8ths | 70 → 110 | 1 | |
| rhythm 3 shuffle, boom-chick | swung 8ths / quarters | 80 → 120 | 3 | |
| rhythm 4 reggae / ska | 8ths | reggae 70 → 90; ska 110 → 150 (per-item) | 3 | |
| rhythm 5 16th funk, stabs | 16ths | 80 → 105 | 5 | RSL G6 funk study |
| rhythm 6 bossa, Freddie Green, clave | 8ths / quarters | bossa 100 → 140; Freddie 100 → 180 (swing); clave 90 → 120 (per-item) | 5 | |
| rhythm 7 metal gallop, chugs | 16th-8th-8th | 90 → 150 | 5 | |
| lead 1 slides; harmonics | quarters; harmonics untimed | slides 60 → 90 | 2 | |
| lead 2 ½-step bends to pitch | quarters | 60 → 80; the rule is cents (± 20 → ± 15) | 3 | RSL G6 jazz-blues study: bends |
| lead 3 whole-step bends | quarters | 60 → 80; ± 15 c | 4 | |
| lead 4 bend-release, pre-bend, unison | quarters | 60 → 80 | 5 | |
| lead 5 vibrato narrow / wide | – | untimed (rate 4–7 Hz, width rule) | 4 | |
| lead 6 double stops 3rds / 6ths | 8ths | 60 → 100 | 5 | RSL G6 jazz-blues study: double stops |
| lead 7 B.B. King box, 1½ bends | quarters / 8ths | 60 → 90 | 6 | |
| fingerstyle 1 thumb, p-i-m-a | 8ths | 60 → 90 | 1 | LCM arps ♪160 = ♩80 |
| fingerstyle 2 arpeggio patterns | 8ths | 60 → 100 | 2 | |
| fingerstyle 3 Giuliani patterns | 8ths / triplets | 60 → 100 | 3 | LCM ♪160 → 220 |
| fingerstyle 4 Travis | 8ths | 70 → 110 | 4 | |
| fingerstyle 5 rest / free stroke, ligados, campanella | 8ths | 60 → 96 | 5 | ABRSM G5 scales 96; LCM 80 → 108 |
| fingerstyle 6 tremolo p-a-m-i | 16ths (4 per beat) | 50 → 80 | 8 | |
| flamenco 1 four-stroke rasgueado | 16ths | 60 → 100 | 3 | |
| flamenco 2 triplet rasgueado | triplets | 60 → 100 | 4 | |
| flamenco 3 picado | 16ths | 60 → 110 | 6 | |
| flamenco 4 alzapúa | triplets | 60 → 100 | 6 | |
| flamenco 5 compás | per palo (♪ pulses) | soleá ♪120 → 180; bulería ♪180 → 240; seguiriya ♪120 → 160; rumba ♩90 → 120 (per-item) | 7 | |
| jazz 1 shells, four to the bar, comping | swing quarters | 100 → 160 | 4 | RSL QSP ♩80–200 |
| jazz 2 drop-2 inversions | halves | 60 → 100 | 5 | |
| jazz 3 drop-3 ii–V–I | halves | 60 → 120 | 6 | |
| jazz 4 drop-2 ii–V–I voice-led | halves | 60 → 120 | 6 | |
| jazz 5 guide-tone lines | halves / quarters | 80 → 140 | 6 | |
| jazz 6 walking bass on guitar | quarters | 80 → 140 | 7 | bass `b-walk` uses similar ranges |
| jazz 7 harmonized scale (chord melody), octaves | quarters / swing 8ths | 60 → 100 / 80 → 140 (per-item) | 8 | |
| reading 1 position I, strings 1–3 | quarters / 8ths | 60 → 70 | 1 | RSL sight reading Debut–2 at 70 |
| reading 2 position I, all strings | 8ths | 60 → 75 | 2 | |
| reading 3 positions II and V | 8ths | 65 → 85 | 3 | RSL G3 at 75–85 |
| reading 4 position VII, mixed rhythms | 8ths | 70 → 90 | 4 | RSL G4 at 80–90 |
| reading 5 positions IX and XII | 8ths | 75 → 100 | 5 | RSL G5 at 90 + margin |
| impro 1 roots on 1 | quarters | 70 → 90 | 2 | RSL improvisation G1–2 at 70–90 |
| impro 2 3rds on 1 | quarters | 75 → 100 | 3 | |
| impro 3 chord-tone arps through the form | 8ths | 80 → 110 | 5 | RSL G4–5 at 90–100 |
| impro 4 guide tones through the form | swing 8ths | 90 → 120 | 6 | |

The verdict tiers (windows, timing SD, hit rate) stay as they are. Only the ladder's end point moves.

---

## 3. The guitarist's ear: `g-ear` (P1, M)

It works like `b-ear` (`bassEar.ts`), `d-ear` (`drumEar.ts`) and `k-ear` (`generate.ts`):

- The band or the app's guitar plays the call (`Drill.listen`).
- The player answers **on the guitar** in the bars after it.
- Onsets inside the call windows are dropped, so a speaker's call is never taken for the answer.
- Answers match by pitch class (any octave, any position; `guitarAnalyze` already folds octaves).
- Rhythm uses the normal tiers.
- The written answer stays hidden until the result.
- Calls are generated and seeded per key and option, so they cannot be memorised.

| L | Title | Call | Measured answer | Tempo | Gr / anchor |
|---|---|---|---|---|---|
| 1 | Find the tonic | I–IV–V–I, then i–iv–V–i in the relative minor | the tonic twice (pitch class) | 70 → 90 | 1 |
| 2 | Melodic recall, 1 bar | 3–4 notes from minor pentatonic; the first note is the root, and it is given | the notes in order and in rhythm | 75 → 90 | 1–3 (RSL melodic recall, ♩85) |
| 3 | Melodic recall, 2 bars | major or minor pentatonic; the first note is the root or the 5th; drum backing | the same | 80 → 90 | 4–8 (RSL ♩90) |
| 4 | Rhythm recall | 2 bars of strummed rhythm (8ths, 16ths, ties) | the rhythm on muted strings (unpitched onsets) | 80 → 100 | 1–5 (RSL ♩90) |
| 5 | Riff recall | a 1–2 bar riff on strings 6–5: single notes plus power chords | root pitches in rhythm; a power chord counts as its root, plus a ring-check of the 5th | 80 → 110 | 4 |
| 6 | Root finder: I, IV, V, vi | a 4-bar sequence with bass and drums | the roots in the given rhythm (strings 6 / 5) | 80 → 100 | 4–5 (RSL harmonic recall) |
| 7 | Root finder: ii, iii, V7, ♭VII | as L6 | as L6 | 80 → 100 | 6–8 (RSL G6–8) |
| 8 | Chord quality by ear | one chord over its root (maj, min, 7, maj7, m7, m7♭5, °7) | its arpeggio from the given root (pitch). Once the §6 recognizer exists: strum the chord instead | 60 → 90 | 6 |
| 9 | Find the key | a 4-bar groove in an unseen major or minor key | the tonic, then pentatonic box 1 in that key up and down (pitch classes, any position) | 70 → 90 | 5 |
| 10 | Transcribe a line | 2 bars of 8ths: blues lines first, then lines with chromatic passing and approach notes | played back note for note (pitch class + rhythm) | 70 → 100 | 8–9 |

Jazz and prog ear work (ii–V–I guide tones by ear, an odd-meter riff echo) sits inside `g-jazz` 9 and `g-prog` 2
(§4), so it only reaches players who chose those add-ons.

**Files.**
- New `src/engine/drills/guitarEar.ts`. Prefer to lift the instrument-neutral call builders from `bassEar.ts` (tonic,
  roots, rhythm, melodic, transcribe, quality) into a shared helper with a register parameter (guitar E2–E5, bass
  E1–G3), and do not copy them.
- A case `'g-ear'` in `generateGuitar` and the family in `guitarCatalog()` (core, §5).
- A glyph in `src/ui/stepGlyphs.ts` (ear + pick), plus badges and the `EXAM` tags.
- A probe (§7).
- `tests/guitarEar.test.ts`: every item's answer is reachable on the neck (fret ≤ 22), a played answer is clean, and
  speaker onsets inside call windows are ignored.

**Rating.** `rhythm-dictation/` for L4, `melodic-dictation` for L2, L3, L5 and L10, `harmony/` for L6–L8, and `tonality`
for L1 and L9. This is the course's ear share, as with the bass.

---

## 4. Deepening to about 130 levels

New levels are added **after** the existing ones in each family (ids stay stable for items, badges and frozen path
units), and the path order comes from the grade (§5), not from the level number. +49 levels: 79 → 128.

### 4.1 Core families

| Family | New levels (Gr) | What is measured |
|---|---|---|
| `g-scales` +3 | **8** Connecting CAGED positions: one scale across 3 positions with shifts on the beat (5). **9** 3nps across the whole neck: two-octave runs with a slide shift (7). **10** Interval sequences in position: 3rds, 4ths, 6ths, diagonal 4-note groups (8) | notes, shift gap (the existing `changeGaps` idea on the shift), timing |
| `g-rhythm` +3 | **8** Rock riffs: power chords + single notes, 16th syncopation, muting between hits (4). **9** R&B / neo-soul: double-stop and triad embellishments over a progression, 16ths (6). **10** Mizrahi / Israeli: maqsum-strum patterns and Hijaz fills over the band (5; tie-in with bass `b-styles` 13 and drums `d-mideast`) | onsets, palm-mute and unpitched shares, ring-check per chord |
| `g-lead` +3 | **8** Bends in phrases: bend + release + vibrato on the target, with the band (6). **9** Hybrid lead: slides + legato + bends inside a 4-bar generated phrase (7). **10** Pinch harmonics and whammy-free "steel" bends (oblique bends: hold one note, bend the other) (8) | cents per bend, vibrato rate / width, timing. Pinch harmonics: pitch = harmonic of the fretted note (+12 / +19 / +24) by YIN; to calibrate with real takes |
| `g-picking` +2 | **8** Sweep arpeggios on 7th chords and 5-string with a tap (9). **9** Economy and hybrid picking in fusion lines (wide intervals, string skips) (9) | timing SD per string change, notes |
| `g-legato` +2 | **7** Legato with position shifts (slides between 3nps groups) (8). **8** Eight-finger tapping and tapped arpeggio sequences (9) | legato volume ratio, timing |
| `g-reading` +3 | **6** Rhythm-chart reading: slashes plus written hits ("play time, catch the hits") with the band (5). **7** Reading in two positions with shifts, ledger lines above the staff (6). **8** Lead-sheet reading: a melody line + chord symbols; play the melody (ours, generated), then comp the symbols (7) | notes, hits on time, ring-check for the comping |
| `g-arps` +2 | **6** 7th arpeggios in all 5 CAGED shapes (6). **7** 9th / 13th arpeggios and upper-structure triads over dominants (8–9) | notes, timing |
| `g-impro` +2 | **5** Chord-scale lines through a standard's changes (`STANDARD_CHANGES`, 40 tunes, chords only, legal): every bar starts on a chord tone (7). **6** Motif and rhythmic displacement: a given 2-beat motif moved through the form (8) | a target note on beat 1 (existing `targets-*` rules), chord-tone share on strong beats |

### 4.2 Jazz for the niche (add-on)

`g-jazz` +5 (8–12):

| L | Content | Gr | Measured |
|---|---|---|---|
| 8 | **Comping on standards**: shells and drop-2 through a standard's changes, in Charleston / Freddie Green / anticipation rhythms, with the band (bass + drums, `bandComping` / `walkingBass`) | 6 | timing of each hit; ring-check that the 3rd and 7th sound on each chord |
| 9 | **Voice leading by ear and by hand**: hear a ii–V–I in an unseen key, then play its guide tones (3–7–3) and comp it in drop-2 with the top voice moving by step | 7 | guide-tone pitches; top-note movement ≤ a whole step (pitch of the highest string from a per-string onset, or chroma + the known voicing) |
| 10 | **Chord melody**: harmonize a melody in drop-2 with the melody on top. Melodies are **ours** (generated over standards' changes) or from the public-domain songbook, never copyrighted melodies | 8 | the melody note (top voice) in time + ring-check of the voicing |
| 11 | **Rhythm changes and tritone substitutions**: comping in drop-3 / shells at ♩140 → 200 | 8 | as L8 |
| 12 | **Solo-guitar texture**: walking bass on strings 6–5 with chords on the "and" (our own patterns) | 9 | bass line pitches on the beats + ring-check of the upper voices |

New `g-harris`: Barry Harris applied to guitar (6 levels). It reuses `src/engine/barry.ts` (`moveDim`, `SIX_OVER`,
`barryLine`, `ruleFor`, `pivot`) and the piano `harris` family's ideas, written for the neck.

| L | Content | Gr | Measured |
|---|---|---|---|
| 1 | Major 6th-diminished scale in two positions (C6 + B°7) | 6 | notes, swing 8ths |
| 2 | 6th-diminished chord scale: drop-2 C6 / B°7 alternating on strings 4-3-2-1 | 7 | ring-check per chord, timing |
| 3 | Dominant scale descending with the half-step rules, chord tones on the downbeats | 7 | notes; a rule check that chord tones land on the beats (`chordTonesOnBeats`) |
| 4 | Triads off degrees and "3 to 9"; pivots | 8 | notes |
| 5 | Half step below, enclosures; ii–V–I lines in 12 keys | 8 | notes, target on beat 1 |
| 6 | Minor 6th-diminished; the "brothers" (dominants a minor 3rd apart) | 9 | notes / ring-check |

Tempos for `g-harris`: swing 8ths, 80 → 160 (L1–3) and 100 → 180 (L4–6).

### 4.3 Prog / fusion for the niche: new `g-prog` (8 levels)

Odd meters use the engine's existing `pulse: 8` and `groups` (bass `b-time` 10, drums `d-mideast` 7–8).

| L | Content | Gr | Measured | Engine need |
|---|---|---|---|---|
| 1 | Odd-meter riffs: 7/8 (2+2+3) and 5/4 (3+2), single notes + power chords | 5 | pitch + timing; click on the group starts | `groups` in guitar drills (S) |
| 2 | 9/8 and 11/8, changing groupings (3+3+2+3); odd-meter riff echo by ear (call and response) | 6 | the same + the ear windows | – |
| 3 | Mixed meters: 4/4 → 7/8 → 4/4 bar by bar, with the band | 7 | bar-line landing | per-bar meter in a drill (M, shared with the drums `d-prog`) |
| 4 | Polyrhythm in riffs: groups of 3 16ths over 4/4 (accented), 5-over-4 accent cycles | 7 | timing + accent positions from onset loudness (RMS at the onset) | an accent rule for guitar (S) |
| 5 | Metric modulation: the riff's dotted-8th or triplet becomes the new beat; the click changes on cue | 8 | the new tempo's IOI ratio (error ≤ 2 %) + landing on 1 | a tempo map in a drill (M, shared with the drums) |
| 6 | Modes in riffs: Lydian, Phrygian, Phrygian dominant (Hijaz), harmonic minor, Hungarian minor, double harmonic, in position | 6 | notes | – (scales exist: add the exotic ones to `SCALES`) |
| 7 | Fusion lines: pentatonic side-slips ("outside"), symmetric diminished and whole-tone sequences, wide-interval legato | 8 | notes, timing | – |
| 8 | **Unisons with the band**: the app's bass plays an odd-meter unison line; lock to it | 9 | onset lock to the bass line (a `kickLock`-style metric from `bassAnalyze`) + pitch | the band plays a written line (S) |

Tempos: L1–3 ♪180 → 260 (8th pulse); L4 ♩70 → 110 in 16ths; L5 ♩80 → 110; L6–7 8ths ♩80 → 130 / 16ths ♩60 → 100;
L8 ♪200 → 280.

### 4.4 Batches

1. **Batch A** (with §4.2 / §4.3): `g-jazz` 8–12, `g-harris`, `g-prog` 1–2 and 6–7 (no engine work).
2. **Batch B** (needs the per-bar meter / tempo-map work, shared with the drums plan): `g-prog` 3–5 and 8.
3. **Batch C**: the core additions in §4.1.

Each batch includes:
- generators in `guitar.ts`, or a new `guitarJazz.ts` / `guitarProg.ts` to keep `guitar.ts` (2,575 lines) readable;
- the catalogue entries;
- glyphs (`stepGlyphs.ts`, one per family);
- badges (no emoji: mature-UI rule);
- the `EXAM` tags;
- the topic tags and rating subs;
- the human-take sweep test (as `tests/drumAudit.test.ts` does for the drums);
- a 390 × 844 screen check of every new level.

---

## 5. A core path when no style is chosen (P1, M; owner decision)

### 5.1 Today

No style means all 13 families, so every beginner meets flamenco, jazz and target-note improvising. Level *n* of every
family sits at the same path difficulty, so sweep picking (picking 6) lands next to barre changes, and 3nps picking
comes before 3nps scales.

### 5.2 Proposal (the owner's recommended default)

- **Core, always on.** Fretting, picking, legato, scales, arpeggios, chords, rhythm (pop / rock / blues / funk /
  reggae / metal levels), lead, reading, ear (`g-ear`), and improvising L1–4. With §4.1 that is 85 levels (85 core +
  21 jazz + 5 flamenco + 6 fingerstyle + 11 prog = 128).
- **Add-ons, only if chosen.** Each is a tick box on one screen at the start of the course, and can be changed in
  Settings any time.

  | Add-on | Contents | Levels |
  |---|---|---|
  | Jazz | `g-jazz`, `g-harris`, `g-impro` 5–6, rhythm 6 (bossa, Freddie Green, clave) | 21 |
  | Flamenco | `g-flamenco` | 5 |
  | Fingerstyle / classical | `g-fingerstyle` | 6 |
  | Prog / fusion (recommended for the niche) | `g-prog`, picking 8–9, legato 8 | 11 |

  The default core can still reach prog-level technique (tapping, sweeps, modes, 3nps). The prog add-on is for odd
  meters, metric modulation and fusion vocabulary.
- **Ordering by grade.** Each level's `grade` (§2.3, §3, §4) gives its path difficulty:
  `700 + 140·grade + 20·(family teaching rank)`. This replaces `700 + 70·i`. It fixes the audit's ordering problems:
  - sweep picking is grade 8, after scales 6 (grade 7);
  - 3nps picking (grade 6) comes with 3nps scales.

  Within a grade the families interleave, which suits the themed spiral units already approved (2026-11-07).
- **Settings shape.** `guitarStyle` (one value) becomes `guitarAddOns: ('jazz' | 'flamenco' | 'fingerstyle' | 'prog')[]`
  plus an optional `guitarFlavour` emphasis (rock, blues, pop, country) that only orders rhythm levels and the songs.
  Old values migrate as follows:

  | Old `guitarStyle` | New setting |
  |---|---|
  | jazz, latin | add-on `jazz` |
  | flamenco | add-on `flamenco` |
  | classical, fingerstyle | add-on `fingerstyle` |
  | rock, metal | flavour rock, no add-on |
  | `all` | core only |

  `all` → core only changes what an existing guitar player sees. Levels already earned stay counted (frozen path
  units keep their ids), and nothing is taken away from progress.

Owner questions (product, not UI):

1. Is prog an add-on or part of core at grade 7+?
2. Should the jazz add-on come pre-ticked for players who also chose the Jazz course?
3. Do country levels (picking 7, hybrid) stay core or become a "country" flavour?

**Files.**
- `types.ts` (`DrillSettings`);
- `plan.ts::shownFamilies` (filter by add-ons + grade);
- `path.ts::ladderSteps` (grade-based difficulty for guitar levels; drop the implicit `700 + 70·i` for guitar);
- `guitar.ts` (family `addOn` tag, level `grade`);
- `ladderFacts.ts`;
- the onboarding course start and the Settings guitar section (`Drills.tsx` style segment → add-on boxes);
- migration in the settings loader;
- tests: `tests/guitarPath.test.ts` (no add-on family on a core path; grade order monotonic; old settings migrate).

---

## 6. Chord recognizer (microphone)

### 6.1 Feasibility

- **What exists.** `chroma.ts` folds a long FFT into 12 bins and `ringCheck` asks "is each expected pitch class
  present". That is score-informed and reliable for drills.
- **What a recognizer must add:**
  - name a chord the app did not dictate (open-set), or pick among a few candidates (closed-set);
  - read the bass note (inversions, slash chords).
- **Expected accuracy.** Published chord-estimation systems on full band recordings reach roughly 75–85 % for
  major / minor (MIREX-type evaluations), and less for 7ths. A single guitar, close to the phone, with a **closed set**
  of 2–6 candidates, should do clearly better. That is a hypothesis to measure, not a promise.
- **Hard cases:**
  - distortion (intermodulation fills the chroma: ask for a clean tone);
  - the band leaking from the speaker (use the headphones gate, or only listen in the answer windows);
  - capo and drop tunings (the known tuning sets the bass search range);
  - very quiet upper strings (weight by onset-time spectra, not by sustain).

### 6.2 Design

1. **Capture.**
   - FFT 8192 at 48 kHz (5.9 Hz bins; low E 82 Hz is resolved), Hann window, hop 25 ms.
   - Take frames 60–450 ms after a strum onset (`detectOnsets`).
   - Use a log-frequency HPCP: peak picking, with harmonic weighting so that partials 1–4 are credited to their
     fundamentals, which reduces the "3rd harmonic = 5th" bias.
2. **Bass.** YIN on the 70–330 Hz band in the same window (`yin.ts` with `bassPitchOpts`). The lowest stable f0 is the
   sounding bass, which separates C/E from C.
3. **Templates.** Binary chord templates smoothed with the expected harmonic profile of a plucked string. The
   profile can be trained once offline on `pluck.ts` renderings of every shape in `OPEN` / `E_SHAPE` / `A_SHAPE` and
   the drop-2 sets.
4. **Closed set** (used by topics, ear levels and games). For each candidate, score = cosine(chroma, template) + bass
   agreement. Accept when best − second ≥ a margin, and otherwise say "play it again". Never guess.
5. **Open set** (a "what chord is this?" tool). Use 12 roots × {M, m, 7, maj7, m7, m7♭5, °7, sus2, sus4, 5} + bass,
   with an HMM / median filter over successive strums for a progression. Report confidence, and show only above a
   threshold.
6. **Output.** `{ root, quality, bass, confidence, missing: pcs[] }`. `missing` reuses the ring-check, so feedback
   can say "B string not ringing".

### 6.3 Uses

- `fret-chords` topics answered by strumming instead of tapping the neck;
- `g-ear` 8 (strum the quality);
- `g-jazz` 8–11 (voicing check);
- `g-rhythm` 9–10 (per-chord check);
- Chord Rush on the guitar, played;
- song-play chords;
- a Tools card "Chord finder" (open-set).

### 6.4 Phases, sizes, files

| Phase | What | Size |
|---|---|---|
| P1 | Closed-set `recognizeChord(frames, candidates, tuning)` in a new `src/engine/chordRecognize.ts`, plus the bass read; wired into `fret-chords` and `g-ear` 8 | M |
| P2 | Open-set + progression smoothing, and the Tools card | M |
| P3 | Calibration with the owner's real takes (steel, nylon, clean electric), and thresholds marked ⚙ | S, needs real takes |

Tests:
- `tests/chordRecognize.test.ts` on synthetic strums rendered by `pluck.ts`: every open / barre / drop-2 shape is
  recognized in the closed set, and inversions by the bass;
- a noise and room test, as `drumAcoustic.test.ts` does.

---

## 7. Placement probes for every family (P2, M)

The probe extends `GUITAR_PROBES` from 5 to 15 steps. It is adaptive, as the drums probe is (`DRUM_PROBES` /
`placeDrums`): a failed easy step skips the harder ones, and add-on probes run only for the chosen add-ons. Core steps
take about 4 minutes, plus about 1 minute per add-on. Every step is a measured take.

| Step | Family | Probe item | Decides |
|---|---|---|---|
| 1 | fretting | chromatic 1-2-3-4, staircase from ♩60 (exists) | L1 / L3 / L5 by best clean tempo |
| 2 | picking | alternate picking, one string, 16ths staircase from ♩60 | L1 / L3 / L5 (nps) |
| 3 | chords | A ↔ D changes (exists) + an F barre ring check | L1–L3; L5 if the barre is clean |
| 4 | rhythm | down-up 8ths (exists); if clean, 16th funk with muted ghosts at ♩85 | L1 / L3 / L5 |
| 5 | scales | A minor pentatonic box 1 (exists); if clean, the major scale E-shape at ♩90 | L1 / L3 / L5 |
| 6 | legato | trill 1-2 (exists) | L1–L4 |
| 7 | arps | A major triad root 6, 8ths ♩80 | L1 / L3 |
| 8 | lead | a whole-step bend on string 3 (cents) + 2 s of vibrato | L1 / L3 / L5 |
| 9 | reading | 2 bars, position I, ♩70 | L1 / L3 |
| 10 | ear | melodic recall, 2 bars pentatonic at ♩85 (RSL format) | L1 / L3 / L6 |
| 11 | impro | roots on beat 1 over a 12-bar at ♩90 | L1 / L2 |
| 12 | jazz (add-on) | shells ii–V–I four to the bar, swing ♩120 | L1 / L3 |
| 13 | harris (add-on) | dominant scale descending, swing ♩100 | L1 / L3 |
| 14 | prog (add-on) | 7/8 riff, ♪200 | L1 / L3 |
| 15 | fingerstyle / flamenco (add-ons) | p-i-m-a on C at ♩70 / four-stroke rasgueado at ♩70 | L1 / L3 |

The output is a start level per family plus a guitarist rank (from the hardest item beaten, per the promotion rule)
and three first path nodes.

**Files.**
- `guitar.ts` (`GUITAR_PROBES`, new `placeGuitar(results, families)`);
- the placement screen used by the drums probe (generalise its slot / skip logic);
- `tests/guitarPlacement.test.ts`.

---

## 8. Nylon and electric sounds (P2)

| Option | How | Size | Quality | Notes |
|---|---|---|---|---|
| A. Modelled nylon | `pluck.ts` with a softer excitation (low-passed burst, thumb-like attack), pluck position near 1/5, a darker loop filter, shorter high-register sustain, and 2–3 body resonances (biquad peaks near 100 / 200 / 400 Hz) | S | fair to good | no licence questions; matches the modelled e-piano / organ approach |
| B. Modelled clean electric | `pluck.ts` with a **pickup-position** comb (neck / bridge) instead of a body, longer sustain, then a light `driveCurve` and a short cabinet IR (`fx.ts::makeImpulse`-style). The archtop jazz tone is the neck pickup, dark, no drive | S–M | fair to good | crunch / lead drive is possible; high gain is not worth it for questions |
| C. Samples | multi-sampled nylon / electric | M | best | needs a licence check (CC0 / CC-BY sets exist, e.g. FreePats; verify each instrument's licence) and **the owner's OK before any download**, per the musician-tools note |

**Selection.**
- Nylon goes with the fingerstyle / flamenco add-ons.
- The clean electric goes with prog and with jazz (neck-pickup preset).
- Steel stays the default, and a Settings choice overrides.
- The Settings sound preview follows the choice, as it does for the steel string now.

**Tests.** As `tests/pluck.test.ts`: pitch within 5 cents, decay per register, no click at note end, and the nylon
spectrum darker than the steel (centroid lower at the same pitch).

**Files.** `src/audio/pluck.ts` (variants) and `src/audio/piano.ts` (course / add-on → voice). Settings sound section.

---

## 9. What only real playing can settle

- Bend cents rules (± 20 → ± 15) and vibrato ranges.
- Palm-mute and pinch-harmonic detection.
- The chord recognizer margins on nylon vs steel vs electric.
- Ear windows with phone speakers.
- Whether the §2.3 targets feel right. Ask the owner's guitarist friends for one session per tier; the drums
  calibration plan is the model.

## 10. Sources

1. RSL / Rockschool *Guitar Syllabus Guide 2012–2018* (technical work, sight reading, improvisation, ear tests per
   grade): https://cloud.rslawards.com/file/download/rockschoolguitar2012syllabusnew.pdf (verified; text extracted)
2. LCM / RGT electric guitar technical requirements and spoken tests (keys, positions; no tempos):
   https://lcme.uwl.ac.uk/media/bcledr1w/technical-requirements-and-spoken-test-questions-electric-guitar.pdf
3. RSL electric guitar grade pages (group structure): https://www.rslawards.com/tabbed-content/electric-guitar-grade-five/
4. Trinity Rock & Pop session skills (playback or improvising):
   https://www.trinitycollege.com/news/viewarticle/new-rock-and-pop-session-skills-books-for-grades-3-5-available-now
5. Earlier in-repo research: `GUITAR_TECHNIQUE_RESEARCH.md` (ABRSM, LCM, RGT acoustic, tempo bands),
   `GUITAR_AUDIT.md`, `MUSIC_SOURCES_LEGAL.md` (chords-only charts are legal; recordings are not used).
6. Barry Harris material as summarised in `src/engine/barry.ts` (workshop transcriptions, Josh Walsh, Jens Larsen).

---

## Implemented (2026-11-11)

Owner decisions applied: the core path is everything when no add-on is ticked (fretting, picking, legato, chords,
rhythm, scales, arpeggios, lead, reading, ear, improvising 1–4); flamenco, jazz, fingerstyle and prog are tick-box
add-ons (prog is an add-on, not core); jazz is pre-ticked for a player who also takes the Jazz course; country is not
core (picking 7 shows only with the old 'country' style as a flavour); the old single style migrates to add-ons.

| § | What was built | Where |
|---|---|---|
| 2 | Every guitar level has `tempo: [start, target]`, `sub`, `grade` (0 = Debut … 9) and an RSL tag (grade ≤ 8). The §2.3 table for the 79 levels; per-item targets (`SpecTemplate.target`, preferred by `targetBpmOf`): ska 110 → 150 beside reggae 70 → 90, Freddie Green 100 → 180, clave 90 → 120, the four palos, octaves 80 → 140. Untimed items (ring checks, harmonics, vibrato, pinch harmonics) have `target: 0` = off the ladder. Denser items than the level's subdivision keep their lower generator start and climb the level's ratio. | `guitarMeta.ts` (`GUITAR_META`, `itemTempo`), `guitar.ts` `applyGuitarMeta`, `plan.ts` |
| 5 | Core path + add-ons: `DrillSettings.guitarAddOns`, migrated by `guitarAddOnsOf` (jazz / latin → jazz, flamenco, classical / fingerstyle → fingerstyle, rock / metal / all → core; Jazz course → jazz). Add-on families (`g-jazz`, `g-harris`, `g-flamenco`, `g-fingerstyle`, `g-prog`) and add-on levels in core families (rhythm 6 → jazz, impro 5–6 → jazz, picking 8–9 and legato 8 → prog) are left out of the path and the hub unless ticked (`guitarLevelShown`, `ladderHiddenFor(…, ds)`). The path orders guitar levels by grade: `700 + 90·grade + 8·rank` (rank = teaching order inside a grade). Tick boxes: the first card of the guitar Technique hub (until saved), the Technique settings, and Settings (with the guitar course). | `plan.ts`, `ladderFacts.ts`, `path.ts` `guitarPathDifficulty`, `ui/GuitarAddOns.tsx`, `Drills.tsx`, `SettingsScreen.tsx`, `Path.tsx` |
| 3 | `g-ear`, 10 levels as the §3 table: tonic, melodic recall 1 and 2 bars, rhythm recall on muted strings, riff recall (power chords), root finder I IV V vi and ii iii V7 ♭VII, chord quality (arpeggio, or strum it — level 8 option 3 uses the recognizer), find the key + pentatonic, transcribe a line. Calls seeded per key and option; the key is never named in L1 / L9. Every call window ends a beat before the answer (the take drops onsets up to 120 ms after a window — found while testing: an answer starting on the window's end lost its first note; the same layout in `b-ear` may lose it too). Rating: degrees / dictation / rhythm-dictation / cadences / chords (the ear share). | `guitarEar.ts` (own call builders: the bass agent was editing `bassEar.ts`, so the shared helper was not lifted) |
| 4.1 | Core +20 (Batch C): scales 8–10, rhythm 8–10 (rock riffs, neo-soul, Mizrahi maqsum + Hijaz), lead 8–10 (bends in phrases, hybrid lead, pinch harmonics + oblique bends), picking 8–9 (prog), legato 7–8 (8 = prog), reading 6–8 (rhythm charts, two positions, lead sheets), arps 6–7, impro 5–6 (jazz). | `guitarCore2.ts` |
| 4.2 | `g-jazz` 8–12: comping on standards (shells / drop-2, Charleston / four / anticipations, with the band), voice leading by ear and by hand (call + guide tones + drop-2 by step), chord melody (our melody on top), rhythm changes + tritone subs (shells / drop-3), solo-guitar texture. `g-harris` 1–6 on `barry.ts`: 6th-diminished scales, the scale of chords in drop-2, the dominant scale with the half-step rules, triads / "3 to 9" / pivots, half step below and enclosures into the 3rd, the brothers and minor 6ths from one diminished. | `guitarJazz.ts` |
| 4.3 | `g-prog` 1–8 on the prog engine: 7/8 and 5/4 riffs, 9/8 and 11/8 + an odd-meter echo by ear, mixed meters with the band (road map, lost bars named), polyrhythm accents (`groupAccent`), metric modulation (`tempoMap`, `tempoRatio` 3 % ⚙), modes in riffs, fusion lines, unisons with the band's bass (`unison`). | `guitarProg.ts` |
| 6 P1 | Closed-set recognizer: HPCP chroma with partial subtraction and harmonic credit, bass from the spectrum, centred-cosine templates + bass bonus, margin 0.04 / min score 0.6 (⚙), "play it again" when unsure. On synthetic strums: 333/336 named, 3 unsure, 0 wrong (clean); 0 wrong at 20 and 10 dB SNR. Wired into drills through `Drill.recognize` (`analyzeGuitarTake`: a wrong chord is "not", an unclear one "almost — play it again"); used by `g-ear` 8 "strum it". | `chordRecognize.ts`, `guitarAnalyze.ts` |
| 7 | A probe step for every family (21 steps): core staircases / single takes, adaptive harder steps (F barre after A ↔ D, 16th funk after 8ths, E-shape major after box 1, vibrato after the bend, root finder after melodic recall), add-on steps only for ticked add-ons; `placeGuitar` gives each family its start. | `guitarProbes.ts`, `Drills.tsx` |
| 8 | Modelled nylon (darker loop, soft attack, body resonances ≈ 100 / 205 / 410 Hz) and clean electric (bright loop, long sustain, neck-pickup comb, light drive); no samples. Voice by the add-ons (prog / jazz → electric, fingerstyle / flamenco → nylon, else steel) or a Settings choice. | `audio/pluck.ts` `guitarVoiceSamples`, `audio/piano.ts`, `App.tsx`, `SettingsScreen.tsx` |

Also: glyphs `guitarear`, `sixdim` (unique on the guitar path), `oddmeter`; badge titles for every new level and badge
art for the three new families; Technique hub topics (ear, styles); quick lessons for the ear, comping / chord melody,
Barry Harris on the neck and odd meters / modulation, opened from the family page (English narration not recorded yet).

**Totals:** 128 guitar levels (core path 84 — §5.2 counted 85 with country; with all four add-ons 127, 128 with the
country flavour).

**Tests:** `guitarDeepening.test.ts` (table, per-item targets, a steady human take clean at every item's target and a
sloppy one never, ear windows and the speaker's call, the recognizer wiring, core path / add-ons / migration / grade
order, probes, voice), `guitarCore2.test.ts`, `guitarProg.test.ts`, `chordRecognize.test.ts`, `pluck.test.ts`.
Phone screens (390 × 844) of all 49 new levels' drill screens: no vertical or horizontal scroll.

**Not done / only real playing can settle:** the recognizer is not yet wired into the `fret-chords` topics, song-play or
Chord Rush (no strum input there), and there is no open-set "Chord finder" tool (P2); the guitar tab view draws constant
bars on mixed-meter prog levels (notation is right); pinch harmonics use the `harmonic` technique (pitch detection
uncalibrated); every ⚙ threshold, the §2.3 targets, the nylon / electric sounds and the ear windows on phone speakers
need real takes; the shared ear helper with `bassEar.ts` was not lifted (parallel bass work).

## Implemented (P2, 2026-11-11)

What the 2026-11-11 section left open, plus two repertoire / quest gaps.

| § | What was built | Where |
|---|---|---|
| 6 P2 | **Open-set recognizer**: every root × 10 qualities (M, m, 7, maj7, m7, m7♭5, °7, sus2, sus4, 5) + the heard bass (slash chords: C/E); spellings of one note set are one name (a °7's root comes from the bass); subset names (C ⊂ Cmaj7, A5 ⊂ Am) are decided by the extra note itself (present ≥ 0.45 of the strongest class → the fuller chord, < 0.12 → the smaller ⚙), so partials never invent a 7th; below the margin "not sure — maybe X or Y". Strum frames → onset, window 60–450 ms and bass; progression smoothing (one-strum blips). On rendered strums of 30 open / barre shapes: 100 % right root and a name that is the chord or a part of it, ≥ 75 % the exact quality, 0 wrong. | `engine/chordFinder.ts` |
| 6.3 | **Chord finder** (guitar Tools: Practice tools row, side menu): *Strum → name* (big symbol, words he + en, a "how sure" bar, strings not ringing, the last 8 strums as a smoothed progression; tap one to see its shapes) and *Name → shapes* (12 roots × 10 qualities; open chord, E / A / D movable shapes, drop-2 for 7ths; tap a shape to hear it). Mic open only while listening. Opened by a quick lesson the first time (`g-chord-finder`). | `ui/ChordFinder.tsx`, `ui/strumListen.ts`, `chordfinder.css`, `content/mini/guitar.ts`, `units.ts` (`game:chordfinder`) |
| 6.3 | **`fret-chords` answered by strumming**: on a chord built on the neck (levels 2, 4, 5) the guitar course shows "Strum it on my guitar"; the closed set (the asked chord + its same-root confusers) decides, any voicing; inversion questions (level 5) also need the bass. Right → the canonical answer; wrong → the heard chord as notes (graded wrong); unclear → "strum it again". | `ui/Instrument.tsx`, `chordFinder.ts` (`identifyChord`, `judgeStrum`, `heardMidis`) |
| 6.3 | **Chord Rush, played** (guitar course): a "Strum it" picture with its own 5 levels (open chords → open 7ths → barre M / m in every key → 7 / maj7 / m7 → m7♭5, °7, sus); the chord name shows, the mic judges each strum (unclear = no penalty, strum again), Skip = a miss and the shape is shown. Same scoring, XP and best; the result carries `played: true`. | `engine/rush.ts` (`isPlayed`, `PLAY_LEVELS`, `strumTarget`), `ui/Rush.tsx`, `rush.css` |
| 4.3 / PROG_ENGINE | **Tab in mixed meters**: on timeline drills the tab's lines are whole bars from `staffLines` (time map), a bar line at each bar's real length and the time signature written over the first note of a bar where it changes (and on the first bar); the window follows the beat by line. Constant-meter drills are unchanged. | `ui/DrillTake.tsx` (`DrillTab`), `ui/NoteViews.tsx` (`TabLine` `bars` / `at`) |
| repertoire | **Comp a whole standard** (`g-jazz` 13, grade 7, jazz add-on): the full chart of each guitar repertoire standard (12: basic / minor / jazz / Bird blues, ii–V–I in all keys, Autumn Leaves, Blue Bossa, Fly Me to the Moon, So What, A Train, rhythm changes, Giant Steps slow) in shells or voice-led drop-2, in its feel (Charleston, four, bossa, shuffle on 2 and 4), with bass and drums; plain triads are comped as 6th chords; each at its own tempo (≈ 60 % → the chart's tempo, cap 180). Every guitar repertoire standard now opens its own chart first ("Comp the whole chart", `RepWay` `guitarStd`) — the same item as the level, so progress is shared; the reference recordings follow (`standardRef`). Badge "Whole-Chart Comper". | `drills/guitarJazz.ts` (`GUITAR_STD`, `compChart`), `guitar.ts`, `repertoire.ts`, `repertoireDrills.ts`, `standardRef.ts`, `badges.ts` |
| quests | "3 clean lick takes" in the guitar rotation (the guitar audit test's date moved to one where the technique quest still shows). | `quests.ts` |

**Totals:** 129 guitar levels (core 84; all four add-ons 128, 129 with the country flavour).

**Tests:** `chordFinder.test.ts` (names, identify, open set on rendered strums, slash bass, °7, silence, live frames, strum verdicts, smoothing, every shape of every chord spells it), `guitarP2.test.ts` (played Rush ladder / items / result, every `fret-chords` chord identifiable and a wrong strum never right, `g-jazz` 13 charts: bars, a hit per chord, chord tones only, frets; repertoire ways = level items; the lick quest), the existing sweep (a steady take clean at every item's target) now covers `g-jazz` 13. `e2e/guitarP2.spec.ts`: chord finder (he + en), the tools row, played Rush, mixed-meter tab and a whole chart — one 390 × 844 screen each.

**Not done / only real playing can settle:** song-play chords are still not strummed (the songbook topic has no chord-answer step); the shared ear helper with `bassEar.ts` is still not lifted; every ⚙ threshold (open-set extra-note shares, the strum onset rise) needs real takes on steel, nylon and electric; a strum question can hear the app's own chord if the player replays it while listening (headphones help).

## Trading with the band and song chords strummed (2026-11-11)

| What | How it works | Where |
|---|---|---|
| **Trading 4s / 2s with the band** (`g-impro` 7, grade 8, jazz add-on, ♩ 100 → 160, keys C F G B♭) | Mirrors the piano's `k-bebop` 8 and the bass's `b-impro` 14. 16 bars: the band plays a phrase (a swung chord-tone / scale line over root–3–7 shells, on the app's piano), you answer with bars of your own, in turn. Option 0: 4s on ii–V–I; 1: 4s on the blues; 2: 2s on the blues. Your bars are free (`goal.free`, judged by the shared analysis like the piano trade, by mic or MIDI): a chord tone on beats 1 and 3 of every bar (`land`, any octave, within a quarter beat), the rest inside the chord's scale or a half step into it, at least 2 notes a bar. The band's phrase ends a beat before your bars, so the mic never takes it for your answer. With headphones / MIDI the band comps (+ walking bass) under your bars and swing drums play throughout (`band.rests` = the band's own bars); by mic on a speaker it lays out there and the ready screen says why. Badge "Trading Partner". | `drills/guitarCore2.ts` (`genGuitarTrade`), `badges.ts`, `ui/DrillTake.tsx` |
| **Jazz "I play well" taste for guitarists** | `JazzWho` gains `'guitar'` (after keys and bass, before voice): a guitarist's taste is the trade on ii–V–I (g-impro 7, option 0). | `courseStart.ts` (`JAZZ_WELL.guitar`, `jazzWho`) |
| **Song chords, strummed** (`song-strum`, 3 levels, guitar course only) | The song question whose answer is a chord: hear a bar of a public-domain songbook melody (after a cadence) and strum the chord under it — level 1 I or V, level 2 I, IV or V; level 3 hears the song with its chords up to a bar, then that bar's melody alone: strum the chord that comes next (I, IV, V, vi; ii / iii replace vi when they are the answer). Guitar keys only (G C D A E: open chords). Answered by **strumming** ("Strum it on my guitar": the recognizer names the strum among the choices only — closed set, `strumAmong`; unclear = "strum it again"), the chord buttons stay as the fallback; after the answer the compare plays the bar with each chord under it. A `choice` question with `strum` (additive field) — XP, ratings (instrument/songs + cadences/progression), the path step (own glyph `songstrum`, short name "Strum songs"), the workout and the topic group come through the existing topic machinery. | `engine/topicsSongs.ts`, `engine/lesson.ts` (`ChoiceQuestion.strum`), `engine/chordFinder.ts` (`strumAmong`), `ui/StrumChoice.tsx`, `ui/Lesson.tsx`, `ui/stepGlyphs.ts`, `ui/Glyph.tsx`, `pathNames.ts`, `topicGroups.ts` |

**Totals:** 130 guitar levels (core 84; all four add-ons 129, 130 with the country flavour).

**Tests:** `guitarCore2.test.ts` (trade: windows, the band's phrase inside its bars and a beat short, landings on 1 and 3 that are chord tones, band rests; the model line passes, another octave passes, a wrong landing / laying out / a line outside the changes never passes; the existing sweep covers g-impro 7), `courseStart.test.ts` (guitar → the trade), `songStrum.test.ts` (bars per level, choices and names, the song's own chord, closed-set strums right / wrong / silence, a guitar-only path step with its own glyph).

**Not verified / only real playing can settle:** no browser / e2e run in this round (the machine was loaded): the strum button on the song question and the trade's ready-screen line were not seen at 390 × 844 (both are one small row, as on the place questions); the song-chord strum on a real guitar (a V7 strummed for V, partial strums), the band's phrase and the speaker bleed on phone speakers; the guitar trade shows the landings as tab after the result (no "model line" toggle for guitar yet).
*Update 2026-11-12: "Show a model line" after a guitar trade result, as on the piano (`Drills.tsx DrillScore`): the
model line for your bars in your view (tab and / or staff; each model note carries its string and fret from
`genGuitarTrade`), in place of the landings, and back.*

## Chord & cadence builder (2026-11-12)

A Tools page of the guitar and keys courses (`ui/ChordBuilder.tsx`, `engine/chordBuilder.ts`; sidebar Tools, Practice
tools row, quick lesson `chord-builder` the first time).

- **Chord**: pick a root and a quality (11: maj, m, 7, maj7, m7, m7♭5, °7, sus2, sus4, 9, add9), or tap notes — on the
  keys (keys course) or the neck (guitar course, one fret per string) — and it names the chord in any inversion
  (`identifyChord`), spells it, plays it, and shows it on both instruments (keys + the first guitar shape).
- **Cadence**: a key (major / minor) and a cadence — authentic (IV–V7–I), plagal (I–IV–I), half (I–ii–V), deceptive
  (ii–V7–vi), ii–V–I, backdoor (iv7–♭VII7–I). Voicings: the root in the bass, the upper voices in close position by the
  smallest total move from the last chord; on the guitar the shape nearest the last one. Hear it, then **Play it**:
  each chord measured by MIDI (every chord tone held and nothing else; a 7th chord may leave out its 5th) or by the
  microphone (the strum recognizer, `judgeStrum`). A run counts like a game (`cadence-builder`: cadences/cadence +
  instrument/shapes; right at the first try / not; XP; band p / mp / mf by cadence).
- Not verified: no browser run (the machine was loaded) — the 390 × 844 fit of both panes is by layout estimate only;
  piano chords by microphone through the guitar strum recognizer on a real piano.

# Games: level tiers (pp → ff), new advanced games, social per tier

Research only (2026-11-10, base 0.68.0). No app code changed. Owner's agreed direction: **tiers inside each game**
(not separate beginner / advanced lists), named with the app's dynamics scale **pp · p · mp · mf · f · ff**, the
game **opens at the player's tier** from the existing rating, every card shows **"your level · next"**, new
**advanced-only games** for the niche (jazz-level ear and harmony, rock / prog rhythm), and **duels, rooms and
leaderboards per tier**.

Sources read: `src/ui/courseRows.ts` (COURSE_GAMES), `src/ui/Arcade.tsx` (GAMES2, PlayScreen cards),
`src/engine/rush.ts` (ladders), `src/engine/gameRating.ts`, `src/engine/courseSocial.ts` (DYN levels, duel sets),
`src/engine/ranks.ts`, `src/engine/tournament.ts`, `src/storage/progress.ts` (recordGame2 / recordGameRounds),
`src/ui/App.tsx` (game routes, `noteGameStep`), the game screens and engines (highway, flight, melodyPuzzle,
nameTune, pitchMemory, truefalse/theoryFacts, peakHunter, tuneUp, grooves, GrooveTrainer, memoryGame), the topic
catalogue (`TOPIC_GEN`, 130 topics, dumped at runtime), `src/engine/standards.ts`, the Supabase migrations for
duels / rooms / daily, `e2e/overflow.spec.ts`, `docs/research/MUSIC_SOURCES_LEGAL.md`.

---

## 0. Findings that shape the plan

| # | Finding | Where | Consequence |
|---|---|---|---|
| F1 | The tier scale already exists: `DYN` = pp 0 · p 800 · mp 950 · mf 1100 · f 1250 · ff 1400 (course level, shown on Progress and sent to friends). | `engine/courseSocial.ts` | Game tiers reuse `DYN` thresholds and names — no new scale. A game tier and a course level mean the same rating band. |
| F2 | **Games give no XP.** `recordGame2` (all GAMES2), `recordGameRounds` (Echo / Beat Echo), `recordGameBest`, `recordGhost`, `recordDaily` never touch `p.xp` or `stats.xpByDay`. | `storage/progress.ts` 646–760 | Games are invisible to the weekly league, the daily goal ring and course XP split. "Everything connects" is broken for games today. Fix in P1. |
| F3 | Games **do** rate: each finished game becomes up to 12 rated events (`gameEvents`), with difficulty `base + k·level`. | `engine/gameRating.ts` | Ratings, ranks, quests (they read events) and path evidence already move. But difficulty is level-based and tops out low (Interval Sprint at L4 = 1430, Note Rush L6 = 1620, Name That Tune is a flat 1050, Tune-up flat 1300). ff play must be rated as ff items. |
| F4 | Six Rush games already have a **ladder** of rungs built from topic levels; the run climbs one rung per 5 right (per 3 in Progression Detective). The player picks the start rung by hand; **nothing reads the rating** to choose. | `engine/rush.ts`, `ui/Rush.tsx` | The ladders are the raw material for tiers: tier = a window of rungs + speed / option parameters. |
| F5 | Other games have hand-picked fixed levels: Highway R1–R8 (kit 1–6, pitch lanes 1–4) + BPM; Flight 1–3; Melody Puzzle 1–8; Truth or Bluff 1–3 + topics; Peak Hunter 1–3; Echo / Beat Echo pad set + BPM + toggles. Name That Tune, Tune-up, Pitch Memory have **no levels at all**. | screens | Every game needs a tier map; three need content or parameters invented. |
| F6 | Duels, rooms, daily and ghost use `tournamentItem`, whose items are **fixed beginner difficulty** (triads only, intervals M3/P5/P8, degrees 1/3/5, rhythm R1–R4, echo pads 1-2-3-5). Daily = 5 mixed items, one set for everyone. | `engine/tournament.ts` | Social play currently never reaches mp. Tiered sets are needed before per-tier boards mean anything. |
| F7 | Seeds already carry options in high bits (Truth-or-Bluff topics + level, choir rooms ≥ 2³²). | `theoryFacts.factSeedInfo`, `tournament.isChoirSeed` | A tier can ride in the seed for duels / rooms without a schema change; a `tier` column is still wanted for leaderboard filtering (P2 migration). |
| F8 | Name That Tune has **10 songs**, all children's folk. Legal rule: full melodies only if PD in the US (≤ 1930) **and** life+70 (author died ≤ 1955); standards' **changes** are fine (chords only). | `engine/songs.ts`, `MUSIC_SOURCES_LEGAL.md` | NTT tiers go folk → classical themes → ragtime / early PD; the jazz top tier becomes **"Name That Standard" by its changes** (40 charts in `standards.ts`). |
| F9 | Course game counts: ear 16, jazz 7, keys 7, guitar 7, bass 6, voice 5, drums 4. Jazz has **no jazz-specific game**; drums has one game that is not technique (Highway kit) plus Beat Echo and the groove trainer. | `courseRows.ts` | Gap list in §3. |
| F10 | Vertical fit: `e2e/overflow.spec.ts` checks sideways overflow only (320 px). Vertical "fits one screen" is asserted only for drum drills (`e2e/drums.spec.ts fitsScreen`). | e2e | Game play screens are designed as single-screen stages, but no test proves it. Setup screens with 7–10 level chips (Rush, Highway, Melody Puzzle) likely scroll on 320×640; **tiers shrink setup to 6 chips + Start**. Add a `fitsScreen` e2e per game (P1). |
| F11 | Content for the advanced tiers mostly exists as topics: `extensions` (altered dominants), `voicings` (close / drop 2 / spread / jazz), `turnarounds` (tritone, Ladybird), `reharm-swap`, `chromatic-harmony`, `compound-intervals`, `odd-meter`, `polyrhythm`, `displacement`, `swing-ratio`, `bh-*` (11 Barry Harris topics), `chord-scale`, `scale-types` (bebop), `chart-analysis`, `eq-ear`. | `TOPIC_GEN` | Most ff content is wiring, not writing. Truly new: Coltrane / ii–V-chain dictation, odd-meter Highway levels, altered chord *reading*, chromatic Echo pads, PD tune catalogue. |

---

## 1. Inventory of every game (0.68)

Courses: E ear · J jazz · V voice · K keys · G guitar · B bass · D drums. "Fit" = fits one phone screen during play
(by layout reading; not e2e-verified, see F10). Rating tags = the sub-skills `gameEvents` writes.

| Game (id) | Courses | Trains | Difficulty model now | How the level is chosen | Rating tags (difficulty) | Fit |
|---|---|---|---|---|---|---|
| Echo Chain (`melody`) | E, V | melodic memory, degrees by ear (tap pads, sing or play) | **growing sequence** (one note per round) + fixed pad set (basic 1-2-3-5 / penta / full 7) + BPM, optional tempo ladder | hand: pad set, BPM, input, players | `sequences` (760 + 70·length) | yes |
| Beat Echo (`rhythm`) | E, K, G, B, D | rhythmic memory + timing; kit variant (kick/snare pads) | growing pattern + BPM + swing toggle + tempo ladder | hand | `rhythm` (760 + 70·len), `timing` (pattern difficulty) | yes |
| Truth or Bluff (`truefalse`) | E, J | theory facts, interval trios (also by ear) | **3 fixed levels** × 11 topics; 60 s run | hand: topics + level | via its own events (`recordTrueFalse`) | yes |
| Ghost race (`ghost`) | E | replay your best run of a set | set kind × rounds, beginner items (F6) | hand: kind, rounds | tournament items | yes |
| Duel (`duel`) | E, J | head-to-head on one device or async with a friend | `tournamentItem`, fixed beginner items | kind, rounds | none per round (duel points) | yes |
| Daily challenge (`daily`) | E, J | 5 mixed items, same for everyone | fixed | — | none | yes |
| Online room (Online.tsx) | E, J (`COURSE_SOCIAL`) | live quiz room, QR join | kind × rounds; Truth-or-Bluff level via seed | host picks | none | yes |
| Interval Sprint (`rush-interval`) | E, J, V | intervals by ear | **ladder** 4 rungs (up 3/4/5/8 → all 12 → harmonic → down), +1 rung per 5 right, 60 s, combo ×1.5/×2 | hand: start rung | `intervals/melodic` or `/harmonic` (950 + 120·L) | yes |
| Chord Rush (`rush-chord`) | E, J, K, G | chord **reading** on keys / staff / neck | ladder 7 rungs (triads → +dim/aug → 7ths → slash → guitar shapes → 9/11/13/sus → all) | hand: start rung + picture | `chords/quality` or `/inversion` (900 + 100·L) | yes |
| Progression Detective (`rush-progression`) | E, J | progressions by ear | ladder 9 rungs (I-IV-V → pop → jazz → ii/vi → borrowed/sec-dom/blues → inversions/V/V → minor → 7ths ii–V–I → sec-dom+borrowed), 3 lives, +1 per 3 right | hand | `cadences/progression` + `/dictation` (1050 + 120·L) | yes |
| Note Rush (`rush-note`) | E, K, G, B | staff reading | ladder 6 (treble → bass → alto → ledger → tenor → grand staff) | hand; bass course starts at bass clef | `notes/staff` (900 + 120·L) | yes |
| Key Signature Rush (`rush-keysig`) | E, K | key signatures | ladder 3 (≤2 → ≤4 → ≤6 major/minor) | hand | `theory/keys` (900 + 130·L) | yes |
| Fretboard Sprint (`rush-fretboard`) | G, B | notes on the neck (own tuning) | ladder 5 (naturals low strings → all → accidentals low → all → exact octave) | hand | `instrument/fretboard` (850 + 120·L) | yes (neck scrolls sideways by design) |
| Peak Hunter (`peakhunter`) | E | EQ ear (find the boosted band on a log slider) | 3 levels, 10 rounds | hand | `timbre/eq` (1000 + 150·L) | yes |
| Rhythm Highway (`highway`) | E, K, G, B, D | rhythm reading in time; pitch lanes (mic/MIDI); kit lanes | **levels** R1–R8 (tap), 1–4 (pitch), 1–6 (kit) × 3 songs per level × BPM 70/90/110… | hand: mode, level, song, BPM | `rhythm-reading/read` 0.7 + `timing/precision` 0.3 (850 + 90·L) | yes (full-screen stage) |
| Voice Flight (`flight`) | V | pitch matching (sing / play to steer) | 3 levels (wide steps → narrow leaps → chromatic), a run climbs from the start level | hand | `singing/match` or `instrument/echo` (900 + 120·L); none for touch | yes |
| Melody Puzzle (`melodypuzzle`) | E, K | melodic dictation as tiles | 8 levels (3 notes by step → 8 notes, minor, chromatic), run climbs | hand: start level | `dictation/melodic` 0.6 + `sequences/melody` 0.4 (950 + 90·L) | likely; 8 slots + tiles at 320 px is tight |
| Name That Tune (`nametune`) | E, J, V | melody recognition, speed | **fixed**: 10 rounds from 10 folk songs | — | `sequences/melody` 0.7 + `intervals/songs` 0.3 (flat 1050) | yes |
| Pitch Memory (`pitchmemory`) | E, V | absolute pitch memory, once a day | **fixed** (one note, default A, cents error, 30-day trend) | note choice | `absolute/name` (flat 1400) | yes |
| Tune-up (`tuneup`) | G, B | tuning by beats (fretted / harmonic reference) | **fixed**: 8 rounds, ±5–50 ¢ | — | `pitch/in-tune` (flat 1300) | yes |
| Groove trainer (`groove`) | D (+ tool everywhere) | time feel: fading click, pocket (push / lay back ms), swing dial | open-ended (best silent bars), user picks BPM / ms / ratio | hand | groove fingerprint only (`recordGroove`), **no rating events** | yes |
| Technique (`drills`) | K, G, B, D (V via vocal) | measured technique | tempo ladder + family levels 0–7 (already its own rank) | path / placement | instrument/<x>-tech | yes (asserted for drums) |

Excluded as tools: tuner, metronome, drone, slow-down, mixer, practice log, improv studio, charts.

**Missing from `gameEvents`** (no rating at all): Groove trainer, Duel, Daily, Online rooms (only answers inside a
lesson-style set are rated where they reuse lesson questions). Groove trainer should rate `timing/pocket` and
`tempo/hold` (P1, small).

---

## 2. The tier model (applies to every game)

### 2.1 Definitions

| Concept | Rule |
|---|---|
| Tier names | `DYN_NAMES` = pp, p, mp, mf, f, ff. Same thresholds as the course level (F1). Hebrew shows the same letters (they are notation). |
| A game's tier spec | `GameTierSpec = { game, source, tiers: Record<DynName, { rungs: RungRef[]; params: {...}; clear: ClearRule; diff: [lo, hi] }> }` — one table per game in a new pure module `engine/gameTiers.ts`. |
| Rungs inside a tier | 2–4 rungs. The run still climbs (Rush: every 5 right, Detective: every 3) **but only inside the tier's rungs**; after the top rung it keeps the top rung and adds speed (shorter play time / less replay) instead of leaving the tier. |
| Difficulty of rated events | Linear across the tier band: rung *i* of *n* in tier *T* → `DYN[T].from + (i+0.5)/n · width` (pp uses 650–800, ff uses 1400–1600). Replaces `base + k·level` in `gameRating.ts`, so ff play produces ff-difficulty evidence and moves ratings/ranks honestly (F3). |
| Rating source (which rating opens the game) | The game's primary sub-skill (e.g. Chord Rush → `chords`, Highway → `rhythm-reading`, Flight → `singing`, Fretboard → `instrument/<course>-tech`…), see the `source` column per game in §2.4. |

### 2.2 Which tier opens (start tier)

```
r      = rating of the game's source skill if n ≥ 8, else the active course's rating (courseRating), else null
tier0  = r === null ? 'pp' : DYN band of r
if source n < PROVISIONAL_UNTIL (8) or the course rating is provisional → one tier lower (cautious, like the path's ✓)
cleared = highest tier this player has cleared in this game (2.3)
open   = max(tier0, cleared + 1) capped at ff     // never re-open a tier you already beat
```

* The setup screen shows six chips, the open one pre-selected; the player may pick **any lower tier** (warm-up,
  no penalty) and **one tier above** `open` ("try f" — rated, counts toward clearing it). Two or more above stay
  locked with a one-line reason ("clear mf first"). This keeps placement trustworthy without a gate page per game.
* The game card on Practice shows `mf · next f` (and a thin bar to the next tier, never "full" below ff, per
  *Promotion, not full bars*). Before any rating: `pp · new`.
* Exam-prep mode (ear) may cap at f for Bagrut-style games (exam tempos), ff stays reachable by choice.

### 2.3 Promotion inside a game (clearing a tier)

Level = the hardest items beaten, not effort. A tier is **cleared** when the clear rule holds in **2 of the last 3
runs at that tier** (or above). Clearing is stored per game: `progress.gameTiers[game] = { cleared: DynName | null,
best: Partial<Record<DynName, number>>, recent: Partial<Record<DynName, number[]>> }`.

| Game type | Clear rule (per run) |
|---|---|
| Timed Rush (60 s) | reached the tier's top rung **and** accuracy ≥ 85 % **and** ≥ the tier's right-answer target (pp 12 → ff 20; the target rises because items repeat and answers get faster with skill) |
| Streak (Progression Detective, Reharm Spotter, Name That Standard) | solved ≥ 3 × rungs cases with at least one life left |
| Timing games (Highway, Beat Echo, BH in Time, Riff Echo, Groove) | ≥ 90 % hits with ≤ 15 % "good" (rest "perfect") on 2 different songs/patterns of the tier |
| Accuracy rounds (Melody Puzzle, Peak Hunter, Tune-up, Voicing Spy, Transcription Race) | mean round score ≥ 85 % |
| Flight / voice | ≥ 30 gates with ≤ 1 crash, measured input (touch never clears) |
| Pitch Memory | 5 of the last 7 days within the tier's cents window |

Clearing a tier: one-line celebration in the app's mature language ("mf cleared — f opens"), a counter for
badges, and the next run opens at the next tier. **No demotion**: a cleared tier stays cleared; the opening tier can
follow the rating down only to `cleared + 1`.

### 2.4 Per-game tier ladders

Notation: `topic#n` = an existing topic level (`TOPIC_GEN`), **NEW** = content to write. BPM / time / options are
the tier's params.

#### Interval Sprint (`rush-interval`) — source `intervals`

| Tier | Content | Params |
|---|---|---|
| pp | up: M3/m3, P4, P5, P8 (`intervals-all#1`) | 4 options, replay allowed |
| p | up: all 12 (`intervals-all#2`) | 4 options |
| mp | down + up mixed (`intervals-all#4`) | 6 options |
| mf | harmonic (`intervals-all#3`) + down | 6 options, one replay |
| f | compound: 9ths, 10ths (`compound-intervals#1–2`), any register | 8 options, one replay |
| ff | all to the 12th, harmonic (`compound-intervals#3`) + **NEW** two intervals in a row (3-note cell) and jazz names (♭9, ♯11, ♭13) | 8 options, no replay, 1.2 s notes |

Voice course variant (**Sing the Interval Sprint**): same tiers, answered by singing the top note (`sing-intervals#1–6`); ff = sing chord tones of a named chord (`sing-intervals#5`).

#### Chord Rush (`rush-chord`, reading) — source `chords`

| Tier | Content |
|---|---|
| pp | major / minor triads, keys (`chord-read#1`) |
| p | + dim / aug, staff (`chord-read#2`) + sus2 / sus4 |
| mp | seventh chords (`chord-read#3`) |
| mf | inversions as slash chords (`chord-read#4`) + guitar shapes / drop 2 (`chord-read#5`) |
| f | extensions 9 / 11 / 13, add9, 6/9 (`chord-read#6`) |
| ff | **NEW** altered dominants (7♭9, 7♯9, 7♯11, 7alt, 13♭9), upper-structure slash chords (D/C7), quartal stacks; then "everything, every picture" (`chord-read#7`) at speed |

**By-ear toggle** (jazz course default): pp `triads#1` → p `triads#2–3` → mp `seventh-chords#1–2` → mf `seventh-chords#3–5` → f `extensions#1,#3` → ff `extensions#2,#4` (altered, alt / sus).

#### Progression Detective (`rush-progression`) — source `cadences`

| Tier | Content |
|---|---|
| pp | I–IV–V (`harmonic-dictation#1`) |
| p | pop progressions, + ii and vi (`progressions#1`, `harmonic-dictation#2`) |
| mp | inversions and V/V, minor keys (`harmonic-dictation#3–4`) |
| mf | 7th chords, ii–V–I, jazz progressions (`harmonic-dictation#5`, `progressions#2`, `turnarounds#1`) |
| f | secondary dominants, borrowed, blues (`harmonic-dictation#6`, `progressions#3`, `turnarounds#2`, `chromatic-harmony#4–6`) |
| ff | tritone subs and Ladybird (`turnarounds#3`), backdoor ii–V, **NEW** ii–V chains moving by whole steps / minor thirds, **NEW** Coltrane cycles (Giant Steps / Countdown-style key centres, answer = the key centres), modal interchange (`chromatic-harmony#6`) |

#### Note Rush (`rush-note`) — source `notes`

| Tier | Ear / Keys | Bass course | Guitar course | Drums course (**NEW** "Kit Read Rush") |
|---|---|---|---|---|
| pp | treble | bass clef | treble | rock beat (`drum-read#1`) |
| p | bass | bass + ledger | treble 8vb, first position | kick variations (`#2`) |
| mp | grand staff (`note-reading#6`) | up to 12th fret range | to 5th position | fills (`#3`) |
| mf | ledger lines, any clef (`#4`) | tenor clef (thumb position reading) | to 12th fret, accidentals | sixteenth hats (`#4`) |
| f | alto clef (`#3`) | grand-staff bass line | 8vb ledger lines | open hats, ghost notes (`#5`) |
| ff | tenor + transposing instruments concert ↔ written (`transposition#2–3`) | rhythm + pitch (read a 1-bar line) | read a chord voicing (2–3 notes) | **NEW** odd-meter bars, flams / drags, ride patterns |

#### Key Signature Rush (`rush-keysig`) — source `theory`

pp ≤ 2 (`key-signatures#1`) · p ≤ 4 (`#2`) · mp ≤ 6, major or minor (`#3`) · mf 7 accidentals + relative minor
(`circle-fifths#2`) · f modes from signature + final note (`degrees-ext#3`, `chord-scale#1`) · ff key of a
written progression (`chart-analysis#1`) and melodic-minor chord-scales (`chord-scale#3`).

#### Fretboard Sprint (`rush-fretboard`) — source `instrument/<guitar|bass>-tech`

| Tier | Guitar | Bass |
|---|---|---|
| pp | naturals, two low strings (rung 1) | naturals E and A (`bass-notes#1`) |
| p | naturals, all strings (rung 2) | naturals, all four (`#2`) |
| mp | sharps / flats low strings (rung 3) | accidentals (`#3`) |
| mf | every note, every string (rung 4) | every place of a note 0–12 (`#4`) |
| f | exact pitch with octave (rung 5) + same note inside a position (`fret-notes#5`) | octave and 10th shapes (`bass-intervals#1,#4`) |
| ff | **NEW** chord tones from a named chord: "the 3rd of B♭7 on string 3", drop-2 / drop-3 tones (`fret-chords#4`), intervals across the G–B shift (`fret-intervals#3–4`) | walking approach notes (`bass-shapes#3`), "the ♭7 of the next chord" over changes |

#### Rhythm Highway (`highway`) — source `rhythm-reading` (kit: `instrument/drum-tech`)

| Tier | Tap / pitch lanes | Kit lanes (drums) | BPM |
|---|---|---|---|
| pp | R1 quarters, halves | kit 1: quarter hats | 70 |
| p | R2 eighths | kit 2: eighth hats, kick variations | 80–90 |
| mp | R3 dotted + R4 sixteenths | kit 3: fills at section ends | 90–100 |
| mf | R5 syncopation | kit 4: snare ghost on 4-e, 16th fills | 100–110 |
| f | R6 triplets, R7 3/4 · 6/8 · 12/8, R8 swing | kit 5–6: 16th hats, crash on 1 | 110–130 |
| ff | **NEW** R9 odd meters 5/8, 7/8 (2+2+3 / 3+2+2), 9/8, 11/8; **NEW** R10 polyrhythm (two lanes 3:2, 4:3), displaced figures (`displacement#4`), metric-modulation song sections | **NEW** kit 7: odd-meter grooves, linear fills, double-kick 16ths, half-time shuffle | 130–160 |

Pitch-lanes mode: lanes 3 → 4 → 5 and scale → pentatonic → chromatic follow the tier; ff = a bebop line on 5 lanes.
Add **pitch-lanes Highway to the voice course** (sung lanes, already supported by the mic tracker).

#### Echo Chain (`melody`) — source `sequences`

pp pads 1-2-3-5, start 3 notes, 80 BPM · p pentatonic pads, start 3 · mp full 7 pads, start 4 · mf full 7 + one
chromatic pad (♭3 / ♯4 / ♭7), start 4, 100 BPM · f **NEW** chromatic 12 pads, minor key, start 5 · ff no pads shown:
answer on the instrument / voice only (measured), bebop-style chromatic approach notes, start 5, 120 BPM.

#### Beat Echo (`rhythm`) — sources `rhythm` + `timing`

pp quarters 80 · p eighths 90 · mp sixteenths + dotted 100 · mf syncopation + swing toggle on · f triplets, 3/4 and
6/8 · ff **NEW** 5/8, 7/8 phrases and displaced (+1 sixteenth) patterns, 120+. Kit variant: kick/snare → + hats →
+ ghost notes → odd meter. Tempo ladder stays as an option inside a tier.

#### Melody Puzzle (`melodypuzzle`) — source `dictation`

pp L1–2 · p L3 · mp L4–5 · mf L6 · f L7 · ff L8 + **NEW** chromatic jazz lines (enclosures, bebop scale passing tones, `scale-types#5`) and bass clef. Requires the 320-px fit check (8 slots).

#### Voice Flight (`flight`) — source `singing`

pp level 1 wide gates by step, drone on · p level 1 narrower gates · mp level 2 leaps · mf level 2 faster, gate label
hidden (degree shown only after) · f level 3 chromatic · ff **NEW** drone off (tonic sounds once), 25 ¢-narrow gates,
jazz degrees (♭9, ♯11, 13) over a sounding chord.

#### Name That Tune (`nametune`) — source `sequences`

| Tier | Catalogue (all PD under US ≤ 1930 **and** life+70) | Params |
|---|---|---|
| pp | the 10 children's folk songs | 8 notes, 4 options |
| p | **NEW** more folk / spirituals / Hebrew PD folk (check each) | 6 notes |
| mp | **NEW** classical themes: Beethoven (Für Elise, 5th, 9th), Mozart (Eine kleine, 40th), Bach (Minuet in G), Dvořák (New World), Grieg (Morning, Hall of the Mountain King), Brahms (Lullaby), Tchaikovsky | 6 notes |
| mf | **NEW** ragtime / marches / parlour: Joplin (d. 1917), Sousa (d. 1932), Stephen Foster (d. 1864) | 5 notes, transposed |
| f | all of the above, 4 notes, started mid-phrase, in minor (mutation) | 4 notes, 6 options |
| ff | hand-off to **Name That Standard** (§3, by its changes) | — |

W. C. Handy (d. 1958) and Gershwin (lyricist Ira d. 1983) are **not** PD under life+70 — exclude (per-song check
is required by the legal doc).

#### Truth or Bluff (`truefalse`) — source `theory`

pp level 1 basics · p level 1 + intervals, keys · mp level 2 · mf level 2 + interval trios by ear (`trio-ear`) · f
level 3 modes / harmony / jazz · ff level 3 + **NEW** jazz-harmony facts (Barry Harris rules, tritone sub, chord-scale,
upper structures), 5 s per statement. Topic picker stays; the tier replaces the easy / medium / hard selector.

#### Peak Hunter (`peakhunter`) — source `timbre`

pp `eq-ear#1` (low / mid / high) · p level 1 octave bands · mp level 2 · mf level 3 (boost or cut) · f third-octave
neighbours (`eq-ear#5`) · ff amount + match it (`eq-ear#6–7`) on a full mix.

#### Tune-up (`tuneup`) — source `pitch` (guitar/bass)

pp ±50 ¢ fretted reference · p ±30 ¢ · mp harmonics reference · mf ±15 ¢ · f ±8 ¢, any string, no reference
label · ff ±5 ¢, tune a string **to a sounding chord** (no unison reference). Bass variant: four strings, 5th-fret
and harmonics references.

#### Pitch Memory (`pitchmemory`) — source `absolute`

Window (pass if |error| ≤): pp 100 ¢ on your note · p 70 ¢ · mp 50 ¢ · mf 35 ¢, note of the day chosen by the app ·
f 25 ¢, any of 12 · ff 15 ¢, two notes (a named interval from memory). Still once a day.

#### Groove trainer (`groove`) — source `timing` (new events `timing/pocket`, `tempo/hold`)

| Tier | Fading click | Pocket | Swing dial |
|---|---|---|---|
| pp | 1 silent bar, 90 BPM | sit on the beat ±40 ms | straight vs 2:1 |
| p | 2 bars | ±30 ms | 3 ratios |
| mp | 4 bars | push / lay back 20 ms | 5 ratios |
| mf | 4 bars at 60 BPM (slow is harder) | ±15 ms | fine dial 55–70 % |
| f | 8 bars, 6/8 or 3/4 | ±10 ms | at 220 BPM (`swing-ratio#3`) |
| ff | 8 bars in 7/8 or with a tempo change to hold (`rhythm-transform#4`) | laid back 30 ms vs a pushing band | match a played swing feel, then hold it alone |

#### Social sets (Duel, Ghost, Daily, Online rooms)

`tournamentItem(kind, seed, id, round, tier)`: each kind gets a tier table using the same content as the solo
game (chords → the by-ear Chord Rush tiers; intervals → Interval Sprint; degrees → `degrees-ext` at mf+; modes →
`MODE_ID_LEVELS` 1 → 3 + melodic-minor modes at ff; beat → Highway R-levels; echo → Echo Chain pads). See §4.

---

## 3. Per-course game lists and gaps

Current lists from `COURSE_GAMES`. Proposed additions are **bold**; P = phase (§5).

| Course | Today (n) | Gaps for the niche | Add | P |
|---|---|---|---|---|
| Ear & theory | 16 | top tiers only reach 7th chords / ii–V–I; no voicing or reharm ear game | tiers on all; **Voicing Spy**, **Reharm Spotter**, **Scale & Mode Rush** (new Rush mode: `scale-types`, `chord-scale`, `modes`) | P1 tiers, P2/P3 games |
| Jazz & improv | 7 (none jazz-specific) | no game on standards, voicings, Barry Harris, lines in time | **Name That Standard**, **Voicing Spy**, **Reharm Spotter**, **Barry Harris in Time**, **Transcription Race**, Chord Rush by ear (default), Progression Detective ff | P2–P3 |
| Voice | 5 | no harmony singing game, no sight-singing race, Highway missing | **Highway pitch lanes (sung)**, **Sing the Interval Sprint**, **Harmony Hold** (sing a chord tone against a changing chord: hold the 3rd while the chord moves, measured cents; tiers triads → 7ths → guide tones through ii–V → upper extensions), **Sight-sing Race** (`sight-read` + mic) | P2 |
| Keys | 7 | no ear-to-keys game, no voicing / changes game | **Play It Back** (hear, play on MIDI / mic: `play-back`, `k-ear` content; tiers 1 note → bass line of 4 chords → with rhythm), **Voicing Sprint** (named chord → play it; tiers triads → shells → rootless A/B → drop 2 → upper structures), **Barry Harris in Time**, Progression Detective (keys answer: play the bass roots) | P2–P3 |
| Guitar | 7 | no chord-change timing game, no riff ear game | **Chord Change Race** (switch shapes on the beat, measured by mic onsets + chroma; tiers open chords → barre → CAGED → drop 2/3 → altered voicings), **Odd-Meter Riff Echo**, Fretboard ff (chord tones), Progression Detective | P2–P3 |
| Bass | 6 | no walking-line game, no root-by-ear game | **Walk the Changes** (play quarter-note lines over a chart, chord tone on 1 and 3, measured; tiers blues roots-fifths → chord tones → approach notes → rhythm changes → Giant Steps), **Roots by Ear** (hear a progression, play its roots, `bass-dictation`), **Odd-Meter Riff Echo**, Progression Detective | P2–P3 |
| Drums | 4 | only Highway kit, Beat Echo, groove trainer; no reading race, no fills game, no odd meter, no polyrhythm | **Kit Read Rush** (Note Rush variant on `drum-read`), **Fill & Land** (play an N-bar fill, land the crash on 1; tiers 1 bar 8ths → 2 bars 16ths → triplet fills → odd groupings across the bar), **Name That Groove** (style by ear, `d-ear` "name a style"; tiers rock/pop → funk/shuffle → jazz/latin → odd-meter / prog), **Polyrhythm Lock** (`poly-tap`, `polyrhythm` topics), **Odd-Meter Riff Echo** (kit version), groove trainer tiers | P2–P3 |

After this, each course has 9–12 games, each with six tiers.

---

## 4. New advanced games for the niche

All follow the app's rules: one phone screen, gate page (text, refresher, Play, no auto-play), compact questions,
measured where an instrument is played, resumable after Back / reload, rated into ratings / ranks / path.

| Game | Courses | Input | Scoring | Measured how | Tiers (pp → ff; advanced games open at mp, lower tiers are hidden) | Reuses |
|---|---|---|---|---|---|---|
| **Voicing Spy** | E, J, K, G | hear a chord, pick its voicing type (4–6 buttons) | streak with 3 lives; points × speed | answer + time | mp close / open triads (`triads#5`) · mf close / drop 2 / spread (`voicings#1`) · f inversion of 7ths (`voicings#2`), shells vs rootless · ff rootless A/B, drop 2 vs drop 3, quartal, upper-structure triads (`voicings#3` + **NEW**) | `voicings` topic, piano / guitar sample voicing |
| **Reharm Spotter** | E, J | hear 4–8 bars twice (original, then reharmonised); tap the bar that changed, then name the substitution | streak; points for the bar + the name | answer + time | mp diatonic swaps (`reharm-swap#1`) · mf secondary dominants, backdoor · f tritone subs, borrowed (`reharm-swap#2–3`, `chromatic-harmony#4`) · ff inserted ii–V chains, chromatic planing, Coltrane substitution | `reharm-swap`, `chromatic-harmony`, band comping |
| **Name That Standard** | J, E (NTT ff) | hear comping of the changes (no melody), pick the tune among 4 | 10 rounds, faster = more | answer + time | mp blues forms / rhythm changes / Autumn Leaves, A section from bar 1 · mf + Satin Doll, Blue Bossa, Misty, from bar 1 · f any of the 40, from the bridge or bar 9 · ff transposed out of the usual key, 4 bars from the middle of the form, similar tunes as decoys (Tune Up vs Solar, Stella vs ATTYA) | `standards.ts` (40 charts, chords only — legal), band engine |
| **Barry Harris in Time** | K, J (guitar later) | play 8th-note lines over a vamp / changes on the keys (MIDI or mic) | per bar: chord tones on the beats, the added half step in the right place, time | MIDI onset vs grid + pitch check (`bh-lines` rule), existing drill analysis | mp major 6th-dim scale from the root, one chord · mf scale from 3, 5, 7 (`bh-pivot#3`) · f chromatic added notes, pivots at tempo (`chromatic-added`, `bh-pivot#4`) · ff over ii–V chains and rhythm changes, 200+ BPM, minor 6 / dominant conversions (`bh-convert-2`) | drills family `harris`, `engine/barry.ts`, MIDI analysis |
| **Odd-Meter Riff Echo** | G, B, K, D | hear a 1–2 bar **original** riff, play it back on the instrument (kit for drums) | per take: notes + onsets in window; 3 lives | mic / MIDI onset + pitch (bass-ear / drum-ear machinery), latency-corrected | mp 6/8 and 3/4 riffs · mf 5/8, 7/8 (grouping shown) · f grouping hidden, 9/8, 11/8 · ff mixed meter (7/8 + 4/4), displaced accents, 13/8, polymetric riff over a 4/4 kit | `odd-meter`, `displacement`, `drills/bassEar.ts`, `drills/drumEar.ts` |
| **Transcription Race** | E, J, K | hear a 2–4 bar phrase, write it (staff pad / keys) | accuracy × time bonus, 5 phrases | notes and rhythm against the key | mp diatonic, quarters/eighths (`staff-dictation#3–4`) · mf minor + chromatic note (`#5`) · f bebop line with enclosures, swing eighths · ff two-voice or a phrase over changes with altered tensions (`two-part`) | `staff-dictation`, ScoreView, staff pad |
| **Polyrhythm Lock** | D, K, E | tap two lanes (two hands / two pads / MIDI) | % of hits in window per hand over 8 bars | onset per lane | mp 2:1, 3:2 (`poly-tap#1–2`) · mf 4:3 · f 3:2 then swap hands (`poly-tap#4`), 5:4 · ff 7:4, polyrhythm over a groove at 120+ | `poly-tap`, `polyrhythm`, groove trainer taps |
| **Scale & Mode Rush** (Rush mode) | E, J, V | hear a scale / mode / line, name it | 60 s, combo | answer + time | pp major / minor / pentatonic · p blues, harmonic minor · mp modes of major · mf melodic minor, whole tone, diminished · f bebop scales · ff modes of melodic minor (lydian dominant, altered, locrian ♮2) over a chord | `scale-types`, `chord-scale`, `modes` |

Also P3 candidates (shorter list on purpose): **Trading Fours Duel** (improv studio scoring as a two-player game),
**Changes Dictation** (write the chart of a heard AABA — the ff of Progression Detective as a long form).

---

## 5. Duels, rooms, leaderboards per tier; everything connects

### 5.1 Social play per tier

| Surface | Today | Proposal |
|---|---|---|
| Duel (one device) | kind × rounds, beginner items | add a tier chip (defaults to the lower of the two players' tiers on that device; either may raise it). Items from `tournamentItem(…, tier)`. |
| Async friend duel | `toneturn_duels.kind`, `seed` (0 … 2³²−1) | challenger's open tier for that kind; opponent sees "mf duel". Tier in seed would need the seed range widened, so add `tier smallint null` (null = legacy pp items). Server scoring is key-based, unchanged. |
| Online room | host picks kind, rounds (+ facts level / choir in seed high bits) | host picks a tier; lobby shows each player's tier for the kind; a mixed room uses the host's tier. `tier` column on `toneturn_rooms`. |
| Daily challenge | 5 mixed items, one set per day | **three bands** per day: soft (pp–p), mid (mp–mf), loud (f–ff); the player's band from the ear course level; a player may play one band above. `toneturn_daily_keys` primary key becomes `(day, band)`, `daily_results` gets `band`. Bands, not six tiers: the user base is small and six boards would be empty. |
| Ghost race | per kind × rounds | key becomes `kind:rounds:tier`. |
| Leaderboards | league (weekly XP, one across courses), area rank boards (`areaBoard`, `atYourLevel`), daily board | new **game board**: per game × tier, friends' best this week (from synced `bests`), "at your tier" first. Daily board per band. No public global boards until the user base grows (privacy settings apply — `shareableRanks`-style gate). |

### 5.2 The six-point "everything connects" checklist for games

| Point | Today | With tiers |
|---|---|---|
| Path | a game step stars from accuracy (`noteGameStep`); path steps cannot ask for a tier | path game steps carry a tier (`game:rush-chord@mf`), the step opens that tier, stars from the clear rule; a cleared tier counts as evidence for the matching topic levels (cautious ✓, only measured play). |
| Map / ratings / ranks | `gameEvents` rated, flat difficulty for 4 games | tier-band difficulty (§2.1) so ff runs move ranks at Diamond / Master levels; Groove trainer starts rating. |
| XP | **none** (F2) | XP for every finished game: 1 per right answer (or per 10 % accuracy for timing games), × tier factor (pp 1.0 … ff 1.5), capped 25 per game and 100 per day from games, written to `xp` + `stats.xpByDay` with the active course, so the league, the daily goal and the per-course XP split see games. |
| Leagues | XP only | via XP above; the league card's per-course split shows game XP in its course. |
| Level test / placement | games do not feed placement | a cleared tier ≥ mf may skip the matching placement items (P3, after the owner OKs). |
| Workout | workout picks lessons and drills | workout can include a 60 s game at the player's open tier as its "fast" block (P2). |
| Quests | quests read events (games count) | add game quests: "clear a tier in any game", "3 runs at your tier" (P2). |
| Badges | counters (gates, highwayFC, nameTuneBest…) | per-game tier crest (pp … ff) on the game card and profile; badge for clearing f and ff in 3 games of a course. |

---

## 6. Implementation plan

Sizes are rough line counts (code + tests). Always `npx tsc -b` before commit; dry-run every migration.

### P1 — the tier engine and the existing games (≈ 1,600 lines)

| Step | Files | Size |
|---|---|---|
| Tier engine: `DYN` reuse, `GameTierSpec` tables for the 18 existing games, `startTier`, `clearRun`, `tierProgress` ("your level · next"), tier difficulty | **new** `src/engine/gameTiers.ts` | 450 |
| Rush ladders accept a tier window (rung range + params); right-answer targets | `src/engine/rush.ts` | 60 |
| Rated difficulty from tier; Groove trainer events | `src/engine/gameRating.ts`, `src/ui/GrooveTrainer.tsx` | 70 |
| Storage: `gameTiers` state, bests per tier, **XP for games** (into `xp`, `xpByDay`, course), sync merge | `src/storage/progress.ts`, cloud merge | 160 |
| Setup screens: six tier chips (locked above open+1), remove level radios | `Rush.tsx`, `Highway.tsx`, `Games.tsx` (Echo / Beat Echo), `MelodyPuzzle.tsx`, `TrueFalse.tsx`, `Flight.tsx`, `PeakHunter.tsx`, `TuneUp.tsx`, `NameTune.tsx` (pp only until P2), `PitchMemory.tsx` | 40–70 each ≈ 450 |
| Game cards: `mf · next f` chip + thin bar | `src/ui/Arcade.tsx` | 50 |
| Strings (he / en), one-line tier-cleared message, gate-page line | `src/i18n/strings.ts` | 60 |
| Tests: start tier from rating, provisional clamp, clear rule, no demotion, XP cap, difficulty bands | **new** `tests/gameTiers.test.ts`, update `tests/rush*.test.ts`, `gameRating` tests | 250 |
| E2E: every game setup + play fits 320×640 (vertical) | `e2e/overflow.spec.ts` or new `e2e/games-fit.spec.ts` | 60 |

### P2 — top-tier content, course gaps, social per tier (≈ 2,400 lines + 1 migration)

| Step | Files | Size |
|---|---|---|
| ff content: altered / upper-structure chord reading rung, Coltrane + ii–V chain progression rung, compound-interval rungs in the Rush ladder, chromatic Echo pads, Highway R9 odd meter / R10 polyrhythm + kit level 7 | `topicsChordRead.ts`, `topicsProgGames.ts` / `topicsHarmony2.ts`, `rush.ts`, `memory.ts`, `rhythm.ts`, `highway.ts` | 700 |
| Name That Tune PD catalogue (≈ 40 openings, each cleared US ≤ 1930 + life+70, source line per song) + tiers | `src/engine/songs.ts`, `nameTune.ts` | 200 |
| Scale & Mode Rush (new Rush mode), Kit Read Rush (Note Rush on drum notation), Sing the Interval Sprint (voice) | `rush.ts`, `Rush.tsx`, `courseRows.ts` | 300 |
| Course additions: voice Highway pitch lanes, Name That Standard, Voicing Spy | `courseRows.ts`, **new** `engine/nameStandard.ts` + `ui/NameStandard.tsx`, **new** `engine/voicingSpy.ts` (or a Rush streak mode) | 600 |
| Social: `tournamentItem(…, tier)`, duel / room / ghost tier, daily bands | `engine/tournament.ts`, `Tournament.tsx`, `Online.tsx`, `Compete.tsx`, `cloud/compete.ts`, `cloud/daily.ts`, `scripts/daily-keys.ts` | 400 |
| Migration: `tier smallint` on `toneturn_duels`, `toneturn_rooms`; `band` on daily keys / results (PK `(day, band)`); RPCs pass it through | **new** `supabase/migrations/2026111x_toneturn_game_tiers.sql` | 120 |
| Game board per tier (friends' bests), quests for tiers, workout fast block | `engine/ranks.ts` (board helper), `engine/quests.ts`, `engine/workout2.ts`, `ui/Friends.tsx` | 250 |

### P3 — new advanced games (≈ 3,000 lines)

| Game | New files | Size |
|---|---|---|
| Reharm Spotter | `engine/reharmSpot.ts`, `ui/ReharmSpot.tsx` | 450 |
| Barry Harris in Time | `engine/bhInTime.ts` (grid + rule check), `ui/BhInTime.tsx`, reuse drills analysis | 600 |
| Odd-Meter Riff Echo (guitar, bass, keys, kit) | `engine/riffEcho.ts` (original riff generator), `ui/RiffEcho.tsx`, reuse bass / drum ear measurement | 650 |
| Transcription Race | `engine/transcribeRace.ts`, `ui/TranscribeRace.tsx` | 400 |
| Polyrhythm Lock, Fill & Land, Name That Groove (drums) | `engine/polyLock.ts`, `engine/fillLand.ts`, reuse `drumEar.ts` style naming | 550 |
| Keys / guitar / bass instrument games: Play It Back, Voicing Sprint, Chord Change Race, Walk the Changes, Roots by Ear, Harmony Hold (voice) | thin game shells over existing drills / ear content | 350 (shells) — content is the drills' |
| Placement skip from cleared tiers; tier crests and badges | `engine/placement.ts`, `engine/badges.ts`, `ui/BadgeArt.tsx` | 200 |

### Priority summary

| P | What the owner gets |
|---|---|
| **P1** | Every existing game opens at the right tier, shows `your level · next`, clears tiers honestly, rates at the right difficulty, **gives XP** (league / goal / course split finally see games), fits one screen. |
| **P2** | The top tiers reach the niche (altered chords, Coltrane, odd meters, PD classical tunes), voice / drums / jazz gaps closed with the cheapest new games (Name That Standard, Voicing Spy, Scale & Mode Rush, Kit Read Rush), duels / rooms / daily / boards per tier. |
| **P3** | The niche's flagship games: Reharm Spotter, Barry Harris in Time, Odd-Meter Riff Echo, Transcription Race, the drum and instrument games. |

### Open questions for the owner (product, not UI)

1. May a player try **one tier above** their open tier (rated), or only their own and below?
2. Game XP cap: 100 XP a day from games acceptable, or should games stay lower than lessons (e.g. 50)?
3. Daily challenge: three bands (soft / mid / loud) instead of one set for everyone — OK?
4. Advanced-only games: hide pp–p entirely, or show them with "opens at mp" (a goal to aim for)?

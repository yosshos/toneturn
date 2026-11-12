# Drums course: niche plan (2026-11-10)

Research only. No app code was changed. This plan builds on `DRUMS_CURRICULUM.md` (the curriculum F1–F14),
`DRUMS_AUDIT.md` §4–§6 (what is built, what remains, kit handling), and the owner's niche decision of 2026-11-10:
"sophisticated music". Pop is the way in, and the top levels reach serious jazz and prog / fusion.

House rules that apply throughout:

- only measured practice counts (e-kit by MIDI; pad or acoustic kit by microphone where `ACOUSTIC_LEVELS` allows);
- our own generated material, never anyone's exercises;
- legal sources only: no copyrighted recordings;
- one phone screen per exercise;
- every activity feeds the path, map, XP, leagues, level test and workout.

## 0. Summary

| # | Item | Priority | Size |
|---|---|---|---|
| 1 | **Songs and song forms**: new `d-song` family (8 levels), measured per section; the band generated from chord charts | P1 | M–L |
| 2 | **Drum games**: Land It (fills), Groove Echo, Odd-meter Echo, Time Lock, Rudiment Rush, Ghost Control, Groove-off duel | P1 (first 3) / P2 | S–M each |
| 3 | **Reading and theory on the path**: from 5 topic steps to about 25 (`drum-read` 6–10, `drum-count`, `drum-notation`, `drum-form`) | P1 | M |
| 4 | **Prog / fusion**: new `d-prog` family (10 levels): odd groupings, polymeter, polyrhythm, metric modulation, linear, displaced | P1 for the niche | M + shared engine work |
| 5 | **Jazz deepening**: `d-jazz` 9–12 (brushes, comping over forms, set-ups, broken time / 2 → 4 feel) | P2 | M |
| 6 | **Remaining curriculum**: 34 levels across F1–F14 + mambo, songo, Mozambique (after a teacher verifies them) | P2 / P3 | L (phased) |
| 7 | **Needs a real kit** before claims are made (list §7) | P1 for calibration | owner's drummer friends |

Prerequisite already on the P1 list in `DRUMS_AUDIT.md` §4: a per-course level. Rate drums from the
`instrument/drum-tech` sub, so that piano or guitar playing does not move the drummer's rank. That matters more once
leagues and duels compare drummers (§2).

---

## 1. Inventory (exact, at `f35d65f`)

### 1.1 Families: `src/engine/drills/drums.ts::drumFamilies()` (+ `drumEar.ts`, `drumStyles.ts`)

There are **15 families with 91 levels**, all path steps of the drums course.

| Family | Levels | Content (level kinds) | Mic / pad |
|---|---|---|---|
| `d-strokes` Strokes & dynamics (F1) | 5 | quarters, eighths, three dynamics, accent + taps, moving accent | all |
| `d-rolls` Singles, doubles, rolls (F2) | 6 | singles 8 / 16, doubles 8 / 16, single-stroke 4 / 7, 5-7-9 rolls | all |
| `d-diddles` Paradiddles, flams, drags (F3) | 9 | para, accents, inverted / reverse, double / para-diddle-diddle; flams, flam accent / tap, drags, Swiss / flam paradiddle, ratamacue | L1–4 (flams MIDI only) |
| `d-time` Time & subdivision (F4) | 6 | pulse, subdivision ladder, click on 2 & 4, gap 2 / 2, gap 1 / 3, off-beat click | all |
| `d-rock` Rock & pop grooves (F5) | 8 | rock, kick variations, hats / ride / open hat, 16th hat 1 and 2 hands, half / double / four-on-floor, pop 16th kick, groove + fill | acoustic: 1, 2, 4, 5, 7, 8 |
| `d-fills` Fills & landing (F9) | 5 | 1-beat, 2-beat 16ths, 1-bar around the kit, triplet, from the "&" of 3 | acoustic: 1–3 |
| `d-read` Reading (F14) | 5 | snare 8ths / rests, dotted / syncopation, 16th groupings, triplets / accents / ghosts; kit groove | L1–4 |
| `d-funk` Funk & ghost notes (F6) | 4 | snare ghosts, + hat 8ths, + syncopated kick, 16th-hat funk | acoustic: 2–3 |
| `d-shuffle` Shuffle & triplet feels (F7) | 4 | triplets, shuffle, 12/8 slow blues, double shuffle | acoustic: 1–3 |
| `d-indep` Independence (F10) | 4 | unison, kick reading 8ths / 16ths, snare over hat + kick | acoustic: 1–4 |
| `d-mideast` Middle-Eastern & Mizrahi (F12) | 9 | malfuf / maqsum, baladi / sa'idi, ka, Mizrahi pop kit, wahda / ayyub, chiftetelli, karsilama + aqsaq 9/8, 7/8 + 10/8, switch on cue | acoustic: 1–9 |
| `d-feet` Feet (F13) | 3 | hi-hat foot 2 & 4, groove + foot, kick 8ths | acoustic: 3 |
| `d-ear` Drummer's ear | 8 | echo 8ths, echo 16ths, snare dictation (write), echo a groove, groove + fill, spot the change, style by ear, groove dictation | L1–3; acoustic 4, 5, 8 |
| `d-jazz` Jazz (F8) | 8 | ride, + foot 2 & 4, feathered kick, comping snare, comping snare + kick, jazz waltz, up-tempo 2-feel, trading 4s | – |
| `d-latin` Latin & Brazilian (F11) | 7 | bossa, samba, son / rumba clave, cascara + clave, cha-cha-chá bell, 6/8 bembé, baião | – |

Levels: 5 + 6 + 9 + 6 + 8 + 5 + 5 + 4 + 4 + 4 + 9 + 3 + 8 + 8 + 7 = **91**.

### 1.2 Around the families

- **Topic steps on the drums path: 5.** These are `drum-read` levels 1–5 (`topicsTime2.ts`, `forPlays: ['drums']`):
  rock beat, kick variations, fills, 16th hats, open hat + ghosts. They are played on three pads and graded per lane.
  The ear course's time topics (beat echo, rhythm dictation, gap click, backbeat) are not on the drums path: courses
  are disjoint (DRUMS_AUDIT §4 P2, an open owner decision).
- **Games** (`courseRows.ts`): `drills`, `highway` (kit mode, `highway.ts`), `rhythm` (beat echo), `groove` (the groove
  trainer).
- **Placement:** 11 adaptive steps (`DRUM_PROBES` → `placeDrums`): pulse, hands staircase, doubles, paradiddle,
  dynamics, basic groove, funk + shuffle reach, fill, read, feet. Mic mode runs the snare steps.
- **Measurement** (`drumAnalyze.ts`, `drumAcoustic.ts`):
  - per-limb timing;
  - wrong voice;
  - velocity bands from calibration (ghost / accent);
  - flam and drag graces (15–40 ms);
  - swing ratio of the ride skip notes;
  - `pulse: 8` + `groups` for odd meters (click on the group starts, beamed by group);
  - fill landing (crash + kick on 1, ± 25 ms);
  - dictation grids (`DrumWrite`, can only lower a verdict);
  - CC4 hi-hat foot;
  - acoustic-kit classification (NNLS over calibrated templates, "unsure" hits).
- **Band:** `drumBand()` (`drumStyles.ts`) puts a 4-bar chart per style under grooves: comping + a bass line locked to
  the kick (walking in swing), and `rests` for solo bars. It is gated behind headphones / line-in / e-kit.
- **Material that exists elsewhere:**
  - `grooves.ts` (45+ grooves incl. world styles, 7 kits);
  - `form.ts::arrange` (section plans → drums + bass + chords + lead);
  - `band.ts` (`bandComping` in 11 styles, `walkingBass`);
  - `standards.ts` (40 standards' changes, chords only);
  - `charts.ts` (`CHART_TEMPLATES`).

---

## 2. Playing with songs and song forms (P1, M–L)

### 2.1 What "a song" can legally be (`MUSIC_SOURCES_LEGAL.md`)

| Source | Use for measured drumming | Verdict |
|---|---|---|
| A band **generated from a chord chart** (`band.ts` + `form.ts`): our section plan and our arrangement | the app knows every bar, so every section change is measurable | **yes, the default** |
| A **chord-only chart of a real song** typed by the player ("My songs": chord progressions are not protected), with sections and tempo | the band plays it; the player drums the song's form | **yes** |
| **Standards' changes** (`standards.ts`) for jazz forms (AABA, blues, rhythm changes) | the jazz forms in §5 | **yes** |
| The player's **own backing track** (their audio file or their own MIDI file) | MIDI: exact. Audio: needs a tempo and a downbeat. Give a tempo field + a "tap the first downbeat" alignment, and measure only against that grid; beat-tracking is later | yes (P3) |
| Commercial recordings, previews, Spotify / YouTube audio | the app cannot read the audio (and must not) | **no** |

### 2.2 The engine: a song is a section plan

`Section { name, bars, meter, groove (lanes), feel, dynamic, fillBar?, hits?[], cue }`.

- The band comes from the chart (per-section chords and band style).
- The drum part is the expected events per section, built from the existing level generators: a rock-verse
  groove, a chorus with ride or open hat, a half-time bridge, and so on.
- The screen shows a **road map** (sections as blocks, the current bar lit, a cue one bar ahead), not the whole score.
  That keeps the one-screen rule.

Measured per take:

- **Per section:** groove match (the per-limb verdict of that section's bars).
- **Section starts:** landing (crash + kick on 1, ± 25 ms) and the fill present in the bar before (onsets in the fill
  zone).
- **Form position:** "0 lost bars", computed by aligning the take bar by bar. A missing or extra bar shows as a shifted
  section.
- **Tempo through the song:** drift ≤ 2 % over the whole form. No rushing into the chorus (median IOI per section).
- **Dynamics arc:** the chorus median velocity ≥ verse × 1.15 when the chart asks for it (calibrated bands).
- **Hits and set-ups:** written ensemble hits (kick + crash) on time, and a set-up fill before them.

### 2.3 `d-song` levels (new family, 8)

These absorb curriculum F5 L10, F9 L10 and F14 L7–8.

| L | Content | Measured | Tempo |
|---|---|---|---|
| 1 | Verse → chorus: two grooves, 8 + 8 bars, switch on the cue | section grooves, switch landing | ♩80 → 110 |
| 2 | + a fill at every section end | fills present, landing | 80 → 110 |
| 3 | Full pop form: intro, verse, pre-chorus, chorus, bridge (half-time), chorus, ending | form position, all landings, drift | 85 → 115 |
| 4 | Stops and band hits: catch the written hits, set-up fills | hits on time, set-up present | 90 → 120 |
| 5 | Road-map reading: repeats, 1st / 2nd endings, D.S. al coda, from the chart (the player follows the symbols) | 0 lost bars | 80 → 110 |
| 6 | Dynamics arc: verse p, chorus f, a breakdown at pp | velocity per section | 80 → 110 |
| 7 | Style songs: a 12-bar shuffle with a turnaround and ending; a funk vamp with a breakdown and a cue back; a Mizrahi song (maqsum verse, chorus in the Mizrahi pop groove, a chiftetelli bridge) | per-section style rules (swing ratio, ghost band, dum / tak) | per style |
| 8 | **Your song**: a chord-only chart the player types (sections + chords + tempo), and the app builds the band | everything above | the player's |

Songs are **generated per take** (section lengths, chord charts from templates, groove variants, and fill positions are
seeded), so nothing can be memorised. L8 is the "real songs" bridge, and it is legal because it is chords only.

**Files.**
- new `src/engine/drills/drumSong.ts` (section plan → `Drill` with `sections`, `band`, `chart`);
- an extension of `drumAnalyze.ts` for per-section verdicts, form position and the dynamics arc;
- `form.ts::arrange` reused for the band parts;
- a `DrumRoadMap` component (one row of section blocks, cue chip);
- `tests/drumSong.test.ts` (a steady take is clean; a skipped bar is caught; a late chorus landing fails);
- e2e: one song take at 390 × 844 with no overflow.

Jazz forms (AABA, blues, trading over the form) are in §5. Prog songs (sections in different meters) are in `d-prog`
L10 (§4).

---

## 3. Drum games (P1 / P2)

Every game is a measured take on the kit, feeds XP, the league (drums slice) and the workout, and uses seeded
material.

| Game | Play | Measured | Prio | Size | Reuses |
|---|---|---|---|---|---|
| **Land It** (fill landing) | A groove runs; one bar ahead the app calls a fill length (1, 2 or 4 beats). Fill, land crash + kick on 1. Rounds get faster | landing error (ms), groove resumes, no rush in the fill (≤ 2 %) | P1 | S–M | `fillLandings`, the `d-fills` generators (curriculum F9 L8–9) |
| **Groove Echo** | Fast rounds of "hear 1–2 bars, play them back" across styles; a streak and rising difficulty | per-voice match, as `d-ear` 4–5 | P1 | S | `drumEar.ts` |
| **Odd-meter Echo** | Hear one bar in 5/8, 7/8, 9/8 or 11/8 with accents on the group starts; echo it. Is it 2+2+3 or 3+2+2? Played, not tapped | accent positions (velocity), timing | P1 | S | `drumEar.ts` + `groups` |
| **Time Lock** | The click disappears for 1, 2, 4, then 8 bars; keep going; score = how long you stay within ± 20 ms | drift in the silent bars | P2 | S | `d-time` gap click |
| **Rudiment Rush** | A rudiment is shown (name + sticking + notation); play 2 clean bars; the tempo rises each success | timing, accent pattern, flam / drag graces. Sticking: one pad cannot tell R from L, so offer a **two-zone mode** (hands on two pads, or head / rim where the kit sends separate notes) that scores sticking; otherwise sticking is a self-check, never graded | P2 | M | `d-rolls` / `d-diddles` generators |
| **Ghost Control** | A lane of targets in three dynamic bands (ghost, normal, accent) | velocity band per hit, timing | P2 | S–M | velocity calibration, dynamics meter |
| **Groove-off** (duel) | The same seeded groove challenge for two friends, at their own time; compare measured scores | per-limb verdict, tempo reached | P2 | M | the existing duel infrastructure + per-course level (prerequisite) |

**Files.**
- new `src/engine/drumGames.ts` (pure round builders + scoring);
- `src/ui/games/*` (one component per game, shared shell);
- `courseRows.ts::COURSE_GAMES.drums` (add `land`, `groove-echo`, `odd-echo` first);
- `gameRating.ts`, quests and badges (no emoji);
- tests per game for the scoring rules.

---

## 4. More reading and theory on the drums path (P1, M)

Today there are 5 topic steps (`drum-read` 1–5). Proposal: about 25, all on `forPlays: ['drums']`. Answers are played
on the kit or pad and measured where the question is rhythmic. Knowledge questions (which staff line is the floor
tom?) are answered by playing that drum, so even "theory" is played.

| Topic | Levels | Content |
|---|---|---|
| `drum-read` 6–10 | 5 | 6: triplets and swung-8ths notation (the "swing" marking vs written triplets, DRUMS_AUDIT §4 P2). 7: 16th kick + ghost notes. 8: fills on the toms with sticking marks. 9: odd meters (7/8, 9/8 with group beams). 10: a 4-bar groove + fill at sight |
| `drum-count` | 5 | count and play: simple vs compound meters; 6/8 vs 3/4 (accents decide); groupings 2+2+3 vs 3+2+2; reading a time-signature change; counting rests through 4 bars |
| `drum-notation` | 5 | the drum key (staff position → drum, played); noteheads (x = cymbals, circled = open hat); accents / ghosts / flams / drags; rolls and tremolo slashes; repeat bars and multi-bar rests |
| `drum-form` | 5 | form knowledge, played: hear a song form and crash on each section start; section lengths (4 / 8 / 12 / 16 bars); 12-bar blues; AABA; road-map symbols (D.S., coda, endings) |
| `drum-style` (optional) | 5 | style by ear, answered by playing the style's groove (as `d-ear` 7): rock / funk / shuffle / bossa / maqsum / swing / 6/8 / samba / songo |

**Owner decision** (carried over from DRUMS_AUDIT §4 P2): should these be drums-only copies, or shared with the ear
course's time topics? This plan assumes drums-only generators that reuse the shared rhythm engine (`rhythm.ts`,
`topicsTime2.ts` helpers). That keeps courses disjoint, as the 0.61 design wants.

**Files.**
- new `src/engine/topicsDrums.ts` (or extend `topicsTime2.ts`);
- `pathNames.ts` (short node names);
- `stepGlyphs.ts` (one glyph per topic, per the path-symbols rule);
- `topicGroups.ts` (no emoji; the existing 🥁 is a mature-UI leftover);
- the topic tags (`rhythm-reading/drums`, `meter/odd`, `form/`);
- tests: every level generates, and every played answer grades clean.

---

## 5. Prog / fusion for the niche: `d-prog` (P1, M + shared engine work)

The Middle-Eastern family already covers 9/8, 7/8 and 10/8 by tradition (`d-mideast` 7–8), and the engine has
`pulse: 8` + `groups`. `d-prog` takes those meters into rock / fusion grooves and adds the modern concepts. It
absorbs curriculum F4 L10, F6 L5, F9 L6 and F10 L8.

| L | Content | Measured | Engine need | Tempo |
|---|---|---|---|---|
| 1 | Odd-meter rock grooves: 7/8 (2+2+3), 5/4 (3+2), backbeat placed by group | per-limb, group-start click | – | ♪180 → 260 |
| 2 | 9/8, 11/8, 13/8 and changing groupings within one meter (3+3+2 ↔ 2+3+3) | the same + accent positions | – | ♪180 → 260 |
| 3 | Groupings over 4/4: 16th groups of 3 and 5 on hat / kick across the bar line (3+3+3+3+4), realigning every bar or every two | accent positions (velocity bands), timing | – | ♩60 → 100 |
| 4 | **Polymeter**: a 7/8 cycle (band riff + kick / snare) over a 4/4 hat; a 3/4 kick-snare cycle under 4/4 cymbals; they realign after N bars | per-lane timing; each lane is its own cycle in the generator | – (lanes already carry independent hits) | ♩80 → 110 |
| 5 | **Polyrhythm between limbs**: 3:2, 4:3, 5:4 (hands vs feet, ride vs snare) | ratio error per limb (IOI ratio vs ideal) | a ratio rule (S) | ♩60 → 90 |
| 6 | **Metric modulation**: the triplet 8th becomes the new 8th (♩ × 2/3 → new pulse), or the dotted 8th becomes the new beat; the click changes on cue | the new tempo's IOI accuracy (≤ 2 %), landing on the new 1 | a **tempo map** in a `Drill` (M; shared with guitar `g-prog` 5) | ♩80 → 110 |
| 7 | **Linear fusion grooves and fills**: no two limbs together; RLK, RLRLK, RLLK combinations around the kit | coincidence rate = 0 (two hits within 15 ms is a fail); per-limb timing | a coincidence rule (S) | ♩70 → 110 |
| 8 | **Displaced grooves**: the backbeat displaced by a 16th, then an 8th ("over the bar line"); displaced cymbal patterns | per-limb timing (the written displacement is the reference) | – | ♩80 → 110 |
| 9 | Quintuplets and sextuplets against the click; gospel-style 6-stroke roll fills | grouping timing | 1/16Q, 1/16S subdivisions in the generator (S) | ♩60 → 90 |
| 10 | **Prog song form**: sections in different meters (7/8 verse, 4/4 chorus, a metric-modulated bridge), with the band in unison hits | everything in `d-song` + the meter changes | **per-bar meter** (M; shared with `d-song` and guitar `g-prog` 3) | per section |

**Acoustic kit:** L1–3, L5, L7 and L8 use kick / snare / tom / cymbal classes only, so they can join `ACOUSTIC_LEVELS`
after a real-kit check. L4 and L6 need the band through headphones.

**Files.**
- new `src/engine/drills/drumProg.ts`;
- `types.ts` (`Drill.tempoMap?`, `Drill.meters?` per bar);
- `drumAnalyze.ts` (coincidence and ratio rules, tempo-map-aware matching);
- `drumNotation.ts` (meter changes per bar, tuplet brackets 5 / 6);
- the metronome / count-in code (the click follows the tempo map and meters);
- tests including the human-take sweep.

**Path:** `DRUM_LATER['d-prog'] = 6` (after funk, shuffle, independence and Middle-Eastern 7–8).

---

## 6. Jazz deepening and the remaining curriculum

### 6.1 `d-jazz` 9–12 (P2, M)

| L | Content | Measured | Notes |
|---|---|---|---|
| 9 | **Brushes ballad** (curriculum F8 L9): taps scored, the sweep shown and not scored | tap timing and velocity | many e-kits do not support brushes; on an acoustic snare by microphone a sweep is a continuous noise envelope. Detecting it is **unverified**, so it stays unscored |
| 10 | **Comping over a form**: a 12-bar blues and an AABA standard (`standards.ts` changes, the band walking); kick and snare comping that answers the form (busier into the bridge) | per-limb timing; ride steady (CV); 0 lost bars; crash or set-up at each section start | uses the `d-song` section engine |
| 11 | **Set-ups and ensemble hits**: big-band style figures on the chart, a set-up fill before each | hits on time, set-up present | absorbs curriculum F9 L10 for jazz |
| 12 | **Broken time and the 2 → 4 feel switch**: a 2-feel in the A sections, 4 in the bridge; trading 8s; up-tempo ♩240 → 300 | swing ratio (fast range), form position, landing | trading 4s exists (L8) |

### 6.2 `d-latin`: mambo, songo, Mozambique (P2 / P3)

DRUMS_AUDIT §5 left mambo and songo out, because no source that could be checked gave their kit patterns. This plan
**keeps that rule**. Have a teacher (the owner's drummer friends) confirm the traditional patterns before building
them. The candidates are:

- the mambo bell over the clave;
- songo (kick, snare and cowbell interplay);
- the Mozambique bell.

The same check is open for the cascara orientation and the baião / samba / bembé kit adaptations (audit §5). Once
verified, they become L8–10.

### 6.3 The rest of the curriculum (P2 / P3, phased)

Levels in `DRUMS_CURRICULUM.md` §4.2 not built and not absorbed above: **34**.

| Family | Levels | Content | Notes |
|---|---|---|---|
| F1 `d-strokes` | 6–8 | accented triplets, crescendo / decrescendo (slope R² ≥ 0.8), ghost / accent duel | |
| F2 `d-rolls` | 7–10 | triplet ↔ 16th switch, speed ladder (personal record), 2-minute endurance, double-stroke 16 → 32 | |
| F3 `d-diddles` | 10 | rudiment to kit | |
| F4 `d-time` | 7–9 | slow time ♩50, pocket behind / on / ahead, click on 1 only | |
| F5 `d-rock` | 9 | punk 8ths endurance | |
| F6 `d-funk` | 6–9 | open-hat barks, half-time shuffle with ghosts, lazy-snare boom-bap (pocket of the snare), go-go / second line | |
| F7 `d-shuffle` | 5–8 | swing ratio dial, reggae one-drop, steppers, half-time shuffle | |
| F9 `d-fills` | 7–9 | flam / accent fills with choke, random fill call (or the Land It game), improvised fill scored on landing | |
| F10 `d-indep` | 5–7, 9 | ostinato / reading limb swaps, 3-way jazz reading, 4-way samba / baião feet, clave over groove | |
| F13 `d-feet` | 4–8 | kick doubles, foot splash, double pedal (evenness + odd / even velocity balance), double bass 16ths, gallop | |
| F14 `d-read` | 6, 9 | kit 4-bar groove + fill; an exam-style unseen (own material) | |

Count: 3 + 4 + 1 + 3 + 1 + 4 + 4 + 3 + 4 + 5 + 2 = 34.

**Order.**
1. **First (P2, highest value for the niche):** F6 6–9, F7 5–8, F10 5–7 / 9, F4 7–9.
2. **Then (P3):** F13 4–8 (needs real double pedals), F1, F2, F3 10, F5 9, F9 7–9, F14 6 / 9.

**Totals.** After §2, §5, §6.1 and these: 91 + 8 (`d-song`) + 10 (`d-prog`) + 4 (jazz) + 34 (remaining curriculum)
= 147 levels, or 150 with mambo / songo / Mozambique. Phase it; the niche-first set (§2, §5, the first jazz levels)
is about +22.

---

## 7. What still needs a real kit to validate

From DRUMS_AUDIT §4 / §5 / §6.8, plus what this plan adds. None of it should be claimed as verified until checked.

| Item | Why |
|---|---|
| Tier thresholds (windows, SD, hit rate, ghost ≤ soft × 1.1, accent ≥ loud × 0.9) | still §4.1 defaults |
| Flam / drag detector (15–40 ms graces, SD ≤ 8 ms) | some modules double-trigger or merge hits < 10 ms apart; a flat flam may arrive as one note |
| Swing ranges (58–72 %, fast 52–70 %) | needs real jazz drummers |
| CC4 hi-hat foot (150 ms / 0.35 thresholds) and open-hat levels | guessed; modules differ |
| Acoustic classification (NNLS templates, residual 35 %, unsure 20 %) | tested on synthetic drums only; room echo, phone AGC, cymbal wash |
| App drum-sound latency on Windows / Android; band volume vs the e-kit | not measured |
| Brushes (sweep detection) | unknown on e-kits and by microphone |
| Double pedal (evenness as a proxy for alternation) | needs a real double pedal |
| **New in this plan:** section-landing ± 25 ms, the dynamics-arc ratio 1.15, the linear coincidence threshold 15 ms, polyrhythm ratio error, metric-modulation IOI tolerance 2 %, two-zone sticking mapping per module | all are starting points marked ⚙ |
| Latin kit adaptations: mambo, songo, Mozambique, cascara orientation, baião / samba / bembé | a teacher's check of the traditional patterns |

**Suggested calibration session** (owner + 2–3 drummer friends, one e-kit and one acoustic kit, about 1 hour each):

1. the probe;
2. one item per tier per family;
3. ten flams;
4. two minutes of swing at ♩120 and ♩220;
5. one `d-song` L3 take;
6. one linear groove.

The app's take logs (already stored per item) give the numbers to re-fit the ⚙ thresholds.

---

## 8. Shared work with the guitar plan

`docs/research/GUITAR_DEEPENING.md` §4.3 needs the same engine pieces:

- **per-bar meter** (`d-song` 7 / 10, `d-prog` 10, guitar `g-prog` 3);
- **tempo map** (metric modulation: `d-prog` 6, guitar `g-prog` 5);
- **the band playing a written unison line** (`d-prog` 10, guitar `g-prog` 8);
- **the road-map / section engine** (`d-song`, `d-jazz` 10–11, guitar `g-reading` 6).

Build them once, in `types.ts` / `drills/events.ts` and the metronome, before either course's prog levels.

## 9. Sources

- In-repo: `DRUMS_CURRICULUM.md` (§2 sources: PAS rudiments, the exam boards, the method books summarised there),
  `DRUMS_AUDIT.md` §4–§6, `MUSIC_SOURCES_LEGAL.md` (chords-only charts and the user's own files are legal;
  recordings, previews and streaming audio are not used).
- Middle-Eastern patterns as already checked in DRUMS_AUDIT §5 (M. Frishkopf's Arab durub chart, University of
  Alberta, 2009).
- RSL / Rockschool syllabus structure (ear tests, sight reading, the quick-study piece) as read for the guitar plan:
  https://cloud.rslawards.com/file/download/rockschoolguitar2012syllabusnew.pdf. RSL drums follows the same exam shape.

---

## Implemented (2026-11-11)

P1 is built, and P2 jazz 9–12 too. The drums course now has **20 families and 133 levels** (it had 15 and 91).
Mambo, songo and Mozambique are still not built: a teacher has to check the patterns first. No commercial recording
is used anywhere. Every band is generated from a chord chart, and "Your song" is a chord-only chart that the player
types.

### Content

| Item | Where | What |
|---|---|---|
| `d-song` (8) | `drills/drumSong.ts` | <ul><li>L1 verse → chorus, on the cue</li><li>L2 a fill at every section end</li><li>L3 the full pop form (intro, verse, pre-chorus, chorus, half-time bridge, chorus, ending)</li><li>L4 stops and band hits: crash + kick on each hit, a snare set-up before it, a stop-time section</li><li>L5 reading the road map: repeats and D.S. al Coda, or 1st / 2nd endings and D.C. al Fine. The road map shows the signs only.</li><li>L6 the dynamics arc: verse mf, chorus f, breakdown p</li><li>L7 style songs: a 12-bar shuffle, a funk vamp with a breakdown, a Mizrahi song (maqsum → baladi → chiftetelli)</li><li>L8 your song: a typed chart (`Verse 8: Am F C G` / `= 96`), with three demo charts as the level items and a **Your song** card on the drums Technique hub</li></ul>Section lengths, kick figures, fills and charts are seeded per item. |
| Song builder | `drumSong.ts` `buildSong` | Writes a section plan (roadmap.ts `FormPlan`) as the drum part, section by section: grooves, a fill in the bar before a marked section, crash + kick on each section's 1, hits, stop-time, an ending. The band is the comping plus a bass on the kick from the chart; `tacet` and bass rests cover breakdowns. `d-form`, `d-jazz` 10–12 and the prog song use it as well. |
| `d-prog` (10) | `drills/drumProg.ts` | <ul><li>L1 7/8 and 5/4 rock, the backbeat placed by group</li><li>L2 9/8, 11/8 and 13/8, plus 8/8 alternating 3+3+2 / 2+3+3 bar by bar, with an accented hi-hat</li><li>L3 16th groupings of 3 and 5 across the bar line</li><li>L4 polymeter: a 7/8, 3/4 or 5/8 cycle over 4/4, the band's bass in unison with the cycle</li><li>L5 polyrhythm between limbs, per beat: 3:2, 4:3, 5:4</li><li>L6 metric modulation (tempo map: × 3/2, × 4/3, × 2/3)</li><li>L7 linear grooves and an R L L K tom fill</li><li>L8 displaced backbeat (by a 16th or an 8th) and a displaced cymbal</li><li>L9 quintuplets, sextuplets, six-stroke roll fills</li><li>L10 a prog song: a 7/8 (or 5/8) riff with the band in unison, a 4/4 chorus, a bridge modulated × 4/3, the riff back at the first tempo</li></ul> |
| Reading 6–10 | `drills/drumTheory.ts` | <ul><li>`d-read` 6 triplets, the shuffle written out, and "swing" (straight 8ths under a Swing marking, played and measured swung)</li><li>7 a 16th kick with ghost notes</li><li>8 tom fills with sticking (shown, not graded)</li><li>9 7/8 and 9/8 with group beams</li><li>10 a 4-bar groove + fill at sight, with 20 s to study it</li></ul> |
| `d-count` (5) | `drumTheory.ts` | Simple vs compound; 6/8 vs 3/4 with the signature changing every 2 bars; 7/8 2+2+3 vs 3+2+2 as written; time-signature changes in a groove; counting rests through multi-bar rests with the click thinning out. |
| `d-notation` (5) | `drumTheory.ts` | The drum key (any drum on each beat, played); noteheads (x, round, open-hat circle); accents and ghosts, flams, drags; tremolo slashes (1, 2, 3); repeat bars and multi-bar rests. |
| `d-form` (5) | `drumTheory.ts` | A crash on each section start, the lengths read off a written chart (4 / 8, then 4–16); the 12-bar blues (two choruses); AABA on the swing ride; repeats with 1st / 2nd endings. |
| `d-jazz` 9–12 (P2) | `drills/drumJazz.ts` | <ul><li>9 brushes ballad: the taps are scored (timing, swing, feathered kick); the sweep is shown in the title and never scored</li><li>10 comping over a blues (busier in the 2nd chorus, snare or snare + kick) or over AABA (busier into the bridge)</li><li>11 set-ups and ensemble hits, with triplet set-ups</li><li>12 a 2-feel in A, 4 in the bridge, trading 8s (band out, only the landing measured), ♩240–300</li></ul> |
| Games | `engine/drumGames.ts`, `ui/DrumGame.tsx` | <ul><li>Land It: the fill length is called one bar ahead; scored on the landing, the groove resuming and no rush in the fill</li><li>Groove Echo: styles rise with the tier</li><li>Odd-meter Echo: 5/8 to 15/8, accents on the group starts, played on the kit</li></ul>Each has six tiers in `gameTiers.ts` (rated from drum technique, accuracy clear), is in `COURSE_GAMES.drums` and the Practice games, is a path game step on the drums path, has its own symbol and rating tags, and gives XP and runs through the tier clear rules. |

### Measurement (`drumAnalyze.ts`, the drum rules the prog engine left open)

- **Linear** (`goal.drum.linear` ⚙ 15 ms, max 0): two drums within 15 ms where the part writes one note count as a
  coincidence. Their share of the hits gives the verdict: about 1 in 60 is "almost", more is "not". MIDI only,
  because a microphone merges hits that close together.
- **Limb ratio** (`goal.drum.poly` ⚙ ±4 %): each lane's played tempo (the median played ÷ written IOI) must match the
  other lane's.
- **Songs** (`goal.drum.song`), each checked separately:
  - every section of the form needs ≥ 85 % of its notes on time;
  - ≥ 75 % of the fill-zone notes must be played;
  - the dynamics arc: the median velocity of the loud part ≥ 1.15 × the soft part's ⚙;
  - drift: each section's tempo (a least-squares slope) within ±2 %.
- **Landings and hits** use `goal.drum.landing` (crash + kick, ±25 ms ⚙).
- **Lost bars** come from the shared `analyzeForm` (`goal.prog.form = { lost: 0 }`).
- **Metric modulation** (`goal.drum.modulation` ⚙ ±2 %): the played ratio at each change of the tempo map, measured
  with least-squares slopes over two bars on each side. The shared `tempoChecks` / `analyzeForm` drift
  (note-to-note IOI medians) failed steady human takes (jitter at 45 % of the tier SD) at 2–3 %. The drum side
  therefore uses its own slope measure and does not set `goal.prog.tempoRatio` or the form `drift` / `landMs`. The
  bass and guitar agents may want the same.
- **Accents on one line** (`goal.drum.accentVoices`): an accented hi-hat over kick and snare is judged on the hat
  only.
- **Notation** (`drumNotation.ts`, `DrumViews.tsx`):
  - quintuplets get a 5, and tuplets (3 / 5 / 6) now have a bracket;
  - mixed meters with signatures where they change (in a strip above the staff);
  - tremolo slashes, repeat-bar signs and multi-bar rests;
  - the Swing marking;
  - sticking on tom fills;
  - the **road map** above the score. Live mode lights the current section and cues the next one a bar ahead.
    Written mode shows the chart's signs and the bar count only.

### Around the content

- Every new family is wired in everywhere else:
  - path symbols, all unique on the drums path: `roadmap`, `progmeter`, `counting`, `drumkey`, `dsform`, and
    `landit`, `grooveecho`, `oddecho` for the games;
  - Hebrew and English titles;
  - path order (`DRUM_LATER`: notation 1, count 2, form 3, song 4, prog 6);
  - Technique hub topics;
  - family badges (automatic);
  - rating tags (form/song, meter odd / compound / count, rhythm-dictation/poly, kit reading).
- **Quick lessons** (`content/mini/drums.ts`, a core part and an in-depth part each) cover drumming a song, prog and
  fusion time, counting meters, drum notation, and song form. They open before a family's first path step
  (`gate('tech:<family>')`, a one-line change in `App.tsx` `openPathStep`). Their English narration is not recorded
  yet, so `voiceFiles` "every static line is recorded" fails until it is.
- **Acoustic kit / pad:** no new level is added to `ACOUSTIC_LEVELS` before a real-kit check. Single-surface levels
  stay on a practice pad by microphone: `d-read` 6, `d-count` 1, 2, 3 and 5, `d-notation` 4, and Odd-meter Echo.
- **Tests:**
  - `tests/drumNiche.test.ts` runs perfect and human take sweeps (jitter 0.45 × the tier SD, 2 seeds) through the drum
    analysis + `withProg`, plus a sloppy take. It also checks: a skipped bar is a lost bar, a late chorus landing, rushing,
    a missing fill, flat dynamics, a coincidence, limb drift, the modulation error, the tuplet numbers, the typed song
    and jazz 9–12.
  - `tests/drumGames.test.ts`.
  - `e2e/drums.spec.ts` checks one phone screen at 390 × 844 for a song, road-map reading, the prog song, notation
    signs, Your song, and the three games.

### Not verified (needs a real kit, §7)

- All the ⚙ thresholds above: the 15 ms coincidence window, the ±4 % limb ratio, ±2 % drift and modulation, the 1.15
  arc, ±25 ms landings, and the 85 % section share. The game windows too (Land It ±30 → 18 ms, the 0.98 rush limit).
- Brushes on e-kits and by microphone; the sweep is unscored on purpose.
- The band's bass line reads a constant bar, so the prog song uses a unison bass on the riff instead (no walking bass
  in mixed meters).
- How the road map, the game screens and the Your song card look and feel on a real phone with a real kit. Screens
  were checked in headless Chrome at 390 × 844 (Hebrew and English). The takes were measured with synthetic hits
  only.

---

## Implemented (P2)

The rest of the curriculum (§6.3) is built, plus two P2 games, a few quick lessons and the short kit setup at the
course start. The drums course now has **20 families and 166 levels** (it had 133). Mambo, songo and Mozambique are
**still not built**: a teacher has to check the patterns first (§6.2).

### The 34 levels (`drills/drumMore.ts`)

33 levels are new; the 34th, F14 L6 (a kit groove + fill), is `d-read` 10. Levels are numbered without gaps (the
placement caps by the level count), so the absorbed curriculum levels shift the numbers: F6 L6–9 are `d-funk` 5–8
(F6 L5 linear funk is `d-prog` 7), F9 L7–9 are `d-fills` 6–8 (F9 L6 is `d-prog` 7), F10 L9 is `d-indep` 8 (F10 L8 is
`d-prog` 5).

| Family | Levels | What |
|---|---|---|
| `d-strokes` | 6–8 | accented triplets (alternating, right alone, left alone) · crescendo / decrescendo on 16ths (measured velocity line) · ghosts against accents |
| `d-rolls` | 7–10 | triplets ↔ 16ths at each bar line · speed ladder (16th singles ♩100 → 120, the ladder's best clean tempo is the record) · endurance, 48 bars of 16ths (about 2 minutes) · double-stroke roll 16ths → 32nds |
| `d-diddles` | 10 | the paradiddle on the kit (right hand hat or ride, left snare, kick on the beats; the double paradiddle in triplets) |
| `d-time` | 7–9 | slow time ♩50 · the pocket: 10 ms behind, 10 ms ahead, or behind / on / ahead two bars each · the click on 1 only, then on every other 1 |
| `d-rock` | 9 | punk 8ths for about 2 minutes (hat, ride, the skank beat) |
| `d-funk` | 5–8 | open-hat barks on the "a" · the shuffle with ghost notes · boom-bap with the snare 15 ms behind · go-go and second line (swung 16ths written as sextuplets) |
| `d-shuffle` | 5–8 | the swing-ratio dial (55 / 62 / 67 %, written straight under "Swing") · reggae one-drop · steppers and rockers · the half-time shuffle |
| `d-fills` | 6–8 | flam / accent fills into a crash on the "&" of 4 (the choke is not measured) · the fill length read off the score (1, 2 or 4 beats, seeded per item) · your own fill in empty beats, scored on the landing |
| `d-indep` | 5–8 | ostinato hands with the kick reading, then the line moved to the snare · three-way jazz (ride, foot 2 & 4, snare reads triplets) · four-way: samba or baião feet, the snare reads · clave over the groove with the kick tumbao |
| `d-feet` | 4–8 | kick doubles · the foot splash on the "&" · double pedal, alternating 16ths · double bass 16ths for about a minute · double bass triplets and the gallop |
| `d-read` | 11 | an exam-style unseen: 8 bars, a louder second half, fills closing bars 4 and 8, 30 s to study |

F6 L7 and F7 L8 both said "half-time shuffle". `d-funk` 6 is the full-time shuffle with ghost notes; `d-shuffle` 8
is the half-time shuffle.

### New measures (`drumAnalyze.ts`, `DrumGoal`)

- **`swell`** (crescendo / decrescendo): per zone, the velocity's least-squares line must go the right way with
  R² ≥ 0.8 ⚙ and rise over at least half the soft → loud range ⚙.
- **`pocket`**: the target sits `ms` off the grid, per zone, per voice (the lazy snare) or for every note. The share of
  those notes within ±8 ms ⚙ of the target must be ≥ 70 % ⚙. The tier timing rules are judged against the target too.
- **`endure`**: the timing SD of the last third ≤ 1.3 × that of the first ⚙, and the tempo over the take within ±2 %.
- **`alt`** (two feet on one pad): odd against even strokes. The velocity gap must be ≤ 10 % ⚙ and the gaps' CV ≤ 12 % ⚙.
- **`impro`**: at least 3 hits in each empty zone. A ±25 ms landing after a two-beat fill also catches a rush of about
  2 %.
- The click on 1 with a gap (`click: 'one'`, `gap: [1, 1]`) now sounds only on the 1 of the bars the gap leaves on
  (`timeline.ts`); the silent bars are measured like the gap click.

### Around the content

- Path steps, family badges, Technique hub and workout pick the new levels up through their families. The rating
  tags are by family (`d-time` with the click on 1 → `timing/gap`).
- No new level joins `ACOUSTIC_LEVELS`. The microphone (pad) levels are single-surface: `d-strokes` 6–8, `d-rolls`
  7–10 and `d-time` 7–9.
- **Quick lessons** (`content/mini/drumsMore.ts`): the pocket and the swing dial, reggae, and two feet on the kick. Each
  opens before the first level that needs it (`tech:<level id>`). `App.tsx` now checks a level unit before the family
  unit. The English narration is not recorded yet, so `voiceFiles` fails until it is.
- **Games** (P2, `engine/drumGames.ts`), on one surface and so playable on a pad by microphone too:
  - **Time Lock**: the click drops out for 1 → 8 bars, and the score is the mean drift in the silent bars (±30 → 15 ms
    by tier).
  - **Ghost Control**: accents, taps and ghost notes on the snare, judged by velocity band.
  - Both are wired in everywhere: tiers, rating tags, path game steps, the Practice games, the drums course games,
    their own symbols (`timelock`, `ghostctl`) and the game board.
- **Kit setup at the course start**: `KitSetup quick` is the short form. It learns snare, kick and hi-hat only (the rest
  of the kit comes from the preset / GM map) and skips the pedal and velocity steps. A note on the pad step says
  these and every pad can be fine-tuned later. The kit card shows "Quick setup", and its button is "Finish setup", which runs the
  full wizard.
- **Tests**:
  - `tests/drumMore.test.ts`: catalogue and contiguity; every note inside its bar; lanes sum to at most the meter;
    perfect, human and sloppy takes; a failing take for each new measure; the click plan; the quick wizard.
  - `e2e/drums.spec.ts`: eight new levels in Hebrew and English at 390 × 844, the two games, and the short setup in the
    course start.

### Not built

- Mambo, songo, Mozambique (teacher check). The crash choke (F9 L7): aftertouch differs per module.

### Built 2026-11-12 (the small leftovers)

- **The foot splash against the chick** (F13 L5, `d-feet` 5; `drills/drumSplash.ts`): told apart by the kit's own
  splash note (Alesis 21, Yamaha DTX 83 / 85, `SPLASH_NOTES` per preset) or by the pedal's CC4 stream — a splash opens
  the hats (openness ≥ 0.5 within 30–300 ms of the stroke), a chick keeps the pedal down. `goal.drum.splash` (share
  0.8); below it a clean take is "almost" (within 0.2) or "not". A kit that sends neither is **not measured**: the take
  is judged on timing only, the limb line says "Splash vs chick not measured (the kit sends no CC4)", and the level page
  says MIDI only — a microphone can't hear the pedal's openness reliably (the level stays `mic: false`).
- **A personal speed record on every drum level page** (`drumRecords.ts levelRecord`): the fastest clean take over the
  level's variants (ItemState.cleanBpm, measured takes only), which variant holds it, the level's tempo and the day.
  **Rudiment Rush best tempo**: the fastest round passed in a run (`detail.topBpm`), kept as `counts.rushBpm` (max,
  merged like the other counters), shown on the game's setup and end screens ("a new personal record").
- **`drum-style`** (optional topic, `topicsDrumStyle.ts`, drums course only): name the band's style by ear — 4 levels
  (rock / swing / bossa / reggae → + shuffle, funk, samba, jazz waltz → + songo, half-time shuffle, Afro 6/8, 7/8 prog,
  maqsum → look-alikes: swing / shuffle / half-time, bossa / samba / songo, 7/8 / 5/4 / 9/8 …). The drums play the
  groove bank's pattern and the band engine plays with it (band.ts comping in the style, a walking bass in swing and the
  waltz, else the root on every kick). Tags rhythm-dictation/feel + world; path mark "style".
- **Badges and quests for the new games** (`gameBadges.ts`): Time Lock, Ghost Control, Rudiment Rush, Groove-off and the
  8 advanced games (Voicing Spy, Scale & Mode Rush, Name That Standard, Reharm Spotter, Transcription Race, Barry Harris
  in Time, Odd-Meter Riff Echo, Polyrhythm Lock) — three badges each (clear mp / f / ff; bronze / gold / diamond),
  serious titles, a drawn glyph per game (BadgeArt `special:game:<game>`), shown in the game's home course and the
  courses that list it. Quests: "Meet a drum game's goal" (drums) and "Meet an advanced game's goal" (ear, jazz, keys).

### Not verified (needs a real kit, §7)

- Every ⚙ above: swell R² 0.8 / range 0.5, the pocket's ±8 ms / 70 %, the endurance rise of 30 %, the double-pedal
  10 % / 12 %. The Time Lock windows too.
- How the pocket behaves with real MIDI and microphone latency: the target is only 10–15 ms. Calibrate the latency
  first.
- Double pedal and double bass need a real double pedal.
- The takes were measured with synthetic hits only.
- The splash window (openness ≥ 0.5 within 30–300 ms) and the per-brand splash notes: synthetic CC4 only, no real kit.
- The drum-style items and the game badges / quests were not seen in a browser (no Playwright run this round).

## Implemented (P2, the rest)

The owner asked for the rest of the not-built list (2026-11-11). The drums course now has **20 families and 169
levels**, two more games and an optional measure.

### Mambo, songo, Mozambique (`d-latin` 8–10, `drills/drumLatin2.ts`)

Our own transcriptions of the standard, widely taught kit patterns, three variants each, on the kit (not mic), with the
Latin band:

| Level | Pattern |
|---|---|
| 8 mambo | the mambo bell on the ride's bell over the son clave (cross-stick), 2-3 and 3-2 (the bell's two bars swapped); then the kick tumbao ("&" of 2 and 4) and the hi-hat foot on 2 and 4 |
| 9 songo | after Changuito's kit adaptation: bell 8ths, the left hand's snare ghosts with accents on the "a" of 2 and 4, the kick on the "&" of 2 and on 4, the foot on 2 and 4; the bell on the hi-hat as the third variant |
| 10 Mozambique | after the Steve Gadd / Pacheco kit pattern: the Mozambique bell, the left hand filling its gaps on the snare (linear hands), kick on 1 and 3, the foot on 2 and 4 |

**Not teacher-checked.** The levels carry `needsTeacherCheck` and every item `drum.teacherCheck`; the level grid and
the take's page say "Pattern not yet teacher-checked". Once a teacher confirms (or corrects) the strings in
`drumLatin2.ts`, drop both flags. The groove-off pool leaves these levels out until then.

### Rudiment Rush (`engine/rudimentRush.ts`)

A rudiment (name, sticking, notation) per round; two clean bars; the tempo rises one step after every round passed;
five rounds. Tiers pp → ff (`gameTiers.ts`): singles / doubles in 8ths (♩60 up) → 16ths and the paradiddle → the
paradiddle family → triplet diddles, 5- and 6-stroke rolls → 7- and 9-stroke rolls, the triple paradiddle → mixed
(♩90 up). XP and the 25 / 100 caps as every game; rating tags `instrument/drum-tech` 0.8 + `timing/steady` 0.2; a path
game step in the drums course's instrument units; its symbol (`rudrush`); the game board through the usual best
submit.

**What is measurable (the two-zone mode, saved on the kit profile as `zones`):**

| Setup | Zones offered | Sticking |
|---|---|---|
| MIDI (e-kit or pad controller) | R hi-hat / L snare; R floor tom / L snare; R snare head / L rim; one pad | graded: the surface the kit reports names the hand. Head / rim only when the kit sends the rim as its own note (GM 37) — the setup says so |
| Acoustic kit by microphone | R hi-hat / L snare (toms when calibrated); one pad | graded: the mic tells a cymbal from a drum, not the head from the rim |
| Practice pad by microphone | one pad | shown under the staff, a self-check, never graded |

A round passes when the take is not "not yet" and, in two zones, ≥ 90 % ⚙ of the strokes land on the right hand's
surface. Points: clean 100 / almost 70, × the round's tempo ÷ the tier's start tempo. Flams and drags stay out of the
game: their grace note is the other hand, so in two zones it falls on the other surface, which the grace-note matching
does not take.

### The drum level and the Groove-off duel (`engine/grooveOff.ts`, `ui/GrooveOff.tsx`)

- **The drum level (per course, from the ladder):** groove levels done by measured takes (≥ 3 stars) across rock, funk,
  shuffle, Latin, jazz, Middle East and independence: 0 / 2 / 5 / 9 / 14 / 20 done = pp … ff. The screen shows the
  tier, the count and how many to the next tier.
- **The duel:** three rounds from the tier's groove pool (real ladder levels), at the level's start, middle and target
  tempo; the seed carries the tier (`tierSeed`), so both players get the same grooves. A round scores clean 100 /
  almost 60, + up to 30 for tight time (the worst limb's SD under 30 ms); the result shows a mark per limb and the
  tempo reached. The winner: the higher total, then the higher tempo reached.
- **Server and local:** with a signed-in friend it is an ordinary friend duel of kind `groove` (the answers carry the
  round points; the server sums them). That needs `supabase/migrations/20261129000000_toneturn_groove_duels.sql`
  (**not applied**): until then, creating one fails and the screen falls back to a **local challenge code**
  (`GO1-<seed>-<points>`) to paste in a chat; the friend plays the code and gets a reply code. The Duels tab hides
  groove duels.
- XP / tiers through `recordGame2('groove-off')` (clear rule `social`), rating tags as the drum games, the game board.

### Crash choke (`drills/drumChoke.ts`)

`d-fills` 6 (the anticipations) now asks for each crash on the "&" of 4 to be grabbed by the next 1 (`goal.choke`,
one beat of tail added so the last one can be heard). The kit's polyphonic pressure (0xA0) messages are collected
during the take (a held edge's stream is one grab). A kit that sends none is **not measured** and never fails for it; on
a kit that sends them, a missed choke keeps a clean take at "almost".

### Tests

- `tests/drumP2rest.test.ts`: the three levels (flags, notes in bars, the mambo bell / clave positions, linear
  Mozambique hands, clean vs sloppy takes); Rudiment Rush (tiers and wiring, every rudiment, tempo per pass, seeding,
  zones per setup, the surface → hand map, right vs swapped sticking in each zone, the pad self-check, points by tempo);
  the drum level from ladder facts, the groove pool, same rounds per seed, scores, the winner, the code round-trip; the
  choke (not measured / in the window / late, grab collapsing).
- `e2e/drums.spec.ts`: the three levels with their note, Rudiment Rush (zones, first round), Groove-off (level, a bad
  code, a local challenge's first round), all at 390 × 844 — **written, not run** (the machine was loaded).

### Still not built

- The splash vs the chick on the hi-hat pedal (F13 L5): only the pedal's timing is measured.
- A per-player speed record shown on the level, beyond the ladder's best clean tempo (Rudiment Rush's top tempo goes
  to the game board only).
- `drum-style` (optional).

### Not verified (needs a real kit / a teacher)

- The three Latin patterns (a teacher's check — owner).
- Rudiment Rush's 90 % sticking rule ⚙, and whether head / rim works on the owner's kit (it must send the rim note).
- The choke window (60 ms after the crash to 80 ms after the next 1) and the pressure threshold (≥ 64) on a real kit;
  which kits send 0xA0.
- Groove-off's +30 timing bonus and the tier thresholds of the drum level ⚙.
- The migration's dry run, then applying it (owner).

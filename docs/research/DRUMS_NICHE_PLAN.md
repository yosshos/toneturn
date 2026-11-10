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

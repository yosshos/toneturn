# AUDIT-GAMES — every game in the catalogue, and the games the new content needs (2026-11-15)

Read-only audit. No app files were changed.

**Scope.** The 45 games that the Practice → Games list can show (`COURSE_GAMES` in `src/ui/courseRows.ts`, cards in
`src/ui/Arcade.tsx` `PlayScreen`/`GAMES2`, routes in `src/ui/App.tsx`).

**Method.**
- **Code reading:**
  - `gameTiers.ts` (tiers and their sources);
  - `gameRating.ts` (rating events);
  - `progress.ts` `recordGame2` / `applyGameRun` (XP, league and tiers);
  - `path.ts` `GAME_STEPS` / `AREA_GAMES` and `pathBonus.ts` `BONUS_GAMES` (path);
  - `workout2.ts` (workout);
  - `tierPlacement.ts` (level test);
  - `analysis/keyMastery.ts` (key mastery);
  - `quests.ts`;
  - every game screen and its engine (key pools, input, InputCheck).
- **Screenshots:**
  - Each game was captured at 320×720 in English and Hebrew, on its setup screen, during play and at the end. That is 3 stages × 2 languages per game.
  - The setup was a fresh returning player, seeded in IndexedDB as in `e2e/drums.spec.ts`, opened with `?sim=1&unlock=all`.
  - The runs used their own vite on 127.0.0.1:5183, served from a `git archive` of `6dcda562`. The working tree was mid-merge at the time, with a conflict marker in `src/engine/drills/types.ts`.
  - Playwright's clock was fast-forwarded 5 minutes to reach the end screen.
  - Files are named `docs/games-audit-shots/<game>-<en|he>-<1setup|2play|3end>.jpg`. `_list-<course>-<lang>.jpg` are full-page shots of the games list. They show the Ear list in every file, because the arcade route kept the Ear course.
  - The "end" shot is a real result card for the timed games (Rush, Kit Read, Sing Interval, Voicing Sprint, Highway, Echo). For games that wait on an answer (ghost, daily, duel, puzzles, takes), it shows a later round instead.
- **DOM checks on every shot** (appendix A):
  - vertical and horizontal overflow;
  - inner scroll boxes;
  - Latin text in Hebrew outside `<bdi>`, `dir=ltr` and dynamics;
  - emoji;
  - computed gradients;
  - glow (blurred box-shadow, text-shadow, drop-shadow);
  - green hues (75–165°);
  - text contrast below 3:1;
  - yellow text on light backgrounds;
  - fonts;
  - whether `.input-check` is present.
- **Mic and MIDI** run in the labelled simulator. Real-device input was not tested; grading accuracy is out of scope.

---

## 1. Inventory

**Columns:**
- **Courses:** from `COURSE_GAMES`. E = ear, J = jazz, V = voice, K = keys, G = guitar, B = bass, D = drums.
- **Input:** tap, choice, mic, MIDI.
- **Tiers:** pp–ff (all six) or mp–ff (advanced, `minTier: 'mp'`).
- **Feeds:**
  - **XP/L:** XP and league, through `applyGameRun` → `applyResult` (a `game-<id>` result: XP × tier factor, at most 25 a game and 100 a day). League standings are built from weekly XP.
  - **R:** rating events (`gameEvents`) on the skill shown.
  - **P:** a path step. "unit" = `GAME_STEPS`, "bonus" = `BONUS_GAMES` (optional, mp), "—" = never on the path.
  - **LT:** cleared tiers ≥ mf give the level test a prior (`tierPlacement`). Only skills that have a placement section count, so the instrument sub-skills give none.
  - **W:** in the workout (`workout2.ts` adds only `highway` and `drills`).
  - **KM:** key mastery. No game feeds it; `keyMastery.ts` reads `drillItems` only.
  - **Q:** daily quests: the tier quests for any game, `drumGame`, `advGame`.

| # | id | Name en / he | Courses | Input | Tiers | Trains (rating source) | XP/L | R | P | LT | W | KM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | melody | Echo Chain / שרשרת הד | E V | pads · sing · MIDI | pp–ff | sequences (own `recordGameRounds`) | ✓ | ✓ | — (its lessons are) | ✓ | — | — |
| 2 | rhythm | Beat Echo / הד קצב | E K G B D | tap · knock (mic) | pp–ff | rhythm | ✓ | ✓ | — | ✓ | — | — |
| 3 | truefalse | Truth or Bluff / אמת או בלוף | E J | choice | pp–ff | theory (`recordTrueFalse`) | ✓ | ✓ | gate only | ✓ | — | — |
| 4 | ghost | Race your ghost / מרוץ נגד הרוח | E | choice | pp–ff (social) | mixed set | ✓ | — | — | — | — | — |
| 5 | duel | Duel on this device / דו־קרב על המכשיר | E J | choice, 2 players | course level | — | **✗** | ✗ | — | — | — | — |
| 6 | daily | Daily challenge / האתגר היומי | E J | choice | 2 bands | mixed set | ✓ | — | — | — | — | — |
| 7 | rush-interval | Interval Sprint / ספרינט מרווחים | E J V | choice (ear) | pp–ff | intervals | ✓ | ✓ | unit | ✓ | — | — |
| 8 | rush-chord | Chord Rush / מרוץ אקורדים | E J K G | choice (+ strum mic on guitar) | pp–ff | chords | ✓ | ✓ | unit | ✓ | — | — |
| 9 | rush-progression | Progression Detective / בלש המהלכים | E J | choice (ear) | pp–ff | cadences | ✓ | ✓ | unit | ✓ | — | — |
| 10 | rush-note | Note Rush / מרוץ תווים | E K G B | choice (staff) | pp–ff | notes | ✓ | ✓ | unit | ✓ | — | — |
| 11 | rush-keysig | Key Signature Rush / מרוץ סימני היתק | E K | choice | pp–ff | theory | ✓ | ✓ | unit | ✓ | — | — |
| 12 | rush-scale | Scale & Mode Rush / מרוץ סולמות ומודוסים | E J V | choice (ear) | mp–ff | modes | ✓ | ✓ | bonus (E) | ✓ | — | — |
| 13 | rush-voicing | Voicing Spy / מרגל הוויסינגים | E J K G | choice (ear) | mp–ff | chords/voicing | ✓ | ✓ | bonus (J) | ✓ | — | — |
| 14 | rush-standard | Name That Standard / זהו את הסטנדרט | E J | choice (ear) | mp–ff | cadences/standards | ✓ | ✓ | bonus (J) | ✓ | — | — |
| 15 | rush-fretboard | Fretboard Sprint / ספרינט צוואר | G B | tap on neck | pp–ff | guitar/bass-tech | ✓ | ✓ | unit | — | — | — |
| 16 | highway | Rhythm Highway / כביש הקצב | E K G B D | tap · instrument (mic/MIDI) · kit | pp–ff | rhythm-reading / drum-tech | ✓ | ✓ | unit | ✓ | **✓** | — |
| 17 | melodypuzzle | Melody Puzzle / פאזל מנגינה | E K | drag tiles | pp–ff | dictation | ✓ | ✓ | unit | ✓ | — | — |
| 18 | nametune | Name That Tune / נחשו את השיר | E J V | choice | pp–ff | sequences | ✓ | ✓ | unit | ✓ | — | — |
| 19 | pitchmemory | Pitch Memory / זיכרון צליל | E V | sing/play (mic) | pp–ff | absolute | ✓ | ✓ | — | — | — | — |
| 20 | peakhunter | Peak Hunter / צייד הפיקים | E | slider | pp–ff | timbre | ✓ | ✓ | unit (production pack) | ✓ | — | — |
| 21 | reharm | Reharm Spotter / גלאי הרה־הרמוניזציה | E J | choice (ear) | mp–ff | cadences/reharm | ✓ | ✓ | bonus (J) | ✓ | — | — |
| 22 | transcribe | Transcription Race / מרוץ התמלול | E J K | on-screen keys · MIDI | mp–ff | dictation | ✓ | ✓ | bonus (E) | ✓ | — | — |
| 23 | polylock | Polyrhythm Lock / נעילת פולי־ריתם | E K D | 2 pads · keys · MIDI | mp–ff | timing/poly | ✓ | ✓ | bonus (K, D) | ✓ | — | — |
| 24 | flight | Voice Flight / מעוף קולי | V | mic · MIDI · touch | pp–ff | singing (touch = no rating) | ✓ | ✓ | unit (mic) | ✓ | — | — |
| 25 | singinterval | Sing the Interval Sprint / ספרינט מרווחים בשירה | V | mic | pp–ff | singing/intervals | ✓ | ✓ | — | ✓ | — | — |
| 26 | harmonyhold | Harmony Hold / להחזיק הרמוניה | V | mic | pp–ff | singing/harmony | ✓ | ✓ | — | ✓ | — | — |
| 27 | drills | Technique / טכניקה | K G B D | MIDI · mic · kit | (drill ladder) | instrument | via drills | ✓ | unit | ✓ | ✓ | **✓** (drills) |
| 28 | bhtime | Barry Harris in Time / בארי האריס בזמן | J K | MIDI (screen = practice) | mp–ff | piano-tech / improv | ✓ | ✓ | bonus (K) | — | — | — |
| 29 | playback | Play It Back / לנגן בחזרה | K G B | MIDI · mic | pp–ff (+ to level 9) | dictation / instrument | ✓ | ✓ | — | ✓ | — | — |
| 30 | voicingsprint | Voicing Sprint / ספרינט וויסינגים | K | MIDI · screen (practice) | pp–ff | piano-voicing / chords | ✓ | ✓ | — | — | — | — |
| 31 | riffecho | Odd-Meter Riff Echo / הד ריפים במשקל אי־זוגי | K G B | MIDI · mic · kit | mp–ff | meter / instrument | ✓ | ✓ | bonus (G, B) | — | — | — |
| 32 | tuneup | Tune-up / כיוון | G B | drag peg | pp–ff | pitch | ✓ | ✓ | — | ✓ | — | — |
| 33 | changerace | Chord Change Race / מרוץ החלפות אקורדים | G | mic (strum) | pp–ff | guitar-tech | ✓ | ✓ | — | — | — | — |
| 34 | rootsear | Roots by Ear / שורשים מהאוזן | G B | mic · MIDI | pp–ff | cadences/roots | ✓ | ✓ | — | ✓ | — | — |
| 35 | walkchanges | Walk the Changes / ללכת על המהלך | B | mic · MIDI | pp–ff | bass-tech / walking | ✓ | ✓ | — | — | — | — |
| 36 | groove | Groove trainer / מאמן גרוב | D | tap · MIDI | pp–ff (level-test tab) | timing | ✓ (level test) | ✓ | — | ✓ | — | — |
| 37 | land | Land It / לנחות על 1 | D | kit MIDI · pad mic | pp–ff | drum-tech | ✓ | ✓ | unit | — | — | — |
| 38 | groove-echo | Groove Echo / הד לגרוב | D | kit | pp–ff | drum-tech + dictation | ✓ | ✓ | unit | — | — | — |
| 39 | odd-echo | Odd-meter Echo / הד במשקל מוזר | D | kit | pp–ff | drum-tech + meter | ✓ | ✓ | unit | — | — | — |
| 40 | time-lock | Time Lock / נעילת זמן | D | kit · pad | pp–ff | drum-tech + gap | ✓ | ✓ | unit | — | — | — |
| 41 | ghost-control | Ghost Control / שליטה ברפאים | D | kit | pp–ff | drum-tech | ✓ | ✓ | unit | — | — | — |
| 42 | rudiment-rush | Rudiment Rush / מרוץ רודימנטים | D | kit · 2 zones | pp–ff | drum-tech | ✓ | ✓ | unit | — | — | — |
| 43 | groove-off | Groove-off / קרב גרובים | D | kit (duel by code) | drum level | drum-tech | ✓ | ✓ | — | — | — | — |
| 44 | kitread | Kit Read Rush / מרוץ קריאת תופים | D | choice (ear → notation) | pp–ff | rhythm-reading/drums | ✓ | ✓ | — | ✓ | — | — |
| 45 | namegroove | Name That Groove / זהו את הגרוב | D | choice (ear) | pp–ff | rhythm/style | ✓ | ✓ | — | ✓ | — | — |

Every tiered game also feeds the weekly game board, friend scores per tier and "beat my score" (`noteGameBest`), as well as the tier quests (`quests.ts`). The duel feeds none of this.

**Connection gaps in one place:**
- **Never on the path (13 games):**
  - all nine 0.76 games: playback, voicingsprint, changerace, walkchanges, rootsear, harmonyhold, singinterval, kitread, namegroove;
  - also tuneup, pitchmemory, groove and groove-off.
  - The voice course's path has only Voice Flight as a game. The bass course has only Fretboard Sprint, Riff Echo (bonus) and drills.
- **Workout:** only Highway and Technique.
- **Key mastery:** no game feeds it. The key-relative take games (bhtime, voicingsprint, walkchanges, changerace, rootsear, playback) are measured MIDI or mic takes with a known key, so they could write key cells the way drill takes do.
- **Duel:** gives nothing (XP, rating, tier or board).

---

## 2. Per-game evaluation

**Criteria:**
- (a) v2 design language
- (b) contrast
- (c) one screen during play
- (d) Hebrew/English parity
- (e) RTL
- (f) fun and game-like
- (g) bugs
- (h) connections
- (i) all 12 keys
- (j) InputCheck strip

Only findings are listed; criteria with no finding are fine. The overflow numbers are pixels of page scroll at 320×720, for setup / play / end (appendix A).

**Shared to all Rush modes** (`Rush.tsx`, `rush.css`). This is the best family in the app:
- clean v2 cards, the ring timer, hard shadows, Secular One numbers;
- one screen in every stage, a strong result card (score, right/wrong, best combo, level reached, "new personal best");
- tiers, combos and lives (breath marks).

Shared issues:
- The big score on the result card is a dark mustard (`--gold`), not ink or purple. It reads, but it is off-palette.
- "Play again" means "replay the sound" during play and "new run" on the result. In Hebrew these are different words (להשמיע שוב / לשחק שוב), but in English they are the same.
- The data rows in `RUSH_MODES` still carry emoji `icon` fields (`🎹 🎸 🔍`). They are not rendered; delete them.

### 2.1 Ear, theory and social

**1. melody — Echo Chain — FIX**
Shots: `melody-*`.
- (a/b):
  - "Your turn!" is mint `rgb(75,227,181)` on paper, at **1.53:1** contrast. It is green, and close to invisible.
  - `header.lesson-top` uses a gradient.
- (c): the setup overflows by 61 px (en and he), and play by 34–37 px.
- (d): "MIDI" is not isolated in Hebrew.
- (j): the sing and MIDI inputs have **no InputCheck**.
- (f): good. It is a growing chain with a clear goal and multiplayer.

Fixes:
- make the turn banner ink on a lemon "now" chip;
- remove the header gradient;
- fold "Speed up" into the tier and move players into a sheet, so it fits one screen;
- add `<InputCheck mode="mic" | "midi">` to the setup.

**2. rhythm — Beat Echo — FIX**
Shots: `rhythm-*`.
- (a):
  - The pads are mustard/olive with **radial gradients and a blurred highlight** (`games.css:462-467` `.drum-face`, `.tap-pad.drum-pad`).
  - The end screen's "Longest chain 0 beats" is in mustard and purple display type at a huge size.
- (c): the setup overflows by **303 px** in English and 236 in Hebrew. It holds input, calibration, tier, tempo, players and the toggle.
- (j): no InputCheck on "Knocking (mic)".
- (h): it is in the drums course list, where Groove Echo does the same job measured on the kit (see §5).

Fixes:
- flat pink rhythm-domain pads with an ink outline;
- the setup in two rows plus a "More" sheet;
- InputCheck for knock mode;
- in drums, show Groove Echo instead.

**3. truefalse — Truth or Bluff — FIX**
Shots: `truefalse-*`.
- (c): the setup overflows by **246–267 px** in English and 120–167 in Hebrew (two runs). There are 12 topic chips, the tier and the players.
- (a):
  - The timer bar is a teal→yellow **gradient**.
  - Selected topic chips are lemon text on ink; lemon is used as "selected", not "now".
- (f): good, quick and clear.
- (g): the Hebrew end card read "2 / שיא חדש" with no "Best" label, while English shows "Best: 0".

Fixes:
- a flat timer bar, with lemon only for the last 10 s;
- topics behind a "Topics (12)" chip that opens a sheet;
- ink-on-lilac selected chips.

**4. ghost — Race your ghost — FIX**
Shots: `ghost-*`.
- (c): the setup overflows by 164 px in English and 100 in Hebrew.
- (a): the progress bar is a gradient (teal→yellow). The other screens are clean.
- (f): good concept. The ghost is only implied, though: play shows "1/5" and no ghost marker.

Fixes:
- show the ghost as a second marker on the progress bar (ahead or behind);
- a compact setup.

**5. duel — Duel on this device — RETHINK**
Shots: `duel-*`.
- (a): the player dots and the top half's border are **mint green** `rgb(75,227,181)`.
- (c): the setup overflows by 202 px in English and 104 in Hebrew.
- (h): **it records nothing**: no XP, rating, tier or board (the `DuelScreen` route has no `onProgress`).
- (e): the top half is rotated 180° for the second player, which is fine. The question line in the middle is grey and small, and repeats what the halves say.

Rethink: make it the "pass-and-play" mode of Truth or Bluff and the ghost sets. Give both named players XP if they are signed-in friends, or at least give the device owner XP and tier credit. Use teal and pink (domain colours) instead of mint for the two players.

**6. daily — Daily challenge — FIX**
Shots: `daily-*`.
- (a):
  - The date "2026-11-15" is in mustard.
  - The bands are labelled "soft · pp–p" and "mid · mp–mf", which mixes words and dynamics.
  - There is a progress-bar gradient.
- (b): the unselected band button is at 2.75:1.
- (d): Hebrew "שקט · pp–p" is fine.
- (f): no Toni or celebration hook, and the result is a plain list.

Fixes:
- a flat bar;
- an ink date;
- a single "today's 5" card;
- share text plus a streak of daily plays.

**7. rush-interval — Interval Sprint — GOOD**
Shots: `rush-interval-*`.
- It has tiers up to jazz names and compound intervals, and plays in 12 keys (random roots).
- The only finding is the shared one (the mustard score).

**8. rush-chord — Chord Rush — GOOD**
Shots: `rush-chord-*`.
- (j): the guitar "played" mode, where you strum and the mic decides, has no InputCheck. Add it to that mode only.
- Otherwise exemplary: chords on keys, staff or neck; tiers up to UST and quartal.

**9. rush-progression — Progression Detective — FIX**
Shots: `rush-progression-*`.
- (c/a): the answer chips wrap **inside a progression**: "I – IV – I –" / "IV". At 320 px, use one line per chip with `white-space: nowrap` and a smaller font, or stack the 4 chips in a single column.
- (d/e): the Roman numerals are not `<bdi>` in Hebrew.
- (b): the breath marks (lives) are at 2.35:1.

**10. rush-note — Note Rush — GOOD**
Shots: `rush-note-*`.
- The English play shot caught an empty staff (a rounded bar) for about 3 s after Start, while Hebrew rendered the note. Check whether the first item's staff waits on the VexFlow import. If so, preload it on the setup screen.

**11. rush-keysig — Key Signature Rush — GOOD**
Shots: `rush-keysig-*`.
- A stray quarter note sits after the signature. It can be read as a melody note; drop it, or explain it as the tonic.

**12. rush-scale — Scale & Mode Rush — GOOD.**
Shots: `rush-scale-*`.

**13. rush-voicing — Voicing Spy — GOOD**
Shots: `rush-voicing-*`.
- At mp the question is three lines long ("Are the chord notes packed together (close) or spread out (open)?"). Use "Close or open?", per the compact-questions rule.

**14. rush-standard — Name That Standard — FIX**
Shots: `rush-standard-*`.
- (d): in Hebrew the answers are **English**: "Jazz blues", "Minor blues", "Rhythm changes", "Bird blues (Blues for Alice changes)", "Autumn Leaves". The genre labels need Hebrew (בלוז ג׳אז, בלוז מינורי, ריתם צ׳יינג׳ס). Tune titles go in `<bdi>`.
- (c): "Bird blues (Blues for Alice changes)" takes 3 lines on a chip. Shorten it to "Bird blues".

**15. rush-fretboard — Fretboard Sprint — GOOD**
Shots: `rush-fretboard-*`.
- The dark neck is fine (instrument art).

**16. highway — Rhythm Highway — FIX**
Shots: `highway-*`, `highway-drums-*`.
- (a):
  - Notes glow (`v2.css:1522`, `games3.css:157-185`).
  - The hit line is a white double line.
  - "Perfect" flashes in lemon.
  - The tap-delay warning is mustard text.
- (c): the English setup overflows by 78 px at 320, in both the ear and the drums course; Hebrew fits. `div.hw-hitline` is drawn with a gradient.
- (f):
  - The road is a flat purple block, and the first second shows no gems.
  - The end card repeats the title: "Accuracy" over "Accuracy 0%".
- (g): a sim run gave 16 misses and 0 hits. That is expected, since nothing tapped.
- It is the only game in the workout.

Fixes: the COURSE-FEEDBACK-UI slice 6:
- a lemon hit line;
- per-gem marks instead of text;
- no glow;
- a kick bar;
- remove the duplicate result title.

**17. melodypuzzle — Melody Puzzle — FIX**
Shots: `melodypuzzle-*`.
- (b): the disabled "✓ Check" is **pale yellow with white text**. That is yellow on white, about 1.3:1.
- (f): good puzzle. "One or two tiles are not in the melody" is a nice decoy rule.
- (i): random tonic, 12 keys.

Fix: a disabled state that is lilac with ink at 60 %, never pale lemon.

**18. nametune — Name That Tune — FIX**
Shots: `nametune-*`.
- (a): "Score 0" is mustard in the header.
- (c): the Hebrew title wraps to two lines (נחשו את / השיר) next to the score. Move the score into the stats row.
- (f): good feedback (teal right, pink wrong, then the answer). The song list is short at pp (4 nursery tunes).
- (d): "Yonatan HaKatan (Hänschen klein)" is fine in English. Hebrew uses Hebrew titles.

**19. pitchmemory — Pitch Memory — RETHINK**
Shots: `pitchmemory-*`.
- (f): once a day, one note. It is a ritual, not a game: the tier makes little sense (pp = "within 100 cents"), and "1 days" is a plural bug.
- (c): the setup overflows (the 30-day card sits below).
- (j): it is mic-based and has no InputCheck.

Rethink: move it to Today as a daily "absolute-pitch check" card with a trend line. Remove it from the games list, or keep the tier as a cents window only.

**20. peakhunter — Peak Hunter — FIX**
Shots: `peakhunter-*`.
- (a): the slider track is a sky→mint→gold **gradient** (`peak.css:81,87`).
- (c/g): "B · boos ted" breaks mid-word at 320. The axis labels "100 200" collide ("100200").
- (f): good, with a clear goal.

Fixes:
- a flat track;
- `hyphens: none`, with "B" and "boosted" on separate lines;
- thin out the axis labels at narrow width.

**21. reharm — Reharm Spotter — FIX**
Shots: `reharm-*`.
- (d): the Hebrew header wraps to two lines (גלאי הרה־ / הרמוניזציה). The substitution chips in Hebrew read "ii במקום IV" with unisolated numerals.
- (f): good two-step answer (bar, then name). "Both again" wraps.
- (i): 12 keys.

Fixes: a shorter Hebrew title (e.g. גלאי ההרמוניה), `<bdi>` on the numerals, and "Again" for the replay.

**22. transcribe — Transcription Race — FIX**
Shots: `transcribe-*`.
- (c/g): the three action buttons break words at 320: **"Re / pla / y", "Un / do", "Submi / t"**, and in Hebrew "ביטו / ל".
- (j): no InputCheck for MIDI.
- (i): only 7 keys (`transcribeRace.ts:79`: C D E♭ F G A B♭).

Fixes:
- icon buttons (↻, undo arrow) with the words as aria-labels, and a full-width Submit;
- InputCheck;
- all 12 keys.

**23. polylock — Polyrhythm Lock — FIX**
Shots: `polylock-*`.
- (a): the pads are pink and teal outlines. Fine.
- (f): clear. "Accuracy 0%" shows during play before any tap. Show "–" until the first hit.
- (j): no InputCheck for MIDI.

### 2.2 Voice

**24. flight — Voice Flight — GOOD**
Shots: `flight-*`.
- (a): the purple sky with lemon gates is acceptable: the gate is the "now" target.
- (j): add InputCheck. It is the voice course's main game and runs on mic or MIDI.
- One screen in every stage. Fun.

**25. singinterval — Sing the Interval Sprint — FIX**
Shots: `singinterval-*`.
- (f): the **result card is minimal**: "Results / Right: 0 · Missed: 1", with no score, tier progress or best. Compare it with Rush's card.
- (c): the English title takes 3 lines in play ("Sing the / Interval / Sprint"). Rename it "Interval Sing" / "ספרינט שירה".
- (j): no InputCheck (mic).
- (i): random keys inside the singer's range. Fine.

**26. harmonyhold — Harmony Hold — FIX**
Shots: `harmonyhold-*`.
- (j): no InputCheck (mic).
- (i): 8 keys (`harmonyHold.ts:82`), with no D♭, E, F♯ or B. Since it is sung, range matters more than key; still, widen it to 12 within the range.
- (f): a clear goal per take. The cents bar is good.

### 2.3 Keys, guitar, bass

**27. drills — Technique — RETIRE (from the games list)**
Shots: `drills-*`.
- It is the Technique row, not a game, and it already has its own tile on the Practice page.
- (c/g) at 320:
  - The instrument tabs break into letters ("Pi / a / no", "G / ui / tar").
  - The take result overflows.
  - "CV R — L —" is jargon.
- These are drill-screen bugs, tracked by COURSE-FEEDBACK-UI. They are listed here because the card leads there.

**28. bhtime — Barry Harris in Time — FIX**
Shots: `bhtime-*`.
- (j): no InputCheck (MIDI).
- (f):
  - At mp the chart is one chord for 4 bars (Gmaj7 ×4, A♭6 ×4), which is dull.
  - The result says "Practice run — on-screen keys do not clear a level", good.
  - It needs a target per beat (chord tone on the beat lights teal) during the take.
- (i): 12 keys (random).
- (h):
  - No key mastery, though it is the purest key-relative jazz take.
  - It is in the path only as a keys bonus. The jazz course lists it in its games but has no path step for it.

**29. playback — Play It Back — FIX**
Shots: `playback-*`.
- (j):
  - InputCheck is present (TakeShell), **but the MIDI strip is truncated at 320**: "No … Plug in your MIDI device, or swi…".
  - The same truncation shows in riffecho and the others.
- (f): good, with a 9-level ladder up to bebop.
- (i): 12 keys (`PB_KEYS`).
- (h): **not on the path**, even though it is the strongest ear-to-instrument game.

**30. voicingsprint — Voicing Sprint — FIX**
Shots: `voicingsprint-*`.
- (f): the result is a bare "Results / Right 0 / 0 / 0".
- (j): no InputCheck (MIDI).
- (i): 12 roots.
- (h): not on the path. No key mastery.

**31. riffecho — Odd-Meter Riff Echo — FIX**
Shots: `riffecho-*`.
- (f): the tier mp is "6/8 and 3/4 riffs", so the first playable level of an "odd-meter" game is not odd. Either rename it "Riff Echo" or start at 5/8.
- (i): only 3–4 roots (`riffEcho.ts:62`).
- (j): truncated MIDI strip (see playback).

**32. tuneup — Tune-up — FIX**
Shots: `tuneup-*`.
- (a):
  - The "wobble" indicator is a lemon pill, so lemon is used as a meter.
  - The score "0" floats in mustard top right.
  - The slider track is teal and black.
- (b): "✓ In tune" is a pale button.
- (f): a nice ear task.
- (h): not on the path, although guitar and bass have tuning units.

**33. changerace — Chord Change Race — FIX**
Shots: `changerace-*`.
- (j): ✓ InputCheck (mic), and it fits.
- (f): the take is 4 chords. There is no sense of speed: the AUDIT-6 "one-minute changes" format would make it a real race.
- (i): levels 1–2 are open chords (fine). Level 4+ uses the 9-key pool `instGames.ts:57` `KEYS = [0,5,7,2,10,3,9,4,8]`, with **no D♭, F♯/G♭ or B**.
- (h): not on the path.

**34. rootsear — Roots by Ear — FIX**
Shots: `rootsear-*`.
- (d): in Hebrew the revealed roots show letters "C / C". With Hebrew naming, the top line should be דו.
- (i): `KEYS` again (9 keys).
- (h): not on the path. Bass has few games there.

**35. walkchanges — Walk the Changes — FIX**
Shots: `walkchanges-*`.
- (i):
  - Levels 1–2 are a blues in only F, B♭, G or C.
  - Level 3 uses the 9-key pool.
  - **Levels 4–5 are rhythm changes in B♭ only** (`instGames.ts:355,360`).
- (f): a clear rule per beat. The beat cells are good.
- (h): not on the path. This is the bass course's flagship game.

### 2.4 Drums

Shared, from `DrumGame.tsx` / `DrillTake`:
- (b) **pale-yellow kit notice plus a pale-yellow disabled Play button with grey text.** This is the yellow-on-white the contrast rule forbids. It appears on land, groove-echo, odd-echo, time-lock, ghost-control, rudiment-rush and groove-off. Use a lilac notice with ink text, and a disabled button that is outline only.
- (a) the Start button is **purple** on drum games but lemon on every other game. Pick one; v2 says the lemon main button.
- (a) no glyphs: `GAME_GLYPH` has no entries for land, groove-echo, odd-echo, time-lock or ghost-control, so their cards fall back to `contour`. That breaks the rule that every step has its own glyph.
- (j) ✓ InputCheck is wired through DrillTake (`checkMode`, `DrillTake.tsx:480`). It shows only once a kit is linked. In the screenshots (no kit) the kit-needed notice takes its place.

**36. groove — Groove trainer — RETHINK**
Shots: `groove-*`.
- (a): old-style pale chips. The tap circle is faint grey on paper (Tap at about 2:1). There is no tier row on the screen, though `GAME_TIERS.groove` exists.
- (f): it is a tool (fading click, pocket, swing dial) with a level-test tab.
- (j): no InputCheck (MIDI / tap).

Rethink: keep the tool in Tools. Turn the level-test tab into the drums game **Time Lock** (which already exists), or retire the card from the games list.

**37. land — Land It — FIX**
- The shared drum fixes.
- (f): the fill is shown, but the "land on 1" moment needs a marker on bar 2's downbeat, using the lemon now-cue.

**38. groove-echo — Groove Echo — FIX** (shared drum fixes).

**39. odd-echo — Odd-meter Echo — RETIRE (merge into Groove Echo as its f/ff tiers)**
- It is the same mechanic and screen, with 7/8 and 9/8 grooves.

**40. time-lock — Time Lock — FIX**
- (f): **the silent bars are not marked on the staff**; every bar looks the same. The core of the game (the gap) is invisible. Grey out or hatch the silent bars and show "click off" over them.
- The pink message "Nothing measured in the silent bars" is low contrast.

**41. ghost-control — Ghost Control — FIX** (shared drum fixes). The accent / normal / ghost bands need a 3-row velocity meter during play.

**42. rudiment-rush — Rudiment Rush — FIX**
- (h/content): 17 rudiments, and **no flams or drags**. The drills already have flam tap, flamacue, pataflafla and drags (`engine/drills/drum*.ts`). Add them to `RUSH_TIERS` mf–ff.
- The shared drum fixes.

**43. groove-off — Groove-off — FIX**
- The shared drum fixes.
- The code entry field at 320 is cramped.
- (h): not on the path, which is fine for a duel.

**44. kitread — Kit Read Rush — FIX**
Shots: `kitread-*`.
- (f): the result is bare ("Results / Right 2 / Accuracy 67 % · Score 20"), with no tier progress or best.
- (a): the disabled "Listen again" is grey on paper (low contrast).
- (h): not on the path, though drum reading has topic steps.

**45. namegroove — Name That Groove — FIX**
Shots: `namegroove-*`.
- (c): three options sit in two columns with a hole. Use one column at pp (3 options).
- (d): "Pop (16th hats)" in Hebrew is "פופ (היי־הט בשש־עשריות)", which takes 3 lines. Shorten it.
- (h): not on the path.

### 2.5 Verdict count

| Verdict | n | Games |
|---|---|---|
| GOOD | 8 | rush-interval, rush-chord, rush-note, rush-keysig, rush-scale, rush-voicing, rush-fretboard, flight (each with a one-line note) |
| FIX | 32 | melody, rhythm, truefalse, ghost, daily, rush-progression, rush-standard, highway, melodypuzzle, nametune, peakhunter, reharm, transcribe, polylock, singinterval, harmonyhold, bhtime, playback, voicingsprint, riffecho, tuneup, changerace, rootsear, walkchanges, land, groove-echo, time-lock, ghost-control, rudiment-rush, groove-off, kitread, namegroove |
| RETHINK | 3 | duel, pitchmemory, groove |
| RETIRE / merge | 2 | drills (out of the games list), odd-echo (into Groove Echo) |

**Total: 8 GOOD, 32 FIX, 3 RETHINK, 2 RETIRE = 45.**

---

## 3. Prioritized fix list (existing games)

Effort: S < ½ day, M 1–2 days, L more.

| # | Fix | Games | Effort |
|---|---|---|---|
| 1 | **Yellow on white:** replace the pale-yellow kit notice and the pale-yellow disabled Play (drum games). Replace the pale-lemon disabled "Check" (Melody Puzzle) and the lemon wobble pill (Tune-up) with lilac and ink states. | 7 drum games, melodypuzzle, tuneup | S |
| 2 | **Green, gradients and glow out of the game screens:** the Echo "Your turn!" mint at 1.53:1; `lesson-top` gradient; Beat Echo `.drum-face` / `.tap-pad.drum-pad` radial gradients; the timer bars in Truth or Bluff, ghost and daily (`tournament.css:63`, games); the Peak Hunter track (`peak.css:81,87`); the duel's mint players (`tournament.css`); Highway glow (`games3.css:157-185`, `v2.css:1522`); `rush.css:335` text-shadow. | melody, rhythm, truefalse, ghost, daily, duel, peakhunter, highway | M |
| 3 | **InputCheck everywhere a game hears or reads MIDI:** Flight, Echo Chain (sing / MIDI), Beat Echo (knock), Chord Rush (strum mode), Transcription Race, BH in Time, Poly Lock, Voicing Sprint, Harmony Hold, Sing Interval, Pitch Memory, Groove trainer. Also **fix the truncated MIDI strip at 320** ("No … Plug in your MIDI device, or swi…") seen in TakeShell games and Riff Echo. | 12 + TakeShell games | M |
| 4 | **One screen at 320:** setups overflow in Beat Echo (303 / 236), Truth or Bluff (267 / 120), duel (202 / 104), ghost (164 / 97), Highway in English (78), Pitch Memory (78 / 37) and Echo Chain (67 / 28, and 34–37 in play). Put topics, players and extras into a "More" sheet. | 6 | M |
| 5 | **Broken words at 320:** Transcription Race buttons; Peak Hunter "boos ted"; Progression Detective chips; Technique instrument tabs; Name That Standard and Name That Groove 3-line chips. | 6 | S |
| 6 | **Hebrew parity:** Name That Standard answers in English; Roman numerals and tune names without `<bdi>` (Progression Detective, Reharm, Standard); the first-launch **awards toast in English on a Hebrew screen, with "1 awards"** (`App.tsx:913`, seen after the first game in every Hebrew run); Roots by Ear letter names under Hebrew naming; "1 days" (Pitch Memory). | 6 | S |
| 7 | **Connect the unconnected:** put playback, rootsear, walkchanges, changerace, voicingsprint, harmonyhold, singinterval, kitread, namegroove (and tuneup) into `GAME_STEPS` / `AREA_GAMES` or `BONUS_GAMES` for their course. Add one rotating game to `workout2` besides Highway. Make bhtime, voicingsprint, walkchanges, changerace, rootsear and playback write key-mastery cells. Give the duel XP and tier credit. | 15 | M |
| 8 | **All 12 keys:** `instGames.ts` `KEYS` has 9 keys (no D♭, F♯, B): Roots by Ear, Walk the Changes lv3, Chord Change Race lv4+. Walk lv1–2 has 4 keys and lv4–5 is B♭ only. Transcription Race has 7 keys. Harmony Hold has 8. Riff Echo has 3–4 roots. | 6 | S |
| 9 | **A real result card for the bare ones:** Sing Interval, Voicing Sprint and Kit Read show "Results / Right n". Reuse Rush's card: score, right / wrong, best, tier progress, "new best", Again / Back. | 3 | S |
| 10 | **Highway game feel** (COURSE-FEEDBACK-UI slice 6): a lemon hit line, per-gem marks, no "Perfect" text in lemon, a kick bar, no duplicate "Accuracy" title. Also **Time Lock: mark the silent bars**, and **Land It: mark the landing 1**. | 3 | M |
| 11 | **Glyphs and dead data:** add `GAME_GLYPH` for land, groove-echo, odd-echo, time-lock and ghost-control. Delete the unused emoji `icon` fields in `GAMES2`, `GAME_CATS` and `RUSH_MODES`. Show one "new" chip, not two, on each card. | all cards | S |
| 12 | **Palette leftovers:** the mustard big numbers and headers (`--gold`) on Rush, Echo, Highway, Name That Tune and Tune-up become ink or purple. Make the drum games' Start lemon like the rest. | ~15 | S |
| 13 | **Rudiment Rush content:** add the flam and drag rudiments (they already exist as drills). | 1 | S |
| 14 | **Small copy:** Voicing Spy question to "Close or open?"; English replay "Play again" → "Hear again"; Riff Echo mp tier label; Sing Interval title length. | 4 | S |

---

## 4. New games: content gaps and a consolidated list

### 4.1 What the new content has and which game covers it

| Content area (where) | Existing game cover | Gap |
|---|---|---|
| **Barry Harris** (`barry.ts`, `harrisLines.ts`, `pivotArp.ts`, `topicsHarris2.ts`, `bhInTime.ts`; METHOD Part E/F) | bhtime (lines in time), rush-voicing (partly) | 5-4-3-2, the rules as a puzzle, family/brothers by ear, Elevator / scale of chords, 6 or °, substitution on V, Jazz Roulette, "how many homes for this note" |
| **Reharm and colour** (`commonTone.ts`, `topicsReharmColor.ts`, REHARM-AND-COLOR Part C) | reharm (spot the bar) | common tone (Hold the Note), mediants (Third Jump), modal interchange (Dark Side), functional vs colour sorter |
| **Siskind solo piano** (`soloPiano.ts`, `topicsSoloPiano.ts`, k-lh / k-tex / k-comp) | none | LH register, stride stamina, comping-rhythm caller, texture switch |
| **Bebop vocabulary** (`bebopVocab.ts`, k-vocab / g-bebop / b-bebop) | transcribe and playback (lv 7–9) only by ear | approach and enclosure into chord tones on the beat; guide-tone lines; pivot timing |
| **Key moves** (`keyMoves.ts`, `topicsKeyMoves.ts`) | none | "how did it modulate" as a game, and playing the move |
| **Voice agility** (`voiceFamilies.ts` v-agility, RUN / AGILITY levels) | none (Flight is pitch only) | runs echoed at rising speed; semitone elevator |
| **Drum rudiments** (drills plus `rudimentRush.ts`) | rudiment-rush (no flams or drags) | rudiment × accent × subdivision variety; grade ladder |
| **Ear training** (AUDIT-5/6 ear) | Rush modes, melodypuzzle, nametune, reharm | grid dictation as a game, degrees and function, form position, sequences, aug6/N, swing feel |
| **Path beginnings** (AUDIT-6 Stage B: k-first, g / b / d first steps, rhythm-echo, intervals-down) | highway, rush-note, rhythm | a beginner game per instrument: grand-staff runner, one-minute changes, root rescue, rebound ball |

### 4.2 The ranked list (22, de-duplicated)

**Shared rules for every new game:**
- 6 tiers (pp–ff, or mp–ff for advanced);
- every key-relative item in all 12 keys (cycle of 4ths, random start);
- rubato before tempo for performed items;
- count-in, click and now-cue;
- InputCheck on mic and MIDI;
- a Rush-style result card;
- `gameEvents` tags, `GAME_TIERS` and a `GAME_STEPS` or `BONUS_GAMES` slot;
- its own glyph.

**Column key:**
- **P:** P1 = build next, P2 = after, P3 = later.
- **Effort:** S / M / L.

| Rank | Name | Course(s) | Based on (source) | Mechanic | Input | Tiers (pp → ff) | Measures | Effort | P |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Guide-Tone Runner** | Jazz, Keys, Guitar, Bass | guide tones `jazz-1` / `guide-line`; BH "seven down to the 3rd" E16 (METHOD Part E); AUDIT-5 jazz §4 | streak | MIDI · mic | ii–V–I in one key → cycle of 4ths → minor ii–V → blues → rhythm changes → any standard's changes, faster | 3rd / 7th on each change, in time; one wrong note ends the run | M | P1 |
| 2 | **5-4-3-2 Call** | Keys, Guitar, Bass, Jazz | BH E12, Parks P02 (METHOD E12, F6 #6) | call and response | MIDI · mic | major → dominant → minor → mixed numbers → called on the chord of a moving ii–V → in time with the band | the right phrase from the called degree, in key and in time | S–M | P1 |
| 3 | **Enclosure Target** | Keys, Guitar, Bass, Jazz | `bebopVocab.ts` approaches and enclosures; AUDIT-5 "On the Beat" | accuracy streak | MIDI · mic | ½-step below into the root → above and below → scale + chromatic → 4-note bebop enclosure → delayed resolution → through ii–V–I | the target chord tone lands on the beat; the enclosure shape is right | M | P1 |
| 4 | **Changes Crossword** | Ear, Jazz | `grid-dictation` (AUDIT-5 ear §4 #1; COURSE-FEEDBACK-UI calls its partial credit the best in the app) | puzzle (partial credit) | choice grid | I / IV / V in 4 bars → ii–V → secondary dominants → borrowed → tritone subs → a standard's A section | root / quality / bass per bar; letters lock separately | M | P1 |
| 5 | **Hold the Note** | Jazz, Ear (+ Keys play mode) | REHARM C.1 `ct-degree`, `k-ctone`; AUDIT-5 jazz "Hold the Note" | speed choice; play mode = puzzle | choice → MIDI | triads that hold F → 7th chords → its degree → tensions → a 4-bar chain → "8 ways, no repeats" (played) | which chords keep the note, and what degree it is; speed | M | P1 |
| 6 | **Border Control** | Ear, Jazz | `topicsKeyMoves.ts` `modulation-means`, `key-centres`; AUDIT-5 ear #2 | accuracy (two stamps) | choice | pivot or direct → + ii–V → + common dim → + tritone sub → means + new key → a tune's key centres | the means and the destination key | S (topics exist) | P1 |
| 7 | **Which Brother?** | Jazz, Keys | BH family of dominants E17–E19, `bh-family`, `k-ctx` brothers; AUDIT-5 "Family Reunion" | ear duel → call and response | choice, then MIDI | which dominant resolves (V or the tritone brother) → all 4 brothers → the dim move → play the brother that lands a ½ step into I | the family relation by ear and on the keys, in 12 keys | M | P1 |
| 8 | **Run Catcher** | Voice | v-agility, RUN / AGILITY levels (`voiceFamilies.ts:175`); AUDIT-5 voice | call and response, speed ladder | mic | 3-note turn → 5-note run → pentatonic run → R&B melisma → bebop line → at 120 % | pitch accuracy per note, plus the clean-catch tempo | M | P1 |
| 9 | **Comp Caller** | Keys, Guitar, Jazz | Siskind C3 comping vocabulary; AUDIT-5 jazz "Comp Caller"; `comp-rhythm-ear` | call and response | MIDI · mic | Charleston ↔ reverse → + Beat-3 → Basie / push-off / lead-in → Red Garland → two-bar patterns → called one bar ahead at ♩160 | the right rhythm on the right chord, switched on the bar | M | P2 |
| 10 | **Elevator** | Keys, Guitar | Echols Elevator F1.2 / E21 (METHOD F6 #1) | puzzle, then play | drag → MIDI | floors 1–3 in C6-dim → contrary between floors → Cm6-dim → reach floor N on the melody note → borrowing 1–3 voices → in 12 keys | the voice leading reached, then played clean | M | P2 |
| 11 | **Dark Side** | Ear, Jazz | REHARM C.3 modal interchange; AUDIT-5 jazz | tap the moment + name | tap + choice | iv in a pop loop → ♭VI / ♭VII → minor plagal set → iiø–V–I in major → Tadd / Lady Bird → borrowing in minor | the borrowed chord's place and name | S | P2 |
| 12 | **Degree Darts** | Ear (beginnings → advanced) | `degrees-ext`, `ct-degree`; AUDIT-5 ear | speed | choice (dartboard) | 1–3–5 over I–V → 1–7 → ♭3 / ♭7 → in minor → chromatic degrees → over moving changes | scale degree in context; speed | S | P2 |
| 13 | **Stride Survival** | Keys | Siskind C1/C2 LH ladder (k-lh, k-tex) "Stride Survival" + "Register Ladder" | survival (tempo +4 every clean 4 bars, lives) | MIDI | roots on 1 / 3 → shells → shell stride → 10ths → full stride → stride under the head | LH in time and in register, clean bars before a miss | M | P2 |
| 14 | **Third Jump** | Keys, Jazz | REHARM C.2 mediants | speed; play mode = streak | choice → MIDI | which mediant (common tone shown) → up or down, M3 or m3 → the "film" move → Coltrane cycle → P / L / R | the right mediant with the common tone held | M | P2 |
| 15 | **Sub on V** | Jazz, Keys | BH F1.4 substitution menu (METHOD F6 #8); `reharm` | ear choice → play | choice → MIDI | itself or tritone → + family → + important minor → + tritone's minor → over a tune's every V | which substitute was played, then play your own choice | S–M | P2 |
| 16 | **Rudiment Slot** | Drums | AUDIT-5 drums "Rudiment Slot Machine"; the 40 PAS rudiments in the drills | streak (3 reels) | kit | rudiment from a grade pool × accent pattern × subdivision; the tempo steps after each win; flams and drags from mf | 4 clean bars per spin; top tempo | M | P2 |
| 17 | **Grand-Staff Runner** | Keys (path beginnings) | AUDIT-6 keys §1.6; `k-first` | scroll and play | MIDI · on-screen keys | C position, treble → bass → both → G / F → 2 sharps / flats → intervals | note reading at a set speed | M | P2 |
| 18 | **One-Minute Changes** | Guitar (beginnings) | AUDIT-6 guitar §2.6 "Chord-Change Sprint"; replaces changerace pp–p | speed | mic (strum) | E–A → D–A → G–C → C–Am–F–G → barre pairs → 7th chords | clean changes per minute | S (strum recogniser exists) | P2 |
| 19 | **Root Rescue** | Bass (beginnings) | AUDIT-6 bass §3.6 | catch on beat 1 | mic · MIDI | I–IV–V in E / A → + vi → 12-bar blues → minor → ii–V → a chart in 12 keys | the root on beat 1, in time | S (Roots by Ear engine) | P2 |
| 20 | **Rebound Ball** | Drums (beginnings) | AUDIT-6 drums §4.6 | evenness meter | kit · pad | quarters one hand → 8ths alternating → accents → doubles → 16ths → dynamics swell | velocity and spacing evenness | S | P3 |
| 21 | **Six or Dim** | Keys, Jazz | BH E30 harmonise a melody in 6-dim (METHOD E30) | puzzle → play | choice → MIDI | a scale melody in C → a tune phrase → minor 6-dim → dominant 7-dim → with borrowing → your own melody | the right chord (6 or °) under each note | M | P3 |
| 22 | **Swing-o-meter** | Jazz, Drums | AUDIT-6 jazz §2.5; AUDIT-5 swing-ratio | dial plus play | slider → tap | straight or swung → 3 ratios → 4 → lay back / push → play at the shown ratio → follow a ratio change | swing ratio by ear, then in your taps | S | P3 |

**Merged into the list above:**
- AUDIT-5 "Interval Ladder", "Echo Canyon", "Echo Drummer", "Voicing Snap" and "Bar 9 Blitz" are covered by existing games (Interval Sprint, Sing Interval, Beat Echo / rhythm-echo, Voicing Spy, Name That Standard). Add them as tiers there, not as new games.
- "Family Reunion" became Which Brother?.
- "Register Ladder" became Stride Survival.
- "Pivot Pinball" and "Outline Builder" are later BH games (P3).
- Jazz Roulette (BH E43) is a random-prompt mode of Elevator / scale of chords.
- "Semitone Elevator" (voice) is a tier of Run Catcher.
- "Spice Rack", "Where Am I?" and "Staircase Runner" stay on the ear backlog (P3). They are classical-theory games, behind the jazz-first order (memory "Order: close piano + ear first").

**Top 10 to build first:**
1. Guide-Tone Runner
2. 5-4-3-2 Call
3. Enclosure Target
4. Changes Crossword
5. Hold the Note
6. Border Control
7. Which Brother?
8. Run Catcher
9. Comp Caller
10. Elevator

Together they cover BH, bebop, reharm, key moves, voice agility, comping and grid ear. Most reuse existing engines: `bebopVocab.ts`, `harrisLines.ts`, `commonTone.ts`, `keyMoves.ts`, `soloPiano.ts`, grid dictation, and TakeShell for the measured takes.

---

## 5. Retire or merge

| Action | Why |
|---|---|
| **Remove `drills` (Technique) from the games list** | It is the Technique row, already a Practice tile; as a "game" it doubles the entry and leads to a non-game screen. |
| **Merge Odd-meter Echo into Groove Echo** (its f / ff tiers) | Same mechanic and screen (`DrumGame`); one fewer card in the drums list (14 today). |
| **Drums course: drop Beat Echo (`rhythm`)** | Groove Echo does it measured on the kit. Keep Beat Echo for the other courses. |
| **Groove trainer: Tools only** | It is a tool (`hub.groove`); its level test is what Time Lock measures. |
| **Pitch Memory → Today card** | A once-a-day ritual, not a game. Keep the measurement and the trend. |
| **Duel → the pass-and-play mode of the ghost / Truth or Bluff sets** | It records nothing today. As a mode it inherits tiers, XP and boards. |
| **Riff Echo → a meter variant of Play It Back** (consider) | The take shell, scoring and lives are the same; "odd meter" can be a Play It Back option for K / G / B. Keep it while it is the guitar and bass bonus step. |
| **Truth or Bluff card inside the Echo setup** (`Games.tsx` `games-tf`) | A duplicate entry point; remove it. |
| **Chord Change Race pp–p** | Replace with One-Minute Changes (new #18) and keep the on-beat race for mp+. |

The ear list is 22 cards long (`_list-ear-*`). With the merges and the Today move it drops to 20. Grouping by the existing categories, with "All" collapsed per category, would keep it scannable.

---

## Appendix A. DOM checks per game (320×720)

Generated from the audit run (see the method above). `over` is page overflow in px at setup / play / end. Flags appear only where found:
- `grad` = computed gradient;
- `glow` = blurred shadow;
- `GREEN` = a green hue in colour, background or border;
- `IC` = an `.input-check` strip was visible in some stage;
- `yel` = yellow text on a light background;
- `latin` = Latin text in Hebrew outside `<bdi>`, `dir=ltr` or dynamics.

```
bhtime | en: over 0/0/0 | he: over 0/0/0 latin['HE HE MIDI: HE HE HE HE HE HE']
changerace | en: over 0/0/0 IC | he: over 0/0/0 IC
daily | en: over 0/0/0 grad['span.'] | he: over 0/0/0 latin['HE · mp–mf', 'HE · pp–p']
drills | en: over 4471/0/54 GREEN['span.mk'] yel['span.mk "● ~ Off time"'] | he: over 4397/0/36 GREEN['span.mk'] yel['span.mk "● ~ לא בזמן"'] latin['HE HE MIDI HE HE (HE, HE, HE).']
duel | en: over 202/0/0 GREEN['section.duel-half', 'span.dot'] | he: over 104/0/0 GREEN['section.duel-half', 'span.dot']
flight | en: over 0/0/0 | he: over 0/0/0
ghost-control | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE: HE HE HE-MIDI, HE HE HE']
ghost | en: over 164/0/0 grad['span.'] | he: over 97/0/0 grad['span.']
groove-echo | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE HE HE (MIDI): HE', 'HE HE HE: HE HE HE-MIDI, HE HE HE']
groove | en: over 0/0/0 | he: over 0/0/0
groove-off | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE HE HE (MIDI): HE']
harmonyhold | en: over 0/0/0 | he: over 0/0/0
highway-drums | en: over 78/0/0 grad['div.hw-hitline', 'header.lesson-top'] | he: over 0/0/0 grad['div.hw-hitline', 'header.lesson-top'] latin['HE, HE HE Enter HE HE HE.']
highway | en: over 78/0/0 grad['div.hw-hitline', 'header.lesson-top'] | he: over 0/0/0 grad['div.hw-hitline', 'header.lesson-top'] latin['HE, HE HE Enter HE HE HE.']
kitread | en: over 0/0/0 | he: over 0/0/0
land | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE HE HE (MIDI): HE', 'HE HE HE: HE HE HE-MIDI, HE HE HE']
melody | en: over 67/37/37 grad['header.lesson-top'] GREEN['div.turn-banner'] | he: over 28/34/34 grad['header.lesson-top'] GREEN['div.turn-banner'] latin['MIDI']
melodypuzzle | en: over 0/0/0 grad['header.lesson-top'] | he: over 0/0/0 grad['header.lesson-top']
namegroove | en: over 0/0/0 | he: over 0/0/0
nametune | en: over 0/0/0 | he: over 0/0/0
odd-echo | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE: HE HE HE-MIDI, HE HE HE']
peakhunter | en: over 0/0/0 | he: over 0/0/0
pitchmemory | en: over 78/0/0 | he: over 37/0/0 latin['1 awards from before are in your Awards']
playback | en: over 0/0/0 IC | he: over 0/0/0 IC latin['MIDI', 'HE HE, HE HE. HE HE HE HE HE', 'HE HE HE HEMIDI, HE HE HE.']
polylock | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE, HE HE HE F HEJ, HE HE HE M']
reharm | en: over 0/0/0 | he: over 0/0/0 latin['IV HE ii', 'ii HE IV', 'iii HE I', 'vi HE I']
rhythm | en: over 303/32/0 grad['header.lesson-top', 'span.drum-face'] glow['span.drum-face bs'] | he: over 236/30/0 grad['header.lesson-top', 'span.drum-face'] glow['span.drum-face bs']
riffecho | en: over 0/0/0 IC | he: over 0/0/0 IC latin['MIDI', 'HE HE HE HEMIDI, HE HE HE.']
rootsear | en: over 0/0/0 IC | he: over 0/0/0 IC latin['I, IV, V', 'MIDI']
rudiment-rush | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE HE HE (MIDI): HE', 'HE HE HE: HE HE HE-MIDI, HE HE HE']
rush-chord | en: over 0/0/0 | he: over 0/0/0 latin['2 awards from before are in your Awards']
rush-fretboard | en: over 0/0/0 | he: over 0/0/0
rush-interval | en: over 0/0/0 | he: over 0/0/0
rush-keysig | en: over 0/0/0 | he: over 0/0/0
rush-note | en: over 0/0/0 | he: over 0/0/0
rush-progression | en: over 0/0/0 | he: over 0/0/0 latin['I – IV – I – V', 'I – V – I – IV', 'I – V – IV – V', 'I, IV, V']
rush-scale | en: over 0/0/0 | he: over 0/0/0
rush-standard | en: over 0/0/0 | he: over 0/0/0 latin['Autumn Leaves', 'Bird blues (Blues for Alice changes)', 'Minor blues', 'Rhythm changes']
rush-voicing | en: over 0/0/0 | he: over 0/0/0
singinterval | en: over 0/0/0 | he: over 0/0/0
time-lock | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE: HE HE HE-MIDI, HE HE HE']
transcribe | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE HE HE HE. HE HE HE HE']
truefalse | en: over 267/0/0 grad['span.'] | he: over 120/0/0 grad['span.']
tuneup | en: over 0/0/0 | he: over 0/0/0
voicingsprint | en: over 0/0/0 | he: over 0/0/0 latin['HE HE HE HE. HE HE HE HEMI', 'HE MIDI']
walkchanges | en: over 0/0/0 IC | he: over 0/0/0 IC latin['MIDI']
```

Notes on the numbers:
- `drills` setup overflow (4471) is the Technique hub's list page. That page is meant to scroll; it is not a game screen.
- The `latin` flags for "MIDI" inside Hebrew sentences ask for `<bdi>MIDI</bdi>`. The real parity bugs are Name That Standard, the awards toast and the unisolated Roman numerals.
- "IC" appears only where the strip renders without hardware: in the sim it renders for the TakeShell games and Riff Echo; the drum games show it only once a kit is linked.


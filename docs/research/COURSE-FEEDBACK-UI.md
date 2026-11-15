# COURSE-FEEDBACK-UI: live feedback and exercise screens for keys, guitar, bass, drums, ear/theory and jazz

Date: 2026-11-15. This is the companion to `docs/research/VOICE-FEEDBACK-UI.md`, which covers the voice course. It covers the screens a player watches while playing an exercise, and the review right after a take, in every other course:
- keys/piano, guitar, bass and drums: the technique run screen and the Highway game;
- ear/theory: lesson questions and grid dictation;
- jazz/improv: rule-card takes, the reharm studio and the improv studio.

The goal is screens that are clearer and better-looking than every competitor's, inside the v2 language (`docs/SPEC-REDESIGN.md`) and on one 320×720 phone screen.

**Evidence markers.**
- **[V]**: checked this session, on a store listing, the developer's own help pages or a published review.
- **[K]**: known from public demos or general knowledge of the product, not re-checked this session.
- **[R]**: our recommendation.

No vendor publishes its timing windows in milliseconds.

**Screenshots.** All are in `docs/ui-audit-shots/`, taken at 320×720 in English (`-en`) and Hebrew (`-he`). A `-full` file is the whole page, captured when the screen overflowed. They are referenced below by file name.

---

## 1. Competitor teardown

### 1.1 Piano and keys

| App | Shows the music as | Now-cue and timing | Right, wrong and partial credit | Hands, dynamics, streak | Review | Loop and slow-down | Onboarding |
|---|---|---|---|---|---|---|---|
| **Simply Piano** | A one-line staff that scrolls sideways (landscape). Finger numbers are always on. [V] | Fixed cursor [K]. "Wait for me" in practice mode [V]. Early, late and wrong-length notes still turn green [V]. | Green right, red wrong, yellow "the app had to help". Reviewers can't tell whether a penalty was for pitch or timing. [V] | Hands are taught step by step; no hand lanes; no dynamics. [V] | Songs only: notes right, a timing score, help used. No per-note map, no replay. [V] | Tempo 85% or 95% only; no section loop. [V] | A Listen button; skippable videos. [V] |
| **Flowkey** | Teacher's hands on video above, one line of notation with a playhead below. Scrubbing moves both. [V] | Wait mode first; the wait gets shorter over repeats. No timing feedback. [V] | None: a clean run and a messy one look the same. [V] | Pick RH, LH or both; the other hand plays along, which reviewers praised. [V] | None. [V] | Loop a section; ladder Wait → 50 → 75 → 100%. [V] | Pick a hand → wait mode → speed ladder. [V] |
| **Playground Sessions** | Zoomable notation with an on-screen keyboard under it on touch screens. [V] | Instant feedback. [V] | Green right, red wrong, **pink = timing problem**. Inconsistent: deliberately early notes often show green, and one all-green run scored 83%. [V] | Each hand can be switched off. Toggles for metronome, count-in, finger numbers, note names. [V] | A pop-up per part: score, detail, Repeat/Continue. A dashboard. [V] | Section repeat; speed control. [V] | Short demo videos; song preview = one page plus audio. [V] |
| **Skoove** | Notation above, keyboard below, one line at a time. [V] | Notes first, then in time. [V] | A **green dot above** each right note, a red dot above each wrong one. The staff stays readable. [V] | Hands separately, then together. [V] | Notes right out of total. [V] | Loop bars; tempo. [V] | **Listen → Learn the keys (no rhythm) → Play in time (with the teacher, then scored)**. The best flow found. [V] |
| **Melodics** (keys/pads/drums) | Lanes of note blocks moving to a now-line; a piano roll for keys. [V] | **Timing by hue: on time / orange = a little early / purple = a bit late / red = miss.** [V] | Hidden precision: a tighter "good" scores more. [V] | Streak points, reset by a miss; stars 1–3 plus Platinum. [V] | Score with no ceiling, stars. [V] | **Auto BPM** (+10 BPM per good pass up to the target); drag loop markers; wait mode. [V] | **A pre-play screen for every step**, and Preview lights the pads/keys in time. [V] |
| **Synthesia** | Falling notes onto a keyboard, with optional sheet music. [V] | Melody Practice waits for the right key. [V] | Unknown. | Hands in two colours [K]; finger hints. [V] | A summary and progress. [V] | Hands separately; speed. [V] | — |
| **Piano Marvel** | Notation with a blue cursor bar (density adjustable or off). Blue loop handles on the score. [V] | **Practice mode:** live green/red per note. **Full run:** no colour while playing. [V] | **After the run, every note is redrawn in place: wrong, early or late, and by how much.** [V] | A tick before each clef switches that hand off. Dynamics not assessed. [V] | High score, last score, play count; the in-place timing map. [V] | **Learn mode chunk ladder: Minced → Chopped → Whole**, each hands separately → together → 3 speeds. [V] | The chunk ladder is the onboarding. [V] |
| **Pianote / Musora** | Video plus synced sheet music. [V] | No live grading found. | — | — | — | Speed; loop. [V] | Video lessons. |
| **Open Studio** | Video lessons with "living notation" (Soundslice-style synced score, speed, A/B loop). Guided Practice Sessions talk you through playing. [V] | No automatic feedback; human feedback in live sessions. [V] | — | — | — | Speed, A/B loop. [V] | Pathways, short sessions (new 2025 app). [V] |

**Reviewers on piano apps.**
- **Praise:**
  - instant feedback (Simply, Playground);
  - clean "Netflix-like" design and the hands video (Flowkey);
  - serious content and the after-the-run timing map (Piano Marvel);
  - very clear timing colours (Melodics).
- **Complaints:**
  - recognition that fixates on one note, or marks it early or late wrongly (Simply);
  - **all green but 83%** (Playground);
  - no feedback at all (Flowkey);
  - one line of notation with no look-ahead (Flowkey, Skoove);
  - the loud model melody hides the student (Skoove);
  - false "late" calls caused by latency (Piano Marvel support).

### 1.2 Guitar and bass

| App | Shows the music as | Now-cue and timing | Right, wrong and partial credit | Streak and combo | Review | Loop and slow-down | Onboarding |
|---|---|---|---|---|---|---|---|
| **Yousician** | A tab highway of 6 string lanes moving right to left [K]. **Notes coloured by finger** (yellow index, pink middle, blue ring, orange pinky, grey open). Optional fret numbers, note names or notation. [V] | **A bouncing ball** arcs from note to note, so rhythm is shown as motion. Labels: "Perfect / Great / Good / A bit early / A bit late". [V] | Green hit, red miss. [V] | Multiplier up to 5×; a miss drops it. [V] | Up to 3 stars plus gold stars, hit rate, leaderboard. [V] | Loop; tempo 25–125% in 5% steps; separate Practice and Play modes. [V] | A 1–2 minute video, then 4 speeds. [V] |
| **Rocksmith+** | A 3D noteway with string colours (low E on top, which takes getting used to). There is also a 2D tab view. Tap any chord to see its fingering. [V] | "Early" and "Late" pop up on the noteway; a 2024 patch fixed "Late" not showing. [V] | The miss indicator was **enlarged in an update**. [V] | Adaptive difficulty changes note density live; players call the swings "boring to insanely hard". [V] | Mastery % per phrase [K]. | **Riff Repeater:** loop + level-up after clean passes, speed 25–125%. Goal 80% at 100% speed. [V] | — |
| **Fender Play** | Video plus tab. Feedback Mode (MatchMySound). [V] | Scores notes and rhythm against the tab. [V] | **A score of 60 or below shows only the total and a retry prompt.** [V] | — | Not saved. [V] | — | Video. |
| **Justin Guitar** | Karaoke-style chord play-along: next chord diagram, strum pattern. [V] | No grading; users notice. [V] | — | — | — | Tempo. [V] | — |
| **Ultimate Guitar / Guitar Pro** | Tab player with cursor, mixer, loop. [V] | No grading. | — | — | — | **Speed Trainer:** loop and +2% per pass up to a set maximum. [V] | — |
| **Songsterr** | Classic tab plus optional notation, moving cursor, portrait and dark mode. [V] | No grading. [V] | — | — | — | Loop, slow-down, count-in, solo/mute, all behind the paywall. [V] | — |
| **GuitarTuna** | Chord mini-games with instant feedback. [V] | — | — | — | — | — | Heavy subscription prompts. [V] |

**Reviewers on guitar and bass apps.**
- **Praise:**
  - game feel (Yousician);
  - accurate tabs and a loop that "works beautifully" (Songsterr);
  - the tap-a-chord fingering help (Rocksmith).
- **Complaints:**
  - **timing judged unfair or opaque** (Yousician: "too early" when it felt right; "perfect" while the ball was mid-air);
  - interface latency marking notes late (Yousician on iRig);
  - misses too small to see (Rocksmith);
  - core tools behind the paywall (Songsterr).

### 1.3 Drums

| App | Shows the music as | Timing feedback | Hits, dynamics, limbs | Combo | Loop and slow-down |
|---|---|---|---|---|---|
| **Melodics drums** | One lane per pad [K]; pads can be dragged to new places. [V] | The same early/late hues as Melodics keys. [V] | Works with e-kits over MIDI. [V] | Streak. [V] | Auto BPM, loop, wait mode. [V] |
| **Drumeo (Musora)** | Video plus sheet music that scrolls with the video. [V] | **No live hit scoring.** Practice only logs time. [V] | — | — | Speed, loop (hard to use on mobile). [V] |
| **Drumistic** | Nothing found. Similar apps (StickPulse) show **per-hit deviation charts and an early-vs-late % split**. [V] | — | — | — | — |
| **Rock Band / Clone Hero** | A highway toward a strikeline at the bottom; lane colours R/Y/B/G. **Kick = a bar across all lanes.** **Cymbals and toms are different gem shapes.** **Accents and ghosts have their own graphics** (ghosts see-through). [V] | An optional hit-window display. [V] | "Deadly Dynamics" mode scores velocity (opt-in). [V] | 1×→4× every 10 notes; stars from the average multiplier; No Fail on by default. [V] | Practice by section; speed. [V] |
| **Groove Scribe** | A grid editor that draws notation, one URL per groove. [V] | No scoring. | — | — | Tempo shortcuts. [V] |
| **Moises** | Stem separation, so you can play to a drumless track; chord detection. [V] | No scoring. [V] | — | — | Speed without pitch change. [V] |

### 1.4 Ear training and theory

| App | Question card | Feedback on the answer | Partial credit | Timing | Review |
|---|---|---|---|---|---|
| **EarMaster** | Many inputs: staff entry, piano, fretboards, solfège ladder, MIDI on by default, mic for singing and clapping. [V] | Red wrong; correct choice in green. A bug once greened a different button. **"Play my answer" plays a *probable* mistake**, not yours, which confused users. [V] | **Singback per note: ✓ / ✗ / → (accepted but late).** The clearest scheme found. [V] | Tapping with an input-offset setting; the first tap of a new rhythm registers late. [V] | Strong/weak areas by day; up/down split for intervals. [V] |
| **Tenuto / musictheory.net** | Staff or keyboard on top, a grid of answer buttons below. **Keyboard reverse identification.** [V] | Right/wrong animation; "multiple attempts". [V] | None. | Challenge mode with a time limit. [V] | High score; teacher report. [V] |
| **Functional Ear Trainer** | A cadence, one note, numbered degree buttons. [V] | **The note resolves stepwise to the tonic: the "why" is a sound.** [V] [K for the exact UI] | — | — | Stats per level. [V] |
| **Complete Ear Trainer** | 150+ drills, buttons under a replay control. [V] | The right answer is shown; you can tap any answer to hear it [K]. Tips per chapter. [V] | 1–3 stars per drill. [V] | — | 3 stars unlock the next level. [V] |
| **Auralia / Musition** | Multiple choice, notation entry, chord symbols, tapping, singing. [V] | **Every wrong answer gets playback, notation and text.** [V] | Weighted marks in tests. [V] | Tapping. [V] | Teacher reports. [V] |
| **Teoria** | Build or dictate with note buttons, then **Check**. [V] | **Green ✓ over the note; red ✗ over the *correct* note, not over the note you wrote.** [V] | Per note. [K] | — | Score page. [V] |
| **ToneGym** | Short games; daily workout of 5. [V] | Rhythm taps as dots: **green = perfect, red = early *or* late, no direction shown.** Status line: Listen → Get ready → Play back → Good! [V] | — | Streak of perfect takes. [V] | Coins, leaderboards. [V] |
| **Perfect Ear** | A button grid plus a staff for rhythm. [V] | After submitting, **tap any option to hear it**; hear your rhythm against the target. [V] | — | Rhythm-tapping accuracy feedback. [V] | Streaks with freezes, shareable result cards. [V] |

**Reviewers on ear apps.**
- **Praise:**
  - focus and no clutter (Functional Ear Trainer, rated about 4.9);
  - the rhythm trainer (Perfect Ear);
  - customisability (Tenuto).
- **Complaints:**
  - notes moving under your finger during staff entry (EarMaster);
  - auto-played notes polluting dictation (EarMaster);
  - revealed notation the user can't read fast (ToneGym);
  - not being able to hear both the wrong and the right answer (ToneGym, Tenuto);
  - "overwhelming" defaults (Tenuto).

### 1.5 Jazz and improvisation

| App | Chart and playhead | Loop, tempo, key | Feedback on playing | Reviewers |
|---|---|---|---|---|
| **iReal Pro** | Grid chart, 4 bars a row. **The current bar is highlighted** (colour set by the user). **A loop selection shows yellow**; users ask for it to look different from the current bar. Tap a bar to start there. Tap a chord to see a voicing. [V] | Loop selected bars (**Stop clears the loop, which users dislike**); tempo +N per chorus; any key, plus a 12-key cycle. [V] | None: it is a play-along tool. [V] | Praised as the "go-to app". Complaints: chart colour controls removed, so small screens are hard to read; the highlight drifts off screen or behind the audio in landscape. [V] |
| **Open Studio** | Synced notation in videos (speed, A/B loop). [V] | — | Human only. [V] | No app reviews found. |
| **Band-in-a-Box (iOS)** | Chord sheet, notation, tab, drum notation; an on-screen fretboard and piano show the notes live; **double-tap a bar to start there.** [V] | Visual transpose; tempo changes at any bar. [V] | None. [V] | Synthetic sound; can't enter 2 chords in a bar; crashes when saving. [V] |
| **"Jazz Guitar: Chords & Voicings / Drop2" (iOS 2026)** | **Targets mode:** a guide tone to land on per bar, graded. **Free mode:** each note sorted live as chord tone, tension, avoid or outside on a colour neck map. [V] | Forms: ii–V, blues, Rhythm changes … [V] | The only automatic improv grader found. [V] | Too few ratings. |
| **Improv Trainer, iImprov, Jazz Licks** | Backing tracks in all keys. [V] | — | No feedback. [V] | iImprov abandoned (iOS 13). |

---

## 2. Ideas to adopt, and mistakes to avoid

### Adopt (ranked by value to ToneTurn)
1. **Show timing with a hue and a direction, never as a red/green verdict** (Melodics, plus EarMaster's arrow). [R]
   - Early = tangerine with a tick on the **left** of the note head.
   - Late = purple with a tick on the **right**.
   - This is the same tangerine/purple pair the voice spec uses for sharp/flat, so one rule covers the whole app.
2. **Keep pitch and timing as two signals on the same note** (the gap reviewers of Simply Piano and Playground Sessions complain about). The note head carries pitch (right, ✕ wrong, ○ missed). A small tick beside it carries timing. [R]
3. **Calm screen while playing, rich map afterwards** (Piano Marvel full run).
   - At higher levels the staff shows only the now-cue and a few live ticks.
   - The review redraws every note in place with early/late and how much.
   - This is what makes the result fit one 320 px screen. [R]
4. **Error map → loop the spot.** Nobody joins these up: Piano Marvel has the map, and Melodics, Riff Repeater and Guitar Pro have the loop. Tapping a bar on the error map loops those bars at −10%. Two clean passes and you are back on the full item. [R]
5. **Visible tempo ladder with auto speed-up** (Flowkey's chips, Melodics Auto BPM, Guitar Pro +2%, Rocksmith "80% at 100%"). ToneTurn already has rubato → quarters → tempo (`rubato.ts`). Show it as 4 chips the player can see. [R]
6. **One pre-play gate per exercise that previews in sync** (Melodics Preview, Skoove's Listen → Learn → In time). ToneTurn already has the gate page (path-names-and-brief rule). Add a Preview that lights the score, tab or pads as the model plays. [R]
7. **Drum-highway vocabulary** (Clone Hero):
   - the kick as a bar across the lanes;
   - cymbal ✕ heads vs drum ● heads;
   - ghosts hollow, accents with a thick outline;
   - velocity scoring only where the drill asks for it. [R]
8. **Partial credit drawn where the error is:**
   - EarMaster ✓/✗/→ per note;
   - Teoria's mark on the note;
   - ToneTurn's grid dictation already scores root / quality / extra separately.
   - Extend this to chords (3 of 4 tones), melodic dictation and rule cards. [R]
9. **"Yours ▶ / Right ▶" after a miss, playing your real input** (asked for by ToneGym, Tenuto and EarMaster users), plus **the "why" as a sound** (Functional Ear Trainer's resolution), before any text. [R]
10. **Charts: a current-bar cell and a loop that look different, and a loop that survives Stop** (iReal Pro requests). Tap a bar to start there; the active row stays in view. [R]
11. **Fender's soft failure.** A very weak take shows only the total plus "Try at −10%?" or "Once in free time", not a wall of red. [R]
12. **Latency honesty.** A one-tap calibration plus a visible window: the ±ms band is drawn on the timing meter. Yousician's and Piano Marvel's false "late" calls come from hidden latency. [R]

### Avoid
1. **Red/green or pink/red/green as the only signal.** Simply Piano, Playground, Skoove, Piano Marvel, Yousician, ToneGym and Teoria all do this.
2. **Feedback that lies:** all green but 83%; early notes shown green; held notes not checked. The marks and the score must come from the same numbers.
3. **Opaque timing windows.** Show the offset or the window, never just "late".
4. **No feedback at all** in a learning app (Flowkey, Drumeo, Justin, Songsterr). Users notice.
5. **Wait mode as the only mode.** It builds no time; it must lead onto a tempo ladder.
6. **Chaotic adaptive difficulty** (Rocksmith). Use predictable, visible steps.
7. **Marks too small to see while moving** (Rocksmith had to enlarge its miss marker). Live marks need at least 12–14 px on a phone.
8. **One line with no look-ahead** (Flowkey, Skoove). Page a line early, and show the next line faded.
9. **A model part that hides the student, with no mixer** (Skoove).
10. **Replaying something other than what the player did** (EarMaster's "probable mistake").
11. **A loop that disappears on Stop, or a playhead that drifts out of view** (iReal Pro).

---

## 3. ToneTurn today

All technique items (keys, guitar, bass, drums, and the jazz/improv items inside them) share **one run screen**: `DrillRun` in `src/ui/Drills.tsx:966-1070`, with `DrillScore` (`Drills.tsx:120-197`) choosing the view.

| Piece | Component | File and line |
|---|---|---|
| Staff | `DrillStaff` | `DrillTake.tsx:234-363` |
| Tab | `DrillTab` | `DrillTake.tsx:86-144` |
| Chart | `ChartView` | `DrillTake.tsx:146-175` |
| Ear card | `EarCard` | `DrillTake.tsx:177-232` |
| Drums | `DrumScore`: staff and lanes | `DrumViews.tsx:81-462` |
| Take control | `DrillTake` | `DrillTake.tsx:460-805` |
| Free-time take | `RubatoTake` | `RubatoTake.tsx:23-144` |
| Result | `TakeResult` | `DrillTake.tsx:807-900` |
| Mark legend | `MarkLegend` | `DrillTake.tsx:366-376` |

The marks are drawn by VexFlow in `NoteStaff` and `TabLine` (`NoteViews.tsx:143-300`). The now-cue is `NowColumn` (`NoteViews.tsx:100-119`), styled `.staff-now` (`pulse.css:114-126`).

### 3.1 What the engine measures and what the screen shows

The engine knows a lot per note. `TakeMetrics.perNote[]` holds:
- `dev` (ms early or late);
- `played.pitch` and `played.vel`;
- `exp.hand` and `exp.accent`;
- `glitches`, `handsAbs`, `timingMean`, `timingSD`, `cvR` / `cvL` and `velSD`.

Drums add a per-limb result (`m.drum`). Rule-card takes add `m.improv[]` (per card ok/total); the chart player's report also has per-bar `breaks` (`Charts.tsx:477`). Very little of this reaches the player in a readable form:

| Measured | Shown while playing | Shown after the take |
|---|---|---|
| Pitch per note | nothing | note colour (green/amber/red, `NoteViews.tsx:136`) + ✕/○ symbol + played note name |
| Timing per note (`dev`) | nothing | "~" symbol, or "+120"/"−90" under the note when beyond the band (`DrillTake.tsx:259-266`). **No early/late colour or direction on the note.** A separate bar chart ("Timing per note") in grey |
| Velocity per note | nothing | 2.6 px dots on a grey strip ("Loudness per note", `DrillTake.tsx:403-420`) |
| Hand evenness | nothing | "CV R 14.2% · L —" (jargon) |
| Hands together | nothing | "⇆ 23 ms" |
| Drum limbs | nothing | one text line (`drumLimbLine`) |
| Rule cards | nothing | one text line "Guide tones 5/8 · …" (`Drills.tsx:1036-1044`); **the drill chart does not mark which bars broke a rule** (the chart player does) |
| Mean early/late | nothing | a hint only when rushing by more than 30 ms (`DrillTake.tsx:873-879`) |

### 3.2 Per course, with screenshots

**Keys/piano**
- **Before the take** (`keys-run-before-en.png`, `-he`): one outlined card holds a whole 2-bar line of 16 eighth notes squeezed into about 250 px.
  - Note heads are about 5 px; finger numbers are about 6 px and coloured (teal, purple, pink), so they cannot be read.
  - A MIDI hint takes 3 lines; the ♩ = 66 line and a dot float below.
  - **The lower 45% of the screen is empty.**
- **During the take** (`keys-run-during-en.png`):
  - The only signal is a 3 px purple bar with a lilac halo (`.staff-now`) and "Go!" with a lemon dot.
  - **No live per-note feedback at all.** A wrong note shows only after the take.
  - The now-cue is purple, not lemon, which goes against the rule "lemon only for now".
- **After the take** (`keys-run-after-en-full.png`, `keys-run-after-he-full.png`): **the screen overflows by 133–151 px, and Next is below the fold.** The problems:
  - Two verdicts say the same thing: "Not yet — again at ♩ 66" (ladder line) and "Not yet" (card heading), plus "11 wrong, 9 missing" twice.
  - Jargon: "CV R 14.2% · L —", "vel SD 21.2", "± 53 ms".
  - The two charts sit on `rgb(0 0 0 / 0.2)` grey panels, a dark-theme leftover on paper (`drills.css:172`). Timing bars are mint and gold, misses coral (`drills.css:179-187`).
  - Note marks are green `#1f8f67` (`NoteViews.tsx:136`). The colour-blind palette exists but is opt-in under Settings → Display (`MARK_CVD`, `NoteViews.tsx:138`).
  - The legend text is green, amber or red on paper, at **1.8–2.6:1 contrast** (`drills.css:358-366`), below WCAG AA.
  - There is no "loop this spot" action.
- **Long items** (`jazz-sixdim-en.png`, Barry Harris 6th-diminished): three stacked staff cards, and the third is cut in half by the card edge.
- **Key map:**
  - It sits at the top of the family page (`keys-family-top-en.png`; element shot `keys-keymap-en.png`), but the cells are about 20×20 px with 9 px letters and a 1 px dashed outline. The per-level RH/LH strips under level 1 are even smaller.
  - The fills are mint shades (`drills.css:576-580`), and "weak" is shown only by a thin coral underline. A new player sees 12 identical dashed boxes plus "Not measured yet".
  - The family page itself is **3,478 px tall**, a long list.
- **RTL** (`keys-run-after-he-full.png`):
  - "עוד לא — שוב ב־♩ 66" renders with the 66 and ♩ jumping to the line start.
  - The stats line is `dir="ltr"` around Hebrew words, so "40% תווים · 11 שגויים" comes out in mixed order (`DrillTake.tsx:824`).
  - The chart caption "(מוקדם ← → מאוחר)" sits over an LTR chart, so in Hebrew "early" reads on the right of the caption but the early bars are on the left.

**Guitar**
- **Before the take** (`guitar-run-tab-he.png`): a 2-line tab, plus staff, in two white cards **with no ink outline and no shadow**, unlike the keys staff card.
  - Fret digits are about 6 px, with finger numbers in colour under them.
  - Two thirds of the card is empty.
  - The bouncing-ball idea (Yousician) is missing: the now-cue is the same thin bar.
- **Rule-card item** (`guitar-rulecard-en.png`, `jazz-rulecard-keys-he.png`):
  - An 8-bar form drawn as **3 + 3 + 2 cells**, because `.ear-bars li { flex: 1 0 58px }` (`drills.css:479`). A 4-bar phrase grid breaks.
  - Every cell says "You" with the chord in tiny bold. **The rule itself is not on screen**: it is only in the truncated title "Improvise: a guide tone on every chan…".
  - No guide-tone target per bar.
- **Results** show a strummed-chord "full chords 3/4" stat only as text.

**Bass**
- **Run screen** (`bass-run-en.png`, `bass-read-he.png`): tab with a 2-line pager.
  - Open-string "0"s at about 6 px float in a mostly empty card.
  - The chord chart under the tab (`bass-read-he.png`) uses ink bars without outlines.
  - The "show a model line" link is right under it in bold.
  - The headphones gate takes about 160 px, and the Play button is pushed below it.
- **No visual link to the kick drum** in "lock with the kick" items. The bass pocket is the skill, but nothing shows where the kick lands.

**Drums**
- **Lanes view** (`drums-lanes-before-en.png`, `-he`):
  - Lanes are **14 px tall** (`DrumViews.tsx:393`) and hits are 3–5 px circles (`:415`), shrunk again by scaling the 340-wide SVG down to about 240 px.
  - Lane names are 6–7 px.
  - The legend "Big = accent • hollow = ghost • ring = open hat" is needed because the shapes are too small to read.
- **Staff view** (`drums-staff-before-he.png`): readable notation, but small (the second line's x heads are about 6 px).
- **E-kit notice:** a **pale-yellow box with ink text**, and a **pale-yellow disabled Play button with grey text**. Both go against the readable-contrast rule (no pale yellow; lemon only for now).
- **Glyph colours:** the drum glyph is green `#4CD07D` (`DrumViews.tsx:504, 579, 618, 872`).
- **Take and result:**
  - During the take (`drums-during-en.png`), the now-cue is a **1 px lilac line**, almost invisible over the pink lanes. "Go!" and a dot sit below, and two thirds of the screen is empty.
  - The result (`drums-after-en-full.png`) is a no-input take (the stub kit was not linked in that run), so every hit is missed. It uses the same `TakeResult` card as keys, with "0 % of the hits in time (±60 ms)", CV jargon and the grey timing panel, and overflows by 47 px. With real hits it adds one limb text line (`drumLimbLine`, `data-drum-limbs`); there is no visual per-limb split.
- **Highway** (`drums-highway-setup-en-full.png`, `drums-highway-play-en.png`):
  - The setup **overflows by 153 px** in English.
  - In play, the purple road carries a pink "Miss" at **2.5:1** on purple, and a lemon "Perfect" (lemon used for a verdict, not for "now").
  - Notes glow (`box-shadow 0 0 16px` at `v2.css:1522`; the old `games3.css:157-185` glow rules are still there).
  - The kick is a lane, not a bar across the lanes.
  - The hit line is a white double line with no lemon.
  - There are no early/late marks, only text flashes.

**Ear/theory**
- **The gate page** (`ear-brief-basics-highlow-en.png`): clean.
  - The play button has a blurred drop shadow, not the hard offset.
  - "Explain this topic in depth" and "Hide this topic" are both plain text links next to the Play button.
- **Question** (`ear-question-basics-highlow-en.png`): v2-clean.
  - Toni plus a lemon speech bubble, a keyboard, the question, a time bar, and two big answer buttons.
  - The keyboard is decoration: it never lights the two notes.
- **Wrong answer** (`ear-feedback-wrong-basics-highlow-en.png`, then `ear-feedback-right-basics-highlow-en.png`, which in fact caught the second miss):
  - First the buttons grey out with no message while the item replays.
  - Then a pink card "Not quite — listen again" with a lemon "Why?" on an ink pill (good, 12.5:1). Toni's bubble turns pink inside a **lemon halo glow**.
  - The chosen wrong button is pink-ringed. The right answer is not shown until the reveal.
  - **No "Yours ▶ / Right ▶"**, and the keyboard never shows the two notes.
- **Recap** (`ear-recap-basics-highlow-en.png`): the streak celebration is in front of the recap. It has a brown-gold "1" and a flame icon in a peach circle.
- **Grid dictation:**
  - Question (`ear-grid-question-he.png`): **the ask "Key of E♭: write each chord." sits below the input pad**, so the player reads the controls before the task.
  - Disabled chips are grey on lilac, low contrast.
  - Feedback (`ear-grid-feedback-en.png`): partial credit already exists. Each part is underlined teal (right) or tangerine (wrong), and the feedback says "Roots 1/4 · quality 2/4". This is the best partial-credit display in the app; use it as the model.
  - Problems: the part underline is the only signal (no ✓/✕); the pink card repeats the numbers; the selected chips are teal, which is the voice domain colour.

**Jazz/improv**
- **Rule-card takes:** as in the guitar section, the rule is not shown, there is no target per bar, the result is one text line, and broken bars are not marked on the drill chart.
- **Reharm studio** (`jazz-reharm-panel-en.png`, `-he`; family `k-tune`, `ReharmStudio.tsx:60-140`, `reharm.css`): **broken at 320 px.**
  - The 4 bars a page are forced into 4 narrow columns. Device chips wrap one letter per line ("T r i t o n e s u b"), and chords break mid-symbol ("Fm / aj7", "Gm / 7").
  - The panel is wider than the screen: the head select reads "Corner Be…", and the "Comp it / Melody over" buttons are clipped at the inline-end.
  - In Hebrew, bar 1 is clipped on the left instead.
  - This is the most urgent fix in the jazz screens.
- **Improv studio** (`jazz-improv-studio-en.png`):
  - The tabs (Rules / Phrasing / Vary it / Trading fours) wrap onto two lines at 320 px.
  - The challenge list is long, with dot-progress at about 5 px.
- **Chart player** (`Charts.tsx:470-640`): does mark bars with breaks (`ch-bar.broke`), and the debrief text is good. It is the reference for how rule feedback should look on the drill chart.

### 3.3 v2 language violations (fix whatever else happens)

| Violation | Where |
|---|---|
| Green | `MARK_RG.ok #1f8f67` (`NoteViews.tsx:136`); legend `#3ccf97` (`drills.css:358`); `.vl-chords li.v-clean #3ccf97` (`drills.css:549`); the drum glyph `#4CD07D` (`DrumViews.tsx:504/579/618/872`); `FAM_HUE` greens `#5cffb0`, `#b0ff5c`, `#8fe3a8`, `#8fe08a`, `#4fe0a0` (`Drills.tsx:102`) |
| Gradient | `drills.css:31` family card |
| Glow | `.staff-now` halo (`pulse.css:121`); Highway notes (`games3.css:157-185`) and `v2.css:1522`; Toni's lemon halo on feedback |
| Lemon not meaning "now" | Highway "Perfect" flash (`v2.css:1545`); the beat-dot accent `var(--gold)` (`drills.css:125`); the pale-yellow kit/MIDI warning `.kit-warn` and the disabled Play; the `.chart-bar.now` and `.ear-bars li.now` **are** correct uses (`drills.css:474, 482`) |
| Now-cue not lemon | `.staff-now` uses `--accent` (purple) |
| Hardcoded old palette | `#e6b54a`, `#ff6b5c`, `#7c8cff`, `#ff8a5c` (`drills.css:182-201, 361-366, 550-564`); `--mint`, `--coral` and `--gold` throughout `drills.css`, `grid.css`, `reharm.css`, `games3.css` (mapped to teal/lemon by `v2.css:38-40`, so meanings drift) |
| Dark-theme leftovers | `.drill-chart svg { background: rgb(0 0 0 / 0.2) }` (`drills.css:172`) |
| Missing outline/shadow | tab cards (`.guitar-tab` wrapper) and `.drill-staff` in guitar/bass; `.chart-bar` cells |
| Emoji-like symbols | `↻ ▶ ■` and `⇆ 𝆮` in buttons and stats (`DrillTake.tsx:795-800, 852-860, 881-896`). The "▶ Play" in the mega button is fine as a glyph, but `↻`, `⇆` and `vel SD` belong behind icons/words |

### 3.4 Contrast measurements (WCAG, on paper `#FBF7FF`)

| Pair | Ratio | Verdict |
|---|---|---|
| Legend "Off time" `#e6b54a` | 1.79 | fails |
| Legend "Right" `#3ccf97` | 1.88 | fails |
| Legend "Wrong" `#ff6b5c` | 2.64 | fails |
| Teal `#12C9B4` as text | 1.98 | fails: only as a fill under ink |
| Tangerine `#FF8A3D` as text | 2.22 | fails: same |
| Lemon on paper | 1.35 | never |
| Highway pink "Miss" on purple | 2.51 | fails |
| Ink on lemon | 12.5 | good |
| Ink on teal | 8.5 | good |
| Ink on pink | 6.3 | good |
| Purple on paper | 6.7 | good |

**Rule [R].** Teal, tangerine, pink, sky and lemon are **fills under ink glyphs or outlines**, never text colours on paper.

### 3.5 One-screen fit at 320×720

| Screen | Overflow |
|---|---|
| Keys result | +133 to +151 px (Next below the fold) |
| Drums result | +5 to +47 px |
| Highway setup (en) | +153 px |
| Family pages | +2,000 to +3,500 px (lists; acceptable for a list, but the key map and the reharm studio sit far down) |

Every run screen **before** a take fits, but wastes 40–50% of the height while the score is drawn at 5–7 px detail.

---

## 4. Design spec

### 4.1 Shared system for every played take ("TakeLane")

**Principles [R]**
1. **The score is the hero.** At 320 px it gets the width, minus 16 px gutters (288 px), and up to 46% of the height. Show **one bar per line on phones for dense items** (8+ notes a bar) and two bars for sparse ones. Note heads must be at least 9 px, fret digits at least 13 px, and finger numbers at least 11 px in ink.
2. **Two signals per note, always in the same places.**
   - **Head = pitch:** ink (not yet played), teal fill with an ink outline (right), ✕ in pink over the expected head plus a small ghost head at the played pitch (wrong), dashed hollow outline (missed).
   - **Tick = timing:** a 3×10 px tick at the head's left (early, tangerine) or right (late, purple). Its length grows with the offset: 4 px at the edge of the window, up to 12 px at twice the window.
3. **Lemon only for now:** the playhead, the current bar's top strip, and count-in ticks. Lemon always sits next to ink, with a 2 px ink border, never alone on paper.
4. **No glow, gradient or green.** The hard 4 px offset shadow only on cards and buttons, never on marks.
5. **The staff, tab, lanes and charts stay LTR** inside RTL pages (`dir="ltr"` already). Every caption with "early/late" is LTR-isolated and drawn as icons (◂ early / late ▸) rather than words with arrows.

**Colour semantics (instrument takes; matches §4.10 of the voice spec)**

| Meaning | Fill | Shape twin |
|---|---|---|
| Right | Teal `#12C9B4` with ink outline | Solid head |
| Early | Tangerine `#FF8A3D` | Tick on the left ◂ |
| Late | Purple `#6D28D9` | Tick on the right ▸ |
| Wrong pitch | Pink `#FF5FA2` | ✕ over the head, ghost head at the played note |
| Missed | Paper | Dashed ink outline ○ |
| Extra note (not in the score) | Ink | Small ✕ on the line above, no head |
| Now | Lemon `#FFD43B` + ink edge | Playhead and bar strip |
| Upcoming | Ink 100% | — |
| Played (no grade yet) | Ink at 45% | — |

Remove the colour-blind opt-in (`MARK_CVD`): the new palette *is* the safe one (tangerine/purple sit on the orange–blue axis, and teal vs pink differ in both hue and lightness). Keep a high-contrast theme that thickens ticks to 4 px.

**Live feedback while playing (levels 1–3 of an item: "practice"; full run: "calm")**
- **Practice (rubato stage, quarters stage, and the first takes at tempo):** each note is graded **as it is played**. The head fills and the tick appears about 80 ms after the onset is analysed. This is the Piano Marvel practice mode and the Skoove dot, drawn on the head itself.
- **Calm (once an item has had 2 clean takes, and always in a level test):** only the playhead and a **live timing meter**; marks appear in the review. The setting "Live marks: Always / While learning / Never" goes in drill settings (default: While learning).
- **The live timing meter ("pocket"):** a 288×28 px strip under the score.
  - A centre slot with the tolerance window drawn as an ink-outlined box (±window in ms, from `thresholds(tempoBand)`).
  - A note-head needle sits at the running mean offset of the last 6 notes: tangerine half on the left (early), purple half on the right (late).
  - At its ends, small glyphs ◂ and ▸ (no words).
  - It replaces "Go!" and the beat dot. The bar's beats are shown as 4 small cells in the strip's corner, the current one lemon.
- **Streak:** a quiet counter of notes in a row inside the window ("12 in a row" in Secular One, 14 px, ink, at the meter's inline-end). It resets on a miss, with no multiplier. This is in line with the mature-clean-UI rule: no fireworks, just the number.

**Velocity bars (keys with MIDI, drums, any item with a dynamics goal)**
- A 6 px row under the staff: one bar per note, its height = velocity (4 steps pp / p / mf / f mapped from the calibrated range).
- A target dynamic is drawn as a hollow ink outline the bar should fill.
- Accents get a thick ink top.
- It is only shown when the item has a loudness, accent or evenness goal. Otherwise it stays hidden, to keep one screen.

**Hand lanes (keys hands together)**
- A grand staff: RH treble, LH bass, one system.
- The live meter splits into two thin rows: **R** on top, **L** below, each with its own needle.
- The "hands together" offset (`handsAbs`) is a small ⇆ chip between them, shown only when it is outside 30 ms.

**Now-cue**
- A lemon playhead 4 px wide with a 1.5 px ink edge, height = staff + 6 px, **gliding by real onsets** (keep `glidePos` / the staff-playhead rule).
- No halo. The current bar gets a 3 px lemon strip above the staff.
- **The next line is shown at 35% ink below**, and pages one beat early (look-ahead; avoids the Flowkey complaint).
- Count-in: 4 lemon ticks in the meter strip filling one by one, and the first note head pulses once (scale 1.15, no glow; reduced-motion: static outline).

**Layout at 320×720 (run screen, before / during / after)**
```
┌ 16 ┬────────── 288 ──────────┬ 16 ┐
│  ‹  C major · 1 oct · RH          │  56  header (title 2 lines max)
│  1/24   [Free][♩=40][♩=55][♩=66]  │  36  ladder chips (current = ink, passed = teal ✓)
│ ┌───────────────────────────────┐ │
│ │ ♪ score, 1–2 bars, big heads  │ │ 220  score card (2.5 px ink, 4 px shadow)
│ │ next line faded               │ │
│ └───────────────────────────────┘ │
│  ▮▮▯▮ velocity (only if goal)     │  14
│  ◂ [   ═══╪═══   ] ▸   12 in a row│  36  pocket meter + streak
│                                   │
│  [ ▶ Play ]  (mega)               │  64  / Stop (ghost)
│  hint line (one line, MIDI etc.)  │  20
└───────────────────────────────────┘  ≈ 470 used, room for the result sheet
```

**Review (after the take: the same score, frozen; replaces `TakeResult`)**
- **Verdict line, one line:** "Not yet · 14/16 notes · a bit late", in Secular One 20 px with the note-head medal glyph. Delete the duplicate ladder line: the ladder chips show the tempo step.
- **The score stays where it was**, now with every mark. A tap on a note opens a one-line detail chip: "E4 · 42 ms late · mf".
- **Error map** (a 288×18 px strip above the actions): one cell per bar, filled by the worst mark in the bar (teal / tangerine / purple / pink / dashed), with the bar number under it in 10 px. A tap on a cell selects that bar range (drag for several).
- **Three stat chips** (they replace the stats line and both charts):
  - **Notes** `14/16`.
  - **Time:** a mini pocket meter with the mean and the spread, labelled "± 38 ms".
  - **Even:** 5 waveform bars for the hand evenness grade (the v2 progress motif), with R/L when hands together.
  - "Why?" opens the full charts (timing per note, loudness per note) in a sheet. They are not on the main screen.
- **Actions, one row:**
  - **Again** (primary, starts at once per the "Again starts at once" rule);
  - **Loop bars 3–4** (shown when a bar is selected, or automatically for the worst bar). It runs the slice at −10%, with a 1-bar count-in, until 2 clean passes, then offers "Whole item";
  - **Next**.
  - "Slower −10%" and "Once in free time" move into the verdict line as a single smart suggestion: "Try at ♩ 60?" when accuracy is below 60%, and "Same tempo — wait for the click" when rushing (the existing `rushing` logic).
- **Soft failure:** if accuracy is below 40%, show only the verdict, the error map and the one suggestion. No numbers.
- **Take overlay (ghost):** a toggle "Last take" draws the previous take's ticks at 35% under the current ones, so progress shows on the same notes.

### 4.2 Keys/piano
- **Grand staff** for hands-together items, with the treble and bass staves in one card. On a phone, one bar per line for 8+ notes a bar.
- **Finger numbers** in ink, 11 px, above RH / below LH (not coloured). Hidden after 2 clean takes, matching the fingering setting.
- **Pedal goals:** a pedal line under the bass staff (𝆮 … ✱ brackets), filled teal or pink per pedal event in review.
- **Voicing/chord items:** the head-per-note rule applies to every chord tone. The chord gets a tiny "3/4" badge when partly right (partial credit), never a single colour.
- **MIDI absent:** one hint line "MIDI gives loudness and hands — connect in Settings", not three.
- **Key map** (the family page):
  - 12 cells in fifths order (keep), with **fills in the v2 dynamic scale** instead of mint shades: untried = dashed outline; ok = lilac 35%; strong = purple with paper text; weak = paper with a pink ✕ corner tab.
  - Cells grow to 22×32 px (12 × 22 + 11 × 2 gaps = 286 px) with 13 px Secular One letters. Each level row gets a compact strip only after it has been played.

### 4.3 Guitar
- **Tab:** six string lines at 9 px spacing (bass: four), fret digits 13 px Rubik semibold in ink on a paper knock-out. Card outline 2.5 px plus shadow, like the staff.
- Technique letters (h p / b ~ PM) 11 px above.
- Picking strokes ⊓ V go under the tab only when "show picking" is on.
- **Finger colour:** never on the digits. Offer finger numbers as small ink subscripts (Yousician's colour-by-finger fails both contrast and colour blindness).
- **Now-cue: a lemon note-head "ball"** (12 px, ink outline) that hops along the top string line from column to column on each onset, with the lemon playhead behind it. This is our answer to Yousician's bouncing ball, in the tilted-note-head motif.
- **Strummed chords:**
  - in review, a chord diagram chip per chord with each string's dot teal (rang) or dashed (muted/missed), using the existing `guitar.ring` data;
  - strum arrows ↓↑ coloured by timing (tangerine/purple ticks).
- **Staff + tab together:** stacked in one card, tab under staff, and only when the setting says both.

### 4.4 Bass
- Same tab and staff rules as guitar.
- **Pocket lane:** a 16 px lane above the tab with the **kick drum hits as small ink bars**, so "lock with the kick" is visible. The bass note's timing tick is measured and drawn against the kick, not the click, where the drill has drums.
- **Chord chart under the tab:** cells in the shared chart style (§4.7).
- The model-line link becomes a small icon button in the card corner.
- **Headphones gate:** shown once per session as a sheet, not inline every item; the choice is remembered in settings. This frees about 160 px.

### 4.5 Drums
- **Drill lanes (horizontal, in the score card):**
  - Lanes 22 px tall (3 lanes → 66 px, 5 lanes → 110 px).
  - Lane names as **icons** (`KitIcon` from `Highway.tsx:93`) in a 24 px column, not 6 px words.
  - Order top to bottom: cymbals (crash/ride/hat), snare, toms, kick.
  - Head shapes:
    - cymbal = ✕ head 10 px;
    - drum = ● 10 px;
    - ghost = hollow ( ) 8 px;
    - accent = ● 12 px with a thick ink outline and ">" above;
    - open hat = ○ with a small "o".
  - **The kick is drawn as a full-width short bar at the bottom of the lanes** (Clone Hero), so feet read at a glance.
  - Drop the "Big = accent…" legend; the shapes are self-evident once they are this size. Keep a "?" sheet.
- **Notation view:** the same marks (teal heads, ticks, pink ✕, dashed), with drum heads 9 px minimum and one bar per line on phones.
- **Live meter:** **per-limb pocket rows** (RH / LH / RF / LF, only the limbs the groove uses), each a thin 8 px row with its own needle.
  - Drummers' errors are almost always one limb rushing; this shows which.
  - Velocity bars for accent/ghost items only.
- **Review:**
  - the error map per bar, plus a **limb split** chip row: "Kick ◂ 22 ms · Snare ✓ · Hat ▸ 14 ms";
  - the existing `drumLimbLine` text moves behind "Why?".
- **Highway game:**
  - Vertical road, kept. **Kick as a bar across all lanes.** Cymbals ✕ gems, drums ● gems.
  - The hit line is a 4 px lemon line with an ink edge (now).
  - **The flash text is replaced by a per-gem mark at the hit line**: teal burst for good, a tangerine tick to the left or a purple tick to the right for early/late, a pink ✕ for wrong, and a dashed ring for missed. Text "Perfect" etc. is dropped (it is unreadable at 2.5:1 on purple, and lemon must not mean "perfect").
  - No glow anywhere: near-gems scale up with the ink outline only.
  - The setup fits one screen: tempo and "Build it up" go into one row of chips, and sound/click go into a "More" sheet.

### 4.6 Ear/theory
- **Question card** (keep the current v2 layout), plus:
  - **The keyboard lights the asked notes** while they play (sky domain fill, ink outline). It never shows the answer before the reply; on a miss, it shows both.
  - The ask line sits **above** any input (fix grid dictation, where it is below the pad).
- **Feedback on a miss (one line + one row):**
  - The card keeps "Not quite — listen again" (one line, pink, ink text, as now).
  - **Under it, two chips: "Yours ▶" and "Right ▶"**. Each replays the real thing: the interval/chord you picked, and the target. The keyboard lights each as it plays.
  - **The why as sound:**
    - degree questions: the note resolves to the tonic (Functional Ear Trainer);
    - chord quality: the chord, then its arpeggio;
    - interval: melodic, then harmonic.
  - Text stays behind "Why?" (rule: compact feedback).
  - The right answer button gets a teal fill and an ink ✓ glyph; the chosen wrong one a pink fill and an ink ✕. Never colour alone.
  - Drop the lemon halo around Toni's bubble (glow). Toni's "wrong" face does the work.
- **Partial credit display (dictation, chords, grids):**
  - Every part of an answer gets its own ✓/✕ glyph chip *on the part* (root, quality, extension; each note of a melody; each chord tone on a mini keyboard).
  - The feedback line counts only what was right: "Roots 3/4 · quality 4/4".
  - **The streak counts only fully right items**, but mastery gets partial credit (for example 0.75 for 3 of 4).
  - In grid dictation, add the ✓/✕ glyph to the existing teal/tangerine part underline, and recolour the selected chip from teal (voice) to ink with paper text.
- **Rhythm questions:** taps drawn as ticks against the written rhythm, with the same early/late rule. No red-for-both (ToneGym's gap).
- **Recap:** the per-item rows keep the repeat-sign motif.
  - Add a "Drill these 3" button built from the misses.
  - The streak screen must not cover the recap on first finish: show the recap, then the streak as a sheet.

### 4.7 Jazz/improv
- **Chart reading (shared by `ChartView`, `EarCard` bars, rule-card items, the bass chart and the reharm studio):**
  - **Always 4 bars per row** (fix `flex: 1 0 58px` → `grid-template-columns: repeat(4, 1fr)`). 72×52 px cells.
  - Chord letters in Secular One 18 px in `<bdi>`, with slashes in ink at 40%.
  - Bar lines are 2.5 px ink; section letters A/B in a lilac tab at the row start.
- **Playhead:**
  - The current cell gets a lemon top strip (6 px) with an ink edge, plus a lemon progress underline that fills across the bar in time. This shows where you are *inside* the bar, which a plain highlight (iReal) does not.
  - The row with the playhead stays in the top third, and the next row is always visible.
- **Loop selection:** lilac hatched cells (45°, 3 px), visibly different from now. Loop handles 44 px tall. **Stop keeps the loop**; a long-press clears it.
- **Rule card on screen:**
  - A compact rule chip strip above the chart: "Guide tone on every change · chord tones on 1 · ≤ 2 rests a bar" (1 line, horizontal scroll if long).
  - Each rule has a glyph, and the same glyph appears in a bar's corner when that bar breaks the rule.
- **Per-bar target:** for "guide tone" or "target" rules, the target note (the 3rd/7th) is printed small under the chord in each cell ("→ F") before the take.
  - After the take, the cell shows ✓ (teal corner tab) or ✕ (pink corner tab) for the target, and **the note you actually landed on**.
- **Note roles live (optional, MIDI/clear mic):** each played note pops a 6 px dot under the current cell: ink = chord tone, lilac = tension, dashed = outside. This is the Drop2 idea, drawn on the chart instead of a separate neck map to save height.
- **Review:**
  - the chart with corner tabs per bar, one line "Rules kept 6/8 bars", and the chart player's debrief (`Charts.tsx:612-640`) as the "Why?" content;
  - **Loop bars** works the same as in §4.1.
- **Reharm studio:**
  - The bar list becomes the shared chart: 4 per row, with changed bars marked by a purple corner tab.
  - Device chips open in a sheet when a bar is tapped, instead of a row under each bar. One screen.
- **Improv studio:**
  - The tabs become a 4-segment control that fits 288 px (short labels: Rules / Phrase / Vary / Trade).
  - The challenge list keeps its rows, with the progress dots replaced by 5 waveform bars (v2 motif, 14 px tall).

### 4.8 Accessibility and motion
- Every mark has a shape twin. The review is readable in grayscale; check it with the existing `contrast.mjs` and `yellow.mjs`.
- `aria-live="polite"` on the verdict line only, not on every live mark. The live meter is `aria-hidden`.
- On "Why?", a screen-reader summary: "14 of 16 notes right. 2 late, 1 early. Worst bar: 3."
- Reduced motion: no head pulse, no ball hop (the ball jumps), and the playhead steps per note.
- Touch targets of 44 px on error-map cells (the 18 px strip grows to 44 px of hit area).

---

## 5. Build checklist (mapped to files), with slices

**Impact/effort key:** H/M/L. Slices are ordered by impact ÷ effort; each ships alone.

### Slice 1: Marks and colours, everywhere (impact H, effort L)
- [ ] `src/engine/noteMarks.ts`:
  - split `timing` into `early` | `late` with the offset (`dev`) carried through `markOf`;
  - keep `ok` / `wrong` / `missed`;
  - add `extra`.
  - Unit test: the same `TakeMetrics` gives the same counts as the score (no "all green but 83%").
- [ ] `src/ui/NoteViews.tsx:136-141`:
  - replace `MARK_RG` / `MARK_CVD` with the §4.1 palette (teal / tangerine / purple / pink / dashed);
  - draw early/late ticks as VexFlow annotations or an SVG overlay positioned from `xs`;
  - draw ✕ plus a ghost head for a wrong pitch;
  - delete the CVD proxy.
- [ ] `src/ui/DrillTake.tsx:366-376` `MarkLegend`: shapes with ink text (no coloured text), LTR-isolated.
- [ ] CSS sweep:
  - `drills.css:31` (gradient), `:107-201` (mint/gold/coral → tokens), `:358-366`, `:549-564`, `:576-580`;
  - `pulse.css:114-126` (lemon playhead with ink edge, no halo);
  - `DrumViews.tsx:504/579/618/872` (drum glyph green → pink, the rhythm domain);
  - `Drills.tsx:102` `FAM_HUE` → domain tokens only.
- [ ] `.kit-warn` and the disabled mega button: paper with an ink dashed outline and an info glyph, not pale yellow.

### Slice 2: Result → review (impact H, effort M)
- [ ] `src/ui/TakeReview.tsx` (new), replacing `TakeResult` (`DrillTake.tsx:807-900`):
  - verdict line;
  - error map (`ErrorMap` component, per-bar worst mark from `perNote` + `staffLines`);
  - three stat chips;
  - actions row;
  - "Why?" sheet holding `EvennessStrip` / `VelocityCurve` (restyled: paper background, ink axis, v2 fills).
- [ ] `Drills.tsx:1024-1070`:
  - remove the duplicate ladder line and the `MarkLegend` row (the legend moves into "Why?");
  - pass `onLoop(fromBar, toBar)`.
- [ ] Fix RTL: wrap the stat chips in `<bdi>`; no `dir="ltr"` around Hebrew words (`DrillTake.tsx:824`); "שוב ב־♩ 66" built with an isolated tempo span.
- [ ] e2e: the keys, drums and guitar result fits 320×720 with Next visible (extend `e2e/keys.spec.ts`, `drums.spec.ts`).

### Slice 3: Loop the spot (impact H, effort M)
- [ ] `src/engine/drills/slice.ts` (new): `sliceDrill(drill, fromBar, toBar)`, which re-bases beats and keeps chart, drums and band; count-in 1 bar. Unit test against `staffLines`.
- [ ] `Drills.tsx` run state: a `loop` mode (−10% bpm, 2 clean passes → "Whole item" chip); ItemState untouched by loop takes, or counted as practice only. Check with the "only measured practice counts" rule.
- [ ] Charts: the loop keeps across Stop in `Charts.tsx` (same hatch style).

### Slice 4: The score as hero, plus look-ahead and the ladder chips (impact H, effort M)
- [ ] `DrillStaff` (`DrillTake.tsx:234-363`): per-line bar count by density (1 bar a line when 8+ notes a bar on width < 400 px); faded next line; ink finger numbers 11 px; card min-height so a short item doesn't leave a hole.
- [ ] `DrillTab` (`DrillTake.tsx:86-144`) and `TabLine` (`NoteViews.tsx:258-300`): 13 px digits, outline card, no coloured fingers.
- [ ] Ladder chips: a new `TempoLadder` in `Drills.tsx:966-1000` from `rubatoStage` + `lad`; it replaces "1 / 24 · ♩ 66" with "1/24" + chips.
- [ ] One-line MIDI hint (`DrillTake.tsx:716`).
- [ ] Headphones gate → once-per-session sheet (`DrillTake.tsx:748-775`).

### Slice 5: Live marks and the pocket meter (impact H, effort H)
**Shipped (after 0.95).** `liveGrade.ts` re-runs the take's own analysis on what was played so far (a few times a second) and shows a note once settled (80 ms after a matched onset; a miss after its half-beat window), so the live marks of a finished take are the review's marks. Marks are drawn on their own SVG layer (`mk-live`), never redrawing VexFlow; drums use the same map. `PocketMeter.tsx` replaces `.drill-beat` (keeps the class and a keyed child per beat). Setting "Live marks: Always / While learning / Never" (default while learning = free / quarters steps and until 2 clean takes count); level tests are calm. Not live: acoustic-kit and piano-chord-by-mic takes (meter beats only), improvised / phrase / voicing-choice / ear items, the free-time take (no clock).

**Rest of slice 5 shipped.** The count-in cue: the first note head (staff), digit (tab) or drum head pulses once (scale 1.15, no glow) on its own SVG layer `mk-cue`; reduced motion shows a static ink outline (`html[data-motion=reduced]` and `prefers-reduced-motion`). Velocity bars (`velBars.ts`, `VelocityBars.tsx`): a 14 px row above the meter, one bar a note in four steps of the calibrated range, a dashed hollow outline at the asked level (`even-*` goals, drum `dyn` notes, ghosts at pp), an ink top on accents; shown only for a loudness, accent or velocity-evenness goal (`goal.dynamics` other than voicing, drum velocity goals, accent / ghost / dyn notes) — not for the timing evenness every scale has (that is the review's "Even" chip). Hidden in the review (the loudness chart stays behind "Why?"), so the review still fits. The ⇆ chip: `liveGrade` carries `hands` (RH − LH on the beats both hands played: size and sign); the meter shows "⇆ 42" with the leading hand's letter beside the R / L rows only above 30 ms. The take overlay: after a second take of the same item, a "Last take" chip next to "Why?" draws the previous take's ticks at 35 % under this take's marks (`mk-prior` layer; drums `data-prior` ticks).
- [x] Count-in cue, velocity bars, the ⇆ chip, the "last take" overlay.
- [x] Follow-ups: hands-together keys items show one system at a time (the RH and LH lines of the same bars, paged like the bass) — they had four to eight staff cards in a scrolling score box at 320×720; an e2e walks the first hands-together level of every keys family. A drum hit matched beyond the timing window is early / late (a tick), not a pink "wrong" (`markOf`: not ok but the right note). Hebrew drill titles wrap Latin runs in Unicode isolates (`generate.ts isoLatin`), rendered as `<bdi>` in the run header (`BidiText`).
- [x] `src/engine/drills/liveGrade.ts` (new): match each incoming onset to the nearest expected note within the window (the same matcher `analyzeTake` uses, run incrementally), emit `{index, mark, dev}`. Test: the live results equal the final `perNote` on recorded fixtures.
- [x] `DrillTake.tsx:600-660`: feed MIDI notes, mic onsets and drum hits into `liveGrade`; expose `onMark` to `DrillRun` → `DrillScore` → `NoteStaff` / `TabLine` / `LaneLine` (marks by index, drawn as an overlay so VexFlow doesn't redraw per note).
- [x] `src/ui/PocketMeter.tsx` (new): window box, needle (mean of the last 6), beat cells, streak count; R/L rows (keys) and limb rows (drums). It replaces `.drill-beat` (`DrillTake.tsx:733-736`).
- [x] Setting "Live marks" in `DrillSettingsView` (`Drills.tsx:1072`).

### Slice 6: Drums lanes, notation and Highway (impact M, effort M)
- [ ] `DrumViews.tsx:386-462` `LaneLine`: 22 px lanes, icon names, ✕/●/( ) heads, kick bar, marks and ticks.
- [ ] `StaffLine` (`:170`): v2 marks, 9 px heads, one bar a line on phones.
- [ ] Per-limb split chips in the review (from `m.drum`).
- [ ] `Highway.tsx:980-1080` + `v2.css:1496-1545` + `games3.css:144-201`:
  - kick bar, gem shapes, lemon hit line, per-gem marks instead of text flashes;
  - remove the glows and the `games3` legacy rules;
  - make the setup fit one screen (`Highway.tsx:622-820`).

### Slice 7: Ear: replay pair, keyboard lights, partial-credit glyphs (impact M, effort M)
- [ ] `Lesson.tsx:1060-1145` `Feedback`: "Yours ▶ / Right ▶" chips (play `f.given` and the target through the question's own sound builder); the sound-why per question kind.
- [ ] `Lesson.tsx:596-640`: light the keyboard during playback (`keysLive` path in `NoteViews.tsx:362-380`).
- [ ] Answer buttons: a ✓/✕ glyph on `.answer.is-right` / `.is-wrong` (`v2.css:251-262`).
- [ ] Remove Toni's halo on feedback.
- [ ] `GridDictation.tsx`: move the ask above the pad (in `Lesson.tsx` layout for `q.kind === 'grid'`), add ✓/✕ to `.gd-p.ok` / `.bad` (`grid.css:116-120`), ink selected chips, higher-contrast disabled chips.
- [ ] Partial mastery credit: in the rating update for grid / chord / dictation (where `gridLine` is computed), add a fractional score; the streak stays whole-items only.
- [ ] Recap: "Drill these 3", and the streak sheet after the recap (`Recap.tsx`, `App.tsx` streak trigger).

### Slice 8: Jazz chart, rule chips, per-bar targets (impact M, effort M)
**Shipped (after 0.95), first part.** `ChordChart.tsx` ("דף אקורדים") + `chartCells.ts` replace `ChartView`, the `EarCard` bars and the `.song-chart` lists; rule chips carry numbers, a broken bar's corner tab shows those numbers; target cards (`guide-target`, `three-on-one`) print "→ F/C" before the take and the landed note after; `m.improv[].bars` (from the cards' `miss` beats) and `m.landings`. A rule-card take's review shows the chart in place of the landings staff, with "Rules kept n/m bars". 

**Rest of slice 8 shipped.** The reharm studio's bars are the shared chart (eight bars a page, four a row, two chords in one cell set smaller), a reharmonised bar gets a purple corner tab, and a tapped bar opens its devices in a sheet (`data-rh-sheet`). The chart player's `ch-grid` is the shared chart too (the bar being played lit with the in-bar underline; a teal / pink corner tab per judged bar after a rules take; with "scale" rules each bar names its scale and is a button to the scale picker; long charts scroll inside the grid). Note-role dots: while a rule-card take runs (`goal.improv`, MIDI or microphone), each improvised note heard puts a 6 px dot under its bar — ink = chord tone, lilac = tension (a note of the chord's usual chord-scale, `ruleCards.autoScale`), dashed = outside — the last six a bar (`chartCells.noteRoles`). Standard chord-scale theory only; no named-method labels. The improv studio's modes are one segmented control with short labels (Rules / Phrase / Vary / Trade, and Lick when you have licks); a challenge's level is 5 waveform bars (14 px). The key map: untried dashed, fine lilac 35 %, strong purple with paper text, weak paper with a pink ✕ corner tab; 22 × 32 px cells, 13 px Secular One (the family card's strip already shows only after a level has been played). Comp Caller's own `.cc-bar` rules (`newgames.css`) were global and repainted every shared chart (rounded cells, purple "now"); they are now scoped to `.cc-bars .cc-bar`.
- [x] `src/ui/ChordChart.tsx` (new, shared): 4-per-row grid, lemon now strip + in-bar progress underline, loop hatch, corner tabs, per-bar sub-line (target / landed).
  - Replace `ChartView` (`DrillTake.tsx:146`), the `EarCard` bars (`:177`), the `.song-chart` list (`DrillTake.tsx:331-345`), the reharm `rh-bars` (`ReharmStudio.tsx:95-118`), and later the chart player's `ch-bar` (`Charts.tsx:470-480`).
- [x] Rule chip strip from `drill.goal.free` / `RuleSet`, with glyphs (`ImprovRules.tsx` `RULE_NAME`).
- [x] Per-bar rule result: carry `bars[].breaks` (as in `rulesRep`) into `m.improv` for drill takes (`src/engine/drills/ctFreeAnalyze.ts` / `freeCompAnalyze.ts`) and draw the corner tabs.
- [x] Improv studio tabs as a 4-segment control (`ImprovStudio.tsx`); waveform-bar progress in `ChallengeList` (`ImprovRules.tsx:104`).
- [x] The key map recolour and bigger cells (`KeyMap12.tsx`, `drills.css:576-582`, `Drills.tsx:640-660`).
- [x] The reharm studio's bars and the chart player's `ch-bar` on the shared `ChordChart` (purple "changed" tab, device sheet; scale sub-line, corner tabs).
- [x] Note-role dots under the bar while a rule-card take runs (`chartCells.noteRoles`).

### Slice 9: Guitar ball and bass pocket lane (impact M, effort M)
- [ ] `NowColumn` (`NoteViews.tsx:100-119`) gets a `ball` variant for tab: a lemon tilted note head that hops by onset (reduced motion: jumps).
- [ ] Chord-ring chips in review from `guitar.ring`.
- [ ] Bass pocket lane: kick hits from `drill.drums` drawn over the tab; timing measured against the kick in `bassAnalyze.ts` where drums are present.

### Slice 10: Crawl (impact M, effort L)
- [ ] Re-run this audit's screenshots (a temporary spec like the one used here, 320×720, en and he) and `contrast.mjs` / `yellow.mjs`.
- [ ] Add a guard e2e: no `#3ccf97`, `#1f8f67`, `#4CD07D` or `linear-gradient` in run screens; result fits; Next visible.

**Hotfix before any slice:** the reharm studio layout at 320 px (§3.2, Jazz): 2 bars a page on phones, device chips in a sheet, `white-space: nowrap` on chord symbols, inside `<bdi>`.

**Order to build:** 1 → 2 → 3 → 4 give the biggest visible jump for the least risk (no engine changes beyond `noteMarks` and the slice helper). Slice 5 is the "beat every competitor" piece (live per-note marks plus per-hand/per-limb pocket meters, which nobody ships together). Then 8 (jazz) and 6 (drums), 7 (ear), 9, and 10.

---

## Sources
- **Simply Piano:** pianistscompass.org/?p=9588 · keyboardkraze.com/simply-piano-review
- **Flowkey:** pianistscompass.org/?p=6933
- **Playground Sessions:** pianistscompass.org/?p=8094
- **Skoove:** pianistscompass.org/?p=5737
- **Piano Marvel:** pianistscompass.org/?p=15455 · support.pianomarvel.com (scoring, iOS latency) · pianomarvel.com/feature/sasr
- **Melodics:** melodics.com/lessons · support.melodics.com/en/articles/15092017-lesson-scoring · support.melodics.com/en/articles/6777027-practice-mode · melodics.com/blog/pro-tips-9-steps-to-mastering-a-melodics-lessons
- **Synthesia:** apps.apple.com/us/app/synthesia/id579518445
- **Yousician:** beginnerguitarhq.com/yousician-guitar-review · support.yousician.com/hc/en-us/articles/201558362 · apps.apple.com/gb/app/id959883039
- **Rocksmith+:** Ubisoft Rocksmith+ patch notes Feb/Mar/Jun 2024 and dev diary · theriffrepeater.com
- **Songsterr:** apps.apple.com/us/app/songsterr-tabs-chords/id399211291 · guitarchalk.com/full-songsterr-review
- **Guitar Pro:** guitar-pro.com/docs/gp8/audio/playback/speed
- **Fender Play:** play-support.fender.com/hc/en-us/articles/44539103448987 · education-support.fender.com (Feedback Mode)
- **Justin Guitar:** community.justinguitar.com/t/my-concern-with-the-way-the-app-works/75193
- **Drumeo:** drumeo.com/trial-key
- **Clone Hero:** wiki.clonehero.net (how to play, dictionary)
- **Groove Scribe:** tomtommag.com (2017 Groove Scribe article)
- **Moises:** apps.apple.com/us/app/id1515796612
- **EarMaster:** apps.apple.com/app/id1492991594 · earmaster.com/forum (p=7134, 11053, 12329, 6647)
- **Tenuto:** apps.apple.com/us/app/tenuto/id459313476 · musictheory.net/products/tenuto/features
- **Functional Ear Trainer:** apps.apple.com/app/id1088761926
- **Complete Ear Trainer:** apps.apple.com/app/id1012455471
- **Auralia:** risingsoftware.com/auralia/tour
- **Teoria:** teoria.com/en/help/exercises (kne, c3c, md, v2)
- **ToneGym:** tonegym.co/exercise/rhythm · producerhive.com/?p=24415
- **Perfect Ear:** apps.apple.com/app/id1440768353
- **iReal Pro:** apps.apple.com/app/id298206806 · forums.irealpro.com (looping ideas, landscape scrolling, highlight) · learnjazzstandards.com/?p=184687
- **Open Studio:** openstudiojazz.com/gps/ · soundslice.com/users/openstudio/about
- **Band-in-a-Box:** apps.apple.com/app/band-in-a-box/id397173717 · pgmusic.com/support.ios.htm
- **Drop2 jazz guitar:** apps.apple.com/app/id6760590384

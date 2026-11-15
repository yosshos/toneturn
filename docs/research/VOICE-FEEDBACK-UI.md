# VOICE-FEEDBACK-UI: live singing feedback, research and spec

Date: 2026-11-15. Scope: the real-time view the singer watches while singing (holds, melodies, songs), and the review right after a take. The goal is a view that is clearer and better-looking than any competitor's, inside the v2 language (docs/SPEC-REDESIGN.md).

**Evidence levels.** Each claim below has one of three markers:
- **[V]**: verified this session from an App Store listing, the developer's own page or a published review.
- **[K]**: from widely known public demos, screenshots or general knowledge of the product, but not re-verified this session.
- **[R]**: a recommendation (ours).

---

## 0. Who is "Ella"?

**Ella: Sight Singing & Reading** is an iOS, iPadOS, macOS and visionOS app by Ensemble Education, Inc. (© Hirsh Group LLC). It is free, has no in-app purchases, and is rated about 4.8 from about 1.2K ratings [V].

No AI vocal-coach app named "Ella" turned up in App Store or web searches. The owner almost certainly means this one: it is the well-known singing app with that name, and it fits the "real-time singing feedback" description.

What Ella shows [V, App Store listing and reviews]:
- an **on-screen tuner on every exercise**, driven by the mic;
- after the take:
  - an **intonation score** (per note) and an **interval score** (per interval);
  - a **pitch-over-time line graph against piano notes**;
  - the vibrato of any note, by tapping it;
  - a **"vibrato average" line**, added in 2021;
- Practice mode (hear it first) and Play mode (scored, with high scores and leaderboards per collection);
- a drone option, harmony and theory collections, and whistling support.

What reviewers say [V]:
- **Praise:** "clean design", "keeps you honest" (hearing the pitch played back), exercises that do not repeat, and stars as a mild game layer.
- **Complaint (choir director):** it **penalises even slight vibrato**, which can push singers toward unhealthy straight tone. Exercises span about an octave and a fifth, beyond a comfortable range, so the reviewer asks for a personal range setting. The developer replied that the vibrato handling in the pitch algorithm was being improved.

**Lessons for ToneTurn:**
- Measure intonation at the **vibrato centre**, never frame by frame. We already do this: `holdMetrics` uses the trend (`src/engine/vocal.ts:242-244`).
- Fit everything to the singer's range. We already do this too: `fitToRange` and `itemTargets`.

---

## 1. Competitor teardown

| App | Target notes | Live pitch | Accuracy | Vibrato | Timing | Lyrics | Score / review | Praise / complaints |
|---|---|---|---|---|---|---|---|---|
| **Ella** (sight singing) | Staff notation plus a piano-note grid in the graph [V] | On-screen tuner [V] | Per-note intonation score, per-interval score [V] | Tap a note to inspect it; vibrato average line [V] | Not described | None (solfège / reading) | Pitch-vs-time graph after the take, stars, leaderboards [V] | + clean, honest. − punishes vibrato; range too wide [V] |
| **Yousician Singing** | Scrolling "Guitar Hero-style" note lane [V]; a synth-choir guide tone in early lessons [V] | Own pitch shown with the reference [V]; a pitch marker on the lane [K] | Notes fill or light up when hit [K] | None | Lane scroll and the now-line [K] | Under the notes [K] | Stars, badges, streaks [V] | + technique-first, harmony workout. − stricter than Simply Sing; streak and badge guilt [V] |
| **Simply Sing** (JoyTunes) | Landscape: notes like Smule. Portrait: lyrics-first [V] | A live dot on the lane [K] | Hit / miss per note [V] | None | Lane scroll [K] | Big karaoke lyrics in portrait [V] | Simple stars, plus timing and notes-hit info. A replay shows hit/missed notes but **not your voice** [V] | + forgiving, auto-key to range, guide vocal at 0/50/100 % [V]. − scores in-key harmony as "wrong"; octave misreads after a range change; "very basic"; no recording [V] |
| **Smule** | Horizontal pitch bars scrolling right to left above the lyrics [V/K] | A pitch marker and a short trail at the now-line [K] | Bars light up when matched; a running score [K] | None | Bars and a lyric wipe [K] | Large karaoke lyrics with a word wipe [K] | Score, then social sharing [K] | + polished, social. − clutter; scoring can feel opaque [K] |
| **SingStar / Let's Sing / UltraStar** | Note bars on a piano-roll lane scrolling right to left; **golden notes** worth 2× [V] | The player's pitch is **painted over the bars** (fill) [V] | The bar fills in the player's colour; line ratings such as "Good / Great / Perfect" [K]; line bonus [V] | None (vibrato just shows as a wobbly fill) | The scroll is the timing; timing counts in the score [V] | A two-line lyric wipe [K] | Total score, line ratings; **blind mode** hides the bars [V] | + instantly readable fill metaphor. − encourages chasing bars over the music; party look [K] |
| **Vanido** | Lines or exercise path; a ball rides the pitch [V/K] | A "squiggly line" [V] | Line-to-target distance [V] | None | Exercise scroll | None | Daily exercise progress [K] | + good pocket coach, accurate range [V]. − "lost watching the squiggly line"; pitch only, no technique [V] |
| **Singing Carrots** (pitch monitor and AI coach) | A virtual piano; target keys [V] | **Note name in scientific notation (A3, F#4), "–" when silent**; a line dropping from the sung key [V] | Line straightness [V] | Only implied, as a wavy line [V] | None | None | Per-note feedback in the coach [V vendor] | + free, simple. − no vibrato numbers [V] |
| **Erol Singer's Studio** | Notes on a piano-keyboard axis [K] | A scrolling pitch graph against the keyboard [K] | Visual distance only [K] | Visible as a wave in the graph [K] | Exercise playback [K] | Song lyrics in songs mode [K] | Record and replay [K] | Search found no published review |
| **Swiftscales** | A piano-led scale trainer [V] | **No live pitch scoring** (warm-up and scales focus) [V] | None | None | The coach's piano | None | None | + best for warm-ups [V] |
| **Sing Sharp** | Exercises and songs [V] | Real-time pitch detector [V] | Score [V] | A "Vibrato Pro" module about technique, not measured [V] | None | Songs | Paywalled [V] | − "not worth it without buying it all", few songs [V] |
| **Singscope** | None (an analyser) | A scrolling pitch graph [V] | Stability, read from the graph [V] | **Vibrato characteristics visible in the scope** [V] | None | None | Record and analyse | + "best pitch identifying app". − misreads chest / fry; pitches high notes a little flat [V] |
| **OnPitch / Nail the Pitch / AudioPitch** | A piano roll [V] | Line on the roll; sharp/flat and by how much (OnPitch) [V] | Cents [V] | OnPitch: **vibrato and drift over time**; Nail the Pitch: zoom in to see slides and vibrato [V] | None | None | Recording, MIDI export (Pro) [V] | Vendor claims only |
| **Vocal Pitch Monitor** (Yamaoka) | None | A real-time time × scale graph [V] | Visual only | Visible as a wave | None | None | 3-min recording and replay [V] | 2.5★, stale since 2021 [V] |
| **Riyaz** | Swar exercises against a reference singer [V] | Real-time pitch feedback [V] | **% match against a reference singer** [V] | None stated | None | Songs | % per attempt [V] | − pitch-detection accuracy complaints [V third-party] |
| **Tunable** (tuner) | None | Needle and cents, plus a **"Sustained Pitch History" white line: the straighter, the steadier** [V] | Cents and a steadiness view [V] | Visible as a wave | Built-in metronome | None | **Practice score and per-note graphs per recording** [V] | + accuracy, interface [V] |
| **TonalEnergy / Tuner T1** style tuners | None | Needle or strobe plus a large note name [K] | Cents, an in-tune colour flash [K] | None | Metronome | None | History graph (TE) [K] | + very fast and clear; the large note name is the hero [K] |
| **Melodyne** (pro editor) | — | Pitch "blobs" per note, with the pitch curve drawn through each blob [K] | The blob's centre against the semitone grid [K] | **Vibrato visible as the wiggle in the curve, and editable** [K] | Note start and end | — | Offline only | The gold standard for *post-take* clarity: a note is a shape, and the curve shows its life [K] |

**Pattern.** No consumer singing app shows a **live vibrato rate and depth** or a **live stability meter** [V/K]. The tools that show vibrato at all (Ella, Singscope, OnPitch, Melodyne) do it **after the take**, as a wiggle in a curve. This is ToneTurn's opening: our engine already measures rate, extent, regularity, jitter, shimmer, settle, scoop, drift and stability (`src/engine/vocal.ts:135-304`).

---

## 2. Best ideas to adopt, and mistakes to avoid

### Adopt
1. **The fill metaphor** (SingStar / UltraStar). The target block fills with colour while you are in its zone. You can read it peripherally, which a line-to-line distance never allows.
2. **A big note-name hero** (tuners, Singing Carrots). One large note name ("A4", "–" when silent) answers "what am I singing?" instantly.
3. **"Straighter line = steadier"** (Tunable's pitch history). It turns stability into something you can see, not just a number.
4. **The Melodyne-style review.** Every note is a shape, the curve runs through it, and tapping a note gives its cents and vibrato. Ella's tap-to-inspect is the consumer version of this.
5. **Score the vibrato centre** (Ella's lesson). Never punish healthy vibrato, and show the centre line through the wave.
6. **Hear yourself, synced** (Ella's "keeps you honest"; Simply Sing is criticised for lacking it). Play the recording with a playhead over the curve.
7. **Golden notes, used sparingly** (UltraStar). One or two notes per phrase marked as "the money note" (a long note or a top note). The mature version: those notes get the stability and vibrato read-outs.
8. **Blind mode / fading support** (UltraStar blind mode). Hide the targets on later takes and keep only the trail, which matches our "hidden" scale and ear items.
9. **Range-fitted key** (Simply Sing, Vanido). Already in ToneTurn (`fitToRange`). Show the range on the lane so the singer sees *why* the key was chosen.

### Avoid
1. **A jittery raw trail** (Vanido: "lost watching the squiggly line"). Smooth the *display* only, gate on confidence, and break the line on silence.
2. **Octave misreads drawn as wild jumps** (Simply Sing, Singscope). Use an octave guard plus folding, and draw a "right note, other octave" marker instead of a spike.
3. **Punishing in-key harmony or vibrato** (Simply Sing, Ella).
4. **Clutter**: a score, combo, stars and lyrics all moving at once (karaoke games). Show at most **one moving thing** (the lane) plus **one number** (the note) while singing.
5. **Gamified guilt** (Yousician streak complaints). Celebrate a good take with a calm stamp, not with confetti.
6. **No post-take audio** (Simply Sing). We keep the takes (`keepTake`), so always offer playback.
7. **Red/green accuracy colours.** About 8 % of men cannot tell them apart, and green is banned in v2 anyway.

---

## 3. ToneTurn today, with file:line references

### Pipeline
- **Capture.** `src/speech/pitchCapture.ts:11-110` has raw mic (no echo cancellation, AGC or noise suppression; good) and an `AnalyserNode` at fftSize 2048 (≈43 ms at 48 kHz). It polls on a `setInterval` with a 20–33 ms hop (`:77`, `:109`), not in an AudioWorklet or rAF.
- **Detector.** YIN with threshold 0.15, 70–1100 Hz, parabolic interpolation (`src/engine/yin.ts:60-109`). There is **no octave-error guard or temporal smoothing** in the detector. Confidence = 1 − CMND.
- **Gating.** "Voiced" means confidence ≥ 0.8 everywhere (`pitchCapture.ts:94`, `vocal.ts:74-84`, `Vocal.tsx:112`, `SingAlong.tsx:36`).
- **Octave handling.** In grading, cents are folded into ±600 (`vocal.ts:79-80`), and wrong-octave melody notes are flagged (`MelodyNote.octave`, `vocal.ts:360`). The live view folds each frame toward the targets' centre (`Vocal.tsx:122`).
- **Live render rate.** `setFrames(buf.slice())` runs every 3rd frame in `VocalSession` (`Vocal.tsx:863`) and every 4th in timed takes (`VoiceTimed.tsx:751`). Each one is a React re-render that **copies and redraws the whole take**. The work grows over time, and there is no rAF.

### What is measured (engine) vs what is shown live

| Measured (file:line) | Shown live? | Shown after? |
|---|---|---|
| Per-frame cents vs target (`centsTrack`, `vocal.ts:74`) | Only as the raw trace position | As a metric bar (mean) |
| Mean intonation at the vibrato centre (`vocal.ts:244`) | **No** | Yes, a metric bar |
| Stability, the residual std (`vocal.ts:243`) | **No** | Yes |
| Settle time and scoop at the onset (`vocal.ts:225-237`) | **No** | Yes, metric and remark |
| Drift ¢/s (`vocal.ts:245`) | **No** | Metric |
| Vibrato rate, extent, regularity, jitter, shimmer, on/off times, switches (`vocal.ts:135-176`, `:266-284`) | **No.** The only live vibrato cue is a pulsing dot at the *target* rate (`Vocal.tsx:1195`) | Metric bars only, top 4 by weight (`Vocal.tsx:153`) |
| Best in-tune stretch (`vocal.ts:249-257`) | **No** | Metric |
| Loudness range (`vocal.ts:259-264`) | **No** | Messa / dynamic metrics |
| Melody per-note cents, settle, overshoot, octave (`vocal.ts:353-373`) | **No** | Only as a text remark (`Vocal.tsx:1104-1106`). **Per-note cents never appear as a visual** |
| Onset timing ms and feel (`VoiceTimed.tsx:860-883`) | Beat strip and the PulseNotes now-cue | One text line |
| Range (`rangeFromGlide`, `vocal.ts:30`) | The calibration trace with fold off (`Vocal.tsx:708`) | Range map |

### Current components
- **`PitchTrace`** (`Vocal.tsx:106-147`): a 320×140 SVG.
  - Targets are dashed lines with a ±25 ¢ band (`:134-139`).
  - The x-axis **rescales as the take grows** (`:114-115`), so nothing scrolls and there is no now-line.
  - Off-range pitch is **clamped flat at the edge** (`:127`), which hides how far off it was.
  - There is no time grid, note names or cents scale.
  - The trace is not coloured by accuracy.
- **`MetricBars`** (`Vocal.tsx:151-169`) and **`Bars`** (`VoiceTimed.tsx:839-857`): four text and bar rows, good/fair/weak classes. Readable, but abstract: nothing ties a number back to *where* in the take it happened.
- **`Sparkline`** (`Vocal.tsx:171-181`): trends across takes.
- **The hold meter** (`Vocal.tsx:1220-1225`) is a **time-only** progress bar ("hold for N s"). It ignores whether the hold is steady.
- **Live cue text** for vibrato on/off and alternating (`Vocal.tsx:1086-1099`, `:1226-1230`).
- **`SingRoll`** (`SingAlong.tsx:25-52`), used in `SingAlong` and `VoiceTimed.tsx:303-309`.
  - It is the best live view so far: a 4 s window, a cursor 1 s from the left, and note blocks ±0.4 semitone.
  - But it shows a single polyline in the same colour, has no accuracy feedback, and the cursor is tangerine (`vocal.css:567-569`) rather than the lemon "now".
- **`CentsNeedle`** (`HarmonyHold.tsx:53-69`, also `SingInterval.tsx:275`): a horizontal dot plus a window, with "flat / sharp" words and signed ¢. A good seed for the accuracy meter.
- **`PulseNotes`** (`src/ui/PulseNotes.tsx:91`): the count-in and lit-note now-cue (the timing-cue rule). Keep it.
- **`BeatStrip` / `ChordStrip`** (`VoiceTimed.tsx:807-837`): the eighth-cell strip and the lit chord bar.

### v2 violations in the voice views (fix whatever else happens)
- `.trace-line` is stroked `var(--gold)`, which is lemon (`vocal.css:139-141`). **Lemon is reserved for "now"**, so the past trace must not be lemon.
- `.trace-band` uses a hard-coded old mint `rgba(75,227,181,.16)` (`vocal.css:130-132`): a green-ish tint, against the **no green** rule.
- `.pitch-trace` sits on a dark `rgba(0,0,0,.22)` background with a 1 px line border (`vocal.css:118-124`): old dark-theme look, with no 2.5 px ink outline.
- `.roll-note` uses `rgba(169,139,255,.45)` and `.roll-cursor` uses coral (`vocal.css:561-569`).
- The "■" glyph inside buttons (`Vocal.tsx:1311`, `VoiceTimed.tsx:380`) and "〰" in vibrato marks (`Vocal.tsx:1190`) are text glyphs where our icon set should be used.

---

## 4. Design spec: the ToneTurn live singing view ("SingLane")

### 4.1 Principles [R]
- **One moving thing.** Only the lane moves. Everything else changes state in steps (≤ 4 Hz), never continuously.
- **Peripheral first.** You should be able to read your accuracy from the *corner of your eye* by fill and position, without reading numbers. Numbers are for the pause between takes.
- **Same picture before, during and after.** The review is the live lane frozen and annotated, not a different chart.
- **Colour never carries meaning alone.** Every colour has a position or shape twin.
- **It fits 320×720 without scrolling** (the "exercise fits one screen" rule).

### 4.2 Layout at 320×720 (portrait)

```
┌──────────────────────────── 320 ───┐
│ ← Title · item 2/5                 │  48  header (existing)
│ Instruction, one line              │  28  .vocal-instr (clamp 1 line, "?" opens the brief)
├────────────────────────────────────┤
│  A4  ▲+12¢          ◉ 5.8 Hz ±40¢ │  64  READOUT ROW: note hero · cents chip · vibrato chip
├────────────────────────────────────┤
│ ┊B4 │░░│      ┃            ▭▭▭     │
│ ┊A4 │▓▓│~~~~~~┃▬▬▬▬▬▬▬            │ 280  PITCH LANE (LTR always)
│ ┊G4 │░░│      ┃      ▭▭▭▭          │      left gutter = note ruler + range band
│ ┊   │  │      ┃ now-line (lemon)   │
├────────────────────────────────────┤
│ ♭ ─────[ ▓▓zone▓▓ ]───── ♯   ●     │  40  ACCURACY METER (zone band + note-head needle)
│ ▮▮▮▮▮▮▮▯▯▯▯▯  3.2 / 6 s            │  40  SUSTAIN BARS (waveform bars = time × steadiness)
├────────────────────────────────────┤
│      [  ■ Stop  ]   [ ↻ ]          │  72  actions (existing .vocal-actions)
└────────────────────────────────────┘     ≈ 572 + gaps 8×10 → ~650, fits 720 with safe areas
```

Landscape and wide screens: the lane takes 60 % of the width, with the readout, meter and bars as a column beside it.

### 4.3 The pitch lane
- **Orientation.** Pitch runs up, time runs **left → right in both languages** (SPEC-REDESIGN: "staff, keys, neck and charts stay LTR"). Set `dir="ltr"` on the lane.
- **The now-line** sits at **x = 30 %**. The past trail is to its left, upcoming targets to its right. This is the karaoke convention (SingStar, Smule, Yousician), and it matches `SingRoll`'s cursor-at-1 s idea.
- **Window.** 4 s visible for melodies and songs (≈ 1.2 s past, 2.8 s future). For a sustained hold, the window is the whole item (`item.seconds + 1`), and the now-line *travels* across a still lane, so there is no scroll on holds.
- **Vertical scale.** The target span ± 3 semitones, but **never less than 7 semitones** in total.
  - Off-scale pitch is **not clamped flat**. It shows an edge chevron (▲ / ▼) at the top or bottom at the current x, carrying the semitone distance ("+5").
- **Target blocks.** Rounded rectangles (radius 6), **height = one semitone (±50 ¢)**, width = duration, 2.5 px ink outline.
  - **Fill states:**
    - upcoming: paper with a lilac 25 % tint;
    - the **current block: a 4 px lemon strip along its top edge** (lemon = now; no glow);
    - past: as graded (see 4.10).
  - **Zone stripe.** Inside each block, a horizontal inner band at the item's in-zone tolerance. Its height comes from `BANDS.intonation`: excellent ±10, good ±20, fair ±35 ¢. Use the level's tolerance: ±35 ¢ for beginner levels, ±20 middle, ±10 for fine-tune and advanced.
    - Draw it as a slightly darker tint of the block with no outline. This is the **"in the zone" band per note**.
  - **Fill-as-you-hit.** While the smoothed pitch is inside the zone stripe, the block **fills from its left edge to the now-line in teal** (voice colour). Outside the zone but within ±50 ¢, it fills **hatched teal** ("close"). Further off, there is no fill.
    - This is the hero feedback: a fully teal block = a clean note.
- **The live trail.**
  - A 2.5 px **ink** polyline, with round joins, drawn from the *display-smoothed* pitch (4.11).
  - **Breaks** on unvoiced frames (gap > 60 ms), so it never draws lines through silence.
  - While a segment is above the zone it is drawn **tangerine**, below the zone **purple**; in the zone, ink. These are only short tinted segments, and the line keeps its position meaning.
  - The trail's last point carries a **tilted note head** (the v2 motif, 10 px, ink fill) sitting on the now-line. This "you are here" marker is the single strongest live element.
- **The wrong octave.** If the octave guard (4.11) sees the right pitch class in another octave for more than 150 ms, draw the trail folded onto the target. Add a small "8va" / "8vb" tag on the note head, and the block gets a dashed outline (not a fill). Grading already refuses these notes (`MelodyNote.octave`).
- **Beat grid.** Thin vertical lines (`--line`, 1 px) at each beat; bar lines 2 px `--line-strong`. They scroll with the lane. Count-in beats appear *before* the first block as four ticks that **fill lemon one at a time** on each click, so the timing cue reaches the lane itself.
- **Golden notes ("money notes").** Long top notes or a phrase's final long note get a **double outline** (2.5 px ink + 2 px gap + 1 px ink), not gold. Only these notes get the vibrato and stability readouts in melody mode.

### 4.4 Note-name readout (the readout row, inline-start)
- **The current sung note** in Secular One at 40 px, in a `<bdi>` with the octave as a small digit: **A**₄. Use the user's naming (`noteLabel(midi, settings)` with `displayNote`).
  - When silent or low-confidence it shows "–" in `--ink-dim`, as Singing Carrots does.
- **Hysteresis.** The name changes only when the new note has held for ≥ 80 ms **and** is > 60 ¢ from the old centre. This kills flicker on the ±50 ¢ border.
- **The target name** sits next to it, small and `--ink-dim` ("→ A4"), only when it differs from the sung note.
- **The cents chip.** A pill with a signed value and an arrow glyph: ▲ +12 ¢ (sharp, tangerine outline) or ▼ −8 ¢ (flat, purple outline). In the zone it shows a **teal fill and a ✓ note-head glyph, with no number**. Numbers appear only when the singer is out of the zone, so in-tune singing reads calm ("cents without anxiety").
  - The value is rounded to 5 ¢ and updated at 8 Hz.

### 4.5 Accuracy meter ("the zone")
- A horizontal bar, 40 px tall, **always LTR**: ♭ on the left and ♯ on the right (Noto Music glyphs, not words, so there is no RTL ambiguity).
- **The scale is non-linear.** The centre ±50 ¢ takes 70 % of the width; ±50–150 ¢ is compressed into the outer 30 %. Beginners see the zone as big, and wild misses do not throw the needle off-screen.
- **Zone band.** A teal-tinted box at the level's tolerance (±35, ±20 or ±10 ¢), 2.5 px ink outline, with tick marks at ±50.
- **The needle** is the tilted note head (ink). It moves with 120 ms easing from the display-smoothed cents against the *current target*.
  - Inside the zone, the zone box **fills solid teal**. Outside, the near half of the bar gets a tangerine (sharp) or purple (flat) tint.
- **Build it from `CentsNeedle`** (`HarmonyHold.tsx:53`). It becomes one shared component, `ZoneMeter`, also used by SingInterval and HarmonyHold.
- **Hide it in song mode** (4.12); the block fill does the job there.

### 4.6 Vibrato indicator (readout row, inline-end)
- **The chip.** A 96×40 rounded box that **draws a sine wave of the measured vibrato**: number of cycles in the box = rate over 1 s, amplitude = extent, using the same vertical scale as the meter so ±50 ¢ fills the box. Beside or under it: "5.8 Hz · ±40 ¢" in Rubik 12 px, LTR.
- **Target band.** When the exercise asks for something specific (`vibrato-rate`, `vibrato-width`, or a style from `EXTENT_BAND`), draw the target as a **dashed ghost sine** behind the live one. Teal fill appears when both rate and extent are in band; otherwise the off parameter shows ▲ / ▼ in tangerine or purple.
- **States:**
  - **"straight"**: a flat line with the label "ישר" or "straight";
  - **"vibrato"**: the live sine;
  - **"unsteady"**: a sine with irregular amplitude when regularity CV > 0.35 (`BANDS.vibratoRegularity`).
  - Switching between straight and vibrato drives the existing cues (`Vocal.tsx:1086-1099`). The chip **flashes its outline lemon** for 300 ms when the cue changes ("now").
- **The computation is live but slow.** Run a rolling **0.9 s window** over the smoothed cents track, reusing `trend` + `vibratoOf` (`vocal.ts:107`, `:148`). It needs ≥ 3 cycles to show values and updates at 4 Hz. Show the rate to 0.1 Hz and the extent rounded to 5 ¢.
  - Healthy references: 4.5–7 Hz; extent ±20–50 ¢ pop, ±40–100 ¢ classical (Prame: 5.5–6.7 Hz, mean ±71 ¢ in professional singers).
- **Which items show it:** holds, `vibrato-*`, messa and golden notes. Hide it for staccato, fast melodies and songs.

### 4.7 Sustain-stability meter ("waveform bars")
This replaces the time-only `.hold-meter` (`Vocal.tsx:1220-1225`) and uses the v2 progress motif.
- **One bar per 0.25 s of the hold goal** (a 6 s hold = 24 bars), 40 px tall, gap 2 px, starting at inline-start. Fill order follows the reading direction, as a progress bar should. It is the only element that mirrors in RTL.
- **Bar height = steadiness** of that 0.25 s slice. Measure it on the **residual after removing vibrato** (std of residual; `BANDS.stability` = 6 / 12 / 20 ¢), not the raw wobble, so a healthy vibrato does not read as "unsteady".
  - Full height + solid teal: ≤ 6 ¢.
  - ¾ height + teal: ≤ 12 ¢.
  - ½ height + hatched teal: ≤ 20 ¢.
  - ¼ height, outline only: worse than 20 ¢.
  - Unvoiced: an empty tick.
- **The bar being filled** has a lemon top edge ("now").
- A **label** at the end: "3.2 / 6 s" (LTR). At the end, the longest unbroken full-height run is outlined: "best stretch 2.4 s" (`bestStretchSec`, `vocal.ts:249`).
- **Drift** (`vocal.ts:245`): if the slow trend moves > 6 ¢/s, a small slope arrow appears at the right end of the bars (▲ "rising" / ▼ "sagging").

### 4.8 Timing cues
- **Count-in.** Four lane ticks fill lemon, plus the existing click and PulseNotes (the timing-cue rule).
- **Pulse.** The beat grid scrolls in the lane. The **now-line is lemon, 3 px**, with an ink 1 px edge on paper for contrast. It gives a 2 px "thump" (scale-x 1.0 → 1.6 → 1.0 over 120 ms) on each beat; with reduced motion, an opacity step instead.
- **Onsets.** When a note starts, a short ink tick drops on the block's left edge at the *sung* onset.
  - Early: the tick sits left of the block start. Late: right of it.
  - Within ±60 ms (`BANDS.timingMs` good) the tick merges with the edge. Live, this is the only timing feedback.
- **Mic latency.** `settings.micLatencyMs` (`VoiceTimed.tsx:238`) is subtracted before drawing, so the trail lines up with the lane (it already is for timed takes, `:737`). Extend the same to `VocalSession`.

### 4.9 Range markers
- **Left gutter.** A 28 px **note ruler**: names at C and at every target (`<bdi>`, 10 px), ticks every semitone.
- **The comfortable range** (`settings.voiceRange`) is a teal 4 px band down the gutter. Notes outside it are hatched in the gutter.
- **Range exercises** (`range`, `vibrato-register`, `siren`, calibration):
  - "highest so far" and "lowest so far" notches stay on the gutter;
  - a new personal best draws a **double-outline notch** with a one-line caption after the take ("new high: B♭4").
- **The calibration view** (`Vocal.tsx:664-730`) uses the same lane, unfolded, with the gutter growing as the glide extends.

### 4.10 Colour semantics (colour-blind safe, v2-compliant)

| Meaning | Colour | Shape / position twin |
|---|---|---|
| In the zone / clean | **Teal `#12C9B4`** solid fill | ✓ note-head glyph; needle inside the box; full-height bar |
| Close (within ±50 ¢, outside the zone) | Teal **hatched** (45°, 3 px) | Half-filled block |
| Sharp | **Tangerine `#FF8A3D`** | ▲, needle on the ♯ side, trail above the zone |
| Flat | **Purple `#6D28D9`** | ▼, needle on the ♭ side, trail below the zone |
| Missed / no voice | Paper with an ink **dashed** outline | Empty block |
| Now / active | **Lemon `#FFD43B`**, only here | The now-line, the current block's top strip, the current waveform bar, count-in ticks |
| Upcoming | Lilac `#A78BFA` at 25 % | — |
| Your trail | Ink `#1E1033` (dark mode: paper) | Note-head cursor |

- **Why this works.** Tangerine vs purple is the orange/blue axis, which deuteranopes, protanopes and tritanopes all keep apart (Okabe-Ito / Wong logic). Teal vs purple also differs strongly in luminance. Green is never used.
- **Check it.** Run `contrast.mjs` and `yellow.mjs` (the readable-contrast rule):
  - lemon only ever touches ink, never white text;
  - no pale yellow behind icons;
  - the dark theme swaps the trail to paper and keeps the lemon now-line.

### 4.11 Signal → display pipeline (best practices) [R]
1. **Gate.** A frame counts if `confidence ≥ 0.8 && rms ≥ minRms`. Add a **60 ms hangover**: one or two weak frames inside a voiced run are interpolated, not breaks. This removes the dotted-line look on consonants.
2. **Octave guard.** Keep a median of the last 5 voiced frames.
   - If a new frame is ≈ ±1200 ¢ (±80 ¢) from it, **fold it back** unless 3 consecutive frames agree on the new octave (then accept it: a real leap).
   - Same idea for the ±700 ¢ fifth error, but only when confidence < 0.9.
   - This fixes YIN's typical sub-octave errors on breathy low notes without hiding real leaps.
3. **Median-3**, to kill single-frame spikes (≈ 1 frame of lag at a 20 ms hop).
4. **One-Euro filter** (adaptive low-pass) on the cents value: min cutoff ≈ 1.5 Hz, beta ≈ 0.02.
   - It smooths heavily when the pitch is still (no shimmer on held notes) and opens up when the pitch moves (no lag on leaps or vibrato).
   - Plain EMA forces a choice between laggy and jittery; One-Euro does not.
   - **Vibrato must survive.** With a 1.5 Hz minimum cutoff and beta speed-up, a 6 Hz ±40 ¢ vibrato passes because its speed opens the filter. Unit-test with `synthHold` plus vibrato.
5. **Display only.** Grading keeps using the raw frames, as today (`gradeTake`). Never grade the smoothed line.
6. **Render loop.** Frames go into a ring buffer held in a `useRef`. One `requestAnimationFrame` draws the lane, either as a `<canvas>` (DPR-aware) or as SVG with a single `path` updated by attribute. The ref-and-rAF loop replaces `setFrames` on every 3rd or 4th frame (`Vocal.tsx:863`, `VoiceTimed.tsx:751`). React state changes only for discrete events: note change, phase, the 4 Hz meter ticks.
7. **Latency budget** (glass to glass, target ≤ 100 ms, acceptable ≤ 150):

   | Stage | Budget |
   |---|---|
   | Mic input buffer | 10–40 ms (Android can be worse; `micLatencyMs` covers timing) |
   | Analysis window centre (2048 @ 48 kHz) | ≈ 21 ms |
   | Hop | 20 ms |
   | Median-3 | ≈ 20 ms |
   | rAF draw | ≤ 16 ms |

   - **Do not** raise fftSize for voice.
   - A later option is moving YIN into an `AudioWorklet` with a 1024-sample window and a 10 ms hop for sopranos (above 200 Hz a 1024 window is enough).

### 4.12 Motion rules
- The lane scrolls linearly at a constant speed: no easing, no smoothing of the scroll itself (it is time).
- State changes take 120–180 ms ease-out: block fill, chip colour, needle.
- The meters update at most 4–8 Hz; numbers never roll or count up.
- There are no particles, glow, bounce, screen shake, combo counters or confetti (v2: no glow, mature, clean).
- **Reduced motion** (`prefersCalm(settings)` / `prefers-reduced-motion`):
  - the lane does **not scroll**: it pages one phrase at a time while the now-line travels;
  - the needle jumps without easing;
  - the beat thump becomes an opacity step.
- **Celebration (mature).** A note that ends fully in the zone gets a **stamp**: its outline thickens to 3.5 px for 200 ms and a small ✓ note head appears at its end. The end of a take with ≥ 90 % gets a **final barline + fermata** glyph on the lane's right edge (the v2 end-of-lesson motif), Toni's `correct` / `wow` state, and the existing `piano.cue('correct')`. No other fanfare.

### 4.13 Post-take review (same lane, frozen)
- **The lane zooms out** to fit the whole take (holds and melodies) or the current phrase (songs), with a 240 ms transform.
- **Pitch curve over the targets.** This is the Melodyne view. The *full-detail* curve (lightly smoothed, vibrato visible) runs through the blocks, with the **vibrato centre line** (the `trend`) as a dashed ink line through it. Healthy vibrato then reads as "wave around the right centre", and singers stop fearing it (Ella's lesson).
- **Per-note chips** above each block: "+8" / "−22" / "✓", coloured per 4.10; "8va" for the wrong octave. These come from `MelodyMetrics.notes` (`vocal.ts:353-361`), which is computed today but never drawn.
- **Tap a block** to swap the meter row for that note's detail (no sheet, no scroll):
  - mean cents;
  - settle ms with a scoop arrow (from `scoop`);
  - overshoot;
  - stability;
  - vibrato rate, extent and regularity;
  - onset early/late ms.
- **Listen synced.** A ▶ icon-button plays the kept take (`audioUrl`, `Vocal.tsx:1269-1274`), and the lemon now-line **travels over the curve**, per the staff-playhead rule: glide by real time, position against the SVG box. This replaces the bare `<audio controls>`.
- **Holds.** The stability bars stay, with the "best stretch" outline. The vibrato chip freezes on the take's mean, with "regular / irregular" from the CV and jitter/shimmer as one line ("even cycles" / "rate wanders 12 %").
- **One line + "Why?".** Keep the compact-feedback rule: the score number, then the single most useful remark (`remarkLine` / `tipFor`). The four `MetricBars` move behind "למה?" / "Why?", shown only when the take was weak. Strong takes show the stamp and the curve, which is enough.
- **Song phrases.** `vt-phrases` (`VoiceTimed.tsx:328-335`) becomes a row of phrase segments under the lane, each filled as in 4.10. Tapping one scrolls the frozen lane to that phrase.

### 4.14 Scaling: hold → melody → song (density levels)

| Element | Sustained hold | Melody / scale | Song |
|---|---|---|---|
| Lane | Still; the now-line travels; one wide block | Scrolls 4 s; blocks | Scrolls 4 s; blocks + lyric strip |
| Note hero | Large (40 px) | Large | **Small chip** in the lane corner (20 px) |
| Cents chip | Yes | Yes | No |
| Zone meter | **Yes** (the main read) | Yes | **No** (block fill only) |
| Vibrato chip | Yes (holds, vibrato items) | Golden notes only | No |
| Stability bars | **Yes** (replaces the hold meter) | No | No |
| Beat grid / onset ticks | Only for timed holds | Yes when `pulse` is set | Yes |
| Lyrics | — | Solfège or degree under blocks (optional) | **A separate lyric strip above the lane**: Hebrew lyrics read RTL, so they cannot ride an LTR timeline. Show the current phrase with the current word lemon-underlined; English lyrics may sit under blocks |
| Chords | — | — | The existing `ChordStrip` style, one row above the lyrics |
| Review | Curve + bars + vibrato stats | Curve + per-note chips | Phrase segments + per-phrase curve + loop-weakest |

**Blind / fade mode.** For `hidden` items (`Vocal.tsx:1118`) and later takes, blocks show as outlines only, or not at all, during the take. The fill appears in review.

### 4.15 Accessibility
- A live `aria-live="polite"` region announces only discrete events: "A4, in tune" on note change (throttled to ≥ 1 s), and the cue changes. The canvas or SVG is `aria-hidden`, and the existing `figcaption` pattern carries the target list.
- Targets for one-screen tap: the review blocks are ≥ 32 px tall when zoomed, or tapping the chip row selects the note.
- High-contrast mode: the zone uses solid fills only (no hatching), with 3 px outlines.
- All numbers use `dir="ltr"` / `<bdi>`, with ♭ and ♯ in Noto Music.

---

## 5. Build checklist (mapped to files)

**Engine (pure, unit-tested)**
- [ ] `src/engine/pitchDisplay.ts` (new):
  - gate with hangover;
  - octave/fifth guard;
  - median-3;
  - One-Euro filter;
  - note-name hysteresis (`stableNote`).
  - Tests: no lag on `synthMelody` leaps (≤ 2 frames), vibrato extent kept within 15 % on a `synthHold` vibrato, octave spikes removed.
- [ ] `src/engine/vocalLive.ts` (new):
  - `liveVibrato(track, 0.9 s)`, wrapping `trend` + `vibratoOf` (`vocal.ts:107`, `:148`);
  - `sliceSteadiness(track, 0.25 s)`, the residual std per slice, mapped to 4 levels with `BANDS.stability`;
  - `zoneTolerance(level, item)` → 35 / 20 / 10 ¢.
- [ ] Export the per-note data for review. `melodyMetrics` already returns `notes` (`vocal.ts:363-373`). Make sure `gradeTake` / `gradeMelody` pass `notes` through on `TakeGrade` (`vocal.ts:1386`) so the UI can draw the chips.

**UI components**
- [ ] `src/ui/SingLane.tsx` (new): the lane (canvas or SVG + rAF + ring buffer), gutter ruler + range band, target blocks with zone stripes and fill, trail with note-head cursor, beat grid, count-in ticks, onset ticks, edge chevrons, octave tags. Props: `targets` (midi, start, dur, golden), `frameSink` (ref API `push(frame)`), `pulse`, `range`, `tolerance`, `mode: 'hold' | 'melody' | 'song'`, `review?: {frames, notes, audioUrl}`.
- [ ] `src/ui/SingReadout.tsx` (new): the note hero + cents chip (uses `noteLabel`, `<bdi>`) and the vibrato chip (live sine + ghost target).
- [ ] `src/ui/ZoneMeter.tsx` (new, from `CentsNeedle` `HarmonyHold.tsx:53-69`): a non-linear scale and a note-head needle. Replace the uses in `HarmonyHold.tsx` and `SingInterval.tsx:275`.
- [ ] `src/ui/SustainBars.tsx` (new): the waveform bars. Replaces `.hold-meter` at `Vocal.tsx:1220-1225`.
- [ ] `src/ui/TakeReview.tsx` (new): the frozen lane, per-note chips, a tap-a-note detail row, synced playback (staff-playhead rule), with "Why?" wrapping `MetricBars` / `Bars`.

**Wire-up**
- [ ] `Vocal.tsx`, `VocalSession`:
  - replace `PitchTrace` at `:1231-1233` with `SingLane` (mode by kind: the `FREE_KINDS` / hold kinds → `hold`, melodic → `melody`);
  - feed frames through the ref instead of `setFrames` at `:863`;
  - add the readout row above the lane;
  - replace the hold meter;
  - result section `:1252-1276` → `TakeReview`;
  - subtract `micLatencyMs` for pulse items.
- [ ] Keep `PitchTrace` only for `RangeCalibration` (`:708`) until the lane's unfolded mode lands, then remove it.
- [ ] `VoiceTimed.tsx`: replace `SingRoll` at `:303-309` with `SingLane mode="song"` (or `melody` for `time` items); ref feed instead of `a.onFrames` every 4th frame (`:751`); add the lyric strip above the lane for songs; phrase segments in review (`:328-335`).
- [ ] `SingAlong.tsx`: replace `SingRoll` (`:25-52`) usage with `SingLane mode="song"`, then delete `SingRoll`.
- [ ] `VoiceLevelTest.tsx`: no own view. It renders `VocalSession` / `TimedSession` in test mode, so it inherits the change. Check that the test head still fits one screen.

**Styles (v2)**
- [ ] `src/vocal.css` / `src/voicecourse.css`:
  - delete `.trace-band`'s rgba mint (`vocal.css:130-132`), the lemon `.trace-line` (`:139-145`), the dark `.pitch-trace` background (`:118-124`), and `.roll-note` / `.roll-cursor` (`:561-569`);
  - add `.sing-lane`, `.zone-meter`, `.sustain-bars`, `.sing-readout` using only `--teal`, `--tangerine`, `--purple`, `--lemon` (now only), `--lilac`, `--ink`, `--paper`, a 2.5 px outline and the `--shadow` card.
- [ ] Hatch pattern: an SVG `<pattern>` or a CSS `repeating-linear-gradient`. **Note:** v2 bans gradients as *visual style*. A hard-stop repeating stripe is a hatch, not a gradient, but confirm with the owner, or use an SVG pattern to stay safe.
- [ ] Replace the "■" and "〰" text glyphs (`Vocal.tsx:1311`, `:1190`; `VoiceTimed.tsx:380`) with `Icon` / `Glyph` set entries.

**Strings**
- [ ] `src/i18n/strings.ts`, he and en: straight / vibrato / unsteady, "best stretch", rising / sagging, "new high", "8va", "Why?" reuse. Keep them few words each (compact-questions rule).

**Verification**
- [ ] Vitest for `pitchDisplay` and `vocalLive`.
- [ ] e2e with `SIMULATED` frames (`Vocal.tsx:953`): the lane renders, a block fills, the review chips appear, there is no vertical scroll at 320×720 (exercise-fits-one-screen), Hebrew and English.
- [ ] `node contrast.mjs` + `yellow.mjs` sweep; axe on the voice routes; reduced-motion snapshot.
- [ ] Real-device check: Android Chrome latency with the calibration on and off; iPhone Safari; check the trail lag against a tapped pitch.
- [ ] `npx tsc -b` before commit (the typecheck-before-commit rule).

**Suggested order** (for a playtester-ready slice first):
1. `pitchDisplay` + the rAF lane in `VocalSession` holds with zone meter + sustain bars;
2. melodies with fill and per-note review chips;
3. songs (lyric strip, phrase segments);
4. vibrato chip;
5. CSS leftover sweep.

---

## Sources
- Ella App Store listing: https://apps.apple.com/app/id1301456113
- Simply Sing review (Sing Salon): https://sing.salon/articles/tech-reviews/simply-sing-review-practice-singing-in-your-vocal-range-r41/
- Simply Sing review (American Songwriter): https://americansongwriter.com/simply-sing-review/
- Yousician Singing review (American Songwriter): https://americansongwriter.com/yousician-singing-review/
- Yousician support, singing practice: https://support.yousician.com/hc/en-us/articles/360000555665-The-best-way-to-practice-singing
- Vanido (Lifehacker, Common Sense): https://www.lifehacker.com.au/?p=783630 · https://www.commonsensemedia.org/app-reviews/vanido-your-personal-singing-coach
- Singing Carrots Pitch Monitor docs: https://singingcarrots.com/docs/singing-carrots-pitch-monitor
- Singscope: https://apps.apple.com/app/singscope/id944309175
- OnPitch / Nail the Pitch / AudioPitch: https://apps.apple.com/app/id1212118228 · https://apps.apple.com/app/id1486640549 · https://apps.apple.com/us/app/id6478816955
- Vocal Pitch Monitor: https://apps.apple.com/app/id842218231
- Sing Sharp: https://appgoblin.info/apps/772052329
- Swiftscales: https://apps.apple.com/app/id1079277628
- Riyaz: https://riyazapp.com · https://marlvel.ai/apps/riyaz-learn-to-sing
- Tunable: https://apps.apple.com/app/id608540795
- UltraStar (golden notes, blind mode): https://en.wikipedia.org/wiki/UltraStar · https://usdx.eu/format
- Vibrato norms: https://pmc.ncbi.nlm.nih.gov/articles/PMC9510150 · https://www.mmdigest.com/archives/Digests/199910/1999.10.13.09.html · https://orbi.uliege.be/bitstream/2268/158220/1/Larrouy-Maestri_OperaticVoices_JV_2014.pdf
- Vibrato trainer (rate/extent bands): https://hajim.rochester.edu/ece/sites/zduan/teaching/ece472/projects/2014/Heid_Fan_RealTimeVocalVibratoTrainingSystem.pdf
- Pitch display smoothing (median, EMA, hysteresis, octave): https://foliodsp.pages.dev/components/analysis/pitch-tracker · https://awesome.ecosyste.ms/projects/github.com%2Fdenizyesilirmak%2Freact-native-tuner-engine · https://forum.juce.com/t/lowest-latency-real-time-pitch-detection/51741?page=2
- Colour-blind palettes (blue/orange, Okabe-Ito): https://www.datawrapper.de/blog/colorblindness-part2 · https://ctan.ceremade.dauphine.fr/macros/latex/contrib/colorblind/colorblind_doc.pdf

# Plan — player analysis ("AI analysis") and the approved items (owner 2026-11-08)

Approved by the owner from the market review: player analysis (technique, weak scales / keys / fingers, time feel),
groove fingerprint, teacher loop, score view with a cursor, piano chord detection by microphone, "where is home" +
progression games and puzzles, an Ear Index, improvisation beyond notes (phrasing, trading, varying a given phrase),
range-fit songbook, per-finger / per-hand evenness, songbook by the chords you know, "figure it out" mode, trouble bars
→ drills, a Bagrut / conservatory section. Not now: real recordings (licensing), an accompanist that follows you.

## 1. How "AI analysis" should be built

What players call AI analysis is four layers. Only the last one needs a language model.

| Layer | What it does | Where it runs | Notes |
|---|---|---|---|
| **1. Measurement** | Per note of every take: pitch right / wrong, onset offset (ms), duration, velocity, hand, finger (when the drill knows it), position in the bar, subdivision, tempo, interval from the previous note, chord / scale / key context. | Device (already partly in `analyzeTake`, guitar / voice analysis) | Exact, private, free. Latency calibration is the base of everything. |
| **2. The player model** | Statistics over weeks: for every *context* (finger, hand, key, scale type, interval size, subdivision, tempo band, beat position, after a leap / thumb-under …) a running mean and spread with a confidence interval, plus a trend. | Device; summaries sync to the profile | Bayesian / exponentially weighted averages. Small (a few KB). |
| **3. Pattern finding** | Which contexts differ *significantly* from the player's own average — e.g. "finger 4 is 18 % softer (± 5 %) in RH scales", "you rush 16ths above 120 bpm by 22 ms", "your errors cluster on leaps of a 6th and more", "F♯ major and B major are your weakest keys", "bar 13 of the piece failed in 7 of 9 sessions". Then a **prescription**: the drill / topic / loop that trains exactly that. | Device: regression over the contexts + rules | This is "the AI" in the useful sense: explainable, no hallucination, testable. Later, small ML models (e.g. clustering of error types, difficulty prediction) trained on anonymised feature data — only with consent. |
| **4. The coach's words** | Turn the findings into a short personal explanation and a weekly plan, in Hebrew or English. | Optional LLM (Claude) via a Supabase edge function, **grounded**: it receives only the computed facts and may only cite them | Opt-in, privacy note, cost control (one weekly summary + on-demand "why?"), a template fallback with no LLM. |

**Recommendation:** build layers 1–3 ourselves (most of the value, no running cost, works offline, fully testable),
and add layer 4 as an optional "coach" later. No third-party analysis service is needed.

### What the analysis covers (first version)
- **Piano technique:** evenness per finger and per hand (velocity and timing spread), hand balance and synchrony, thumb-
  under / crossing glitches, legato overlap, pedal blur, weakest keys and scale types, tempo ceiling per item (fastest
  clean bpm), dynamics control (hits the band?) — shown as a **hand map** and a **key / scale map**.
- **Guitar:** timing per stroke (alternate / economy picking), chord changes (gap ms, strings that did not ring),
  bend pitch, vibrato rate / width.
- **Voice:** onset scoop, drift, wobble, range edges, intonation by register and interval size.
- **Ear:** the **confusion map** (which pairs you mix up: m6 / M6, ii / IV …), slow items (reaction time), weak keys.
- **Time feel (the groove fingerprint):** mean offset and spread per subdivision, per beat position, per tempo band,
  per density; tempo drift across a phrase (rushing / dragging slope); swing ratio actually played vs asked; "pocket"
  consistency; behaviour when the click disappears (inner clock). Pattern finding answers "when do you rush?" (e.g.
  "after a rest", "in 16ths above 120", "when the left hand joins"). Exercises from it: pocket targets (hold a chosen
  offset), the click that fades out adaptively, swing-ratio dial, band-sync duels.
- **Pieces:** **trouble bars** — the bars that fail across sessions become spaced micro-drills (a loop of the bar + one
  beat lead-in, a tempo ladder, then joined back), and the coach schedules them in the daily plan.

## 2. Release plan

### 0.49 — the score and the evidence
1. **Score view** with bar lines, both staves, systems that wrap and scroll, a moving cursor and a bar highlight
   (beginners), "wait mode" (MIDI: waits for the right notes). Built on VexFlow, which the app already ships — no new
   dependency. Used by My pieces, songs and drills.
2. **The take log** (layer 1): every take's per-note features stored (device, compact) and summarised into the player
   model (layer 2).
3. **Trouble bars → drills** in the piece coach.
4. **Piano chord detection by microphone**, score-informed: we know which chord is expected, so onset detection +
   chroma templates (the guitar ring-check engine) judge "which notes of the chord sounded". Free playing without a score
   comes later (a small transcription model such as Basic Pitch, Apache-2, in the browser).

### 0.50 — the analysis
5. **Insights** screen: hand map, key / scale map, confusion map, groove fingerprint, trouble bars — each finding with
   its prescribed drill; findings feed the daily workout (everything connects).
6. **Groove fingerprint exercises:** pocket targets, adaptive fading click, swing dial.
7. **Ear Index:** one number for the ear (built from the skill ratings, i.e. the hardest items you beat — never time
   spent), shareable, with a percentile among players and a seasonal ladder. Like a chess rating for listening.

### 0.51 — teacher loop
8. Assign pieces, charts with improvisation rules, drills, topics — with strictness (lenient / moderate / strict) and a
   due date; the student's takes come back with their metrics; a **grading inbox** with timestamped comments; a **class
   heat-map** (students × skills, practice minutes, who is behind); the teacher sees the student's Insights; a
   **parent digest** (weekly minutes, streak, what was mastered, one recording). Needs a database migration (owner OK).

### 0.52 — ear games and the songbook
9. **Where is home?** (tap when the tonic arrives; then name the cadence), **progression games** — predict the next
   chord, a daily progression puzzle (six guesses, solved degrees light up, share squares), reharm swap, confusion-map
   "boss fights". All on generated and public-domain music.
10. **Figure it out** (on generated / public-domain music — no real recordings): find the key, then the bass line, then
    the chord qualities, then the melody; the answer is revealed only as a check, and every step is scored.
11. **Range-fit songbook** (every song transposed to the singer's measured range) and **songbook by the chords you
    know** (guitar / piano — songs filtered by your chord vocabulary, "one new chord" suggestions).

### 0.53 — improvisation beyond notes
12. **Phrasing & space** (phrase lengths, rests, density, a "max density" rule), **arc & contour** (where the peak
    came), **time feel** of the solo.
13. **Motif development**: find a 3–5 note cell and score its return (transposed, displaced, inverted, sequenced) —
    arcs on the bar map.
14. **Vary this phrase**: a given line is played; the player plays it back *changed* — and the app checks that it is
    related (contour / rhythm / target notes kept) yet different (the asked change: displace it, ornament it, answer it,
    move it to the next chord). **Trading fours**: the app plays 4 bars, you answer, it answers your idea — rule-based
    first (motif transformations), learned later.

### 0.54 — Bagrut & conservatory section
15. One place for exam prep: the music Bagrut by track (art, pop-rock, jazz, Arabic music: meter identification,
    rhythmic dictation, excerpt analysis, chorale analysis, solfège), conservatory entrance prep (JAMD, TAU, Bar-Ilan:
    melodic / two-voice / harmonic / rhythmic dictation, sight-singing with modulation, jazz harmonic analysis), timed
    mock exams, exam-day simulation, a readiness report. First step: collect the published syllabi and past exam
    formats (research), then map them to existing topics and fill the gaps.

### Later
- The coach's words (LLM layer 4), opt-in.
- Free-playing polyphonic transcription by microphone (piano), phone-camera hand check, native iOS.

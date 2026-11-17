# Measurement audit: what we measure vs what MIDI and the mic allow

2026-11-17. Read-only research on branch `redesign-v2` at 0.99.4. No code was changed. Every claim below cites the file and function it comes from.

**Short answer to the owner's question.** For piano via MIDI we do **not** yet measure everything MIDI lets us measure. The input layer is sound: we keep note-on, note-off, velocity and CC64 with accurate timestamps. The **technique drills** (`analyzeTake`) grade a good core: onsets, IOI evenness, hands together, chord spread, velocity level, one crescendo shape, accent gap, legato overlap / staccato ratio and pedal timing. The gaps fall into four groups:

1. **The fingering we write is never used to explain the measurement.** The one exception is the thumb-crossing check.
2. **Pieces, Encore phrases and the level test grade no touch at all.** No dynamics, articulation or pedal is checked there.
3. **Most of what we measure reaches the player only as one "worst factor" line.** There is nothing note by note, and nothing is tracked over time.
4. **Several measures don't exist yet:** tempo drift, swing ratio, note length vs written length, release before rests, CC67, per-chord voicing and dynamics during contrary-motion or chromatic scales.

Voice is measured more thoroughly than piano. Drums on an e-kit are measured most thoroughly of all.

---

## 1. The input layer (what reaches the graders)

| Signal | Read? | Where | Notes |
|---|---|---|---|
| Note-on + velocity (0x90) | Yes | `src/speech/midi.ts` `MidiInput.message` | Timestamp is `e.timeStamp` (the event's own time, so it's accurate). Octave shift applied. |
| Note-off (0x80 / 0x90 v0) | Yes | same | **Release velocity (byte 3 of 0x80) is dropped**: listeners get `0`. |
| CC64 sustain | Yes, forwarded | `message` → `onCC`; recorded in `src/ui/DrillTake.tsx` (~l.883) **only when `drill.goal.pedal` is set** | Pedal invert option. For half-pedal drills every sample is kept; other drills keep only the down/up transitions. |
| CC67 soft pedal | Forwarded | `onCC` | Used **only for the live sound** (`src/audio/piano.ts` l.1140). Never recorded or graded. |
| CC66 sostenuto, CC1, CC11 | Forwarded | — | Never used. |
| Channel aftertouch (0xD0), poly AT (0xA0) | Piano mode: dropped | `message` has no branch | Drum mode forwards 0xA0 as cymbal chokes (`drumMessage`). |
| Pitch bend (0xE0) | Dropped | — | Only matters for MIDI guitar / wind controllers. |
| Drum mode: hits, CC4 openness, CC4 "chick", 0xA0 chokes, cross-talk filter | Yes | `drumMessage`, `pedalFromCc` | Very complete. |
| Calibration: latency | Yes | `src/engine/latency.ts` `latencyFrom` | Taken as the median offset while playing along with clicks (see bug B6). |
| Calibration: velocity range | Yes | `src/ui/Drills.tsx` `Calibration` | **One** softest key and **one** loudest key (see bug B7). |
| Microphone (piano) | Pitch onsets, `vel: 64`, no release | `DrillTake.tsx` ~l.979 | `micUnmeasurable()` blocks goals that need loudness, release or pedal. This is honest and correct. |
| Microphone (voice) | YIN f0, confidence, RMS. Chroma / centroid / bands only when asked | `src/engine/sing.ts` `SungFrame`, `src/speech/pitchCapture.ts` | Opened with AGC, echo cancellation and noise suppression **off** (good). The spectral centroid is requested only for bass. |

---

## 2. Piano via MIDI: what is measured today

Main grader: `src/engine/drills/analyze.ts` `analyzeTake`. The pedal is graded separately in `src/engine/drills/pedal.ts` `analyzePedal`, called from `DrillTake.tsx` ~l.1126. Live marks come from `src/engine/drills/liveGrade.ts`. The review screen is `src/ui/TakeReview.tsx` plus `src/engine/drills/review.ts`. The long-term layer is `src/engine/analysis/model.ts` (`addTake`, `findings`), the item EWMA in `src/engine/drills/ladder.ts` (`applyTake`) and `src/ui/Insights.tsx` `HandMap`.

How to read the "Shown?" column:

- **L** = live mark during the take
- **W** = the one "why" line (only the single worst factor wins)
- **C** = a chip / number on the review
- **S** = the "Why?" sheet
- **P** = the long-term profile / Insights
- **–** = not shown

### 2.1 Table

| Dimension | Captured? | Graded? | Shown? | Where | Notes |
|---|---|---|---|---|---|
| Right / wrong / missed / extra note | Yes | Yes | L (head marks, ✕ extras), C, P (weak key / scale / leap error rates) | `align`, `markOf` (`noteMarks.ts`) | Solid. Octave-shift detection is a nice touch. |
| Onset offset per note | Yes (`dev`) | Via timing SD + worst onset | L (early/late tick beyond the window), C (mean as "early/late"), S (strip), P (rush/drag per subdivision) | `analyzeTake`, `liveGrade`, `review.ts` | Live window = 2×SD limit: **60 / 50 / 40 ms** by tempo band (`markWindow`). |
| Timing SD over onsets | Yes | Yes (30/25/20 ms by band) | W, C ("± ms" in the old TakeResult only; TakeReview shows the mean + bars) | `thresholds` | Uses onsets, not notes (PIANO_AUDIT A4). Good. |
| IOI evenness (CV per hand) | Yes | Yes when `goal.evenness` (5/4/3 %, floor 12 ms) | C (5-bar "Even" grade from the worse hand), W | `analyzeTake` evenness loop, `evenGrade` | Good. |
| IOI ratio per note (`ioiRatio`) | Yes | No | **–** | `perNote[i].ioiRatio` | **Captured but never read anywhere.** |
| Hesitations (IOI > 1.5× median) | Yes | Yes (blocks clean) | W | | |
| Thumb-crossing bumps | Yes (IOI > 1.15 at a fingered thumb) | Yes, ≥ 2 → "almost" | W, S (dots on the strip) | `glitches` | **The only place the written fingering is used.** IOI only: a thumb *accent* (velocity) is not checked. |
| Hands together (RH − LH at shared onsets) | Yes | Yes when `goal.hands` (30/25/20 ms) | L (⇆ chip > 30 ms, a needle per hand), S (ms), P (`hand-balance` finding) | `handsMean/handsAbs`, `handsGap` | Good. |
| Chord spread within a hand | Yes (max over chords) | Yes, always, 25 ms fixed | W | `chordSpread` | **Max over all chords**: one rolled chord fails the take (B4). Not shown per chord. |
| Tempo drift over the take | **No** | No | – | — | Drums have it (`goal.drum.endure`, `song.drift`). Piano doesn't. |
| Rush / drag by subdivision | Yes (long-term) | No | P | `model.ts` `findings` (`sub:` contexts) | |
| Swing ratio | **No** (assumed 2/3) | Graded against a fixed 2/3 | – | `expTimeMs`, `timeline.ts` `timelineMs` | Drums (`goal.drum.swing`) and bass (`swingRatio`) measure it. Piano doesn't (B2). |
| Velocity level (pp…ff) | Yes | Yes when `dynamics: 'even-*'` (≥ 85 % in band) | L (velocity bars with hollow target), W, S (raw dot curve) | `velocityBand`, `velBars.ts` | Bands are calibrated from two key presses (B7). |
| Velocity evenness (SD) | Yes for every take | Only with `even-*` (12/10/8 SD) | W; "vel SD" chip only in the old `TakeResult` (LickTrainer) | `velSD` | Also fed into the item EWMA and today's "weak" ranking **for every drill** (B3). |
| Crescendo / diminuendo shape | Yes, only for `dynamics: 'cresc'` | R² ≥ 0.8 and a range of ≥ 40 velocity units | W only (`slope` and `r2` are never shown) | `analyzeTake` cresc block | One hand only (R if present). Up and down are folded into one line, so their separate slopes, peak position and overshoot are not checked. Range is absolute, not calibrated. |
| Accent gap | Yes | Yes (+15; voicing / balance +10) | W, L (thick top on the velocity bar) | `accentGap` | Mean difference only. It does **not** check that the *unaccented* notes stayed unaccented (drums do: `accentPos`). |
| Voicing (top note louder) | Via accent flags | Yes, the take's mean gap ≥ 10 | W | `genVoicing` (dynamics `voicing`) | Averaged over the take, so 3 flat chords out of 8 can still pass. Nothing per chord. |
| Hand balance (one hand louder) | Via accent flags | Yes, ≥ 10 | W | `genBalance`, `melody-alberti` | Exists only as control 7–8. Not in pieces. |
| Per-finger velocity | Yes (long-term) | No | P (`HandMap`, `soft-finger` / `loud-finger` findings) | `model.ts` `addTake` / `findings` | Contaminated by accents and shaped dynamics, and by guitar/bass takes (B1). |
| Per-finger timing | Yes (long-term, `f:` contexts keep `tMean`) | No | **–** | `model.ts` | **Captured but never reported.** `findings` reads `vMean` per finger, never `tMean`. |
| Legato key overlap (KOT) | Yes when `goal.articulation` | Yes (gap > 10 ms or overlap > 60 ms fails) | W only | `kot` | Pooled median over both hands, single notes only. Fixed ms, not scaled to tempo. Nothing per note. |
| Staccato / portato duration ratio | Yes | Yes (< 50 % / 60–80 %) | W only | `kdr` | Median only. A few long notes inside a staccato line hide. |
| Different touch per hand | Yes | Yes (`goal.handArt`) | W | `handArt` | |
| Held notes kept down | Yes | Yes (`goal.holds`) | W (names the voice) | `holdShort` | Only hand-independence and borrowing items. |
| Held length vs written length (general) | **No** (off is recorded) | No | – | — | Bass has it (`lengths`, `releaseAccuracy`). Piano doesn't. |
| Release before rests | **No** | No | – | — | |
| Note-length consistency per finger / hand | **No** | No | – | — | |
| Sustain pedal (direct, legato, half) | Yes, pedal drills only | Yes, per change, ≥ 80 % | C/S (ok/total), W (first failure reason) | `analyzePedal` | `perChange` (which change, why) is **thrown away** in `DrillTake` (only ok/total/pass kept): no mark on the staff. Not captured in pieces, Encore or pop comping without `goal.pedal`. |
| Half-pedal depth | Yes (continuous pedals) | Yes | W | `analyzeHalf` | Switch pedals are detected and graded as legato pedal, and the player is told. Good. |
| Soft pedal CC67 | Sound only | No | – | `piano.ts` | |
| Trills / repeated notes | Onsets | IOI evenness + hesitations | as above | `genTrill` (`goalOf(s, true)`) | Velocity evenness is **not** graded on trills (no dynamics goal). |
| Leaps | Pitch + onset | General rules | P (`leaps` error-rate finding) | `model.ts` `leap:` context | Landing **timing** on leaps is kept (`tMean`) but never reported. |
| Octaves | General | General | | | No octave-specific measure (both notes together, i.e. thumb/5 spread). |
| Grace notes | Yes | Soft / strict | W | `grace.ts` | |

### 2.2 Coverage by context (important)

| Context | Goal it builds | Touch graded? |
|---|---|---|
| Technique drills (scales, control 1–10, fingers, k-indep, k-pop pedal) | full `DrillGoal` | Yes, where the level sets it |
| **Pieces** (`src/engine/piece/toDrill.ts` `chunkDrill`) | `{ evenness: false, hands }` + `accent` | **No dynamics, articulation or pedal.** The parser reads `dyn` and `staccato` from MusicXML (`score.ts` ~l.139, l.195) and **`chunkDrill` drops them**. Only `accent` passes through, so pieces grade accents but not *p* / *f* or staccato. |
| **Encore phrases** (`src/engine/encore/phrase.ts` ~l.368) | `{ evenness: false, hands }` | **No.** `LickNote = [semi, beat, dur]`: the source take's velocities (kept in `RawNote.vel`) are dropped when the phrase is made. Also **Encore takes never feed the player model**: `recordTakeAnalysis` is called only from `Drills.tsx` and `Pieces.tsx`, not `EncoreRun.tsx`. |
| **Level test** (`src/engine/drills/levelTest.ts`) | levels as written | There is **no control / dynamics / pedal strand**. Control placement is inferred from `k-pop` rungs (`places: { control: 9 }`), so touch is never tested before being placed. |
| Microphone piano | — | Correctly blocked for touch goals (`micUnmeasurable`, A2). |

### 2.3 Control vs speed

Progress is tempo. `ItemState.cleanBpm`, the ladder (`applyTake`) and the level pass (3 clean takes at ≥ 95 % of the target tempo on 2 days, `itemPass`) are all about tempo. A control item passes when its touch factors are ≤ 1 at that tempo. Beyond that, **no control quantity is tracked over time**: the EWMA keeps only `cv`, `sd`, `vsd`, `hands`, `acc`. Crescendo R², accent gap, KOT and pedal accuracy are not tracked. The owner's "measure control, not just speed" therefore holds only for the single take, never as a trend or a profile pattern.

---

## 3. Voice via the microphone: what is measured today

Files:

- `src/engine/vocal.ts`: `holdMetrics`, `vibratoOf`, `melodyMetrics`, `gradeHoldRaw`, `gradeDynamic`, `gradeGlide`, `rangeFromGlide`
- `src/engine/vocalMore.ts`: `gradeMore`, `gapsOf`, `breakOf`
- `src/engine/feedback.ts`: `remarksFor`
- `src/engine/singPulse.ts`
- the sung-lick path in `analyzeTake` (`VOICE_TIMING`)

| Dimension | Captured? | Graded? | Shown? | Where | Notes |
|---|---|---|---|---|---|
| Pitch accuracy (cents) | Yes | Yes (60 / 65 ¢ pass, intonation bands 10/20/35) | Live lane, per-note remarks, metrics | `melodyMetrics`, `passCents`, `SingLane.tsx` | |
| Settle time / transitions | Yes | Yes (`settle`, `transitionMs`) | metrics | `holdMetrics`, `melodyMetrics` | |
| Scoop at onset | Yes (`HoldMetrics.scoop`, 60 ms head) | **No** in holds; only a remark (`scoop-up/-down`) for single notes | remark only | `feedback.ts` `remarksFor` | `HoldMetrics.scoop` itself is never read. |
| Overshoot on intervals | Yes | Yes | lane `↗ ¢` | `melodyMetrics.overshoot` | |
| Drift on a held note | Yes (¢/s) | Yes (`hold`, `straight`, `breath-hold` end) | metrics, remark `end-flat` | | |
| Stability (straight-tone wobble) | Yes | Yes | metrics | | |
| Vibrato rate / extent / regularity / jitter / shimmer / on-off cues | Yes | Yes (many item kinds) | metrics | `vibratoOf`, `gradeHoldRaw` | Excellent. |
| Onset timing | Yes | Yes (`timingMs` bands 40/60/110, sung licks SD ≤ 40 ms) | metrics, marks | `melodyMetrics`, `singPulse.ts`, `VOICE_TIMING` | |
| Crescendo / decrescendo on one note | Yes (5 time bins of dB) | Yes (range ≥ 8 dB + monotonic) | metrics | `gradeDynamic` | |
| Messa di voce | Yes | **Range only** (`loudnessRangeDb` ≥ 6 dB) | metrics | `gradeHoldRaw` case `messa` | A plain crescendo passes. The up-then-down shape is not checked (B8). `gradeDynamic` `swell` does check the shape, so the logic already exists. |
| Terraced dynamics, accents, phrase arc | Yes (per-note dB) | Yes | metrics | `gradeMore` | Relative within a take (honestly documented). |
| Breath / phrase length | Yes (voiceless gaps ≥ 250 ms) | Yes (`breath-phrase`, `breath-plan`, `breath-hold`) | metrics | `gapsOf` | |
| Range | Yes (8th / 92nd percentile of a glide) | Placement only | range screen | `rangeFromGlide` | "Stable" is not checked: a glide brushes the extremes. |
| Register breaks | Yes | Yes | metrics | `breakOf` | |
| Interval / leap accuracy | Yes | Yes (`singInterval.ts`, melody) | | | |
| Tone: brightness (spectral centroid) | Bass only | No | – | `SungFrame.centroid` | Not requested for voice. |
| Tone: breathiness (HNR / CPP) | **No** | No | – | — | |
| Long-term voice patterns | Partial | — | Profile `trouble-bars` for voice | `insightCards.ts` | The `PlayerModel` is fed only by drill / piece takes. There is no voice context (e.g. "you go flat above E4"). |

---

## 4. Other instruments (brief)

| Instrument | Captured | Graded | Notably missing |
|---|---|---|---|
| **Drums (e-kit MIDI)** (`drumAnalyze.ts`, `drumChoke.ts`, `drumSplash.ts`) | Hits, voice map, velocity, CC4 openness, chick from CC4, 0xA0 chokes, cross-talk | Per-limb timing, hit / wrong voice, velocity CV, three levels, accent gap **and positions**, ghost band, doubles ratio, flams / drags (gap + SD), hat open / closed, swing ratio, linear coincidences, polyrhythm, swell R², pocket, endurance drift, double-pedal L/R, buzz, chokes, splash, song arc | Per-limb velocity consistency over time (P only by limb timing); hi-hat CC4 *depth* beyond open/closed (half-open "sizzle"); kick velocity vs. snare balance trend. This is the reference implementation the piano should copy. |
| **Bass** (mic, `bassAnalyze.ts`) | Onsets, RMS, centroid, strings | Odd/even asymmetry, loudness SD (dB), string crossing, kick lock, **note lengths / release accuracy**, ghost dB, swing ratio, slap class, drift | MIDI bass via a keyboard is analysed as piano (no length rule unless `bass.lengths`). |
| **Guitar** (mic, `guitarAnalyze.ts`) | Onsets, pitch frames, RMS, centroid, chroma | Bend cents, vibrato, legato volume, chord-change gaps, palm-mute share, ring check | MIDI guitar pitch bend is dropped at the input. Pick-direction evenness is only the bass's odd/even. |

---

## 5. Prioritised gap list

Effort: **S** ≤ ½ day, **M** 1–2 days, **L** 3–5 days, all including tests. "Feasibility" means with our data: MIDI is reliable, the phone mic is not.

| # | Gap | Value to the learner | Feasibility | Plugs into | Feedback form | Effort |
|---|---|---|---|---|---|---|
| **G1** | **Dynamics and articulation in pieces.** Pass `dyn` and `staccato` through `chunkDrill`, plus hairpins (MusicXML `<wedge>`) and slurs → `legato`. Grade per section, never note by note. | Very high: real music finally gets graded on touch, which is the owner's differentiator. | MIDI: high. The data is already parsed; only `<wedge>` / `<slur>` parsing is new. | Pieces (piece coach), repertoire, k-classic pieces | One-line summary per chunk ("bars 5–8: *p* played *mf*"), velocity bars under the staff (already built) | M |
| **G2** | **Crescendo / diminuendo, done properly.** Separate up and down lines (slope and R² each), peak at the top note, overshoot (a jump > X at the end), range as a share of the *calibrated* span, both hands. New goals `dim` and `cresc-dim` (see §7). | High: this is the owner's own lesson example. | MIDI: high. | control 4; new levels (§7); scales in all keys | Live: velocity bars with a target ramp outline. Summary: "the crescendo flattened after the 2nd octave". Profile: "your diminuendos fall too early". | M |
| **G3** | **Fingering-aware analysis.** Per-finger velocity and IOI *inside a take*, accents/shaped notes excluded. Thumb-under *accent* (velocity jump on finger 1 after a crossing). A "4th finger weak" line right after the take, not only in the profile. Report per-finger timing from the `tMean` that `model.ts` already keeps. | High: "some fingers consistently weaker / later" is classic teacher feedback. | MIDI: high. Fingering exists in every scale, arpeggio and five-finger drill. | scales, arpeggios, fingers (Hanon, trills, thumb-under), Insights `HandMap` | Summary line plus a profile pattern (`late-finger`, `thumb-accent`) | M |
| **G4** | **Note length vs written length, and release before rests.** Generalise `holds` for piano: held ≥ 80 % for long notes, a release at the rest ±X ms, per-hand length consistency. Port `bassAnalyze.releaseAccuracy` / `lengthMatch`. | High for reading, classical and pieces ("you clipped the half notes", "the LH rang through the rest"). | MIDI: high (note-off is reliable). Pedal-down periods must be excluded or reported separately. | reading (k-read), pieces, k-classic, Alberti, pop-LH | Live: a short tail/stub mark under the head. Summary line. | M |
| **G5** | **Tempo drift and swing ratio on piano.** Least-squares tempo over the take (rushing vs dragging, apart from the mean offset). Measured swing ratio per take, graded against the phrase's own swing or a tempo-dependent target (≈ 0.66 slow → 0.58 at 240+). | High: "you rushed the run", jazz feel. | MIDI: high. Drums and bass code exists (`endure`, `swingRatio`). | All timed drills (drift); Encore phrases, harris/bebop/licks (swing) | Summary ("crept from ♩100 to ♩108"). Profile pattern ("you rush 16th runs"). | S–M |
| **G6** | **Pedal shown and captured everywhere.** Keep `perChange` and mark each change on the staff (✓ / blur / late). Record CC64 in every MIDI take: report "blurred over a harmony change" in pieces and comping when the score/chart has changes, as soft information only. | Medium–high: pedal is invisible today outside 3 drill families. | MIDI: high. Switch vs continuous pedal is already detected. | control 10, k-pop pedal levels, pieces, solo piano, comping | Live mark at each change; one-line summary | S (marks) + M (pieces) |
| **G7** | **Voicing and balance per chord.** For each chord: top − mean(inner) velocity. Melody vs accompaniment balance in pieces (top voice / RH melody vs LH). Report the share of chords voiced, not the take mean. | High in jazz voicings / solo piano (the app's positioning). | MIDI: high. Accuracy depends on the keyboard's velocity curve; use the calibrated span. | control 6–8, voicings, solo piano (Siskind), shells, pieces | Live: small dot over each chord (voiced / flat). Summary "5 of 8 chords sang on top". | S–M |
| **G8** | **Control as a tracked skill.** Add `cresc` R², accent gap, KOT/KDR, pedal share and velocity-band share to the item EWMA, the player model and profile findings. Count clean "control" takes toward the level by a control score, not only tempo. Add a control/dynamics strand to the level test. | High: this is literally "control, not just speed". | Data exists, so this is mostly plumbing. | ladder, profile, level test, Insights | Profile patterns, level-test placement | M–L |
| G9 | Accent *positions* (unaccented notes stay soft) for `accent3/4`, `groups3/4` and `accent-shift` (port `drumAnalyze` `accentPos`) | Medium | MIDI: high | control 5, scale variants | Live: accent bars; summary | S |
| G10 | Trill / repeated-note velocity evenness and speed (notes per second achieved, last-third decay) | Medium | MIDI: high | fingers 11–14 (trills, repeated notes) | Summary | S |
| G11 | Leap landing timing (late landings) and octave spread (thumb/5 together) | Medium | MIDI: high | advanced leaps, octave scales | Summary, profile (`leaps` already exists for errors) | S |
| G12 | Subito changes (*sf*, *fp*, sudden *p*): the velocity step at a marked beat | Medium | MIDI: high | pieces (after G1); new control level | Summary | S (after G1) |
| G13 | Soft pedal CC67 graded where written (*una corda*) | Low | MIDI: high, but few keyboards have it | pieces | Soft information | S |
| G14 | Encore phrases keep the source's velocity / length and compare dynamics contour and articulation to the model take | Medium–high (imitating a teacher's phrasing) | MIDI: high for MIDI sources; audio sources give relative velocity only | Encore, teacher assignments | Summary ("the teacher accented beat 3") | M |
| G15 | Voice: grade the messa shape; grade the scoop in holds; centroid (brightness) as soft information | Medium | Mic: shape and scoop are reliable. Centroid is phone- and distance-dependent, so relative within a take only. HNR on a phone mic is unreliable, so keep it out. | voice messa, hold items | metrics line | S |
| G16 | Release velocity, channel aftertouch | Low | Few keyboards send meaningful values | — | — | skip |

**Top 8 by value × feasibility:** G1, G2, G3, G4, G5, G6, G7, G8.

---

## 6. Bugs and weak spots in current measurement

| # | Issue | Where | Effect | Fix |
|---|---|---|---|---|
| **B1** | **Per-finger velocity is contaminated.** Velocity is taken relative to the hand's mean over *all* played notes, with no regard for accents, `cresc`, `voicing` / `balance` or written dynamics. The model is also shared across instruments: guitar and bass notes carry `finger` 1–4 and `hand: 'R'` (`guitar.ts` ~l.533), with mic-derived `vel`. | `src/engine/analysis/model.ts` `addTake` | False profile lines such as "finger 5 of the right hand plays 20 % louder" (the voicing top note), or the cresc peak finger. Guitar fretting fingers get mixed into the piano RH `HandMap`. | Skip notes with `accent`/`dyn`/`ghost` and takes with a shaped `dynamics` goal. Key contexts by instrument (`f:keys:R4`), or feed `f:` only for keys MIDI takes. |
| **B2** | **Swing is graded against a fixed 2/3.** Encore stores the measured swing (`Lick.swing`, e.g. 0.58 or 0.72), but the drill gets only `swing: boolean`. | `analyze.ts` `expTimeMs`, `timeline.ts` `timelineMs`, `encore/phrase.ts` ~l.373 | A faithful imitation of a 0.58 swing phrase reads ~35 ms early on every off-beat at ♩120. Fast bebop (natural swing → 0.55–0.6) is pushed towards an unnatural 2/3. | Pass the ratio through (`spec.swing: number`). Grade against the phrase's ratio or a tempo curve. |
| **B3** | **`velSD` feeds the weakness ranking for every drill.** It does so even with no dynamics goal, and mic takes give `velSD = 0` (all notes 64). | `ladder.ts` `applyTake` (`upd('vsd')`), `weakness` (W.vsd 0.15) | Mic-played items look perfectly even. Pieces and phrases with musical dynamics look uneven. "Today's weakest" is skewed. | Update `vsd` only when a dynamics goal is set and the take was MIDI. |
| **B4** | Chord spread is the **max** over all chords against a fixed 25 ms, with no shown detail | `analyzeTake` `chordSpread` | One rolled chord in a voicing drill gives "Chord notes not together" and fails the take. A player can't see which chord. | Use the median, or the share of chords > 25–30 ms, and mark the chord on the staff. |
| **B5** | `pedal.perChange` is discarded | `DrillTake.tsx` ~l.1127 (`m.pedal = { ok, total, pass }`) | The player is told "pedal 5/8" with no way to see which changes blurred. | Keep `perChange` in `TakeMetrics.pedal` and draw marks. |
| **B6** | MIDI latency calibration is "play along with the click, median offset" | `latency.ts` `latencyFrom`, `inputLatency` | It absorbs the player's own anticipation (typically −10…−30 ms) as "latency", so a habitual early or late bias is calibrated away and never reported. MIDI input itself has ~0–5 ms latency. The real unknown is the click's *audio output* latency. | Measure output latency (`AudioContext.outputLatency` / loopback), and use play-along only for the mic. Keep the play-along median as a *reported* tendency. |
| **B7** | The velocity range is calibrated from **one** softest and **one** loudest key | `Drills.tsx` `Calibration` | One accidental press shifts every pp…ff band (and `velStep`). The uncalibrated default bands overlap heavily (p 34–64, mf 64–96). | Take 4–6 presses per end with medians, plus a short "play p, mf, f" check. |
| **B8** | Voice `messa` grades only the loudness *range* | `vocal.ts` `gradeHoldRaw` case `messa` | A plain crescendo passes messa di voce. | Reuse the `swell` shape check from `gradeDynamic`. |
| B9 | The crescendo uses only one hand (`R` if any RH note) and the first note of each onset | `analyzeTake` cresc block | A future hands-together or contrary-motion cresc grades the RH only. | Fit per hand, report the worse one, and add hand-vs-hand parallelism. |
| B10 | `kot` / `kdr` are a pooled median over both hands and single-note onsets only. The legato limits are fixed ms (gap > 10 ms, overlap > 60 ms) at every tempo. | `analyzeTake` articulation | One hand can be detached while the other is legato and the take still passes. Slow legato with 80 ms overlap is musically fine but fails. | Per hand; overlap limit as a share of the IOI (e.g. ≤ 25 %), with a ms floor. |
| B11 | `accentGap` checks the mean only, never that unaccented notes stayed soft | `analyzeTake` | Accenting everything a bit unevenly can pass. | G9 (port `accentPos`). |
| B12 | `ioiRatio` per note and per-finger `tMean` are computed but never consumed | `analyzeTake`, `model.ts` | Wasted signal. | G3. |
| B13 | Encore takes are not recorded in the player model | `EncoreRun.tsx` (no `recordTakeAnalysis`) | The flagship phrase practice never shapes the profile. | Call `recordTakeAnalysis` in `settle` (tempo stage). |
| B14 | Velocity curve in the "Why?" sheet plots raw `vel / 127` with no band, target or calibration | `DrillTake.tsx` `VelocityCurve` | Hard to read and inconsistent with the live velocity bars. | Reuse `velBars` steps and target outlines. |
| B15 | Live mark window = 2 × SD limit (40–60 ms) while the pass rule is SD ≤ 20–30 ms | `liveGrade.ts` `markWindow` | Defensible ("ticks are the big misses") but lax for fast technique: a take full of 35 ms errors is all green live and then fails on SD. | Consider a second, subtler tick at 1 × SD. |

---

## 7. Proposed new exercises (the owner's examples)

All are MIDI only and will be blocked by `micUnmeasurable` for the mic. As with every technique item they start rubato, then go up a tempo ladder (`rubato.ts`), in all 12 keys.

### E1. Crescendo up the scale, diminuendo back down (redo of control 4)
- **Notes:** 2-octave scale, RH, then LH, then hands together (parallel), in all 12 keys.
- **Goal:** new `dynamics: 'cresc-dim'`. Keep the existing `cresc` as the up-and-down shape, but grade the halves separately.
- **Measures:**
  - up: slope > 0, R² ≥ 0.8
  - down: slope < 0, R² ≥ 0.8
  - peak note within ±1 note of the top
  - range ≥ 50 % of the calibrated span
  - no single step > 20 % of the span (catches a "jump")
  - hands together: per-hand R² and the L/R velocity difference stays ≤ 10 (parallel dynamics)
- **Feedback:**
  - live: velocity bars with the target ramp drawn as a hollow outline
  - summary: one line naming the worst part ("the diminuendo dropped all at once on the last 4 notes")
  - profile: "crescendos flatten in your LH"
- **Variants:** `dim-cresc` (start *f*, soft at the top, loud again at the bottom), which is harder because the top of a scale wants to be loud.

### E2. Contrary-motion scale with crescendo out and diminuendo in
- **Notes:** `genScale` with `motion: 'contrary'`, hands together from a unison. The hands move apart for 1–2 octaves and come back.
- **Measures:**
  - both hands' velocity lines (as E1), against distance from the start
  - hand parallelism: correlation of the RH and LH velocity series ≥ 0.8, mean |RH − LH| ≤ 10
  - hands together (existing `goal.hands`)
  - evenness (existing)
- **Why it matters:** the mirror fingering (thumbs together) exposes which finger in which hand is weak, so it combines well with G3.

### E3. Chromatic scale with a dynamic change
- **Notes:** chromatic scale (`chromaticFinger` exists), 1–2 octaves, RH, LH, then hands together. ABRSM-style a minor 3rd / major 6th apart is already supported (`chromApart`).
- **Goals:**
  - (a) crescendo over the ascent / diminuendo over the descent, as E1
  - (b) "terraced": one octave *p*, the next *f* (per-zone band hit like drums `swell` zones)
  - (c) even *pp* at speed: the hardest control, because 1-3 chromatic fingering makes the 3rd finger accent
- **Measures:**
  - E1 shape
  - per-finger velocity inside the take (fingers 1 vs 3 vs 2)
  - thumb/3 IOI bumps

### E4. (Suggested) Dynamics hold under speed
The same scale at the item's ladder tempo, graded at *p* (`even-p`). The level passes only when the velocity band share stays ≥ 85 % at the target tempo. This is the direct "control, not speed" check: a player who gets faster by getting louder fails.

**Implementation notes:** the cresc block in `analyzeTake` is the place for the split fit. `velBars.velTarget` needs a per-note ramp target (interpolate the level along the scale). New `DynamicsGoal` values `cresc-dim`, `dim-cresc`, `terraced` slot into `goalOf`. The control family in `generate.ts` (~l.5745) gets the new levels. Effort: about **M** for E1–E3 together, after G2.

---

## 8. Status (2026-11-17, after the second round)

Round 1 (commits `1627431c`, `8c74b1d8`) built the touch engine (`src/engine/drills/touch.ts`), its words (`src/i18n/measureText.ts`), the review lines (`src/ui/TouchLines.tsx`) and the staff marks (`src/ui/markLayer.ts` `drawTouch`). Round 2 finished every deferred item. Tests: `tests/measurement.test.ts` (round 1) and `tests/measurement2.test.ts` (round 2), synthetic takes for every measure, including the "no claim" cases.

### 8.1 Bugs

| # | Status | What was done | Where |
|---|---|---|---|
| B1 | Done (1) | Shaped, accented and written-level notes and guitar fingers are left out of per-finger velocity | `model.ts` `addTake`, `contextsOf` |
| B2 | Done (1) | Swing is graded against the phrase's ratio or the tempo's band | `touch.ts` `swingBand`, `analyze.ts` `expT` |
| B3 | Done (1) | `vsd` feeds the item only when graded (MIDI, dynamics goal) | `ladder.ts`, `vsdGraded` |
| B4 | Done (1) | Median spread and the share rolled; each rolled chord is marked | `touch.ts` `chordsOf` |
| B5 | Done (1) | Pedal kept per change and marked on the staff | `touch.ts` `pedalOf` |
| B6 | Done (1) | Device latency is split from the player's habit, which is reported | `latency.ts` `splitLatency` |
| B7 | Done (1) | Several presses per end, a p / mf / f check, refined from takes | `velCal.ts` |
| B8 | Done (1) | Messa needs the rise AND the fall | `vocal.ts` `swellOf` |
| B9 | Done (1, checked in 2) | The shape is fitted per hand (the worse one graded). The hands' lines must correlate (≥ 0.8) and stay within 10 of each other. Contrary motion uses each hand's own turning note. Nothing was missing. | `touch.ts` `shapeOf` |
| B10 | Done (2) | Articulation is judged per hand (the hand is named when both play). The legato overlap limit is max(60 ms, 25 % of the hand's IOI). | `analyze.ts` articulation block, `legatoOverlapLimit` |
| B11 | Done (2) | Unmarked notes that stand out like accents are counted (with G9) | `touch.ts` `accentsOf` |
| B12 | Done (1 + 2) | Per-finger `tMean` feeds the `late-finger` finding (now a hypothesis, see §8.4). `ioiRatio` puts a `gap` mark on the staff at each hesitation. Leap `tMean` feeds the `late-leap` finding (G11). | `analyze.ts`, `model.ts` `findings` |
| B13 | Done (1) | Encore takes feed the player model | `EncoreRun.tsx` |
| B14 | Done (2) | The "Why?" sheet's velocity row is now the live velocity bars (four calibrated steps, the target outline, the accent top), not raw vel/127 dots | `DrillTake.tsx` `VelocityCurve`, `TakeReview.tsx` |
| B15 | Done (2) | A note inside the mark window but beyond the take's SD limit (half the window) gets a faint short tick on its side. It never changes colour and never counts as a miss. | `noteMarks.ts` `softTick`, `markLayer.ts`, `measure.css` |

### 8.2 Gaps

| # | Status | What the player sees (he) | Where |
|---|---|---|---|
| G1–G8 | Done (1) | See round 1 | `touch.ts` |
| G9 | Done (2) | "ההטעמות במקום (10/12)", "הטעמות חסרות (2 מתוך 12)", "הטעמות במקום לא כתוב (3)". A hollow dot marks a missed accent; a small hollow `>` marks an extra one. Graded on accent3/4, groups of 3/4 and the moving accent; soft elsewhere. | `accentsOf` |
| G10 | Done (2) | "6 צלילים בשנייה" (always shown). "האטתם בשליש האחרון" (graded with the evenness goal). "נחלשתם בשליש האחרון" and "ה־D חלש מה־C (−15%)" are soft, named by note, never by finger. | `trillOf` |
| G11 | Done (2) | "איחור אחרי קפיצות (+40 מ״ש, 4)", measured against the hand's own steady offset, with an arrow after each late landing. Octaves are named "אוקטבות לא יחד (2 מתוך 8)". Profile: "אחרי קפיצות של סקסטה ומעלה אתם נוחתים באיחור של 20 מילישניות". | `leapsOf`, `chordsOf`, `findings` `late-leap` |
| G12 | Done (2), no new level | The parser keeps sf / sfz / fz / rf as a momentary mark on the next onset. Before, it stayed "in force" and hid the following p / f. fp / sfp leave the music at p. Lines: "תיבה 5: ה־sf לא בלט", "תיבה 7: fp בלי ירידה מיד אחריו", "sf / fp נשמעו (3)". **Not done:** a new control level. An sf in a scale is the same motion as control 5's accent, so the measure lives where the score writes it (pieces). | `score.ts`, `toDrill.ts`, `subitoOf` |
| G13 | Done (2) | CC67 is recorded on every MIDI take, and "una corda … tre corde" is read from the score's words. Lines: "הפדל השמאלי במקום הכתוב", "חסר פדל שמאלי (3 מתוך 8 צלילים)", "הפדל השמאלי נשאר לחוץ אחרי tre corde". Soft only. **No claim** when the keyboard sent no CC67 in the take (most keyboards have no soft pedal). | `DrillTake.tsx`, `unaCordaOf` |
| G14 | Done (2) | A phrase kept from a recorded take keeps each note's source velocity and its detached notes (`PhraseMark.vel / stac`). It is compared by shape, never by level: "העוצמות כמו במקור" / "העוצמות לא כמו במקור" (correlation < 0.5), and "במקור יש הדגשה בתיבה 2, פעמה 3". The model's staccato notes go through the existing staccato line. Soft: the notes and time pass a take. **No claim** when the model is even (SD < 4), has fewer than five notes in a hand, or is an older phrase without velocities. | `library.ts` `draftFrom`, `phrase.ts`, `modelOf` |
| G15 | Done (2) | The messa shape and the scoop were done in round 1. Brightness is the centroid's change within one held note, "שינוי בהירות +18%", shown under the metric bars and never scored (weight 0). Breathiness (HNR / CPP) is left out: it is unreliable on a phone microphone. | `vocal.ts` `brightnessChange`, `Vocal.tsx` |
| G16 | Not done (skipped) | Release velocity and channel aftertouch. Few keyboards send meaningful values, and reading them needs the MIDI input layer (`src/speech/midi.ts`), which was out of this round's scope (another agent works there). Nothing is claimed from them. | — |

### 8.3 Melody over accompaniment (pieces)

This applies where a piece chunk has a melody and an accompaniment: the RH top line (its upper voice when the staff has two voices) against the LH and the RH's lower voice.

- **Per bar:** the melody's median velocity must be ≥ the accompaniment's + 8 % of the calibrated span (≥ 6).
- **No claim:** two equal single lines of similar density (counterpoint, an invention) are not melody and accompaniment, so they get no line.
- **Per passage:** "המנגינה בלטה ב־6 מתוך 8 תיבות" (ok from 75 %). A hollow dot sits over the first melody note of each bar where it didn't stand out. "למה?" on a miss: "יד המנגינה כבדה יותר, הליווי קל יותר."
- **Long-term:** the `melody` tag becomes "המנגינה שלכם לא בולטת מעל הליווי" in the profile (G8 control stats) and goes to the coach with its confidence.

Code: `touch.ts` `melodyTexture`, `melodyOf`.

### 8.4 Long-term patterns and the coach

- Every profile pattern now reaches the coach with its confidence (`profile.ts` `profileDigest`), so each is phrased as a hypothesis of that strength.
- The per-finger timing finding is now a hypothesis: "ייתכן שזו אצבע 4 (יד ימין): הצלילים שהיא מוצעת להם מאחרים ב־18 מילישניות". It is silent when the player uses their own fingering. Per take, only notes and places are named.
- New control tags: `accent-miss`, `accent-extra`, `trill-slow`, `trill-fade`, `trill-pair`, `leap-late`, `octaves`, `subito`, `una-corda`, `model-dyn`, `model-acc`, `melody`, `mic-legato`, `mic-step` (`measureText.ts` `CTL_TEXT`).

### 8.5 The piano by microphone: what is measured and what is not

Code: `src/engine/drills/micTouch.ts`. The single-note microphone path now also keeps the sound's energy (RMS per ~25 ms frame). It applies to one hand, single notes, no accents and no pedal goal:

| Measure | How | Tolerance (honest) | Status |
|---|---|---|---|
| p vs f (relative steps) | Median attack peak (dB) per written zone | A step ≥ 5 dB in the written direction | Measured |
| Crescendo / diminuendo shape | Attack peaks along the scale, each half fitted | Change ≥ 6 dB and R² ≥ 0.6 (MIDI asks 0.8: the register and the phone's response add ±2–3 dB per note) | Measured |
| Legato vs staccato | How long each note stays within 18 dB of its peak, as a share of the gap to the next note | Legato ≥ 75 %, staccato ≤ 70 %; only with notes ≥ 250 ms apart and below C6 | Measured |
| Absolute level (pp…ff) | — | The phone's gain, distance and room move a level by more than a p-to-mf step | Left out |
| Accents at speed | — | The previous note's ring hides a +3 dB step | Left out |
| Voicing, hand balance, hands together | — | One sound, no hands | Left out |
| Portato, small overlaps, release timing | — | The room's decay blurs the last ~100 ms | Left out |
| Pedal | — | The release is not heard under it | Left out |

When the microphone can't measure, the take makes no claim and does not pass. The line says why, and "למה?" says: "הטלפון קרוב יותר לפסנתר, חדר שקט, בלי פדל.". The three cases:

- "חלש מדי למדידת עוצמה" (attacks < 10 dB over the room's floor)
- "מעט מדי צלילים ברורים למדידת המגע"
- "מהר מדי לשמוע את השחרור"

`micUnmeasurable` no longer blocks these goals; everything else still needs MIDI.

### 8.6 The level test

- **Touch by microphone:** a short section of what the phone measures: control 1 (staccato, RH), control 4 (crescendo up, diminuendo down, RH), control 13 (the reverse shape, RH) and control 15 (p / f steps, chromatic, RH). MIDI keeps its own section (`levelTest.ts` `TOUCH_MIC`, `Rung.spec`).
- **Honest places** (`finishPlaces`):
  - Control comes from the touch section when it ran. A hands step no longer lifts control above what touch proved.
  - Without a touch section, control is inferred from the hands steps and flagged.
  - By microphone, the pedal (`k-pedal`) is always flagged. Control above level 2 is flagged too: level 2 is as far as the microphone's steps prove without skipping a level it can't measure.
  - The summary shows "משוער" beside those families and one line: "משוער: לא נמדד במבחן הזה".
- No new levels were added, so the `encoreDifficulty` calibration exclusion (`control-13…16`) is unchanged.

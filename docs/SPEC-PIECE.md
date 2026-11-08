# SPEC — Learn a piece: the adaptive piece coach (owner 2026-11-08)

A teacher (or a player) brings a piece; the app breaks it into chunks, sets the tempo, listens, and raises the tempo /
adds chunks as the playing gets accurate — the way a good teacher would run the practice. Nobody combines all of this
today (research 2026-11-08: Piano Marvel = uploads + MIDI scoring + manual slices; Melodics = accuracy-gated BPM on short
fixed lessons; Soundslice = uploads + PDF scanning + loop + speed training not gated by accuracy; SmartMusic / Tonara /
Practice Space = assignments and practice minutes). **The gap: own score → automatic chunks → accuracy-gated tempo ladder →
joining + interleaving → teacher dashboard of tempo per chunk over days.**

## 1. The method (research basis)

- **Clean repetitions, not minutes** (Duke, Simmons & Cash 2009, JRME 56:4): the best players fixed errors at once, at a
  tempo they could play correctly, and repeated until correct several times in a row. Duration and number of reps did not
  predict quality.
- **Short chunks at musical boundaries** (Chaffin, *Practicing Perfection*): 1–4 bars, a phrase or motive; hard bars
  become their own "spot" chunk.
- **Slow, then step up — plus short bursts at tempo** (Kageyama; Gebrian, *Learn Faster, Perform Better* 2024): slow-only
  practice does not transfer fully; add 1–2-beat bursts at target tempo.
- **Interleave** (Shea & Morgan; Carter & Grahn 2016; Gebrian's "interleaved clicking-up"): rotate chunks, raising each in
  turn, instead of grinding one up the metronome.
- **Joins with overlap**: practise the seam (end of A into the start of B).
- **Sleep and spacing** (Simmons & Duke 2006): short daily sessions; start each with yesterday's material.
- **Mastery criterion** (Klickstein): 3 clean runs in a row (5 for complex passages). A little over-learning helps.
- **Attention and autonomy** (Wulf & Lewthwaite, OPTIMAL): feedback about the sound and the goal, visible progress, some
  student choice.

## 2. The algorithm (defaults; the teacher can override each)

1. **Segment**: chunks of 4 bars (2 in dense passages), snapped to phrase / rehearsal marks / repeats; per-bar difficulty
   from notes per second, chord size, leaps, accidentals; the hardest bars become 1–2-bar spot chunks.
2. **Start tempo**: 55 % of target (40 % for spot chunks); or 10 % below a clean sight-read try.
3. **Clean rep**: ≥ 95 % notes right, timing within max(60 ms, a 16th at the tempo), no stop.
4. **Step up**: 3 clean in a row (or 4 of the last 5) → +5 % below 70 % of target, +3 % to 90 %, +2 % above. At most three
   step-ups in a row on one chunk → rotate to another chunk.
5. **Step back**: 2 failed reps in a row, or < 80 % → loop the bar with the error (+ one beat lead-in) at −10 % until clean
   twice, then back. Three step-backs in a row → the chunk's tempo −5 % and offer hands separately / a rhythm variant.
6. **Add & join**: when chunk N reaches 70 % of target, open N+1 at N's working tempo −10 %; when N+1 passes, drill the seam
   (last bar of N + first bar of N+1), then the joined block at the lower of the two tempos. Backward chaining is a switch.
7. **Interleave**: with 3+ open chunks, rotate every 2–4 reps, weighted to the weakest.
8. **Bursts**: every 5th step-up, one 1–2-beat burst at target tempo.
9. **Days**: each session opens with yesterday's chunks at −5 % (fails → that chunk one step back); session goal 20–25 min
   with a break prompt; stop pushing when accuracy falls across 3 blocks (fatigue).
10. **Done**: the whole piece at target, 2 clean full runs on different days → maintenance (spaced review on days 1, 3, 7,
    14, weighted to weak bars). Feeds the scheduler, XP, streak and workout.

## 3. Input, display, following

- **v1 formats**: MusicXML / MXL and MIDI (MuseScore → export). **PDF**: shown as pages; the teacher draws bar boxes (fast
  tools: tap bar lines per system), which gives chunking + metronome + tempo ladder with "loose" feedback (onsets / chroma),
  no note-level scoring. Later: server OMR (Audiveris, AGPL, as a separate container) with a "check the result" screen.
- **Rendering**: OpenSheetMusicDisplay (BSD-3, VexFlow) with its Cursor API for piano / standard notation; alphaTab (MPL-2)
  for guitar tab. Auto-scroll to the current system; optional moving cursor and bar highlight for beginners.
- **Following**: MIDI — wait mode (advance when the expected chord is matched, tolerant to extras / rolled chords) and
  tempo mode (on-line alignment, windowed); after each rep a DTW alignment gives right / wrong / missed / extra and timing per
  note. Repeats expanded before alignment. Audio — monophonic instruments: the existing pitch pipeline; piano: score-informed
  chroma template matching (`src/engine/chroma.ts`), post-rep scoring; Basic Pitch (Apache-2) later for desktop.
- **Articulation & dynamics** from the score and the teacher: MIDI velocity vs p / f / hairpins, durations vs staccato /
  legato.

## 4. Teacher & student

- Assignment = piece + target tempo + instructions (articulation, dynamics, focus bars, chaining direction, due date) — in
  Classes (G2). The student's plan is generated; the teacher can drag chunk boundaries and mark spot bars.
- Dashboards (teacher and student): minutes per day / week, tempo-over-time per chunk and for the piece, a heat-map score
  (each bar coloured by tempo reached / target and error density), error hotspots, clean-rep ratio, and a "grinding
  mistakes" flag (many reps, low clean rate).
- Recording at each tempo milestone → "then vs now".

## 5. Stand-out extras (later)

Practice-coach voice ("bars 5–8 clean three times — up to 76"), auto rhythm variants (dotted / reverse / stop-and-go),
seam detector from full runs, accompaniment that follows the player once at tempo, performance-cue layer with random
entry points (Chaffin) for memory security.

## 6. Phases

- **A** — engine: score model (from MusicXML / MIDI), segmentation, the ladder state machine, rep scoring (MIDI), plan per
  day; unit tests with simulated players.
- **B** — UI: upload, score view with scroll + cursor, the practice screen (one screen: score strip, tempo, chunk, reps),
  results; piece library in Practice → Songs ("My pieces").
- **C** — teacher: assignments in Classes, dashboards and charts, practice minutes.
- **D** — audio following (mono + chroma), PDF bar boxes, then OMR.

Sources: cml.music.utexas.edu (Duke), Gebrian (OUP 2024), bulletproofmusician.com, musiciansway.com, pianomarvel.com,
support.melodics.com, soundslice.com, opensheetmusicdisplay.org, verovio.org, alphatab.net, github.com/spotify/basic-pitch-ts,
pymatchmaker.readthedocs.io. (Carter & Grahn 2016 and Simmons & Duke 2006 quoted from memory — check before citing.)

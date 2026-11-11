# SPEC-MY-SONG — "My song" in every course (built 2026-11-11)

Owner decisions (2026-11-11): (1) keep the player's recordings and their analysis on the device, with a small
"My songs" list; (2) a similar feature in every course, each measured with that course's existing machinery;
(3) results feed XP, streak, daily goal and ratings like any measured session. Only measured practice counts.

## 1. What the player sees

- **Practice → "My song" tile** in every course (`COURSE_ROWS`, before Games). Keys, guitar, bass, drums, ear and jazz
  open `#/mysong`; voice opens its existing level 1308 ("My song" in Songs with the band).
- **First time:** a quick lesson — `my-song` (play along: keys / guitar / bass / drums) or `my-song-ear` (transcribe:
  ear / jazz), gated through units `game:mysong` / `game:mysong-ear`. Voice keeps its level's lesson.
- **My songs** (library, shared by all courses incl. voice): name (tap the pencil to rename), duration, this course's
  last score, delete (asks first). "Add a recording" opens a local audio file; the text says own recordings only and
  that nothing is uploaded. Warnings: device almost full (navigator.storage estimate, < 10 % or < 50 MB left), no room
  (not kept — delete a song), private mode (works now, not kept), file too long / large (10 min / 60 MB), not audio.
- **Play along** (keys, guitar, bass, drums): the recording's waveform with its sections (the Slow-down tool's
  `LoopWave`, now shared), section ‹ › navigation, the Slow-down speeds (50–100 %), Listen (loops the section),
  Play along (a measured take: up to four beats of lead-in from the recording itself, then the section), the result
  (score, timing %, notes %, one line of why), Again / Next / Finish. Headphones must be confirmed (otherwise the
  microphone hears the recording); MIDI input needs none.
- **Transcribe** (ear, jazz): phrases of the melody (≤ 8 notes each), loop + slow, then "Play or sing it back" — the
  transcription coach's `DrillTake` (count-in, the player's instrument, MIDI or microphone) and its `comparePhrase`
  (pitch + rhythm, the first note that went wrong, octave forgiven).
- **Honesty line** on every practice screen (`measurePlan`): what is measured on *this* recording — timing + notes,
  timing only (the line was not taken out reliably), notes only (no steady beat), or nothing (listen and loop only,
  not counted, no take button).

## 2. Storage (src/storage/mySongs.ts)

- IndexedDB `toneturn-mysongs`, store `songs` (keyPath `id`): `{ id, name, addedAt, duration, size, type, blob,
  analysis, scores: { [course]: { score, at } } }`. Never uploaded (own audio is fine: docs/research/STANDARDS_LEGAL.md,
  memory my-songs-legal).
- `SongStore` interface (list without audio / get / put / update / remove) with an IndexedDB and an in-memory
  implementation; the simulator uses memory (simulated runs never touch real data). `put` reports `quota` on a
  QuotaExceededError. Tested with the in-memory store (no fake-indexeddb dependency).
- The analysis is versioned (`ANALYSIS_VERSION`); an older one is redone on open and saved back.
- A half-done session (`{ songId, sessionId, section, speed, takes }`) is kept in localStorage per course and reopens
  the same song and section after a reload or a closed app. Back from practice with takes = finish (recorded); with
  none = back to the list.

## 3. Analysis (src/engine/beatTrack.ts, src/engine/mySong.ts)

One analysis per recording (≤ 240 s analysed; the file is kept whole), shared by every course:

- **Beat grid** (new, offline): spectral-flux onset envelope (~11 kHz copy, 46 ms window, 11.6 ms hop, local mean
  removed) → tempo by mean-removed autocorrelation over 55–210 BPM with a log-normal preference around 120 and the
  double-period term → beats by dynamic programming (Ellis 2007) → confidence from periodicity, on-beat vs half-beat
  strength and interval regularity. ≥ 0.5 = timing is measured. Tests: click tracks at 72 / 100 BPM, a rock pattern
  at 140 with eighth hats (beat, not eighth), a drumless melody at 90, noise and random-time hits (not confident).
- **Melody**: the voice course's existing extractor (YIN frames → notes → phrases, voiceMySong.ts); confidence = the
  share of sounding frames its notes cover (≥ 0.5 = notes are checked).
- **Bass line** (new): two one-pole low-passes at 250 Hz, ~5.5 kHz, YIN 38–300 Hz, notes segmented an octave up,
  same-pitch fragments within 0.3 s joined; same confidence measure.
- **Sections**: four bars of the beat grid (eight above 150 BPM; a short tail joins), else melody phrases joined to
  ≥ 6 s, else 12 s.
- **Slowing down**: WSOLA time-stretch (40 ms frames, ±10 ms search) so the pitch stays and the take runs on the
  recording's own audio clock (the browser's preservesPitch only exists on media elements, whose clock cannot be
  read precisely enough to grade timing).

## 4. Measuring a take

- Capture: the existing `pitchCaptureFor(settings)` (microphone YIN frames, or MIDI); drums add the octave band powers
  and use the acoustic-kit onset tracker (`acousticOnsets`); bass uses the bass capture window (`bassPitchOpts`). The
  calibrated input latency is removed; the recording plays on its own AudioContext from a known moment.
- `gradePlayAlong`: every onset against the nearest beat or eighth — ±75 ms of real time (a quarter of an eighth when
  faster), tolerances scaled by the speed — after removing the take's own constant offset up to ±60 ms (an output delay
  the app cannot know); a larger offset is named as rushing / dragging. Notes: each line note is found when a heard note
  of the same pitch class starts within 180 ms of it. Score = 0.4 timing + 0.6 notes (or the one measured). Fewer than
  max(3, a quarter of the beats) onsets = not counted. A slowed take counts 0.9 + 0.1 × speed of its score.
- Transcription: `phraseOfMine` puts the phrase on a quarter-beat grid at the song's tempo (or 60 BPM without a beat),
  in the key from a duration-weighted major-profile match; `comparePhrase` grades it; `phraseTake` gives stars and a
  `dictation` rating event (a slowed phrase ×0.85).

## 5. Into the rest of the app

`sessionResult` → one `recordCompletion` (`lessonId: my-song-<course>`, `course`, XP ≤ 40, takes / clean takes) →
XP, streak, daily goal and the league's per-course XP; rated items per section's best take: `timing` (difficulty from
the heard tempo), `instrument` (notes), `dictation` (transcriptions). The song keeps the course's last score. Voice
1308 now picks from the same library (its melody limited to the 75 s take) and writes its score back.

Bass plan item E6 (transcribe from your own recording) is covered (docs/research/BASS_NICHE_PLAN.md).

## 6. Not built / limits

- No chord extraction from the recording (only beat, melody, bass line); keys / guitar are checked against the melody,
  not against chords or comping.
- Meter is assumed to be 4 for sections (no downbeat detection); the beat grid itself does not need it.
- Pitch on a full band mix is often unconfident — then timing only, and the screen says so.
- Polyphonic playing is heard monophonically (the strongest pitch); chords played on keys / guitar are judged by
  timing and their top pitch.
- Not verified on a real phone with real songs: timing calibration, the output latency of Bluetooth headphones, the
  analysis time of a long file on an older phone (≈ 240 s analysed, yields every few hundred frames).
- No "write it as degrees" step in the ear version (play / sing back only).
- E2E: e2e/mysong.spec.ts (keys / drums with a synthetic WAV and Chrome's fake microphone, the guitar tile, rename /
  delete, ear in the simulator) and voiceP2's 1308 test pass at 390 × 844 without scrolling.

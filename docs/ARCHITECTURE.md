# Architecture

```
src/
  engine/        pure TypeScript, no browser APIs — fully unit-tested
    pitch.ts       spelled pitch classes, scales, degrees, naming (letter / fixed-do × he / en), cadence voicing
    parser.ts      deterministic transcript → typed answer (degree, note name) | command | ambiguous | unrecognized
    lesson.ts      versioned content schema, seeded generation, stimulus → timed note events
    session.ts     scoring reducer with turn tokens (stale / duplicate callbacks can't score)
    yin.ts         YIN pitch detector (for singing milestones; already used by Voice check)
  game/
    adapters.ts    AudioEngine / PromptPlayer / SpeechTranscriber / MicAccess / Clock interfaces
    controller.ts  turn-taking loop, mode switching, pause/resume, permission recovery
    narration.ts   spoken text (separate from on-screen strings)
    fakes.ts       deterministic adapters for tests + simulator
  audio/piano.ts   Web Audio procedural piano + cues
  speech/          browser adapters: getUserMedia, SpeechRecognition, speechSynthesis, error classification
  speech/voices.ts voice catalogue: language filter, gender detection by known voice names, chooser with fallbacks
  storage/         IndexedDB KV, progress/settings (idempotent writes, streaks, review queue)
  i18n/strings.ts  UI strings he/en + recovery instructions
  ui/              React screens (Home, Lesson, Recap, Settings, Diagnostics)
```

## Turn-taking

States: `idle → intro → prompting → playback → listening → evaluating → feedback → (next) … → complete`, plus `paused`.

- One async run at a time. `restart()` aborts the previous run's `AbortController`, stops audio/TTS/recognizer and increments the session `turn`. Every grade carries the turn it was issued in; `grade()` rejects mismatched turns and already-resolved questions → no double scoring.
- The recognizer is created per listen and only during `listening`; a new instance waits for the previous one's `end` (Chrome rejects overlapping starts).
- Silence / unclear / ambiguous → no attempt consumed, short spoken re-ask, bounded (2) then a *Listen* tap. Recognition errors → permission panel, `Retry` replays the same question.
- Scoring policy: 2 musical attempts; XP only for a first-try correct answer (a binary choice would otherwise be farmable); after the second miss the answer is revealed, explained and resolved audibly.

## Why procedural audio

No sample pack with a clearly compatible licence is bundled yet, so milestone 1 uses an improved procedural piano that works offline and has no licensing burden. Replacing it with a CC0/CC-BY sampled piano (e.g. Salamander Grand, CC-BY 3.0) is a drop-in `AudioEngine` change; record the licence in `docs/` if done.

## Speech privacy

Browser `SpeechRecognition` in Chrome/Edge sends audio to the vendor's service unless on-device processing is available. The app discloses this before first voice use (consent sheet) and stores no audio. The Voice check probes `SpeechRecognition.available({processLocally:true})` where exposed.

## Skill ratings (0.6)

`src/engine/rating.ts` — explainable Elo-style model per skill:

- Expected score `E = 1 / (1 + 10^((D − R) / 400))`, update `R' = R + K·(S − E)`, bounded to ±60 per item.
- `K = 64` while provisional (< 8 rated items), then `24`. Start rating 1000.
- Only the **first musical attempt** of an item is rated (`S = 1` correct, else `0`). Silence, unclear speech, permission failures and skipped items are never rated. Each item has an event id (`<session>:<question>` / `g:<game>:<seed>:<turn>`), so replays and double callbacks can't farm rating.
- Item difficulty comes from the content: e.g. degrees with 2 / 3 / 7 choices = 900 / 1050 / 1250; chords maj/min arpeggio / block / four qualities = 950 / 1100 / 1300; memory-game rounds `760 + 70·length`.
- **Skill Map normalisation:** ratings are mapped linearly from the band 600–1600 to 0–1. Evidence: 0 items = *unmeasured* (hollow dotted marker at the centre, never plotted as zero), 1–7 = *provisional* (dashed), ≥ 8 = *measured*. Bands: < 900 beginner, < 1100 developing, < 1300 solid, else advanced. A weekly snapshot is kept for "4 weeks ago" comparison.
- **Placement** (`src/engine/adaptive.ts`): 9 items (degrees, chords, cadences × 3); each skill starts at the middle level and moves up after a first-try correct, down after a miss (`adapt` hook in the controller regenerates only unanswered items).
- **Review**: question tags from past misses are rebuilt as fresh items; a first-try correct answer anywhere clears that tag. On a revealed answer the player hears their answer, then the correct one (`compareStimulus`).
- **Weekly puzzle**: ISO week + band + version seed → the same degree-sequence puzzle for everyone in a band; gold on the first try, silver on the second; no XP (kept apart from league XP); only the first scored try of a week counts.

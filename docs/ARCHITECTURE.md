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

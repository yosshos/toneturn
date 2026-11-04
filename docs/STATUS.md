# Milestone report — 2026-11-04

## Update — spec addendum (A: voice choice, B: English default + Hebrew)

- English default; settings v2 with migration from v1 first-run defaults.
- Auto note naming per channel language (he → Do-Re-Mi, en → letters), overridable; Hebrew accidentals always דיאז/במול.
- Narration voice picker: gender preference + per-language voice list with detected gender and preview; fallback chain tested.
- UI polish: settings regrouped into cards with live naming example, EN/עב toggle on home, note names isolated for bidi, lesson reordered so answers sit closer to the thumb, narration caption shown during questions, pitch readout holds last confident value.
- Tests: **90 unit/controller tests** + **11 Playwright E2E tests** in headless Google Chrome (desktop + Pixel 7 viewport), all passing:
  home English default / Hebrew RTL + persistence, Buttons lesson 3/3 with double-tap guard, Voice hands-free in the simulator, Buttons→Voice mid-question, denied mic → capture panel → Buttons, fake-device mic capture yields signal + pitch, denied mic classification in Voice check, settings naming/voice picker.
- Findings: `SpeechRecognition.available()` **crashed the renderer** in headless Chromium, so the on-device check is now a manual button. Playwright's bundled Chromium is blocked from executing on this PC, so E2E runs on installed Chrome (`channel: 'chrome'`). Automation denies the mic as `NotSupportedError` (now classified as permission-denied, raw error still shown).
- Still pending: real speech recognition on a person's desktop, Android, installed PWA (see QA.md).


## Implemented (milestone 1)

- Project scaffold (Vite 8, React 19, TypeScript 7, Vitest 5), PWA manifest + app-shell service worker.
- Voice check diagnostics (environment, audio, capture, recognition, TTS voices, on-device probe, JSON report).
- Lesson “Same B♭, two homes” (intro + 3 scored rounds), hands-free voice loop, Buttons mode, persistent switch, recap, recommendation, local progress, review queue, streaks.
- Hebrew/English UI (RTL), independent answer/narration languages, letter vs fixed-do naming in narration.

## Tests executed

- `npm test` → **64 passed** (parser 40+, pitch/lesson/YIN, session reducer, progress idempotency + streak boundaries, controller: 3 hands-free rounds after one Start, retry/reveal, silence/unclear not penalised, bounded silence, voice commands, capture denial, recognition-service denial mid-question + Retry, switch while listening, switch during feedback, Buttons→Voice replay, pause/resume). All with fake adapters — **this is not evidence that real recognition works.**
- `npm run build` (typecheck + bundle) → OK.
- Browser (Claude app pane, Chrome 152 / Windows): simulator run end-to-end ✓; real Voice → mic blocked by the pane → `capture/permission-denied` panel ✓ → Switch to buttons ✓ → attempts preserved ✓; Voice check renders ✓; no console errors.

## Not verified / pending

- **Real speech recognition on any surface** — needs a standalone Chrome/Edge tab with a microphone (QA.md steps 2–8).
- Android Chrome, installed PWA, Bluetooth, lock screen, interruptions.
- Perceived piano quality vs. alternatives (listening test), clipping measurement.
- Automated browser E2E (Playwright with fake adapters) — not yet added.
- PNG icons (192/512) for Android installability.

## Backlog

- M2: five-question slice with a sung interval (YIN segmentation, per-note strip, spoken pitch feedback), vocal-range calibration, review session.
- M3: placement, per-skill Elo ratings, radar Skill Map, weekly puzzle, local two-player.
- M4: curriculum expansion, accounts, leagues, scoreboard, friends — server-side scoring.

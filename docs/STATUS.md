# Milestone report — 2026-11-04

## Update 7 — v0.7.1: rhythm split into memory and precision (owner's request)

- New Skill Map axis *Rhythmic precision* next to *Rhythmic memory*, paired like *Singing in tune* / *Melodic memory*. Memory uses a lenient window; precision is graded 0–1 and only on remembered patterns. Ratings accept graded scores. Tests: 249 unit.

## Update 6 — v0.7.0: intervals and inversions

- Lesson 6 *Thirds, fifths, octaves* (melodic then harmonic, interval names in en/he) — the Intervals axis on the Skill Map is now measurable.
- Lesson 7 *Which note is in the bass?* — major triads with root / third / fifth in the bass; bass played alone first and voiced at least a sixth below the triad so it is audible (spec: "teach C, C/E and C/G with the bass audible"). Non-chord bass (C/D) remains backlog.
- Wrong answers in both play "your answer, then the right one".
- Cloud migration 4 applied (new lesson ids; friends' lesson count includes them).
- Tests: **243 unit** + **28 E2E**, all passing.

## Update 5 — v0.6.0: hosting, placement, Skill Map, review, weekly puzzle

- **Live at https://yosshos.github.io/toneturn/** (repo public by owner's decision; history scanned — no secrets ever committed). Actions: typecheck → unit tests → build → Pages. Supabase site URL + redirect allow-list updated; live check: loads, service worker controls the page, offline reload, Google sign-in redirects back to the Pages URL.
- Milestone 3 core: per-skill Elo ratings, adaptive placement, radar Skill Map with evidence levels + text equivalent + diagnosis + recommendation + snapshots, review session with your-answer-vs-correct playback, weekly puzzle (gold/silver, attempts separate from XP), tap-latency calibration, new item types (degrees 1–7, diminished/augmented, spoken degree sequences).
- Fixed during testing: practice tools skipped the voice-consent notice; stray control characters from a patch script inside a regex.
- Cloud: migration 3 applied (per-item results, new session types, path-only lesson count) and verified with a rolled-back insert as a signed-in user.
- Tests: **213 unit** + **28 E2E** (incl. adaptive placement → Skill Map, puzzle by voice and keypad).

## Update 4 — v0.5.0: menu, versions, install/update, push reminders, friends

- Versioning: `package.json` version + git commit + build time in the app and service worker; player-facing changelog; "What's new" card once per new version.
- Menu ☰: install (beforeinstallprompt / iOS instructions), check for updates / update now, notifications, friends, settings, voice check.
- Fixed during testing: first-time service-worker activation reloaded the page (would interrupt a lesson); update check could hang on "Checking…".
- Push reminders: permission from a tap, subscription stored per device, hour + language. **Live on 2026-11-04:** Edge Function `toneturn-streak-reminder` deployed (JWT off, secret header), 4 secrets set, hourly pg_cron job with the secret in Vault; a cron-style call returns `200 {"due":0,"sent":0,"removed":0}`; calls without/with a wrong secret get 403. **Not yet seen:** a real notification on a device.
- Friends: codes, requests, accept/decline/remove, weekly XP league with streak/total XP/lessons/game bests via security-definer functions. **Applied on 2026-11-04** and tested on the project inside a rolled-back transaction with two throwaway users: add by code (case-insensitive), pending shows name only, accept reveals stats, streak 2 / week XP / max game best correct, self-add refused, direct table writes and cross-user result reads blocked, reminder selection picks only the player with a streak who hasn't practised today, and signed-in users can't call it.
- Tests: 181 unit + 24 E2E (incl. production-build service worker + offline load), all passing.

## Update 3 — memory games (spec addendum C)

- **Echo Chain** (melodic memory): degrees 1-2-3-5 pads in a stated key, grows by one note per round; answer by tapping pads or **singing** (note segmentation + edit-distance alignment, per-note ✓/✗/missed strip, octave-insensitive).
- **Beat Echo** (rhythmic memory): count-in, woodblock demo over a pulse, second count-in, player taps (screen / Space) or **knocks** (mic onset detection); timing on the audio output clock, ±100 ms-ish tolerance, early/late report. Tempo slow/medium/fast.
- **Local challenge**: 1–4 players on one device, named + coloured turns, different sequence of the same length per player, eliminations after the full round, ties, rematch, scoreboard; device bests saved locally.
- Tests: +32 unit/controller tests (176 total) and +5 E2E (19 total) incl. a real-timing tap round in Chrome. **Not yet measured:** real singing segmentation and knock detection on a person's device.

## Update 2 — more content, singing, cloud save code

- Generic question kinds (degree / chord quality / cadence / singing) through one controller; 4 new lessons; path with unlocks, stars, daily XP goal; celebration burst; per-kind answer buttons; next-lesson flow.
- Singing (milestone 2 core): raw-mic YIN capture only during the window, attack skipped, median pitch, octave-insensitive ±35 ¢, sharp/flat/wrong/unclear, spoken direction, live tuner; unusable capture never counts as wrong; explicit Sing now in Buttons mode.
- Cloud: Supabase client, Google OAuth sign-in, idempotent two-way sync, SQL migration with RLS + plausibility checks. **Live on 2026-11-04** (project `jgmahngenrpqnvbvpztf`, free org, separate account): tables created; signed-out read/insert verified as `permission denied`; Google provider enabled; owner signed in on desktop Chrome and the app reported *Synced*. Server-side contents not inspected (no service key by design).
- Tests: **144 unit/controller** + **14 E2E** (Chrome, desktop + Pixel 7) passing. Singing verified with synthetic pitch only — **real singing not yet measured.**

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

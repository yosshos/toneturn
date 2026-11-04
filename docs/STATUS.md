# Milestone report — 2026-11-04

## Update 16 — v0.16.0: melodic matrix complete for sequences (spec H)

- New kind `name-seq` (heard → names #2, degrees → names #6); `degree-seq` given as names (#5); `sing-seq` asked by names (#4). Lesson 20 *Note sequences*; review tags for all variants; note-name sequence parser (letters / Do-Re-Mi, he/en, glued "Bb,"); keypad of the key's seven note names; keyboard hidden when it would give the answer away.
- Tests: 363 unit (incl. a hands-free Hebrew Do-Re-Mi run of lesson 20) + 2 E2E.

## Update 15 — v0.15.0: rhythm R4–R8 and build-a-bar (spec G)

- Model: meters 4/4, 3/4, 6/8 (bpm in quarters; clicks on the dotted-quarter pulse in 6/8), swing (off-beat eighths played at 2/3 of the beat), 13 new cells (sixteenth groups, syncopa, eighth rest, eighth triplet, dotted half, 6/8 cells, quarter-note triplet); keys carry meter/swing (`m3:`, `m6:`, `sw:`).
- Notation: time signatures, tuplets, per-cell beaming, swing marking; bare one-cell blocks for the builder.
- Tolerance per level from the nearest wrong onset (sixteenths ¼ beat, triplets ⅙ beat), floor 45 ms.
- Words: names and syllables for every new cell (en/he), parser is meter-aware; every generated rhythm round-trips through names and syllables in both languages (tested).
- Dictation "Build" mode: palette per level/meter, undo, done when the bar is full; graded by what is heard.
- Tests: 357 unit + R4 E2E to the end (taps on the metronome, choose, build).
- Not yet: hold-to-sustain durations; swing ratio is fixed at 2:1 for playback (grading accepts the tolerance window around it).

## Update 14 — v0.14.0: riffs & runs (spec K)

- Engine `runs.ts`; question kinds `sing-run` and `run-id`; lesson 14; Runs workshop tool; skill `agility`; voice parsing of "blues / pentatonic / up and down" (en/he); per-note contour UI with statuses ✓ ↑ ↓ ~ ✗ and a spoken-style summary ("notes 4 and 5 were flat").
- Server: lesson ids validated by pattern (migration 10, applied) so new lessons need no migration; friends' "lessons done" excludes generated sessions.
- Tests: 342 unit (grading incl. octave-free, tolerance by speed, smear, hands-free lesson) + 2 runs E2E (simulator).
- Not verified: real fast singing through the microphone (20 ms hop, segmentation of 120 ms notes).

## Update 13 — v0.13.0: daily challenge leaderboard

- Migration 9 `toneturn_daily`: key table (no grants) seeded with 792 days (2026-11-01 → 2028-12-31) from `scripts/daily-keys.ts`; results table; `toneturn_daily_submit` grades (plausibility 150 ms–10 s, streaks, squares) and keeps the first play; `toneturn_daily_board` returns count, rank, top %, friends. Verified live with three simulated users (rolled back): 5700 / 2845 points as computed locally, replay ignored, old day refused, non-friend hidden.
- Client: answers and times stored with the local result, uploaded when signed in (also later), board card on the daily screen.
- Tests: 326 unit (incl. seed-vs-generator parity and local-vs-server points) + daily E2E checks the signed-out prompt.

## Update 12 — v0.12.0: online rooms (spec I, part 2)

- Migration 8 `toneturn_rooms`: rooms, players, answers, and a key table with no grants; security-definer functions create / join / state / start_round / answer / close; RLS lets members read only their room row (for Realtime). Verified on the live project with three simulated users in a rolled-back transaction: host-only start, hidden key, hidden results while open, outsider and late-join refused, points 960 / 900 / 950 / 1045 (streak).
- Client: `RoomBackend` (Supabase + in-memory fake with the same rules), `RoomController` (server-driven rounds, local timing from end of playback, reveal, host fallbacks), screens for create/join, lobby with invite, play, reveal board with movement arrows, podium. Sign-in returns to the room screen.
- Tests: 323 unit (rules, two controllers in sync, absent player) + 3 online E2E (signed-out prompt, full game vs bots, unknown code).
- Not verified: two real accounts on two phones over Realtime.

## Update 11 — v0.11.0: daily challenge and same-device duel (spec I, part 1)

- `src/engine/tournament.ts`: button-answerable items (≤ 4 choices: degrees 1/3/5, chord qualities, intervals, cadences), seeded sets, a daily set per calendar day (versioned seed), round scoring with spec-J tournament points (500 + speed × streak), plausibility (≥ 150 ms, inside the window), standings with time tie-break, spoiler-free share text.
- `src/game/tournamentController.ts`: countdown → same stimulus → answer window timed from the end of playback → reveal (plays the explanation when nobody was right) → next round; first answer per player counts.
- UI: Daily challenge card (Practice tools) with share card and "done today"; Duel card (Games) → names, question set, 5/10/15 rounds → split screen with the top half rotated.
- Storage: `progress.daily[day]` (first play only, kept across cloud rebuilds, local only for now).
- Tests: 318 unit + 2 tournament E2E (full duel, full daily with reload).
- Not yet: online rooms (Realtime), server leaderboard for the daily challenge.

## Update 10 — v0.10.0: rhythm reading & dictation R1–R3 (spec G)

- `src/engine/rhythm.ts`: 12-ticks-per-quarter model, cells (♩ 𝄽 𝅗𝅥 𝅝 ♫ ♩.♪), bar-safe generation per level, sound signature (graded by what is heard), minimal-pair distractors, count-in + metronome timelines, grid-derived tolerance, reading grade (70 % pattern + 30 % precision), names and Kodály syllables in English and Hebrew, spoken-words parser.
- Notation with VexFlow 4.2.5 (MIT), lazy-loaded; percussion clef, beams, dots, rests; text alternative.
- Reading: notation or words → perform on the metronome by tap / Space, or "ta" onsets from the microphone in Voice mode (onset detection, not speech recognition); per-onset early/late strip; no input = unclear, never wrong. Reading feeds *Rhythm reading* and *Rhythmic precision*.
- Dictation: hear a bar → choose among 4 notated options, or say it; reveal plays "your rhythm, then the right one". Feeds *Rhythm dictation*.
- Server: lesson ids extended (migration 7). Tests: 310 unit + rhythm E2E with real metronome timing.
- Not yet: R4–R8 (sixteenths, syncopation, triplets, compound meter, swing), build-a-bar answers, hold-to-sustain durations; real "ta" detection not yet measured with a person.

## Update 9 — v0.9.0: full melodic matrix (spec H)

- Lessons 8–10 cover the missing directions: heard → note name (with a key reference; keyboard hidden so the lit key can't give the answer away), name → degree and degree → name (symbolic, no sound, longer reference time), echo a single note, name → sing, and degrees → sing a sequence (segmentation + alignment + partial credit + per-note strip).
- New Skill Map axis *Note naming*; symbolic conversions feed *Scale degrees*; the review queue rebuilds every new kind.
- Server: lesson ids extended (migration 6). Tests: 283 unit.

## Update 8 — v0.8.0: scoring model (spec J)

- `src/engine/scoring.ts`: accuracy per item type (partial credit for pitch and sequences), guess-corrected attempt credit, log-scaled relative speed factor, replay factor; three derived scores (graded skill rating, XP, tournament points). All constants in `SCORING`.
- Controller measures response time from the end of the stimulus as heard: buttons = tap time, voice = speech-start (not the transcript), singing = first stable voiced frame; unclear answers restart the clock at the next listen; replays counted.
- Untimed by default for a device's first 7 days; Settings → Timed scoring (auto / on / off).
- Answer chips (accuracy, ⏱ time, attempts, +XP) and median answer time in the recap.
- Server: XP plausibility relaxed to `xp ≤ total × 20` (migration 5, applied).
- Tests: 264 unit (scoring properties: time / attempts / accuracy monotonicity, untimed independence, bounds).

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

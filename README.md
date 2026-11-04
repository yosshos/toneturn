# ToneTurn

Voice-first ear-training game: hear it, say it, sing it. Responsive web app (desktop + Android), TypeScript + React + Vite, installable as a PWA where supported. No accounts, paid APIs or cloud services.

## Run

```bash
npm install
npm run dev            # http://localhost:5173  (localhost is a secure context → mic allowed)
npm run dev:https      # https://<LAN-IP>:5173 with a self-signed cert, for Android on the same Wi-Fi
npm test               # unit + controller tests (deterministic fake adapters)
npm run test:e2e       # Playwright E2E in your installed Google Chrome (headless, fake mic device)
npm run test:all       # both
npm run build          # typecheck + production build into dist/
npm run preview        # serve dist/ (service worker active only in production builds)
```

Useful URLs

| URL | What |
| --- | --- |
| `/` | Home → **Practice** (the single Start gesture) |
| `/#/diagnostics` | **Voice check**: probes environment, audio, mic capture and speech recognition separately; copyable JSON report |
| `/?sim=1` | **Simulator**: scripted voice answers, real audio/narration. Clearly labelled, writes no progress. Not evidence that recognition works. |

> **Test voice in a standalone browser tab.** Embedded previews (attachment previews, IDE/app browser panes, iframes) often block the microphone. The Voice check shows `embedded (iframe)` and `mic permission` so the surface is recorded.

## What's in milestone 1

- Illustrated home, lesson path with next unlock, Voice/Buttons switch, XP and streak.
- Lesson **“Same B♭, two homes”**: intro comparing the same B♭4 after a B♭-major cadence (degree 1) and an E♭-major cadence (degree 5, with resolution), then 3 scored rounds answered “one”/“five” (Hebrew or English), 10 XP per first-try correct answer, replayable recap with one recommendation.
- Hands-free voice loop: prompt → cadence → target → mic opens (ready cue when capture actually starts) → grade → spoken feedback → next. Mic closed during narration and playback. Voice commands: repeat / skip / stop / explain (he + en).
- Persistent Voice/Buttons switch: cancels pending audio, narration and recognition; keeps question, attempts and score; Buttons shows controls immediately; Voice replays the prompt.
- Permission triage: capture vs recognition errors classified separately (insecure context, iframe policy, blocked site permission, OS privacy block, no device, busy device, unsupported recognizer, service denial, network, language), with browser-specific recovery steps, Retry (same question) and Switch to buttons. Denials never count as wrong answers.
- Procedural piano (no samples): stiff-string partials, two-stage decay, hammer noise, closing low-pass, room reverb, limiter. Distinct bell cues for ready / correct / wrong / complete.
- Local progress in IndexedDB, idempotent completion, review queue, local-midnight streaks. App-shell service worker.

## Lessons (path unlocks in order)

| # | Lesson | Skill | Answer |
| --- | --- | --- | --- |
| 1 | Same B♭, two homes | degrees | “one” / “five” |
| 2 | Home, third, fifth (changing keys) | degrees | “one” / “three” / “five” |
| 3 | Major or minor? | chord quality | “major” / “minor” (also “happy/sad”, מז'ור/מינור) |
| 4 | Cadence detective (V–I vs ending on V) | cadences | “resolved” / “open” (נפתר / פתוח, “not resolved”) |
| 5 | Sing home & five | sung pitch | sing; live tuner, ±35 ¢, octave-insensitive, spoken high/low feedback |
| 6 | Thirds, fifths, octaves (melodic, then harmonic) | intervals | “third” / “fifth” / “octave” (טרצה / קווינטה / אוקטבה) |
| 7 | Which note is in the bass? (C, C/E, C/G) | chords | “root” / “third” / “fifth”, or “root position / first / second inversion” |
| 8 | Notes and degrees (hear → name, name → degree, degree → name) | note naming / degrees | note names in your naming system (“B flat”, “סי במול”) or degrees |
| 9 | Sing it by name (echo a note; sing a named note after a reference) | singing | sing |
| 10 | Sing the degrees (“1 3 5” → sing them in order) | singing | sing; per-note strip, partial credit |
| 11–13 | Rhythm 1–3 (quarters/halves/rests → eighths → dotted quarter) | rhythm reading / rhythm dictation | tap or say “ta” on the metronome; pick the notation you heard, or say it (“ta ti-ti ta”, “quarter, two eighths…”, טה טי-טי) |

`?unlock=all` opens every lesson (testing). Singing uses the microphone in both modes; in Buttons mode it waits for a **Sing now** tap.

## Live

**https://yosshos.github.io/toneturn/** — deployed by GitHub Actions on every push to `main` (typecheck + unit tests + build with `BASE_PATH=/toneturn/`).

## Practice tools (0.6)

- **Find my level** — optional 9-question adaptive placement → **Skill Map** (radar: unmeasured / provisional / measured, text list, diagnosis, one recommendation, 4-week comparison).
- **Review my mistakes** — fresh items from your misses; hear your answer next to the right one.
- **Weekly puzzle** — same degree-sequence puzzle for everyone in your band; gold / silver.
- **Beat Echo calibration** — tap along to 12 clicks; the median offset corrects your device's tap delay.
- **Daily challenge** (0.11) — 5 mixed questions, the same for everyone on a calendar day; points = 500 + up to 500 for speed × streak bonus; first play counts, replays are practice; Wordle-style share card (🟩 fast, 🟨 slow, ⬜ miss — no answers).

## Duel on this device (0.11)

Two players, one phone or tablet, split screen: player 1's half is rotated to face them across the table. Same sound for both; each player's first tap counts; time runs from the end of the sound; 10 s window; standings with tie-break by total response time; rematch. Buttons only (voice can't tell two speakers apart).

## Menu, versions, updates

☰ on the home screen: version / build / commit and **What's new**, **Install app** (browser prompt, or iOS instructions), **Check for updates / Update now** (a new service worker waits until the player chooses; first-time activation never reloads the page), notifications, friends. The service worker is generated at build time (`src/sw-template.js`) with the version and the exact asset list. Bump `package.json` and add a `src/version.ts` changelog entry for each release (a unit test keeps them in sync).

## Friends & streak reminders (optional, needs sign-in)

Friend codes, requests, and a weekly-XP league with streak, total XP, lessons and game bests (game bests are self-reported). Daily streak reminders via Web Push, sent hourly by a Supabase Edge Function to players who have a streak and haven't practised yet. Server setup: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) part 2.

## Cloud save (optional)

Supabase + Google sign-in. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`; apply `supabase/migrations/*.sql`. Without these the app is fully local. Results sync idempotently by session id (upsert on `(user_id, session_id)`), tables are owner-only via RLS, and the database rejects implausible XP.

## Languages, note names and voices

- **English is the default**; Hebrew is fully supported (RTL, Hebrew narration, Hebrew spoken answers). Quick toggle on the home screen, fine-grained in Settings: app language, answer language and narration language are independent.
- **Note names — Auto** (default): Hebrew → דו רה מי, English → C D E. Override to Letters or Do Re Mi. Hebrew always says **דיאז / במול** (e.g. “סי במול”, or “בי במול” with letter names); “פלאט/שארפ” are accepted as answers but never produced.
- **Narration voice**: Any / ♀ Female / ♂ Male preference plus a list of the device's voices for the narration language, each labelled with its detected gender and a ▶ preview. Choices are saved per language; a missing voice falls back to the gender preference, then the best voice of that language. Which voices exist depends on the OS/browser (e.g. Windows: David/Zira, Edge online: Aria/Guy/Jenny, Hebrew: Asaf ♂ / Hila ♀ / Avri ♂).

Full spec including the addendum: [docs/SPEC.md](docs/SPEC.md).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/QA.md](docs/QA.md) and [docs/STATUS.md](docs/STATUS.md).

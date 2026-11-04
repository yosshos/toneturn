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

`?unlock=all` opens every lesson (testing). Singing uses the microphone in both modes; in Buttons mode it waits for a **Sing now** tap.

## Cloud save (optional)

Supabase + Google sign-in. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`; apply `supabase/migrations/*.sql`. Without these the app is fully local. Results sync idempotently by session id (upsert on `(user_id, session_id)`), tables are owner-only via RLS, and the database rejects implausible XP.

## Languages, note names and voices

- **English is the default**; Hebrew is fully supported (RTL, Hebrew narration, Hebrew spoken answers). Quick toggle on the home screen, fine-grained in Settings: app language, answer language and narration language are independent.
- **Note names — Auto** (default): Hebrew → דו רה מי, English → C D E. Override to Letters or Do Re Mi. Hebrew always says **דיאז / במול** (e.g. “סי במול”, or “בי במול” with letter names); “פלאט/שארפ” are accepted as answers but never produced.
- **Narration voice**: Any / ♀ Female / ♂ Male preference plus a list of the device's voices for the narration language, each labelled with its detected gender and a ▶ preview. Choices are saved per language; a missing voice falls back to the gender preference, then the best voice of that language. Which voices exist depends on the OS/browser (e.g. Windows: David/Zira, Edge online: Aria/Guy/Jenny, Hebrew: Asaf ♂ / Hila ♀ / Avri ♂).

Full spec including the addendum: [docs/SPEC.md](docs/SPEC.md).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/QA.md](docs/QA.md) and [docs/STATUS.md](docs/STATUS.md).

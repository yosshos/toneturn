# QA checklist & acceptance matrix

Record each run with the **Voice check → Copy JSON report** output attached. Permission (capture) and recognition outcomes are recorded **separately**.

## Manual script — desktop, standalone tab

1. `npm run dev`, open `http://localhost:5173` in a normal Chrome/Edge window (not an embedded preview).
2. Voice check: Play chord (sound clean, no clipping), test Hebrew + English narration, Test microphone (peak > 0.02 when speaking), Test recognition he-IL and en-US (say “חמש” / “five”). Copy report.
3. Home → Practice → consent → allow mic. **Do not touch the screen.** Intro plays; answer 3 rounds by voice. Pass = recap shown with no taps after Start + permission.
4. Repeat with: one silent round (expect re-ask, no attempt consumed); say “repeat”, “skip”, “stop”.
5. Mid-question switch: Voice → Buttons while *prompting*, while *listening*, while *feedback*; Buttons → Voice (prompt replays). Score and attempts must be preserved; no double scoring.
6. Denial: block mic in site settings → Practice → expect *capture / permission-denied* panel. Re-allow → Retry continues the same question. Also try Switch to buttons.
7. OS block (Windows: Privacy → Microphone off) → expect *os-blocked* (Chrome reports “Permission denied by system”).
8. Embedded surface: open the app inside an iframe without `allow="microphone"` → expect *iframe-policy*.

## Acceptance matrix

| Surface | Origin | Embedded | Capture | Recognition | 3 hands-free rounds | Denial + recovery | Mode switch | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude app browser pane (Chrome 152, Win 11) | http://localhost:5173 | no (pane) | **denied** by pane policy — classified `capture/permission-denied` ✓ | not reachable (capture blocked) | sim only ✓ | panel ✓, Switch to buttons ✓ | Voice→Buttons ✓ preserved attempts | Measured 2026-11-04. Not a release surface. |
| Desktop Chrome, standalone tab | localhost / HTTPS | | ☐ | ☐ | ☐ | ☐ | ☐ | **pending — needs a person with a mic** |
| Desktop Edge, standalone tab | | | ☐ | ☐ | ☐ | ☐ | ☐ | pending |
| Android Chrome, tab (`dev:https`) | https://LAN | | ☐ | ☐ | ☐ | ☐ | ☐ | pending; record foreground / lock / Bluetooth separately |
| Android installed PWA | | | ☐ | ☐ | ☐ | ☐ | ☐ | pending; needs PNG icons for full installability |
| Headless Chrome (Playwright, desktop + Pixel 7 viewport) | http://localhost:5174 | no | fake device ✓ signal + pitch; denied → `permission-denied` ✓ | not tested (no real speech) | simulator ✓ | ✓ | ✓ | `npm run test:e2e`, 11/11 on 2026-11-04 |
| Firefox desktop | | | ☐ | expected *unsupported* → Buttons | n/a | ☐ | ☐ | pending |

## Voice & language checks (manual)

- Settings → Narration voice: try Female and Male; ▶ preview each listed voice in English and Hebrew; confirm the choice is used in the lesson and survives reload.
- Hebrew narration never says “פלאט/שארפ”; with Auto naming Hebrew says “סי במול”, English says “B flat”.
- Record which voices the device offers per language (Voice check → TTS voices).

## Device-specific (pending)

- Foreground vs screen-lock behaviour, Bluetooth headset playback vs mic route, phone-call interruption, airplane mode (app shell loads; recognition expected to fail with `network` unless on-device).
- Recognition benchmark (≥60 answers, he/en/mixed, quiet vs parked car): exact-match, false-accept, retry rate, P50/P95 latency. Not started.

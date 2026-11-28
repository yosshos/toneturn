# SPEC-INPUT-SOURCE: which input a take listens to, and how the player knows (v1, 2026-11-28)

## 0. Why
On 2026-11-28 the owner's D-major calibration session was graded by microphone: the USB cable was out, the app fell back to the mic without a word, and each take heard about 8 of 29 notes per hand. Meanwhile Settings said "MIDI on", because that label shows the setting, not the connection.

0.145.13 shipped two stopgaps:
- the take stops when a keyboard used before on this device is not detected;
- a take with no input at all is a technical failure.

This spec is the full fix.

## 1. Today (code facts)
- `settings.midiInput` (boolean) gates `midi.enable()` at start-up (`App.tsx:474`). Hot-plugging works after that (`midi.ts` `onstatechange` → `bind()`).
- The source is decided per take as `midi.devices.length > 0` (DrillTake `useMidi`, the trace `src`), with the guitar/bass mic preference as the only override.
- Settings summary (`SettingsScreen.tsx:350`) prints "MIDI on/off" from the setting. Nothing anywhere shows the live connection outside the Settings MIDI panel.
- The input check strip (`InputCheck.tsx`) shows signal arriving for the chosen mode, but says nothing about the mode having changed.

## 2. Rules
**R1. MIDI first, automatically.** When Web MIDI is available and a keyboard is connected, every pitched take on keys listens to MIDI. The player never has to switch anything.
- On start-up the app calls `midi.enable()` whenever the browser already granted MIDI permission (`navigator.permissions.query({ name: 'midi' })` = granted), whatever `midiInput` says.
- The permission prompt itself appears only from a user action: the Settings toggle, or the "connect a keyboard" button in R4. It never appears unasked.
- `midiInput` becomes a three-way device preference: **auto** (default: MIDI when connected, otherwise mic), **MIDI only**, **mic only**. It is stored per device profile (device-settings rule), never synced.
- Exceptions stay as today: guitar and bass follow their own mic/MIDI choice; sung items use the mic; drums use the kit rules.

**R2. A live status, not a setting label.** Every place that names the input shows the connection state:
- **Connected:** "MIDI: <device name>".
- **No keyboard:** "Microphone (no keyboard connected)".
- **Unavailable:** "Microphone (this browser has no MIDI)".

It replaces the Settings summary text, and it appears as a small chip on the take screen above Play (the input check strip gains the source word). Chrome only (minimal-buttons rule): no colours beyond the existing tokens, no icons beyond the existing mic/keys glyphs.

**R3. Expected-MIDI guard (generalises the 0.145.13 stopgap).** A device profile that has had a MIDI keyboard on it expects MIDI.
- If no keyboard is detected when a keys take is about to start, the take does not start. A flowing run stops, and the line says so, with two small actions: **reconnect** (re-runs `midi.enable()`; reloading is never needed for a hot-plug) and **use the microphone this session**.
- The expectation lives in the device profile, keyed per MIDI input name. It replaces the global `tt.midiSeen` key.
- Choosing the mic lasts for the session only. A keyboard that reappears takes over at once (R1).

**R4. Mid-take loss.** A keyboard that disconnects during a take ends the take as a technical failure: not graded, not stored, not counted, no calibration upload. The R3 line then shows.
- Today's `onstatechange` already releases held notes; the take must also abort.

**R5. Source is part of the record.** `src` is already in the trace. The take metrics carry `src` too. The calibration analysis and the cold-take/pass logic (SPEC-HOLISTIC-2 §1.6) treat a mic take on a keys item that expects MIDI as not comparable:
- it never counts as a counting cold check;
- it never feeds the piano tendency thresholds.

**R6. Silence and near-silence.**
- No input at all: technical failure (shipped in 0.145.13).
- A mic take where the input check detected playing but fewer than 40 % of notes matched, while R3 would have expected MIDI, is also marked not comparable (R5). It is shown as a failed take with the line "listened by microphone".

## 3. Build (one step, ~1 day)
1. `deviceProfiles`: the `midiPref` auto/midi/mic and `midiExpected` per input name; migrate `midiInput` true → auto, false → mic only.
2. `App.tsx`: enable on granted permission; listen to `permissions` changes.
3. `inputSource()` helper (one place): returns `{ src, device, reason }` for an item. Every current `midi.devices.length` check in DrillTake, RubatoTake, Drills, Charts, Encore, Lesson and the trace goes through it.
4. UI: the status chip on the take screen, the Settings summary text, and the R3 line with reconnect.
5. Abort on mid-take disconnect (R4).
6. `src` on take metrics; the not-comparable flag (R5/R6) respected by the cold-take log and the calibration upload.
7. Tests: helper truth table, migration, the R3 guard, the mid-take abort, no prompt without a click (fake `navigator.permissions`).

## 4. Owner questions
None blocking. Default chosen: **auto** for everyone, with the guard (R3) protecting players who use a keyboard.

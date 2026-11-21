# Practice coach: continuous, climbing, hands-free (0.110)

Owner, 2026-11-21, after trying piano technique → scales:

- The level ran all 12 major keys in free time, RH then LH, with a click after every take, and then stopped: no XP shown, no hands together, contrary motion, thirds and so on.
- The independence drill had no way to hear the exercise before reading it.
- Hands stay on the instrument. The only presses are start / end (and pause). After each take Toni gives a short line and announces the next take ("now G major, hands together, ♩80"), then counts in.

## What it does

**Entry.** A family page has a **אימון רציף / Continuous practice** button, shown for every family with notes to play. The level list and "Run through all keys" stay as they were for manual practice.

**Start.** The family's first level that is not solid. Solid means every item of the level is clean at tempo in 2 keys. A player with no background starts at level 1. Above level 1, the session opens with a warm-up: one take of the level below, in a key the player already has clean.

**Per take**, the coach picks the next take by itself (`src/engine/drills/coach.ts`):

| After | Next |
|---|---|
| Clean, free time / quarters | The same item at its next tempo step (rubato first: [[rubato-then-tempo]]) |
| Clean at tempo | The level's next item in this key (RH → LH, 3rd → 6th → 10th), else the next key not yet clean |
| 2 keys clean at tempo | **Promote**: the next level (each hand → hands together → contrary → minors → …). It starts in the key just played, and the coach plays it once first (demo, cursor running, skippable). |
| Miss 1 | Again (the line names what was missed: one note, N notes, stops, unsteady time) |
| Miss 2 | 10 % slower |
| Miss 3 | Parked as a weak spot; on to the next key. A weak spot comes back every 5 takes until it is clean. |
| 12 minutes | Wrap-up: clean takes, steps climbed, where the next session starts, and the XP |

**Shorter rubato after the first key.** The first key of a level gets the full rubato: 2 clean free takes, 1 in quarters, then tempo. Later keys share the motion and the fingering pattern, so they get 1 clean free take and then tempo. Items whose free time can't be measured stay timed: chords by microphone, goals the microphone can't hear, and checkpoints.

**Screen.** Each take keeps its own score, count-in, cursor and live marks. A slim bar above the score shows the coach's line, the step (e.g. 3 of 33), pause and end. The take result shows on the score for about 2 s plus the spoken line. Then the next take counts in.

- The full review (error map, Loop, Slower) is the manual run's. The coach decides on its own instead.
- XP and ladders are saved exactly as in a manual run: `onTake`, `applyTake`, stage takes.

**Voice.** The line goes through the app narrator (`tts.speak`). English plays as a recording or Kokoro where fast, otherwise as text. Hebrew is text only, with a reading pause, because Hebrew is not spoken yet. That is an open question to the owner.

## Listen (all reading takes)

`src/ui/HearDrill.tsx`: a **להקשיב / Listen** button beside Play, in DrillTake and RubatoTake. It plays the written item at the take's tempo with the score cursor, and a second tap stops it. It is off in level tests and transcription, where reading or hearing is what's measured.

## Tests

- `tests/practiceCoach.test.ts`:
  - a new player's start;
  - the climb to a new step after 2 keys;
  - miss → again → slower → parked → reviewed;
  - the warm-up for a solid player;
  - the wrap-up.
- `e2e/coach.spec.ts`:
  - takes follow one another with no clicks, then End shows XP;
  - pause holds the session on the result;
  - Listen toggles.

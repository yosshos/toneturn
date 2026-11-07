# 0.39 — Technique, ranks & badges, a faster level test (owner requests, 2026-11-07)

Detailed specs: `SPEC-TECHNIQUE.md` (piano drills), `SPEC-GUITAR-TECHNIQUE.md` (guitar / bass drills),
`SPEC-STATS.md §9` (ranks, leaderboards, challenges, badges), `SPEC-PLACEMENT.md` (Find my level 3.0).
Guiding principle (owner): every activity feeds the path, the skill map, XP / leagues, the level test and the daily
workout ("everything connects").

## 1. Technique drills
Piano (MIDI, mic fallback) and guitar / bass (mic): families → levels → items through keys / positions, a tempo
ladder (3 clean → +step, 2 misses → −10 %, continuous modes), today's items, the drill creator, the technique section
of the level test, drill steps in path units, a Technique block in the workout, rated events + XP, a technique rank
and technique badges. After a take every note is marked on the staff / tab: green right, amber off time (~), red wrong
(✕) or missed (○).

## 2. Ranks, leaderboards, badges
A rank per area + technique (Bronze III … Diamond I, Master; evidence-gated; never below a division held 7 days),
per-area leaderboards among friends, a monthly area challenge, and a large catalogue of creatively named badges
(area × tier, skill × level, sub-skill mastered, technique family × level incl. guitar, specials, seasons) with drawn
medals and an unlock animation (after the session, never during a question; earlier badges are logged quietly once).

## 3. Phone fit
On a phone (375 × 667) every exercise shows its controls (Repeat / Skip / Refresh) without scrolling: the controls
row sticks to the bottom of the screen and short screens get a denser question layout. `html, body` use
`overflow-x: clip` (hidden made them scroll containers and broke `position: sticky`). The overflow e2e also fails when
an exercise's controls are below the fold.

## 4. Concept refresher
During any exercise (not the level test — it would measure the lesson) "💡 Refresh" opens the mini-lesson behind the
question (its topic's lesson; else by sub-skill / skill), pausing the exercise; closing it resumes the same question.
Every practice topic and hand-made lesson has one (test: `tests/refresher.test.ts`).

## 5. Input latency calibration
Settings (and Drills → Calibrate): play along with 16 clicks on the input you use — screen tap, MIDI key, or
microphone (clap / one note). The median offset after 4 warm-up clicks is saved per input (`tapLatencyMs`,
`midiLatencyMs`, `micLatencyMs`) when the take is steady (≥ 6 hits, spread ≤ 35 ms) and removed from every timing
judgement: rhythm items (taps; microphone knocks use the microphone delay), Rhythm Highway (tap / MIDI / mic), drills.

## 6. Find my level 3.0 and re-calibration
Accelerating search per skill (1 → 2 → 4 rungs while right, one bisection after the first miss), budgets per skill /
area / test, inferred skills when an area agrees, a range per skill with the rating at its lower-middle and fast
convergence afterwards. A full test drops from ~62–110 to 21–34 items. After every session: the current unit is
rebuilt (if under half done) when its skills drift ≥ 100 or prove harder than expected; "you seem above this — test
out?" and "quick re-test" are offered (7-day snooze); the workout suggestion follows the new path the same day.
The technique section uses the same rule: +15 % / +30 % / +60 % while clean, one bisect take, ≤ 4 takes per family.

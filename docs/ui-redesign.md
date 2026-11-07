# UI redesign 0.37 — "Night arcade"

Source: the design canvas (18 boards) approved on 2026-11-07. English is the default language; every
screen must read correctly in English (LTR) and Hebrew (RTL).

## Navigation

A bottom tab bar on the five top-level screens. Everything else (lessons, games in play, settings, intake,
vocal, perform …) keeps its own header with a back/close button and hides the tab bar.

| Tab | Route | What's there |
|---|---|---|
| Home | `#/` | header (level ring, streak, gift "what's new", update/install, menu) · resume/catch-up cards · **Today's mission** (next lesson + daily goal) · workout · domain tiles · practice tools · voice strip |
| Path | `#/path` | the lesson path as a winding road, grouped in units by topic, with topic bars on top |
| Progress | `#/skills` | the skill map (existing) + link to achievements |
| Play | `#/arcade` | games, duels, live online, ghost race, truth-or-bluff |
| Friends | `#/friends` | league + friends (existing) |

The path used to be a long list in the middle of Home; it is now its own tab. Home's mission card always
points at the next path lesson, so the path is one tap away from either place.

## Visual tokens

- Ground `#0F1020`, raised `#16182E`, card `#1B1D36`, card-2 `#23254A`, line `#2C2E52`
- Ink `#F4F1FF`, soft `#D8D5F0`, dim `#A9A6C9`
- Action mint `#5CF2B5` (shadow `#1F8F67`), reward gold `#FFC94D`, error coral `#FF6B5C`
- Domain hues: pitch `#7C8CFF`, time `#FF8A5C`, memory `#5CE1E6`, voice `#FF6FB1`, reading `#FFD15C`, creative `#B57CFF`
- Display font: Secular One (Latin + Hebrew), body: Rubik
- Chunky "3D" buttons: solid bottom shadow that collapses on press

The existing cosmetic themes (ocean, forest …) keep working: they override the same tokens.

## Player level

New: a level from total XP. Level n → n+1 costs `100 + 50·(n−1)` XP. Shown as a ring in the Home header and
as a bar on the recap with a level-up badge.

## Screens

- **What's new**: no card on Home. A small gift button in the header with a red dot while there are unseen
  versions; tapping opens a short popover (first 3 lines of the newest version + "all changes"). Opening it
  marks the version seen.
- **Lesson**: segmented progress (one segment per question, coloured by result), coloured chunky answer
  buttons, glowing orb, correct = burst + "+XP" floating up, wrong = shake.
- **Recap**: rotating rays + confetti for 3 stars, stars pop in, score counts up, level bar with level-up badge.
- **Path**: road with nodes (done = domain colour + stars, current = big mint pulsing with a "Start" bubble,
  open = outlined, locked = dim lock), unit banners per topic.
- **Play**: big gradient cards per game with personal best.

## RTL / LTR rules

- Use logical CSS (`inset-inline-start`, `margin-inline-*`, `padding-inline-*`, `text-align: start`).
- Directional glyphs (→, ‹, chevrons) flip with `.flip-rtl`.
- Numbers, times, XP and note names are `dir="ltr"` islands.
- The path road mirrors in RTL (it is drawn from the reading direction).
- The overflow test runs every screen at 320 px in both languages.

## Small touches

- Tab bar: active tab lifts with a mint pill.
- Haptics (where supported): a short tick on a correct answer, a double buzz on a wrong one (respects reduced motion).
- Buttons press down; cards lift on hover (pointer devices only).
- Greeting by time of day on Home.

## Also in 0.37

- **Note views**: keyboard, staff and guitar tab — any two (Settings → Show notes as; a third replaces the
  oldest). Players who told the intake they play guitar (and not keys) start with tab + staff.
- **Metronome under every rhythm exercise** (playtesting): rhythm dictation, rhythm memory, the even
  Middle-Eastern cycles, and under the player's echo in Beat Echo / Drum Echo (softer, so a knock microphone
  is not fooled). Deliberately without one: internal pulse / internal clock (the clicks stop on purpose),
  steady-or-wobbly beat and tempo (the clicks are the question), meter / downbeat / odd meters and polyrhythm
  (a metronome would give the answer away or contradict the grouping).

# Today tab (0.41) — the home screen becomes "Today"

Owner, 2026-11-07, after a play test: the home screen is cluttered, needs constant scrolling, shows Find my level
twice, lists topics that are below the player's level (they belong in the path, as ✓), a list of exercises of unclear
origin, and a Sign out button. "The purpose of this screen is to bring the player to their daily workout and let them
edit it — at most a small Find my level button. It shouldn't be a home page." Most of what is there is left over from
old versions.

## 1. The tab

- Tab `home` is renamed **Today / היום**. Icon: a calendar day page showing today's date (like a phone's calendar
  icon) — the screen is "your day's practice".
- The screen fits one phone screen when nothing is pending (guiding principle: one screen).

## 2. What Today shows (in order)

1. Top bar: logo, streak, what's new, month review, install/update, menu (unchanged).
2. Things to resume, only when they exist (never lose progress): a saved Find my level, the last unfinished
   session, the streak-freeze notice, the catch-up card for new features.
3. Teacher assignments, only when there are some (they are today's homework).
4. **Today's workout** (the card from 0.38): blocks, Start, ✎ Edit, reset, the context chips, the daily goal.
5. A small **🧭 Find my level** button → a sheet: *Everything* (≈20–30 min) or *one area* (the 7 areas). A saved test
   shows *Continue* first.

First run (nothing done yet) keeps the welcome hero with the big Find my level / start-from-basics buttons.

## 3. Where everything else went

| Was on Home | Now |
|---|---|
| Player strip (XP level) | Progress tab (level is there) |
| Voice / Buttons switch | Settings → Microphone & timing; and the switch inside every exercise |
| Find my level link + card + "measure one area" chips | the one Find my level button → sheet (§2.5) |
| Practise by area tiles (rank + bar) | Progress tab, top of the Map tab ("Your areas"), with a Technique tile; replaces the rank strip |
| Free practice / topic list (109 topics × levels) | Path tab → **All topics**: grouped, each level chip shows ✓ when the path already counts it (done / passed / tested out), ▶ for the current one |
| Skill map card | Progress tab (already there) |
| Review mistakes | Path tab → Practice rooms (and the workout's warm-up block) |
| Weekly puzzle, Daily challenge | Play tab (already there) |
| Runs workshop, Drone, Play & improvise, Vocal levels + warm-up, Topics I learned, Technique drills | Path tab → **Practice rooms** |
| Avatar studio | Menu (already there) |
| Account card / Sign out | Settings → Account (already there) |
| Diagnostics link | Settings and Menu (already there) |
| Mission card, 2-minute warm-up card | removed (dead since the workout card, 0.38) |

## 4. Path tab additions

Below the road: two collapsible sections, closed by default (so the path stays the focus):
- **All topics** — the topic browser (moved from Home). Level chips: ✓ (path counts it), ▶ (the current step),
  plain (open). Tapping any chip still practises that level.
- **Practice rooms** — Technique drills, Singing levels (+ warm-up), Runs workshop, Drone, Play & improvise, Review
  mistakes (with the due count), Topics I learned.

## 5. Checks

- e2e: Today shows the workout and one Find my level button; no Sign out, no topic list, no tools grid.
- e2e: Find my level sheet → Everything / one area.
- e2e: topics and rooms are reachable from the Path tab; existing tests that opened topics from Home open them from
  the Path tab.

## 6. The workout card, calmer (owner: "too much text and colour")

- One title line: *Today's workout · 10 min* and ✎ (edit).
- The next path step as the heading.
- The blocks as a numbered list in one neutral colour; only the block you are on is highlighted (mint), finished
  blocks get ✓ and fade. The multicoloured block bar and the unit-coverage line are gone.
- Start (a normal primary button, not a mega one) with a small ring for the daily XP goal beside it.
- The context switches (no mic / quiet place / no instrument) moved into the workout editor.

## 7. Two principles (owner, same day)

- **Minimal app buttons.** Big chunky buttons belong inside exercises, where the press is part of the game. App
  screens use small, clean buttons and icon buttons. A row to resume something = its short name, a thin progress
  bar, and two small icon buttons (↺ start over / ✕ let it go, ▶ continue).
- **Less text.** Where no explanation is needed (unlike lessons and exercises), no long sentences: a name and a
  count or a bar. The resume rows, the catch-up card and the freeze notice were shortened accordingly.

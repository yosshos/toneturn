# Stats, trends, achievements and compare (spec addendum AG, part of 0.38)

Product owner, 2026-11-07: *"In Trends I should be able to choose the time frame. For personal achievements,
stats and compare — take from chess.com everything relevant to us and build it in the app's theme."*

## 1. What chess.com has, and what it becomes here

| chess.com | Here |
|---|---|
| **Stats page** per time control: current rating, highest (with date), lowest, games, W / L / D, rating graph with ranges (30 days, 90 days, 1 year, all) | **My stats** per skill, per area and overall: current level, **best ever (date)**, items answered, accuracy %, median speed vs reference, the graph — with a **time frame** chip row |
| **Rating percentile** ("better than 87 % of players") | percentile among the players we can see: your league group this week, your friends; a global percentile only if the server provides it (else hidden) |
| **Insights**: accuracy by game phase, by time of day, by day of week, by opening, time-management | **Insights**: accuracy and speed by area / sub-skill, by time of day, by day of week, by input (voice / buttons / singing / playing / tapping), your strongest and weakest sub-skills, your tricky pairs (from the coach), "sessions that went best" |
| **Game archive** with filters | **Session history**: every session (lesson, path step, game, placement) with date, area, score, XP, time; filters (time frame, area, kind); tap → its recap (answers, compare, replay) while the details are kept |
| **Compare** with a friend (side by side, head-to-head record) | **Compare**: me vs a friend (radar overlay, per-area levels, streak, XP in the frame, duel record head-to-head) and **me vs past me** (two time frames side by side) |
| **Achievements / awards**: badges in categories, tiers, progress bars, rarity %, earned date, a showcase | **Achievements**: categories, **tiers** (bronze / silver / gold / diamond), progress to the next tier, earned date, **rarity** (% of players, when the server knows; else hidden), a **trophy case** of up to 3 pinned on the profile |
| **Streak**, best streak; **Puzzle Rush** best scores; daily puzzle record | streak + best streak; best per game (Echo Chain, Beat Echo, True or Bluff, Flight, Highway, Name That Tune, Tune-up, Melody Puzzle); daily challenge and weekly puzzle records |
| **Profile**: member since, games, time played, favourite opening, country | **Profile card**: playing since, total practice time, items answered, favourite area, level, league, trophy case |
| **Leaderboards** (friends / global) | friends leaderboard by overall level, area level, or XP in the chosen frame; the weekly league (existing) |
| **Year in review** | **Month in review** card at month end (best gains, most practised, achievements) |

## 2. Time frames (everywhere)

Chips: **7 days · 30 days · 90 days · 1 year · All** (default 30 days), remembered per device (a viewer
convenience). Every number on a stats screen follows the frame:

- graph range; **change in the frame** (▲/▼ from the level at the frame's start, or "new" if unmeasured then);
- items, accuracy, median speed, practice time, XP in the frame;
- best in the frame and best ever (both shown, best ever with its date).

The graphs follow the app's data-viz rules (one axis; level bands; hover / touch tooltip; a table view; ▲/▼ never
colour alone; dark and light both checked).

## 3. Screens

- **Progress tab** (`#/skills`) gains a segmented header: **Map · Stats · Insights · History · Awards**.
  - *Map*: the existing Skill Map (radar, areas, sub-skills) with the frame chips driving the trend tiles and
    detail chart (the request: Trends get a time frame).
  - *Stats*: overall card (level, best ever, percentile, change in frame) → per-area cards → per-skill rows (level,
    best, items, accuracy, speed, sparkline in the frame). Tap a row → the skill's detail chart.
  - *Insights*: the cards of §1, each with one sentence of plain-language reading ("You're 12 % more accurate in the
    morning").
  - *History*: the session list with filters.
  - *Awards*: achievements by category, tiers, progress, rarity, trophy case pinning.
- **Friends tab**: friend row → **Compare** sheet; friends leaderboard with the frame chips.
- **Profile card** (header name / level ring tap): the profile summary + trophy case.

## 4. Data

- Rating events stay capped (3000), so long frames need aggregates: `progress.statsDays: Record<day,
  { items, correct, ms, xp, sessions, byArea: Record<DomainId, [items, correct]>, bySkillR: Partial<Record<SkillId,
  number>> /* level at the end of the day */, byHour: number[24] /* items */, byHourOk: number[24] }>` updated on
  every saved result; old days are kept (small). Best ever per skill: `progress.peaks: Record<SkillId, { r, at }>`.
- Session history: `progress.history` (100) stays for recaps; `statsDays` keeps the counts beyond it; the History
  list shows what's kept, older sessions as day summaries.
- Friends compare uses the friend's public profile summary (existing friends data: levels per area, streak, XP)
  plus our duel records.
- Achievement tiers: thresholds per achievement (§5); earned dates in `progress.awards: Record<id, { tier, at }>`.
- Rarity / global percentile: read from a server aggregate when present (`profiles` table counts); absent → hidden.

## 5. Achievements (tiers)

Every existing achievement gets tiers where it makes sense, plus new ones for 0.38:

| Category | Achievements (bronze / silver / gold / diamond) |
|---|---|
| Practice | lessons finished 10 / 50 / 200 / 1000 · days practised 7 / 30 / 100 / 365 · best streak 7 / 30 / 100 / 365 |
| Path | units finished 1 / 10 / 30 / 60 · steps ✓ by test 10 / 50 / 150 / 300 · checkpoints at 3 stars 1 / 10 / 30 / 60 |
| Levels | any area at Developing / Solid / Advanced / 1600 · every area measured · overall level 900 / 1150 / 1400 / 1600 |
| Ear | perfect lessons 1 / 10 / 50 / 200 · fine pitch at 10 ¢ · modes by ear 1400 |
| Voice | the vocal ladder, octave leap, steady tone, even vibrato, range map (existing, tiered where countable) |
| Instrument & sound | first tune-up · tune-up mean < 5 ¢ · fretboard all notes · EQ at third-octave · 100 gates in Flight |
| Games | Echo / Beat chains 10 / 15 / 20 / 25 · Highway full combo · Name That Tune 900 · True or Bluff 40 |
| Social | league reached (existing) · duels won 1 / 10 / 50 / 200 · friends 1 / 5 / 10 / 25 |
| Memory | Pitch Memory 7 / 30 / 100 days · within 10 ¢ from memory |

Earning a tier: a short toast (gold ring burst), never during a question; the cleanView setting keeps it quiet.

## 6. Theme

Night-arcade tokens, domain hues, chunky chips for the frames, gold for awards, tier colours bronze #CD7F32,
silver #C0C6D6, gold #FFC94D, diamond #7DE3FF. RTL: charts read left→right in time in both languages (a time axis
is not mirrored); everything else mirrors; numbers in LTR islands.

## 7. Tests

Frame maths (change from frame start, empty frames), aggregates update and survive the event cap, peaks, tiers
(threshold crossing, earned date), insights (time of day buckets, strongest / weakest), compare (radar overlay with
unmeasured areas), percentile among a group; E2E: frame chips change the graph and numbers, Awards tab, Compare
sheet, 320 px in both languages.

---

## 8. Review pass (binding)

| # | Rule |
|---|---|
| S1 | **Rating base**: before rating events are trimmed (cap 3000), the dropped prefix is folded into `progress.ratingBase` and every fold starts from it — levels, peaks and stats never drift. |
| S2 | **Counters, not capped lists**: achievements and lifetime numbers come from monotonic counters (`statsDays` sums, `progress.counts`: lessons, perfect lessons, duels won, units, gates …); `awards` merge as max(tier) / earliest date. |
| S3 | **Sync**: `statsDays`, `peaks`, `counts`, `awards`, `ratingBase` are synced fields merged with max() / union (never replaced by a rebuild). |
| S4 | **Compare v1** uses what friends already share (overall level, XP, streak, lessons, game bests, duel record); per-area overlay only when the friend's profile carries area levels (new field written by their own app from 0.38 on; older friends show "—"). Fallback without friends: **players at your level** (existing level stats). |
| S5 | **Record from now**: each answered item records its input (`voice` / `buttons` / `sing` / `play` / `tap`), each result its `durationMs`; older data shows "—" in those insights. |
| S6 | **Speed**: per-day speed in 8 log bins (median from bins). |
| S7 | **First launch of 0.38**: earned tiers are awarded silently with "before 0.38" dates, one summary toast. |
| S8 | **Minimum data**: an insight needs ≥ 30 items per bucket and a ≥ 10-point difference; percentile needs a group ≥ 5; change in frame under 15 points shows "steady"; otherwise "not enough data yet". |
| S9 | **Privacy**: Settings → *Share my stats with friends*: levels only (default) / levels and activity / nothing. Compare and leaderboards respect it. |
| S10 | **Kindness**: friends leaderboard defaults to XP in the frame (effort, not level); a level below best ever is phrased "best ever 1240 (Mar 3)" without a red delta. |
| S11 | **Performance**: the fold is memoised per events length; `statsDays.byHour` is one 7×24 total (not per day); `bySkillR` only for skills that changed that day. |
| S12 | **Frames**: local days, inclusive of today (7 days = today + 6); start value = last known value at or before the start. |
| S13 | **Percentile** = share of the group with a lower overall level (ties count half). |
| S14 | **Award rules** each have a source field + threshold (table in `achievements.ts`); level awards use bands Developing (900) / Solid (1150) / Advanced (1400) / Master (1600). |
| S15 | **Strongest / weakest** sub-skills need n ≥ 20; "best sessions" = accuracy × speed over sessions with ≥ 5 items. |
| S16 | **Month in review**: at the first open after the local month end, with ≥ 3 practice days; opens from a small icon (like what's new), dismissible. |
| S17 | **History**: sessions beyond the kept 100 appear as non-tappable day rows (items, accuracy, XP). |
| S18 | **Tier colours** have darker light-mode variants and a tier label / shape (never colour alone). |
| S19 | **Activity calendar** (year heatmap) on Stats. |
| S20 | **Personal records** card: fastest perfect lesson, longest run of right answers, best accuracy day, longest streak — with dates. |
| S21 | **Closest to unlock**: the top 3 awards by progress at the top of Awards. |
| S22 | **Share card**: an award / month in review as an image (canvas → Web Share, download fallback). |
| S23 | **Rarity and global percentile** need a server aggregate: not in 0.38 (hidden); friend quests: later. |

---

## 9. Ranks per area, leaderboards, seasonal challenges, badges (owner, 2026-11-07)

- **One weekly XP league** stays (effort from everything: lessons, games, drills).
- **A rank per area** by level (Bronze → Diamond, III → II → I, then Master), plus a **technique rank**: reached only
  with enough evidence, no demotion below a division held 7 days. Shown on the Skill Map areas and the profile.
- **Leaderboards per area** among friends / players at your level (privacy as S9) — not leagues.
- **Monthly area challenge** rotating the areas (3 tiers, a badge).
- **Many more badges with creative names**: every area × tier, every skill × level, every sub-skill "mastered",
  every technique family × level, and specials. Engine `engine/ranks.ts`, `engine/badges.ts`; UI `ui/Badges.tsx`.
- Built: `engine/ranks.ts` (division = 600 + 60·d on the area level, Master ≥ 1550, evidence 20 / 50 / 100 / 200 / 300
  answers, 7-day floor), `engine/badges.ts` (375 badges: area 48, skill 108, sub-skill 108, technique 88, special 16,
  season 7), `engine/rankBadges.ts` (refresh after each save; toast on a rank up or a new badge, after the session),
  `ui/Badges.tsx` (Badges tab in Progress, AreaRanks above the Skill Map). Synced: `progress.ranks`, `progress.badges`.
- To do: per-area leaderboards in Friends (needs friends' shared ranks), guitar-family badges.

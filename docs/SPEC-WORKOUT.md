# Today's workout — suggested, then yours (spec addendum AH, part of 0.38)

Product owner, 2026-11-07: *"The daily workout should be more dynamic. Suggest a default structure from the
player's first preferences, but let them edit today's total time and how much of it goes to each topic. Also
one-off changes: train a topic less or not at all, change the order and the length of each, remove and add
topics. I think this will be very, very useful."*

## 1. What others do (and what we take)

| App | Idea | We take |
|---|---|---|
| **Fitbod / Freeletics** | a generated workout; change the duration ("I have less time"), swap an exercise, remove / add, reorder; "save as template" | duration chips, swap, remove / add, reorder, save as default |
| **Peloton stacks / Apple Fitness+** | a playlist of timed blocks that run one after another | timed blocks that run back to back |
| **Yousician daily workout, Melodics practice** | a short daily plan per instrument; per-skill time | blocks per area / skill / topic |
| **Headspace, Calm** | pick today's length; the content fits it | the plan rescales to the total |
| **Elevate, Peak** | a daily set; swap one game | swap a block's content |
| **Duolingo practice hub** | weak skills, mistakes, the path in one place | blocks: path, review, weak spots |

## 2. Words

- **Workout** — today's list of **blocks**, run in order.
- **Block** — a target + minutes. Targets:
  | Target | What runs | Example |
  |---|---|---|
  | **Path** | the next path steps (spec AF) | "Path · 5 min" |
  | **Warm-up** | due reviews, then the weakest sub-skill | "Warm-up · 2 min" |
  | **Area** | the scheduler's best sub-skills in that area | "Rhythm & time · 4 min" |
  | **Skill** | the best sub-skills of that skill | "Intervals · 3 min" |
  | **Topic** | one topic at the player's level | "Notes on the neck · 3 min" |
  | **Game** | one game, timed rounds | "Rhythm Highway · 3 min" |
  | **Vocal warm-up** | the vocal studio warm-up (singers) | "Vocal warm-up · 3 min" |
- **Template** — the structure without content (targets + minutes). Today's workout = template filled with fresh
  content for today.

## 3. The suggested workout (default)

Built from: minutes a day (questionnaire), goal and area ranking (spec AF D2), left-out areas, singing / mic
modes, reviews due, ratings.

- Total = the player's minutes a day (5 / 10 / 20; editable to 5–60).
- Order: Warm-up (if reviews are due or the total ≥ 10) → Path → areas by weight → a Game at the end
  (total ≥ 15) → Vocal warm-up first for singers with total ≥ 10.
- Minutes: Warm-up 2, Game 3, Vocal warm-up 3; Path gets 40 %; the rest split among the top areas by goal × rank
  weight (each area block ≥ 2 min; at most 4 area blocks; the remainder to the top area).
- Content of an area / skill block = the scheduler's sub-skill priorities inside it (importance × gap ×
  freshness, spec AD §5), at the player's level.
- If a template exists, the suggestion uses it (fresh content, same structure).

## 4. Editing (the heart of this spec)

From the workout card on Home → **Edit** (or long-press a block).

| Action | How | Notes |
|---|---|---|
| **Total time** | chips 5 · 10 · 15 · 20 · 30 · 45 · 60 and a − / + stepper (step 5) | rescales every **unlocked** block proportionally (rounded to whole minutes, ≥ 1 each); locked blocks keep their minutes |
| **A block's minutes** | − / + (step 1, 1–30), or drag the bar | the total follows (shown live); "Keep total" toggle: on → the other unlocked blocks absorb the change |
| **Lock** | 🔒 on a block | its minutes don't change when the total changes |
| **Reorder** | drag handle; ↑ / ↓ buttons (keyboard / screen reader) | any order; the Path block may be anywhere |
| **Remove** | ✕ (with *Undo* for 5 s) | the last block can't be removed |
| **Add** | **＋ Add** → a sheet: Path · Warm-up · Areas · Skills · Topics (search) · Games · Vocal warm-up; minutes default 3 | areas left out of the path can still be added here (one-off) |
| **Swap** | ⇄ on a block: another topic in the same area / skill | content only |
| **Less of / none of today** | on an area block: "Less today" (−50 %), "Skip today" (remove) | quick versions of the above |
| **Presets** | chips: *Suggested* · *Ear focus* · *Rhythm focus* · *Reading focus* · *Voice focus* · *Instrument focus* · *Quick 5* | a preset replaces the blocks, keeps the total |
| **Reset** | *Back to suggested* | |

**Scope** (asked when leaving the editor, once per edit): **Today only** (default) · **Make this my default**
(saves the template; tomorrow's suggestion uses it). A small "Edited for today" chip on the card, tap to reset.

Limits: 1–12 blocks, total 5–90 min, each block 1–30 min.

## 5. Running the workout

- **Start** runs the blocks in order. A thin progress bar shows the blocks and time left of the current one.
- **Time-boxed blocks:** a block keeps serving items (6-item mini-sessions, adaptive) until its minutes of *active*
  time are used (pauses and the mic permission panel don't count); the item in progress is always finished.
  At the end: a one-line block summary (items, accuracy, XP) and the next block starts after a 3-second countdown
  (*Next now* / *+2 min* / *End workout*).
- **Path block:** plays the current path steps; finishing steps counts on the path as usual.
- **Skip block** / **End workout** at any time; the summary shows what was done.
- **Never lose progress:** the workout state (block, time used, items) is saved after every item; Back / reload /
  next day before midnight continue it ("Continue today's workout · 6 min left").
- **Workout done:** a summary card (time, items, accuracy per block, XP), counted in stats (spec AG) and in the
  daily goal; an achievement tier *Workouts completed*.

## 6. Home (product owner: the workout is the first thing on Home)

**Today's workout is the first card on Home**, right under the header — that is where a session starts:
- the blocks as a stacked bar (area colours, minutes), the total and *≈ n of m steps of Unit k*;
- one big **Start** / **Continue · 6 min left** button (it replaces the separate mission card: the *next step*
  is shown inside the workout card as its first line);
- *Edit* (pencil) and the *Edited for today* chip.
Below it, everything else stays available as choices: the daily goal ring, practice by area tiles, the path
link, games, tools. The old mission card is removed (§9.5 is satisfied by the workout card).

## 7. Data

- `settings.workoutTemplate?: Block[]` (targets + minutes; synced).
- `settings.workoutToday?: { day, blocks: Block[], edited: boolean }` (today's own edits; synced, ignored on
  another day).
- Run state in the resume slots (`workout:<day>`), local.
- Block = `{ id, target: { kind: 'path' | 'warmup' | 'area' | 'skill' | 'topic' | 'game' | 'vocal', ref? },
  minutes, locked? }`.

## 8. Tests

Suggestion by goal / rank / total; rescale keeps locked blocks and sums to the total; minute bounds; reorder /
remove / add / swap; presets; scope (today vs default) and the day rollover; time-boxing (block ends after its
active minutes, the current item finishes); resume after reload. E2E: edit total and a block, reorder, remove +
undo, add a topic, run two blocks, reload and continue; 320 px in both languages.

---

## 9. The workout and the path are one system (product owner: "they must be connected")

**Principle:** the path is *what* to learn (the curriculum); the workout is *how much of it today, in which
order* (the schedule). Time spent in the workout moves the path forward, and the path tells the workout what to
serve.

### 9.1 Blocks draw from the path first

| Block | Serves, in this order |
|---|---|
| **Area** (e.g. Rhythm & time) | 1. the open steps of that area in the **current unit** (any order inside the unit) · 2. that area's steps of the **next unit** ("working ahead") · 3. when the area has no path steps left (or it is left out of the path): the scheduler's weakest sub-skills of the area (free practice) |
| **Skill** | the same, restricted to that skill |
| **Topic** | path steps of that topic first (at their levels), else the topic at the player's level |
| **Path** | the current unit's steps in path order, then the checkpoint |
| **Warm-up** | due reviews (path review steps count as done when their items are cleared) |
| **Game, Vocal warm-up** | not path content; they count for stats and the daily goal |

A path step served inside a block is the same step as on the road: finishing it (≥ 4/6, P10) records it done on
the path, with its stars. A step started in a block and cut by the block's time is resumed by the next block that
serves it (or from the road) — never lost.

### 9.2 The suggestion is built to finish about one unit a day

- The default workout splits the minutes by the **remaining steps of the current unit** per area (each step ≈
  1.5 min, a checkpoint ≈ 2 min), weighted by goal × rank only for the remainder. With 10 minutes and a unit of 8
  steps, a full workout ≈ finishes the unit; with 5 minutes ≈ half.
- When the current unit has only the checkpoint left, the workout opens with it.

### 9.3 Editing shows the effect on the path, live

The editor shows under the blocks:
- **"This workout: ≈ 5 of 7 steps of Unit 4"**, with a small unit bar coloured by area (done / today / left);
- per area block: **"3 path steps"** or **"free practice — no path steps in this area now"**;
- when a block is cut or removed so that the unit can't finish today: "Unit 4 will wait for 2 rhythm steps".

### 9.4 Long-term effects of the player's choices

- Allocation changes the **pace per area**, never the curriculum: units still mix the chosen areas, so a unit
  completes only when its steps in every area are done (or ✓). An area trained more gets its steps done (and its
  frontier rises: next units bring harder steps in that area); an area trained less waits.
- If an area was **skipped or cut to < 1 min on 3 of the last 5 days** while it still has steps in the current
  unit, the card asks once (dismissible for 2 weeks): *"Rhythm keeps waiting. Leave it out of your path, give it
  less room in each unit, or keep it?"* → *Leave out* (spec AF D4) · *Less room* (its weight halves) · *Keep*.
- *"Make this my default"* with lasting time per area **also updates the path weights** (the template's area
  minutes become the area shares of future units), so path and workout stay aligned.
- The path screen marks steps done in a workout with a tiny "⏱ in workout" note in their history, and the current
  unit banner shows per-area progress dots (done / left).

### 9.5 The mission card

The mission card shows the **next block's next step** while a workout is in progress today, otherwise the next
path step. Starting it starts (or continues) the workout at that block; finishing a step from the road also counts
for the matching workout block's time.

---

## 10. Review pass (binding — overrides the sections above where they differ)

| # | Rule |
|---|---|
| W1 | **One model on Home:** the workout card *is* the mission card (D7 amended): it shows the next step as its first line; the warm-up is the workout's first block. Free practice stays below. |
| W2 | **Path minutes are credited from any path play today:** a step finished from the road counts for the Path / matching Area block; a block is done when its minutes are used. Path work is in whole steps: the step in progress always finishes; another step starts only if ≥ 2 min are left in the block. |
| W3 | **Active time:** from the item's prompt to the answer, playback and the sing window included; the feedback counts up to 3 s; the clock stops after 15 s with no input ("paused"). |
| W4 | **Order and small totals:** vocal warm-up → warm-up → path → areas → game. Exact suggestions: **5** = path 3 + top area 2 · **10** = warm-up 2 + path 4 + 2 areas 2+2 · **15** = warm-up 2 + path 5 + areas 3+2 + game 3 · **20** = warm-up 2 + path 6 + areas 4+3+2 + game 3 · **30+** = proportional. Total 5–60. |
| W5 | **Blocks ≥ 2 min** (a 6-item set fits); a rescale that would push one under 2 offers to drop it. Locked blocks summing over a new total → the change is refused with "unlock a block". Largest-remainder rounding. |
| W6 | **Template validation:** on load, a block whose target is gone (area left out, topic hidden / locked, game removed) is replaced by the nearest area or dropped; a default older than 30 days shows "refresh my default?". |
| W7 | **Games:** solo games only, the round in progress finishes; never multiplayer inside a workout. |
| W8 | **Editing during a run:** only blocks not run yet; finished blocks are locked; last edit wins across devices. |
| W9 | **Day:** a workout belongs to the day it was started; it can be continued until 04:00, then it is archived as partial. |
| W10 | **Context chips before Start:** *No mic* · *Quiet place* (no singing, no sound-heavy blocks) · *No instrument* — swap the affected blocks for buttons-only content in the same area for today. |
| W11 | **After the workout:** one tap — *too easy · right · too hard · too long*; nudges tomorrow's suggested total (±5) and the step window (±50 rating) for 3 days. |
| W12 | **"My instrument" block** (off-app practice): a timer, the metronome and a note field; counts in stats as practice minutes. |
| W13 | **Default for:** *every day* or *this weekday* (per-weekday templates; a weekday without one uses the every-day default). |
| W14 | **Preset "Fix my mistakes"** (reviews + the weakest sub-skills only). |
| W15 | **Credit:** the daily goal counts minutes done; the streak needs ≥ 1 finished block or 5 minutes. |
| W16 | **No duplicates:** sub-skills already served by an earlier block today are skipped by later Area / Topic blocks (the path step is served once). |
| W17 | **A calm editor:** the visible controls are the total (sticky header: chips + −/+; the only rescale), per block −/+ , ✕ and the drag handle; *lock* and *swap* live in a ⋯ menu; "Less today" is dropped (−/+ covers it). Changing one block changes the total (no "keep total" mode). |
| W18 | **No scope question:** edits are saved silently for today ("Edited" chip); an inline *Save as my default* button (with the weekday choice). |
| W19 | **Undo** after Remove, presets and Reset (5 s snackbar). |
| W20 | **Auto-advance** shows the remaining total and pauses when the screen is touched. |
| W21 | **Add sheet:** "Suggested for you" (top 6 by the scheduler) first, then search across areas, skills, topics, games. |

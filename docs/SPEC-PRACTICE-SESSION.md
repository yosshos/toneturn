# The daily practice session: time first, a smart split, a reward that builds the habit (draft for the owner, 2026-11-24)

**Owner (2026-11-24):**
- The daily practice is the centre of the app. A player picks, in a very simple way, how long they have today for their instrument or for an area. 30 minutes is the default; 20, 40 or an hour also work.
- The smart coach splits the time in the best way: how much of it each area needs today.
- Every finished session gives a good-looking reward:
  - a milestone;
  - the minutes this week, this month and this year;
  - the streak;
  - a graph of improvement in one thing;
  - "your average session went up this week".
- Beyond improving, the feedback should encourage people to practise longer.

This builds on what exists:
- the workout: blocks, editor, run screen (docs/SPEC-WORKOUT.md);
- the key × exercise matrix and the day's shares (docs/SPEC-DAILY-WORKOUT.md);
- the practice-time ledger (src/engine/practiceTime.ts);
- the daily snapshots and the Over-time charts (docs/SPEC-PROGRESS-CHARTS.md);
- the streak engine (src/engine/streak.ts).

Nothing here replaces the editor. It stays for whoever wants it, one tap away.

## 0. What exists and what is missing (audit 2026-11-24)

| Exists | Missing |
|---|---|
| The workout card on Today, the editor (chips 5–180), the run screen, between-block cards | No time choice before Start: time can only be changed inside the editor |
| Shares per course (instrument: path ~20%, then technique 70–85% / improv 15–30%; ear: new / strengthen / review) | The default comes from the intake's 5 / 10 / 20 (default 10). There is no minutes setting at all |
| AI tilt ±10% (Insights screen only) | No instrument or area choice: the session always follows the active course |
| The ledger: active minutes per day × kind × course, 400 days, this device | The end screen is one line: no streak, no totals, no graph, no milestone |
| Streak milestones 3…365, `StreakCelebration` (never rendered) | No record of finished sessions. The badges "weekly-ritual" and "iron-routine" read `workoutDays`, which nothing supplies: they can never be earned |
| Snapshots, Over-time charts, weekly ring on Today | No monthly or yearly minutes, no average session length |
| | The run and today's edits are keyed by day only, not by course: switching course mid-day shows the other course's session |

## 1. Words

- **Session:** today's practice, from Start to the end screen: what the app calls a workout today.
  - On screen it is called "Practice" (he: "אימון"). It is the same object as the workout; only the card and the end screen change.
- **Length:** the minutes the player chose for this session.
- **Focus:** what the session is for, always inside the active course (owner 2026-11-24: the daily session belongs to a course, never the other way round). It can be:
  - **my plan**, the course balanced (default);
  - one **area** of the course (Technique, Improvisation, Repertoire, Ear, Reading, Rhythm, as the course has them).
- **Daily length:** the default length, a setting. 30 minutes for everyone.

## 2. The card: two choices and Start

The card on Today becomes the first thing on the screen and the simplest:

```
 Practice today
 [ 10 ][ 20 ][ 30 ][ 45 ][ 60 ][ 90 ][ … ]  min      ← one row, 30 selected
 [ My plan ▾ ]                                      ← focus
 ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬                     ← the split as one bar
 Warm-up 3 · Technique 15 · Improv 8 · Review 4
 [            Start · 30 min            ]
 Edit ›
```

- **Length chips:** 10 · 20 · 30 · 45 · 60 · 90. "…" opens a stepper from 5 to 180 in steps of 5.
  - The chosen length is remembered as the next default; no separate "save" button.
  - A saved weekday template still wins on its weekday.
- **Focus:** a compact picker: "My plan" and the course's own areas. It never lists other courses; changing course stays with the course chip in the top bar, as today.
- **The bar:** shows the split live. Changing the length or the focus re-splits it at once, with a short animation, so the player sees what the coach chose.
- **Each segment:** has its "why today" chip on tap ("your left hand lags behind", "4 reviews due").
- **Start:** starts at once. "Edit ›" opens the existing editor.
- **After Start:** the card turns into the running card that exists today (minutes left, the next block, Continue).
- **The session belongs to its focus:** the resume slot and today's edits are keyed by day + course. Switching course mid-day keeps each course's session apart.
- **Fits one phone screen** with Today's top bar (exercise-fits-one-screen); the chip row scrolls sideways only below 340 px.

## 3. The smart split

### 3.1 Baseline shares (exist; unchanged)

| Course | Shares |
|---|---|
| Instrument | path ~20%, then technique 70% (beginner 85%) and improv 30% (classical: repertoire; drums: grooves); maintenance 15% of technique when reviews are due |
| Ear / voice | new 22% · strengthen 48% · review 30%; vocal warm-up for singers |

### 3.2 The coach moves the shares by need (new)

Each area's share moves by up to ±15 points from the baseline. The inputs are measured, never guessed:

| Signal | Effect |
|---|---|
| **Neglect:** the area's minutes in the last 7 days fell below its planned share by more than a third | + up to 10 points |
| **Gap:** the area's closeness to target (tempo, accuracy) is the lowest among the course's areas | + up to 5 points |
| **Due:** spaced reviews waiting (count) | the review block grows (2 → 6 minutes) |
| **Slipping:** an item that was closed failed twice this week | it goes into the warm-up / review |
| **The AI coach's weekly tilt** (accepted by the player) | as today, ±10 |
| **The player's feedback:** "too hard" / "too long" | as today: tomorrow −5 minutes or an easier mix for 3 days |

- **One reason per change:** the biggest move gets a line on the card ("More rhythm today: 12 min this week out of 40 planned").
- **The tilt card** that lives on Insights also appears on Today as that one line, with Accept / Not this week.

### 3.3 The length shapes the session (new)

A short session should not be 6 slices of 3 minutes. The number of blocks and their kinds follow the length:

| Length | Blocks | Shape |
|---|---|---|
| 5–10 | 1–2 | the most needed block; a review if due (2 min) |
| 15–20 | 2–3 | short warm-up (2) · main block · second area or review |
| 30 (default) | 3–4 | warm-up 3 · technique · improv / repertoire · review |
| 45 | 4–5 | as 30, plus a second technique block (another exercise or key) |
| 60 | 5–6 | as 45, plus "play a tune" (repertoire or on a tune) and a game or ear block |
| 90+ | 6–8 | blocks no longer than 20 minutes each, with a 1-minute break card between long blocks |

- **Minimum block:** 4 minutes on an instrument (3 in ear). A block that would be shorter goes into its neighbour.
- **Warm-up:** ~10% from 20 minutes up. It is always the slow, rubato start of today's main item (rubato-then-tempo).
- **Ends on something pleasant** at 30 minutes and more: a tune, the improv block or a game, not the hardest drill.
- **Deterministic:** the same inputs give the same split, unit-tested per length (5, 10, 20, 30, 45, 60, 90, 180).


## 4. During the session (mostly unchanged)

- The run screen, the between-blocks card with Next / +2 min / End, and resume after Back or reload: all as today.
- **New: "+5 min" at the end.** On the last block, before the end screen: "Keep going? +5 min". It adds one block of the most needed area. This is the soft push to practise longer, always optional.
- **Streak:** a finished session counts the day for the streak, even under 5 measured minutes (SPEC-WORKOUT W15, never built).
- **End early:** "End" now goes to the end screen too, with what was done. Today it skips it.

## 5. The end screen: the reward

**The order on the screen** (one phone screen; the details scroll below):

1. **The headline:**
   - Toni proud.
   - The session's minutes counting up to their number: "32 min".
   - One line: "Practice done: technique, improv, review".
2. **Today's milestone** (at most one big, at most two small; only what was really reached):

   | Kind | Examples |
   |---|---|
   | Total practice time | 1 h · 5 h · 10 h · 25 h · 50 h · 100 h · 250 h · 500 h · 1000 h |
   | Sessions finished | 1 · 10 · 25 · 50 · 100 · 250 · 500 |
   | Streak | 3 · 7 · 14 · 30 · 50 · 100 · 200 · 365 days (exist) |
   | Records | longest session; most minutes in a week; most in a month |
   | Average | "your average session this week: 26 min, up from 21" (shown only when it rose ≥ 2 min) |
   | Weekly goal | reached this week's minutes goal (§6) |
   | Skill | an item closed at target tempo today; a key filled |

   The big one gets the full celebration (the existing `StreakCelebration` style, in the Paper look). The small ones get chips.
3. **The week ring:** this week's minutes against the weekly goal, with "+35 min on last week" (▲ only when it is up).
4. **Totals:** this week · this month · this year, in hours and minutes. Tap → Progress › Over time.
5. **One graph**, chosen so it is true and encouraging. The first that applies:
   1. **Improvement today:** the tempo (or accuracy) of today's main item over its last 10 takes, today's highlighted ("Triads in E♭: ♩72 → ♩88 this week");
   2. **Minutes up:** this week's 7 days as bars, today highlighted, last week's average as a line;
   3. **Average session:** the average session length per week, last 8 weeks (shown when it rose);
   4. **Streak calendar:** the last 5 weeks of practice days.

   Never a falling line on the end screen. The full, honest picture lives in Progress.
6. **Tomorrow:** "Tomorrow: 30 min · starts with the A♭ major scale" (from the plan).
7. Small, at the bottom:
   - "How was it?" (exists);
   - **Share** (a share card with the minutes, the streak and the milestone; the existing share-card style);
   - **Done**.

**Tone:** a serious music teacher. No emoji, no exclamation hype, the Paper icon language. One short sentence per item (compact feedback).

## 6. Encouraging longer practice (without guilt)

- **The weekly goal:**
  - minutes per week = daily length × practice days per week;
  - practice days per week is a setting, 5 by default;
  - it shows as the ring on Today and on the end screen.
- **Raise the goal:**
  - After 3 weeks in a row at or above the weekly goal, the end screen asks once: "Make it 35 minutes a day?" (+5).
  - The player answers Yes or Not now. The question does not return for 3 weeks.
- **+5 min at the end** (§4).
- **The average session** is part of the end screen and the monthly review (`monthReview`), with the change from last month.
- **The monthly review** adds total minutes, the average session and the longest session.
- **What is not done:**
  - no guilt messages;
  - no reminders beyond the existing ones;
  - no minutes in the leagues (they stay XP: minutes can be inflated by leaving the app open; the ledger counts only active time anyway).

## 7. Settings

- **Practice → "Daily practice":** 30 minutes by default, 5–180 in steps of 5. It replaces the intake's 5 / 10 / 20.
  - The intake question becomes 10 / 20 / 30 / 45 / 60, default 30.
- **Practice → "Practice days a week":** 3–7, default 5.
- The daily XP goal stays as it is. It is separate (the league and the "goal" ring).

## 8. Data

- **New: the session record.** Kept in progress (synced with the profile like the other settings until the DB migrations can run):

  ```ts
  interface SessionRecord {
    id: string;
    day: string;                  // practice day
    course: CourseId;
    focus: 'plan' | DomainId;
    plannedMin: number;
    activeMs: number;             // from the ledger, active time only
    blocks: { kind: string; ms: number; items: number; correct: number }[];
    finished: boolean;            // reached the end screen (also "End" early)
  }
  ```

  - The last 500 sessions are kept, and totals from the start: sessions finished, total ms, the records (longest session, best week, best month).
- **Totals per week, month and year:** from the ledger (`msByDay`), with helpers `monthTotals` and `yearTotal` next to `weekTotals`.
- **Average session:** activeMs of finished sessions ÷ their count, per week.
- **Fixes:**
  - `workoutDays` from the session records, so the badges "weekly-ritual" and "iron-routine" can be earned;
  - the resume slot keyed by course.

## 9. Order of work

1. **Data:** session records, totals, average, the fixes; the daily-length and days-a-week settings; the intake options.
2. **The card:** length chips, focus picker, the live split bar, Start.
3. **The split:** length shapes the session (§3.3) and the coach's need-based moves (§3.2), unit-tested per length.
4. **The end screen:** headline, milestones, ring, totals, the chosen graph, tomorrow, share; End early goes there; the streak counts a finished session.
5. **The longer-practice nudges:** +5 min at the end, raise the goal, the monthly review additions.
6. All four check-ins of the course-change checklist (opener lines that mention the workout, Today) and the i18n catalogs for the new texts.

## 10. Owner's answers (2026-11-24)

1. **Practice days a week:** 5 by default. Answered: yes.
2. **Leagues:** XP, not minutes. Answered: yes.
   - **But (owner):** "we need to see what gives persistence: maybe an XP bonus and the like. Today there is XP for the practice itself and points for the level. I want something given for the pace of progress and for persistence."
   - The answer is §11.
3. **Built (0.132.0):** phases 1–2:
   - session records;
   - the daily length and practice days a week;
   - the card with length, focus and the live split.

## 11. Rewards: what earns what (owner-approved 2026-11-24)

### 11.1 Today (audit 2026-11-24)

| Currency | What raises it | Problem |
|---|---|---|
| **XP:** league, daily goal, player level | volume: a fixed amount per correct answer or clean take (a clean drill take = 4 XP, whatever the item) | A clean take of a closed, easy item at a slow tempo pays the same as a new best on a hard one. Drill XP has no cap and no discount for repetition. |
| **Level:** rating, rank, course dynamics | beating harder items; a win never lifts the rating above the item's difficulty + 50 | Already resists comfort practice. Nothing to fix. |
| **Streak:** days, gems, badges | a practice day (≥ 5 measured minutes or a finished result) | Rewards showing up, not how much or how well. |

**What already exists and can be reused:**
- **Comfort / stretch signals:**
  - the item's status (new / learning / almost / closed);
  - its due date;
  - its clean best tempo and its target;
  - the coach's "easy take" flag and its "limit today";
  - the item's tier against the player's tier;
  - the weaker channel (ear / reading), which already pays ×1.5;
  - the Elo expected score for any rated item.
- **The model that already discounts repetition:** Encore's phrase XP:
  - ×0.5 in a key already passed;
  - a novelty factor;
  - a daily cap per phrase.

### 11.2 The principle

Three separate things, each rewarded by its own measure. None can be bought with another.

1. **XP = effort that stretches.** It still drives the league, the daily goal and the player level. A take or an answer earns its base XP × a **stretch factor**:
   - more for leaving the comfort zone;
   - less for staying in it.
2. **Level = what the player can do.** Unchanged: only beating harder material raises it.
3. **Momentum (new) = persistence and the pace of progress, per week.**
   - It shows as its own meter.
   - It pays fixed XP bonuses, so persistence and real progress also count in the league.

### 11.3 The stretch factor (XP per take or answer)

Each take gets one band, decided from what the app already knows. The first rule that applies wins:

| Band | When | Factor |
|---|---|---|
| **Stretch** | a new clean best tempo; a take at or above the item's previous clean tempo while it is not closed; an item a tier above the player's; a key or scale not closed yet *and* rarely played (fewer than 3 sessions in it); the weaker channel; the weaker area (§11.5); the first clean take of a new item | **×1.5** |
| **Work** | learning / almost items at their working tempo; the rubato and slow stages of an item **not yet closed** (learning slowly is the method, not comfort: rubato-then-tempo); due reviews (maintenance is the right thing to do) | **×1** |
| **Comfort** | a closed item that is not due; a tempo more than 10% below the item's clean best; an item two tiers or more below the player's; the 4th "easy take" in a row on the same item | **×0.3** |

- **Repetition:** the same item in one day pays full for 6 takes, then half, then nothing after 15. Same idea as Encore's daily cap.
- **What the player sees after a take:** a small line.
  - stretch: "Stretch ×1.5";
  - comfort: "Comfort zone: try ♩96". The line always says how to stretch.

  The band is never hidden. The point is to teach what good practice is.
- **Lessons and ear questions:**
  - questions are already chosen near the player's level, so the factor follows the Elo expected score;
  - an answer the player was expected to get right with ≥ 95% pays ×0.5;
  - an answer below 60% expected pays ×1.3.
- **The same rule everywhere:** drills, licks, Encore (already close), My Song, ear, voice and games. Games keep their own caps.

### 11.4 Momentum: persistence and the pace of progress (new, weekly)

Momentum is a weekly score from 0 to 100 in two halves. It is shown as a ring on Today, on the end screen and in Progress.

| Half | Measured by | Full when |
|---|---|---|
| **Persistence** (50) | practice days this week against the goal (5), and minutes against the weekly goal | both met |
| **Progress** (50) | real gains this week: new tempo records, cells closed (an exercise in a key), keys filled, items up the status ladder, rating gained, a rank promotion | about one week's worth at the player's own usual pace: it compares the player with themselves, so a beginner and a pro can both fill it |

**What Momentum pays (XP, counted in the league):**

| Event | Bonus |
|---|---|
| A session finished at its planned length or more | +10 |
| The weekly goal reached (days and minutes) | +100 |
| A full week (practice days ≥ goal) for 4 weeks in a row | +200 (once per 4 weeks) |
| A new tempo record | +5 |
| A cell closed (an exercise passed in a key) | +20 |
| A key with every exercise open at the player's level closed | +50 |
| A rank promotion | +100 |
| Momentum ≥ 80 for the week | the week ends with "+10% next week" on all stretch XP (one week, never compounding) |

- **Why bonuses and not a multiplier on everything:** a multiplier would pay comfort practice too. A bonus pays only the act itself (showing up, closing, improving).
- **The pace of progress also shows as a graph** on the end screen (§5) and in Progress: closed cells and tempo records per week, against the player's average.

### 11.5 The weaker area and channel

- **Channels:** ear and reading already pay the weaker channel ×1.5 (SPEC-EAR-AND-READING §5).
- **Areas:** the same idea for areas inside a course. Example: in the ear course a player strong in reading and weak in ear:
  - minutes in the weakest area beyond its planned share are stretch;
  - minutes in the strongest area beyond its planned share are comfort.
  - "Strong" and "weak" come from the area ratings.
- **Keys and scales:** a key the player rarely plays is stretch; their favourite keys, once closed, are comfort unless due.

### 11.6 Minutes: time counts for the habit, stretch counts for the reward

- **All active minutes count toward the weekly minutes goal and the streak.** Time at the instrument has value, and maintenance is part of practice.
- **The end screen splits them:** "32 min · 18 of them outside your comfort zone". Progress keeps a weekly "stretch minutes" line.
  - This shows the difference without punishing.
  - XP already pays the difference.

### 11.7 Anti-farming

- the daily caps per item (§11.3);
- the existing caps on games, the log and Encore;
- the server's plausibility check (xp ≤ total × 20) stays;
- the Momentum bonuses have fixed, weekly limits.

## 12. Choosing a key, a scale family or one exercise

- **What exists:** the card offers only areas. A workout block cannot point at a key, a family or one item; only `keys` (today's matrix plan) exists.
- **What the Practice page already has** (Technique, two views):
  - **By key:** 12 keys × groups:
    - major;
    - minor;
    - melodic/harmonic minor modes;
    - symmetric.

    Each key holds roles: scale, arpeggio, cadence, pattern, control, Harris, harmony, voicing, line, colour, comping, apply.
  - **By topic:** families (scales, chords, hands, time, grooves, styles, reading, ear…), each with levels (= rungs).
  - **The matrix cell** is (group, key, rung). An item is one exercise in one key.

**The focus picker on the card, for an instrument course** (one tap opens a sheet; "My plan" stays the default):

| Focus | What the session does | Built on |
|---|---|---|
| **My plan** | the coach's split (§3) | exists |
| **Technique** | all technique, weakest first | exists (area preset) |
| **A key**: pick one of 12 + major / minor / modes | the whole session in that key: every open exercise of the key (the key session), then improv in that key (rule-based improv with rotating scales) | `keyLadder(root, group)`, the key page |
| **An exercise**: pick a rung (for example "triads", "bebop scale", "ii–V–I voicings"), listed by role as on the key page | that one exercise through the 12 keys, weakest keys first, changing key as the coach advances | `matrixOrder('exercise')`, `matrixSummary.byRung` |
| **One item**: from the exercise page, "Practise this for N min" | that one item up its tempo ladder, then its other keys | the coach run |
| **Licks** · **Improvise** · **Repertoire** | that area only | exist |

- **Two ways in, one session:** from the card's sheet; and from the Practice page, where every key page, exercise page and item has "Practise this · N min". It sets today's focus and starts the session.
- **Inside a key or exercise focus, the length still shapes the session** (§3.3). 10 minutes in E♭ = its scale and one more exercise; 60 minutes = every open exercise and an improv block in the key.
- **The stretch factor applies inside any focus.** A focus on a closed, easy exercise earns comfort XP. The sheet marks keys and exercises by state so the player can choose:
  - "new";
  - "working";
  - "closed";
  - "due".
- **Ear and theory course:** the focus is an area, a skill or a topic (the targets exist).
- **Drums:** a family (grooves, rudiments, fills…) or one groove style.

**Blocks:** new block targets:
- `key {root, group}`;
- `rung {rung}`;
- `item {id}`;
- `family {family}` (drums).

## 13. Order of work (updated)

1. Done (0.132.0): data and the card.
2. **Next:**
   - the split by length (§3.3) and by need (§3.2);
   - the focus sheet with key / exercise / item (§12);
   - "Practise this · N min" on the Practice pages.
3. The end screen (§5), including stretch minutes and the Momentum ring.
4. Rewards:
   - the stretch factor (§11.3) with its take line;
   - the daily caps;
   - Momentum and its bonuses (§11.4).
   - Unit-tested per band; the server rule is unchanged.
5. The longer-practice nudges (§6).

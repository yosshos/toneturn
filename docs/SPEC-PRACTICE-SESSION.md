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

## 10. Questions for the owner

1. **Practice days a week for the weekly goal:** 5 by default? (Proposed: 5. A player who practises daily simply passes it.)
2. **Minutes in the leagues:** stay XP only? (Proposed: yes, for the reason in §6.)

# Progress over time: charts for the player, the student, the teacher and the class (draft for the owner, 2026-11-22)

**What the owner asked (2026-11-22):** graphic views of the pace of progress in every area, for the player on their own, the student, the teacher and the class. For example, colourful charts showing progress over time in every parameter. "It will give a lot of feedback to anyone who practises regularly."

**Builds on:** SPEC-STATS (time frames 7 days / 30 / 90 / a year / all; skill trends in Trends.tsx), the practice diary (minutes per day by area, PracticeLedger), the player profile, and the class heat map. It uses the new model from BUILD-PLAN-2026-11: the one status ladder, the take's channel and active time, the matrix.

## 0. Principles (true for every chart here)

- **One y-axis per chart.** Two measures of different scales get two charts side by side, never two axes.
- **Colour follows the entity, never its rank.**
  - Each area of the course (technique, harmony, improvisation, by ear, reading…) has **one fixed hue** across the whole app, the same on the radar, the minutes chart and the trends.
  - The status ladder has its own sequence (one hue, light to dark), separate from the area colours.
  - The palette is validated with the colour checker (blindness, contrast, light and dark) before shipping.
- **One series per small chart, or up to 4 with a legend and a name beside each line.** More than that becomes small multiples, never 9 colours.
- **Identity never by colour alone:** a name beside the line, a ▲/▼ with a number beside a change. A table view for every chart.
- **Touch and hover:** a tooltip with the exact value. Filters in one row above the charts. The time frame is remembered per device (as today).
- **The time axis reads left to right in Hebrew too** (an LTR island, as in Trends.tsx). Labels and headings are Hebrew.
- **No glow and no gradients.** Thin lines (2px), rounded bars, a quiet grid. This is the app's mature language.

## 1. What is measured: daily snapshots

A chart needs history, and some of the new measures (the status ladder, channels, the matrix) have no history yet. So the app saves **one summary a day**: a small snapshot computed after the day's last session.

| Field | Content |
|---|---|
| `day` | the date |
| `status` | the count of items at each step of the ladder (new / learning / almost / closed / 12 keys / in my language / in the fingers), per area |
| `tempo` | a tempo index per area: the median share of target among the open items |
| `minutes` | active minutes per area and per channel (from the take) |
| `channels` | the two numbers of the profile (ear, reading) and the actual mix of the week (strong / weak / memory) |
| `keys` | per key: cells closed ÷ cells open |
| `vocab` | licks learned / in practice / in my language; Encore phrases |
| `improv` | colour coverage, in-scale rate, the mode × function map (summarised) |
| `streak` | practice day yes/no, minutes |

**Storage:**
- on the device (IndexedDB): daily for a year, weekly after that;
- **only the summary syncs to the cloud,** so the teacher can read it for a student in their class (privacy, §6). Raw takes don't sync.

**Back-filling the past:** whatever can be computed from existing history is filled in once. That covers:
- the dates an item closed (from `passLog`);
- the best clean tempo per day (`history`);
- minutes per day (PracticeLedger).

Channels and the matrix start from the day the snapshots begin.

**The snapshots must start soon** (§7), so that by the time the charts are built there is something to show.

## 2. The player's charts (each practitioner)

On the Progress page, a new tab **"Over time"**. The rest of the tabs stay as they are.

| # | The chart | Form | Answers |
|---|---|---|---|
| 1 | **This week vs last week** | 4 number tiles with ▲/▼: minutes, items closed, practice days, tempo index | "Am I moving?" in one glance |
| 2 | **Closed over time, by area** | small multiples: one line chart per area (cumulative closed), the same scale | where I progress faster, and where I'm stuck |
| 3 | **Items move up the ladder** | a stacked column per week: the count at each status (one hue, light to dark) | is the amount of "almost" and "closed" growing at the expense of "learning" |
| 4 | **The tempo index** | a line per area chosen in a filter (up to 4 + a legend), a horizontal line at 100% = the target | how close I am to the targets |
| 5 | **The keys filling up** | a heat strip: 12 keys (rows) × weeks (columns), shade = share closed | which keys lag behind |
| 6 | **Ear and reading** | two small charts side by side (one series each): the ear number and the reading number over time. Below them, a bar of this week's actual mix against the target | is the weak channel closing the gap (SPEC-EAR-AND-READING) |
| 7 | **Where the minutes go** | a stacked column per week by area (≤ 6 areas + other, a legend), with a marker of the planned split (path 20 / technique / improvisation) | does practice match the plan |
| 8 | **Language** | two lines on the same scale (a legend and names beside them): licks learned, in my language | is the vocabulary turning into language |
| 9 | **Improvisation** | colour coverage and in-scale rate as two small charts; a heat map of mode × chord function (the share of colour notes) | which modes are already mine |
| 10 | **Practice days** | a calendar heat map (a year) | consistency |

**Also, small charts inside the places** (the same data, compact):
- **an item's page:** a tempo-over-time line with the target line, and a ceiling marker where there was a plateau;
- **a key page:** a line of how much of the key is closed;
- **a place's main screen:** one sparkline (for example "closed this month") beside the title;
- **"Today":** a small weekly ring with the week's ▲/▼.

**Insight sentences** above the charts, in few words. Only facts from the data, and only when the change is real (not noise):
- "Reading went up 18% this month."
- "Technique is fast; improvisation has stood still for two weeks."

## 3. The student (in a class)

Everything in §2, plus:
- **The assignments' progress:** a "burn-up" per assignment: items closed out of the assignment's items, against a due-date marker. Shown in the "From the teacher" section and in the history.
- **"Since the last lesson":** pick a date (the lesson day), and a table of what changed since then, plus a short line per area. The student and the teacher see the same thing.

## 4. The teacher

### 4.1 One student's page

- §2's charts, read-only, with "since the last lesson" at the top.
- **A grey reference line of the class median** on the tempo-index and minutes charts. Same unit, so no extra axis.
- **The assignments:** a burn-up per assignment; minutes a day against what was asked.
- **Alerts with a small chart:**
  - "practised 3 days out of 14" (a minutes line);
  - "stuck at the limit for 3 sessions" (a tempo line with the ceiling).

### 4.2 The class page

| Chart | Form | Answers |
|---|---|---|
| **Small cards per student** | each card: a minutes sparkline and a closed sparkline over 4 weeks; sorted by need (whoever needs attention first) | who's moving and who isn't |
| **Students × weeks** | a heat map (shade = minutes, or closed, by a filter) | the class's rhythm over time |
| **One assignment across the class** | the median line plus a band from the lower to the upper quartile; students outside the band marked by name | is the assignment suitable, and who's falling behind. No lines for 30 students. |
| **A tempo spread on an assignment** | a strip of dots: one dot per student (% of target) | where everyone stands right now |
| **Areas of the class** | the class's average radar beside a column of change this month per area | what to stress in the next lessons |

**The parent digest** (as today) gets a simple version: tiles 1, chart 10, and the week's minutes chart.

## 5. Weekly feedback (motivation)

- **The weekly summary** (once a week, in Today): the 4 tiles, one chart where the change was largest, and one sentence. The AI coach reads the same snapshots for its weekly review.
- **A share card** (optional): "this month: 41 items closed, reading +18%". No ranking against others.
- **No leaderboard and no comparison with friends** in these charts. Comparison stays in the leagues.

## 6. Privacy

- **A student in a class:** the teacher sees the summaries (§1), not raw takes or recordings (except recordings the student submitted).
- **The class median** is shown to a student only if the teacher turns it on (owner question 1). It is never by name.
- **A parent** sees only what the student or teacher shared through the digest link.

## 7. Order of work (an addition to BUILD-PLAN)

| Phase | Addition |
|---|---|
| **1b (now, before the charts)** | the daily snapshots (IndexedDB) + back-filling the past + syncing the summary for class members. No new UI, but the history starts to build up. |
| 2 | the small chart on an item's page (tempo with a target line and a ceiling) |
| 3 | the sparkline on a place's main screen; the weekly ring in Today |
| 6 | the "Over time" tab (§2), the colour palette per area (validated), insight sentences |
| 6 | the student: burn-up per assignment, "since the last lesson" |
| 6 | the teacher: the student's page with the median and alerts; the class page (§4.2); the parent digest |
| 8 | the weekly summary with the AI coach; the share card |

## 8. Owner's answers (2026-11-22)

1. **The class median for students:** yes, **if the teacher chooses**. The teacher's class settings get a switch "show students the class median (anonymous)", default off. The student sees a grey line with no names, and only on the tempo-index and minutes charts.
2. **The time frame:** the default is **30 days**. The longer options **open as the player's tenure grows**:

   | Tenure | Options shown |
   |---|---|
   | first week | 7 days |
   | from 2 weeks | + 30 days (the default from here on) |
   | from 2 months | + 90 days |
   | from 6 months | + a year |
   | from a year | + all |

   An option with no data behind it is not shown, so there are no empty charts.

# The teacher's weekly plan, the coach's suggestion on Today, the new player's window (owner, 2026-11-25)

**Status:** approved by the owner 2026-11-25 ("specify well and build"). Builds on SPEC-PATH-TODAY-PRACTICE §5 (the
teacher), SPEC-PRACTICE-SESSION (the daily session), BUILD-PLAN-2026-11 phase 8 (the coach's tilt, `aiTilt.ts`).

## 1. The teacher's weekly plan (SPEC-PATH-TODAY-PRACTICE §5.2, "a weekly plan")

**The need.** A teacher who teaches the same material to several students does not want to fill the assignment form
five times a week per student. A weekly plan is several assignments together, saved once, sent to any class (a class
may hold one student) in one action.

### 1.1 What a plan is

| Field | Value |
|---|---|
| Name | the teacher's own, ≤ 40 characters ("Week 3: ii–V in 4 keys") |
| Items | 1–12 assignment templates, in order |
| Per item | the kind and its target (lesson / topic + level / drill level / chart / piece / phrase / focus), strictness, target tempo, note, required channel, minutes a day, spread / all today, **due after N days** (0–14) |
| Not kept | the teacher's recorded demo (it belongs to one class's assignment; the teacher records again if wanted) |

- Kept in the teacher's settings (`teacherPlans`), synced to all their devices, kept through a fresh start (own
  material). No server change: sending a plan calls the existing assign + options calls once per item.
- At most 30 plans.

### 1.2 Making a plan

On the teacher's class card:
1. **"Save as a weekly plan"** under the assignment list: a checklist of the class's assignments (all checked by
   default; at most 12), a name field, Save. Each item's "due after" = its due date − the day it was assigned
   (clamped 0–14; no due date → 7).
2. A saved plan can be **renamed, have items removed or reordered (up / down), or be deleted** (delete asks once).

### 1.3 Sending a plan

On the teacher's class card: **"Send a weekly plan"** → choose the plan → a start day (default today) → a preview of
the items with their due dates (start + N) → **Send**. Each item becomes a normal assignment (and its options).
- Sent in order; if one item fails, the ones sent stay sent, the failed ones are listed with **Try again** (only the
  failed ones are re-sent — never a duplicate).
- **How "never a duplicate" holds (built after 3 review rounds):** the items of a send are queued on the sending device
  (`storage/weekPlanQueue.ts`, not in the synced plans: a cloud copy can never bring back an item that went out) when
  the send begins, and each leaves the queue the moment its assignment exists. What is still queued shows on the class
  card by name ("Not sent yet") with **Send the rest** and **Discard** per item, after a closed panel or a reload too.
  A send in flight is known app-wide, so a reopened card cannot start it twice, and only one window of the app sends to
  a class at a time (a browser lock). Every send first asks the server for the class's assignments (no answer: nothing
  is sent) and keeps that list as the send's "before" list; on a later retry an assignment the class has that was NOT
  in the before list, with exactly the item's content (target, due date, strictness, tempo, note), counts as that item
  already made — one assignment for one item, never one this device already accounted for. No clocks are compared.
  A whole-plan resend for a day with waiting items checks them the same way and stands in for them one for one; a
  waiting item the plan no longer contains stays listed.
  If an item's options (channel, minutes) fail to save, the item stays listed as "options not saved" (after a reload
  too) and Send the rest saves only its options.
- A plan is bounded in size (48 KB; all plans 240 KB), so long phrase codes cannot bloat the synced settings.
- Sending the same plan to the same class again on the same start day asks first ("already sent on that day").
- The student sees ordinary assignments — the "From the teacher" section of the daily session, marks, grading — no
  new student screen. The note of each item gets nothing added.

### 1.4 Tests

Unit: plan from assignments (due offsets, cap 12, no audio), plan → assignment calls (dates, options, order), partial
failure and retry sends only the failed, duplicate guard, settings sync / fresh start keep. e2e with the teacher mock:
save, edit, send, see the assignments in the class list.

## 2. The coach's suggestion on Today

**Today** the weekly tilt (the improvisation share ±5 points a week, at most ±10, from measured facts) is shown only on
Insights, so almost nobody sees it. The owner: show it on Today.

- **Where:** on Today right under the daily workout card (it changes that plan), in the instrument courses where the
  tilt exists (keys, guitar, bass).
- **When:** only while this week's proposal is **unanswered**. Once answered (Accept / Not this week) it leaves Today;
  Insights keeps the full card with Undo.
- **What:** the same compact card: title "The coach's suggestion for the week", the one line ("This week:
  improvisation 30% → 35% …"), the measured reasons, Accept / Not this week. Accept changes today's plan at once.
- **Not** the style taster (Today already shows at most one style card, SPEC-STYLE-FOCUS §9) — the Today card is the
  tilt only, so the two never repeat each other.
- The weekly AI summary now receives the tilt and the taster to word them (`AI_TILT_SERVER = true`: the deployed
  function's weekly prompt knows the fields since 2026-11-24).
- e2e: an unanswered proposal shows under the workout card; Accept hides it and the plan's improvisation share moves;
  Insights shows the answer.

## 3. The new player's daily window (jazz too)

The open question was the default window for a new jazz player; proposed 30 minutes. **Already true for everyone:**
the daily session's default is 30 minutes (`DAILY.def`, SPEC-PRACTICE-SESSION), whatever the style focus, and the
onboarding asks minutes and days. Nothing changes; a unit test pins it (a new jazz-focused keys player → 30 minutes).

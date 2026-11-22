# Path, Today and Practice: how they connect, plus the teacher (owner, 2026-11-22)

**What the owner asked:**
- **Before building:** finish the path's role and the teacher–student interface.
- **The menu order:** Today, Practice, Path.
- **From every path step,** a way to the fuller practice of that step.
- **The connection between Practice, the daily workout and the path** doesn't feel complete yet; specify the interfaces between them.

**Builds on:** SPEC-PATH-ROLE (approved 2026-11-14), BUILD-PLAN-2026-11, SPEC-PRACTICE-IA-3 and the teacher loop (TeacherLoop.tsx, 0.52).

## 1. One item, three lenses

The root of the missing connection: today each surface draws its own copy of the same thing. The fix is that every exercise, lick, piece and improvisation level has **one home in Practice** and **one page**. The path and Today are two lenses over the same items.

| Surface | Question | What it is |
|---|---|---|
| **Today** | What do I do now? | A playlist for today, drawn from Practice: new material from the path, the teacher, what needs strengthening, review |
| **Practice** | Where does everything live? | The home of every item: Technique, Licks, Repertoire, Improvise |
| **Path** | Where am I on the journey? | A map: units, order, story, check-ins, level. The next steps flow into Today by themselves |

**The menu (owner):** Today · Practice · Path · Progress · …

## 2. The item page: one page, whatever the way in

Every item (a rung in a key, a lick, a piece, an improvisation level) opens **the same page**, whether you arrived from the path, from Today or from Practice.

**The top of the page is always the same:**
1. **The name and the status ladder:** new, learning, almost, closed, in all 12 keys, in my language, in the fingers.
2. **"Where it sits":** a chip to its node in the path ("Unit 4 · step 3"), if it belongs to the path.
3. **"Why today":** a chip, if it is in today's plan: new from the path / from your teacher / needs strengthening / review / key of the week.
4. **"From your teacher":** the note, the demo and the target, if it was assigned.

**Only the main button changes, by context:**

| Arrived from | Main button | And beside it |
|---|---|---|
| The path | **Continue the step** (the minimum to open it) | **The full practice of the step** (owner) |
| Today | **Today's dose** (to the target or the limit, within the block) | Continue freely |
| Practice | **Practise** (free, the coach adapts) | Add to today |
| The teacher | **The assignment** (its target and channel) | Send to the teacher |

**Back** always returns to where you came from, and today's plan carries on.

## 3. The connections, one by one

### 3.1 Path → Practice (owner: "the full practice of the step")

**On the step's gate page** (the brief page: text, refresher, Play), beside Play:
- **"The full practice of the step"** opens the item's home in Practice, focused on it, with everything beyond the minimum.

| A step of type | Opens |
|---|---|
| Technique | the key page, with this rung lit and all 12 keys |
| Lick | the lick's page (12 keys, the two modes) |
| Piece | the piece's page |
| Improvisation | the improvisation level, with the rules and rotation |
| Ear / theory | the topic in the Ear course |

**On the step's closing screen** (opened ✓):
- "**The step is open.** From here it goes into the daily workout, through all 12 keys up to closed."
- A **"keep practising now"** button opens the same page.

### 3.2 Practice → Path

- **On every item's page:** the "where it sits" chip goes to its node in the path.
- **An item ahead of the path** stays open (Practice is the whole library). It is marked "later in your path, Unit 7".
- **If it is opened in Practice** (a first clean pass), the path marks the step as opened by itself and moves on. There is no need to repeat it.

### 3.3 Path → Today

- **The new block in the daily workout** (about 20%) = the path's next steps, as today (SPEC-PATH-ROLE).
- **A technique step opens a cell in the matrix:**
  - the step = opening the rung in the key of the week;
  - from that moment the cell goes into the strengthen block and gets deepened through the other keys.
  - So there are no "levels in the path" and "cells in the matrix" as two separate things.

### 3.4 Today → Practice

- **Every item in today's plan** opens its page in Practice, with the "why today" chip.
- **In the places themselves,** an item that is in today's plan carries a small "part of today's workout" mark.
- **Practice counts wherever it happens.** An item done from Practice counts toward today's plan; there is no double plan. Today's progress ring counts everything.
- **"Continue where I stopped"** at the top of Today and of Practice opens the same point.

### 3.5 Path's checks → Today

A path check that found a weakness adds the weak items to the strengthen block (as today, "Fix my mistakes").

## 4. The path: what changes

1. **The menu:** third, after Today and Practice. The path is the map, not where the day starts.
2. **The step's rule stays "opened"** (the first clean pass). Each node shows the status ladder beside its ✓, so both the ✓ and the distance to closed are visible.
3. **A technique step = opening a rung in the matrix** (§3.3).
4. **A step is learned in the player's strong channel** (SPEC-EAR-AND-READING). A step can also require a channel ("this one by ear").
5. **New content goes into the units** (the course change checklist): the approach licks, practice by key, scale rotation, the combined sentence. With them: course opener, unit openers, skill map, level test.

## 5. Teacher and student (owner, 2026-11-22)

### 5.1 What the student sees

- **A first section in the daily workout, "From the teacher":** the teacher's name, note and due date. **It is added to the workout; it never replaces it** (owner). The teacher's items come before everything else.
- **When the assignments don't fit today's window,** the teacher picks per assignment (owner: an option):
  - **spread until the due date** (default);
  - **all today,** extending the window today.
- **In the places:** an assigned item carries an "assignment" mark. Its page shows the note, the teacher's demo and the target.
- **The assignment history** (submitted, comments, marks) is in the classes screen.

### 5.2 How the teacher assigns

**From the same places, not a separate form.** On every item's page (for a teacher) there is a button "assign to a student or a class". The current form stays as a shortcut.

**The assignment's fields:**

| Field | Values |
|---|---|
| What | an exercise (which keys), a lick (which keys), a piece (bars / section), an improvisation level with rules and rotation, a unit in the path, a phrase |
| Target | tempo; status: almost / closed |
| **Channel (owner)** | free / from the page / **by ear** / **from memory**. The grading checks the channel: a take with notation shown doesn't meet "by ear". |
| When | due date; minutes a day (optional) |
| A window too short | spread until the date (default) / all today |
| Strictness | as today |
| Note and demo | text, and a recording of the teacher playing |

- **A weekly plan:** several assignments together, saved as a template and assignable to another student.

### 5.3 How the teacher follows

**The class page:**
- a matrix of students × assignments in the one status ladder;
- measured practice minutes (the active time from the take) and the last practice;
- **alerts:** didn't practise for 3 days / stuck at their limit 3 sessions in a row / closed.

**The student's page:**
- the skill map;
- the keys matrix;
- the ear and reading profile;
- recordings submitted;
- the grading inbox, with an automatic mark the teacher can change.

**Parents:** the digest link, as today.

## 6. Order of work (an addition to BUILD-PLAN)

| Phase | Addition |
|---|---|
| 2 (one today) | the "why today" chip; "part of today's workout" in the places; counting practice from anywhere toward today; the teacher's section in the workout (added, with the option of spreading or all today) |
| 3 (Practice reorganised) | the menu Today · Practice · Path; the one item page; the main button by context; Back to the way in |
| 3 | path ↔ Practice: "the full practice of the step" on the gate page and the closing screen; the "where it sits" chip; an item opened in Practice marks the step |
| 4–5 | assigning from every item page; the channel in the assignment and its grading; a weekly plan |
| 6 | the class page and the student's page with the new status, minutes and alerts |

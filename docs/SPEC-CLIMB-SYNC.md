# SPEC-CLIMB-SYNC: the smart climb and drill sync (owner 2026-11-26)

The owner's words:

> "I'm not sure it should rise by only one mark. It should be a very fine weighting of the accuracy, the starting tempo, maybe more. Beyond that, you can rise by more to find out where the ceiling is — something like 'let's try something challenging'. Build practice that feels a little different every time, gives the app the most information so feedback and guidance fit best, and so the player doesn't feel everything is predictable."

> "I switch devices sometimes. Of course it must sync."

This spec extends SPEC-KEY-SESSION-2, section "Owner 2026-11-26". D3 there is replaced by §1 here.

## 1. The step after a clean take (replaces the flat one mark of D3)

**Where it applies.** Every pulsed take of a staged rung: coordination stages, the speed stage, warm-ups and reviews (not a review at today's limit).

**Size.** After a clean take, the next pulse is `at × (1 + p)`, snapped to the metronome marks at the next take's note value. It is never less than one mark up and never more than 10 % (MAX_JUMP).

`p = 0.08 × quality × height × near × fresh`, where:

- **quality**, from the take itself (`stepQuality`):
  - **1.0, tidy and tight:** no wrong notes, no stops, timing SD ≤ 0.5 × the band's limit, and hands ≤ 0.6 × its limit when hands-together.
  - **0.6:** timing SD ≤ 0.8 × the limit.
  - **0.3:** looser.
- **height**, the tempo itself: `heightFactor` (1 below 3 nps, ¾ up to 5, ½ above).
- **near**, how close the new pulse is to the player's best on this kind:
  - 0.5 when it comes within 10 % of the best clean nps in any key;
  - 0.5 when it comes within 10 % of a known ceiling (§2.4);
  - 1 otherwise.
- **fresh**, how far today has already climbed: 0.6 once the pulse is 25 % or more above today's first take of this rung, else 1.

The size of the step is therefore always different. A loose take moves one mark; a tight one up to 8 %.

**Unchanged.** On the speed stage the existing graded `speedStep` keeps its rules (target, near-best halving). The quality and freshness factors are added to it the same way.

## 2. The challenge take ("Let's try something harder")

### 2.1 When it may come

- After a clean take whose quality is ≥ 0.6, on a pulsed stage.
- At least 2 tidy clean takes in a row on this rung.
- At least 6 takes since the last challenge in this session.
- Not during the probe, free time, hands-separately help, a review or the closing.
- At most 2 missed challenges per comfort kind per session (then none on it today).

### 2.2 Whether it comes

- An eligible take turns into a challenge with probability ⅓. The draw is deterministic, from a hash of the session start and the take number, so a session replays the same in tests.
- If no challenge has come by the 4th eligible take of a session, the 4th one is a challenge.
- The result: sessions differ, and the player can't predict when it comes.

### 2.3 The jump

- **Size.** +20 % at under 3 nps, +15 % up to 5 nps, +12 % above.
- **Known ceiling.** If the item's comfort kind has a known ceiling (§2.4) above the current pulse × 1.12, the jump goes to the midpoint between the current pulse and the ceiling.
- **Grid.** Snapped down to the marks, and always at least two marks up.
- **No caps.** The 10 % rule and the target cap do not apply to this one take.

### 2.4 What follows

- **The announcement.** The coach says "Let's try something harder." and then the tempo. The strip's tempo bar shows the take as a challenge.
- **Clean.** "That's your level now."
  - The rung's flow jumps to the challenge pulse and the climb continues from there.
  - The item's best rises with it.
  - If the challenge pulse passed the speed target, the stage passes at once.
- **Almost or miss.** "Back to ♩X."
  - The next take returns to the pulse before the challenge, at a normal step.
  - No counter changes: no "almost" count, no misses, no step-back, no limit.
  - The ceiling estimate for this comfort kind is recorded: the lowest missed challenge pulse. It is saved on the item as `ceil: { nps, at }`, kept per key like stages, and synced.
  - A clean take at or above the ceiling raises or clears it.
- **Where it feeds.** The ceiling is the app's information on where the player's limit is. It shapes the next challenge (the midpoint) and the "near" factor (§1). Later, guidance and feedback will use it too.

### 2.5 Phrases

New fixed phrases, recorded like the rest (scripts/voice/render.mjs, `--src coach`):

| Id | English | Hebrew |
|---|---|---|
| `challenge` | "Let's try something harder." | "בוא ננסה משהו מאתגר." |
| `newLevel` | "That's your level now." | "זו הרמה שלך עכשיו." |
| `backTo` | "Back to the tempo before." | "חוזרים לטמפו הקודם." |

## 3. Drill history syncs across devices

Drill items (`Progress.drillItems`: tempi, stages, history, ceilings) lived on one device. They now sync through Supabase.

### 3.1 Server

Migration `20261211000000_toneturn_drill_items.sql`.

- **Table** `toneturn_drill_items`:
  - columns: user_id, item_id text, epoch text, state jsonb, updated_at;
  - primary key (user_id, item_id);
  - each state at most 32 KB;
  - RLS on, no grants.
- **`toneturn_drill_items_put(p_epoch text, p_items jsonb)`**
  - Takes an array of up to 300 `{id, state}`.
  - Upserts the caller's rows; rows over the size limit are skipped.
- **`toneturn_drill_items_get(p_epoch text, p_since timestamptz)`**
  - Returns the caller's rows of that epoch updated after `p_since`.
  - A fresh start (a new epoch) therefore never brings old items back.

### 3.2 Client

`src/cloud/drillSync.ts`, with the pure merge in `src/storage/drillMerge.ts`.

- **Marking changes.** Every saved item is marked dirty in localStorage (`toneturn.drillDirty.v1`). This happens in `recordDrill`, `setDrillItem` and the coach's stage/ceiling marks.
- **Push.** Signed-in only, of the dirty items (batches of 300):
  - 15 s after the last change;
  - when the page is hidden;
  - at sync.
- **Pull.**
  - At sync (app start, sign-in) and when the page becomes visible after 5 minutes away.
  - Only rows updated since the last pull of this epoch (`toneturn.drillPulled.v1`), minus 2 minutes of overlap.
- **Merging pulled rows.** Pulled rows are merged into the local items one by one and saved. The rows a device pushed come back to it unchanged, so merging is idempotent.

### 3.3 Merge rule (`mergeItem(a, b)`, pure)

- **The base.** The copy with more takes (a tie: the later `last`).
- **Taken as the maximum:** cleanBpm, takes, activeMs.
- **Taken as the union:** stages.
- **history and passLog:** the union by (at, bpm), sorted, capped at 200.
- **channels:** the per-channel maximum of each count and best.
- **ceil:** the lower nps if both are within 30 days, else the newer one; cleared when the merged cleanBpm × the item's notes per beat is above it.

### 3.4 Never synced

Device settings stay on the device. Takes and recordings keep their own rules.

## 4. Tests

- **Unit:** stepQuality and the step sizes; the challenge's eligibility, draw, guarantee, jump, clean and miss outcomes; ceiling recording.
- **The simulator** (three days, new keys) still passes. A session with a strong player has at least one challenge, and step sizes vary.
- **Merge:** union, maximum, tie-break, epoch, idempotence.
- **The sync client** against a mock backend: dirty → push → cleared; pull → merge → saved; a failed push stays dirty.

## 5. Review 1 (2026-11-26): corrections

An independent review found the following, and each is now built.

**Sync**
- **Pull before push, and a guarded put (migration 20261212000000).**
  - Each pushed item carries `base`, the row's updated_at as this device last saw it.
  - The server writes only rows that are absent, belong to an older epoch, or are not newer than `base`. It returns the accepted rows with their new updated_at.
  - A refused item is pulled, merged and pushed once more.
  - The result: a device's first sync, or a stale copy, can never overwrite newer takes from another device.
- **Bookkeeping per scope** (the epoch plus the account): pulled-at, the seen versions, and the first full upload.
- **The store serializes drill writes.** Takes, item saves and merges go one at a time. A take or item built on a copy from before a merge (fewer or equal takes than the stored copy) is merged with it, never written over it.
- **Merge rules:**
  - history keeps one entry per day, the higher tempo;
  - passLog keeps the ladder's 60;
  - a full tie (takes and moment) goes to the same copy on both devices, by a stable key-sorted text;
  - a ceiling carries its notes per beat (`npb`) and is cleared only at it.
- **Items over 30 K characters** stay on the device and leave the dirty list. A failed drill sync shows as a sync error.
- **The server's row limit** is 5000 per player.

**Climb**
- **"Near best" uses the best as the session began.** `bestAt` is set per comfort kind at the start, so the take just played no longer halves every step.
- **Any clean take at or above a ceiling clears it.** This applies to the session's ceiling and the item's. A missed challenge above a ceiling that is already passed replaces it.
- **Challenges come only on a repeat of the same task.** This means the next take of the same stage and item, so in practice the speed stage. A coordination stage passes on one clean take, and a challenge on a task met for the first time would be too much at once. This replaces "on a pulsed stage" in §2.1.
- **The tempo bar shows "Challenge"** on a challenge take.
- **`dayStart` is per session.** A second session the same day measures its 25 % from its own first take.

## 6. Review 2 (2026-11-26): corrections

**Stale copies never undo a merge**
- **A device-local revision (`rev`).** A merge from another device stamps `rev` on every item it changes.
  - A take or item save built on an older revision is merged onto the stored item. The save's own tempo and goal are the base; the rest is the union.
  - This replaces the takes-count check.
  - `rev` never syncs and is ignored when comparing.
- **Every whole-progress write in the store** (`saveProgress`, rewards, results…) runs in turn with the drill writes and takes the drill items as stored at that moment. Those writes never change drill items.
  - The fresh start alone replaces them (`saveProgress(p, true)`).
- **The screen's progress follows a merge at once,** not only after the push.

**Server (migration 20261213000000)**
- **Epochs only move forward.**
  - A push from an older epoch never replaces a newer-epoch row.
  - A newer epoch replaces an older one.
  - Within one epoch, `base` decides as before.
  - A put of a newer epoch deletes the player's older-epoch rows.
  - The 5000-row limit counts the current epoch only.
- **The pull pages:** rows after an (updated_at, item_id) cursor, 500 per call, until a short page.

**Smaller fixes**
- **Ceilings:** in a merge, ceilings the merged clean tempo already reached are dropped first (with 2 % for the item tempo's rounding), then the lower one is kept.
- **The first challenge** may come from the first eligible take. The six-take gap counts only from the last challenge.
- **The sync timer** keys on the account id, not the user object.

**Noted, not changed**
- A missed challenge still goes into the item's own ladder and rating like any take. The item records what happened. "Nothing counted" in §2.4 means the coach's counters: no step back, no limit, no "almost".
- Signing in to another account on a device uploads that device's drill items to it, as lesson results already do.

## 7. Review 3 (2026-11-26): corrections

- **Whole-progress saves give the caller what was written.** `putProgress` sets the caller's object's drill items to the stored ones before writing. A screen that shows its own `next` therefore never rolls back a take or a stage mark.
- **The background sync never sets the screen's progress from a copy loaded outside the store's turn.** Merges reach the screen through `onMerged`. A sync asked for while one is running runs once more after it, including the push when the page hides.
- **A missed challenge under the item's own best clean tempo is today's ceiling only.** The item keeps only ceilings above its best, which the merge would otherwise drop.
- **Known and older than this change:** non-drill writers (results, rewards, sessions) read the progress before the store's turn, so two of them racing can still lose an XP or count update. Drill items are protected. Moving them to an update-function write is on the list.

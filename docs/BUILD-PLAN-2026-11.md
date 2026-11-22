# The build plan for the six specs of 2026-11-22 (one source of truth)

**What it covers:** SPEC-KEY-SESSION, SPEC-DAILY-WORKOUT, SPEC-RBI-ROTATION, SPEC-LICKS-IN-IMPROV, SPEC-PRACTICE-IA-3 and SPEC-EAR-AND-READING.

**How it was made:** an independent cross-review on 2026-11-22 found contradictions, double work and gaps; this page resolves them. Where a spec and this page disagree, **this page wins**.

## 0. Decisions

### 0.1 The owner decides (product / learning)

| # | Question | Recommendation |
|---|---|---|
| D1 | **What "closed" means**, for every item, key, lick and piece. Today there are 6 different rules. | **Closed** = 3 clean takes at 95% or more of the target, on 2 different days (the existing technique rule, `itemPass`). A single take at the target = "almost". A pass at the starting tempo (the coach moving a beginner on) = "learning". |
| D2 | **The day's time vs the path.** The current daily workout gives about 22% to new path steps. The 70/30 split did not mention them. | Step 1: about 20% of the window to new material from the path. Step 2: the rest splits 70/30 between technique and improvisation. Maintenance (15–20%) sits inside the technique share, lick reviews included. "By ear" is not a time share; it is a channel inside every exercise (SPEC-EAR-AND-READING). |
| D3 | **The key of the day.** "Weakest first" spreads over many keys, while improvisation and the sight dose want one key. | The key of the day = the key of the week. Improvisation, the sight dose and language in the key are in it. The technique block takes about half its cells from the key of the week and the rest weakest-first from all the keys. |
| D4 | **One status ladder** (today: stars, pp–ff, Learned / In my language, %). | new → learning → almost → closed (one key) → in all 12 keys → **in my language** (used in improvisation in 3 sessions and 2 keys) → **in the fingers** (passed from memory). One ladder for exercises, licks, Encore phrases and pieces (each stopping where it makes sense). |
| D5 | **Scope of the first version** (to avoid overload). | §3. |

### 0.2 Decided without asking (technical)

- **The lick pool:** any take (owner). Spaced review starts once the lick is closed in one key. Until then, a use in improvisation counts as practice, not as a review.
- **One take event for everything:** `{itemId, unit, channel, bpm, verdict, activeMs, at, sessionId, source}`. These are all views computed from it:
  - time per cell;
  - the lick usage log;
  - the channel profile;
  - the mode × function map.
- **One need ranker and one spaced scheduler** (the FSRS in fsrs.ts, generalised to any unit: cell, lick × key, mode × function, piece, phrase).
- **One harmony timeline** (beat spans: chord, function, target, scale, sub). It serves:
  - rule-based improv (subs, the lead sheet);
  - "the lick over the right chord", including the tritone-sub equivalence;
  - Repertoire charts.
- **One note classifier** (chord tone / tension / colour / avoid / passing / approach / enclosure), extending what exists in improvRules.ts. No separate detector for approach cells.
- **One vocabulary type.** The line families (k-bebop, k-vocab, jazz, k-harrisline) become sources of licks (`Lick`) played through the lick engine. Their levels stay as wrappers for the path and the level test, so progress doesn't split in two.
- **One per-key model.** The matrix (keyMatrix) feeds the key session, the key pages and the key of the week. The old `keySession` and the separate measure in `pickWeekKey` are retired.
- **One player profile store:** the channel profile, the mode × function map, the ceilings per rung per key, lick usage, the tilt reasons. This is the same "player profile" as the AI spec.
- **The plateau:** a cell left at the player's limit gets "ceiling for now" and a cooldown (it won't be served again for 3 days), so the projection converges.
- **Block letters:** the code's naming (A scale, S spine, B other forms, C licks, D fingers/hands, E cadences, F jazz, G language) replaces SPEC-KEY-SESSION's letters.
- **The skill map:**
  - The "by ear" and "reading" sections keep their families as their *content* (the level test and the workout read them). Their *value* on the radar is computed from takes by channel.
  - The licks family goes into the improv section.
- **Transcription:** the graded coach becomes the "steps for the ear", and every lick gets two modes (from the page / by ear) (owner, 2026-11-22). "Transcribe a phrase" sits on the piece page in Repertoire.
- **The channel when there is a demo:** a coached take after a demo counts as "page-known" or "ear-known", never "sight" or "fresh". Sight reading is measured only in the sight dose and in reading exercises, which have no demo.
- **Bug:** the matrix cache key (`shapeCache` by the number of families) changes to the families' ids.

## 1. Build order (each phase ships on its own)

| Phase | Contents | Depends on |
|---|---|---|
| **1. Foundations** (almost no new UI) | one status function (D1) across coach, key pages, matrix, stars and licks; the take event with `channel` and `activeMs` (recorded, not yet shown); FSRS for any unit; the cache fix | the decisions |
| **2. One today** | the matrix feeds the technique block of the daily workout (D2, D3); the private "today" on the technique screen is removed and becomes "part of today's workout"; the coach's session length = the block's minutes; the plateau cooldown; resuming at the cell; a 180-minute window | 1 |
| **3. Practice reorganised** (can run in parallel with 2) | the merged Repertoire (list, piece page, "Add a piece", redirects); Licks with Mine and Challenges; Charts and Improvise for every player; the sidebar with children; tools as a strip; the log to Progress; one status word; "continue where I stopped" | 1 |
| **4. Vocabulary** | the line families as lick sources (block G, language in the key); the pool (any take); two modes per lick + the steps for the ear; the usage log from the take event; detector upgrades (timing, sub equivalence); the cards "a lick every 4 bars" and "today's lick"; the mark in the debrief; "in my language" | 1, 3 |
| **5. Improvise + RBI v1** | Phrase / Vary / Trade record results; the harmony timeline and the note classifier; scale rotation at T1–3 with the T1–2 subs; the lead sheet in colour (+ a letter); colour coverage; the improvisation share in the workout | 2, 4 |
| **6. Channels, visible** | the "by ear" and "reading" axes from channels; presentation by mastery (fading the notation); the daily sight dose; the two 1–5 self-ratings when choosing an instrument; the two checks in the level test; the adaptive weekly mix | data from 1 |
| **7. Matrix breadth** | Aeolian inside major (the same cells, from the 6th degree); guitar and bass ladders; then melodic minor and modes from the root | 2 |
| **8. Extras** | measured time and the projection; the AI tilt; the Harris track; "the combined sentence", reverse recognition, transpose by ear; the "varied" and "new key" cards; share cards | — |

**Guard tests go with each phase:**
- every old route lands in the right place;
- ids are kept;
- one phone screen, in Hebrew and English;
- everything-connects (XP, league, path, level test, workout) for every new activity.

## 2. Gaps to define during the build (not now)

- **Ladders for guitar and bass** (phase 7). For drums there are no keys, so the 70/30 split becomes technique / grooves-fills-trading.
- **The level test:** how it sets the tier and per-rung start tempos. The two channel checks will fit its rules (one take per step).
- **Storage:** the take events go to IndexedDB on the device with a size limit, and summaries sync.
- **Hebrew wording** for the mode names and the Harris track. A screen-reader reading of the lead sheet.
- **The improvisation screen on a phone:** 8 bars, scale names, the next chip, the rule. The rest (the keyboard) behind a button.

## 3. The first version: in and deferred (D5)

**Now:**
- major and harmonic minor (+ Aeolian in major);
- four channels: sight / page-known / ear-fresh / unaided;
- RBI track A at T1–3;
- the lick cards: "every 4 bars" and "today's lick";
- one default view (weakest first + the key of the week) with the other views in a menu;
- the projection only on the Progress page.

**Later:**
- melodic minor and modes;
- "concept" separate from "memory";
- T4–5 and Coltrane, the avoid-note grader, the Harris track;
- "varied" and "new key";
- the combined sentence;
- the AI tilt.

# Re-audit (measurement): SPEC-HOLISTIC-2 (HOL) + SPEC-SPIRAL v6 (SP)

2026-11-27, read-only. I checked the specs against the code at HEAD 36bd00a0.

**Verdict: not OK yet.** HOL answers every audit item on paper, but 4 blockers make §1 unbuildable or self-defeating as written. There are also 9 major issues, mostly unreconciled rules. All of them can be fixed in the text in one round.

## 1. Coverage

### Top 15

| # | AM item | Status | What is still needed |
|---|---|---|---|
| 1 | One level semantics | partial (§1.1–1.3) | The content tier is undefined (B1). Missing: how areas combine into the rank and the course level, and the mapping to pp…ff (M3). tiers.ts `playerTier` and SP A8 are not reconciled (M2). |
| 2 | Cold beyond itemPass | partial (§1.2) | Not yet moved to cold readings: path technique ✓ (warm, 3 keys), the stretch tierUp/tierDown, the end-screen "improvement" graph (sessionReward.ts:147), Momentum `statusUps`/`rating`, AI coach/profile inputs, the teacher digest. The history/snapshot change needs a sync migration. |
| 3 | Instrument Elo | partial (§1.4) | The scale units of "tier + tempo offset" are undefined. "Per session" can be gamed (M5). Old events keep their tempo difficulty, so a refold or fresh start is needed. |
| 4 | Ear course level | **contradicted** (§1.5, Q1) | B3 |
| 5 | Rewards | partial (§2–3) | Q2 is OK. The Q3 cold "record" almost never fires (B4). The Q4 bonus has no unit (push is a factor, and sessionReward.ts holds no XP); it belongs in momentum `BONUS_XP`. Q6 tests XP only, not Momentum. |
| 6 | Lapse-aware maintenance | partial (§4.1) | `cellDue` builds FSRS from `passLog` days (clean takes only), so it must replay `cold[]`. The cell → item grade (RH/LH/HT) is undefined. "Silver" already means 30-day stale on the path. |
| 7 | Ear E1 | covered (§4.2) | |
| 8 | Uncertainty/decay | partial (§1.6) | A fixed +1 tier/60 d is not Glicko. The Elo ratings, which the Ear path frontier reads, still never decay. It conflicts with phase A's 60-day window (M1). |
| 9 | Need model | partial (§5) | The product form zeroes new items (M6). `recommend.ts` can't be retired: TOPICS, `placementUnlocks`, `topicProgress` and `modesLevelFor` are used in 6 files. Only `recommendFor` can fold in. |
| 10 | Psychometric model | covered (phase B) | It inherits B4. |
| 11 | Validation | covered (§9) | §9.2 gates every number on reliability ≥ 0.7, yet §1.3 shows phase A before any validation. Exempt phase A explicitly. |
| 12 | Input awareness | partial (§1.7) | "Best series" is a gaming hole (M7). Per-input noise → thresholds (§9א, BLE jitter) is absent. `RatingEvent` has no `src`. |
| 13 | LR beyond technique | partial | Cold flags only. No shadow A/G/R for Ear, rhythm or voice in §16. |
| 14 | Goals, plateaus | partial (§6) | The plateau slope is on discrete tiers (M8). §6.2 drops the coach cooldown that SP §5 keeps (M9). The projection has no basis before G exists (needs a prior). A goal tune has no completion criterion: use learn-a-tune step 7, passed cold. |
| 15 | Self-assessment, transfer | partial (§7) | No feed into the Ear rating. The transfer-index formula (relative tempo? cold?) is undefined. Let the tap be a MIDI key or voice, to stay hands-free. |

### Other rows of the original report

| Row | Status |
|---|---|
| Games, voice and piece retention (§3.5); confusion map and RT (§3.2); guess floor; quests vs plan; teacher precedence; visible goal; league effort-only | covered |
| Tendencies → next take | partial (SP A4 LH visit only) |
| Weekly profile patterns → planner; latency jitter → thresholds; Momentum → AI plan; teacher notes/rubrics → need weighting | **missing** |
| Reading complexity | partial: features named, no weights, no build step |
| Mic learners lack the dynamics/pedal strands | **missing**: exclude them from the mic learner's level and label it |
| Tone/posture stated as unmeasured in the semantics | partial (§12.1 rubrics) |
| Path technique ✓ warm; "opened" needs a later-day confirmation before the strengthen pool | **missing** |
| Screens disagree on "next" | partial: reason lines, but no cross-screen rule |
| Re-entry after a break | covered, but HOL says 7 d where SP §17.2 says 10/21 d. One table is needed. |
| Self-comparison line in every area | **missing** (SP §17.5 is technique only) |

## 2. Critical review

### Blockers

**B1. The content tier is tempo again.** §1.1 uses "its tier in `tierBounds`". But tierBounds.ts maps notes per second to T0–T8 (the ABRSM speeds), and `itemTier()` comes from the item's target tempo, so a slow, hard voicing is still low-tier: exactly AM #3's defect. `LevelDef` has no content field. The usable content signals are `LadderRung.min` (keyIndex.ts) and the SP §14 entry bands.
- **Fix:** a `contentTier` on LevelDef, seeded from those two and hand-set elsewhere.
- **Fix:** a lexicographic order (content first, then band) for the voice, rhythm and reading products, which have none.

**B2. Phase A ignores misses, so it does not estimate P ≥ 0.7.**
- "≥ 2 clean cold takes on ≥ 2 days in 60 days": at true p = 0.4 with 6 cold attempts, P(promoted) = 0.77. That fails §9's < 5 % wrong promotions.
- A clean take at the *start tempo* of a hard item counts too. Open it (no locks), play it slowly twice, and the rank jumps above every passed item, which breaks "rank = hardest items beaten".
- The converse: SP §4.2 passes an item on *one* cold take, so a passed item may not count toward the level.
- **Fix:** tier evidence = items with `passedAt` at that tier. Then require cold confirmation at ≥ 0.95 × target: ≥ 2 clean and a clean share ≥ 2/3 over the last ≤ 6 cold takes, with k-of-n tuned in the §9.1 harness. Keep `playerTier`'s ≥ 2-keys breadth.

**B3. The Ear fix keeps the contamination, and its guard test will fail.**
- `drillEvents` tags drills with a second skill at w 0.2–0.5: `timing` (every evenness drill), `meter`, `chords`, `cadences`, `form`, `dictation`, `rhythm-dictation`. All of them are in `EAR_SKILLS`.
- Since w ≥ `MIN_UPDATE_W` (0.15), those skills move, at the drill's tempo difficulty. Reading only EAR_SKILLS therefore still moves the Ear level and the Ear Index from scales.
- `EAR_SKILLS` also lacks `theory`, `notes`, `rhythm-reading` and `transpose`, so the fix would drop the theory and exam-prep evidence.
- **Fix:** keep drill and lick ids out of the Ear course skills, or route that credit to instrument subs. Define `EAR_COURSE_SKILLS`. Guard test: a drill take changes no Ear course skill.

**B4. The cold series is engine-chosen and anchored to the warm best.**
- The cold check plays at `tempoOf` ≈ 0.94 × `cleanBpm` (the warm max), or at max(start, 0.95 × target) near the target (SP §2.5). So a cold take only answers pass/fail at a tempo derived from the warm peak, and nothing above the target is ever seen cold.
- Results: cold records (Q3) and Momentum "cold rise" almost never fire; SP G partly tracks the warm best; the §6.2 slope is flat by construction for passed items.
- **Fix:** a cold staircase. The cold tempo moves from the previous cold result, while the 0.95 × target floor stays for passing. Phase B needs this cold nps threshold anyway.

### Major

| # | Issue | Fix |
|---|---|---|
| M1 | Three decay behaviours: phase A's 60-day window drops the level; "refresh" is shown; §1.6 widens the range. The first contradicts promotion-not-full-bars. | The level never falls from inactivity. Use "refresh" + the range + a probe. It falls only on failed cold checks (B2). Owner question. |
| M2 | Three tiers: `playerTier` (warm, and it drives the timing tolerances), the SP A8 area tier, the HOL level | One function |
| M3 | No aggregation from area to rank, course DYN or friend level; "bar to next" undefined | Rank = the max (or 2nd-best) area level. Bar = cold confirmations toward the next tier. |
| M4 | Phase A is technique-shaped and undefined for trial data. Ear's "per contrast" cold needs a contrast id, but `RatingEvent` has no item/contrast/`src` field. | SPEC-EAR-INTELLIGENCE governs the Ear level. Add `item`/`src`/`cold` to the event (synced → migration). |
| M5 | "One event per session" can be gamed by restarting; session ids differ across runners | One event per item per 1 h cold window |
| M6 | `need` is a product, so a new item (P(forgotten) = 0) is never chosen; the units clash | The workout2 shares stay as quotas. Inside them, a weighted sum of normalised components that absorbs SP `back2` and the refresh probe. The rotation set follows need order. |
| M7 | "Best series" lets the lenient input set the level | Show the current input; the other one as a note. |
| M8 | The plateau on discrete tiers fires constantly | Use a continuous cold measure (B4). Exclude passed and fixed-tempo items. |
| M9 | §6.2 replaces the coach cooldown that SP §5 keeps; the sentence is garbled | Replace plateau.ts only, and state the precedence. |

### Minor
- Exclude ~feel, burst and link takes from the tiers.
- The level test can't meet the "2 days" rule: show "placed, to confirm".
- Voice and rhythm cold units have no fields yet.
- Write `cold` into the event at creation (refolds), and dedupe across devices.
- Q6 must also fail a "cold checks only" player who out-earns real practice.
- §6.1's Autumn Leaves (1945) example can't be served as a melody.

### Thresholds that look arbitrary

| Threshold | How to set it |
|---|---|
| p* 0.7, k-of-n, 60 d | Harness + trace noise: < 5 % false promotion at the lowest delay |
| Cold windows (1 h, 8 h, 5 trials, 3 items, 2 takes) | The warm-up decay curve per modality from the traces |
| +1 tier/60 d ±2; breaks 7/10/21 d | Per-user FSRS stability or SP R by gap |
| Plateau 6 points / 10 days | A power calculation: the cold-measure SD vs the minimum slope worth acting on |
| Reliability, 1-in-10 prompts, voice 30 d, games 60 d, 20 min of singing | Keep as provisional constants; re-fit after shadow mode |

## 3. New findings
1. Drill secondary tags inflate the Ear skills, the Ear Index, the path frontier and the skill map today (B3).
2. The cold check is anchored to the warm peak, which undermines SP's G, R and the plateau too (B4).
3. Three tier definitions; the timing tolerance follows the warm `playerTier` (M2).
4. The end-screen graph reads the warm "best of the last 10". Label it "today's best", and prefer the SP §4.3 cold comparison.
5. Quests and Momentum count rating events, so fewer drill events silently change the drum "rhythm 5×" quest and the Momentum `rating` gain.
6. The AI coach, the weekly profile and the teacher digest are not on the reader list. They must get cold series.
7. The new synced fields need a migration. No users yet, so a fresh-start epoch is the clean path; say so in §16.
8. SP §15.4 "no new cold best" contradicts A9 "no new clean session peak". Edit §15.4.

## 4. Remaining fixes

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | B3: Ear course skill set, drill tags out, guard test | H | L |
| 2 | B2: phase A on passed items + cold clean share, tuned by simulation | H | L–M |
| 3 | B1: `contentTier` on LevelDef + ordering rules | H | M |
| 4 | B4: a cold staircase feeding Momentum, G and the plateau | H | M |
| 5 | M1 + M3: decay policy and aggregation (owner question) | H | L |
| 6 | M2: one tier function | M | M |
| 7 | M5, Elo units, refold or fresh start | M | L |
| 8 | M4: event fields; Ear governed by SPEC-EAR-INTELLIGENCE | M | M |
| 9 | M6: quotas + additive need; the `recommend.ts` scope | M | M |
| 10 | M8 + M9: plateau measure; keep the cooldown | M | L |
| 11 | Q4 unit and location; Q6 covers Momentum | M | L |
| 12 | `cellDue` from `cold[]`; cell grade; a lapse visual distinct from stale | M | L |
| 13 | M7: current-input display | M | L |
| 14 | Missing rows: path ✓ later-day; profile/teacher/jitter signals; self-comparison everywhere; mic strands | M | M |
| 15 | One break table; the §9.2 vs phase-A gate; shadow LR for Ear, rhythm and voice | L–M | L |

**Ready when:** B1–B4 and M1–M9 are written into HOL v2 (plus the SP §15.4 edit), and an independent spec-only round finds no new blocker.

# Re-audit round 2 (measurement): HOL §17 v2 + SP v6

2026-11-27, read-only, checked against the code at HEAD 36bd00a0.

**Verdict: not OK yet.** §17 answers every R2 item. But the new cold staircase (B4) clashes with the confirmation rule (B2), the lapse grading (§4.1), the drop rule (M1) and SP A12. `areaTier` (M2) changes the tier's units under three code readers. Both need one more text round. Nothing calls for a redesign.

## 1. Coverage of R2

| R2 item | Status | Note |
|---|---|---|
| B1 content tier | partial | `LadderRung.min` is set per (level, option), not per level. Examples: `b-scale-6` is 1 or 3, `b-chord-4` is 0 or 2 (keyIndex.ts:414–417). So `contentTier` must live on `SpecTemplate`/option, not `LevelDef`. Scales and arpeggios have flat content, so their level would ignore tempo, which contradicts SP A8 ("scales: tempo"). The reading features are summed with no normalisation. |
| B2 phase A | partial | Misses are now counted. But the rule is checked after every cold take. Simulated, "≥ 2 clean, share ≥ 2/3 of the last ≤ 6" promotes a true p = 0.4 learner 38 % of the time within 6 cold takes, and p = 0.3 23 % of the time. The target is < 5 %. The "≥ 2 days" condition was dropped. |
| B3 Ear skills | partial | It also removes real ear evidence. `k-ear`, `g-ear` and `b-ear` (intervals, dictation, `transpose`, tonic) tag Ear skills at w 0.5 (events.ts:99–147). §17.3's self-prediction "feeds the Ear rating" from a drill take, which breaks B3's own guard test. |
| B4 cold staircase | **contradicted** | See §2.1. |
| M1 decay | partial | §1.3's "last 60 days" level rule is still in the text. The drop rule has no hysteresis. |
| M2 one tier | partial | Units: see §2.2. |
| M3 aggregation | partial | `DYN` has 6 names, pp…ff, with no fff (courseSocial.ts:98). The T0–T8 → DYN mapping is undefined. A "2 of 3" bar doesn't fit a variable k-of-n. "Instrument area" is undefined. |
| M4 event fields | covered | |
| M5 1-h window | partial | Its scope is unstated: applied to Ear trials it would throttle them. With no cold take, the window's first take is warm and still feeds the Elo. |
| M6 need | partial | Readiness must be a gate, not a 0.1 term (SP §15.5, A10). Normalisation is unstated. Unclear which component carries `back2` for unpassed items, which have no FSRS. |
| M7 input | covered | Minor: the rank and friend level follow the current input, so switching to the lenient input raises them. |
| M8 plateau | partial | Passed non-anchor items are capped at target (SP §2.5/A5). Their staircase goes flat, which gives false plateaus. |
| M9 | covered | |
| Minors: feel/burst/link excluded; level test "to confirm" | covered | |
| Minor: voice/rhythm cold fields | partial | Event fields exist. There is no per-item cold store like `ItemState.cold`. |
| Minors: cold at creation; Q6 cold-only player; Autumn Leaves | covered | |
| Minor: cross-device dedupe | **missing** | `lastQual` is per device until sync, so two devices can each record a "cold" take. |
| Row: tendencies → next take | missing | |
| Rows: signals into need; mic strands; path ✓ later-day; one "next"; break table; self-comparison | covered | |
| Row: reading complexity | partial | No normalisation and no build step in §17.6. |
| Row: tone/posture stated as unmeasured | missing | |
| Top-15 #3 Elo | partial | §2.3 |
| Top-15 #8 decay | partial | The Elo (Ear frontier) still never decays. Defer it explicitly to SPEC-EAR-INTELLIGENCE. |
| R2 new finding 5 (quests/Momentum counts) | partial | The drum "rhythm 5×" quest and the source of `GAIN_WEIGHT.rating` after the B3 rerouting are unstated. |
| Fixes 1–4 | partial, as B3, B2, B1, B4 | |
| Fixes 5, 6 | partial, as M1/M3, M2 | |
| Fixes 7–11, 13–15 | covered | |
| Fix 12 (cell grade, lapses) | partial | Not every cell has an HT item (guitar, bass, one-hand levels). |

## 2. Critical review

### 2.1 Cold staircase (blocker C1)
1. **It blocks passing.** SP §2.5 jumped the cold check to 0.95 × target once the warm `cleanBpm` reached it. B4 drops that branch after the first cold result. A staircase starting near the normal start (≈ 0.6–0.75 × target) climbs one mark per cold take, which is about one per day. So it takes 8–12 days before any cold take can reach the pass floor. **Fix:** cold tempo = max(staircase, round(0.95 × target) when `cleanBpm` ≥ 0.95 × target) for unpassed items.
2. **The above-target staircase breaks three rules.** Up 1 on clean, down 1 on a miss converges to ~50 % clean. Above target, that misses about half the cold takes. §4.1 grades a miss as "again", so it creates false lapses and "refresh" marks. B2's confirmation share falls below 2/3, and M1's drop rule then drops the tier. A planned measurement probe ends up demoting the learner. **Fix:** a miss above target is censored, so it is not a lapse and not a confirmation miss. Use 2-up-1-down, which tracks 70.7 % ≈ p*.
3. **It contradicts SP A12**, which says G never uses the coach-chosen cold tempo. B4 makes G read it. Amend A12, and estimate from the staircase threshold (the mean of the last 4 reversals), not its position. A ±1 mark step also caps the measurable G (ceiling): use 2-mark steps until the first reversal.
4. **The cap.** The SP §2.5 "over cap" is computed from the session's warm `limit`, and only the anchor may exceed target (A5). Define a cold cap, e.g. min(item cap §15.3, 1.25 × target), for anchors only. Non-anchors stop at target and are excluded from the plateau.
5. **Gaps.** The key-session cold check (SP §3, max(0.9 × best, 0.95 × target)) is not replaced, so it is still warm-anchored. Fixed-tempo items are not excluded from the staircase.

### 2.2 `areaTier` units (major C2)
`playerTier`, `itemTier`, `tierTiming`, SP §15.5 entry ("band ≤ area tier"), A3 (beginner = band 1) and stretch `tierUp` (itemTier ≥ playerTier + 1, stretch.ts:102) are all **tempo** tiers. M2 makes `areaTier` a **content** level. Three effects:
- a fast player of simple content becomes a "beginner";
- `analyze.ts:838` tightens the timing limits on slow, hard items;
- a promotion tightens the tolerance, which lowers the clean share and drops the tier: a feedback oscillation.

**Fix:** `areaTier` returns {content, band}. Entry, beginner and tolerance read `band` (the take's own nps tier, capped by band). The level and rank read `content`.

### 2.3 Elo formula
600 + 100·c + 40·(band − c) clamped means a T8 scale with c ≈ 1 tops out near 780, below a slow T2 voicing. That is right for a level, wrong for a technique Elo. The phrase formula (1200–1960, events.ts:14) is not mapped, and the `RL` +60 is dropped silently. No reader is named once DYN comes from §1. **Fix:** name its consumers (or retire it), give scales/arpeggios c = their nps tier, and fit 100/40 by a logistic fit on the calibration traces.

### 2.4 Phase A, the drop rule and `passedAt`
- Tier evidence = passed items: consistent with "passed stays passed".
- Promotion and demotion use the same window, so the level oscillates. **Fix:** promote on a sequential test (SPRT p0 0.5 / p1 0.85, α 0.05), keep ≥ 2 days, demote when the clean share < 1/2 over ≥ 4 takes on 2 days. Delete §1.3's 60-day level clause explicitly.

### 2.5 Gaming holes
1. **Warm-up laundering.** "Slower", burst, challenge and coordination takes don't touch `lastQual` (SP §4.1, §3: A-4 = A-6). Nor do the RH and LH items of the same cell. So a learner can warm up and then take a "cold" take. **Fix:** cold = ≥ 1 h since any sounding take of the item or its cell. Log `sessionMs` on the cold entry.
2. **Promotion farming.** Drop deliberately → re-promote → `promotion` +100 (limit 2 a week). **Fix:** pay only above the all-time high-water mark. Likewise, a Momentum "cold rise" is a new staircase high, not a +1 step.
3. **Lenient input** for rank (M7): the rank and friend level should read the stricter calibrated input.
4. **Q4:** +15 for any plan length. Require `sessionBonus`'s planned length, and add `WEEKLY_LIMIT.plan = 7`.

### 2.6 Thresholds and how to set them

| Threshold | Method |
|---|---|
| k-of-n, SPRT bounds | §9.1 harness with sequential looks and a realistic prior over passed items; < 5 % false promotion |
| Staircase rule and steps | Levitt target = p*; step = the trace SD of the cold tempo |
| Elo 100/40, ±2 | Logistic/Rasch fit on the traces |
| Need weights 0.4/0.3/0.2/0.1 | Replay the traces: predicted vs realised cold gain; re-fit after users |
| Plan +15 | Smallest value that passes Q6 |
| 2nd-best rank, DYN mapping | Owner (product) |
| Breaks 7/10/21, 1 h, 8 h | R-by-gap curves from the traces |

## 3. Fresh eyes
- **The area list per instrument** is needed for "2nd-best area".
- **Step 1 must include the §9.1 harness,** because B2 is tuned there.
- **Ear:** check that HOL §1.2's cold rule matches SPEC-EAR-INTELLIGENCE.

## 4. Prioritised fixes
1. **C1:** keep the 0.95 × target probe branch; censor above-target misses; 2-up-1-down; cold cap; amend SP A12; replace the SP §3 cold check; exclude fixed-tempo items.
2. **C2:** `areaTier` = {content, band}; tolerance, entry, beginner and `tierUp` read band.
3. **B2:** a sequential promotion test with ≥ 2 days, demotion hysteresis, the harness in step 1, and delete §1.3's 60-day clause.
4. **Warm-up laundering:** an item/cell-wide gap and `sessionMs`.
5. **B3:** whitelist the `*-ear` drill families into the Ear skills (by trial difficulty), and route self-prediction to its own skill.
6. **B1:** `contentTier` per spec/option; scales use their nps tier; normalise the reading features.
7. **M3:** an explicit T → DYN table, the area list, and a bar that matches the test.
8. **Minor:** promotion high-water mark; M5 scope (instruments only, cold events only for the Elo); readiness as a gate; cell grade without HT; cross-device dedupe; Q4 limit; Elo consumers; quest/Momentum sources; tone/posture line.

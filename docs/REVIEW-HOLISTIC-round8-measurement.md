# Round 8: measurement / adaptivity review (HOLISTIC v9 + SP v6)

**Verdict: NOT CLEAN** (2 blockers, 7 majors; all fixable in text)

## Substantive issues

**1. §1.7 rank rule, empty and sparse tiers. BLOCKER.**
Problem: keyless areas need "≥ min(3, available exercises at that tier)". When a tier has 0 available exercises, that is ≥ 0, so the tier is passed vacuously, and "highest tier" with high-water sends rank to it. This bites in two ways:
- The catalogue has no such tiers: `LadderRung.min` in src/engine/drills/keyIndex.ts only runs 0–6, and SP band 4 seeds "T6+" at T6.
- Exclusions empty tiers for some learners: a mic learner whose tier is all "needs MIDI", or a region-denied tier.

In keyed areas the opposite happens. A tier with fewer than 3 exercises can never be reached, and since entry is max(placed, rank)+1, a rotation-only learner stalls below it. T7–8 (ff) can't be reached anywhere, so "never full below Master" has no Master.
Fix:
- require ≥ 1 pass at the tier;
- skip tiers with no available exercises (not pass them);
- apply min(3, available) to keyed areas too, with keys = min(2, available keys);
- add contentTier 7–8 content, or cap the DYN table at the highest tier that has content;
- add a guard test that every area×instrument tier has ≥ 3 exercises, or is handled by the rule above.

**2. §1.7 / §1.15: "never falls" has no stored state. BLOCKER.**
Problem: §1.15 has no stored rank. If rank is derived from passes × the *current* `contentTier`, then re-tiering lowers rank. Things that re-tier:
- the reading weights are "fitted later";
- the quantile cuts are re-seeded;
- `contentTier` values are hand-set and can be edited;
- §15.1 re-targeting moves items.

Lowering rank this way breaks H8 and promotion-not-full-bars.
Fix: store `contentTier` (and the target) in the `passedAt` record at pass time, and/or a synced `rankHW` per area; state that rank = max(stored, derived).

**3. §1.6 reading tier pass: selection on success. MAJOR.**
Problem: "3 clean first-sight takes on ≥ 2 days" is a count with no denominator. The supply is unlimited and there are no locks, so a learner with p ≈ 0.2 at T6 reaches 3 lucky cleans in about 15 tries and keeps reading rank T6 forever. Also, §1.7 says reading uses `cellPass`, but §1.6/§1.15 define `cellPass` for voice and rhythm only, and the spec doesn't say what a distinct reading "exercise" is.
Fix:
- use a rate rule, e.g. ≥ 3 clean in the last 5 cold sight takes at the tier on ≥ 2 days, or a lower credible bound ≥ 0.5;
- define the reading exercise (generator × tier);
- add reading to `cellPass` or name its store.

**4. §1.6 / §1.7 / SP A1: what counts as a "distinct exercise". MAJOR.**
Problem: "spec + level/option, minus key and hand" doesn't settle three cases:
- **Hand-separate passes:** RH-only or LH-only items look like the same exercise as HT. §4.1 says the cell's grade is the HT item's, but rank doesn't say this, so three RH-only passes could give a tier.
- **Fixed-tempo variants:** SP A1 variants (voicing, inversion, seed, start degree) may be "options". SP A1 also lets a rung pass "today", in-session. Three variants passed in one session in 2 keys would give a rank.
- **Voice cents bands:** a voice cell = item × cents band. If bands count as distinct, one item sung at 60/45/30 ¢ makes 3 exercises.

Fix:
- exercise pass = the cell's main item (HT where it exists);
- fixed-rung `passedAt` follows the §1.6 2-day / later-day cold rule, and variants are not exercises;
- the cents band is removed from the exercise identity;
- add guard tests for all three.

**5. §1.7 current-form re-promotion stalls, and current form lags rank. MAJOR.**
Problem: the window is capped at 30 looks and the prior is Beta(1, 1), so P(p ≥ 0.7) ≥ 0.95 needs roughly p̂ ≥ 0.83:
- true p = 0.8: Beta(25, 7) gives P ≈ 0.87, which almost never triggers;
- true p = 0.85: about a coin flip.

So after a slump, a learner well above p* = 0.7 stays below indefinitely. Current form then tracks roughly p ≈ 0.85, not the p* it is defined by. The "day-dependence aware" adjustment, which isn't specified, only makes this stricter. Supply is about 0.3–1 look per area per day, so even filling the window takes 1–3 months. Also, nothing says current form follows a rank rise ("initialised as rank" only). After every promotion an improving learner would show "current form < rank", which reads as a slump.
Fix:
- on a rank rise, current form = new rank;
- re-promote on a posterior-mean or lower-bound rule matched to p* (e.g. P(p ≥ 0.6) ≥ 0.9, set by the harness), or drop the 30 cap for re-promotion;
- define the day-dependence correction (an effective-n design effect) or drop the word.

**6. §1.6 / §1.7: the posterior's population mixes learning with form. MAJOR.**
Problem: pass-probe cold takes of *unpassed* items at the tier are in the probe band, so they are confirmations, and misses included. A learner at rank T4 working on their 4th–6th T4 exercises fills the window with early misses. The slump rule then fires on progress, not decline, and the same rule drops `placedTier`.
Fix: measure current form on passed cells (plus established items) only, and keep unpassed-item probes for the staircase and threshold only. Or exclude cells younger than their pass from slump.

**7. §1.7 vs §1.3 / §5: who drives entry. MAJOR.**
Problem: §1.7 says the posterior drives "entry, need, spacing", but §1.3's entry is max(placedTier, rank)+1. §5 "Distance … at the cold level" doesn't name rank or current form. As written, a slump changes nothing adaptive except the label.
Fix: state one rule, e.g. entry base = max(placedTier, min(rank, current form + 1)), and have §5 distance read current form.

**8. SP A6 / §1.7: teacher targets inflate rank. MAJOR.**
Problem: a teacher's explicit `targetBpm` survives, and passes at any target count toward rank. A lowered target, or a self-made teacher studio, gives cheap tier passes.
Fix: a pass counts for rank only at ≥ the option's catalogue target. Otherwise it counts at the tier the tempo implies, or as coverage.

**9. §1.3 over-placement correction can cascade. MAJOR.**
Problem: "after 20 practice days without a pass at placedTier, drop one tier" has no counter reset. On day 21 the condition still holds at the new tier, so it drops every following day.
Fix: restart the 20-day count at each drop, and only count days on which items at `placedTier` were offered.

## Minor notes
- §1.7 / §5 say "daily cap … 2–4 per session": daily or per session? The spec also doesn't say whether FSRS review probes and pass probes outside the slots count as looks. If they do, slots only guarantee a minimum.
- §1.7 breadth (3 exercises in 2 keys) is a union over the exercises, which only the guard-test wording implies. Say it outright.
- If the window fails its breadth rule, no decision is made. Say so, and have the slot injector pick the missing exercise or key.
- §1.9 Momentum's high-water of a recency-weighted estimate pays occasionally on noise alone, as stationary records grow about √log n. Acceptable given the 1-SD rule; let the harness report the null pay rate.
- §1.9 staircase: the probe-band slots and FSRS-due takes take most cold takes on anchors, so the staircase trace is sparse. The harness should check that the threshold ever leaves "provisional".
- §1.3: an over-placement drop below band 2 restores beginner status (the D1 floor changes). State whether that is intended.
- Build: `ItemState` and `passLog` carry no `src`, contentTier, exercise id or cold flag today (src/engine/drills/types.ts:1080, ladder.ts `itemPass`). These are all specced as new fields, but a stable `exerciseId` derivation from `itemId` should be named.
- §3: a rank jump of several tiers. Does promotion XP pay per tier or once? Specify, under the Q6 cap.

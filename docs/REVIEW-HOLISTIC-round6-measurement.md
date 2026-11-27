# Round 6 measurement review (SPEC-HOLISTIC-2 v7 + SP v6)

## Verdict: NOT CLEAN

The core statistic is sound and its stated operating characteristics reproduce under iid looks. Four rules around it can still stall, be gamed, or rest on an assumption the harness hasn't been asked to test.

**Simulation** (my own, 20k runs; posterior checked after every look, partial windows from look 1; with prior Beta(1,1), promotion first becomes possible at 10/10 clean, and 26/30 is needed in a full window):
- false promotion at p=0.55: 1.3 % at 180 looks, 4.8 % at 730. At p=0.50: 0.9 %.
- false promotion at p=0.60: 21 % over 730 looks. At p=0.65: 59 %.
- median looks to promote: 80 at p=0.75, 26 at p=0.85, 182 at p=0.70.
- demotion over 8 looks needs ≤1 clean; over 30 looks, ≤10 clean.

So §20.1's numbers hold for independent, identically distributed looks. The issues below are what breaks that assumption, or what stops looks arriving at all.

## Substantive issues

**S1. Day-correlated looks double the false-promotion rate. (§20.1, §9.1) Major.**
- **Problem:** up to 6 looks a day come from one sitting, so they share day form, warm-up and fatigue.
- **Simulation:** I added a day random effect on the logit scale (5 looks a day, true p=0.55). False promotion over 730 looks became:
  - 10.7 % at day SD 0.5;
  - 20.8 % at day SD 0.8.
- Learner heterogeneity across cells (3 cells, cell SD 0.5–1.0) gives 13–20 %.
- **Why it matters:** the "about 98 % right over two years" figure quoted to the owner in §20.5 is optimistic by a factor of 2–4. Rank is permanent.
- **Fix:** require the §9.1 harness to include day and cell random effects, with the SDs estimated from the calibration traces. Then do one of the following:
  - model the day as the unit (a beta-binomial with overdispersion, or a cap of about 2–3 looks a day);
  - or raise the threshold until the target is met under that dependence.

**S2. The breadth guard counts item ids, and an item id is one exercise in one key and hand. (§20.1) Major (gaming hole).**
- **Code:** `itemIdOf` (src/engine/drills/generate.ts:393) builds the id from family, kind, key, hands and the variant fields.
- So "≥ 3 distinct items + ≥ 2 keys" is met by the single easiest exercise played in 3 keys, or as RH/LH/RL.
- The "or ≥ ½ of the area's items at the tier, whichever is fewer" clause lets a tier with 1–2 exercises promote on one exercise.
- §20.1's guard test ("gaming the easiest single item never promoted") passes trivially for one id. It does not cover the real hole.
- **Fix:** count breadth in distinct exercises (spec template + level/option, with key and hands removed): ≥ 2–3 of them, or all of them if the tier has fewer. Restate the guard as "one exercise, any number of keys".

**S3. Placement can't correct an over-placement. (§20.2, §19.2, §1.9 / SP §2.5) Major (stall).**
- Confirmations exist only in the probe band (0.95–1.0 × target).
- An unpassed item gets a probe-band cold take only once `cleanBpm ≥ 0.95 × target`. Before that, its cold take is at the normal start.
- A learner placed at T5 whose true level is T3 never reaches the band on T5 items. That means:
  - no looks, so placedTier neither confirms nor demotes;
  - the entry rule keeps feeding T5–T6 items indefinitely.
- The reverse failure is only slow: an under-placed learner climbs one tier per ≥ 2 days because of the 6-looks-a-day cap. That is acceptable.
- **Fix:** add an absence-of-evidence rule. If no item at placedTier reaches the band within N practice days (or X takes), or the cold staircase estimates sit below 0.95 × target across ≥ 3 exercises, then placedTier drops one tier. This touches placedTier only, never rank.

**S4. There is no rule for current form to rise again, and entry depends on it. (§1.7, §19.1, §20.2) Major (stall).**
- Entry = max(placedTier, min(high-water, current form)) + 1.
- After a demotion, current form < high-water, so items at high-water + 1 can't enter. The candidate tier gets no looks and promotion stops.
- The spec defines how current form drops, but never how it comes back up. §3's "re-promoting earns nothing" assumes a rule that is never written.
- Current form is also undefined before the first confirmation.
- **Fix:** state that current form re-promotes with the same posterior test at current form + 1, capped at high-water, and pays no XP. Initialise it as high-water, or placedTier while placed.

**S5. Nothing guarantees looks keep arriving at the candidate tier. (§20.1 calendar claim, §4.1, SP §5) Major.**
- Passed cells go to FSRS maintenance with growing intervals.
- Passed anchors' cold takes go above target, and those takes are excluded.
- Promotion needs about 80 looks at p=0.75. "4–6 cells a day at the candidate tier" is assumed, not scheduled.
- In areas with few cells, the supply of looks can dry up before the median is reached:
  - areas without keys: rhythm subdivision cells, voice items, drum rudiments;
  - small fixed-tempo tiers.
- In those areas promotion can stall for months, which contradicts §20.5's "2–3 weeks".
- **Fix:** make need() (§5) give the candidate tier a minimum number of cold confirmation slots a day while the posterior is open. That could be passed cells reviewed in the probe band, outside FSRS. Have the harness report calendar time per area from the real catalogue's cell counts.

**S6. The rules for passed non-anchor items conflict, and the result skews the sample. (§1.9 vs §20.4) Major.**
- §1.9 says the FSRS-due cold take is fixed at 0.95–1.0 × target.
- §20.4 says passed non-anchors can sit below the band after a miss and drop out of confirmations.
- These disagree on which takes a passed cell contributes.
- Under §20.4, cells that miss leave the sample while cells that succeed stay in the band. The window then over-weights strong cells, so tier p is biased upward. This is the same direction as S1 and S2.
- **Fix:** every scheduled confirmation take of a passed cell plays at the probe band, as §1.9 says. The staircase moves only the non-confirmation cold tempo.

## Minor notes

- **Multiple inputs:** rank = the maximum over inputs (§19.6) gives roughly k independent chances at a false promotion. Either set the per-input target to 5 %/k, or pool inputs for promotion.
- **Voice tier:** with the cents band adding 0/+1/+2, item level L at 30 ¢ shares a tier with item level L+2 at 60 ¢. The spec should say which tier a single sung take counts toward, and forbid counting it at several tiers.
- **Reading:** the mapping from the continuous complexity score to a T tier is unspecified.
- **Data model:** a look needs the target at the time of the take, plus src, cell, content tier and day. `ItemState.cold` stores only {at, bpm, clean}, and re-targeting (§15.1) changes band membership after the fact. Store the target or the in-band flag on each cold entry. The area-level look log needs a defined store (derived or persisted).
- **No locks:** say explicitly that the entry rule limits only the rotation and planner, never manual choice.
- **Superseded text still present:** §1.7's sliding LLR, the §1.9 ML fit, §19.1's "≥ 2 days" for promotion, SP §4.1 and SP §15.5. §20.4 flags these for consolidation. Until then, builders must rely on override order.
- **Code status:** the SP step-1 fields (`passedAt`, `cold`, `lastQual`) aren't in the code yet. Neither are `lastSound` (the only `lastSound` is an unrelated field in voiceCheck.ts), `cellPass`, `contentTier` or `placedTier`. `RatingEvent` lacks item, src and cold. All of these are additive and buildable under the fresh-start epoch. `playerTier` (tiers.ts:35) is the warm-best reader to replace, as §19.8 says.

# Round 9: independent pedagogy/content review (HOLISTIC-2 v10 + SP v6)

## (1) Verdict: NOT CLEAN

The content scope is broad and mostly well-founded. The legal rules check out: the 1930/1925 cutoffs, §303(b) improviser handling, the contrafact pairs (including the Scrapple bridge note) and the 1B flags on Handy, Brooks and Porter are all correct. Two step-1 rules are unbuildable or produce permanent wrong ranks, and five more gaps would lead the build or the learner the wrong way.

## (2) Substantive issues

**1. §1.6 reading and transfer "rate rule" lets lucky streaks through, and rank never falls. Blocker.**
"≥ 3 clean in the last 5" is checked over a sliding window, and the spec claims this stops a lucky streak. It does not. I simulated it (2 days are easy to reach):

| True p | Chance of passing a tier within 10 takes | within 20 takes |
|---|---|---|
| 0.3 | 39 % | 68 % |
| 0.4 | 63 % | 89 % |
| 0.5 | 82 % | 98 % |

Each tier pass is one rank exercise, and `rankHW` makes it permanent. So reading rank and the transfer-fed line/harmony ranks inflate for good. This ships in step 1.
*Fix:* use non-overlapping blocks, or a ≥ 4/5 rule, or a Beta lower bound (e.g. P(p ≥ 0.6) ≥ 0.8) over all cold takes at the tier. The §9.1 harness should report the false-pass rate at true p = 0.5.

**2. §1.6 / §1.7: no pass rule for voice and rhythm. Blocker.**
"Each cell has a sticky pass" never says what a pass is. §1.7 counts these passes "using §1.6's per-area pass definitions", but §1.6 only defines reading and transfer. Builders will each invent one.
*Fix:* say it outright. For example, the technique rule with "clean" = within the cents and timing band (or SD band): 3 clean takes on ≥ 2 days, including a later-day cold take (≥ 8 h and a different local day).

**3. §1.3 vs §1.7: the fast over-placement fix can never fire. Major.**
§1.3 drops `placedTier` "on the posterior slump rule at `placedTier`". But §1.7's posterior counts only passed and established cells, and a placed learner by definition has no passes at `placedTier`. Current form is also "initialised as `placedTier`" with no way to measure it. So the only working path is 20 offered days per tier. A self-reported T5 who is really T2 gets planner distance and items aimed at T5–T6 for about 60+ practice days.
*Fix:* add a placement-specific rule that uses unpassed evidence. For example, staircase or threshold estimates below ~0.8 × target on ≥ 3 exercises at `placedTier`, over ≥ 5 offered days, drop it one tier. While placed, current form should come from threshold estimates.

**4. §1.2 / §1.7: voice pitch rank ignores intonation. Major.**
Rank uses the item level, and the cents band is outside exercise identity. So a singer can reach the top pitch rank at ±60 ¢, which is more than half a semitone. In a "pitch" area, precision *is* the content.
*Fix:* set a required cents band per tier for a pass to count toward rank (e.g. T0–2: 60 ¢, T3–4: 45 ¢, T5+: 30 ¢). The sub-band display can stay as it is.

**5. Licks, Encore phrases and repertoire drills vs rank. Major.**
SP §4.2 keeps these families on the old warm pass rule (no cold take). HOLISTIC never maps them to an area or says whether their `passedAt` feeds rank. §1.10 lists new families only. A fixed lick drilled in 12 keys is memorised material, and a warm pass is exactly what H8's cold guard exists to stop. As written, a builder could feed warm lick passes into line-jazz rank.
*Fix:* add them to the §1.10 table as coverage only. If rule-generated licks should count, count only unseen generated licks at sight, under the cold pass rule. Add a guard test.

**6. §8.4 trading 4s and §8.7 responsive comping: no source for the "other player". Major (project rule).**
§13.6 says where the drum soloist comes from: the lick bank, PD lines or a teacher. Trading 4s on keys, guitar, bass and voice, and "comping behind a soloist that answers phrase ends", say nothing. The likely result is an app-improvised soloist, which is the forbidden AI band.
*Fix:* reuse the §13.6 wording (rule-generated licks, PD lines, teacher or human bank). Otherwise trade against drums only, or leave the 4 bars silent.

**7. No repertoire axis at all. Major (pedagogy).**
Heads, tunes, pieces and capstones are all "coverage only", and coverage is just a count. A learner who completes a T5 tune or a T5 PD piece to the cold memory step sees no level for it. Meanwhile rank rewards exercises. The audit's central finding was that transfer to real music is the weakest link, and this repeats it in the reward structure. Excluding memorised material from area rank is right. A separate axis is still missing.
*Fix:* add a "repertoire" axis beside rank (never mixed into it): the hardest difficulty card, and the number of tunes or pieces, completed to the cold memory step and kept up by piece FSRS. This is cheap: §8.2 difficulty cards and §4.3 piece FSRS already exist.

## (3) Minor notes

- §1.1 defines current form as "hardest tier with p ≥ 0.7", but §1.7 caps it at rank and only re-promotes. Align §1.1 with §1.7.
- §8.2 still says STANDARDS_LEGAL §2.1 heads are "public domain worldwide". Reword to US PD + tier. heads.ts `HeadLicence` needs `tier` / `pdFrom`, replacing `pd-worldwide`. Its comment banning I Got Rhythm and Body and Soul is now superseded and should go.
- Hands-free: the by-ear melody self-check (§8.4), the performance self-rate (§12.4) and the rubric self-rating (§12.1) are taps beyond the "one exception" in §7. Send them through the §7 MIDI-key or voice yes/no input.
- SP §15.5 / §17.3 talk of a "band step" (2 tiers), while HOLISTIC §1.3 caps it at +1 tier. State that the rate's entry shift works in tiers, capped at +1.
- Transfer "unseen head": about 25 heads spread across T0–T6 can't reach 5 unseen per tier. Say explicitly that keys and charts fill the pool, and have the harness check that every transfer tier is reachable.
- Unknown region at life+100 serves almost no 1A heads. This is fine, but the region-safe pool must carry those users. State that.
- Drum rudiments with content = nps tier: rank is speed-driven, and breadth comes only from the 3-exercise rule. Consider seeding rudiment family complexity (diddle, flam, drag) into `contentTier`.

Word count ≈ 830.
